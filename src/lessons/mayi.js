// 数学 八年级下册 20.1 勾股定理及其应用 · 习题：公园里长方体石凳上的蚂蚁（课本 PDF 第 50 页）。
// 情境就是课本这道题：公园里一个长方体石凳（宽 30 cm、深 30 cm、高 40 cm），蚂蚁从正面左下角 M 爬到右后上角 N，
// 每秒 3 cm，最快要多久？蚂蚁只能在石凳的表面上爬：立体图形表面上的最短路径，书上一张静态图讲不出来。
// 一个画面里讲完，每一步都由学生的那一下做出来：
//   替蚂蚁走一条路：按住蚂蚁在石凳表面上拖到 N（能跨过棱），留下一条白线、写出它多长 → 还能更短吗？怎样才知道哪条最短？
//   两点之间，线段最短——可 M、N 不在同一个面上。按住右侧面（或顶面）往外翻：表面那层“皮”翻到和正面同一个平面上（展开图）；
//   在平面上从 M 拉一条线段到 N′：直角边 30 + 30 = 60 和 40，勾股定理 → 72.1 cm（自己走的白线也翻过来了，弯着，更长）；
//   只有这一种展开吗？把顶面也翻上去，N 又落在 N″：√(30² + 70²) ≈ 76.2 cm；长的那条绕 M 转过来叠上去，多出一截（红）；
//   合上（全课唯一的重拍）：两张皮一起合回石凳，两条线段在棱上一折，变成石凳表面上的两条路，N′、N″ 落回同一个 N；
//   金色那条就是最短的路：蚂蚁沿它爬过去，表走到 24.0 s → 答开头的问题。
// 所有长度、过棱的位置、蚂蚁走过的路长都按真几何算（面上的坐标、展开时绕棱转 90°）。
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { add, sub, mul, dist, clamp, lerp, easeOut } from './kit/sheet.js';
import { mathActionCue } from './kit/mathActionCue.js';
import { draggable } from './kit/interact.js';
import { sfx, audio } from './kit/audio.js';

const K = 0.0031;                                  // 1 cm = 0.0031（活页的单位）；下面的长度都以 cm 计
const W = 30, H = 40, D = 30, V = 3;               // 石凳：宽（左右）30、高 40、深（前后）30；蚂蚁每秒爬 3 cm
const BASE = 9, OUT = 0.22, LIFT = 0.14;           // 地面下那层土的厚度（切面上印此刻那一句）；“皮”离石面、线离皮的距离
// 三个面各有自己的平面坐标 (u, v)：F 正面 u = x、v = y；R 右侧面 u = 往后的深度、v = y；T 顶面 u = x、v = 往后的深度
// 合上时 F (u, v) → (u, v, 0)，R → (W, v, −u)，T → (u, H, −v)；翻开（和正面同一个平面）时 R → (W + u, v, 0)，T → (u, H + v, 0)
const AX = { F: { o: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] }, R: { o: [W, 0, 0], u: [0, 0, -1], v: [0, 1, 0], n: [1, 0, 0] }, T: { o: [0, H, 0], u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0] } };
const FW = { F: W, R: D, T: W }, FH = { F: H, R: H, T: D };
const NC = { R: [D, H], T: [W, D] };               // N 在右侧面、顶面上的坐标
const NET = { R: [W + D, H], T: [W, H + D] };      // 翻开以后 N 落在正面那个平面上的位置
const LEN = { R: Math.hypot(W + D, H), T: Math.hypot(W, H + D) };          // 72.11、76.16
const CUT = { R: (H * W) / (W + D), T: (W * H) / (H + D) };                // 线段过棱的地方：正面右棱高 20；正面上棱 x ≈ 17.1
const SEG = { R: [{ f: 'F', pts: [[0, 0], [W, CUT.R]] }, { f: 'R', pts: [[0, CUT.R], [D, H]] }], T: [{ f: 'F', pts: [[0, 0], [CUT.T, H]] }, { f: 'T', pts: [[CUT.T, 0], [W, D]] }] };
// 相邻两个面：把 b 面上的点展开到 a 面的平面上；公共棱在 a 面坐标里是 u = c（ax 0）还是 v = c（ax 1），棱上参数 t 在 b 面上的点
const UNF = { FR: (u, v) => [W + u, v], RF: (u, v) => [u - W, v], FT: (u, v) => [u, H + v], TF: (u, v) => [u, v - H], RT: (u, v) => [v, H + (W - u)], TR: (u, v) => [W + (H - v), u] };
const EDGE = { FR: { ax: 0, c: W, hi: H, to: (t) => [0, t] }, RF: { ax: 0, c: 0, hi: H, to: (t) => [W, t] }, FT: { ax: 1, c: H, hi: W, to: (t) => [t, 0] }, TF: { ax: 1, c: 0, hi: W, to: (t) => [t, H] }, RT: { ax: 1, c: H, hi: D, to: (t) => [W, t] }, TR: { ax: 0, c: W, hi: D, to: (t) => [t, H] } };
// 一块公园的地（x 向右，v 向里）：石凳站在中间偏左，右边留出右侧面翻开时扫过的地方；中间一片冰裂纹石板，四周是草
const CTRL = [[-17, -21], [8, -24], [36, -21], [62, -24], [75, -15], [78, 8], [75, 30], [64, 41], [38, 38], [12, 42], [-12, 39], [-22, 26], [-24, 4], [-22, -12]];
const PAVE = [[-14, -15], [10, -18], [40, -16], [66, -17], [70, 6], [68, 30], [45, 34], [15, 32], [-12, 32], [-17, 10]];
const BOX = { x0: -26, x1: 80, v0: -26, v1: 44 };

export default {
  id: 'mayi',
  fig: '习题',
  title: '石凳上的最短路径',
  flow: 'explore',
  ask: '公园中一个长方体石凳，一只蚂蚁以 3 cm/s 的速度从点 M 爬到点 N。<br>最快需要多长时间？',
  need: '蚂蚁只能在石凳的表面上爬。先按住蚂蚁，替它走一条路。',
  conclusion: {
    page: 50, rect: [44, 300, 470, 448], crops: [{ page: 50, rect: [44, 376, 288, 448] }, { page: 50, rect: [306, 306, 426, 448] }],
    quote: '公园中一长方体石凳如图所示，若一只蚂蚁以 3 cm/s 的速度从点 M 爬到点 N，最快需要多长时间（结果保留小数点后一位）？',
    why: '蚂蚁只能在石凳的表面上爬，M 和 N 不在同一个面上。将石凳的表面适当展开，可以展开成平面图形；在平面上，两点之间，线段最短。把右侧面翻到和正面在同一个平面上，N 落在 N′：两条直角边长 30 + 30 = 60（cm）和 40 cm，根据勾股定理，MN′ = √(60² + 40²) = √5200 ≈ 72.1（cm）。把顶面翻上去，N 落在 N″：MN″ = √(30² + 70²) = √5800 ≈ 76.2（cm）。从左侧面绕到后面、从左侧面翻过顶面，分别和这两条一样长（石凳的底面是正方形）。72.1 < 76.2，所以最短的路从正面绕到右侧面，长约 72.1 cm，最快需要 72.1 ÷ 3 ≈ 24.0（s）。<br><br>展开图上的这条线段，合回石凳上就是一条在棱上折了一下的路：在石凳表面上看着是弯的，展开就是直的。',
    src: '课本 · 第二十章 勾股定理 复习题（公园中的长方体石凳，第 44 页）；展开图、“两点之间，线段最短”见七年级上册第六章',
  },

  create({ aim, tag, camera }) {
    const root = new THREE.Group(), world = new THREE.Group(); root.add(world);
    const CX = (BOX.x0 + BOX.x1) / 2, CV = (BOX.v0 + BOX.v1) / 2;
    world.scale.setScalar(K); world.position.set(-CX * K, BASE * K, CV * K);          // 地面顶上是 y = 0（cm），土层底面贴着书
    let ui = null, dead = false;
    const T0 = performance.now(), now = () => (performance.now() - T0) / 1000;
    const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    const basic = (o) => new THREE.MeshBasicMaterial(o);
    const lit = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o });
    const quiet = (m) => { m.raycast = () => {}; m.userData.noFrame = true; return m; };
    const solid = (m) => { m.castShadow = true; m.receiveShadow = true; m.raycast = () => {}; m.userData.noFrame = true; return m; };
    const GOLD = 0xffc83d, BLUE = 0x58c4dd, RED = 0xfc6255, TEAL = 0x5cd0b3, INK = 0xffffff;
    const uT = { value: 0 };
    const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    const inPoly = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
    const loop = (ctrl, n) => new THREE.CatmullRomCurve3(ctrl.map(([x, v]) => new THREE.Vector3(x, v, 0)), true, 'centripetal').getPoints(n).slice(0, -1).map((p) => [p.x, p.y]);
    const outline = loop(CTRL, 220), pave = loop(PAVE, 160);
    const rnd = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();          // 固定的随机数：每次打开石板、草、叶子都一样

    // ================= 地：一块公园的地，石凳站在冰裂纹石板上，四周是草；前面切开，露出土层 =================
    const BWm = BOX.x1 - BOX.x0, BVm = BOX.v1 - BOX.v0, TW = 2048, TH = Math.round((2048 * BVm) / BWm);
    const cx = (x) => ((x - BOX.x0) / BWm) * TW, cy = (v) => ((BOX.v1 - v) / BVm) * TH, cs = TW / BWm;
    const groundTex = tex(TW, TH, (g, w, h) => {
      g.fillStyle = '#93a865'; g.fillRect(0, 0, w, h);          // 草
      for (let k = 0; k < 90; k++) { const x = rnd() * w, y = rnd() * h, r = 40 + rnd() * 160, gr = g.createRadialGradient(x, y, 0, x, y, r), dry = rnd() < 0.4; gr.addColorStop(0, dry ? 'rgba(196,188,120,0.25)' : 'rgba(96,128,62,0.24)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
      for (let k = 0; k < 16000; k++) { g.fillStyle = `rgba(${60 + rnd() * 70},${96 + rnd() * 60},${36 + rnd() * 30},${rnd() * 0.18})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 2 + rnd() * 5); }
      // 石板：沿着铺地的轮廓剪出来，缝里是土和苔
      g.save(); g.beginPath(); pave.forEach(([x, v], i) => (i ? g.lineTo(cx(x), cy(v)) : g.moveTo(cx(x), cy(v)))); g.closePath(); g.clip();
      g.fillStyle = '#4f4c3e'; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 2600; k++) { g.fillStyle = `rgba(${70 + rnd() * 40},${100 + rnd() * 40},${50 + rnd() * 20},${0.25 + rnd() * 0.3})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 3, 2 + rnd() * 3); }          // 缝里的苔
      const C = 15, gx = Math.ceil(BWm / C) + 1, gv = Math.ceil(BVm / C) + 1, J = [];          // 一块块大小不一的青石板（格点抖开，四角磨圆）
      for (let i = 0; i <= gx; i++) { J.push([]); for (let j = 0; j <= gv; j++) J[i].push([BOX.x0 + i * C + (i && i < gx ? (rnd() - 0.5) * 8 : 0), BOX.v0 + j * C + (j && j < gv ? (rnd() - 0.5) * 8 : 0)]); }
      for (let i = 0; i < gx; i++) for (let j = 0; j < gv; j++) { const poly = [J[i][j], J[i + 1][j], J[i + 1][j + 1], J[i][j + 1]], c0 = poly.reduce((s, p) => add(s, mul(p, 0.25)), [0, 0]), pp = poly.map((p) => add(c0, mul(sub(p, c0), 1 - 0.55 / Math.max(3, dist(p, c0)))));
        const v0 = 104 + rnd() * 30, warm = rnd() * 12; g.fillStyle = `rgb(${v0 - 4 + warm},${v0 + 4},${v0 + 9 - warm})`; g.strokeStyle = g.fillStyle; g.lineJoin = 'round'; g.lineWidth = 9; g.beginPath(); pp.forEach((p, n) => (n ? g.lineTo(cx(p[0]), cy(p[1])) : g.moveTo(cx(p[0]), cy(p[1])))); g.closePath(); g.fill(); g.stroke();
        const sh = g.createLinearGradient(cx(c0[0]) - 70, cy(c0[1]) - 70, cx(c0[0]) + 70, cy(c0[1]) + 70); sh.addColorStop(0, 'rgba(255,255,255,0.09)'); sh.addColorStop(1, 'rgba(0,0,0,0.12)'); g.fillStyle = sh; g.fill();
        for (let k = 0; k < 3; k++) { const q = add(c0, [(rnd() - 0.5) * 8, (rnd() - 0.5) * 8]), r = (2 + rnd() * 4) * cs, gr = g.createRadialGradient(cx(q[0]), cy(q[1]), 0, cx(q[0]), cy(q[1]), r); gr.addColorStop(0, `rgba(${rnd() < 0.5 ? '70,76,70' : '170,170,160'},0.16)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(cx(q[0]) - r, cy(q[1]) - r, 2 * r, 2 * r); } }
      for (let k = 0; k < 24000; k++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '52,54,52' : '214,214,206'},${rnd() * 0.16})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); }
      g.restore();
      // 石凳脚下一圈淡淡的阴影（贴地的暗）
      const sx = cx(0), sy = cy(D), sw = W * cs, sd = D * cs; g.save(); g.shadowColor = 'rgba(30,28,22,0.55)'; g.shadowBlur = 30; g.fillStyle = 'rgba(30,28,22,0.4)'; g.fillRect(sx - 4, sy - 4, sw + 8, sd + 8); g.restore();          // shadowBlur：iOS 15 也认（ctx.filter 不认）
    });
    groundTex.repeat.set(1 / BWm, 1 / BVm); groundTex.offset.set(-BOX.x0 / BWm, -BOX.v0 / BVm);
    const soilTex = tex(512, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#46392a'); gr.addColorStop(0.1, '#3d3023'); gr.addColorStop(0.2, '#6a5137'); gr.addColorStop(0.32, '#94744f'); gr.addColorStop(1, '#7a5d40'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 420; k++) { g.strokeStyle = `rgba(52,38,22,${0.3 + rnd() * 0.4})`; g.lineWidth = 1; const x = rnd() * w; g.beginPath(); g.moveTo(x, h * 0.06); g.lineTo(x + (rnd() - 0.5) * 6, h * (0.12 + rnd() * 0.16)); g.stroke(); }
      for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '70,54,36' : '200,182,150'},${0.2 + rnd() * 0.35})`; const r = 0.6 + rnd() * 2.2; g.beginPath(); g.arc(rnd() * w, h * (0.3 + rnd() * 0.7), r, 0, 6.3); g.fill(); } });
    soilTex.wrapS = soilTex.wrapT = THREE.RepeatWrapping; soilTex.flipY = false; soilTex.repeat.set(1 / 40, 1 / BASE); soilTex.offset.y = 1 - 1 / BASE;          // 切面的 uv.y = 1 − 高度：一整张从地面铺到底
    { const g = new THREE.ExtrudeGeometry(new THREE.Shape(outline.map(([x, v]) => new THREE.Vector2(x, v))), { depth: BASE, bevelEnabled: false, steps: 1 }); g.rotateX(-Math.PI / 2); g.translate(0, -BASE, 0);
      const m = new THREE.Mesh(g, [lit({ map: groundTex, roughness: 0.92 }), lit({ map: soilTex, roughness: 0.95 })]); m.receiveShadow = true; m.raycast = () => {}; m.userData.qaSupport = true; world.add(m); }
    // 草：一层被风吹着的细草，只长在石板外面
    const sway = (mat, H0) => { mat.customProgramCacheKey = () => 'my-sway' + H0; mat.onBeforeCompile = (sh) => { sh.uniforms.uT = uT; sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n  float bk = position.y / ${H0.toFixed(3)};\n  vec4 ip = instanceMatrix[3];\n  transformed.x += sin(uT * 1.5 + ip.x * 0.26 + ip.z * 0.17) * 0.22 * bk * bk;\n  transformed.z += cos(uT * 1.1 + ip.x * 0.2) * 0.1 * bk * bk;`); }; return mat; };
    { const N = 2600, geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.16, 0, 0, 0.16, 0, 0, 0.04, 3.2, 0], 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
      const blades = new THREE.InstancedMesh(geo, sway(lit({ color: 0xffffff, roughness: 1, side: THREE.DoubleSide }), 3.2), N), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color(); let k = 0;
      for (let tries = 0; k < N && tries < 50000; tries++) { const p = [BOX.x0 + rnd() * BWm, BOX.v0 + rnd() * BVm];
        if (!inPoly(p, outline) || inPoly(p, pave)) continue;
        e.set((rnd() - 0.5) * 0.5, rnd() * 6.3, (rnd() - 0.5) * 0.5); q.setFromEuler(e); const s = 0.5 + rnd() * 0.6; m4.compose(new THREE.Vector3(p[0], 0, -p[1]), q, new THREE.Vector3(1, s, 1)); blades.setMatrixAt(k, m4);
        col.setHSL(0.2 + rnd() * 0.07, 0.32 + rnd() * 0.16, 0.42 + rnd() * 0.14); blades.setColorAt(k, col); k++; }
      blades.count = k; blades.raycast = () => {}; blades.userData.noFrame = true; world.add(blades); }
    // 地上几片银杏叶
    { const leaf = new THREE.Shape(); leaf.moveTo(0, 0); leaf.lineTo(-1.15, 1.7); leaf.quadraticCurveTo(-0.3, 2.35, 0, 2.05); leaf.quadraticCurveTo(0.3, 2.35, 1.15, 1.7); leaf.lineTo(0, 0);
      const lg = new THREE.ShapeGeometry(leaf, 6); lg.rotateX(-Math.PI / 2); const N = 11, leaves = new THREE.InstancedMesh(lg, lit({ color: 0xffffff, roughness: 0.8, side: THREE.DoubleSide }), N), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color(); let k = 0;
      for (let tries = 0; k < N && tries < 4000; tries++) { const p = [BOX.x0 + rnd() * (BOX.x1 - BOX.x0), BOX.v0 + rnd() * (BOX.v1 - BOX.v0)];
        if (!inPoly(p, outline) || (p[0] > -3 && p[0] < 64 && p[1] > -6 && p[1] < 34) || (p[0] > -12 && p[0] < 40 && p[1] < -6 && p[1] > -14)) continue;          // 石凳和右侧面翻开时扫过的地方、前面写尺寸的地方不放
        e.set((rnd() - 0.5) * 0.2, rnd() * 6.3, (rnd() - 0.5) * 0.2); q.setFromEuler(e); m4.compose(new THREE.Vector3(p[0], 0.08 + rnd() * 0.05, -p[1]), q, new THREE.Vector3(1, 1, 1).multiplyScalar(0.9 + rnd() * 0.5)); leaves.setMatrixAt(k, m4);
        col.setHSL(0.11 + rnd() * 0.03, 0.75, 0.52 + rnd() * 0.1); leaves.setColorAt(k, col); k++; }
      leaves.count = k; leaves.receiveShadow = true; leaves.raycast = () => {}; leaves.userData.noFrame = true; world.add(leaves); }
    // 取景：看不见的盒子框住两张皮都翻开时的范围
    // 取景：两只看不见的盒子——合着的时候框紧石凳（蚂蚁好拖），翻开的时候框住整张展开图
    const fbox = (x0, x1, y1) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1, D + 8), basic({ transparent: true, opacity: 0, depthWrite: false })); m.position.set((x0 + x1) / 2, y1 / 2, -D / 2 + 2); m.raycast = () => {}; world.add(m); return m; };
    const frameC = fbox(-8, W + 10, H + 8), frameO = fbox(-10, W + D + 8, H + D + 8); frameO.visible = false;

    // ================= 石凳：芝麻灰花岗岩，边上倒一点圆角；N 角上一点饼干渣 =================
    const graniteTex = tex(1024, 1024, (g, w, h) => { g.fillStyle = '#b3b1aa'; g.fillRect(0, 0, w, h);          // 四方连续：画到边上的斑，在对边再画一遍，铺开看不出接缝
      const wrap = (x, y, r, draw) => { for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) if (x + dx > -r && x + dx < w + r && y + dy > -r && y + dy < h + r) draw(x + dx, y + dy); };
      for (let k = 0; k < 46; k++) { const x = rnd() * w, y = rnd() * h, r = 50 + rnd() * 150, col = rnd() < 0.5 ? 'rgba(150,146,138,0.14)' : 'rgba(208,206,198,0.12)'; wrap(x, y, r, (X, Y) => { const gr = g.createRadialGradient(X, Y, 0, X, Y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(X - r, Y - r, 2 * r, 2 * r); }); }
      for (let k = 0; k < 9000; k++) { const r = 1 + rnd() * 3.6, t = rnd(), x = rnd() * w, y = rnd() * h, e = r * (0.6 + rnd() * 0.5), a = rnd() * 3; g.fillStyle = t < 0.45 ? `rgba(30,30,32,${0.45 + rnd() * 0.45})` : t < 0.75 ? `rgba(110,108,104,${0.3 + rnd() * 0.4})` : `rgba(240,238,230,${0.4 + rnd() * 0.4})`; wrap(x, y, r, (X, Y) => { g.beginPath(); g.ellipse(X, Y, r, e, a, 0, 6.3); g.fill(); }); } });
    graniteTex.wrapS = graniteTex.wrapT = THREE.RepeatWrapping;
    { const g = new RoundedBoxGeometry(W, H, D, 3, 0.7), p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv, cols = [];
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
        if (ax >= ay && ax >= az) uv.setXY(i, z / 26, y / 26); else if (ay >= az) uv.setXY(i, x / 26, z / 26); else uv.setXY(i, x / 26, y / 26);
        const b = n.getY(i) > 0.5 ? 1.05 : 0.8 + 0.2 * smooth(-H / 2, H / 2, y); cols.push(b, b, b * 0.99); }
      g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      const stool = new THREE.Mesh(g, lit({ map: graniteTex, vertexColors: true, roughness: 0.74 })); stool.castShadow = true; stool.receiveShadow = true; stool.raycast = () => {}; stool.position.set(W / 2, H / 2, -D / 2); world.add(stool); }
    { const crumb = solid(new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), lit({ color: 0xcf9550, roughness: 0.8, flatShading: true }))); crumb.scale.set(1.25, 0.72, 1.05); crumb.position.set(W - 1.5, H + 0.5, -(D - 1.5)); crumb.rotation.y = 0.6; world.add(crumb);
      for (const [x, z, r] of [[W - 3.6, D - 1.2, 0.38], [W - 1.1, D - 3.4, 0.3]]) { const c = solid(new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), crumb.material)); c.position.set(x, H + r * 0.5, -z); world.add(c); } }

    // ================= 三个面的“皮”：各在自己的组里，翻开就是绕棱转 90° =================
    const gF = new THREE.Group(), gR = new THREE.Group(), gT = new THREE.Group(); gR.position.set(W, 0, 0); gT.position.set(0, H, 0); world.add(gF, gR, gT);
    const G = { F: gF, R: gR, T: gT };
    const P = (f, u, v, w = 0) => { const a = AX[f]; return new THREE.Vector3(a.o[0] + a.u[0] * u + a.v[0] * v + a.n[0] * w, a.o[1] + a.u[1] * u + a.v[1] * v + a.n[1] * w, a.o[2] + a.u[2] * u + a.v[2] * v + a.n[2] * w); };          // 合上时面上一点
    const netP = (f, u, v, w = 0) => { G[f].updateMatrix(); return new THREE.Vector3(u, v, w).applyMatrix4(G[f].matrix); };          // 现在（可能翻开着）面上一点
    const skin = {}, grid = {};
    for (const f of 'FRT') {
      skin[f] = quiet(new THREE.Mesh(new THREE.PlaneGeometry(FW[f], FH[f]).translate(FW[f] / 2, FH[f] / 2, OUT), lit({ color: 0xc8ecf8, emissive: 0xc8ecf8, emissiveIntensity: 0.5, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, roughness: 0.9 }))); skin[f].renderOrder = 6; G[f].add(skin[f]);
      const gp = []; for (let x = 10; x < FW[f] - 0.1; x += 10) gp.push(x, 0, OUT + 0.05, x, FH[f], OUT + 0.05); for (let y = 10; y < FH[f] - 0.1; y += 10) gp.push(0, y, OUT + 0.05, FW[f], y, OUT + 0.05);
      const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)); grid[f] = quiet(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }))); grid[f].renderOrder = 7; G[f].add(grid[f]); }

    // ================= 数学的线：亮的芯、一圈加色的光晕、底下一层淡淡的暗影（3Blue1Brown 的样子），画在面的坐标里 =================
    const prof = (stops) => { const t = tex(64, 4, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); for (const [o, a] of stops) gr.addColorStop(o, `rgba(255,255,255,${a})`); g.fillStyle = gr; g.fillRect(0, 0, w, h); }); t.colorSpace = THREE.NoColorSpace; return t; };
    const beamTex = prof([[0, 0], [0.14, 0.5], [0.26, 1], [0.74, 1], [0.86, 0.5], [1, 0]]);
    const softTex = prof([[0, 0], [0.15, 0.06], [0.3, 0.24], [0.42, 0.64], [0.5, 1], [0.58, 0.64], [0.7, 0.24], [0.85, 0.06], [1, 0]]);
    const strip = (pts, hw, w, pos, uv) => {          // 一条折线铺成带子：拐角处斜接，不叠
      const q = []; for (const p of pts) if (!q.length || dist(p, q[q.length - 1]) > 1e-4) q.push(p); const n = q.length; if (n < 2) return;
      const L = [], R = [];
      for (let i = 0; i < n; i++) { const d0 = i > 0 ? sub(q[i], q[i - 1]) : null, d1 = i < n - 1 ? sub(q[i + 1], q[i]) : null, nz = (d) => { const l = Math.hypot(d[0], d[1]) || 1; return [d[0] / l, d[1] / l]; };
        const a = nz(d0 || d1), b = nz(d1 || d0); let t = [a[0] + b[0], a[1] + b[1]]; const tl = Math.hypot(t[0], t[1]); t = tl < 1e-6 ? b : [t[0] / tl, t[1] / tl];
        const nn = [-t[1], t[0]], c = Math.max(0.4, nn[0] * -b[1] + nn[1] * b[0]), s = hw / c; let p = q[i];
        if (i === 0) p = sub(p, mul(b, hw * 0.5)); if (i === n - 1) p = add(p, mul(a, hw * 0.5));
        L.push(add(p, mul(nn, s))); R.push(sub(p, mul(nn, s))); }
      for (let i = 0; i < n - 1; i++) { const a = L[i], b = R[i], c = L[i + 1], d = R[i + 1]; pos.push(a[0], a[1], w, b[0], b[1], w, c[0], c[1], w, c[0], c[1], w, b[0], b[1], w, d[0], d[1], w); uv.push(0, 0.5, 1, 0.5, 0, 0.5, 0, 0.5, 1, 0.5, 1, 0.5); } };
    const dashes = (pts, dash) => { const out = []; let acc = 0, cur = null; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], l = dist(a, b); let t = 0; while (t < l - 1e-9) { const ph = (acc + t) % (2 * dash), on = ph < dash, st = Math.max(1e-6, Math.min(l - t, on ? dash - ph : 2 * dash - ph)); if (on) { if (!cur) { cur = [add(a, mul(sub(b, a), t / l))]; out.push(cur); } cur.push(add(a, mul(sub(b, a), (t + st) / l))); } else cur = null; t += st; } acc += l; } return out; };
    const ribbon = (polys, hw, w, dash) => { const pos = [], uv = []; for (const p of polys) for (const piece of dash ? dashes(p, dash) : [p]) strip(piece, hw, w, pos, uv); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return g; };
    const polyLen = (pts) => { let s = 0; for (let i = 1; i < pts.length; i++) s += dist(pts[i], pts[i - 1]); return s; };
    const runsLen = (runs) => runs.reduce((s, r) => s + polyLen(r.pts), 0);
    const cutPoly = (pts, need) => { const out = [pts[0]]; for (let i = 1; i < pts.length; i++) { const l = dist(pts[i], pts[i - 1]); if (need >= l) { out.push(pts[i]); need -= l; } else { out.push(add(pts[i - 1], mul(sub(pts[i], pts[i - 1]), need / Math.max(l, 1e-9)))); break; } } return out; };
    const cutRuns = (runs, k) => { let need = runsLen(runs) * k; const out = []; for (const r of runs) { const l = polyLen(r.pts); if (need >= l - 1e-9) { out.push(r); need -= l; continue; } if (need > 1e-6) out.push({ f: r.f, pts: cutPoly(r.pts, need) }); break; } return out; };
    const at = (runs, s) => { let last = null; for (const r of runs) for (let i = 1; i < r.pts.length; i++) { const a = r.pts[i - 1], b = r.pts[i], l = dist(a, b); if (l < 1e-9) continue; last = { f: r.f, u: b[0], v: b[1], hu: (b[0] - a[0]) / l, hv: (b[1] - a[1]) / l }; if (s <= l) return { ...last, u: a[0] + (b[0] - a[0]) * (s / l), v: a[1] + (b[1] - a[1]) * (s / l) }; s -= l; } return last; };
    const revRuns = (runs) => runs.slice().reverse().map((r) => ({ f: r.f, pts: r.pts.slice().reverse() }));
    const mk = (parent, map, color, op, order, blending) => { const m = quiet(new THREE.Mesh(new THREE.BufferGeometry(), basic({ map, color, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide, blending }))); m.renderOrder = order; m.visible = false; parent.add(m); return m; };
    const lines = [];
    const pathLine = (color, wd, { glow = 0.5, shade = 0.3, dash = 0, order = 12, lift = OUT + LIFT, faces = 'FRT' } = {}) => {
      const per = {}; for (const f of faces) per[f] = { co: mk(G[f], beamTex, color, 1, order, THREE.NormalBlending), gl: glow ? mk(G[f], softTex, color, glow, order - 1, THREE.AdditiveBlending) : null, sh: shade ? mk(G[f], softTex, 0x0b0f12, shade, order - 2, THREE.NormalBlending) : null };
      const o = { runs: null, k: 1, draw: null,
        raw(runs) { const by = {}; if (runs) for (const r of runs) if (per[r.f]) (by[r.f] = by[r.f] || []).push(r.pts);
          for (const f in per) { const m = per[f]; for (const [mesh, hw, w, d] of [[m.co, wd / 2, lift, dash], [m.gl, wd * 1.9, lift - 0.02, 0], [m.sh, wd * 1.2, lift - 0.04, dash]]) { if (!mesh) continue; mesh.geometry.dispose(); if (!by[f]) { mesh.geometry = new THREE.BufferGeometry(); mesh.visible = false; continue; } mesh.geometry = ribbon(by[f], hw, w, d); mesh.visible = true; } } },
        set(runs) { if (this.draw) { this.draw.runs = runs; if (!runs) { this.draw = null; this.raw(null); } return; } this.runs = runs; this.raw(runs); },
        on(runs, dur = 0.6, delay = 0) { this.draw = { runs, t0: now() + delay, dur }; this.runs = runs; this.raw(null); },
        fade(k) { this.k = k; for (const f in per) { const m = per[f]; m.co.material.opacity = k; if (m.gl) m.gl.material.opacity = glow * k; if (m.sh) m.sh.material.opacity = shade * k; } },
        tint(c) { for (const f in per) { per[f].co.material.color.set(c); if (per[f].gl) per[f].gl.material.color.set(c); } } };
      lines.push(o); return o; };
    const rect = (f, e = 0.18) => [{ f, pts: [[e, e], [FW[f] - e, e], [FW[f] - e, FH[f] - e], [e, FH[f] - e], [e, e]] }];
    const edgeL = { F: pathLine(INK, 0.3, { glow: 0.3, shade: 0.18, order: 9, faces: 'F' }), R: pathLine(INK, 0.3, { glow: 0.3, shade: 0.18, order: 9, faces: 'R' }), T: pathLine(INK, 0.3, { glow: 0.3, shade: 0.18, order: 9, faces: 'T' }) };
    for (const f of 'FRT') { edgeL[f].set(rect(f)); edgeL[f].fade(0); }
    const trailPool = [0, 1, 2].map(() => pathLine(INK, 0.5, { glow: 0.35, shade: 0.34, order: 13 }));
    const seg = { R: pathLine(GOLD, 0.78, { glow: 0.55, order: 16 }), T: pathLine(GOLD, 0.78, { glow: 0.55, order: 16 }) };
    const thread = pathLine(GOLD, 0.78, { glow: 0.55, order: 17, faces: 'F' });
    const tri = { R: pathLine(TEAL, 0.5, { glow: 0.45, shade: 0.3, order: 14, faces: 'F' }), T: pathLine(TEAL, 0.5, { glow: 0.45, shade: 0.3, order: 14, faces: 'F' }) };          // 直角三角形的两条直角边：就是展开图的边，用青色描出来
    const triFill = {}; for (const f of 'RT') { const c = f === 'R' ? [W + D, 0] : [0, H + D], n = f === 'R' ? [W + D, H] : [W, H + D], g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, OUT + 0.08, c[0], c[1], OUT + 0.08, n[0], n[1], OUT + 0.08], 3)); triFill[f] = quiet(new THREE.Mesh(g, basic({ color: TEAL, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }))); triFill[f].renderOrder = 8; gF.add(triFill[f]); }          // 直角三角形：淡淡地铺一层青，看得出是个三角形
    const sq = { R: pathLine(TEAL, 0.32, { glow: 0.25, shade: 0.2, order: 14, faces: 'F' }), T: pathLine(TEAL, 0.32, { glow: 0.25, shade: 0.2, order: 14, faces: 'F' }) };
    const ghost = { R: pathLine(GOLD, 0.6, { glow: 0.45, order: 15, faces: 'F' }), T: pathLine(GOLD, 0.6, { glow: 0.45, order: 15, faces: 'F' }) };          // 合上的时候，展开图上那条线段在原地留一道淡影，看着它变成石凳上的折线
    const swing = pathLine(GOLD, 0.7, { glow: 0.5, order: 18, faces: 'F', lift: OUT + LIFT + 0.12 }), arc = pathLine(INK, 0.26, { glow: 0.15, shade: 0.2, dash: 1.1, order: 15, faces: 'F' }), over = pathLine(RED, 1.35, { glow: 0.7, order: 19, faces: 'F', lift: OUT + LIFT + 0.2 });
    const TRI = { R: [{ f: 'F', pts: [[0.5, 0.5], [W + D - 0.3, 0.5], [W + D - 0.3, H]] }], T: [{ f: 'F', pts: [[0.5, 0.5], [0.5, H + D - 0.3], [W, H + D - 0.3]] }] };
    const SQ = { R: [{ f: 'F', pts: [[W + D - 2.6, 0.4], [W + D - 2.6, 3], [W + D, 3]] }], T: [{ f: 'F', pts: [[0.4, H + D - 2.6], [3, H + D - 2.6], [3, H + D]] }] };

    // ================= 点和字：发光的圆点；斜体衬线的字母，数写在图上 =================
    const dotTex = (col) => tex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.15, 'rgba(255,255,255,1)'); gr.addColorStop(0.24, col); gr.addColorStop(0.38, col.replace('1)', '0.5)')); gr.addColorStop(1, col.replace('1)', '0)')); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    const DT = { w: dotTex('rgba(255,255,255,1)'), b: dotTex('rgba(88,196,221,1)'), g: dotTex('rgba(255,200,61,1)') };
    const dot = (parent, size = 2.6) => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ map: DT.w, transparent: true, depthTest: false, depthWrite: false }))); sp.scale.setScalar(size); sp.renderOrder = 28; sp.visible = false; parent.add(sp); return sp; };
    const measure = (font, txt) => { const g = document.createElement('canvas').getContext('2d'); g.font = font; return g.measureText(txt).width; };
    const labTex = (txt, col, px = 64) => { const f = /^[A-Z][′″]?$/.test(txt) ? `italic 500 ${px * 1.12}px "Times New Roman",serif` : `600 ${px}px "Times New Roman","Songti SC","STSong",serif`;
      return tex(Math.ceil(measure(f, txt)) + 44, Math.round(px * 1.55), (g, w, h) => { g.font = f; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.shadowColor = 'rgba(6,10,14,0.65)'; g.shadowBlur = px * 0.22; g.lineWidth = px * 0.16; g.strokeStyle = 'rgba(14,18,24,0.6)'; g.strokeText(txt, w / 2, h / 2 + 2); g.shadowBlur = 0; g.fillStyle = col; g.fillText(txt, w / 2, h / 2 + 2); }); };
    const allLabels = [];
    const label = (parent, hcm) => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }))); sp.renderOrder = 30; sp.userData.h = hcm; sp.userData.k = ''; sp.visible = false; parent.add(sp); allLabels.push(sp); return sp; };
    const setLabel = (sp, txt, col, p) => { if (!txt || !p) { sp.visible = false; return; } if (sp.userData.k !== txt + col) { sp.userData.k = txt + col; const t = labTex(txt, col); sp.material.map?.dispose?.(); sp.material.map = t; sp.material.needsUpdate = true; sp.scale.set((sp.userData.h * t.image.width) / t.image.height, sp.userData.h, 1); } sp.position.set(p[0], p[1], p[2]); sp.visible = true; };
    const DM = dot(gF, 2.8), DN = { R: dot(gR, 2.8), T: dot(gT, 2.8) };
    DM.position.set(0, 0, OUT + 0.5); DN.R.position.set(D, H, OUT + 0.5); DN.T.position.set(W, D, OUT + 0.5); DM.visible = DN.R.visible = DN.T.visible = true;
    const LB = { M: label(gF, 4.6), N: label(world, 4.6), NR: label(gR, 4.6), NT: label(gT, 4.6), dW: label(gF, 3.1), dR: label(gR, 3.1), dH: label(gF, 3.1), dT: label(gT, 3.1), tR: label(gR, 3.1), tT: label(gT, 3.1), sR: label(gF, 3.6), sT: label(gT, 3.6), trial: label(world, 3.4), clock: label(world, 3.6) };
    setLabel(LB.M, 'M', '#ffffff', [-3.4, -3.2, OUT + 0.5]);
    setLabel(LB.dW, '30 cm', '#ffffff', [W / 2, -3.6, OUT]); setLabel(LB.dR, '30 cm', '#ffffff', [D / 2, -3.6, OUT]); setLabel(LB.dH, '40 cm', '#ffffff', [-5.6, H / 2, OUT]); setLabel(LB.dT, '30 cm', '#ffffff', [-5.6, D / 2, OUT]);

    // ================= 蚂蚁：头、胸、腹三节，六条腿两节，触角折着；比真的大一点（看得清） =================
    const ant = new THREE.Group(), antBody = new THREE.Group(); ant.add(antBody); antBody.scale.setScalar(1.75); world.add(ant);
    const shell = lit({ color: 0x1d1713, roughness: 0.32, metalness: 0.08 });
    const ell = (rx, ry, rz, x, y, z, par = antBody) => { const m = solid(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), shell)); m.scale.set(rx, ry, rz); m.position.set(x, y, z); par.add(m); return m; };
    ell(0.42, 0.3, 0.33, -0.62, 0.38, 0); ell(0.09, 0.13, 0.08, -0.18, 0.34, 0); ell(0.3, 0.13, 0.14, 0.08, 0.34, 0); ell(0.21, 0.18, 0.2, 0.5, 0.38, 0);
    const bone = (par, a, b, r) => { const d = new THREE.Vector3().subVectors(b, a), m = solid(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, d.length(), 5), shell)); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); par.add(m); return m; };
    const legs = [];
    for (const [x, sw, ph] of [[0.2, 0.42, 0], [0.06, 0.05, 0.5], [-0.06, -0.45, 0]]) for (const s of [1, -1]) { const hip = new THREE.Group(); hip.position.set(x, 0.28, 0.08 * s); antBody.add(hip);
      const knee = new THREE.Vector3(sw * 0.35, 0.18, 0.4 * s), foot = new THREE.Vector3(sw * 0.75, -0.28, 0.78 * s); bone(hip, new THREE.Vector3(), knee, 0.035); bone(hip, knee, foot, 0.028);
      legs.push({ hip, ph: (ph + (s > 0 ? 0 : 0.5)) % 1 }); }
    const antennae = [];
    for (const s of [1, -1]) { const a = new THREE.Group(); a.position.set(0.62, 0.48, 0.09 * s); antBody.add(a); const el = new THREE.Vector3(0.12, 0.28, 0.12 * s); bone(a, new THREE.Vector3(), el, 0.022); bone(a, el, new THREE.Vector3(0.52, 0.2, 0.26 * s), 0.018); antennae.push({ g: a, s }); }
    const antPick = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 8), basic({ visible: false })); antPick.userData.pick = true; antPick.userData.noFrame = true; world.add(antPick);
    const gait = { p: 0, amp: 0, moved: -9 };
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion();
    const antAim = { p: new THREE.Vector3(), q: new THREE.Quaternion(), snap: true };
    function placeAnt(f, u, v, hu, hv) { const a = AX[f], fw = new THREE.Vector3(a.u[0] * hu + a.v[0] * hv, a.u[1] * hu + a.v[1] * hv, a.u[2] * hu + a.v[2] * hv).normalize(), up = new THREE.Vector3(...a.n), rt = fw.clone().cross(up); _m.makeBasis(fw, up, rt); _q.setFromRotationMatrix(_m); antAim.p.copy(P(f, u, v, OUT * 0.5)); antAim.q.copy(_q); antPick.position.copy(P(f, u, v, 2.4)); }

    // ================= 重拍：从那一点迸出一圈短光线（3Blue1Brown 的 Flash），永远朝着镜头 =================
    const rayTex = tex(256, 256, (g) => { g.translate(128, 128); g.lineCap = 'round'; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + 0.13; g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 7; g.beginPath(); g.moveTo(Math.cos(a) * 70, Math.sin(a) * 70); g.lineTo(Math.cos(a) * 120, Math.sin(a) * 120); g.stroke(); } });
    const flashes = [];
    const flash = (p, col = GOLD, size = 16, delay = 0) => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ map: rayTex, color: col, transparent: true, depthTest: false, depthWrite: false, opacity: 0 }))); sp.renderOrder = 32; sp.position.copy(p); world.add(sp); flashes.push({ sp, t0: now() + delay, size }); };

    // ================= 此刻那一句：印在地块前面的土层切面上（沿着轮廓），不挡石凳 =================
    const capFront = outline.filter(([x, v]) => v < -24 && x > -28 && x < 88).sort((a, b) => a[0] - b[0]);
    const CY0 = -BASE + 0.9, CY1 = -0.7, COFF = 0.08;
    const capGeo = new THREE.BufferGeometry(); let capLen = 0;
    { const sp = capFront.map((p, i) => { const a = capFront[Math.max(0, i - 1)], b = capFront[Math.min(capFront.length - 1, i + 1)], dx = b[0] - a[0], dv = b[1] - a[1], L = Math.hypot(dx, dv) || 1; return [p[0] + (dv / L) * COFF, p[1] - (dx / L) * COFF]; });
      for (let i = 1; i < sp.length; i++) capLen += dist(sp[i], sp[i - 1]);
      const pos = [], uvs = [], idx = []; let s2 = 0;
      sp.forEach((p, i) => { if (i) s2 += dist(p, sp[i - 1]); pos.push(p[0], CY0, -p[1], p[0], CY1, -p[1]); uvs.push(s2 / capLen, 0, s2 / capLen, 1); if (i) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); } });
      capGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); capGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); capGeo.setIndex(idx); }
    const CW = 2048, CH = Math.round((CW * (CY1 - CY0)) / capLen);
    const capMesh = quiet(new THREE.Mesh(capGeo, basic({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }))); capMesh.renderOrder = 4; capMesh.visible = false; world.add(capMesh);
    const capTex = (big, small) => tex(CW, CH, (g, w, h) => {
      const fb = (f) => `600 ${Math.round(h * 0.42 * f)}px "Times New Roman","Songti SC","STSong",serif`, fs = (f) => `500 ${Math.round(h * 0.26 * f)}px "Times New Roman","Songti SC","STSong",serif`;
      let f = 1; for (; f > 0.45; f -= 0.04) { g.font = fb(f); const wb = g.measureText(big).width; g.font = fs(f); const ws = small ? g.measureText(small).width : 0; if (Math.max(wb, ws) < w - h * 1.2) break; }
      g.font = fb(f); const wb = g.measureText(big).width; g.font = fs(f); const tot = Math.max(wb, small ? g.measureText(small).width : 0), x0 = (w - tot) / 2;
      const band = g.createLinearGradient(x0 - h * 0.7, 0, x0 + tot + h * 0.7, 0); band.addColorStop(0, 'rgba(30,22,14,0)'); band.addColorStop(0.08, 'rgba(30,22,14,0.52)'); band.addColorStop(0.92, 'rgba(30,22,14,0.52)'); band.addColorStop(1, 'rgba(30,22,14,0)'); g.fillStyle = band; g.fillRect(x0 - h * 0.7, h * 0.05, tot + h * 1.4, h * 0.9);
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = fb(f); g.fillStyle = '#fbf2de'; g.fillText(big, w / 2, small ? h * 0.37 : h * 0.5); if (small) { g.font = fs(f); g.fillStyle = '#ebe0c8'; g.fillText(small, w / 2, h * 0.75); } });
    const cap = { key: '', born: -9, out: 1e9, next: null };
    function caption(big, small = '') { const key = big + '|' + small; if (key === cap.key) return; cap.key = key; S.cap = [big, small];
      const show = () => { capMesh.material.map?.dispose?.(); capMesh.material.map = capTex(big, small); capMesh.material.needsUpdate = true; capMesh.visible = true; cap.born = now(); cap.out = 1e9; };
      if (capMesh.visible && now() - cap.born > 0.2) { cap.out = now(); cap.next = show; } else show(); }
    const prompt = (txt) => { S.ask = txt; if (ui?.status) ui.status(txt); };

    // ================= 板书：学生做出一样，就用课本的话写一行 =================
    const css = document.createElement('style');
    css.textContent = `
.my-board{margin:4px 0 6px;display:flex;flex-direction:column;gap:8px;font:15px/1.7 "Kaiti SC","STKaiti","Songti SC",serif;color:#2b2722}
.my-board .mb-row{opacity:0;transform:translateY(5px);transition:opacity .5s,transform .5s,background-color 2.4s;padding:3px 8px 3px 6px;border-radius:5px;border-left:3px solid transparent}
.my-board .mb-row.in{opacity:1;transform:none}
.my-board .mb-row.fresh{background:rgba(255,206,110,.34);border-left-color:#d98a2b}
.my-board .n{display:inline-block;min-width:1.25em;color:#b0532a;font-weight:700}
.my-board b{color:#8a2f1d}
.my-board i{font-family:"Times New Roman",serif;font-style:italic;letter-spacing:.02em}
.my-board .ia{color:#c98600;font-weight:600}.my-board .nb{color:#2589b0;font-weight:600}.my-board .rd{color:#d4402f;font-weight:600}.my-board .tl{color:#1a9a82;font-weight:600}
.my-board .mb-h{font:600 12px/1.3 "PingFang SC","Hiragino Sans GB",sans-serif;color:#a07a45;letter-spacing:.3em;margin:6px 0 -4px;opacity:0;transition:opacity .4s}
.my-board .mb-h.in{opacity:1}
.my-board.review .mb-row[data-k]{cursor:pointer}.my-board.review .mb-row[data-k]:hover{background:rgba(255,206,110,.16)}
.my-board .mb-row.sel{background:rgba(255,206,110,.34);border-left-color:#d98a2b}`;
    document.head.append(css);
    let boardEl = null, lastH = ''; const rows = [];
    const reveal = (r) => { const body = boardEl?.closest('.p-body'); if (!body) return; setTimeout(() => { const rb = r.getBoundingClientRect(), bb = body.getBoundingClientRect(); if (rb.bottom > bb.bottom - 14) body.scrollBy({ top: rb.bottom - bb.bottom + 28, behavior: 'smooth' }); }, 80); };
    const board = (html, key = '') => { const r = document.createElement('div'); r.className = 'mb-row'; r.innerHTML = html; r.dataset.k = key; rows.push(r); for (const o of rows) o.classList?.remove('fresh'); if (boardEl) { boardEl.append(r); requestAnimationFrame(() => { r.classList.add('in', 'fresh'); reveal(r); }); } return r; };
    board.h = (title) => { if (title === lastH) return; lastH = title; const r = document.createElement('div'); r.className = 'mb-h'; r.textContent = title; rows.push(r); if (boardEl) { boardEl.append(r); requestAnimationFrame(() => { r.classList.add('in'); reveal(r); }); } };
    const i = (s) => `<i>${s}</i>`;
    const FN = { R: '右侧面', T: '顶面' };

    // ================= 状态 =================
    const fresh = () => ({ beat: 'try', k: { R: 0, T: 0 }, held: '', ant: { f: 'F', u: 3.4, v: 2.6, hu: 0.6, hv: 0.8 }, cur: null, trials: [], arrived: false, back: null, asked: false, trialRow: null,
      opened: { R: false, T: false }, order: [], name: { R: '', T: '' }, con: { R: false, T: false }, conOrder: [], snap: '', tp: null, spring: null, swingAt: -9, wasOpen: { R: false, T: false }, closed: false, run: null, wowAt: -9, done: false, cap: ['', ''], ask: '', beatAt: 0, hint: 0, pose: '' });
    let S = fresh(), runId = 0;
    const later = (ms, f) => { const id = runId; setTimeout(() => { if (!dead && id === runId) f(); }, ms); };
    const go = (beat, big, small, ask) => { S.beat = beat; S.beatAt = now(); S.hint = 0; if (big) caption(big, small); if (ask !== undefined) prompt(ask); layout(); };
    const dirOf = (az, el) => [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
    const DIRC = dirOf(0.52, 0.42), DIRO = dirOf(0.38, 0.3);          // 合着：斜着看石凳的三个面；翻开：更正一点看展开图（比长短时镜头放正）
    function frame(open) { S.wide = open; frameO.visible = open; frameC.visible = !open; requestAnimationFrame(() => aim?.(open ? DIRO : DIRC)); }
    const anyOpen = () => S.k.R > 0.001 || S.k.T > 0.001;
    const tri1 = (f) => S.con[f] && S.k[f] > 0.97 && !S.closed && (S.pose ? S.pose === 'line1' : ['line', 'other', 'line2'].includes(S.beat) && S.conOrder[S.conOrder.length - 1] === f);          // 直角三角形只陪着刚连上的那条线段，比较的时候收起来
    const other = (f) => (f === 'R' ? 'T' : 'R');
    const fmt = (x) => x.toFixed(1);

    function layout() {
      gR.rotation.y = (Math.PI / 2) * (1 - S.k.R); gT.rotation.x = -(Math.PI / 2) * (1 - S.k.T);
      for (const f of 'RT') { const k = S.k[f], open = k > 0.12, blue = open && S.name[f];
        DN[f].material.map = blue ? DT.b : DT.w;
        if (f === 'R') setLabel(LB.NR, blue ? S.name.R : '', '#9be3f5', [D + 3.2, H + 2.8, OUT + 0.5]); else setLabel(LB.NT, blue ? S.name.T : '', '#9be3f5', [W + 3.4, D + 2.6, OUT + 0.5]); }
      DN.R.visible = S.k.R > 0.02 || S.k.T > 0.02;          // 合着的时候两张皮上的 N 在同一个角上，只亮一个点
      setLabel(LB.N, 'N', '#ffffff', [W + 3.2, H + 3.6, -D - 1.2]);
      for (const f of 'RT') { if (!tri1(f)) { tri[f].set(null); sq[f].set(null); } else if (!tri[f].runs && !tri[f].draw) { tri[f].on(TRI[f], 0.7, 0.25); sq[f].on(SQ[f], 0.3, 0.9); } }
      setLabel(LB.tR, tri1('R') ? '40 cm' : '', '#ffffff', [D + 5, H / 2, OUT]); setLabel(LB.tT, tri1('T') ? '30 cm' : '', '#ffffff', [W / 2, D + 3.4, OUT]);
      setLabel(LB.sR, S.con.R ? `${fmt(LEN.R)} cm` : '', '#ffe08a', [18.4, 5.4, OUT + 0.6]);          // 长度写在线段旁边：右侧面那条写在它在正面的那一段上，顶面那条写在顶面那一段上
      setLabel(LB.sT, S.con.T ? `${fmt(LEN.T)} cm` : '', S.closed ? '#e2c87e' : '#ffe08a', [19.2, 17, OUT + 0.6]);
    }

    // ================= 主线 =================
    function startTrail() {          // 新的一条路从 M 开始；上一条留着、淡一点
      if (S.cur) { S.trials.length > 3 && S.trials.shift(); }
      S.ant = { f: 'F', u: 0, v: 0, hu: 0.6, hv: 0.8 }; S.cur = { runs: [{ f: 'F', pts: [[0, 0]] }], done: false }; S.arrived = false;
      drawTrails(); setLabel(LB.trial, '', '', null); }
    function drawTrails() {          // 正在走的（或刚走完的）那条亮，前两条淡
      const done = S.trials.map((t) => t.runs), live = S.cur && !S.cur.done, cur = live ? S.cur.runs : done[done.length - 1] || null, old = (live ? done : done.slice(0, -1)).slice(-2);
      trailPool[2].set(cur); trailPool[2].fade(1); for (let n = 0; n < 2; n++) { trailPool[n].set(old[old.length - 1 - n] || null); trailPool[n].fade(0.42); } }
    function stepTo(u, v) { const a = S.ant, du = u - a.u, dv = v - a.v, l = Math.hypot(du, dv); if (l > 0.05) { a.hu = du / l; a.hv = dv / l; gait.p += l * 1.5; gait.moved = now(); } a.u = u; a.v = v;
      const run = S.cur.runs[S.cur.runs.length - 1], lp = run.pts[run.pts.length - 1]; if (dist(lp, [u, v]) > 0.3) run.pts.push([u, v]); }
    function antTo(t) {          // 蚂蚁沿表面走到 t；换面时先走到公共棱上（两个面展开成一个平面，连线和棱的交点）
      const a = S.ant; if (S.arrived || !S.cur) return;
      if (t.f !== a.f) { const key = a.f + t.f, e = EDGE[key]; if (!e) return; const q = UNF[key](t.u, t.v), p = [a.u, a.v];
        const den = e.ax === 0 ? q[0] - p[0] : q[1] - p[1], s = Math.abs(den) < 1e-9 ? 0 : clamp(((e.ax === 0 ? e.c - p[0] : e.c - p[1])) / den, 0, 1);
        const tt = clamp(e.ax === 0 ? p[1] + s * (q[1] - p[1]) : p[0] + s * (q[0] - p[0]), 0, e.hi), cA = e.ax === 0 ? [e.c, tt] : [tt, e.c], cB = e.to(tt);
        stepTo(cA[0], cA[1]); const run = S.cur.runs[S.cur.runs.length - 1]; if (dist(run.pts[run.pts.length - 1], cA) > 1e-6) run.pts.push(cA);
        S.cur.runs.push({ f: t.f, pts: [cB] }); a.f = t.f; a.u = cB[0]; a.v = cB[1]; }
      stepTo(t.u, t.v);
      if ((a.f === 'R' || a.f === 'T') && dist([a.u, a.v], NC[a.f]) < 2.4) arrive(a.f);
    }
    const _ray = new THREE.Ray(), _box = new THREE.Box3(new THREE.Vector3(0, 0, -D), new THREE.Vector3(W, H, 0)), _hit = new THREE.Vector3(), _pl = new THREE.Plane();
    const toFace = (f, p) => { const a = AX[f], d = [p.x - a.o[0], p.y - a.o[1], p.z - a.o[2]]; return { f, u: d[0] * a.u[0] + d[1] * a.u[1] + d[2] * a.u[2], v: d[0] * a.v[0] + d[1] * a.v[1] + d[2] * a.v[2] }; };
    function surfHit(r) {          // 鼠标指着石凳表面的哪一点（只算看得见的正面、右侧面、顶面）；指到外面，就贴着蚂蚁所在那一面的边
      world.updateMatrixWorld(true); _ray.copy(r.ray).applyMatrix4(world.matrixWorld.clone().invert());
      if (_ray.intersectBox(_box, _hit)) { const f = Math.abs(_hit.z) < 0.02 ? 'F' : Math.abs(_hit.x - W) < 0.02 ? 'R' : Math.abs(_hit.y - H) < 0.02 ? 'T' : null; if (f) { const t = toFace(f, _hit); t.u = clamp(t.u, 0, FW[f]); t.v = clamp(t.v, 0, FH[f]); return t; } }
      const f = S.ant.f, a = AX[f]; _pl.setFromNormalAndCoplanarPoint(new THREE.Vector3(...a.n), new THREE.Vector3(...a.o)); if (!_ray.intersectPlane(_pl, _hit)) return null;
      const t = toFace(f, _hit); t.u = clamp(t.u, 0, FW[f]); t.v = clamp(t.v, 0, FH[f]); return t; }
    const antOK = () => ['try', 'unfold'].includes(S.beat) && !anyOpen() && !S.back;
    function antDown() { if (!antOK()) return false;
      if (S.arrived || !S.cur) startTrail(); S.held = 'ant'; sfx.clink({ freq: 1800, gain: 0.02 });
      if (!S.asked) { S.asked = true; board.h('问题'); board(`一只蚂蚁以 3 cm/s 的速度从点 ${i('M')} 爬到点 ${i('N')}，最快需要多长时间？蚂蚁只能在石凳的表面上爬`, 'try'); }
      return true; }
    function antMove(r) { if (S.held !== 'ant' || S.arrived) return; const t = surfHit(r); if (t) { antTo(t); if (!S.arrived) trailPool[2].set(S.cur.runs); } }
    function antUp() { if (S.held === 'ant') S.held = ''; }
    function arrive(f) {          // 走到了 N：这条路多长、要爬多久
      const a = S.ant; a.u = NC[f][0]; a.v = NC[f][1]; const run = S.cur.runs[S.cur.runs.length - 1]; run.pts.push(NC[f].slice());
      S.cur.done = true; S.arrived = true; S.held = ''; const L = runsLen(S.cur.runs); S.trials.push({ runs: S.cur.runs, len: L }); drawTrails();
      const mid = at(S.cur.runs, L * 0.5); setLabel(LB.trial, `${fmt(L)} cm`, '#ffffff', P(mid.f, mid.u, mid.v, 3.2).toArray());
      flash(P('T', W, D, 0.6), INK, 13); sfx.ding(1100, { gain: 0.05 });
      caption(`这条路长 ${fmt(L)} cm，要爬 ${fmt(L / V)} s`, '还能更短吗？');
      const list = S.trials.map((t) => `${fmt(t.len)} cm`).join('、');
      if (!S.trialRow) { board.h('试一试'); S.trialRow = board(`<span class="n">1</span>替蚂蚁走的路：${list}。哪一条最短？`, 'try'); } else S.trialRow.innerHTML = `<span class="n">1</span>替蚂蚁走的路：${list}。哪一条最短？`;
      later(1200, walkBack);
      if (S.beat === 'try') later(3200, () => { if (S.beat === 'try') { frame(true); go('unfold', '两点之间，线段最短', '可是 M、N 不在同一个面上，石头上拉不出一条直的线段', '要是把石凳的表面摊平呢？按住右侧面或顶面，往外翻开'); } });
    }
    function walkBack() { if (!S.arrived || anyOpen()) return; S.back = { runs: revRuns(S.cur.runs), t0: now(), dur: 1.3 }; }
    // ---- 翻开、合上那层皮 ----
    const skinAng = (f, p) => (f === 'R' ? Math.atan2(-p.z, p.x - W) : Math.atan2(-p.z, p.y - H));
    const skinOK = (f) => (S.beat === 'fold' ? S.wasOpen[f] && S.k[f] > 0.5 : ['unfold', 'line', 'other', 'line2'].includes(S.beat) && !S.closed && !S.back);
    function skinDown(f, p) { if (!skinOK(f) || S.held) return false; S.held = f; if (S.ant.f !== 'F' || S.ant.u > 0.01 || S.ant.v > 0.01) { S.ant = { f: 'F', u: 0, v: 0, hu: 0.6, hv: 0.8 }; S.arrived = true; if (S.cur) S.cur.done = true; } S.grab = { a0: skinAng(f, p), k0: S.k[f] }; sfx.whoosh({ dur: 0.25, freq: 1500, gain: 0.03 }); return true; }
    function skinMove(f, p) { if (S.held !== f) return; if (S.beat === 'fold' && !S.ghostOn) { S.ghostOn = true; for (const g of 'RT') if (S.con[g]) { ghost[g].set([{ f: 'F', pts: [[0, 0], NET[g]] }]); ghost[g].fade(0.5); } } let d = S.grab.a0 - skinAng(f, p); while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      const k = clamp(S.grab.k0 + d / (Math.PI / 2), 0, 1); if (S.beat === 'fold') { for (const g of 'RT') if (S.wasOpen[g]) S.k[g] = Math.min(k, 1); } else S.k[f] = k; layout(); }
    function skinUp(f) { if (S.held !== f) return; S.held = ''; const fs = S.beat === 'fold' ? ['R', 'T'].filter((g) => S.wasOpen[g]) : [f], to = S.k[f] > 0.5 ? 1 : 0;
      animK(fs, to, () => { for (const g of fs) if (to === 1 && !S.opened[g]) opened(g); if (to === 0 && S.beat === 'fold' && S.k.R === 0 && S.k.T === 0) wow(); }); }
    function animK(fs, to, done) { const from = fs.map((g) => S.k[g]), t0 = now(), id = runId; const step = () => { if (dead || id !== runId) return; const q = clamp((now() - t0) / 0.38, 0, 1); fs.forEach((g, n) => { S.k[g] = lerp(from[n], to, easeOut(q)); }); layout(); if (q < 1) requestAnimationFrame(step); else { if (to === 1 || to === 0) sfx.clink({ freq: to ? 1500 : 1100, gain: 0.04 }); done?.(); } }; step(); }
    function opened(f) {          // 展开：皮翻到和正面同一个平面上，N 落在 N′（N″）
      S.opened[f] = true; S.order.push(f); const first = S.order.length === 1, nm = f === 'R' ? 'N′' : 'N″'; S.name[f] = nm; setLabel(LB.trial, '', '', null); layout();
      flash(netP(f, ...NC[f], OUT + 0.6), BLUE, 13);
      if (first) { caption('表面展开成了平面', `将石凳的表面适当展开，可以展开成平面图形；N 落在了 ${nm}`); board.h('展开');
        board(`<span class="n">2</span>将石凳的表面适当展开，可以展开成平面图形（展开图）：${FN[f]}翻到和正面在同一个平面上，${i('N')} 落在 <span class="nb">${i(nm)}</span>`, 'unfold');
        later(2000, () => { if (!S.con[f]) go('line', `在这个平面上，M 到 ${nm} 怎么走最短？`, '两点之间，线段最短', `从 M 拉一条线段到 ${nm}`); }); }
      else { caption(`N 又落在了 ${nm}`, '同一个点 N，换一种展开，落在了另一个地方');
        later(1800, () => { if (!S.con[f]) go('line2', `M 到 ${nm} 呢？`, '两点之间，线段最短', `再从 M 拉一条线段到 ${nm}`); }); }
    }
    // ---- 从 M 拉线段 ----
    const openN = () => ['R', 'T'].filter((f) => S.opened[f] && S.k[f] > 0.97 && !S.con[f]);
    const threadOK = () => openN().length > 0 && !S.held && !S.closed;
    function threadDown(p) { if (!threadOK()) return false; S.held = 'thread'; S.spring = null; S.tp = [Math.max(0, p.x), Math.max(0, p.y)]; threadMove(p); return true; }
    function threadMove(p) { if (S.held !== 'thread') return; let q = [p.x, p.y]; S.snap = ''; for (const f of openN()) if (dist(q, NET[f]) < 3.6) { q = NET[f].slice(); S.snap = f; } S.tp = q; thread.set([{ f: 'F', pts: [[0, 0], q] }]); }
    function threadUp() { if (S.held !== 'thread') return; S.held = ''; if (S.snap) { const f = S.snap; S.snap = ''; thread.set(null); connect(f); } else if (S.tp) { S.spring = { from: S.tp, t0: now() }; sfx.whoosh({ dur: 0.2, freq: 900, gain: 0.02 }); } }
    function connect(f) {          // 两点之间，线段最短：连上了；勾股定理算出长度
      S.con[f] = true; S.conOrder.push(f); const nm = S.name[f], L = LEN[f], first = S.conOrder.length === 1;
      seg[f].on(SEG[f], 0.01); flash(netP(f, ...NC[f], OUT + 0.6), GOLD, 15); sfx.ding(1250, { gain: 0.06 }); layout();
      const a2 = f === 'R' ? '60² + 40²' : '30² + 70²', legs = f === 'R' ? '直角边：30 + 30 = 60，和 40' : '直角边：30，和 40 + 30 = 70';
      caption(`M${nm} = √(${a2}) ≈ ${fmt(L)} cm`, `${legs}（勾股定理）`);
      board.h(first ? '计算' : '比较');
      board(`<span class="n">${first ? 3 : 4}</span>两点之间，线段最短：连接 <span class="ia">${i('M' + nm)}</span>。直角三角形的两条直角边长 <span class="tl">${f === 'R' ? '30 + 30 = 60' : '30'}</span> 和 <span class="tl">${f === 'R' ? '40' : '40 + 30 = 70'}</span>，根据勾股定理，<span class="ia">${i('M' + nm)}</span>² = ${a2} = ${f === 'R' ? 5200 : 5800}，<span class="ia">${i('M' + nm)}</span> ≈ ${fmt(L)} cm`, first ? 'line1' : 'other');
      if (first) later(2900, () => { const o = other(f); if (S.opened[o]) { if (!S.con[o]) go('line2', `M 到 ${S.name[o]} 呢？`, '两点之间，线段最短', `再从 M 拉一条线段到 ${S.name[o]}`); } else go('other', '只有这一种展开吗？', f === 'R' ? '从顶面翻过去呢？' : '从右侧面绕过去呢？', f === 'R' ? '把顶面也翻上去' : '把右侧面也翻开'); });
      else later(2300, compare);
    }
    function compare() {          // 长的那条绕 M 转过来叠在短的上面：多出一截
      S.swingAt = now(); S.beat = 'compare'; sfx.whoosh({ dur: 0.9, freq: 800, gain: 0.03 });
      later(1200, () => { const e = mul([W + D, H], LEN.T / LEN.R); flash(new THREE.Vector3(e[0], e[1], OUT + 0.6), RED, 12); sfx.ding(1100, { gain: 0.05 });
        caption(`${fmt(LEN.R)} < ${fmt(LEN.T)}`, '从正面绕到右侧面，比翻过顶面近约 4 cm');
        board(`<span class="n">5</span><span class="ia">${fmt(LEN.R)}</span> &lt; <span class="ia">${fmt(LEN.T)}</span>：从正面绕到右侧面更近，<span class="rd">短约 4 cm</span>。从左侧面绕到后面一样短（石凳的底面是正方形）`, 'other');
        later(2900, () => { S.wasOpen = { R: S.k.R > 0.5, T: S.k.T > 0.5 }; go('fold', '这两条线段，放回石凳上是什么样？', '把展开图合回去', '按住翻开的面，合上'); if (!S.wasOpen.R && !S.wasOpen.T) wow(); }); });
    }
    function wow() {          // 全课唯一的重拍：合上，两条线段在棱上一折，N′、N″ 落回同一个 N；最短的那条亮起来，蚂蚁沿它爬过去
      if (S.closed) return; S.closed = true; S.beat = 'wow'; S.wowAt = now(); hideTip(); layout();
      flash(P('T', W, D, 0.8), GOLD, 22); flash(P('T', W, D, 0.8), BLUE, 15, 0.12); sfx.ding(1480, { gain: 0.07 }); later(380, () => sfx.ding(1760, { gain: 0.05 }));
      caption('两个 N 合成了同一个点', '展开图上的线段，合回去就是石凳表面上的路，在棱上折了一下');
      board.h('合上'); board(`<span class="n">6</span>合上：展开图上的线段 <span class="ia">${i('M' + S.name.R)}</span>，就是石凳表面上从正面绕到右侧面的最短的路（在棱上折了一下）`, 'fold');
      later(350, () => frame(false)); later(1500, () => { S.run = { t0: now(), dur: 2.6 }; });
    }
    function ranTo() { flash(P('T', W, D, 0.8), GOLD, 16); sfx.ding(1320, { gain: 0.06 }); caption(`${fmt(LEN.R)} ÷ 3 ≈ ${fmt(LEN.R / V)} s`, `最快需要约 ${fmt(LEN.R / V)} s`); later(2200, finish); }
    function finish() {
      if (S.done) return; S.beat = 'end'; S.done = true; hideTip(); boardEl?.classList.add('review');
      caption(`答：最快需要约 ${fmt(LEN.R / V)} s`, '展开成平面，两点之间线段最短，再用勾股定理算出长度');
      board.h('答'); board(`<b>答</b>：沿正面和右侧面爬最近（沿左侧面和后面爬一样近），最短的路长 √(60² + 40²) = √5200 ≈ ${fmt(LEN.R)}（cm），最快需要 ${fmt(LEN.R)} ÷ 3 ≈ ${fmt(LEN.R / V)}（s）。`, 'ans');
      prompt(''); ui?.unlock?.();
      later(2600, () => { ui?.go?.(2); ui?.fold?.(false); });          // 一课结束：翻到“对照课本原文”
    }
    // 讲完以后点板书：场景摆回那一刻
    function pose(k) {
      runId++; S.pose = k; S.run = null; S.back = null; S.spring = null; S.swingAt = -9; S.ghostOn = false; ghost.R.set(null); ghost.T.set(null); thread.set(null); for (const L of [swing, arc, over]) L.set(null);
      const first = S.order[0] || 'R', firstCon = S.conOrder[0] || first;
      const open = { try: [], unfold: [first], line1: [firstCon], other: ['R', 'T'], fold: [], ans: [] }[k] || [];
      S.k = { R: open.includes('R') ? 1 : 0, T: open.includes('T') ? 1 : 0 }; S.closed = ['fold', 'ans'].includes(k);
      const con = { try: [], unfold: [], line1: [firstCon], other: ['R', 'T'], fold: ['R', 'T'], ans: ['R', 'T'] }[k] || [];
      S.con = { R: con.includes('R'), T: con.includes('T') }; for (const f of 'RT') { seg[f].draw = null; seg[f].set(S.con[f] ? SEG[f] : null); tri[f].set(null); sq[f].set(null); }
      seg.T.tint(S.closed ? 0xd2ad55 : GOLD); seg.T.fade(S.closed ? 0.5 : 1); seg.R.fade(1);
      if (k === 'other') S.swingAt = now();
      const end = k === 'ans'; S.ant = end ? { f: 'R', u: D, v: H, hu: 0.6, hv: 0.5 } : { f: 'F', u: 3.4, v: 2.6, hu: 0.6, hv: 0.8 };
      setLabel(LB.clock, end ? `t = ${fmt(LEN.R / V)} s` : '', '#ffe08a', [W + 9.5, H - 4, -D + 3]);
      const CAP = { try: ['替蚂蚁走的路', '哪一条最短？蚂蚁只能在石凳的表面上爬'], unfold: ['表面展开成了平面', '将石凳的表面适当展开，可以展开成平面图形'], line1: [`M${S.name[firstCon] || (firstCon === 'R' ? 'N′' : 'N″')} = √(${firstCon === 'R' ? '60² + 40²' : '30² + 70²'}) ≈ ${fmt(LEN[firstCon])} cm`, '两点之间，线段最短；勾股定理'], other: [`${fmt(LEN.R)} < ${fmt(LEN.T)}`, '从正面绕到右侧面，比翻过顶面近约 4 cm'], fold: ['两个 N 合成了同一个点', '展开图上的线段，合回去就是石凳表面上的路'], ans: [`答：最快需要约 ${fmt(LEN.R / V)} s`, `${fmt(LEN.R)} ÷ 3 ≈ ${fmt(LEN.R / V)}（s）`] };
      frame(open.length > 0); caption(...(CAP[k] || CAP.ans)); layout(); drawTrails();
    }

    // ================= 动手 =================
    const skinPick = {}; for (const f of 'RT') { const m = new THREE.Mesh(new THREE.PlaneGeometry(FW[f], FH[f]).translate(FW[f] / 2, FH[f] / 2, OUT + 0.3), basic({ visible: false, side: THREE.DoubleSide })); m.userData.pick = true; m.userData.noFrame = true; G[f].add(m); skinPick[f] = m; }
    const mPick = new THREE.Mesh(new THREE.SphereGeometry(4.4, 12, 8), basic({ visible: false })); mPick.position.set(0.8, 0.8, 1.2); mPick.userData.pick = true; mPick.userData.noFrame = true; gF.add(mPick);
    // 拖动用活页本身的坐标（不缩放的 root）：kit 把提示收起来时放到 y = −9（米），在 cm 的组里会落在画面里
    const RU = (v, ax) => world.position[ax] + v * K, cm = (p) => p && new THREE.Vector3((p.x - world.position.x) / K, (p.y - world.position.y) / K, (p.z - world.position.z) / K);
    const skinDrag = (f) => ({ obj: skinPick[f], plane: f === 'R' ? 'xz' : 'yz', offset: f === 'R' ? RU(H / 2, 'y') : RU(W / 2, 'x'), hint: () => (!skinOK(f) ? '' : S.k[f] > 0.5 ? '按住，合上' : f === 'R' ? '按住，往外翻开' : '按住，往上翻开'), enabled: () => skinOK(f) && S.held !== 'ant', onStart: (p) => skinDown(f, cm(p)), onDrag: (p) => skinMove(f, cm(p)), onEnd: () => skinUp(f) });
    const drags = [
      { obj: antPick, plane: 'xz', offset: 0, hint: () => (antOK() ? '按住蚂蚁，在石凳上拖着走' : ''), enabled: () => antOK(), onStart: () => antDown(), onDrag: () => {}, onEnd: () => antUp() },
      skinDrag('R'), skinDrag('T'),
      { obj: mPick, plane: 'xy', offset: RU(OUT + LIFT, 'z'), hint: () => (threadOK() ? `从 M 拉一条线段到 ${S.name[openN()[0]] || 'N'}` : ''), enabled: () => threadOK(), onStart: (p) => threadDown(cm(p)), onDrag: (p) => threadMove(cm(p)), onEnd: () => threadUp() },
    ];
    const tipTag = tag?.('', 'pill'), hideTip = () => tipTag?.loc?.(root, 0, -9, 0);
    const dragApi = draggable(root, drags, { onClick: () => false, tip: tipTag });
    let heard = false, touchAt = -9;          // 最后一次动手的时间：卡住多久才给提示，按这个算（开场蚂蚁自己在转，不算）
    const pointer = { down: (r, e) => { if (!heard) { heard = true; audio(); } touchAt = now(); return dragApi.down(r, e); }, move: (r, e) => { if (S.held) touchAt = now(); if (S.held === 'ant') { antMove(r); return true; } return dragApi.move(r, e); }, up: (r, e) => dragApi.up(r, e), items: dragApi.items };
    function opening() { caption('蚂蚁从 M 爬到 N，最快要多久？', '公园里的长方体石凳；蚂蚁每秒爬 3 cm，只能在石凳的表面上爬'); prompt('替蚂蚁找一条路：按住蚂蚁，沿石凳表面拖到 N'); }
    const cue = mathActionCue(camera, pointer, dragApi, () => S.beat, () => {
      if (S.beat === 'try' && !S.arrived) return antPick;
      if (['line', 'line2'].includes(S.beat) && openN().length) return mPick;
      if (S.beat === 'unfold' || S.beat === 'other') {
        const face = ['R', 'T'].find(f => !S.opened[f]);
        if (face && !openN().length) return skinPick[face];
      }
      if (S.beat === 'fold') return skinOK('R') ? skinPick.R : skinPick.T;
    });
    function reset() { cue.reset(); runId++; S = fresh(); S.beatAt = now(); rows.length = 0; lastH = ''; if (boardEl) { boardEl.innerHTML = ''; boardEl.classList.remove('review'); }
      for (const L of lines) { L.draw = null; } ghost.R.set(null); ghost.T.set(null); for (const f of 'RT') { seg[f].set(null); seg[f].tint(GOLD); seg[f].fade(1); tri[f].set(null); sq[f].set(null); } thread.set(null); swing.set(null); arc.set(null); over.set(null);
      setLabel(LB.trial, '', '', null); setLabel(LB.clock, '', '', null); cap.key = ''; antAim.snap = true; hideTip(); frame(false); ui?.relock?.(); ui?.go?.(1); opening(); layout(); drawTrails(); }
    const onKey = (e) => { if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !e.target?.closest?.('input,textarea')) reset(); };
    addEventListener('keydown', onKey);

    layout();
    let last = now();
    return {
      group: root, card: false, place: 'spread', scale: 0.95,
      size: { w: (BOX.x1 - BOX.x0) * K, d: (BOX.v1 - BOX.v0) * K, h: (H + D + BASE) * K },
      view: { elev: 24, azim: 30, lookY: 0.3, frameMargin: 0.98 },
      pointer: cue.pointer,
      mount(u) { ui = u; boardEl = document.createElement('div'); boardEl.className = 'my-board' + (S.done ? ' review' : ''); u.controls?.append(boardEl);
        boardEl.addEventListener('click', (e) => { const r = e.target.closest?.('.mb-row'); if (!S.done || !r?.dataset.k) return; for (const o of rows) o.classList?.remove('sel', 'fresh'); r.classList.add('sel'); sfx.clink({ freq: 1200, gain: 0.03 }); pose(r.dataset.k); });
        for (const r of rows) { boardEl.append(r); r.classList.add('in'); }
        ui.go?.(1); if (!cap.key) opening(); else if (S.ask) ui.status?.(S.ask);
        const dir = () => (S.wide ? DIRO : DIRC); frameO.visible = !!S.wide; frameC.visible = !S.wide; requestAnimationFrame(() => aim?.(dir())); setTimeout(() => { if (!dead) aim?.(dir()); }, 700); },
      dispose() { cue.dispose(); dead = true; runId++; removeEventListener('keydown', onKey); css.remove(); },
      update() {
        const t = now(), dt = Math.min(0.05, t - last); last = t; uT.value = t;
        // 走回 M、最后沿最短的路爬到 N：按路程取蚂蚁的位置
        if (S.back) { const k = clamp((t - S.back.t0) / S.back.dur, 0, 1), L = runsLen(S.back.runs), q = at(S.back.runs, easeOut(k) * L); if (q) { S.ant = { f: q.f, u: q.u, v: q.v, hu: q.hu, hv: q.hv }; gait.moved = t; gait.p += dt * 26; } if (k >= 1) { S.back = null; S.ant = { f: 'F', u: 0, v: 0, hu: 0.6, hv: 0.8 }; S.arrived = true; } }
        if (S.run) { const k = clamp((t - S.run.t0) / S.run.dur, 0, 1), s = k * LEN.R, q = at(SEG.R, s); if (q) { S.ant = { f: q.f, u: q.u, v: q.v, hu: q.hu, hv: q.hv }; gait.moved = t; gait.p += dt * 30; setLabel(LB.clock, `t = ${fmt(s / V)} s`, '#ffe08a', P(q.f, q.u, q.v, 1.5).add(new THREE.Vector3(0, 5.6, 0)).toArray()); } if (k >= 1) { S.run = null; setLabel(LB.clock, `t = ${fmt(LEN.R / V)} s`, '#ffe08a', [W + 9.5, H - 4, -D + 3]); ranTo(); } }
        if (S.beat === 'try' && !S.cur && !S.held) { const u = 3.4 + 1.3 * Math.sin(t * 0.55), v = 2.8 + 1.1 * Math.sin(t * 0.8 + 1), du = 1.3 * 0.55 * Math.cos(t * 0.55), dv = 1.1 * 0.8 * Math.cos(t * 0.8 + 1), l = Math.hypot(du, dv) || 1; S.ant = { f: 'F', u, v, hu: du / l, hv: dv / l }; gait.moved = t; gait.p += dt * l * 1.5; }          // 开场：蚂蚁在 M 旁边转来转去，等人去拿
        // 蚂蚁：贴着面，走的时候迈步，停下来触角一点一点
        const a = S.ant; placeAnt(a.f, a.u, a.v, a.hu, a.hv);
        const kk = antAim.snap ? 1 : 1 - Math.exp(-dt * 22); ant.position.lerp(antAim.p, kk); ant.quaternion.slerp(antAim.q, kk); antAim.snap = false;
        const walking = t - gait.moved < 0.15; gait.amp += ((walking ? 1 : 0) - gait.amp) * Math.min(1, dt * 10);
        for (const l of legs) { const s = Math.sin((gait.p + l.ph) * Math.PI * 2); l.hip.rotation.y = 0.35 * s * gait.amp; l.hip.rotation.x = 0.12 * Math.max(0, Math.cos((gait.p + l.ph) * Math.PI * 2)) * gait.amp * (l.hip.position.z > 0 ? 1 : -1); }
        for (const n of antennae) { n.g.rotation.y = 0.18 * Math.sin(t * 3.1 + n.s * 1.3) * (1 - gait.amp * 0.6); n.g.rotation.z = 0.12 * Math.sin(t * 2.3 + n.s); }
        // 线段一笔画出来
        for (const L of lines) { const d = L.draw; if (!d || t < d.t0) continue; const k = clamp((t - d.t0) / d.dur, 0, 1), e = k * k * (3 - 2 * k); L.raw(d.runs ? (k >= 1 ? d.runs : cutRuns(d.runs, Math.max(0.002, e))) : null); if (k >= 1) { L.draw = null; L.runs = d.runs; } }
        // 线段从 M 一笔画到 N′（连上那一刻），弹回去的线
        if (S.spring) { const k = clamp((t - S.spring.t0) / 0.3, 0, 1), p = mul(S.spring.from, 1 - easeOut(k)); thread.set(k < 1 ? [{ f: 'F', pts: [[0, 0], p] }] : null); if (k >= 1) S.spring = null; }
        // 比较：长的那条绕 M 转过来，叠在短的上面，多出一截
        if (S.swingAt > 0) { const age = t - S.swingAt, k = clamp(age / 1.1, 0, 1), e = k * k * (3 - 2 * k), aT = Math.atan2(H + D, W), aR = Math.atan2(H, W + D), ang = lerp(aT, aR, e), L = LEN.T, fade = clamp(1 - (age - 4.4) / 0.6, 0, 1);
          swing.set([{ f: 'F', pts: [[0, 0], [L * Math.cos(ang), L * Math.sin(ang)]] }]); const ap = []; for (let n = 0; n <= 30; n++) { const b = lerp(aT, ang, n / 30); ap.push([L * Math.cos(b), L * Math.sin(b)]); } arc.set(k > 0.02 ? [{ f: 'F', pts: ap }] : null);
          over.set(k >= 1 ? [{ f: 'F', pts: [[W + D, H], mul([W + D, H], L / LEN.R)] }] : null); for (const m of [swing, arc, over]) m.fade(fade);
          if (fade <= 0) { S.swingAt = -9; for (const m of [swing, arc, over]) { m.set(null); m.fade(1); } } }
        // 翻开的面与正面连成一张淡蓝的展开图。
        for (const f of 'FRT') { const k = f === 'F' ? Math.max(S.k.R, S.k.T) : S.k[f], on = smooth(0, 0.15, k) * (f === 'F' ? 0.24 : 0.4);
          skin[f].material.opacity = S.closed ? 0 : on; grid[f].material.opacity = S.closed ? 0 : smooth(0.6, 1, k) * 0.28; edgeL[f].fade(S.closed ? 0 : smooth(0, 0.15, k)); }
        for (const f of 'RT') triFill[f].material.opacity = lerp(triFill[f].material.opacity, tri1(f) ? 0.24 : 0, Math.min(1, dt * 5));
        if (S.ghostOn) { const k = S.closed ? clamp(1 - (t - S.wowAt) / 1.4, 0, 1) : 1; for (const g of 'RT') ghost[g].fade(0.5 * k * (g === 'T' ? 0.7 : 1)); if (S.closed && k <= 0) { S.ghostOn = false; ghost.R.set(null); ghost.T.set(null); } }
        // 合上以后：最短的那条一直亮着，长的那条淡下去
        if (S.closed) { const k = clamp((t - S.wowAt) / 0.8, 0, 1); seg.T.tint(0xd2ad55); seg.T.fade(1 - 0.5 * k); seg.R.fade(1); }
        { const dim = S.closed ? 0.16 : S.conOrder.length >= 2 ? 0.3 : S.conOrder.length ? 0.6 : 1; trailPool[2].fade(lerp(trailPool[2].k, dim, Math.min(1, dt * 4))); for (let n = 0; n < 2; n++) trailPool[n].fade(Math.min(0.42, trailPool[2].k * 0.42)); }          // 两条线段出来以后，自己走的路淡下去
        // 迸光
        for (let n = flashes.length - 1; n >= 0; n--) { const f = flashes[n], k = (t - f.t0) / 0.6; if (k < 0) continue; if (k >= 1) { world.remove(f.sp); f.sp.material.dispose(); flashes.splice(n, 1); continue; } const e = 1 - (1 - k) ** 2; f.sp.scale.setScalar(f.size * (0.45 + 0.75 * e)); f.sp.material.opacity = 1 - k; }
        // 此刻那一句：淡进淡出
        if (cap.out < 1e9) { const k = clamp(1 - (t - cap.out) / 0.35, 0, 1); capMesh.material.opacity = k; if (k <= 0) { cap.out = 1e9; const nx = cap.next; cap.next = null; nx?.(); } } else capMesh.material.opacity = clamp((t - cap.born) / 0.5, 0, 1);
        // 卡住很久，才给提示（用问题）
        if (!S.held && !S.done && S.hint < 1 && t - S.beatAt > 15 && t - touchAt > 4) {
          const o = S.order[0] ? other(S.order[0]) : 'T';
          const H1 = { try: ['蚂蚁要怎么爬，才能到 N？', '按住它，沿着石凳的表面拖过去试试（N 是右后方顶上的那个角）'], unfold: ['要是石凳的表面能摊平呢？', '按住右侧面（或顶面）往外翻，翻到和正面在同一个平面上'], line: [`在平面上，M 到 ${S.name[S.order[0]]} 怎么走最短？`, '两点之间，线段最短'], line2: [`在平面上，M 到 ${S.name[o]} 怎么走最短？`, '两点之间，线段最短'], other: [`${FN[o]}也能翻开吗？`, '翻到和正面在同一个平面上，N 会落在哪儿？'], fold: ['这两条线段，回到石凳上是什么样？', '按住翻开的面，往回合'] }[S.beat];
          if (H1) { S.hint = 1; caption(...H1); } }
        cue.update();
      },
      debug: {
        get S() { return S; }, rows, pose, LEN,
        cap: () => S.cap,
        labels: () => allLabels,
        pxw: (x, y, z) => { const L = window.__lb; world.updateMatrixWorld(true); const q = world.localToWorld(new THREE.Vector3(x, y, z)).project(L.stage.camera); return [Math.round(((q.x + 1) / 2) * innerWidth), Math.round(((1 - q.y) / 2) * innerHeight)]; },
        px: (f, u, v, w = 0) => { const L = window.__lb, p = netP(f, u, v, w); world.updateMatrixWorld(true); const q = world.localToWorld(p).project(L.stage.camera); return [Math.round(((q.x + 1) / 2) * innerWidth), Math.round(((1 - q.y) / 2) * innerHeight)]; },
        qa: [
          { name: '替蚂蚁走一条路', run: () => { if (!antDown()) return; for (let n = 1; n <= 20; n++) antTo({ f: 'F', u: 1.5 * n, v: 1.3 * n }); for (let n = 1; n <= 20; n++) antTo({ f: 'T', u: W - 2 + n * 0.1, v: 1.5 * n }); antUp(); }, wait: 4.6, scale: 1 },
          { name: '翻开右侧面', run: () => { if (!skinDown('R', { x: W, y: H / 2, z: -D })) return; skinMove('R', { x: W + D, y: H / 2, z: 0 }); skinUp('R'); }, wait: 2.8, scale: 1 },
          { name: '从 M 拉线段到 N′', run: () => { if (!threadDown({ x: 2, y: 2 })) return; threadMove({ x: W + D - 0.5, y: H - 0.5 }); threadUp(); }, wait: 3.4, scale: 1 },
          { name: '翻开顶面', run: () => { if (!skinDown('T', { x: W / 2, y: H, z: -D })) return; skinMove('T', { x: W / 2, y: H + D, z: 0 }); skinUp('T'); }, wait: 2.6, scale: 1 },
          { name: '从 M 拉线段到 N″', run: () => { if (!threadDown({ x: 2, y: 2 })) return; threadMove({ x: W - 0.4, y: H + D - 0.4 }); threadUp(); }, wait: 6.8, scale: 1 },
          { name: '合上（重拍）', run: () => { if (!skinDown('R', { x: W + D, y: H / 2, z: 0 })) return; skinMove('R', { x: W, y: H / 2, z: -D }); skinUp('R'); }, wait: 8, scale: 1 },
        ],
      },
    };
  },
};
