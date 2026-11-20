import * as THREE from 'three';
import { actionReactionRig, REST, PER_N, MAX, AXIS_Z, RING_Y, COLORS } from './kit/actionReactionRig.js';
import { forcePlot } from './kit/actionReactionPlot.js';
import { labBase } from '../live/ink.js';
import { draggable, clamp } from './kit/interact.js';
import { qaFlow } from './kit/chemlesson.js';
import { buttons, h, table } from './kit/ui.js';

const names = ['B', 'A'];
const homeX = (i) => i ? REST : -REST;
const rounded = (v) => (Math.round(v * 5) / 5).toFixed(1);
const goal = '比较两个挂钩在同一时刻受到的拉力。';
const tryIt = '拖提环快拉、慢拉或松手。两表回零后，可把固定销拖到另一端。';
const pulled = '两表的示数一直相等。A 拉 B 向右，B 拉 A 向左。';
const locked = '刚才拔销时两表还在受力，固定销留在原处。回零后可以换端。';

export default {
  id: 'actionreaction',
  fig: '图3.3-3',
  title: '作用力与反作用力',
  stampText: '实验',
  predict: {
    q: '大人跟小孩掰手腕，很容易就把小孩的手压在桌面上。那么，他们施加给对方的力，大小相等吗？',
    options: ['大人施加的力更大', '两个力一样大', '小孩施加的力更大'],
    answer: 1,
  },
  conclusion: {
    page: 73, rect: [63.78, 384.77, 378.81, 448.2],
    quote: '牛顿经过研究指出： 两个物体之间的作用力和反作用力总是大小相等， 方向相反， 作用在同一条直线上。这就是牛顿第三定律 （Newton’s third law）。',
    why: '掰手腕时，大人和小孩施加给对方的力也一样大。一个力作用在小孩的手上，另一个力作用在大人的手上。',
    src: '课本第 69 页 · 第三章 第3节 牛顿第三定律',
  },
  create(ctx) {
    const plot = forcePlot(), rig = actionReactionRig(plot.texture);
    const root = new THREE.Group();
    const board = labBase(1.166, 0.504, 0.008);
    root.add(rig.group, board);
    const handles = names.map((_, i) => ({ x: homeX(i), z: AXIS_Z }));
    const readings = rig.meters.map((m, i) => {
      const card = ctx.tag('', 'pill sticky');
      card.el.style.cssText = 'font:600 clamp(13px,1.3vw,21px)/1.2 Arial,sans-serif;color:' + COLORS[i] +
        ';background:#fffcf3;padding:4px 9px;border-radius:5px;border:1px solid currentColor;white-space:nowrap;font-variant-numeric:tabular-nums;pointer-events:none';
      return card.loc(m.body, 0.123, 0.010, i ? -0.076 : 0.076);
    });
    const narrow = matchMedia('(max-width: 760px)');
    const chart = plot.texture.canvas;
    chart.style.cssText = 'width:100%;height:auto;display:block;margin:6px 0;border:1px solid #9aa79a';
    chart.setAttribute('aria-label', '拉力随时间的变化');
    function layout() {
      rig.monitor.visible = !narrow.matches;
      board.scale.z = narrow.matches ? 0.52 : 1;
      board.position.z = narrow.matches ? AXIS_Z : 0;
      chart.style.display = narrow.matches ? 'block' : 'none';
      plot.setCompact(narrow.matches);
    }
    layout();
    narrow.addListener(layout);
    const rows = table(['轮次', '固定端', 'A / N', 'B / N']);
    let fixed = 0, state, panel, feedback, held = false, peak = 0;
    let unloading = null, pinHeld = false, returnPin = null;
    const pinHome = () => new THREE.Vector3(homeX(fixed), 0.026, AXIS_Z);
    const say = (s) => { feedback.textContent = s; };
    const enter = () => { if (panel.step !== 1) panel.go(1); };
    function draw() {
      state = rig.draw(handles, fixed);
      readings[0].text('B　' + rounded(state.force) + ' N');
      readings[1].text('A　' + rounded(state.force) + ' N');
    }
    function moveFree(x) {
      const i = 1 - fixed, sign = i ? 1 : -1;
      handles[i].x = sign * (REST + clamp(sign * x - REST, 0, MAX * 2 * PER_N));
      draw();
      plot.sample(performance.now(), state);
    }
    const pulls = rig.meters.map((m, i) => ({
      obj: m.pick, plane: 'xz', offset: RING_Y, keepOffset: true, anchor: m.body,
      enabled: () => i !== fixed && !pinHeld && !returnPin,
      hint: () => i !== fixed && panel?.step === 1 ? '拖提环：向外拉' : '',
      onStart() {
        enter();
        held = true; unloading = null; peak = state.force;
        plot.sample(performance.now(), state);
      },
      onDrag(p) {
        if (!held) return;
        moveFree(p.x);
        if (state.force > peak) peak = state.force;
        if (state.force >= 0.1 && feedback.textContent !== pulled) say(pulled);
      },
      onEnd() {
        if (!held) return;
        held = false;
        if (peak >= 0.1) {
          rows.add([String(rows.rows.length + 1), names[fixed], rounded(peak), rounded(peak)]);
          if (rows.rows.length === 1) { panel.unlock(); panel.need(''); }
          say('这次两表最大示数都是 ' + rounded(peak) + ' N，两个挂钩受力方向相反。');
        }
        if (state.force > 1e-8)
          unloading = { x: handles[i].x, time: performance.now() };
      },
    }));
    const pinDrag = {
      obj: rig.pinPick, anchor: rig.pin, plane: 'xz', offset: 0.026, keepOffset: true,
      hint: () => panel?.step === 1 ? '拖固定销：换一端' : '',
      enabled: () => !returnPin,
      onStart() {
        enter();
        pinHeld = !held && !unloading && state.force < 1e-8;
        if (!pinHeld) say(locked);
      },
      onDrag(p) {
        if (pinHeld) {
          rig.pin.position.set(clamp(p.x, -0.57, 0.57), 0.026, clamp(p.z, -0.20, 0.19));
          rig.hand.visible = false;
          rig.pinShaft.position.y = 0.040;
        }
      },
      onEnd(moved) {
        if (!pinHeld) return;
        pinHeld = false;
        const p = rig.pin.position;
        const socket = handles.findIndex((h) => Math.hypot(p.x - h.x, p.z - h.z) < 0.048);
        if (moved && socket >= 0) {
          fixed = socket; draw();
          say(names[fixed] + ' 已固定，现在可以拉 ' + names[1 - fixed] + '。');
        } else if (moved) say('固定销没对准提环，回到了原来的销孔。');
        if (moved) returnPin = { from: p.clone(), to: pinHome(), time: performance.now() };
      },
    };
    const pointer = draggable(rig.group, [...pulls, pinDrag], { tip: ctx.tag('', 'pill') });
    function reset() {
      fixed = 0; held = pinHeld = false; peak = 0; unloading = returnPin = null;
      handles.forEach((p, i) => { p.x = homeX(i); });
      rig.pin.position.copy(pinHome()); rig.pinShaft.position.y = 0; rig.hand.visible = true; draw();
      rows.clear(); plot.reset(); say(''); panel.relock();
    }
    draw();
    rig.pin.position.copy(pinHome());
    const target = (i, f = 0) => new THREE.Vector3(homeX(i) + (i ? 1 : -1) * f * 2 * PER_N, RING_Y, AXIS_Z);
    const check = (condition, message) => { if (!condition) throw new Error(message); };
    return {
      group: root, card: false, pointer, reset, toggles: [],
      size: { w: 1.10, d: 0.45, h: 0.28 },
      view: { elev: 45, azim: -3, frameMargin: 1.01 },
      mount(ui) {
        panel = ui;
        ui.status(goal);
        feedback = h('p', { class: 'status', 'aria-live': 'polite' });
        ui.controls.append(h('div', {}, h('p', { class: 'note' }, tryIt), chart, feedback));
        ui.data.append(h('p', { class: 'note' }, '每次拉动的最大示数（约）'), rows.el,
          buttons([{ text: '全部重做', ghost: true, onClick: reset }]).el);
      },
      update() {
        const now = performance.now();
        if (unloading) {
          const u = Math.min(1, (now - unloading.time) / 450), home = homeX(1 - fixed);
          moveFree(home + (unloading.x - home) * (1 - u) * (1 - u));
          if (u === 1) unloading = null;
        } else if (held) plot.sample(now, state);
        if (returnPin) {
          const u = Math.min(1, (now - returnPin.time) / 350);
          const slide = Math.min(1, u / 0.7);
          rig.pin.position.lerpVectors(returnPin.from, returnPin.to, slide * slide * (3 - 2 * slide));
          rig.pinShaft.position.y = 0.040 * Math.min(1, (1 - u) / 0.3);
          if (u === 1) { returnPin = null; rig.hand.visible = true; }
        }
        plot.draw();
      },
      dispose() { narrow.removeListener(layout); pointer.dispose(); rig.dispose(); plot.texture.dispose(); },
      debug: {
        get state() { return { fixed, force: state.force, peak, samples: plot.samples, rows: rows.rows }; },
        qa: qaFlow(pointer, [
          { name: '固定 B 拉 A', drag: pulls[1].obj, to: target(1, 2), wait: 0.6 },
          { name: '加大拉力', drag: pulls[1].obj, to: target(1, 4), wait: 0.6 },
          { name: '核对两组记录与卸载', run() {
            check(rows.rows.length === 2 && state.force < 1e-8, '未记录或未卸载');
            for (let k = 0; k < 2; k++) {
              const row = rows.rows[k];
              check(row[2] === row[3] && Math.abs(+row[2] - 2 * (k + 1)) <= 0.2, '双表示数有误');
            }
            check(plot.samples.some(s => s.b > 3.7) && plot.samples.every(s => s.a === -s.b), '曲线缺失或不对称');
          } },
          { name: '受力时尝试拔销', run() {
            pulls[1].onStart(); pulls[1].onDrag(target(1, 2)); pulls[1].onEnd();
            pinDrag.onStart(); pinDrag.onDrag(target(1)); pinDrag.onEnd(true);
            check(fixed === 0 && feedback.textContent === locked && !pinHeld, '带载换端');
          }, wait: 0.6 },
          { name: '把固定销拖到两环之间', drag: rig.pinPick, to: new THREE.Vector3(0, 0.026, 0.16), wait: 0.5 },
          { name: '核对固定销归位', run() { check(fixed === 0 && rig.pin.position.distanceTo(pinHome()) < 0.001, '固定销没有归位'); } },
          { name: '换到 A 端固定', drag: rig.pinPick, to: target(1), wait: 0.5 },
          { name: '固定 A 拉 B', drag: pulls[0].obj, to: target(0, 3), wait: 0.6 },
          { name: '核对换端后受力', run() {
            const row = rows.rows[rows.rows.length - 1];
            check(fixed === 1 && row[1] === 'A' && row[2] === row[3] && Math.abs(+row[2] - 3) <= 0.2, '换端后读数不符');
            check(plot.samples.some(s => s.b > 2.7) && plot.samples.every(s => s.a === -s.b), '换端后方向有误');
          } },
        ]),
      },
    };
  },
};
