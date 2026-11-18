// 人教版高中化学必修第二册第 5 页【实验5-3】（图5-6 浓硫酸与铜反应）：在带导管的橡胶塞侧面挖一个凹槽，并嵌入下端卷成螺旋状的铜丝。
//   在试管中加入 2 mL 浓硫酸，塞好橡胶塞，使铜丝与浓硫酸接触。加热，将产生的气体通入品红溶液，观察实验现象。向外拉铜丝，终止反应。
//   冷却后，将试管里的物质慢慢倒入盛有少量水的另一支试管里，观察溶液的颜色。注意：浓硫酸具有很强的腐蚀性，在实验中应注意安全防护！
// 课本：在加热的条件下，浓硫酸与铜反应，生成硫酸铜、二氧化硫和水。2H₂SO₄(浓) + Cu △══ CuSO₄ + SO₂↑ + 2H₂O
//   在这个反应里，浓硫酸氧化了铜，自身被还原成二氧化硫。浓硫酸是氧化剂，铜是还原剂。
// 照图5-6 搭：铁架台夹住试管（管口向上倾斜），管底下面是酒精灯；橡胶塞上一根导管（中间一小段乳胶管连接），通到右边试管里的品红溶液，
//   那支试管口塞着浸 NaOH 溶液的棉团；铜丝从橡胶塞侧面的凹槽穿过，可以抽动。
// 模型（示意，界面上写明）：
//   浓硫酸 2 mL（98%，1.84 g/mL）= 36.8 mmol H₂SO₄。铜丝浸入部分约 0.3 g（4.7 mmol）。
//   温度：酒精灯把浓硫酸烧向约 240 ℃（示意；浓硫酸沸点约 338 ℃），升温时间常数 40 s、降温 50 s（实际时间）；演示和做的时候时间加快 8 倍。
//   速率：r = 0.012 mmol/s × e^{−Ea/R·(1/T − 1/503 K)} × 铜丝浸在酸里的比例（Ea 取 80 kJ/mol，示意）；室温下慢到看不出，二百多摄氏度时明显。
//     按方程式：每反应 1 mmol Cu，消耗 2 mmol H₂SO₄，生成 1 mmol CuSO₄、1 mmol SO₂（25 ℃ 约 24.5 mL）、2 mmol H₂O。
//   气体：试管 + 导管里的气体空间约 30 mL；受热膨胀和生成的 SO₂ 从导管口冒出（刚加热时冒出的是受热膨胀的空气）；冷却收缩没有画（实际可能引起倒吸，课本没写）。
//   品红：通过品红溶液（4 mL）的 SO₂ 约 60% 溶进去；红色的比例 = 1/(1 + K·c)，K 取 5000 L/mol（和“二氧化硫的漂白作用”那一课同一个示意值）。
//   其余 SO₂ 到管口的棉团，被 NaOH 溶液吸收；拿掉棉团，SO₂ 逸到空气里。
//   倒进水里：盛有 3 mL 水的试管；稀释放热按每摩尔 H₂SO₄ 约 60 kJ 算（积分溶解热，约 5 个水分子一个 H₂SO₄ 时 58 kJ/mol），
//     热容 = 试管玻璃 16 J/K + 水 4.18 J/(g·K) + 倒进去的酸 1.42 J/(g·K)；没冷却就倒，酸本身的热也算进去，到 100 ℃ 就沸腾、溅出（示意）。
//   颜色：浓硫酸里水很少，生成的 CuSO₄ 是白色固体（课本第 6 页资料卡片：硫酸铜是白色粉末，结合水后变成蓝色）；倒进水里溶解，溶液显蓝色，深浅按 Cu²⁺ 浓度。
// 看不见的东西：SO₂（青色小点，示意色，和“二氧化硫的漂白作用”一课一样；SO₂ 本身无色）、热（橙）、“钻进去看”：铜失去电子、+6 价的硫得到电子变成 SO₂（kit/cuh2so4-parts.js）。
import * as THREE from 'three';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs, mountXuean, moreBox, varyBox } from './kit/chemlesson.js';
import { draggable, clamp } from './kit/interact.js';
import { stand, textPlate } from './kit/props.js';
import { testTube, stopper, glassTube, rubberTube, chemLamp, tubeClamp, tubeRack, cottonBall } from './kit/chem.js';
import { water2, bubble2, tubeLiquid } from './kit/chemfx.js';
import { lampCap } from './kit/labops.js';
import { micro } from './kit/microworld.js';
import { cuAcidScene } from './kit/cuh2so4-parts.js';
import { sfx } from './kit/audio.js';
import { paint, inked, hull } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const DEG = Math.PI / 180;
// ---- 化学模型 ----
const SPEED = 8, T0 = 22, T_LAMP = 240, TAU_H = 40, TAU_C = 50;
const ACID_MMOL = 36.8, CU0 = 4.7, K230 = 0.012, EA_R = 80000 / 8.314, ML_PER_MMOL = 24.5;
const V_GAS = 30, PINK_ML = 4, K_DYE = 5000, ABS = 0.6;
const WATER_ML = 3, DIL = 60, CP_ACID = 1.42, RHO = 1.84, C_GLASS = 16;
const POUR_RATE = 0.5;                          // mL/s：慢慢倒
// ---- 摆放（实验局部坐标，米；桌面 y = 0）----
const TR = 0.009, TLEN = 0.16, TILT = 35 * DEG;
const D = V(Math.cos(TILT), Math.sin(TILT));    // 试管轴：管底 → 管口
const B0 = V(-0.105, 0.105, 0);                 // 夹在铁架台上时管底的位置
const along = (a) => B0.clone().addScaledVector(D, a);
const CLAMP_P = along(0.105), PLUG_A = 0.148;
const LAMP_P = V(-0.097, 0, 0);
const ROD_X = -0.05, ROD_Z = -0.07;
const XP = 0.118, PR = 0.0075, PLEN = 0.11, RACK_Y = 0.008;          // 品红溶液的试管
const XW = -0.205, WR = 0.0085, WLEN = 0.12;                        // 盛少量水的试管
const YH = along(0.19).y, CONN = [0.071, 0.085], TIP_Y = RACK_Y + 0.009;
const WIRE_A1 = 0.006, TRAVEL = 0.032, WZ = 0.0062, SP_L = 0.016, SP_R = 0.0042, WIRE_OUT = 0.205;
const PARK = V(-0.155, 0.0106, 0.03);          // 拔出来的橡胶塞（连着铜丝、导管）躺在桌上：酒精灯和盛水的试管之间，铜丝朝后
const POUR_DIR = V(Math.cos(225 * DEG), Math.sin(225 * DEG)), POUR_MOUTH = V(XW + 0.003, RACK_Y + WLEN + 0.0075);
const POUR_B = POUR_MOUTH.clone().addScaledVector(POUR_DIR, -TLEN);
const SO2C = 0x1597a8, CLEAR = new THREE.Color(0xe6eef2), PINK = new THREE.Color(0xd9367e), ACIDC = new THREE.Color(0xeef1ee), GRAYC = new THREE.Color(0xc9cccb), BLUE = new THREE.Color(0x1f78e0), WATERC = new THREE.Color(0xe4eff4);
const kAt = (T) => K230 * Math.exp(EA_R * (1 / 503 - 1 / (T + 273)));
// 竖直试管里液体的体积 → 液面高度（试管局部坐标）
const volToY = (ml, R, yc) => {
  const v = ml * 1e-6, vh = (2 / 3) * Math.PI * R ** 3;
  if (v >= vh) return yc + (v - vh) / (Math.PI * R * R);
  let lo = 0, hi = R; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if ((Math.PI * m * m * (3 * R - m)) / 3 < v) lo = m; else hi = m; }
  return yc - R + lo;
};

export default {
  id: 'cuh2so4',
  fig: '图5-6',
  title: '浓硫酸与铜反应',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '铜在金属活动性顺序里排在氢后面，不能和稀硫酸反应。把铜丝伸进<b>浓硫酸</b>里加热，会怎样？',
    hint: '课本第 5 页【实验5-3】。先猜，再看品红溶液。',
    options: ['会反应，生成一种能使品红溶液褪色的气体', '不反应，和稀硫酸一样', '会反应，放出氢气'],
    answer: 0,
  },
  need: '使铜丝与 2 mL 浓硫酸接触，加热，把产生的气体通入品红溶液；向外拉铜丝终止反应；冷却后把试管里的物质慢慢倒入盛有少量水的试管里，观察颜色',
  conclusion: {
    page: 9, rect: [64, 630, 382, 752],
    quote: '在加热的条件下，浓硫酸与铜反应，生成硫酸铜、二氧化硫和水。……在这个反应里，浓硫酸氧化了铜，自身被还原成二氧化硫。浓硫酸是氧化剂，铜是还原剂。',
    formula: '2H₂SO₄(浓) + Cu <span style="font-size:.8em">△</span>══ CuSO₄ + SO₂↑ + 2H₂O',
    why: '冷的浓硫酸里，铜丝看不出变化；<b>加热</b>以后，铜丝表面冒出气泡，通入的气体使<b>品红溶液褪色</b>——生成了<b>二氧化硫</b>。向外拉铜丝，铜丝离开浓硫酸，气泡就停了：可抽动的铜丝能让反应随时停下来，少生成有毒的 SO₂；多余的 SO₂ 被浸 NaOH 溶液的棉团吸收。<br>试管里看不出蓝色：浓硫酸里水很少，生成的硫酸铜是白色固体；冷却后慢慢倒进水里，溶液显<b>蓝色</b>——生成了<b>硫酸铜</b>。<br>铜：0 → +2，失去电子，被氧化；浓硫酸里的硫：+6 → +4，得到电子，被还原成 SO₂。所以浓硫酸是氧化剂，铜是还原剂。',
    src: '课本第 5 页 · 第五章 第一节 硫及其化合物 实验5-3',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (key, row) => { if (S.said[key]) return; S.said[key] = true; if (!S.demo) W?.tbl.add(row); };
    const near = (p, d = [0.08, 0.3, 1], dist = 0.26) => { if (S.demo || mic?.isOpen) return; S.near = true; look([p.x, p.y, p.z], d, dist, () => { S.near = false; }); };
    const pickBox = (w, hh, d) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), new THREE.MeshBasicMaterial({ visible: false })); m.userData.pick = true; return m; };
    const plate = (text, w, hh, x, z) => { const t = textPlate(text, { w, h: hh, color: '#3b4254', bg: '#fffaf0', font: `bold ${Math.floor(Math.min(0.8 * 512 * hh / w, 0.82 * 512 / text.length))}px "Songti SC", serif` }); t.position.set(x, 0.0038, z); t.rotation.x = -0.5; group.add(t); return t; };
    paperSheet(group, { w: 0.46, d: 0.27, x: -0.04, z: 0.03 });

    // ================= 铁架台、酒精灯 =================
    const st = stand({ height: 0.25, baseW: 0.11, baseD: 0.07 });
    st.position.set(ROD_X + 0.03, 0, ROD_Z); group.add(st);
    const arm = st.clamp(CLAMP_P.y, CLAMP_P.x - ROD_X);
    const jawLen = -0.013 - ROD_Z;
    const jawBar = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.0026, 0.0026, jawLen, 10), paint(0x8a929e)), 0.0008);
    jawBar.rotation.x = Math.PI / 2; jawBar.position.set(CLAMP_P.x - ROD_X, 0, jawLen / 2); arm.add(jawBar);
    const jaw = tubeClamp(0.0099); jaw.position.copy(CLAMP_P); jaw.quaternion.setFromUnitVectors(V(0, 1, 0), D); group.add(jaw);
    const lamp = chemLamp(); lamp.position.copy(LAMP_P); group.add(lamp);
    const lampPick = pickBox(0.072, 0.06, 0.072); lampPick.position.y = 0.03; lamp.add(lampPick);
    const capper = lampCap(group, lamp, { off: V(-0.122, 0, -0.082) });

    // ================= 反应的试管（tubeHold 的原点 = 管底，局部 +y = 管轴）=================
    const tube = testTube({ r: TR, len: TLEN });
    const tubeHold = new THREE.Group(); tubeHold.add(tube); group.add(tubeHold);
    const tubePick = pickBox(0.026, 0.1, 0.026); tubePick.position.y = 0.06; tube.add(tubePick);
    // 管里的液体：圆底的管子 + 一个水平的液面（随试管的姿势、液体多少重新算形状）
    const LR = TR * 0.965, LYC = TR + 0.0008, LTOP = 0.155;
    const prof = [];
    for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i / 10) * (Math.PI / 2); prof.push(new THREE.Vector2(Math.max(1e-4, Math.cos(a) * LR), LYC + Math.sin(a) * LR)); }
    for (let i = 1; i <= 30; i++) prof.push(new THREE.Vector2(LR, LYC + (i / 30) * (LTOP - LYC)));
    prof.push(new THREE.Vector2(1e-4, LTOP));
    const liqGeo = new THREE.LatheGeometry(prof, 28), liqBase = liqGeo.attributes.position.array.slice();
    const liqMat = water2({ color: ACIDC.getHex(), base: 0.22 });
    const liq = new THREE.Mesh(liqGeo, liqMat); liq.renderOrder = 9.5; liq.raycast = () => {}; tube.add(liq);
    const VCAP = (Math.PI * LR * LR * (LTOP - LYC) + (2 / 3) * Math.PI * LR ** 3) * 1e6;
    const NS = 2400, SMP = new Float32Array(NS * 3);
    for (let i = 0; i < NS;) { const x = (Math.random() * 2 - 1) * LR, z = (Math.random() * 2 - 1) * LR, y = LYC - LR + Math.random() * (LTOP - LYC + LR); if (y >= LYC ? x * x + z * z <= LR * LR : x * x + z * z + (y - LYC) ** 2 <= LR * LR) { SMP.set([x, y, z], i * 3); i++; } }
    const proj = new Float32Array(NS), order = new Uint16Array(NS);
    const LQ = { key: '', h: 0, u: V(0, 1, 0), n: 0 };
    // 平躺 / 倒的时候：液体沿着下面的管壁流成一条
    const film = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 10), liqMat); film.renderOrder = 9.5; film.visible = false; film.raycast = () => {}; tube.add(film);
    // 白色固体（无水硫酸铜）：沉在液体最低处
    const NSPK = 70, specks = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshLambertMaterial({ color: 0xf2f2ec, emissive: 0x9aa0a4, emissiveIntensity: 0.25 }), NSPK); specks.count = 0; specks.renderOrder = 9.6; specks.frustumCulled = false; specks.raycast = () => {}; tube.add(specks);
    // 热（橙）：管底一圈
    const heat = new THREE.Mesh(new THREE.CylinderGeometry(TR + 0.003, TR + 0.0035, 0.034, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); heat.position.y = 0.017; heat.renderOrder = 9.9; heat.raycast = () => {}; tube.add(heat);

    // ================= 橡胶塞 + 上半截导管 + 铜丝（一整件：拔出来就连着铜丝和导管）=================
    const O_ASM = along(PLUG_A);
    const asm = new THREE.Group(); asm.position.copy(O_ASM); group.add(asm);
    const qD = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), D);
    const plug = stopper({ r1: 0.0084, r2: 0.0104, h: 0.018 }); plug.quaternion.copy(qD); asm.add(plug);
    const plugPick = pickBox(0.03, 0.026, 0.03); plugPick.position.copy(D).multiplyScalar(0.009); plugPick.quaternion.copy(qD); asm.add(plugPick);
    const rel = (p) => p.clone().sub(O_ASM);
    const CX = along(0.19).x;
    const upPts = [along(0.152), along(0.178), along(0.186), V(CX + 0.006, YH + 0.0004), V(CX + 0.012, YH), V(CONN[0] + 0.005, YH)];
    asm.add(glassTube(upPts.map(rel)));
    // 铜丝：原点在螺旋的下端，局部 +y 沿管轴；螺旋绕着管轴，直的一段贴着管壁（z = WZ）从塞子侧面的凹槽穿出去
    const wire = new THREE.Group(); wire.quaternion.copy(qD); asm.add(wire);
    const cuMat = paint(0xc9783a, { unique: true, keep: true });
    const spPts = [];
    for (let i = 0; i <= 5 * 18; i++) { const a = (i / 18) * Math.PI * 2; spPts.push(V(Math.sin(a) * SP_R, (i / 90) * SP_L, Math.cos(a) * SP_R)); }
    spPts.push(V(0, SP_L + 0.003, WZ * 0.8), V(0, SP_L + 0.007, WZ), V(0, WIRE_OUT - WIRE_A1, WZ));
    wire.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spPts, false, 'centripetal', 0.3), 320, 0.0009, 6, false), cuMat));
    const wirePick = pickBox(0.012, 0.05, 0.016); wirePick.position.set(0, WIRE_OUT - WIRE_A1 - 0.022, WZ); wire.add(wirePick);
    const SPS = spPts.slice(0, 91).filter((_, i) => i % 3 === 0);          // 算“浸在酸里的比例”用的螺旋上的点
    const wireAnchor = (s) => along(WIRE_A1 + (1 - s) * TRAVEL);           // 铜丝原点（螺旋下端）在实验坐标里的位置
    // 躺到桌上：管轴 D → 朝前（+z），导管拐弯的方向 n → 朝右（+x），铜丝贴的那一侧（局部 +z）→ 朝下
    const nB = V(Math.sin(TILT), -Math.cos(TILT)), mS = new THREE.Matrix4().makeBasis(D, nB, D.clone().cross(nB)), mT = new THREE.Matrix4().makeBasis(V(0, 0, 1), V(1, 0, 0), V(0, 1, 0));
    const qPark = new THREE.Quaternion().setFromRotationMatrix(mT.multiply(mS.transpose())), ID = new THREE.Quaternion();

    // ================= 下半截导管、品红溶液、棉团 =================
    const downPts = [V(CONN[1] - 0.005, YH), V(XP - 0.012, YH), V(XP - 0.004, YH - 0.0015), V(XP, YH - 0.008), V(XP, YH - 0.02), V(XP, TIP_Y)];
    group.add(glassTube(downPts));
    group.add(rubberTube([V(CONN[0], YH), V(CONN[1], YH)], { r: 0.0031 }));
    const pinkRack = tubeRack({ h: 0.07 }); pinkRack.position.set(XP, 0, 0); group.add(pinkRack);
    const pinkTube = testTube({ r: PR, len: PLEN }); pinkTube.position.set(XP, RACK_Y, 0); group.add(pinkTube);
    const pinkLiq = tubeLiquid({ R: PR - 0.0004, yc: PR + 0.0008, top: PLEN - 0.01, color: PINK.getHex(), base: 0.6 }); pinkTube.add(pinkLiq);
    pinkLiq.setLevel(volToY(PINK_ML, PR - 0.0004, PR + 0.0008));
    const cotton = cottonBall(0.0072); cotton.scale.set(1.1, 0.75, 1.1); group.add(cotton);
    const COT_ON = V(XP, RACK_Y + PLEN + 0.004, 0), COT_OFF = V(XP + 0.036, 0.0055, -0.012);
    const cottonPick = pickBox(0.022, 0.016, 0.022); cotton.add(cottonPick);
    plate('品红溶液', 0.036, 0.0072, XP, 0.024);
    plate('棉团浸有 NaOH 溶液', 0.05, 0.0065, XP, 0.034);

    // ================= 盛少量水的试管 =================
    const wRack = tubeRack({ h: 0.065 }); wRack.position.set(XW, 0, 0); group.add(wRack);
    const wTube = testTube({ r: WR, len: WLEN }); wTube.position.set(XW, RACK_Y, 0); group.add(wTube);
    const wLiq = tubeLiquid({ R: WR - 0.0004, yc: WR + 0.0008, top: WLEN - 0.01, color: WATERC.getHex(), base: 0.85 }); wTube.add(wLiq);
    const wHeat = new THREE.Mesh(new THREE.CylinderGeometry(WR + 0.003, WR + 0.003, 0.03, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0, depthWrite: false })); wHeat.position.y = 0.016; wHeat.renderOrder = 9.9; wHeat.raycast = () => {}; wTube.add(wHeat);
    plate('少量水（约 3 mL）', 0.046, 0.0068, XW, 0.024);
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.0007, 0.0007, 1, 8), liqMat); stream.visible = false; stream.renderOrder = 9.5; stream.raycast = () => {}; group.add(stream);

    // ================= 气泡、SO₂ 小点、溅出的液滴 =================
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3(), p4 = new THREE.Vector3();
    const inst = (n, geo, mat, ro) => { const m = new THREE.InstancedMesh(geo, mat, n); m.count = 0; m.renderOrder = ro; m.frustumCulled = false; m.raycast = () => {}; group.add(m); return m; };
    const bubMat = bubble2({ color: 0x6f8797, white: 0.2 });
    const cuBubs = inst(60, new THREE.SphereGeometry(1, 8, 6), bubMat, 9.8), pinkBubs = inst(60, new THREE.SphereGeometry(1, 8, 6), bubMat, 9.8);
    const so2Dots = inst(160, new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: SO2C, transparent: true, opacity: 0.9, depthWrite: false }), 10);
    const drops = inst(40, new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: 0x9fc6e0 }), 10);
    const FX = { cu: [], pink: [], dots: [], drops: [], acc: 0, accP: 0, accE: 0 };
    // SO₂ 走的路：铜丝 → 试管上部 → 导管 → 品红溶液 → 棉团
    const GAS = [along(0.03), along(0.14), ...upPts.slice(1), ...downPts.slice(1)];
    const GL = [0]; for (let i = 1; i < GAS.length; i++) GL.push(GL[i - 1] + GAS[i].distanceTo(GAS[i - 1]));
    const U_STOP = GL[1], U_TIP = GL[GL.length - 1];
    const gasAt = (u) => { let i = 1; while (i < GAS.length - 1 && GL[i] < u) i++; return GAS[i - 1].clone().lerp(GAS[i], clamp((u - GL[i - 1]) / Math.max(1e-6, GL[i] - GL[i - 1]), 0, 1)); };
    const HEADN = 26, HEAD = Array.from({ length: HEADN }, (_, i) => ({ rank: (i + 0.5) / HEADN, a: 0.045 + Math.random() * 0.095, r: Math.sqrt(Math.random()) * 0.0055, th: Math.random() * 6.28, ph: Math.random() * 6 }));

    // ================= 状态 =================
    const fresh = () => ({
      demo: false, near: false, ws: 0, wsCur: 0, wDrag: false, lit: false, T: T0, cu: 0, rate: 0, contact: 0,
      air: V_GAS, so2: 0, pinkSO2: 0, naoh: 0, escaped: 0, cotton: true, cotK: 0,
      plug: 'in', plugK: 0, pour: null, poured: 0, vAcid: 2, Tw: T0, spat: false, boil: 0, heatT: 0, coolT: 0, lastFlow: 0, said: {},
    });
    S = fresh();
    const frac = () => S.so2 / Math.max(1e-6, S.air + S.so2);
    const fRed = () => 1 / (1 + K_DYE * (S.pinkSO2 / PINK_ML));
    const inClamp = () => !S.pour;
    const acidLeft = () => ACID_MMOL - 2 * S.cu;

    const A = {
      lamp() {
        if (!S.lit) {
          S.lit = true; sfx.clink({ freq: 700, gain: 0.02 });
          if (!S.pour && S.contact > 0.05) { done('heat'); status('点燃了酒精灯，加热试管里的浓硫酸。盯着<b>铜丝</b>和右边的<b>品红溶液</b>。（时间加快了 8 倍）'); }
          else if (!S.pour) status(S.said.fade ? '又点燃了酒精灯。' : '点燃了酒精灯。可是铜丝还没碰到浓硫酸：先把<b>铜丝</b>往里推。');
          return;
        }
        S.lit = false;
        if (S.contact > 0.05 && S.rate > 0.001) status('熄灭了酒精灯，可是<b>铜丝还浸在浓硫酸里</b>：试管还热，反应还在进行，要等它慢慢冷下来才停。课本的做法是<b>向外拉铜丝</b>，立刻终止反应。');
        else if (S.said.stop) status('熄灭了酒精灯（盖上灯帽）。等试管<b>冷却</b>。');
        else status('熄灭了酒精灯。');
      },
      cotton() {
        if (S.cotton) { S.cotton = false; status('拿掉了浸 NaOH 溶液的棉团。看看多余的 SO₂ 往哪里去。点一下棉团可以放回去。'); }
        else { S.cotton = true; status('棉团放回去了：多余的 SO₂ 被 NaOH 溶液吸收。'); }
      },
      plug() {
        if (S.pour) return;
        if (S.plug === 'in') {
          S.plug = 'out';
          if (S.T > 60) status(`拔出了橡胶塞（连着铜丝和导管）。试管还很烫（约 ${Math.round(S.T / 10) * 10} ℃）${frac() > 0.05 ? '，管里的 SO₂ 从试管口跑到空气里（有毒）' : ''}。`);
          else status(frac() > 0.05 ? '拔出了橡胶塞（连着铜丝和导管）。管里剩下的一点 SO₂ 从试管口散出去了。接着点<b>试管</b>，把里面的物质慢慢倒进盛有少量水的试管里。' : '拔出了橡胶塞（连着铜丝和导管）。接着点<b>试管</b>，把里面的物质慢慢倒进盛有少量水的试管里。');
          return;
        }
        if (S.vAcid <= 0.01) return status('试管已经空了。');
        S.plug = 'in'; sfx.clink({ freq: 900, gain: 0.03 }); status('塞好了橡胶塞。');
      },
      pour() {
        if (S.pour) return;
        if (S.plug === 'in') return status('先点<b>橡胶塞</b>把它拔出来（连着铜丝和导管），才能倒。');
        if (S.plugK < 1) return status('等橡胶塞和铜丝整个拿出来。');
        if (S.vAcid <= 0.01) return status('试管里的物质已经倒完了。');
        S.pour = { m: 0, dir: 1, Ta: S.T };
        if (S.lit) status('酒精灯还点着。');
        else if (S.T > 60) status(`试管还很烫（约 ${Math.round(S.T / 10) * 10} ℃）就倒了……`);
      },
      reset() {
        if (bar.playing) bar.stop();
        S = fresh(); sync(); mic.close(); back();
        W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.t3.close(); W.next.hidden = true; W.ui.relock(); }
        bar.undo('contact', 'heat', 'watch', 'stop', 'cool', 'pour', 'why');
        status('全部重新摆好了：试管里又是 2 mL 浓硫酸，铜丝在液面上方。');
      },
    };
    const clearFX = () => { FX.cu.length = FX.pink.length = FX.dots.length = FX.drops.length = 0; FX.acc = FX.accP = FX.accE = 0; };
    const sync = () => { clearFX(); capper.snap(S.lit); S.wsCur = S.ws; LQ.key = ''; };

    const drag = draggable(group, [
      { obj: wirePick, plane: 'xy', offset: WZ, keepOffset: true, anchor: wire, enabled: () => S.plug === 'in' && S.plugK < 0.01 && !S.pour,
        hint: () => (S.plug !== 'in' ? '' : S.ws > 0.5 ? '铜丝：往外拉，离开浓硫酸' : '铜丝：往里推，使铜丝与浓硫酸接触'),
        onStart: () => { S.wDrag = true; },
        onDrag: (p) => { const a = p.clone().sub(B0).dot(D); S.ws = clamp(1 - (a - WIRE_A1) / TRAVEL, 0, 1); },
        onEnd: () => { S.wDrag = false; S.ws = S.ws > 0.5 ? 1 : 0; } },
    ], { tip: tag('', 'pill'), highlight: true, taps: [
      { obj: lampPick, hint: () => (S.lit ? '酒精灯：点一下，盖上灯帽熄灭' : '酒精灯：点一下，取下灯帽点燃'), onTap: () => A.lamp() },
      { obj: cottonPick, hint: () => (S.cotton ? '浸 NaOH 溶液的棉团：点一下拿掉' : '棉团：点一下放回管口'), onTap: () => A.cotton() },
      { obj: plugPick, hint: () => (S.pour ? '' : S.plug === 'in' ? '橡胶塞：点一下拔出来（连着铜丝和导管）' : '橡胶塞：点一下塞回去'), onTap: () => A.plug() },
      { obj: tubePick, hint: () => (S.pour ? '' : S.plug === 'in' ? '试管：浓硫酸 2 mL（要倒出来，先拔出橡胶塞）' : S.vAcid > 0.01 ? '试管：点一下，把里面的物质慢慢倒进盛有少量水的试管' : '试管：已经倒空了'), onTap: () => A.pour() },
    ] });
    const act = demoActs(drag, group);
    const mic = micro({ tag, look, back, group, scene: cuAcidScene(), at: () => along(0.014), btnAt: () => along(0.05).add(V(0.0, -0.03, 0.02)), label: '钻进去看',
      state: () => ({ contact: S.contact > 0.05, hot: S.rate > 0.0015, cold: S.T < 100, made: S.cu > 0.02 }), key: () => String(S.contact > 0.05), show: () => S.plug === 'in' && S.plugK < 0.01 && !S.pour,
      bar: () => bar, scale: 0.0058, lookD: [0.05, 0.3, 1], dist: 0.26 });

    // ================= 步骤栏 + 老师演示 =================
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'contact', title: '铜丝接触浓硫酸', todo: '把<b>铜丝</b>往里推，使铜丝与浓硫酸接触。（铜丝从橡胶塞侧面的凹槽穿过，可以抽动）', target: () => (S.ws > 0.5 ? null : wirePick) },
        { id: 'heat', title: '加热', todo: '点一下<b>酒精灯</b>：取下灯帽点燃，加热试管。', target: () => (S.lit ? null : lamp) },
        { id: 'watch', title: '看品红溶液', todo: '产生的气体通入<b>品红溶液</b>：有什么现象？盯着铜丝和右边的试管。', target: () => null },
        { id: 'stop', title: '向外拉铜丝', todo: '把<b>铜丝</b>向外拉，终止反应。', target: () => (S.ws > 0.5 ? wirePick : null) },
        { id: 'cool', title: '冷却', todo: '点一下<b>酒精灯</b>熄灭它，等试管冷却。', target: () => (S.lit ? lamp : null) },
        { id: 'pour', title: '倒入水中', todo: '冷却后，点<b>橡胶塞</b>拔出来，再点<b>试管</b>：把里面的物质慢慢倒入盛有少量水的另一支试管里，观察溶液的颜色。', target: () => (S.pour ? null : S.plug === 'in' ? plug : tube) },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { sync(); mic.close(); } }),
          shots: [
            { cap: '实验5-3：橡胶塞侧面的凹槽里嵌着下端卷成螺旋状的铜丝；试管里加了 2 mL 浓硫酸，塞好了橡胶塞。把铜丝往里推，使铜丝与浓硫酸接触。', dur: 6, cam: [[-0.03, 0.13, 0], [0.06, 0.3, 1], 0.42],
              during: act.drag(wirePick, () => wireAnchor(1), { t0: 0.35, t1: 0.72, release: 0.78, from: () => wireAnchor(0) }) },
            { cap: '点燃酒精灯加热。刚开始导管口冒出的气泡，是试管里受热膨胀的空气——品红溶液不褪色。', dur: 6, speed: 1.5, cam: [[-0.01, 0.12, 0], [0.06, 0.3, 1], 0.46], during: act.tap(lampPick, 0.1) },
            { cap: '铜丝表面冒出气泡，生成的气体通入品红溶液：品红溶液褪色。多余的气体被浸 NaOH 溶液的棉团吸收。（青色小点 = SO₂，示意色）', dur: 9, speed: 2, cam: [[0.03, 0.11, 0], [0.06, 0.28, 1], 0.42] },
            { cap: '钻进去看（示意）：铜原子失去电子，变成 Cu²⁺；浓硫酸里 +6 价的硫得到电子，变成 +4 价的 SO₂。', dur: 12, cam: [[-0.093, 0.15, 0], [0.05, 0.3, 1], 0.24], enter: () => mic.open(true), during: act.at(0.98, () => mic.close()) },
            { cap: '向外拉铜丝：铜丝离开浓硫酸，气泡停了——反应终止。', dur: 5, cam: [[-0.02, 0.14, 0], [0.06, 0.3, 1], 0.4],
              during: act.drag(wirePick, () => wireAnchor(0), { t0: 0.1, t1: 0.45, release: 0.5, from: () => wireAnchor(1) }) },
            { cap: '熄灭酒精灯，等试管冷却（时间加快）。', dur: 6, speed: 4, cam: [[-0.05, 0.11, 0], [0.06, 0.3, 1], 0.44], during: act.tap(lampPick, 0.06) },
            { cap: '冷却后，拔出橡胶塞（连着铜丝和导管），把试管里的物质慢慢倒入盛有少量水的另一支试管里：溶液显蓝色——生成了硫酸铜。演示完了，换你自己做。', dur: 15, cam: [[-0.12, 0.13, 0.02], [0.05, 0.3, 1], 0.5],
              during: act.seq(act.tap(plugPick, 0.03), act.tap(tubePick, 0.22)) },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ================= 化学模型（实际时间 hh 秒）=================
    const model = (hh) => {
      const heating = S.lit && inClamp();
      const tar = heating ? T_LAMP : T0;
      S.T += (tar - S.T) * (1 - Math.exp(-hh / (tar > S.T ? TAU_H : TAU_C)));
      if (heating) S.heatT += hh; else if (S.heatT > 0) S.coolT += hh;
      // 反应：只在铜丝浸在酸里的那部分表面上
      const cuK = Math.pow(Math.max(0, CU0 - S.cu) / CU0, 2 / 3);
      S.rate = S.plug === 'in' && inClamp() ? kAt(S.T) * S.contact * cuK : 0;
      const dn = Math.min(S.rate * hh, CU0 - S.cu, acidLeft() / 2);
      S.cu += dn;
      // 试管 + 导管里的气体（25 ℃ 时的毫升数）
      const gen = dn * ML_PER_MMOL;
      S.so2 += gen;
      const Tg = T0 + 0.3 * (S.T - T0), tot = S.air + S.so2, vol = tot * (Tg + 273) / 298;
      let out = 0;
      if (S.plug === 'in') {
        if (vol > V_GAS) out = (vol - V_GAS) * 298 / (Tg + 273);
        else S.air += (V_GAS - vol) * 298 / (Tg + 273);          // 冷却收缩：示意里不画倒吸
        if (out > 0) {
          const fr = S.so2 / tot, o2 = out * fr; S.so2 -= o2; S.air -= out - o2;
          const absP = o2 * ABS; S.pinkSO2 += absP / ML_PER_MMOL;
          const rest = o2 - absP; if (S.cotton) S.naoh += rest; else S.escaped += rest;
          S.lastFlow = out / hh;
          FX.accP += out * 1.6; FX.acc += o2 * 3.2;
          if (!S.said.air && fr < 0.25 && heating) log('air', ['刚加热：导管口冒出气泡', '品红溶液<b>不褪色</b>', '冒出的是试管里受热膨胀的空气']);
        } else S.lastFlow = 0;
      } else {
        // 敞口：管里的气体慢慢和外面的空气混合；SO₂ 从管口散出去
        const a = 1 - Math.exp(-0.08 * hh), e = S.so2 * a; S.so2 -= e; S.escaped += e; S.air = Math.max(0, V_GAS * 298 / (Tg + 273) - S.so2); S.lastFlow = 0;
        FX.accE += e * 3.2 + gen * 3.2;
      }
    };

    // ================= 每帧 =================
    const tmp = new THREE.Vector3(), up = V(0, 1, 0);
    const qClamp = qD.clone(), qq = new THREE.Quaternion();
    const C1 = B0.clone().add(V(0, 0.045, 0)).addScaledVector(D, 0.08), C2 = POUR_B.clone().addScaledVector(POUR_DIR, 0.08);
    // 倒的路线：m 0→1 竖直抬出铁夹；1→2 一边转一边移到盛水的试管口（绕试管中点转，不扫过别的器材）
    const tubePose = (m) => {
      if (m <= 1) { const k = ease(m); return { pos: B0.clone().add(V(0, 0.045 * k, 0)), ang: 35 }; }
      const k = ease(m - 1), ang = 35 + 190 * k, dir = V(Math.cos(ang * DEG), Math.sin(ang * DEG));
      return { pos: C1.clone().lerp(C2, k).addScaledVector(dir, -0.08), ang };
    };
    // 拔塞子的路线：顺着管轴整根抽出来（铜丝的螺旋也出了管口）→ 往前挪 → 一边转一边移到左前方上空 → 竖直放到桌上
    const P1 = O_ASM.clone().addScaledVector(D, 0.15), P2 = P1.clone().add(V(0, 0, 0.085)), P3 = V(PARK.x, 0.17, PARK.z);
    const asmPose = (K) => {
      asm.quaternion.copy(ID);
      if (K < 0.35) asm.position.copy(O_ASM).lerp(P1, ease(K / 0.35));
      else if (K < 0.55) asm.position.copy(P1).lerp(P2, ease((K - 0.35) / 0.2));
      else if (K < 0.85) { const u = ease((K - 0.55) / 0.3); asm.position.copy(P2).lerp(P3, u); asm.quaternion.slerpQuaternions(ID, qPark, u); }
      else { asm.position.copy(P3).lerp(PARK, ease((K - 0.85) / 0.15)); asm.quaternion.copy(qPark); }
    };
    const setLiquid = (vol) => {
      // 液面：试管局部坐标里“向上”的方向 u；按体积找出液面的高度 h（取样点按 u 方向排序）
      tubeHold.updateMatrix(); qq.copy(tubeHold.quaternion).invert();
      const u = up.clone().applyQuaternion(qq);
      const key = `${u.x.toFixed(3)},${u.y.toFixed(3)},${vol.toFixed(3)}`;
      if (key === LQ.key) return; LQ.key = key; LQ.u.copy(u);
      const show = vol > 0.02, flat = u.y < 0.12;
      liq.visible = show && !flat; film.visible = show && flat;
      if (!show) { LQ.n = 0; return; }
      for (let i = 0; i < NS; i++) { proj[i] = SMP[i * 3] * u.x + SMP[i * 3 + 1] * u.y + SMP[i * 3 + 2] * u.z; order[i] = i; }
      order.sort((a, b) => proj[a] - proj[b]);
      const k = clamp(Math.round((vol / VCAP) * NS), 1, NS - 1); LQ.h = proj[order[k]]; LQ.n = k;
      if (flat) {
        const dn = V(-u.x, 0, -u.z).normalize(), r = 0.0006 + 0.0012 * Math.min(1, vol / 2);
        film.scale.set(r, TLEN - 0.006, r); film.position.copy(dn).multiplyScalar(LR - r).setY(0.003 + (TLEN - 0.006) / 2);
        return;
      }
      const pos = liqGeo.attributes.position, arr = pos.array, hL = LQ.h;
      for (let i = 0; i < arr.length; i += 3) {
        let x = liqBase[i], y = liqBase[i + 1], z = liqBase[i + 2];
        const d = x * u.x + y * u.y + z * u.z - hL;
        if (d > 0) {
          y -= d / u.y;
          if (y < LYC) { const ra = Math.sqrt(Math.max(0, LR * LR - (LYC - y) ** 2)), rr = Math.hypot(x, z); if (rr > ra) { x *= ra / rr; z *= ra / rr; } if (y < LYC - LR) y = LYC - LR; }
        }
        arr[i] = x; arr[i + 1] = y; arr[i + 2] = z;
      }
      pos.needsUpdate = true; liqGeo.computeVertexNormals();
    };
    const surfaceY = () => tubeHold.position.y + LQ.h;          // 液面在实验坐标里的高度（试管在铁夹上时）
    const finishPour = () => {
      S.pour = null;
      const blueK = clamp(cuConc() / 0.3, 0, 1);
      if (S.spat) return;
      done('pour');
      if (S.cu > 0.05) {
        log('blue', ['冷却后，把试管里的物质慢慢倒入少量水中', `溶液显<b>蓝色</b>（试管变热，约 ${Math.round(S.Tw / 5) * 5} ℃）`, '生成了<b>硫酸铜</b>：在浓硫酸里是白色固体，溶于水显蓝色']);
        status(`溶液显<b>蓝色</b>${blueK < 0.25 ? '（很淡：反应的铜不多）' : ''}——生成了硫酸铜。试管也变热了：浓硫酸溶于水放出大量的热。在左边作答。`);
      } else { log('noblue', ['把试管里的物质倒入少量水中', '溶液<b>无色</b>，试管变热', '没有生成硫酸铜（铜丝没有在热的浓硫酸里反应）']); status('溶液是无色的：铜还没有反应，没有硫酸铜。点“更多”里的“全部重来”再做一次。'); }
      if (!S.demo) { W?.t1.open(); near(V(XW, 0.06, 0), [0.1, 0.25, 1], 0.24); }
    };
    const cuConc = () => (S.poured > 0 ? (S.cu * (S.poured / 2)) / (WATER_ML + S.poured) : 0);          // mol/L
    const step = (dt, t) => {
      const H = dt * SPEED, n = Math.max(1, Math.ceil(H / 0.25));
      // 铜丝：浸在酸里的比例（螺旋上的点有几成在液面以下）
      S.wsCur += (S.ws - S.wsCur) * Math.min(1, dt * (S.wDrag ? 30 : 8));
      wire.position.copy(D).multiplyScalar(WIRE_A1 + (1 - S.wsCur) * TRAVEL - PLUG_A);
      if (S.plug === 'in' && S.plugK < 0.01 && !S.pour && LQ.n) {
        group.updateMatrixWorld(true); let c = 0;
        const hs = surfaceY();
        for (const p of SPS) { tmp.copy(p).applyQuaternion(qD).add(wire.position).add(O_ASM); if (tmp.y < hs) c++; }
        S.contact = c / SPS.length;
      } else S.contact = 0;
      for (let i = 0; i < n; i++) model(H / n);
      // 第一次看到的现象 → 记录、步骤
      if (S.contact > 0.3 && !S.said.contact) { done('contact'); log('contact', ['把铜丝往里推，铜丝与浓硫酸接触', S.T < 60 ? '没有加热：铜丝<b>没有明显变化</b>' : '铜丝浸进热的浓硫酸', S.T < 60 ? '冷的浓硫酸和铜看不出反应' : '在加热的条件下，浓硫酸与铜反应']); if (!S.lit) status('铜丝浸到浓硫酸里了：没有加热，<b>看不出变化</b>。点<b>酒精灯</b>加热。'); else done('heat'); }
      if (S.lit && S.contact > 0.05 && !S.said.heatOk) { S.said.heatOk = true; done('heat'); }
      if (S.rate > 0.002 && !S.said.bub) { log('bub', [`加热约 ${Math.round(S.heatT)} 秒`, '铜丝表面冒出<b>气泡</b>', '热的浓硫酸和铜反应，生成了气体']); status('铜丝表面冒出了气泡：反应开始了。看右边的<b>品红溶液</b>。'); }
      if (fRed() < 0.15 && !S.said.fade) { done('watch'); log('fade', ['生成的气体通入品红溶液', '品红溶液<b>褪色</b>', '生成了<b>二氧化硫</b>（SO₂ 能使品红溶液褪色）']); status('品红溶液<b>褪色</b>了：生成的气体是二氧化硫。现在把<b>铜丝</b>向外拉，终止反应。'); }
      if (S.said.fade && S.contact === 0 && S.plug === 'in' && !S.said.stop) { done('stop'); log('stop', ['向外拉铜丝，铜丝离开浓硫酸', '铜丝表面<b>不再冒气泡</b>，导管口的气泡也停了', '反应终止：可抽动的铜丝能控制反应的发生和停止']); status(S.lit ? '铜丝离开了浓硫酸：气泡停了，反应终止。接着点<b>酒精灯</b>熄灭它，等试管冷却。' : '铜丝离开了浓硫酸：反应终止。等试管冷却。'); }
      if (S.said.stop && !S.lit && S.T < 50 && !S.said.cool) { done('cool'); log('cool', ['熄灭酒精灯，等一会儿', '试管冷了；试管里的液体<b>不是蓝色</b>，有白色固体', '浓硫酸里水很少，生成的硫酸铜是白色固体']); status('试管冷却了。看试管里：<b>不是蓝色</b>，底部有白色固体。接着点<b>橡胶塞</b>拔出来，再点<b>试管</b>把里面的物质倒进水里。'); }
      if (!S.cotton && S.escaped > 0.3 && !S.said.esc) { log('esc', ['拿掉了浸 NaOH 溶液的棉团', '多余的 SO₂ 从品红溶液的试管口<b>逸到空气里</b>', 'SO₂ 有毒，会污染空气：棉团里的 NaOH 溶液能吸收它']); status('没有棉团，多余的 SO₂ 跑到空气里去了——它<b>有毒</b>。点一下<b>棉团</b>把它放回去。'); }
      // 拔塞子 / 放回去
      S.plugK = clamp(S.plugK + clamp((S.plug === 'in' ? 0 : 1) - S.plugK, -dt * 0.6, dt * 0.6), 0, 1);
      asmPose(S.plugK);
      // 棉团
      S.cotK = clamp(S.cotK + clamp((S.cotton ? 0 : 1) - S.cotK, -dt * 1.6, dt * 1.6), 0, 1);
      { const u = ease(S.cotK); cotton.position.lerpVectors(COT_ON, COT_OFF, u); cotton.position.y += Math.sin(Math.PI * u) * 0.04; }
      // 倒：抬出铁夹 → 转到盛水的试管口 → 慢慢倒 → 放回铁夹
      if (S.pour) {
        const P = S.pour;
        if (P.dir > 0) { P.m = Math.min(2, P.m + dt / (P.m < 1 ? 0.7 : 1.6)); if (P.m >= 2) P.dir = 0; }
        else if (P.dir === 0) {
          const dv = Math.min(S.vAcid, POUR_RATE * dt);
          if (dv > 0) {
            const before = S.poured; S.vAcid -= dv; S.poured += dv;
            const dm = dv * RHO, dmm = (dv / 2) * acidLeft();
            const Cw = C_GLASS + WATER_ML * 4.18 + before * RHO * CP_ACID + dm * CP_ACID;
            S.Tw += (dmm * DIL + dm * CP_ACID * (P.Ta - S.Tw)) / Cw;
            if (S.Tw >= 100) { S.Tw = 100; S.boil = 1; if (!S.spat) { S.spat = true; sfx.clink({ freq: 400, gain: 0.08 }); log('spat', [`没有冷却就倒（酸约 ${Math.round(P.Ta / 10) * 10} ℃）`, '水<b>沸腾</b>，液体<b>溅了出来</b>', '酸本身的热加上浓硫酸溶于水放出的热，超过了 100 ℃']); status(`<b>没有冷却就倒</b>：热的浓硫酸（约 ${Math.round(P.Ta / 10) * 10} ℃）倒进少量水里，放出的热让水沸腾，带着酸液<b>溅了出来</b>——非常危险。要<b>冷却后</b>再慢慢倒。点“更多”里的“全部重来”。`); } }
          } else P.dir = -1;
        } else { P.m = Math.max(0, P.m - dt / (P.m > 1 ? 1.6 : 0.7)); if (P.m <= 0) finishPour(); }
      }
      // 倒进去以后：受热的水慢慢变凉（时间加快）
      if (!S.pour || S.pour.dir !== 0) S.Tw += (T0 - S.Tw) * (1 - Math.exp(-(H * 0.25) / (C_GLASS + WATER_ML * 4.18 + S.poured * RHO * CP_ACID)));
      S.boil = Math.max(0, S.boil - dt * 0.6);
      const pose = tubePose(S.pour ? S.pour.m : 0);
      tubeHold.position.copy(pose.pos); tubeHold.quaternion.setFromAxisAngle(V(0, 0, 1), (pose.ang - 90) * DEG);
      { const m = S.pour ? S.pour.m : 0; jaw.scale.setScalar(1 + 0.5 * clamp(Math.min(m * 3, (1.3 - m) * 3), 0, 1)); }          // 抬出来的那一下松开铁夹
      setLiquid(S.vAcid);
      // 酒精灯
      lamp.flame.setOn(capper.update(dt, S.lit)); lamp.flame.update(t);
      // 试管里的液体：越来越灰白（白色的无水硫酸铜）；管底热（橙）
      const kS = clamp(S.cu / 1.2, 0, 1);
      liqMat.color.copy(ACIDC).lerp(GRAYC, 0.7 * kS);
      const ns = liq.visible ? Math.min(NSPK, Math.round(NSPK * kS), LQ.n) : 0;
      for (let i = 0; i < ns; i++) { const j = order[i * 3 % LQ.n]; p4.set(SMP[j * 3] * 0.9, SMP[j * 3 + 1], SMP[j * 3 + 2] * 0.9); s4.setScalar(0.00055 + (i % 3) * 0.00015); m4.compose(p4, q4, s4); specks.setMatrixAt(i, m4); }
      specks.count = ns; specks.instanceMatrix.needsUpdate = true;
      heat.material.opacity = clamp((S.T - 50) / 500, 0, 0.32);
      // 铜丝表面的气泡（实验坐标；在液面以下往上冒）
      if (S.rate > 0.0008 && liq.visible) {
        FX.cuAcc = (FX.cuAcc || 0) + dt * Math.min(40, S.rate * 2500);
        const hs = surfaceY();
        while (FX.cuAcc > 1) { FX.cuAcc -= 1; const p = SPS[Math.floor(Math.random() * SPS.length)]; tmp.copy(p).applyQuaternion(qD).add(wire.position).add(O_ASM); if (tmp.y < hs - 0.001 && FX.cu.length < 60) FX.cu.push({ p: tmp.clone(), v: 0.012 + Math.random() * 0.01, s: 0.0005 + Math.random() * 0.0004 }); }
      }
      {
        const hs = liq.visible ? surfaceY() : -1;
        for (let i = FX.cu.length - 1; i >= 0; i--) {
          const b = FX.cu[i]; b.p.y += b.v * dt;
          // 碰到上面的管壁就沿着管壁滑（不出玻璃）
          tmp.copy(b.p).sub(tubeHold.position); const ax = tmp.dot(D), rad = tmp.clone().addScaledVector(D, -ax); if (rad.length() > LR - 0.001) b.p.copy(tubeHold.position).addScaledVector(D, ax + b.v * dt * 1.2).add(rad.setLength(LR - 0.001));
          if (b.p.y > hs || !liq.visible) FX.cu.splice(i, 1);
        }
        FX.cu.forEach((b, i) => { s4.setScalar(b.s); m4.compose(b.p, q4, s4); cuBubs.setMatrixAt(i, m4); });
        cuBubs.count = FX.cu.length; cuBubs.instanceMatrix.needsUpdate = true;
      }
      // 品红溶液：褪色；导管口冒出的气泡
      const pinkY = RACK_Y + volToY(PINK_ML, PR - 0.0004, PR + 0.0008);
      pinkLiq.setColor(CLEAR.clone().lerp(PINK, fRed()).getHex()); pinkLiq.update(t);
      while (FX.accP > 0.06) { FX.accP -= 0.06; if (FX.pink.length < 60) FX.pink.push({ p: V(XP + (Math.random() - 0.5) * 0.002, TIP_Y + 0.001, (Math.random() - 0.5) * 0.002), v: 0.025, s: 0.0012 + Math.random() * 0.0007 }); }
      FX.accP = Math.min(FX.accP, 0.5);
      for (let i = FX.pink.length - 1; i >= 0; i--) { const b = FX.pink[i]; b.v += 0.08 * dt; b.p.y += b.v * dt; b.p.x = clamp(b.p.x + (Math.random() - 0.5) * 0.0004, XP - 0.004, XP + 0.004); if (b.p.y > pinkY - 0.001) FX.pink.splice(i, 1); }
      FX.pink.forEach((b, i) => { s4.setScalar(b.s); m4.compose(b.p, q4, s4); pinkBubs.setMatrixAt(i, m4); });
      pinkBubs.count = FX.pink.length; pinkBubs.instanceMatrix.needsUpdate = true;
      // SO₂（青色小点）：试管上部（随 SO₂ 占的比例）+ 顺着导管流到品红溶液、棉团
      const flowV = clamp(S.lastFlow * 0.6, 0, 0.12);          // 导管里的气流（实际 mL/s × 8 倍时间 ÷ 导管截面），快到看不清时封顶
      while (FX.acc > 1) { FX.acc -= 1; if (FX.dots.length < 130) FX.dots.push({ u: Math.random() * 0.01, off: V((Math.random() - 0.5) * 0.008, (Math.random() - 0.5) * 0.008, (Math.random() - 0.5) * 0.008), absorb: Math.random() < ABS, out: false, life: 1, p: V() }); }
      FX.acc = Math.min(FX.acc, 3);
      while (FX.accE > 1) { FX.accE -= 1; if (FX.dots.length < 150 && S.plug !== 'in') { const m = V(0, TLEN, 0).applyQuaternion(tubeHold.quaternion).add(tubeHold.position); FX.dots.push({ esc: true, p: m.add(V((Math.random() - 0.5) * 0.008, 0, (Math.random() - 0.5) * 0.008)), v: V((Math.random() - 0.3) * 0.01, 0.02 + Math.random() * 0.01, (Math.random() - 0.5) * 0.01), life: 1.6 }); } }
      FX.accE = Math.min(FX.accE, 3);
      for (let i = FX.dots.length - 1; i >= 0; i--) {
        const d = FX.dots[i];
        if (d.esc) { d.p.addScaledVector(d.v, dt); d.life -= dt * 0.9; if (d.life <= 0) FX.dots.splice(i, 1); continue; }
        if (d.out) { d.p.addScaledVector(d.v, dt); d.life -= dt * 0.45; if (d.life <= 0) FX.dots.splice(i, 1); continue; }
        if (d.u < U_TIP) {
          d.u += flowV * dt * (d.u < U_STOP ? 0.05 : 1) + (d.u < U_STOP ? 0.004 * dt : 0);          // 试管上部截面大，气体走得慢
          const p = gasAt(d.u); const k = d.u < U_STOP ? 0.6 : 0.12; d.p.copy(p).addScaledVector(d.off, k);
          if (S.plug !== 'in' && d.u < GL[3]) { FX.dots.splice(i, 1); continue; }
        } else {
          d.p.y += 0.03 * dt; d.p.x = XP + d.off.x * 0.3; d.p.z = d.off.z * 0.3;
          if (d.absorb && d.p.y > TIP_Y + 0.006 + Math.abs(d.off.y) * 2) { FX.dots.splice(i, 1); continue; }
          if (d.p.y > COT_ON.y - 0.004) { if (S.cotton && S.cotK < 0.5) { FX.dots.splice(i, 1); continue; } d.out = true; d.v = V((Math.random() - 0.2) * 0.012, 0.02, (Math.random() - 0.5) * 0.01); d.life = 1.6; }
        }
      }
      // 试管上部的 SO₂（塞着塞子、试管在铁夹上时）
      let nd = 0;
      FX.dots.forEach((d) => { s4.setScalar(0.0011); m4.compose(d.p, q4, s4); so2Dots.setMatrixAt(nd++, m4); });
      if (S.plugK < 0.02 && !S.pour) for (const hd of HEAD) { if (hd.rank > frac() || nd >= 160) continue; const a = hd.a + Math.sin(t * 0.5 + hd.ph) * 0.004; tmp.set(Math.cos(hd.th + t * 0.2) * hd.r, a, Math.sin(hd.th + t * 0.2) * hd.r).applyQuaternion(tubeHold.quaternion).add(tubeHold.position); if (tmp.y < surfaceY() + 0.003) continue; s4.setScalar(0.0011); m4.compose(tmp, q4, s4); so2Dots.setMatrixAt(nd++, m4); }
      so2Dots.count = nd; so2Dots.instanceMatrix.needsUpdate = true;
      // 盛水的试管：液面、颜色（蓝色深浅按 Cu²⁺ 浓度）、热、倒进去的那一股
      const wVol = WATER_ML + S.poured * (S.spat ? 0.6 : 1);
      wLiq.setLevel(volToY(wVol, WR - 0.0004, WR + 0.0008)).setColor(WATERC.clone().lerp(BLUE, clamp(cuConc() / 0.3, 0, 1)).getHex()); wLiq.update(t);
      wHeat.material.opacity = clamp((S.Tw - 35) / 500, 0, 0.07);
      const pouring = S.pour && S.pour.dir === 0 && S.vAcid > 0.005;
      stream.visible = !!pouring;
      if (pouring) {
        tubeHold.updateMatrixWorld(true);
        const dn = V(-LQ.u.x, 0, -LQ.u.z).normalize(), lip = dn.multiplyScalar(TR + 0.0006).setY(TLEN).applyMatrix4(tubeHold.matrix);
        const yTop = lip.y, yBot = RACK_Y + volToY(wVol, WR - 0.0004, WR + 0.0008);
        stream.position.set(clamp(lip.x, XW - 0.005, XW + 0.005), (yTop + yBot) / 2, 0); stream.scale.y = Math.max(0.001, yTop - yBot);
      }
      if (S.boil > 0.2 && Math.random() < dt * 40 && FX.drops.length < 40) FX.drops.push({ p: V(XW, RACK_Y + WLEN, 0), v: V((Math.random() - 0.5) * 0.12, 0.12 + Math.random() * 0.1, (Math.random() - 0.5) * 0.12), life: 1 });
      for (let i = FX.drops.length - 1; i >= 0; i--) { const d = FX.drops[i]; d.v.y -= 0.5 * dt; d.p.addScaledVector(d.v, dt); d.life -= dt; if (d.life <= 0 || d.p.y < 0.002) FX.drops.splice(i, 1); }
      FX.drops.forEach((d, i) => { s4.setScalar(0.0012); m4.compose(d.p, q4, s4); drops.setMatrixAt(i, m4); });
      drops.count = FX.drops.length; drops.instanceMatrix.needsUpdate = true;
      bar.near(S.near);
    };

    return {
      group: root, pointer, card: false, toggles: ['steps'],
      size: { w: 0.36, d: 0.2, h: 0.24 },
      view: { elev: 16, azim: -6, lookY: 0.42, frameMargin: 1.06 },
      mount(ui) {
        const ctx = () => (S.said.fade ? '<div>你的记录：加热后铜丝表面冒气泡，生成的气体使品红溶液<b class="y">褪色</b>。</div>' : '');
        const t3 = think({ q: '在这个反应里，谁是氧化剂？', options: ['浓硫酸：+6 价的硫得到电子，被还原成 SO₂', '铜：铜失去了电子', '水：反应生成了水'], wrong: ['铜失去电子、化合价升高（0 → +2），被氧化——它是还原剂。点“钻进去看”，看电子从哪里到哪里。', '水是生成物，没有得失电子。'], ok: '对：浓硫酸氧化了铜，自身被还原成二氧化硫。浓硫酸是氧化剂，铜是还原剂（课本第 5 页）。', status: (m) => W?.status(m), onOk: () => { done('why'); if (W) W.next.hidden = false; } });
        const t2 = think({ q: '向外拉铜丝，反应就停止了。为什么要用可以抽动的铜丝？', options: ['铜丝离开浓硫酸，反应就停止：可以控制反应的发生和停止，少生成有毒的 SO₂', '拉出来的铜丝冷得快，试管就不会炸裂', '可以增大铜和浓硫酸的接触面积，反应更快'], wrong: ['看看你的记录：铜丝一离开浓硫酸，气泡就停了——停的是反应。', '把铜丝往外拉，接触面积变小了；可抽动是为了随时让反应停下来。'], ok: '对：铜丝浸进去就反应、拉出来就停，需要多少 SO₂ 就生成多少；多余的 SO₂ 有毒，用浸 NaOH 溶液的棉团吸收。', status: (m) => W?.status(m), onOk: () => t3.open() });
        const t1 = think({ q: '生成的气体使品红溶液褪色。这种气体是什么？', ctx, options: ['二氧化硫 SO₂', '氢气 H₂', '氧气 O₂'], wrong: ['铜在氢后面，不能把酸里的氢置换出来；氢气也不能使品红溶液褪色。', '氧气不能使品红溶液褪色。'], ok: '对：二氧化硫具有漂白作用，能使品红溶液褪色（课本第 4 页）。所以浓硫酸和铜反应生成了 SO₂。', status: (m) => W?.status(m), onOk: () => t2.open() });
        const vary = varyBox('课本的注意事项：浓硫酸具有很强的腐蚀性，注意安全防护。可以试试：不加热，只让铜丝浸在浓硫酸里；熄灭酒精灯但不拉出铜丝；拿掉管口的棉团；不等冷却就倒进水里。', h('span', {}));
        const more = moreBox([['钻进去看', () => mic.open()], ['拿掉 / 放回棉团', () => A.cotton()]], () => A.reset());
        const note = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'), h('p', { class: 'fineprint', html: '浓硫酸 2 mL（98%，1.84 g/mL）= 36.8 mmol H₂SO₄；铜丝浸入的部分约 0.3 g。<b>时间加快 8 倍</b>：酒精灯把浓硫酸烧向约 240 ℃（示意；浓硫酸沸点约 338 ℃）。<br>反应速率随温度升高而增大（按活化能 80 kJ/mol 估计，<b>示意</b>）：室温下慢到看不出，二百多摄氏度时明显；和铜丝浸在酸里的比例成正比，铜丝拉出来就是 0。生成的 SO₂、CuSO₄、H₂O 按方程式算（每 1 mmol Cu 生成 1 mmol SO₂，25 ℃ 约 24.5 mL）。<br>试管 + 导管里的气体约 30 mL：先冒出的是受热膨胀的空气。通过品红溶液（4 mL）的 SO₂ 约 60% 溶进去；红色的比例按 1/(1 + K·c)，K 取 5000 L/mol（示意值，和“二氧化硫的漂白作用”一课相同）。其余的 SO₂ 被棉团里的 NaOH 溶液吸收。停止加热后气体冷却收缩，实际可能使品红溶液倒吸，课本这里没有写，模型没有画。<br>倒进 3 mL 水：稀释放热按每摩尔 H₂SO₄ 约 60 kJ（积分溶解热），热容 = 试管玻璃约 16 J/K + 水 + 倒进去的酸（1.42 J/(g·K)）；没冷却就倒，酸本身的热也算进去，到 100 ℃ 就沸腾溅出（示意）。<br>浓硫酸里水很少，生成的 CuSO₄ 是白色固体（课本第 6 页资料卡片：硫酸铜是白色粉末，结合水后变成蓝色），溶于水显蓝色，深浅按 Cu²⁺ 浓度。实际试管里常还有少量黑色物质，课本没有提到，这里没画。<br>青色小点 = SO₂（概念色，实际无色）；橙色 = 热。“钻进去看”是慢放示意，不表示真实的反应步骤。' }));
        const base = mountXuean(ui, { controls: [vary, more, note], headers: ['做了什么', '现象', '说明'], intro: '图5-6 的装置：橡胶塞侧面的凹槽里嵌着下端卷成螺旋状的铜丝；试管里加了 2 mL 浓硫酸，塞好了橡胶塞，铜丝下端还在液面上方。这是老师演示的实验：浓硫酸腐蚀性很强，注意安全防护。' });
        ui.data.append(t1.el, t2.el, t3.el, base.next);
        W = { ...base, ui, t1, t2, t3, status: ui.status }; bar.attach(ui);
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); mic.update(dt, k); },
      dispose() { bar.dispose(); drag.dispose(); mic.dispose?.(); },
      debug: {
        get S() { return S; }, bar, A, mic, fRed, wireAnchor,
        picks: { wire: wirePick, lamp: lampPick, cotton: cottonPick, plug: plugPick, tube: tubePick },
        qa: qaFlow(drag, [
          { name: '推铜丝', drag: wirePick, to: () => wireAnchor(1).setZ(WZ), wait: 1 },
          { name: '点燃酒精灯', tap: lampPick, wait: 1 },
          { name: '等品红褪色', run: () => {}, wait: 8 },
          { name: '钻进去看', run: () => mic.open(), wait: 6 },
          { name: '合上', run: () => mic.close(), wait: 1 },
          { name: '拿掉棉团', tap: cottonPick, wait: 2 },
          { name: '放回棉团', tap: cottonPick, wait: 1 },
          { name: '拉出铜丝', drag: wirePick, to: () => wireAnchor(0).setZ(WZ), wait: 1 },
          { name: '熄灭酒精灯', tap: lampPick, wait: 6 },
          { name: '拔出橡胶塞', tap: plugPick, wait: 2 },
          { name: '倒入水中', tap: tubePick, wait: 8, scale: 2 },
          { name: '核对', run: () => { if (!(S.said.fade && S.said.stop && S.said.cool && S.said.blue && !S.spat)) throw new Error(JSON.stringify({ said: S.said, T: S.T, cu: S.cu, f: fRed(), spat: S.spat, pour: S.pour })); }, wait: 1 },
          { name: '想一想 1', run: () => W.t1.el.querySelector('button').click() },
          { name: '想一想 2', run: () => W.t2.el.querySelector('button').click() },
          { name: '想一想 3', run: () => W.t3.el.querySelector('button').click() },
        ]),
      },
    };
  },
};
