import * as THREE from 'three';
import { MutualInduction, couplingAtHeight } from './kit/mutualInduction.js';
import { mutualInductionRig, COIL_CENTER, INSERTED_BOTTOM, RAISED_BOTTOM } from './kit/mutualInductionRig.js';
import { draggable, clamp } from './kit/interact.js';
import { qaFlow } from './kit/chemlesson.js';
import { buttons, h, table } from './kit/ui.js';

const goal = '探究闭合线圈 B 在什么条件下会产生感应电流。';
const conditions = new Map([
  ['close', '闭合瞬间'], ['open', '断开瞬间'],
  ['steady', '闭合·保持不动'], ['fast', '闭合·快移滑片'],
]);
const scaleLimit = 0.7;
const limitText = '到示意刻度上限';
const retrySlide = '沿同一段向一个方向匀速拖动，再比较快慢。';

// 在相等的路段上比较用时。让手在起点等多久、松手后等多久，都不算滑动时间。
function slideMotion(points, pressedAt) {
  const from = points[0].r, to = points.at(-1).r;
  const direction = Math.sign(to - from);
  let previous = points[0];
  for (const point of points.slice(1)) {
    if ((point.r - previous.r) * direction <= 0 || point.t - previous.t > 250) return {};
    previous = point;
  }
  const first = points[1], next = points[2];
  const firstDuration = next ? (next.t - first.t) * Math.abs((first.r - from) / (next.r - first.r)) : 16;
  const start = first.t - Math.min(first.t - pressedAt, 80, firstDuration);
  const duration = Math.max(1, points.at(-1).t - start);
  const rate = 1000 * Math.abs(to - from) / duration;
  // 分段插值抑制指针事件的时间抖动，同时识别短促快推接慢爬。
  const parts = Math.min(8, Math.max(2, Math.floor(Math.abs(to - from) / 3)));
  let segment = 1, last = start;
  for (let i = 1; i <= parts; i++) {
    const target = from + (to - from) * i / parts;
    while (segment < points.length - 1 && (points[segment].r - target) * direction < 0) segment++;
    const a = points[segment - 1], b = points[segment], t = segment === 1 ? start : a.t;
    const crossing = t + (b.t - t) * (target - a.r) / (b.r - a.r);
    const ratio = (crossing - last) * parts / duration;
    if (ratio < 0.4 || ratio > 2.2) return {};
    last = crossing;
  }
  return { speed: rate > 50 ? '快移' : '慢移', rate, comparable: points.length >= 3 };
}
const miss = '横柄没到另一端，线圈沿导杆回到原位。拖到顶端或底端再松手。';
const overlap = '表针还在摆动，两次操作的偏转叠在了一起。等回零后再单独试一次。';
const inference = '表针偏转的几次，穿过 B 的磁通量有什么共同特点？';
const visibleAngle = 0.018;
const coilPoint = y => new THREE.Vector3(COIL_CENTER[0], y, COIL_CENTER[1]);

// 留下本轮实际画过的最大偏角，便于针回零后比较同一段路快移、慢移的结果。
function needleMark(angle) {
  const degrees = (angle * 180 / Math.PI).toFixed(1);
  const reading = Math.abs(angle) < visibleAngle ? '不明显' : angle < 0 ? '左偏' : '右偏';
  return '<span style="white-space:nowrap"><svg width="30" height="22" viewBox="0 0 32 22" aria-hidden="true" style="vertical-align:middle">' +
    '<path d="M4 8 Q16 -2 28 8 M16 3v3" fill="none" stroke="#8b8577"/>' +
    '<path d="M16 20V4" fill="none" stroke="#bb4438" stroke-width="2" transform="rotate(' + degrees + ' 16 20)"/></svg>' + reading + '</span>';
}

export default {
  id: 'mutualinduction',
  fig: '图13.3-3',
  title: '探究感应电流产生的条件',
  stampText: '实验',
  predict: {
    q: '线圈 A 接电源，套在它外面的 B 接电流表。合上开关，保持线圈和滑片不动，表针会怎样？',
    options: ['偏一下，又回到零位', '一直偏在一侧', '始终不偏转'],
    answer: 0,
  },
  conclusion: {
    page: 120, rect: [216.49, 182.07, 531.55, 245.23],
    quote: '以上实验及其他事实表明：当穿过闭合导体回路的磁通量发生变化时，闭合导体回路中就产生感应电流。这就是产生感应电流的条件。',
    src: '课本第 116 页 · 第十三章 第3节 电磁感应现象及应用',
  },
  create(ctx) {
    const rig = mutualInductionRig(), root = new THREE.Group();
    root.add(rig.group);
    const model = new MutualInduction({ meterOmega: 10, meterDamping: 1 });
    const maxLinkage = model.M * model.voltage / model.primaryR;
    const flux = () => model.M * model.observe().i1 / maxLinkage;
    const angle = () => clamp(model.observe().meter / 0.000044, -1, 1) * scaleLimit;
    const rows = table(['操作条件', 'B 中磁感线', '最大偏转']);
    const sheet = rows.el.querySelector('table');
    sheet.style.cssText = 'width:100%;table-layout:fixed';
    rows.el.style.cssText = 'max-height:min(32vh,280px);overflow:auto';
    [...sheet.querySelectorAll('th')].forEach((th, i) => {
      th.style.cssText = 'position:sticky;top:0;background:#f6efdd;z-index:1;width:' + [43, 27, 30][i] + '%';
    });
    const instruction = h('p', { class: 'note' });
    const observed = new Set();
    const feedback = h('p', { class: 'status', 'aria-live': 'polite' });
    const writing = h('textarea', { rows: 2, 'aria-label': inference, style: 'width:100%;box-sizing:border-box;font:inherit' });
    const thinking = h('details', { class: 'how-to' }, h('summary', {}, '写下我的归纳（选做）'), h('label', {}, inference, writing));
    const myWords = h('p', { class: 'why' });
    writing.addEventListener('input', () => {
      myWords.hidden = !writing.value.trim();
      myWords.textContent = '我的归纳：' + writing.value.trim();
    });
    const fieldLabel = ctx.tag('B 的磁通量（磁感线条数示意）', 'pill').loc(rig.group, COIL_CENTER[0] + 0.087, 0.165, COIL_CENTER[1]);
    fieldLabel.el.style.color = '#126583';
    const switchLabel = ctx.tag('', 'pill').loc(rig.sw.group, 0, 0.002, 0.040);
    const records = [];
    let ui, historyCheck, hand, capture, returning, near = false, bottom = INSERTED_BOTTOM;
    let steadySince = 0, steadyRecorded = false, unlocked = false;

    function say(text) { feedback.textContent = text; }
    function enter() { if (ui.step !== 1) ui.go(1); }
    function draw() {
      const fraction = flux();
      rig.draw(model, fraction, angle());
      fieldLabel.show(!near && fraction > 0.002);
      switchLabel.text(model.closed ? '开关闭合' : '开关断开').show(!near);
    }
    function lift(y) {
      if (y === bottom) return;
      bottom = y;
      rig.lift(y);
      model.setCoupling(couplingAtHeight(y));
    }
    function guide() {
      if (unlocked) return '还可以沿同一段快慢移动滑片，或上下拖动 A 的横柄，观察表针。';
      if (near) return '点表盘回到全景，继续操作。';
      if (bottom !== INSERTED_BOTTOM) return '把横柄拖到底端，将 A 插回 B 里。';
      if (capture) return '观察表针是否偏转，最后停在哪里。';
      if (!model.closed) return observed.has('close') ? '重新闭合开关，等表针回零。' : '合上开关，观察刚合闸时的表针。';
      if (!observed.has('steady')) return '保持开关闭合，让线圈和滑片静止，观察表针。';
      if (!observed.has('open') || !observed.has('close')) return '断开开关，观察刚断开时的表针。';
      return '保持开关闭合，朝一个方向迅速移动滑片，观察表针。';
    }
    function remember(kind, label, change, peak, still = false, slide = null, condition = null) {
      if (kind === 'steady' && records.some(r => r.label === label)) return;
      const limited = Math.abs(peak) >= scaleLimit;
      const reading = still ? '不偏转' : needleMark(peak) + (limited ? '<br>' + limitText : '');
      const cells = [label, change, reading];
      records.push({ kind, label, change, peak, slide, limited });
      if (condition && !(condition === 'fast' && observed.has('fast'))) {
        const index = [...conditions.keys()].indexOf(condition);
        rows.set(index, [conditions.get(condition), change, reading]);
        observed.add(condition);
        rows.el.scrollTop = 0;
      } else {
        rows.add(cells);
        rows.el.scrollTop = rows.el.scrollHeight;
      }
      if (!unlocked && observed.size === conditions.size) {
        unlocked = true;
        ui.unlock();
        ui.need('');
        thinking.hidden = false;
      }
    }
    function start(kind) {
      // 极短间隔的另一操作可以照做；仍在摆动的针不能当作新动作单独引起的偏转。
      if (capture && capture.age > 0.16) finish();
      capture = { kind, previous: flux(), up: false, down: false, age: 0, peak: 0,
        mixed: Math.abs(angle()) >= visibleAngle || !!capture, closed: model.closed,
        height: bottom, resistance: model.resistance };
      steadyRecorded = false;
      say('');
    }
    function sample(dt) {
      const c = capture;
      c.age += dt;
      const f = flux(), a = angle();
      if (Math.abs(a) > Math.abs(c.peak)) c.peak = a;
      if (!c.mixed && !c.seen && Math.abs(a) >= visibleAngle) {
        c.seen = true;
        say(a < 0 ? '表针正在向左偏转。' : '表针正在向右偏转。');
      }
      // 只在磁通累计变到可分辨时改变方向，避免把数值误差记为往返。
      if (Math.abs(f - c.previous) > 0.0001) {
        if (f > c.previous) c.up = true;
        else c.down = true;
        c.previous = f;
      }
    }
    function finish() {
      const c = capture;
      capture = null;
      if (c.mixed) { say(overlap); return; }
      const change = c.up && c.down ? '增减都有' : c.up ? '增多' : c.down ? '减少' : '不变';
      let label, slide = null, samePath;
      if (c.kind === 'slide') {
        slide = { from: c.resistance, to: model.resistance, height: c.height, ...slideMotion(c.points, c.pressedAt) };
        label = (c.closed ? '闭合' : '断开') + '·' + (slide.speed || '移动') + '滑片';
        const tolerance = Math.min(1, Math.abs(slide.to - slide.from) * 0.03);
        if (c.closed && slide.comparable && Math.abs(c.peak) < scaleLimit && c.up !== c.down)
          samePath = records.slice().reverse().find(r => r.slide?.comparable && !r.limited &&
            r.slide.speed !== slide.speed && r.change === change && r.slide.height === c.height &&
            Math.max(r.slide.rate, slide.rate) > 1.5 * Math.min(r.slide.rate, slide.rate) &&
            Math.abs(r.slide.from - slide.from) < tolerance && Math.abs(r.slide.to - slide.to) < tolerance);
      } else if (c.kind === 'coil') {
        label = (c.closed ? '通电' : '断电') + '·' + (bottom < c.height ? '插入 A' : '拔出 A');
      } else label = c.kind === 'close' ? '闭合瞬间' : '断开瞬间';
      if (c.kind !== 'coil' && c.height === RAISED_BOTTOM) label += '（A 在外）';
      const zero = change === '不变' && Math.abs(c.peak) < visibleAngle;
      let condition = null;
      if (c.height === INSERTED_BOTTOM && Math.abs(c.peak) >= visibleAngle) {
        if (c.kind === 'open' || c.kind === 'close') condition = c.kind;
        if (c.closed && slide?.speed === '快移') condition = 'fast';
      }
      remember(c.kind, label, change, c.peak, zero, slide, condition);
      if (zero) say(model.closed ? '磁感线条数没有明显变化，表针仍在零位附近。' : '开关断着，穿过 B 的磁感线没有变化，表针停在零位。');
      else if (samePath) {
        const difference = Math.abs(c.peak) - Math.abs(samePath.peak);
        const comparison = Math.abs(difference) < visibleAngle ? '两次的最大偏转差不多' :
          '这次' + slide.speed + '的最大偏转比' + samePath.slide.speed + '时' + (difference > 0 ? '大' : '小');
        say('沿同一段向同一侧移动，' + comparison + '。');
      }
      else if (Math.abs(c.peak) < visibleAngle) say('穿过 B 的磁感线有变化，但这次表针偏转很小，全景里看不明显。');
      else say('穿过 B 的磁感线' + (change === '增减都有' ? '先后有增有减' : change + '了') + '，表针' +
        (c.peak < 0 ? '向左' : '向右') + '偏得最远。');
      if (c.kind === 'open' && condition) say('刚断开时表针向右偏了一下，随后回到零位。');
      if (slide && Math.abs(c.peak) >= scaleLimit) say(feedback.textContent + '表针已' + limitText + '。');
      if (slide && !slide.speed) say(feedback.textContent + retrySlide);
      if (c.kind === 'close' && c.height === INSERTED_BOTTOM && Math.abs(c.peak) >= visibleAngle)
        ui.observePrediction('刚合上开关，B 的表针偏了一下。');
    }
    function toggle() {
      enter();
      start(model.closed ? 'open' : 'close');
      model.switch(!model.closed);
      draw();
    }
    const hint = text => ui?.step === 1 ? text : '';
    const coil = {
      obj: rig.coilPick, anchor: rig.inner.group, keepOffset: true, plane: 'xy', offset: COIL_CENTER[1] - 0.006,
      enabled: () => !returning && !near,
      hint: () => hint('上下拖：插入或拔出 A'),
      onStart() { enter(); hand = { kind: 'coil', from: bottom, moved: false }; },
      onDrag(p) {
        const y = clamp(p.y, INSERTED_BOTTOM, RAISED_BOTTOM);
        if (!hand || Math.abs(y - bottom) < 1e-6) return;
        if (!hand.moved) { start('coil'); hand.moved = true; }
        lift(y);
      },
      onEnd(moved, zone) {
        if (hand?.moved && !zone) {
          returning = { from: bottom, to: hand.from, elapsed: 0 };
          capture = null;
          say(miss);
        }
        hand = null;
        steadySince = model.time;
      },
      dropzones: [
        { name: '下端', position: coilPoint(INSERTED_BOTTOM), radius: 0.019, enabled: () => hand?.from === RAISED_BOTTOM },
        { name: '上端', position: coilPoint(RAISED_BOTTOM), radius: 0.019, enabled: () => hand?.from === INSERTED_BOTTOM },
      ],
    };
    const slider = {
      obj: rig.sliderPick, anchor: rig.sliderPick, plane: 'xz', offset: 0.038, keepOffset: true, enabled: () => !near && !returning,
      hint: () => hint('左右拖：快慢移动滑片'),
      onStart() { enter(); hand = { kind: 'slide', moved: false, start: performance.now() }; },
      onDrag(p) {
        if (!hand) return;
        const r = 100 * clamp((p.x - rig.rheostat.group.position.x) / rig.rheostat.L + 0.5, 0, 1);
        if (Math.abs(r - model.resistance) < 0.01) return;
        const now = performance.now();
        if (!hand.moved) {
          start('slide');
          hand.moved = true;
          capture.pressedAt = hand.start;
          capture.points = [{ r: model.resistance, t: now }];
        }
        capture.points.push({ r, t: now });
        model.setResistance(r);
        rig.rheostat.setPos(r / 100);
      },
      onEnd() { hand = null; steadySince = model.time; },
    };
    function leave() { near = false; ctx.back(); draw(); }
    function look() {
      enter();
      if (near) { leave(); return; }
      near = true;
      draw();
      ctx.look([0.185, 0.074, 0.052], [0, 0.18, 1], 0.36, leave);
    }
    const tip = ctx.tag('', 'pill');
    const hideTip = () => tip.loc(rig.group, 0, -9, 0).text('');
    const canvas = document.getElementById('c');
    hideTip();
    canvas.addEventListener('pointerleave', hideTip);
    const desk = draggable(rig.group, [coil, slider], {
      tip,
      taps: [
        { obj: rig.switchPick, enabled: () => !near && !returning, hint: () => hint(model.closed ? '点一下：断开开关' : '点一下：闭合开关'), onTap: toggle },
        { obj: rig.meterPick, hint: () => hint(near ? '点一下：回到全景' : '点一下：近看表针'), onTap: look },
      ],
    });
    function reset() {
      hideTip();
      desk.clearDropzones();
      hand = capture = returning = null;
      model.reset();
      bottom = INSERTED_BOTTOM;
      model.setCoupling(couplingAtHeight(bottom));
      rig.lift(bottom);
      steadySince = 0; steadyRecorded = unlocked = false;
      rows.clear(); records.length = 0; observed.clear();
      for (const label of conditions.values()) rows.add([label, '待观察', '—'], { highlight: false });
      rows.el.scrollTop = 0;
      writing.value = ''; myWords.hidden = true; myWords.textContent = '';
      thinking.open = false; thinking.hidden = true;
      say('');
      if (near) leave();
      draw();
      if (ui) { ui.observePrediction(''); ui.relock(); ui.fold(false); ctx.reframe(); }
    }
    reset();
    const dragCoil = (name, y) => ({ name, drag: coil.obj, to: coilPoint(y), wait: 1.8 });
    const dragSlider = (name, fraction) => ({ name, drag: slider.obj, wait: 1.8,
      to: new THREE.Vector3(rig.rheostat.group.position.x + (fraction - 0.5) * rig.rheostat.L, 0.038, rig.rheostat.group.position.z) });
    const check = (ok, message) => { if (!ok) throw new Error(message); };
    return {
      group: root, pointer: desk, reset, toggles: [],
      size: { w: 0.59, d: 0.42, h: 0.23 }, view: { elev: 30, azim: -3, frameMargin: 1.04 },
      mount(panel) {
        ui = panel;
        // 公共面板会在下一任务恢复旧印章。本轮的结论须以本轮四项记录为准。
        historyCheck = setTimeout(() => {
          if (!unlocked && ui.el.querySelector('.flap:not(.locked)')) ui.relock({ full: false });
        }, 0);
        ui.status(goal);
        ui.now.after(h('div', {}, instruction, feedback));
        ui.data.append(rows.el);
        ui.data.after(thinking, buttons([{ text: '全部重来', ghost: true, onClick: reset }]).el);
        ui.el.querySelector('.answer .src').before(myWords);
        ui.el.querySelector('.answer').style.paddingBottom = '68px';
        ui.observePrediction('');
      },
      update(dt) {
        desk.update(dt);
        if (returning) {
          returning.elapsed += dt;
          const t = Math.min(1, returning.elapsed / 0.38);
          lift(t === 1 ? returning.to : returning.from + (returning.to - returning.from) * t * t * (3 - 2 * t));
          if (t === 1) { returning = null; steadySince = model.time; }
        }
        model.advance(dt);
        draw();
        if (capture) {
          sample(dt);
          if (!hand && capture.age >= 0.16 && Math.abs(angle()) < visibleAngle && Math.abs(model.observe().meterSpeed) < 0.000004) {
            finish();
            steadySince = model.time;
          }
        } else if (!hand && !returning && model.closed && !steadyRecorded && model.time - steadySince > 0.6 && Math.abs(angle()) < visibleAngle) {
          steadyRecorded = true;
          const lastAction = records[records.length - 1];
          const lastKind = lastAction && Math.abs(lastAction.peak) >= visibleAngle ? lastAction.kind : '';
          remember('steady', '闭合·保持不动' + (bottom === RAISED_BOTTOM ? '（A 在外）' : ''), '不变', 0, true, null, bottom === INSERTED_BOTTOM ? 'steady' : null);
          if (records.some(r => r.kind === 'close' && r.label === '闭合瞬间') && bottom === INSERTED_BOTTOM)
            ui.observePrediction('刚合闸时表针偏转，保持不动后回到零位。');
          if (lastKind === 'close' && feedback.textContent !== miss && feedback.textContent !== overlap) say('合闸时表针偏了一下。开关仍闭合，磁感线条数稳定下来，表针回到了零位。');
        }
        const next = guide();
        if (instruction.textContent !== next) instruction.textContent = next;
      },
      dispose() { clearTimeout(historyCheck); canvas.removeEventListener('pointerleave', hideTip); desk.dispose(); rig.dispose(); },
      debug: {
        get state() { return { bottom, closed: model.closed, resistance: model.resistance, fraction: flux(), angle: angle(), records, near }; },
        qa: qaFlow(desk, [
          dragCoil('横柄只拖到中途', 0.061),
          { name: '核对未到位的回程', run() { check(bottom === INSERTED_BOTTOM && !records.length && feedback.textContent === miss, '短拖未归位或误记'); } },
          dragSlider('断开时拖滑片', 0.36),
          { name: '断路没有感应电流', run() { check(records.some(r => r.kind === 'slide' && r.change === '不变' && Math.abs(r.peak) < visibleAngle), '断路滑片记录不符'); } },
          { name: '闭合并等表针回零', tap: rig.switchPick, wait: 2.4 },
          { name: '核对合闸和稳态', run() {
            check(records.some(r => r.kind === 'close' && r.peak < -visibleAngle && r.change === '增多'), '合闸偏转有误');
            check(records.some(r => r.kind === 'steady') && !unlocked && ui.el.querySelector('.flap.locked') && flux() > 0, '稳恒磁通对照缺失');
          } },
          { name: '断开并观察瞬间', tap: rig.switchPick, wait: 1.8 },
          { name: '断开后仍缺快移记录', run() { check(observed.has('open') && !unlocked, '快移前提前解锁'); } },
          { name: '重新闭合并等表针回零', tap: rig.switchPick, wait: 2.4 },
          dragSlider('合闸时向右拖滑片', 0.82),
          { name: '核对四项均已观察', run() { check(unlocked && observed.size === 4, '课本四项未完成'); } },
          dragSlider('合闸时向左拖滑片', 0.20),
          dragCoil('从 B 中拔出 A', RAISED_BOTTOM),
          dragCoil('把 A 插回 B', INSERTED_BOTTOM),
          { name: '断开开关', tap: rig.switchPick, wait: 1.8 },
          { name: '核对三种条件的变化方向', run() {
            for (const [kind, sign] of [['slide', 1], ['slide', -1], ['coil', 1], ['coil', -1], ['open', 1]])
              check(records.some(r => r.kind === kind && sign * r.peak > visibleAngle && r.change === (sign > 0 ? '减少' : '增多')), kind + ' 偏向与磁通变化不符');
            check(!model.closed && bottom === INSERTED_BOTTOM && Math.abs(flux()) < 0.0001, '断电后磁通不为零');
          } },
          { name: '对照课本原文', run() { ui.go(2); ui.el.querySelector('.flap-front').click(); check(ui.el.querySelector('.flap.open .page-crop'), '原文没有掀开'); } },
          { name: '全部重来', run() { reset(); check(ui.step === 0 && !records.length && !model.closed && bottom === INSERTED_BOTTOM && !unlocked, '没有回到初始状态'); } },
        ]),
      },
    };
  },
};
