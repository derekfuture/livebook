// 数学 八年级下册 23.2 一次函数的图象和性质（课本 PDF 第 123–128 页）。
// 情境：元代延祐铜壶滴漏——元延祐三年（1316 年）冼运行、杜子盛等在广州铸造，现藏中国国家博物馆。
// 日壶、月壶、星壶一级级往下滴水，水流进受水壶，浮箭跟着水面上升，指着铜表尺上的十二时辰报时。
// 一块石台基立在书上，三张木架一级级托着日、月、星三只壶，受水壶站在右前方。铜尺就是 y 轴（模型尺身比例作了调整），
// 时间是 x 轴，往右画出“时间—浮箭高度”的图象。学生手里只有课本说的那两个点：(0, b) 和 (1, k + b)。
//   开头的问题：铜尺上的十二时辰，该刻在哪儿？（假设卯时读数是 19 cm，申时是 44 cm）
//   先看最简单的（子时壶里是空的）：拖着时间走，每个时辰浮箭升高 5 cm，一级级台阶一样高，点连成过原点的直线 y = 5x（重拍 1）；
//   子时壶里已经有水呢？把子时的浮箭往上拖：整条直线向上平移 b，和 y = 5x 平行，每一点都高出 b（重拍 2）；
//   滴得快慢不同呢？拖一个时辰后的那一点：直线绕着 (0, b) 转，k 越大越陡；k < 0（水往外放）从左向右下降（重拍 3）；
//   回到这座钟：让直线经过 (3, 19)、(8, 44)，解出 k = 5，b = 4（待定系数法）——
//   一下子：十二道光从直线上每个时辰的点平射到铜尺上，嵌出子丑寅卯……亥十二条等距的刻线（答开头的问题）。
import * as THREE from 'three';
import { clamp, lerp, easeOut } from './kit/sheet.js';
import { mathActionCue } from './kit/mathActionCue.js';
import { draggable } from './kit/interact.js';
import { sfx, audio } from './kit/audio.js';

const S = 0.15;                                     // 1 米 = 0.15（活页单位）
const FL = 0.3;                                     // 台基顶面（地面）高（米）
const RR = 0.19, HR = 0.75, LID = FL + HR;          // 受水壶：外半径、高（照原大）；壶盖顶面
const Y0 = LID + 0.1;                               // 铜尺上 0 的高度（y 以厘米计）
const SX = 0.1;                                     // 横轴：一个时辰画 0.1 米
const XA = -0.6, XB = 12.6, YA = -10, YB = 70;      // 坐标格（x 时辰，y 厘米）
const K0 = 5;                                       // 这座钟：每个时辰升高 5 cm（示意）
const OBS = [[3, 19], [8, 44]];                     // 卯时 19 cm，申时 44 cm（示意）
const KF = 5, BF = 4;                               // 待定系数法解出来的 k、b
const SHI = '子丑寅卯辰巳午未申酉戌亥';
const RUL0 = LID + 0.035, RUL1 = Y0 + 0.79;         // 铜尺：下端（插在壶盖的座上）、上端
const M = (m) => m * S;
const g2m = (x, y) => [x * SX, Y0 + y / 100];       // 坐标 → 米
const wx = (x) => M(x * SX), wy = (y) => M(Y0 + y / 100);
const num = (v) => String(Math.round(v)).replace('-', '−');
const GOLD = 0xffc83d, BLUE = 0x58c4dd, TEAL = 0x5cd0b3, RED = 0xfc6255, WHITE = 0xffffff;
const CSS = { g: '#ffc83d', b: '#58c4dd', t: '#5cd0b3', r: '#fc6255', w: '#ffffff' };
// 三只壶（比真壶小一些，受水壶照原大）：日壶最高、在最里面，一级级往右前方下来，最后滴进受水壶
// 三只壶（比真壶小一些，受水壶照原大）：照拱北楼的老照片，石台阶一级比一级高、一级比一级靠里，三只壶叠成一列，在受水壶的左后方
const STEP = [[-0.2, -0.56], [-0.56, -0.92], [-0.92, -1.36]];          // 三级台阶：前沿、后沿（z，米）
const UP = (() => { const out = []; let y = LID + 0.1;
  [['星', 0.332, 0.153, -0.34], ['月', 0.351, 0.179, -0.4], ['日', 0.453, 0.222, -0.46]].forEach(([n, h, r, x], i) => { out.push({ n, x, z: STEP[i][0] - r - 0.02, y, h, r }); y += h + 0.03; });
  return out; })();
const HOLE = [-0.085, -0.09];                       // 壶盖上进水的小孔
const TAP = [0.13, 0.13];                           // 受水壶脚边放水的龙头（k < 0 时水从这里流出去）
// 台基的轮廓（米，x 向右，z 向外）：前沿宽，往左后方伸到木架底下
const OUTLINE = [[1.42, 0.06], [1.3, 0.3], [0.9, 0.4], [0.4, 0.43], [-0.15, 0.43], [-0.6, 0.36], [-0.9, 0.12], [-1.02, -0.3], [-1.06, -0.8], [-1.04, -1.28], [-0.84, -1.56], [-0.46, -1.62], [-0.08, -1.52], [0.08, -1.12], [0.12, -0.7], [0.3, -0.42], [0.7, -0.32], [1.1, -0.28], [1.34, -0.18]];

export default {
  id: 'yici',
  fig: '图23.2-3',
  title: '一次函数的图象和性质',
  flow: 'explore',
  ask: '用元代铜壶滴漏做一个匀速模型。假设卯时浮箭的读数是 19 cm，申时是 44 cm。模型里的尺身拉长了，方便看刻线。<br>铜尺上的十二时辰，该刻在哪儿？',
  need: '拖着时间走，看浮箭的高度怎么跟着时间变。',
  conclusion: {
    crops: [{ page: 124, rect: [40, 526, 290, 708] }, { page: 126, rect: [42, 234, 464, 348] }, { page: 127, rect: [60, 158, 347, 316] }, { page: 128, rect: [42, 212, 458, 327] }],
    quote: '一次函数 y=kx+b（k≠0）的图象可以由直线 y=kx 平移|b|个单位长度得到（当 b>0 时，向上平移；当 b<0 时，向下平移）．一次函数 y=kx+b（k≠0）的图象也是一条直线，我们称它为直线 y=kx+b．<br>一般地，一次函数 y=kx+b（k，b 是常数，k≠0）具有如下性质：当 k>0 时，y 随 x 的增大而增大；当 k<0 时，y 随 x 的增大而减小．',
    why: '浮箭的高度 y（cm）随时间 x（时辰）均匀变化：每过一个时辰升高同样的 k，x 个时辰升高 kx；子时壶里已经有 b，所以 y = kx + b。这把模型尺量到 70 cm。壶空了，或读数到了上限，这次计时就结束。同一个时刻，它总比 y = kx 高 b，所以直线 y = kx + b 是直线 y = kx 平移 |b| 个单位长度得到的，与 y 轴交于 (0, b)。x 每增大 1，y 就变化 k：k > 0 时从左向右上升，k < 0 时从左向右下降，|k| 越大越陡。<br><br>模型的图象过 (3, 19) 和 (8, 44)，所以 3k + b = 19，8k + b = 44。5 个时辰升了 25 cm，每个时辰升 5 cm。从卯时退回 3 个时辰，19 − 3 × 5 = 4，子时的读数是 4 cm。所以 k = 5，b = 4，y = 5x + 4。子时刻在 4 cm 处，往上每隔 5 cm 刻一个时辰，到亥时是 59 cm；相邻时辰的刻线相距 5 cm。<br><br>元延祐三年（1316 年）冼运行、杜子盛等在广州铸造的铜壶滴漏，日壶、月壶、星壶、受水壶四只壶通高 264.4 cm；受水壶盖上竖着 66.5 cm 高的铜表尺，自下而上刻着子、丑、寅……亥十二时辰。星壶上部的溢流孔排出多余的水，稳住水位，让水均匀滴进受水壶。模型据此假设浮箭匀速上升，尺身比例和读数都作了调整。',
    src: '课本 · 23.2 一次函数的图象和性质（第 118–122 页）；铜壶滴漏为中国国家博物馆藏品',
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
    const V3 = (x, y, z) => new THREE.Vector3(M(x), M(y), M(z));
    const speck = (g, w, h, n, cols, a0, a1, s0 = 1, s1 = 3) => { for (let k = 0; k < n; k++) { g.fillStyle = `rgba(${cols[(Math.random() * cols.length) | 0]},${a0 + Math.random() * (a1 - a0)})`; g.fillRect(Math.random() * w, Math.random() * h, s0 + Math.random() * (s1 - s0), s0 + Math.random() * (s1 - s0)); } };
    const uT = { value: 0 };

    // ================= 材质：青铜、红木、金砖、青白石、水 =================
    const bronzeTex = tex(1024, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ad8a55'); gr.addColorStop(1, '#8f6f43'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 70; k++) { const x = Math.random() * w, y = Math.random() * h, r = 14 + Math.random() * 70, c = g.createRadialGradient(x, y, 0, x, y, r); c.addColorStop(0, `rgba(${84 + Math.random() * 30},${140 + Math.random() * 26},${116 + Math.random() * 20},${0.16 + Math.random() * 0.24})`); c.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = c; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
      for (let k = 0; k < 40; k++) { const x = Math.random() * w, y = Math.random() * h, r = 20 + Math.random() * 60, c = g.createRadialGradient(x, y, 0, x, y, r); c.addColorStop(0, 'rgba(70,46,22,0.22)'); c.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = c; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
      speck(g, w, h, 9000, ['60,40,20', '226,200,140', '100,130,104'], 0.03, 0.13); });
    bronzeTex.wrapS = bronzeTex.wrapT = THREE.RepeatWrapping;
    const envTex = tex(256, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#fff6e6'); gr.addColorStop(0.42, '#e9d9bd'); gr.addColorStop(0.52, '#8a7a62'); gr.addColorStop(1, '#3a2f24'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (const [x, y, ww, hh] of [[40, 18, 34, 30], [150, 22, 26, 26], [205, 30, 18, 20]]) { g.fillStyle = 'rgba(255,255,250,0.9)'; g.fillRect(x, y, ww, hh); } });
    envTex.mapping = THREE.EquirectangularReflectionMapping;          // 青铜自己带一张小小的“屋子”：上亮下暗、几扇窗，金属才有光泽
    const bronze = lit({ map: bronzeTex, roughness: 0.34, metalness: 0.62, envMap: envTex, envMapIntensity: 1.0, side: THREE.DoubleSide });
    const brass = lit({ color: 0xd4ae62, roughness: 0.28, metalness: 0.7, envMap: envTex });
    const woodTex = tex(512, 512, (g, w, h) => { g.fillStyle = '#5b2c1b'; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 160; k++) { const y = Math.random() * h; g.strokeStyle = `rgba(${Math.random() < 0.6 ? '32,14,8' : '122,62,36'},${0.18 + Math.random() * 0.3})`; g.lineWidth = 0.8 + Math.random() * 2.2; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + k) * 3 + (Math.random() - 0.5) * 2); g.stroke(); }
      speck(g, w, h, 2500, ['30,12,6', '140,80,50'], 0.04, 0.12); });
    woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
    const wood = lit({ map: woodTex, roughness: 0.5 });
    const tileTex = tex(512, 512, (g, w, h) => { g.fillStyle = '#5e5951'; g.fillRect(0, 0, w, h);          // 金砖：两块乘两块，砖缝细
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const tone = 128 + Math.random() * 18; g.fillStyle = `rgb(${tone},${tone - 4},${tone - 10})`; g.fillRect(i * 256 + 3, j * 256 + 3, 250, 250); const sh = g.createLinearGradient(i * 256, j * 256, i * 256 + 256, j * 256 + 256); sh.addColorStop(0, 'rgba(255,255,255,0.06)'); sh.addColorStop(1, 'rgba(0,0,0,0.07)'); g.fillStyle = sh; g.fillRect(i * 256 + 3, j * 256 + 3, 250, 250); }
      speck(g, w, h, 5000, ['70,66,60', '190,184,172'], 0.03, 0.1); });
    tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping; tileTex.repeat.set(1 / M(0.9), 1 / M(0.9));
    const stoneTex = tex(512, 256, (g, w, h) => { g.fillStyle = '#d3cbbb'; g.fillRect(0, 0, w, h);          // 青白石的台基：上下两道线脚
      const sh = g.createLinearGradient(0, 0, 0, h); sh.addColorStop(0, 'rgba(255,255,255,0.18)'); sh.addColorStop(0.1, 'rgba(0,0,0,0.08)'); sh.addColorStop(0.14, 'rgba(255,255,255,0.05)'); sh.addColorStop(0.86, 'rgba(0,0,0,0.04)'); sh.addColorStop(0.9, 'rgba(0,0,0,0.12)'); sh.addColorStop(1, 'rgba(60,50,40,0.1)'); g.fillStyle = sh; g.fillRect(0, 0, w, h);
      speck(g, w, h, 4000, ['120,110,96', '240,236,226'], 0.04, 0.14); });
    stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping; stoneTex.repeat.set(1 / M(0.8), 1 / M(FL)); stoneTex.offset.y = 0;
    const blockTex = tex(512, 512, (g, w, h) => { g.fillStyle = '#5d605c'; g.fillRect(0, 0, w, h);          // 青石条：一米见方画四层，砖缝错开
      for (let r = 0; r < 4; r++) for (let c = -1; c < 3; c++) { const x0 = (c + (r % 2) * 0.5) * (w / 2), y0 = r * (h / 4), tone = 128 + Math.random() * 16; g.fillStyle = `rgb(${tone - 4},${tone},${tone - 2})`; g.fillRect(x0 + 3, y0 + 3, w / 2 - 6, h / 4 - 6); const sh = g.createLinearGradient(0, y0, 0, y0 + h / 4); sh.addColorStop(0, 'rgba(255,255,255,0.1)'); sh.addColorStop(1, 'rgba(90,70,50,0.08)'); g.fillStyle = sh; g.fillRect(x0 + 3, y0 + 3, w / 2 - 6, h / 4 - 6); }
      speck(g, w, h, 6000, ['120,108,92', '250,248,240', '150,130,100'], 0.03, 0.12); });
    blockTex.wrapS = blockTex.wrapT = THREE.RepeatWrapping; blockTex.repeat.set(1 / M(1), 1 / M(1));
    const flowTex = tex(512, 512, (c, w, h) => { c.fillStyle = '#5b93a3'; c.fillRect(0, 0, w, h); for (let k = 0; k < 240; k++) { const y = Math.random() * h, x = Math.random() * w, l = 20 + Math.random() * 70; c.strokeStyle = `rgba(230,248,255,${0.06 + Math.random() * 0.16})`; c.lineWidth = 1 + Math.random() * 1.5; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + l / 2, y + (Math.random() - 0.5) * 6, x + l, y); c.stroke(); } });
    flowTex.wrapS = flowTex.wrapT = THREE.RepeatWrapping; flowTex.repeat.set(3, 3);
    const water = new THREE.MeshPhysicalMaterial({ map: flowTex, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 });

    // ================= 台基：一块青白石，顶面铺金砖 =================
    const curve = new THREE.CatmullRomCurve3(OUTLINE.map(([x, z]) => new THREE.Vector3(x, -z, 0)), true, 'centripetal');
    const outline = curve.getPoints(220).slice(0, -1).map((p) => [p.x, p.y]);          // (x, v)，v = −z
    { const bt = M(0.025), g = new THREE.ExtrudeGeometry(new THREE.Shape(outline.map(([x, v]) => new THREE.Vector2(M(x), M(v)))), { depth: M(FL) - 2 * bt, bevelEnabled: true, bevelThickness: bt, bevelSize: bt, bevelSegments: 3, steps: 1, curveSegments: 4 });
      g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, [lit({ map: tileTex, roughness: 0.55 }), lit({ map: stoneTex, roughness: 0.9 })]); m.position.y = bt; m.receiveShadow = true; m.raycast = () => {}; m.userData.qaSupport = true; group.add(m); }

    // ================= 台阶：青白石砌的三级台阶，一级比一级高，托着星壶、月壶、日壶（拱北楼里就是这样砌的） =================
    { const sh = new THREE.Shape(), e = 0.018, P = [[STEP[0][0] - e, FL], [STEP[0][0] - e, UP[0].y - e], [STEP[1][0] - e, UP[0].y - e], [STEP[1][0] - e, UP[1].y - e], [STEP[2][0] - e, UP[1].y - e], [STEP[2][0] - e, UP[2].y - e], [STEP[2][1] + e, UP[2].y - e], [STEP[2][1] + e, FL]];
      P.forEach(([z, y], k) => (k ? sh.lineTo(M(z), M(y)) : sh.moveTo(M(z), M(y))));
      const bt = M(0.018), W = 0.72, g = new THREE.ExtrudeGeometry(sh, { depth: M(W) - 2 * bt, bevelEnabled: true, bevelThickness: bt, bevelSize: bt, bevelSegments: 2, steps: 1 });
      g.rotateY(-Math.PI / 2); const m = new THREE.Mesh(g, [lit({ map: blockTex, roughness: 0.88 }), lit({ map: blockTex, roughness: 0.88 })]); solid(m); m.position.set(M(-0.08) - bt, 0, 0); group.add(m); }

    // ================= 三只壶：青铜，口沿和腹下各一道箍，里面盛着水 =================
    const POT = [[0, 0], [0.78, 0], [0.8, 0.03], [0.83, 0.15], [0.93, 0.8], [0.95, 0.86], [0.96, 0.9], [1, 0.95], [1.02, 0.99], [0.99, 1], [0.9, 1], [0.88, 0.94], [0.85, 0.85], [0.76, 0.15], [0.72, 0.07], [0, 0.06]];
    const surf = [];          // 三只壶的水面（水滴落在这里，荡开水纹）
    for (const u of UP) { const p = new THREE.Mesh(new THREE.LatheGeometry(POT.map(([a, b]) => new THREE.Vector2(M(a * u.r), M(b * u.h))), 64), bronze); solid(p); p.position.set(M(u.x), M(u.y), M(u.z)); group.add(p);
      for (const [hy, rr] of [[0.86, 0.955], [0.24, 0.85]]) { const band = solid(new THREE.Mesh(new THREE.TorusGeometry(M(rr * u.r), M(0.011), 6, 64).rotateX(Math.PI / 2), bronze)); band.position.set(M(u.x), M(u.y + hy * u.h), M(u.z)); group.add(band); }
      const wy0 = u.y + 0.8 * u.h, wv = quiet(new THREE.Mesh(new THREE.CircleGeometry(M(0.835 * u.r), 48).rotateX(-Math.PI / 2), water)); wv.position.set(M(u.x), M(wy0), M(u.z)); group.add(wv); surf.push({ x: u.x, z: u.z, y: wy0 }); }
    // 龙头：从上一只壶的腹下伸出来，伸到下一只壶的口上（最后一只伸到受水壶盖上的小孔）
    const spout = (a, b) => { const d = b.clone().sub(a), L = d.length(); const m = solid(new THREE.Mesh(new THREE.CylinderGeometry(M(0.011), M(0.018), L, 10), bronze)); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()); group.add(m);
      const head = solid(new THREE.Mesh(new THREE.SphereGeometry(M(0.021), 12, 10), bronze)); head.position.copy(b); head.scale.set(1, 0.8, 1); group.add(head);
      const lip = solid(new THREE.Mesh(new THREE.CylinderGeometry(M(0.012), M(0.009), M(0.03), 10), bronze)); lip.position.copy(b).add(new THREE.Vector3(0, -M(0.022), 0)); group.add(lip);
      return { tip: b.clone().add(new THREE.Vector3(0, -M(0.037), 0)), parts: [m, head, lip] }; };
    const chans = [];          // 滴水：从龙头落到下面的水面
    const toward = (u, tx, tz, k) => { const dx = tx - u.x, dz = tz - u.z, l = Math.hypot(dx, dz); return [u.x + (dx / l) * k, u.z + (dz / l) * k]; };
    for (let i = 2; i >= 1; i--) { const u = UP[i], lo = UP[i - 1], [ax, az] = toward(u, lo.x, lo.z, 0.9 * u.r), [bx, bz] = toward(lo, u.x, u.z, 0.42 * lo.r);
      const tip = spout(V3(ax, u.y + 0.045, az), V3(bx, lo.y + lo.h + 0.07, bz)).tip; chans.push({ from: tip, toY: M(surf[i - 1].y), surf: i - 1, acc: Math.random(), drops: [] }); }
    { const u = UP[0], [ax, az] = toward(u, HOLE[0], HOLE[1], 0.9 * u.r); const tip = spout(V3(ax, u.y + 0.045, az), V3(HOLE[0], LID + 0.1, HOLE[1])).tip; chans.push({ from: tip, toY: M(LID + 0.002), surf: -1, acc: 0, drops: [], main: true }); }

    // ================= 受水壶：直筒，盖上竖着铜表尺，浮箭从盖里升起来 =================
    { const P = [[0, 0], [0.9, 0], [0.95, 0.01], [0.97, 0.04], [0.97, 0.12], [1, 0.13], [1, 0.165], [0.97, 0.175], [0.97, 0.85], [1, 0.86], [1, 0.895], [0.97, 0.905], [0.97, 0.96], [0, 0.96]];
      const m = solid(new THREE.Mesh(new THREE.LatheGeometry(P.map(([a, b]) => new THREE.Vector2(M(a * RR), M(b * HR))), 64), bronze)); m.position.y = M(FL); group.add(m);
      const lid = solid(new THREE.Mesh(new THREE.CylinderGeometry(M(RR * 1.04), M(RR * 1.04), M(HR * 0.04), 64), bronze)); lid.position.y = M(LID - HR * 0.02); group.add(lid);
      const seat = solid(new THREE.Mesh(new THREE.BoxGeometry(M(0.12), M(0.035), M(0.06)), bronze)); seat.position.y = M(LID + 0.0175); group.add(seat);
      const hole = quiet(new THREE.Mesh(new THREE.CircleGeometry(M(0.026), 20).rotateX(-Math.PI / 2), basic({ color: 0x1b140c }))); hole.position.set(M(HOLE[0]), M(LID + 0.0012), M(HOLE[1])); group.add(hole);
      const slot = quiet(new THREE.Mesh(new THREE.CircleGeometry(M(0.016), 16).rotateX(-Math.PI / 2), basic({ color: 0x1b140c }))); slot.position.set(M(-0.058), M(LID + 0.0012), M(0.0135)); group.add(slot); }
    // 放水的龙头和接水的铜盆（k < 0：水往外放）
    const tapG = new THREE.Group(); group.add(tapG); tapG.visible = false;          // 假如水往外放：学生第一次让 k < 0 时才装上
    const tapS = spout(V3(TAP[0] * 0.92, FL + 0.14, TAP[1] * 0.92), V3(TAP[0] * 1.55, FL + 0.15, TAP[1] * 1.55)), tapTip = tapS.tip; for (const m of tapS.parts) tapG.add(m);
    { const P = [[0, 0], [0.7, 0], [0.9, 0.3], [1, 0.9], [1.04, 1], [0.95, 1], [0.86, 0.4], [0, 0.32]], R0 = 0.085, H0 = 0.05;
      const m = solid(new THREE.Mesh(new THREE.LatheGeometry(P.map(([a, b]) => new THREE.Vector2(M(a * R0), M(b * H0))), 40), bronze)); m.position.copy(tapTip).setY(M(FL)); tapG.add(m);
      const w = quiet(new THREE.Mesh(new THREE.CircleGeometry(M(R0 * 0.9), 32).rotateX(-Math.PI / 2), water)); w.position.copy(tapTip).setY(M(FL + H0 * 0.75)); tapG.add(w); }
    chans.push({ from: tapTip, toY: M(FL + 0.04), surf: -2, acc: 0, drops: [], out: true });
    // 铜表尺：竖在壶盖正中，十二条刻度等学生算出来才嵌上去（错金）
    const RW = 0.088, RT = 0.016, RL = RUL1 - RUL0;
    const ruler = solid(new THREE.Mesh(new THREE.BoxGeometry(M(RW), M(RL), M(RT)), lit({ map: bronzeTex, roughness: 0.3, metalness: 0.62, envMap: envTex }))); ruler.position.y = M((RUL0 + RUL1) / 2); group.add(ruler);
    { const cap = solid(new THREE.Mesh(new THREE.ConeGeometry(M(0.03), M(0.05), 4), bronze)); cap.position.y = M(RUL1 + 0.025); cap.rotation.y = Math.PI / 4; group.add(cap); }
    const RCW = 128, RCH = Math.round((128 * RL) / RW);
    const rcan = document.createElement('canvas'); rcan.width = RCW; rcan.height = RCH;
    const rtex = new THREE.CanvasTexture(rcan); rtex.colorSpace = THREE.SRGBColorSpace; rtex.anisotropy = 8;
    const face = quiet(new THREE.Mesh(new THREE.PlaneGeometry(M(RW), M(RL)), basic({ map: rtex, transparent: true, depthWrite: false }))); face.position.set(0, M((RUL0 + RUL1) / 2), M(RT / 2 + 0.0008)); face.renderOrder = 3; group.add(face);
    const rpy = (y) => (1 - (Y0 + y / 100 - RUL0) / RL) * RCH;          // 刻度 y（厘米）→ 尺面贴图的像素行
    function drawRuler(n, glow = -1) { const g = rcan.getContext('2d'); g.clearRect(0, 0, RCW, RCH);
      for (let i = 0; i < n; i++) { const yy = rpy(KF * i + BF), hot = i === glow, ink = hot ? '#fff3b8' : '#e7c66a';
        g.fillStyle = 'rgba(40,26,10,0.75)'; g.fillRect(4, yy - 5, RCW - 8, 10); g.fillStyle = ink; g.fillRect(6, yy - 3, RCW - 12, 6);
      }
      rtex.needsUpdate = true; }
    drawRuler(0);
    // 浮箭：一根木箭，顶上一片铜指针指着铜尺
    const arrowG = new THREE.Group(), arrowBody = new THREE.Group(); group.add(arrowG); arrowG.add(arrowBody);
    const knob = solid(new THREE.Mesh(new THREE.SphereGeometry(M(0.013), 12, 10), lit({ color: 0xc89c62, roughness: 0.6 })));
    { const rod = solid(new THREE.Mesh(new THREE.CylinderGeometry(M(0.009), M(0.009), M(0.75), 10), lit({ color: 0xc89c62, roughness: 0.6 }))); rod.position.y = -M(0.375); arrowBody.add(rod);
      const tab = solid(new THREE.Mesh(new THREE.BoxGeometry(M(0.062), M(0.009), M(0.006)), brass)); tab.position.set(M(0.031), 0, 0); arrowBody.add(tab);
      const tip = solid(new THREE.Mesh(new THREE.ConeGeometry(M(0.009), M(0.022), 4), brass)); tip.rotation.z = -Math.PI / 2; tip.position.set(M(0.07), 0, 0); arrowBody.add(tip);
      knob.position.y = M(0.008); arrowBody.add(knob); }
    arrowG.position.set(M(-0.058), wy(0), M(0.0135));
    // 水滴、水纹
    const threadMat = new THREE.MeshStandardMaterial({ color: 0xf2faff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.6, emissive: 0xcfe9f5, emissiveIntensity: 0.18, envMap: envTex, depthWrite: false });
    for (const c of chans) { const th = quiet(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 8, 1, true), threadMat)); th.position.set(c.from.x, (c.from.y + c.toY) / 2, c.from.z); th.scale.set(M(0.004), c.from.y - c.toY, M(0.004)); th.renderOrder = 2; th.visible = false; group.add(th); c.thread = th; }
    const dropGeo = new THREE.SphereGeometry(1, 8, 6), dropMat = new THREE.MeshStandardMaterial({ color: 0xeef8ff, roughness: 0.05, transparent: true, opacity: 0.85, emissive: 0xbfe4f2, emissiveIntensity: 0.25 });
    const drops = new THREE.InstancedMesh(dropGeo, dropMat, 160); drops.count = 0; drops.frustumCulled = false; quiet(drops); group.add(drops);
    const rings = [];
    const ring = (x, y, z) => { const m = quiet(new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 32).rotateX(-Math.PI / 2), basic({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }))); m.position.set(x, y + M(0.002), z); m.userData.born = now(); group.add(m); rings.push(m); };
    // 框住整件模型（含上面写式子的地方）：看不见的盒子，取景用
    { const x0 = -1.12, x1 = 1.46, y1 = 2.36, z0 = -0.7, z1 = 0.42, pr = new THREE.Mesh(new THREE.BoxGeometry(M(x1 - x0), M(y1), M(z1 - z0)), basic({ transparent: true, opacity: 0, depthWrite: false })); pr.position.set(M((x0 + x1) / 2), M(y1 / 2), M((z0 + z1) / 2)); pr.raycast = () => {}; group.add(pr); }

    // ================= 数学：竖着的坐标平面，过铜尺的前面；铜尺就是 y 轴 =================
    const Z = M(RT / 2 + 0.0045);
    const prof = (stops) => { const t = tex(64, 4, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); for (const [o, a] of stops) gr.addColorStop(o, `rgba(255,255,255,${a})`); g.fillStyle = gr; g.fillRect(0, 0, w, h); }); t.colorSpace = THREE.NoColorSpace; return t; };
    const crispTex = prof([[0, 0], [0.16, 0.55], [0.3, 1], [0.7, 1], [0.84, 0.55], [1, 0]]);
    const glowTex = prof([[0, 0], [0.15, 0.06], [0.3, 0.22], [0.42, 0.62], [0.5, 1], [0.58, 0.62], [0.7, 0.22], [0.85, 0.06], [1, 0]]);
    const G2W = (p) => [wx(p[0]), wy(p[1])], MW = (p) => [M(p[0]), M(p[1])];
    // 竖着的笔画：pts 默认是坐标 (x, y)；map = MW 时是米
    const strip = (pts, hw, dash = 0, map = G2W) => { const pos = [], uv = []; let acc = 0;
      const push = (a, b, n) => { pos.push(a[0] + n[0], a[1] + n[1], 0, a[0] - n[0], a[1] - n[1], 0, b[0] + n[0], b[1] + n[1], 0, b[0] + n[0], b[1] + n[1], 0, a[0] - n[0], a[1] - n[1], 0, b[0] - n[0], b[1] - n[1], 0); uv.push(0, 0.5, 1, 0.5, 0, 0.5, 0, 0.5, 1, 0.5, 1, 0.5); };
      const P = pts.map(map);
      for (let i = 0; i < P.length - 1; i++) { const a = P[i], b = P[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); if (l < 1e-9) continue; const n = [(-dy / l) * hw, (dx / l) * hw];
        if (!dash) push(a, b, n); else { let t = 0; while (t < l - 1e-9) { const ph = (acc + t) % (dash * 2), on = ph < dash, st = Math.max(1e-7, Math.min(l - t, on ? dash - ph : dash * 2 - ph)); if (on) push([a[0] + (dx * t) / l, a[1] + (dy * t) / l], [a[0] + (dx * (t + st)) / l, a[1] + (dy * (t + st)) / l], n); t += st; } acc += l; } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return g; };
    const lineMeshes = [];
    // 发光的笔画：实芯 + 叠加的光晕 + 底下一层淡淡的暗影（3Blue1Brown 那样）；w、dash 以米计
    const gline = (color, w, { glow = 0.55, shadow = 0.25, dash = 0, z = Z, order = 10, op = 1, map = G2W } = {}) => {
      const mk = (mp, col, o, blend, ord, zz) => { const m = quiet(new THREE.Mesh(new THREE.BufferGeometry(), basic({ color: col, map: mp, transparent: true, opacity: o, depthWrite: false, blending: blend, side: THREE.DoubleSide }))); m.position.z = zz; m.renderOrder = ord; m.visible = false; group.add(m); return m; };
      const L = { core: mk(crispTex, color, op, THREE.NormalBlending, order + 2, z + 0.0002), glow: glow ? mk(glowTex, color, glow, THREE.AdditiveBlending, order + 1, z + 0.0001) : null, shade: shadow ? mk(glowTex, 0x000000, shadow, THREE.NormalBlending, order, z - 0.0002) : null, w, dash, pts: null, op, glowOp: glow, shadeOp: shadow, anim: null, map };
      L.set = (pts) => { L.pts = pts; if (L.anim) return; L._draw(pts); };
      L._draw = (pts) => { for (const [m, k, d] of [[L.core, 1, dash], [L.glow, 4.5, 0], [L.shade, 2.6, 0]]) { if (!m) continue; if (!pts || pts.length < 2) { m.visible = false; continue; } m.geometry.dispose(); m.geometry = strip(pts, M(w * k) / 2, d ? M(d) : 0, L.map); m.visible = true; } };
      L.hide = () => { L.pts = null; L.anim = null; L._draw(null); };
      L.draw = (pts, dur = 0.7, delay = 0) => { L.pts = pts; L.anim = { t0: now() + delay, dur }; L._draw(null); };          // 自己画出来（3Blue1Brown 的 Create）
      L.fade = (k) => { L.core.material.opacity = L.op * k; if (L.glow) L.glow.material.opacity = L.glowOp * k; if (L.shade) L.shade.material.opacity = L.shadeOp * k; };
      lineMeshes.push(L); return L; };
    const partial = (pts, k) => { if (k >= 1) return pts; let tot = 0; for (let i = 1; i < pts.length; i++) tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); let want = tot * k; const out = [pts[0]]; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (want >= l) { out.push(pts[i]); want -= l; } else { const t = l ? want / l : 0; out.push([lerp(pts[i - 1][0], pts[i][0], t), lerp(pts[i - 1][1], pts[i][1], t)]); break; } } return out; };
    // 箭头（以米计算，横竖比例不一样也不歪）
    const headGeo = new THREE.BufferGeometry(); headGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -1, 0.5, 0, -1, -0.5, 0], 3));
    const arrow = (color, w = 0.009) => { const L = gline(color, w, { glow: 0.5, shadow: 0.2, map: MW, order: 12 }); const hd = quiet(new THREE.Mesh(headGeo, basic({ color, transparent: true, depthWrite: false, side: THREE.DoubleSide }))); hd.renderOrder = 15; hd.visible = false; group.add(hd);
      L.to = (p, q) => { const a = g2m(...p), b = g2m(...q), d = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d < 0.012) { L.hide(); hd.visible = false; return; } const u = [(b[0] - a[0]) / d, (b[1] - a[1]) / d], hl = Math.min(0.026, d * 0.45); L.set([a, [b[0] - u[0] * hl * 0.8, b[1] - u[1] * hl * 0.8]]); hd.position.set(M(b[0]), M(b[1]), Z + 0.0004); hd.rotation.z = Math.atan2(u[1], u[0]); hd.scale.setScalar(M(hl)); hd.visible = true; };
      L.off = () => { L.hide(); hd.visible = false; }; return L; };
    // 坐标格：淡白的格线、亮一点的坐标轴（y 轴就画在铜尺正中）
    for (let x = 1; x <= 12; x++) gline(0xe8f2ff, 0.005, { glow: 0, shadow: 0.08, op: 0.3, order: 6 }).set([[x, YA], [x, YB]]);
    for (let y = -10; y <= YB; y += 10) if (y) gline(0xe8f2ff, 0.005, { glow: 0, shadow: 0.08, op: 0.3, order: 6 }).set([[XA, y], [XB, y]]);
    const axX = arrow(WHITE, 0.01), axY = arrow(WHITE, 0.01); axX.fade(0.92); axY.fade(0.92);
    axX.to([XA, 0], [XB + 0.35, 0]); axY.to([0, YA], [0, YB + 6]);

    // 字：斜体衬线（像课本、像 LaTeX），白字或者概念的颜色，底下垫一圈暗光
    const measure = (font, txt) => { const g = document.createElement('canvas').getContext('2d'); g.font = font; return g.measureText(txt).width; };
    const FONT = (px, it = true) => `${it ? 'italic ' : ''}500 ${px}px "Times New Roman","Songti SC",serif`;
    const richTex = (segs, px = 64) => { const parts = segs.map(([x, c, it = true]) => { const f = FONT(px, it); return { s: x, c, f, w: measure(f, x) }; }); const W = parts.reduce((a, q) => a + q.w, 0);
      return tex(Math.ceil(W) + 48, Math.round(px * 1.55), (g, w, h) => { let x = 24; g.textBaseline = 'middle'; g.lineJoin = 'round';
        for (const q of parts) { g.font = q.f; g.shadowColor = 'rgba(8,16,24,0.85)'; g.shadowBlur = px * 0.22; g.lineWidth = px * 0.16; g.strokeStyle = 'rgba(10,20,30,0.55)'; g.strokeText(q.s, x, h / 2 + 2); g.shadowBlur = 0; g.fillStyle = q.c; g.fillText(q.s, x, h / 2 + 2); x += q.w; } }); };
    const label = (hgt, order = 30) => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }))); sp.renderOrder = order; sp.userData.h = hgt; sp.userData.k = ''; sp.visible = false; group.add(sp); return sp; };
    const setRich = (sp, segs, p, anchor = 0.5) => { if (!segs) { sp.visible = false; return; } const key = JSON.stringify(segs); if (sp.userData.k !== key) { sp.userData.k = key; const t = richTex(segs); sp.material.map?.dispose?.(); sp.material.map = t; sp.material.needsUpdate = true; const hh = sp.userData.h; sp.userData.w = (hh * t.image.width) / t.image.height; sp.scale.set(sp.userData.w, hh, 1); } sp.position.set(wx(p[0]) + sp.userData.w * (0.5 - anchor), wy(p[1]), Z + 0.002); sp.visible = true; };
    const TICK = 'rgba(255,255,255,0.86)';
    for (let x = 1; x <= 12; x++) setRich(label(M(0.064), 20), [[String(x), TICK, false]], [x, -5.6]);
    const yTicks = []; for (let y = 10; y <= 60; y += 10) { const sp = label(M(0.064), 20); setRich(sp, [[String(y), TICK, false]], [-0.85, y], 1); yTicks.push(sp); }
    setRich(label(M(0.07), 20), [['x', CSS.w], ['/时辰', 'rgba(255,255,255,0.82)', false]], [XB + 0.1, -5.8], 0.15);
    setRich(label(M(0.07), 20), [['y', CSS.w], ['/cm', 'rgba(255,255,255,0.82)', false]], [0.45, YB + 6], 0);
    setRich(label(M(0.064), 20), [['O', 'rgba(255,255,255,0.9)']], [-0.82, -5.2], 1);
    // 发光的点
    const dotTex = (col) => tex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.16, 'rgba(255,255,255,1)'); gr.addColorStop(0.24, col); gr.addColorStop(0.36, col.replace('1)', '0.55)')); gr.addColorStop(1, col.replace('1)', '0)')); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    const ringTex = (col) => tex(128, 128, (g) => { g.strokeStyle = 'rgba(10,16,24,0.55)'; g.lineWidth = 16; g.beginPath(); g.arc(64, 64, 40, 0, 6.3); g.stroke(); g.strokeStyle = col; g.lineWidth = 9; g.beginPath(); g.arc(64, 64, 40, 0, 6.3); g.stroke(); });
    const sprite = (map, size, order = 28) => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthTest: false, depthWrite: false }))); sp.scale.setScalar(size); sp.renderOrder = order; sp.visible = false; group.add(sp); sp.at = (p) => { sp.position.set(wx(p[0]), wy(p[1]), Z + 0.0025); sp.visible = true; }; return sp; };
    const dTex = { g: dotTex('rgba(255,200,61,1)'), b: dotTex('rgba(88,196,221,1)'), t: dotTex('rgba(92,208,179,1)'), w: dotTex('rgba(235,240,245,1)'), r: dotTex('rgba(252,98,85,1)') };
    // 重拍：从那一点迸出一圈短短的光线（3Blue1Brown 的 Flash），按米算，是正圆
    const flashes = [];
    const flash = (p, color = GOLD, r0 = 0.03, r1 = 0.09) => { const rays = Array.from({ length: 12 }, () => gline(color, 0.007, { glow: 0.6, shadow: 0, order: 16, map: MW })); flashes.push({ p: g2m(...p), rays, t0: now(), r0, r1 }); };

    // ================= 数学的东西 =================
    const main = gline(GOLD, 0.023, { glow: 0.55, shadow: 0.26, order: 12 });                              // 这条直线（主角）
    const ghost = gline(WHITE, 0.01, { glow: 0.16, shadow: 0.2, dash: 0.03, op: 0.9, order: 9 });           // 原来的直线 y = kx（课本里的虚线）
    const stH = Array.from({ length: 12 }, () => gline(WHITE, 0.0075, { glow: 0.14, shadow: 0.18, op: 0.9, order: 10 }));   // 台阶：横着走一个时辰
    const stV = Array.from({ length: 12 }, () => gline(BLUE, 0.012, { glow: 0.45, shadow: 0.2, order: 11 }));                // 台阶：竖着升 k
    const corner = Array.from({ length: 13 }, () => sprite(dTex.w, M(0.042), 26));
    const nowDot = sprite(dTex.g, M(0.06), 29), tDot = sprite(dTex.w, M(0.05), 29), bDot = sprite(dTex.t, M(0.056), 29), kDot = sprite(dTex.b, M(0.056), 29);
    const tRing = sprite(ringTex('rgba(255,255,255,0.95)'), M(0.06), 28);
    const dropV = gline(WHITE, 0.0045, { glow: 0, shadow: 0.14, dash: 0.016, op: 0.75, order: 9 }), dropH = gline(WHITE, 0.0045, { glow: 0, shadow: 0.14, dash: 0.016, op: 0.75, order: 9 });
    const shift = [arrow(TEAL), arrow(TEAL)];
    const trails = Array.from({ length: 12 }, () => { const L = gline(GOLD, 0.011, { glow: 0.35, shadow: 0, order: 8 }); L.born = -9; return L; }); let trailI = 0, trailKey = null;
    const obsRing = OBS.map(() => sprite(ringTex('rgba(252,98,85,1)'), M(0.07), 27)), obsDot = OBS.map(() => sprite(dTex.r, M(0.034), 28));
    const rays = Array.from({ length: 12 }, () => gline(GOLD, 0.011, { glow: 0.7, shadow: 0.12, order: 14 }));
    const NAMES = Array.from(SHI, () => label(M(0.05), 24));          // 刻好以后：尺左边的十二时辰
    const EQ = label(M(0.09), 32), L1 = label(M(0.056)), LK = label(M(0.058)), LB = label(M(0.058)), LO = OBS.map(() => label(M(0.058)));
    // 这次计时最迟到次日子时，也可能先遇到空壶或模型的最高水位。
    const endTime = (k, b) => k < 0 ? Math.min(12, -b / k) : k > 0 ? Math.min(12, (YB - b) / k) : 12;
    const clipLine = (k, b) => {
      const end = endTime(k, b);
      return k !== 0 && end > 0 ? [[0, b], [end, clamp(k * end + b, 0, YB)]] : null;
    };
    const inWin = (y) => y >= 0 && y <= YB;
    const nextDay = label(M(0.054));
    // ================= 此刻那一句：印在台基前沿的石头上 =================
    const front = outline.filter(([x, v]) => v < -0.24 && x > -0.9 && x < 1.12).sort((a, b) => a[0] - b[0]);
    const CY0 = 0.035, CY1 = FL - 0.03;
    const capGeo = new THREE.BufferGeometry(); let CAPW = 0;
    { const pts = front.map(([x, v], i) => { const a = front[Math.max(0, i - 1)], b = front[Math.min(front.length - 1, i + 1)], tx = b[0] - a[0], tv = b[1] - a[1], l = Math.hypot(tx, tv) || 1; return [x + (tv / l) * 0.032, v - (tx / l) * 0.032]; });
      for (let i = 1; i < pts.length; i++) CAPW += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      const pos = [], uv = [], idx = []; let acc = 0;
      pts.forEach(([x, v], i) => { if (i) acc += Math.hypot(x - pts[i - 1][0], v - pts[i - 1][1]); pos.push(M(x), M(CY0), M(-v), M(x), M(CY1), M(-v)); uv.push(acc / CAPW, 0, acc / CAPW, 1); if (i) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); } });
      capGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); capGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); capGeo.setIndex(idx); }
    const capMesh = quiet(new THREE.Mesh(capGeo, basic({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }))); capMesh.renderOrder = 4; capMesh.visible = false; group.add(capMesh);
    const CW = 2048, CH = Math.round((2048 * (CY1 - CY0)) / CAPW);
    const capTex = (big, small) => tex(CW, CH, (g, w, h) => {
      const FF = (px, wt) => `${wt} ${px}px "Times New Roman","Songti SC","STSong",serif`;
      const fit = (txt, px, wt) => { let f = Math.round(px); g.font = FF(f, wt); while (f > 10 && g.measureText(txt).width > w * 0.84) { f -= 2; g.font = FF(f, wt); } return f; };
      const p1 = fit(big, h * 0.34, 600), p2 = small ? fit(small, h * 0.2, 500) : 0;
      g.font = FF(p1, 600); const w1 = g.measureText(big).width; g.font = FF(p2, 500); const w2 = small ? g.measureText(small).width : 0; const tot = Math.max(w1, w2), x0 = (w - tot) / 2;
      const band = g.createLinearGradient(x0 - h * 0.6, 0, x0 + tot + h * 0.6, 0); band.addColorStop(0, 'rgba(40,30,18,0)'); band.addColorStop(0.08, 'rgba(40,30,18,0.52)'); band.addColorStop(0.92, 'rgba(40,30,18,0.52)'); band.addColorStop(1, 'rgba(40,30,18,0)');
      g.fillStyle = band; g.fillRect(x0 - h * 0.6, h * 0.08, tot + h * 1.2, h * 0.84);
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = FF(p1, 600); g.fillStyle = '#fbf2de'; g.fillText(big, w / 2, small ? h * 0.38 : h * 0.5); if (small) { g.font = FF(p2, 500); g.fillStyle = '#ece1ca'; g.fillText(small, w / 2, h * 0.73); } });
    const cap = { key: '', born: -9, out: 1e9, next: null };
    function caption(big, small = '') { const key = big + '|' + small; if (key === cap.key) return; cap.key = key; S_.cap = [big, small];
      const show = () => { capMesh.material.map?.dispose?.(); capMesh.material.map = capTex(big, small); capMesh.material.needsUpdate = true; capMesh.visible = true; cap.born = now(); cap.out = 1e9; };
      if (capMesh.visible && now() - cap.born > 0.2) { cap.out = now(); cap.next = show; } else show(); }
    const prompt = (txt) => { S_.ask = txt; if (ui?.status) ui.status(txt); };

    // ================= 板书 =================
    const css = document.createElement('style');
    css.textContent = `
.yc-board{margin:4px 0 6px;display:flex;flex-direction:column;gap:8px;font:15px/1.7 "Kaiti SC","STKaiti","Songti SC",serif;color:#2b2722}
.yc-board .yb-row{opacity:0;transform:translateY(5px);transition:opacity .5s,transform .5s,background-color 2.4s;padding:3px 8px 3px 6px;border-radius:5px;border-left:3px solid transparent}
.yc-board .yb-row.in{opacity:1;transform:none}
.yc-board .yb-row.fresh{background:rgba(255,206,110,.34);border-left-color:#d98a2b}
.yc-board .n{display:inline-block;min-width:1.25em;color:#b0532a;font-weight:700}
.yc-board b{color:#8a2f1d}
.yc-board i{font-family:"Times New Roman",serif;font-style:italic;letter-spacing:.02em}
.yc-board .g{color:#c98600;font-weight:600}.yc-board .b{color:#2589b0;font-weight:600}.yc-board .t{color:#1a9a82;font-weight:600}.yc-board .r{color:#d4402f;font-weight:600}
.yc-board .sys{display:inline-flex;flex-direction:column;vertical-align:middle;line-height:1.35;border-left:1.5px solid currentColor;border-radius:7px 0 0 7px;padding:0 4px 0 7px;margin:0 3px}
.yc-board .yb-h{font:600 12px/1.3 "PingFang SC","Hiragino Sans GB",sans-serif;color:#a07a45;letter-spacing:.3em;margin:6px 0 -4px;opacity:0;transition:opacity .4s}
.yc-board .yb-h.in{opacity:1}
.yc-board.review .yb-row[data-k]{cursor:pointer}.yc-board.review .yb-row[data-k]:hover{background:rgba(255,206,110,.16)}
.yc-board .yb-row.sel{background:rgba(255,206,110,.34);border-left-color:#d98a2b}`;
    document.head.append(css);
    let boardEl = null, lastH = ''; const rows = [];
    const reveal = (r) => { const body = boardEl?.closest('.p-body'); if (!body) return; setTimeout(() => { const rb = r.getBoundingClientRect(), bb = body.getBoundingClientRect(); if (rb.bottom > bb.bottom - 14) body.scrollBy({ top: rb.bottom - bb.bottom + 28, behavior: 'smooth' }); }, 80); };
    const board = (html, key = '') => { const r = document.createElement('div'); r.className = 'yb-row'; r.innerHTML = html; r.dataset.k = key; rows.push(r); for (const o of rows) o.classList?.remove('fresh'); if (boardEl) { boardEl.append(r); requestAnimationFrame(() => { r.classList.add('in', 'fresh'); reveal(r); }); } return r; };
    board.h = (title) => { if (title === lastH) return; lastH = title; const r = document.createElement('div'); r.className = 'yb-h'; r.textContent = title; rows.push(r); if (boardEl) { boardEl.append(r); requestAnimationFrame(() => { r.classList.add('in'); reveal(r); }); } };
    const I = (s) => `<i>${s}</i>`;

    // ================= 状态 =================
    const fresh = () => ({ step: 'run', t: 0, k: K0, b: 0, held: '', maxT: -1, stairN: 0, lineOn: false, eqOn: false, ghost: false, shiftOn: false, bOn: false, kOn: false, obs: false, hitObs: [false, false], marks: 0, glowMark: -1, kNeg: false, kTouched: false, k0: K0, asked: false, done: false, cap: ['', ''], ask: '', stepAt: 0, hint: 0, moved: -9, goT: null, auto: false, rayAt: -9, pose: '' });
    let S_ = fresh(), runId = 0;
    const later = (ms, fn) => { const id = runId; setTimeout(() => { if (!dead && id === runId) fn(); }, ms); };
    const yOf = (x) => S_.k * x + S_.b;
    // 一时辰内就会放空时，取半程的点调斜率，让蓝点与空壶时的白点分开。
    const sampleTime = () => { const end = endTime(S_.k, S_.b); return end > 0 && end < 1 ? end / 2 : 1; };
    const eqSegs = () => { const { k, b } = S_, out = [['y', CSS.w], [' = ', CSS.w, false]]; if (k === 0) { out.push([num(b), CSS.t, false]); return out; } if (k === -1) out.push(['−', CSS.b, false]); else if (k !== 1) out.push([num(k), CSS.b, false]); out.push(['x', CSS.w]); if (b) out.push([b > 0 ? ' + ' : ' − ', CSS.t, false], [num(Math.abs(b)), CSS.t, false]); return out; };

    let staticKey = '';
    function layout() {
      const { k, b } = S_, end = endTime(k, b);
      S_.t = clamp(S_.t, 0, end);
      const t = S_.t, yN = clamp(yOf(t), 0, YB);
      const key = [k, b, S_.lineOn, S_.ghost, S_.stairN, S_.maxT].join('|');
      if (key !== staticKey) {
        staticKey = key;
        main.set(S_.lineOn ? clipLine(k, b) : null);
        ghost.set(S_.ghost && b !== 0 ? clipLine(k, 0) : null);
        for (let i = 0; i < 12; i++) {
          const on = i < S_.stairN && i + 1 <= end && k !== 0;
          stH[i].set(on ? [[i, yOf(i)], [i + 1, yOf(i)]] : null);
          stV[i].set(on ? [[i + 1, yOf(i)], [i + 1, yOf(i + 1)]] : null);
        }
        for (let i = 0; i <= 12; i++) {
          if (i <= end && i <= S_.stairN && (S_.lineOn || i <= S_.maxT)) corner[i].at([i, yOf(i)]);
          else corner[i].visible = false;
        }
      }
      // 第一级台阶上写 1 和 k
      const j = S_.kOn ? 0 : 2, ya = yOf(j), yb2 = yOf(j + 1);
      if (S_.stairN > j && inWin(ya) && inWin(yb2) && S_.step !== 'wow' && S_.marks < 12) { setRich(L1, [['1', CSS.w, false]], [j + 0.5, ya + (k >= 0 ? -4.4 : 4.4)]); setRich(LK, S_.kOn || S_.step === 'fit' ? [['k', CSS.b], [' = ', CSS.b, false], [num(k), CSS.b, false]] : [[num(k), CSS.b, false]], [j + 1.2, (ya + yb2) / 2], 0); }
      else { setRich(L1, null); setRich(LK, null); }
      // 现在：时间在 x 轴上（白点），浮箭的高度在直线上（金点），两条虚线连到两根轴
      tDot.at([t, 0]); tRing.at([t, 0]);
      if (inWin(yN) && (S_.lineOn || S_.maxT >= 0 || t > 0)) { nowDot.at([t, yN]); dropV.set(Math.abs(yN) > 0.6 ? [[t, 0], [t, yN]] : null); dropH.set(t > 0.25 ? [[0, yN], [t, yN]] : null); }
      else { nowDot.visible = false; dropV.hide(); dropH.hide(); }
      // 子时的浮箭（青点）、一个时辰后（蓝点）
      if (S_.bOn && inWin(b)) bDot.at([0, b]); else bDot.visible = false;
      if (S_.kOn) kDot.at([sampleTime(), Math.max(0, yOf(sampleTime()))]); else kDot.visible = false;
      setRich(LB, S_.bOn && b !== 0 && inWin(b) && S_.marks < 12 ? [['b', CSS.t], [' = ', CSS.t, false], [num(b), CSS.t, false]] : null, [-0.85, b], 1);
      for (const sp of yTicks) sp.visible = !(S_.bOn && b !== 0 && Math.abs(Number(sp.userData.k.match(/"(\d+)"/)?.[1] || 0) - b) < 5);
      // 平移：几支一样长的青色箭头，从 y = kx 指到 y = kx + b
      shift.forEach((ar, i) => { const x = [4, 8][i], y0 = k * x; if (S_.shiftOn && Math.abs(b) >= 2 && inWin(y0) && inWin(y0 + b)) ar.to([x, y0], [x, y0 + b]); else ar.off(); });
      // 这座钟的两次读数
      OBS.forEach((p, i) => { if (S_.obs) { obsRing[i].at(p); obsDot[i].at(p); obsRing[i].material.color.setHex(S_.hitObs[i] ? GOLD : 0xffffff); setRich(LO[i], [['(', CSS.w, false], [String(p[0]), CSS.w, false], [', ', CSS.w, false], [String(p[1]), CSS.r, false], [')', CSS.w, false]], [p[0] + 0.45, p[1] + (i ? 4.6 : -4.6)], 0); } else { obsRing[i].visible = obsDot[i].visible = false; setRich(LO[i], null); } });
      setRich(EQ, S_.eqOn ? eqSegs() : null, [7.6, YB + 12]);
      // 浮箭：指着铜尺上 y 的高度
      arrowG.position.y = wy(yN);
      // 刻好以后：浮箭指到哪个时辰
      { const cur = S_.marks >= 12 && S_.step !== 'wow' ? Math.floor(t) : -1;          // 刻好以后：尺左边的十二时辰，浮箭指到的那个亮一点
        NAMES.forEach((sp, i) => { const on = i < S_.marks; if (!on) { sp.visible = false; return; } const hot = i === cur || i === S_.glowMark; sp.userData.h = M(hot ? 0.058 : 0.046); setRich(sp, [[SHI[i], hot ? '#fff0b0' : '#e8c36a', false]], [-0.92, KF * i + BF + 0.4], 1); }); }
      setRich(nextDay, t === 12 ? [['次日子时', CSS.w, false]] : null, [11.7, yN + 5], 1);
      if (S_.marks >= 12) for (const sp of yTicks) sp.visible = false;
    }
    function trailSnap() { const L = trails[trailI++ % trails.length], c = clipLine(S_.k, S_.b); if (!c) return; L.set(c); L.born = now(); }
    const goT = (t1, dur = 0.8) => { S_.goT = { t0: now(), from: S_.t, to: t1, dur }; };

    // ================= 一课的主线 =================
    function lineSeen() {          // 重拍 1：点连成一条过原点的直线
      S_.step = 'line'; S_.lineOn = true; S_.eqOn = true; S_.stairN = 12; main.draw(clipLine(S_.k, S_.b), 0.9); flash([0, 0], GOLD); sfx.ding(1180, { gain: 0.06 });
      caption('这些点在一条直线上：y = 5x', '每个时辰都升高 5 cm：正比例函数的图象是一条经过原点的直线');
      board.h('探究'); board(`<span class="n">1</span>子时壶是空的，每个时辰浮箭升高 <span class="b">5</span> cm，${I('x')} 个时辰升高 5${I('x')} cm：${I('y')} = <span class="b">5</span>${I('x')}。正比例函数 ${I('y')} = ${I('kx')}（${I('k')} 是常数，${I('k')} ≠ 0）的图象是一条经过原点的直线，我们称它为直线 ${I('y')} = ${I('kx')}`, 'line');
      later(2600, () => { S_.step = 'b'; S_.bOn = true; S_.ghost = true; S_.shiftOn = true; S_.stepAt = now(); S_.hint = 0; goT(3); trailKey = null;
        caption('子时壶里要是已经有水呢？', '把子时的浮箭往上拖'); prompt('子时壶里先有些水：把子时的浮箭（青点）往上拖，直线会怎样？'); layout(); });
    }
    function bDone() {          // 重拍 2：整条直线平移 b
      S_.step = 'b-done'; flash([0, S_.b], TEAL); for (const x of [4, 8]) flash([x, S_.k * x + S_.b], TEAL, 0.02, 0.06); sfx.ding(1250, { gain: 0.06 });
      const up = S_.b > 0;
      caption(`每一点都${up ? '升高' : '降低'}了 ${num(Math.abs(S_.b))} cm：直线 y = 5x 向${up ? '上' : '下'}平移了`, 'y = kx + b 的图象，可以由直线 y = kx 平移 |b| 个单位长度得到');
      board(`<span class="n">2</span>子时壶里已有 <span class="t">${I('b')}</span> cm：${I('y')} = 5${I('x')} <span class="t">+ ${I('b')}</span>，同一时刻都比 ${I('y')} = 5${I('x')} 高 <span class="t">${I('b')}</span>。一次函数 ${I('y')} = ${I('kx')} + ${I('b')}（${I('k')} ≠ 0）的图象可以由直线 ${I('y')} = ${I('kx')} 平移 |${I('b')}| 个单位长度得到（当 ${I('b')} &gt; 0 时，向上平移；当 ${I('b')} &lt; 0 时，向下平移）。一次函数 ${I('y')} = ${I('kx')} + ${I('b')}（${I('k')} ≠ 0）的图象也是一条直线，我们称它为直线 ${I('y')} = ${I('kx')} + ${I('b')}`, 'b');
      later(2800, () => { S_.step = 'k'; S_.kOn = true; S_.ghost = false; S_.shiftOn = false; S_.stepAt = now(); S_.hint = 0; S_.k0 = S_.k; goT(2); trailKey = null;
        caption('滴得快一点、慢一点呢？', '拖一个时辰后的那一点：k 是每个时辰升高多少'); prompt('滴得快慢不同：拖一个时辰后的那一点（蓝点），直线会怎样？'); layout(); });
    }
    function kDone() {          // 重拍 3：k 的正负管上升还是下降
      S_.step = 'k-done'; flash([0, S_.b], BLUE); if (inWin(yOf(1))) flash([1, yOf(1)], BLUE, 0.02, 0.06); sfx.ding(1320, { gain: 0.06 });
      caption('k > 0，从左向右上升；k < 0，从左向右下降', 'x 每增大 1，y 就变化 k：k 管直线的倾斜程度');
      board(`<span class="n">3</span>${I('x')} 每增大 1，${I('y')} 就增加 <span class="b">${I('k')}</span>（${I('k')} &lt; 0 时是减少：水往外放）。当 ${I('k')} &gt; 0 时，直线 ${I('y')} = ${I('kx')} + ${I('b')} 从左向右上升；当 ${I('k')} &lt; 0 时，直线 ${I('y')} = ${I('kx')} + ${I('b')} 从左向右下降。一次函数 ${I('y')} = ${I('kx')} + ${I('b')}（${I('k')}，${I('b')} 是常数，${I('k')} ≠ 0）具有如下性质：当 ${I('k')} &gt; 0 时，${I('y')} 随 ${I('x')} 的增大而增大；当 ${I('k')} &lt; 0 时，${I('y')} 随 ${I('x')} 的增大而减小`, 'k');
      later(3000, () => { S_.step = 'fit'; S_.obs = true; S_.stepAt = now(); S_.hint = 0; for (const [i, p] of OBS.entries()) later(i * 260, () => flash(p, RED, 0.02, 0.06));
        caption('假设卯时读数是 19 cm，申时是 44 cm', '让直线经过这两点：k、b 各是多少？'); prompt('卯时在子时后 3 个时辰，申时在子时后 8 个时辰：让直线经过 (3, 19) 和 (8, 44)'); checkFit(); layout(); });
    }
    function checkFit() {
      if (S_.step !== 'fit') return;
      const hit = OBS.map(([x, y]) => S_.k * x + S_.b === y);
      hit.forEach((h, i) => { if (h && !S_.hitObs[i]) { flash(OBS[i], GOLD, 0.02, 0.06); sfx.clink({ freq: 1500 + i * 300, gain: 0.04 }); } });
      S_.hitObs = hit;
      if (hit[0] && hit[1]) fitDone();
    }
    function fitDone() {          // 待定系数法：两个条件定出 k 和 b
      S_.step = 'fit-done'; S_.held = ''; sfx.ding(1400, { gain: 0.06 });
      caption('5 个时辰升了 25 cm，每个时辰升 5 cm', '从卯时到申时，44 − 19 = 25，8 − 3 = 5');
      board.h('待定系数法'); board(`<span class="n">4</span>设 ${I('y')} = <span class="b">${I('k')}</span>${I('x')} + <span class="t">${I('b')}</span>，图象过 (3, 19) 与 (8, 44)：<span class="sys"><span>3${I('k')} + ${I('b')} = 19</span><span>8${I('k')} + ${I('b')} = 44</span></span>。5 个时辰升了 25 cm，每个时辰升 5 cm。`, 'fit');
      later(2400, () => {
        caption('从卯时退回 3 个时辰', '19 − 3 × 5 = 4，子时读数是 4 cm');
        board('从卯时退回 3 个时辰，19 − 3 × 5 = 4，子时读数是 4 cm。', 'fit');
      });
      later(4800, () => {
        caption('方程组的解是 k = 5，b = 4', '浮箭的高度 y = 5x + 4');
        board(`方程组的解是 <span class="b">${I('k')} = 5</span>，<span class="t">${I('b')} = 4</span>，${I('y')} = 5${I('x')} + 4。先设出函数解析式，再根据条件确定解析式中未知的系数，从而得出函数解析式的方法，叫作待定系数法`, 'fit');
      });
      later(6800, engrave);
    }
    const NOTE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26];
    function engrave() {          // 一下子：十二道光从直线上每个时辰的点平射到铜尺上，嵌出十二条刻度
      S_.step = 'wow'; S_.rayAt = now(); S_.obs = false; layout();
      for (let i = 0; i < 12; i++) { const y = KF * i + BF; later(i * 120, () => rays[i].draw([[i, y], [0, y]], 0.32)); later(i * 120 + 330, () => { S_.marks = i + 1; S_.glowMark = i; drawRuler(i + 1, i); flash([0, y], GOLD, 0.015, 0.05); sfx.ding(523.25 * Math.pow(2, NOTE[i] / 12), { gain: 0.045, decay: 0.7 }); if (i === 11) later(500, () => { S_.glowMark = -1; drawRuler(12); }); layout(); }); }
      later(12 * 120 + 900, finish);
    }
    function finish() {
      S_.step = 'end'; S_.done = true; boardEl?.classList.add('review'); S_.auto = true; S_.autoAt = now(); S_.autoFrom = 0; S_.t = 0;
      caption('答：从 4 cm 起，每隔 5 cm 刻一个时辰', '相邻时辰的刻线相距 5 cm');
      board.h('答'); board(`<b>答</b>：浮箭的高度 ${I('y')} = 5${I('x')} + 4。子时刻在 <span class="t">4 cm</span> 处，往上每隔 <span class="b">5 cm</span> 刻一个时辰：丑 9、寅 14、卯 19……亥 59 cm。相邻时辰的刻线相距 5 cm`, 'ans');
      prompt(''); ui?.unlock?.(); layout();
      later(2600, () => { ui?.go?.(2); ui?.fold?.(false); });          // 一课结束：翻到“对照课本原文”
    }
    // 讲完以后点板书：场景摆回那一刻
    function pose(key) {
      S_.pose = key; S_.auto = key === 'ans'; S_.autoAt = now(); S_.autoFrom = 0; S_.goT = null; for (const L of rays) L.hide();
      const base = { lineOn: true, eqOn: true, stairN: 12, ghost: false, shiftOn: false, bOn: false, kOn: false, obs: false, hitObs: [false, false] };
      if (key === 'line') Object.assign(S_, base, { k: K0, b: 0, t: 4 });
      if (key === 'b') Object.assign(S_, base, { k: K0, b: 15, t: 0, ghost: true, shiftOn: true, bOn: true });
      if (key === 'k') Object.assign(S_, base, { k: -4, b: 40, t: 2, bOn: true, kOn: true });
      if (key === 'fit') Object.assign(S_, base, { k: KF, b: BF, t: 3, bOn: true, kOn: true, obs: true, hitObs: [true, true] });
      if (key === 'ans') Object.assign(S_, base, { k: KF, b: BF, t: 0 });
      S_.marks = key === 'ans' ? 12 : 0; S_.glowMark = -1; drawRuler(S_.marks);
      for (const L of trails) { L.hide(); L.born = -9; }
      if (key === 'k') { for (const kk of [12, 6, 2]) { S_.k = kk; trailSnap(); } S_.k = -4; }
      if (key === 'b') { for (const bb of [0, 5, 10]) { S_.b = bb; trailSnap(); } S_.b = 15; }
      const CAP = { line: ['这些点在一条直线上：y = 5x', '每个时辰都升高 5 cm：正比例函数的图象是一条经过原点的直线'], b: ['每一点都升高了 15 cm：直线 y = 5x 向上平移了', 'y = kx + b 的图象，可以由直线 y = kx 平移 |b| 个单位长度得到'], k: ['k > 0，从左向右上升；k < 0，从左向右下降', 'x 每增大 1，y 就变化 k：k 管直线的倾斜程度'], fit: ['k = 5，b = 4：y = 5x + 4', '两点确定一条直线：两个条件，定出 k 和 b'], ans: ['答：从 4 cm 起，每隔 5 cm 刻一个时辰', '相邻时辰的刻线相距 5 cm'] };
      caption(...(CAP[key] || CAP.ans)); flash([0, S_.b], key === 'b' ? TEAL : key === 'k' ? BLUE : GOLD, 0.02, 0.06); layout();
    }

    // ================= 动手 =================
    const toG = (p) => [p.x / S / SX, (p.y / S - Y0) * 100];
    const canT = () => S_.step !== 'wow' && S_.step !== 'fit-done';
    const canB = () => S_.bOn && ['b', 'k', 'fit'].includes(S_.step);
    const canK = () => S_.kOn && ['k', 'fit'].includes(S_.step);
    function ask0() { if (S_.asked) return; S_.asked = true; board.h('问题'); board(`铜尺上的十二时辰该刻在哪儿？假设卯时（子时后 3 个时辰）浮箭在 <span class="r">19</span> cm，申时（子时后 8 个时辰）在 <span class="r">44</span> cm`, 'ans'); }
    function tDown() { if (!canT()) return false; S_.held = 't'; S_.goT = null; S_.auto = false; ask0(); if (S_.step === 'run' && S_.maxT < 0) { S_.maxT = 0; caption('先看最简单的：子时壶里是空的', '拖着时间往前走，看浮箭每个时辰升多少'); } return true; }
    function tMove(g) {
      if (S_.held !== 't') return; const t = clamp(g[0], 0, endTime(S_.k, S_.b)); if (Math.abs(t - S_.t) < 1e-6) return;
      S_.t = t; S_.moved = now();
      if (S_.step === 'run') { const n = Math.floor(t + 1e-6); if (n > S_.maxT) { for (let i = S_.maxT + 1; i <= n; i++) if (i > 0) sfx.clink({ freq: 1100 + i * 90, gain: 0.025 }); S_.maxT = n; S_.stairN = Math.max(S_.stairN, n); } if (S_.maxT >= 4 && !S_.lineOn) { layout(); lineSeen(); return; } }
      layout();
    }
    function tUp() { if (S_.held === 't') S_.held = ''; }
    function bDown() { if (!canB()) return false; S_.held = 'b'; return true; }
    function bMove(g) {
      if (S_.held !== 'b') return; const b = clamp(Math.round(g[1]), 0, 40); if (b === S_.b) return;
      S_.b = b; S_.moved = now();
      if (trailKey === null || Math.abs(b - trailKey) >= 4) { trailKey = b; if (S_.step === 'b') trailSnap(); }
      layout(); checkFit();
    }
    function bUp() { if (S_.held !== 'b') return; S_.held = ''; if (S_.step === 'b' && Math.abs(S_.b) >= 6) bDone(); }
    let kSample = 1;
    function kDown() { if (!canK()) return false; kSample = sampleTime(); S_.held = 'k'; return true; }
    function kMove(g) {
      if (S_.held !== 'k') return; const k = clamp(Math.round((g[1] - S_.b) / kSample), -12, 16); if (k === S_.k) return;
      S_.k = k; S_.moved = now(); S_.kTouched = true; if (k < 0) S_.kNeg = true;
      if (trailKey === null || Math.abs(k - trailKey) >= 2) { trailKey = k; if (S_.step === 'k') trailSnap(); }
      if (k === 0) caption('k = 0：浮箭不动了', '一次函数 y = kx + b 要求 k ≠ 0');
      else if (S_.cap[0].startsWith('k = 0')) { if (S_.step === 'k') caption('滴得快一点、慢一点呢？', '拖一个时辰后的那一点：k 是每个时辰升高多少'); else if (S_.step === 'fit') caption('假设卯时读数是 19 cm，申时是 44 cm', '让直线经过这两点：k、b 各是多少？'); }
      layout(); checkFit();
    }
    function kUp() { if (S_.held !== 'k') return; S_.held = ''; if (S_.step === 'k' && S_.kNeg && S_.k !== 0) kDone(); }
    const pick = (r) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), basic({ visible: false })); m.userData.pick = true; m.userData.noFrame = true; group.add(m); return m; };
    const tPick = pick(M(0.05)), bPick = pick(M(0.036)), kPick = pick(M(0.036));
    // Grab anywhere on the exposed shaft or brass pointer. The graph's zero-hour
    // handle remains available too. Measure the change from the grab height.
    const arrowPick = new THREE.Group(), stemPick = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), basic({ visible: false }));
    const headPick = new THREE.Mesh(new THREE.BoxGeometry(M(0.10), M(0.032), M(0.035)), stemPick.material);
    headPick.position.x = M(0.031);
    headPick.userData.pick = stemPick.userData.pick = true;
    arrowPick.userData.noFrame = true;
    arrowPick.add(stemPick, headPick); arrowG.add(arrowPick);
    let grabB = 0;
    const drags = [
      { obj: arrowPick, cueTarget: bDot, cueAlternate: bPick, plane: 'xy', offset: arrowG.position.z, enabled: canB,
        hint: () => canB() ? '把子时的浮箭往上拖' : '',
        cueText: () => S_.step === 'fit' ? '上下拖：子时壶里先有多少水' : '把子时的浮箭往上拖',
        onStart: p => { if (p && bDown()) grabB = S_.b - toG(p)[1]; },
        onDrag: p => bMove([0, toG(p)[1] + grabB]), onEnd: bUp },
      { obj: tPick, cueTarget: tDot, plane: 'xy', offset: Z, hint: () => (canT() ? '拖着时间走' : ''), enabled: canT, onStart: () => tDown(), onDrag: (p) => tMove(toG(p)), onEnd: () => tUp() },
      { obj: bPick, plane: 'xy', offset: Z, hint: () => (canB() ? '上下拖：子时壶里先有多少水' : ''), enabled: canB, onStart: () => bDown(), onDrag: (p) => bMove(toG(p)), onEnd: () => bUp() },
      { obj: kPick, cueTarget: kDot, plane: 'xy', offset: Z, hint: () => (canK() ? '上下拖蓝点，改变每个时辰的水位变化量' : ''), enabled: canK, onStart: () => kDown(), onDrag: (p) => kMove(toG(p)), onEnd: () => kUp() },
    ];
    const dragApi = draggable(group, drags, { onClick: () => false, tip: tag?.('', 'pill') });
    let heard = false;
    const pointer = { down: (r, e) => { if (!heard) { heard = true; audio(); } return dragApi.down(r, e); }, move: (r, e) => dragApi.move(r, e), up: (r, e) => dragApi.up(r, e), items: dragApi.items };
    function opening() { caption('用这件文物做一个匀速模型', '假设卯时读数是 19 cm，申时是 44 cm'); prompt('拖着时间走，浮箭每个时辰升多少？'); }
    const cue = mathActionCue(camera, pointer, dragApi, () => {
      if (S_.step === 'run') return tPick;
      if (S_.step === 'b') return arrowPick;
      if (S_.step === 'k') return kPick;
      if (S_.step === 'fit') return S_.k === KF ? arrowPick : kPick;
    });
    function reset() { cue.reset(); runId++; S_ = fresh(); trailKey = null; for (const L of trails) { L.hide(); L.born = -9; } for (const L of rays) L.hide(); main.hide(); drawRuler(0); rows.length = 0; lastH = ''; if (boardEl) { boardEl.innerHTML = ''; boardEl.classList.remove('review'); } cap.key = ''; ui?.relock?.(); ui?.go?.(1); opening(); layout(); }
    const onKey = (e) => { if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !e.target?.closest?.('input,textarea')) reset(); };
    addEventListener('keydown', onKey);

    layout();
    const EL = 0.2, DIRV = [0, Math.sin(EL), Math.cos(EL)];
    let last = now();
    const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3();
    return {
      group: root, card: false, place: 'spread', scale: 0.95,
      size: { w: M(2.8), d: M(1.6), h: M(2.56) },
      view: { elev: 11, azim: 0, lookY: 0.45, frameMargin: 1.0 },
      pointer: cue.pointer,
      mount(u) { ui = u; boardEl = document.createElement('div'); boardEl.className = 'yc-board' + (S_.done ? ' review' : ''); u.controls?.append(boardEl);
        boardEl.addEventListener('click', (e) => { const r = e.target.closest?.('.yb-row'); if (!S_.done || !r?.dataset.k) return; for (const o of rows) o.classList?.remove('sel', 'fresh'); r.classList.add('sel'); sfx.clink({ freq: 1200, gain: 0.03 }); pose(r.dataset.k); });
        for (const r of rows) { boardEl.append(r); r.classList.add('in'); }
        ui.go?.(1); if (!cap.key) opening(); else if (S_.ask) ui.status?.(S_.ask);
        requestAnimationFrame(() => aim?.(DIRV)); setTimeout(() => { if (!dead) aim?.(DIRV); }, 700); },
      dispose() { cue.dispose(); dead = true; runId++; removeEventListener('keydown', onKey); css.remove(); },
      update() {
        const t = now(), dt = Math.min(0.05, t - last); last = t; uT.value = t;
        flowTex.offset.x -= dt * 0.02; flowTex.offset.y += dt * 0.012;
        // 时间自己走（换段的时候、讲完以后）
        if (S_.goT) { const g = S_.goT, k = clamp((t - g.t0) / g.dur, 0, 1); S_.t = lerp(g.from, g.to, easeOut(k)); if (k >= 1) S_.goT = null; layout(); }
        else if (S_.auto && !S_.held) { S_.t = ((t - S_.autoAt) * 0.6 + S_.autoFrom) % 12; layout(); }
        // 滴水：快慢跟着 k；k < 0 时受水壶脚边的龙头往外放水
        { const k = S_.k, depth = yOf(S_.t), rate = k > 0 && depth < YB - 1e-8 ? 2.2 * (k / K0) : 0, outRate = k < 0 && depth > 1e-8 ? 2.6 * (-k / K0) : 0; let n = 0;
          tapG.visible = S_.kNeg || k < 0;
          for (const c of chans) { const r = c.out ? outRate : rate; if (!r) { c.drops.length = 0; c.acc = 0; } c.thread.visible = r > 0.05 && (!c.out || tapG.visible); if (c.thread.visible) { const w = M(0.0018 + 0.0016 * Math.sqrt(r / 2.2)); c.thread.scale.x = c.thread.scale.z = w; } c.acc += dt * r; while (c.acc >= 1) { c.acc -= 1; if (c.drops.length < 24) c.drops.push({ y: c.from.y, v: 0, s: 0.8 + Math.random() * 0.4 }); }
            for (let i = c.drops.length - 1; i >= 0; i--) { const d = c.drops[i]; d.v += M(2.4) * dt; d.y -= d.v * dt; if (d.y <= c.toY) { if (c.surf >= 0) ring(c.from.x, c.toY, c.from.z); if (c.out) ring(c.from.x, c.toY + M(0.0), c.from.z); c.drops.splice(i, 1); continue; }
              if (n < 160) { pv.set(c.from.x, d.y, c.from.z); sv.set(M(0.0085) * d.s, M(0.014) * d.s, M(0.0085) * d.s); m4.compose(pv, q0, sv); drops.setMatrixAt(n++, m4); } } }
          drops.count = n; drops.instanceMatrix.needsUpdate = true; }
        for (let i = rings.length - 1; i >= 0; i--) { const m = rings[i], age = t - m.userData.born; if (age > 0.9) { group.remove(m); m.geometry.dispose(); m.material.dispose(); rings.splice(i, 1); continue; } m.scale.setScalar(M(0.01 + age * 0.07)); m.material.opacity = 0.55 * (1 - age / 0.9); }
        // 自己画出来的笔画
        for (const L of lineMeshes) if (L.anim) { if (t < L.anim.t0) continue; const k = clamp((t - L.anim.t0) / L.anim.dur, 0, 1), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; L._draw(L.pts ? partial(L.pts, e) : null); if (k >= 1) { L.anim = null; L._draw(L.pts); } }
        // 拖的时候留下的一族直线：慢慢淡掉
        for (const L of trails) { if (!L.pts || L.born < 0) continue; const age = t - L.born; L.fade(clamp(0.5 * (1 - age / 2.4), 0, 0.5)); if (age > 2.4) L.hide(); }
        // 十二道光：射完以后慢慢收掉
        if (S_.rayAt > 0) { const age = t - S_.rayAt - 12 * 0.12 - 0.6; const k = clamp(1 - age / 1.6, 0, 1); for (const L of rays) if (L.pts && !L.anim) L.fade(k); if (k <= 0) { for (const L of rays) L.hide(); S_.rayAt = -9; } }
        // 闪光
        for (let i = flashes.length - 1; i >= 0; i--) { const F = flashes[i], k = clamp((t - F.t0) / 0.55, 0, 1), e = easeOut(k); F.rays.forEach((L, j) => { const th = (j / F.rays.length) * Math.PI * 2 + 0.2, ra = lerp(F.r0, F.r1, e), rb = lerp(F.r0, F.r1, Math.min(1, e * 0.55 + 0.1)); L.set([[F.p[0] + Math.cos(th) * rb, F.p[1] + Math.sin(th) * rb], [F.p[0] + Math.cos(th) * ra, F.p[1] + Math.sin(th) * ra]]); L.fade(1 - k); });
          if (k >= 1) { for (const L of F.rays) { L.hide(); for (const m of [L.core, L.glow, L.shade]) if (m) { group.remove(m); m.geometry.dispose(); m.material.dispose(); } lineMeshes.splice(lineMeshes.indexOf(L), 1); } flashes.splice(i, 1); } }
        // 此刻那一句：淡进淡出
        if (cap.out < 1e9) { const k = clamp(1 - (t - cap.out) / 0.35, 0, 1); capMesh.material.opacity = k; if (k <= 0) { cap.out = 1e9; const nx = cap.next; cap.next = null; nx?.(); } } else capMesh.material.opacity = clamp((t - cap.born) / 0.5, 0, 1);
        tPick.position.set(wx(S_.t), wy(0), Z); bPick.position.set(wx(0), wy(S_.b), Z); kPick.position.copy(kDot.position); kPick.position.z = Z;
        const exposed = Math.min(M(0.75), Math.max(0, arrowG.position.y - M(LID)));
        stemPick.scale.set(M(0.035), exposed, M(0.035)); stemPick.position.y = -exposed / 2;
        arrowPick.visible = canB();
        bPick.visible = canB(); kPick.visible = canK();
        // 卡住很久才给提示（不拦着人）
        if (!S_.held && !S_.done && S_.hint < 1 && t - S_.stepAt > 15 && t - S_.moved > 4) {
          const H1 = { run: ['时间往右拖：每过一个时辰，浮箭升多少？', '拖过 4 个时辰看看'], b: ['子时的浮箭是青色的点', '往上拖：壶里先多些水，直线跟着怎么动？'], k: ['k 变成负数会怎样？', '把蓝点往下拖过青点那一层：水往外放'], fit: ['两点之间：横着差几个时辰？竖着差几厘米？', '先让直线一样斜，再上下挪'] }[S_.step];
          if (H1) { S_.hint = 1; caption(...H1); } }
        cue.update(S_.step);
      },
      debug: {
        get S() { return S_; }, rows, pose, cap: () => S_.cap,
        labels: () => [EQ, L1, LK, LB, ...LO, ...NAMES],
        qa: [
          { name: '拖着时间走过 5 个时辰', run: () => { tDown(); for (let i = 1; i <= 25; i++) tMove([i * 0.2, 0]); tUp(); }, wait: 3.4 },
          { name: '子时的浮箭往上拖', run: () => { bDown(); for (let i = 1; i <= 15; i++) bMove([0, i]); bUp(); }, wait: 3.6 },
          { name: '一个时辰后的点往下拖成负的', run: () => { kDown(); for (let i = 1; i <= 10; i++) kMove([1, S_.b + K0 - i]); kUp(); }, wait: 3.8 },
          { name: '让直线经过两点', run: () => { bDown(); bMove([0, BF]); bUp(); kDown(); kMove([kSample, BF + KF * kSample]); kUp(); }, wait: 10.5 },
        ],
      },
    };
  },
};
