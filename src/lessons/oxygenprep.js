// 实验活动 1 氧气的实验室制取与性质（课本第 52 页图 2-18；实验 2-5 在第 43 页）：加热高锰酸钾，用排水法收集氧气。
// 直接动手：手握试管查气密性；点橡胶塞拔出 / 塞上；把药匙、棉花拖到试管口；点酒精灯点燃，左右拖它预热、再对准药品；
//   把盛满水的集气瓶拖进水槽；把导管口拖进集气瓶；集满后点集气瓶取出；带火星的木条、细铁丝拖进集气瓶检验。
// 化学：2KMnO₄ → K₂MnO₄ + MnO₂ + O₂（约 200 ℃ 以上分解）。1 g 高锰酸钾最多放出约 0.10 g 氧气，室温下约 77 mL。
// 气体的量都按“室温下的毫升数”记（相当于物质的量）。试管里的气体 = 空气 + 氧气，充分混合；导管口冒出的就是这个混合物。
// 木条复燃、铁丝燃烧需要的氧气浓度：只找到初中探究题的数据（木条约 36%–60% 复燃，0.38 mm 铁丝约 55%–60% 才能燃烧），这里取近似值并在界面上说明。
//
// 新标准：纸本画风；底部步骤栏 ①–⑨（每一步自带提示光圈）；独立的老师演示（换一套干净的器材，看完恢复学生的进度）；
// 学案式面板（想一想之前先摆出学生自己记下的“刚冒泡时 / 连续均匀后，氧气约占多少”）。
import * as THREE from 'three';
import { buttons, seg, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { stand } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { testTube, stopper, glassTube, rubberTube, gasJar, trough, splint, ironWire, spatula, reagentBottle, chemLamp, cottonBall, tubeClamp, labJack, CHEM } from './kit/chem.js';
import { bubble2, Sparks, molecules } from './kit/chemfx.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, demoActs } from './kit/chemlesson.js';
import { lampCap } from './kit/labops.js';
import { canvasTex } from './kit/props.js';
import { paint, inked, hull } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const T0 = 25;                       // 室温 ℃
const V_TUBE = 20;                   // 试管里气体的空间（mL）
const V_JAR = 60;                    // 集气瓶容积（mL），和东莞考题用的 60 mL 集气瓶一样
const PER_G = 77;                    // 1 g 高锰酸钾最多放出的氧气（室温 mL）
const DOSE = 2;                      // 一药匙约 2 g
const RELIGHT = 0.45, BRIGHT = 0.35; // 带火星木条：≥ 45% 复燃，35%–45% 很亮（近似）
const IRON = 0.57;                   // 细铁丝能燃烧的最低氧气体积分数（近似）
const TILT = THREE.MathUtils.degToRad(8);
const CLAMP = new THREE.Vector3(-0.175, 0.132, 0);         // 铁夹夹住试管的位置（试管中上部）
const SLOT = [0.098, 0.146];                                // 集气瓶在水槽里的位置（x）
const HOME = [new THREE.Vector3(0.222, 0, 0.04), new THREE.Vector3(0.282, 0, 0.04)];   // 桌上放集气瓶的地方
const MOUTH_Y = 0.018;                                      // 倒立在水槽里时集气瓶口的高度
// 气体里氧气的体积分数：air 是空气（本身含 21% 氧气），o2 是高锰酸钾放出的氧气
const frac = (air, o2) => (air + o2 > 1e-6 ? (o2 + 0.21 * air) / (air + o2) : 0.21);

export default {
  id: 'oxygenprep',
  fig: '图2-18',
  title: '氧气的实验室制取与性质',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '加热高锰酸钾，导管口<b>刚开始冒出气泡</b>，就马上把导管伸进集气瓶收集。<br>这样收集到的是什么？',
    hint: '课本第 52 页 实验活动 1',
    options: ['纯净的氧气——高锰酸钾分解产生的就是氧气', '混有不少空气的氧气', '几乎全是空气，没有氧气'],
    answer: 1,
  },
  need: '检查气密性、装好药品、用排水法收集一瓶氧气并检验，最后正确地停止加热',
  conclusion: {
    crops: [{ page: 58, rect: [44, 440, 340, 600] }],
    quote: '导管口开始有气泡放出时，不宜立即收集。当气泡连续并比较均匀地放出时，再把导管口伸入盛满水的集气瓶。……停止加热时，先要把导管移出水面，然后再熄灭酒精灯。',
    formula: '高锰酸钾 <span style="font-size:.8em">加热</span>→ 锰酸钾 + 二氧化锰 + 氧气',
    why: '刚开始冒出的气泡，是试管里原有的<b>空气</b>受热膨胀被赶出来的；等试管里的空气被氧气赶得差不多了，气泡才连续、均匀，这时收集到的氧气才比较纯。<br>带火星的木条在氧气浓度并不很高时就能复燃，所以<b>木条复燃不能说明氧气纯净</b>；细铁丝对氧气浓度的要求高得多。<br>先熄灭酒精灯，试管里的气体冷却收缩，水槽里的水会<b>倒吸</b>进热的试管，使试管骤冷炸裂；试管口略向下倾斜，是为了防止冷凝水倒流到热的试管底部。',
    src: '课本第 43、52–53 页 · 第二单元 课题3 制取氧气、实验活动1',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    group.position.x = 0.03; root.add(group);
    // 凑近看：look() 的目标点在 root 坐标里（group 往右挪了 0.03）
    const near = (v, d = [0.15, 0.35, 1], dist = 0.26) => { if (S.demo) return; S.near = true; look([v.x + 0.03, v.y, v.z], d, dist, () => { S.near = false; }); };
    const far = () => { if (S.near) { S.near = false; back(); } };

    // 器材脚下一层淡淡的白，把这块书页上的字压下去
    const sheetTex = canvasTex(512, 256, (g, W, H) => {
      const gr = g.createRadialGradient(W / 2, H / 2, H * 0.12, W / 2, H / 2, W * 0.5);
      gr.addColorStop(0, 'rgba(253,251,245,0.9)'); gr.addColorStop(0.62, 'rgba(253,251,245,0.82)'); gr.addColorStop(1, 'rgba(253,251,245,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    });
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.3), new THREE.MeshLambertMaterial({ map: sheetTex, transparent: true, depthWrite: false }));
    sheet.rotation.x = -Math.PI / 2; sheet.position.set(0.0, 0.0004, 0.02); sheet.receiveShadow = true; sheet.renderOrder = 1; sheet.raycast = () => {}; sheet.userData.noFrame = true;
    group.add(sheet);

    // ---------------- 铁架台、升降台、酒精灯 ----------------
    const st = stand({ height: 0.3, baseW: 0.14, baseD: 0.06 });
    st.position.set(-0.24, 0, -0.055);
    const arm = st.clamp(CLAMP.y, 0.11);
    // 横杆从铁架台伸出来，再朝前接到夹试管的双爪夹上
    const jawBar = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.052, 10), paint(0x8a929e)), 0.0008);
    jawBar.rotation.x = Math.PI / 2; jawBar.position.set(0.11, 0, 0.026); arm.add(jawBar);
    const jaw = new THREE.Group();      // 兼容旧代码里的 jaw.scale
    group.add(st);
    const jack = labJack({ w: 0.075, d: 0.05, h: 0.028 });
    jack.position.set(-0.255, 0, 0); group.add(jack);
    const lamp = chemLamp();
    lamp.position.set(-0.262, 0.028, 0);
    group.add(lamp);
    const capper = lampCap(group, lamp, { off: new THREE.Vector3(-0.212, 0, 0.045) });
    let flameOn = false;
    const lampPick = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.1, 0.075), new THREE.MeshBasicMaterial({ visible: false }));
    lampPick.position.y = 0.045; lampPick.userData.pick = true; lamp.add(lampPick);

    // ---------------- 试管（口略向下）、橡胶塞、导管 ----------------
    const tube = testTube({ r: 0.0085, len: 0.15 });
    const tubeHold = new THREE.Group(); tubeHold.add(tube); group.add(tubeHold);
    const clampJaw = tubeClamp(0.0095); clampJaw.position.y = 0.1; tube.add(clampJaw);      // 夹在试管中上部（离管底 10 cm）
    const tubePick = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.11, 10), new THREE.MeshBasicMaterial({ visible: false }));     // 不盖住管口（橡胶塞在那儿）
    tubePick.position.y = 0.055; tubePick.userData.pick = true; tube.add(tubePick);
    const plug = stopper({ r1: 0.0082, r2: 0.0102, h: 0.018 });
    group.add(plug);
    const plugPick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.04, 10), new THREE.MeshBasicMaterial({ visible: false }));
    plugPick.position.y = 0.012; plugPick.userData.pick = true; plug.add(plugPick);
    const PLUG_TABLE = new THREE.Vector3(-0.03, 0.0, 0.035);       // 拔下来放在药品瓶右后方：乳胶管不从药品瓶穿过
    let stem = null, hose = null;        // 塞子里那截玻璃导管（随塞子走）、乳胶管（每次重建）
    const endPiece = new THREE.Group();   // 伸进水槽的那截玻璃导管（原点在导管口）
    const endGlass = glassTube([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.082, 0), new THREE.Vector3(-0.006, 0.09, 0), new THREE.Vector3(-0.022, 0.092, 0)]);
    const endWater = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 1, 8), paint(CHEM.water, { unique: true, transparent: true, opacity: 0.8 }));
    endWater.geometry.translate(0, 0.5, 0); endWater.scale.y = 0.0001; endWater.visible = false;
    const endPick = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.1, 8), new THREE.MeshBasicMaterial({ visible: false }));      // 比集气瓶的拾取盒更靠前：导管口在瓶里时也能抓住导管
    endPick.position.y = 0.045; endPick.userData.pick = true;
    endPiece.add(endGlass, endWater, endPick); group.add(endPiece);
    const TIP = { air: new THREE.Vector3(0.03, 0.082, 0), water: new THREE.Vector3(0.04, 0.026, 0) };
    const tipFor = (where) => (where === 'air' || where === 'water' ? TIP[where].clone() : new THREE.Vector3(SLOT[where === 'jar0' ? 0 : 1] - 0.005, MOUTH_Y + 0.009, 0));

    // ---------------- 水槽、集气瓶 ----------------
    const tr = trough({ w: 0.18, d: 0.11, h: 0.066, level: 0.052 });
    tr.position.set(0.085, 0, 0); group.add(tr);
    const jars = [0, 1].map((k) => { const j = gasJar({ r: 0.019, h: 0.075 }); group.add(j); return j; });

    // ---------------- 桌上的药品和检验用品 ----------------
    const bottle = reagentBottle({ color: CHEM.kmno4 }); bottle.position.set(-0.06, 0, 0.07); group.add(bottle);
    const spoon = spatula(); const SPOON_HOME = new THREE.Vector3(-0.03, 0.004, 0.085); spoon.position.copy(SPOON_HOME); spoon.rotation.y = -0.3; group.add(spoon);
    const spoonPick = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.025), new THREE.MeshBasicMaterial({ visible: false })); spoonPick.position.x = 0.05; spoonPick.userData.pick = true; spoon.add(spoonPick);
    const cotton = cottonBall(0.0075);
    const COTTON_HOME = new THREE.Vector3(0.106, 0.007, 0.115); cotton.position.copy(COTTON_HOME); group.add(cotton);
    const cottonPick = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); cottonPick.userData.pick = true; cotton.add(cottonPick);
    const stick = splint(); const STICK_HOME = new THREE.Vector3(0.2, 0.006, 0.09); stick.position.copy(STICK_HOME); stick.rotation.z = Math.PI / 2; group.add(stick);
    const stickPick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, 0.02), new THREE.MeshBasicMaterial({ visible: false })); stickPick.position.y = 0.065; stickPick.userData.pick = true; stick.add(stickPick);
    const wire = ironWire(); const WIRE_HOME = new THREE.Vector3(0.3, 0.006, 0.09); wire.position.copy(WIRE_HOME); wire.rotation.z = Math.PI / 2; group.add(wire);
    const wirePick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.11, 0.02), new THREE.MeshBasicMaterial({ visible: false })); wirePick.position.y = 0.04; wirePick.userData.pick = true; wire.add(wirePick);

    // ---------------- 粒子：气泡、铁丝的火星、“看看气体里”的分子 ----------------
    const bubs = new Particles({ max: 220, geometry: new THREE.SphereGeometry(1, 12, 9), material: bubble2() });
    bubs.mesh.renderOrder = 10;
    const sparks = new Sparks({ max: 360, color: 0xffe6a8, tail: 0.022 });
    const purple = new Particles({ max: 120, geometry: new THREE.SphereGeometry(1, 6, 4), material: new THREE.MeshBasicMaterial({ color: 0x8a2a7a }) });
    const drip = new Particles({ max: 60, geometry: new THREE.SphereGeometry(1, 8, 6), material: new THREE.MeshPhysicalMaterial({ color: CHEM.water, transparent: true, opacity: 0.85, roughness: 0.05, depthWrite: false }) });
    group.add(bubs.mesh, sparks.mesh, purple.mesh, drip.mesh);
    // 分子示意：红色两个球 = 氧分子 O₂；蓝色两个球 = 氮分子 N₂（空气里大约 4/5 是氮气）
    const mols = molecules({ max: 300, unit: 0.0012 });
    group.add(mols);

    const tags = { tip: tag('', 'pill'), j0: tag('', 'pill'), j1: tag('', 'pill'), tube: tag('', 'pill'), warn: tag('', 'pill warn') };

    // ---------------- 状态 ----------------
    const fresh = () => ({
      plug: 'in', powder: 0, left: 0, cotton: false, tilt: 'down', end: 'water',
      lit: false, lampX: -0.262, travel: 0, preheated: false, uneven: false, hold: false, holdT: 0,
      Tg: T0, Tp: T0, Tglass: T0, air: V_TUBE, o2: 0, suck: 0, broken: '', purple: 0,
      jars: [0, 1].map(() => ({ where: 'table', water: 1, air: 0, o2: 0, startX: null, tested: '', cracked: false })),
      seal: '', sealBubbles: 0, sealColumn: false, flow: 0, bubAcc: 0, x: 0.21, steady: 0, firstBubbleT: null,
      stoppedRight: null, removedFirst: false, seen: new Set(), test: null, view: false, t: 0, heatT: 0, demo: false, firstX: null, steadyX: null,
      plugK: 0, spoonHeld: false, stickCarry: null,      // 画面：塞子拔出了多少（0 塞着 → 1 在桌上）；药匙、木条在不在手里
    });
    let S = fresh();
    let W = null;
    const status = (m) => { if (!S.demo) W?.status(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };          // 演示里的操作不算学生的步骤
    const warn = (m) => { S.warnMsg = m; S.warnT = 3.5; };
    // 气体记录：每一步发生了什么、那时冒出 / 收集的气体里氧气约占多少（模型估计）——正确、错误的路径都有这份证据
    const log = (what, x) => { if (!S.demo) W?.log.add([String(Math.round(S.heatT)), what, x == null ? '—' : `约 ${Math.round(x * 100)}%`]); };

    // ---------------- 几何：试管方向、管口、塞子位置 ----------------
    const dir = () => new THREE.Vector3(Math.cos(S.tilt === 'down' ? -TILT : TILT * 1.6), Math.sin(S.tilt === 'down' ? -TILT : TILT * 1.6), 0);
    const bottomPos = () => CLAMP.clone().addScaledVector(dir(), -0.1);
    const mouthPos = () => CLAMP.clone().addScaledVector(dir(), 0.05);
    const powderPos = () => bottomPos().addScaledVector(dir(), 0.014);
    const placeTube = () => {
      const d = dir();
      tubeHold.position.copy(bottomPos());
      tubeHold.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
      jaw.scale.y = 1;
      // 塞子：点一下以后先顺着试管拔出来，再画一道弧放到桌上（塞回去时反过来）
      const p = plugPose();
      plug.position.copy(p.base); plug.quaternion.copy(p.q);
    };
    const ease = (x) => x * x * (3 - 2 * x);
    const qUp = new THREE.Quaternion();
    const plugPose = () => {
      const d = dir(), K = S.plugK, IN = mouthPos().addScaledVector(d, -0.01), UP = IN.clone().addScaledVector(d, 0.03);
      const qIn = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
      if (K < 0.3) return { base: IN.lerp(UP, ease(K / 0.3)), q: qIn, u: 0 };
      const u = ease((K - 0.3) / 0.7), base = UP.lerp(PLUG_TABLE, u); base.y += Math.sin(Math.PI * u) * 0.03;
      return { base, q: qIn.clone().slerp(qUp, u), u };
    };
    const rebuildHose = () => {
      const d = dir(), m = mouthPos();
      if (stem) { group.remove(stem); stem.geometry.dispose(); }
      if (hose) { group.remove(hose); hose.geometry.dispose(); }
      // 塞子里的玻璃导管跟着塞子走（塞着：沿试管轴；放在桌上：横着伸出来）
      const pp = plugPose(), axisNow = d.clone().lerp(new THREE.Vector3(1, 0, 0), pp.u).normalize(), off = new THREE.Vector3(0, 0.01, 0).multiplyScalar(pp.u);
      const a = pp.base.clone().addScaledVector(axisNow, -0.002 * (1 - pp.u)).add(off);
      const b = pp.base.clone().addScaledVector(axisNow, 0.038 - 0.008 * pp.u).add(off);
      stem = glassTube([a, b]); group.add(stem);
      const joint = endPiece.position.clone().add(new THREE.Vector3(-0.022, 0.092, 0));
      const mid1 = b.clone().add(new THREE.Vector3(0.03, 0.006, 0)), mid2 = joint.clone().add(new THREE.Vector3(-0.03, 0.012, 0));
      hose = rubberTube([b.clone().addScaledVector(d, -0.004), mid1, mid2, joint.clone().add(new THREE.Vector3(0.004, 0, 0))]);
      group.add(hose);
    };
    let lastKey = '';
    const JV = [0, 1].map(() => ({ where: 'table', anim: null }));       // 集气瓶画面上的动作（倒立着放进水槽 / 取出来正放）
    const snapJars = () => JV.forEach((v, k) => { v.where = S.jars[k].where; v.anim = null; });
    const placeAll = (h = 0) => {
      S.plugK = clamp(S.plugK + clamp((S.plug === 'in' ? 0 : 1) - S.plugK, -h * 1.5, h * 1.5), 0, 1);
      placeTube();
      const tipTarget = S.dragTip || tipFor(S.end);
      endPiece.position.lerp(tipTarget, S.dragTip ? 1 : 0.35);
      const key = `${S.plugK.toFixed(3)}|${S.tilt}|${endPiece.position.x.toFixed(4)}|${endPiece.position.y.toFixed(4)}`;
      if (key !== lastKey) { lastKey = key; rebuildHose(); }
      // 集气瓶
      jars.forEach((j, k) => {
        const J = S.jars[k], v = JV[k];
        // 放进水槽：盖着玻璃片抬起来，翻过来，移到水槽上方，放进水里，在水下抽走玻璃片；取出：反过来，正放在桌上
        if (v.where !== J.where) {
          const at = { p: j.position.clone(), r: j.rotation.x };
          if (J.where === 'trough') v.anim = { t: 0, plate: 'off', keys: [at, { p: new THREE.Vector3(at.p.x, Math.max(at.p.y, 0.12), at.p.z), r: 0 }, { p: new THREE.Vector3(SLOT[k], 0.17, 0), r: Math.PI }, { p: new THREE.Vector3(SLOT[k], MOUTH_Y + j.h, 0), r: Math.PI }] };
          else if (v.where === 'trough' && J.where === 'table') v.anim = { t: 0, plate: 'on', keys: [at, { p: new THREE.Vector3(SLOT[k], 0.17, 0), r: Math.PI }, { p: HOME[k].clone().setY(0.12), r: 0 }, { p: HOME[k].clone(), r: 0 }] };
          else if (J.where === 'table') v.anim = { t: 0, plate: '', keys: [at, { p: HOME[k].clone(), r: 0 }] };
          else v.anim = null;
          v.where = J.where;
        }
        j.plate.position.x = 0;
        if (v.anim) {
          const A2 = v.anim, n = A2.keys.length - 1; A2.t = Math.min(1, A2.t + h / (n > 1 ? 1.5 : 0.4));
          const u = ease(A2.t) * n, i = Math.min(n - 1, Math.floor(u)), f = u - i, a = A2.keys[i], b = A2.keys[i + 1];
          j.position.lerpVectors(a.p, b.p, f); j.rotation.set(a.r + (b.r - a.r) * f, 0, 0);
          j.plate.visible = true;
          if (A2.plate === 'off') { j.plate.position.x = clamp((A2.t - 0.86) / 0.14, 0, 1) * 0.045; if (A2.t >= 1) j.plate.visible = false; }
          if (A2.plate === 'on') j.plate.position.x = (1 - clamp(A2.t / 0.14, 0, 1)) * 0.045;
          if (A2.t >= 1) v.anim = null;
        } else if (J.where === 'trough') { j.position.set(SLOT[k], MOUTH_Y + j.h, 0); j.rotation.set(Math.PI, 0, 0); j.plate.visible = false; }
        else if (J.where === 'hand') { j.position.copy(S.jarDrag || HOME[k]); j.rotation.set(0, 0, 0); j.plate.visible = true; }
        else { j.position.copy(HOME[k]); j.rotation.set(0, 0, 0); j.plate.visible = !J.open; }
        j.setWater(J.where === 'trough' ? J.water : J.where === 'hand' || J.where === 'table' ? (J.air + J.o2 > 0.5 ? J.water : 1) : 1);
      });
      // 酒精灯和灯帽
      lamp.position.x = S.lampX;
      flameOn = capper.update(h, S.lit);        // 灯帽：点燃前取下放到桌上；熄灭时盖上，再轻提一下、重新盖好
      // 药匙、棉花：松手后滑回桌上；药匙拿在手里时顺着试管的方向
      if (S.spoonHeld) { spoon.rotation.y *= 0.8; spoon.rotation.z += (Math.atan2(dir().y, dir().x) - spoon.rotation.z) * 0.2; }
      else { spoon.position.lerp(SPOON_HOME, 0.2); spoon.rotation.y += (-0.3 - spoon.rotation.y) * 0.2; spoon.rotation.z *= 0.8; }
      spoon.heap.visible = !S.powder;
      if (!S.cottonDrag && !S.cotton) cotton.position.lerp(COTTON_HOME, 0.2);
      // 木条：拿在手里时跟着手（带火星的一端朝下）；用完先从瓶里抽出来，再放回桌上
      if (S.test) stick.rotation.z += (0 - stick.rotation.z) * 0.2;
      else if (S.stickCarry) { stick.position.lerp(S.stickCarry, 0.45); stick.rotation.z += (0 - stick.rotation.z) * 0.25; }
      else {
        // 先从瓶里竖直拔出来；还在瓶口正上方时只横着移开（不往下落）；移开了再落回桌上
        const overJar = HOME.some((H) => Math.hypot(stick.position.x - H.x, stick.position.z - H.z) < 0.03);
        if (overJar && stick.position.y < 0.095) stick.position.y += Math.max(0.0015, (0.1 - stick.position.y) * 0.2);
        else if (overJar) { const y = stick.position.y; stick.position.lerp(STICK_HOME, 0.15); stick.position.y = y; }
        else { stick.position.lerp(STICK_HOME, 0.15); stick.rotation.z += (Math.PI / 2 - stick.rotation.z) * 0.15; }
      }
      // 试管里的东西
      tube.setPowder(S.powder > 0 ? 0.35 + 0.65 * (S.left / DOSE) : 0, S.left < S.powder * 0.4 ? 0x2b2026 : CHEM.kmno4);
      if (S.spoonHeld && S.plug === 'out' && !S.powder && spoon.position.distanceTo(powderPos()) < 0.03) A.dose();      // 药匙伸到试管底部：把药品送进去
      tube.cotton.visible = S.cotton;
      if (!S.cottonDrag) cotton.visible = !S.cotton;
      tube.crack.visible = !!S.broken;
      tags.tube.loc(group, -0.2, 0.175, 0).text(S.broken ? '试管炸裂了' : S.plug === 'out' ? '已拔出橡胶塞' : '');
    };

    // ---------------- 动作（器材和面板共用） ----------------
    const heating = () => S.lit && Math.abs(S.lampX - powderPos().x) < 0.03 && !S.broken;
    const A = {
      plug() {
        if (S.broken) return status('试管已经炸裂了。点“再做一次”。');
        if (S.plug === 'in') {
          if (S.lit || S.Tg > 40) return status('正在加热，<b>不能拔塞子</b>。');
          S.plug = 'out'; return status(S.powder ? '拔出了橡胶塞。' : '拔出了橡胶塞。用<b>药匙</b>取一些高锰酸钾送进试管（把药匙拖到试管口），再在试管口放<b>一团棉花</b>。');
        }
        S.plug = 'in';
        if (S.powder && S.cotton) status('塞紧了橡胶塞。接下来：把一个<b>盛满水的集气瓶</b>拖进水槽，倒立在水里。');
        else if (S.powder) status('塞上了——试管口还<b>没放棉花</b>。');
        else status('塞紧了橡胶塞。');
      },
      dose() {
        if (S.broken) return;
        if (S.plug === 'in') return status('先把<b>橡胶塞拔出来</b>（点一下橡胶塞），才能装药品。');
        if (S.powder) return status('试管里已经有高锰酸钾了，<b>少量</b>就够。');
        if (S.seal !== 'ok') warn('还没有检查装置的气密性——考试要先查气密性，再装药品');
        S.powder = DOSE; S.left = DOSE; S.loadedBeforeSeal = S.seal !== 'ok';
        status('装入了少量高锰酸钾（约 2 g，紫黑色粉末）。再把<b>棉花</b>拖到试管口。');
      },
      cotton() {
        if (S.plug === 'in') return status('先拔出橡胶塞。');
        if (!S.powder) return status('先装高锰酸钾，再在试管口放棉花。');
        S.cotton = true; status('试管口放了一团棉花。点一下<b>橡胶塞</b>把它塞紧。');
      },
      tilt(v) {
        if (S.broken) return;
        S.tilt = v;
        status(v === 'down' ? '试管口<b>略向下倾斜</b>。' : '试管口朝上了——看看加热时会怎样（这是错误示范）。');
      },
      light() {
        if (S.broken) return;
        S.lit = !S.lit;
        if (S.lit) {
          if (!S.powder) { status('试管里还没有药品。'); }
          else if (S.plug !== 'in') { S.lit = false; return status('先塞好橡胶塞再加热。'); }
          else status('点燃了酒精灯。先<b>预热</b>：按住酒精灯左右来回拖，让试管均匀受热；然后停在<b>药品下方</b>加热。');
        } else {
          A.stopCheck();
        }
      },
      stopCheck() {
        if (S.stoppedRight != null || S.left > S.powder - 0.05) return;
        if (S.end === 'air') { S.stoppedRight = true; done('stop'); status('先把导管移出水面、再熄灭酒精灯——<b>顺序对了</b>。'); }
        else { S.stoppedRight = false; status('导管还在水里就熄灭了酒精灯！盯着导管：试管冷下来，气体收缩……'); }
      },
      hold(on) {
        if (S.broken) return;
        if (on && !S.lit && S.seal !== 'ok' && !S.near) near(endPiece.position.clone().add(new THREE.Vector3(-0.03, 0.03, 0)), [0.1, 0.3, 1], 0.24);
        S.hold = on && !S.lit;
        if (on && S.lit) status('正在加热，别用手握试管。');
      },
      moveEnd(where) {
        if (S.broken) return;
        if ((where === 'jar0' || where === 'jar1') && S.jars[where === 'jar0' ? 0 : 1].where !== 'trough') return status('先把集气瓶盛满水，倒立在水槽里。');
        const was = S.end; S.end = where;
        if (where === 'air' && was !== 'air') { if (S.lit && S.left < S.powder - 0.05) { S.removedFirst = true; status('导管移出了水面。现在可以<b>熄灭酒精灯</b>了（点酒精灯）。'); } }
        if (where.startsWith('jar')) {
          const J = S.jars[where === 'jar0' ? 0 : 1];
          if (J.startX == null) { J.startX = S.x; log(`开始收集集气瓶${where === 'jar0' ? '①' : '②'}`, S.x); }
          near(new THREE.Vector3(SLOT[where === 'jar0' ? 0 : 1] - 0.02, 0.055, 0), [0.12, 0.3, 1], 0.27);
          if (S.x < 0.8) status('导管口伸进了集气瓶。（这时冒出的气体里，氧气大约只占 ' + Math.round(S.x * 100) + '%——可以点“看看气体里”看看。）');
          else status('导管口伸进了集气瓶，开始收集。看瓶里的水面。');
        }
      },
      jarIn(k) {
        const J = S.jars[k];
        if (J.where !== 'table' || J.air + J.o2 > 0.5) return;
        J.where = 'trough'; J.water = 1; done('jar');
        status(`集气瓶${k ? '②' : '①'}盛满水，盖着玻璃片倒立在水槽里，在水下抽走了玻璃片。` + (S.left < S.powder ? '' : '现在点燃酒精灯加热。'));
      },
      jarOut(k) {
        const J = S.jars[k];
        if (J.where !== 'trough') return;
        if (S.end === 'jar' + k) return status('导管口还在这个集气瓶里，先把导管移开。');
        if (J.air + J.o2 < 2) { J.where = 'table'; J.water = 1; return; }
        J.where = 'table'; J.open = false; far();
        const full = J.water < 0.04;
        log(`取出集气瓶${k ? '②' : '①'}：约 ${Math.round(J.air + J.o2)} mL 气体${full ? '（集满）' : `，瓶里留有约 ${Math.round(J.water * V_JAR)} mL 水`}`, frac(J.air, J.o2));
        status(`在水面下用玻璃片盖住瓶口，取出集气瓶${k ? '②' : '①'}，<b>正放</b>在桌上（氧气的密度比空气略大）。` + (full ? '' : '瓶里还留着一点水。') + ' 可以用<b>带火星的木条</b>或<b>细铁丝</b>来检验。');
        if (!S.seen.has('collect') && J.o2 > 20) { S.seen.add('collect'); done('collect'); }
      },
      test(kind, k) {
        const J = S.jars[k];
        if (J.where !== 'table' || J.air + J.o2 < 2) return status('先收集一瓶气体，盖好玻璃片正放在桌上，再检验。');
        if (J.tested) return status(`集气瓶${k ? '②' : '①'}已经检验过了（里面的氧气用掉了一些）。换一瓶，或者再收集一瓶。`);
        const x = frac(J.air, J.o2);
        const gasH = jars[k].h * (1 - J.water);               // 瓶里气体那一段的高度
        if (gasH < (kind === 'wire' ? 0.045 : 0.022)) return status(`集气瓶${k ? '②' : '①'}里水太多，气体只有约 ${Math.round(J.air + J.o2)} mL，${kind === 'wire' ? '细铁丝' : '木条'}伸进去就碰到水了。多收集一些再检验。`);
        J.tested = kind; J.open = true;
        S.test = { kind, k, t: 0, x };
        near(HOME[k].clone().add(new THREE.Vector3(-0.01, 0.06, -0.04)), [0.05, 0.25, 1], 0.36);
        if (kind === 'splint') {
          const msg = x >= RELIGHT ? '木条<b>复燃</b>了！' : x >= BRIGHT ? '木条亮了许多，但<b>没有复燃</b>。' : '木条只是稍亮一点。';
          status(`把带火星的木条伸进集气瓶${k ? '②' : '①'}：${msg}`);
          log(`带火星的木条伸进瓶${k ? '②' : '①'}：${x >= RELIGHT ? '复燃' : x >= BRIGHT ? '很亮，未复燃' : '稍亮'}`, x);
          J.o2 *= 0.85;
        } else {
          const bare = J.water < 0.04;
          if (x >= IRON) {
            status(`细铁丝伸进集气瓶${k ? '②' : '①'}：<b>剧烈燃烧，火星四射</b>，生成黑色固体。` + (x < 0.75 ? '不过燃烧得<b>不太旺</b>，一会儿就熄灭了。' : ''));
            if (bare) { J.cracked = true; warn('瓶底没有留水，溅落的高温熔融物使瓶底炸裂了'); }
          } else status(`细铁丝伸进集气瓶${k ? '②' : '①'}：火柴烧完，铁丝只是<b>发红，没有燃烧</b>。这瓶里的氧气不够浓。`);
          log(`细铁丝伸进瓶${k ? '②' : '①'}：${x >= IRON ? (x < 0.75 ? '燃烧，但不太旺' : '剧烈燃烧，火星四射') : '只发红，不燃烧'}`, x);
          J.o2 *= 0.5;
        }
        if (!S.seen.has('test')) { S.seen.add('test'); done('test'); }
        A.maybeAsk();
      },
      // 空气中的对照：带火星的木条放在空气里；细铁丝放到酒精灯火焰上烧（实验2-1、2-4）
      airTest(kind) {
        S.test = { kind, k: -1, t: 0, x: 0.21, air: true };
        if (kind === 'splint') { status('带火星的木条放在<b>空气</b>里：只有一点火星，<b>不复燃</b>。'); log('带火星的木条在空气中：不复燃', 0.21); }
        else { status('细铁丝放在酒精灯火焰上烧：<b>红热</b>，但<b>不燃烧</b>。'); log('细铁丝在空气中（酒精灯上）加热：红热，不燃烧', 0.21); }
      },
      maybeAsk() {
        if (S.demo || !W || W.asked || !S.seen.has('first') || !S.jars.some((J) => J.tested)) return;
        W.asked = true; W.ask();
      },
      reset() {
        bubs.clear(); sparks.clear(); purple.clear(); drip.clear();
        S = fresh(); stick.setState('none'); tr.setColor(CHEM.water);
        wire.glow.material.opacity = 0; wire.wire.material.color.setHex(CHEM.iron); wire.flame.setOn(false);
        home();
        if (W) { W.qBox.hidden = true; W.next.hidden = true; W.asked = false; W.log.clear(); }
        bar.undo('seal', 'load', 'jar', 'heat', 'wait', 'collect', 'stop', 'test', 'why');
        status('全部重新摆好了，记录也清空了。');
      },
    };

    const home = () => {
      bubs.clear(); sparks.clear(); purple.clear(); drip.clear(); tr.setColor(CHEM.water);
      stick.setState('none'); stick.position.copy(STICK_HOME); stick.rotation.z = Math.PI / 2;
      wire.glow.material.opacity = 0; wire.wire.material.color.setHex(CHEM.iron); wire.flame.setOn(false); wire.position.copy(WIRE_HOME); wire.rotation.z = Math.PI / 2;
      spoon.position.copy(SPOON_HOME); spoon.rotation.set(0, -0.3, 0); cotton.position.copy(COTTON_HOME); snapJars();
    };

    // ---------------- 指针 ----------------
    const nearMouth = (p) => p.distanceTo(mouthPos()) < 0.035;
    const drag = draggable(group, [
      { obj: tubePick, plane: 'xy', offset: 0, hint: () => (S.lit ? '' : S.seal ? '上下拖：改变试管口的朝向' : '按住：用手握住试管'),
        onStart: (p) => { S.tubeDrag = p ? p.y : null; S.tubeMoved = false; A.hold(true); },
        onDrag: (p) => { if (S.tubeDrag == null || S.lit) return; const dy = p.y - S.tubeDrag; if (Math.abs(dy) > 0.02 && !S.tubeMoved) { S.tubeMoved = true; A.hold(false); A.tilt(dy > 0 ? 'up' : 'down'); } },
        onEnd: () => { A.hold(false); } },
      { obj: plugPick, plane: 'xy', offset: 0, hint: () => (S.plug === 'in' ? '点一下：拔出橡胶塞' : '点一下：塞上橡胶塞'), onTap: () => A.plug(), onStart: () => {}, onDrag: () => {}, onEnd: () => {} },
      { obj: spoonPick, plane: 'xy', offset: 0, hint: '拖到试管口：装入高锰酸钾',          // 在试管所在的竖直面里拖：对准管口不受透视影响
        enabled: () => !S.powder, onStart: () => { S.spoonHeld = true; }, onDrag: (p) => { spoon.position.set(p.x - 0.004, Math.max(0.004, p.y), p.z); },      // 学生拖时 p.z = 0；演示里从桌上一路移过来
        onEnd: () => { if (nearMouth(spoon.position.clone().setZ(0))) A.dose(); S.spoonHeld = false; } },
      { obj: cottonPick, plane: 'xy', offset: 0, hint: '拖到试管口：放一团棉花',
        enabled: () => !S.cotton, onStart: () => { S.cottonDrag = true; }, onDrag: (p) => { cotton.position.set(p.x, Math.max(0.007, p.y), p.z); },
        onEnd: () => { S.cottonDrag = false; if (nearMouth(cotton.position.clone().setZ(0))) A.cotton(); } },
      { obj: lampPick, plane: 'xy', offset: 0, hint: () => (S.lit ? '左右拖：移动酒精灯；点一下：熄灭' : '点一下：点燃酒精灯'),
        onTap: () => A.light(),
        onStart: (p) => { S.lampDrag = p ? { x: p.x, l: S.lampX } : null; },
        onDrag: (p) => { if (!S.lampDrag) return; const nx = clamp(S.lampDrag.l + (p.x - S.lampDrag.x), -0.3, -0.12); if (S.lit) S.travel += Math.abs(nx - S.lampX); S.lampX = nx; },
        onEnd: () => { S.lampDrag = null; } },
      { obj: endPick, plane: 'xy', offset: 0, hint: () => (S.end === 'air' ? '拖进水槽 / 集气瓶口' : '拖动导管口：移出水面、伸进集气瓶'),
        onDrag: (p) => { S.dragTip = new THREE.Vector3(clamp(p.x, -0.01, 0.17), clamp(p.y, MOUTH_Y + 0.006, 0.1), 0); },
        onEnd: () => {
          const p = S.dragTip; S.dragTip = null; if (!p) return;
          let where = 'air';
          if (p.y < tr.level - 0.004 && p.x > 0.0 && p.x < 0.17) where = 'water';
          for (const k of [0, 1]) if (S.jars[k].where === 'trough' && Math.abs(p.x - SLOT[k]) < 0.02 && p.y < MOUTH_Y + 0.03) where = 'jar' + k;
          A.moveEnd(where);
        } },
      ...[0, 1].map((k) => ({ obj: jars[k].pick, anchor: jars[k], plane: 'xy', offset: HOME[k].z, keepOffset: true,
        hint: () => (S.jars[k].where === 'trough' ? (S.end === 'jar' + k ? '' : '点一下：盖上玻璃片，取出正放') : S.jars[k].air + S.jars[k].o2 > 2 ? '' : '拖进水槽：倒立在水里'),
        onTap: () => { if (S.jars[k].where === 'trough') A.jarOut(k); },
        onStart: () => { if (S.jars[k].where !== 'table' || S.jars[k].air + S.jars[k].o2 > 0.5) { S.jarK = null; return; } S.jarK = k; S.jars[k].where = 'hand'; },
        onDrag: (p) => { if (S.jarK !== k) return; S.jarDrag = new THREE.Vector3(p.x, Math.max(0, p.y), HOME[k].z * clamp(1 - (p.x - HOME[k].x) / -0.12, 0, 1)); },
        onEnd: () => { if (S.jarK !== k) return; const p = S.jarDrag; S.jarDrag = null; S.jarK = null; S.jars[k].where = 'table'; if (p && p.x < 0.18 && p.x > -0.01) A.jarIn(k); } })),
      { obj: stickPick, plane: 'xy', offset: HOME[0].z, hint: '拖到集气瓶口：伸进去检验',        // 在集气瓶所在的竖直面里拖
        onStart: () => { stick.setState('ember', 0.2); S.stickCarry = stick.position.clone(); },
        onDrag: (p) => { S.stickCarry = new THREE.Vector3(p.x, Math.max(0.03, p.y), p.z); },      // 学生拖时 p.z = HOME[0].z      // 木条跟着手走（每帧滑过去一半，拿起来时不跳）
        onEnd: () => { const c = S.stickCarry || stick.position; S.stickCarry = null; const k = HOME.findIndex((H) => Math.abs(c.x - H.x) < 0.03 && c.y < 0.2); if (k >= 0) A.test('splint', k); else if (c.y > 0.06) { stick.position.copy(c); A.airTest('splint'); } else stick.setState('none'); } },
      { obj: wirePick, plane: 'xy', offset: HOME[0].z, hint: '拖到集气瓶口：点燃火柴，待火柴快燃尽时插入',
        onStart: () => { wire.rotation.z = 0; wire.flame.setOn(true); },
        onDrag: (p) => { wire.position.set(p.x, Math.max(0.03, p.y), HOME[0].z); },
        onEnd: () => { const k = HOME.findIndex((H) => Math.abs(wire.position.x - H.x) < 0.03 && wire.position.y < 0.2); if (k >= 0) A.test('wire', k); else if (S.lit && Math.abs(wire.position.x - S.lampX) < 0.03 && wire.position.y > 0.06 && wire.position.y < 0.16) A.airTest('wire'); else { wire.flame.setOn(false); wire.position.copy(WIRE_HOME); wire.rotation.z = Math.PI / 2; } } },
    ], { tip: tag('', 'pill') });
    // 演示：沿折线拖过去（先抬起来、再绕过去、再放下；kit 的 act.drag 只走直线）。pts 里可以有函数（开始时取值）；[点, 停留] 表示在那儿停一会儿
    const dragPath = (obj, pts, o) => act.path(obj, pts, o);      // 沿几个点拿过去（kit/chemlesson.js 的 act.path）
    const act = demoActs(drag, group);
    const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
    const HIGH = 0.21;          // 高过乳胶管、导管
    // 药匙走的路（手抓的点 = 勺头往右 4 mm）：抬高 → 从乳胶管上面绕到后面 → 落到试管口外 → 顺着试管伸到底，停一下 → 原路拿回来
    const spoonRoute = () => {
      const g = (v) => v.clone().add(V(0.004, 0, 0)), A0 = mouthPos().addScaledVector(dir(), 0.03), IN = bottomPos().addScaledVector(dir(), 0.04), BZ = -0.02;
      const go = [V(SPOON_HOME.x, HIGH, SPOON_HOME.z), V(A0.x, HIGH, SPOON_HOME.z), V(A0.x, HIGH, BZ), V(A0.x, A0.y, BZ), A0];
      return [g(spoon.position), ...go.map(g), [g(IN), 0.06], ...go.reverse().map(g), g(SPOON_HOME)];
    };

    // ================= 底部步骤栏 + 老师的演示（独立的一套器材） =================
    // 放映的机位用 root 坐标（group 往右挪了 0.03）
    const P = (x, y, z = 0) => [x + 0.03, y, z];
    let saved = null;
    const bar = lessonBar({
      look, back, group,         // group：提示光圈画在这一组里
      steps: [
        { id: 'seal', title: '检查气密性', todo: '导管口已经浸在水里。<b>按住试管</b>（相当于用手握住），看导管口；再松开手，看导管里。', target: () => (S.seal === 'ok' ? null : tube) },
        { id: 'load', title: '装药品', todo: '点<b>橡胶塞</b>拔出来，把<b>药匙</b>拖到试管口装入少量高锰酸钾，再把<b>棉花</b>拖到管口，最后塞紧橡胶塞。',
          target: () => (S.powder && S.cotton && S.plug === 'in' ? null : S.plug === 'in' ? plug : !S.powder ? spoon : !S.cotton ? cotton : plug) },
        { id: 'jar', title: '集气瓶装满水', todo: '把一个盛满水的<b>集气瓶</b>拖进水槽，倒立在水里。', target: () => (S.jars.some((J) => J.where === 'trough') ? null : jars[0]) },
        { id: 'heat', title: '预热、加热', todo: '点燃<b>酒精灯</b>。先按住它左右来回拖，<b>预热</b>试管；再停在<b>药品下方</b>加热。', target: () => (S.lit ? null : lamp) },
        { id: 'wait', title: '等气泡均匀', todo: '刚开始的气泡断断续续——先别收集。等导管口的气泡<b>连续、均匀</b>。' },
        { id: 'collect', title: '收集一瓶', todo: '把<b>导管口</b>拖进集气瓶。集满（瓶口冒出大气泡）后把导管移开，点<b>集气瓶</b>盖上玻璃片取出、正放。', target: () => (S.end.startsWith('jar') ? null : endPiece) },
        { id: 'stop', title: '停止加热', todo: '先把<b>导管</b>移出水面，再点<b>酒精灯</b>熄灭它。', target: () => (S.end !== 'air' ? endPiece : S.lit ? lamp : null) },
        { id: 'test', title: '检验', todo: '把<b>带火星的木条</b>伸进集好的集气瓶。（也可以试试<b>细铁丝</b>：点燃系在铁丝下端的火柴，待火柴<b>快燃尽</b>时，插入瓶中<b>预留少量水</b>的集气瓶。）', target: () => (S.test ? null : stick) },
        { id: 'why', title: '想一想', todo: '为什么刚开始有气泡放出时，不宜立即收集？在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          onStart: () => { if (!saved) saved = S; S = fresh(); S.demo = true; home(); },
          onEnd: () => { if (!saved) return; S = saved; saved = null; S.near = false; home(); bar.say('演示看完了。桌上的器材和记录还是你自己的那一套——接着往下做。', bar.current || 'end'); setTimeout(() => bar.say(null), 4000); },
          shots: [
            { cap: '加热高锰酸钾制取氧气：试管口略向下倾斜，导管口浸在水槽的水里。', dur: 3.4, cam: [P(-0.05, 0.09), [0.1, 0.22, 1], 0.78] },
            { cap: '先检查气密性：手握试管，导管口冒出气泡；松开手，导管里形成一段水柱。', dur: 3.6, cam: [P(0.03, 0.05), [0.1, 0.3, 1], 0.3], during: act.hold(tubePick, 0.04, 0.45) },
            { cap: '装入少量高锰酸钾，试管口放一团棉花，塞紧橡胶塞。', dur: 12, cam: [P(-0.11, 0.1, 0.04), [0.15, 0.32, 1], 0.5], enter: () => { S.seal = 'ok'; },
              during: act.seq(
                act.tap(plugPick, 0.02),
                // 药匙：从后面绕过乳胶管，顺着试管伸到底部把高锰酸钾送进去，再原路拿回来
                dragPath(spoonPick, spoonRoute(), { t0: 0.08, t1: 0.6, release: 0.6 }),
                // 棉花：从前面绕过乳胶管，放进试管口
                dragPath(cottonPick, [() => cotton.position.clone(), V(COTTON_HOME.x, HIGH, COTTON_HOME.z), () => mouthPos().addScaledVector(dir(), 0.03).setZ(COTTON_HOME.z).setY(HIGH), () => mouthPos().addScaledVector(dir(), 0.03).setZ(COTTON_HOME.z), () => mouthPos().addScaledVector(dir(), 0.03), () => mouthPos().addScaledVector(dir(), -0.004)], { t0: 0.63, t1: 0.84, release: 0.85 }),
                act.tap(plugPick, 0.88)) },
            { cap: '集气瓶盛满水倒立在水槽里。点燃酒精灯，先来回移动预热，再对准药品加热。', dur: 9, cam: [P(-0.03, 0.1), [0.1, 0.25, 1], 0.74],
              during: act.seq(
                dragPath(jars[0].pick, [HOME[0], V(HOME[0].x, 0.08, HOME[0].z), V(0.13, 0.11, 0)], { t0: 0.02, t1: 0.22, release: 0.23 }),
                act.tap(lampPick, 0.44),
                act.wiggle(lampPick, { t0: 0.53, t1: 0.84, amp: 0.03, hz: 0.6, dur: 9 }),
                dragPath(lampPick, [() => V(S.lampX, 0.05, 0), () => V(powderPos().x, 0.05, 0)], { t0: 0.86, t1: 0.95, release: 0.96 })) },
            { cap: '刚开始的气泡断断续续——这是试管里原有的空气，先不收集。', dur: 3.2, cam: [P(0.04, 0.04), [0.1, 0.25, 1], 0.28], speed: 2.5 },
            { cap: '气泡连续、均匀了：把导管口伸进集气瓶，开始收集。', dur: 3.6, cam: [P(0.08, 0.05), [0.12, 0.25, 1], 0.32], speed: 3,
              during: dragPath(endPick, [() => endPiece.position.clone(), () => tipFor('jar0')], { t0: 0.03, t1: 0.22, release: 0.23 }) },
            { cap: '集满后把导管移开，盖上玻璃片取出集气瓶，正放在桌上。', dur: 4.6, cam: [P(0.15, 0.06), [0.1, 0.25, 1], 0.5],
              during: act.seq(dragPath(endPick, [() => endPiece.position.clone(), TIP.water], { t0: 0.03, t1: 0.2, release: 0.21 }), act.tap(jars[0].pick, 0.28)) },
            { cap: '停止加热：先把导管移出水面，再熄灭酒精灯。', dur: 3.4, cam: [P(-0.05, 0.09), [0.1, 0.22, 1], 0.7],
              during: act.seq(dragPath(endPick, [() => endPiece.position.clone(), TIP.air], { t0: 0.03, t1: 0.3, release: 0.31 }), act.tap(lampPick, 0.55)) },
            { cap: '带火星的木条伸进集气瓶——木条复燃了：瓶里是氧气。演示完了，下面换你自己做。', dur: 6.8, cam: [P(0.21, 0.07, 0.03), [0.05, 0.25, 1], 0.36],
              during: dragPath(stickPick, [STICK_HOME, V(STICK_HOME.x, 0.12, HOME[0].z), V(HOME[0].x, 0.12, HOME[0].z), V(HOME[0].x, 0.1, HOME[0].z)], { t0: 0.02, t1: 0.22, release: 0.23 }) },
          ],
        },
      },
    });

    const pointer = {
      down: (r, e) => { if (bar.playing) { bar.stop(); return true; } return drag.down(r, e); },
      move: (r, e) => drag.move(r, e),
      up: (r, e) => drag.up(r, e),
      items: drag.items,
    };

    // ---------------- 每帧 ----------------
    const tmp = new THREE.Vector3();
    const spawnBubble = (from, vol) => bubs.spawn({ p: from.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.002, 0, (Math.random() - 0.5) * 0.003)), v: new THREE.Vector3(0, 0.02, 0), size: 0.0017 + Math.random() * 0.0008 + Math.min(0.0012, vol * 0.002), life: 3, vol });
    const step = (h) => {
      S.t += h;
      const sealed = S.plug === 'in' && !S.broken;
      // 温度：手握、加热、冷却
      const under = heating();
      if (S.lit) S.heatT += h;
      if (S.lit && !under && Math.abs(S.lampX - powderPos().x) < 0.08) S.travel += 0;      // 在试管下面来回移动由拖动计入
      if (S.lit && S.travel > 0.09 && !S.preheated) S.preheated = true;
      const heatT = under ? 340 : S.lit && Math.abs(S.lampX - powderPos().x) < 0.07 ? 110 : S.hold ? 38 : T0;
      S.Tp += (heatT - S.Tp) * Math.min(1, h * (under ? 0.22 : S.hold ? 1.4 : S.Tp < 45 ? 0.6 : heatT > S.Tp ? 0.6 : 0.12));     // 手握的那点温度，松手后很快散掉；烧热的玻璃凉得慢（预热时灯来回移，不会一下就凉下来倒吸）
      S.Tg += (Math.max(T0, (S.Tp - T0) * 0.75 + T0) - S.Tg) * Math.min(1, h * (S.Tp < 45 ? 2 : 0.9));
      S.Tglass = S.Tp;
      if (under && !S.preheated && S.Tp > 120 && !S.uneven) { S.uneven = true; warn('没有预热就对准一处加热：试管受热不均，容易炸裂'); }
      // 高锰酸钾分解
      let made = 0;
      if (S.left > 0 && S.Tp > 200) {
        const k = 0.055 * (S.Tp - 200) / 140;
        const dm = Math.min(S.left, S.left * k * h + 0.004 * h);
        S.left -= dm; made = dm * PER_G;          // 每克高锰酸钾最多放出 PER_G 毫升氧气
        S.o2 += made;
      }
      // 试管里的气体：容量随温度变（按室温毫升计）
      const cap = sealed ? V_TUBE * (T0 + 273) / (S.Tg + 273) : Infinity;
      const total = S.air + S.o2;
      const xNow = total > 0 ? S.o2 / total : 0;      // 只算放出来的氧气占多少（用于分配进集气瓶的空气 / 氧气）
      S.x = S.o2 > 1e-9 ? frac(S.air, S.o2) : 0.21;     // 真正的氧气体积分数（还没有氧气时就是空气的 21%，免得浮点误差让它抖）
      let out = 0;
      if (sealed && total > cap) {
        out = total - cap;
        S.air -= out * (1 - xNow); S.o2 -= out * xNow;
        if (S.suck > 0) { const d = Math.min(S.suck, out); S.suck -= d; out -= d; }   // 先把倒吸进导管的水压回去
      }
      // 导管口在水里、气体收缩：倒吸
      if (sealed && total < cap - 0.02 && S.end !== 'air') {
        const want = cap - total;
        const inflow = Math.min(want, h * 2.5);
        S.suck += inflow; S.air += inflow;           // 吸进去的水占了体积（这里把它当成填补体积，水柱长度由 suck 表示）
      } else if (S.end === 'air' || !sealed) S.suck = Math.max(0, S.suck - h * 4);
      if (!sealed) { S.air = V_TUBE; S.o2 = 0; }           // 敞着口：试管里就是空气
      // 冒出去的气体
      S.flow = out / h;
      if (out > 0) {
        const end = endPiece.position;
        if (S.end === 'water' || S.end === 'air') {
          if (S.end === 'water') { const u = S.hold ? 0.06 : 0.35; S.bubAcc += out; while (S.bubAcc > u) { S.bubAcc -= u; spawnBubble(end, u); } }
        } else {
          const k = S.end === 'jar0' ? 0 : 1, J = S.jars[k];
          const room = J.water * V_JAR;
          const into = Math.min(out, room);
          J.air += into * (1 - xNow); J.o2 += into * xNow;
          J.water = Math.max(0, 1 - (J.air + J.o2) / V_JAR);
          S.bubAcc += out; while (S.bubAcc > 0.35) { S.bubAcc -= 0.35; spawnBubble(end, 0.35); }
          if (out > room + 0.01) { S.overflow = (S.overflow || 0) + (out - room); if (!S.seen.has('full' + k)) { S.seen.add('full' + k); status(`集气瓶${k ? '②' : '①'}里的水排完了，瓶口有<b>大气泡</b>冒出——集满了。把导管移开，再点集气瓶，盖上玻璃片取出。`); } }
        }
        if (S.firstBubbleT == null && S.end !== 'air') S.firstBubbleT = S.t;
        if (S.lit && S.end !== 'air' && !S.seen.has('first')) { S.seen.add('first'); S.firstX = S.x; log('导管口开始冒气泡（断断续续）', S.x); done('heat'); }
      }
      // 气泡是否“连续均匀”
      S.steady += ((S.flow > 0.8 && xNow > 0.8 ? 1 : 0) - S.steady) * Math.min(1, h * 1.5);
      if (S.flow > 0.6 && xNow > 0.85 && !S.seen.has('steady') && S.end === 'water') { S.seen.add('steady'); S.steadyX = S.x; log('气泡连续、均匀', S.x); done('wait'); status('导管口的气泡<b>连续而均匀</b>了。这时把导管口伸进盛满水的集气瓶，开始收集。'); }
      // 气密性：手握时冒泡，松手后导管里有一段水柱
      if (S.hold && sealed && S.end === 'water') { S.holdT += h; if (out > 0) S.sealBubbles += out; }
      if (S.sealWait && S.suck > 0.06 && S.seal !== 'ok') { S.sealWait = false; S.seal = 'ok'; done('seal'); setTimeout(far, 2200); status('手握试管，导管口有<b>气泡冒出</b>；松开手，导管里形成了<b>一段水柱</b>——装置<b>不漏气</b>。现在点一下橡胶塞把它<b>拔出</b>，装药品。'); }
      if (!S.hold && S.holdT > 0.4) {
        if (S.sealBubbles > 0.05 && S.seal !== 'ok') { S.sealWait = true; status('手握试管，导管口冒出了<b>气泡</b>。现在松开了手——盯着导管口。'); }
        else if (S.seal !== 'ok') status(S.plug !== 'in' ? '橡胶塞没塞上，手握试管时导管口没有气泡——这样查不出来。先塞紧橡胶塞。' : S.end !== 'water' ? '导管口要先浸在水里，才能看出有没有气泡。' : '握的时间再长一点。');
        S.holdT = 0; S.sealBubbles = 0;
      }
      // 倒吸：水沿导管进到热试管里，试管炸裂
      endWater.visible = S.suck > 0.02; endWater.scale.y = Math.min(0.075, S.suck * 0.09);      // 导管内径约 2 mm：0.1 mL 水大约是 3 cm 长的水柱（画面上略缩短）
      if (S.suck > 3.0 && !S.broken && S.Tglass > 70) { S.broken = 'suck'; S.lit = false; warn('水倒吸进了热的试管，试管骤然冷却，炸裂了'); status('<b>水倒吸进热试管，试管炸裂了。</b>所以停止加热时，要<b>先把导管移出水面，再熄灭酒精灯</b>。点“再做一次”。'); }
      if (S.stoppedRight === false && S.suck > 0.3 && !S.seen.has('suckwarn')) { S.seen.add('suckwarn'); status('导管里的水在<b>往回吸</b>！赶快把导管口<b>拖出水面</b>。'); }
      if (S.stoppedRight === false && S.end === 'air' && !S.broken && S.suck < 0.05 && !S.seen.has('saved')) { S.seen.add('saved'); done('stop'); status('及时把导管拖出了水面，没有倒吸进试管。记住正确的顺序：<b>先撤导管，再熄灯</b>。'); }
      // 管口朝上加热：冷凝水倒流到试管底
      if (S.tilt === 'up' && S.Tp > 130 && !S.broken) { S.upT = (S.upT || 0) + h; if (S.upT > 2.5) { S.broken = 'tilt'; S.lit = false; warn('冷凝水倒流到热的试管底部，试管炸裂了'); status('试管口朝上，管口的<b>冷凝水倒流到热的试管底部</b>，试管炸裂了。所以试管口要<b>略向下倾斜</b>。点“再做一次”。'); } }
      // 没放棉花：粉末进入导管，水槽里的水变红
      if (!S.cotton && made > 0 && S.end !== 'air') { S.purple = Math.min(1, S.purple + h * 0.05); if (Math.random() < h * 8) purple.spawn({ p: endPiece.position.clone(), v: new THREE.Vector3((Math.random() - 0.5) * 0.01, 0.004, (Math.random() - 0.5) * 0.01), size: 0.0009, life: 2 }); if (S.purple > 0.15 && !S.seen.has('purple')) { S.seen.add('purple'); status('水槽里的水<b>变成了紫红色</b>：没放棉花，加热时高锰酸钾粉末顺着导管进到了水里。'); } }
      if (S.purple > 0) tr.setColor(new THREE.Color(CHEM.water).lerp(new THREE.Color(0xa13a8e), S.purple * 0.8).getHex(), 0.32 + S.purple * 0.2);
      // 粒子
      bubs.update(h, (p, d) => {
        p.v.y += 0.18 * d; p.p.addScaledVector(p.v, d);
        p.p.x += Math.sin(p.age * 25 + p.size * 3000) * 0.0003;
        for (const k of [0, 1]) {
          if (S.jars[k].where !== 'trough') continue;
          const inside = Math.abs(p.p.x - SLOT[k]) < 0.017 && p.p.y > MOUTH_Y;
          if (inside) { const lvl = MOUTH_Y + jars[k].h * S.jars[k].water; if (p.p.y > lvl) return false; }
        }
        return p.p.y < tr.level;
      });
      purple.update(h, (p, d) => { p.p.addScaledVector(p.v, d); p.size *= 1 + d * 0.8; return true; });
      sparks.update(h, 0.5);
      // 检验的动画
      const T = S.test;
      if (T && T.air) {
        T.t += h;
        if (T.kind === 'splint') { stick.setState('ember', 0.35); if (T.t > 3) { S.test = null; stick.setState('none'); } }
        else {
          wire.rotation.z = 0; wire.position.lerp(new THREE.Vector3(S.lampX, 0.112, 0), 0.2); wire.flame.setOn(false);
          wire.glow.material.opacity = T.t > 0.8 ? 0.55 : 0; wire.glow.material.color.setHex(0xff5a1f); wire.glow.scale.setScalar(0.035);
          if (T.t > 4) { S.test = null; wire.glow.material.opacity = 0; wire.position.copy(WIRE_HOME); wire.rotation.z = Math.PI / 2; }
        }
      } else if (T) {
        T.t += h;
        const hj = jars[T.k].h, wl = hj * S.jars[T.k].water;               // 瓶里剩的水在下面：木条、铁丝都停在水面以上的气体里
        const jarTop = HOME[T.k].clone().add(new THREE.Vector3(0, Math.max(hj * 0.55, wl + 0.02), 0));
        if (T.kind === 'splint') {
          stick.position.lerp(jarTop, 0.2);
          stick.setState(T.x >= RELIGHT && T.t > 0.6 ? 'flame' : 'ember', T.x >= RELIGHT ? 1 : T.x >= BRIGHT ? 0.9 : 0.45);
          if (T.t > 4) { S.test = null; far(); stick.setState('none'); }      // 抽出来，放回桌上
        } else {
          wire.position.lerp(HOME[T.k].clone().add(new THREE.Vector3(0, Math.min(hj - 0.04, Math.max(hj * 0.3, wl + 0.012)), 0)), 0.2); wire.rotation.z = 0;
          wire.flame.setOn(T.t < 1.2);
          const burn = T.x >= IRON && T.t > 1.1 && T.t < 1.1 + 4 * (T.x - 0.5);
          wire.glow.material.opacity = burn ? 1 : T.t > 1.1 && T.t < 3 ? 0.45 : 0; wire.glow.scale.setScalar(burn ? 0.07 : 0.035);
          wire.glow.material.color.setHex(burn ? 0xfff1c0 : 0xff6a2a);
          if (burn) { const n = Math.round((T.x - 0.5) * 60 * h * 30); const c = wire.localToWorld(new THREE.Vector3(0, 0.014, 0)); group.worldToLocal(c); for (let i = 0; i < n; i++) sparks.spawn(c.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.006, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.006)), new THREE.Vector3((Math.random() - 0.5) * 0.42, Math.random() * 0.24 - 0.06, (Math.random() - 0.5) * 0.42), 0.25 + Math.random() * 0.3); }
          if (T.t > 1.1 && T.x >= IRON) wire.wire.material.color.setHex(0x2a2a2e);
          if (T.t > 6) { S.test = null; far(); wire.flame.setOn(false); wire.glow.material.opacity = 0; wire.position.copy(WIRE_HOME); wire.rotation.z = Math.PI / 2; wire.wire.material.color.setHex(CHEM.iron); }
        }
      }
      // “看看气体里”：试管里、两个集气瓶里的分子（红 = 氧气，灰蓝 = 空气里的其他气体）
      mols.visible = S.view;
      if (S.view) {
        mols.begin();
        const put = (count, xo2, center, sx, sy, sz, q) => {
          for (let i = 0; i < count; i++) {
            const r1 = Math.sin(i * 12.9898 + S.t * 0.7) * 0.5, r2 = Math.sin(i * 78.233 + S.t * 0.9) * 0.5, r3 = Math.sin(i * 39.425 + S.t * 1.1) * 0.5;
            tmp.set(r1 * sx, r2 * sy, r3 * sz); if (q) tmp.applyQuaternion(q);
            mols.add(((i * 7) % 20) / 20 < xo2 ? 'O2' : 'N2', center.clone().add(tmp), i * 1.7 + S.t * (0.6 + (i % 5) * 0.2));      // 交错着分配：少量分子时比例也准
          }
        };
        const tot = S.air + S.o2;
        if (S.plug === 'in') put(60, frac(S.air, S.o2), bottomPos().addScaledVector(dir(), 0.075), 0.011, 0.11, 0.011, tubeHold.quaternion);
        S.jars.forEach((J, k) => {
          const g = J.air + J.o2; if (g < 0.5) return;
          const c = J.where === 'trough' ? new THREE.Vector3(SLOT[k], MOUTH_Y + jars[k].h * (1 + J.water) / 2, 0) : HOME[k].clone().add(new THREE.Vector3(0, jars[k].h * (1 + J.water) / 2, 0));
          put(Math.round(70 * g / V_JAR), frac(J.air, J.o2), c, 0.028, jars[k].h * (1 - J.water) * 0.85, 0.028, null);
        });
        mols.end();
        if (!S.seenEarly && S.lit && S.x < 0.7 && S.flow > 0.1) { S.seenEarly = true; A.maybeAsk(); }
      }
      // 标签
      const e = endPiece.position;
      tags.tip.loc(group, e.x + 0.012, e.y + 0.012, 0.01).text(S.flow > 0.05 && S.end !== 'air' ? (S.steady > 0.6 ? '气泡连续、均匀' : '断断续续地冒泡') : '');
      [0, 1].forEach((k) => {
        const J = S.jars[k], j = jars[k];
        const t = J.cracked ? '瓶底炸裂' : J.air + J.o2 > 2 ? `集气瓶${k ? '②' : '①'}` + (S.view ? `（氧气约 ${Math.round(100 * frac(J.air, J.o2))}%）` : '') : '';
        tags['j' + k].loc(group, j.position.x, J.where === 'trough' ? MOUTH_Y + j.h + 0.012 : j.position.y + j.h + 0.02, 0.01).text(t);
      });
      if (S.warnT > 0) { S.warnT -= h; tags.warn.loc(group, -0.16, 0.22, 0).text(S.warnMsg); } else tags.warn.text('');
    };

    return {
      group: root,
      pointer,
      card: false,                 // 不要实验台板：器材直接立在课本这一页上
      toggles: ['cards', 'steps'],
      size: { w: 0.66, d: 0.2, h: 0.28 },
      view: { elev: 16, azim: -8, lookY: 0.42, margin: 1.04 },
      mount(ui) {
        ui.el.classList.add('xuean');
        // 想一想：先摆出学生自己记下的“刚冒泡时 / 连续均匀后，氧气约占多少”
        const ctx = h('div', { class: 'sum-ctx' });
        const q = buttons(['试管里原有的空气受热膨胀，先被赶了出来', '刚开始的氧气温度太高，不能收集', '刚开始冒出的是水蒸气'].map((t, j) => ({ text: t, ghost: true, onClick: () => {
          if (j) return status(j === 1 ? '温度高低不影响它是不是氧气。看看“看看气体里”：刚冒出的气泡里是什么？' : '高锰酸钾是固体粉末，这里产生的气体主要不是水蒸气。看看“看看气体里”。');
          qBox.hidden = true; next.hidden = false; done('why');
          status('对。刚冒出的气泡是试管里原有的<b>空气</b>，这时就收集，瓶里会混有不少空气。还要注意：<b>木条复燃不能说明氧气纯净</b>，铁丝燃烧对氧气浓度的要求高得多。');
        } })));
        q.el.dataset.keep = '1';
        const qBox = h('div', { class: 'think', hidden: true }, h('div', { class: 'think-t' }, '想一想'), ctx, h('p', { class: 'think-q' }, '为什么刚开始有气泡放出时，不宜立即收集？'), q.el);
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const pct = (x) => (x == null ? '—' : `约 ${Math.round(x * 100)}%`);
        const ask = () => {
          ctx.innerHTML = `<div>导管口<b>刚开始</b>冒气泡时，冒出的气体里氧气 ${pct(S.firstX)}</div><div>气泡<b>连续、均匀</b>以后 ${pct(S.steadyX)}</div><div>空气里的氧气：约 21%</div>`;
          qBox.hidden = false; status('看看下面你记下的数据，回答问题。');
        };
        const view = seg('看看气体里（示意）', ['不看', '看分子'], (_, k) => { S.view = !!k; if (k && !S.near) near(bottomPos().addScaledVector(dir(), 0.1), [0.1, 0.25, 1], 0.28); });
        const tilt = seg('试管口', ['略向下倾斜', '朝上（错误示范）'], (_, k) => A.tilt(k ? 'up' : 'down'));
        const end = seg('导管口', ['水槽里', '集气瓶①', '集气瓶②', '移出水面'], (_, k) => A.moveEnd(['water', 'jar0', 'jar1', 'air'][k]));
        const btns = buttons([
          { text: '手握试管（检查气密性）', ghost: true, onClick: () => { A.hold(true); setTimeout(() => A.hold(false), 1400); } },
          { text: '拔出 / 塞上橡胶塞', ghost: true, onClick: () => A.plug() },
          { text: '装高锰酸钾', ghost: true, onClick: () => A.dose() },
          { text: '放棉花', ghost: true, onClick: () => A.cotton() },
          { text: '点燃 / 熄灭酒精灯', ghost: true, onClick: () => A.light() },
          { text: '预热，再对准药品', ghost: true, onClick: () => { if (!S.lit) return status('先点燃酒精灯。'); let i = 0; const tick = setInterval(() => { const nx = -0.262 + Math.sin(i * 0.5) * 0.04; S.travel += Math.abs(nx - S.lampX); S.lampX = nx; if (++i > 26) { clearInterval(tick); S.lampX = powderPos().x; } }, 60); } },
          { text: '集气瓶①倒立在水槽中', ghost: true, onClick: () => A.jarIn(0) },
          { text: '集气瓶②倒立在水槽中', ghost: true, onClick: () => A.jarIn(1) },
          { text: '取出集气瓶①', ghost: true, onClick: () => A.jarOut(0) },
          { text: '取出集气瓶②', ghost: true, onClick: () => A.jarOut(1) },
          { text: '带火星的木条检验瓶①', ghost: true, onClick: () => A.test('splint', 0) },
          { text: '细铁丝伸进瓶②', ghost: true, onClick: () => A.test('wire', 1) },
        ]);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), end.el, tilt.el, btns.el,
          buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const logT = table(['加热/s', '发生了什么', '氧气约占（模型）']);
        const thresholds = h('p', { class: 'fineprint', html: '说明：“氧气约占”是模型估计，不是测出来的。木条复燃（约 45% 以上）、细铁丝燃烧（约 57% 以上）所需的氧气浓度是按初中探究题里的实验数据取的近似值，随木条、铁丝粗细和条件而变；集气瓶按 60 mL 计，一药匙高锰酸钾按 2 g 计。' });
        ui.controls.append(qBox, next, view.el, more, thresholds);
        ui.data.append(logT.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '气体记录';
        W = { qBox, next, log: logT, asked: false, ask, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('可以先看<b>老师演示</b>，也可以直接动手：先检查装置的气密性。');
      },
      update(dt, t) {
        const k = bar.update(dt), h = Math.min(dt, 1 / 30) * k;
        placeAll(h);
        step(h);
        lamp.flame.setOn(flameOn); lamp.flame.update(t);
        stick.update(t); wire.flame.update(t);
        bar.near(S.near);
        if (!W || S.demo) return;
        if (S.powder && S.cotton && S.plug === 'in' && !S.seen.has('load')) { S.seen.add('load'); done('load'); }
      },
      dispose() { bar.dispose(); bubs.dispose(); purple.dispose(); drip.dispose(); },
      debug: { get S() { return S; }, A, bar, jars, tube, endPiece, mouthPos, powderPos,
        picks: { tube: tubePick, plug: plugPick, spoon: spoonPick, cotton: cottonPick, lamp: lampPick, end: endPick, jar0: jars[0].pick, jar1: jars[1].pick, stick: stickPick, wire: wirePick },
        // tools/qa.mjs --flow：从头做到尾（和学生用鼠标走的是同一套拖放处理）
        qa: qaFlow(drag, [
          { name: '握住试管', hold: tubePick, wait: 2 }, { name: '松手', release: tubePick, wait: 2.5 },
          { name: '拔塞子', tap: plugPick },
          { name: '药匙装高锰酸钾', drag: spoonPick, to: () => mouthPos().add(V(0.004, 0, 0)) },
          { name: '放棉花', drag: cottonPick, to: () => mouthPos() },
          { name: '塞紧', tap: plugPick },
          { name: '集气瓶放进水槽', drag: jars[0].pick, to: V(0.13, 0.11, 0), wait: 2 },
          { name: '点燃酒精灯', tap: lampPick },
          { name: '预热', run: () => { const d = drag.items().find((x) => x.obj === lampPick); d.onStart(V(0, 0, 0)); for (const x of [0.04, -0.03, 0.04, -0.03, 0.04, -0.03]) d.onDrag(V(x, 0, 0)); d.onEnd(); } },
          { name: '对准药品', run: () => { const d = drag.items().find((x) => x.obj === lampPick); d.onStart(V(S.lampX, 0, 0)); d.onDrag(V(powderPos().x, 0, 0)); d.onEnd(); }, wait: 10 },
          { name: '导管伸进集气瓶', drag: endPick, to: () => tipFor('jar0'), wait: 40 },
          { name: '导管移回水槽', drag: endPick, to: () => TIP.water.clone() },
          { name: '取出集气瓶', tap: jars[0].pick, wait: 2 },
          { name: '导管移出水面', drag: endPick, to: () => TIP.air.clone() },
          { name: '熄灭酒精灯', tap: lampPick },
          { name: '木条伸进集气瓶', drag: stickPick, to: () => V(HOME[0].x, 0.1, HOME[0].z), wait: 5 },
          { name: '答题', run: () => W.qBox.querySelector('button').click() },
        ]) },
    };
  },
};
