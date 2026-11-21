// 数学 九年级上册 26.2.2 二次函数 y=a(x−h)²+k 的图象和性质（课本 PDF 第 43–48 页）。情境用这一节的例题：喷水池的水管要多长。
//
// 花园里一座完整的圆形喷泉立在书上（汉白玉池子、一圈圈铺地、绿篱和柏树，阳光），不剖开、不搭布景。
// 坐标平面是过池中心、朝着人的那个竖直面：平时只亮学生在研究的那一股水，一条细金线、一层很淡的坐标格，克制；
// 讲完的那一下（顶点到 (1.6, 3)、水管接上），整座喷泉一起打开：几十股水从中心喷向四面八方，每一股都是同一条抛物线。
// 水柱是真的水（一颗颗水珠沿抛物线飞），和它重合的是一条发光的抛物线；学生拖的是水柱的最高点（顶点）。
//   开头的问题（例题）：水柱最高处离池中心 1.6 m、高 3 m，落在 3.6 m 处，水管要多长？
//   往上提：整条抛物线上的每一点都升高 k（几支一样长的箭头），式子 y = ax² 变成 y = ax² + k（重拍 1）；
//   往右挪 h：式子里出现的却是 x − h。为什么是减？拖着弧上的点 P：它往回看 h，正好和原来那条一样高（重拍 2）；
//   随便拖：一族一模一样的抛物线留在身后——形状相同，位置不同；顶点 (h, k)、对称轴 x = h（重拍 3）；
//   水滴沿水柱走：x < h 时升高，x > h 时下降，x = h 时最高，最大值 k；
//   回到喷水池：最高点拖到 (1.6, 3)，落点拖到 3.6（a = −¾），水管长到和水柱接上：1.08 m（重拍 4），一圈水柱一起喷起来。
import * as THREE from 'three';
import { clamp, lerp, easeOut } from './kit/sheet.js';
import { draggable } from './kit/interact.js';
import { sfx, audio } from './kit/audio.js';

const S = 0.045;                                  // 1 米 = 0.045（活页单位）
const BASE = -1.25, FLOOR = -0.8, LAWN = 0.06, RIMTOP = 0.4;   // 底座、池底、草地面、池沿顶（米；水面 y = 0）
const R = 4.3, RIM = 0.38, RL = 5.4, SKY = 4.7;    // 池半径、池沿宽、（旧）草地半径、取景的顶（米）
const PAV = 5.55, RO = 6.6;                          // 铺地外沿、整块园子的外沿（米）
const X0 = -4.2, X1 = 4.6, YT = 3.6;              // 坐标格的范围（米）
const A0 = -0.5, OFF = 1.6;                       // 一开始的喷头：a = −½；喷头在顶点左边 1.6 米
const TOP = [1.6, 3], LAND = 3.6;                 // 例题：最高处 (1.6, 3)，落在离池中心 3.6 米处
const Y0 = -BASE * S;                             // 水面离书面的高度
const wx = (x) => x * S, wy = (y) => Y0 + y * S;
const fy = (a, h, k, x) => a * (x - h) ** 2 + k;
const q1 = (v) => Math.round(v * 10) / 10;
const num = (v) => { const r = q1(v); return (Math.abs(r - Math.round(r)) < 1e-9 ? String(Math.round(r)) : r.toFixed(1)).replace('-', '−'); };
const num2 = (v) => String(Math.round(v * 100) / 100).replace('-', '−');
const FR = (n, d) => `<span class="mfr"><span>${n}</span><span>${d}</span></span>`;          // 竖着写的分数：板书、面板里用
const fracSegs = (a, col) => { const t = { '-0.5': ['−', '{1/2}'], '-0.75': ['−', '{3/4}'], '-0.25': ['−', '{1/4}'], '-1': ['−'], '0.5': ['{1/2}'] }[String(q1(a * 100) / 100)]; return (t ?? [(Math.round(a * 100) / 100).toFixed(2).replace('-', '−')]).map((x) => [x, col, false]); };          // 场景里的式子：{3/4} 画成上下两行的分数
const GOLD = 0xffc83d, BLUE = 0x58c4dd, TEAL = 0x5cd0b3, RED = 0xfc6255, WHITE = 0xffffff;
const CSS = { g: '#ffc83d', b: '#58c4dd', t: '#5cd0b3', r: '#fc6255', w: '#ffffff' };

export default {
  id: 'touhu',
  fig: '图26.2-8',
  title: '二次函数 y=a(x−h)²+k 的图象',
  flow: 'explore',
  ask: '要修建一个圆形喷水池，在池中心竖直安装一根水管，在水管的顶端安一个喷水头，使喷出的抛物线形水柱在与池中心的水平距离为 1.6 m 处达到最高，高度为 3 m，水柱落地处离池中心 3.6 m。<br>水管的长应为多少？',
  need: '拖着水柱的最高点挪一挪，看抛物线和它的式子怎么变。',
  conclusion: {
    crops: [{ page: 46, rect: [40, 476, 462, 712] }, { page: 47, rect: [62, 40, 486, 100] }],
    quote: '一般地，抛物线 y=a(x−h)²+k 与 y=ax² 形状相同，位置不同．把抛物线 y=ax² 向上（或向下）、向左（或向右）平移，可以得到抛物线 y=a(x−h)²+k．平移的方向、距离要根据 h，k 的值来决定．',
    why: '把抛物线整条往上提 k，每一点都升高 k：y = ax² + k。往右挪 h，新抛物线在 x 处的高度，就是原来那条在 x − h 处的高度，所以式子里是 x − h：往右挪，减；往左挪，加。两样一起：y = a(x − h)² + k，顶点 (h, k)，对称轴 x = h，形状由 a 决定。<br><br>喷水池：最高点 (1.6, 3)，设 y = a(x − 1.6)² + 3；水柱经过 (3.6, 0)，0 = a(3.6 − 1.6)² + 3，a = −' + FR(3, 4) + '。当 x = 0 时 y = 1.08，水管的长应为 1.08 m。',
    src: '课本 · 26.2.2 二次函数 y=a(x−h)²+k 的图象和性质（喷水池的问题是这一节的例题）',
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
    const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

    // ================= 喷泉：花园里一座完整的圆形喷泉，不剖开、没有布景 =================
    // 圆环 / 圆盘（u = x，v = 往里的距离），竖着拉高；wav：外沿轻轻起伏，像园子的边
    const ringShape = (r0, r1, wav = 0) => { const sh = new THREE.Shape(), n = 200; for (let i = 0; i <= n; i++) { const t = (i / n) * Math.PI * 2, rr = r1 + wav * (0.55 * Math.sin(t * 6 + 0.4) + 0.3 * Math.sin(t * 11 + 1.7) + 0.15 * Math.sin(t * 17 + 2.9)); const q = [rr * Math.cos(t) * S, rr * Math.sin(t) * S]; if (i) sh.lineTo(...q); else sh.moveTo(...q); } if (r0 > 0) { const hole = new THREE.Path(); hole.absarc(0, 0, r0 * S, 0, Math.PI * 2, true); sh.holes.push(hole); } return sh; };
    const block = (shape, y0, y1, mats) => { const g = new THREE.ExtrudeGeometry(shape, { depth: (y1 - y0) * S, bevelEnabled: false, curveSegments: 48 }); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, mats); m.position.y = wy(y0); m.receiveShadow = true; m.raycast = () => {}; m.userData.qaSupport = true; group.add(m); return m; };
    const grassTex = tex(1024, 1024, (g, w, h) => { g.fillStyle = '#86a85c'; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 80; k++) { const x = Math.random() * w, y = Math.random() * h, r = 50 + Math.random() * 140, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, Math.random() < 0.5 ? 'rgba(168,196,104,0.28)' : 'rgba(64,108,48,0.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
      for (let k = 0; k < 16000; k++) { g.fillStyle = `rgba(${56 + Math.random() * 70},${104 + Math.random() * 60},${38 + Math.random() * 30},${0.06 + Math.random() * 0.12})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 1.5, 2 + Math.random() * 4); } });
    grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping; grassTex.repeat.set(5, 5);
    const soilTex = tex(512, 256, (g, w, h) => { g.fillStyle = '#d8ccb6'; g.fillRect(0, 0, w, h);          // 台基：两层石灰华条石，上沿一道压顶
      const rowsY = [0, 0.16, 0.58, 1]; for (let r = 0; r < 3; r++) { const y0 = rowsY[r] * h, y1 = rowsY[r + 1] * h, L = r === 0 ? w : w / 2; for (let x = r === 2 ? -L / 2 : 0; x < w; x += L) { const tone = 206 + Math.random() * 22; g.fillStyle = `rgb(${tone},${tone - 11},${tone - 30})`; g.fillRect(x + 2, y0 + 2, L - 4, y1 - y0 - 4); } }
      for (let k = 0; k < 2400; k++) { g.fillStyle = `rgba(${120 + Math.random() * 60},${105 + Math.random() * 50},${80 + Math.random() * 40},${Math.random() * 0.14})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 2); }
      const sh = g.createLinearGradient(0, 0, 0, h); sh.addColorStop(0, 'rgba(255,255,255,0.12)'); sh.addColorStop(0.16, 'rgba(0,0,0,0.08)'); sh.addColorStop(1, 'rgba(60,40,20,0.1)'); g.fillStyle = sh; g.fillRect(0, 0, w, h); });
    soilTex.wrapS = soilTex.wrapT = THREE.RepeatWrapping; soilTex.flipY = false; soilTex.repeat.set(9, 1 / ((LAWN - BASE) * S)); soilTex.offset.y = -(((1 - (LAWN - BASE) * S) / ((LAWN - BASE) * S)) % 1);
    const lawnTop = lit({ map: grassTex, roughness: 0.95 }), soilSide = lit({ map: soilTex, roughness: 0.95 }), floorTop = lit({ color: 0xa9c3c4, roughness: 0.6 });
    block(ringShape(R, RO, 0.22), BASE, LAWN, [lawnTop, soilSide]);          // 园子（草地，切面露出土）
    block(ringShape(0, R), BASE, FLOOR, [floorTop, soilSide]);               // 池底
    // 铺地：一圈圈石灰华，砖缝错开（极坐标铺贴图）
    { const pavTex = tex(512, 512, (g, w, h) => { g.fillStyle = '#cdbfa6'; g.fillRect(0, 0, w, h); const rows = 2, cols = 2;
        for (let r = 0; r < rows; r++) for (let c = -1; c < cols + 1; c++) { const x0 = (c + (r % 2) * 0.5) * (w / cols), y0 = r * (h / rows), tone = 205 + Math.random() * 26; g.fillStyle = `rgb(${tone},${tone - 12},${tone - 30})`; g.fillRect(x0 + 3, y0 + 3, w / cols - 6, h / rows - 6); }
        for (let k = 0; k < 2600; k++) { g.fillStyle = `rgba(${130 + Math.random() * 60},${115 + Math.random() * 50},${90 + Math.random() * 40},${Math.random() * 0.12})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 2); } });
      pavTex.wrapS = pavTex.wrapT = THREE.RepeatWrapping;
      const r0 = R + RIM - 0.02, g = new THREE.RingGeometry(r0 * S, PAV * S, 160, 6), pp = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < pp.count; i++) { const x = pp.getX(i) / S, y = pp.getY(i) / S, r = Math.hypot(x, y), th = Math.atan2(y, x); uv.setXY(i, (th * r) / 1.1, (r - r0) / 0.84); }
      g.rotateX(-Math.PI / 2); const pav = new THREE.Mesh(g, lit({ map: pavTex, roughness: 0.82 })); pav.position.y = wy(LAWN) + 0.025 * S; pav.receiveShadow = true; pav.raycast = () => {}; group.add(pav);
      const edge = solid(new THREE.Mesh(new THREE.TorusGeometry(PAV * S, 0.05 * S, 6, 160).rotateX(Math.PI / 2), lit({ color: 0xbfae92, roughness: 0.8 }))); edge.position.y = wy(LAWN) + 0.02 * S; group.add(edge); }
    // 池沿：汉白玉，一道圆润的线脚，外壁一圈浅浮雕的卷草纹
    const marbleTex = tex(2048, 256, (g, w, h) => { g.fillStyle = '#efe9de'; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 4200; k++) { g.fillStyle = `rgba(${160 + Math.random() * 40},${150 + Math.random() * 40},${135 + Math.random() * 40},${Math.random() * 0.08})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 2); }
      g.lineCap = 'round'; for (let k = 0; k < 40; k++) { let x = Math.random() * w, y = Math.random() * h; g.strokeStyle = `rgba(120,118,112,${0.07 + Math.random() * 0.12})`; g.lineWidth = 0.6 + Math.random() * 1.6; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 6; j++) { x += 20 + Math.random() * 60; y += (Math.random() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
      for (let i = 0; i < 24; i++) { const cx = (i + 0.5) * (w / 24), cy = h * 0.66; g.strokeStyle = 'rgba(150,140,124,0.5)'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 36, cy + 14); g.bezierCurveTo(cx - 20, cy - 26, cx + 6, cy - 22, cx + 4, cy - 2); g.bezierCurveTo(cx + 2, cy + 12, cx - 12, cy + 8, cx - 8, cy - 2); g.stroke(); g.beginPath(); g.moveTo(cx + 4, cy - 2); g.bezierCurveTo(cx + 22, cy + 20, cx + 40, cy + 6, cx + 44, cy - 12); g.stroke(); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx - 34, cy + 11); g.bezierCurveTo(cx - 19, cy - 28, cx + 7, cy - 25, cx + 6, cy - 5); g.stroke(); } });
    marbleTex.wrapS = marbleTex.wrapT = THREE.RepeatWrapping; marbleTex.repeat.set(4, 1);
    const marble = lit({ map: marbleTex, roughness: 0.38 });
    { const P = [[R, FLOOR], [R, RIMTOP - 0.1], [R + 0.03, RIMTOP - 0.02], [R + 0.1, RIMTOP], [R + RIM - 0.08, RIMTOP], [R + RIM - 0.01, RIMTOP - 0.05], [R + RIM, RIMTOP - 0.12], [R + RIM - 0.04, RIMTOP - 0.2], [R + RIM, RIMTOP - 0.26], [R + RIM + 0.02, LAWN], [R + RIM + 0.02, FLOOR]];
      const lg = new THREE.LatheGeometry(P.map(([r, y]) => new THREE.Vector2(r * S, wy(y))), 160);
      const rim = solid(new THREE.Mesh(lg, marble)); rim.userData.qaSupport = true; group.add(rim); }
    const flowTex = tex(512, 512, (c, w, h) => { c.fillStyle = '#5ea3b4'; c.fillRect(0, 0, w, h); for (let k = 0; k < 260; k++) { const y = Math.random() * h, x = Math.random() * w, l = 20 + Math.random() * 70; c.strokeStyle = `rgba(230,248,255,${0.06 + Math.random() * 0.16})`; c.lineWidth = 1 + Math.random() * 1.5; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + l / 2, y + (Math.random() - 0.5) * 6, x + l, y); c.stroke(); } });
    flowTex.wrapS = flowTex.wrapT = THREE.RepeatWrapping; flowTex.repeat.set(8, 8);
    const waterTop = new THREE.MeshPhysicalMaterial({ map: flowTex, transparent: true, opacity: 0.84, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false });
    const waterSide = lit({ color: 0x3f8fb3, transparent: true, opacity: 0.4, roughness: 0.3, depthWrite: false });
    { const w = block(ringShape(0, R), FLOOR, 0, [waterTop, waterSide]); w.renderOrder = 2; }          // 池水
    // 后半圈：一道修剪整齐的黄杨绿篱，后面一排柏树——白色的水柱压在深绿上看得清（真花园里喷泉也是这样衬着的）
    const leafTex = tex(512, 512, (g, w, h) => { g.fillStyle = '#2d5233'; g.fillRect(0, 0, w, h); for (let k = 0; k < 6000; k++) { const x = Math.random() * w, y = Math.random() * h, r = 1.5 + Math.random() * 4.5, c = Math.random(); g.fillStyle = c < 0.45 ? 'rgba(22,48,28,0.55)' : c < 0.86 ? 'rgba(70,112,60,0.5)' : 'rgba(136,170,100,0.45)'; g.beginPath(); g.ellipse(x, y, r, r * 0.62, Math.random() * 3.14, 0, 6.3); g.fill(); } });
    leafTex.wrapS = leafTex.wrapT = THREE.RepeatWrapping;
    const leafy = (rp, col = 0xffffff) => { const t = leafTex.clone(); t.needsUpdate = true; t.repeat.set(...rp); return lit({ map: t, color: col, roughness: 0.95 }); };
    const bumpLathe = (geo, amp, f1, f2) => { const pp = geo.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < pp.count; i++) { v.fromBufferAttribute(pp, i); const r = Math.hypot(v.x, v.z); if (r < 1e-6) continue; const ph = Math.atan2(v.x, v.z), n = 0.55 * Math.sin(ph * f1 + v.y * f2) + 0.3 * Math.sin(ph * f1 * 2.3 + v.y * f2 * 1.7 + 1.3) + 0.15 * Math.sin(ph * f1 * 5.1 - v.y * f2 * 2.9); const k2 = 1 + amp * n; pp.setXYZ(i, v.x * k2, v.y, v.z * k2); } geo.computeVertexNormals(); return geo; };
    const HG0 = 0.6, HG1 = 1.4;          // 绿篱围着后面这一段（单位：π）
    { const r0 = PAV + 0.3, r1 = RO - 0.32, hh = 1.45, c = 0.22, P = [[r0, LAWN], [r0, LAWN + hh - c], [r0 + c * 0.3, LAWN + hh - c * 0.3], [r0 + c, LAWN + hh], [r1 - c, LAWN + hh], [r1 - c * 0.3, LAWN + hh - c * 0.3], [r1, LAWN + hh - c], [r1, LAWN]];
      const lg = bumpLathe(new THREE.LatheGeometry(P.map(([r, y]) => new THREE.Vector2(r * S, wy(y))), 120, HG0 * Math.PI, (HG1 - HG0) * Math.PI), 0.006, 46, 120);
      const hedge = solid(new THREE.Mesh(lg, leafy([26, 2]))); group.add(hedge);
      for (const ph of [HG0, HG1]) { const sh = new THREE.Shape(P.map(([r, y]) => new THREE.Vector2(r * S, wy(y)))); const cap = solid(new THREE.Mesh(new THREE.ShapeGeometry(sh), lit({ color: 0x35583a, roughness: 0.95, side: THREE.DoubleSide }))); cap.rotation.y = ph * Math.PI - Math.PI / 2; group.add(cap); } }
    { const P = [[0, 0], [0.26, 0.2], [0.42, 0.9], [0.4, 1.8], [0.3, 2.7], [0.16, 3.4], [0.05, 3.85], [0, 3.95]], rr = (RO - 0.55) * S;
      for (const [ph, hgt, sc] of [[0.72, 3.5, 0.95], [0.86, 4.3, 1.08], [1.0, 4.0, 1.02], [1.14, 4.35, 1.08], [1.28, 3.55, 0.95]]) { const g2 = bumpLathe(new THREE.LatheGeometry(P.map(([r, y]) => new THREE.Vector2(r * S * sc, ((y * hgt) / 3.95) * S)), 18), 0.07, 7, 260);
        const tr = solid(new THREE.Mesh(g2, leafy([3, 6], 0xd6e2d0))); tr.position.set(rr * Math.sin(ph * Math.PI), wy(LAWN), rr * Math.cos(ph * Math.PI)); group.add(tr); } }
    // 框住整件模型（含上面写式子的地方）：看不见的盒子，取景用
    { const pr = new THREE.Mesh(new THREE.BoxGeometry(2 * (R + RIM + 0.9) * S, (SKY - BASE) * S, 2 * (R + RIM + 0.6) * S), basic({ transparent: true, opacity: 0, depthWrite: false })); pr.position.set(0, wy((SKY + BASE) / 2), 0); pr.raycast = () => {}; group.add(pr); }

    // 水管：竖在喷头下面，从池底一直到喷头
    const pipe = new THREE.Group(); group.add(pipe);
    const bronze = lit({ color: 0xb48a52, roughness: 0.35, metalness: 0.6 });
    const pipeBody = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.09 * S, 0.1 * S, 1, 16).translate(0, 0.5, 0), bronze)); pipe.add(pipeBody);
    const nozzle = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.13 * S, 0.1 * S, 0.16 * S, 16), bronze)); pipe.add(nozzle);
    pipe.position.z = 0;

    // ================= 水：一颗颗水珠沿着抛物线飞，落进池里荡开水纹 =================
    const dropGeo = new THREE.SphereGeometry(1, 6, 4), dropMat = new THREE.MeshStandardMaterial({ color: 0xf4fbff, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.72, emissive: 0xcfe9f5, emissiveIntensity: 0.12 });
    const ND = 170;
    const jet = (n) => { const m = new THREE.InstancedMesh(dropGeo, dropMat, n); m.raycast = () => {}; m.userData.noFrame = true; m.frustumCulled = false; m.count = 0; group.add(m); return m; };
    const mainJet = jet(ND), crown = jet(ND * 32);
    const seeds = Array.from({ length: ND }, (_, i) => ({ t: i / ND, j: (Math.random() - 0.5) * 0.05, s: 0.7 + Math.random() * 0.6 }));
    // 水柱本身：一股细细的、透亮的水（一根管子），水珠只是在上面闪
    const streamMat = new THREE.MeshStandardMaterial({ color: 0xf0f9ff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.52, emissive: 0xc4e6f4, emissiveIntensity: 0.12, depthWrite: false });
    const tubeAlong = (pts3) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts3), 56, 0.03 * S, 6, false);
    const jetPts = (a, h, k, x0, x1, th = 0, n = 40) => { const out = []; for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n), y = Math.max(fy(a, h, k, x), -0.02); out.push(new THREE.Vector3(wx(x) * Math.cos(th), wy(y), -wx(x) * Math.sin(th))); } return out; };
    const stream = quiet(new THREE.Mesh(new THREE.BufferGeometry(), streamMat)); stream.renderOrder = 3; stream.visible = false; group.add(stream); let streamKey = '';
    const crownStreams = Array.from({ length: 32 }, () => { const m = quiet(new THREE.Mesh(new THREE.BufferGeometry(), streamMat)); m.renderOrder = 3; m.visible = false; group.add(m); return m; }); let crownKey = '';
    const splashes = [];
    const splash = (x, z = 0) => { const m = quiet(new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 40).rotateX(-Math.PI / 2), basic({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }))); m.position.set(wx(x), wy(0) + 0.0003, z); m.userData.born = now(); m.renderOrder = 3; group.add(m); splashes.push(m); };

    // ================= 数学：竖着的坐标平面就是剖面；线用 3Blue1Brown 那种发光的笔画 =================
    const Z = 0.0018;          // 数学的那一层：在剖面前面一点
    const prof = (stops) => { const t = tex(64, 4, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); for (const [o, a] of stops) gr.addColorStop(o, `rgba(255,255,255,${a})`); g.fillStyle = gr; g.fillRect(0, 0, w, h); }); t.colorSpace = THREE.NoColorSpace; return t; };
    const crispTex = prof([[0, 0], [0.16, 0.55], [0.3, 1], [0.7, 1], [0.84, 0.55], [1, 0]]);
    const glowTex = prof([[0, 0], [0.15, 0.06], [0.3, 0.22], [0.42, 0.62], [0.5, 1], [0.58, 0.62], [0.7, 0.22], [0.85, 0.06], [1, 0]]);
    // 竖着的笔画：pts 是米制坐标 (x, y)
    const strip = (pts, hw, dash = 0) => { const pos = [], uv = []; let acc = 0;
      const push = (a, b, n) => { pos.push(a[0] + n[0], a[1] + n[1], 0, a[0] - n[0], a[1] - n[1], 0, b[0] + n[0], b[1] + n[1], 0, b[0] + n[0], b[1] + n[1], 0, a[0] - n[0], a[1] - n[1], 0, b[0] - n[0], b[1] - n[1], 0); uv.push(0, 0.5, 1, 0.5, 0, 0.5, 0, 0.5, 1, 0.5, 1, 0.5); };
      const P = pts.map(([x, y]) => [wx(x), wy(y)]);
      for (let i = 0; i < P.length - 1; i++) { const a = P[i], b = P[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); if (l < 1e-9) continue; const n = [(-dy / l) * hw, (dx / l) * hw];
        if (!dash) push(a, b, n); else { let t = 0; while (t < l - 1e-9) { const ph = (acc + t) % (dash * 2), on = ph < dash, st = Math.max(1e-7, Math.min(l - t, on ? dash - ph : dash * 2 - ph)); if (on) push([a[0] + (dx * t) / l, a[1] + (dy * t) / l], [a[0] + (dx * (t + st)) / l, a[1] + (dy * (t + st)) / l], n); t += st; } acc += l; } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return g; };
    const lineMeshes = [];
    // 发光的笔画：实芯 + 叠加的光晕 + 底下一层淡淡的暗影（压在亮的草地、池水上也分得清）
    const gline = (color, w, { glow = 0.55, shadow = 0.25, dash = 0, z = Z, order = 10, op = 1 } = {}) => {
      const mk = (map, col, o, blend, ord, zz) => { const m = quiet(new THREE.Mesh(new THREE.BufferGeometry(), basic({ color: col, map, transparent: true, opacity: o, depthWrite: false, blending: blend, side: THREE.DoubleSide }))); m.position.z = zz; m.renderOrder = ord; m.visible = false; group.add(m); return m; };
      const L = { core: mk(crispTex, color, op, THREE.NormalBlending, order + 2, z + 0.0002), glow: glow ? mk(glowTex, color, glow, THREE.AdditiveBlending, order + 1, z + 0.0001) : null, shade: shadow ? mk(glowTex, 0x000000, shadow, THREE.NormalBlending, order, z - 0.0003) : null, w, dash, pts: null, op, glowOp: glow, shadeOp: shadow, anim: null };
      L.set = (pts) => { L.pts = pts; if (L.anim) return; L._draw(pts); };
      L._draw = (pts) => { for (const [m, k, d] of [[L.core, 1, dash], [L.glow, 4.5, 0], [L.shade, 2.6, 0]]) { if (!m) continue; if (!pts || pts.length < 2) { m.visible = false; continue; } m.geometry.dispose(); m.geometry = strip(pts, (w * S * k) / 2, d ? d * S : 0); m.visible = true; } };
      L.hide = () => { L.pts = null; L.anim = null; L._draw(null); };
      L.draw = (pts, dur = 0.7) => { L.pts = pts; L.anim = { t0: now(), dur }; };          // 自己画出来（3Blue1Brown 的 Create）
      L.fade = (k) => { L.core.material.opacity = L.op * k; if (L.glow) L.glow.material.opacity = L.glowOp * k; if (L.shade) L.shade.material.opacity = L.shadeOp * k; };
      lineMeshes.push(L); return L; };
    const partial = (pts, k) => { if (k >= 1) return pts; let tot = 0; for (let i = 1; i < pts.length; i++) tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); let want = tot * k; const out = [pts[0]]; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (want >= l) { out.push(pts[i]); want -= l; } else { const t = l ? want / l : 0; out.push([lerp(pts[i - 1][0], pts[i][0], t), lerp(pts[i - 1][1], pts[i][1], t)]); break; } } return out; };
    const curve = (a, h, k, xa = X0, xb = X1, n = 90) => { const out = []; for (let i = 0; i <= n; i++) { const x = lerp(xa, xb, i / n), y = fy(a, h, k, x); if (y < FLOOR - 0.02 || y > YT + 0.02) { if (out.length && out[out.length - 1] !== null) out.push(null); continue; } out.push([x, y]); } const segs = []; let cur = []; for (const p of out) { if (p === null) { if (cur.length > 1) segs.push(cur); cur = []; } else cur.push(p); } if (cur.length > 1) segs.push(cur); return segs.sort((p, q) => q.length - p.length)[0] || null; };          // 只画在坐标格里的那一段
    // 箭头：一段发光的笔画 + 三角形箭头
    const headGeo = new THREE.BufferGeometry(); headGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -1, 0.5, 0, -1, -0.5, 0], 3));
    const arrow = (color, w = 0.05) => { const L = gline(color, w, { glow: 0.5, shadow: 0.2 }); const hd = quiet(new THREE.Mesh(headGeo, basic({ color, transparent: true, depthWrite: false, side: THREE.DoubleSide }))); hd.renderOrder = 13; hd.visible = false; group.add(hd);
      L.to = (p, q) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < 0.08) { L.hide(); hd.visible = false; return; } const u = [(q[0] - p[0]) / d, (q[1] - p[1]) / d], hl = Math.min(0.22, d * 0.4); L.set([p, [q[0] - u[0] * hl * 0.8, q[1] - u[1] * hl * 0.8]]); hd.position.set(wx(q[0]), wy(q[1]), Z + 0.0004); hd.rotation.z = Math.atan2(u[1], u[0]); hd.scale.setScalar(hl * S); hd.visible = true; };
      L.off = () => { L.hide(); hd.visible = false; }; L.head = hd; return L; };
    // 坐标格：淡白的格线、亮一点的坐标轴、刻度数
    const gridL = []; for (let x = Math.ceil(X0); x <= X1; x++) gridL.push([[[x, FLOOR], [x, 0]], 0.16], [[[x, 0], [x, YT]], 0.34]); for (let y = Math.ceil(FLOOR); y <= YT; y++) gridL.push([[[X0, y], [X1, y]], y < 0 ? 0.16 : 0.34]);
    for (const [seg, op] of gridL) { const L = gline(0xe6f3ff, 0.016, { glow: 0, shadow: 0.1, op, order: 6 }); L.set(seg); }          // 水面以下的格子淡一半（隔着水看）
    const axX = gline(WHITE, 0.03, { glow: 0.25, shadow: 0.25, op: 0.9, order: 7 }), axY = gline(WHITE, 0.03, { glow: 0.25, shadow: 0.25, op: 0.9, order: 7 });
    axX.set([[X0, 0], [X1 + 0.15, 0]]); axY.set([[0, FLOOR], [0, YT + 0.15]]);

    // 字：斜体衬线（像课本、像 LaTeX），白字或者概念的颜色，底下垫一圈暗光
    const measure = (font, txt) => { const g = document.createElement('canvas').getContext('2d'); g.font = font; return g.measureText(txt).width; };
    const FONT = (px, it = true) => `${it ? 'italic ' : ''}500 ${px}px "Times New Roman","Songti SC",serif`;
    // 一行带颜色的字：segs = [[文字, 颜色, 斜体?], ...]
    const FRX = /^\{(\d+)\/(\d+)\}$/;
    const richTex = (segs, px = 64) => { const parts = segs.map(([x, c, it = true]) => { const m = FRX.exec(x); if (m) { const f = FONT(Math.round(px * 0.7), false); return { n: m[1], d: m[2], c, f, w: Math.max(measure(f, m[1]), measure(f, m[2])) + px * 0.24 }; } const f = FONT(px, it); return { s: x, c, f, w: measure(f, x) }; });
      const tall = parts.some((q) => q.n), W = parts.reduce((a, q) => a + q.w, 0);
      return tex(Math.ceil(W) + 48, Math.round(px * (tall ? 2.25 : 1.55)), (g, w, h) => { let x = 24; g.textBaseline = 'middle'; g.lineJoin = 'round';
        const ink = (txt, xx, yy, f, c) => { g.font = f; g.shadowColor = 'rgba(8,16,24,0.85)'; g.shadowBlur = px * 0.22; g.lineWidth = px * 0.16; g.strokeStyle = 'rgba(10,20,30,0.55)'; g.strokeText(txt, xx, yy); g.shadowBlur = 0; g.fillStyle = c; g.fillText(txt, xx, yy); };
        for (const q of parts) { if (q.n) { const cx = x + q.w / 2, y0 = h / 2 + 2; g.textAlign = 'center'; ink(q.n, cx, y0 - px * 0.42, q.f, q.c); ink(q.d, cx, y0 + px * 0.47, q.f, q.c); g.textAlign = 'left';
            g.shadowColor = 'rgba(8,16,24,0.85)'; g.shadowBlur = px * 0.16; g.fillStyle = 'rgba(10,20,30,0.55)'; g.fillRect(x + px * 0.05, y0 - px * 0.06, q.w - px * 0.1, px * 0.12); g.shadowBlur = 0; g.fillStyle = q.c; g.fillRect(x + px * 0.08, y0 - px * 0.03, q.w - px * 0.16, px * 0.06); }
          else ink(q.s, x, h / 2 + 2, q.f, q.c); x += q.w; } }); };
    const label = (hgt, order = 30) => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }))); sp.renderOrder = order; sp.userData.h = hgt; sp.userData.k = ''; sp.visible = false; group.add(sp); return sp; };
    const setRich = (sp, segs, p, anchor = 0.5) => { if (!segs) { sp.visible = false; return; } const key = JSON.stringify(segs); if (sp.userData.k !== key) { sp.userData.k = key; const t = richTex(segs); sp.material.map?.dispose?.(); sp.material.map = t; sp.material.needsUpdate = true; const hh = sp.userData.h * (t.image.height / Math.round(64 * 1.55)); sp.userData.w = (hh * t.image.width) / t.image.height; sp.scale.set(sp.userData.w, hh, 1); } sp.position.set(wx(p[0]) + sp.userData.w * (0.5 - anchor), wy(p[1]), Z + 0.002); sp.visible = true; };
    for (let x = Math.ceil(X0); x <= X1; x++) if (x) setRich(label(0.0088, 20), [[String(x).replace('-', '−'), 'rgba(255,255,255,0.85)', false]], [x, -0.28]);
    for (let y = Math.ceil(FLOOR); y <= YT; y++) if (y) setRich(label(0.0088, 20), [[String(y).replace('-', '−'), 'rgba(255,255,255,0.85)', false]], [-0.28, y]);
    setRich(label(0.0098, 20), [['x', CSS.w], ['/m', 'rgba(255,255,255,0.8)', false]], [X1 + 0.15, -0.34]);
    setRich(label(0.0098, 20), [['y', CSS.w], ['/m', 'rgba(255,255,255,0.8)', false]], [0.46, YT + 0.14]);
    setRich(label(0.009, 20), [['O', 'rgba(255,255,255,0.9)']], [-0.26, -0.28]);
    // 发光的点
    const dotTex = (col) => tex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.16, 'rgba(255,255,255,1)'); gr.addColorStop(0.24, col); gr.addColorStop(0.36, col.replace('1)', '0.55)')); gr.addColorStop(1, col.replace('1)', '0)')); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    const dot = (col, size = 0.012) => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(col), transparent: true, depthTest: false, depthWrite: false }))); sp.scale.setScalar(size); sp.renderOrder = 28; sp.visible = false; group.add(sp); sp.at = (p) => { sp.position.set(wx(p[0]), wy(p[1]), Z + 0.0025); sp.visible = true; }; return sp; };
    // 重拍：从那一点迸出一圈短短的光线（3Blue1Brown 的 Flash）
    const flashes = [];
    const flash = (p, color = GOLD, r0 = 0.2, r1 = 0.62) => { const rays = Array.from({ length: 12 }, () => gline(color, 0.05, { glow: 0.6, shadow: 0, order: 16 })); flashes.push({ p, rays, t0: now(), r0, r1 }); sfx.clink({ freq: 1500, gain: 0.03 }); };

    // ================= 数学的东西 =================
    const ghost = gline(WHITE, 0.035, { glow: 0.18, shadow: 0.2, dash: 0.12, op: 0.9, order: 8 });          // 原来的抛物线 y = ax²（课本里的虚线）
    const before = gline(WHITE, 0.035, { glow: 0.18, shadow: 0.2, dash: 0.12, op: 0.9, order: 8 });         // 往右挪之前的那一条
    const para = gline(GOLD, 0.05, { glow: 0.5, shadow: 0.22, order: 12 });                                  // 现在的抛物线
    const axis = gline(BLUE, 0.03, { glow: 0.35, shadow: 0.15, dash: 0.1, order: 9 });                     // 对称轴 x = h
    const kArr = [arrow(TEAL), arrow(TEAL), arrow(TEAL)], hArr = [arrow(BLUE), arrow(BLUE)], vecH = arrow(BLUE, 0.06), vecK = arrow(TEAL, 0.06);
    const look = arrow(BLUE, 0.055), dropP = gline(WHITE, 0.02, { glow: 0, shadow: 0.15, dash: 0.07, op: 0.75, order: 9 }), dropG = gline(WHITE, 0.02, { glow: 0, shadow: 0.15, dash: 0.07, op: 0.75, order: 9 });
    const trails = Array.from({ length: 14 }, () => { const L = gline(GOLD, 0.04, { glow: 0.4, shadow: 0, order: 11 }); L.born = -9; return L; }); let trailAt = null, trailI = 0;
    const target = gline(GOLD, 0.03, { glow: 0.5, shadow: 0.2, dash: 0.06, order: 9 }), landMark = gline(RED, 0.03, { glow: 0.5, shadow: 0.2, dash: 0.06, order: 9 });
    const VD = dot('rgba(255,200,61,1)', 0.0135), PD = dot('rgba(88,196,221,1)', 0.011), LD = dot('rgba(252,98,85,1)', 0.011), ND2 = dot('rgba(255,200,61,1)', 0.009);
    const EQ = label(0.022, 32), VL = label(0.0128), PL1 = label(0.0112), PL2 = label(0.0112), KL = label(0.0115), HL = label(0.0115), YL = label(0.0115), LL = label(0.0115), PIPEL = label(0.0135);
    const ringPts = (c, r) => Array.from({ length: 41 }, (_, i) => [c[0] + r * Math.cos((i / 40) * Math.PI * 2), c[1] + r * Math.sin((i / 40) * Math.PI * 2)]);

    // ================= 此刻那一句：印在剖面最下面那条土上（池底下面），不挡坐标格 =================
    const CY0 = BASE + 0.14, CY1 = LAWN - 0.16, CA = 0.44;          // 前沿那段弧：高度范围、半张角
    const capPts = []; for (let i = 0; i <= 80; i++) { const t = Math.PI * 1.5 - CA + (2 * CA * i) / 80, rr = RO + 0.22 * (0.55 * Math.sin(t * 6 + 0.4) + 0.3 * Math.sin(t * 11 + 1.7) + 0.15 * Math.sin(t * 17 + 2.9)) + 0.03; capPts.push([rr * Math.cos(t), rr * Math.sin(t)]); }
    let CAPW = 0; for (let i = 1; i < capPts.length; i++) CAPW += Math.hypot(capPts[i][0] - capPts[i - 1][0], capPts[i][1] - capPts[i - 1][1]);
    const CAPH = CY1 - CY0;
    const capGeo = new THREE.BufferGeometry(); { const pos = [], uv = [], idx = []; let acc = 0; capPts.forEach(([u, v], i) => { if (i) acc += Math.hypot(u - capPts[i - 1][0], v - capPts[i - 1][1]); pos.push(u * S, wy(CY0), -v * S, u * S, wy(CY1), -v * S); uv.push(acc / CAPW, 0, acc / CAPW, 1); if (i) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); } }); capGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); capGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); capGeo.setIndex(idx); }
    const capMesh = quiet(new THREE.Mesh(capGeo, basic({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }))); capMesh.renderOrder = 4; capMesh.visible = false; group.add(capMesh);
    const CW = 2048, CH = Math.round((2048 * CAPH) / CAPW);
    const capRuns = (txt) => { const out = []; const re = /\{(\d+)\/(\d+)\}/g; let i = 0, m; while ((m = re.exec(txt))) { if (m.index > i) out.push({ t: txt.slice(i, m.index) }); out.push({ n: m[1], d: m[2] }); i = m.index + m[0].length; } if (i < txt.length) out.push({ t: txt.slice(i) }); return out; };
    const capTex = (big, small) => tex(CW, CH, (g, w, h) => {          // 台基上的两行字：大字一行、小字一行；{3/4} 写成上下两行的分数
      const FF = (px, wt) => `${wt} ${px}px "Times New Roman","Songti SC","STSong",serif`;
      const widthOf = (runs, px, wt) => runs.reduce((a, r) => { if (r.t != null) { g.font = FF(px, wt); return a + g.measureText(r.t).width; } g.font = FF(Math.round(px * 0.6), wt); return a + Math.max(g.measureText(r.n).width, g.measureText(r.d).width) + px * 0.22; }, 0);
      const fitPx = (runs, px, wt) => { let f = Math.round(px); while (f > 10 && widthOf(runs, f, wt) > w * 0.86) f -= 2; return f; };
      const R1 = capRuns(big), R2 = small ? capRuns(small) : null, p1 = fitPx(R1, h * 0.3, 600), p2 = R2 ? fitPx(R2, h * 0.18, 500) : 0;
      const w1 = widthOf(R1, p1, 600), w2 = R2 ? widthOf(R2, p2, 500) : 0, tot = Math.max(w1, w2), x0 = (w - tot) / 2;
      const band = g.createLinearGradient(x0 - h * 0.6, 0, x0 + tot + h * 0.6, 0); band.addColorStop(0, 'rgba(40,30,18,0)'); band.addColorStop(0.08, 'rgba(40,30,18,0.5)'); band.addColorStop(0.92, 'rgba(40,30,18,0.5)'); band.addColorStop(1, 'rgba(40,30,18,0)');
      g.fillStyle = band; g.fillRect(x0 - h * 0.6, h * 0.08, tot + h * 1.2, h * 0.84);
      const drawRuns = (runs, px, wt, y, col, ww) => { let x = (w - ww) / 2; g.textBaseline = 'middle'; g.fillStyle = col; for (const r of runs) { if (r.t != null) { g.font = FF(px, wt); g.textAlign = 'left'; g.fillText(r.t, x, y); x += g.measureText(r.t).width; } else { const fp = Math.round(px * 0.6); g.font = FF(fp, wt); const rw = Math.max(g.measureText(r.n).width, g.measureText(r.d).width) + px * 0.22, cx = x + rw / 2; g.textAlign = 'center'; g.fillText(r.n, cx, y - px * 0.36); g.fillText(r.d, cx, y + px * 0.42); g.fillRect(x + px * 0.08, y + px * 0.01, rw - px * 0.16, Math.max(1.5, px * 0.05)); x += rw; } } };
      drawRuns(R1, p1, 600, R2 ? h * 0.38 : h * 0.5, '#fbf2de', w1); if (R2) drawRuns(R2, p2, 500, h * 0.73, '#ece1ca', w2); });
    const cap = { key: '', born: -9, out: 1e9, next: null };
    function caption(big, small = '') { const key = big + '|' + small; if (key === cap.key) return; cap.key = key; S_.cap = [big, small];
      const show = () => { capMesh.material.map?.dispose?.(); capMesh.material.map = capTex(big, small); capMesh.material.needsUpdate = true; capMesh.visible = true; cap.born = now(); cap.out = 1e9; };
      if (capMesh.visible && now() - cap.born > 0.2) { cap.out = now(); cap.next = show; } else show(); }
    const prompt = (txt) => { S_.ask = txt; if (ui?.status) ui.status(txt); };

    // ================= 板书 =================
    const css = document.createElement('style');
    css.textContent = `
.mfr{display:inline-block;vertical-align:middle;text-align:center;font-style:normal;font-size:0.86em;line-height:1.12;margin:0 0.08em}.mfr>span{display:block;padding:0 0.12em}.mfr>span:first-child{border-bottom:1px solid currentColor}
.th-board{margin:4px 0 6px;display:flex;flex-direction:column;gap:8px;font:15px/1.7 "Kaiti SC","STKaiti","Songti SC",serif;color:#2b2722}
.th-board .tb-row{opacity:0;transform:translateY(5px);transition:opacity .5s,transform .5s,background-color 2.4s;padding:3px 8px 3px 6px;border-radius:5px;border-left:3px solid transparent}
.th-board .tb-row.in{opacity:1;transform:none}
.th-board .tb-row.fresh{background:rgba(255,206,110,.34);border-left-color:#d98a2b}
.th-board .n{display:inline-block;min-width:1.25em;color:#b0532a;font-weight:700}
.th-board b{color:#8a2f1d}
.th-board i{font-family:"Times New Roman",serif;font-style:italic;letter-spacing:.02em}
.th-board .g{color:#b77d00;font-weight:600}.th-board .b{color:#1f86ad;font-weight:600}.th-board .t{color:#139a7c;font-weight:600}.th-board .r{color:#d4402f;font-weight:600}
.th-board .tb-h{font:600 12px/1.3 "PingFang SC","Hiragino Sans GB",sans-serif;color:#a07a45;letter-spacing:.3em;margin:6px 0 -4px;opacity:0;transition:opacity .4s}
.th-board .tb-h.in{opacity:1}
.th-board.review .tb-row[data-k]{cursor:pointer}.th-board.review .tb-row[data-k]:hover{background:rgba(255,206,110,.16)}
.th-board .tb-row.sel{background:rgba(255,206,110,.34);border-left-color:#d98a2b}`;
    document.head.append(css);
    let boardEl = null, lastH = ''; const rows = [];
    const reveal = (r) => { const body = boardEl?.closest('.p-body'); if (!body) return; setTimeout(() => { const rb = r.getBoundingClientRect(), bb = body.getBoundingClientRect(); if (rb.bottom > bb.bottom - 14) body.scrollBy({ top: rb.bottom - bb.bottom + 28, behavior: 'smooth' }); }, 80); };
    const board = (html, key = '') => { const r = document.createElement('div'); r.className = 'tb-row'; r.innerHTML = html; r.dataset.k = key; rows.push(r); for (const o of rows) o.classList?.remove('fresh'); if (boardEl) { boardEl.append(r); requestAnimationFrame(() => { r.classList.add('in', 'fresh'); reveal(r); }); } return r; };
    board.h = (title) => { if (title === lastH) return; lastH = title; const r = document.createElement('div'); r.className = 'tb-h'; r.textContent = title; rows.push(r); if (boardEl) { boardEl.append(r); requestAnimationFrame(() => { r.classList.add('in'); reveal(r); }); } };
    const I = (s) => `<i>${s}</i>`;

    // ================= 状态 =================
    const fresh = () => ({ a: A0, h: 0, k: 0, step: 'k', held: '', k0: 0, px: 1.2, land: null, path: 0, pPath: 0, pSide: 0, minX: 9, maxX: -9, minY: 9, maxY: -9, asked: false, done: false, cap: ['', ''], ask: '', stepAt: 0, hint: 0, moved: -9, crownAt: -9, pipeY: null, pipeAt: -9, pose: '', fx: { ghost: true, before: false, kArr: false, hArr: false, look: false, axis: false, vec: false, drop: false, app: false } });
    let S_ = fresh(), runId = 0;
    const later = (ms, fn) => { const id = runId; setTimeout(() => { if (!dead && id === runId) fn(); }, ms); };
    const landX = () => (S_.k > 0 && S_.a < 0 ? S_.h + Math.sqrt(-S_.k / S_.a) : null);
    const nozX = () => S_.h - OFF, nozY = () => fy(S_.a, S_.h, S_.k, nozX());
    const eqSegs = () => { const h = q1(S_.h), k = q1(S_.k), out = [['y', CSS.w], [' = ', CSS.w, false], ...fracSegs(S_.a, S_.step === 'appA' || S_.step === 'app2' ? CSS.r : CSS.w)];
      if (Math.abs(h) < 0.05) out.push(['x', CSS.w], ['²', CSS.w, false]); else out.push(['(', CSS.w, false], ['x', CSS.w], [h > 0 ? ' − ' : ' + ', CSS.b, false], [num(Math.abs(h)), CSS.b, false], [')²', CSS.w, false]);
      if (Math.abs(k) >= 0.05) out.push([k > 0 ? ' + ' : ' − ', CSS.t, false], [num(Math.abs(k)), CSS.t, false]); return out; };

    function layout() {
      const { a, h, k, fx } = S_;
      ghost.set(fx.ghost ? curve(a, 0, 0) : null);
      before.set(fx.before ? curve(a, 0, S_.k0) : null);
      para.set(curve(a, h, k));
      VD.at([h, k]); setRich(VL, [['(', CSS.w, false], [num(h), CSS.b, false], [', ', CSS.w, false], [num(k), CSS.t, false], [')', CSS.w, false]], [h + 0.18, k + 0.3], 0);
      setRich(EQ, eqSegs(), [0.2, YT + 0.75]);
      // 往上提：几支一样长的箭头，从原来的抛物线指到现在的
      kArr.forEach((ar, i) => { const x = [-1, 0, 1][i]; if (fx.kArr && Math.abs(k) > 0.12) ar.to([x, fy(a, 0, 0, x)], [x, fy(a, 0, k, x)]); else ar.off(); });
      setRich(KL, fx.kArr && Math.abs(k) > 0.12 ? [['k', CSS.t], [' = ', CSS.t, false], [num(k), CSS.t, false]] : null, [1.12, fy(a, 0, 0, 1) + k / 2], 0);
      // 往右挪：两支一样长的横箭头
      hArr.forEach((ar, i) => { const dy = [-0.5, -1.8][i]; const y = S_.k0 + dy * 1, xg = Math.sqrt(-dy / -a); if (fx.hArr && Math.abs(h) > 0.12 && y > FLOOR) ar.to([xg, y], [xg + h, y]); else ar.off(); });
      setRich(HL, fx.hArr && Math.abs(h) > 0.12 ? [['h', CSS.b], [' = ', CSS.b, false], [num(h), CSS.b, false]] : null, [Math.sqrt(0.5 / -a) + h / 2, S_.k0 - 0.5 + 0.3], 0.5);
      // 为什么是减：点 P 往回看 h，和原来那条一样高
      if (fx.look) { const x = S_.px, y = fy(a, h, k, x), xg = x - h; PD.at([x, y]); look.to([x, y], [xg, y]); dropP.set([[x, y], [x, 0]]); dropG.set([[xg, y], [xg, 0]]);
        const ly = y >= 0 ? -0.42 : 0.34; setRich(PL1, [['x', CSS.w]], [x, ly]); setRich(PL2, [['x', CSS.b], [' − ', CSS.b, false], ['h', CSS.b]], [xg, ly]); }
      else if (!fx.drop) { PD.visible = false; look.off(); dropP.hide(); dropG.hide(); setRich(PL1, null); setRich(PL2, null); }
      // 对称轴、顶点从原点挪过来的那一步（向右 h、向上 k）
      axis.set(fx.axis ? [[h, FLOOR], [h, YT]] : null);
      if (fx.vec && (Math.abs(h) > 0.12 || Math.abs(k) > 0.12)) { vecH.to([0, 0], [h, 0]); vecK.to([h, 0], [h, k]); } else { vecH.off(); vecK.off(); }
      // 水滴沿着水柱走
      if (fx.drop) { const x = S_.px, y = fy(a, h, k, x); PD.at([x, y]); const up = x < h - 0.05 ? ' ↗' : x > h + 0.05 ? ' ↘' : ''; setRich(YL, [['y', CSS.w], [' = ', CSS.w, false], [num(y), x < h - 0.05 ? CSS.t : x > h + 0.05 ? CSS.r : CSS.g, false], [up, x < h - 0.05 ? CSS.t : CSS.r, false]], [x + 0.22, y + 0.28], 0); dropP.set([[x, y], [x, 0]]); }
      else setRich(YL, null);
      // 回到喷水池：目标点、落点
      target.set(fx.app ? ringPts(TOP, 0.2) : null); landMark.set(fx.app ? [[LAND, -0.25], [LAND, 0.25]] : null);
      const lx = landX(); if (S_.step === 'appA' && lx != null) { LD.at([lx, 0]); setRich(LL, [[num2(lx), CSS.r, false]], [lx, -0.45]); } else { LD.visible = false; setRich(LL, null); }
      // 水管：从池底到喷头
      const py = S_.pipeY != null ? S_.pipeY : nozY(), px = nozX(), top = Math.max(FLOOR, py);
      pipe.position.x = wx(px); pipeBody.scale.y = Math.max(0.001, (top - FLOOR) * S); pipeBody.position.y = wy(FLOOR); nozzle.position.y = wy(top); nozzle.visible = top > FLOOR + 0.05;
      if (S_.fx.pipeLab) { ND2.at([px, top]); setRich(PIPEL, [[num2(top), CSS.g, false], [' m', CSS.g, false]], [px - 0.22, top / 2], 1); } else { ND2.visible = false; setRich(PIPEL, null); }
    }
    function trailSnap() { const L = trails[trailI++ % trails.length], c = curve(S_.a, S_.h, S_.k); if (!c) return; L.set(c); L.born = now(); }

    // ================= 一课的主线 =================
    function kDone() {          // 重拍 1：整条往上提 k
      S_.step = 'k-done'; flash([0, S_.k], TEAL); sfx.ding(1180, { gain: 0.06 }); S_.kPulse = now();
      if (S_.k > 0) caption('每一点都升高了 k，整条抛物线向上平移', 'y = ax² 变成 y = ax² + k'); else caption(`每一点都降低了 ${num(-S_.k)}，整条抛物线向下平移`, `y = ax² 变成 y = ax² − ${num(-S_.k)}`);
      board.h('上下平移'); board(`<span class="n">1</span>把抛物线 ${I('y')} = ${I('ax')}² 向上（<span class="t">${I('k')} &gt; 0</span>）或向下（<span class="t">${I('k')} &lt; 0</span>）平移 <span class="t">|${I('k')}|</span> 个单位长度，就得到抛物线 ${I('y')} = ${I('ax')}² <span class="t">+ ${I('k')}</span>`, 'k');
      later(2000, () => { S_.step = 'h'; S_.k0 = S_.k; S_.fx.kArr = false; S_.fx.ghost = false; S_.fx.before = true; S_.fx.hArr = true; S_.stepAt = now(); S_.hint = 0; before.draw(curve(S_.a, 0, S_.k0), 0.7);
        caption('上下挪是 + k。往右挪呢？', '把水柱往右拖'); prompt('往右挪，式子会怎么变？把水柱往右拖'); layout(); });
    }
    function hMoved() {          // 往右挪：出现的是减号
      S_.step = 'why'; S_.fx.look = true; S_.fx.hArr = false; S_.px = S_.h + 1.2; S_.pPath = 0; S_.stepAt = now(); S_.hint = 0;
      caption(S_.h > 0 ? `往右挪了 ${num(S_.h)}，式子里却是 x − ${num(S_.h)}` : `往左挪了 ${num(-S_.h)}，式子里却是 x + ${num(-S_.h)}`, '为什么？拖着弧上的点 P 看看');
      prompt('拖着弧上的点 P 走：它和原来那条，在哪儿一样高？'); flash([S_.h, S_.k], BLUE, 0.15, 0.45); layout();
    }
    function whyDone() {          // 重拍 2：往回看 h
      S_.step = 'why-done'; flash([S_.px - S_.h, fy(S_.a, S_.h, S_.k, S_.px)], BLUE); sfx.ding(1250, { gain: 0.06 });
      caption('新抛物线在 x 处的高度，就是原来在 x − h 处的高度', '所以往右挪 h，式子里是 x − h；往左挪，就是加');
      board.h('左右平移'); board(`<span class="n">2</span>把抛物线 ${I('y')} = ${I('ax')}² 向左（<span class="b">${I('h')} &lt; 0</span>）或向右（<span class="b">${I('h')} &gt; 0</span>）平移 <span class="b">|${I('h')}|</span> 个单位长度，就可以得到抛物线 ${I('y')} = ${I('a')}(${I('x')} <span class="b">− ${I('h')}</span>)²：新抛物线在 ${I('x')} 处的高度，就是原来在 <span class="b">${I('x')} − ${I('h')}</span> 处的高度`, 'h');
      later(2400, () => { S_.step = 'gen'; S_.fx.look = false; S_.fx.before = false; S_.fx.ghost = true; S_.fx.vec = true; S_.path = 0; S_.minX = S_.maxX = S_.h; S_.minY = S_.maxY = S_.k; S_.stepAt = now(); S_.hint = 0; ghost.draw(curve(S_.a, 0, 0), 0.6);
        caption('上下、左右一起挪呢？', '随便拖水柱的最高点'); prompt('随便拖：抛物线会不会变形？式子怎么跟着变？'); layout(); });
    }
    function genDone() {          // 重拍 3：形状相同，位置不同
      S_.step = 'gen-done'; S_.fx.axis = true; axis.draw([[S_.h, FLOOR], [S_.h, YT]], 0.6); flash([S_.h, S_.k], GOLD); sfx.ding(1320, { gain: 0.07 }); for (const L of trails) if (L.pts) L.born = now();
      caption('形状相同，位置不同', '顶点是 (h, k)，对称轴是 x = h');
      board.h('一般地'); board(`<span class="n">3</span>抛物线 ${I('y')} = ${I('a')}(${I('x')} <span class="b">− ${I('h')}</span>)² <span class="t">+ ${I('k')}</span> 与 ${I('y')} = ${I('ax')}² 形状相同，位置不同。平移的方向、距离要根据 <span class="b">${I('h')}</span>，<span class="t">${I('k')}</span> 的值来决定。（1）当 ${I('a')} &gt; 0 时，开口向上；当 ${I('a')} &lt; 0 时，开口向下。（2）对称轴是 <span class="b">${I('x')} = ${I('h')}</span>。（3）顶点是 <span class="g">(${I('h')}, ${I('k')})</span>。`, 'gen');
      later(2600, () => { S_.step = 'max'; S_.fx.vec = false; S_.fx.drop = true; S_.px = S_.h - 1.4; S_.pSide = -1; S_.stepAt = now(); S_.hint = 0;
        caption('一滴水顺着水柱走', '它什么时候在升高，什么时候在下降？'); prompt('拖着水滴沿水柱走：哪一段在升高，哪一段在下降？'); layout(); });
    }
    function maxDone() {          // 最高点：x = h 时 y 最大
      S_.step = 'max-done'; flash([S_.h, S_.k], GOLD, 0.15, 0.5); sfx.ding(1400, { gain: 0.05 });
      caption('x = h 时，y 最大，最大值是 k', 'x < h 时 y 随 x 增大而增大；x > h 时 y 随 x 增大而减小');
      board(`<span class="n">4</span>如果 ${I('a')} &lt; 0，那么当 ${I('x')} &lt; ${I('h')} 时，${I('y')} 随 ${I('x')} 的增大而增大，当 ${I('x')} &gt; ${I('h')} 时，${I('y')} 随 ${I('x')} 的增大而减小，当 ${I('x')} = ${I('h')} 时，${I('y')} 取最大值，最大值为 <span class="t">${I('k')}</span>（${I('a')} &gt; 0 时反过来，最小值为 ${I('k')}）`, 'max');
      later(2600, () => { S_.step = 'app'; S_.fx.drop = false; S_.fx.axis = false; S_.fx.ghost = false; S_.fx.app = true; S_.stepAt = now(); S_.hint = 0; target.draw(ringPts(TOP, 0.2), 0.6);
        caption('回到喷水池：水柱最高处在 (1.6, 3)', '把最高点拖过去'); prompt('把水柱的最高点拖到 (1.6, 3)：水管就在池中心'); layout(); });
    }
    function topSet() {          // 顶点到了 (1.6, 3)：位置定了，落点还不对
      S_.step = 'appA'; S_.stepAt = now(); S_.hint = 0; flash(TOP, GOLD, 0.15, 0.5);
      caption(`最高点对了，可水落在 ${num2(landX())} m 处`, '形状还没定：把落点拖到 3.6'); prompt('拖红色的落点到 3.6 m：开口要变成多大？');
      board.h('喷水池'); board(`<span class="n">5</span>最高点是 (1.6, 3)，设 ${I('y')} = <span class="r">${I('a')}</span>(${I('x')} <span class="b">− 1.6</span>)² <span class="t">+ 3</span>（0 ≤ ${I('x')} ≤ 3.6）`, 'app');
      layout();
    }
    function landSet() {          // 重拍 4：a = −¾，水管长 1.08 m
      S_.step = 'app2'; flash([LAND, 0], RED, 0.15, 0.5); sfx.ding(1320, { gain: 0.06 });
      caption('0 = a(3.6 − 1.6)² + 3，a = −{3/4}', 'y = −{3/4}(x − 1.6)² + 3');
      board(`经过 (3.6, 0)：0 = <span class="r">${I('a')}</span>(3.6 − 1.6)² + 3，解得 <span class="r">${I('a')} = −${FR(3, 4)}</span>，${I('y')} = −${FR(3, 4)}(${I('x')} − 1.6)² + 3`, 'app');
      later(1500, () => { S_.pipeY = FLOOR; S_.pipeAt = now(); S_.fx.pipeLab = true; sfx.whoosh({ dur: 0.9, freq: 700, gain: 0.04 }); });          // 水管从池底长上来，接上水柱
      later(2700, () => { finish(); });
    }
    function finish() {
      S_.step = 'end'; S_.done = true; boardEl?.classList.add('review'); S_.crownAt = now(); flash([0, nozY()], GOLD); sfx.ding(1568, { gain: 0.07 }); later(450, () => sfx.ding(1976, { gain: 0.05 }));
      caption('当 x = 0 时，y = 1.08：水管长 1.08 m', '最高点定位置（h, k），再用一个点定形状（a）');
      board.h('答'); board(`<b>答</b>：当 ${I('x')} = 0 时，${I('y')} = −${FR(3, 4)} × 1.6² + 3 = 1.08，水管的长应为 <span class="g">1.08 m</span>。`, 'ans');
      prompt(''); ui?.unlock?.(); layout();
      later(2600, () => { ui?.go?.(2); ui?.fold?.(false); });          // 一课结束：翻到“对照课本原文”
    }
    // 讲完以后点板书：场景摆回那一刻
    function pose(key) {
      S_.pose = key; S_.pipeY = null; S_.crownAt = key === 'ans' ? now() : -9;
      const fx = { ghost: false, before: false, kArr: false, hArr: false, look: false, axis: false, vec: false, drop: false, app: false, pipeLab: false };
      if (key === 'k') Object.assign(S_, { a: A0, h: 0, k: 2 }, { fx: { ...fx, ghost: true, kArr: true } });
      if (key === 'h') Object.assign(S_, { a: A0, h: 2, k: 2, k0: 2, px: 3.2 }, { fx: { ...fx, before: true, look: true } });
      if (key === 'gen') Object.assign(S_, { a: A0, h: 1.5, k: 2.5 }, { fx: { ...fx, ghost: true, vec: true, axis: true } });
      if (key === 'max') Object.assign(S_, { a: A0, h: 1, k: 2.6, px: 1 }, { fx: { ...fx, axis: true, drop: true } });
      if (key === 'app' || key === 'ans') Object.assign(S_, { a: -0.75, h: TOP[0], k: TOP[1] }, { fx: { ...fx, app: true, pipeLab: true } });
      const CAP = { k: ['每一点都升高了 k，整条抛物线向上平移', 'y = ax² 变成 y = ax² + k'], h: ['新抛物线在 x 处的高度，就是原来在 x − h 处的高度', '所以往右挪 h，式子里是 x − h'], gen: ['形状相同，位置不同', '顶点是 (h, k)，对称轴是 x = h'], max: ['x = h 时，y 最大，最大值是 k', 'x < h 时升高，x > h 时下降'], app: ['0 = a(3.6 − 1.6)² + 3，a = −{3/4}', 'y = −{3/4}(x − 1.6)² + 3'], ans: ['当 x = 0 时，y = 1.08：水管长 1.08 m', '最高点定位置（h, k），再用一个点定形状（a）'] };
      caption(...(CAP[key] || CAP.ans)); flash([S_.h, S_.k], GOLD, 0.15, 0.45); layout();
    }

    // ================= 动手 =================
    const toM = (p) => [p.x / S, (p.y - Y0) / S];
    let grab = [0, 0];
    function vDown(m) { if (!['k', 'h', 'gen', 'app'].includes(S_.step) && !S_.done) return false; S_.held = 'v'; grab = [S_.h - m[0], S_.k - m[1]]; if (!S_.asked) { S_.asked = true; board.h('问题'); board(`水柱是一条抛物线，最高点在 <span class="g">(1.6, 3)</span>，落在 (3.6, 0)：水管的长应为多少？先看抛物线 ${I('y')} = ${I('ax')}² 挪到别处，式子怎么变`, 'k'); } return true; }
    function vMove(m) {
      if (S_.held !== 'v') return; let h = m[0] + grab[0], k = m[1] + grab[1];
      if (S_.step === 'k') h = 0; else if (S_.step === 'h') k = S_.k0;
      h = clamp(q1(h), -1.5, 2.2); k = clamp(q1(k), -1.2, 3.2);
      if (S_.step === 'app' && Math.hypot(h - TOP[0], k - TOP[1]) < 0.25) { h = TOP[0]; k = TOP[1]; }
      const d = Math.hypot(h - S_.h, k - S_.k); if (d < 1e-9) return;
      S_.path += d; S_.h = h; S_.k = k; S_.moved = now(); S_.minX = Math.min(S_.minX, h); S_.maxX = Math.max(S_.maxX, h); S_.minY = Math.min(S_.minY, k); S_.maxY = Math.max(S_.maxY, k);
      if (!trailAt || Math.hypot(h - trailAt[0], k - trailAt[1]) > 0.45) { trailAt = [h, k]; if (['k', 'h', 'gen'].includes(S_.step)) trailSnap(); }
      if (S_.step === 'k' && !S_.fx.kArr && Math.abs(k) > 0.2) { S_.fx.kArr = true; }
      if (S_.step === 'h' && Math.abs(h) > 0.12) S_.fx.hArr = true;
      layout();
    }
    function vUp() {
      if (S_.held !== 'v') return; S_.held = '';
      if (S_.step === 'k' && Math.abs(S_.k) >= 1) kDone();
      else if (S_.step === 'h' && Math.abs(S_.h) >= 1) hMoved();
      else if (S_.step === 'gen' && S_.path > 3 && S_.maxX - S_.minX > 0.8 && S_.maxY - S_.minY > 0.8) genDone();
      else if (S_.step === 'app' && S_.h === TOP[0] && S_.k === TOP[1]) topSet();
    }
    function pDown() { if (!(S_.fx.look || S_.fx.drop)) return false; S_.held = 'p'; return true; }
    function pMove(m) {
      if (S_.held !== 'p') return; const lo = -3.8, hi = 4.4; const x = clamp(m[0], lo, hi), d = Math.abs(x - S_.px); S_.pPath += d; S_.px = x; S_.moved = now();
      if (S_.step === 'why' && S_.pPath > 0.8) whyDone();
      if (S_.step === 'max') { const side = Math.sign(x - S_.h) || S_.pSide; if (side !== S_.pSide && S_.pPath > 0.5) maxDone(); S_.pSide = side; }
      layout();
    }
    function pUp() { if (S_.held === 'p') S_.held = ''; }
    function lDown() { if (S_.step !== 'appA') return false; S_.held = 'l'; return true; }
    function lMove(m) {
      if (S_.held !== 'l') return; let x = clamp(m[0], TOP[0] + 0.9, 4.4); if (Math.abs(x - LAND) < 0.12) x = LAND;
      S_.a = -TOP[1] / (x - TOP[0]) ** 2; S_.moved = now(); layout();
      if (x === LAND) { S_.a = -0.75; S_.held = ''; layout(); landSet(); }
    }
    function lUp() { if (S_.held === 'l') S_.held = ''; }
    const pick = (r) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r * S, 12, 10), basic({ visible: false })); m.userData.pick = true; m.userData.noFrame = true; group.add(m); return m; };
    const vPick = pick(0.42), pPick = pick(0.36), lPick = pick(0.4);
    const drags = [
      { obj: vPick, plane: 'xy', offset: Z, hint: () => (S_.step === 'k' ? '按住往上提' : S_.step === 'h' ? '按住往右拖' : '拖着水柱的最高点'), enabled: () => ['k', 'h', 'gen', 'app'].includes(S_.step) || S_.done, onStart: (p) => vDown(toM(p)), onDrag: (p) => vMove(toM(p)), onEnd: () => vUp() },
      { obj: pPick, plane: 'xy', offset: Z, hint: () => (S_.fx.drop ? '拖着水滴沿水柱走' : '拖着点 P 沿弧走'), enabled: () => S_.fx.look || S_.fx.drop, onStart: () => pDown(), onDrag: (p) => pMove(toM(p)), onEnd: () => pUp() },
      { obj: lPick, plane: 'xy', offset: Z, hint: () => '拖着落点左右挪', enabled: () => S_.step === 'appA', onStart: () => lDown(), onDrag: (p) => lMove(toM(p)), onEnd: () => lUp() },
    ];
    const dragApi = draggable(group, drags, { onClick: () => false, tip: tag?.('', 'pill') });
    let heard = false;
    const pointer = { down: (r, e) => { if (!heard) { heard = true; audio(); } return dragApi.down(r, e); }, move: (r, e) => dragApi.move(r, e), up: (r, e) => dragApi.up(r, e), items: dragApi.items };
    function opening() { caption('水管要多长？', '水柱最高处离池中心 1.6 m、高 3 m，落在离池中心 3.6 m 处'); prompt('先把水柱往上提：抛物线 y = −' + FR(1, 2) + 'x² 会怎么变？'); }
    function reset() { runId++; S_ = fresh(); trailAt = null; for (const L of trails) { L.hide(); L.born = -9; } for (const L of [target, landMark, axis, before]) L.hide(); rows.length = 0; lastH = ''; if (boardEl) { boardEl.innerHTML = ''; boardEl.classList.remove('review'); } cap.key = ''; ui?.relock?.(); ui?.go?.(1); opening(); layout(); }
    const onKey = (e) => { if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !e.target?.closest?.('input,textarea')) reset(); };
    addEventListener('keydown', onKey);

    layout();
    const DIR = [0, Math.sin(0.37), Math.cos(0.37)];
    let last = now();
    return {
      group: root, card: false, place: 'spread', scale: 0.95,
      size: { w: 2 * (R + RIM + 0.9) * S, d: 2 * (R + RIM + 0.6) * S, h: (SKY - BASE) * S },
      view: { elev: 21, azim: 0, lookY: 0.45, frameMargin: 1.0 },
      pointer,
      mount(u) { ui = u; boardEl = document.createElement('div'); boardEl.className = 'th-board' + (S_.done ? ' review' : ''); u.controls?.append(boardEl);
        boardEl.addEventListener('click', (e) => { const r = e.target.closest?.('.tb-row'); if (!S_.done || !r?.dataset.k) return; for (const o of rows) o.classList?.remove('sel', 'fresh'); r.classList.add('sel'); sfx.clink({ freq: 1200, gain: 0.03 }); pose(r.dataset.k); });
        for (const r of rows) { boardEl.append(r); r.classList.add('in'); }
        ui.go?.(1); if (!cap.key) opening(); else if (S_.ask) ui.status?.(S_.ask);
        requestAnimationFrame(() => aim?.(DIR)); setTimeout(() => { if (!dead) aim?.(DIR); }, 700); },
      dispose() { dead = true; runId++; removeEventListener('keydown', onKey); css.remove(); },
      update() {
        const t = now(), dt = Math.min(0.05, t - last); last = t;
        flowTex.offset.x -= dt * 0.02; flowTex.offset.y += dt * 0.012;
        // 自己画出来的笔画
        for (const L of lineMeshes) if (L.anim) { const k = clamp((t - L.anim.t0) / L.anim.dur, 0, 1), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; L._draw(L.pts ? partial(L.pts, e) : null); if (k >= 1) { L.anim = null; L._draw(L.pts); } }
        // 拖的时候留下的一族抛物线：慢慢淡掉
        for (const L of trails) { if (!L.pts) continue; const age = t - L.born; L.fade(clamp(0.55 * (1 - age / 2.6), 0, 0.55)); if (age > 2.6) L.hide(); }
        // 往上提的那几支箭头：重拍时一起鼓一下
        { const k = clamp((t - (S_.kPulse || -9)) / 0.8, 0, 1), b = k < 1 ? Math.sin(k * Math.PI) : 0; for (const ar of kArr) ar.fade(1 + 0.6 * b); }
        // 闪光
        for (let i = flashes.length - 1; i >= 0; i--) { const F = flashes[i], k = clamp((t - F.t0) / 0.55, 0, 1), e = easeOut(k); F.rays.forEach((L, j) => { const th = (j / F.rays.length) * Math.PI * 2 + 0.2, ra = lerp(F.r0, F.r1, e), rb = lerp(F.r0, F.r1, Math.min(1, e * 0.55 + 0.1)); L.set([[F.p[0] + Math.cos(th) * rb, F.p[1] + Math.sin(th) * rb], [F.p[0] + Math.cos(th) * ra, F.p[1] + Math.sin(th) * ra]]); L.fade(1 - k); });
          if (k >= 1) { for (const L of F.rays) { L.hide(); for (const m of [L.core, L.glow, L.shade]) if (m) { group.remove(m); m.geometry.dispose(); m.material.dispose(); } lineMeshes.splice(lineMeshes.indexOf(L), 1); } flashes.splice(i, 1); } }
        // 水管长上来接住水柱
        if (S_.pipeY != null && S_.pipeAt > 0) { const k = clamp((t - S_.pipeAt) / 1.1, 0, 1); S_.pipeY = lerp(FLOOR, nozY(), easeOut(k)); if (k >= 1) { S_.pipeY = null; S_.pipeAt = -9; } layout(); }
        // 水：主水柱从喷头喷出，落进池里；讲完以后一圈水柱一起喷
        { const a = S_.a, h = S_.h, k = S_.k, xn = nozX(), yn = S_.pipeY != null ? -9 : nozY(), lx = landX(); let n = 0; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
          if (lx != null && yn > FLOOR + 0.05) { const x0 = xn, x1 = Math.min(lx, R - 0.1);
            for (const sd of seeds) { if (sd.s > 1.02) continue; const u = (sd.t + t * 0.28) % 1, x = lerp(x0, x1, u), y = fy(a, h, k, x) + sd.j * 0.3; if (y < 0.02 || y > YT + 0.6) continue; const dydx = 2 * a * (x - h), ang = Math.atan2(dydx, 1); q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), ang); sc.set(0.034 * S * sd.s * 2.6, 0.034 * S * sd.s, 0.034 * S * sd.s); ps.set(wx(x), wy(y), -0.02 * S + sd.j * 0.004); m4.compose(ps, q, sc); mainJet.setMatrixAt(n++, m4); }
            if (Math.random() < dt * 5 && x1 === lx) splash(lx); }
          mainJet.count = n; mainJet.instanceMatrix.needsUpdate = true;
          { const key = lx != null && yn > FLOOR + 0.05 ? [a, h, k].map((v) => v.toFixed(3)).join(',') : '';          // 水柱的管子：参数变了才重新做
            if (key !== streamKey) { streamKey = key; stream.geometry.dispose(); if (key) { stream.geometry = tubeAlong(jetPts(a, h, k, xn, Math.min(lx, R - 0.1)).map((v) => v.setZ(-0.02 * S))); stream.visible = true; } else { stream.geometry = new THREE.BufferGeometry(); stream.visible = false; } } }
          // 一圈水柱：同一条抛物线绕池中心转开（只在池子后半圈）
          let c = 0; const on = S_.crownAt > 0 ? clamp((t - S_.crownAt) / 1.2, 0, 1) : 0;
          if (on > 0 && Math.abs(xn) < 0.05 && lx != null) { for (let j = 0; j < 32; j++) { const th = (j / 32) * Math.PI * 2 + Math.PI / 32; for (const sd of seeds) { if (sd.s > 1.02) continue; const u = (sd.t + t * 0.28 + j * 0.13) % 1; if (u > on) continue; const x = lerp(0, lx, u), y = fy(a, h, k, x); if (y < 0.02) continue; ps.set(wx(x) * Math.cos(th), wy(y), -wx(x) * Math.sin(th)); q.identity(); sc.setScalar(0.03 * S * sd.s); m4.compose(ps, q, sc); crown.setMatrixAt(c++, m4); } if (Math.random() < dt * 0.8) splash(lx * Math.cos(th), -wx(lx) * Math.sin(th)); } }
          { const ckey = on > 0 && Math.abs(xn) < 0.05 && lx != null ? [a, h, k].map((v) => v.toFixed(3)).join(',') : '';          // 一圈水柱：同一条抛物线绕池中心转开，从喷头一路长出去
            if (ckey !== crownKey) { crownKey = ckey; crownStreams.forEach((m, j) => { m.geometry.dispose(); if (ckey) { m.geometry = tubeAlong(jetPts(a, h, k, 0, lx, (j / 32) * Math.PI * 2 + Math.PI / 32)); m.visible = true; } else { m.geometry = new THREE.BufferGeometry(); m.visible = false; } }); }
            if (ckey) for (const m of crownStreams) { const tot = m.geometry.index ? m.geometry.index.count : 0; m.geometry.setDrawRange(0, Math.floor((on * tot) / 6) * 6); } }
          crown.count = c; crown.instanceMatrix.needsUpdate = true; }
        for (let i = splashes.length - 1; i >= 0; i--) { const m = splashes[i], age = t - m.userData.born; if (age > 1.1) { group.remove(m); m.geometry.dispose(); m.material.dispose(); splashes.splice(i, 1); continue; } m.scale.setScalar((0.05 + age * 0.35) * S); m.material.opacity = 0.6 * (1 - age / 1.1); }
        // 此刻那一句：淡进淡出
        if (cap.out < 1e9) { const k = clamp(1 - (t - cap.out) / 0.35, 0, 1); capMesh.material.opacity = k; if (k <= 0) { cap.out = 1e9; const nx = cap.next; cap.next = null; nx?.(); } } else capMesh.material.opacity = clamp((t - cap.born) / 0.5, 0, 1);
        // 该动手的地方：顶点 / P / 落点轻轻一呼一吸
        { const b = 0.0135 * (1 + 0.18 * Math.sin(t * 3.4) ** 2); VD.scale.setScalar(['k', 'h', 'gen', 'app'].includes(S_.step) && !S_.held ? b : 0.0135); }
        vPick.position.set(wx(S_.h), wy(S_.k), Z); pPick.position.set(wx(S_.px), wy(fy(S_.a, S_.h, S_.k, S_.px)), Z); const lx2 = landX(); lPick.position.set(wx(lx2 ?? 0), wy(0), Z); lPick.visible = S_.step === 'appA'; pPick.visible = !!(S_.fx.look || S_.fx.drop);          // 用不上的拾取球收起来，不挡别的
        // 卡住很久才给提示（不拦着人）
        if (!S_.held && !S_.done && S_.hint < 1 && t - S_.stepAt > 15 && t - S_.moved > 4) {
          const H1 = { k: ['按住水柱的最高点往上提', '提高 1 米以上，松手'], h: ['按住最高点往右拖', '挪 1 米以上，松手'], why: ['看点 P 和原来那条：哪儿一样高？', '那支横着的箭头有多长？'], gen: ['往上、往下、往左、往右都拖一拖', '后面留下的那一族抛物线，形状变了吗？'], max: ['把水滴拖过最高点', '从左边拖到右边'], app: ['最高点拖到金色圆圈 (1.6, 3)', ''], appA: ['红点是水落下的地方', '拖到 3.6 那道红线上'] }[S_.step];
          if (H1) { S_.hint = 1; caption(...H1); } }
      },
      debug: {
        get S() { return S_; }, rows, pose, cap: () => S_.cap,
        labels: () => [EQ, VL, PL1, PL2, KL, HL, YL, LL, PIPEL],
        qa: [
          { name: '往上提', run: () => { vDown([0, 0]); for (let i = 1; i <= 20; i++) vMove([0, i * 0.1]); vUp(); }, wait: 2.4 },
          { name: '往右挪', run: () => { vDown([0, S_.k]); for (let i = 1; i <= 20; i++) vMove([i * 0.1, S_.k]); vUp(); }, wait: 0.6 },
          { name: '拖点 P', run: () => { pDown(); for (let i = 1; i <= 10; i++) pMove([S_.h + 1.2 + i * 0.1, 0]); pUp(); }, wait: 2.8 },
          { name: '随便拖', run: () => { vDown([S_.h, S_.k]); for (let i = 1; i <= 14; i++) vMove([S_.h - 0.1, S_.k - 0.1]); for (let i = 1; i <= 16; i++) vMove([S_.h + 0.1, S_.k + 0.06]); vUp(); }, wait: 3 },
          { name: '水滴走过最高点', run: () => { pDown(); for (let i = 1; i <= 30; i++) pMove([S_.h - 1.4 + i * 0.1, 0]); pUp(); }, wait: 3 },
          { name: '最高点拖到 (1.6, 3)', run: () => { vDown([S_.h, S_.k]); vMove([1.62, 2.98]); vUp(); }, wait: 0.8 },
          { name: '落点拖到 3.6', run: () => { lDown(); lMove([4.0, 0]); lMove([3.65, 0]); lUp(); }, wait: 4.6 },
        ],
      },
    };
  },
};
