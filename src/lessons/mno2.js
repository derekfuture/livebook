// 课题3 制取氧气 · 探究 过氧化氢分解制取氧气的反应中二氧化锰的作用（课本第 44–46 页，图 2-16）。
//
// 试管竖放在试管架上。左边电子天平上的表面皿里是称好的 0.50 g 二氧化锰（药匙去取），右边是量好 5 mL 5% 过氧化氢溶液的量筒、
// 一根带火星的木条（旁边一盏酒精灯：木条用过以后自动“点燃、吹灭”，又带上火星）。
// 步骤（课本）：（1）试管里加 5 mL 5% 过氧化氢溶液，插入带火星的木条 →（2）加少量二氧化锰，插入带火星的木条
//   →（3）没有现象时重新加过氧化氢溶液、插入木条；又没有现象时再重复。提示：仔细观察反应前后的二氧化锰。
// 化学：2H₂O₂ ══ 2H₂O + O₂↑。5 mL 5% 过氧化氢溶液（按密度约 1 g/mL）含过氧化氢约 0.25 g = 7.35 mmol → 最多 3.7 mmol 氧气，
//   20 ℃ 时约 88 mL。有二氧化锰：按一级反应 k = 0.1 /s（真实时间，半衰期约 7 s），几十秒内放完；没有二氧化锰：常温下几乎不分解。
//   重新加入过氧化氢后，速率按和第一次差不多处理（溶液变稀会慢些、上一次放热使溶液变热会快些，界面上写明）。时间加快 3 倍。
// 看不见的东西：氧气画成蓝点。试管上部的气体：空气里每 5 个点约 1 个蓝点；氧气放出来，把上部的空气从管口挤出去，蓝点越来越多。
//   带火星的木条按木条火星所在处的氧气浓度判断：≥ 45% 复燃（近似，同氧气的制取、氧气的性质两课）。
// 二氧化锰：黑色粉末，冒泡时被搅起来（液体发灰黑），没有现象时又沉回管底，一直是那么多；反应后滤出、洗净、干燥再称——质量不变。
import * as THREE from 'three';
import { buttons, chart } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { canvasTex } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { testTube, splint, spatula, reagentBottle, chemLamp } from './kit/chem.js';
import { bubble2, water2, glass2 } from './kit/chemfx.js';
import { microWorld, mno2Scene } from './kit/microworld.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, think, mountXuean, moreBox, varyBox, paperSheet, demoActs } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const V = THREE.Vector3;
const SPEED = 3;                                   // 时间加快倍数
const ADD_ML = 5, N_ADD = (0.25 / 34.01) * 1000;  // 每次加 5 mL；过氧化氢 mmol
const VM = 24.0;                                   // 20 ℃、101 kPa 下 1 mmol 气体约 24 mL
const O2_MAX = (N_ADD / 2) * VM;                   // ≈ 88 mL
const K_CAT = 0.1, K_UN = 1e-7;                    // /s（真实时间）
const KD = 0.04;                                   // 没有气流时，管里的气体和外面空气慢慢混匀（/s，近似）
const QUIET = 0.25;                                // mL/s：比这少就看不出气泡了（“没有现象”）
const AIR = 0.21, RELIGHT = 0.45, BRIGHT = 0.35;
const MNO2_G = 0.5;
const MAX_POURS = 4;
const SP_YAW = -1.0;                               // 拿着药匙时勺柄朝右前方
// 试管（竖放在试管架上）
const TX = -0.02, TB = 0.0085, TR = 0.0085, TL = 0.15, WALL = 0.0008;
const MY = TB + TL;
const MOUTH = new V(TX, MY, 0);
// 电子天平 + 表面皿（二氧化锰）
const BAL = new V(-0.13, 0, 0), PAN_Y = 0.0225;
const DISH = new V(BAL.x, PAN_Y + 0.004, 0);
const LAMP = new V(0.15, 0, -0.03);
const BOTTLE = new V(0.09, 0, -0.06);
const HOME = { stick: new V(0.17, 0.004, 0.115), cyl: new V(0.05, 0, 0.065), sp: new V(-0.125, 0.0048, 0.09) };
const CYL_R = 0.0068, CYL_H = 0.09, CYL_LIQ = (ADD_ML * 1e-6) / (Math.PI * (CYL_R - 0.0008) ** 2);
const BLUE = 0x2f7fd8, LIGHT = 0xb9bec8, MN = 0x1d1d20;
const LABS = { '1': '（1）', '2': '（2）', '3-1': '（3）', '3-2': '（3）再重复', '3-3': '（3）又一次', again: '再用一次' };
const COLORS = { '1': '#9aa1ad', '2': '#2f7fd8', '3-1': '#159a86', '3-2': '#d98a1c', '3-3': '#8a5cc8', again: '#c0392b' };

// 试管里液体的体积（mL）↔ 液面高度（从管内底算起，米）
const capV = (hh) => { const r = TR; return (hh <= r ? (Math.PI * hh * hh * (3 * r - hh)) / 3 : (2 / 3) * Math.PI * r ** 3 + Math.PI * r * r * (hh - r)) * 1e6; };
const TUBE_V = capV(TL - WALL - 0.002);           // 约 33 mL
const levelOf = (v) => { if (v <= 0) return 0; let a = 0, b = TL; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (capV(m) < v) a = m; else b = m; } return (a + b) / 2; };

export default {
  id: 'mno2',
  fig: '图2-16',
  title: '二氧化锰的作用',
  stampText: '探究',
  style: 'paper',
  predict: {
    q: '过氧化氢溶液里加了少量二氧化锰，放出大量氧气。等反应停了，<b>不再加二氧化锰</b>，只重新加入过氧化氢溶液——',
    hint: '课本第 44–45 页“探究”：过氧化氢分解制取氧气的反应中二氧化锰的作用',
    options: ['又放出大量氧气，和第一次差不多快', '也放出氧气，但慢得多——二氧化锰用掉了一部分', '不再放出氧气——二氧化锰已经用完了'],
    answer: 0,
  },
  need: '做实验（1）（2）（3）：只有过氧化氢溶液时、加入二氧化锰后、重新加入过氧化氢溶液时，分别插入带火星的木条，再想一想',
  conclusion: {
    crops: [{ page: 52, rect: [185, 51, 455, 206] }, { page: 52, rect: [44, 218, 455, 365] }],
    quote: '在实验（1）中，带有火星的木条不能复燃，是因为过氧化氢在常温下分解缓慢，在较短时间内放出的氧气很少。在实验（2）中，木条复燃，是因为向过氧化氢溶液中加入少量二氧化锰使过氧化氢分解加速。在实验（3）中，实验重复多次，每次只消耗了过氧化氢，二氧化锰好像永远用不完。这种在化学反应里能改变其他物质的化学反应速率，而本身的质量和化学性质在反应前后都没有发生变化的物质叫作催化剂。',
    formula: '过氧化氢 <span style="font-size:.8em">二氧化锰</span>→ 水 + 氧气',
    why: '过氧化氢在常温下也会分解，但很慢：实验（1）里试管上部几乎还是空气，木条不复燃。加入二氧化锰，过氧化氢<b>分解加速</b>，很快放出大量氧气，把试管上部的空气挤出去，木条复燃。实验（3）里没有再加二氧化锰，每次重新加入过氧化氢溶液，都又放出大量氧气——每次消耗的只是过氧化氢；放出多少氧气由过氧化氢的量决定，二氧化锰只改变放出的<b>快慢</b>。反应后把二氧化锰滤出、洗净、干燥再称，质量没有变；再加到过氧化氢溶液中，还能加速分解。二氧化锰是这个反应的<b>催化剂</b>，它起的作用叫<b>催化作用</b>。',
    src: '课本第 44–46 页 · 第二单元 课题3 制取氧气（探究：过氧化氢分解制取氧气的反应中二氧化锰的作用）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null;
    const near = (v, d, dist) => { if (S.demo) return; S.near = true; look([v.x, v.y, v.z], d || [0.1, 0.2, 1], dist || 0.26, () => { S.near = false; }); };
    const far = () => { if (S.near) { S.near = false; back(); } };
    paperSheet(group, { w: 0.6, d: 0.3, x: 0.02, z: 0.03 });

    // ================= 试管架、试管 =================
    const wood = paint(0xd9c9a6);
    const rack = new THREE.Group(); rack.position.set(TX, 0, 0); group.add(rack);
    const RACK_TOP = 0.1;
    const shape = new THREE.Shape(); shape.moveTo(-0.06, -0.016); shape.lineTo(0.06, -0.016); shape.lineTo(0.06, 0.016); shape.lineTo(-0.06, 0.016); shape.closePath();
    for (const hx of [-0.035, 0, 0.035]) { const hole = new THREE.Path(); hole.absarc(hx, 0, 0.0105, 0, Math.PI * 2, true); shape.holes.push(hole); }
    const top = inked(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.006, bevelEnabled: false, curveSegments: 20 }), wood), { width: 0.7 });
    top.rotation.x = -Math.PI / 2; top.position.y = RACK_TOP; rack.add(top);
    const base = inked(new THREE.Mesh(new THREE.BoxGeometry(0.124, 0.008, 0.04), wood), { width: 0.7 }); base.position.y = 0.004; rack.add(base);
    for (const s of [-1, 1]) { const post = inked(new THREE.Mesh(new THREE.BoxGeometry(0.006, RACK_TOP - 0.008, 0.032), wood), { width: 0.7 }); post.position.set(s * 0.057, 0.008 + (RACK_TOP - 0.008) / 2, 0); rack.add(post); }
    const tube = testTube({ r: TR, len: TL, wall: WALL }); tube.position.set(TX, TB, 0); group.add(tube);
    // 液体（过氧化氢溶液，无色）：按体积重新做形状（底是半球）
    const liqMat = water2({ color: 0xe6f0f3, base: 0.32 });
    const liq = new THREE.Mesh(new THREE.BufferGeometry(), liqMat); liq.renderOrder = 7; tube.add(liq);
    const liqGeo = (hh) => {
      const r = TR - 0.0004, c = WALL + TR, topY = WALL + hh, pts = [];
      for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + (i / 12) * (Math.PI / 2), y = c + Math.sin(a) * r; if (y > topY) break; pts.push(new THREE.Vector2(Math.max(0.0002, Math.cos(a) * r), y)); }
      pts.push(new THREE.Vector2(topY > c ? r : Math.sqrt(Math.max(0, r * r - (topY - c) ** 2)), topY), new THREE.Vector2(0.0002, topY));
      return new THREE.LatheGeometry(pts, 24);
    };
    let liqKey = -1;
    const setLiquid = (vol) => {
      const key = Math.round(vol * 20);
      if (key === liqKey) return; liqKey = key;
      liq.visible = vol > 0.05;
      if (!liq.visible) return;
      liq.geometry.dispose(); liq.geometry = liqGeo(levelOf(vol));
    };
    // 冒泡时液面上的一层泡沫
    const froth = new THREE.Mesh(new THREE.CylinderGeometry(TR - 0.0006, TR - 0.0006, 1, 20), water2({ color: 0xffffff, base: 0.55, rim: 0.5 }));
    froth.geometry.translate(0, 0.5, 0); froth.renderOrder = 8; froth.visible = false; tube.add(froth);
    // 管底的二氧化锰（黑色粉末，保留本色）
    const mnMat = paint(MN, { keep: true, unique: true, side: THREE.DoubleSide });
    const heap = new THREE.Group(); heap.position.y = WALL + TR; tube.add(heap);
    const TH0 = Math.PI * 0.7;
    heap.add(new THREE.Mesh(new THREE.SphereGeometry(TR * 0.94, 18, 8, 0, Math.PI * 2, TH0, Math.PI - TH0), mnMat));
    const heapTop = new THREE.Mesh(new THREE.CircleGeometry(TR * 0.94 * Math.sin(TH0), 18), mnMat); heapTop.rotation.x = -Math.PI / 2; heapTop.position.y = TR * 0.94 * Math.cos(TH0); heap.add(heapTop);
    heap.visible = false;
    // 倒液体时的一股细流
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0009, 1, 8), water2({ color: 0xe6f0f3, base: 0.5 })); stream.geometry.translate(0, -0.5, 0); stream.renderOrder = 8; stream.visible = false; group.add(stream);

    // ================= 电子天平、表面皿上的二氧化锰 =================
    const bal = new THREE.Group(); bal.position.copy(BAL); group.add(bal);
    const bBody = inked(new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.02, 0.065), paint(0xd9dde3)), { width: 0.8 }); bBody.position.y = 0.01;
    const bPan = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.0025, 32), paint(0xc4cad2)), { width: 0.7 }); bPan.position.y = PAN_Y - 0.00125;
    let shown = '';
    const dispTex = canvasTex(320, 96, () => {});
    const drawDisp = (txt) => { if (txt === shown) return; shown = txt; const c = dispTex.image, g = c.getContext('2d'); g.fillStyle = '#1d2b23'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#9cf5b8'; g.font = 'bold 64px "Courier New", monospace'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(txt, c.width - 54, c.height / 2 + 4); g.font = 'bold 30px sans-serif'; g.fillText('g', c.width - 16, c.height / 2 + 12); dispTex.needsUpdate = true; };
    const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.012), new THREE.MeshBasicMaterial({ map: dispTex })); disp.position.set(0.008, 0.0105, 0.0326);
    bal.add(bBody, bPan, disp);
    const dish = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.013, 0.003, 28), glass2({ base: 0.18, rim: 0.5, band: 0.3 })), { width: 0.5, color: 0x5d7f95, opacity: 0.6 }); dish.position.set(BAL.x, PAN_Y + 0.0015, 0); dish.renderOrder = 9; group.add(dish);
    const dishHeap = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint(MN, { keep: true })); dishHeap.scale.y = 0.45; dishHeap.position.set(BAL.x, PAN_Y + 0.0015, 0); group.add(dishHeap);
    const label = (txt, color = '#2b2f3a', w = 0.03, hh = 0.009) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshBasicMaterial({ map: canvasTex(Math.round(w * 9000), Math.round(hh * 9000), (g, W, H) => { g.fillStyle = '#fffaf0'; g.fillRect(0, 0, W, H); g.strokeStyle = '#c9bda6'; g.lineWidth = 4; g.strokeRect(2, 2, W - 4, H - 4); g.fillStyle = color; g.font = `bold ${Math.round(H * 0.5)}px "Songti SC", serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, W / 2, H / 2 + 3); }) })); m.renderOrder = 10; return m; };
    const balLabel = label('二氧化锰', '#1d1d20', 0.022, 0.0072); balLabel.position.set(-0.0245, 0.0105, 0.0327); bal.add(balLabel);

    // ================= 药匙、量筒（5 mL 过氧化氢溶液）、细口瓶、酒精灯、带火星的木条 =================
    const sp = spatula({ color: MN }); sp.rotation.order = 'YXZ'; sp.heap.visible = false;      // 先绕勺柄翻（倒药），再转朝向；药匙一开始是空的
    const spHeap = new THREE.Mesh(new THREE.SphereGeometry(0.0052, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint(MN, { keep: true })); spHeap.scale.set(1.25, 0.8, 0.95); spHeap.position.y = 0.0004; spHeap.visible = false; sp.add(spHeap);      // 勺里的二氧化锰（黑色，保留本色）
    const spPick = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.02), new THREE.MeshBasicMaterial({ visible: false })); spPick.position.x = 0.05; spPick.userData.pick = true; sp.add(spPick);
    group.add(sp);
    const cyl = new THREE.Group();
    const cylGlass = new THREE.Mesh(new THREE.CylinderGeometry(CYL_R, CYL_R, CYL_H, 20, 1, true), glass2({ base: 0.07, rim: 0.45, band: 0.5 })); cylGlass.position.y = 0.004 + CYL_H / 2; cylGlass.renderOrder = 9;
    const cylFoot = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.015, 0.004, 20), paint(0xe9edf0)), { width: 0.6 }); cylFoot.position.y = 0.002;
    const cylLiq = new THREE.Mesh(new THREE.CylinderGeometry(CYL_R - 0.0008, CYL_R - 0.0008, 1, 16), water2({ color: 0xe6f0f3, base: 0.4 })); cylLiq.geometry.translate(0, 0.5, 0); cylLiq.position.y = 0.0042; cylLiq.scale.y = CYL_LIQ; cylLiq.renderOrder = 7;
    const tickPts = []; for (let i = 1; i <= 10; i++) { const y = 0.0042 + i * (CYL_LIQ / 5); const w = i % 5 === 0 ? 0.005 : 0.003; tickPts.push(new V(-w / 2, y, CYL_R + 0.0003), new V(w / 2, y, CYL_R + 0.0003)); }
    const ticks = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(tickPts), new THREE.LineBasicMaterial({ color: 0x6f8798 }));
    const cylPick = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.1, 10), new THREE.MeshBasicMaterial({ visible: false })); cylPick.position.y = 0.05; cylPick.userData.pick = true;
    cyl.add(cylGlass, cylFoot, cylLiq, ticks, cylPick); group.add(cyl);
    const bottle = reagentBottle({ r: 0.016, h: 0.05, color: 0xeef4f6 }); bottle.position.copy(BOTTLE); group.add(bottle);
    const bLabel = label('5% 过氧化氢溶液', '#2b2f3a', 0.026, 0.009); bLabel.position.set(0, 0.026, 0.0166); bottle.add(bLabel);
    const lamp = chemLamp(); lamp.position.copy(LAMP); group.add(lamp);
    const stick = splint({ len: 0.11 });
    const stickPick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.02), new THREE.MeshBasicMaterial({ visible: false })); stickPick.position.y = 0.055; stickPick.userData.pick = true; stick.add(stickPick);
    // 纸本画风里也要看得出“火星”：木条头保留本色，火星的光晕用普通混合（加色混合在浅色纸面上看不见）
    stick.tip.material = paint(0x3b2a20, { keep: true, unique: true });
    stick.ember.material.blending = THREE.NormalBlending;
    group.add(stick);

    // ================= 气泡、气体小点 =================
    const bubs = new Particles({ max: 260, geometry: new THREE.SphereGeometry(1, 8, 6), material: bubble2() }); group.add(bubs.mesh);
    const dotTex = canvasTex(64, 64, (g, W) => { const gr = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,1)'); gr.addColorStop(0.75, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, W); });
    const blueP = new Particles({ max: 260, sprite: true, color: BLUE }), grayP = new Particles({ max: 60, sprite: true, color: LIGHT }), darkP = new Particles({ max: 40, sprite: true, color: MN });
    for (const p of [blueP, grayP, darkP]) { p.mat.uniforms.map.value = dotTex; p.mesh.renderOrder = 10; group.add(p.mesh); }
    const N_GAS = 30;
    const gas = Array.from({ length: N_GAS }, (_, i) => ({ i, u: Math.sqrt(Math.random()) * 0.8, th: Math.random() * Math.PI * 2, v: Math.random(), ph: Math.random() * 6, p: new V(), size: 0.0026, alpha: 0.92 }));
    const esc = [], inLiq = [], falling = [];

    // ================= 卡片 =================
    const tubeCard = tag('', 'cond'); tubeCard.px = [185, 0];      // 放在试管右边，近看时不挡住管口的木条
    const balCard = tag('', 'cond'); balCard.px = [-10, -64];

    // ================= 状态 =================
    const fresh = () => ({
      vol: 0, n: 0, x: AIR, flow: 0, made: 0, pours: 0, mnPours: 0,
      mno2: 'dish',                   // 'dish' 在表面皿上 | 'spoon' 在药匙里 | 'tube' 在试管里
      charges: [], cur: null,         // 每一次实验（一次加过氧化氢 / 加二氧化锰）：放出氧气的曲线
      rows: {}, weighed: false, stir: 0,
      splint: 'home', ember: 'ember', tipY: 0, inT: 0, relT: 0, flameT: 0, said: {},
      cylPose: 'home', pouring: null, dumping: null, back: null, demo: false, near: false, asked: false,
    });
    S = fresh();
    let W = null, X = null;
    // 微观次元：试管底的二氧化锰表面——H₂O₂ 在上面分解，二氧化锰自己不变
    const MW_AT = new THREE.Vector3(TX, TB + 0.012, 0);
    const mwState = () => ({ cat: S.mno2 === 'tube', h2o2: Math.min(1.4, S.n / N_ADD) });
    const mw = microWorld({ mode: 'holo', scene: mno2Scene(), place: () => ({ pos: group.localToWorld(MW_AT.clone()), scale: 0.0062 * group.getWorldScale(new THREE.Vector3()).x, cam: window.__lb.stage.camera }) });
    const goBtn = tag('钻进试管底看 ⊙', 'pill mw-go', () => openMicro());
    let mwCat = null;
    const openMicro = (demo = false) => {
      if (!demo) near(new THREE.Vector3(MW_AT.x, MW_AT.y + 0.05, MW_AT.z), [0.06, 0.2, 1], 0.3);
      const r = () => { const cam = window.__lb?.stage?.camera; if (!cam) return [innerWidth / 2, innerHeight * 0.8]; const v = group.localToWorld(MW_AT.clone()).project(cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; };
      const st = mwState(); mwCat = st.cat; mw.open(r, st);
    };
    mw.onClose = () => { if (!bar.playing) far(); };
    const status = (m) => { if (!S.demo) W?.status(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const row = (lab, html) => { if (S.demo || S.rows[lab]) return; S.rows[lab] = html; W?.tbl.add([LABS[lab] || lab, html]); };
    const once = (key, m) => { if (S.said[key]) return; S.said[key] = true; status(m); };
    const liquidTop = () => TB + WALL + levelOf(S.vol + (S.pouring ? ADD_ML * Math.min(1, S.pouring.t / 0.8) : 0));
    const quiet = () => S.flow < QUIET;

    const newCharge = (lab, cat) => {
      if (S.cur && S.cur.lab === lab) return;          // 同一个实验里多倒一次：算在同一条曲线上
      S.cur = { lab, cat, T: 0, made: 0, pts: [[0, 0]], last: 0, quietSaid: false };
      if (COLORS[lab]) S.charges.push(S.cur);
      drawChart();
    };

    const A = {
      /** 量筒里的 5 mL 倒进试管（倒的动画放完以后才加进去） */
      pour(instant) {
        if (S.pouring) return;
        if (S.pours >= MAX_POURS) return status('试管里的液体已经不少了。可以点“更多”里的<b>全部重来</b>。');
        if (S.mno2 === 'tube' && !quiet()) return status('试管里还在冒气泡呢。课本：<b>待试管中没有现象发生时</b>，再重新加入过氧化氢溶液。');
        A.splintOut();
        if (instant) { A.poured(); return; }
        S.pouring = { t: 0 }; S.cylPose = 'pour'; sfx.clink({ freq: 1500, gain: 0.03 });
      },
      poured() {
        S.pouring = null; S.vol += ADD_ML; S.n += N_ADD; S.pours++; S.cylPose = 'home';
        if (S.mno2 === 'tube') {
          S.mnPours++;
          const k = S.charges.filter((c) => c.lab.startsWith('3-')).length + 1;
          newCharge(S.weighed ? 'again+' : `3-${Math.min(3, k)}`, true);
          status(`重新加入了 5 mL 过氧化氢溶液（没有再加二氧化锰）——看管底和气泡。插入<b>带火星的木条</b>。`);
        } else {
          newCharge(S.weighed ? 'w0' : '1', false);
          done('pour');
          status(S.pours === 1 ? '试管里倒进了 5 mL 5% 过氧化氢溶液：无色透明，<b>几乎看不到气泡</b>。把<b>带火星的木条</b>插入试管（不要碰到液面）。' : '又倒进了 5 mL 过氧化氢溶液。');
        }
      },
      /** 药匙里的二氧化锰倒进试管 */
      addMnO2(instant) {
        if (S.mno2 === 'tube' || S.dumping) return;
        if (!S.vol) return status('先往试管里倒过氧化氢溶液，再加二氧化锰。');
        if (!S.rows['1'] && !S.weighed && !S.demo) return status('先做实验（1）：只有过氧化氢溶液时，插入带火星的木条看看。');
        A.splintOut();
        S.mno2 = 'spoon';
        if (instant) { A.dumped(); return; }
        S.dumping = { t: 0 };
      },
      dumped() {
        S.dumping = null; S.mno2 = 'tube'; S.mnPours = 0;
        newCharge(S.weighed ? 'again' : '2', true);
        done('mno2'); sfx.clink({ freq: 2400, gain: 0.03 });
        status('加入少量二氧化锰：立刻产生<b>大量气泡</b>。看试管上部的蓝点（氧气）越来越多。把<b>带火星的木条</b>插进去。');
      },
      scoop() { if (S.mno2 !== 'dish') return; S.mno2 = 'spoon'; sfx.clink({ freq: 2600, gain: 0.03 }); status('药匙取了表面皿上的二氧化锰（天平读数变成 0.00 g）。拖到试管口加进去。'); },
      insert(y = MY - 0.035) { if (S.splint === 'in') return; if (S.ember !== 'ember') S.ember = 'ember'; S.splint = 'in'; S.tipY = y; S.inT = 0; S.relT = 0; near(new V(TX, 0.09, 0), [0.12, 0.16, 1], 0.36); },
      splintOut() { if (S.splint === 'home') return; A.home(); },
      home() {
        const was = S.ember; S.splint = 'home'; S.inT = 0; S.relT = 0; S.backT = null; far();
        if (was !== 'ember') { S.ember = 'ember'; if (!S.demo) setTimeout(() => status(was === 'flame' ? '（木条在酒精灯上点燃、吹灭了火焰）木条又带上了火星，可以再用。' : '（木条在酒精灯上重新点燃、吹灭）木条又带上了火星。'), 2600); }
      },
      relight() {
        S.ember = 'flame'; S.flameT = 0; sfx.whoosh({ freq: 520, gain: 0.12, dur: 0.5 });
        const lab = S.cur?.lab;
        if (lab === '2') { row('2', '产生<b>大量气泡</b>，带火星的木条<b>复燃</b>'); done('s2'); status('木条<b>复燃</b>了！试管上部的氧气一下子多了起来。等试管里<b>没有现象</b>了（气泡停了），重新倒进过氧化氢溶液。'); }
        else if (lab === '3-1') { row('3-1', '重新加入过氧化氢溶液：又产生<b>大量气泡</b>，木条<b>又复燃</b>（没有再加二氧化锰）'); done('s2'); done('s3a'); status('<b>又复燃</b>了——这次没有再加二氧化锰，它还在管底。等又没有现象时，<b>再重复</b>一次。'); }
        else if (lab === '3-2' || lab === '3-3') { row(lab, '又产生<b>大量气泡</b>，木条<b>复燃</b>；管底的二氧化锰还是那么多'); done('s2'); done('s3a'); done('s3b'); status('还是复燃。加了几次过氧化氢，二氧化锰<b>好像永远用不完</b>。等这一次也没有现象了，回答左边的问题。'); }
        else if (lab === 'again') { row('again', '滤出、干燥后的二氧化锰，加进新的过氧化氢溶液：又产生<b>大量气泡</b>，木条<b>复燃</b>（化学性质没变）'); status('称过的二氧化锰<b>照样</b>能加速过氧化氢分解——它的<b>化学性质</b>也没有变。'); }
        else status('木条复燃了。');
      },
      /** 反应后：过滤、洗涤、干燥，放回表面皿上称 */
      weigh(force) {
        if (!force) {
          if (S.mno2 !== 'tube') return status(S.weighed ? '已经称过了：0.50 g。' : '二氧化锰还没加进试管呢。');
          if (!bar.has('s2')) return status('先做完实验（2）（3）。');
          if (!quiet()) return status('还在冒气泡。等反应停了再过滤。');
        }
        if (S.back) return;
        A.splintOut();
        S.vol = 0; S.n = 0; S.flow = 0; S.x = AIR; S.mno2 = 'spoon'; S.cur = null; S.pours = 0; S.stir = 0;
        bubs.clear(); inLiq.length = 0;
        S.back = { t: 0 };          // 药匙把滤出、洗净、干燥的二氧化锰送回表面皿上（step 里放完以后 weighed()）
      },
      weighed() {
        S.back = null; S.mno2 = 'dish'; S.weighed = true; sfx.clink({ freq: 2600, gain: 0.03 });
        row('w', `把二氧化锰滤出、洗净、干燥后再称：反应前 <b>${MNO2_G.toFixed(2)} g</b>，反应后 <b>${MNO2_G.toFixed(2)} g</b>——<b>质量不变</b>`);
        status(`把试管里的混合物过滤，二氧化锰留在滤纸上；洗净、干燥后放回表面皿上称：<b>${MNO2_G.toFixed(2)} g</b>，和反应前<b>一样</b>。（还可以把它再加进新的过氧化氢溶液里试试。）`);
        if (!S.demo) near(new V(BAL.x, 0.03, 0), [0.1, 0.3, 1], 0.24);
      },
      reset() {
        S = fresh(); clearFx(); W?.tbl.clear(); mw.close(); far(); drawChart();
        if (W) { W.q1.close(); W.q2.close(); W.next.hidden = true; }
        bar.undo('pour', 's1', 'mno2', 's2', 's3a', 's3b', 'why');
        status('全部重新摆好了：空试管、表面皿上 0.50 g 二氧化锰，记录也清空了。');
      },
    };
    const clearFx = () => { bubs.clear(); esc.length = 0; inLiq.length = 0; falling.length = 0; liqKey = -1; };

    // ================= 底部步骤栏 + 老师的演示 =================
    // ================= 拖动 =================
    // 竖直面 z = 0 里挡路的东西：天平、试管架、试管口（拖着的东西不能穿过去）
    const OBST = [[BAL.x - 0.038, BAL.x + 0.038, PAN_Y + 0.005], [TX - 0.063, TX + 0.063, RACK_TOP + 0.008], [TX - 0.012, TX + 0.012, MY + 0.004]];
    const floorAt = (x0, x1) => OBST.reduce((m, [a, b, y]) => (x1 > a && x0 < b ? Math.max(m, y) : m), 0.006);
    const tipOf = () => { stick.updateMatrixWorld(true); return group.worldToLocal(stick.localToWorld(new V(0, 0.004, 0))); };
    // 拿着的东西要去的地方（每帧滑过去，不跳）：go.cyl 量筒底、go.sp 勺头、go.stick 木条的火星
    const go = { cyl: null, sp: null, stick: null };
    const stickAt = (p) => new V(p.x, p.y - 0.004, p.z);      // 竖着拿：火星朝下（木条原点比火星低 4 mm）
    const constrainTip = (p) => {
      let x = clamp(p.x, -0.2, 0.24), y = clamp(p.y, 0.012, 0.24);
      const dx = x - TX;
      if (Math.abs(dx) < 0.012 && y < MY + 0.02) { x = TX; y = Math.max(y, TB + WALL + 0.003); }        // 对准了管口：顺着试管插进去（可以插得太深，碰到液面）
      else y = Math.max(y, floorAt(x - 0.003, x + 0.003));
      return new V(x, y, p.z || 0);
    };
    // 倒的时候：量筒斜过来，量筒口的下沿搭在试管口上（口挨着口，下沿在管口内壁里面一点）
    const POUR_LIP = new V(TX + 0.0078, MY + 0.0003, 0);
    const cylPour = () => { const th = 1.75, L = CYL_H + 0.004, c = POUR_LIP.clone().add(new V(Math.cos(th) * CYL_R, Math.sin(th) * CYL_R, 0)); return { th, base: new V(c.x + Math.sin(th) * L, c.y - Math.cos(th) * L, 0) }; };
    const drag = draggable(group, [
      { obj: cylPick, plane: 'xy', offset: 0, hint: () => (S.pours >= MAX_POURS ? '' : '拖到试管口：倒入 5 mL 过氧化氢溶液'),
        onStart: () => { if (S.pouring) return; S.cylPose = 'drag'; A.splintOut(); },
        onDrag: (p) => {
          if (S.pouring) return;
          if (p.distanceTo(MOUTH) < 0.05) { S.cylPose = 'aim'; return; }
          S.cylPose = 'drag'; const y = Math.max(p.y - 0.05, floorAt(p.x - 0.016, p.x + 0.016));
          go.cyl = new V(clamp(p.x, -0.2, 0.24), y, p.z || 0);
        },
        onEnd: () => { if (S.pouring) return; if (S.cylPose === 'aim') A.pour(); else S.cylPose = 'home'; if (!S.pouring) S.cylPose = 'home'; } },
      { obj: spPick, plane: 'xy', offset: 0, hint: () => (S.mno2 === 'tube' ? '' : S.mno2 === 'spoon' ? '拖到试管口：加入二氧化锰' : '先到表面皿上取二氧化锰，再拖到试管口'),
        onStart: () => { if (S.dumping || S.back) return; S.spDrag = true; go.sp = sp.position.clone(); },
        onDrag: (p) => {
          if (S.dumping || !S.spDrag) return;
          const bx = clamp(p.x - 0.03, -0.2, 0.12);
          const y = Math.max(p.y, floorAt(bx - 0.009, bx + 0.02));      // 勺柄斜着朝前伸（不扫过试管架）：只看勺头下面挡不挡
          go.sp = new V(bx, y, p.z || 0);
          if (Math.abs(bx - DISH.x) < 0.02 && y < DISH.y + 0.02) A.scoop();
        },
        onEnd: () => {
          if (!S.spDrag) return;
          S.spDrag = false; if (S.dumping) return;
          const b = go.sp || sp.position;
          if (Math.abs(b.x - TX) < 0.022 && Math.abs(b.y - MY) < 0.035) { if (S.mno2 === 'spoon') A.addMnO2(); else if (S.mno2 === 'dish') status('药匙是空的：先到天平上的<b>表面皿</b>里取二氧化锰。'); }
        } },
      { obj: stickPick, plane: 'xy', offset: 0, hint: () => (S.splint === 'in' ? '拖出来：拿出木条' : '带火星的木条：插入试管（不要碰到液面）'),
        onStart: () => { S.splint = 'hold'; S.inT = 0; go.stick = tipOf(); },
        onDrag: (p) => { go.stick = constrainTip(p); },
        onEnd: () => { const tp = go.stick || tipOf(); if (Math.abs(tp.x - TX) < 0.002 && tp.y < MY - 0.004) { S.splint = 'in'; S.tipY = tp.y; near(new V(TX, 0.09, 0), [0.12, 0.16, 1], 0.36); } else A.home(); } },
    ], { tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    // 演示：沿折线拖过去（先抬起来、越过别的器材，再放下去）。pts[0] 为 null 时从器材现在的地方出发。——建议进 kit（act.path）
    const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
    const centerOf = (o) => { group.updateMatrixWorld(true); return group.worldToLocal(new THREE.Box3().setFromObject(o).getCenter(new V())); };
    const path = (obj, pts, o) => act.path(obj, pts, o);      // 沿几个点拿过去（kit/chemlesson.js 的 act.path）
    const up = (y) => () => { const c = centerOf(stickPick); return new V(c.x, y, c.z); };
    // 量筒：拿起来（往上抬），移到试管口右上方——一靠近管口就倾斜着倒
    const cylRoute = [null, () => { const c = centerOf(cylPick); return new V(c.x, 0.2, c.z); }, new V(0.07, 0.2, 0), new V(TX + 0.03, MY + 0.03, 0)];
    // 带火星的木条：竖着拿起来，移到试管口正上方，再顺着试管插进去（不碰到液面）
    const stickRoute = [null, up(0.23), new V(TX, 0.23, 0), new V(TX, MY - 0.035, 0)];

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'pour', title: '加过氧化氢溶液', todo: '把<b>量筒</b>（里面是 5 mL 5% 过氧化氢溶液）拖到试管口，倒进试管。', target: () => (S.pours ? null : cyl) },
        { id: 's1', title: '实验（1）', todo: '把<b>带火星的木条</b>插入试管（不要碰到液面），看它能不能复燃。', target: () => (S.splint === 'home' ? stick : null) },
        { id: 'mno2', title: '加二氧化锰', todo: '拿起<b>药匙</b>：先到天平上的表面皿里取二氧化锰，再拖到试管口加进去。', target: () => (S.mno2 === 'tube' ? null : sp) },
        { id: 's2', title: '实验（2）', todo: '再把<b>带火星的木条</b>插入试管，观察。', target: () => (S.splint === 'home' ? stick : null) },
        { id: 's3a', title: '实验（3）', todo: '等试管里<b>没有现象</b>了，用<b>量筒</b>重新加入过氧化氢溶液，再插入<b>带火星的木条</b>。', target: () => (S.cur?.lab === '3-1' ? (S.splint === 'home' ? stick : null) : cyl) },
        { id: 's3b', title: '再重复一次', todo: '又没有现象时，<b>再</b>加入过氧化氢溶液（<b>量筒</b>），插入带火星的木条。', target: () => (S.cur?.lab === '3-2' ? (S.splint === 'home' ? stick : null) : cyl) },
        { id: 'why', title: '想一想', todo: '对照你的记录：木条为什么复燃？二氧化锰起了什么作用？在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { clearFx(); drawChart(); go.cyl = go.sp = go.stick = null; mw.close(); } }),
          shots: [
            { cap: '试管里加入 5 mL 5% 过氧化氢溶液：无色透明，几乎看不到气泡。', dur: 5, cam: [[TX + 0.04, 0.12, 0.02], [0.12, 0.16, 1], 0.5],
              during: path(cylPick, cylRoute, { t0: 0.05, t1: 0.42, release: 0.46 }) },
            { cap: '插入带火星的木条：没有复燃。过氧化氢在常温下分解很慢——蓝点（氧气）很久才冒出一个。', dur: 6, cam: [[TX + 0.04, 0.11, 0.03], [0.12, 0.16, 1], 0.46],
              during: path(stickPick, stickRoute, { t0: 0.04, t1: 0.4, release: 0.43 }) },
            { cap: '向试管中加入少量二氧化锰：立刻产生大量气泡，试管上部的蓝点多了起来。', dur: 6.5, cam: [[-0.07, 0.1, 0.02], [0.12, 0.16, 1], 0.46],
              during: path(spPick, [null, new V(-0.1, 0.06, 0.06), new V(DISH.x + 0.03, 0.036, 0), new V(DISH.x + 0.03, 0.2, 0), new V(TX + 0.03, 0.2, 0), new V(TX + 0.03, MY + 0.008, 0)], { t0: 0.03, t1: 0.56, release: 0.59 }) },
            { cap: '钻进试管底看：两个 H₂O₂ 分子在二氧化锰表面拆开，变成水和氧气；二氧化锰自己一个原子也没少。', dur: 11, cam: [[MW_AT.x, MW_AT.y + 0.05, MW_AT.z], [0.06, 0.2, 1], 0.3], during: act.at(0.02, () => openMicro(true)) },
            { cap: '再插入带火星的木条：复燃了。', enter: () => mw.close(), dur: 5, cam: [[TX + 0.04, 0.11, 0.03], [0.12, 0.16, 1], 0.46],
              during: path(stickPick, stickRoute, { t0: 0.04, t1: 0.42, release: 0.45 }) },
            // 实验（3）：待试管中没有现象时重新加入过氧化氢溶液、插入木条；又没有现象时，再重复一次（课本第 45 页）。等的时间用 speed 压短
            { cap: '待试管中没有现象发生时，重新加入过氧化氢溶液，插入带火星的木条：又复燃。二氧化锰没有再加，还在管底。', dur: 7, speed: 1.5, cam: [[TX + 0.04, 0.12, 0.03], [0.12, 0.16, 1], 0.5],
              during: act.seq(path(cylPick, cylRoute, { t0: 0.03, t1: 0.25, release: 0.28 }), path(stickPick, stickRoute, { t0: 0.46, t1: 0.68, release: 0.7 })) },
            { cap: '过了一会儿，试管中又没有现象了：不再冒出气泡。', dur: 1.8, speed: 7, cam: [[TX + 0.04, 0.12, 0.03], [0.12, 0.16, 1], 0.5] },
            { cap: '再重复上述操作：重新加入过氧化氢溶液，插入带火星的木条——还是复燃。二氧化锰好像永远用不完。', dur: 5.5, speed: 2, cam: [[TX + 0.04, 0.12, 0.03], [0.12, 0.16, 1], 0.5],
              during: act.seq(path(cylPick, cylRoute, { t0: 0.03, t1: 0.28, release: 0.3 }), path(stickPick, stickRoute, { t0: 0.45, t1: 0.68, release: 0.7 })) },
            { cap: '过了一会儿，反应停止了：试管中又没有现象了。', dur: 1.8, speed: 7, cam: [[TX + 0.04, 0.12, 0.03], [0.12, 0.16, 1], 0.5] },
            { cap: '反应后把二氧化锰滤出、洗净、干燥再称：还是 0.50 g。演示完了，下面换你自己做。', dur: 4.5, cam: [[BAL.x + 0.02, 0.04, 0.02], [0.1, 0.3, 1], 0.32],
              during: act.at(0.08, () => A.weigh(true)) },
          ],
        },
      },
    });

    const pointer = wrapPointer(drag, bar);
    // 一开始就摆到桌上的位置（之后每帧滑动；取景按包围盒算，要在第一帧之前摆好）
    cyl.position.copy(HOME.cyl); sp.position.copy(HOME.sp); stick.position.copy(HOME.stick); stick.rotation.set(0, 0, Math.PI / 2);

    // ================= 曲线：每一次放出的氧气 =================
    let ch = null, chartT = 0;
    const drawChart = () => {
      if (!ch || S.demo) return;
      ch.series = S.charges.map((c) => ({ color: COLORS[c.lab], points: c.pts, dash: c.lab === '1' }));
      ch.draw();
    };
    const t50 = (c) => { const f = c.made; if (f < 1) return null; const p = c.pts.find(([, y]) => y >= f / 2); return p ? p[0] : null; };

    // ================= 每帧 =================
    // 滑过去：位置 lerp，转角逐个分量 lerp（p 为 null 时只转）
    const glide = (o, p, rx, ry, rz, a) => { if (p) o.position.lerp(p, a); o.rotation.set(o.rotation.x + (rx - o.rotation.x) * a, o.rotation.y + (ry - o.rotation.y) * a, o.rotation.z + (rz - o.rotation.z) * a); };
    // 放回桌上：先水平挪到原处的上方，再放下去（不斜着穿过别的器材）
    const carryHome = (o, p, a) => { const d = Math.hypot(o.position.x - p.x, o.position.z - p.z); o.position.lerp(d > 0.004 ? new V(p.x, Math.max(o.position.y, p.y), p.z) : p, a); };
    const step = (h, t) => {
      const hr = h * SPEED;
      lamp.flame.setOn(true); lamp.flame.update(t);
      // ---- 倒过氧化氢溶液（量筒口对着试管口，0.8 秒倒完） ----
      if (S.pouring) { S.pouring.t += h; if (S.pouring.t >= 0.8) A.poured(); }
      const aF = 1 - Math.exp(-h * 22), aS = 1 - Math.exp(-h * 6);          // 拿着跟手 / 放回桌上
      if (S.cylPose === 'aim' || S.pouring) { const { th, base: b } = cylPour(); glide(cyl, b, 0, 0, th, aF * 0.7); }
      else if (S.cylPose === 'drag' && go.cyl) glide(cyl, go.cyl, 0, 0, 0, aF);
      else { go.cyl = null; carryHome(cyl, HOME.cyl, aS); glide(cyl, null, 0, 0, 0, aS); }
      cylLiq.scale.y = CYL_LIQ * (S.pouring ? Math.max(0.02, 1 - S.pouring.t / 0.8) : 1);
      cylLiq.visible = S.pours < MAX_POURS || !!S.pouring;
      stream.visible = !!S.pouring;
      if (S.pouring) { const y0 = POUR_LIP.y + 0.0006, y1 = liquidTop(); stream.position.set(POUR_LIP.x - 0.0012, y0, 0); stream.scale.y = Math.max(0.001, y0 - y1); }      // 从量筒口的下沿流进试管
      // ---- 药匙：表面皿 → 试管口，翻过来倒进去 ----
      if (S.dumping) {
        S.dumping.t += h;
        glide(sp, new V(TX, MY + 0.008, 0), Math.min(1.5, S.dumping.t * 5), SP_YAW, 0, aF);
        if (S.dumping.t > 0.2 && S.dumping.t < 0.6 && Math.random() < h * 40) falling.push({ p: new V(TX + (Math.random() - 0.5) * 0.006, MY - 0.004, (Math.random() - 0.5) * 0.006), v: new V(0, -0.3, 0), size: 0.0016, alpha: 0.95, life: 2, age: 0 });
        if (S.dumping.t >= 0.8) A.dumped();
      } else if (S.back) {
        // 滤出、洗净、干燥后的二氧化锰：药匙送回表面皿上，翻过来倒在皿里
        S.back.t += h; const bt = S.back.t;
        if (bt < 0.7) glide(sp, new V(DISH.x, 0.07, 0.045), 0, SP_YAW, 0, aS * 1.6);
        else glide(sp, new V(DISH.x, DISH.y + 0.012, 0), bt > 1.2 ? Math.min(1.5, (bt - 1.2) * 5) : 0, SP_YAW, 0, aF * 0.6);
        if (bt > 1.35 && S.mno2 === 'spoon') A.weighed();
        if (bt > 1.8) S.back = null;
      } else if (S.spDrag && go.sp) glide(sp, go.sp, 0, SP_YAW, 0, aF);
      else { go.sp = null; carryHome(sp, HOME.sp, aS); glide(sp, null, 0, 0, 0, aS); }
      spHeap.visible = S.mno2 === 'spoon';
      dishHeap.visible = S.mno2 === 'dish';
      // ---- 反应：2H₂O₂ → 2H₂O + O₂ ----
      const k = S.mno2 === 'tube' ? K_CAT : K_UN;
      const dn = Math.min(S.n, k * S.n * hr);
      S.n -= dn;
      const dV = (dn / 2) * VM;
      S.made += dV;
      S.flow = 0.5 * k * S.n * VM;
      if (S.cur) {
        S.cur.made += dV; S.cur.T += hr;
        if (S.cur.T <= 40.01 && S.cur.T - S.cur.last >= 0.5) { S.cur.last = S.cur.T; S.cur.pts.push([+S.cur.T.toFixed(1), S.cur.made]); }
        if (S.cur.cat && !S.cur.quietSaid && S.cur.T > 4 && quiet()) {
          S.cur.quietSaid = true;
          const left = !bar.has('s3a') ? '重新加入过氧化氢溶液（<b>量筒</b>），再插入带火星的木条。' : !bar.has('s3b') ? '<b>再重复</b>一次：加入过氧化氢溶液，插入带火星的木条。' : '';
          status(`试管里<b>没有现象</b>了：这一次的过氧化氢分解完了，放出了约 ${Math.round(S.cur.made)} mL 氧气。看管底——黑色的二氧化锰<b>又沉回了管底</b>，还是那么多。${left}`);
        }
      }
      chartT += h; if (chartT > 0.25) { chartT = 0; drawChart(); }
      // ---- 试管上部的气体：放出的氧气从下往上把空气挤出管口；没有气流时慢慢和外面的空气混匀 ----
      const tip = tipOf();
      const inTube = Math.abs(tip.x - TX) < 0.003 && tip.y < MY - 0.002 && S.splint !== 'home';
      const vh = Math.max(2, TUBE_V - S.vol);
      S.x += (S.flow / vh * (1 - S.x) - KD * (S.x - AIR) - (S.ember === 'flame' && inTube ? 0.03 * S.x : 0)) * hr;
      S.x = clamp(S.x, 0.05, 0.99);
      // ---- 带火星的木条：看火星那里的氧气有多少 ----
      const lt = liquidTop();
      if (inTube && S.vol > 0 && tip.y < lt + 0.0008 && S.ember !== 'none') {
        S.ember = 'none'; if (S.splint === 'in') S.backT = 1.5;
        status('木条碰到了液体，火星<b>灭了</b>。插入试管时，木条<b>不要碰到液面</b>。把它放回桌上（会重新点燃、吹灭）。');
      }
      const dy = tip.y - MY;
      const local = inTube ? S.x : Math.abs(tip.x - TX) < 0.012 && dy >= 0 && dy < 0.025 ? AIR + (S.x - AIR) * (1 - dy / 0.025) * Math.min(1, S.flow / 2 + 0.2) : AIR;
      if (S.ember === 'ember' && S.splint !== 'home') { if (local >= RELIGHT) { S.relT += h; if (S.relT > 0.35) A.relight(); } else S.relT = 0; }
      if (inTube) S.inT += h; else S.inT = 0;
      if (S.ember === 'flame') S.flameT += h;
      // 记录：实验（1）木条不复燃；插晚了没复燃
      if (inTube && S.ember === 'ember' && S.inT > 2.5) {
        const lab = S.cur?.lab;
        if (!S.vol) once('empty', '试管里还是空的。先把量筒里的过氧化氢溶液倒进去。');
        else if (lab === '1' && !S.rows['1'] && !S.said.s1) {
          S.said.s1 = true;
          row('1', '插入带火星的木条：<b>没有复燃</b>（只有一点火星）；几乎看不到气泡');
          done('s1'); S.backT = 1.5;
          status('木条<b>没有复燃</b>，只有一点火星。过氧化氢在常温下也会分解，但<b>很慢</b>——很久才冒出一个蓝点（氧气）。现在拿起<b>药匙</b>，到天平上的表面皿里取少量二氧化锰，加进试管。');
        } else if (lab && lab !== '1' && lab !== 'w0' && !S.rows[lab] && S.inT > 3.5 && quiet()) once('late' + lab, '没有复燃：这时试管里已经没有现象了，加进去的过氧化氢已经分解完了。重新加入过氧化氢溶液，<b>马上</b>插入木条。');
      }
      if (S.splint === 'in' && S.ember === 'none' && S.backT == null) S.backT = 1.5;      // 火星灭了：拿出来
      if (S.backT != null) { S.backT -= h; if (S.backT <= 0) { S.backT = null; if (S.splint === 'in') A.home(); } }
      if (S.ember === 'flame' && S.splint === 'in' && S.flameT > 2.5) A.home();         // 复燃以后拿出来，在酒精灯上吹灭
      if (S.splint === 'in') glide(stick, stickAt(new V(TX, S.tipY, 0)), 0, 0, 0, aF);
      else if (S.splint === 'hold' && go.stick) glide(stick, stickAt(go.stick), 0, 0, 0, aF);
      else if (S.splint === 'home') {
        go.stick = null;
        // 先顺着试管拔出来，再拿回桌上放倒
        if (Math.abs(stick.position.x - TX) < 0.015 && stick.position.y < MY + 0.02) glide(stick, new V(TX, MY + 0.035, 0), 0, 0, 0, aF * 0.6);
        else { carryHome(stick, HOME.stick, aS); glide(stick, null, 0, 0, Math.PI / 2, aS); }
      }
      stick.setState(S.ember === 'flame' ? 'flame' : S.ember === 'ember' ? 'ember' : 'none', S.ember === 'ember' ? 0.25 + 0.75 * clamp((local - AIR) / (RELIGHT - AIR), 0, 1) : 0.9);
      // ---- 液体、泡沫、管底的二氧化锰（冒泡时被搅起来，液体发灰黑；停了又沉下去） ----
      setLiquid(S.vol + (S.pouring ? ADD_ML * Math.min(1, S.pouring.t / 0.8) : 0));
      const stirTo = S.mno2 === 'tube' ? clamp(S.flow / 3, 0, 1) : 0;
      S.stir += (stirTo - S.stir) * Math.min(1, h * (stirTo > S.stir ? 4 : 0.45));
      liqMat.color.lerpColors(new THREE.Color(0xe6f0f3), new THREE.Color(0x55585e), S.stir * 0.85);
      heap.visible = S.mno2 === 'tube'; sp.heap.visible = S.mno2 === 'spoon';          // 二氧化锰在哪就画在哪：药匙里只在取了药、还没加进试管时有
      heap.scale.set(1, 1 - S.stir * 0.45, 1);
      const fh = clamp(S.flow / 8, 0, 1) * 0.007;
      froth.visible = fh > 0.0004 && S.vol > 0; froth.scale.y = fh; froth.position.y = lt - TB;
      // ---- 气泡（里面是氧气）、蓝点 ----
      if (S.mno2 === 'tube' && S.vol > 0) {
        let nb = Math.min(140, S.flow * 14) * h;
        while (nb > 0) {
          if (nb < 1 && Math.random() > nb) break; nb -= 1;
          const a = Math.random() * Math.PI * 2, rr = Math.random() * (TR - 0.002);
          const p = new V(TX + Math.cos(a) * rr, TB + WALL + 0.002 + Math.random() * 0.004, Math.sin(a) * rr);
          bubs.spawn({ p, v: new V(0, 0.02 + Math.random() * 0.02, 0), size: 0.0005 + Math.random() * 0.0008, life: 3 });
          if (Math.random() < 0.3) inLiq.push({ p: p.clone(), v: new V(0, 0.03, 0), size: 0.0017, alpha: 0.95, age: 0, life: 3 });
        }
      } else if (S.vol > 0 && Math.random() < h / 2.5) {        // 没有二氧化锰：很久才冒出一个（示意；真实的还要少得多）
        const a = Math.random() * Math.PI * 2, rr = Math.random() * (TR - 0.003);
        inLiq.push({ p: new V(TX + Math.cos(a) * rr, TB + WALL + 0.003 + Math.random() * (lt - TB - WALL - 0.006), Math.sin(a) * rr), v: new V(0, 0.006, 0), size: 0.0017, alpha: 0.95, age: 0, life: 6 });
      }
      bubs.update(h, (p, d) => { p.v.y += 0.15 * d; p.p.addScaledVector(p.v, d); return p.p.y < lt; });
      for (let i = inLiq.length - 1; i >= 0; i--) { const d = inLiq[i]; d.age += h; d.p.addScaledVector(d.v, h); if (d.p.y > lt || d.age > d.life) inLiq.splice(i, 1); }
      // 从管口跑出去的氧气
      if (S.flow > 0.6 && Math.random() < h * Math.min(14, S.flow * 1.6)) esc.push({ p: new V(TX + (Math.random() - 0.5) * 0.008, MY, (Math.random() - 0.5) * 0.008), v: new V((Math.random() - 0.5) * 0.012, 0.025, (Math.random() - 0.5) * 0.012), size: 0.0024, alpha: 0.9, age: 0, life: 1.4 });
      for (let i = esc.length - 1; i >= 0; i--) { const d = esc[i]; d.age += h; d.p.addScaledVector(d.v, h); d.alpha = 0.9 * (1 - d.age / d.life); if (d.age > d.life) esc.splice(i, 1); }
      for (let i = falling.length - 1; i >= 0; i--) { const d = falling[i]; d.age += h; d.p.addScaledVector(d.v, h); if (d.p.y < Math.max(lt, TB + WALL + 0.004) || d.age > d.life) falling.splice(i, 1); }
      // 试管上部的气体：蓝点占 x
      const blue = [...inLiq, ...esc], gray = [];
      const y0 = lt + fh + 0.003, y1 = MY - 0.004, nBlue = Math.round(N_GAS * S.x);
      for (const d of gas) {
        const yy = y0 + ((d.v + Math.sin(t * 0.5 + d.ph) * 0.03 + 1) % 1) * Math.max(0.001, y1 - y0), rr = (TR - 0.0018) * d.u, a = d.th + Math.sin(t * 0.4 + d.ph) * 0.2;
        d.p.set(TX + Math.cos(a) * rr, yy, Math.sin(a) * rr);
        (d.i < nBlue ? blue : gray).push(d);
      }
      blueP.list = blue; grayP.list = gray; darkP.list = falling;
      for (const p of [blueP, grayP, darkP]) p.update(0, () => true);
      // ---- 天平读数 ----
      drawDisp(S.mno2 === 'dish' ? MNO2_G.toFixed(2) : '0.00');
      // ---- 卡片 ----
      const pct = Math.round(S.x * 100), mlTxt = !S.cur ? '0' : S.cur.made < 0.05 ? '≈ 0' : S.cur.made < 10 ? S.cur.made.toFixed(1) : String(Math.round(S.cur.made));
      const flame = S.ember === 'flame' && S.splint !== 'home';
      tubeCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">试管里</span>${flame ? '<span class="cc-res burn">复燃</span>' : ''}</div><div class="cc-more">`
        + `<div class="cc-obs"><span class="o2-read"><i style="width:${pct}%"></i></span><b class="o2-num">${pct}%</b><small>上部的氧气</small></div>`
        + `<div class="cc-obs"><small>这一次放出氧气</small><b class="o2-num">${mlTxt}</b><small>mL</small></div>`
        + (S.mno2 === 'tube' ? `<div class="cc-obs"><small>二氧化锰</small><b style="color:#1d1d20">还在管底</b>${S.mnPours ? `<small>（又加了 ${S.mnPours} 次过氧化氢）</small>` : ''}</div>` : '')
        + '</div></div>').loc(group, TX, MY - 0.05, 0).show(S.vol > 0 || !!S.pouring);
      balCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">表面皿上的二氧化锰</span>${S.weighed ? '<span class="cc-res">反应后</span>' : ''}</div><div class="cc-more"><div class="cc-obs"><b style="color:#1d2b23">${S.mno2 === 'dish' ? MNO2_G.toFixed(2) : '0.00'}</b><small>g</small></div></div></div>`)
        .loc(group, BAL.x, PAN_Y + 0.01, 0).show(S.mno2 === 'dish' || S.mno2 === 'spoon');
      A.maybeAsk();
      bar.near(S.near);
    };
    A.maybeAsk = () => { if (!W || S.demo || S.asked || !bar.has('s3b') || !quiet() || S.splint === 'in') return; S.asked = true; W.q1.open(); far(); status('实验（1）～（3）都做完了，试管里又没有现象了。看看左边你自己的记录，回答问题。'); };      // 等这一次反应停了再问：曲线完整

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.36, d: 0.2, h: 0.2 },
      view: { elev: 16, azim: -5, lookY: 0.42, frameMargin: 1.04 },
      mount(ui) {
        const recs = (labs) => labs.filter((l) => S.rows[l]).map((l) => `<div>${LABS[l]}：${S.rows[l]}</div>`).join('');
        const q2 = think({
          q: '综合实验（1）～（3），你认为二氧化锰在过氧化氢分解的反应中起了什么作用？',
          ctx: () => {
            const cs = S.charges.filter((c) => c.cat && c.made > 1);
            const half = cs.map((c) => [c, t50(c)]).filter(([, v]) => v != null);
            return recs(['3-1', '3-2', '3-3'])
              + (cs.length ? `<div>每次放出的氧气：${cs.map((c) => `${LABS[c.lab]} 约 <b>${Math.round(c.made)} mL</b>`).join('，')}</div>` : '')
              + (half.length ? `<div>放出一半所用的时间：${half.map(([c, v]) => `${LABS[c.lab]} 约 ${v.toFixed(0)} 秒`).join('，')}（看下面的曲线）</div>` : '')
              + `<div>管底的二氧化锰：前后加了 ${S.pours} 次过氧化氢溶液，<b>一直在</b>，没有变少</div>`
              + (S.rows.w ? `<div>称量：反应前 0.50 g，反应后 <b>0.50 g</b></div>` : '');
          },
          options: ['加快了过氧化氢的分解；它本身的质量和化学性质在反应前后都没有变', '让过氧化氢放出了更多的氧气', '和过氧化氢反应，一点点被用掉了'],
          ok: '对。这种在化学反应里能改变其他物质的化学反应速率，而本身的质量和化学性质在反应前后都没有发生变化的物质，叫作<b>催化剂</b>；二氧化锰在这里起<b>催化作用</b>。可以掀开结论看看。',
          wrong: [`看曲线：每次放出的氧气都是约 ${Math.round(O2_MAX)} mL——放出多少由过氧化氢的量决定。没有二氧化锰，过氧化氢最后也会放出这么多，只是慢得多。`, '加了几次过氧化氢，每次都差不多快；管底的黑色粉末一点没少。还可以在“换个条件再试”里把它滤出来称一称。'],
          onOk: () => { X.next.hidden = false; done('why'); },
          status,
        });
        const q1 = think({
          q: '实验（1）中木条<b>没有</b>复燃，实验（2）中<b>复燃</b>了。原因可能是——',
          ctx: () => recs(['1', '2']) + '<div>试管上部的氧气：（1）一直约 21%（和空气一样）；（2）一下子升到 90% 以上</div>',
          options: ['过氧化氢常温下分解很慢，放出的氧气很少；加入二氧化锰后分解加快，很快放出大量氧气', '氧气是二氧化锰放出来的', '实验（2）用的木条火星更旺'],
          ok: '对。过氧化氢在常温下也会分解，但<b>很慢</b>，较短时间内放出的氧气很少；加入少量二氧化锰，过氧化氢<b>分解加速</b>。再想想二氧化锰起的作用。',
          wrong: ['看实验（3）：没有再加二氧化锰，只加了过氧化氢溶液，又放出了一样多的氧气；管底的二氧化锰也没少。', '两次用的是同一根带火星的木条。看试管上部的蓝点：（1）里几乎没增加，（2）里一下子多了很多。'],
          onOk: () => q2.open(),
          status,
        });
        const weighB = buttons([{ text: '过滤、洗涤、干燥后，再称二氧化锰', ghost: true, onClick: () => A.weigh() }]);
        const vary = varyBox('课本提示：<b>仔细观察反应前后的二氧化锰</b>。做完实验（3）后，可以把试管里的混合物过滤，把二氧化锰洗净、干燥，放回表面皿上称一称；称过的二氧化锰还可以再加进新的过氧化氢溶液里试试。插木条时碰到液面会怎样，也可以试试。', weighB);
        const more = moreBox([
          ['倒入 5 mL 过氧化氢溶液', () => A.pour()],
          ['插入带火星的木条', () => A.insert()],
          ['拿出木条', () => A.home()],
          ['加入二氧化锰', () => { if (S.mno2 === 'dish') A.scoop(); A.addMnO2(); }],
        ], () => A.reset());
        const note = h('p', { class: 'fineprint', html: `说明：时间加快 ${SPEED} 倍。5 mL 5% 过氧化氢溶液（按密度约 1 g/mL）含过氧化氢约 0.25 g，由 2H₂O₂ ══ 2H₂O + O₂↑，最多放出约 3.7 mmol 氧气，20 ℃ 时约 ${Math.round(O2_MAX)} mL。加二氧化锰（0.50 g）后按半衰期约 7 秒（真实时间）估计，几十秒内放完；没有二氧化锰时常温下分解极慢，几乎看不到——画面上偶尔冒出的蓝点只是示意。重新加入过氧化氢溶液后，溶液变稀会慢一些、上一次反应放热使溶液变热会快一些，这里按速率和第一次差不多处理。试管上部的氧气含量是模型估计；木条复燃（约 45% 以上）取近似值。` });
        X = mountXuean(ui, {
          controls: [q1, q2],
          headers: ['实验编号', '现象'],
          intro: '试管竖放在试管架上。左边天平上的表面皿里是称好的 <b>0.50 g 二氧化锰</b>，右边是量好 5 mL 过氧化氢溶液的量筒和一根<b>带火星的木条</b>。可以先看<b>老师演示</b>，也可以直接动手。',
        });
        ui.controls.append(vary, more, note);
        ch = chart({ x: { label: '加入后的时间/s', min: 0, max: 40 }, y: { label: '放出的氧气/mL', min: 0, max: 100 }, height: 150,
          legend: Object.entries(COLORS).filter(([l]) => l !== '3-3').map(([l, c]) => `<span style="color:${c}">●</span> ${LABS[l]}`).join('　') });
        ui.data.append(ch.el);
        W = { tbl: X.tbl, q1, q2, next: X.next, status: (m) => ui.status(m) };
        bar.attach(ui);
        drawChart();
      },
      update(dt, t) {
        const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); stick.update(t);
        { const st = mwState(); if (mw.isOpen && st.cat !== mwCat) { mwCat = st.cat; mw.reset(st); } else mw.set(st); }
        mw.update(Math.min(dt, 1 / 30) * Math.min(k, 1.5));
        goBtn.loc(group, MW_AT.x, MY + 0.012, MW_AT.z).show(S.vol > 0 && !mw.isOpen && !bar.playing);
        if (S.ember === 'flame') { stick.ember.material.color.setHex(0xffd27a); stick.ember.material.opacity = 0.85; stick.ember.scale.setScalar(0.03 + Math.sin(t * 13) * 0.002); }      // 复燃：火头亮起来
        else stick.ember.material.color.setHex(0xff5a1f);
      },
      dispose() { mw.dispose(); bar.dispose(); bubs.dispose(); blueP.dispose(); grayP.dispose(); darkP.dispose(); dispTex.dispose(); },
      debug: { get S() { return S; }, A, bar, MOUTH, tipOf, picks: { cyl: cylPick, spoon: spPick, stick: stickPick, tube },
        qa: qaFlow(drag, [
          { name: '倒过氧化氢溶液', drag: cylPick, to: () => MOUTH.clone().add(new V(0, 0.01, 0)), wait: 2 },
          { name: '插入带火星的木条（1）', drag: stickPick, to: () => new V(TX, MY - 0.035, 0), wait: 5 },
          { name: '药匙到表面皿上取二氧化锰', drag: spPick, to: () => DISH.clone().add(new V(0.03, 0.004, 0)), wait: 0.5 },
          { name: '二氧化锰加进试管', drag: spPick, to: () => MOUTH.clone().add(new V(0.03, 0.008, 0)), wait: 1.5 },
          { name: '插入带火星的木条（2）', drag: stickPick, to: () => new V(TX, MY - 0.035, 0), wait: 4 },
          { name: '等没有现象', run: () => {}, wait: 13 },
          { name: '重新加入过氧化氢溶液（3）', drag: cylPick, to: () => MOUTH.clone().add(new V(0, 0.01, 0)), wait: 1.5 },
          { name: '插入带火星的木条（3）', drag: stickPick, to: () => new V(TX, MY - 0.035, 0), wait: 4 },
          { name: '又没有现象', run: () => {}, wait: 13 },
          { name: '再加入过氧化氢溶液', drag: cylPick, to: () => MOUTH.clone().add(new V(0, 0.01, 0)), wait: 1.5 },
          { name: '再插入带火星的木条', drag: stickPick, to: () => new V(TX, MY - 0.035, 0), wait: 4 },
          { name: '等这一次也没有现象（出现想一想）', run: () => {}, wait: 12 },
          { name: '答第一题', run: () => W.q1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.q2.el.querySelector('button').click() },
          { name: '称二氧化锰', run: () => A.weigh(), wait: 2 },
        ]) },
    };
  },
};
