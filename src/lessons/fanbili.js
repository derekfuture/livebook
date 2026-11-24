// 数学 九年级上册 27.2 反比例函数的图象和性质（课本 PDF 第 73–77 页，图 27.2-1、27.2-2、27.2-3）。
// 情境用本章 27.3 的例 2：撬棍撬石头（阻力 1200 N，阻力臂 0.5 m）；落点是本章数学活动“用矩形‘画’双曲线”。
//
// 山坡上的一层梯田，石坎边上，一根方木撬棍搭在楔形的石支点上，左边压着一块大石头。坐标平面就是撬棍前面的那个竖直面：
// 撬棍是横轴（动力臂 l），支点是原点 O，竖直方向是力 F（往下压记作正，往上抬记作负）。
// 学生拖的是金色的那支力：握到哪儿，它就长成在那儿刚好撬动石头要的那么大。
//   开头的问题（例 2）：动力臂为 1.5 m 时，至少要多大的力？想让力不超过它的一半，动力臂至少要加长多少？
//   松手：力和动力臂围成一个矩形，和石头那边（0.5 × 1200）一样大，都是 6 格 = 600（重拍 1：阻力 × 阻力臂 = 动力 × 动力臂）；
//   换三个地方都是 600 → 一下子：面积都是 600 的矩形一个接一个亮出来，对角的顶点连成一条曲线（重拍 2：用矩形“画”出双曲线的一支）；
//   越靠近支点越费力，握到支点另一边：得往上抬，F 是负的，点落到第三象限；压在支点上多大的力都不行（重拍 3：x ≠ 0，两支，双曲线）；
//   从左往右拖过支点：每一支上 y 都在减小，跨过 y 轴却往上一跳（重拍 4：在每一个象限内）；
//   挪石头就是改 k：k 变大，曲线往外走；石头挪到支点另一边，k < 0，两支翻到第二、第四象限，y 随 x 的增大而增大（重拍 5）；
//   回到撬石头：拖到 F = 200 N，l = 3 m → 答：动力臂至少加长 1.5 m。
import * as THREE from 'three';
import { clamp, lerp, easeOut } from './kit/sheet.js';
import { mathActionCue } from './kit/mathActionCue.js';
import { draggable } from './kit/interact.js';
import { sfx, audio } from './kit/audio.js';
import { rockMat, worldUV } from './kit/strata.js';

const SC = 0.05;                                  // 1 个单位 = 杠杆上的 1 m（竖直方向 1 个单位 = 400 N）
const NPU = 400;                                  // 竖直方向：一个单位长 = 400 N（一格 0.5 m × 200 N 是正方形）
const XR = 3.5, FT = 1400, FB = -800;             // 坐标平面：l 从 −3.5 到 3.5 m，F 从 −800 到 1400 N
const W0 = 1200, A0 = 0.5, K0 = W0 * A0;          // 阻力 1200 N、阻力臂 0.5 m，k = 600
const PIV = 0.3, PT = 0.18, PD = 0.46;            // 支点高、撬棍（方木）的高、往里的厚
const YB = 0.72 - FB / NPU;                       // 横轴的高：撬棍前面的中线（坐标平面最下面一格的下边离书面 0.72，下面刻“此刻那一句”）
const GROUND = YB - PT / 2 - PIV;                 // 采石场台面的高
const ZP = 0.03;                                  // 数学那一层：撬棍前面一点
const Y = (F) => YB + F / NPU;
const P = (x, F) => [x, Y(F)];
const UE = 4.3, UC = 3.6;                          // 这块地左右的半宽；石坎在 ±UC 以内笔直（坐标平面后面），再往外顺着山势往里弯
const FANX = [0.5, 0.6, 0.75, 1, 1.2, 1.5, 2, 2.4, 3, 3.5];   // 一下子亮出来的十个矩形（面积都是 600）
const GOLD = 0xffc83d, BLUE = 0x58c4dd, TEAL = 0x5cd0b3, RED = 0xfc6255, WHITE = 0xffffff;
const CSS = { g: '#ffc83d', b: '#58c4dd', t: '#5cd0b3', r: '#fc6255', w: '#ffffff', w2: 'rgba(255,255,255,0.86)' };
const FR = (n, d) => `<span class="mfr"><span>${n}</span><span>${d}</span></span>`;          // 竖着写的分数：板书、面板里用
const q1 = (v) => Math.round(v * 10) / 10;
const numS = (v) => { const r = Math.round(v * 100) / 100; return String(r).replace('-', '−'); };
const forceS = (F) => { const r = Math.round(F); return (Math.abs(F - r) < 0.02 ? '' : '≈ ') + String(r).replace('-', '−'); };

export default {
  id: 'fanbili',
  fig: '图27.2-1',
  title: '反比例函数的图象和性质',
  flow: 'explore',
  ask: '某工人欲用撬棍撬动一块大石头，已知阻力和阻力臂分别为 1200 N 和 0.5 m。<br>动力臂为 1.5 m 时，撬动石头至少需要多大的力？若想使动力不超过这个力的一半，动力臂至少要加长多少？',
  need: '拖着金色的力沿撬棍挪一挪，看要多大的力。',
  conclusion: {
    page: 74, rect: [40, 232, 320, 386],
    crops: [{ page: 74, rect: [40, 232, 320, 386] }, { page: 75, rect: [64, 440, 478, 602] }, { page: 89, rect: [56, 96, 478, 270] }, { page: 81, rect: [64, 180, 484, 680] }, { page: 82, rect: [40, 44, 317, 115] }],
    quote: '反比例函数 y = k/x 的图象特征和性质如下：（1）反比例函数的图象由两条曲线组成，它是双曲线．（2）当 k＞0 时，双曲线的两支分别位于第一、第三象限，在每一个象限内，y 随 x 的增大而减小；当 k＜0 时，双曲线的两支分别位于第二、第四象限，在每一个象限内，y 随 x 的增大而增大．',
    why: '杠杆平衡时，阻力 × 阻力臂 = 动力 × 动力臂：<i>Fl</i> = 1200 × 0.5 = 600，<i>F</i> = ' + FR('600', '<i>l</i>') + '。这里的动力臂是长度，动力是力的大小，都取正数。一格横跨 0.5 m，纵跨 200 N，代表 100 N·m。六格代表的力矩大小是 600 N·m。一般地，<i>y</i> = ' + FR('<i>k</i>', '<i>x</i>') + ' 的图象上任意一点和两条坐标轴围成的矩形，面积都是 |<i>k</i>|，积 <i>xy</i> 始终是 <i>k</i>。<br><br>用带方向的坐标时，<i>x</i> 表示手的位置，支点右边为正；<i>y</i> 表示手上的力，往下压为正。石头的位置也以右为正，平衡时 <i>xy</i> = <i>k</i> = −1200 × 石头的位置。手握在支点上无法平衡，所以 <i>x</i> ≠ 0。<i>k</i> &gt; 0 时 <i>x</i>、<i>y</i> 同号，两支在第一、第三象限；<i>k</i> &lt; 0 时异号，两支在第二、第四象限（石头挪到支点另一边）。在每一个象限内才能说 <i>y</i> 随 <i>x</i> 怎样变：跨过 <i>y</i> 轴，<i>y</i> 会一下子变号。<br><br>撬石头：<i>l</i> = 1.5 m 时，<i>F</i> = ' + FR('600', '1.5') + ' = 400 N；当 <i>l</i> &gt; 0 时，<i>F</i> 随 <i>l</i> 的增大而减小，<i>F</i> = 200 N 时 <i>l</i> = 3 m，所以动力臂至少要加长 3 − 1.5 = 1.5 m。',
    src: '课本 · 27.2 反比例函数的图象和性质（第 67–71 页）；撬石头的问题在第 75 页，用矩形“画”双曲线在第 83 页',
  },

  create({ aim, tag, camera }) {
    const textbookQuote = this.conclusion.quote;
    const root = new THREE.Group(), world = new THREE.Group(); root.add(world); world.scale.setScalar(SC);
    let ui = null, dead = false;
    const T0 = performance.now(), now = () => (performance.now() - T0) / 1000;
    const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    const basic = (o) => new THREE.MeshBasicMaterial(o);
    const lit = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o });
    const quiet = (m) => { m.raycast = () => {}; m.userData.noFrame = true; return m; };
    const solid = (m) => { m.castShadow = true; m.receiveShadow = true; m.raycast = () => {}; m.userData.noFrame = true; return m; };
    const rnd = (() => { let s = 11; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();          // 每次打开一样

    // ================= 山坡上的一层梯田：前面是干砌的石坎，田后面的坡长着草和灌木，一直往上 =================
    const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    const vtOf = (u) => 1.0 + 0.2 * Math.sin(u * 0.9 + 0.5) + 0.08 * Math.sin(u * 2.3 + 1.1);          // 田往里多深（坡脚）
    const vbOf = (u) => 3.05 + 0.28 * Math.sin(u * 0.7 + 1.3) + 0.14 * Math.sin(u * 1.9 + 0.2);          // 整块地的后沿
    const RISE = (u) => 1.25 + 0.32 * Math.sin(u * 0.8 + 0.4) + 0.18 * Math.sin(u * 1.7 + 2.0);          // 坡顶比田高多少
    const bump = (u, v) => 0.04 * Math.sin(u * 3.1 + v * 2.2) + 0.03 * Math.sin(u * 5.3 - v * 4.1) + 0.015 * Math.sin(u * 11 + v * 9);
    const hAt = (u, v) => { const vt = vtOf(u), vb = vbOf(u); if (v <= vt) return GROUND + bump(u, v) * smooth(0.75, vt, v) * 0.6; const k = clamp((v - vt) / (vb - vt), 0, 1); return GROUND + RISE(u) * Math.pow(smooth(0, 1, k), 0.85) + bump(u, v) * (0.5 + k); };
    const vF = (u) => { const k = Math.max(0, Math.abs(u) - UC) / (UE - UC); return 0.62 * k * k; };          // 石坎前沿：两头往里弯
    const vOf = (u, w) => (w <= 0.28 ? lerp(vF(u), vtOf(u), w / 0.28) : lerp(vtOf(u), vbOf(u), (w - 0.28) / 0.72));
    const groundTex = tex(1024, 1024, (g, w, h) => { g.fillStyle = '#cfc6b4'; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 90; k++) { const x = rnd() * w, y = rnd() * h, r = 40 + rnd() * 140, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rnd() < 0.5 ? 'rgba(240,232,214,0.3)' : 'rgba(120,108,86,0.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
      for (let k = 0; k < 14000; k++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '70,60,44' : '250,244,230'},${rnd() * 0.16})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3); } });
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
    { const NU = 150, NV = 50, pos = [], col = [], idx = [], c = new THREE.Color();
      for (let i = 0; i <= NU; i++) { const u = lerp(-UE, UE, i / NU);
        for (let j = 0; j <= NV; j++) { const v = vOf(u, j / NV), y = hAt(u, v); pos.push(u, y, -v);
          const sl = smooth(vtOf(u) - 0.1, vtOf(u) + 0.25, v), n1 = Math.sin(u * 2.1 + v * 1.3) * 0.5 + Math.sin(u * 0.7 - v * 2.9) * 0.5;          // 田是黄土，坡上是草
          c.setRGB(lerp(0.9, 0.36 + 0.03 * n1, sl), lerp(0.8, 0.5 + 0.035 * n1, sl), lerp(0.62, 0.27, sl)); col.push(c.r, c.g, c.b); } }
      for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b = a + NV + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); worldUV(g, 1.6);
      const m = new THREE.Mesh(g, lit({ map: groundTex, vertexColors: true, roughness: 0.96 })); m.receiveShadow = true; m.raycast = () => {}; m.userData.qaSupport = true; world.add(m); }
    // 两侧、后面：切开的土（剖面）
    const soilTex = tex(256, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5a4630'); gr.addColorStop(0.08, '#6e5539'); gr.addColorStop(0.2, '#9c7c55'); gr.addColorStop(1, '#8a6c49'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '70,54,36' : '196,178,150'},${0.2 + rnd() * 0.3})`; g.beginPath(); g.arc(rnd() * w, h * 0.12 + rnd() * h * 0.88, 0.8 + rnd() * 2.2, 0, 6.3); g.fill(); } });
    { const pos = [], uv = [], idx = [], H = GROUND + 1.9;
      const wall = (pts) => { const k0 = pos.length / 3; pts.forEach(([u, v], i) => { const y = hAt(u, v); pos.push(u, 0, -v, u, y, -v); uv.push(i / 8, 1 - y / H, i / 8, 0); if (i) { const k = k0 + i * 2; idx.push(k - 2, k - 1, k, k, k - 1, k + 1); } }); };
      wall(Array.from({ length: 31 }, (_, i) => [UE, vOf(UE, i / 30)]));
      wall(Array.from({ length: 31 }, (_, i) => [-UE, vOf(-UE, 1 - i / 30)]));
      wall(Array.from({ length: 151 }, (_, i) => { const u = lerp(UE, -UE, i / 150); return [u, vbOf(u)]; }));
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, lit({ map: soilTex, roughness: 0.96, side: THREE.DoubleSide })); m.receiveShadow = true; m.raycast = () => {}; m.userData.qaSupport = true; world.add(m); }
    // 前面的石坎：一块块石头干砌起来，一层一层；最下面一道刻着“此刻那一句”
    const faceTex = tex(640, 180, (g, w, h) => {          // 毛石：大大小小的石块挤在一起（按最近的种子分块），缝是暗的，每块石头上沿亮、下沿暗
      const pts = [], cell = 23, cols = Math.ceil(w / cell) + 2, rowsN = Math.ceil(h / cell) + 2, bucket = new Map();
      for (let i = 0; i < 300; i++) { const p = [rnd() * w, rnd() * h, 0.8 + rnd() * 0.5, 0.86 + rnd() * 0.28, rnd()]; pts.push(p); const kx = Math.floor(p[0] / cell), ky = Math.floor(p[1] / cell); const key = kx + ',' + ky; if (!bucket.has(key)) bucket.set(key, []); bucket.get(key).push(p); }
      const img = g.createImageData(w, h), d = img.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let d1 = 1e9, d2 = 1e9, best = null; const kx = Math.floor(x / cell), ky = Math.floor(y / cell);
        for (let ix = kx - 2; ix <= kx + 2; ix++) for (let iy = ky - 2; iy <= ky + 2; iy++) { const b2 = bucket.get(((ix % cols) + cols) % cols + ',' + iy); if (!b2) continue; for (const p of b2) { let dx = x - p[0]; if (dx > w / 2) dx -= w; if (dx < -w / 2) dx += w; const dy = (y - p[1]) * 1.55, dd = (dx * dx + dy * dy) * p[2]; if (dd < d1) { d2 = d1; d1 = dd; best = p; } else if (dd < d2) d2 = dd; } }
        const edge = 2 * (Math.sqrt(d2) - Math.sqrt(d1)), k = (y * w + x) * 4;
        if (edge < 2.2) { const v = 84 + edge * 8; d[k] = v; d[k + 1] = v - 6; d[k + 2] = v - 14; d[k + 3] = 255; continue; }          // 石缝
        const bev = Math.min(1, (edge - 2.2) / 9), tone = 172 * best[3] + 18 * Math.sin(x * 0.21 + y * 0.17) * 0.3, warm = best[4] * 18, n = (Math.sin(x * 1.7 + y * 2.3) + Math.sin(x * 0.9 - y * 1.3)) * 3;
        const v = tone * (0.8 + 0.2 * bev) + n; d[k] = v + warm; d[k + 1] = v + warm * 0.45 - 4; d[k + 2] = v - 16; d[k + 3] = 255; }
      g.putImageData(img, 0, 0);
      g.scale(0.5, 0.5); w *= 2; h *= 2;
      for (let k = 0; k < 160; k++) { const x = rnd() * w, y = rnd() * h * 0.55; g.fillStyle = `rgba(${92 + rnd() * 30},${114 + rnd() * 30},${56 + rnd() * 20},${0.18 + rnd() * 0.2})`; g.beginPath(); g.ellipse(x, y, 4 + rnd() * 10, 2 + rnd() * 4, 0, 0, 6.3); g.fill(); }          // 一点青苔
      for (let k = 0; k < 5000; k++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '50,44,34' : '240,234,220'},${rnd() * 0.14})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); }
      const sh = g.createLinearGradient(0, 0, 0, h); sh.addColorStop(0, 'rgba(255,250,236,0.1)'); sh.addColorStop(0.12, 'rgba(0,0,0,0)'); sh.addColorStop(0.8, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(40,32,22,0.32)'); g.fillStyle = sh; g.fillRect(0, 0, w, h); });
    { const NU = 120, pos = [], uv = [], idx = []; let acc = 0;
      for (let i = 0; i <= NU; i++) { const u = lerp(-UE, UE, i / NU), v = vF(u); if (i) { const u0 = lerp(-UE, UE, (i - 1) / NU); acc += Math.hypot(u - u0, v - vF(u0)); } pos.push(u, 0, -v, u, GROUND, -v); uv.push(acc, 0, acc, 1); if (i) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); } }
      for (let i = 0; i < uv.length; i += 2) uv[i] /= acc;
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, lit({ map: faceTex, roughness: 0.92 })); m.receiveShadow = true; m.raycast = () => {}; m.userData.qaSupport = true; world.add(m); }
    // 草：坡上一片被风吹着的细草，田边也长一点；坡上几丛灌木；田里散着碎石子
    const uT = { value: 0 };
    const sway = (mat, H0) => { mat.customProgramCacheKey = () => 'fb-sway' + H0; mat.onBeforeCompile = (sh) => { sh.uniforms.uT = uT; sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n  float bk = position.y / ${H0.toFixed(3)};\n  vec4 ip = instanceMatrix[3];\n  transformed.x += sin(uT * 1.6 + ip.x * 2.6 + ip.z * 1.8) * 0.03 * bk * bk;\n  transformed.z += cos(uT * 1.2 + ip.x * 1.9) * 0.012 * bk * bk;`); }; return mat; };
    { const N = 6000, geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.012, 0, 0, 0.012, 0, 0, 0.004, 0.16, 0], 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
      const blades = new THREE.InstancedMesh(geo, sway(lit({ color: 0xffffff, roughness: 1, side: THREE.DoubleSide }), 0.16), N), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
      let k = 0; for (let tries = 0; k < N && tries < 80000; tries++) { const u = (rnd() - 0.5) * 2 * (UE - 0.05), edgeGrass = rnd() < 0.08, v = edgeGrass ? vF(u) + 0.03 + rnd() * 0.12 : 0.05 + rnd() * 3.4, vt = vtOf(u); if (v > vbOf(u) - 0.04 || v < vF(u) + 0.02) continue;
        if (edgeGrass) { if (Math.abs(u) < 0.8 || Math.sin(u * 2.7) + Math.sin(u * 1.1 + 1) < 0.4) continue; e.set((rnd() - 0.5) * 0.4 - 0.5, rnd() * 6.3, (rnd() - 0.5) * 0.4); q.setFromEuler(e); m4.compose(new THREE.Vector3(u, GROUND - 0.01, -v), q, new THREE.Vector3(1, 0.5 + rnd() * 0.5, 1)); blades.setMatrixAt(k, m4); col.setHSL(0.2 + rnd() * 0.06, 0.3, 0.32 + rnd() * 0.1); blades.setColorAt(k, col); k++; continue; }          // 石坎顶上垂下来的几丛
        const onSlope = v > vt - 0.05, patch = Math.sin(u * 1.7 + v * 2.3) + Math.sin(u * 0.6 - v * 1.4);
        if (!onSlope && (v < 0.72 || patch < 0.6 || rnd() < 0.5)) continue;          // 田里：只有靠坡脚的地方长一点
        if (onSlope && Math.abs(u) < 3.4 && rnd() < 0.45) continue;          // 坐标平面后面的坡稀一点，线才看得清
        e.set((rnd() - 0.5) * 0.5, rnd() * 6.3, (rnd() - 0.5) * 0.5); q.setFromEuler(e); const s = (onSlope ? 0.7 : 0.45) + rnd() * 0.6;
        m4.compose(new THREE.Vector3(u, hAt(u, v) - 0.01, -v), q, new THREE.Vector3(1, s, 1)); blades.setMatrixAt(k, m4); col.setHSL(0.2 + rnd() * 0.07, 0.32 + rnd() * 0.14, 0.3 + rnd() * 0.12); blades.setColorAt(k, col); k++; }
      blades.count = k; blades.raycast = () => {}; blades.userData.noFrame = true; world.add(blades);
      const leafTex = tex(256, 256, (g, w, h) => { g.fillStyle = '#3d5a34'; g.fillRect(0, 0, w, h); for (let n = 0; n < 2400; n++) { const x = rnd() * w, y = rnd() * h, r = 1.5 + rnd() * 4, cc = rnd(); g.fillStyle = cc < 0.45 ? 'rgba(26,48,28,0.55)' : cc < 0.86 ? 'rgba(84,118,62,0.5)' : 'rgba(150,176,104,0.45)'; g.beginPath(); g.ellipse(x, y, r, r * 0.62, rnd() * 3.14, 0, 6.3); g.fill(); } });
      const bushGeo = new THREE.IcosahedronGeometry(1, 2); { const p = bushGeo.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); v.multiplyScalar(1 + 0.12 * Math.sin(v.x * 5 + v.y * 3) + 0.08 * Math.sin(v.z * 7)); if (v.y < -0.3) v.y = -0.3; p.setXYZ(i, v.x, v.y, v.z); } bushGeo.computeVertexNormals(); }
      const B = 12, bushes = new THREE.InstancedMesh(bushGeo, lit({ map: leafTex, roughness: 0.95 }), B); let nb = 0;
      for (let tries = 0; nb < B && tries < 3000; tries++) { const u = (rnd() < 0.5 ? -1 : 1) * (3.55 + rnd() * 0.5), v = vtOf(u) + 0.3 + rnd() * (vbOf(u) - vtOf(u) - 0.5); const r = 0.16 + rnd() * 0.2; e.set(0, rnd() * 6.3, 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(u, hAt(u, v) + r * 0.2, -v), q, new THREE.Vector3(r * 1.3, r, r * 1.1)); bushes.setMatrixAt(nb, m4); col.setHSL(0.24 + rnd() * 0.06, 0.25, 0.75 + rnd() * 0.25); bushes.setColorAt(nb, col); nb++; }
      bushes.count = nb; bushes.castShadow = true; bushes.receiveShadow = true; bushes.raycast = () => {}; bushes.userData.noFrame = true; world.add(bushes);
      const G = 140, pebbles = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), lit({ color: 0xd6cfbf, roughness: 0.9, flatShading: true }), G); let n = 0;
      for (let tries = 0; n < G && tries < 6000; tries++) { const u = (rnd() - 0.5) * 2 * (UE - 0.2), v = 0.7 + rnd() * 2.4; if (v > vbOf(u) - 0.1 || (v > vtOf(u) + 0.2 && Math.abs(u) < 3.3)) continue; const r = 0.025 + rnd() * rnd() * (v > vtOf(u) ? 0.16 : 0.08); e.set(rnd() * 3, rnd() * 3, rnd() * 3); q.setFromEuler(e); m4.compose(new THREE.Vector3(u, hAt(u, v) + r * 0.3, -v), q, new THREE.Vector3(r * 1.3, r * 0.7, r)); pebbles.setMatrixAt(n, m4); col.setHSL(0.1, 0.07, 0.6 + rnd() * 0.2); pebbles.setColorAt(n, col); n++; }
      pebbles.count = n; pebbles.castShadow = true; pebbles.receiveShadow = true; pebbles.raycast = () => {}; pebbles.userData.noFrame = true; world.add(pebbles); }

    // ================= 杠杆：楔形的石支点、一根方木撬棍、撬棍上一块大石头 =================
    const woodTex = tex(2048, 256, (g, w, h) => { g.fillStyle = '#9a7449'; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 120; k++) { const y = rnd() * h, a = 0.05 + rnd() * 0.12; g.strokeStyle = rnd() < 0.5 ? `rgba(70,46,24,${a})` : `rgba(196,160,112,${a})`; g.lineWidth = 1 + rnd() * 3; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.004 + k) * 6 + Math.sin(x * 0.019 + k * 2) * 1.5); g.stroke(); }
      for (let k = 0; k < 7; k++) { const x = rnd() * w, y = rnd() * h; g.strokeStyle = 'rgba(70,44,22,0.35)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, 18 + rnd() * 10, 6 + rnd() * 3, 0, 0, 6.3); g.stroke(); }
      for (let k = 0; k < 3000; k++) { g.fillStyle = `rgba(60,40,20,${rnd() * 0.06})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 8, 1); } });
    woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
    const wood = lit({ map: woodTex, roughness: 0.78 });
    const plank = solid(new THREE.Mesh(new THREE.BoxGeometry(2 * XR + 0.3, PT, PD), wood)); plank.position.set(0, YB, -PD / 2); world.add(plank);
    { const sh = new THREE.Shape([new THREE.Vector2(-0.3, 0), new THREE.Vector2(0.3, 0), new THREE.Vector2(0.02, PIV), new THREE.Vector2(-0.02, PIV)]);
      const g = new THREE.ExtrudeGeometry(sh, { depth: PD - 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 2 }); g.translate(0, 0, -(PD - 0.02)); worldUV(g, 0.9);
      const wedge = solid(new THREE.Mesh(g, rockMat('granite', { tint: 0x9a948c }))); wedge.position.set(0, GROUND, 0); world.add(wedge); }
    // 石头：一块扁一点的花岗岩，底下压平，坐在撬棍上（整块在数学那一层后面）
    const rock = new THREE.Group(); world.add(rock);
    { const g = new THREE.IcosahedronGeometry(1, 4), p = g.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = 1 + 0.09 * Math.sin(v.x * 3.1 + v.y * 2.3) + 0.06 * Math.sin(v.z * 5.2 - v.x * 2.7) + 0.035 * Math.sin(v.y * 9 + v.z * 7); v.multiplyScalar(n); if (v.y < -0.72) v.y = -0.72 + (v.y + 0.72) * 0.08; p.setXYZ(i, v.x, v.y, v.z); }
      g.computeVertexNormals(); g.scale(0.46, 0.34, 0.2); worldUV(g, 0.5);
      const m = solid(new THREE.Mesh(g, rockMat('granite', { tint: 0xe0d6cc }))); m.position.y = 0.72 * 0.34; rock.add(m); }
    const rockPick = new THREE.Mesh(new THREE.SphereGeometry(0.48, 14, 10), basic({ visible: false })); rockPick.position.y = 0.26; rockPick.scale.set(1, 0.72, 0.48); rockPick.userData.pick = true; rockPick.userData.noFrame = true; rock.add(rockPick);
    // 取景：看不见的盒子框住整个模型和上面写字的地方
    { const pr = new THREE.Mesh(new THREE.BoxGeometry(2 * UE, Y(FT) + 0.55, 3.4), basic({ transparent: true, opacity: 0, depthWrite: false })); pr.position.set(0, (Y(FT) + 0.55) / 2, -1.6); pr.raycast = () => {}; world.add(pr); }

    // ================= 数学：线是亮的芯、一圈加色的光晕、底下一层淡影（3Blue1Brown 的笔画） =================
    const prof = (stops) => { const t = tex(64, 4, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); for (const [o, a] of stops) gr.addColorStop(o, `rgba(255,255,255,${a})`); g.fillStyle = gr; g.fillRect(0, 0, w, h); }); t.colorSpace = THREE.NoColorSpace; return t; };
    const crispTex = prof([[0, 0], [0.16, 0.55], [0.3, 1], [0.7, 1], [0.84, 0.55], [1, 0]]);
    const glowTex = prof([[0, 0], [0.15, 0.06], [0.3, 0.22], [0.42, 0.62], [0.5, 1], [0.58, 0.62], [0.7, 0.22], [0.85, 0.06], [1, 0]]);
    const strip = (pts, hw, dash = 0) => { const pos = [], uv = []; let acc = 0;
      const push = (a, b, n) => { pos.push(a[0] + n[0], a[1] + n[1], 0, a[0] - n[0], a[1] - n[1], 0, b[0] + n[0], b[1] + n[1], 0, b[0] + n[0], b[1] + n[1], 0, a[0] - n[0], a[1] - n[1], 0, b[0] - n[0], b[1] - n[1], 0); uv.push(0, 0.5, 1, 0.5, 0, 0.5, 0, 0.5, 1, 0.5, 1, 0.5); };
      for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); if (l < 1e-9) continue; const n = [(-dy / l) * hw, (dx / l) * hw];
        const ea = dash ? a : [a[0] - (dx / l) * hw * 0.8, a[1] - (dy / l) * hw * 0.8], eb = dash ? b : [b[0] + (dx / l) * hw * 0.8, b[1] + (dy / l) * hw * 0.8];          // 两头伸出一点，折角接得上
        if (!dash) push(ea, eb, n); else { let t = 0; while (t < l - 1e-9) { const ph = (acc + t) % (dash * 2), on = ph < dash, st = Math.max(1e-7, Math.min(l - t, on ? dash - ph : dash * 2 - ph)); if (on) push([a[0] + (dx * t) / l, a[1] + (dy * t) / l], [a[0] + (dx * (t + st)) / l, a[1] + (dy * (t + st)) / l], n); t += st; } acc += l; } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return g; };
    const lines = [];
    const gline = (color, w, { glow = 0.55, shadow = 0.28, dash = 0, z = ZP, order = 10, op = 1 } = {}) => {
      const mk = (map, col, o, blend, ord, zz) => { const m = quiet(new THREE.Mesh(new THREE.BufferGeometry(), basic({ color: col, map, transparent: true, opacity: o, depthWrite: false, blending: blend, side: THREE.DoubleSide }))); m.position.z = zz; m.renderOrder = ord; m.visible = false; world.add(m); return m; };
      const L = { core: mk(crispTex, color, op, THREE.NormalBlending, order + 2, z + 0.002), glow: glow ? mk(glowTex, color, glow, THREE.AdditiveBlending, order + 1, z + 0.001) : null, shade: shadow ? mk(glowTex, 0x000000, shadow, THREE.NormalBlending, order, z - 0.002) : null, pts: null, anim: null, op, glowOp: glow, shadeOp: shadow, k: 1 };
      L._draw = (pts) => { for (const [m, kw, d] of [[L.core, 1, dash], [L.glow, 4.5, 0], [L.shade, 2.6, 0]]) { if (!m) continue; if (!pts || pts.length < 2) { m.visible = false; continue; } m.geometry.dispose(); m.geometry = strip(pts, (w * kw) / 2, d); m.visible = true; } };
      L.set = (pts) => { L.pts = pts; if (L.anim) return; L._draw(pts); };
      L.hide = () => { L.pts = null; L.anim = null; L._draw(null); };
      L.draw = (pts, dur = 0.7, delay = 0) => { L.pts = pts; L.anim = { t0: now() + delay, dur }; L._draw(null); };          // 一笔画出来
      L.fade = (k) => { L.k = k; L.core.material.opacity = L.op * k; if (L.glow) L.glow.material.opacity = L.glowOp * k; if (L.shade) L.shade.material.opacity = L.shadeOp * k; };
      L.color = (c) => { L.core.material.color.set(c); if (L.glow) L.glow.material.color.set(c); };
      L.dispose = () => { for (const m of [L.core, L.glow, L.shade]) if (m) { world.remove(m); m.geometry.dispose(); m.material.dispose(); } const i = lines.indexOf(L); if (i >= 0) lines.splice(i, 1); };
      lines.push(L); return L; };
    const partial = (pts, k) => { if (k >= 1) return pts; let tot = 0; for (let i = 1; i < pts.length; i++) tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); let want = tot * k; const out = [pts[0]]; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (want >= l) { out.push(pts[i]); want -= l; } else { const t = l ? want / l : 0; out.push([lerp(pts[i - 1][0], pts[i][0], t), lerp(pts[i - 1][1], pts[i][1], t)]); break; } } return out; };
    // 箭头：一段笔画 + 三角形箭头（力的箭头头朝撬棍）
    const headGeo = new THREE.BufferGeometry(); headGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -1, 0.55, 0, -1, -0.55, 0], 3));
    const arrow = (color, w) => { const L = gline(color, w, { glow: 0.5, shadow: 0.3, order: 14 }); const hd = quiet(new THREE.Mesh(headGeo, basic({ color, transparent: true, depthWrite: false, side: THREE.DoubleSide }))); hd.renderOrder = 17; hd.visible = false; world.add(hd);
      const hs = quiet(new THREE.Mesh(headGeo, basic({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }))); hs.renderOrder = 13; hs.visible = false; world.add(hs);
      L.to = (a, b, hl = 0.2) => { const d = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d < 0.05) { L.hide(); hd.visible = hs.visible = false; return; } const u = [(b[0] - a[0]) / d, (b[1] - a[1]) / d], h = Math.min(hl, d * 0.5); L.set([a, [b[0] - u[0] * h * 0.7, b[1] - u[1] * h * 0.7]]);
        for (const [m, k, z] of [[hd, 1, ZP + 0.004], [hs, 1.35, ZP - 0.003]]) { m.position.set(b[0] + u[0] * h * 0.1 * (k - 1), b[1] + u[1] * h * 0.1 * (k - 1), z); m.rotation.z = Math.atan2(u[1], u[0]); m.scale.setScalar(h * k); m.visible = true; } };
      L.off = () => { L.hide(); hd.visible = hs.visible = false; }; L.headFade = (k) => { hd.material.opacity = k; hs.material.opacity = 0.3 * k; }; return L; };
    // 面：半透明的矩形（面积）
    const unitQuad = new THREE.PlaneGeometry(1, 1).translate(0.5, 0.5, 0);
    // cells：里面描出一格一格（一格 0.5 m × 200 N），数得出是 6 格
    const cellTex = tex(64, 64, (g, w, h) => { g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,1)'; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h); g.fillRect(0, h - 3, w, 3); g.fillRect(w - 3, 0, 3, h); }); cellTex.colorSpace = THREE.NoColorSpace;
    const fill = (color, op = 0.2, cells = false) => { const map = cells ? cellTex.clone() : null; if (map) { map.wrapS = map.wrapT = THREE.RepeatWrapping; map.needsUpdate = true; }
      const m = quiet(new THREE.Mesh(unitQuad, basic({ color, map, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide }))); m.renderOrder = 8; m.visible = false; m.position.z = ZP - 0.006; m.userData.op = op; world.add(m);
      m.rect = (a, b) => { if (!a) { m.visible = false; return; } const sx = b[0] - a[0] || 1e-4, sy = b[1] - a[1] || 1e-4; m.position.x = a[0]; m.position.y = a[1]; m.scale.set(sx, sy, 1); if (map) map.repeat.set(Math.abs(sx) / 0.5, Math.abs(sy) / 0.5); m.visible = true; }; return m; };
    const rectPts = (a, b) => [[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]], [a[0], a[1]]];

    // 字：斜体衬线（像课本），白字或概念的颜色，底下垫一圈暗光；{n/d} 写成上下两行的分数
    const measure = (font, txt) => { const g = document.createElement('canvas').getContext('2d'); g.font = font; return g.measureText(txt).width; };
    const FONT = (px, it) => `${it ? 'italic ' : ''}500 ${px}px "Times New Roman","Songti SC",serif`;
    const isVar = (s) => /^[a-zA-Z]+$/.test(s);
    const FRX = /^\{([^/{}]+)\/([^/{}]+)\}$/;
    // segs = [[文字, 颜色, 斜体?, 分母颜色?], ...]
    const richTex = (segs, px = 64) => { const parts = segs.map(([x, c, it, c2]) => { const m = FRX.exec(x); if (m) { const fn = FONT(Math.round(px * 0.72), isVar(m[1])), fd = FONT(Math.round(px * 0.72), isVar(m[2])); return { n: m[1], d: m[2], c, c2: c2 || c, fn, fd, w: Math.max(measure(fn, m[1]), measure(fd, m[2])) + px * 0.26 }; } const f = FONT(px, it === undefined ? isVar(x.trim()) : it); return { s: x, c, f, w: measure(f, x) }; });
      const tall = parts.some((q) => q.n), W = parts.reduce((a, q) => a + q.w, 0);
      return tex(Math.ceil(W) + 48, Math.round(px * (tall ? 2.3 : 1.55)), (g, w, h) => { let x = 24; g.textBaseline = 'middle'; g.lineJoin = 'round';
        const ink = (txt, xx, yy, f, c) => { g.font = f; g.shadowColor = 'rgba(8,12,18,0.85)'; g.shadowBlur = px * 0.22; g.lineWidth = px * 0.16; g.strokeStyle = 'rgba(12,16,22,0.6)'; g.strokeText(txt, xx, yy); g.shadowBlur = 0; g.fillStyle = c; g.fillText(txt, xx, yy); };
        for (const q of parts) { if (q.n) { const cx = x + q.w / 2, y0 = h / 2 + 2; g.textAlign = 'center'; ink(q.n, cx, y0 - px * 0.44, q.fn, q.c); ink(q.d, cx, y0 + px * 0.5, q.fd, q.c2); g.textAlign = 'left';
            g.shadowColor = 'rgba(8,12,18,0.85)'; g.shadowBlur = px * 0.16; g.fillStyle = 'rgba(12,16,22,0.55)'; g.fillRect(x + px * 0.05, y0 - px * 0.06, q.w - px * 0.1, px * 0.12); g.shadowBlur = 0; g.fillStyle = q.c2; g.fillRect(x + px * 0.08, y0 - px * 0.03, q.w - px * 0.16, px * 0.06); }
          else { g.textAlign = 'left'; ink(q.s, x, h / 2 + 2, q.f, q.c); } x += q.w; } }); };
    const label = (hgt, order = 30) => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }))); sp.renderOrder = order; sp.userData.h = hgt; sp.userData.k = ''; sp.visible = false; world.add(sp); return sp; };
    const setRich = (sp, segs, p, anchor = 0.5) => { if (!segs) { sp.visible = false; return; } const key = JSON.stringify(segs); if (sp.userData.k !== key) { sp.userData.k = key; const t = richTex(segs); sp.material.map?.dispose?.(); sp.material.map = t; sp.material.needsUpdate = true; const hh = sp.userData.h * (t.image.height / Math.round(64 * 1.55)); sp.userData.w = (hh * t.image.width) / t.image.height; sp.scale.set(sp.userData.w, hh, 1); } sp.position.set(p[0] + sp.userData.w * (0.5 - anchor), p[1], ZP + 0.02); sp.visible = true; };
    // 发光的点
    const dotTex = (col) => tex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.16, 'rgba(255,255,255,1)'); gr.addColorStop(0.24, col); gr.addColorStop(0.36, col.replace('1)', '0.5)')); gr.addColorStop(1, col.replace('1)', '0)')); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    const dTex = { g: dotTex('rgba(255,200,61,1)'), w: dotTex('rgba(255,255,255,1)'), t: dotTex('rgba(92,208,179,1)'), r: dotTex('rgba(252,98,85,1)') };
    const dot = (c, size = 0.24) => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ map: dTex[c], transparent: true, depthTest: false, depthWrite: false }))); sp.scale.setScalar(size); sp.userData.s = size; sp.renderOrder = 28; sp.visible = false; world.add(sp); sp.at = (p) => { sp.position.set(p[0], p[1], ZP + 0.015); sp.visible = true; }; return sp; };
    // 重拍：从那一点迸出一圈短光线（3Blue1Brown 的 Flash）
    const flashes = [];
    const flash = (p, color = GOLD, r0 = 0.16, r1 = 0.52) => { const rays = Array.from({ length: 12 }, () => gline(color, 0.04, { glow: 0.6, shadow: 0, order: 20 })); flashes.push({ p, rays, t0: now(), r0, r1 }); };

    // ---- 坐标平面：淡白的格（一格 0.5 m × 200 N）、亮一点的坐标轴、刻度 ----
    const grid = [];
    for (let x = -XR; x <= XR + 1e-6; x += 0.5) if (Math.abs(x) > 1e-6) grid.push([[x, Y(FB)], [x, Y(FT)]]);
    for (let F = FB; F <= FT; F += 200) if (F) grid.push([[-XR, Y(F)], [XR, Y(F)]]);
    for (const seg of grid) { const L = gline(0xeaf4ff, 0.022, { glow: 0, shadow: 0, op: 0.43, order: 5, z: ZP - 0.01 }); L.set(seg); }
    const axX = arrow(WHITE, 0.046), axY = arrow(WHITE, 0.046); axX.to([-XR - 0.1, YB], [XR + 0.32, YB], 0.27); axY.to([0, Y(FB) - 0.08], [0, Y(FT) + 0.34], 0.27);
    for (let x = -3; x <= 3; x++) if (x) gline(WHITE, 0.028, { glow: 0, shadow: 0 }).set([[x, YB - 0.07], [x, YB + 0.07]]);
    for (const force of [-800, -400, 400, 800]) gline(WHITE, 0.028, { glow: 0, shadow: 0 }).set([[-0.08, Y(force)], [0.08, Y(force)]]);
    for (let x = -3; x <= 3; x++) if (x) setRich(label(0.20, 21), [[String(x).replace('-', '−'), CSS.w, false]], [x, YB - 0.21]);
    const ticksY = [-800, -400, 400, 800].map((F) => { const sp = label(0.20, 21); setRich(sp, [[String(F).replace('-', '−'), CSS.w, false]], [-0.13, Y(F)], 1); return { sp, F }; });          // 1200 写在石头那支力的旁边
    const axNameX = label(0.23, 21), axNameY = label(0.23, 21), labO = label(0.20, 21);
    setRich(labO, [['O', CSS.w2]], [-0.16, YB - 0.2]);

    // ---- 这一课的数学对象 ----
    const effArrow = arrow(GOLD, 0.05), rockArrow = arrow(WHITE, 0.034);
    const effDot = dot('g', 0.3), rockDot = dot('w', 0.2);
    const effGuide = gline(WHITE, 0.016, { glow: 0, shadow: 0.15, dash: 0.07, op: 0.7, order: 9 });          // 从点到 y 轴的虚线（读数用）
    const branch = { a: gline(GOLD, 0.042, { glow: 0.5, shadow: 0.25, order: 12 }), b: gline(GOLD, 0.042, { glow: 0.5, shadow: 0.25, order: 12 }) };          // 曲线的两支：a 在 x > 0，b 在 x < 0
    const RE = () => gline(TEAL, 0.026, { glow: 0.45, shadow: 0.2, order: 11 });
    const rockRect = { f: fill(TEAL, 0.42, true), e: RE(), n: label(0.25, 26) };
    const liveRect = { f: fill(TEAL, 0.42, true), e: RE(), n: label(0.25, 26) };
    const fan = FANX.map(() => ({ f: fill(TEAL, 0.16), e: gline(TEAL, 0.022, { glow: 0.4, shadow: 0.16, order: 11 }), n: label(0.21, 26), d: dot('g', 0.2), born: -9 }));
    const made = [];          // 学生自己松手留下的矩形（x 值）
    const madeR = Array.from({ length: 3 }, () => ({ f: fill(TEAL, 0.42, true), e: RE(), n: label(0.25, 26), d: dot('g', 0.22) }));
    const tempR = { f: fill(TEAL, 0.42, true), e: RE(), n: label(0.25, 26), born: -9 };
    const jump = arrow(RED, 0.04), jumpDots = [dot('r', 0.24), dot('r', 0.24)], jumpLab = [label(0.23, 27), label(0.23, 27)], jumpG = [gline(RED, 0.016, { glow: 0.2, shadow: 0.2, dash: 0.07, order: 13 }), gline(RED, 0.016, { glow: 0.2, shadow: 0.2, dash: 0.07, order: 13 })];
    const LB = { effF: label(0.2), effX: label(0.18), rockF: label(0.18), eq: label(0.34, 32) };

    // ================= 此刻那一句：刻在石壁最下面那一道上，不挡坐标平面 =================
    const CAPW = 6.8, CAPH = 0.46, CAPY = 0.37;
    const capMesh = quiet(new THREE.Mesh(new THREE.PlaneGeometry(CAPW, CAPH), basic({ transparent: true, opacity: 0, depthWrite: false }))); capMesh.position.set(0, CAPY, 0.012); capMesh.renderOrder = 3; capMesh.visible = false; world.add(capMesh);
    const CW = 2048, CH = Math.round((CW * CAPH) / CAPW);
    const capRuns = (txt) => { const out = []; const re = /\{([^/{}]+)\/([^/{}]+)\}/g; let k = 0, m; while ((m = re.exec(txt))) { if (m.index > k) out.push({ t: txt.slice(k, m.index) }); out.push({ n: m[1], d: m[2] }); k = m.index + m[0].length; } if (k < txt.length) out.push({ t: txt.slice(k) }); return out; };
    const capTex = (big, small) => tex(CW, CH, (g, w, h) => {          // 大字一行、小字一行；{600/l} 写成上下两行的分数
      const FF = (px, wt, it = false) => `${it ? 'italic ' : ''}${wt} ${px}px "Times New Roman","Songti SC","STSong",serif`;
      const widthOf = (runs, px, wt) => runs.reduce((a, r) => { if (r.t != null) { g.font = FF(px, wt); return a + g.measureText(r.t).width; } g.font = FF(Math.round(px * 0.62), wt); return a + Math.max(g.measureText(r.n).width, g.measureText(r.d).width) + px * 0.24; }, 0);
      const fitPx = (runs, px, wt) => { let f = Math.round(px); while (f > 10 && widthOf(runs, f, wt) > w * 0.9) f -= 2; return f; };
      const R1 = capRuns(big), R2 = small ? capRuns(small) : null, p1 = fitPx(R1, h * 0.36, 600), p2 = R2 ? fitPx(R2, h * 0.24, 500) : 0;
      const w1 = widthOf(R1, p1, 600), w2 = R2 ? widthOf(R2, p2, 500) : 0, tot = Math.max(w1, w2), x0 = (w - tot) / 2;
      const band = g.createLinearGradient(x0 - h * 0.7, 0, x0 + tot + h * 0.7, 0); band.addColorStop(0, 'rgba(34,28,20,0)'); band.addColorStop(0.08, 'rgba(34,28,20,0.55)'); band.addColorStop(0.92, 'rgba(34,28,20,0.55)'); band.addColorStop(1, 'rgba(34,28,20,0)');
      g.fillStyle = band; g.fillRect(x0 - h * 0.7, h * 0.04, tot + h * 1.4, h * 0.92);
      const drawRuns = (runs, px, wt, y, col, ww) => { let x = (w - ww) / 2; g.textBaseline = 'middle'; g.fillStyle = col; for (const r of runs) { if (r.t != null) { g.font = FF(px, wt); g.textAlign = 'left'; g.fillText(r.t, x, y); x += g.measureText(r.t).width; } else { const fp = Math.round(px * 0.62); g.font = FF(fp, wt); const rw = Math.max(g.measureText(r.n).width, g.measureText(r.d).width) + px * 0.24, cx = x + rw / 2; g.textAlign = 'center'; g.font = FF(fp, wt, isVar(r.n)); g.fillText(r.n, cx, y - px * 0.38); g.font = FF(fp, wt, isVar(r.d)); g.fillText(r.d, cx, y + px * 0.44); g.fillRect(x + px * 0.08, y + px * 0.01, rw - px * 0.16, Math.max(1.5, px * 0.055)); x += rw; } } };
      drawRuns(R1, p1, 600, R2 ? h * 0.36 : h * 0.5, '#fbf3e2', w1); if (R2) drawRuns(R2, p2, 500, h * 0.74, '#ece2cc', w2); });
    const cap = { key: '', born: -9, out: 1e9, next: null };
    function caption(big, small = '') { const key = big + '|' + small; if (key === cap.key) return; cap.key = key; S.cap = [big, small];
      const show = () => { capMesh.material.map?.dispose?.(); capMesh.material.map = capTex(big, small); capMesh.material.needsUpdate = true; capMesh.visible = true; cap.born = now(); cap.out = 1e9; };
      if (capMesh.visible && now() - cap.born > 0.2) { cap.out = now(); cap.next = show; } else show(); }
    const prompt = (txt) => { S.ask = txt; if (ui?.status) ui.status(txt); };

    // ================= 板书 =================
    const css = document.createElement('style');
    css.textContent = `
.mfr{display:inline-block;vertical-align:middle;text-align:center;font-style:normal;font-size:0.86em;line-height:1.12;margin:0 0.08em}.mfr>span{display:block;padding:0 0.12em}.mfr>span:first-child{border-bottom:1px solid currentColor}
.fb-board{margin:4px 0 6px;display:flex;flex-direction:column;gap:8px;font:15px/1.7 "Kaiti SC","STKaiti","Songti SC",serif;color:#2b2722}
.fb-board .fb-row{opacity:0;transform:translateY(5px);transition:opacity .5s,transform .5s,background-color 2.4s;padding:3px 8px 3px 6px;border-radius:5px;border-left:3px solid transparent}
.fb-board .fb-row.in{opacity:1;transform:none}
.fb-board .fb-row.fresh{background:rgba(255,206,110,.34);border-left-color:#d98a2b}
.fb-board .n{display:inline-block;min-width:1.25em;color:#b0532a;font-weight:700}
.fb-board b{color:#8a2f1d}
.fb-board i{font-family:"Times New Roman",serif;font-style:italic;letter-spacing:.02em}
.fb-board .g{color:#c98600;font-weight:600}.fb-board .b{color:#2589b0;font-weight:600}.fb-board .t{color:#1a9a82;font-weight:600}.fb-board .r{color:#d4402f;font-weight:600}
.fb-board .fb-h{font:600 12px/1.3 "PingFang SC","Hiragino Sans GB",sans-serif;color:#a07a45;letter-spacing:.3em;margin:6px 0 -4px;opacity:0;transition:opacity .4s}
.fb-board .fb-h.in{opacity:1}
.fb-board.review .fb-row[data-k]{cursor:pointer}.fb-board.review .fb-row[data-k]:hover{background:rgba(255,206,110,.16)}
.fb-board .fb-row.sel{background:rgba(255,206,110,.34);border-left-color:#d98a2b}`;
    document.head.append(css);
    let boardEl = null, lastH = ''; const rows = [];
    const reveal = (r) => { const body = boardEl?.closest('.p-body'); if (!body) return; setTimeout(() => { const rb = r.getBoundingClientRect(), bb = body.getBoundingClientRect(); if (rb.bottom > bb.bottom - 14) body.scrollBy({ top: rb.bottom - bb.bottom + 28, behavior: 'smooth' }); }, 80); };
    const board = (html, key = '') => { const r = document.createElement('div'); r.className = 'fb-row'; r.innerHTML = html; if (key) r.dataset.k = key; rows.push(r); for (const o of rows) o.classList?.remove('fresh'); if (boardEl) { boardEl.append(r); requestAnimationFrame(() => { r.classList.add('in', 'fresh'); reveal(r); }); } return r; };
    board.h = (title) => { if (title === lastH) return; lastH = title; const r = document.createElement('div'); r.className = 'fb-h'; r.textContent = title; rows.push(r); if (boardEl) { boardEl.append(r); requestAnimationFrame(() => { r.classList.add('in'); reveal(r); }); } };
    const I = (s) => `<i>${s}</i>`;

    // ================= 状态 =================
    const fresh = () => ({ x: 2.5, xr: -A0, step: 'rect', held: '', xy: false, fanAt: -9, fanDone: false, crossed: false, leftMin: 9, dragFrom: 0, negFrom: null, negRun: 0, rockMoved: false, done: false, cap: ['', ''], ask: '', stepAt: now(), hint: 0, moved: -9, asked: false, pose: '', jumpOn: false, backAt: -9, xr0: -A0 });
    let S = fresh(), runId = 0;
    const later = (ms, f) => { const id = runId; setTimeout(() => { if (!dead && id === runId) f(); }, ms); };
    const kNow = () => -W0 * S.xr;
    const Fof = (x, k = kNow()) => k / x;
    // 曲线的一支：只画在坐标平面里的那一段
    // 曲线的一支（sgn：x 的正负）：从碰到上边（或下边）的地方，一直画到左右边；按对数取点，靠近坐标轴那段陡的地方点也密
    const branchPts = (k, sgn) => { if (!k) return null; const Flim = k * sgn > 0 ? FT : FB, xa = Math.abs(k / Flim); if (xa >= XR) return null;
      const out = []; for (let i = 0; i <= 120; i++) { const x = sgn * Math.exp(lerp(Math.log(xa), Math.log(XR), i / 120)); out.push(P(x, k / x)); } return out; };
    const xMin = () => (S.xy ? -XR : 0.45);          // 前两步只在支点右边（再往里，力就超出画面了）

    // 一块矩形：原点和 (x, F) 是对角；面积写在里面（放不下时写在对角那个顶点外面，顺着曲线往外）
    function setRect(R, x, F, txt, show = true, outside = false) { if (!show) { R.f.rect(null); R.e.hide(); setRich(R.n, null); if (R.d) R.d.visible = false; return; }
      const a = P(0, 0), b = P(x, F); R.f.rect(a, b); R.e.set(rectPts(a, b)); if (R.d) R.d.at(b);
      const roomy = Math.abs(b[1] - a[1]) > 0.42 && Math.abs(b[0] - a[0]) >= 0.45 && !outside;
      if (roomy) { const tall = Math.abs(b[1] - a[1]) > 2 * Math.abs(b[0] - a[0]); setRich(R.n, [[txt, CSS.t, false]], [(a[0] + b[0]) / 2, lerp(a[1], b[1], tall ? 0.76 : 0.5)]); return; }
      const s = -F / (NPU * x); let n = [-s, 1]; if (n[0] * x + (n[1] * F) / NPU < 0) n = [s, -1]; const nl = Math.hypot(n[0], n[1]);          // 曲线在这一点的法线，朝离开原点的那一边
      setRich(R.n, [[txt, CSS.t, false]], [b[0] + (n[0] / nl) * 0.36, b[1] + (n[1] / nl) * 0.26]); }
    const areaTxt = () => String(Math.round(Math.abs(kNow())));

    function layout() {
      const k = kNow(), x = S.x, onPivot = Math.abs(x) < 0.05;
      // 石头、石头的力、石头那边的矩形
      rock.position.set(S.xr, YB + PT / 2, -PD / 2);
      rockArrow.to(P(S.xr, W0), P(S.xr, 0), 0.2); rockDot.at(P(S.xr, W0));
      setRich(LB.rockF, [[String(W0), CSS.w2, false]], [S.xr + (S.xr < 0 ? -0.12 : 0.12), Y(W0) + 0.06], S.xr < 0 ? 1 : 0);
      setRect(rockRect, S.xr, W0, areaTxt(), !!S.showRock);
      // 金色的力：从曲线上的点指向撬棍
      if (onPivot) { effArrow.off(); effDot.visible = false; effGuide.hide(); setRich(LB.effF, null); setRich(LB.effX, [['握点', CSS.g, false]], [0, YB + 0.3]); }
      else {
        const F = Fof(x), Fc = clamp(F, FB - 120, FT + 160), inside = F <= FT && F >= FB;
        effArrow.to(P(x, Fc), P(x, 0), 0.24); effArrow.fade(inside ? 1 : 0.6); effArrow.headFade(1);
        if (inside) { effDot.at(P(x, F)); effGuide.set(S.live || S.step === 'wow' ? null : [P(x, F), P(0, F)]); } else { effDot.visible = false; effGuide.hide(); }
        if (S.step === 'wow' || S.pose === 'fan') setRich(LB.effF, null); else setRich(LB.effF, inside ? [[forceS(F), CSS.g, false]] : [[(F > 0 ? '> ' : '< ') + String(F > 0 ? FT : FB).replace('-', '−'), CSS.g, false]], [x + (x > 0 ? 0.16 : -0.16), inside ? Y(F) + (F > 0 ? 0.2 : -0.2) : (F > 0 ? Y(FT) - 0.2 : Y(FB) + 0.2)], x > 0 ? 0 : 1);
        setRich(LB.effX, [[numS(x), CSS.w, false]], [x, F > 0 ? YB - 0.42 : YB + 0.22]);          // 动力臂的读数：在刻度那一行的外边，不和刻度叠
      }
      // 曲线
      if (S.showA) branch.a.set(branchPts(k, 1)); else branch.a.hide();
      if (S.showB) branch.b.set(branchPts(k, -1)); else branch.b.hide();
      // 跟着手的矩形（挪石头的时候）
      if (S.live && !onPivot && Math.abs(Fof(x)) <= Math.max(FT, -FB)) setRect(liveRect, x, Fof(x), areaTxt()); else setRect(liveRect, 0, 0, '', false);
      // 学生自己留下的矩形
      madeR.forEach((R, i) => { const mx = made[i]; if (mx == null || S.fanAt > 0) { setRect(R, 0, 0, '', false); return; } setRect(R, mx, K0 / mx, String(K0)); });          // 一下子开始以后，它们并进那十块里
      // 坐标轴的名字、式子
      setRich(axNameX, S.xy ? [['x', CSS.w]] : [['l', CSS.w], ['/m', CSS.w2, false]], [XR + 0.42, YB - 0.24], 0.5);
      setRich(axNameY, S.xy ? [['y', CSS.w]] : [['F', CSS.w], ['/N', CSS.w2, false]], [0.2, Y(FT) + 0.42], 0);
      setRich(LB.eq, S.eq ? eqSegs() : null, [2.35, Y(FT) - 0.32]);
      // 跨过 y 轴的那一跳
      if (S.jumpOn) { jump.to(P(0.16, -K0), P(0.16, K0), 0.2); jumpDots[0].at(P(-1, -K0)); jumpDots[1].at(P(1, K0)); jumpG[0].set([P(-1, -K0), P(0.16, -K0)]); jumpG[1].set([P(1, K0), P(0.16, K0)]); setRich(jumpLab[0], [['(−1, −600)', CSS.r, false]], [-1.12, Y(-K0) - 0.08], 1); setRich(jumpLab[1], [['(1, 600)', CSS.r, false]], [1.16, Y(K0) + 0.14], 0); }
      else { jump.off(); for (const d of jumpDots) d.visible = false; for (const l of jumpLab) setRich(l, null); for (const g of jumpG) g.hide(); }
      for (const t of ticksY) t.sp.visible = !(t.F > 0 && S.showRock && S.xr < 0) && !(S.jumpOn && Math.abs(t.F) === 400);
    }
    const eqSegs = () => { const k = Math.round(kNow()), v = S.xy ? 'x' : 'l', y = S.xy ? 'y' : 'F';
      return [[y, CSS.w], [' = ', CSS.w, false], ...(k < 0 ? [['−', CSS.t, false]] : []), [`{${Math.abs(k)}/${v}}`, CSS.t, false, CSS.w]]; };

    // ================= 一课的主线 =================
    function firstRect() {          // 重拍 1：力 × 动力臂 = 石头那边的 0.5 × 1200
      const x = S.x, F = Fof(x); made.push(x); S.step = 'more'; S.showRock = true; S.stepAt = now(); S.hint = 0;
      flash(P(x, F), TEAL, 0.14, 0.46); flash(P(S.xr, W0), TEAL, 0.14, 0.46); sfx.ding(1180, { gain: 0.06 });
      const exact = Number.isInteger(F);
      caption('一格代表 100 N·m，两块矩形都占六格', `${numS(x)} m × ${exact ? F : F.toFixed(1)} N ${exact ? '=' : '≈'} 0.5 m × 1200 N = 600 N·m`);
      board.h('探究'); board(`<span class="n">1</span>动力臂是长度，动力是力的大小，都取正数。一格代表 0.5 m × 200 N = 100 N·m，六格代表 600 N·m。平衡时，<span class="g">${I('F')}</span>${I('l')} = 1200 × 0.5 = <span class="t">600</span>，所以 <span class="g">${I('F')}</span> = ${FR('<span class="t">600</span>', I('l'))}`, 'rect');
      S.eq = true; prompt('换个地方再松手，矩形还占六格吗？'); layout();
    }
    function moreRect() {
      const x = S.x; made.push(x); sfx.clink({ freq: 1200 + made.length * 160, gain: 0.05 }); flash(P(x, Fof(x)), TEAL, 0.12, 0.36);
      if (made.length < 3) { caption('力矩大小还是 600 N·m', '高的窄，矮的宽，都占六格'); prompt('再换一个地方，力矩大小还是 600 N·m 吗？'); layout(); return; }
      fanOut();
    }
    function fanOut() {          // 一下子：十个面积都是 600 的矩形一个接一个亮出来，对角的顶点连成一条曲线
      S.step = 'wow'; S.fanAt = now(); S.stepAt = now(); S.hint = 0;
      fan.forEach((R, i) => { R.born = S.fanAt + i * 0.16; });
      FANX.forEach((x, i) => later(i * 160, () => { sfx.clink({ freq: 880 * Math.pow(2, i / 7), gain: 0.04 }); }));
      later(FANX.length * 160 + 100, () => { S.showA = true; branch.a.draw(branchPts(K0, 1), 0.9); sfx.ding(1568, { gain: 0.06 }); later(500, () => sfx.ding(1976, { gain: 0.045 }));
        caption('每个矩形都占六格，对角的顶点连成一条曲线', '手握到哪儿，动力和动力臂的乘积都是 600 N·m');
        board(`<span class="n">2</span>都代表 <span class="t">600 N·m</span> 的矩形，公共角在 ${I('O')}，把对角的顶点用平滑的曲线连起来，就是 <span class="g">${I('F')}</span> = ${FR('<span class="t">600</span>', I('l'))} 的图象：${I('F')} 随 ${I('l')} 的变化而变化，它们的积 ${I('Fl')} 始终保持不变`, 'fan'); });
      later(FANX.length * 160 + 2600, () => { S.fanDone = true; S.step = 'cross'; S.xy = true; S.stepAt = now(); S.hint = 0; layout();
        caption('x 是手的位置，支点右边为正', 'y 是手上的力，往下压为正。把手拖过支点，看 x 和 y 怎么变'); prompt('越靠近支点越费力……把力拖到支点另一边去看看'); });
      layout();
    }
    function crossed() {          // 重拍 3：x ≠ 0，图象由两支曲线组成
      S.crossed = true; S.step = 'mono'; S.showB = true; S.xy = true; S.stepAt = now(); S.hint = 0;
      branch.b.draw(branchPts(K0, -1), 0.8); flash(P(S.x, Fof(S.x)), GOLD); sfx.ding(1320, { gain: 0.06 });
      caption('手在支点左边，要往上抬，x 和 y 都是负数', '压在支点上，多大的力也撬不动——x ≠ 0，图象分成两支');
      board.h('图象'); board(`<span class="n">3</span>手的位置 ${I('x')} 以支点右边为正，手上的力 ${I('y')} 以下压为正。手在左边往上抬时，点在第三象限。平衡时 ${I('xy')} = ${I('k')} = 600，因为 ${I('x')} ≠ 0，${I('y')} = ${FR(I('k'), I('x'))} 的图象分成两支，是<b>双曲线</b>。矩形的数值面积是 |${I('k')}|，带符号的乘积是 ${I('k')}。`, 'two');
      later(2400, () => { if (S.step !== 'mono') return; caption('从左往右拖过支点', 'x 一直在增大，y 一直在减小吗？'); prompt('按住力，从左往右拖过支点：x 增大时，y 一直在减小吗？'); });
      layout();
    }
    function monoDone() {          // 重拍 4：在每一个象限内
      S.step = 'rock'; S.jumpOn = true; S.stepAt = now(); S.hint = 0; flash(P(1, K0), RED, 0.14, 0.44); sfx.ding(1250, { gain: 0.06 });
      caption('跨过 y 轴，y 反而变大了', '在每一个象限内，y 随 x 的增大而减小');
      board(`<span class="n">4</span>当 <span class="t">${I('k')} &gt; 0</span> 时，双曲线的两支分别位于第一、第三象限，在每一个象限内，${I('y')} 随 ${I('x')} 的增大而减小（跨过 ${I('y')} 轴，${I('x')} 从 −1 到 1，${I('y')} 却从 −600 变成 600，只能说“在每一个象限内”）`, 'mono');
      later(3000, () => { if (S.step !== 'rock') return; S.jumpOn = false; S.live = true; caption('k = −1200 × 石头的位置', '石头的位置也以支点右边为正。把石头从左边挪到右边，看看 k 的符号'); prompt('把石头挪一挪：k 变了，曲线怎么变？挪到支点另一边呢？'); layout(); });
      layout();
    }
    function negSeen() {          // k < 0：两支翻到第二、第四象限
      S.step = 'neg'; S.negFrom = null; S.negRun = 0; S.stepAt = now(); S.hint = 0; flash(P(S.xr, W0), TEAL, 0.14, 0.44); sfx.whoosh({ dur: 0.5, freq: 900, gain: 0.04 });
      caption('石头到了支点右边：k < 0', '两支跑到了第二、第四象限'); prompt('拖着力从左往右走：现在 y 怎么变？'); layout();
    }
    function negDone() {          // 重拍 5：k < 0，在每一个象限内 y 随 x 的增大而增大
      S.step = 'back'; S.stepAt = now(); S.hint = 0; flash(P(S.x, Fof(S.x)), GOLD); sfx.ding(1400, { gain: 0.06 });
      caption('k < 0：在每一个象限内，y 随 x 的增大而增大', '双曲线的两支分别位于第二、第四象限');
      board(`<span class="n">5</span>${I('k')} 取不同的值，结论一样。当 <span class="t">${I('k')} &lt; 0</span> 时，双曲线的两支分别位于第二、第四象限，在每一个象限内，${I('y')} 随 ${I('x')} 的增大而增大`, 'neg');
      later(2800, () => { if (S.step !== 'back') return; S.live = false; S.backAt = now(); S.xr0 = S.xr; S.x0 = S.x; S.step = 'backing'; sfx.whoosh({ dur: 0.9, freq: 600, gain: 0.04 }); });
      layout();
    }
    function backDone() {
      S.step = 'final'; S.xr = -A0; S.xy = false; S.showB = false; S.showRock = false; S.stepAt = now(); S.hint = 0; S.x = 1.5;
      caption('回到原题，力不超过 200 N', '动力臂 l 是长度，动力 F 是力的大小，两者都取正数'); prompt('想用的力不超过 400 N 的一半（200 N），动力臂至少要多长？'); layout();
    }
    function finish() {
      S.step = 'end'; S.done = true; boardEl?.classList.add('review'); flash(P(3, 200), GOLD); sfx.ding(1568, { gain: 0.07 }); later(450, () => sfx.ding(1976, { gain: 0.05 }));
      tempR.born = now() + 99; setRect(tempR, 3, 200, '600');
      caption('答：动力臂至少要加长 1.5 m', 'F = 200 N 时 l = 3 m；F 随 l 的增大而减小');
      board.h('答'); board(`<b>答</b>：<span class="g">${I('F')}</span> = ${FR('600', I('l'))}。动力臂为 1.5 m 时，${I('F')} = ${FR('600', '1.5')} = 400（N）。当 ${I('l')} &gt; 0 时，${I('F')} 随 ${I('l')} 的增大而减小，${I('F')} = 200 N 时 ${I('l')} = 3 m，所以动力臂至少要加长 3 − 1.5 = 1.5（m）。`, 'ans');
      prompt(''); ui?.unlock?.(); layout();
      later(2600, () => { ui?.go?.(2); ui?.fold?.(false); });          // 一课结束：翻到“对照课本原文”
    }
    // 讲完以后点板书：场景摆回那一刻
    function pose(key) {
      S.pose = key; S.jumpOn = false; S.live = false; tempR.born = -9; setRect(tempR, 0, 0, '', false);
      const base = { xr: -A0, showRock: true, eq: true, showA: true, showB: true, xy: true, fanDone: true, fanAt: -9 };
      for (const R of fan) R.born = -9;
      made.length = 0;
      if (key === 'rect') { Object.assign(S, base, { x: 1.5, showA: false, showB: false, xy: false, fanDone: false }); made.push(1.5); }
      if (key === 'fan') { Object.assign(S, base, { x: 1.5, showB: false, xy: false, fanDone: false }); S.fanAt = now() - 0.2; fan.forEach((R, i) => { R.born = S.fanAt + i * 0.08; }); }
      if (key === 'two') Object.assign(S, base, { x: -2 });
      if (key === 'mono') Object.assign(S, base, { x: 1, jumpOn: true });
      if (key === 'neg') Object.assign(S, base, { xr: A0, x: 1.5, live: true });
      if (key === 'ans') { Object.assign(S, base, { x: 3, xy: false, showB: false, showRock: false }); tempR.born = now() + 99; setRect(tempR, 3, 200, '600'); }
      const CAP = { rect: ['一格代表 100 N·m，两块矩形都占六格', '1.5 m × 400 N = 0.5 m × 1200 N = 600 N·m'], fan: ['每个矩形都占六格，对角的顶点连成一条曲线', '手握到哪儿，动力和动力臂的乘积都是 600 N·m'], two: ['x ≠ 0：图象由两支曲线组成', '反比例函数的图象由两条曲线组成，它是双曲线'], mono: ['k > 0：两支在第一、第三象限', '在每一个象限内，y 随 x 的增大而减小'], neg: ['k < 0：两支在第二、第四象限', '在每一个象限内，y 随 x 的增大而增大'], ans: ['答：动力臂至少要加长 1.5 m', 'F = 200 N 时 l = 3 m；F 随 l 的增大而减小'] };
      caption(...(CAP[key] || CAP.ans)); flash(P(S.x, Fof(S.x)), GOLD, 0.14, 0.42); layout();
    }

    // ================= 动手 =================
    let grabDX = 0;
    function effDown(p) { if (S.step === 'backing' || S.step === 'wow') return false; S.held = 'eff'; grabDX = S.x - p.x; S.dragFrom = S.x; S.leftMin = S.x; S.side = Math.sign(S.x) || S.side;
      if (!S.asked) { S.asked = true; board.h('问题'); board(`撬棍撬石头：阻力 1200 N，阻力臂 0.5 m。动力臂为 1.5 m 时，撬动石头至少需要多大的力？若想使动力不超过这个力的一半，动力臂至少要加长多少？`, 'rect'); } return true; }
    function effMove(p) {
      if (S.held !== 'eff') return; let x = clamp(q1(p.x + grabDX), xMin(), XR);
      if (S.step === 'final' && Math.abs(x - 3) < 0.12) x = 3;
      if (Math.abs(x) < 0.05) x = 0;          // 支点上
      const was = S.x; if (x === was) return; S.x = x; S.moved = now(); S.leftMin = Math.min(S.leftMin, x);
      if (Math.floor(was * 2) !== Math.floor(x * 2)) sfx.clink({ freq: 700 + clamp(Math.abs(Fof(x || 0.01)), 0, 1400) * 0.9, gain: 0.012 });
      if (x === 0 && !S.pivotSeen && S.step === 'cross') { S.pivotSeen = true; caption('压在支点上，多大的力也撬不动', '动力臂是 0：没有哪个力能让它平衡'); }
      const side = Math.sign(x) || S.side;
      if (S.step === 'cross' && x < -0.3) crossed();
      else if (S.step === 'mono' && S.side < 0 && x > 0 && S.leftMin < -0.4 && now() - S.stepAt > 2.4) monoDone();          // 刚拖过去时顺手拖回来不算：等问题出来，再从左往右拖一遍
      else if (S.step === 'neg' && kNow() < 0) { if (S.negFrom == null || Math.sign(S.negFrom) !== Math.sign(x) || x < S.negFrom) S.negFrom = x; if (x - S.negFrom > 1) negDone(); }
      else if (S.step === 'final' && x === 3) { S.held = ''; S.side = side; finish(); return; }
      S.side = side;
      layout();
    }
    function effUp() { if (S.held !== 'eff') return; S.held = '';
      const x = S.x; if (!x) { layout(); return; }
      if (S.step === 'rect' && x > 0.4) firstRect();
      else if (S.step === 'more' && made.every((m) => Math.abs(m - x) > 0.25)) moreRect();
      else if (['cross', 'mono', 'rock', 'neg', 'final', 'end'].includes(S.step) && Math.abs(Fof(x)) <= Math.max(FT, -FB)) { tempR.born = now(); setRect(tempR, x, Fof(x), areaTxt()); }
      layout(); }
    let rockGrab = 0;
    function rockDown(p) { if (!S.xy || !['rock', 'neg', 'end'].includes(S.step)) return false; S.held = 'rock'; rockGrab = S.xr - p.x; return true; }
    function rockMove(p) { if (S.held !== 'rock') return; let xr = clamp(p.x + rockGrab, -1.25, 1.25); xr = Math.round(xr * 4) / 4; if (xr === 0) xr = S.xr < 0 ? -0.25 : 0.25;
      if (xr === S.xr) return; const was = S.xr; S.xr = xr; S.moved = now(); S.rockMoved = true; sfx.clink({ freq: 600 + Math.abs(kNow()) * 0.6, gain: 0.02 });
      if (S.step === 'rock' && was < 0 && xr > 0) negSeen();
      else if (S.step === 'neg' && xr < 0) { S.step = 'rock'; caption('k 又是正的了', '挪到支点右边看看'); }
      layout(); }
    function rockUp() { if (S.held === 'rock') S.held = ''; }
    const effPick = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.3), basic({ visible: false })); effPick.userData.pick = true; effPick.userData.noFrame = true; world.add(effPick);
    const effPick2 = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), basic({ visible: false })); effPick2.userData.pick = true; effPick2.userData.noFrame = true; world.add(effPick2);
    const toL = (p) => p;
    const effDrag = (obj) => ({ obj, plane: 'xy', offset: ZP, hint: () => (S.step === 'final' ? '往外拖：力会变小' : '按住，沿撬棍左右拖'), enabled: () => S.step !== 'wow' && S.step !== 'backing', onStart: (p) => effDown(toL(p)), onDrag: (p) => effMove(toL(p)), onEnd: () => effUp() });
    const drags = [effDrag(effPick), effDrag(effPick2),
      { obj: rockPick, plane: 'xy', offset: ZP, hint: () => '按住石头，沿撬棍挪', enabled: () => S.xy && ['rock', 'neg', 'end'].includes(S.step), onStart: (p) => rockDown(p), onDrag: (p) => rockMove(p), onEnd: () => rockUp() }];
    const dragApi = draggable(world, drags, { onClick: () => false, tip: tag?.('', 'pill') });
    let heard = false;
    const pointer = { down: (r, e) => { if (!heard) { heard = true; audio(); } return dragApi.down(r, e); }, move: (r, e) => dragApi.move(r, e), up: (r, e) => dragApi.up(r, e), items: dragApi.items };
    function opening() { caption('动力臂 1.5 m 时，至少要多大的力？', '阻力 1200 N，阻力臂 0.5 m：撬动这块石头，手握在哪儿、要多大的力？'); prompt('按住金色的力，沿撬棍挪一挪：握在不同的地方，要多大的力？'); }
    const cue = mathActionCue(camera, pointer, dragApi, () => S.step, () => {
      if (S.step === 'rock' && !S.jumpOn) return rockPick;
      if (S.step === 'mono' && now() - S.stepAt < 2.4) return;
      if (['rect', 'more', 'cross', 'mono', 'neg', 'final'].includes(S.step)) return effPick;
    });
    function reset() { cue.reset(); runId++; S = fresh(); made.length = 0; for (const R of fan) R.born = -9; tempR.born = -9; setRect(tempR, 0, 0, '', false); branch.a.hide(); branch.b.hide(); rows.length = 0; lastH = ''; if (boardEl) { boardEl.innerHTML = ''; boardEl.classList.remove('review'); } cap.key = ''; ui?.relock?.(); ui?.go?.(1); opening(); layout(); }
    const onKey = (e) => { if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !e.target?.closest?.('input,textarea')) reset(); };
    addEventListener('keydown', onKey);

    layout();
    const EL = 0.45, DIR = [0, Math.sin(EL), Math.cos(EL)];
    let last = now();
    return {
      group: root, card: false, place: 'spread', scale: 0.95,
      size: { w: 2 * UE * SC, d: 3.3 * SC, h: (Y(FT) + 0.55) * SC },
      view: { elev: 26, azim: 0, lookY: 0.5, frameMargin: 1.0 },
      pointer: cue.pointer,
      mount(u) { ui = u; boardEl = document.createElement('div'); boardEl.className = 'fb-board' + (S.done ? ' review' : ''); u.controls?.append(boardEl);
        const quote = u.el?.querySelector('.answer blockquote');
        if (quote && quote.textContent === textbookQuote) quote.innerHTML = textbookQuote.replace('k/x', FR(I('k'), I('x')));
        boardEl.addEventListener('click', (e) => { const r = e.target.closest?.('.fb-row'); if (!S.done || !r?.dataset.k) return; for (const o of rows) o.classList?.remove('sel', 'fresh'); r.classList.add('sel'); sfx.clink({ freq: 1200, gain: 0.03 }); pose(r.dataset.k); });
        for (const r of rows) { boardEl.append(r); r.classList.add('in'); }
        ui.go?.(1); if (!cap.key) opening(); else if (S.ask) ui.status?.(S.ask);
        requestAnimationFrame(() => aim?.(DIR)); setTimeout(() => { if (!dead) aim?.(DIR); }, 700); },
      dispose() { cue.dispose(); dead = true; runId++; removeEventListener('keydown', onKey); css.remove(); },
      update() {
        const t = now(), dt = Math.min(0.05, t - last); last = t; uT.value = t;
        // 一笔画出来的线
        for (const L of lines) if (L.anim) { if (t < L.anim.t0) continue; const k = clamp((t - L.anim.t0) / L.anim.dur, 0, 1), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; L._draw(L.pts ? partial(L.pts, Math.max(0.002, e)) : null); if (k >= 1) { L.anim = null; L._draw(L.pts); } }
        // 一下子：十个矩形一个接一个亮出来，亮一下再安静下来
        for (const [i, R] of fan.entries()) { const x = FANX[i], age = t - R.born;
          if (age < 0 || R.born < 0) { setRect(R, 0, 0, '', false); continue; }
          if (!R.f.visible) setRect(R, x, K0 / x, String(K0), true, true);
          const settle = S.fanDone ? clamp((t - (S.fanAt + 2.6 + FANX.length * 0.16)) / 0.8, 0, 1) : 0, pop = clamp(age / 0.18, 0, 1), glowK = Math.exp(-age * 3), gone = S.pose !== 'fan' && !['wow', 'cross', 'mono'].includes(S.step) ? 1 : 0;
          if (gone) { R.goneAt = R.goneAt || t; } else R.goneAt = 0; const out = R.goneAt ? clamp(1 - (t - R.goneAt) / 0.6, 0, 1) : 1; if (R.goneAt && out <= 0) { R.born = -9; setRect(R, 0, 0, '', false); continue; }
          R.f.material.opacity = (0.06 + 0.34 * glowK) * pop * (1 - 0.5 * settle) * out; R.e.fade(pop * (1 - 0.55 * settle) * out); R.n.material.opacity = pop * (1 - settle) * out; R.d.material.opacity = pop * (1 - settle) * out; R.d.scale.setScalar(0.2 * (1 + 0.8 * glowK)); }
        // 松手留下的那块矩形：几秒后淡掉
        if (tempR.born > 0) { const age = t - tempR.born, k = clamp(1 - (age - 2.2) / 0.6, 0, 1); tempR.f.material.opacity = 0.42 * k; tempR.e.fade(k); tempR.n.material.opacity = k; if (k <= 0) { tempR.born = -9; setRect(tempR, 0, 0, '', false); } }
        // 闪光
        for (let i = flashes.length - 1; i >= 0; i--) { const F = flashes[i], k = clamp((t - F.t0) / 0.55, 0, 1), e = easeOut(k); F.rays.forEach((L, j) => { const th = (j / F.rays.length) * Math.PI * 2 + 0.2, ra = lerp(F.r0, F.r1, e), rb = lerp(F.r0, F.r1, Math.min(1, e * 0.55 + 0.1)); L.set([[F.p[0] + Math.cos(th) * rb, F.p[1] + Math.sin(th) * rb], [F.p[0] + Math.cos(th) * ra, F.p[1] + Math.sin(th) * ra]]); L.fade(1 - k); });
          if (k >= 1) { for (const L of F.rays) L.dispose(); flashes.splice(i, 1); } }
        // 石头回到原处，手回到 1.5 m
        if (S.step === 'backing') { const k = clamp((t - S.backAt) / 1.2, 0, 1); S.xr = lerp(S.xr0, -A0, easeOut(k)); if (S.xr0 > 0 && S.xr > -0.02 && S.xr < 0.02) S.xr = -0.02; if (S.x0 > 0.3) S.x = lerp(S.x0, 1.5, easeOut(k)); layout(); if (k >= 1) backDone(); }
        // 此刻那一句：淡进淡出
        if (cap.out < 1e9) { const k = clamp(1 - (t - cap.out) / 0.35, 0, 1); capMesh.material.opacity = k; if (k <= 0) { cap.out = 1e9; const nx = cap.next; cap.next = null; nx?.(); } } else capMesh.material.opacity = clamp((t - cap.born) / 0.5, 0, 1);
        // 拾取：力的整支箭头、曲线上的点
        { const x = S.x, F = x ? clamp(Fof(x), FB - 120, FT + 160) : 0, y0 = Math.min(Y(F), YB), y1 = Math.max(Y(F), YB); effPick.position.set(x, (y0 + y1) / 2, ZP); effPick.scale.set(0.36, Math.max(0.3, y1 - y0), 1); effPick2.position.set(x, x ? Y(F) : YB + 0.3, ZP); }
        // 卡住很久才给提示（不拦着人）
        if (!S.held && !S.done && S.hint < 1 && t - S.stepAt > 15 && t - S.moved > 4) {
          const H1 = { rect: ['松开手：看看动力臂和力围成的矩形', '和石头那边的比一比'], more: ['再换一个地方松手', '高的窄，矮的宽：面积呢？'], cross: ['把力往左拖，拖过支点', '压在支点上会怎样？'], mono: ['从左边拖到右边，跨过支点', '看 y 怎么跳'], rock: ['按住石头往右挪', '挪过支点，k 变成负的'], neg: ['从左往右拖着力走', '在每一支上，y 是变大还是变小？'], final: ['往外拖：力会变小', '拖到 200 N'] }[S.step];
          if (H1) { S.hint = 1; caption(...H1); } }
        void dt;
        cue.update();
      },
      debug: {
        get S() { return S; }, rows, pose, cap: () => S.cap, made,
        labels: () => [...Object.values(LB), axNameX, axNameY, labO, rockRect.n, liveRect.n, tempR.n, ...fan.map((R) => R.n), ...madeR.map((R) => R.n)],
        qa: [
          { name: '拖到 1.5 m 松手', run: () => { effDown({ x: S.x }); effMove({ x: 1.5 }); effUp(); }, wait: 1.2 },
          { name: '换到 1 m 松手', run: () => { effDown({ x: S.x }); effMove({ x: 1 }); effUp(); }, wait: 0.8 },
          { name: '换到 3 m 松手（一下子）', run: () => { effDown({ x: S.x }); effMove({ x: 3 }); effUp(); }, wait: 5.2 },
          { name: '拖过支点到左边', run: () => { effDown({ x: S.x }); for (let x = 3; x >= -2; x -= 0.1) effMove({ x }); effUp(); }, wait: 2.6 },
          { name: '从左往右拖过支点', run: () => { effDown({ x: S.x }); for (let x = -2; x <= 1.5; x += 0.1) effMove({ x }); effUp(); }, wait: 3.4 },
          { name: '把石头挪到支点右边', run: () => { rockDown({ x: S.xr }); for (let x = -0.5; x <= 0.5; x += 0.05) rockMove({ x }); rockUp(); }, wait: 0.6 },
          { name: '拖着力从左往右走', run: () => { effDown({ x: S.x }); effMove({ x: 0.6 }); for (let x = 0.6; x <= 2.2; x += 0.1) effMove({ x }); effUp(); }, wait: 4.6 },
          { name: '拖到 200 N', run: () => { effDown({ x: S.x }); for (let x = 1.5; x <= 3.05; x += 0.1) effMove({ x }); effUp(); }, wait: 3 },
        ],
      },
    };
  },
};
