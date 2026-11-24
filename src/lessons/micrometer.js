// 必修第三册图 11.3-4、11.3-6。学生在同一把仪器上查零和测电阻丝。
import * as THREE from 'three';
import { paint } from '../live/ink.js';
import { h, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { qaFlow } from './kit/chemlesson.js';
import { lessonBar } from './kit/lessonbar.js';
import { sfx } from './kit/audio.js';
import { woodBlock } from './kit/props.js';
import { turnSpindle, micrometerReading, SCREW_PITCH } from './kit/micrometer.js';
import { micrometerTool, ANVIL_X, AXIS_Y, SCALE_ZERO } from './kit/micrometerTool.js';

const DIAMETER = 0.625;
const WIRE_X = ANVIL_X + DIAMETER / 2000, HOME_Z = -0.032, WIRE_HALF = 0.018;

export default {
  id: 'micrometer',
  fig: '图11.3-4',
  title: '螺旋测微器测电阻丝直径',
  stampText: '测量',
  predict: {
    q: '怎样用螺旋测微器量出电阻丝的直径？如果微分筒边缘露出了一条半毫米线，这半毫米该算在哪里？',
    options: ['计入固定刻度', '只读整毫米', '计入可动刻度'],
    answer: 0,
  },
  conclusion: {
    crops: [
      { page: 68, rect: [216.49, 675.89, 537.5, 761.66] },
      { page: 69, rect: [87.78, 54.73, 345.33, 98.5] },
    ],
    quote: '读数时，先读固定刻度B上的刻度，如图11. 3-5，观察到B 上的半毫米刻度线已露出，故B 上的读数为 6.5 mm ；再读E 上的刻度，考虑到每一格对应0.01 mm，可知E上的读数为……22.5×0.01 mm＝0.225 mm综合B 及E 的读数得到被测长度为6.725 mm。',
    why: '微分筒每一格对应 0.01 mm，可以估读到 0.001 mm。露出的半毫米刻线也要计入。靠近电阻丝时改用微调旋钮，棘轮打滑表示已达到测量压力。',
    src: '课本第 64–65 页 · 第十一章 第3节 实验：导体电阻率的测量',
  },
  create(ctx) {
    const tool = micrometerTool({ textbookScale: true }), group = tool.group;
    const root = new THREE.Group();
    root.add(group);
    const vec = (x, y, z) => new THREE.Vector3(x, y, z);
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(DIAMETER / 2000, DIAMETER / 2000, WIRE_HALF * 2, 24), paint(0xb5623d));
    wire.geometry.rotateX(Math.PI / 2);
    group.add(wire);
    function pick(parent, width, height, depth, x = 0) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), new THREE.MeshBasicMaterial({ visible: false }));
      mesh.position.x = x;
      mesh.userData.pick = true;
      parent.add(mesh);
      return mesh;
    }
    const wirePick = pick(wire, 0.0034, 0.003, WIRE_HALF * 2);
    const finePick = pick(tool.ratchet, 0.008, 0.009, 0.009, 0.004);
    for (const [x, z, w, d, height] of [
      [-0.051, 0.009, 0.005, 0.010, AXIS_Y - 0.0045],
      [-0.012, 0.009, 0.007, 0.010, AXIS_Y - 0.0045],
    ]) {
      const foot = woodBlock(w, height, d);
      foot.position.set(x, height / 2, z);
      group.add(foot);
    }
    // 浅 V 槽支住圆丝，送入和退出时保持同一高度。
    const notch = new THREE.Shape(), valley = AXIS_Y - Math.SQRT2 * DIAMETER / 2000;
    const top = valley + 0.0009;
    for (const [i, [x, y]] of [[-0.0025, 0], [0.0025, 0], [0.0025, top],
      [0.0009, top], [0, valley], [-0.0009, top], [-0.0025, top]].entries()) {
      if (i === 0) notch.moveTo(x, y); else notch.lineTo(x, y);
    }
    const seatGeometry = new THREE.ExtrudeGeometry(notch, { depth: 0.005, bevelEnabled: false });
    for (const z of [-0.044, -0.020, 0.007]) {
      const seat = new THREE.Mesh(seatGeometry, paint(0xbb946b));
      seat.position.set(WIRE_X, 0, z);
      group.add(seat);
    }
    // 不对称的小柄显示锁紧方向，端轮上的一道深纹让棘轮空转也看得见。
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.0012, 0.0018), paint(0x454f50));
    lever.position.set(0.002, 0.002, 0);
    tool.screw.add(lever);
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.00038, 0.00055), paint(0x56554f));
    rib.position.set(0.004, 0.0041, 0);
    tool.ratchet.add(rib);

    let gap, ratchetTurns, inserted, zeroed, slipped, coarseContact, locked, near, returning, ui;
    let savedGap, savedTurns, formula = '';
    const minimum = () => inserted ? DIAMETER : 0;
    const openEnough = () => gap >= DIAMETER + 0.12;
    const checkedZero = '两测面合拢时，确认微分筒左缘正对固定刻度的 0 刻线。';
    const backOff = '大旋钮已把螺杆顶到电阻丝。向下拖大旋钮退开一点，再用微调旋钮轻夹。';
    const openWire = '向下拖大旋钮，张开测面，给电阻丝留出空隙。';
    const feedWire = '测面已张开。沿木座向前拖电阻丝，把它送到两测面之间。';
    const fineTurn = '向上拖最右端的微调旋钮，听到“喀喀”声就停。';
    const approach = '电阻丝已放好。向上拖大旋钮，使螺杆靠近电阻丝，再换微调旋钮。';
    const readScales = '先读微分筒左缘露出的固定刻度，再沿横线估读可动刻度，填入笔记本。';
    // 两条引线的端点分别钉在固定零刻线和微分筒左缘的表面。
    function zeroLabel(text, y, radius) {
      const tag = ctx.tag('').loc(group, SCALE_ZERO, AXIS_Y + y, Math.sqrt(radius * radius - y * y)).show(false);
      const label = h('span', { style: 'display:flex;align-items:center;position:absolute;right:0;transform:translateY(-50%);font-size:15px' },
        h('span', { style: 'padding:4px 7px;background:#fffdf4;color:#263b44;border-radius:3px' }, text),
        h('span', { style: 'width:28px;border-top:2px solid #795735;transform:rotate(-12deg);transform-origin:right center' }));
      tag.el.append(label);
      return tag;
    }
    const zeroLabels = [zeroLabel('固定刻度 B 的 0 刻线', -0.00134, 0.0044), zeroLabel('微分筒 E 的左缘', 0.0026, 0.00455)];
    const bar = lessonBar({ ...ctx, group, back: leave, steps: [
      { id: 'zero', title: '合拢查零', todo: '向上拖微调旋钮，轻合两测面，检查零线是否对齐。', target },
      { id: 'place', title: '放入电阻丝', todo: openWire, target },
      { id: 'measure', title: '轻夹电阻丝', todo: approach, target },
      { id: 'read', title: '读两套刻度', todo: readScales, target },
    ] });
    const mainField = field('固定刻度 B / mm');
    const drumField = field('可动刻度 E / 格');
    function field(label) {
      const input = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': label,
        style: 'box-sizing:border-box;width:100%;margin-top:4px;padding:5px 8px;border:1px solid #8a8270;background:#fffdf6;color:#243743;font:16px/1.3 sans-serif' });
      return { input, el: h('label', { style: 'flex:1;min-width:0;font-size:14px' }, label, input) };
    }
    const form = h('form', { hidden: true, style: 'margin:0 0 14px', onsubmit(e) { e.preventDefault(); submit(); } },
      h('div', { style: 'display:flex;gap:10px;margin:8px 0' }, mainField.el, drumField.el),
      h('button', { class: 'go', type: 'submit' }, '核对读数'));
    const records = table(['固定刻度 / mm', '可动刻度 / 格', '直径 / mm']);
    function target() {
      if (near || returning || bar.finished) return null;
      if (locked && !slipped) return tool.screw;
      if (!zeroed) return tool.ratchet;
      if (!inserted) return openEnough() ? wire : tool.grip;
      if (coarseContact) return tool.grip;
      if (slipped) return tool.scale;
      return gap - DIAMETER > 0.18 ? tool.grip : tool.ratchet;
    }
    function guide() {
      if (near === 'zero') return bar.say(checkedZero);
      if (near === 'read') return bar.say(formula || readScales);
      if (formula) return bar.say(formula);
      if (locked && !slipped) return bar.say('螺杆已锁住。点锁紧柄松开，再转旋钮。');
      if (!zeroed) return bar.say(null);
      if (!inserted) return bar.say(openEnough() ? feedWire : openWire);
      if (coarseContact) return bar.say(backOff);
      if (slipped) return bar.say('棘轮已打滑，测面轻轻夹住了电阻丝。点刻度近看读数。');
      bar.say(gap - DIAMETER > 0.18 ? approach : fineTurn);
    }
    function enter() { if (ui?.step === 0) ui.go(1); }
    function leave() {
      if (near) ctx.back();
      near = null;
      zeroLabels.forEach(label => label.show(false));
      form.hidden = true;
      bar.near(false);
      guide();
    }
    function inspect() {
      enter();
      if (!zeroed || !slipped) return guide();
      near = inserted ? 'read' : 'zero';
      zeroLabels.forEach(label => label.show(near === 'zero'));
      if (ui.el.classList.contains('folded')) ui.fold(false);
      form.hidden = near !== 'read' || !!formula;
      bar.near(true);
      ctx.look([SCALE_ZERO + gap / 1000 + 0.0013, AXIS_Y, 0.0045], [0, 0, 1], 0.032, leave);
      guide();
    }
    function submit() {
      if (form.hidden || near !== 'read' || !slipped) return;
      const parse = input => /^\d+(?:\.\d+)?$|^\.\d+$/.test(input.value.trim()) ? Number(input.value) : NaN;
      const coarse = parse(mainField.input), division = parse(drumField.input);
      const expected = micrometerReading(gap);
      const mainOK = coarse === expected.sleeve;
      const drumOK = Math.abs(division - expected.division) <= 0.101 && Math.abs(division * 10 - Math.round(division * 10)) < 1e-6;
      if (!Number.isFinite(coarse) || !Number.isFinite(division)) return bar.say('两栏都要填数字。固定刻度填毫米数，可动刻度填格数。');
      if (!mainOK || !drumOK) {
        const main = mainOK ? '固定刻度读对了。' : '固定刻度再看一眼：零线旁露出的半毫米线也要算。';
        const drum = drumOK ? '可动刻度读对了。' : '可动刻度再看一眼：横线落在第 12 和第 13 格之间，估读到十分之一格。';
        return bar.say(main + drum);
      }
      const value = coarse + division / 100;
      records.add([coarse.toFixed(1), division.toFixed(1), value.toFixed(3)]);
      formula = '半毫米线已计入。直径 = ' + coarse.toFixed(1) + ' mm + ' + division.toFixed(1) + ' × 0.01 mm = ' + value.toFixed(3) + ' mm。';
      form.hidden = true;
      bar.done('read');
      guide();
    }
    const hint = text => ui?.step === 1 && !near ? text : '';
    function roll(obj, fine, radius) {
      let tooth;
      return { obj, plane: 'xz', offset: AXIS_Y, enabled: () => !near && !returning,
        hint: () => hint(fine ? '上下拖：转微调旋钮' : '上下拖：转大旋钮'),
        onStart() { enter(); savedGap = gap; savedTurns = ratchetTurns; tooth = undefined; },
        onDrag(p, from) {
          if (!from || locked) return;
          const turns = (p.z - from.z) / (2 * Math.PI * radius);
          const next = turnSpindle(savedGap, turns, minimum(), fine);
          if (inserted && next.gap === DIAMETER && !fine && turns < 0) coarseContact = true;
          if (next.gap > DIAMETER) coarseContact = false;
          if (next.gap !== gap || coarseContact) {
            if (slipped) {
              mainField.input.value = drumField.input.value = '';
              if (!bar.finished) bar.undo('measure');
            }
            slipped = false;
            formula = '';
          }
          gap = next.gap;
          ratchetTurns = savedTurns + (fine ? turns : (gap - savedGap) / SCREW_PITCH);
          tool.update(gap, ratchetTurns);
          // 越过棘齿才响，手停下来时微调旋钮也停。
          if (next.slipped && tooth !== Math.floor(ratchetTurns * 8)) {
            tooth = Math.floor(ratchetTurns * 8);
            sfx.clink({ freq: 1750, gain: 0.045 });
          }
          if (next.slipped && !slipped && !coarseContact) {
            slipped = true;
            if (inserted) bar.done('measure');
          }
          guide();
        },
        onEnd() {
          if (slipped && !zeroed) {
            zeroed = true;
            bar.done('zero');
            inspect();
          } else guide();
        },
      };
    }
    const wireDrag = {
      obj: wirePick, anchor: wire, keepOffset: true, plane: 'xz', offset: AXIS_Y,
      enabled: () => !near && !returning, hint: () => hint(inserted ? '向后拖：取回电阻丝' : '向前拖：送入电阻丝'),
      onStart: enter,
      onDrag(p) {
        if (inserted && gap <= DIAMETER) return;
        // 电阻丝沿木座上的同一条轴线送入。测面未张开，丝头会停在螺杆外壁。
        wire.position.z = clamp(p.z, HOME_Z - 0.004, !inserted && !openEnough() ? -WIRE_HALF - 0.0032 : 0.003);
      },
      onEnd(moved) {
        if (!moved) return;
        if (inserted && gap <= DIAMETER) return bar.say('电阻丝还夹在测面之间。先张开测面再取出。');
        let message;
        if (!inserted && !zeroed) message = '测量前先合拢空测面，检查零位。';
        else if (!inserted && !openEnough()) message = '测面挡住了丝头。再张开一点，让电阻丝能通过。';
        else if (Math.abs(wire.position.z) <= 0.004) {
          if (!inserted) {
            inserted = true; slipped = false;
            bar.done('place');
          }
        } else if (Math.abs(wire.position.z - HOME_Z) < 0.004) {
          if (inserted) {
            inserted = false; slipped = false;
            if (!bar.finished) bar.undo('place', 'measure');
          }
        } else message = '电阻丝还没放到位，松手后退回原位。';
        const to = inserted ? 0 : HOME_Z;
        if (wire.position.z !== to) returning = { from: wire.position.z, to, t: 0 };
        if (message) bar.say(message); else guide();
      },
    };
    const tip = ctx.tag('', 'pill').show(false);
    const canvas = document.getElementById('c');
    const hideTip = () => tip.show(false);
    canvas.addEventListener('pointerleave', hideTip);
    const desk = draggable(group, [roll(tool.grip, false, 0.0067), roll(finePick, true, 0.004), wireDrag], {
      tip,
      taps: [
        { obj: tool.screw, hint: () => hint(locked ? '点一下：松开螺杆' : '点一下：锁住螺杆'), onTap() {
          enter(); locked = !locked;
          tool.screw.rotation.y = locked ? 1.25 : 0;
          if (locked && slipped) bar.say('螺杆已锁住，刻度保持在原位。点刻度近看。');
          else if (!locked) bar.say('锁紧柄已松开，旋钮可以转动了。');
          else guide();
        } },
        ...[tool.scale, tool.sleevePick].map(obj => ({ obj, enabled: () => slipped, hint: () => slipped ? hint('点一下：近看刻度') : '', onTap: inspect })),
      ],
    });
    function reset() {
      if (near) leave();
      gap = 0.20;
      ratchetTurns = gap / SCREW_PITCH;
      inserted = zeroed = slipped = coarseContact = locked = false;
      near = returning = null;
      formula = mainField.input.value = drumField.input.value = '';
      form.hidden = true;
      wire.position.set(WIRE_X, AXIS_Y, HOME_Z);
      tool.screw.rotation.y = 0;
      tool.update(gap, ratchetTurns);
      records.clear();
      bar.undo('zero', 'place', 'measure', 'read');
      ui?.relock();
      guide();
    }
    reset();
    const center = obj => group.worldToLocal(obj.getWorldPosition(new THREE.Vector3()));
    function rollStep(name, obj, distance) {
      const to = () => center(obj).add(vec(0, 0, distance));
      const step = qaFlow(desk, [{ name, drag: obj, to }])[0];
      step.run = () => {
        const d = desk.items().find(item => item.obj === obj);
        d.onStart(); d.onDrag(to(), center(obj)); d.onEnd();
      };
      return step;
    }
    function entry(name, fixed, dial, check) {
      return { name, run() {
        mainField.input.value = fixed; drumField.input.value = dial;
        form.querySelector('button').click();
        if (!check()) throw Error(name);
      } };
    }
    const qa = [
      rollStep('合拢查零', finePick, -0.025),
      { name: '检查零位后回到全景', run() { if (near !== 'zero') throw Error('未显示零位'); leave(); } },
      { name: '测面闭合时送丝', drag: wirePick, to: vec(WIRE_X, AXIS_Y, 0) },
      rollStep('张开测面', tool.grip, 0.046),
      rollStep('继续张开', tool.grip, 0.044),
      { name: '放入电阻丝', drag: wirePick, to: vec(WIRE_X, AXIS_Y, 0) },
      rollStep('大旋钮靠近', tool.grip, -0.032),
      rollStep('大旋钮顶到电阻丝', tool.grip, -0.025),
      rollStep('原位补转微调', finePick, -0.012),
      { name: '粗调顶住后仍须退开', run() {
        inspect();
        if (gap !== DIAMETER || near || bar.current !== 'measure' || document.querySelector('.lb-txt').textContent !== backOff)
          throw Error('粗调接触后补转微调应留在轻夹步骤，并提示退开');
      } },
      rollStep('大旋钮退开一点', tool.grip, 0.012),
      rollStep('微调至棘轮打滑', finePick, -0.025),
      { name: '点刻度读数', tap: tool.scale },
      entry('漏读半毫米', '0', '12.5', () => !bar.finished && document.querySelector('.lb-txt').textContent.includes('可动刻度读对了')),
      entry('误读可动刻度', '0.5', '13', () => !bar.finished && document.querySelector('.lb-txt').textContent.includes('固定刻度读对了')),
      entry('记录电阻丝直径', '0.5', '12.5', () => records.rows.length === 1 && records.rows[0][2] === '0.625'),
      { name: '掀开课本原文', run() {
        if (!bar.finished) throw Error('测量未完成');
        leave(); ui.go(2); ui.el.querySelector('.flap-front').click();
      } },
    ].map(step => step.mouse ? step : qaFlow(desk, [step])[0]);
    return {
      group: root, size: { w: 0.115, d: 0.095, h: 0.021 },
      view: { azim: -5, elev: 48, frameMargin: 0.94 }, toggles: ['steps'], reset, debug: { bar, qa },
      pointer: {
        items: () => near ? [] : desk.items(),
        down(ray, e) { return near ? true : desk.down(ray, e); },
        move(ray, e) {
          tip.show(ui?.step === 1 && !near);
          return near || desk.move(ray, e);
        },
        up: desk.up,
      },
      mount(panel) {
        ui = panel;
        bar.attach({ need: () => ui.need(''), unlock() { ui.unlock(); ui.need(''); } });
        ui.status('左边是固定刻度 B。右边的可动刻度 E 一周有 50 格，螺杆每圈移动 0.5 mm，每格对应 0.01 mm。');
        ui.controls.append(form);
        ui.data.append(records.el, h('button', { class: 'go ghost', onclick: reset }, '全部重来'));
        ui.el.querySelector('.answer').style.paddingBottom = '76px';
        ui.el.querySelector('.flap-front').addEventListener('click', () => {
          if (!records.rows.length) return;
          const verdict = ui.el.querySelector('.verdict'), guess = ui.prediction();
          const prefix = guess === null ? '' : '你的预测：“' + panel.el.querySelectorAll('.opt')[guess].textContent + '”。';
          verdict.textContent = prefix + '这根电阻丝的实读直径为 ' + records.rows[records.rows.length - 1][2] + ' mm。下方是课本图 11.3-5 的读数示例。';
        });
        guide();
      },
      update(dt) {
        bar.update(dt);
        if (!returning) return;
        returning.t = Math.min(1, returning.t + dt / 0.38);
        wire.position.z = returning.to + (returning.from - returning.to) * (1 - returning.t) ** 2;
        if (returning.t === 1) returning = null;
      },
      dispose() { canvas.removeEventListener('pointerleave', hideTip); desk.dispose(); bar.dispose(); tool.dispose(); },
    };
  },
};
