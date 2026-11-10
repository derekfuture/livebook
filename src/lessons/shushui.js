// 八年级上册 跨学科主题学习 · 探究“束水攻沙”原理（课本第 53—56 页：图 1 河流过水横截面示意、图 2、表 1、图 3、图 4，潘季驯的治河方略）。
//
// 书桌中间是一段黄河的模型（课本图 3 那样的一块）：河水从远处流向镜头，前面切开，看得见过水横截面（倒梯形）；两岸各有一道堤，可以往里推（筑堤束水）、往外放。
// 左边立着一张河段示意图（我们自己画的，照课本图 2 的意思：甲、乙、丙、丁四个横截面），右边立着一块坐标板（课本图 4）。
// 学生：
//   ① 任务一：读切面上的河底宽度、河面宽度、水深（图 1：60 米、100 米、3 米），算过水横截面面积；
//      任务三（1）：模型里亮出“1 秒流过切面的水”——以横截面为底、长 2 米（流速 × 1 秒）的一段（图 3 的棱柱体），算流量；
//   ② 任务二、三（2）：点示意图上的甲、乙、丙、丁，模型换成那里的横截面（表 1，河底宽度都是河面宽度的 1/2）。流量都是 900 米³/秒：
//      1 秒流过的那段水体积不变，横截面小，这一段就拉得长——流速 = 流量 ÷ 面积；四个点画到坐标板上，连成图 4 的曲线；
//   ③ 任务四：自己筑堤束水——堤往里推，河道收窄、面积变小、流速变大，河底的泥沙被冲起来带走、河床变深；往外放，流速变小，泥沙停下来、河床淤高。
// 冲刷、淤积的门槛和快慢是教学示意（流速大于约 3.2 米/秒冲刷，小于约 2.4 米/秒淤积，时间加快了）；模型横、竖、顺着河三个方向的比例不一样（课本图 1 也注明“非等比例”）。
import * as THREE from 'three';
import { table, buttons } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { canvasTex } from './kit/props.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked, polyline } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const Q = 900;                                   // 任务三（2）：流量保持 900 米³/秒
const KX = 0.00042, KY = 0.012, KZ = 0.015;      // 模型里 1 米有多长：横过河、竖直（放大约 30 倍）、顺着河（按“1 秒流过的路程”画：水流得多快，模型里就走多快）
const L = 0.2, XB = 0.2;                        // 河段模型：顺着河多长、左右各多宽
const YG = 0.1, YW = 0.096;                      // 两岸滩地、水面的高度（河底下面留一层层的黄土）
const SET = 0.006;                               // 堤脚离槽口多远
const VC = 3.2, VD = 2.4, KBED = 0.2;            // 冲刷、淤积的门槛流速（示意）；河床升降多快（每超过门槛 1 米/秒，每秒升降多少米）
const TASK1 = { a: 60, b: 100, h: 3 };           // 图 1
const FOUR = {                                   // 表 1（河底宽度 = 河面宽度的 1/2）；given：课本表里给出的那两格
  甲: { b: 600, a: 300, h: 1, given: ['b', 'h'] },
  乙: { b: 400, a: 200, h: 1, given: ['a', 'S'] },
  丙: { b: 100, a: 50, h: 2, given: ['b', 'S'] },
  丁: { b: 120, a: 60, h: 2, given: ['a', 'h'] },
};
const NAMES = ['甲', '乙', '丙', '丁'];
const areaOf = (s) => ((s.a + s.b) / 2) * s.h;
const fmt = (x, d = 1) => String(Math.round(x * 10 ** d) / 10 ** d);
/** 一个横截面在模型里的几个数：水面半宽、河底半宽、河底高度、槽口（滩地那么高）半宽 */
const geom = (c) => { const hb = (c.b / 2) * KX, ha = (c.a / 2) * KX, yb = YW - c.h * KY; return { hb, ha, yb, hg: hb + ((YG - YW) * (hb - ha)) / (YW - yb) }; };
/** 反过来：堤脚的位置 → 河面宽度（河底宽度 = 河面宽度的一半，水深 h 不变） */
const bAtDike = (x, h) => (2 * Math.max(0.001, Math.abs(x) - SET)) / (KX * (1 + (YG - YW) / (2 * h * KY)));
const dikeAt = (b, h) => (b / 2) * KX * (1 + (YG - YW) / (2 * h * KY)) + SET;

export default {
  id: 'shushui',
  fig: '图1',
  title: '探究“束水攻沙”原理',
  stampText: '探究',
  style: 'real',
  flow: 'explore',
  ask: '明代的潘季驯治理黄河，主张“筑堤束水，以水攻沙”：在河的两岸筑堤，把河道收窄。在流量不变、水深暂不变的条件下，收窄河道，水流和冲沙能力会怎样变化？',
  guess: { options: ['平均流速减小，冲刷和搬运泥沙的能力减弱', '平均流速增大，冲刷和搬运泥沙的能力增强，河底泥沙更容易被带走', '平均流速不变，冲刷和搬运泥沙的能力也不变'], answer: 1 },          // 动手看里的“先猜一下（可以不猜）”
  need: '算出图 1 那处的过水横截面面积和流量；点甲、乙、丙、丁补全表 1，看流量不变时过水横截面面积和流速的关系（图 4）；再自己筑堤束水，看流速和河底怎么变',
  conclusion: {
    crops: [{ page: 60, rect: [56, 174, 458, 256] }, { page: 60, rect: [56, 425, 458, 459] }],
    quote: '潘季驯“束水攻沙”方略的核心思想是：“水分则势缓，势缓则沙停，沙停则河饱，尺寸之水皆由沙面，止见其高。水合则势猛，势猛则沙刷，沙刷则河深，寻丈之水皆由河底，止见其卑。筑堤束水，以水攻沙，水不奔溢于两旁，则必直刷乎河底。一定之理，必然之势，此合之所以愈于分也。”河流的流速越大，搬运和冲刷泥沙的能力就越强。',
    why: '过水横截面近似倒梯形：面积 S = (河底宽度 + 河面宽度) ÷ 2 × 水深，图 1 那处 S = (60 + 100) ÷ 2 × 3 = 240 米²。流量 = 过水横截面面积 × 断面平均流速：1 秒流过横截面的水，是以横截面为底、长“流速 × 1 秒”的一段（图 3），2 米/秒时 Q = 240 × 2 = 480 米³/秒。1 秒通过的水体体积是 480 米³，流量是 480 米³/秒。<br>流量保持 900 米³/秒时，流速 = 900 ÷ 面积：甲 450 米²、2 米/秒；乙 300 米²、3 米/秒；丙 150 米²、6 米/秒；丁 180 米²、5 米/秒——<b>在流量保持不变时，过水横截面面积越小，断面平均流速越大</b>（图 4 的曲线）。<br>在流量保持不变、河道刚收窄且水深尚未明显改变时，过水横截面面积减小，断面平均流速增大，搬运和冲刷泥沙的能力增强。在本演示的条件下，河底泥沙被带走、河床逐渐冲深（“水合则势猛，势猛则沙刷，沙刷则河深”）；河道宽、流速慢，泥沙停下来，河床淤高（“水分则势缓，势缓则沙停，沙停则河饱”）。',
    src: '课本八年级上册第 53—56 页 · 跨学科主题学习 探究“束水攻沙”原理',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null, said = '';
    const status = (m) => { if (!S.demo) { said = m; W?.status(m); } else bar.caption(m); };          // said：学生这边最后一句（老师演示完放回去）
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };

    paperSheet(group, { w: 0.64, d: 0.56, x: 0, z: -0.06 });

    // ================= 河段模型：一块切开的土，中间一道倒梯形的河槽，两岸滩地上各有一道堤 =================
    const soilTex = canvasTex(1024, 512, (g, Wc, Hc) => {          // 切面上的土：一层层的黄土，顶上一层薄薄的耕土
      const bands = ['#d4bc8f', '#c8ad7d', '#dac59b', '#c2a575', '#cfb587', '#bb9d6c', '#d1b98c', '#b99a68', '#c7ab7b'];
      let y = Hc * 0.05, i = 0;
      g.fillStyle = '#8c7650'; g.fillRect(0, 0, Wc, Hc);
      while (y < Hc) {
        g.fillStyle = bands[i % bands.length]; g.beginPath(); g.moveTo(0, y);
        for (let x = 0; x <= Wc; x += 32) g.lineTo(x, y + Math.sin(x * 0.004 + i * 1.7) * 4);
        g.lineTo(Wc, Hc); g.lineTo(0, Hc); g.closePath(); g.fill();
        y += Hc * (0.05 + ((i * 37) % 7) / 60); i++;
      }
      for (let k = 0; k < 5000; k++) { g.fillStyle = `rgba(80,60,35,${Math.random() * 0.1})`; g.fillRect(Math.random() * Wc, Math.random() * Hc, 2, 2); }
    });
    const capM = new THREE.MeshStandardMaterial({ map: soilTex, roughness: 0.95 }), bankM = new THREE.MeshStandardMaterial({ color: 0xc9b083, roughness: 0.95 });
    const sandM = new THREE.MeshStandardMaterial({ color: 0xe6d3a3, roughness: 0.95 });          // 新淤的泥沙
    const grassM = new THREE.MeshStandardMaterial({ color: 0x9da66c, roughness: 0.92 });
    let soil = null, sand = null;
    const grass = [-1, 1].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, L), grassM); m.rotation.x = -Math.PI / 2; m.position.y = YG + 0.0003; m.receiveShadow = true; m.raycast = () => {}; group.add(m); return m; });
    // 河水：黄河的浑水；水面上一层流纹，跟着流速走
    const waterM = new THREE.MeshStandardMaterial({ color: 0xab8045, roughness: 0.28, transparent: true, opacity: 0.84, depthWrite: false });
    let water = null;
    const flowTex = canvasTex(256, 512, (g, Wc, Hc) => {
      g.clearRect(0, 0, Wc, Hc);
      for (let i = 0; i < 140; i++) { g.strokeStyle = `rgba(255,240,210,${0.1 + Math.random() * 0.18})`; g.lineWidth = 1 + Math.random() * 2; const x = Math.random() * Wc, y = Math.random() * Hc, l = 20 + Math.random() * 70; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 5, y + l); g.stroke(); }
    }, { repeat: [1, 1] });
    const surf = new THREE.Mesh(new THREE.PlaneGeometry(1, L), new THREE.MeshBasicMaterial({ map: flowTex, transparent: true, depthWrite: false })); surf.rotation.x = -Math.PI / 2; surf.position.y = YW + 0.0003; surf.renderOrder = 3; surf.raycast = () => {}; group.add(surf);
    // 两道堤：梯形的土堤，顶上长草；陡的一面朝河
    const dikeGeo = new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.032, 0), new THREE.Vector2(0.021, 0.016), new THREE.Vector2(0.008, 0.016)]), { depth: L, bevelEnabled: false }); dikeGeo.translate(0, 0, -L / 2);
    const dikeTop = new THREE.PlaneGeometry(0.013, L);
    const dikes = [-1, 1].map((sx) => {
      const d = new THREE.Group(), m = inked(new THREE.Mesh(dikeGeo, paint(0xb39c72)), { width: 0.7, handle: true }); m.scale.x = sx; d.add(m);          // 左边那道镜像过去
      const top = new THREE.Mesh(dikeTop, grassM); top.rotation.x = -Math.PI / 2; top.position.set(sx * 0.0145, 0.0162, 0); d.add(top);
      const pick = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.024, L), new THREE.MeshBasicMaterial({ visible: false })); pick.position.set(sx * 0.016, 0.01, 0); pick.userData.pick = true; pick.userData.track = true; d.add(pick);
      d.position.y = YG; group.add(d); return { d, pick, sx };
    });

    // 水里带着走的泥沙：前 NB 粒一直在水里；后面的只在冲刷时出现，从河底被卷起来
    const NB = 150, NS = 260, sp = new Float32Array(NS * 3);
    const silt = Array.from({ length: NS }, (_, i) => ({ u: Math.random() * 2 - 1, d: i < NB ? Math.random() : 1, z: Math.random() * L - L / 2, k: 0.75 + Math.random() * 0.4 }));
    const siltPts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(sp, 3)), new THREE.PointsMaterial({ color: 0x6f5128, size: 0.0032, transparent: true, opacity: 0.85, depthWrite: false }));
    siltPts.raycast = () => {}; siltPts.frustumCulled = false; siltPts.renderOrder = 4; group.add(siltPts);

    // “1 秒流过切面的水”（课本图 3 的棱柱体）：从切面往上游，长 = 流速 × 1 秒；一片亮的水面每秒从它的上游一头走到切面
    const prismM = new THREE.MeshBasicMaterial({ color: 0xe6f3ff, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide });
    let prism = null;
    const sweep = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); sweep.renderOrder = 6; sweep.raycast = () => {}; group.add(sweep);

    // 切面上的尺寸线（像图 1 那样：河面宽度在上、河底宽度在下、水深在右）、河床线、棱柱体的边
    const INK = 0x26304a;
    const dimLine = polyline([new THREE.Vector3(), new THREE.Vector3()], { width: 1.3, color: INK }), bedLine = polyline([new THREE.Vector3(), new THREE.Vector3()], { width: 2.4, color: 0x5a4326 }), prismLine = polyline([new THREE.Vector3(), new THREE.Vector3()], { width: 2.6, color: 0xe8890c });
    dimLine.renderOrder = bedLine.renderOrder = 7; prismLine.renderOrder = 8; group.add(dimLine, bedLine, prismLine);
    const tB = tag('', 'pill'), tA = tag('', 'pill'), tH = tag('', 'pill'), tS = tag('', 'pill'), tQ = tag('', 'pill');

    // ================= 河段模型后面两个画架：河段示意图（课本图 2）、坐标板（课本图 4） =================
    const easel = (w, hh, tex, { x, z, ry, tilt = 0.3, lift = 0.052 }) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; group.add(g);
      const wood = paint(0xa7865a), face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
      const lean = new THREE.Group(); lean.position.set(0, lift, 0); lean.rotation.x = -tilt; g.add(lean);
      const board = inked(new THREE.Mesh(new THREE.BoxGeometry(w + 0.008, hh + 0.008, 0.004), [wood, wood, wood, wood, face, wood]), { width: 0.5 }); board.position.y = (hh + 0.008) / 2; lean.add(board);
      const ledge = inked(new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, 0.005, 0.012), wood), { width: 0.5 }); ledge.position.set(0, -0.001, 0.004); lean.add(ledge);          // 托着画板下沿的横档
      const rod = (a, b, r = 0.0032) => { const m = new THREE.Mesh(new THREE.BoxGeometry(r * 2, 1, r * 1.4), wood); m.position.copy(a).add(b).multiplyScalar(0.5); m.scale.y = a.distanceTo(b); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); m.castShadow = true; g.add(m); };
      const up = (u) => new THREE.Vector3(0, lift + u * Math.cos(tilt), -u * Math.sin(tilt) - 0.004);          // 画板背后、离下沿 u 处
      for (const sx of [-1, 1]) rod(new THREE.Vector3(sx * (w / 2 - 0.012), 0.002, 0.012), up(hh * 0.92).add(new THREE.Vector3(sx * (w / 2 - 0.03), 0, 0)));          // 前面两条腿
      const top = up(hh * 0.8); rod(top, new THREE.Vector3(0, 0.002, top.z - hh * 0.5));          // 背后一条撑腿
      const onFace = (u, v) => new THREE.Vector3((u - 0.5) * w, 0.004 + (1 - v) * hh, 0.0032);          // 画板上 (u, v)（0—1，v 从上往下）在 lean 里的位置
      return { g, lean, onFace };
    };

    // 河段示意图：一条河从左往右流，左边宽、拐个弯、右边窄（自己画的，不是真实的地方）
    const MAPW = 0.205, MAPH = 0.1325, mapTex = canvasTex(1024, 662, () => {});
    const CL = [[-0.02, 0.7, 0.34], [0.14, 0.64, 0.33], [0.3, 0.44, 0.22], [0.44, 0.33, 0.13], [0.58, 0.39, 0.075], [0.74, 0.44, 0.06], [0.88, 0.4, 0.068], [1.02, 0.35, 0.07]];          // 河的中线（u, v）和宽度（按画布高）
    const along = (t) => {          // Catmull-Rom：中线上 t（0—1）处的 [u, v, 宽度]
      const n = CL.length - 1, f = clamp(t, 0, 1) * n, i = Math.min(n - 1, Math.floor(f)), s = f - i;
      const p0 = CL[Math.max(0, i - 1)], p1 = CL[i], p2 = CL[i + 1], p3 = CL[Math.min(n, i + 2)];
      return [0, 1, 2].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * s + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * s * s + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * s * s * s));
    };
    const SEC_T = { 甲: 0.13, 乙: 0.35, 丙: 0.67, 丁: 0.85 };
    const secLine = (n, Wc, Hc) => {          // 一个横截面在图上的那条线：垂直于中线，两头伸出河岸一点
      const t = SEC_T[n], [u, v, w] = along(t), [u1, v1] = along(t + 0.01), dx = (u1 - u) * Wc, dy = (v1 - v) * Hc, l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l, r = (w * Hc) / 2 + 26;
      return { x0: u * Wc - nx * r, y0: v * Hc - ny * r, x1: u * Wc + nx * r, y1: v * Hc + ny * r, lx: u * Wc + nx * (r + 34), ly: v * Hc + ny * (r + 34) };
    };
    const drawMap = () => {
      const c = mapTex.image, g = c.getContext('2d'), Wc = c.width, Hc = c.height;
      g.fillStyle = '#fbf8ef'; g.fillRect(0, 0, Wc, Hc);
      const top = [], bot = [];
      for (let i = 0; i <= 80; i++) { const t = i / 80, [u, v, w] = along(t), [u1, v1] = along(Math.min(1, t + 0.01)), [u0, v0] = along(Math.max(0, t - 0.01)), dx = (u1 - u0) * Wc, dy = (v1 - v0) * Hc, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, r = (w * Hc) / 2; top.push([u * Wc + nx * r, v * Hc + ny * r]); bot.push([u * Wc - nx * r, v * Hc - ny * r]); }
      g.beginPath(); top.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); [...bot].reverse().forEach(([x, y]) => g.lineTo(x, y)); g.closePath(); g.fillStyle = '#d3e7f3'; g.fill();
      g.strokeStyle = '#5b93bd'; g.lineWidth = 4; for (const side of [top, bot]) { g.beginPath(); side.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
      // 水流方向：中线上一段带箭头的线
      g.strokeStyle = '#3f7fb3'; g.lineWidth = 4; g.beginPath(); for (let i = 0; i <= 20; i++) { const [u, v] = along(0.4 + i * 0.01); if (i) g.lineTo(u * Wc, v * Hc); else g.moveTo(u * Wc, v * Hc); } g.stroke();
      { const [u, v] = along(0.6), [u0, v0] = along(0.59), a = Math.atan2((v - v0) * Hc, (u - u0) * Wc); g.save(); g.translate(u * Wc, v * Hc); g.rotate(a); g.fillStyle = '#3f7fb3'; g.beginPath(); g.moveTo(14, 0); g.lineTo(-12, -11); g.lineTo(-12, 11); g.closePath(); g.fill(); g.restore(); }
      for (const n of NAMES) {
        const L1 = secLine(n, Wc, Hc), cur = S?.sec === n, seen = S?.seen?.[n];
        g.strokeStyle = cur ? '#c8342a' : '#2a3040'; g.lineWidth = cur ? 8 : 4; g.beginPath(); g.moveTo(L1.x0, L1.y0); g.lineTo(L1.x1, L1.y1); g.stroke();
        g.fillStyle = cur ? '#c8342a' : seen ? '#2f6fa8' : '#2a3040'; g.font = `700 ${cur ? 62 : 54}px "Songti SC", "STSong", serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n, L1.lx, L1.ly);
      }
      g.fillStyle = '#2a3040'; g.font = '600 36px "Songti SC", "STSong", serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText('图 2　河流四地过水横截面位置示意', Wc / 2, Hc - 26);
      g.strokeStyle = '#2a3040'; g.lineWidth = 3; g.strokeRect(5, 5, Wc - 10, Hc - 10);
      mapTex.needsUpdate = true;
    };
    const mapCard = easel(MAPW, MAPH, mapTex, { x: -0.13, z: -0.2, ry: 0.12, lift: 0.085 });
    const secPick = Object.fromEntries(NAMES.map((n) => {          // 点那条线、那个字都算
      const L1 = secLine(n, 1024, 662), cu = (L1.x0 + L1.x1 + L1.lx) / 3 / 1024, cv = (L1.y0 + L1.y1 + L1.ly) / 3 / 662;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.032, 0.004), new THREE.MeshBasicMaterial({ visible: false })); m.position.copy(mapCard.onFace(cu, cv)); mapCard.lean.add(m); return [n, m];
    }));

    // 坐标板（课本图 4）：横轴 0—700 米²、纵轴 0—7 米/秒
    const CHW = 0.18, CHH = 0.1626, chartTex = canvasTex(1024, 925, () => {});
    let lastChart = '';
    const drawChart = () => {
      const free = S.mode === 'free', s0 = areaOf(D), v0 = Q / s0;
      const key = `${S.mode}|${NAMES.filter((n) => S.seen[n]).join('')}|${S.curve}|${free ? Math.round(s0) : ''}`;
      if (key === lastChart) return; lastChart = key;
      const c = chartTex.image, g = c.getContext('2d'), Wc = c.width, Hc = c.height, X0 = 150, X1 = Wc - 60, Y0 = Hc - 150, Y1 = 50;
      const X = (s) => X0 + (s / 700) * (X1 - X0), Y = (v) => Y0 - (v / 7) * (Y0 - Y1);
      g.fillStyle = '#fdfcf7'; g.fillRect(0, 0, Wc, Hc);
      if (free) {          // 筑堤束水的时候：哪一段流速冲刷河底、哪一段泥沙淤积（示意）
        g.fillStyle = 'rgba(200,52,42,0.07)'; g.fillRect(X0, Y1, X1 - X0, Y(VC) - Y1);
        g.fillStyle = 'rgba(214,170,60,0.12)'; g.fillRect(X0, Y(VD), X1 - X0, Y0 - Y(VD));
        g.font = '600 30px "Songti SC", serif'; g.textAlign = 'right'; g.textBaseline = 'middle';
        g.fillStyle = 'rgba(170,45,35,0.8)'; g.fillText('冲刷河底（示意）', X1 - 10, Y(6.6));
        g.fillStyle = 'rgba(150,110,30,0.9)'; g.fillText('泥沙淤积（示意）', X1 - 10, Y(0.5));
      }
      g.lineWidth = 1.5; g.setLineDash([8, 8]); g.strokeStyle = 'rgba(70,140,190,0.55)';
      for (let s = 50; s <= 700; s += 50) { g.beginPath(); g.moveTo(X(s), Y0); g.lineTo(X(s), Y1); g.stroke(); }
      for (let v = 0.5; v <= 7; v += 0.5) { g.beginPath(); g.moveTo(X0, Y(v)); g.lineTo(X1, Y(v)); g.stroke(); }
      g.setLineDash([]);
      g.strokeStyle = '#26304a'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(X0, Y1 - 14); g.lineTo(X0, Y0); g.lineTo(X1 + 14, Y0); g.stroke();
      g.fillStyle = '#26304a'; g.font = '600 32px "Times New Roman", serif'; g.textAlign = 'center'; g.textBaseline = 'top';
      for (let s = 0; s <= 700; s += 100) g.fillText(String(s), X(s), Y0 + 10);
      g.textAlign = 'right'; g.textBaseline = 'middle'; for (let v = 1; v <= 7; v++) g.fillText(String(v), X0 - 14, Y(v));
      g.font = '600 31px "Songti SC", serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText('过水横截面面积 / 米²', (X0 + X1) / 2, Y0 + 84);
      g.save(); g.translate(48, (Y0 + Y1) / 2); g.rotate(-Math.PI / 2); g.fillText('流速 /（米/秒）', 0, 0); g.restore();
      g.font = '600 30px "Songti SC", serif'; g.fillText('图 4　过水横截面面积—流速（流量 900 米³/秒）', Wc / 2, Hc - 18);
      if (S.curve) {          // 四个点连起来：流速 = 900 ÷ 面积
        g.strokeStyle = 'rgba(200,52,42,0.8)'; g.lineWidth = 4; g.beginPath();
        for (let s = Q / 7; s <= 700; s += 3) { if (s === Q / 7) g.moveTo(X(s), Y(Q / s)); else g.lineTo(X(s), Y(Q / s)); }
        g.stroke();
      }
      for (const n of NAMES) if (S.seen[n]) {
        const f = FOUR[n], a = areaOf(f), v = Q / a;
        g.fillStyle = '#2f6fa8'; g.beginPath(); g.arc(X(a), Y(v), 13, 0, 7); g.fill();
        g.fillStyle = '#26304a'; g.font = '700 38px "Songti SC", serif'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(n, X(a) + 16, Y(v) - 14);
      }
      if (free) {          // 现在这条河：一直落在曲线上
        const x = X(Math.min(700, s0)), y = Y(Math.min(7, v0));
        g.fillStyle = '#c8342a'; g.beginPath(); g.arc(x, y, 15, 0, 7); g.fill();
        if (v0 > 7) { g.beginPath(); g.moveTo(x, y - 46); g.lineTo(x - 12, y - 24); g.lineTo(x + 12, y - 24); g.closePath(); g.fill(); }
        if (s0 > 700) { g.beginPath(); g.moveTo(x + 46, y); g.lineTo(x + 24, y - 12); g.lineTo(x + 24, y + 12); g.closePath(); g.fill(); }
        g.font = '700 32px "Songti SC", serif'; g.textAlign = 'right'; g.textBaseline = 'alphabetic'; g.fillText('现在', x - 20, y + 36);          // 写在点的左下（曲线凸向原点那一边），不压住甲乙丙丁的字
      }
      chartTex.needsUpdate = true;
    };
    easel(CHW, CHH, chartTex, { x: 0.135, z: -0.2, ry: -0.12, lift: 0.07 });

    // ================= 状态 =================
    const fresh = () => ({ demo: false, mode: 'task1', sec: null, cur: { ...TASK1 }, seen: {}, curve: false, q1: false, q2: false, wide: false, rel: false, why: false, narrowed: false, widened: false, bMin: 600, bMax: 600, scoured: 0, filled: 0, yDeep: null, shu: false });
    S = fresh();
    const D = { ...TASK1 };          // 模型现在画成的样子（点甲乙丙丁时从上一个横截面慢慢变过去）
    let morph = false;

    // 横截面变了：重建土块（带倒梯形的槽）、新淤的泥沙、水体、棱柱体；堤、滩地、尺寸线、标签跟着挪
    let built = '';
    const vNow = () => (S.mode === 'task1' ? 2 : Q / areaOf(D));
    const rebuild = () => {
      const v = vNow(), len = Math.min(L - 0.004, v * KZ), key = `${D.a.toFixed(2)}|${D.b.toFixed(2)}|${D.h.toFixed(3)}|${len.toFixed(4)}|${S.yDeep?.toFixed(4)}|${S.q1}|${S.q2}|${S.mode}`;
      if (key === built) return; built = key;
      const { hb, ha, yb, hg } = geom(D), V2 = (x, y) => new THREE.Vector2(x, y);
      const shp = new THREE.Shape([V2(-XB, 0), V2(XB, 0), V2(XB, YG), V2(hg, YG), V2(ha, yb), V2(-ha, yb), V2(-hg, YG), V2(-XB, YG)]);
      const geo = new THREE.ExtrudeGeometry(shp, { depth: L, bevelEnabled: false }); geo.translate(0, 0, -L / 2);
      const uv = geo.attributes.uv, pos = geo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + XB) / (2 * XB), pos.getY(i) / YG);          // 切面的贴图按土块的大小铺满（不随槽变形）
      if (soil) { soil.geometry.dispose(); soil.geometry = geo; } else { soil = new THREE.Mesh(geo, [capM, bankM]); soil.receiveShadow = true; soil.raycast = () => {}; group.add(soil); }
      // 新淤的泥沙：从冲到过的最深处到现在的河底（筑堤束水时才有）
      const yd = S.yDeep;
      if (sand) { group.remove(sand); sand.geometry.dispose(); sand = null; }
      if (yd != null && yb - yd > 0.0006) {
        const sl = (hb - ha) / (YW - yb), xd = ha - (yb - yd) * sl;          // 槽壁顺着现在的坡往下延
        const sg = new THREE.ExtrudeGeometry(new THREE.Shape([V2(-Math.max(0.0005, xd), yd), V2(Math.max(0.0005, xd), yd), V2(ha, yb - 0.0002), V2(-ha, yb - 0.0002)]), { depth: L + 0.0008, bevelEnabled: false }); sg.translate(0, 0, -L / 2 - 0.0004);
        sand = new THREE.Mesh(sg, sandM); sand.raycast = () => {}; group.add(sand);
      }
      const wgeo = new THREE.ExtrudeGeometry(new THREE.Shape([V2(-hb, YW), V2(-ha, yb + 0.0004), V2(ha, yb + 0.0004), V2(hb, YW)]), { depth: L - 0.0006, bevelEnabled: false }); wgeo.translate(0, 0, -L / 2 + 0.0003);
      if (water) { water.geometry.dispose(); water.geometry = wgeo; } else { water = new THREE.Mesh(wgeo, waterM); water.renderOrder = 2; water.raycast = () => {}; group.add(water); }
      surf.scale.x = hb * 2;
      // 棱柱体：只画顶面（盖在水面上）和上游那一头的横截面；前面就是切面，切面上还是浑水的样子
      const z0 = L / 2 - len, yp = YW + 0.0005, pg = new THREE.BufferGeometry();
      pg.setAttribute('position', new THREE.Float32BufferAttribute([-hb, yp, z0, hb, yp, z0, hb, yp, L / 2, -hb, yp, L / 2, -hb, yp, z0, hb, yp, z0, ha, yb, z0, -ha, yb, z0], 3)); pg.setIndex([0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7]);
      if (prism) { prism.geometry.dispose(); prism.geometry = pg; } else { prism = new THREE.Mesh(pg, prismM); prism.renderOrder = 5; prism.raycast = () => {}; group.add(prism); }
      sweep.geometry.dispose(); sweep.geometry = new THREE.ShapeGeometry(new THREE.Shape([V2(-hb, YW), V2(-ha, yb), V2(ha, yb), V2(hb, YW)]));
      const showQ = S.q1 || S.mode !== 'task1';
      prism.visible = prismLine.visible = sweep.visible = showQ;
      for (const { d, sx } of dikes) d.position.x = sx * (hg + SET);
      grass.forEach((m, i) => { const sx = i ? 1 : -1, x0 = hg + SET + 0.03, w = Math.max(0.001, XB - x0); m.scale.x = w; m.position.x = sx * (x0 + w / 2); });
      // 尺寸线：两头带箭头，引出线连到水面、河底的角上
      const zf = L / 2 + 0.0012, yt = YG + 0.011, ya = yb - 0.007, xh = hb + 0.012, ah = 0.0035, P = [];
      const seg = (x0, y0, x1, y1) => P.push(x0, y0, zf, x1, y1, zf);
      const hdim = (x0, x1, y) => { seg(x0, y, x1, y); seg(x0, y, x0 + ah, y + ah * 0.55); seg(x0, y, x0 + ah, y - ah * 0.55); seg(x1, y, x1 - ah, y + ah * 0.55); seg(x1, y, x1 - ah, y - ah * 0.55); };
      hdim(-hb, hb, yt); seg(-hb, YW + 0.0008, -hb, yt + 0.003); seg(hb, YW + 0.0008, hb, yt + 0.003);
      hdim(-ha, ha, ya); seg(-ha, yb - 0.0008, -ha, ya - 0.003); seg(ha, yb - 0.0008, ha, ya - 0.003);
      seg(xh, YW, xh, yb); seg(xh, YW, xh - ah * 0.55, YW - ah); seg(xh, YW, xh + ah * 0.55, YW - ah); seg(xh, yb, xh - ah * 0.55, yb + ah); seg(xh, yb, xh + ah * 0.55, yb + ah);
      seg(hb + 0.0015, YW, xh + 0.003, YW); seg(ha + 0.0015, yb, xh + 0.003, yb);
      dimLine.geometry.setPositions(P);
      const zb = L / 2 + 0.0016; bedLine.geometry.setPositions([-hg, YG, zb, -ha, yb, zb, -ha, yb, zb, ha, yb, zb, ha, yb, zb, hg, YG, zb]);
      prismLine.geometry.setPositions([-hb, YW, z0, -ha, yb, z0, -ha, yb, z0, ha, yb, z0, ha, yb, z0, hb, YW, z0, hb, YW, z0, -hb, YW, z0, -hb, YW + 0.0006, z0, -hb, YW + 0.0006, L / 2, hb, YW + 0.0006, z0, hb, YW + 0.0006, L / 2]);
      // 标签
      const c = S.cur, s0 = areaOf(c), v0 = S.mode === 'task1' ? 2 : Q / s0;
      tB.text(`河面宽度 b = ${fmt(c.b, 0)} 米`).loc(group, 0, yt + 0.014, zf);
      tA.text(`河底宽度 a = ${fmt(c.a, 0)} 米`).loc(group, 0, ya - 0.011, zf);
      tH.text(`水深 h = ${fmt(c.h, 1)} 米`).loc(group, xh + 0.036, (YW + yb) / 2, zf);
      tS.text(`面积 S = ${fmt(s0, 0)} 米²`).loc(group, -hb - 0.058, (YW + yb) / 2, zf).show(showQ);
      tQ.text(`1 秒流过的水：${fmt(s0, 0)} 米² × ${fmt(v0, 1)} 米${S.q2 || S.mode !== 'task1' ? ` = ${fmt(s0 * v0, 0)} 米³` : ''}`).loc(group, 0, YG + 0.042, L / 2 - len).show(showQ);
    };

    const showSec = (n) => {
      const f = FOUR[n]; S.mode = 'four'; S.sec = n; S.cur = { a: f.a, b: f.b, h: f.h }; S.yDeep = null; morph = true;
      const s0 = areaOf(f), v0 = Q / s0, first = !S.seen[n]; S.seen[n] = true;
      if (first) {
        const cell = (k, x) => (f.given.includes(k) ? String(x) : `<b>${x}</b>`);
        log([n, cell('b', f.b), cell('a', f.a), cell('h', f.h), cell('S', s0), `<b>${fmt(v0, 1)}</b>`]);
        sfx.clink?.({ freq: 700 + NAMES.indexOf(n) * 90, gain: 0.03 });
      }
      const how = {
        甲: '已知河面宽度 600 米、水深 1 米：河底宽度 = 600 ÷ 2 = 300 米，面积 = (300 + 600) ÷ 2 × 1 = <b>450 米²</b>',
        乙: '已知河底宽度 200 米、面积 300 米²：河面宽度 = 200 × 2 = 400 米，水深 = 300 ÷ [(200 + 400) ÷ 2] = <b>1 米</b>',
        丙: '已知河面宽度 100 米、面积 150 米²：河底宽度 = 100 ÷ 2 = 50 米，水深 = 150 ÷ [(50 + 100) ÷ 2] = <b>2 米</b>',
        丁: '已知河底宽度 60 米、水深 2 米：河面宽度 = 60 × 2 = 120 米，面积 = (60 + 120) ÷ 2 × 2 = <b>180 米²</b>',
      }[n];
      const left = NAMES.filter((x) => !S.seen[x]);
      status(`<b>${n}</b>：${how}。流量 900 米³/秒，流速 = 900 ÷ ${s0} = <b>${fmt(v0, 1)} 米/秒</b>——1 秒流过切面的水还是 900 米³，横截面${s0 < 300 ? '小，这一段就拉得长' : '大，这一段就短'}。${left.length ? `还有 ${left.join('、')}。` : '四个点都画到坐标板上了，连起来就是图 4 的曲线。'}`);
      if (!left.length && !S.curve) { S.curve = true; done('four'); if (!S.demo) W?.t3.open(); }
      drawMap();
    };

    const A = {
      section: (n) => showSec(n),
      /** 抓起一道堤：从现在这个横截面接着来（还在图 1 那里就从甲开始，河宽 600 米） */
      grabDike() {
        if (S.mode === 'free') return;
        const from = S.sec ? FOUR[S.sec] : FOUR.甲;
        morph = morph || !S.sec; S.mode = 'free'; S.sec = null; S.cur = { a: from.a, b: from.b, h: from.h }; S.bMin = S.bMax = from.b; S.scoured = S.filled = 0; S.yDeep = geom(S.cur).yb; drawMap();
        status('筑堤束水：把堤往里推，河道收窄；往外放，河道变宽。流量一直是 900 米³/秒。看流速，看河底的泥沙。');
      },
      /** 拖堤：河面宽度 b（米），河底宽度跟着是它的一半；水深先不变，冲刷、淤积慢慢改 */
      setB(b) {
        if (S.mode !== 'free') return;
        S.cur.b = clamp(b, 100, 600); S.cur.a = S.cur.b / 2;
        if (S.cur.b < S.bMin) { S.bMin = S.cur.b; S.filled = 0; }          // 推到更窄、放到更宽：冲了多少、淤了多少从这时候重新算
        if (S.cur.b > S.bMax) { S.bMax = S.cur.b; S.scoured = 0; }
      },
      reset() {
        W?.ui?.relock?.(); S = fresh(); Object.assign(D, TASK1); morph = false; built = ''; lastChart = ''; drawMap();
        if (W) { W.tbl.clear(); for (const t of [W.t1, W.t2, W.t2b, W.t3, W.t4]) t.close(); W.next.hidden = true; W.t1.open(); }
        bar.undo('area', 'four', 'shu', 'why'); status('全部重来：又回到图 1 那个横截面。');
      },
    };

    // ================= 拖、点 =================
    const tip = tag('', 'pill');
    const drag = draggable(group, dikes.map((k) => ({
      obj: k.pick, plane: 'xz', offset: YG, keepOffset: true, anchor: k.d, hint: '拖着堤：往里推（筑堤束水），或往外放',
      onStart: () => A.grabDike(),
      onDrag: (p) => A.setB(bAtDike(p.x, S.cur.h)),
    })), { tip, taps: NAMES.map((n) => ({ obj: secPick[n], hint: `点一下：看${n}处的横截面`, onTap: () => A.section(n) })) });
    const act = demoActs(drag, group);

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'area', title: '面积和流量', todo: '垂直于水流方向切开，水面线与河底线围成的水体部分就是过水横截面（图 1）。读出河底宽度、河面宽度、水深，在左边算面积；再算这处的流量。' },
        { id: 'four', title: '甲乙丙丁', todo: '点左边示意图上的<b>甲、乙、丙、丁</b>：模型换成那里的横截面，表 1 补上，坐标板上一个个点出来（流量都是 900 米³/秒）。', target: () => { const n = NAMES.find((x) => !S.seen[x]); return n ? secPick[n] : null; } },
        { id: 'shu', title: '筑堤束水', todo: '拖着两岸的<b>堤</b>往里推，把河道收窄，看流速和河底；再往外放，看泥沙会不会停下来。', target: () => dikes[1].d },
        { id: 'why', title: '想一想', todo: '在左边用流速和过水横截面面积的关系，说说“束水攻沙”的道理。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => {
            morph = true; built = ''; lastChart = ''; drawMap();
            if (S.demo) W?.status('老师演示中：看画面下面的字幕。你刚才的操作先存着，演示完放回来。'); else if (said) W?.status(said);
          } }),
          shots: [
            { cap: '垂直于水流方向切开，水面线与河底线围成的水体部分就是过水横截面（图 1）：河底宽度 60 米、河面宽度 100 米、水深 3 米，面积 = (60 + 100) ÷ 2 × 3 = 240 米²。', dur: 6, during: act.at(0.5, () => { S.q1 = true; }) },
            { cap: '亮出来的这一段水，1 秒钟全部流过切面：流速 2 米/秒，1 秒走 2 米。1 秒通过的水体体积是 480 米³，流量 = 240 × 2 = 480 米³/秒。', dur: 6, during: act.at(0.15, () => { S.q2 = true; }) },
            { cap: '点甲、乙、丙、丁：流量都是 900 米³/秒。横截面小，1 秒流过的那段水就拉得长——流得快。四个点连成图 4 的曲线。', dur: 12, during: act.seq(act.tap(secPick.甲, 0.05), act.tap(secPick.乙, 0.29), act.tap(secPick.丙, 0.53), act.tap(secPick.丁, 0.77)) },
            { cap: '回到甲：河宽 600 米，流速 2 米/秒。筑堤束水——把堤往里推，在流量保持不变、刚收窄且水深暂不变时，面积减小、平均流速增大；随后河底的泥沙被冲起来带走，河床变深。', dur: 11, during: act.seq(act.tap(secPick.甲, 0.02), act.drag(dikes[1].pick, () => new THREE.Vector3(dikeAt(130, S.cur.h), YG, 0), { from: () => dikes[1].d.position.clone(), t0: 0.16, t1: 0.42, release: 0.44 })) },
            { cap: '再把堤往外放：河道变宽，流速变小，泥沙停下来，河床淤高（浅黄色的是新淤的泥沙）。', dur: 9, during: act.drag(dikes[1].pick, () => new THREE.Vector3(dikeAt(560, S.cur.h), YG, 0), { from: () => dikes[1].d.position.clone(), t0: 0.05, t1: 0.35, release: 0.37 }) },
            { cap: '“水合则势猛，势猛则沙刷，沙刷则河深”——这就是束水攻沙。演示完了，下面换你自己来。', dur: 5 },
          ],
        },
      },
    });
    const pointer = {
      items: drag.items,
      down(ray, e) { if (bar.playing) { bar.stop(); return true; } return drag.down(ray, e); },
      move: (ray, e) => drag.move(ray, e),
      up: (ray, e) => drag.up(ray, e),
    };

    // ================= 每帧 =================
    let sweepT = 0;
    const step = (dt) => {
      const c = S.cur;
      // 筑堤束水：流速大于门槛，河底被冲深；小于门槛，泥沙停下来、河底淤高（示意）
      if (S.mode === 'free') {
        const v = Q / areaOf(c), dh = v > VC ? KBED * (v - VC) * dt : v < VD ? -0.8 * KBED * (VD - v) * dt : 0;
        if (dh) { c.h = clamp(c.h + dh, 0.4, 4.2); if (dh > 0) S.scoured += dh; else S.filled -= dh; }
        // 真的往里推窄了（比这一回最宽的时候窄 200 米以上），河底也冲深了
        if (!S.narrowed && c.b <= 200 && S.bMax - c.b >= 200 && S.scoured > 0.3) { S.narrowed = true; status(`河道收窄到 ${fmt(c.b, 0)} 米：在流量保持不变、刚收窄且水深暂不变时，面积减小，平均流速增大；随后河底的泥沙被冲起来带走，<b>河床变深了</b>。在本模型中，流量保持不变。河床冲深后，过水横截面面积增大，平均流速比刚束窄时有所回落。再把堤往外放试试。`); }
        if (S.narrowed && !S.widened && c.b - S.bMin >= 250 && S.filled > 0.15) { S.widened = true; status(`河道放宽到 ${fmt(c.b, 0)} 米：面积变大，流速变小，水里的泥沙停下来，<b>河床淤高了</b>（浅黄色的是新淤的泥沙）。`); }
        if (S.narrowed && S.widened && !S.shu) { S.shu = true; done('shu'); if (!S.demo) W?.t4.open(); }
      }
      // 模型跟上：点甲乙丙丁时慢慢变过去，拖堤、冲淤时直接跟着
      if (morph) { let far = 0; for (const k of ['a', 'b', 'h']) { D[k] += (c[k] - D[k]) * Math.min(1, dt * 5); far = Math.max(far, Math.abs(c[k] - D[k]) / Math.max(1, c[k])); } if (far < 0.002) { morph = false; Object.assign(D, { a: c.a, b: c.b, h: c.h }); } }
      else Object.assign(D, { a: c.a, b: c.b, h: c.h });
      const g0 = geom(D);
      if (S.mode === 'free') S.yDeep = Math.min(S.yDeep ?? g0.yb, g0.yb);
      rebuild(); drawChart();
      // 水面的流纹、水里的泥沙：模型里 1 秒走“流速 × 1 秒”那么远
      const v = vNow(), spd = v * KZ, { hb, ha, yb } = g0;
      flowTex.offset.y += (dt * spd) / L;
      const scour = S.mode === 'free' && v > VC, settle = S.mode === 'free' && v < VD;
      siltPts.geometry.setDrawRange(0, scour ? NS : NB);
      for (let i = 0; i < NS; i++) {
        const p = silt[i], extra = i >= NB;
        p.z += dt * spd * p.k * (1.05 - 0.35 * p.d);          // 靠近水面的流得快一点
        if (settle && !extra) p.d = Math.min(1, p.d + dt * (VD - v) * 0.22);
        if (extra) p.d = Math.max(0.35, p.d - dt * 0.5 * (0.6 + p.k));          // 从河底卷起来
        if (p.z > L / 2 || (settle && !extra && p.d >= 1)) { p.z = -L / 2 + Math.random() * 0.02; p.u = Math.random() * 2 - 1; p.d = extra ? 1 : settle ? Math.random() * 0.5 : Math.random(); }
        const y = YW - (YW - yb) * (0.04 + 0.92 * p.d), half = (ha + (hb - ha) * (1 - p.d)) * 0.92;
        sp[i * 3] = p.u * half; sp[i * 3 + 1] = y; sp[i * 3 + 2] = p.z;
      }
      siltPts.geometry.attributes.position.needsUpdate = true;
      // 那一片亮的水面：1 秒从棱柱体的上游一头走到切面，停一下再来
      if (sweep.visible) {
        sweepT = (sweepT + dt) % 1.7; const len = Math.min(L - 0.004, v * KZ), u = Math.min(1, sweepT);
        sweep.position.z = L / 2 - len * (1 - u) + 0.0004; sweep.material.opacity = sweepT < 1 ? 0.42 * Math.sin(Math.PI * Math.min(1, u * 1.15)) + 0.06 : 0;
      }
    };

    drawMap(); rebuild(); drawChart();

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.5, d: 0.5, h: 0.24 },
      view: { elev: 20, azim: 7, lookY: 0.35, frameMargin: 1.06 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const t1 = think({ title: '想一想', status,
          q: '任务一：图 1 那处，河底宽度 60 米、河面宽度 100 米、水深 3 米。过水横截面面积是多少？',
          options: ['(60 + 100) ÷ 2 × 3 = 240 米²', '60 × 100 = 6 000 米²', '(60 + 100) × 3 = 480 米²'],
          wrong: ['过水横截面是倒梯形：面积 = (上底 + 下底) × 高 ÷ 2。上底是河面宽度 100 米，下底是河底宽度 60 米，高是水深 3 米。', '梯形面积还要除以 2：(60 + 100) × 3 ÷ 2。'],
          ok: '对：S = (60 + 100) ÷ 2 × 3 = 240 米²。',
          onOk: () => { S.q1 = true; t2.open(); status('对：S = (60 + 100) ÷ 2 × 3 = 240 米²。模型里亮出来的一段水，是 <b>1 秒钟流过切面的水</b>：流速 2 米/秒，1 秒走 2 米，这一段就是以横截面为底、长 2 米的“棱柱”（课本图 3）。它有多少立方米？在左边算流量。'); } });
        const t2 = think({ title: '想一想', status,
          q: '任务三（1）：流量（Q）是过水横截面面积（S）与流速（v）的乘积。河水以 2 米/秒的平均流速流过这个横截面，流量是多少？',
          options: ['240 × 2 = 480 米³/秒', '240 ÷ 2 = 120 米³/秒', '240 + 2 = 242 米³/秒'],
          wrong: ['流量是面积和流速的乘积，不是相除：1 秒流过的那一段水，底面 240 米²、长 2 米。', '面积和流速要相乘：1 秒流过的那一段水，体积 = 底面积 × 长 = 240 × 2。'],
          ok: '对：Q = S × v = 240 × 2 = 480 米³/秒。1 秒通过的水体体积是 480 米³，流量是 480 米³/秒。下面点左边示意图上的<b>甲、乙、丙、丁</b>：流量都是 900 米³/秒，看横截面变了，流速怎么变。',
          onOk: () => { S.q2 = true; done('area'); } });
        const t2b = think({ title: '想一想', status,
          q: '任务二：看表 1，甲和乙水深都是 1 米，丙和丁水深都是 2 米。水深一样时，河面越宽，过水横截面面积怎样？',
          options: ['越大', '越小', '不变'],
          wrong: ['甲河面宽 600 米，面积 450 米²；乙河面宽 400 米，面积 300 米²：河面宽的面积大。', '面积 = (河底宽度 + 河面宽度) ÷ 2 × 水深：水深一样时，河面越宽（河底也跟着宽），面积越大。'],
          ok: '对：过水横截面面积跟河宽、水深有关——河越宽、水越深，面积越大。河道刚收窄、水深暂不变时，过水横截面面积减小。',
          onOk: () => { S.wide = true; } });
        const t3 = think({ title: '想一想', status,
          q: '任务三（3）：流量都是 900 米³/秒。看坐标板上连出来的曲线，河流流速和过水横截面面积是什么关系？',
          options: ['在流量保持不变时，过水横截面面积越小，断面平均流速越大', '过水横截面面积越大，流速越大', '流速和过水横截面面积没有关系'],
          wrong: ['看坐标板：面积最大的甲（450 米²）流速最小，只有 2 米/秒；面积最小的丙（150 米²）流速最大，6 米/秒。', '四个点高低不一样：面积不同，流速也不同。流量不变时，流速 = 900 ÷ 面积。'],
          ok: '对：在流量保持不变时，过水横截面面积越小，断面平均流速越大；断面平均流速 = 流量 ÷ 过水横截面面积——1 秒流过的水一样多，横截面小，这一段水就得拉得更长。',
          onOk: () => { S.rel = true; if (!S.wide) t2b.open(); finish(); } });
        const t4 = think({ title: '想一想', status,
          q: '任务四（2）：河流的流速越大，搬运和冲刷泥沙的能力就越强。用流速和过水横截面面积的关系，说说“束水攻沙”的道理。',
          options: ['在流量保持不变、河道刚收窄且水深尚未明显改变时，过水横截面面积减小，平均流速增大，冲刷和搬运泥沙的能力增强。在本演示的条件下，河底泥沙被带走，河床逐渐冲深', '筑堤把河道收窄，水流变慢，泥沙沉到河底', '筑堤是为了让河水漫到两岸去'],
          wrong: ['本模型流量保持不变，刚收窄且水深暂不变时，面积减小，平均流速增大；泥沙被冲起来带走，不是沉下去。', '“水不奔溢于两旁”：堤正是挡着水、不让它漫到两岸，把水束在河道里冲刷河底。'],
          ok: '对：“水合则势猛，势猛则沙刷，沙刷则河深”——在流量保持不变、刚收窄且水深暂不变时，面积减小，平均流速增大，冲沙能力增强；随后在本演示条件下，河床逐渐冲深；“水分则势缓，势缓则沙停，沙停则河饱”——河道宽了，流速小，泥沙停下来，河床淤高。',
          onOk: () => { S.why = true; finish(); } });
        const finish = () => { if (S.rel && S.why) { done('why'); next.hidden = false; } };
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '对照课本原文 →');
        const tbl = table(['四地', '河面宽度/米', '河底宽度/米', '水深/米', '面积/米²', '流速/(米/秒)'], { note: '加粗的是算出来的格（课本表 1 里空着的），流速按流量 900 米³/秒算。' });
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：垂直于水流方向切开，水面线与河底线围成的水体部分就是过水横截面，不包括两岸和河床土体。这里的流速是断面平均流速，并非水中各处速度都相同。表 1 的数据照课本（河底宽度 = 河面宽度的 1/2），流量按 900 米³/秒。筑堤束水那一步里河底宽度也取河面宽度的一半；冲刷、淤积的门槛和快慢是教学示意（流速大于约 3.2 米/秒冲刷，小于约 2.4 米/秒淤积），时间加快了。这些冲刷、淤积门槛仅用于演示，不是黄河的实测统一标准；真实冲淤还和泥沙供给有关。模型横、竖、顺着河三个方向的比例不一样（竖直放大约 30 倍；顺着河按 1 秒流过的路程画），课本图 1 也注明“水平方向与垂直方向非等比例”。河段示意图是画的，不是真实的地方。' });
        ui.controls.append(t1.el, t2.el, t2b.el, t3.el, t4.el, next, more, note);
        ui.data.append(tbl.el);
        const dtl = ui.data.previousElementSibling; if (dtl?.classList.contains('bar-title')) dtl.textContent = '表 1　河流四地的横截面';
        W = { ui, tbl, t1, t2, t2b, t3, t4, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        t1.open();
        status('图 1：河流的过水横截面近似倒梯形。垂直于水流方向切开，水面线与河底线围成的水体部分就是过水横截面。先读出河底宽度、河面宽度、水深，在左边算它的面积；可以先看<b>老师演示</b>，也可以直接动手。');
      },
      update(dt) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k); },
      dispose() { bar.dispose(); for (const t of [tip, tB, tA, tH, tS, tQ]) t.remove(); },
      debug: { get S() { return S; }, A, bar, D,
        qa: qaFlow(drag, [
          { name: '答面积', run: () => W.t1.el.querySelector('button').click() },
          { name: '答流量', run: () => W.t2.el.querySelector('button').click() },
          ...NAMES.map((n) => ({ name: `点${n}`, tap: secPick[n], wait: 0.8 })),
          { name: '答关系', run: () => W.t3.el.querySelector('button').click() },
          { name: '答宽度', run: () => W.t2b.el.querySelector('button').click() },
          { name: '回到甲', tap: secPick.甲, wait: 1.5 },
          { name: '堤往里推', drag: dikes[1].pick, to: () => new THREE.Vector3(dikeAt(130, S.cur.h), YG, 0), wait: 5 },
          { name: '堤往外放', drag: dikes[1].pick, to: () => new THREE.Vector3(dikeAt(560, S.cur.h), YG, 0), wait: 5 },
          { name: '答道理', run: () => W.t4.el.querySelector('button').click() },
        ]) },
    };
  },
};
