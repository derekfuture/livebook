// 课题1 分子和原子 · 探究 分子运动现象（课本第 58 页 图 3-4；实验 3-1 品红扩散、“热水扩散更快”见第 56–57 页）。
//
// 步骤（课本）：（1）小烧杯 A 里 20 mL 蒸馏水，滴入 5~6 滴酚酞溶液，搅拌均匀，看颜色（无色）；
//   （2）从 A 中取少量溶液放进试管，慢慢滴加浓氨水，看颜色变化（变红）；
//   （3）另取小烧杯 B，加 5 mL 浓氨水；用一个大烧杯罩住 A 和 B。观察几分钟：A 从液面开始变红，B 不变。
// 记录表照课本：实验编号 / 现象 / 分析。
//
// 看不见的东西：氨分子（绿点，新的概念色——不和蓝 = 氧气、深灰 = 二氧化碳、橙 = 热冲突，也和酚酞的红分得开）。
//   每个点做真正的随机运动（带一点惯性的布朗运动，Ornstein–Uhlenbeck 速度过程），长时间的扩散系数取氨在空气中的实测值
//   约 0.22 cm²/s。碰到玻璃反弹，碰到 A（或 C）的液面就溶进去，碰回 B 的液面就回到 B 里。
//   B 液面附近的点密度按浓氨水上方氨的分压约 30 kPa 标定（c = p/RT ≈ 12 mol/m³）→ 每个点约 7.5×10⁻⁶ mol（约 4.5×10¹⁸ 个分子）。
//   这样算出来，罩上以后约 2–4 分钟第一批氨分子跑进 A——和课本“观察几分钟”一致，不是凑的。
// A 里的红色：液体分成 40 层，溶进来的氨在水里往下扩散（有效扩散系数约 2×10⁻⁸ m²/s：分子扩散 1.7×10⁻⁹ 加上液面的微弱对流，近似）；
//   每层按氨的电离（Kb = 1.8×10⁻⁵，先扣掉蒸馏水里溶的二氧化碳约 1.3×10⁻⁵ mol/L）算碱性，酚酞（pKa 约 9.4，pH 约 8.2 起变红）的红色深浅照算。
//   所以红色先出现在液面，再慢慢往下变深；搅拌一下就全杯均匀。
// 时间加快 30 倍。
// 巧思：罩子外再放一杯酚酞溶液 C（对照：C 不变红，说明不是空气让它变红）；不罩大烧杯 / 中途拿开：氨分子跑散到整个空间。
import * as THREE from 'three';
import { seg } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { textPlate } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { chemBeaker, testTube, glassMat, CHEM } from './kit/chem.js';
import { water2 } from './kit/chemfx.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, mountXuean, moreBox, varyBox, demoActs } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked, glassEdge } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const SPEED = 30;                                   // 时间加快倍数
const D_AIR = 2.2e-5, TAU = 3;                      // 氨在空气中的扩散系数（m²/s）；速度“记忆”时间（实验时间，秒）
const SV = Math.sqrt(D_AIR / TAU);                  // 每个方向的速度涨落（m/s）
const EMIT = 3;                                     // B 液面每秒（实验时间）冒出的点数
const Q = 7.5e-6;                                   // 每个点代表的氨（mol）
const D_LIQ = 2e-8;                                 // 氨在水里往下走的有效扩散系数（m²/s）：分子扩散约 1.7×10⁻⁹，液面蒸发降温引起的微弱对流让它快约 10 倍（近似）
const KB = 1.8e-5, C_ACID = 1.3e-5, PKA = 9.4;
const DROP_NH3 = 0.05 * 13.4e-3;                    // 一滴浓氨水（0.05 mL × 13.4 mol/L）里的氨（mol）
const NL = 40;                                      // A、C 的液体分层
const MAXW = 650;

const BR = 0.022, BH = 0.055, RI = BR - 0.0012;     // 小烧杯（约 50 mL）
const RW = BR - 0.0005;                             // 点碰壁的半径
const BIG_R = 0.05, BIG_H = 0.13;                   // 大烧杯（罩子）
const BELL_RI = BIG_R - 0.0025, BELL_HI = BIG_H - 0.003;
const AX = 0.025, BX = -0.025, CX = 0.112, CZ = -0.035;
const BELL_HOME = new THREE.Vector3(-0.17, 0, 0);
const TUBE = new THREE.Vector3(0.175, 0.006, 0), T_R = 0.0075, T_LEN = 0.1;
const PH_BOT = new THREE.Vector3(0.1, 0, 0.095), NH_BOT = new THREE.Vector3(-0.085, 0, 0.095);
const CYL = new THREE.Vector3(-0.13, 0, 0.09), CYL_R = 0.0065, CYL_H = 0.088;
const ROD_HOME = new THREE.Vector3(0.05, 0.0025, 0.125);
const NH3C = 0x1f9e6a, NH3_DARK = 0x0b5e3c, PINK = [224, 40, 130];
const levelOf = (mL) => 0.0012 + (mL * 1e-6) / (Math.PI * RI * RI);
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const gauss = () => { const u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
// 一层溶液里酚酞的“红色程度”（0–1）：c 是氨的浓度（mol/L）
const redOf = (c) => {
  const b = c - C_ACID; if (b <= 0) return 0;
  const oh = (-KB + Math.sqrt(KB * KB + 4 * KB * b)) / 2;
  const pH = 14 + Math.log10(Math.max(oh, 1e-7));
  return 1 / (1 + 10 ** (PKA - pH));
};

export default {
  id: 'ammonia',
  fig: '图3-4',
  title: '分子运动现象',
  stampText: '探究',
  style: 'paper',
  predict: {
    q: '用大烧杯罩住 A（无色的酚酞溶液）和 B（浓氨水）。两杯液体并没有接触。几分钟后——',
    hint: '课本第 58 页“探究”的信息：氨（NH₃）易溶于水，能使无色的酚酞溶液变成红色。',
    options: ['A 变红，B 不变', 'B 变红，A 不变', 'A、B 都不变（两杯没有接触）'],
    answer: 0,
  },
  need: '在 A 里滴酚酞、搅拌；取少量到试管里滴加浓氨水；B 里加浓氨水，用大烧杯罩住 A 和 B，观察几分钟；再想一想',
  conclusion: {
    crops: [{ page: 63, rect: [62, 405, 266, 578] }],
    quote: '微观粒子（如分子）总是在不断运动着。花香在空气中的扩散、湿衣服中的水在晾晒时的挥发、蔗糖在水中的溶解及品红在水中的扩散都是分子运动的结果。在实验 3-1 中，如果使用的是热水，品红的扩散会更快一些。这是因为在受热的情况下，分子能量增大，运动加快。',
    why: 'B 里浓氨水中的氨分子在<b>不断地运动</b>，一部分从液面跑出来，在大烧杯里到处乱跑；有的跑进 A，溶于水，使 A 中的酚酞溶液变红。B 里没有酚酞，所以 B 不变色。如果在罩子外再放一杯酚酞溶液 C，它不变红：使 A 变红的不是空气，而是从 B 跑过来的氨分子。大烧杯把氨分子“关”在里面，不让它们跑散到整个房间。<br>氨分子跑得很快（平均每秒约 600 m），但每秒要和空气分子碰撞几十亿次，方向不停地变，所以从 B 走到 A 要几分钟。',
    src: '课本第 56–58 页 · 第三单元 课题1 分子和原子（探究 分子运动现象）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null;
    const near = (v, d, dist) => { if (S.demo) return; S.near = true; look([v.x, v.y, v.z], d || [0.05, 0.22, 1], dist || 0.34, () => { S.near = false; }); };
    const far = () => { if (S.near) { S.near = false; back(); } };
    paperSheet(group, { w: 0.6, d: 0.3, x: 0, z: 0.04 });

    // ================= 小烧杯 A、B、C =================
    // A 的液体上叠一层“红色”：竖着的 40 层，每层的红色深浅写进一张 1×40 的贴图
    const pinkLayer = () => {
      const data = new Uint8Array(NL * 4);
      const tex = new THREE.DataTexture(data, 1, NL, THREE.RGBAFormat); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
      const side = new THREE.Mesh(new THREE.CylinderGeometry(RI - 0.0004, RI - 0.0004, 1, 32, 1, true), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      side.geometry.translate(0, 0.5, 0); side.position.y = 0.0012; side.renderOrder = 8;
      const top = new THREE.Mesh(new THREE.CircleGeometry(RI - 0.0004, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(`rgb(${PINK.join(',')})`), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      top.rotation.x = -Math.PI / 2; top.renderOrder = 8;
      const g = new THREE.Group(); g.add(side, top);
      return Object.assign(g, {
        set(level, f) {       // f：每层的红色程度（0 底 … NL-1 液面）
          side.scale.y = Math.max(0.0005, level - 0.0012); top.position.y = level - 0.0002;
          for (let i = 0; i < NL; i++) { data.set(PINK, i * 4); data[i * 4 + 3] = Math.round(255 * Math.min(1, f[i]) * 0.88); }
          tex.needsUpdate = true; top.material.opacity = Math.min(1, f[NL - 1]) * 0.85;
        },
      });
    };
    const label = (txt, w = 0.012) => { const m = textPlate(txt, { w, h: 0.012, font: 'bold 300px "Songti SC", serif' }); return m; };
    // A：可以端起来往试管里倒（holder 的原点在倾倒嘴上，绕它倾斜）
    const aHolder = new THREE.Group(), aWrap = new THREE.Group(); aHolder.add(aWrap); group.add(aHolder);
    const bkA = chemBeaker({ r: BR, h: BH, level: levelOf(20), color: 0xdcebf0 }); bkA.rotation.y = Math.PI; aWrap.add(bkA);      // 倾倒嘴朝右（朝试管）
    const pinkA = pinkLayer(); aWrap.add(pinkA);
    const labA = label('A'); labA.position.set(0, 0.038, BR + 0.0008); aWrap.add(labA);
    const aPick = new THREE.Mesh(new THREE.CylinderGeometry(BR + 0.003, BR + 0.003, BH + 0.006, 12), new THREE.MeshBasicMaterial({ visible: false })); aPick.position.y = BH / 2; aPick.userData.pick = true; aWrap.add(aPick);
    aWrap.position.set(-(BR + 0.003), -BH, 0);
    const A_HOME = new THREE.Vector3(AX + BR + 0.003, BH, 0);
    const bkB = chemBeaker({ r: BR, h: BH, level: 0, color: 0xe3eef0 }); bkB.position.set(BX, 0, 0); group.add(bkB);
    const labB = label('B'); labB.position.set(0, 0.038, BR + 0.0008); bkB.add(labB);
    const bkC = chemBeaker({ r: BR, h: BH, level: levelOf(20), color: 0xdcebf0 }); bkC.position.set(CX, 0, CZ); group.add(bkC);
    const pinkC = pinkLayer(); bkC.add(pinkC);
    const labC = label('C'); labC.position.set(0, 0.038, BR + 0.0008); bkC.add(labC);

    // ================= 大烧杯（罩子）：flip 的原点在杯子半高处，翻过来还在桌面以上 =================
    const bell = new THREE.Group(), flip = new THREE.Group(); bell.add(flip); group.add(bell);
    flip.position.y = BIG_H / 2;
    const big = chemBeaker({ r: BIG_R, h: BIG_H, level: 0 }); big.position.y = -BIG_H / 2; big.children[1].visible = false; flip.add(big);   // 倒扣时倾倒嘴会碰到桌面：不画
    const bellPick = new THREE.Mesh(new THREE.CylinderGeometry(BIG_R + 0.003, BIG_R + 0.003, BIG_H + 0.004, 14), new THREE.MeshBasicMaterial({ visible: false })); bellPick.userData.pick = true; flip.add(bellPick);

    // ================= 试管（在试管架上） =================
    const tube = testTube({ r: T_R, len: T_LEN }); tube.position.copy(TUBE); group.add(tube);
    // 试管架：底板、两根立柱、上面一块带孔的横板（前面空着，看得见试管里的溶液）
    const rack = new THREE.Group(); rack.position.set(TUBE.x, 0, 0); group.add(rack);
    for (const [w, hh, d, x, y] of [[0.044, 0.005, 0.03, 0, 0.0025], [0.004, 0.06, 0.03, -0.02, 0.03], [0.004, 0.06, 0.03, 0.02, 0.03], [0.044, 0.004, 0.03, 0, 0.062]]) {
      const m = inked(new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), paint(CHEM.wood)), { width: 0.7 }); m.position.set(x, y, 0); rack.add(m);
    }
    const tLiq = new THREE.Mesh(new THREE.CylinderGeometry(T_R - 0.0006, T_R - 0.0006, 1, 18), water2({ color: 0xdcebf0, base: 0.4 })); tLiq.geometry.translate(0, 0.5, 0); tLiq.position.y = 0.002; tLiq.renderOrder = 7; tube.add(tLiq);
    const tPink = new THREE.Mesh(new THREE.CylinderGeometry(T_R - 0.0009, T_R - 0.0009, 1, 18), new THREE.MeshBasicMaterial({ color: new THREE.Color(`rgb(${PINK.join(',')})`), transparent: true, opacity: 0, depthWrite: false })); tPink.geometry.translate(0, 0.5, 0); tPink.position.y = 0.002; tPink.renderOrder = 8; tube.add(tPink);
    const T_MOUTH = TUBE.clone().add(new THREE.Vector3(0, T_LEN, 0));
    const tubeLevel = (mL) => 0.002 + (mL * 1e-6) / (Math.PI * (T_R - 0.0006) ** 2);
    // 烧杯 A 往试管里倒：杯嘴（aHolder 的原点）从试管口左上方 A_SAFE 一边斜过来一边挪到 A_POUR——杯嘴挨着试管口，杯身不碰试管
    const A_SAFE = T_MOUTH.clone().add(new THREE.Vector3(-0.013, 0.019, 0)), A_POUR = T_MOUTH.clone().add(new THREE.Vector3(-0.004, 0.0005, 0)), A_TILT = 1.25;

    // ================= 滴瓶（酚酞溶液、浓氨水）和滴管 =================
    const dropBottle = (pos, { brown, text }) => {
      const g = new THREE.Group(); g.position.copy(pos); group.add(g);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.04, 24), glassMat({ opacity: brown ? 0.3 : 0.18, color: brown ? 0xa9774f : 0xffffff })); body.position.y = 0.02; body.renderOrder = 9; glassEdge(body, 0.0007);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.0058, 0.011, 0.007, 20), glassMat({ opacity: brown ? 0.3 : 0.18, color: brown ? 0xa9774f : 0xffffff })); neck.position.y = 0.0435; neck.renderOrder = 9; glassEdge(neck, 0.0006);
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0115, 0.024, 20), water2({ color: 0xe0ecef, base: 0.36 })); liq.position.y = 0.0135; liq.renderOrder = 7;
      const lab = textPlate(text, { w: 0.024, h: 0.008, bg: 'rgba(253,251,245,0.95)', font: 'bold 120px "Songti SC", serif' }); lab.position.set(0, 0.022, 0.0135);
      g.add(body, neck, liq, lab);
      return g;
    };
    const dropper = () => {
      const g = new THREE.Group();          // 原点在滴管尖
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.0024, 0.0011, 0.046, 14), glassMat({ opacity: 0.3 })); glass.geometry.translate(0, 0.023, 0); glass.renderOrder = 9; glassEdge(glass, 0.0005);
      const collar = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0068, 0.0068, 0.005, 18), paint(CHEM.rubber)), { width: 0.7 }); collar.position.y = 0.0435;
      const bulb = inked(new THREE.Mesh(new THREE.SphereGeometry(0.0055, 16, 12), paint(CHEM.rubber)), { width: 0.8 }); bulb.scale.set(1, 1.55, 1); bulb.position.y = 0.0545;
      const pick = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.075, 0.018), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 0.035; pick.userData.pick = true;
      g.add(glass, collar, bulb, pick);
      g.bulb = bulb; g.pick = pick;
      group.add(g);
      return g;
    };
    dropBottle(PH_BOT, { brown: false, text: '酚酞溶液' });
    dropBottle(NH_BOT, { brown: true, text: '浓氨水' });
    const phD = dropper(), nhD = dropper();
    const PH_HOME = PH_BOT.clone().setY(0.0075), NH_HOME = NH_BOT.clone().setY(0.0075);

    // ================= 量筒（5 mL 浓氨水）：holder 的原点在筒口右边，绕它倾斜 =================
    const cylHolder = new THREE.Group(), cylWrap = new THREE.Group(); cylHolder.add(cylWrap); group.add(cylHolder);
    const cylGlass = new THREE.Mesh(new THREE.CylinderGeometry(CYL_R, CYL_R, CYL_H - 0.004, 20, 1, true), glassMat({ opacity: 0.2 })); cylGlass.position.y = 0.004 + (CYL_H - 0.004) / 2; cylGlass.renderOrder = 9; glassEdge(cylGlass, 0.0005);
    const cylFoot = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0135, 0.004, 20), paint(0xe9edf0)), { width: 0.6 }); cylFoot.position.y = 0.002;
    const cylLiq = new THREE.Mesh(new THREE.CylinderGeometry(CYL_R - 0.0006, CYL_R - 0.0006, 1, 16), water2({ color: 0xe3eef0, base: 0.4 })); cylLiq.geometry.translate(0, 0.5, 0); cylLiq.position.y = 0.0045; cylLiq.scale.y = (5e-6) / (Math.PI * (CYL_R - 0.0006) ** 2); cylLiq.renderOrder = 7;
    const ticks = new THREE.Group();
    for (let i = 1; i <= 10; i++) { const y = 0.0045 + (i * 1e-6) / (Math.PI * (CYL_R - 0.0006) ** 2); const t = new THREE.Mesh(new THREE.BoxGeometry(i % 5 ? 0.003 : 0.005, 0.0003, 0.0003), new THREE.MeshBasicMaterial({ color: 0x7d93a3 })); t.position.set(-0.001, y, CYL_R + 0.0002); ticks.add(t); }
    const cylLab = textPlate('浓氨水', { w: 0.02, h: 0.007, bg: 'rgba(253,251,245,0.95)', font: 'bold 110px "Songti SC", serif' }); cylLab.position.set(0, 0.07, CYL_R + 0.0012);
    const cylPick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, CYL_H + 0.006, 10), new THREE.MeshBasicMaterial({ visible: false })); cylPick.position.y = CYL_H / 2; cylPick.userData.pick = true;
    cylWrap.add(cylGlass, cylFoot, cylLiq, ticks, cylLab, cylPick);
    cylWrap.position.set(-CYL_R, -CYL_H, 0);
    const CYL_HOME = CYL.clone().add(new THREE.Vector3(CYL_R, CYL_H, 0));

    // ================= 玻璃棒（原点在下端） =================
    const rod = new THREE.Group();
    const rodGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.1, 12), glassMat({ opacity: 0.32 })); rodGlass.geometry.translate(0, 0.05, 0); rodGlass.renderOrder = 9; glassEdge(rodGlass, 0.0005);
    const rodPick = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.1, 0.014), new THREE.MeshBasicMaterial({ visible: false })); rodPick.position.y = 0.05; rodPick.userData.pick = true;
    rod.add(rodGlass, rodPick); group.add(rod);

    // 倒液体时的一股细流、滴下去的液滴
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.0011, 0.0011, 1, 8), water2({ color: 0xdcebf0, base: 0.5 })); stream.geometry.translate(0, -0.5, 0); stream.renderOrder = 8; stream.visible = false; group.add(stream);
    const dropMs = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.0016, 10, 8), water2({ color: 0xd6eaf2, base: 0.6 })); m.renderOrder = 10; m.visible = false; group.add(m); return m; });

    // ================= 氨分子：绿点；跟着其中一个，画出它走过的路 =================
    const nh3 = new Particles({ max: MAXW, sprite: true, color: NH3C });      // 绿点：氨分子
    const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,1)'); gr.addColorStop(0.75, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t; })();
    nh3.mat.uniforms.map.value = dotTex; nh3.mesh.renderOrder = 11; group.add(nh3.mesh);
    const one = new Particles({ max: 1, sprite: true, color: NH3_DARK }); one.mat.uniforms.map.value = dotTex; one.mesh.renderOrder = 12; group.add(one.mesh);
    const TR = 150, trailPos = new Float32Array(TR * 3);
    const trailGeo = new THREE.BufferGeometry(); trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3)); trailGeo.setDrawRange(0, 0);
    const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: NH3_DARK, transparent: true, opacity: 0.55, depthWrite: false })); trail.renderOrder = 12; trail.frustumCulled = false; trail.raycast = () => {}; group.add(trail);
    let trailN = 0, trailFor = -1;

    // ================= 卡片 =================
    const aCard = tag('', 'cond'); aCard.px = [96, 6];
    const bCard = tag('', 'cond'); bCard.px = [-96, 6];
    const bellCard = tag('', 'cond'); bellCard.px = [0, -34];
    const tCard = tag('', 'cond'); tCard.px = [64, -16];
    const cCard = tag('', 'cond'); cCard.px = [70, 40];

    // ================= 状态 =================
    const fresh = () => ({
      A: { vol: 20, ind: 0, stirred: false, n: new Array(NL).fill(0), abs: 0, spoiled: false },
      C: { on: false, vol: 20, ind: 6, n: new Array(NL).fill(0), abs: 0 },
      B: { vol: 0 },
      tube: { vol: 0, ind: 0, nh: 0, shown: 0, drops: 0 },
      bell: 'home', bellY: 0, tCover: 0, redAt: null, tOpen: 0, absOpen: 0, absCover: 0, firstIn: null,
      walk: [], nextId: 1, track: 0, emitAcc: 0,
      anim: null, rec: {}, order: [], told: {}, liftAt: null, absAtLift: 0, demo: false, near: false,
    });
    S = fresh();
    let W = null, dragging = null;
    const go = { rod: null, bell: null };          // 拿着的玻璃棒、大烧杯要去的地方（每帧滑过去，不跳）
    const status = (m) => { if (!S.demo) W?.status(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const covered = () => S.bell === 'on';
    const indF = (x) => Math.min(1, x.ind / 5);
    const layerRed = (x) => { const v = (x.vol * 1e-3) / NL; return x.n.map((n) => redOf(n / v) * indF(x)); };
    const frontMM = (f, vol) => { let k = 0; for (let i = NL - 1; i >= 0 && f[i] > 0.12; i--) k++; return (k / NL) * (levelOf(vol) - 0.0012) * 1000; };
    // 记录表：rec[key] = { row, cells }；演示里不记
    const log = (key, cells) => {
      if (S.demo || S.rec[key]) return;
      S.rec[key] = cells; S.order.push(key);
      W?.tbl.add(cells);
    };
    const setCell = (key, j, html) => {
      if (S.demo || !S.rec[key]) return;
      S.rec[key][j] = html;
      const i = S.order.indexOf(key);
      const tr = W?.tbl.el.querySelectorAll('tbody tr')[i]; if (tr) tr.children[j].innerHTML = html;
    };

    const A = {
      drip(who, into) {
        if (S.anim) return;
        if (who === 'ph') {
          if (into !== 'A') return status(into === 'tube' ? '酚酞先滴进烧杯 <b>A</b> 的蒸馏水里。' : '把酚酞溶液的滴管拖到烧杯 <b>A</b> 上方。');
          if (covered()) return status('大烧杯罩着，先把它拿开。');
          if (S.A.ind >= 6) return status('已经滴了 6 滴，够了（课本：5~6 滴）。');
          S.anim = { k: 'drip', who, into, left: 6 - S.A.ind, t: 0, next: 0.25, gap: 0.32, drops: [] };
        } else {
          if (into === 'tube') {
            if (!S.tube.vol) return status('试管里还是空的。先把烧杯 <b>A</b> 拖到试管口，倒进少量溶液。');
            if (S.tube.drops >= 4) return status('已经滴了几滴，颜色看清楚了。');
            S.anim = { k: 'drip', who, into, left: 3, t: 0, next: 0.3, gap: 0.85, drops: [] };
          } else if (into === 'A') {
            if (covered()) return status('大烧杯罩着，先把它拿开。');
            S.anim = { k: 'drip', who, into, left: 1, t: 0, next: 0.25, gap: 0.5, drops: [] };
          } else return status(into === 'B' ? 'B 里要加 5 mL 浓氨水，用<b>量筒</b>倒。' : '把浓氨水的滴管拖到<b>试管</b>口。');
        }
        near(into === 'A' ? new THREE.Vector3(AX, 0.05, 0) : TUBE.clone().setY(0.085), [0.08, 0.42, 1], 0.32);
      },
      stir() {
        if (S.anim) return;
        if (covered()) return status('大烧杯罩着，先把它拿开。');
        S.anim = { k: 'stir', t: 0 }; sfx.clink({ freq: 2600, gain: 0.03 });
      },
      pourA() {
        if (S.anim) return;
        if (covered()) return status('大烧杯罩着 A，先把大烧杯拿开。');
        if (S.tube.vol) return status('试管里已经有溶液了。');
        if (!S.A.ind) return status('A 里还没有滴酚酞。先往 A 里滴 5~6 滴<b>酚酞溶液</b>。');
        if (!S.A.stirred) return status('先用<b>玻璃棒</b>把 A 搅拌均匀，再取溶液。');
        S.anim = { k: 'pourA', t: 0, p0: aHolder.position.clone(), r0: aHolder.rotation.z };      // 从松手的地方开始
        near(TUBE.clone().setY(0.09), [0.05, 0.38, 1], 0.34);
      },
      pourB() {
        if (S.anim) return;
        if (covered()) return status('大烧杯罩着，先把它拿开，再往 B 里倒浓氨水。');
        if (S.B.vol) return status('B 里已经有 5 mL 浓氨水了。');
        S.anim = { k: 'pourB', t: 0 };
      },
      cover(on) {
        if (on === covered()) return;
        if (on) {
          S.bell = 'on'; S.bellY = 0.06; sfx.clink({ freq: 900, gain: 0.06 });
          if (!S.B.vol) status('罩上了——不过 B 里还没有浓氨水。');
          else { status(`罩住了 A 和 B。<b>观察几分钟</b>（时间加快 ${SPEED} 倍）：看绿点往哪里跑，看 A、B 的颜色。`); done('cover'); }
          if (S.B.vol) near(new THREE.Vector3(0, 0.05, -0.01), [0.04, 0.55, 1], 0.42);
        } else {
          S.bell = 'home'; S.liftAt = S.tOpen; S.absAtLift = S.absOpen;
          far();
          if (S.walk.length) status('拿开了大烧杯：罩子里的氨分子跑散到四周去了。');
        }
      },
      showC(on) {
        S.C.on = on;
        status(on ? '罩子外放了一杯同样的酚酞溶液 <b>C</b>（20 mL 蒸馏水 + 6 滴酚酞）。罩上大烧杯，比一比 A 和 C。' : '拿走了 C。');
      },
      reset() {
        S = fresh(); W?.tbl.clear(); far(); apply();
        if (W) { W.q1.close(); W.q2.close(); W.next.hidden = true; W.cSeg.set(0); }
        bar.undo('phenol', 'tube', 'cover', 'watch', 'why');
        status('全部重新摆好了，记录也清空了。');
      },
    };
    const apply = () => { trailN = 0; trailFor = -1; trailGeo.setDrawRange(0, 0); stream.visible = false; dragging = null; go.rod = go.bell = null; };

    // ================= 拖放 =================
    const nearMouth = (p, x, y, dx = 0.02) => Math.abs(p.x - x) < dx && p.y > y - 0.01 && p.y < y + 0.07;
    const whereDrop = (p) => (nearMouth(p, AX, BH) ? 'A' : nearMouth(p, T_MOUTH.x, T_MOUTH.y, 0.016) ? 'tube' : nearMouth(p, BX, BH) ? 'B' : null);
    const dropperItem = (d, who) => ({ obj: d.pick, anchor: d, plane: 'xy', offset: 0, keepOffset: true,
      hint: who === 'ph' ? '拖到烧杯 A 上方：滴入酚酞溶液' : '拖到试管口：慢慢滴加浓氨水',
      onStart: () => { if (S.anim) return; dragging = who; },
      onDrag: (p) => { if (dragging !== who) return; d.position.set(clamp(p.x, -0.2, 0.22), clamp(p.y, 0.01, 0.2), d.position.z * 0.85); },        // 拿起来以后慢慢移到烧杯那一排（z = 0），看上去在 A 上方就真的在 A 上方
      onEnd: () => { if (dragging !== who) return; dragging = null; const w = whereDrop(d.position); if (w) A.drip(who, w); else if (d.position.y > 0.02) status(who === 'ph' ? '把滴管拖到烧杯 <b>A</b> 的上方再松手。' : '把滴管拖到<b>试管</b>口再松手。'); } });
    const drag = draggable(group, [
      dropperItem(phD, 'ph'), dropperItem(nhD, 'nh'),
      { obj: rodPick, anchor: rod, plane: 'xy', offset: 0, keepOffset: false, hint: '拖进烧杯 A：搅拌',
        onStart: () => { if (S.anim) return; dragging = 'rod'; go.rod = rod.position.clone(); },
        onDrag: (p) => { if (dragging !== 'rod') return; go.rod = new THREE.Vector3(clamp(p.x, -0.2, 0.22), clamp(p.y - 0.05, 0.003, 0.15), p.z || 0); },
        onEnd: () => { if (dragging !== 'rod') return; dragging = null; const p = go.rod || rod.position; go.rod = null; if (Math.abs(p.x - AX) < 0.02 && p.y < BH + 0.03) A.stir(); else if (p.y > 0.02) status('把玻璃棒拖进烧杯 <b>A</b> 里。'); } },
      { obj: aPick, anchor: aHolder, plane: 'xy', offset: 0, keepOffset: true, hint: () => (S.tube.vol ? '' : '拖到试管口：倒进少量溶液'),
        onStart: () => { if (S.anim || covered()) { if (covered()) status('大烧杯罩着 A，先把大烧杯拿开。'); return; } dragging = 'A'; },
        onDrag: (p) => { if (dragging !== 'A') return; aHolder.position.set(clamp(p.x, -0.15, 0.2), clamp(p.y, BH, 0.16), 0); aHolder.rotation.z = -clamp((p.y - BH - 0.02) * 14, 0, 0.5); },
        onEnd: () => { if (dragging !== 'A') return; dragging = null; const p = aHolder.position; if (Math.abs(p.x - T_MOUTH.x) < 0.035 && p.y > T_MOUTH.y - 0.03) A.pourA(); } },
      { obj: cylPick, anchor: cylHolder, plane: 'xy', offset: 0, keepOffset: true, hint: () => (S.B.vol ? '' : '拖到烧杯 B：倒入 5 mL 浓氨水'),
        onStart: () => { if (S.anim || S.B.vol) return; dragging = 'cyl'; },
        onDrag: (p) => { if (dragging !== 'cyl') return; cylHolder.position.set(clamp(p.x, -0.2, 0.2), clamp(p.y, CYL_H, 0.2), p.z || 0); cylHolder.rotation.z = -clamp((p.y - CYL_H - 0.01) * 16, 0, 0.6); },
        onEnd: () => { if (dragging !== 'cyl') return; dragging = null; const p = cylHolder.position; if (Math.abs(p.x - BX) < 0.04) A.pourB(); } },
      { obj: bellPick, anchor: bell, plane: 'xy', offset: 0, keepOffset: true, hint: () => (covered() ? '拖开：拿掉大烧杯' : '拖过来：倒扣，罩住 A 和 B'),
        onStart: () => { dragging = 'bell'; if (covered()) A.cover(false); S.bell = 'drag'; go.bell = bell.position.clone(); },
        onDrag: (p) => { if (dragging !== 'bell') return; go.bell = new THREE.Vector3(clamp(p.x, -0.2, 0.2), Math.max(0.062, p.y), p.z || 0); },
        onEnd: () => { if (dragging !== 'bell') return; dragging = null; S.bell = 'home'; const x = (go.bell || bell.position).x; go.bell = null; if (Math.abs(x) < 0.035) A.cover(true); } },
    ], { tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    // 演示：沿折线拖过去（先抬起来、越过别的器材，再放下去）。走的是学生拖放的同一套处理函数。
    // 这几件都是 keepOffset：点给的是器材原点（滴管尖、杯嘴、筒口……）要去的地方。pts[0] 是出发点。——建议进 kit（act.path）
    const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
    const centerOf = (o) => { group.updateMatrixWorld(true); return group.worldToLocal(new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3())); };
    const path = (obj, pts, o) => act.path(obj, pts, o);      // 沿几个点拿过去（kit/chemlesson.js 的 act.path）
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const from = (o) => () => o.position.clone();

    // ================= 底部步骤栏 + 老师的演示 =================
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'phenol', title: 'A 里滴酚酞、搅拌', todo: '把<b>酚酞溶液</b>的滴管拖到烧杯 <b>A</b> 上方，滴入 5~6 滴；再用<b>玻璃棒</b>搅拌均匀，看颜色。', target: () => (S.A.ind < 5 ? phD : !S.A.stirred ? rod : null) },
        { id: 'tube', title: '试管里滴浓氨水', todo: '把烧杯 <b>A</b> 拖到<b>试管</b>口，倒进少量溶液；再把<b>浓氨水</b>的滴管拖到试管口，慢慢滴加，看颜色。', target: () => (!S.tube.vol ? (covered() ? null : aHolder) : nhD) },
        { id: 'cover', title: '罩住 A 和 B', todo: '把<b>量筒</b>里的 5 mL 浓氨水倒进烧杯 <b>B</b>；再把<b>大烧杯</b>拖过来，罩住 A 和 B。', target: () => (!S.B.vol ? cylHolder : covered() ? null : bell) },
        { id: 'watch', title: '观察几分钟', todo: '看罩子里的<b>绿点</b>（氨分子）往哪里跑；看烧杯 A 和 B 的颜色。' },
        { id: 'why', title: '想一想', todo: 'B 里的浓氨水没有碰到 A，A 为什么变红了？在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply }),
          shots: [
            { cap: '小烧杯 A 里是 20 mL 蒸馏水。滴入 5~6 滴酚酞溶液，搅拌均匀——溶液是无色的。', dur: 8, cam: [[AX + 0.03, 0.05, 0.04], [0.08, 0.45, 1], 0.36],
              during: act.seq(
                path(phD.pick, [from(phD), V3(PH_HOME.x, 0.1, PH_HOME.z), V3(AX, BH + 0.02, 0)], { t0: 0.03, t1: 0.2, release: 0.22 }),        // 滴管从滴瓶里拿出来，移到 A 上方，滴 6 滴
                path(rodPick, [null, () => centerOf(rodPick).setY(0.15), V3(AX, 0.15, 0), V3(AX, 0.11, 0)], { t0: 0.56, t1: 0.72, release: 0.74 })) },      // 玻璃棒拿起来放进 A，搅拌
            { cap: '从 A 中取少量溶液放进试管，慢慢滴加浓氨水——溶液变红了。', dur: 9.5, cam: [[TUBE.x - 0.05, 0.08, 0.02], [0.05, 0.4, 1], 0.42],
              during: act.seq(
                path(aPick, [from(aHolder), V3(A_HOME.x, 0.13, 0), V3(T_MOUTH.x, 0.13, 0)], { t0: 0.03, t1: 0.18, release: 0.2 }),           // 端起 A，倒进试管
                path(nhD.pick, [from(nhD), V3(NH_HOME.x, 0.17, NH_HOME.z), V3(T_MOUTH.x, 0.17, 0), V3(T_MOUTH.x, T_MOUTH.y + 0.015, 0)], { t0: 0.45, t1: 0.65, release: 0.67 })) },      // 浓氨水的滴管移到试管口，滴 3 滴
            { cap: '另取小烧杯 B，加入 5 mL 浓氨水。用一个大烧杯罩住 A 和 B。', dur: 6.5, cam: [[-0.05, 0.07, 0.02], [0.04, 0.4, 1], 0.52],
              during: act.seq(
                path(cylPick, [from(cylHolder), V3(CYL_HOME.x + 0.05, 0.15, CYL_HOME.z), V3(BX + 0.01, 0.15, 0)], { t0: 0.04, t1: 0.22, release: 0.25 }),        // 量筒拿到 B 上方，倒进去
                // 量筒还在倒的时候就拿起大烧杯、翻过来（从量筒上方过去）；量筒拿开以后马上罩下去——浓氨水倒进去就罩上
                path(bellPick, [from(bell), V3(BELL_HOME.x, 0.13, 0), V3(0, 0.13, 0), V3(0, 0.07, 0)], { t0: 0.29, t1: 0.63, release: 0.66 })) },
            { cap: '绿点是氨分子（示意）：从 B 的液面跑出来，在罩子里东碰西撞、到处乱跑。', dur: 4.6, speed: 2.5, cam: [[0, 0.05, -0.01], [0.04, 0.55, 1], 0.38] },
            { cap: '几分钟后：A 从液面开始变红，B 没有变化。演示完了，下面换你自己做。', dur: 4.6, speed: 5, cam: [[0.005, 0.05, -0.01], [0.04, 0.55, 1], 0.36] },
          ],
        },
      },
    });

    const pointer = wrapPointer(drag, bar);
    // 一开始就摆到桌上的位置（取景按器材的包围盒算，要在第一帧之前摆好）
    aHolder.position.copy(A_HOME); cylHolder.position.copy(CYL_HOME); phD.position.copy(PH_HOME); nhD.position.copy(NH_HOME);
    rod.position.copy(ROD_HOME); rod.rotation.set(0, 0, Math.PI / 2); bell.position.copy(BELL_HOME); bkC.visible = false;

    // ================= 每帧 =================
    const tmp = new THREE.Vector3();
    // 滑过去：位置 lerp，转角逐个分量 lerp（p 为 null 时只转）
    const glide = (o, p, rx, ry, rz, a) => { if (p) o.position.lerp(p, a); o.rotation.set(o.rotation.x + (rx - o.rotation.x) * a, o.rotation.y + (ry - o.rotation.y) * a, o.rotation.z + (rz - o.rotation.z) * a); };
    // 放回桌上：先水平挪到原处的上方，再放下去（不斜着穿过别的器材）
    const carryHome = (o, p, a) => { const d = Math.hypot(o.position.x - p.x, o.position.z - p.z); o.position.lerp(d > 0.004 ? new THREE.Vector3(p.x, Math.max(o.position.y, p.y), p.z) : p, a); };
    const place = (h) => {
      const an = S.anim;
      // 滴管
      for (const [d, who, home] of [[phD, 'ph', PH_HOME], [nhD, 'nh', NH_HOME]]) {
        if (dragging === who) continue;
        if (an?.k === 'drip' && an.who === who) {
          const to = an.into === 'A' ? new THREE.Vector3(AX, BH + 0.014, 0) : an.into === 'tube' ? T_MOUTH.clone().add(new THREE.Vector3(0, 0.012, 0)) : new THREE.Vector3(BX, BH + 0.014, 0);
          d.position.lerp(to, 0.3);
        } else carryHome(d, home, 0.3);          // 先抬起来挪到滴瓶上方，再插回瓶里
      }
      // 玻璃棒：搅拌时在 A 里转圈
      if (dragging === 'rod' && go.rod) glide(rod, go.rod, 0, 0, 0.12, 0.35);
      else if (an?.k === 'stir') { const a = an.t * 9; glide(rod, new THREE.Vector3(AX + Math.cos(a) * 0.006, 0.0035, Math.sin(a) * 0.006), Math.sin(a) * 0.12, 0, Math.cos(a) * 0.12, an.t < 0.3 ? 0.3 : 0.6); }
      else if (dragging !== 'rod') {
        // 搅拌完：先从烧杯里竖着提出来，再拿回桌上放倒
        if (Math.hypot(rod.position.x - AX, rod.position.z) < RI && rod.position.y < BH + 0.005) glide(rod, new THREE.Vector3(rod.position.x, BH + 0.012, rod.position.z), 0, 0, 0, 0.25);
        else { carryHome(rod, ROD_HOME, 0.2); glide(rod, null, 0, 0, Math.PI / 2, 0.15); }
      }
      // 烧杯 A：倒进试管——先到试管口左上方，再一边斜过来一边挪过去，杯嘴挨着试管口倒；倒完照原路直起来，再拿回去
      if (dragging !== 'A') {
        if (an?.k === 'pourA') {
          const t = an.t, s = t < 0.35 ? 0.4 : t < 0.8 ? 0.4 + 0.6 * ease((t - 0.35) / 0.45) : t < 1.7 ? 1 : 1 - 0.6 * ease((t - 1.7) / 0.45);
          const P = A_SAFE.clone().lerp(A_POUR, s), rz = -A_TILT * s;
          if (t < 0.35) { const e = ease(t / 0.35); aHolder.position.lerpVectors(an.p0 || P, P, e); aHolder.rotation.z = (an.r0 ?? rz) + (rz - (an.r0 ?? rz)) * e; }
          else { aHolder.position.copy(P); aHolder.rotation.z = rz; }
        } else { aHolder.position.lerp(A_HOME, 0.3); aHolder.rotation.z *= 0.7; }
      }
      // 量筒：倒进 B
      if (dragging !== 'cyl') {
        if (an?.k === 'pourB') { const k = clamp(an.t / 0.5, 0, 1) * clamp((2.0 - an.t) / 0.5, 0, 1); cylHolder.position.lerp(new THREE.Vector3(BX - 0.006, BH + 0.008, 0), 0.25); cylHolder.rotation.z += (-1.95 * k - cylHolder.rotation.z) * 0.3; }
        else { cylHolder.position.lerp(CYL_HOME, 0.3); cylHolder.rotation.z *= 0.7; }
        cylHolder.position.y = Math.max(cylHolder.position.y, CYL_H * Math.cos(cylHolder.rotation.z) + 0.001);      // 量筒底不碰到桌面
      }
      // 大烧杯
      if (dragging === 'bell') { if (go.bell) bell.position.lerp(go.bell, 0.3); flip.rotation.x += (Math.PI - flip.rotation.x) * 0.12; }      // 拿起来，边走边翻过来（倒扣）
      else {
        if (S.bell === 'on') { S.bellY += (0.001 - S.bellY) * Math.min(1, h * 8); bell.position.lerp(new THREE.Vector3(0, S.bellY, 0), 0.3); flip.rotation.x += (Math.PI - flip.rotation.x) * 0.2; }
        else { bell.position.lerp(BELL_HOME, 0.25); flip.rotation.x *= 0.8; if (flip.rotation.x < 0.01) flip.rotation.x = 0; bell.position.y = Math.max(bell.position.y, Math.sin(flip.rotation.x) * 0.03); }      // 翻回正放：边翻边抬一点，杯口不碰桌面
      }
      aPick.visible = !covered();
      bkC.visible = S.C.on;
    };

    // 液滴、倒液体
    const animStep = (h) => {
      const an = S.anim; stream.visible = false;
      dropMs.forEach((m) => { m.visible = false; });
      if (!an) return;
      an.t += h;
      if (an.k === 'drip') {
        const d = an.who === 'ph' ? phD : nhD;
        if (an.left > 0 && an.t > an.next) {
          an.next += an.gap; an.left--;
          d.bulb.scale.set(1.15, 1.25, 1.15);
          const floor = an.into === 'A' ? levelOf(S.A.vol) : TUBE.y + tubeLevel(S.tube.vol);
          an.drops.push({ x: d.position.x, y: d.position.y - 0.001, z: d.position.z, vy: 0, floor });
        }
        d.bulb.scale.lerp(tmp.set(1, 1.55, 1), 0.15);
        for (let i = an.drops.length - 1; i >= 0; i--) {
          const q = an.drops[i]; q.vy -= 9.8 * h * 0.5; q.y += q.vy * h;
          if (q.y < q.floor) { an.drops.splice(i, 1); landDrop(an); continue; }
        }
        an.drops.forEach((q, i) => { if (dropMs[i]) { dropMs[i].visible = true; dropMs[i].position.set(q.x, q.y, q.z); } });
        if (an.left <= 0 && !an.drops.length && an.t > an.next - an.gap + 0.4) { S.anim = null; dripDone(an); }
      } else if (an.k === 'stir') {
        if (an.t > 1.6) {
          S.anim = null;
          // 搅拌：A 里各层混匀
          const m = S.A.n.reduce((a, b) => a + b, 0) / NL; S.A.n.fill(m);
          S.A.stirred = true;
          if (!S.A.ind) status('搅拌了一下。A 里还没有滴酚酞。');
          else if (!S.rec['1']) {
            const red = layerRed(S.A)[NL - 1] > 0.1;
            log('1', ['（1）', red ? '溶液<b>变红</b>' : '溶液无色', red ? '—' : '蒸馏水不能使酚酞溶液变色']);
            status(red ? 'A 变红了——里面有了氨。' : `滴入了 ${S.A.ind} 滴酚酞溶液，搅拌均匀：溶液<b>无色</b>。下一步：把烧杯 <b>A</b> 拖到<b>试管</b>口，倒进少量溶液。`);
            if (S.A.ind >= 5) done('phenol');
            far();
          } else if (S.A.abs) status('搅拌以后，液面的红色混进了整杯溶液：颜色变均匀了。');
        }
      } else if (an.k === 'pourA') {
        if (an.t > 0.8 && an.t < 1.7) { stream.visible = true; stream.position.copy(T_MOUTH).add(new THREE.Vector3(-0.0025, 0.0005, 0)); stream.scale.y = 0.0005 + T_LEN - tubeLevel(S.tube.vol); const take = Math.min(h * 2.2, 2 - S.tube.vol); if (take > 0) { S.tube.vol += take; S.A.vol -= take; S.tube.ind = S.A.ind * 0.1; } }      // 从杯嘴沿着试管口流进去
        if (an.t > 2.25) { S.anim = null; S.tube.vol = 2; S.A.vol = 18; far(); status('试管里有了约 2 mL A 中的溶液。把<b>浓氨水</b>的滴管拖到<b>试管</b>口，慢慢滴加，看颜色。'); }
      } else if (an.k === 'pourB') {
        const v0 = S.B.vol;
        if (an.t > 0.6 && an.t < 1.5) { stream.visible = true; stream.position.set(BX - 0.006 + 0.004, BH + 0.004, 0); stream.scale.y = BH + 0.004 - levelOf(S.B.vol); S.B.vol = Math.min(5, v0 + h * 5.6); }
        if (an.t > 2.1) { S.anim = null; S.B.vol = 5; status(`B 里有了 5 mL 浓氨水。绿点是氨分子（示意）——它们已经从 B 的液面跑出来了。把<b>大烧杯</b>拖过来，罩住 A 和 B。`); }
      }
    };
    const landDrop = (an) => {
      if (an.who === 'ph') { S.A.ind++; S.A.stirred = false; return; }
      if (an.into === 'tube') { S.tube.nh += DROP_NH3; S.tube.vol += 0.05; S.tube.drops++; return; }
      if (an.into === 'A') { S.A.n[NL - 1] += DROP_NH3; S.A.vol += 0.05; S.A.spoiled = true; }
    };
    const dripDone = (an) => {
      far();
      if (an.who === 'ph') status(`滴入了 ${S.A.ind} 滴酚酞溶液。再用<b>玻璃棒</b>搅拌均匀，看颜色。`);
      else if (an.into === 'tube') {
        const red = redOf(S.tube.nh / (S.tube.vol * 1e-3)) * Math.min(1, S.tube.ind / 0.5) > 0.5;
        if (!S.rec['2']) log('2', ['（2）', red ? '溶液由无色变成<b>红色</b>' : '没有明显变化', red ? '浓氨水能使酚酞溶液变红' : '—']);
        status(red ? '滴入浓氨水，试管里的溶液<b>变红</b>了。下一步：把<b>量筒</b>里的 5 mL 浓氨水倒进烧杯 <b>B</b>。' : '试管里的颜色没变。');
        if (red) done('tube');
      } else if (an.into === 'A') status('浓氨水<b>直接滴进了 A</b>——A 当然变红了，可这就看不出氨分子会不会自己“跑”过去了。点左边“更多”里的<b>全部重来</b>。');
    };

    // 氨分子：随机运动
    const inBell = (x, y, z) => Math.hypot(x, z) < BELL_RI && y < BELL_HI;
    const cups = () => (S.C.on ? [[AX, 0, 'A'], [BX, 0, 'B'], [CX, CZ, 'C']] : [[AX, 0, 'A'], [BX, 0, 'B']]);
    const simGas = (hs) => {
      const L = S.walk;
      const n = Math.max(1, Math.ceil(hs / 0.25)), dt = hs / n;
      const e = Math.exp(-dt / TAU), sd = SV * Math.sqrt(1 - e * e);
      const cov = covered(), lb = levelOf(S.B.vol), cs = cups();
      for (let s = 0; s < n; s++) {
        if (S.B.vol > 0.5) {
          S.emitAcc += EMIT * dt;
          while (S.emitAcc >= 1) {
            S.emitAcc -= 1; if (L.length >= MAXW) continue;
            const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * RI * 0.95;
            L.push({ id: S.nextId++, p: new THREE.Vector3(BX + Math.cos(a) * r, lb + 0.0003, Math.sin(a) * r), v: new THREE.Vector3(gauss() * SV, Math.abs(gauss()) * SV, gauss() * SV), size: 0.0034, alpha: 0.9, age: 0, life: 1e9 });
          }
        }
        for (let i = L.length - 1; i >= 0; i--) {
          const w = L[i], p = w.p, v = w.v;
          v.set(v.x * e + sd * gauss(), v.y * e + sd * gauss(), v.z * e + sd * gauss());
          let nx = p.x + v.x * dt, ny = p.y + v.y * dt, nz = p.z + v.z * dt;
          if (Math.hypot(nx, nz) > 0.32 || ny > 0.3) { L.splice(i, 1); continue; }      // 跑散到房间里
          if (cov && inBell(p.x, p.y, p.z) !== inBell(nx, ny, nz)) { v.multiplyScalar(-1); continue; }      // 碰到大烧杯的玻璃
          if (ny < 0.0005) { v.y = Math.abs(v.y); ny = p.y; }
          for (const [cx, cz] of cs) {
            const r0 = Math.hypot(p.x - cx, p.z - cz), r1 = Math.hypot(nx - cx, nz - cz);
            if ((r0 < RW) !== (r1 < RW) && Math.min(p.y, ny) < BH) { const ux = (p.x - cx) / (r0 || 1), uz = (p.z - cz) / (r0 || 1), vn = v.x * ux + v.z * uz; v.x -= 2 * vn * ux; v.z -= 2 * vn * uz; nx = p.x; nz = p.z; break; }
          }
          p.set(nx, ny, nz);
          // 碰到液面
          let gone = null;
          for (const [cx, cz, k] of cs) {
            if (Math.hypot(p.x - cx, p.z - cz) >= RI) continue;
            const lv = k === 'A' ? levelOf(S.A.vol) : k === 'C' ? levelOf(S.C.vol) : lb;
            if (p.y < lv) { gone = k; break; }
          }
          if (gone) {
            if (gone === 'A' || gone === 'C') { const x = S[gone]; x.n[NL - 1] += Q; x.abs++; if (gone === 'A') { if (cov) S.absCover++; else S.absOpen++; if (cov && S.firstIn == null) S.firstIn = S.tCover; } }
            if (w.id === S.track && gone === 'A' && cov && !S.told.track && !S.rec['3']) { S.told.track = true; status('你跟着的那个氨分子（深绿点）东碰西撞，最后落到 A 的液面上，<b>溶进了水里</b>。'); }
            L.splice(i, 1);
          }
        }
        // 液体里：氨往下扩散（A、C）
        for (const x of [S.A, S.C]) {
          const dz = (levelOf(x.vol) - 0.0012) / NL, k = (D_LIQ * dt) / (dz * dz), f = x.n, d = new Array(NL).fill(0);
          let any = false; for (let j = 0; j < NL; j++) if (f[j] > 0) { any = true; break; }
          if (!any) continue;
          for (let j = 0; j < NL - 1; j++) { const fl = k * (f[j + 1] - f[j]); d[j] += fl; d[j + 1] -= fl; }
          for (let j = 0; j < NL; j++) f[j] += d[j];
        }
      }
    };

    const step = (h, t) => {
      place(h);
      animStep(h);
      const hs = h * SPEED;
      simGas(hs);
      if (covered()) S.tCover += hs;
      else if (S.B.vol > 0.5) S.tOpen += hs;
      // 跟着一个氨分子
      let tw = S.walk.find((w) => w.id === S.track);
      if (tw && covered() && !inBell(tw.p.x, tw.p.y, tw.p.z)) tw = null;          // 罩上以后只跟罩子里的
      if (!tw && S.walk.length) { const c = S.walk.filter((w) => w.p.y > BH * 0.6 && (!covered() || inBell(w.p.x, w.p.y, w.p.z))); tw = c[c.length - 1]; S.track = tw ? tw.id : 0; }
      if (tw) {
        if (trailFor !== tw.id) { trailFor = tw.id; trailN = 0; }
        if (trailN >= TR) { trailPos.copyWithin(0, 3); trailN = TR - 1; }
        trailPos.set([tw.p.x, tw.p.y, tw.p.z], trailN * 3); trailN++;
        trailGeo.setDrawRange(0, trailN); trailGeo.attributes.position.needsUpdate = true;
        one.list = [{ p: tw.p, size: 0.005, alpha: 1, age: 0, life: 1e9 }];
      } else { one.list = []; trailGeo.setDrawRange(0, 0); }
      nh3.list = S.walk; nh3.update(0, () => true); one.update(0, () => true);
      // 颜色
      const fA = layerRed(S.A), fC = layerRed(S.C);
      pinkA.set(levelOf(S.A.vol), fA); bkA.setLevel(levelOf(S.A.vol));
      pinkC.set(levelOf(S.C.vol), fC);
      bkB.setLevel(S.B.vol > 0.05 ? levelOf(S.B.vol) : 0);
      cylLiq.visible = !S.B.vol || (S.anim?.k === 'pourB' && S.B.vol < 4.9); cylLiq.scale.y = Math.max(0.0005, (5 - S.B.vol) * 1e-6 / (Math.PI * (CYL_R - 0.0006) ** 2));
      tLiq.visible = tPink.visible = S.tube.vol > 0.02; tLiq.scale.y = tPink.scale.y = Math.max(0.001, tubeLevel(S.tube.vol) - 0.002);
      const tRed = S.tube.vol ? redOf(S.tube.nh / (S.tube.vol * 1e-3)) * Math.min(1, S.tube.ind / 0.5) : 0;
      S.tube.shown += (tRed - S.tube.shown) * Math.min(1, h * 1.5); tPink.material.opacity = S.tube.shown * 0.85;
      // 现象 → 记录
      const fr = frontMM(fA, S.A.vol), aRed = fA[NL - 1] > 0.3;
      if (covered() && S.firstIn != null && !S.told.first) { S.told.first = true; status(`罩上 ${mmss(S.firstIn)}：第一批氨分子跑进了 A——看 A 的<b>液面</b>。`); }
      if (covered() && aRed && S.redAt == null) S.redAt = S.tCover;
      if (!S.demo && covered() && S.redAt != null && S.tCover > Math.max(120, S.redAt + 60) && !S.A.spoiled && !S.rec['3']) {
        log('3', ['（3）', `罩上几分钟后，A 中溶液从<b>液面</b>开始<b>变红</b>；B 没有明显变化${S.redAt < 1 ? '（罩上之前没罩的那段时间，A 已经有点红）' : ''}`, '<span style="color:#8a7d64">？（想一想）</span>']);
        done('watch');
        status(`罩上 ${mmss(S.redAt)} 起，A 从液面开始<b>变红</b>，现在红色往下走了 ${fr.toFixed(1)} mm；B 一直没变。B 里的浓氨水没有碰到 A——看看左边的问题。`);
        if (W && !bar.has('why')) W.q1.open();
      }
      if (S.C.on && covered() && S.rec['3'] && S.tCover > 240 && !S.rec.C) log('C', ['对照 C（罩子外）', `罩上 ${mmss(S.tCover)}：C 一直无色`, '罩子外的空气不能使酚酞变红：A 变红，是从 B 跑过来的氨分子']);
      if (!covered() && !S.tCover && S.tOpen > 300 && !S.told.open) { S.told.open = true; status(`还没罩大烧杯：5 分钟里只有 <b>${S.absOpen}</b> 个点跑进 A，大部分氨分子往四面八方跑散了。把<b>大烧杯</b>拖过来，罩住 A 和 B。`); }
      if (!covered() && S.rec['3'] && S.liftAt != null && S.tOpen - S.liftAt > 300 && !S.rec.open) {
        const n = S.absOpen - S.absAtLift, m = Math.round((S.absCover * 300) / Math.max(1, S.tCover));
        log('open', ['拿开大烧杯（不罩）', `5 分钟里只有 ${n} 个点跑进 A（罩着时 5 分钟约 ${m} 个）`, '氨分子跑散到整个空间，跑进 A 的少']);
        status(`拿开大烧杯以后：5 分钟里只有 <b>${n}</b> 个点跑进 A，罩着的时候 5 分钟约 <b>${m}</b> 个。氨分子跑散到四周去了（真实的教室里还有空气流动，跑散得更快）。`);
      }
      // 卡片
      const aDesc = !S.A.ind ? '20 mL 蒸馏水' : fr < 0.3 ? (S.A.stirred ? '酚酞溶液 · <b style="color:#6b6f7a">无色</b>' : `滴了 ${S.A.ind} 滴酚酞`) : `液面往下 <b style="color:#c8247a">${fr.toFixed(1)}</b><small>mm 变红</small>`;
      aCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">烧杯 A</span>${aRed ? '<span class="cc-res burn">变红</span>' : ''}</div><div class="cc-more"><div class="cc-obs">${aDesc}</div>${S.A.abs ? `<div class="cc-note">溶进来的氨：${S.A.abs} 个点</div>` : ''}</div></div>`).loc(group, AX, BH, 0).show(true);
      bCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">烧杯 B</span>${S.rec['3'] ? '<span class="cc-res">不变</span>' : ''}</div><div class="cc-more"><div class="cc-obs">${S.B.vol ? '5 mL 浓氨水 · 无色' : '空烧杯'}</div></div></div>`).loc(group, BX, BH, 0).show(S.B.vol > 0 || bar.has('tube'));
      const bellTxt = covered() ? `罩上 <b style="color:#23293a">${mmss(S.tCover)}</b><small>（实验时间）</small>` : '没有罩：往四面八方跑散';
      bellCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">${covered() ? '大烧杯里' : '氨分子'}</span></div><div class="cc-more"><div class="cc-obs">${bellTxt}</div><div class="cc-note"><span style="color:#1f9e6a">●</span> 氨分子（示意）　加快 ${SPEED} 倍</div></div></div>`).loc(group, covered() ? 0 : BX, covered() ? BIG_H : BH + 0.03, 0).show(S.B.vol > 0.5 && (covered() || S.walk.length > 0));
      tCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">试管</span>${S.tube.shown > 0.5 ? '<span class="cc-res burn">变红</span>' : ''}</div><div class="cc-more"><div class="cc-obs">${S.tube.drops ? `滴了 ${S.tube.drops} 滴浓氨水` : '约 2 mL A 中的溶液'}</div></div></div>`).loc(group, TUBE.x, T_LEN, 0).show(S.tube.vol > 0.5);
      const frC = frontMM(fC, S.C.vol);
      cCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">烧杯 C（罩子外）</span>${fC[NL - 1] > 0.3 ? '<span class="cc-res burn">变红</span>' : ''}</div><div class="cc-more"><div class="cc-obs">酚酞溶液 · ${frC > 0.3 ? `液面红了 ${frC.toFixed(1)} mm` : '<b style="color:#6b6f7a">无色</b>'}</div></div></div>`).loc(group, CX, BH, CZ).show(S.C.on);
      bar.near(S.near);
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.46, d: 0.2, h: 0.14 },
      view: { elev: 22, azim: -4, lookY: 0.42, frameMargin: 1.04 },
      mount(ui) {
        const ctx = () => {
          const r = S.rec;
          return ['1', '2', '3'].filter((k) => r[k]).map((k) => `<div>${r[k][0]} ${r[k][1].replace(/<[^>]+>/g, '')}</div>`).join('') + (r.C ? `<div>对照 C：${r.C[1].replace(/<[^>]+>/g, '')}</div>` : '');
        };
        const q2 = think({ q: '这个实验说明了分子有什么性质？', options: ['分子在不断地运动', '分子的质量和体积都很小', '分子之间有间隔'],
          ok: '对：氨分子在不断地运动，自己从 B 跑到了 A。可以掀开课本上的结论看看。',
          wrong: ['这句话没错（课本第 57 页），但这个实验看到的是：氨分子自己从 B 跑到了 A。', '这句话也没错（课本第 59 页），但这个实验看到的是：氨分子自己从 B 跑到了 A。'],
          onOk: () => { next.hidden = false; done('why'); }, status: (m) => ui.status(m) });
        const q1 = think({ q: 'B 里的浓氨水没有碰到 A，A 为什么变红了？', ctx,
          options: ['B 中的氨分子不停地运动，跑到了 A 中，溶于水使酚酞变红', '大烧杯里的空气使酚酞变红', 'B 里的浓氨水溅进了 A 里'],
          ok: '对。把这条分析填进记录表的第（3）行了。',
          wrong: ['空气一直都在——罩上之前 A 是无色的。可以在“换个条件再试”里放一杯罩子外的 C 对照。', '没有溅——看绿点：氨分子是一个一个东碰西撞“走”过去的。'],
          onOk: () => { setCell('3', 2, 'B 中的<b>氨分子</b>不停地运动，跑到 A 中，溶于水，使酚酞溶液变红'); q2.open(); }, status: (m) => ui.status(m) });
        const cSeg = seg('', ['只有 A、B（课本）', '罩子外再放一杯 C'], (_, k) => A.showC(!!k));
        const vary = varyBox('罩子外再放一杯同样的酚酞溶液 <b>C</b>，罩上以后比一比 A 和 C。也可以<b>不罩</b>大烧杯（或者中途把它拿开），看看氨分子跑到哪里去。', cSeg);
        const more = moreBox([
          ['往 A 里滴 6 滴酚酞', () => A.drip('ph', 'A')],
          ['用玻璃棒搅拌 A', () => A.stir()],
          ['从 A 取少量溶液到试管', () => A.pourA()],
          ['往试管里滴浓氨水', () => A.drip('nh', 'tube')],
          ['往 B 里倒 5 mL 浓氨水', () => A.pourB()],
          ['罩上 / 拿开大烧杯', () => A.cover(!covered())],
        ], () => A.reset());
        const safe = h('p', { class: 'fineprint warn', html: '浓氨水易挥发，有强烈的刺激性气味，不要凑近闻；用完盖好瓶塞。' });
        const note = h('p', { class: 'fineprint', html: `说明：时间加快 ${SPEED} 倍（画面 1 秒 ≈ 实验 ${SPEED} 秒）。<span style="color:#1f9e6a">绿点</span>是氨分子（示意），每个点代表约 4.5×10¹⁸ 个氨分子；空气分子没有画。点的随机运动按氨在空气中的扩散系数（约 0.22 cm²/s）算；浓氨水上方氨的分压按约 30 kPa 计。溶进 A 的氨在水里往下走得慢（有效扩散系数按约 2×10⁻⁸ m²/s 估计），所以红色先出现在液面，再慢慢往下。酚酞在碱性较强（pH 约 8.2 以上）时变红，深浅按溶进去的氨算。都是近似值。` });
        const { tbl, next } = mountXuean(ui, { controls: [q1, q2], headers: ['实验编号', '现象', '分析'], tableTitle: '记录' });
        ui.controls.append(vary, more, safe, note);
        W = { tbl, q1, q2, next, cSeg, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('图 3-4：小烧杯 A 里是 20 mL 蒸馏水，B 是空的；左边是一个大烧杯。可以先看<b>老师演示</b>，也可以直接动手。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { bar.dispose(); nh3.dispose(); one.dispose(); trailGeo.dispose(); dotTex.dispose(); },
      debug: { get S() { return S; }, A, bar, picks: { ph: phD.pick, nh: nhD.pick, rod: rodPick, A: aPick, cyl: cylPick, bell: bellPick },
        qa: qaFlow(drag, [
          { name: '滴酚酞', drag: phD.pick, to: () => new THREE.Vector3(AX, BH + 0.02, 0), wait: 3.5 },
          { name: '搅拌', drag: rodPick, to: () => new THREE.Vector3(AX, 0.06, 0), wait: 2.5 },
          { name: '倒进试管', drag: aPick, to: () => T_MOUTH.clone().add(new THREE.Vector3(-0.003, 0.01, 0)), wait: 3 },
          { name: '滴浓氨水', drag: nhD.pick, to: () => T_MOUTH.clone().add(new THREE.Vector3(0, 0.02, 0)), wait: 4 },
          { name: '倒浓氨水到 B', drag: cylPick, to: () => new THREE.Vector3(BX - 0.006, BH + 0.03, 0), wait: 3 },
          { name: '罩上大烧杯', drag: bellPick, to: () => new THREE.Vector3(0, 0.07, 0), wait: 16 },
          { name: '答第一题', run: () => W.q1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.q2.el.querySelector('button').click() },
        ]) },
    };
  },
};
