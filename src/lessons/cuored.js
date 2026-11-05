// 课题1 碳单质的多样性 · 实验 6-2 用木炭还原氧化铜（课本第 133 页图 6-9；碳与氧气反应见第 132 页）。
//
// 照图 6-9 搭：铁架台夹住试管（管口略向下倾斜），试管底部下面是升降台上的酒精灯（可加网罩）；
//   橡胶塞—玻璃导管—乳胶管（带弹簧夹）—玻璃导管，伸进右边试管里的澄清石灰水。
// 步骤（课本）：木炭粉和氧化铜粉末混合均匀，小心地铺放进试管 → 导管插入澄清石灰水 → 打开弹簧夹 → 用酒精灯（可加网罩）加热几分钟
//   → 先撤出导管，停止加热 → 用弹簧夹夹紧乳胶管 → 待试管冷却后把粉末倒在纸上。
// 化学：2CuO + C =高温= 2Cu + CO₂↑。2 g 氧化铜（0.0252 mol）需要木炭 0.151 g（质量比 159∶12 ≈ 13∶1）；常用约 10∶1（碳稍过量），
//   这里取 0.2 g。最多生成铜 1.60 g、二氧化碳 0.0126 mol（25 ℃ 下约 308 mL）。
// 温度（近似）：酒精灯外焰约 500–600 ℃；加网罩火焰集中，试管底部最热处约 700 ℃。粉末各处的温度按离火焰的远近分布。
// 反应速率：按阿伦尼乌斯式，活化能取约 120 kJ/mol（示意），700 ℃ 时约 3 分钟反应一大半；550 ℃ 时慢约 18 倍——不加网罩看不到明显变红。
// 气体：试管里的气体按 25 ℃ 下的毫升数记（二氧化碳、氮气、氧气）。受热膨胀 / 生成二氧化碳 → 从导管冒出；冷却收缩 →
//   导管在石灰水里：石灰水倒吸（导管、乳胶管里约 4 mL，吸满就流进热试管，试管炸裂）；导管在空气里、没夹紧：空气进去，
//   热的铜（约 180 ℃ 以上）和氧气反应又变成氧化铜（集中在粉末表层，看起来红里带黑）。弹簧夹没打开就加热：压强约 1.6 倍大气压时塞子被冲开。
// 澄清石灰水：氢氧化钙溶解度约 0.17 g/100 g 水，8 mL 石灰水约能和 4.5 mL 二氧化碳反应（变浑浊）。
// 看不见的东西：钻进粉末里看（kit/microworld.js 的 cuoScene）——碳原子把氧化铜里的氧原子拉走成 CO₂，铜原子留下；冷却时进了空气，热的铜又被氧化。橙 = 热。
import * as THREE from 'three';
import { seg } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { stand, canvasTex, textPlate, glowTexture } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { testTube, stopper, glassTube, rubberTube, chemLamp, tubeClamp, labJack } from './kit/chem.js';
import { bubble2, water2, milky } from './kit/chemfx.js';
import { micro, cuoScene } from './kit/microworld.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, guards, think, mountXuean, moreBox, varyBox, paperSheet, demoActs } from './kit/chemlesson.js';
import { lampCap } from './kit/labops.js';
import { sfx } from './kit/audio.js';
import { paint, inked, hull } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const SPEED = 8;                         // 时间加快倍数
const T0 = 25;
const M_CUO = 2.0, NEED_C = (M_CUO / 159) * 12;     // g：2 g 氧化铜恰好需要 0.151 g 木炭
const C_OPTS = [0.2, 0.15, 0.05];
const CO2_MAX = (M_CUO / 79.5 / 2) * 24465;           // mL（25 ℃）
const N_CUO = M_CUO / 79.5;                           // mol
const V_TUBE = 30, V_LINE = 4;                        // 试管里的气体空间、导管 + 乳胶管里的容积（mL）；两处的气体一起算
const LIME_CO2 = 4.5;                                 // 石灰水完全变浑浊需要的二氧化碳（mL）
const EA = 120000 / 8.314, K700 = 0.05;               // 活化能 / R；700 ℃ 时的速率常数（1/s，实际时间）
const TAU_HEAT = 25, TAU_COOL = 40;                   // 升温、降温的时间常数（s）
const T_COVER = 700, T_BARE = 550;                    // 最热处：加网罩 / 不加
const P_POP = 1.6;                                    // 塞子被冲开的压强（大气压的倍数，近似）
const SKIN = 0.04;                                    // 看得见的表层约占粉末的多少（重新氧化的铜集中在表层）
const NSEG = 12, POW = [0.012, 0.042], S_FLAME = 0.027;
const TILT = THREE.MathUtils.degToRad(5);
const LAMP_X = -0.14, AXIS_Y = 0.145, JACK_H = 0.028;
const LIME = new THREE.Vector3(0.13, 0.009, 0), LIME_SURF = 0.053, EH = 0.104;
const TIP = { lime: new THREE.Vector3(0.13, 0.024, 0), up: new THREE.Vector3(0.13, 0.068, 0) };
const PAPER = new THREE.Vector3(-0.035, 0, 0.075);
const PLUG_TABLE = new THREE.Vector3(0.026, 0, 0.04);
const OX = 0.04;                                      // group 往右挪，器材居中
const DARK = 0x3d4350, LIGHT = 0xb9bec8, BLUE = 0x2f7fd8;
const COL = { cuo: new THREE.Color(0x26282c), c: new THREE.Color(0x171513), cu: new THREE.Color(0xc4633a), cuAtom: new THREE.Color(0xd2703f), cuoAtom: new THREE.Color(0x1f2023) };
const D = new THREE.Vector3(Math.cos(TILT), -Math.sin(TILT), 0);       // 试管轴：从管底指向管口
const BOTTOM = new THREE.Vector3(LAMP_X, AXIS_Y, 0).addScaledVector(D, -S_FLAME);
const MOUTH = BOTTOM.clone().addScaledVector(D, 0.15);
const CLAMP_P = BOTTOM.clone().addScaledVector(D, 0.1);
const POUR_D = new THREE.Vector3(Math.cos(-0.62), Math.sin(-0.62), 0);
const POUR_MOUTH = new THREE.Vector3(PAPER.x + 0.012, 0.042, PAPER.z);
const segOf = (s) => clamp(Math.floor(((s - POW[0]) / (POW[1] - POW[0])) * NSEG), 0, NSEG - 1);
const segS = (i) => POW[0] + ((POW[1] - POW[0]) * (i + 0.5)) / NSEG;
const kAt = (T) => K700 * Math.exp(-EA * (1 / (T + 273) - 1 / 973));
const fmtT = (s) => (s < 50 ? `${Math.max(5, Math.round(s / 5) * 5)} 秒` : `${(s / 60).toFixed(1)} 分钟`);

export default {
  id: 'cuored',
  fig: '图6-9',
  title: '用木炭还原氧化铜',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '木炭粉和氧化铜粉末都是<b>黑色</b>的。把它们混匀，在试管里用酒精灯加强热几分钟，冷却后倒在纸上。<br>纸上的粉末会是——',
    hint: '课本第 133 页 实验 6-2',
    options: ['还是黑色——两种黑粉末只是混在一起', '出现红色的物质', '烧成了白色的灰'],
    answer: 1,
  },
  need: '混匀木炭粉和氧化铜、铺进试管，导管插入澄清石灰水、打开弹簧夹，加热几分钟；先撤导管再停止加热，夹紧乳胶管，冷却后倒在纸上',
  conclusion: {
    crops: [{ page: 139, rect: [64, 338, 478, 532] }],
    quote: '木炭与氧化铜反应，生成铜和二氧化碳。在这个反应中，氧化铜失去氧而变成单质铜。这种含氧化合物里的氧被夺去的反应属于还原反应。上述反应说明，在高温下木炭能使氧化铜还原为铜。',
    formula: '2CuO + C <span style="font-size:.8em">高温</span>══ 2Cu + CO₂↑',
    why: '黑色粉末里出现的<b>红色物质是铜</b>；生成的气体使澄清石灰水<b>变浑浊</b>，是<b>二氧化碳</b>。氧化铜失去氧变成铜——<b>还原反应</b>；木炭夺走了氧化铜里的氧，木炭具有<b>还原性</b>。这个反应要<b>高温</b>：酒精灯加网罩使火焰集中、温度升高，反应才明显。<br>停止加热时，要<b>先撤出导管，再停止加热</b>：先熄灯的话，试管冷却、里面的气体收缩，石灰水会倒吸进热的试管，使试管炸裂。停止加热后<b>夹紧乳胶管</b>：不让空气进入，热的铜不会又被氧化成黑色的氧化铜；所以要等试管冷却后再把粉末倒出来。',
    src: '课本第 132–133 页 · 第六单元 课题1 碳单质的多样性 实验 6-2',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    group.position.x = OX; root.add(group);
    let S = null, W = null;
    const near = (v, d = [0.1, 0.3, 1], dist = 0.26) => { if (S.demo) return; S.near = true; look([v.x + OX, v.y, v.z], d, dist, () => { S.near = false; }); };
    const far = () => { if (S.near) { S.near = false; back(); } };
    paperSheet(group, { w: 0.5, d: 0.3, x: -0.04, z: 0.02 });

    // ================= 铁架台、升降台、酒精灯、网罩 =================
    const st = stand({ height: 0.22, baseW: 0.11, baseD: 0.06 });
    st.position.set(-0.05, 0, -0.05); group.add(st);
    const arm = st.clamp(CLAMP_P.y, CLAMP_P.x - (-0.08));
    const jawBar = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.0026, 0.0026, 0.042, 10), paint(0x8a929e)), 0.0008);
    jawBar.rotation.x = Math.PI / 2; jawBar.position.set(CLAMP_P.x + 0.08, 0, 0.026); arm.add(jawBar);
    const jaw = tubeClamp(0.0099); jaw.position.copy(CLAMP_P); jaw.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), D); group.add(jaw);
    const jack = labJack({ w: 0.06, d: 0.044, h: JACK_H }); jack.position.set(LAMP_X, 0, 0); group.add(jack);
    const lamp = chemLamp(); lamp.position.set(LAMP_X, JACK_H, 0); group.add(lamp);
    const lampPick = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.056, 0.072), new THREE.MeshBasicMaterial({ visible: false })); lampPick.position.y = 0.028; lampPick.userData.pick = true; lamp.add(lampPick);
    const capper = lampCap(group, lamp, { off: new THREE.Vector3(-0.2, 0, 0.058) });
    // 网罩：金属丝网卷成的圆筒，套在灯芯外面
    const gauzeTex = canvasTex(256, 128, (g, Wd, Ht) => { g.clearRect(0, 0, Wd, Ht); g.strokeStyle = 'rgba(70,76,88,0.85)'; g.lineWidth = 2; for (let i = 0; i <= Wd; i += 9) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, Ht); g.stroke(); } for (let j = 0; j <= Ht; j += 9) { g.beginPath(); g.moveTo(0, j); g.lineTo(Wd, j); g.stroke(); } });
    const coverG = new THREE.Group(); group.add(coverG);
    const GZ_H = 0.046, GZ_R = 0.017;
    const gauze = new THREE.Mesh(new THREE.CylinderGeometry(GZ_R, GZ_R, GZ_H, 28, 1, true), new THREE.MeshBasicMaterial({ map: gauzeTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    gauze.position.y = GZ_H / 2; gauze.renderOrder = 15; gauze.material.userData.see = 'glass';
    const rimTop = hull(new THREE.Mesh(new THREE.TorusGeometry(GZ_R, 0.0009, 6, 28), paint(0x6d747e)), 0.0004); rimTop.rotation.x = Math.PI / 2; rimTop.position.y = GZ_H;
    const rimBot = rimTop.clone(); rimBot.position.y = 0.0009;
    const coverPick = new THREE.Mesh(new THREE.CylinderGeometry(GZ_R + 0.006, GZ_R + 0.006, GZ_H + 0.006, 10), new THREE.MeshBasicMaterial({ visible: false })); coverPick.position.y = GZ_H / 2; coverPick.userData.pick = true;
    coverG.add(gauze, rimTop, rimBot, coverPick);
    const COVER_ON = new THREE.Vector3(LAMP_X, JACK_H + 0.05, 0), COVER_OFF = new THREE.Vector3(-0.215, 0, 0.0);
    const COVER_UP = 0.088;          // 网罩横着移过去时底边的高度：高过灯颈，顶边又碰不到试管

    // ================= 试管（管口略向下）、橡胶塞、导管、乳胶管、弹簧夹 =================
    const tube = testTube({ r: 0.009, len: 0.15 });
    const tubeHold = new THREE.Group(); tubeHold.add(tube); group.add(tubeHold);
    const tubePick = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.09, 10), new THREE.MeshBasicMaterial({ visible: false })); tubePick.position.y = 0.05; tubePick.userData.pick = true; tube.add(tubePick);
    const plug = stopper({ r1: 0.0084, r2: 0.0104, h: 0.018 }); group.add(plug);
    const plugPick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.036, 10), new THREE.MeshBasicMaterial({ visible: false })); plugPick.position.y = 0.01; plugPick.userData.pick = true; plug.add(plugPick);
    const endPiece = new THREE.Group(); group.add(endPiece);
    const endGlass = glassTube([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, EH, 0), new THREE.Vector3(-0.006, EH + 0.006, 0), new THREE.Vector3(-0.024, EH + 0.007, 0)]);
    const endWater = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 1, 8), water2({ color: 0xb8d8e6, base: 0.75 })); endWater.geometry.translate(0, 0.5, 0); endWater.scale.y = 0.0001; endWater.visible = false; endWater.renderOrder = 8;
    const endPick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.1, 8), new THREE.MeshBasicMaterial({ visible: false })); endPick.position.y = 0.075; endPick.userData.pick = true;
    endPiece.add(endGlass, endWater, endPick);
    const clampG = new THREE.Group(); group.add(clampG);
    const jA = inked(new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.003, 0.026), paint(0xc9ced6)), { width: 0.7 });
    const jB = jA.clone();
    const coil = hull(new THREE.Mesh(new THREE.TorusGeometry(0.004, 0.0012, 6, 16), paint(0x8a929e)), 0.0004); coil.position.z = -0.016; coil.rotation.y = Math.PI / 2;
    const clampPick = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.026, 0.04), new THREE.MeshBasicMaterial({ visible: false })); clampPick.userData.pick = true;
    clampG.add(jA, jB, coil, clampPick);
    let stem = null, hose = null, hoseKey = '';
    const rebuildHose = (base, axis) => {
      const tip = endPiece.position, joint = tip.clone().add(new THREE.Vector3(-0.024, EH + 0.007, 0));
      const key = [base, axis, joint].map((v) => v.toArray().map((x) => x.toFixed(4)).join()).join('|');
      if (key === hoseKey) return; hoseKey = key;
      for (const m of [stem, hose]) if (m) { group.remove(m); m.geometry.dispose(); }
      const a = base.clone().addScaledVector(axis, -0.002), b = base.clone().addScaledVector(axis, 0.038);
      stem = glassTube([a, b]); group.add(stem);
      const mid = b.clone().lerp(joint, 0.5); mid.y = Math.max(b.y, joint.y) + 0.01;
      hose = rubberTube([b.clone().addScaledVector(axis, -0.005), b.clone().add(new THREE.Vector3(0.018, 0.003, 0)), mid, joint.clone().add(new THREE.Vector3(-0.014, 0.003, 0)), joint.clone().add(new THREE.Vector3(0.004, 0, 0))]);
      group.add(hose);
      clampG.position.copy(hose.curve.getPointAt(0.3));
      const tg = hose.curve.getTangentAt(0.3).setZ(0).normalize(); clampG.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), tg);      // 夹子跟着乳胶管的走向转：管子总是从两片夹子中间穿过
    };

    // ================= 澄清石灰水（试管架上） =================
    const lime = testTube({ r: 0.008, len: 0.11 }); lime.position.copy(LIME); group.add(lime);
    const limeLiq = new THREE.Mesh(new THREE.CylinderGeometry(0.0074, 0.0074, 1, 18), water2({ color: 0xe6f0f2, base: 0.35 })); limeLiq.geometry.translate(0, 0.5, 0); limeLiq.position.y = 0.0015; limeLiq.scale.y = LIME_SURF - LIME.y - 0.0015; limeLiq.renderOrder = 7; lime.add(limeLiq);
    const limeMilk = milky(limeLiq);      // 变浑浊：乳白色 + 白色小颗粒（碳酸钙沉淀）
    const rackM = paint(0xd9c9a6);
    const rackBase = inked(new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.008, 0.034), rackM), { width: 0.7 }); rackBase.position.set(LIME.x, 0.004, 0); group.add(rackBase);
    for (const sx of [-1, 1]) { const post = inked(new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.08, 0.004), rackM), { width: 0.6 }); post.position.set(LIME.x + sx * 0.019, 0.048, -0.012); group.add(post); }
    const rackBar = inked(new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.005, 0.005), rackM), { width: 0.6 }); rackBar.position.set(LIME.x, 0.086, -0.012); group.add(rackBar);
    const rackRing = hull(new THREE.Mesh(new THREE.TorusGeometry(0.0105, 0.0014, 6, 24), paint(0xb9a77f)), 0.0004); rackRing.rotation.x = Math.PI / 2; rackRing.position.set(LIME.x, 0.086, 0); group.add(rackRing);
    const limeLabel = textPlate('澄清石灰水', { w: 0.04, h: 0.0075, color: '#3b4254', bg: '#fffaf0', font: 'bold 84px "Songti SC", serif' }); limeLabel.position.set(LIME.x, 0.0042, 0.0176); group.add(limeLabel);

    // ================= 桌上：氧化铜、木炭粉（表面皿）、纸槽、一张纸 =================
    const dish = (x, z, color, text) => {
      const g = new THREE.Group(); g.position.set(x, 0, z);
      const d = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.016, 0.004, 24), paint(0xe9edf0)), { width: 0.6 }); d.position.y = 0.002;
      const heap = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint(color, { unique: true, keep: true })); heap.scale.set(1, 0.32, 1); heap.position.y = 0.0035;
      const lab = textPlate(text, { w: 0.038, h: 0.009, color: '#3b4254', bg: '#fffaf0', font: 'bold 80px "Songti SC", serif' }); lab.position.set(0, 0.006, 0.024); lab.rotation.x = -0.5;
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.02, 10), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 0.008; pick.userData.pick = true;
      g.add(d, heap, lab, pick); group.add(g);
      return Object.assign(g, { heap, pick, lab, home: g.position.clone() });
    };
    const cuoDish = dish(-0.175, 0.085, 0x26282c, '氧化铜 2 g');
    const cDish = dish(-0.115, 0.105, 0x171513, '木炭粉 0.2 g');
    const trough = new THREE.Group(); const TROUGH_HOME = new THREE.Vector3(0.04, 0.003, 0.095), TROUGH_HIGH = 0.205;     // 纸槽从高处绕过乳胶管
    for (const s of [1, -1]) { const p = inked(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.0006, 0.008), paint(0xfbfaf4)), { width: 0.6 }); p.position.set(0.045, 0.0026, s * 0.0028); p.rotation.x = s * 0.75; trough.add(p); }
    const tPowder = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.0018, 0.0034), paint(0x222326, { unique: true, keep: true })); tPowder.position.set(0.03, 0.0012, 0); tPowder.visible = false; trough.add(tPowder);
    const troughPick = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.022), new THREE.MeshBasicMaterial({ visible: false })); troughPick.position.x = 0.045; troughPick.userData.pick = true; trough.add(troughPick);
    trough.position.copy(TROUGH_HOME); group.add(trough);
    const paper = inked(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.0008, 0.058), paint(0xfffefa)), { width: 0.6 }); paper.position.set(PAPER.x, 0.0004, PAPER.z); group.add(paper);

    // ================= 粉末颗粒（每一粒：氧化铜 / 木炭；变红 / 又变黑） =================
    const NG = 300;
    const grainM = paint(0xffffff, { unique: true, keep: true });
    const grainMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.00105, 0), grainM, NG); grainMesh.count = 0; grainMesh.frustumCulled = false; grainMesh.raycast = () => {}; group.add(grainMesh);
    const R_IN = 0.009 - 0.0011, X_TOP = 0.009 - 0.0036;
    const grains = [];
    const rankOf = (arr, key) => { [...arr].sort((a, b) => a[key] - b[key]).forEach((g, i) => { g[key] = (i + 0.5) / arr.length; }); };
    for (let i = 0; i < NG; i++) {
      let lx, lz; do { lx = X_TOP + Math.random() * (R_IN - X_TOP); lz = (Math.random() * 2 - 1) * R_IN; } while (lx * lx + lz * lz > R_IN * R_IN);
      const s = POW[0] + Math.random() * (POW[1] - POW[0]);
      const pr = Math.sqrt(Math.random()) * 0.015, pa = Math.random() * Math.PI * 2;
      grains.push({ loc: new THREE.Vector3(lx, s, lz), seg: segOf(s), u: Math.random(), kc: Math.random(), oxr: ((s - POW[0]) / (POW[1] - POW[0])) * 0.55 + Math.random() * 0.45, delay: 1 - (s - POW[0]) / (POW[1] - POW[0]), shade: 0.82 + Math.random() * 0.3,
        paper: new THREE.Vector3(PAPER.x + Math.cos(pa) * pr * 1.3, 0.0012 + (1 - pr / 0.015) * 0.0065 * Math.sqrt(Math.random()), PAPER.z + Math.sin(pa) * pr * 0.9), rot: new THREE.Quaternion().setFromEuler(new THREE.Euler(i, i * 2, i * 3)), kind: '' });
    }
    rankOf(grains, 'oxr');          // 排成均匀的名次：“表层 x% 变黑”就正好是 x% 的颗粒

    // ================= 气泡、试管里的气体小点、热 =================
    const dust = new Particles({ max: 80, geometry: new THREE.IcosahedronGeometry(1, 0), material: paint(0x171513, { unique: true, keep: true }) }); group.add(dust.mesh);      // 倒进去的木炭粉
    const bubs = new Particles({ max: 160, geometry: new THREE.SphereGeometry(1, 8, 6), material: bubble2({ color: 0x6f8797, white: 0.2 }) }); group.add(bubs.mesh); bubs.mesh.renderOrder = 9.8;      // 画在玻璃和浑浊的液体之后，不然被洗掉      // 石灰水是浅色的：气泡用深一点的边
    const dotTex = canvasTex(64, 64, (g, Wd) => { const gr = g.createRadialGradient(Wd / 2, Wd / 2, 0, Wd / 2, Wd / 2, Wd / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,1)'); gr.addColorStop(0.75, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, Wd, Wd); });
    const darkP = new Particles({ max: 60, sprite: true, color: DARK }), lightP = new Particles({ max: 60, sprite: true, color: LIGHT }), blueP = new Particles({ max: 30, sprite: true, color: BLUE });
    for (const p of [darkP, lightP, blueP]) { p.mat.uniforms.map.value = dotTex; p.mesh.renderOrder = 10; group.add(p.mesh); }
    const N_DOT = 34;
    const dots = Array.from({ length: N_DOT }, (_, i) => ({ rank: (i + 0.5) / N_DOT, y0: Math.random(), rx: -0.0062 + Math.random() * 0.007, rz: (Math.random() * 2 - 1) * 0.005, ph: Math.random() * 6, p: new THREE.Vector3(), size: 0.0026, alpha: 0.9, age: 0, life: 1e9 }));
    const heat = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff7a2a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    heat.renderOrder = 13; heat.raycast = () => {}; group.add(heat);

    // ================= 卡片 =================
    const tubeCard = tag('', 'cond'); tubeCard.px = [-40, -96];
    const limeCard = tag('', 'cond'); limeCard.px = [56, -30];
    const paperCard = tag('', 'cond'); paperCard.px = [40, -20];

    // ================= 状态 =================
    const fresh = () => ({
      mixed: false, loaded: false, mC: 0.2, plug: 'in', end: 'up', clampOpen: false, cover: false, lit: false,
      T: Array(NSEG).fill(T0), x: Array(NSEG).fill(0), ox: 0, co2: 0, n2: (V_TUBE + V_LINE) * 0.79, o2: (V_TUBE + V_LINE) * 0.21,
      suck: 0, limeCO2: 0, lime: 0, airIn: 0, popped: false, broken: '', wet: false, heatT: 0, coolT: 0, bareHint: false, slowT: 0,
      lampFirst: false, rightOrder: false, pourK: -1, poured: false, result: null, seq: [], seen: {}, limeAt: null, redAt: null,
      outCO2: 0, flowV: 0, anim: null, demo: false, near: false,
      plugK: 0, mixK: 0, scooped: false,      // 画面：塞子拔出了多少（0 塞着 → 1 在桌上）、木炭粉倒进去了多少；纸槽取上粉末了没有
    });
    S = fresh();
    const FX = { bubAcc: 0, lastOut: 0, drift: 0 };          // 只管画面的小东西（不算实验状态）
    const { status, done } = guards(() => S, () => W, () => bar);
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };
    const seq = (t) => { if (S.seq[S.seq.length - 1] !== t) S.seq.push(t); };
    const xi = () => S.x.reduce((a, b) => a + b, 0) / NSEG;
    const Tmax = () => Math.max(...S.T);
    const Tavg = () => S.T.reduce((a, b) => a + b, 0) / NSEG;
    const R = () => S.mC / NEED_C;

    const A = {
      mix() {
        if (S.mixed) return;
        S.mixed = true; sfx.clink({ freq: 1500, gain: 0.03 });
        status(`把 ${S.mC} g 刚烘干的木炭粉倒进 2 g 氧化铜里，<b>混合均匀</b>（质量比约 ${Math.round(M_CUO / S.mC)}∶1）。两种都是<b>黑色</b>粉末。` + (S.plug === 'in' ? '点一下<b>橡胶塞</b>把它拔出来，' : '') + '再把<b>纸槽</b>拖到试管口，把粉末铺进去。');
      },
      load() {
        if (S.loaded) return;
        if (!S.mixed) return status('先把<b>木炭粉</b>倒进<b>氧化铜</b>里混匀（拖动木炭粉的表面皿）。');
        if (S.plug === 'in') return status('先拔出橡胶塞。');
        S.loaded = true; S.anim = { kind: 'trough', t: 0 };
        status('用纸槽把混合好的粉末<b>小心地铺放</b>在试管底部。点一下桌上的<b>橡胶塞</b>，把它塞紧。');
      },
      plug() {
        if (S.broken) return status('试管已经炸裂了。点“更多”里的“全部重来”。');
        if (S.plug === 'in') {
          if (S.lit || Tmax() > 60) return status('试管还热着，<b>不要拔塞子</b>。');
          if (S.loaded) return status('药品已经装好了，塞子不用拔。');
          S.plug = 'out'; return status(S.mixed ? '拔出了橡胶塞。把<b>纸槽</b>拖到试管口，把粉末铺进去。' : '拔出了橡胶塞。');
        }
        if (S.popped) return status('塞子被冲开过——这一次的实验已经不准了。点“更多”里的“全部重来”。');
        if (S.pourK >= 0) return;
        S.plug = 'in'; sfx.clink({ freq: 900, gain: 0.03 });
        if (!S.loaded) return status('塞上了橡胶塞——试管里还没有药品。');
        S.co2 = 0; S.n2 = (V_TUBE + V_LINE) * 0.79; S.o2 = (V_TUBE + V_LINE) * 0.21;
        done('load'); status('塞紧了橡胶塞。下一步：把<b>导管</b>往下拖，插进澄清石灰水里。');
      },
      endTo(where) {
        if (S.broken) return;
        const was = S.end; S.end = where;
        if (where === was) return;
        if (where === 'lime') {
          seq('导管插入石灰水');
          if (S.plug === 'in') done('lime');
          status(S.clampOpen ? '导管插进了澄清石灰水里。' : '导管插进了澄清石灰水里。现在点一下乳胶管上的<b>弹簧夹</b>，把它打开。');
        } else {
          seq('撤出导管');
          if (S.lit) status('导管撤出了石灰水。现在<b>停止加热</b>：' + (S.cover ? '先拿开网罩，再' : '') + '点一下酒精灯，盖上灯帽。');
          else if (S.lampFirst && !S.broken) {
            if (S.suck < V_LINE) { S.rightOrder = true; done('stop'); status('及时把导管撤出了石灰水，倒吸的石灰水没有流进试管。记住顺序：<b>先撤导管，再停止加热</b>。'); log(['赶紧撤出导管', '倒吸停住了', '差一点流进热试管']); }
          } else status('导管撤出了石灰水。');
        }
      },
      clamp() {
        if (S.broken) return;
        S.clampOpen = !S.clampOpen; sfx.clink({ freq: 1300, gain: 0.03 });
        if (S.clampOpen) { seq('打开弹簧夹'); if (!S.lit && S.heatT === 0) { done('open'); status('打开了弹簧夹：试管里的气体可以通过导管跑出去。现在<b>点燃</b>酒精灯，再把<b>网罩</b>罩在火焰上。'); } else status('打开了弹簧夹。'); return; }
        seq('夹紧乳胶管');
        if (S.heatT > 0 && !S.lit) {
          done('close'); far();
          const a = Math.round(S.airIn);
          status(a >= 2 ? `夹紧了乳胶管。不过夹紧之前已经进去了约 <b>${a} mL 空气</b>——看看试管里的粉末。等试管冷却。` : '夹紧了乳胶管：空气进不去了。等试管<b>冷却</b>（看试管旁的温度）。');
          log(['夹紧乳胶管', a >= 2 ? `夹紧前已经进去约 ${a} mL 空气` : '空气进不去', a >= 2 ? '进去的空气让热的铜又被氧化' : '热的铜不会再被氧化']);
        } else if (S.lit) status('还在加热就夹紧了乳胶管——气体出不去了。');
        else status('夹紧了弹簧夹。');
      },
      cover(on) {
        if (S.cover === on) return;
        S.cover = on; sfx.clink({ freq: 1700, gain: 0.025 });
        if (on && S.lit) { seq('罩上网罩'); done('heat'); return status('罩上了<b>网罩</b>：火焰集中，温度更高。加热几分钟：盯着试管里的<b>黑色粉末</b>和右边的<b>石灰水</b>。' + (S.clampOpen ? '' : '（弹簧夹还<b>夹着</b>呢……）') + (S.end === 'lime' ? '' : '（导管还没插进石灰水里。）')); }
        status(on ? '酒精灯加上了<b>网罩</b>：火焰集中，温度更高。' : '拿掉了网罩。');
      },
      light() {
        if (S.broken) return status('试管已经炸裂了。点“更多”里的“全部重来”。');
        if (!S.lit) {
          if (!S.loaded || S.plug !== 'in') return status('先装好药品、塞紧橡胶塞，再加热。');
          if (S.pourK >= 0 || S.poured) return status('粉末已经倒出来了。');
          S.lit = true; seq('点燃酒精灯');
          if (!S.cover) return status('点燃了酒精灯。再把<b>网罩</b>罩在火焰上：火焰集中，温度更高。');
          done('heat');
          status('点燃了酒精灯（加了网罩）。加热几分钟：盯着试管里的<b>黑色粉末</b>和右边的<b>石灰水</b>。' + (S.clampOpen ? '' : '（弹簧夹还<b>夹着</b>呢……）') + (S.end === 'lime' ? '' : '（导管还没插进石灰水里。）'));
          return;
        }
        S.lit = false; seq('停止加热');
        if (S.end === 'lime' && S.clampOpen && S.plug === 'in') {
          S.lampFirst = true;
          status('导管还在石灰水里就<b>停止了加热</b>！盯着导管：试管冷下来，里面的气体收缩……');
        } else {
          S.rightOrder = S.end !== 'lime'; done('stop');
          status(S.end !== 'lime' ? '先撤导管、再停止加热——<b>顺序对了</b>。现在用<b>弹簧夹</b>夹紧乳胶管（点一下弹簧夹）。' : '停止了加热（弹簧夹夹着，石灰水吸不上来）。');
          if (S.end !== 'lime') log(['先撤出导管，再停止加热', '石灰水没有倒吸', '导管已经离开了石灰水']);
        }
      },
      pour() {
        if (S.poured || S.pourK >= 0) return;
        if (!S.loaded) return status('试管里还没有药品。');
        if (S.lit) return status('先停止加热，等试管冷却。');
        if (S.broken) return status('试管已经炸裂了。点“更多”里的“全部重来”。');
        const t = Tmax();
        if (t > 60) return status(`试管还很烫（最热处约 ${Math.round(t / 10) * 10} ℃）。要<b>等试管冷却</b>后再倒。`);
        S.pourK = 0; S.plug = 'out'; seq('冷却后倒在纸上'); far();
      },
      setC(k) {
        if (S.mixed) return status('药品已经混好了。换木炭粉的量，要先点“更多”里的“全部重来”。');
        S.mC = C_OPTS[k];
        status(`木炭粉换成 ${S.mC} g（氧化铜 : 木炭 ≈ ${Math.round(M_CUO / S.mC)}∶1）。按方程式，2 g 氧化铜恰好需要 0.15 g 木炭。`);
      },
      reset() {
        const mC = S.mC; S = fresh(); S.mC = C_OPTS.includes(mC) ? mC : 0.2; bubs.clear(); dust.clear(); far();
        if (W) { W.tbl.clear(); W.q1.close(); W.q2.close(); W.next.hidden = true; } mic.close();
        bar.undo('load', 'lime', 'open', 'heat', 'watch', 'stop', 'close', 'pour', 'why');
        status('全部重新摆好了，记录也清空了。');
      },
    };

    const drag = draggable(group, [
      { obj: cDish.pick, anchor: cDish, plane: 'xy', offset: cDish.home.z, keepOffset: true, hint: () => (S.mixed ? '' : '拖到氧化铜上：倒进去混匀'), enabled: () => !S.mixed,
        onStart: () => { S.dishDrag = !S.mixed; },
        onDrag: (p) => { if (!S.dishDrag) return; cDish.position.set(p.x, Math.max(0, p.y), cDish.home.z); cDish.rotation.z = clamp((cDish.position.x - cDish.home.x) * -14, 0, 1.1) * (p.y > 0.02 ? 1 : 0); },
        onEnd: () => { const hit = S.dishDrag && Math.abs(cDish.position.x - cuoDish.position.x) < 0.04; S.dishDrag = false; if (hit) A.mix(); } },      // 松手后表面皿滑回原处
      { obj: troughPick, plane: 'xy', offset: 0, hint: () => (S.loaded ? '' : S.mixed ? '拖到试管口：把粉末铺进试管' : '先把木炭粉倒进氧化铜里混匀'), enabled: () => !S.loaded,
        onStart: () => { S.troughDrag = !S.loaded && !S.anim; },
        onDrag: (p) => { if (!S.troughDrag) return; trough.position.set(p.x - 0.045, Math.max(0.003, p.y), p.z); trough.quaternion.identity(); if (S.mixed && Math.abs(trough.position.x - cuoDish.position.x) < 0.035 && trough.position.y < 0.02) S.scooped = true; },      // 纸槽伸到氧化铜那儿：取上混好的粉末
        onEnd: () => { if (!S.troughDrag) return; S.troughDrag = false; const tip = trough.position.clone().setZ(0); const ok = tip.distanceTo(MOUTH) < 0.05 || trough.position.clone().add(new THREE.Vector3(0.045, 0, 0)).setZ(0).distanceTo(MOUTH) < 0.04; if (ok) A.load(); } },
      { obj: plugPick, plane: 'xy', offset: 0, hint: () => (S.plug === 'in' ? (S.loaded ? '' : '点一下：拔出橡胶塞') : '点一下：塞紧橡胶塞'), onTap: () => A.plug(), onStart: () => {}, onDrag: () => {}, onEnd: () => {} },
      { obj: endPick, plane: 'xy', offset: 0, hint: () => (S.end === 'lime' ? '往上拖：撤出石灰水' : '往下拖：插进澄清石灰水'),
        onStart: () => { S.tipY = endPiece.position.y; },
        onDrag: (p) => { S.dragTip = new THREE.Vector3(LIME.x, clamp(p.y - 0.075, TIP.lime.y, TIP.up.y + 0.012), 0); },
        onEnd: () => { const p = S.dragTip; S.dragTip = null; if (!p) return; A.endTo(p.y < LIME_SURF - 0.008 ? 'lime' : 'up'); } },
      { obj: clampPick, plane: 'xy', offset: 0, hint: () => (S.clampOpen ? '点一下：夹紧乳胶管' : '点一下：打开弹簧夹'), onTap: () => A.clamp(), onStart: () => {}, onDrag: () => {}, onEnd: () => {} },
      { obj: coverPick, anchor: coverG, plane: 'xy', offset: 0, keepOffset: true, hint: () => (S.cover ? '拖开：拿掉网罩' : '拖到酒精灯上：套上网罩'),
        onStart: () => { S.coverDrag = coverG.position.clone(); },
        onDrag: (p) => { S.coverDrag = new THREE.Vector3(clamp(p.x, -0.23, -0.05), clamp(p.y, 0, 0.1), 0); },
        onEnd: (moved) => { const p = S.coverDrag; S.coverDrag = null; if (!moved || !p) return; A.cover(Math.abs(p.x - LAMP_X) < 0.03 && p.y > 0.03); },
        onTap: () => A.cover(!S.cover) },
      { obj: lampPick, plane: 'xy', offset: 0, hint: () => (S.lit ? '点一下：熄灭酒精灯（盖上灯帽）' : '点一下：点燃酒精灯'), onTap: () => A.light(), onStart: () => {}, onDrag: () => {}, onEnd: () => {} },
      { obj: tubePick, plane: 'xy', offset: 0, hint: () => (S.poured || !S.loaded ? '' : S.lit ? '' : '点一下：把粉末倒在纸上（要等冷却）'), onTap: () => A.pour(), onStart: () => {}, onDrag: () => {}, onEnd: () => {} },
    ], { tip: tag('', 'pill') });

    // 演示：沿折线拖过去（先抬起来、再移过去、再放下；kit 的 act.drag 只走直线）。pts 里可以有函数（开始时取值）
    const dragPath = (obj, pts, o) => act.path(obj, pts, o);      // 沿几个点拿过去（kit/chemlesson.js 的 act.path）
    const act = demoActs(drag, group);
    const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
    const tipGrab = () => endPiece.position.clone().add(V(0, 0.075, 0));      // 导管：手抓的地方（导管口往上 7.5 cm）

    // ================= 底部步骤栏 + 老师的演示 =================
    const P = (x, y, z = 0) => [x + OX, y, z];
    const POWDER_C = BOTTOM.clone().addScaledVector(D, S_FLAME);
    // 微观次元：钻进受热最强处的粉末里看——碳原子把氧化铜里的氧原子拉走成 CO₂，铜原子留下
    const mic = micro({ tag, look, back, group, scene: cuoScene(), at: () => POWDER_C.clone().add(new THREE.Vector3(0, 0.004, 0)), label: '钻进粉末里看',
      state: () => ({ T: Math.max(...S.T), x: xi(), ox: xi() > 0.02 ? Math.min(1, S.ox / xi()) : 0, r: R() }), show: () => S.loaded && S.pourK < 0 && !S.poured, bar: () => bar, scale: 0.0052, lookD: [0.05, 0.3, 1], dist: 0.24,
      btnAt: () => POWDER_C.clone().add(new THREE.Vector3(0, -0.022, 0.02)) });
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'load', title: '装药品', todo: '把<b>木炭粉</b>拖进<b>氧化铜</b>里混匀；点<b>橡胶塞</b>拔出来，把<b>纸槽</b>拖到试管口铺进粉末，再点橡胶塞塞紧。', target: () => (!S.mixed ? cDish : !S.loaded ? (S.plug === 'in' ? plug : trough) : S.plug !== 'in' ? plug : null) },
        { id: 'lime', title: '导管插入石灰水', todo: '把<b>导管</b>往下拖，插进右边的<b>澄清石灰水</b>里。', target: () => (S.end === 'lime' ? null : endPiece) },
        { id: 'open', title: '打开弹簧夹', todo: '点一下乳胶管上的<b>弹簧夹</b>，把它打开（气体才能通过）。', target: () => (S.clampOpen ? null : clampG) },
        { id: 'heat', title: '点燃酒精灯，加网罩', todo: '先点一下<b>酒精灯</b>点燃，再把<b>网罩</b>罩在火焰上（火焰集中、温度更高）。', target: () => (!S.lit ? lamp : !S.cover ? coverG : null) },
        { id: 'watch', title: '观察', todo: '加热几分钟：盯着试管里的<b>黑色粉末</b>和右边的<b>石灰水</b>。（时间加快了 8 倍）' },
        { id: 'stop', title: '先撤导管，再停止加热', todo: '先把<b>导管</b>从石灰水里拖出来，再停止加热：拿开<b>网罩</b>，点<b>酒精灯</b>盖上灯帽。', target: () => (S.end === 'lime' ? endPiece : S.lit ? (S.cover ? coverG : lamp) : null) },
        { id: 'close', title: '夹紧乳胶管', todo: '用<b>弹簧夹</b>夹紧乳胶管（点一下弹簧夹），不让空气进去。', target: () => (S.clampOpen ? clampG : null) },
        { id: 'pour', title: '冷却后倒出', todo: '等试管<b>冷却</b>（看试管旁的温度），再点一下<b>试管</b>，把粉末倒在<b>纸</b>上。', target: () => (S.poured ? null : tube) },
        { id: 'why', title: '想一想', todo: '红色物质是什么？为什么要先撤导管？在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { bubs.clear(); dust.clear(); } }),
          shots: [
            { cap: '实验 6-2：把木炭粉和氧化铜粉末混合均匀，小心地铺放进试管，塞紧橡胶塞。', dur: 12, cam: [P(-0.07, 0.1, 0.05), [0.1, 0.32, 1], 0.58],
              during: act.seq(
                // 木炭粉：拿起表面皿，移到氧化铜上方，倾斜着倒进去
                dragPath(cDish.pick, [cDish.home, cDish.home.clone().add(V(0, 0.05, 0)), V(cuoDish.position.x + 0.02, 0.045, cDish.home.z)], { t0: 0.02, t1: 0.15, release: 0.24 }),
                act.tap(plugPick, 0.27),
                // 纸槽：到氧化铜那里取上混好的粉末，移到试管口，伸进去铺放
                dragPath(troughPick, [() => trough.position.clone().add(V(0.045, 0, 0)), V(0.06, 0.03, 0.09), V(cuoDish.position.x + 0.05, 0.03, cuoDish.position.z), V(cuoDish.position.x + 0.05, 0.008, cuoDish.position.z),
                  // 从前面高过乳胶管绕过去，在试管口正上方竖直放下来（不碰乳胶管），再顺着试管伸进去
                  V(cuoDish.position.x + 0.05, 0.07, cuoDish.position.z), V(MOUTH.x + 0.047, TROUGH_HIGH, cuoDish.position.z), V(MOUTH.x + 0.047, TROUGH_HIGH, 0), V(MOUTH.x + 0.047, MOUTH.y - 0.0045, 0), MOUTH.clone().add(V(0.045, -0.0045, 0))], { t0: 0.32, t1: 0.62, release: 0.63 }),
                act.tap(plugPick, 0.84)) },
            { cap: '试管固定在铁架台上，管口略向下倾斜；导管插入澄清石灰水，打开弹簧夹。', dur: 3.4, cam: [P(0.07, 0.1), [0.1, 0.25, 1], 0.36],
              during: act.seq(dragPath(endPick, [tipGrab, TIP.lime.clone().add(V(0, 0.075, 0))], { t0: 0.04, t1: 0.38, release: 0.4 }), act.tap(clampPick, 0.6)) },
            { cap: '点燃酒精灯，再罩上网罩，使火焰集中、温度更高，加热混合物。', dur: 3.8, cam: [P(LAMP_X, 0.11), [0.1, 0.25, 1], 0.3],
              during: act.seq(act.tap(lampPick, 0.05), dragPath(coverPick, [() => coverG.position.clone(), V(COVER_OFF.x, COVER_UP, 0), V(LAMP_X, COVER_UP, 0), COVER_ON], { t0: 0.36, t1: 0.76, release: 0.78 })) },
            { cap: '刚开始冒出的气泡，是试管里受热膨胀的空气——石灰水不变浑浊。', dur: 3.4, speed: 0.7, cam: [P(LIME.x, 0.05), [0.1, 0.2, 1], 0.24] },
            { cap: '温度够高了：黑色粉末从受热最强的地方开始变红。钻进粉末里看：碳原子把氧化铜里的氧原子拉走，生成二氧化碳；铜原子留下。', dur: 11, speed: 2.5, cam: [P(POWDER_C.x, POWDER_C.y + 0.04), [0.05, 0.3, 1], 0.24], during: act.at(0.02, () => mic.open(true)) },
            { cap: '二氧化碳通进石灰水，石灰水变浑浊。', dur: 2.6, speed: 2, cam: [P(LIME.x, 0.05), [0.1, 0.2, 1], 0.24], enter: () => mic.close() },
            { cap: '停止时：先把导管撤出石灰水，再停止加热——拿开网罩，盖上灯帽熄灭酒精灯。', dur: 4.6, cam: [P(0.0, 0.1), [0.1, 0.22, 1], 0.5],
              during: act.seq(dragPath(endPick, [tipGrab, TIP.up.clone().add(V(0, 0.075, 0))], { t0: 0.03, t1: 0.24, release: 0.26 }),
                dragPath(coverPick, [() => coverG.position.clone(), V(LAMP_X, COVER_UP, 0), V(COVER_OFF.x, COVER_UP, 0), COVER_OFF.clone().add(V(0, 0.002, 0))], { t0: 0.34, t1: 0.66, release: 0.68 }), act.tap(lampPick, 0.78)) },
            { cap: '用弹簧夹夹紧乳胶管，不让空气进去；等试管冷却。', dur: 3.4, speed: 7, cam: [P(0.03, 0.13), [0.1, 0.3, 1], 0.3], during: act.tap(clampPick, 0.03) },
            { cap: '冷却后把粉末倒在纸上：黑色的粉末里有了红色的铜。演示完了，下面换你自己做。', dur: 4.8, cam: [P(PAPER.x, 0.05, PAPER.z), [0.05, 0.6, 1], 0.26], enter: () => { S.T = S.T.map((t) => Math.min(t, 40)); },
              during: act.tap(tubePick, 0.04) },
          ],
        },
      },
    });

    const pointer = wrapPointer(drag, bar);

    // ================= 化学模型（实际时间 h 秒） =================
    const model = (h) => {
      const sealed = S.plug === 'in' && !S.broken;
      // 温度：粉末各处按离火焰的远近；加网罩火焰集中，温度更高
      const pk = S.cover ? T_COVER : T_BARE, sg = S.cover ? 0.026 : 0.034;
      for (let i = 0; i < NSEG; i++) {
        const d = segS(i) - S_FLAME;
        const tar = S.lit ? T0 + (pk - T0) * Math.exp(-((d / sg) ** 2)) : T0;
        S.T[i] += (tar - S.T[i]) * (1 - Math.exp(-h / (tar > S.T[i] ? TAU_HEAT : TAU_COOL)));
      }
      if (S.lit) S.heatT += h; else if (S.heatT > 0) S.coolT += h;
      // 反应：2CuO + C → 2Cu + CO₂（木炭不足时最多反应到 R）
      const r = R(); let dx = 0;
      if (S.loaded && S.pourK < 0 && !S.poured) for (let i = 0; i < NSEG; i++) {
        const x = S.x[i], rate = kAt(S.T[i]) * (1 - x) * Math.max(0, r - x) / r;
        const nx = Math.min(1, r, x + rate * h); dx += (nx - x) / NSEG; S.x[i] = nx;
      }
      const madeCO2 = dx * CO2_MAX;
      // 试管里的气体
      S.co2 += madeCO2;
      const Tg = T0 + 0.45 * (Tavg() - T0);
      const tot = S.co2 + S.n2 + S.o2, vol = tot * (Tg + 273) / 298;
      let out = 0, airIn = 0;
      if (!S.loaded) { /* 还没装药 */ }
      else if (!sealed || S.pourK >= 0 || S.poured) {
        // 敞口：多出来的从管口出去，少了就进空气；慢慢和外面的空气混合
        const room = V_TUBE + V_LINE;
        if (vol > room) out = (vol - room) * 298 / (Tg + 273); else airIn = (room - vol) * 298 / (Tg + 273);
        const a = 1 - Math.exp(-0.05 * h), t2 = tot - out + airIn;
        S.co2 += (0 - S.co2) * a; S.o2 += (0.21 * t2 - S.o2) * a; S.n2 += (0.79 * t2 - S.n2) * a;
      } else if (!S.clampOpen) {
        const P = vol / (V_TUBE + V_LINE - S.suck);
        if (P > P_POP && !S.popped && S.lit) {
          S.popped = true; S.plug = 'out'; sfx.clink({ freq: 600, gain: 0.08 }); far();
          status('<b>砰！</b>弹簧夹没打开，试管里的气体受热膨胀又出不去，压强越来越大，<b>橡胶塞被冲开了</b>。所以加热前要<b>打开弹簧夹</b>。点“更多”里的“全部重来”再做一次。');
          log(['弹簧夹没打开就加热', '橡胶塞被<b>冲开</b>', '气体出不去，压强越来越大']);
        }
      } else if (S.end === 'lime') {
        const roomFull = V_TUBE + V_LINE;
        if (vol > roomFull - S.suck) {
          S.suck = Math.max(0, roomFull - vol);
          if (vol > roomFull) out = (vol - roomFull) * 298 / (Tg + 273);
        } else S.suck = Math.min(V_LINE + 0.5, S.suck + Math.min(roomFull - S.suck - vol, 0.6 * h));      // 石灰水沿导管被吸上来
      } else {
        S.suck = Math.max(0, S.suck - 2 * h);
        const room = V_TUBE + V_LINE - S.suck;
        if (vol > room) out = (vol - room) * 298 / (Tg + 273); else airIn = (room - vol) * 298 / (Tg + 273);
      }
      if (out > 0) {
        const t = S.co2 + S.n2 + S.o2, f = out / t;
        const oc = S.co2 * f; S.co2 -= oc; S.n2 -= S.n2 * f; S.o2 -= S.o2 * f;
        if (sealed && S.clampOpen && S.end === 'lime') {
          S.limeCO2 += oc * 0.5; S.lime = Math.min(1, S.limeCO2 / LIME_CO2);
          FX.bubAcc += out; S.outCO2 = oc / out; FX.lastOut = 0.6;
          if (!S.seen.air && S.outCO2 < 0.3 && S.lit) { S.seen.air = true; log(['刚加热：导管口冒出气泡', '石灰水<b>不变浑浊</b>', '冒出的是试管里受热膨胀的空气']); }
        }
      }
      if (airIn > 0) { S.n2 += airIn * 0.79; S.o2 += airIn * 0.21; if (S.plug === 'in' && !S.broken && S.pourK < 0) S.airIn += airIn; }
      S.flowV = (out - airIn) / Math.max(h, 1e-6);
      // 热的铜遇到氧气，又变成黑色的氧化铜：2Cu + O₂ → 2CuO
      // 还在加热时：试管里原有空气中的氧气和炽热的木炭反应（C + O₂ → CO₂，课本第 132 页），就算铜被氧化了也会马上被木炭还原回来
      const cu = xi() - S.ox;
      if (S.o2 > 0.01 && S.loaded && S.pourK < 0) {
        if (S.lit && Tmax() > 400 && R() > xi()) { const dO2 = S.o2 * (1 - Math.exp(-0.2 * h)); S.o2 -= dO2; S.co2 += dO2; }
        else if (!S.lit && cu > 0.002) {
          const kox = 0.25 * clamp((Tmax() - 180) / 200, 0, 1);
          const dO2 = Math.min(S.o2 * (1 - Math.exp(-kox * h)), (cu * N_CUO / 2) * 24465);
          S.o2 -= dO2; S.ox += (2 * dO2 / 24465) / N_CUO;
        }
      }
      // 倒吸：石灰水吸满导管和乳胶管（约 4 mL），流进热试管
      if (S.suck >= V_LINE && !S.broken && !S.wet) {
        if (Tmax() > 150) {
          S.broken = 'suck'; S.lit = false; sfx.clink({ freq: 500, gain: 0.08 }); far(); near(POWDER_C.clone().add(new THREE.Vector3(0.02, 0, 0)), [0.05, 0.25, 1], 0.2);
          status('<b>石灰水倒吸进了热的试管，试管炸裂了。</b>所以停止加热时要<b>先撤出导管，再停止加热</b>。点“更多”里的“全部重来”再做一次。');
          log(['导管还在石灰水里就停止加热', '石灰水<b>倒吸</b>进热试管，试管<b>炸裂</b>', '试管冷却，里面的气体收缩']);
        } else { S.wet = true; status('石灰水倒流进了试管里，把粉末弄湿了。'); }
      }
      if (S.lampFirst && S.suck > 0.4 && !S.seen.suck && !S.broken) { S.seen.suck = true; near(new THREE.Vector3(LIME.x - 0.03, 0.08, 0), [0.1, 0.25, 1], 0.3); status('石灰水在沿着导管<b>往上吸</b>！赶快把导管<b>拖出</b>石灰水。'); }
    };

    // ================= 每帧 =================
    const tmp = new THREE.Vector3(), mtx = new THREE.Matrix4(), one = new THREE.Vector3(1, 1, 1), col = new THREE.Color();
    const qTube = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), D), qPour = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), POUR_D);
    const POUR_B = POUR_MOUTH.clone().addScaledVector(POUR_D, -0.15);
    const ease = (k) => k * k * (3 - 2 * k);
    const step = (dt, t) => {
      // 模型：步长切细一点
      // 刚停止加热、还没夹紧乳胶管的那十几秒：时间不加快（不然手还没伸到弹簧夹，空气就进去了一大截）
      const slow = !S.lit && S.heatT > 0 && S.clampOpen && S.plug === 'in' && !S.broken && S.pourK < 0 && Tmax() > 150 && S.slowT < 14;
      if (slow) S.slowT += dt;
      const H = dt * (slow ? 1 : SPEED), n = Math.max(1, Math.ceil(H / 0.25));
      for (let i = 0; i < n; i++) model(H / n);
      // 纸槽的动画（铺进试管）
      if (S.anim) {
        S.anim.t += dt;
        const k = S.anim.t / 1.4;
        if (k < 1) { const s = k < 0.45 ? 0.15 - (k / 0.45) * 0.135 : k < 0.6 ? 0.015 : 0.015 + ((k - 0.6) / 0.4) * 0.15; trough.position.copy(BOTTOM).addScaledVector(D, s).add(new THREE.Vector3(0, -0.0045, 0)); trough.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), D); tPowder.visible = k < 0.5; }
        else { S.anim = null; trough.quaternion.identity(); const a = trough.position.clone(); S.troughBack = { t: 0, pts: [a, V(a.x, TROUGH_HIGH, a.z), V(a.x, TROUGH_HIGH, TROUGH_HOME.z), V(TROUGH_HOME.x, TROUGH_HIGH, TROUGH_HOME.z), TROUGH_HOME.clone()] }; }
      } else if (S.troughBack) {
        // 铺完：竖直抽出来抬高，绕过乳胶管，放回桌上
        const B = S.troughBack; B.t = Math.min(1, B.t + dt / 1.3);
        const L = [0]; for (let i = 1; i < B.pts.length; i++) L.push(L[i - 1] + B.pts[i].distanceTo(B.pts[i - 1]));
        const u = ease(B.t) * L[L.length - 1]; let i = 1; while (i < B.pts.length - 1 && L[i] < u) i++;
        trough.position.lerpVectors(B.pts[i - 1], B.pts[i], clamp((u - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]), 0, 1)); trough.quaternion.identity();
        if (B.t >= 1) S.troughBack = null;
      } else if (!S.troughDrag) { trough.position.lerp(TROUGH_HOME, 0.15); trough.quaternion.identity(); }      // 松手：纸槽滑回桌上
      if (!S.anim) tPowder.visible = S.mixed && !S.loaded && S.scooped;
      // 木炭粉：表面皿倾斜着到了氧化铜上方就倒进去（倒的时候粉末一点点落下）；松手后表面皿滑回原处
      if (S.dishDrag && !S.mixed && Math.abs(cDish.position.x - cuoDish.position.x) < 0.04 && cDish.rotation.z > 0.5) A.mix();
      if (!S.dishDrag) { cDish.position.lerp(cDish.home, 0.15); cDish.rotation.z *= 0.8; }
      if (S.mixed && S.mixK < 1) {
        S.mixK = Math.min(1, S.mixK + dt / 0.8);
        if (S.dishDrag && Math.random() < dt * 60) { cDish.updateMatrixWorld(true); const e = group.worldToLocal(cDish.localToWorld(V(-0.018, 0.004, 0))); dust.spawn({ p: e, v: V(-0.01, 0, 0), size: 0.0008, life: 0.8 }); }
      }
      dust.update(dt, (p, d) => { p.v.y -= 0.6 * d; p.p.addScaledVector(p.v, d); return p.p.y > 0.005; });
      const mk = S.mixed ? S.mixK : 0, ck = 1 - mk;
      cDish.heap.visible = ck > 0.02; cDish.heap.scale.set(Math.max(0.01, ck), 0.32 * Math.max(0.01, ck), Math.max(0.01, ck));
      cuoDish.heap.visible = !S.loaded && !S.scooped; cuoDish.heap.scale.set(1 + 0.15 * mk, 0.32 + 0.08 * mk, 1 + 0.15 * mk);
      // 倒在纸上
      if (S.pourK >= 0 && !S.poured && S.plugK > 0.99) { S.pourK = Math.min(1, S.pourK + dt / 2.6); if (S.pourK >= 1) finishPour(); }      // 先拔下塞子，再倒
      const pk = S.pourK < 0 ? 0 : S.pourK;
      const mv = pk < 0.3 ? ease(pk / 0.3) : pk < 0.76 ? 1 : 1 - ease((pk - 0.76) / 0.24);
      tubeHold.position.lerpVectors(BOTTOM, POUR_B, mv); tubeHold.quaternion.slerpQuaternions(qTube, qPour, mv);
      tubeHold.updateMatrix();
      // 塞子、导管、乳胶管、弹簧夹
      // 塞子：点一下以后先顺着试管拔出来，再画一道弧放到桌上（塞回去时反过来）
      S.plugK = clamp(S.plugK + clamp((S.plug === 'in' ? 0 : 1) - S.plugK, -dt * 1.5, dt * 1.5), 0, 1);
      let base, axis;
      { const K = S.plugK, IN = MOUTH.clone().addScaledVector(D, -0.01), UP = IN.clone().addScaledVector(D, 0.03), OUT = PLUG_TABLE.clone().add(new THREE.Vector3(-0.009, 0.0104, 0));
        if (K < 0.3) { base = IN.lerp(UP, ease(K / 0.3)); axis = D.clone(); }
        else { const u = ease((K - 0.3) / 0.7); base = UP.lerp(OUT, u); base.y += Math.sin(Math.PI * u) * 0.03; axis = D.clone().lerp(new THREE.Vector3(1, 0, 0), u).normalize(); } }
      plug.position.copy(base); plug.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
      const want = S.dragTip || TIP[S.end];
      endPiece.position.lerp(want, S.dragTip ? 1 : 0.3);
      rebuildHose(base, axis);
      jA.position.y += ((S.clampOpen ? 0.0072 : 0.0042) - jA.position.y) * 0.25; jB.position.y = -jA.position.y;
      // 酒精灯、灯帽、网罩
      lamp.flame.setOn(capper.update(dt, S.lit)); lamp.flame.setSize(S.cover ? 1.1 : 1);        // 灯帽：点燃前取下放到桌上；熄灭时盖上，再轻提一下、重新盖好
      lamp.flame.setColors(S.cover ? { mid: 0xffd27a, edge: 0xff8a3a, blue: 0.6 } : { mid: 0xffdc8a, edge: 0xffa24a, blue: 0.85 });
      // 网罩：拖着时跟手；松手 / 点一下以后先抬到灯颈以上，横着移过去，再放下
      if (S.coverDrag) coverG.position.copy(S.coverDrag);
      else {
        const g = coverG.position, tgt = S.cover ? COVER_ON : COVER_OFF;
        if (Math.abs(g.x - tgt.x) > 0.002) { if (g.y < COVER_UP - 0.003) g.y += Math.min(COVER_UP - g.y, Math.max(0.002, (COVER_UP - g.y) * 0.25)); else { g.x += (tgt.x - g.x) * 0.2; g.y += (COVER_UP - g.y) * 0.2; } }
        else g.lerp(tgt, 0.2);
      }
      // 试管：裂纹、倒流进去的水
      tube.crack.visible = !!S.broken;
      tube.drops.children.forEach((d, i) => { d.visible = !!S.broken || S.wet; d.position.set(0.004 + (i % 2) * 0.002, 0.04 + i * 0.012, (i % 3 - 1) * 0.003); });
      // 粉末颗粒
      const r = R(), cFrac = 0.3 * (S.mC / 0.2), black = clamp((S.ox / Math.max(0.02, xi())) / SKIN, 0, 1) * (xi() > 0.01 ? 1 : 0);
      let nRed = 0, nBlack = 0;
      if (S.loaded && !S.anim) {
        grainMesh.count = NG;
        grains.forEach((g, i) => {
          const isC = g.kc < cFrac, xs = S.x[g.seg];
          let c = null;
          if (isC) { if (g.u >= xs / r) c = COL.c; }
          else if (g.u < xs) c = g.oxr > 1 - black ? COL.cuo : COL.cu;
          else c = COL.cuo;
          if (!c) { mtx.makeScale(0, 0, 0); grainMesh.setMatrixAt(i, mtx); return; }
          if (c === COL.cu) nRed++; else nBlack++;
          // 位置：在试管里，或者正在落到纸上 / 已经在纸上
          const inTube = tmp.copy(g.loc).applyMatrix4(tubeHold.matrix);
          let fall = S.poured ? 1 : S.pourK < 0 ? 0 : clamp((S.pourK - 0.34 - g.delay * 0.16) / 0.22, 0, 1);
          if (fall > 0) { const e = ease(fall); inTube.lerp(g.paper, e); inTube.y += Math.sin(e * Math.PI) * 0.006; }
          mtx.compose(inTube, g.rot, one); grainMesh.setMatrixAt(i, mtx);
          col.copy(c).multiplyScalar(c === COL.cu ? g.shade : 0.9 + (g.shade - 0.82) * 0.5); grainMesh.setColorAt(i, col);
        });
        grainMesh.instanceMatrix.needsUpdate = true; if (grainMesh.instanceColor) grainMesh.instanceColor.needsUpdate = true;
      } else grainMesh.count = 0;
      S.redShare = nRed + nBlack ? nRed / (nRed + nBlack) : 0;
      // 第一次看到红色、石灰水变浑浊
      const xm = Math.max(...S.x);
      if (xm > 0.25 && S.redAt == null && S.lit) { S.redAt = S.heatT; log([`加热约 ${fmtT(S.heatT)}`, '黑色粉末里出现<b>红色</b>（受热最强的地方先变）', '生成了铜']); status('看试管里：黑色粉末从<b>受热最强的地方</b>开始变<b>红</b>了。'); }
      if (S.lime > 0.6 && S.limeAt == null) { S.limeAt = S.heatT; log([`加热约 ${fmtT(S.heatT)}`, '澄清石灰水<b>变浑浊</b>', '生成了二氧化碳']); }
      if (!bar.has('watch') && xi() >= 0.5 && S.lime > 0.6 && !S.demo) { done('watch'); far(); status(`加热了约 ${fmtT(S.heatT)}：粉末里一大半变成了<b>红色</b>，石灰水<b>变浑浊</b>了。现在停止实验：<b>先把导管撤出石灰水</b>，再熄灭酒精灯。`); }
      if (S.lit && !S.cover && S.heatT > 150 && xi() < 0.15 && !S.bareHint) { S.bareHint = true; status('加热两分多钟了，粉末<b>几乎还是黑的</b>——温度够吗？（不加网罩，最热处约 550 ℃）可以把<b>网罩</b>套上试试。'); log(['不加网罩加热约 2.5 分钟', `粉末几乎还是黑的（约 ${Math.round(xi() * 100)}% 变成铜）`, '温度不够高，反应很慢']); }
      // 试管里的气体：深灰 = 二氧化碳，浅灰 = 氮气，蓝 = 氧气；有气体流出时往管口飘
      const gtot = S.co2 + S.n2 + S.o2, fC = gtot ? S.co2 / gtot : 0, fO = gtot ? S.o2 / gtot : 0;
      const dk = [], lt = [], bl = [];
      if (S.loaded && S.plug === 'in' && S.pourK < 0 && !S.poured) {
        FX.drift += clamp(S.flowV, -3, 6) * dt * 0.02;
        for (const d of dots) {
          const yy = 0.05 + ((d.y0 + FX.drift) % 1 + 1) % 1 * 0.085;
          d.p.set(d.rx + Math.sin(t * 0.8 + d.ph) * 0.0008, yy, d.rz + Math.cos(t * 0.7 + d.ph) * 0.0008).applyMatrix4(tubeHold.matrix);
          (d.rank < fC ? dk : d.rank < fC + fO ? bl : lt).push(d);
        }
      }
      darkP.list = dk; lightP.list = lt; blueP.list = bl;
      for (const p of [darkP, lightP, blueP]) p.update(0, () => true);
      // 气泡（导管口在石灰水里）
      while (FX.bubAcc > 0.35) { FX.bubAcc -= 0.35; if (S.end === 'lime') bubs.spawn({ p: endPiece.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.002, 0.001, 0)), v: new THREE.Vector3(0, 0.03, 0), size: 0.0017 + Math.random() * 0.0007, life: 1.5 }); }
      FX.bubAcc = Math.min(FX.bubAcc, 2);
      bubs.update(dt, (p, d) => { p.v.y += 0.15 * d; p.p.addScaledVector(p.v, d); return p.p.y < LIME_SURF - 0.001 - (S.suck / 8) * 0.04; });
      FX.lastOut = Math.max(0, FX.lastOut - dt);
      // 热（橙）
      const tm = Tmax(), hot = S.T.indexOf(tm);
      heat.position.copy(tmp.set(0.003, segS(hot), 0).applyMatrix4(tubeHold.matrix)); heat.scale.setScalar(0.04);
      heat.material.opacity = S.pourK < 0 ? clamp((tm - 260) / 600, 0, 0.7) : 0;
      // 石灰水：浑浊；倒吸时液面下降、导管里有液柱
      limeMilk.set(S.lime); limeMilk.update(t);
      limeLiq.scale.y = Math.max(0.005, (LIME_SURF - LIME.y - 0.0015) * (1 - S.suck / 9));
      endWater.visible = S.suck > 0.05 && S.end === 'lime'; endWater.scale.y = Math.min(EH, (S.suck / V_LINE) * EH * 1.4);
      // 卡片
      const cuPct = Math.round((xi() - S.ox) * 100), tR = Math.round(tm / 10) * 10;
      const stamp = S.broken ? '<span class="cc-res burn">炸裂</span>' : S.popped ? '<span class="cc-res burn">塞子冲开</span>' : xm > 0.25 ? '<span class="cc-res burn">变红</span>' : '';
      tubeCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">试管里</span>${stamp}</div><div class="cc-more"><div class="cc-obs"><span class="cc-th"><i style="height:${clamp(tm / 8, 4, 100).toFixed(0)}%"></i></span><b>${tR}</b><small>℃ 最热处（约）</small></div><div class="cc-obs"><span class="o2-read" style="border-color:rgba(192,98,58,.5)"><i style="width:${clamp(cuPct, 0, 100)}%;background:#c4633a"></i></span><b style="color:#b5502a">${clamp(cuPct, 0, 100)}%</b><small>氧化铜变成了铜</small></div>${S.heatT > 0 ? `<div class="cc-note">${S.lit ? `已加热 ${fmtT(S.heatT)}` : `停止加热 ${fmtT(S.coolT)}`}（实际时间）${!S.lit && S.clampOpen && S.slowT > 0 && S.slowT < 14 && Tmax() > 150 ? '——这几秒时间不加快' : ''}</div>` : ''}</div></div>`)
        .loc(group, POWDER_C.x, POWDER_C.y + 0.012, 0).show(S.loaded && S.pourK < 0 && !S.poured);
      const limeStamp = S.suck > 0.3 && S.end === 'lime' ? '<span class="cc-res burn">倒吸</span>' : S.lime > 0.6 ? '<span class="cc-res burn">变浑浊</span>' : '';
      const bubNote = FX.lastOut > 0 ? `<div class="cc-note">冒出的气泡：${S.outCO2 > 0.5 ? '主要是<b>二氧化碳</b>' : '主要是<b>空气</b>'}</div>` : '';
      limeCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">澄清石灰水</span>${limeStamp}</div>${bubNote ? `<div class="cc-more">${bubNote}</div>` : ''}</div>`)
        .loc(group, LIME.x, 0.12, 0).show(S.lime > 0.05 || FX.lastOut > 0 || S.suck > 0.3);
      if (S.poured && S.result) paperCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">倒在纸上</span>${S.result.red > 40 ? '<span class="cc-res burn">红色的铜</span>' : '<span class="cc-res">还是黑的</span>'}</div><div class="cc-more"><div class="cc-obs"><b style="color:#b5502a">${S.result.red}%</b><small>红色</small><b style="color:#2b3142">${100 - S.result.red}%</b><small>黑色</small></div></div></div>`);
      paperCard.loc(group, PAPER.x + 0.04, 0.004, PAPER.z).show(S.poured && !!S.result);
      bar.near(S.near);
    };
    const finishPour = () => {
      S.poured = true; S.pourK = 1;
      // 再算一遍颗粒（倒出来的时候是什么颜色就是什么颜色）
      const r = R(), cFrac = 0.3 * (S.mC / 0.2), black = clamp((S.ox / Math.max(0.02, xi())) / SKIN, 0, 1) * (xi() > 0.01 ? 1 : 0);
      let red = 0, all = 0;
      for (const g of grains) { const isC = g.kc < cFrac, xs = S.x[g.seg]; if (isC) { if (g.u >= xs / r) all++; } else { all++; if (g.u < xs && g.oxr <= 1 - black) red++; } }
      const redP = all ? Math.round((red / all) * 100) : 0;
      S.result = { red: redP, cu: Math.round((xi() - S.ox) * 100), ox: Math.round(S.ox * 1000) / 10, airIn: Math.round(S.airIn) };
      const why = [];
      if (S.ox > 0.004) why.push('冷却时进了空气：热的铜又被氧化成黑色的氧化铜');
      if (xi() < 0.6) why.push(S.cover ? '还有没反应完的氧化铜（加热时间短 / 木炭不够）' : '还有很多没反应的氧化铜（没加网罩，温度不够）');
      if (r > 1.05) why.push('黑色里还有一点过量的木炭粉');
      log(['冷却后倒在纸上', `红色约 ${redP}%，黑色约 ${100 - redP}%`, why.join('；') || '红色的是铜']);
      done('pour'); far(); near(PAPER.clone().add(new THREE.Vector3(0.02, 0.004, 0)), [0.05, 0.7, 1], 0.3);
      status(redP > 40 ? '倒在纸上：黑色粉末里有了<b>红色</b>的物质。看看下面的问题。' : '倒在纸上：粉末大多还是<b>黑色</b>的。看看记录，想想为什么。');
      W?.q1.open();
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.42, d: 0.2, h: 0.24 },
      view: { elev: 16, azim: -6, lookY: 0.42, margin: 1.06 },
      mount(ui) {
        const myRecord = () => {
          const rs = S.result;
          const red = rs ? `倒在纸上：红色约 <b class="y">${rs.red}%</b>，黑色约 ${100 - rs.red}%` : `试管里：约 ${Math.round((xi() - S.ox) * 100)}% 的氧化铜变成了铜`;
          const lm = S.limeAt != null ? `石灰水：加热约 ${fmtT(S.limeAt)} 后<b class="y">变浑浊</b>；刚开始冒出的气泡没让它变浑浊` : '石灰水：<b class="n">没有变浑浊</b>';
          const air = S.airIn >= 2 ? `<div>冷却时进去了约 ${Math.round(S.airIn)} mL 空气（弹簧夹没及时夹紧）</div>` : '';
          return `<div>粉末：黑色 → ${rs && rs.red > 40 ? '<b class="y">红色</b>' : '大多还是黑色'}。${red}</div><div>${lm}</div>${air}<div>你的顺序：${S.seq.join(' → ') || '—'}</div>`;
        };
        const q2 = think({
          q: '为什么要<b>先撤出导管，再停止加热</b>？',
          ctx: () => `<div>你的顺序：${S.seq.join(' → ')}</div><div>${S.broken ? '结果：石灰水<b class="y">倒吸</b>进热试管，试管炸裂' : S.lampFirst ? '结果：石灰水沿导管<b class="y">往上吸</b>' : '结果：石灰水<b class="n">没有倒吸</b>'}</div>`,
          options: ['先停止加热的话，试管冷却、里面的气体收缩，石灰水会倒吸进热的试管，使试管炸裂', '为了让试管里的二氧化碳都跑进石灰水', '先撤导管，试管冷得更快'],
          wrong: ['生成的二氧化碳早就通进去了。想想：熄灯以后试管里的气体会怎样？可以在“换个条件再试”里先熄灯试试。', '试管冷得快慢和导管在哪儿没关系。想想：熄灯以后试管里的气体会怎样？'],
          ok: '对。所以要先撤导管、再停止加热；停止加热后还要<b>夹紧乳胶管</b>，不让空气进去——热的铜遇到氧气会又变成黑色的氧化铜。可以掀开结论看看。',
          status: (m) => ui.status(m), onOk: () => { next.hidden = false; done('why'); },
        });
        const q1 = think({
          q: '黑色粉末里的<b>红色物质</b>是什么？石灰水为什么<b>变浑浊</b>？',
          ctx: myRecord,
          options: ['红色的是铜；生成了二氧化碳——木炭夺走了氧化铜里的氧', '红色的是烧红的木炭；石灰水是被热气烫浑浊的', '红色的是熔化的氧化铜；石灰水里混进了木炭粉'],
          wrong: ['木炭烧红只在热的时候；冷却后倒在纸上还是红的。刚开始冒出的热空气也没让石灰水变浑浊。点“钻进粉末里看”，看看氧原子去了哪儿。', '氧化铜要一千多摄氏度才熔化，这里远没到。点“钻进粉末里看”，看看氧原子去了哪儿。'],
          ok: '对：氧化铜失去氧变成了<b>铜</b>（还原反应），木炭夺走氧变成<b>二氧化碳</b>，使石灰水变浑浊——木炭有<b>还原性</b>。',
          status: (m) => ui.status(m), onOk: () => q2.open(),
        });
        const cSeg = seg('', ['0.2 g（约 10∶1，碳稍过量）', '0.15 g（按方程式 13∶1）', '0.05 g（太少）'], (_, k) => A.setC(k));
        const vary = varyBox('课本说“可加网罩”：不套网罩直接加热试试。也可以试试：先熄灭酒精灯、后撤导管；停止加热后不夹弹簧夹；或者不打开弹簧夹就加热。木炭粉的量（混合之前选）：', cSeg);
        const more = moreBox([
          ['木炭粉倒进氧化铜里混匀', () => A.mix()], ['铺进试管', () => A.load()], ['塞紧橡胶塞', () => A.plug()],
          ['导管插入 / 撤出石灰水', () => A.endTo(S.end === 'lime' ? 'up' : 'lime')], ['打开 / 夹紧弹簧夹', () => A.clamp()],
          ['套上 / 拿掉网罩', () => A.cover(!S.cover)], ['点燃 / 熄灭酒精灯', () => A.light()], ['倒在纸上', () => A.pour()],
        ], () => A.reset());
        const note = h('p', { class: 'fineprint', html: '说明：时间加快 8 倍。按 2 g 氧化铜计（恰好需要 0.15 g 木炭，质量比 159∶12 ≈ 13∶1；常用约 10∶1，碳稍过量）。温度是近似值：酒精灯外焰约 500–600 ℃，加网罩后试管底部最热处约 700 ℃；反应速率按活化能约 120 kJ/mol 估计（示意）。冷却时进去的空气只能把很少一部分铜重新氧化，但它集中在粉末表层，看起来黑了一片（表层按约 4% 估计）。导管、乳胶管里按约 4 mL 计；塞子在约 1.6 倍大气压时被冲开（近似）。“氧化铜变成了铜”是模型估计。' });
        const { tbl, next } = mountXuean(ui, { controls: [q1, q2, vary, more, note], headers: ['做了什么', '现象', '说明'], tableTitle: '观察记录' });
        W = { tbl, q1, q2, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('图 6-9 的装置：试管已经固定在铁架台上（管口略向下倾斜），下面是升降台上的酒精灯。可以先看<b>老师演示</b>，也可以直接动手：先把<b>木炭粉</b>倒进<b>氧化铜</b>里混匀。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); lamp.flame.update(t); mic.update(dt, k); },
      dispose() { mic.dispose(); bar.dispose(); bubs.dispose(); dust.dispose(); darkP.dispose(); lightP.dispose(); blueP.dispose(); },
      debug: { get S() { return S; }, A, bar, MOUTH, xi, mic, picks: { cDish: cDish.pick, cuoDish: cuoDish.pick, trough: troughPick, plug: plugPick, end: endPick, clamp: clampPick, cover: coverPick, lamp: lampPick, tube: tubePick, limeTube: lime, lampBody: lamp },
        qa: qaFlow(drag, [
          { name: '木炭粉倒进氧化铜', drag: cDish.pick, to: () => cuoDish.position.clone().add(new THREE.Vector3(0.01, 0.03, 0)) },
          { name: '拔出橡胶塞', tap: plugPick },
          { name: '纸槽铺进试管', drag: troughPick, to: () => MOUTH.clone(), wait: 2 },
          { name: '塞紧橡胶塞', tap: plugPick },
          { name: '导管插入石灰水', drag: endPick, to: () => TIP.lime.clone().add(new THREE.Vector3(0, 0.075, 0)) },
          { name: '打开弹簧夹', tap: clampPick },
          { name: '点燃酒精灯', tap: lampPick, wait: 1 },
          { name: '罩上网罩', drag: coverPick, to: () => COVER_ON.clone().add(new THREE.Vector3(0, 0.02, 0)), wait: 6 },
          { name: '钻进粉末里看', run: () => mic.open(), wait: 14 },
          { name: '回到桌上', run: () => mic.close(), wait: 8 },
          { name: '撤出导管', drag: endPick, to: () => TIP.up.clone().add(new THREE.Vector3(0, 0.075, 0)) },
          { name: '拿开网罩', drag: coverPick, to: () => COVER_OFF.clone().add(new THREE.Vector3(0, 0.02, 0)) },
          { name: '熄灭酒精灯', tap: lampPick },
          { name: '夹紧乳胶管', tap: clampPick, wait: 22 },
          { name: '倒在纸上', tap: tubePick, wait: 4 },
          { name: '答第一题', run: () => W.q1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.q2.el.querySelector('button').click() },
        ]) },
    };
  },
};
