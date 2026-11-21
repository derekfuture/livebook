// 人教版选择性必修 1，第 5–6 页。量筒已分别量好两份溶液，三次测量各用一份新样品。
import * as THREE from 'three';
import { h } from '../ui/Panel.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { paperSheet, mountXuean, moreBox, wrapPointer, qaFlow, demoActs } from './kit/chemlesson.js';
import { micro } from './kit/microworld.js';
import { faceLabel } from './kit/labels.js';
import { calorimeter, cover, graduate, cleaning, probe, heatLossArrows, heatScene, drawThermometer, cupSurface, RIM, V } from './kit/neutheat-parts.js';

const ACID = -0.133,
  PARK = -0.077,
  BASE = 0.064,
  WASH = 0.11,
  DRY = 0.159;
const LID = V(0, RIM),
  OFF = V(PARK, 0.001),
  CLEAN = V(WASH, 0.081),
  CLOTH = V(DRY, 0.007);
const ACID_T = V(-0.009, 0.078),
  BASE_T = V(BASE, 0.088),
  MIX_T = V(-0.009, 0.083);
const MOUTHS = [V(-0.007, 0.086), V(0.007, 0.086)];
const POUR_ANGLE = 1.67;
const lipOffset = (i, angle) => V(i ? -0.016 : 0.016, 0.045).applyAxisAngle(V(0, 0, 1), angle);
const POUR = MOUTHS.map((mouth, i) => mouth.clone().sub(lipOffset(i, i ? POUR_ANGLE : -POUR_ANGLE)));
const ROOM = 25,
  CP = 4.18,
  N = 0.05 * 0.5,
  Q = N * 57300;
const PAIRS = [
  [24.8, 25.2],
  [25.1, 24.9],
  [24.9, 25.1],
];
const HOME = { acid: V(ACID, 0.049), base: V(BASE, 0.049), lid: LID, thermo: CLOTH };
const NAMES = { acid: '盐酸量筒', base: 'NaOH 量筒', thermo: '温度计', lid: '杯盖', rod: '玻璃搅拌器' };
const RINSE = '把温度计下端移到右侧水流下冲洗。';
const WIPE = '将冲洗过的温度计放到干布上擦干。';
const OPEN = '提起杯盖和搅拌器，放到量热计左侧的空位上。';
const CLOSE = '把杯盖放回量热计口，盖严。';
const TASKS = [
  ['lid', OPEN, OFF],
  ['acid', '提起盐酸量筒，将筒口移到内筒口上方，倾倒至空。', POUR[0]],
  ['lid', CLOSE, LID],
  ['thermo', '把温度计下端从杯盖左孔插入盐酸，读取初温。', ACID_T],
  ['thermo', RINSE, CLEAN],
  ['thermo', WIPE, CLOTH],
  ['thermo', '把温度计下端浸入右边量筒的 NaOH 溶液，读取初温。', BASE_T],
  ['thermo', RINSE, CLEAN],
  ['thermo', WIPE, CLOTH],
  ['lid', OPEN, OFF],
  ['base', '提起 NaOH 量筒，将碱液迅速倒入内筒。', POUR[1]],
  ['lid', '立即把杯盖放回量热计口。', LID],
  ['thermo', '把温度计下端从杯盖左孔插入混合液。', MIX_T],
  ['rod', '拖住杯盖右边的玻璃搅拌器，匀速上下往返。'],
  ['thermo', '观察温度计，记下液柱达到的最高温度。'],
  ['thermo', RINSE, CLEAN],
  ['thermo', WIPE, CLOTH],
];
const TITLES = ['测盐酸初温', '测碱液初温', '混合并盖好', '搅拌测最高温'];
const GROUPS = [0, 6, 9, 12];
const INTRO = '两支量筒已各量好 50 mL 溶液。盐酸为 0.50 mol/L，NaOH 溶液为 0.55 mol/L。';
const MODEL = [
  '第 5 页图 1-3。量热计前壁画成剖面，便于看到内筒、隔热层和液面。两种溶液均为无色。量筒及温度计的刻度局部放大。',
  '第 5–6 页。两份溶液各按 50 g 计算，溶液比热容取 4.18 J/(g·℃)，忽略量热计的热容。盐酸有 0.025 mol，NaOH 有 0.0275 mol，碱稍过量。',
  '初温为示意值。按课本的 57.3 kJ/mol 计算，完全中和放出 1.4325 kJ。混合液向 25 ℃ 环境散热，敞口比加盖快。橙色箭头表示热散向周围。散热和温度计响应的速度均为示意，实际偏差要靠实测。',
  '微观画面只追踪一对参与反应的离子。H⁺ 表示水溶液中的水合氢离子。粒子数量、热运动的变化幅度和橙色能量标记均为示意。',
];
const fix = (n) => Number(n).toFixed(1);
const freshTrial = (i) => ({
  phase: 0,
  vol: [0, 0],
  closed: true,
  dock: 'cloth',
  read: ROOM,
  peak: null,
  pending: null,
  t1: null,
  acid: null,
  base: null,
  t2: null,
  heat: 0,
  strokes: 0,
  strokeY: 0,
  openTime: 0,
  heatTime: 0,
  number: i + 1,
});
const fresh = () => ({
  demo: false,
  trial: freshTrial(0),
  rows: [],
  poses: {},
  returns: {},
  held: null,
  flow: null,
  closeup: null,
  finished: false,
});
const average = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
const rowDelta = (r) => +(r.t2 - r.t1).toFixed(2);
function summary(rows) {
  const dt = average(rows.map(rowDelta)),
    q = (100 * CP * dt) / 1000,
    dh = -q / N;
  return (
    '三次平均温升约 ' +
    dt.toFixed(2) +
    ' ℃，溶液吸热约 ' +
    q.toFixed(3) +
    ' kJ。每生成 1 mol 水，本次测得 ΔH ≈ ' +
    dh.toFixed(1).replace('-', '−') +
    ' kJ/mol，放热量与课本参考值相差约 ' +
    Math.abs(57.3 + dh).toFixed(1) +
    ' kJ/mol。'
  );
}

export default {
  id: 'neutheat',
  fig: '图1-3',
  title: '中和反应反应热的测定',
  style: 'paper',
  stampText: '实验',
  predict: {
    q: '用同样的两份溶液，盐酸都被完全中和。倒完碱液后晚一些盖杯盖，按温升算出的放热量会怎样？',
    options: ['变小，有一部分热散到周围', '相同，生成的水一样多', '变大，敞口时反应更充分'],
    answer: 0,
  },
  need: '分别测两种溶液的初温，混合后测最高温，共做三次。',
  conclusion: {
    crops: [{ page: 10, rect: [219, 374, 532, 435] }],
    quote: '大量实验测得，在25 ℃和101 kPa下，强酸的稀溶液与强碱的稀溶液发生中和反应生成1 mol H2O时，放出57.3 kJ的热量。',
    formula: 'ΔH ≈ −(m₁ + m₂)c × 平均温差 / n(H₂O)',
    why: '先将两种溶液的初温取平均，再从最高温度减去这个平均值。用三次温差的平均值求溶液吸收的热量。散到环境中的热未计入温升，测得的放热量会偏小。',
    src: '人教版 化学 选择性必修 1 · 第 5–6 页',
  },
  create({ tag, look, back }) {
    const root = new THREE.Group(),
      group = new THREE.Group();
    root.add(group);
    paperSheet(group, { w: 0.43, d: 0.21 });
    const lossArrows = heatLossArrows(group);
    const fillCup = calorimeter(group),
      lid = cover(group),
      th = probe(group);
    const cylinders = [graduate(group, '量筒 · 盐酸', 1), graduate(group, '量筒 · NaOH 溶液', -1)];
    const tools = { lid, thermo: th, acid: cylinders[0], base: cylinders[1], rod: { body: lid.rod, pick: lid.rodPick, ringTarget: lid.grip } };
    const wash = cleaning(group, WASH, DRY);
    const contents = ['空', '盐酸', '混合液'].map((name) =>
      faceLabel(group, '量热计 · ' + name, { y: 0.008, z: 0.039, h: 0.009, color: '#243f3c', stroke: '#fff9e8' }));
    const stream = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0013, 0.0016, 1, 10),
      new THREE.MeshBasicMaterial({ color: 0x9cc2c7, transparent: true, opacity: 0.84 }),
    );
    group.add(stream);
    stream.visible = false;
    const lens = tag('', 'nh-lens');
    const dial = h('canvas', { width: 82, height: 206, 'aria-label': '温度计放大刻度' });
    lens.el.append(dial);
    const offProbe = tag('温度计已离开混合液', 'pill');

    let S = fresh(),
      W = null,
      saved = null,
      bar,
      mic,
      paused = false;
    const trial = () => S.trial;
    const task = () => TASKS[trial().phase];
    const resting = (k) => {
      if (k === 'lid') return trial().closed ? LID : OFF;
      if (k === 'thermo') return { cloth: CLOTH, wash: CLEAN, acid: ACID_T, base: BASE_T, mix: MIX_T }[trial().dock];
      return HOME[k];
    };
    const pose = (k) => S.poses[k] || resting(k);
    const putPose = (k, p) => {
      S.poses[k] = p.clone();
    };
    const tilt = (i, grip) => {
      const side = i ? 1 : -1;
      if (trial().closed || (trial().vol[i] < 50 && S.flow?.i !== i)) return 0;
      // 仅在倒液握持点附近倾斜，越过杯口或举得过高都会扶正。
      return side * POUR_ANGLE * clamp(1 - grip.distanceTo(POUR[i]) / 0.024, 0, 1);
    };
    const workingMouth = (i) => {
      const a = cylinders[i];
      return a.mouth.position.clone().applyQuaternion(a.body.quaternion).add(a.body.position);
    };
    function render() {
      const r = trial();
      lid.body.position.copy(pose('lid'));
      cylinders.forEach((a, i) => {
        const grip = pose(i ? 'base' : 'acid'), angle = tilt(i, grip);
        a.body.rotation.z = angle;
        a.body.position.copy(grip);
        a.liquid(50 - r.vol[i], angle);
        a.body.userData.ringY = a.body.position.y + 0.035;
      });
      contents.forEach((plate, i) => { plate.visible = i === (r.vol[1] ? 2 : r.vol[0] ? 1 : 0); });
      lid.rod.position.y = Math.max(0.003 - lid.body.position.y, -0.047) + r.strokeY;
      lid.ringTarget.userData.ringY = lid.body.position.y + 0.006;
      const p = pose('thermo');
      const upright = clamp((p.y - CLOTH.y) / 0.055, 0, 1);
      th.body.rotation.x = -Math.acos(upright);
      th.plate.rotation.x = -th.body.rotation.x;
      th.body.position.copy(p);
      th.ringTarget.userData.ringY = th.body.position.y + 0.025 * upright + 0.001;
      fillCup(r.vol[0] + r.vol[1]);
      wash.visible = near(p, CLEAN, 0.010);
      stream.visible = !!S.flow && S.flow.running;
      if (stream.visible) {
        const src = workingMouth(S.flow.i);
        const bottom = cupSurface(r.vol[0] + r.vol[1]);
        stream.position.set(src.x, (bottom + src.y) / 2, src.z);
        stream.scale.y = Math.max(0.0001, src.y - bottom);
      }
    }
    const near = (p, q, r) => Math.hypot(p.x - q.x, p.y - q.y) < r;
    const say = (s) => {
      if (!S.demo) W?.ui.status(s);
    };
    const rowView = (r) => [
      String(r.number),
      ...[r.acid, r.base].map((v) => (v == null ? '—' : fix(v))),
      r.t1 == null ? '—' : r.t1.toFixed(2),
      r.t2 == null ? '—' : fix(r.t2),
      r.t2 == null ? '—' : rowDelta(r).toFixed(2),
    ];
    function refresh() {
      if (S.demo || !W) return;
      const r = trial(),
        n = r.number - 1;
      if (r.acid != null) {
        if (W.tbl.rows.length <= n) W.tbl.add(rowView(r));
        else W.tbl.set(n, rowView(r));
      }
      if (task()) {
        const groupIndex = GROUPS.reduce((v, p, i) => (r.phase >= p ? i : v), 0);
        for (let i = 0; i < groupIndex; i++) bar.done(String(i));
        const prompt = r.pending === 't2' ? '平视温度计的峰值留影，记下最高温度。'
          : r.pending ? '平视温度计，读出液柱顶端的温度并记录。' : task()[1];
        const hint = '第 ' + r.number + ' 次 · ' + prompt;
        bar.say(hint);
        say(hint);
      }
      W.entry.hidden = !r.pending;
      if (r.t2 != null)
        W.result.textContent =
          '第 ' +
          r.number +
          ' 次温升约 ' +
          rowDelta(r).toFixed(2) +
          ' ℃。若热量全部留在溶液中，理论温升约 ' +
          (Q / (100 * CP)).toFixed(2) +
          ' ℃，相差约 ' +
          Math.abs(Q / (100 * CP) - rowDelta(r)).toFixed(2) +
          ' ℃。';
      if (S.finished) {
        W.review.hidden = false;
        W.result.textContent = summary(S.rows);
        W.ui.observePrediction('倒完碱液到盖好杯盖：\n' + S.rows.map((row) =>
          `第 ${row.number} 次：${fix(row.openTime)} s，温升 ${rowDelta(row).toFixed(2)} ℃`).join('\n'));
      }
    }
    const advance = () => {
      trial().phase++;
      refresh();
    };
    const goBack = (k, from) => {
      const end = resting(k);
      if (from.distanceTo(end) < 0.0001) {
        delete S.poses[k];
        delete S.returns[k];
        return;
      }
      S.returns[k] = { from: from.clone(), to: end.clone(), time: 0 };
      putPose(k, from);
    };
    function newTrial(spoiled = '') {
      const n = trial().number - (spoiled ? 1 : 0);
      const starts = Object.fromEntries(['lid', 'thermo', 'acid', 'base'].map((k) => [k, pose(k).clone()]));
      S.trial = freshTrial(n);
      S.held = null;
      S.flow = null;
      Object.keys(starts).forEach((k) => goBack(k, starts[k]));
      if (!S.demo) {
        bar.undo('0', '1', '2', '3');
        refresh();
        if (spoiled) say(spoiled + '本次换用新样品，保留此前各次的完整记录。');
      }
    }
    function pour(dt) {
      const f = S.flow;
      if (!f) return;
      const r = trial(), i = f.i, k = i ? 'base' : 'acid', mouth = workingMouth(i);
      const angle = Math.abs(cylinders[i].body.rotation.z);
      const capacity = angle >= Math.PI / 2 ? 0 : 60 * clamp(1 - 0.014 * Math.tan(angle) / 0.087, 0, 1);
      const before = r.vol[i];
      if (Math.abs(mouth.x) < 0.025 && mouth.y >= RIM) {
        r.vol[i] += Math.min(Math.max(0, 50 - capacity - before), 50 * dt / 0.95);
      }
      f.running = r.vol[i] > before;
      if (i) r.heat += Q * (Math.min(1, r.vol[i] * 0.00055 / N) - Math.min(1, before * 0.00055 / N));
      if (r.vol[i] >= 50) {
        S.flow = null;
        advance();
        if (S.held !== k) goBack(k, pose(k));
      }
    }
    function record(value) {
      const r = trial(), key = r.pending;
      if (!key || S.held) return;
      const expected = key === 't2' ? r.peak : r.read;
      if (!Number.isFinite(value) || Math.abs(value - expected) > 0.105) {
        say('再看液柱顶端和相邻刻度，读到 0.1 ℃。');
        return;
      }
      r[key] = value;
      r.pending = null;
      if (!S.demo) W.input.value = '';
      if (key === 'base') r.t1 = (r.base + r.acid) / 2;
      if (key === 't2') {
        S.rows.push({ ...r });
        if (r.number === 3) {
          S.finished = true;
          if (!S.demo) W.ui.unlock();
        }
      }
      advance();
    }
    const inCup = () => th.immersed(0, 0.0268, cupSurface(0), cupSurface(trial().vol[0] + trial().vol[1]));
    function measureOrClean(p, landed) {
      const r = trial(),
        phase = r.phase,
        goal = task()?.[2];
      if (!goal || task()[0] !== 'thermo') return;
      const wipe = goal === CLOTH,
        rinse = goal === CLEAN;
      const touching = wipe
        ? near(p, goal, 0.012)
        : rinse
          ? near(p, goal, 0.014)
          : goal === BASE_T ? th.immersed(BASE, 0.014, 0.005, 0.077) : Math.abs(p.x - goal.x) < 0.005 && inCup();
      if (!landed || !touching) {
        const intoBase = (phase === 4 || phase === 5) && near(p, BASE_T, 0.009);
        const intoAcid = (phase === 7 || phase === 8) && near(p, ACID_T, 0.008);
        if ((rinse || wipe) && (intoBase || intoAcid)) {
          if (!S.demo && W.tbl.rows.length > r.number - 1) {
            W.tbl.clear();
            S.rows.forEach((row) => W.tbl.add(rowView(row)));
          }
          newTrial(rinse ? '温度计把酸、碱带到了一起，一小部分已提前中和。' : '温度计上残留的水稀释了待测溶液。');
        }
        return;
      }
      if (phase === 3 || phase === 6) {
        r.dock = r.pending = phase === 3 ? 'acid' : 'base';
        r.read = PAIRS[r.number - 1][phase === 3 ? 0 : 1];
        refresh();
        if (S.demo) record(r.read);
        return;
      }
      if (phase === 12) {
        r.dock = 'mix';
        r.read = average(PAIRS[r.number - 1]);
        r.peak = r.read;
      }
      if (rinse) r.dock = 'wash';
      if (wipe) {
        r.dock = 'cloth';
        r.read = ROOM;
      }
      if (phase === 16 && r.number < 3) {
        newTrial();
        return;
      }
      advance();
      if (phase === 16) {
        if (!S.demo) bar.done('3');
        say(summary(S.rows));
      }
    }
    function release(k, landed) {
      if (S.held !== k) return;
      S.held = null;
      if ((k === 'acid' || k === 'base') && S.flow?.i === (k === 'base' ? 1 : 0)) {
        if (landed) return;
        S.flow = null;
      }
      const r = trial();
      if (k === 'rod') {
        if (r.phase !== 13 && r.phase !== 14) r.rodReturn = { y: r.strokeY, time: 0 };
        return;
      }
      const p = pose(k).clone();
      if (!cancel && !r.pending && task()?.[0] === k) {
        if (k === 'lid' && landed) {
          r.closed = task()[2] === LID;
          advance();
        } else if (k === 'thermo') measureOrClean(p, landed);
      }
      goBack(k, p);
    }
    function inspectCylinder(k) {
      S.closeup = k;
      if (!k) { back(); return; }
      const i = k === 'base' ? 1 : 0;
      const surface = 0.0045 + (50 - trial().vol[i]) * 0.087 / 60;
      look([i ? BASE : ACID, surface, 0], [0, 0, 1], 0.16, () => { S.closeup = null; });
    }
    const leaveScale = tag('回到实验台', 'pill view', () => inspectCylinder(null));
    let cancel = false;
    // 拖动坐标取手握处；落点检测用筒嘴或球泡。杯盖直接用中心。
    const offset = (k) => {
      if (k === 'thermo' && task()?.[2] !== CLOTH) return th.bulb.position;
      if (k === 'acid' || k === 'base') {
        const i = k === 'base' ? 1 : 0;
        return lipOffset(i, i ? POUR_ANGLE : -POUR_ANGLE);
      }
      return V();
    };
    const destination = (k) => {
      const goal = task()[2];
      if (k === 'acid' || k === 'base') return MOUTHS[k === 'base' ? 1 : 0];
      if (k === 'thermo' && goal !== CLOTH) return goal.clone().add(th.bulb.position);
      return goal;
    };
    const canDock = (k) => {
      if (trial().pending || task()?.[0] !== k || !task()[2]) return false;
      if (k === 'thermo') {
        const bulb = th.bulb.position.clone().applyQuaternion(th.body.quaternion).add(th.body.position);
        return near(bulb, destination(k), 0.034);
      }
      return true;
    };
    const items = ['lid', 'acid', 'base', 'thermo', 'rod'].map((k) => ({
      obj: tools[k].pick,
      anchor: tools[k].body,
      get dropOffset() { return offset(k); },
      dropzones: k === 'rod' ? undefined : [{
        name: NAMES[k], position: () => destination(k), radius: k === 'lid' ? 0.034 : 0.027,
        enabled: () => canDock(k),
      }],
      plane: 'xy',
      keepOffset: true,
      hint: () => k === 'base' && trial().dock === 'base' ? ''
        : k === 'acid' || k === 'base' ? NAMES[k] + ' · 轻点看刻度' : NAMES[k],
      onTap: k === 'acid' || k === 'base' ? () => inspectCylinder(S.closeup === k ? null : k) : undefined,
      enabled: () => (k !== 'base' || trial().dock !== 'base') && !(S.flow && !S.held && k === (S.flow.i ? 'base' : 'acid')),
      onDrag(p) {
        if (!p || (S.finished && trial().phase > 16)) return;
        S.held = k;
        delete S.returns[k];
        if (k === 'rod') {
          const r = trial();
          delete r.rodReturn;
          if (r.phase !== 13) {
            r.strokeY = clamp(p.y - lid.body.position.y - Math.max(0.003 - lid.body.position.y, -0.047), 0, 0.034);
            render();
            return;
          }
          const y = clamp(p.y - (LID.y - 0.047), -0.008, 0.012);
          const d = y - r.strokeY;
          r.strokes += Math.abs(d);
          r.strokeY = y;
          if (r.strokes >= 0.025) {
            advance();
          }
          return;
        }
        const cylinder = k === 'acid' || k === 'base';
        const minY = cylinder ? 0.049 : k === 'lid' ? OFF.y : CLOTH.y;
        const q = V(clamp(p.x, -0.17, 0.18), clamp(p.y, minY, 0.165));
        putPose(k, q);
        if ((k === 'acid' || k === 'base') && task()?.[0] === k && !S.flow)
          S.flow = { i: k === 'base' ? 1 : 0, running: false };
        render();
      },
      onEnd: (moved, zone) => release(k, !!zone),
    }));
    const drag = draggable(group, items, { tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const target = () => (!S.closeup && !S.held && !mic?.isOpen && task() ? tools[task()[0]].ringTarget || tools[task()[0]].body : null);
    function heat(dt, measuringMix) {
      const r = trial(),
        ml = r.vol[1];
      if (!ml || r.phase > 15) return;
      r.heatTime += dt;
      const open = !near(pose('lid'), LID, 0.004);
      if (r.phase === 11) r.openTime += dt;
      r.heat *= Math.exp(-dt * (open ? 0.021 : 0.0007));
      const c = (50 + ml) * CP,
        solution = (50 * PAIRS[r.number - 1][0] + ml * PAIRS[r.number - 1][1]) / (50 + ml) + r.heat / c;
      if (measuringMix) {
        const prev = r.read;
        r.read += (solution - r.read) * (1 - Math.exp(-dt * (r.strokes > 0 ? 3.8 : 0.42)));
        r.peak = Math.max(r.peak, r.read);
        if (r.phase === 14 && !r.pending && (r.read <= prev || Math.abs(solution - r.read) < 0.004)) {
          r.pending = 't2';
          refresh();
          if (S.demo) record(+fix(r.peak));
        }
      }
    }
    const normalDrag = (k, to) => ({ drag: tools[k].pick, to });
    const strokeUp = V(0.012, LID.y - 0.047 + 0.012),
      strokeDown = V(0.012, LID.y - 0.047 - 0.008);
    const shots = [];
    function demoOp(index, begin, end) {
      const [k, , goal] = TASKS[index];
      if (!goal) return () => {};
      const from = () => pose(k).clone();
      const over = () => V(goal.x, Math.max(goal.y + 0.018, 0.117));
      return act.path(tools[k].pick, [from, () => V(from().x, over().y), over, goal], {
        t0: begin,
        t1: end - 0.025,
        release: end,
      });
    }
    for (let i = 0; i < 3; i++) {
      const block = (indexes, cap, dur) =>
        shots.push({
          cap: '第 ' + (i + 1) + ' 次 · ' + cap,
          dur,
          during: act.seq(...indexes.map((op, j) => demoOp(op, (j + 0.05) / indexes.length, (j + 0.94) / indexes.length))),
        });
      block([0], OPEN, 0.8);
      block([1], TASKS[1][1], 1.0);
      shots.push({ cap: '盐酸流入内筒。', dur: 1.15 });
      block([2, 3], '盖好杯盖，测盐酸初温。', 1.8);
      block([4, 5, 6, 7, 8], '冲洗并擦干温度计，测碱液初温，再冲洗、擦干。', 4.0);
      block([9, 10], '移开杯盖，将碱液迅速倒入内筒。', 1.8);
      shots.push({ cap: '碱液流入内筒。', dur: 1.15 });
      block([11, 12], '立即盖好杯盖，插入温度计。', 1.8);
      shots.push({
        cap: '上下移动玻璃搅拌器，观察温度计液柱。',
        dur: 2.8,
        during: act.path(lid.rodPick, [() => V(0.012, LID.y - 0.047), strokeUp, strokeDown, strokeUp], {
          t0: 0.03,
          t1: 0.47,
          release: 0.52,
        }),
      });
      block([15, 16], '记录最高温度，冲洗、擦干温度计。', 2.3);
      shots[shots.length - 1].enter = () => {
        const r = S.rows[i];
        if (r)
          bar.caption(
            '第 ' + (i + 1) + ' 次 · 最高温约 ' + fix(r.t2) + ' ℃，温升约 ' + rowDelta(r).toFixed(2) + ' ℃。冲洗、擦干温度计。',
          );
      };
    }
    let shotNumber;
    shots.forEach((shot, index) => {
      const enter = shot.enter;
      shot.enter = () => {
        shotNumber.textContent = (index + 1) + ' / ' + shots.length + ' ';
        enter?.();
      };
    });
    bar = lessonBar({
      look,
      back,
      group,
      ringOptions: { minOpacity: 0.66, color: 0xf06d36 },
      steps: TITLES.map((title, i) => ({ id: String(i), title, todo: TASKS[GROUPS[i]][1], target })),
      reels: {
        demo: {
          seal: '演示',
          label: '老师演示',
          shots,
          onStart() {
            const film = document.querySelector('.lbar.film.demo');
            shotNumber = film.querySelector('.lb-n');
            film.querySelector('.lb-steps').replaceChildren();
            drag.clearDropzones();
            for (const shot of shots) shot.during?.(0);
            saved = S;
            mw.classList.add('nh-demo');
            W?.ui.el.classList.add('nh-demo');
            S = fresh();
            S.demo = true;
            render();
          },
          onEnd() {
            drag.clearDropzones();
            S = saved;
            saved = null;
            mw.classList.remove('nh-demo');
            W?.ui.el.classList.remove('nh-demo');
            render();
            if (S.closeup) inspectCylinder(S.closeup);
            else if (mic.isOpen) look([0, 0.141, 0], [0, 0.38, 1], 0.3);
          },
        },
      },
    });
    mic = micro({
      tag,
      group,
      look,
      back,
      bar: () => bar,
      scene: heatScene(),
      at: () => V(0, 0.091, 0),
      btnAt: () => V(0, 0.019, 0.037),
      label: '钻进量热计内筒看',
      scale: 0.0095,
      dist: 0.3,
      lookD: [0, 0.38, 1],
      show: () => trial().vol[0] > 0 && !S.held && !S.closeup,
      state: () => ({ mixed: trial().vol[1] > 0, excess: trial().vol[1] * 0.00055 > N }),
      key: () => String(trial().number),
    });
    const mw = Array.from(document.querySelectorAll('.mw')).pop();
    mw.dataset.neutheat = '';
    const pause = h('button', { onclick: () => setPause(!paused) }, '暂停');
    const replay = h(
      'button',
      {
        onclick: () => {
          setPause(false);
          mic.open();
        },
      },
      '从头看',
    );
    const player = h('div', { class: 'nh-player' }, pause, replay);
    mw.querySelector('.mw-hud').append(player);
    function setPause(v) {
      paused = v;
      pause.textContent = v ? '继续' : '暂停';
    }
    const wrapped = wrapPointer(drag, bar);
    const pointer = {
      ...wrapped,
      up(ray, e) {
        cancel = e?.type === 'pointercancel';
        try {
          return wrapped.up(ray, e);
        } finally {
          cancel = false;
        }
      },
    };
    const reset = () => {
      if (bar.playing) bar.stop();
      mic.close();
      setPause(false);
      if (S.closeup) inspectCylinder(null);
      drag.clearDropzones();
      S = fresh();
      render();
      if (W) {
        W.tbl.clear();
        W.entry.hidden = true;
        W.input.value = '';
        W.result.textContent = '';
        W.review.hidden = true;
        W.ui.observePrediction(null);
        W.ui.relock();
      }
      bar.undo('0', '1', '2', '3');
      bar.say(null);
      say(INTRO);
    };
    const qa = [];
    for (let i = 0; i < 3; i++) {
      TASKS.forEach(([k, label, goal], j) => {
        const name = '第' + (i + 1) + '次·' + label;
        if (goal) qa.push({ name, ...normalDrag(k, goal), wait: k === 'acid' || k === 'base' ? 1.6 : 0.46 });
        if (j === 3 || j === 6 || j === 14) qa.push({
          name: '记录第' + (i + 1) + '次' + (j === 14 ? '最高温' : '初温'),
          run() {
            if (trial().pending !== (j === 3 ? 'acid' : j === 6 ? 'base' : 't2')) throw Error('温度计未就位');
            W.input.value = fix(j === 14 ? trial().peak : trial().read);
            W.entry.querySelector('button').click();
          },
        });
        if (j === 13)
          qa.push(
            { name: name + '上提', ...normalDrag(k, strokeUp) },
            { name: name + '下移', ...normalDrag(k, strokeDown), wait: 4 },
          );
      });
    }
    qa.push(
      { name: '钻进去看', run: () => mic.open(), wait: 6, scale: 1 },
      { name: '回到桌上', run: () => mic.close(), wait: 1, scale: 1 },
      {
        name: '核对三次计算',
        run: () => {
          if (S.rows.length !== 3 || !bar.finished || S.rows.some((r) => r.t2 < r.t1 || r.t2 - r.t1 > 3.5))
            throw Error('三次温升记录不完整');
        },
      },
    );
    const style = h(
      'style',
      {},
      `
      [data-neutheat] .answer .src{padding-right:52px;min-height:38px}
      [data-neutheat] .answer .seal-stamp{bottom:10px;right:10px;font-size:16px;width:38px;height:38px;writing-mode:horizontal-tb}
      .nh-lens{pointer-events:none}
      .nh-lens canvas{display:block;width:82px;height:206px;transform:translateX(-52px);border-radius:34px 34px 10px 10px;background:#faf7eb;box-shadow:0 2px 8px #473f3240}
      [data-neutheat] .nh-entry:not([hidden]){display:flex;gap:6px;align-items:center;margin:6px 0}
      [data-neutheat] .nh-entry input{width:68px;padding:4px 6px;font:inherit}
      [data-neutheat] .nh-entry button{font:inherit;cursor:pointer}
      [data-neutheat] .data {font-variant-numeric:tabular-nums;}
      [data-neutheat] .data :is(th,td){padding:5px 2px;text-align:center;}
      [data-neutheat] .big-next:disabled{display:none;}
      .mw[data-neutheat].nh-demo,[data-neutheat].nh-demo .p-body{visibility:hidden}
      [data-neutheat] .nh-result:empty{display:none;}
      [data-neutheat] .nh-result{font-variant-numeric:tabular-nums;}
      [data-neutheat] .verdict.comparison{grid-template-columns:1fr}
      [data-neutheat] .verdict.comparison > span:last-child{white-space:pre-line;font-variant-numeric:tabular-nums}
      [data-neutheat] .nh-player{display:flex;justify-content:center;gap:8px;pointer-events:auto;margin-top:5px}
      [data-neutheat] .nh-player button{font:inherit;color:#384b4a;background:#fbf9ed;border:1px solid #b0b8ae;border-radius:5px;padding:3px 10px;cursor:pointer}
      @media(max-width:760px){.nh-lens canvas{width:72px;height:180px;transform:translate(-53px,-10px)}
      .mw[data-neutheat] :is(.mw-hud,.mw-scale){left:8px!important;width:calc(100% - 16px)!important}
      .mw[data-neutheat] .mw-close{left:auto!important;right:8px;top:42px!important}.mw[data-neutheat] .mw-hud{top:17vh!important}}
    `,
    );
    document.head.append(style);
    render();
    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.38, h: 0.2, d: 0.17 },
      view: { azim: 0, elev: 24, frameMargin: 1.15, lookY: 0.46 },
      mount(ui) {
        ui.el.dataset.neutheat = '';
        const model = h(
          'details',
          { class: 'more' },
          h('summary', {}, '模型、近似和出处'),
          ...MODEL.map((s) => h('p', { class: 'fineprint' }, s)),
        );
        const review = h(
          'details',
          { class: 'more', hidden: true },
          h('summary', {}, '想一想（选做）'),
          h('p', { class: 'fineprint' }, '三次生成的水一样多。比较每次的温差，哪一次有更多热散到了周围？'),
        );
        const result = h('p', { class: 'nh-result' });
        const input = h('input', { type: 'number', step: '0.1', required: true, 'aria-label': '温度读数' });
        const entry = h('form', { class: 'nh-entry', hidden: true, onsubmit(e) {
          e.preventDefault();
          record(input.valueAsNumber);
        } }, input, ' ℃ ', h('button', { type: 'submit' }, '记下读数'));
        W = {
          ...mountXuean(ui, {
            controls: [entry, result, review, model, moreBox([], reset)],
            headers: ['次数', '盐酸', 'NaOH', '平均 t₁', '最高 t₂', '温差'],
            tableTitle: '观察记录 · 温度 / ℃（示意）',
            intro: INTRO,
          }),
          ui, entry, input,
          review,
          result,
        };
        const next = ui.data.nextElementSibling;
        next.classList.add('big-next');
        ui.controls.prepend(next);
        W.next.remove();
        ui.observePrediction(null);
        bar.attach(ui);
      },
      reset,
      update(dt) {
        const k = bar.update(dt),
          d = Math.min(dt, 0.06) * k;
        drag.update(d);
        pour(d);
        for (const [key, r] of Object.entries(S.returns)) {
          r.time += Math.min(dt, 0.06) * Math.min(k, 1);
          const u = clamp(r.time / 0.38, 0, 1);
          putPose(key, r.from.clone().lerp(r.to, u * u * (3 - 2 * u)));
          if (u >= 1) {
            delete S.returns[key];
            delete S.poses[key];
          }
        }
        const rodReturn = trial().rodReturn;
        if (rodReturn) {
          rodReturn.time += Math.min(dt, 0.06) * Math.min(k, 1);
          const u = clamp(rodReturn.time / 0.38, 0, 1);
          trial().strokeY = rodReturn.y * (1 - u * u * (3 - 2 * u));
          if (u >= 1) delete trial().rodReturn;
        }
        render();
        const r = trial(),
          measuringMix = r.dock === 'mix' && inCup();
        if (S.demo || !mic.isOpen) heat(d, measuringMix);
        th.read(r.read);
        const measuring = r.dock === 'acid' && inCup() || r.dock === 'base' && th.immersed(BASE, 0.014, 0.005, 0.077) || measuringMix,
          observed = r.t2 != null;
        offProbe.loc(group, th.body.position.x, th.body.position.y + 0.055, 0)
          .show(r.dock === 'mix' && !measuringMix && !observed && !mic.isOpen && !S.demo);
        lossArrows(r, r.heatTime, near(pose('lid'), LID, 0.004));
        leaveScale.loc(group, S.closeup === 'base' ? BASE : ACID, 0.027 + (50 - r.vol[S.closeup === 'base' ? 1 : 0]) * 0.087 / 60, 0.016)
          .show(!!S.closeup && !S.demo && !mic.isOpen);
        const reading = !S.closeup && measuring && (r.pending || r.dock === 'mix') && !observed && (!S.held || S.held === 'rod') && !mic.isOpen && !S.demo;
        th.plate.visible = !reading;
        lens.loc(th.body, -0.002, 0.028, 0).show(!!reading);
        if (reading) drawThermometer(dial, r.pending === 't2' ? r.peak : r.read, r.pending === 't2');
        if (!mic.isOpen && paused) setPause(false);
        if (!paused && (!S.demo || !mic.isOpen)) mic.update(dt, k);
      },
      dispose() {
        delete W?.ui.el.dataset.neutheat;
        style.remove();
        mic.dispose();
        drag.dispose();
        bar.dispose();
      },
      debug: {
        get S() {
          return S;
        },
        bar,
        qa: qaFlow(drag, qa),
        mic,
        picks: Object.fromEntries(Object.entries(tools).map(([k, t]) => [k, t.pick])),
      },
    };
  },
};
