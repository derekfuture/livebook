// 实验活动8 常见酸、碱的化学性质 · 碱的那几步（课本下册第 91 页，步骤 4、6）。
//
// 步骤 4：试管里 2 mL 硫酸铜溶液，滴入几滴氢氧化钠溶液——生成蓝色沉淀（氢氧化铜）；再加稀盐酸——沉淀溶解，溶液变蓝。
// 步骤 6：两支试管各加一点氢氧化钙粉末（用药匙的柄把一端挑一点）、1 mL 水，振荡；各滴两滴酚酞——浑浊、变红。
//   再向一支加 1 mL 水、振荡：还是浑浊、红色；向另一支加 1 mL 稀盐酸、振荡：变澄清，红色消失。
//   （步骤 1、2 指示剂和 pH，步骤 3 生锈的铁钉，步骤 5 中和反应，在“酸碱指示剂”“pH 试纸”“酸的化学性质”“中和反应”几课里做。）
// 模型（课堂常用量，界面上写明）：硫酸铜溶液约 0.33 mol/L（5%），2 mL 含 Cu²⁺ 约 0.66 mmol；氢氧化钠溶液约 2.5 mol/L（10%），
//   稀盐酸约 1 mol/L；一滴约 0.05 mL。CuSO₄ + 2NaOH ══ Cu(OH)₂↓ + Na₂SO₄；Cu(OH)₂ + 2HCl ══ CuCl₂ + 2H₂O。
//   氢氧化钙一“挑”约 0.02 g（0.27 mmol）；20 ℃ 时溶解度约 0.165 g / 100 g 水——1 mL 水只能溶约 1.7 mg，绝大部分沉在下面（浑浊）。
//   饱和石灰水 pH 约 12.4，酚酞变红；加 1 mL 稀盐酸（1 mmol H⁺）足够把 0.27 mmol 氢氧化钙全部反应掉（Ca(OH)₂ + 2HCl ══ CaCl₂ + 2H₂O）：变澄清、酚酞褪色。
//   溶解、反应的快慢：振荡时快（一两秒），静置时慢；沉淀不振荡会慢慢沉到管底。
// 装粉末（上册第 16 页）：“可先将试管横放，把盛有试剂的药匙……小心地送至试管底部，然后把试管竖立起来。”——试管从架子上拿起来、横放，
//   药匙柄挑着粉末的那一端送到试管底部，翻一下把粉末留在管底，抽出药匙，再把试管竖起来、放回试管架。广口瓶取完粉末就盖好瓶塞。
// 滴管（上册第 17 页）：平时竖着插在滴瓶里；拿起来一直竖着（橡胶帽在上），到试管口上方悬空滴，不伸进试管；用完插回原滴瓶。
import * as THREE from 'three';
import { buttons, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { textPlate } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { testTube, glassMat, spatula, reagentBottle } from './kit/chem.js';
import { water2, tubeLiquid } from './kit/chemfx.js';
import { dropBottle, homeLift, bottleCap } from './kit/labops.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked, glassEdge } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const XS = [-0.06, 0.014, 0.048], T_R = 0.0085, T_LEN = 0.1, T_Y = 0.012, R_IN = T_R - 0.0008;
const DROP = 0.05;                                          // 一滴 mL
const CU0 = 0.66, OH_DROP = 0.125, H_DROP = 0.05;          // mmol：2 mL 硫酸铜溶液里的 Cu²⁺；一滴氢氧化钠溶液的 OH⁻；一滴稀盐酸的 H⁺
const CA_SCOOP = 0.27, CA_SAT = 0.0223;                    // mmol：一挑氢氧化钙；每毫升水最多溶解的氢氧化钙
// 四个滴瓶（滴管插在瓶里）：氢氧化钠溶液、稀盐酸、酚酞溶液、水。放在不挡住试管、广口瓶的地方
const DR = [
  { key: 'naoh', name: '氢氧化钠溶液', inside: 0xeef2f4, bottle: new THREE.Vector3(-0.115, 0, 0.045), per: 0.5 },
  { key: 'hcl', name: '稀盐酸', inside: 0xeef2f4, bottle: new THREE.Vector3(-0.087, 0, 0.045), per: 0.2 },
  { key: 'ph', name: '酚酞溶液', inside: 0xf2f2ee, bottle: new THREE.Vector3(-0.023, 0, 0.045), per: 0.5 },
  { key: 'water', name: '水', inside: 0xcfe7f3, bottle: new THREE.Vector3(0.16, 0, 0.03), per: 0.2 },        // 在广口瓶、药匙的右边（不挡住广口瓶）
];
const HIGH = 0.012 + 0.1 + 0.012;                           // 滴管尖在试管口上方 1.2 cm 悬空滴；拿着滴管走、插回滴瓶之前也先提到这么高
const JAR = new THREE.Vector3(0.096, 0, -0.012), JAR_R = 0.016, JAR_H = 0.04;
const SPOON_HOME = new THREE.Vector3(0.128, 0.004, 0.042);            // 药匙平放在广口瓶右边，柄朝后
const SP_TILT = 0.95;                                                 // 拿着药匙时柄斜着往左下伸（挑粉末的那一端在左下，勺在右上）
// 装粉末时试管怎么动：C 是试管中点（离管底 T_LEN/2），th 是倾斜角（负：管口朝右，-π/2 横放）。每一段多长（秒）：
//   药匙移开 | 试管竖直拿起来 | 移到前面 | 放低一点 | 横放 | 药匙移到管口 | 小心地送到管底 | 翻一下，粉末留在管底 | 抽出来 | 移开 | 试管竖起来 | 抬起来 | 移回试管架上方 | 放回去
const LOAD = [['clear', 0.35], ['lift', 0.4], ['fwd', 0.35], ['down', 0.2], ['tilt', 0.45], ['in', 0.3], ['push', 0.7], ['tip', 0.45], ['out', 0.4], ['away', 0.2], ['up', 0.45], ['rise', 0.2], ['back', 0.35], ['set', 0.4]];
const LOAD_END = LOAD.reduce((a, [, d]) => a + d, 0);
const CUSO4 = new THREE.Color(0x3f9fe0), PALE = new THREE.Color(0xe6eef2), RED = new THREE.Color(0xe0307a), CUOH = 0x4a86d6;
// 试管里的液体：半球形的底（半径 R_IN，球心和试管底的球心一样高）+ 圆柱；体积 → 液面高度
const YC = T_R + 0.0008, YB = YC - R_IN, V_HEMI = (2 / 3) * Math.PI * R_IN ** 3 * 1e6;      // 半球的体积（mL）
const levelY = (vol) => {
  if (vol <= 0) return YB;
  if (vol >= V_HEMI) return YC + ((vol - V_HEMI) * 1e-6) / (Math.PI * R_IN * R_IN);
  let lo = 0, hi = R_IN;            // 球冠：V = πh²(3R − h)/3
  for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if ((Math.PI * m * m * (3 * R_IN - m)) / 3 * 1e6 < vol) lo = m; else hi = m; }
  return YB + lo;
};

export default {
  id: 'basereact',
  fig: '实验活动8',
  title: '常见碱的化学性质',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '向硫酸铜溶液（蓝色）里滴入几滴氢氧化钠溶液，会看到什么？',
    hint: '课本下册第 91 页实验活动 8 步骤 4。',
    options: ['生成蓝色沉淀', '没有明显变化', '冒出气泡', '溶液变成红色'],
    answer: 0,
  },
  need: '硫酸铜溶液里滴氢氧化钠溶液，再加稀盐酸；两支试管各加一点氢氧化钙粉末和 1 mL 水、振荡、滴酚酞，再分别加 1 mL 水和 1 mL 稀盐酸，比较',
  conclusion: {
    crops: [{ page: 76, rect: [186, 259, 462, 342] }, { page: 95, rect: [66, 288, 360, 341] }],
    quote: '氢氧化钙是白色粉末状物质，微溶于水，其水溶液俗称石灰水。当石灰水中存在较多未溶解的熟石灰时，就称为石灰乳或石灰浆。',
    formula: 'CuSO₄ + 2NaOH ══ Cu(OH)₂↓ + Na₂SO₄　　Cu(OH)₂ + 2HCl ══ CuCl₂ + 2H₂O　　Ca(OH)₂ + 2HCl ══ CaCl₂ + 2H₂O',
    why: '步骤 4：氢氧化钠和硫酸铜反应，生成<b>蓝色的氢氧化铜沉淀</b>；氢氧化铜是一种碱，能和盐酸反应，生成可溶的氯化铜，所以沉淀溶解、溶液变蓝。<br>步骤 6：加了 1 mL 水的试管里，大部分氢氧化钙沉在下面——氢氧化钙<b>微溶于水</b>；溶解的那一点使酚酞变红——它的水溶液<b>显碱性</b>。再加 1 mL 水，还是浑浊；加 1 mL 稀盐酸，浑浊消失、红色褪去——氢氧化钙<b>能和酸反应</b>，生成可溶的氯化钙。',
    src: '课本下册第 72 页（氢氧化钙）、第 90–91 页 · 实验活动 8 常见酸、碱的化学性质',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); else bar.caption(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };
    // 滴管、药匙到了哪支试管口上方：镜头凑近那支试管（看得清沉淀、颜色）；松手就回去
    const near = (k) => { if (S.demo || S.nearK === k) return; S.nearK = k; look([XS[k], T_Y + 0.035, 0], [0.04, 0.22, 1], 0.2, () => { S.nearK = null; }); };
    const far = () => { if (S.nearK == null) return; S.nearK = null; back(); };
    const plateTxt = (txt, w, flat = true) => { const p = textPlate(txt, { w, h: 0.0072, color: '#23293a', bg: '#fffaf0', font: 'bold 78px "Songti SC", serif' }); if (flat) p.rotation.x = -Math.PI / 2; return p; };

    paperSheet(group, { w: 0.32, d: 0.17, x: 0.03, z: 0.025 });

    // ================= 试管架、三支试管 =================
    const rackM = paint(0xd9c9a6);
    for (const [cx, w] of [[XS[0], 0.036], [(XS[1] + XS[2]) / 2, 0.07]]) {
      const base = inked(new THREE.Mesh(new THREE.BoxGeometry(w, 0.008, 0.03), rackM), { width: 0.6 }); base.position.set(cx, 0.004, 0); group.add(base);
      for (const sx of [-1, 1]) { const p = inked(new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.06, 0.026), rackM), { width: 0.5 }); p.position.set(cx + sx * (w / 2 - 0.002), 0.036, 0); group.add(p); }
      const top = inked(new THREE.Mesh(new THREE.BoxGeometry(w, 0.004, 0.02), rackM), { width: 0.5 }); top.position.set(cx, 0.064, -0.006); group.add(top);
    }
    const tubes = XS.map((x, k) => {
      const holder = new THREE.Group(); holder.position.set(x, T_Y, 0); group.add(holder);         // 振荡时整支试管左右晃
      const t = testTube({ r: T_R, len: T_LEN }); holder.add(t);
      // 液体：和试管底一样是圆底，液面是平的（浑浊、沉淀颗粒都在液面以下）
      const liq = tubeLiquid({ R: R_IN, yc: YC, top: T_LEN - 0.012, color: k ? PALE.getHex() : CUSO4.getHex(), specks: k ? 50 : 36, speck: k ? 0.0006 : 0.0011 }); t.add(liq);
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(T_R + 0.004, T_R + 0.004, T_LEN, 10), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = T_LEN / 2; pick.userData.pick = true; t.add(pick);
      const lab = textPlate(k ? (k === 1 ? '甲' : '乙') : '硫酸铜溶液', { w: k ? 0.008 : 0.024, h: 0.0072, color: '#23293a', bg: '#fffaf0', font: 'bold 78px "Songti SC", serif' }); lab.position.set(x, 0.004, 0.0162); group.add(lab);
      return Object.assign(t, { holder, liq, pick });
    });
    const stepLab = [['步骤 4', XS[0]], ['步骤 6', (XS[1] + XS[2]) / 2]].map(([t, x]) => { const l = textPlate(t, { w: 0.018, h: 0.0068, color: '#5a6070', bg: 'rgba(0,0,0,0)', font: 'bold 78px "Songti SC", serif' }); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.0005, 0.03); group.add(l); return l; });

    // ================= 四个滴瓶和胶头滴管 =================
    // 滴瓶（kit 的 dropBottle）+ 竖着插在瓶里的滴管；标签贴在滴瓶上（字多时字号缩小，免得被裁掉）。滴管的原点在滴管尖。
    // ——dropper / follow / putBack 和 indicator、baseprop、acidprop 里的一样，建议进 kit
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
    const droppers = DR.map((D) => { const B = dropBottle(group, D.bottle); bottleLabel(B, D.name); return dropper(B, D.inside); });
    const drops = new Particles({ max: 60, geometry: new THREE.SphereGeometry(1, 6, 5), material: water2({ color: 0xbfd8e6, base: 0.6 }) }); group.add(drops.mesh);

    // ================= 氢氧化钙粉末（广口瓶，瓶塞盖着）和药匙 =================
    const jar = reagentBottle({ r: JAR_R, h: JAR_H, color: 0xf4f2ec }); jar.position.copy(JAR); group.add(jar);
    const jarCap = jar.children[2];
    const lid = bottleCap(group, jar, jarCap, { rest: new THREE.Vector3(JAR.x + 0.002, 0.004, JAR.z + 0.066) });      // 取粉末时瓶塞拔下来倒放在桌上（广口瓶前面），取完盖好
    const capOff = () => jarCap.parent !== jar && Math.hypot(jarCap.position.x - JAR.x, jarCap.position.z - JAR.z) > JAR_R + 0.008;      // 瓶塞已经从瓶口拿开了
    const jl = plateTxt('氢氧化钙', 0.02); jl.position.set(JAR.x - 0.004, 0.0004, JAR.z + 0.046); group.add(jl);
    const spoon = spatula({ color: 0xf4f2ec }); spoon.heap.visible = false; spoon.position.copy(SPOON_HOME); spoon.rotation.y = Math.PI / 2; group.add(spoon);
    const tipHeap = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xf4f2ec)); tipHeap.position.set(0.108, 0.0014, 0); tipHeap.scale.set(1.3, 0.7, 1); tipHeap.visible = false; spoon.add(tipHeap);      // 柄的那一端挑起的一点粉末
    const spoonPick = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 0.016), new THREE.MeshBasicMaterial({ visible: false })); spoonPick.position.x = 0.055; spoonPick.userData.pick = true; spoon.add(spoonPick);
    const TIP = new THREE.Vector3(0.112, 0, 0);

    const cards = XS.map((x, k) => { const c = tag('', 'cond'); c.px = [k === 2 ? 66 : k === 1 ? -66 : 0, -72]; return c; });

    // ================= 状态 =================
    const fresh = () => ({
      demo: false,
      cu: { cu: CU0, cuoh: 0, oh: 0, h: 0, vol: 2, settle: 0, shakeE: 0, offX: 0, lastX: null, naoh: 0, hcl: 0, maxPpt: 0 },
      ca: [0, 1].map(() => ({ sol: 0, aq: 0, h: 0, vol: 0, ind: 0, settle: 1, shakeE: 0, offX: 0, lastX: null, w1: 0, w2: 0, hcl: 0, shaken1: false, shaken2: false })),
      carry: DR.map(() => null), drip: 0, spoon: { carry: null, loaded: false }, anim: null, logged: {}, nearK: null, idle: 0,
    });
    S = fresh();
    const tubeState = (k) => (k ? S.ca[k - 1] : S.cu);

    // ---- 一滴滴进第 k 支试管 ----
    const dripInto = (i, k) => {
      const key = DR[i].key, T = tubeState(k);
      if (key === 'ph' && k === 0) return status('步骤 4 不用酚酞。');
      if (key === 'naoh' && k) return status('步骤 6 里不加氢氧化钠溶液。');
      if (k && T.sol + T.aq <= 0) return status(`试管${k === 1 ? '甲' : '乙'}里还没有东西：先用药匙的柄挑一点<b>氢氧化钙粉末</b>放进去，再加 1 mL 水。`);      // 先放粉末（试管要横放），再加水
      drops.spawn({ p: droppers[i].position.clone().add(new THREE.Vector3(0, -0.0015, 0)), v: new THREE.Vector3(0, -0.08, 0), size: 0.0012, life: 1.6, k });      // 从滴管尖滴下去
      if (key !== 'ph') T.vol = Math.min(6, T.vol + DROP);
      if (k === 0) {
        if (key === 'naoh') {
          let oh = OH_DROP; T.naoh++;
          const n = Math.min(T.h, oh); T.h -= n; oh -= n;
          const p = Math.min(T.cu, oh / 2); T.cu -= p; T.cuoh += p; oh -= 2 * p; T.oh += oh;      // 先和硫酸铜反应，生成氢氧化铜沉淀；多的氢氧化钠留在溶液里
          T.settle = 0; T.maxPpt = Math.max(T.maxPpt, T.cuoh);
        } else if (key === 'hcl') {
          let hh = H_DROP; T.hcl++;
          const n = Math.min(T.oh, hh); T.oh -= n; hh -= n; T.h += hh;        // 先中和多的氢氧化钠，剩下的再溶解沉淀（见每帧）
        }
      } else {
        if (key === 'water') { if (T.ind < 1) T.w1 += DROP; else T.w2 += DROP; }
        else if (key === 'hcl') { T.h += H_DROP; T.hcl += DROP; }
        else if (key === 'ph') T.ind = Math.min(6, T.ind + 1);
      }
      sfx.clink({ freq: 2600, gain: 0.012 });
    };

    // ================= 装粉末：试管横放，药匙送到试管底部，再把试管竖起来 =================
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
    const loadAt = (t) => { let a = 0; for (const [nm, d] of LOAD) { if (t < a + d) return [nm, ease((t - a) / d), t - a]; a += d; } return ['end', 1, 0]; };
    const HT = T_LEN / 2, AXIS = 0.1, WZ = 0.08;                     // 横放时试管的中心在 (x, AXIS, WZ)：拿到试管架前面，高过滴瓶
    const C0 = (k) => V3(XS[k], T_Y + HT, 0), C1 = (k) => V3(XS[k], 0.072 + HT, 0), C2 = (k) => V3(XS[k], 0.072 + HT, WZ), C3 = (k) => V3(XS[k], AXIS, WZ);
    const tubePose = (k, t) => {
      const [nm, u] = loadAt(t), L = (a, b) => a.lerp(b, u);
      switch (nm) {
        case 'clear': return [C0(k), 0];
        case 'lift': return [L(C0(k), C1(k)), 0];
        case 'fwd': return [L(C1(k), C2(k)), 0];
        case 'down': return [L(C2(k), C3(k)), 0];
        case 'tilt': return [C3(k), -Math.PI / 2 * u];
        case 'in': case 'push': case 'tip': case 'out': case 'away': return [C3(k), -Math.PI / 2];
        case 'up': return [C3(k), -Math.PI / 2 * (1 - u)];
        case 'rise': return [L(C3(k), C2(k)), 0];
        case 'back': return [L(C2(k), C1(k)), 0];
        case 'set': return [L(C1(k), C0(k)), 0];
        default: return [C0(k), 0];
      }
    };
    const setHolder = (tb, [C, th]) => { tb.holder.rotation.set(0, 0, th); tb.holder.position.set(C.x + HT * Math.sin(th), C.y - HT * Math.cos(th), C.z); };
    // 药匙（柄的那一端 TIP）在哪：移开（在管口外面等着）→ 管口 → 送到管底（挨着管壁下面一点）→ 翻一下 → 抽出来 → 移开
    const spoonPose = (k, t) => {
      const [nm, u] = loadAt(t), x = XS[k];
      const WAIT = V3(x + HT + 0.015, AXIS + 0.035, WZ), MOUTH = V3(x + HT + 0.006, AXIS - 0.0025, WZ), BOTTOM = V3(x - HT + 0.012, AXIS - 0.0025, WZ), AWAY = V3(x + HT + 0.025, AXIS + 0.02, WZ);
      if (nm === 'clear') return null;                                // 从手里的位置移到 WAIT（见每帧）
      if (['lift', 'fwd', 'down', 'tilt'].includes(nm)) return [WAIT, 0];
      if (nm === 'in') return [WAIT.lerp(MOUTH, u), 0];
      if (nm === 'push') return [MOUTH.lerp(BOTTOM, u), 0];
      if (nm === 'tip') return [BOTTOM, Math.sin(Math.PI * u) * 1.1];
      if (nm === 'out') return [BOTTOM.lerp(MOUTH, u), 0];
      if (nm === 'away') return [MOUTH.lerp(AWAY, u), 0];
      return undefined;                                               // 放开了：回到桌上
    };
    // ================= 操作 =================
    const A = {
      dDrag(i, p) { if (!p) return; S.carry[i] = p.clone(); },
      dDrop(i) { S.carry[i] = null; },
      spoonGrab(p) { A.spoonDrag(p); },
      spoonDrag(p) {
        if (!p || S.anim) return;
        const sp = S.spoon; sp.carry = p.clone();
        // 柄的那一端伸进广口瓶（瓶塞已经拿下来了），碰到粉末：挑起一点
        if (!sp.loaded && capOff() && Math.hypot(p.x - JAR.x, p.z - JAR.z) < JAR_R - 0.004 && p.y < 0.026) { sp.loaded = true; sfx.clink({ freq: 1800, gain: 0.02 }); }
      },
      spoonDrop() {
        const sp = S.spoon, p = sp.carry; sp.carry = null;
        if (!p || S.anim || !sp.loaded) return;
        // 挑着粉末，拿到了试管甲 / 乙口上方（试管里还没有水）：试管横放，药匙送到管底，再竖起来
        const k = [1, 2].find((kk) => Math.abs(p.x - XS[kk]) < 0.015 && Math.abs(p.z) < 0.02 && p.y > T_Y + T_LEN - 0.012 && p.y < T_Y + T_LEN + 0.04 && S.ca[kk - 1].vol < 0.02);
        if (k) { S.anim = { k: 'load', tube: k, t: 0, p0: spoon.position.clone(), r0: [spoon.rotation.x, spoon.rotation.y, spoon.rotation.z] }; }
      },
      shake(k, p) {
        if (!p || S.anim?.tube === k) return;
        const T = tubeState(k), last = T.lastX; T.lastX = p.x;
        if (last == null) return;
        T.shakeE = Math.min(1, T.shakeE + Math.min(0.5, Math.abs(p.x - last) * 22));
        T.offX = clamp(p.x - XS[k], -0.008, 0.008);
      },
      shakeEnd(k) { tubeState(k).lastX = null; },
      reset() {
        S = fresh(); drops.clear(); W?.tbl.clear();
        if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; }
        bar.undo('cu', 'cuhcl', 'ca1', 'ca2', 'why');
        status('全部重新摆好了，记录也清空了。');
      },
    };

    const drag = draggable(group, [
      ...DR.map((D, i) => ({ obj: droppers[i].pick, plane: 'xy', offset: 0, hint: `${D.name}：拖到试管口上方，按住——一滴一滴地滴`, onStart: (p) => A.dDrag(i, p), onDrag: (p) => A.dDrag(i, p), onEnd: () => A.dDrop(i) })),
      { obj: spoonPick, plane: 'xy', offset: -0.012, hint: () => (S.anim ? '' : S.spoon.loaded ? '拖到试管甲或乙的口上方，松手：试管横放，药匙送到试管底部' : '药匙：用柄的那一端伸进广口瓶，挑一点氢氧化钙粉末'), onStart: (p) => A.spoonGrab(p), onDrag: (p) => A.spoonDrag(p), onEnd: () => A.spoonDrop() },
      ...tubes.map((t, k) => ({ obj: t.pick, plane: 'xy', offset: 0, hint: '按住，左右来回拖：振荡', onStart: (p) => { tubeState(k).lastX = p ? p.x : null; }, onDrag: (p) => A.shake(k, p), onEnd: () => A.shakeEnd(k) })),
    ], { tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const overT = (k) => () => new THREE.Vector3(XS[k], HIGH, 0);
    const toJar = () => new THREE.Vector3(JAR.x, 0.022, JAR.z);                           // 柄的那一端伸进广口瓶，碰到粉末
    const toTube = (k) => () => new THREE.Vector3(XS[k], T_Y + T_LEN + 0.006, -0.012);       // 拿到试管口上方
    const wig = (k, t0, t1, dur) => act.wiggle(tubes[k].pick, { t0, t1, amp: 0.012, hz: 3, dur });
    // 演示：拿起滴管（竖直提出滴瓶，提到试管口那么高），依次移到 stops 里每支试管口上方，滴到 until() 为真再去下一支，最后松手插回滴瓶。
    //   走的是学生拖滴管的同一套处理函数；tMax 时还没滴够也松手
    const dripSeq = (i, stops, t0, tMax) => {
      const d = drag.items().find((x) => x.obj === droppers[i].pick), SPD = 0.16;      // 手移动的速度（米/秒）
      let st = null;
      return (k, dt) => {
        if (k < t0) { st = null; return; }
        if (st?.ended) return;
        if (!st) { const c = droppers[i].position.clone().add(new THREE.Vector3(0, 0.035, 0)); st = { p: c, pts: [droppers[i].B.position.clone().setY(HIGH), ...stops.map(([kk]) => overT(kk)())], j: 0 }; d.onStart?.(c.clone()); }
        const tgt = st.pts[st.j];
        st.p.add(tgt.clone().sub(st.p).clampLength(0, SPD * (dt || 1 / 30)));
        d.onDrag?.(st.p.clone(), st.p.clone());
        if (st.p.distanceTo(tgt) < 1e-5 && (st.j === 0 || stops[st.j - 1][1]())) { if (st.j + 1 < st.pts.length) st.j++; else { st.ended = true; d.onEnd?.(true); } }
        if (k >= tMax && !st.ended) { st.ended = true; d.onEnd?.(true); }
      };
    };
    // 演示：药匙从桌上拿起来，移到广口瓶上方等瓶塞拿开，柄的那一端伸进去挑一点粉末，提出来，拿到试管口上方松手（试管横放、药匙送到管底……）
    const scoopTo = (k, t0, t1) => act.path(spoonPick, [null, [new THREE.Vector3(JAR.x, 0.1, JAR.z), 0.05], [toJar(), 0.02], new THREE.Vector3(JAR.x, 0.125, JAR.z), new THREE.Vector3(XS[k] + 0.02, 0.135, -0.012), toTube(k)], { t0, t1, release: t1 + 0.005 });

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'cu', title: '滴氢氧化钠溶液', todo: '步骤 4：把<b>氢氧化钠溶液</b>的滴管拖到<b>硫酸铜溶液</b>那支试管口上方，按住，滴几滴。', target: () => (S.carry[0] ? null : droppers[0]) },
        { id: 'cuhcl', title: '再加稀盐酸', todo: '再把<b>稀盐酸</b>拖到这支试管口上方，按住滴加，振荡（左右拖试管）。看沉淀。', target: () => (S.carry[1] ? null : S.cu.h > 0.05 && S.cu.cuoh > 0.02 ? tubes[0] : droppers[1]) },
        { id: 'ca1', title: '氢氧化钙加水、滴酚酞', todo: '步骤 6：用药匙的柄挑一点<b>氢氧化钙粉末</b>，拖到试管口上方松手——试管横放，药匙送到试管底部，再把试管竖起来。甲、乙各放一次；再各加 1 mL <b>水</b>，振荡；再各滴两滴<b>酚酞溶液</b>。', target: () => ca1Target() },
        { id: 'ca2', title: '一支加水，一支加稀盐酸', todo: '再向一支试管加 1 mL <b>水</b>、另一支加 1 mL <b>稀盐酸</b>，都振荡。比较两支试管。', target: () => ca2Target() },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { drops.clear(); } }),
          shots: [
            { cap: '步骤 4：试管里是 2 mL 硫酸铜溶液。滴入几滴氢氧化钠溶液——生成蓝色沉淀。', dur: 6, cam: [[XS[0] - 0.01, 0.092, 0.01], [0.04, 0.25, 1], 0.31],
              during: dripSeq(0, [[0, () => S.cu.naoh >= 5]], 0.04, 0.95) },
            { cap: '再加入稀盐酸，振荡：蓝色沉淀溶解了，溶液又变成蓝色。', dur: 9, cam: [[XS[0] - 0.01, 0.092, 0.01], [0.04, 0.25, 1], 0.31],
              during: act.seq(dripSeq(1, [[0, () => S.cu.hcl >= 22]], 0.03, 0.64), wig(0, 0.68, 0.96, 9)) },
            { cap: '步骤 6：用药匙的柄挑一点氢氧化钙粉末。把试管横放，药匙送到试管底部，再把试管竖起来。试管甲、乙各放一次。', dur: 12, speed: 1.5, cam: [[0.05, 0.085, 0.035], [0.04, 0.25, 1], 0.42],
              during: act.seq(scoopTo(1, 0.01, 0.17), scoopTo(2, 0.48, 0.64)) },
            { cap: '各加入 1 mL 水，振荡：白色浑浊——氢氧化钙微溶于水。', dur: 10, speed: 1.6, cam: [[0.04, 0.092, 0.01], [0.04, 0.25, 1], 0.35],
              during: act.seq(dripSeq(3, [[1, () => S.ca[0].w1 >= 1], [2, () => S.ca[1].w1 >= 1]], 0.03, 0.8), wig(1, 0.82, 0.9, 12), wig(2, 0.91, 0.99, 12)) },
            { cap: '各滴入两滴酚酞溶液：都变红——溶解的那一点氢氧化钙使溶液显碱性。', dur: 5.5, cam: [[0.04, 0.092, 0.01], [0.04, 0.25, 1], 0.35],
              during: dripSeq(2, [[1, () => S.ca[0].ind >= 2], [2, () => S.ca[1].ind >= 2]], 0.04, 0.9) },
            { cap: '向试管甲加 1 mL 水、向试管乙加 1 mL 稀盐酸，振荡：甲还是浑浊、红色；乙变澄清，红色消失。', dur: 12, speed: 1.6, cam: [[0.04, 0.092, 0.01], [0.04, 0.25, 1], 0.35],
              during: act.seq(dripSeq(3, [[1, () => S.ca[0].w2 >= 1]], 0.03, 0.38), dripSeq(1, [[2, () => S.ca[1].hcl >= 1]], 0.4, 0.75), wig(1, 0.77, 0.86, 14), wig(2, 0.88, 0.98, 14)) },
            { cap: '氢氧化钙微溶于水，溶液显碱性，能和酸反应。演示完了，下面换你自己做。', dur: 4, cam: [[0.01, 0.07, 0], [0.04, 0.25, 1], 0.36] },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);
    function ca1Target() {
      if (S.spoon.carry || S.anim) return null;
      const i = S.ca.findIndex((o) => o.sol + o.aq <= 0); if (i >= 0) return spoon;
      if (S.ca.some((o) => o.w1 < 0.9)) return S.carry[3] ? null : droppers[3];
      const j = S.ca.findIndex((o) => !o.shaken1); if (j >= 0) return tubes[j + 1];
      return S.carry[2] ? null : droppers[2];
    }
    function ca2Target() {
      const wi = S.ca.findIndex((o) => o.w2 >= 0.9), hi = S.ca.findIndex((o) => o.hcl >= 0.9);
      if (wi < 0 && hi < 0) return S.carry[3] ? null : droppers[3];
      if (hi < 0) return S.carry[1] ? null : droppers[1];
      if (wi < 0) return S.carry[3] ? null : droppers[3];
      const j = S.ca.findIndex((o) => !o.shaken2); return j >= 0 ? tubes[j + 1] : null;
    }

    // ================= 每帧 =================
    const step = (h, t) => {
      // 滴管一直竖着：拿着时跟着手走，到了试管口上方（悬空，不伸进试管）才一滴一滴地滴；松手就插回原滴瓶
      const an = S.anim;
      if (an?.k === 'load') an.t += h;
      droppers.forEach((d, i) => {
        if (S.carry[i]) {
          const k = XS.findIndex((x, kk) => Math.abs(S.carry[i].x - x) < 0.011 && S.carry[i].y > T_Y + T_LEN - 0.01 && an?.tube !== kk);
          const to = k >= 0 ? overT(k)().add(new THREE.Vector3(tubeState(k).offX, 0, 0)) : S.carry[i];
          follow(d, to, 0.4);
          if (k >= 0) { near(k); S.idle = 0; if (d.position.distanceTo(to) < 0.003) { S.drip += h; if (S.drip > DR[i].per) { S.drip = 0; dripInto(i, k); } } }
          else S.drip = DR[i].per * 0.6;
        } else putBack(d, 0.25, HIGH);
      });
      drops.update(h, (p, d) => { p.p.addScaledVector(p.v, d); return p.p.y > T_Y + levelY(tubeState(p.k).vol); });
      // 药匙：拿着时柄的那一端（TIP）在手上，斜着往左下伸；装粉末时由下面的动画摆；放开了就回到桌上
      const sp = S.spoon;
      const rotTo = (rx, ry, rz, a) => { spoon.rotation.set(spoon.rotation.x + (rx - spoon.rotation.x) * a, spoon.rotation.y + (ry - spoon.rotation.y) * a, spoon.rotation.z + (rz - spoon.rotation.z) * a); };
      const tipAt = (p, a) => { spoon.updateMatrix(); spoon.position.lerp(p.clone().sub(TIP.clone().applyEuler(spoon.rotation)), a); };
      const sPose = an?.k === 'load' ? spoonPose(an.tube, an.t) : undefined;
      if (an?.k === 'load' && sPose !== undefined) {
        if (sPose === null) {                                    // 先移开：从手里的位置移到管口外面等着，转平
          const [, u] = loadAt(an.t), x = XS[an.tube];
          spoon.rotation.set(an.r0[0] * (1 - u), an.r0[1] + (Math.PI - an.r0[1]) * u, an.r0[2] * (1 - u));
          const tip0 = an.p0.clone().add(TIP.clone().applyEuler(new THREE.Euler(...an.r0))), tip = tip0.lerp(V3(x + HT + 0.015, AXIS + 0.035, WZ), u);
          tipAt(tip, 1);
        } else { spoon.rotation.set(sPose[1], Math.PI, 0); tipAt(sPose[0], 1); }
      } else if (sp.carry) {
        const p = sp.carry.clone(), dj = Math.hypot(p.x - JAR.x, p.z - JAR.z);
        if (dj < JAR_R + 0.012 && !capOff()) p.y = Math.max(p.y, JAR_H + 0.03);      // 瓶塞还没拿开：在瓶口上方等着
        if (dj < JAR_R) p.y = Math.max(p.y, 0.012);                                   // 不穿过瓶底
        rotTo(0, Math.PI, -SP_TILT, 0.25); tipAt(p, 0.45);
      } else {
        homeLift(spoon, SPOON_HOME, 0.25, 0.06);                                     // 先抬高过广口瓶，再平放回桌上
        rotTo(0, Math.PI / 2, 0, 0.25);
      }
      tipHeap.visible = sp.loaded;
      // 广口瓶的瓶塞：拿起药匙去挑粉末时拔下来倒放在桌上；挑完、药匙离开瓶口就盖好
      const tipW = spoon.position.clone().add(TIP.clone().applyEuler(spoon.rotation));
      lid.update(0.3, (!!sp.carry && !sp.loaded) || (Math.hypot(tipW.x - JAR.x, tipW.z - JAR.z) < JAR_R + 0.01 && tipW.y < JAR_H + 0.03));
      // 装粉末的动画：试管横放，药匙送到管底，翻一下，粉末留在管底；抽出药匙，试管竖起来，放回试管架
      if (an?.k === 'load') {
        const [nm, u] = loadAt(an.t), T = S.ca[an.tube - 1];
        if (nm === 'tip' && u >= 0.5 && !an.dep) { an.dep = true; sp.loaded = false; T.sol += CA_SCOOP; T.settle = 1; sfx.clink({ freq: 1800, gain: 0.015 }); }
        if (an.t >= LOAD_END) {
          S.anim = null;
          status(`试管${an.tube === 1 ? '甲' : '乙'}里放了一点<b>氢氧化钙粉末</b>（白色）。${S.ca.every((o) => o.sol + o.aq > 0) ? '两支都放好了。再用<b>水</b>的滴管各加 1 mL 水（按住滴，看卡片上的毫升数）。' : '另一支也放同样多。'}`);
        }
      }
      // 手里没有滴管、药匙了：过一会儿镜头退回去（振荡试管时不退）
      const busy = S.carry.some(Boolean) || sp.carry || [S.cu, ...S.ca].some((T) => T.shakeE > 0.1);
      S.idle = busy ? Math.min(0, S.idle) : (S.idle || 0) + h;
      if (S.idle > 1.2) far();

      // ---- 步骤 4：硫酸铜 + 氢氧化钠 → 氢氧化铜沉淀；再加盐酸，沉淀溶解 ----
      const C = S.cu;
      C.shakeE = Math.max(0, C.shakeE - h * 0.9);
      if (C.h > 0 && C.cuoh > 0) { const r = Math.min(C.cuoh, C.h / 2, C.cuoh * (0.35 + 3 * C.shakeE) * h + 0.004 * h); C.cuoh -= r; C.cu += r; C.h -= 2 * r; }
      C.settle = C.shakeE > 0.15 ? Math.max(0, C.settle - h * 2) : Math.min(1, C.settle + h * 0.05);        // 不振荡：絮状沉淀慢慢沉到管底（20 秒左右）
      // ---- 步骤 6：氢氧化钙溶解（微溶）、和盐酸反应 ----
      S.ca.forEach((T) => {
        T.shakeE = Math.max(0, T.shakeE - h * 0.9);
        const sat = CA_SAT * T.vol;
        if (T.sol > 0 && T.vol > 0.05 && T.aq < sat) { const d = Math.min(T.sol, (sat - T.aq) * Math.min(1, (0.05 + 2.5 * T.shakeE) * h)); T.sol -= d; T.aq += d; }
        if (T.h > 0 && T.aq > 0) { const n = Math.min(T.aq, T.h / 2); T.aq -= n; T.h -= 2 * n; }                    // 溶在水里的马上中和
        if (T.h > 0 && T.sol > 0) { const r = Math.min(T.sol, T.h / 2, T.sol * (0.12 + 3 * T.shakeE) * h + 0.002 * h); T.sol -= r; T.h -= 2 * r; }      // 没溶的固体直接和酸反应（振荡时快得多）
        T.settle = T.shakeE > 0.15 ? Math.max(0, T.settle - h * 2) : Math.min(1, T.settle + h * 0.04);
        if (T.shakeE > 0.5 && T.vol > 0.5) { if (T.ind < 1 || T.w2 + T.hcl < 0.5) T.shaken1 = true; else T.shaken2 = true; }
      });

      // ---- 画：液面高度、颜色、浑浊、沉在管底的东西 ----
      tubes.forEach((tb, k) => {
        const T = tubeState(k);
        tb.liq.setLevel(T.vol > 0.02 ? levelY(T.vol) : 0);
        if (S.anim?.k === 'load' && S.anim.tube === k) setHolder(tb, tubePose(k, S.anim.t));      // 装粉末：试管拿起来横放
        else { tb.holder.position.set(XS[k] + T.offX, T_Y, 0); tb.holder.rotation.z = -T.offX * 8; }
        T.offX *= Math.max(0, 1 - h * 6);
        tb.powder.rotation.z = -tb.holder.rotation.z;             // 管底的粉末一直平着（试管横放时堆在下面的管壁上）
        if (k === 0) {
          tb.liq.setColor(PALE.clone().lerp(CUSO4, clamp((T.cu / T.vol) / (CU0 / 2), 0, 1) * 0.95));
          const amt = clamp(T.cuoh / 0.3, 0, 1);
          tb.liq.setMilk(amt * (1 - T.settle * 0.85), CUOH, 0x8fc0f0); tb.setPowder(amt * T.settle > 0.03 ? 0.25 + 0.7 * amt * T.settle : 0, CUOH);      // 蓝色絮状沉淀
        } else {
          const red = T.ind >= 1 && T.aq > 0.0004 && T.h < 1e-6 ? clamp(T.ind / 2, 0, 1) : 0;
          tb.liq.setColor(PALE.clone().lerp(RED, red * 0.85));
          const amt = clamp(T.sol / 0.12, 0, 1);
          tb.liq.setMilk(amt * (1 - T.settle * 0.9), new THREE.Color(0xf7f6f1).lerp(RED, red * 0.45).getHex(), 0xffffff); tb.setPowder(amt * T.settle > 0.03 ? 0.2 + 0.6 * amt * T.settle : 0, 0xf4f2ec);
        }
        tb.liq.update(t);
      });

      // ---- 记录、步骤 ----
      if (!S.logged.cu && C.cuoh > 0.15) { S.logged.cu = true; done('cu'); log(['硫酸铜溶液 + 几滴氢氧化钠溶液', '生成<b>蓝色沉淀</b>', 'CuSO₄ + 2NaOH ══ Cu(OH)₂↓ + Na₂SO₄']); status('生成了<b>蓝色的絮状沉淀</b>（氢氧化铜）。再把<b>稀盐酸</b>拖到这支试管口上方滴加，振荡。'); }
      if (S.logged.cu && !S.logged.cuhcl && C.cuoh < 0.015 && C.hcl > 0) { S.logged.cuhcl = true; done('cuhcl'); log(['再加入稀盐酸，振荡', '蓝色沉淀<b>溶解</b>，溶液变成<b>蓝色</b>', 'Cu(OH)₂ + 2HCl ══ CuCl₂ + 2H₂O']); status('蓝色沉淀<b>溶解</b>了，溶液又是蓝色的。接着做步骤 6：两支试管甲、乙。'); }
      if (S.logged.cu && C.hcl > 0 && C.h <= 0 && C.oh > 0 && !S.logged.ohfirst) { S.logged.ohfirst = true; status('沉淀还没溶解：滴进去的稀盐酸先和<b>多出来的氢氧化钠</b>反应了。继续滴加。'); }
      S.ca.forEach((T, j) => {
        const nm = j ? '乙' : '甲';
        if (!S.logged['c1' + j] && T.sol + T.aq > 0 && T.w1 >= 0.9 && T.shaken1 && T.ind >= 2) {
          S.logged['c1' + j] = true; log([`试管${nm}：氢氧化钙 + 1 mL 水，振荡，滴两滴酚酞`, '<b>浑浊</b>，溶液变<b>红</b>', '氢氧化钙微溶于水，溶液显碱性']);
          if (S.logged.c10 && S.logged.c11) { done('ca1'); status('两支试管都是<b>浑浊</b>的、<b>红色</b>的。再向一支加 1 mL <b>水</b>，另一支加 1 mL <b>稀盐酸</b>，都振荡。'); }
        }
        if (S.logged['c1' + j] && !S.logged['w' + j] && T.w2 >= 0.9 && T.shaken2) { S.logged['w' + j] = true; log([`试管${nm}：再加 1 mL 水，振荡`, '还是<b>浑浊</b>、<b>红色</b>', '再加水也溶解得很少']); }
        if (S.logged['c1' + j] && !S.logged['a' + j] && T.hcl >= 0.9 && T.shaken2 && T.sol < 0.01) { S.logged['a' + j] = true; log([`试管${nm}：加 1 mL 稀盐酸，振荡`, '变<b>澄清</b>，红色<b>消失</b>', 'Ca(OH)₂ + 2HCl ══ CaCl₂ + 2H₂O']); }
      });
      if (!S.logged.ca2 && (S.logged.w0 || S.logged.w1) && (S.logged.a0 || S.logged.a1)) {
        S.logged.ca2 = true; done('ca2');
        if (!S.demo) { S.nearK = 'pair'; S.idle = -1e9; look([(XS[1] + XS[2]) / 2, T_Y + 0.03, 0], [0.04, 0.22, 1], 0.22, () => { S.nearK = null; }); }      // 凑近比一比两支试管
        status('比一比：加<b>水</b>的那支还是浑浊、红色；加<b>稀盐酸</b>的那支变澄清，红色消失了。回答左边的问题。');
        if (W && !S.demo) W.t1.open();
      }

      // ---- 卡片 ----
      cards[0].text(`<div class="cc"><div class="cc-t"><span class="cc-name">硫酸铜溶液</span>${C.cuoh > 0.05 ? '<span class="cc-res">蓝色沉淀</span>' : S.logged.cuhcl ? '<span class="cc-res">沉淀溶解</span>' : ''}</div><div class="cc-more"><div class="cc-obs"><small>滴了氢氧化钠溶液 ${C.naoh} 滴${C.hcl ? `，稀盐酸 ${C.hcl} 滴` : ''}</small></div></div></div>`).loc(group, XS[0], T_Y + T_LEN, 0).show(C.naoh > 0);
      S.ca.forEach((T, j) => {
        const cloudy = T.sol > 0.01, red = T.ind >= 1 && T.aq > 0.0004 && T.h < 1e-6;
        cards[j + 1].text(`<div class="cc"><div class="cc-t"><span class="cc-name">试管${j ? '乙' : '甲'}</span>${cloudy ? '<span class="cc-res">浑浊</span>' : T.sol + T.aq > 0 || T.hcl > 0 ? '<span class="cc-res">澄清</span>' : ''}</div><div class="cc-more"><div class="cc-obs"><small>水 ${(T.w1 + T.w2).toFixed(1)} mL${T.hcl ? ` · 稀盐酸 ${T.hcl.toFixed(1)} mL` : ''}${T.ind ? ` · 酚酞 ${T.ind} 滴${red ? '（红）' : '（无色）'}` : ''}</small></div></div></div>`)
          .loc(group, XS[j + 1], T_Y + T_LEN, 0).show((T.sol + T.aq > 0 || T.vol > 0.02) && S.anim?.tube !== j + 1);
      });
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.36, d: 0.12, h: 0.12 },
      view: { elev: 15, azim: -4, lookY: 0.4, frameMargin: 1.02 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = () => [...W.tbl.el.querySelectorAll('tbody tr')].map((tr) => `<div>${tr.children[0].innerHTML}：${tr.children[1].innerHTML}</div>`).join('');
        const t2 = think({ title: '想一想 · 问题与交流', ctx, status: (m) => ui.status(m),
          q: '通过步骤 6，可以验证氢氧化钙的哪些性质？',
          options: ['微溶于水；水溶液显碱性；能和酸反应', '易溶于水；水溶液显酸性', '难溶于水；不和酸反应'],
          wrong: ['看试管里：加了 1 mL 水、再加 1 mL 水，都还浑浊；酚酞变红说明溶液显碱性。', '加稀盐酸以后浑浊消失、红色褪去——它和盐酸反应了。'],
          ok: '对：大部分沉在下面——<b>微溶于水</b>；酚酞变红——水溶液<b>显碱性</b>；加盐酸变澄清、红色褪去——<b>能和酸反应</b>。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); } });
        const t1 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '步骤 4 里生成的蓝色沉淀是什么？加稀盐酸为什么溶解了？',
          options: ['氢氧化铜（一种碱）；它和盐酸反应，生成可溶的氯化铜和水', '铜；盐酸把铜溶解了', '硫酸钠；它能溶于水'],
          wrong: ['铜是红色的金属，而且铜不和稀盐酸反应。', '硫酸钠是生成的另一种物质，它溶在水里，看不见。'],
          ok: '对：CuSO₄ + 2NaOH ══ Cu(OH)₂↓ + Na₂SO₄；Cu(OH)₂ + 2HCl ══ CuCl₂ + 2H₂O。',
          onOk: () => t2.open() });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['做了什么', '现象', '说明']);
        const vary = h('details', { class: 'more' }, h('summary', {}, '换个条件再试'),
          h('p', { class: 'fineprint', html: '先“全部重来”：①步骤 4 里氢氧化钠溶液多滴一些（十几滴），再加稀盐酸——沉淀要多滴一会儿才开始溶解，为什么？②步骤 6 里加了水不振荡，粉末会怎样？' }));
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：硫酸铜溶液按约 5%、氢氧化钠溶液按约 10%、稀盐酸按约 1 mol/L 计，一滴约 0.05 mL；氢氧化钙一挑约 0.02 g，20 ℃ 时 1 mL 水只能溶解约 1.7 mg。溶解、沉降的快慢是示意。' });
        ui.controls.append(t1.el, t2.el, next, vary, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, t1, t2, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('实验活动 8（碱的部分）：左边一支试管里是 2 mL <b>硫酸铜溶液</b>（步骤 4）；右边试管甲、乙是空的（步骤 6），旁边是装<b>氢氧化钙粉末</b>的广口瓶（盖着瓶塞）和药匙；前面是四个滴瓶。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { bar.dispose(); drops.dispose(); for (const tb of tubes) tb.liq.dispose(); },
      debug: { get S() { return S; }, A, bar, picks: { naoh: droppers[0].pick, hcl: droppers[1].pick, ph: droppers[2].pick, water: droppers[3].pick, spoon: spoonPick, t0: tubes[0].pick, t1: tubes[1].pick, t2: tubes[2].pick },
        qa: (() => {
          const dripSteps = (i, k, wait, name) => [{ name: `拿起${name}`, hold: droppers[i].pick }, { name: `滴${name}`, run: () => A.dDrag(i, overT(k)()), wait }, { name: `放下${name}`, release: droppers[i].pick, wait: 0.3 }];
          // 拿起药匙 → 移到广口瓶上方（瓶塞拿下来）→ 柄的那一端伸进去挑粉末 → 提出来（瓶塞盖好）→ 拿到试管口上方松手：试管横放、药匙送到管底……
          const scoopSteps = (k, nm) => [
            { name: `拿起药匙（${nm}）`, hold: spoonPick },
            { name: `药匙到瓶口上方（${nm}）`, run: () => A.spoonDrag(new THREE.Vector3(JAR.x, 0.1, JAR.z)), wait: 1.2 },
            { name: `挑粉末（${nm}）`, run: () => A.spoonDrag(toJar()), wait: 0.6 },
            { name: `药匙提出来（${nm}）`, run: () => A.spoonDrag(new THREE.Vector3(JAR.x, 0.125, JAR.z)), wait: 0.8 },
            { name: `拿到试管${nm}口`, run: () => A.spoonDrag(toTube(k)()), wait: 0.6 },
            { name: `放进${nm}`, release: spoonPick, wait: LOAD_END + 1 },
          ];
          const shakeSteps = (k, name) => [{ name, run: () => { for (let j = 0; j < 8; j++) A.shake(k, new THREE.Vector3(XS[k] + (j % 2 ? 0.012 : -0.012), 0.07, 0)); A.shakeEnd(k); }, wait: 1.2 }];
          return qaFlow(drag, [
            ...dripSteps(0, 0, 2.6, '氢氧化钠溶液'),
            ...dripSteps(1, 0, 4.6, '稀盐酸'),
            ...shakeSteps(0, '振荡硫酸铜那支'),
            ...scoopSteps(1, '甲'), ...scoopSteps(2, '乙'),
            ...dripSteps(3, 1, 4.6, '水到甲'),
            ...dripSteps(3, 2, 4.6, '水到乙'),
            ...shakeSteps(1, '振荡甲'), ...shakeSteps(2, '振荡乙'),
            ...dripSteps(2, 1, 1.2, '酚酞到甲'),
            ...dripSteps(2, 2, 1.2, '酚酞到乙'),
            ...dripSteps(3, 1, 4.6, '再加水到甲'),
            ...dripSteps(1, 2, 4.6, '稀盐酸到乙'),
            ...shakeSteps(1, '振荡甲 2'), ...shakeSteps(2, '振荡乙 2'),
            { name: '答第一题', run: () => W.t1.el.querySelector('button').click() },
            { name: '答第二题', run: () => W.t2.el.querySelector('button').click() },
          ]);
        })() },
    };
  },
};
