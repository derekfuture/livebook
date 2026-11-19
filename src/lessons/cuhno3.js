// 人教版高中化学必修第二册第 15 页【实验5-8】（图5-14 硝酸与铜反应）：在橡胶塞侧面挖一个凹槽，并嵌入下端卷成螺旋状的铜丝。
//   向两支具支试管中分别加入 2 mL 浓硝酸和稀硝酸，用橡胶塞塞住试管口，使铜丝与硝酸接触，观察并比较实验现象。向上拉铜丝，终止反应。
//   注意：硝酸具有腐蚀性和挥发性，使用时须注意防护和通风！（课本没有写加热：这里不加热）
// 课本：硝酸具有很强的氧化性，硝酸的浓度不同，与金属反应的产物也不同。
//   4HNO₃(浓) + Cu ══ Cu(NO₃)₂ + 2NO₂↑ + 2H₂O；8HNO₃(稀) + 3Cu ══ 3Cu(NO₃)₂ + 2NO↑ + 4H₂O
// 照图5-14 搭：具支试管竖直放在试管架上，侧管经乳胶管接到导管，导管伸进烧杯里的 NaOH 溶液；铜丝从橡胶塞侧面的凹槽穿过，可以上下抽动。
//   两套并排：中间两支试管（左浓、右稀）挨着比较，侧管各朝外，通到两边的烧杯。
// 模型（示意，界面上写明）：
//   浓硝酸 65%（1.40 g/mL）= 14.4 mol/L，2 mL = 28.9 mmol；稀硝酸取 4 mol/L（课本没写浓度），2 mL = 8 mmol。铜丝螺旋约 0.5 g（7.9 mmol）。
//   速率 r = 1.4×10⁻³ mmol/s × c(HNO₃, mol/L) × 浸在酸里的比例（示意，与浓度成正比）。铜丝推到底时螺旋约八成浸在酸里：
//     开始时浓 ≈ 0.016 mmol Cu/s（按方程式生成 NO₂ 约 0.8 mL/s），稀 ≈ 0.0045 mmol Cu/s（NO 约 0.07 mL/s）（实际时间）。
//   产物随浓度变（一定量的浓硝酸与足量铜反应得到 NO₂ 和 NO 的混合气体）：c ≥ 12 mol/L 全按浓的方程式，c ≤ 6 mol/L 全按稀的方程式，中间线性过渡（示意）。
//     按方程式：浓——每 1 mmol Cu 消耗 4 mmol HNO₃、生成 2 mmol NO₂；稀——每 1 mmol Cu 消耗 8/3 mmol HNO₃、生成 2/3 mmol NO。25 ℃ 每 mmol 气体 24.5 mL。
//   试管上部的气体空间约 27 mL，开始是空气（O₂ 21%）。2NO + O₂ → 2NO₂ 按三级反应算：−d[O₂]/dt = k'[NO]²[O₂]，k' ≈ 7.1×10³ L²·mol⁻²·s⁻¹
//     （IUPAC NOx23：298 K 时 k = 3.95×10⁻³⁸ cm⁶·分子⁻²·s⁻¹，按 d[NO₂]/dt 定义，≈ 1.43×10⁴ L²·mol⁻²·s⁻¹；O₂ 的消耗折半）。
//   稀硝酸那支里 NO₂ 慢慢溶进水里：3NO₂ + H₂O ══ 2HNO₃ + NO（课本第 13 页），时间常数取 90 s（示意）。
//   气体多出来的部分从侧管经导管进入 NaOH 溶液：NO₂ 约 90% 被吸收（NO 只和 NO₂ 一起按 1∶1 被吸收；NO 单独不被 NaOH 溶液吸收），其余冒出液面，NO 遇空气生成 NO₂。
//   气体收缩（O₂ 被消耗、NO₂ 溶解）时不画倒吸（课本没写）。时间加快 4 倍。
// 看不见的东西：O₂（蓝点，概念色）、NO（淡紫灰点，无色，示意）；NO₂ 的红棕色是真实的颜色。“钻进去看”：铜失去电子，+5 价的氮得到电子变成 NO₂ / NO（kit/cuhno3-parts.js）。
import * as THREE from 'three';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs, mountXuean, moreBox, varyBox } from './kit/chemlesson.js';
import { draggable, clamp } from './kit/interact.js';
import { textPlate } from './kit/props.js';
import { testTube, glassTube, rubberTube, tubeRack, chemBeaker } from './kit/chem.js';
import { bubble2, tubeLiquid, smoke2 } from './kit/chemfx.js';
import { micro } from './kit/microworld.js';
import { nitricScene, groovedStopper } from './kit/cuhno3-parts.js';
import { sfx } from './kit/audio.js';
import { paint } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
// ---- 化学模型 ----
const SPEED = 4, V_ACID = 2, C0 = { c: 14.4, d: 4 }, K_RATE = 0.0014, CU0 = 7.9, ML = 24.5;
const K3 = 7.1e3, TAU_ABS = 90, ABS_NA = 0.9, ML_DOT = 0.3;
// ---- 摆放（实验局部坐标，米；桌面 y = 0）----
const TR = 0.0085, WALL = 0.0008, TLEN = 0.15, RACK_Y = 0.008, RACK_H = 0.07;
const XT = 0.034, XB = 0.108;                    // 试管轴、烧杯中心离中线多远
const LR = TR - 0.0004, LYC = TR + WALL;
const volToY = (ml, R, yc) => {
  const v = ml * 1e-6, vh = (2 / 3) * Math.PI * R ** 3;
  if (v >= vh) return yc + (v - vh) / (Math.PI * R * R);
  let lo = 0, hi = R; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if ((Math.PI * m * m * (3 * R - m)) / 3 < v) lo = m; else hi = m; }
  return yc - R + lo;
};
const LIQ_Y = volToY(V_ACID, LR, LYC);          // 试管局部坐标里的液面
const PLUG_Y = TLEN - 0.012, ARM_Y = 0.126;      // 橡胶塞下沿、侧管（试管局部坐标）
const VH = (PLUG_Y - LIQ_Y) * Math.PI * LR * LR * 1e6 + 1.0;          // 气体空间（mL）：液面到橡胶塞 + 侧管、导管约 1 mL
const BR = 0.024, BH = 0.055, BLEVEL = 0.032, TIP_Y = 0.012;          // 烧杯、导管口
const SP_R = 0.0042, SP_L = 0.012, WZ = 0.0074, A_DOWN = 0.004, A_UP = 0.038, TRAVEL = A_UP - A_DOWN, WIRE_LEN = 0.172;
const CLEAR = new THREE.Color(0xeef2f3), BLUE = new THREE.Color(0x3d8fd8), GREEN = new THREE.Color(0x3c9c74), YEL = new THREE.Color(0xd8c16a);
const BR_LIGHT = new THREE.Color(0xb8602e), BR_DEEP = new THREE.Color(0x8e3417);
const NAOHC = 0xe6eef2;
const xNO2 = (c) => clamp((c - 6) / 6, 0, 1);    // 生成的气体里按浓的方程式反应的比例（示意）
const INTRO = '<b>注意：硝酸具有腐蚀性和挥发性，使用时须注意防护和通风！</b>（课本第 15 页）生成的 NO₂、NO 都有毒。<br>图5-14 的装置：橡胶塞侧面的凹槽里嵌着下端卷成螺旋状的铜丝；左边具支试管里是 2 mL 浓硝酸，右边是 2 mL 稀硝酸，铜丝都在液面上方；导管通入 NaOH 溶液。';
const brownA = (fr) => 0.9 * (1 - Math.exp(-fr / 0.15));

export default {
  id: 'cuhno3',
  fig: '图5-14',
  title: '硝酸与铜反应',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '铜在金属活动性顺序里排在氢后面，不能和稀硫酸反应。把铜丝分别伸进<b>浓硝酸</b>和<b>稀硝酸</b>里，会怎样？',
    hint: '课本第 15 页【实验5-8】。先猜，再比较两支试管。',
    options: ['都会反应，但生成的气体不一样', '只和浓硝酸反应，不和稀硝酸反应', '都不反应：铜排在氢后面'],
    answer: 0,
  },
  need: '使铜丝分别与 2 mL 浓硝酸、稀硝酸接触，观察并比较实验现象；向上拉铜丝，终止反应',
  conclusion: {
    crops: [{ page: 19, rect: [66, 419, 376, 460] }, { page: 19, rect: [66, 594, 376, 662] }],
    quote: '硝酸具有很强的氧化性，硝酸的浓度不同，与金属反应的产物也不同。……浓硝酸、稀硝酸与铜反应的化学方程式分别为：',
    formula: '4HNO₃(浓) + Cu ══ Cu(NO₃)₂ + 2NO₂↑ + 2H₂O<br>8HNO₃(稀) + 3Cu ══ 3Cu(NO₃)₂ + 2NO↑ + 4H₂O',
    why: '两支试管都不加热，铜丝一碰到硝酸就反应：铜在氢后面，不能置换出氢气，是硝酸的<b>强氧化性</b>把铜氧化成 Cu²⁺，溶液显蓝色（浓硝酸那支显绿色，常见的解释是溶液里溶有红棕色的 NO₂）。<br><b>浓硝酸</b>：反应剧烈，生成红棕色的 <b>NO₂</b>——被还原的氮 +5 → +4，各得 1 个电子。<br><b>稀硝酸</b>：反应较慢，铜丝表面冒出的是无色的 <b>NO</b>——被还原的氮 +5 → +2，各得 3 个电子。留在 Cu(NO₃)₂ 里的硝酸根，氮还是 +5 价。试管上部变成红棕色，是 NO 遇到管里空气中的 O₂ 生成了 NO₂（2NO + O₂ ══ 2NO₂）。<br>浓度不同，产物不同。向上拉铜丝，铜丝离开硝酸，反应就停止；NO₂ 用 NaOH 溶液吸收，NO 不能单独被吸收，所以还要注意通风（课本：使用时须注意防护和通风）。',
    src: '课本第 15 页 · 第五章 第二节 氮及其化合物 实验5-8',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (key, row) => { if (S.said[key]) return; S.said[key] = true; if (!S.demo) W?.tbl.add(row); };
    const pickBox = (w, hh, d) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), new THREE.MeshBasicMaterial({ visible: false })); m.userData.pick = true; return m; };
    const plate = (text, w, hh, x, z) => { const t = textPlate(text, { w, h: hh, color: '#3b4254', bg: '#fffaf0', font: `bold ${Math.floor(Math.min(0.8 * 512 * hh / w, 0.82 * 512 / text.length))}px "Songti SC", serif` }); t.position.set(x, 0.0038, z); t.rotation.x = -0.5; group.add(t); return t; };
    paperSheet(group, { w: 0.34, d: 0.15, x: 0, z: 0.02 });

    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3(), p4 = new THREE.Vector3();
    const inst = (parent, n, geo, mat, ro) => { const m = new THREE.InstancedMesh(geo, mat, n); m.count = 0; m.renderOrder = ro; m.frustumCulled = false; m.raycast = () => {}; parent.add(m); return m; };
    const sph = new THREE.SphereGeometry(1, 8, 6), dotG = new THREE.SphereGeometry(1, 6, 4);
    const bubC = bubble2({ color: 0x9a5a35, white: 0.25 }), bubD = bubble2({ color: 0x6f8797, white: 0.2 });
    const o2Mat = new THREE.MeshBasicMaterial({ color: 0x2f7fe0, transparent: true, opacity: 0.95, depthWrite: false });
    const noMat = new THREE.MeshBasicMaterial({ color: 0x8a84a6, transparent: true, opacity: 0.85, depthWrite: false });
    const cuMat = paint(0xc9783a, { unique: true, keep: true });
    // 铜丝的形状（铜丝局部坐标：原点在螺旋下端，+y 向上；螺旋绕试管轴，直的一段贴着管壁 z = WZ，从橡胶塞侧面的凹槽穿出去）
    const spPts = [];
    for (let i = 0; i <= 4 * 18; i++) { const a = (i / 18) * Math.PI * 2; spPts.push(V(Math.sin(a) * SP_R, (i / 72) * SP_L, Math.cos(a) * SP_R)); }
    spPts.push(V(0, SP_L + 0.003, WZ * 0.75), V(0, SP_L + 0.007, WZ), V(0, WIRE_LEN, WZ));
    const wireGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spPts, false, 'centripetal', 0.3), 300, 0.0007, 6, false);
    const SPS = spPts.slice(0, 73).filter((_, i) => i % 3 === 0);

    // ================= 两套装置：c 浓硝酸（左），d 稀硝酸（右）=================
    const SET = {};
    for (const k of ['c', 'd']) {
      const sx = k === 'c' ? -1 : 1, X = sx * XT, XBk = sx * XB, YA = RACK_Y + ARM_Y;
      const rack = tubeRack({ h: RACK_H }); rack.position.set(X, 0, 0); group.add(rack);
      const tg = new THREE.Group(); tg.position.set(X, RACK_Y, 0); group.add(tg);
      const tube = testTube({ r: TR, len: TLEN, wall: WALL }); tg.add(tube);
      tg.add(glassTube([V(sx * TR * 0.4, ARM_Y), V(sx * (TR + 0.026), ARM_Y)], { r: 0.0024 }));          // 具支试管的侧管
      const liq = tubeLiquid({ R: LR, yc: LYC, top: TLEN - 0.02, color: CLEAR.getHex(), base: 0.4 }); tg.add(liq); liq.setLevel(LIQ_Y);
      // 试管上部的气体：红棕色的深浅按 NO₂ 的多少
      const gasMat = new THREE.MeshBasicMaterial({ color: BR_LIGHT, transparent: true, opacity: 0, depthWrite: false });
      const gas = new THREE.Mesh(new THREE.CylinderGeometry(LR * 0.985, LR * 0.985, PLUG_Y - LIQ_Y - 0.0006, 24), gasMat);
      gas.position.y = (PLUG_Y + LIQ_Y) / 2; gas.renderOrder = 8.5; gas.raycast = () => {}; tg.add(gas);
      const plug = groovedStopper({ r1: 0.0084, r2: 0.0102, h: 0.018, rs: WZ - 0.0012 }); plug.position.y = PLUG_Y; tg.add(plug);          // 侧面的凹槽朝前（+z），铜丝贴着槽底滑
      const wire = new THREE.Group(); wire.position.y = A_UP; tg.add(wire);
      wire.add(new THREE.Mesh(wireGeo, cuMat));
      const wireTop = new THREE.Mesh(new THREE.CylinderGeometry(0.00075, 0.00075, 0.03, 8), cuMat); wireTop.position.set(0, WIRE_LEN - 0.015, WZ); wire.add(wireTop);          // 露在塞子上面的那一截（提示光圈套在它上面）
      const wirePick = pickBox(0.013, 0.034, 0.016); wirePick.position.set(0, WIRE_LEN - 0.017, WZ); wire.add(wirePick); wirePick.userData.track = true;          // 质检：铜丝在试管这一套里上下动，按它自己算
      // 乳胶管 + 导管 → 烧杯里的 NaOH 溶液
      group.add(rubberTube([V(sx * (XT + TR + 0.021), YA), V(sx * (XT + TR + 0.040), YA)], { r: 0.0034 }));
      const outPts = [V(sx * (XT + TR + 0.036), YA), V(XBk - sx * 0.008, YA), V(XBk - sx * 0.0025, YA - 0.0018), V(XBk, YA - 0.008), V(XBk, YA - 0.03), V(XBk, TIP_Y)];
      group.add(glassTube(outPts));
      // 侧管、导管里的气体（红棕色：顺着导管流出去的 NO₂）
      const flowMat = new THREE.MeshBasicMaterial({ color: BR_LIGHT, transparent: true, opacity: 0, depthWrite: false });
      const flowPts = [V(X + sx * TR * 0.5, YA), V(X + sx * (TR + 0.024), YA), ...outPts.slice(1)];
      const flow = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(flowPts, false, 'centripetal', 0.2), 60, 0.0013, 6, false), flowMat);
      flow.renderOrder = 8.5; flow.raycast = () => {}; group.add(flow);
      const beaker = chemBeaker({ r: BR, h: BH, level: BLEVEL, color: NAOHC }); beaker.position.set(XBk, 0, 0); if (sx > 0) beaker.rotation.y = Math.PI; group.add(beaker);
      plate(k === 'c' ? '浓硝酸' : '稀硝酸', 0.032, 0.0085, X, 0.03);
      plate('NaOH 溶液', 0.036, 0.0075, XBk, 0.034);
      const bubs = inst(tg, 60, sph, k === 'c' ? bubC : bubD, 9.8);          // 铜丝表面的气泡（试管局部坐标）
      const nbubs = inst(group, 40, sph, bubD, 9.8);                         // 导管口冒进 NaOH 溶液的气泡
      const o2Dots = inst(tg, 40, dotG, o2Mat, 8.6), noDots = inst(tg, 70, dotG, noMat, 8.6);
      const smoke = smoke2({ max: 140, color: 0xa4562e, opacity: 0.5 }); smoke.mesh.renderOrder = 13; group.add(smoke.mesh);
      SET[k] = { k, sx, X, XBk, tg, tube, liq, gas, gasMat, plug, wire, wirePick, wireTop, flow, flowMat, beaker, bubs, nbubs, o2Dots, noDots, smoke,
        FX: { b: [], nb: [], acc: 0, nacc: 0, o2: [], no: [] } };
    }
    const wireAnchor = (k, s) => V(SET[k].X, RACK_Y + A_UP - s * TRAVEL, WZ);
    // 观察卡：每支试管一张，放在外侧烧杯上方（不挡铜丝、不挡“钻进去看”）
    for (const k of ['c', 'd']) SET[k].card = tag('', 'cond');

    // ================= 状态 =================
    const tube0 = (k) => ({ ws: 0, wsCur: 0, drag: false, contact: 0, cu: 0, acid: C0[k] * V_ACID, x: k === 'c' ? 1 : 0, rate: 0,
      o2: VH * 0.21, n2: VH * 0.79, no: 0, no2: 0, genNO2: 0, genNO: 0, flow: 0, outFr: 0, escNO: 0, escRate: 0, absNa: 0, dno2: 0, tIn: 0, ever: false });
    const fresh = () => ({ demo: false, near: false, focus: 'c', c: tube0('c'), d: tube0('d'), said: {} });
    S = fresh();
    const cNow = (T) => T.acid / V_ACID;
    const other = (k) => (k === 'c' ? 'd' : 'c');
    const NAME = { c: '浓硝酸', d: '稀硝酸' };

    const A = {
      wire(k) {          // 点一下铜丝：推下去 / 拉上来（和拖动一样）
        const T = S[k]; S.focus = k; T.ws = T.ws > 0.5 ? 0 : 1; A.moved(k);
      },
      moved(k) {
        const T = S[k];
        const early = k === 'c' ? !S.said.brownC : !S.said.cmp;
        if (T.ws < 0.5 && T.ever && early) { status(`${NAME[k]}那支的铜丝拉上来了，反应停了——可现象还没看清。把这根<b>铜丝</b>再推下去，接着看。`); return; }
        if (T.ws < 0.5 && T.ever && !S.said['up' + k]) { S.said['up' + k] = true; status(`铜丝离开了${NAME[k]}：气泡停了，反应终止。${S[other(k)].ws > 0.5 ? `再把另一根<b>铜丝</b>也向上拉。` : ''}`); }
        if (T.ws > 0.5) S.said['up' + k] = false;
      },
      reset() {
        if (bar.playing) bar.stop();
        S = fresh(); sync(); mic.close(); back();
        W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.t3.close(); W.next.hidden = true; W.ui.relock(); }
        bar.undo('pushC', 'watchC', 'pushD', 'watchD', 'stop', 'why');
        status(INTRO);
      },
    };
    const sync = () => {
      for (const k of ['c', 'd']) { const F = SET[k].FX; F.b.length = F.nb.length = F.o2.length = F.no.length = 0; F.acc = F.nacc = 0; SET[k].smoke.clear(); S[k].wsCur = S[k].ws; }
    };

    const drags = ['c', 'd'].map((k) => ({
      obj: SET[k].wirePick, plane: 'xy', offset: WZ, keepOffset: true, anchor: SET[k].wire,
      hint: () => (S[k].ws > 0.5 ? `铜丝：往上拉，离开${NAME[k]}` : `铜丝：往下推，使铜丝与${NAME[k]}接触`),
      onStart: () => { S[k].drag = true; S.focus = k; },
      onDrag: (p) => { S[k].ws = clamp((A_UP - (p.y - RACK_Y)) / TRAVEL, 0, 1); },
      onEnd: () => { const T = S[k]; T.drag = false; T.ws = T.ws > 0.5 ? 1 : 0; A.moved(k); },
      onTap: () => A.wire(k),
    }));
    const drag = draggable(group, drags, { tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const mic = micro({ tag, look, back, group, scene: nitricScene(), at: () => V(SET[S.focus].X, RACK_Y + 0.011, 0), btnAt: () => V(SET[S.focus].X - SET[S.focus].sx * 0.021, 0.19, 0.01), label: '钻进去看',
      state: () => { const T = S[S.focus]; return { conc: S.focus === 'c', x: T.x, c: r1(cNow(T)), contact: T.contact > 0.05, hot: T.rate > 0.001, made: T.cu > 0.02 }; },
      // 浓硝酸用稀了：微观按 x 的比例挑路径演示（不用重开）
      key: () => S.focus + String(S[S.focus].contact > 0.05), bar: () => bar, scale: 0.0056, lookD: [0.05, 0.25, 1], dist: 0.26 });

    // ================= 步骤栏 + 老师演示 =================
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'pushC', title: '浓硝酸：铜丝接触', todo: '把<b>浓硝酸</b>那支试管里的<b>铜丝</b>往下推，使铜丝与浓硝酸接触。（铜丝从橡胶塞侧面的凹槽穿过，可以上下抽动）', target: () => (S.c.ws > 0.5 ? null : SET.c.wireTop) },
        { id: 'watchC', title: '看浓硝酸', todo: '看浓硝酸那支：铜丝表面、试管上部的气体、溶液的颜色，有什么变化？', target: () => (S.c.ever && S.c.ws < 0.5 ? SET.c.wireTop : null) },
        { id: 'pushD', title: '稀硝酸：铜丝接触', todo: '把<b>稀硝酸</b>那支试管里的<b>铜丝</b>往下推，使铜丝与稀硝酸接触。', target: () => (S.d.ws > 0.5 ? null : SET.d.wireTop) },
        { id: 'watchD', title: '比较', todo: '看稀硝酸那支，和浓硝酸那支比较：气泡多少、气泡和试管上部气体的颜色、溶液的颜色。', target: () => (S.d.ever && S.d.ws < 0.5 ? SET.d.wireTop : null) },
        { id: 'stop', title: '向上拉铜丝', todo: '把两根<b>铜丝</b>都向上拉，终止反应。', target: () => (S.c.ws > 0.5 ? SET.c.wireTop : S.d.ws > 0.5 ? SET.d.wireTop : null) },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { sync(); mic.close(); },
            view: { save: () => (mic.isOpen ? { focus: S.focus } : null), restore: (v) => { S.focus = v.focus; mic.open(); } } }),
          shots: [
            { cap: '实验5-8：橡胶塞侧面的凹槽里嵌着下端卷成螺旋状的铜丝；已经向两支具支试管中分别加入 2 mL 浓硝酸（左）和稀硝酸（右），再用橡胶塞塞住试管口，铜丝还在液面上方；导管通入 NaOH 溶液。硝酸有腐蚀性和挥发性：戴好护目镜，在通风处进行。', dur: 5, cam: [[0, 0.1, 0], [0.04, 0.28, 1], 0.5] },
            { cap: '把铜丝往下推，使铜丝与浓硝酸接触：反应剧烈，冒出大量气泡，试管上部很快充满红棕色的 NO₂，溶液慢慢变绿。', dur: 8, cam: [[-0.045, 0.085, 0], [0.04, 0.2, 1], 0.44],
              during: act.drag(SET.c.wirePick, () => wireAnchor('c', 1), { t0: 0.08, t1: 0.3, release: 0.34, from: () => wireAnchor('c', 0) }) },
            { cap: '再把另一根铜丝推进稀硝酸：反应较慢，冒出的气泡是无色的（NO，淡紫灰点）。试管上部慢慢出现红棕色——NO 遇到管里空气中的 O₂（蓝点），生成了 NO₂。', dur: 12, speed: 3, cam: [[0.02, 0.085, 0], [0.04, 0.2, 1], 0.44],
              during: act.drag(SET.d.wirePick, () => wireAnchor('d', 1), { t0: 0.05, t1: 0.2, release: 0.24, from: () => wireAnchor('d', 0) }) },
            { cap: '钻进去看浓硝酸（示意）：一个铜原子交出 2 个电子，被还原的两个 NO₃⁻ 里，+5 价的氮各得 1 个，变成 +4 价的 NO₂。', dur: 9, cam: [[-0.034, 0.06, 0], [0.05, 0.25, 1], 0.3], enter: () => { S.focus = 'c'; mic.open(true); } },
            { cap: '钻进去看稀硝酸（示意）：三个铜原子交出 6 个电子，被还原的两个 NO₃⁻ 里，+5 价的氮各得 3 个，变成 +2 价的 NO。', dur: 12, cam: [[0.034, 0.06, 0], [0.05, 0.25, 1], 0.3], enter: () => { S.focus = 'd'; mic.open(true); }, during: act.at(0.98, () => mic.close()) },
            { cap: '向上拉铜丝：铜丝离开硝酸，气泡停了——反应终止。演示完了，换你自己做。', dur: 7, cam: [[0, 0.1, 0], [0.04, 0.28, 1], 0.5],
              during: act.seq(act.drag(SET.c.wirePick, () => wireAnchor('c', 0), { t0: 0.08, t1: 0.3, release: 0.34, from: () => wireAnchor('c', 1) }),
                act.drag(SET.d.wirePick, () => wireAnchor('d', 0), { t0: 0.45, t1: 0.67, release: 0.71, from: () => wireAnchor('d', 1) })) },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ================= 化学模型（实际时间 hh 秒）=================
    const model = (k, hh) => {
      const T = S[k], c = cNow(T), x = xNO2(c);
      const cuK = Math.pow(Math.max(0, CU0 - T.cu) / CU0, 2 / 3);
      T.rate = K_RATE * c * T.contact * cuK; T.x = x;
      const per = 4 * x + (8 / 3) * (1 - x);                          // 每 mmol Cu 消耗的 HNO₃
      const dCu = Math.max(0, Math.min(T.rate * hh, T.acid / per));
      T.cu += dCu; T.acid -= dCu * per;
      const gNO2 = 2 * x * dCu * ML, gNO = (2 / 3) * (1 - x) * dCu * ML;
      T.no2 += gNO2; T.no += gNO; T.genNO2 += gNO2; T.genNO += gNO;
      if (T.contact > 0.05) T.tIn += hh;
      // 2NO + O₂ → 2NO₂（三级反应）
      if (T.no > 1e-4 && T.o2 > 1e-4) {
        const cNO = T.no / VH / ML, cO2 = T.o2 / VH / ML;            // mol/L
        const dO2 = Math.min(K3 * cNO * cNO * cO2 * hh * VH * ML, T.o2, T.no / 2);
        T.o2 -= dO2; T.no -= 2 * dO2; T.no2 += 2 * dO2;
      }
      // 稀硝酸里：NO₂ 慢慢溶进水里，3NO₂ + H₂O → 2HNO₃ + NO
      if (k === 'd' && T.no2 > 0) { const dA = T.no2 * (1 - Math.exp(-hh / TAU_ABS)); T.no2 -= dA; T.no += dA / 3; T.acid += (dA * 2 / 3) / ML; }
      // 浓硝酸那支：溶进溶液里的 NO₂（使溶液显绿色），跟着试管上部的 NO₂ 走
      T.dno2 += (Math.min(1, T.no2 / VH) - T.dno2) * (1 - Math.exp(-hh / 20));
      // 多出来的气体从侧管、导管进入 NaOH 溶液
      const tot = T.o2 + T.n2 + T.no + T.no2;
      if (tot > VH) {
        const out = tot - VH, f = out / tot;
        const oNO2 = T.no2 * f, oNO = T.no * f;
        T.o2 -= T.o2 * f; T.n2 -= T.n2 * f; T.no -= oNO; T.no2 -= oNO2;
        const aNO2 = ABS_NA * oNO2, aNO = Math.min(oNO, ABS_NA * Math.min(oNO, oNO2));
        T.absNa += aNO2 + aNO;
        const esc = oNO - aNO + (oNO2 - aNO2);
        T.escNO += esc; T.escRate += (esc / hh - T.escRate) * Math.min(1, hh / 2);
        T.flow += (out / hh - T.flow) * Math.min(1, hh / 1.5); T.outFr = T.no2 / Math.max(1e-6, tot - out);
      } else { T.flow += (0 - T.flow) * Math.min(1, hh / 1.5); T.escRate += (0 - T.escRate) * Math.min(1, hh / 2); T.outFr = T.no2 / VH; }
    };

    // ================= 每帧 =================
    const tmp = new THREE.Vector3();
    const r1 = (v) => (v < 10 ? Math.round(v * 10) / 10 : Math.round(v));
    // 溶液的颜色（画面和记录用同一个）：Cu²⁺ 的蓝；浓硝酸那支溶有 NO₂ → 绿（示意）
    const liqOf = (k) => {
      const T = S[k], blueK = clamp(T.cu / V_ACID / 0.4, 0, 1), yel = k === 'c' ? clamp(T.dno2 * 1.4, 0, 1) : 0;
      const col = CLEAR.clone().lerp(BLUE.clone().lerp(GREEN, yel), blueK * 0.85).lerp(YEL, 0.35 * yel * (1 - blueK));
      const name = blueK < 0.12 ? (yel > 0.35 ? '略带黄色' : '近于无色') : yel > 0.35 && blueK > 0.4 ? '绿色' : yel > 0.35 ? '蓝绿色' : blueK < 0.45 ? '浅蓝色' : '蓝色';
      return { col, name, blueK };
    };
    const fNO2 = (x) => (2 * x) / (2 * x + (2 / 3) * (1 - x));          // 新生成的气体里 NO₂ 占的比例（按两个方程式的计量系数：每 mmol Cu 生成 2 mmol NO₂ 或 2/3 mmol NO）
    const gasName = (T) => { const fr = T.no2 / VH; return fr < 0.02 ? '近于无色' : fr < 0.08 ? '浅红棕色' : fr < 0.35 ? '红棕色' : '深红棕色'; };
    const step = (dt, t) => {
      const H = dt * SPEED, n = Math.max(1, Math.ceil(H / 0.1));
      for (const k of ['c', 'd']) {
        const T = S[k], G = SET[k];
        T.wsCur += (T.ws - T.wsCur) * Math.min(1, dt * (T.drag ? 30 : 8));
        G.wire.position.y = A_UP - T.wsCur * TRAVEL;
        let cnt = 0; for (const p of SPS) if (G.wire.position.y + p.y < LIQ_Y) cnt++;
        T.contact = cnt / SPS.length;
        if (T.contact > 0.05) T.ever = true;
      }
      for (let i = 0; i < n; i++) { model('c', H / n); model('d', H / n); }
      const C = S.c, D = S.d;
      // ---- 第一次看到的现象 → 记录、步骤 ----
      if (C.contact > 0.3 && !S.said.inC) { S.said.inC = true; done('pushC'); status('铜丝浸进浓硝酸：立刻冒出大量气泡！盯着<b>试管上部</b>和<b>溶液</b>的颜色。（时间加快了 4 倍）'); }
      if (C.no2 / VH > 0.4 && !S.said.brownC) {
        log('brownC', ['把铜丝推进浓硝酸', '反应<b>剧烈</b>：铜丝表面冒出大量气泡，试管上部很快充满<b>红棕色</b>气体', '生成了红棕色的 <b>NO₂</b>']);
        done('watchC'); status(D.ever ? '浓硝酸那支：试管上部充满了红棕色的 NO₂。' : '浓硝酸那支：试管上部充满了红棕色的气体。再看看溶液的颜色，然后把<b>稀硝酸</b>那支的铜丝往下推，比较一下。');
      }
      if (liqOf('c').name === '绿色') log('colC', ['浓硝酸那支的溶液', '变成<b>绿色</b>', '生成了 Cu(NO₃)₂（Cu²⁺ 显蓝色）。浓硝酸里溶液显绿色，常见的解释是溶有红棕色的 NO₂；也有研究认为和硝酸根很多时 Cu²⁺ 的结合方式有关']);
      if (liqOf('d').blueK > 0.3) log('colD', ['稀硝酸那支的溶液', '慢慢变成<b>浅蓝色</b>', '生成了 Cu(NO₃)₂：Cu²⁺ 显蓝色']);
      if (D.contact > 0.3 && !S.said.inD) { done('pushD'); log('inD', ['把铜丝推进稀硝酸', '反应<b>较慢</b>：铜丝表面冒出少量<b>无色</b>气泡', '和浓硝酸比，稀硝酸和铜反应慢得多']); status('铜丝浸进稀硝酸：气泡少多了，而且是<b>无色</b>的。盯着稀硝酸那支试管的<b>上部</b>。'); }
      if (D.no2 / VH > 0.04 && !S.said.pale) { log('pale', ['稀硝酸那支试管上部', '慢慢出现<b>红棕色</b>', '冒出来的无色气体是 <b>NO</b>，它遇到试管里空气中的 O₂（蓝点）生成了红棕色的 NO₂：2NO + O₂ ══ 2NO₂']); status('稀硝酸那支试管上部慢慢变红棕色了。可是气泡明明是无色的——看看<b>蓝点</b>（O₂）在怎样变少。'); }
      if (S.said.brownC && S.said.pale && !S.said.cmp) {
        const lc = liqOf('c'), ld = liqOf('d'), mm = (v) => Math.round((v / ML) * 100) / 100;
        log('cmp', ['比较两支试管', `浓：铜丝浸了约 ${Math.round(C.tIn)} 秒，试管上部${gasName(C)}，溶液${lc.name}；稀：浸了约 ${Math.round(D.tIn)} 秒，气泡无色，试管上部${gasName(D)}，溶液${ld.name}（秒数是模型时间）`,
          `硝酸的浓度不同，与铜反应的产物不同：浓 → NO₂，稀 → NO。按方程式估算：浓那支生成约 ${mm(C.genNO2)} mmol NO₂${C.genNO > 0.5 ? `、${mm(C.genNO)} mmol NO` : ''}，稀那支生成约 ${mm(D.genNO)} mmol NO`]);
        done('watchD'); status('比较一下：浓硝酸反应剧烈，生成红棕色的 NO₂；稀硝酸反应较慢，生成无色的 NO。现在把两根<b>铜丝</b>都向上拉，终止反应。');
      }
      if (S.said.pale && D.o2 < 0.03 * VH * 0.21 && D.no2 / VH < 0.02 && !S.said.clear) log('clear', ['稀硝酸那支，再等一会儿', '试管上部的红棕色<b>褪去</b>，近于无色', '管里的 O₂ 用完了，NO₂ 溶进水里（3NO₂ + H₂O ══ 2HNO₃ + NO）或被赶进烧杯；剩下的 NO 是<b>无色</b>的']);
      if (D.escNO > 0.6 && !S.said.esc) log('esc', ['稀硝酸那边的烧杯', '冒出 NaOH 溶液的气泡，在液面上方变成<b>淡红棕色</b>', 'NO 不能单独被 NaOH 溶液吸收，遇到空气生成 NO₂——所以还要注意<b>通风</b>']);
      if (fNO2(C.x) < 0.5 && !S.said.thin) log('thin', ['浓硝酸那支反应了一段时间', '冒出的气泡颜色变浅，试管里出现了 NO（淡紫灰点）', `硝酸越用越稀（约 ${r1(cNow(C))} mol/L），生成的气体里 NO 越来越多——浓度不同，产物不同`]);
      if (S.said.cmp && C.ever && D.ever && C.contact === 0 && D.contact === 0 && !S.said.stop) {
        done('stop'); log('stop', ['向上拉铜丝', '铜丝离开硝酸，气泡<b>停了</b>', '反应终止：可抽动的铜丝能让反应随时停下来，少生成有毒的氮氧化物']);
        if (!S.demo) { W?.t1.open(); status('两根铜丝都拉上来了，反应终止。在左边作答。'); }
      }
      // ---- 画面 ----
      for (const k of ['c', 'd']) {
        const T = S[k], G = SET[k], F = G.FX;
        const fr = clamp(T.no2 / VH, 0, 1);
        G.gasMat.color.copy(BR_LIGHT).lerp(BR_DEEP, Math.min(1, fr * 1.3)); G.gasMat.opacity = brownA(fr); G.gas.visible = fr > 0.003;
        const ofr = clamp(T.outFr, 0, 1);
        G.flowMat.color.copy(G.gasMat.color); G.flowMat.opacity = Math.min(0.55, brownA(ofr) * 0.7); G.flow.visible = ofr > 0.01;
        // 溶液：Cu²⁺ 的蓝；浓硝酸那支溶有 NO₂ → 绿
        G.liq.setColor(liqOf(k).col.getHex()); G.liq.update(t);
        G.bubs.material = fNO2(T.x) > 0.5 ? bubC : bubD;          // 气泡：按新生成气体的组成，NO₂ 占多数时带红棕色，NO 占多数时无色
        // 铜丝表面的气泡（试管局部坐标）
        const gRate = T.rate * ((2 * T.x) + (2 / 3) * (1 - T.x)) * ML * SPEED;          // mL/s（画面时间）
        if (gRate > 0.02) {
          F.acc += dt * Math.min(45, gRate * 9);
          while (F.acc > 1) { F.acc -= 1; const p = SPS[Math.floor(Math.random() * SPS.length)]; const y = G.wire.position.y + p.y; if (y < LIQ_Y - 0.0008 && F.b.length < 60) F.b.push({ p: V(p.x, y, p.z), v: 0.01 + Math.random() * 0.01, s: (fNO2(T.x) > 0.5 ? 0.0006 : 0.00045) + Math.random() * 0.0003 }); }
        } else F.acc = 0;
        for (let i = F.b.length - 1; i >= 0; i--) { const b = F.b[i]; b.p.y += b.v * dt; const rr = Math.hypot(b.p.x, b.p.z); if (rr > LR - 0.0012) { b.p.x *= (LR - 0.0012) / rr; b.p.z *= (LR - 0.0012) / rr; } if (b.p.y > LIQ_Y - 0.0003) F.b.splice(i, 1); }
        F.b.forEach((b, i) => { s4.setScalar(b.s); m4.compose(b.p, q4, s4); G.bubs.setMatrixAt(i, m4); });
        G.bubs.count = F.b.length; G.bubs.instanceMatrix.needsUpdate = true;
        // 导管口冒进 NaOH 溶液的气泡：NO₂ 多的半路就被吸收（变小、消失）
        F.nacc += dt * Math.min(16, T.flow * SPEED * 5);
        while (F.nacc > 1) { F.nacc -= 1; if (F.nb.length < 40) F.nb.push({ p: V(G.XBk + (Math.random() - 0.5) * 0.002, TIP_Y + 0.001, (Math.random() - 0.5) * 0.002), v: 0.02, s: 0.0011 + Math.random() * 0.0006, abs: Math.random() < ofr * ABS_NA, y1: TIP_Y + 0.004 + Math.random() * 0.012 }); }
        for (let i = F.nb.length - 1; i >= 0; i--) {
          const b = F.nb[i]; b.v += 0.06 * dt; b.p.y += b.v * dt; b.p.x = clamp(b.p.x + (Math.random() - 0.5) * 0.0004, G.XBk - 0.005, G.XBk + 0.005);
          if (b.abs && b.p.y > b.y1) { b.s *= Math.pow(0.02, dt); if (b.s < 0.0003) { F.nb.splice(i, 1); continue; } }
          if (b.p.y > BLEVEL - 0.001) F.nb.splice(i, 1);
        }
        F.nb.forEach((b, i) => { s4.setScalar(b.s); m4.compose(b.p, q4, s4); G.nbubs.setMatrixAt(i, m4); });
        G.nbubs.count = F.nb.length; G.nbubs.instanceMatrix.needsUpdate = true;
        // 冒出液面的 NO（和没吸收完的 NO₂）遇空气：淡淡的红棕色
        G.smoke.update(dt, { rate: Math.min(14, T.escRate * SPEED * 9), origin: V(G.XBk, BLEVEL + 0.002, 0), spread: 0.006, up: 0.018, size: 0.007, life: 2.4 });
        // 试管上部：O₂（蓝点）、NO（淡紫灰点）
        const y0 = LIQ_Y + 0.003, y1 = PLUG_Y - 0.003;
        const fit = (list, want, mesh, r, from) => {
          while (list.length < want) { const a = Math.random() * 6.283, rr = Math.sqrt(Math.random()) * LR * 0.8; list.push({ p: V(Math.cos(a) * rr, from === 'low' ? y0 + Math.random() * 0.012 : y0 + Math.random() * (y1 - y0), Math.sin(a) * rr), v: V() }); }
          while (list.length > want) list.splice(Math.floor(Math.random() * list.length), 1);
          list.forEach((d, i) => {
            d.v.x += (Math.random() - 0.5) * dt * 0.02; d.v.z += (Math.random() - 0.5) * dt * 0.02; d.v.y += (Math.random() - 0.5) * dt * 0.06; d.v.multiplyScalar(Math.pow(0.3, dt));
            d.p.addScaledVector(d.v, dt); const rr = Math.hypot(d.p.x, d.p.z), lim = LR * 0.82; if (rr > lim) { d.p.x *= lim / rr; d.p.z *= lim / rr; d.v.x *= -0.5; d.v.z *= -0.5; }
            if (d.p.y < y0) { d.p.y = y0; d.v.y = Math.abs(d.v.y); } if (d.p.y > y1) { d.p.y = y1; d.v.y = -Math.abs(d.v.y); }
            s4.setScalar(r); m4.compose(d.p, q4, s4); mesh.setMatrixAt(i, m4);
          });
          mesh.count = list.length; mesh.instanceMatrix.needsUpdate = true;
        };
        fit(F.o2, Math.min(40, Math.round(T.o2 / ML_DOT)), G.o2Dots, 0.0011, 'any');
        fit(F.no, Math.min(70, Math.round(T.no / ML_DOT)), G.noDots, 0.00095, 'low');
      }
      // ---- 观察卡（写看得到的现象；浓度是模型算的示意值）----
      for (const k of ['c', 'd']) {
        const T = S[k], G = SET[k], gr = T.rate * ((2 * T.x) + (2 / 3) * (1 - T.x)) * ML;          // 按方程式生成气体 mL/s（实际时间）
        const on = T.contact > 0.05 && T.rate > 0.0005;
        const bub = !on ? '没有' : gr > 0.25 ? '很多' : '少';
        const stamp = on ? '<span class="cc-res">反应中</span>' : '';
        const what = on ? `<div class="cc-note">正在生成：<b>${fNO2(T.x) > 0.97 ? 'NO₂（红棕色）' : fNO2(T.x) > 0.03 ? `NO₂ 和 NO（约 ${Math.round(fNO2(T.x) * 100)}% 是 NO₂）` : 'NO（无色）'}</b></div>` : '';
        G.card.text(`<div class="cc"><div class="cc-t"><span class="cc-name">${NAME[k]}</span>${stamp}</div><div class="cc-more"><div class="cc-note">气泡：${bub}；试管上部：${gasName(T)}；溶液：${liqOf(k).name}</div>${what}<div class="cc-note">硝酸约 ${r1(cNow(T))} mol/L（示意）</div><div class="cc-note"><span style="color:#2f7fe0">●</span> O₂（概念色） <span style="color:#8a84a6">●</span> NO（无色，示意）</div></div></div>`)
          .loc(group, G.XBk, 0.19, 0).show(!bar.playing && !mic.isOpen);
      }
      bar.near(S.near);
    };

    return {
      group: root, pointer, card: false, toggles: ['steps', 'cards'],
      size: { w: 0.29, d: 0.1, h: 0.2 },
      view: { elev: 14, azim: -4, lookY: 0.45, frameMargin: 1.06 },
      mount(ui) {
        const ctx = () => (S.said.pale ? '<div>你的记录：稀硝酸那支，铜丝表面冒出的气泡是<b class="y">无色</b>的，试管上部却慢慢变成了<b class="y">红棕色</b>。</div>' : '');
        const t3 = think({ q: '这个装置里，可以上下抽动的铜丝和烧杯里的 NaOH 溶液各有什么用？', options: ['铜丝拉上来反应就停，少生成有毒气体；NaOH 溶液吸收 NO₂，减少氮氧化物排到空气里', '铜丝抽动能让反应更快；NaOH 溶液用来检验生成的气体', '铜丝抽动是为了搅拌；NaOH 溶液防止试管炸裂'],
          wrong: ['把铜丝往上拉，铜丝离开硝酸，反应就停了——它是用来控制反应的。NaOH 溶液没有明显的现象，不是用来检验的。', '看看你的记录：铜丝离开硝酸，气泡就停了。NaOH 溶液和导管口冒出的 NO₂ 反应，把它吸收掉。'],
          ok: '对：NO₂、NO 都有毒。铜丝浸进去就反应、拉上来就停；NO₂ 被 NaOH 溶液吸收。NO 不能单独被 NaOH 溶液吸收，所以课本还要求注意通风。', status: (m) => W?.status(m), onOk: () => { done('why'); if (W) W.next.hidden = false; } });
        const t2 = think({ q: '两个反应里，硝酸中 +5 价的氮分别变成了几价？', options: ['浓硝酸：+4 价（NO₂）；稀硝酸：+2 价（NO）', '都变成 +4 价', '氮的化合价没变，变的只是铜'],
          wrong: ['稀硝酸那支生成的是 NO：氮 +2 价。点“钻进去看”看看稀硝酸里被还原的氮各得几个电子。', '铜失去电子（0 → +2），这些电子给了硝酸里的氮：氮的化合价降低了。'],
          ok: '对：浓硝酸里，被还原成 NO₂ 的氮各得 1 个电子（+5 → +4）；稀硝酸里，被还原成 NO 的氮各得 3 个电子（+5 → +2）。留在 Cu(NO₃)₂ 里的硝酸根，氮还是 +5 价。硝酸是氧化剂，铜是还原剂；浓度不同，产物不同。', status: (m) => W?.status(m), onOk: () => t3.open() });
        const t1 = think({ q: '稀硝酸那支，铜丝表面冒出的气泡是无色的，试管上部却慢慢变成红棕色。为什么？', ctx, options: ['生成的是无色的 NO，它遇到试管里空气中的 O₂，变成了红棕色的 NO₂', '生成的就是 NO₂，只是生成得慢', '硝酸挥发出来，在试管上部显红棕色'],
          wrong: ['看看蓝点：试管上部红棕色出现的时候，O₂ 在变少。NO₂ 是红棕色的，冒出来的气泡却是无色的。', '硝酸是无色的液体（课本第 15 页）。'],
          ok: '对：稀硝酸和铜反应生成无色的 NO；试管里原来有空气，NO 遇到 O₂ 生成红棕色的 NO₂（2NO + O₂ ══ 2NO₂）。所以试管上部变红棕色，不能说明稀硝酸生成的是 NO₂。', status: (m) => W?.status(m), onOk: () => t2.open() });
        const vary = varyBox('课本的注意事项：硝酸具有腐蚀性和挥发性，使用时须注意防护和通风！可以试试：浓硝酸那支一直不拉铜丝，看冒出的气体怎样变；等稀硝酸那支的 O₂（蓝点）用完，看试管上部的颜色；盯着两个烧杯的液面上方。', h('span', {}));
        const more = moreBox([['钻进去看（浓硝酸）', () => { S.focus = 'c'; mic.open(); }], ['钻进去看（稀硝酸）', () => { S.focus = 'd'; mic.open(); }]], () => A.reset());
        const note = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'), h('p', { class: 'fineprint', html: '浓硝酸按 65%（1.40 g/mL）= 14.4 mol/L，2 mL 含 28.9 mmol HNO₃；稀硝酸课本没写浓度，这里取 4 mol/L（2 mL 含 8 mmol）。铜丝螺旋约 0.5 g。不加热（课本没写加热）。<b>时间加快 4 倍</b>（记录里的秒数是模型时间，即加快前的时间）。<br>反应速率按与硝酸浓度成正比估计（<b>示意</b>）：r = 1.4×10⁻³ mmol/s × c(mol/L) × 铜丝浸在酸里的比例。铜丝推到底时螺旋约八成浸在酸里，开始时浓硝酸约 0.016 mmol Cu/s（按方程式生成 NO₂ 约 0.8 mL/s），稀硝酸约 0.0045 mmol Cu/s（生成 NO 约 0.07 mL/s）；拉上来就是 0。产量是按课本的两个方程式<b>估算</b>的（25 ℃ 每 mmol 气体约 24.5 mL）；NO₂ 按 NO₂ 当量计，实际气体里还有一部分 N₂O₄（2NO₂ ⇌ N₂O₄），没有单独算。硝酸越用越稀，生成的气体里 NO 越来越多：12 mol/L 以上全按浓的方程式、6 mol/L 以下全按稀的方程式，中间按比例（<b>示意</b>）；气泡的颜色和“钻进去看”都跟着这个产物走。<br>试管上部原来是约 27 mL 空气（O₂ 21%，约 5.6 mL；之后没有空气进来）。2NO + O₂ ══ 2NO₂ 按三级反应算。IUPAC 评估（数据表 NOx23）推荐 298 K 时 k = 3.95×10⁻³⁸ cm⁶·分子⁻²·s⁻¹，按 NO₂ 的生成速率定义：d[NO₂]/dt = k[NO]²[O₂]，约 1.43×10⁴ L²·mol⁻²·s⁻¹；换成 O₂ 的消耗速率 −d[O₂]/dt 要折半，约 7.1×10³ L²·mol⁻²·s⁻¹（模型用这个）。稀硝酸那支里 NO₂ 慢慢溶进水里（3NO₂ + H₂O ══ 2HNO₃ + NO，课本第 13 页），时间常数取 90 s（<b>示意</b>）。<br>多出来的气体经导管进入 NaOH 溶液：NO₂ 吸收约 90%（<b>模型假设</b>）；NO 只和 NO₂ 一起（1∶1）被吸收，单独不被吸收，冒出液面遇空气生成 NO₂（淡红棕色，示意）。气体收缩时可能倒吸，课本没写，模型没画。<br>红棕色的深浅按试管上部 NO₂ 的多少（示意）；溶液的蓝色按 Cu²⁺ 浓度。浓硝酸那支显绿色，这里按“溶有 NO₂”着色（常见的解释；也有研究认为和硝酸根浓度高时 Cu²⁺ 的配位有关）。蓝点 = O₂（概念色），淡紫灰点 = NO（无色，示意），每 0.3 mL 一个；空气里的 N₂ 没画。<br>“钻进去看”把硝酸画成 H⁺ 和 NO₃⁻（和离子方程式一致；浓硝酸里其实还有不少 HNO₃ 分子），慢放示意，不表示真实的反应步骤。' }));
        const base = mountXuean(ui, { controls: [vary, more, note], headers: ['做了什么', '现象', '说明'], intro: INTRO });
        ui.data.append(t1.el, t2.el, t3.el, base.next);
        W = { ...base, ui, t1, t2, t3, status: ui.status }; bar.attach(ui);
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); mic.update(dt, k); },
      dispose() { bar.dispose(); drag.dispose(); mic.dispose?.(); for (const k of ['c', 'd']) SET[k].smoke.dispose(); },
      debug: {
        get S() { return S; }, bar, A, mic, wireAnchor, VH,
        picks: { wireC: SET.c.wirePick, wireD: SET.d.wirePick },
        qa: qaFlow(drag, [
          { name: '推铜丝（浓）', drag: SET.c.wirePick, to: () => wireAnchor('c', 1), wait: 5 },
          { name: '推铜丝（稀）', drag: SET.d.wirePick, to: () => wireAnchor('d', 1), wait: 16 },
          { name: '钻进去看（稀）', run: () => { S.focus = 'd'; mic.open(); }, wait: 8 },
          { name: '合上', run: () => mic.close(), wait: 1 },
          { name: '拉铜丝（浓）', drag: SET.c.wirePick, to: () => wireAnchor('c', 0), wait: 1 },
          { name: '拉铜丝（稀）', drag: SET.d.wirePick, to: () => wireAnchor('d', 0), wait: 2 },
          { name: '核对', run: () => { if (!(S.said.brownC && S.said.pale && S.said.cmp && S.said.stop)) throw new Error(JSON.stringify({ said: S.said, c: S.c, d: S.d })); }, wait: 1 },
          { name: '想一想 1', run: () => W.t1.el.querySelector('button').click() },
          { name: '想一想 2', run: () => W.t2.el.querySelector('button').click() },
          { name: '想一想 3', run: () => W.t3.el.querySelector('button').click() },
        ]),
      },
    };
  },
};
