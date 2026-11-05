// 实验活动3 二氧化碳的实验室制取与性质 · 1. 制取二氧化碳（课本第 154 页图 6-21；原理、装置见课题3 第 145–148 页）。
//
// 铁架台夹着试管，单孔橡胶塞连着导管，导管伸到集气瓶底部（向上排空气法）。
// 步骤（课本）：检查气密性 → 试管里放几小块石灰石 → 注入 15 mL 稀盐酸，立即塞紧 → 收集 → 验满（燃着的木条放在瓶口）
//   → 盖上玻璃片备用；另外把气体通入澄清石灰水检验（图 6-20）。
// 放石灰石（第 16 页）：把试管从铁夹上取下来横放，石灰石放在试管口，再把试管慢慢地竖立起来，让石灰石沿管壁缓缓滑到管底，放回铁夹上。
// 倒稀盐酸：量筒口挨着试管口倒。
// 化学：CaCO₃ + 2HCl → CaCl₂ + CO₂↑ + H₂O。15 mL 稀盐酸按约 2 mol/L 计 → 约 0.015 mol CO₂，室温下约 370 mL（石灰石过量）。
//   反应速率随盐酸消耗变慢（时间加快了 5 倍，界面上标明）。集气瓶按 60 mL 计。
// 看不见的东西：二氧化碳画成深灰色的点，空气是浅灰点加蓝点（氧气约 1/5）。二氧化碳比空气重：从瓶底一层层往上堆，把空气从瓶口挤出去；
//   瓶口朝下（向下排空气法）时，它从瓶口往下掉出去，怎么也收集不满。
// 验满：燃着的木条在瓶口，瓶口气体里的氧气少到一定程度就熄灭（近似）；伸进瓶里去“验满”，瓶下部先满了，木条会过早熄灭。
import * as THREE from 'three';
import { buttons, seg, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { stand, canvasTex } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { testTube, stopper, glassTube, rubberTube, gasJar, splint, chemBeaker, reagentBottle, tubeClamp, tubeRack, CHEM } from './kit/chem.js';
import { bubble2, water2, milky } from './kit/chemfx.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, demoActs } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked, hull } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const SPEED = 5;                       // 时间加快倍数
const V_JAR = 60;                      // mL
const CO2_TOTAL = 370;                 // mL
const TUBE = new THREE.Vector3(-0.15, 0.03, 0);     // 试管底部的位置（竖直夹在铁架台上）
const T_LEN = 0.15, T_R = 0.009;
const JAR = new THREE.Vector3(0.06, 0, 0), JR = 0.022, JH = 0.085;
const BEAKER = new THREE.Vector3(-0.02, 0, 0.07);   // 查气密性用的一杯水
const LIME = new THREE.Vector3(0.15, 0, 0.06);      // 澄清石灰水（试管）
const JOINT = new THREE.Vector3(0.0, 0.22, 0);      // 导管从橡胶塞出来、横过来以后的接口
const AIR_O2 = 0.21;
const DARK = 0x3d4350, LIGHT = 0xb9bec8, BLUE = 0x2f7fd8;
// 放石灰石时试管的样子：layK 0 夹在铁夹上 → 0.35 竖直提出铁夹（管底高过铁夹） → 1 横放（管口朝右；边倒下边往上、往右挪一点：不压在铁夹上方，高过乳胶管）
const LIFT = 0.12, LIFT2 = 0.05, LAY_X = 0.015, K_OUT = 0.35;
const CHIP_WALL = T_R - 0.0034 - 0.0004;           // 石灰石贴着管壁时离管轴多远（横放时贴着下面的管壁，在试管的局部 +x 一侧）
// 量筒：口在局部 y = 0.08，半径 0.009。倒的时候斜过来 POUR_TH，量筒口的下沿搭在试管口的边上（口挨着口）
const CYL_L = 0.08, POUR_TH = 1.75;
const POUR_LIP = new THREE.Vector3(TUBE.x + 0.0088, TUBE.y + T_LEN + 0.0006, 0);
const POUR_BASE = POUR_LIP.clone().sub(new THREE.Vector3(-0.0085 * Math.cos(POUR_TH) - CYL_L * Math.sin(POUR_TH), -0.0085 * Math.sin(POUR_TH) + CYL_L * Math.cos(POUR_TH), 0));
const ease3 = (x) => x * x * (3 - 2 * x);

export default {
  id: 'co2prep',
  fig: '图6-21',
  title: '二氧化碳的实验室制取',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '用集气瓶收集二氧化碳，导管口应该——',
    hint: '课本第 146 页“探究”：根据气体的密度、是否溶于水来选择收集方法。',
    options: ['伸到瓶口朝上的集气瓶底部（向上排空气法）', '伸进瓶口朝下的集气瓶里（向下排空气法）', '哪种都一样'],
    answer: 0,
  },
  need: '检查气密性，放石灰石、注入稀盐酸并塞紧，用向上排空气法收集一瓶二氧化碳并验满，再用澄清石灰水检验',
  conclusion: {
    crops: [{ page: 155, rect: [64, 66, 372, 196] }],
    quote: '实验室里可用石灰石（或大理石）与稀盐酸反应来制取二氧化碳。实验室里制取二氧化碳的装置，检验二氧化碳和证明二氧化碳是否集满的方法。实验室里制取气体的一般思路和方法。',
    formula: 'CaCO₃ + 2HCl ══ CaCl₂ + CO₂↑ + H₂O',
    why: '石灰石是块状固体、稀盐酸是液体，反应不需要加热，所以发生装置用试管（或锥形瓶）加带导管的橡胶塞，不用酒精灯。二氧化碳的密度比空气大，能溶于水，所以用<b>向上排空气法</b>收集：导管伸到集气瓶<b>底部</b>，二氧化碳从下往上把空气挤出去。<br>检验：把气体通入澄清石灰水，石灰水变浑浊。验满：把燃着的木条放在集气瓶<b>口</b>（不要伸进去），木条熄灭，说明已经集满。',
    src: '课本第 145–149 页 · 第六单元 课题3 二氧化碳的实验室制取；实验活动3（第 154 页）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null;
    const near = (v, d, dist) => { if (S.demo) return; S.near = true; look([v.x, v.y, v.z], d || [0.05, 0.25, 1], dist || 0.3, () => { S.near = false; }); };
    const far = () => { if (S.near) { S.near = false; back(); } };

    const sheetTex = canvasTex(512, 256, (g, W, H) => {
      const gr = g.createRadialGradient(W / 2, H / 2, H * 0.12, W / 2, H / 2, W * 0.5);
      gr.addColorStop(0, 'rgba(253,251,245,0.9)'); gr.addColorStop(0.62, 'rgba(253,251,245,0.82)'); gr.addColorStop(1, 'rgba(253,251,245,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    });
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.3), new THREE.MeshLambertMaterial({ map: sheetTex, transparent: true, depthWrite: false }));
    sheet.rotation.x = -Math.PI / 2; sheet.position.set(0, 0.0004, 0.03); sheet.receiveShadow = true; sheet.renderOrder = 1; sheet.raycast = () => {}; sheet.userData.noFrame = true;
    group.add(sheet);

    // ================= 铁架台、试管、橡胶塞、导管 =================
    const st = stand({ height: 0.3, baseW: 0.12, baseD: 0.07 });
    st.position.set(TUBE.x - 0.065, 0, -0.03); group.add(st);
    const arm = st.clamp(TUBE.y + 0.1, 0.086);         // 横杆一直伸到铁夹上（试管取下来时，铁夹还留在横杆上）
    const tube = testTube({ r: T_R, len: T_LEN }); tube.position.copy(TUBE); group.add(tube);
    const jaw = tubeClamp(T_R + 0.001); jaw.position.set(TUBE.x, TUBE.y + 0.1, 0); group.add(jaw);      // 铁夹固定在铁架台上，夹着试管的中上部
    const tubePick = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.11, 10), new THREE.MeshBasicMaterial({ visible: false })); tubePick.position.y = 0.055; tubePick.userData.pick = true; tube.add(tubePick);
    const MOUTH = TUBE.clone().add(new THREE.Vector3(0, T_LEN, 0));
    const plug = stopper({ r1: T_R - 0.0004, r2: T_R + 0.0016, h: 0.016 }); group.add(plug);
    const plugPick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.03, 10), new THREE.MeshBasicMaterial({ visible: false })); plugPick.position.y = 0.01; plugPick.userData.pick = true; plug.add(plugPick);
    const PLUG_TABLE = new THREE.Vector3(-0.065, 0, 0.06);        // 拔下来放在烧杯左边、量筒斜后方（原来在量筒正后方，从镜头看被量筒挡住，点不到）
    // 塞子上那截玻璃导管（跟着塞子走）
    const plugTube = glassTube([new THREE.Vector3(0, 0.006, 0), new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(0.012, 0.064, 0), new THREE.Vector3(0.05, 0.066, 0)]); plug.add(plugTube);
    // 石灰石（试管底）、稀盐酸（试管里的液面）、气泡
    const chips = new THREE.Group(); tube.add(chips);
    for (let i = 0; i < 5; i++) { const c = inked(new THREE.Mesh(new THREE.DodecahedronGeometry(0.0034, 0), paint(0xe4ddd0, { keep: true })), { width: 0.5 }); c.position.set((Math.random() - 0.5) * 0.008, 0.005 + i * 0.0035, (Math.random() - 0.5) * 0.006); c.userData.x0 = c.position.x; c.userData.z0 = c.position.z; c.rotation.set(i, i * 2, i * 3); c.visible = false; chips.add(c); }
    const acid = new THREE.Mesh(new THREE.CylinderGeometry(T_R - 0.0008, T_R - 0.0008, 1, 18), water2({ color: 0xdbe9ee, base: 0.38 })); acid.geometry.translate(0, 0.5, 0); acid.position.y = 0.0012; acid.scale.y = 0.0001; acid.visible = false; acid.renderOrder = 7; tube.add(acid);

    // 伸出去的那截导管（原点在导管口）：可以拖到水里、集气瓶底、石灰水里
    const endPiece = new THREE.Group(); group.add(endPiece);
    const endGlass = glassTube([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.15, 0), new THREE.Vector3(-0.006, 0.16, 0), new THREE.Vector3(-0.022, 0.162, 0)]);
    const endPick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.17, 8), new THREE.MeshBasicMaterial({ visible: false })); endPick.position.y = 0.085; endPick.userData.pick = true;
    endPiece.add(endGlass, endPick);
    const TIPS = { water: BEAKER.clone().add(new THREE.Vector3(0, 0.012, 0)), jar: JAR.clone().add(new THREE.Vector3(0.006, 0.008, 0)), jarDown: JAR.clone().add(new THREE.Vector3(0.006, 0.06, 0)), lime: LIME.clone().add(new THREE.Vector3(0, 0.012, 0)), air: new THREE.Vector3(0.03, 0.1, 0.05) };
    let hose = null, hoseKey = '';
    const rebuildHose = () => {
      group.updateMatrixWorld(true);
      const a = plug.localToWorld(new THREE.Vector3(0.05, 0.066, 0)).applyMatrix4(new THREE.Matrix4().copy(group.matrixWorld).invert());
      const b = endPiece.position.clone().add(new THREE.Vector3(-0.022, 0.162, 0));
      const key = [a, b].map((v) => v.toArray().map((x) => x.toFixed(4)).join()).join('|');
      if (key === hoseKey) return; hoseKey = key;
      if (hose) { group.remove(hose); hose.geometry.dispose(); }
      const mid = a.clone().lerp(b, 0.5); mid.y = Math.max(a.y, b.y) + 0.008;
      hose = rubberTube([a.clone().add(new THREE.Vector3(-0.004, 0, 0)), a.clone().add(new THREE.Vector3(0.012, 0, 0)), mid, b.clone().add(new THREE.Vector3(-0.012, 0, 0)), b.clone().add(new THREE.Vector3(0.004, 0, 0))]); group.add(hose);
    };

    // ================= 集气瓶、查气密性的一杯水、澄清石灰水 =================
    const jar = gasJar({ r: JR, h: JH }); jar.position.copy(JAR); group.add(jar);
    const bk = chemBeaker({ r: 0.026, h: 0.055, level: 0.035, color: CHEM.water, marks: false }); bk.position.copy(BEAKER); group.add(bk);
    const lime = testTube({ r: 0.009, len: 0.11 }); lime.position.copy(LIME); group.add(lime);
    const limeLiq = new THREE.Mesh(new THREE.CylinderGeometry(0.0082, 0.0082, 0.04, 18), water2({ color: 0xe6f0f2, base: 0.35 })); limeLiq.position.y = 0.021; limeLiq.renderOrder = 7; lime.add(limeLiq);
    const rack = tubeRack({ h: 0.075, r: 0.0105 }); rack.position.set(LIME.x, 0, LIME.z); group.add(rack);        // 镂空的架子：看得见石灰水变浑浊
    lime.position.y = 0.008;
    const limeMilk = milky(limeLiq);
    // 桌上：石灰石（盛在表面皿里）和镊子、量筒里的 15 mL 稀盐酸、燃着的木条
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.016, 0.004, 24), paint(0xe9edf0)); dish.position.set(-0.03, 0.002, 0.13); group.add(dish);
    for (let i = 0; i < 6; i++) { const c = inked(new THREE.Mesh(new THREE.DodecahedronGeometry(0.0034, 0), paint(0xe4ddd0, { keep: true })), { width: 0.5 }); c.position.set(-0.03 + (Math.random() - 0.5) * 0.02, 0.006, 0.13 + (Math.random() - 0.5) * 0.016); dish.parent.add(c); }
    const tweez = new THREE.Group(); const TW_HOME = new THREE.Vector3(0.0, 0.004, 0.14);
    const tw = inked(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.002, 0.004), paint(0x8a929e)), { width: 0.6 }); tw.position.x = 0.045; tweez.add(tw);
    const held = inked(new THREE.Mesh(new THREE.DodecahedronGeometry(0.0034, 0), paint(0xe4ddd0, { keep: true })), { width: 0.5 }); held.visible = false; tweez.add(held);
    const twPick = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.02), new THREE.MeshBasicMaterial({ visible: false })); twPick.position.x = 0.045; twPick.userData.pick = true; tweez.add(twPick);
    tweez.position.copy(TW_HOME); group.add(tweez);
    const cyl = new THREE.Group(); const CYL_HOME = new THREE.Vector3(-0.09, 0, 0.14);
    const cylGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.08, 18, 1, true), paint(0xeef6fa, { transparent: true, opacity: 0.4, depthWrite: false })); cylGlass.position.y = 0.04; cylGlass.renderOrder = 9;
    const cylFoot = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.017, 0.004, 18), paint(0xe9edf0)), { width: 0.6 }); cylFoot.position.y = 0.002;
    const cylLiq = new THREE.Mesh(new THREE.CylinderGeometry(0.0082, 0.0082, 1, 16), water2({ color: 0xdbe9ee, base: 0.38 })); cylLiq.geometry.translate(0, 0.5, 0); cylLiq.position.y = 0.004; cylLiq.scale.y = 0.05; cylLiq.renderOrder = 7;
    const cylPick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.09, 10), new THREE.MeshBasicMaterial({ visible: false })); cylPick.position.y = 0.045; cylPick.userData.pick = true;
    cyl.add(cylGlass, cylFoot, cylLiq, cylPick); cyl.position.copy(CYL_HOME); group.add(cyl);
    const stick = splint({ len: 0.11 }); const STICK_HOME = new THREE.Vector3(0.12, 0.006, 0.15);      // 平放时火星那一端朝左，木条朝右伸（不压住镊子）
    const stickPick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.02), new THREE.MeshBasicMaterial({ visible: false })); stickPick.position.y = 0.055; stickPick.userData.pick = true; stick.add(stickPick);
    stick.position.copy(STICK_HOME); stick.rotation.z = -Math.PI / 2; group.add(stick);      // 平放在桌上

    // ================= 气泡、气体小点 =================
    const bubs = new Particles({ max: 200, geometry: new THREE.SphereGeometry(1, 8, 6), material: bubble2() }); group.add(bubs.mesh);
    const limeBubs = new Particles({ max: 80, geometry: new THREE.SphereGeometry(1, 8, 6), material: bubble2({ color: 0x6f8797, white: 0.2 }) }); group.add(limeBubs.mesh); limeBubs.mesh.renderOrder = 9.8;      // 画在玻璃和浑浊的液体之后，不然被洗掉      // 石灰水是浅色的：气泡用深一点的边
    const dotTex = canvasTex(64, 64, (g, W) => { const gr = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,1)'); gr.addColorStop(0.75, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, W); });
    const darkP = new Particles({ max: 160, sprite: true, color: DARK }), lightP = new Particles({ max: 160, sprite: true, color: LIGHT }), blueP = new Particles({ max: 60, sprite: true, color: BLUE });
    for (const p of [darkP, lightP, blueP]) { p.mat.uniforms.map.value = dotTex; p.mesh.renderOrder = 10; group.add(p.mesh); }
    const N_JAR = 44;
    const jarDots = Array.from({ length: N_JAR }, (_, i) => ({ i, u: Math.sqrt(Math.random()) * 0.85, th: Math.random() * Math.PI * 2, rank: Math.random(), ph: Math.random() * 6, blue: i % 5 === 0, p: new THREE.Vector3(), size: 0.0036, alpha: 0.92, age: 0, life: 1e9 }));
    const falling = [];         // 向下排空气法：从瓶口掉出去的二氧化碳
    const drops = new Particles({ max: 60, geometry: new THREE.SphereGeometry(1, 6, 5), material: water2({ color: 0xdbe9ee, base: 0.5 }) }); group.add(drops.mesh);      // 从量筒口流进试管的稀盐酸
    chips.children.forEach((c) => { c.userData.y0 = c.position.y; });

    // ================= 卡片 =================
    const jarCard = tag('', 'cond'); jarCard.px = [96, -50];
    const limeCard = tag('', 'cond'); limeCard.px = [70, -40];

    // ================= 状态 =================
    const fresh = () => ({
      plug: 'in', chips: 0, acid: 0, acidLeft: 0, made: 0, lostOpen: 0, openT: 0, end: 'water', jarDown: false,
      hold: false, holdT: 0, sealBub: 0, sealWait: false, seal: '', suck: 0,
      x: 0, covered: false, lime: 0, limeGas: 0, test: null, splintIn: false, fullOK: false, demo: false, near: false, earlyOut: false,
      plugK: 0, pourV: 0, twHeld: false, cylHeld: false, stickCarry: null,      // 塞子拔出了多少（0 塞着 → 1 在桌上）、倒进去了多少盐酸（画面）；镊子、量筒、木条在不在手里
      lay: 0, layK: 0, loadLogged: false, twOut: false,          // 试管：要不要横放、横放到哪一步（见 LIFT）；镊子放完石灰石，先顺着试管抽出来
      chipUp: [0, 0, 0, 0, 0], chipDrop: [1, 1, 1, 1, 1],         // 每块石灰石：离管底还有多远（顺着管壁量）；刚放下时从镊子尖落到管壁上（0 → 1）
      cylP: null, cylGo: null, cylAuto: false,                    // 量筒：手在哪、竖着拿到哪；松手以后接着倒完
    });
    S = fresh();
    let W = null;
    const status = (m) => { if (!S.demo) W?.status(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const rate = () => (S.plug === 'in' || S.plug === 'out') && S.chips > 0 && S.acid > 0 ? 1.0 * S.acidLeft * SPEED : 0;      // mL/s：刚加盐酸时约 1 mL/s（真实时间），随盐酸消耗变慢

    const A = {
      plug() {
        if (S.plug === 'in') {
          if (S.acid > 0 && S.acidLeft > 0.05) return status('正在反应，不要拔塞子。');
          S.plug = 'out'; status(S.seal === 'ok' ? '拔出了橡胶塞。点一下<b>试管</b>，把它从铁夹上取下来<b>横放</b>。' : '拔出了橡胶塞。');
        } else {
          if (S.lay || S.layK > 0) return status('试管还没竖起来、放回铁夹上。');
          S.plug = 'in';
          if (S.acid > 0) { status(S.openT > 3 ? `塞紧了——不过注入盐酸以后过了 ${S.openT.toFixed(0)} 秒才塞，跑掉了一些二氧化碳。` : '注入盐酸后<b>立即</b>塞紧了橡胶塞。看试管里的现象。'); done('acid'); }
          else status('塞上了橡胶塞。');
        }
      },
      /** 试管从铁夹上取下来横放 / 慢慢竖起来放回铁夹上 */
      lay() {
        if (S.plug === 'in' || S.acid) return;
        if (S.layK > 0 && S.layK < 1) return;          // 正在横放 / 竖起来
        S.lay = S.lay ? 0 : 1;
        if (S.lay) status('把试管从铁夹上取下来，<b>横放</b>。用<b>镊子</b>夹几小块石灰石，放在<b>试管口</b>。');
        else status(S.chips ? '把试管<b>慢慢地竖起来</b>：石灰石沿着管壁缓缓地滑到试管底部。' : '把试管竖起来，放回了铁夹上。');
      },
      chip() {
        if (S.plug === 'in') return status('先拔出橡胶塞（点一下橡胶塞）。');
        if (!S.lay || S.layK < 1) return status('先把试管<b>横放</b>（点一下试管），再把石灰石放在试管口。');
        if (S.chips >= 5) return status('几小块就够了。');
        const i = S.chips++, k = S.chipUp.filter((u, j) => j < i && u > 0.03).length;      // 管口已经有几块了：这一块放在它们旁边
        S.chipUp[i] = T_LEN - 0.009 - 0.007 * k - chips.children[i].userData.y0; S.chipDrop[i] = 0;
        sfx.clink({ freq: 2200, gain: 0.04 });
        if (S.chips >= 3) status(`试管口放了 ${S.chips} 小块石灰石。点一下<b>试管</b>，把它<b>慢慢地竖起来</b>。`);
        else status(`放了 ${S.chips} 小块。再放几块。`);
      },
      pour() {
        if (S.plug === 'in') return status('先拔出橡胶塞。');
        if (S.lay || S.layK > 0) return status('试管还没竖起来、放回铁夹上。');
        if (!S.chips) return status('先放石灰石，再注入稀盐酸。');
        if (S.acid) return;
        S.acid = 15; S.acidLeft = 1; S.openT = 0;
        status('注入了 15 mL 稀盐酸：石灰石表面产生<b>大量气泡</b>。<b>立即</b>塞紧橡胶塞！（点一下橡胶塞或试管）');
      },
      hold(on) { if (S.acid) return; S.hold = on; if (on && S.seal !== 'ok' && S.plug === 'in') near(TIPS.water.clone().add(new THREE.Vector3(-0.04, 0.05, 0)), [0.1, 0.25, 1], 0.3); },
      moveEnd(where) {
        S.end = where;
        if (where === 'jar' && S.jarDown) S.end = 'jarDown';
        if (S.end === 'jar') { status('导管口伸到了集气瓶<b>底部</b>。看瓶里的灰点：二氧化碳从下往上堆。'); near(JAR.clone().add(new THREE.Vector3(0, JH * 0.5, 0)), [0.12, 0.2, 1], 0.3); }
        if (S.end === 'jarDown') status('导管伸进了瓶口朝下的集气瓶里——看二氧化碳往哪里去。');
        if (where === 'lime') { status('导管口伸进了澄清石灰水里。'); near(LIME.clone().add(new THREE.Vector3(0, 0.05, 0)), [0.1, 0.2, 1], 0.26); }
      },
      cover() {
        if (S.covered) return;
        if (S.x < 0.3) return status('瓶里的二氧化碳还很少，先收集。');
        S.covered = true; sfx.clink({ freq: 1800 });
        if (S.end === 'jar') S.end = 'air';
        done('cover'); status('用玻璃片盖住了集气瓶，正放在桌上备用（二氧化碳的密度比空气大）。最后，把导管口伸进<b>澄清石灰水</b>里检验。');
      },
      down(on) {
        if (S.x > 0.05 && !on) return;
        S.jarDown = on; S.x = 0; S.covered = false; S.fullOK = false;
        if (S.end === 'jar' || S.end === 'jarDown') S.end = on ? 'jarDown' : 'jar';
        status(on ? '换成了<b>瓶口朝下</b>的集气瓶（向下排空气法）。看二氧化碳会不会留在瓶里。' : '换回了瓶口朝上的集气瓶。');
      },
      reset() {
        S = fresh(); bubs.clear(); limeBubs.clear(); drops.clear(); falling.length = 0; stick.setState('none'); W?.tbl.clear(); far();
        if (W) { W.q1.hidden = true; W.q2.hidden = true; W.next.hidden = true; W.downSeg.set(0); }
        bar.undo('seal', 'load', 'acid', 'collect', 'full', 'cover', 'test', 'why');
        status('全部重新摆好了，记录也清空了。');
      },
    };

    // 试管现在的样子（layK 见 LIFT）：管底在哪、绕 z 转了多少；管口在哪
    const tubePose = (K) => { const u1 = ease3(clamp(K / K_OUT, 0, 1)), u2 = ease3(clamp((K - K_OUT) / (1 - K_OUT), 0, 1)); return { pos: new THREE.Vector3(TUBE.x + LAY_X * u2, TUBE.y + LIFT * u1 + LIFT2 * u2, 0), rz: -Math.PI / 2 * u2 }; };
    const mouthAt = (K) => { const q = tubePose(K); return q.pos.add(new THREE.Vector3(-Math.sin(q.rz) * T_LEN, Math.cos(q.rz) * T_LEN, 0)); };
    const mouthNow = () => mouthAt(S.layK);
    const MOUTH_FLAT = mouthAt(1);                                // 横放时的管口
    const tubeIn = () => !S.lay && S.layK === 0;                 // 试管夹在铁夹上
    // 量筒：拿到试管口上方、能倒的时候，斜过来倒；竖着拿着走的时候，在试管上方要高过试管口
    const CYL_AIM = MOUTH.clone().add(new THREE.Vector3(0.02, 0.01, 0));
    const canPour = () => S.plug === 'out' && S.chips > 0 && tubeIn() && (!S.acid || S.pourV < 15);
    const cylNear = () => !!S.cylP && S.cylP.distanceTo(CYL_AIM) < 0.05;
    const cylFloor = (x) => (Math.abs(x - MOUTH.x) < 0.03 ? MOUTH.y + 0.02 : 0);
    const drag = draggable(group, [
      { obj: tubePick, plane: 'xy', offset: 0, hint: () => (S.plug === 'out' && S.acid ? '点一下：塞紧橡胶塞' : S.acid ? '' : S.plug === 'out' ? (S.lay ? '点一下：慢慢竖起来，放回铁夹上' : '点一下：从铁夹上取下来，横放') : '按住：用手握住试管'),
        onStart: () => A.hold(true), onDrag: () => {}, onEnd: () => A.hold(false), onTap: () => { if (S.plug === 'out' && S.acid) A.plug(); else if (S.plug === 'out') A.lay(); } },      // 倒进盐酸以后：点一下试管就塞紧（不用去桌上找塞子）
      { obj: plugPick, plane: 'xy', offset: 0, hint: () => (S.plug === 'in' ? '点一下：拔出橡胶塞' : '点一下：塞紧橡胶塞'), onTap: () => A.plug(), onStart: () => {}, onDrag: () => {}, onEnd: () => {} },
      { obj: twPick, plane: 'xy', offset: 0, hint: '拖到试管口：放一小块石灰石', onStart: () => { held.visible = true; S.twHeld = true; },
        onDrag: (p) => { tweez.position.set(p.x - 0.045, Math.max(0.004, p.y), p.z); },          // 在试管所在的竖直面里拖：手抓的是把手中间（学生拖时 p.z = 0；演示里从桌上一路移过来）
        // 镊子尖（原点）到了管口、伸进了横放的管口，或者手里抓的地方到了管口，都算放进去了；松手后镊子先顺着试管抽出来，再滑回桌上
        onEnd: () => {
          const tip = tweez.position.clone(), grab = tip.clone().add(new THREE.Vector3(0.045, 0, 0)), M = mouthNow();
          const inMouth = S.layK === 1 && Math.abs(tip.y - M.y) < 0.012 && Math.abs(tip.z - M.z) < 0.012 && tip.x > M.x - 0.07 && tip.x < M.x + 0.015;
          if (inMouth || tip.distanceTo(M) < 0.03 || grab.distanceTo(M) < 0.03) A.chip();
          S.twOut = S.layK === 1 && (inMouth || tip.distanceTo(M) < 0.02);
          held.visible = false; S.twHeld = false; } },
      { obj: cylPick, plane: 'xy', offset: 0, hint: '拖到试管口：倒入稀盐酸', onStart: () => { S.cylHeld = true; S.cylAuto = false; S.cylP = null; S.cylGo = cyl.position.clone(); },
        onDrag: (p) => { S.cylP = p.clone(); S.cylGo = new THREE.Vector3(p.x, Math.max(cylFloor(p.x), p.y - 0.05), p.z); },      // 竖着拿着走（手抓在量筒中间）
        onEnd: () => {       // 在试管口上方松手：倒完再放回桌上；不能倒的时候说一声为什么
          const near = cylNear(); S.cylHeld = false; S.cylP = null; S.cylAuto = near && canPour();
          if (near && !S.cylAuto && !S.acid) A.pour(); } },
      { obj: endPick, plane: 'xy', offset: 0, hint: '拖动导管口：伸进水里 / 集气瓶底部 / 澄清石灰水里',
        onDrag: (p) => { S.dragTip = new THREE.Vector3(clamp(p.x, -0.06, 0.2), clamp(p.y - 0.06, 0.006, 0.12), p.z); },
        onEnd: () => { const p = S.dragTip; S.dragTip = null; if (!p) return; const d = (q) => Math.hypot(p.x - q.x, p.y - q.y); const near1 = Object.entries({ water: TIPS.water, jar: TIPS.jar, lime: TIPS.lime }).sort((a, b) => d(a[1]) - d(b[1]))[0]; A.moveEnd(d(near1[1]) < 0.05 ? near1[0] : 'air'); } },
      { obj: jar.pick, plane: 'xy', offset: 0, hint: () => (S.covered ? '' : '点一下：盖上玻璃片'), onTap: () => A.cover(), onStart: () => {}, onDrag: () => {}, onEnd: () => {} },
      { obj: stickPick, plane: 'xy', offset: 0, hint: '燃着的木条：拖到集气瓶口验满',
        onStart: () => { stick.setState('flame', 0.8); S.stickCarry = stick.position.clone(); },
        onDrag: (p) => { S.stickCarry = new THREE.Vector3(p.x, Math.max(0.03, p.y), p.z); },      // 木条跟着手走（每帧滑过去一半，拿起来时不跳）
        onEnd: () => {
          const c = S.stickCarry || stick.position; S.stickCarry = null;
          const tipX = c.x, tipY = c.y;
          const atMouth = Math.abs(tipX - JAR.x) < 0.03 && Math.abs(tipY - (JH + 0.006)) < 0.02, inside = Math.abs(tipX - JAR.x) < JR - 0.004 && tipY < JH - 0.005 && tipY > 0.01;
          if (atMouth || inside) S.test = { t: 0, mouth: atMouth, depth: inside ? tipY / JH : 1 };
          else stick.setState('none');
        } },
    ], { tip: tag('', 'pill') });

    // 演示：沿折线拖过去（先抬起来、再移过去、再放下；kit 的 act.drag 只走直线）。pts 里可以有函数（开始时取值）
    const dragPath = (obj, pts, o) => act.path(obj, pts, o);      // 沿几个点拿过去（kit/chemlesson.js 的 act.path）
    const act = demoActs(drag, group);
    const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
    const twGrab = () => tweez.position.clone().add(V(0.045, 0, 0));          // 镊子：手抓的地方（尖在它左边 4.5 cm）
    // 镊子：到表面皿里夹一小块石灰石，抬高，移到横放的试管口右边，顺着试管把石灰石送到管口里
    const chipTrip = (a) => dragPath(twPick, [twGrab, V(0.015, 0.008, 0.13), V(0.015, 0.2, 0.13), MOUTH_FLAT.clone().add(V(0.075, 0, 0)), MOUTH_FLAT.clone().add(V(0.039, 0, 0))], { t0: a, t1: a + 0.13, release: a + 0.14 });
    const tipGrab = () => endPiece.position.clone().add(V(0, 0.06, 0));      // 导管：手抓的地方（导管口往上 6 cm）

    // ================= 底部步骤栏 + 老师的演示 =================
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'seal', title: '检查气密性', todo: '导管口浸在水里。<b>按住试管</b>（用手握住），看导管口；再松开手看导管里。', target: () => (S.seal === 'ok' ? null : tube) },
        { id: 'load', title: '放石灰石', todo: '点<b>橡胶塞</b>拔出来；点<b>试管</b>，把它从铁夹上取下来<b>横放</b>；用<b>镊子</b>从表面皿里夹几小块石灰石，放在<b>试管口</b>；再点<b>试管</b>，把它<b>慢慢地竖起来</b>，放回铁夹上。',
          target: () => (S.loadLogged ? null : S.plug === 'in' ? plug : S.layK > 0 && S.layK < 1 ? null : !S.lay ? (S.chips >= 3 ? null : tube) : S.chips < 3 ? tweez : tube) },
        { id: 'acid', title: '注入盐酸，塞紧', todo: '把<b>量筒</b>里的 15 mL 稀盐酸倒进试管，然后<b>立即</b>点一下橡胶塞塞紧。', target: () => (!S.acid ? cyl : S.plug !== 'in' ? plug : null) },
        { id: 'collect', title: '向上排空气法收集', todo: '把<b>导管口</b>拖到集气瓶<b>底部</b>。看瓶里的灰点。', target: () => (S.end === 'jar' || S.end === 'jarDown' ? null : endPiece) },
        { id: 'full', title: '验满', todo: '把燃着的<b>木条</b>拖到集气瓶<b>口</b>（不要伸进去），木条熄灭说明集满了。', target: () => (S.test ? null : stick) },
        { id: 'cover', title: '盖上玻璃片', todo: '集满了：点一下<b>集气瓶</b>，盖上玻璃片备用。', target: () => (S.covered ? null : jar) },
        { id: 'test', title: '检验二氧化碳', todo: '把<b>导管口</b>拖进右边的<b>澄清石灰水</b>里，看看会怎样。', target: () => (S.end === 'lime' ? null : endPiece) },
        { id: 'why', title: '想一想', todo: '为什么用向上排空气法？验满时木条为什么放在瓶口？在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar,
            apply: () => { bubs.clear(); limeBubs.clear(); drops.clear(); falling.length = 0; stick.setState('none'); stick.position.copy(STICK_HOME); stick.rotation.z = -Math.PI / 2; } }),
          shots: [
            { cap: '先检查气密性：导管口浸在水里，手握试管，导管口冒出气泡。', dur: 3.2, cam: [[-0.07, 0.08, 0.03], [0.1, 0.25, 1], 0.4], during: act.hold(tubePick, 0.04, 0.55) },
            { cap: '拔出橡胶塞，把试管从铁夹上取下来横放，用镊子把几小块石灰石放在试管口。', dur: 9.5, cam: [[TUBE.x + 0.08, 0.15, 0.05], [0.1, 0.35, 1], 0.62], enter: () => { S.seal = 'ok'; },
              during: act.seq(act.tap(plugPick, 0.02), act.tap(tubePick, 0.09), chipTrip(0.32), chipTrip(0.52), chipTrip(0.72)) },
            { cap: '把试管慢慢地竖起来，石灰石沿着管壁缓缓地滑到管底；放回铁夹上，用量筒注入 15 mL 稀盐酸。', dur: 7.6, cam: [[TUBE.x + 0.06, 0.13, 0.05], [0.1, 0.35, 1], 0.58],
              during: act.seq(
                act.tap(tubePick, 0.02),
                // 量筒：竖着拿起来，移到试管口右上方，斜过来，量筒口挨着试管口倒（倒完再放回去）
                dragPath(cylPick, [() => cyl.position.clone().add(V(0, 0.05, 0)), V(CYL_HOME.x, 0.14, CYL_HOME.z), V(MOUTH.x + 0.06, 0.15, 0), V(MOUTH.x + 0.06, MOUTH.y + 0.02, 0)], { t0: 0.5, t1: 0.75, release: 0.77 })) },
            { cap: '立即塞紧橡胶塞：试管里产生大量气泡。', dur: 2.6, cam: [[TUBE.x, 0.08, 0], [0.1, 0.15, 1], 0.26], during: act.tap(plugPick, 0.08) },
            { cap: '导管口伸到集气瓶底部：二氧化碳比空气重，从下往上把空气挤出去。', dur: 4.4, cam: [[JAR.x, 0.05, 0], [0.12, 0.2, 1], 0.32], speed: 2,
              during: dragPath(endPick, [tipGrab, V(BEAKER.x, 0.14, BEAKER.z), V(TIPS.jar.x, JH + 0.08, 0), TIPS.jar.clone().add(V(0, 0.06, 0))], { t0: 0.02, t1: 0.3, release: 0.32 }) },
            { cap: '把燃着的木条放在瓶口：木条熄灭，说明集满了。', dur: 3.6, cam: [[JAR.x, 0.09, 0], [0.1, 0.25, 1], 0.28], speed: 2, enter: () => { S.x = Math.max(S.x, 0.92); },
              during: dragPath(stickPick, [STICK_HOME, V(STICK_HOME.x, 0.08, STICK_HOME.z), V(JAR.x + 0.012, JH + 0.03, 0), V(JAR.x, JH + 0.006, 0)], { t0: 0.03, t1: 0.4, release: 0.42 }) },
            { cap: '集满了：把导管从瓶里移开，盖上玻璃片，正放在桌上备用。', dur: 3.2, cam: [[JAR.x, 0.09, 0], [0.1, 0.25, 1], 0.3],
              during: act.seq(dragPath(endPick, [tipGrab, V(TIPS.jar.x, JH + 0.08, 0), TIPS.air.clone().add(V(0, 0.06, 0))], { t0: 0.04, t1: 0.4, release: 0.42 }), act.tap(jar.pick, 0.5)) },
            { cap: '把气体通入澄清石灰水——石灰水变浑浊：是二氧化碳。演示完了，下面换你自己做。', dur: 4.6, cam: [[LIME.x, 0.05, LIME.z], [0.1, 0.2, 1], 0.28],
              during: dragPath(endPick, [tipGrab, V(LIME.x, 0.18, LIME.z), TIPS.lime.clone().add(V(0, 0.06, 0))], { t0: 0.02, t1: 0.3, release: 0.32 }) },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ================= 每帧 =================
    const step = (h, t) => {
      // 塞子：点一下以后先竖直拔出管口，再画一道弧放到桌上（塞回去时反过来）
      S.plugK = clamp(S.plugK + clamp((S.plug === 'in' ? 0 : 1) - S.plugK, -h * 1.5, h * 1.5), 0, 1);
      { const K = S.plugK, IN = MOUTH.clone().add(new THREE.Vector3(0, -0.01, 0)), UP = IN.clone().add(new THREE.Vector3(0, 0.03, 0)), e = (x) => x * x * (3 - 2 * x);
        if (K < 0.3) plug.position.lerpVectors(IN, UP, e(K / 0.3));
        else { const u = e((K - 0.3) / 0.7); plug.position.lerpVectors(UP, PLUG_TABLE, u); plug.position.y += Math.sin(Math.PI * u) * 0.03; }
        plug.rotation.set(0, 0, 0); }
      // 试管：从铁夹上取下来横放（等塞子放到桌上以后），竖起来时慢慢地（石灰石沿管壁滑下去），再放回铁夹上
      { const v = S.lay ? 0.75 : S.layK > K_OUT ? 0.25 : 0.64;
        if (!S.lay || S.plugK > 0.95) S.layK = clamp(S.layK + clamp((S.lay ? 1 : 0) - S.layK, -h * v, h * v), 0, 1);
        const q = tubePose(S.layK); tube.position.copy(q.pos); tube.rotation.set(0, 0, q.rz); }
      // 镊子、量筒、木条：松手以后滑回桌上（镊子先顺着横放的试管抽出来）
      if (!S.twHeld) {
        const M = mouthNow();
        if (S.twOut && tweez.position.x < M.x + 0.012) tweez.position.lerp(new THREE.Vector3(M.x + 0.018, tweez.position.y, tweez.position.z), 0.3);
        else { S.twOut = false; tweez.position.lerp(TW_HOME, 0.2); }
      }
      // 量筒：竖着拿着走；拿到试管口上方（能倒的时候）斜过来，量筒口挨着试管口倒；倒完才放回桌上
      { const pouring = S.acid > 0 && S.pourV < 15;
        const aim = (S.cylAuto || (S.cylHeld && cylNear())) && canPour();
        if (aim) {
          cyl.position.lerp(POUR_BASE, 0.25); cyl.rotation.z += (POUR_TH - cyl.rotation.z) * 0.25;
          const there = cyl.position.distanceTo(POUR_BASE) < 0.002 && Math.abs(cyl.rotation.z - POUR_TH) < 0.04;
          if (there && !S.acid) A.pour();
          if (there && pouring && Math.random() < h * 40) { const r = cyl.rotation.z; drops.spawn({ p: cyl.position.clone().add(new THREE.Vector3(-0.0085 * Math.cos(r) - CYL_L * Math.sin(r), -0.0085 * Math.sin(r) + CYL_L * Math.cos(r), (Math.random() - 0.5) * 0.003)), v: new THREE.Vector3(-0.004, -0.02, 0), size: 0.0013, life: 1 }); }      // 从量筒口的下沿流进试管
        } else if (S.cylHeld && S.cylGo) { cyl.position.lerp(S.cylGo, 0.5); cyl.rotation.z *= 0.75; }
        else { cyl.position.lerp(CYL_HOME, 0.2); cyl.rotation.z *= 0.8; }
        if (S.cylAuto && (!aim || (S.acid && S.pourV >= 15))) S.cylAuto = false; }
      if (S.acid && S.pourV < 15) S.pourV = Math.min(15, S.pourV + h * 15);      // 倒进去约 1 秒
      drops.update(h, (p, d) => { p.v.y -= 0.8 * d; p.p.addScaledVector(p.v, d); p.p.x += (MOUTH.x - p.p.x) * Math.min(1, d * 6); return p.p.y > TUBE.y + 0.006 + 0.03 * (S.pourV / 15); });
      if (S.test) stick.rotation.z += (-0.6 - stick.rotation.z) * 0.2;
      else if (S.stickCarry) { stick.position.lerp(S.stickCarry, 0.45); stick.rotation.z += (-0.6 - stick.rotation.z) * 0.25; }
      else { stick.position.lerp(STICK_HOME, 0.2); stick.rotation.z += (-Math.PI / 2 - stick.rotation.z) * 0.2; }
      // 导管口
      const want = S.dragTip || (S.end === 'jarDown' ? TIPS.jarDown : TIPS[S.end] || TIPS.air);
      endPiece.position.lerp(want, S.dragTip ? 1 : 0.3);
      rebuildHose();
      // 集气瓶：正放 / 倒放（向下排空气法）；玻璃片
      jar.rotation.x = S.jarDown ? Math.PI : 0; jar.position.y = S.jarDown ? JH + 0.03 : 0;
      jar.plate.visible = S.covered || !S.jarDown; jar.plate.position.x += ((S.covered ? 0 : 0.022) - jar.plate.position.x) * 0.15; jar.setWater(0);      // 玻璃片推过去盖住瓶口
      // 试管里的东西。石灰石：放在横放的试管口；试管离水平超过约 12° 后，沿着管壁慢慢往下滑（越竖越快），滑到管底；横放时都贴着下面的管壁
      const tilt = Math.PI / 2 + tube.rotation.z;           // 0 横放，π/2 竖直
      chips.children.forEach((c, i) => {
        c.visible = i < S.chips; if (!c.visible) return;
        if (S.chipUp[i] > 0 && tilt > 0.21) S.chipUp[i] = Math.max(0, S.chipUp[i] - h * 0.09 * (Math.sin(tilt) - 0.2) / 0.8);
        S.chipDrop[i] = Math.min(1, S.chipDrop[i] + h * 6);          // 刚松开镊子：从镊子尖落到管壁上
        const { x0, y0, z0 } = c.userData, lie = Math.max(clamp(S.chipUp[i] / 0.008, 0, 1), Math.cos(tilt));
        c.position.set(x0 + (CHIP_WALL * S.chipDrop[i] - x0) * lie, y0 + S.chipUp[i], z0 * (1 - lie));
      });
      if (S.chips >= 3 && tubeIn() && S.chipUp.every((u) => u === 0) && !S.loadLogged) { S.loadLogged = true; done('load'); status('石灰石沿着管壁缓缓地滑到了<b>试管底部</b>，试管放回了铁夹上。现在把<b>量筒</b>里的 15 mL 稀盐酸倒进试管，然后<b>立即</b>塞紧。'); }
      acid.visible = S.acid > 0 && S.pourV > 0.2; acid.scale.y = Math.max(0.0001, 0.03 * Math.max(0.3, S.acidLeft) * (S.pourV / 15));
      cylLiq.visible = S.pourV < 14.8; cylLiq.scale.y = Math.max(0.0001, 0.05 * (1 - S.pourV / 15));
      // 气密性：握住试管，导管口在水里冒泡；松手后导管里形成一段水柱
      const sealed = S.plug === 'in';
      if (S.hold && sealed && S.end === 'water' && !S.acid) { S.holdT += h; if (S.holdT > 0.3 && Math.random() < h * 6) { bubs.spawn({ p: endPiece.position.clone(), v: new THREE.Vector3(0, 0.03, 0), size: 0.0018, life: 1.2 }); S.sealBub++; } }
      if (!S.hold && S.holdT > 0.4) { if (S.sealBub > 1 && S.seal !== 'ok') { S.sealWait = true; status('手握试管，导管口冒出了<b>气泡</b>。松开手——看导管口。'); } else if (S.seal !== 'ok') status(S.end !== 'water' ? '导管口要浸在水里，才能看出有没有气泡。' : '握的时间再长一点。'); S.holdT = 0; S.sealBub = 0; }
      if (S.sealWait) { S.suck = Math.min(1, S.suck + h * 0.8); if (S.suck > 0.6) { S.sealWait = false; S.seal = 'ok'; done('seal'); far(); status('松手后导管里形成了<b>一段水柱</b>——装置<b>不漏气</b>。现在点一下橡胶塞把它拔出来。'); } }
      // 反应：产生二氧化碳；没塞紧时从试管口跑掉
      const r = rate();
      if (r > 0) {
        const dm = r * h; S.made += dm; S.acidLeft = Math.max(0, S.acidLeft - dm / CO2_TOTAL);
        if (S.plug === 'out') { S.openT += h; S.lostOpen += dm; }
        else route(dm, h);
        if (Math.random() < h * 30 * S.acidLeft) bubs.spawn({ p: TUBE.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.008, 0.006 + Math.random() * 0.01, (Math.random() - 0.5) * 0.006)), v: new THREE.Vector3(0, 0.03, 0), size: 0.0009, life: 0.6, inTube: true });
      }
      bubs.update(h, (p, d) => { p.v.y += 0.2 * d; p.p.addScaledVector(p.v, d); return p.inTube ? p.p.y < TUBE.y + 0.03 * Math.max(0.3, S.acidLeft) + 0.002 : p.p.y < (p.lime ? LIME.y + 0.012 + 0.04 : BEAKER.y + 0.035); });
      // 验满（燃着的木条）
      if (S.test) {
        S.test.t += h;
        stick.position.lerp(S.test.mouth ? JAR.clone().add(new THREE.Vector3(0.01, JH + 0.004, 0)) : JAR.clone().add(new THREE.Vector3(0.004, JH * (S.test.depth ?? 0.5), 0)), 0.2);
        // 木条所在处的二氧化碳：瓶口要等快满了才多；瓶里下部早就满了
        const local = S.test.mouth ? clamp((S.x - 0.55) / 0.4, 0, 1) : clamp((S.x - (S.test.depth ?? 0.5) * 0.9) / 0.15, 0, 1);
        const o2 = AIR_O2 * (1 - local), out = o2 < 0.16;
        if (S.test.t > 0.8) {
          stick.setState(out ? 'ember' : 'flame', out ? 0.2 : 0.8);
          if (!S.test.logged) {
            S.test.logged = true;
            if (out && S.test.mouth) { S.fullOK = true; done('full'); status('燃着的木条放在集气瓶口，<b>熄灭</b>了——说明二氧化碳已经<b>集满</b>。点一下集气瓶，盖上玻璃片。'); W?.tbl.add(['燃着的木条放在瓶口', '<b>熄灭</b>', '集满了']); }
            else if (out && !S.test.mouth) { S.earlyOut = true; status(`木条伸进瓶里，熄灭了——可这只说明瓶<b>下部</b>有二氧化碳。看瓶里的灰点：上面还有不少空气（瓶里的二氧化碳约 ${Math.round(S.x * 100)}%）。验满要把木条放在<b>瓶口</b>。`); W?.tbl.add(['燃着的木条伸进瓶里', '熄灭', '<b>不能说明集满</b>（瓶下部先满）']); }
            else status(S.test.mouth ? '木条在瓶口照常燃烧——还没集满，再等一会儿。' : '木条在瓶里照常燃烧。');
          }
        }
        if (S.test.t > 3.2) { S.test = null; stick.setState('none'); }      // 拿开，滑回桌上
      }
      // 石灰水：通入二氧化碳后变浑浊（乳白色 + 白色小颗粒）
      limeMilk.set(S.lime); limeMilk.update(t);
      limeBubs.update(h, (p, d) => { p.v.y += 0.2 * d; p.p.addScaledVector(p.v, d); return p.p.y < lime.position.y + 0.021 + 0.02; });
      if (S.lime > 0.6 && !S.limeLogged) { S.limeLogged = true; done('test'); status('通入二氧化碳，澄清石灰水<b>变浑浊</b>了——这是检验二氧化碳的方法。'); W?.tbl.add(['把气体通入澄清石灰水', '<b>变浑浊</b>', '是二氧化碳']); maybeAsk(); }
      // 瓶里的气体小点：按“高度排名”分层——最低的 x 那部分是二氧化碳（深灰）
      const blue = [], dark = [], light = [];
      for (const d of jarDots) {
        const isCO2 = S.jarDown ? d.rank > 1 - S.x : d.rank < S.x;
        const yNorm = S.jarDown ? 1 - d.rank : d.rank;
        const y = JH * (0.06 + 0.86 * yNorm) + Math.sin(t * 0.7 + d.ph) * 0.002, rr = (JR - 0.004) * d.u, a = d.th + Math.sin(t * 0.4 + d.ph) * 0.12;
        d.p.set(JAR.x + Math.cos(a) * rr, (S.jarDown ? JH + 0.03 - y : y), JAR.z + Math.sin(a) * rr);
        (isCO2 ? dark : d.blue ? blue : light).push(d);
      }
      for (let i = falling.length - 1; i >= 0; i--) { const d = falling[i]; d.age += h; d.p.y -= h * 0.05; d.alpha = Math.max(0, 0.9 - d.age * 0.5); if (d.p.y < 0.002 || d.age > 1.8) falling.splice(i, 1); else dark.push(d); }
      darkP.list = dark; lightP.list = light; blueP.list = blue;
      for (const p of [darkP, lightP, blueP]) p.update(0, () => true);
      // 卡片
      const pct = Math.round(S.x * 100);
      jarCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">集气瓶里</span>${S.covered ? '<span class="cc-res">盖好了</span>' : ''}</div><div class="cc-more"><div class="cc-obs"><span class="o2-read"><i style="width:${pct}%;background:#3d4350"></i></span><b style="color:#3d4350">${pct}%</b><small>二氧化碳（模型）</small></div></div></div>`).loc(group, JAR.x, S.jarDown ? 0.03 : JH, 0).show(S.x > 0.01 || S.end === 'jar' || S.end === 'jarDown');
      limeCard.text(S.lime > 0.05 ? `<div class="cc"><div class="cc-t"><span class="cc-name">澄清石灰水</span>${S.lime > 0.6 ? '<span class="cc-res burn">变浑浊</span>' : ''}</div></div>` : '').loc(group, LIME.x, 0.12, LIME.z).show(S.lime > 0.05);
      bar.near(S.near);
    };
    // 生成的二氧化碳从导管口出去以后去哪儿
    const route = (dm, h) => {
      const e = endPiece.position;
      if (S.end === 'water') { if (Math.random() < h * 20) bubs.spawn({ p: e.clone(), v: new THREE.Vector3(0, 0.03, 0), size: 0.0016, life: 1.2 }); }
      else if (S.end === 'jar' && !S.covered) { S.x = Math.min(0.99, S.x + (dm / V_JAR) * (1 - S.x * 0.9)); if (S.x > 0.05 && !S.collLogged) { S.collLogged = true; done('collect'); } }
      else if (S.end === 'jarDown') {
        S.x = Math.min(0.12, S.x + (dm / V_JAR) * 0.05);            // 二氧化碳比空气重：从朝下的瓶口掉出去，瓶里留不住
        if (Math.random() < h * 12) falling.push({ p: new THREE.Vector3(JAR.x + (Math.random() - 0.5) * 0.02, 0.028, (Math.random() - 0.5) * 0.02), size: 0.0036, alpha: 0.9, age: 0, life: 9 });
        if (!S.downLogged && S.made > 40) { S.downLogged = true; status('瓶口朝下：二氧化碳从瓶口<b>往下掉了出去</b>（看灰点），瓶里怎么也收集不满。二氧化碳的密度比空气<b>大</b>，要用<b>向上</b>排空气法。'); W?.tbl.add(['向下排空气法（瓶口朝下）', '二氧化碳从瓶口掉出去', '<b>收集不满</b>']); }
      } else if (S.end === 'lime') { S.lime = Math.min(1, S.lime + dm * 0.08); if (Math.random() < h * 16) limeBubs.spawn({ p: e.clone(), v: new THREE.Vector3(0, 0.03, 0), size: 0.0018, life: 1.2 }); }
      if (S.end === 'jar' && S.x > 0.6 && !S.fullHint && !S.fullOK) { S.fullHint = true; far(); status('瓶里的二氧化碳越来越多了。拿起燃着的<b>木条</b>，放在<b>瓶口</b>验满。'); }      // 退回全景：木条和瓶口都在画面里
    };
    const maybeAsk = () => { if (W && bar.has('collect') && bar.has('test') && W.q1.hidden && !bar.has('why')) { W.q1.hidden = false; far(); status('看看下面的问题。'); } };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.56, d: 0.22, h: 0.3 },
      view: { elev: 18, azim: -6, lookY: 0.45, frameMargin: 1.04 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const mk = (q, ctxHtml, opts, ok, wrong, after) => {
          const btns = buttons(opts.map((t, j) => ({ text: t, ghost: true, onClick: () => { if (j) return status(wrong[j - 1]); box.hidden = true; status(ok); after(); } })));
          btns.el.dataset.keep = '1';
          const box = h('div', { class: 'think', hidden: true }, h('div', { class: 'think-t' }, '想一想'), ctxHtml ? h('div', { class: 'sum-ctx', html: ctxHtml }) : null, h('p', { class: 'think-q', html: q }), btns.el);
          return box;
        };
        const q2 = mk('验满时，燃着的木条为什么要放在集气瓶<b>口</b>，而不是伸进瓶里？', '', ['二氧化碳从瓶底往上堆：瓶口的气体变成二氧化碳，才说明整瓶都满了', '伸进瓶里木条会烧坏集气瓶', '放在瓶口能看得更清楚'],
          '对。伸进瓶里，瓶下部先满，木条熄灭了也不能说明整瓶集满。可以掀开结论看看。', ['不是这个原因。看瓶里的灰点是怎么堆起来的。', '不是这个原因。看瓶里的灰点是怎么堆起来的。'], () => { next.hidden = false; done('why'); });
        const q1 = mk('收集二氧化碳为什么用<b>向上</b>排空气法？', '<div>二氧化碳：密度比空气大；能溶于水</div><div>看瓶里的深灰点（二氧化碳）：从瓶底往上堆</div>', ['二氧化碳的密度比空气大，会沉在瓶底，把空气从上面挤出去', '二氧化碳比空气轻', '二氧化碳不溶于水'],
          '对：二氧化碳的密度比空气大，所以导管要伸到瓶底，用向上排空气法；它能溶于水，所以一般不用排水法。', ['比空气轻的气体，才用向下排空气法。可以在“换个条件再试”里试试瓶口朝下。', '二氧化碳能溶于水（还能和水反应），所以一般不用排水法收集。'], () => { q2.hidden = false; });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['做了什么', '现象', '说明']);
        const downSeg = seg('', ['瓶口朝上（向上排空气法）', '瓶口朝下（向下排空气法）'], (_, k) => A.down(!!k));
        const vary = h('details', { class: 'more' }, h('summary', {}, '换个条件再试'), h('p', { class: 'fineprint' }, '换成瓶口朝下的集气瓶（向下排空气法），能收集到二氧化碳吗？也可以试试把燃着的木条伸进瓶里去“验满”。'), downSeg.el);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'),
          buttons([
            { text: '手握试管（检查气密性）', ghost: true, onClick: () => { A.hold(true); setTimeout(() => A.hold(false), 1400); } },
            { text: '拔出 / 塞紧橡胶塞', ghost: true, onClick: () => A.plug() },
            { text: '试管横放 / 慢慢竖起来', ghost: true, onClick: () => A.lay() },
            { text: '放一小块石灰石', ghost: true, onClick: () => A.chip() },
            { text: '注入 15 mL 稀盐酸', ghost: true, onClick: () => A.pour() },
            { text: '导管口伸到集气瓶底部', ghost: true, onClick: () => A.moveEnd('jar') },
            { text: '燃着的木条放在瓶口', ghost: true, onClick: () => { stick.setState('flame', 0.8); S.test = { t: 0, mouth: true }; } },
            { text: '盖上玻璃片', ghost: true, onClick: () => A.cover() },
            { text: '导管口伸进澄清石灰水', ghost: true, onClick: () => A.moveEnd('lime') },
          ]).el,
          buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：时间加快 5 倍；15 mL 稀盐酸按约 2 mol/L 计，约产生 370 mL 二氧化碳；集气瓶按 60 mL 计；瓶里二氧化碳约占多少是模型估计；木条熄灭的条件取近似值。' });
        ui.controls.append(q1, q2, next, vary, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, q1, q2, next, downSeg, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('图 6-21 的装置：试管夹在铁架台上，导管口现在浸在一杯水里。可以先看<b>老师演示</b>，也可以直接动手。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); stick.update(t); },
      dispose() { bar.dispose(); bubs.dispose(); limeBubs.dispose(); drops.dispose(); darkP.dispose(); lightP.dispose(); blueP.dispose(); },
      debug: { get S() { return S; }, A, bar, tweez, MOUTH, picks: { tube: tubePick, plug: plugPick, tweez: twPick, cyl: cylPick, end: endPick, jar: jar.pick, stick: stickPick },
        // tools/qa.mjs --flow：从头做到尾（和学生用鼠标走的是同一套拖放处理）
        qa: qaFlow(drag, [
          { name: '握住试管', hold: tubePick, wait: 2 }, { name: '松手', release: tubePick, wait: 2.5 },
          { name: '拔塞子', tap: plugPick },
          { name: '试管横放', tap: tubePick, wait: 2.5 },
          ...[1, 2, 3].map((i) => ({ name: `放第 ${i} 块石灰石`, drag: twPick, to: () => MOUTH_FLAT.clone().add(new THREE.Vector3(0.039, 0, 0)), wait: 0.8 })),      // 手抓在镊子尖右边 4.5 cm：镊子尖伸进管口 6 mm
          { name: '试管竖起来', tap: tubePick, wait: 5 },
          { name: '倒盐酸', drag: cylPick, to: () => CYL_AIM.clone(), wait: 2 },
          { name: '塞紧', tap: plugPick },
          { name: '导管伸到瓶底', drag: endPick, to: () => TIPS.jar.clone().add(new THREE.Vector3(0, 0.06, 0)), wait: 40 },
          { name: '木条放在瓶口', drag: stickPick, to: () => new THREE.Vector3(JAR.x, JH + 0.006, 0), wait: 3 },
          { name: '盖玻璃片', tap: jar.pick },
          { name: '导管伸进石灰水', drag: endPick, to: () => TIPS.lime.clone().add(new THREE.Vector3(0, 0.06, 0)), wait: 12 },
          { name: '答第一题', run: () => W.q1.querySelector('button').click() },
          { name: '答第二题', run: () => W.q2.querySelector('button').click() },
        ]) },
    };
  },
};
