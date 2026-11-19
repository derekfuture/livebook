// 数学 九年级上册 29.2.3 圆周角 · 图29.2-5（课本第 127–128 页）。情境用第 133 页 习题29.2 第 14 题：夜里的海港、两座灯塔、浅滩、危险角。
//
// 一个夜色的纸剧场盒子放在课本上。没有步骤栏、没有演示：学生（或在投影上讲课的老师）自己开船，问题跟着看到的东西冒出来。
//   好奇：夜里看不见礁石，只看得见两盏灯——怎么知道离礁石还有多远？
//   探索：开船。两座灯塔的光照到船上，两道光的夹角就是船上看两座灯塔的角；每次正好等于危险角，船就放下一盏河灯——河灯连成一个圆。
//   思考：从浮标（圆心）看是两倍——剪下船上的光扇两块，亲手拼满；一束光正好照过浮标时，两根一样长的绳子讲出为什么（课本情况（1）），
//         浮标在两束光中间、外面时拆成两块相加或相减；开进圈里夹角变大、开出圈外变小（第 14 题的道理）。
//   数学之美：点一下海面，整片海按“在这里看两座灯塔是多少度”画出一圈圈的线，全都穿过两座灯塔；90° 那一圈正好以两座灯塔为直径。
// 两个视角：从上往下看（海图，和课本的图一样）、站到船头（点小船；船头手边那卷海图点一下就回来）。键盘 R：清场重来（给老师）。
// 所有角度、圆、等角线都按真实几何算出来。
import * as THREE from 'three';
import { arcPts, add, sub, mul, unit, ang, mid, dist, wrap, clamp, lerp, easeOut } from './kit/sheet.js';
import { draggable } from './kit/interact.js';
import { sfx, audio } from './kit/audio.js';

// ---- 几何（纸面坐标 u 向右、v 向里；三维里是 (u, y, −v)） ----
const B0 = [-0.06, 0.05], C0 = [0.06, 0.05];                 // 两座灯塔
const DANGER = (40 * Math.PI) / 180;                          // 危险角
const O = [0, 0.05 - 0.06 / Math.tan(DANGER)], R = 0.06 / Math.sin(DANGER);   // 过两座灯塔、圆周角是 40° 的圆：圆心（浮标）、半径
const SEA = { u0: -0.172, u1: 0.172, v0: -0.132, v1: 0.05 };  // 海（岸在 v = 0.05）
const TAU = Math.PI * 2, DEG = 180 / Math.PI;
const P3 = (p, y = 0) => new THREE.Vector3(p[0], y, -p[1]);
const angAt = (V, P, Q) => Math.abs(wrap(ang(sub(Q, V)) - ang(sub(P, V))));
const ccwStart = (V, P, Q) => { const a = ang(sub(P, V)), b = ang(sub(Q, V)); return wrap(b - a) > 0 ? a : b; };
const fmt = (r) => `${Math.round(r * DEG)}°`;
const onCirc = (t) => [O[0] + R * Math.cos(t), O[1] + R * Math.sin(t)];
const dirO = (p) => Math.atan2(p[1] - O[1], p[0] - O[0]);
const AB = dirO(B0), AC = dirO(C0) + TAU;                     // 圆在海里的那段弧：从 B 逆时针经过最下面到 C
const inSea = (p) => p[0] > SEA.u0 + 0.008 && p[0] < SEA.u1 - 0.008 && p[1] > SEA.v0 + 0.008 && p[1] < SEA.v1 - 0.012;
const central = () => angAt(O, B0, C0);

export default {
  id: 'inscribed',
  fig: '图29.2-5',
  title: '圆周角',
  flow: 'explore',
  ask: '夜里看不见水下的礁石，只看得见岸上的两盏灯。<br>怎么知道船离礁石还有多远？',
  need: '开船找一找：河灯连成了什么？从浮标看又是多少度？',
  conclusion: {
    page: 134, rect: [40, 548, 368, 690],
    quote: '一条弧所对的圆周角等于它所对的圆心角的一半。同弧或等弧所对的圆周角相等。半圆（或直径）所对的圆周角是直角，90°的圆周角所对的弦是直径。',
    why: '船在浅滩边那道弧上走，两座灯塔不动，从浮标（圆心）看两座灯塔的角就不变；船上的角是它的一半，所以也不变——同弧所对的圆周角相等。<br><br>为什么是一半：一束光正好照过浮标时，浮标到船、到另一座灯塔的两根绳子一样长（都是半径），两个底角相等；浮标那里的角是这个三角形的外角，等于两个底角的和，正好两倍。光从浮标旁边擦过时，过船拉一根穿过浮标的直径，把角拆成两块相加或相减，每块都是一半，合起来还是一半。<br><br>两座灯塔正好是直径两端的那一圈，处处都是 90°：半圆所对的圆周角是直角。<br><br>开进圈里，船上的角是圆上的角再加一块（三角形的外角），比危险角大；开到圈外，是圆上的角减去一块，比危险角小——所以只要量出的角小于危险角，船就在浅滩外面（课本第 133 页第 14 题）。',
    src: '课本第 127–128 页 · 第二十九章 29.2.3 圆周角；第 133 页 习题 29.2 第 14 题',
  },

  create({ look, back, camera }) {
    const group = new THREE.Group();
    let ui = null, dead = false;
    const T0 = performance.now();
    const now = () => (performance.now() - T0) / 1000;
    const later = (ms, f) => setTimeout(() => { if (!dead) f(); }, ms);

    // ================= 夜色：盒子里的东西都自己带颜色（不受桌上的日光影响） =================
    const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    const basic = (o) => new THREE.MeshBasicMaterial(o);
    const quiet = (m) => { m.raycast = () => {}; m.userData.noFrame = true; return m; };
    // 没有光照的材质做一点“月光”明暗：按面朝向给顶点上色
    const MOON = new THREE.Vector3(-0.35, 0.8, 0.5).normalize();
    const shaded = (geo, color, lo = 0.42, hi = 1.0) => {
      const g = geo.index ? geo.toNonIndexed() : geo; g.computeVertexNormals();
      const n = g.attributes.normal, col = new Float32Array(n.count * 3), c = new THREE.Color(color), v = new THREE.Vector3();
      for (let i = 0; i < n.count; i++) { v.fromBufferAttribute(n, i); const k = lo + (hi - lo) * Math.max(0, v.dot(MOON)); col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      return new THREE.Mesh(g, basic({ vertexColors: true }));
    };
    const glowTex = tex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,232,170,1)'); r.addColorStop(0.28, 'rgba(255,196,110,0.5)'); r.addColorStop(1, 'rgba(255,170,80,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
    const halo = (s, o = 1) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: o })); sp.scale.set(s, s, 1); return quiet(sp); };

    // ---- 盒底：一张深色的纸，海画在上面 ----
    const floor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.004, 0.27), [0, 1, 2, 3, 4, 5].map((i) => basic({ color: i === 2 ? 0x0d1a26 : 0x1a2433 })));
    floor.position.set(0, -0.002, 0.005); floor.userData.qaSupport = true; floor.raycast = () => {}; group.add(floor);
    const waves = tex(1024, 1024, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#13314a'); gr.addColorStop(1, '#0f2638'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) { const x = Math.random() * w, y = Math.random() * h, l = 18 + Math.random() * 46; g.strokeStyle = `rgba(170,215,230,${0.05 + Math.random() * 0.16})`; g.lineWidth = 1.2 + Math.random() * 1.6; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 3, x + l, y); g.stroke(); }
    });
    waves.wrapS = waves.wrapT = THREE.RepeatWrapping; waves.repeat.set(2.2, 1.2);
    const seaW = SEA.u1 - SEA.u0, seaD = SEA.v1 - SEA.v0;
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(seaW, seaD).rotateX(-Math.PI / 2), basic({ map: waves }));
    sea.position.set((SEA.u0 + SEA.u1) / 2, 0.0004, -(SEA.v0 + SEA.v1) / 2); sea.userData.noFrame = false; group.add(sea);
    // 浅滩：圆里面那片水浅一点
    const shoalPts = arcPts(O, R, AB, AC, 120).map((p) => new THREE.Vector2(p[0], p[1]));
    { const m = quiet(new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(shoalPts)).rotateX(-Math.PI / 2), basic({ color: 0x2f6d6a, transparent: true, opacity: 0.32, depthWrite: false }))); m.position.y = 0.0007; group.add(m); }
    // 礁石：露出水面的几块，周围一圈白浪
    const ROCKS = [[-0.026, -0.03, 0.0062], [0.03, -0.055, 0.0052], [-0.04, -0.072, 0.0045], [0.01, -0.012, 0.0042], [0.046, -0.018, 0.0048], [-0.012, -0.088, 0.0046], [-0.052, -0.02, 0.0042], [0.02, 0.018, 0.0038]];
    const foamTex = tex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 10, 32, 32, 32); r.addColorStop(0, 'rgba(210,235,240,0)'); r.addColorStop(0.5, 'rgba(210,235,240,0.22)'); r.addColorStop(1, 'rgba(210,235,240,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
    for (const [u, v, s] of ROCKS) {
      const r = quiet(shaded(new THREE.DodecahedronGeometry(s, 0), 0x68707a, 0.4, 1.0)); r.position.set(u, s * 0.22, -v); r.scale.y = 0.6; r.rotation.set(u * 40, v * 30, u * 17); r.userData.qaSupport = true; group.add(r);          // 礁石一半泡在水里
      const f = quiet(new THREE.Mesh(new THREE.PlaneGeometry(s * 3.2, s * 3.2).rotateX(-Math.PI / 2), basic({ map: foamTex, transparent: true, depthWrite: false }))); f.position.set(u, 0.0009, -v); group.add(f);
    }
    // ---- 岸、远山、天幕 ----
    const shoreShape = new THREE.Shape(); shoreShape.moveTo(-0.18, SEA.v1); for (let k = 0; k <= 60; k++) { const u = -0.18 + (k / 60) * 0.36, ub = Math.abs(u); shoreShape.lineTo(u, SEA.v1 + (ub < 0.072 ? 0 : 0.004 + 0.003 * Math.sin(u * 140))); } shoreShape.lineTo(0.18, 0.135); shoreShape.lineTo(-0.18, 0.135); shoreShape.closePath();
    group.add(quiet(new THREE.Mesh(new THREE.ExtrudeGeometry(shoreShape, { depth: 0.004, bevelEnabled: false }).rotateX(-Math.PI / 2), [basic({ color: 0x3b3a3c }), basic({ color: 0x2b2a2e })])));
    const hill = (v, h, col, seed) => { const s = new THREE.Shape(); s.moveTo(-0.19, 0); for (let i = 0; i <= 60; i++) { const x = -0.19 + (i / 60) * 0.38; s.lineTo(x, h * (0.55 + 0.3 * Math.sin(x * 24 + seed) + 0.15 * Math.sin(x * 61 + seed * 2))); } s.lineTo(0.19, 0); s.closePath(); const m = quiet(new THREE.Mesh(new THREE.ShapeGeometry(s), basic({ color: col }))); m.position.set(0, 0.004, -v); group.add(m); };
    hill(0.122, 0.05, 0x1f2a42, 3); hill(0.104, 0.038, 0x2a3450, 5); hill(0.088, 0.026, 0x343a56, 7);
    // 天幕：弯的一张纸，上面深蓝、地平线暖橙，几颗星
    const skyTex = tex(2048, 640, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0b1730'); gr.addColorStop(0.5, '#233761'); gr.addColorStop(0.78, '#6f5670'); gr.addColorStop(0.92, '#d48c63'); gr.addColorStop(1, '#ecb882'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 420; i++) { const x = Math.random() * w, y = Math.random() * h * 0.55, r = Math.random() * 1.8 + 0.4; g.fillStyle = `rgba(255,248,232,${0.25 + Math.random() * 0.6})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    });
    const SKY_R = 0.2, SKY_V = -0.07, SKY_H = 0.115, SKY_A = (68 * Math.PI) / 180;
    const sky = new THREE.Mesh(new THREE.CylinderGeometry(SKY_R, SKY_R, SKY_H, 64, 1, true, Math.PI - SKY_A, SKY_A * 2), basic({ map: skyTex, side: THREE.BackSide }));
    sky.position.set(0, SKY_H / 2, -SKY_V); sky.raycast = () => {}; group.add(sky);
    // 天幕上的字：一行问题 / 发现（像剧场的字幕），下面一行小字
    const fit = (g, txt, px, weight, maxW) => { let f = px; for (; f > 20; f -= 4) { g.font = `${weight} ${f}px "Kaiti SC","STKaiti",serif`; if (g.measureText(txt).width <= maxW) break; } return f; };
    const capTex = (txt, sub2) => tex(2048, 300, (g, w) => { g.textAlign = 'center'; g.shadowColor = 'rgba(5,10,25,0.9)'; g.shadowBlur = 18; g.fillStyle = 'rgba(252,243,224,0.98)'; fit(g, txt, 104, 600, w - 120); g.fillText(txt, w / 2, 122); if (sub2) { fit(g, sub2, 62, 400, w - 120); g.fillStyle = 'rgba(244,230,204,0.9)'; g.fillText(sub2, w / 2, 232); } });
    const caption = quiet(new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.038), basic({ transparent: true, depthWrite: false, depthTest: false })));
    caption.renderOrder = 30; caption.position.set(0, 0.088, -0.11); group.add(caption);
    let capKey = '', capNow = ['', ''];
    const say = (txt, sub2 = '') => { capNow = [txt, sub2]; const k = txt + '|' + sub2; if (k === capKey) return; capKey = k; caption.material.map?.dispose?.(); caption.material.map = capTex(txt, sub2); caption.material.needsUpdate = true; subtitle(); };
    const subEl = document.createElement('div');
    subEl.style.cssText = 'position:fixed;left:50%;bottom:44px;transform:translateX(-50%);max-width:min(860px,86vw);text-align:center;pointer-events:none;font:600 22px/1.45 "Kaiti SC","STKaiti",serif;color:#fbf1dc;text-shadow:0 1px 8px rgba(0,0,0,.85),0 0 2px rgba(0,0,0,.9);opacity:0;transition:opacity .4s;z-index:20';
    document.body.append(subEl);
    const subtitle = () => {
      if (!S || S.mode !== 'deck') { subEl.style.opacity = 0; return; }
      const th = theta(), z = zone(), col = z === 'in' ? '#ff9d86' : z === 'out' ? '#b4f0c4' : '#ffe39a';
      subEl.innerHTML = `<div style="font-size:30px;color:${col}">两盏灯之间 ${fmt(th)}<span style="font-size:18px;color:#efe1c2;margin-left:14px">危险角 ${fmt(DANGER)}</span></div><div>${capNow[0]}</div><div style="font-weight:400;font-size:17px;opacity:.88">按住往上拖，往前开；往两边拖，往旁边开</div>`;
      subEl.style.opacity = 1;
    };

    // ---- 灯塔 ----
    const stripe = tex(256, 256, (g, w, h) => { for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#d9d1c2' : '#a33a33'; g.fillRect(0, (i * h) / 7, w, h / 7 + 1); } const sh = g.createLinearGradient(0, 0, w, 0); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.5, 'rgba(0,0,0,0.62)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.fillRect(0, 0, w, h); });
    const tower = (P) => {
      const g = new THREE.Group(); g.position.copy(P3(P));
      const foot = quiet(shaded(new THREE.CylinderGeometry(0.0062, 0.007, 0.003, 20), 0x6e675a)); foot.position.y = 0.0055;
      const body = quiet(new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0042, 0.034, 24), basic({ map: stripe }))); body.position.y = 0.024;
      const deck = quiet(shaded(new THREE.CylinderGeometry(0.0046, 0.0046, 0.001, 20), 0x2b2e36)); deck.position.y = 0.0415;
      const lamp = quiet(new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.004, 16), basic({ color: 0xfff0c2 }))); lamp.position.y = 0.0444;
      const roof = quiet(shaded(new THREE.ConeGeometry(0.0034, 0.0042, 20), 0x7e2b26)); roof.position.y = 0.0487;
      const h = halo(0.036); h.position.y = 0.0444;
      // 一道慢慢扫过海面的光柱（只是气氛）
      const beam = quiet(new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.14, 24, 1, true).translate(0, -0.07, 0).rotateZ(Math.PI / 2), basic({ color: 0xffe2a0, transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })));
      beam.position.y = 0.0444;
      g.add(foot, body, deck, lamp, roof, h, beam); g.userData = { halo: h, beam }; group.add(g); return g;
    };
    const LH = [tower(B0), tower(C0)];
    // ---- 浮标（圆心） ----
    const buoy = new THREE.Group();
    { const b = shaded(new THREE.ConeGeometry(0.0042, 0.008, 18), 0xb5413a, 0.5, 1.0); b.position.y = 0.004; const top = new THREE.Mesh(new THREE.SphereGeometry(0.0015, 12, 8), basic({ color: 0xffd9a0 })); top.position.y = 0.0088; const h = halo(0.02, 0.6); h.position.y = 0.009;
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.012, 16), basic({ transparent: true, opacity: 0, depthWrite: false })); pick.position.y = 0.006; pick.userData.noFrame = true;
      buoy.add(b, top, h, pick); buoy.userData.halo = h; }
    buoy.position.copy(P3(O)); group.add(buoy);
    // ---- 小船 ----
    const boat = new THREE.Group();
    { const Lh = 0.0125, Wd = 0.0056, H = 0.004, geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([-Lh, H, 0, Lh, H, 0, -Lh * 0.55, 0, Wd * 0.5, Lh * 0.55, 0, Wd * 0.5, -Lh * 0.55, 0, -Wd * 0.5, Lh * 0.55, 0, -Wd * 0.5], 3));
      geo.setIndex([0, 2, 3, 0, 3, 1, 0, 1, 5, 0, 5, 4, 2, 4, 5, 2, 5, 3]);
      const hull = quiet(shaded(geo, 0xe7e9ee, 0.55, 1.0)); hull.material.side = THREE.DoubleSide;
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute([-Lh * 0.5, H, 0, Lh * 0.5, H, 0, 0.0008, H + 0.0112, 0], 3));
      const sail = quiet(shaded(sg, 0xf3f1ea, 0.7, 1.0)); sail.material.side = THREE.DoubleSide;
      const lan = quiet(new THREE.Mesh(new THREE.SphereGeometry(0.0012, 10, 8), basic({ color: 0xffd38a }))); lan.position.set(Lh * 0.7, H + 0.0012, 0);
      const h = halo(0.014, 0.8); h.position.copy(lan.position);
      boat.add(hull, sail, lan, h); }
    group.add(boat);

    // ================= 光、线、角、字 =================
    const bandTex = tex(64, 16, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,214,140,0)'); gr.addColorStop(0.5, 'rgba(255,214,140,1)'); gr.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const band = () => { const m = quiet(new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), basic({ map: bandTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 }))); m.position.y = 0.0012; group.add(m); return m; };
    const setBand = (m, P, Q, w) => { const d = sub(Q, P), l = Math.hypot(...d); m.position.x = (P[0] + Q[0]) / 2; m.position.z = -(P[1] + Q[1]) / 2; m.rotation.set(0, Math.atan2(d[1], d[0]) - Math.PI / 2, 0); m.scale.set(w, 1, Math.max(1e-4, l)); };
    const BAND = [band(), band()];
    // 细线（绳子、虚线、圆）：贴在水面上的细带子
    const line = (color, w, y, o = 1, dash = 0) => { const m = quiet(new THREE.Mesh(new THREE.BufferGeometry(), basic({ color, transparent: true, opacity: o, depthWrite: false }))); m.position.y = y; m.userData.w = w; m.userData.dash = dash; group.add(m); return m; };
    const setLine = (m, pts, closed = false) => {
      if (!pts || pts.length < 2) { m.visible = false; return; }
      const w = m.userData.w / 2, dash = m.userData.dash, out = [], P = closed ? [...pts, pts[0]] : pts;
      let acc = 0;
      const push = (p, q, n) => out.push(p[0] + n[0], 0, -(p[1] + n[1]), p[0] - n[0], 0, -(p[1] - n[1]), q[0] + n[0], 0, -(q[1] + n[1]), q[0] + n[0], 0, -(q[1] + n[1]), p[0] - n[0], 0, -(p[1] - n[1]), q[0] - n[0], 0, -(q[1] - n[1]));
      for (let i = 0; i < P.length - 1; i++) {
        const a = P[i], b = P[i + 1], d = sub(b, a), l = Math.hypot(...d); if (l < 1e-7) continue;
        const n = [(-d[1] / l) * w, (d[0] / l) * w];
        if (!dash) push(a, b, n);
        else { let t = 0; while (t < l - 1e-9) { const ph = (acc + t) % (dash * 2), on = ph < dash, step = Math.max(1e-6, Math.min(l - t, on ? dash - ph : dash * 2 - ph)); if (on) push(add(a, mul(d, t / l)), add(a, mul(d, (t + step) / l)), n); t += step; } acc += l; }
      }
      m.geometry.dispose(); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3)); m.geometry = g; m.visible = out.length > 0;
    };
    const L = {
      circle: line(0xffe3a8, 0.0011, 0.0016, 0.9, 0.003), OB: line(0x9fe0ff, 0.0009, 0.0015, 0.95), OC: line(0x9fe0ff, 0.0009, 0.0015, 0.95),
      rope1: line(0xd9b884, 0.0012, 0.0019), rope2: line(0xd9b884, 0.0012, 0.0019), tick1: line(0xf4e2bc, 0.0012, 0.002), tick2: line(0xf4e2bc, 0.0012, 0.002),
      diam: line(0xd9b884, 0.0009, 0.0019, 0.9, 0.0025), ext: line(0xffb35a, 0.001, 0.0018, 0.95, 0.0028), ext2: line(0xffb35a, 0.001, 0.0018, 0.95),
    };
    // 扇形（一块光）
    const fanM = (color, opacity, y, blend = THREE.NormalBlending) => { const m = new THREE.Mesh(new THREE.BufferGeometry(), basic({ color, transparent: true, opacity, depthWrite: false, blending: blend, side: THREE.DoubleSide })); m.position.y = y; m.userData.noFrame = true; group.add(m); m.visible = false; return m; };
    const setFan = (m, apex, a0, w, r) => { const n = Math.max(6, Math.ceil(Math.abs(w) / 0.05)), pos = []; for (let i = 0; i < n; i++) { const t0 = a0 + (w * i) / n, t1 = a0 + (w * (i + 1)) / n; pos.push(0, 0, 0, Math.cos(t0) * r, 0, -Math.sin(t0) * r, Math.cos(t1) * r, 0, -Math.sin(t1) * r); } m.geometry.dispose(); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); m.geometry = g; m.position.x = apex[0]; m.position.z = -apex[1]; m.visible = true; };
    const F = { ship: fanM(0xffcf7a, 0.42, 0.0013, THREE.AdditiveBlending), buoy: fanM(0x7fd3ff, 0.36, 0.0012, THREE.AdditiveBlending), sub1: fanM(0xffe7b0, 0.5, 0.0017), sub2: fanM(0xbfeaff, 0.5, 0.0016), q: fanM(0xffcf7a, 0.42, 0.0013, THREE.AdditiveBlending), x: fanM(0xff9b4a, 0.6, 0.0017) };
    for (const k in F) F[k].raycast = () => {};
    // 能拿起来拖的光扇（剪下来的、证明里的两个底角）
    const chips = [0, 1].map(() => fanM(0xffd88a, 0.85, 0.0024));
    // 字：朝着镜头的牌子（先量字宽再画）
    const measure = (font, txt) => { const g = document.createElement('canvas').getContext('2d'); g.font = font; return g.measureText(txt).width; };
    const labTex = (txt, col, px = 64) => { const f = `600 ${px}px "Times New Roman","Kaiti SC","STKaiti",serif`; return tex(Math.ceil(measure(f, txt)) + 40, Math.round(px * 1.5), (g, w, h) => { g.font = f; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = px * 0.16; g.strokeStyle = 'rgba(8,16,28,0.85)'; g.strokeText(txt, w / 2, h / 2 + 2); g.fillStyle = col; g.fillText(txt, w / 2, h / 2 + 2); }); };
    const label = (hgt) => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }))); sp.renderOrder = 20; sp.userData.h = hgt; sp.userData.k = ''; group.add(sp); sp.visible = false; return sp; };
    const setLabel = (sp, txt, col, p, y = 0.008) => { if (!txt) { sp.visible = false; return; } const k = txt + col; if (sp.userData.k !== k) { sp.userData.k = k; const t = labTex(txt, col); sp.material.map?.dispose?.(); sp.material.map = t; sp.material.needsUpdate = true; sp.scale.set((sp.userData.h * t.image.width) / t.image.height, sp.userData.h, 1); } sp.position.set(p[0], y, -p[1]); sp.visible = true; };
    const LB = { ship: label(0.013), buoy: label(0.011), q: label(0.009), a: label(0.008), o: label(0.008) };
    // 海面上的批注（船长在海图上写的）：躺在水面上的手写字
    const NF = '600 46px "Kaiti SC","STKaiti",serif';
    const noteTex = (txt) => tex(Math.ceil(measure(NF, txt)) + 48, 76, (g, w, h) => { g.font = NF; g.textBaseline = 'middle'; g.shadowColor = 'rgba(4,14,28,0.95)'; g.shadowBlur = 12; g.fillStyle = 'rgba(248,236,206,0.96)'; g.fillText(txt, 24, h / 2 + 2); g.shadowBlur = 4; g.fillText(txt, 24, h / 2 + 2); });
    const notes = []; let dblNote = null;
    const note = (txt, p) => { const t = noteTex(txt), hgt = 0.0084; const m = quiet(new THREE.Mesh(new THREE.PlaneGeometry((hgt * t.image.width) / t.image.height, hgt).rotateX(-Math.PI / 2), basic({ map: t, transparent: true, depthWrite: false, opacity: 0 }))); m.position.set(p[0], 0.0021, -p[1]); m.userData.born = now(); m.userData.txt = txt; group.add(m); notes.push(m); return m; };
    // 河灯
    const lanterns = [];
    const lanternMat = basic({ color: 0xffd28a });
    const dropLantern = (p) => {
      if (lanterns.some((l) => dist(l.p, p) < 0.011)) return;
      const g = new THREE.Group(), body = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0028, 0.0036, 10), lanternMat), h = halo(0.017, 0.9);
      body.position.y = 0.0021; h.position.y = 0.003; body.userData.noFrame = true; g.add(body, h); g.position.copy(P3(p)); g.userData.born = now(); group.add(g); lanterns.push({ p, g, body });
      sfx.ding(1180 + Math.random() * 160, { gain: 0.035, decay: 0.6 });
    };
    // 整片海的等角线（点海面才出来）：着色器算每一点“看两座灯塔是多少度”，每 10° 一条
    const contour = quiet(new THREE.Mesh(new THREE.PlaneGeometry(seaW, seaD).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { B: { value: new THREE.Vector2(B0[0], -B0[1]) }, C: { value: new THREE.Vector2(C0[0], -C0[1]) }, th0: { value: DANGER * DEG }, k: { value: 0 }, inv: { value: new THREE.Matrix4() } },
      vertexShader: 'uniform mat4 inv; varying vec2 w; void main(){ vec4 p = modelMatrix * vec4(position, 1.); w = (inv * p).xz; gl_Position = projectionMatrix * viewMatrix * p; }',
      fragmentShader: `uniform vec2 B; uniform vec2 C; uniform float th0; uniform float k; varying vec2 w;
        void main(){
          vec2 a = normalize(B - w), b = normalize(C - w);
          float d = degrees(acos(clamp(dot(a, b), -1., 1.)));
          float fw = fwidth(d) + 1e-4;
          float f = abs(fract(d / 10. + .5) - .5) * 10.;
          float ln = 1. - smoothstep(0., fw * 1.3, f);
          float dg = 1. - smoothstep(0., fw * 2.2, abs(d - th0));
          float rt = 1. - smoothstep(0., fw * 2.2, abs(d - 90.));
          vec3 col = vec3(1., .78, .42) * ln * .5 + vec3(1., .86, .55) * dg * 1.1 + vec3(.75, .9, 1.) * rt;
          gl_FragColor = vec4(col * k, 1.);
        }` })));
    contour.position.copy(sea.position).setY(0.0011); contour.visible = false; group.add(contour);
    const conLabs = [20, 30, 60, 90].map(() => label(0.0085)), conDanger = label(0.0095);
    // 等角线上放度数的地方：那一圈在海里、偏左下的一点
    const conAt = (d) => { const t = (d * Math.PI) / 180, r = 0.06 / Math.sin(t), c = [0, 0.05 - 0.06 / Math.tan(t)]; for (const a of [-1.7, -2.0, -2.3, -2.6, -2.9]) { const p = [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]; if (inSea(p)) return p; } return null; };

    // ================= 状态 =================
    const fresh = () => ({ ship: [0.11, -0.108], head: Math.PI * 0.75, mode: 'chart', circle: 0, buoy: 0, cut: [], proof: 0, proofDone: false, caseShow: false, cases: {}, family: 0, inOut: {}, done: false });
    let S = fresh();
    const theta = (p = S.ship) => angAt(p, B0, C0);
    const zone = () => { const r = dist(S.ship, O); return r < R - 0.0012 ? 'in' : r > R + 0.0012 ? 'out' : 'on'; };
    const arcSpread = () => { const ts = lanterns.map((l) => dirO(l.p)).sort((a, b) => a - b); let gap = 0; for (let i = 0; i < ts.length; i++) gap = Math.max(gap, (ts[(i + 1) % ts.length] - ts[i] + TAU) % TAU); return ts.length < 2 ? 0 : TAU - gap; };

    // 问题跟着看到的东西冒出来（不按顺序，也可以只玩一部分）
    function story() {
      const n = lanterns.length;
      if (!S.circle) {
        if (n === 0) return say('夜里看不见礁石，只看得见两盏灯。怎么知道离礁石还有多远？', `海图上说：两盏灯在眼里分开超过 ${fmt(DANGER)}，就进浅滩了。拖着小船开一开，点小船站到船头`);
        if (n < 5 || arcSpread() < 1.0) return say(`两盏灯之间正好 ${fmt(DANGER)} 的地方，船放下了一盏河灯`, '多开几个地方，看河灯都放在哪里');
        return say('这些河灯连起来，是什么形状？', '点一盏河灯看看');
      }
      if (S.circle < 1) return;
      if (!S.buoy) return say(`看两盏灯正好 ${fmt(DANGER)} 的地方，都在一个穿过两座灯塔的圆上`, '浅滩中间那个浮标，正好在圆心。从浮标看两座灯塔呢？点浮标');
      if (S.cut.length < 2) return say(`从浮标看是 ${fmt(central())}——正好两倍？`, '把船开到圆上，按住船边那块光，剪下来拖到浮标那里比一比（剪两块）');
      if (S.proof && !S.proofDone) return say('浮标到船、到那座灯塔，两根绳子一样长——都是半径', '所以这两个角相等。把它们拖到浮标那里，拼一拼');
      if (S.proof) return say('浮标这个角是外角，等于两个底角的和', '两个底角都等于船上看到的角——所以正好两倍');
      if (!S.proofDone) return say('为什么正好是两倍？', '开到让一座灯塔的光正好照过浮标的地方——那里最好想');
      if (!S.family) return say('圆上的角都是浮标那个角的一半，所以处处一样', '开进圈里、开出圈外看看；点浮标，看光从浮标旁边擦过时；点一下海面：每个地方看两盏灯是多少度？');
      return say('一圈一圈，全都穿过两座灯塔', '标着 90° 的那一圈：两座灯塔正好是它直径的两端（相传泰勒斯最早证明了它）');
    }

    // ================= 画 =================
    const bis = (p, q0, q1, r) => { const u0 = unit(sub(q0, p)), u1 = unit(sub(q1, p)), s2 = add(u0, u1); return add(p, mul(Math.hypot(...s2) < 1e-3 ? [-u0[1], u0[0]] : unit(s2), r)); };
    function layout() {
      const A = S.ship, th = theta(), z = zone();
      boat.position.copy(P3(A)); boat.rotation.y = S.head;
      setBand(BAND[0], B0, A, 0.0042); setBand(BAND[1], C0, A, 0.0042);
      setFan(F.ship, A, ccwStart(A, B0, C0), th, 0.018);
      setLabel(LB.ship, fmt(th), z === 'in' ? '#ff8a72' : z === 'out' ? '#9fe6b0' : '#ffe39a', bis(A, B0, C0, 0.03), 0.01);
      // 圆（从 B 经过最下面画到 C）、浮标的角
      setLine(L.circle, S.circle > 0 ? arcPts(O, R, AB, AB + (AC - AB) * easeOut(S.circle), 160) : null);
      const bk = S.buoy;
      setLine(L.OB, bk ? [O, B0] : null); setLine(L.OC, bk ? [O, C0] : null);
      if (bk) { setFan(F.buoy, O, ccwStart(O, B0, C0), central(), 0.022); setLabel(LB.buoy, fmt(central()), '#bfe9ff', bis(O, B0, C0, 0.034), 0.01); } else { F.buoy.visible = false; LB.buoy.visible = false; }
      // 证明：一束光照过浮标时——浮标到船、到另一座灯塔的两根绳子（都是半径）
      const pf = S.proof;
      if (pf) {
        setLine(L.rope1, [O, A]); setLine(L.rope2, [O, pf.other]);
        const tick = (p, q) => { const m = mid(p, q), n = mul(unit([-(q[1] - p[1]), q[0] - p[0]]), 0.003); return [sub(m, n), add(m, n)]; };
        setLine(L.tick1, tick(O, A)); setLine(L.tick2, tick(O, pf.other));
        setLabel(LB.a, 'A', '#f3e3c0', add(A, mul(unit(sub(A, O)), 0.013)), 0.006); setLabel(LB.o, 'O', '#f3e3c0', add(O, [0.007, -0.008]), 0.006);
      } else { for (const k of ['rope1', 'rope2', 'tick1', 'tick2']) setLine(L[k], null); LB.a.visible = LB.o.visible = false; }
      // 拆成两块：过船拉一根穿过浮标的直径 AD
      if (S.caseShow && z === 'on') {
        const D = sub(mul(O, 2), A); setLine(L.diam, [A, D]);
        setFan(F.sub1, A, ang(sub(B0, A)), wrap(ang(sub(D, A)) - ang(sub(B0, A))), 0.012);
        setFan(F.sub2, O, ang(sub(B0, O)), wrap(ang(sub(D, O)) - ang(sub(B0, O))), 0.016);
      } else { setLine(L.diam, null); F.sub1.visible = F.sub2.visible = false; }
      // 第 14 题：圈里 / 圈外——延长一座灯塔到船的线，交圆于 Q
      const sh = S.proofDone && z !== 'on' && !S.proof ? shoalFig() : null;          // 证完“一半”以后才拿来讲圈里圈外（天幕上那句也是这时候才请学生开进开出）
      if (sh) {
        setLine(L.ext, [sh.P, sh.far]); setLine(L.ext2, [sh.Q, sh.R2]);
        setFan(F.q, sh.Q, ccwStart(sh.Q, sh.P, sh.R2), angAt(sh.Q, sh.P, sh.R2), 0.012); setFan(F.x, sh.R2, ccwStart(sh.R2, sh.Q, A), angAt(sh.R2, sh.Q, A), 0.013);
        setLabel(LB.q, `Q ${fmt(DANGER)}`, '#ffe39a', add(sh.Q, mul(unit(sub(sh.Q, O)), 0.013)), 0.006);
      } else { setLine(L.ext, null); setLine(L.ext2, null); F.q.visible = F.x.visible = false; LB.q.visible = false; }
      // 等角线
      contour.visible = S.family > 0; contour.material.uniforms.k.value = easeOut(S.family);
      [20, 30, 60, 90].forEach((d, i) => { const p = S.family > 0.5 ? conAt(d) : null; if (p) setLabel(conLabs[i], `${d}°`, d === 90 ? '#d8ecff' : '#ffd99a', p, 0.006); else conLabs[i].visible = false; });
      if (S.family > 0.5) setLabel(conDanger, `危险角 ${fmt(DANGER)}`, '#ffe7a3', [O[0] - R - 0.024, O[1] - 0.01], 0.006); else conDanger.visible = false;
      K.ship.position.copy(P3(A, 0.004)); K.cut.position.copy(P3(bis(A, B0, C0, 0.012), 0.0042));
      if (S.mode === 'deck') {
        for (const sp of [...Object.values(LB), ...conLabs, conDanger]) sp.visible = false;
        for (const m of [F.ship, F.buoy, F.sub1, F.sub2, F.q, F.x, L.OB, L.OC, L.rope1, L.rope2, L.tick1, L.tick2, L.diam, L.ext, L.ext2, ...chips]) m.visible = false;
      }
      for (const n of notes) n.visible = S.mode !== 'deck';
    }
    function shoalFig() {          // 延长 P（一座灯塔）到船的线，和圆的另一个交点 Q；R2 是另一座灯塔
      const A = S.ship, inside = dist(A, O) < R;
      for (const [P, R2] of [[B0, C0], [C0, B0]]) {
        const dir = unit(sub(A, P)), t = -2 * ((P[0] - O[0]) * dir[0] + (P[1] - O[1]) * dir[1]);
        if (t < 0.004) continue;
        if (!inside && t > dist(A, P) - 0.002) continue;
        const Q = add(P, mul(dir, t)); if (Q[1] > SEA.v1 - 0.006) continue;
        return { P, R2, Q, far: inside ? Q : A, inside };
      }
      return null;
    }

    // ================= 动手 =================
    const K = { ship: new THREE.Mesh(new THREE.CircleGeometry(0.011, 20).rotateX(-Math.PI / 2), basic({ visible: false })), cut: new THREE.Mesh(new THREE.CircleGeometry(0.0085, 16).rotateX(-Math.PI / 2), basic({ visible: false })) };
    for (const k in K) { K[k].userData.pick = true; K[k].userData.noFrame = true; group.add(K[k]); }
    const uv = (p) => [p.x, -p.z];
    function moveShip(q) {
      if (!inSea(q)) q = [clamp(q[0], SEA.u0 + 0.009, SEA.u1 - 0.009), clamp(q[1], SEA.v0 + 0.009, SEA.v1 - 0.013)];
      if (S.circle >= 1 && Math.abs(dist(q, O) - R) < 0.0035) q = onCirc(dirO(q));          // 圆画出来以后：靠近了就吸在圆上
      if (S.buoy && !S.proofDone) for (const P of [B0, C0]) { const anti = sub(mul(O, 2), P); if (dist(q, anti) < 0.0065) q = anti; }      // 一束光正好照过浮标的那一点：吸过去
      const prev = S.ship, mv = sub(q, prev);
      if (S.proof && S.proofDone && dist(q, prev) > 1e-4) { S.proof = 0; chips.forEach((x) => (x.visible = false)); ui?.unlock?.(); }          // 证完了，船一开走，证明用的绳子和角就收起来
      if (Math.hypot(...mv) > 1e-5) S.head = lerp(S.head, S.head + wrap(Math.atan2(mv[1], mv[0]) - S.head), 0.3);
      S.ship = q;
      // 每次正好等于危险角（两次位置之间跨过去的那一点），船就放下一盏河灯：二分找到那一点，它一定落在圆上
      const s0 = theta(prev) - DANGER, s1 = theta() - DANGER;
      if (s0 * s1 <= 0 && Math.abs(s0 - s1) > 1e-7) { let a = prev, b = q; for (let i = 0; i < 26; i++) { const m = mid(a, b); if ((theta(m) - DANGER) * s0 <= 0) b = m; else a = m; } const p = mid(a, b); if (p[1] < SEA.v1 - 0.004) dropLantern(p); }
      if (S.circle >= 1) S.inOut[zone()] = true;
      if (S.caseShow) S.caseShow = false;
      layout(); checkProof(); story(); subtitle();
    }
    // 一束光正好照过浮标：开始讲为什么（课本情况（1））
    function checkProof() {
      if (!S.buoy || S.proofDone || S.proof || S.cut.length < 2) return;
      for (const [P, other] of [[B0, C0], [C0, B0]]) {
        if (dist(S.ship, sub(mul(O, 2), P)) > 1e-6) continue;
        const A = S.ship, X = other;
        S.proof = { P, other, placed: [], base: [{ at: A, a0: ccwStart(A, O, X), w: angAt(A, O, X) }, { at: X, a0: ccwStart(X, O, A), w: angAt(X, O, A) }] };
        S.proof.base.forEach((b, i) => { setFan(chips[i], b.at, b.a0, b.w, 0.016); chips[i].userData = { home: b.at, a0: b.a0, w: b.w, kind: 'base' }; chips[i].position.y = 0.0024; });
        sfx.clink({ freq: 1500, gain: 0.05 });
        if (dblNote) dblNote.userData.fade = now();
        layout(); return;
      }
    }
    // 剪光扇、拖底角：放到浮标附近就拼进浮标那里的角
    let held = -1;
    function cutDown() {
      if (!S.buoy || S.cut.length >= 2 || S.proof || held >= 0) return false;
      const i = S.cut.length, A = S.ship, w = theta();
      setFan(chips[i], A, ccwStart(A, B0, C0), w, 0.018); chips[i].userData = { home: A, a0: ccwStart(A, B0, C0), w, kind: 'cut' }; chips[i].position.y = 0.006;
      held = i; sfx.whoosh({ dur: 0.18, freq: 2600, gain: 0.05 }); return true;
    }
    function chipDown(i) { if (S.proof && !S.proofDone && chips[i].visible && !S.proof.placed.includes(i)) { held = i; return true; } return false; }
    function chipMove(q) { if (held < 0) return; const c = chips[held]; c.position.x = q[0]; c.position.z = -q[1]; c.position.y = 0.006; }
    function chipUp() {
      if (held < 0) return; const i = held, c = chips[i], u = c.userData, q = [c.position.x, -c.position.z]; held = -1;
      if (dist(q, O) > 0.03) { c.position.set(u.home[0], 0.0024, -u.home[1]); if (u.kind === 'cut') c.visible = false; return; }
      const list = u.kind === 'cut' ? S.cut : S.proof.placed, prev = list.reduce((s2, k) => s2 + chips[k].userData.w, 0);
      setFan(c, O, ccwStart(O, B0, C0) + prev, u.w, u.kind === 'cut' ? 0.02 : 0.019); c.position.y = 0.0026;
      list.push(i); sfx.clink({ freq: 1600, gain: 0.05 });
      if (list.length === 2) {
        const diff = chips[list[0]].userData.w + chips[list[1]].userData.w - central();
        if (u.kind === 'cut') {
          if (Math.abs(diff) < 0.01) { sfx.ding(880, { gain: 0.06 }); dblNote = note(`浮标那里 ${fmt(central())}：正好是 ${fmt(DANGER)} 的两倍`, add(O, [0.024, -0.0195])); later(1800, () => { if (!S.proof) { chips.forEach((x) => (x.visible = false)); layout(); } }); }
          else { note(diff > 0 ? '拼多了：船不在圆上' : '没拼满：船不在圆上', add(O, [0.024, -0.0195])).userData.fade = now() + 1.4; later(2200, () => { S.cut = []; chips.forEach((x) => (x.visible = false)); layout(); story(); }); }
        } else {
          sfx.ding(940, { gain: 0.06 }); S.proofDone = true; 
          later(4500, () => { if (!S.proof) return; S.proof = 0; chips.forEach((x) => (x.visible = false)); ui?.unlock(); layout(); story(); });
        }
      }
      layout(); story();
    }
    // 点：河灯（画出圆）、浮标（看两倍 / 拆成两块）、海面（等角线）
    const grow = (key, dur, done) => { const t0 = now(); const tick = () => { if (dead) return; S[key] = Math.min(1, (now() - t0) / dur); layout(); if (S[key] < 1) requestAnimationFrame(tick); else done?.(); }; tick(); };
    function tapLantern() { if (S.circle || lanterns.length < 5 || arcSpread() < 1.0) return; sfx.whoosh({ dur: 0.6, freq: 900, gain: 0.04 }); grow('circle', 1.6, () => { note(`看两盏灯成 ${fmt(DANGER)} 的地方：一个圆`, add(onCirc(-2.4), [-0.06, -0.008])); story(); }); }
    function tapBuoy() {
      if (S.circle < 1) return;
      if (!S.buoy) { S.buoy = 1; sfx.clink({ freq: 1300, gain: 0.05 }); layout(); story(); return; }
      if (S.proofDone && zone() === 'on') {          // 光从浮标旁边擦过：拆成两块
        S.caseShow = !S.caseShow;
        const A = S.ship, aO = ang(sub(O, A)), aB = ang(sub(B0, A)), aC = ang(sub(C0, A));
        const inside = Math.abs(wrap(aO - aB)) + Math.abs(wrap(aC - aO)) <= theta() + 1e-6;
        if (S.caseShow) { S.cases[inside ? 'in' : 'out'] = true; say(inside ? '浮标在两束光中间：船上的角拆成两块，加起来' : '浮标在两束光外面：一块减去另一块', '每一块都是浮标那里对应那块的一半，合起来还是一半'); }
        else story();
        layout();
      }
    }
    function tapSea() {
      if (!S.proofDone || S.family) return;
      sfx.whoosh({ dur: 1.2, freq: 600, gain: 0.05 });
      const t0 = now(); for (const n of notes) n.userData.fade = t0;
      grow('family', 2.4, () => { S.done = true; story(); later(7000, () => { ui?.go?.(2); ui?.fold?.(false); }); });
    }
    // 站到船头：镜头钻进盒子，从船上看两座灯塔；船头手边那卷海图点一下回来
    const chartRoll = new THREE.Group();
    const rollMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.014, 14).rotateZ(Math.PI / 2), basic({ color: 0xe9dcc0, depthTest: false, transparent: true }));
    rollMesh.renderOrder = 40;
    { const band = new THREE.Mesh(new THREE.CylinderGeometry(0.00232, 0.00232, 0.0016, 14).rotateZ(Math.PI / 2), basic({ color: 0x9b3b2c, depthTest: false, transparent: true })); band.renderOrder = 41; band.raycast = () => {};
      const t = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ map: labTex('回到海图', '#f6e8c8', 54), transparent: true, depthTest: false }))); t.scale.set(0.0105, 0.0036, 1); t.position.y = 0.0052; t.renderOrder = 41;
      chartRoll.add(rollMesh, band, t); chartRoll.visible = false; group.add(chartRoll); }
    const rollAt = (() => { const a = new THREE.Vector3(), b = new THREE.Vector3(); return (cam) => {          // 屏幕右下角往里一点、镜头前 0.15（课本单位）的地方
      cam.updateMatrixWorld(); a.set(0.6, -0.8, -1).unproject(cam); b.set(0.6, -0.8, 1).unproject(cam); b.sub(a).normalize();
      group.updateMatrixWorld(); const s1 = group.matrixWorld.getMaxScaleOnAxis();
      a.copy(cam.position).addScaledVector(b, 0.15 * s1); group.worldToLocal(a); chartRoll.position.copy(a);
      const f = new THREE.Vector3(); cam.getWorldDirection(f); chartRoll.rotation.set(0, Math.atan2(-f.x, -f.z), 0); chartRoll.rotation.z = 0.12;
    }; })();
    const eye = () => { const toward = unit(sub(mid(B0, C0), S.ship)); return { E: add(S.ship, mul(toward, -0.004)), dir: toward }; };
    function deckLook() {
      const { E, dir } = eye(), tgt = add(E, mul(dir, 0.16)), Ey = 0.011, Ty = 0.027;
      const d3 = new THREE.Vector3(E[0] - tgt[0], Ey - Ty, -(E[1] - tgt[1])), dd = d3.length();
      look([tgt[0], Ty, -tgt[1]], d3.normalize().toArray(), dd, () => { S.mode = 'chart'; chartRoll.visible = false; caption.visible = true; layout(); subtitle(); }, { minEl: 0, minZoom: 0.6 });
    }
    let deckT0 = 0;
    function toDeck() { S.mode = 'deck'; deckT0 = now(); chartRoll.visible = true; caption.visible = false; deckLook(); layout(); subtitle(); sfx.whoosh({ dur: 0.5, freq: 700, gain: 0.04 }); }
    function toChart() { S.mode = 'chart'; chartRoll.visible = false; caption.visible = true; layout(); subtitle(); back(); }
    // 船头视角里：按住拖——往上拖往前开（离灯塔近一点），左右拖往旁边开
    let deckDrag = null;
    const deckPointer = {
      down: (r, e) => { if (S.mode !== 'deck') return false; if (r.intersectObject(rollMesh, false).length) { toChart(); return true; } deckDrag = { x: e?.clientX ?? 0, y: e?.clientY ?? 0 }; return true; },
      move: (r, e) => { if (S.mode !== 'deck') return false; if (!deckDrag || !e) return true; const dx = e.clientX - deckDrag.x, dy = e.clientY - deckDrag.y; deckDrag = { x: e.clientX, y: e.clientY }; const { dir } = eye(), right = [dir[1], -dir[0]], k = 0.00022; moveShip(add(S.ship, add(mul(dir, -dy * k), mul(right, dx * k)))); deckLook(); return true; },
      up: () => { if (S.mode !== 'deck') return false; deckDrag = null; return true; },
    };
    const canShip = () => S.mode === 'chart' && !(S.proof && !S.proofDone);          // 讲证明的时候船先停在那里（光正好照过浮标），好拖那两个底角
    const canCut = () => S.mode === 'chart' && !!S.buoy && S.cut.length < 2 && !S.proof && zone() === 'on';
    const canBase = (i) => S.mode === 'chart' && !!S.proof && chips[i].visible && !S.proof.placed.includes(i);
    const canSea = () => S.mode === 'chart' && ((!S.circle && lanterns.length >= 5 && arcSpread() >= 1.0) || (S.proofDone && !S.family));
    const drags = [
      { obj: K.cut, plane: 'xz', offset: 0.0042, hint: () => (canCut() ? '按住拖出来：剪下这块光' : ''), enabled: () => canCut(), onStart: () => cutDown(), onDrag: (p) => chipMove(uv(p)), onEnd: () => chipUp() },
      ...chips.map((c, i) => ({ obj: c, plane: 'xz', offset: 0.0024, hint: () => (canBase(i) ? '拖到浮标那里' : ''), enabled: () => canBase(i), onStart: () => chipDown(i), onDrag: (p) => chipMove(uv(p)), onEnd: () => chipUp() })),
      { obj: K.ship, plane: 'xz', offset: 0.004, keepOffset: false, hint: () => (canShip() ? '拖着小船开；点一下站到船头' : ''), enabled: () => canShip(), onDrag: (p) => moveShip(uv(p)), onTap: () => toDeck() },
    ];
    const taps = [
      { obj: buoy, hint: () => (S.mode === 'chart' && S.circle >= 1 ? '点浮标' : ''), enabled: () => S.mode === 'chart' && S.circle >= 1, onTap: () => tapBuoy() },
      { obj: sea, hint: () => (!canSea() ? '' : S.circle ? '点海面：每个地方看两盏灯是多少度' : '点河灯'), enabled: () => canSea(), onTap: (ray) => { if (!S.circle) return tapLantern(); tapSea(); void ray; } },
    ];
    const dragApi = draggable(group, drags, { taps, onClick: () => false });
    let heard = false;
    const pointer = { down: (r, e) => { if (!heard) { heard = true; audio(); } return deckPointer.down(r, e) || dragApi.down(r, e); }, move: (r, e) => deckPointer.move(r, e) || dragApi.move(r, e), up: (r, e) => deckPointer.up(r, e) || dragApi.up(r, e), items: dragApi.items };

    // 清场重来（给老师：换一批学生，或者想重新讲一遍）——键盘 R
    function reset() { for (const l of lanterns) group.remove(l.g); lanterns.length = 0; for (const n of notes) group.remove(n); notes.length = 0; dblNote = null; chips.forEach((c) => (c.visible = false)); held = -1; const wasDeck = S.mode === 'deck'; S = fresh(); if (wasDeck) toChart(); layout(); story(); }
    const onKey = (e) => { if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !e.target?.closest?.('input,textarea')) reset(); };
    addEventListener('keydown', onKey);

    layout(); story();
    return {
      group, card: false, place: 'spread', scale: 0.95, panel: 'folded',
      size: { w: 0.36, d: 0.27, h: 0.12 },
      view: { elev: 56, azim: 0, lookY: 0.02, frameMargin: 1.04 },
      pointer,
      mount(u) { ui = u; },
      dispose() { dead = true; removeEventListener('keydown', onKey); subEl.remove(); },
      update() {
        const t = now();
        if (S.mode === 'deck' && chartRoll.visible) { rollAt(camera); const k = clamp((t - deckT0 - 0.6) / 0.5, 0, 1); chartRoll.traverse((o) => { if (o.material) o.material.opacity = k; }); }
        waves.offset.x = (t * 0.004) % 1; waves.offset.y = Math.sin(t * 0.3) * 0.004;
        LH.forEach((g, i) => { const f = t * 0.45 + i * 2.1, b = g.userData.beam; b.rotation.y = f; b.material.opacity = 0.07 * (S.mode === 'deck' ? 1 : 0.5 + 0.5 * Math.max(0, Math.sin(f))); g.userData.halo.material.opacity = 0.75 + 0.25 * Math.sin(t * 2.3 + i) ** 2; });
        boat.position.y = 0.0003 + 0.0004 * Math.sin(t * 2.1); boat.rotation.z = 0.04 * Math.sin(t * 1.7);
        for (const l of lanterns) { l.g.scale.setScalar(Math.min(1, (t - l.g.userData.born) / 0.6)); l.g.position.y = 0.0004 * Math.sin(t * 2 + l.p[0] * 90); }
        for (const n of notes) n.material.opacity = Math.min(0.95, (t - n.userData.born) / 1.2) * (n.userData.fade ? clamp(1 - (t - n.userData.fade) / 0.8, 0, 1) : 1);
        buoy.userData.halo.material.opacity = S.circle >= 1 && !S.buoy ? 0.5 + 0.45 * Math.sin(t * 3) ** 2 : S.proof ? 1 : 0.5;
        if (S.proof && !S.proofDone) chips.forEach((c, i) => { if (!S.proof.placed.includes(i) && held !== i) c.material.opacity = 0.6 + 0.35 * Math.sin(t * 3.2 + i) ** 2; else c.material.opacity = 0.85; });          // 两个底角一闪一闪：能拿起来
        if (S.family > 0) { group.updateMatrixWorld(); contour.material.uniforms.inv.value.copy(group.matrixWorld).invert(); }
      },
      debug: {
        get S() { return S; },
        lanterns, notes, labels: () => [...Object.values(LB), ...conLabs, conDanger], theta, central, moveShip, tapLantern, tapBuoy, tapSea, cutDown, chipDown, chipMove, chipUp, toDeck, toChart, reset, onCirc, O, B0, C0,
        qa: [
          { name: '在海上来回开，放河灯', run: () => { for (let k = 0; k <= 320; k++) { const t = (k / 320) * TAU * 2; moveShip([0.12 * Math.cos(t * 1.3), -0.04 + 0.08 * Math.sin(t)]); } }, wait: 1 },
          { name: '点一盏河灯：画出圆', run: () => tapLantern(), wait: 3 },
          { name: '点浮标', run: () => tapBuoy(), wait: 1 },
          { name: '把船放回圆上，剪两块拼到浮标', run: () => { moveShip(onCirc(-1.2)); for (let i = 0; i < 2; i++) { cutDown(); chipMove(O); chipUp(); } }, wait: 3 },
          { name: '开到一束光照过浮标的地方，拖两个底角', run: () => { moveShip(sub(mul(O, 2), B0)); for (let i = 0; i < 2; i++) { chipDown(i); chipMove(O); chipUp(); } }, wait: 4 },
          { name: '开进圈里、开出圈外', run: () => { moveShip([0.0, -0.04]); moveShip([0.13, -0.12]); }, wait: 1 },
          { name: '点海面：等角线', run: () => tapSea(), wait: 4 },
        ],
      },
    };
  },
};
