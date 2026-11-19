// 人教版高中化学必修第一册第 14 页【实验1-2】（图1-9 试验物质的导电性）：
//   在三个烧杯中分别加入干燥的 NaCl 固体、KNO₃ 固体和蒸馏水，如图1-9 连接装置，将石墨电极依次放入三个烧杯中，分别接通电源，观察并记录现象。
//   取上述烧杯中的 NaCl 固体、KNO₃ 固体各少许，分别加入另外两个盛有蒸馏水的烧杯中，用玻璃棒搅拌，使固体完全溶解形成溶液。
//   将石墨电极依次放入 NaCl 溶液、KNO₃ 溶液中，分别接通电源，观察并记录现象。
// 课本第 14–16 页：干燥的 NaCl、KNO₃ 固体都不导电，蒸馏水也不导电（脚注：严格地说也能导电，只是非常弱，这个装置测不出）；
//   NaCl 溶液、KNO₃ 溶液都能导电。能导电的物质必须具有能自由移动的、带电荷的粒子：固体里 Na⁺、Cl⁻ 紧密排列不能自由移动（图1-10）；
//   溶于水形成能够自由移动的水合离子（图1-11）；接通电源，水合钠离子向与电源负极相连的电极移动，水合氯离子向与正极相连的电极移动（图1-12 左）。
// 模型（示意，界面上写明）：
//   学生电源直流 6 V；小灯泡 6.3 V 0.15 A（热态约 42 Ω，冷态约 4 Ω，电阻随功率变）——额定电压高于电源电压，怎么接都不会过载；亮度 = 实际功率 ÷ 额定功率。
//   两根石墨电极（直径 6 mm、相距 2 cm）之间溶液的电阻 R = arccosh(d / 2a) ÷ (π κ L)，L 是浸在液体里的长度（50 mL 水约 2.5 cm）。
//   电导率 κ = Λ·c（Λ 按科尔劳施公式 Λ = Λ° − A√c：NaCl Λ° = 126.4、KNO₃ 144.9 S·cm²/mol，A 按 0.1 mol/L 时的实测值取，25 ℃）；蒸馏水 κ 约 1 μS/cm。
//   c 按配成后的溶液体积算（密度按质量分数近似）。定量读数只在每种溶质 ≤ 0.2 mol/L 内给出；更浓时 κ 只作单调的定性外推，卡片上不给电流数值。
//   干燥的固体：离子不能自由移动，电阻按无穷大算（不计电极上的反应）。
//   药匙取“少许”按 0.5 g；溶解速度示意（时间加快约 10 倍），搅拌快得多；溶解度 NaCl 36.0 g、KNO₃ 31.6 g / 100 g 水（20 ℃）。
import * as THREE from 'three';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs, mountXuean, moreBox, varyBox } from './kit/chemlesson.js';
import { draggable, clamp } from './kit/interact.js';
import { chemBeaker, CHEM } from './kit/chem.js';
import { micro } from './kit/microworld.js';
import { Particles } from './kit/fx.js';
import { powerSupply, bulbHolder, electrodes, wire, saltHeap, spoon as makeSpoon, glassRod, dianzhiScene, plate } from './kit/dianzhi-parts.js';
import { paint, inked } from '../live/ink.js';
import { sfx } from './kit/audio.js';
import { h } from '../ui/Panel.js';

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const XS = [-0.14, -0.078, -0.016, 0.08, 0.142], RZ = 0, SZ = 0.013;          // 五个烧杯的位置；药匙、玻璃棒在烧杯里时靠前一点（让开电极）
const BR = 0.024, BH = 0.064, RIM = BH, WATER = 50;          // 100 mL 烧杯；蒸馏水 50 mL
const LEVEL = 0.0012 + WATER * 1e-6 / (Math.PI * (BR - 0.0012) ** 2);          // 水面高度（约 3.2 cm）
const SUP = V(-0.092, 0, -0.15), BULB = V(0.034, 0, -0.106), BULB_K = 1.5;          // 小灯泡放大 1.5 倍画（它是主角）
const HEAD_HOME = V(0.122, 0.007, 0.082), SPOON_HOME = V(-0.13, 0.002, 0.092), ROD_HOME = V(-0.035, 0.0026, 0.1);
const SCOOP = 0.5, MNA = 58.44, MK = 101.1, SOL = { na: 0.36, k: 0.316 };          // 一勺“少许”（g）；摩尔质量；溶解度（g / g 水，20 ℃）
// 电路：6 V 直流；小灯泡 6.3 V 0.15 A（额定电压高于电源电压：电极间电阻再小，灯两端也不超过 6 V，不会过载）
const U = 6, RB0 = 4, RBH = 6.3 / 0.15, PR = 6.3 * 0.15, CMAX = 0.2;
const ROD_A = 0.003, ROD_D = 0.02, ROD_BOT = 0.006;
const ROD_IN = ROD_BOT + 0.1, ROD_FREE = 0.178;          // 玻璃棒（原点在上端，长 0.1 m）：伸到杯底附近 / 拿着走时下端高过杯口
const LN = { na: [126.4, 62], k: [144.9, 77.5] };          // Λ°、A（S·cm²/mol）
const NAME = { naS: '干燥的 NaCl 固体', kS: '干燥的 KNO₃ 固体', mixS: '干燥的 NaCl、KNO₃ 固体', water: '蒸馏水', naL: 'NaCl 溶液', kL: 'KNO₃ 溶液', mixL: 'NaCl、KNO₃ 混合溶液', empty: '空烧杯' };

export default {
  id: 'dianzhi',
  fig: '图1-9',
  title: '试验物质的导电性',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '干燥的 NaCl 固体不导电，蒸馏水也不导电。把 NaCl 溶进蒸馏水里，接通电源，小灯泡会亮吗？',
    hint: '课本第 14 页【实验1-2】。先猜，再动手。',
    options: ['会亮', '不会亮：两样都不导电，合在一起也不导电', '只导一点点电，灯不亮'],
    answer: 0,
  },
  need: '石墨电极依次放进干燥的 NaCl 固体、KNO₃ 固体和蒸馏水，分别接通电源；再把两种固体各取少许溶进蒸馏水，搅拌至完全溶解，再分别试验',
  conclusion: {
    crops: [{ page: 18, rect: [218, 626, 538, 692] }, { page: 18, rect: [58, 742, 420, 760] }, { page: 19, rect: [62, 266, 380, 518] }, { page: 20, rect: [218, 54, 532, 140] }],
    quote: '实验表明，干燥的NaCl 固体、KNO3 固体都不导电，蒸馏水也不导电①。但是，NaCl溶液、KNO3溶液却都能够导电。……①严格地说，蒸馏水也能导电，只是导电能力非常弱，用上述实验装置不能测出。……我们知道，电流是由带电荷的粒子按一定方向移动而形成的。因此，能导电的物质必须具有能自由移动的、带电荷的粒子。电解质的水溶液（或熔化而成的液体）能够导电，说明在这些水溶液（或液体）中，存在着能自由移动的、带电荷的粒子。例如，NaCl固体中含有带正电荷的钠离子（Na+）和带负电荷的氯离子（Cl-），由于带相反电荷的离子间的相互作用，Na+和Cl-按一定规则紧密地排列着。这些离子不能自由移动，因而干燥的NaCl固体不导电（如图1-10）。当将NaCl固体加入水中时，在水分子的作用下，Na+和Cl-脱离NaCl固体的表面，进入水中，形成能够自由移动的水合钠离子和水合氯离子（如图1-11）。当在NaCl溶液中插入电极并接通电源时，带正电荷的水合钠离子向与电源负极相连的电极移动，带负电荷的水合氯离子向与电源正极相连的电极移动，因而NaCl溶液能够导电（如图1-12左）。',
    formula: 'NaCl ══ Na⁺ + Cl⁻　　KNO₃ ══ K⁺ + NO₃⁻　（电离方程式，课本第 16 页）',
    why: '干燥的 NaCl、KNO₃ 固体里也有离子，可它们按一定规则紧密地排列着，<b>不能自由移动</b>——不导电，没有电流。<br>蒸馏水不一样：它里面能自由移动的、带电荷的粒子<b>极少</b>，严格地说也能导电，只是导电能力非常弱（这套装置里电流只有约 26 μA），小灯泡不亮，用这套装置测不出——课本说它“不导电”，就是在这个意义上说的。<br>固体溶进水里，在水分子的作用下，离子脱离固体表面进入水中，成了<b>能够自由移动的水合离子</b>。接通电源，带正电荷的水合离子向与电源负极相连的电极移动，带负电荷的水合离子向与电源正极相连的电极移动，形成电流，小灯泡亮了。同一种溶质、同一温度下，溶液越浓，能自由移动的离子越多，导电能力越强。<br>在水溶液里或熔融状态下能够导电的化合物叫做<b>电解质</b>，NaCl、KNO₃ 都是电解质。湿手接触电源容易触电，也是因为手上的 NaCl 等电解质遇到水形成了电解质溶液。',
    src: '课本第 14–16 页 · 第一章 第二节 离子反应',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    paperSheet(group, { w: 0.44, d: 0.34, x: 0, z: -0.025 });

    // ---- 五个烧杯：干燥的 NaCl 固体、KNO₃ 固体、蒸馏水 | 两杯蒸馏水（后面配溶液用）----
    const beakers = XS.map((x) => { const b = chemBeaker({ r: BR, h: BH, level: 0, color: CHEM.water, marks: true }); b.position.set(x, 0, RZ); b.rotation.y = -Math.PI * 0.5; group.add(b); return b; });
    const heaps = XS.map((x, i) => { const hp = saltHeap({ needle: i === 1 }); hp.position.set(x, 0.0012, RZ); group.add(hp); return hp; });
    const labels = XS.map(() => ({ key: '', mesh: null }));
    // ---- 学生电源、小灯泡、电极、导线 ----
    const sup = powerSupply(); sup.position.copy(SUP); group.add(sup);
    const bulb = bulbHolder(); bulb.position.copy(BULB); bulb.scale.setScalar(BULB_K); group.add(bulb);
    const head = electrodes(); group.add(head);
    const wRed = wire(group, 0xc23a2e), wBlk = wire(group, 0x2b2f36), wMid = wire(group, 0x2b2f36);
    wMid.update(SUP.clone().add(sup.term.neg), BULB.clone().add(bulb.term.a.clone().multiplyScalar(BULB_K)), 0.03);          // 电源负极 → 小灯泡（不动）
    // ---- 药匙、玻璃棒 ----
    const sp = makeSpoon(); group.add(sp);
    const rod = glassRod(0.1); group.add(rod);
    const card = tag('', 'cond');
    // 电极放回来的那张滤纸（湿电极放回这里擦干）；松手时接收器材的那只烧杯，脚下亮一圈
    const filter = inked(new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.0008, 0.082), paint(0xfffdf6, { keep: true })), { width: 0.5, opacity: 0.6 }); filter.position.set(HEAD_HOME.x, 0.0006, HEAD_HOME.z + 0.026); group.add(filter);
    const ring = new THREE.Mesh(new THREE.RingGeometry(BR + 0.0016, BR + 0.0052, 48), new THREE.MeshBasicMaterial({ color: 0xf08a2c, transparent: true, opacity: 0.9, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.0009; ring.visible = false; ring.raycast = () => {}; group.add(ring);
    const salts = new Particles({ max: 90, geometry: new THREE.BoxGeometry(1, 1, 1), material: paint(0xfbfbf8, { keep: true }) }); group.add(salts.mesh);

    const fresh = () => ({
      demo: false, near: false, power: false, fresh: false, wet: false, dirty: false, clock: 0, bShow: 0, b: 0, I: 0, testT: 0, lastBk: -1, rows: {}, said: {}, at: -1,
      bk: [{ w: 0, na: 20, k: 0, dna: 0, dk: 0, adds: 0 }, { w: 0, na: 0, k: 20, dna: 0, dk: 0, adds: 0 }, ...[0, 0, 0].map(() => ({ w: WATER, na: 0, k: 0, dna: 0, dk: 0, adds: 0 }))],
      stir: [0, 0, 0, 0, 0],
      tools: {
        head: { pos: HEAD_HOME.toArray(), drag: false, hand: null, go: null, wait: 0 },
        spoon: { pos: SPOON_HOME.toArray(), drag: false, hand: null, go: null, wait: 0, na: 0, k: 0, tilt: 0, pour: 0, inBk: false, dumping: -1 },
        rod: { pos: ROD_HOME.toArray(), drag: false, hand: null, go: null, wait: 0, in: -1, lastH: null },
      },
    });
    S = fresh();

    // ================= 化学和电路模型 =================
    const kindOf = (b) => {
      if (!b.w) return b.na > 0 && b.k > 0 ? 'mixS' : b.na > 0 ? 'naS' : b.k > 0 ? 'kS' : 'empty';
      const n = b.na + b.dna, k = b.k + b.dk;
      return n > 0 && k > 0 ? 'mixL' : n > 0 ? 'naL' : k > 0 ? 'kL' : 'water';
    };
    const undis = (b) => (b.w ? b.na + b.k : 0);
    const full = (b) => b.w > 0 && undis(b) < 1e-9 && b.dna + b.dk > 0;
    const nameOf = (b) => { const k = kindOf(b); return k.endsWith('L') && undis(b) > 0 ? (b.dna + b.dk > 0 ? `${NAME[k]}（开始溶解，仍有固体）` : `蒸馏水 + ${k === 'naL' ? 'NaCl' : k === 'kL' ? 'KNO₃' : 'NaCl、KNO₃'} 固体（还没溶解）`) : NAME[k]; };
    const plateOf = (b, i) => { const k = kindOf(b); return k === 'naS' ? 'NaCl 固体' : k === 'kS' ? 'KNO₃ 固体' : k === 'mixS' ? '混合固体' : k === 'water' ? (i === 2 ? '蒸馏水（对照）' : '蒸馏水（配液用）') : k === 'empty' ? '' : undis(b) > 0 ? `蒸馏水 + ${k === 'naL' ? 'NaCl' : k === 'kL' ? 'KNO₃' : '两种固体'}` : k === 'naL' ? 'NaCl 溶液' : k === 'kL' ? 'KNO₃ 溶液' : '混合溶液'; };
    // 浓度按配成后的溶液体积算：V = (水 + 溶质) ÷ ρ，ρ ≈ 0.998 + 0.72·w(NaCl) + 0.64·w(KNO₃)（20 ℃ 密度表的近似，10% 时误差 < 0.5%）
    const vol = (b) => { const m = b.w + b.dna + b.dk; return m / (0.998 + (0.72 * b.dna + 0.64 * b.dk) / m); };          // mL
    const conc = (b) => { if (!b.w) return { na: 0, k: 0 }; const V = vol(b) / 1000; return { na: b.dna / MNA / V, k: b.dk / MK / V }; };          // mol/L
    const inRange = (b) => { const c = conc(b); return c.na <= CMAX && c.k <= CMAX; };          // 定量读数只在定标范围内给出
    // κ：每种溶质在 ≤ 0.2 mol/L 内按科尔劳施公式（用 0.1 mol/L 的实测值定标）；更浓时只作单调的定性外推（κ ∝ c^0.8），不给数值
    const kappa = (b) => { const c = conc(b), K = (s) => { const cc = Math.min(c[s], CMAX); let k = 0.1 * (LN[s][0] - LN[s][1] * Math.sqrt(cc)) * cc; if (c[s] > CMAX) k *= Math.pow(c[s] / CMAX, 0.8); return k; }; return K('na') + K('k') + 1e-4; };          // S/m；蒸馏水约 1 μS/cm
    const rSol = (b) => { if (!b.w) return Infinity; const L = LEVEL - ROD_BOT; return Math.acosh(ROD_D / (2 * ROD_A)) / (Math.PI * kappa(b) * L); };
    const circuit = (R) => { if (!isFinite(R)) return { I: 0, b: 0 }; let rb = RB0, I = 0; for (let i = 0; i < 30; i++) { I = U / (R + rb); const P = I * I * rb; rb = rb * 0.5 + 0.5 * (RB0 + (RBH - RB0) * Math.min(1.2, Math.sqrt(P / PR))); } return { I, b: (I * I * rb) / PR }; };
    const live = () => S.power && S.at >= 0 && !S.tools.head.go && !S.tools.head.drag;
    // 有没有电流（导电）和灯泡看不看得出亮是两回事：导电与否按电流的数量级判断，不按灯泡亮度反推
    const nw = (t) => `<span style="white-space:nowrap">${t}</span>`;          // 记录表里主要的几个字不折行
    // 导电的状态：干燥固体没有电流；蒸馏水按课本写“不导电”（脚注：严格地说导电能力非常弱，这套装置测不出，约 26 μA）；
    //   溶进了盐就有能自由移动的离子：电流不到 1 mA 时“导电很弱”（这套装置测不出），够了就是“导电”。1 mA 只用来说明装置能不能检出
    const dis = (b) => b.dna + b.dk;
    const cond = (b, I) => { const k = kindOf(b); return k.endsWith('S') || k === 'empty' || I <= 0 ? 'none' : dis(b) <= 0 ? 'water' : I < 1e-3 ? 'weak' : 'yes'; };
    const COND = { none: '不导电', water: `${nw('不导电')}<br><small>严格地说导电能力非常弱，这套装置测不出</small>`, weak: `${nw('导电很弱')}<br><small>电流不到 1 mA，这套装置测不出</small>`, yes: '导电' };
    const bulbWord = (b, c) => (b >= 0.25 ? nw('小灯泡<b>亮</b>') : b >= 0.03 ? nw('小灯泡<b>微微发亮</b>') : c === 'weak' || c === 'yes' ? `${nw('小灯泡<b>不亮</b>')}<br><small>电流很小，不足以使灯泡发光</small>` : nw('小灯泡<b>不亮</b>'));
    const lvOf = (c, b) => (b >= 0.25 ? 4 : b >= 0.03 ? 3 : c === 'yes' ? 2 : c === 'weak' ? 1 : 0);
    const amp = (I) => (I >= 0.1 ? `${(I * 1000).toFixed(0)} mA` : I >= 1e-3 ? `${(I * 1000).toFixed(1)} mA` : I > 0 ? `${(I * 1e6).toFixed(0)} μA` : '0');
    const pairsOf = (mmol) => (mmol < 0.05 ? 0 : clamp(Math.round(mmol / 2.85), 1, 4));          // 钻进去看：一对离子约代表 2.85 mmol（一勺 0.5 g NaCl 画 3 对）

    // ================= 工具：手拿着走（先竖直提起来，再跟着手平移）；松手放进手下的烧杯，或者很快放回原处 =================
    const CARRY = { head: 0.15, spoon: 0.1, rod: ROD_FREE }, HOME = { head: HEAD_HOME, spoon: SPOON_HOME, rod: ROD_HOME };
    const go = (key, dest, event = '') => { const t = S.tools[key]; t.drag = false; t.go = { to: dest.toArray(), event }; };
    const home = (key) => { const t = S.tools[key]; t.drag = false; t.go = { home: true, event: key === 'head' ? 'rest' : '' }; };
    const under = (h) => (h ? XS.findIndex((bx) => Math.hypot(h[0] - bx, h[1] - RZ) < BR + 0.002) : -1);          // 手下是哪只烧杯（在杯口范围内就算；杯与杯之间的空隙不接收）
    const heapTop = (i) => 0.0012 + heapH(i);
    const heapH = (i) => { const b = S.bk[i]; return b.w ? 0.45 * heapR(i) : 0.004 + 0.012 * Math.min(1.3, (b.na + b.k) / 20); };
    const heapR = (i) => { const b = S.bk[i], m = b.na + b.k; return b.w ? Math.min(0.018, 0.0085 * Math.cbrt(m / SCOOP)) : (m > 0 ? BR - 0.0016 : 0); };
    const DOCK = {
      head: (i) => V(XS[i], RIM, RZ),
      scoop: (i) => V(XS[i] - 0.006, heapTop(i) + 0.001, SZ),
      dump: (i) => V(XS[i] - 0.004, 0.094, SZ),
    };
    const events = {
      dock(i) {
        S.at = i; S.lastBk = i; S.testT = 0; S.fresh = false; sfx.clink({ freq: 900, gain: 0.015 });
        const b = S.bk[i];
        S.dirty = S.wet && !b.w;          // 湿电极插进干燥的固体：沾着的溶液会溶解一点固体，这次读数不能算干燥固体的
        if (S.dirty) { status(`电极是<b>湿的</b>，还沾着上一杯的液体：插进${nameOf(b)}，测的就不是干燥的固体了。把电极拖回<b>滤纸</b>上擦干，再来试。`); return; }
        status(`石墨电极放进了<b>${nameOf(b)}</b>里。${S.power ? '电源还开着：课本要求<b>分别接通电源</b>——点一下学生电源先断开，再接通，然后看小灯泡。' : '点一下<b>学生电源</b>，接通电源，看小灯泡。'}`);
      },
      rest() { if (S.wet) { S.wet = false; S.dirty = false; status('电极放回滤纸上，擦干了。'); } },
      scoop(i) {
        const b = S.bk[i], m = b.na + b.k, take = Math.min(SCOOP, m), t = S.tools.spoon;
        t.na = (take * b.na) / m; t.k = (take * b.k) / m; b.na -= t.na; b.k -= t.k; S.lastBk = i;
        sfx.clink({ freq: 1500, gain: 0.015 }); t.wait = 0.45;
        status(`药匙取了少许 ${t.k > t.na ? 'KNO₃' : 'NaCl'} 固体（约 0.5 g）。拖到<b>盛有蒸馏水的烧杯</b>上方，松手加进去。`);
      },
      dump(i) { const t = S.tools.spoon; t.dumping = i; t.wait = 0.9; S.lastBk = i; },
    };
    const afterWait = {
      spoon() {
        const t = S.tools.spoon;
        if (t.dumping >= 0) {
          const i = t.dumping, b = S.bk[i], salt = t.k > t.na ? 'KNO₃' : 'NaCl';
          b.na += t.na; b.k += t.k; b.adds++; t.na = t.k = 0; t.dumping = -1;
          status(i === 2 && b.w ? `${salt} 加进了中间那杯<b>蒸馏水（对照）</b>：它就不再是蒸馏水了。要重做蒸馏水的对照，点“更多”里的<b>换新的蒸馏水</b>。` : b.w ? `${salt} 固体加进了蒸馏水。用<b>玻璃棒</b>搅拌：拖到这杯的杯口上方，放进杯里，按住来回拖。` : `${salt} 固体放回了干燥的固体里（烧杯里没有水，不会溶解）。`);
        }
        t.inBk = true; home('spoon');
      },
    };
    // 松手：手在哪只烧杯的杯口上方，就放进那只（电极放进去、药匙伸进去取 / 侧过来倒）；别处松手很快放回原处
    const release = (key) => {
      const t = S.tools[key], i = under(t.hand); t.hand = null;
      if (key === 'head') return i >= 0 ? go('head', DOCK.head(i), `dock:${i}`) : home('head');
      if (key === 'spoon') {
        if (i < 0) return home('spoon');
        const b = S.bk[i];
        if (t.na + t.k > 0) return go('spoon', DOCK.dump(i), `dump:${i}`);
        if (!b.w && b.na + b.k > 0) return go('spoon', DOCK.scoop(i), `scoop:${i}`);
        status(b.w ? '药匙是空的：先到<b>干燥的 NaCl 或 KNO₃ 固体</b>里取少许。' : '这个烧杯是空的。');
        return home('spoon');
      }
      if (key === 'rod') { t.in = -1; t.lastH = null; return home('rod'); }
    };

    const A = {
      tapPower() {
        S.power = !S.power; sup.setOn(S.power); S.testT = 0; sfx.clink({ freq: S.power ? 700 : 500, gain: 0.02 });
        S.fresh = S.power && S.at >= 0 && !S.tools.head.go;          // 电极放稳以后再接通，才算这一杯的观察（课本：分别接通电源）
        status(S.power ? (S.at >= 0 ? (S.dirty ? '接通了电源。可电极是湿的，这次不算干燥固体的读数：先把电极拖回滤纸上擦干。' : '接通了电源。看小灯泡亮不亮。') : '接通了电源。可是电极没有放进烧杯里——电路是断开的。') : '断开了电源。');
      },
      refill() {
        for (const i of [2, 3, 4]) { S.bk[i] = { w: WATER, na: 0, k: 0, dna: 0, dk: 0, adds: S.bk[i].adds + 1 }; S.stir[i] = 0; delete S.said['full' + i]; }
        if (S.at >= 2) S.testT = 0;
        status('右边三个烧杯倒掉，换成了新的蒸馏水（中间一杯是对照，右边两杯配液用）。记录还在。');
      },
      reset() { if (bar.playing) bar.stop(); S = fresh(); sync(); mic.close(); back(); W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; W.ui.relock(); } bar.undo('naS', 'kS', 'water', 'dissolve', 'naL', 'kL', 'why'); status('器材重新摆好了：三个烧杯里是干燥的 NaCl 固体、KNO₃ 固体和蒸馏水，另外两个烧杯里是蒸馏水。'); },
    };
    const toolXYZ = (key) => { const t = S.tools[key]; return V(...t.pos); };
    const sync = () => {
      salts.clear(); sup.setOn(S.power);
      head.position.fromArray(S.tools.head.pos); sp.position.fromArray(S.tools.spoon.pos); rod.position.fromArray(S.tools.rod.pos);
      for (const L of labels) L.key = '\u0000';
    };

    // ================= 拖、点 =================
    // 拖动平面：器材按下去时所在高度的水平面（手抓的地方就在这个面上），记住抓的地方和器材之差——按住时器材不跳，先竖直提起来，再跟着手平移
    const item = (key, obj, hint) => ({
      obj: obj.pick, plane: 'xz', get offset() { const t = S.tools[key]; return t.drag ? t.grabY : t.pos[1]; }, keepOffset: true, anchor: obj, hint,
      onStart: (p) => {
        const t = S.tools[key]; t.grabY = t.pos[1]; t.drag = true; t.go = null; t.wait = 0; t.hand = p ? [p.x, p.z] : [t.pos[0], t.pos[2]];
        if (key === 'head') { if (S.at >= 0 && S.bk[S.at].w) S.wet = true; S.at = -1; S.testT = 0; S.fresh = false; S.dirty = false; if (S.power) status('换烧杯之前先<b>断开电源</b>：放稳以后再接通（课本：分别接通电源）。'); }
        if (key === 'spoon') t.dumping = -1;
        if (key === 'rod') t.lastH = null;
      },
      onDrag: (p) => {
        if (!p) return; const t = S.tools[key];
        t.hand = [clamp(p.x, -0.19, 0.19), clamp(p.z, -0.12, 0.13)];
        if (key === 'rod') stirBy(t);
      },
      onEnd: () => { S.tools[key].drag = false; release(key); },
    });
    // 玻璃棒：在有水的烧杯口上方就放进杯里（下端到杯底附近），手在杯口范围里来回拖 = 搅拌；手移出杯口，先竖直提出来
    const inBox = (i, h) => [clamp(h[0], XS[i] - 0.0125, XS[i] + 0.0125), clamp(h[1], SZ - 0.003, SZ + 0.003)];          // 在杯里能走到哪儿（不碰杯壁、让开电极）
    function stirBy(t) {
      if (t.in >= 0 && t.lastH && t.pos[1] - rod.len < LEVEL) {
        const a = inBox(t.in, t.lastH), b = inBox(t.in, t.hand);
        S.stir[t.in] = Math.min(1, S.stir[t.in] + (Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1])) * 45); S.lastBk = t.in;
      }
      t.lastH = t.hand.slice();
    }
    const rodGoal = (t, p) => {
      const h = t.hand || [p.x, p.z];
      if (t.in >= 0) {
        if (Math.hypot(h[0] - XS[t.in], h[1] - RZ) < BR + 0.004) { const [x, z] = inBox(t.in, h); return V(x, ROD_IN, z); }
        if (p.y < ROD_FREE - 0.004) return V(p.x, ROD_FREE + 0.002, p.z);          // 手移出杯口：先竖直提出来
        t.in = -1;
      }
      if (p.y < ROD_FREE - 0.008) return V(p.x, ROD_FREE, p.z);          // 从桌上拿起来：先竖直提起来
      const i = XS.findIndex((bx) => Math.hypot(h[0] - bx, h[1] - RZ) < BR - 0.004);
      if (i < 0 || !(S.bk[i].w > 0)) return V(h[0], ROD_FREE, h[1]);
      const [x, z] = inBox(i, h);
      if (Math.abs(p.x - x) < 0.003 && Math.abs(p.z - z) < 0.003) { t.in = i; t.lastH = null; }          // 到了杯口正上方，再放下去
      return V(x, ROD_FREE, z);
    };
    // 每帧：拿着 → 跟着手；要放到某处 / 放回原处 → 先竖直提到工作高度，平移到上方，再放下去
    const seek = (key, dt) => {
      const T = S.tools[key], p = V(...T.pos), cy = CARRY[key];
      if (T.drag) {
        const h = T.hand || [p.x, p.z];
        const goal = key === 'rod' ? rodGoal(T, p) : p.y < cy - 0.008 ? V(p.x, cy, p.z) : V(h[0], cy, h[1]);
        p.lerp(goal, 1 - Math.exp(-dt * 26));
      } else if (T.go) {
        const dest = T.go.home ? HOME[key] : V(...T.go.to), far = Math.hypot(p.x - dest.x, p.z - dest.z) > 0.003;
        p.lerp(far && p.y < cy - 0.008 ? V(p.x, cy, p.z) : far ? V(dest.x, Math.max(p.y, dest.y), dest.z) : dest, 1 - Math.exp(-dt * 18));
        if (!far && p.distanceTo(dest) < 0.0008) {
          p.copy(dest); const [ev, a] = T.go.event.split(':'); T.go = null;
          if (events[ev]) { events[ev](+a); if (key !== 'head' && !T.wait) home(key); }
        }
      }
      T.pos = p.toArray();
    };
    const drag = draggable(group, [
      item('head', head, () => (S.at >= 0 ? '石墨电极：拖到别的烧杯上方，松手放进去' : '石墨电极：拖到烧杯上方，松手放进去')),
      item('spoon', sp, () => (S.tools.spoon.na + S.tools.spoon.k > 0 ? '药匙：拖到右边“蒸馏水（配液用）”的烧杯上方，松手加进去' : '药匙：拖到干燥的固体上方，松手取少许')),
      item('rod', rod, () => '玻璃棒：拖到有水的烧杯口上方，放进杯里，按住来回拖（搅拌）'),
    ], { tip: tag('', 'pill'), taps: [{ obj: sup.pick, hint: () => (S.power ? '学生电源：点一下断开' : '学生电源：点一下接通电源'), onTap: () => A.tapPower() }] });
    const act = demoActs(drag, group);

    // ================= 钻进去看 =================
    const focus = () => (S.at >= 0 ? S.at : S.lastBk);
    const micState = () => {
      const i = focus(); if (i < 0) return { elec: false, on: false, water: false, solid: null, pairs: { NaCl: 0, KNO3: 0 }, undis: { NaCl: 0, KNO3: 0 }, name: '' };
      const b = S.bk[i], elec = S.at === i;
      return { elec, on: elec && S.power, glow: elec && live() ? S.b : 0, water: b.w > 0, solid: b.w ? null : b.na + b.k <= 0 ? null : b.na >= b.k ? 'NaCl' : 'KNO3',
        pairs: { NaCl: pairsOf((b.dna / MNA) * 1000), KNO3: pairsOf((b.dk / MK) * 1000) }, undis: { NaCl: b.w ? pairsOf((b.na / MNA) * 1000) : 0, KNO3: b.w ? pairsOf((b.k / MK) * 1000) : 0 }, name: nameOf(b) };
    };
    const mic = micro({ tag, look, back, group, scene: dianzhiScene(), at: () => V(XS[Math.max(0, focus())], 0.128, RZ), btnAt: () => V(XS[Math.max(0, focus())], 0.112, RZ), label: '钻进去看',
      state: micState, key: () => { const i = focus(), s = micState(); return `${i}|${s.elec}|${s.water}|${s.solid}|${i >= 0 ? S.bk[i].adds : 0}`; },
      show: () => focus() >= 0 && !S.tools.head.go && !S.tools.head.drag, bar: () => bar, scale: 0.0056, lookD: [0.02, 0.3, 1], dist: 0.34 });

    // ================= 步骤 =================
    const findKind = (k, needFull = false) => S.bk.findIndex((b) => kindOf(b) === k && (!needFull || full(b)));
    const testTarget = (k, needFull) => { const i = findKind(k, needFull); if (i < 0) return null; if (S.at !== i || S.tools.head.go || S.dirty) return S.power && S.at !== i ? sup : head; return S.power && S.fresh ? null : sup; };
    const dissolveTarget = () => {
      const t = S.tools.spoon;
      if (t.na + t.k > 0 || t.go) return sp;
      const partial = S.bk.findIndex((b) => b.w > 0 && undis(b) > 0);
      if (partial >= 0) return rod;
      return sp;
    };
    const headPath = (i, t0, t1) => act.path(head.pick, [() => toolXYZ('head'), () => toolXYZ('head').setY(0.16), V(XS[i], 0.16, RZ)], { t0, t1, release: t1 + 0.02 });
    const spoonPath = (i, t0, t1) => act.path(sp.pick, [() => toolXYZ('spoon'), () => toolXYZ('spoon').setY(0.1).setZ(SZ), V(XS[i], 0.1, SZ)], { t0, t1, release: t1 + 0.02 });
    const stirPts = (i, n = 18) => [() => toolXYZ('rod'), () => toolXYZ('rod').setY(0.2).setZ(SZ), V(XS[i], 0.2, SZ), V(XS[i], 0.15, SZ), ...Array.from({ length: n }, (_, j) => V(XS[i] + (j % 2 ? 0.011 : -0.011), 0.11, SZ)), V(XS[i], 0.215, SZ)];
    const rodPath = (i, t0, t1) => act.path(rod.pick, stirPts(i), { t0, t1, release: t1 + 0.02 });
    const tapSup = (at) => act.tap(sup.pick, at);
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'naS', title: '试 NaCl 固体', todo: '把<b>石墨电极</b>拖进干燥的 <b>NaCl 固体</b>，放稳后点一下<b>学生电源</b>接通电源，看小灯泡。', target: () => testTarget('naS') },
        { id: 'kS', title: '试 KNO₃ 固体', todo: '先<b>断开电源</b>，把石墨电极放进干燥的 <b>KNO₃ 固体</b>，放稳后再接通，看小灯泡。', target: () => testTarget('kS') },
        { id: 'water', title: '试蒸馏水', todo: '先断开电源，把石墨电极放进中间的<b>蒸馏水（对照）</b>，放稳后再接通，看小灯泡。', target: () => testTarget('water') },
        { id: 'dissolve', title: '配成溶液', todo: '用<b>药匙</b>取 NaCl、KNO₃ 固体各少许，分别加进右边两杯“蒸馏水（配液用）”；<b>玻璃棒</b>拖到杯口上方、放进杯里，按住来回拖，搅拌到固体完全溶解。', target: dissolveTarget },
        { id: 'naL', title: '试 NaCl 溶液', todo: '先断开电源，把石墨电极放进 <b>NaCl 溶液</b>，放稳后再接通，看小灯泡。', target: () => testTarget('naL', true) },
        { id: 'kL', title: '试 KNO₃ 溶液', todo: '先断开电源，把石墨电极放进 <b>KNO₃ 溶液</b>，放稳后再接通，看小灯泡。也可以<b>钻进去看</b>。', target: () => testTarget('kL', true) },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { sync(); mic.close(); }, view: { save: () => (mic.isOpen ? { mic: true } : null), restore: (v) => { if (v.mic) mic.open(); } } }),
          shots: [
            { cap: '三个烧杯里分别是干燥的 NaCl 固体、KNO₃ 固体和蒸馏水，按图1-9连接装置。把石墨电极放进 NaCl 固体，接通电源——小灯泡不亮。', dur: 8, cam: [[-0.07, 0.095, -0.03], [0.03, 0.36, 1], 0.56],
              during: act.seq(headPath(0, 0.03, 0.36), tapSup(0.68)) },
            { cap: '断开电源，把电极依次放进 KNO₃ 固体、蒸馏水，分别接通电源：小灯泡都不亮。', dur: 10, cam: [[-0.05, 0.095, -0.03], [0.03, 0.36, 1], 0.56],
              during: act.seq(tapSup(0.02), headPath(1, 0.05, 0.2), tapSup(0.36), tapSup(0.5), headPath(2, 0.53, 0.68), tapSup(0.86)) },
            { cap: '取 NaCl 固体、KNO₃ 固体各少许，分别加入另外两个盛有蒸馏水的烧杯中。', dur: 12, speed: 1.6, cam: [[0, 0.06, 0], [0.03, 0.42, 1], 0.5],
              during: act.seq(tapSup(0.02), spoonPath(0, 0.03, 0.12), spoonPath(3, 0.28, 0.37), spoonPath(1, 0.53, 0.62), spoonPath(4, 0.78, 0.87)) },
            { cap: '用玻璃棒搅拌，使固体完全溶解形成溶液。', dur: 10, speed: 1.6, cam: [[0.11, 0.1, 0], [0.03, 0.34, 1], 0.48],
              during: act.seq(rodPath(3, 0.03, 0.44), rodPath(4, 0.5, 0.9)) },
            { cap: '把石墨电极依次放入 NaCl 溶液、KNO₃ 溶液中，分别接通电源——小灯泡都亮了。', dur: 9, cam: [[0.05, 0.095, -0.03], [0.03, 0.36, 1], 0.56],
              during: act.seq(headPath(3, 0.03, 0.2), tapSup(0.34), tapSup(0.54), headPath(4, 0.57, 0.72), tapSup(0.88)) },
            { cap: '钻进去看：水合离子在溶液里自由移动；接通电源，带正电荷的 K⁺ 向与电源负极相连的电极移动，带负电荷的 NO₃⁻ 向与电源正极相连的电极移动。演示完了，换你自己做。', dur: 7, cam: [[XS[4], 0.17, 0], [0.02, 0.3, 1], 0.36],
              enter: () => mic.open(true), during: act.at(0.98, () => mic.close()) },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ================= 记录：每一杯（每一种东西）一行 =================
    const record = (i) => {
      const b = S.bk[i], k = kindOf(b), key = `${i}:${k}`, c = cond(b, S.I), row = [nameOf(b), bulbWord(S.b, c), COND[c]], lv = lvOf(c, S.b);
      const first = !(key in S.rows), was = first ? -1 : S.rows[key].lv;
      if (!S.demo && W) { const txt = row.join('|'); if (first) S.rows[key] = { n: W.tbl.add(row) - 1, txt }; else if (S.rows[key].txt !== txt) { W.tbl.set(S.rows[key].n, row); S.rows[key].txt = txt; } }
      else if (first) S.rows[key] = { n: -1, txt: '' };
      S.rows[key].lv = Math.max(lv, was);
      if (!first && lv > was && k.endsWith('L')) status(lv === 4 ? `小灯泡<b>亮了</b>！溶解的越多，能自由移动的离子越多，电流越大。${full(b) ? '' : '还有固体没溶解。'}` : lv === 3 ? '小灯泡<b>微微发亮</b>了：电流在变大。接着搅拌。' : '电流超过 1 mA 了（导电），可还不足以使灯泡发光。接着搅拌。');
      if (first) {
        status(k === 'water' ? '蒸馏水：小灯泡<b>不亮</b>。（严格地说，蒸馏水也能导电，只是导电能力非常弱，用这个装置测不出。）'
          : k.endsWith('S') ? `${NAME[k]}：接通电源，小灯泡<b>不亮</b>。`
          : S.b >= 0.25 ? `${NAME[k]}：小灯泡<b>亮了</b>！${full(b) ? '' : '（还有固体没溶解）'}` : S.b >= 0.03 ? `小灯泡<b>微微发亮</b>……还有固体没溶解：搅拌，看它会不会更亮。` : c === 'weak' ? `${NAME[k]}：固体刚开始溶解，溶液里能自由移动的离子极少，<b>导电很弱</b>（电流不到 1 mA，这套装置测不出），小灯泡不亮。搅拌，看看会怎样。`
          : c === 'water' ? '固体还没开始溶解：和蒸馏水一样，小灯泡不亮。'
          : `${NAME[k]}：有电流，可是溶液里的离子还很少，电流很小，<b>不足以使灯泡发光</b>。${full(b) ? '' : '还有固体没溶解：搅拌，看它会不会亮起来。'}`);
      }
      if (k === 'naS') done('naS'); if (k === 'kS') done('kS'); if (k === 'water') done('water');
      if (k === 'naL' && full(b)) done('naL'); if (k === 'kL' && full(b)) done('kL');
      if (['naS', 'kS', 'water', 'naL', 'kL'].every((id) => bar.has(id)) && !S.said.t1 && !S.demo) { S.said.t1 = true; W?.t1.open(); status('五杯都试过了。看看你的记录，在左边作答。'); }
    };

    const step = (dt, t) => {
      S.clock += dt;
      for (const [key, obj] of [['head', head], ['spoon', sp], ['rod', rod]]) {
        const T = S.tools[key];
        if (T.wait > 0 && !T.go && !T.drag) { T.wait -= dt; if (T.wait <= 0) { T.wait = 0; if (afterWait[key]) afterWait[key](); else home(key); } }
        seek(key, dt); obj.position.fromArray(T.pos);
      }
      // 电极：拿起来竖着；放回纸上躺平（转动时下端不碰桌面）
      { const a = Math.acos(clamp((head.position.y - 0.007) / head.LEN, 0, 1)); head.rotation.set(-a, 0, 0); }
      { const a = Math.acos(clamp((rod.position.y - 0.0026) / rod.len, 0, 1)); rod.rotation.set(0, 0, a); }
      // 药匙：伸进固体里取的时候柄朝上斜着（不碰杯壁）；倒的时候侧过来
      { const T = S.tools.spoon;
        if (T.inBk && sp.position.y > 0.088 && !T.go?.event?.startsWith('scoop')) T.inBk = false;
        const want = T.go?.event?.startsWith('scoop') || (T.wait > 0 && T.dumping < 0) || T.inBk ? 1 : 0;
        T.tilt += (want - T.tilt) * Math.min(1, dt * 9); T.pour += ((T.dumping >= 0 && T.wait > 0 && !T.go ? 1 : 0) - T.pour) * Math.min(1, dt * 7);
        sp.rotation.set(-1.9 * T.pour, 0, 1.13 * T.tilt + 0.35 * T.pour);
        sp.load((T.na + T.k) / SCOOP);
        if (T.pour > 0.6 && T.dumping >= 0 && T.na + T.k > 0 && Math.random() < dt * 45) { const i = T.dumping; salts.spawn({ p: sp.position.clone().add(V((Math.random() - 0.5) * 0.004, -0.002, (Math.random() - 0.5) * 0.004)), v: V((Math.random() - 0.5) * 0.01, -0.02, (Math.random() - 0.5) * 0.01), size: 0.0009, life: 2, floor: S.bk[i].w ? 0.0016 : heapTop(i) }); }
      }
      salts.update(dt, (p, d) => { p.v.y -= (p.p.y < LEVEL ? 0.05 : 0.5) * d; if (p.p.y < LEVEL) p.v.multiplyScalar(Math.pow(0.05, d)); p.p.addScaledVector(p.v, d); p.size *= 1; return p.p.y > p.floor; });
      // 溶解：搅拌快得多；到饱和就不再溶解
      S.bk.forEach((b, i) => {
        S.stir[i] = Math.max(0, S.stir[i] - dt * 0.5);
        if (!b.w || b.na + b.k <= 0) return;
        const r = 0.03 + 1.6 * S.stir[i];
        for (const [s, d] of [['na', 'dna'], ['k', 'dk']]) {
          if (b[s] <= 0) continue;
          const room = Math.max(0, 1 - b[d] / (SOL[s] * b.w));
          const x = Math.min(b[s], b[s] * r * room * dt + 0.002 * r * room * dt); b[s] -= x; b[d] += x;
          if (b[s] < 0.01 * (b[s] + b[d]) && room > 0) { b[d] += b[s]; b[s] = 0; }
        }
        if (full(b) && !S.said['full' + i]) { S.said['full' + i] = true; status(`固体<b>完全溶解</b>了，形成了${NAME[kindOf(b)]}。${S.at === i && S.power ? '' : '把石墨电极放进去试一试。'}`); }
      });
      if (S.bk.some((b) => kindOf(b) === 'naL' && full(b)) && S.bk.some((b) => kindOf(b) === 'kL' && full(b))) done('dissolve');
      // 电路：电极在哪一杯、接没接通
      const c = live() ? circuit(rSol(S.bk[S.at])) : { b: 0, I: 0 };
      S.b = c.b; S.I = c.I; S.bShow += (S.b - S.bShow) * Math.min(1, dt * 12);
      bulb.set(S.bShow);
      if (live() && S.fresh && !S.dirty) { S.testT += dt; if (S.testT > 0.7) record(S.at); }
      // 画面：烧杯里的东西、字牌、导线
      S.bk.forEach((b, i) => {
        beakers[i].setLevel(b.w ? LEVEL : 0);
        heaps[i].setSize(heapR(i), heapH(i));
        const txt = plateOf(b, i), L = labels[i];
        if (L.key !== txt) { if (L.mesh) { group.remove(L.mesh); L.mesh.geometry.dispose(); L.mesh.material.map?.dispose(); L.mesh.material.dispose(); } L.key = txt; L.mesh = txt ? plate(txt, 0.054, 0.0105) : null; if (L.mesh) { L.mesh.rotation.x = -Math.PI / 2; L.mesh.position.set(XS[i], 0.0012, RZ + 0.04); group.add(L.mesh); } }
      });
      const postAt = (q) => q.clone().applyEuler(head.rotation).add(head.position);
      wRed.update(SUP.clone().add(sup.term.pos), postAt(head.post.l), 0.045);
      wBlk.update(BULB.clone().add(bulb.term.b.clone().multiplyScalar(BULB_K)), postAt(head.post.r), 0.045);
      { const c = live() ? cond(S.bk[S.at], S.I) : null, L = S.bShow, lamp = !live() ? '不亮' : L >= 0.25 ? '<b>亮</b>' : L >= 0.03 ? '<b>微微发亮</b>' : '不亮';
        const state = !S.power ? '电源没有接通' : S.at < 0 ? '电极不在烧杯里：电路断开' : S.dirty ? '电极是湿的：这次不算干燥固体的读数' : { none: '不导电', water: '不导电（严格地说导电能力非常弱，这套装置测不出）', weak: '导电很弱（这套装置测不出）', yes: '导电' }[c];
        card.text(`<div class="cc"><div class="cc-t"><span class="cc-name">电路</span></div><div class="cc-more">${S.at >= 0 ? `电极在：${nameOf(S.bk[S.at])}<br>` : ''}${S.power && S.at >= 0 ? '导电情况：' : ''}${state}<br>小灯泡：${lamp}${live() ? (inRange(S.bk[S.at]) ? `<br><small>电流约 ${amp(S.I)}（模型估算）</small>` : '<br><small>浓度超过约 0.2 mol/L：超出模型的定标范围，不给电流数值</small>') : ''}</div></div>`)
          .loc(group, BULB.x, 0.135, BULB.z).show(!bar.playing && !mic.isOpen); }
      // 松手前：哪只烧杯会接收它（杯与杯之间的空隙不接收；药匙、玻璃棒只在能用的杯上亮）
      { let at = -1;
        for (const key of ['head', 'spoon', 'rod']) { const T = S.tools[key]; if (!T.drag) continue; const i = key === 'rod' && T.in >= 0 ? T.in : under(T.hand); if (i < 0) continue; const b = S.bk[i];
          if (key === 'head') at = i; else if (key === 'spoon') at = T.na + T.k > 0 || (!b.w && b.na + b.k > 0) ? i : -1; else at = b.w > 0 ? i : -1; }
        ring.visible = at >= 0 && !bar.playing; if (at >= 0) ring.position.set(XS[at], 0.0009, RZ); }
      bar.near(S.near); mic.update?.(dt);
    };
    sync();

    return {
      group: root, pointer, card: false, toggles: ['cards', 'steps'],
      size: { w: 0.37, d: 0.31, h: 0.13 },
      view: { elev: 26, azim: -4, lookY: 0.42, frameMargin: 1.04 },
      mount(ui) {
        const ctx = () => { const rows = Object.entries(S.rows).filter(([, r]) => r.txt).map(([, r]) => { const [a, b2, c2] = r.txt.split('|'); const t = (x) => x.replace(/<br>/g, '（').replace(/<\/small>/g, '）').replace(/<[^>]+>/g, ''); return `<div>${a}：${t(b2)}，${t(c2)}</div>`; }); return rows.join('') || '<div>（还没有记录）</div>'; };
        const t2 = think({ q: '生活常识告诉我们，湿手操作电器设备容易发生触电事故。这是为什么？', ctx, options: ['手上沾有 NaCl 等电解质，遇到水形成电解质溶液，能够导电', '水本身导电能力很强', '皮肤沾了水就变成了金属一样的导体'], wrong: ['看看你的记录：蒸馏水那一杯，小灯泡不亮。', '和皮肤变不变没有关系：要看有没有能自由移动的、带电荷的粒子。'], ok: '对：人的手上常会沾有 NaCl（汗液的成分之一），有时也会沾有其他电解质，遇到水时形成电解质溶液。电解质溶液能够导电，所以湿手直接接触电源容易触电（课本第 15 页）。', status: (m) => W?.status(m), onOk: () => { done('why'); if (W) W.next.hidden = false; } });
        const t1 = think({ q: '干燥的 NaCl 固体、蒸馏水都不导电，NaCl 溶液却能导电。为什么？', ctx, options: ['溶液里有能自由移动的、带电荷的离子；固体里的离子紧密排列，不能自由移动', '固体里没有离子，溶进水里才有', 'NaCl 溶液里有水，水能导电'], wrong: ['NaCl 固体里本来就有 Na⁺ 和 Cl⁻——钻进去看看：它们排得整整齐齐，动不了。', '蒸馏水那一杯，小灯泡不亮。'], ok: '对：能导电的物质必须具有能自由移动的、带电荷的粒子。NaCl 溶于水，在水分子的作用下形成能够自由移动的水合钠离子和水合氯离子（课本第 15 页）。', status: (m) => W?.status(m), onOk: () => t2.open() });
        const vary = varyBox('多加几勺固体，小灯泡会更亮吗？也可以先把电极放进蒸馏水、接通电源，再加固体、搅拌——看小灯泡怎样一点点亮起来。');
        const more = moreBox([['钻进去看', () => mic.open()], ['换新的蒸馏水（右边三杯）', () => A.refill()]], () => A.reset());
        const note = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'), h('p', { class: 'fineprint', html: '学生电源直流 6 V；小灯泡 6.3 V 0.15 A（灯丝电阻随温度变，热时约 42 Ω），额定电压高于电源电压，所以溶液再浓也不会把灯泡烧坏；亮度按实际功率 ÷ 额定功率。<br>两根石墨电极直径 6 mm、相距 2 cm，浸在 50 mL 水里约 2.6 cm；电极间溶液的电阻按 R = arccosh(d/2a) ÷ (πκL) 估算。电导率 κ = Λc，Λ 按科尔劳施公式（NaCl Λ° = 126.4、KNO₃ 144.9 S·cm²/mol，用 0.1 mol/L 的实测值定标，25 ℃），c 按配成后的溶液体积算；只在每种溶质不超过约 0.2 mol/L 时给出电流数值，更浓时只作定性外推（卡片上不给数值）。蒸馏水约 1 μS/cm，电极间电阻二十多万欧，电流只有二三十微安，小灯泡不亮。干燥的固体按不导电算；不计电极上发生的反应。<br>药匙取“少许”按 0.5 g（一勺 NaCl 溶进 50 mL 水约 0.17 mol/L，KNO₃ 约 0.10 mol/L：同样一勺，KNO₃ 的物质的量少，按模型算电导率低一些、灯暗一些）。溶解快慢是示意（时间加快约 10 倍），搅拌快得多；溶解度按 20 ℃：NaCl 36.0 g、KNO₃ 31.6 g / 100 g 水。<br>“钻进去看”里一对离子约代表 2.85 mmol（数量示意）；水合离子周围画 3～4 个水分子；画面只是两个电极之间的一小块溶液，从一边移走的离子，另一边又有新的进来。' }));
        const base = mountXuean(ui, { controls: [vary, more, note], headers: ['烧杯里', '接通电源后', '导电吗'], intro: '三个烧杯里分别是干燥的 NaCl 固体、KNO₃ 固体和蒸馏水（对照）；右边两个烧杯里也是蒸馏水，后面配溶液用。先把石墨电极放进 NaCl 固体。' });
        ui.data.append(t1.el, t2.el, base.next);
        W = { ...base, ui, t1, t2, status: ui.status }; bar.attach(ui);
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { bar.dispose(); drag.dispose(); mic.dispose?.(); salts.dispose(); wRed.dispose(); wBlk.dispose(); wMid.dispose(); },
      debug: {
        get S() { return S; }, bar, A, circuit, rSol, kindOf, bulbMark: bulb,
        picks: { head: head.pick, spoon: sp.pick, rod: rod.pick, sup: sup.pick },
        qa: qaFlow(drag, [
          { name: '电极放进 NaCl 固体', drag: head.pick, to: () => V(XS[0], 0.15, RZ), wait: 2 },
          { name: '接通电源 1', tap: sup.pick, wait: 1.5 },
          { name: '断开 1', tap: sup.pick, wait: 0.3 },
          { name: '电极放进 KNO₃ 固体', drag: head.pick, to: () => V(XS[1], 0.15, RZ), wait: 2 },
          { name: '接通电源 2', tap: sup.pick, wait: 1.5 },
          { name: '断开 2', tap: sup.pick, wait: 0.3 },
          { name: '电极放进蒸馏水', drag: head.pick, to: () => V(XS[2], 0.15, RZ), wait: 2 },
          { name: '接通电源 3', tap: sup.pick, wait: 1.5 },
          { name: '断开 3', tap: sup.pick, wait: 0.3 },
          { name: '取 NaCl', drag: sp.pick, to: () => V(XS[0], 0.1, SZ), wait: 3 },
          { name: '加进 D', drag: sp.pick, to: () => V(XS[3], 0.1, SZ), wait: 4 },
          { name: '取 KNO₃', drag: sp.pick, to: () => V(XS[1], 0.1, SZ), wait: 3 },
          { name: '加进 E', drag: sp.pick, to: () => V(XS[4], 0.1, SZ), wait: 4 },
          // 玻璃棒：拿起来拖到杯口上方（放进杯里），按住来回拖几轮，再拖到另一杯，最后松手
          ...[3, 4].flatMap((i) => [
            { name: `玻璃棒放进 ${'DE'[i - 3]}`, run: () => { const d = drag.items().find((x) => x.obj === rod.pick); if (!S.tools.rod.drag) d.onStart(toolXYZ('rod')); d.onDrag(V(XS[i], ROD_FREE, SZ)); }, wait: 1.5 },
            ...[0, 1, 2].map((j) => ({ name: `搅拌 ${'DE'[i - 3]}-${j}`, run: () => { const d = drag.items().find((x) => x.obj === rod.pick); for (let n = 0; n < 16; n++) d.onDrag(V(XS[i] + (n % 2 ? 0.011 : -0.011), ROD_FREE, SZ)); d.onDrag(V(XS[i], ROD_FREE, SZ)); }, wait: 1.5 })),
          ]),
          { name: '放下玻璃棒', run: () => drag.items().find((x) => x.obj === rod.pick).onEnd(true), wait: 1 },
          { name: '电极放进 NaCl 溶液', drag: head.pick, to: () => V(XS[3], 0.15, RZ), wait: 2 },
          { name: '接通电源 4', tap: sup.pick, wait: 1.5 },
          { name: '断开 4', tap: sup.pick, wait: 0.3 },
          { name: '电极放进 KNO₃ 溶液', drag: head.pick, to: () => V(XS[4], 0.15, RZ), wait: 2 },
          { name: '接通电源 5', tap: sup.pick, wait: 1.5 },
          { name: '钻进去看', run: () => mic.open(), wait: 4 },
          { name: '合上', run: () => mic.close(), wait: 1 },
          { name: '核对', run: () => { const ok = ['naS', 'kS', 'water', 'dissolve', 'naL', 'kL'].every((id) => bar.has(id)) && S.b > 0.25; if (!ok) throw new Error(JSON.stringify({ left: bar.stepList.filter((s) => !bar.has(s.id)).map((s) => s.id), b: S.b, bk: S.bk })); }, wait: 1 },
          { name: '想一想 1', run: () => W.t1.el.querySelector('button').click() },
          { name: '想一想 2', run: () => W.t2.el.querySelector('button').click() },
        ]),
      },
    };
  },
};
