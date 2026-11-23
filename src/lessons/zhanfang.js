// 数学 九年级上册 29.3 弧长和扇形面积 · 圆锥的侧面展开图（课本 PDF 第 140–144 页：弧长、扇形面积、圆锥的母线、图 29.3-6、例 3 毡房）。
// 情境就是课本的例 3：草原上一个毡房（底面积 12 m²，高 3.2 m，外围高 1.8 m）——搭 20 个，至少要多少毛毡？
// 毛毡是弯的，没法直接量；剪开、铺平，弯的面就成了平面图形。一个画面里讲完，每一步都由学生的那一下做出来：
//   拖开围墙的毛毡：它张开、顺着毡房滑下来铺在草地上——圆柱的侧面展开是长方形，长是底面圆的周长 2πr，宽是外围高 1.8；
//   把屋顶的毛毡揭下来放到草地上：露出骨架——椽杆一根根顺着母线（延长到顶点），母线一样长（勾股定理 l ≈ 2.404）；
//   沿一条母线剪开（鼠标停在毛毡上哪儿，金线就落在哪条母线上，长度总是 l）；
//   拉开剪口：毛毡像扇子一样铺平（全课唯一的重拍）——母线不伸长，都成了扇形的半径 l；毡边不伸长，从底面圆张开成半径为 l 的弧：
//     一个点绕底面圆走一圈、一个点沿弧走到头，同样快，同时到——弧长就是底面圆的周长 2πr；
//   毡边只有 2πr 长，铺不满半径为 l 的整个圆（周长 2πl）：把缺口补上，扇形是整个圆的 2πr⁄2πl，面积 πrl；
//   把两块毛毡围回去：扇形的弧正好接上长方形的长边（都是 2πr）→ 一个毡房 36.86 m²，20 个至少 738 m²（答开头的问题）。
// 所有尺寸、展开的每一刻都由真几何算出来：铺平时母线长、毡边长都不变（等距变形）；课本的数按 π 取 3.142 逐步算。
import * as THREE from 'three';
import { clamp, lerp, easeOut } from './kit/sheet.js';
import { draggable } from './kit/interact.js';
import { sfx, audio } from './kit/audio.js';

const R = Math.sqrt(12 / Math.PI);          // 底面圆的半径（米）：底面积 12 m²
const H2 = 1.8, H1 = 1.4, HT = H2 + H1;     // 外围高、上部圆锥的高、毡房高
const L = Math.hypot(R, H1);                // 母线长
const ARC = 2 * Math.PI * R;                // 底面圆的周长
const TH = ARC / L;                         // 侧面展开扇形的圆心角（弧度）
const GAP = 2 * Math.PI - TH;               // 半径为 l 的整个圆里，扇形铺不到的那一块
const NP = 24, PH0 = 0.13;                  // 椽杆根数、第一根的方位
const U = 0.027, GD = 1.0;                  // 1 米 = 0.027 个活页单位；草原土层厚（米）：切面上印此刻那一句
const CS = [4.1, -2.05];                    // 屋顶的毛毡放下、铺开的地方（x, z）：毡房右后方，铺开后不超出长方形的两头
const HUP = HT + H1 + 0.3;                  // 揭下来时毛毡顶点抬到的高度：毡边高过毡房顶
const DOOR = -0.62;                         // 门的方位：正前方往左
const PHT = PH0 + (2 * 2 * Math.PI) / NP;   // 讲母线时点亮的那根椽杆（第 3 根，朝右前）
const dirv = (a) => [Math.sin(a), Math.cos(a)];   // 方位角 → (x, z)：0 朝镜头，往右转为正
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const wrap2 = (a) => { a %= 2 * Math.PI; return a < 0 ? a + 2 * Math.PI : a; };
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const FR = (n, d) => `<span class="mfr"><span>${n}</span><span>${d}</span></span>`;          // 竖着写的分数（板书、面板）
const RAD = (x) => `√<span class="mrad">${x}</span>`;                                       // 根号
// 草原的轮廓（x, z；z 朝镜头）：前沿放得下铺开的围墙毛毡，右边放得下铺开的屋顶毛毡
const OUT = [[-6.6, 2.9], [-6.45, 4.0], [-5.0, 4.22], [-3.0, 4.08], [-1.0, 4.24], [1.2, 4.1], [3.2, 4.25], [5.2, 4.12], [6.45, 3.88], [6.78, 2.6], [6.6, 1.2], [6.9, -0.4], [6.72, -2.2], [6.88, -3.6], [6.1, -4.72], [4.3, -4.92], [2.4, -4.6], [1.0, -3.55], [-0.6, -2.9], [-2.4, -2.8], [-4.2, -3.3], [-5.8, -3.08], [-6.72, -2.0], [-6.5, -0.5], [-6.78, 1.2]];
const SHEEP = [[-4.45, -2.72, 0.4, 1], [-5.45, -2.42, 2.3, 0], [-6.05, -1.55, 4.1, 1], [-3.95, -2.98, 5.4, 1]];

export default {
  id: 'zhanfang',
  fig: '图29.3-6',
  title: '圆锥的侧面展开图',
  flow: 'explore',
  ask: '如果想用毛毡搭建 20 个底面积为 12 m²，高为 3.2 m，外围高 1.8 m 的毡房，至少需要多少平方米毛毡（π 取 3.142，结果取整数）？',
  need: '毛毡是弯的：剪开、铺平，再量。',
  conclusion: {
    page: 143, rect: [64, 110, 470, 245],
    quote: '沿一条母线将圆锥的侧面剪开并展平，得到的圆锥的侧面展开图是一个扇形．设圆锥的母线长为 l，底面圆的半径为 r，那么这个扇形的半径为 l，扇形的弧长为底面圆的周长 2πr，因此圆锥的侧面积为 πrl，圆锥的全面积为 πr(r + l)．',
    why: '围墙的毛毡是圆柱的侧面，剪开展平是长方形：长是底面圆的周长 2π<i>r</i>，宽是外围高。屋顶的毛毡是圆锥的侧面：每条母线都一样长（<i>l</i>），铺平时母线不伸长，毡边都落在离顶点 <i>l</i> 远的地方，所以是半径为 <i>l</i> 的扇形；毡边原来正好绕底面圆一圈，铺平也不伸长，弧长就是 2π<i>r</i>。半径为 <i>l</i> 的整个圆周长 2π<i>l</i>，扇形是整个圆的 ' + FR('2π<i>r</i>', '2π<i>l</i>') + '，面积 = ' + FR('2π<i>r</i>', '2π<i>l</i>') + ' × π<i>l</i>² = π<i>rl</i>（也就是 ' + FR(1, 2) + ' × 弧长 × 半径）。<br><br>毡房：π<i>r</i>² = 12，<i>r</i> ≈ 1.954，圆柱的侧面积 2π × 1.954 × 1.8 ≈ 22.10；圆锥的高 3.2 − 1.8 = 1.4，母线 <i>l</i> = ' + RAD('<i>r</i>² + 1.4²') + ' ≈ ' + RAD('1.954² + 1.4²') + ' ≈ 2.404，圆锥的侧面积 ' + FR(1, 2) + ' × 2.404 × 12.28 ≈ 14.76。20 个毡房：20 × (22.10 + 14.76) = 737.2，毛毡不能少，至少需要 738 m²。',
    src: '课本 · 29.3 弧长和扇形面积（圆锥的侧面展开图；毡房的例题在第 137–138 页）',
  },

  create({ aim, tag, camera }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    const world = new THREE.Group(); world.scale.setScalar(U); world.position.y = GD * U; group.add(world);          // 里面一律用米，草地顶面 y = 0
    let ui = null, dead = false;
    const T0 = performance.now(), now = () => (performance.now() - T0) / 1000;
    let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };          // 固定的随机：每次打开草、花都长在同一处
    const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    const basic = (o) => new THREE.MeshBasicMaterial(o);
    const lit = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o });
    const quiet = (m) => { m.raycast = () => {}; m.userData.noFrame = true; return m; };
    const solid = (m) => { m.castShadow = true; m.receiveShadow = true; return quiet(m); };
    const GOLD = 0xffc83d, BLUE = 0x58c4dd, TEAL = 0x5cd0b3, RED = 0xfc6255, WHITE = 0xffffff;
    const C = { g: '#ffd45c', b: '#9be3f5', t: '#86ecd0', r: '#ff8e82', w: '#ffffff' };          // 图上字：比线亮一点，压在草地、白毡上都看得清
    const uT = { value: 0 };
    const feltNoise = (g, w, h, base, n = 9000) => { g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 60; k++) { const x = rnd() * w, y = rnd() * h, r = 30 + rnd() * 120, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rnd() < 0.5 ? 'rgba(120,100,70,0.06)' : 'rgba(255,255,255,0.08)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
      for (let k = 0; k < n; k++) { g.strokeStyle = `rgba(${rnd() < 0.5 ? '130,110,80' : '255,255,250'},${0.05 + rnd() * 0.08})`; g.lineWidth = 0.6 + rnd(); const x = rnd() * w, y = rnd() * h, a = rnd() * 6.3, l = 2 + rnd() * 6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } };
    // 哈萨克毡房的花边：一条深红的带子，每两根椽杆之间一个羊角纹
    const hornBand = (g, x0, y0, w, h, n) => {
      g.fillStyle = '#9b2c20'; g.fillRect(x0, y0, w, h); g.fillStyle = '#2a2420'; g.fillRect(x0, y0, w, h * 0.09); g.fillRect(x0, y0 + h * 0.91, w, h * 0.09);
      g.strokeStyle = '#f1dfb4'; g.lineWidth = Math.max(2, h * 0.085); g.lineCap = 'round';
      const cw = w / n; for (let i = 0; i < n; i++) { const cx = x0 + (i + 0.5) * cw, cy = y0 + h * 0.5, s = Math.min(cw * 0.3, h * 0.3);
        for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(cx, cy + s * 0.9); g.bezierCurveTo(cx, cy - s * 0.2, cx + sx * s * 0.2, cy - s * 0.95, cx + sx * s * 0.8, cy - s * 0.75); g.bezierCurveTo(cx + sx * s * 1.25, cy - s * 0.55, cx + sx * s * 1.1, cy + s * 0.1, cx + sx * s * 0.7, cy + s * 0.05); g.stroke(); }
        g.fillStyle = '#f1dfb4'; g.beginPath(); g.moveTo(cx - cw * 0.5, cy); g.lineTo(cx - cw * 0.5 + h * 0.12, cy - h * 0.12); g.lineTo(cx - cw * 0.5 + h * 0.24, cy); g.lineTo(cx - cw * 0.5 + h * 0.12, cy + h * 0.12); g.closePath(); g.fill(); } };

    // ================= 草原：一块不规则的地，切面露出草根和黑土 =================
    const crv = new THREE.CatmullRomCurve3(OUT.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal');
    const outline = crv.getPoints(240).slice(0, -1).map((p) => [p.x, p.z]);
    let area2 = 0; for (let i = 0; i < outline.length; i++) { const a = outline[i], b = outline[(i + 1) % outline.length]; area2 += a[0] * b[1] - b[0] * a[1]; }
    const sgn = area2 > 0 ? 1 : -1;
    const inPoly = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
    const grassTex = tex(1024, 1024, (g, w, h) => { g.fillStyle = '#93b95c'; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 90; k++) { const x = rnd() * w, y = rnd() * h, r = 50 + rnd() * 150, gr = g.createRadialGradient(x, y, 0, x, y, r), t = rnd(); gr.addColorStop(0, t < 0.35 ? 'rgba(190,200,110,0.3)' : t < 0.7 ? 'rgba(96,140,64,0.28)' : 'rgba(150,190,96,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
      for (let k = 0; k < 16000; k++) { g.fillStyle = `rgba(${70 + rnd() * 60},${110 + rnd() * 50},${40 + rnd() * 30},${0.08 + rnd() * 0.12})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 1.5, 2 + rnd() * 5); } });
    grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping; grassTex.repeat.set(1 / 3.4, 1 / 3.4);
    const soilTex = tex(512, 192, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#4c5a2c'); gr.addColorStop(0.09, '#3d3322'); gr.addColorStop(0.16, '#4a3a26'); gr.addColorStop(0.5, '#6a5236'); gr.addColorStop(1, '#7c6244'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 700; k++) { g.strokeStyle = `rgba(40,30,18,${0.25 + rnd() * 0.4})`; g.lineWidth = 1; const x = rnd() * w; g.beginPath(); g.moveTo(x, h * 0.08); g.lineTo(x + (rnd() - 0.5) * 5, h * (0.12 + rnd() * 0.16)); g.stroke(); }
      for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '58,44,28' : '170,150,120'},${0.2 + rnd() * 0.35})`; g.beginPath(); g.arc(rnd() * w, h * (0.22 + rnd() * 0.78), 0.6 + rnd() * 2, 0, 6.3); g.fill(); } });
    soilTex.wrapS = THREE.RepeatWrapping;
    { const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z))), tg = new THREE.ShapeGeometry(shape, 1); tg.rotateX(-Math.PI / 2);
      const top = new THREE.Mesh(tg, lit({ map: grassTex, roughness: 0.95 })); top.receiveShadow = true; top.raycast = () => {}; top.userData.qaSupport = true; world.add(top);
      const pos = [], uv = [], idx = []; let s = 0; const n = outline.length;
      for (let i = 0; i <= n; i++) { const p = outline[i % n]; if (i) s += Math.hypot(p[0] - outline[i - 1][0], p[1] - outline[i - 1][1]); pos.push(p[0], 0, p[1], p[0], -GD, p[1]); uv.push(s / 2.6, 1, s / 2.6, 0);
        if (i) { const k = i * 2; if (sgn > 0) idx.push(k - 2, k, k - 1, k, k + 1, k - 1); else idx.push(k - 2, k - 1, k, k, k - 1, k + 1); } }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); sg.setIndex(idx); sg.computeVertexNormals();
      const side = new THREE.Mesh(sg, lit({ map: soilTex, roughness: 0.95 })); side.receiveShadow = true; side.raycast = () => {}; side.userData.qaSupport = true; world.add(side); }
    // 门前一条踩出来的土路
    { const t = tex(256, 512, (g, w, h) => { for (let k = 0; k < 1400; k++) { const y = rnd() * h, x = w / 2 + (rnd() - 0.5) * w * (0.35 + 0.4 * y / h), a = 0.05 + 0.12 * (1 - Math.abs(x - w / 2) / (w * 0.4)); g.fillStyle = `rgba(${150 + rnd() * 30},${128 + rnd() * 20},${88 + rnd() * 20},${Math.max(0, a)})`; g.fillRect(x, y, 3 + rnd() * 6, 2 + rnd() * 5); } });
      const [dx, dz] = dirv(DOOR), m = quiet(new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.6).rotateX(-Math.PI / 2), lit({ map: t, transparent: true, depthWrite: false, roughness: 1 }))); m.position.set(dx * (R + 1.2), 0.006, dz * (R + 1.2)); m.rotation.y = DOOR; m.receiveShadow = true; m.renderOrder = 1; world.add(m); }

    // ================= 毡房：哈那（菱格墙）、门、乌尼（椽杆）、天窗圈；外面围墙毡、屋顶毡 =================
    const yurt = new THREE.Group(); world.add(yurt);
    const latTex = tex(512, 375, (g, w, h) => { g.clearRect(0, 0, w, h); const step = 73, k = w / 2.456; g.lineCap = 'round';
      for (const dir of [1, -1]) for (let i = -8; i < 16; i++) { const x = i * step; g.strokeStyle = '#7a3420'; g.lineWidth = 9; g.beginPath(); g.moveTo(x, h); g.lineTo(x + dir * h, 0); g.stroke(); g.strokeStyle = '#b9583a'; g.lineWidth = 4; g.beginPath(); g.moveTo(x + 1, h); g.lineTo(x + 1 + dir * h, 0); g.stroke(); }
      g.fillStyle = '#3a2416'; for (let i = -8; i < 16; i++) for (let j = 0; j < 8; j++) { const x = i * step + (j % 2) * step / 2, y = h - j * step / 2; g.beginPath(); g.arc(x, y, 4.5, 0, 6.3); g.fill(); } void k; });
    latTex.wrapS = THREE.RepeatWrapping; latTex.repeat.set(5, 1);
    const lattice = solid(new THREE.Mesh(new THREE.CylinderGeometry(R - 0.07, R - 0.07, H2 - 0.04, 120, 1, true), lit({ map: latTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7 }))); lattice.position.y = (H2 - 0.04) / 2; yurt.add(lattice);
    const ringTop = solid(new THREE.Mesh(new THREE.TorusGeometry(R - 0.07, 0.035, 8, 120), lit({ color: 0x8d3a22, roughness: 0.6 }))); ringTop.rotation.x = Math.PI / 2; ringTop.position.y = H2 - 0.035; yurt.add(ringTop);
    const floor = quiet(new THREE.Mesh(new THREE.CircleGeometry(R - 0.07, 64).rotateX(-Math.PI / 2), lit({ color: 0x8a7656, roughness: 1 }))); floor.position.y = 0.008; floor.receiveShadow = true; yurt.add(floor);
    // 门：漆成橙红、画着花纹的木门，嵌在哈那里（外面挂着毡门帘，和围墙毡是一整块）
    { const dt = tex(256, 384, (g, w, h) => { g.fillStyle = '#b8481f'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f2c04a'; g.lineWidth = 6; for (const x0 of [10, w / 2 + 4]) { g.strokeRect(x0 + 8, 20, w / 2 - 34, h - 40); g.beginPath(); const cx = x0 + w / 4 - 9, cy = h / 2; g.moveTo(cx, cy - 60); g.bezierCurveTo(cx + 40, cy - 30, cx + 40, cy + 30, cx, cy + 60); g.bezierCurveTo(cx - 40, cy + 30, cx - 40, cy - 30, cx, cy - 60); g.stroke(); }
        g.fillStyle = '#5a2414'; g.fillRect(w / 2 - 3, 0, 6, h); });
      const [dx, dz] = dirv(DOOR), d = new THREE.Group(); d.position.set(dx * (R - 0.085), 0, dz * (R - 0.085)); d.rotation.y = DOOR; yurt.add(d);
      const wood = lit({ color: 0x9c3a1c, roughness: 0.55 });
      const leaf = solid(new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.44, 0.04), [wood, wood, wood, wood, lit({ map: dt, roughness: 0.5 }), wood])); leaf.position.y = 0.74; d.add(leaf);
      for (const [x, y, w, h] of [[-0.43, 0.76, 0.07, 1.52], [0.43, 0.76, 0.07, 1.52], [0, 1.53, 0.93, 0.08], [0, 0.02, 0.93, 0.04]]) { const b = solid(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), wood)); b.position.set(x, y, 0); d.add(b); } }
    // 乌尼：24 根椽杆，从墙顶的圈连到天窗圈，紧贴在毡子底下
    const YC = 2.84, RC = 0.36;
    const poleGeo = new THREE.CylinderGeometry(0.022, 0.026, 1, 6); poleGeo.translate(0, 0.5, 0);
    const poleMat = lit({ color: 0xffffff, roughness: 0.55 }), poles = new THREE.InstancedMesh(poleGeo, poleMat, NP);
    const POLE = [], POLEC = new THREE.Color(0xb0452a);
    { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
      for (let k = 0; k < NP; k++) { const a = PH0 + (k * 2 * Math.PI) / NP, [dx, dz] = dirv(a), b = new THREE.Vector3(dx * (R - 0.07), H2 - 0.012, dz * (R - 0.07)), t = new THREE.Vector3(dx * (RC + 0.03), YC, dz * (RC + 0.03)), d = t.clone().sub(b);
        q.setFromUnitVectors(up, d.clone().normalize()); m4.compose(b, q, new THREE.Vector3(1, d.length(), 1)); poles.setMatrixAt(k, m4); poles.setColorAt(k, POLEC); POLE.push(a); } }
    poles.castShadow = true; poles.receiveShadow = true; poles.raycast = () => {}; poles.userData.noFrame = true; yurt.add(poles);
    const crownMat = lit({ color: 0x8e3a20, roughness: 0.55 });
    const crown = solid(new THREE.Mesh(new THREE.TorusGeometry(RC, 0.045, 8, 48), crownMat)); crown.rotation.x = Math.PI / 2; crown.position.y = YC; yurt.add(crown);
    for (const a of [0.4, 0.4 + Math.PI / 2]) { const [dx, dz] = dirv(a), ri = RC - 0.05, c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-dx * ri, YC, -dz * ri), new THREE.Vector3(0, YC + 0.2, 0), new THREE.Vector3(dx * ri, YC, dz * ri));
      for (const o of [-0.09, 0.09]) { const [ox, oz] = dirv(a + Math.PI / 2), cc = new THREE.QuadraticBezierCurve3(c.v0.clone().add(new THREE.Vector3(ox * o, 0, oz * o)), c.v1.clone().add(new THREE.Vector3(ox * o, 0, oz * o)), c.v2.clone().add(new THREE.Vector3(ox * o, 0, oz * o))); yurt.add(solid(new THREE.Mesh(new THREE.TubeGeometry(cc, 12, 0.02, 5), crownMat))); } }

    // 围墙毡：一条长 2πr、高 1.8 的毛毡围着哈那；从背后的接缝剪开，绕着正前方 F 张开、铺平，再顺着墙滑下来铺在草地上
    const wallTex = tex(2048, 320, (g, w, h) => { feltNoise(g, w, h, '#eee6d6', 12000);
      const mpp = h / H2, du = (PH0 / (2 * Math.PI) + 0.5) * w;
      // 顶上的花边：每两根椽杆之间一个羊角纹（和屋顶毡的花边对齐）
      g.save(); g.translate(du - w / NP / 2, 0); hornBand(g, -w, 0.05 * mpp, 3 * w, 0.26 * mpp, NP * 3); g.restore();
      g.fillStyle = 'rgba(70,52,36,0.8)'; g.fillRect(0, 0.42 * mpp, w, 0.035 * mpp); g.fillRect(0, 1.05 * mpp, w, 0.035 * mpp);          // 两道捆绳
      // 毡门帘：深红毡子、米色的边和花
      const xd = (DOOR / (2 * Math.PI) + 0.5) * w, dw = (0.92 / ARC) * w, dh = 1.5 * mpp;
      g.fillStyle = '#8f2a1d'; g.fillRect(xd - dw / 2, h - dh, dw, dh); g.strokeStyle = '#efd9a6'; g.lineWidth = 5; g.strokeRect(xd - dw / 2 + 9, h - dh + 9, dw - 18, dh - 9);
      g.lineWidth = 4; g.beginPath(); const cx = xd, cy = h - dh / 2; for (const s of [-1, 1]) { g.moveTo(cx, cy + 40); g.bezierCurveTo(cx + s * 4, cy - 10, cx + s * 30, cy - 50, cx + s * 44, cy - 20); g.bezierCurveTo(cx + s * 56, cy + 8, cx + s * 28, cy + 14, cx + s * 22, cy); } g.stroke();
      const gr = g.createLinearGradient(0, h * 0.82, 0, h); gr.addColorStop(0, 'rgba(110,90,60,0)'); gr.addColorStop(1, 'rgba(110,90,60,0.32)'); g.fillStyle = gr; g.fillRect(0, h * 0.82, w, h * 0.18); });
    const NB = 192, NY = 3;
    const sheet = (nu, nv, uvf, flip) => { const g = new THREE.BufferGeometry(), n = (nu + 1) * (nv + 1); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      const uv = [], idx = []; for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) uv.push(...uvf(i / nu, j / nv));
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; if (flip) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c); }
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g; };
    const wallGeo = sheet(NB, NY, (u, v) => [u, v], false);
    const wallOut = solid(new THREE.Mesh(wallGeo, lit({ map: wallTex, roughness: 0.95 }))), wallIn = solid(new THREE.Mesh(wallGeo, lit({ color: 0xd8cdb8, roughness: 1, side: THREE.BackSide }))); wallOut.material.userData.see = wallIn.material.userData.see = true;          // 毡子是薄薄一层面，里面是空的
    wallOut.frustumCulled = wallIn.frustumCulled = false; yurt.add(wallOut, wallIn);
    // 屋顶毡：毡面上一点 (s, ψ)，s 是离顶点的距离，ψ 是铺平以后的角
    const roofTex = tex(2048, 420, (g, w, h) => { feltNoise(g, w, h, '#f1ebdf', 12000);
      for (let k = 0; k < NP; k++) { const x = ((PH0 + (k * 2 * Math.PI) / NP) / (2 * Math.PI)) * w; const gr = g.createLinearGradient(x - 10, 0, x + 10, 0); gr.addColorStop(0, 'rgba(120,98,70,0)'); gr.addColorStop(0.5, 'rgba(120,98,70,0.22)'); gr.addColorStop(1, 'rgba(120,98,70,0)'); g.fillStyle = gr; g.fillRect(x - 10, 0, 20, h); }          // 椽杆顶出来的一道道棱
      const mpp = h / L; g.save(); g.translate((PH0 / (2 * Math.PI)) * w - w / NP / 2, 0); hornBand(g, -w, h - 0.32 * mpp, 3 * w, 0.24 * mpp, NP * 3); g.restore();
      g.fillStyle = 'rgba(60,44,30,0.85)'; g.fillRect(0, h - 0.05 * mpp, w, 0.05 * mpp); });
    roofTex.wrapS = THREE.RepeatWrapping;
    const NS = 8, NA = 144;
    const roofGeo = sheet(NA, NS, (u, v) => [u, 1 - v], true);
    const roofOut = solid(new THREE.Mesh(roofGeo, lit({ map: roofTex, roughness: 0.95 }))), roofIn = solid(new THREE.Mesh(roofGeo, lit({ color: 0xd3c8b3, roughness: 1, side: THREE.BackSide }))); roofOut.material.userData.see = roofIn.material.userData.see = true;
    roofOut.frustumCulled = roofIn.frustumCulled = false; world.add(roofOut, roofIn);

    // 毡面的几何（真算）：围墙毡在张开 k、滑下 th 时的一点；屋顶毡在顶点 A、毡边半径 rho、剪口方位 phiC 时的一点
    function wallPt(sig, y, k, th, out, nrm) {
      const kap = (1 - k) / R; let x, dz, nx, nz;
      if (kap < 1e-6) { x = sig; dz = 0; nx = 0; nz = 1; } else { const a = kap * sig; x = Math.sin(a) / kap; dz = -(1 - Math.cos(a)) / kap; nx = Math.sin(a); nz = Math.cos(a); }
      const ct = Math.cos(th), st = Math.sin(th);          // 像靠墙的梯子滑倒：顶边贴着 z = R 往下，底边往前
      out[0] = x; out[1] = y * ct + 0.028 * smooth(0.75, 1, th / (Math.PI / 2)); out[2] = R + dz + (H2 - y) * st;
      if (nrm) { nrm[0] = nx; nrm[1] = nz * st; nrm[2] = nz * ct; }
    }
    function roofPt(s, psi, A, rho, phiC, out, nrm) {
      const sa = Math.min(1, rho / L), ca = Math.sqrt(Math.max(0, 1 - sa * sa)), phi = phiC + (psi * L) / rho, dx = Math.sin(phi), dz = Math.cos(phi);
      out[0] = A[0] + s * sa * dx; out[1] = A[1] - s * ca; out[2] = A[2] + s * sa * dz;
      if (nrm) { nrm[0] = ca * dx; nrm[1] = sa; nrm[2] = ca * dz; }
    }
    const _p = [0, 0, 0], _n = [0, 0, 0];
    let wallKey = '', roofKey = '';
    function poseWall() {
      const th = (Math.PI / 2) * S.wt * S.wt, key = S.wk.toFixed(5) + '|' + th.toFixed(5); if (key === wallKey) return; wallKey = key;
      const P = wallGeo.attributes.position, Nn = wallGeo.attributes.normal;
      for (let j = 0; j <= NY; j++) for (let i = 0; i <= NB; i++) { const sig = (i / NB - 0.5) * ARC, y = (j / NY) * H2, q = j * (NB + 1) + i; wallPt(sig, y, S.wk, th, _p, _n); P.setXYZ(q, _p[0], _p[1], _p[2]); Nn.setXYZ(q, _n[0], _n[1], _n[2]); }
      P.needsUpdate = Nn.needsUpdate = true; wallGeo.computeBoundingSphere(); wallGeo.computeBoundingBox(); }
    const roofA = () => { const rho = R + (L - R) * S.ft; return S.ft > 0 ? [CS[0], Math.sqrt(Math.max(0, L * L - rho * rho)) + 0.03, CS[1]] : S.fp; };
    const roofRho = () => R + (L - R) * S.ft;
    function poseRoof() {
      const A = roofA(), rho = roofRho(), key = A.map((v) => v.toFixed(4)).join(',') + '|' + rho.toFixed(5) + '|' + S.phiC.toFixed(4); if (key === roofKey) return; roofKey = key;
      const P = roofGeo.attributes.position, Nn = roofGeo.attributes.normal;
      for (let j = 0; j <= NS; j++) for (let i = 0; i <= NA; i++) { const q = j * (NA + 1) + i; roofPt((j / NS) * L, (i / NA) * TH, A, rho, S.phiC, _p, _n); P.setXYZ(q, _p[0], _p[1], _p[2]); Nn.setXYZ(q, _n[0], _n[1], _n[2]); }
      P.needsUpdate = Nn.needsUpdate = true; roofGeo.computeBoundingSphere(); roofGeo.computeBoundingBox(); roofTex.offset.x = S.phiC / (2 * Math.PI); }

    // ================= 草、花、羊：被风吹着的草；铺在地上的毛毡底下，草压倒（着色器里收掉） =================
    const zone = { strip: { value: new THREE.Vector4(0, 0, 0, 0) }, stripOn: { value: 0 }, disc: { value: new THREE.Vector4(0, 0, 0, 0) }, arc: { value: new THREE.Vector2(0, 7) } };
    const sway = (mat, H0, key) => { mat.customProgramCacheKey = () => 'zf-sway' + key; mat.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, { uT, uStrip: zone.strip, uStripOn: zone.stripOn, uDisc: zone.disc, uArc: zone.arc });
      sh.vertexShader = 'uniform float uT; uniform vec4 uStrip; uniform float uStripOn; uniform vec4 uDisc; uniform vec2 uArc;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  vec3 ip = instanceMatrix[3].xyz; float hid = 0.0;
  if (uStripOn > 0.5 && ip.x > uStrip.x && ip.x < uStrip.y && ip.z > uStrip.z && ip.z < uStrip.w) hid = 1.0;
  if (uDisc.w > 0.5) { vec2 dd = ip.xz - uDisc.xy; if (length(dd) < uDisc.z && mod(atan(dd.x, dd.y) - uArc.x, 6.2831853) < uArc.y) hid = 1.0; }
  float bk = position.y / ${H0.toFixed(3)};
  transformed.x += sin(uT * 1.7 + ip.x * 1.9 + ip.z * 1.3) * 0.018 * bk * bk;
  transformed.z += cos(uT * 1.3 + ip.x * 1.4) * 0.008 * bk * bk;
  transformed *= 1.0 - hid;`); }; return mat; };
    const busy = (p, m = 0) => Math.hypot(p[0], p[1]) < R + 0.14 + m;
    { const N = 9000, geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.012, 0, 0, 0.012, 0, 0, 0.003, 0.17, 0], 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
      const blades = new THREE.InstancedMesh(geo, sway(lit({ color: 0xffffff, roughness: 1, side: THREE.DoubleSide }), 0.17, 'b'), N), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
      let k = 0; for (let tries = 0; k < N && tries < 80000; tries++) { const p = [-7.1 + rnd() * 15.2, -3.8 + rnd() * 8.3]; if (!inPoly(p, outline) || busy(p)) continue;
        { const [ox, oz] = dirv(DOOR); const d = [p[0] - ox * (R + 1.0), p[1] - oz * (R + 1.0)]; if (Math.abs(d[0] * oz - d[1] * ox) < 0.45 && Math.abs(d[0] * ox + d[1] * oz) < 1.1 && rnd() < 0.85) continue; }
        e.set((rnd() - 0.5) * 0.5, rnd() * 6.3, (rnd() - 0.5) * 0.5); q.setFromEuler(e); const s = 0.5 + rnd() * 0.6;
        m4.compose(new THREE.Vector3(p[0], 0, p[1]), q, new THREE.Vector3(1, s, 1)); blades.setMatrixAt(k, m4); col.setHSL(0.2 + rnd() * 0.08, 0.38 + rnd() * 0.2, 0.42 + rnd() * 0.16); blades.setColorAt(k, col); k++; }
      blades.count = k; blades.raycast = () => {}; blades.userData.noFrame = true; world.add(blades);
      // 野花：白、黄、紫的小点，避开毛毡要铺的地方
      const F = 260, flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.03, 0), sway(lit({ color: 0xffffff, roughness: 0.7 }), 0.2, 'f'), F); let f = 0;
      for (let tries = 0; f < F && tries < 20000; tries++) { const p = [-7 + rnd() * 15, -3.7 + rnd() * 8.1]; if (!inPoly(p, outline) || busy(p, 0.2) || (Math.abs(p[0]) < ARC / 2 + 0.3 && p[1] > R - 0.2 && p[1] < R + H2 + 0.3) || Math.hypot(p[0] - CS[0], p[1] - CS[1]) < L + 0.3) continue;
        m4.compose(new THREE.Vector3(p[0], 0.1 + rnd() * 0.06, p[1]), q.identity(), new THREE.Vector3(1, 0.7, 1)); flowers.setMatrixAt(f, m4); col.set([0xfff6e0, 0xf6d44c, 0xb48ad8, 0xf0a0b8][f % 4]); flowers.setColorAt(f, col); f++; }
      flowers.count = f; flowers.raycast = () => {}; flowers.userData.noFrame = true; world.add(flowers); }
    const woolGeo = new THREE.IcosahedronGeometry(1, 2); { const p = woolGeo.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + (rnd() - 0.5) * 0.16; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } woolGeo.computeVertexNormals(); }
    const ballGeo = new THREE.SphereGeometry(1, 10, 8), wool = lit({ color: 0xf3eee2, roughness: 0.95 }), dark = lit({ color: 0x3a322c, roughness: 0.8 });
    const flock = SHEEP.map(([x, z, yaw, graze]) => { const s = new THREE.Group();
      const body = solid(new THREE.Mesh(woolGeo, wool)); body.scale.set(0.42, 0.3, 0.27); body.position.y = 0.5;
      const head = solid(new THREE.Mesh(ballGeo, dark)); head.scale.set(0.15, 0.12, 0.1); head.position.set(0.42, graze ? 0.3 : 0.6, 0);
      s.add(body, head); for (const [lx, lz] of [[0.22, 0.12], [0.22, -0.12], [-0.22, 0.12], [-0.22, -0.12]]) { const leg = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.32, 5), dark)); leg.position.set(lx, 0.16, lz); s.add(leg); }
      s.position.set(x, 0, z); s.rotation.y = yaw; world.add(s); return { s, head, yaw, graze }; });
    // 取景：看不见的盒子框住整块草原和毛毡揭起来的高度
    { const pr = new THREE.Mesh(new THREE.BoxGeometry(13.5, GD + 3.7, 9.15), basic({ transparent: true, opacity: 0, depthWrite: false })); pr.position.set(0.1, (3.7 - GD) / 2, -0.33); pr.raycast = () => {}; world.add(pr); }

    // ================= 数学的笔画：亮的芯、一圈加色光晕、底下一层淡淡的暗影；做成永远朝着镜头的带子 =================
    const beamTex = tex(64, 4, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); for (const [o, a] of [[0, 0], [0.14, 0.5], [0.26, 1], [0.74, 1], [0.86, 0.5], [1, 0]]) gr.addColorStop(o, `rgba(255,255,255,${a})`); g.fillStyle = gr; g.fillRect(0, 0, w, h); }); beamTex.colorSpace = THREE.NoColorSpace;
    const softTex = tex(64, 4, (g, w, h) => { for (let x = 0; x < w; x++) { const u = (x + 0.5) / w - 0.5; g.fillStyle = `rgba(255,255,255,${Math.exp(-((u / 0.2) ** 2)).toFixed(3)})`; g.fillRect(x, 0, 1, h); } }); softTex.colorSpace = THREE.NoColorSpace;
    const LINES = [], camL = new THREE.Vector3();
    function mkLine(color, w, o = {}) {
      const { glow = 0.45, shade = 0.2, op = 1, dash = 0, order = 14 } = o, Ln = { pts: null, dash, k: 1, parts: [] };
      const part = (col, map, blend, width, opacity, ord) => { const m = quiet(new THREE.Mesh(new THREE.BufferGeometry(), basic({ color: col, map, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, blending: blend }))); m.material.userData.see = true; m.renderOrder = ord; m.frustumCulled = false; m.visible = false; world.add(m); Ln.parts.push({ m, w: width, o: opacity }); };
      if (shade) part(0x0b1210, softTex, THREE.NormalBlending, w * 4.2, shade, order - 2);
      if (glow) part(color, softTex, THREE.AdditiveBlending, w * 9, glow, order - 1);
      part(color, beamTex, THREE.NormalBlending, w * 2.4, op, order);
      Ln.set = (pts) => { Ln.pts = pts && pts.length > 1 ? pts : null; for (const p of Ln.parts) p.m.visible = !!Ln.pts; };
      Ln.fade = (k) => { Ln.k = k; for (const p of Ln.parts) p.m.material.opacity = p.o * k; };
      LINES.push(Ln); return Ln; }
    const _t = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Vector3();
    function runsOf(Ln) {
      const runs = []; let cur = []; for (const p of Ln.pts) { if (!p) { if (cur.length > 1) runs.push(cur); cur = []; } else cur.push(p); } if (cur.length > 1) runs.push(cur);
      if (!Ln.dash) return runs; const D = Ln.dash, out = [];
      for (const r of runs) { let acc = 0; for (let i = 1; i < r.length; i++) { const a = r[i - 1], b = r[i], seg = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); let t = 0;
        while (t < seg - 1e-9) { const ph = (acc + t) % (2 * D), on = ph < D, st = Math.max(1e-5, Math.min(seg - t, on ? D - ph : 2 * D - ph)); if (on) out.push([lerp3(a, b, t / seg), lerp3(a, b, (t + st) / seg)]); t += st; } acc += seg; } }
      return out; }
    function refreshLine(Ln) {
      const runs = runsOf(Ln); let nseg = 0; for (const r of runs) nseg += r.length - 1;
      const Nr = runs.map((r) => r.map((p, i) => { const a = r[Math.max(0, i - 1)], b = r[Math.min(r.length - 1, i + 1)]; _t.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); _v.set(camL.x - p[0], camL.y - p[1], camL.z - p[2]); _c.crossVectors(_t, _v); const l = _c.length(); return l < 1e-9 ? [0, 1, 0] : [_c.x / l, _c.y / l, _c.z / l]; }));
      for (const part of Ln.parts) { const g = part.m.geometry; let attr = g.attributes.position;
        if (!attr || attr.count < nseg * 6) { const cap = Math.max(64, nseg * 6 * 2); attr = new THREE.BufferAttribute(new Float32Array(cap * 3), 3); attr.setUsage(THREE.DynamicDrawUsage); g.setAttribute('position', attr); const uv = new Float32Array(cap * 2); for (let v = 0; v < cap; v++) { const u = [0, 1, 0, 0, 1, 1][v % 6]; uv[v * 2] = u; uv[v * 2 + 1] = 0.5; } g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); }
        const A = attr.array, hw = part.w / 2; let o = 0;
        const put = (p, n, s) => { A[o++] = p[0] + n[0] * hw * s; A[o++] = p[1] + n[1] * hw * s; A[o++] = p[2] + n[2] * hw * s; };
        runs.forEach((r, ri) => { const nr = Nr[ri]; for (let i = 0; i < r.length - 1; i++) { put(r[i], nr[i], 1); put(r[i], nr[i], -1); put(r[i + 1], nr[i + 1], 1); put(r[i + 1], nr[i + 1], 1); put(r[i], nr[i], -1); put(r[i + 1], nr[i + 1], -1); } });
        attr.needsUpdate = true; g.setDrawRange(0, nseg * 6); } }
    const drawing = new Map();
    const lenOf = (P) => { let s = 0; for (let i = 1; i < P.length; i++) s += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1], P[i][2] - P[i - 1][2]); return s; };
    const cutAt = (P, k) => { let need = lenOf(P) * k; const out = [P[0]]; for (let i = 1; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1], P[i][2] - P[i - 1][2]); if (need >= l) { out.push(P[i]); need -= l; } else { out.push(lerp3(P[i - 1], P[i], need / Math.max(l, 1e-9))); break; } } return out; };
    const drawOn = (Ln, P, dur = 0.7, delay = 0) => { drawing.set(Ln, { t0: now() + delay, dur }); Ln.set(null); Ln.target = P; };
    const show = (Ln, P) => { const d = drawing.get(Ln); if (d) { Ln.target = P; return; } Ln.set(P); };
    const hide = (Ln) => { drawing.delete(Ln); Ln.set(null); };
    // 点：发光的圆点
    const dotTex = (col) => tex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.17, 'rgba(255,255,255,1)'); gr.addColorStop(0.26, col); gr.addColorStop(0.4, col.replace('1)', '0.5)')); gr.addColorStop(1, col.replace('1)', '0)')); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    const dot = (col, size = 0.3) => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(col), transparent: true, depthTest: false, depthWrite: false }))); sp.scale.setScalar(size); sp.renderOrder = 28; sp.visible = false; world.add(sp); sp.at = (p) => { sp.position.set(p[0], p[1], p[2]); sp.visible = true; }; return sp; };
    // 字：斜体衬线的字母，白字或概念色，底下垫一圈暗晕；{a/b} 画成上下两行的分数
    const mctx = document.createElement('canvas').getContext('2d'), measure = (font, txt) => { mctx.font = font; return mctx.measureText(txt).width; };
    const FONT = (px, it) => `${it ? 'italic ' : ''}500 ${px}px "Times New Roman","Songti SC",serif`, FRX = /^\{([^/{}]+)\/([^/{}]+)\}$/;
    const richTex = (segs, px = 64) => { const parts = segs.map(([x, c, it]) => { if (x[0] === '_') { const f = FONT(Math.round(px * 0.62), false); return { s: x.slice(1), c, f, w: measure(f, x.slice(1)) + px * 0.04, dy: px * 0.26 }; } const m = FRX.exec(x); if (m) { const f = FONT(Math.round(px * 0.7), false); return { n: m[1], d: m[2], c, f, w: Math.max(measure(f, m[1]), measure(f, m[2])) + px * 0.24 }; } const f = FONT(px, it === undefined ? /^[a-zA-Z]$/.test(x) : it); return { s: x, c, f, w: measure(f, x) }; });
      const tall = parts.some((q) => q.n), W = parts.reduce((a, q) => a + q.w, 0);
      return tex(Math.ceil(W) + 48, Math.round(px * (tall ? 2.25 : 1.55)), (g, w, h) => { let x = 24; g.textBaseline = 'middle'; g.lineJoin = 'round';
        const ink = (txt, xx, yy, f, c) => { g.font = f; g.shadowColor = 'rgba(8,14,20,0.85)'; g.shadowBlur = px * 0.22; g.lineWidth = px * 0.16; g.strokeStyle = 'rgba(10,18,26,0.6)'; g.strokeText(txt, xx, yy); g.shadowBlur = 0; g.fillStyle = c; g.fillText(txt, xx, yy); };
        for (const q of parts) { if (q.n) { const cx = x + q.w / 2, y0 = h / 2 + 2; g.textAlign = 'center'; ink(q.n, cx, y0 - px * 0.42, q.f, q.c); ink(q.d, cx, y0 + px * 0.47, q.f, q.c); g.textAlign = 'left'; g.shadowColor = 'rgba(8,14,20,0.85)'; g.shadowBlur = px * 0.16; g.fillStyle = 'rgba(10,18,26,0.55)'; g.fillRect(x + px * 0.05, y0 - px * 0.06, q.w - px * 0.1, px * 0.12); g.shadowBlur = 0; g.fillStyle = q.c; g.fillRect(x + px * 0.08, y0 - px * 0.03, q.w - px * 0.16, px * 0.06); }
          else ink(q.s, x, h / 2 + 2 + (q.dy || 0), q.f, q.c); x += q.w; } }); };
    const label = (h) => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }))); sp.renderOrder = 30; sp.userData.h = h; sp.userData.k = ''; sp.visible = false; world.add(sp); return sp; };
    const setLab = (sp, segs, p) => { if (!segs) { sp.visible = false; return; } const key = JSON.stringify(segs); if (sp.userData.k !== key) { sp.userData.k = key; const t = richTex(segs); sp.material.map?.dispose?.(); sp.material.map = t; sp.material.needsUpdate = true; const hh = sp.userData.h * (t.image.height / Math.round(64 * 1.55)); sp.scale.set((hh * t.image.width) / t.image.height, hh, 1); } sp.position.set(p[0], p[1], p[2]); sp.visible = true; };
    // 重拍：从那一点迸出一圈短光线（3Blue1Brown 的 Flash），在地面上或者正对镜头
    const flashes = [];
    const flash = (p, col, flat = true, delay = 0, r0 = 0.25, r1 = 0.95) => { const rays = Array.from({ length: 12 }, () => mkLine(col, 0.05, { glow: 0.5, shade: 0, order: 24 })); flashes.push({ p, rays, t0: now() + delay, flat, r0, r1 }); };

    // ================= 数学的东西 =================
    const LN = {
      base: mkLine(BLUE, 0.05),                                                          // 毡房的底面圆
      dimA: mkLine(WHITE, 0.028, { glow: 0.2 }), dimB: mkLine(WHITE, 0.028, { glow: 0.2 }), dimT: mkLine(WHITE, 0.022, { glow: 0, dash: 0.1 }),
      sTop: mkLine(BLUE, 0.06), sSide: mkLine(WHITE, 0.04), rad: mkLine(BLUE, 0.04),
      axis: mkLine(WHITE, 0.038, { dash: 0.12, glow: 0.3 }), rTop: mkLine(BLUE, 0.04), pole: mkLine(GOLD, 0.055, { glow: 0.6 }), sq: mkLine(WHITE, 0.02, { glow: 0 }),
      prev: mkLine(GOLD, 0.05, { glow: 0.55 }), cut: mkLine(GOLD, 0.06, { glow: 0.6 }), eA: mkLine(GOLD, 0.06, { glow: 0.55 }), eB: mkLine(GOLD, 0.06, { glow: 0.55 }),
      hem: mkLine(BLUE, 0.06, { glow: 0.5 }), baseC: mkLine(BLUE, 0.04, { dash: 0.16, glow: 0.35 }),
      raceB: mkLine(BLUE, 0.1, { glow: 1, order: 18 }), raceA: mkLine(BLUE, 0.1, { glow: 1, order: 18 }),
      full: mkLine(WHITE, 0.03, { dash: 0.14, glow: 0.2, op: 0.85 }), pArc: mkLine(RED, 0.055, { glow: 0.5 }), seam: mkLine(BLUE, 0.07, { glow: 0.8 }),
    };
    const LB = { S0: label(0.5), dA: label(0.48), dB: label(0.48), len: label(0.52), wid: label(0.48), r: label(0.5), aS: label(0.52), h1: label(0.48), rT: label(0.5), l: label(0.52), lp: label(0.52), lA: label(0.55), lB: label(0.55), arc: label(0.58), aR: label(0.56), w1: label(0.52), w2: label(0.52) };
    const DT = { a: dot('rgba(255,200,61,1)', 0.32), rb: dot('rgba(150,226,245,1)', 0.62), ra: dot('rgba(150,226,245,1)', 0.62), c: dot('rgba(255,200,61,1)', 0.28) };
    // 填色：长方形（青）、扇形（金）、补上的缺口（红）——半透明地压在毛毡上
    const fillMat = (col, o) => basic({ color: col, transparent: true, opacity: o, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
    const stripFill = quiet(new THREE.Mesh(new THREE.PlaneGeometry(ARC, H2).rotateX(-Math.PI / 2), fillMat(TEAL, 0.3))); stripFill.position.set(0, 0.045, R + H2 / 2); stripFill.renderOrder = 6; stripFill.visible = false; world.add(stripFill);
    const fanGeo = (a0, a1, rr) => { const pos = [0, 0, 0], n = 64; for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; pos.push(Math.sin(a) * rr, 0, Math.cos(a) * rr); } const idx = []; for (let i = 1; i <= n; i++) idx.push(0, i, i + 1); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g; };
    const fanFill = quiet(new THREE.Mesh(new THREE.BufferGeometry(), fillMat(GOLD, 0.32))); fanFill.position.set(CS[0], 0.06, CS[1]); fanFill.renderOrder = 6; fanFill.visible = false; world.add(fanFill);
    const patch = quiet(new THREE.Mesh(new THREE.BufferGeometry(), fillMat(RED, 0.55))); patch.position.set(CS[0], 0.05, CS[1]); patch.renderOrder = 6; patch.visible = false; world.add(patch);

    // ================= 此刻那一句：印在草原前沿的土层切面上 =================
    const front = outline.filter(([x, z]) => z > 3.7 && x > -6.5 && x < 6.9).sort((a, b) => a[0] - b[0]);
    const CY0 = -GD + 0.1, CY1 = -0.12, COFF = 0.03;
    const capGeo = new THREE.BufferGeometry(); let capLen = 0;
    { const sp = front.map((p, i) => { const a = front[Math.max(0, i - 1)], b = front[Math.min(front.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [p[0] + ((sgn * dz) / l) * COFF, p[1] - ((sgn * dx) / l) * COFF]; });
      for (let i = 1; i < sp.length; i++) capLen += Math.hypot(sp[i][0] - sp[i - 1][0], sp[i][1] - sp[i - 1][1]);
      const pos = [], uvs = [], idx = []; let s = 0;
      sp.forEach((p, i) => { if (i) s += Math.hypot(p[0] - sp[i - 1][0], p[1] - sp[i - 1][1]); pos.push(p[0], CY0, p[1], p[0], CY1, p[1]); uvs.push(s / capLen, 0, s / capLen, 1); if (i) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); } });
      capGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); capGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); capGeo.setIndex(idx); }
    const capMesh = quiet(new THREE.Mesh(capGeo, basic({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }))); capMesh.renderOrder = 3; capMesh.visible = false; world.add(capMesh);
    const CW = 2048, CH = Math.max(64, Math.round((CW * (CY1 - CY0)) / capLen));
    const capRuns = (txt) => { const out = [], re = /\{([^/{}]+)\/([^/{}]+)\}/g; let i = 0, m; while ((m = re.exec(txt))) { if (m.index > i) out.push({ t: txt.slice(i, m.index) }); out.push({ n: m[1], d: m[2] }); i = m.index + m[0].length; } if (i < txt.length) out.push({ t: txt.slice(i) }); return out; };
    const capTex = (big, small) => tex(CW, CH, (g, w, h) => {
      const FF = (px, wt) => `${wt} ${px}px "Times New Roman","Songti SC","STSong",serif`;
      const widthOf = (runs, px, wt) => runs.reduce((a, r) => { if (r.t != null) { g.font = FF(px, wt); return a + g.measureText(r.t).width; } g.font = FF(Math.round(px * 0.6), wt); return a + Math.max(g.measureText(r.n).width, g.measureText(r.d).width) + px * 0.22; }, 0);
      const R1 = capRuns(big), R2 = small ? capRuns(small) : null; let f = 1, p1 = 0, p2 = 0, w1 = 0, w2 = 0, gap = 0;
      for (; f > 0.45; f -= 0.04) { p1 = Math.round(h * 0.6 * f); p2 = Math.round(h * 0.42 * f); w1 = widthOf(R1, p1, 600); w2 = R2 ? widthOf(R2, p2, 500) : 0; gap = R2 ? h * 0.9 * f : 0; if (w1 + gap + w2 < w - h * 4) break; }
      const tot = w1 + gap + w2, x0 = (w - tot) / 2;
      const band = g.createLinearGradient(x0 - h * 2, 0, x0 + tot + h * 2, 0); band.addColorStop(0, 'rgba(30,22,12,0)'); band.addColorStop(0.07, 'rgba(30,22,12,0.5)'); band.addColorStop(0.93, 'rgba(30,22,12,0.5)'); band.addColorStop(1, 'rgba(30,22,12,0)');
      g.fillStyle = band; g.fillRect(x0 - h * 2, h * 0.06, tot + h * 4, h * 0.88);
      const drawRuns = (runs, px, wt, x, y, col) => { g.textBaseline = 'middle'; g.fillStyle = col; for (const r of runs) { if (r.t != null) { g.font = FF(px, wt); g.textAlign = 'left'; g.fillText(r.t, x, y); x += g.measureText(r.t).width; } else { const fp = Math.round(px * 0.6); g.font = FF(fp, wt); const rw = Math.max(g.measureText(r.n).width, g.measureText(r.d).width) + px * 0.22, cx = x + rw / 2; g.textAlign = 'center'; g.fillText(r.n, cx, y - px * 0.36); g.fillText(r.d, cx, y + px * 0.42); g.fillRect(x + px * 0.08, y + px * 0.01, rw - px * 0.16, Math.max(1.5, px * 0.05)); x += rw; } } };
      drawRuns(R1, p1, 600, x0, h * 0.53, '#f8efdc'); if (R2) drawRuns(R2, p2, 500, x0 + w1 + gap, h * 0.55, '#e6dac2'); });
    const cap = { key: '', born: -9, out: 1e9, next: null };
    function caption(big, small = '') { const key = big + '|' + small; if (key === cap.key) return; cap.key = key; S.cap = [big, small];
      const go = () => { capMesh.material.map?.dispose?.(); capMesh.material.map = capTex(big, small); capMesh.material.needsUpdate = true; capMesh.visible = true; cap.born = now(); cap.out = 1e9; };
      if (capMesh.visible && now() - cap.born > 0.2) { cap.out = now(); cap.next = go; } else go(); }
    const prompt = (txt) => { S.ask = txt; if (ui?.status) ui.status(txt); };

    // ================= 板书：学生做出一样，就用课本的话写一行；只写已经发现的 =================
    const css = document.createElement('style');
    css.textContent = `
.mfr{display:inline-block;vertical-align:middle;text-align:center;font-style:normal;font-size:0.86em;line-height:1.12;margin:0 0.08em}.mfr>span{display:block;padding:0 0.12em}.mfr>span:first-child{border-bottom:1px solid currentColor}
.mrad{border-top:1px solid currentColor;padding:0 0.15em 0 0.1em;margin-left:0.02em}
.zf-board{margin:4px 0 6px;display:flex;flex-direction:column;gap:8px;font:15px/1.7 "Kaiti SC","STKaiti","Songti SC",serif;color:#2b2722}
.zf-board .zb-row{opacity:0;transform:translateY(5px);transition:opacity .5s,transform .5s,background-color 2.4s;padding:3px 8px 3px 6px;border-radius:5px;border-left:3px solid transparent}
.zf-board .zb-row.in{opacity:1;transform:none}
.zf-board .zb-row.fresh{background:rgba(255,206,110,.34);border-left-color:#d98a2b}
.zf-board .n{display:inline-block;min-width:1.25em;color:#b0532a;font-weight:700}
.zf-board b{color:#8a2f1d}
.zf-board i{font-family:"Times New Roman",serif;font-style:italic;letter-spacing:.02em}
.zf-board .g{color:#c98600;font-weight:600}.zf-board .b{color:#2589b0;font-weight:600}.zf-board .t{color:#1a9a82;font-weight:600}.zf-board .r{color:#d4402f;font-weight:600}
.zf-board .zb-h{font:600 12px/1.3 "PingFang SC","Hiragino Sans GB",sans-serif;color:#a07a45;letter-spacing:.3em;margin:6px 0 -4px;opacity:0;transition:opacity .4s}
.zf-board .zb-h.in{opacity:1}
.zf-board.review .zb-row[data-k]{cursor:pointer}.zf-board.review .zb-row[data-k]:hover{background:rgba(255,206,110,.16)}
.zf-board .zb-row.sel{background:rgba(255,206,110,.34);border-left-color:#d98a2b}`;
    document.head.append(css);
    let boardEl = null, lastH = ''; const rows = [];
    const reveal = (r) => { const body = boardEl?.closest('.p-body'); if (!body) return; setTimeout(() => { const rb = r.getBoundingClientRect(), bb = body.getBoundingClientRect(); if (rb.bottom > bb.bottom - 14) body.scrollBy({ top: rb.bottom - bb.bottom + 28, behavior: 'smooth' }); }, 80); };
    const board = (html, key = '') => { const r = document.createElement('div'); r.className = 'zb-row'; r.innerHTML = html; r.dataset.k = key; rows.push(r); for (const o of rows) o.classList?.remove('fresh'); if (boardEl) { boardEl.append(r); requestAnimationFrame(() => { r.classList.add('in', 'fresh'); reveal(r); }); } return r; };
    board.h = (title) => { if (title === lastH) return; lastH = title; const r = document.createElement('div'); r.className = 'zb-h'; r.textContent = title; rows.push(r); if (boardEl) { boardEl.append(r); requestAnimationFrame(() => { r.classList.add('in'); reveal(r); }); } };
    const I = (s) => `<i>${s}</i>`;

    // ================= 状态 =================
    const ROOF = [0, HT, 0], GRASS = [CS[0], H1 + 0.03, CS[1]];
    const fresh = () => ({ beat: 'wall', held: '', wk: 0, wt: 0, fp: ROOF.slice(), up: 0, onGrass: false, phiC: Math.PI, cut: 0, hov: null, ft: 0, pq: 0,
      f: { dims: true, base: true, strip: false, stripA: false, tri: false, lift: false, fan: false, full: false, fill: false, end: false },
      race: -9, poleAt: -9, raceDone: false, cap: ['', ''], ask: '', beatAt: now(), hint: 0, done: false, pose: '', moved: -9, anim: 0 });
    let S = fresh(), runId = 0;
    const later = (ms, fn) => { const id = runId; setTimeout(() => { if (!dead && id === runId) fn(); }, ms); };
    // 补间：把 S 里的一个数在 dur 秒里变到 to
    const tweens = [];
    const drop = (key) => { for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].key === key) { tweens.splice(i, 1); S.anim = Math.max(0, S.anim - 1); } };
    const anim = (key, to, dur, done, ease = (k) => k * k * (3 - 2 * k)) => { drop(key); S.anim++; tweens.push({ key, from: S[key], to, t0: now(), dur: Math.max(0.01, dur), done, ease, id: runId }); };
    const animFp = (to, dur, done) => { const from = S.fp.slice(); drop('fp'); S.anim++; tweens.push({ key: 'fp', from, to, t0: now(), dur, done, id: runId, fp: true }); };
    function stepTweens(t) { for (let i = tweens.length - 1; i >= 0; i--) { const w = tweens[i]; if (w.id !== runId) { tweens.splice(i, 1); continue; } const k = clamp((t - w.t0) / w.dur, 0, 1);
      if (w.fp) { const e = k * k * (3 - 2 * k); S.fp = lerp3(w.from, w.to, e); } else S[w.key] = lerp(w.from, w.to, w.ease(k));
      if (k >= 1) { tweens.splice(i, 1); S.anim = Math.max(0, S.anim - 1); w.done?.(); } } }

    // 圆上、弧上的点（地面上，略高一点）
    const ring = (c, rr, a0, a1, y = 0.05, n = 96) => { const out = []; for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n, [dx, dz] = dirv(a); out.push([c[0] + dx * rr, y, c[1] + dz * rr]); } return out; };
    const ticks = (c, rr, angs, len, y = 0.06) => { const out = []; for (const a of angs) { const [dx, dz] = dirv(a); out.push([c[0] + dx * (rr - len), y, c[1] + dz * (rr - len)], [c[0] + dx * (rr + len), y, c[1] + dz * (rr + len)], null); } return out; };
    const roofCurve = (s, n = 120, lift = 0.03) => { const A = roofA(), rho = roofRho(), out = []; for (let i = 0; i <= n; i++) { roofPt(s, (i / n) * TH, A, rho, S.phiC, _p, _n); out.push([_p[0] + _n[0] * lift, _p[1] + _n[1] * lift, _p[2] + _n[2] * lift]); } return out; };
    const roofRay = (psi, s1 = L, lift = 0.035) => { const A = roofA(), rho = roofRho(), out = []; for (let j = 0; j <= 6; j++) { roofPt((j / 6) * s1, psi, A, rho, S.phiC, _p, _n); out.push([_p[0] + _n[0] * lift, _p[1] + _n[1] * lift, _p[2] + _n[2] * lift]); } return out; };
    const coneRay = (phi, s1 = L, lift = 0.035) => { const A = S.fp, sa = R / L, ca = H1 / L, [dx, dz] = dirv(phi), out = []; for (let j = 0; j <= 6; j++) { const s = (j / 6) * s1; out.push([A[0] + s * sa * dx + ca * dx * lift, A[1] - s * ca + sa * lift, A[2] + s * sa * dz + ca * dz * lift]); } return out; };
    const poleAngs = () => POLE.slice();

    // ================= 每一帧：线、字跟着状态走 =================
    function layout(t) {
      const f = S.f;
      // 开头：底面圆和给的数
      show(LN.base, f.base ? ring([0, 0], R + 0.03, 0, 2 * Math.PI, 0.04, 128) : null);
      setLab(LB.S0, f.base && f.dims ? [['12 m²', C.b, false]] : null, [1.55, 0.1, R + 0.55]);
      if (f.dims) { const x1 = R + 0.38, x2 = R + 0.82, z = 0.35, tk = (x, y) => [[x - 0.1, y, z], [x + 0.1, y, z], null];
        show(LN.dimA, [[x1, 0.02, z], [x1, H2, z], null, ...tk(x1, 0.02), ...tk(x1, H2)]); show(LN.dimB, [[x2, 0.02, z], [x2, HT, z], null, ...tk(x2, 0.02), ...tk(x2, HT)]); show(LN.dimT, [[0.12, HT, 0], [x2 - 0.1, HT, z]]);
        setLab(LB.dA, [['1.8', C.w, false]], [x1 - 0.3, H2 * 0.5, z + 0.1]); setLab(LB.dB, [['3.2', C.w, false]], [x2 + 0.32, HT * 0.62, z]); DT.a.at([0, HT, 0]); }
      else { hide(LN.dimA); hide(LN.dimB); hide(LN.dimT); setLab(LB.dA, null); setLab(LB.dB, null); if (!f.tri) DT.a.visible = false; }
      // 围墙毡：长边（就是底面圆）、宽、分点；面积
      if (f.strip || S.wk > 0.05) { const th = (Math.PI / 2) * S.wt * S.wt, top = [], n = 96; for (let i = 0; i <= n; i++) { wallPt((i / n - 0.5) * ARC, H2, S.wk, th, _p, _n); top.push([_p[0] + _n[0] * 0.03, _p[1] + _n[1] * 0.03 + 0.012, _p[2] + _n[2] * 0.03]); } show(LN.sTop, top); }
      else hide(LN.sTop);
      if (f.strip) { const z0 = R + 0.02, xe = ARC / 2; show(LN.sSide, [[xe, 0.05, z0], [xe, 0.05, R + H2]]);
        setLab(LB.len, [['2π', C.b, false], ['r', C.b], [' ≈ 12.28', C.b, false]], [2.6, 0.12, z0 + 0.62]); setLab(LB.wid, [['1.8', C.w, false]], [xe + 0.36, 0.12, R + H2 / 2]); }
      else { hide(LN.sSide); setLab(LB.len, null); setLab(LB.wid, null); }
      stripFill.visible = f.stripA; setLab(LB.aS, f.stripA ? [['≈ 22.10 m²', C.t, false]] : null, [3.4, 0.14, R + 1.15]);
      show(LN.rad, f.rad ? [[0, 0.06, 0], [Math.sin(0.95) * R, 0.06, Math.cos(0.95) * R]] : null); setLab(LB.r, f.rad ? [['r', C.b], [' ≈ 1.954', C.b, false]] : null, [Math.sin(0.95) * R * 0.5 + 0.1, 0.32, Math.cos(0.95) * R * 0.5 + 0.25]);
      // 骨架上的直角三角形：轴（h₁）、墙顶的半径（r）、一根椽杆所在的母线（l）
      if (f.tri) { const [dx, dz] = dirv(PHT), foot = [dx * R, H2, dz * R]; show(LN.axis, [[0, HT, 0], [0, H2, 0]]); show(LN.rTop, [[0, H2, 0], foot]); show(LN.pole, [[0, HT, 0], foot]);
        const q = 0.2, ux = dx, uz = dz; show(LN.sq, [[ux * q, H2, uz * q], [ux * q, H2 + q, uz * q], [0, H2 + q, 0]]); DT.a.at([0, HT, 0]);
        setLab(LB.h1, [['h', C.w], ['_1', C.w], [' = 1.4', C.w, false]], [-0.7, (HT + H2) / 2 + 0.05, 0.15]); setLab(LB.rT, [['r', C.b]], [dx * R * 0.5 - 0.05, H2 - 0.2, dz * R * 0.5 + 0.12]); setLab(LB.l, [['l', C.g], [' ≈ 2.404', C.g, false]], [dx * R * 0.5 + 0.55, (HT + H2) / 2 + 0.3, dz * R * 0.5 + 0.2]); }
      else { hide(LN.axis); hide(LN.rTop); hide(LN.pole); hide(LN.sq); setLab(LB.h1, null); setLab(LB.rT, null); setLab(LB.l, null); }
      // 屋顶毡在草地上：要剪的那条母线（鼠标停的地方）、剪口、毡边（蓝）
      const onG = S.onGrass;
      if (S.beat === 'cut' && S.hov != null && !S.held && S.cut <= 0) { show(LN.prev, coneRay(S.hov)); const m = coneRay(S.hov)[3]; setLab(LB.lp, [['l', C.g], [' ≈ 2.404', C.g, false]], [m[0] + 0.55, m[1] + 0.15, m[2] + 0.1]); }
      else { hide(LN.prev); setLab(LB.lp, null); }
      if (onG && S.cut > 0 && S.ft <= 0) show(LN.cut, coneRay(S.phiC, L * S.cut, 0.04)); else hide(LN.cut);
      if (onG && S.ft > 0) { show(LN.eA, roofRay(0)); show(LN.eB, roofRay(TH)); const a = roofRay(0)[3], b = roofRay(TH)[3];
        setLab(LB.lA, [['l', C.g]], [a[0] + 0.25 * Math.cos(S.phiC), a[1] + 0.25, a[2] - 0.25 * Math.sin(S.phiC)]); setLab(LB.lB, S.ft > 0.6 ? [['l', C.g]] : null, [b[0], b[1] + 0.3, b[2]]); }
      else { hide(LN.eA); hide(LN.eB); setLab(LB.lA, null); setLab(LB.lB, null); }
      show(LN.hem, onG ? roofCurve(L, 144, 0.03) : null);
      show(LN.baseC, onG && S.ft > 0 ? ring(CS, R, 0, 2 * Math.PI, 0.05, 128) : null);
      if (onG && S.ft >= 1 && f.fan) { const mid = S.phiC + TH * 0.5, [mx, mz] = dirv(mid); setLab(LB.arc, [['2π', C.b, false], ['r', C.b]], [CS[0] + mx * (L + 0.45), 0.2, CS[1] + mz * (L + 0.45)]); }
      else setLab(LB.arc, null);
      // 赛跑：一个点绕底面圆一圈，一个点沿弧走到头，同样快、同时到
      { const k = clamp((t - S.race) / 1.9, 0, 1), on = S.race > 0 && t - S.race < 3.6 && onG && S.ft >= 1;
        if (on) { const e = k; show(LN.raceB, ring(CS, R, S.phiC, S.phiC + 2 * Math.PI * e, 0.07, Math.max(2, Math.round(128 * e)))); show(LN.raceA, ring(CS, L, S.phiC, S.phiC + TH * e, 0.07, Math.max(2, Math.round(128 * e))));
          const [bx, bz] = dirv(S.phiC + 2 * Math.PI * e), [ax, az] = dirv(S.phiC + TH * e); DT.rb.at([CS[0] + bx * R, 0.1, CS[1] + bz * R]); DT.ra.at([CS[0] + ax * L, 0.1, CS[1] + az * L]);
          const fade = clamp(1 - (t - S.race - 2.6) / 0.9, 0, 1); LN.raceA.fade(fade); LN.raceB.fade(fade); DT.rb.material.opacity = DT.ra.material.opacity = fade;
          LN.hem.fade(1 - 0.7 * fade); LN.baseC.fade(1 - 0.6 * fade);          // 赛跑时毡边、底面圆淡下去，看得清两条正在长的路
          if (k >= 1 && !S.raceDone) { S.raceDone = true; raced(); } }
        else { hide(LN.raceA); hide(LN.raceB); DT.rb.visible = DT.ra.visible = false; LN.hem.fade(1); LN.baseC.fade(1); } }
      // 补缺口：半径为 l 的整个圆（白虚线）、补上的那一块（红）
      show(LN.full, f.full && onG ? ring(CS, L, 0, 2 * Math.PI, 0.055, 160) : null);
      if (f.full && S.pq > 0.001) { const a0 = S.phiC + TH, a1 = a0 + GAP * S.pq, key = a0.toFixed(4) + ',' + a1.toFixed(4); if (patch.userData.key !== key) { patch.userData.key = key; patch.geometry.dispose(); patch.geometry = fanGeo(a0, a1, L); show(LN.pArc, ring(CS, L, a0, a1, 0.065, 40)); } patch.visible = true; }
      else { patch.visible = false; patch.userData.key = ''; hide(LN.pArc); }
      fanFill.visible = f.fill; if (f.fill && fanFill.userData.phi !== S.phiC) { fanFill.geometry.dispose(); fanFill.geometry = fanGeo(S.phiC, S.phiC + TH, L); fanFill.userData.phi = S.phiC; }          // 按这一次的剪口画（重来后换了母线也对）
      { const [cx, cz] = dirv(S.phiC + TH / 2); setLab(LB.aR, f.fill ? [['≈ 14.76 m²', C.g, false]] : null, [CS[0] + cx * L * 0.55, 0.2, CS[1] + cz * L * 0.55]); }
      // 讲完：两块围回去，墙顶那一圈接缝（两条蓝边接在一起）；两块的面积
      show(LN.seam, f.end ? ring([0, 0], R + 0.035, 0, 2 * Math.PI, H2 + 0.02, 128) : null);
      setLab(LB.w1, f.end ? [['22.10', C.t, false]] : null, [Math.sin(0.4) * (R + 0.2), 0.95, Math.cos(0.4) * (R + 0.2)]); setLab(LB.w2, f.end ? [['14.76', C.g, false]] : null, [Math.sin(0.4) * (R * 0.55 + 0.2), H2 + H1 * 0.48, Math.cos(0.4) * (R * 0.55 + 0.2)]);
      // 草：铺在地上的毛毡底下的草收掉
      zone.stripOn.value = S.wt > 0.97 ? 1 : 0; zone.strip.value.set(-ARC / 2 - 0.05, ARC / 2 + 0.05, R - 0.05, R + H2 + 0.05);
      if (onG && S.fp[1] < H1 + 0.2) { const rho = roofRho(); zone.disc.value.set(CS[0], CS[1], rho + 0.06, 1); zone.arc.value.set(S.phiC - 0.02, Math.min(6.29, (TH * L) / rho + 0.04)); } else zone.disc.value.w = 0;
    }

    // ================= 一课的主线：每一步都由学生的那一下触发 =================
    function opening() { caption('20 个这样的毡房，至少要多少平方米毛毡？', '毡房可以近似地看作由圆锥和圆柱组成'); prompt('毛毡是弯的，怎么知道它有多大？'); }
    const beat = (b) => { S.beat = b; S.beatAt = now(); S.hint = 0; };
    // 1 围墙：拖开 → 张开、铺平、顺着墙滑下来铺在草地上
    function wallDone() {
      beat('wallA'); S.f.strip = true; sfx.ding(1000, { gain: 0.05 }); flash([0, 0.08, R + 0.04], BLUE); flash([ARC / 2, 0.08, R + 0.04], BLUE, true, 0.15); flash([-ARC / 2, 0.08, R + 0.04], BLUE, true, 0.15);
      caption('围墙的毛毡展开是长方形', '长：原来正好围着底面圆一圈，是底面圆的周长 2πr；宽：外围高 1.8 m');
      board.h('展开'); board(`<span class="n">1</span>围墙（圆柱的侧面）剪开、展平是<b>长方形</b>：长是底面圆的周长 <span class="b">2π${I('r')}</span>，宽是外围高 1.8`, 'wall');
      prompt('这个长方形有多大？');
      later(2200, () => { S.f.stripA = true; S.f.rad = true; sfx.clink({ freq: 1500, gain: 0.04 });
        caption('圆柱的侧面积：2π × 1.954 × 1.8 ≈ 22.10 m²', '底面积 πr² = 12，r ≈ 1.954');
        board(`圆柱的底面圆的半径 <span class="b">${I('r')} = ${RAD(FR(12, 'π'))} ≈ 1.954</span>，侧面积为 <span class="t">2π × 1.954 × 1.8 ≈ 22.10</span>`, 'wallA');
        later(2600, () => { beat('lift'); S.f.base = false; S.f.rad = false; caption('屋顶是圆锥：它的毛毡展开是什么形状？', '先把它揭下来，放到草地上'); prompt('屋顶的毛毡展开，会是什么形状？'); }); });
    }
    // 2 屋顶：揭下来放到草地上 → 露出骨架：椽杆就是母线
    function lifted() {
      S.onGrass = true; beat('mu'); S.poleAt = now(); sfx.clink({ freq: 700, gain: 0.05 });
      caption('一根根椽杆，从顶上连到墙顶那一圈', '连接圆锥顶点和底面圆周上任意一点的线段叫作圆锥的母线');
      board.h('屋顶'); board(`<span class="n">2</span>圆锥是由一个底面和一个侧面围成的几何体。连接圆锥顶点和底面圆周上任意一点的线段叫作圆锥的<span class="g">母线</span>（毡房的椽杆都顺着母线）`, 'mu');
      prompt('这些母线有多长？');
      later(2800, () => { S.f.tri = true; sfx.ding(1180, { gain: 0.045 }); flash([0, HT, 0], GOLD, false);
        caption('母线都一样长：l ≈ 2.404 m', '勾股定理：l² = r² + 1.4²，l ≈ √(1.954² + 1.4²)');
        board(`上部圆锥的高 ${I('h')}₁ = 3.2 − 1.8 = 1.4，母线长 <span class="g">${I('l')} = ${RAD(I('r') + '² + 1.4²')} ≈ ${RAD('1.954² + 1.4²')} ≈ 2.404</span>`, 'muL');
        later(2800, () => { beat('cut'); S.f.tri = false; caption('从哪儿剪开？', '沿任意一条母线剪开都行：它们一样长'); prompt('从哪儿剪开？'); }); });
    }
    // 3 剪开 → 4 拉开、铺平（重拍）
    function cutDone() {
      if (S.beat !== 'cut') return; S.held = ''; drop('cut'); S.cut = 1; beat('open'); sfx.clink({ freq: 2600, gain: 0.04 });
      caption('沿一条母线剪开了', '铺平以后，会是什么形状？'); prompt('铺平了，是什么形状？');
    }
    function flattened() {
      beat('fan'); S.f.fan = true; S.race = now() + 0.9; S.raceDone = false;
      sfx.whoosh({ dur: 0.5, freq: 300, gain: 0.06 }); sfx.ding(1320, { gain: 0.07 }); flash([CS[0], 0.08, CS[1]], GOLD, true, 0, 0.3, 1.3); flash([CS[0], 0.08, CS[1]], BLUE, true, 0.25, 0.3, 1.3);
      caption('圆锥的侧面展开图是一个扇形', '这个扇形的半径为 l，扇形的弧长为底面圆的周长 2πr');
      board(`<span class="n">3</span>沿一条母线将圆锥的侧面剪开并展平，得到的圆锥的侧面展开图是一个<b>扇形</b>：半径为 <span class="g">${I('l')}</span>，弧长为底面圆的周长 <span class="b">2π${I('r')}</span>`, 'fan');
      prompt('弧长为什么正好是底面圆的周长？');
    }
    function raced() {
      if (S.beat !== 'fan') return; const [ex, ez] = dirv(S.phiC + TH); sfx.ding(1560, { gain: 0.05 }); flash([CS[0] + ex * L, 0.1, CS[1] + ez * L], BLUE); flash([CS[0] + dirv(S.phiC)[0] * R, 0.1, CS[1] + dirv(S.phiC)[1] * R], BLUE);
      caption('一样快，同时到：弧长就是底面圆的周长 2πr', '毡边铺平不伸长；每条母线也不伸长，都成了扇形的半径 l');
      later(2900, () => { beat('patch'); S.f.full = true; caption('为什么铺不满整个圆？', '半径为 l 的整个圆，周长是 2πl；毡边只有 2πr 长'); prompt('这个扇形，是整个圆的几分之几？'); });
    }
    // 5 补上缺口 → 扇形是整个圆的 2πr⁄2πl，面积 πrl
    function patched() {
      beat('area'); sfx.ding(1250, { gain: 0.06 }); const [mx, mz] = dirv(S.phiC + TH + GAP / 2); flash([CS[0] + mx * L * 0.7, 0.1, CS[1] + mz * L * 0.7], RED);
      caption('扇形面积 S = {2πr/2πl} × πl² = πrl', '同一个圆里，扇形的弧长和面积都占整个圆的同一个比例');
      board.h('面积'); board(`<span class="n">4</span>扇形是整个圆的 ${FR('<span class="b">2π' + I('r') + '</span>', '2π' + I('l'))}，面积 ${I('S')} = ${FR('2π' + I('r'), '2π' + I('l'))} × π${I('l')}² = ${FR(1, 2)} × <span class="b">2π${I('r')}</span> × <span class="g">${I('l')}</span> = π${I('rl')}。因此圆锥的侧面积为 π${I('rl')}；再加上底面圆的面积 π${I('r')}²，圆锥的全面积为 π${I('r')}(${I('r')} + ${I('l')})`, 'area');
      prompt('毡房顶的毛毡有多大？');
      later(2600, () => { S.f.fill = true; S.f.full = false; S.pq = 0; sfx.clink({ freq: 1500, gain: 0.04 });
        caption('圆锥的侧面积：{1/2} × 2.404 × 12.28 ≈ 14.76 m²', '侧面展开扇形的弧长为 2π × 1.954 ≈ 12.28');
        board(`毡房顶：侧面展开扇形的弧长为 2π × 1.954 ≈ 12.28，圆锥的侧面积为 ${FR(1, 2)} × 2.404 × 12.28 ≈ <span class="g">14.76</span>`, 'areaN');
        later(2600, () => { beat('wrap'); caption('一个毡房一共要多少毛毡？', '把两块毛毡围回毡房上'); prompt('一个毡房一共要多少毛毡？'); }); });
    }
    // 6 围回去：扇形的弧接上长方形的长 → 答
    function wrapAll() {
      beat('wrapping'); S.f.fill = false; S.f.fan = false; S.f.full = false; S.pq = 0; sfx.whoosh({ dur: 0.8, freq: 500, gain: 0.05 });
      anim('ft', 0, 0.75, () => { S.onGrass = false; animFp([CS[0], HUP, CS[1]], 0.5, () => animFp([0, HUP, 0], 0.65, () => animFp(ROOF, 0.45, () => {
        sfx.clink({ freq: 800, gain: 0.04 }); anim('wt', 0, 0.55, () => anim('wk', 0, 0.75, wrapped), (k) => 1 - (1 - k) * (1 - k)); }))); });
    }
    function wrapped() {
      beat('one'); S.f.end = true; S.f.strip = false; S.f.stripA = false; sfx.ding(1180, { gain: 0.06 }); flash([0, H2 + 0.05, R + 0.05], BLUE, false, 0, 0.3, 1.1);
      caption('扇形的弧正好接上长方形的长：都是 2πr', '一个毡房：22.10 + 14.76 = 36.86 m²');
      board.h('答'); board(`<span class="n">5</span>两块围回去，扇形的弧正好接上长方形的长（都是 2π${I('r')}）。一个毡房要 <span class="t">22.10</span> + <span class="g">14.76</span> = 36.86 (m²)`, 'one');
      later(2700, finish);
    }
    function finish() {
      beat('end'); S.done = true; boardEl?.classList.add('review');
      caption('答：至少需要毛毡 738 m²', '按书中近似值 20 × (22.10 + 14.76) ≈ 737.2，毛毡只能多、不能少，取 738');
      board(`<b>答</b>：搭建 20 个这样的毡房至少需要毛毡 20 × (22.10 + 14.76) ≈ 738 (m²)（按书中近似值算出约 737.2，毛毡只能多、不能少，取 738）。`, 'ans');
      prompt(''); ui?.unlock?.();
      later(2600, () => { ui?.go?.(2); ui?.fold?.(false); });          // 一课结束：翻到“对照课本原文”
    }
    // 讲完以后点板书：场景摆回那一刻
    const CAPS = { wall: ['围墙的毛毡展开是长方形', '长：原来正好围着底面圆一圈，是底面圆的周长 2πr；宽：外围高 1.8 m'], wallA: ['圆柱的侧面积：2π × 1.954 × 1.8 ≈ 22.10 m²', '底面积 πr² = 12，r ≈ 1.954'],
      mu: ['一根根椽杆，从顶上连到墙顶那一圈', '连接圆锥顶点和底面圆周上任意一点的线段叫作圆锥的母线'], muL: ['母线都一样长：l ≈ 2.404 m', '勾股定理：l² = 1.954² + 1.4²'],
      fan: ['圆锥的侧面展开图是一个扇形', '这个扇形的半径为 l，扇形的弧长为底面圆的周长 2πr'], area: ['扇形是整个圆的 {2πr/2πl}：S = {2πr/2πl} × πl² = πrl', '整个圆的面积是 πl²，补上的红色那块是扇形缺的部分'],
      areaN: ['圆锥的侧面积：{1/2} × 2.404 × 12.28 ≈ 14.76 m²', '侧面展开扇形的弧长为 2π × 1.954 ≈ 12.28'], one: ['扇形的弧正好接上长方形的长：都是 2πr', '一个毡房：22.10 + 14.76 = 36.86 m²'], ans: ['答：至少需要毛毡 738 m²', '20 × (22.10 + 14.76) = 737.2，毛毡只能多、不能少，取 738'] };
    function pose(k) {
      tweens.length = 0; S.anim = 0; S.held = ''; S.pose = k; S.race = -9; S.raceDone = true; S.poleAt = -9;
      const F = { dims: false, base: false, strip: true, stripA: true, tri: false, fan: false, full: false, fill: false, end: false };
      let st = { wk: 1, wt: 1, fp: ROOF.slice(), onGrass: false, cut: 0, ft: 0, pq: 0, phiC: S.phiC };
      if (k === 'wall') F.stripA = false;
      if (k === 'wallA') F.rad = true;
      if (k === 'mu' || k === 'muL') { st = { ...st, fp: GRASS.slice(), onGrass: true }; F.tri = k === 'muL'; if (k === 'mu') S.poleAt = now(); }
      if (k === 'fan' || k === 'area' || k === 'areaN') { st = { ...st, fp: GRASS.slice(), onGrass: true, cut: 1, ft: 1 }; F.fan = true; }
      if (k === 'fan') S.race = now() + 0.4;
      if (k === 'area') { st.pq = 1; F.full = true; }
      if (k === 'areaN') F.fill = true;
      if (k === 'one' || k === 'ans') { st = { ...st, wk: 0, wt: 0, cut: 1 }; F.strip = false; F.stripA = false; F.end = true; }
      Object.assign(S, st); S.f = F; caption(...(CAPS[k] || CAPS.ans));
    }

    // ================= 动手 =================
    const v3 = (p) => [p.x, p.y, p.z];
    const pickMat = basic({ visible: false }), pick = (geo, x, y, z) => { const m = new THREE.Mesh(geo, pickMat); m.position.set(x, y, z); m.userData.pick = true; m.userData.noFrame = true; world.add(m); return m; };
    const wallPick = pick(new THREE.CylinderGeometry(R + 0.08, R + 0.08, H2, 32), 0, H2 / 2, 0);
    const roofPick = pick(new THREE.ConeGeometry(R + 0.1, H1 + 0.12, 32), 0, HT - H1 / 2 + 0.04, 0);
    const cutPick = pick(new THREE.ConeGeometry(R + 0.03, H1 + 0.03, 48, 1, true), CS[0], H1 / 2 + 0.03, CS[1]);
    const openPick = pick(new THREE.CylinderGeometry(L + 0.2, L + 0.2, 1.5, 40), CS[0], 0.75, CS[1]);
    const fanPick = pick(new THREE.CylinderGeometry(L + 0.45, L + 0.45, 0.3, 48), CS[0], 0.15, CS[1]);
    const stripPick = pick(new THREE.BoxGeometry(ARC, 0.3, H2), 0, 0.15, R + H2 / 2), wrapPick = pick(new THREE.CylinderGeometry(L + 0.2, L + 0.2, 0.3, 48), CS[0], 0.15, CS[1]);
    const ok = (b) => () => S.beat === b && !S.anim && !S.done;
    const drags = [
      { obj: wallPick, plane: 'xz', offset: 0.9, hint: () => '按住围墙的毛毡，往旁边拉开', enabled: ok('wall'),
        onStart: (p) => { S.held = 'wall'; S.x0 = p.x; S.k0 = S.wk; S.f.dims = false; sfx.whoosh({ dur: 0.5, freq: 700, gain: 0.04 }); },
        onDrag: (p) => { if (S.held !== 'wall') return; S.wk = clamp(S.k0 + Math.abs(p.x - S.x0) / 3.0, 0, 1); S.moved = now(); },
        onEnd: () => { if (S.held !== 'wall') return; S.held = '';
          if (S.wk > 0.35) anim('wk', 1, 0.2 + 0.5 * (1 - S.wk), () => { sfx.whoosh({ dur: 0.8, freq: 420, gain: 0.05 }); anim('wt', 1, 0.95, wallDone, (k) => k); });
          else anim('wk', 0, 0.35); } },
      { obj: roofPick, plane: 'xz', offset: HT, hint: () => '按住屋顶的毛毡，揭下来放到草地上', enabled: ok('lift'),
        onStart: (p) => { S.held = 'lift'; S.off = [S.fp[0] - p.x, S.fp[2] - p.z]; S.free = [S.fp[0], S.fp[2]]; S.up = 0; anim('up', 1, 0.5); sfx.whoosh({ dur: 0.4, freq: 900, gain: 0.04 }); },
        onDrag: (p) => { if (S.held !== 'lift') return; S.free = [clamp(p.x + S.off[0], -5.4, 5.6), clamp(p.z + S.off[1], -3.8, 2.6)]; S.moved = now(); },
        onEnd: () => { if (S.held !== 'lift') return; S.held = ''; drop('up');
          if (Math.hypot(S.free[0], S.free[1]) < 1.2) animFp(ROOF, 0.45);          // 没拿开：放回屋顶
          else animFp([CS[0], HUP, CS[1]], 0.55, () => animFp(GRASS, 0.55, lifted)); } },          // 拿开了：飘到右边空地上，落下
      { obj: cutPick, plane: 'xy', offset: CS[1], hint: () => (S.hov == null ? '' : '从顶点往下拖，沿这条母线剪开'), enabled: ok('cut'),
        onStart: (p) => { if (S.hov == null) return; S.held = 'cut'; S.phiC = S.hov; S.cut = 0.03; sfx.whoosh({ dur: 0.25, freq: 2400, gain: 0.025 }); },
        onDrag: (p) => { if (S.held !== 'cut') return; S.cut = clamp(Math.max(S.cut, (H1 + 0.03 - p.y) / H1), 0, 1); S.moved = now(); if (S.cut >= 0.97) cutDone(); },
        onEnd: () => { if (S.held !== 'cut') return; S.held = ''; if (S.cut > 0.5) anim('cut', 1, 0.15, cutDone); else anim('cut', 0, 0.3); } },
      { obj: openPick, plane: 'xz', offset: 0.05, hint: () => '按住毛毡往外拉，把它铺平', enabled: ok('open'),
        onStart: (p) => { S.held = 'open'; S.t0 = S.ft; S.grab = [p.x, p.z]; sfx.whoosh({ dur: 0.5, freq: 600, gain: 0.04 }); },
        onDrag: (p) => { if (S.held !== 'open') return; S.ft = clamp(S.t0 + Math.hypot(p.x - S.grab[0], p.z - S.grab[1]) / 2.2, 0, 1); S.moved = now(); },
        onEnd: () => { if (S.held !== 'open') return; S.held = ''; if (S.ft > 0.4) anim('ft', 1, 0.2 + 0.55 * (1 - S.ft), flattened, (k) => 1 - (1 - k) * (1 - k)); else anim('ft', 0, 0.45); } },
      { obj: fanPick, plane: 'xz', offset: 0.05, hint: () => '按住缺口旁边的半径，转过去把它补满', enabled: ok('patch'),
        onStart: (p) => { S.held = 'patch'; sfx.whoosh({ dur: 0.4, freq: 800, gain: 0.03 }); },
        onDrag: (p) => { if (S.held !== 'patch') return; const d = wrap2(Math.atan2(p.x - CS[0], p.z - CS[1]) - (S.phiC + TH)); S.pq = d > GAP + (2 * Math.PI - GAP) / 2 ? 0 : clamp(d / GAP, 0, 1); S.moved = now(); },
        onEnd: () => { if (S.held !== 'patch') return; S.held = ''; if (S.pq > 0.72) anim('pq', 1, 0.3, patched); else anim('pq', 0, 0.35); } },
      ...[wrapPick, stripPick].map((obj) => ({ obj, plane: 'xz', offset: 0.05, hint: () => '把毛毡围回毡房上', enabled: ok('wrap'),
        onStart: (p) => { S.held = 'wrap'; S.grab = [p.x, p.z]; S.wq = 0; },
        onDrag: (p) => { if (S.held !== 'wrap') return; S.wq = Math.hypot(p.x - S.grab[0], p.z - S.grab[1]); S.moved = now(); },
        onEnd: () => { if (S.held !== 'wrap') return; S.held = ''; if (S.wq > 0.5) wrapAll(); } })),
    ];
    const pill = tag?.('', 'pill'), tip = pill && { loc: (o, x, y, z) => { if (x === 0 && y === -9 && z === 0) pill.show(false); else pill.show(true).loc(o, x, y, z); return tip; }, text: (h) => { pill.text(h); return tip; } };          // kit 把小签“停”到 y = −9 来藏；这里 1 个单位是 1 米，−9 还在画面里
    const dragApi = draggable(world, drags, { onClick: () => false, tip });
    let heard = false;
    const hover = (r) => { if (S.beat !== 'cut' || S.held) return; const h = r.intersectObject(cutPick, false)[0]; if (!h) { S.hov = null; return; } const lp = world.worldToLocal(h.point.clone()); S.hov = Math.atan2(lp.x - CS[0], lp.z - CS[1]); };
    const pointer = { down: (r, e) => { if (!heard) { heard = true; audio(); } hover(r); return dragApi.down(r, e); }, move: (r, e) => { hover(r); return dragApi.move(r, e); }, up: (r, e) => dragApi.up(r, e), items: dragApi.items };
    // 清场重来（换一批学生，或者想重新讲一遍）——键盘 R
    function reset() { runId++; tweens.length = 0; S = fresh(); wallKey = roofKey = ''; rows.length = 0; lastH = ''; if (boardEl) { boardEl.innerHTML = ''; boardEl.classList.remove('review'); } cap.key = ''; ui?.relock?.(); ui?.go?.(1); opening(); }
    const onKey = (e) => { if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !e.target?.closest?.('input,textarea')) reset(); };
    addEventListener('keydown', onKey);
    // 卡住很久，才给一句提示（不拦着人）
    const HINTS = { wall: ['按住围墙的毛毡，往旁边拉开', '剪开以后，弯的毛毡能不能铺平？'], lift: ['按住屋顶的毛毡，拖到右边的草地上', '揭下来就看得见毡房的骨架'], cut: ['在毛毡上从顶点往下拖，就沿那条母线剪开', '鼠标停在哪儿，金线就是那儿的母线'],
      open: ['按住毛毡往外拉', '铺平以后是什么形状？'], patch: ['按住缺口旁边的那条半径，转过去补满', '半径为 l 的整个圆，扇形占了多少？'], wrap: ['按住扇形或长方形，往毡房那边拖', ''] };

    const EL = 0.77, AZ = 0.1, DIR = [Math.sin(AZ) * Math.cos(EL), Math.sin(EL), Math.cos(AZ) * Math.cos(EL)];
    let last = now();
    poseWall(); poseRoof();
    return {
      group: root, card: false, place: 'spread', scale: 0.97,
      size: { w: 13.5 * U, d: 9.2 * U, h: (GD + 3.4) * U },
      view: { elev: 44, azim: 6, lookY: 0.3, frameMargin: 0.95 },
      pointer,
      mount(u) { ui = u; boardEl = document.createElement('div'); boardEl.className = 'zf-board' + (S.done ? ' review' : ''); u.controls?.append(boardEl);
        boardEl.addEventListener('click', (e) => { const r = e.target.closest?.('.zb-row'); if (!S.done || !r?.dataset.k) return; for (const o of rows) o.classList?.remove('sel', 'fresh'); r.classList.add('sel'); sfx.clink({ freq: 1200, gain: 0.03 }); pose(r.dataset.k); });
        for (const r of rows) { boardEl.append(r); r.classList.add('in'); }
        ui.go?.(1); if (!cap.key) opening(); else if (S.ask) ui.status?.(S.ask);
        requestAnimationFrame(() => aim?.(DIR)); setTimeout(() => { if (!dead) aim?.(DIR); }, 700); },
      dispose() { dead = true; runId++; removeEventListener('keydown', onKey); css.remove(); },
      update() {
        const t = now(), dt = Math.min(0.05, t - last); last = t; uT.value = t; void dt;
        stepTweens(t);
        if (S.held === 'lift') S.fp = [S.free[0], lerp(HT, HUP, S.up), S.free[1]];          // 揭起来的毛毡跟着手走
        roofPick.position.set(S.fp[0], S.fp[1] - H1 / 2 + 0.04, S.fp[2]);
        wallPick.visible = S.beat === 'wall'; roofPick.visible = S.beat === 'lift'; cutPick.visible = S.beat === 'cut'; openPick.visible = S.beat === 'open'; fanPick.visible = S.beat === 'patch'; wrapPick.visible = stripPick.visible = S.beat === 'wrap';          // 只留这一步要动的东西
        poseWall(); poseRoof();
        layout(t);
        // 椽杆一根接一根亮一下：每根都是一条母线
        { const k = t - S.poleAt; if (k < 4) { const col = new THREE.Color(); for (let i = 0; i < NP; i++) { const ph = k * 9 - i * 0.32, g = ph > 0 && ph < 3.2 ? Math.sin((ph / 3.2) * Math.PI) : 0; col.copy(POLEC).lerp(new THREE.Color(0xffc83d), g); poles.setColorAt(i, col); } poles.instanceColor.needsUpdate = true; } }
        // 等人去动的东西轻轻动一下
        if (S.beat === 'wall' && !S.held && !S.anim && t - S.moved > 2.5) S.wk = 0.018 * Math.max(0, Math.sin(t * 2.1)) ** 3;
        if (!S.held && !S.done && S.hint < 1 && HINTS[S.beat] && t - S.beatAt > 15 && t - S.moved > 4) { S.hint = 1; caption(...HINTS[S.beat]); }
        for (const [Ln, d] of drawing) { if (t < d.t0) continue; const k = clamp((t - d.t0) / d.dur, 0, 1), e = k * k * (3 - 2 * k); if (Ln.target) Ln.set(k >= 1 ? Ln.target : cutAt(Ln.target, Math.max(0.002, e))); if (k >= 1) drawing.delete(Ln); }
        for (let n = flashes.length - 1; n >= 0; n--) { const fl = flashes[n], k = (t - fl.t0) / 0.65; if (k < 0) continue; if (k >= 1) { for (const r of fl.rays) { for (const p of r.parts) { world.remove(p.m); p.m.geometry.dispose(); p.m.material.dispose(); } LINES.splice(LINES.indexOf(r), 1); } flashes.splice(n, 1); continue; }
          const e = 1 - (1 - k) ** 2; let ex, ey; if (fl.flat) { ex = [1, 0, 0]; ey = [0, 0, 1]; } else { const cam = camera.matrixWorld.elements; ex = [cam[0], cam[1], cam[2]]; ey = [cam[4], cam[5], cam[6]]; }
          fl.rays.forEach((r, q) => { const a = (q / fl.rays.length) * Math.PI * 2 + 0.13, d = [Math.cos(a) * ex[0] + Math.sin(a) * ey[0], Math.cos(a) * ex[1] + Math.sin(a) * ey[1], Math.cos(a) * ex[2] + Math.sin(a) * ey[2]], r0 = fl.r0 + (fl.r1 - fl.r0) * e, r1 = r0 + 0.35 * (1 - k); r.set([[fl.p[0] + d[0] * r0, fl.p[1] + d[1] * r0, fl.p[2] + d[2] * r0], [fl.p[0] + d[0] * r1, fl.p[1] + d[1] * r1, fl.p[2] + d[2] * r1]]); r.fade(1 - k); }); }
        if (cap.out < 1e9) { const k = clamp(1 - (t - cap.out) / 0.35, 0, 1); capMesh.material.opacity = k; if (k <= 0) { cap.out = 1e9; const nx = cap.next; cap.next = null; nx?.(); } } else capMesh.material.opacity = clamp((t - cap.born) / 0.5, 0, 1);
        for (const [i, s] of flock.entries()) { s.s.rotation.y = s.yaw + 0.22 * Math.sin(t * 0.25 + i * 1.7); if (s.graze) s.head.position.y = 0.3 + 0.03 * Math.sin(t * 2.2 + i); }
        world.updateMatrixWorld(); camL.copy(camera.position); world.worldToLocal(camL);
        for (const Ln of LINES) if (Ln.pts) refreshLine(Ln);
      },
      debug: {
        get S() { return S; }, rows, R, L, TH, CS, U, GD, HT, H1, H2, pose,
        set(o) { Object.assign(S, o); if (o.f) S.f = Object.assign(fresh().f, o.f); },
        /** 米 → 活页局部坐标（给鼠标脚本用 scr(u, v, y)）：u = x·U，v = −z·U，y = (y + GD)·U */
        loc: (x, y, z) => [x * U, -z * U, (y + GD) * U],
        cap: () => S.cap,
        labels: () => Object.values(LB),
        qa: [
          { name: '拉开围墙的毛毡', run: () => { const d = drags[0]; d.onStart({ x: 0, y: 0.9, z: R }); d.onDrag({ x: 1.6, y: 0.9, z: R }); d.onDrag({ x: 3.4, y: 0.9, z: R }); d.onEnd(); }, wait: 6.5 },
          { name: '把屋顶的毛毡揭到草地上', run: () => { const d = drags[1]; d.onStart({ x: 0, y: HT, z: 0 }); S.up = 1; d.onDrag({ x: 2.2, y: HT, z: -1 }); d.onDrag({ x: CS[0], y: HT, z: CS[1] }); d.onEnd(); }, wait: 7.5 },
          { name: '沿一条母线剪开', run: () => { S.hov = 0.35; const d = drags[2]; d.onStart({ x: CS[0], y: H1, z: CS[1] }); d.onDrag({ x: CS[0], y: 0.7, z: CS[1] }); d.onDrag({ x: CS[0], y: 0.0, z: CS[1] }); d.onEnd(); }, wait: 1 },
          { name: '拉开剪口铺平', run: () => { const d = drags[3]; d.onStart({ x: CS[0] + 1, y: 0.05, z: CS[1] + 1 }); d.onDrag({ x: CS[0] + 1, y: 0.05, z: CS[1] + 3.3 }); d.onEnd(); }, wait: 7 },
          { name: '把缺口补上', run: () => { const d = drags[4]; d.onStart({ x: CS[0], y: 0.05, z: CS[1] + 1 }); for (let k = 0; k <= 10; k++) { const [dx, dz] = dirv(S.phiC + TH + (GAP * k) / 10); d.onDrag({ x: CS[0] + dx * 2, y: 0.05, z: CS[1] + dz * 2 }); } d.onEnd(); }, wait: 6.5 },
          { name: '把毛毡围回去', run: () => { const d = drags[5]; d.onStart({ x: CS[0], y: 0.05, z: CS[1] }); d.onDrag({ x: CS[0] - 2, y: 0.05, z: CS[1] + 0.5 }); d.onEnd(); }, wait: 9 },
        ],
      },
    };
  },
};
