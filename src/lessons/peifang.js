// 数学 九年级上册 25.2.1 配方法（课本 PDF 第 12–16 页）。
// 情境：一千二百年前，巴格达的花拉子米在他的书里问——一个正方形，加上它边长的 10 倍，一共是 39，边长是多少？
// （x² + 10x = 39。代数 algebra 这个词就来自他书名里的 al-jabr。）他的解法就是一张图：把 10x 那一条切成两半，
// 拼到正方形的两边，缺一个角，补上 5 × 5 = 25，就成了一个边长 x + 5 的大正方形，面积 64，边长 8，x = 3。
// 场景：巴格达一处铺地毯的石台，后面一堵带拱龛的墙。正方形、长条、补角都是地毯，学生自己切、自己拼、自己补。
// 一个画面里讲完，每一步都由学生的那一下做出来：
//   拖长条上的刀口：切下的一段拼到正方形上面——两段不一样长，拼出的外形是长方形；一样长（各 5）时外形成了正方形，缺角 5 × 5（重拍 1）；
//   把一块 5 × 5 的地毯补进缺角：x² + 10x + 25 = (x + 5)²，两边同时加 25，(x + 5)² = 64（重拍 2）；
//   点大正方形“开方”：边长 8，x + 5 = ±8，降次成两个一次方程，x = 3（重拍 3）；
//   拖大正方形的角改一次项系数：缺角总是 (一次项系数的一半)²；拖到课本的 x² + 6x + 4 = 0：两边同时加 (6/2)²，即 9（重拍 4）→ 配方法 → 答。
import * as THREE from 'three';
import { add, sub, mul, unit, dist, clamp, lerp, easeOut } from './kit/sheet.js';
import { draggable } from './kit/interact.js';
import { sfx, audio } from './kit/audio.js';

const G = 0.026;                                  // 石台顶面高
const U = 0.02;                                   // 方程里的 1，在台面上是 U 这么长
const XN = 3, XS = XN * U;                        // 正方形的边长 x（画出来就是 3）
const B0 = 10, C0 = 39;                           // 花拉子米：x² + 10x = 39
const O = [-0.155, -0.068];                       // 正方形地毯的左下角（u 向右，v 向里）
const TH = 0.0013;                                // 地毯厚
const STACK = [0.115, 0.05];                      // 叠着的小地毯（补角从这里拿）
const P3 = (p, y = 0) => new THREE.Vector3(p[0], y, -p[1]);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const f1 = (x) => (Math.abs(x - Math.round(x)) < 0.05 ? String(Math.round(x)) : x.toFixed(1));

export default {
  id: 'peifang',
  fig: '思考',
  title: '配方法',
  flow: 'explore',
  ask: '一千二百年前，巴格达的花拉子米在书里问：<br>一个正方形，加上它边长的 10 倍，一共是 39。这个正方形的边长是多少？',
  need: '切开长条地毯，拼一拼。',
  conclusion: {
    page: 13, rect: [60, 130, 480, 520],
    quote: '像上面那样，通过配成完全平方形式来解一元二次方程的方法，叫作配方法。',
    why: '把 x² + bx 画成一块正方形地毯和一条长 b、宽 x 的长条。长条切成一样长的两半（各 b/2），拼在正方形的两边，外形就成了边长 x + b/2 的正方形，只缺一个角：(b/2)²。补上这个角，左边就配成了完全平方式 (x + b/2)²；方程两边同时加上 (b/2)²，等式仍然成立。<br><br>花拉子米：x² + 10x = 39，两边加 25，(x + 5)² = 64，x + 5 = ±8，正方形的边长是 3。课本：x² + 6x + 4 = 0，移项 x² + 6x = −4，两边同时加 (6/2)²，即 9，(x + 3)² = 5，x = −3 ± √5。配方是为了利用开方实现降次，把一个一元二次方程转化成两个一元一次方程来解。',
    src: '课本 · 25.2.1 配方法；花拉子米的题和图见他约公元 820 年写的代数书',
  },

  create({ aim, tag }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    let XS = XN * U;          // 画出来的 x（换方程时会变）
    let ui = null, dead = false;
    const T0 = performance.now(), now = () => (performance.now() - T0) / 1000;
    const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    const basic = (o) => new THREE.MeshBasicMaterial(o);
    const lit = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o });
    const quiet = (m) => { m.raycast = () => {}; m.userData.noFrame = true; return m; };
    const solid = (m) => { m.castShadow = true; m.receiveShadow = true; m.raycast = () => {}; m.userData.noFrame = true; return m; };
    const GOLD = 0xffc83d, BLUE = 0x58c4dd, TEAL = 0x5cd0b3, RED = 0xfc6255, WHITE = 0xffffff;
    const CSS = { x2: '#ffc83d', bx: '#58c4dd', sq: '#5cd0b3', red: '#fc6255', w: '#ffffff' };
    const rnd = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();          // 每次打开花纹一样

    // ================= 石台：砂岩铺地，四周一圈彩砖 =================
    const stoneTex = tex(1024, 1024, (g, w, h) => {
      const n = 4, s = w / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const l = 78 + rnd() * 8, c = `hsl(${32 + rnd() * 8},${30 + rnd() * 10}%,${l}%)`; g.fillStyle = c; g.fillRect(i * s, j * s, s, s);
        for (let k = 0; k < 260; k++) { g.fillStyle = `rgba(${120 + rnd() * 60},${100 + rnd() * 40},${70 + rnd() * 30},${rnd() * 0.08})`; g.fillRect(i * s + rnd() * s, j * s + rnd() * s, 1 + rnd() * 5, 1 + rnd() * 4); } }
      g.strokeStyle = 'rgba(120,96,70,0.55)'; g.lineWidth = 5; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); } });
    stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping; stoneTex.repeat.set(1 / 0.12, 1 / 0.12);
    const sideTex = tex(512, 64, (g, w, h) => { g.fillStyle = '#c9ad86'; g.fillRect(0, 0, w, h); for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(${110 + rnd() * 60},${90 + rnd() * 40},${60 + rnd() * 30},${rnd() * 0.18})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 6, 1 + rnd() * 2); } g.fillStyle = 'rgba(90,70,50,0.35)'; g.fillRect(0, h * 0.5, w, 2); });
    sideTex.wrapS = sideTex.wrapT = THREE.RepeatWrapping; sideTex.repeat.set(12, 1);
    const TW = 0.4, TD = 0.27, TV0 = -0.135;          // 台面宽、深、前沿
    { const sh = new THREE.Shape(), r = 0.012, u0 = -TW / 2, u1 = TW / 2, v0 = TV0, v1 = TV0 + TD;
      sh.moveTo(u0 + r, v0); sh.lineTo(u1 - r, v0); sh.quadraticCurveTo(u1, v0, u1, v0 + r); sh.lineTo(u1, v1 - r); sh.quadraticCurveTo(u1, v1, u1 - r, v1); sh.lineTo(u0 + r, v1); sh.quadraticCurveTo(u0, v1, u0, v1 - r); sh.lineTo(u0, v0 + r); sh.quadraticCurveTo(u0, v0, u0 + r, v0);
      const bt = 0.0016, g = new THREE.ExtrudeGeometry(sh, { depth: G - 2 * bt, bevelEnabled: true, bevelThickness: bt, bevelSize: bt, bevelSegments: 2, steps: 1, curveSegments: 6 }); g.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(g, [lit({ map: stoneTex, roughness: 0.92 }), lit({ map: sideTex, roughness: 0.95 })]); m.position.y = bt; m.receiveShadow = true; m.raycast = () => {}; m.userData.qaSupport = true; group.add(m); }
    // 一圈彩砖（八角星），压在台面边上
    const zelTex = tex(512, 128, (g, w, h) => { g.fillStyle = '#f1e7d2'; g.fillRect(0, 0, w, h); const s = h;
      for (let x = 0; x < w; x += s) { const cx = x + s / 2, cy = h / 2, R = s * 0.42; g.fillStyle = (x / s) % 2 ? '#1f5d74' : '#2f7a64'; g.beginPath(); for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2 - Math.PI / 8, rr = k % 2 ? R * 0.62 : R; g.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); } g.closePath(); g.fill(); g.fillStyle = '#f6efe0'; g.beginPath(); g.arc(cx, cy, R * 0.22, 0, 6.3); g.fill(); g.fillStyle = '#b8862f'; for (const [dx, dy] of [[0, 0], [s, 0], [0, h], [s, h]]) { g.beginPath(); g.arc(x + dx, dy, s * 0.12, 0, 6.3); g.fill(); } }
      g.fillStyle = '#7a3c22'; g.fillRect(0, 0, w, 5); g.fillRect(0, h - 5, w, 5); });
    zelTex.wrapS = THREE.RepeatWrapping;
    { const band = 0.014, inset = 0.008, y = G + 0.0003;
      const strip = (u0, v0, u1, v1, along) => { const L = along === 'u' ? u1 - u0 : v1 - v0, geo = new THREE.PlaneGeometry(along === 'u' ? L : band, along === 'u' ? band : L).rotateX(-Math.PI / 2); const t = zelTex.clone(); t.needsUpdate = true; t.wrapS = THREE.RepeatWrapping; t.repeat.set(L / (band * 4), 1); if (along === 'v') t.rotation = Math.PI / 2, t.center.set(0.5, 0.5); const m = quiet(new THREE.Mesh(geo, lit({ map: t, roughness: 0.6 }))); m.position.set((u0 + u1) / 2, y, -(v0 + v1) / 2); m.receiveShadow = true; group.add(m); };
      const u0 = -TW / 2 + inset, u1 = TW / 2 - inset, v0 = TV0 + inset, v1 = TV0 + TD - inset;
      strip(u0, v0, u1, v0 + band, 'u'); strip(u0 + band, v1 - band, u1 - band, v1, 'u'); strip(u0, v0 + band, u0 + band, v1, 'v'); strip(u1 - band, v0 + band, u1, v1, 'v'); }

    // ================= 后面一堵墙：三个马蹄形拱龛，龛里贴彩砖 =================
    { const WU0 = -0.16, WU1 = 0.16, WV = 0.112, WH = 0.078, D1 = 0.004, D2 = 0.008;
      const sh = new THREE.Shape(); sh.moveTo(WU0, 0); sh.lineTo(WU1, 0); sh.lineTo(WU1, WH); sh.lineTo(WU0, WH); sh.lineTo(WU0, 0);
      for (const cx of [-0.1, 0, 0.1]) { const hole = new THREE.Path(), r = 0.019, yc = 0.044, a0 = -0.32, a1 = Math.PI + 0.32; hole.moveTo(cx + r * Math.cos(a0) * 0.86, 0.008); hole.lineTo(cx + r * Math.cos(a0) * 0.86, yc + r * Math.sin(a0)); hole.absarc(cx, yc, r, a0, a1, false); hole.lineTo(cx + r * Math.cos(a1) * 0.86, 0.008); hole.lineTo(cx + r * Math.cos(a0) * 0.86, 0.008); sh.holes.push(hole); }
      const plaster = lit({ color: 0xefe4cf, roughness: 0.9 }), front = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: D1, bevelEnabled: false, curveSegments: 24 }), plaster);
      front.position.set(0, G, -WV); front.castShadow = true; front.receiveShadow = true; front.raycast = () => {}; group.add(front);
      const nTex = tex(256, 256, (g, w, h) => { g.fillStyle = '#e9dcc2'; g.fillRect(0, 0, w, h); const s = 64; for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) { const cx = x + s / 2, cy = y + s / 2, R = s * 0.44; g.fillStyle = ((x + y) / s) % 2 ? '#1f5d74' : '#2f7a64'; g.beginPath(); for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2 - Math.PI / 8, rr = k % 2 ? R * 0.6 : R; g.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); } g.closePath(); g.fill(); g.fillStyle = '#f7f0e2'; g.beginPath(); g.arc(cx, cy, R * 0.2, 0, 6.3); g.fill(); } });
      nTex.wrapS = nTex.wrapT = THREE.RepeatWrapping; nTex.repeat.set((WU1 - WU0) / 0.064, WH / 0.064);
      const back = new THREE.Mesh(new THREE.BoxGeometry(WU1 - WU0, WH, D2), [plaster, plaster, plaster, plaster, lit({ map: nTex, roughness: 0.55 }), plaster]); back.position.set(0, G + WH / 2, -(WV + D2 / 2)); back.castShadow = true; back.receiveShadow = true; back.raycast = () => {}; group.add(back);
      const cap = solid(new THREE.Mesh(new THREE.BoxGeometry(WU1 - WU0 + 0.008, 0.005, D1 + D2 + 0.006), lit({ color: 0xd8c8a8, roughness: 0.8 }))); cap.position.set(0, G + WH + 0.0025, -(WV + D2 / 2 - 0.001)); group.add(cap);
      const frieze = quiet(new THREE.Mesh(new THREE.PlaneGeometry(WU1 - WU0 - 0.01, 0.009), lit({ map: (() => { const t = zelTex.clone(); t.needsUpdate = true; t.wrapS = THREE.RepeatWrapping; t.repeat.set(9, 1); return t; })(), roughness: 0.6 }))); frieze.position.set(0, G + WH - 0.008, -WV + D1 + 0.0002); group.add(frieze); }

    // ================= 道具：卷着的地毯、铜油灯 =================
    const flame = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(64, 64, (g) => { const gr = g.createRadialGradient(32, 36, 0, 32, 36, 30); gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(0.35, 'rgba(255,190,80,0.85)'); gr.addColorStop(1, 'rgba(255,140,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    { const brass = lit({ color: 0xc89a46, metalness: 0.7, roughness: 0.32 }), lamp = new THREE.Group();
      const body = solid(new THREE.Mesh(new THREE.LatheGeometry([[0.0001, 0], [0.006, 0.0006], [0.0075, 0.003], [0.0062, 0.0058], [0.0028, 0.0068], [0.0024, 0.0076], [0.0001, 0.0078]].map(([r, y]) => new THREE.Vector2(r, y)), 24), brass));
      const spout = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0019, 0.009, 10), brass)); spout.rotation.z = -1.25; spout.position.set(0.0085, 0.0052, 0);
      lamp.add(body, spout); lamp.position.set(0.172, G, -0.108); lamp.rotation.y = 0.5; group.add(lamp);
      lamp.updateMatrix(); flame.position.copy(new THREE.Vector3(0.0128, 0.0082, 0).applyMatrix4(lamp.matrix)); flame.scale.set(0.006, 0.009, 1); group.add(flame); }

    // ================= 地毯：正方形 x²、长条 bx（切成两段）、补角 =================
    const carpetTex = (field, border, motif, w = 512, h = 512, repeatAlong = false) => tex(w, h, (g) => {
      g.fillStyle = field; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 2200; k++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.07})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); }
      const b = h * 0.09; g.fillStyle = border; if (repeatAlong) { g.fillRect(0, 0, w, b); g.fillRect(0, h - b, w, b); } else { g.fillRect(0, 0, w, b); g.fillRect(0, h - b, w, b); g.fillRect(0, 0, b, h); g.fillRect(w - b, 0, b, h); }
      g.fillStyle = motif; const dots = (x0, y0, x1, y1) => { for (let x = x0; x < x1; x += b * 0.9) { g.beginPath(); g.arc(x, (y0 + y1) / 2, b * 0.18, 0, 6.3); g.fill(); } };
      dots(b * 0.5, 0, w, b); dots(b * 0.5, h - b, w, h);
      if (repeatAlong) { for (let x = h / 2; x < w; x += h) { g.save(); g.translate(x, h / 2); g.rotate(Math.PI / 4); g.fillStyle = motif; g.fillRect(-h * 0.17, -h * 0.17, h * 0.34, h * 0.34); g.fillStyle = field; g.fillRect(-h * 0.12, -h * 0.12, h * 0.24, h * 0.24); g.restore(); } }
      else { g.save(); g.translate(w / 2, h / 2); for (let k = 0; k < 2; k++) { g.rotate(Math.PI / 4); g.fillStyle = motif; g.fillRect(-w * 0.2, -w * 0.2, w * 0.4, w * 0.4); } g.fillStyle = field; g.beginPath(); g.arc(0, 0, w * 0.17, 0, 6.3); g.fill(); g.restore(); } });
    const sqTex = carpetTex('#8e2b22', '#d9a94a', '#2c1a40');
    const runTex = carpetTex('#e6d6b0', '#2f4a7d', '#b8432f', 1024, 256, true); runTex.wrapS = THREE.RepeatWrapping;
    const patchTex = carpetTex('#1f6457', '#d9b25e', '#f1e6cc');
    const edge = (c) => lit({ color: c, roughness: 0.95, side: THREE.DoubleSide });
    // 一块地毯：一个薄薄的盒子，顶面贴花纹；形状变了就重新造
    function rug(map, edgeColor) { const m = new THREE.Mesh(new THREE.BufferGeometry(), [lit({ map, roughness: 0.95 }), edge(edgeColor)]); m.castShadow = true; m.receiveShadow = true; m.raycast = () => {}; m.userData.noFrame = true; group.add(m); return m; }
    function setRug(m, r, uvq, y = G) {          // r = [u0, v0, u1, v1]；uvq：顶面四个角（左前、右前、右后、左后）的贴图坐标
      const [u0, v0, u1, v1] = r, y0 = y + 0.0002, y1 = y + TH, P = [], T = [], I = [], grp = [];
      const face = (pts, uvs, mat) => { const k = P.length / 3; for (const p of pts) P.push(...p); T.push(...uvs); I.push(k, k + 1, k + 2, k, k + 2, k + 3); grp.push(mat); };
      face([[u0, y1, -v0], [u1, y1, -v0], [u1, y1, -v1], [u0, y1, -v1]], uvq, 0);
      const s = [0, 0, 1, 0, 1, 1, 0, 1];
      face([[u0, y0, -v0], [u1, y0, -v0], [u1, y1, -v0], [u0, y1, -v0]], s, 1); face([[u1, y0, -v1], [u0, y0, -v1], [u0, y1, -v1], [u1, y1, -v1]], s, 1);
      face([[u0, y0, -v1], [u0, y0, -v0], [u0, y1, -v0], [u0, y1, -v1]], s, 1); face([[u1, y0, -v0], [u1, y0, -v1], [u1, y1, -v1], [u1, y1, -v0]], s, 1);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(T, 2)); g.setIndex(I);
      g.addGroup(0, 6, 0); g.addGroup(6, 24, 1); g.computeVertexNormals(); m.geometry.dispose(); m.geometry = g; m.visible = u1 - u0 > 1e-5 && v1 - v0 > 1e-5; }
    const RUG = { sq: rug(sqTex, 0x6e1f19), p: rug(runTex, 0x2f4a7d), q: rug(runTex, 0x2f4a7d), patch: rug(patchTex, 0x154a40) };
    // 叠着的几块小地毯（补角就从最上面那块拿）
    { const cols = [['#5d2a6a', '#d9b25e', '#efe0c0'], ['#2f4a7d', '#e3c27a', '#f3e6cc'], ['#7a4a1f', '#e9d6a6', '#3a2410']];
      cols.forEach(([f, b, m], k) => { const r = rug(carpetTex(f, b, m), 0x3a2a20), h = 0.1 - k * 0.006; setRug(r, [STACK[0] - h / 2 + k * 0.002, STACK[1] - h / 2 - k * 0.002, STACK[0] + h / 2 + k * 0.002, STACK[1] + h / 2 - k * 0.002], [0, 0, 1, 0, 1, 1, 0, 1], G + k * TH); }); }

    // ================= 数学：会发光的线（实芯 + 加亮的光晕 + 底下一层淡影） =================
    const coreTex = tex(64, 4, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); for (const [o, a] of [[0, 0], [0.16, 0.6], [0.3, 1], [0.7, 1], [0.84, 0.6], [1, 0]]) gr.addColorStop(o, `rgba(255,255,255,${a})`); g.fillStyle = gr; g.fillRect(0, 0, w, h); }); coreTex.colorSpace = THREE.NoColorSpace;
    const glowTex = tex(64, 4, (g, w, h) => { const img = g.createImageData(w, h); for (let x = 0; x < w; x++) { const t = (x + 0.5) / w - 0.5, a = Math.exp(-(t * t) / (2 * 0.17 * 0.17)); for (let y = 0; y < h; y++) { const k = (y * w + x) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = 255; img.data[k + 3] = Math.round(a * 255); } } g.putImageData(img, 0, 0); }); glowTex.colorSpace = THREE.NoColorSpace;
    const ribbon = (pts, hw, dash) => { const out = [], uvs = []; let acc = 0; const push = (p, q, n) => { out.push(p[0] + n[0], 0, -(p[1] + n[1]), p[0] - n[0], 0, -(p[1] - n[1]), q[0] + n[0], 0, -(q[1] + n[1]), q[0] + n[0], 0, -(q[1] + n[1]), p[0] - n[0], 0, -(p[1] - n[1]), q[0] - n[0], 0, -(q[1] - n[1])); uvs.push(0, 0.5, 1, 0.5, 0, 0.5, 0, 0.5, 1, 0.5, 1, 0.5); };
      for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], d = sub(b, a), l = Math.hypot(d[0], d[1]); if (l < 1e-7) continue; const n = [(-d[1] / l) * hw, (d[0] / l) * hw];
        if (!dash) push(add(a, mul(d, -hw / l)), add(b, mul(d, hw / l)), n); else { let t = 0; while (t < l - 1e-9) { const ph = (acc + t) % (dash * 2), on = ph < dash, step = Math.max(1e-6, Math.min(l - t, on ? dash - ph : dash * 2 - ph)); if (on) push(add(a, mul(d, t / l)), add(a, mul(d, (t + step) / l)), n); t += step; } acc += l; } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); return g; };
    const partial = (pts, k) => { if (k >= 1) return pts; let L = 0; for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]); let want = L * k; const out = [pts[0]]; for (let i = 1; i < pts.length; i++) { const d = dist(pts[i - 1], pts[i]); if (want >= d) { out.push(pts[i]); want -= d; } else { out.push(add(pts[i - 1], mul(sub(pts[i], pts[i - 1]), want / d))); break; } } return out; };
    // stroke：三层（淡影、光晕、实芯）一起画；draw(dur) 让它自己“画出来”
    function stroke(color, w, y, { dash = 0, glow = 0.55, shadow = 0.22, order = 8 } = {}) {
      const mk = (map, col, op, blend, ww, ord, yy) => { const m = quiet(new THREE.Mesh(new THREE.BufferGeometry(), basic({ color: col, map, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide, blending: blend }))); m.position.y = yy; m.renderOrder = ord; m.visible = false; m.userData.ww = ww; group.add(m); return m; };
      const s = { pts: null, k: 1, dash, op: 1, parts: [mk(glowTex, 0x1a120a, shadow, THREE.NormalBlending, w * 3.2, order - 2, y - 0.0003), mk(glowTex, color, glow, THREE.AdditiveBlending, w * 6, order - 1, y - 0.0001), mk(coreTex, color, 1, THREE.NormalBlending, w * 1.25, order, y)], base: [shadow, glow, 1] };
      s.set = (pts, k = s.k) => { s.pts = pts; s.k = k; const p = pts && k > 0 ? partial(pts, k) : null; s.parts.forEach((m, i) => { if (!p || p.length < 2) { m.visible = false; return; } m.geometry.dispose(); m.geometry = ribbon(p, m.userData.ww / 2, i === 2 ? s.dash : 0); m.visible = true; }); };
      s.alpha = (a) => { s.op = a; s.parts.forEach((m, i) => { m.material.opacity = s.base[i] * a; }); };
      s.draw = (pts, dur = 0.6) => { s.set(pts, 0.001); anims.push({ s, t0: now(), dur }); };
      return s; }
    const anims = [];
    const rect = (r) => { const [u0, v0, u1, v1] = r; return [[u0, v0], [u1, v0], [u1, v1], [u0, v1], [u0, v0]]; };
    const Y = G + TH + 0.0012;
    const K = {
      sq: stroke(GOLD, 0.0016, Y), p: stroke(BLUE, 0.0016, Y + 0.0002), q: stroke(BLUE, 0.0016, Y + 0.0002),
      gap: stroke(TEAL, 0.0013, Y + 0.0004, { dash: 0.004 }), patch: stroke(TEAL, 0.0016, Y + 0.0006 + TH),
      outer: stroke(WHITE, 0.0012, Y + 0.0008, { dash: 0.005, glow: 0.4 }), big: stroke(WHITE, 0.0022, Y + 0.001, { glow: 0.7 }),
      cut: stroke(WHITE, 0.0015, Y + 0.0012, { glow: 0.8 }), side: stroke(GOLD, 0.0024, Y + 0.0014, { glow: 0.8 }), sideX: stroke(GOLD, 0.0024, Y + 0.0016), side5: stroke(TEAL, 0.0024, Y + 0.0016),
    };
    // 闪一下：从那一点迸出一圈短短的光线
    const flashes = [];
    function flash(p, color, n = 12, r0 = 0.006, r1 = 0.03) { const rays = []; for (let i = 0; i < n; i++) { const m = quiet(new THREE.Mesh(new THREE.BufferGeometry(), basic({ color, map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))); m.position.y = Y + 0.002; m.renderOrder = 14; group.add(m); rays.push(m); } flashes.push({ p, rays, t0: now(), r0, r1 }); sfx.ding(1320, { gain: 0.05 }); }
    // 字：斜体衬线，白色或概念色，外面一圈深色晕
    const measure = (font, txt) => { const g = document.createElement('canvas').getContext('2d'); g.font = font; return g.measureText(txt).width; };
    const runsTex = (runs, px = 72) => { const f = `italic 500 ${px}px "Times New Roman","Songti SC",serif`, W = Math.ceil(runs.reduce((s, r) => s + measure(f, r[0]), 0)) + px; return tex(W, Math.round(px * 1.55), (g, w, h) => { g.font = f; g.textBaseline = 'middle'; g.lineJoin = 'round'; let x = px / 2; for (const [t, c] of runs) { g.lineWidth = px * 0.3; g.strokeStyle = 'rgba(24,16,10,0.72)'; g.strokeText(t, x, h / 2 + 2); g.fillStyle = c; g.fillText(t, x, h / 2 + 2); x += measure(f, t); } }); };
    const label = (hgt, order = 20) => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }))); sp.renderOrder = order; sp.userData.h = hgt; sp.userData.k = ''; sp.visible = false; group.add(sp); return sp; };
    const setLab = (sp, runs, p, y) => { if (!runs) { sp.visible = false; return; } if (typeof runs === 'string') runs = [[runs, CSS.w]]; const key = JSON.stringify(runs); if (sp.userData.k !== key) { sp.userData.k = key; const t = runsTex(runs); sp.material.map?.dispose?.(); sp.material.map = t; sp.material.needsUpdate = true; sp.scale.set((sp.userData.h * t.image.width) / t.image.height, sp.userData.h, 1); } sp.position.copy(P3(p, y)); sp.visible = true; };
    const LB = { sq: label(0.02), p: label(0.017), q: label(0.017), gap: label(0.019), big: label(0.019), xb: label(0.014), xl: label(0.014), ap: label(0.013), aq: label(0.013), s8: label(0.016) };
    // 方程：浮在墙上方，跟着地毯一起变；每一项和它那块地毯同色
    const EQH = 0.023, eqSp = label(EQH, 22); const eq = { key: '', born: -9, out: 1e9, next: null };
    function setEq(runs) { const key = JSON.stringify(runs); if (key === eq.key) return; eq.key = key; S.eq = runs.map((r) => r[0]).join('');
      const show = () => { setLab(eqSp, runs, [-0.03, 0.112], G + 0.104); eq.born = now(); eq.out = 1e9; };
      if (eqSp.visible && now() - eq.born > 0.2 && !S.live) { eq.out = now(); eq.next = show; } else { show(); if (S.live) eqSp.material.opacity = 1; } }
    const X2 = ['x²', CSS.x2], PL = [' + ', CSS.w], EQ = [' = ', CSS.w], n = (v, c = CSS.w) => [String(v), c];

    // ================= 此刻那一句：嵌在台面前沿的一条石带上（平放在地上，比立面好读），不挡画面 =================
    const CL = 0.34, CD = 0.023, CV = -0.1015;
    const capMesh = quiet(new THREE.Mesh(new THREE.PlaneGeometry(CL, CD).rotateX(-Math.PI / 2), basic({ transparent: true, opacity: 0, depthWrite: false }))); capMesh.position.set(0, G + 0.0005, -CV); capMesh.renderOrder = 3; capMesh.visible = false; group.add(capMesh);
    const CW = 2048, CH = Math.round((CW * CD) / CL);
    const capTex = (big, small) => tex(CW, CH, (g, w, h) => {
      let f = 1, fb = '', fs = '', wb = 0, ws = 0, gap = 0;
      for (; f > 0.5; f -= 0.04) { fb = `600 ${Math.round(h * 0.62 * f)}px "Times New Roman","Songti SC","STSong",serif`; fs = `500 ${Math.round(h * 0.44 * f)}px "Times New Roman","Songti SC","STSong",serif`; g.font = fb; wb = g.measureText(big).width; g.font = fs; ws = small ? g.measureText(small).width : 0; gap = small ? h * 0.9 * f : 0; if (wb + gap + ws < w - h * 5) break; }
      const tot = wb + gap + ws, x0 = (w - tot) / 2, band = g.createLinearGradient(x0 - h * 2, 0, x0 + tot + h * 2, 0);
      band.addColorStop(0, 'rgba(40,26,14,0)'); band.addColorStop(0.07, 'rgba(40,26,14,0.55)'); band.addColorStop(0.93, 'rgba(40,26,14,0.55)'); band.addColorStop(1, 'rgba(40,26,14,0)');
      g.fillStyle = band; g.fillRect(x0 - h * 2, h * 0.06, tot + h * 4, h * 0.88);
      g.textBaseline = 'middle'; g.font = fb; g.fillStyle = '#fbf2de'; g.fillText(big, x0, h * 0.53); if (small) { g.font = fs; g.fillStyle = '#eadfc6'; g.fillText(small, x0 + wb + gap, h * 0.55); } });
    const cap = { key: '', born: -9, out: 1e9, next: null };
    function caption(big, small = '') { const key = big + '|' + small; if (key === cap.key) return; cap.key = key; S.cap = [big, small];
      const show = () => { capMesh.material.map?.dispose?.(); capMesh.material.map = capTex(big, small); capMesh.material.needsUpdate = true; capMesh.visible = true; cap.born = now(); cap.out = 1e9; };
      if (capMesh.visible && now() - cap.born > 0.2) { cap.out = now(); cap.next = show; } else show(); }
    const prompt = (txt) => { S.ask = txt; if (ui?.status) ui.status(txt); };

    // ================= 板书：学生做出一样，就用课本的话写一行 =================
    const css = document.createElement('style');
    css.textContent = `
.pf-board{margin:4px 0 6px;display:flex;flex-direction:column;gap:8px;font:15px/1.7 "Kaiti SC","STKaiti","Songti SC",serif;color:#2b2722}
.pf-board .pr{opacity:0;transform:translateY(5px);transition:opacity .5s,transform .5s,background-color 2.4s;padding:3px 8px 3px 6px;border-radius:5px;border-left:3px solid transparent}
.pf-board .pr.in{opacity:1;transform:none}
.pf-board .pr.fresh{background:rgba(255,206,110,.34);border-left-color:#d98a2b}
.pf-board .n{display:inline-block;min-width:1.25em;color:#b0532a;font-weight:700}
.pf-board b{color:#8a2f1d}
.pf-board i{font-family:"Times New Roman",serif;font-style:italic;letter-spacing:.02em}
.pf-board .x2{color:#c58a00;font-weight:600}.pf-board .bx{color:#2a86a8;font-weight:600}.pf-board .sq{color:#1f9a7d;font-weight:600}
.pf-board .ph{font:600 12px/1.3 "PingFang SC","Hiragino Sans GB",sans-serif;color:#a07a45;letter-spacing:.3em;margin:6px 0 -4px;opacity:0;transition:opacity .4s}
.pf-board .ph.in{opacity:1}
.pf-board.review .pr[data-k]{cursor:pointer}.pf-board.review .pr[data-k]:hover{background:rgba(255,206,110,.16)}
.pf-board .pr.sel{background:rgba(255,206,110,.34);border-left-color:#d98a2b}`;
    document.head.append(css);
    let boardEl = null, lastH = ''; const rows = [];
    const reveal = (r) => { const body = boardEl?.closest('.p-body'); if (!body) return; setTimeout(() => { const rb = r.getBoundingClientRect(), bb = body.getBoundingClientRect(); if (rb.bottom > bb.bottom - 14) body.scrollBy({ top: rb.bottom - bb.bottom + 28, behavior: 'smooth' }); }, 80); };
    const board = (html, key = '') => { const r = document.createElement('div'); r.className = 'pr'; r.innerHTML = html; if (key) r.dataset.k = key; rows.push(r); for (const o of rows) o.classList?.remove('fresh'); if (boardEl) { boardEl.append(r); requestAnimationFrame(() => { r.classList.add('in', 'fresh'); reveal(r); }); } return r; };
    board.h = (title) => { if (title === lastH) return; lastH = title; const r = document.createElement('div'); r.className = 'ph'; r.textContent = title; rows.push(r); if (boardEl) { boardEl.append(r); requestAnimationFrame(() => { r.classList.add('in'); reveal(r); }); } };
    const i = (s) => `<i>${s}</i>`;
    const x2 = `<span class="x2">${i('x')}²</span>`;

    // ================= 状态 =================
    const fresh = () => ({ x: XN, b: B0, p: B0, beat: 'cut', held: '', moved: false, found: false, filled: false, patch: [...STACK], rooted: false, gen: false, done: false, live: false, sideK: 0, rootAt: -9, beatAt: 0, hint: 0, unequal: 0, bigAt: -9, cap: ['', ''], ask: '', eq: '', pose: '' });
    let S = fresh(), runId = 0;
    const later = (ms, f) => { const id = runId; setTimeout(() => { if (!dead && id === runId) f(); }, ms); };
    const q = () => S.b - S.p;
    const h2 = () => S.b / 2;
    // 各块的位置（单位：台面坐标）
    const R = {
      sq: () => [O[0], O[1], O[0] + XS, O[1] + XS],
      p: () => [O[0] + XS, O[1], O[0] + XS + S.p * U, O[1] + XS],
      q: () => [O[0], O[1] + XS, O[0] + XS, O[1] + XS + q() * U],
      gap: () => [O[0] + XS, O[1] + XS, O[0] + XS + S.p * U, O[1] + XS + q() * U],
      big: () => [O[0], O[1], O[0] + XS + h2() * U, O[1] + XS + h2() * U],
    };
    const runUV = (s0, s1, rot) => { const a = s0 / (4 * XN), b = s1 / (4 * XN); return rot ? [a, 1, a, 0, b, 0, b, 1] : [a, 0, b, 0, b, 1, a, 1]; };          // 长条的花纹按原来的位置切开（不拉伸）；拼到上面那段转了 90°
    function layout() {
      XS = S.x * U;
      setRug(RUG.sq, R.sq(), [0, 0, 1, 0, 1, 1, 0, 1]);
      setRug(RUG.p, R.p(), runUV(0, S.p, false));
      setRug(RUG.q, R.q(), runUV(S.p, S.b, true));
      const ph = h2() * U, gp = S.filled ? [O[0] + XS, O[1] + XS] : sub(S.patch, [ph / 2, ph / 2]);
      RUG.patch.visible = S.beat !== 'cut' || S.found; if (RUG.patch.visible) setRug(RUG.patch, [gp[0], gp[1], gp[0] + ph, gp[1] + ph], [0, 0, 1, 0, 1, 1, 0, 1], S.filled ? G : G + 3 * TH);
      // 线
      K.sq.set(rect(R.sq())); K.p.set(S.p > 0.02 ? rect(R.p()) : null); K.q.set(q() > 0.02 ? rect(R.q()) : null);
      const gr = R.gap(), showGap = !S.filled && q() > 0.02 && S.p > 0.02; K.gap.set(showGap ? rect(gr) : null);
      K.outer.set(!S.filled && q() > 0.02 ? rect([O[0], O[1], gr[2], gr[3]]) : null);
      K.patch.set(RUG.patch.visible ? rect([gp[0], gp[1], gp[0] + ph, gp[1] + ph]) : null);
      if (S.filled && !anims.some((a) => a.s === K.big)) K.big.set(rect(R.big()));
      if (!S.filled) K.big.set(null);
      // 刀口：在长条上，切下的那一段之前
      const cu = O[0] + XS + S.p * U; K.cut.set(S.beat === 'cut' ? [[cu, O[1] - 0.006], [cu, O[1] + XS + 0.006]] : null);
      cutPick.position.set(cu, G + 0.006, -(O[1] + XS / 2)); cutPick.visible = S.beat === 'cut';
      // 字：面积写在块里面，边长写在边旁边
      const mid = (r) => [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];
      setLab(LB.sq, [X2], mid(R.sq()), Y + 0.004);
      setLab(LB.p, S.p > 0.6 ? [[f1(S.p) + 'x', CSS.bx]] : null, mid(R.p()), Y + 0.004);
      setLab(LB.q, q() > 0.6 ? [[f1(q()) + 'x', CSS.bx]] : null, mid(R.q()), Y + 0.004);
      const isSq = Math.abs(S.p - q()) < 1e-6;
      setLab(LB.gap, showGap && S.p > 0.8 && q() > 0.8 ? (isSq ? [[f1(h2() * h2()), CSS.sq]] : [[f1(S.p) + ' × ' + f1(q()), CSS.sq]]) : S.filled ? [[f1(h2() * h2()), CSS.sq]] : null, mid(gr), Y + 0.004);
      setLab(LB.xl, S.rooted ? null : [['x', CSS.x2]], [O[0] - 0.01, O[1] + XS / 2], Y + 0.003);
      setLab(LB.xb, S.rooted ? [['x = 3', CSS.x2]] : [['x', CSS.x2]], [O[0] + XS / 2, O[1] - (S.rooted ? 0.012 : 0.009)], Y + 0.003);
      setLab(LB.ap, S.p > 0.6 ? [[f1(S.p), S.rooted ? CSS.sq : CSS.bx]] : null, [O[0] + XS + (S.p * U) / 2, O[1] - (S.rooted ? 0.012 : 0.009)], Y + 0.003);
      { const bb = R.big(); setLab(LB.s8, S.rooted ? [[f1(S.x + h2()), CSS.w]] : null, [bb[0] - 0.017, (bb[1] + bb[3]) / 2], Y + 0.003); }
      setLab(LB.aq, q() > 0.6 && !S.rooted ? [[f1(q()), CSS.bx]] : null, [O[0] - 0.01, O[1] + XS + (q() * U) / 2], Y + 0.003);
      const bg = R.big(); setLab(LB.big, S.filled && !S.rooted ? [['(x + ' + f1(h2()) + ')²', CSS.w]] : null, [(bg[0] + bg[2]) / 2, bg[3] + 0.011], Y + 0.004);
      bigPick.visible = S.beat === 'root'; bigPick.position.set((bg[0] + bg[2]) / 2, G + 0.003, -(bg[1] + bg[3]) / 2); bigPick.scale.set(bg[2] - bg[0], 1, bg[3] - bg[1]);
      bHandle.visible = S.beat === 'gen' || (S.done && S.filled); bHandle.position.set(bg[2], G + 0.004, -bg[1]);
      layoutEq();
    }
    function layoutEq() {
      if (S.beat === 'cut' && !S.found) { if (Math.abs(q()) < 0.02) setEq([X2, PL, ['10x', CSS.bx], EQ, n(C0)]); else setEq([X2, PL, [f1(S.p) + 'x', CSS.bx], PL, [f1(q()) + 'x', CSS.bx], EQ, n(C0)]); return; }
    }
    const say = (big, small = '') => caption(big, small);

    // ================= 主线 =================
    function cutMove(u) {
      if (S.beat !== 'cut') return; let p = clamp((u - (O[0] + XS)) / U, 0, S.b);
      if (Math.abs(p - S.b / 2) < 0.3) p = S.b / 2;          // 两段一样长时吸住
      if (Math.abs(p - S.b) < 0.15) p = S.b;
      if (!S.moved && p < S.b - 0.3) { S.moved = true; board.h('问题'); board(`${x2} + <span class="bx">10${i('x')}</span> = 39：一个正方形，加上它边长的 10 倍，一共是 39`, 'cut'); }
      const was = S.p; S.p = p;
      if (Math.abs(was - p) > 1e-6 && Math.floor(was * 2) !== Math.floor(p * 2)) sfx.clink({ freq: 700 + (S.b - p) * 70, gain: 0.012 });
      if (!S.found && p === S.b / 2) foundSquare();
      layout();
    }
    function cutUp() { if (S.beat !== 'cut' || S.found) return; const d = Math.abs(S.p - q()); if (q() > 0.3 && d > 0.3) { S.unequal++; say(`拼出来是长方形：(x + ${f1(S.p)})(x + ${f1(q())})`, '两边不一样长，不是正方形，开不了方'); } }
    function foundSquare() {          // 重拍 1：两段一样长，外形成了正方形，缺一个 5 × 5 的角
      S.found = true; S.beat = 'patch'; S.beatAt = now(); S.hint = 0;
      const gr = R.gap(); flash([(gr[0] + gr[2]) / 2, (gr[1] + gr[3]) / 2], TEAL); K.gap.draw(rect(gr), 0.5); K.outer.draw(rect([O[0], O[1], gr[2], gr[3]]), 0.8);
      say('两段一样长：外形是正方形，只缺一个角', `缺角 5 × 5 = 25，边长正是 10 的一半`);
      setEq([X2, PL, ['5x', CSS.bx], PL, ['5x', CSS.bx], EQ, n(C0)]);
      board.h('探究'); board(`<span class="n">1</span>把 <span class="bx">10${i('x')}</span> 那条切成一样长的两半，拼在正方形的右边和上面：外形成了正方形，只缺一个角 <span class="sq">5 × 5 = 25</span>。两段不一样长，拼出来是长方形`, 'cut');
      later(1400, () => { prompt('缺的那一角，拿什么补上？'); layout(); });
    }
    function patchUp() {
      if (S.beat !== 'patch') return; const ph = h2() * U, target = [O[0] + XS + ph / 2, O[1] + XS + ph / 2];
      if (dist(S.patch, target) < 0.025) { S.patch = target; fillIt(); return; }
      const from = [...S.patch], t0 = now(); const back = () => { if (dead || S.beat !== 'patch') return; const k = easeOut(clamp((now() - t0) / 0.4, 0, 1)); S.patch = add(from, mul(sub(STACK, from), k)); layout(); if (k < 1) requestAnimationFrame(back); }; back();          // 没放进缺角：滑回去
    }
    function fillIt() {          // 重拍 2：补上 25，成了大正方形
      S.filled = true; S.beat = 'fillwait'; S.bigAt = now(); sfx.clink({ freq: 1500, gain: 0.05 });
      const bg = R.big(); K.big.draw(rect(bg), 0.8); flash([bg[2], bg[3]], WHITE, 14, 0.008, 0.04);
      say('补上 25，就是一个大正方形', 'x² + 10x + 25 = (x + 5)²，方程两边同时加 25');
      setEq([X2, PL, ['10x', CSS.bx], PL, ['25', CSS.sq], EQ, n(C0), PL, ['25', CSS.sq]]);
      board(`<span class="n">2</span>补上缺角：${x2} + <span class="bx">10${i('x')}</span> + <span class="sq">25</span> = (${i('x')} + 5)²。方程两边同时加 <span class="sq">25</span>：(${i('x')} + 5)² = 64`, 'fill');
      later(1900, () => { setEq([['(x + 5)²', CSS.w], EQ, n(64)]); });
      later(2600, () => { S.beat = 'root'; S.beatAt = now(); S.hint = 0; say('64 是边长多少的正方形？', '点一下大正方形，开方'); prompt('(x + 5)² = 64：这个大正方形的边长是多少？'); layout(); });
      layout();
    }
    function rootIt() {          // 重拍 3：开方，边长 8，x + 5 = 8，x = 3
      if (S.beat !== 'root') return; S.beat = 'rooted'; S.rooted = true; S.rootAt = now(); sfx.whoosh({ dur: 0.5, freq: 1100, gain: 0.04 });
      const bg = R.big(); K.side.draw([[bg[0] - 0.005, bg[1]], [bg[0] - 0.005, bg[3]]], 0.7);
      later(800, () => { K.sideX.draw([[bg[0], bg[1] - 0.004], [O[0] + XS, bg[1] - 0.004]], 0.4); K.side5.draw([[O[0] + XS, bg[1] - 0.004], [bg[2], bg[1] - 0.004]], 0.4); layout(); });
      later(1300, () => { flash([O[0] + XS / 2, bg[1] - 0.004], GOLD); setEq([['x + 5', CSS.w], EQ, ['±8', CSS.w]]);
        say('边长 8：x + 5 = 8，x = 3', '开方降次：x + 5 = ±8，另一个根 −13 当不了边长');
        board.h('降次'); board(`<span class="n">3</span>根据平方根的意义：${i('x')} + 5 = ±8，${i('x')}<sub>1</sub> = 3，${i('x')}<sub>2</sub> = −13。把一个一元二次方程“降次”，转化为两个一元一次方程。正方形的边长是 3`, 'root'); layout(); });
      later(3000, () => { setEq([['x', CSS.x2], EQ, n(3)]); });
      later(3900, () => { S.beat = 'gen'; S.rooted = false; K.sideX.set(null); K.side5.set(null); K.side.set(null); S.beatAt = now(); S.hint = 0; S.live = true; morphX(2.2); say('换一个方程：x 是多长都行，缺角还是一次项系数一半的平方吗？', '拖大正方形的右下角，改一次项系数'); prompt('一次项系数换成别的数，要补多大的角？'); layout(); genEq(); });
      layout();
    }
    function morphX(to) { const from = S.x, t0 = now(); const step = () => { if (dead) return; const k = clamp((now() - t0) / 0.8, 0, 1); S.x = lerp(from, to, k * k * (3 - 2 * k)); layout(); if (k < 1) requestAnimationFrame(step); }; step(); }
    function genEq() { const b = S.b, h = h2(); setEq([X2, PL, [f1(b) + 'x', CSS.bx], PL, [f1(h * h), CSS.sq], EQ, ['(x + ' + f1(h) + ')²', CSS.w]]); }
    function bMove(u) {
      if (S.beat !== 'gen' && !(S.done && S.filled)) return; let h = clamp((u - (O[0] + XS)) / U, 1, 5.5);
      for (const s of [5, 3]) if (Math.abs(h - s) < 0.18) h = s;          // 花拉子米的 10、课本的 6 处吸住
      h = Math.round(h * 2) / 2; if (h * 2 === S.b) return;
      S.b = h * 2; S.p = h; sfx.clink({ freq: 600 + h * 120, gain: 0.014 }); layout(); genEq();
      if (S.beat === 'gen' && S.b === 6) textbook();
    }
    function textbook() {          // 重拍 4：课本的 x² + 6x + 4 = 0
      S.beat = 'tb'; S.live = false; const bg = R.big(); flash([bg[2], bg[1]], TEAL); K.big.draw(rect(bg), 0.5);
      say('课本：x² + 6x + 4 = 0，两边同时加 (6/2)²，即 9', '−4 画不出来（面积不会是负数），图看懂为什么加 9，剩下的交给代数');
      setEq([X2, PL, ['6x', CSS.bx], EQ, n('−4')]);
      later(1500, () => setEq([X2, PL, ['6x', CSS.bx], PL, ['9', CSS.sq], EQ, n('−4'), PL, ['9', CSS.sq]]));
      later(3000, () => setEq([['(x + 3)²', CSS.w], EQ, n(5)]));
      board(`<span class="n">4</span>缺角的边长总是一次项系数的一半：${x2} + <span class="bx">${i('b')}${i('x')}</span> 补上 <span class="sq">(${i('b')}/2)²</span>，就配成 (${i('x')} + ${i('b')}/2)²（由 ${i('a')}² + 2${i('ab')} + ${i('b')}² = (${i('a')} + ${i('b')})²）`, 'gen');
      board.h('课本'); board(`<span class="n">5</span>怎样解方程 ${i('x')}² + 6${i('x')} + 4 = 0？移项，得 ${i('x')}² + 6${i('x')} = −4。两边同时加 <span class="sq">(6/2)²</span>，即 9：${i('x')}² + 6${i('x')} + 9 = −4 + 9，(${i('x')} + 3)² = 5，${i('x')}<sub>1</sub> = −3 + √5，${i('x')}<sub>2</sub> = −3 − √5`, 'tb');
      later(3600, finish);
    }
    function finish() {
      S.beat = 'end'; S.done = true; S.live = true; boardEl?.classList.add('review');
      board.h('配方法'); board('像上面那样，通过配成完全平方形式来解一元二次方程的方法，叫作<b>配方法</b>。配方是为了利用开方实现降次，把一个一元二次方程转化成两个一元一次方程来解。', 'def');
      board.h('答'); board('<b>答</b>：花拉子米的正方形，边长是 3（x² + 10x = 39，两边加 25，(x + 5)² = 64，x + 5 = 8）。', 'ans');
      say('答：边长是 3', '通过配成完全平方形式来解一元二次方程的方法，叫作配方法');
      prompt(''); ui?.unlock?.();
      later(2600, () => { ui?.go?.(2); ui?.fold?.(false); });          // 一课结束：翻到“对照课本原文”
    }
    // 讲完以后点板书：场景摆回那一刻
    function pose(k) {
      S.pose = k; anims.length = 0;
      const st = { cut: { b: 10, p: 5, f: false, r: false }, fill: { b: 10, p: 5, f: true, r: false }, root: { b: 10, p: 5, f: true, r: true }, gen: { b: 6, p: 3, f: true, r: false }, tb: { b: 6, p: 3, f: true, r: false }, def: { b: 6, p: 3, f: true, r: false }, ans: { b: 10, p: 5, f: true, r: true } }[k] || { b: 10, p: 5, f: true, r: true };
      Object.assign(S, { x: st.b === 10 ? XN : 2.2, b: st.b, p: st.p, filled: st.f, rooted: st.r, found: true });
      K.side.set(null); K.sideX.set(null); K.side5.set(null);
      if (st.r) { const bg = R.big(); K.side.set([[bg[0] - 0.005, bg[1]], [bg[0] - 0.005, bg[3]]]); K.sideX.set([[bg[0], bg[1] - 0.004], [O[0] + XS, bg[1] - 0.004]]); K.side5.set([[O[0] + XS, bg[1] - 0.004], [bg[2], bg[1] - 0.004]]); }
      const CAP = { cut: ['两段一样长：外形是正方形，只缺一个角', '缺角 5 × 5 = 25，边长正是 10 的一半'], fill: ['补上 25，就是一个大正方形', 'x² + 10x + 25 = (x + 5)²，方程两边同时加 25'], root: ['边长 8：x + 5 = 8，x = 3', '开方降次：x + 5 = ±8，另一个根 −13 当不了边长'], gen: ['缺角总是一次项系数一半的平方', 'x² + bx + (b/2)² = (x + b/2)²'], tb: ['课本：x² + 6x + 4 = 0，两边同时加 (6/2)²，即 9', '(x + 3)² = 5，x = −3 ± √5'], def: ['通过配成完全平方形式来解一元二次方程的方法，叫作配方法', '配方是为了利用开方实现降次'], ans: ['答：边长是 3', 'x² + 10x = 39，两边加 25，(x + 5)² = 64'] };
      say(...(CAP[k] || CAP.ans)); layout();
      const EQS = { cut: [X2, PL, ['5x', CSS.bx], PL, ['5x', CSS.bx], EQ, n(C0)], fill: [['(x + 5)²', CSS.w], EQ, n(64)], root: [['x + 5', CSS.w], EQ, ['±8', CSS.w]], tb: [['(x + 3)²', CSS.w], EQ, n(5)], def: [['(x + 3)²', CSS.w], EQ, n(5)], ans: [['x', CSS.x2], EQ, n(3)] };
      if (EQS[k]) setEq(EQS[k]); else genEq();
      const bg = R.big(); if (st.f) { K.big.draw(rect(bg), 0.5); flash([bg[2], bg[3]], WHITE); } else { const gr = R.gap(); K.gap.draw(rect(gr), 0.5); flash([(gr[0] + gr[2]) / 2, (gr[1] + gr[3]) / 2], TEAL); }
    }

    // ================= 动手 =================
    const cutPick = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.012, XS + 0.024), basic({ visible: false })); cutPick.userData.pick = true; cutPick.userData.noFrame = true; group.add(cutPick);
    const patchPick = new THREE.Mesh(new THREE.BoxGeometry(1, 0.01, 1), basic({ visible: false })); patchPick.userData.pick = true; patchPick.userData.noFrame = true; group.add(patchPick);
    const bigPick = new THREE.Mesh(new THREE.BoxGeometry(1, 0.008, 1), basic({ visible: false })); bigPick.userData.pick = true; bigPick.userData.noFrame = true; group.add(bigPick);
    const bHandle = new THREE.Group(); { const ring = quiet(new THREE.Mesh(new THREE.RingGeometry(0.0035, 0.0052, 32).rotateX(-Math.PI / 2), basic({ color: WHITE, transparent: true, depthWrite: false }))); const glow = quiet(new THREE.Mesh(new THREE.CircleGeometry(0.011, 32).rotateX(-Math.PI / 2), basic({ color: WHITE, map: tex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))); ring.renderOrder = 15; glow.renderOrder = 14; bHandle.add(ring, glow); bHandle.userData.glow = glow; } group.add(bHandle);
    const bPick = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.012, 16), basic({ visible: false })); bPick.userData.pick = true; bPick.userData.noFrame = true; bHandle.add(bPick);
    const uvp = (p) => [p.x, -p.z];
    let grabOff = [0, 0];
    const drags = [
      { obj: cutPick, plane: 'xz', offset: G + 0.002, hint: () => '拖刀口：切下一段拼到上面', enabled: () => S.beat === 'cut', onStart: () => { S.held = 'cut'; }, onDrag: (p) => cutMove(uvp(p)[0]), onEnd: () => { S.held = ''; cutUp(); } },
      { obj: patchPick, plane: 'xz', offset: G + 0.002, hint: () => '拖进缺角', enabled: () => S.beat === 'patch', onStart: (p) => { S.held = 'patch'; grabOff = sub(S.patch, uvp(p)); }, onDrag: (p) => { if (S.beat !== 'patch') return; S.patch = add(uvp(p), grabOff); layout(); }, onEnd: () => { S.held = ''; patchUp(); } },
      { obj: bPick, plane: 'xz', offset: G + 0.002, hint: () => '拖这个角，改一次项系数', enabled: () => S.beat === 'gen' || (S.done && S.filled), onStart: () => { S.held = 'b'; }, onDrag: (p) => bMove(uvp(p)[0]), onEnd: () => { S.held = ''; } },
    ];
    const taps = [{ obj: bigPick, hint: '开方：这个正方形的边长是多少？', enabled: () => S.beat === 'root', onTap: () => rootIt() }];
    const dragApi = draggable(group, drags, { onClick: () => false, taps, tip: tag?.('', 'pill') });
    let heard = false;
    const pointer = { down: (r, e) => { if (!heard) { heard = true; audio(); } return dragApi.down(r, e); }, move: (r, e) => dragApi.move(r, e), up: (r, e) => dragApi.up(r, e), items: dragApi.items };
    function opening() { say('一个正方形，加上它边长的 10 倍，一共是 39', '花拉子米（约公元 820 年，巴格达）：边长是多少？'); prompt('x² + 10x 能拼成一个正方形吗？'); }
    function reset() { runId++; S = fresh(); anims.length = 0; rows.length = 0; lastH = ''; if (boardEl) { boardEl.innerHTML = ''; boardEl.classList.remove('review'); } for (const k of ['side', 'sideX', 'side5', 'big']) K[k].set(null); cap.key = ''; eq.key = ''; ui?.relock?.(); ui?.go?.(1); opening(); layout(); }
    const onKey = (e) => { if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !e.target?.closest?.('input,textarea')) reset(); };
    addEventListener('keydown', onKey);

    layout();
    const EL = 1.0, DIR = [0, Math.sin(EL), Math.cos(EL)];
    let last = now();
    return {
      group: root, card: false, place: 'spread', scale: 0.95,
      size: { w: 0.41, d: 0.29, h: 0.1 },
      view: { elev: 57, azim: 0, lookY: 0.2, frameMargin: 1.02 },
      pointer,
      mount(u) { ui = u; boardEl = document.createElement('div'); boardEl.className = 'pf-board' + (S.done ? ' review' : ''); u.controls?.append(boardEl);
        boardEl.addEventListener('click', (e) => { const r = e.target.closest?.('.pr'); if (!S.done || !r?.dataset.k) return; for (const o of rows) o.classList?.remove('sel', 'fresh'); r.classList.add('sel'); sfx.clink({ freq: 1200, gain: 0.03 }); pose(r.dataset.k); });
        for (const r of rows) { boardEl.append(r); r.classList.add('in'); }
        ui.go?.(1); if (!cap.key) opening(); else if (S.ask) ui.status?.(S.ask);
        requestAnimationFrame(() => aim?.(DIR)); setTimeout(() => { if (!dead) aim?.(DIR); }, 700); },
      dispose() { dead = true; runId++; removeEventListener('keydown', onKey); css.remove(); },
      update() {
        const t = now(), dt = Math.min(0.05, t - last); last = t;
        // 线自己画出来
        for (let k = anims.length - 1; k >= 0; k--) { const a = anims[k], e = clamp((t - a.t0) / a.dur, 0, 1); a.s.set(a.s.pts, e * e * (3 - 2 * e)); if (e >= 1) anims.splice(k, 1); }
        // 闪光
        for (let k = flashes.length - 1; k >= 0; k--) { const f = flashes[k], e = (t - f.t0) / 0.55; if (e >= 1) { for (const m of f.rays) { group.remove(m); m.geometry.dispose(); m.material.dispose(); } flashes.splice(k, 1); continue; }
          const ee = 1 - (1 - e) ** 2; f.rays.forEach((m, j) => { const a = (j / f.rays.length) * Math.PI * 2 + 0.2, r0 = f.r0 + (f.r1 - f.r0) * ee * 0.7, r1 = f.r0 + (f.r1 - f.r0) * ee; m.geometry.dispose(); m.geometry = ribbon([add(f.p, [r0 * Math.cos(a), r0 * Math.sin(a)]), add(f.p, [r1 * Math.cos(a), r1 * Math.sin(a)])], 0.0016, 0); m.material.opacity = 1 - e; }); }
        // 此刻那一句、方程：淡进淡出
        if (cap.out < 1e9) { const k = clamp(1 - (t - cap.out) / 0.35, 0, 1); capMesh.material.opacity = k; if (k <= 0) { cap.out = 1e9; const nx = cap.next; cap.next = null; nx?.(); } } else capMesh.material.opacity = clamp((t - cap.born) / 0.5, 0, 1);
        if (eq.out < 1e9) { const k = clamp(1 - (t - eq.out) / 0.3, 0, 1); eqSp.material.opacity = k; if (k <= 0) { eq.out = 1e9; const nx = eq.next; eq.next = null; nx?.(); } } else if (!S.live) eqSp.material.opacity = clamp((t - eq.born) / 0.4, 0, 1);
        // 等人动手的地方：轻轻一呼一吸
        const br = 0.6 + 0.4 * Math.sin(t * 3.2) ** 2;
        K.cut.alpha(S.beat === 'cut' && !S.held && !S.moved ? br : 1);
        K.patch.alpha(S.beat === 'patch' && !S.held ? br : 1);
        if (S.beat === 'patch') { const ph = h2() * U; patchPick.position.set(S.patch[0], G + 0.004, -S.patch[1]); patchPick.scale.set(ph, 1, ph); patchPick.visible = true; } else patchPick.visible = false;
        if (S.beat === 'root' && !S.held) K.big.alpha(br); else if (S.filled) K.big.alpha(1);
        bHandle.userData.glow.material.opacity = S.beat === 'gen' && !S.held ? 0.4 + 0.5 * Math.sin(t * 3.2) ** 2 : 0.5;
        // 补好的那一下：大正方形亮一下
        { const k = clamp((t - S.bigAt) / 1.2, 0, 1); if (k < 1) K.big.parts[1].material.opacity = K.big.base[1] * (1 + 1.2 * Math.sin(k * Math.PI)); }
        flame.scale.set(0.006 + 0.0006 * Math.sin(t * 13), 0.009 + 0.0012 * Math.sin(t * 9.3 + 1), 1);
        // 卡住很久，才一级一级给提示
        if (!S.held && !S.done && S.hint < 1 && t - S.beatAt > 15) {
          const H1 = { cut: S.unequal ? ['两段一样长试试', '外形的两条边，一条是 x 加右边那段，一条是 x 加上面那段'] : ['长条可以切开', '拖白色的刀口，切下一段拼到正方形上面'], patch: ['缺角是 5 × 5', '把右边那块绿地毯拖进缺角'], root: ['8 × 8 = 64', '点一下大正方形'], gen: ['课本上的方程是 x² + 6x + 4 = 0', '把大正方形的右下角往里拖，一次项系数变成 6'] }[S.beat];
          if (H1) { S.hint = 1; say(...H1); } }
        void dt;
      },
      debug: {
        get S() { return S; }, xs: () => XS, rows, pose, cap: () => S.cap, eq: () => S.eq,
        labels: () => [...Object.values(LB), eqSp],
        qa: [
          { name: '拖刀口：切成一样长的两半', run: () => { S.held = 'cut'; for (let k = 0; k <= 20; k++) cutMove(O[0] + XS + (B0 - k * 0.5) * U); S.held = ''; cutUp(); }, wait: 1.8 },
          { name: '把补角拖进缺角', run: () => { S.patch = [O[0] + XS + 2.5 * U, O[1] + XS + 2.5 * U]; patchUp(); }, wait: 3.0 },
          { name: '点大正方形开方', run: () => rootIt(), wait: 4.4 },
          { name: '拖角改一次项系数到 6', run: () => { for (let k = 0; k <= 8; k++) bMove(O[0] + XS + (5 - k * 0.25) * U); }, wait: 4.2 },
        ],
      },
    };
  },
};
