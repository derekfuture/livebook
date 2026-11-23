// 数学 九年级上册 29.2.3 圆周角 · 图29.2-5（课本第 127–128 页）。情境用第 133 页 习题29.2 第 14 题：夜里的海港、两座灯塔、浅滩、危险角。
//
// 一个夜色的纸剧场盒子放在课本上。没有步骤栏、没有演示：学生（或在投影上讲课的老师）自己开船。
// 每做出一样东西，天幕上就在那一刻说出课本上对应的那句话（课本第 127–128 页的顺序），场景里标上和课本一样的字母：
//   开头的问题（第 14 题）：夜里看不见浅滩，只看得见两盏灯，船怎么知道自己进没进浅滩？
//   开船：船上看两盏灯正好 40° 时放一盏河灯，河灯连成过两座灯塔的圆＝浅滩的边；沿圆开处处 40°：圆周角的定义，都对着同一条弧 BC。
//   点浮标：圆心角 ∠BOC＝80°；剪两块光扇拼满：圆周角是圆心角的一半（看出来的）。
//   一束光照过浮标：情况（1）OA＝OC ⇒ ∠A＝∠C，外角 ⇒ ∠BOC＝2∠A；点浮标过船作直径 AD：情况（2）相加、（3）相减 → 圆周角定理、同弧所对的圆周角相等。
//   开进、开出浅滩：∠BPC 比 40° 大 / 小（延长交圆于 Q，三角形的外角）→ 正面回答开头的问题。
//   点海面：等角线，每个角度一段过两座灯塔的圆弧；90° 那圈以 BC 为直径（推论）。
// 两个视角：海图（和课本的图一样）、站到船头（点小船；右下角那卷海图点一下回来）。键盘 R：清场重来（给老师）。
// 所有角度、圆、等角线都按真实几何算出来。
import * as THREE from 'three';
import { arcPts, add, sub, mul, unit, ang, mid, dist, wrap, clamp, lerp, easeOut } from './kit/sheet.js';
import { draggable } from './kit/interact.js';
import { sfx, audio } from './kit/audio.js';

// ---- 几何（纸面坐标 u 向右、v 向里；三维里是 (u, y, −v)） ----
const B0 = [-0.06, 0.05], C0 = [0.06, 0.05];                 // 两座灯塔
const DANGER = (40 * Math.PI) / 180;                          // 危险角
const O = [0, 0.05 - 0.06 / Math.tan(DANGER)], R = 0.06 / Math.sin(DANGER);   // 过两座灯塔、圆周角是 40° 的圆：圆心（浮标）、半径
const SEA = { u0: -0.172, u1: 0.172, v0: -0.172, v1: 0.05 };  // 海（岸在 v = 0.05）；圆下面留一条水写字
const H = 0.024, LAND_V = 0.046, LAND_H = 0.003, BACK_V = 0.135;          // 海面离书页多高；岸线；岸比海面高多少；模型最里边
const INK_Y = LAND_H + 0.0003;          // 数学那一层比水面高这么多
const CAP_TOP = -0.1165;          // 圆下面写字那条水的上沿（圆最低点 −0.1148 的船还开得到）
const TAU = Math.PI * 2, DEG = 180 / Math.PI;
const P3 = (p, y = 0) => new THREE.Vector3(p[0], y, -p[1]);
const angAt = (V, P, Q) => Math.abs(wrap(ang(sub(Q, V)) - ang(sub(P, V))));
const ccwStart = (V, P, Q) => { const a = ang(sub(P, V)), b = ang(sub(Q, V)); return wrap(b - a) > 0 ? a : b; };
const FR = (n, d) => `<span class="mfr"><span>${n}</span><span>${d}</span></span>`;
const fractionHTML = (s) => s.replace(/\{(\d+)\/(\d+)\}/g, (_, n, d) => FR(n, d));
const fmt = (r) => {
  const degrees = r * DEG;
  if (degrees > 0 && degrees < 0.5) return degrees < 0.01 ? '< 0.01°' : `${Number(degrees.toFixed(2))}°`;
  return `${Math.round(degrees)}°`;
};
const onCirc = (t) => [O[0] + R * Math.cos(t), O[1] + R * Math.sin(t)];
const dirO = (p) => Math.atan2(p[1] - O[1], p[0] - O[0]);
const AB = dirO(B0), AC = dirO(C0) + TAU;                     // 圆在海里的那段弧：从 B 逆时针经过最下面到 C
const shore = (u) => { const a = Math.abs(u); return 0.06 - 0.016 * Math.exp(-(((a - 0.06) / 0.022) ** 2)) + 0.012 * Math.exp(-(((a - 0.125) / 0.03) ** 2)); };          // 海岸线：两座灯塔站在伸进海里的岬角上，岬角外侧各有一个小湾
const VMAX = 0.076;          // 水面、海底一直铺到这里（被岸盖住的那部分看不见）
const OUT_KEY = [[0, -0.1715], [0.065, -0.1695], [0.118, -0.1635], [0.148, -0.1515], [0.165, -0.131], [0.1705, -0.098], [0.1712, -0.05], [0.1675, -0.005], [0.1712, 0.03], [0.162, 0.052], [0.147, 0.066], [0.153, 0.083], [0.1705, 0.098], [0.1685, 0.119], [0.151, 0.1325], [0.118, 0.1342], [0.083, 0.1235], [0.047, 0.1335], [0.008, 0.1215], [-0.032, 0.1318], [-0.071, 0.1225], [-0.106, 0.1335], [-0.142, 0.1295], [-0.1635, 0.111], [-0.1575, 0.086], [-0.1665, 0.061], [-0.1712, 0.034], [-0.1712, -0.012], [-0.1688, -0.062], [-0.162, -0.108], [-0.149, -0.143], [-0.122, -0.1625], [-0.068, -0.1702]];          // 模型外轮廓的点（从前沿正中往右、逆时针一圈）
const OUT_PTS = (() => { const K = OUT_KEY, n = K.length, out = []; for (let i = 0; i < n; i++) { const p0 = K[(i - 1 + n) % n], p1 = K[i], p2 = K[(i + 1) % n], p3 = K[(i + 2) % n]; for (let j = 0; j < 16; j++) { const t = j / 16, t2 = t * t, t3 = t2 * t; const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); out.push([Math.min(0.1718, Math.max(-0.1718, f(p0[0], p1[0], p2[0], p3[0]))), Math.min(0.1348, Math.max(-0.1718, f(p0[1], p1[1], p2[1], p3[1])))]); } } return out; })();
const inOutline = (u, v) => { let c = false; for (let i = 0, j = OUT_PTS.length - 1; i < OUT_PTS.length; j = i++) { const a = OUT_PTS[i], b = OUT_PTS[j]; if ((a[1] > v) !== (b[1] > v) && u < ((b[0] - a[0]) * (v - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
const OUT_RECT = [-0.172, -0.172, 0.344, 0.307];          // 遮罩贴图覆盖的长方形（u0, v0, 宽, 深）
const inSea = (p) => p[0] > SEA.u0 + 0.008 && p[0] < SEA.u1 - 0.008 && p[1] > SEA.v0 + 0.008 && p[1] < shore(p[0]) - 0.012;
const central = () => angAt(O, B0, C0);

export default {
  id: 'inscribed',
  fig: '图29.2-5',
  title: '圆周角',
  flow: 'explore',
  ask: '浅滩在水下，船上看不见，只看得见岸上两座灯塔。<br>船怎么知道自己进没进浅滩？',
  need: '开船找一找：小旗连成了什么？从浮标看又是多少度？',
  conclusion: {
    page: 134, rect: [40, 548, 368, 690],
    quote: '（节选）一条弧所对的圆周角等于它所对的圆心角的一半．……同弧或等弧所对的圆周角相等．半圆（或直径）所对的圆周角是直角，90°的圆周角所对的弦是直径（图29.2-7）．',
    why: '船在浅滩边那道弧上走，两座灯塔不动，从浮标（圆心）看两座灯塔的角就不变；船上的角是它的一半，所以也不变——同弧所对的圆周角相等。<br><br>为什么是一半：一束光正好照过浮标时，浮标到船、到另一座灯塔的两根绳子一样长（都是半径），两个底角相等；浮标那里的角是这个三角形的外角，等于两个底角的和，正好两倍。光从浮标旁边擦过时，过船拉一根穿过浮标的直径，把角拆成两块相加或相减，每块都是一半，合起来还是一半。<br><br>两座灯塔正好是直径两端的那一圈，处处都是 90°：半圆所对的圆周角是直角。<br><br>开进圈里，船上的角是圆上的角再加一块（三角形的外角），比危险角大；开到圈外，是圆上的角减去一块，比危险角小——所以只要量出的角小于危险角，船就在浅滩外面。',
    src: '课本第 127–128 页 · 29.2.3 圆周角；浅滩的问题在第 133 页',
  },

  create({ look, back, camera, aim }) {
    const group = new THREE.Group();
    let ui = null, dead = false;
    const T0 = performance.now();
    const now = () => (performance.now() - T0) / 1000;
    const later = (ms, f) => setTimeout(() => { if (!dead) f(); }, ms);

    // ================= 白天：一整块海港模型立在课本上，和系列一样受桌上的光 =================
    // 从书页往上：海底、海水（前面和两边的切面看得见水和海底）、岸。数学（圆、角、线、字母）画在水面那一层（group）里
    const root = new THREE.Group(); root.add(group); group.position.y = H;
    const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    const basic = (o) => new THREE.MeshBasicMaterial(o);
    const outMask = tex(1024, Math.round((1024 * OUT_RECT[3]) / OUT_RECT[2]), (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.beginPath(); OUT_PTS.forEach(([u, v], i) => { const x = ((u - OUT_RECT[0]) / OUT_RECT[2]) * w, y = (1 - (v - OUT_RECT[1]) / OUT_RECT[3]) * h; if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); g.fill(); });
    outMask.colorSpace = THREE.NoColorSpace;          // 模型外轮廓：白的地方是模型
    const OUT_GLSL = 'uniform sampler2D uMask; uniform vec4 uRect;\nbool outsideModel(vec2 p) { return texture2D(uMask, (p - uRect.xy) / uRect.zw).r < 0.5; }';
    const clip = (mat, ox, oz, name) => { const prev = mat.onBeforeCompile; mat.onBeforeCompile = (sh, r) => { if (prev) prev.call(mat, sh, r); sh.uniforms.uOff = { value: new THREE.Vector2(ox, oz) }; sh.uniforms.uMask = { value: outMask }; sh.uniforms.uRect = { value: new THREE.Vector4(...OUT_RECT) }; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform vec2 uOff; varying vec2 vPaper;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvPaper = vec2(position.x + uOff.x, -(position.z + uOff.y));'); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vPaper;\n' + OUT_GLSL).replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (outsideModel(vPaper)) discard;'); }; mat.customProgramCacheKey = () => 'clip-' + name; return mat; };          // 模型外轮廓外面的那部分不画
    const quiet = (m) => { m.raycast = () => {}; m.userData.noFrame = true; return m; };
    const lit = (o) => new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0, ...o });
    const solid = (m) => { m.castShadow = true; m.receiveShadow = true; m.raycast = () => {}; m.userData.noFrame = true; return m; };
    const glowTex = tex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,232,170,1)'); r.addColorStop(0.28, 'rgba(255,196,110,0.5)'); r.addColorStop(1, 'rgba(255,170,80,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
    const halo = (s, o = 1) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: o })); sp.scale.set(s, s, 1); return quiet(sp); };
    const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    const caustTex = tex(128, 128, (g, w, h) => {          // 光纹：一张能无缝平铺的网（离两个最近点的距离差小的地方亮）
      const N = 7, pts = []; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) pts.push([(i + 0.15 + Math.random() * 0.7) / N, (j + 0.15 + Math.random() * 0.7) / N]);
      const img = g.createImageData(w, h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const u0 = x / w, v0 = y / h, u = (u0 + 0.035 * Math.sin(2 * Math.PI * (3 * v0 + 0.3)) + 1) % 1, v = (v0 + 0.035 * Math.sin(2 * Math.PI * (2 * u0 + 0.7)) + 1) % 1; let f1 = 9, f2 = 9; for (const [px, py] of pts) { let dx = Math.abs(u - px), dy = Math.abs(v - py); dx = Math.min(dx, 1 - dx); dy = Math.min(dy, 1 - dy); const d = dx * dx + dy * dy; if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d; } const e = Math.sqrt(f2) - Math.sqrt(f1), k = Math.round(255 * Math.max(0, 1 - e * 24) ** 2), o = (y * w + x) * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = k; img.data[o + 3] = 255; }
      g.putImageData(img, 0, 0);
    });
    caustTex.wrapS = caustTex.wrapT = THREE.RepeatWrapping; caustTex.repeat.set(5.5, 3.6);
    // 水深（示意）：外海深；浅滩那一圈里慢慢浅上来（一片水下沙洲，边缘正好在圆附近）；靠岸变浅
    const depth = (u, v) => { const r = Math.hypot(u - O[0], v - O[1]), shoal = 1 - smooth(R - 0.03, R + 0.004, r); return (0.0165 - 0.0118 * shoal) * (0.42 + 0.58 * smooth(shore(u) + 0.002, shore(u) - 0.03, v)); };
    const seaW = SEA.u1 - SEA.u0, seaD = VMAX - SEA.v0, uc = (SEA.u0 + SEA.u1) / 2, vc = (SEA.v0 + VMAX) / 2;
    { // 海底：沙洲那里浅、颜色亮（透过水是一片青绿），外海深、颜色暗
      const g = new THREE.PlaneGeometry(seaW, seaD, 150, 84), p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), SAND = new THREE.Color(0xf3ebdc), MIDW = new THREE.Color(0x9cc1c9), DEEP = new THREE.Color(0x6b95a4);          // 素模：浅处是沙洲的石膏白，越深越透出水色
      for (let i = 0; i < p.count; i++) { const u = p.getX(i) + uc, v = p.getY(i) + vc, d = depth(u, v), k = clamp(1 - (d - 0.0045) / 0.0112, 0, 1); p.setXYZ(i, u, H - d, -v); if (k < 0.55) c.copy(DEEP).lerp(MIDW, k / 0.55); else c.copy(MIDW).lerp(SAND, smooth(0.55, 1, k)); c.multiplyScalar(1 + 0.025 * Math.sin(u * 900 + Math.sin(v * 400) * 2) * k); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
      const bm = lit({ vertexColors: true, roughness: 0.95, emissive: 0xfffbf0, emissiveIntensity: 0.12, emissiveMap: caustTex });
      bm.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance *= smoothstep(0.62, 0.92, vColor.r);'); };          // 光纹只在浅的沙上
      clip(bm, 0, 0, 'bed'); const bed = quiet(new THREE.Mesh(g, bm)); bed.receiveShadow = true; bed.userData.qaSupport = true; root.add(bed);
    }
    // 切面：上面是水（海里那段）或岸，下面是一层层的沙、泥、岩石
    const YM = H + LAND_H;
    // 岸上的地形：靠海那一带是平的（弧 BC、视线都画在上面），往里慢慢起伏成一道低山，中间（两座灯塔背后）低一点
    const HILL = 0.04, TOP = YM + HILL;
    const hill = (u, v) => { const k = smooth(0.084, BACK_V - 0.002, v), side = 0.58 + 0.42 * smooth(0.02, 0.17, Math.abs(u)), roll = 0.84 + 0.1 * Math.sin(u * 37 + 0.8) + 0.06 * Math.sin(u * 83 - 0.4); return HILL * k * Math.sqrt(k) * side * roll; };
    const landH = (u, v) => { const sh = shore(u); return hill(u, v) - (LAND_H + 0.0015) * smooth(sh + 0.003, sh - 0.005, v) - 0.016 * smooth(sh - 0.004, sh - 0.012, v); };          // 岸上的高度（比平地高多少；岸线前面斜下去）
    const faceTex = (sample, W0 = 1024) => tex(W0, 200, (g, w, hp) => {
      const Y = (y) => hp * (1 - y / TOP);
      for (let i = 0; i < w; i++) {
        const s = sample((i + 0.5) / w), top = s.land ? s.top ?? YM : s.bed;
        for (const [a, b, c] of [[0, 0.42, '#d6d0c4'], [0.42, 0.74, '#e2dcd0'], [0.74, 1, s.land ? '#ebe6dc' : '#efeae0']]) { g.fillStyle = c; g.fillRect(i, Y(top * b), 1, Y(top * a) - Y(top * b) + 1); }
        for (let k = 0; k < 3; k++) { g.fillStyle = `rgba(90,80,66,${0.03 + Math.random() * 0.06})`; g.fillRect(i, Y(Math.random() * top), 1, 2); }
        if (s.land) { g.fillStyle = '#f6f3ed'; g.fillRect(i, Y(top), 1, 3); }
        else { const gr = g.createLinearGradient(0, Y(H), 0, Y(s.bed)); gr.addColorStop(0, 'rgba(188,214,224,0.97)'); gr.addColorStop(1, 'rgba(138,170,184,0.97)'); g.fillStyle = gr; g.fillRect(i, Y(H), 1, Y(s.bed) - Y(H) + 1); g.fillStyle = 'rgba(236,247,252,0.95)'; g.fillRect(i, Y(H), 1, 2); }
      }
    });
    const face = (w, sample, x, z, ry) => { const m = quiet(new THREE.Mesh(new THREE.PlaneGeometry(w, TOP), lit({ map: faceTex(sample), transparent: true, alphaTest: 0.5, roughness: 0.9 }))); m.position.set(x, TOP / 2, z); m.rotation.y = ry; m.receiveShadow = true; m.userData.qaSupport = true; root.add(m); };
    const sideAt = (u, front) => (t) => { const v = front ? SEA.v0 + t * (BACK_V - SEA.v0) : BACK_V - t * (BACK_V - SEA.v0); return v >= shore(u) ? { land: true, top: YM + Math.max(0, hill(u, v)) } : { bed: H - depth(u, v) }; };
    void face; void sideAt;
    { // 四周的切面：沿着外轮廓走一圈（海那边是水和沙层，岸上那边跟着地形起伏）
      const pts = OUT_PTS, N = pts.length;
      const Ls = [0]; for (let i = 1; i <= N; i++) Ls.push(Ls[i - 1] + dist(pts[i - 1], pts[i % N])); const per = Ls[N];
      const surf = (u, v) => (v < shore(u) ? { bed: H - depth(u, v) } : { land: true, top: YM + Math.max(0, landH(u, v)) });
      const wt = faceTex((t) => { const x = t * per; let i = 0; while (i < N - 1 && Ls[i + 1] < x) i++; const f = (x - Ls[i]) / (Ls[i + 1] - Ls[i] || 1), a = pts[i], b = pts[(i + 1) % N]; return surf(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f); }, 4096);
      const pos = [], uvs = [], idx = [];
      for (let i = 0; i <= N; i++) { const q = pts[i % N]; pos.push(q[0], 0, -q[1], q[0], TOP, -q[1]); uvs.push(Ls[i] / per, 0, Ls[i] / per, 1); if (i < N) idx.push(2 * i, 2 * i + 2, 2 * i + 1, 2 * i + 1, 2 * i + 2, 2 * i + 3); }
      const wg2 = new THREE.BufferGeometry(); wg2.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); wg2.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); wg2.setIndex(idx); wg2.computeVertexNormals();
      const n0 = new THREE.Vector3().fromBufferAttribute(wg2.attributes.normal, 0); if (n0.x * pts[0][0] - n0.z * (pts[0][1] + 0.0185) < 0) { const ix = wg2.index.array; for (let i = 0; i < ix.length; i += 3) { const tmp = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = tmp; } wg2.index.needsUpdate = true; wg2.computeVertexNormals(); }          // 法线朝外
      const wall = quiet(new THREE.Mesh(wg2, lit({ map: wt, transparent: true, alphaTest: 0.5, roughness: 0.9, side: THREE.DoubleSide }))); wall.receiveShadow = true; wall.userData.qaSupport = true; root.add(wall);          // 两面都画：斜着看时，水面和海底的边对不齐，中间靠切面里侧补上
    }
    { // 岸：一条矮矮的沙滩、后面是草地；岸线那一面是沙和石头
      const top = tex(1024, 256, (g, w, h) => {
        const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#f1ece2'); gr.addColorStop(0.2, '#f4f0e8'); gr.addColorStop(1, '#f6f3ed'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        for (let k = 0; k < 2600; k++) { g.fillStyle = `rgba(120,110,95,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      });
      const VL0 = 0.034, lg = new THREE.PlaneGeometry(seaW, BACK_V - VL0, 190, 72).rotateX(-Math.PI / 2), lp = lg.attributes.position, lc = new Float32Array(lp.count * 3), cc = new THREE.Color(), SANDL = new THREE.Color(0xf2eadb), FLAT = new THREE.Color(0xf5f2ea), SLOPE = new THREE.Color(0xe6e9de), WET = new THREE.Color(0xd8cdb9);
      for (let i = 0; i < lp.count; i++) { const u = lp.getX(i) + uc, v = -lp.getZ(i) + (VL0 + BACK_V) / 2, sh = shore(u), hh = landH(u, v); lp.setY(i, hh); cc.copy(SANDL).lerp(FLAT, smooth(sh + 0.002, sh + 0.02, v)).lerp(SLOPE, smooth(0.0015, 0.016, hh)).lerp(WET, smooth(-0.0005, -0.003, hh)); lc[i * 3] = cc.r; lc[i * 3 + 1] = cc.g; lc[i * 3 + 2] = cc.b; }
      lg.setAttribute('color', new THREE.BufferAttribute(lc, 3)); lg.computeVertexNormals();
      const lm = lit({ map: top, vertexColors: true, roughness: 0.95 });
      lm.onBeforeCompile = (sh) => {          // 山坡上细细的等高线（像地形模型一层层的边）
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vHy;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvHy = position.y;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vHy;').replace('#include <color_fragment>', '#include <color_fragment>\n{ float hh = vHy / 0.0042; float f = abs(fract(hh - 0.5) - 0.5) / max(fwidth(hh), 1e-4); diffuseColor.rgb *= 1.0 - 0.14 * (1.0 - smoothstep(0.0, 1.3, f)) * step(0.0011, vHy); }');
      };
      clip(lm, uc, -(VL0 + BACK_V) / 2, 'land'); const t = quiet(new THREE.Mesh(lg, lm)); t.position.set(uc, YM, -(VL0 + BACK_V) / 2); t.receiveShadow = true; t.castShadow = true; root.add(t);
      // 灯塔脚下外侧几块礁石（只放在外侧和后面，不挡弧 BC、不挡视线）
      const rockMat = lit({ color: 0xe0d9cb, roughness: 0.93, flatShading: true });
      const groundAt = (u, v) => YM + landH(u, v);
      const rock = (u, v, r, sy, rot) => { const g = new THREE.IcosahedronGeometry(r, 1), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = 1 + 0.2 * Math.sin(x * 2100 + y * 1700) * Math.cos(z * 1900 + 0.5); p.setXYZ(i, x * n, y * n * sy, z * n); } g.computeVertexNormals(); const m = solid(new THREE.Mesh(g, rockMat)); m.position.set(u, groundAt(u, v) + r * sy * 0.3, -v); m.rotation.y = rot; root.add(m); };
      for (const [cu, o] of [[B0[0], -1], [C0[0], 1]]) { rock(cu + o * 0.014, 0.0478, 0.0042, 0.62, 0.4); rock(cu + o * 0.021, 0.054, 0.0056, 0.5, 1.2); rock(cu + o * 0.009, 0.062, 0.0036, 0.56, 2.1); rock(cu + o * 0.029, 0.058, 0.0032, 0.6, 0.9); }
    }
    // 水面：半透明，透得出下面的沙洲；一层细细的波纹慢慢走
    const waves = tex(256, 256, (g, w, h) => {
      const img = g.createImageData(w, h), K = (2 * Math.PI) / 256, W = [[3, 1, 0.6, 0], [-2, 4, 0.5, 1.3], [5, -3, 0.32, 2.1], [1, 6, 0.25, 0.7]];
      const hh = (x, y) => W.reduce((s, [a, b, A, ph]) => s + A * Math.sin(K * (a * x + b * y) + ph), 0);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = hh(x + 1, y) - hh(x - 1, y), dy = hh(x, y + 1) - hh(x, y - 1), l = Math.hypot(dx, dy, 2), k = (y * w + x) * 4; img.data[k] = (-dx / l * 0.5 + 0.5) * 255; img.data[k + 1] = (-dy / l * 0.5 + 0.5) * 255; img.data[k + 2] = (2 / l * 0.5 + 0.5) * 255; img.data[k + 3] = 255; }
      g.putImageData(img, 0, 0);
    });
    waves.colorSpace = THREE.NoColorSpace; waves.wrapS = waves.wrapT = THREE.RepeatWrapping; waves.repeat.set(7, 4);
    const seaAlpha = tex(256, 160, (g, w, h) => { const img = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const u = SEA.u0 + (x / (w - 1)) * seaW, v = SEA.v0 + (1 - y / (h - 1)) * seaD, k = clamp((depth(u, v) - 0.0047) / 0.0118, 0, 1), a = Math.round(255 * (0.18 + 0.36 * k)), o = (y * w + x) * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = a; img.data[o + 3] = 255; } g.putImageData(img, 0, 0); });
    seaAlpha.colorSpace = THREE.NoColorSpace;          // 水的浓淡跟着水深：外海浓、浅滩清
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(seaW, seaD).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x8cb8c6, transparent: true, opacity: 1, alphaMap: seaAlpha, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, normalMap: waves, normalScale: new THREE.Vector2(0.16, 0.16), depthWrite: false }));
    clip(sea.material, uc, -vc, 'sea'); sea.position.set(uc, 0.0004, -vc); sea.receiveShadow = true; sea.renderOrder = -1; group.add(sea);          // 水面先画：上面的线、角不被水染成别的颜色
    const foamTex = tex(512, 32, (g, w, h) => { for (let x = 0; x < w; x++) { const a = 0.55 + 0.45 * Math.sin(x * 0.11) * Math.sin(x * 0.037 + 1.3); const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, `rgba(255,255,255,${0.95 * a})`); gr.addColorStop(0.35, `rgba(255,255,255,${0.45 * a})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x, 0, 1, h); } });
    foamTex.wrapS = THREE.RepeatWrapping; foamTex.repeat.set(3, 1);
    const foamGeo = (() => { const pos = [], uvs = [], idx = [], N = 160; for (let i = 0; i <= N; i++) { const u = SEA.u0 + (seaW * i) / N, sh = shore(u); pos.push(u, 0, -(sh + 0.0008), u, 0, -(sh - 0.0058)); uvs.push((3 * i) / N, 1, (3 * i) / N, 0); if (i < N) idx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 2, 2 * i + 1, 2 * i + 3); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(idx); return g; })();
    foamTex.repeat.set(1, 1);
    const foam = quiet(new THREE.Mesh(foamGeo, basic({ map: foamTex, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide })));
    clip(foam.material, 0, 0, 'foam'); foam.position.set(0, 0.0007, 0); foam.renderOrder = 1; group.add(foam);          // 岸边的浪花（画在水面上、沿着岸线）
    // 数学那一层：比岸顶高一点点，线一直画到灯塔脚下也不会钻进岸里
    const ink = new THREE.Group(); ink.position.y = LAND_H + 0.0003; group.add(ink);

    // ================= 字：板书（左边纸面板）、重拍（场景里一闪）、提示（面板上一行） =================
    const caption = new THREE.Object3D();          // 以前天幕上的字幕：不要了（留个空壳，船头视角那几处还会设它的 visible）
    let capNow = ['', ''];
    const subEl = document.createElement('div');
    subEl.style.cssText = 'position:fixed;left:50%;bottom:44px;transform:translateX(-50%);max-width:min(860px,86vw);text-align:center;pointer-events:none;font:600 22px/1.45 "Kaiti SC","STKaiti",serif;color:#fbf1dc;text-shadow:0 1px 8px rgba(0,0,0,.85),0 0 2px rgba(0,0,0,.9);opacity:0;transition:opacity .4s;z-index:20';
    document.body.append(subEl);
    const subtitle = () => {
      if (!S || S.mode !== 'deck') { subEl.style.opacity = 0; return; }
      if (S.intro) { subEl.innerHTML = '<div style="font-size:30px;color:#fff4dc">船怎么知道自己进没进浅滩？</div><div style="font-weight:400;font-size:17px;opacity:.9">浅滩在水下，只看得见岸上的两座灯塔。这个模型把危险角定为 40°</div>'; subEl.style.opacity = 1; return; }
      const th = theta(), z = zone(), col = z === 'in' ? '#ff9d86' : z === 'out' ? '#b4f0c4' : '#ffe39a';
      subEl.innerHTML = `<div style="font-size:30px;color:${col}">两座灯塔之间 ${shipAngle(th)}<span style="font-size:18px;color:#efe1c2;margin-left:14px">危险角 ${fmt(DANGER)}</span></div><div style="font-weight:400;font-size:17px;opacity:.88">按住往上拖，往前开；往两边拖，往旁边开</div>`;
      subEl.style.opacity = 1;
    };
    const css = document.createElement('style');
    css.textContent = `
.mfr{display:inline-block;vertical-align:middle;text-align:center;font-style:normal;font-size:0.86em;line-height:1.12;margin:0 0.08em}.mfr>span{display:block;padding:0 0.12em}.mfr>span:first-child{border-bottom:1px solid currentColor}
.ins-board{margin:4px 0 6px;display:flex;flex-direction:column;gap:8px;font:15px/1.7 "Kaiti SC","STKaiti","Songti SC",serif;color:#2b2722}
.ins-board .ib-row{opacity:0;transform:translateY(5px);transition:opacity .5s,transform .5s,background-color 2.4s;padding:3px 8px 3px 6px;border-radius:5px;border-left:3px solid transparent}
.ins-board .ib-row.in{opacity:1;transform:none}
.ins-board .ib-row.fresh{background:rgba(255,206,110,.34);border-left-color:#d98a2b}
.ins-board .n{display:inline-block;min-width:1.25em;color:#b0532a;font-weight:700}
.ins-board b{color:#8a2f1d}
.ins-board i{font-family:"Times New Roman",serif;font-style:italic;letter-spacing:.02em}
.ins-board .ia{color:#cc6418;font-weight:600}.ins-board .ca{color:#2c6aa8;font-weight:600}.ins-board .p1{color:#c23a6c;font-weight:600}.ins-board .p2{color:#17877d;font-weight:600}
.ins-board .ib-h{font:600 12px/1.3 "PingFang SC","Hiragino Sans GB",sans-serif;color:#a07a45;letter-spacing:.3em;margin:6px 0 -4px;opacity:0;transition:opacity .4s}
.ins-board .ib-h.in{opacity:1}
.ins-board.review .ib-row[data-k]{cursor:pointer}.ins-board.review .ib-row[data-k]:hover{background:rgba(255,206,110,.16)}
.ins-board .ib-row.sel{background:rgba(255,206,110,.34);border-left-color:#d98a2b}`;
    document.head.append(css);
    // 板书：学生做出一样，就用课本的话写一行；只写已经发现的，不预先列出后面要做什么
    let boardEl = null, lastH = ''; const boardRows = [];
    const reveal = (r) => { const body = boardEl?.closest('.p-body'); if (!body) return; setTimeout(() => { const rb = r.getBoundingClientRect(), bb = body.getBoundingClientRect(); if (rb.bottom > bb.bottom - 14) body.scrollBy({ top: rb.bottom - bb.bottom + 28, behavior: 'smooth' }); }, 80); };          // 新的一行在面板下面看不见：面板自己滚上来
    const KEYS = { 1: 'arc', 2: 'def', 3: 'center', 4: 'two', 5: 'vary', 6: 'cls', 7: 'c1', 8: 'c2', 9: 'c3', 10: 'thm', 11: 'same', 12: 'right' };
    const board = (html, hold = false) => {
      const r = document.createElement('div'); r.className = 'ib-row'; r.innerHTML = html; boardRows.push(r);
      const no = html.match(/class="n">(\d+)</); r.dataset.k = no ? KEYS[no[1]] : html.includes('<b>答</b>') ? 'ans' : '';
      for (const o of boardRows) if (o !== r) o.classList.remove('fresh');
      if (boardEl) { boardEl.append(r); if (!hold) requestAnimationFrame(() => { r.classList.add('in', 'fresh'); reveal(r); }); }
      return r;
    };
    board.h = (title) => { if (title === lastH) return; lastH = title; const r = document.createElement('div'); r.className = 'ib-h'; r.textContent = title; boardRows.push(r); if (boardEl) { boardEl.append(r); requestAnimationFrame(() => { r.classList.add('in'); reveal(r); }); } };
    // 重拍：发现的那一下长在图形上——那块光亮一下、鼓一下，从那一点荡开两圈光；板书上同时长出那一行（不压暗屏幕，不飞大字）
    const ripples = []; let flashAt = -9;
    const ring = (p, col, delay = 0, grow = 0.024, peak = 0.7, life = 1.4) => { const m = quiet(new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 72).rotateX(-Math.PI / 2), basic({ color: col, transparent: true, opacity: 0, depthWrite: false }))); m.position.set(p[0], 0.0006, -p[1]); Object.assign(m.userData, { born: now() + delay, grow, peak, life }); ink.add(m); ripples.push(m); };
    function punch(p, html, row) {
      void html; flashAt = now(); sfx.ding(1320, { gain: 0.07 });
      ring(p, GOLD); ring(p, BLUE, 0.28);
      later(650, () => { if (row) { row.classList.add('in', 'fresh'); reveal(row); } });
    }
    const promptNow = () => {
      const n = lanterns.length;
      if (!S.circle) return n === 0 ? '拖着小船开一开：船上看两座灯塔，夹角是多少？' : n < 5 || arcSpread() < 1.0 ? '正好 40° 的地方，船会放下一面小旗。多开几个地方' : '点一下海面：这些小旗连起来是什么？';
      if (S.circle < 1) return '';
      if (!S.walked) return '把船开到圆上（靠近会吸住），沿着圆开一开';
      if (!S.buoy) return '点浮标：从圆心看，弧 BC 是多少度？';
      if (S.cut.length < 2) return '按住船边那个角，剪下来拖到浮标那里（剪两块）';
      if (S.proof && !S.proofDone) return '把这两个相等的底角拖到浮标那里';
      if (!S.proofDone) return '为什么是一半？开到让一座灯塔的视线正好穿过浮标的地方';
      if (!S.theorem) return S.caseMode ? '沿着圆开：圆心在角里面、在角外面，各看一次' : '沿着圆开到别处，点浮标：过船作一条直径';
      if (!S.answered) return '开进浅滩、开出浅滩，看船上的角怎么变';
      if (!S.family) return '点一下海面：别的角度都在哪儿？';
      return '';
    };
    let promptKey = '';
    const say = (txt, sub2 = '') => { capNow = [txt, sub2]; subtitle(); const pm = promptNow(); if (pm !== promptKey && ui?.status) { promptKey = pm; ui.status(pm); } };

    // ---- 灯塔：白身红箍，站在岸上 ----
    const tower = (P) => {
      const g = new THREE.Group(); g.position.copy(P3(P, LAND_H));
      const porcelain = lit({ color: 0xf7f4ee, roughness: 0.32 });
      const foot = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0046, 0.0052, 0.0028, 28), lit({ color: 0xe6e1d7, roughness: 0.9 }))); foot.position.y = 0.0014;
      const body = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0026, 0.0037, 0.034, 32), porcelain)); body.position.y = 0.0028 + 0.017;
      const gal = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0041, 0.0041, 0.0008, 28), lit({ color: 0xdcd7cd, roughness: 0.4 }))); gal.position.y = 0.0372;
      const lamp = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.0038, 20), lit({ color: 0xffe2a6, emissive: 0xffb340, emissiveIntensity: 2.2, roughness: 0.25 }))); lamp.position.y = 0.0395;
      const roof = solid(new THREE.Mesh(new THREE.ConeGeometry(0.0031, 0.0040, 28), porcelain)); roof.position.y = 0.0434;
      const tip = solid(new THREE.Mesh(new THREE.SphereGeometry(0.0006, 10, 8), porcelain)); tip.position.y = 0.0459;
      const glow = halo(0.016, 0.5); glow.position.y = 0.0395; g.userData.glow = glow;
      g.add(foot, body, gal, lamp, roof, tip, glow); group.add(g); return g;
    };
    const LH = [tower(B0), tower(C0)];
    // ---- 浮标（圆心）：红色的罐形浮标；该点它的时候，水面上一圈橙色的环一闪一闪 ----
    const buoy = new THREE.Group();
    { const body = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0026, 0.0034, 0.006, 22), lit({ color: 0xf5f2ec, roughness: 0.35 }))); body.position.y = 0.0012;
      const band = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.00266, 0.00276, 0.0011, 22), lit({ color: 0xdcd7cd, roughness: 0.6 }))); band.position.y = 0.0026;
      const top = solid(new THREE.Mesh(new THREE.SphereGeometry(0.0017, 18, 12), lit({ color: 0xcfe9ff, emissive: 0x3d9cff, emissiveIntensity: 1.1, roughness: 0.2 }))); top.position.y = 0.0058;
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.0074, 0.0092, 48).rotateX(-Math.PI / 2), basic({ color: 0x3d9cff, transparent: true, opacity: 0, depthWrite: false })); ring.position.y = 0.0007; ring.raycast = () => {}; ring.userData.noFrame = true;
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.012, 16), basic({ transparent: true, opacity: 0, depthWrite: false })); pick.position.y = 0.006; pick.userData.noFrame = true;
      buoy.add(body, band, top, ring, pick); buoy.userData.halo = ring; }
    buoy.position.copy(P3(O)); group.add(buoy);
    // ---- 小船 ----
    const boat = new THREE.Group();
    { const L = 0.0145, W = 0.0064, D = 0.0034, sh = new THREE.Shape();
      sh.moveTo(-L, -W * 0.4); sh.quadraticCurveTo(-L * 1.06, 0, -L, W * 0.4); sh.quadraticCurveTo(L * 0.15, W * 0.64, L, 0); sh.quadraticCurveTo(L * 0.15, -W * 0.64, -L, -W * 0.4);
      const hg = new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: true, bevelThickness: 0.0005, bevelSize: 0.0005, bevelSegments: 2, curveSegments: 14 }).rotateX(-Math.PI / 2); hg.translate(0, -0.0012, 0);
      const hull = solid(new THREE.Mesh(hg, lit({ color: 0xfbf9f4, roughness: 0.38 })));
      const deck = solid(new THREE.Mesh(new THREE.ShapeGeometry(sh, 14).rotateX(-Math.PI / 2).scale(0.82, 1, 0.78), lit({ color: 0xe9e1d2, roughness: 0.7 }))); deck.position.set(-0.0008, D - 0.0012 + 0.00052, 0);
      const mast = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0003, 0.00034, 0.021, 8), lit({ color: 0xd9d2c4, roughness: 0.5 }))); mast.position.set(0.0022, D + 0.0093, 0);
      // 帆：细分的三角面，中间鼓出去一点
      const sailGeo = (A, B, C, belly, n = 8) => { const pos = [], idx = []; for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) { const a = i / n, b = j / n, c = 1 - a - b; const x = A[0] * c + B[0] * a + C[0] * b, y = A[1] * c + B[1] * a + C[1] * b; pos.push(x, y, belly * 27 * a * b * c); } let k = 0; const row = []; for (let i = 0; i <= n; i++) { row.push(k); k += n - i + 1; } for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) { const p0 = row[i] + j, p1 = row[i + 1] + j, p2 = row[i] + j + 1; idx.push(p0, p1, p2); if (j < n - i - 1) idx.push(p2, p1, row[i + 1] + j + 1); } const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g2.setIndex(idx); g2.computeVertexNormals(); return g2; };
      const sailMat = lit({ color: 0xfffcf4, roughness: 0.62, side: THREE.DoubleSide });
      const main = solid(new THREE.Mesh(sailGeo([0.0019, D + 0.0012], [0.0019, D + 0.0196], [-0.0105, D + 0.0016], 0.0014), sailMat));
      const jib = solid(new THREE.Mesh(sailGeo([0.0026, D + 0.0016], [0.0026, D + 0.0165], [0.0128, D + 0.0006], -0.0009, 6), sailMat));
      const boom = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.00022, 0.00022, 0.0125, 6).rotateZ(Math.PI / 2), lit({ color: 0xd9d2c4, roughness: 0.5 }))); boom.position.set(-0.0043, D + 0.0012, 0);
      boat.add(hull, deck, mast, main, jib, boom); boat.userData.rig = [mast, main, jib, boom]; }
    group.add(boat);

    // ================= 光、线、角、字 =================
    // 光带的样子：中间实、两边柔和地淡掉，像投在白模上的光
    const beamTex = tex(64, 4, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); for (const [o, a] of [[0, 0], [0.18, 0.18], [0.36, 0.75], [0.5, 1], [0.64, 0.75], [0.82, 0.18], [1, 0]]) gr.addColorStop(o, `rgba(255,255,255,${a})`); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    beamTex.colorSpace = THREE.NoColorSpace;
    const GOLD = 0xf29a16, BLUE = 0x2f86e8;          // 两种光：圆周角那一族是金色，圆心角那一族是蓝色（场景、板书、刻度一致）
    const P1 = 0xd6457a, P2 = 0x1f9e93;          // 情况（2）（3）按“对着同一段弧”配对：玫红一对、青色一对（和金色的目标角分得开）
    const RC = 0.034;          // 船上的角、剪下的角片、圆心角都用同一个半径：拼进去比的是角，没有东西变大
    // 视线：从船到两座灯塔的两条光（角的两边）
    const band = () => { const m = quiet(new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), basic({ color: GOLD, map: beamTex, transparent: true, depthWrite: false, opacity: 0.9 }))); m.position.y = 0.0012; ink.add(m); return m; };
    const setBand = (m, P, Q, w) => { const d = sub(Q, P), l = Math.hypot(...d); m.position.x = (P[0] + Q[0]) / 2; m.position.z = -(P[1] + Q[1]) / 2; m.rotation.set(0, Math.atan2(d[1], d[0]) - Math.PI / 2, 0); m.scale.set(w, 1, Math.max(1e-4, l)); };
    const BAND = [band(), band()];
    // 细线（绳子、虚线、圆）：贴在水面上的细带子
    const line = (color, w, y, o = 1, dash = 0, blend = THREE.NormalBlending) => { const m = quiet(new THREE.Mesh(new THREE.BufferGeometry(), basic({ color, map: beamTex, transparent: true, opacity: o, depthWrite: false, blending: blend }))); m.position.y = y; m.userData.w = w * 2.4; m.userData.dash = dash; ink.add(m); return m; };
    const setLine = (m, pts, closed = false) => {
      if (!pts || pts.length < 2) { m.visible = false; return; }
      const w = m.userData.w / 2, dash = m.userData.dash, out = [], uvs = [], P = closed ? [...pts, pts[0]] : pts;
      let acc = 0;
      const push = (p, q, n) => { out.push(p[0] + n[0], 0, -(p[1] + n[1]), p[0] - n[0], 0, -(p[1] - n[1]), q[0] + n[0], 0, -(q[1] + n[1]), q[0] + n[0], 0, -(q[1] + n[1]), p[0] - n[0], 0, -(p[1] - n[1]), q[0] - n[0], 0, -(q[1] - n[1])); uvs.push(0, 0.5, 1, 0.5, 0, 0.5, 0, 0.5, 1, 0.5, 1, 0.5); };
      for (let i = 0; i < P.length - 1; i++) {
        const a = P[i], b = P[i + 1], d = sub(b, a), l = Math.hypot(...d); if (l < 1e-7) continue;
        const n = [(-d[1] / l) * w, (d[0] / l) * w];
        if (!dash) push(a, b, n);
        else { let t = 0; while (t < l - 1e-9) { const ph = (acc + t) % (dash * 2), on = ph < dash, step = Math.max(1e-6, Math.min(l - t, on ? dash - ph : dash * 2 - ph)); if (on) push(add(a, mul(d, t / l)), add(a, mul(d, (t + step) / l)), n); t += step; } acc += l; }
      }
      m.geometry.dispose(); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); m.geometry = g; m.visible = out.length > 0;
    };
    const L = {
      circle: line(GOLD, 0.001, 0.0016, 0.95, 0.003), OB: line(BLUE, 0.0009, 0.0015, 1), OC: line(BLUE, 0.0009, 0.0015, 1),
      rope1: line(0x8b5cf6, 0.0011, 0.0019), rope2: line(0x8b5cf6, 0.0011, 0.0019), tick1: line(0x8b5cf6, 0.0011, 0.002), tick2: line(0x8b5cf6, 0.0011, 0.002),
      rope3: line(0x8b5cf6, 0.0011, 0.0019), tick3: line(0x8b5cf6, 0.0011, 0.002),
      live1: line(GOLD, 0.0008, 0.0016, 0.9), live2: line(GOLD, 0.0008, 0.0016, 0.9),          // 改变弧 BC：过两座灯塔和船的那个圆（下面被字挡住的地方断开）
      probe: line(0x3b4757, 0.0011, 0.0022, 0.95, 0.0026), ghost: line(0x3b4757, 0.0007, 0.002, 0.45, 0.0014),          // 船上那根能转的光；卡住很久才出的提示虚线
      sa0: line(P1, 0.0018, 0.0019, 1, 0, THREE.NormalBlending), sa1: line(P2, 0.0018, 0.0019, 1, 0, THREE.NormalBlending),          // D 把弧 BC 分成的两段
      tgtA: line(GOLD, 0.0011, 0.0042, 1), tgtO: line(BLUE, 0.0011, 0.0042, 1),          // 拆开拼的时候，要证的 ∠BAC、∠BOC 一直用细弧圈着
      diam: line(0x3b4757, 0.0009, 0.0021, 0.95, 0.0026), ext: line(GOLD, 0.001, 0.0018, 1, 0.0028), ext2: line(GOLD, 0.001, 0.0018, 1),
      arcBC: line(BLUE, 0.0014, 0.0017, 1),          // 两座灯塔之间那段弧（在岸上）：圆周角、圆心角对着的就是它
    };
    // 扇形（一块光）
    // 角片的亮边和影子：边是一圈细亮线；影子是同样形状的一块淡影，落在水面上（拿起来离得远）
    const TILE = new Map();
    const tile = (m, rim, o = 0.75, shade = true, w = 0.0008) => { TILE.set(m, { rim, o, shade, w }); return m; };
    const rimFan = (m, a0, w, r) => {
      const c = TILE.get(m), n = Math.max(6, Math.ceil(Math.abs(w) / 0.05)), pts = [[0, 0]], hw = c.w / 2, out = [];
      for (let i = 0; i <= n; i++) { const t = a0 + (w * i) / n; pts.push([Math.cos(t) * r, Math.sin(t) * r]); }
      pts.push([0, 0]);
      for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); if (l < 1e-7) continue; const nx = (-dy / l) * hw, ny = (dx / l) * hw; out.push(a[0] + nx, 0, -(a[1] + ny), a[0] - nx, 0, -(a[1] - ny), b[0] + nx, 0, -(b[1] + ny), b[0] + nx, 0, -(b[1] + ny), a[0] - nx, 0, -(a[1] - ny), b[0] - nx, 0, -(b[1] - ny)); }
      const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
      if (!c.rimM) { c.rimM = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: c.rim, transparent: true, opacity: c.o, depthWrite: false, side: THREE.DoubleSide })); c.rimM.position.y = 0.00012; c.rimM.raycast = () => {}; m.add(c.rimM); } else { c.rimM.geometry.dispose(); c.rimM.geometry = rg; }
      if (c.shade) { if (!c.shadeM) { c.shadeM = new THREE.Mesh(m.geometry, new THREE.MeshBasicMaterial({ color: 0x0b1a24, transparent: true, opacity: 0.15, depthWrite: false, side: THREE.DoubleSide })); c.shadeM.raycast = () => {}; c.shadeM.renderOrder = -0.5; m.add(c.shadeM); } else c.shadeM.geometry = m.geometry; }
    };
    const fanM = (color, opacity, y, blend = THREE.NormalBlending) => { const m = new THREE.Mesh(new THREE.BufferGeometry(), basic({ color, transparent: true, opacity, depthWrite: false, blending: blend, side: THREE.DoubleSide })); m.position.y = y; m.userData.noFrame = true; ink.add(m); m.visible = false; return m; };
    const setFan = (m, apex, a0, w, r) => { const n = Math.max(6, Math.ceil(Math.abs(w) / 0.05)), pos = []; for (let i = 0; i < n; i++) { const t0 = a0 + (w * i) / n, t1 = a0 + (w * (i + 1)) / n; pos.push(0, 0, 0, Math.cos(t0) * r, 0, -Math.sin(t0) * r, Math.cos(t1) * r, 0, -Math.sin(t1) * r); } m.geometry.dispose(); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); m.geometry = g; m.position.x = apex[0]; m.position.z = -apex[1]; m.visible = true; if (TILE.has(m)) rimFan(m, a0, w, r); };
    const F = { ship: fanM(GOLD, 0.42, 0.0013), buoy: fanM(BLUE, 0.3, 0.0012), sub1: fanM(0xffd08a, 0.55, 0.0017), sub2: fanM(0x9fd0ff, 0.55, 0.0016), q: fanM(GOLD, 0.34, 0.0013), x: fanM(0xff8a3d, 0.5, 0.0017) };
    for (const k in F) F[k].raycast = () => {};
    tile(F.buoy, 0x1d5fae, 0.75, false, 0.0009);          // 圆心角像一个槽：深蓝的边圈着
    // 能拿起来拖的光扇（剪下来的、证明里的两个底角）
    const chips = [0xff9a1a, 0xffc35c].map((c) => tile(fanM(c, 0.92, 0.0024), 0xfff7e6));
    // 字：朝着镜头的牌子（先量字宽再画）
    const measure = (font, txt) => { const g = document.createElement('canvas').getContext('2d'); g.font = font; return g.measureText(txt).width; };
    // 字：和课本插图一样——字母用斜体，度数、名称用宋体；白色描边垫底，压在水面、线上也认得出
    const labTex = (txt, col, px = 64) => { const f = /^[A-Z]$/.test(txt) ? `italic 500 ${px * 1.08}px "Times New Roman",serif` : `600 ${px}px "Times New Roman","Songti SC","STSong",serif`; return tex(Math.ceil(measure(f, txt)) + 40, Math.round(px * 1.5), (g, w, h) => { g.font = f; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = px * 0.1; g.strokeStyle = 'rgba(255,253,248,0.8)'; g.strokeText(txt, w / 2, h / 2 + 2); g.fillStyle = col; g.fillText(txt, w / 2, h / 2 + 2); }); };
    const label = (hgt) => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }))); sp.renderOrder = 20; sp.userData.h = hgt; sp.userData.k = ''; ink.add(sp); sp.visible = false; return sp; };
    const setLabel = (sp, txt, col, p, y = 0.008) => { if (!txt) { sp.visible = false; return; } const k = txt + col; if (sp.userData.k !== k) { sp.userData.k = k; const t = labTex(txt, col); sp.material.map?.dispose?.(); sp.material.map = t; sp.material.needsUpdate = true; sp.scale.set((sp.userData.h * t.image.width) / t.image.height, sp.userData.h, 1); } sp.position.set(p[0], y, -p[1]); sp.visible = true; };
    const LB = { ship: label(0.013), buoy: label(0.011), q: label(0.009), a: label(0.0095), o: label(0.0095), b: label(0.0095), c: label(0.0095), d: label(0.0095), arc: label(0.0082), w0: label(0.0105), w1: label(0.0105) };
    // 海面上的批注（船长在海图上写的）：躺在水面上的手写字
    const NF = '600 46px "Kaiti SC","STKaiti",serif';
    const noteTex = (txt) => tex(Math.ceil(measure(NF, txt)) + 48, 76, (g, w, h) => { g.font = NF; g.textBaseline = 'middle'; g.shadowColor = 'rgba(4,14,28,0.95)'; g.shadowBlur = 12; g.fillStyle = 'rgba(248,236,206,0.96)'; g.fillText(txt, 24, h / 2 + 2); g.shadowBlur = 4; g.fillText(txt, 24, h / 2 + 2); });
    const notes = []; let dblNote = null;
    const note = () => ({ userData: {} });          // 以前写在水面上的批注：都改写进板书了
    const noteOld = (txt, p) => { const t = noteTex(txt), hgt = 0.0084; const m = quiet(new THREE.Mesh(new THREE.PlaneGeometry((hgt * t.image.width) / t.image.height, hgt).rotateX(-Math.PI / 2), basic({ map: t, transparent: true, depthWrite: false, opacity: 0 }))); m.position.set(p[0], 0.0021, -p[1]); m.userData.born = now(); m.userData.txt = txt; group.add(m); notes.push(m); return m; };
    // 河灯
    const lanterns = [];
    const flagMat = lit({ color: 0xffb13d, emissive: 0xff9a1f, emissiveIntensity: 0.35, roughness: 0.5, side: THREE.DoubleSide }), poleMat = lit({ color: 0xd8d2c6, roughness: 0.6 }), floatMat = lit({ color: 0xf7f4ee, roughness: 0.4 });
    const flagGeo = new THREE.BufferGeometry(); flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.0013, 0, 0, -0.0013, 0, 0.0034, 0, 0], 3)); flagGeo.computeVertexNormals();
    const dropLantern = (p) => {
      if (lanterns.some((l) => dist(l.p, p) < 0.011)) return;
      const g = new THREE.Group(), body = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0018, 0.0022, 14), floatMat)); body.position.y = 0.0006;
      const pole = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0002, 0.0002, 0.0072, 6), poleMat)); pole.position.y = 0.0044;
      const flag = solid(new THREE.Mesh(flagGeo, flagMat)); flag.position.set(0.0002, 0.0068, 0); flag.rotation.y = Math.atan2(p[1] - O[1], p[0] - O[0]);
      g.add(body, pole, flag); g.position.copy(P3(p)); g.userData.born = now(); group.add(g); lanterns.push({ p, g, body });
      sfx.ding(1180 + Math.random() * 160, { gain: 0.035, decay: 0.6 });
    };
    // 整片海的等角线（点海面才出来）：着色器算每一点“看两座灯塔是多少度”，每 10° 一条
    const contour = quiet(new THREE.Mesh(new THREE.PlaneGeometry(seaW, seaD).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uMask: { value: outMask }, uRect: { value: new THREE.Vector4(...OUT_RECT) }, B: { value: new THREE.Vector2(B0[0], -B0[1]) }, C: { value: new THREE.Vector2(C0[0], -C0[1]) }, th0: { value: DANGER * DEG }, k: { value: 0 }, capTop: { value: CAP_TOP }, inv: { value: new THREE.Matrix4() } },
      vertexShader: 'uniform mat4 inv; varying vec2 w; void main(){ vec4 p = modelMatrix * vec4(position, 1.); w = (inv * p).xz; gl_Position = projectionMatrix * viewMatrix * p; }',
      fragmentShader: `uniform vec2 B; uniform vec2 C; uniform float th0; uniform float k; uniform float capTop; varying vec2 w;
        ${OUT_GLSL}
        void main(){
          if (outsideModel(vec2(0., -0.02) + (vec2(w.x, -w.y) - vec2(0., -0.02)) * 1.045)) discard;          // 等角线画在水面上方一点：往里收一圈，斜着看也不越出模型的边
          vec2 a = normalize(B - w), b = normalize(C - w);
          float d = degrees(acos(clamp(dot(a, b), -1., 1.)));
          float fw = fwidth(d) + 1e-4;
          float f = abs(fract(d / 10. + .5) - .5) * 10.;
          float ln = 1. - smoothstep(0., fw * 1.3, f);
          float dg = 1. - smoothstep(0., fw * 2.2, abs(d - th0));
          float rt = 1. - smoothstep(0., fw * 2.2, abs(d - 90.));
          float al = max(ln * .55, max(dg, rt));
          vec3 col = rt >= max(ln * .55, dg) ? vec3(.16, .5, .9) : dg >= ln * .55 ? vec3(.86, .5, .04) : vec3(.93, .62, .14);
          float ax = abs(w.x), sh = 0.06 - 0.016 * exp(-pow((ax - 0.06) / 0.022, 2.)) + 0.012 * exp(-pow((ax - 0.125) / 0.03, 2.));
          gl_FragColor = vec4(col, al * k * smoothstep(capTop - .01, capTop + .004, -w.y) * (1. - smoothstep(sh - .004, sh, -w.y)));
        }` })));
    contour.position.copy(sea.position).setY(0.0003); contour.visible = false; ink.add(contour);
    const conLabs = [20, 30, 60, 90].map(() => label(0.0085)), conDanger = label(0.0095);
    // 等角线上放度数的地方：那一圈在海里、偏左下的一点
    const conAt = (d) => { const t = (d * Math.PI) / 180, r = 0.06 / Math.sin(t), c = [0, 0.05 - 0.06 / Math.tan(t)]; for (const a of [-1.7, -2.0, -2.3, -2.6, -2.9]) { const p = [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]; if (inSea(p) && p[1] > CAP_TOP + 0.006) return p; } return null; };

    // ================= 状态 =================
    const fresh = () => ({ ship: [0.13, -0.112], head: Math.PI * 0.8, mode: 'chart', beat: '', call: '', circle: 0, reveal: 0, walked: false, buoy: 0, cut: [], cnum: false, vary: null, cls: null, varyAt: 0, varyHint: false, clsAt: 0, clsHint: false, proof: 0, proofDone: false, rope: 0, fold: 0, probe: null, hint: 0, cs: null, takeAt: 0, takeHint: false, theorem: false, io: {}, ioNow: '', ioAt: 0, movedAt: 0, answered: false, family: 0, done: false, ghosts: [], panelLater: false });
    let S = fresh();
    const theta = (p = S.ship) => angAt(p, B0, C0);
    const zone = (th = theta()) => Math.abs(th - DANGER) <= 16 * Number.EPSILON ? 'on' : th > DANGER ? 'in' : 'out';
    const shipAngle = (th) => {
      if (zone(th) === 'on') return fmt(DANGER);
      const degrees = th * DEG;
      if (Math.round(degrees) !== Math.round(DANGER * DEG)) return fmt(th);
      const rounded = Number(degrees.toFixed(2));
      return rounded === 40 ? (degrees < 40 ? '< 40°' : '> 40°') : `${rounded}°`;
    };
    const tOn = (p) => { let t = dirO(p); while (t < AB - 1e-9) t += TAU; while (t > AB + TAU) t -= TAU; return t; };          // 船在圆上走到哪儿（从灯塔 B 那头量起）
    const nm = (P) => (P === B0 ? 'B' : 'C');
    const diamEnd = () => sub(mul(O, 2), S.ship);          // 过船的直径的另一头 D
    const arcSpread = () => { const ts = lanterns.map((l) => dirO(l.p)).sort((a, b) => a - b); let gap = 0; for (let i = 0; i < ts.length; i++) gap = Math.max(gap, (ts[(i + 1) % ts.length] - ts[i] + TAU) % TAU); return ts.length < 2 ? 0 : TAU - gap; };

    // ================= 光写的字：写在图形下面那一条水上，像投影打在模型上 =================
    const CAP_V = -0.1398, CAP_W = 0.27;          // CAP_TOP 在文件开头；前沿是外凸的弧，字往上挪一点、窄一点
    // 字是印在模型上的墨色（不是发光的）：白模上亮字一叠加就发白刺眼；墨色字底下垫一圈很淡的亮边，压在波纹上也清楚
    const capMesh = quiet(new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), basic({ transparent: true, depthWrite: false, opacity: 0 })));
    capMesh.position.set(0, 0.0009, -CAP_V); capMesh.renderOrder = 6; capMesh.visible = false; ink.add(capMesh);
    const cap = { key: '', born: -9, out: 1e9, next: null };
    const ASK = '#26231f', GOLDTXT = '#a4520a', BLUETXT = '#1c5aa3';
    const capTex2 = (big, small, col) => tex(2048, 300, (g, W) => {
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      const draw = (txt, y, px, weight, maxW, fill, halo) => {
        const parts = txt.split(/(\{\d+\/\d+\})/).filter(Boolean);
        const font = (size) => { g.font = `${weight} ${size}px "Times New Roman","Songti SC","STSong",serif`; };          // 数字和 ° 用 Times：宋体里 ° 是全角，后面会空一大块
        const width = (part) => {
          if (part[0] !== '{') { font(px); return g.measureText(part).width; }
          const [n, d] = part.slice(1, -1).split('/'); font(px * 0.65);
          return Math.max(g.measureText(n).width, g.measureText(d).width) + px * 0.22;
        };
        const total = () => parts.reduce((w, part) => w + width(part), 0);
        while (px > 28 && total() > maxW) px -= 4;
        let x = (W - total()) / 2;
        const inked = (text, cx, cy) => {
          g.shadowColor = 'rgba(246,250,252,0.9)'; g.shadowBlur = halo; g.lineWidth = halo * 0.7;
          g.strokeStyle = 'rgba(246,250,252,0.42)'; g.strokeText(text, cx, cy);
          g.shadowBlur = 0; g.fillStyle = fill; g.fillText(text, cx, cy);
        };
        for (const part of parts) {
          const w = width(part), cx = x + w / 2;
          if (part[0] === '{') {
            const [n, d] = part.slice(1, -1).split('/');
            inked(n, cx, y - px * 0.40); inked(d, cx, y + px * 0.44);
            g.fillRect(x + px * 0.04, y, w - px * 0.08, px * 0.05);
          } else inked(part, cx, y);
          x += w;
        }
      };
      draw(big, 108, 104, 600, W - 90, col, 14);
      if (small) draw(small, 224, 56, 500, W - 140, '#4a4741', 10);
    });
    // 换一句：旧的先淡出，再写新的
    function lightText(big, small = '', col = ASK) {
      const key = `${big}|${small}|${col}`; if (key === cap.key) return; cap.key = key;
      capNow = [big, small]; if (ui?.status) ui.status(fractionHTML(small ? `${big}　${small}` : big));
      const show = () => { capMesh.material.map?.dispose?.(); capMesh.material.map = capTex2(big, small, col); capMesh.material.needsUpdate = true; capMesh.scale.set(CAP_W, 1, (CAP_W * 300) / 2048); capMesh.visible = true; cap.born = now(); cap.out = 1e9; };
      if (capMesh.visible && now() - cap.born > 0.2) { cap.out = now(); cap.next = show; } else show();
      subtitle();
    }

    // ================= 画 =================
    const bis = (p, q0, q1, r) => { const u0 = unit(sub(q0, p)), u1 = unit(sub(q1, p)), s2 = add(u0, u1); return add(p, mul(Math.hypot(...s2) < 1e-3 ? [-u0[1], u0[0]] : unit(s2), r)); };
    // 一路留下的“同一个角”：船沿弧开过的地方，各留一块一样大的金色光扇
    const ghostFans = Array.from({ length: 9 }, () => fanM(GOLD, 0.0, 0.0011));
    // 情况（2）（3）：每一对 = 船上一块（pa）+ 圆心一块（po），对着同一段弧；点一对，就用情况（1）的办法拼一遍（cp：一块沿直径滑过去，一块是另一个底角转过来）
    const pa = [fanM(P1, 0.85, 0.0026), fanM(P2, 0.85, 0.0029)].map((m) => tile(m, 0xffffff, 0.7)), po = [fanM(P1, 0.26, 0.0022), fanM(P2, 0.26, 0.0025)].map((m) => tile(m, 0xffffff, 0.55, false));
    const cp = [fanM(P1, 0.92, 0.0034), fanM(P1, 0.92, 0.0036), fanM(P2, 0.92, 0.0037), fanM(P2, 0.92, 0.0039)].map((m) => tile(m, 0xffffff, 0.75));
    for (const m of cp) m.raycast = () => {};          // pa、po 本身就是点、拖的地方
    // 改变弧 BC 时那个圆的圆心（浮标不跟着动）
    const liveDot = quiet(new THREE.Mesh(new THREE.CircleGeometry(0.0017, 20).rotateX(-Math.PI / 2), basic({ color: BLUE, transparent: true, depthWrite: false })));
    liveDot.position.y = 0.0024; liveDot.visible = false; ink.add(liveDot);
    const dDot = quiet(new THREE.Mesh(new THREE.CircleGeometry(0.0013, 16).rotateX(-Math.PI / 2), basic({ color: 0x2b3542, transparent: true, depthWrite: false }))); dDot.position.y = 0.0044; dDot.visible = false; ink.add(dDot);          // 直径另一头 D 的点
    // 情况（1）：等腰三角形连同 A 处的角，沿对称轴翻过去
    const foldG = new THREE.Group(); foldG.visible = false; ink.add(foldG);
    const foldTri = quiet(new THREE.Mesh(new THREE.BufferGeometry(), basic({ color: 0xf5b14a, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide })));
    const foldWedge = quiet(new THREE.Mesh(new THREE.BufferGeometry(), basic({ color: GOLD, transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide })));
    foldG.add(foldTri, foldWedge);
    // 90° 那一圈上的一点：两条光连到两座灯塔，带一个直角记号
    const R90 = { a: line(BLUE, 0.0009, 0.0018, 1), b: line(BLUE, 0.0009, 0.0018, 1), m: line(BLUE, 0.0008, 0.0019, 1) };
    // 叫你动手的那一圈光
    const callRing = quiet(new THREE.Mesh(new THREE.RingGeometry(0.0082, 0.0102, 48).rotateX(-Math.PI / 2), basic({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })));
    callRing.position.y = 0.0016; ink.add(callRing);
    // 浅滩一开始藏在水下看不见：一层和深水一样颜色的“水色”盖着，揭开时淡掉
    const murk = quiet(new THREE.Mesh(new THREE.PlaneGeometry(seaW, seaD).rotateX(-Math.PI / 2), basic({ color: 0x7aa1b0, transparent: true, opacity: 0.94, depthWrite: false })));
    clip(murk.material, uc, -vc, 'murk'); murk.position.set(uc, -0.0006, -vc); murk.renderOrder = -2; group.add(murk);

    const tickPts = (p, q) => { const m = mid(p, q), n = mul(unit([-(q[1] - p[1]), q[0] - p[0]]), 0.003); return [sub(m, n), add(m, n)]; };
    const collinear = (p) => Math.abs(p[1] - B0[1]) <= Number.EPSILON;
    // 从每座灯塔沿真圆走，只取模型范围内的半段。用半角公式避免大半径与圆心坐标相减。
    function movingArcs(th, side) {
      const half = C0[0], r = half / Math.sin(th), dy = half / Math.tan(th);
      const center = [0, C0[1] - side * dy];
      const point = (u, sign) => [sign * (half * Math.cos(u) + dy * Math.sin(u)),
        C0[1] - side * (2 * dy * Math.sin(u / 2) ** 2 + half * Math.sin(u))];
      const limit = Math.min(Math.PI - th, 1 / r);
      const branch = (sign) => {
        const pts = [];
        for (let i = 0; i <= 100; i++) {
          const p = point(limit * i / 100, sign);
          if (Math.abs(p[0]) >= SEA.u1 - 0.004 || p[1] <= CAP_TOP + 0.003 || p[1] >= BACK_V - 0.004) break;
          pts.push(p);
        }
        return pts;
      };
      const arcBC = Array.from({ length: 49 }, (_, i) => point(-2 * th * i / 48, 1));
      return { center, left: branch(-1), right: branch(1), arcBC };
    }
    function layout() {
      const A = S.ship, th = theta(), z = zone(), lt = '#1f2a3a', zc = S.beat === 'inout' || S.answered;
      boat.position.copy(P3(A)); boat.rotation.y = S.head; for (const r of boat.userData.rig) r.visible = S.mode !== 'deck';          // 站到船头时，桅杆和帆不挡眼睛
      setBand(BAND[0], B0, A, 0.0026); setBand(BAND[1], C0, A, 0.0026);
      setFan(F.ship, A, ccwStart(A, B0, C0), th, RC);
      setLabel(LB.ship, shipAngle(th), zc && z === 'in' ? '#c2352a' : zc && z === 'out' ? '#2e7d4f' : '#c27412', (S.beat === 'vary' && th < 0.05) ? add(A, [0, -0.028]) : bis(A, B0, C0, 0.046), 0.01);
      const vary = S.beat === 'vary', straight = vary && collinear(A);
      const arcs = vary && !straight ? movingArcs(th, A[1] < B0[1] ? 1 : -1) : null;
      const Oc = arcs ? arcs.center : O, bk = S.buoy && !straight && Oc[1] > CAP_TOP + RC && Oc[1] < BACK_V - RC;
      setLine(L.circle, S.circle > 0 && !straight ? arcPts(O, R, AB, AB + (AC - AB) * easeOut(S.circle), 160) : null);
      setLine(L.OB, bk ? [Oc, B0] : null); setLine(L.OC, bk ? [Oc, C0] : null);
      if (bk) { const cf = { a0: ccwStart(Oc, B0, C0), w: vary ? 2 * th : central() }, m = cf.a0 + cf.w / 2; setFan(F.buoy, Oc, cf.a0, cf.w, RC); LB.buoy.userData.h = S.cnum ? 0.011 : 0.018; setLabel(LB.buoy, S.cnum ? fmt(cf.w) : '?', '#2470c2', add(Oc, mul([Math.cos(m), Math.sin(m)], RC + 0.012)), 0.01); }
      else { F.buoy.visible = false; LB.buoy.visible = false; }
      if (S.cs) F.buoy.visible = false;
      // 改变弧 BC：过两座灯塔和船的圆跟着船变，拼好的两块跟着走
      setLine(L.live1, arcs && arcs.left); setLine(L.live2, arcs && arcs.right);
      liveDot.visible = !!(arcs && bk && dist(Oc, O) > 0.002);
      if (liveDot.visible) { liveDot.position.x = Oc[0]; liveDot.position.z = -Oc[1]; }
      if (vary) chips.forEach((c, i) => {
        c.visible = !!bk && S.cut.includes(i);
        if (!c.visible || busy(c)) return;
        const a0 = ccwStart(Oc, B0, C0) + i * th;
        c.rotation.y = 0; setFan(c, Oc, a0, th, RC); c.position.y = 0.0026 + 0.0002 * i;
        c.userData.w = th; c.userData.pa0 = a0;
      });
      // 情况（1）：同一根绳子从 OA 转到 OX；情况（2）（3）：OA、OB、OC 三根一样长
      const pf = S.proof;
      if (pf) {
        setLine(L.rope1, [O, A]); setLine(L.rope2, S.rope > 0 ? [O, onCirc(pf.tA + (pf.tX - pf.tA) * easeOut(S.rope))] : null); setLine(L.rope3, null);
        setLine(L.tick1, S.rope >= 1 ? tickPts(O, A) : null); setLine(L.tick2, S.rope >= 1 ? tickPts(O, pf.other) : null); setLine(L.tick3, null);
      } else if (S.cs) {
        setLine(L.rope1, [O, S.cs.A]); setLine(L.rope2, [O, B0]); setLine(L.rope3, [O, C0]); setLine(L.tick1, tickPts(O, S.cs.A)); setLine(L.tick2, tickPts(O, B0)); setLine(L.tick3, tickPts(O, C0));
      } else for (const k of ['rope1', 'rope2', 'rope3', 'tick1', 'tick2', 'tick3']) setLine(L[k], null);
      if (S.walked) { setLabel(LB.b, 'B', lt, add(B0, [-0.011, -0.006]), 0.007); setLabel(LB.c, 'C', lt, add(C0, [0.011, -0.006]), 0.007); setLine(L.arcBC, vary ? arcs && arcs.arcBC : arcPts(O, R, dirO(C0), dirO(B0), 48)); setLabel(LB.arc, S.cs || vary ? '' : '弧 BC', '#2470c2', [0, O[1] + R + 0.0075], 0.007); }
      else { LB.b.visible = LB.c.visible = LB.arc.visible = false; setLine(L.arcBC, null); }
      setLabel(LB.a, S.walked && (z === 'on' || vary) ? 'A' : S.beat === 'inout' && z !== 'on' ? 'P' : '', lt, add(A, mul(unit(sub(A, Oc)), 0.013)), 0.006);
      setLabel(LB.o, bk ? 'O' : '', lt, add(Oc, [0.007, -0.008]), 0.006);
      // 情况（2）（3）：直径 AD；D 把弧 BC 分成的两段
      const D = S.cs ? S.cs.D : S.probe?.snapped ? diamEnd() : null;
      if (D) { setLine(L.diam, [A, D]); setLabel(LB.d, 'D', lt, add(D, mul(unit(sub(D, O)), 0.011)), 0.006); dDot.visible = S.mode === 'chart'; dDot.position.x = D[0]; dDot.position.z = -D[1]; } else { setLine(L.diam, null); LB.d.visible = false; dDot.visible = false; }
      if (S.cs) S.cs.pairs.forEach((p, i) => setLine(L['sa' + i], p.arcHide ? null : p.arcShow || p.arc)); else { setLine(L.sa0, null); setLine(L.sa1, null); }
      if (S.cs) { const A2 = S.cs.A, r = RC + 0.0045, a1 = ccwStart(A2, B0, C0), a2 = ccwStart(O, B0, C0); setLine(L.tgtA, arcPts(A2, r, a1, a1 + angAt(A2, B0, C0), 40)); setLine(L.tgtO, arcPts(O, r, a2, a2 + central(), 40)); } else { setLine(L.tgtA, null); setLine(L.tgtO, null); }
      // 船上那根能转的光（整根都能抓）
      if (S.probe) { const X = S.probe.snapped ? diamEnd() : probeEnd(); setLine(L.probe, S.probe.snapped ? null : [A, X]); setBand(K.probe, A, X, 0.016); K.probe.position.y = INK_Y + 0.003; }
      else { setLine(L.probe, null); K.probe.position.set(0, -1, 0); }
      setLine(L.ghost, S.probe && S.hint >= 2 ? [A, diamEnd()] : null);
      // 第 14 题：圈里 / 圈外——延长一座灯塔到船的线，交圆于 Q
      const sh = (S.beat === 'inout' || (S.answered && ['family', 'end'].includes(S.beat))) && z !== 'on' ? shoalFig() : null;
      if (sh) {
        setLine(L.ext, [sh.P, sh.far]); setLine(L.ext2, [sh.Q, sh.R2]);
        setFan(F.q, sh.Q, ccwStart(sh.Q, sh.P, sh.R2), angAt(sh.Q, sh.P, sh.R2), 0.012); setFan(F.x, sh.R2, ccwStart(sh.R2, sh.Q, A), angAt(sh.R2, sh.Q, A), 0.013);
        setLabel(LB.q, `Q ${fmt(DANGER)}`, '#c27412', add(sh.Q, mul(unit(sub(sh.Q, O)), 0.013)), 0.006);
      } else { setLine(L.ext, null); setLine(L.ext2, null); F.q.visible = F.x.visible = false; LB.q.visible = false; }
      // 等角线
      contour.visible = S.family > 0; contour.material.uniforms.k.value = easeOut(S.family);
      [20, 30, 60, 90].forEach((d, i) => { const p = S.family > 0.5 ? conAt(d) : null; if (p) setLabel(conLabs[i], `${d}°`, d === 90 ? '#2470c2' : '#b0690f', p, 0.006); else conLabs[i].visible = false; });
      if (S.family > 0.5) setLabel(conDanger, `危险角 ${fmt(DANGER)}`, '#b0690f', [O[0] - R - 0.024, O[1] - 0.01], 0.006); else conDanger.visible = false;
      if (S.family >= 1) {          // 90° 那一圈上的一点 P90：连到 B、C，直角
        const P90 = [0.06 * Math.cos(-Math.PI / 2 - 0.55), 0.05 + 0.06 * Math.sin(-Math.PI / 2 - 0.55)], u1 = unit(sub(B0, P90)), u2 = unit(sub(C0, P90)), s = 0.0055;
        setLine(R90.a, [P90, B0]); setLine(R90.b, [P90, C0]); setLine(R90.m, [add(P90, mul(u1, s)), add(P90, add(mul(u1, s), mul(u2, s))), add(P90, mul(u2, s))]);
      } else { setLine(R90.a, null); setLine(R90.b, null); setLine(R90.m, null); }
      LB.w0.visible = LB.w1.visible = false;
      K.ship.position.copy(P3(A, 0.004)); K.cut.position.copy(P3(bis(A, B0, C0, 0.012), 0.0042));
      SK.forEach((k, i) => { const cs = S.cs, p = cs?.pairs[i]; if (p && ((S.call === 'pair' && !p.done) || (S.call === 'take' && i === 1 && !cs.taken))) { let a = p.a.a0 + p.a.w / 2, r = 0.024; if (cs.kind === 'out') { if (i === 0) a = ccwStart(cs.A, B0, C0) + theta() / 2; else r = 0.02; } k.position.copy(P3(add(cs.A, mul([Math.cos(a), Math.sin(a)], r)), 0.0045)); } else k.position.set(0, -1, 0); });
      if (S.mode === 'deck') {
        for (const sp of [...Object.values(LB), ...conLabs, conDanger]) sp.visible = false;
        for (const m of [F.ship, F.buoy, F.sub1, F.sub2, F.q, F.x, L.OB, L.OC, L.rope1, L.rope2, L.rope3, L.tick1, L.tick2, L.tick3, L.diam, L.ext, L.ext2, L.arcBC, L.live1, L.live2, L.probe, L.ghost, L.sa0, L.sa1, L.tgtA, L.tgtO, ...chips, ...pa, ...po, ...cp, ...ghostFans, capMesh, liveDot, foldG]) m.visible = false;
      }
    }
    function shoalFig() {          // 延长 P（一座灯塔）到船的线，和圆的另一个交点 Q；R2 是另一座灯塔
      const A = S.ship, inside = dist(A, O) < R;
      for (const [P, R2] of [[B0, C0], [C0, B0]]) {
        const dir = unit(sub(A, P)), t = -2 * ((P[0] - O[0]) * dir[0] + (P[1] - O[1]) * dir[1]);
        if (t < 0.004) continue;
        if (!inside && t > dist(A, P) - 0.002) continue;
        const Q = add(P, mul(dir, t)); if (Q[1] > shore(Q[0]) - 0.006 || dist(A, Q) < 0.018) continue;
        return { P, R2, Q, far: inside ? Q : A, inside };
      }
      return null;
    }
    const placeGhost = (t) => { const A = onCirc(t); S.ghosts.push({ A, born: now() }); const i = S.ghosts.length - 1; if (i < ghostFans.length) setFan(ghostFans[i], A, ccwStart(A, B0, C0), theta(A), 0.012); };
    const clearGhosts = () => { S.ghosts = []; ghostFans.forEach((m) => (m.visible = false)); };

    // ================= 动手 =================
    const K = {
      ship: new THREE.Mesh(new THREE.CircleGeometry(0.011, 20).rotateX(-Math.PI / 2), basic({ visible: false })),
      cut: new THREE.Mesh(new THREE.CircleGeometry(0.0085, 16).rotateX(-Math.PI / 2), basic({ visible: false })),
      probe: new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), basic({ visible: false })),          // 船上那根光：整根都能抓
    };
    for (const k in K) { K[k].userData.pick = true; K[k].userData.noFrame = true; group.add(K[k]); }
    K.probe.position.set(0, -1, 0);
    const SK = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.0065, 16).rotateX(-Math.PI / 2), basic({ visible: false })); m.userData.pick = true; m.userData.noFrame = true; group.add(m); return m; });
    const uv = (p) => [p.x, -p.z];
    let userTouched = 0;
    // 补间：东西只滑、只转（位置和绕竖轴的转角），大小不变
    const tweens = [];
    const tween = (m, to, dur, done) => { for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].m === m) tweens.splice(i, 1); tweens.push({ m, from: { x: m.position.x, y: m.position.y, z: m.position.z, ry: m.rotation.y }, to, t0: now(), dur: Math.max(0.01, dur / speed), done }); };
    const busy = (m) => tweens.some((x) => x.m === m);
    const lerp2 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    const railK = (h, q) => { const d = sub(O, h), l2 = d[0] * d[0] + d[1] * d[1]; return clamp(((q[0] - h[0]) * d[0] + (q[1] - h[1]) * d[1]) / l2, 0, 1); };          // 沿着“从这里到圆心”那条轨道走了几成
    const clsNow = () => { const A = S.ship, a = angAt(A, B0, O), b = angAt(A, O, C0); if (a < 0.02 || b < 0.02) return 'side'; return Math.abs(a + b - theta()) < 2e-3 ? 'in' : 'out'; };          // 圆心在角的一条边上 / 内部 / 外部
    const CLS = { in: '内部', out: '外部', side: '一条边上' };
    const sMax = Math.asin(clamp((SEA.v1 - 0.015 - O[1]) / R, -1, 1)), T_LO = Math.PI - sMax, T_HI = TAU + sMax;          // 船在这一圈上能开到的那一段（不上岸）
    function moveShip(q) {
      if (!inSea(q)) { const u2 = clamp(q[0], SEA.u0 + 0.009, SEA.u1 - 0.009); q = [u2, clamp(q[1], SEA.v0 + 0.009, shore(u2) - 0.013)]; }
      q = [q[0], Math.max(q[1], CAP_TOP)];          // 字写在圆下面那条水上，船不开进去
      const okIn = (p2) => inOutline(p2[0] - 0.013, p2[1]) && inOutline(p2[0] + 0.013, p2[1]) && inOutline(p2[0], p2[1] - 0.013) && inOutline(p2[0], p2[1] + 0.013);
      for (let k = 0; k < 30 && !okIn(q); k++) q = [q[0] + (O[0] - q[0]) * 0.06, q[1] + (O[1] - q[1]) * 0.06];          // 不规则的外轮廓：船离边留一点
      if (S.beat === 'vary' && theta(q) > Math.PI / 2 - 0.004) q = add([0, 0.05], mul(unit(sub(q, [0, 0.05])), 0.0601));          // 改变弧 BC：最多开到两座灯塔正好是直径的那一圈（90°）
      if (S.beat === 'classify') {          // 沿弧开：船贴着这一圈走；视线快穿过浮标时吸过去
        q = onCirc(clamp(tOn(q), T_LO, T_HI));
        for (const P of [B0, C0]) { const anti = sub(mul(O, 2), P); if (dist(q, anti) < 0.006) q = anti; }
      } else if (S.circle >= 1 && S.beat !== 'vary' && Math.abs(dist(q, O) - R) < (S.beat === 'inout' ? 0.00025 : 0.005)) q = onCirc(dirO(q));          // 圆画出来以后：靠近了就吸在圆上
      const prev = S.ship, mv = sub(q, prev);
      if (Math.hypot(...mv) > 1e-5) S.head = lerp(S.head, S.head + wrap(Math.atan2(mv[1], mv[0]) - S.head), 0.3);
      S.ship = q; S.movedAt = now();
      // 每次正好等于危险角（两次位置之间跨过去的那一点），船就放下一面小旗：二分找到那一点，它一定落在圆上
      const s0 = theta(prev) - DANGER, s1 = theta() - DANGER;
      if (!S.circle && s0 * s1 <= 0 && Math.abs(s0 - s1) > 1e-7) { let a = prev, b = q; for (let i = 0; i < 26; i++) { const m = mid(a, b); if ((theta(m) - DANGER) * s0 <= 0) b = m; else a = m; } const p = mid(a, b); if (p[1] < shore(p[0]) - 0.004) dropLantern(p); }
      if (S.beat === 'inout') { const z = zone(); if (z !== 'on') { if (z !== S.ioNow) { S.ioNow = z; S.ioAt = now(); } S.io[z] = true; } inoutText(); }
      if (S.beat === 'vary') {
        if (collinear(q)) lightText('船和两座灯塔在同一直线上，画不出经过这三点的圆', '把船开离这条直线');
        else {
          if (collinear(prev)) lightText('换个地方，还是正好两个吗？', '把船开到别处（离开这一圈也行）：过两座灯塔和船的圆跟着船变');
          if (S.vary) { const th = theta(); S.vary.lo = Math.min(S.vary.lo, th); S.vary.hi = Math.max(S.vary.hi, th); }
        }
      }
      if (S.beat === 'classify' && S.cls) { const c = clsNow(); S.cls[c] = true; if (c !== S.cls.now) { S.cls.now = c; if (c === 'side') sfx.clink({ freq: 1500, gain: 0.04 }); lightText('船在这段弧上开，浮标和这个角的位置会变', `沿着弧开一开，一共有几种？现在：圆心在角的${CLS[c]}`); } }
      layout(); subtitle();
    }
    // 开进开出浅滩：写下这时候的道理（延长交圆于 Q，三角形的外角）
    function inoutText() {
      if (S.answered) return;
      const z = zone(), d = fmt(DANGER), sh = z !== 'on' ? shoalFig() : null;
      if (z === 'on') return lightText(`在浅滩边上：正好 ${d}`, '开进浅滩、再开出来看看');
      if (z === 'in') return lightText(`开进浅滩：∠P 比 ${d} 大`, sh ? `延长 ${nm(sh.P)}P 交圆于 Q：∠P 是三角形的外角，比圆上的 ∠Q = ${d} 大` : `比圆上的 ${d} 大`);
      lightText(`在浅滩外：∠P 比 ${d} 小`, sh ? `圆上的 ∠Q = ${d} 是三角形的外角，比 ∠P 大` : `比圆上的 ${d} 小`);
    }
    // 剪下船上的角拖进圆心；情况（1）里两个底角顺着轨道拖进圆心
    let held = -1;
    function cutDown() {
      if (S.call !== 'cut' || S.cut.length >= 2 || held >= 0 || zone() !== 'on') return false;
      const i = S.cut.length, A = S.ship, w = theta(), a0 = ccwStart(A, B0, C0);
      chips[i].rotation.y = 0; setFan(chips[i], A, a0, w, RC); chips[i].userData = { home: A, a0, w, kind: 'cut' }; chips[i].position.y = 0.006; chips[i].material.opacity = 0.92;
      held = i; sfx.whoosh({ dur: 0.18, freq: 2600, gain: 0.05 }); return true;
    }
    function chipDown(i) { if (S.call === 'base' && S.proof && !S.proofDone && chips[i].visible && !S.proof.placed.includes(i) && !busy(chips[i])) { held = i; chips[i].userData.k = 0; return true; } return false; }
    function chipMove(q) {
      if (held < 0) return; const c = chips[held], u = c.userData;
      if (u.kind === 'base') { const k = railK(u.home, q), p = lerp2(u.home, O, k); u.k = k; c.position.set(p[0], 0.0034, -p[1]); c.rotation.y = u.twin ? Math.PI * k : 0; return; }          // A 处那块沿 AB 滑；另一块边走边转半圈
      c.position.x = q[0]; c.position.z = -q[1]; c.position.y = 0.006;
    }
    function chipUp() {
      if (held < 0) return; const i = held, c = chips[i], u = c.userData, q = [c.position.x, -c.position.z]; held = -1;
      if (u.kind === 'base') {
        const ok = (u.k || 0) > 0.5, p = ok ? O : u.home;
        tween(c, { x: p[0], y: 0.0026 + 0.0002 * i, z: -p[1], ry: u.twin && ok ? Math.PI : 0 }, 0.3, () => {
          if (!ok || !S.proof || S.proof.placed.includes(i)) return;
          S.proof.placed.push(i); sfx.clink({ freq: 1600, gain: 0.05 });
          if (S.proof.placed.length === 2) { S.proofDone = true; const x = nm(S.proof.other); const row = board(`<span class="n">7</span>（1）圆心在边上：<i>OA</i> = <i>O${x}</i> ⇒ <i>∠A</i> = <i>∠${x}</i>；<i>∠BOC</i> = <i>∠A</i> + <i>∠${x}</i> ⇒ <i>∠A</i> = ${FR(1, 2)}<i>∠BOC</i>`, true); punch(O, '', row); }
        });
        return;
      }
      if (dist(q, O) > 0.03) { c.visible = false; return; }          // 没拖进圆心：这块不要了，再剪一块
      const prev = S.cut.reduce((s2, k) => s2 + chips[k].userData.w, 0), ta = ccwStart(O, B0, C0) + prev;
      S.cut.push(i); u.pa0 = ta;
      tween(c, { x: O[0], y: 0.0026 + 0.0002 * i, z: -O[1], ry: wrap(ta - u.a0) }, 0.32, () => {
        sfx.clink({ freq: 1600, gain: 0.05 });
        if (S.cut.length === 2 && !S.cnum) { S.cnum = true; layout(); board.h('探究'); const row = board(`<span class="n">4</span>发现：船上的角在圆心正好放下两个，<i>∠BOC</i> = <span class="ca">${fmt(central())}</span> = <span class="ia">${fmt(DANGER)}</span> + <span class="ia">${fmt(DANGER)}</span>`, true); punch(O, '', row); }
      });
    }
    // 情况（1）：船停在“一条视线穿过浮标”的地方；X 是另一座灯塔（等腰三角形 AOX）
    function setupProof1() {
      const A = S.ship, onB = dist(sub(mul(O, 2), B0), A) < 1e-3, X = onB ? C0 : B0, tA = dirO(A); let tX = dirO(X);
      while (tX - tA > Math.PI) tX -= TAU; while (tX - tA < -Math.PI) tX += TAU;
      S.proof = { P: onB ? B0 : C0, other: X, tA, tX, placed: [] }; S.rope = 0; S.fold = 0;
    }
    function buildFold() {          // 三角形 AOX 连同 A 处的角，绕它的对称轴（过 O 和 AX 中点）翻过去：A 处的角落到 X 上
      const A = S.ship, X = S.proof.other, a = sub(A, O), x = sub(X, O), g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([a[0], 0, -a[1], 0, 0, 0, x[0], 0, -x[1]], 3)); foldTri.geometry.dispose(); foldTri.geometry = g;
      setFan(foldWedge, a, ccwStart(A, O, X), angAt(A, O, X), RC); foldWedge.position.y = 0.0003;
      const ax = unit(sub(mid(A, X), O)); foldG.userData.axis = new THREE.Vector3(ax[0], 0, -ax[1]); foldG.position.set(O[0], 0.0034, -O[1]); foldG.quaternion.identity();
    }
    const foldApply = () => foldG.quaternion.setFromAxisAngle(foldG.userData.axis, Math.PI * ease2(S.fold));
    function placeBase() {          // 翻完以后：A 处一块、X 处一块（就是翻过去的那一块），都能拖
      const A = S.ship, X = S.proof.other;
      [[A, ccwStart(A, O, X), angAt(A, O, X), false], [X, ccwStart(X, O, A), angAt(X, O, A), true]].forEach(([h, a0, w, twin], i) => { const c = chips[i]; c.rotation.y = 0; setFan(c, h, a0, w, RC); c.position.y = 0.0026 + 0.0002 * i; c.material.opacity = 0.92; c.userData = { home: h, a0, w, kind: 'base', twin, k: 0 }; });
    }
    // 情况（2）（3）：船上一根能转的光，转到穿过浮标就“咔”成直径
    function setupProbe(kind) {
      const A = S.ship, aB = ang(sub(B0, A)), sw = wrap(ang(sub(C0, A)) - aB);
      S.probe = { kind, phi: aB + sw * (kind === 'in' ? 0.2 : 0.5), snapped: false, t0: performance.now() }; S.hint = 0; layout();
    }
    const probeEnd = () => { const A = S.ship, d = [Math.cos(S.probe.phi), Math.sin(S.probe.phi)], t = -2 * ((A[0] - O[0]) * d[0] + (A[1] - O[1]) * d[1]); return add(A, mul(d, t > 0.01 ? t : 0.03)); };
    function probeDown() { if (S.call !== 'probe' || !S.probe) return false; userTouched++; return true; }
    function probeMove(q) {
      if (!S.probe || dist(q, S.ship) < 0.004) return;
      const to = ang(sub(O, S.ship)); let phi = ang(sub(q, S.ship)); const near = Math.abs(wrap(phi - to)) < 0.06;
      if (near) { phi = to; if (!S.probe.snapped) { sfx.clink({ freq: 1500, gain: 0.05 }); ring(O, BLUE); } }
      S.probe.snapped = near; S.probe.phi = phi; layout();
    }
    function probeUp() { if (!S.probe?.snapped) return; const kind = S.probe.kind; S.probe = null; S.hint = 0; setupCase(kind); }
    // 直径 AD 把弧 BC 分成两段：对着同一段弧的一个圆周角、一个圆心角是一对，每一对都是情况（1）
    const arcAvoid = (t1, t2, tA, r = R) => { let a = t1, b = t2; while (b < a) b += TAU; let x = tA; while (x < a) x += TAU; if (x < b) { a = t2; b = t1; while (b < a) b += TAU; } return arcPts(O, r, a, b, 64); };          // 从 t1 到 t2、不经过船的那段弧
    const angNm = (P, kind, at) => (P === B0 ? (kind === 'in' ? `B${at}D` : `D${at}B`) : `D${at}C`);
    function setupCase(kind) {
      const A = S.ship, D = diamEnd(), tA = dirO(A), tD = dirO(D);
      const mk = (P) => ({ P, a: { a0: ccwStart(A, P, D), w: angAt(A, P, D) }, o: { a0: ccwStart(O, P, D), w: angAt(O, P, D) }, arc: arcAvoid(dirO(P), tD, tA), nA: angNm(P, kind, 'A'), nO: angNm(P, kind, 'O'), done: false, busy: false });
      const pairs = [mk(B0), mk(C0)]; if (kind === 'out') { if (pairs[0].a.w < pairs[1].a.w) pairs.reverse(); pairs.forEach((p, i) => { p.arc = arcAvoid(dirO(p.P), tD, tA, R + (i ? -0.0026 : 0.0026)); }); }          // 情况（3）：大的一对在前；两段弧套在一起，大的画外圈、小的画内圈
      S.cs = { kind, A, D, pairs, taken: false, take: null };
      pairs.forEach((p, i) => { const col = i ? P2 : P1; for (const [m, at, f, op] of [[pa[i], A, p.a, 0.85], [po[i], O, p.o, 0.26]]) { m.rotation.y = 0; setFan(m, at, f.a0, f.w, RC); m.material.color.setHex(col); m.material.opacity = op; } pa[i].position.y = 0.0026 + 0.0003 * i; po[i].position.y = 0.0022 + 0.0003 * i; });
      sfx.whoosh({ dur: 0.5, freq: 900, gain: 0.04 }); layout();
    }
    // 点一对：用情况（1）的办法拼一遍——船上这块沿直径平移到圆心；等腰三角形 AOP 在 P 处的底角（和它一样大）转半圈过去；两块正好拼满圆心那块
    function pairTap(i) {
      const cs = S.cs; if (!cs || S.call !== 'pair') return; const p = cs.pairs[i]; if (p.done || p.busy) return;
      p.busy = true; const A = cs.A, P = p.P, col = i ? P2 : P1, c1 = cp[i * 2], c2 = cp[i * 2 + 1];
      for (const c of [c1, c2]) { c.rotation.y = 0; c.material.color.setHex(col); c.material.opacity = 0.92; }
      setFan(c1, A, p.a.a0, p.a.w, RC); c1.position.y = 0.0034 + 0.0003 * i;
      setFan(c2, P, ccwStart(P, O, A), angAt(P, O, A), RC); c2.position.y = 0.0036 + 0.0003 * i;
      sfx.whoosh({ dur: 0.3, freq: 1800, gain: 0.04 });
      tween(c1, { x: O[0], z: -O[1] }, 0.75);
      later(220 / speed, () => tween(c2, { x: O[0], z: -O[1], ry: Math.PI }, 0.85, () => { p.done = true; p.busy = false; po[i].material.opacity = 0.85; c1.visible = c2.visible = false; sfx.clink({ freq: 1400 + 200 * i, gain: 0.05 }); ring(O, col); layout(); }));
    }
    // 情况（3）：抓起小的一对拿开。抓的那一刻，大的那一对上被它盖住的部分跟着走：大块只剩 ∠BAC、∠BOC
    function takeDown(i, q) {
      const cs = S.cs; if (!cs || S.call !== 'take' || i !== 1 || cs.taken) return;
      cs.take = { q0: q, d: [0, 0] };
      setFan(pa[0], cs.A, ccwStart(cs.A, B0, C0), theta(), RC); setFan(po[0], O, ccwStart(O, B0, C0), central(), RC);
      pa[1].position.y = 0.005; po[1].position.y = 0.0048; pa[1].material.opacity = 0.9; sfx.whoosh({ dur: 0.2, freq: 2200, gain: 0.04 });
    }
    function takeMove(q) {
      const cs = S.cs; if (!cs?.take) return; const d = sub(q, cs.take.q0); cs.take.d = d;
      pa[1].position.x = cs.A[0] + d[0]; pa[1].position.z = -(cs.A[1] + d[1]); po[1].position.x = O[0] + d[0]; po[1].position.z = -(O[1] + d[1]);
    }
    function takeUp() {
      const cs = S.cs; if (!cs?.take) return; const d = cs.take.d; cs.take = null;
      if (Math.hypot(...d) < 0.02) {          // 没拿开：放回去，大块恢复原样
        tween(pa[1], { x: cs.A[0], z: -cs.A[1], y: 0.0029 }, 0.25); tween(po[1], { x: O[0], z: -O[1], y: 0.0025 }, 0.25, () => { const b = cs.pairs[0]; setFan(pa[0], cs.A, b.a.a0, b.a.w, RC); setFan(po[0], O, b.o.a0, b.o.w, RC); });
        return;
      }
      cs.taken = true; sfx.clink({ freq: 1300, gain: 0.05 });
      const far = mul(unit(d), 0.07);
      tween(pa[1], { x: cs.A[0] + far[0], z: -(cs.A[1] + far[1]) }, 0.5, () => { pa[1].visible = false; }); tween(po[1], { x: O[0] + far[0], z: -(O[1] + far[1]) }, 0.5, () => { po[1].visible = false; });
      pa[0].material.color.setHex(GOLD); po[0].material.color.setHex(BLUE); po[0].material.opacity = 0.6;
      cs.pairs[0].arcHide = cs.pairs[1].arcHide = true; layout();          // 剩下的就是原来那段弧 BC（岸上的蓝弧）
    }
    function clearCase() { S.cs = null; S.probe = null; for (let i = tweens.length - 1; i >= 0; i--) if ([...pa, ...po, ...cp].includes(tweens[i].m)) tweens.splice(i, 1); [...pa, ...po, ...cp].forEach((m) => { m.visible = false; m.rotation.y = 0; }); layout(); }
    // 课讲完以后：点板书上的一条，场景摆回那一刻
    const REVIEW_CAP = () => ({
      arc: [`${fmt(DANGER)} 的点，连成一段过两座灯塔的圆弧`, '它正好是浅滩的边', GOLDTXT],
      def: ['顶点在圆上、两边都和圆相交的角，叫圆周角', `船在这段弧上，∠BAC 处处是 ${fmt(DANGER)}`, GOLDTXT],
      center: [`顶点在圆心的角，叫圆心角：∠BOC = ${fmt(central())}`, '它和圆周角 ∠BAC 对着同一条弧 BC', BLUETXT],
      two: [`船上的角在圆心正好放下两个：${fmt(central())} = ${fmt(DANGER)} + ${fmt(DANGER)}`, '', GOLDTXT],
      vary: ['改变弧 BC，圆心角里还是正好放下两个圆周角', '', GOLDTXT],
      cls: ['圆心和圆周角的位置关系有三种', '圆心在角的一条边上、内部、外部', GOLDTXT],
      c1: ['（1）圆心在边上：∠BOC = ∠A + ∠C = 2∠A', 'OA = OC，等腰三角形两底角相等；∠BOC 是 △AOC 的外角', GOLDTXT],
      c2: ['（2）圆心在内部：∠BAC = ∠BAD + ∠DAC = {1/2}∠BOC', '两段弧拼成弧 BC，两边的角也跟着拼', GOLDTXT],
      c3: ['（3）圆心在外部：∠BAC = ∠DAC − ∠DAB = {1/2}∠BOC', '大段弧减去小段弧，剩下弧 BC：两边的角也跟着减', GOLDTXT],
      thm: ['圆周角定理：一条弧所对的圆周角，等于它所对的圆心角的一半', '', GOLDTXT],
      same: ['同弧或等弧所对的圆周角相等', `船在浅滩边上，处处是 ${fmt(DANGER)}`, GOLDTXT],
      ans: [`答：船上看两座灯塔的角小于 ${fmt(DANGER)}，就没进浅滩`, `正好 ${fmt(DANGER)} 在浅滩边上，大于 ${fmt(DANGER)} 就进去了`, GOLDTXT],
      right: ['半圆（或直径）所对的圆周角是直角', '90° 的圆周角所对的弦是直径', BLUETXT],
    });
    function pose(k) {
      if (!S.done || !k) return;
      growGen++; clearCase(); tweens.length = 0; clearGhosts(); foldG.visible = false;          // 先清场：拼的、拆的、绳子都收起来
      Object.assign(S, { proof: 0, proofDone: false, probe: null, vary: null, cut: [], rope: 0, fold: 0, cnum: true, beat: 'review', buoy: ['arc', 'def'].includes(k) ? 0 : 1, family: k === 'right' ? 1 : 0 });
      chips.forEach((c) => { c.visible = false; c.rotation.y = 0; });
      aim?.(['c1', 'c2', 'c3'].includes(k) ? [0, 1, 0.36] : [0, Math.sin(0.82), Math.cos(0.82)]);
      const onC = (t) => moveShip(onCirc(t));
      if (['arc', 'def', 'center', 'two', 'thm', 'same'].includes(k)) onC(-1.15);
      if (['def', 'thm', 'same'].includes(k)) for (let i = 0; i <= 8; i++) placeGhost(-2.75 + (2.75 - 0.4) * (i / 8));
      if (k === 'two') { const a0 = ccwStart(O, B0, C0); chips.forEach((c, i) => { setFan(c, O, a0 + i * DANGER, DANGER, RC); c.position.y = 0.0026 + 0.0002 * i; c.userData = { kind: 'cut', w: DANGER, pa0: a0 + i * DANGER }; }); S.cut = [0, 1]; }
      if (k === 'vary') { S.beat = 'vary'; chips.forEach((c) => { c.visible = true; c.userData = { kind: 'cut' }; }); S.cut = [0, 1]; moveShip([-0.0413, -0.0524]); }
      if (k === 'cls' || k === 'c1') moveShip(sub(mul(O, 2), B0));
      if (k === 'c1') { setupProof1(); S.rope = 1; placeBase(); chips.forEach((c, i) => { c.position.set(O[0], 0.0026 + 0.0002 * i, -O[1]); c.rotation.y = c.userData.twin ? Math.PI : 0; }); S.proof.placed = [0, 1]; S.proofDone = true; }
      if (k === 'c2' || k === 'c3') { onC(k === 'c2' ? -Math.PI / 2 - 0.3 : -0.32); setupCase(k === 'c2' ? 'in' : 'out'); S.cs.pairs.forEach((p, i) => { p.done = true; pa[i].material.opacity = 0.85; po[i].material.opacity = 0.85; }); }
      if (k === 'c3') { const cs = S.cs; setFan(pa[0], cs.A, ccwStart(cs.A, B0, C0), theta(), RC); setFan(po[0], O, ccwStart(O, B0, C0), central(), RC); pa[0].material.color.setHex(GOLD); po[0].material.color.setHex(BLUE); po[0].material.opacity = 0.6; pa[1].visible = po[1].visible = false; cs.taken = true; cs.pairs.forEach((p) => (p.arcHide = true)); }
      if (k === 'ans' || k === 'right') { S.beat = k === 'right' ? 'end' : 'inout'; moveShip([0.13, -0.15]); }
      layout(); const c = REVIEW_CAP()[k]; if (c) lightText(c[0], c[1], c[2]);
    }
    // 点：海面（小旗连成什么）、浮标（不动的那一点）
    let growGen = 0;
    const grow = (key, dur, done) => { const t0 = now(), gen = growGen; const tick = () => { if (dead || gen !== growGen) return; S[key] = Math.min(1, (now() - t0) / dur); layout(); if (S[key] < 1) requestAnimationFrame(tick); else done?.(); }; tick(); };
    function tapSea() { if (S.call !== 'sea' || S.circle) return; S.call = ''; sfx.whoosh({ dur: 0.6, freq: 900, gain: 0.04 }); grow('circle', 1.6); }
    function tapBuoy() { if (S.call !== 'buoy' || S.buoy) return; S.call = ''; S.buoy = 1; sfx.clink({ freq: 1300, gain: 0.05 }); board.h('概念'); board('<span class="n">3</span><b>圆心角</b>：顶点在圆心的角 <i>∠BOC</i>，和圆周角 <i>∠BAC</i> 对着同一条弧 <i>BC</i>'); punch(O, '', null); layout(); }
    const openPanel = () => { ui?.go?.(2); ui?.fold?.(false); };
    const panelBack = () => { if (S.panelLater) { S.panelLater = false; later(700, openPanel); } };

    // ================= 主线：场景带着走——先演给你看，停在一个问题上，再把关键那一下交给你 =================
    let runId = 0, speed = 1;
    const wait = (ms, id) => new Promise((r) => setTimeout(() => r(!dead && id === runId), ms / speed));
    const until = async (cond, id) => { while (!dead && id === runId && !cond()) await new Promise((r) => setTimeout(r, 100)); return !dead && id === runId; };
    const along = (pts, k) => { let L2 = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = dist(pts[i - 1], pts[i]); seg.push(l); L2 += l; } let s = k * L2; for (let i = 0; i < seg.length; i++) { if (s <= seg[i] || i === seg.length - 1) return add(pts[i], mul(sub(pts[i + 1], pts[i]), seg[i] ? Math.min(1, s / seg[i]) : 1)); s -= seg[i]; } return pts[pts.length - 1]; };
    const ease2 = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
    // 船自己开（演给你看）；学生一拿船就停下来
    const sail = (pts, ms, id, each) => new Promise((res) => { const t0 = now(), touch0 = userTouched; const step = () => { if (dead || id !== runId || userTouched !== touch0) return res(); const k = Math.min(1, ((now() - t0) * 1000 * speed) / ms); moveShip(along(pts, ease2(k))); each?.(k); if (k < 1) requestAnimationFrame(step); else res(); }; step(); });
    const arcPath = (t0, t1, n = 40) => Array.from({ length: n + 1 }, (_, i) => onCirc(t0 + ((t1 - t0) * i) / n));
    const arcTo = (p) => arcPath(tOn(S.ship), tOn(p), 24);          // 沿着这一圈开到 p
    const run = (ms, f, id) => new Promise((res) => { const t0 = now(); const step = () => { if (dead || id !== runId) return res(false); const k = Math.min(1, ((now() - t0) * 1000 * speed) / ms); f(k); if (k < 1) requestAnimationFrame(step); else res(true); }; step(); });          // 一段动画（快放时跟着快）
    const d40 = fmt(DANGER), d80 = () => fmt(central());
    async function mainLine() {
      const id = ++runId;
      // 一、开场：船自己开一段，两道光跟着转，夹角在变；正好 40° 的地方放下一面小旗
      S.beat = 'open'; S.call = '';
      lightText('船怎么知道自己进没进浅滩？', '浅滩在水下，只看得见岸上的两座灯塔。这个模型把危险角定为 40°');
      if (!(await wait(1200, id))) return;
      S.intro = true; toDeck();          // 开场：先站在船头，看岬角上的两座灯塔
      if (!(await wait(4500, id))) return;
      if (S.intro) { S.intro = false; if (S.mode === 'deck') toChart(); }
      if (!(await wait(1500, id))) return;
      await sail([[0.13, -0.112], [0.085, -0.122], [0.03, -0.1], [0.01, -0.07]], 5200, id);
      if (!(await wait(500, id))) return;
      lightText('拖着小船开一开', `船上看两座灯塔正好 ${d40} 的地方，会放下一面小旗`); S.call = 'ship';
      if (!(await until(() => lanterns.length >= 5 && arcSpread() >= 1.0, id))) return;
      // 二、小旗连成什么：揭开水面，量出来的弧正好是浅滩的边
      S.beat = 'arc'; S.call = 'sea';
      lightText('这些小旗连起来是什么？', '点一下海面');
      if (!(await until(() => S.circle > 0, id))) return;
      if (!(await wait(1800, id))) return;
      grow('reveal', 1.4); sfx.whoosh({ dur: 1.0, freq: 500, gain: 0.04 });
      if (!(await wait(1500, id))) return;
      punch(onCirc(-2.35), '', null);
      board.h('探究'); board(`<span class="n">1</span>船上看两座灯塔正好 ${d40} 的点，连成一段过两座灯塔的圆弧——正好是浅滩的边`);
      lightText(`${d40} 的点，连成一段过两座灯塔的圆弧`, '它正好是浅滩的边：船上看两座灯塔正好 40°，就在浅滩边上', GOLDTXT);
      if (!(await wait(5200, id))) return;
      // 三、沿着这段弧开：角度不变（圆周角）
      S.beat = 'walk'; S.walked = true; layout();
      lightText('沿着这段弧开，船上看到的角会变吗？');
      const ts = tOn(S.ship), tStart = Math.abs(tOn(onCirc(-2.5)) - ts) < Math.abs(tOn(onCirc(-0.65)) - ts) ? -2.5 : -0.65;
      await sail([S.ship, onCirc(tStart)], 1400, id);
      { let next = 0; const ta = tStart, tb = tStart < -1.5 ? -0.65 : -2.5; await sail(arcPath(ta, tb), 6200, id, (k) => { if (k >= next) { placeGhost(ta + (tb - ta) * k); next += 0.16; } }); }
      if (!(await wait(600, id))) return;
      punch(S.ship, '', null);
      board.h('概念'); board(`<span class="n">2</span><b>圆周角</b>：顶点在圆上，并且两边都与圆相交的角。船在这段弧上，<i>∠BAC</i> 处处是 ${d40}`);
      lightText('顶点在圆上、两边都和圆相交的角，叫圆周角', `船在这段弧上，圆周角 ∠BAC 处处是 ${d40}，都对着同一条弧 BC`, GOLDTXT);
      if (!(await wait(5200, id))) return;
      clearGhosts();
      lightText('为什么船在动，这个角却不变？', '找一样不动的东西：点一下浅滩中间的浮标'); S.call = 'buoy';
      if (!(await until(() => S.buoy, id))) return;
      // 四、圆心角：度数先不写——船上的角，在圆心能放下几个？
      S.beat = 'center';
      lightText('顶点在圆心的角，叫圆心角', '它和船上的圆周角 ∠BAC 对着同一条弧 BC', BLUETXT);
      if (!(await wait(4200, id))) return;
      if (zone() !== 'on') await sail([S.ship, onCirc(-1.15)], 1200, id);
      lightText(`船上这个 ${d40} 的角，在圆心能放下几个？`, '从船上把这个角剪下来，拖进圆心那个角里试试'); S.call = 'cut';
      if (!(await until(() => S.cnum, id))) return;
      S.call = '';
      lightText(`正好两个：∠BOC = ${d80()} = ${d40} + ${d40}`, '换个地方，还是正好两个吗？', GOLDTXT);
      if (!(await wait(4600, id))) return;
      // 五、改变弧 BC：船开到别处，过两座灯塔和船的圆跟着变，拼好的两块跟着走
      S.beat = 'vary'; S.vary = { lo: theta(), hi: theta() }; S.varyAt = now(); layout();
      lightText('换个地方，还是正好两个吗？', '把船开到别处（离开这一圈也行）：过两座灯塔和船的圆跟着船变'); S.call = 'ship';
      if (!(await until(() => !collinear(S.ship) && S.vary.hi - S.vary.lo > 0.42 && now() - S.movedAt > 1.2, id))) return;
      S.call = '';
      board('<span class="n">5</span>改变弧 <i>BC</i>（船开到别处，圆跟着变），圆心角里还是正好放下两个圆周角');
      lightText('改变弧 BC，还是正好两个', '量了这么多次都成立——可为什么总是正好两个？', GOLDTXT);
      if (!(await wait(5200, id))) return;
      { const back = onCirc(-1.15); await sail([S.ship, back], 1600, id); moveShip(back); }          // 回到浅滩边这一圈
      S.vary = null; chips.forEach((c) => (c.visible = false));
      // 六、三种位置：沿弧开，看浮标在角的哪儿
      S.beat = 'classify'; S.cls = { now: clsNow() }; S.cls[S.cls.now] = true; S.clsAt = now(); layout();
      lightText('船在这段弧上开，浮标和这个角的位置会变', `沿着弧开一开，一共有几种？现在：圆心在角的${CLS[S.cls.now]}`); S.call = 'ship';
      if (!(await until(() => S.cls.in && S.cls.out && S.cls.side && now() - S.movedAt > 0.8, id))) return;
      S.call = '';
      board.h('证明'); board('<span class="n">6</span>圆心与圆周角的位置关系有三种：圆心在圆周角的一条边上、内部、外部');
      lightText('三种：圆心在角的一条边上、内部、外部', '先看最简单的：圆心在角的一条边上', GOLDTXT);
      if (!(await wait(4200, id))) return;
      // 七、情况（1）：圆心在角的一条边上——我们带着证：同一根绳子、对折、拼进圆心
      S.beat = 'proof1'; aim?.([0, 1, 0.36]);
      { const tgt = [B0, C0].map((P) => sub(mul(O, 2), P)).sort((a, b) => dist(a, S.ship) - dist(b, S.ship))[0]; await sail([S.ship, ...arcTo(tgt), tgt], 1800, id); moveShip(tgt); }
      setupProof1(); layout();
      const xo = nm(S.proof.other);
      lightText(`OA 和 O${xo} 一样长吗？`, '都是从浮标拉到圆上的绳子');
      if (!(await wait(1000, id))) return;
      if (!(await run(1500, (k) => { S.rope = k; layout(); }, id))) return;
      sfx.clink({ freq: 1500, gain: 0.05 });
      lightText(`OA = O${xo}，都是半径：△AO${xo} 是等腰三角形`, '沿它的对称轴对折：A 处的角会落到哪里？');
      if (!(await wait(2200, id))) return;
      aim?.([0.07, 0.84, 0.53]); if (!(await wait(600, id))) return;
      buildFold(); foldG.visible = true; sfx.whoosh({ dur: 0.9, freq: 700, gain: 0.04 });
      if (!(await run(1800, (k) => { S.fold = k; foldApply(); }, id))) return;
      foldG.visible = false; placeBase(); sfx.clink({ freq: 1600, gain: 0.05 }); layout(); aim?.([0, 1, 0.36]);
      lightText(`∠A 正好落在 ∠${xo} 上：等腰三角形的两个底角相等`, '这两个角，能拼进圆心的 ∠BOC 吗？把它们拖进去'); S.call = 'base';
      if (!(await until(() => S.proofDone, id))) return;
      S.call = '';
      lightText(`∠BOC = ∠A + ∠${xo} = 2∠A`, `∠BOC 是 △AO${xo} 的外角。船上剪的第二块，原来一直在图里：就是 ${xo} 处的底角`, GOLDTXT);
      if (!(await wait(5800, id))) return;
      S.proof = 0; chips.forEach((c) => { c.visible = false; c.rotation.y = 0; }); layout();
      // 八、情况（2）：圆心在角的内部——交给学生：添一条线，变回情况（1）
      S.beat = 'case2'; lightText('圆心在角的内部呢？');
      { const tgt = onCirc(-Math.PI / 2 - 0.3); await sail([S.ship, ...arcTo(tgt), tgt], 2200, id); moveShip(tgt); }
      setupProbe('in');
      lightText('圆心在角的内部：两条边都不过圆心', '能不能添一条线，把它变回情况（1）？船上那根光可以转'); S.call = 'probe';
      if (!(await until(() => S.cs, id))) return;
      lightText('过 A 作直径 AD：两边各是一个情况（1）', 'D 把弧 BC 分成两段：对着同一段弧的两个角是一对。点一点每一对'); S.call = 'pair'; layout();
      if (!(await until(() => S.cs.pairs.every((p) => p.done), id))) return;
      S.call = '';
      { const [p0, p1] = S.cs.pairs; const row = board(`<span class="n">8</span>（2）圆心在内部：作直径 <i>AD</i>，<span class="p1"><i>∠${p0.nA}</i> = ${FR(1, 2)}<i>∠${p0.nO}</i></span>，<span class="p2"><i>∠${p1.nA}</i> = ${FR(1, 2)}<i>∠${p1.nO}</i></span>，相加得 <i>∠BAC</i> = ${FR(1, 2)}<i>∠BOC</i>`, true); punch(O, '', row);
        lightText(`∠BAC = ∠${p0.nA} + ∠${p1.nA} = {1/2}∠${p0.nO} + {1/2}∠${p1.nO} = {1/2}∠BOC`, '两段弧拼成弧 BC，两边的角也跟着拼：一半加一半，还是一半', GOLDTXT); }
      if (!(await wait(5800, id))) return;
      clearCase();
      // 九、情况（3）：圆心在角的外部——不提示
      S.beat = 'case3'; lightText('圆心在角的外部呢？', '');
      { const tgt = onCirc(-0.32); await sail([S.ship, ...arcTo(tgt), tgt], 2200, id); moveShip(tgt); }
      setupProbe('out');
      lightText('圆心在角的外部呢？', ''); S.call = 'probe';
      if (!(await until(() => S.cs, id))) return;
      lightText('还是直径 AD：D 落在弧 BC 外面', '大段弧里套着小段弧，两对也都是情况（1）。点一点每一对'); S.call = 'pair'; layout();
      if (!(await until(() => S.cs.pairs.every((p) => p.done), id))) return;
      lightText('∠BAC 和这两对是什么关系？', ''); S.call = 'take'; S.takeAt = performance.now(); S.takeHint = false; layout();
      if (!(await until(() => S.cs.taken, id))) return;
      S.call = '';
      { const [b, m] = S.cs.pairs; const row = board(`<span class="n">9</span>（3）圆心在外部：作直径 <i>AD</i>，<span class="p1"><i>∠${b.nA}</i> = ${FR(1, 2)}<i>∠${b.nO}</i></span>，<span class="p2"><i>∠${m.nA}</i> = ${FR(1, 2)}<i>∠${m.nO}</i></span>，相减得 <i>∠BAC</i> = ${FR(1, 2)}<i>∠BOC</i>`, true); punch(O, '', row);
        lightText(`∠BAC = ∠${b.nA} − ∠${m.nA} = {1/2}∠${b.nO} − {1/2}∠${m.nO} = {1/2}∠BOC`, '大段弧减去小段弧，剩下弧 BC：两边的角也跟着减', GOLDTXT); }
      if (!(await wait(5800, id))) return;
      clearCase(); aim?.([0, Math.sin(0.82), Math.cos(0.82)]); layout();
      // 八、定理：同一条弧上，处处都是一半
      S.beat = 'theorem'; S.theorem = true; ui?.unlock?.();
      for (let k = 0; k <= 8; k++) placeGhost(-2.75 + (2.75 - 0.4) * (k / 8));
      punch(O, '', null);
      board.h('定理'); board('<span class="n">10</span><b>圆周角定理</b>：一条弧所对的圆周角等于它所对的圆心角的一半。');
      board.h('推论'); board('<span class="n">11</span>同弧或等弧所对的圆周角相等。');
      lightText('圆周角定理：一条弧所对的圆周角，等于它所对的圆心角的一半', `同弧或等弧所对的圆周角相等。船沿浅滩边航行，视角一直是 ${d40}`, GOLDTXT);
      if (!(await wait(6500, id))) return;
      clearGhosts();
      // 九、开进浅滩、开出浅滩：回答开头的问题
      S.beat = 'inout'; S.io = {}; layout();
      lightText('那开进浅滩、开出浅滩呢？', '拖着船开进去，再开出来，看船上的角'); S.call = 'ship';
      if (!(await until(() => S.io.in && S.io.out && now() - S.ioAt > 3 && now() - S.movedAt > 1.5, id))) return;
      S.call = ''; S.answered = true; layout();
      punch(onCirc(-2.35), '', null);
      board.h('应用'); board(`<b>答</b>：船上看两座灯塔的角小于 ${d40}，就没进浅滩；等于 ${d40} 在浅滩边上，大于 ${d40} 就进去了。`);
      lightText(`答：船上看两座灯塔的角小于 ${d40}，就没进浅滩`, `正好 ${d40} 在浅滩边上，大于 ${d40} 就进去了`, GOLDTXT);
      if (!(await wait(6000, id))) return;
      // 十、等角线：每个角度都是一段弧；90° 那段以 BC 为直径——变中有不变
      S.beat = 'family'; sfx.whoosh({ dur: 1.2, freq: 600, gain: 0.05 });
      grow('family', 2.4);
      if (!(await wait(2600, id))) return;
      board.h('推论'); board('<span class="n">12</span>半圆（或直径）所对的圆周角是直角；90° 的圆周角所对的弦是直径。');
      lightText('每个角度，都是一段过两座灯塔的圆弧', '标着 90° 的那段以 BC 为直径：直径所对的圆周角是直角', BLUETXT);
      if (!(await wait(6000, id))) return;
      lightText('沿同一条等角弧航行，视角不变', '两座灯塔固定，船换到标着不同角度的弧上，视角就变了', GOLDTXT);
      S.done = true; S.beat = 'end'; boardEl?.classList.add('review');
      if (!(await wait(5000, id))) return;
      if (S.mode === 'deck') S.panelLater = true; else openPanel();
    }

    // 站到船头：镜头钻进盒子，从船上看两座灯塔；船头手边那卷海图点一下回来
    const chartRoll = new THREE.Group();
    const rollMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.014, 14).rotateZ(Math.PI / 2), basic({ color: 0xe9dcc0, depthTest: false, transparent: true }));
    rollMesh.renderOrder = 40;
    { const band2 = new THREE.Mesh(new THREE.CylinderGeometry(0.00232, 0.00232, 0.0016, 14).rotateZ(Math.PI / 2), basic({ color: 0x9b3b2c, depthTest: false, transparent: true })); band2.renderOrder = 41; band2.raycast = () => {};
      const t = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ map: labTex('回到海图', '#f6e8c8', 54), transparent: true, depthTest: false }))); t.scale.set(0.0105, 0.0036, 1); t.position.y = 0.0052; t.renderOrder = 41;
      chartRoll.add(rollMesh, band2, t); chartRoll.visible = false; group.add(chartRoll); }
    const rollAt = (() => { const a = new THREE.Vector3(), b = new THREE.Vector3(); return (cam) => {          // 屏幕右下角往里一点、镜头前 0.15（课本单位）的地方
      cam.updateMatrixWorld(); a.set(0.6, -0.8, -1).unproject(cam); b.set(0.6, -0.8, 1).unproject(cam); b.sub(a).normalize();
      group.updateMatrixWorld(); const s1 = group.matrixWorld.getMaxScaleOnAxis();
      a.copy(cam.position).addScaledVector(b, 0.15 * s1); group.worldToLocal(a); chartRoll.position.copy(a);
      const f = new THREE.Vector3(); cam.getWorldDirection(f); chartRoll.rotation.set(0, Math.atan2(-f.x, -f.z), 0); chartRoll.rotation.z = 0.12;
    }; })();
    const eye = () => { const toward = unit(sub(mid(B0, C0), S.ship)); return { E: add(S.ship, mul(toward, -0.004)), dir: toward }; };
    function deckLook() {
      const { dir } = eye(), E = add(S.ship, mul(dir, -0.012)), tgt = mid(B0, C0), Ey = H + 0.014, Ty = H + 0.024;          // 站在船上，看着两座灯塔
      const d3 = new THREE.Vector3(E[0] - tgt[0], Ey - Ty, -(E[1] - tgt[1])), dd = d3.length();
      look([tgt[0], Ty, -tgt[1]], d3.normalize().toArray(), dd, () => { S.mode = 'chart'; chartRoll.visible = false; wideFov(false); layout(); subtitle(); panelBack(); }, { minEl: 0, minZoom: 0.6 });
    }
    let deckT0 = 0;
    let fov0 = null, fovTo = null;
    const wideFov = (on) => { if (!camera) return; if (on) { if (fov0 == null) fov0 = camera.fov; fovTo = Math.max(fov0, 66); } else if (fov0 != null) fovTo = fov0; };          // 船头视角宽一点；回海图时还原
    function toDeck() { S.mode = 'deck'; deckT0 = now(); chartRoll.visible = !S.intro; wideFov(true); deckLook(); layout(); subtitle(); sfx.whoosh({ dur: 0.5, freq: 700, gain: 0.04 }); }
    function toChart() { S.mode = 'chart'; chartRoll.visible = false; wideFov(false); layout(); subtitle(); back(); panelBack(); }
    let deckDrag = null;
    const deckPointer = {
      down: (r, e) => { if (S.mode !== 'deck') return false; if (S.intro) { S.intro = false; toChart(); return true; } if (r.intersectObject(rollMesh, false).length) { toChart(); return true; } deckDrag = { x: e?.clientX ?? 0, y: e?.clientY ?? 0, raw: S.ship.slice() }; userTouched++; return true; },
      move: (r, e) => { if (S.mode !== 'deck') return false; if (!deckDrag || !e) return true; const dx = e.clientX - deckDrag.x, dy = e.clientY - deckDrag.y; const raw = add(deckDrag.raw, add(mul(eye().dir, -dy * 0.00022), mul([eye().dir[1], -eye().dir[0]], dx * 0.00022)));
        deckDrag = { x: e.clientX, y: e.clientY, raw: [clamp(raw[0], SEA.u0 + 0.009, SEA.u1 - 0.009), clamp(raw[1], SEA.v0 + 0.009, shore(clamp(raw[0], SEA.u0 + 0.009, SEA.u1 - 0.009)) - 0.013)] }; moveShip(deckDrag.raw); deckLook(); return true; },
      up: () => { if (S.mode !== 'deck') return false; deckDrag = null; return true; },
    };
    // 什么时候能动什么：跟着主线走（演示的时候、讲证明的时候船不乱跑）
    const canShip = () => S.mode === 'chart' && ['open', 'arc', 'vary', 'classify', 'inout', 'end'].includes(S.beat);
    const canCut = () => S.mode === 'chart' && S.call === 'cut' && S.cut.length < 2 && zone() === 'on';
    const canBase = (i) => S.mode === 'chart' && S.call === 'base' && !!S.proof && chips[i].visible && !S.proof.placed.includes(i);
    const canProbe = () => S.mode === 'chart' && S.call === 'probe' && !!S.probe;
    const canPair = (i) => S.mode === 'chart' && S.call === 'pair' && !!S.cs && !S.cs.pairs[i].done && !S.cs.pairs[i].busy;
    const canTake = (i) => S.mode === 'chart' && S.call === 'take' && !!S.cs && i === 1 && !S.cs.taken;
    const canSea = () => S.mode === 'chart' && S.call === 'sea';
    const canBuoy = () => S.mode === 'chart' && S.call === 'buoy';
    const drags = [
      { obj: K.cut, plane: 'xz', offset: 0.006 + INK_Y, hint: () => (canCut() ? '按住拖出来：剪下这个角' : ''), enabled: () => canCut(), onStart: () => cutDown(), onDrag: (p) => chipMove(uv(p)), onEnd: () => chipUp() },
      ...chips.map((c, i) => ({ obj: c, plane: 'xz', offset: 0.006 + INK_Y, hint: () => (canBase(i) ? '拖进圆心的角里' : ''), enabled: () => canBase(i), onStart: () => chipDown(i), onDrag: (p) => chipMove(uv(p)), onEnd: () => chipUp() })),
      { obj: K.probe, plane: 'xz', offset: 0.003 + INK_Y, hint: () => (canProbe() ? '拖着这根光转' : ''), enabled: () => canProbe(), onStart: () => probeDown(), onDrag: (p) => probeMove(uv(p)), onEnd: () => probeUp() },
      ...[0, 1].flatMap((i) => [pa[i], po[i]].map((obj) => ({ obj, plane: 'xz', offset: 0.006 + INK_Y, hint: () => (canPair(i) ? '点一下：用情况（1）' : canTake(i) ? '拖开' : ''), enabled: () => canPair(i) || canTake(i), onStart: (p) => takeDown(i, uv(p)), onDrag: (p) => takeMove(uv(p)), onEnd: () => takeUp(), onTap: () => pairTap(i) }))),          // 角片本身：窄的那块在船上难点，圆心那块宽一倍
      { obj: K.ship, plane: 'xz', offset: 0.004, keepOffset: false, hint: () => (canShip() ? '拖着小船开；点一下站到船头' : ''), enabled: () => canShip(), onStart: () => { userTouched++; }, onDrag: (p) => {
        const q = uv(p);
        if (S.beat === 'vary' && Math.abs(q[0]) > C0[0] && Math.abs(q[1] - B0[1]) < 0.00025) q[1] = B0[1];
        moveShip(q);
      }, onTap: () => toDeck() },
    ];
    const taps = [
      { obj: buoy, hint: () => (canBuoy() ? '点浮标' : ''), enabled: () => canBuoy(), onTap: () => tapBuoy() },
      { obj: sea, hint: () => (canSea() ? '点一下海面' : ''), enabled: () => canSea(), onTap: () => tapSea() },
    ];
    const dragApi = draggable(group, drags, { taps, onClick: () => false });
    let heard = false, wakeAt = null, seaSound = null;
    // 很轻的海浪声：第一次碰屏幕以后才起（浏览器要求），低通的噪声慢慢起伏
    const startSea = () => { if (seaSound || dead) return; try { const a = audio(), n = a.sampleRate * 4, buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0); let b0 = 0; for (let i = 0; i < n; i++) { b0 = 0.985 * b0 + 0.06 * (Math.random() * 2 - 1); d[i] = b0; }
      const src = a.createBufferSource(); src.buffer = buf; src.loop = true; const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650; const g2 = a.createGain(); g2.gain.value = 0;
      const lfo = a.createOscillator(); lfo.frequency.value = 0.1; const lg = a.createGain(); lg.gain.value = 0.009; lfo.connect(lg).connect(g2.gain);
      src.connect(lp).connect(g2).connect(a.destination); src.start(); lfo.start(); g2.gain.setTargetAtTime(0.018, a.currentTime, 3); seaSound = { src, lfo }; } catch { /* 没有声音也不要紧 */ } };
    const pointer = { down: (r, e) => { if (!heard) { heard = true; audio(); startSea(); } return deckPointer.down(r, e) || dragApi.down(r, e); }, move: (r, e) => deckPointer.move(r, e) || dragApi.move(r, e), up: (r, e) => deckPointer.up(r, e) || dragApi.up(r, e), items: dragApi.items };

    // 清场重来（给老师：换一批学生，或者想重新讲一遍）——键盘 R
    function reset() {
      runId++; for (const l of lanterns) group.remove(l.g); lanterns.length = 0; boardRows.length = 0; if (boardEl) boardEl.innerHTML = ''; tweens.length = 0; chips.forEach((c) => { c.visible = false; c.rotation.y = 0; }); [...pa, ...po, ...cp].forEach((c) => { c.visible = false; c.rotation.y = 0; }); foldG.visible = false; clearGhosts(); held = -1;
      boardEl?.classList.remove('review'); const wasDeck = S.mode === 'deck'; S = fresh(); cap.key = ''; capMesh.visible = false; if (wasDeck) toChart(); aim?.([0, Math.sin(0.82), Math.cos(0.82)]); layout(); mainLine();
    }
    const onKey = (e) => { if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !e.target?.closest?.('input,textarea')) reset(); };
    addEventListener('keydown', onKey);

    layout();
    return {
      group: root, card: false, place: 'spread', scale: 0.95,
      size: { w: 0.36, d: 0.31, h: 0.075 },
      view: { elev: 47, azim: 0, lookY: 0.03, frameMargin: 1.02 },
      pointer,
      mount(u) { ui = u; boardEl = document.createElement('div'); boardEl.className = 'ins-board' + (S.done ? ' review' : ''); u.controls?.append(boardEl);
        boardEl.addEventListener('click', (e) => { const r = e.target.closest?.('.ib-row'); if (!S.done || !r?.dataset.k) return; for (const o of boardRows) o.classList.remove('sel', 'fresh'); r.classList.add('sel'); sfx.clink({ freq: 1200, gain: 0.03 }); pose(r.dataset.k); }); for (const r of boardRows) { boardEl.append(r); r.classList.add('in'); } ui.go?.(1); if (!runId) mainLine(); else if (cap.key) ui.status?.(fractionHTML(capNow.filter(Boolean).join('　'))); },
      dispose() { dead = true; runId++; removeEventListener('keydown', onKey); subEl.remove(); css.remove(); try { seaSound?.src.stop(); seaSound?.lfo.stop(); } catch { /* 已经停了 */ } if (fov0 != null && camera) { camera.fov = fov0; camera.updateProjectionMatrix(); } },
      update() {
        const t = now();
        // 光写的字：淡进淡出
        { if (cap.out < 1e9) { const k = clamp(1 - (t - cap.out) / 0.35, 0, 1); capMesh.material.opacity = k; if (k <= 0) { cap.out = 1e9; const n = cap.next; cap.next = null; n?.(); } } else capMesh.material.opacity = clamp((t - cap.born) / 0.5, 0, 1); }
        for (let i = ripples.length - 1; i >= 0; i--) { const m = ripples[i], u = m.userData, a = t - u.born; if (a < 0) continue; if (a > u.life) { ink.remove(m); m.geometry.dispose(); m.material.dispose(); ripples.splice(i, 1); continue; } m.scale.setScalar(0.008 + a * u.grow); m.material.opacity = u.peak * (1 - a / u.life); }
        // 船开过留下尾迹：每走一小段，船尾荡开一圈淡淡的水纹
        { const back = add(S.ship, mul([Math.cos(S.head), Math.sin(S.head)], -0.011)); if (!wakeAt || dist(back, wakeAt) > 0.009) { if (wakeAt && S.mode === 'chart' && dist(back, wakeAt) < 0.05) ring(back, 0xffffff, 0, 0.0075, 0.32, 1.2); wakeAt = back; } }
        for (const [m, c] of TILE) { if (!c.shadeM || !m.visible) continue; const h = m.position.y + 0.0029, ry = m.rotation.y, d = 0.24 * h; c.shadeM.position.set(d * Math.cos(ry) - d * Math.sin(ry), -h + 0.0001, d * Math.sin(ry) + d * Math.cos(ry)); }          // 影子落在水面上，往右前方偏；拿得越高偏得越远
        foamTex.offset.x = (t * 0.006) % 1; foam.material.opacity = 0.55 + 0.2 * Math.sin(t * 0.9); foam.position.z = 0.0006 * Math.sin(t * 0.9);          // 浪花轻轻涌上来、退回去
        if (fovTo != null && camera) { camera.fov += (fovTo - camera.fov) * 0.12; if (Math.abs(camera.fov - fovTo) < 0.05) { camera.fov = fovTo; if (fov0 != null && fovTo === fov0) fov0 = null; fovTo = null; } camera.updateProjectionMatrix(); }
        caustTex.offset.set((t * 0.0045) % 1, Math.sin(t * 0.13) * 0.03); caustTex.rotation = Math.sin(t * 0.07) * 0.03;          // 水下光纹慢慢漂
        for (const L2 of LH) L2.userData.glow.material.opacity = 0.42 + 0.12 * Math.sin(t * 1.3 + L2.position.x * 40);
        buoy.position.y = 0.00025 * Math.sin(t * 1.9);
        for (let i = tweens.length - 1; i >= 0; i--) { const w = tweens[i], k = clamp((t - w.t0) / w.dur, 0, 1), e = easeOut(k), f = w.from, o = w.to; w.m.position.set(lerp(f.x, o.x ?? f.x, e), lerp(f.y, o.y ?? f.y, e), lerp(f.z, o.z ?? f.z, e)); w.m.rotation.y = lerp(f.ry, o.ry ?? f.ry, e); if (k >= 1) { tweens.splice(i, 1); w.done?.(); } }          // 补间：只滑、只转
        // 浅滩揭开：盖着的水色淡掉
        murk.material.opacity = 0.92 * (1 - easeOut(S.reveal)); murk.visible = S.reveal < 1;
        // 一路留下的同一个角
        S.ghosts.forEach((g, i) => { const m = ghostFans[i]; if (!m || S.mode === 'deck') return; m.visible = true; m.material.opacity = 0.32 * clamp((t - g.born) / 0.4, 0, 1); });
        // 叫你动手的地方：一圈光一呼一吸
        { const k = Math.sin(t * 3.2) ** 2; let at = null;
          if (S.call === 'ship' && S.mode === 'chart') at = S.ship; else if (S.call === 'cut') at = bis(S.ship, B0, C0, 0.012); else if (S.call === 'sea') at = onCirc(-Math.PI / 2);
          else if (S.call === 'probe' && S.probe && !S.probe.snapped) at = lerp2(S.ship, probeEnd(), 0.62);
          else if ((S.call === 'pair' || S.call === 'take') && S.cs && !S.cs.take) { const i = S.call === 'take' ? 1 : S.cs.pairs.findIndex((p) => !p.done && !p.busy); if (i >= 0 && SK[i].position.y > 0) at = [SK[i].position.x, -SK[i].position.z]; }
          callRing.visible = !!at && S.mode === 'chart'; if (at) { callRing.position.x = at[0]; callRing.position.z = -at[1]; callRing.scale.setScalar(1 + 0.25 * k); callRing.material.opacity = 0.35 + 0.5 * k; } }
        if (S.mode === 'deck' && chartRoll.visible) { rollAt(camera); const k = clamp((t - deckT0 - 0.6) / 0.5, 0, 1); chartRoll.traverse((o) => { if (o.material) o.material.opacity = k; }); }
        waves.offset.x = (t * 0.004) % 1; waves.offset.y = Math.sin(t * 0.3) * 0.004;
        void LH;
        boat.position.y = 0.0003 + 0.0004 * Math.sin(t * 2.1); boat.rotation.z = 0.04 * Math.sin(t * 1.7);
        for (const l of lanterns) { l.g.scale.setScalar(Math.min(1, (t - l.g.userData.born) / 0.6)); l.g.position.y = 0.0004 * Math.sin(t * 2 + l.p[0] * 90); }
        { const ring = buoy.userData.halo, k = Math.sin(t * 3) ** 2, on = S.call === 'buoy' || (S.call === 'probe' && S.hint >= 1); ring.material.opacity = on ? 0.3 + 0.55 * k : 0; ring.scale.setScalar(on ? 1 + 0.18 * k : 1); }
        if (S.call === 'base') chips.forEach((c, i) => { if (!S.proof?.placed.includes(i) && held !== i) c.material.opacity = 0.6 + 0.35 * Math.sin(t * 3.2 + i) ** 2; else c.material.opacity = 0.9; });          // 两个底角一闪一闪：能拿起来
        if (S.call === 'pair' && S.cs) S.cs.pairs.forEach((p, i) => { pa[i].material.opacity = !p.done && !p.busy ? 0.55 + 0.35 * Math.sin(t * 3.2 + i * 1.3) ** 2 : 0.85; });          // 还没点的那一对一闪一闪
        if (S.call === 'take' && S.cs && !S.cs.taken && !S.cs.take) pa[1].material.opacity = 0.55 + 0.4 * Math.sin(t * 3.2) ** 2;
        // 卡住很久才一级一级给提示（真实时间，快放不触发）
        if (S.call === 'probe' && S.probe && !S.probe.snapped) { const k2 = S.probe.kind === 'in', age = (performance.now() - S.probe.t0) / 1000, lv = age > (k2 ? 25 : 30) ? 2 : age > (k2 ? 12 : 15) ? 1 : 0;
          if (lv > S.hint) { S.hint = lv; lightText(k2 ? '能不能添一条线，把它变回情况（1）？' : '圆心在角的外部呢？', lv === 2 ? '转那根光，让它穿过浮标' : k2 ? '情况（1）里，角的一条边穿过了圆心' : '这条线不一定要在角的里面'); if (lv === 2) ring(O, BLUE); layout(); } }
        if (S.call === 'ship' && S.beat === 'vary' && S.vary && !collinear(S.ship) && !S.varyHint && t - S.varyAt > 15 && t - S.movedAt > 3 && S.vary.hi - S.vary.lo < 0.42) { S.varyHint = true; lightText('换个地方，还是正好两个吗？', '开远一点，或者开到两座灯塔跟前'); }
        if (S.call === 'ship' && S.beat === 'classify' && S.cls && !S.clsHint && t - S.clsAt > 18 && t - S.movedAt > 3 && !(S.cls.in && S.cls.out && S.cls.side)) { S.clsHint = true; lightText('船在这段弧上开，浮标和这个角的位置会变', '往弧的两头开一开：浮标会跑到角的边上、角的外面'); }
        if (S.call === 'take' && S.cs && !S.cs.taken && !S.takeHint && performance.now() - S.takeAt > 12000) { S.takeHint = true; lightText('∠BAC 和这两对是什么关系？', '大的一对减去小的一对：把小的那一对拿开'); }
        if (S.family > 0) { group.updateMatrixWorld(); contour.material.uniforms.inv.value.copy(group.matrixWorld).invert(); }
      },
      debug: {
        get S() { return S; },
        lanterns, notes, board: boardRows, H, punch, labels: () => [...Object.values(LB), ...conLabs, conDanger], cap: () => capNow, theta, central, moveShip, tapSea, tapBuoy, cutDown, chipDown, chipMove, chipUp, probeDown, probeMove, probeUp, pairTap, takeDown, takeMove, takeUp, pose, toDeck, toChart, reset, onCirc, O, B0, C0, T_LO, T_HI,
        fast: (k) => { speed = k; }, wg: group, SK, bis, chips, aim: (d) => aim?.(d),
        qa: [
          { name: '快放：开场演示', run: () => { speed = 30; }, wait: 1 },
          { name: '在海上来回开，放小旗', run: () => { for (let k = 0; k <= 320; k++) { const t = (k / 320) * TAU * 2; moveShip([0.12 * Math.cos(t * 1.3), -0.04 + 0.08 * Math.sin(t)]); } }, wait: 1 },
          { name: '点海面：小旗连成圆弧，揭开浅滩', run: () => tapSea(), wait: 2 },
          { name: '沿弧开（演示）之后点浮标', run: () => tapBuoy(), wait: 2 },
          { name: '剪两块拼进圆心：正好两个', run: () => { for (let i = 0; i < 2; i++) { cutDown(); chipMove(O); chipUp(); } }, wait: 2 },
          { name: '开到别处：圆跟着变，两块跟着走', run: () => { for (const p of [[0.12, -0.05], [-0.12, -0.11], [0.0, 0.0], [0.02, 0.012]]) moveShip(p); }, wait: 3 },
          { name: '沿弧开：浮标在角的边上、内部、外部', run: () => { for (let k = 0; k <= 90; k++) moveShip(onCirc(T_LO + ((T_HI - T_LO) * k) / 90)); }, wait: 3 },
          { name: '情况（1）：两个底角拖进圆心', run: () => { for (let i = 0; i < 2; i++) { chipDown(i); chipMove(O); chipUp(); } }, wait: 3 },
          { name: '情况（2）：转光穿过浮标', run: () => { probeDown(); probeMove(O); probeUp(); }, wait: 1 },
          { name: '情况（2）：点两对', run: () => { pairTap(0); pairTap(1); }, wait: 3 },
          { name: '情况（3）：转光穿过浮标', run: () => { probeDown(); probeMove(O); probeUp(); }, wait: 1 },
          { name: '情况（3）：点两对', run: () => { pairTap(0); pairTap(1); }, wait: 2 },
          { name: '情况（3）：把小的一对拿开', run: () => { const q = [SK[1].position.x, -SK[1].position.z]; takeDown(1, q); takeMove(add(q, [0.03, -0.04])); takeUp(); }, wait: 3 },
          { name: '开进浅滩、开出浅滩', run: () => { moveShip([0.0, -0.045]); moveShip([0.13, -0.15]); }, wait: 4 },
        ],
      },
    };
  },
};
