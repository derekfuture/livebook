// 探究加速度与力、质量的关系（课本第 88–92 页，参考案例 1，图 4.2-2）。
// 三步：平衡阻力 → 只改拉力 → 只改质量。告诉学生做什么的只有底部步骤栏；面板只放目标、表、图和结论。
// 木板架在两块矮木块上，右端下面一块楔形垫块；槽码挂钩落到台面的软垫上为止，之后小车靠惯性匀速滑到挡块。
// 前排正中是一条放大 4 倍的纸带：点跟着打点一个个长出来，计数点和相邻间隔标在上面。
import * as THREE from 'three';
import { paint, inked } from '../live/ink.js';
import { canvasTex } from './kit/props.js';
import { lessonBar } from './kit/lessonbar.js';
import { buttons, chart, h, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { apparatus, LOW_PIVOT, WEDGE } from './kit/ticker/apparatus.js';
import { PERIOD, TRAVEL } from './kit/ticker/motion.js';
import { qaFlow } from './kit/chemlesson.js';

const G = 9.8,
  T = 5 * PERIOD, // 计数周期：每 5 个点取一个计数点
  MAG = 4; // 放大纸带的倍数
const START = 0.14,
  EDGE = 0.44,
  SPAN = EDGE - LOW_PIVOT; // 两支点相距 0.705 m
// 滚动阻力按与正压力成正比算；垫高 15 mm 时重力沿板的分力恰好与它平衡（示意值）。
const MU = Math.tan(Math.asin(0.015 / SPAN));
const CART = 0.5,
  PLATE = 0.25,
  DISC = 0.01,
  HEAVY = 0.15;
const K = WEDGE.rise / WEDGE.len; // 垫块斜面的坡度
const LIFT_MAX = 30;
// 挂钩高度（台面坐标）：小车在起点时、落到软垫上时。
const HOOK0 = 0.176,
  LAND = 0.065;
const DISC_H = 0.0045,
  HEAVY_H = 0.018,
  PLATE_TOP = -0.058; // 挂钩底托上表面（挂钩坐标）
// 放大纸带的卡片（放在台面前排的斜座上）
const CARD_W = 0.6,
  CARD_H = 0.13,
  TILT = (36 * Math.PI) / 180,
  CARD_FRONT = 0.285;
const PX_PER_M = 5000;
const X0 = -0.27; // 第一个点在卡片上的位置（卡片坐标）
const BAND_Y = CARD_H / 2 - 0.038; // 纸带中线（卡片坐标）
const RACK = new THREE.Vector3(-0.3, 0, 0.21),
  HEAVY_HOME = new THREE.Vector3(-0.37, HEAVY_H / 2, 0.21);
const CARD_X = 0.1;

const fmt = (v, d = 1) => v.toFixed(d);
const fmtA = (a) => (a >= 1 ? a.toFixed(2) : a.toFixed(3));

// 小车沿板的运动：分几段匀变速（槽码落地前、落地后），碰到挡块或速度减到零就停。
function plan(x0, v0, phases) {
  const segs = [];
  let t = 0,
    x = x0,
    v = v0;
  for (const { a, len } of phases) {
    const room = TRAVEL - x,
      limit = Math.min(len, room);
    if (limit <= 1e-9 || (v <= 1e-9 && a <= 1e-9)) break;
    const disc = v * v + 2 * a * limit;
    const stops = disc < 0;
    const dur = stops ? -v / a : Math.abs(a) < 1e-12 ? limit / v : (-v + Math.sqrt(disc)) / a;
    segs.push({ t0: t, x0: x, v0: v, a, dur });
    t += dur;
    x += v * dur + 0.5 * a * dur * dur;
    v += a * dur;
    if (stops || len >= room) break;
  }
  return { segs, end: t };
}
function posAt(p, t) {
  if (!p.segs.length) return null;
  let s = p.segs[0];
  for (const q of p.segs) if (t >= q.t0) s = q;
  const u = Math.min(t - s.t0, s.dur);
  return s.x0 + s.v0 * u + 0.5 * s.a * u * u;
}

export default {
  id: 'newtoncart',
  fig: '图4.2-2',
  title: '探究加速度与力、质量的关系',
  stampText: '探究',
  predict: {
    q: '把木板右端垫高，不挂槽码，向左轻推带着纸带的小车。纸带上的点怎样，说明阻力刚好平衡？',
    options: ['点距越来越小', '相邻计数点的间隔都相等', '点距越来越大'],
    answer: 1,
    hint: '先平衡阻力，再一次只改一样：只改拉力，或只改小车质量。',
  },
  conclusion: {
    crops: [
      { page: 95, rect: [63.78, 434.6, 378.78, 541.63] },
      { page: 96, rect: [216.5, 53.73, 531.52, 149.76] },
    ],
    quote:
      '如果这些点在一条过原点的直线附近，说明加速度a 与拉力F 成正比。如果不是这样，则需进一步分析。……如果检验的结果是过原点的直线，就可以判断加速度 a 与质量 m 是成反比的。',
    why: '把木板右端垫高，调到不挂槽码时小车能拖着纸带匀速运动，阻力就平衡了；挂上槽码后，绳的拉力就是小车受的合力。槽码自己也在向下加速，绳的拉力 F = m₀(g − a) 比槽码的重力 m₀g 小（m₀ 为槽码的质量）；只有槽码的质量比小车小很多时，才能把槽码的重力当作拉力。',
    src: '课本第 88–92 页 · 第四章 第2节 实验：探究加速度与力、质量的关系',
  },
  create(ctx) {
    const rig = apparatus({ low: true });
    const base = rig.group;
    const root = new THREE.Group();
    root.add(base);
    base.position.set(-0.085, 0, -0.08);
    const TOP = rig.top;

    // ---------- 器材：软垫、槽码、放大纸带 ----------
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.004, 28), paint(0x5e6f5a));
    pad.position.set(-0.324, 0.002, 0);
    base.add(pad);
    const textures = [];
    function ringGeo(r, hgt) {
      const pts = [
        new THREE.Vector2(0.0026, -hgt / 2),
        new THREE.Vector2(r, -hgt / 2),
        new THREE.Vector2(r, hgt / 2),
        new THREE.Vector2(0.0026, hgt / 2),
        new THREE.Vector2(0.0026, -hgt / 2),
      ];
      return new THREE.LatheGeometry(pts, 32);
    }
    function stamp(mesh, text, w, hgt, y, z) {
      const tex = canvasTex(256, 96, (g) => {
        g.fillStyle = '#d9b77c';
        g.fillRect(0, 0, 256, 96);
        g.fillStyle = '#2f2a24';
        g.font = 'bold 66px sans-serif';
        g.textAlign = 'center';
        g.fillText(text, 128, 72);
      });
      textures.push(tex);
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(w, hgt), new THREE.MeshBasicMaterial({ map: tex }));
      plate.rotation.x = -Math.PI / 2;
      plate.position.set(0, y + 0.0002, z);
      mesh.add(plate);
    }
    const masses = [];
    for (let i = 0; i < 5; i++) {
      const mesh = new THREE.Mesh(ringGeo(0.016, DISC_H), paint(0xb58d4d));
      inked(mesh, { width: 0.7 });
      stamp(mesh, '10 g', 0.017, 0.0064, DISC_H / 2, 0.0085);
      masses.push({ mesh, mass: DISC, h: DISC_H, label: '10 g 槽码' });
    }
    const heavy = new THREE.Mesh(ringGeo(0.021, HEAVY_H), paint(0xa77b3c));
    inked(heavy, { width: 0.8 });
    stamp(heavy, '150 g', 0.022, 0.008, HEAVY_H / 2, 0.0122);
    masses.push({ mesh: heavy, mass: HEAVY, h: HEAVY_H, label: '150 g 槽码', heavy: true });
    for (const it of masses) {
      base.add(it.mesh);
      // 槽码中间有孔：拾取用一个实心的、看不见的圆柱
      const r = it.heavy ? 0.021 : 0.016;
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(r, r, it.h + 0.002, 16), new THREE.MeshBasicMaterial({ visible: false }));
      pick.userData.pick = true;
      it.mesh.add(pick);
    }

    // 斜座 + 卡片
    const rise = CARD_H * Math.sin(TILT),
      run = CARD_H * Math.cos(TILT);
    const standShape = new THREE.Shape([
      new THREE.Vector2(-CARD_FRONT, 0),
      new THREE.Vector2(-(CARD_FRONT - run), 0),
      new THREE.Vector2(-(CARD_FRONT - run), rise),
    ]);
    const standGeo = new THREE.ExtrudeGeometry(standShape, { depth: CARD_W + 0.02, bevelEnabled: false });
    standGeo.translate(0, 0, -(CARD_W + 0.02) / 2);
    standGeo.rotateY(Math.PI / 2);
    standGeo.translate(CARD_X, 0, 0);
    const stand = new THREE.Mesh(standGeo, paint(0xc7a576));
    inked(stand, { width: 0.8 });
    base.add(stand);
    const cardTex = canvasTex(CARD_W * PX_PER_M, CARD_H * PX_PER_M, () => {});
    const card = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), new THREE.MeshBasicMaterial({ map: cardTex }));
    card.rotation.x = -Math.PI / 2 + TILT;
    const normal = new THREE.Vector3(0, Math.cos(TILT), Math.sin(TILT));
    card.position.set(CARD_X, rise / 2, CARD_FRONT - run / 2).addScaledVector(normal, 0.0008);
    base.add(card);
    const dotMesh = new THREE.InstancedMesh(
      new THREE.CircleGeometry(0.0024, 14),
      new THREE.MeshBasicMaterial({ color: 0x243140 }),
      240,
    );
    dotMesh.count = 0;
    dotMesh.frustumCulled = false;
    dotMesh.position.z = 0.0004;
    card.add(dotMesh);
    const cartPick = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.044, 0.075), new THREE.MeshBasicMaterial({ visible: false }));
    cartPick.position.y = 0.024; // 顶面低于车上砝码的底面，砝码拿得到
    cartPick.userData.pick = true;
    rig.cart.add(cartPick);

    const timerPick = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.07, 0.08), new THREE.MeshBasicMaterial({ visible: false }));
    timerPick.position.y = TOP + 0.03;
    timerPick.userData.pick = true;
    rig.timer.add(timerPick);

    // ---------- 状态 ----------
    let lift = 0,
      wedgeLift = 0, // 垫块当前位置对应的垫高（拖动时连续变化）
      x = 0, // 小车离起点的距离（沿板向左为正）
      tied = false,
      ballast = 0,
      running = false,
      held = false,
      zoomed = false,
      toggled = false,
      result = null, // 上一次平推试滑的结论：'dec' | 'inc' | 'even' | 'short'
      wedgeMoved = false;
    // 打点计时器：点开关接通 / 断开。先接通电源，再释放小车（课本第一章打点计时器的操作顺序）
    let powered = false,
      clock = 0,
      ranPowered = false; // 通着电跑完了一次：提示可以断开
    let runState = null; // 正在跑 / 刚跑完的一次
    let tape = null; // 放大纸带上显示的那一次 { marks, intervals, origin, read, ... }
    const hanger = []; // 挂钩上的槽码（从下往上）
    const rack = masses.slice(0, 5); // 台面上那一摞 10 g 槽码（从下往上）
    let heavyOnHook = false;
    const forceData = new Map(); // 槽码质量 → a（小车 0.50 kg）
    const massData = new Map(); // 小车质量 → a（槽码不变）
    let massLoad = null;
    const returning = []; // 松手没放到位、正在回原处的东西

    const load = () => hanger.reduce((s, it) => s + it.mass, 0);
    const mass = () => CART + ballast * PLATE;
    const hookAt = (pos) => (tied ? Math.max(LAND, HOOK0 - pos) : HOOK0);
    const angle = () => Math.asin(lift / 1000 / SPAN);
    const drift = () => {
      const s = lift / 1000 / SPAN;
      return G * (s - MU * Math.sqrt(1 - s * s));
    };
    const balanced = () => lift === 15;

    function drawRig(t = clock, recording = powered) {
      const hookY = hookAt(x);
      rig.draw({
        angle: angle(),
        ballast,
        load: load(),
        x,
        startOffset: 0,
        marks: runState?.marks || [],
        recording,
        t,
        hookY,
        tied,
        wheel: tied ? HOOK0 - hookY : 0,
      });
      rig.wedge.position.x = EDGE - wedgeLift / 1000 / K;
      placeMasses();
    }
    // 槽码：挂钩上的按顺序叠在底托上；台面上的叠成一摞；正被拖着、正回原处的不动。
    function placeMasses() {
      let y = PLATE_TOP;
      for (const it of hanger) {
        if (it.mesh.parent !== rig.pan) rig.pan.add(it.mesh);
        it.mesh.position.set(0, y + it.h / 2, 0);
        it.mesh.quaternion.identity();
        y += it.h;
      }
      rack.forEach((it, i) => {
        if (it.busy) return;
        if (it.mesh.parent !== base) base.add(it.mesh);
        it.mesh.position.set(RACK.x, DISC_H * (i + 0.5), RACK.z);
        it.mesh.quaternion.identity();
      });
      const hv = masses[5];
      if (!heavyOnHook && !hv.busy) {
        if (hv.mesh.parent !== base) base.add(hv.mesh);
        hv.mesh.position.copy(HEAVY_HOME);
        hv.mesh.quaternion.identity();
      }
    }

    // ---------- 放大纸带 ----------
    const ink = cardTex.canvas.getContext('2d');
    const cx = (u) => (u + CARD_W / 2) * PX_PER_M; // 卡片坐标 → 画布像素
    const cy = (v) => (CARD_H / 2 - v) * PX_PER_M;
    const mmY = (mm) => mm * 5; // 从卡片上沿往下量的毫米 → 像素
    function text(str, x0, y0, size, color = '#2f3a44', align = 'center', weight = '') {
      ink.font = `${weight} ${size * 5}px "PingFang SC", "Songti SC", sans-serif`;
      ink.fillStyle = color;
      ink.textAlign = align;
      ink.fillText(str, x0, y0);
    }
    const tapeX = (m) => X0 + MAG * (m.x - tape.marks[0].x);
    function drawCard() {
      const W = cardTex.canvas.width,
        H = cardTex.canvas.height;
      ink.fillStyle = '#e8d9b8';
      ink.fillRect(0, 0, W, H);
      // 纸带
      ink.fillStyle = 'rgba(90,70,40,.18)';
      ink.fillRect(cx(-CARD_W / 2 + 0.01) + 6, mmY(26) + 8, W - 0.02 * PX_PER_M, mmY(24));
      ink.fillStyle = '#fffaf0';
      ink.fillRect(cx(-CARD_W / 2 + 0.01), mmY(26), W - 0.02 * PX_PER_M, mmY(24));
      text('纸带（放大 4 倍）', W - 0.012 * PX_PER_M, mmY(124), 8, '#7a6c55', 'right');
      if (tape) {
        const cps = tape.points; // 计数点在 marks 里的下标
        cps.forEach((i, k) => {
          const px = cx(tapeX(tape.marks[i]));
          ink.fillStyle = '#286a71';
          ink.fillRect(px - 4, mmY(24), 8, mmY(29));
          text(String(k), px, mmY(21), 15, '#286a71', 'center', 'bold');
        });
        tape.intervals.forEach((v, k) => {
          const a = cx(tapeX(tape.marks[cps[k]])),
            b = cx(tapeX(tape.marks[cps[k + 1]]));
          ink.fillStyle = '#8a7a5e';
          ink.fillRect(a + 8, mmY(55.5), b - a - 16, 5);
          ink.fillRect(a + 8, mmY(53), 5, mmY(5));
          ink.fillRect(b - 13, mmY(53), 5, mmY(5));
          text(fmt(v), (a + b) / 2, mmY(73), 16, '#2f3a44');
          if (tape.read && k > 0) text((v - tape.intervals[k - 1] >= 0 ? '+' : '−') + fmt(Math.abs(v - tape.intervals[k - 1])), a, mmY(90), 11, '#a44730');
        });
        if (tape.intervals.length) text('mm', cx(tapeX(tape.marks[cps.at(-1)])) + 0.01 * PX_PER_M, mmY(73), 10, '#7a6c55', 'left');
        if (tape.read && tape.a != null) {
          const n = tape.intervals.length,
            left = cx(-CARD_W / 2 + 0.014);
          text(`T = 0.1 s　相邻间隔之差 Δx 取平均 = (${fmt(tape.intervals[n - 1])} − ${fmt(tape.intervals[0])}) ÷ ${n - 1} = ${tape.dx.toFixed(2)} mm`, left, mmY(107), 10, '#2f3a44', 'left');
          text(`a = Δx / T² = ${tape.dx.toFixed(2)} mm ÷ (0.1 s)² = ${fmtA(tape.a)} m/s²`, left, mmY(123), 10, '#2f3a44', 'left', 'bold');
        }
      }
      cardTex.needsUpdate = true;
    }
    const marker = new THREE.Object3D();
    function drawDots() {
      if (!tape) {
        dotMesh.count = 0;
        return;
      }
      let n = 0;
      for (const m of tape.marks) {
        const u = tapeX(m);
        if (u > CARD_W / 2 - 0.012 || n >= 240) break;
        marker.position.set(u, BAND_Y, 0);
        marker.updateMatrix();
        dotMesh.setMatrixAt(n++, marker.matrix);
      }
      dotMesh.count = n;
      dotMesh.instanceMatrix.needsUpdate = true;
    }
    // 计数点：从第一个点起每 5 个点取一个。挂槽码时只取槽码落地以前的完整间隔，
    // 并从间隔够 10 mm 的那一段开始（开头的点太密，放大了也挤在一起）；最多 6 段。
    function updateTape() {
      const marks = runState.marks;
      const pulled = runState.pulled;
      const intervals = [],
        points = [];
      for (let k = 0; 5 * (k + 1) < marks.length; k++) {
        const tk = marks[5 * (k + 1)].t;
        if (pulled && tk > runState.tLand + 1e-9) break;
        const v = Math.round((marks[5 * (k + 1)].x - marks[5 * k].x) * 10000) / 10;
        if (pulled && !points.length && v < 10) continue;
        if (!points.length) points.push(5 * k);
        points.push(5 * (k + 1));
        intervals.push(v);
        if (intervals.length >= (pulled ? 6 : 5)) break;
      }
      const changed = !tape || tape.intervals.length !== intervals.length;
      tape = { marks, intervals, points, read: false, pulled, run: runState };
      drawDots();
      if (changed) drawCard();
    }

    // ---------- 一次运动 ----------
    function startRun(v0) {
      const M = mass(),
        m = tied ? load() : 0,
        d = drift();
      const pulled = tied && m > 0 && hookAt(x) > LAND + 1e-6;
      const phases = pulled
        ? [
            { a: (m * G + M * d) / (M + m), len: hookAt(x) - LAND },
            { a: d, len: Infinity },
          ]
        : [{ a: d, len: Infinity }];
      const p = plan(x, v0, phases);
      if (!p.segs.length) return false;
      const tLand = pulled ? p.segs[0].t0 + p.segs[0].dur : Infinity;
      runState = { p, t: 0, marks: [], next: 0, pulled, tLand, M, m, lift, v0, judged: false, recorded: false, powered };
      ranPowered = false;
      running = true;
      result = null;
      tape = null;
      drawDots();
      drawCard();
      refresh();
      return true;
    }
    function step(dt) {
      const r = runState;
      r.t = Math.min(r.p.end, r.t + dt);
      // 没通电：纸带上没有点。中途断电：从那一刻起不再打点。
      if (!powered) r.cut = true;
      while (r.next <= r.t + 1e-9) {
        if (r.powered && !r.cut) r.marks.push({ t: r.next, x: posAt(r.p, r.next) });
        r.next += PERIOD;
      }
      x = posAt(r.p, r.t);
      const before = tape?.intervals.length || 0;
      updateTape();
      if (r.powered && !r.pulled && !r.judged && (tape.intervals.length >= 5 || r.t >= r.p.end)) judge();
      if (tape.intervals.length !== before) refresh();
      if (r.t >= r.p.end) {
        running = false;
        if (!r.powered) result = 'nopower';
        else if (!r.pulled && !r.judged) judge();
        ranPowered = powered;
        refresh();
      }
    }
    // 平推试滑：看相邻计数点的间隔怎样变
    function judge() {
      const r = runState;
      r.judged = true;
      const v = tape.intervals;
      if (v.length < 3) result = 'short';
      else {
        const change = v.at(-1) - v[0];
        result = Math.abs(change) < 0.3 ? 'even' : change < 0 ? 'dec' : 'inc';
      }
      wedgeMoved = false;
      if (result === 'even' && !bar.has('balanced')) {
        bar.done('balanced');
        bar.say(
          '点距均匀：小车匀速了，阻力平衡好了。这样挂上槽码后，槽码的拉力就是小车受的合力。<br><b>只改拉力</b>（小车质量不变）：先把一个 10 g 槽码拖到滑轮下的挂钩上。',
          'force',
        );
      }
    }

    // 读纸带：放大看，标出 Δx，算出 a，记进表里
    function lookCard() {
      const c = card.position.clone().add(base.position);
      zoomed = true;
      bar.near(true);
      ctx.look(c.toArray(), normal.toArray(), CARD_W * 1.75, () => {
        zoomed = false;
        bar.near(false);
        refresh();
      });
      refresh();
    }
    function leave() {
      if (!zoomed) return;
      ctx.back();
      zoomed = false;
      bar.near(false);
      refresh();
    }
    function readTape() {
      if (!tape || running) return;
      const r = tape.run;
      if (r.pulled && tape.intervals.length >= 2 && !tape.read) {
        const v = tape.intervals,
          n = v.length;
        tape.dx = (v[n - 1] - v[0]) / (n - 1);
        tape.a = tape.dx / 1000 / (T * T);
        tape.read = true;
        drawCard();
        record(r, tape.a);
      }
      lookCard();
    }

    // ---------- 交互 ----------
    let grab = null;
    const camLocal = () => base.worldToLocal(ctx.camera.getWorldPosition(new THREE.Vector3()));
    // 从台面上拿到高处：按光标那条视线，和“从原处斜着通到目标”的那张面求交，东西一直在光标下面。
    function carry(p, home, target) {
      const cam = camLocal(),
        d = p.clone().sub(cam);
      const k = (home.z - target.z) / Math.max(0.01, target.y - home.y);
      const tz = (home.z + k * home.y - k * cam.y - cam.z) / (d.z + k * d.y);
      let q = cam.clone().addScaledVector(d, tz);
      if (q.z < target.z) q = cam.clone().addScaledVector(d, (target.z - cam.z) / d.z);
      if (q.z > home.z) q = cam.clone().addScaledVector(d, (home.z - cam.z) / d.z);
      return q;
    }
    const inBase = (obj, v = new THREE.Vector3()) => base.worldToLocal(obj.localToWorld(v));
    const rodPoint = () => inBase(rig.pan, new THREE.Vector3(0, -0.03, 0));
    const cartTop = () => inBase(rig.cart, new THREE.Vector3(0, 0.052 + ballast * 0.009, 0));
    function homeOf(it) {
      if (it.heavy) return HEAVY_HOME.clone();
      return new THREE.Vector3(RACK.x, DISC_H * (rack.length + 0.5), RACK.z);
    }
    function sendBack(obj, to, done) {
      returning.push({ obj, from: obj.position.clone(), to, t: 0, done });
    }
    const loadLocked = () => !bar.has('balanced') || running || zoomed || (bar.has('force') && massLoad != null);
    function massDrag(it) {
      let from = null;
      const onHook = () => hanger.at(-1) === it;
      return {
        obj: it.mesh,
        plane: 'xy',
        offset: RACK.z,
        enabled: () => !loadLocked() && !it.busy && (onHook() || (it.heavy ? !heavyOnHook : rack.at(-1) === it)),
        hint: () => (onHook() ? it.label + '：拖回台面，取下来' : it.label + '：拖到滑轮下的挂钩上'),
        onStart() {
          from = onHook() ? 'hook' : 'rack';
          it.busy = true;
          if (from === 'hook') {
            hanger.pop();
            if (it.heavy) heavyOnHook = false;
          } else if (!it.heavy) rack.pop();
          base.attach(it.mesh);
          it.mesh.quaternion.identity();
          it.target = rodPoint();
          it.home = homeOf(it);
          drawRig();
        },
        onDrag(p) {
          const q = carry(p, it.home, it.target);
          q.y = Math.max(it.home.y, q.y);
          it.mesh.position.copy(q);
          refresh();
        },
        onEnd() {
          const q = it.mesh.position,
            rod = it.target;
          const onRod = Math.abs(q.x - rod.x) < 0.03 && Math.abs(q.z - rod.z) < 0.03 && q.y > rod.y - 0.045 && q.y < rod.y + 0.05;
          it.busy = false;
          if (onRod) {
            hanger.push(it);
            if (it.heavy) heavyOnHook = true;
            drawRig();
            refresh();
            return;
          }
          // 没挂上：很快放回台面
          it.busy = true;
          sendBack(it.mesh, it.home, () => {
            it.busy = false;
            if (!it.heavy) rack.push(it);
            drawRig();
          });
          refresh();
        },
      };
    }
    // 250 g 砝码：只动最上面那块（台面那摞的顶上，或者车上的顶上）
    let weightHeld = null;
    function weightDrag(w, i) {
      return {
        obj: w,
        plane: 'xy',
        offset: 0.21,
        enabled: () => bar.has('force') && !running && !zoomed && !weightHeld && (i === ballast || i === ballast - 1),
        hint: () => (i < ballast ? '250 g 砝码：拖回台面' : '250 g 砝码：拖到小车上'),
        onStart() {
          weightHeld = { w, i, onCart: i < ballast, home: w.userData.home.clone(), target: cartTop() };
          if (weightHeld.onCart) {
            ballast--;
            weightHeld.target = cartTop();
          }
          w.userData.held = true;
          base.attach(w);
          w.quaternion.identity();
          drawRig();
        },
        onDrag(p) {
          const H = weightHeld;
          const q = carry(p, H.home, H.target);
          q.y = Math.max(H.home.y, q.y);
          w.position.copy(q);
          refresh();
        },
        onEnd() {
          const H = weightHeld,
            q = w.position,
            t = H.target;
          const onCart = Math.abs(q.x - t.x) < 0.045 && Math.abs(q.z - t.z) < 0.03 && q.y > t.y - 0.02 && q.y < t.y + 0.05;
          if (onCart) {
            ballast = i + 1;
            w.userData.held = false;
            weightHeld = null;
            drawRig();
            refresh();
            return;
          }
          sendBack(w, H.home, () => {
            w.userData.held = false;
            weightHeld = null;
            drawRig();
            refresh();
          });
          refresh();
        },
      };
    }
    const toTravel = (p) => {
      const local = rig.board.parent.worldToLocal(base.localToWorld(p.clone()));
      return clamp(START - local.x, 0, TRAVEL);
    };
    // 平衡好阻力以后，小车回到起点时把细绳系上（挂钩这时正好挂在起点的高度，不跳）
    function tie() {
      if (!tied && bar.has('balanced') && x < 0.02) {
        x = 0;
        tied = true;
        refresh();
      }
    }
    const cartDrag = {
      obj: cartPick,
      anchor: rig.cart,
      plane: 'xy',
      offset: 0,
      keepOffset: true,
      enabled: () => !running && !zoomed && !weightHeld,
      hint: () =>
        tied && load() > 0
          ? x < 0.01
            ? '点一下或拖动小车：松手它就开始跑'
            : '拖回右端，松手它就开始跑'
          : '按住小车，向左轻推',
      onStart() {
        grab = { x0: x, t0: performance.now(), t1: performance.now(), x1: x };
        held = true;
        drawRig();
      },
      onDrag(p) {
        if (!grab) return;
        const nx = toTravel(p);
        if (Math.abs(nx - grab.x1) > 1e-5) {
          grab.x1 = nx;
          grab.t1 = performance.now();
        }
        x = nx;
        tie();
        drawRig();
      },
      onEnd(moved) {
        const g = grab;
        grab = null;
        held = false;
        if (!g) return;
        if (!moved) {
          drawRig();
          return;
        }
        const stroke = x - g.x0;
        if (tied && load() > 0) startRun(0) || refresh();
        else if (stroke > 0.005) {
          const v = stroke / Math.max(0.05, (g.t1 - g.t0) / 1000);
          startRun(clamp(v, 0.18, 0.22)) || refresh();
        } else {
          drawRig();
          refresh();
        }
      },
      onTap() {
        if (running) return;
        tie();
        if (tied && load() > 0) startRun(0);
        else startRun(0.18);
      },
    };
    const wedgeDrag = {
      obj: rig.wedge,
      plane: 'xy',
      offset: 0.036,
      keepOffset: true,
      enabled: () => !bar.has('balanced') && !running && !zoomed,
      hint: '左右拖垫块：往里推，木板右端垫高；往外拉，放低',
      onStart() {
        wedgeLift = lift;
      },
      onDrag(p) {
        wedgeLift = clamp((EDGE - p.x) * K * 1000, 0, LIFT_MAX);
        lift = wedgeLift;
        rig.wedgeText(Math.round(wedgeLift) + ' mm');
        drawRig();
      },
      onEnd() {
        const snapped = clamp(Math.round(wedgeLift / 5) * 5, 0, LIFT_MAX);
        if (snapped !== lift || wedgeLift !== snapped) wedgeMoved = true;
        lift = wedgeLift = snapped;
        rig.wedgeText(snapped + ' mm');
        drawRig();
        refresh();
      },
    };
    // 现在不能动的东西不给提示（提示文字为空）
    const quiet = (it) => {
      const h0 = it.hint;
      it.hint = () => (it.enabled() ? (typeof h0 === 'function' ? h0() : h0) : '');
      return it;
    };
    const pointer = draggable(
      base,
      [cartDrag, wedgeDrag, ...masses.map(massDrag), ...rig.ballast.map(weightDrag)].map(quiet),
      {
        tip: ctx.tag('', 'pill sticky'),          // 鼠标移上去，旁边一条“名字：怎么做”的提示（不加光晕）；sticky：还在预测页时也显示
        taps: [
          quiet({
            obj: timerPick,
            enabled: () => !zoomed,
            hint: () => (powered ? '点一下：断开打点计时器' : '点一下：接通打点计时器'),
            onTap: () => {
              powered = !powered;
              if (!powered) ranPowered = false;
              drawRig();
              refresh();
            },
          }),
          quiet({
            obj: card,
            enabled: () => !running && !zoomed && !!tape?.marks.length,
            hint: () => (tape?.run.pulled && !tape.read ? '点一下：凑近读纸带，算出加速度' : '点一下：凑近看纸带'),
            onTap: readTape,
          }),
        ],
      },
    );

    // ---------- 步骤栏 ----------
    function nextDisc() {
      return rack.at(-1)?.mesh || null;
    }
    function target() {
      const t = target0();
      return t === rig.cart && !powered ? rig.timer : t;
    }
    function target0() {
      if (running || zoomed || weightHeld) return null;
      const cur = bar.current;
      if (cur === 'balanced') {
        if ((result === 'dec' || result === 'inc') && !wedgeMoved) return rig.wedge;
        return rig.cart;
      }
      if (tape?.run.pulled && !tape.read && tape.intervals.length >= 2) return card;
      if (cur === 'force') {
        if (!load() || forceData.has(load())) return nextDisc() || rig.cart;
        return rig.cart;
      }
      if (cur === 'mass') {
        if (massData.size >= 3) return null;
        if (massData.has(mass())) return rig.ballast[ballast] || null;
        return rig.cart;
      }
      return null;
    }
    const bar = lessonBar({
      look: ctx.look,
      back: leave,
      group: base,
      steps: [
        {
          id: 'balanced',
          title: '平衡阻力',
          todo: '<b>平衡阻力</b>：不挂槽码。先接通打点计时器，再按住小车向左轻推。纸带上相邻计数点的间隔都相等，小车就在匀速运动，阻力平衡好了。',
          target,
        },
        { id: 'force', title: '只改拉力', todo: '<b>只改拉力</b>（小车质量不变）：把一个 10 g 槽码拖到滑轮下的挂钩上。', target },
        { id: 'mass', title: '只改质量', todo: '<b>只改质量</b>（拉力不变）：槽码不动，把一块 250 g 砝码拖到小车上。', target },
      ],
    });
    // 当下这一件事（只在步骤栏里说）
    function refresh() {
      if (!ui) return;
      const cur = bar.current;
      let say = null;
      if (running) say = tape?.run.pulled ? '小车在加速，纸带在打点。' : '看放大纸带：点一个个打出来。';
      else if (cur === 'balanced') {
        if (result === 'nopower') say = x > 0.12 ? '先把小车拖回右端，再向左轻推。' : null;
        else if (result === 'short') say = '点太少：小车离挡块太近。先把小车拖回右端，再向左轻推。';
        else if (result === 'dec')
          say = wedgeMoved
            ? '垫高 ' + lift + ' mm。再向左轻推一次小车，看点距。'
            : '点距越来越近：小车在减速。把垫块往里推，垫高一点，再推一次。';
        else if (result === 'inc')
          say = wedgeMoved
            ? '垫高 ' + lift + ' mm。再向左轻推一次小车，看点距。'
            : '点距越来越远：小车在加速。把垫块往外拉，放低一点，再推一次。';
        else if (x > 0.12) say = '先把小车拖回右端，再向左轻推。';
      } else if (zoomed) {
        say = tape?.read && tape.run.pulled ? recordSay || entrySay[cur] || '已记进表里。' : '看完点“回到全景”。';
      } else if (tape?.run.pulled && !tape.read && tape.intervals.length >= 2) say = '点一下放大纸带，读出间隔，算出加速度。';
      else if (tape?.run.pulled && !tape.read) say = '计数点太少，读不出加速度：把小车拖回右端，松手再跑一次。';
      else if (cur === 'force' || cur === 'mass') {
        const recorded = cur === 'force' ? forceData.has(load()) : massData.has(mass());
        if (!load())
          say = cur === 'mass' ? '把槽码挂回挂钩。' : forceData.size ? '把一个 10 g 槽码拖到滑轮下的挂钩上。' : entrySay.force;
        else if (recorded) say = recordSay || entrySay[cur];
        else if (x > 0.01) say = '把小车拖回右端（靠近打点计时器），松手让它跑。';
        else say = '点一下小车，放手让它跑。';
      }
      if (!running && !zoomed && cur) {
        if (result === 'nopower' && !powered) say = '打点计时器没通电，纸带上没有点：先接通电源，再释放小车。';
        else if (target0() === rig.cart && !powered && (say || cur !== 'balanced')) say = '先接通打点计时器，再释放小车。' + (say ? '<br>' + say : ''); // 刚打开时步骤栏的话里已经说了
        else if (ranPowered && powered) say = '断开打点计时器。' + (say ? '<br>' + say : '');
      }
      if (cur || say) bar.say(say || null, cur || 'end');
    }
    const entrySay = {
      force:
        '点距均匀：小车匀速了，阻力平衡好了。这样挂上槽码后，槽码的拉力就是小车受的合力。<br><b>只改拉力</b>（小车质量不变）：先把一个 10 g 槽码拖到滑轮下的挂钩上。',
      mass: null,
    };
    let recordSay = null;

    // ---------- 记录 ----------
    let ui = null,
      t1,
      t2,
      chartF,
      chartM,
      boxF,
      boxM,
      flip;
    function record(r, a) {
      const lines = [];
      const F = r.m * G,
        heavyRun = r.m / r.M > 0.1;
      if (r.M === CART) {
        forceData.set(r.m, a);
        lines.push('表 1 记下：F = ' + F.toFixed(3) + ' N，a = ' + fmtA(a) + ' m/s²。');
      }
      if (bar.has('force') && r.m === massLoad) {
        massData.set(r.M, a);
        lines.push('表 2 记下：m = ' + r.M.toFixed(2) + ' kg，a = ' + fmtA(a) + ' m/s²。');
      }
      if (heavyRun)
        lines.push(
          '槽码不比小车轻很多：绳的拉力 F = m₀(g − a) ≈ ' +
            (r.m * (G - a)).toFixed(2) +
            ' N，比槽码的重力 ' +
            F.toFixed(2) +
            ' N 小得多，这个点会落在轻槽码连成的直线下方。',
        );
      if (!bar.has('force')) {
        const light = [...forceData.keys()].filter((m) => m <= 0.05 + 1e-9).length;
        if (light >= 3 && !heavyRun) {
          // 第二步做完。表 2 的第一组就是刚才这一组（同一个槽码、小车 0.50 kg）。
          massLoad = r.m;
          massData.set(CART, a);
          bar.done('force');
          recordSay = null;
          entrySay.mass =
            'a–F 图上的点在一条过原点的直线附近：a 与 F 成正比。表 2 先记下刚才这一组（0.50 kg）。<br><b>只改质量</b>（拉力不变）：槽码不动，把一块 250 g 砝码拖到小车上。';
          fill();
          refresh();
          return;
        }
        lines.push(
          heavyRun
            ? '取下大槽码，接着用 10 g 的测。'
            : light === 1
              ? '再挂一个 10 g 槽码，测下一个拉力（至少测三个；也可以试试 150 g 的大槽码）。'
              : '再挂一个 10 g 槽码，测第三个拉力。',
        );
      } else if (!bar.has('mass')) {
        if (massData.size >= 3) {
          if (toggled) {
            fill();
            finishMass();
            return;
          }
          lines.push('a–m 图上的点连成一条弯线，很难看出是不是双曲线。点图下面的“换成 a–1/m 图”。');
        } else if (ballast < 4) lines.push('再往小车上加一块砝码，测下一个质量（至少三种）。');
      }
      recordSay = lines.join('<br>');
      fill();
      refresh();
    }
    function finishMass() {
      if (bar.has('mass')) return;
      recordSay = null;
      bar.done('mass');
      bar.say('a–1/m 图上的点在一条过原点的直线上：a 与 m 成反比。掀开左边的<b>结论</b>看看。', 'end');
    }
    // 两张表、两张图
    let flipK = 0,
      flipTo = 0;
    function fill() {
      t1.clear();
      [...forceData.entries()]
        .sort((p, q) => p[0] - q[0])
        .forEach(([m, a]) => t1.add([String(Math.round(m * 1000)), (m * G).toFixed(3), fmtA(a)], { highlight: false }));
      t2.clear();
      [...massData.entries()]
        .sort((p, q) => p[0] - q[0])
        .forEach(([M, a]) => t2.add([M.toFixed(2), (1 / M).toFixed(2), fmtA(a)], { highlight: false }));
      boxF.hidden = !forceData.size;
      boxM.hidden = !massData.size;
      if (massLoad != null) boxM.querySelector('.cap').textContent = '表 2　小车所受的拉力一定（槽码 ' + Math.round(massLoad * 1000) + ' g）';
      flip.btns[0].disabled = massData.size < 2;
      drawF();
      drawM();
      const el = massData.size && bar.has('force') ? boxM : boxF;
      if (!el.hidden) el.scrollIntoView({ block: 'nearest' });
    }
    function niceMax(v) {
      const p = Math.pow(10, Math.floor(Math.log10(v)));
      for (const k of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (k * p >= v) return k * p;
      return 10 * p;
    }
    function drawF() {
      const pts = [...forceData.entries()].map(([m, a]) => [m * G, a]);
      const xmax = niceMax(Math.max(0.5, ...pts.map((p) => p[0] * 1.1)));
      const ymax = niceMax(Math.max(0.8, ...pts.map((p) => p[1] * 1.15)));
      chartF.x.max = xmax;
      chartF.y.max = ymax;
      const light = pts.filter(([F], i) => [...forceData.keys()][i] <= 0.05 + 1e-9);
      const k = light.length >= 2 ? light.reduce((s, [F, a]) => s + F * a, 0) / light.reduce((s, [F]) => s + F * F, 0) : 0;
      chartF.series[0].points = k ? [[0, 0], [Math.min(xmax, ymax / k), Math.min(xmax, ymax / k) * k]] : [];
      chartF.series[1].points = pts;
      chartF.draw();
    }
    // a–m 与 a–1/m 共用一张图：横轴按比例画，切换时同一批点从 m 的位置滑到 1/m 的位置
    const MMAX = 1.6,
      VMAX = 2.2;
    function drawM() {
      chartM.draw();
    }
    function chartMExtra(g, X, Y) {
      const k = flipK * flipK * (3 - 2 * flipK);
      const pts = [...massData.entries()];
      const u = (M) => (M / MMAX) * (1 - k) + (1 / M / VMAX) * k;
      g.save();
      // 横轴刻度：两套刻度交替淡入淡出
      g.font = '22px PingFang SC, sans-serif';
      g.textAlign = 'center';
      const H = g.canvas.height / 2;
      for (const [vals, max, alpha] of [
        [[0.5, 1, 1.5], MMAX, 1 - k],
        [[0.5, 1, 1.5, 2], VMAX, k],
      ]) {
        g.fillStyle = `rgba(75,82,99,${alpha})`;
        for (const v of vals) g.fillText(String(v), X(v / max), H - 56 + 26);
      }
      g.fillStyle = '#4b5263';
      g.fillText('0', X(0), H - 56 + 26);
      g.font = 'italic 22px "Times New Roman", serif';
      g.textAlign = 'right';
      const W = g.canvas.width / 2;
      g.fillStyle = `rgba(75,82,99,${1 - k})`;
      g.fillText('m / kg', W - 6, H - 8);
      g.fillStyle = `rgba(75,82,99,${k})`;
      g.fillText('1/m / kg⁻¹', W - 6, H - 8);
      // 过这些点的 a = c/m：在 a–m 图上是弯线，换到 a–1/m 就成了过原点的直线
      if (pts.length >= 3) {
        const c = pts.reduce((s, [M, a]) => s + a / M, 0) / pts.reduce((s, [M]) => s + 1 / (M * M), 0);
        g.beginPath();
        g.rect(X(0), Y(chartM.y.max), X(1) - X(0), Y(0) - Y(chartM.y.max));
        g.clip();
        g.strokeStyle = 'rgba(31,111,184,.55)';
        g.lineWidth = 2.5;
        g.setLineDash([10, 8]);
        g.beginPath();
        for (let i = 0; i <= 120; i++) {
          const M = 0.3 * Math.pow(60 / 0.3, i / 120);
          const px = X(u(M)),
            py = Y(c / M);
          i ? g.lineTo(px, py) : g.moveTo(px, py);
        }
        g.stroke();
        g.setLineDash([]);
      }
      g.restore();
      g.fillStyle = '#1f6fb8';
      for (const [M, a] of pts) {
        g.beginPath();
        g.arc(X(u(M)), Y(a), 6, 0, Math.PI * 2);
        g.fill();
      }
    }

    function resetAll(full = true) {
      leave();
      running = held = false;
      grab = null;
      lift = wedgeLift = 0;
      rig.wedgeText('0 mm');
      x = 0;
      tied = false;
      ballast = 0;
      result = null;
      wedgeMoved = false;
      powered = ranPowered = false;
      runState = null;
      tape = null;
      returning.length = 0;
      weightHeld = null;
      for (const w of rig.ballast) w.userData.held = false;
      hanger.length = 0;
      rack.length = 0;
      rack.push(...masses.slice(0, 5));
      for (const it of masses) it.busy = false;
      heavyOnHook = false;
      forceData.clear();
      massData.clear();
      massLoad = null;
      toggled = false;
      flipK = flipTo = 0;
      recordSay = null;
      entrySay.mass = null;
      if (flip) flip.btns[0].textContent = '换成 a–1/m 图';
      bar.undo('balanced', 'force', 'mass');
      bar.say(null);
      if (ui) {
        fill();
        if (full) ui.relock?.();
      }
      drawDots();
      drawCard();
      drawRig();
      refresh();
    }

    rig.wedgeText('0 mm');
    drawCard();
    drawRig();

    let pushTarget = null;
    const cartAt = (tr) => inBase(rig.board.parent, new THREE.Vector3(START - tr, TOP, 0));
    const flowTo = {
      wedge15: () => new THREE.Vector3(EDGE - 0.015 / K, rig.wedge.position.y, 0),
      push: () => (held ? pushTarget : (pushTarget = cartAt(x + 0.07))), // 拖着的时候目标不跟着车走
      back: () => cartAt(0),
      rod: () => rodPoint(),
      cart: () => cartTop(),
    };
    const S = {};
    return {
      group: root,
      size: { w: 0.94, d: 0.44, h: 0.27 },
      view: { elev: 28, azim: -14, frameMargin: 1.06 },
      pointer,
      toggles: ['steps'],
      reset: () => resetAll(false),
      mount(panel) {
        ui = panel;
        // 不要面板上的“还差……”：要做什么只在步骤栏里说
        bar.attach({ ...panel, need: () => {} });
        panel.status('<b>加速度与力、质量之间有什么定量关系？</b><br>控制变量：一次只改一样。');
        t1 = table(['槽码 / g', '拉力 F（≈ 槽码重力）/ N', 'a / (m·s⁻²)']);
        t2 = table(['小车质量 m / kg', '1/m / kg⁻¹', 'a / (m·s⁻²)']);
        chartF = chart({
          x: { label: 'F / N', min: 0, max: 0.5 },
          y: { label: 'a / (m·s⁻²)', min: 0, max: 0.8 },
          series: [
            { points: [], line: true, dash: true, width: 2.5, color: 'rgba(31,111,184,.55)' },
            { points: [], dots: true, line: false, color: '#1f6fb8' },
          ],
        });
        chartM = chart({ x: { label: '', min: 0, max: 1, ticks: [] }, y: { label: 'a / (m·s⁻²)', min: 0, max: 0.5 } });
        chartM.extra = chartMExtra;
        // 侧栏画布底下的像素是写的宽高的 2.5 倍（Panel 的 sharp），kit 的 chart 画的时候又把变换设回 2 倍，
        // 图只占画布左上角 40%。这里让这两张图的 setTransform 按实际像素补上倍数。
        for (const cv of [chartF.canvas, chartM.canvas]) {
          const g = cv.getContext('2d'),
            k = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width').get.call(cv) / cv.width,
            set = g.setTransform.bind(g);
          g.setTransform = (a, b, c, d, e, f) => set(a * k, b * k, c * k, d * k, e * k, f * k);
        }
        const _drawM = chartM.draw;
        chartM.draw = () => {
          const ys = [...massData.values()];
          chartM.y.max = niceMax(Math.max(0.3, ...ys.map((a) => a * 1.15)));
          _drawM();
        };
        flip = buttons([
          {
            text: '换成 a–1/m 图',
            ghost: true,
            onClick: () => {
              flipTo = flipTo ? 0 : 1;
              flip.btns[0].textContent = flipTo ? '换回 a–m 图' : '换成 a–1/m 图';
              if (flipTo) {
                toggled = true;
                if (massData.size >= 3 && bar.has('force')) finishMass();
              }
            },
          },
        ]);
        flip.el.dataset.keep = '1';
        const cap = (t) => h('p', { class: 'cap note' }, t);
        boxF = h('div', { hidden: true }, cap('表 1　小车质量一定（m = 0.50 kg）'), t1.el, chartF.el);
        boxM = h('div', { hidden: true }, cap('表 2　小车所受的拉力一定'), t2.el, chartM.el, flip.el);
        const notes = h(
          'details',
          { class: 'more' },
          h('summary', {}, '模型、近似和出处'),
          h('p', {
            class: 'fineprint',
            html: '小车 0.50 kg，砝码每块 250 g；槽码每个 10 g，另有一个 150 g 的；挂钩质量不计，轻绳、理想滑轮。阻力按与正压力成正比算（示意值：木板右端垫高 15 mm 时恰好平衡，垫块每 5 mm 一档）。槽码落到软垫上以后绳子松了，只取落地以前的计数点。打点计时器每 0.02 s 打一个点，每 5 个点取一个计数点，T = 0.1 s；前排的纸带放大 4 倍画，间隔按 0.1 mm 读，从间隔够 10 mm 的那一段开始取。加速度由相邻间隔之差 Δx = aT² 求（取平均）。拉力 F = m₀(g − a) 比槽码的重力 m₀g 小，槽码的质量比小车小很多时才近似相等（课本第 88 页旁注）。',
          }),
        );
        const redo = buttons([{ text: '全部重来', ghost: true, onClick: () => resetAll(true) }]);
        panel.data.append(boxF, boxM, notes, redo.el);
        fill();
        refresh();
      },
      update(dt) {
        const k = bar.update(dt);
        const d = Math.min(dt, 1 / 30) * k;
        if (powered) clock += d;
        if (running) step(d);
        if (running || powered) drawRig();
        for (let i = returning.length - 1; i >= 0; i--) {
          const r = returning[i];
          r.t = Math.min(1, r.t + dt / 0.35);
          const u = r.t * r.t * (3 - 2 * r.t);
          r.obj.position.lerpVectors(r.from, r.to, u);
          r.obj.position.y += 0.03 * Math.sin(Math.PI * u);
          if (r.t >= 1) {
            returning.splice(i, 1);
            r.done();
          }
        }
        if (flipK !== flipTo) {
          flipK = flipTo > flipK ? Math.min(flipTo, flipK + dt / 0.9) : Math.max(flipTo, flipK - dt / 0.9);
          chartM.draw();
        }
        Object.assign(S, { result, iv: tape?.intervals.join(','), lift, x: +x.toFixed(4), tied, ballast, load: load(), running, zoomed, steps: [bar.has('balanced'), bar.has('force'), bar.has('mass')] });
      },
      dispose() {
        pointer.dispose();
        bar.dispose();
        rig.dispose();
        cardTex.dispose();
        for (const t of textures) t.dispose();
      },
      debug: {
        bar,
        S,
        // 截图脚本用：按真实的拖放处理函数做一步
        act(kind, i) {
          const items = pointer.items();
          const go = (obj, to) => {
            const d = items.find((q) => q.obj === obj);
            d.onStart(to.clone());
            d.onDrag(to.clone(), to.clone());
            d.onEnd(true);
          };
          if (kind === 'hang') go(masses[i].mesh, flowTo.rod());
          if (kind === 'unhang') go(masses[i].mesh, masses[i].heavy ? HEAVY_HOME.clone().setY(0.05) : new THREE.Vector3(RACK.x, 0.05, RACK.z));
          if (kind === 'back') go(cartPick, flowTo.back());
          if (kind === 'lift') {
            wedgeLift = lift = i;
            rig.wedgeText(i + ' mm');
            drawRig();
          }
          if (kind === 'push') go(cartPick, flowTo.push());
          if (kind === 'read') readTape();
          if (kind === 'leave') leave();
          if (kind === 'flip') flip.btns[0].click();
          if (kind === 'weight') go(rig.ballast[ballast], flowTo.cart());
          if (kind === 'power') items.find((q) => q.obj === timerPick).onTap();
        },
        get state() {
          return { lift, x, tied, ballast, load: load(), result, tape, forceData, massData };
        },
        qa: qaFlow(pointer, [
          { name: '没通电就推小车', drag: cartPick, to: flowTo.push, wait: 3 },
          { name: '核对：没通电没有点', run: () => { if (result !== 'nopower' || runState.marks.length) throw new Error('没通电也打了点'); } },
          { name: '拖回小车（没通电那次）', drag: cartPick, to: flowTo.back },
          { name: '接通打点计时器', tap: timerPick },
          { name: '向左轻推小车（木板还是平的）', drag: cartPick, to: flowTo.push, wait: 3 },
          { name: '垫块推进去，垫高 15 mm', drag: rig.wedge, to: flowTo.wedge15 },
          { name: '拖回小车', drag: cartPick, to: flowTo.back },
          { name: '再推一次', drag: cartPick, to: flowTo.push, wait: 4 },
          { name: '挂一个 10 g 槽码', drag: masses[4].mesh, to: flowTo.rod },
          { name: '拖回小车并松手', drag: cartPick, to: flowTo.back, wait: 4 },
          { name: '点纸带读数', tap: card },
          { name: '回到全景', run: leave },
          { name: '断开打点计时器', tap: timerPick },
          { name: '再接通打点计时器', tap: timerPick },
          { name: '再挂一个槽码', drag: masses[3].mesh, to: flowTo.rod },
          { name: '拖回小车（20 g）', drag: cartPick, to: flowTo.back, wait: 4 },
          { name: '读纸带（20 g）', tap: card },
          { name: '回到全景 2', run: leave },
          { name: '第三个槽码', drag: masses[2].mesh, to: flowTo.rod },
          { name: '拖回小车（30 g）', drag: cartPick, to: flowTo.back, wait: 4 },
          { name: '读纸带（30 g）', tap: card },
          { name: '回到全景 3', run: leave },
          { name: '加一块砝码', drag: rig.ballast[0], to: flowTo.cart },
          { name: '拖回小车（0.75 kg）', drag: cartPick, to: flowTo.back, wait: 5 },
          { name: '读纸带（0.75 kg）', tap: card },
          { name: '回到全景 4', run: leave },
          { name: '再加一块砝码', drag: rig.ballast[1], to: flowTo.cart },
          { name: '拖回小车（1.00 kg）', drag: cartPick, to: flowTo.back, wait: 5 },
          { name: '读纸带（1.00 kg）', tap: card },
          { name: '回到全景 5', run: leave },
          { name: '第三块砝码', drag: rig.ballast[2], to: flowTo.cart },
          { name: '拖回小车（1.25 kg）', drag: cartPick, to: flowTo.back, wait: 5 },
          { name: '读纸带（1.25 kg）', tap: card },
          { name: '回到全景 6', run: leave },
          { name: '换成 a–1/m 图', run: () => flip.btns[0].click(), wait: 2 },
        ]),
      },
    };
  },
};
