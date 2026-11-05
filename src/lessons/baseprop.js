// 课题2 常见的酸和碱 · 探究：碱的化学性质（课本下册第 72–73 页）。
//
// （1）白色点滴板：上排两个孔是氢氧化钠溶液，下排两个孔是石灰水（氢氧化钙溶液）；分别滴紫色石蕊溶液、无色酚酞溶液，看颜色。
// （2）氢氧化钙能和二氧化碳反应（石灰水变浑浊），氢氧化钠呢？看不到现象，就设计对照实验：
//     两个集满二氧化碳的软塑料瓶，瓶 A 倒进约 1/3 容积的水，瓶 B 倒进同样多的氢氧化钠溶液，旋紧瓶盖、振荡——瓶 B 瘪得多得多。
// 看不见的东西：二氧化碳 = 深灰点（瓶里的气体、溶进水里的）；钻进瓶 B 里看：CO₂ + 2OH⁻ → CO₃²⁻ + H₂O（课本图 10-14 的 Na⁺、OH⁻）。
// 模型（近似，界面上写明）：塑料瓶 330 mL；倒进液体以后瓶里剩下的二氧化碳 = 330 mL − 液体体积。
//   水：20 ℃ 时 1 体积水约溶解 0.88 体积二氧化碳。
//   氢氧化钠溶液按约 0.5 mol/L（约 2%）计：每毫升最多吸收约 6.1 mL 二氧化碳（生成碳酸钠）——110 mL 能吸收约 670 mL，
//   比瓶里的二氧化碳多得多，所以几乎全被吸收（氢氧化钠还有剩）。振荡时吸收得快（几秒），静置时慢。瓶盖没旋紧：空气补进来，瓶子不瘪。
// 顺序（同上册第 136 页实验 6-4“加入约 1/3 容积的水，立即旋紧瓶盖，振荡”）：向瓶 A 倒水 → 立即旋紧瓶 A；向瓶 B 倒氢氧化钠溶液 → 立即旋紧瓶 B；再振荡。
// 滴管（上册第 17 页）：平时竖着插在滴瓶里；拿起来一直竖着（橡胶帽在上），到点滴板孔上方悬空滴；用完插回原滴瓶。
import * as THREE from 'three';
import { buttons, table } from './kit/ui.js';
import { draggable, clamp, lerp } from './kit/interact.js';
import { canvasTex, textPlate } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { chemBeaker, glassMat, CHEM } from './kit/chem.js';
import { water2 } from './kit/chemfx.js';
import { dropBottle, homeLift } from './kit/labops.js';
import { micro, naohScene } from './kit/microworld.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked, glassEdge } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const DARK = 0x3d4350, LIGHT = 0xb9bec8;
// 点滴板：上排氢氧化钠溶液，下排石灰水
const PLATE = new THREE.Vector3(-0.145, 0, -0.005);
const WELLS = [[-0.022, -0.012, 'NaOH'], [0.0, -0.012, 'NaOH'], [-0.022, 0.012, 'CaOH'], [0.0, 0.012, 'CaOH']];
const BASE = { NaOH: '氢氧化钠溶液', CaOH: '石灰水' };
// 两个滴瓶放在点滴板后面的左右两边（不挡住孔；滴管在孔上方时也不和滴瓶叠在一起）；drop：滴下去的液滴（酚酞溶液是无色的）
const IND = [{ key: 'lit', name: '石蕊溶液', color: 0x8b5fb0, base: 0x3d6fd2, drop: 0x9a7fc0, bottle: new THREE.Vector3(-0.2, 0, -0.05) }, { key: 'ph', name: '酚酞溶液', color: 0xf2f2ee, base: 0xe0307a, drop: 0xd6eaf2, liq: 0xe0ecef, bottle: new THREE.Vector3(-0.112, 0, -0.05) }];
const CARRY_Y = 0.055, DRIP_Y = 0.017;                                            // 拿着滴管走时滴管尖的高度（高过滴瓶口）；在孔上方悬空滴时滴管尖的高度（离板面约 1 cm）
// 两个软塑料瓶（集满二氧化碳）：瓶 A 加水，瓶 B 加氢氧化钠溶液；各自右边一杯液体，前面一个瓶盖
const BR = 0.031;
const BOT_PTS = [[0.0003, 0], [BR - 0.003, 0], [BR, 0.004], ...Array.from({ length: 20 }, (_, i) => [BR, 0.008 + i * 0.0046]), [0.029, 0.102], [0.026, 0.11], [0.02, 0.118], [0.014, 0.125], [0.011, 0.128], [0.011, 0.14]];
const BX = [-0.055, 0.085], V_BOT = 330;                                         // mL（模型）
const LIQ = [{ name: '水', short: '水', color: CHEM.water }, { name: '氢氧化钠溶液', short: '氢氧化钠溶液', color: 0xe6eef2 }];
const CUP_R = 0.024, CUP_H = 0.066, CUP_V = 150;
const CUP_X = BX.map((x) => x + 0.068);
const SPOUT = new THREE.Vector3(-CUP_R - 0.003, CUP_H / 2, 0);                     // 手抓在杯身中间：杯嘴在手的左上方
const SOL = 0.88;                                                                 // 1 体积水约溶解 0.88 体积二氧化碳（20 ℃）
const NAOH_CAP = 6.1;                                                             // 每毫升 0.5 mol/L 氢氧化钠溶液最多吸收约 6.1 mL 二氧化碳
const mouthOf = (i) => new THREE.Vector3(BX[i], 0.14, 0);

export default {
  id: 'baseprop',
  fig: '探究',
  title: '碱的化学性质',
  stampText: '探究',
  style: 'paper',
  predict: {
    q: '氢氧化钠溶液、氢氧化钙溶液（石灰水）能使紫色石蕊溶液和无色酚酞溶液分别变成什么颜色？',
    hint: '课本下册第 72 页探究；上一课题学过：酸使石蕊变红、酚酞不变色。',
    options: ['石蕊变蓝，酚酞变红', '石蕊变红，酚酞不变色', '都不变色', '石蕊不变色，酚酞变蓝'],
    answer: 0,
  },
  need: '在点滴板上向氢氧化钠溶液、石灰水中滴加石蕊溶液和酚酞溶液；向两个集满二氧化碳的软塑料瓶里分别加等量的水和氢氧化钠溶液，旋紧瓶盖振荡，比较两个瓶子',
  conclusion: {
    crops: [{ page: 77, rect: [64, 505, 472, 652] }],
    quote: '研究表明，与盐酸、硫酸等酸类似，像氢氧化钠、氢氧化钙这样的碱，在水中都能解离出金属离子和OH⁻，即在不同碱的溶液中都含有OH⁻，所以，碱有一些相似的化学性质。',
    formula: '2NaOH + CO₂ ══ Na₂CO₃ + H₂O　　Ca(OH)₂ + CO₂ ══ CaCO₃↓ + H₂O',
    why: '氢氧化钠溶液、石灰水都能使紫色石蕊溶液<b>变蓝</b>、使无色酚酞溶液<b>变红</b>。氢氧化钠和二氧化碳反应<b>看不到现象</b>，所以用一瓶加水的做对照：两瓶加的液体一样多，加氢氧化钠溶液的瓶子瘪得多得多——多吸收的二氧化碳是和氢氧化钠<b>反应掉</b>的，生成了碳酸钠。氢氧化钠、氢氧化钙都能和二氧化碳这样的非金属氧化物反应，生成盐和水（三氧化硫也一样：2NaOH + SO₃ ══ Na₂SO₄ + H₂O）。<br>所以氢氧化钠必须<b>密封保存</b>：它会吸水潮解，还会和空气中的二氧化碳反应而变质。熟石灰和沙子混合砌砖：熟石灰和空气中的二氧化碳反应，生成坚硬的碳酸钙。',
    src: '课本下册第 72–73 页 · 第十单元 课题2 常见的酸和碱（探究：碱的化学性质）；二氧化碳的溶解度：20 ℃ 约 0.88 体积 / 1 体积水',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); else bar.caption(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };
    const plate2 = (txt, w) => textPlate(txt, { w, h: 0.0075, color: '#23293a', bg: '#fffaf0', font: 'bold 80px "Songti SC", serif' });

    paperSheet(group, { w: 0.42, d: 0.2, x: -0.005, z: 0.02 });

    // ================= 点滴板、两个滴瓶 =================
    const plate = inked(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.008, 0.05), paint(0xf8f8f6)), { width: 0.7 }); plate.position.copy(PLATE).add(new THREE.Vector3(-0.011, 0.004, 0)); group.add(plate);
    const wells = WELLS.map(([dx, dz, b]) => {
      const x = PLATE.x + dx, z = PLATE.z + dz;
      const rim = new THREE.Mesh(new THREE.RingGeometry(0.0062, 0.0078, 28), paint(0xc9ccd2, { keep: true })); rim.rotation.x = -Math.PI / 2; rim.position.set(x, 0.00805, z); group.add(rim);
      const liq = new THREE.Mesh(new THREE.CircleGeometry(0.0062, 28), paint(0xe8eef2, { keep: true, unique: true })); liq.rotation.x = -Math.PI / 2; liq.position.set(x, 0.0081, z); group.add(liq);
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.01, 10), new THREE.MeshBasicMaterial({ visible: false })); pick.position.set(x, 0.008, z); pick.userData.pick = true; group.add(pick);
      return { x, z, base: b, liq, pick };
    });
    for (const [txt, dz] of [['氢氧化钠溶液', -0.012], ['石灰水', 0.012]]) {
      const pl = textPlate(txt, { w: txt.length * 0.0042, h: 0.007, color: '#23293a', bg: 'rgba(0,0,0,0)', font: 'bold 84px "Songti SC", serif' });
      pl.rotation.x = -Math.PI / 2; pl.position.set(PLATE.x + 0.012 + txt.length * 0.0021, 0.0082, PLATE.z + dz); group.add(pl);
    }
    // 滴瓶（kit 的 dropBottle）+ 竖着插在瓶里的滴管；标签贴在滴瓶上（字多时字号缩小，免得被裁掉）。滴管的原点在滴管尖。
    // ——dropper / follow / putBack 和 indicator、basereact、acidprop 里的一样，建议进 kit
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

    // ================= 两个软塑料瓶、两杯液体、两个瓶盖 =================
    const bottles = BX.map((x, i) => {
      const geo = new THREE.LatheGeometry(BOT_PTS.map(([r, y]) => new THREE.Vector2(r, y)), 40);
      const g = new THREE.Group(); g.position.set(x, 0, 0); group.add(g);
      const mesh = new THREE.Mesh(geo, glassMat({ opacity: 0.26 })); mesh.renderOrder = 9; g.add(mesh);
      const ring = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.003, 24), paint(0xdfe6ea)), { width: 0.5 }); ring.position.y = 0.129; g.add(ring);
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(BR + 0.004, BR + 0.004, 0.14, 12), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 0.07; pick.userData.pick = true; g.add(pick);
      const capHome = new THREE.Vector3(x + 0.04, 0.006, 0.07);
      const cap = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.012, 24), paint(0x3f7fc4, { keep: true })), { width: 0.6 }); cap.position.copy(capHome); group.add(cap);
      const capPick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.022, 10), new THREE.MeshBasicMaterial({ visible: false })); capPick.userData.pick = true; cap.add(capPick);
      const lab = plate2(i ? '瓶 B' : '瓶 A', 0.016); lab.rotation.x = -Math.PI / 2; lab.position.set(x - 0.006, 0.0004, 0.045); group.add(lab);
      return { g, geo, base: Float32Array.from(geo.attributes.position.array), mesh, pick, cap, capPick, capHome, water: null, waterKey: '', lastSq: -1 };
    });
    const cups = CUP_X.map((x, i) => {
      const pivot = new THREE.Group(); group.add(pivot);              // 转轴在杯嘴
      const cup = chemBeaker({ r: CUP_R, h: CUP_H, level: 0.048, color: LIQ[i].color, marks: true }); cup.position.set(CUP_R + 0.003, -CUP_H, 0); pivot.add(cup);
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(CUP_R + 0.004, CUP_R + 0.004, CUP_H, 12), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = CUP_H / 2; pick.userData.pick = true; cup.add(pick);
      const home = new THREE.Vector3(x - CUP_R - 0.003, CUP_H, 0);
      pivot.position.copy(home);
      const lab = plate2(LIQ[i].name, LIQ[i].name.length * 0.0042); lab.rotation.x = -Math.PI / 2; lab.position.set(x, 0.0004, 0.036); group.add(lab);
      return { pivot, cup, pick, home };
    });
    const drops = new Particles({ max: 80, geometry: new THREE.SphereGeometry(1, 6, 5), material: water2({ color: CHEM.water, base: 0.5 }) }); group.add(drops.mesh);

    // ================= 气体小点：瓶里的二氧化碳（深灰）、瓶盖开着时补进来的空气（浅灰）、溶进水里的二氧化碳 =================
    const dotTex = canvasTex(64, 64, (g, Wd) => { const gr = g.createRadialGradient(Wd / 2, Wd / 2, 0, Wd / 2, Wd / 2, Wd / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,1)'); gr.addColorStop(0.75, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, Wd, Wd); });
    const darkP = new Particles({ max: 160, sprite: true, color: DARK }), lightP = new Particles({ max: 100, sprite: true, color: LIGHT });
    for (const p of [darkP, lightP]) { p.mat.uniforms.map.value = dotTex; p.mesh.renderOrder = 10; group.add(p.mesh); }
    const botDots = BX.map(() => Array.from({ length: 44 }, (_, k) => ({ u: Math.sqrt(Math.random()) * 0.82, th: Math.random() * Math.PI * 2, y: Math.random(), rank: (k + 0.5) / 44, ph: Math.random() * 6, p: new THREE.Vector3(), size: 0.0034, alpha: 0.9 })));
    const solDots = Array.from({ length: 28 }, () => ({ u: Math.sqrt(Math.random()) * 0.8, th: Math.random() * Math.PI * 2, y: Math.random(), ph: Math.random() * 6, p: new THREE.Vector3(), size: 0.0022, alpha: 0.75 }));

    const botCards = BX.map((x, i) => { const c = tag('', 'cond'); c.px = [i ? 74 : -74, -64]; return c; });
    const plateCard = tag('', 'cond'); plateCard.px = [0, 44];          // 点滴板前面（后面是两个滴瓶，卡片不挡住它们）

    // ================= 状态 =================
    const freshB = () => ({ vw: 0, capOn: false, capT: 0, abs: 0, abs0: 0, air: 0, shakeE: 0, offX: 0, lastX: null, pourLogged: false, logged: false, openLogged: false });
    const fresh = () => ({ demo: false, well: WELLS.map(() => null), dCarry: [null, null], logged: {}, b: BX.map(freshB), cup: CUP_X.map(() => ({ v: CUP_V, carry: null, tilt: 0 })), compared: false });
    S = fresh();
    const gas0 = (B) => V_BOT - B.vw;                                            // 倒进液体以后，瓶里剩下的二氧化碳（mL）
    const squeeze = (B) => (B.capOn ? clamp((B.abs - B.abs0) / V_BOT, 0, 0.62) : 0);   // 旋紧以后被吸收的，就是瓶子少了的体积

    // ---- 塑料瓶变形（同实验 6-4）：瓶身中部最深，往瓶底、瓶肩渐浅；两侧被压进去，再加几道皱 ----
    const dentAt = (th, y) => { if (y < 0.006 || y > 0.104) return 0; const b = Math.pow(Math.sin((Math.PI * (y - 0.006)) / 0.098), 0.8); return b * (0.5 + 0.42 * Math.cos(2 * th + 0.6) + 0.08 * Math.sin(5 * th + y * 140)); };
    const deform = (bt, sq) => {
      if (Math.abs(sq - bt.lastSq) < 0.002) return; bt.lastSq = sq;
      const a = Math.min(0.85, sq / 0.56), pos = bt.geo.attributes.position;
      for (let i = 0; i < pos.count; i++) { const x = bt.base[i * 3], y = bt.base[i * 3 + 1], z = bt.base[i * 3 + 2], k = 1 - a * dentAt(Math.atan2(z, x), y); pos.setXYZ(i, x * k, y, z * k); }
      pos.needsUpdate = true; bt.geo.computeVertexNormals(); bt.waterKey = '';
    };
    const waterH = (vw) => (vw * 1e-6) / (Math.PI * (BR - 0.001) ** 2);
    const rebuildWater = (bt, vw, color) => {
      const hw = Math.min(0.094, waterH(vw)), key = hw.toFixed(4) + '|' + bt.lastSq.toFixed(3);
      if (key === bt.waterKey) return; bt.waterKey = key;
      if (bt.water) { bt.g.remove(bt.water); bt.water.geometry.dispose(); }
      if (hw < 0.001) { bt.water = null; return; }
      const nSide = Math.max(2, Math.ceil((hw - 0.004) / 0.003)), side = Array.from({ length: nSide + 1 }, (_, k) => new THREE.Vector2(BR - 0.0012, 0.004 + ((hw - 0.004) * k) / nSide));
      const geo = new THREE.LatheGeometry([new THREE.Vector2(0.0003, 0.0012), new THREE.Vector2(BR - 0.0042, 0.0012), ...side, new THREE.Vector2(0.0003, hw)], 40);
      const a = Math.min(0.85, bt.lastSq / 0.56), pos = geo.attributes.position;
      for (let k = 0; k < pos.count; k++) { const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k), d = 1 - a * dentAt(Math.atan2(z, x), y); pos.setXYZ(k, x * d, y, z * d); }
      geo.computeVertexNormals();
      bt.water = new THREE.Mesh(geo, water2({ color })); bt.water.renderOrder = 7; bt.water.raycast = () => {}; bt.g.add(bt.water);
    };

    // ================= 微观次元：钻进瓶 B 的溶液里看 CO₂ + 2OH⁻ → CO₃²⁻ + H₂O =================
    const mic = micro({ tag, look, back, group, scene: naohScene(), at: () => new THREE.Vector3(BX[1], 0.008, 0), label: '钻进瓶 B 里看',
      state: () => { const B = S.b[1], g0 = Math.max(1, gas0(B)), absF = clamp((B.abs - B.abs0) / g0, 0, 1); return { liquid: B.vw > 5, gas: B.capOn ? 1 - absF : 1, abs: B.capOn ? absF : 0, capOn: B.capOn }; },
      show: () => S.b[1].vw > 5, bar: () => bar, scale: 0.0062, btnAt: () => new THREE.Vector3(BX[1], 0.168, 0) });

    // ================= 操作 =================
    const A = {
      dropDrag(i, p) { if (!p) return; S.dCarry[i] = p.clone(); },
      dropDrop(i) {
        const p = S.dCarry[i]; S.dCarry[i] = null; if (!p) return;
        const w = wells.indexOf(wellAt(p));
        if (w < 0) return;
        if (S.well[w]) return status('这个孔里已经滴过指示剂了。换一个孔。');
        S.well[w] = IND[i].key; sfx.clink({ freq: 2600, gain: 0.02 });
        for (let j = 0; j < 4; j++) dropsP[i].spawn({ p: new THREE.Vector3(wells[w].x, DRIP_Y - 0.0015, wells[w].z), v: new THREE.Vector3(0, -0.03 - j * 0.012, 0), size: 0.0012, life: 1 });      // 从滴管尖滴下去
        const b = BASE[wells[w].base];
        status(i === 0 ? `往${b}里滴了紫色石蕊溶液：变成了<b>蓝色</b>。` : `往${b}里滴了无色酚酞溶液：变成了<b>红色</b>。`);
        const key = `${wells[w].base}|${IND[i].key}`;
        if (!S.logged[key]) { S.logged[key] = true; log([`${b} + ${IND[i].name}`, i === 0 ? '变<b>蓝</b>' : '变<b>红</b>', '溶液显碱性']); }
        if (['NaOH|lit', 'NaOH|ph', 'CaOH|lit', 'CaOH|ph'].every((k) => S.logged[k])) { done('ind'); status('四个孔都滴好了：氢氧化钠溶液、石灰水都能使<b>石蕊变蓝</b>、<b>酚酞变红</b>。<br>氢氧化钙能和二氧化碳反应（石灰水变浑浊），氢氧化钠呢？看右边的两个软塑料瓶——里面都<b>集满了二氧化碳</b>。'); }
      },
      cupDrag(i, p) { if (!p) return; S.cup[i].carry = p.clone(); },
      cupDrop(i) {
        S.cup[i].carry = null;
        const B = S.b[i];
        if (B.vw > 5 && !B.pourLogged) {
          B.pourLogged = true;
          const f = B.vw / V_BOT;
          log([`往瓶 ${i ? 'B' : 'A'} 里倒${LIQ[i].name}`, `约 ${Math.round(B.vw)} mL（${f < 0.27 ? '不到 1/3' : f > 0.42 ? '一半左右' : '约 1/3'}容积）`, '']);
          status(`瓶 ${i ? 'B' : 'A'} 里倒了约 <b>${Math.round(B.vw)} mL</b> ${LIQ[i].name}。<b>立即</b>旋紧瓶 ${i ? 'B' : 'A'} 的瓶盖（点一下它前面的<b>瓶盖</b>）。`);
          if (S.b.every((o) => o.vw > 5)) {
            const d = Math.abs(S.b[0].vw - S.b[1].vw);
            if (d > 30) status(`两个瓶里的液体差了约 ${Math.round(d)} mL——要比较，两瓶加的液体要<b>一样多</b>（控制变量）。可以“全部重来”再倒一次，也可以先接着做，看看结果。`);
          }
        }
      },
      capTap(i) {
        const B = S.b[i];
        if (B.capOn) return status(`瓶 ${i ? 'B' : 'A'} 的瓶盖已经旋紧了。按住瓶子，左右来回拖几下：振荡。`);
        if (B.vw < 5) return status(`先往瓶 ${i ? 'B' : 'A'} 里倒约 1/3 容积的${LIQ[i].name}，再旋紧瓶盖。`);
        B.capOn = true; B.capT = 0; B.air = 0; B.abs0 = B.abs; sfx.clink({ freq: 1400, gain: 0.04 });
        done(i ? 'botB' : 'botA');
        const O = S.b[1 - i];
        status(`旋紧了瓶 ${i ? 'B' : 'A'} 的瓶盖。${O.vw < 5 ? `再往瓶 ${i ? 'A' : 'B'} 里倒<b>同样多</b>的${LIQ[1 - i].name}，倒好<b>立即</b>旋紧。` : O.capOn ? '现在分别<b>振荡</b>两个瓶子：按住瓶子，左右来回拖几下。' : ''}`);
      },
      shake(i, p) {
        if (!p) return;
        const B = S.b[i], last = B.lastX; B.lastX = p.x;
        if (last == null) return;
        B.shakeE = Math.min(1, B.shakeE + Math.min(0.5, Math.abs(p.x - last) * 18));
        B.offX = clamp(p.x - BX[i], -0.012, 0.012);
      },
      shakeEnd(i) { S.b[i].lastX = null; },
      reset() {
        S = fresh(); mic.close(); drops.clear(); for (const p of dropsP) p.clear(); W?.tbl.clear();
        if (W) { W.t1.close(); W.t2.close(); W.t3.close(); W.next.hidden = true; }
        bar.undo('ind', 'botA', 'botB', 'shake', 'why');
        status('全部重新摆好了，记录也清空了。两个软塑料瓶里又集满了二氧化碳。');
      },
    };

    const drag = draggable(group, [
      ...IND.map((I, i) => ({ obj: droppers[i].pick, plane: 'xz', offset: CARRY_Y, hint: `${I.name}：拖到点滴板的一个孔上方，滴几滴`, onStart: (p) => A.dropDrag(i, p), onDrag: (p) => A.dropDrag(i, p), onEnd: () => A.dropDrop(i) })),
      ...cups.map((c, i) => ({ obj: c.pick, plane: 'xy', offset: 0, hint: () => (S.b[i].capOn ? '' : `${LIQ[i].name}：拖到瓶 ${i ? 'B' : 'A'} 口，按住倒；松手停`), onStart: (p) => A.cupDrag(i, p), onDrag: (p) => A.cupDrag(i, p), onEnd: () => A.cupDrop(i) })),
      ...bottles.map((bt, i) => ({ obj: bt.capPick, plane: 'xy', offset: 0, hint: () => (S.b[i].capOn ? '' : `点一下：旋紧瓶 ${i ? 'B' : 'A'} 的瓶盖`), onTap: () => A.capTap(i), onStart: () => {}, onDrag: () => {}, onEnd: () => {} })),
      ...bottles.map((bt, i) => ({ obj: bt.pick, plane: 'xy', offset: 0, hint: () => (S.b[i].capOn ? '按住，左右来回拖：振荡' : '按住，左右来回拖：振荡（瓶盖还没旋紧）'), onStart: (p) => { S.b[i].lastX = p ? p.x : null; }, onDrag: (p) => A.shake(i, p), onEnd: () => A.shakeEnd(i) })),
    ], { tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const overWell = (w) => () => new THREE.Vector3(wells[w].x, CARRY_Y, wells[w].z);
    const wellAt = (p) => wells.find((w) => Math.hypot(p.x - w.x, p.z - w.z) < 0.009);
    // 演示：从滴瓶里竖直提出滴管，移到孔上方，降到孔上方悬空，松手滴下去（滴管插回滴瓶）
    const dripTo = (i, w, t0, t1, release) => act.path(droppers[i].pick, [null, () => droppers[i].B.position.clone().setY(CARRY_Y), overWell(w)], { t0, t1, release });
    const spoutAt = (i) => () => mouthOf(i).add(new THREE.Vector3(0.012, 0.004, 0)).sub(SPOUT);          // 手要到的地方：杯嘴正好在瓶口
    const wiggleShot = (i, t0, t1, dur) => act.wiggle(bottles[i].pick, { t0, t1, amp: 0.016, hz: 2.2, dur });
    // 演示：倒到约 1/3 容积松手；杯子一拿开，马上点这个瓶的瓶盖——立即旋紧（走学生点瓶盖的同一个处理函数）
    const pourShot = (i) => act.drag(cups[i].pick, spoutAt(i), { t0: 0.03, t1: 0.16, release: 0.9, until: () => S.b[i].vw >= V_BOT / 3 });
    const capWhenPoured = (i, gap) => { let at = null; const tap = act.tap(bottles[i].capPick, 0); return (k) => { if (k < 0.02) { at = null; tap(-1); return; } if (at == null && k > 0.1 && !S.cup[i].carry && S.b[i].vw > 5) at = k; if (at != null && k >= at + gap) tap(k); }; };
    const botTarget = (i) => (S.b[i].vw < 5 ? (S.cup[i].carry ? null : cups[i].cup) : !S.b[i].capOn ? bottles[i].cap : null);

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'ind', title: '滴指示剂', todo: '把<b>石蕊溶液</b>、<b>酚酞溶液</b>分别滴进点滴板上的氢氧化钠溶液、石灰水里（四个孔各滴一种）。', target: () => (S.dCarry[0] || S.dCarry[1] ? null : droppers[['NaOH|lit', 'CaOH|lit'].every((k) => S.logged[k]) ? 1 : 0]) },
        { id: 'botA', title: '瓶 A：倒水，立即旋紧', todo: '两个软塑料瓶里都集满了二氧化碳。把<b>水</b>倒进瓶 A，约 <b>1/3</b> 容积；倒好<b>立即</b>点一下瓶 A 前面的<b>瓶盖</b>，旋紧。', target: () => botTarget(0) },
        { id: 'botB', title: '瓶 B：倒氢氧化钠溶液，立即旋紧', todo: '把<b>氢氧化钠溶液</b>倒进瓶 B，和瓶 A 里的水<b>一样多</b>；倒好<b>立即</b>点一下瓶 B 前面的<b>瓶盖</b>，旋紧。', target: () => botTarget(1) },
        { id: 'shake', title: '振荡、比较', todo: '按住<b>塑料瓶</b>左右来回拖几下（振荡），两个瓶子都振荡。比一比哪个瘪得多。', target: () => { const i = S.b.findIndex((o) => !o.logged); return i >= 0 ? bottles[i].g : null; } },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { drops.clear(); for (const p of dropsP) p.clear(); mic.close(); } }),
          shots: [
            { cap: '在白色点滴板上，向氢氧化钠溶液、石灰水里分别滴加紫色石蕊溶液：都变蓝。', dur: 6, cam: [[PLATE.x - 0.012, 0.04, -0.012], [0.04, 0.6, 1], 0.28],
              during: act.seq(dripTo(0, 0, 0.05, 0.3, 0.4), dripTo(0, 2, 0.52, 0.77, 0.87)) },
            { cap: '再分别滴加无色酚酞溶液：都变红。', dur: 6, cam: [[PLATE.x - 0.012, 0.04, -0.012], [0.04, 0.6, 1], 0.28],
              during: act.seq(dripTo(1, 1, 0.05, 0.3, 0.4), dripTo(1, 3, 0.52, 0.77, 0.87)) },
            { cap: '两个软塑料瓶里都集满了二氧化碳。往瓶 A 里倒约 1/3 容积的水，立即旋紧瓶盖。', dur: 9, cam: [[0.015, 0.1, 0], [0.08, 0.22, 1], 0.5],
              during: act.seq(pourShot(0), capWhenPoured(0, 0.04)) },
            { cap: '往瓶 B 里倒同样多的氢氧化钠溶液，立即旋紧瓶盖。', dur: 9, cam: [[0.015, 0.1, 0], [0.08, 0.22, 1], 0.5],
              during: act.seq(pourShot(1), capWhenPoured(1, 0.04)) },
            { cap: '分别振荡两个瓶子：瓶 A（水）稍微瘪了一点，瓶 B（氢氧化钠溶液）瘪得多得多。', dur: 8, speed: 2, cam: [[0.015, 0.07, 0], [0.08, 0.25, 1], 0.42], during: act.seq(wiggleShot(0, 0.04, 0.42, 8), wiggleShot(1, 0.5, 0.9, 8)) },
            { cap: '钻进瓶 B 的溶液里看：CO₂ 碰上两个 OH⁻，变成 CO₃²⁻ 和水——生成了碳酸钠。', dur: 11, cam: [[BX[1], 0.066, 0], [0.05, 0.22, 1], 0.3], during: act.at(0.02, () => mic.open(true)) },
            { cap: '瓶 B 比瓶 A 瘪得多：氢氧化钠和二氧化碳发生了反应。演示完了，下面换你自己做。', enter: () => mic.close(), dur: 4, cam: [[0.015, 0.07, 0], [0.08, 0.25, 1], 0.42] },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ================= 每帧 =================
    const step = (h, t) => {
      // 滴管
      // 滴管一直竖着：拿着时跟着手走（高过滴瓶口）；到了孔上方，降下去悬空（不碰点滴板）；松手滴下去，插回原滴瓶
      droppers.forEach((d, i) => {
        const p = S.dCarry[i];
        if (p) { const w = wellAt(p); follow(d, w ? new THREE.Vector3(w.x, DRIP_Y, w.z) : new THREE.Vector3(p.x, CARRY_Y, p.z), 0.4); }
        else putBack(d, 0.25, CARRY_Y);
      });
      for (const P of dropsP) P.update(h, (q, dd) => { q.p.addScaledVector(q.v, dd); return q.p.y > 0.0083; });
      wells.forEach((w, k) => { const c = S.well[k]; w.liq.material.color.lerp(new THREE.Color(c ? IND.find((I) => I.key === c).base : 0xe8eef2), Math.min(1, h * 3)); });

      // 倒液体：杯嘴到了瓶口就倾斜着倒（约 22 mL/s），松手停
      cups.forEach((c, i) => {
        const C = S.cup[i], B = S.b[i];
        if (C.carry) {
          const spout = C.carry.clone().add(SPOUT), mouth = mouthOf(i).add(new THREE.Vector3(0.012, 0.004, 0));
          const at = spout.distanceTo(mouth) < 0.035 && !B.capOn;
          c.pivot.position.lerp(at ? mouthOf(i).add(new THREE.Vector3(0.012, 0.006, 0)) : spout, at ? 0.3 : 1);
          const tw = at ? 1.2 + (1 - C.v / CUP_V) * 0.6 : 0;
          C.tilt += (tw - C.tilt) * Math.min(1, h * 4);
          if (at && C.tilt > 1.0 && C.v > 0) {
            const dv = Math.min(C.v, 22 * h);
            C.v -= dv; B.vw = Math.min(V_BOT * 0.85, B.vw + dv);
            if (Math.random() < h * 30) drops.spawn({ p: mouthOf(i).add(new THREE.Vector3((Math.random() - 0.5) * 0.006, 0.002, (Math.random() - 0.5) * 0.006)), v: new THREE.Vector3(0, -0.05, 0), size: 0.0014, life: 1, k: i });
          }
        } else {
          c.pivot.position.lerp(c.home, 0.25);
          C.tilt += (0 - C.tilt) * Math.min(1, h * 5);
        }
        c.pivot.rotation.z = C.tilt;
        c.cup.setLevel(0.048 * (C.v / CUP_V));
      });
      drops.update(h, (p, d) => { p.v.y -= 0.6 * d; p.p.addScaledVector(p.v, d); return p.p.y > waterH(S.b[p.k].vw) + 0.002; });

      // 吸收：水只是溶解（1 体积水约 0.88 体积）；氢氧化钠溶液还会和二氧化碳反应，能吸收的多得多。振荡时快，静置时慢
      const dark = [], light = [];
      bottles.forEach((bt, i) => {
        const B = S.b[i];
        B.shakeE = Math.max(0, B.shakeE - h * 0.8);
        if (B.vw > 1) {
          const cap = Math.min((SOL + (i ? NAOH_CAP : 0)) * B.vw, gas0(B));
          const k = i ? 0.02 + 1.8 * B.shakeE : 0.01 + 1.1 * B.shakeE;           // 静置时只在液面上慢慢吸收（几十秒到一两分钟）
          if (cap > B.abs) B.abs += (cap - B.abs) * Math.min(1, k * h);
          if (!B.capOn) B.air = clamp(B.abs / Math.max(1, gas0(B)), 0, 1);          // 瓶口开着：吸收掉多少，就从瓶口补进来多少空气
        }
        const sq = squeeze(B); deform(bt, sq); rebuildWater(bt, B.vw, LIQ[i].color);
        B.offX *= Math.max(0, 1 - h * 6);
        bt.g.position.set(BX[i] + B.offX, 0, 0); bt.g.rotation.z = -B.offX * 6;
        // 瓶盖：点一下以后飞到瓶口，再转两圈拧紧
        if (B.capOn) B.capT = Math.min(1, B.capT + h * 1.6);
        const flyK = clamp(B.capT / 0.45, 0, 1), turnK = clamp((B.capT - 0.45) / 0.55, 0, 1);
        const capTop = bt.g.position.clone().add(new THREE.Vector3(0, 0.146 + 0.004 * (1 - turnK), 0));
        if (B.capOn) { const e = flyK * flyK * (3 - 2 * flyK); bt.cap.position.lerpVectors(bt.capHome, capTop, e); bt.cap.position.y += Math.sin(Math.PI * e) * 0.04; }
        else bt.cap.position.lerp(bt.capHome, 0.25);
        bt.cap.rotation.set(0, B.capOn ? turnK * Math.PI * 4 : 0, B.capOn ? bt.g.rotation.z * flyK : 0);
        // 记录：瓶子瘪下去
        const th = i ? 0.3 : 0.1;
        if (B.capOn && sq > th && !B.logged) {
          B.logged = true;
          log(i ? ['瓶 B（氢氧化钠溶液）：旋紧瓶盖，振荡', '塑料瓶<b>瘪得很厉害</b>', '被吸收的二氧化碳比水溶解的多得多'] : ['瓶 A（水）：旋紧瓶盖，振荡', '塑料瓶<b>稍微瘪了</b>', '二氧化碳能溶于水']);
          status(i ? `瓶 B <b>瘪得很厉害</b>：瓶里的二氧化碳几乎都被吸收了。${S.b[0].logged ? '' : '再振荡瓶 A 比一比。'}` : `瓶 A 稍微瘪了一点：二氧化碳溶进了水里。${S.b[1].logged ? '' : '再振荡瓶 B 比一比。'}`);
        }
        if (!B.capOn && B.abs > 15 && !B.openLogged && B.shakeE > 0.2) { B.openLogged = true; status(`瓶 ${i ? 'B' : 'A'} 的瓶盖还没旋紧：被吸收的二氧化碳，由瓶口进来的空气补上了（看浅灰点），瓶子不会瘪。先点一下<b>瓶盖</b>旋紧。`); }
        // 气体小点
        const hw = Math.min(0.094, waterH(B.vw)), a = Math.min(0.85, bt.lastSq / 0.56);
        const gasN = Math.round(botDots[i].length * clamp((V_BOT - B.vw - (B.capOn ? B.abs - B.abs0 : 0)) / V_BOT, 0, 1));
        botDots[i].forEach((d, k) => {
          if (k >= gasN) return;
          const y = hw + 0.004 + (0.118 - hw) * d.y, rMax = y > 0.095 ? lerp(BR, 0.012, clamp((y - 0.095) / 0.03, 0, 1)) : BR;
          const thd = d.th + Math.sin(t * 0.4 + d.ph) * 0.15, rr = (rMax - 0.005) * d.u * (1 - a * dentAt(thd, y));
          d.p.set(bt.g.position.x + Math.cos(thd) * rr, y, bt.g.position.z + Math.sin(thd) * rr);
          (!B.capOn && d.rank < B.air ? light : dark).push(d);
        });
        if (i === 0) {            // 溶进水里的二氧化碳（瓶 B 里的已经变成了碳酸钠，钻进去看）
          const solN = Math.round(solDots.length * clamp(B.abs / (SOL * V_BOT / 3), 0, 1));
          solDots.forEach((d, k) => {
            if (k >= solN || hw < 0.004) return;
            const y = 0.003 + (hw - 0.005) * d.y, thd = d.th + t * 0.2, rr = (BR - 0.005) * d.u * (1 - a * dentAt(thd, y));
            d.p.set(bt.g.position.x + Math.cos(thd) * rr, y, bt.g.position.z + Math.sin(thd) * rr);
            dark.push(d);
          });
        }
        const fr = B.vw / V_BOT, absN = B.capOn ? B.abs - B.abs0 : 0;
        botCards[i].text(`<div class="cc"><div class="cc-t"><span class="cc-name">瓶 ${i ? 'B' : 'A'} · ${LIQ[i].short}</span>${sq > 0.3 ? '<span class="cc-res">瘪得很厉害</span>' : sq > 0.1 ? '<span class="cc-res">稍微瘪了</span>' : ''}</div><div class="cc-more"><div class="cc-obs"><span class="o2-read"><i style="width:${Math.min(100, fr * 100)}%;background:#5aa9d6"></i></span><b>${Math.round(B.vw)} mL</b><small>${fr > 0.29 && fr < 0.38 ? '约 1/3 ✓' : '1/3 约 110 mL'}</small></div>${absN > 2 ? `<div class="cc-obs"><b style="color:#3d4350">${Math.round(absN)} mL</b><small>二氧化碳被${i ? '吸收（反应掉）' : '水溶解'}</small></div>` : ''}</div></div>`)
          .loc(group, BX[i] + (i ? BR : -BR), 0.11, 0).show(B.vw > 0.5 || !!S.cup[i].carry);
      });
      darkP.list = dark; lightP.list = light;
      for (const p of [darkP, lightP]) p.update(0, () => true);
      // 两个都振荡过：比一比
      if (S.b.every((o) => o.logged) && !S.compared) {
        S.compared = true; done('shake');
        status('两个瓶子比一比：加<b>氢氧化钠溶液</b>的瓶 B 比加水的瓶 A <b>瘪得多得多</b>。回答左边的问题。（也可以点瓶 B 上方的“钻进瓶 B 里看”。）');
        if (W && !S.demo) W.t1.open();
      }
      plateCard.text('<div class="cc"><div class="cc-t"><span class="cc-name">点滴板</span></div><div class="cc-more"><div class="cc-obs"><small>上排：氢氧化钠溶液　下排：石灰水</small></div></div></div>').loc(group, PLATE.x - 0.011, 0.008, 0.025).show(true);
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.44, d: 0.14, h: 0.16 },
      view: { elev: 20, azim: -4, lookY: 0.42, frameMargin: 1.06 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = () => [...W.tbl.el.querySelectorAll('tbody tr')].map((tr) => `<div>${tr.children[0].innerHTML}：${tr.children[1].innerHTML}</div>`).join('');
        const t3 = think({ title: '想一想', status: (m) => ui.status(m),
          q: '氢氧化钠为什么必须<b>密封保存</b>？',
          options: ['会吸收空气中的水分而潮解，还会和空气中的二氧化碳反应而变质', '会挥发掉', '会和空气中的氧气反应'],
          wrong: ['氢氧化钠是固体，不会挥发。', '看瓶 B：它和空气里的哪种气体反应？'],
          ok: '对。同样的道理：熟石灰和沙子混合砌砖，熟石灰和空气中的二氧化碳反应，生成坚硬的<b>碳酸钙</b>。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); } });
        const t2 = think({ title: '想一想', ctx: '<div>检验二氧化碳的反应：CO₂ + Ca(OH)₂ ══ CaCO₃↓ + H₂O</div>', status: (m) => ui.status(m),
          q: '仿照上面的反应，写出氢氧化钠和二氧化碳反应的化学方程式：',
          options: ['2NaOH + CO₂ ══ Na₂CO₃ + H₂O', 'NaOH + CO₂ ══ NaCO₃ + H₂O', 'NaOH + CO₂ ══ Na + H₂CO₃'],
          wrong: ['碳酸钠的化学式不对：钠显 +1 价，碳酸根显 −2 价，是 Na₂CO₃；再配平。', '钠不会变成单质跑出来：生成的是一种盐（碳酸钠）和水。'],
          ok: '对：2NaOH + CO₂ ══ Na₂CO₃ + H₂O。两个反应的共同点：<b>碱 + 某些非金属氧化物 → 盐 + 水</b>（三氧化硫也一样：2NaOH + SO₃ ══ Na₂SO₄ + H₂O）。',
          onOk: () => t3.open() });
        const t1 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '瓶 B 比瓶 A 瘪得多。这说明什么？',
          options: ['氢氧化钠和二氧化碳发生了反应：被吸收的二氧化碳比水溶解的多得多', '氢氧化钠溶液比水重，把瓶子压瘪了', '二氧化碳只是溶于水，没有和氢氧化钠反应'],
          wrong: ['瓶子是被外面的大气压压瘪的：瓶里的气体少了多少，瓶子就瘪多少，和溶液重不重没关系。', '如果只是溶于水，两瓶应该瘪得差不多——加水的瓶 A 就是用来比较的。'],
          ok: '对。瓶 A 告诉我们：二氧化碳溶于水，瓶子只瘪一点；瓶 B 多瘪的那部分，是被氢氧化钠<b>反应掉</b>的二氧化碳。看不到现象的反应，可以这样用<b>对照实验</b>来证明。',
          onOk: () => t2.open() });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['做了什么', '现象', '说明']);
        const vary = h('details', { class: 'more' }, h('summary', {}, '换个条件再试'),
          h('p', { class: 'fineprint', html: '先“全部重来”：①两瓶倒的液体<b>不一样多</b>，还能比较吗？②瓶 B 倒完<b>不旋紧瓶盖</b>就振荡，瓶子还会瘪吗？' }));
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'),
          buttons([{ text: '旋紧瓶 A 的瓶盖', ghost: true, onClick: () => A.capTap(0) }, { text: '旋紧瓶 B 的瓶盖', ghost: true, onClick: () => A.capTap(1) }]).el,
          buttons([{ text: '振荡瓶 A', ghost: true, onClick: () => { S.b[0].shakeE = 1; } }, { text: '振荡瓶 B', ghost: true, onClick: () => { S.b[1].shakeE = 1; } }]).el,
          buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：塑料瓶按 330 mL 计；20 ℃ 时 1 体积水约溶解 0.88 体积二氧化碳；氢氧化钠溶液按约 0.5 mol/L 计（每毫升最多吸收约 6.1 mL 二氧化碳）。振荡时吸收快、静置时慢，快慢是示意。' });
        ui.controls.append(t1.el, t2.el, t3.el, next, vary, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, t1, t2, t3, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('碱的化学性质：左边白色点滴板上，上排两个孔是<b>氢氧化钠溶液</b>，下排两个孔是<b>石灰水</b>；点滴板后面是石蕊溶液、酚酞溶液两个滴瓶。右边两个集满二氧化碳的软塑料瓶，旁边一杯水、一杯氢氧化钠溶液。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); mic.update(dt, k); },
      dispose() { mic.dispose(); bar.dispose(); drops.dispose(); for (const p of dropsP) p.dispose(); darkP.dispose(); lightP.dispose(); for (const bt of bottles) { bt.geo.dispose(); bt.water?.geometry.dispose(); } },
      debug: { get S() { return S; }, A, bar, picks: { lit: droppers[0].pick, ph: droppers[1].pick, cupA: cups[0].pick, cupB: cups[1].pick, capA: bottles[0].capPick, capB: bottles[1].capPick, botA: bottles[0].pick, botB: bottles[1].pick },
        qa: qaFlow(drag, [
          { name: '石蕊滴氢氧化钠', drag: droppers[0].pick, to: overWell(0), wait: 0.5 },
          { name: '石蕊滴石灰水', drag: droppers[0].pick, to: overWell(2), wait: 0.5 },
          { name: '酚酞滴氢氧化钠', drag: droppers[1].pick, to: overWell(1), wait: 0.5 },
          { name: '酚酞滴石灰水', drag: droppers[1].pick, to: overWell(3), wait: 0.5 },
          { name: '拿起水', hold: cups[0].pick },
          { name: '往瓶 A 倒水', run: () => A.cupDrag(0, spoutAt(0)()), wait: 1.6 },
          { name: '放下水', release: cups[0].pick, wait: 0.5 },
          { name: '旋紧瓶 A', tap: bottles[0].capPick, wait: 1 },
          { name: '拿起氢氧化钠溶液', hold: cups[1].pick },
          { name: '往瓶 B 倒', run: () => A.cupDrag(1, spoutAt(1)()), wait: 1.6 },
          { name: '放下氢氧化钠溶液', release: cups[1].pick, wait: 0.5 },
          { name: '旋紧瓶 B', tap: bottles[1].capPick, wait: 1 },
          ...[0, 1].flatMap((i) => [1, 2, 3].map((k) => ({ name: `振荡瓶 ${i ? 'B' : 'A'} ${k}`, run: () => { for (let j = 0; j < 6; j++) A.shake(i, new THREE.Vector3(BX[i] + (j % 2 ? 0.02 : -0.02), 0.07, 0)); if (k === 3) A.shakeEnd(i); }, wait: 1.2 }))),
          { name: '答第一题', run: () => W.t1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.t2.el.querySelector('button').click() },
          { name: '答第三题', run: () => W.t3.el.querySelector('button').click() },
        ]) },
    };
  },
};
