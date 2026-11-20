// 数学 八年级上册 综合与实践 最短路径问题 · 牧民饮马（课本 PDF 第 101–102 页，图 1–4）。小样：只做学生的那一下。
// 一块草原立在书上，一条笔直的河横穿过去。蒙古包 A、羊圈 B 在河的这一边（离人近），对岸往后是缓坡。
// 学生拖着马沿河边走（马迈着步子走，松手就转过去低头喝水），A→C→B 的路程实时在变，河里一根根标杆记下走过的每一处（杆越高路越远）；
// 把羊圈那一块（C、羊圈 B、B 到河边的垂足 H 围成的三角形）沿河折到对岸，B 落到 B′，CB′ 和 CB 一样长；
// 再拖着马走，A、C、B′ 连成一条直线的那一处就是最短——两点之间，线段最短。正好是最低的那根标杆。
import * as THREE from 'three';
import { add, sub, mul, unit, dist, clamp, lerp, easeOut } from './kit/sheet.js';
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
    quote: '在任务 1 中，点 A，B 在直线 l 的同侧，你能利用轴对称，把这个问题转化为（1）中的问题吗？',
    why: '把羊圈那一块沿河边 l 折到对岸：B 落到 B′。C 在折痕 l 上，所以 CB′ 和 CB 一样长，AC + CB = AC + CB′。A 和 B′ 在河的两边：两点之间，线段最短，C 落在 AB′ 和 l 的交点上时路程最短。',
    src: '课本 · 综合与实践 最短路径问题（牧民饮马问题，图 1–4）',
  },

  create({ aim }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    let ui = null, dead = false;
    const T0 = performance.now(), now = () => (performance.now() - T0) / 1000;
    const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    const basic = (o) => new THREE.MeshBasicMaterial(o);
    const lit = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o });
    const quiet = (m) => { m.raycast = () => {}; m.userData.noFrame = true; return m; };
    const solid = (m) => { m.castShadow = true; m.receiveShadow = true; m.raycast = () => {}; m.userData.noFrame = true; return m; };
    const GOLD = 0xe8890c, IMG = 0x3f7fd0, INK = 0x2b3542;
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
      for (let k = 0; k < 9000; k++) { g.fillStyle = `rgba(${100 + Math.random() * 50},${128 + Math.random() * 40},${60 + Math.random() * 20},${Math.random() * 0.09})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 2 + Math.random() * 4); } });
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
    { const N = 6500, geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.00042, 0, 0, 0.00042, 0, 0, 0.0001, 0.0036, 0], 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
      const blades = new THREE.InstancedMesh(geo, sway(lit({ color: 0xffffff, roughness: 1, side: THREE.DoubleSide }), 0.0036), N), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
      let k = 0;
      for (let tries = 0; k < N && tries < 60000; tries++) { const p = [(Math.random() - 0.5) * 0.4, -0.135 + Math.random() * 0.33];
        if (!inPoly(p, outline) || (p[1] > -0.015 && p[1] < RV1 + 0.003) || dist(p, A) < 0.024 || dist(p, B) < 0.022 || HILLS.some(([cu, cv, ru, rv]) => ((p[0] - cu) / ru) ** 2 + ((p[1] - cv) / rv) ** 2 < 0.8)) continue;
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
      g2.add(wall, roof, crown, door, lintel, pipe); g2.position.copy(P3(A, G)); g2.rotation.y = 0.35; group.add(g2);
      g2.updateMatrix(); pipeTop.set(0.0055, HW + HR * 0.55 + 0.006, -0.002).applyMatrix4(g2.matrix);
    }
    const puffTex = tex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); });
    const puffs = Array.from({ length: 9 }, (_, i) => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: 0xf2efe8, transparent: true, depthWrite: false, opacity: 0 }))); group.add(sp); return { sp, k0: i / 9 }; });
    // 羊圈 B：一圈木桩和两道横杆（前面留个门），里面几只羊
    const woolGeo = new THREE.IcosahedronGeometry(1, 2); { const p = woolGeo.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + (Math.random() - 0.5) * 0.14; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } woolGeo.computeVertexNormals(); }
    const ballGeo = new THREE.SphereGeometry(1, 10, 8);
    const pen = (p, wood, wool, dark) => { const g2 = new THREE.Group(), R = 0.017, N = 14, pts = [];
      for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2 + 0.12; pts.push([Math.cos(a) * R * (1 + 0.05 * Math.sin(i * 2.3)), Math.sin(a) * R]); }
      for (const [x, z] of pts) { const post = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.00055, 0.00068, 0.0068, 6), wood)); post.position.set(x, 0.0034, z); g2.add(post); }
      for (let i = 0; i < N; i++) { if (i === 3) continue; const a = pts[i], b = pts[(i + 1) % N], l = Math.hypot(b[0] - a[0], b[1] - a[1]); for (const y of [0.0027, 0.0054]) { const rail = solid(new THREE.Mesh(new THREE.BoxGeometry(l, 0.0005, 0.0005), wood)); rail.position.set((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2); rail.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]); g2.add(rail); } }
      const flock = [];
      for (const [x, z, yaw, graze] of [[-0.006, 0.004, 0.4, 1], [0.005, -0.003, 2.2, 0], [0.0005, 0.008, 1.1, 1], [-0.004, -0.0075, 3.4, 0], [0.009, 0.005, 5, 1], [-0.0095, -0.001, 4.2, 0]]) { const s = new THREE.Group();
        const body = solid(new THREE.Mesh(woolGeo, wool)); body.scale.set(0.0034, 0.0025, 0.0023); body.position.y = 0.0042;
        const head = solid(new THREE.Mesh(ballGeo, dark)); head.scale.set(0.0015, 0.0012, 0.001); head.position.set(0.0034, graze ? 0.0024 : 0.0049, 0);
        s.add(body, head); for (const [lx, lz] of [[0.0018, 0.001], [0.0018, -0.001], [-0.0018, 0.001], [-0.0018, -0.001]]) { const leg = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.00035, 0.0003, 0.0026, 5), dark)); leg.position.set(lx, 0.0013, lz); s.add(leg); }
        s.position.set(x, 0, z); s.rotation.y = yaw; g2.add(s); flock.push({ s, yaw }); }
      g2.position.copy(P3(p, G)); group.add(g2); return { g: g2, flock }; };
    const realPen = pen(B, lit({ color: 0x84634a }), lit({ color: 0xf5f1e6, roughness: 0.95 }), lit({ color: 0x3a332e }));
    const ghostMat = lit({ color: 0x8fb0dc, transparent: true, opacity: 0.5, depthWrite: false }), ghost = pen(B2, ghostMat, ghostMat, ghostMat); ghost.g.visible = false;          // 折过去以后：羊圈的“影子”B′
    const penPick = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.016, 18), basic({ visible: false })); penPick.position.copy(P3(B, G + 0.007)); penPick.userData.pick = true; penPick.userData.noFrame = true; group.add(penPick);

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
    const beamTex = tex(64, 4, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); for (const [o, a] of [[0, 0], [0.2, 0.25], [0.38, 0.85], [0.5, 1], [0.62, 0.85], [0.8, 0.25], [1, 0]]) gr.addColorStop(o, `rgba(255,255,255,${a})`); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    beamTex.colorSpace = THREE.NoColorSpace;
    const ribbon = (pts2, hw, dash) => { const out = [], uvs = []; let acc = 0; const push = (p, q, n) => { out.push(p[0] + n[0], 0, -(p[1] + n[1]), p[0] - n[0], 0, -(p[1] - n[1]), q[0] + n[0], 0, -(q[1] + n[1]), q[0] + n[0], 0, -(q[1] + n[1]), p[0] - n[0], 0, -(p[1] - n[1]), q[0] - n[0], 0, -(q[1] - n[1])); uvs.push(0, 0.5, 1, 0.5, 0, 0.5, 0, 0.5, 1, 0.5, 1, 0.5); };
      for (let i = 0; i < pts2.length - 1; i++) { const a = pts2[i], b = pts2[i + 1], d = sub(b, a), l = Math.hypot(...d); if (l < 1e-7) continue; const n = [(-d[1] / l) * hw, (d[0] / l) * hw];
        if (!dash) push(a, b, n); else { let t = 0; while (t < l - 1e-9) { const ph = (acc + t) % (dash * 2), on = ph < dash, step = Math.max(1e-6, Math.min(l - t, on ? dash - ph : dash * 2 - ph)); if (on) push(add(a, mul(d, t / l)), add(a, mul(d, (t + step) / l)), n); t += step; } acc += l; } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); return g; };
    const line = (parent, color, w, y, o = 1, dash = 0, order = 5) => { const m = quiet(new THREE.Mesh(new THREE.BufferGeometry(), basic({ color, map: beamTex, transparent: true, opacity: o, depthWrite: false, side: THREE.DoubleSide }))); m.position.y = y; m.renderOrder = order; m.userData.w = w * 2.4; m.userData.dash = dash; m.visible = false; parent.add(m); return m; };
    const setLine = (m, p) => { if (!p) { m.visible = false; return; } m.geometry.dispose(); m.geometry = ribbon(p, m.userData.w / 2, m.userData.dash); m.visible = true; };
    const Y = G + LIFT;
    const L = { l: line(group, 0x2f86e8, 0.0008, Y - 0.0002, 0.9, 0.004), ac: line(group, GOLD, 0.0016, Y), cb: line(group, GOLD, 0.0016, Y), hb: line(group, INK, 0.0006, Y - 0.0001, 0.55, 0.0025), ab2: line(group, 0xffb340, 0.0075, Y - 0.0003, 0, 0, 4), t1: line(group, GOLD, 0.0012, Y + 0.0002), t2: line(group, IMG, 0.0012, Y + 0.0006, 1, 0, 8) };
    setLine(L.l, [[-0.185, -0.0008], [0.185, -0.0008]]);
    // 羊圈那一块：C、H、B 围成的三角形，放在一个绕河边 l（x 轴）转的组里——折到对岸，B 落到 B′
    const fold = new THREE.Group(); fold.position.y = Y + 0.0004; group.add(fold);
    const paper = new THREE.Mesh(new THREE.BufferGeometry(), lit({ color: 0xfbf6ea, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, roughness: 0.9, emissive: 0xfbf6ea, emissiveIntensity: 0.25 })); paper.renderOrder = 6; paper.userData.pick = true; paper.userData.noFrame = true; fold.add(paper);
    const F = { cb: line(fold, IMG, 0.0016, 0.0003, 1, 0, 8), hb: line(fold, INK, 0.0006, 0.0002, 0.7, 0, 7), sq: line(fold, INK, 0.0005, 0.0002, 0.7, 0, 7) };
    const dot = quiet(new THREE.Mesh(new THREE.RingGeometry(0.0022, 0.0034, 28).rotateX(-Math.PI / 2), basic({ color: IMG, transparent: true, depthWrite: false, side: THREE.DoubleSide }))); dot.position.set(B[0], 0.0004, -B[1]); dot.renderOrder = 8; fold.add(dot);
    fold.visible = false;
    // 字：和课本插图一样的字母、读数
    const measure = (font, txt) => { const g = document.createElement('canvas').getContext('2d'); g.font = font; return g.measureText(txt).width; };
    const labTex = (txt, col, px = 64) => { const f = /^[A-Z]′?$|^l$/.test(txt) ? `italic 500 ${px * 1.08}px "Times New Roman",serif` : `600 ${px}px "Times New Roman","Songti SC","STSong",serif`; return tex(Math.ceil(measure(f, txt)) + 40, Math.round(px * 1.5), (g, w, h) => { g.font = f; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = px * 0.14; g.strokeStyle = 'rgba(255,253,248,0.92)'; g.strokeText(txt, w / 2, h / 2 + 2); g.fillStyle = col; g.fillText(txt, w / 2, h / 2 + 2); }); };
    const label = (hgt) => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }))); sp.renderOrder = 20; sp.userData.h = hgt; sp.userData.k = ''; group.add(sp); sp.visible = false; return sp; };
    const setLabel = (sp, txt, col, p, y) => { if (!txt) { sp.visible = false; return; } if (sp.userData.k !== txt + col) { sp.userData.k = txt + col; const t = labTex(txt, col); sp.material.map?.dispose?.(); sp.material.map = t; sp.material.needsUpdate = true; sp.scale.set((sp.userData.h * t.image.width) / t.image.height, sp.userData.h, 1); } sp.position.copy(P3(p, y)); sp.visible = true; };
    const LB = { A: label(0.013), B: label(0.013), B2: label(0.013), C: label(0.012), l: label(0.011), m: label(0.0105) };
    // 记录：马走到哪儿，就在旁边的河里插一根标杆，杆越高路越远（只记学生自己走过的地方）
    const POSTS = 38, PV = RV1 / 2, HGT = (l) => 0.003 + (l - 0.2) * 0.26;
    const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.00055, 0.00055, 1, 6), lit({ color: 0xa88560 }), POSTS), caps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0013, 10, 8), lit({ color: 0xf0a33a, emissive: 0x6a3a00, emissiveIntensity: 0.3 }), POSTS);
    for (const m of [posts, caps]) { m.count = 0; m.castShadow = true; m.raycast = () => {}; m.userData.noFrame = true; m.frustumCulled = false; group.add(m); }
    const seen = new Map();          // 第几格 → 路程
    const slot = (c) => Math.round((c - C_MIN) / ((C_MAX - C_MIN) / (POSTS - 1)));
    const slotC = (i) => C_MIN + (i * (C_MAX - C_MIN)) / (POSTS - 1);
    function drawPosts(big = 1) { const m4 = new THREE.Matrix4(); let k = 0, minL = 9, minI = -1; for (const [i, l] of seen) if (l < minL) { minL = l; minI = i; }
      for (const [i, l] of seen) { const c = slotC(i), top = G + HGT(l); m4.compose(new THREE.Vector3(c, (WATER + top) / 2, -PV), new THREE.Quaternion(), new THREE.Vector3(1, top - WATER, 1)); posts.setMatrixAt(k, m4); m4.compose(new THREE.Vector3(c, top, -PV), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1).multiplyScalar(i === minI && seen.size > 6 ? 1.5 * big : 1)); caps.setMatrixAt(k, m4); k++; }
      posts.count = caps.count = k; posts.instanceMatrix.needsUpdate = caps.instanceMatrix.needsUpdate = true; }

    // ================= 状态 =================
    const fresh = () => ({ c: -0.11, flip: 0, flipped: false, straight: false, beat: 'walk', held: '' });
    let S = fresh(), grabR = 0.05, punchAt = -9;
    function layout() {
      const C = [S.c, 0];
      horse.position.copy(P3([S.c, HV], G)); horsePick.position.copy(P3([S.c, HV], G + 0.01));
      setLine(L.ac, [A, C]); setLine(L.cb, [C, B]);
      // 羊圈那一块：三角形 C-H-B，组绕 l 往对岸转 flip·180°
      fold.visible = S.beat !== 'walk'; fold.rotation.x = -S.flip * Math.PI;
      if (fold.visible) {
        paper.geometry.dispose(); const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([C[0], 0, -C[1], H[0], 0, -H[1], B[0], 0, -B[1]], 3)); tri.computeVertexNormals(); paper.geometry = tri;
        setLine(F.cb, S.flip > 0.02 ? [C, B] : null); setLine(F.hb, [H, B]);
        const s = 0.006, dx = Math.sign(C[0] - H[0]) || 1; setLine(F.sq, Math.abs(C[0] - H[0]) > s * 1.5 ? [[H[0] + dx * s, 0], [H[0] + dx * s, -s], [H[0], -s]] : null);
      }
      setLine(L.hb, S.flipped ? [H, B] : null);
      ghost.g.visible = S.flipped;
      const l = len(S.c);
      setLabel(LB.A, 'A', '#1f2a3a', add(A, [-0.027, -0.01]), G + 0.013); setLabel(LB.B, 'B', '#1f2a3a', add(B, [0.027, 0.004]), G + 0.012);
      setLabel(LB.B2, S.flipped ? 'B′' : '', '#2f62a8', add(B2, [0.027, 0]), G + 0.012);
      setLabel(LB.C, 'C', '#1f2a3a', [S.c + 0.019, -0.012], G + 0.004); setLabel(LB.l, 'l', '#2f6fbf', [0.176, -0.004], G + 0.006);
      setLabel(LB.m, `${Math.round(l * M)} 米`, S.straight ? '#b4460a' : '#5a3d16', [S.c, PV], G + HGT(l) + 0.011);
      if (S.flipped) { const tick = (p, q) => { const m = mul(add(p, q), 0.5), n = mul(unit([-(q[1] - p[1]), q[0] - p[0]]), 0.0032); return [sub(m, n), add(m, n)]; }; setLine(L.t1, tick(C, B)); setLine(L.t2, tick(C, B2)); }
      else { setLine(L.t1, null); setLine(L.t2, null); }
      setLine(L.ab2, S.straight ? [A, B2] : null);
    }
    function say(txt) { if (ui?.status) ui.status(txt); }

    // ================= 动手 =================
    function horseDown() { if (S.held === 'fold') return false; S.held = 'horse'; return true; }
    function horseMove(q) {
      if (S.held !== 'horse') return; let c = clamp(q[0], C_MIN, C_MAX);
      if (S.flipped && Math.abs(c - CSTAR) < 0.004) c = CSTAR;          // 拉成一条直线时吸住
      const dc = c - S.c; if (Math.abs(dc) > 1e-6) { gait.face = dc > 0 ? 0 : Math.PI; gait.p += (Math.abs(dc) / (HS * 0.95)) * Math.PI * 2; gait.moved = now(); }
      S.c = c;
      const i = slot(c); if (!seen.has(i)) { seen.set(i, len(slotC(i))); drawPosts(); sfx.clink({ freq: 900 + (0.35 - len(c)) * 2200, gain: 0.015 }); }
      const was = S.straight; S.straight = S.flipped && c === CSTAR; if (S.straight && !was) straightened();
      if (S.beat === 'walk' && seen.size >= 14) { S.beat = 'fold'; say('标杆最低的地方，路最短。要是羊圈在河对岸，拉一条直线就行——按住羊圈这一块，沿河折过去'); }
      layout();
    }
    function horseUp() { if (S.held === 'horse') S.held = ''; }
    function foldDown(p) { if (S.beat !== 'fold' || S.flipped) return false; S.held = 'fold'; grabR = Math.max(0.025, -p[1]); sfx.whoosh({ dur: 0.2, freq: 1600, gain: 0.03 }); return true; }
    function foldMove(p) { if (S.held !== 'fold') return; S.flip = Math.acos(clamp(-p[1] / grabR, -1, 1)) / Math.PI; layout(); }          // 手在地上的位置 = 抓住那一点落在地上的影子
    function foldUp() {
      if (S.held !== 'fold') return; S.held = ''; const to = S.flip > 0.5 ? 1 : 0, from = S.flip, t0 = now();
      const step = () => { if (dead) return; const k = clamp((now() - t0) / 0.35, 0, 1); S.flip = lerp(from, to, easeOut(k)); layout(); if (k < 1) requestAnimationFrame(step); else if (to === 1) { S.flipped = true; S.beat = 'straight'; sfx.clink({ freq: 1400, gain: 0.05 }); layout(); say('B 落到了河对岸的 B′。C 在折痕上，CB′ 和 CB 一样长：AC + CB = AC + CB′。再拖着马走，把这条折线拉直'); } };
      step();
    }
    function straightened() { punchAt = now(); sfx.ding(1320, { gain: 0.07 }); say('A、C、B′ 连成一条直线：两点之间，线段最短。在这里饮马路最短——正是最低的那根标杆'); }

    const uv = (p) => [p.x, -p.z];
    const foldDrag = (obj) => ({ obj, plane: 'xz', offset: G + 0.002, enabled: () => S.beat === 'fold' && !S.flipped, onStart: (p) => foldDown(uv(p)), onDrag: (p) => foldMove(uv(p)), onEnd: () => foldUp() });
    const drags = [
      { obj: horsePick, plane: 'xz', offset: G + 0.004, onStart: () => horseDown(), onDrag: (p) => horseMove(uv(p)), onEnd: () => horseUp() },
      foldDrag(penPick), foldDrag(paper),
    ];
    const dragApi = draggable(group, drags, { onClick: () => false });
    let heard = false;
    const pointer = { down: (r, e) => { if (!heard) { heard = true; audio(); } return dragApi.down(r, e); }, move: (r, e) => dragApi.move(r, e), up: (r, e) => dragApi.up(r, e), items: dragApi.items };
    function reset() { S = fresh(); seen.clear(); drawPosts(); layout(); say('拖着马沿河边走：在哪儿饮马，走的路最短？'); }
    const onKey = (e) => { if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !e.target?.closest?.('input,textarea')) reset(); };
    addEventListener('keydown', onKey);

    layout();
    const EL = 0.6, AZ = 0.17, DIR = [Math.sin(AZ) * Math.cos(EL), Math.sin(EL), Math.cos(AZ) * Math.cos(EL)];
    let last = now();
    return {
      group: root, card: false, place: 'spread', scale: 0.95,
      size: { w: 0.39, d: 0.32, h: 0.05 },
      view: { elev: 34, azim: 10, lookY: 0.2, frameMargin: 1.0 },
      pointer,
      mount(u) { ui = u; ui.go?.(1); say('拖着马沿河边走：在哪儿饮马，走的路最短？'); requestAnimationFrame(() => aim?.(DIR)); setTimeout(() => { if (!dead) aim?.(DIR); }, 700); },
      dispose() { dead = true; removeEventListener('keydown', onKey); },
      update() {
        const t = now(), dt = Math.min(0.05, t - last); last = t; uT.value = t;
        flowTex.offset.x -= dt * 0.25;
        // 马：走的时候迈步，停下来转向河、低头喝水
        const walking = t - gait.moved < 0.15, idle = !S.held && t - gait.moved > 0.5;
        gait.amp += ((walking ? 1 : 0) - gait.amp) * Math.min(1, dt * 10);
        gait.pose += ((idle ? 1 : 0) - gait.pose) * Math.min(1, dt * 2.5);
        gait.yaw += (gait.face - gait.yaw) * Math.min(1, dt * 9); horse.rotation.y = gait.yaw; neckY.rotation.y = (gait.face === 0 ? 0.85 : -0.85) * gait.pose;
        for (const g of legs) { const a = gait.p + g.ph * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
          if (!g.hind) { g.hip.rotation.z = 0.34 * s * gait.amp; g.knee.rotation.z = -0.9 * Math.max(0, c) ** 1.5 * gait.amp; }
          else { g.hip.rotation.z = -0.3 + 0.3 * s * gait.amp; g.knee.rotation.z = 0.3 + 0.5 * Math.max(0, c) ** 1.5 * gait.amp; } }
        body.position.y = 0.71 + 0.012 * gait.amp * Math.sin(gait.p * 2);
        neckP.rotation.z = NECK0 - 1.5 * gait.pose + 0.04 * gait.amp * Math.sin(gait.p * 2 + 1); headP.rotation.z = HEAD0 + 0.95 * gait.pose;
        tailP.rotation.x = 0.18 * Math.sin(t * 1.3); tailP.rotation.z = -0.35 + 0.06 * Math.sin(t * 0.9);
        // 蒙古包的烟、圈里的羊
        for (const p of puffs) { const k = (t * 0.16 + p.k0) % 1; p.sp.position.set(pipeTop.x + k * 0.012 + Math.sin(k * 6 + p.k0 * 9) * 0.0012, pipeTop.y + k * 0.03, pipeTop.z - k * 0.004); p.sp.scale.setScalar(0.003 + k * 0.009); p.sp.material.opacity = 0.42 * (1 - k) * smooth(0, 0.12, k); }
        for (const [i, f] of realPen.flock.entries()) f.s.rotation.y = f.yaw + 0.25 * Math.sin(t * 0.3 + i * 1.7);
        paper.material.opacity = S.beat === 'fold' && !S.held ? 0.45 + 0.3 * Math.sin(t * 3.2) ** 2 : 0.6;
        const k = clamp((t - punchAt) / 0.9, 0, 1);          // 拉直的那一下：亮一下再收住
        L.ab2.material.opacity = S.straight ? 0.45 + 0.5 * (1 - k) : 0;
        if (S.straight && k < 1) drawPosts(1 + 0.8 * Math.sin(k * Math.PI));
      },
      debug: {
        get S() { return S; }, seen, CSTAR, len,
        qa: [
          { name: '拖着马沿河走一遍', run: () => { horseDown(); for (let k = 0; k <= 40; k++) horseMove([C_MIN + ((C_MAX - C_MIN) * k) / 40, 0]); horseUp(); }, wait: 1 },
          { name: '把羊圈那一块折到对岸', run: () => { if (!foldDown(B)) return; foldMove([B[0], -B[1]]); foldUp(); }, wait: 1 },
          { name: '拉成一条直线', run: () => { horseDown(); horseMove([CSTAR + 0.002, 0]); horseUp(); }, wait: 1.2 },
        ],
      },
    };
  },
};
