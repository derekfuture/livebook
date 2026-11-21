// 人教版选择性必修 1，第 5–6 页。量筒已分别量好两份溶液，三次测量各用一份新样品。
import * as THREE from 'three';
import { h } from '../ui/Panel.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { paperSheet, mountXuean, moreBox, wrapPointer, qaFlow, demoActs } from './kit/chemlesson.js';
import { micro } from './kit/microworld.js';
import { faceLabel } from './kit/labels.js';
import { calorimeter, cover, graduate, cleaning, probe, heatLossArrows, heatScene, drawThermometer, cylinderHandle, cupSurface, RIM, WASTE, V } from './kit/neutheat-parts.js';

const ACID = -0.133,
  PARK = -0.077,
  BASE = 0.064,
  WASH = 0.11,
  DRY = 0.159;
const LID = V(0, RIM),
  OFF = V(PARK, 0.055),
  CLEAN = V(WASH, 0.081),
  CLOTH = V(DRY, 0.007),
  RACK = V(0.134, 0.012);
const CUP_T = V(-0.009, 0.078),
  BASE_T = V(BASE, 0.088);
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
const RINSE = '按住温度计，把下端移到右侧水流下冲洗。';
const WIPE = '在干布上擦干温度计。';
const OPEN = '提起杯盖和搅拌器，放到量热计左侧的盖架上。';
const CLOSE = '把杯盖放回量热计口，盖严。';
const TASKS = [
  ['lid', OPEN, OFF],
  ['acid', '按住盐酸量筒，将筒口移到内筒口上方，倒空后松手。', POUR[0]],
  ['lid', CLOSE, LID],
  ['thermo', '把温度计下端从杯盖左孔插入盐酸，读取初温。', CUP_T],
  ['thermo', RINSE, CLEAN],
  ['thermo', WIPE, CLOTH],
  ['thermo', '按住温度计，把下端浸入右侧量筒的 NaOH 溶液，读出初温后松手。', BASE_T],
  ['thermo', RINSE, CLEAN],
  ['thermo', WIPE, CLOTH],
  ['lid', OPEN, OFF],
  ['base', '按住 NaOH 量筒，将碱液迅速倒入内筒，倒空后松手。', POUR[1]],
  ['lid', '立即把杯盖放回量热计口。', LID],
  ['thermo', '把温度计下端从杯盖左孔插入混合液。', CUP_T],
  ['rod', '拖住杯盖右边的玻璃搅拌器，匀速上下往返。'],
  ['thermo', '观察温度计，记下液柱达到的最高温度。'],
  ['thermo', RINSE, CLEAN],
  ['thermo', WIPE, CLOTH],
];
const TITLES = ['测盐酸初温', '测碱液初温', '混合并盖好', '搅拌测最高温'];
const GROUPS = [0, 6, 9, 12];
const INTRO = '台上有三组样品，每组各有 50 mL 盐酸和 50 mL NaOH 溶液，浓度分别为 0.50 mol/L 和 0.55 mol/L。';
const CHANGE = '把内筒中的溶液倒入废液槽，收好用过的量筒，取下一组样品。';
// 后排是待用样品。每轮结束后，将用过的一对量筒移到前排。
const RESERVES = [[V(-0.19, 0.049, -0.076), V(0.10, 0.049, -0.078)],
  [V(-0.109, 0.049, -0.084), V(0.165, 0.049, -0.078)]];
const USED = [[V(-0.18, 0.049, 0.068), V(0.028, 0.049, 0.079)],
  [V(-0.106, 0.049, 0.068), V(0.083, 0.049, 0.079)]];
const CHANGE_TIME = 4;
function progress(t, start, end) {
  const u = clamp((t - start) / (end - start), 0, 1);
  return u * u * (3 - 2 * u);
}
function carry(from, to, u, lift) {
  const p = from.clone().lerp(to, u);
  p.y += lift * Math.sin(Math.PI * u);
  return p;
}
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
  change: null,
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
    const cup = calorimeter(group),
      lid = cover(group, OFF),
      th = probe(group);
    const samples = PAIRS.map(() => [graduate(group, '量筒 · 盐酸', 1), graduate(group, '量筒 · NaOH 溶液', -1)]);
    const cylinders = [cylinderHandle(group), cylinderHandle(group)];
    const tools = { lid, thermo: th, acid: cylinders[0], base: cylinders[1], rod: { body: lid.rod, pick: lid.rodPick, ringTarget: lid.grip } };
    const wash = cleaning(group, WASH, DRY, RACK);
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
      if (k === 'thermo') return trial().dock === 'rack' ? RACK : trial().dock === 'cloth' ? CLOTH : CUP_T;
      return HOME[k];
    };
    const pose = (k) => S.poses[k] || resting(k);
    const putPose = (k, p) => {
      S.poses[k] = p.clone();
    };
    const tilt = (i, grip) => {
      const side = i ? 1 : -1;
      const k = i ? 'base' : 'acid';
      if (S.returns[k]) return S.returns[k].angle * (1 - progress(S.returns[k].time, 0, 0.22));
      if (trial().closed || S.held !== k || (trial().vol[i] < 50 && S.flow?.i !== i)) return 0;
      // 仅在倒液握持点附近倾斜，越过杯口或举得过高都会扶正。
      return side * POUR_ANGLE * clamp(1 - grip.distanceTo(POUR[i]) / 0.024, 0, 1);
    };
    const workingMouth = (i) => {
      const a = cylinders[i];
      return samples[trial().number - 1][i].mouth.position.clone().applyQuaternion(a.body.quaternion).add(a.body.position);
    };
    function render() {
      const r = trial();
      const n = r.number - 1, change = S.change, t = change?.time || 0;
      const total = r.vol[0] + r.vol[1];
      let remaining = total, tip = 0;
      lid.body.position.copy(pose('lid'));
      cup.insert.position.set(0, 0, 0);
      if (change) {
        const open = progress(t, 0, 0.72), close = progress(t, 3.24, CHANGE_TIME);
        lid.body.position.copy(carry(LID, OFF, open - close, 0.079));
        const lift = progress(t, 0.49, 1.04) - progress(t, 2.99, 3.51);
        const over = progress(t, 1.03, 1.58) - progress(t, 2.53, 3.0);
        tip = Math.PI / 2 * (progress(t, 1.58, 2.31) - progress(t, 2.31, 2.53));
        const lip = V(-0.028, RIM - 0.001);
        const pivot = lip.clone().add(V(0, 0.074 * lift)).lerp(WASTE, over);
        cup.insert.position.copy(pivot).sub(lip.applyAxisAngle(V(0, 0, 1), tip));
        // 在倾倒方向上用圆截面的窄条积分，只保留低于出液口的体积。
        if (t >= 2.31) remaining = 0;
        else if (tip > 0) {
          let depth = 0, weight = 0;
          for (let j = 0; j < 32; j++) {
            const x = (j + 0.5) / 16 - 1, w = Math.sqrt(1 - x * x);
            depth += w * Math.max(0, RIM - 0.001 - cupSurface(0) - (1 + x) * 0.0268 * Math.tan(tip));
            weight += w;
          }
          remaining = Math.min(total, depth / weight / 0.00043);
        }
      }
      cup.insert.rotation.z = tip;
      cup.show(remaining, tip, remaining > 0 && remaining < total);
      cylinders.forEach((handle, i) => {
        const k = i ? 'base' : 'acid';
        handle.body.position.copy(pose(k));
        handle.body.rotation.z = tilt(i, pose(k));
        handle.body.userData.ringY = handle.body.position.y + 0.035;
        for (let j = 0; j < samples.length; j++) {
          const a = samples[j][i];
          const active = j === n;
          const parent = active && !change ? handle.body : group;
          if (a.body.parent !== parent) parent.add(a.body);
          let ml = active ? 50 - r.vol[i] : j < n ? 0 : 50;
          if (parent === handle.body) a.body.position.set(0, 0, 0);
          else if (change?.retry && active) {
            // 污染的样品送回台外，重新取同一轮的备用样品。
            const offstage = V(i ? 0.55 : -0.55, 0.049, -0.10);
            const out = progress(t, 0.72, 1.92), back = progress(t, 2.02, 3.45);
            a.body.position.copy(carry(HOME[k], offstage, out - back, 0.038));
            if (t >= 1.97) ml = 50;
          } else if (change && active) {
            a.body.position.copy(carry(HOME[k], USED[n][i], progress(t, 0.72, 1.82), 0.027));
          } else if (change && !change.retry && j === n + 1) {
            a.body.position.copy(carry(RESERVES[j - 1][i], HOME[k], progress(t, 2.45, 3.68), 0.027));
          } else a.body.position.copy(j < n ? USED[j][i] : RESERVES[j - 1][i]);
          a.liquid(ml, parent === handle.body ? handle.body.rotation.z : 0);
        }
      });
      contents.forEach((plate, i) => { plate.visible = i === (!remaining || change && t > 1.03 ? 0 : r.vol[1] ? 2 : 1); });
      lid.rod.position.y = Math.max(0.003 - lid.body.position.y, -0.047) + r.strokeY;
      lid.ringTarget.userData.ringY = lid.body.position.y + 0.006;
      let p = pose('thermo');
      if (change?.retry && t >= 0.52) {
        const washIn = progress(t, 0.52, 1.27), dry = progress(t, 1.85, 2.65);
        p = dry > 0 ? carry(CLEAN, CLOTH, dry, 0.026) : carry(RACK, CLEAN, washIn, 0.026);
      }
      const restY = near(p, RACK, 0.016) ? RACK.y : CLOTH.y;
      const upright = clamp((p.y - restY) / 0.055, 0, 1);
      th.body.rotation.x = -Math.acos(upright);
      th.plate.rotation.x = -th.body.rotation.x;
      th.body.position.copy(p);
      th.ringTarget.userData.ringY = th.body.position.y + 0.025 * upright + 0.001;
      wash.visible = (S.held === 'thermo' || !!change?.retry) && near(p, CLEAN, 0.010);
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
          : r.pending === 'base' ? '填入刚才读到的碱液初温。要重读，可从湿用托架上取下温度计，再浸入碱液。'
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
      const path = new THREE.CurvePath();
      const points = [from];
      if (k === 'thermo' && end === RACK && (inBase() || from.y > CLEAN.y)) {
        points.push(V(from.x, 0.155), V(RACK.x, 0.155));
      }
      points.push(end);
      for (let i = 1; i < points.length; i++) path.add(new THREE.LineCurve3(points[i - 1].clone(), points[i]));
      S.returns[k] = { path, time: 0, angle: tools[k].body.rotation.z };
      putPose(k, from);
    };
    function newTrial(spoiled = '') {
      S.held = null;
      S.flow = null;
      S.change = { time: 0, retry: !!spoiled };
      trial().phase = TASKS.length;
      if (spoiled) {
        trial().dock = 'rack';
      }
      if (!S.demo) {
        const message = spoiled ? spoiled + '本次换用新样品，保留此前各次的完整记录。' : CHANGE;
        bar.say(message);
        say(message);
      }
    }
    function finishChange() {
      const n = trial().number - (S.change.retry ? 1 : 0);
      S.change = null;
      S.trial = freshTrial(n);
      S.poses = {};
      S.returns = {};
      if (!S.demo) {
        bar.undo('0', '1', '2', '3');
        refresh();
      }
    }
    function pour(dt) {
      const f = S.flow;
      if (!f) return;
      const r = trial(), i = f.i, mouth = workingMouth(i);
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
    const inBase = () => th.immersed(BASE, 0.014, 0.005, 0.077);
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
          : goal === BASE_T ? inBase() : Math.abs(p.x - goal.x) < 0.005 && inCup();
      if (!landed || !touching) {
        const intoBase = (phase === 4 || phase === 5) && near(p, BASE_T, 0.009);
        const intoAcid = (phase === 7 || phase === 8) && near(p, CUP_T, 0.008);
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
        r.pending = phase === 3 ? 'acid' : 'base';
        r.dock = phase === 3 ? 'acid' : 'rack';
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
      if (rinse || wipe) r.dock = 'cloth';
      if (wipe) r.read = ROOM;
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
        S.flow = null;
        stream.visible = false;
      }
      const r = trial();
      if (k === 'rod') {
        r.rodReturn = { y: r.strokeY, time: 0 };
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
      hint: () => k === 'lid' && trial().dock !== 'cloth' ? ''
        : k === 'acid' || k === 'base' ? NAMES[k] + ' · 轻点看刻度' : NAMES[k],
      onTap: k === 'acid' || k === 'base' ? () => inspectCylinder(S.closeup === k ? null : k) : undefined,
      enabled: () => !S.change && (k !== 'lid' || trial().dock === 'cloth'),
      onDrag(p) {
        if (!p || S.change || (S.finished && trial().phase > 16)) return;
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
          const y = clamp(p.y - (LID.y - 0.047), 0, 0.021);
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
        if (k === 'lid') {
          const clearance = Math.min(Math.abs(q.x), Math.abs(q.x - PARK));
          q.y = Math.max(q.y, THREE.MathUtils.lerp(q.x < PARK / 2 ? OFF.y : LID.y,
            RIM + 0.050, progress(clearance, 0, 0.025)));
        }
        putPose(k, q);
        if ((k === 'acid' || k === 'base') && task()?.[0] === k && !S.flow)
          S.flow = { i: k === 'base' ? 1 : 0, running: false };
        render();
        // 球泡一旦沾到碱液，即使中途取消拖动，也只能暂放湿用托架。
        if (k === 'thermo' && trial().phase === 6 && inBase()) trial().dock = 'rack';
        if (k === 'thermo' && task()?.[2] === CLEAN && near(q, CLEAN, 0.003)) measureOrClean(q, true);
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
    const strokeUp = V(0.012, LID.y - 0.047 + 0.021),
      strokeDown = V(0.012, LID.y - 0.047);
    const shots = [];
    function demoOp(index, begin, end, arrive = end - 0.025) {
      const [k, , goal] = TASKS[index];
      if (!goal) return () => {};
      const from = () => pose(k).clone();
      const over = () => V(goal.x, Math.max(goal.y + 0.018, k === 'thermo' ? 0.155 : 0.117));
      const wiping = goal === CLOTH;
      const path = wiping ? [from, () => V(CLOTH.x, CLEAN.y), goal] : [from, () => V(from().x, over().y), over, goal];
      return act.path(tools[k].pick, path, {
        t0: begin,
        t1: arrive,
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
      shots.push({ cap: TASKS[1][1], dur: 2.05, during: demoOp(1, 0.03, 0.97, 0.43) });
      block([2, 3], '盖好杯盖，测盐酸初温。', 1.65);
      block([4, 5, 6, 7, 8], '冲洗并擦干温度计，测碱液初温，再冲洗、擦干。', 4.0);
      shots.push({ cap: TASKS[10][1], dur: 2.55,
        during: act.seq(demoOp(9, 0.02, 0.30), demoOp(10, 0.33, 0.98, 0.53)) });
      block([11, 12], '立即盖好杯盖，插入温度计。', 1.65);
      shots.push({
        cap: '上下移动玻璃搅拌器，观察温度计液柱。',
        dur: 2.8,
        during: act.path(lid.rodPick, [() => V(0.012, LID.y - 0.047), strokeUp, strokeDown, strokeUp], {
          t0: 0.03,
          t1: 0.47,
          release: 0.52,
        }),
      });
      block([15, 16], '记录最高温度，冲洗、擦干温度计。', 1.65);
      shots[shots.length - 1].enter = () => {
        const r = S.rows[i];
        if (r)
          bar.caption(
            '第 ' + (i + 1) + ' 次 · 最高温约 ' + fix(r.t2) + ' ℃，温升约 ' + rowDelta(r).toFixed(2) + ' ℃。冲洗、擦干温度计。',
          );
      };
      if (i < 2) shots.push({ cap: CHANGE, dur: CHANGE_TIME + 0.12 });
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
      show: () => !S.change && trial().vol[0] > 0 && !S.held && !S.closeup,
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
        if (goal) qa.push({ name, ...normalDrag(k, goal), wait: j === 16 && i < 2 ? CHANGE_TIME + 0.5 : 0.46 });
        if (k === 'acid' || k === 'base') {
          // 真鼠标步骤会在 80 ms 后松手。再用同一套拖动处理续倒，并检查握持期间才有液流。
          const pick = tools[k].pick;
          const item = () => drag.items().find((d) => d.obj === pick);
          qa.push({ name: '继续按住量筒', wait: 1.3, run() {
            if (S.flow || S.held) throw Error('松手后量筒仍在倾倒');
            if (trial().phase === j) {
              item().onStart(pose(k));
              item().onDrag(goal, pose(k));
            }
          } }, { name: '倒空后松手', run() {
            if (S.held === k) item().onEnd(true);
            if (trial().phase !== j + 1 || trial().vol[k === 'acid' ? 0 : 1] !== 50) throw Error('未倒空量筒');
          } });
        }
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
            { name: '搅拌器回落至限位环', wait: 4, run() {
              if (trial().strokeY > 0.0001 || trial().phase !== 14) throw Error('搅拌器未回到支撑位');
            } },
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
        if (S.change) {
          S.change.time += d;
          if (S.change.time >= CHANGE_TIME) finishChange();
        }
        for (const [key, r] of Object.entries(S.returns)) {
          r.time += Math.min(dt, 0.06) * Math.min(k, 1);
          const u = clamp(r.time / 0.38, 0, 1);
          putPose(key, r.path.getPoint(u * u * (3 - 2 * u)));
          if (u >= 1) {
            delete S.returns[key];
            delete S.poses[key];
          }
        }
        const rodReturn = trial().rodReturn;
        if (rodReturn) {
          rodReturn.time += Math.min(dt, 0.06) * Math.min(k, 1);
          const u = clamp(rodReturn.time / 0.38, 0, 1);
          const r = trial(), y = rodReturn.y * (1 - u * u * (3 - 2 * u));
          if (r.phase === 13) {
            r.strokes += Math.abs(r.strokeY - y);
            if (r.strokes >= 0.025) advance();
          }
          r.strokeY = y;
          if (u >= 1) delete trial().rodReturn;
        }
        render();
        const r = trial(),
          measuringMix = r.dock === 'mix' && inCup();
        if (S.demo || !mic.isOpen) heat(d, measuringMix);
        const holdingBase = S.held === 'thermo' && r.phase === 6 && inBase();
        const temperature = holdingBase ? PAIRS[r.number - 1][1] : r.read;
        th.read(temperature);
        const measuring = r.dock === 'acid' && inCup() || measuringMix,
          observed = r.t2 != null;
        offProbe.loc(group, th.body.position.x, th.body.position.y + 0.055, 0)
          .show(r.dock === 'mix' && !measuringMix && !observed && !mic.isOpen && !S.demo);
        lossArrows(r, r.heatTime, near(pose('lid'), LID, 0.004));
        leaveScale.loc(group, S.closeup === 'base' ? BASE : ACID, 0.027 + (50 - r.vol[S.closeup === 'base' ? 1 : 0]) * 0.087 / 60, 0.016)
          .show(!!S.closeup && !S.demo && !mic.isOpen);
        const reading = !S.closeup && !observed && !mic.isOpen && !S.demo &&
          (holdingBase || measuring && (r.pending || measuringMix) && S.held !== 'thermo');
        th.plate.visible = !reading;
        lens.loc(th.body, -0.002, 0.028, 0).show(!!reading);
        if (reading) drawThermometer(dial, r.pending === 't2' ? r.peak : temperature, r.pending === 't2');
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
