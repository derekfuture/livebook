// 数学 九年级上册 29.2.3 圆周角 · 图29.2-5（课本第 127–128 页）。故事用第 133 页 习题29.2 第 14 题：海港、两座灯塔、浅滩、危险角。
//
// 一堂课讲透一件事：一条弧所对的圆周角，等于它所对的圆心角的一半。
//   1 开船：船上看两座灯塔的夹角，越靠近浅滩越大。
//   2 沿着浅滩边上的弧开：夹角处处一样（危险角）——同弧所对的圆周角相等。
//   3 浮标在圆心：把船上的角剪下来两块，正好拼满浮标那里的角——圆周角是圆心角的一半（不在弧上剪，就拼不满或拼多了）。
//   4 为什么：海港压回课本上的图（图 29.2-6）。圆心在角的一条边上：OA＝OC，两个底角相等，∠BOC 是外角＝两个底角的和。
//   5 圆心在角的里面、外面：过 A 作直径 AD，两块相加或相减，每块都是一半。
//   6 BC 成了直径：∠BOC＝180°，圆周角是直角。
//   7 回到海上：进了浅滩，夹角是圆周角再加一块（外角），比危险角大；在外面，比危险角小——第 14 题的道理。
// 所有角度都按真实的几何算出来，没有写死的数。
import * as THREE from 'three';
import { stroke, piece, text, arcPts, tweens, add, sub, mul, unit, ang, mid, dist, wrap, clamp, lerp, ease, easeOut, grain, INK, PENCIL } from './kit/sheet.js';
import { draggable } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { wrapPointer, sandbox } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';

const W = 0.32, D = 0.22;                         // 纸
const O0 = [0, -0.016], R = 0.074;                // 浅滩边上那道弧所在的圆：圆心（浮标）、半径
const AB0 = (140 * Math.PI) / 180, AC0 = (40 * Math.PI) / 180;   // 两座灯塔在圆上的位置（从圆心看的方向角）
const BLUE = '#1f8fcf', BLUE_L = '#a9d6f2', MAG = '#d6247a', MAG_L = '#f2b9d3', ORANGE = '#e8892b', SEA = '#a9cde0', SHOAL = '#cbe8dc', LAND = '#e7dcc2';
const DEG = 180 / Math.PI, TAU = Math.PI * 2;
const onC = (a) => [O0[0] + R * Math.cos(a), O0[1] + R * Math.sin(a)];
const dirOf = (p) => Math.atan2(p[1] - O0[1], p[0] - O0[0]);
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const angAt = (V, P, Q) => Math.abs(wrap(ang(sub(Q, V)) - ang(sub(P, V))));         // ∠PVQ（0…π）
const ccwStart = (V, P, Q) => { const a = ang(sub(P, V)), b = ang(sub(Q, V)); return wrap(b - a) > 0 ? a : b; };   // ∠PVQ 按逆时针从哪条边开始
const fmtDeg = (r) => `${Math.round(r * DEG)}°`;
const sector = (r, w) => [[0, 0], ...arcPts([0, 0], r, 0, w, Math.max(6, Math.ceil(Math.abs(w) / 0.05)))];

export default {
  id: 'inscribed',
  fig: '图29.2-5',
  title: '圆周角',
  flow: 'explore',
  ask: '海上有一片浅滩，船长看不见水下的礁石，只看得见岸上的两座灯塔。<br>课本第 133 页第 14 题说：航行时量一量船和两座灯塔所成的角，只要它<b>小于危险角</b>，船就不会进浅滩。<br>这是什么道理？这一课的<b>圆周角</b>会告诉你。',
  need: '跟着下面的步骤：开船、剪角、看证明',
  conclusion: {
    quote: '一条弧所对的圆周角等于它所对的圆心角的一半。<br>同弧或等弧所对的圆周角相等。<br>半圆（或直径）所对的圆周角是直角，90°的圆周角所对的弦是直径。',
    why: '船在浅滩边那道弧上走，两座灯塔 <i>B</i>、<i>C</i> 不动，圆心角 ∠<i>BOC</i> 就不变；∠<i>BAC</i>＝½∠<i>BOC</i>，所以船上的夹角也不变——<b>同弧所对的圆周角相等</b>。<br><br>为什么是一半：圆心 <i>O</i> 在角的一条边上时，<i>OA</i>＝<i>OC</i>（都是半径），△<i>AOC</i> 的两个底角相等；∠<i>BOC</i> 是它的外角，等于两个底角的和，所以 ∠<i>BOC</i>＝2∠<i>A</i>。圆心在角的里面或外面时，过 <i>A</i> 作直径 <i>AD</i>，∠<i>BAC</i> 是两个这样的角相加或相减，每个都是对应圆心角的一半，合起来还是一半。<br><br><i>BC</i> 是直径时，∠<i>BOC</i>＝180°，所以<b>半圆（或直径）所对的圆周角是直角</b>。<br><br>船开进圆里面，夹角等于一个圆周角再加上一个角（三角形的外角），比危险角大；开到圆外面，等于一个圆周角减去一个角，比危险角小。所以只要量出的夹角小于危险角，船就在浅滩外面（课本第 133 页第 14 题）。',
    src: '课本第 127–128 页 · 第二十九章 29.2.3 圆周角；第 133 页 习题 29.2 第 14 题',
  },

  create({ look, back, aim }) {
    const group = new THREE.Group();
    const tw = tweens();
    let ui = null, dead = false;
    const queue = [];
    const later = (ms, f) => { queue.push({ t: ms / 1000, f }); };
    const tickQueue = (dt) => { for (let i = queue.length - 1; i >= 0; i--) { const q = queue[i]; q.t -= dt; if (q.t <= 0) { queue.splice(i, 1); if (!dead) q.f(); } } };

    // ================= 纸、海港 =================
    const base = new THREE.Mesh(new THREE.BoxGeometry(W, 0.0012, D), [0, 1, 2, 3, 4, 5].map((i) => new THREE.MeshLambertMaterial(i === 2 ? { color: 0xf6f1e4, map: grain() } : { color: 0xe6dfcf })));
    base.position.y = -0.0006; base.receiveShadow = true; base.castShadow = true; base.userData.qaSupport = true;
    const root = new THREE.Group(); group.add(base, root);
    const BV = O0[1] + R * Math.sin(AC0), BX = R * Math.cos(AC0);          // 两座灯塔中间那道堤的高度、半宽
    const shoreV = (u) => { const ub = Math.abs(u); return ub <= BX ? BV : BV + 0.004 + (ub - BX) * 0.42 + 0.004 * Math.sin(ub * 90); };
    const hc = document.createElement('canvas'); hc.width = 2048; hc.height = Math.round((2048 * D) / W);
    const hpx = 2048 / W, toPx = (p) => [(p[0] + W / 2) * hpx, (D / 2 - p[1]) * hpx];
    (() => {          // 海、浅滩、礁石、浪、岸：画在一张透明的纸上，压回课本的图时整张淡掉
      const g = hc.getContext('2d'), cw = hc.width, ch = hc.height, m = 0.006 * hpx;
      g.fillStyle = SEA; g.fillRect(m, m, cw - 2 * m, ch - 2 * m);
      g.globalAlpha = 0.35; g.fillStyle = g.createPattern(grain().image, 'repeat'); g.fillRect(m, m, cw - 2 * m, ch - 2 * m); g.globalAlpha = 1;
      const shoal = arcPts(O0, R, AC0, AB0 - TAU, 160).map(toPx);
      g.fillStyle = SHOAL; g.beginPath(); shoal.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
      for (const [u, v, r] of [[-0.02, -0.03, 0.006], [0.018, -0.052, 0.0045], [-0.035, -0.06, 0.004], [0.034, -0.012, 0.005], [-0.006, 0.01, 0.0042], [0.006, -0.074, 0.0035], [-0.048, -0.008, 0.0036]]) {
        const [x, y] = toPx([u, v]); g.fillStyle = 'rgba(112,122,112,0.5)'; g.beginPath();
        for (let k = 0; k < 9; k++) { const a = (k / 9) * TAU, rr = r * hpx * (0.75 + 0.35 * Math.sin(k * 2.3 + u * 99)); const X = x + Math.cos(a) * rr, Y2 = y + Math.sin(a) * rr * 0.8; k ? g.lineTo(X, Y2) : g.moveTo(X, Y2); }
        g.closePath(); g.fill();
      }
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 0.0007 * hpx; g.lineCap = 'round';
      for (let i = 0; i < 52; i++) {
        const u = -W / 2 + 0.02 + ((i * 0.6180339) % 1) * (W - 0.04), v = -D / 2 + 0.015 + ((i * 0.41421) % 1) * (D * 0.64);
        if (v > shoreV(u) - 0.012 || Math.abs(dist([u, v], O0) - R) < 0.009) continue;
        const [x, y] = toPx([u, v]); g.beginPath(); g.arc(x, y + 0.004 * hpx, 0.006 * hpx, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      }
      const top = D / 2 - 0.006, pts = [];
      for (let k = 0; k <= 160; k++) { const u = -W / 2 + 0.006 + (k / 160) * (W - 0.012); pts.push([u, Math.min(top, shoreV(u))]); }
      g.fillStyle = LAND; g.beginPath(); g.moveTo(...toPx([-W / 2 + 0.006, top])); for (const p of pts) g.lineTo(...toPx(p)); g.lineTo(...toPx([W / 2 - 0.006, top])); g.closePath(); g.fill();
      g.globalAlpha = 0.4; g.fillStyle = g.createPattern(grain().image, 'repeat'); g.fill(); g.globalAlpha = 1;
      g.strokeStyle = 'rgba(120,96,60,0.55)'; g.lineWidth = 0.0008 * hpx; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(...toPx(p)) : g.moveTo(...toPx(p)))); g.stroke();
    })();
    const htex = new THREE.CanvasTexture(hc); htex.colorSpace = THREE.SRGBColorSpace; htex.anisotropy = 8;
    const harbor = new THREE.Mesh(new THREE.PlaneGeometry(W, D).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: htex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
    harbor.position.y = 0.0002; harbor.renderOrder = 1; harbor.receiveShadow = true; harbor.raycast = () => {}; harbor.userData.noFrame = true; root.add(harbor);

    // ================= 器物：灯塔、浮标、小船 =================
    const Y = 0.0006;
    const paperMat = (c) => new THREE.MeshLambertMaterial({ color: c, map: grain() });
    const stripe = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d'); for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#f4efe4' : '#c9473e'; g.fillRect(0, (i * 256) / 6, 64, 256 / 6 + 1); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const lighthouse = () => {
      const g = new THREE.Group();
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.0052, 0.0058, 0.003, 20), paperMat(0xb8ab92)); foot.position.y = 0.0015;
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.0026, 0.0036, 0.026, 20), new THREE.MeshLambertMaterial({ map: stripe })); tower.position.y = 0.016;
      const deck = new THREE.Mesh(new THREE.CylinderGeometry(0.0038, 0.0038, 0.0009, 20), paperMat(0x3b3f4a)); deck.position.y = 0.0295;
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.0021, 0.0021, 0.0034, 16), new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffc94a, emissiveIntensity: 0.9, roughness: 0.3 })); lamp.position.y = 0.0315;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.0029, 0.0034, 20), paperMat(0xb7372f)); roof.position.y = 0.0349;
      for (const m of [foot, tower, deck, roof]) { m.castShadow = true; m.receiveShadow = true; }
      g.add(foot, tower, deck, lamp, roof); g.userData.lamp = lamp;
      return g;
    };
    const LH = { B: lighthouse(), C: lighthouse() };
    const buoy = (() => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.0034, 0.0062, 18), new THREE.MeshLambertMaterial({ map: stripe })); body.position.y = 0.0031;
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.0013, 12, 8), paperMat(0xc9473e)); ball.position.y = 0.0068;
      body.castShadow = ball.castShadow = true; g.add(body, ball); return g;
    })();
    const boat = (() => {          // 折纸小船：船身是一个倒梯形的折面，中间一张三角帆
      const g = new THREE.Group(), Lh = 0.0155, Wd = 0.0062, H = 0.0046;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([-Lh, H, 0, Lh, H, 0, -Lh * 0.55, 0, Wd * 0.5, Lh * 0.55, 0, Wd * 0.5, -Lh * 0.55, 0, -Wd * 0.5, Lh * 0.55, 0, -Wd * 0.5], 3));
      geo.setIndex([0, 2, 3, 0, 3, 1, 0, 1, 5, 0, 5, 4, 2, 4, 5, 2, 5, 3]); geo.computeVertexNormals();
      const hull = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0xfbf8f0, map: grain(), side: THREE.DoubleSide }));
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute([-Lh * 0.5, H, 0, Lh * 0.5, H, 0, 0.0008, H + 0.0128, 0], 3)); sg.computeVertexNormals();
      const sail = new THREE.Mesh(sg, new THREE.MeshLambertMaterial({ color: 0xffffff, map: grain(), side: THREE.DoubleSide }));
      hull.castShadow = sail.castShadow = true; g.add(hull, sail); return g;
    })();
    root.add(LH.B, LH.C, buoy, boat);
    LH.B.scale.setScalar(1.25); LH.C.scale.setScalar(1.25);
    const land = (() => {
      const top = D / 2 - 0.006, sh = new THREE.Shape();
      sh.moveTo(-W / 2 + 0.006, top);
      for (let k = 0; k <= 160; k++) { const u = -W / 2 + 0.006 + (k / 160) * (W - 0.012); sh.lineTo(u, Math.min(top, shoreV(u))); }
      sh.lineTo(W / 2 - 0.006, top); sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.0022, bevelEnabled: false, curveSegments: 4 }); g.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(g, [paperMat(0xe9dfc6), paperMat(0xcdbf9f)]); m.castShadow = true; m.receiveShadow = true; m.userData.noFrame = true; m.raycast = () => {};
      root.add(m); return m;
    })();
    // 灯塔照到船上的光：贴着海面的两道光带（就是两条视线），不画成从灯上斜下来的光柱——那样斜着看，角就不对了
    const glowTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, 'rgba(255,236,170,0)'); gr.addColorStop(0.5, 'rgba(255,236,170,1)'); gr.addColorStop(1, 'rgba(255,236,170,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); const f = g.createLinearGradient(0, 0, 0, 256); f.addColorStop(0, 'rgba(0,0,0,0)'); f.addColorStop(1, 'rgba(0,0,0,0.55)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = f; g.fillRect(0, 0, 64, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const beam = () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 })); m.renderOrder = 4; m.raycast = () => {}; m.userData.noFrame = true; root.add(m); return m; };
    const BEAM = { B: beam(), C: beam() };
    const setBeam = (m, P, Q, w, o) => { const d = sub(Q, P), l = Math.hypot(...d); m.position.set((P[0] + Q[0]) / 2, Y + 0.00005, -(P[1] + Q[1]) / 2); m.rotation.set(0, Math.atan2(d[1], d[0]) - Math.PI / 2, 0); m.scale.set(w, 1, l); m.material.opacity = o; m.visible = o > 0.01; };

    // ================= 线、角、字 =================
    const ln = (color, width = 0.0008, o = {}) => { const s = stroke({ width, color, y: Y + 0.0001, order: 7, ...o }); root.add(s); return s; };
    const L = {
      circle: ln('#2f5f86', 0.0008, { dash: [0.0034, 0.0024], order: 6 }),
      AB: ln(BLUE), AC: ln(BLUE), OB: ln(MAG), OC: ln(MAG), OA: ln(INK, 0.001, { order: 8 }), AD: ln(PENCIL, 0.0007, { dash: [0.0025, 0.0018], order: 8 }),
      aux1: ln(ORANGE, 0.0011, { order: 8, dash: [0.003, 0.0018] }), aux2: ln(ORANGE, 0.0011, { order: 8 }), tick1: ln(INK, 0.0009, { order: 9 }), tick2: ln(INK, 0.0009, { order: 9 }), right: ln(INK, 0.0009, { order: 11, y: Y + 0.0016 }),
      guide: ln(PENCIL, 0.0006, { dash: [0.002, 0.0016], order: 6 }), spot: ln(PENCIL, 0.0007, { order: 6 }),
    };
    const fan = (color, opacity, order) => piece(root, null, { color, opacity, edge: 'rgba(0,0,0,0)', edgeW: 0.0001, y: Y + 0.0003, shadow: false, order });
    const F = { C: fan(BLUE_L, 0.88, 5), A: fan(BLUE_L, 0.88, 5), O: fan(MAG_L, 0.85, 5), A2: fan('#d6ecfa', 0.95, 6), O2: fan('#f9dde9', 0.95, 6), Q: fan(BLUE_L, 0.88, 5), X: fan('#f6c99a', 0.92, 6) };
    const lab = (s, o = {}) => text(root, s, { h: 0.0078, math: true, weight: 600, y: Y + 0.0006, ...o });
    const NUM = '"Times New Roman", serif';
    const T = { A: lab('A'), B: lab('B'), C: lab('C'), O: lab('O'), D: lab('D'), Q: lab('Q'), angA: lab('', { color: BLUE, h: 0.0086, math: false, font: NUM }), angO: lab('', { color: MAG, h: 0.0086, math: false, font: NUM }), angQ: lab('', { color: BLUE, h: 0.007, math: false, font: NUM }) };
    const dot = (c) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.0013, 18).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0 })); m.position.y = Y + 0.0004; m.renderOrder = 9; m.raycast = () => {}; m.userData.noFrame = true; root.add(m); return m; };
    const DOT = { A: dot(INK), B: dot(INK), C: dot(INK), O: dot(INK), D: dot(PENCIL), Q: dot(BLUE) };
    const copies = [0, 1].map(() => piece(root, null, { color: '#86c4ec', opacity: 0.94, edge: BLUE, edgeW: 0.0005, y: Y + 0.0012, order: 10 }));
    copies.forEach((c) => c.show(false));
    const knob = (r) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ visible: false })); m.userData.pick = true; m.userData.noFrame = true; root.add(m); return m; };
    const K = { A: knob(0.011), C: knob(0.009), cut: knob(0.009) };

    // ================= 状态 =================
    const fresh = () => ({ step: 1, A: [-0.072, -0.088], head: 0.4, Ca: AC0, mode: 'harbor', fig: 0, onArc: false, minA: 9, maxA: 0, arcRun: 0, lastArcA: null, cut: [], proof: 0, case1: false, cases: {}, diam: false, shoal: { in: false, out: false }, demo: false });
    let S = fresh();
    const Bp = () => onC(AB0), Cp = () => onC(S.Ca);
    const theta = () => angAt(S.A, Bp(), Cp());
    const central = () => angAt(O0, Bp(), Cp());
    const inSea = (p) => Math.abs(p[0]) < W / 2 - 0.014 && p[1] > -D / 2 + 0.012 && p[1] < shoreV(p[0]) - 0.008;
    // 大弧（不含 B、C 中间那一小段）：从 B 往逆时针量的方向角，离 B、C 各留一点
    const arcClamp = (a) => {
      const span = (((S.Ca - AB0) % TAU) + TAU) % TAU, m = 0.14;
      let t = (((a - AB0) % TAU) + TAU) % TAU;
      if (t > span) t = t - span < TAU - t ? span - m : m;
      return AB0 + clamp(t, m, span - m);
    };

    // ================= 画 =================
    const P3 = (p, y = 0) => new THREE.Vector3(p[0], y, -p[1]);
    const bis = (p, q0, q1, r) => { const u0 = unit(sub(q0, p)), u1 = unit(sub(q1, p)), s2 = add(u0, u1); return add(p, mul(Math.hypot(...s2) < 1e-3 ? [-u0[1], u0[0]] : unit(s2), r)); };
    const out = (p, r) => add(p, mul(unit(sub(p, O0)), r));
    function layout() {
      const A = S.A, B = Bp(), C = Cp(), th = theta(), fig = easeOut(S.fig), k = Math.max(0.001, 1 - fig);
      harbor.material.opacity = 1 - fig;
      LH.B.position.copy(P3(B)); LH.C.position.copy(P3(C)); LH.B.scale.setScalar(1.25 * k); LH.C.scale.setScalar(1.25 * k);
      land.scale.set(1, k, 1); land.visible = k > 0.02;
      setBeam(BEAM.B, B, A, 0.0062, 0.62 * (1 - fig)); setBeam(BEAM.C, C, A, 0.0062, 0.62 * (1 - fig));
      buoy.position.copy(P3(O0)); buoy.scale.setScalar(k);
      boat.position.copy(P3(A)); boat.rotation.y = S.head; boat.scale.setScalar(k);
      const showO = (S.step >= 3 && !(S.step >= 7 && S.mode === 'harbor')) || S.fig > 0;          // 第 7 步回到海上：浮标那块角收起来，不和船上的角挤在一起
      L.AB.set([A, B]); L.AC.set([A, C]); L.OB.set(showO ? [O0, B] : null); L.OC.set(showO ? [O0, C] : null);
      L.circle.set(S.step >= 2 || S.fig > 0 ? arcPts(O0, R, 0, TAU, 180) : null, true); L.circle.tint(fig > 0.5 ? INK : '#2f5f86');
      // 船上的角（蓝）、圆心的角（洋红）
      const a0 = ccwStart(A, B, C); F.A.set(sector(0.017, th)); F.A.pose({ a: a0, du: A[0], dv: A[1] });
      let e = central(), b0 = ccwStart(O0, B, C);
      if (S.diam && Math.abs(e - Math.PI) < 0.02) { e = Math.PI; b0 = cross(sub(B, O0), sub(A, O0)) > 0 ? ang(sub(C, O0)) : ang(sub(B, O0)); }     // 平角：画在 A 的对面
      F.O.set(sector(0.021, e)); F.O.pose({ a: b0, du: O0[0], dv: O0[1] }); F.O.show(showO);
      const zone = S.mode === 'harbor' && S.step >= 3 ? (S.A && dist(A, O0) < R - 0.0015 ? 'in' : dist(A, O0) > R + 0.0015 ? 'out' : 'on') : 'on';
      T.angA.ink(zone === 'in' ? '#c8402f' : zone === 'out' ? '#2f8f5a' : BLUE).say(fmtDeg(th)).at(...bis(A, B, C, 0.029));
      F.C.show(!!S.proof); if (S.proof) { F.C.set(sector(0.013, angAt(C, O0, A))); F.C.pose({ a: ccwStart(C, O0, A), du: C[0], dv: C[1] }); }
      T.angO.say(showO ? fmtDeg(e) : '').at(...(Math.abs(e - Math.PI) < 0.03 ? add(O0, mul(unit(sub(O0, A)), 0.03)) : bis(O0, B, C, 0.032)));
      T.B.at(...out(B, 0.012)); T.C.at(...out(C, 0.012)); T.O.at(O0[0] + 0.006, O0[1] - 0.008); T.A.at(...out(A, 0.012));
      T.O.fade(showO ? 1 : 0);
      for (const n of ['A', 'B', 'C', 'O']) { DOT[n].position.copy(P3(n === 'A' ? A : n === 'B' ? B : n === 'C' ? C : O0, Y + 0.0004)); DOT[n].material.opacity = fig; }
      // 证明：两条半径 OA、OC（各画一道短杠，表示一样长）
      L.OA.set(S.mode === 'fig' ? [O0, A] : null);
      const tick = (p, q) => { const m = mid(p, q), n = mul(unit([-(q[1] - p[1]), q[0] - p[0]]), 0.0028); return [sub(m, n), add(m, n)]; };
      L.tick1.set(S.proof ? tick(O0, A) : null); L.tick2.set(S.proof ? tick(O0, C) : null);
      // 第 5 步：过 A 的直径 AD，把角分成两块（淡色是 ∠BAD 和它对应的 ∠BOD）
      const Dp = sub(mul(O0, 2), A), showD = S.mode === 'fig' && S.step === 5;
      L.AD.set(showD ? [A, Dp] : null); T.D.say(showD ? 'D' : '').at(...out(Dp, 0.012)); DOT.D.material.opacity = showD ? 1 : 0; DOT.D.position.copy(P3(Dp, Y + 0.0004));
      F.A2.show(showD); F.O2.show(showD);
      if (showD) {
        const wa = wrap(ang(sub(Dp, A)) - ang(sub(B, A))), wo = wrap(ang(sub(Dp, O0)) - ang(sub(B, O0)));
        F.A2.set(sector(0.012, wa)); F.A2.pose({ a: ang(sub(B, A)), du: A[0], dv: A[1] });
        F.O2.set(sector(0.015, wo)); F.O2.pose({ a: ang(sub(B, O0)), du: O0[0], dv: O0[1] });
      }
      // 第 4 步、第 6 步：从 B 穿过圆心到正对面的一条铅笔虚线，正对面画个小圈——拖到这里
      const want = S.mode === 'fig' && ((S.step === 4 && !S.case1) || (S.step === 6 && !S.diam)), anti = sub(mul(O0, 2), B);
      L.guide.set(want ? [B, anti] : null); L.spot.set(want ? arcPts(anti, 0.0045, 0, TAU, 24) : null, true);
      // 直角记号
      if (S.diam && Math.abs(th - Math.PI / 2) < 0.01) { const u0 = unit(sub(B, A)), u1 = unit(sub(C, A)), s = 0.0085; L.right.set([add(A, mul(u0, s)), add(A, add(mul(u0, s), mul(u1, s))), add(A, mul(u1, s))]); } else L.right.set(null);
      // 第 7 步：延长 BA（或 CA）交圆于 Q，船上的角和 Q 处的圆周角比
      const sh = S.mode === 'harbor' && S.step >= 7 ? shoalFig() : null;
      F.Q.show(!!sh); F.X.show(!!sh); L.aux1.set(sh ? [sh.P, sh.far] : null); L.aux2.set(sh ? [sh.Q, sh.R2] : null);
      T.Q.say(sh ? 'Q' : ''); T.angQ.say(sh ? fmtDeg(central() / 2) : ''); DOT.Q.material.opacity = sh ? 1 : 0;
      if (sh) {
        F.Q.set(sector(0.013, angAt(sh.Q, sh.P, sh.R2))); F.Q.pose({ a: ccwStart(sh.Q, sh.P, sh.R2), du: sh.Q[0], dv: sh.Q[1] });
        F.X.set(sector(0.014, angAt(sh.R2, sh.Q, A))); F.X.pose({ a: ccwStart(sh.R2, sh.Q, A), du: sh.R2[0], dv: sh.R2[1] });
        T.Q.at(...out(sh.Q, 0.012)); T.angQ.at(...bis(sh.Q, sh.P, sh.R2, 0.021)); DOT.Q.position.copy(P3(sh.Q, Y + 0.0004));
      }
      K.A.position.copy(P3(A, 0.003)); K.C.position.copy(P3(C, 0.003)); K.cut.position.copy(P3(bis(A, B, C, 0.0125), 0.0036));
    }
    // 延长 PA（P 是一座灯塔）和圆的另一个交点 Q：船在圆里，Q 在船后面；船在圆外，Q 在灯塔和船中间。R2 是另一座灯塔
    function shoalFig() {
      const A = S.A, inside = dist(A, O0) < R - 0.0015, outside = dist(A, O0) > R + 0.0015;
      if (!inside && !outside) return null;
      for (const [P, R2] of [[Bp(), Cp()], [Cp(), Bp()]]) {
        const dir = unit(sub(A, P)), t = -2 * ((P[0] - O0[0]) * dir[0] + (P[1] - O0[1]) * dir[1]);
        if (t < 0.004) continue;
        const Q = add(P, mul(dir, t));
        if (outside && t > dist(A, P) - 0.002) continue;          // 在圆外，Q 得在灯塔和船中间
        if (!inArcFor(Q)) continue;
        return { P, R2, Q, inside, far: inside ? Q : A };
      }
      return null;
    }
    const inArcFor = (q) => { const span = (((S.Ca - AB0) % TAU) + TAU) % TAU, t = (((dirOf(q) - AB0) % TAU) + TAU) % TAU; return t > 0.05 && t < span - 0.05; };

    // ================= 提示、步骤 =================
    let sayN = 0;
    const DEMO = { seal: '演示', label: '老师演示', shots: [], ...sandbox({ get: () => S, set: (s2) => { S = s2; }, fresh: () => fresh(), bar: () => bar, apply: () => { copies.forEach((c) => c.show(false)); carrying = -1; tw.clear(); queue.length = 0; S.fig = S.mode === 'fig' ? 1 : 0; aim?.(S.mode === 'fig' ? TOP : SIDE); layout(); } }) };
    const say = (html, hold = 0) => { const n = ++sayN; bar.say(html); if (hold) later(hold, () => { if (n === sayN) bar.say(null); }); };
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'sail', title: '开船', todo: '拖着<b>小船</b>在海上开一开：看船上两座灯塔之间的<b>夹角</b>（蓝色）怎么变。', target: () => K.A },
        { id: 'arc', title: '沿着弧开', todo: '浅滩边上有一道<b>虚线弧</b>。把船开到弧上，<b>沿着它</b>开一段，看夹角。', target: () => K.A },
        { id: 'half', title: '和浮标比', todo: '浮标在这个圆的<b>圆心 O</b>。按住船上的<b>蓝色角</b>，把它<b>剪下来</b>拖到浮标那里，和 ∠BOC 比一比。剪两块。', target: () => K.cut },
        { id: 'why', title: '为什么是一半', todo: '海港压回了课本上的图（图 29.2-6）。先看最简单的一种：把 <b>A</b> 拖到让 <b>AB 经过圆心 O</b> 的地方。', target: () => K.A },
        { id: 'cases', title: '另外两种', todo: '拖着 <b>A</b> 在圆上走：圆心跑到角的<b>里面</b>、<b>外面</b>时，过 A 画直径 AD，把角分成两块看。两种各看一次。', target: () => K.A },
        { id: 'diam', title: '直径', todo: '特别的一种：把 <b>C</b> 拖到 B 的<b>正对面</b>，让 BC 成为直径；再拖 A 走一走。', target: () => (S.diam ? K.A : K.C) },
        { id: 'shoal', title: '进浅滩会怎样', todo: '回到海上。把船<b>开进浅滩</b>，再<b>开到外面</b>：看夹角为什么一个比危险角大、一个比危险角小。', target: () => K.A },
      ],
      reels: { demo: DEMO },
    });
    const TOP = [0, 1, 0.1], SIDE = [0, 0.86, 0.5];
    const stepNo = () => ({ sail: 1, arc: 2, half: 3, why: 4, cases: 5, diam: 6, shoal: 7 })[bar.current] || 8;
    const finish = (id, msg) => { if (S.demo) return; bar.done(id); S.step = stepNo(); if (msg) say(msg, 5200); onStep(); };
    function onStep() {
      if (S.step === 4 && S.mode !== 'fig') { const st = S; later(2400, () => { if (S === st && S.mode !== 'fig') toFigure(); }); }
      if (S.step === 7 && S.mode !== 'harbor') { const st = S; later(1500, () => { if (S === st && S.mode !== 'harbor') toHarbor(); }); }
      layout();
    }
    function toFigure() {          // 海港压回课本上的图
      S.mode = 'fig'; S.A = onC(arcClamp(dirOf(S.A))); copies.forEach((c) => c.show(false)); S.cut = [];
      tw.to(1.3, (k) => { S.fig = k; layout(); });
      aim?.(TOP); sfx.whoosh({ dur: 0.5, freq: 900, gain: 0.04 });
    }
    function toHarbor() {          // 回到海上：C 回到原来的灯塔，船停在浅滩外面
      S.mode = 'harbor'; S.diam = false; const c0 = S.Ca;
      tw.to(0.9, (k) => { S.Ca = lerp(c0, AC0, ease(k)); S.fig = 1 - k; layout(); });
      aim?.(SIDE); S.A = [0.06, -0.093];
    }

    // ================= 动作 =================
    function moveBoat(q) {
      if (S.mode === 'fig') { S.A = onC(arcClamp(dirOf(q))); afterMove(); return; }
      if (!inSea(q)) { q = [clamp(q[0], -W / 2 + 0.015, W / 2 - 0.015), clamp(q[1], -D / 2 + 0.013, shoreV(q[0]) - 0.009)]; if (!inSea(q)) return; }
      if (S.step >= 2 && S.step <= 3 && Math.abs(dist(q, O0) - R) < 0.006) q = onC(arcClamp(dirOf(q)));     // 靠近弧就吸上去，像沿着轨道
      const mv = sub(q, S.A); if (Math.hypot(...mv) > 0.0006) S.head = lerp(S.head, S.head + wrap(Math.atan2(mv[1], mv[0]) - S.head), 0.35);
      S.A = q; afterMove();
    }
    function afterMove() {
      const th = theta(), r = dist(S.A, O0); S.onArc = Math.abs(r - R) < 1e-4;
      S.minA = Math.min(S.minA, th); S.maxA = Math.max(S.maxA, th);
      if (S.demo) { layout(); return; }
      if (S.step === 1) {
        if (S.maxA - S.minA > 0.35 && S.maxA > central() / 2 + 0.06) finish('sail', '越靠近浅滩，夹角越大。浅滩边上画出了一道<b>虚线弧</b>——把船开到弧上看看。');
        else say(`船上看两座灯塔的夹角是 <b>${fmtDeg(th)}</b>。开近浅滩（浅绿色那片）、再开远一些看看。`);
      } else if (S.step === 2) {
        if (S.onArc) { const a = dirOf(S.A); if (S.lastArcA != null) S.arcRun += Math.abs(wrap(a - S.lastArcA)); S.lastArcA = a; } else S.lastArcA = null;
        if (S.arcRun > 1.0) finish('arc', `船在弧上走了一大段，夹角一直是 <b>${fmtDeg(th)}</b>——航海的人叫它<b>危险角</b>。这个角的顶点在圆上，两边都和圆相交，课本叫它<b>圆周角</b>。`);
        else say(S.onArc ? `沿着弧开：夹角一直是 <b>${fmtDeg(th)}</b>。` : '把船开到<b>虚线弧</b>上（靠近了会吸上去），再沿着它开。');
      } else if (S.step === 4 && S.mode === 'fig' && !S.case1) {
        const opp = sub(mul(O0, 2), Bp());
        if (dist(S.A, opp) < 0.01) { S.A = opp; S.case1 = true; playProof(); }
      } else if (S.step === 5 && S.mode === 'fig') {
        const c = caseOf();
        const Dp = sub(mul(O0, 2), S.A), nearB = angAt(S.A, Dp, Cp()) > angAt(S.A, Dp, Bp());          // 圆心在角外面时：在 B 那一侧还是 C 那一侧，减法的顺序不一样
        const sub3 = nearB ? '∠BAC＝∠DAC−∠DAB，两块各是 ∠DOC、∠DOB 的一半' : '∠BAC＝∠DAB−∠DAC，两块各是 ∠DOB、∠DOC 的一半';
        say(c === 2 ? '圆心在角的<b>里面</b>：∠BAC＝∠BAD＋∠DAC，两块各是 ∠BOD、∠DOC 的一半，加起来是 ∠BOC 的一半。' : c === 3 ? `圆心在角的<b>外面</b>：${sub3}，相减还是 ∠BOC 的一半。` : '圆心正好在角的一条边上：就是刚才那一种。');

      } else if (S.step === 6 && S.mode === 'fig' && S.diam) {
        const a = dirOf(S.A); if (S.lastDiamA != null) S.diamRun += Math.abs(wrap(a - S.lastDiamA)); S.lastDiamA = a;
        if (S.diamRun > 0.6) finish('diam', 'A 在半圆上走到哪，∠BAC 都是 90°：<b>半圆（或直径）所对的圆周角是直角</b>。下面回到海上。');
      } else if (S.step >= 7 && S.mode === 'harbor') {
        const sh = shoalFig(), d0 = fmtDeg(central() / 2);
        if (sh?.inside) { S.shoal.in = true; say(`进了浅滩：∠BAC 是三角形的外角，等于 Q 处的圆周角（${d0}）加上橙色的角，所以 <b>${fmtDeg(th)}＞${d0}</b>，危险。`); }
        else if (sh) { S.shoal.out = true; say(`在浅滩外面：Q 处的圆周角（${d0}）是三角形的外角，等于船上的角加上橙色的角，所以 <b>${fmtDeg(th)}＜${d0}</b>，安全。`); }
        else say(S.onArc ? '船正好在弧上：夹角等于危险角。开进去、开出来看看。' : `夹角 ${fmtDeg(th)}。往浅滩那边开一开。`);
        if (S.shoal.in && S.shoal.out) finish('shoal', '所以船长只要盯着夹角：<b>小于危险角</b>，船就在圆外，不会进浅滩。');
      }
      layout();
    }
    function releaseA() {          // 第 5 步：圆心在角的里面、外面各停下来看一次
      if (S.demo || S.step !== 5 || S.mode !== 'fig') return;
      const c = caseOf(); if (c > 1 && !S.cases[c]) { S.cases[c] = true; sfx.clink({ freq: 1500, gain: 0.04 }); }
      if (S.cases[2] && S.cases[3]) finish('cases', '三种情况都是一半：<b>一条弧所对的圆周角等于它所对的圆心角的一半</b>——这就是圆周角定理。');
      else if (S.cases[2] || S.cases[3]) say(`${S.cases[2] ? '里面' : '外面'}看过了。再把 A 拖到让圆心在角的<b>${S.cases[2] ? '外面' : '里面'}</b>，松手看看。`, 0);
    }
    const caseOf = () => {          // 1：圆心在角的一条边上；2：在角里面；3：在角外面
      const A = S.A, B = Bp(), C = Cp(), aO = ang(sub(O0, A)), aB = ang(sub(B, A)), aC = ang(sub(C, A));
      if (Math.abs(wrap(aO - aB)) < 0.035 || Math.abs(wrap(aO - aC)) < 0.035) return 1;
      return Math.abs(wrap(aO - aB)) + Math.abs(wrap(aC - aO)) <= angAt(A, B, C) + 1e-6 ? 2 : 3;
    };
    // 证明（圆心在角的一条边上）：OA、OC 一样长 → 两个底角相等 → 两个底角滑到 O，拼成外角 ∠BOC
    function playProof() {
      const A = S.A, B = Bp(), C = Cp(), st = S, mine = (f) => () => { if (S === st) f(); };
      S.proof = 1; layout(); sfx.clink({ freq: 1500, gain: 0.04 });
      const sA = ccwStart(A, O0, C), sC = ccwStart(C, O0, A), wA = angAt(A, O0, C), wC = angAt(C, O0, A);
      const s0 = ccwStart(O0, B, C);
      copies[0].set(sector(0.016, wA)); copies[0].pose({ a: sA, du: A[0], dv: A[1], lift: 0 }).show(true);
      copies[1].set(sector(0.016, wC)); copies[1].pose({ a: sC, du: C[0], dv: C[1], lift: 0 }).show(true);
      if (!S.demo) say('<i>OA</i>、<i>OC</i> 都是半径，一样长（各画了一道杠）：△<i>AOC</i> 是等腰三角形，两个底角 ∠<i>A</i>、∠<i>C</i> <b>相等</b>。');
      const slide = (c, from, a0, a1, t0) => later(t0, mine(() => tw.to(1.1, (k) => { const q = easeOut(k); c.pose({ a: a0 + wrap(a1 - a0) * q, du: lerp(from[0], O0[0], q), dv: lerp(from[1], O0[1], q), lift: Math.sin(Math.PI * k) * 0.008 }); }, () => sfx.clink({ freq: 1700, gain: 0.04 }))));
      slide(copies[0], A, sA, s0, 2600); slide(copies[1], C, sC, s0 + wA, 3400);
      later(4800, mine(() => { if (!S.demo) say('∠<i>BOC</i> 是 △<i>AOC</i> 的外角，等于两个底角的和——正好两个 ∠<i>A</i>：<b>∠BOC＝2∠A</b>。'); }));
      later(7800, mine(() => { copies.forEach((c) => c.show(false)); S.proof = 0; layout(); finish('why', '圆心在角的一条边上时，圆周角是圆心角的一半。A 在别的地方呢？'); }));
    }
    // 剪角：按住船上的蓝角拖出来一块，松手在浮标附近就拼进 ∠BOC
    let carrying = -1, carryAt = [0, 0];
    const cutTh = [0, 0];
    function cutStart() {
      const k = S.cut.length; if (k >= 2 || S.step !== 3) return;
      carrying = k; const A = S.A, th = theta(), c = copies[k];
      cutTh[k] = th; c.set(sector(0.017, th)); c.tint('#86c4ec'); c.pose({ a: ccwStart(A, Bp(), Cp()), du: A[0], dv: A[1], lift: 0.004 }).show(true);
      sfx.whoosh({ dur: 0.18, freq: 2600, gain: 0.05 });
    }
    function cutDrag(q) { carryAt = q; if (carrying >= 0) copies[carrying].pose({ du: q[0], dv: q[1], lift: 0.006 }); }
    function cutEnd() {
      if (carrying < 0) return; const k = carrying, c = copies[k], q = carryAt; carrying = -1;
      if (dist(q, O0) > 0.032) { const A = S.A; tw.to(0.35, (x) => c.pose({ du: lerp(q[0], A[0], x), dv: lerp(q[1], A[1], x), lift: 0.004 * (1 - x) }), () => c.show(false)); return; }
      const th = cutTh[k], prev = S.cut.reduce((s2, x) => s2 + x, 0), toA = ccwStart(O0, Bp(), Cp()) + prev, a0 = c.a;
      tw.to(0.42, (x) => { const e = easeOut(x); c.pose({ a: a0 + wrap(toA - a0) * e, du: lerp(q[0], O0[0], e), dv: lerp(q[1], O0[1], e), lift: 0.006 * (1 - x) + 0.0002 }); }, () => {
        sfx.clink({ freq: 1600, gain: 0.05 }); S.cut.push(th);
        const tot = S.cut.reduce((s, x) => s + x, 0), ce = central(), off = Math.abs(dist(S.A, O0) - R) > 0.002;
        if (S.cut.length === 1) { if (!S.demo) say(off ? '拼进去了一块。<b>船不在弧上</b>——这时的角不是圆周角。再剪一块看看。' : '一块，占了 ∠BOC 的一部分。再剪一块。'); return; }
        const diff = tot - ce;
        if (Math.abs(diff) < 0.012) { sfx.ding(880, { gain: 0.06 }); finish('half', `两块正好拼满 ∠BOC：<b>圆周角 ∠BAC 是圆心角 ∠BOC 的一半</b>（${fmtDeg(th)}×2＝${fmtDeg(ce)}）。船在弧上走，B、C 不动，∠BOC 不变，所以船上的角也不变。为什么一定是一半？`); return; }
        c.tint(diff > 0 ? '#f2a8a0' : '#cfe6f6');
        if (!S.demo) say(`两块${diff > 0 ? '拼多了' : '没拼满'}：船${dist(S.A, O0) < R ? '在浅滩里面' : '在浅滩外面'}，不在弧上，这个角不是圆周角。把船放回<b>虚线弧</b>上，再剪两块。`);
        later(2600, () => { copies.forEach((x) => { x.show(false); x.tint('#86c4ec'); }); S.cut = []; });
      });
    }
    function moveC(q) {
      if (S.step !== 6 || S.diam) return;          // 这一步做完了，手还没松：不再跟着鼠标走
      const opp = AB0 - Math.PI;
      let t = wrap(dirOf(q) - AC0); t = clamp(t, wrap(opp - AC0), 0.2);
      S.Ca = Math.abs(wrap(AC0 + t - opp)) < 0.05 ? opp : AC0 + t;
      S.A = onC(arcClamp(dirOf(S.A)));
      const ce = central();
      if (Math.abs(ce - Math.PI) < 0.003 && !S.diam) { S.diam = true; S.diamRun = 0; S.lastDiamA = null; sfx.ding(990, { gain: 0.06 }); layout(); say('∠BOC 成了<b>平角</b>（180°），∠BAC 就是 <b>90°</b>。拖着 <b>A</b> 在半圆上走一走：是不是处处都是直角？'); return; }
      if (!S.demo) say(`∠BOC＝${fmtDeg(ce)}，∠BAC＝${fmtDeg(theta())}：还是一半。`);
      layout();
    }

    // ================= 演示（老师投屏）：从头到尾做一遍 =================
    const path = (pts, k) => { const n = pts.length - 1, x = clamp(k, 0, 1) * n, i = Math.min(n - 1, Math.floor(x)), f = x - i; return [lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f)]; };
    const arcPath = (a0, a1, k) => onC(lerp(a0, a1, ease(clamp(k, 0, 1))));
    const shots = [
      { cap: '海上有一片浅滩，船长只看得见岸上的两座灯塔 B、C。船开得离浅滩越近，船上看两座灯塔的夹角越大。', dur: 6, enter: () => { S.step = 1; S.A = [-0.11, -0.095]; layout(); },
        during: (k) => { S.A = path([[-0.11, -0.095], [-0.06, -0.075], [-0.03, -0.045], [-0.05, -0.08], [-0.1, -0.09]], k); afterMove(); } },
      { cap: '浅滩的边是一道弧。船沿着这道弧开：夹角处处一样，都是 50°——这就是危险角。', dur: 6, enter: () => { S.step = 2; layout(); },
        during: (k) => { S.A = arcPath(3.6, 5.6, k); afterMove(); } },
      { cap: '这个角的顶点在圆上、两边都和圆相交，叫圆周角。浮标在圆心 O，从浮标看两座灯塔是 ∠BOC＝100°。', dur: 4, enter: () => { S.step = 3; S.A = onC(4.4); layout(); } },
      { cap: '把船上的角剪下来两块，拼到浮标那里：正好拼满 ∠BOC。圆周角是圆心角的一半。', dur: 6,
        during: (k) => {          // 剪两块：一块落定了再剪下一块
          const A = S.A; S.dc ||= 0;
          if (S.dc === 0 && k > 0.05) { cutStart(); S.dc = 1; }
          if (S.dc === 1) { cutDrag(path([A, mid(A, O0), O0], (k - 0.05) / 0.3)); if (k > 0.36) { cutEnd(); S.dc = 2; } }
          if (S.dc === 2 && k > 0.5 && S.cut.length === 1) { cutStart(); S.dc = 3; }
          if (S.dc === 3) { cutDrag(path([A, mid(A, O0), O0], (k - 0.5) / 0.3)); if (k > 0.82) { cutEnd(); S.dc = 4; } }
        } },
      { cap: '为什么一定是一半？把海港压回课本上的图（图 29.2-6），先看圆心在角的一条边上的情形。', dur: 4.2, enter: () => { copies.forEach((c) => c.show(false)); S.cut = []; S.step = 4; toFigure(); S.dFrom = AB0 + (((dirOf(S.A) - AB0) % TAU) + TAU) % TAU; },
        during: (k) => { if (S.case1) return; const to = AB0 + Math.PI; S.A = onC(lerp(S.dFrom, to, ease(clamp((k - 0.3) / 0.55, 0, 1)))); layout(); if (k > 0.9) { S.A = sub(mul(O0, 2), Bp()); S.case1 = true; playProof(); } } },
      { cap: 'OA＝OC（都是半径），所以 △AOC 的两个底角 ∠A、∠C 相等。', dur: 4.4 },
      { cap: '∠BOC 是 △AOC 的外角，等于两个底角的和：正好两个 ∠A，∠BOC＝2∠A。', dur: 3.8 },
      { cap: '圆心在角的里面、外面时，过 A 作直径 AD：两块相加或相减，每块都是一半，合起来还是一半。', dur: 7, enter: () => { copies.forEach((c) => c.show(false)); S.proof = 0; S.step = 5; layout(); },
        during: (k) => { S.A = onC(arcClamp(lerp(3.3, 5.9, ease(k)))); afterMove(); } },
      { cap: 'BC 成了直径：∠BOC＝180°，圆周角是 90°——半圆所对的圆周角是直角。', dur: 5, enter: () => { S.step = 6; S.A = onC((240 * Math.PI) / 180); layout(); },
        during: (k) => { S.Ca = lerp(AC0, AB0 - Math.PI, ease(clamp(k / 0.6, 0, 1))); if (k > 0.6) S.diam = true; S.A = onC(arcClamp(dirOf(S.A))); layout(); } },
      { cap: '回到海上：开进浅滩，夹角比危险角大；在外面，比危险角小。演示完了，下面换你自己做。', dur: 8, enter: () => { S.step = 7; toHarbor(); },
        during: (k) => { S.A = path([[0.06, -0.093], [0.02, -0.04], [0.0, -0.03], [0.05, -0.1], [0.09, -0.098]], k); afterMove(); } },
    ];

    const drags = [
      { obj: K.cut, plane: 'xz', offset: 0.003, hint: () => '按住拖出来：剪下这个角', enabled: () => S.step === 3 && S.cut.length < 2 && !tw.busy && !S.demo, onStart: () => cutStart(), onDrag: (p) => cutDrag([p.x, -p.z]), onEnd: () => cutEnd() },
      { obj: K.A, plane: 'xz', offset: 0.003, keepOffset: false, hint: () => (S.mode === 'fig' ? '拖着 A 在圆上走' : '拖着小船开'), enabled: () => !tw.busy && (S.step !== 6 || S.diam) && carrying < 0 && !S.proof && !S.demo, onDrag: (p) => moveBoat([p.x, -p.z]), onEnd: () => releaseA() },
      { obj: K.C, plane: 'xz', offset: 0.003, keepOffset: false, hint: () => '拖着 C 在圆上走', enabled: () => S.step === 6 && !S.diam && !tw.busy && !S.demo, onDrag: (p) => moveC([p.x, -p.z]) },
    ];
    DEMO.shots = shots;
    const pointer = wrapPointer(draggable(group, drags, { onClick: (ray) => ray.intersectObject(base, false).length > 0 }), bar);

    layout();
    return {
      group, card: false, place: 'spread', scale: 0.92,
      size: { w: W, d: D, h: 0.04 },
      view: { elev: 60, azim: 0, lookY: 0, frameMargin: 1.06 },
      pointer,
      reelShots: shots,
      mount(u) { ui = u; bar.attach(u); },
      dispose() { dead = true; bar.dispose(); },
      update(dt) {
        const k = bar.update(dt);
        tw.update(dt * k); tickQueue(dt * k);
        const t = performance.now() / 1000;
        for (const n of ['B', 'C']) LH[n].userData.lamp.material.emissiveIntensity = 0.55 + 0.45 * Math.sin(t * 2.2 + (n === 'B' ? 0 : 1.3)) ** 2;
        boat.position.y = 0.0004 + 0.0004 * Math.sin(t * 2.1); boat.rotation.x = 0.05 * Math.sin(t * 1.7); boat.rotation.z = 0.035 * Math.sin(t * 2.3 + 0.6);
      },
      test: { S: () => S, bar, moveBoat, moveC, cutStart, cutDrag, cutEnd, theta, central, caseOf, layout, toFigure, toHarbor },
      debug: {
        get S() { return S; }, bar,
        qa: [
          { name: '开船：开近浅滩再开远', run: () => { for (const q of [[-0.05, -0.07], [-0.03, -0.05], [-0.015, -0.032], [-0.06, -0.08], [-0.115, -0.093]]) moveBoat(q); }, wait: 1 },
          { name: '沿着弧开', run: () => { for (const d of [200, 215, 235, 255, 275, 295, 310]) moveBoat(onC((d * Math.PI) / 180)); }, wait: 1 },
          { name: '剪第一块，拼到浮标', run: () => { cutStart(); cutDrag(O0); cutEnd(); }, wait: 2 },
          { name: '剪第二块', run: () => { cutStart(); cutDrag(O0); cutEnd(); }, wait: 16 },
          { name: 'A 拖到 B 的正对面（证明）', run: () => moveBoat(sub(mul(O0, 2), Bp())), wait: 40 },
          { name: '圆心在角里面', run: () => { for (const d of [300, 270, 240, 230]) moveBoat(onC((d * Math.PI) / 180)); releaseA(); }, wait: 1 },
          { name: '圆心在角外面', run: () => { for (const d of [260, 300, 330, 345]) moveBoat(onC((d * Math.PI) / 180)); releaseA(); }, wait: 2 },
          { name: 'C 拖到 B 的正对面', run: () => { for (const d of [20, 0, -20, -40]) moveC(onC((d * Math.PI) / 180)); }, wait: 1 },
          { name: '在半圆上拖 A', run: () => { for (const d of [200, 230, 260, 280]) moveBoat(onC((d * Math.PI) / 180)); }, wait: 10 },
          { name: '开进浅滩', run: () => { moveBoat([0.03, -0.06]); moveBoat([0.0, -0.035]); }, wait: 1 },
          { name: '开到外面', run: () => { moveBoat([0.06, -0.09]); moveBoat([0.1, -0.098]); }, wait: 2 },
        ],
      },
    };
  },
};
