// 高中地理 选择性必修1 第二章第一节 塑造地表形态的力量 · 岩石圈的物质循环（课本第 22–24 页，图 2.7、2.8、2.9、图 2.10 岩石圈物质循环示意、思考）。
//
// 一个问题（课本思考）：有人说岩浆岩“浴火而生”、沉积岩由沉积物压实固结、变质岩“由老变新”；也有人说一类岩石是由另一类岩石转化来的。怎么理解？
// 课本的图就是模型：图 2.10 那几块地块合成一块切开的地壳——左边地下有岩浆房、上面一座火山；右边一条河流进海，海底一层层沉积物；
// 深处靠近岩浆的地方高温高压。一块做了记号的岩石（一块小石头）就在这块地壳里。
// 学生亲手做的：
//   每一步自己挑“接下来它经历什么作用”——箭头依据课本图 2.10（沉积岩熔化是图上没画、正文第 24 页讲到的，循环图上画成虚线）：冷却凝固、抬升风化侵蚀搬运沉积、压实固结、变质作用、熔化。
//   石头就真的在地壳里走过去：从岩浆房升上来凝固成花岗岩、被抬到山顶风化成沙、顺着河流进海、埋下去压成砂岩、在深处未熔融时变质成石英岩、再熔化回岩浆……
//   侧栏是图 2.10 的循环图：走过的箭头亮起来，并记下这块石头的“履历”。走一圈，就会发现每一类岩石都可以变成另外两类。
//   也可以按“自动演示”：石头自己走——先从地下岩浆升上来、到地表风化、进海沉积、埋下去变质、再熔化回岩浆（一大圈），再把图 2.10 里其余箭头都走一遍；
//   循环图上一颗红点沿着正在发生的那根箭头走，和地块里的石头同步。随时可以暂停（走完当前这一步就停），停下后点任意一步就换成自己挑。
// 数据：kit/rock.js（tools/geo/rock_check.mjs 核对课本说法）。教学示意：竖直方向压缩了；各个过程的时间尺度差别很大，动画不按真实时间比例。
import * as THREE from 'three';
import { buttons, note } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { h } from '../ui/Panel.js';
import { airLabel, faceLabel, noteBadge } from './kit/labels.js';
import { KIND, ROCK, nexts, provenGraniteSand, TOUR, tourStep, EXTRA, NEW } from './kit/rock.js';

const XL = -0.19, XR = 0.19, ZD = 0.06, TOP = 0.085, SEA_X = 0.07, SEA_Y = 0.072;          // 地块；地面高度；海岸线在哪、海面多高
const ASK = '先猜一下（可以不猜）：一块花岗岩，最后有没有可能变成砂岩？';
const rnd = (() => { let s = 61; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// 地块里的几个地方（模型坐标，都在靠前的剖面上，看得见）
export const AT = { chamber: [-0.1, 0.012], intrusion: [-0.045, 0.045], lava: [-0.105, 0.112], peak: [-0.02, TOP + 0.022], shore: [SEA_X + 0.004, SEA_Y - 0.004], shallow: [SEA_X + 0.04, SEA_Y - 0.008], deep: [SEA_X + 0.085, SEA_Y - 0.012], buried: [SEA_X + 0.05, 0.048], meta: [0.03, 0.022] };
export const LOOK = { magma: { c: 0xff6a1f, e: 0xd84010 }, granite: { c: 0xd8b8a8, spot: true }, basalt: { c: 0x3c3c40, pore: true }, gravel: { c: 0x9a8a76, grain: 'gravel' }, sand: { c: 0xd8c08a, grain: 'sand' }, mud: { c: 0x8a7a66, grain: 'mud' }, shell: { c: 0xeae4d6, grain: 'shell' }, conglomerate: { c: 0x9a8a76, spot: true }, sandstone: { c: 0xd6b07a }, shale: { c: 0x6f6a66, band: true }, limestone: { c: 0xd9d3c4 }, slate: { c: 0x4a5560, band: true }, marble: { c: 0xf4f2ee }, gneiss: { c: 0xbcae9e, band: true }, quartzite: { c: 0xe8dcc8 }, metacong: { c: 0xa89a88, band: true } };
LOOK.metabas = { c: 0x607067 };
LOOK.lithsand = { c: 0x8b8170, grain: 'sand' }; LOOK.lithsandstone = { c: 0x8b8170 };
for (const id of ['carbgravel', 'carbsand', 'carbmud']) LOOK[id] = { c: 0xd9d3c4, grain: ROCK[id].grain };
for (const [id, r] of Object.entries(ROCK)) if (r.origin) LOOK[id] = { c: LOOK[r.origin].c };          // 再次变质不指定矿物纹理，只以颜色标识原岩来源


export default {
  id: 'rockcycle',
  fig: '图2.10',
  title: '岩石圈的物质循环',
  flow: 'explore',
  ask: '有人说岩浆岩“浴火而生”，沉积岩是沉积物压实固结来的，变质岩“由老变新”；也有人说一类岩石是由另一类岩石转化来的。这两种说法怎么理解？',
  need: '跟着一块岩石走，每一步自己挑它接下来经历什么，直到它回到岩浆；三类岩石都当过一次',
  conclusion: {
    page: 28,
    quote: '岩石按照成因可以分为岩浆岩、沉积岩和变质岩三大类，它们之间可以相互转换，使得岩石圈的物质处于循环转化中。……在地球内部巨大压力作用下，岩浆沿着岩石圈的薄弱地带侵入岩石圈上部或喷出地表，随着温度、压力的变化，冷却凝固形成岩浆岩（图2.7）。……裸露在地表的岩石，经风化、侵蚀作用，逐渐成为砾石、沙子、泥土等碎屑物质。这些碎屑物质被风、流水等搬运后沉积下来，经压实、固结形成沉积岩（图2.8）。……地壳中已生成的岩石，在地球内部的高温、高压等条件下，成分、性质发生改变，形成变质岩（图2.9）。……这三类岩石在岩石圈深处或岩石圈以下高温高压的条件下熔化，又成为新的岩浆回到地球内部。',
    why: '两种说法说的是同一件事的两面：第一种说的是每一类岩石是“怎么形成的”（成因）——岩浆冷却凝固、沉积物压实固结、已有的岩石在未熔融时主要以固态发生变质；第二种说的是“原料从哪来”——碎屑沉积物主要来自已有岩石的风化、侵蚀，有的沉积岩来自化学沉淀物或生物遗体（它们的物质也多来自岩石风化时溶进水里的成分），变质岩来自已有的岩石，岩浆来自适当温度、压力和挥发分条件下越过固相线的部分熔融；减压或加入水可促熔，不能理解为越压越容易熔化。所以三类岩石可以相互转化，岩石圈的物质一直在循环；地表形态的塑造过程，也就是这个循环的一部分。',
    src: '课本第 22–24 页 · 第二章 第一节 塑造地表形态的力量',
  },

  create({ tag }) {
    const group = new THREE.Group(), block = new THREE.Group(); group.add(block);
    const S = { id: 'magma', path: [{ id: 'magma' }], anim: null, kinds: new Set(['magma']), arrows: new Set(), guess: null, moved: false, auto: null };          // auto：自动演示 { i: 走到第几步, wait: 两步之间停多久, paused }
    let W = null;

    // ---- 地块：一整块切开的地壳（有前、后、两头，从哪个角度看都是实心的）。左边一座火山（锥体的中心正好在前面的剖面上，剖面把它切成两半），
    //      中间一道山岭，河从山岭流进右边的海；前面的剖面上画着岩层、岩浆房、侵入岩体、变质带和深处的高温 ----
    const VX = -0.105, RIV = (x) => -0.012 + 0.014 * Math.sin(x * 38 + 0.6);          // 火山口的 x；河道中线的 z
    const coastX = (z) => SEA_X + 0.009 * Math.sin((ZD - z) * 46) * sm(0, 0.03, ZD - z);          // 海岸线：前面的剖面上正好在 SEA_X，往后弯弯曲曲
    const H = (x, z) => {
      const r = Math.hypot(x - VX, (z - ZD) * 0.95), volc = 0.034 * Math.exp(-((r / 0.03) ** 2)) - 0.007 * Math.exp(-((r / 0.006) ** 2));          // 火山锥，顶上一个火山口
      const ridge = 0.022 * Math.exp(-(((x + 0.02) / 0.034) ** 2)) * (1 + 0.28 * (Math.sin(z * 46 + 1.2) - Math.sin(ZD * 46 + 1.2)));          // 山岭往后有高有低，前面剖面上的高度不变
      const cx = coastX(z);
      if (x >= cx) return SEA_Y - 0.02 - 0.008 * sm(cx, XR, x) + 0.0012 * Math.sin(x * 210 + z * 90) * sm(0, 0.02, ZD - z);          // 海底：往外更深
      const valley = x > -0.01 ? 0.0045 * Math.exp(-(((z - RIV(x)) / 0.008) ** 2)) * sm(-0.01, 0.01, x) : 0;          // 河谷
      const bump = 0.0016 * Math.sin(x * 140 + z * 60) * Math.sin(z * 90 - x * 30) * sm(0, 0.02, ZD - z);          // 地面的小起伏（前面的剖面上不加，和课本的轮廓一致）
      return TOP + volc + ridge - 0.012 * sm(cx - 0.05, cx, x) - valley + bump;
    };
    const ground = (x) => H(x, ZD);
    const NX = 220, NZ = 48;

    // 前面的剖面：一张大画布，按地质年代和成因分层
    const faceCv = document.createElement('canvas'); faceCv.width = 2048; faceCv.height = 768;
    const faceTex = new THREE.CanvasTexture(faceCv); faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 8;
    const PX = (x) => ((x - XL) / (XR - XL)) * faceCv.width, PY = (y) => faceCv.height - (y / 0.14) * faceCv.height, PXs = (dx) => (dx / (XR - XL)) * faceCv.width, PYs = (dy) => (dy / 0.14) * faceCv.height;
    const paintFace = () => {
      const g = faceCv.getContext('2d'), w = faceCv.width, hh = faceCv.height, R = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
      g.fillStyle = '#7a675a'; g.fillRect(0, 0, w, hh);          // 底下的老岩石（基底）
      const LAY = [['#cdb08a', 'sand'], ['#9a8676', 'shale'], ['#d6cdb8', 'lime'], ['#b89870', 'sand'], ['#8a7868', 'shale'], ['#c6b49a', 'lime']];
      const bed = (x, k) => { const fold = 0.006 * Math.exp(-(((x + 0.02) / 0.06) ** 2)); return 0.072 - k * 0.0075 + fold * (1 - k * 0.12) + 0.0012 * Math.sin(x * 60 + k); };          // 沉积岩层：在山岭下面被挤得拱起来一点
      for (let k = 0; k < 6; k++) {          // 从上往下画：每一层只盖住自己下面，留下上一层
        g.fillStyle = LAY[k][0]; g.beginPath(); g.moveTo(0, hh);
        for (let i = 0; i <= w; i += 4) { const x = XL + (i / w) * (XR - XL); g.lineTo(i, PY(k ? bed(x, k - 1) : Math.max(ground(x), bed(x, 0) + 0.0075))); }          // 最上面一层一直铺到地面
        g.lineTo(w, hh); g.fill();
      }
      g.fillStyle = '#7a675a'; g.beginPath(); g.moveTo(0, hh); for (let i = 0; i <= w; i += 4) { const x = XL + (i / w) * (XR - XL); g.lineTo(i, PY(bed(x, 5))); } g.lineTo(w, hh); g.fill();          // 沉积岩层下面的老岩石
      for (let k = 0; k < 6; k++) {          // 每一层的纹理：砂岩是点，页岩是细线，石灰岩是砖块
        const kind = LAY[k][1];
        for (let i = 0; i < w; i += kind === 'lime' ? 22 : 3) {
          const x = XL + (i / w) * (XR - XL), y0 = PY(k ? bed(x, k - 1) : bed(x, 0) + 0.0075), y1 = PY(bed(x, k));          // 第 k 层：上一层的底到这一层的底，填色、纹理、层面用同一套边界
          if (kind === 'sand') for (let n = 0; n < 2; n++) { g.fillStyle = `rgba(70,50,30,${0.15 + R() * 0.2})`; g.fillRect(i + R() * 3, y0 + R() * (y1 - y0), 1.6, 1.6); }
          else if (kind === 'shale' && i % 9 === 0) { g.strokeStyle = 'rgba(50,40,35,0.22)'; g.lineWidth = 1; for (let n = 1; n < 4; n++) { const yy = y0 + ((y1 - y0) * n) / 4; g.beginPath(); g.moveTo(i, yy); g.lineTo(i + 9, yy + 0.4); g.stroke(); } }
          else if (kind === 'lime') { g.strokeStyle = 'rgba(90,80,65,0.3)'; g.lineWidth = 1; const mid = (y0 + y1) / 2; g.beginPath(); g.moveTo(i, y0); g.lineTo(i, mid); g.moveTo(i + 11, mid); g.lineTo(i + 11, y1); g.moveTo(i, mid); g.lineTo(i + 22, mid); g.stroke(); }
        }
        g.strokeStyle = 'rgba(60,45,35,0.35)'; g.lineWidth = 1.2; g.beginPath(); for (let i = 0; i <= w; i += 4) { const x = XL + (i / w) * (XR - XL); g.lineTo(i, PY(bed(x, k))); } g.stroke();          // 层面
      }
      // 火山锥：一层层熔岩和火山灰（黑灰相间，顺着锥面）
      const base = (x) => ground(x) - Math.max(0, 0.034 * Math.exp(-(((x - VX) / 0.03) ** 2)) - 0.007 * Math.exp(-(((x - VX) / 0.006) ** 2))) + 0.0015;          // 火山堆起来以前的老地面：去掉火山锥那一截
      for (let k = 0; k < 7; k++) { g.fillStyle = k % 2 ? '#4a4440' : '#6a5f58'; g.beginPath(); for (let i = -60; i <= 60; i++) { const x = VX + i * 0.001; g.lineTo(PX(x), PY(Math.max(ground(x) - k * 0.0028, base(x)))); } for (let i = 60; i >= -60; i--) { const x = VX + i * 0.001; g.lineTo(PX(x), PY(base(x))); } g.fill(); }          // 只画在老地面以上的锥体里
      // 地面以上的部分最后擦掉；先画深处的东西
      const deep = g.createLinearGradient(0, hh, 0, PY(0.04)); deep.addColorStop(0, 'rgba(200,70,30,0.6)'); deep.addColorStop(1, 'rgba(200,70,30,0)'); g.fillStyle = deep; g.fillRect(0, 0, w, hh);          // 越往深处越热
      // 变质带：岩浆房、侵入岩体周围和深处，岩石被烤、被压，出现定向排列的纹理
      const aure = (cx, cy, rx, ry) => { const gr = g.createRadialGradient(cx, cy, Math.min(rx, ry) * 0.6, cx, cy, Math.max(rx, ry) * 1.25); gr.addColorStop(0, 'rgba(118,82,128,0.5)'); gr.addColorStop(1, 'rgba(118,82,128,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, rx * 1.25, ry * 1.25, 0, 0, 7); g.fill(); };
      aure(PX(AT.meta[0]), PY(AT.meta[1]), PXs(0.07), PYs(0.028)); aure(PX(AT.intrusion[0]), PY(AT.intrusion[1]), PXs(0.04), PYs(0.022));
      g.strokeStyle = 'rgba(70,45,80,0.35)'; g.lineWidth = 1.4;
      for (let k = 0; k < 9; k++) { g.beginPath(); for (let i = -110; i <= 110; i += 4) { const x = PX(AT.meta[0]) + i * 1.6, y = PY(AT.meta[1]) - 52 + k * 13 + 5 * Math.sin(i / 14 + k); g.lineTo(x, y); } g.stroke(); }          // 片理：一道道波状的纹
      // 岩浆房和通到火山口的通道：中心发亮
      const ch = [PX(AT.chamber[0]), PY(AT.chamber[1])], glow = g.createRadialGradient(ch[0], ch[1], 10, ch[0], ch[1], 230); glow.addColorStop(0, 'rgba(255,150,60,0.55)'); glow.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = glow; g.fillRect(0, 0, w, hh);
      const mg = g.createRadialGradient(ch[0], ch[1] - 10, 8, ch[0], ch[1], 150); mg.addColorStop(0, '#ffd36a'); mg.addColorStop(0.45, '#f07a2a'); mg.addColorStop(1, '#a8301a'); g.fillStyle = mg;
      g.beginPath(); g.ellipse(ch[0], ch[1], 150, 70, 0, 0, 7); g.fill();
      g.strokeStyle = '#d8582a'; g.lineCap = 'round'; g.lineWidth = 16; g.beginPath(); g.moveTo(ch[0], ch[1] - 50); g.bezierCurveTo(PX(VX + 0.004), PY(0.06), PX(VX - 0.003), PY(0.095), PX(VX), PY(ground(VX))); g.stroke();
      g.strokeStyle = '#ffb04a'; g.lineWidth = 5; g.stroke();          // 通道中间更亮
      g.strokeStyle = 'rgba(255,170,80,0.5)'; g.lineWidth = 3; for (const [dx, dy] of [[-0.03, 0.03], [0.022, 0.026], [-0.012, 0.04]]) { g.beginPath(); g.moveTo(ch[0], ch[1]); g.quadraticCurveTo(PX(AT.chamber[0] + dx * 0.6), PY(AT.chamber[1] + dy * 0.4), PX(AT.chamber[0] + dx), PY(AT.chamber[1] + dy)); g.stroke(); }          // 岩浆顺着裂隙往上钻
      // 侵入岩体（花岗岩）：浅色，带黑、白、粉的斑点
      const ip = [PX(AT.intrusion[0]), PY(AT.intrusion[1])]; g.save(); g.beginPath(); g.ellipse(ip[0], ip[1], 100, 48, 0.2, 0, 7); g.fillStyle = '#d9c4b6'; g.fill(); g.clip();
      for (let i = 0; i < 900; i++) { g.fillStyle = ['#2c2a2a', '#f6f0ea', '#c98a7a', '#9a8c84'][i % 4]; g.fillRect(ip[0] - 100 + R() * 200, ip[1] - 50 + R() * 100, 2 + R() * 4, 2 + R() * 3); }
      g.restore(); g.strokeStyle = 'rgba(60,45,40,0.6)'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(ip[0], ip[1], 100, 48, 0.2, 0, 7); g.stroke();
      for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(50,35,25,${R() * 0.1})`; g.fillRect(R() * w, R() * hh, 2, 2); }          // 颗粒感
      // 地表一道土层；地面以上透明
      for (let i = 0; i <= w; i += 1) { const x = XL + (i / w) * (XR - XL), top = PY(ground(x)); g.fillStyle = x < SEA_X ? '#5e4632' : '#8a7a60'; g.fillRect(i, top, 1, x < SEA_X ? 7 : 4); g.clearRect(i, 0, 1, top); }
      faceTex.needsUpdate = true;
    };
    // 两头和后面：普通的层状岩石
    const strata = canvasTex(512, 256, (g, w, hh) => {
      const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#c4a882'); gr.addColorStop(0.55, '#a08670'); gr.addColorStop(1, '#7a675a'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
      for (let k = 0; k < 16; k++) { g.strokeStyle = `rgba(60,45,35,${0.1 + Math.random() * 0.14})`; g.lineWidth = 1 + Math.random() * 2.5; g.beginPath(); const y0 = (k / 16) * hh * 0.6; for (let x = 0; x <= w; x += 16) g.lineTo(x, y0 + Math.sin(x / 70 + k) * 3); g.stroke(); }
      for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(50,35,25,${Math.random() * 0.16})`; g.fillRect(Math.random() * w, Math.random() * hh, 2, 2); }
      const deep = g.createLinearGradient(0, hh, 0, hh * 0.6); deep.addColorStop(0, 'rgba(190,70,40,0.45)'); deep.addColorStop(1, 'rgba(190,70,40,0)'); g.fillStyle = deep; g.fillRect(0, 0, w, hh);
    });
    const strip = (pts, flip) => {          // 一条竖着的墙：pts = [[x, z], ...]，从 0 到地面
      const P = [], U = [], I = []; let s = 0;
      pts.forEach(([x, z], i) => { if (i) s += Math.hypot(x - pts[i - 1][0], z - pts[i - 1][1]); const y = H(x, z); P.push(x, y, z, x, 0, z); U.push(s / (XR - XL), y / 0.14, s / (XR - XL), 0); if (i) { const a = 2 * i - 2; flip ? I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) : I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } });
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); geo.setIndex(I); geo.computeVertexNormals(); return geo;
    };
    const line = (fx, n) => Array.from({ length: n + 1 }, (_, i) => fx(i / n));
    const front = new THREE.Mesh(strip(line((u) => [XL + (XR - XL) * u, ZD], NX)), new THREE.MeshLambertMaterial({ map: faceTex, side: THREE.DoubleSide })); block.add(front);
    const sideM = new THREE.MeshLambertMaterial({ map: strata, side: THREE.DoubleSide });
    block.add(new THREE.Mesh(strip(line((u) => [XL + (XR - XL) * u, -ZD], NX), true), sideM));
    for (const x of [XL, XR]) block.add(new THREE.Mesh(strip(line((u) => [x, -ZD + 2 * ZD * u], NZ)), sideM));
    // 顶面：按地方上色——火山上是黑色的熔岩和火山灰，山岭和平原长着草和树，海边是沙滩，海底近岸是沙、远一点是泥
    const topGeo = new THREE.PlaneGeometry(XR - XL, 2 * ZD, NX, NZ); topGeo.rotateX(-Math.PI / 2);
    const tCol = new Float32Array(topGeo.attributes.position.count * 3); topGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
    {
      const p = topGeo.attributes.position, c = new THREE.Color(), c2 = new THREE.Color();
      for (let k = 0; k < p.count; k++) {
        const x = p.getX(k), z = p.getZ(k), y = H(x, z); p.setY(k, y);
        const r = Math.hypot(x - VX, (z - ZD) * 0.95), cx = coastX(z), n = 0.5 + 0.5 * Math.sin(x * 520 + z * 330) * Math.sin(z * 410 - x * 150);
        const fx = x - VX, fz = z - ZD, along = fx * -0.45 + fz * -0.89, across = Math.abs(fx * 0.89 - fz * 0.45), flow = along > 0.003 && along < 0.05 ? Math.exp(-((across / (0.003 + along * 0.12)) ** 2)) * (1 - sm(0.04, 0.05, along)) : 0;          // 一道冷下来的熔岩流：从火山口翻出来，顺着后坡一路往下
        if (x >= cx) c.setHex(0xcdb98e).lerp(c2.setHex(0x8a7c68), sm(cx + 0.005, cx + 0.06, x));          // 海底：近岸沙，远处泥
        else if (r < 0.007) c.setHex(0x3a2a24);          // 火山口
        else if (r < 0.032) c.setHex(0x5a5048).lerp(c2.setHex(0x7a7a58), sm(0.022, 0.032, r));          // 火山锥：火山灰、熔岩
        else if (x > cx - 0.008) c.setHex(0xdcc79a);          // 沙滩
        else c.setHex(0x7fa45a).lerp(c2.setHex(0x9aa86a), n * 0.6).lerp(c2.setHex(0x8a8a64), sm(TOP + 0.012, TOP + 0.024, y));          // 草地；山岭高处偏黄褐
        if (flow > 0.05) c.lerp(c2.setHex(0x2e2a2a), Math.min(1, flow));
        c.multiplyScalar(0.92 + 0.12 * n); tCol.set([c.r, c.g, c.b], k * 3);
      }
      topGeo.computeVertexNormals();
    }
    const grain = canvasTex(256, 256, (g, w) => { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, w); for (let i = 0; i < 2600; i++) { const v = 150 + Math.random() * 100; g.fillStyle = `rgba(${v},${v},${v},${0.2 + Math.random() * 0.35})`; g.fillRect(Math.random() * w, Math.random() * w, 1.6, 1.6); } }, { repeat: [8, 3] });
    block.add(new THREE.Mesh(topGeo, new THREE.MeshLambertMaterial({ vertexColors: true, map: grain })));
    // 火山口里的熔岩：发着光
    const lavaPool = new THREE.Mesh(new THREE.CircleGeometry(0.0055, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0xff7a2a })); lavaPool.rotation.x = -Math.PI / 2; lavaPool.position.set(VX, H(VX, ZD - 0.001) + 0.0015, ZD - 0.0002); lavaPool.raycast = () => {}; block.add(lavaPool);
    // 海：一整块透明的水，前面的剖面上也看得见水和水下的沉积物
    const seaM = new THREE.MeshPhongMaterial({ color: 0x4f93c8, transparent: true, opacity: 0.5, depthWrite: false, shininess: 80, specular: 0x9fc4e4, side: THREE.DoubleSide });
    const seaTop = new THREE.Mesh(new THREE.PlaneGeometry(XR - SEA_X + 0.02, 2 * ZD, 60, 24), seaM); seaTop.geometry.rotateX(-Math.PI / 2); seaTop.position.set((SEA_X - 0.02 + XR) / 2, SEA_Y, 0); seaTop.renderOrder = 4; block.add(seaTop);
    const seaBase = seaTop.geometry.attributes.position.array.slice();
    const waterWall = (pts) => { const P = []; pts.forEach(([x, z], i) => { if (!i) return; const [x0, z0] = pts[i - 1], a = H(x0, z0), b = H(x, z); P.push(x0, SEA_Y, z0, x0, a, z0, x, b, z, x0, SEA_Y, z0, x, b, z, x, SEA_Y, z); }); const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, seaM); m.renderOrder = 4; m.raycast = () => {}; block.add(m); };
    waterWall(line((u) => [SEA_X + (XR - SEA_X) * u, ZD + 0.0004], 40)); waterWall(line((u) => [coastX(-ZD) + (XR - coastX(-ZD)) * u, -ZD - 0.0004], 40)); waterWall(line((u) => [XR + 0.0004, -ZD + 2 * ZD * u], 24));
    seaTop.raycast = () => {};
    // 海岸的浪花：一条白线
    const foam = new THREE.Line(new THREE.BufferGeometry().setFromPoints(line((u) => { const z = -ZD + 2 * ZD * u; return new THREE.Vector3(coastX(z) + 0.0012, SEA_Y + 0.0004, z); }, 60)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })); foam.raycast = () => {}; block.add(foam);
    // 河：一条贴着河谷的水带，从山岭流进海
    {
      const P = [], I = [], N = 80, x0 = -0.008, x1 = coastX(RIV(SEA_X)) + 0.002;
      for (let i = 0; i <= N; i++) { const x = x0 + ((x1 - x0) * i) / N, z = RIV(x), wdt = 0.0016 + 0.0026 * (i / N), y = Math.max(H(x, z) + 0.0012, SEA_Y + 0.0003); for (const s of [-1, 1]) P.push(x, y, z + s * wdt); if (i) { const a = 2 * i - 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }          // 河面是平的（两岸一样高），到河口和海面接上，不顺着海底往下走
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setIndex(I); geo.computeVertexNormals();
      const river = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x4f94cc, side: THREE.DoubleSide })); river.raycast = () => {}; block.add(river);
    }
    // 树：山岭和平原上长着阔叶树，山岭高处是针叶树；火山上、沙滩上、河里不长
    {
      const crown = new THREE.SphereGeometry(0.0026, 7, 5).translate(0, 0.0045, 0), trunk = new THREE.CylinderGeometry(0.0004, 0.0005, 0.0026, 5).translate(0, 0.0013, 0), cone = new THREE.ConeGeometry(0.002, 0.0068, 6).translate(0, 0.0046, 0);
      const mergeTree = (a, b) => { const g2 = new THREE.BufferGeometry(), A = a.toNonIndexed(), B = b.toNonIndexed(), pa = A.attributes.position.array, pb = B.attributes.position.array, P = new Float32Array(pa.length + pb.length); P.set(pa); P.set(pb, pa.length); g2.setAttribute('position', new THREE.BufferAttribute(P, 3)); const C = new Float32Array(P.length); for (let i = 0; i < pa.length; i += 3) C.set([1, 1, 1], i); for (let i = pa.length; i < P.length; i += 3) C.set([0.55, 0.4, 0.3], i); g2.setAttribute('color', new THREE.BufferAttribute(C, 3)); g2.computeVertexNormals(); return g2; };          // 树冠白色（按实例上色）、树干棕色
      const kinds = { broad: mergeTree(crown, trunk), conifer: mergeTree(cone, trunk) }, MAXT = 900, R = (() => { let s = 29; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
      const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3(), col = new THREE.Color();
      for (const [k, geo] of Object.entries(kinds)) {
        const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }), MAXT); mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXT * 3), 3); mesh.count = 0; mesh.raycast = () => {}; block.add(mesh);
        for (let i = 0; i < 6000 && mesh.count < MAXT; i++) {
          const x = XL + 0.004 + R() * (XR - XL - 0.008), z = -ZD + 0.004 + R() * (2 * ZD - 0.012), y = H(x, z), r = Math.hypot(x - VX, (z - ZD) * 0.95);
          if (x > coastX(z) - 0.012 || r < 0.042 || (x > -0.012 && Math.abs(z - RIV(x)) < 0.007)) continue;
          const high = y > TOP + 0.012, want = k === 'conifer' ? high : !high; if (!want || R() > (k === 'conifer' ? 0.7 : 0.55)) continue;
          const s = 0.8 + R() * 0.5; pv.set(x, y - 0.0003, z); qq.setFromAxisAngle(new THREE.Vector3(0, 1, 0), R() * 6.28); sv.set(s, s, s); m4.compose(pv, qq, sv); mesh.setMatrixAt(mesh.count, m4);
          col.setHex(k === 'conifer' ? 0x2e6238 : 0x3f8a3a).multiplyScalar(0.82 + R() * 0.32); mesh.setColorAt(mesh.count, col); mesh.count++;
        }
        mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
      }
    }
    // 火山口的烟
    const smokeTex = canvasTex(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const CRATER = new THREE.Vector3(VX, H(VX, ZD - 0.004), ZD - 0.006);
    const smoke = Array.from({ length: 10 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: 0x9a9690, transparent: true, depthWrite: false, opacity: 0.5 })); s.userData.t = i / 10; s.raycast = () => {}; block.add(s); return s; });
    for (const k of ['shore', 'shallow', 'deep']) AT[k][1] = ground(AT[k][0]) + 0.002;          // 沉积物落在海底上
    AT.buried[1] = ground(AT.buried[0]) - 0.022;
    AT.lava[1] = ground(AT.lava[0]) + 0.006;          // 喷出岩：熔岩先喷到地表上，在地表冷却
    AT.peak[1] = ground(AT.peak[0]) + 0.004;
    paintFace();
    // 剖面上的字：地方的名字
    const F = (t, x, y, c = '#ffffff') => faceLabel(block, t, { x, y, z: ZD, h: 0.0075, color: c, stroke: 'rgba(40,30,20,0.6)' });
    F('岩浆', AT.chamber[0], AT.chamber[1] - 0.012); F('侵入岩体', AT.intrusion[0] + 0.03, AT.intrusion[1] + 0.006); F('深处：高温、高压', AT.meta[0] + 0.02, AT.meta[1] - 0.012); F('一层层沉积岩', AT.buried[0] + 0.03, AT.buried[1] - 0.004);
    noteBadge(tag, '教学示意：竖直方向压缩了；剖面上的点纹、细线、砖纹是地质图上表示砂岩、页岩、石灰岩的符号；侵入体周围的变质以受热为主（接触变质），深处的波纹表示有片理的变质岩，并非所有变质岩都有片理；海底近岸沙、远处泥和低处阔叶林、高处针叶林都只是这个场景里的一种情形；各个过程的时间尺度差别很大（熔岩冷却结壳可能只要几天，抬升、风化、搬运、变质往往要很长的地质年代），动画不按真实时间比例').loc(block, XL + 0.012, -0.002, ZD + 0.012);

    // ---- 那块做了记号的石头：样子跟着它是什么岩石变；岩浆时会发光 ----
    const rockCv = document.createElement('canvas'); rockCv.width = 128; rockCv.height = 128;
    const rockTex = new THREE.CanvasTexture(rockCv); rockTex.colorSpace = THREE.SRGBColorSpace;
    const rockMat = new THREE.MeshStandardMaterial({ map: rockTex, roughness: 0.85, metalness: 0, emissive: 0x000000 });
    const stone = new THREE.Mesh(new THREE.IcosahedronGeometry(0.0085, 2), rockMat); block.add(stone);
    { const p = stone.geometry.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); v.multiplyScalar(1 + 0.18 * Math.sin(v.x * 900) * Math.sin(v.y * 700 + 1) * Math.sin(v.z * 800 + 2)); p.setXYZ(i, v.x, v.y, v.z); } stone.geometry.computeVertexNormals(); }          // 不规则的一块
    const pile = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0013, 6, 4), new THREE.MeshLambertMaterial({ color: 0xffffff }), 60); pile.raycast = () => {}; pile.scale.setScalar(1.5); block.add(pile);          // 变成沉积物时：一堆颗粒
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.009, 0.0105, 40), new THREE.MeshBasicMaterial({ color: 0xc8402c, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthTest: false })); ring.renderOrder = 15; block.add(ring);          // 记号：一圈红线圈着它
    const look = (id) => {
      const L = LOOK[id], g = rockCv.getContext('2d'), c = '#' + L.c.toString(16).padStart(6, '0');
      g.fillStyle = c; g.fillRect(0, 0, 128, 128);
      if (L.spot) for (let i = 0; i < 260; i++) { g.fillStyle = ['#2a2a2a', '#f2ece4', '#c98a7a'][i % 3]; g.fillRect(Math.random() * 128, Math.random() * 128, 3 + Math.random() * 3, 3 + Math.random() * 3); }
      if (L.pore) for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.beginPath(); g.arc(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 3, 0, 7); g.fill(); }
      if (L.band) for (let y = 0; y < 128; y += 9) { g.fillStyle = `rgba(${id === 'gneiss' ? '40,30,30' : '20,20,30'},${0.25 + Math.random() * 0.2})`; g.fillRect(0, y + Math.sin(y) * 2, 128, 3 + Math.random() * 3); }
      if (!L.spot && !L.pore && !L.band) for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
      rockTex.needsUpdate = true;
      rockMat.emissive.setHex(L.e ?? 0); rockMat.emissiveIntensity = L.e ? 0.9 : 0; rockMat.roughness = id === 'marble' ? 0.35 : 0.85;
      const isSed = ROCK[id].kind === 'sediment'; stone.visible = !isSed; pile.visible = isSed;
      if (isSed) { const m4 = new THREE.Matrix4(), col = new THREE.Color(), size = { gravel: 2.2, sand: 1, mud: 0.6, shell: 1.1 }[L.grain]; for (let i = 0; i < 60; i++) { const a = rnd() * 6.28, r = rnd() * 0.008, s = size * (0.7 + rnd() * 0.6); m4.compose(new THREE.Vector3(Math.cos(a) * r, rnd() * 0.002 * (1 - r / 0.008) + 0.0005, Math.sin(a) * r * 0.6), new THREE.Quaternion(), new THREE.Vector3(s, s * (L.grain === 'shell' ? 0.5 : 0.8), s)); pile.setMatrixAt(i, m4); col.setHex(L.c).multiplyScalar(0.8 + rnd() * 0.4); pile.setColorAt(i, col); } pile.instanceMatrix.needsUpdate = true; pile.instanceColor.needsUpdate = true; }
    };
    const placeAt = (key) => { const [x, y] = AT[key]; return new THREE.Vector3(x, y, ZD - 0.005); };          // 都在剖面前面一点点，看得见
    const aName = airLabel(block, '', { h: 0.0085, color: '#2c3245' }), aProc = airLabel(block, '', { h: 0.0078, color: '#a8341f', dim: 0 });
    const shortName = (r) => r.name.replace(/^(侵入岩|喷出岩)（以(.+)为例）$/, '$2（$1）').replace(/（具体是哪种.*）$/, '');
    const labels = [aName, aProc];
    // 这一步石头怎么走：一串路点（凝固就地；上抬到山顶；顺着河进海；往下埋；往深处；往岩浆房）
    const route = (from, to, proc) => {
      const a = placeAt(ROCK[from].at), b = placeAt(ROCK[to].at), pts = [a];
      if (proc.startsWith('抬升')) { pts.push(new THREE.Vector3(a.x, Math.max(a.y, 0.06), a.z), placeAt('peak'), new THREE.Vector3(0.03, ground(0.03) + 0.004, ZD - 0.005), placeAt('shore')); }          // 先被抬升到地表的山上，风化以后顺着河流进海
      else if (proc === '熔化') pts.push(new THREE.Vector3(a.x, 0.02, a.z));
      else if (proc.startsWith('变质')) pts.push(new THREE.Vector3((a.x + b.x) / 2, Math.min(a.y, b.y) - 0.004, a.z));
      else if (proc.startsWith('压实')) pts.push(new THREE.Vector3(a.x, a.y - 0.008, a.z));
      else if (proc.includes('喷出')) pts.push(new THREE.Vector3(-0.1, 0.06, a.z), new THREE.Vector3(-0.105, ground(-0.105) - 0.004, a.z), new THREE.Vector3(-0.105, ground(-0.105) + 0.012, a.z));          // 顺着通道上来，冲出火山口，再落到地表
      pts.push(b); return new THREE.CatmullRomCurve3(pts);
    };
    const stepTo = (n) => {
      if (S.anim) return; const from = S.id;
      if (from === 'magma' && S.path.length > 1) { const sep = n.to === 'basalt' ? '另取一份玄武质岩浆' : '另取一份富硅岩浆'; S.path.push({ id: 'magma', sep }); S.newNote ||= sep; drawLog(); }          // 熔出来的岩浆没追踪成分：再凝固就是另取一份相应成分的岩浆，手动、自动都一样
      const sw = n.proc.startsWith('抬升') ? 0.4 : n.proc.startsWith('变质') ? 0.5 : 0.92;          // 什么时候换样子：风化在被抬到地表以后，变质在深处半路上，冷却凝固、压实固结、熔化都在到了地方以后
      S.anim = { t: 0, dur: S.auto ? 2.6 : 3, curve: route(from, n.to, n.proc), from, to: n.to, proc: n.proc, why: n.why, mid: false, sw };
      aProc.setText(n.proc.replace(/（.*）/, '')).setOn(true); S.moved = true;
      const ext = EXTRA.includes(arrowKey(from, n.to)) ? '（这根箭头图 2.10 上没画，课本第 24 页正文讲到）' : '';
      W?.ui.status(`${S.auto ? `第 ${S.auto.i + 1}/${TOUR.length} 步：` : ''}${S.newNote ? `${S.newNote}。` : ''}${ROCK[from].name.replace(/（.*）$/, '')} 正在经历<b>${n.proc.replace(/（.*）/, '')}</b>${ext}……`); S.newNote = null;
      drawChart();
    };
    const arrowKey = (a, b) => `${ROCK[a].kind}>${ROCK[b].kind}`;
    const finish = () => {
      const a = S.anim; S.anim = null; S.id = a.to; S.kinds.add(ROCK[a.to].kind); S.arrows.add(arrowKey(a.from, a.to)); S.path.push({ id: a.to, proc: a.proc });
      aProc.setOn(false); look(S.id); layout(); dotAt();
      const r = ROCK[S.id], done = S.auto && S.auto.i >= TOUR.length;
      W?.ui.status(`${S.auto ? `第 ${S.auto.i}/${TOUR.length} 步 · ` : ''}经过<b>${a.proc.replace(/（.*）/, '')}</b>：${a.why}。现在它是<b>${r.name}</b>（${KIND[r.kind]}）${r.sub ? `，${r.sub}` : ''}。${done ? '自动演示走完了：图 2.10 的 10 根箭头，加上正文讲到的沉积岩熔化（虚线），都走过一遍；三类岩石都能变成另外两类，最后又回到岩浆。' : S.id === 'magma' && S.path.length > 2 ? '它又回到了岩浆——绕了一圈。' : ''}${!done && S.auto?.paused ? '已暂停：可以按“继续”，也可以自己挑下一步。' : !S.auto && !(S.id === 'magma' && S.path.length > 2) ? '接下来呢？' : ''}`);
      if (done) stopAuto();
      drawLog(); drawChart(); renderChoices();
    };
    const layout = () => {
      const p = placeAt(ROCK[S.id].at); stone.position.copy(p); pile.position.copy(p); ring.position.set(p.x, p.y, p.z + 0.004);
      const r = ROCK[S.id]; aName.position.set(p.x, p.y + 0.018, p.z); aName.setText(shortName(r) === KIND[r.kind] ? shortName(r) : `${shortName(r)} · ${KIND[r.kind]}`);
    };

    // ---- 侧栏：图 2.10 的循环图（走过的箭头亮起来） ----
    const NODES = { magma: [160, 34, '岩浆'], igneous: [270, 110, '岩浆岩'], sediment: [215, 200, '沉积物'], sedimentary: [105, 200, '沉积岩'], metamorphic: [50, 110, '变质岩'] };
    const EDGES = [['magma', 'igneous', '冷却凝固'], ['igneous', 'sediment', '抬升风化侵蚀搬运沉积'], ['sedimentary', 'sediment', '抬升风化…'], ['metamorphic', 'sediment', '抬升风化…'], ['sediment', 'sedimentary', '压实固结'], ['igneous', 'metamorphic', '变质作用'], ['sedimentary', 'metamorphic', '变质作用'], ['metamorphic', 'metamorphic', '变质作用'], ['igneous', 'magma', '熔化'], ['sedimentary', 'magma', '熔化'], ['metamorphic', 'magma', '熔化']];
    const edgeGeo = (a, b) => {          // 循环图上一根箭头的位置：直线 [sx, sy, ex, ey, nx, ny]；变质岩自己指向自己是一小段圆弧
      const [x0, y0] = NODES[a], [x1, y1] = NODES[b];
      if (a === b) return { loop: true, cx: x0, cy: y0 - 24, r: 11, a0: 0.9, a1: Math.PI * 2 + 0.2 };
      const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, off = (EDGES.some(([p, q]) => p === b && q === a) ? 6 : 0), nx = -uy * off, ny = ux * off;
      return { ux, uy, nx, ny, sx: x0 + ux * 26 + nx, sy: y0 + uy * 14 + ny, ex: x1 - ux * 28 + nx, ey: y1 - uy * 16 + ny };
    };
    const edgeAt = (e, u) => (e.loop ? [e.cx + Math.cos(e.a0 + (e.a1 - e.a0) * u) * e.r, e.cy + Math.sin(e.a0 + (e.a1 - e.a0) * u) * e.r] : [e.sx + (e.ex - e.sx) * u, e.sy + (e.ey - e.sy) * u]);
    const drawChart = () => {
      if (!W) return;
      const go = S.anim && `${ROCK[S.anim.from].kind}>${ROCK[S.anim.to].kind}`;          // 正在走的那根箭头
      const c = W.chart, g = c.getContext('2d'), w = c.width, hh = c.height, cur = ROCK[S.id].kind;
      g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, hh); g.textAlign = 'center'; g.textBaseline = 'middle';
      const halo = (t, x, y) => { g.save(); g.lineWidth = 3.5; g.lineJoin = 'round'; g.strokeStyle = '#fbf8f0'; g.strokeText(t, x, y); g.fillStyle = '#a8341f'; g.fillText(t, x, y); g.restore(); };          // 箭头上的字描一圈纸色，压在线上也看得清
      for (const [a, b, t] of EDGES) {
        const now = go === `${a}>${b}`, lit = now || S.arrows.has(`${a}>${b}`), [x0, y0] = NODES[a];
        g.strokeStyle = now ? '#e8833a' : lit ? '#c8402c' : 'rgba(120,110,90,0.35)'; g.fillStyle = g.strokeStyle; g.lineWidth = now ? 3.2 : lit ? 2.6 : 1.4;
        const ext = EXTRA.includes(`${a}>${b}`); g.setLineDash(ext ? [4, 3] : []);          // 图上没画、正文补的箭头：虚线
        if (a === b) { const e = edgeGeo(a, b), [ax, ay] = edgeAt(e, 1), tx = -Math.sin(e.a1), ty = Math.cos(e.a1); g.beginPath(); g.arc(e.cx, e.cy, e.r, e.a0, e.a1); g.stroke(); g.beginPath(); g.moveTo(ax + tx * 4, ay + ty * 4); g.lineTo(ax - tx * 4 - ty * 4, ay - ty * 4 + tx * 4); g.lineTo(ax - tx * 4 + ty * 4, ay - ty * 4 - tx * 4); g.fill(); if (lit) { g.font = '10px "PingFang SC", sans-serif'; halo(t, x0, y0 - 42); } continue; }          // 变质岩再次变质：自己指向自己；箭头尖顺着圆弧终点的切线，和红点走的方向一致
        const { ux, uy, nx, ny, sx, sy, ex, ey } = edgeGeo(a, b);
        g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke(); g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex - ux * 8 - uy * 4, ey - uy * 8 + ux * 4); g.lineTo(ex - ux * 8 + uy * 4, ey - uy * 8 - ux * 4); g.fill();
        if (t && lit) { g.font = '10px "PingFang SC", sans-serif'; const u = ext ? 0.62 : 0.5; halo(ext ? `${t}（正文）` : t, sx + (ex - sx) * u + nx * 2.2 + (ext ? -22 : 0), sy + (ey - sy) * u + ny * 2.2 - 6); }          // 正文补的那根标在靠近岩浆的一头，让开中间几根箭头的字
      }
      g.setLineDash([]);
      for (const [k, [x, y, t]] of Object.entries(NODES)) { const been = S.kinds.has(k), now = cur === k; g.fillStyle = now ? '#c8402c' : been ? '#f3dfd4' : '#ffffff'; g.strokeStyle = now ? '#c8402c' : '#8a7a5e'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(x - 30, y - 14, 60, 28, 8); g.fill(); g.stroke(); g.font = '600 13px "PingFang SC", sans-serif'; g.fillStyle = now ? '#ffffff' : '#3a3226'; g.fillText(t, x, y); }
    };
    const drawLog = () => {
      if (!W) return;
      const rows = [], r = (b, t) => rows.push(h('div', { class: 'tl-row' }, h('b', {}, b), h('span', {}, t)));
      r('它的履历：', S.path.map((p, i) => (p.sep ? `‖ ${p.sep}` : i ? `→（${p.proc.replace(/（.*）/, '')}）${ROCK[p.id].name}` : ROCK[p.id].name)).join(' '));          // ‖：换了一份岩浆，不是同一块物质接着走
      const rockKinds = ['igneous', 'sedimentary', 'metamorphic'].filter((k) => S.kinds.has(k));
      if (rockKinds.length === 3) r('三类岩石都当过了：', '岩浆岩、沉积岩、变质岩都是由别的东西转化来的：沉积物来自已有岩石的风化侵蚀，变质岩来自已有的岩石，岩浆来自岩石的熔化');
      if (S.path.length > 2 && S.id === 'magma') r('回到岩浆：', '每一类岩石最后都能熔化，又成为新的岩浆：岩石圈的物质一直在循环');
      const proven = provenGraniteSand(S.path);          // 必须连续经过具体转换边，绕经岩浆的路径不算直接证明
      if (S.guess != null) rows.push(h('div', { class: 'tl-row' }, h('small', {}, proven ? `你猜：${S.guess ? '有可能' : '不可能'}　你刚才亲手走过了：花岗岩被抬升到地表，风化后取其中的石英组分，经搬运、分选成为石英砂，再固结成石英砂岩` : `你猜：${S.guess ? '有可能' : '不可能'}　自己走一遍试试：让它先变成花岗岩，再看能不能变成砂岩`)));
      W.log.replaceChildren(...rows);
      if (rockKinds.length === 3 && S.path.length > 3 && S.id === 'magma') W.ui.unlock();
    };
    const dotAt = () => {          // 循环图上的红点：沿正在走的那根箭头，和地块里的石头同步
      if (!W) return; const a = S.anim; W.dot.style.opacity = a ? 1 : 0; if (!a) return;
      const [x, y] = edgeAt(edgeGeo(ROCK[a.from].kind, ROCK[a.to].kind), a.t), k = W.chart.clientWidth / 320;
      W.dot.style.transform = `translate(${x * k}px, ${y * k}px)`;
    };
    const setAutoBtn = () => { if (!W) return; W.autoBtn.textContent = !S.auto ? '自动演示：从岩浆走一圈' : S.auto.paused ? '继续' : '暂停'; W.choices.classList.toggle('busy', !!S.auto && !S.auto.paused); };
    const stopAuto = () => { S.auto = null; setAutoBtn(); };
    const restart = () => { Object.assign(S, { id: 'magma', path: [{ id: 'magma' }], anim: null, moved: false }); S.kinds = new Set(['magma']); S.arrows = new Set(); aProc.setOn(false); aName.setOn(true); look(S.id); layout(); drawChart(); drawLog(); renderChoices(); dotAt(); };
    const toggleAuto = () => {
      if (!S.auto) { restart(); S.auto = { i: 0, wait: 0.8, paused: false }; W?.ui.status('自动演示：这块岩石现在是地下的<b>岩浆</b>，看它一步步走。'); }
      else { S.auto.paused = !S.auto.paused; W?.ui.status(S.auto.paused ? (S.anim ? '这一步走完就停。' : '已暂停：可以按“继续”，也可以自己挑下一步。') : S.anim ? '已继续，正在完成这一步。' : '已继续，准备走下一步。'); }
      setAutoBtn();
    };
    const renderChoices = () => {
      if (!W) return;
      const list = nexts(S.id), r = ROCK[S.id];
      W.now.innerHTML = `现在它是 <b>${r.name}</b>（${KIND[r.kind]}）${r.sub ? `<br><small>${r.sub}</small>` : ''}`;
      W.choices.replaceChildren(...list.map((n) => { return h('button', { class: 'go ghost choice', onclick: () => { if (S.anim) return; if (S.auto) stopAuto(); stepTo(n); } }, n.proc); }));          // 自动演示暂停时点一步：换成自己挑
    };

    look(S.id); layout();

    return {
      group,
      card: false,
      emerge: 'flat',          // 课本的图平放在书页上，模型从它上面长出来、它慢慢淡掉
      size: { w: 0.4, d: 0.12, h: 0.14 },
      view: { elev: 10, azim: 6, lookY: 0.45, frameMargin: 1.1 },
      pointer: { down: () => false, move: () => false, up: () => false },
      debug: { go: (i) => { const n = nexts(S.id)[i]; stepTo(n); if (S.anim) S.anim.t = 0.999; } },
      mount(ui) {
        const choices = h('div', { class: 'btn-col' }), now = h('div', { class: 'read-out' });
        const guess = buttons([{ text: '猜：有可能', ghost: true, onClick: () => { S.guess = 1; drawLog(); } }, { text: '猜：不可能', ghost: true, onClick: () => { S.guess = 0; drawLog(); } }]);
        const acts = buttons([{ text: '自动演示：从岩浆走一圈', onClick: toggleAuto }, { text: '重来', ghost: true, onClick: () => { ui.relock?.(); stopAuto(); S.guess = null; restart(); ui.status(START); } }]);
        const chart = h('canvas', { class: 'wx-map', width: 320, height: 230 }), log = h('div', { class: 'timeline' }), dot = h('span', { class: 'cycle-dot' });
        ui.controls.append(h('div', { class: 'bar-title' }, '图 2.10：走过的箭头会亮起来'), h('div', { class: 'cycle-wrap' }, chart, dot), acts.el, now, h('div', { class: 'bar-title' }, '接下来，它经历什么作用？'), choices, h('p', { class: 'note' }, ASK), guess.el, note('箭头依据课本图 2.10；虚线的沉积岩熔化是图上没画、课本第 24 页正文讲到的。地块上那块被红圈圈着的就是这块岩石，它会在示意剖面中移动。石英砂→石英砂岩→石英岩是限定实例；熔融后只保留岩浆类别，凝固分支需满足相应岩浆成分。'));
        ui.data.append(h('div', { class: 'bar-title' }, '你看到了什么'), log);
        W = { ui, chart, log, choices, now, dot, autoBtn: acts.btns[0] };
        ui.status(START);
        drawChart(); drawLog(); renderChoices();
      },
      update(dt, t) {
        labels.forEach((l) => l.tick(dt));
        smoke.forEach((s) => { s.userData.t = (s.userData.t + dt * 0.12) % 1; const u = s.userData.t; s.position.set(CRATER.x + u * 0.03, CRATER.y + 0.004 + u * 0.05, CRATER.z - u * 0.02); s.scale.setScalar(0.01 + u * 0.03); s.material.opacity = 0.5 * (1 - u); });
        { const P = seaTop.geometry.attributes.position.array; for (let i = 0; i < P.length; i += 3) P[i + 1] = seaBase[i + 1] + 0.0005 * Math.sin(seaBase[i] * 160 + (t || 0) * 1.6) * Math.sin(seaBase[i + 2] * 120 - (t || 0) * 1.1); seaTop.geometry.attributes.position.needsUpdate = true; seaTop.geometry.computeVertexNormals(); }          // 海面轻轻起伏
        if (S.id === 'magma' && !S.anim) rockMat.emissiveIntensity = 0.7 + 0.25 * Math.sin((t || 0) * 3);
        if (S.auto && !S.auto.paused && !S.anim) { S.auto.wait -= dt; if (S.auto.wait <= 0) { const n = tourStep(S.id, S.auto.i); if (!n) stopAuto(); else { if (NEW[S.auto.i]) S.newNote = NEW[S.auto.i]; stepTo(n); S.auto.i++; S.auto.wait = 1.4; } } }          // 自动演示：上一步停一会儿（读状态栏），再走下一步
        if (S.anim) {          // 暂停：正在走的这一步走完，下一步不走了
          const a = S.anim; a.t = Math.min(1, a.t + dt / a.dur); const p = a.curve.getPointAt(a.t); dotAt();
          stone.position.copy(p); pile.position.copy(p); ring.position.set(p.x, p.y, p.z + 0.004); aProc.position.set(p.x, p.y + 0.02, p.z); aName.setOn(false);
          if (!a.mid && a.t > a.sw) { a.mid = true; look(a.to); }          // 作用发生的地方才换样子
          if (a.t >= 1) { aName.setOn(true); finish(); }
        }
      },
    };
  },
};
const START = '一块被红圈圈着的岩石，现在还是地下的<b>岩浆</b>。在侧栏挑它接下来经历什么作用，看它在地壳里走到哪、变成什么。';
