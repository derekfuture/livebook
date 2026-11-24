// 数学 八年级上册 综合与实践 最短路径问题 · 牧民饮马（课本 PDF 第 101–102 页，图 1–4）。
// 一块草原立在书上，一条笔直的河横穿过去。蒙古包 A、羊圈 B 在河的这一边（离人近），对岸往后是缓坡。
// 一个画面里讲完，每一步都由学生的那一下做出来：
//   开头的问题：到河边哪里饮马，走的路最短？
//   拖着马沿河边走（马迈着步子走，松手就低头喝水）：河里一根根标杆记下走过的每一处（杆越高路越远）→ 有一处最短；
//   为什么偏偏在那儿？要是羊圈在河对岸，拉一条直线就行 → 把羊圈那一块（C、B、B 到河边的垂足围成的三角形）沿河折到对岸：B 落到 B′（对称点）；
//   再拖着马走：CB 和 CB′ 总是一样长（线段垂直平分线上的点与这条线段两个端点的距离相等）；
//   A、B′ 在河两边了：把折线拉直（重拍 1：两点之间，线段最短），就在最低的那根标杆旁边；
//   别的地方为什么都更远？把马牵到别处 C′：AC′、C′B′ 两条边转到 AB′ 上接起来，比 AB′ 长出一截（重拍 2：三角形两边的和大于第三边）；
//   C 这个点还有什么特别？牵回 C：∠1 = ∠2（重拍 3：一束光从 A 射到 C 再反射到 B——光行最速原理）→ 答开头的问题。
import * as THREE from 'three';
import { add, sub, mul, unit, dist, clamp, lerp, easeOut } from './kit/sheet.js';
import { mathActionCue } from './kit/mathActionCue.js';
import { draggable } from './kit/interact.js';
import { sfx, audio } from './kit/audio.js';

const G = 0.02;                                   // 河岸顶面高
const RV1 = 0.022;                                // 河：v 从 0 到 0.022；河边 l 就是 v = 0 那条岸线（A、B 这一边）
const WATER = G - 0.002;                          // 水面高（比岸低一点，马低头够得着）
const A = [-0.075, -0.05], B = [0.075, -0.085], H = [B[0], 0], B2 = [B[0], -B[1]];   // 蒙古包、羊圈、垂足、羊圈关于 l 的对称点
const M = 1000;                                   // 1 个单位 = 1000 米
const C_MIN = -0.15, C_MAX = 0.15;
const LIFT = 0.0042;                              // 线和折纸离地面的高度（在草尖上面）
const HV = -0.0045;                                // 马站的地方：河边往里一点
const YURT = [A[0] - 0.026, A[1] - 0.004], PEN = [B[0] + 0.024, B[1] - 0.003], PEN2 = [PEN[0], -PEN[1]];   // 蒙古包、羊圈放在 A、B 旁边，门朝着点：点本身露在外面
const P3 = (p, y = 0) => new THREE.Vector3(p[0], y, -p[1]);
const len = (c) => dist(A, [c, 0]) + dist([c, 0], B);
const CSTAR = A[0] + ((B2[0] - A[0]) * (0 - A[1])) / (B2[1] - A[1]);   // A→B′ 和 l 的交点
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
// 草原的轮廓：不规则的一块地（u 向右，v 向里）；后面留出几道缓坡
const OUTLINE = [[-0.19, -0.085], [-0.168, -0.116], [-0.11, -0.12], [-0.05, -0.13], [0.02, -0.122], [0.09, -0.132], [0.15, -0.12], [0.188, -0.092], [0.193, -0.04], [0.186, 0.01], [0.195, 0.07], [0.19, 0.125], [0.165, 0.168], [0.1, 0.182], [0.03, 0.174], [-0.04, 0.186], [-0.11, 0.176], [-0.165, 0.16], [-0.192, 0.115], [-0.186, 0.05], [-0.195, -0.02]];
const HILLS = [[-0.12, 0.145, 0.048, 0.026, 0.012], [-0.06, 0.155, 0.05, 0.022, 0.008], [0.04, 0.148, 0.07, 0.024, 0.014], [0.13, 0.142, 0.048, 0.026, 0.018]];   // 中心 u、v，半径 u、v，高

export default {
  id: 'riverhorse',
  fig: '图2',
  title: '最短路径问题',
  flow: 'explore',
  ask: '牧民从蒙古包 A 出发，到河边饮马，再去羊圈 B。<br>到河边哪里饮马，走的路最短？',
  need: '拖着马沿河边走，看路程怎么变。',
  conclusion: {
    page: 101, rect: [60, 40, 490, 262],
    quote: '（２）在任务１中，点 A，B 在直线 l 的同侧，你能利用轴对称，把这个问题转化为（１）中的问题吗（参考图４）？',
    why: '把羊圈那一块沿河边 l 折到对岸：B 落到 B′（B 关于 l 的对称点），l 垂直平分 BB′。线段垂直平分线上的点与这条线段两个端点的距离相等，所以 l 上每一点 C 都有 CB = CB′，AC + CB = AC + CB′。A 和 B′ 在河的两边：两点之间，线段最短，连接 AB′ 交 l 于 C，在 C 处饮马路最短。<br><br>别处为什么都更远：在 l 上任取另一点 C′，AC′ + C′B = AC′ + C′B′ > AB′ = AC + CB（三角形两边的和大于第三边）。在 C 处两边的路和河边夹的角相等——光照到镜面上反射，走的也正是这条最短的路（光行最速原理）。',
    src: '课本 · 综合与实践 最短路径问题（牧民饮马问题，图 1–4）',
  },

  create({ aim, tag, camera }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    let ui = null, dead = false;
    const T0 = performance.now(), now = () => (performance.now() - T0) / 1000;
    const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    const basic = (o) => new THREE.MeshBasicMaterial(o);
    const lit = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o });
    const quiet = (m) => { m.raycast = () => {}; m.userData.noFrame = true; return m; };
    const solid = (m) => { m.castShadow = true; m.receiveShadow = true; m.raycast = () => {}; m.userData.noFrame = true; return m; };
    const GOLD = 0xffc83d, IMG = 0x58c4dd, INK = 0xffffff;          // 路（主角）黄、对称过去的蓝、辅助线白
    const uT = { value: 0 };

    // ================= 草原：一块不规则的地，河从中间笔直地穿过去，切面露出泥土和河水 =================
    const curve = new THREE.CatmullRomCurve3(OUTLINE.map(([u, v]) => new THREE.Vector3(u, v, 0)), true, 'centripetal');
    const outline = curve.getPoints(200).slice(0, -1).map((p) => [p.x, p.y]);
    const inPoly = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
    const clipV = (poly, c, above) => { const out = [], inside = (p) => (above ? p[1] >= c : p[1] <= c);
      for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], ia = inside(a), ib = inside(b); if (ia) out.push(a); if (ia !== ib) { const t = (c - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, c]); } }
      return out; };
    const slab = (poly, top, mats, bt = 0.0012) => { const g = new THREE.ExtrudeGeometry(new THREE.Shape(poly.map(([u, v]) => new THREE.Vector2(u, v))), { depth: top - 2 * bt, bevelEnabled: true, bevelThickness: bt, bevelSize: bt, bevelSegments: 2, steps: 1 }); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, mats); m.position.y = bt; m.receiveShadow = true; m.raycast = () => {}; m.userData.qaSupport = true; group.add(m); return m; };
    const grassTex = tex(1024, 1024, (g, w, h) => { g.fillStyle = '#cfdba2'; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 70; k++) { const x = Math.random() * w, y = Math.random() * h, r = 60 + Math.random() * 140, gr = g.createRadialGradient(x, y, 0, x, y, r), dry = Math.random() < 0.45; gr.addColorStop(0, dry ? 'rgba(226,218,160,0.32)' : 'rgba(160,186,110,0.24)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
      for (let k = 0; k < 9000; k++) { g.fillStyle = `rgba(${100 + Math.random() * 50},${128 + Math.random() * 40},${60 + Math.random() * 20},${Math.random() * 0.08})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 2 + Math.random() * 4); } });
    grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping; grassTex.repeat.set(2.4, 2.4);
    const soilTex = tex(512, 128, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5e4a32'); gr.addColorStop(0.16, '#6f5638'); gr.addColorStop(0.22, '#a4825a'); gr.addColorStop(1, '#8e6d4a'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      for (let k = 0; k < 500; k++) { c.strokeStyle = `rgba(70,52,30,${0.3 + Math.random() * 0.4})`; c.lineWidth = 1; const x = Math.random() * w; c.beginPath(); c.moveTo(x, h * 0.14); c.lineTo(x + (Math.random() - 0.5) * 4, h * (0.17 + Math.random() * 0.12)); c.stroke(); }
      for (let k = 0; k < 700; k++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? '70,54,36' : '196,178,150'},${0.25 + Math.random() * 0.35})`; const r = 0.6 + Math.random() * 1.8; c.beginPath(); c.arc(Math.random() * w, h * (0.25 + Math.random() * 0.75), r, 0, 6.3); c.fill(); } });
    soilTex.wrapS = soilTex.wrapT = THREE.RepeatWrapping; soilTex.flipY = false; soilTex.repeat.set(10, 1 / G); soilTex.offset.y = -(((1 - G + 0.0012) / G) % 1);          // 切面的 uv.y = 1 − 高度：一整张贴图正好从坡顶铺到底
    const grass = lit({ map: grassTex, roughness: 0.95 }), soil = lit({ map: soilTex, roughness: 0.95 });
    slab(clipV(outline, 0, false), G, [grass, soil]);          // 河这一边（A、B 所在的岸，离人近）
    slab(clipV(outline, RV1, true), G, [grass, soil]);         // 对岸
    const flowTex = tex(512, 128, (c, w, h) => { c.fillStyle = '#86b5c6'; c.fillRect(0, 0, w, h); for (let k = 0; k < 170; k++) { const y = Math.random() * h, x = Math.random() * w, l = 20 + Math.random() * 90; c.strokeStyle = `rgba(236,248,252,${0.07 + Math.random() * 0.15})`; c.lineWidth = 1 + Math.random() * 1.6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + l, y + (Math.random() - 0.5) * 3); c.stroke(); } });
    flowTex.wrapS = flowTex.wrapT = THREE.RepeatWrapping; flowTex.repeat.set(10, 40);
    const waterTop = new THREE.MeshPhysicalMaterial({ map: flowTex, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.08 }), waterSide = lit({ color: 0x5b8ea4, roughness: 0.3 });
    slab(clipV(clipV(outline, 0, true), RV1, false), WATER, [waterTop, waterSide], 0.0006);
    // 对岸后面几道缓坡：一圈圈平滑地鼓起来，和地面接得上
    const hillGeo = new THREE.LatheGeometry(Array.from({ length: 17 }, (_, i) => { const r = 1 - i / 16; return new THREE.Vector2(r, (1 - r * r) ** 2); }), 40);
    for (const [cu, cv, ru, rv, h] of HILLS) { const hg = hillGeo.clone().scale(ru, h, rv).translate(cu, G - 0.0003, -cv); hg.computeVertexNormals(); const hp = hg.attributes.position, huv = hg.attributes.uv; for (let i = 0; i < hp.count; i++) huv.setXY(i, hp.getX(i), -hp.getZ(i)); const m = new THREE.Mesh(hg, grass); m.receiveShadow = true; m.castShadow = true; m.raycast = () => {}; m.userData.qaSupport = true; group.add(m); }
    // 河边一条被踩出来的土路：马就沿着它走
    { const t = tex(1024, 64, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(196,176,134,0)'); gr.addColorStop(0.35, 'rgba(196,176,134,0.75)'); gr.addColorStop(0.75, 'rgba(190,168,124,0.8)'); gr.addColorStop(1, 'rgba(196,176,134,0.1)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); for (let k = 0; k < 1600; k++) { c.fillStyle = `rgba(120,96,64,${Math.random() * 0.18})`; c.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 2); } const fade = c.createLinearGradient(0, 0, w, 0); fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(0.05, 'rgba(0,0,0,0)'); fade.addColorStop(0.95, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)'); c.globalCompositeOperation = 'destination-out'; c.fillStyle = fade; c.fillRect(0, 0, w, h); });
      const trail = quiet(new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.015).rotateX(-Math.PI / 2), lit({ map: t, transparent: true, depthWrite: false, roughness: 1 }))); trail.position.set(0, G + 0.0003, -(-0.0075)); trail.receiveShadow = true; trail.renderOrder = 1; group.add(trail); }
    // 草：一层被风吹着的细草；河、土路、几处地标、缓坡上不长
    const sway = (mat, H0) => { mat.customProgramCacheKey = () => 'rh-sway' + H0; mat.onBeforeCompile = (sh) => { sh.uniforms.uT = uT; sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n  float bk = position.y / ${H0.toFixed(4)};\n  vec4 ip = instanceMatrix[3];\n  transformed.x += sin(uT * 1.6 + ip.x * 80.0 + ip.z * 50.0) * 0.00055 * bk * bk;\n  transformed.z += cos(uT * 1.2 + ip.x * 60.0) * 0.00025 * bk * bk;`); }; return mat; };
    { const N = 5000, geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.00042, 0, 0, 0.00042, 0, 0, 0.0001, 0.0036, 0], 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
      const blades = new THREE.InstancedMesh(geo, sway(lit({ color: 0xffffff, roughness: 1, side: THREE.DoubleSide }), 0.0036), N), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
      let k = 0;
      for (let tries = 0; k < N && tries < 60000; tries++) { const p = [(Math.random() - 0.5) * 0.4, -0.135 + Math.random() * 0.33];
        if (!inPoly(p, outline) || (p[1] > -0.015 && p[1] < RV1 + 0.003) || dist(p, YURT) < 0.026 || dist(p, PEN) < 0.024 || dist(p, PEN2) < 0.026 || dist(p, A) < 0.008 || dist(p, B) < 0.008 || HILLS.some(([cu, cv, ru, rv]) => ((p[0] - cu) / ru) ** 2 + ((p[1] - cv) / rv) ** 2 < 0.8)) continue;
        e.set((Math.random() - 0.5) * 0.5, Math.random() * 6.3, (Math.random() - 0.5) * 0.5); q.setFromEuler(e); const s = 0.45 + Math.random() * 0.55;
        m4.compose(new THREE.Vector3(p[0], G, -p[1]), q, new THREE.Vector3(1, s, 1)); blades.setMatrixAt(k, m4);
        col.setHSL(0.19 + Math.random() * 0.07, 0.3 + Math.random() * 0.16, 0.62 + Math.random() * 0.12); blades.setColorAt(k, col); k++; }
      blades.count = k; blades.raycast = () => {}; blades.userData.noFrame = true; group.add(blades);
      // 芦苇：河两头的几丛（马走不到的地方）
      const R = 90, reeds = new THREE.InstancedMesh(new THREE.ConeGeometry(0.00038, 0.009, 4).translate(0, 0.0045, 0), sway(lit({ color: 0x9c9a5c, roughness: 0.9 }), 0.009), R);
      let r = 0; for (const [cu, cv] of [[-0.181, -0.006], [-0.168, RV1 + 0.004], [0.179, -0.006], [0.164, RV1 + 0.005], [-0.06, RV1 + 0.004], [0.13, RV1 + 0.004]]) for (let i = 0; i < 15 && r < R; i++) { const p = [cu + (Math.random() - 0.5) * 0.016, cv + (Math.random() - 0.5) * 0.005]; e.set((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3); q.setFromEuler(e); m4.compose(new THREE.Vector3(p[0], G - 0.001, -p[1]), q, new THREE.Vector3(1, 0.6 + Math.random() * 0.6, 1)); reeds.setMatrixAt(r++, m4); }
      reeds.count = r; reeds.castShadow = true; reeds.raycast = () => {}; reeds.userData.noFrame = true; group.add(reeds);
    }
    // 蒙古包 A：毡墙、花边、捆绳、圆顶、烟囱冒着烟
    const pipeTop = new THREE.Vector3();
    { const R = 0.019, HW = 0.012, HR = 0.011, g2 = new THREE.Group();
      const wallTex = tex(1024, 256, (c, w, h) => { c.fillStyle = '#f3ede1'; c.fillRect(0, 0, w, h); for (let k = 0; k < 2600; k++) { c.fillStyle = `rgba(150,128,96,${Math.random() * 0.05})`; c.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 6, 1 + Math.random() * 3); }
        c.fillStyle = '#a3352a'; c.fillRect(0, h * 0.06, w, h * 0.17); c.strokeStyle = '#f2dcae'; c.lineWidth = 3; c.beginPath(); for (let x = 0; x < w; x += 24) { c.moveTo(x, h * 0.2); c.lineTo(x + 6, h * 0.1); c.lineTo(x + 12, h * 0.2); } c.stroke();
        c.fillStyle = 'rgba(96,74,52,0.85)'; c.fillRect(0, h * 0.45, w, 5); c.fillRect(0, h * 0.72, w, 5);
        const gr = c.createLinearGradient(0, h * 0.82, 0, h); gr.addColorStop(0, 'rgba(120,98,74,0)'); gr.addColorStop(1, 'rgba(120,98,74,0.4)'); c.fillStyle = gr; c.fillRect(0, h * 0.82, w, h * 0.18); });
      const roofTex = tex(1024, 256, (c, w, h) => { c.fillStyle = '#eee7da'; c.fillRect(0, 0, w, h); for (let k = 0; k < 2000; k++) { c.fillStyle = `rgba(150,128,96,${Math.random() * 0.05})`; c.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 5, 1 + Math.random() * 3); }
        c.strokeStyle = 'rgba(110,86,60,0.55)'; c.lineWidth = 3; for (let i = 0; i < 16; i++) { const x = (i / 16) * w; c.beginPath(); c.moveTo(x, h * 0.12); c.lineTo(x, h); c.stroke(); } c.fillStyle = '#7a5a3c'; c.fillRect(0, 0, w, h * 0.12); });
      const wall = solid(new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.01, HW, 48, 1, true), lit({ map: wallTex, roughness: 0.9, side: THREE.DoubleSide }))); wall.position.y = HW / 2;
      const roof = solid(new THREE.Mesh(new THREE.ConeGeometry(R * 1.07, HR, 48, 1, true), lit({ map: roofTex, roughness: 0.9, side: THREE.DoubleSide }))); roof.position.y = HW + HR / 2 - 0.0006;
      const crown = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0034, 0.0036, 0.0012, 24), lit({ color: 0x8a6440 }))); crown.position.y = HW + HR * 0.87;
      const door = solid(new THREE.Mesh(new THREE.BoxGeometry(0.0066, 0.0088, 0.0014), lit({ color: 0xc0502c, roughness: 0.6 }))); door.position.set(0, 0.0044, R - 0.0002);
      const lintel = solid(new THREE.Mesh(new THREE.BoxGeometry(0.0078, 0.0012, 0.0018), lit({ color: 0xd9a441, roughness: 0.5 }))); lintel.position.set(0, 0.0092, R);
      const pipe = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0007, 0.0007, 0.007, 8), lit({ color: 0x4a4744, roughness: 0.5 }))); pipe.position.set(0.0055, HW + HR * 0.55 + 0.0025, -0.002);
      g2.add(wall, roof, crown, door, lintel, pipe); g2.position.copy(P3(YURT, G)); g2.rotation.y = Math.atan2(A[0] - YURT[0], -(A[1] - YURT[1])); group.add(g2);          // 门朝着 A
      g2.updateMatrix(); pipeTop.set(0.0055, HW + HR * 0.55 + 0.006, -0.002).applyMatrix4(g2.matrix);
    }
    const puffTex = tex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); });
    const puffs = Array.from({ length: 9 }, (_, i) => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: 0xf2efe8, transparent: true, depthWrite: false, opacity: 0 }))); group.add(sp); return { sp, k0: i / 9 }; });
    // 羊圈 B：一圈木桩和两道横杆（前面留个门），里面几只羊
    const woolGeo = new THREE.IcosahedronGeometry(1, 2); { const p = woolGeo.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + (Math.random() - 0.5) * 0.14; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } woolGeo.computeVertexNormals(); }
    const ballGeo = new THREE.SphereGeometry(1, 10, 8);
    const pen = (p, to, wood, wool, dark) => { const g2 = new THREE.Group(), R = 0.017, N = 14, pts = [];
      for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2 + 0.12; pts.push([Math.cos(a) * R * (1 + 0.05 * Math.sin(i * 2.3)), Math.sin(a) * R]); }
      for (const [x, z] of pts) { const post = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.00055, 0.00068, 0.0068, 6), wood)); post.position.set(x, 0.0034, z); g2.add(post); }
      for (let i = 0; i < N; i++) { if (i === 3) continue; const a = pts[i], b = pts[(i + 1) % N], l = Math.hypot(b[0] - a[0], b[1] - a[1]); for (const y of [0.0027, 0.0054]) { const rail = solid(new THREE.Mesh(new THREE.BoxGeometry(l, 0.0005, 0.0005), wood)); rail.position.set((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2); rail.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]); g2.add(rail); } }
      const flock = [];
      for (const [x, z, yaw, graze] of [[-0.006, 0.004, 0.4, 1], [0.005, -0.003, 2.2, 0], [0.0005, 0.008, 1.1, 1], [-0.004, -0.0075, 3.4, 0], [0.009, 0.005, 5, 1], [-0.0095, -0.001, 4.2, 0]]) { const s = new THREE.Group();
        const body = solid(new THREE.Mesh(woolGeo, wool)); body.scale.set(0.0034, 0.0025, 0.0023); body.position.y = 0.0042;
        const head = solid(new THREE.Mesh(ballGeo, dark)); head.scale.set(0.0015, 0.0012, 0.001); head.position.set(0.0034, graze ? 0.0024 : 0.0049, 0);
        s.add(body, head); for (const [lx, lz] of [[0.0018, 0.001], [0.0018, -0.001], [-0.0018, 0.001], [-0.0018, -0.001]]) { const leg = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.00035, 0.0003, 0.0026, 5), dark)); leg.position.set(lx, 0.0013, lz); s.add(leg); }
        s.position.set(x, 0, z); s.rotation.y = yaw; g2.add(s); flock.push({ s, yaw }); }
      const gap = (3.5 / N) * Math.PI * 2 + 0.12; g2.rotation.y = gap - Math.atan2(-(to[1] - p[1]), to[0] - p[0]);          // 圈门朝着点
      g2.position.copy(P3(p, G)); group.add(g2); return { g: g2, flock }; };
    const realPen = pen(PEN, B, lit({ color: 0x84634a }), lit({ color: 0xf5f1e6, roughness: 0.95 }), lit({ color: 0x3a332e }));
    const ghostMat = lit({ color: 0x8fb0dc, transparent: true, opacity: 0.5, depthWrite: false }), ghost = pen(PEN2, B2, ghostMat, ghostMat, ghostMat); ghost.g.visible = false;          // 折过去以后：羊圈的“影子”B′
    const penPick = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.016, 18), basic({ visible: false })); penPick.position.copy(P3(mul(add(B, PEN), 0.5), G + 0.007)); penPick.userData.pick = true; penPick.userData.noFrame = true; group.add(penPick);

    // ================= 马：比例照真马（胸深、腿细长、脸长），腿分节；拖着走就迈步，停下转向河、低头喝水 =================
    const HS = 0.021;          // 马身长：比真比例大一点，是学生手里拿着的主角
    const horse = new THREE.Group(); group.add(horse);
    const hz = new THREE.Group(); hz.scale.setScalar(HS); horse.add(hz);
    const coat = lit({ color: 0x8b5a34, roughness: 0.55, side: THREE.DoubleSide }), pts = lit({ color: 0x2a1d16, roughness: 0.6 }), hoofM = lit({ color: 0x1a1410, roughness: 0.45 });
    const body = new THREE.Group(); body.position.y = 0.71; hz.add(body);
    { const prof = [[-0.5, 0], [-0.49, 0.07], [-0.45, 0.14], [-0.37, 0.195], [-0.22, 0.205], [0.05, 0.21], [0.26, 0.215], [0.38, 0.2], [0.46, 0.15], [0.505, 0.08], [0.515, 0]];
      const g = new THREE.LatheGeometry(prof.map(([x, r]) => new THREE.Vector2(r, x)), 28); g.rotateZ(-Math.PI / 2);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i); let y = p.getY(i); const z = p.getZ(i) * 0.8;
        if (y < 0) y *= 1 - 0.24 * smooth(-0.12, -0.4, x);          // 肚子往后收
        if (y > 0) y += 0.04 * Math.exp(-(((x - 0.3) / 0.09) ** 2)) * (y / 0.21) + 0.022 * Math.exp(-(((x + 0.33) / 0.1) ** 2)) * (y / 0.2);          // 鬐甲、臀
        p.setXYZ(i, x, y, z); }
      g.computeVertexNormals(); body.add(solid(new THREE.Mesh(g, coat))); }
    const NECK0 = 0.9 - Math.PI / 2, HEAD0 = -1.77;
    const neckY = new THREE.Group(); neckY.position.set(0.34, 0.1, 0); body.add(neckY);
    const neckP = new THREE.Group(); neckP.rotation.z = NECK0; neckY.add(neckP);
    { const neck = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.14, 0.5, 14), coat)); neck.position.y = 0.25; neck.scale.z = 0.62;
      const mane = solid(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.47, 0.024), pts)); mane.position.set(-0.075, 0.27, 0); mane.rotation.z = 0.06;
      neckP.add(neck, mane);
      for (const z of [0.03, -0.03]) { const ear = solid(new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.085, 6), coat)); ear.position.set(-0.04, 0.53, z); ear.rotation.z = 0.77; neckP.add(ear); } }
    const headP = new THREE.Group(); headP.position.y = 0.5; headP.rotation.z = HEAD0; neckP.add(headP);
    { const head = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.078, 0.54, 12), coat)); head.position.y = 0.25; head.scale.set(1.15, 1, 0.7);
      const muzzle = solid(new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), pts)); muzzle.position.y = 0.52; muzzle.scale.set(1.1, 0.8, 0.72);
      headP.add(head, muzzle); }
    const tailP = new THREE.Group(); tailP.position.set(-0.5, 0.1, 0); tailP.rotation.z = -0.35; body.add(tailP);
    { const tail = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.055, 0.52, 8), pts)); tail.position.y = -0.26; tailP.add(tail); }
    const legs = [];
    const leg = (x, y, z, hind, ph) => { const hip = new THREE.Group(); hip.position.set(x, y, z); body.add(hip);
      const Lu = hind ? 0.36 : 0.3, Ll = hind ? 0.3 : 0.27;
      const up = solid(new THREE.Mesh(new THREE.CylinderGeometry(hind ? 0.045 : 0.04, hind ? 0.075 : 0.06, Lu, 10), coat)); up.position.y = -Lu / 2; hip.add(up);
      const knee = new THREE.Group(); knee.position.y = -Lu; hip.add(knee);
      const lo = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, Ll, 8), pts)); lo.position.y = -Ll / 2; knee.add(lo);
      const hoof = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.038, 0.045, 10), hoofM)); hoof.position.y = -Ll - 0.012; knee.add(hoof);
      legs.push({ hip, knee, hind, ph }); };
    leg(0.3, -0.1, 0.085, false, 0.25); leg(0.3, -0.1, -0.085, false, 0.75); leg(-0.34, -0.02, 0.09, true, 0); leg(-0.34, -0.02, -0.09, true, 0.5);
    const gait = { p: 0, amp: 0, face: 0, yaw: 0, pose: 0, moved: -9 };
    const horsePick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 16), basic({ visible: false })); horsePick.userData.pick = true; horsePick.userData.noFrame = true; group.add(horsePick);

    // ================= 数学：路、河边 l、折过去的那一块、记录的标杆 =================
    const beamTex = tex(64, 4, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); for (const [o, a] of [[0, 0], [0.14, 0.5], [0.26, 1], [0.74, 1], [0.86, 0.5], [1, 0]]) gr.addColorStop(o, `rgba(255,255,255,${a})`); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    beamTex.colorSpace = THREE.NoColorSpace;
    const softTex = tex(64, 4, (g, w, h) => { for (let x = 0; x < w; x++) { const u = (x + 0.5) / w - 0.5; g.fillStyle = `rgba(255,255,255,${Math.exp(-((u / 0.2) ** 2)).toFixed(3)})`; g.fillRect(x, 0, 1, h); } });
    softTex.colorSpace = THREE.NoColorSpace;
    const ribbon = (pts2, hw, dash) => { const out = [], uvs = []; let acc = 0; const push = (p, q, n) => { out.push(p[0] + n[0], 0, -(p[1] + n[1]), p[0] - n[0], 0, -(p[1] - n[1]), q[0] + n[0], 0, -(q[1] + n[1]), q[0] + n[0], 0, -(q[1] + n[1]), p[0] - n[0], 0, -(p[1] - n[1]), q[0] - n[0], 0, -(q[1] - n[1])); uvs.push(0, 0.5, 1, 0.5, 0, 0.5, 0, 0.5, 1, 0.5, 1, 0.5); };
      for (let i = 0; i < pts2.length - 1; i++) { const a = pts2[i], b = pts2[i + 1], d = sub(b, a), l = Math.hypot(...d); if (l < 1e-7) continue; const n = [(-d[1] / l) * hw, (d[0] / l) * hw];
        if (!dash) push(a, b, n); else { let t = 0; while (t < l - 1e-9) { const ph = (acc + t) % (dash * 2), on = ph < dash, step = Math.max(1e-6, Math.min(l - t, on ? dash - ph : dash * 2 - ph)); if (on) push(add(a, mul(d, t / l)), add(a, mul(d, (t + step) / l)), n); t += step; } acc += l; } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); return g; };
    // 数学的线像 3Blue1Brown 的动画：亮的芯、一圈加色的光晕、底下一层淡淡的暗影——压在绿草地上也跳出来，场景不用褪色
    const sub3 = (parent, color, map, blending, w, y, order, o) => { const m = quiet(new THREE.Mesh(new THREE.BufferGeometry(), basic({ color, map, transparent: true, opacity: o, depthWrite: false, side: THREE.DoubleSide, blending }))); m.position.y = y; m.renderOrder = order; m.visible = false; m.userData.w = w; m.userData.o = o; parent.add(m); return m; };
    const line = (parent, color, w, y, o = 1, dash = 0, order = 5, glow = 0.45) => { const m = sub3(parent, color, beamTex, THREE.NormalBlending, w * 2.4, y, order, o); m.userData.dash = dash; m.userData.subs = [];
      if (glow) m.userData.subs.push(sub3(parent, color, softTex, THREE.AdditiveBlending, w * 9, y - 0.0001, order - 1, glow), sub3(parent, 0x0b1210, softTex, THREE.NormalBlending, w * 4.2, y - 0.0003, order - 2, 0.16));
      return m; };
    const drawing = new Map();          // 正在“画出来”的线：线 → { pts, t0, dur }
    const rawSet = (m, p) => { const subs = m.userData.subs || []; if (!p) { m.visible = false; for (const q of subs) q.visible = false; return; } m.geometry.dispose(); m.geometry = ribbon(p, m.userData.w / 2, m.userData.dash); m.visible = true; for (const q of subs) { q.geometry.dispose(); q.geometry = ribbon(p, q.userData.w / 2, 0); q.visible = true; } };
    const setLine = (m, p) => { const d = drawing.get(m); if (d) { d.pts = p; if (!p) { drawing.delete(m); rawSet(m, null); } return; } rawSet(m, p); };
    const setOp = (m, k) => { m.material.opacity = m.userData.o * k; for (const q of m.userData.subs || []) q.material.opacity = q.userData.o * k; };
    const cutAt = (pts2, k) => { let tot = 0; for (let n = 1; n < pts2.length; n++) tot += dist(pts2[n], pts2[n - 1]); let need = tot * k; const out = [pts2[0]]; for (let n = 1; n < pts2.length; n++) { const l = dist(pts2[n], pts2[n - 1]); if (need >= l) { out.push(pts2[n]); need -= l; } else { out.push(add(pts2[n - 1], mul(sub(pts2[n], pts2[n - 1]), need / Math.max(l, 1e-9)))); break; } } return out; };
    const drawOn = (m, p, dur = 0.7, delay = 0) => { drawing.set(m, { pts: p, t0: now() + delay, dur }); rawSet(m, null); };          // 新出现的线从一头画到另一头
    const Y = G + LIFT, TEAL = 0x5cd0b3, RED = 0xfc6255;
    const L = {
      l: line(group, INK, 0.0011, Y - 0.0002, 0.95, 0, 5, 0.35),
      ac: line(group, GOLD, 0.0024, Y, 1, 0, 5, 0.6), cb: line(group, GOLD, 0.0024, Y, 1, 0, 5, 0.6),
      bb: line(group, IMG, 0.0009, Y + 0.0001, 0.85, 0.0028, 6), sqH: line(group, INK, 0.0008, Y + 0.0002, 0.9, 0, 7),
      k1: line(group, IMG, 0.0009, Y + 0.0002, 1, 0, 7), k2: line(group, IMG, 0.0009, Y + 0.0002, 1, 0, 7), k3: line(group, IMG, 0.0009, Y + 0.0002, 1, 0, 7), k4: line(group, IMG, 0.0009, Y + 0.0002, 1, 0, 7),
      hb: line(group, INK, 0.0006, Y - 0.0001, 0.6, 0.0025, 5, 0.2),
      guide: line(group, INK, 0.0007, Y + 0.0001, 0.6, 0.003, 6),          // 拉直以后留下的 AB′（虚线）
      glow: line(group, GOLD, 0.0075, Y - 0.0003, 1, 0, 4, 0.6),            // 拉直那一下的光带
      t1: line(group, GOLD, 0.0012, Y + 0.0002), t2: line(group, IMG, 0.0012, Y + 0.0006, 1, 0, 8),
      a1: line(group, TEAL, 0.001, Y + 0.0003, 1, 0, 8), a2: line(group, TEAL, 0.001, Y + 0.0003, 1, 0, 8), a3: line(group, IMG, 0.001, Y + 0.0007, 1, 0, 8),
      lay1: line(group, GOLD, 0.002, Y + 0.0012, 1, 0, 9), lay2: line(group, IMG, 0.002, Y + 0.0014, 1, 0, 9), over: line(group, RED, 0.0034, Y + 0.0016, 1, 0, 10), mark: line(group, INK, 0.0009, Y + 0.0016, 1, 0, 10),
      ray: line(group, 0xfff1a8, 0.003, Y + 0.0018, 1, 0, 10, 0.8),
    };
    const LPTS = [[-0.185, -0.0008], [0.185, -0.0008]]; setLine(L.l, LPTS);
    for (const k of ['a1', 'a2', 'a3']) { L[k].material.depthTest = false; for (const q of L[k].userData.subs || []) q.material.depthTest = false; }          // 角弧压在马身上也看得见
    // 羊圈那一块：C、H、B 围成的三角形，放在一个绕河边 l（x 轴）转的组里——折到对岸，B 落到 B′
    const fold = new THREE.Group(); fold.position.y = Y + 0.0004; group.add(fold);
    const paper = new THREE.Mesh(new THREE.BufferGeometry(), lit({ color: 0xc4ecf7, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, roughness: 0.9, emissive: 0xc4ecf7, emissiveIntensity: 0.35 })); paper.renderOrder = 6; paper.userData.pick = true; paper.userData.noFrame = true; fold.add(paper);
    const F = { cb: line(fold, IMG, 0.0022, 0.0003, 1, 0, 8, 0.55), hb: line(fold, INK, 0.0006, 0.0002, 0.7, 0, 7), sq: line(fold, INK, 0.0005, 0.0002, 0.7, 0, 7) };
    const dot = quiet(new THREE.Mesh(new THREE.RingGeometry(0.0022, 0.0034, 28).rotateX(-Math.PI / 2), basic({ color: IMG, transparent: true, depthWrite: false, side: THREE.DoubleSide }))); dot.position.set(B[0], 0.0004, -B[1]); dot.renderOrder = 8; fold.add(dot);
    fold.visible = false;
    // 小旗：插在找到的那个 C 上
    const flag = new THREE.Group();
    { const pole = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0004, 0.0005, 0.017, 6), lit({ color: 0x6b5238 }))); pole.position.y = 0.0085;
      const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.017, 0, 0, 0.0112, 0, 0.0088, 0.0142, 0], 3)); cg.computeVertexNormals();
      const cloth = solid(new THREE.Mesh(cg, lit({ color: RED, side: THREE.DoubleSide, roughness: 0.7 }))); flag.add(pole, cloth); }
    flag.position.copy(P3([CSTAR, -0.0012], G)); flag.visible = false; group.add(flag);
    // 光：拉直以后，一束光从 A 射到 C、再到 B
    const spark = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: 0xffe08a, transparent: true, depthWrite: false, opacity: 0 }))); spark.renderOrder = 12; group.add(spark);
    // 重拍：从那一点迸出一圈短光线（3Blue1Brown 的 Flash），不压暗画面
    const flashes = [];
    const ripple = (p, col, delay = 0) => { const rays = []; for (let n = 0; n < 12; n++) rays.push(sub3(group, col, beamTex, THREE.NormalBlending, 0.0016 * 2.4, Y + 0.0012, 13, 1)); flashes.push({ p, rays, t0: now() + delay }); };
    // 光迹：马走过的每一条路 A→C→B 留下一道淡淡的光，像长曝光
    const trails = Array.from({ length: 14 }, () => sub3(group, GOLD, softTex, THREE.AdditiveBlending, 0.0026 * 2.4, Y - 0.0002, 3, 0.5));
    let trailN = 0, trailC = -9;
    const trail = (c) => { const m = trails[trailN++ % trails.length]; m.geometry.dispose(); m.geometry = ribbon([A, [c, 0], B], m.userData.w / 2, 0); m.visible = true; m.userData.t0 = now(); };
    // 字：和课本插图一样的字母、角的记号、读数
    const measure = (font, txt) => { const g = document.createElement('canvas').getContext('2d'); g.font = font; return g.measureText(txt).width; };
    const labTex = (txt, col, px = 64) => { const f = /^[A-Z]′?$|^l$/.test(txt) ? `italic 500 ${px * 1.08}px "Times New Roman",serif` : `600 ${px}px "Times New Roman","Songti SC","STSong",serif`; return tex(Math.ceil(measure(f, txt)) + 44, Math.round(px * 1.55), (g, w, h) => { g.font = f; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.shadowColor = 'rgba(6,10,14,0.6)'; g.shadowBlur = px * 0.2; g.lineWidth = px * 0.15; g.strokeStyle = 'rgba(14,18,24,0.62)'; g.strokeText(txt, w / 2, h / 2 + 2); g.shadowBlur = 0; g.fillStyle = col; g.fillText(txt, w / 2, h / 2 + 2); }); };
    const label = (hgt) => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }))); sp.renderOrder = 20; sp.userData.h = hgt; sp.userData.k = ''; group.add(sp); sp.visible = false; return sp; };
    const setLabel = (sp, txt, col, p, y) => { if (!txt) { sp.visible = false; return; } if (sp.userData.k !== txt + col) { sp.userData.k = txt + col; const t = labTex(txt, col); sp.material.map?.dispose?.(); sp.material.map = t; sp.material.needsUpdate = true; sp.scale.set((sp.userData.h * t.image.width) / t.image.height, sp.userData.h, 1); } sp.position.copy(P3(p, y)); sp.visible = true; };
    const LB = { A: label(0.017), B: label(0.017), B2: label(0.017), C: label(0.016), C2: label(0.016), l: label(0.015), m: label(0.0115), cb: label(0.0105), cb2: label(0.0105), g1: label(0.0108), g2: label(0.0108), g3: label(0.0108) };
    // 点：像课本插图那样的圆点，白边衬着，压在草地、河面上都看得清
    const discGeo = new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2);
    const dotTex = tex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    const dotPt = (col) => { const g = new THREE.Group(), glow = quiet(new THREE.Mesh(discGeo, basic({ color: col, map: dotTex, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }))), rim = quiet(new THREE.Mesh(discGeo, basic({ color: 0x0e1418, transparent: true, opacity: 0.55, depthWrite: false }))), core = quiet(new THREE.Mesh(discGeo, basic({ color: col, transparent: true, depthWrite: false }))); glow.scale.setScalar(0.011); rim.scale.setScalar(0.0037); core.scale.setScalar(0.0027); rim.position.y = 0.00005; core.position.y = 0.0001; glow.renderOrder = 10; rim.renderOrder = 11; core.renderOrder = 12; g.add(glow, rim, core); g.visible = false; group.add(g); return g; };
    const PT = { A: dotPt(0xffffff), B: dotPt(0xffffff), C: dotPt(GOLD), C2: dotPt(0xffffff), B2: dotPt(IMG) };
    PT.A.position.copy(P3(A, Y + 0.0006)); PT.B.position.copy(P3(B, Y + 0.0006)); PT.A.visible = PT.B.visible = true;
    // 记录：马走到哪儿，就在旁边的河里插一根标杆，杆越高路越远（只记学生自己走过的地方）
    const POSTS = 38, PV = RV1 / 2, HGT = (l) => 0.003 + (l - 0.2) * 0.26;
    const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.00055, 0.00055, 1, 6), lit({ color: 0xa88560 }), POSTS), caps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0013, 10, 8), lit({ color: 0xf0a33a, emissive: 0x6a3a00, emissiveIntensity: 0.3 }), POSTS);
    for (const m of [posts, caps]) { m.count = 0; m.castShadow = true; m.raycast = () => {}; m.userData.noFrame = true; m.frustumCulled = false; group.add(m); }
    const seen = new Map();          // 第几格 → 路程
    const slot = (c) => Math.round((c - C_MIN) / ((C_MAX - C_MIN) / (POSTS - 1)));
    const slotC = (i) => C_MIN + (i * (C_MAX - C_MIN)) / (POSTS - 1);
    const LOW = slot(CSTAR);          // 最低的那一格
    function drawPosts(big = 1) { const m4 = new THREE.Matrix4(); let k = 0, minL = 9, minI = -1; for (const [i, l] of seen) if (l < minL) { minL = l; minI = i; }
      for (const [i, l] of seen) { const c = slotC(i), top = G + HGT(l); m4.compose(new THREE.Vector3(c, (WATER + top) / 2, -PV), new THREE.Quaternion(), new THREE.Vector3(1, top - WATER, 1)); posts.setMatrixAt(k, m4); m4.compose(new THREE.Vector3(c, top, -PV), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1).multiplyScalar(i === minI && seen.size > 6 ? 1.5 * big : 1)); caps.setMatrixAt(k, m4); k++; }
      posts.count = caps.count = k; posts.instanceMatrix.needsUpdate = caps.instanceMatrix.needsUpdate = true; }

    // ================= 此刻那一句：印在草原前面的切面上（像沙盘底座上的说明），不挡画面 =================
    const front = outline.filter(([u, v]) => v < -0.06 && Math.abs(u) < 0.168).sort((a, b) => a[0] - b[0]);
    const CY0 = 0.0026, CY1 = G - 0.0032, COFF = 0.0019;
    const capGeo = new THREE.BufferGeometry(); let capLen = 0;
    { const sp = front.map((p, i) => { const a = front[Math.max(0, i - 1)], b = front[Math.min(front.length - 1, i + 1)], t = unit(sub(b, a)); return add(p, mul([t[1], -t[0]], COFF)); });
      for (let i = 1; i < sp.length; i++) capLen += dist(sp[i], sp[i - 1]);
      const pos = [], uvs = [], idx = []; let s = 0;
      sp.forEach((p, i) => { if (i) s += dist(p, sp[i - 1]); pos.push(p[0], CY0, -p[1], p[0], CY1, -p[1]); uvs.push(s / capLen, 0, s / capLen, 1); if (i) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); } });
      capGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); capGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); capGeo.setIndex(idx); }
    const capMesh = quiet(new THREE.Mesh(capGeo, basic({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }))); capMesh.renderOrder = 3; capMesh.visible = false; group.add(capMesh);
    const CW = 2048, CH = Math.max(48, Math.round((CW * (CY1 - CY0)) / capLen));
    const capTex = (big, small) => tex(CW, CH, (g, w, h) => {
      let f = 1, fb = '', fs = '', wb = 0, ws = 0, gap = 0;
      for (; f > 0.5; f -= 0.04) { fb = `600 ${Math.round(h * 0.62 * f)}px "Times New Roman","Songti SC","STSong",serif`; fs = `500 ${Math.round(h * 0.44 * f)}px "Times New Roman","Songti SC","STSong",serif`; g.font = fb; wb = g.measureText(big).width; g.font = fs; ws = small ? g.measureText(small).width : 0; gap = small ? h * 0.9 * f : 0; if (wb + gap + ws < w - h * 5) break; }
      const tot = wb + gap + ws, x0 = (w - tot) / 2;
      const band = g.createLinearGradient(x0 - h * 2, 0, x0 + tot + h * 2, 0); band.addColorStop(0, 'rgba(34,24,14,0)'); band.addColorStop(0.07, 'rgba(34,24,14,0.52)'); band.addColorStop(0.93, 'rgba(34,24,14,0.52)'); band.addColorStop(1, 'rgba(34,24,14,0)');
      g.fillStyle = band; g.fillRect(x0 - h * 2, h * 0.06, tot + h * 4, h * 0.88);
      g.textBaseline = 'middle'; g.font = fb; g.fillStyle = '#f8efdc'; g.fillText(big, x0, h * 0.53); if (small) { g.font = fs; g.fillStyle = '#e6dac2'; g.fillText(small, x0 + wb + gap, h * 0.55); } });
    const cap = { key: '', born: -9, out: 1e9, next: null };
    function caption(big, small = '') { const key = big + '|' + small; if (key === cap.key) return; cap.key = key; S.cap = [big, small];
      const show = () => { capMesh.material.map?.dispose?.(); capMesh.material.map = capTex(big, small); capMesh.material.needsUpdate = true; capMesh.visible = true; cap.born = now(); cap.out = 1e9; };
      if (capMesh.visible && now() - cap.born > 0.2) { cap.out = now(); cap.next = show; } else show(); }
    const prompt = (txt) => { S.ask = txt; if (ui?.status) ui.status(txt); };

    // ================= 板书：学生做出一样，就用课本的话写一行；只写已经发现的 =================
    const css = document.createElement('style');
    css.textContent = `
.rh-board{margin:4px 0 6px;display:flex;flex-direction:column;gap:8px;font:15px/1.7 "Kaiti SC","STKaiti","Songti SC",serif;color:#2b2722}
.rh-board .rb-row{opacity:0;transform:translateY(5px);transition:opacity .5s,transform .5s,background-color 2.4s;padding:3px 8px 3px 6px;border-radius:5px;border-left:3px solid transparent}
.rh-board .rb-row.in{opacity:1;transform:none}
.rh-board .rb-row.fresh{background:rgba(255,206,110,.34);border-left-color:#d98a2b}
.rh-board .n{display:inline-block;min-width:1.25em;color:#b0532a;font-weight:700}
.rh-board b{color:#8a2f1d}
.rh-board i{font-family:"Times New Roman",serif;font-style:italic;letter-spacing:.02em}
.rh-board .ia{color:#c98600;font-weight:600}.rh-board .ca{color:#2589b0;font-weight:600}.rh-board .tl{color:#1a9a82;font-weight:600}
.rh-board .rb-h{font:600 12px/1.3 "PingFang SC","Hiragino Sans GB",sans-serif;color:#a07a45;letter-spacing:.3em;margin:6px 0 -4px;opacity:0;transition:opacity .4s}
.rh-board .rb-h.in{opacity:1}
.rh-board.review .rb-row[data-k]{cursor:pointer}.rh-board.review .rb-row[data-k]:hover{background:rgba(255,206,110,.16)}
.rh-board .rb-row.sel{background:rgba(255,206,110,.34);border-left-color:#d98a2b}`;
    document.head.append(css);
    let boardEl = null, lastH = ''; const rows = [];
    const reveal = (r) => { const body = boardEl?.closest('.p-body'); if (!body) return; setTimeout(() => { const rb = r.getBoundingClientRect(), bb = body.getBoundingClientRect(); if (rb.bottom > bb.bottom - 14) body.scrollBy({ top: rb.bottom - bb.bottom + 28, behavior: 'smooth' }); }, 80); };          // 新的一行在面板下面看不见：面板自己滚上来
    const board = (html, key = '') => { const r = document.createElement('div'); r.className = 'rb-row'; r.innerHTML = html; r.dataset.k = key; rows.push(r); for (const o of rows) o.classList?.remove('fresh'); if (boardEl) { boardEl.append(r); requestAnimationFrame(() => { r.classList.add('in', 'fresh'); reveal(r); }); } return r; };
    board.h = (title) => { if (title === lastH) return; lastH = title; const r = document.createElement('div'); r.className = 'rb-h'; r.textContent = title; rows.push(r); if (boardEl) { boardEl.append(r); requestAnimationFrame(() => { r.classList.add('in'); reveal(r); }); } };
    const i = (s) => `<i>${s}</i>`;

    // ================= 状态 =================
    const fresh = () => ({ c: -0.11, flip: 0, flipped: false, beat: 'walk', held: '', straight: false, asked: false, found: false, nudged: false, eqRun: 0, showFold: false, showEq: false, showBis: false, showLine: false, showArcs: false, done: false, grab: 0, proofDone: false, cap: ['', ''], ask: '', lay: null, run: null, punchAt: -9, postAt: -9, flagAt: -9, beatAt: 0, hint: 0, pose: '' });
    let S = fresh(), grabR = 0.05, runId = 0;
    const later = (ms, f) => { const id = runId; setTimeout(() => { if (!dead && id === runId) f(); }, ms); };
    const angA = (p, q) => Math.atan2(q[1] - p[1], q[0] - p[0]);
    const wrapA = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
    const arcPts = (c, a0, a1, r) => { const d = wrapA(a1 - a0), out = []; for (let k = 0; k <= 24; k++) { const a = a0 + (d * k) / 24; out.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]); } return out; };
    const deg = (x) => Math.round((Math.abs(x) * 180) / Math.PI);
    function layout() {
      const C = [S.c, 0], away = S.showLine && Math.abs(S.c - CSTAR) > 0.006;          // 拉直以后马走开：马在的地方叫 C′，C 留在小旗那儿
      setLine(L.ac, [A, C]); setLine(L.cb, [C, B]);
      // 羊圈那一块：三角形 C-H-B，组绕 l 往对岸转 flip·180°
      fold.visible = S.showFold; fold.rotation.x = -S.flip * Math.PI;
      if (fold.visible) {
        paper.geometry.dispose(); const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([C[0], 0, -C[1], H[0], 0, -H[1], B[0], 0, -B[1]], 3)); tri.computeVertexNormals(); paper.geometry = tri;
        setLine(F.cb, S.flip > 0.02 ? [C, B] : null); setLine(F.hb, [H, B]);
        const s = 0.006, dx = Math.sign(C[0] - H[0]) || 1; setLine(F.sq, Math.abs(C[0] - H[0]) > s * 1.5 ? [[H[0] + dx * s, 0], [H[0] + dx * s, -s], [H[0], -s]] : null);
      }
      setLine(L.hb, S.flipped && !S.showBis ? [H, B] : null);
      ghost.g.visible = S.flipped;
      PT.C.visible = true; PT.C.position.copy(P3(away ? [CSTAR, 0] : C, Y + 0.0006)); PT.C2.visible = away; PT.C2.position.copy(P3(C, Y + 0.0006)); PT.B2.visible = S.flipped; PT.B2.position.copy(P3(B2, Y + 0.0006));
      // l 垂直平分 BB′：虚线 BB′、垂足处的直角、BH = HB′ 两道记号
      { const on = S.showBis, s2 = 0.006, mk = (v) => [[H[0] - 0.0035, v - 0.0012], [H[0] + 0.0035, v - 0.0012]], mk2 = (v) => [[H[0] - 0.0035, v + 0.0012], [H[0] + 0.0035, v + 0.0012]];
        setLine(L.bb, on ? [B, B2] : null); setLine(L.sqH, on ? [[H[0] + s2, 0], [H[0] + s2, s2], [H[0], s2]] : null);
        setLine(L.k1, on ? mk(B[1] / 2) : null); setLine(L.k2, on ? mk2(B[1] / 2) : null); setLine(L.k3, on ? mk(B2[1] / 2) : null); setLine(L.k4, on ? mk2(B2[1] / 2) : null); }
      flag.visible = S.showLine; setLine(L.guide, S.showLine ? [A, B2] : null);
      const l = len(S.c);
      setLabel(LB.A, 'A', '#ffffff', add(A, [0.007, -0.014]), G + 0.006); setLabel(LB.B, 'B', '#ffffff', add(B, [-0.009, -0.013]), G + 0.006);
      setLabel(LB.B2, S.flipped ? 'B′' : '', '#9be3f5', add(B2, [-0.01, 0.011]), G + 0.008); setLabel(LB.l, 'l', '#ffffff', [0.176, -0.006], G + 0.006);
      if (away) { setLabel(LB.C, 'C', '#ffd45c', [CSTAR - 0.006, -0.015], G + 0.004); setLabel(LB.C2, 'C′', '#ffffff', [S.c + 0.008, -0.015], G + 0.004); }
      else { setLabel(LB.C, 'C', '#ffd45c', S.showArcs ? [S.c, -0.026] : [S.c + 0.004, -0.015], G + 0.004); setLabel(LB.C2, '', '', [0, 0], 0); }
      setLabel(LB.m, `${Math.round(l * M)} 米`, S.straight ? '#ffd45c' : '#ffffff', [S.c, PV], G + HGT(l) + 0.011);
      if (S.flipped) { const tick = (p, q) => { const m = mul(add(p, q), 0.5), n = mul(unit([-(q[1] - p[1]), q[0] - p[0]]), 0.0032); return [sub(m, n), add(m, n)]; }; setLine(L.t1, tick(C, B)); setLine(L.t2, tick(C, B2)); }
      else { setLine(L.t1, null); setLine(L.t2, null); }
      if (S.showEq) { const d = Math.round(dist(C, B) * M) + ' 米'; setLabel(LB.cb, d, '#ffd45c', add(mul(add(C, B), 0.5), [0.012, -0.004]), G + 0.008); setLabel(LB.cb2, d, '#9be3f5', add(mul(add(C, B2), 0.5), [0.012, 0.004]), G + 0.008); }
      else { setLabel(LB.cb, '', '', [0, 0], 0); setLabel(LB.cb2, '', '', [0, 0], 0); }
      setLine(L.glow, S.straight ? [A, B2] : null);
      if (S.showArcs) { const C = S.beat === 'shone' || S.done ? [CSTAR, 0] : [S.c, 0], r = 0.03, a1 = angA(C, A), a2 = angA(C, B), a3 = angA(C, B2);          // 讲过“∠1 = ∠2”以后，角一直画在 C 上
        setLine(L.a1, arcPts(C, Math.PI, a1, r)); setLine(L.a2, arcPts(C, 0, a2, r)); setLine(L.a3, arcPts(C, 0, a3, r));
        const at = (a, rr) => [C[0] + rr * Math.cos(a), C[1] + rr * Math.sin(a)], g = S.straight ? '#a6f5e0' : '#7fe3c8';
        setLabel(LB.g1, `∠1 ${deg(Math.PI - Math.abs(a1))}°`, g, at((-Math.PI + a1) / 2, r + 0.014), G + 0.006);
        setLabel(LB.g2, `∠2 ${deg(a2)}°`, g, at(a2 / 2, r + 0.014), G + 0.006);
        setLabel(LB.g3, `∠3 ${deg(a3)}°`, '#9be3f5', at(a3 / 2, r + 0.014), G + 0.006); }
      else { for (const k of ['a1', 'a2', 'a3']) setLine(L[k], null); for (const k of ['g1', 'g2', 'g3']) setLabel(LB[k], '', '', [0, 0], 0); }
    }

    // ================= 一课的主线：每一步都由学生的那一下触发 =================
    function found() {          // 探究：标杆有一处最低
      S.found = true; S.postAt = now(); ripple([slotC(LOW), PV], GOLD); sfx.ding(1100, { gain: 0.05 });
      caption('有一处最短', '最低的那根标杆附近，饮马的路最短');
      board.h('探究'); board(`<span class="n">1</span>马沿 ${i('l')} 走，<span class="ia">${i('AC')} + ${i('CB')}</span> 跟着变；最低的那根标杆附近，路最短`, 'walk');
      later(1600, () => { S.beat = 'fold'; S.showFold = true; S.beatAt = now(); S.hint = 0; caption('为什么偏偏在那儿？', '要是羊圈在河对岸，拉一条直线就行'); prompt('要是羊圈在河对岸呢？按住羊圈这一块，沿河折过去'); layout(); });
    }
    function folded() {          // 转化：B 落到 B′
      S.flipped = true; S.beat = 'equal'; S.showEq = true; S.beatAt = now(); S.hint = 0; S.eqRun = 0; sfx.clink({ freq: 1400, gain: 0.05 }); ripple(B2, IMG);
      caption('B 落在了对岸的 B′', '折叠后重合的点是对应点，叫作对称点');
      board.h('转化'); board(`<span class="n">2</span>作点 ${i('B')} 关于 ${i('l')} 的对称点 <span class="ca">${i('B′')}</span>：沿 ${i('l')} 折叠，${i('B')} 与 ${i('B′')} 重合`, 'sym');
      prompt('CB 和 CB′ 总是一样长吗？拖着马走走看'); layout();
    }
    function equalSeen() {          // l 垂直平分 BB′，CB = CB′
      S.beat = 'eqdone'; S.showBis = true; drawOn(L.bb, [B, B2], 0.8); sfx.ding(1180, { gain: 0.05 }); ripple(mul(add([S.c, 0], B), 0.5), GOLD); ripple(mul(add([S.c, 0], B2), 0.5), IMG, 0.15);
      caption('CB 和 CB′ 总是一样长', '线段垂直平分线上的点与这条线段两个端点的距离相等');
      board(`<span class="n">3</span>${i('l')} 垂直平分 ${i('BB′')}：线段垂直平分线上的点与这条线段两个端点的距离相等。${i('C')} 在 ${i('l')} 上，所以 ${i('CB')} = <span class="ca">${i('CB′')}</span>，<span class="ia">${i('AC')} + ${i('CB')}</span> = ${i('AC')} + <span class="ca">${i('CB′')}</span>`, 'eq');
      later(1800, () => { S.beat = 'straight'; S.showEq = false; S.beatAt = now(); S.hint = 0; caption('现在 A、B′ 在河的两边', '马走到哪儿，AC + CB′ 最短？'); prompt('A、B′ 在河两边了：马走到哪儿，AC + CB′ 最短？'); layout(); });
    }
    function straightened() {          // 重拍 1：两点之间，线段最短
      S.showLine = true; S.showBis = false; S.punchAt = now(); S.flagAt = now(); S.beat = 'lined'; drawOn(L.glow, [A, B2], 0.55); drawOn(L.guide, [A, B2], 0.7, 0.35); sfx.ding(1320, { gain: 0.07 }); ripple([CSTAR, 0], GOLD); ripple([CSTAR, 0], IMG, 0.28);
      caption('两点之间，线段最短', '连接 AB′，与 l 的交点就是 C：在这里饮马，路最短');
      board.h('结论'); board(`<span class="n">4</span>${i('A')}、${i('B′')} 在 ${i('l')} 两侧：连接 ${i('AB′')} 交 ${i('l')} 于 ${i('C')}。两点之间，线段最短，${i('AC')} + ${i('CB′')} 最小，也就是 <span class="ia">${i('AC')} + ${i('CB')}</span> 最小，就在最低的那根标杆旁边`, 'line');
      later(2400, () => { S.beat = 'proof'; S.beatAt = now(); S.hint = 0; caption('别的地方，为什么都更远？', '把马牵到河边别的地方 C′ 看看'); prompt('别的地方为什么都更远？把马牵到 l 上别处 C′'); layout(); });
    }
    function layDown() { const cp = [S.c, 0]; S.lay = { t0: now(), cp, a: dist(A, cp), b: dist(cp, B2), hit: false }; sfx.whoosh({ dur: 0.6, freq: 900, gain: 0.04 }); }
    function proved() {          // 重拍 2：三角形两边的和大于第三边
      if (S.proofDone) return; S.proofDone = true; sfx.ding(1250, { gain: 0.06 });
      caption('三角形两边的和大于第三边', 'AC′ + C′B = AC′ + C′B′ > AB′ = AC + CB');
      board.h('证明'); board(`<span class="n">5</span>在 ${i('l')} 上任取另一点 ${i('C′')}：${i('C′B')} = <span class="ca">${i('C′B′')}</span>，${i('AC′')} + ${i('C′B')} = ${i('AC′')} + <span class="ca">${i('C′B′')}</span> &gt; ${i('AB′')} = <span class="ia">${i('AC')} + ${i('CB')}</span>（三角形两边的和大于第三边）`, 'proof');
      later(2800, () => { S.beat = 'light'; S.showArcs = true; S.beatAt = now(); S.hint = 0; caption('C 这个点，还有什么特别？', '把马牵回 C，看两边的路和河边的夹角'); prompt('C 两边的路和河边的夹角，有什么关系？把马牵回 C'); layout(); });
    }
    function lightRun() { S.run = { t0: now() }; }
    function shone() {          // 重拍 3：∠1 = ∠2，光也这样走
      S.beat = 'shone'; S.punchAt = now(); lightRun(); sfx.ding(1480, { gain: 0.06 }); later(500, () => sfx.ding(1760, { gain: 0.045 }));
      caption('∠1 = ∠2：光也走这条路', '光行最速原理：光线所行进的“光程”最短');
      board.h('联系'); board(`<span class="n">6</span>在 ${i('C')} 处，<span class="tl">∠2</span> = <span class="ca">∠3</span>（折叠），<span class="ca">∠3</span> = <span class="tl">∠1</span>（对顶角相等），所以 <span class="tl">∠1 = ∠2</span>：光从 ${i('A')} 射到镜面 ${i('l')} 上、再反射到 ${i('B')}，走的正是这条最短的路（光行最速原理）`, 'light');
      later(3400, finish);
    }
    function finish() {
      S.beat = 'end'; S.done = true; boardEl?.classList.add('review');
      caption('答：在 C 处饮马，走的路最短', '作 B 关于河边 l 的对称点 B′，连接 AB′，与 l 的交点就是 C');
      board.h('答'); board(`<b>答</b>：作点 ${i('B')} 关于河边 ${i('l')} 的对称点 ${i('B′')}，连接 ${i('AB′')} 交 ${i('l')} 于点 ${i('C')}，在 ${i('C')} 处饮马，走的路最短。（这片草原上，最短的路约 ${Math.round(len(CSTAR) * M)} 米。）`, 'ans');
      prompt(''); ui?.unlock?.();
      later(2600, () => { ui?.go?.(2); ui?.fold?.(false); });          // 一课结束：翻到“对照课本原文”
    }
    // 讲完以后点板书：场景摆回那一刻
    function pose(k) {
      S.lay = null; S.run = null; for (const m of [L.lay1, L.lay2, L.over, L.mark, L.ray]) { setLine(m, null); setOp(m, 1); } S.pose = k;
      const fold1 = k !== 'walk';
      Object.assign(S, { showFold: fold1, flipped: fold1, flip: fold1 ? 1 : 0, showEq: k === 'eq', showBis: k === 'eq', showLine: ['line', 'proof', 'light', 'ans'].includes(k), showArcs: k === 'light' });
      S.c = k === 'walk' ? slotC(LOW) : k === 'sym' ? -0.09 : k === 'eq' ? 0.06 : k === 'proof' ? CSTAR + 0.075 : CSTAR;
      S.straight = S.showLine && S.c === CSTAR; if (S.straight) S.punchAt = now();
      if (k === 'sym') { S.flip = 0; S.flipped = false; const t0 = now(); const step = () => { if (dead || S.pose !== 'sym') return; const q = clamp((now() - t0) / 0.9, 0, 1); S.flip = easeOut(q); layout(); if (q < 1) requestAnimationFrame(step); else { S.flipped = true; layout(); } }; step(); }
      if (k === 'proof') later(300, layDown);
      if (k === 'light') lightRun();
      const CAP = { walk: ['有一处最短', '最低的那根标杆附近，饮马的路最短'], sym: ['沿河边 l 折过去，B 落在 B′', '折叠后重合的点是对应点，叫作对称点'], eq: ['CB 和 CB′ 总是一样长', '线段垂直平分线上的点与这条线段两个端点的距离相等'], line: ['两点之间，线段最短', '连接 AB′，与 l 的交点就是 C'], proof: ['三角形两边的和大于第三边', 'AC′ + C′B = AC′ + C′B′ > AB′ = AC + CB'], light: ['∠1 = ∠2：光也走这条路', '光行最速原理：光线所行进的“光程”最短'], ans: ['答：在 C 处饮马，走的路最短', '作 B 关于河边 l 的对称点 B′，连接 AB′，与 l 的交点就是 C'] };
      caption(...(CAP[k] || CAP.ans)); layout();
    }

    // ================= 动手 =================
    function horseDown(q) { if (S.held === 'fold') return false; S.held = 'horse'; S.grab = q ? S.c - q[0] : 0; if (!S.asked) { S.asked = true; board.h('问题'); board(`在直线 ${i('l')} 上找一点 ${i('C')}，使 <span class="ia">${i('AC')} 与 ${i('CB')} 的和</span>最小`, 'walk'); } return true; }
    function horseMove(q) {
      if (S.held !== 'horse') return; let c = clamp(q[0] + S.grab, C_MIN, C_MAX);
      const snap = S.flipped && (S.beat === 'straight' || S.beat === 'light' || S.showLine);
      if (snap && Math.abs(c - CSTAR) < 0.004) c = CSTAR;          // 拉成一条直线时吸住
      const dc = c - S.c; if (Math.abs(dc) > 1e-6) { gait.face = dc > 0 ? 0 : Math.PI; gait.p += (Math.abs(dc) / (HS * 0.95)) * Math.PI * 2; gait.moved = now(); }
      S.c = c; if (Math.abs(c - trailC) > 0.012) { trailC = c; trail(c); }
      const k = slot(c); if (!seen.has(k)) { seen.set(k, len(slotC(k))); drawPosts(); sfx.clink({ freq: 900 + (0.35 - len(c)) * 2200, gain: 0.015 }); }
      S.straight = S.flipped && S.showLine ? c === CSTAR : S.flipped && c === CSTAR && S.beat === 'straight';
      if (S.beat === 'walk' && !S.found) { const ks = [...seen.keys()]; if (seen.has(LOW) && ks.some((x) => x <= LOW - 4) && ks.some((x) => x >= LOW + 4)) found(); else if (seen.size >= 16 && !S.nudged) { S.nudged = true; prompt('路程会先变短、再变长吗？往另一头走走'); } }
      if (S.beat === 'equal') { S.eqRun += Math.abs(dc); if (S.eqRun > 0.06) equalSeen(); }
      if (S.beat === 'straight' && c === CSTAR) straightened();
      layout();
    }
    function horseUp() { if (S.held !== 'horse') return; S.held = ''; if (S.beat === 'proof' && Math.abs(S.c - CSTAR) > 0.015 && !S.lay) layDown(); if (S.beat === 'light' && S.c === CSTAR) shone(); }          // 松手时正停在 C 才算
    function foldDown(p) { if (S.beat !== 'fold' || S.flipped) return false; S.held = 'fold'; grabR = Math.max(0.025, -p[1]); sfx.whoosh({ dur: 0.2, freq: 1600, gain: 0.03 }); return true; }
    function foldMove(p) { if (S.held !== 'fold') return; S.flip = Math.acos(clamp(-p[1] / grabR, -1, 1)) / Math.PI; layout(); }          // 手在地上的位置 = 抓住那一点落在地上的影子
    function foldUp() {
      if (S.held !== 'fold') return; S.held = ''; const to = S.flip > 0.5 ? 1 : 0, from = S.flip, t0 = now();
      const step = () => { if (dead) return; const k = clamp((now() - t0) / 0.35, 0, 1); S.flip = lerp(from, to, easeOut(k)); layout(); if (k < 1) requestAnimationFrame(step); else if (to === 1 && !S.flipped) folded(); };
      step();
    }

    const uv = (p) => [p.x, -p.z];
    const foldDrag = (obj) => ({ obj, plane: 'xz', offset: G + 0.002, hint: () => '按住，往河对岸翻过去', enabled: () => S.beat === 'fold' && !S.flipped, onStart: (p) => foldDown(uv(p)), onDrag: (p) => foldMove(uv(p)), onEnd: () => foldUp() });
    const drags = [
      { obj: horsePick, cueShape: horse, plane: 'xz', offset: G + 0.004, hint: () => '拖着马沿河边走', onStart: (p) => horseDown(uv(p)), onDrag: (p) => horseMove(uv(p)), onEnd: () => horseUp() },
      foldDrag(penPick), foldDrag(paper),
    ];
    const dragApi = draggable(group, drags, { onClick: () => false, tip: tag?.('', 'pill') });
    let heard = false;
    const pointer = { down: (r, e) => { if (!heard) { heard = true; audio(); } return dragApi.down(r, e); }, move: (r, e) => dragApi.move(r, e), up: (r, e) => dragApi.up(r, e), items: dragApi.items };
    function opening() { caption('到河边哪里饮马，走的路最短？', '牧民从蒙古包 A 出发，到河边饮马，再去羊圈 B'); prompt('到河边哪里饮马，走的路最短？'); }
    // 清场重来（换一批学生，或者想重新讲一遍）——键盘 R
    const cue = mathActionCue(camera, pointer, dragApi, () => S.beat, () => {
      if (S.beat === 'fold') return penPick;
      if ((S.beat === 'walk' && !S.found) || (S.beat === 'proof' && !S.lay && !S.proofDone)
          || ['equal', 'straight', 'light'].includes(S.beat)) return horsePick;
    });
    function reset() { cue.reset(); runId++; S = fresh(); seen.clear(); drawPosts(); rows.length = 0; lastH = ''; if (boardEl) { boardEl.innerHTML = ''; boardEl.classList.remove('review'); } for (const k of ['lay1', 'lay2', 'over', 'mark', 'ray']) { setLine(L[k], null); setOp(L[k], 1); } spark.material.opacity = 0; cap.key = ''; ui?.relock?.(); ui?.go?.(1); opening(); layout(); }
    const onKey = (e) => { if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !e.target?.closest?.('input,textarea')) reset(); };
    addEventListener('keydown', onKey);

    layout();
    const EL = 0.6, AZ = 0.17, DIR = [Math.sin(AZ) * Math.cos(EL), Math.sin(EL), Math.cos(AZ) * Math.cos(EL)];
    let last = now();
    return {
      group: root, card: false, place: 'spread', scale: 0.95,
      size: { w: 0.39, d: 0.32, h: 0.05 },
      view: { elev: 34, azim: 10, lookY: 0.2, frameMargin: 1.0 },
      pointer: cue.pointer,
      mount(u) { ui = u; boardEl = document.createElement('div'); boardEl.className = 'rh-board' + (S.done ? ' review' : ''); u.controls?.append(boardEl);
        boardEl.addEventListener('click', (e) => { const r = e.target.closest?.('.rb-row'); if (!S.done || !r?.dataset.k) return; for (const o of rows) o.classList?.remove('sel', 'fresh'); r.classList.add('sel'); sfx.clink({ freq: 1200, gain: 0.03 }); pose(r.dataset.k); });
        for (const r of rows) { boardEl.append(r); r.classList.add('in'); }
        ui.go?.(1); if (!cap.key) { opening(); drawOn(L.l, LPTS, 0.9, 0.5); drawOn(L.ac, [A, [S.c, 0]], 0.6, 1.2); drawOn(L.cb, [[S.c, 0], B], 0.7, 1.6); } else if (S.ask) ui.status?.(S.ask);
        requestAnimationFrame(() => aim?.(DIR)); setTimeout(() => { if (!dead) aim?.(DIR); }, 700); },
      dispose() { cue.dispose(); dead = true; runId++; removeEventListener('keydown', onKey); css.remove(); },
      update() {
        const t = now(), dt = Math.min(0.05, t - last); last = t; uT.value = t;
        flowTex.offset.x -= dt * 0.25;
        // 马：走的时候迈步，停下来脖子扭向河、低头喝水
        const walking = t - gait.moved < 0.15, idle = !S.held && t - gait.moved > 0.5;
        gait.amp += ((walking ? 1 : 0) - gait.amp) * Math.min(1, dt * 10);
        gait.pose += ((idle ? 1 : 0) - gait.pose) * Math.min(1, dt * 2.5);
        gait.yaw += (gait.face - gait.yaw) * Math.min(1, dt * 9); horse.rotation.y = gait.yaw;
        { const off = -Math.cos(gait.yaw) * 0.85 * HS; horse.position.set(S.c + off, G, -HV); horsePick.position.set(S.c + off * 0.5, G + 0.01, -HV); }          // 马嘴落在 C 上：点 C 露在马头前面 neckY.rotation.y = (gait.face === 0 ? 0.85 : -0.85) * gait.pose;
        for (const g of legs) { const a = gait.p + g.ph * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
          if (!g.hind) { g.hip.rotation.z = 0.34 * s * gait.amp; g.knee.rotation.z = -0.9 * Math.max(0, c) ** 1.5 * gait.amp; }
          else { g.hip.rotation.z = -0.3 + 0.3 * s * gait.amp; g.knee.rotation.z = 0.3 + 0.5 * Math.max(0, c) ** 1.5 * gait.amp; } }
        body.position.y = 0.71 + 0.012 * gait.amp * Math.sin(gait.p * 2);
        neckP.rotation.z = NECK0 - 1.5 * gait.pose + 0.04 * gait.amp * Math.sin(gait.p * 2 + 1); headP.rotation.z = HEAD0 + 0.95 * gait.pose;
        tailP.rotation.x = 0.18 * Math.sin(t * 1.3); tailP.rotation.z = -0.35 + 0.06 * Math.sin(t * 0.9);
        // 蒙古包的烟、圈里的羊
        for (const p of puffs) { const k = (t * 0.16 + p.k0) % 1; p.sp.position.set(pipeTop.x + k * 0.012 + Math.sin(k * 6 + p.k0 * 9) * 0.0012, pipeTop.y + k * 0.03, pipeTop.z - k * 0.004); p.sp.scale.setScalar(0.003 + k * 0.009); p.sp.material.opacity = 0.42 * (1 - k) * smooth(0, 0.12, k); }
        for (const [n, f] of realPen.flock.entries()) f.s.rotation.y = f.yaw + 0.25 * Math.sin(t * 0.3 + n * 1.7);
        // 此刻那一句：淡进淡出
        if (cap.out < 1e9) { const k = clamp(1 - (t - cap.out) / 0.35, 0, 1); capMesh.material.opacity = k; if (k <= 0) { cap.out = 1e9; const nx = cap.next; cap.next = null; nx?.(); } } else capMesh.material.opacity = clamp((t - cap.born) / 0.5, 0, 1);
        // 新线一笔画出来
        for (const [m, d] of drawing) { if (t < d.t0) continue; const k = clamp((t - d.t0) / d.dur, 0, 1), e = k * k * (3 - 2 * k); if (d.pts) rawSet(m, k >= 1 ? d.pts : cutAt(d.pts, Math.max(0.002, e))); if (k >= 1) drawing.delete(m); }
        // 重拍：一圈短光线往外迸
        for (let n = flashes.length - 1; n >= 0; n--) { const f = flashes[n], k = (t - f.t0) / 0.6; if (k < 0) continue; if (k >= 1) { for (const r of f.rays) { group.remove(r); r.geometry.dispose(); r.material.dispose(); } flashes.splice(n, 1); continue; }
          const e = 1 - (1 - k) ** 2; f.rays.forEach((r, q) => { const a = (q / f.rays.length) * Math.PI * 2 + 0.13, d = [Math.cos(a), Math.sin(a)], r0 = 0.006 + 0.024 * e, r1 = r0 + 0.012 * (1 - k); r.geometry.dispose(); r.geometry = ribbon([add(f.p, mul(d, r0)), add(f.p, mul(d, r1))], r.userData.w / 2, 0); r.visible = true; r.material.opacity = 1 - k; }); }
        // 光迹慢慢淡掉
        for (const m of trails) { if (!m.visible) continue; const k = (t - m.userData.t0) / 1.6; if (k >= 1) { m.visible = false; continue; } m.material.opacity = 0.42 * (1 - k); }
        paper.material.opacity = 0.6;
        // 拉直的那一下：光带亮一下再收住；最低的标杆鼓一下
        { const k = clamp((t - S.punchAt) / 0.9, 0, 1); setOp(L.glow, S.straight ? 0.45 + 0.55 * (1 - k) : 0); }
        { const k = Math.max(clamp((t - S.punchAt) / 0.9, 0, 1), S.straight ? 0 : 1), k2 = clamp((t - S.postAt) / 0.9, 0, 1), b = Math.max(k < 1 ? Math.sin(k * Math.PI) : 0, k2 < 1 ? Math.sin(k2 * Math.PI) : 0); if (b > 0 || S.postBig) { drawPosts(1 + 0.8 * b); S.postBig = b > 0; } }
        { const k = clamp((t - S.flagAt) / 0.5, 0, 1); flag.scale.setScalar(S.showLine ? easeOut(k) : 1); }
        // 证明：AC′、C′B′ 两条边转到 AB′ 上接起来，比 AB′ 长出一截
        if (S.lay) { const { t0, cp, a, b } = S.lay, k = clamp((t - t0) / 1.1, 0, 1), e = k * k * (3 - 2 * k), dA = angA(A, B2), d = unit(sub(B2, A)), off = mul([d[1], -d[0]], 0.006 * e), A0 = add(A, off);
          const th1 = angA(A, cp) + wrapA(dA - angA(A, cp)) * e, e1 = add(A0, [a * Math.cos(th1), a * Math.sin(th1)]);
          const th2 = angA(cp, B2) + wrapA(dA - angA(cp, B2)) * e, e2 = add(e1, [b * Math.cos(th2), b * Math.sin(th2)]);
          const age = t - t0 - 1.1, fade = clamp(1 - (age - 2.6) / 0.5, 0, 1), endAB = add(A0, mul(d, dist(A, B2))), nn = mul([d[1], -d[0]], 0.004);
          setLine(L.lay1, [A0, e1]); setLine(L.lay2, [e1, e2]); setLine(L.over, k >= 1 ? [endAB, e2] : null); setLine(L.mark, k >= 1 ? [sub(endAB, nn), add(endAB, nn)] : null);
          for (const m of [L.lay1, L.lay2, L.over, L.mark]) setOp(m, fade);
          if (k >= 1 && !S.lay.hit) { S.lay.hit = true; ripple(B2, RED); if (S.beat === 'proof') proved(); else sfx.ding(1250, { gain: 0.05 }); }
          if (fade <= 0) { S.lay = null; for (const m of [L.lay1, L.lay2, L.over, L.mark]) { setLine(m, null); setOp(m, 1); } } }
        // 光：从 A 射到 C，再反射到 B
        if (S.run) { const k = clamp((t - S.run.t0) / 1.6, 0, 1), Cs = [CSTAR, 0], L1 = dist(A, Cs), L2 = dist(Cs, B), s = k * (L1 + L2);
          const tip = s <= L1 ? add(A, mul(unit(sub(Cs, A)), s)) : add(Cs, mul(unit(sub(B, Cs)), s - L1));
          setLine(L.ray, s <= L1 ? [A, tip] : [A, Cs, tip]); const fade = clamp(1 - (t - S.run.t0 - 2.8) / 0.6, 0, 1); setOp(L.ray, fade);
          spark.position.copy(P3(tip, Y + 0.004)); spark.scale.setScalar(0.014 + 0.004 * Math.sin(t * 20)); spark.material.opacity = k < 1 ? 0.95 : 0.95 * clamp(1 - (t - S.run.t0 - 1.6) / 0.4, 0, 1);
          if (fade <= 0) { S.run = null; setLine(L.ray, null); setOp(L.ray, 1); spark.material.opacity = 0; } }
        // 卡住很久，才一级一级给提示（不拦着人）
        if (!S.held && !S.done && S.hint < 1 && t - S.beatAt > 15 && t - gait.moved > 4) {
          const H1 = { fold: ['按住羊圈这一块，往河对岸翻过去', '沿河边 l 折叠'], equal: ['拖着马走：看 CB 和 CB′ 的长度', ''], straight: ['A、B′ 在河的两边：怎么连最短？', '把马牵到 A、C、B′ 连成一条直线的地方'], proof: ['提示：在 l 上另外任取一点 C′', '证明 AC + CB < AC′ + C′B'], light: ['把马牵回 C，看 ∠1 和 ∠2', ''] }[S.beat];
          if (H1) { S.hint = 1; caption(...H1); } }
        cue.update();
      },
      debug: {
        get S() { return S; }, seen, CSTAR, len, rows, pose,
        cap: () => S.cap,
        labels: () => Object.values(LB),
        qa: [
          { name: '拖着马沿河走一遍', run: () => { horseDown(); for (let k = 0; k <= 40; k++) horseMove([C_MIN + ((C_MAX - C_MIN) * k) / 40, 0]); horseUp(); }, wait: 2 },
          { name: '把羊圈那一块折到对岸', run: () => { if (!foldDown(B)) return; foldMove([B[0], -B[1]]); foldUp(); }, wait: 1 },
          { name: '拖着马看 CB 和 CB′', run: () => { horseDown(); for (let k = 0; k <= 12; k++) horseMove([0.06 - k * 0.006, 0]); horseUp(); }, wait: 2.2 },
          { name: '拉成一条直线', run: () => { horseDown(); horseMove([CSTAR + 0.002, 0]); horseUp(); }, wait: 2.8 },
          { name: '牵到别处 C′', run: () => { horseDown(); horseMove([CSTAR + 0.07, 0]); horseUp(); }, wait: 4.4 },
          { name: '牵回 C', run: () => { horseDown(); horseMove([CSTAR + 0.002, 0]); horseUp(); }, wait: 4 },
        ],
      },
    };
  },
};
