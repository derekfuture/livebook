// 人教版高中化学必修第一册第 39 页【实验2-5】（图2-7 加热 NaHCO₃ 或 Na₂CO₃）：如图2-7 所示，分别加热 Na₂CO₃ 和 NaHCO₃，观察现象，比较 Na₂CO₃ 和 NaHCO₃ 的热稳定性。
// 课本：碳酸钠很稳定，受热不易发生分解；碳酸氢钠不稳定，受热容易分解。2NaHCO₃ △══ Na₂CO₃ + H₂O + CO₂↑
// 照图2-7 搭：铁架台夹住试管（管口略向下倾斜），试管底部下面是升降台上的酒精灯；橡胶塞 + 玻璃导管，导管口插进右边试管里的澄清石灰水。
// 模型（示意，界面上写明）：
//   固体各 1 g（课本实验2-4 取各约 1 g，这里沿用）。NaHCO₃ 1 g = 11.9 mmol，分解最多生成 CO₂ 5.95 mmol（25 ℃ 约 146 mL）、H₂O 0.107 g、Na₂CO₃ 0.631 g（固体剩 0.63 g）。
//   温度：酒精灯把管底烤热，粉末最热处按约 175 ℃ 计（示意）；升温时间常数约 30 s、降温约 40 s（实际时间），演示和做的时候时间加快 6 倍。
//   速率：NaHCO₃ 按一级反应、活化能约 100 kJ/mol 估计（示意），150 ℃ 时速率常数约 0.0035/s；100 ℃ 以下几乎不分解。Na₂CO₃ 在酒精灯能达到的温度下不分解（熔点 851 ℃）。
//   气体：试管 + 导管里的气体空间按 28 mL 计；受热膨胀 / 生成 CO₂ → 从导管口冒出（刚加热冒出的是受热膨胀的空气，不让石灰水变浑浊）；冷却收缩，导管口还在石灰水里 → 石灰水倒吸
//   （导管里约 3 mL，吸满就流进试管；管里还烫（> 100 ℃）时试管炸裂）。没塞紧橡胶塞：气体从管口跑掉，石灰水不变浑浊。
//   澄清石灰水：8 mL 里 Ca(OH)₂ 约 0.184 mmol，吸收 4.5 mL CO₂ 全变 CaCO₃（浑浊），再吸 4.5 mL 全变 Ca(HCO₃)₂（又变清）；通过石灰水的 CO₂ 约一半被吸收（示意）。
//   水珠：H₂O 在试管口较冷的管壁上凝成水珠，量和生成的 H₂O 成正比。
// 看不见的东西：CO₂（深灰小点，这套书里 CO₂ 的颜色）、热（橙）、“钻进去看”：碳酸氢钠晶体里两个 HCO₃⁻ 变成 CO₃²⁻ + H₂O + CO₂（kit/nahco3-parts.js）。
import * as THREE from 'three';
import { draggable, clamp } from './kit/interact.js';
import { stand, canvasTex, textPlate, glowTexture } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { testTube, stopper, glassTube, chemLamp, tubeClamp, labJack } from './kit/chem.js';
import { bubble2, water2, milky } from './kit/chemfx.js';
import { micro } from './kit/microworld.js';
import { bicarbScene } from './kit/nahco3-parts.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, guards, think, mountXuean, moreBox, varyBox, paperSheet, demoActs } from './kit/chemlesson.js';
import { lampCap } from './kit/labops.js';
import { sfx } from './kit/audio.js';
import { paint, inked, hull } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const SPEED = 6;                                     // 时间加快倍数
const T0 = 25, T_PK = 175;                           // 室温；粉末最热处（示意）
const M_SAMPLE = 1.0;                                // 每种固体 1 g
const MM = 84.007, MM_CARB = 105.989;                // g/mol
const N_MMOL = (M_SAMPLE / MM) * 1000;               // 11.9 mmol NaHCO₃
const CO2_MAX = (N_MMOL / 2) * 24.465;               // mL（25 ℃）：约 146 mL
const H2O_MAX = (N_MMOL / 2 / 1000) * 18.015;        // g：0.107 g
const M_LEFT = (N_MMOL / 2 / 1000) * MM_CARB;        // g：分解完剩 0.631 g
const V_ROOM = 28, V_LINE = 3;                       // 试管 + 导管的气体空间；导管里的容积（mL）
const LIME_CO2 = 4.5, ABS = 0.5;                     // Ca(OH)₂ 约 0.184 mmol（8 mL 饱和石灰水）：吸收 4.5 mL CO₂ 全变成 CaCO₃；再吸 4.5 mL 全变成 Ca(HCO₃)₂（又变清）
const limeTurb = (a) => (a <= LIME_CO2 ? a / LIME_CO2 : clamp(2 - a / LIME_CO2, 0, 1));                     // 石灰水完全变浑浊需要吸收的 CO₂（mL）；通过的 CO₂ 被吸收的比例
const EA = 100000 / 8.314, K150 = 0.0035;            // 活化能 / R；150 ℃ 时的速率常数（1/s，实际时间）
const TAU_HEAT = 30, TAU_COOL = 40;
const T_BROKEN = 100;                                // 管里超过这个温度，倒吸进来的冷石灰水就让试管炸裂（示意）
const NSEG = 6, POW = [0.008, 0.028], S_FLAME = 0.02;
const TILT = THREE.MathUtils.degToRad(5);
const LAMP_X = -0.14, AXIS_Y = 0.145, JACK_H = 0.028;
const LX = 0.056, LIME_LEN = 0.056, LIME_LIQ = 0.028, Y_IN = 0.062, TIP_Y = 0.066;      // 石灰水试管：位置、管长、液柱高、升起来时管底的高度；导管口的高度
const OX = 0.065, TZ = 0.065;
const D = new THREE.Vector3(Math.cos(TILT), -Math.sin(TILT), 0);       // 试管轴：从管底指向管口
const BOTTOM = new THREE.Vector3(LAMP_X, AXIS_Y, 0).addScaledVector(D, -S_FLAME);
const MOUTH = BOTTOM.clone().addScaledVector(D, 0.15);
const CLAMP_P = BOTTOM.clone().addScaledVector(D, 0.1);
const O_ASM = MOUTH.clone().addScaledVector(D, -0.01);                 // 橡胶塞的底面中心（塞子 + 导管这一整件的原点）
const PARK = new THREE.Vector3(0.015, 0.0105, -0.06);                  // 拔出来的塞子和导管，躺在桌上的位置
const POUR_D = new THREE.Vector3(Math.cos(-0.62), Math.sin(-0.62), 0);
const PAPER = new THREE.Vector3(-0.035, 0, 0.018);
const POUR_MOUTH = new THREE.Vector3(PAPER.x + 0.012, 0.042, PAPER.z);
const DARK = 0x3d4350, LIGHT = 0xb9bec8, BLUE = 0x2f7fd8;
const along = (s) => MOUTH.clone().addScaledVector(D, s);
const segOf = (s) => clamp(Math.floor(((s - POW[0]) / (POW[1] - POW[0])) * NSEG), 0, NSEG - 1);
const segS = (i) => POW[0] + ((POW[1] - POW[0]) * (i + 0.5)) / NSEG;
const kAt = (T) => K150 * Math.exp(EA * (1 / 423 - 1 / (T + 273)));
const fmtT = (s) => (s < 50 ? `${Math.max(5, Math.round(s / 5) * 5)} 秒` : `${(s / 60).toFixed(1)} 分钟`);
const NAME = { nahco3: 'NaHCO₃', na2co3: 'Na₂CO₃' };
const ZH = { nahco3: '碳酸氢钠', na2co3: '碳酸钠' };

export default {
  id: 'nahco3',
  fig: '图2-7',
  title: '加热NaHCO₃或Na₂CO₃',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '碳酸钠和碳酸氢钠都是<b>白色</b>固体。分别放进试管里加热，把导出的气体通入澄清石灰水。<br>结果会是——',
    hint: '课本第 39 页 实验2-5',
    options: ['只有碳酸氢钠加热后，石灰水变浑浊', '两种加热后石灰水都变浑浊', '两种加热后石灰水都不变'],
    answer: 0,
  },
  need: '分别加热碳酸钠和碳酸氢钠（各约 1 g），把导出的气体通入澄清石灰水，比较现象',
  conclusion: {
    crops: [{ page: 43, rect: [64, 546, 392, 664] }],
    quote: '碳酸钠很稳定，受热不易发生分解；碳酸氢钠不稳定，受热容易分解。……我们可以利用加热的方法来鉴别碳酸钠和碳酸氢钠。',
    formula: '2NaHCO₃ <span style="font-size:.8em">△</span>══ Na₂CO₃ + H₂O + CO₂↑',
    why: '加热<b>碳酸氢钠</b>：试管口有<b>水珠</b>，导出的气体使澄清石灰水<b>变浑浊</b>——生成了 <b>H₂O</b> 和 <b>CO₂</b>，留下的固体是碳酸钠。固体质量比原来轻（按方程式算，1 g 完全分解后约剩 0.63 g，这是理论终点；没分解完，质量在 1 g 和 0.63 g 之间）。加热<b>碳酸钠</b>：石灰水始终不变，试管口也没有水珠——它没有分解。<br>所以碳酸钠比碳酸氢钠<b>稳定</b>：受热不易分解；碳酸氢钠受热容易分解。可以利用加热的方法鉴别它们。',
    src: '课本第 39 页 · 第二章 第一节 钠及其化合物 实验2-5',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    group.position.x = OX; root.add(group);
    let S = null, W = null;
    const near = (v, d = [0.1, 0.3, 1], dist = 0.26) => { if (S.demo) return; S.near = true; S.nearArgs = [v.clone(), d, dist]; look([v.x + OX, v.y, v.z], d, dist, () => { S.near = false; }); };
    const far = () => { if (S.near) { S.near = false; back(); } };
    paperSheet(group, { w: 0.5, d: 0.32, x: -0.03, z: 0.01 });
    const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
    const pickBox = (w, hh, d, y = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), new THREE.MeshBasicMaterial({ visible: false })); m.position.y = y; m.userData.pick = true; return m; };

    // ================= 铁架台、升降台、酒精灯 =================
    const st = stand({ height: 0.22, baseW: 0.11, baseD: 0.06 });
    st.position.set(-0.05, 0, -0.05); group.add(st);
    const arm = st.clamp(CLAMP_P.y, CLAMP_P.x - (-0.08));
    const jawBar = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.0026, 0.0026, 0.042, 10), paint(0x8a929e)), 0.0008);
    jawBar.rotation.x = Math.PI / 2; jawBar.position.set(CLAMP_P.x + 0.08, 0, 0.026); arm.add(jawBar);
    const jaw = tubeClamp(0.0099); jaw.position.copy(CLAMP_P); jaw.quaternion.setFromUnitVectors(V(0, 1, 0), D); group.add(jaw);
    const jack = labJack({ w: 0.06, d: 0.044, h: JACK_H }); jack.position.set(LAMP_X, 0, 0); group.add(jack);
    const lamp = chemLamp(); lamp.position.set(LAMP_X, JACK_H, 0); group.add(lamp);
    const lampPick = pickBox(0.072, 0.056, 0.072, 0.028); lamp.add(lampPick);
    const capper = lampCap(group, lamp, { off: V(-0.2, 0, 0.058) });

    // ================= 试管（管口略向下） =================
    const tube = testTube({ r: 0.009, len: 0.15 });
    const tubeHold = new THREE.Group(); tubeHold.add(tube); group.add(tubeHold);
    const tubePick = pickBox(0.032, 0.09, 0.032, 0.05); tube.add(tubePick);
    // 管里的固体：一小堆（NaHCO₃ 分解后变少）；试管口较冷的管壁上的水珠
    const bedMat = paint(0xf6f3ea, { unique: true, keep: true });
    const bed = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), bedMat); bed.position.set(0.0047, (POW[0] + POW[1]) / 2, 0); bed.visible = false; tube.add(bed);
    const NDROP = 16, condG = new THREE.Group(); tube.add(condG);
    for (let i = 0; i < NDROP; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), paint(0xcfeaf5, { unique: true, transparent: true, opacity: 0.9 })); const r0 = 0.0005 + Math.random() * 0.0006; d.scale.setScalar(r0); const a = (i / NDROP) * 5.1 + Math.random() * 0.5; d.position.set(0.0045 * Math.cos(a) * 0.5, 0.085 + ((i * 37) % 16) / 16 * 0.05, 0.0072 * (i % 2 ? 1 : -0.4)); d.userData.rank = (i + 0.5) / NDROP; d.visible = false; condG.add(d); }

    // ================= 橡胶塞 + 玻璃导管（一整件：拔出来就连着导管） =================
    const asm = new THREE.Group(); asm.position.copy(O_ASM); group.add(asm);
    const plug = stopper({ r1: 0.0084, r2: 0.0104, h: 0.018 }); plug.quaternion.setFromUnitVectors(V(0, 1, 0), D); asm.add(plug);
    const plugPick = pickBox(0.036, 0.036, 0.036, 0); plugPick.position.copy(D).multiplyScalar(0.009); asm.add(plugPick);
    const sC = (LX - MOUTH.x) / D.x, yBend = along(sC).y;
    const rel = (p) => p.clone().sub(O_ASM);
    const tubePts = [along(-0.012), along(sC - 0.034), along(sC - 0.010), along(sC - 0.003), V(LX, yBend - 0.005), V(LX, yBend - 0.018), V(LX, TIP_Y)].map(rel);
    const glass = glassTube(tubePts); asm.add(glass);
    const qa = new THREE.Quaternion().setFromAxisAngle(D, Math.PI / 2), qb = new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), TILT);
    const qPark = qb.clone().multiply(qa);                                // 躺到桌上：绕管子的轴转 90°（导管口那一折朝后），再把 5° 的倾斜放平
    const ID = new THREE.Quaternion();

    // ================= 石灰水试管：站在可升降的小台子上（降下来，导管口就离开石灰水） =================
    const lime = testTube({ r: 0.0075, len: LIME_LEN }); lime.position.set(LX, 0, 0); group.add(lime);
    const limeLiq = new THREE.Mesh(new THREE.CylinderGeometry(0.0069, 0.0069, 1, 18), water2({ color: 0xe6f0f2, base: 0.35 })); limeLiq.geometry.translate(0, 0.5, 0); limeLiq.position.y = 0.0015; limeLiq.scale.y = LIME_LIQ - 0.0015; limeLiq.renderOrder = 7; lime.add(limeLiq);
    const limeMilk = milky(limeLiq);
    const limePick = pickBox(0.032, 0.07, 0.032, 0.03); lime.add(limePick);
    const supM = paint(0xd9c9a6);
    const supFoot = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.002, 20), supM), { width: 0.7 }); supFoot.position.set(LX, 0.001, 0); group.add(supFoot);
    const supPole = inked(new THREE.Mesh(new THREE.BoxGeometry(0.005, 1, 0.005), supM), { width: 0.6 }); supPole.geometry.translate(0, 0.5, 0); group.add(supPole);
    const supTop = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0115, 0.003, 20), supM), { width: 0.7 }); group.add(supTop);
    const limeLabel = textPlate('澄清石灰水', { w: 0.04, h: 0.0075, color: '#3b4254', bg: '#fffaf0', font: 'bold 84px "Songti SC", serif' }); limeLabel.position.set(LX, 0.0038, 0.0215); limeLabel.rotation.x = -0.5; group.add(limeLabel);
    const endWater = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 1, 8), water2({ color: 0xb8d8e6, base: 0.75 })); endWater.geometry.translate(0, 0.5, 0); endWater.scale.y = 0.0001; endWater.visible = false; endWater.renderOrder = 8; endWater.position.set(LX, TIP_Y, 0); group.add(endWater);

    // ================= 桌上：两种固体（表面皿）、纸槽、一张纸 =================
    const dish = (x, z, text, kind) => {
      const g = new THREE.Group(); g.position.set(x, 0, z);
      const d = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.016, 0.004, 24), paint(0xe9edf0)), { width: 0.6 }); d.position.y = 0.002;
      const heap = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xf6f3ea, { unique: true, keep: true })); heap.scale.set(1, kind === 'nahco3' ? 0.4 : 0.3, 1); heap.position.y = 0.0035;
      const lab = textPlate(text, { w: 0.04, h: 0.0095, color: '#3b4254', bg: '#fffaf0', font: 'bold 80px "Songti SC", serif' }); lab.position.set(0, 0.006, 0.025); lab.rotation.x = -0.5;
      g.add(d, heap, lab); group.add(g);
      return Object.assign(g, { kind });
    };
    const dishes = [dish(-0.2, TZ, 'Na₂CO₃ 1 g', 'na2co3'), dish(-0.15, TZ, 'NaHCO₃ 1 g', 'nahco3')];
    const trough = new THREE.Group(); const TROUGH_HOME = V(-0.115, 0.003, TZ), TROUGH_HIGH = 0.17;
    for (const s of [1, -1]) { const p = inked(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.0006, 0.008), paint(0xfbfaf4)), { width: 0.6 }); p.position.set(0.045, 0.0026, s * 0.0028); p.rotation.x = s * 0.75; trough.add(p); }
    const tPowder = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.0018, 0.0034), paint(0xf6f3ea, { unique: true, keep: true })); tPowder.position.set(0.03, 0.0012, 0); tPowder.visible = false; trough.add(tPowder);
    const troughPick = pickBox(0.1, 0.02, 0.022); troughPick.position.x = 0.045; trough.add(troughPick);
    trough.position.copy(TROUGH_HOME); group.add(trough);
    const paper = inked(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.0008, 0.058), paint(0xfffefa)), { width: 0.6 }); paper.position.set(PAPER.x, 0.0004, PAPER.z); group.add(paper);

    // ================= 气泡、试管里的气体小点、热 =================
    const dust = new Particles({ max: 80, geometry: new THREE.IcosahedronGeometry(1, 0), material: paint(0xf6f3ea, { unique: true, keep: true }) }); group.add(dust.mesh);
    const bubs = new Particles({ max: 160, geometry: new THREE.SphereGeometry(1, 8, 6), material: bubble2({ color: 0x6f8797, white: 0.2 }) }); group.add(bubs.mesh); bubs.mesh.renderOrder = 9.8;
    const dotTex = canvasTex(64, 64, (g, Wd) => { const gr = g.createRadialGradient(Wd / 2, Wd / 2, 0, Wd / 2, Wd / 2, Wd / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,1)'); gr.addColorStop(0.75, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, Wd, Wd); });
    const darkP = new Particles({ max: 60, sprite: true, color: DARK }), lightP = new Particles({ max: 60, sprite: true, color: LIGHT }), blueP = new Particles({ max: 30, sprite: true, color: BLUE });
    for (const p of [darkP, lightP, blueP]) { p.mat.uniforms.map.value = dotTex; p.mesh.renderOrder = 10; group.add(p.mesh); }
    const N_DOT = 34;
    const dots = Array.from({ length: N_DOT }, (_, i) => ({ rank: (i + 0.5) / N_DOT, y0: Math.random(), rx: -0.0062 + Math.random() * 0.007, rz: (Math.random() * 2 - 1) * 0.005, ph: Math.random() * 6, p: V(0, 0, 0), size: 0.0026, alpha: 0.9, age: 0, life: 1e9 }));
    const heat = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff7a2a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    heat.renderOrder = 13; heat.raycast = () => {}; group.add(heat);

    // ================= 卡片 =================
    const tubeCard = tag('', 'cond'); tubeCard.px = [-40, -96];
    const limeCard = tag('', 'cond'); limeCard.px = [56, -30];

    // ================= 状态 =================
    const fresh = () => ({
      kind: null, plug: 'in', limeIn: false, ly: 0, lit: false,
      T: Array(NSEG).fill(T0), x: Array(NSEG).fill(0), co2: 0, air: V_ROOM, h2o: 0,
      suck: 0, limeCO2: 0, lime: 0, broken: '', wet: false, heatT: 0, coolT: 0, lampFirst: false,
      pourK: -1, plugK: 0, anim: null, scooped: '', validT: 0, ran: { nahco3: false, na2co3: false }, ranInfo: {}, bothAsked: false, seq: [], seen: {}, limeAt: null,
      outCO2: 0, flowV: 0, demo: false, near: false, limeDrag: null, troughDrag: false, troughBack: null,
    });
    S = fresh();
    const FX = { bubAcc: 0, lastOut: 0, drift: 0 };
    const { status, done } = guards(() => S, () => W, () => bar);
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };
    const seq = (t) => { if (S.seq[S.seq.length - 1] !== t) S.seq.push(t); };
    const xi = () => S.x.reduce((a, b) => a + b, 0) / NSEG;
    const Tmax = () => Math.max(...S.T);
    const Tavg = () => S.T.reduce((a, b) => a + b, 0) / NSEG;
    const tipIn = () => S.ly > 0.036;
    const solidG = () => (S.kind === 'nahco3' ? M_SAMPLE - xi() * (M_SAMPLE - M_LEFT) : S.kind === 'na2co3' ? M_SAMPLE : 0);

    const A = {
      plug() {
        if (S.broken) return status('试管已经炸裂了。点“更多”里的“全部重来”。');
        if (S.pourK >= 0) return;
        if (S.plug === 'in') {
          if (S.ly > 0.01) return status('导管口还插在石灰水里，塞子拔不出来：先把<b>石灰水试管</b>往下拉，让导管口离开它。');
          if (S.lit || Tmax() > 60) return status('试管还热着，<b>不要拔塞子</b>。');
          S.plug = 'out'; return status('拔出了橡胶塞（连着导管）。用<b>纸槽</b>取一种固体，铺进试管。');
        }
        if (S.ly > 0.01) return;
        S.plug = 'in'; sfx.clink({ freq: 900, gain: 0.03 });
        if (!S.kind) return status('塞上了橡胶塞——试管里还没有固体。');
        S.co2 = 0; S.air = V_ROOM; done('load');
        status('塞紧了橡胶塞。下一步：把<b>石灰水试管</b>往上推，让导管口插进澄清石灰水。');
      },
      load(kind) {
        if (S.kind || S.anim) return;
        if (S.plug === 'in') return status('先拔出橡胶塞。');
        S.kind = kind; S.anim = { kind: 'trough', t: 0 }; S.h2o = 0; S.x.fill(0); S.ran[kind] = false; S.heatT = 0; S.coolT = 0; S.validT = 0; S.seen = {}; S.lampFirst = false; S.suck = 0; S.wet = false;
        status(`用纸槽把约 1 g ${NAME[kind]}（${ZH[kind]}）铺在试管底部。再点一下橡胶塞，把它塞紧。`);
      },
      lime(on) {
        if (S.broken) return;
        if (on && S.plug === 'out') return status('塞子还没塞上：先把橡胶塞塞紧。');
        const was = S.limeIn; S.limeIn = on; if (on === was) return;
        if (on) {
          seq('导管插入石灰水'); done('lime');
          status(S.lit ? '导管口插进了澄清石灰水里。' : '导管口插进了澄清石灰水里。现在<b>点燃酒精灯</b>，加热试管底部的固体。');
        } else {
          seq('导管离开石灰水');
          if (S.lit) status('石灰水降下来了，导管口离开了石灰水。现在可以<b>熄灭酒精灯</b>（点一下酒精灯，盖上灯帽）。');
          else if (S.lampFirst && !S.broken) { if (S.suck < V_LINE) done('stop'); if (S.suck < V_LINE) status('及时把石灰水降下来，倒吸的石灰水没有流进试管。加热制气的实验，结束时<b>先让导管离开液体，再熄灯</b>（课本这一节没写，是通用的操作注意事项）。'); }
          else status('石灰水降下来了。');
        }
      },
      newLime() {
        if (S.ly > 0.004 || S.broken) return;
        if (S.limeCO2 < 0.2 && S.suck < 0.2 && !S.wet) return status('石灰水还是新的，不用换。');
        S.limeCO2 = 0; S.lime = 0; S.limeAt = null; S.suck = 0; S.seen.air = false; S.seen.clear = false; sfx.clink({ freq: 1100, gain: 0.03 });
        status('换了一管新的澄清石灰水。');
      },
      light() {
        if (S.broken) return status('试管已经炸裂了。点“更多”里的“全部重来”。');
        if (S.pourK >= 0) return;
        if (!S.lit) {
          S.lit = true; seq('点燃酒精灯');
          if (!S.kind) return status('点燃了酒精灯——可是试管里还没有固体。');
          if (S.plug === 'out') return status('点燃了酒精灯。注意：橡胶塞和导管还没塞上，气体会从试管口跑掉。');
          if (!tipIn()) return status('点燃了酒精灯。导管口还没插进石灰水，气体只会从导管口冒到空气里。');
          done('heat');
          status(`点燃了酒精灯，加热 ${NAME[S.kind]}。盯着<b>固体</b>、<b>试管口</b>的管壁和右边的<b>石灰水</b>。`);
          return;
        }
        S.lit = false; seq('停止加热');
        if (tipIn() && S.plug === 'in') {
          S.lampFirst = true;
          status('导管口还在石灰水里就<b>停止了加热</b>！盯着导管：试管冷下来，里面的气体收缩……');
        } else { status(S.kind && S.ran[S.kind] ? '停止了加热。等试管冷却（看试管旁的温度），再拔出橡胶塞、点一下试管倒出固体。' : '停止了加热。'); done('stop'); }
      },
      pour() {
        if (S.pourK >= 0 || !S.kind) return;
        if (S.broken) return status('试管已经炸裂了。点“更多”里的“全部重来”。');
        if (tipIn()) return status('导管口还插在石灰水里：先把<b>石灰水试管</b>往下拉，让导管口离开石灰水；再熄灭酒精灯，等试管冷却，拔出橡胶塞，才能倒出固体。');
        if (S.lit) return status('先熄灭酒精灯（导管口已经离开石灰水），等试管冷却，再倒出固体。');
        const t = Tmax();
        if (t > 60) return status(`试管还很烫（最热处约 ${Math.round(t / 10) * 10} ℃）。要<b>等试管冷却</b>后再倒。`);
        if (S.plug === 'in') return status('先拔出橡胶塞，再倒出固体。');
        S.pourK = 0; seq('冷却后倒出固体'); far();
      },
      reset() {
        S = fresh(); bubs.clear(); dust.clear(); S.near = false; back(); asmPose(0); lime.position.y = 0;
        if (W) { W.tbl.clear(); W.q1.close(); W.q2.close(); W.next.hidden = true; } mic.close();
        bar.undo('load', 'lime', 'heat', 'watch', 'stop', 'second', 'why');
        status('全部重新摆好了，记录也清空了。');
      },
    };

    const drag = draggable(group, [
      { obj: troughPick, plane: 'xy', offset: TZ, hint: () => (S.kind ? '' : S.scooped ? '拖到试管口：把固体铺进试管' : '拖到表面皿上：取一点固体'), enabled: () => !S.kind,
        onStart: () => { S.troughDrag = !S.kind && !S.anim; },
        onDrag: (p) => {
          if (!S.troughDrag) return;
          trough.position.set(p.x - 0.045, Math.max(0.003, p.y), TZ); trough.quaternion.identity();
          for (const d of dishes) if (Math.abs(trough.position.x + 0.045 - d.position.x) < 0.03 && trough.position.y < 0.02) S.scooped = d.kind;
        },
        onEnd: () => { if (!S.troughDrag) return; S.troughDrag = false; const tip = trough.position.clone().setZ(0); const ok = tip.distanceTo(MOUTH) < 0.05 || trough.position.clone().add(V(0.045, 0, 0)).setZ(0).distanceTo(MOUTH) < 0.04; if (ok) { if (S.scooped) A.load(S.scooped); else status('纸槽上还没有固体：先把纸槽伸到表面皿里取一点。'); } } },
      { obj: plugPick, anchor: asm, plane: 'xy', offset: 0, hint: () => (S.plug === 'in' ? '点一下：拔出橡胶塞（连着导管）' : '点一下：塞紧橡胶塞'), onTap: () => A.plug(), onStart: () => {}, onDrag: () => {}, onEnd: () => {} },
      { obj: limePick, anchor: lime, plane: 'xy', offset: 0, keepOffset: true, hint: () => (S.limeIn ? '往下拖：石灰水降下来，导管口离开石灰水' : '往上拖：导管口插进石灰水里（点一下：换一管新石灰水）'),
        onStart: () => { S.limeDrag = lime.position.y; },
        onDrag: (p) => { S.limeDrag = S.plug === 'out' ? 0 : clamp(p.y, 0, Y_IN); },
        onEnd: (moved) => { const y = S.limeDrag; S.limeDrag = null; if (!moved || y == null) return; if (S.plug === 'out') { if (!S.limeIn) status('塞子还没塞上：先把橡胶塞塞紧，石灰水试管才能升起来。'); return; } A.lime(y > 0.034); },
        onTap: () => A.newLime() },
      { obj: lampPick, plane: 'xy', offset: 0, hint: () => (S.lit ? '点一下：熄灭酒精灯（盖上灯帽）' : '点一下：点燃酒精灯'), onTap: () => A.light(), onStart: () => {}, onDrag: () => {}, onEnd: () => {} },
      { obj: tubePick, plane: 'xy', offset: 0, hint: () => (!S.kind || S.lit ? '' : '点一下：把固体倒出来（要等冷却）'), onTap: () => A.pour(), onStart: () => {}, onDrag: () => {}, onEnd: () => {} },
    ], { tip: tag('', 'pill') });

    const act = demoActs(drag, group);
    const POWDER_C = BOTTOM.clone().addScaledVector(D, S_FLAME);
    const mic = micro({ tag, look, back, group, scene: bicarbScene(), at: () => POWDER_C.clone().add(V(0, 0.004, 0)), label: '钻进固体里看',
      state: () => ({ kind: S.kind, x: xi(), T: Tmax() }), key: () => S.kind || '', show: () => !!S.kind && S.pourK < 0, bar: () => bar, scale: 0.0052, lookD: [0.05, 0.3, 1], dist: 0.24,
      btnAt: () => POWDER_C.clone().add(V(0, -0.024, 0.02)) });
    const mouthGrab = () => V(MOUTH.x + 0.047, MOUTH.y - 0.0045, 0);

    // ================= 底部步骤栏 + 老师的演示 =================
    const P = (x, y, z = 0) => [x + OX, y, z];
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'load', title: '装固体', todo: '点<b>橡胶塞</b>拔出来；用<b>纸槽</b>在 Na₂CO₃ 或 NaHCO₃ 的表面皿里取一点（约 1 g），拖到试管口铺进去；再点橡胶塞塞紧。', target: () => (S.kind ? (S.plug === 'in' ? null : plug) : S.plug === 'in' ? plug : trough) },
        { id: 'lime', title: '导管插入石灰水', todo: '把<b>石灰水试管</b>往上推，让导管口插进<b>澄清石灰水</b>里。', target: () => (S.limeIn ? null : lime) },
        { id: 'heat', title: '加热', todo: '点一下<b>酒精灯</b>点燃，加热试管底部的固体。', target: () => (S.lit ? null : lamp) },
        { id: 'watch', title: '观察', todo: '加热几分钟：盯着<b>固体</b>、<b>试管口</b>的管壁和右边的<b>石灰水</b>。石灰水变浑浊、管口有水珠，就可以停止加热（Na₂CO₃ 加热两三分钟，石灰水始终不变，也可以停）。（时间加快了 6 倍）' },
        { id: 'stop', title: '停止加热', todo: '先把<b>石灰水试管</b>往下拉，让导管口离开石灰水；再点一下<b>酒精灯</b>熄灭（盖上灯帽）。', target: () => (tipIn() ? lime : S.lit ? lamp : null) },
        { id: 'second', title: '换另一种固体', todo: '等试管冷却，拔出橡胶塞、点一下<b>试管</b>倒出固体，石灰水换一管新的（降到底后点一下它），用另一种固体再做一次，比较两种的现象。', target: () => (S.kind && S.ran[S.kind] ? (tipIn() ? lime : S.lit ? lamp : Tmax() > 60 ? null : S.plug === 'in' ? plug : tube) : null) },
        { id: 'why', title: '想一想', todo: '哪一种受热分解？怎样用加热的方法鉴别它们？在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { bubs.clear(); dust.clear(); asmPose(S.plugK); lime.position.y = S.ly; },
            view: { save: () => (mic.isOpen || S.near ? { mic: mic.isOpen, near: S.near, args: S.nearArgs } : null),
              restore: (v) => { if (v.near && v.args) { near(v.args[0], v.args[1], v.args[2]); } if (v.mic) mic.open(); } } }),
          shots: [
            { cap: '实验2-5：先拔出橡胶塞（连着导管）。取一点 NaHCO₃，用纸槽铺进试管底部。', dur: 12, cam: [P(-0.07, 0.1, 0.05), [0.1, 0.32, 1], 0.6],
              during: act.seq(act.tap(plugPick, 0.02),
                act.path(troughPick, [() => trough.position.clone().add(V(0.045, 0, 0)), V(-0.11, 0.035, 0.1), V(dishes[1].position.x, 0.03, dishes[1].position.z), V(dishes[1].position.x, 0.008, dishes[1].position.z),
                  V(dishes[1].position.x, 0.07, dishes[1].position.z), V(MOUTH.x + 0.047, TROUGH_HIGH, dishes[1].position.z), V(MOUTH.x + 0.047, TROUGH_HIGH, 0), V(MOUTH.x + 0.047, MOUTH.y - 0.0045, 0), MOUTH.clone().add(V(0.045, -0.0045, 0))], { t0: 0.1, t1: 0.74, release: 0.75 }),
                act.tap(plugPick, 0.9)) },
            { cap: '试管固定在铁架台上，管口略向下倾斜；把石灰水试管往上推，导管口插进澄清石灰水。', dur: 3.4, cam: [P(0.04, 0.1), [0.1, 0.25, 1], 0.36],
              during: act.drag(limePick, () => V(LX, Y_IN + 0.0, 0), { t0: 0.1, t1: 0.7, release: 0.75, from: () => V(LX, 0.03, 0) }) },
            { cap: '点燃酒精灯，加热试管底部的固体。刚开始冒出的气泡，是试管里受热膨胀的空气——石灰水不变浑浊。', dur: 5.2, speed: 0.9, cam: [P(LAMP_X + 0.06, 0.12), [0.1, 0.25, 1], 0.4], during: act.tap(lampPick, 0.05) },
            { cap: '继续加热：试管口的管壁上出现水珠；导管口冒出的气泡里有了二氧化碳，石灰水变浑浊。钻进固体里看：两个 HCO₃⁻ 变成 CO₃²⁻、H₂O 和 CO₂。', dur: 12, speed: 3, cam: [P(POWDER_C.x + 0.03, POWDER_C.y + 0.03), [0.05, 0.3, 1], 0.26], during: act.at(0.3, () => mic.open(true)) },
            { cap: '石灰水变浑浊了：生成了 CO₂。', dur: 2.4, speed: 1.5, cam: [P(LX, 0.09), [0.1, 0.2, 1], 0.26], enter: () => mic.close() },
            { cap: '结束时先把石灰水降下来、让导管口离开石灰水，再熄灭酒精灯（通用的加热制气操作，防止倒吸）。', dur: 5, cam: [P(0.0, 0.1), [0.1, 0.22, 1], 0.5],
              during: act.seq(act.drag(limePick, () => V(LX, 0, 0), { t0: 0.04, t1: 0.4, release: 0.45, from: () => V(LX, Y_IN, 0) }), act.tap(lampPick, 0.6)) },
            { cap: '冷却后拔出塞子、倒出固体：还是白色，可是变少了——碳酸氢钠分解成了碳酸钠。演示完了，换碳酸钠再做一遍，下面换你自己做。', dur: 8, cam: [P(-0.04, 0.09, 0.03), [0.1, 0.3, 1], 0.45], enter: () => { S.T = S.T.map((t) => Math.min(t, 40)); }, during: act.seq(act.tap(plugPick, 0.05), act.tap(tubePick, 0.3)) },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ================= 化学模型（实际时间 hh 秒） =================
    const model = (hh) => {
      const sealed = S.plug === 'in' && !S.broken;
      for (let i = 0; i < NSEG; i++) {
        const d = segS(i) - S_FLAME;
        const tar = S.lit ? T0 + (T_PK - T0) * Math.exp(-((d / 0.022) ** 2)) : T0;
        S.T[i] += (tar - S.T[i]) * (1 - Math.exp(-hh / (tar > S.T[i] ? TAU_HEAT : TAU_COOL)));
      }
      if (S.lit) S.heatT += hh; else if (S.heatT > 0) S.coolT += hh;
      if (S.lit && sealed && tipIn() && S.limeCO2 <= 1) S.validT += hh;      // 有效观察：塞紧、导管浸在液面下、用的是新石灰水
      // 反应：2NaHCO₃ → Na₂CO₃ + H₂O + CO₂（一级）；Na₂CO₃ 不反应
      let dx = 0;
      if (S.kind === 'nahco3' && S.pourK < 0) for (let i = 0; i < NSEG; i++) { const x = S.x[i], nx = Math.min(1, 1 - (1 - x) * Math.exp(-kAt(S.T[i]) * hh)); dx += (nx - x) / NSEG; S.x[i] = nx; }
      S.co2 += dx * CO2_MAX; S.h2o += dx * H2O_MAX;
      // 试管 + 导管里的气体（25 ℃ 的毫升数）
      const Tg = T0 + 0.45 * (Tavg() - T0);
      const tot = S.co2 + S.air, vol = tot * (Tg + 273) / 298;
      let out = 0, airIn = 0;
      const exch = (room) => { if (vol > room) out = (vol - room) * 298 / (Tg + 273); else airIn = (room - vol) * 298 / (Tg + 273); };
      if (!sealed || S.pourK >= 0) {
        exch(V_ROOM);
        const a = 1 - Math.exp(-0.05 * hh), t2 = tot - out + airIn;       // 敞口：慢慢和外面的空气混合
        S.co2 += (0 - S.co2) * a; S.air += (t2 - S.co2 - S.air) * a;
      } else if (tipIn()) {
        if (vol > V_ROOM - S.suck) { S.suck = Math.max(0, V_ROOM - vol); if (vol > V_ROOM) out = (vol - V_ROOM) * 298 / (Tg + 273); }
        else S.suck = Math.min(V_LINE + 0.5, S.suck + Math.min(V_ROOM - S.suck - vol, 0.6 * hh));      // 石灰水沿导管被吸上来
      } else { S.suck = Math.max(0, S.suck - 2 * hh); exch(V_ROOM - S.suck); }
      if (out > 0) {
        const t = S.co2 + S.air, f = out / t, oc = S.co2 * f; S.co2 -= oc; S.air -= S.air * f;
        if (sealed && tipIn()) {
          S.limeCO2 += oc * ABS; S.lime = limeTurb(S.limeCO2);
          FX.bubAcc += out; S.outCO2 = oc / out; FX.lastOut = 0.6;
          if (!S.seen.air && S.outCO2 < 0.3 && S.lit && S.kind) { S.seen.air = true; log([`${NAME[S.kind]} 刚加热：导管口冒出气泡`, '石灰水<b>不变浑浊</b>', '冒出的是试管里受热膨胀的空气']); }
        }
      }
      if (airIn > 0) S.air += airIn;
      S.flowV = (out - airIn) / Math.max(hh, 1e-6);
      // 倒吸：石灰水吸满导管（约 3 mL），流进试管
      if (S.suck >= V_LINE && !S.broken && !S.wet) {
        if (Tmax() > T_BROKEN) {
          S.broken = 'suck'; S.lit = false; sfx.clink({ freq: 500, gain: 0.08 }); far(); near(POWDER_C.clone().add(V(0.02, 0, 0)), [0.05, 0.25, 1], 0.2);
          status('<b>石灰水倒吸进了热的试管，试管炸裂了。</b>加热制气的实验，结束时要<b>先让导管离开液体，再熄灯</b>（课本这一节没写，是通用的操作注意事项）。点“更多”里的“全部重来”再做一次。');
          log(['导管口还在石灰水里就停止加热', '石灰水<b>倒吸</b>进热试管，试管<b>炸裂</b>', '试管冷却，里面的气体收缩']);
        } else { S.wet = true; status('石灰水倒流进了试管里，把固体弄湿了。'); }
      }
      if (S.lampFirst && S.suck > 0.4 && !S.seen.suck && !S.broken) { S.seen.suck = true; near(V(LX - 0.02, 0.09, 0), [0.1, 0.25, 1], 0.3); status('石灰水在沿着导管<b>往上吸</b>！赶快把<b>石灰水试管</b>往下拉。'); }
    };

    // ================= 每帧 =================
    const tmp = new THREE.Vector3(), q4 = new THREE.Quaternion();
    const qTube = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), D), qPour = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), POUR_D);
    const POUR_B = POUR_MOUTH.clone().addScaledVector(POUR_D, -0.15);
    const ease = (k) => k * k * (3 - 2 * k);
    const asmPose = (K) => {
      if (K < 0.3) { asm.position.copy(O_ASM).addScaledVector(D, 0.04 * ease(K / 0.3)); asm.quaternion.copy(ID); }
      else { const u = ease((K - 0.3) / 0.7); asm.position.copy(O_ASM).addScaledVector(D, 0.04).lerp(PARK, u); asm.position.y += Math.sin(Math.PI * u) * 0.04; asm.quaternion.slerpQuaternions(ID, qPark, u); }
    };
    const finishPour = () => {
      S.kind = null; S.pourK = -1; S.x.fill(0); S.h2o = 0; S.wet = false; S.scooped = ''; S.co2 = 0; S.air = V_ROOM; mic.close();
      status('固体倒掉了。试管空了：可以再装另一种固体。（石灰水要换一管新的：先把石灰水试管降到底，再点一下它。）');
    };
    const step = (dt, t) => {
      // 石灰水试管的高度（拖着时跟手，松手后升起 / 降下）
      const want = S.limeDrag != null ? S.limeDrag : S.limeIn ? Y_IN : 0;
      S.ly += (want - S.ly) * Math.min(1, dt * (S.limeDrag != null ? 30 : 7)); if (Math.abs(S.ly - want) < 0.0003) S.ly = want;
      lime.position.y = S.ly;
      supPole.scale.y = Math.max(0.0001, S.ly - 0.0045); supPole.position.set(LX, 0.002, 0); supTop.position.set(LX, S.ly - 0.0015, 0);
      supPole.visible = supTop.visible = supFoot.visible = S.ly > 0.006;
      const H = dt * SPEED, n = Math.max(1, Math.ceil(H / 0.25));
      for (let i = 0; i < n; i++) model(H / n);
      // 纸槽的动画（铺进试管）
      if (S.anim) {
        S.anim.from ||= trough.position.clone();
        S.anim.t += dt;
        const k = S.anim.t / 1.6;
        if (k < 1) {
          const s = k < 0.45 ? 0.15 - (k / 0.45) * 0.135 : k < 0.6 ? 0.015 : 0.015 + ((k - 0.6) / 0.4) * 0.15;
          trough.position.copy(BOTTOM).addScaledVector(D, s).add(V(0, -0.0045, 0)); trough.quaternion.setFromUnitVectors(V(1, 0, 0), D); tPowder.visible = k < 0.5;
          if (k < 0.15) { trough.position.lerpVectors(S.anim.from, trough.position, ease(k / 0.15)); trough.quaternion.slerpQuaternions(ID, trough.quaternion, ease(k / 0.15)); }
        }
        else { S.anim = null; trough.quaternion.identity(); S.scooped = ''; const a = trough.position.clone(); S.troughBack = { t: 0, pts: [a, V(a.x, TROUGH_HIGH, a.z), V(a.x, TROUGH_HIGH, TROUGH_HOME.z), V(TROUGH_HOME.x, TROUGH_HIGH, TROUGH_HOME.z), TROUGH_HOME.clone()] }; }
      } else if (S.troughBack) {
        const B = S.troughBack; B.t = Math.min(1, B.t + dt / 1.3);
        const L = [0]; for (let i = 1; i < B.pts.length; i++) L.push(L[i - 1] + B.pts[i].distanceTo(B.pts[i - 1]));
        const u = ease(B.t) * L[L.length - 1]; let i = 1; while (i < B.pts.length - 1 && L[i] < u) i++;
        trough.position.lerpVectors(B.pts[i - 1], B.pts[i], clamp((u - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]), 0, 1)); trough.quaternion.identity();
        if (B.t >= 1) S.troughBack = null;
      } else if (!S.troughDrag) { trough.position.lerp(TROUGH_HOME, 0.15); trough.quaternion.identity(); }
      if (!S.anim) tPowder.visible = !S.kind && !!S.scooped && !S.troughBack;
      dust.update(dt, (p, d) => { p.v.y -= 0.6 * d; p.p.addScaledVector(p.v, d); return p.p.y > 0.005; });
      // 倒出固体
      if (S.pourK >= 0) {
        S.pourK = Math.min(1, S.pourK + dt / 2.6);
        if (S.pourK > 0.34 && S.pourK < 0.7 && Math.random() < dt * 50) { tubeHold.updateMatrix(); tmp.set(0.004, 0.15, 0).applyMatrix4(tubeHold.matrix); dust.spawn({ p: tmp.clone(), v: V(0.01, 0, 0), size: 0.0009, life: 0.8 }); }
        if (S.pourK >= 1) finishPour();
      }
      const pk = S.pourK < 0 ? 0 : S.pourK;
      const mv = pk < 0.3 ? ease(pk / 0.3) : pk < 0.76 ? 1 : 1 - ease((pk - 0.76) / 0.24);
      tubeHold.position.lerpVectors(BOTTOM, POUR_B, mv); tubeHold.quaternion.slerpQuaternions(qTube, qPour, mv); tubeHold.updateMatrix();
      // 塞子 + 导管：点一下，先顺着管子拔出来，再转到桌上躺好
      S.plugK = clamp(S.plugK + clamp((S.plug === 'in' ? 0 : 1) - S.plugK, -dt * 1.2, dt * 1.2), 0, 1);
      asmPose(S.plugK);
      // 酒精灯、灯帽
      lamp.flame.setOn(capper.update(dt, S.lit)); lamp.flame.setSize(1);
      lamp.flame.setColors({ mid: 0xffdc8a, edge: 0xffa24a, blue: 0.85 });
      // 试管：裂纹、倒流进去的水
      tube.crack.visible = !!S.broken;
      tube.drops.children.forEach((d, i) => { d.visible = !!S.broken || S.wet; d.position.set(0.004 + (i % 2) * 0.002, 0.04 + i * 0.012, (i % 3 - 1) * 0.003); });
      // 管里的固体：一小堆（NaHCO₃ 分解后变少）
      const mS = solidG(), loaded = !!S.kind && !S.anim;
      const pourFade = S.pourK < 0 ? 1 : clamp(1 - (S.pourK - 0.34) / 0.3, 0, 1);
      const L = 0.0105 * mS * (S.wet ? 1.1 : 1) * pourFade;
      bed.visible = loaded && L > 0.0006; bed.scale.set(0.0032, Math.max(0.0005, L), 0.0058);
      bedMat.color.set(S.wet ? 0xe8ece8 : 0xf6f3ea);
      // 试管口的水珠
      const nd = Math.round(clamp(S.h2o / H2O_MAX, 0, 1) * NDROP);
      condG.children.forEach((d, i) => { d.visible = S.kind === 'nahco3' && i < nd && S.pourK < 0.5; });
      // 第一次看到的现象
      const xm = xi();
      if (S.kind === 'nahco3' && S.limeAt != null && S.lime < 0.25 && S.limeCO2 > LIME_CO2 && !S.seen.clear && !S.demo) { S.seen.clear = true; log([`累计通入石灰水的 CO₂ 约 ${Math.round(S.limeCO2 / ABS)} mL（示意）`, '浑浊又慢慢<b>变清</b>了', 'CO₂ 过量：CaCO₃ + CO₂ + H₂O ══ Ca(HCO₃)₂，生成可溶的碳酸氢钙']); status('石灰水又<b>变清</b>了：通进去的二氧化碳已经过量，沉淀 CaCO₃ 变成了可溶的 Ca(HCO₃)₂。所以石灰水刚变浑浊、管口有水珠时，就可以停止加热了。'); }
      if (S.kind === 'nahco3' && S.lime > 0.6 && S.limeAt == null) { S.limeAt = S.heatT; log([`加热 NaHCO₃ 约 ${fmtT(S.heatT)}`, '澄清石灰水<b>变浑浊</b>', '生成了二氧化碳']); }
      if (S.kind === 'nahco3' && S.h2o / H2O_MAX > 0.15 && !S.seen.drops && S.lit) { S.seen.drops = true; log([`加热 NaHCO₃ 约 ${fmtT(S.heatT)}`, '试管口较冷的管壁上出现<b>水珠</b>', '生成了水']); }
      if (!S.demo) {
        if (S.kind === 'nahco3' && !S.ran.nahco3 && S.limeAt != null && S.seen.drops) {
          S.ran.nahco3 = true; S.ranInfo.nahco3 = { t: S.heatT, g: solidG() }; done('watch'); far();
          log([`加热 NaHCO₃ 约 ${fmtT(S.heatT)}`, `固体由 1.00 g 减到约 ${solidG().toFixed(2)} g，还是白色`, '2NaHCO₃ △══ Na₂CO₃ + H₂O + CO₂↑：质量减轻是跑出去了 CO₂ 和 H₂O']);
          status(`加热了约 ${fmtT(S.heatT)}：石灰水<b>变浑浊</b>，试管口有<b>水珠</b>，固体变少了。NaHCO₃ 受热分解。可以停止加热了：<b>先把石灰水试管降下来，再熄灯</b>。${S.ran.na2co3 ? '' : '然后用 Na₂CO₃ 再做一次，比较。'}`);
        }
        if (S.kind === 'na2co3' && !S.ran.na2co3 && S.heatT >= 150 && Tmax() > 160 && S.limeCO2 > 1 && !S.seen.used && S.validT < 150) { S.seen.used = true; status('石灰水还是上一次用过的（已经通进过二氧化碳），不能说明什么。先<b>降下石灰水试管</b>，点一下它换一管新的，再升起来继续加热。'); }
        if (S.kind === 'na2co3' && !S.ran.na2co3 && S.heatT >= 150 && S.validT < 150 && !(S.plug === 'in' && tipIn()) && !S.seen.noconn) { S.seen.noconn = true; log([`加热 Na₂CO₃ 约 ${fmtT(S.heatT)}，装置没接通`, '没有塞紧橡胶塞 / 导管口没插进石灰水，<b>条件缺失</b>', '这段加热不算有效观察，石灰水的结果还没法判断']); status('装置没有接通（要塞紧橡胶塞、导管口插进<b>新的</b>石灰水），这段加热<b>不算</b>有效观察。接好以后再加热，累计够了才记结果。'); }
        if (S.kind === 'na2co3' && !S.ran.na2co3 && S.validT >= 150 && Tmax() > 160) {
          S.ran.na2co3 = true; S.ranInfo.na2co3 = { t: S.validT, g: solidG() }; done('watch'); far();
          log([`加热 Na₂CO₃ 有效观察约 ${fmtT(S.validT)}（塞紧、导管浸在新石灰水里）`, '石灰水<b>始终不变浑浊</b>，试管口<b>没有水珠</b>，固体还是 1.00 g', '没有 CO₂ 和 H₂O 生成：Na₂CO₃ 受热不易分解']);
          status(`有效加热了约 ${fmtT(S.validT)}：石灰水<b>没有变浑浊</b>，试管口<b>没有水珠</b>。Na₂CO₃ 受热不易分解。可以停止加热了：<b>先把石灰水试管降下来，再熄灯</b>。${S.ran.nahco3 ? '' : '然后用 NaHCO₃ 再做一次，比较。'}`);
        }
        if (S.kind === 'nahco3' && S.lit && S.plug === 'out' && xm > 0.3 && !S.seen.open) { S.seen.open = true; log(['没有塞紧橡胶塞就加热 NaHCO₃', '石灰水<b>不变浑浊</b>', '生成的 CO₂ 从试管口跑掉了，没有通进石灰水']); }
        if (S.ran.nahco3 && S.ran.na2co3 && !S.bothAsked && !S.lit) { S.bothAsked = true; done('second'); W?.q1.open(); }
      }
      // 试管里的气体：深灰 = 二氧化碳，浅灰 = 空气里的氮气，蓝 = 氧气；有气体流出时往管口飘
      const gtot = S.co2 + S.air, fC = gtot ? S.co2 / gtot : 0, fO = gtot ? 0.21 * (1 - fC) : 0;
      const dk = [], lt = [], bl = [];
      if (S.plug === 'in' && S.pourK < 0 && S.plugK < 0.05) {
        FX.drift += clamp(S.flowV, -3, 6) * dt * 0.02;
        for (const d of dots) {
          const yy = 0.045 + ((d.y0 + FX.drift) % 1 + 1) % 1 * 0.09;
          d.p.set(d.rx + Math.sin(t * 0.8 + d.ph) * 0.0008, yy, d.rz + Math.cos(t * 0.7 + d.ph) * 0.0008).applyMatrix4(tubeHold.matrix);
          (d.rank < fC ? dk : d.rank < fC + fO ? bl : lt).push(d);
        }
      }
      darkP.list = dk; lightP.list = lt; blueP.list = bl;
      for (const p of [darkP, lightP, blueP]) p.update(0, () => true);
      // 气泡（导管口在石灰水里）
      const surfY = S.ly + LIME_LIQ - (S.suck / 9) * 0.02;
      while (FX.bubAcc > 0.4) { FX.bubAcc -= 0.4; if (tipIn()) bubs.spawn({ p: V(LX + (Math.random() - 0.5) * 0.002, TIP_Y + 0.001, 0), v: V(0, 0.03, 0), size: 0.0017 + Math.random() * 0.0007, life: 1.5 }); }
      FX.bubAcc = Math.min(FX.bubAcc, 2);
      bubs.update(dt, (p, d) => { p.v.y += 0.15 * d; p.p.addScaledVector(p.v, d); return p.p.y < surfY - 0.001; });
      FX.lastOut = Math.max(0, FX.lastOut - dt);
      // 热（橙）
      const tm = Tmax(), hot = S.T.indexOf(tm);
      heat.position.copy(tmp.set(0.003, segS(hot), 0).applyMatrix4(tubeHold.matrix)); heat.scale.setScalar(0.04);
      heat.material.opacity = S.pourK < 0 ? clamp((tm - 70) / 300, 0, 0.7) : 0;
      // 石灰水：浑浊；倒吸时液面下降、导管里有液柱
      limeMilk.set(S.lime); limeMilk.update(t);
      limeLiq.scale.y = Math.max(0.005, (LIME_LIQ - 0.0015) * (1 - S.suck / 9));
      endWater.visible = S.suck > 0.05 && tipIn(); endWater.scale.y = Math.min(yBend - 0.005 - TIP_Y, (S.suck / V_LINE) * (yBend - TIP_Y) * 1.1);
      // 卡片
      const tR = Math.round(tm / 10) * 10;
      const stamp = S.broken ? '<span class="cc-res burn">炸裂</span>' : '';
      tubeCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">试管里</span>${stamp}</div><div class="cc-more"><div class="cc-obs"><span class="cc-th"><i style="height:${clamp(tm / 2, 4, 100).toFixed(0)}%"></i></span><b>${tR}</b><small>℃ 最热处（约）</small></div><div class="cc-obs"><b>${mS.toFixed(2)}</b><small>g 固体（${S.kind ? NAME[S.kind] + (S.kind === 'nahco3' && xm > 0.02 ? ' 渐变成 Na₂CO₃' : '') : ''}）</small></div>${S.heatT > 0 ? `<div class="cc-note">${S.lit ? `已加热 ${fmtT(S.heatT)}` : `停止加热 ${fmtT(S.coolT)}`}（实际时间）</div>` : ''}</div></div>`)
        .loc(group, POWDER_C.x, POWDER_C.y + 0.014, 0).show(!!S.kind && S.pourK < 0 && !S.anim && !mic.isOpen && !bar.playing);
      const limeStamp = S.suck > 0.3 && tipIn() ? '<span class="cc-res burn">倒吸</span>' : S.lime > 0.6 ? '<span class="cc-res burn">变浑浊</span>' : '';
      const bubNote = FX.lastOut > 0 ? `<div class="cc-note">冒出的气泡：${S.outCO2 > 0.5 ? '主要是<b>二氧化碳</b>' : '主要是<b>空气</b>'}</div>` : '';
      limeCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">澄清石灰水</span>${limeStamp}</div>${bubNote ? `<div class="cc-more">${bubNote}</div>` : ''}</div>`)
        .loc(group, LX + 0.03, 0.12, 0).show((S.lime > 0.05 || FX.lastOut > 0 || S.suck > 0.3) && !mic.isOpen && !bar.playing);
      bar.near(S.near);
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.44, d: 0.3, h: 0.27 },
      view: { elev: 20, azim: -6, lookY: 0.4, margin: 1.12, frameMargin: 1.22 },          // frameMargin：真实顶点取景时多留一点，前排的表面皿不被底部步骤栏挡住
      mount(ui) {
        const rec = (k) => (S.ranInfo[k] ? (k === 'nahco3' ? `NaHCO₃：加热约 ${fmtT(S.ranInfo[k].t)}，石灰水<b class="y">变浑浊</b>，试管口有<b class="y">水珠</b>，固体 1.00 g → 约 ${S.ranInfo[k].g.toFixed(2)} g` : `Na₂CO₃：加热约 ${fmtT(S.ranInfo[k].t)}，石灰水<b class="n">不变浑浊</b>，试管口<b class="n">没有水珠</b>，固体还是 1.00 g`) : `${NAME[k]}：还没做`);
        const q2 = think({
          q: '现在有两瓶没有标签的白色粉末，一瓶是碳酸钠，一瓶是碳酸氢钠。怎样用<b>加热</b>的方法鉴别它们？',
          ctx: () => `<div>${rec('na2co3')}</div><div>${rec('nahco3')}</div>`,
          options: ['各取少量加热，把气体通入澄清石灰水：使石灰水变浑浊的那瓶是碳酸氢钠', '各取少量加热，观察哪一种熔化', '各取少量加热，观察哪一种变成黑色'],
          wrong: ['两种固体在酒精灯的温度下都不会熔化（碳酸钠熔点 851 ℃）。看看你的记录：哪一种加热后有新物质生成？', '两种固体加热后都还是白色。看看你的记录：哪一种加热后有新物质生成？'],
          ok: '对：碳酸氢钠受热分解，生成的 CO₂ 使澄清石灰水变浑浊，碳酸钠没有；“我们可以利用加热的方法来鉴别碳酸钠和碳酸氢钠。”可以掀开课本上的结论看看。',
          status: (m) => ui.status(m), onOk: () => { next.hidden = false; done('why'); },
        });
        const q1 = think({
          q: '比较两次实验，<b>哪一种固体受热分解</b>了？它生成了什么？',
          ctx: () => `<div>${rec('na2co3')}</div><div>${rec('nahco3')}</div>`,
          options: ['碳酸氢钠分解：生成使石灰水变浑浊的二氧化碳和试管口的水，留下碳酸钠；碳酸钠没有分解', '碳酸钠分解：生成了二氧化碳', '两种都分解了，只是碳酸氢钠分解得快一些'],
          wrong: ['看你的记录：加热碳酸钠时，石灰水变了吗？试管口有水珠吗？点“钻进固体里看”，看看 CO₃²⁻ 受热有没有变化。', '看你的记录：加热碳酸钠时，石灰水变浑浊了吗？石灰水不变，说明没有 CO₂ 生成。'],
          ok: '对：<b>2NaHCO₃ △══ Na₂CO₃ + H₂O + CO₂↑</b>。固体变轻，是因为 CO₂ 和 H₂O 跑出去了。碳酸钠很稳定，受热不易分解。',
          status: (m) => ui.status(m), onOk: () => q2.open(),
        });
        const vary = varyBox('课本说“分别加热”：两种都做一遍，比较现象。也可以试试：没有塞紧橡胶塞就加热 NaHCO₃；加热时把石灰水降下来；停止加热时让导管口还留在石灰水里。', h('span', {}));
        const more = moreBox([
          ['拔出 / 塞紧橡胶塞', () => A.plug()], ['石灰水试管升起 / 降下', () => A.lime(!S.limeIn)], ['换一管新的石灰水', () => A.newLime()],
          ['点燃 / 熄灭酒精灯', () => A.light()], ['倒出试管里的固体', () => A.pour()], ['钻进固体里看', () => mic.open()],
        ], () => A.reset());
        const note = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'), h('p', { class: 'fineprint', html: '固体各 1 g（课本实验2-4 取各约 1 g，这里沿用）；时间加快 6 倍。NaHCO₃ 1 g = 11.9 mmol，分解最多得 CO₂ 5.95 mmol（25 ℃ 约 146 mL）、H₂O 0.107 g，剩 Na₂CO₃ 0.631 g（固体质量按这个算）。<br>温度和速率是示意：粉末最热处按约 175 ℃，NaHCO₃ 按一级反应、活化能约 100 kJ/mol 估计（150 ℃ 时速率常数约 0.0035/s）；Na₂CO₃ 在酒精灯的温度下不分解（熔点 851 ℃）。<br>石灰水：Ca(OH)₂ 溶解度约 0.17 g/100 g 水，8 mL 约能吸收 4.5 mL CO₂ 而变浑浊（通入的 CO₂ 约一半被吸收）。按物料衡算：8 mL 石灰水里 Ca(OH)₂ 约 0.184 mmol，Ca(OH)₂ + CO₂ ══ CaCO₃↓ + H₂O 只要约 4.5 mL CO₂ 就全浑浊；CO₂ 过量后 CaCO₃ + CO₂ + H₂O ══ Ca(HCO₃)₂，再吸约 4.5 mL 就全变清（浑浊度跟 CaCO₃ 的量走）。课本这里没写这一步，是 CO₂ 过量时的实际现象。“通过的 CO₂ 约一半被吸收”是示意值。<br>倒吸：导管里约 3 mL；吸满就流进试管，管里还烫（> 100 ℃，示意）时试管炸裂。“先让导管离开液体再熄灯”是加热制气实验通用的操作注意事项，课本这一节没写。深灰小点 = CO₂，浅灰 = 氮气，蓝 = 氧气，橙 = 热。' }));
        const { tbl, next } = mountXuean(ui, { controls: [q1, q2, vary, more, note], headers: ['做了什么', '现象', '说明'], tableTitle: '观察记录' });
        W = { tbl, q1, q2, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('图2-7 的装置：试管固定在铁架台上（管口略向下倾斜），下面是酒精灯。可以先看<b>老师演示</b>，也可以直接动手：先点<b>橡胶塞</b>拔出来，再装固体。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); lamp.flame.update(t); mic.update(dt, k); },
      dispose() { mic.dispose(); bar.dispose(); bubs.dispose(); dust.dispose(); darkP.dispose(); lightP.dispose(); blueP.dispose(); },
      debug: { get S() { return S; }, A, bar, MOUTH, xi, mic, picks: { trough: troughPick, plug: plugPick, lime: limePick, lamp: lampPick, tube: tubePick, limeTube: lime, lampBody: lamp },
        qa: qaFlow(drag, [
          { name: '拔出橡胶塞', tap: plugPick, wait: 2 },
          { name: '纸槽取 NaHCO₃', drag: troughPick, to: () => V(dishes[1].position.x, 0.01, dishes[1].position.z) },
          { name: '纸槽铺进试管', drag: troughPick, to: () => MOUTH.clone(), wait: 2.5 },
          { name: '塞紧橡胶塞', tap: plugPick, wait: 2 },
          { name: '石灰水升起', drag: limePick, to: () => V(LX, Y_IN, 0), wait: 1 },
          { name: '点燃酒精灯', tap: lampPick, wait: 1 },
          { name: '钻进固体里看', run: () => mic.open(), wait: 14 },
          { name: '回到桌上', run: () => mic.close(), wait: 22 },
          { name: '降下石灰水', drag: limePick, to: () => V(LX, 0, 0), wait: 1 },
          { name: '熄灭酒精灯', tap: lampPick, wait: 22 },
          { name: '拔出橡胶塞（NaHCO₃ 之后）', tap: plugPick, wait: 2 },
          { name: '倒出固体', tap: tubePick, wait: 4 },
          { name: '换新石灰水', tap: limePick, wait: 1 },
          { name: '纸槽取 Na₂CO₃', drag: troughPick, to: () => V(dishes[0].position.x, 0.01, dishes[0].position.z) },
          { name: '纸槽铺进试管 2', drag: troughPick, to: () => MOUTH.clone(), wait: 2.5 },
          { name: '塞紧橡胶塞 2', tap: plugPick, wait: 2 },
          { name: '石灰水升起 2', drag: limePick, to: () => V(LX, Y_IN, 0), wait: 1 },
          { name: '点燃酒精灯 2', tap: lampPick, wait: 38 },
          { name: '降下石灰水 2', drag: limePick, to: () => V(LX, 0, 0), wait: 1 },
          { name: '熄灭酒精灯 2', tap: lampPick, wait: 4 },
          { name: '答第一题', run: () => W.q1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.q2.el.querySelector('button').click() },
        ]) },
    };
  },
};
