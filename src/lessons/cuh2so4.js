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
//   倒进水里：盛有 3 mL 水的试管。接收管里记着 H₂SO₄、水、CuSO₄ 各多少（倒进去多少就加多少，溅出去按比例一起减）。
//     放热 = 积分溶解热 nA·ΔH(n) 的增量，再扣掉这一份进料（98% 的酸里本来就有的 2% 水）自己已经放过的那部分
//     （ΔH(n)：每摩尔 H₂SO₄ 溶进 n 摩尔水放出的热，Perry 化学工程手册的数表，约值）；
//     热容 = 试管玻璃 16 J/K + 溶液（比热按 4.18 与 1.42 J/(g·K) 按质量分数插值）；每一份酸按它真正倒进水里时的温度算
//     （倒的动画里试管也在变凉，时间同样加快 8 倍）。
//     沸点按混合液的质量分数查硫酸水溶液常压沸点表（约值：50% 约 124 ℃，70% 约 166 ℃）。
//     局部飞溅（示意）：新倒进去的一小股酸先和约 1.5 倍质量的周围液体混合，这一小团的温度超过它自己浓度的沸点就局部沸腾、溅出液滴；
//     按这个示意模型，冷却到 50 ℃ 以下慢慢倒不会溅；熄灯、拔塞后马上倒（点倒的时候还在约 160 ℃ 以上）会溅。
//     没等冷却就倒（开始倒时试管还没冷到 50 ℃ 以下）：不管溅没溅，都照实记录、不算完成这一步，提示重做。
//   颜色：浓硫酸里水很少，生成的 CuSO₄ 是白色固体（课本第 6 页资料卡片：硫酸铜是白色粉末，结合水后变成蓝色）；倒进水里溶解，溶液显蓝色，深浅按 Cu²⁺ 浓度。
// 看不见的东西：SO₂（青色小点，示意色，和“二氧化硫的漂白作用”一课一样；SO₂ 本身无色）、热（橙）、“钻进去看”：铜失去电子、+6 价的硫得到电子变成 SO₂（kit/cuh2so4-parts.js）。
import * as THREE from 'three';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs, mountXuean, moreBox, varyBox } from './kit/chemlesson.js';
import { draggable, clamp } from './kit/interact.js';
import { stand, textPlate } from './kit/props.js';
import { testTube, stopper, glassTube, rubberTube, chemLamp, tubeClamp, tubeRack, cottonBall, glassMat } from './kit/chem.js';
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
const WATER_ML = 3, CP_ACID = 1.42, C_GLASS = 16, LOCAL_R = 1.5;
const POUR_RATE = 0.25;                         // 每秒倒出管里物质的 1/4（约 0.5 mL/s）：慢慢倒
// 积分溶解热 ΔH(n)：1 mol H₂SO₄(l) 溶进 n mol 水放出的热（kJ/mol，约值）；硫酸水溶液常压沸点（质量分数 % → ℃，约值）
const HSOL = [[0, 0], [0.5, 15.7], [1, 28.1], [2, 41.9], [3, 48.9], [4, 54.1], [5, 58.0], [10, 67.0], [20, 71.5], [50, 73.3], [100, 74.0], [1000, 79], [1e6, 96]];
const BPT = [[0, 100], [10, 102], [20, 104], [30, 107], [40, 113], [50, 124], [60, 141], [70, 166], [80, 203], [90, 262], [98, 338]];
const lin = (T, x) => { if (x <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (x <= T[i][0]) { const [a, b] = T[i - 1], [c, d] = T[i]; return b + ((d - b) * (x - a)) / (c - a); } return T[T.length - 1][1]; };
const enth = (mA, mW) => { const nA = mA / 98.08; return nA > 0 ? nA * lin(HSOL, mW / 18.015 / nA) * 1000 : 0; };          // J
const cMix = (mA, mW) => { const w = mA / Math.max(1e-9, mA + mW); return 4.18 * (1 - w) + 1.42 * w; };
const bpOf = (mA, mW) => lin(BPT, (100 * mA) / Math.max(1e-9, mA + mW));
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
const MOUTH0 = along(TLEN), CYL_HOME = V(0.06, 0, -0.065), CYL_H = 0.092, CYL_LIQ = 0.013;          // 夹着时的管口；量筒放在桌上的位置、高度、2 mL 时的液柱高
const SO2C = 0x1597a8, CLEAR = new THREE.Color(0xe6eef2), PINK = new THREE.Color(0xd9367e), ACIDC = new THREE.Color(0xeef1ee), GRAYC = new THREE.Color(0xc9cccb), BLUE = new THREE.Color(0x1f78e0), WATERC = new THREE.Color(0xe4eff4), WHITEC = new THREE.Color(0xf2f2ec), DARKC = new THREE.Color(0x3a3c40);
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
    quote: '在加热的条件下，浓硫酸与铜反应，生成硫酸铜、二氧化硫和水。 2H2SO4(浓) + Cu △= CuSO4 + SO2↑ + 2H2O 在这个反应里，浓硫酸氧化了铜，自身被还原成二氧化硫。浓硫酸是氧化剂，铜是还原剂。',
    formula: '2H₂SO₄(浓) + Cu <span style="font-size:.8em">△</span>══ CuSO₄ + SO₂↑ + 2H₂O',
    why: '冷的浓硫酸里，铜丝看不出变化；<b>加热</b>以后，铜丝表面冒出气泡，通入的气体使<b>品红溶液褪色</b>——生成了<b>二氧化硫</b>。向外拉铜丝，铜丝离开浓硫酸，铜丝表面就不再产生气泡，不再生成 SO₂（导管口的气泡随后渐渐停下）：可抽动的铜丝能让反应停下来，少生成有毒的 SO₂；多余的 SO₂ 被浸 NaOH 溶液的棉团吸收。<br>试管里看不出蓝色：浓硫酸里水很少，生成的硫酸铜没有溶解成蓝色溶液，是灰白色的固体；冷却后慢慢倒进水里，溶液显<b>蓝色</b>——生成了<b>硫酸铜</b>。<br>铜：0 → +2，失去电子，被氧化；浓硫酸里的硫：+6 → +4，得到电子，被还原成 SO₂。所以浓硫酸是氧化剂，铜是还原剂。',
    src: '课本第 5 页 · 第五章 第一节 硫及其化合物 实验5-3',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (key, row) => { if (S.said[key]) return; S.said[key] = true; if (!S.demo) W?.tbl.add(row); };
    const near = (p, d = [0.08, 0.3, 1], dist = 0.26) => { if (S.demo || mic?.isOpen) return; S.near = true; lastLook = [[p.x, p.y, p.z], d, dist]; look(...lastLook, () => { S.near = false; }); };
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
    // 液体体积用固定的格点来量（不随机：同一个姿势、同样多的液体，液面每次都一样）；每个格点代表 GS × GS × GY 的体积
    const GS = LR / 7, GY = 0.0016, SL = [];
    for (let y = LYC - LR + GY / 2; y < LTOP; y += GY) for (let x = -LR + GS / 2; x < LR; x += GS) for (let z = -LR + GS / 2; z < LR; z += GS) if (y >= LYC ? x * x + z * z <= LR * LR : x * x + z * z + (y - LYC) ** 2 <= LR * LR) SL.push(x, y, z);
    const NS = SL.length / 3, SMP = Float32Array.from(SL), DV = GS * GS * GY * 1e6;          // mL / 格点
    const proj = new Float32Array(NS), order = new Uint16Array(NS);
    const LQ = { key: '', h: 0, u: V(0, 1, 0), n: 0 };
    // 平躺 / 倒的时候：液体沿着下面的管壁流成一条
    const film = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 10), liqMat); film.renderOrder = 9.5; film.visible = false; film.raycast = () => {}; tube.add(film);
    // 白色固体（无水硫酸铜）：沉在液体最低处
    const NSPK = 70, specks = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x9aa0a4, emissiveIntensity: 0.25 }), NSPK); for (let i = 0; i < NSPK; i++) specks.setColorAt(i, WHITEC); specks.count = 0; specks.renderOrder = 9.6; specks.frustumCulled = false; specks.raycast = () => {}; tube.add(specks);
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
    const wireGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0009, 0.034, 6), cuMat); wireGrip.position.set(0, WIRE_OUT - WIRE_A1 - 0.02, WZ); wireGrip.raycast = () => {}; wire.add(wireGrip);          // 露在塞子外、手捏的那一段（提示光圈套在这里）
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
    // 量筒（10 mL）：原点在底座中心，局部 +y 朝上；老师演示里用它量取 2 mL 浓硫酸
    const cyl = new THREE.Group(); group.add(cyl);
    { const pts = [new THREE.Vector2(0.0003, 0.003), new THREE.Vector2(0.0072, 0.003), new THREE.Vector2(0.0072, CYL_H - 0.002), new THREE.Vector2(0.0085, CYL_H)];
      const g = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), glassMat()); g.renderOrder = 9; cyl.add(g);
      const foot = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.014, 0.003, 24), paint(0xdfe6ea)), { width: 0.6 }); foot.position.y = 0.0015; cyl.add(foot);
      const lab = textPlate('浓硫酸', { w: 0.018, h: 0.006, color: '#7a2a20', bg: '#fffaf0', font: 'bold 120px "Songti SC", serif' }); lab.position.set(0, 0.062, 0.0076); cyl.add(lab);
      // 刻度：每 2 mL 一条（10 mL 量筒），2 mL 那条标出来
      const tick = new THREE.LineBasicMaterial({ color: 0x5d6b78 });
      for (let k = 1; k <= 5; k++) { const y = 0.0032 + k * CYL_LIQ, pts2 = []; for (let i = 0; i <= 8; i++) { const a = -0.6 + (i / 8) * 1.2; pts2.push(new THREE.Vector3(Math.sin(a) * 0.0074, y, Math.cos(a) * 0.0074)); } cyl.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts2), tick)); }
      const t2 = textPlate('2 mL', { w: 0.011, h: 0.0045, color: '#3b4254', bg: 'rgba(255,255,255,0)', font: 'bold 150px "Times New Roman", serif' }); t2.position.set(0.0075, 0.0032 + CYL_LIQ, 0.0062); t2.rotation.y = 0.7; cyl.add(t2); }
    const cylLiq = new THREE.Mesh(new THREE.CylinderGeometry(0.0066, 0.0066, 1, 20), water2({ color: ACIDC.getHex(), base: 0.35 })); cylLiq.geometry.translate(0, 0.5, 0); cylLiq.position.y = 0.0032; cylLiq.renderOrder = 9.5; cylLiq.raycast = () => {}; cyl.add(cylLiq);
    const cylPick = pickBox(0.022, 0.1, 0.022); cylPick.position.y = 0.05; cyl.add(cylPick);
    const cylStream = new THREE.Mesh(new THREE.CylinderGeometry(0.0007, 0.0007, 1, 8), liqMat); cylStream.visible = false; cylStream.renderOrder = 9.5; cylStream.raycast = () => {}; group.add(cylStream);          // 量筒倒进试管的那一股
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.0007, 0.0007, 1, 8), liqMat); stream.visible = false; stream.renderOrder = 9.5; stream.raycast = () => {}; group.add(stream);

    // ================= 气泡、SO₂ 小点、溅出的液滴 =================
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3(), p4 = new THREE.Vector3();
    const inst = (n, geo, mat, ro) => { const m = new THREE.InstancedMesh(geo, mat, n); m.count = 0; m.renderOrder = ro; m.frustumCulled = false; m.raycast = () => {}; group.add(m); return m; };
    const bubMat = bubble2({ color: 0x6f8797, white: 0.2 });
    const cuBubs = inst(60, new THREE.SphereGeometry(1, 8, 6), bubMat, 9.8), pinkBubs = inst(60, new THREE.SphereGeometry(1, 8, 6), bubMat, 9.8);
    const so2Dots = inst(160, new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: SO2C, transparent: true, opacity: 0.9, depthWrite: false }), 10);
    const drops = inst(40, new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: 0x9fc6e0 }), 10);
    const FX = { cu: [], pink: [], dots: [], drops: [], acc: 0, accP: 0, accE: 0, accO: 0, cuAcc: 0 };
    // SO₂ 走的路：铜丝 → 试管上部 → 导管 → 品红溶液 → 棉团
    const GAS = [along(0.03), along(0.14), ...upPts.slice(1), ...downPts.slice(1)];
    const GL = [0]; for (let i = 1; i < GAS.length; i++) GL.push(GL[i - 1] + GAS[i].distanceTo(GAS[i - 1]));
    const U_STOP = GL[1], U_TIP = GL[GL.length - 1];
    const gasAt = (u) => { let i = 1; while (i < GAS.length - 1 && GL[i] < u) i++; return GAS[i - 1].clone().lerp(GAS[i], clamp((u - GL[i - 1]) / Math.max(1e-6, GL[i] - GL[i - 1]), 0, 1)); };
    const HEADN = 26, HEAD = Array.from({ length: HEADN }, (_, i) => ({ rank: (i + 0.5) / HEADN, a: 0.045 + Math.random() * 0.095, r: Math.sqrt(Math.random()) * 0.0055, th: Math.random() * 6.28, ph: Math.random() * 6 }));

    // ================= 状态 =================
    // acid：试管里加进去的浓硫酸（mL）；pf：已经倒出去的比例；接收管：rA / rW 克 H₂SO₄ / 水、rCu mmol CuSO₄、Tw 温度
    const fresh = () => ({
      demo: false, near: false, ws: 0, wsCur: 0, wDrag: false, lit: false, T: T0, cu: 0, rate: 0, contact: 0, acid: 2,
      air: V_GAS, so2: 0, pinkSO2: 0, naoh: 0, escPink: 0, escTube: 0, cotton: true, cotK: 0,
      plug: 'in', plugK: 0, pour: null, pf: 0, rA: 0, rW: WATER_ML, rCu: 0, lost: 0, Tw: T0, Tloc: T0, spat: false, boil: 0,
      cyl: { acid: 0, pos: CYL_HOME.toArray(), drag: false, anim: null },
      heatT: 0, coolT: 0, lastFlow: 0, said: {},
    });
    // 老师演示从更早开始：试管还空着、橡胶塞（连着铜丝和导管）放在桌上，量筒里量好了 2 mL 浓硫酸
    const freshDemo = () => ({ ...fresh(), acid: 0, plug: 'out', plugK: 1, cyl: { acid: 2, pos: CYL_HOME.toArray(), drag: false, anim: null } });
    S = fresh();
    let lastLook = null;
    const frac = () => S.so2 / Math.max(1e-6, S.air + S.so2);
    const fRed = () => 1 / (1 + K_DYE * (S.pinkSO2 / PINK_ML));
    const inClamp = () => !S.pour;
    const acidLeft = () => Math.max(0, (ACID_MMOL * S.acid) / 2 - 2 * S.cu);          // mmol
    const tubeVol = () => S.acid * (1 - S.pf);
    const tubeA = () => acidLeft() * 0.09808, tubeW = () => (S.acid / 2) * 3.68 * 0.02 + 2 * S.cu * 0.018;          // 试管里 H₂SO₄、水（克；水含浓硫酸里的 2% 和反应生成的）
    const rVol = () => S.rW + S.rA / 1.84;          // 接收管里的液体体积（mL，不计混合时的体积收缩，示意）
    const cuConc = () => S.rCu / Math.max(0.1, rVol());          // mol/L
    const cuState = () => (!S.said.contact ? 'above' : S.contact > 0.02 ? 'in' : 'out');

    const A = {
      lamp() {
        if (!S.lit) {
          S.lit = true; sfx.clink({ freq: 700, gain: 0.02 });
          if (!S.pour && S.contact > 0.02) { done('heat'); status('点燃了酒精灯，加热试管里的浓硫酸。盯着<b>铜丝</b>和右边的<b>品红溶液</b>。（时间加快了 8 倍）'); }
          else if (!S.pour) status(S.said.fade ? '又点燃了酒精灯。' : '点燃了酒精灯。可是铜丝还没碰到浓硫酸：先把<b>铜丝</b>往里推。');
          return;
        }
        S.lit = false;
        if (S.contact > 0.02 && S.rate > 0.001) status('熄灭了酒精灯，可是<b>铜丝还浸在浓硫酸里</b>：试管还热，反应还在进行，要等它慢慢冷下来才停。课本的做法是<b>向外拉铜丝</b>，立刻终止反应。');
        else if (S.said.stop) status('熄灭了酒精灯（盖上灯帽）。等试管<b>冷却</b>。');
        else status('熄灭了酒精灯。');
      },
      cotton() {
        if (S.cotton) { S.cotton = false; status('拿掉了浸 NaOH 溶液的棉团。看看多余的 SO₂ 往哪里去。点一下棉团可以放回去。'); }
        else { S.cotton = true; status('棉团放回去了：多余的 SO₂ 被 NaOH 溶液吸收。'); }
      },
      plug() {
        if (S.pour || S.cyl.anim) return;
        if (S.plug === 'in') {
          S.plug = 'out';
          if (S.T > 60) status(`拔出了橡胶塞（连着铜丝和导管）。试管还很烫（约 ${Math.round(S.T / 10) * 10} ℃）${frac() > 0.05 ? '，管里的 SO₂ 从试管口跑到空气里（有毒）' : ''}。`);
          else status(frac() > 0.05 ? '拔出了橡胶塞（连着铜丝和导管）。管里剩下的一点 SO₂ 从试管口散出去了。接着点<b>试管</b>，把里面的物质慢慢倒进盛有少量水的试管里。' : '拔出了橡胶塞（连着铜丝和导管）。接着点<b>试管</b>，把里面的物质慢慢倒进盛有少量水的试管里。');
          return;
        }
        if (S.pf > 0) return status('试管里的物质已经倒出来了。点“更多”里的“全部重来”。');
        S.plug = 'in'; sfx.clink({ freq: 900, gain: 0.03 }); status(S.acid > 0 ? '塞好了橡胶塞。' : '塞好了橡胶塞——试管里还没有浓硫酸。');
      },
      pour() {
        if (S.pour) return;
        if (S.plug === 'in') return status('先点<b>橡胶塞</b>把它拔出来（连着铜丝和导管），才能倒。');
        if (S.plugK < 1) return status('等橡胶塞和铜丝整个拿出来。');
        if (tubeVol() <= 0.01) return status(S.acid > 0 ? '试管里的物质已经倒完了。' : '试管里还没有浓硫酸。');
        // 开始倒的这一刻记下：冷却了没有（课本：冷却后，慢慢倒入）
        S.pour = { m: 0, dir: 1, T0: S.T, cooled: !S.lit && S.T < 50 };
        if (S.lit) status('酒精灯还点着，试管也还没冷却……');
        else if (S.T >= 50) status(`试管还没冷却（约 ${Math.round(S.T / 10) * 10} ℃）就倒了……`);
      },
      reset() {
        if (bar.playing) bar.stop();
        S = fresh(); sync(); mic.close(); back(); lastLook = null;
        W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.t3.close(); W.next.hidden = true; W.ui.relock(); }
        bar.undo('contact', 'heat', 'watch', 'stop', 'cool', 'pour', 'why');
        status('全部重新摆好了：试管里又是 2 mL 浓硫酸，铜丝在液面上方。');
      },
    };
    const clearFX = () => { FX.cu.length = FX.pink.length = FX.dots.length = FX.drops.length = 0; FX.acc = FX.accP = FX.accE = FX.accO = FX.cuAcc = 0; };
    // 按当前状态把器材摆好：试管的姿势、铁夹、橡胶塞那一整件、铜丝、量筒，并重新算液面（重来、演示前后、每帧开头都走这里）
    const applyPose = () => {
      const pose = tubePose(S.pour ? S.pour.m : 0);
      tubeHold.position.copy(pose.pos); tubeHold.quaternion.setFromAxisAngle(V(0, 0, 1), (pose.ang - 90) * DEG);
      { const m = S.pour ? S.pour.m : 0; jaw.scale.setScalar(1 + 0.5 * clamp(Math.min(m * 3, (1.3 - m) * 3), 0, 1)); }          // 抬出来的那一下松开铁夹
      asmPose(S.plugK);
      wire.position.copy(D).multiplyScalar(WIRE_A1 + (1 - S.wsCur) * TRAVEL - PLUG_A);
      cylPose();
      setLiquid(tubeVol());
    };
    // 铜丝螺旋上的点有几成在液面以下（液面按上面的格点算，确定的）
    const measureContact = () => {
      if (S.plug !== 'in' || S.plugK > 0.001 || S.pour || !LQ.n || !liq.visible) return 0;
      const hs = surfaceY(); let c = 0;
      for (const p of SPS) { tmp.copy(p).applyQuaternion(qD).add(wire.position).add(O_ASM); if (tmp.y < hs) c++; }
      return c / SPS.length;
    };
    const sync = () => { clearFX(); capper.snap(S.lit); S.wsCur = S.ws; LQ.key = ''; applyPose(); S.contact = measureContact(); };

    // ---- 量筒：拖到试管口附近松手 → 自己走过去、倾斜着把 2 mL 浓硫酸倒进试管、再放回原处（老师演示里用；学生开始时已经加好了）----
    const cylBase = () => V(...S.cyl.pos);
    const CYL_T = [0.6, 1.0, 0.5, 1.4, 0.5, 1.0, 1.0];          // 抬到管口上方、转过去、放低、倒、抬起、转回来、放回原处
    const CYL_SUM = CYL_T.reduce((a, b) => a + b, 0);
    const SP_HI = MOUTH0.clone().add(V(0.02, 0.08, 0)), SP_LO = MOUTH0.clone().add(V(0.006, 0.009, 0));
    const cylPose = () => {
      const C = S.cyl, dirOf = (ang) => V(Math.cos(ang * DEG), Math.sin(ang * DEG));
      let spout = null, ang = 90, base = null;
      if (C.anim) {
        let t = C.anim.t, i = 0; while (i < CYL_T.length - 1 && t > CYL_T[i]) { t -= CYL_T[i]; i++; }
        const k = ease(Math.min(1, t / CYL_T[i]));
        const upAt = (sp) => sp.clone().addScaledVector(dirOf(90), -CYL_H);
        if (i === 0) base = C.anim.from.clone().lerp(upAt(SP_HI), k);
        else if (i === 1) { ang = 90 - 210 * k; spout = SP_HI; }
        else if (i === 2) { ang = -120; spout = SP_HI.clone().lerp(SP_LO, k); }
        else if (i === 3) { ang = -120; spout = SP_LO; }
        else if (i === 4) { ang = -120; spout = SP_LO.clone().lerp(SP_HI, k); }
        else if (i === 5) { ang = -120 + 210 * k; spout = SP_HI; }
        else { const a = upAt(SP_HI), hi = CYL_HOME.clone().setY(a.y); base = k < 0.5 ? a.lerp(hi, ease(k * 2)) : hi.lerp(CYL_HOME, ease(k * 2 - 1)); }
      } else base = cylBase();
      if (spout) base = spout.clone().addScaledVector(dirOf(ang), -CYL_H);
      cyl.position.copy(base); cyl.quaternion.setFromAxisAngle(V(0, 0, 1), (ang - 90) * DEG);
      // 筒里的液体：立着时在底上；倒着（口朝下）时流到口那一头；转到一半时不画（液面斜着，示意从略）
      const L = Math.max(0.0005, (C.acid / 2) * CYL_LIQ);
      cylLiq.visible = C.acid > 0.02 && (ang > 45 || ang < -60); cylLiq.scale.y = L; cylLiq.position.y = ang > 45 ? 0.0032 : CYL_H - 0.004 - L;
      // 倒的那一段：从筒口到试管口一股细流
      const pouring = !!C.anim && ang < -100 && C.acid > 0.02 && spout && spout.distanceTo(SP_LO) < 0.002;
      cylStream.visible = pouring;
      if (pouring) { const a = spout.clone().add(V(-0.0015, -0.001, 0)), b = MOUTH0.clone().add(V(0.002, -0.004, 0)), d = b.clone().sub(a); cylStream.position.copy(a).addScaledVector(d, 0.5); cylStream.scale.y = d.length(); cylStream.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); }
    };
    const cylStep = (dt) => {
      const C = S.cyl; if (!C.anim) return;
      const before = C.anim.t; C.anim.t += dt;
      const p0 = CYL_T[0] + CYL_T[1] + CYL_T[2], p1 = p0 + CYL_T[3];
      if (C.anim.t > p0 && before < p1) { const a = clamp((Math.min(C.anim.t, p1) - Math.max(before, p0)) / CYL_T[3], 0, 1) * 2; const d = Math.min(a, C.acid, 2 - S.acid); C.acid -= d; S.acid += d; LQ.key = ''; }
      if (C.anim.t >= CYL_SUM) { C.anim = null; C.pos = CYL_HOME.toArray(); if (!S.said.acidIn && S.acid >= 1.99) { S.said.acidIn = true; status('2 mL 浓硫酸加进试管了。接着点<b>橡胶塞</b>，把它塞好。'); } }
    };

    const drag = draggable(group, [
      { obj: wirePick, plane: 'xy', offset: WZ, keepOffset: true, anchor: wire, enabled: () => S.plug === 'in' && S.plugK < 0.01 && !S.pour,
        hint: () => (S.plug !== 'in' ? '' : S.ws > 0.5 ? '铜丝：往外拉，离开浓硫酸' : '铜丝：往里推，使铜丝与浓硫酸接触'),
        onStart: () => { S.wDrag = true; },
        onDrag: (p) => { const a = p.clone().sub(B0).dot(D); S.ws = clamp(1 - (a - WIRE_A1) / TRAVEL, 0, 1); },
        onEnd: () => { S.wDrag = false; S.ws = S.ws > 0.5 ? 1 : 0; } },
      { obj: cylPick, plane: 'xy', offset: CYL_HOME.z, keepOffset: true, anchor: cyl, enabled: () => S.cyl.acid > 0.02 && S.plug === 'out' && S.plugK >= 1 && !S.cyl.anim && !S.pour,
        hint: () => (S.cyl.acid > 0.02 && S.plug === 'out' && !S.cyl.anim ? '量筒（2 mL 浓硫酸）：拖到试管口，松手倒进去。浓硫酸腐蚀性很强，注意安全防护！' : ''),
        onStart: () => { S.cyl.drag = true; },
        onDrag: (p) => { S.cyl.pos = [clamp(p.x, -0.2, 0.17), clamp(p.y, 0, 0.3), CYL_HOME.z]; },
        onEnd: () => { const C = S.cyl; C.drag = false; const b = cylBase(); if (Math.abs(b.x - MOUTH0.x) < 0.07 && b.y > 0.09) C.anim = { t: 0, from: b }; else C.pos = CYL_HOME.toArray(); } },
    ], { tip: tag('', 'pill'), highlight: true, taps: [
      { obj: lampPick, hint: () => (S.lit ? '酒精灯：点一下，盖上灯帽熄灭' : '酒精灯：点一下，取下灯帽点燃'), onTap: () => A.lamp() },
      { obj: cottonPick, hint: () => (S.cotton ? '浸 NaOH 溶液的棉团：点一下拿掉' : '棉团：点一下放回管口'), onTap: () => A.cotton() },
      { obj: plugPick, hint: () => (S.pour ? '' : S.plug === 'in' ? '橡胶塞：点一下拔出来（连着铜丝和导管）' : '橡胶塞：点一下塞回去'), onTap: () => A.plug() },
      { obj: tubePick, hint: () => (S.pour ? '' : S.plug === 'in' ? '试管：浓硫酸 2 mL（要倒出来，先拔出橡胶塞）' : tubeVol() > 0.01 ? '试管：点一下，把里面的物质慢慢倒进盛有少量水的试管' : S.acid > 0 ? '试管：已经倒空了' : ''), onTap: () => A.pour() },
    ] });
    const act = demoActs(drag, group);
    const mic = micro({ tag, look, back, group, scene: cuAcidScene(), at: () => along(0.014), btnAt: () => along(0.05).add(V(0.0, -0.03, 0.02)), label: '钻进去看',
      state: () => ({ cu: cuState(), hot: S.rate > 0.0015, cold: S.T < 100, made: S.cu > 0.02 }), key: () => cuState(), show: () => S.plug === 'in' && S.plugK < 0.01 && !S.pour && S.acid > 0,
      bar: () => bar, scale: 0.0058, lookD: [0.05, 0.3, 1], dist: 0.26 });

    // ================= 观察卡 =================
    const cardTube = tag('', 'cond'); cardTube.px = [-190, -60];
    const cardPink = tag('', 'cond'); cardPink.px = [36, -30];
    const cardWater = tag('', 'cond'); cardWater.px = [-30, -70];
    const obs = (b, small) => `<div class="cc-obs"><b>${b}</b><small>${small}</small></div>`;
    const card = (name, stamp, rows, note) => `<div class="cc"><div class="cc-t"><span class="cc-name">${name}</span>${stamp ? `<span class="cc-res burn">${stamp}</span>` : ''}</div><div class="cc-more">${rows}${note ? `<div class="cc-note">${note}</div>` : ''}</div></div>`;
    const updateCards = () => {
      const quiet = bar.playing || mic.isOpen;
      const wireTxt = { above: '铜丝在液面上方', in: '铜丝浸在浓硫酸里', out: '铜丝已拉出' }[cuState()];
      cardTube.text(card('试管里', S.rate > 0.002 ? '冒气泡' : '', obs(`${Math.round(S.T / 5) * 5} ℃`, '浓硫酸温度（约，示意）') + obs(wireTxt, '') + (S.cu > 0.02 ? obs(`${S.cu.toFixed(1)} mmol`, '已生成 CuSO₄（按课本主反应估算；没溶解，灰白色固体）') : '') + (S.escTube > 0.05 ? obs(`${S.escTube.toFixed(1)} mL`, '从试管口逸出的 SO₂（约）') : ''), '橙色 = 热（示意色）'))
        .loc(group, along(0.09).x, along(0.09).y + 0.03, 0).show(!quiet && S.acid > 0 && !S.pour && S.pf === 0);
      cardPink.text(card('品红溶液', fRed() < 0.15 ? '褪色' : '', obs(fRed() < 0.15 ? '红色褪去' : fRed() < 0.8 ? '红色变浅' : '红色', '') + obs(S.cotton ? '棉团吸收多余的 SO₂' : '棉团拿掉了', '') + (S.escPink > 0.05 ? obs(`${S.escPink.toFixed(1)} mL`, '从这支试管口逸出的 SO₂（约）') : ''), '青色小点 = SO₂（示意色，SO₂ 本身无色）'))
        .loc(group, XP, 0.15, 0).show(!quiet && (S.lastFlow > 0 || S.pinkSO2 > 0 || S.escPink > 0));
      const blue = cuConc() > 0.01;
      cardWater.text(card('倒进少量水里', S.spat ? '溅出' : '', obs(blue ? '蓝色' : '无色', '溶液') + obs(`${Math.round(S.Tw / 5) * 5} ℃`, '温度（约）') + (blue ? obs(`${cuConc().toFixed(2)} mol/L`, 'Cu²⁺（约）') : ''), ''))
        .loc(group, XW, 0.13, 0).show(!quiet && S.pf > 0);
    };

    // ================= 步骤栏 + 老师演示 =================
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'contact', title: '铜丝接触浓硫酸', todo: '捏住橡胶塞外面露出的<b>铜丝</b>，顺着试管往里（往左下）推到底，使铜丝与浓硫酸接触。（铜丝从橡胶塞侧面的凹槽穿过，可以抽动）', target: () => wireGrip },
        { id: 'heat', title: '加热', todo: '点一下<b>酒精灯</b>：取下灯帽点燃，加热试管。', target: () => (S.lit ? null : lamp) },
        { id: 'watch', title: '看品红溶液', todo: '产生的气体通入<b>品红溶液</b>：有什么现象？盯着铜丝和右边的试管。', target: () => null },
        { id: 'stop', title: '向外拉铜丝', todo: '把<b>铜丝</b>顺着试管向外（往右上）拉，终止反应。', target: () => (S.contact > 0 ? wireGrip : null) },
        { id: 'cool', title: '冷却', todo: '点一下<b>酒精灯</b>熄灭它，等试管冷却。', target: () => (S.lit ? lamp : null) },
        { id: 'pour', title: '倒入水中', todo: '冷却后，点<b>橡胶塞</b>拔出来，再点<b>试管</b>：把里面的物质慢慢倒入盛有少量水的另一支试管里，观察溶液的颜色。', target: () => (S.pour ? null : S.plug === 'in' ? plug : tube) },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh: freshDemo, bar: () => bar, apply: () => { mic.close(); sync(); },
            view: { save: () => (mic.isOpen ? { mic: true } : S.near && lastLook ? { look: lastLook } : null),
              restore: (v) => { if (v.mic) mic.open(); else if (v.look) { S.near = true; look(...v.look, () => { S.near = false; }); } } } }),
          shots: [
            { cap: '实验5-3。注意：浓硫酸具有很强的腐蚀性，取用时注意安全防护！把量筒里已经量好的 2 mL 浓硫酸倒入试管。', dur: 8.4, cam: [[0.0, 0.2, 0.0], [0.06, 0.3, 1], 0.58],
              during: act.path(cylPick, [() => cylBase(), () => cylBase().setY(0.16), () => V(MOUTH0.x + 0.03, 0.19, CYL_HOME.z)], { t0: 0.04, t1: 0.2, release: 0.22 }) },
            { cap: '塞好橡胶塞（侧面的凹槽里嵌着下端卷成螺旋状的铜丝），再把铜丝往里推，使铜丝与浓硫酸接触。', dur: 6, cam: [[-0.03, 0.14, 0], [0.06, 0.3, 1], 0.44],
              during: act.seq(act.tap(plugPick, 0.03), act.drag(wirePick, () => wireAnchor(1), { t0: 0.52, t1: 0.78, release: 0.82, from: () => wireAnchor(0) })) },
            { cap: '点燃酒精灯加热。刚开始导管口冒出的气泡，是试管里受热膨胀的空气——品红溶液不褪色。', dur: 5, speed: 1.8, cam: [[-0.01, 0.12, 0], [0.06, 0.3, 1], 0.46], during: act.tap(lampPick, 0.1) },
            { cap: '铜丝表面冒出气泡，生成的气体通入品红溶液：品红溶液褪色。多余的气体被浸 NaOH 溶液的棉团吸收。（青色小点 = SO₂，示意色）', dur: 7, speed: 2.5, cam: [[0.03, 0.11, 0], [0.06, 0.28, 1], 0.42] },
            { cap: '钻进去看（示意）：铜原子失去电子，变成 Cu²⁺；浓硫酸里 +6 价的硫得到电子，变成 SO₂（SO₂ 中硫的化合价为 +4）。', dur: 9, cam: [[-0.093, 0.15, 0], [0.05, 0.3, 1], 0.24], enter: () => mic.open(true), during: act.at(0.98, () => mic.close()) },
            { cap: '向外拉铜丝：铜丝离开浓硫酸，铜丝表面不再产生气泡——反应终止；导管口的气泡随后渐渐停下。', dur: 4.5, cam: [[-0.02, 0.14, 0], [0.06, 0.3, 1], 0.4],
              during: act.drag(wirePick, () => wireAnchor(0), { t0: 0.1, t1: 0.45, release: 0.5, from: () => wireAnchor(1) }) },
            { cap: '熄灭酒精灯，等试管冷却（时间加快）。', dur: 6, speed: 4, cam: [[-0.05, 0.11, 0], [0.06, 0.3, 1], 0.44], during: act.tap(lampPick, 0.06) },
            { cap: '冷却后，拔出橡胶塞（连着铜丝和导管），把试管里的物质慢慢倒入盛有少量水的另一支试管里：溶液显蓝色——生成了硫酸铜。演示完了，换你自己做。', dur: 12, cam: [[-0.12, 0.13, 0.02], [0.05, 0.3, 1], 0.5],
              during: act.seq(act.tap(plugPick, 0.03), act.tap(tubePick, 0.19)) },
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
          const rest = o2 - absP; if (S.cotton) S.naoh += rest; else S.escPink += rest;          // 品红试管口
          S.lastFlow = out / hh;
          FX.accP += out * 1.6; FX.acc += o2 * 3.2; FX.accO += rest * 8;          // 同一份出口通量：导管里流过的、品红溶液吸收的、到管口被棉团吸收或逸出的
          if (!S.said.air && fr < 0.25 && heating) log('air', ['刚加热：导管口冒出气泡', '品红溶液<b>不褪色</b>', '冒出的是试管里受热膨胀的空气']);
        } else S.lastFlow = 0;
      } else {
        // 敞口：管里的气体慢慢和外面的空气混合；SO₂ 从管口散出去
        const a = 1 - Math.exp(-0.08 * hh), e = S.so2 * a; S.so2 -= e; S.escTube += e;          // 反应试管口 S.air = Math.max(0, V_GAS * 298 / (Tg + 273) - S.so2); S.lastFlow = 0;
        FX.accE += e * 3.2 + gen * 3.2;
      }
    };

    // ================= 每帧 =================
    const tmp = new THREE.Vector3(), up = V(0, 1, 0);
    const qq = new THREE.Quaternion();
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
      const k = clamp(Math.round(vol / DV), 1, NS - 1); LQ.h = proj[order[k]]; LQ.n = k;
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
      const P = S.pour; S.pour = null;
      if (S.demo) return;
      if (S.spat) return;
      const blue = S.rCu > 0.05;
      if (!P.cooled) {
        // 没等冷却就倒：照实记录，不算完成，提示重做
        log('pourHot', [`试管还没冷却（约 ${Math.round(P.T0 / 10) * 10} ℃）就倒入少量水中`, `溶液${blue ? '显<b>蓝色</b>' : '<b>无色</b>'}，试管很烫（约 ${Math.round(S.Tw / 5) * 5} ℃）；这次没有溅出来`, '课本要求<b>冷却后</b>再慢慢倒：热的浓硫酸倒进水里，可能局部沸腾、溅出酸液']);
        status(`这次没有溅出来，但试管<b>还没冷却</b>就倒了——课本要求冷却后再慢慢倒入水中。点“更多”里的“全部重来”，按步骤再做一次。`);
        near(V(XW, 0.06, 0), [0.1, 0.25, 1], 0.24);
        return;
      }
      if (S.said.fade && S.cu > 0.05) {
        done('pour');
        const blueK = clamp(cuConc() / 0.3, 0, 1);
        log('blue', ['冷却后，把试管里的物质慢慢倒入少量水中', `溶液显<b>蓝色</b>（试管变热，约 ${Math.round(S.Tw / 5) * 5} ℃）`, '生成了<b>硫酸铜</b>：在浓硫酸里没有溶解，溶于水显蓝色']);
        status(`溶液显<b>蓝色</b>${blueK < 0.25 ? '（很淡：反应的铜不多）' : ''}——生成了硫酸铜。试管也变热了：浓硫酸溶于水放出大量的热。在左边作答。`);
        W?.t1.open(); near(V(XW, 0.06, 0), [0.1, 0.25, 1], 0.24);
        return;
      }
      // 没反应（或没看到品红褪色）就倒了：记下真实看到的，引导重来；不出“品红褪色”那道题
      log('pourEarly', ['还没看到品红溶液褪色，就把试管里的物质倒入少量水中', `溶液${blue ? '<b>很淡的蓝色</b>' : '<b>无色</b>'}，试管变热`, blue ? '铜只反应了一点点' : '铜还没有和浓硫酸反应，没有硫酸铜；变热是浓硫酸溶于水放热']);
      status(`溶液${blue ? '只有很淡的蓝色' : '是无色的'}：铜还${blue ? '没怎么' : '没有'}反应。要先让铜丝浸在浓硫酸里<b>加热</b>，看到品红溶液褪色。点“更多”里的“全部重来”再做一次。`);
      near(V(XW, 0.06, 0), [0.1, 0.25, 1], 0.24);
    };
    // 倒：每一小份按比例把试管里的 H₂SO₄、水、CuSO₄ 加进接收管；放热、温度、沸点、局部飞溅都按接收管里的组成算
    const pourStep = (dt) => {
      const P = S.pour, dp = Math.min(1 - S.pf, POUR_RATE * dt);
      if (dp <= 0) return false;
      const tA = tubeA(), tW = tubeW(), tC = S.cu, sA = tA / Math.max(1e-9, tA + tW);
      const Ta = S.T;          // 这一份酸真正倒进水里时的温度（倒的过程中试管还在变凉）
      // 局部（示意）：这一小股先和约 1.5 倍质量的周围液体混合
      const w = S.rA / Math.max(1e-9, S.rA + S.rW), lA = LOCAL_R * w, lW = LOCAL_R * (1 - w), cl = cMix(lA, lW);
      const qLoc = enth(lA + sA, lW + 1 - sA) - enth(lA, lW) - enth(sA, 1 - sA);
      S.Tloc = (CP_ACID * Ta + LOCAL_R * cl * S.Tw + qLoc) / (CP_ACID + LOCAL_R * cl);
      const bpLoc = bpOf(lA + sA, lW + 1 - sA);
      // 整管：放热 = 积分溶解热的增量 − 这一份进料自己已经放过的（98% 的酸里本来就有 2% 水）；酸本身的热也算进去
      const m0 = S.rA + S.rW, C0 = C_GLASS + m0 * cMix(S.rA, S.rW), H0 = enth(S.rA, S.rW), dA = dp * tA, dW = dp * tW;
      S.pf += dp; S.rA += dA; S.rW += dW; S.rCu += dp * tC;
      const dm = dp * (tA + tW + tC * 0.1596), q = enth(S.rA, S.rW) - H0 - enth(dA, dW);
      S.Tw = (C0 * S.Tw + dm * CP_ACID * Ta + q) / (C_GLASS + (S.rA + S.rW) * cMix(S.rA, S.rW));
      const bp = bpOf(S.rA, S.rW);
      if (S.Tw > bp) S.Tw = bp;
      if (S.Tloc > bpLoc || S.Tw >= bp) {
        S.boil = 1;
        const f = Math.min(0.08, 0.03 * dt * (1 + (S.Tloc - bpLoc) / 10));          // 溅出去的一份：H₂SO₄、水、CuSO₄ 按比例一起少（示意）
        S.lost += f * (S.rA + S.rW); S.rA *= 1 - f; S.rW *= 1 - f; S.rCu *= 1 - f;
        if (!S.spat) {
          S.spat = true; sfx.clink({ freq: 400, gain: 0.08 });
          log('spat', [`没有冷却就倒（开始倒时试管约 ${Math.round(P.T0 / 10) * 10} ℃）`, '倒进去的地方<b>局部沸腾</b>，液滴<b>溅了出来</b>', '热的浓硫酸带着自己的热，又溶于水放热，倒进去的那一小团超过了沸点（示意）']);
          status(`<b>没有冷却就倒</b>：热的浓硫酸（开始倒时约 ${Math.round(P.T0 / 10) * 10} ℃）倒进少量水里，倒进去的地方局部沸腾，带着酸液<b>溅了出来</b>——非常危险。要<b>冷却后</b>再慢慢倒。点“更多”里的“全部重来”。`);
        }
      }
      return true;
    };
    const step = (dt, t) => {
      const H = dt * SPEED, n = Math.max(1, Math.ceil(H / 0.25));
      // 1. 先让器材动到这一帧的位置（倒、拔塞子、棉团、量筒、铜丝），再按新的姿势算液面
      S.wsCur += (S.ws - S.wsCur) * Math.min(1, dt * (S.wDrag ? 30 : 8));
      if (S.pour) {
        const P = S.pour;
        if (P.dir > 0) { P.m = Math.min(2, P.m + dt / (P.m < 1 ? 0.7 : 1.6)); if (P.m >= 2) P.dir = 0; }
        else if (P.dir === 0) { if (!pourStep(dt)) P.dir = -1; }
        else { P.m = Math.max(0, P.m - dt / (P.m > 1 ? 1.6 : 0.7)); if (P.m <= 0) finishPour(); }
      }
      if (!S.pour || S.pour.dir !== 0) S.Tw += (T0 - S.Tw) * (1 - Math.exp(-(H * 0.25) / (C_GLASS + (S.rA + S.rW) * cMix(S.rA, S.rW))));
      S.boil = Math.max(0, S.boil - dt * 0.6);
      S.plugK = clamp(S.plugK + clamp((S.plug === 'in' ? 0 : 1) - S.plugK, -dt * 0.6, dt * 0.6), 0, 1);
      S.cotK = clamp(S.cotK + clamp((S.cotton ? 0 : 1) - S.cotK, -dt * 1.6, dt * 1.6), 0, 1);
      { const u = ease(S.cotK); cotton.position.lerpVectors(COT_ON, COT_OFF, u); cotton.position.y += Math.sin(Math.PI * u) * 0.04; }
      cylStep(dt);
      applyPose();
      // 2. 铜丝浸在酸里的比例 → 反应
      S.contact = measureContact();
      for (let i = 0; i < n; i++) model(H / n);
      // 3. 第一次看到的现象 → 记录、步骤（推到底：螺旋下面一段一定在液面以下）
      if (S.contact > 0.05 && !S.said.contact) { done('contact'); log('contact', ['把铜丝往里推，铜丝与浓硫酸接触', S.T < 60 ? '没有加热：铜丝<b>没有明显变化</b>' : '铜丝浸进热的浓硫酸', S.T < 60 ? '冷的浓硫酸和铜看不出反应' : '在加热的条件下，浓硫酸与铜反应']); if (!S.lit) status('铜丝浸到浓硫酸里了：没有加热，<b>看不出变化</b>。点<b>酒精灯</b>加热。'); else done('heat'); }
      if (S.lit && S.contact > 0.02 && !S.said.heatOk) { S.said.heatOk = true; done('heat'); }
      if (S.rate > 0.002 && !S.said.bub) { log('bub', [`加热约 ${Math.round(S.heatT)} 秒`, '铜丝表面冒出<b>气泡</b>', '热的浓硫酸和铜反应，生成了气体']); status('铜丝表面冒出了气泡：反应开始了。看右边的<b>品红溶液</b>。'); }
      if (fRed() < 0.15 && !S.said.fade) { done('watch'); log('fade', ['生成的气体通入品红溶液', '品红溶液<b>褪色</b>', '生成了<b>二氧化硫</b>（SO₂ 能使品红溶液褪色）']); status('品红溶液<b>褪色</b>了：生成的气体是二氧化硫。现在把<b>铜丝</b>向外拉，终止反应。'); }
      if (S.said.fade && S.said.contact && S.contact === 0 && S.plug === 'in' && !S.said.stop) { done('stop'); log('stop', ['向外拉铜丝，铜丝离开浓硫酸', '铜丝表面<b>不再产生气泡</b>；导管口的气泡随后渐渐停下（管里的气体还要排一会儿）', '反应终止：不再生成 SO₂']); status(S.lit ? '铜丝离开了浓硫酸：铜丝表面不再产生气泡，反应终止。接着点<b>酒精灯</b>熄灭它，等试管冷却。' : '铜丝离开了浓硫酸：铜丝表面不再产生气泡，反应终止。等试管冷却。'); }
      if (S.said.stop && !S.lit && S.T < 50 && !S.said.cool && !S.pour && S.pf === 0) { done('cool'); log('cool', ['熄灭酒精灯，等一会儿', '试管冷了；试管里的液体<b>不是蓝色</b>，有灰白色固体', '浓硫酸里水很少，生成的硫酸铜没有溶解成蓝色溶液']); status('试管冷却了。看试管里：<b>不是蓝色</b>，底部有灰白色固体。接着点<b>橡胶塞</b>拔出来，再点<b>试管</b>把里面的物质倒进水里。'); }
      if (S.escTube > 0.3 && !S.said.escTube) log('escTube', ['拔出了橡胶塞', `试管里剩下的 SO₂ 从<b>反应试管口</b>逸到空气里`, 'SO₂ 有毒，会污染空气']);
      if (!S.cotton && S.escPink > 0.3 && !S.said.esc) { log('esc', ['拿掉了浸 NaOH 溶液的棉团', '多余的 SO₂ 从品红溶液的试管口<b>逸到空气里</b>', 'SO₂ 有毒，会污染空气：棉团里的 NaOH 溶液能吸收它']); status('没有棉团，多余的 SO₂ 跑到空气里去了——它<b>有毒</b>。点一下<b>棉团</b>把它放回去。'); }
      // 4. 画面
      lamp.flame.setOn(capper.update(dt, S.lit)); lamp.flame.update(t);
      // 试管里的液体：生成的硫酸铜不溶，越来越灰白；个别灰黑色小点表示可能出现的黑色沉积（多少随加热情况而变，课本没提，这里只示意）；管底热（橙）
      const kS = clamp(S.cu / 1.2, 0, 1);
      liqMat.color.copy(ACIDC).lerp(GRAYC, 0.7 * kS);
      const ns = liq.visible ? Math.min(NSPK, Math.round(NSPK * kS), LQ.n) : 0;
      for (let i = 0; i < ns; i++) { const j = order[(i * 7) % LQ.n]; p4.set(SMP[j * 3] * 0.9, SMP[j * 3 + 1], SMP[j * 3 + 2] * 0.9); s4.setScalar(0.00055 + (i % 3) * 0.00015); m4.compose(p4, q4, s4); specks.setMatrixAt(i, m4); specks.setColorAt(i, i % 12 === 5 ? DARKC : WHITEC); }
      specks.count = ns; specks.instanceMatrix.needsUpdate = true; if (specks.instanceColor) specks.instanceColor.needsUpdate = true;
      heat.material.opacity = S.acid > 0 ? clamp((S.T - 50) / 500, 0, 0.32) : 0;
      // 铜丝表面的气泡（实验坐标；在液面以下往上冒）
      if (S.rate > 0.0008 && liq.visible) {
        FX.cuAcc += dt * Math.min(40, S.rate * 2500);
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
      // SO₂（青色小点）：都由模型里同一份气流驱动——导管里流着的（按流过的量撒在导管各处）、进品红溶液的（约 60% 溶进去）、
      //   到品红试管口的（有棉团：钻进棉团就没了；没棉团：逸到空气里）、拔了塞子从试管口散出去的
      const flowV = clamp(S.lastFlow * 0.6, 0, 0.12);          // 导管里的气流（实际 mL/s × 8 倍时间 ÷ 导管截面），快到看不清时封顶
      while (FX.acc > 1) { FX.acc -= 1; if (FX.dots.length < 130) FX.dots.push({ u: U_STOP + Math.random() * (U_TIP - U_STOP), off: V((Math.random() - 0.5) * 0.008, (Math.random() - 0.5) * 0.008, (Math.random() - 0.5) * 0.008), absorb: Math.random() < ABS, life: 1, p: V() }); }
      FX.acc = Math.min(FX.acc, 3);
      while (FX.accO > 1) { FX.accO -= 1; if (FX.dots.length < 150) { const trap = S.cotton && S.cotK < 0.5; FX.dots.push(trap ? { trap: true, p: V(XP + (Math.random() - 0.5) * 0.006, COT_ON.y - 0.006, (Math.random() - 0.5) * 0.006), v: V(0, 0.01, 0), life: 0.5 } : { esc: true, p: V(XP + (Math.random() - 0.5) * 0.006, COT_ON.y - 0.004, (Math.random() - 0.5) * 0.006), v: V((Math.random() - 0.2) * 0.012, 0.02 + Math.random() * 0.01, (Math.random() - 0.5) * 0.01), life: 1.6 }); } }
      FX.accO = Math.min(FX.accO, 3);
      while (FX.accE > 1) { FX.accE -= 1; if (FX.dots.length < 150 && S.plug !== 'in') { const m = V(0, TLEN, 0).applyQuaternion(tubeHold.quaternion).add(tubeHold.position); FX.dots.push({ esc: true, p: m.add(V((Math.random() - 0.5) * 0.008, 0, (Math.random() - 0.5) * 0.008)), v: V((Math.random() - 0.3) * 0.01, 0.02 + Math.random() * 0.01, (Math.random() - 0.5) * 0.01), life: 1.6 }); } }
      FX.accE = Math.min(FX.accE, 3);
      for (let i = FX.dots.length - 1; i >= 0; i--) {
        const d = FX.dots[i];
        if (d.esc || d.trap) { d.p.addScaledVector(d.v, dt); d.life -= dt * (d.trap ? 1 : 0.9); if (d.life <= 0) FX.dots.splice(i, 1); continue; }
        if (S.plug !== 'in' && d.u < GL[3]) { FX.dots.splice(i, 1); continue; }
        if (d.u < U_TIP) { d.u += flowV * dt; d.p.copy(gasAt(d.u)).addScaledVector(d.off, 0.12); if (flowV <= 0) { d.life -= dt * 0.5; if (d.life <= 0) FX.dots.splice(i, 1); } continue; }
        // 进了品红溶液：一部分溶进去，其余升到液面（再往上的那一份由上面的出口通量画）
        d.p.y += 0.03 * dt; d.p.x = XP + d.off.x * 0.3; d.p.z = d.off.z * 0.3;
        if ((d.absorb && d.p.y > TIP_Y + 0.006 + Math.abs(d.off.y) * 2) || d.p.y > pinkY - 0.001) FX.dots.splice(i, 1);
      }
      // 试管上部的 SO₂（塞着塞子、试管在铁夹上时）
      let nd = 0;
      FX.dots.forEach((d) => { s4.setScalar(0.0011); m4.compose(d.p, q4, s4); so2Dots.setMatrixAt(nd++, m4); });
      if (S.plugK < 0.02 && !S.pour) for (const hd of HEAD) { if (hd.rank > frac() || nd >= 160) continue; const a = hd.a + Math.sin(t * 0.5 + hd.ph) * 0.004; tmp.set(Math.cos(hd.th + t * 0.2) * hd.r, a, Math.sin(hd.th + t * 0.2) * hd.r).applyQuaternion(tubeHold.quaternion).add(tubeHold.position); if (liq.visible && tmp.y < surfaceY() + 0.003) continue; s4.setScalar(0.0011); m4.compose(tmp, q4, s4); so2Dots.setMatrixAt(nd++, m4); }
      so2Dots.count = nd; so2Dots.instanceMatrix.needsUpdate = true;
      // 盛水的试管：液面、颜色（蓝色深浅按 Cu²⁺ 浓度）、热、倒进去的那一股
      const wVol = rVol();
      wLiq.setLevel(volToY(wVol, WR - 0.0004, WR + 0.0008)).setColor(WATERC.clone().lerp(BLUE, clamp(cuConc() / 0.3, 0, 1)).getHex()); wLiq.update(t);
      wHeat.material.opacity = clamp((S.Tw - 35) / 500, 0, 0.07);
      const pouring = S.pour && S.pour.dir === 0 && tubeVol() > 0.005;
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
      updateCards();
      bar.near(S.near);
    };

    return {
      group: root, pointer, card: false, toggles: ['cards', 'steps'],
      size: { w: 0.36, d: 0.2, h: 0.24 },
      view: { elev: 16, azim: -6, lookY: 0.42, frameMargin: 1.06 },
      mount(ui) {
        const ctx = () => (S.said.fade ? '<div>你的记录：加热后铜丝表面冒气泡，生成的气体使品红溶液<b class="y">褪色</b>。</div>' : '');
        const t3 = think({ q: '在这个反应里，谁是氧化剂？', options: ['浓硫酸：+6 价的硫得到电子，被还原成 SO₂', '铜：铜失去了电子', '水：反应生成了水'], wrong: ['铜失去电子、化合价升高（0 → +2），被氧化——它是还原剂。点“钻进去看”，看电子从哪里到哪里。', '水是生成物，没有得失电子。'], ok: '对：浓硫酸氧化了铜，自身被还原成二氧化硫。浓硫酸是氧化剂，铜是还原剂（课本第 5 页）。', status: (m) => W?.status(m), onOk: () => { done('why'); if (W) W.next.hidden = false; } });
        const t2 = think({ q: '向外拉铜丝，反应就停止了。为什么要用可以抽动的铜丝？', options: ['铜丝离开浓硫酸，就不再生成 SO₂：可以让反应停下来，少生成有毒的 SO₂', '拉出来的铜丝冷得快，试管就不会炸裂', '可以增大铜和浓硫酸的接触面积，反应更快'], wrong: ['看看你的记录：铜丝一离开浓硫酸，铜丝表面就不再产生气泡——停的是反应。', '把铜丝往外拉，接触面积变小了；可抽动是为了随时让反应停下来。'], ok: '对：加热时，使铜丝接触浓硫酸可开始明显反应；拉出铜丝，就停止继续生成 SO₂。生成的多余 SO₂ 有毒，用浸 NaOH 溶液的棉团吸收。', status: (m) => W?.status(m), onOk: () => t3.open() });
        const t1 = think({ q: '生成的气体使品红溶液褪色。这种气体是什么？', ctx, options: ['二氧化硫 SO₂', '氢气 H₂', '氧气 O₂'], wrong: ['铜在氢后面，不能把酸里的氢置换出来；氢气也不能使品红溶液褪色。', '氧气不能使品红溶液褪色。'], ok: '对：二氧化硫具有漂白作用，能使品红溶液褪色（课本第 4 页）。所以浓硫酸和铜反应生成了 SO₂。', status: (m) => W?.status(m), onOk: () => t2.open() });
        const vary = varyBox('课本的注意事项：浓硫酸具有很强的腐蚀性，注意安全防护。可以试试：不加热，只让铜丝浸在浓硫酸里；熄灭酒精灯但不拉出铜丝；拿掉管口的棉团；不等冷却就倒进水里。', h('span', {}));
        const more = moreBox([['钻进去看', () => mic.open()], ['拿掉 / 放回棉团', () => A.cotton()]], () => A.reset());
        const note = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'), h('p', { class: 'fineprint', html: '浓硫酸 2 mL（98%，1.84 g/mL）= 36.8 mmol H₂SO₄；铜丝浸入的部分约 0.3 g。<b>时间加快 8 倍</b>：酒精灯把浓硫酸烧向约 240 ℃（示意；浓硫酸沸点约 338 ℃）。<br>反应速率随温度升高而增大（按活化能 80 kJ/mol 估计，<b>示意</b>）：室温下慢到看不出，二百多摄氏度时明显；和铜丝浸在酸里的比例成正比，铜丝拉出来就是 0。生成的 SO₂、CuSO₄、H₂O 按方程式算（每 1 mmol Cu 生成 1 mmol SO₂，25 ℃ 约 24.5 mL）。<br>试管 + 导管里的气体约 30 mL：先冒出的是受热膨胀的空气。通过品红溶液（4 mL）的 SO₂ 约 60% 溶进去；红色的比例按 1/(1 + K·c)，K 取 5000 L/mol（示意值，和“二氧化硫的漂白作用”一课相同）。其余的 SO₂ 被棉团里的 NaOH 溶液吸收。停止加热后气体冷却收缩，实际可能使品红溶液倒吸，课本这里没有写，模型没有画。<br>倒进 3 mL 水：接收管里的 H₂SO₄、水、CuSO₄ 按倒进去的量一份份加（溅出去的按比例一起减）。放热按积分溶解热（Perry 化学工程手册的数表，约值）的增量算，热容 = 试管玻璃约 16 J/K + 溶液；没冷却就倒，酸本身的热也算进去。沸点按混合液的浓度查硫酸水溶液的常压沸点（约值，50% 约 124 ℃）：整管不会到沸点。<b>局部飞溅是示意模型</b>：新倒进去的一小股先和约 1.5 倍质量的周围液体混合，这一小团超过它自己浓度的沸点就溅出液滴——冷却到 50 ℃ 以下慢慢倒不会溅，熄灯拔塞后马上倒（还在约 160 ℃ 以上）会溅。放热扣掉了进料（98% 的酸）自己已含的溶解热；每一份按它倒进水里时的温度算（倒的过程中试管也在变凉）。没等冷却就倒，不管溅没溅都不算完成这一步。液体体积不计混合时的收缩。<br>浓硫酸里水很少，生成的硫酸铜没有溶解成蓝色溶液，画成灰白色固体（无水硫酸铜是白色的，见课本第 6 页资料卡片）；实际实验中还可能出现少量黑色沉积（多少随加热方式和强度而变，课本没有提，成分这里不讲），画成个别灰黑色小点，只表示“可能出现”。卡片上的 CuSO₄ 量按课本主反应、把反应掉的铜全部算成 CuSO₄ 估算。溶于水显蓝色，深浅按 Cu²⁺ 浓度。<br>青色小点 = SO₂（示意色，实际无色）；橙色 = 热。“钻进去看”是慢放示意，不表示真实的反应步骤。' }));
        const base = mountXuean(ui, { controls: [vary, more, note], headers: ['做了什么', '现象', '说明'], intro: '图5-6 的装置：试管里已经加了 2 mL 浓硫酸（老师演示里有加酸、塞塞子这两步），塞好了橡胶塞；橡胶塞侧面的凹槽里嵌着下端卷成螺旋状的铜丝，铜丝下端还在液面上方。这是老师演示的实验：浓硫酸具有很强的腐蚀性，注意安全防护！' });
        ui.data.append(t1.el, t2.el, t3.el, base.next);
        W = { ...base, ui, t1, t2, t3, status: ui.status }; bar.attach(ui);
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); mic.update(dt, k); },
      dispose() { bar.dispose(); drag.dispose(); mic.dispose?.(); },
      debug: {
        get S() { return S; }, bar, A, mic, fRed, wireAnchor, cyl,
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
