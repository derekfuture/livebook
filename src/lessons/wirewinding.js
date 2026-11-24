import * as THREE from 'three';
import { windingRig, CLIP, AXIS, START, SPAN, RULE_W, RADIUS, GRIP_R } from './kit/windingRig.js';
import { advanceWinding, windingEdges, WIRE_MM, woundTurns, MAX_TURNS } from './kit/wireWinding.js';
import { draggable, clamp } from './kit/interact.js';
import { inviteRing } from './kit/invite.js';
import { show } from '../ui/prefs.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow } from './kit/chemlesson.js';
import { h, table, buttons } from './kit/ui.js';

const alignZ = RADIUS + WIRE_MM / 1000 + RULE_W / 2;
const clip = new THREE.Vector3(...CLIP);
const free = new THREE.Vector3(0.001, clip.y, -0.026);
const rulerHome = new THREE.Vector3(-0.002, AXIS - 0.0009, 0.041);
const circumference = 2 * Math.PI * GRIP_R;
const mm = (v) => v.toFixed(1);
const loose = (edges) => edges.widestGap > 0.001;

export default {
  id: 'wirewinding',
  fig: '图11.3-8',
  title: '用刻度尺测量细丝直径',
  stampText: '估测',
  predict: {
    q: '一根丝比毫米尺的一小格还细。怎样用同一把尺估测丝径？',
    options: ['紧密绕多圈，量总宽再除以圈数', '只读单根丝占几格', '把线圈拉松，增大总宽'],
    answer: 0,
    hint: '想想总宽度里包含哪些长度。',
  },
  conclusion: {
    page: 70, rect: [210.51, 227.87, 525.75, 334.2],
    quote: '用分度值为1 mm的刻度尺直接测量电阻丝的直径d，产生的误差太大。为了解决这个问题，我们可以采用累积的方法，即取一段新的电阻丝，在圆柱形物体上紧密缠绕（图11.3-8），用分度值为1 mm的刻度尺测出总宽度，再除以圈数，这样便可以提高电阻丝直径的测量精度了。',
    why: '把一根直径累积成多圈的总宽度，尺上同样大小的读数误差分摊到每圈。若圈间留缝，总宽还包含这些缝隙，所得直径偏大。',
    src: '课本第 66 页 · 第十一章 第3节 实验：导体电阻率的测量',
  },
  create(ctx) {
    const rig = windingRig();
    const { group, end, knob, guide, scale } = rig;
    const parts = [], readings = [];
    const tip = free.clone(), rulerStart = rulerHome.clone();
    let attached = false, docked = false, near = false, gap = 0, returning = null;
    let needsRewind = false;
    let startGap, startTurns, ui, form, field, label, records, working, submitButton;
    const edges = () => windingEdges(parts);
    const ready = () => (edges()?.count || 0) >= 2;
    const render = () => rig.render(parts, attached, gap, tip);
    const rewindText = '圈间有缝，总宽把空隙也算进去了，算出的丝径偏大。向后滚木柄退丝，向左推紧导丝环再绕。';
    const windText = '向前滚右端木柄，让几圈丝紧贴成一层，把一个丝径累积成能读的总宽。';
    const dockText = '把尺的刻度边拖到线圈前沿，贴近后从正上方读两端。';
    const countText = '沿紧贴尺边的那一排从左数到右，每根丝只数一次。';
    const target = () => {
      if (returning || near || ui?.step !== 1 || bar.finished) return null;
      if (!attached) return end;
      return ready() && !needsRewind ? rig.rulerGrip : knob;
    };
    const ring = inviteRing(group, { ground: 0.001 });
    const bar = lessonBar({
      ...ctx, back: leave,
      steps: [
        { id: 'clip', title: '固定丝头', todo: '把散开的丝头拖到圆柱左侧夹口，夹牢后才能绕线。', target },
        { id: 'wind', title: '绕成单层', todo: windText, target },
        { id: 'read', title: '量总宽', todo: dockText, target },
        { id: 'count', title: '数圈求直径', todo: countText, target },
      ],
    });
    function reset() {
      if (near) leave();
      attached = docked = near = needsRewind = false;
      gap = 0;
      returning = null;
      parts.length = readings.length = 0;
      tip.copy(free);
      scale.position.copy(rulerHome);
      records?.clear();
      if (form) {
        form.hidden = true;
        field.value = '';
        working.textContent = '';
      }
      bar.undo('clip', 'wind', 'read', 'count');
      bar.say(null);
      ui?.relock();
      render();
    }
    function leave() {
      ctx.back();
      near = false;
      bar.near(false);
      form.hidden = true;
      if (docked && !bar.finished) bar.say('点尺面凑近，继续这次测量。');
    }
    function updateForm() {
      const side = ['左端', '右端', '完整圈数'][readings.length];
      label.textContent = readings.length === 2 ? side : side + '读数 / mm';
      submitButton.textContent = readings.length === 2 ? '记下圈数' : '记下读数';
      field.step = readings.length === 2 ? '1' : '0.1';
      field.value = '';
      form.hidden = false;
    }
    function inspect() {
      if (!docked || !ready() || bar.finished) return;
      const e = edges();
      near = true;
      bar.near(true);
      ui.fold(false);
      const width = (e.right - e.left) / 1000;
      ctx.look([START + (e.left + e.right) / 2000, AXIS, alignZ - 0.006],
        [0, 1, 0.005], Math.max(0.056, (width + 0.018) * 1.55), leave);
      bar.say(readings.length === 2 ? countText : '读' + (readings.length ? '右' : '左') + '侧最外缘所对的刻度，每小格 1 mm，再估读一位。');
      updateForm();
    }
    function edgeReading(side) {
      return (START - scale.position.x + SPAN / 2) * 1000 + edges()[side];
    }
    function submit() {
      if (!near || !docked || !ready() || bar.finished) return;
      const value = field.valueAsNumber;
      if (readings.length < 2) {
        const right = readings.length === 1;
        const diff = value - edgeReading(right ? 'right' : 'left');
        if (!Number.isFinite(value) || Math.abs(value * 10 - Math.round(value * 10)) > 1e-6)
          return bar.say('用毫米记数，估读到 0.1 mm。');
        if (Math.abs(diff) > 0.15) return bar.say((right ? '右' : '左') + '端读数偏' + (diff > 0 ? '大' : '小') + '。沿尺边找最外缘，先数整格，再估不足一格的部分。');
        readings.push(value);
        if (right) {
          bar.done('read');
          working.textContent = widthFormula();
          bar.say('两端都读好了。' + countText);
        } else {
          working.textContent = '左端 ' + mm(value) + ' mm';
          bar.say('左端记好了。用同一把尺读右侧最外缘。');
        }
        updateForm();
        return;
      }
      const e = edges();
      if (!Number.isInteger(value) || value < 1) return bar.say('完整圈数要填正整数。');
      if (value !== e.count) return bar.say((value > e.count ? '多数了。' : '少数了。') + '只数尺边这一排的丝，别数空隙或伸出的丝头。');
      const width = readings[1] - readings[0];
      const isLoose = loose(e), diameter = (width / value).toFixed(2);
      records.add([readings.map(mm).join(' → '), String(value), diameter, isLoose ? '有缝' : '紧绕']);
      working.textContent = widthFormula() + '\n' + (isLoose ? '含空隙的商' : '丝径') + ' = ' + mm(width) + ' mm ÷ ' + value + ' ≈ ' + diameter + ' mm';
      leave();
      if (isLoose) {
        readings.length = 0;
        needsRewind = true;
        bar.undo('wind', 'read');
        bar.say(rewindText);
      } else {
        bar.done('count');
        bar.say('每圈紧挨着下一圈，总宽除以圈数就是一根丝的直径。可以掀开课本原文了。');
      }
    }
    function widthFormula() {
      return '总宽 = ' + mm(readings[1]) + ' − ' + mm(readings[0]) + ' = ' + mm(readings[1] - readings[0]) + ' mm';
    }
    function invalidate() {
      if (readings.length || needsRewind) {
        readings.length = 0;
        working.textContent = '';
        bar.undo('read');
      }
    }
    function begin() { if (ui.step !== 1) ui.go(1); }
    const canWind = () => attached && !near && !returning && !bar.finished;
    const canMoveRuler = () => !near && !returning && ready() && !needsRewind && !bar.finished;
    const hint = (enabled, text) => () => ui?.step === 1 && enabled() ? text : '';
    const canClip = () => !attached && !returning;
    function springBack(obj, home) {
      returning = { obj, from: obj.position.clone(), home: home.clone(), time: 0 };
    }
    const hover = ctx.tag('', 'pill').loc(group, 0, -9, 0);
    const hideHint = () => hover.loc(group, 0, -9, 0);
    const canvas = document.getElementById('c');
    canvas.addEventListener('pointerleave', hideHint);
    const pointer = draggable(group, [
      {
        obj: end, plane: 'xz', offset: clip.y, keepOffset: true, enabled: canClip,
        hint: hint(canClip, '拖丝头：夹进夹口'), onStart: begin,
        onDrag(p) { tip.copy(p); render(); },
        onEnd(moved) {
          if (!moved) return;
          if (tip.distanceTo(clip) > 0.0045) {
            springBack(end, free);
            bar.say('丝头没夹住。对准圆柱上的深色夹口再松手。');
          } else {
            attached = true;
            render();
            bar.done('clip');
            bar.say('丝头夹牢了。' + windText);
          }
        },
      },
      {
        obj: knob, plane: 'xz', offset: AXIS, enabled: canWind,
        hint: hint(canWind, '滚木柄：绕丝或退丝'),
        onStart() { begin(); startTurns = woundTurns(parts); },
        onDrag(p, start) {
          if (!start) return;
          const to = clamp(startTurns + (p.z - start.z) / circumference, 0, MAX_TURNS);
          if (Math.abs(to - woundTurns(parts)) < 1e-6) return;
          invalidate();
          advanceWinding(parts, to - woundTurns(parts), WIRE_MM + gap);
          render();
        },
        onEnd(moved) {
          if (!moved) return;
          const turns = woundTurns(parts), rest = Math.round(turns) - turns;
          if (Math.abs(rest) < 0.20) advanceWinding(parts, rest, WIRE_MM + gap);
          render();
          if (needsRewind && (!woundTurns(parts) || (edges() && !loose(edges())))) needsRewind = false;
          if (needsRewind) {
            bar.say(rewindText);
          } else if (!ready()) {
            bar.undo('wind');
            bar.say(turns < 1.8 ? windText : '末圈还差一段。慢慢滚木柄，让浅色线回到朝上的位置。');
          } else {
            bar.done('wind');
            bar.say(docked ? '尺已贴近线圈，点尺面读数。' : (loose(edges()) ? '圈间能看见空隙。' : '线圈已排成紧密的一层。') + dockText);
          }
        },
      },
      {
        obj: guide, plane: 'xz', offset: clip.y, enabled: canWind,
        hint: hint(canWind, '横拖导丝环：调圈距'),
        onStart() { begin(); startGap = gap; },
        onDrag(p, start) {
          if (!start) return;
          const spacing = clamp(startGap + (p.x - start.x) / 0.006, 0, 1.2);
          gap = spacing < 0.04 ? 0 : spacing;
          render();
        },
        onEnd(moved) {
          if (moved) bar.say(gap ? '导丝环向右移了，再绕时圈间会留下空隙。' : '导丝环已靠紧，再绕的圈会彼此相贴。');
        },
      },
      {
        obj: scale, plane: 'xz', offset: rulerHome.y, keepOffset: true, enabled: canMoveRuler,
        hint: () => ui?.step === 1 && canMoveRuler() ? (docked ? '点尺面：凑近读数' : '拖刻度尺：贴近线圈') : '',
        onStart() { begin(); rulerStart.copy(scale.position); },
        onDrag(p) {
          scale.position.set(clamp(p.x, -0.005, 0.005), rulerHome.y, clamp(p.z, alignZ, 0.055));
        },
        onEnd(moved) {
          if (!moved) return;
          if (scale.position.z > alignZ + 0.0015) {
            springBack(scale, rulerStart);
            bar.say('尺边离线圈还有距离，贴到线圈前沿再松手。');
          } else {
            if (!docked || Math.abs(scale.position.x - rulerStart.x) > 0.00001) invalidate();
            docked = true;
            scale.position.z = alignZ;
            inspect();
          }
        },
        onTap: inspect,
      },
    ], { tip: hover });

    reset();
    return {
      group: new THREE.Group().add(group), pointer, reset, toggles: ['steps'],
      size: { w: 0.15, h: 0.05, d: 0.12 },
      view: { azim: 0, elev: 48, lookY: 0.32, frameMargin: 1.1 },
      mount(panel) {
        ui = panel;
        bar.attach({ ...ui, need: () => {} });
        ui.el.querySelector('.answer').style.paddingBottom = '85px';
        ui.el.querySelector('.progress-need').hidden = true;
        ui.status('测量工具：分度值为 1 mm 的刻度尺。');
        label = h('span');
        field = h('input', { type: 'number', inputmode: 'decimal', min: '0', step: '0.1',
          style: 'width:6em;font:inherit;color:inherit;padding:4px 6px' });
        submitButton = h('button', { type: 'submit', class: 'go', style: 'margin-top:6px' });
        form = h('form', { hidden: true, style: 'margin-bottom:12px', novalidate: true, onsubmit(event) { event.preventDefault(); submit(); } },
          h('label', { style: 'display:flex;align-items:center;gap:10px' }, label, field), submitButton);
        ui.controls.append(form);
        working = h('p', { class: 'status', style: 'white-space:pre-line', 'aria-live': 'polite' });
        records = table(['两端读数 / mm', '圈数', '总宽÷圈数 / mm', '绕法']);
        ui.data.append(records.el, working);
        ui.data.after(buttons([{ text: '全部重来', ghost: true, onClick: reset }]).el);
      },
      update(dt) {
        bar.update(dt);
        ring.update(show.steps ? target() : null, dt);
        if (ui?.step !== 1) hideHint();
        if (!returning) return;
        const r = returning;
        const t = Math.min(1, (r.time += dt) / 0.4);
        r.obj.position.lerpVectors(r.from, r.home, t * (2 - t));
        if (t === 1) r.obj.position.copy(r.home);
        if (r.obj === end) { tip.copy(end.position); render(); }
        if (t === 1) returning = null;
      },
      debug: { bar, qa: makeFlow() },
      dispose() { canvas.removeEventListener('pointerleave', hideHint); ring.dispose(); rig.dispose(); pointer.dispose(); bar.dispose(); },
    };

    function makeFlow() {
      function check(ok, error) { if (!ok) throw new Error(error); }
      const drag = (name, obj, to) => qaFlow(pointer, [{ name, drag: obj, to }])[0];
      const rollEnd = new THREE.Vector3(0.056, AXIS, circumference * 1.5);
      function roll() {
        const q = drag('滚动木柄', knob, rollEnd);
        q.run = () => {
          const d = pointer.items().find((item) => item.obj === knob);
          d.onStart(); d.onDrag(rollEnd, rollEnd.clone().setZ(0)); d.onEnd(true);
        };
        return q;
      }
      function enter(name, get, verify) {
        return { name, run() {
          check(near && !form.hidden, '读数区没有打开');
          field.value = String(get());
          submitButton.click();
          check(verify(), name + '的反馈或记录有误');
        } };
      }
      return [
        drag('夹偏', end, free.clone().setX(0.015)),
        { name: '检查丝头归位', run() { check(!attached && tip.equals(free), '丝头没有归位'); } },
        drag('夹住丝头', end, clip),
        ...Array.from({ length: 4 }, roll),
        { name: '核对整圈', run() { check(ready() && bar.has('wind'), '密绕没有完成'); } },
        drag('尺未贴紧', scale, rulerHome.clone().setZ(0.028)),
        drag('贴尺正视', scale, rulerHome.clone().setZ(alignZ)),
        enter('左端读大', () => 80, () => !readings.length),
        enter('记录左端', () => mm(edgeReading('left')), () => readings.length === 1),
        enter('右端读小', () => 4, () => readings.length === 1),
        enter('记录右端', () => mm(edgeReading('right')), () => bar.has('read')),
        enter('漏数一圈', () => edges().count - 1, () => !bar.finished && !records.rows.length),
        enter('数圈求直径', () => edges().count, () => bar.finished && records.rows.length === 1 && working.textContent.includes('丝径')),
        { name: '掀开课本原文', run() { ui.go(2); ui.el.querySelector('.flap-front').click(); check(ui.el.querySelector('.flap.open'), '结论未解锁'); } },
      ];
    }
  },
};
