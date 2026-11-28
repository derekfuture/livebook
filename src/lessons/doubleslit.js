import * as THREE from 'three';
import { doubleSlitRig, drawAlignment, AXIS, DOUBLE_X, SINGLE_X, FILTER_X, SCREEN_X } from './kit/doubleSlitRig.js';
import { SLIT_SEPARATIONS, FILTER_WAVELENGTH, measuredWavelength, stripeIntensity } from './kit/doubleSlit.js';
import { clamp, draggable } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow } from './kit/chemlesson.js';
import { h, table } from './kit/ui.js';

const length = SCREEN_X - DOUBLE_X;
const stations = [SINGLE_X, DOUBLE_X, DOUBLE_X, FILTER_X, FILTER_X];
const labels = ['单缝片', '0.36 mm 双缝片', '0.18 mm 双缝片', '红滤光片', '蓝滤光片'];
const trials = [[1, 4], [1, 3], [2, 3]];
const point = (x, y, z) => new THREE.Vector3(x, y, z);

export default {
  id: 'doubleslit', fig: '图4.4-1', title: '用双缝干涉测量光的波长', stampText: '测量',
  predict: {
    q: '怎样用双缝干涉测出光的波长？保持屏距和双缝间距不变，把蓝光换成红光，亮纹间距会怎样？',
    options: ['间距变大', '间距变小', '间距相同'], answer: 0,
  },
  conclusion: {
    page: 105, rect: [64.27, 637.19, 379.6, 698.35],
    quote: '本实验需要测量的物理量是双缝到屏的距离 l 和相邻两条亮条纹间的距离 ∆x（双缝间的距离 d 已知）。',
    src: '课本第 101 页 · 第四章 第4节 实验：用双缝干涉测量光的波长',
  },
  create(ctx) {
    const rig = doubleSlitRig();
    const { group, lamp, housing, power, ruler, scope, screw, cards, homes } = rig;
    const root = new THREE.Group();
    root.add(group);
    const picks = cards.map(card => card.children.find(child => child.userData.pick));
    const installed = new Set(), returns = new Map();
    let ui, lit, aligned, view, trial, mm, marks, ends, order, target, ray, offset, startMM, startYaw, startHeight, lampDrag, showSeats;
    const steps = [['axis', '调光源'], ['cards', '装缝片和滤光片'], ['length', '测屏距'], ['spacing', '测亮纹间距'], ['compare', '换片比较']];
    const bar = lessonBar({ ...ctx, group, back: leave, steps: steps.map(([id, title]) => ({ id, title, todo: title, target: () => target })) });
    const rows = table(['光', 'd / mm', 'Δx / mm', 'λ / nm']);
    const field = h('input', { type: 'number', step: 'any', inputmode: 'decimal', required: true, style: 'width:6em;margin:0 .4em' });
    const caption = h('span'), submit = h('button', { type: 'submit', class: 'go', style: 'width:auto;margin:0' }, '记下');
    const form = h('form', { onsubmit: event => { event.preventDefault(); read(); } }, h('label', {}, caption, field), submit);
    const work = h('div', { style: 'color:#453f37;font-size:14px;line-height:1.55;font-variant-numeric:tabular-nums' });
    const preview = h('canvas', { width: 300, height: 112, style: 'width:min(100%,300px);height:auto' });
    const screen = scope.screen;
    const yawGain = 0.4;
    const spotX = () => (SCREEN_X - lamp.position.x) * Math.tan(lamp.rotation.y);
    const heightOK = () => Math.abs(lamp.position.y - AXIS) <= 0.002;
    const angleOK = () => Math.abs(spotX()) <= 0.002;
    const cardAt = index => point(stations[index], AXIS, 0);
    const pair = () => trials[trial];
    const pending = () => pair() && [0, ...pair()].find(index => !installed.has(index));
    const ready = () => pair() && pending() === undefined;
    const separation = () => SLIT_SEPARATIONS[pair()[0] - 1];
    const wave = () => FILTER_WAVELENGTH[pair()[1] === 4 ? 'blue' : 'red'];
    const pitch = () => wave() * length / separation() * 1000;
    const endpoint = () => ends.length ? SCREEN_X : DOUBLE_X;
    function expose() {
      const filter = installed.has(4) ? 'blue' : installed.has(3) ? 'red' : null;
      rig.illuminate(lit, filter);
      scope.expose({ lit, single: installed.has(0), double: installed.has(1) || installed.has(2), filter,
        separation: SLIT_SEPARATIONS[installed.has(2) ? 1 : 0], length, offset: installed.size ? 0 : spotX() / scope.group.scale.x,
        height: (lamp.position.y - AXIS) / scope.group.scale.y, marks: view === 'count' ? marks : [] });
      scope.move(installed.size ? mm : 8);
      scope.cross.visible = lit && (view === 'scope' || !installed.size);
      rig.showReading(view === 'drum', mm);
      preview.hidden = !lit || !!view || !pair() || (installed.size > 0 && !showSeats);
      if (!preview.hidden) drawAlignment(preview, scope, installed.has(0), installed.has(1) || installed.has(2), installed.has(2));
    }
    function say(text, obj) { target = obj || null; bar.say(text); }
    function guide(prefix = '') {
      const tell = (text, obj) => say(prefix + text, obj);
      if (!pair()) return tell('三组波长已记好，可以掀开课本结论了。');
      if (!lit) return tell('点灯座开关，先看不放双缝时屏上有什么。', power);
      if (!aligned) {
        if (heightOK()) return tell('高度已对准。左右拖灯调角度，让亮斑移到屏中心。', housing);
        if (angleOK()) return tell('角度已对准。上下拖灯调高低，让亮斑移到屏中心。', housing);
        return tell('上下拖灯调高低，左右拖灯调角度，让亮斑移到屏中心。', housing);
      }
      const index = pending();
      if (index !== undefined) {
        const old = [...installed].find(card => stations[card] === stations[index]);
        if (old !== undefined) return tell(`把${labels[old]}拖回原位，再换${labels[index]}。`, cards[old]);
        return tell(`把${labels[index]}拖到${index === 0 ? '筒口前的单缝座' : index < 3 ? '筒口的双缝座' : '透镜和单缝之间'}。`, cards[index]);
      }
      if (ends.length < 2) return view === 'ruler' ? tell(`读${ends.length ? '毛玻璃屏' : '双缝'}指线对着的尺刻，记下位置。`) : tell('点刻度尺，读双缝和屏的位置。', rig.indices[ends.length]);
      if (view === 'drum') return tell('读固定套筒与手轮刻度，记下两者之和。');
      if (view === 'count') return tell('两端都算在内，一共数到几条亮纹？');
      if (view !== 'scope') return tell('点右端目镜，看亮纹和分划板。', screen);
      return tell(marks.length ? '转向另一条亮纹，边转边数；对准后点亮纹读数。' : '上下拖手轮，让竖线对准亮纹中心；点亮纹读数。', screw.grip);
    }
    function fields() {
      form.hidden = !['ruler', 'drum', 'count'].includes(view);
      field.value = '';
      caption.textContent = view === 'ruler' ? (ends.length ? '屏的位置 / cm' : '双缝的位置 / cm') : view === 'count' ? '亮纹条数 n' : '手轮读数 / mm';
      if (!form.hidden) ui?.fold(false);
    }
    function leave() {
      ctx.back(); view = null;
      bar.near(false); fields(); expose(); guide();
    }
    function closeup(which, pos, dir, dist) {
      view = which; ctx.look(pos, dir, dist, leave); bar.near(true); fields(); expose(); guide();
    }
    function eye() { closeup(marks.length === 2 ? 'count' : 'scope', [SCREEN_X + 0.016, AXIS, -0.022], [1, 0, 0], ctx.camera.aspect < 1 ? 0.31 : 0.235); }
    function scaleView() { closeup('ruler', [endpoint(), 0.009, 0.074], [0, 1, 0.02], 0.17); }
    function inspect() {
      order = Math.round((mm - 8) / pitch());
      if (Math.abs(mm - 8 - order * pitch()) > pitch() * 0.065) return say('竖线偏离亮纹中心了。再转一点手轮。', screw.grip);
      if (stripeIntensity((mm - 8) / 1000, length, separation(), wave()) < 0.08) return say('这条太暗，换一条看得清的亮纹。', screw.grip);
      if (marks.length && marks[0].order === order) return say('还是同一条亮纹。转到另一条再读。', screw.grip);
      closeup('drum', [SCREEN_X + 0.007, AXIS, -(rig.screwFrame.position.x + mm / 1000 - 0.004)], [1, 0, 0], 0.048);
    }
    function read() {
      const value = field.valueAsNumber;
      if (!Number.isFinite(value)) return;
      if (view === 'ruler') {
        const expected = (endpoint() - ruler.position.x + 0.5) * 100;
        if (Math.abs(value - expected) > 0.051) return say('没有对上指线。尺上的数字是厘米，每小格是 0.1 cm。');
        ends.push(value);
        if (ends.length === 1) { scaleView(); guide(`双缝在 ${value} cm。`); }
        else {
          const distance = Number(((ends[1] - ends[0]) * 10).toFixed(2));
          work.replaceChildren(h('p', {}, `l = (${ends[1]} − ${ends[0]}) cm = ${distance} mm`));
          bar.done('length'); leave(); guide(`屏距是 ${distance} mm。`);
        }
      } else if (view === 'drum') {
        if (Math.abs(value - mm) > 0.006) return say('读数没对上。先看露出的整格、半格，再加上手轮对齐的格数 × 0.01 mm。');
        marks.push({ value, order, position: mm });
        if (marks.length === 1) { eye(); guide(`第一条读到 ${value} mm。`); }
        else { eye(); guide(`第二条读到 ${value} mm。`); }
      } else if (view === 'count') {
        if (value !== Math.abs(marks[1].order - marks[0].order) + 1) return say('条数不是间隔数。两条端点亮纹都要算进去。');
        const [first, last] = marks.map(mark => mark.value);
        const span = Number(Math.abs(last - first).toFixed(4)), distance = Number(((ends[1] - ends[0]) * 10).toFixed(2));
        const spacing = span / (value - 1), slit = (separation() * 1000).toFixed(2);
        const nm = Math.round(measuredWavelength(first, last, value, distance, Number(slit)) * 1e6);
        const color = installed.has(4) ? '蓝' : '红';
        rows.add([color, slit, spacing.toFixed(3), String(nm)]);
        work.append(h('p', {}, h('b', {}, `${color}光 · ${slit} mm`), h('br'), `a = |${last} − ${first}| = ${span} mm`, h('br'), `Δx = a/(n − 1) = ${span}/(${value} − 1) ≈ ${spacing.toFixed(3)} mm`, h('br'), `λ = (d/l)Δx ≈ (${slit}/${distance}) × ${spacing.toFixed(3)} mm ≈ ${nm} nm`));
        trial++; marks = []; leave(); bar.done(trial === 3 ? 'compare' : 'spacing');
        guide(`这组测得约 ${nm} nm。`);
      }
    }
    const dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(point(0, 1, (AXIS - homes[0].y) / homes[0].z).normalize(), point(0, AXIS, 0));
    function cardPoint() {
      if (!ray) return null;
      const hit = ray.ray.intersectPlane(dragPlane.clone().applyMatrix4(group.matrixWorld), point(0, 0, 0));
      return hit && group.worldToLocal(hit);
    }
    function cardDrag(card, index) {
      const seat = cardAt(index), home = homes[index];
      const origin = () => installed.has(index) ? seat : home;
      function reject(text) { returns.set(card, { from: card.position.clone(), to: origin(), t: 0 }); guide(text); }
      return {
        obj: picks[index], anchor: card, keepOffset: true, plane: 'xz', offset: AXIS,
        enabled: () => lit && aligned && !view && pending() !== undefined && !returns.has(card),
        hint: () => `拖动：${installed.has(index) ? '取下' : '装上'}${labels[index]}`,
        onStart() { const pos = cardPoint(); offset = pos && card.position.clone().sub(pos); },
        onDrag(pos) { const hit = cardPoint(); card.position.copy(hit && offset ? hit.add(offset) : pos); },
        onEnd(moved) {
          if (!moved) return;
          const needed = pending();
          if (installed.has(index)) {
            if (card.position.distanceTo(home) > 0.038 || stations[needed] !== stations[index]) return reject('这张片没有换下。');
            installed.delete(index); card.position.copy(home);
          } else {
            if (index !== needed || [...installed].some(other => stations[other] === stations[index])) return reject('这张片还不能装。');
            if (card.position.distanceTo(seat) > 0.031) return reject('没有落进片座。');
            installed.add(index); card.position.copy(seat);
          }
          showSeats = index < 3;
          expose();
          if (!installed.has(index)) return guide('片座空出来了。');
          if (ready()) bar.done('cards');
          const alignment = '片座保证单缝与双缝平行、缝的中点在筒轴上。';
          const feedback = [
            '片座使单缝的中点落在筒轴上。',
            alignment + '屏上出现彩色条纹。',
            alignment + '红光没变，亮纹变疏了。',
            '换上红片，亮纹变红、变疏了。',
            '蓝片滤去了其他颜色，只剩蓝色条纹。',
          ];
          guide(feedback[index]);
        },
      };
    }
    const gain = 85;
    const pointer = draggable(group, [
      ...cards.map(cardDrag),
      { obj: housing, anchor: lamp, keepOffset: true, enabled: () => lit && !aligned, hint: '上下调高低，左右调角度',
        onStart() { startYaw = lamp.rotation.y; startHeight = lamp.position.y; lampDrag = null; },
        onDrag(pos) {
          const dx = pos.x - lamp.position.x, dy = pos.y - startHeight;
          // 一次拖动只调一个自由度，避免斜视光具座时横拖灯又改变已调好的高度。
          if (!lampDrag) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 0.001) return;
            lampDrag = Math.abs(dx) > Math.abs(dy) ? 'angle' : 'height';
          }
          if (lampDrag === 'angle') lamp.rotation.y = clamp(startYaw + dx * yawGain, -0.032, 0.032);
          else lamp.position.y = clamp(pos.y, AXIS - 0.024, AXIS + 0.024);
          expose();
        },
        onEnd(moved) {
          if (!moved) return;
          if (!heightOK() || !angleOK()) return guide();
          aligned = true; bar.done('axis'); guide('亮斑居中了，光束沿筒轴照到屏上。');
        } },
      { obj: screw.grip, plane: 'yz', offset: SCREEN_X + 0.004, enabled: () => view === 'scope', hint: '上下拖：转手轮',
        onStart() { startMM = mm; }, onDrag(pos, start) { if (start) { mm = clamp(startMM + (pos.y - start.y) * gain, 0.25, 15.75); rig.turn(mm); } },
        onEnd(moved) { if (moved) say('刻线移动了，亮纹没有动。对准亮纹中心后点它读数。', screen); } },
    ], { tip: ctx.tag('', 'pill'), taps: [
      { obj: power, enabled: () => !view && !!pair(), hint: '点一下：开关光源', onTap() { lit = !lit; expose(); guide(lit ? '灯亮了。' : '灯灭了，屏也暗了。'); } },
      { obj: ruler, enabled: () => !view && lit && ready() && ends.length < 2, hint: '点一下：看尺刻', onTap: scaleView },
      { obj: screen, enabled: () => lit && ready() && ends.length === 2 && (!view || view === 'scope'), hint: () => view === 'scope' ? '点亮纹：读手轮' : '点一下：看目镜', onTap() { if (view === 'scope') inspect(); else eye(); } },
    ] });
    function reset() {
      if (view) ctx.back();
      lit = aligned = false; view = null; trial = 0; mm = 7.6; marks = []; ends = []; ray = null;
      installed.clear(); returns.clear(); rows.clear(); work.replaceChildren();
      cards.forEach((card, index) => card.position.copy(homes[index]));
      showSeats = false; lamp.rotation.y = -0.024; lamp.position.y = AXIS - 0.023; rig.turn(mm); fields(); expose(); bar.near(false);
      bar.undo(...steps.map(([id]) => id)); ui?.relock(); guide();
    }
    reset();
    const dragCard = (index, remove = false) => ({ name: (remove ? '取下' : '安装') + labels[index], drag: picks[index], to: remove ? homes[index] : cardAt(index) });
    const submitValue = value => { field.value = String(value); form.requestSubmit ? form.requestSubmit() : submit.click(); };
    const readStep = (name, value) => ({ name, run: () => submitValue(typeof value === 'function' ? value() : value) });
    const turnStep = (name, number) => ({ name, drag: screw.grip, to: () => { const pos = group.worldToLocal(screw.grip.getWorldPosition(point(0, 0, 0))); pos.y += (8 + number * pitch() - mm) / gain; return pos; } });
    function qaTurn(name, number) {
      const step = qaFlow(pointer, [turnStep(name, number)])[0];
      step.run = () => {
        const wheel = pointer.items().find(item => item.obj === screw.grip);
        const start = group.worldToLocal(screw.grip.getWorldPosition(point(0, 0, 0)));
        wheel.onStart(); wheel.onDrag(step.mouse.to(), start); wheel.onEnd(true);
      };
      return step;
    }
    const measure = (checkErrors = false) => [
      { name: '透过目镜看条纹', tap: screen }, ...(checkErrors ? [{ name: '未对齐便读数', tap: screen }] : []), qaTurn('转手轮对准中央亮纹', 0), { name: '看第一条的手轮刻度', tap: screen }, ...(checkErrors ? [readStep('误读手轮', 7)] : []), readStep('记下第一条', () => Number(mm.toFixed(2))),
      qaTurn('跨过两个间隔', 2), { name: '看第二条的手轮刻度', tap: screen }, readStep('记下第二条', () => Number(mm.toFixed(2))), ...(checkErrors ? [readStep('漏数一端亮纹', 2)] : []), readStep('记录三条亮纹', 3),
    ];
    return {
      group: root, size: { w: 1.29, d: 0.47, h: 0.2 }, view: { elev: 23, azim: 46, frameMargin: 0.96 }, toggles: ['steps'], reset,
      pointer: {
        items: () => pointer.items().filter(item => item.enabled()),
        down(hit, event) { ray = hit; const held = pointer.down(hit, event); if (held && ui?.step === 0) ui.go(1); return held; },
        move(hit, event) { if (ui?.step !== 1) return false; ray = hit; return pointer.move(hit, event); },
        up(hit, event) { ray = null; return pointer.up(hit, event); },
      },
      mount(panel) {
        ui = panel; bar.attach({ need: () => ui.need(''), unlock: () => ui.unlock() });
        const source = ui.el.querySelector('.answer .src');
        if (source) { source.style.paddingRight = '84px'; source.style.minHeight = '48px'; }
        ui.controls.append(preview, form); ui.data.append(rows.el, work, h('button', { class: 'go ghost', onclick: reset }, '全部重来'));
        ui.status('光路与放大的屏像为示意。');
        ui.notes.append(h('p', { class: 'note' }, '手轮每圈 0.5 mm，分为 50 格。'));
        guide();
      },
      update(dt) { bar.update(dt); for (const [card, ret] of returns) { ret.t = Math.min(1, ret.t + dt / 0.38); card.position.lerpVectors(ret.from, ret.to, 1 - (1 - ret.t) ** 2); if (ret.t === 1) returns.delete(card); } },
      dispose() { rig.dispose(); pointer.dispose(); bar.dispose(); },
      debug: { bar, qa: [
        { name: '开灯看偏心光斑', tap: power }, { name: '先把灯调到筒轴高度', drag: housing, to: point(lamp.position.x, AXIS, 0) },
        { name: '调角度使光斑居中', drag: housing, to: () => point(lamp.position.x - lamp.rotation.y / yawGain, AXIS, 0) },
        { name: '先放双缝不能就位', drag: picks[1], to: cardAt(1) }, dragCard(0), dragCard(1), dragCard(4),
        { name: '看双缝指线', tap: ruler }, readStep('误读厘米尺', 20), readStep('双缝位置', 20.3), readStep('屏的位置', 92.3),
        ...measure(true), dragCard(4, true), dragCard(3), ...measure(), dragCard(1, true), dragCard(2), ...measure(),
        { name: '核对三组记录并掀开原文', run() { if (!bar.finished || rows.rows.length !== 3) throw Error('三组测量尚未完成'); ui.go(2); ui.el.querySelector('.flap-front').click(); } },
      ].map(step => step.mouse ? step : qaFlow(pointer, [step])[0]) },
    };
  },
};
