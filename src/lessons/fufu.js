// 数学 七年级上册 2.2.1 有理数的乘法（课本 PDF 第 44–45 页：两个“思考”，有理数乘法法则）。
//
// 一条东西向的乡间公路立在书上，路北边一台手摇的老电影摄影机，正对着的地方就是 0。一辆车开过，摄影机拍了下来。
// 向东为正，向西为负；车经过摄影机那一刻记作 0 秒，之后为正，之前为负。位置 = 速度 × 时间：
//   速度（蓝）是前一乘数，时间（白）是后一乘数，车在哪儿（金）就是积。近处路边那条白线就是数轴。
// 车每 1 秒走的路是一跳（蓝色的弧）：t 秒就是 |t| 跳，连着车和摄影机——小学“跳数”的乘法图，负号只管方向。
// 胶片往回放时，整个世界都倒着走：排气管把烟吸回去，烟囱把烟收回去。
// 一个画面里讲完，每一步都由学生的那一下做出来（课本的顺序、课本的话）：
//   开头的问题：往西开的车，2 秒前在哪儿？(−3) × (−2) = ？
//   思考（1）：速度 3，转摇把往回放：3 × 3 = 9 … 3 × 0 = 0，再往回，车还没到摄影机，在西边：3 × (−1) = −3（重拍 1）；
//   思考（2）：胶片停在 3 秒，拖第一跳的落点把速度调小：2 × 3 … 0 × 3 = 0，再小就往西开：(−1) × 3 = −3（重拍 2）→ 归纳；
//   思考（3）：往西开的车往回放：(−3) × 3 … (−3) × 0 = 0，再往回，它在东边：(−3) × (−1) = 3（重拍 3）→ 负数乘负数，积为正数；
//   一下子：刚才那七种速度一起出来（多次曝光），七条跳一起从车画向摄影机、同时落到 0：往东开的从西边来，往西开的从东边来；
//   往前摇，七辆车的东西向坐标同时为 0（重拍 4）→ 法则 → 答（胶片倒回 2 秒前，车在东边 6 米）。
// 史实：元代朱世杰《算学启蒙》（1299）总括·明乘除段：“同名相乘为正，异名相乘为负。”（据国家图书馆藏本第一册《总括》第六叶）
import * as THREE from 'three';
import { clamp, lerp, easeOut } from './kit/sheet.js';
import { draggable } from './kit/interact.js';
import { sfx, audio } from './kit/audio.js';

// 单位：米。x 向东；z 朝着看的人（南）；y 向上
const TOP = 1.8;                       // 地面（台基）高
const XR = 11.4;                       // 公路在 x = ±XR 处切开
const ROAD = 3.3;                      // 路半宽
const ROADY = TOP + 0.05;              // 路面高
const ZE = 2.95;                       // 数轴：近处路边那条线
const LANE = 1.6;                      // 车道：往东的车走近处（靠右行驶），往西的走远处
const ZCAM = -5.3;                     // 摄影机立在路北边
const TMAX = 3.35;                     // 胶片能摇到 −3.35 … 3.35 秒
const LY = ROADY + 0.012;              // 地上的线贴着路面
const ZA = ZE - 0.06;                  // 跳的弧所在的竖直面
const GOLD = 0xffc83d, BLUE = 0x58c4dd, WHITE = 0xffffff;          // 金：车在哪儿（积）；蓝：速度（前一乘数）；白：时间（后一乘数）、数轴
const CSS = { g: '#ffc83d', b: '#58c4dd', t: '#ffffff', w: '#ffffff' };          // 时间用白：和速度的蓝放在一个式子里，青和蓝分不清
const NUM = (n) => (n < 0 ? '−' + Math.abs(n) : String(n));
const FAC = (n) => (n < 0 ? '(−' + Math.abs(n) + ')' : String(n));          // 课本写法：负的乘数加括号
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const wrapA = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const FRONT = [[-XR, 3.7], [-11.65, 5.0], [-9.2, 5.95], [-5, 6.3], [-1, 6.05], [3, 6.35], [7, 6.0], [10.2, 5.65], [11.7, 4.8], [XR, 3.7]];
const BACK = [[XR, -3.7], [11.95, -5.6], [11.3, -8.7], [8.5, -10.4], [4, -10.0], [0, -10.7], [-4.5, -10.2], [-8.8, -10.6], [-11.5, -8.9], [-12.05, -5.6], [-XR, -3.7]];
const TREES = [-9.6, -5.0, 5.0, 9.6];          // 路北边几棵白杨（摄影机两边空出来）
const HOUSE = [-7.2, -7.9], FIELD = [1.8, 9.6, -9.3, -7.0];

export default {
  id: 'fufu',
  fig: '思考',
  title: '有理数的乘法法则',
  flow: 'explore',
  ask: '一辆车在东西方向的公路上开过，路边的摄影机拍了下来。摄影机的位置记作 0，向东为正，向西为负；车经过摄影机那一刻记作 0 秒，之后为正，之前为负。<br>车往西开，每秒 3 米。2 秒前，它在哪儿？位置 = 速度 × 时间，(−3) × (−2) 等于多少？',
  need: '转动摄影机的摇把，胶片往前、往回放；看车在哪儿。',
  conclusion: {
    page: 44, rect: [44, 308, 456, 434],
    crops: [{ page: 44, rect: [44, 308, 456, 434] }, { page: 45, rect: [60, 337, 480, 458] }],          // 两列算式（思考）和乘法法则
    quote: '两数相乘，同号得正，异号得负，且积的绝对值等于乘数的绝对值的积．任何数与 0 相乘，都得 0．',
    why: '把位置看成速度和时间的积：向东为正，向西为负；车经过摄影机那一刻为 0 秒，之后为正，之前为负。车以每秒 3 米往东开，胶片每往回放 1 秒，车就往西退 3 米：3 × 3 = 9，3 × 2 = 6，3 × 1 = 3，3 × 0 = 0，再往回放，车还没到摄影机，在西边：3 × (−1) = −3。这就是课本说的“随着后一乘数逐次递减 1，积逐次递减 3”，要使这个规律在引入负数后仍然成立，只能这样。<br><br>往西开的车，往前放每秒往西 3 米；往回放每秒往东 3 米（积逐次增加 3）：(−3) × 0 = 0，(−3) × (−1) = 3，(−3) × (−2) = 6。它要在 0 秒开到摄影机，之前一定在东边：负数乘负数，积为正数。所以开头的问题：2 秒前它在摄影机东边 6 米。<br><br>元代朱世杰《算学启蒙》（1299 年）写道：“同名相乘为正，异名相乘为负。”这里的“同名”就是同号。引文据国家图书馆藏本第一册《总括》第六叶《明乘除段》。',
    src: '课本 · 2.2.1 有理数的乘法（两个“思考”和有理数乘法法则在第 38–39 页）',
  },

  create({ aim, tag }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    let ui = null, dead = false;
    const T0 = performance.now(), now = () => (performance.now() - T0) / 1000;
    const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    const basic = (o) => new THREE.MeshBasicMaterial(o);
    const lit = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o });
    const quiet = (m) => { m.raycast = () => {}; m.userData.noFrame = true; return m; };
    const solid = (m) => { m.castShadow = true; m.receiveShadow = true; m.raycast = () => {}; m.userData.noFrame = true; return m; };
    const uT = { value: 0 };
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

    // ================= 地：一块不规则的田野，公路从中间穿过，左右两头切开 =================
    const arc = (pts) => new THREE.CatmullRomCurve3(pts.map(([x, z]) => V3(x, 0, z)), false, 'centripetal').getPoints(90).map((p) => [p.x, p.z]);
    const frontPts = arc(FRONT), backPts = arc(BACK);
    const outline = [...frontPts, ...backPts];          // 前沿弧 → 右边切口（直） → 后沿弧 → 左边切口（直）
    const inPoly = (x, z) => { let c = false; for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) { const a = outline[i], b = outline[j]; if ((a[1] > z) !== (b[1] > z) && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
    const grassTex = tex(1024, 1024, (g, w, h) => { g.fillStyle = '#a9bf72'; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 80; k++) { const x = Math.random() * w, y = Math.random() * h, r = 60 + Math.random() * 150, gr = g.createRadialGradient(x, y, 0, x, y, r), dry = Math.random() < 0.4; gr.addColorStop(0, dry ? 'rgba(206,204,138,0.3)' : 'rgba(110,150,74,0.26)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
      for (let k = 0; k < 12000; k++) { g.fillStyle = `rgba(${70 + Math.random() * 60},${110 + Math.random() * 50},${40 + Math.random() * 30},${Math.random() * 0.12})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 2 + Math.random() * 4); } });
    grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping; grassTex.repeat.set(1 / 7, 1 / 7);
    const BT = 0.06;
    const soilTex = tex(512, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5a4630'); gr.addColorStop(0.13, '#6b5236'); gr.addColorStop(0.2, '#a98a5e'); gr.addColorStop(0.62, '#b3946a'); gr.addColorStop(0.66, '#9d7d55'); gr.addColorStop(1, '#94764f'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      for (let k = 0; k < 500; k++) { c.strokeStyle = `rgba(66,50,30,${0.25 + Math.random() * 0.4})`; c.lineWidth = 1; const x = Math.random() * w; c.beginPath(); c.moveTo(x, h * 0.11); c.lineTo(x + (Math.random() - 0.5) * 4, h * (0.14 + Math.random() * 0.1)); c.stroke(); }
      for (let k = 0; k < 900; k++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? '72,56,38' : '206,188,160'},${0.2 + Math.random() * 0.35})`; const r = 0.6 + Math.random() * 1.8; c.beginPath(); c.arc(Math.random() * w, h * (0.2 + Math.random() * 0.8), r, 0, 6.3); c.fill(); } });
    soilTex.wrapS = soilTex.wrapT = THREE.RepeatWrapping; soilTex.flipY = false; soilTex.repeat.set(1 / 6, 1 / TOP); soilTex.offset.y = -(((1 - TOP + BT) / TOP) % 1);          // 切面：一整张贴图从地面铺到底
    const grassM = lit({ map: grassTex, roughness: 0.95 }), soilM = lit({ map: soilTex, roughness: 0.95 });
    { const g = new THREE.ExtrudeGeometry(new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z))), { depth: TOP - 2 * BT, bevelEnabled: true, bevelThickness: BT, bevelSize: BT, bevelSegments: 2, steps: 1, curveSegments: 1 });
      g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, [grassM, soilM]); m.position.y = BT; m.receiveShadow = true; m.raycast = () => {}; m.userData.qaSupport = true; group.add(m); }
    // 公路：沥青，两头切开看得见沥青和碎石层；中间黄色虚线，远处路边白线（近处那条就是数轴）
    const asphaltTex = tex(1024, 512, (g, w, h) => { g.fillStyle = '#56565a'; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 26000; k++) { const v = 60 + Math.random() * 90; g.fillStyle = `rgba(${v},${v},${v + 4},${0.18 + Math.random() * 0.3})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); }
      for (const y0 of [0.2, 0.33, 0.67, 0.8]) { const gr = g.createLinearGradient(0, h * (y0 - 0.05), 0, h * (y0 + 0.05)); gr.addColorStop(0, 'rgba(30,30,32,0)'); gr.addColorStop(0.5, 'rgba(30,30,32,0.22)'); gr.addColorStop(1, 'rgba(30,30,32,0)'); g.fillStyle = gr; g.fillRect(0, h * (y0 - 0.05), w, h * 0.1); } });
    asphaltTex.wrapS = asphaltTex.wrapT = THREE.RepeatWrapping;
    const roadEndTex = tex(64, 64, (g, w, h) => { g.fillStyle = '#3e3d3c'; g.fillRect(0, 0, w, h * 0.32); g.fillStyle = '#8b8170'; g.fillRect(0, h * 0.32, w, h); for (let k = 0; k < 300; k++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '60,56,50' : '190,180,160'},0.5)`; g.fillRect(Math.random() * w, h * 0.32 + Math.random() * h * 0.68, 1.5, 1.5); } });
    { const L = 2 * XR + 0.04, H = 0.34, g = new THREE.BoxGeometry(L, H, 2 * ROAD);
      const top = lit({ map: asphaltTex, roughness: 0.9 }), end = lit({ map: roadEndTex, roughness: 0.95 }), edge = lit({ color: 0x4a4a4c, roughness: 0.95 });
      asphaltTex.repeat.set(L / 11, 1);
      const m = new THREE.Mesh(g, [end, end, top, edge, edge, edge]); m.position.set(0, ROADY - H / 2, 0); m.receiveShadow = true; m.raycast = () => {}; m.userData.qaSupport = true; group.add(m);
      const paint = (x0, x1, z, w, col, dash = 0) => { const segs = []; if (!dash) segs.push([x0, x1]); else for (let x = x0; x < x1; x += dash * 2) segs.push([x, Math.min(x1, x + dash)]);
        for (const [a, b] of segs) { const p = quiet(new THREE.Mesh(new THREE.PlaneGeometry(b - a, w).rotateX(-Math.PI / 2), lit({ color: col, roughness: 0.7 }))); p.position.set((a + b) / 2, ROADY + 0.004, z); p.receiveShadow = true; group.add(p); } };
      paint(-XR, XR, -ROAD + 0.22, 0.12, 0xe9e5da);                 // 远处路边线
      paint(-XR + 0.4, XR, 0, 0.12, 0xe2b740, 1.6);                 // 中心黄虚线
      // 路肩：一条碎石
      const gravelTex = tex(512, 64, (g, w, h) => { g.fillStyle = '#a99c84'; g.fillRect(0, 0, w, h); for (let k = 0; k < 2400; k++) { const v = Math.random(); g.fillStyle = v < 0.5 ? 'rgba(110,100,84,0.5)' : 'rgba(214,206,190,0.5)'; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 0.8 + Math.random() * 1.6, 0, 6.3); g.fill(); } const f = g.createLinearGradient(0, 0, 0, h); f.addColorStop(0, 'rgba(169,156,132,0)'); f.addColorStop(0.5, 'rgba(169,156,132,0)'); f.addColorStop(1, 'rgba(169,191,114,0.9)'); g.fillStyle = f; g.fillRect(0, 0, w, h); });
      gravelTex.wrapS = THREE.RepeatWrapping; gravelTex.repeat.set(6, 1);
      for (const s of [1, -1]) { const p = quiet(new THREE.Mesh(new THREE.PlaneGeometry(2 * XR, 0.7).rotateX(-Math.PI / 2), lit({ map: gravelTex, transparent: true, roughness: 1 }))); p.position.set(0, TOP + 0.012, s * (ROAD + 0.34)); if (s < 0) p.rotation.y = Math.PI; p.receiveShadow = true; group.add(p); } }

    // 草：一层被风吹着的细草（路、房子、地、摄影机脚下不长）
    const sway = (mat, H0) => { mat.customProgramCacheKey = () => 'ff-sway' + H0; mat.onBeforeCompile = (sh) => { sh.uniforms.uT = uT; sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n  float bk = position.y / ${H0.toFixed(4)};\n  vec4 ip = instanceMatrix[3];\n  transformed.x += sin(uT * 1.5 + ip.x * 1.3 + ip.z * 0.9) * ${(H0 * 0.16).toFixed(4)} * bk * bk;\n  transformed.z += cos(uT * 1.1 + ip.x * 0.9) * ${(H0 * 0.07).toFixed(4)} * bk * bk;`); }; return mat; };
    { const N = 6000, BH = 0.34, geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.045, 0, 0, 0.045, 0, 0, 0.01, BH, 0], 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
      const blades = new THREE.InstancedMesh(geo, sway(lit({ color: 0xffffff, roughness: 1, side: THREE.DoubleSide }), BH), N), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
      let k = 0;
      for (let tries = 0; k < N && tries < 90000; tries++) { const x = (Math.random() - 0.5) * 25, z = -11 + Math.random() * 17.5;
        if (!inPoly(x, z) || Math.abs(z) < ROAD + 0.62 || Math.hypot(x, z - ZCAM) < 1.7 || (Math.abs(x - HOUSE[0]) < 2.9 && Math.abs(z - HOUSE[1]) < 2.4) || (x > FIELD[0] - 0.2 && x < FIELD[1] && z > FIELD[2] && z < FIELD[3] + 0.2) || TREES.some((tx, i) => Math.hypot(x - tx, z + 4.9 + (i % 2) * 0.5) < 0.35)) continue;
        e.set((Math.random() - 0.5) * 0.5, Math.random() * 6.3, (Math.random() - 0.5) * 0.5); q.setFromEuler(e); const s = 0.5 + Math.random() * 0.6;
        m4.compose(V3(x, TOP, z), q, V3(1, s, 1)); blades.setMatrixAt(k, m4);
        col.setHSL(0.2 + Math.random() * 0.06, 0.32 + Math.random() * 0.16, 0.5 + Math.random() * 0.12); blades.setColorAt(k, col); k++; }
      blades.count = k; blades.raycast = () => {}; blades.userData.noFrame = true; group.add(blades); }
    // 白杨：一排，树冠被风吹着轻轻摆
    const leafTex = tex(512, 512, (g, w, h) => { g.fillStyle = '#5f8446'; g.fillRect(0, 0, w, h); for (let k = 0; k < 6500; k++) { const x = Math.random() * w, y = Math.random() * h, r = 1.5 + Math.random() * 4.5, c = Math.random(); g.fillStyle = c < 0.4 ? 'rgba(40,66,34,0.55)' : c < 0.85 ? 'rgba(98,136,72,0.5)' : 'rgba(176,196,120,0.5)'; g.beginPath(); g.ellipse(x, y, r, r * 0.6, Math.random() * 3.14, 0, 6.3); g.fill(); } });
    leafTex.wrapS = leafTex.wrapT = THREE.RepeatWrapping; leafTex.repeat.set(3, 4);
    const barkTex = tex(128, 256, (g, w, h) => { g.fillStyle = '#d9d5c8'; g.fillRect(0, 0, w, h); for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(60,56,50,${0.3 + Math.random() * 0.4})`; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 3 + Math.random() * 8, 1.5 + Math.random() * 2, 0, 0, 6.3); g.fill(); } });
    const bumpLathe = (geo, amp, f1, f2) => { const pp = geo.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < pp.count; i++) { v.fromBufferAttribute(pp, i); const r = Math.hypot(v.x, v.z); if (r < 1e-6) continue; const ph = Math.atan2(v.x, v.z), n = 0.55 * Math.sin(ph * f1 + v.y * f2) + 0.3 * Math.sin(ph * f1 * 2.3 + v.y * f2 * 1.7 + 1.3) + 0.15 * Math.sin(ph * f1 * 5.1 - v.y * f2 * 2.9); const k2 = 1 + amp * n; pp.setXYZ(i, v.x * k2, v.y, v.z * k2); } geo.computeVertexNormals(); return geo; };
    const crowns = [];
    { const leafM = lit({ map: leafTex, roughness: 0.95 }), barkM = lit({ map: barkTex, roughness: 0.9 });
      const P = [[0, 0], [0.55, 0.25], [0.95, 0.9], [1.0, 1.8], [0.85, 2.7], [0.55, 3.4], [0.2, 3.85], [0, 3.95]];
      TREES.forEach((tx, i) => { const hs = 0.8 + ((i * 37) % 10) / 50, z = -4.9 - (i % 2) * 0.5;
        const trunk = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 1.9 * hs, 10).translate(0, 0.95 * hs, 0), barkM)); trunk.position.set(tx, TOP, z); group.add(trunk);
        const cg = bumpLathe(new THREE.LatheGeometry(P.map(([r, y]) => new THREE.Vector2(r * 0.72, y * hs * 0.95)), 16), 0.1, 7, 2.6);
        const crown = solid(new THREE.Mesh(cg, leafM)); crown.position.set(tx, TOP + 1.2 * hs, z); group.add(crown); crowns.push({ m: crown, ph: i * 1.7 }); }); }
    // 农家小院：白墙灰瓦，烟囱冒着烟
    const chimneyTop = new THREE.Vector3();
    { const g2 = new THREE.Group(), W = 4.0, D = 2.8, H = 2.5;
      const wallTex = tex(512, 256, (g, w, h) => { g.fillStyle = '#ece7dc'; g.fillRect(0, 0, w, h); for (let k = 0; k < 2200; k++) { g.fillStyle = `rgba(150,130,100,${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 5, 1 + Math.random() * 3); } const gr = g.createLinearGradient(0, h * 0.8, 0, h); gr.addColorStop(0, 'rgba(120,100,80,0)'); gr.addColorStop(1, 'rgba(120,100,80,0.35)'); g.fillStyle = gr; g.fillRect(0, h * 0.8, w, h * 0.2); });
      const tileTex = tex(256, 256, (g, w, h) => { g.fillStyle = '#5d6066'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < w; x += 16) { g.fillStyle = `rgba(${40 + Math.random() * 30},${44 + Math.random() * 30},${50 + Math.random() * 30},0.55)`; g.fillRect(x + 1, y + 1, 14, 13); } });
      tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping; tileTex.repeat.set(3, 2);
      const walls = solid(new THREE.Mesh(new THREE.BoxGeometry(W, H, D), lit({ map: wallTex, roughness: 0.95 }))); walls.position.y = H / 2;
      const roofSh = new THREE.Shape([new THREE.Vector2(-D / 2 - 0.35, 0), new THREE.Vector2(D / 2 + 0.35, 0), new THREE.Vector2(0, 1.25)]);
      const roof = solid(new THREE.Mesh(new THREE.ExtrudeGeometry(roofSh, { depth: W + 0.5, bevelEnabled: false }).translate(0, 0, -(W + 0.5) / 2).rotateY(Math.PI / 2), lit({ map: tileTex, roughness: 0.8 }))); roof.position.y = H - 0.05;
      const door = solid(new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.6, 0.06), lit({ color: 0x8e3b2c, roughness: 0.6 }))); door.position.set(0.5, 0.8, D / 2 + 0.02);
      const winM = lit({ color: 0x3d4a56, roughness: 0.3 });
      for (const x of [-1.15, 1.6]) { const wn = solid(new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.7, 0.06), winM)); wn.position.set(x, 1.55, D / 2 + 0.02); g2.add(wn); }
      const chim = solid(new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.1, 0.42), lit({ color: 0x9a6a52, roughness: 0.9 }))); chim.position.set(-1.25, H + 0.8, -0.3);
      g2.add(walls, roof, door, chim); g2.position.set(HOUSE[0], TOP, HOUSE[1]); g2.rotation.y = 0.12; group.add(g2);
      g2.updateMatrix(); chimneyTop.set(-1.25, H + 1.4, -0.3).applyMatrix4(g2.matrix); }
    // 菜地：一垄一垄
    { const fx0 = FIELD[0], fx1 = FIELD[1], fz0 = FIELD[2], fz1 = FIELD[3];
      const ft = tex(512, 256, (g, w, h) => { g.fillStyle = '#7d6446'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9; i++) { const y = (i + 0.5) * (h / 9); g.fillStyle = 'rgba(70,104,48,0.95)'; for (let k = 0; k < 160; k++) { const x = Math.random() * w; g.beginPath(); g.ellipse(x, y + (Math.random() - 0.5) * 6, 4 + Math.random() * 6, 3 + Math.random() * 4, Math.random() * 3, 0, 6.3); g.fill(); } g.fillStyle = 'rgba(140,170,90,0.6)'; for (let k = 0; k < 90; k++) { g.beginPath(); g.arc(Math.random() * w, y + (Math.random() - 0.5) * 8, 1.5 + Math.random() * 2.5, 0, 6.3); g.fill(); } } });
      const fm = quiet(new THREE.Mesh(new THREE.PlaneGeometry(fx1 - fx0, fz1 - fz0).rotateX(-Math.PI / 2), lit({ map: ft, roughness: 1 }))); fm.position.set((fx0 + fx1) / 2, TOP + 0.03, (fz0 + fz1) / 2); fm.receiveShadow = true; group.add(fm);
      const NV = 260, veg = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.26, 1), lit({ color: 0xffffff, roughness: 0.9 }), NV), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color(); let n = 0;
      for (let r = 0; r < 5 && n < NV; r++) for (let x = fx0 + 0.35; x < fx1 - 0.3 && n < NV; x += 0.55 + Math.random() * 0.1) { const z = fz0 + 0.4 + r * ((fz1 - fz0 - 0.8) / 4) + (Math.random() - 0.5) * 0.1, s = 0.75 + Math.random() * 0.45; q.setFromEuler(new THREE.Euler(0, Math.random() * 6.3, 0)); m4.compose(V3(x, TOP + 0.1 * s, z), q, V3(s, s * 0.62, s)); veg.setMatrixAt(n, m4); col.setHSL(0.24 + Math.random() * 0.05, 0.42, 0.36 + Math.random() * 0.1); veg.setColorAt(n, col); n++; }
      veg.count = n; veg.castShadow = true; veg.receiveShadow = true; veg.raycast = () => {}; veg.userData.noFrame = true; group.add(veg); }
    // 取景用的看不见的盒子：整块地 + 摄影机 + 车上方写式子的地方
    { const pr = new THREE.Mesh(new THREE.BoxGeometry(25.0, TOP + 3.0, 17.2), basic({ transparent: true, opacity: 0, depthWrite: false })); pr.position.set(0, (TOP + 3.0) / 2, -2.2); pr.raycast = () => {}; group.add(pr); }

    // ================= 摄影机：木箱、铜镜头、顶上两盘胶片、侧面的摇把，三脚架 =================
    const cam = new THREE.Group(); cam.position.set(0, TOP, ZCAM); cam.rotation.y = -0.42; cam.scale.setScalar(1.4); group.add(cam);          // 镜头朝东、略朝着路
    const woodTex = tex(256, 256, (g, w, h) => { g.fillStyle = '#7a4524'; g.fillRect(0, 0, w, h); for (let k = 0; k < 90; k++) { const y = Math.random() * h; g.strokeStyle = `rgba(${Math.random() < 0.5 ? '60,30,14' : '150,90,50'},${0.15 + Math.random() * 0.25})`; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + (Math.random() - 0.5) * 10, w * 0.7, y + (Math.random() - 0.5) * 10, w, y + (Math.random() - 0.5) * 6); g.stroke(); } });
    const wood = lit({ map: woodTex, roughness: 0.45 }), brass = lit({ color: 0xc9a25a, roughness: 0.3, metalness: 0.75 }), blackM = lit({ color: 0x1e1d1c, roughness: 0.45, metalness: 0.3 }), legM = lit({ map: woodTex, color: 0xd8b48a, roughness: 0.6 });
    const rod = (a, b, r, mat) => { const d = b.clone().sub(a), m = solid(new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.1, d.length(), 8), mat)); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); cam.add(m); return m; };
    const HEAD = 1.5;
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.5, foot = V3(Math.cos(a) * 0.95, 0.02, Math.sin(a) * 0.95); rod(V3(0, HEAD, 0), foot, 0.055, legM); const f = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.1, 8), brass)); f.position.copy(foot).setY(0.05); cam.add(f); }
    { const plate = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.08, 16), brass)); plate.position.y = HEAD + 0.02; cam.add(plate); }
    const BY = HEAD + 0.06 + 0.4;          // 机身中心高
    { const body = solid(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.56), wood)); body.position.y = BY; cam.add(body);
      for (const [x, y] of [[-0.6, 0.4], [0.6, 0.4], [-0.6, -0.4], [0.6, -0.4]]) { const c = solid(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.6), brass)); c.position.set(x * 0.97, BY + y * 0.94, 0); cam.add(c); }
      const lens = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.3, 20).rotateZ(Math.PI / 2), brass)); lens.position.set(0.75, BY - 0.04, 0); cam.add(lens);
      const hood = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.14, 0.22, 20, 1, true).rotateZ(Math.PI / 2), lit({ color: 0x1e1d1c, roughness: 0.6, side: THREE.DoubleSide }))); hood.position.set(1.0, BY - 0.04, 0); cam.add(hood);
      const glass = solid(new THREE.Mesh(new THREE.CircleGeometry(0.13, 20).rotateY(Math.PI / 2), lit({ color: 0x223344, roughness: 0.1, metalness: 0.4 }))); glass.position.set(0.905, BY - 0.04, 0); cam.add(glass);
      const vf = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 10).rotateZ(Math.PI / 2), blackM)); vf.position.set(0.2, BY + 0.2, -0.33); cam.add(vf); }
    // 胶片盒：两盘胶片（转得看得见：有辐条）
    const reelTex = tex(256, 256, (g, w, h) => { const c = w / 2; g.fillStyle = '#26241f'; g.beginPath(); g.arc(c, c, c - 2, 0, 6.3); g.fill(); g.fillStyle = '#5b554b'; g.beginPath(); g.arc(c, c, c * 0.86, 0, 6.3); g.fill();
      g.fillStyle = '#16140f'; for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.beginPath(); g.moveTo(c + Math.cos(a - 0.36) * c * 0.3, c + Math.sin(a - 0.36) * c * 0.3); g.arc(c, c, c * 0.78, a - 0.42, a + 0.42); g.lineTo(c + Math.cos(a + 0.36) * c * 0.3, c + Math.sin(a + 0.36) * c * 0.3); g.closePath(); g.fill(); }
      g.fillStyle = '#c9a25a'; g.beginPath(); g.arc(c, c, c * 0.14, 0, 6.3); g.fill(); g.fillStyle = '#26241f'; g.beginPath(); g.arc(c, c, c * 0.05, 0, 6.3); g.fill(); });
    const reels = [];
    for (const [x, k] of [[-0.36, 1], [0.36, 0.78]]) { const R = 0.36, g2 = new THREE.Group(); g2.position.set(x, BY + 0.4 + R - 0.04, 0); cam.add(g2);
      const rim = solid(new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.16, 32).rotateX(Math.PI / 2), blackM)); g2.add(rim);
      const face = new THREE.Group(); g2.add(face);
      for (const s of [1, -1]) { const f = solid(new THREE.Mesh(new THREE.CircleGeometry(R * 0.97, 32), lit({ map: reelTex, roughness: 0.5, metalness: 0.3 }))); f.position.z = s * 0.081; if (s < 0) f.rotation.y = Math.PI; face.add(f); }
      reels.push({ face, k }); }
    { const neck = solid(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.3), blackM)); neck.position.set(0, BY + 0.44, 0); cam.add(neck); }
    // 摇把：在朝着看的人的那一面（每转一圈 = 胶片走 1 秒）
    const crank = new THREE.Group(); crank.position.set(-0.22, BY - 0.02, 0.3); cam.add(crank);
    { const hub = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.08, 16).rotateX(Math.PI / 2), brass)); crank.add(hub);
      const arm = solid(new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.05), brass)); arm.position.set(0.26, 0, 0.06); crank.add(arm);
      const knob = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.26, 14).rotateX(Math.PI / 2), lit({ color: 0xe9d9b8, roughness: 0.35 }))); knob.position.set(0.5, 0, 0.2); crank.add(knob); }
    cam.updateMatrixWorld(true); group.updateMatrixWorld(true);
    const hubP = group.worldToLocal(crank.getWorldPosition(new THREE.Vector3()));          // 摇把的轴心（台面坐标）
    const crankPick = new THREE.Mesh(new THREE.SphereGeometry(1.75, 16, 12), basic({ visible: false })); crankPick.position.copy(hubP).add(V3(0.15, 0.45, 0)); crankPick.userData.pick = true; crankPick.userData.noFrame = true; group.add(crankPick);

    // ================= 车：一辆老式小轿车（象牙白车身、枣红车顶、镀铬保险杠） =================
    const makeCar = (mats) => { const g = new THREE.Group(), wheels = [];
      const ext = (pts, depth, bevel, mat) => { const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 6 }); geo.translate(0, 0, -depth / 2); const m = solid(new THREE.Mesh(geo, mat)); g.add(m); return m; };
      ext([[-1.33, 0.4], [1.31, 0.4], [1.37, 0.58], [1.3, 0.8], [0.55, 0.88], [-0.95, 0.9], [-1.3, 0.82], [-1.37, 0.58]], 1.3, 0.09, mats.paint);
      ext([[0.52, 0.92], [0.2, 1.33], [-0.62, 1.33], [-0.95, 0.94]], 1.16, 0.04, mats.glass);
      ext([[0.22, 1.3], [-0.64, 1.3], [-0.62, 1.39], [0.2, 1.39]], 1.24, 0.03, mats.roof);
      for (const x of [-1.43, 1.43]) { const b = solid(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.13, 1.42), mats.chrome)); b.position.set(x, 0.46, 0); g.add(b); }
      if (mats.lamp) { for (const z of [-0.47, 0.47]) { const l = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 16).rotateZ(Math.PI / 2), mats.lamp)); l.position.set(1.37, 0.68, z); g.add(l); const tl = solid(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.16), mats.tail)); tl.position.set(-1.39, 0.68, z * 1.05); g.add(tl); }
        const grille = solid(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.5), mats.chrome)); grille.position.set(1.37, 0.6, 0); g.add(grille);
        const pipe = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8).rotateZ(Math.PI / 2), mats.chrome)); pipe.position.set(-1.4, 0.28, -0.42); g.add(pipe); }
      for (const [x, z] of [[0.84, 0.67], [0.84, -0.67], [-0.84, 0.67], [-0.84, -0.67]]) { const w = new THREE.Group(); w.position.set(x, 0.33, z); g.add(w);
        const tyre = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.2, 20).rotateX(Math.PI / 2), mats.tyre)); w.add(tyre);
        const cap = solid(new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), mats.hub)); cap.position.z = Math.sign(z) * 0.102; if (z < 0) cap.rotation.y = Math.PI; w.add(cap); wheels.push(w); }
      return { g, wheels }; };
    const hubTex = tex(128, 128, (g, w, h) => { const c = w / 2; g.fillStyle = '#d8d8d4'; g.beginPath(); g.arc(c, c, c - 1, 0, 6.3); g.fill(); g.strokeStyle = '#7a7a76'; g.lineWidth = 7; for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * c * 0.85, c + Math.sin(a) * c * 0.85); g.stroke(); } g.fillStyle = '#9c2f28'; g.beginPath(); g.arc(c, c, c * 0.22, 0, 6.3); g.fill(); });
    const carMats = { paint: new THREE.MeshPhysicalMaterial({ color: 0xefe6d0, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.2 }), roof: new THREE.MeshPhysicalMaterial({ color: 0x7c2c27, roughness: 0.35, clearcoat: 0.8 }), glass: lit({ color: 0x2c3a44, roughness: 0.12, metalness: 0.5 }), chrome: lit({ color: 0xdadad6, roughness: 0.18, metalness: 0.9 }), tyre: lit({ color: 0x1b1b1c, roughness: 0.85 }), hub: lit({ map: hubTex, roughness: 0.3, metalness: 0.6 }), lamp: lit({ color: 0xfff3c8, emissive: 0xfff0b8, emissiveIntensity: 0.4, roughness: 0.2 }), tail: lit({ color: 0xb33a2c, roughness: 0.4 }) };
    const car = makeCar(carMats); group.add(car.g);
    // 另外几次拍下的车（多次曝光）：半透明的影子
    const ghosts = [3, 2, 1, 0, -1, -2, -3].map((v) => { const gm = basic({ color: 0xf7f0de, transparent: true, opacity: 0, depthWrite: true }), c = makeCar({ paint: gm, roof: gm, glass: gm, chrome: gm, tyre: gm, hub: gm });
      c.g.visible = false; c.g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.renderOrder = 2; } }); group.add(c.g); return { v, ...c, gm, op: 0, fadeTo: 0, on: false, x: 0, z: v < 0 ? -LANE : LANE, delay: 0 }; });

    // ================= 数学：数轴、跳、点、式子（3Blue1Brown 那种发光的笔画） =================
    const prof = (stops) => { const t = tex(64, 4, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); for (const [o, a] of stops) gr.addColorStop(o, `rgba(255,255,255,${a})`); g.fillStyle = gr; g.fillRect(0, 0, w, h); }); t.colorSpace = THREE.NoColorSpace; return t; };
    const crispTex = prof([[0, 0], [0.16, 0.55], [0.3, 1], [0.7, 1], [0.84, 0.55], [1, 0]]);
    const glowTex = prof([[0, 0], [0.15, 0.06], [0.3, 0.22], [0.42, 0.62], [0.5, 1], [0.58, 0.62], [0.7, 0.22], [0.85, 0.06], [1, 0]]);
    const NY = V3(0, 1, 0), NZ = V3(0, 0, 1);
    // 一条折线做成带子：nrm 是它所在平面的法向（地上的线 = y，竖着的弧 = z）
    const strip = (pts, hw, nrm, dash = 0) => { const pos = [], uv = [], a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), s = new THREE.Vector3(); let acc = 0;
      const push = (p, q) => { pos.push(p.x + s.x, p.y + s.y, p.z + s.z, p.x - s.x, p.y - s.y, p.z - s.z, q.x + s.x, q.y + s.y, q.z + s.z, q.x + s.x, q.y + s.y, q.z + s.z, p.x - s.x, p.y - s.y, p.z - s.z, q.x - s.x, q.y - s.y, q.z - s.z); uv.push(0, 0.5, 1, 0.5, 0, 0.5, 0, 0.5, 1, 0.5, 1, 0.5); };
      for (let i = 0; i < pts.length - 1; i++) { a.copy(pts[i]); b.copy(pts[i + 1]); d.subVectors(b, a); const l = d.length(); if (l < 1e-6) continue; s.crossVectors(d, nrm).normalize().multiplyScalar(hw);
        if (!dash) push(a, b); else { let t = 0; while (t < l - 1e-6) { const ph = (acc + t) % (dash * 2), on = ph < dash, st = Math.max(1e-5, Math.min(l - t, on ? dash - ph : dash * 2 - ph)); if (on) push(a.clone().lerp(b, t / l), a.clone().lerp(b, (t + st) / l)); t += st; } acc += l; } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return g; };
    const lineMeshes = [];
    const gline = (color, w, { glow = 0.55, shadow = 0.25, dash = 0, order = 10, op = 1, nrm = NY, depthTest = true } = {}) => {
      const back = nrm === NY ? V3(0, -0.004, 0) : V3(0, 0, -0.012);          // 光晕、暗影垫在芯的下面 / 后面
      const mk = (map, col, o, blend, ord, k) => { const m = quiet(new THREE.Mesh(new THREE.BufferGeometry(), basic({ color: col, map, transparent: true, opacity: o, depthWrite: false, depthTest, blending: blend, side: THREE.DoubleSide }))); m.position.copy(back).multiplyScalar(k); m.renderOrder = ord; m.visible = false; group.add(m); return m; };
      const L = { core: mk(crispTex, color, op, THREE.NormalBlending, order + 2, 0), glow: glow ? mk(glowTex, color, glow, THREE.AdditiveBlending, order + 1, 1) : null, shade: shadow ? mk(glowTex, 0x000000, shadow, THREE.NormalBlending, order, 2) : null, w, dash, nrm, pts: null, op, glowOp: glow, shadeOp: shadow, anim: null };
      L._draw = (pts) => { for (const [m, k, d] of [[L.core, 1, dash], [L.glow, 4.2, 0], [L.shade, 2.6, 0]]) { if (!m) continue; if (!pts || pts.length < 2) { m.visible = false; continue; } m.geometry.dispose(); m.geometry = strip(pts, (w * k) / 2, nrm, d); m.visible = true; } };
      L.set = (pts) => { L.pts = pts; if (L.anim) return; L._draw(pts); };
      L.hide = () => { L.pts = null; L.anim = null; L._draw(null); };
      L.draw = (pts, dur = 0.7, delay = 0) => { L.pts = pts; L.anim = { t0: now() + delay, dur }; L._draw(null); };
      L.fade = (k) => { L.core.material.opacity = L.op * k; if (L.glow) L.glow.material.opacity = L.glowOp * k; if (L.shade) L.shade.material.opacity = L.shadeOp * k; };
      lineMeshes.push(L); return L; };
    const partial = (pts, k) => { if (k >= 1) return pts; let tot = 0; for (let i = 1; i < pts.length; i++) tot += pts[i].distanceTo(pts[i - 1]); let want = tot * k; const out = [pts[0]]; for (let i = 1; i < pts.length; i++) { const l = pts[i].distanceTo(pts[i - 1]); if (want >= l) { out.push(pts[i]); want -= l; } else { out.push(pts[i - 1].clone().lerp(pts[i], l ? want / l : 0)); break; } } return out; };
    const headGeo = new THREE.BufferGeometry(); headGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -1, 0.5, 0, -1, -0.5, 0], 3));
    const head = (color, order = 14, ground = false) => { const m = quiet(new THREE.Mesh(headGeo, basic({ color, transparent: true, depthWrite: false, side: THREE.DoubleSide }))); m.renderOrder = order; m.visible = false; if (ground) { m.rotation.x = -Math.PI / 2; } group.add(m); return m; };
    // 数轴：近处路边一条白线，每米一个刻度、每 3 米写数，东头一个箭头（向东为正）
    const XL = 10.3;
    const axis = gline(WHITE, 0.15, { glow: 0.48, shadow: 0.3, order: 8 }); axis.set([V3(-XL, LY, ZE), V3(XL - 0.25, LY, ZE)]);
    { const hd = head(WHITE, 12, true); hd.position.set(XL + 0.2, LY + 0.002, ZE); hd.scale.set(0.68, 0.50, 1); hd.visible = true; }
    const tickGeo = (() => { const pos = [], uv = []; for (let x = -10; x <= 10; x++) { const big = x % 3 === 0, hw = big ? 0.052 : 0.032, z0 = ZE, z1 = ZE + (big ? 0.54 : 0.31); pos.push(x - hw, LY, z0, x + hw, LY, z0, x - hw, LY, z1, x - hw, LY, z1, x + hw, LY, z0, x + hw, LY, z1); uv.push(0, 0.5, 1, 0.5, 0, 0.5, 0, 0.5, 1, 0.5, 1, 0.5); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return g; })();
    { const t = quiet(new THREE.Mesh(tickGeo, basic({ color: WHITE, map: crispTex, transparent: true, opacity: 0.95, depthWrite: false }))); t.renderOrder = 9; group.add(t); }
    // 摄影机正对着的那条线：横穿公路的细虚线，从摄影机前一直到数轴上的 0
    const zeroLine = gline(WHITE, 0.035, { glow: 0, shadow: 0.15, dash: 0.28, order: 7, op: 0.55 }); zeroLine.set([V3(0, LY, -ROAD + 0.05), V3(0, LY, ZE)]);
    // 字：斜体衬线、白字或概念色，底下一圈暗晕
    const measure = (font, txt) => { const g = document.createElement('canvas').getContext('2d'); g.font = font; return g.measureText(txt).width; };
    const FONT = (px, it = false) => `${it ? 'italic ' : ''}500 ${px}px "Times New Roman","Songti SC",serif`;
    const richTex = (segs, px = 64) => { const parts = segs.map(([s, c, it = false]) => { const f = FONT(px, it); return { s, c, f, w: measure(f, s) }; }), W = parts.reduce((a, q) => a + q.w, 0);
      return tex(Math.ceil(W) + 48, Math.round(px * 1.55), (g, w, h) => { let x = 24; g.textBaseline = 'middle'; g.lineJoin = 'round';
        for (const q of parts) { g.font = q.f; g.shadowColor = 'rgba(8,14,20,0.85)'; g.shadowBlur = px * 0.22; g.lineWidth = px * 0.16; g.strokeStyle = 'rgba(10,16,24,0.6)'; g.strokeText(q.s, x, h / 2 + 2); g.shadowBlur = 0; g.fillStyle = q.c; g.fillText(q.s, x, h / 2 + 2); x += q.w; } }); };
    const label = (hgt, order = 30) => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false }))); sp.renderOrder = order; sp.userData.h = hgt; sp.userData.k = ''; sp.visible = false; group.add(sp); return sp; };
    const setRich = (sp, segs, p) => { if (!segs) { sp.visible = false; return; } const key = JSON.stringify(segs); if (sp.userData.k !== key) { sp.userData.k = key; const t = richTex(segs); sp.material.map?.dispose?.(); sp.material.map = t; sp.material.needsUpdate = true; sp.userData.w = (sp.userData.h * t.image.width) / t.image.height; sp.scale.set(sp.userData.w, sp.userData.h, 1); } sp.position.copy(p); sp.visible = true; };
    for (let x = -9; x <= 9; x += 3) setRich(label(1.04, 20), [[NUM(x), '#ffffff']], V3(x, LY + 0.05, ZE + 1.15));
    const EQ = label(1.05, 32);          // 车上方的式子
    const dotTex = (col) => tex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.16, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, col); gr.addColorStop(0.38, col.replace('1)', '0.5)')); gr.addColorStop(1, col.replace('1)', '0)')); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    const goldDot = dotTex('rgba(255,200,61,1)'), blueDot = dotTex('rgba(88,196,221,1)');
    const dot = (map, size, order = 28) => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthTest: false, depthWrite: false }))); sp.scale.setScalar(size); sp.renderOrder = order; sp.visible = false; group.add(sp); return sp; };
    const carDot = dot(goldDot, 0.62, 29);
    const guide = gline(WHITE, 0.04, { glow: 0, shadow: 0.12, dash: 0.22, order: 7, op: 0.45 });          // 车到它在数轴上的点：一条淡淡的虚线
    const frameDots = Array.from({ length: 8 }, () => dot(goldDot, 0.4, 27));
    const famDots = ghosts.map(() => dot(goldDot, 0.46, 27));
    // 跳：车每 1 秒走的路，一跳一道蓝色的弧，落点带箭头（方向就是车开的方向）
    const hopPool = [];          // { L, hd }
    const hopAt = (i) => { while (hopPool.length <= i) hopPool.push({ L: gline(BLUE, 0.1, { glow: 0.5, shadow: 0.22, order: 16, nrm: NZ }), hd: head(BLUE, 19) }); return hopPool[i]; };
    const hopH = (span) => 0.3 + 0.2 * Math.abs(span);
    const arcPts = (x0, x1, z) => { const h = hopH(x1 - x0), out = []; for (let i = 0; i <= 18; i++) { const s = i / 18; out.push(V3(lerp(x0, x1, s), LY + 0.03 + h * Math.sin(Math.PI * s), z)); } return out; };
    // 一次放进一组跳（[x0, x1, z, 有没有箭头, 透明度]），用不上的收起来
    function setHops(list) { list.forEach(([x0, x1, z, withHead, op = 1, frac = 1], i) => { const H = hopAt(i), full = arcPts(x0, x1, z), pts = frac < 1 ? partial(full, frac) : full; H.L.set(pts); H.L.fade(op);
        const n = pts.length, a = pts[n - 2], b = pts[n - 1], hs = Math.min(0.46, Math.abs(x1 - x0) * 0.5);
        H.hd.visible = withHead && frac >= 1 && hs > 0.05; if (H.hd.visible) { H.hd.position.copy(b).add(V3(0, 0, 0.004)); H.hd.rotation.z = Math.atan2(b.y - a.y, b.x - a.x); H.hd.scale.set(hs, hs * 0.85, 1); H.hd.material.opacity = op; } });
      for (let i = list.length; i < hopPool.length; i++) { hopPool[i].L.hide(); hopPool[i].hd.visible = false; } }
    // 一辆车从 0 秒到 t 秒的那几跳：t > 0 从 0 跳到车；t < 0 从车跳到 0（它要再开 |t| 秒才到摄影机）
    const hopsFor = (v, t, z, op = 1) => { const out = []; if (Math.abs(v) < 1e-6 || Math.abs(t) < 1e-3) return out; const n = Math.ceil(Math.abs(t) - 1e-6), sg = Math.sign(t);
      for (let k = 0; k < n; k++) { const ta = sg > 0 ? k : Math.max(t, -(k + 1)), tb = sg > 0 ? Math.min(t, k + 1) : -k; const x0 = v * ta, x1 = v * tb;          // 从这一秒开始的位置跳到结束的位置：朝车开的方向
        if (Math.abs(x1 - x0) > 0.02) out.push([x0, x1, z, true, op]); }
      return out; };
    // 拖速度的把手：第一跳的落点（只在思考（2）里能拖）
    const velPick = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 10), basic({ visible: false })); velPick.userData.pick = true; velPick.userData.noFrame = true; group.add(velPick);
    const velKnob = dot(blueDot, 0.7, 30);
    // 重拍：从那一点迸出一圈短短的光线（竖直面里，3Blue1Brown 的 Flash）
    const flashes = [];
    const flash = (p, color = GOLD, r0 = 0.35, r1 = 1.15) => { const rays = Array.from({ length: 12 }, () => gline(color, 0.07, { glow: 0.6, shadow: 0, order: 22, nrm: NZ, depthTest: false })); flashes.push({ p: p.clone(), rays, t0: now(), r0, r1 }); };
    // 烟：排气管、烟囱的烟都按“胶片时间”算——倒着放时，烟往回收
    const puffTex = tex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); });
    const puffSp = (col) => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: col, transparent: true, depthWrite: false, opacity: 0 }))); sp.renderOrder = 3; group.add(sp); return sp; };
    const exhaust = Array.from({ length: 9 }, () => puffSp(0xe8e4dc)), smoke = Array.from({ length: 11 }, () => puffSp(0xefece6));

    // ================= 此刻那一句：印在台基前面的切面上 =================
    const front = frontPts.filter(([x]) => Math.abs(x) < 9.6);
    const CY0 = 0.3, CY1 = TOP - 0.3, COFF = 0.11;
    const capGeo = new THREE.BufferGeometry(); let capLen = 0;
    { const sp = front.map((p, i) => { const a = front[Math.max(0, i - 1)], b = front[Math.min(front.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [p[0] - (dz / l) * COFF, p[1] + (dx / l) * COFF]; });
      for (let i = 1; i < sp.length; i++) capLen += Math.hypot(sp[i][0] - sp[i - 1][0], sp[i][1] - sp[i - 1][1]);
      const pos = [], uvs = [], idx = []; let s = 0;
      sp.forEach((p, i) => { if (i) s += Math.hypot(p[0] - sp[i - 1][0], p[1] - sp[i - 1][1]); pos.push(p[0], CY0, p[1], p[0], CY1, p[1]); uvs.push(s / capLen, 0, s / capLen, 1); if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); } });
      capGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); capGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); capGeo.setIndex(idx); }
    const capMesh = quiet(new THREE.Mesh(capGeo, basic({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }))); capMesh.renderOrder = 4; capMesh.visible = false; group.add(capMesh);
    const CW = 2048, CH = Math.max(48, Math.round((CW * (CY1 - CY0)) / capLen));
    const capTex = (big, small) => tex(CW, CH, (g, w, h) => {
      let f = 1, fb = '', fs = '', wb = 0, ws = 0, gap = 0;
      for (; f > 0.5; f -= 0.04) { fb = `600 ${Math.round(h * 0.62 * f)}px "Times New Roman","Songti SC","STSong",serif`; fs = `500 ${Math.round(h * 0.44 * f)}px "Times New Roman","Songti SC","STSong",serif`; g.font = fb; wb = g.measureText(big).width; g.font = fs; ws = small ? g.measureText(small).width : 0; gap = small ? h * 0.9 * f : 0; if (wb + gap + ws < w - h * 5) break; }
      const tot = wb + gap + ws, x0 = (w - tot) / 2;
      const band = g.createLinearGradient(x0 - h * 2, 0, x0 + tot + h * 2, 0); band.addColorStop(0, 'rgba(34,24,14,0)'); band.addColorStop(0.07, 'rgba(34,24,14,0.5)'); band.addColorStop(0.93, 'rgba(34,24,14,0.5)'); band.addColorStop(1, 'rgba(34,24,14,0)');
      g.fillStyle = band; g.fillRect(x0 - h * 2, h * 0.06, tot + h * 4, h * 0.88);
      g.textBaseline = 'middle'; g.font = fb; g.fillStyle = '#f8efdc'; g.fillText(big, x0, h * 0.53); if (small) { g.font = fs; g.fillStyle = '#e6dac2'; g.fillText(small, x0 + wb + gap, h * 0.55); } });
    const cap = { key: '', born: -9, out: 1e9, next: null };
    function caption(big, small = '', frameTime = null) { const key = big + '|' + small; if (key === cap.key) return; cap.key = key; S.cap = [big, small];
      const frameSpeed = S.v;
      const show = () => { cap.time = frameTime; cap.speed = frameSpeed; capMesh.material.map?.dispose?.(); capMesh.material.map = capTex(big, small); capMesh.material.needsUpdate = true; capMesh.visible = true; cap.born = now(); cap.out = 1e9; };
      if (capMesh.visible && now() - cap.born > 0.2) { cap.out = now(); cap.next = show; } else show(); }
    const prompt = (txt) => { S.ask = txt; if (ui?.status) ui.status(txt); };

    // ================= 板书：学生做出一样，就用课本的话写一行 =================
    const css = document.createElement('style');
    css.textContent = `
.ff-board{margin:4px 0 6px;display:flex;flex-direction:column;gap:8px;font:15px/1.7 "Kaiti SC","STKaiti","Songti SC",serif;color:#2b2722}
.ff-board .fb-row{opacity:0;transform:translateY(5px);transition:opacity .5s,transform .5s,background-color 2.4s;padding:3px 8px 3px 6px;border-radius:5px;border-left:3px solid transparent}
.ff-board .fb-row.in{opacity:1;transform:none}
.ff-board .fb-row.fresh{background:rgba(255,206,110,.34);border-left-color:#d98a2b}
.ff-board .n{display:inline-block;min-width:1.25em;color:#b0532a;font-weight:700}
.ff-board b{color:#8a2f1d}
.ff-board .eq{font-family:"Times New Roman","Songti SC",serif;white-space:nowrap}
.ff-board .g{color:#c98600;font-weight:600}.ff-board .b{color:#2589b0;font-weight:600}.ff-board .t{color:#2b2722;font-weight:700}
.ff-board .rule{color:#2a6f9a;font-weight:600}
.ff-board .fb-h{font:600 12px/1.3 "PingFang SC","Hiragino Sans GB",sans-serif;color:#a07a45;letter-spacing:.3em;margin:6px 0 -4px;opacity:0;transition:opacity .4s}
.ff-board .fb-h.in{opacity:1}
.ff-board.review .fb-row[data-k]{cursor:pointer}.ff-board.review .fb-row[data-k]:hover{background:rgba(255,206,110,.16)}
.ff-board .fb-row.sel{background:rgba(255,206,110,.34);border-left-color:#d98a2b}`;
    document.head.append(css);
    let boardEl = null, lastH = ''; const rows = [];
    const reveal = (r) => { const body = boardEl?.closest('.p-body'); if (!body) return; setTimeout(() => { const rb = r.getBoundingClientRect(), bb = body.getBoundingClientRect(); if (rb.bottom > bb.bottom - 14) body.scrollBy({ top: rb.bottom - bb.bottom + 28, behavior: 'smooth' }); }, 80); };
    const board = (html, key = '') => { const r = document.createElement('div'); r.className = 'fb-row'; r.innerHTML = html; r.dataset.k = key; rows.push(r); for (const o of rows) o.classList?.remove('fresh'); if (boardEl) { boardEl.append(r); requestAnimationFrame(() => { r.classList.add('in', 'fresh'); reveal(r); }); } return r; };
    board.h = (title) => { if (title === lastH) return; lastH = title; const r = document.createElement('div'); r.className = 'fb-h'; r.textContent = title; rows.push(r); if (boardEl) { boardEl.append(r); requestAnimationFrame(() => { r.classList.add('in'); reveal(r); }); } };
    const eqH = (v, t) => `<span class="eq"><span class="b">${FAC(v)}</span> × <span class="t">${FAC(t)}</span> = <span class="g">${NUM(v * t)}</span></span>`;
    const eqList = (pairs) => pairs.map(([v, t]) => eqH(v, t)).join('，');

    // ================= 状态 =================
    const fresh = () => ({ step: 's1', t: 3, v: 3, held: '', zCar: LANE, face: 1, rec: [], asked: false, done: false, cap: ['', ''], ask: '', stepAt: now(), hint: 0, moved: -9, wind: null, vAnim: null, velX: 3, fam: false, famAt: -9, met: false, pose: '', rowA: null, rowB: null, crankA: 0, lastTick: 0 });
    let S = fresh(), runId = 0;
    const later = (ms, fn) => { const id = runId; setTimeout(() => { if (!dead && id === runId) fn(); }, ms); };
    const laneOf = (v, prev) => (v > 0 ? LANE : v < 0 ? -LANE : prev);
    const carX = () => S.v * S.t;

    function layout() {
      const x = S.vAnim ? S.vAnim.x : carX();
      car.g.position.set(x, ROADY, S.zCar); car.g.rotation.y = S.face > 0 ? 0 : Math.PI;
      for (const w of car.wheels) w.rotation.z = -(x * S.face) / 0.33;
      carDot.position.set(x, LY + 0.03, ZE); carDot.visible = true; guide.set([V3(x, LY, S.zCar + 0.85), V3(x, LY, ZE - 0.1)]);
      // 式子：车上方
      const tn = S.t;
      setRich(EQ, Number.isInteger(tn) && !S.vAnim ? [[FAC(S.v), CSS.b], [' × ', CSS.w], [FAC(tn), CSS.t], [' = ', CSS.w], [NUM(S.v * tn), CSS.g]] : null, S.zCar > 0 ? V3(x, ROADY + 2.55, S.zCar) : V3(x, ROADY + 2.2, S.zCar + 0.9));
      // 跳
      let list = [];
      if (S.fam) { const rv = S.famReveal ? clamp((now() - S.famReveal) / 1.3, 0, 1) : 1;          // 一下子：七条跳一起从车画向摄影机，同时落到 0
        for (const gh of ghosts) if (gh.on || gh.v === S.v) { const hs = hopsFor(gh.v, S.t, ZA - 0.01 * (gh.v + 3), gh.v === S.v ? 1 : 0.62 * Math.max(0.15, gh.op)), n = hs.length;
          hs.forEach((h, k) => { const f = clamp(rv * n - (n - 1 - k), 0, 1); if (f > 0) list.push([h[0], h[1], h[2], h[3], h[4], f]); }); } }
      else if (S.step === 's2' || S.pose === 's2') list = hopsFor(S.velX, 3, ZA);
      else list = hopsFor(S.v, S.t, ZA);
      setHops(list);
      // 记下的每一格
      S.rec.forEach((r, i) => { if (i < frameDots.length) { frameDots[i].position.set(r.x, LY + 0.025, ZE); frameDots[i].visible = true; } });
      for (let i = S.rec.length; i < frameDots.length; i++) frameDots[i].visible = false;
      // 拖速度的把手
      const vOn = S.step === 's2' && !S.done;
      velPick.position.set(S.velX, LY + 0.3, ZA); velPick.visible = vOn; velKnob.position.set(S.velX, LY + 0.04, ZA + 0.01); velKnob.visible = vOn;
      // 七次拍摄叠在一起
      ghosts.forEach((gh, i) => { const show = gh.on && gh.v !== S.v, gx = S.fam ? gh.v * S.t : gh.x;
        gh.g.visible = show && gh.op > 0.01; gh.gm.opacity = 0.34 * gh.op * (S.fam ? 0.4 + 0.6 * smooth(0.25, 1.4, Math.abs(S.t)) : 1); gh.g.position.set(gx, ROADY, gh.z); gh.g.rotation.y = gh.v < 0 ? Math.PI : 0; for (const w of gh.wheels) w.rotation.z = -(gx * (gh.v < 0 ? -1 : 1)) / 0.33;
        famDots[i].visible = S.fam && gh.v !== S.v; famDots[i].position.set(gx, LY + 0.025, ZE); });
    }

    // ================= 胶片时间 =================
    function setT(t, byHand = true) {
      const t0 = S.t; t = clamp(t, -TMAX, TMAX);
      if (Math.abs(t - Math.round(t)) < 2e-4) t = Math.round(t);          // 落在整秒附近就算整秒（浮点误差）
      if (Math.abs(t - t0) < 1e-7) return;
      S.t = t; if (byHand) S.moved = now();
      // 摇过一整秒：咔一声，记下一格
      const a = Math.min(t0, t), b = Math.max(t0, t);
      for (let k = Math.ceil(a - 1e-9); k <= Math.floor(b + 1e-9); k++) if (Math.abs(k - t0) > 1e-6 || Math.abs(k - t) < 1e-6) onSecond(k, byHand);
      const tick = Math.floor(t * 8); if (tick !== S.lastTick && byHand) { S.lastTick = tick; if (now() - (S.tickAt || 0) > 0.05) { S.tickAt = now(); sfx.clink({ freq: 2300, gain: 0.006 }); } }
      layout();
    }
    function onSecond(k, byHand) {
      if (!byHand || Math.abs(k) > 3) return;
      sfx.clink({ freq: 1500, gain: 0.03 });
      if (S.step === 's1' || S.step === 's3') record(S.v, k);
      if (S.fam && !S.met && k === 0 && S.step === 'fam') met();
    }
    function record(v, t) { const x = v * t; if (S.rec.some((r) => r.v === v && r.t === t)) return; S.rec.push({ v, t, x }); S.stepAt = now(); S.hint = 0;
      if (S.step === 's1') s1Frame(t); else if (S.step === 's3') s3Frame(t); else if (S.step === 's2') s2Take(v); }

    // ================= 一课的主线 =================
    function ask0() { if (S.asked) return; S.asked = true; board.h('问题'); board(`我们希望在有理数范围内，所有数都能像正数及 0 一样进行乘法运算，并使乘法运算具有一致性。<span class="g">位置</span> = <span class="b">速度</span> × <span class="t">时间</span>：往西开的车，2 秒前在哪儿？<span class="eq"><span class="b">(−3)</span> × <span class="t">(−2)</span> = ？</span>`, 'q'); }
    // 思考（1）：速度 3，往回放
    function s1Frame(t) {
      const pos = S.rec.filter((r) => r.t >= 0).sort((p, q) => q.t - p.t), neg = S.rec.filter((r) => r.t < 0).sort((p, q) => q.t - p.t);
      if (t >= 0) { if (!S.rowA) { board.h('思考（1）'); S.rowA = board('', 's1'); } S.rowA.innerHTML = `<span class="n">1</span>${eqList([[3, 3], ...pos.filter((r) => r.t < 3).map((r) => [3, r.t])])}`;
        if (t === 0) caption('3 × 0 = 0：车正好在摄影机前', '再往回放，车在哪儿？', t); else caption(`3 × ${t} = ${3 * t}`, `往回放 1 秒，车往西退 3 米`, t); return; }
      if (!S.rowB) { S.rowB = board('', 's1n'); S.punchAt = now(); flash(V3(3 * t, LY + 0.05, ZE), GOLD); sfx.ding(1180, { gain: 0.06 }); caption('3 × (−1) = −3', '1 秒前，车还没到摄影机，在西边 3 米', t); }
      S.rowB.innerHTML = `随着<span class="t">后一乘数</span>逐次递减 1，<span class="g">积</span>逐次递减 3。要使这个规律在引入负数后仍然成立，那么应有：${eqList(neg.map((r) => [3, r.t]))}`;
      if (t <= -2 && t > -3) caption(`3 × (−2) = −6`, '2 秒前，在西边 6 米', t);
      if (t === -3) { S.step = 's1done'; S.held = ''; S.t = t; caption('到了负数，规律照样成立', '随着后一乘数逐次递减 1，积逐次递减 3'); prompt('');
        later(2200, () => { S.step = 's2w'; S.rec = []; S.rowA = S.rowB = null; S.wind = { t0: now(), from: S.t, to: 3, dur: 1.3, then: s2Start }; sfx.whoosh({ dur: 1.2, freq: 700, gain: 0.04 }); caption('要是速度变了呢？', '胶片停在 3 秒，把速度一点点调小'); }); }
    }
    function s2Start() { S.step = 's2'; S.stepAt = now(); S.hint = 0; S.velX = S.v; ghosts.forEach((gh) => { gh.on = false; gh.op = 0; gh.fadeTo = 0; gh.delay = 0; }); takeGhost(3); prompt('速度一点点调小，3 秒后车在哪儿？（拖第一跳的落点：蓝点）'); layout(); }
    function takeGhost(v) { const gh = ghosts.find((g) => g.v === v); if (!gh) return; gh.on = true; gh.fadeTo = 1; gh.x = v * 3; gh.z = laneOf(v, LANE); }
    // 思考（2）：胶片停在 3 秒，速度从 3 往下调
    function s2Take(v) {
      takeGhost(v); sfx.clink({ freq: 1500, gain: 0.03 });
      const vs = [...new Set(S.rec.map((r) => r.v))].sort((p, q) => q - p), pos = vs.filter((u) => u >= 0), neg = vs.filter((u) => u < 0);
      if (v >= 0) { if (!S.rowA) { board.h('思考（2）'); S.rowA = board('', 's2'); } S.rowA.innerHTML = `<span class="n">2</span>${eqList([[3, 3], ...pos.filter((u) => u < 3).map((u) => [u, 3])])}`;
        if (v === 0) caption('0 × 3 = 0：车停着不动', '速度再小呢？', 3); else caption(`${v} × 3 = ${3 * v}`, `每秒少走 1 米，3 秒少走 3 米`, 3); return; }
      if (!S.rowB) { S.rowB = board('', 's2n'); flash(V3(3 * v, LY + 0.05, ZE), GOLD); sfx.ding(1250, { gain: 0.06 }); caption('(−1) × 3 = −3', '往西开，3 秒后在摄影机西边 3 米', 3); }
      S.rowB.innerHTML = `随着<span class="b">前一乘数</span>逐次递减 1，<span class="g">积</span>逐次递减 3。要使这个规律在引入负数后仍然成立，那么应有：${eqList(neg.map((u) => [u, 3]))}`;
      if (v === -2) caption('(−2) × 3 = −6', '往西开得更快，3 秒后在西边 6 米', 3);
      if (v === -3 && S.step === 's2') { S.step = 's2done'; S.held = ''; prompt('');
        later(900, () => { board.h('归纳'); board(`<span class="n">3</span>正数乘正数，积为正数；正数乘负数，积为负数；负数乘正数，积也为负数。积的绝对值等于乘数的绝对值的积。`, 'sum1'); caption('正数乘负数、负数乘正数，积为负数', '积的绝对值等于乘数的绝对值的积'); });
        later(3600, () => { S.step = 's3'; S.velX = S.v; S.face = Math.sign(S.v); S.zCar = laneOf(S.v, LANE); S.vAnim = null; S.rec = []; S.rowA = S.rowB = null; S.stepAt = now(); S.hint = 0; ghosts.forEach((gh) => { gh.fadeTo = 0; });
          caption('负数乘负数呢？', '往西开的车，往回放'); prompt('往西开的车，0 秒以前在哪儿？'); record(S.v, S.t); layout(); }); }
    }
    // 思考（3）：往西开的车往回放
    function s3Frame(t) {
      const pos = S.rec.filter((r) => r.t > 0).sort((p, q) => q.t - p.t), rest = S.rec.filter((r) => r.t <= 0).sort((p, q) => q.t - p.t);
      if (t > 0) { if (!S.rowA) { board.h('思考（3）'); S.rowA = board('', 's3'); } S.rowA.innerHTML = `<span class="n">4</span>${eqList(pos.map((r) => [r.v, r.t]))}${pos.length > 1 ? '：随着<span class="t">后一乘数</span>逐次递减 1，<span class="g">积</span>逐次增加 3' : ''}`;
        if (t < 3) caption(`${FAC(S.v)} × ${t} = ${NUM(S.v * t)}`, '往回放 1 秒，车往东退 3 米', t); return; }
      if (!S.rowB) S.rowB = board('', 's3n');
      S.rowB.innerHTML = `按照上述规律：${eqList(rest.map((r) => [r.v, r.t]))}`;
      if (t === 0) { caption('(−3) × 0 = 0：车正好在摄影机前', '再往回 1 秒，它在摄影机哪一边？', t); return; }
      if (t === -1 && !S.punch3) { S.punch3 = true; flash(V3(3, LY + 0.05, ZE), GOLD); later(160, () => flash(V3(3, LY + 0.05, ZE), BLUE, 0.6, 1.6)); sfx.ding(1320, { gain: 0.07 }); caption('(−3) × (−1) = 3', '1 秒前，它在摄影机东边 3 米', t); }
      if (t === -2) caption('(−3) × (−2) = 6', '2 秒前，它在东边 6 米', t);
      if (t === -3 && S.step === 's3') { S.step = 's3done'; S.held = ''; S.t = t; prompt('');
        later(700, () => { board.h('归纳'); board(`<span class="n">5</span>负数乘负数，积为正数，且积的绝对值等于乘数的绝对值的积。`, 'sum2'); caption('负数乘负数，积为正数', '它要在 0 秒开到摄影机，之前一定在东边'); });
        later(2600, family); }
    }
    // 一下子：刚才那七种速度一起出来
    function family() {
      S.step = 'fam'; S.fam = true; S.famAt = now(); S.famReveal = now() + 0.45; S.famLanded = false; S.stepAt = now(); S.hint = 0; S.rec = [];
      ghosts.forEach((gh) => { gh.on = true; gh.z = laneOf(gh.v, LANE); gh.fadeTo = 1; gh.op = 0; gh.delay = now() + 0.06 * (3 - Math.abs(gh.v)); });          // 刚才那七次拍摄，一辆接一辆亮出来
      sfx.whoosh({ dur: 0.9, freq: 900, gain: 0.03 });
      caption('七种速度，一起看', '3 秒前：往东开的都在西边，往西开的都在东边'); prompt('哪辆车一直停在 0？什么时候所有车的位置坐标都是 0？'); layout();
    }
    function met() {          // 重拍 4：七辆车的东西向坐标同时为 0
      S.met = true; S.punchAt = now(); flash(V3(0, LY + 0.05, ZE), GOLD, 0.5, 2.0); later(120, () => flash(V3(0, LY + 0.05, ZE), BLUE, 0.9, 2.6)); sfx.ding(1568, { gain: 0.07 }); later(380, () => sfx.ding(2093, { gain: 0.05 }));
      caption('0 秒时，所有车的位置坐标都是 0', '速度是 c，时间是 0，所以 c × 0 = 0');
      board.h('法则'); board(`<span class="n">6</span><span class="rule">两数相乘，同号得正，异号得负，且积的绝对值等于乘数的绝对值的积。任何数与 0 相乘，都得 0。</span>`, 'rule');
      later(1400, () => { const E = (x) => `<span class="eq">${x.replace(/([abc])/g, '<i>$1</i>')}</span>`; board(`设 <i>a</i>，<i>b</i> 为正有理数，<i>c</i> 为任意有理数，则 ${E('(+a) × (+b) = +(a × b)')}，${E('(−a) × (−b) = +(a × b)')}；${E('(−a) × (+b) = −(a × b)')}，${E('(+a) × (−b) = −(a × b)')}；速度为 0 的车一直停在 0，${E('0 × c = 0')}。到 0 秒时，每辆车的位置坐标都是 0，${E('c × 0 = 0')}`, 'rule'); });
      later(2800, () => { board.h('联系'); board('元代朱世杰《算学启蒙》（1299 年）写道：“同名相乘为正，异名相乘为负。”这里的“同名”就是同号。引文据国家图书馆藏本第一册《总括》第六叶《明乘除段》。', 'rule'); });
      later(4200, finish);
    }
    function finish() {
      S.step = 'end'; S.done = true; S.held = ''; S.settle = null; boardEl?.classList.add('review');
      ghosts.forEach((gh) => { gh.x = gh.v * S.t; gh.fadeTo = 0; }); S.fam = false;
      S.wind = { t0: now(), from: S.t, to: -2, dur: 1.4, then: () => flash(V3(6, LY + 0.05, ZE), GOLD) }; sfx.whoosh({ dur: 1.2, freq: 650, gain: 0.035 });          // 胶片倒回 2 秒前：答案就在画面上
      caption('答：2 秒前，它在摄影机东边 6 米', '(−3) × (−2) = 6', -2);
      board.h('答'); board(`<b>答</b>：往西开的车，2 秒前在摄影机东边 6 米：<span class="eq"><span class="b">(−3)</span> × <span class="t">(−2)</span> = <span class="g">6</span></span>。`, 'ans');
      prompt(''); ui?.unlock?.();
      later(2600, () => { ui?.go?.(2); ui?.fold?.(false); });          // 一课结束：翻到“对照课本原文”
    }
    // 讲完以后点板书：场景摆回那一刻
    function pose(k) {
      S.pose = k; S.wind = null; S.vAnim = null; S.held = '';
      const P = { q: [-3, 0], s1: [3, 0], s1n: [3, -1], s2: [0, 3], s2n: [-1, 3], sum1: [-3, 3], s3: [-3, 1], s3n: [-3, -1], sum2: [-3, -3], rule: [-3, -1], ans: [-3, -2] }[k] || [-3, -2];
      S.v = P[0]; S.t = P[1]; S.velX = S.v; S.face = S.v < 0 ? -1 : 1; S.zCar = laneOf(S.v, LANE);
      S.fam = k === 'rule'; S.rec = [];
      ghosts.forEach((gh) => { gh.on = S.fam || k === 'sum1' || ((k === 's2' || k === 's2n') && gh.v >= S.v); gh.z = laneOf(gh.v, LANE); gh.x = gh.v * 3; gh.delay = 0; gh.op = gh.fadeTo = gh.on ? 1 : 0; });
      const CAP = { q: ['往西开的车，2 秒前在哪儿？', '位置 = 速度 × 时间：(−3) × (−2) = ？'], s1: ['3 × 0 = 0：车正好在摄影机前', '随着后一乘数逐次递减 1，积逐次递减 3'], s1n: ['3 × (−1) = −3', '1 秒前，车还没到摄影机，在西边 3 米'], s2: ['0 × 3 = 0：车停着不动', '随着前一乘数逐次递减 1，积逐次递减 3'], s2n: ['(−1) × 3 = −3', '往西开，3 秒后在摄影机西边 3 米'], sum1: ['正数乘负数、负数乘正数，积为负数', '积的绝对值等于乘数的绝对值的积'], s3: ['(−3) × 1 = −3', '往回放 1 秒，车往东退 3 米'], s3n: ['(−3) × (−1) = 3', '1 秒前，它在摄影机东边 3 米'], sum2: ['负数乘负数，积为正数', '它要在 0 秒开到摄影机，之前一定在东边'], rule: ['速度为 0 的车一直停在 0', '到 0 秒时，每辆车的位置坐标都是 0'], ans: ['答：2 秒前，它在摄影机东边 6 米', '(−3) × (−2) = 6'] };
      caption(...(CAP[k] || CAP.ans), ['s1', 's1n', 's2', 's2n', 's3', 's3n', 'ans'].includes(k) ? S.t : null); flash(V3(carX(), LY + 0.05, ZE), GOLD, 0.3, 0.9); layout();
    }

    // ================= 动手 =================
    let grabA = 0;
    const angAt = (p) => Math.atan2(p.y - hubP.y, p.x - hubP.x);
    function crankDown(p) { if (!['s1', 's3', 'fam'].includes(S.step) && !S.done) return false; if (S.done) S.pose = ''; S.held = 'crank'; S.settle = null; grabA = p ? angAt(p) : null; ask0(); if (S.step === 's1' && !S.rec.length) { record(3, 3); caption('往回放：车在哪儿？', '速度 3：向东，每秒 3 米'); prompt('每往回 1 秒，车在哪儿？开过摄影机以前呢？'); } sfx.whoosh({ dur: 0.25, freq: 1500, gain: 0.02 }); return true; }
    function crankMove(p) { if (S.held !== 'crank' || !p) return; if (Math.hypot(p.x - hubP.x, p.y - hubP.y) < 0.12) return; const a = angAt(p); if (grabA == null) { grabA = a; return; } const d = wrapA(a - grabA); grabA = a; setT(S.t - d / (2 * Math.PI)); }
    function crankUp() { if (S.held !== 'crank') return; S.held = ''; const to = Math.round(S.t); if (Math.abs(to - S.t) > 1e-4) S.settle = { t0: now(), from: S.t, to }; }
    function velDown() { if (S.step !== 's2') return false; S.held = 'vel'; return true; }
    function velMove(p) { if (S.held !== 'vel' || S.step !== 's2' || !p) return; const v = clamp(Math.round(p.x), -3, 3); S.moved = now(); while (v !== S.velX) { S.velX += Math.sign(v - S.velX); setV(S.velX); } }          // 一格一格地过：每个整数都拍到
    function velUp() { if (S.held === 'vel') S.held = ''; }
    function setV(v) { const fromX = S.vAnim ? S.vAnim.x : carX(); S.v = v; if (v !== 0) S.face = v > 0 ? 1 : -1; S.vAnim = { t0: now(), fromX, toX: v * S.t, fromZ: S.zCar, toZ: laneOf(v, S.zCar), x: fromX }; record(v, 3); layout(); }
    const drags = [
      { obj: crankPick, plane: 'xy', offset: hubP.z, hint: () => (S.step === 'fam' ? '转摇把：七辆车一起放' : '转摇把：顺时针往前放，逆时针往回放'), enabled: () => ['s1', 's3', 'fam'].includes(S.step) || S.done, onStart: (p) => crankDown(p), onDrag: (p) => crankMove(p), onEnd: () => crankUp() },
      { obj: velPick, plane: 'xz', offset: LY, hint: () => '拖着左右挪：速度变大、变小', enabled: () => S.step === 's2', onStart: () => velDown(), onDrag: (p) => velMove(p), onEnd: () => velUp() },
    ];
    const tip0 = tag?.('', 'pill'), tip = tip0 && { loc(o, x, y, z) { if (y <= -9) tip0.show(false); else { tip0.show(true); tip0.loc(o, x, y, z); } return tip; }, text(h) { tip0.text(h); return tip; } };          // 这一课以米为单位：kit 把提示“藏”到 y = −9 还在画面里，改成真的藏起来
    const dragApi = draggable(group, drags, { onClick: () => false, tip });
    let heard = false;
    const pointer = { down: (r, e) => { if (!heard) { heard = true; audio(); } return dragApi.down(r, e); }, move: (r, e) => dragApi.move(r, e), up: (r, e) => dragApi.up(r, e), items: dragApi.items };
    function opening() { caption('往西开的车，2 秒前在哪儿？', '位置 = 速度 × 时间：(−3) × (−2) = ？'); prompt('先从会算的开始：往回放，车在哪儿？（转一转摄影机的摇把）'); }
    function reset() { runId++; S = fresh(); rows.length = 0; lastH = ''; if (boardEl) { boardEl.innerHTML = ''; boardEl.classList.remove('review'); } ghosts.forEach((gh) => { gh.on = false; gh.op = 0; gh.fadeTo = 0; gh.delay = 0; }); cap.key = ''; ui?.relock?.(); ui?.go?.(1); opening(); layout(); }
    const onKey = (e) => { if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !e.target?.closest?.('input,textarea')) reset(); };
    addEventListener('keydown', onKey);

    layout();
    const EL = 0.6, DIR = [0, Math.sin(EL), Math.cos(EL)];
    let last = now();
    return {
      group: root, card: false, place: 'spread', scale: 0.95,
      size: { w: 25.2, d: 17.4, h: 4.5 },
      view: { elev: 34, azim: 0, lookY: 0.25, frameMargin: 0.92 },
      pointer,
      mount(u) { ui = u; boardEl = document.createElement('div'); boardEl.className = 'ff-board' + (S.done ? ' review' : ''); u.controls?.append(boardEl);
        boardEl.addEventListener('click', (e) => { const r = e.target.closest?.('.fb-row'); if (!S.done || !r?.dataset.k) return; for (const o of rows) o.classList?.remove('sel', 'fresh'); r.classList.add('sel'); sfx.clink({ freq: 1200, gain: 0.03 }); pose(r.dataset.k); });
        for (const r of rows) { boardEl.append(r); r.classList.add('in'); }
        ui.go?.(1); if (!cap.key) { opening(); axis.draw([V3(-XL, LY, ZE), V3(XL - 0.25, LY, ZE)], 0.9, 0.4); } else if (S.ask) ui.status?.(S.ask);
        requestAnimationFrame(() => aim?.(DIR)); setTimeout(() => { if (!dead) aim?.(DIR); }, 700); },
      dispose() { dead = true; runId++; removeEventListener('keydown', onKey); css.remove(); },
      update() {
        const t = now(), dt = Math.min(0.05, t - last); last = t; uT.value = t;
        // 胶片自己走：停手后落到整秒；思考（1）讲完快进回 3 秒
        if (S.settle) { const k = clamp((t - S.settle.t0) / 0.25, 0, 1); setT(lerp(S.settle.from, S.settle.to, easeOut(k)), true); if (k >= 1) S.settle = null; }
        if (S.wind) { const k = clamp((t - S.wind.t0) / S.wind.dur, 0, 1); setT(lerp(S.wind.from, S.wind.to, k * k * (3 - 2 * k)), false); if (k >= 1) { const f = S.wind.then; S.wind = null; f?.(); } }
        // 换速度：车滑到新的位置、换车道
        if (S.vAnim) { const A = S.vAnim, k = clamp((t - A.t0) / 0.38, 0, 1), e = easeOut(k); A.x = lerp(A.fromX, A.toX, e); S.zCar = lerp(A.fromZ, A.toZ, e); if (k >= 1) S.vAnim = null; layout(); }
        // 摄影机：摇把、胶片盘跟着胶片时间转
        crank.rotation.z = -S.t * Math.PI * 2 + (!S.asked ? 0.22 * Math.sin(t * 2.6) * Math.max(0, Math.sin(t * 0.9)) : 0);          // 还没人摸过：摇把轻轻晃一晃
        for (const r of reels) r.face.rotation.z = -S.t * Math.PI * 2 * 0.62 * r.k;
        // 一下子：七条跳同时落到摄影机前
        if (S.fam && S.famReveal) { const k = clamp((t - S.famReveal) / 1.3, 0, 1); layout();
          if (k >= 1) { S.famReveal = 0; if (!S.famLanded) { S.famLanded = true; S.punchAt = t; flash(V3(0, LY + 0.05, ZE), GOLD, 0.4, 1.7); later(110, () => flash(V3(0, LY + 0.05, ZE), BLUE, 0.8, 2.3)); sfx.ding(1319, { gain: 0.06 }); later(160, () => sfx.ding(1760, { gain: 0.05 }));
            if (!S.met) caption('速度为 0 的车一直停在 0', '时间是 c，位置就是 0 × c = 0'); } } }
        // 影子车淡进淡出
        let gl = false; for (const gh of ghosts) { if (t < gh.delay) continue; const o = gh.op + (gh.fadeTo - gh.op) * Math.min(1, dt * 5); if (Math.abs(o - gh.op) > 1e-4) { gh.op = Math.abs(o - gh.fadeTo) < 0.004 ? gh.fadeTo : o; gl = true; } if (gh.fadeTo === 0 && gh.op === 0) gh.on = false; }
        if (gl) layout();
        // 排气管的烟、烟囱的烟：按胶片时间算
        { const tf = S.t, x = S.vAnim ? S.vAnim.x : carX(); let n = 0;
          if (Math.abs(S.v) > 0 && !S.vAnim) { const step = 0.11, life = 0.85; for (let k = Math.ceil((tf - life) / step); k * step <= tf && n < exhaust.length; k++) { const te = k * step, age = tf - te; if (age < 0) continue; const xe = S.v * te - S.face * 1.45, sp = exhaust[n++]; sp.position.set(xe - S.face * 0.5 * age, ROADY + 0.3 + 0.45 * age, S.zCar - 0.42 * S.face); sp.scale.setScalar(0.25 + 0.7 * age); sp.material.opacity = 0.5 * (1 - age / life) * smooth(0, 0.05, age); } }
          for (; n < exhaust.length; n++) exhaust[n].material.opacity = 0;
          const step = 0.42, life = 4.2; let m = 0; for (let k = Math.ceil((tf - life) / step); k * step <= tf && m < smoke.length; k++) { const te = k * step, age = tf - te; if (age < 0) continue; const sp = smoke[m++], q = age / life; sp.position.set(chimneyTop.x + age * 0.42 + Math.sin(age * 1.6 + k) * 0.12, chimneyTop.y + age * 0.75, chimneyTop.z + age * 0.1); sp.scale.setScalar(0.35 + age * 0.4); sp.material.opacity = 0.5 * (1 - q) * smooth(0, 0.12, q); }
          for (; m < smoke.length; m++) smoke[m].material.opacity = 0; void x; }
        // 白杨被风吹着
        for (const c of crowns) { c.m.rotation.z = 0.018 * Math.sin(t * 0.9 + c.ph); c.m.rotation.x = 0.012 * Math.sin(t * 0.7 + c.ph * 1.3); }
        // 此刻那一句：淡进淡出
        if (cap.out < 1e9) { const k = clamp(1 - (t - cap.out) / 0.35, 0, 1); capMesh.material.opacity = k; if (k <= 0) { cap.out = 1e9; const nx = cap.next; cap.next = null; nx?.(); } } else capMesh.material.opacity = clamp((t - cap.born) / 0.5, 0, 1);
        if (cap.time != null && (S.t !== cap.time || S.v !== cap.speed || S.vAnim)) capMesh.material.opacity = 0;
        // 新线一笔画出来
        for (const L of lineMeshes) if (L.anim) { if (t < L.anim.t0) continue; const k = clamp((t - L.anim.t0) / L.anim.dur, 0, 1), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; L._draw(L.pts ? partial(L.pts, Math.max(0.002, e)) : null); if (k >= 1) { L.anim = null; L._draw(L.pts); } }
        // 重拍：一圈短光线往外迸
        for (let i = flashes.length - 1; i >= 0; i--) { const F = flashes[i], k = clamp((t - F.t0) / 0.55, 0, 1), e = easeOut(k); F.rays.forEach((L, j) => { const th = (j / F.rays.length) * Math.PI * 2 + 0.2, ra = lerp(F.r0, F.r1, e), rb = lerp(F.r0, F.r1, Math.min(1, e * 0.55 + 0.1)); L.set([V3(F.p.x + Math.cos(th) * rb, F.p.y + Math.sin(th) * rb + 0.25, F.p.z + 0.05), V3(F.p.x + Math.cos(th) * ra, F.p.y + Math.sin(th) * ra + 0.25, F.p.z + 0.05)]); L.fade(1 - k); });
          if (k >= 1) { for (const L of F.rays) { L.hide(); for (const m of [L.core, L.glow, L.shade]) if (m) { group.remove(m); m.geometry.dispose(); m.material.dispose(); } lineMeshes.splice(lineMeshes.indexOf(L), 1); } flashes.splice(i, 1); } }
        // 该动手的地方轻轻一呼一吸：蓝点（速度）
        velKnob.scale.setScalar(0.7 * (1 + (S.step === 's2' && !S.held ? 0.18 * Math.sin(t * 3.4) ** 2 : 0)));
        carDot.scale.setScalar(0.62 * (1 + 0.5 * Math.max(0, 1 - (t - (S.punchAt || -9)) / 0.9)));
        // 卡住很久才给提示（不拦着人）
        if (!S.held && !S.done && S.hint < 1 && t - S.stepAt > 15 && t - S.moved > 4) {
          const H1 = { s1: ['车开到摄影机以前，在哪儿？', '转一转摄影机侧面的摇把：逆时针是往回放'], s2: ['速度变成 0、再变成负的，车往哪边开？', '拖蓝点往摄影机那边挪'], s3: ['车头朝西，倒着放时它往哪边退？', '逆时针转摇把，往回放'], fam: ['什么时候所有车的位置坐标都是 0？', '转摇把往前放'] }[S.step];
          if (H1) { S.hint = 1; caption(...H1); } }
      },
      debug: {
        get S() { return S; }, rows, pose, cap: () => S.cap, hub: () => [hubP.x, hubP.y, hubP.z], at: { LY, ZA, ZE },
        labels: () => [EQ],
        qa: [
          { name: '往东的车往回放到 −3 秒', run: () => { crankDown(V3(hubP.x + 0.5, hubP.y, hubP.z)); for (let i = 1; i <= 6 * 24; i++) { const a = (i / 24) * Math.PI * 2; crankMove(V3(hubP.x + 0.5 * Math.cos(a), hubP.y + 0.5 * Math.sin(a), hubP.z)); } crankUp(); }, wait: 5, scale: 1 },
          { name: '速度调到 −3', run: () => { velDown(); for (let v = 3; v >= -3; v -= 0.5) velMove(V3(v, LY, ZA)); velUp(); }, wait: 5.5, scale: 1 },
          { name: '往西的车往回放到 −3 秒', run: () => { crankDown(V3(hubP.x + 0.5, hubP.y, hubP.z)); for (let i = 1; i <= 6 * 24; i++) { const a = (i / 24) * Math.PI * 2; crankMove(V3(hubP.x + 0.5 * Math.cos(a), hubP.y + 0.5 * Math.sin(a), hubP.z)); } crankUp(); }, wait: 4.5, scale: 1 },
          { name: '七辆车一起往前放', run: () => { crankDown(V3(hubP.x + 0.5, hubP.y, hubP.z)); for (let i = 1; i <= 4 * 24; i++) { const a = -(i / 24) * Math.PI * 2; crankMove(V3(hubP.x + 0.5 * Math.cos(a), hubP.y + 0.5 * Math.sin(a), hubP.z)); } crankUp(); }, wait: 8, scale: 1 },
        ],
      },
    };
  },
};
