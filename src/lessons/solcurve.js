// 课题2 溶解度 · 探究：溶解度曲线（课本下册第 40–41 页表 9-1、图 9-11）。
//
// 课本是“根据表 9-1 的数据画曲线”。这里让数据自己“测”出来：100 g 水放在电热板上，调到某个温度，往里加硝酸钾，
// 加到杯底有剩、再也溶不了——这时溶进去的克数就是这个温度下的溶解度。点一下坐标纸，把这个点描上去；测满 4 个温度，连成曲线，
// 和课本图 9-11 对照；在曲线上查 25 ℃ 的溶解度。降温时，溶不下的硝酸钾析出晶体。也可以换成氯化钠（曲线几乎是平的）。
// 操作照实（和实验 9-5、9-6 那张活页一样）：硝酸钾是事先称好的，每张称量纸上一份 20 g（氯化钠每份 10 g）；点一下称量纸，
//   拿起来在烧杯口上方倒进去。每加一份都用玻璃棒搅拌（点一下烧杯或玻璃棒）——不搅拌溶得很慢。
// 数据：课本表 9-1（0–100 ℃ 每 10 ℃ 一个），中间的温度线性插值。升温约 4 ℃/s，加入的固体搅拌后几秒溶完。
import * as THREE from 'three';
import { buttons, seg, table } from './kit/ui.js';
import { clamp } from './kit/interact.js';
import { draggable } from './kit/interact.js';
import { textPlate, thermometer, canvasTex } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { chemBeaker, CHEM } from './kit/chem.js';
import { glass2 } from './kit/chemfx.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

// 课本表 9-1：0, 10, … 100 ℃
const DATA = {
  KNO3: { name: 'KNO₃', cn: '硝酸钾', v: [13.3, 20.9, 31.6, 45.8, 63.9, 85.5, 110, 138, 169, 202, 246], color: '#d6297a', add: 20, n: 9 },      // 每份 20 g，9 份（180 g，80 ℃ 时也有剩）
  NaCl: { name: 'NaCl', cn: '氯化钠', v: [35.7, 35.8, 36.0, 36.3, 36.6, 37.0, 37.3, 37.8, 38.4, 39.0, 39.8], color: '#d23a2a', add: 10, n: 4 },   // 每份 10 g，4 份
};
const sol = (key, T) => { const v = DATA[key].v, x = clamp(T, 0, 100) / 10, i = Math.min(9, Math.floor(x)); return v[i] + (v[i + 1] - v[i]) * (x - i); };
const ROOM = 20, BK = new THREE.Vector3(-0.03, 0.012, 0), BR = 0.036, BH = 0.1;
const BOARD = new THREE.Vector3(0.1, 0, -0.01), BW = 0.12, BHt = 0.13;          // 坐标纸（立着）
// 称量纸（事先称好的一份份药品）：电热板左边 3 × 3 摆开，离烧杯近的先用
const PAPERS = [0, 1, 2].flatMap((c) => [0.026, 0, -0.026].map((z) => new THREE.Vector3(-0.1 - c * 0.026, 0, z + 0.012)));
const GX0 = 0.13, GX1 = 0.95, GY0 = 0.92, GY1 = 0.06;                           // 坐标纸上画图区（纹理坐标 0..1）
const YMAX = 180;
const STIR_T = 2.4, ROD_L = 0.16;                                               // 点一下搅拌多久（秒）；玻璃棒长
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

export default {
  id: 'solcurve',
  fig: '图9-11',
  title: '溶解度曲线',
  stampText: '探究',
  style: 'paper',
  predict: {
    q: '温度越高，100 g 水里能溶解的硝酸钾——',
    hint: '课本第 40 页表 9-1。',
    options: ['越多，而且增加得越来越快', '越少', '几乎不变'],
    answer: 0,
  },
  need: '在几个不同温度下，测出 100 g 水里最多能溶解多少硝酸钾，描点、连成溶解度曲线，和课本图 9-11 对照，查出 25 ℃ 时的溶解度',
  conclusion: {
    crops: [{ page: 45, rect: [64, 237, 480, 566] }],
    quote: '固体的溶解度表示在一定温度下，某固态物质在 100 g 溶剂里达到饱和状态时所溶解的质量。',
    why: '大多数固体物质的溶解度随温度升高而增大，如硝酸钾（曲线很陡）；少数固体物质的溶解度受温度影响很小，如氯化钠（曲线几乎是平的）；极少数固体物质的溶解度随温度升高而减小，如氢氧化钙（图 9-12）。<br>从溶解度曲线上可以查出某物质在任一温度下的溶解度，比较不同物质的溶解度（两条曲线的交点：这个温度下溶解度相等），也能看出怎样让溶质结晶析出：硝酸钾这类可以<b>降温</b>结晶，氯化钠这类要<b>蒸发</b>溶剂。',
    src: '课本下册第 39–41 页 · 第九单元 课题2 溶解度（表 9-1、探究：溶解度曲线）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); else bar.caption(m); };     // 结果（演示里当字幕）
    const tell = (m) => { if (!S.demo) W?.status(m); };                              // 下一步做什么（只给学生）
    const done = (id) => { if (!S.demo) bar.done(id); };

    paperSheet(group, { w: 0.34, d: 0.2, x: 0.01, z: 0.01 });

    // ================= 电热板、烧杯、温度计 =================
    const plate = inked(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.09), paint(0xe9e6df)), { width: 0.7 }); plate.position.set(BK.x, 0.006, 0); group.add(plate);
    const hot = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.0008, 32), paint(0x6b6f78, { keep: true, unique: true })); hot.position.set(BK.x, 0.0124, 0); group.add(hot);
    const panelTex = canvasTex(256, 64, () => {});
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.009), new THREE.MeshBasicMaterial({ map: panelTex })); panel.position.set(BK.x, 0.006, 0.0452); group.add(panel);
    const mkBtn = (x, text) => { const b = inked(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.008, 0.004), paint(0x3d4352)), { width: 0.4 }); b.position.set(BK.x + x, 0.006, 0.047); group.add(b); const l = textPlate(text, { w: 0.008, h: 0.006, color: '#ffffff', bg: 'rgba(0,0,0,0)', font: 'bold 110px sans-serif' }); l.position.set(BK.x + x, 0.006, 0.0492); group.add(l); const p = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.016, 0.012), new THREE.MeshBasicMaterial({ visible: false })); p.position.copy(b.position); p.userData.pick = true; group.add(p); return p; };
    const upPick = mkBtn(0.04, '+'), downPick = mkBtn(-0.04, '−');
    const bk = chemBeaker({ r: BR, h: BH, level: 0.024, color: CHEM.water, marks: true }); bk.position.copy(BK); group.add(bk);
    const bkPick = new THREE.Mesh(new THREE.CylinderGeometry(BR + 0.004, BR + 0.004, BH, 12), new THREE.MeshBasicMaterial({ visible: false })); bkPick.position.y = BH / 2; bkPick.userData.pick = true; bk.add(bkPick);
    const th = thermometer({ min: 0, max: 100, length: 0.17 }); th.position.set(BK.x + 0.018, BK.y + 0.0125, -0.012); th.rotation.z = 0.12; group.add(th);
    th.children[1].material = paint(0xd8342a, { keep: true }); th.children[0].material = glass2({ base: 0.06, rim: 0.5, band: 0.5 }); th.children[0].renderOrder = 9;
    // 杯底没溶的固体（堆）、降温析出的针状晶体
    const heap = new THREE.Group(); heap.position.set(BK.x, BK.y + 0.002, 0); group.add(heap);
    const crysM = paint(0xf6f6f2);
    for (let i = 0; i < 60; i++) { const g = new THREE.Mesh(new THREE.DodecahedronGeometry(0.0018, 0), crysM); const r = Math.sqrt(Math.random()) * 0.03, a = Math.random() * 6.28; g.position.set(Math.cos(a) * r, Math.random() * 0.003 * (1 - r / 0.03), Math.sin(a) * r); g.userData.k = Math.random(); heap.add(g); }
    const needles = new THREE.Group(); needles.position.copy(heap.position); group.add(needles);
    for (let i = 0; i < 50; i++) { const L = 0.004 + Math.random() * 0.008; const n = new THREE.Mesh(new THREE.BoxGeometry(0.0008, L, 0.0008), crysM); n.geometry.translate(0, L / 2, 0); const r = Math.sqrt(Math.random()) * 0.03, a = Math.random() * 6.28; n.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); n.rotation.set((Math.random() - 0.5) * 1.6, Math.random() * 6, (Math.random() - 0.5) * 1.6); n.userData.k = Math.random(); needles.add(n); }
    // 玻璃棒（原点在下端）：平时斜靠在左后方的杯口上；搅拌时竖起来一点，下端在杯底转圈（不碰温度计）
    const rod = new THREE.Group(); group.add(rod);
    const rodM = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, ROD_L, 10), paint(0xe8f2f6, { transparent: true, opacity: 0.85 })), { width: 0.5 }); rodM.geometry.translate(0, ROD_L / 2, 0); rod.add(rodM);
    const rodPick = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, ROD_L, 8), new THREE.MeshBasicMaterial({ visible: false })); rodPick.position.y = ROD_L / 2; rodPick.userData.pick = true; rod.add(rodPick);
    const LEAN = new THREE.Vector2(-0.35, -0.94).normalize(), UP = V3(0, 1, 0);
    // 搅拌：手捏着上端，下端在杯底转圈（上端几乎不动，离温度计远）
    const ROD_C = V3(-0.004, 0.0024, 0.004), ROD_TOP = ROD_C.clone().add(V3(LEAN.x * Math.sin(0.15), Math.cos(0.15), LEAN.y * Math.sin(0.15)).multiplyScalar(ROD_L));
    const poseRod = () => {
      const u = ease(S.u), rest = V3(0.004, 0.0018, 0.006), stir = ROD_C.clone().add(V3(Math.cos(S.ph) * 0.008, 0, Math.sin(S.ph) * 0.008));
      const dRest = V3(LEAN.x * Math.sin(0.387), Math.cos(0.387), LEAN.y * Math.sin(0.387)), dStir = ROD_TOP.clone().sub(stir).normalize();      // 斜靠在杯口上 0.39 rad
      rod.position.copy(BK).add(rest.lerp(stir, u));
      rod.quaternion.setFromUnitVectors(UP, dRest.lerp(dStir, u).normalize());
    };

    // ================= 称量纸：事先称好的一份份药品 =================
    const papers = PAPERS.map((home) => {
      const g = new THREE.Group(); g.position.copy(home); group.add(g);
      const sheet = inked(new THREE.Mesh(new THREE.BoxGeometry(0.023, 0.0005, 0.023), paint(0xfdfdfa)), { width: 0.4 }); sheet.position.y = 0.00025; g.add(sheet);
      const hp = inked(new THREE.Mesh(new THREE.SphereGeometry(0.0078, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xf1f0ea)), { width: 0.4 }); hp.scale.y = 0.5; hp.position.y = 0.0005; g.add(hp);
      const pick = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.014, 0.025), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 0.006; pick.userData.pick = true; g.add(pick);
      return { g, hp, pick, home: home.clone() };
    });
    let paperLab = null;
    const setPortions = (key) => {        // 换一种药品：换上一套新的称量纸（硝酸钾 9 份、氯化钠 4 份）
      if (paperLab) group.remove(paperLab);
      paperLab = textPlate(`${DATA[key].cn}（每份 ${DATA[key].add} g）`, { w: 0.05, h: 0.0072, color: '#23293a', bg: '#fffaf0', font: 'bold 64px "Songti SC", serif' }); paperLab.position.set(-0.113, 0.004, 0.064); paperLab.rotation.x = -0.5; group.add(paperLab);
      papers.forEach((p, i) => { p.g.visible = i < DATA[key].n; });
    };
    const grains = new Particles({ max: 160, geometry: new THREE.DodecahedronGeometry(1, 0), material: paint(0xdedcd4) }); group.add(grains.mesh);      // 倒下去的固体颗粒

    // ================= 坐标纸 =================
    const board = new THREE.Group(); board.position.copy(BOARD); board.rotation.y = -0.25; group.add(board);
    const easel = inked(new THREE.Mesh(new THREE.BoxGeometry(BW + 0.008, BHt + 0.008, 0.004), paint(0xd9b27c)), { width: 0.6 }); easel.position.y = BHt / 2 + 0.012; board.add(easel);
    const legs = inked(new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.012, 0.04), paint(0xd9b27c)), { width: 0.5 }); legs.position.set(0, 0.006, -0.01); board.add(legs);
    const gTex = canvasTex(768, 832, () => {});
    const gPaper = new THREE.Mesh(new THREE.PlaneGeometry(BW, BHt), new THREE.MeshBasicMaterial({ map: gTex })); gPaper.position.set(0, BHt / 2 + 0.012, 0.0022); board.add(gPaper);
    const boardPick = new THREE.Mesh(new THREE.BoxGeometry(BW, BHt, 0.01), new THREE.MeshBasicMaterial({ visible: false })); boardPick.position.copy(gPaper.position); boardPick.userData.pick = true; board.add(boardPick);
    const bkCard = tag('', 'cond'); bkCard.px = [-150, -40];

    // ================= 状态 =================
    const fresh = () => ({ demo: false, key: 'KNO3', T: ROOM, set: ROOM, added: 0, dis: 0, points: { KNO3: [], NaCl: [] }, showBook: false, dirty: true, cooled: false, used: PAPERS.map(() => false), anim: null, stirT: 0, u: 0, ph: 0 });
    S = fresh();
    setPortions(S.key);
    const sat = () => sol(S.key, S.T);
    const undis = () => S.added - S.dis;
    const settled = () => S.dis >= sat() - 0.5;               // 溶到饱和、停下来了
    const stable = () => Math.abs(S.T - S.set) <= 1.5;        // 温度计读数稳定了
    const nextPaper = () => S.used.findIndex((u, i) => !u && i < DATA[S.key].n);

    const drawGraph = () => {
      const c = gTex.image, g = c.getContext('2d'), Wc = c.width, Hc = c.height;
      g.fillStyle = '#fdfbf4'; g.fillRect(0, 0, Wc, Hc);
      const X = (T) => (GX0 + (GX1 - GX0) * T / 100) * Wc, Y = (s) => (GY0 + (GY1 - GY0) * s / YMAX) * Hc;
      g.strokeStyle = 'rgba(80,140,180,0.25)'; g.lineWidth = 1;
      for (let T = 0; T <= 100; T += 5) { g.beginPath(); g.moveTo(X(T), Y(0)); g.lineTo(X(T), Y(YMAX)); g.stroke(); }
      for (let s = 0; s <= YMAX; s += 10) { g.beginPath(); g.moveTo(X(0), Y(s)); g.lineTo(X(100), Y(s)); g.stroke(); }
      g.strokeStyle = '#23293a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(X(0), Y(YMAX)); g.lineTo(X(0), Y(0)); g.lineTo(X(100), Y(0)); g.stroke();
      g.fillStyle = '#23293a'; g.font = '22px "Times New Roman", serif'; g.textAlign = 'center';
      for (let T = 0; T <= 100; T += 20) g.fillText(String(T), X(T), Y(0) + 26);
      g.textAlign = 'right'; for (let s = 0; s <= YMAX; s += 20) g.fillText(String(s), X(0) - 6, Y(s) + 7);
      g.textAlign = 'center'; g.font = '24px "Songti SC", serif'; g.fillText('温度/℃', X(50), Hc - 8);
      g.save(); g.translate(26, Y(YMAX / 2)); g.rotate(-Math.PI / 2); g.fillText('溶解度/g', 0, 0); g.restore();
      // 课本的曲线（对照）：淡淡的；画到坐标纸顶上为止（硝酸钾 84 ℃ 以后超出 180 g，在顶边截住）
      if (S.showBook) for (const k of ['KNO3', 'NaCl']) {
        g.strokeStyle = DATA[k].color; g.globalAlpha = 0.35; g.lineWidth = 6; g.lineJoin = 'round'; g.beginPath();
        for (let T = 0; T <= 100; T += 0.5) { const s = sol(k, T); if (s > YMAX) { const T0 = T - 0.5, s0 = sol(k, T0); g.lineTo(X(T0 + 0.5 * (YMAX - s0) / (s - s0)), Y(YMAX)); break; } T ? g.lineTo(X(T), Y(s)) : g.moveTo(X(T), Y(s)); } g.stroke(); g.globalAlpha = 1;
        g.fillStyle = DATA[k].color; g.font = '22px "Songti SC", serif'; g.fillText(DATA[k].cn + '（课本）', k === 'KNO3' ? X(55) : X(80), k === 'KNO3' ? Y(140) : Y(48));
      }
      // 学生描的点，按温度顺序用平滑的曲线连起来（单调三次插值：经过每个点，不会在两点之间鼓出去）
      for (const k of ['KNO3', 'NaCl']) {
        const P = [...S.points[k]].sort((a, b) => a[0] - b[0]); if (!P.length) continue;
        g.strokeStyle = DATA[k].color; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round';
        if (P.length >= 2) {
          const n = P.length, dx = [], m = [], t = [];
          for (let i = 0; i < n - 1; i++) { dx.push(P[i + 1][0] - P[i][0]); m.push((P[i + 1][1] - P[i][1]) / dx[i]); }
          t[0] = m[0]; t[n - 1] = m[n - 2];
          for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
          for (let i = 0; i < n - 1; i++) { if (m[i] === 0) { t[i] = t[i + 1] = 0; continue; } const a = t[i] / m[i], b = t[i + 1] / m[i], q = a * a + b * b; if (q > 9) { const s = 3 / Math.sqrt(q); t[i] = s * a * m[i]; t[i + 1] = s * b * m[i]; } }
          g.beginPath(); g.moveTo(X(P[0][0]), Y(P[0][1]));
          for (let i = 0; i < n - 1; i++) { const h0 = dx[i] / 3; g.bezierCurveTo(X(P[i][0] + h0), Y(P[i][1] + t[i] * h0), X(P[i + 1][0] - h0), Y(P[i + 1][1] - t[i + 1] * h0), X(P[i + 1][0]), Y(P[i + 1][1])); }
          g.stroke();
        }
        g.fillStyle = DATA[k].color; for (const [T, s] of P) { g.beginPath(); g.arc(X(T), Y(Math.min(YMAX, s)), 8, 0, 7); g.fill(); }
      }
      gTex.needsUpdate = true;
    };
    const drawPanel = () => { const c = panelTex.image, g = c.getContext('2d'); g.fillStyle = '#1d2b20'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#7dff9a'; g.font = 'bold 40px monospace'; g.textAlign = 'center'; g.fillText(`${Math.round(S.set)} ℃`, 128, 46); panelTex.needsUpdate = true; };

    // ================= 操作 =================
    const A = {
      setTemp(d) { S.set = clamp(S.set + d, 20, 80); drawPanel(); sfx.clink({ freq: 1200, gain: 0.02 }); tell(`电热板调到 <b>${S.set} ℃</b>。等温度计读数稳定。`); },
      // 点一下称量纸：拿起来，在烧杯口上方把这一份倒进去
      paper(i) {
        if (S.anim || S.used[i] || i >= DATA[S.key].n) return;
        if (!stable()) return status('等温度稳定了再加。');
        S.used[i] = true; S.anim = { i, t: 0, added: false }; sfx.clink({ freq: 2000, gain: 0.02 });
      },
      stir() { S.stirT = Math.max(S.stirT, STIR_T); sfx.clink({ freq: 1600, gain: 0.015 }); },
      plot() {
        if (undis() < 0.5) return status(S.added ? `杯底已经没有剩下的${DATA[S.key].cn}了——还没饱和，再加一些。` : `先加${DATA[S.key].cn}，加到杯底有剩下的、溶不了为止。`);
        if (!settled()) return status('还在溶解：用<b>玻璃棒</b>搅拌一下。');
        const T = Math.round(S.T), s = Math.round(sat() * 10) / 10, P = S.points[S.key];
        if (P.some((p) => Math.abs(p[0] - T) < 3)) return status(`${T} ℃ 这个点已经描过了。换一个温度。`);
        P.push([T, s]); S.dirty = true; sfx.clink({ freq: 1800, gain: 0.03 });
        if (!S.demo && W) W.tbl.add([DATA[S.key].name, T, s]);
        const got = `描了一个点：<b>${T} ℃ 时，100 g 水最多溶解 ${s} g ${DATA[S.key].cn}</b>。`;
        status(got); tell(got + (P.length < 4 ? '换个温度再测。' : ''));
        if (S.key === 'KNO3') { if (P.length >= 1) done('p1'); if (P.length >= 4) { done('p4'); S.showBook = true; status('测了 4 个温度，连成了曲线。和课本的曲线（淡色）对照一下——几乎重合。'); W?.t1.open(); } }
      },
      setKey(k) { S.key = k; S.added = 0; S.dis = 0; S.dirty = true; S.used = PAPERS.map(() => false); S.anim = null; grains.clear(); setPortions(k); status(`换成 ${DATA[k].cn}：烧杯里换成了 100 g 新的水，称量纸上换成了每份 ${DATA[k].add} g 的${DATA[k].cn}。`); },
      reset() { const k = S.key; S = fresh(); if (k !== 'KNO3') setPortions('KNO3'); grains.clear(); W?.tbl.clear(); drawPanel(); if (W) { W.t1.close(); W.t2.close(); W.t3.close(); W.next.hidden = true; W.keySeg.set(0); } bar.undo('p1', 'p4', 'why'); status('全部重新摆好了，记录也清空了。'); },
    };
    const paperOk = (i) => !S.anim && !S.used[i] && i < DATA[S.key].n;

    const drag = draggable(group, [], { taps: [
      { obj: upPick, hint: '点一下：升高 10 ℃', onTap: () => A.setTemp(10) },
      { obj: downPick, hint: '点一下：降低 10 ℃', onTap: () => A.setTemp(-10) },
      ...papers.map((p, i) => ({ obj: p.pick, enabled: () => paperOk(i), hint: () => (paperOk(i) ? `点一下：把这一份 ${DATA[S.key].add} g ${DATA[S.key].cn}倒进烧杯` : ''), onTap: () => A.paper(i) })),
      { obj: bkPick, hint: '点一下：用玻璃棒搅拌', onTap: () => A.stir() },
      { obj: rodPick, hint: '点一下：用玻璃棒搅拌', onTap: () => A.stir() },
      { obj: boardPick, hint: '点一下：把现在这个点描到坐标纸上', onTap: () => A.plot() },
    ], tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    // 这一步要动的东西：温度没稳定 → 等；有剩没溶完 → 搅拌；溶到饱和了 → 描点（描过了 → 升温）；没剩 → 再加一份
    const nextThing = () => {
      if (!stable()) return null;
      if (undis() > 0.5) return !settled() ? bk : S.points[S.key].some((p) => Math.abs(p[0] - Math.round(S.T)) < 3) ? upPick : board;
      const i = nextPaper(); return S.anim ? null : i >= 0 ? papers[i].g : null;
    };
    // 演示：一份一份地加（点称量纸），每加一份点一下烧杯搅拌；时间到了就点下一份。kNow：镜头放到哪儿了（给 speed 用）
    let kNow = 0;
    const track = (f) => (k) => { kNow = k; f(k); };
    const addStir = (i, at, gap = 0.12) => [act.tap(papers[i].pick, at), act.tap(bkPick, at + gap)];
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'p1', title: '测一个温度的溶解度', todo: '点<b>称量纸</b>，把称好的硝酸钾倒进烧杯，每加一份都点烧杯用<b>玻璃棒</b>搅拌；加到杯底有剩下的、溶不了，再点一下<b>坐标纸</b>描点。', target: nextThing },
        { id: 'p4', title: '测满 4 个温度', todo: '点电热板上的 <b>+</b> 升温（每次 10 ℃），等温度稳定；搅拌，再一份份加到饱和、描点。测满 4 个温度。', target: nextThing },
        { id: 'why', title: '想一想', todo: '从曲线上能看出什么？在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; S.dirty = true; }, fresh, bar: () => bar, apply: () => { setPortions(S.key); drawPanel(); grains.clear(); } }),
          // 倒、搅的那一会儿时间加快一点（1.5 倍）；等升温、等溶解的时候加快多一些
          shots: [
            { cap: '20 ℃：往 100 g 水里加入称好的硝酸钾，每份 20 g，每加一份都用玻璃棒搅拌；加到杯底有剩、再也溶不了——最多溶解 31.6 g。描一个点。', dur: 8, cam: [[-0.04, 0.06, 0], [0.05, 0.25, 1], 0.38], get speed() { return S.anim ? 1.5 : 2; },
              during: act.seq(...addStir(0, 0.03, 0.15), ...addStir(1, 0.34, 0.14), act.tap(boardPick, 0.85)) },
            { cap: '升温到 40 ℃，等温度稳定：搅拌，杯底剩下的又溶了；再加、再搅拌，加到杯底有剩——63.9 g。描点。', dur: 9.5, cam: [[0.0, 0.07, 0], [0.05, 0.25, 1], 0.4], get speed() { return S.anim ? 1.5 : 2.5; },
              during: act.seq(act.tap(upPick, 0.02), act.tap(upPick, 0.05), act.tap(bkPick, 0.28), ...addStir(2, 0.36), ...addStir(3, 0.6), act.tap(boardPick, 0.9)) },
            { cap: '升温到 60 ℃，也这样测：110 g。描点。', dur: 9.5, cam: [[0.0, 0.07, 0], [0.05, 0.25, 1], 0.4], get speed() { return S.anim ? 1.5 : 2.5; },
              during: act.seq(act.tap(upPick, 0.02), act.tap(upPick, 0.05), act.tap(bkPick, 0.28), ...addStir(4, 0.36), ...addStir(5, 0.6), act.tap(boardPick, 0.9)) },
            { cap: '升温到 80 ℃：搅拌，再一份份加到杯底有剩——169 g。4 个点连成曲线：温度越高，硝酸钾的溶解度越大，而且越来越陡。', dur: 12.5, cam: [[0.03, 0.07, 0], [0.05, 0.22, 1], 0.42], get speed() { return S.anim ? 1.5 : 2.5; },
              during: act.seq(act.tap(upPick, 0.02), act.tap(upPick, 0.04), act.tap(bkPick, 0.2), ...addStir(6, 0.26, 0.1), ...addStir(7, 0.44, 0.1), ...addStir(8, 0.62, 0.1), act.tap(boardPick, 0.88)) },
            { cap: '和课本的溶解度曲线（淡色）对照：几乎重合。', dur: 4.5, cam: [[BOARD.x, 0.08, BOARD.z], [-0.25, 0.08, 1], 0.26] },
            { cap: '把电热板调回 40 ℃，降温：溶不下的硝酸钾析出晶体。演示完了，下面换你自己做。', dur: 7, cam: [[BK.x, 0.06, 0], [0.05, 0.3, 1], 0.32], get speed() { return kNow > 0.25 ? 3 : 1; },
              during: track(act.seq(...[0, 1, 2, 3].map((j) => act.tap(downPick, 0.04 + j * 0.04)))) },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ================= 每帧 =================
    const tmpV = V3(0, 0, 0);
    // 称量纸：抬起来 → 平移到烧杯左边的上方 → 移到杯口左上方、慢慢倾斜（靠烧杯的那条边朝下）→ 固体滑进烧杯 → 放平 → 原路放回原处
    const animStep = (h) => {
      const a = S.anim;
      papers.forEach((p, i) => { if (a && a.i === i) return; p.g.position.copy(p.home); p.g.rotation.set(0, 0, 0); p.hp.visible = !S.used[i]; p.hp.scale.set(1, 0.5, 1); p.hp.position.set(0, 0.0005, 0); });
      if (!a) return;
      a.t += h;
      const t = a.t, seg = (t0, t1) => ease((t - t0) / (t1 - t0)), p = papers[a.i], rim = BK.y + BH;
      const PL = p.home.clone().setY(rim + 0.024), PA = V3(BK.x - BR - 0.012, rim + 0.024, BK.z), PC = V3(BK.x - BR + 0.006, rim + 0.016, BK.z);
      let pos, tilt = 0;
      if (t < 0.4) pos = p.home.clone().lerp(PL, seg(0, 0.4));
      else if (t < 0.9) pos = PL.clone().lerp(PA, seg(0.4, 0.9));
      else if (t < 1.2) { pos = PA.clone().lerp(PC, seg(0.9, 1.2)); tilt = 0.45 * seg(0.9, 1.2); }
      else if (t < 1.9) { pos = PC.clone(); tilt = 0.45 + 0.5 * seg(1.2, 1.6); }
      else if (t < 2.2) { pos = PC.clone().lerp(PA, seg(1.9, 2.2)); tilt = 0.95 * (1 - seg(1.9, 2.2)); }
      else if (t < 2.7) pos = PA.clone().lerp(PL, seg(2.2, 2.7));
      else pos = PL.clone().lerp(p.home, seg(2.7, 3.0));
      p.g.position.copy(pos); p.g.rotation.set(0, 0, -tilt);
      const f = 1 - seg(1.2, 1.55);
      p.hp.visible = f > 0.03; p.hp.scale.set(Math.max(0.01, f), 0.5 * Math.max(0.01, f), Math.max(0.01, f)); p.hp.position.set(0.007 * (1 - f), 0.0005, 0);
      if (t > 1.22 && t < 1.62) for (let j = 0; j < 4; j++) if (Math.random() < h * 90) {
        p.g.updateMatrixWorld(true);
        const e = group.worldToLocal(p.g.localToWorld(tmpV.set(0.0115, 0.001, (Math.random() - 0.5) * 0.012)));
        grains.spawn({ p: e.clone(), v: V3(0.008, -0.012, (Math.random() - 0.5) * 0.005), size: 0.0014 + Math.random() * 0.0008, life: 1.5 });
      }
      if (!a.added && t >= 1.5) { a.added = true; S.added += DATA[S.key].add; tell(`加入了 ${DATA[S.key].add} g ${DATA[S.key].cn}（一共 ${S.added} g）。点一下烧杯：用<b>玻璃棒</b>搅拌，看它溶不溶得完。`); }
      if (t >= 3.0) S.anim = null;
    };
    const step = (h) => {
      // 温度：升温约 4 ℃/s（演示更快），降温约 2 ℃/s
      const d = S.set - S.T; S.T += Math.sign(d) * Math.min(Math.abs(d), (d > 0 ? 4 : 2) * h);
      th.setTemp(S.T);
      hot.material.color.setHex(0x6b6f78).lerp(new THREE.Color(0xd2553a), clamp((S.T - 22) / 60, 0, 0.8));
      animStep(h);
      grains.update(h, (p, dt) => { p.v.y -= 0.5 * dt; p.p.addScaledVector(p.v, dt); return p.p.y > BK.y + 0.004; });
      // 玻璃棒：点一下搅 STIR_T 秒
      S.stirT = Math.max(0, S.stirT - h);
      S.u = clamp(S.u + (S.stirT > 0 ? h / 0.25 : -h / 0.3), 0, 1);
      if (S.u > 0) S.ph += h * Math.PI * 2 * 1.2;
      poseRod();
      const stirring = S.stirT > 0 && S.u > 0.6;
      // 溶解 / 析出：向饱和逼近。搅拌时几秒溶完；不搅拌溶得很慢
      const target = Math.min(S.added, sat());
      S.dis += (target - S.dis) * Math.min(1, h * (target > S.dis ? (stirring ? 2.8 : 0.02) : 0.6));
      if (target < S.dis - 0.5 && S.dis - target > 2) S.cooled = true;
      const u = undis();
      heap.children.forEach((g) => { g.visible = u > 0.3 && g.userData.k < Math.min(1, u / 40); });
      const crys = S.key === 'KNO3' && S.cooled ? Math.min(1, u / 60) : 0;
      needles.children.forEach((n) => { n.visible = n.userData.k < crys; });
      if (S.dirty) { S.dirty = false; drawGraph(); }
      bkCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">100 g 水 · ${S.T.toFixed(0)} ℃</span>${u > 0.5 && settled() ? '<span class="cc-res">饱和</span>' : ''}</div><div class="cc-more"><div class="cc-obs"><small>加了 ${S.added} g，溶解了 <b>${S.dis.toFixed(1)} g</b>${u > 0.5 ? `，杯底剩 ${u.toFixed(1)} g` : ''}</small></div></div></div>`)
        .loc(group, BK.x, BK.y + BH, 0).show(true);
    };
    drawPanel(); drawGraph();

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.34, d: 0.14, h: 0.17 },
      view: { elev: 16, azim: -6, lookY: 0.45, frameMargin: 1.06 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = () => S.points.KNO3.map(([T, s]) => `<div>${T} ℃：${s} g</div>`).join('');
        const t3 = think({ title: '想一想', ctx: () => '<div>硝酸钾：温度越高溶解度越大，曲线很陡</div><div>氯化钠：0 ℃ 35.7 g，100 ℃ 39.8 g，曲线几乎是平的</div>', status: (m) => ui.status(m),
          q: '要从溶液里得到硝酸钾晶体，最好用什么办法？氯化钠呢？',
          options: ['硝酸钾：冷却热的饱和溶液；氯化钠：蒸发溶剂', '两种都冷却热的饱和溶液', '两种都蒸发溶剂'],
          wrong: ['氯化钠的溶解度随温度变化很小，冷却以后几乎析不出来。', '硝酸钾的溶解度随温度变化很大，降温就能析出很多。'],
          ok: '对：溶解度受温度影响大的（硝酸钾）用<b>降温结晶</b>；受温度影响小的（氯化钠）用<b>蒸发结晶</b>。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); } });
        const t2 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '在你画的曲线上查一查：25 ℃ 时，硝酸钾的溶解度大约是——',
          options: ['约 38 g（20 ℃ 和 30 ℃ 之间）', '约 25 g', '约 60 g'],
          wrong: ['20 ℃ 时就已经有 31.6 g 了，25 ℃ 只会更多。', '60 g 是 40 ℃ 左右的溶解度。'],
          ok: '对：从曲线上可以查出表里没有的温度下的溶解度（课本表 9-1 的 20 ℃ 31.6 g、30 ℃ 45.8 g 之间）。',
          onOk: () => t3.open() });
        const t1 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '硝酸钾的溶解度随温度怎样变化？',
          options: ['温度越高，溶解度越大，而且增加得越来越快', '温度越高，溶解度越小', '几乎不随温度变化'],
          wrong: ['看你描的点：80 ℃ 比 20 ℃ 多溶解了很多。', '看你描的点：每升高 20 ℃，多溶解多少？'],
          ok: '对：大多数固体的溶解度随温度升高而增大，硝酸钾受温度影响很大。',
          onOk: () => t2.open() });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['物质', '温度/℃', '溶解度/g']);
        const keySeg = seg('测哪种物质', ['硝酸钾', '氯化钠'], (_, k) => A.setKey(k ? 'NaCl' : 'KNO3'));
        const vary = h('details', { class: 'more' }, h('summary', {}, '换个条件再试'),
          h('p', { class: 'fineprint', html: '换成<b>氯化钠</b>测几个温度，它的曲线什么样？也可以在硝酸钾饱和以后点 <b>−</b> 降温，看杯底析出晶体。' }), keySeg.el);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：溶解度数据来自课本表 9-1，中间温度按相邻两点插值；溶解、升温的快慢是示意。' });
        ui.controls.append(t1.el, t2.el, t3.el, next, vary, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '测得的溶解度';
        W = { tbl, t1, t2, t3, next, keySeg, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('电热板上一个烧杯，里面 100 g 水（20 ℃）；左边的称量纸上是事先称好的硝酸钾，每份 20 g；右边一张坐标纸。一份份加进去、每次都搅拌，加到溶不了为止，再点坐标纸描点。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { bar.dispose(); grains.dispose(); },
      debug: { get S() { return S; }, A, bar, picks: { up: upPick, paper: papers[0].pick, beaker: bkPick, rod: rodPick, board: boardPick },
        qa: qaFlow(drag, [
          // 每个温度：（升温、等稳定、搅拌）→ 一份份加，每份都搅拌 → 描点
          ...[[20, [0, 1]], [40, [2, 3]], [60, [4, 5]], [80, [6, 7, 8]]].flatMap(([T, idx], i) => [
            ...(i ? [{ name: `升温到 ${T}`, tap: upPick, wait: 0.1 }, { name: `再升 ${T}`, tap: upPick, wait: 6 }, { name: `搅拌 ${T}`, tap: bkPick, wait: 3 }] : []),
            ...idx.flatMap((j) => [{ name: `加一份 ${T}-${j + 1}`, tap: papers[j].pick, wait: 3.2 }, { name: `搅拌 ${T}-${j + 1}`, tap: bkPick, wait: 3 }]),
            { name: `描点 ${T}`, tap: boardPick, wait: 0.5 },
          ]),
          { name: '答第一题', run: () => W.t1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.t2.el.querySelector('button').click() },
          { name: '答第三题', run: () => W.t3.el.querySelector('button').click() },
        ]) },
    };
  },
};
