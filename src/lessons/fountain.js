// 人教版高中化学必修第二册第 13 页【实验5-6】（图5-11 氨溶于水的喷泉实验）：
//   在干燥的圆底烧瓶里充满 NH₃，用带有玻璃管和胶头滴管（预先吸入水）的橡胶塞塞紧瓶口。倒置烧瓶，使玻璃管插入盛有水的烧杯中
//   （预先在水里滴入少量酚酞溶液）。打开弹簧夹，挤压胶头滴管，使水进入烧瓶。观察并描述现象，分析出现这些现象的可能原因。
// 课本第 14 页：氨极易溶于水，常温常压下 1 体积水大约可溶解 700 体积氨；NH₃ + H₂O ⇌ NH₃·H₂O ⇌ NH₄⁺ + OH⁻；氨水显弱碱性，能使酚酞溶液变红。
// 模型（界面上写明）：
//   烧瓶内容积约 251 mL（球泡内半径 3.85 cm + 瓶颈），20 ℃、101.3 kPa；“充满”按氨气占 98%（收集的氨气里总混有少量空气，示意）。
//   瓶内压强 = 瓶里的气体（氨 + 空气）÷ 气体占的体积（等温）。
//   溶解：瓶里有水就溶，速度 = K ×（氨的分压比 − 已溶的氨 ÷（700 × 水的体积））；K = 30 mL/s（有水时）+ 10 × 喷进来的水流量（喷泉的水花接触面大）。
//     700 用课本数据；K 是示意值（几秒内溶完）。
//   进水：瓶内外压强差减去液柱（从烧杯水面到瓶里出水口的高度）的压强，按 Q = 0.3 × 管截面 × √(2Δp/ρ)（玻璃管内径 4 mm，0.3 是管道阻力的示意系数）。
//   漏气（塞子没塞紧）：外面的空气按 2500 mL/s × 压强差比 从塞子边钻进去；玻璃管口在空气里、弹簧夹开着：空气按 3000 mL/s × 压强差比 从管口进去（示意）。
//   溶液的颜色：已溶的氨（24.0 L/mol）÷ 溶液体积 → 浓度；[OH⁻] = √(Kb·c)，Kb = 1.8×10⁻⁵；酚酞 pH 约 8.2 起变红；挤进去的那点水里没有酚酞。
// 看不见的东西：绿点 = 氨分子（和初中“分子运动”那课一样的颜色）、灰点 = 空气；箭头 = 大气压和瓶内气体的压强（长短按压强算，示意）。
import * as THREE from 'three';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs, mountXuean, moreBox, varyBox } from './kit/chemlesson.js';
import { draggable, clamp } from './kit/interact.js';
import { seg } from './kit/ui.js';
import { chemBeaker, glassMat, glassTube, rubberTube } from './kit/chem.js';
import { water2 } from './kit/chemfx.js';
import { dropBottle, homeLift } from './kit/labops.js';
import { stand, textPlate } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { micro } from './kit/microworld.js';
import { fountainScene } from './kit/fountain-parts.js';
import { sfx } from './kit/audio.js';
import { paint, inked, hull, glassEdge, arrow } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
// ---- 烧瓶（局部坐标：球心在原点，瓶颈朝 +y）----
const RO = 0.04, RI = 0.0385, NRO = 0.0125, NRI = 0.011, LIP = 0.09, PLUG0 = 0.07, PLUG1 = 0.094, PIV = 0.082;
const Y0I = Math.sqrt(RI * RI - NRI * NRI);
const V0 = (4 / 3) * Math.PI * RI ** 3 * 1e6 - (Math.PI * (RI - Y0I) ** 2 * (3 * RI - (RI - Y0I)) / 3) * 1e6 + Math.PI * NRI * NRI * (PLUG0 - Y0I) * 1e6;     // 约 251 mL
const TX = -0.0045, TIP = -0.005, TEND = 0.308, DX = 0.005, CLIP_Y = 0.178;          // 玻璃管、滴管、弹簧夹（局部）
// ---- 桌上的位置 ----
const CY = 0.33;                                   // 装好以后球心的高度
const MOUNT = V(0, CY - PIV, 0);                   // 装好以后塞子中心（转动的支点）
const HOME = V(0.19, 0.0432 + PIV, 0);            // 软木圈上正放时塞子中心
const BK = V(0, 0.016, 0), BR = 0.042, BH = 0.095, BRI = BR - 0.0012, BV0 = 380;      // 烧杯在铁架台底座上，380 mL 水
const D_BOT = V(0.12, 0, 0.09), D_Y = BK.y + BH + 0.02;
const JAW_Y = 0.27;
// ---- 物理 ----
const SOL = 700, KB = 1.8e-5, VM = 24.0, A_T = Math.PI * 0.002 ** 2, CD = 0.3, RHO = 1000, G = 9.81, P0 = 101325;
const FULL = 0.98;                                 // “充满”：氨气按 98% 计
const WET = 0.3;                                   // 烧瓶没干燥：瓶壁上的水（mL，示意）
const LV = (mL) => 0.0012 + (mL * 1e-6) / (Math.PI * BRI * BRI);
const WATER = 0xdcebf2, CLEAR = 0xe6eef2, PINK = 0xe0307a, NH3C = 0x1f9e6a, AIRC = 0x6c7380, PRESS = 0x47506a;
const plate = (text, w, hh) => textPlate(text, { w, h: hh, color: '#23293a', bg: 'rgba(255,250,240,0.92)', font: `bold ${Math.floor(Math.min(0.8 * 512 * hh / w, 0.82 * 512 / text.length))}px "Songti SC", serif` });

export default {
  id: 'fountain',
  fig: '图5-11',
  title: '氨溶于水的喷泉实验',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '倒置的烧瓶里充满氨气，玻璃管插在烧杯的水里。打开弹簧夹，用胶头滴管往烧瓶里挤进一点点水（约 1 mL）——会怎样？',
    hint: '课本第 13 页【实验5-6】。先猜，再自己挤一下看看。',
    options: ['烧杯里的水被压进烧瓶，喷成喷泉', '只多了那一点水，没有明显变化', '烧瓶里的气体从玻璃管冒到烧杯里'],
    answer: 0,
  },
  need: '在烧杯的水里滴入少量酚酞溶液；倒置充满氨气的烧瓶，使玻璃管插入烧杯的水中；打开弹簧夹，挤压胶头滴管，观察现象',
  conclusion: {
    page: 18, rect: [216, 54, 530, 200],
    quote: '氨是一种极易溶于水的气体，在常温常压下，1体积水大约可溶解700体积氨。氨溶于水时，会与水结合成一水合氨（NH3·H2O），一水合氨中有一小部分电离形成NH4+和OH-。NH3 + H2O ⇌ NH3·H2O ⇌ NH4+ + OH-　氨的水溶液（俗称氨水）显弱碱性，能使酚酞溶液变红或使红色石蕊试纸变蓝。',
    formula: 'NH₃ + H₂O ⇌ NH₃·H₂O ⇌ NH₄⁺ + OH⁻',
    why: '挤进去的少量水先溶解了一部分氨，瓶里的气体少了，<b>瓶内压强下降</b>；外面的<b>大气压</b>把烧杯里的水沿玻璃管压进烧瓶，压进来的水又继续溶解氨，越喷越多，形成<b>喷泉</b>——说明氨<b>极易溶于水</b>。喷进来的溶液变<b>红</b>——氨的水溶液显<b>碱性</b>（一水合氨中有一小部分电离出 OH⁻）。<br>所以烧瓶要干燥、氨气要充满、橡胶塞要塞紧：瓶里的氨少了、混进了空气，或者漏气，瓶内压强就减小得少，喷泉就弱，甚至不喷。',
    src: '课本第 13–14 页 · 第五章 第二节 氮及其化合物',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    let S = null, W = null;
    const DEF = { full: FULL, leak: false, wet: false };
    const cond = { ...DEF };          // “换个条件再试”选的（换条件重新摆放时保留；“全部重来”回到默认）
    const status = (m) => { if (!S.demo) W?.status(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (key, row) => { if (S.said[key]) return; S.said[key] = true; if (!S.demo) W?.tbl.add(row); };
    paperSheet(group, { w: 0.36, d: 0.2, x: 0.05, z: 0.04 });

    // ================= 铁架台、铁夹、烧杯 =================
    const st = stand({ height: 0.41, baseW: 0.2, baseD: 0.13 }); st.position.set(0.02, 0, 0); group.add(st);
    st.clamp(JAW_Y, 0.04);
    const metal = paint(0x8a929e), cork = paint(0xb88a5a);
    const jaws = [1, -1].map((s) => {
      const half = new THREE.Group(); half.position.set(0, JAW_Y, 0); half.rotation.y = s > 0 ? 0 : Math.PI;
      const arc = hull(new THREE.Mesh(new THREE.TorusGeometry(0.0141, 0.0015, 6, 20, Math.PI * 0.75), metal), 0.0005); arc.rotation.x = Math.PI / 2; arc.rotation.z = Math.PI * 0.125;
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.008, 0.0022), cork); pad.position.set(0, 0, NRO + 0.0011);
      half.add(arc, pad); group.add(half); half.s = s; return half;
    });
    const beaker = chemBeaker({ r: BR, h: BH, level: LV(BV0), color: WATER }); beaker.position.copy(BK); group.add(beaker);
    // ================= 软木圈（烧瓶一开始正放在上面）=================
    const ring = inked(new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.0045, 10, 32), cork), { width: 0.6 }); ring.rotation.x = Math.PI / 2; ring.position.set(HOME.x, 0.0045, 0); group.add(ring);
    // 软木圈前的桌牌：按当前条件写（收集后瓶里的气体中氨占多少，模型算的）
    let homeLab = null, homeTxt = '';
    const setHomeLab = (text) => {
      if (text === homeTxt) return; homeTxt = text;
      if (homeLab) { group.remove(homeLab); homeLab.geometry.dispose(); homeLab.material.map.dispose(); homeLab.material.dispose(); }
      homeLab = plate(text, Math.max(0.042, text.length * 0.0068), 0.011); homeLab.rotation.x = -0.5; homeLab.position.set(HOME.x, 0.0055, 0.05); group.add(homeLab);
    };

    // ================= 烧瓶 =================
    const flask = new THREE.Group(); group.add(flask);
    {
      const out = [new THREE.Vector2(0.0005, -RO)], top = Math.acos(NRO / RO);
      for (let i = 1; i <= 40; i++) { const a = -Math.PI / 2 + (i / 40) * (top + Math.PI / 2); out.push(new THREE.Vector2(Math.cos(a) * RO, Math.sin(a) * RO)); }
      out.push(new THREE.Vector2(NRO, LIP - 0.003), new THREE.Vector2(NRO + 0.001, LIP - 0.0015), new THREE.Vector2(NRO + 0.001, LIP), new THREE.Vector2(NRI, LIP));
      const glass = new THREE.Mesh(new THREE.LatheGeometry(out, 48), glassMat({ opacity: 0.16 })); glass.renderOrder = 9; glassEdge(glass, 0.0008); flask.add(glass);
    }
    // 瓶里的液体：内腔用一个水平的裁切面切出液面以下的部分（倒过来、正放都对）
    const cut = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    const liqMat = water2({ color: CLEAR, base: 0.62, rim: 0.25 }); liqMat.clippingPlanes = [cut];
    {
      const inn = [new THREE.Vector2(0.0005, -RI)], itop = Math.acos(NRI / RI);
      for (let i = 1; i <= 40; i++) { const a = -Math.PI / 2 + (i / 40) * (itop + Math.PI / 2); inn.push(new THREE.Vector2(Math.cos(a) * RI, Math.sin(a) * RI)); }
      inn.push(new THREE.Vector2(NRI, PLUG0), new THREE.Vector2(0.0005, PLUG0));
      const liq = new THREE.Mesh(new THREE.LatheGeometry(inn, 48), liqMat); liq.renderOrder = 7; flask.add(liq); flask.liq = liq;
    }
    const surf = new THREE.Mesh(new THREE.CircleGeometry(1, 40), water2({ color: CLEAR, base: 0.4, rim: 0.1 })); surf.rotation.x = -Math.PI / 2; surf.renderOrder = 8; surf.visible = false; group.add(surf);
    // 塞子和插在塞子上的东西（漏气时整组往外退一点）
    const plug = new THREE.Group(); flask.add(plug);
    const stopper = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0128, 0.0104, PLUG1 - PLUG0, 20), paint(0x8b4a3c)), { width: 0.8 }); stopper.position.y = (PLUG0 + PLUG1) / 2; plug.add(stopper);
    const upTube = glassTube([V(TX, TIP), V(TX, 0.13)], { r: 0.0026 }); plug.add(upTube);
    const latex = rubberTube([V(TX, 0.125), V(TX, 0.165), V(TX, 0.205)], { r: 0.0034 }); plug.add(latex);
    const lowTube = glassTube([V(TX, 0.2), V(TX, TEND)], { r: 0.0026 }); plug.add(lowTube);
    // 玻璃管里的水柱（局部坐标，按需要伸缩）
    const colMat = water2({ color: WATER, base: 0.7, rim: 0.2 });
    const col = (r) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 10), colMat); m.geometry.translate(0, 0.5, 0); m.renderOrder = 8.5; m.visible = false; plug.add(m); return m; };
    const lowCol = col(0.0018), upCol = col(0.0018);
    const upColMat = water2({ color: CLEAR, base: 0.75, rim: 0.2 }); upCol.material = upColMat;
    // 胶头滴管（预先吸入水）：尖朝瓶里，橡胶帽在塞子外面
    const dGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.0024, 0.0011, 0.06, 12), glassMat({ opacity: 0.32 })); dGlass.position.set(DX, 0.074, 0); dGlass.renderOrder = 9; glassEdge(dGlass, 0.0005); plug.add(dGlass);
    const dWater = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0007, 0.052, 10), paint(0xcfe4ef, { keep: true, unique: true })); dWater.position.set(DX, 0.072, 0); plug.add(dWater);
    const collar = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.004, 16), paint(0xc23a3a, { keep: true })), { width: 0.5 }); collar.position.set(DX, 0.106, 0); plug.add(collar);
    const bulb = inked(new THREE.Mesh(new THREE.SphereGeometry(0.005, 16, 12), paint(0xc23a3a, { keep: true })), { width: 0.6 }); bulb.scale.set(1, 1.5, 1); bulb.position.set(DX, 0.1155, 0); plug.add(bulb);
    const bulbPick = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.022, 0.016), new THREE.MeshBasicMaterial({ visible: false })); bulbPick.position.set(DX + 0.002, 0.114, 0); bulbPick.userData.pick = true; plug.add(bulbPick);
    // 弹簧夹：夹住乳胶管（两片夹口从前后夹住；按下把手夹口张开）
    const clip = new THREE.Group(); clip.position.set(TX, CLIP_Y, 0); plug.add(clip);
    const jawF = inked(new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.012, 0.0024), metal), { width: 0.5 }), jawB = jawF.clone();
    const armF = inked(new THREE.Mesh(new THREE.BoxGeometry(0.0022, 0.016, 0.002), metal), { width: 0.5 }), armB = armF.clone();
    const coil = hull(new THREE.Mesh(new THREE.TorusGeometry(0.0028, 0.0008, 6, 14), metal), 0.0004); coil.position.set(0.0085, 0, 0);
    clip.add(jawF, jawB, armF, armB, coil);
    const clipPick = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.02), new THREE.MeshBasicMaterial({ visible: false })); clipPick.position.set(0.006, 0, 0); clipPick.userData.pick = true; clip.add(clipPick);
    const flaskPick = new THREE.Mesh(new THREE.BoxGeometry(0.092, 0.092, 0.092), new THREE.MeshBasicMaterial({ visible: false })); flaskPick.userData.pick = true; flask.add(flaskPick);
    // 瓶内腔里均匀撒点：求液面（任何姿势）、放气体的点
    const cloud = [];
    while (cloud.length < 3000) {
      const p = V((Math.random() * 2 - 1) * RI, -RI + Math.random() * (PLUG0 + RI), (Math.random() * 2 - 1) * RI);
      if (p.length() < RI - 0.0004 || (p.y > Y0I - 0.004 && p.y < PLUG0 && Math.hypot(p.x, p.z) < NRI - 0.0004)) cloud.push(p);
    }
    const inner = cloud.filter((p) => p.length() < RI - 0.004 || (p.y > Y0I && Math.hypot(p.x, p.z) < NRI - 0.0025));      // 放气体点用（离玻璃远一点）

    // ================= 酚酞溶液：滴瓶 + 胶头滴管 =================
    const bottle = dropBottle(group, D_BOT, { label: '酚酞溶液' });
    const dropper = new THREE.Group(); group.add(dropper);
    {
      const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0024, 0.042, 10), glassMat({ opacity: 0.35 })); tb.position.y = 0.021; tb.renderOrder = 9; dropper.add(tb);
      const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0018, 0.02, 8), paint(0xf2f2ee, { keep: true })); ins.position.y = 0.012; dropper.add(ins);
      const bb = inked(new THREE.Mesh(new THREE.SphereGeometry(0.0052, 12, 8), paint(0xc23a3a, { keep: true })), { width: 0.4 }); bb.scale.y = 1.6; bb.position.y = 0.048; dropper.add(bb);
    }
    const dPick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 8), new THREE.MeshBasicMaterial({ visible: false })); dPick.position.y = 0.03; dPick.userData.pick = true; dropper.add(dPick);
    dropper.position.copy(bottle.tipHome);
    const dHand = new THREE.Object3D(); dHand.position.copy(bottle.tipHome); group.add(dHand);          // 手：拿着时在拖动平面上（滴管提起来在它上方），没拿着时在滴管的原点

    // ================= 粒子：滴下的酚酞、滴管喷进去的水、喷泉的水花、漏进来的气泡 =================
    const dropsP = new Particles({ max: 40, geometry: new THREE.SphereGeometry(1, 6, 5), material: water2({ color: 0xe8eef0, base: 0.6 }) }); dropsP.mesh.renderOrder = 9.6; group.add(dropsP.mesh);
    const sprayMat = new THREE.MeshBasicMaterial({ color: CLEAR, transparent: true, opacity: 0.8, depthWrite: false });
    const spray = new Particles({ max: 260, geometry: new THREE.SphereGeometry(1, 6, 5), material: sprayMat }); spray.mesh.renderOrder = 9.7; group.add(spray.mesh);
    const bubs = new Particles({ max: 60, geometry: new THREE.SphereGeometry(1, 8, 6), material: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, depthWrite: false }) }); bubs.mesh.renderOrder = 9.8; group.add(bubs.mesh);
    const squirt = new Particles({ max: 40, geometry: new THREE.SphereGeometry(1, 6, 5), material: new THREE.MeshBasicMaterial({ color: CLEAR, transparent: true, opacity: 0.8, depthWrite: false }) }); squirt.mesh.renderOrder = 9.7; group.add(squirt.mesh);          // 胶头滴管挤进去的水：没有酚酞，一直无色
    const jetMat = water2({ color: CLEAR, base: 0.75, rim: 0.3 });
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.25, 1, 10, 1, true), jetMat); jet.geometry.translate(0, 0.5, 0); jet.renderOrder = 9.5; jet.visible = false; group.add(jet);
    // 气体的点：绿 = 氨分子，灰 = 空气（示意）
    const NDOT = 64;
    const dotMesh = (color) => { const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.00115, 8, 6), new THREE.MeshBasicMaterial({ color }), NDOT); m.count = 0; m.renderOrder = 9.9; m.frustumCulled = false; m.raycast = () => {}; group.add(m); return m; };
    const dotsN = dotMesh(NH3C), dotsA = dotMesh(AIRC);
    const DOTS = { n: [], a: [] };
    // 压强的箭头（示意）：烧杯水面上的大气压（不变），瓶里气体的压强（随瓶内压强变）
    const outArrows = [-0.024, 0.024, 0].map((x, i) => { const a = arrow(PRESS, 0.0008); a.userData.x = x; a.userData.z = i === 2 ? 0.026 : 0; group.add(a); return a; });
    const inArrows = [[-1, 0.12], [1, 0.12], [-0.75, 0.66], [0.75, 0.66]].map(([x, y]) => { const a = arrow(PRESS, 0.0008); a.userData.d = V(x, y).normalize(); group.add(a); return a; });
    const labOut = plate('大气压', 0.026, 0.0085); group.add(labOut);
    const labIn = plate('瓶内气压', 0.034, 0.0085); group.add(labIn);
    const flaskCard = tag('', 'cond');

    // ================= 状态 =================
    // 烧瓶没干燥：收集时通进去的氨和干燥烧瓶一样多（full × V0），但瓶壁的水先溶掉一部分，溶到平衡：
    //   已溶 D = 700 × 瓶壁的水 × 氨的分压比；瓶口敞着收集，瓶里气体总压 = 大气压，少了的由空气补上。
    const charge = (c) => {
      const Vw = c.wet ? WET : 0, Vg = V0 - Vw, nIn = c.full * V0, nN = nIn / (1 + (SOL * Vw) / Vg);
      return { Vw, nN, D: nIn - nN, nA: Vg - nN };
    };
    const fresh = (c = cond, ch = charge(c)) => ({
      demo: false, near: false, full: c.full, leak: c.leak, wet: c.wet,
      ind: 0, dCarry: null, dGrabY: 0, dripT: 0.3,
      fl: { piv: HOME.toArray(), rot: 0, drag: false, go: null }, mounted: false,
      clampOpen: false, bulbW: 1, squeeze: 0, squeezed: false,
      nN: ch.nN, nA: ch.nA, Vl: ch.Vw, Vind: 0, D: ch.D, beakV: BV0, Q: 0, P: 1, leakQ: 0, tubeQ: 0,
      started: false, redSeen: false, quietT: 0, waitT: 0, ended: false, said: {},
      t: 0, mountAt: null, openAt: null, sqAt: null, jetOn: false, dMoved: false,
    });
    S = fresh();

    const fCenter = (piv = V(...S.fl.piv), rot = S.fl.rot) => piv.clone().sub(V(0, PIV + (S.leak ? 0.004 : 0), 0).applyAxisAngle(V(0, 0, 1), rot));
    const toLocal = (wv) => group.worldToLocal(wv.clone());
    // 液面（group 坐标里的 y）：内腔点云里最低的 Vl/V0 那一部分
    let lvCache = { key: '', ys: null };
    const levelY = () => {
      if (S.Vl <= 0.01) return -1;
      const key = S.fl.piv.map((v) => v.toFixed(4)).join() + S.fl.rot.toFixed(3);
      if (lvCache.key !== key) { flask.updateMatrix(); lvCache = { key, ys: cloud.map((p) => p.clone().applyMatrix4(flask.matrix).y).sort((a, b) => a - b) }; }
      const k = Math.min(cloud.length - 1, Math.floor((cloud.length * S.Vl) / V0));
      return lvCache.ys[k];
    };
    // 溶液的颜色：已溶的氨 → 浓度 → pH → 酚酞
    const pHof = () => { const c = S.Vl > 0.01 ? S.D / VM / S.Vl : 0; return c > 1e-7 ? 14 + Math.log10(Math.sqrt(KB * c)) : 7; };
    const redOf = () => (S.Vl > 0.01 && S.ind > 0 ? clamp((pHof() - 8.2) / 1.6, 0, 1) * clamp((S.Vind / S.Vl) * 1.6, 0, 1) : 0);

    // ================= 操作 =================
    const overMouth = () => Math.hypot(dropper.position.x - BK.x, dropper.position.z - BK.z) < BRI - 0.006 && Math.abs(dropper.position.y - D_Y) < 0.003;
    // 烧瓶：手抓着球，烧瓶跟着手走；往铁架台那边移的时候跟着位置倒过来（绕球心转）。
    //   玻璃管、球不碰桌面；玻璃管末端在烧杯口外圈时要高过杯口，在杯口里面才能往下放；玻璃管插在水里时只能竖直上下
    const PL = () => PIV + (S.leak ? 0.004 : 0);
    const rotV = (x, y, r) => V(x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r));
    const rotAt = (cx) => { const u = clamp((0.175 - cx) / 0.055, 0, 1); return -Math.PI * u * u * (3 - 2 * u); };          // 球心 x：0.175 以右正放，0.12 以左倒置
    const endOf = (c, r) => c.clone().add(rotV(TX, TEND + (S.leak ? 0.004 : 0), r));          // 玻璃管末端
    const inMouth = (x) => Math.abs(x - BK.x) < BRI - 0.004;
    const seatY = () => MOUNT.y + PL();          // 装好时球心的高度
    const floorY = (cx, r) => {
      const e = rotV(TX, TEND + (S.leak ? 0.004 : 0), r), ex = cx + e.x;
      let y = Math.max(HOME.y - PIV, 0.005 - e.y);
      const d = Math.abs(ex - BK.x), rim = BK.y + BH + 0.004 - e.y;
      if (d < BR + 0.006) y = Math.max(y, inMouth(ex) ? seatY() : rim);
      else if (d < BR + 0.03) { const u = (BR + 0.03 - d) / 0.024; y = Math.max(y, y + (rim - y) * u * u * (3 - 2 * u)); }          // 靠近杯口外圈：连续地抬高，不跳
      return y;
    };
    // 手想把球心放到哪儿（玻璃管插在水里时只能竖直上下）：[x, y, 转角]
    const flaskWant = () => {
      const c = fCenter(), e = endOf(c, S.fl.rot), h = S.fl.hand || [c.x, c.y];
      const x = inMouth(e.x) && e.y < BK.y + BH + 0.002 ? MOUNT.x : clamp(h[0], -0.03, 0.22), r = rotAt(x);
      return [x, clamp(h[1], floorY(x, r), 0.47), r];
    };
    const setC = (cx, cy, r) => { const c = V(cx, cy); S.fl.rot = r; const pv = c.add(rotV(0, PL(), r)); S.fl.piv = [pv.x, pv.y, 0]; };
    const A = {
      dDrag(p) { if (p) S.dCarry = p.clone(); },
      dDrop() {
        S.dCarry = null;
        if (S.ind > 0 && !S.said.ind) { done('ind'); log('ind', [`向烧杯的水里滴入${S.ind} 滴酚酞溶液`, '水仍是<b>无色</b>', '水不显碱性，酚酞不变色']); status(`滴入了 ${S.ind} 滴酚酞溶液：烧杯里的水还是<b>无色</b>的。接着把<b>烧瓶</b>拖到铁架台上，倒置，让玻璃管插进烧杯的水里。`); }
      },
      drip() {
        sfx.clink({ freq: 2600, gain: 0.012 });
        dropsP.spawn({ p: dropper.position.clone().add(V(0, -0.0015, 0)), v: V(0, -0.06, 0), size: 0.0013, life: 1.5 });
        S.ind = Math.min(6, S.ind + 1);
        if (S.ind === 3) { done('ind'); log('ind', ['向烧杯的水里滴入几滴酚酞溶液', '水仍是<b>无色</b>', '水不显碱性，酚酞不变色']); status('滴入了几滴酚酞溶液：烧杯里的水还是<b>无色</b>的（少量就够了）。接着把<b>烧瓶</b>拖到铁架台上，倒置，让玻璃管插进烧杯的水里。'); }
      },
      // 松手：倒置了、玻璃管插进了烧杯的水里、瓶颈到了铁夹口（手放下去的）→ 铁夹夹住；别处 → 很快放回软木圈上（按烧瓶实际的位置判断）
      flaskDrop() {
        if (S.fl.f0 === frame && S.fl.hand) { const [x, y, r] = flaskWant(); setC(x, y, r); }          // 同一帧里按下又松开（qa 不用真鼠标时的拖放，人手做不到）：当作烧瓶已经拿到手指的地方
        const c = fCenter(), r = S.fl.rot, end = endOf(c, r), over = r < -Math.PI + 0.05 && Math.abs(end.x - BK.x) < BR;
        S.fl.go = over && c.y - seatY() < 0.012 ? 'mount' : 'home'; S.fl.hand = null;
        if (over && S.fl.go === 'home') status('烧瓶还没放下去：倒置后在烧杯上方<b>往下放</b>，玻璃管插进水里、瓶颈到铁夹口再松手。');
      },
      mounted() {
        S.mounted = true; S.mountAt = S.t; done('mount'); sfx.clink({ freq: 900, gain: 0.02 });
        log('mount', ['倒置烧瓶，玻璃管插入烧杯的水中', '烧瓶里看不出变化', '氨气是无色的']);
        status(S.clampOpen ? '烧瓶倒置好了，玻璃管插进了水里。弹簧夹已经开着——挤压<b>胶头滴管</b>，使水进入烧瓶。' : '烧瓶倒置好了，玻璃管插进了水里。接着点一下乳胶管上的<b>弹簧夹</b>，把它打开。');
      },
      clip() {
        S.clampOpen = !S.clampOpen; sfx.clink({ freq: 1500, gain: 0.02 });
        if (S.clampOpen) {
          done('open'); if (!S.started) S.openAt = S.t;
          if (S.mounted && !S.squeezed) status('弹簧夹打开了。现在挤压<b>胶头滴管</b>（点一下橡胶帽），使水进入烧瓶。');
          else if (!S.mounted && !S.said.openAir) { S.said.openAir = true; status('弹簧夹打开了——可烧瓶还没倒置，玻璃管口在空气里。'); }
        } else { bar.undo('open'); status(S.started && !S.ended ? '弹簧夹夹上了：烧杯里的水上不来，喷泉停在半路。再打开弹簧夹，接着看。' : '弹簧夹夹上了：乳胶管不通。'); }
      },
      squeeze() {
        if (S.squeeze > 0) return;
        S.squeeze = 0.6;
        if (S.bulbW <= 0) { status('滴管里的水已经挤完了。要再做一遍，在“更多”里点<b>全部重来</b>。'); return; }
        const w = S.bulbW; S.bulbW = 0; S.squeezed = true; S.sqAt = S.t; S.Vl += w; done('squeeze'); sfx.clink({ freq: 700, gain: 0.02 });
        // 喷出去的小水花（滴管尖朝瓶里）
        flask.updateMatrixWorld(true);
        const tip = toLocal(plug.localToWorld(V(DX, 0.044, 0))), dir = V(0, -1, 0).applyAxisAngle(V(0, 0, 1), S.fl.rot);
        for (let i = 0; i < 26; i++) squirt.spawn({ p: tip.clone(), v: dir.clone().multiplyScalar(0.25 + Math.random() * 0.25).add(V((Math.random() - 0.5) * 0.08, 0, (Math.random() - 0.5) * 0.08)), size: 0.0009, life: 0.8, g: true });
        if (!S.mounted) status(S.clampOpen ? '水挤进了烧瓶，可烧瓶还没倒置、玻璃管口在空气里，弹簧夹也开着：氨溶进水里，外面的<b>空气</b>就从玻璃管补了进去（看灰点）。' : '水挤进了烧瓶：氨溶进水里，瓶内压强减小——可烧瓶还没倒置，玻璃管也没插进烧杯的水里。');
        else if (!S.clampOpen) status('水挤进了烧瓶，氨溶进水里，瓶内压强减小（看箭头）——可<b>弹簧夹还夹着</b>，烧杯里的水上不来。打开弹簧夹试试。');
      },
      reset(keep = false) {
        if (bar.playing) bar.stop();
        if (!keep) { Object.assign(cond, DEF); W?.fullSeg.set(0); W?.leakSeg.set(0); W?.wetSeg.set(0); }
        S = fresh(); sync(); mic.close(); W?.tbl.clear();
        if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; if (keep) W.ui.relock({ full: false }); else W.ui.relock(); }
        bar.undo('ind', 'mount', 'open', 'squeeze', 'watch', 'why'); back();
        const fill = S.full > 0.9 ? '够充满干燥烧瓶' : S.full > 0.6 ? '约 3/4 瓶' : '约半瓶';
        status(`全部重新摆好了：${S.wet ? '烧瓶<b>没干燥</b>（瓶壁上有约 0.3 mL 水）' : '干燥的烧瓶'}；通入的氨气${fill}${S.wet ? '，先被瓶壁的水溶掉一部分' : ''}——瓶里的气体中氨约占 <b>${gasPct()}%</b>${gasPct() < 95 ? '，其余是空气' : ''}；橡胶塞${S.leak ? '<b>没塞紧</b>' : '塞紧了'}。`);
      },
      setCond(o) { Object.assign(cond, o); A.reset(true); },
    };
    const gasPct = () => Math.round((100 * S.nN) / Math.max(1e-6, S.nN + S.nA));
    const labText = () => (S.wet ? `没干燥·NH₃约${gasPct()}%` : S.full > 0.9 ? '充满 NH₃' : `NH₃约${gasPct()}%`);
    const sync = () => {
      setHomeLab(labText());
      dropsP.clear(); spray.clear(); squirt.clear(); bubs.clear(); DOTS.n.length = 0; DOTS.a.length = 0; lvCache.key = '';
      dropper.position.copy(bottle.tipHome); pose();
    };
    const pose = () => {
      const c = fCenter(); flask.position.copy(c); flask.rotation.set(0, 0, S.fl.rot);
      plug.position.y = S.leak ? 0.004 : 0;
    };
    sync();

    const drag = draggable(group, [
      // 拖动平面：按下去时滴管所在高度的水平面；记住抓的地方——按住先竖直提出滴瓶，再跟着手平移（不往镜头前面跳）
      { obj: dPick, plane: 'xz', get offset() { return S.dCarry ? S.dGrabY : dropper.position.y; }, keepOffset: true, anchor: dHand, hint: '酚酞溶液：拖到烧杯口上方，按住不放——一滴一滴地滴（少量即可）', onStart: () => { S.dGrabY = dropper.position.y; }, onDrag: (p) => A.dDrag(p), onEnd: () => A.dDrop() },          // 按住不动时滴管不动；手一动才提出滴瓶
      { obj: flaskPick, plane: 'xy', offset: 0, keepOffset: true, anchor: flask, enabled: () => !S.mounted && S.fl.go !== 'mount',
        hint: () => (S.mounted ? '' : '烧瓶：拖向铁架台，移过去时倒过来；在烧杯口上方往下放，玻璃管插进水里再松手'),
        onStart: (p) => { S.fl.drag = true; S.fl.go = null; S.fl.f0 = frame; S.fl.hand = p ? [p.x, p.y] : null; },
        onDrag: (p) => { if (p) S.fl.hand = [p.x, p.y]; },
        onEnd: () => { S.fl.drag = false; A.flaskDrop(); } },
    ], { tip: tag('', 'pill'), taps: [
      { obj: clipPick, hint: () => (S.clampOpen ? '弹簧夹：开着。点一下夹上' : '弹簧夹：点一下打开'), enabled: () => !S.fl.go && !S.fl.drag, onTap: () => A.clip() },
      { obj: bulbPick, hint: () => (S.bulbW > 0 ? '胶头滴管（预先吸入了水）：点一下挤压，使水进入烧瓶' : '胶头滴管：水已经挤完了'), enabled: () => !S.fl.go && !S.fl.drag, onTap: () => A.squeeze() },
    ] });
    const act = demoActs(drag, group);
    const mic = micro({ tag, look, back, group, scene: fountainScene(), at: () => fCenter().add(V(0, 0.02, 0)), btnAt: () => fCenter().add(V(0.058, 0.03, 0.01)), label: '钻进去看',
      state: () => ({ water: S.Vl > 0.05, gas: S.nN / V0, dis: S.D / V0, air: S.nA / V0, red: redOf() > 0.4,
        airPct: Math.round((100 * S.nA) / Math.max(1e-6, S.nN + S.nA)), inflow: S.Q > 0.3, clamp: S.clampOpen, mounted: S.mounted && !S.fl.go, leak: S.leak, ended: S.ended, dP: Math.max(0, (1 - S.P) * 101.3), need: S.need || 0 }), key: () => String(S.Vl > 0.05), bar: () => bar, scale: 0.007, lookD: [0.03, 0.6, 1], dist: 0.27 });          // 字幕按实际的压强、进水、弹簧夹写
    const overBk = () => V(BK.x + 0.016, D_Y, BK.z + 0.012);
    // 质检用：滴管拿到烧杯口上方，滴够 n 滴就松手
    const dripTo = (n) => { const me = S; A.dDrag(overBk()); const go = () => { if (S === me) { if (!me.dCarry) return; if (me.ind >= n) { A.dDrop(); return; } } requestAnimationFrame(go); }; requestAnimationFrame(go); };

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'ind', title: '滴入酚酞', todo: '把<b>酚酞溶液</b>的滴管拖到烧杯口上方，按住，往烧杯的水里滴入少量（几滴），松手放回。', target: () => (S.dCarry ? null : dropper) },
        { id: 'mount', title: '倒置烧瓶', todo: '把<b>烧瓶</b>拖向铁架台，移过去时倒过来；在烧杯口上方往下放，玻璃管插入烧杯的水中、瓶颈到铁夹口时松手。', target: () => (S.fl.go || S.fl.drag ? null : flask) },
        { id: 'open', title: '打开弹簧夹', todo: '点一下乳胶管上的<b>弹簧夹</b>，把它打开。', target: () => clip },
        { id: 'squeeze', title: '挤压胶头滴管', todo: '点一下<b>胶头滴管</b>的橡胶帽：挤压，使水进入烧瓶。', target: () => bulb },
        { id: 'watch', title: '观察', todo: '观察烧瓶里的现象：水怎样进来？颜色怎样？也可以<b>钻进去看</b>。', target: () => null },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh: () => fresh(DEF), bar: () => bar, apply: () => { sync(); mic.close(); },          // 演示前开着的钻进去看，演示完再打开（从水进来那一刻演到现在的进度）
            view: { save: () => (mic.isOpen ? { mic: true } : null), restore: (v) => { if (v.mic) mic.open(); } } }),
          shots: [
            { cap: '向烧杯的水里滴入少量酚酞溶液：水仍是无色。', dur: 6, cam: [[0.05, 0.12, 0.04], [0.05, 0.3, 1], 0.42], during: act.drag(dPick, overBk, { t0: 0.05, t1: 0.3, release: 0.95, until: () => S.ind >= 3 }) },
            { cap: '烧瓶里充满了氨气（绿点是氨分子，示意）。倒置烧瓶，使玻璃管插入烧杯的水中。', dur: 8, during: act.path(flaskPick, [() => flask.position.clone(), V(0.19, 0.2, 0), V(0.1, 0.44, 0), V(0.004, 0.44, 0), V(0, 0.335, 0)], { t0: 0.05, t1: 0.45, release: 0.5 }) },
            { cap: '打开弹簧夹。', dur: 3, cam: [[0, 0.16, 0], [0.06, 0.2, 1], 0.3], during: act.tap(clipPick, 0.35) },
            { cap: '挤压胶头滴管，使水进入烧瓶：少量水先溶解一部分氨，瓶内压强下降，烧杯里的水被压进烧瓶、继续溶解氨，形成喷泉，溶液变红。', dur: 12, cam: [[0, 0.285, 0.01], [0.06, 0.14, 1], 0.5], during: act.tap(bulbPick, 0.08) },
            { cap: '钻进去看：氨分子溶进水里，和水结合成一水合氨，一小部分电离出 OH⁻。演示完了，换你自己做。', dur: 19, cam: [[0, 0.4, 0], [0.03, 0.6, 1], 0.27], enter: () => mic.open(true), during: act.at(0.98, () => mic.close()) },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ================= 每一帧 =================
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3(), tmp = new THREE.Vector3();
    const stepDots = (list, mesh, want, dt, lvl, t) => {
      flask.updateMatrix();
      const alive = list.filter((d) => !d.die);
      const above = (p) => tmp.copy(p).applyMatrix4(flask.matrix).y > lvl + 0.002;
      const pick = () => { for (let k = 0; k < 30; k++) { const p = inner[(Math.random() * inner.length) | 0]; if (lvl < 0 || above(p)) return p.clone(); } return null; };
      if (alive.length < want) { const p = pick(); if (p) list.push({ p, to: pick() || p.clone(), die: 0, s: 1 }); }
      else if (alive.length > want) {      // 溶掉的：最靠近液面（最低）的那个点落下去、变小、消失
        let best = null, by = 1e9; for (const d of alive) { const y = tmp.copy(d.p).applyMatrix4(flask.matrix).y; if (y < by) { by = y; best = d; } }
        if (best) best.die = 0.001;
      }
      let n = 0;
      for (let i = list.length - 1; i >= 0; i--) {
        const d = list[i];
        if (d.die) { d.die += dt; d.s = Math.max(0, 1 - d.die / 0.5); if (d.s <= 0) { list.splice(i, 1); continue; } }
        else {
          if (lvl >= 0 && !above(d.p)) { const p = pick(); if (p) { d.p.copy(p); d.to = pick() || p.clone(); } }
          const g = d.to.clone().sub(d.p), L = g.length();
          if (L < 0.002 || (lvl >= 0 && !above(d.to))) d.to = pick() || d.p.clone(); else d.p.addScaledVector(g, Math.min(1, (0.012 * dt) / L));
        }
      }
      for (const d of list) { if (n >= NDOT) break; p4(d.p); s4.setScalar(d.s); m4.compose(tmp, q4, s4); mesh.setMatrixAt(n++, m4); }
      mesh.count = n; mesh.instanceMatrix.needsUpdate = true;
    };
    const p4 = (p) => tmp.copy(p).applyMatrix4(flask.matrix);

    let frame = 0;
    const step = (dt, t) => {
      S.t += dt; frame++;
      // ---- 酚酞的滴管：一直竖着；拿起来先竖直提出滴瓶，再横着移到烧杯口上方；松手插回原滴瓶 ----
      if (S.dCarry) {
        const inBottle = Math.hypot(dropper.position.x - bottle.tipHome.x, dropper.position.z - bottle.tipHome.z) < 0.004 && dropper.position.y < D_Y - 0.002;
        let to = V(clamp(S.dCarry.x, -0.2, 0.26), D_Y, clamp(S.dCarry.z, -0.2, 0.25));
        if (S.mounted || S.fl.go) { const dx = to.x - TX, dz = to.z, r = Math.hypot(dx, dz); if (r < 0.01) { const k = 0.01 / Math.max(r, 1e-4); to.x = TX + (r > 1e-4 ? dx * k : 0.01); to.z = r > 1e-4 ? dz * k : 0; } }
        dropper.position.lerp(inBottle ? V(bottle.tipHome.x, D_Y, bottle.tipHome.z) : to, 0.4);
      } else homeLift(dropper, bottle.tipHome, 0.25);
      if (S.dCarry) dHand.position.set(S.dCarry.x, S.dGrabY, S.dCarry.z); else dHand.position.copy(dropper.position);
      if (S.dCarry && overMouth()) { S.dripT += dt; while (S.dripT > 0.4) { S.dripT -= 0.4; A.drip(); } } else S.dripT = 0.3;
      const bLevel = BK.y + LV(S.beakV);
      dropsP.update(dt, (p, d) => { p.p.addScaledVector(p.v, d); p.v.y -= 2 * d; return p.p.y > bLevel; });

      // ---- 烧瓶：拿着 / 自己走（抬起来 → 倒过来 → 挪过去 → 放下）----
      const F = S.fl;
      if (F.drag) {          // 拿着：很快跟到手的位置（转角跟着 x 走；不碰桌面、杯口）
        const c = fCenter(), [tx, ty] = flaskWant(), k = 1 - Math.exp(-dt * 30), x = c.x + (tx - c.x) * k, r = rotAt(x);
        setC(x, Math.max(floorY(x, r), c.y + (ty - c.y) * k), r);
      } else if (F.go) {
        // 松手后：夹进铁夹 → 先平移到铁夹正上方，再竖直放下去；放回 → 先平移到软木圈上方（跟着位置正过来，不低于现在的高度），再放下去
        const c = fCenter(), k = 1 - Math.exp(-dt * 16);
        if (F.go === 'mount') {
          const far = Math.abs(c.x - MOUNT.x) > 0.002, x = far ? c.x + (MOUNT.x - c.x) * k : MOUNT.x, r = rotAt(x);
          setC(x, far ? Math.max(floorY(x, r), c.y) : c.y + (seatY() - c.y) * k, r);
          if (!far && Math.abs(fCenter().y - seatY()) < 0.0006) { setC(MOUNT.x, seatY(), -Math.PI); F.go = null; A.mounted(); }
        } else {
          const hx = HOME.x, hy = HOME.y - PIV, far = Math.abs(c.x - hx) > 0.002, x = far ? c.x + (hx - c.x) * k : hx, r = rotAt(x);
          setC(x, Math.max(floorY(x, r), far ? c.y : c.y + (hy - c.y) * k), r);
          if (!far && Math.abs(fCenter().y - hy) < 0.0006) { setC(hx, hy, 0); F.go = null; }
        }
      }
      pose();
      // 铁夹：烧瓶放进去以后夹紧
      const jawOpen = S.mounted && !F.go ? 0 : 0.006;
      for (const j of jaws) j.position.z += (j.s * jawOpen - j.position.z) * Math.min(1, dt * 8);
      // 弹簧夹：开 / 关
      const co = S.clampOpen ? 1 : 0;
      jawF.position.set(0, 0, 0.0047 + 0.0028 * co); jawB.position.set(0, 0, -0.0047 - 0.0028 * co);
      armF.position.set(0.0055, 0.0085, 0.0047 + 0.0028 * co - 0.003 * co); armF.rotation.z = -0.9; armB.position.set(0.0055, 0.0085, -0.0047 - 0.0028 * co + 0.003 * co); armB.rotation.z = -0.9;
      // 胶头滴管：挤一下
      if (S.squeeze > 0) S.squeeze = Math.max(0, S.squeeze - dt);
      const sq = S.squeeze > 0 ? Math.sin((Math.PI * (0.6 - S.squeeze)) / 0.6) : 0;
      bulb.scale.set(1 - 0.45 * sq, 1.5 - 0.2 * sq, 1 - 0.45 * sq);
      dWater.visible = S.bulbW > 0;

      // ---- 化学和压强（每帧分 4 小步算：进水、回流都按这一刻的压强差，停下来时正好压强差 = 液柱的压强）----
      flask.updateMatrixWorld(true);
      const tipY = toLocal(plug.localToWorld(V(TX, TIP, 0))).y;
      const outInWater = S.mounted && !F.go && bLevel > BK.y + 0.006 + 0.002;
      let lvl = levelY(), Q = 0, pN = 0;
      const NS = 4, hs = dt / NS;
      for (let i = 0; i < NS; i++) {
        const Vg = Math.max(0.5, V0 - S.Vl); pN = S.nN / Vg; S.P = pN + S.nA / Vg;
        lvl = levelY();
        let q = 0;
        if (S.clampOpen && outInWater) {
          const head = Math.max(tipY, lvl) - bLevel, dP = (1 - S.P) * P0 - RHO * G * head;
          if (dP > 0 && S.Vl < V0 - 0.4) q = CD * A_T * Math.sqrt((2 * dP) / RHO) * 1e6;          // mL/s
          else if (dP < 0 && lvl > tipY + 0.001 && S.Vl > 0.05) q = -CD * A_T * Math.sqrt((-2 * dP) / RHO) * 1e6;          // 压强差撑不住液柱：瓶里的溶液往回流
        }
        q = clamp(q, -S.Vl / Math.max(hs, 1e-4), Math.max(0, (V0 - 0.4 - S.Vl) / Math.max(hs, 1e-4)));
        // 溶解
        if (S.Vl > 0.01 && S.nN > 0) {
          const K = 30 * Math.min(1, S.Vl) + 10 * Math.max(0, q);
          const r = clamp(K * (pN - S.D / (SOL * S.Vl)), 0, S.nN / Math.max(hs, 1e-4));
          S.nN -= r * hs; S.D += r * hs;
        }
        // 空气补进来：塞子边漏气；或者玻璃管口在空气里、弹簧夹开着
        S.leakQ = S.leak ? 2500 * Math.max(0, 1 - S.P) : 0;
        S.tubeQ = S.clampOpen && !S.mounted ? 3000 * Math.max(0, 1 - S.P) : 0;
        S.nA += (S.leakQ + S.tubeQ) * hs;
        if (q < 0) { const f = Math.min(1, (-q * hs) / Math.max(S.Vl, 1e-6)); S.D -= S.D * f; S.Vind -= S.Vind * f; }          // 流回去的溶液带走溶在里面的氨
        S.Vl += q * hs; S.beakV -= q * hs; if (S.ind > 0 && q > 0) S.Vind += q * hs;
        Q += q / NS;
      }
      { const Vg = Math.max(0.5, V0 - S.Vl); pN = S.nN / Vg; S.P = pN + S.nA / Vg; lvl = levelY(); }          // 卡片、画面都用这一刻的量
      S.need = (RHO * G * Math.max(0, Math.max(tipY, lvl) - bLevel)) / 1000;          // 顶起玻璃管里的液柱要多大的压强差（kPa）
      S.Q = Q;

      // ---- 记录 ----
      if (!S.started && Q > 3) {
        S.started = true;
        // “做了什么”按实际的先后写（倒置、开夹、挤水哪个先、隔了多久）
        const acts = [['倒置烧瓶、玻璃管插进水里', S.mountAt], ['打开弹簧夹', S.openAt], ['挤压胶头滴管', S.sqAt]].filter((a) => a[1] != null).sort((a, b) => a[1] - b[1]);
        const usual = acts.map((a) => a[0]).join() === '倒置烧瓶、玻璃管插进水里,打开弹簧夹,挤压胶头滴管';
        const how = usual ? '打开弹簧夹，挤压胶头滴管' : acts.map((a, i) => (i ? `${a[1] - acts[i - 1][1] > 3 ? `过了约 ${Math.round(a[1] - acts[i - 1][1])} 秒，` : ''}再${a[0]}` : `先${a[0]}`)).join('，');
        log('fountain', [how, '烧杯里的水沿玻璃管<b>喷入烧瓶</b>，形成<b>喷泉</b>', '少量水先溶解一部分氨，瓶内压强下降，外面的大气压把水压进烧瓶；进来的水继续溶解氨']);
        status('形成了<b>喷泉</b>！看瓶里的绿点（氨分子）和箭头（压强）。');
      }
      const red = redOf();
      if (S.started && S.Vl > 30) {
        if (S.ind > 0 && red > 0.5) { S.redSeen = true; log('red', ['喷进烧瓶的水', '溶液变成<b>红色</b>', '氨的水溶液显<b>碱性</b>']); }
        else if (!S.ind) log('red', ['喷进烧瓶的水', '溶液<b>无色</b>', '烧杯的水里没有滴酚酞，看不出酸碱性']);
      }
      if (S.started && !S.ended && S.clampOpen && outInWater) {          // 自己停下来的才算结束（中途夹上弹簧夹只是暂停）
        S.quietT = Math.abs(Q) < 0.5 ? S.quietT + dt : 0;
        if (S.quietT > 1.2) {
          S.ended = true; const pct = Math.round((100 * S.Vl) / V0);
          log('end', ['喷泉停下来', `溶液约占烧瓶的 <b>${pct}%</b>`, pct > 90 ? '瓶里的氨几乎全溶进了水里' : S.leak ? '漏气：空气补进瓶里，占了位置' : S.wet ? '烧瓶没干燥：一部分氨先被瓶壁的水溶掉，瓶里氨少、空气多；空气的主要成分在水里溶解度很小，占了位置' : '瓶里混有空气：空气的主要成分在水里溶解度很小，占了位置']);
          if (!S.demo) {
            done('watch'); if (W) W.next.hidden = false;
            status(pct > 90 ? `喷泉停了：水几乎充满烧瓶（约 ${pct}%）。瓶里的氨几乎全溶进了水里。在左边想一想。` : `喷泉停了：水只进了约 ${pct}% 的烧瓶——剩下的主要是空气（空气的主要成分在水里溶解度很小）。${S.wet ? '烧瓶没干燥，瓶里的氨本来就少了。可以在“换个条件再试”里换一个干燥的烧瓶重做。' : ''}`);
            if (bar.has('watch')) W?.t1.open();
          }
        }
      }
      if (S.squeezed && !S.started && S.mounted && S.clampOpen) {
        S.waitT += dt;
        if (S.waitT > 4 && !S.said.nofount) {
          S.said.nofount = true;
          const dPk = Math.max(0, (1 - S.P) * 101.3), need = (RHO * G * Math.max(0, Math.max(tipY, lvl) - bLevel)) / 1000;
          if (S.leak) { log('leak', ['挤压胶头滴管', '<b>没有喷泉</b>', `塞子没塞紧（漏气）：空气钻进去补上，瓶内只比外面低约 ${dPk.toFixed(1)} kPa，顶不起玻璃管里约 ${need.toFixed(1)} kPa 的液柱`]); status(`没有形成喷泉：橡胶塞<b>没塞紧</b>，外面的空气从塞子边钻进去（看灰点），瓶内只比外面低约 ${dPk.toFixed(1)} kPa，顶不起玻璃管里的液柱（要约 ${need.toFixed(1)} kPa）。在“换个条件再试”里改回塞紧。`); }
          else if (S.nA > 0.6 * V0) status('没有形成喷泉：瓶里已经大半是空气了（灰点），空气的主要成分在水里溶解度很小。在“更多”里点<b>全部重来</b>。');
        }
      } else S.waitT = 0;
      if (S.started && !S.ended && (!S.clampOpen || !outInWater)) S.quietT = 0;

      // ---- 画面：液体、水柱、喷泉、水花、气泡、气体的点、箭头 ----
      const liqCol = new THREE.Color(CLEAR).lerp(new THREE.Color(PINK), red);
      liqMat.color.copy(liqCol); surf.material.color.copy(liqCol);
      const wl = group.localToWorld(V(0, Math.max(lvl, -1), 0)).y;
      cut.constant = S.Vl > 0.01 ? wl : -1e3;
      flask.liq.visible = S.Vl > 0.01;
      if (S.Vl > 0.01) {
        const c = flask.position, up = Math.cos(F.rot), yl = (lvl - c.y) / (Math.abs(up) > 0.3 ? up : 1);
        const r = yl >= Y0I ? NRI : Math.sqrt(Math.max(1e-8, RI * RI - yl * yl));
        surf.visible = Math.abs(up) > 0.8 && S.Vl < V0 - 1; surf.position.set(c.x + Math.sin(-F.rot) * yl, lvl, c.z); surf.scale.setScalar(r * 0.995);
      } else surf.visible = false;
      // 玻璃管里的水：外面那段（烧杯水面以下，或喷的时候整根）
      const tubeFull = S.mounted && !F.go && S.clampOpen && (S.started || Q > 0);
      const flipped = Math.cos(F.rot) < 0;
      if (S.mounted && !F.go && flipped) {
        const yTopLocal = tubeFull ? 0.2 : clamp(flask.position.y - (S.leak ? 0.004 : 0) - bLevel, 0.2, TEND);     // 倒过来：局部 y = 球心高度 − 世界高度
        lowCol.visible = true; lowCol.position.set(TX, yTopLocal, 0); lowCol.scale.set(1, Math.max(0.0005, TEND - yTopLocal), 1);
      } else lowCol.visible = false;
      const jetRed = S.ind > 0 ? Math.max(clamp(pN * 5, 0, 1), red * 0.7) : 0;
      const jc = new THREE.Color(CLEAR).lerp(new THREE.Color(PINK), jetRed);
      upColMat.color.set(CLEAR); jetMat.color.copy(jc); sprayMat.color.copy(jc);          // 玻璃管里的还是烧杯里的水（无色）；碰到瓶里的氨才变红
      upCol.visible = tubeFull; if (tubeFull) { upCol.position.set(TX, TIP, 0); upCol.scale.set(1, 0.13 - TIP, 1); }
      // 喷泉：从玻璃管口往上喷到瓶顶，水花落下来
      const tipW = toLocal(plug.localToWorld(V(TX, TIP, 0)));
      // 喷柱多高按出口速度算：v = 流量 ÷ 管截面，最多升 v²/2g（到瓶顶为止）；管口淹在溶液里就没有露出来的喷柱，只是继续进液
      const vOut = Math.max(0, Q) * 1e-6 / A_T, topY = flask.position.y + Math.sqrt(RI * RI - TX * TX) - 0.001, jetH = Math.min(topY - tipW.y, (vOut * vOut) / (2 * G));
      S.jetOn = Q > 0.3 && flipped && lvl < tipW.y - 0.001 && jetH > 0.003;
      if (S.jetOn) {
        const L = jetH, rr = 0.0009 + 0.0011 * Math.sqrt(Math.min(1, Q / 50)), apex = tipW.y + L, hitTop = apex >= topY - 0.0005;
        jet.visible = true; jet.position.copy(tipW); jet.scale.set(rr, L, rr);
        const nS = Math.min(12, Q * dt * 6 + Math.random());
        for (let i = 0; i < nS; i++) { const a = Math.random() * 6.28, sp = (hitTop ? 0.05 : 0.02) + Math.random() * (hitTop ? 0.12 : 0.04); spray.spawn({ p: V(tipW.x, apex - 0.002, 0), v: V(Math.cos(a) * sp, hitTop ? -0.02 : 0.01, Math.sin(a) * sp), size: 0.0007 + Math.random() * 0.0007, life: 1.4, g: true }); }
      } else jet.visible = false;
      const fc = flask.position;
      squirt.update(dt, (p, d) => { if (p.g) p.v.y -= 3.2 * d; p.p.addScaledVector(p.v, d); const rel = p.p.clone().sub(flask.position); if (rel.length() > RI - 0.0012 && Math.abs(rel.y) < Y0I) p.v.multiplyScalar(0.3); return lvl < 0 || p.p.y > lvl; });
      spray.update(dt, (p, d) => {
        if (p.g) p.v.y -= 3.2 * d;
        p.p.addScaledVector(p.v, d);
        const rel = p.p.clone().sub(fc), L = rel.length();
        if (L > RI - 0.0012 && Math.abs(rel.y) < Y0I) { rel.multiplyScalar((RI - 0.0012) / L); p.p.copy(fc).add(rel); p.v.multiplyScalar(0.3); p.v.y = Math.min(p.v.y, -0.05); }      // 碰到瓶壁顺着流下
        return lvl < 0 || p.p.y > lvl;
      });
      // 漏进来的空气：从塞子边的缝里冒出来，穿过瓶底（倒过来时在下面）的液体往上
      if (S.leakQ > 0.5 && S.Vl > 0.05 && flipped) {
        const n = Math.min(4, S.leakQ * dt * 0.8 + (Math.random() < 0.3 ? 1 : 0));
        for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, base = toLocal(plug.localToWorld(V(Math.cos(a) * 0.0095, PLUG0, Math.sin(a) * 0.0095))); bubs.spawn({ p: base, v: V(0, 0.05 + Math.random() * 0.04, 0), size: 0.0008 + Math.random() * 0.0008, life: 3 }); }
      }
      bubs.update(dt, (p, d) => { p.p.addScaledVector(p.v, d); return lvl >= 0 && p.p.y < lvl - 0.0005; });
      // 气体的点
      stepDots(DOTS.n, dotsN, Math.round((NDOT * S.nN) / V0), dt, lvl, t);
      stepDots(DOTS.a, dotsA, Math.min(NDOT, Math.round((NDOT * S.nA) / V0)), dt, lvl, t);
      // 箭头：装好以后才画
      const showP = S.mounted && !F.go;
      for (const a of outArrows) { a.visible = showP; if (showP) a.set(V(a.userData.x, bLevel + 0.024, a.userData.z), V(0, -0.02, 0)); }
      inArrows.forEach((a) => {
        const d = a.userData.d, from = fc.clone().addScaledVector(d, 0.012), len = 0.02 * clamp(S.P, 0, 1.05);
        const ok = showP && from.y > lvl + 0.003 && len > 0.0015; a.visible = ok;
        if (ok) a.set(from, d.clone().multiplyScalar(len));
      });
      labOut.visible = showP; labOut.position.set(BK.x + 0.058, bLevel + 0.012, 0.02);
      labIn.visible = inArrows.some((a) => a.visible); labIn.position.set(fc.x + 0.066, fc.y + 0.012, 0.01);
      homeLab.visible = !S.mounted && !F.go;
      // 观察卡：烧瓶装好以后，写看得到的现象和模型算的进液比例、瓶内外压强差
      if (S.mounted && !F.go) {
        // 照初中的卡片：名字 + 现象词（喷泉 / 颜色），一行数字，图例；压强差怎么算写在面板里，氨的占比在烧瓶的标签上
        const pct = Math.round((100 * S.Vl) / V0), dP = 101.3 - S.P * 101.3, isRed = S.Vl >= 2 && red > 0.5;
        const stamp = S.jetOn ? `<span class="cc-res">${isRed ? '红色喷泉' : '喷泉'}</span>` : Q > 0.3 ? `<span class="cc-res">${isRed ? '红色 · 继续进液' : '继续进液'}</span>` : S.leakQ > 0.5 ? '<span class="cc-res burn">漏气</span>' : S.Vl >= 2 ? `<span class="cc-res${isRed ? ' burn' : ''}">${isRed ? '红色' : '无色'}</span>` : '';
        flaskCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">烧瓶里</span>${stamp}</div><div class="cc-more"><div class="cc-obs"><b>${pct}</b><small>% 是液体</small><b>${Math.max(0, dP).toFixed(dP < 10 ? 1 : 0)}</b><small>kPa 压强差（约）</small></div><div class="cc-note">绿点 = 氨，灰点 = 空气（示意）</div></div></div>`)
          .loc(group, 0.2, 0.25, 0.01).show(!bar.playing && !mic.isOpen);
      } else flaskCard.show(false);
      beaker.setLevel(LV(S.beakV));
      mic.update?.(dt);
    };

    return {
      group: root, pointer, card: false, toggles: ['cards', 'steps'],
      size: { w: 0.32, d: 0.15, h: 0.44 },
      view: { elev: 13, azim: -10, lookY: 0.45, frameMargin: 1.2 },
      mount(ui) {
        const ctx = () => { const pct = Math.round((100 * S.Vl) / V0); return `<div>${S.started ? `挤进约 1 mL 水以后，烧杯里的水<b>喷进了烧瓶</b>，最后约占烧瓶的 ${pct}%` : '还没有形成喷泉'}</div><div>${S.ind ? (redOf() > 0.5 ? '瓶里的溶液是<b>红色</b>的（烧杯的水里滴了酚酞）' : '瓶里的溶液还没变红') : '烧杯的水里没有滴酚酞'}</div>`; };
        const t2 = think({ q: '喷进烧瓶的溶液变红，说明什么？', ctx, options: ['氨的水溶液显碱性', '氨的水溶液显酸性', '酚酞遇水就变红'], wrong: ['酚酞遇酸性溶液不变色；变红的是碱性溶液。', '烧杯里的水滴了酚酞，可它一直是无色的。'], ok: '对：氨溶于水生成一水合氨，一水合氨中有一小部分电离出 NH₄⁺ 和 OH⁻，氨的水溶液显弱碱性（课本第 14 页）。', status: (m) => W?.status(m), onOk: () => done('why') });
        const t1 = think({ q: '只挤进去约 1 mL 水，为什么烧杯里的水会喷进烧瓶？', ctx, options: ['氨极易溶于水：少量水先溶解一部分氨，瓶内压强下降，外面的大气压把烧杯里的水压进烧瓶，进来的水继续溶解氨', '氨和水反应放出大量气体，把水推了上去', '挤压滴管的力把烧杯里的水推了上去'], wrong: ['看看绿点和箭头：瓶里的气体是变少了，不是变多了。', '滴管只把它自己里面那一点水挤进了烧瓶；烧杯里的水是后来被压进去的。'], ok: '对：常温常压下 1 体积水大约可溶解 700 体积氨（课本第 14 页）。挤进去的少量水先溶解一部分氨，瓶内压强下降；烧杯里的水被压进来以后继续溶解氨，越喷越多，形成喷泉。', status: (m) => W?.status(m), onOk: () => { done('why'); if (S.redSeen) t2.open(); else W?.status('对：1 体积水大约可溶解 700 体积氨（课本第 14 页），进来的水不断溶解氨，形成喷泉。不过这一次烧杯的水里<b>没有滴酚酞</b>，喷进来的溶液是无色的，看不出它的酸碱性。点“更多”里的<b>全部重来</b>，先往烧杯的水里滴几滴酚酞，再做一遍。'); } });
        const wetSeg = seg('烧瓶', ['干燥', '没干燥（瓶壁有水）'], (v, i) => A.setCond({ wet: i === 1 }), { value: 0 });
        const fullSeg = seg('收集时通入的氨气', ['够充满', '约 3/4 瓶', '约半瓶'], (v, i) => A.setCond({ full: [FULL, 0.75, 0.5][i] }), { value: 0 });
        const leakSeg = seg('橡胶塞', ['塞紧', '没塞紧'], (v, i) => A.setCond({ leak: i === 1 }), { value: 0 });
        const vary = varyBox('课本要求：<b>干燥</b>的圆底烧瓶里<b>充满</b>氨气，橡胶塞<b>塞紧</b>瓶口。换个条件试试（选了以后器材重新摆好、记录清空）：', wetSeg, fullSeg, leakSeg);
        const more = moreBox([['钻进去看', () => mic.open()]], () => A.reset(false));
        const note = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'), h('p', { class: 'fineprint', html: `烧瓶内容积约 ${Math.round(V0)} mL，20 ℃、101.3 kPa；“充满”按氨气占 98% 计（收集的氨气里总混有少量空气，示意）。胶头滴管里预先吸入约 1 mL 水；烧杯里 380 mL 水。<br>溶解度用课本数据：常温常压下 1 体积水大约可溶解 700 体积氨。溶解的快慢是示意值（有水时几秒内溶完，喷泉的水花接触面大、溶得更快）。<br>瓶内压强按瓶里剩下的气体算（等温），卡片上的压强差 = 外面的大气压 101.3 kPa − 瓶内压强；进水的快慢按瓶内外压强差减去液柱的压强算（玻璃管内径 4 mm，管道阻力用一个示意系数），所以先快后慢；空气的主要成分（N₂、O₂）在水里溶解度很小，本模型忽略空气的少量溶解，所以喷泉停下时水只能充满瓶里空气以外的部分。<br>烧瓶没干燥（示意）：瓶壁上按约 0.3 mL 水计；收集时通进去的氨和干燥烧瓶一样多（同样的收集时间），但先被瓶壁的水溶到平衡（已溶的氨 = 700 × 水的体积 × 氨的分压比），瓶口敞着收集，少了的气体由空气补上——算下来瓶里的氨只剩约一半多，空气占四成多，喷泉弱。<br>漏气、玻璃管口在空气里时空气补进来的快慢是示意值。溶液的颜色：已溶的氨按 24.0 L/mol 换成浓度，[OH⁻] = √(Kb·c)、Kb = 1.8×10⁻⁵，酚酞在 pH 约 8.2 以上变红；挤进去的那点水里没有酚酞。<br>绿点表示氨分子、灰点表示空气（示意）；箭头的长短表示大气压和瓶内气体的压强（示意）。` }));
        const base = mountXuean(ui, { controls: [vary, more, note], headers: ['做了什么', '现象', '说明'], intro: '右边软木圈上是充满氨气的干燥圆底烧瓶，橡胶塞上插着玻璃管和胶头滴管（预先吸入了水），乳胶管用弹簧夹夹着。铁架台上的烧杯里是水。' });
        ui.data.append(base.next, t1.el, t2.el);
        W = { ...base, ui, t1, t2, status: ui.status, fullSeg, leakSeg, wetSeg }; bar.attach(ui);
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { bar.dispose(); drag.dispose(); mic.dispose?.(); },
      debug: {
        get S() { return S; }, bar, A, V0, cond,
        picks: { dropper: dPick, flask: flaskPick, clip: clipPick, bulb: bulbPick },
        qa: qaFlow(drag, [
          { name: '拿起酚酞', hold: dPick },
          { name: '滴酚酞', run: () => dripTo(3), wait: 2 },
          { name: '放下酚酞', release: dPick, wait: 0.5 },
          { name: '倒置烧瓶', drag: flaskPick, to: () => V(0, 0.334, 0), wait: 6 },
          { name: '打开弹簧夹', tap: clipPick, wait: 1 },
          { name: '挤压滴管', tap: bulbPick, wait: 3, scale: 1 },
          { name: '喷泉', run: () => {}, wait: 8 },
          { name: '钻进去看', run: () => mic.open(), wait: 17 },
          { name: '合上', run: () => mic.close(), wait: 1 },
          { name: '核对', run: () => { if (!(S.started && S.ended && S.Vl > 0.9 * V0 && redOf() > 0.8)) throw new Error(JSON.stringify({ started: S.started, ended: S.ended, Vl: S.Vl, red: redOf(), P: S.P, nN: S.nN, nA: S.nA })); }, wait: 1 },
          { name: '想一想 1', run: () => W.t1.el.querySelector('button').click() },
          { name: '想一想 2', run: () => W.t2.el.querySelector('button').click() },
        ]),
      },
    };
  },
};
