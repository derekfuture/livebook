// 人教版选择性必修 1，第 5–6 页。量筒已分别量好两份溶液，三次测量各用一份新样品。
import * as THREE from 'three';
import { h } from '../ui/Panel.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { paperSheet, mountXuean, moreBox, wrapPointer, qaFlow, demoActs } from './kit/chemlesson.js';
import { micro } from './kit/microworld.js';
import { groundLabel } from './kit/labels.js';
import { calorimeter, cover, graduate, cleaning, probe, heatLossArrows, heatScene, cupSurface, RIM, V } from './kit/neutheat-parts.js';

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
const POUR = [V(-0.043, 0.092), V(0.043, 0.092)];
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
const OPEN = '提起杯盖和搅拌器，放到量热计左侧的圆印上。';
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
    const cylinders = [graduate(group, '盐酸', 1), graduate(group, 'NaOH', -1)];
    const tools = { lid, thermo: th, acid: cylinders[0], base: cylinders[1], rod: { body: lid.rod, pick: lid.rodPick, ringTarget: lid.grip } };
    const wash = cleaning(group, WASH, DRY);
    const targetRing = new THREE.Mesh(
      new THREE.RingGeometry(0.029, 0.03, 72),
      new THREE.MeshBasicMaterial({ color: 0x797b6d, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
    );
    targetRing.rotation.x = -Math.PI / 2;
    targetRing.position.set(PARK, 0.001, 0);
    group.add(targetRing);
    groundLabel(group, '量热计', { x: 0, z: 0.053, h: 0.009 });
    groundLabel(group, '盐酸', { x: ACID, z: 0.03, h: 0.008 });
    groundLabel(group, 'NaOH 溶液', { x: BASE, z: 0.03, h: 0.008 });
    // 提示环留在器材上，手拿起来后，以细小的落点提示杯盖孔或冲洗处。
    const aim = new THREE.Mesh(
      new THREE.RingGeometry(0.005, 0.0057, 48),
      new THREE.MeshBasicMaterial({
        color: 0x386b64,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        depthTest: false,
      }),
    );
    aim.rotation.x = -Math.PI / 2;
    aim.renderOrder = 15;
    group.add(aim);
    const stream = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0013, 0.0016, 1, 10),
      new THREE.MeshBasicMaterial({ color: 0x9cc2c7, transparent: true, opacity: 0.84 }),
    );
    group.add(stream);
    stream.visible = false;
    const card = tag('', 'cond');
    const offProbe = tag('温度计已离开混合液', 'pill');
    card.px = [-76, -8];
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
    const tilt = (i, p) => {
      const side = i ? 1 : -1;
      const approach = clamp((0.078 - side * p.x) / 0.035, 0, 1);
      return side * 1.67 * approach * clamp((p.y - 0.054) / 0.033, 0, 1);
    };
    function render() {
      const r = trial(),
        goal = task()?.[2];
      aim.visible = !S.demo && !!S.held && task()?.[0] === S.held && !!goal;
      if (aim.visible) {
        if (S.held === 'acid' || S.held === 'base') aim.position.set(0, RIM + 0.002, 0);
        else if (S.held === 'thermo')
          aim.position.set(
            goal.x,
            goal === CLOTH ? 0.006 : goal === CLEAN ? 0.031 : goal === BASE_T ? 0.095 : RIM + 0.006,
            0,
          );
        else aim.position.copy(goal).y += 0.005;
      }
      for (const k of ['acid', 'base', 'lid', 'thermo']) tools[k].body.position.copy(pose(k));
      cylinders.forEach((a, i) => {
        const angle = tilt(i, a.body.position);
        a.body.rotation.z = angle;
        a.liquid(50 - r.vol[i], angle);
        a.body.userData.ringY = a.body.position.y + 0.035;
      });
      lid.rod.position.y = Math.max(0.003 - lid.body.position.y, -0.047) + r.strokeY;
      lid.body.userData.ringY = lid.body.position.y + 0.006;
      const p = th.body.position;
      // 玻璃温度计平放在布上。提起时围绕手实际握住的位置转正。
      const fromTable = clamp((p.y - CLOTH.y) / 0.055, 0, 1);
      th.body.rotation.x = -Math.acos(fromTable);
      th.ringTarget.userData.ringY = p.y + 0.025 * fromTable + 0.001;
      fillCup(r.vol[0] + r.vol[1]);
      wash.visible = r.dock === 'wash' || (S.held === 'thermo' && near(p, CLEAN, 0.012));
      stream.visible = !!S.flow;
      if (S.flow) {
        const i = S.flow.i,
          src = cylinders[i].lip.clone().applyQuaternion(cylinders[i].body.quaternion).add(cylinders[i].body.position);
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
      ...[r.acid, r.base, r.t1, r.t2].map((v) => (v == null ? '—' : fix(v))),
      r.t2 == null ? '—' : fix(rowDelta(r)),
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
        const hint = '第 ' + r.number + ' 次 · ' + task()[1];
        bar.say(hint);
        say(hint);
      }
      if (r.t2 != null)
        W.result.textContent =
          '第 ' +
          r.number +
          ' 次温升约 ' +
          fix(rowDelta(r)) +
          ' ℃。若热量全部留在溶液中，理论温升约 ' +
          (Q / (100 * CP)).toFixed(2) +
          ' ℃，相差约 ' +
          Math.abs(Q / (100 * CP) - rowDelta(r)).toFixed(2) +
          ' ℃。';
      if (S.finished) {
        W.review.hidden = false;
        W.result.textContent = summary(S.rows);
        W.ui.observePrediction('倒完碱液到盖好杯盖：\n' + S.rows.map((row) =>
          `第 ${row.number} 次：${fix(row.openTime)} s，温升 ${fix(rowDelta(row))} ℃`).join('\n'));
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
      const starts = Object.fromEntries(['lid', 'thermo', 'acid', 'base'].map((k) => [k, tools[k].body.position.clone()]));
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
    function receive(i, p) {
      const r = trial(),
        expected = i ? 10 : 1;
      if (r.phase !== expected || r.closed || r.vol[i] >= 50) return;
      const angle = tilt(i, p),
        lip = cylinders[i].lip
          .clone()
          .applyAxisAngle(V(0, 0, 1), angle)
          .add(p);
      if (Math.abs(lip.x) > 0.025 || lip.y < RIM || lip.y > RIM + 0.051) return;
      // 倾角决定能倒出的体积。停止继续倾斜或提前移走，未倒出的液体留在量筒。
      const a = Math.abs(angle);
      const retained = a >= Math.PI / 2 ? 0 : 60 * Math.max(0, 1 - (0.014 * Math.tan(a)) / 0.087);
      const newVol = clamp(50 - retained, 0, 50),
        old = r.vol[i];
      if (newVol <= old) return;
      r.vol[i] = newVol;
      if (i) r.heat += Q * (Math.min(1, (newVol * 0.00055) / N) - Math.min(1, (old * 0.00055) / N));
      S.flow = { i, life: 0.19 };
      if (newVol >= 50) advance();
    }
    const inCup = () => th.immersed(0, 0.0268, cupSurface(0), cupSurface(trial().vol[0] + trial().vol[1]));
    function measureOrClean(p) {
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
      if (!touching) {
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
      if (phase === 3) {
        r.dock = 'acid';
        r.read = r.acid = PAIRS[r.number - 1][0];
      }
      if (phase === 6) {
        r.dock = 'base';
        r.read = r.base = PAIRS[r.number - 1][1];
        r.t1 = (r.base + r.acid) / 2;
      }
      if (phase === 12) {
        r.dock = 'mix';
        r.read = r.t1;
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
    function release(k, cancelled) {
      if (S.held !== k) return;
      S.held = null;
      if (k === 'acid' || k === 'base') S.flow = null;
      const r = trial();
      if (k === 'rod') {
        if (r.phase !== 13 && r.phase !== 14) r.rodReturn = { y: r.strokeY, time: 0 };
        return;
      }
      const p = pose(k).clone();
      if (!cancelled && task()?.[0] === k) {
        if (k === 'lid' && near(p, task()[2], task()[2] === LID ? 0.009 : 0.022)) {
          r.closed = task()[2] === LID;
          advance();
        } else if (k === 'thermo') measureOrClean(p);
      }
      goBack(k, p);
    }
    let cancel = false;
    const items = ['lid', 'acid', 'base', 'thermo', 'rod'].map((k) => ({
      obj: tools[k].pick,
      anchor: tools[k].body,
      plane: 'xy',
      keepOffset: true,
      hint: () => (k === 'base' && trial().dock === 'base' ? '' : NAMES[k]),
      enabled: () => k !== 'base' || trial().dock !== 'base',
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
        const minY = k === 'lid' ? 0.001 : k === 'thermo' ? CLOTH.y : 0.049;
        const q = V(clamp(p.x, -0.17, 0.18), clamp(p.y, minY, 0.165));
        putPose(k, q);
        if (k === 'acid' || k === 'base') receive(k === 'acid' ? 0 : 1, q);
        render();
      },
      onEnd: () => release(k, cancel),
    }));
    const drag = draggable(group, items, { tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const target = () => (!S.held && !mic?.isOpen && task() ? tools[task()[0]].ringTarget || tools[task()[0]].body : null);
    function heat(dt, measuringMix) {
      const r = trial(),
        ml = r.vol[1];
      if (!ml || r.phase > 15) return;
      r.heatTime += dt;
      const open = !near(pose('lid'), LID, 0.004);
      if (r.phase === 11) r.openTime += dt;
      r.heat *= Math.exp(-dt * (open ? 0.021 : 0.0007));
      const c = (50 + ml) * CP,
        solution = (50 * r.acid + ml * r.base) / (50 + ml) + r.heat / c;
      if (measuringMix) {
        const prev = r.read;
        r.read += (solution - r.read) * (1 - Math.exp(-dt * (r.strokes > 0 ? 3.8 : 0.42)));
        r.peak = Math.max(r.peak, r.read);
        if (r.phase === 14 && (r.read <= prev || Math.abs(solution - r.read) < 0.004)) {
          r.t2 = +fix(r.peak);
          S.rows.push({ ...r });
          if (r.number === 3) {
            S.finished = true;
            if (!S.demo) W?.ui.unlock();
          }
          advance();
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
      const from = () => tools[k].body.position.clone();
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
      block([0, 1, 2, 3], '将盐酸倒入内筒，盖好，测盐酸初温。', 3.7);
      block([4, 5, 6, 7, 8], '冲洗并擦干温度计，测碱液初温，再冲洗、擦干。', 4.0);
      block([9, 10, 11, 12], '把碱液迅速倒入，立即盖好，插入温度计。', 3.7);
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
            '第 ' + (i + 1) + ' 次 · 最高温约 ' + fix(r.t2) + ' ℃，温升约 ' + fix(rowDelta(r)) + ' ℃。冲洗、擦干温度计。',
          );
      };
    }
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
            saved = S;
            mw.classList.add('nh-demo');
            W?.ui.el.classList.add('nh-demo');
            S = fresh();
            S.demo = true;
            render();
          },
          onEnd() {
            S = saved;
            saved = null;
            mw.classList.remove('nh-demo');
            W?.ui.el.classList.remove('nh-demo');
            render();
            if (mic.isOpen) look([0, 0.141, 0], [0, 0.38, 1], 0.3);
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
      btnAt: () => V(0, 0.004, 0.079),
      label: '钻进去看',
      scale: 0.0095,
      dist: 0.3,
      lookD: [0, 0.38, 1],
      show: () => trial().vol[0] > 0 && !S.held,
      state: () => ({ mixed: trial().vol[1] > 0 }),
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
      S = fresh();
      render();
      if (W) {
        W.tbl.clear();
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
        if (goal) qa.push({ name, ...normalDrag(k, goal), wait: 0.46 });
        if (j === 13)
          qa.push(
            { name: name + '上提', ...normalDrag(k, strokeUp) },
            { name: name + '下移', ...normalDrag(k, strokeDown), wait: 4 },
          );
        if (j === 14)
          qa.push({
            name: '读取第' + (i + 1) + '次最高温',
            run: () => {
              if (trial().t2 == null) throw Error('未取得本次最高温');
            },
          });
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
      @media(max-width:760px){.mw[data-neutheat] :is(.mw-hud,.mw-scale){left:8px!important;width:calc(100% - 16px)!important}
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
        W = {
          ...mountXuean(ui, {
            controls: [result, review, model, moreBox([], reset)],
            headers: ['次数', '盐酸', 'NaOH', '平均 t₁', '最高 t₂', '温差'],
            tableTitle: '观察记录 · 温度 / ℃（示意）',
            intro: INTRO,
          }),
          ui,
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
        if (S.flow) {
          S.flow.life -= d;
          if (S.flow.life <= 0) S.flow = null;
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
        const name = r.dock === 'base' ? '碱液量筒' : '量热计';
        const cooled = observed && r.dock === 'mix' && r.read < r.t2 - 0.05;
        const tagText = cooled ? '回落' : observed ? '最高温' : r.dock === 'mix' ? '测温中' : '初温';
        lossArrows(r, r.heatTime, near(pose('lid'), LID, 0.004));
        card
          .text(
            '<div class="cc"><div class="cc-t"><span class="cc-name">' +
              name +
              '</span><span class="cc-res">' +
              tagText +
              '</span></div><div class="cc-obs"><b>约 ' +
              fix(observed && !cooled ? r.t2 : r.read) +
              '</b><small> ℃</small></div></div>',
          )
          .loc(group, r.dock === 'base' ? BASE : 0, 0.127, -0.02)
          .show(measuring && !S.demo && !S.held && !mic.isOpen);
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
