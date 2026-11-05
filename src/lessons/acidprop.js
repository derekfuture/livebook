// 课题2 常见的酸和碱 · 探究：酸的化学性质（课本下册第 69 页图 10-10）。
//
// (1) 白色点滴板上：两个孔里是稀盐酸，两个孔里是稀硫酸；分别滴紫色石蕊溶液、无色酚酞溶液，看颜色。
// (3) 两支试管里分别是稀盐酸、稀硫酸，各放入一枚生锈的铁钉：铁锈慢慢溶解，溶液变成黄色（Fe³⁺）；过一会儿取出，用水洗净——铁钉表面变得光亮。
//     铁锈溶完以后，铁接着和酸反应，冒出细小的气泡（氢气）——所以除锈时铁制品不能在酸里泡太久。
// (2) 金属和酸的反应在“金属与稀盐酸或稀硫酸的反应”一课里做过，这里放在想一想里回顾。
// 模型：铁锈按约 0.05 g Fe₂O₃ 计，Fe₂O₃ + 6HCl ══ 2FeCl₃ + 3H₂O，约 20 秒（时间加快）溶完；Fe³⁺ 溶液黄色深浅随溶解的量。
// 放铁钉（上册第 16 页：块状、密度大的东西放进玻璃容器，要让它沿器壁缓缓滑到底，以免打破容器）：试管里有酸，不能横放——
//   把试管从架子上拿起来、倾斜，铁钉放在管口，沿管壁慢慢滑下去，再把试管竖直放回。倾斜时液面还是平的（世界坐标里的裁切面）。
// 滴管（上册第 17 页）：平时竖着插在滴瓶里；拿起来一直竖着（橡胶帽在上），到点滴板孔上方悬空滴；用完插回原滴瓶。
import * as THREE from 'three';
import { buttons, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { textPlate } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { testTube, glassMat } from './kit/chem.js';
import { water2, bubble2 } from './kit/chemfx.js';
import { dropBottle, homeLift } from './kit/labops.js';
import { micro, metalScene } from './kit/microworld.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked, glassEdge } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const PLATE = new THREE.Vector3(-0.07, 0, 0);
const WELLS = [[-0.022, -0.012, 'HCl'], [0.0, -0.012, 'HCl'], [-0.022, 0.012, 'H2SO4'], [0.0, 0.012, 'H2SO4']];
const ACID = { HCl: '稀盐酸', H2SO4: '稀硫酸' };
// 两个滴瓶放在点滴板后面的左右两边（不挡住孔；滴管在孔上方时也不和滴瓶叠在一起）；drop：滴下去的液滴（酚酞溶液是无色的）
const IND = [{ key: 'lit', name: '石蕊溶液', color: 0x8b5fb0, acid: 0xd9455f, drop: 0x9a7fc0, bottle: new THREE.Vector3(-0.125, 0, -0.045) }, { key: 'ph', name: '酚酞溶液', color: 0xf2f2ee, acid: 0xf2f2ee, drop: 0xd6eaf2, liq: 0xe0ecef, bottle: new THREE.Vector3(-0.037, 0, -0.045) }];
const CARRY_Y = 0.055, DRIP_Y = 0.017;            // 拿着滴管走时滴管尖的高度（高过滴瓶口）；在孔上方悬空滴时滴管尖的高度（离板面约 1 cm）
// 盘里两枚铁钉并排平放（原点在钉尖，钉帽朝左）
const TX = [0.07, 0.11], T_R = 0.009, T_LEN = 0.11, T_Y = 0.012, NAIL_HOME = [new THREE.Vector3(0.095, 0.0072, 0.057), new THREE.Vector3(0.095, 0.0072, 0.073)];
const LIQ_H = 0.0362;                             // 试管竖直时酸的液面离管底的高度
// 放铁钉时试管怎么动：C 是试管中点，th 是倾斜角（正：管口朝左上）。铁钉在试管局部坐标里：贴着下面的管壁（x = WALL_X），钉尖离管底 s
const HALF = T_LEN / 2, TILT = 0.95, TILT2 = 0.3, WALL_X = -0.0056, S_APP = 0.12, S_IN = 0.066, S_END = 0.004, NAIL_IN = [0.0015, 0.003, 0.08];
// 每一段多长（秒）：铁钉先提到管口上方、移到一边 | 试管竖直拿起来 | 移到前面 | 放低一点 | 倾斜 | 铁钉放进管口 | 试管慢慢竖起来，铁钉沿管壁滑到底 | 竖直 | 抬起来 | 移回试管架上方 | 放回去
const PHASES = [['prep', 0.6], ['lift', 0.5], ['fwd', 0.4], ['down', 0.25], ['tilt', 0.55], ['insert', 0.45], ['slide', 1.7], ['up', 0.45], ['rise', 0.25], ['back', 0.4], ['set', 0.5]];
const T_END = PHASES.reduce((a, [, d]) => a + d, 0);
const RUST = new THREE.Color(0x9a4a1c), IRON = new THREE.Color(0x8a909a), CLEAR = new THREE.Color(0xe4eef2), YELLOW = new THREE.Color(0xd9a21a);

export default {
  id: 'acidprop',
  fig: '图10-10',
  title: '酸的化学性质',
  stampText: '探究',
  style: 'paper',
  predict: {
    q: '向稀盐酸、稀硫酸里分别滴紫色石蕊溶液和无色酚酞溶液，会变成什么颜色？',
    hint: '课本第 69 页探究；课题 1 学过：酸能使石蕊溶液变红。',
    options: ['石蕊变红，酚酞不变色', '石蕊变蓝，酚酞变红', '都不变色', '石蕊不变色，酚酞变红'],
    answer: 0,
  },
  need: '在点滴板上向稀盐酸、稀硫酸中滴加石蕊溶液和酚酞溶液；把生锈的铁钉放进稀盐酸、稀硫酸，过一会儿取出洗净，看铁钉表面和溶液颜色',
  conclusion: {
    crops: [{ page: 73, rect: [340, 250, 483, 386] }],
    quote: '稀盐酸、稀硫酸能使紫色石蕊溶液变红，不能使无色酚酞溶液变色；能与活泼金属反应生成氢气；能与铁锈（主要成分 Fe₂O₃）等金属氧化物反应。',
    formula: 'Fe₂O₃ + 6HCl ══ 2FeCl₃ + 3H₂O　　Fe₂O₃ + 3H₂SO₄ ══ Fe₂(SO₄)₃ + 3H₂O',
    why: '稀盐酸和稀硫酸有<b>相似的化学性质</b>：都能使紫色石蕊溶液变红、使无色酚酞溶液不变色；都能和镁、锌、铁等活泼金属反应放出<b>氢气</b>；都能和铁锈反应——铁锈溶解，溶液变成<b>黄色</b>，铁钉变得光亮（所以可以用稀盐酸、稀硫酸除铁锈，但不能泡太久，铁也会和酸反应）。<br>它们相似，是因为在水里都能解离出<b>氢离子</b>（H⁺）。',
    src: '课本下册第 69–70 页 · 第十单元 课题2 常见的酸和碱（探究：酸的化学性质）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); else bar.caption(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };

    paperSheet(group, { w: 0.32, d: 0.18, x: 0.0, z: 0.02 });

    // ================= 点滴板 =================
    const plate = inked(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.008, 0.05), paint(0xf8f8f6)), { width: 0.7 }); plate.position.copy(PLATE).add(new THREE.Vector3(-0.011, 0.004, 0)); group.add(plate);
    const wells = WELLS.map(([dx, dz, a]) => {
      const x = PLATE.x + dx, z = PLATE.z + dz;
      // 孔：板面上一圈浅灰的边 + 里面的液面（颜色会变）
      const rim = new THREE.Mesh(new THREE.RingGeometry(0.0062, 0.0078, 28), paint(0xc9ccd2, { keep: true })); rim.rotation.x = -Math.PI / 2; rim.position.set(x, 0.00805, z); group.add(rim);
      const liq = new THREE.Mesh(new THREE.CircleGeometry(0.0062, 28), paint(0xe8eef2, { keep: true, unique: true })); liq.rotation.x = -Math.PI / 2; liq.position.set(x, 0.0081, z); group.add(liq);
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.01, 10), new THREE.MeshBasicMaterial({ visible: false })); pick.position.set(x, 0.008, z); pick.userData.pick = true; group.add(pick);
      return { x, z, acid: a, liq, pick };
    });
    const pl1 = textPlate('稀盐酸', { w: 0.018, h: 0.007, color: '#23293a', bg: 'rgba(0,0,0,0)', font: 'bold 84px "Songti SC", serif' }); pl1.rotation.x = -Math.PI / 2; pl1.position.set(PLATE.x + 0.026, 0.0082, PLATE.z - 0.012); group.add(pl1);
    const pl2 = textPlate('稀硫酸', { w: 0.018, h: 0.007, color: '#23293a', bg: 'rgba(0,0,0,0)', font: 'bold 84px "Songti SC", serif' }); pl2.rotation.x = -Math.PI / 2; pl2.position.set(PLATE.x + 0.026, 0.0082, PLATE.z + 0.012); group.add(pl2);
    // ================= 两个滴瓶（石蕊、酚酞） =================
    // 滴瓶（kit 的 dropBottle）+ 竖着插在瓶里的滴管；标签贴在滴瓶上（字多时字号缩小，免得被裁掉）。滴管的原点在滴管尖。
    // ——dropper / follow / putBack 和 indicator、baseprop、basereact 里的一样，建议进 kit
    const bottleLabel = (B, text) => { const lab = textPlate(text, { w: 0.024, h: 0.008, bg: 'rgba(253,251,245,0.95)', font: `bold ${Math.min(120, Math.floor(470 / text.length))}px "Songti SC", serif` }); lab.position.set(0, 0.022, 0.0135); B.add(lab); B.label = lab; };
    const dropper = (B, inside) => {
      const g = new THREE.Group(); group.add(g);
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.0024, 0.0011, 0.046, 14), glassMat({ opacity: 0.3 })); glass.geometry.translate(0, 0.023, 0); glass.renderOrder = 9; glassEdge(glass, 0.0005);
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.0014, 0.0008, 0.018, 10), paint(inside, { keep: true })); liq.position.y = 0.0095;
      const collar = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0068, 0.0068, 0.005, 18), paint(0xc23a3a, { keep: true })), { width: 0.6 }); collar.position.y = 0.0435;
      const bulb = inked(new THREE.Mesh(new THREE.SphereGeometry(0.0055, 16, 12), paint(0xc23a3a, { keep: true })), { width: 0.6 }); bulb.scale.set(1, 1.55, 1); bulb.position.y = 0.0545;
      const pick = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.075, 0.018), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 0.035; pick.userData.pick = true;
      g.add(glass, liq, collar, bulb, pick); g.position.copy(B.tipHome);
      return Object.assign(g, { pick, B });
    };
    // 拿着滴管走（to：滴管尖要去的地方）：还在滴瓶这儿时先竖直往上提，提出瓶口再移过去
    const follow = (d, to, a) => {
      const B = d.B, p = d.position, off = Math.hypot(p.x - B.position.x, p.z - B.position.z), up = Math.max(B.mouthY + 0.008, to.y);
      p.lerp(off < 0.02 && p.y < up - 0.002 ? new THREE.Vector3(off < 0.003 ? B.position.x : p.x, up, off < 0.003 ? B.position.z : p.z) : to, a);
    };
    // 插回原滴瓶：先竖直提到 rise 那么高（不碰别的器材），再挪到瓶口正上方，竖直插回去
    const putBack = (d, a, rise) => {
      const p = d.position, off = Math.hypot(p.x - d.B.position.x, p.z - d.B.position.z);
      if (off > 0.004 && p.y < rise - 0.002) p.lerp(new THREE.Vector3(p.x, rise, p.z), a);
      else homeLift(d, d.B.tipHome, a);
    };
    const droppers = IND.map((I) => { const B = dropBottle(group, I.bottle, { liq: I.liq ?? I.color }); bottleLabel(B, I.name); return dropper(B, I.color); });
    const dropsP = IND.map((I) => { const p = new Particles({ max: 40, geometry: new THREE.SphereGeometry(1, 6, 5), material: water2({ color: I.drop, base: 0.6 }) }); group.add(p.mesh); return p; });

    // ================= 铁锈：两支试管、两枚生锈的铁钉 =================
    // 试管里的酸：圆底（和试管底一样）；液面用世界坐标里一个水平的裁切面切出来——试管倾斜时液面还是平的
    const liqGeo = (() => { const R = T_R - 0.0008, yc = T_R + 0.0008, pts = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i / 10) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.max(0.0002, Math.cos(a) * R), yc + Math.sin(a) * R)); } pts.push(new THREE.Vector2(R, 0.075), new THREE.Vector2(0.0002, 0.075)); return new THREE.LatheGeometry(pts, 24); })();
    const tubes = TX.map((x, k) => {
      const t = testTube({ r: T_R, len: T_LEN }); t.position.set(x, T_Y, 0); group.add(t);         // 原点在管底；放铁钉时整支试管拿起来、倾斜
      const cut = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
      const mat = water2({ color: 0xe4eef2, base: 0.55 }); mat.clippingPlanes = [cut];
      const liq = new THREE.Mesh(liqGeo, mat); liq.renderOrder = 7; liq.raycast = () => {}; t.add(liq);
      const lab = textPlate(ACID[k ? 'H2SO4' : 'HCl'], { w: 0.02, h: 0.0075, color: '#23293a', bg: '#fffaf0', font: 'bold 84px "Songti SC", serif' }); lab.position.set(x, 0.004, 0.0185); group.add(lab);
      return Object.assign(t, { liq, cut });
    });
    const rack = inked(new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.008, 0.03), paint(0xd9c9a6)), { width: 0.6 }); rack.position.set(0.09, 0.004, 0); group.add(rack);
    for (const sx of [-1, 1]) { const p = inked(new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.06, 0.026), paint(0xd9c9a6)), { width: 0.5 }); p.position.set(0.09 + sx * 0.036, 0.034, 0); group.add(p); }
    const rackTop = inked(new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.004, 0.02), paint(0xd9c9a6)), { width: 0.5 }); rackTop.position.set(0.09, 0.064, -0.006); group.add(rackTop);
    const dish = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.028, 0.004, 28), paint(0xf2eee4)), { width: 0.5 }); dish.position.set(0.075, 0.002, 0.065); group.add(dish);
    const nails = [0, 1].map((k) => {
      const g = new THREE.Group(); group.add(g);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.04, 8), paint(0x9a4a1c, { keep: true, unique: true })); body.position.y = 0.02; g.add(body);
      const head = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.0012, 12), body.material), { width: 0.4 }); head.position.y = 0.04; g.add(head);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0012, 0.004, 8), body.material); tip.rotation.x = Math.PI; tip.position.y = -0.0018; g.add(tip);
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 8), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 0.02; pick.userData.pick = true; g.add(pick);
      g.position.copy(NAIL_HOME[k]); g.rotation.z = Math.PI / 2;
      return Object.assign(g, { mat: body.material, pick });
    });
    const bubs = new Particles({ max: 80, geometry: new THREE.SphereGeometry(1, 8, 6), material: bubble2({ color: 0x6f8797, white: 0.2 }) }); bubs.mesh.renderOrder = 9.8; group.add(bubs.mesh);
    const cards = TX.map(() => { const c = tag('', 'cond'); c.px = [0, -70]; return c; });
    const plateCard = tag('', 'cond'); plateCard.px = [0, 44];          // 点滴板前面（后面是两个滴瓶，卡片不挡住它们）

    // ================= 状态 =================
    const fresh = () => ({ demo: false, well: WELLS.map(() => null), dCarry: [null, null], n: NAIL_HOME.map(() => ({ at: 'dish', tube: -1, carry: null, rust: 1, inT: 0, yel: 0, gas: 0, logged: false, washed: false })), logged: {} });
    S = fresh();

    // ================= 操作 =================
    // 微观次元：钻进刚放进酸里的那枚铁钉表面——铁锈里的氧和 H⁺ 结合成水，Fe³⁺ 进入溶液；锈没了，铁接着和酸反应放出氢气
    const focusNail = () => { let b = -1; S.n.forEach((N, i) => { if (N.at === 'tube' && (b < 0 || N.inT < S.n[b].inT)) b = i; }); return b; };
    const mic = micro({ tag, look, back, group, scene: metalScene(),
      at: () => { const i = Math.max(0, focusNail()); return new THREE.Vector3(TX[Math.max(0, S.n[i].tube)], T_Y + 0.01, 0); },
      label: '钻进铁钉表面看',
      state: () => { const i = Math.max(0, focusNail()), N = S.n[i]; return { metal: 'Fe', sol: N.tube === 1 ? 'H2SO4' : 'HCl', rust: N.rust, yel: N.yel, rate: N.rust < 0.05 ? 0.1 : 0 }; },
      key: () => { const i = focusNail(); return i < 0 ? '' : i + '|' + S.n[i].tube; },
      show: () => focusNail() >= 0, bar: () => bar, scale: 0.0058,
      btnAt: () => { const i = Math.max(0, focusNail()); return new THREE.Vector3(TX[Math.max(0, S.n[i].tube)], T_Y + T_LEN + 0.03, 0); } });
    // ================= 把铁钉放进试管：试管倾斜，铁钉放在管口，沿管壁慢慢滑下去，再把试管竖直放回 =================
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z), ZAX = V3(0, 0, 1), ONE = V3(1, 1, 1);
    const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
    const phaseAt = (t) => { let a = 0; for (const [nm, d] of PHASES) { if (t < a + d) return [nm, ease((t - a) / d)]; a += d; } return ['end', 1]; };
    const K0 = (k) => V3(TX[k], T_Y + HALF, 0), K1 = (k) => V3(TX[k], 0.075 + HALF, 0), F1 = (k) => V3(TX[k], 0.075 + HALF, 0.05), K2 = (k) => V3(TX[k], 0.11, 0.05);
    // 这一刻试管在哪、斜多少（试管中点 C、倾斜角 th）
    const tubePose = (k, t) => {
      const [nm, u] = phaseAt(t), L = (a, b) => a.lerp(b, u);
      switch (nm) {
        case 'prep': return [K0(k), 0];
        case 'lift': return [L(K0(k), K1(k)), 0];
        case 'fwd': return [L(K1(k), F1(k)), 0];
        case 'down': return [L(F1(k), K2(k)), 0];
        case 'tilt': return [K2(k), TILT * u];
        case 'insert': return [K2(k), TILT];
        case 'slide': return [K2(k), TILT + (TILT2 - TILT) * u];
        case 'up': return [K2(k), TILT2 * (1 - u)];
        case 'rise': return [L(K2(k), F1(k)), 0];
        case 'back': return [L(F1(k), K1(k)), 0];
        case 'set': return [L(K1(k), K0(k)), 0];
        default: return [K0(k), 0];
      }
    };
    const setTube = (tb, [C, th]) => { tb.rotation.set(0, 0, th); tb.position.set(C.x + HALF * Math.sin(th), C.y - HALF * Math.cos(th), C.z); };
    // 试管局部坐标里的一个姿势（x, s, 绕 z 转 rz）→ group 坐标里的矩阵
    const inTubeM = ([C, th], x, s, rz) => new THREE.Matrix4().compose(V3(C.x + HALF * Math.sin(th), C.y - HALF * Math.cos(th), C.z), new THREE.Quaternion().setFromAxisAngle(ZAX, th), ONE)
      .multiply(new THREE.Matrix4().compose(V3(x, s, 0), new THREE.Quaternion().setFromAxisAngle(ZAX, rz), ONE));
    const _s = V3(0, 0, 0);
    const placeNail = (an) => {
      const g = nails[an.i], k = an.tube, t = an.t, [nm, u] = phaseAt(t);
      if (nm === 'prep') {
        // 先竖直提到管口上方，再移到一边、转到和倾斜后的试管一样的方向，等着
        const up = an.p0.clone().setY(Math.max(an.p0.y, T_Y + T_LEN + 0.012)), A = new THREE.Vector3(), qa = new THREE.Quaternion();
        inTubeM([K2(k), TILT], WALL_X, S_APP, 0).decompose(A, qa, _s);
        const a = ease(t / 0.25), b = ease((t - 0.25) / 0.35);
        g.position.copy(an.p0).lerp(up, a).lerp(A, b); g.quaternion.copy(an.q0).slerp(qa, b);
        return;
      }
      let x = WALL_X, sv = S_APP, rz = 0, pose = tubePose(k, t);
      if (['lift', 'fwd', 'down', 'tilt'].includes(nm)) pose = [K2(k), TILT];          // 等着：还在管口外
      else if (nm === 'insert') sv = S_APP + (S_IN - S_APP) * u;                          // 放进管口，贴着下面的管壁
      else if (nm === 'slide') sv = S_IN + (S_END - S_IN) * u;                            // 试管慢慢竖起来，铁钉沿管壁慢慢滑到底
      else if (nm === 'up') { x = WALL_X + (NAIL_IN[0] - WALL_X) * u; sv = S_END + (NAIL_IN[1] - S_END) * u; rz = NAIL_IN[2] * u; }
      else { x = NAIL_IN[0]; sv = NAIL_IN[1]; rz = NAIL_IN[2]; }
      inTubeM(pose, x, sv, rz).decompose(g.position, g.quaternion, _s);
    };
    // 铁钉还在试管里（管口以下）时只能竖直往上提，提出管口再移开（不穿过管壁）
    const inTubeAt = (p) => TX.findIndex((x) => Math.hypot(p.x - x, p.z) < T_R + 0.003 && p.y < T_Y + T_LEN + 0.004);
    const A = {
      dropDrag(i, p) { if (!p) return; S.dCarry[i] = p.clone(); },
      dropDrop(i) {
        const p = S.dCarry[i]; S.dCarry[i] = null; if (!p) return;
        const w = wells.indexOf(wellAt(p));
        if (w < 0) return;
        if (S.well[w]) return status('这个孔里已经滴过指示剂了。换一个孔。');
        S.well[w] = IND[i].key; sfx.clink({ freq: 2600, gain: 0.02 });
        for (let j = 0; j < 4; j++) dropsP[i].spawn({ p: new THREE.Vector3(wells[w].x, DRIP_Y - 0.0015, wells[w].z), v: new THREE.Vector3(0, -0.03 - j * 0.012, 0), size: 0.0012, life: 1 });      // 从滴管尖滴下去
        const A2 = ACID[wells[w].acid];
        status(i === 0 ? `往${A2}里滴了紫色石蕊溶液：变成了<b>红色</b>。` : `往${A2}里滴了无色酚酞溶液：<b>不变色</b>（还是无色）。`);
        const key = `${wells[w].acid}|${IND[i].key}`;
        if (!S.logged[key]) { S.logged[key] = true; log([`${A2} + ${IND[i].name}`, i === 0 ? '变<b>红</b>' : '<b>不变色</b>', '']); }
        if (['HCl|lit', 'HCl|ph', 'H2SO4|lit', 'H2SO4|ph'].every((k) => S.logged[k])) { done('ind'); status('四个孔都滴好了：稀盐酸、稀硫酸都能使<b>石蕊变红</b>，都<b>不能使酚酞变色</b>。接着把生锈的铁钉放进右边的两支试管。'); }
      },
      nailDrag(i, p) { if (!p || S.anim) return; const N = S.n[i]; N.at = 'hand'; N.carry = p.clone(); },
      nailDrop(i) {
        const N = S.n[i], p = N.carry; N.carry = null; if (!p) return;
        const tip = p.y - 0.045, k = TX.findIndex((x) => Math.abs(p.x - x) < 0.02 && tip > T_Y - 0.01 && tip < T_Y + T_LEN + 0.07);      // 拿到了试管口上方（伸进了竖着的试管也一样：先提出来，再按下面的做法放）
        if (k >= 0 && !S.n.some((o, j) => j !== i && (o.at === 'tube' || o.at === 'in') && o.tube === k) && !(N.lastTube === k && N.inT > 0)) {
          N.at = 'in'; N.tube = k;
          S.anim = { k: 'nail', i, tube: k, t: 0, p0: nails[i].position.clone(), q0: nails[i].quaternion.clone() };
        } else {
          if (N.inT > 0 && !N.washed) {
            N.washed = true; const kk = N.lastTube, A2 = ACID[kk ? 'H2SO4' : 'HCl'];
            log([`生锈的铁钉 + ${A2}，过一会儿取出洗净`, N.rust < 0.2 ? `铁锈溶解，铁钉表面变得<b>光亮</b>；溶液变成<b>黄色</b>${N.gas > 0.05 ? '；铁钉上还冒出了细小的气泡' : ''}` : '铁锈还没溶完（放的时间太短）', kk ? 'Fe₂O₃ + 3H₂SO₄ ══ Fe₂(SO₄)₃ + 3H₂O' : 'Fe₂O₃ + 6HCl ══ 2FeCl₃ + 3H₂O']);
            status(`取出铁钉，用水洗净：${N.rust < 0.2 ? '表面<b>光亮</b>了。' : '还有一些锈。'}`);
            if (S.n.every((o) => o.washed)) { done('out'); W?.t1.open(); }
          }
          N.at = 'dish';
        }
      },
      reset() { S = fresh(); mic.close(); for (const p of dropsP) p.clear(); bubs.clear(); W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.t3.close(); W.next.hidden = true; } bar.undo('ind', 'nail', 'out', 'why'); status('全部重新摆好了，记录也清空了。'); },
    };

    const drag = draggable(group, [
      ...IND.map((I, i) => ({ obj: droppers[i].pick, plane: 'xz', offset: CARRY_Y, hint: `${I.name}：拖到点滴板的一个孔上方，滴几滴`, onStart: (p) => A.dropDrag(i, p), onDrag: (p) => A.dropDrag(i, p), onEnd: () => A.dropDrop(i) })),
      ...[0, 1].map((i) => ({ obj: nails[i].pick, plane: 'xy', offset: 0, hint: () => (S.n[i].at === 'in' ? '' : S.n[i].at === 'tube' ? '过一会儿：取出铁钉（拖回盘里），用水洗净' : '生锈的铁钉：拖到一支试管口上方，松手'), onStart: (p) => A.nailDrag(i, p), onDrag: (p) => A.nailDrag(i, p), onEnd: () => A.nailDrop(i) })),
    ], { tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const overWell = (w) => () => new THREE.Vector3(wells[w].x, CARRY_Y, wells[w].z);
    const wellAt = (p) => wells.find((w) => Math.hypot(p.x - w.x, p.z - w.z) < 0.009);
    // 演示：从滴瓶里竖直提出滴管，移到孔上方，降到孔上方悬空，松手滴下去（滴管插回滴瓶）
    const dripTo = (i, w, t0, t1, release) => act.path(droppers[i].pick, [null, () => droppers[i].B.position.clone().setY(CARRY_Y), overWell(w)], { t0, t1, release });
    // 铁钉：手拿的地方在钉尖上方 4.5 cm。into：拿到试管口上方（钉尖离管口约 1.3 cm）；outTo：从试管里竖直提出来以后，拿到盘的上方
    const into = (k) => () => new THREE.Vector3(TX[k], T_Y + T_LEN + 0.058, 0);
    const outTo = (i) => () => new THREE.Vector3(NAIL_HOME[i].x, T_Y + T_LEN + 0.07, NAIL_HOME[i].z);

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'ind', title: '滴指示剂', todo: '把<b>石蕊溶液</b>、<b>酚酞溶液</b>分别滴进点滴板上的稀盐酸、稀硫酸里（四个孔各滴一种）。', target: () => (S.dCarry[0] || S.dCarry[1] ? null : droppers[['HCl|lit', 'H2SO4|lit'].every((k) => S.logged[k]) ? 1 : 0]) },
        { id: 'nail', title: '放入生锈的铁钉', todo: '把<b>生锈的铁钉</b>拖到试管口上方，松手：试管倾斜，铁钉放在管口，沿管壁慢慢滑到底，再把试管竖直放回。稀盐酸、稀硫酸各放一枚，看铁钉表面和溶液的颜色。', target: () => (S.anim ? null : nails[S.n.findIndex((o) => o.at === 'dish' && o.inT === 0)] || null) },
        { id: 'out', title: '取出洗净', todo: '过一会儿，把铁钉<b>取出来</b>（拖回盘里），用水洗净。看铁钉表面。', target: () => { const i = S.n.findIndex((o) => o.at === 'tube'); return i >= 0 ? nails[i] : null; } },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { for (const p of dropsP) p.clear(); bubs.clear(); mic.close(); } }),
          shots: [
            { cap: '在白色点滴板上，向稀盐酸、稀硫酸里分别滴加紫色石蕊溶液：都变红。', dur: 6, cam: [[PLATE.x - 0.012, 0.04, -0.012], [0.04, 0.6, 1], 0.28],
              during: act.seq(dripTo(0, 0, 0.05, 0.3, 0.4), dripTo(0, 2, 0.52, 0.77, 0.87)) },
            { cap: '再分别滴加无色酚酞溶液：都不变色。', dur: 6, cam: [[PLATE.x - 0.012, 0.04, -0.012], [0.04, 0.6, 1], 0.28],
              during: act.seq(dripTo(1, 1, 0.05, 0.3, 0.4), dripTo(1, 3, 0.52, 0.77, 0.87)) },
            // 铁钉从盘里拿起来，竖直提高，移到试管口上方松手；试管倾斜、铁钉沿管壁滑到底、试管竖直放回（一枚做完再做下一枚）
            { cap: '把试管倾斜，生锈的铁钉放在管口，让它沿管壁慢慢滑到底，再把试管竖直放回。稀盐酸、稀硫酸各放一枚。', dur: 14, speed: 1.25, cam: [[0.07, 0.085, 0.03], [0.04, 0.25, 1], 0.36],
              during: act.seq(act.path(nails[0].pick, [null, new THREE.Vector3(NAIL_HOME[0].x - 0.02, into(0)().y, NAIL_HOME[0].z), into(0)], { t0: 0.02, t1: 0.1, release: 0.11 }), act.path(nails[1].pick, [null, new THREE.Vector3(NAIL_HOME[1].x - 0.02, into(1)().y, NAIL_HOME[1].z), into(1)], { t0: 0.5, t1: 0.58, release: 0.59 })) },
            { cap: '钻进铁钉表面看：铁锈（Fe₂O₃）里的氧和 H⁺ 结合成水，Fe³⁺ 进入溶液——溶液变黄。稀盐酸、稀硫酸里都有 H⁺。', dur: 12, cam: [[TX[1], T_Y + 0.06, 0], [0.04, 0.22, 1], 0.28], during: act.at(0.02, () => mic.open(true)) },
            { cap: '铁锈溶解，溶液变成黄色。', enter: () => mic.close(), dur: 6, speed: 2, cam: [[0.09, 0.06, 0], [0.04, 0.25, 1], 0.26] },
            { cap: '取出铁钉，用水洗净：表面变得光亮。稀盐酸、稀硫酸的化学性质相似。演示完了，下面换你自己做。', dur: 7,
              during: act.seq(act.path(nails[0].pick, [null, new THREE.Vector3(TX[0], outTo(0)().y, 0), outTo(0)], { t0: 0.05, t1: 0.3, release: 0.32 }), act.path(nails[1].pick, [null, new THREE.Vector3(TX[1], outTo(1)().y, 0), outTo(1)], { t0: 0.4, t1: 0.65, release: 0.67 })) },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ================= 每帧 =================
    const step = (h) => {
      // 滴管一直竖着：拿着时跟着手走（高过滴瓶口）；到了孔上方，降下去悬空（不碰点滴板）；松手滴下去，插回原滴瓶
      droppers.forEach((d, i) => {
        const p = S.dCarry[i];
        if (p) { const w = wellAt(p); follow(d, w ? new THREE.Vector3(w.x, DRIP_Y, w.z) : new THREE.Vector3(p.x, CARRY_Y, p.z), 0.4); }
        else putBack(d, 0.25, CARRY_Y);
      });
      for (const P of dropsP) P.update(h, (q, dd) => { q.p.addScaledVector(q.v, dd); return q.p.y > 0.0083; });
      // 放铁钉：试管拿起来、倾斜，铁钉放在管口，沿管壁慢慢滑到底，试管竖直放回
      const an = S.anim;
      if (an?.k === 'nail') {
        an.t += h;
        const N = S.n[an.i], [nm] = phaseAt(an.t);
        if (nm === 'up' && !an.clink) { an.clink = true; sfx.clink({ freq: 1600, gain: 0.025 }); }      // 滑到底了
        if (an.t >= T_END) {
          S.anim = null; N.at = 'tube'; N.tube = an.tube;
          status(`生锈的铁钉放进了<b>${ACID[an.tube ? 'H2SO4' : 'HCl']}</b>。看铁钉表面和溶液的颜色。`);
          if (S.n.every((o) => o.at === 'tube' || o.inT > 0)) done('nail');
        }
      }
      tubes.forEach((t, k) => {
        const a = S.anim?.k === 'nail' && S.anim.tube === k ? S.anim : null;
        setTube(t, a ? tubePose(k, a.t) : [K0(k), 0]);
        t.updateMatrixWorld(true); t.cut.constant = t.localToWorld(_s.set(0, LIQ_H, 0)).y;      // 液面：世界坐标里平的
      });
      if (S.anim?.k === 'nail') placeNail(S.anim);
      wells.forEach((w, k) => { const c = S.well[k]; w.liq.material.color.lerp(new THREE.Color(c === 'lit' ? 0xd9455f : 0xe8eef2), Math.min(1, h * 3)); });
      // 铁钉
      S.n.forEach((N, i) => {
        const g = nails[i];
        if (N.at === 'in') { /* 正在放进试管：位置由上面的 placeNail 摆 */ }
        else if (N.at === 'tube') {
          N.lastTube = N.tube; N.inT += h * 2.5;
          const dr = Math.min(N.rust, 0.06 * h * 2.5); N.rust -= dr; N.yel = Math.min(1, N.yel + dr * 1.1);
          if (N.rust < 0.05) N.gas = Math.min(1, N.gas + h * 0.25);           // 锈溶完了：铁和酸反应，冒氢气
          if (N.gas > 0 && Math.random() < h * 14 * N.gas) bubs.spawn({ p: new THREE.Vector3(TX[N.tube] + (Math.random() - 0.5) * 0.002, T_Y + 0.004 + Math.random() * 0.03, (Math.random() - 0.5) * 0.002), v: new THREE.Vector3(0, 0.02, 0), size: 0.0006 + Math.random() * 0.0005, life: 2, k: N.tube });
          if (N.rust < 0.15 && !N.saidDone && !S.demo) { N.saidDone = true; status(`${ACID[N.tube ? 'H2SO4' : 'HCl']}里：铁锈溶解了，溶液变成<b>黄色</b>。${S.n.every((o) => o.rust < 0.15) ? '把铁钉取出来，用水洗净。' : ''}`); }
          if (N.gas > 0.3 && !S.logged['gas' + i] && !S.demo) { S.logged['gas' + i] = true; status('铁锈溶完以后，铁钉上冒出了细小的气泡——铁也和酸反应了（放出氢气）。用酸除锈时不能泡太久。'); }
          g.position.lerp(new THREE.Vector3(TX[N.tube] + 0.0015, T_Y + 0.003, 0), 0.3); g.rotation.z += (0.08 - g.rotation.z) * 0.3;
        } else if (N.carry) {
          const q = N.carry.clone().add(new THREE.Vector3(0, -0.045, 0)); q.y = Math.max(0.004, q.y);
          if (inTubeAt(g.position) >= 0) q.set(g.position.x, Math.max(q.y, T_Y + 0.003), g.position.z);      // 在试管里只能竖直上下（不穿过管壁）
          g.position.lerp(q, 0.45);
          g.rotation.z += (0 - g.rotation.z) * 0.25;
        } else {
          if (inTubeAt(g.position) >= 0) g.position.lerp(new THREE.Vector3(g.position.x, T_Y + T_LEN + 0.03, g.position.z), 0.2);      // 还在试管里：先竖直提出管口
          else homeLift(g, NAIL_HOME[i], 0.2);                                                                                     // 再挪到盘的上方，放下去
          g.rotation.z += (Math.PI / 2 - g.rotation.z) * 0.2;
        }
        g.mat.color.copy(IRON).lerp(RUST, N.rust);
        if (N.washed) g.mat.color.lerp(new THREE.Color(0xc9ced6), 0.6);
      });
      tubes.forEach((t, k) => { const N = S.n.find((o) => o.lastTube === k); t.liq.material.color.copy(CLEAR).lerp(YELLOW, N ? N.yel * 0.9 : 0); });
      bubs.update(h, (p, d) => { p.v.y += 0.12 * d; p.p.addScaledVector(p.v, d); return p.p.y < T_Y + 0.036; });
      // 卡片
      tubes.forEach((t, k) => {
        const N = S.n.find((o) => o.lastTube === k);
        cards[k].text(`<div class="cc"><div class="cc-t"><span class="cc-name">${ACID[k ? 'H2SO4' : 'HCl']}</span>${N && N.yel > 0.5 ? '<span class="cc-res">变黄</span>' : ''}</div><div class="cc-more"><div class="cc-obs"><small>${N ? (N.rust > 0.15 ? `铁锈在溶解（还剩 ${Math.round(N.rust * 100)}%）` : N.gas > 0.05 ? '锈溶完了；铁钉冒出小气泡（氢气）' : '铁锈溶完了') : '还没放铁钉'}</small></div></div></div>`)
          .loc(group, TX[k], T_Y + T_LEN, 0).show(!!N);
      });
      plateCard.text('<div class="cc"><div class="cc-t"><span class="cc-name">点滴板</span></div><div class="cc-more"><div class="cc-obs"><small>上排：稀盐酸　下排：稀硫酸</small></div></div></div>').loc(group, PLATE.x - 0.011, 0.008, 0.025).show(true);
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.26, d: 0.14, h: 0.12 },
      view: { elev: 26, azim: -4, lookY: 0.36, frameMargin: 1.08 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = () => [...W.tbl.el.querySelectorAll('tbody tr')].map((tr) => `<div>${tr.children[0].innerHTML}：${tr.children[1].innerHTML}</div>`).join('');
        const t3 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '稀盐酸和稀硫酸的化学性质为什么相似？',
          options: ['它们在水中都能解离出氢离子（H⁺）', '它们都含有氯元素', '它们的颜色一样'],
          wrong: ['硫酸里没有氯。', '颜色和化学性质没有关系。'],
          ok: '对：酸在水溶液中都能解离出 <b>H⁺</b>，所以有相似的化学性质。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); } });
        const t2 = think({ title: '想一想', ctx: () => '<div>（在“金属与稀盐酸或稀硫酸的反应”一课里做过）</div><div>Mg + 2HCl ══ MgCl₂ + H₂↑　Zn + H₂SO₄ ══ ZnSO₄ + H₂↑　Fe + 2HCl ══ FeCl₂ + H₂↑</div>', status: (m) => ui.status(m),
          q: '镁、锌、铁和稀盐酸、稀硫酸反应，生成物有什么共同之处？',
          options: ['都生成氢气（和一种盐）', '都生成氧气', '都生成水'],
          wrong: ['燃着的木条凑上去“噗”一声，是氢气。', '看方程式：右边有 H₂。'],
          ok: '对：活泼金属和稀盐酸、稀硫酸反应都生成<b>氢气</b>。',
          onOk: () => t3.open() });
        const t1 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '用稀盐酸除铁锈时，为什么不能把铁制品长时间泡在酸里？',
          options: ['铁锈溶完以后，铁也会和酸反应（冒出氢气），把铁制品腐蚀掉', '泡久了铁锈会更多', '没有关系，可以一直泡'],
          wrong: ['铁锈只会越来越少。', '看你的记录：锈溶完以后，铁钉上冒出了什么？'],
          ok: '对：酸能和铁锈反应，也能和铁反应。',
          onOk: () => t2.open() });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['做了什么', '现象', '化学方程式']);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：铁锈按约 0.05 g 计；溶解、变色的快慢是示意（加快了）。铁锈溶完后铁和酸反应，生成的亚铁盐是浅绿色，这里颜色以三价铁的黄色为主。' });
        ui.controls.append(t1.el, t2.el, t3.el, next, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, t1, t2, t3, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('图 10-10：白色点滴板上，上排两个孔是稀盐酸，下排两个孔是稀硫酸；点滴板后面是石蕊溶液、酚酞溶液两个滴瓶。右边两支试管（稀盐酸、稀硫酸），盘里两枚生锈的铁钉。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); mic.update(dt, k); },
      dispose() { mic.dispose(); bar.dispose(); for (const p of dropsP) p.dispose(); bubs.dispose(); liqGeo.dispose(); },
      debug: { get S() { return S; }, A, bar, picks: { lit: droppers[0].pick, ph: droppers[1].pick, n0: nails[0].pick, n1: nails[1].pick },
        qa: qaFlow(drag, [
          { name: '石蕊滴盐酸', drag: droppers[0].pick, to: overWell(0), wait: 0.5 },
          { name: '石蕊滴硫酸', drag: droppers[0].pick, to: overWell(2), wait: 0.5 },
          { name: '酚酞滴盐酸', drag: droppers[1].pick, to: overWell(1), wait: 0.5 },
          { name: '酚酞滴硫酸', drag: droppers[1].pick, to: overWell(3), wait: 0.5 },
          { name: '铁钉放进盐酸', drag: nails[0].pick, to: into(0), wait: T_END + 0.5 },
          { name: '铁钉放进硫酸', drag: nails[1].pick, to: into(1), wait: T_END + 8 },
          { name: '取出 1', drag: nails[0].pick, to: outTo(0), wait: 0.5 },
          { name: '取出 2', drag: nails[1].pick, to: outTo(1), wait: 0.5 },
          { name: '答第一题', run: () => W.t1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.t2.el.querySelector('button').click() },
          { name: '答第三题', run: () => W.t3.el.querySelector('button').click() },
        ]) },
    };
  },
};
