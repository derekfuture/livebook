// 课题1 燃料的燃烧 · 探究 燃烧的条件（课本第 159–160 页、图 7-3；实验活动 4 在第 181 页）。
//
// 这一课是“纸本”画风的样板：器材画成课本插图那样的白纸线稿，物质（磷、木块、煤、蜡烛）保留本色，
// 看不见的两样东西用发光的颜色——热（橙）和氧气（蓝）。
// 三处各管一件事：底部步骤栏说“现在做什么”，器材旁的卡片说“看到了什么”，左边的学案记“记下了什么、想一想、结论”。
// 流程（底部 ①–⑤）：盖铜片 → 给水里的白磷通氧气 → 用两把坩埚钳把木块、煤块同时放到火焰上加热，再加热碎石 → 罩住一支蜡烛 → 想一想；
//   答对以后放一段总结镜头，卡片一张张翻过来，变成三枚条件签（可燃物 · 氧气 · 着火点），缺哪一个一眼看出来。
// 老师的演示是独立的一段：随时能看，换上一套干净的器材演完整个探究，看完器材和记录都回到学生原来的样子。
// 着火点（课本表 7-1）：白磷 40 ℃、红磷 260 ℃、木材 240–270 ℃、木炭 320–400 ℃、无烟煤 600–700 ℃。酒精灯外焰温度取约 500 ℃。
// 酒精灯有灯帽（kit/labops.js 的 lampCap）：点燃前取下放在桌上，用完用灯帽盖灭，再轻提一下、重新盖好。
// 罩住的蜡烛：氧气减少到一定程度就熄灭了——这时罩子里的氧气约为原来的 3/4（体积分数约 16%），还剩不少。
import * as THREE from 'three';
import { buttons, seg, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { thermometer, glowTexture, canvasTex, textPlate } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { glassMat, rubberTube, crucibleTongs, chemLamp, chemBeaker, chemCandle, CHEM } from './kit/chem.js';
import { bubble2, flame2, smoke2, glass2 } from './kit/chemfx.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, demoActs } from './kit/chemlesson.js';
import { lampCap } from './kit/labops.js';
import { condCard } from './kit/condcard.js';
import { sfx } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const IGN = { white: 40, red: 260, wood: 255, coal: 650 };
const FLAME_T = 500;
const BR = 0.042, BH = 0.12, WATER_H = 0.075;     // 500 mL 烧杯，300 mL 水；烧杯在原点
const LAMP = new THREE.Vector3(0.14, 0, -0.015);
const FLAME_Y = 0.098;                              // 外焰
const C1 = new THREE.Vector3(-0.1, 0, -0.07), C2 = new THREE.Vector3(-0.145, 0, -0.07);
const BAG = new THREE.Vector3(0.07, 0.014, -0.085);
const HEAT = 0xe8672a, O2C = 0x2f7fd8, LIVE = 0xff6a3d;
const O2_OUT = 0.75;                                // 罩住的蜡烛熄灭时，罩子里的氧气还剩原来的约 3/4（体积分数约 16%）
const O2_USE = 0.06;                                // 蜡烛每秒用掉罩子里原有氧气的约 6%（约 4 秒熄灭）
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const backOut = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

export default {
  id: 'combustion',
  fig: '图7-3',
  title: '燃烧的条件',
  stampText: '探究',
  style: 'paper',
  predict: {
    q: '烧杯里是 80 ℃ 左右的热水，盖上薄铜片。铜片一端放<b>红磷</b>，另一端放<b>白磷</b>；热水里也有一块<b>白磷</b>。<br>会燃烧的是——',
    hint: '课本第 159 页“探究”',
    options: ['三处的磷都会燃烧', '只有铜片上的白磷燃烧', '铜片上的白磷和红磷都燃烧，水里的不燃烧'],
    answer: 1,
  },
  need: '看老师的演示，给热水中的白磷通氧气；再加热木块、煤块和碎石，罩住一支蜡烛；最后总结燃烧的条件',
  conclusion: {
    crops: [{ page: 166, rect: [183, 155, 463, 285] }],
    quote: '通常情况下，可燃物与氧气发生的一种发光、放热的剧烈的氧化反应叫作燃烧。燃烧需要三个条件：（1）可燃物；（2）氧气（或空气）；（3）达到燃烧所需的最低温度（着火点）。',
    why: '铜片上的白磷燃烧、红磷不燃烧：都接触空气，铜片只有五六十摄氏度——高于白磷的着火点（40 ℃），远低于红磷的（260 ℃）——说明燃烧要<b>达到着火点</b>。铜片上的白磷燃烧、热水中的白磷不燃烧：两处的温度都高于 40 ℃，水里的白磷却接触不到氧气——说明燃烧需要<b>氧气</b>。碎石在火焰上怎么烧也不燃烧——它不是<b>可燃物</b>。向水中的白磷通入氧气，它就在水里燃烧了。<br>这就是<b>控制变量</b>：比较的两处只在一个因素上有本质区别（着火点的高低、有没有氧气），其他因素都满足燃烧的要求。三个条件缺一不可；灭火只要破坏其中一个就行（罩住蜡烛 = 隔绝氧气）。',
    src: '课本第 159–160 页 · 第七单元 课题1 燃料的燃烧；实验活动4（第 181 页）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    const near = (v, d, dist) => { S.near = true; look([v.x, v.y, v.z], d || [0.05, 0.3, 1], dist || 0.3, () => { S.near = false; }); };
    const far = () => { if (S.near) { S.near = false; back(); } };
    const glowSprite = (color, s = 0.03) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); m.scale.set(s, s, 1); m.raycast = () => {}; return m; };

    // 器材脚下铺一层淡淡的白：把这块书页上的字压下去，器材像画在一张干净的插图纸上（边缘渐隐，书页还在）
    const sheetTex = canvasTex(512, 256, (g, W, H) => {
      const gr = g.createRadialGradient(W / 2, H / 2, H * 0.12, W / 2, H / 2, W * 0.5);
      gr.addColorStop(0, 'rgba(253,251,245,0.9)'); gr.addColorStop(0.62, 'rgba(253,251,245,0.82)'); gr.addColorStop(1, 'rgba(253,251,245,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    });
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.3), new THREE.MeshLambertMaterial({ map: sheetTex, transparent: true, depthWrite: false }));
    sheet.rotation.x = -Math.PI / 2; sheet.position.set(-0.01, 0.0004, 0.02); sheet.receiveShadow = true; sheet.renderOrder = 1; sheet.raycast = () => {}; sheet.userData.noFrame = true;
    group.add(sheet);

    // ================= 中间：烧杯、热水、温度计、薄铜片 =================
    const bk = chemBeaker({ r: BR, h: BH, level: WATER_H, color: CHEM.water });
    group.add(bk);
    const plate = new THREE.Group(); group.add(plate);
    const COPPER = new THREE.Color(0xd8a070), COPPER_HOT = new THREE.Color(0xf2864a);
    const copperMat = paint(0xd8a070, { unique: true, keep: true });          // 铜片：被热水烤热时慢慢泛出橙色（热是这一课的“看不见的东西”之一）
    const copper = inked(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.0016, 0.05), copperMat), { width: 0.8 });
    copper.position.y = 0.0008; plate.add(copper);
    const blob = (color, r) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), paint(color, { unique: true, keep: true })); m.scale.y = 0.6; m.castShadow = true; return m; };
    const wTop = blob(0xf4eed2, 0.0055); wTop.position.set(-0.04, 0.004, 0);
    const rTop = blob(0xb5432f, 0.008); rTop.scale.set(1.3, 0.55, 1.1); rTop.position.set(0.04, 0.004, 0);      // 一小堆红磷
    plate.add(wTop, rTop);
    const platePick = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.02, 0.06), new THREE.MeshBasicMaterial({ visible: false })); platePick.userData.pick = true; plate.add(platePick);
    const PLATE_HOME = new THREE.Vector3(-0.06, 0, 0.1), PLATE_ON = new THREE.Vector3(0, BH, 0);
    plate.position.copy(PLATE_HOME);
    const wIn = blob(0xf4eed2, 0.0055); wIn.position.set(0, 0.009, 0);
    const ringPaper = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0012, 6, 20), paint(0xd9c9a6)); ringPaper.rotation.x = Math.PI / 2; ringPaper.position.set(0, 0.006, 0);
    group.add(wIn, ringPaper);
    const therm = thermometer({ min: 0, max: 100, length: 0.2 });
    therm.children[1].material = paint(0xd8342a, { keep: true });            // 玻璃泡里是红色液体：保留颜色
    therm.children[0].material = glass2({ base: 0.06, rim: 0.5, band: 0.5 }); therm.children[0].renderOrder = 9;      // 玻璃管
    therm.position.set(0.018, 0.0125, -0.034); therm.rotation.z = 0.08; therm.rotation.x = -0.12; group.add(therm);      // 靠在烧杯后壁上，从铜片后沿外面伸出来

    // 热水上方的热气：几道淡淡的弯线往上飘（课本插图画热气的办法）
    const wispTex = canvasTex(64, 256, (g, W, H) => {
      g.strokeStyle = 'rgba(150,165,185,0.8)'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath();
      for (let i = 0; i <= 40; i++) { const y = H - 10 - (i / 40) * (H - 20), x = W / 2 + Math.sin(i * 0.42) * W * 0.26; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    });
    const wisps = [0, 1, 2].map((i) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: wispTex, transparent: true, opacity: 0, depthWrite: false })); m.scale.set(0.008, 0.03, 1); m.raycast = () => {}; m.userData.a = [-2.2, 1.9, 2.8][i]; m.userData.ph = i * 0.37; group.add(m); return m; });

    // ================= 右后：氧气袋、导管（可以拖进水里对准白磷） =================
    const bag = new THREE.Mesh(new THREE.SphereGeometry(0.03, 24, 14), paint(0xcfe4f7, { unique: true, transparent: true, opacity: 0.94 }));
    bag.scale.set(1.25, 0.45, 0.85); bag.position.copy(BAG); bag.castShadow = true; group.add(bag);
    const bagLabel = textPlate('O₂', { w: 0.028, h: 0.014, color: '#2f7fd8', font: 'bold 92px "Times New Roman", serif' });
    bagLabel.rotation.x = -Math.PI / 2; bagLabel.position.copy(BAG).add(new THREE.Vector3(0, 0.0136, 0.004)); group.add(bagLabel);
    const nozzle = new THREE.Group();
    const nz = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.05, 10), glassMat({ opacity: 0.35 })); nz.position.y = 0.025; nz.renderOrder = 9;
    const nzPick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.06, 8), new THREE.MeshBasicMaterial({ visible: false })); nzPick.position.y = 0.03; nzPick.userData.pick = true;
    nozzle.add(nz, nzPick); group.add(nozzle);
    const NOZ_HOME = new THREE.Vector3(0.045, 0.0035, 0.06), NOZ_IN = new THREE.Vector3(0.004, 0.014, 0.004);
    let hose = null;
    const rebuildHose = () => {
      if (hose) { group.remove(hose); hose.geometry.dispose(); }
      const a = BAG.clone().add(new THREE.Vector3(0, 0.002, 0.026));
      const ax = new THREE.Vector3(0, 1, 0).applyEuler(nozzle.rotation), b = nozzle.position.clone().addScaledVector(ax, 0.05);
      const flat = Math.abs(ax.y) < 0.5;      // 导管平放在桌上时，软管也顺着桌面拖过去
      const lift = Math.min(0.04, 0.012 + a.distanceTo(b) * 0.3);
      const mid = flat ? a.clone().lerp(b, 0.5).setY(0.0046) : a.clone().lerp(b, 0.55).add(new THREE.Vector3(0, lift, 0));
      hose = rubberTube([a, a.clone().add(new THREE.Vector3(0, -0.008, 0.01)), mid, b.clone().addScaledVector(ax, 0.012), b]); group.add(hose);
    };
    // 导管要到的位置、角度：每帧滑过去、慢慢竖起来（拿起来、伸进水里都看得见）；snap：换一套器材时直接摆好
    const noz = { p: NOZ_HOME.clone(), rz: -Math.PI / 2, snap: true };
    const nozHome = (snap) => { noz.p.copy(NOZ_HOME); noz.rz = -Math.PI / 2; if (snap) noz.snap = true; };      // 不用的时候平放在桌上
    const nozAt = (p, snap) => { noz.p.copy(p); noz.rz = 0; if (snap) noz.snap = true; };
    const nozStep = () => {
      const k = noz.snap ? 1 : 0.3; noz.snap = false;
      if (nozzle.position.distanceTo(noz.p) < 1e-5 && Math.abs(nozzle.rotation.z - noz.rz) < 1e-4) return;
      nozzle.position.lerp(noz.p, k); nozzle.rotation.set(0, 0, nozzle.rotation.z + (noz.rz - nozzle.rotation.z) * k); rebuildHose();
    };
    nozHome(true); nozStep();

    // ================= 右：酒精灯（带灯帽）、坩埚钳夹着的木块 / 煤块 / 碎石 =================
    const lamp = chemLamp(); lamp.position.copy(LAMP); group.add(lamp);
    const lampPick = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.07), new THREE.MeshBasicMaterial({ visible: false })); lampPick.position.y = 0.045; lampPick.userData.pick = true; lamp.add(lampPick);
    // 灯帽（课本第 18 页）：点燃前取下，放在灯的右后方桌上；熄灭时用灯帽盖灭，再轻提一下、重新盖好
    const capper = lampCap(group, lamp, { off: new THREE.Vector3(0.2, 0, -0.06) });
    let flameOn = false;                    // 火焰真的亮着：灯帽拿开了才亮，盖上了才灭
    const tile = inked(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.002, 0.085), paint(0xe6ded0)), { width: 0.8 }); tile.position.set(0.205, 0.001, 0.085); tile.rotation.y = -0.45; group.add(tile);
    const tongs = (color, shape) => {
      const g = new THREE.Group();
      const geo = shape === 'wood' ? new THREE.BoxGeometry(0.013, 0.009, 0.011) : shape === 'coal' ? new THREE.DodecahedronGeometry(0.0068, 0) : new THREE.IcosahedronGeometry(0.0064, 0);
      const piece = inked(new THREE.Mesh(geo, paint(color, { unique: true, keep: true })), { width: 0.7 });
      if (shape === 'coal') piece.scale.set(1, 0.78, 0.86), piece.rotation.set(0.4, 0.7, 0.2);
      if (shape === 'stone') piece.scale.set(1.12, 0.72, 0.9), piece.rotation.set(0.2, 1.1, 0.5);
      const arm = crucibleTongs();
      const glow = glowSprite(0xff6a2a, 0.03);
      const f = flame2({ w: 0.012, h: 0.034, core: 0xfff4d0, mid: 0xffb43c, edge: 0xff7420, glowK: 0.3 }); f.position.y = 0.004; f.setOn(false);
      const pick = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.018, 0.016), new THREE.MeshBasicMaterial({ visible: false })); pick.position.x = 0.03; pick.userData.pick = true;
      g.add(piece, arm, glow, f, pick);
      g.rotation.y = -0.45;                   // 钳柄朝右前方：像有人从右边拿着
      Object.assign(g, { piece, glow, flame: f, pick, base: new THREE.Color(color) });
      return g;
    };
    const wood = tongs(0xc99a5f, 'wood'), coal = tongs(0x2a2a30, 'coal'), stone = tongs(0x9a978f, 'stone');
    const HOME = { wood: new THREE.Vector3(0.165, 0.008, 0.05), coal: new THREE.Vector3(0.18, 0.008, 0.085), stone: new THREE.Vector3(0.195, 0.008, 0.12) };
    // 实验活动 4：小木块、小煤块分别用坩埚钳夹住，同时放到火焰上加热——两把钳子平行，一前一后夹在火焰两边（煤块在前，木块在后）
    const SIDE = new THREE.Vector3(-Math.sin(0.45), 0, Math.cos(0.45)), MID = new THREE.Vector3(LAMP.x, FLAME_Y, LAMP.z);      // SIDE：和钳柄垂直、朝左前的方向
    const HOLD = { wood: MID.clone().addScaledVector(SIDE, -0.011), coal: MID.clone().addScaledVector(SIDE, 0.011), stone: new THREE.Vector3(LAMP.x, FLAME_Y - 0.004, LAMP.z + 0.012) };
    const PIECES = { wood, coal, stone };
    for (const k in PIECES) { PIECES[k].position.copy(HOME[k]); group.add(PIECES[k]); }
    const inFlame = (g) => Math.abs(g.position.x - LAMP.x) < 0.02 && Math.abs(g.position.y - FLAME_Y) < 0.026;
    // 拿着钳子走：木块和煤块是一对（两把钳子一起拿、一起放），碎石单独。x、y 跟着手；抬高的同时往灯那边（往后）挪；
    // 离灯近的时候不低于灯和灯帽——不从灯上穿过去（dome：离灯轴 r 处钳子最低能到的高度，从灯帽顶上方平滑地降到桌面）
    const CREW = { pair: ['wood', 'coal'], stone: ['stone'] };
    const crewOf = (k) => (k === 'stone' ? 'stone' : 'pair');
    const dome = (r) => 0.094 * smooth((0.06 - r) / 0.0365);
    const placeTongs = (lead, x, y) => {
      const ks = CREW[crewOf(lead)], u = smooth((y - 0.035) / 0.055), P = {};
      for (const k of ks) P[k] = new THREE.Vector3(x + (HOME[k].x - HOME[lead].x) * (1 - u) + (HOLD[k].x - HOLD[lead].x) * u, 0, HOME[k].z + (HOLD[k].z - HOME[k].z) * u);
      const xs = ks.map((k) => P[k].x), dx = Math.max(0, 0.112 - Math.min(...xs)) + Math.min(0, 0.235 - Math.max(...xs));
      let yy = Math.max(0.008, y);
      for (const k of ks) { P[k].x += dx; yy = Math.max(yy, dome(Math.hypot(P[k].x - LAMP.x, P[k].z - LAMP.z))); }
      for (const k of ks) PIECES[k].position.set(P[k].x, yy, P[k].z);
    };
    // 松手以后：钳子从现在的位置滑到火焰上 / 滑回桌上（按“手”的位置滑，路线和拿着走时一样）
    const glide = { pair: null, stone: null };
    let pendingCrew = null;                  // “更多”按钮：等另一组钳子放回桌上，再把这一组放到火焰上
    const glideTo = (lead, to) => { const g = PIECES[lead]; glide[crewOf(lead)] = { lead, at: new THREE.Vector2(g.position.x, g.position.y), to: new THREE.Vector2(to.x, to.y) }; };
    const out = (c) => CREW[c].some((k) => PIECES[k].position.distanceTo(HOME[k]) > 0.002);        // 这一组钳子不在桌上
    const overLamp = () => Object.values(PIECES).some((g) => Math.hypot(g.position.x - LAMP.x, g.position.z - LAMP.z) < 0.03 && g.position.y > 0.05);     // 钳子正在灯上方：这时不能取下 / 盖上灯帽

    // ================= 左后：两支蜡烛和一只小烧杯 =================
    const c1 = chemCandle({ height: 0.05 }), c2 = chemCandle({ height: 0.05 });
    c1.position.copy(C1); c2.position.copy(C2); group.add(c1, c2);
    const cup = chemBeaker({ r: 0.022, h: 0.075, level: 0, marks: false });
    const cupLip = cup.children[1];
    const CUP_HOME = new THREE.Vector3(-0.19, 0, 0.02); cup.position.copy(CUP_HOME); group.add(cup);
    const cupPick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.08, 10), new THREE.MeshBasicMaterial({ visible: false })); cupPick.position.y = 0.04; cupPick.userData.pick = true; cup.add(cupPick);

    // ================= 火、烟、气泡、氧气 =================
    const fWT = flame2({ w: 0.016, h: 0.04, core: 0xffffff, mid: 0xfff0a8, edge: 0xffb84a, glowK: 0.55 }); fWT.position.copy(wTop.position).add(new THREE.Vector3(0, 0.001, 0)); fWT.setOn(false); plate.add(fWT);      // 白磷燃烧：很亮的黄白色火焰
    const flash = glowSprite(0xfff1c0, 0.05); flash.position.copy(wTop.position); flash.renderOrder = 13; plate.add(flash);        // 着火那一下的闪光
    const fWI = glowSprite(0xffb030, 0.03); fWI.renderOrder = 12; fWI.position.copy(wIn.position).add(new THREE.Vector3(0, 0.006, 0)); group.add(fWI);
    const fWIf = flame2({ w: 0.009, h: 0.02, core: 0xffffff, mid: 0xfff0a8, edge: 0xffb84a, glowK: 0.4 }); fWIf.position.copy(wIn.position); fWIf.setOn(false); group.add(fWIf);
    const smoke = smoke2({ max: 200, opacity: 0.85 }), smokeIn = smoke2({ max: 120, opacity: 0.7 }), smokeC = smoke2({ max: 40, color: 0xd9dbe0, opacity: 0.5 });      // 五氧化二磷：大量白烟；蜡烛熄灭后的一缕烟
    group.add(smoke.mesh, smokeIn.mesh, smokeC.mesh);
    const bubMat = bubble2(); bubMat.color?.setHex(0x9fcfff);                 // 通进去的是氧气：气泡带一点蓝
    const bubs = new Particles({ max: 160, geometry: new THREE.SphereGeometry(1, 10, 8), material: bubMat });
    group.add(bubs.mesh);
    const o2dots = new Particles({ max: 48, sprite: true, color: O2C });      // 罩住的烧杯里的氧气：一颗颗蓝点，越烧越少
    o2dots.mat.uniforms.map.value = canvasTex(64, 64, (g, W) => { const gr = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,1)'); gr.addColorStop(0.75, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, W); });      // 实心的小圆点，不是光晕
    o2dots.mesh.renderOrder = 10;
    group.add(o2dots.mesh);

    // ================= 观察卡：贴在每一处旁边（总结以后翻面变成条件签） =================
    const card = (o) => condCard(tag, o);
    const cards = {
      c2: card({ title: '蜡烛', ign: 1, showT: false, px: [-55, -62] }),
      c1: card({ title: '蜡烛', ign: 1, showT: false, px: [55, -62] }),
      wt: card({ title: '铜片上的白磷', ign: IGN.white, px: [-85, -58] }),
      rt: card({ title: '铜片上的红磷', ign: IGN.red, px: [85, -58] }),
      wi: card({ title: '热水中的白磷', ign: IGN.white, px: [-140, 6] }),
      wood: card({ title: '小木块', ign: IGN.wood, tmax: 600, px: [-95, -52] }),
      coal: card({ title: '小煤块', ign: IGN.coal, tmax: 700, px: [100, -62] }),
      stone: card({ title: '碎石', ign: null, tmax: 600, px: [110, 8] }),
    };

    const fresh = (Tw = 80) => ({
      Tw, Tc: 25, cold: Tw < 40, o2: false, plateOn: false, plateA: 1, plateFrom: PLATE_HOME.clone(), wt: { state: 'idle', t: 0 }, wi: { state: 'idle', t: 0 },
      lit: false, wood: { T: 25, burn: 0, hold: false }, coal: { T: 25, burn: 0, hold: false }, stone: { T: 25, burn: 0, hold: false },
      cov: 0, cupO2: 1, c1: true, c2: true, cOut: 0, seen: new Set(), rows: new Map(), snap: {}, near: false, revealed: false, heldOnce: {},
    });
    let S = fresh();
    let W = null, plateSnap = true;        // plateSnap：换一套器材时铜片直接摆好（平时没盖上就松手，滑回桌上）
    const status = (m) => { if (!S.demo) W?.status(m); };
    const row = (key, what, cond, res) => { if (S.rows.has(key)) return; S.rows.set(key, 1); W?.tbl.add([what, cond, res]); };

    // 器材的位置、颜色按 S 摆好（演示前后切换状态、重来时用）
    const applyState = () => {
      bubs.clear(); smoke.clear(); smokeIn.clear(); smokeC.clear(); o2dots.clear();
      if (S.o2) nozAt(NOZ_IN, true); else nozHome(true);
      plateSnap = true;
      glide.pair = glide.stone = null; pendingCrew = null;
      for (const k in PIECES) {
        const g = PIECES[k];
        g.position.copy(S[k].hold ? HOLD[k] : HOME[k]);
        g.piece.material.color.copy(g.base);
        if (k === 'wood' && S.wood.burn > 0) g.piece.material.color.lerpColors(g.base, new THREE.Color(0x3b2a1e), Math.min(1, S.wood.burn / 6));
      }
      capper.snap(S.lit); flameOn = S.lit;          // 换一套器材：灯帽直接摆好（点着的放在桌上，没点的盖在灯上）
      if (S.cov) { const c = S.cov === 2 ? C2 : C1; cup.position.set(c.x, 0.0765, c.z); cup.rotation.x = Math.PI; fillCup(c, Math.round(40 * S.cupO2)); }      // 蜡烛熄灭以后，罩子里也还剩不少氧气
      else { cup.position.copy(CUP_HOME); cup.rotation.x = 0; }
    };
    // 罩子里的氧气：蓝点，摆在蜡烛四周和上方的空处，各自在原地附近轻轻晃（±3.5 mm）——熄灭以后还剩约 3/4，一直留在杯里，不会飘出杯外
    const fillCup = (c, n) => {
      o2dots.clear();
      for (let i = 0; i < n; i++) {
        const top = i % 10 < 3, a = Math.random() * Math.PI * 2, r = top ? Math.random() * 0.016 : 0.0125 + Math.random() * 0.0035, y = top ? 0.058 + Math.random() * 0.008 : 0.012 + Math.random() * 0.044;
        const b = new THREE.Vector3(c.x + Math.cos(a) * r, y, c.z + Math.sin(a) * r);
        o2dots.spawn({ p: b.clone(), b, v: new THREE.Vector3(), life: 1e9, size: 0.0042, alpha: 0.9, ph: Math.random() * 6 });
      }
    };

    const A = {
      /** 换水 / 重新摆好烧杯这一边（木块、蜡烛那边的进度保留） */
      beaker(cold = S.cold) {
        const keep = { lit: S.lit, wood: S.wood, coal: S.coal, stone: S.stone, cov: S.cov, c1: S.c1, c2: S.c2, cupO2: S.cupO2, rows: S.rows, seen: S.seen, snap: S.snap, heldOnce: S.heldOnce, revealed: S.revealed, covSeen: S.covSeen, outAt: S.outAt, cOut: S.cOut };
        S = Object.assign(fresh(cold ? 20 : 80), keep); S.cold = cold;
        for (const k of ['wt', 'rt', 'wi']) { delete S.snap[k]; if (!S.revealed) cards[k].reset(); }
        bubs.clear(); smoke.clear(); smokeIn.clear(); nozHome(true); plateSnap = true;
      },
      water(cold) {
        A.beaker(cold);
        status(cold ? '换成了 <b>20 ℃ 的冷水</b>，铜片上、水里都重新放了白磷，铜片上也有红磷。把铜片盖上去，看看铜片上的白磷还燃不燃烧。' : '换回了 <b>80 ℃ 左右的热水</b>，重新放好了白磷和红磷。');
      },
      plate({ from } = {}) {
        if (S.plateOn) return;
        S.plateOn = true; S.plateA = 0; S.plateFrom = (from || S.plateDrag || plate.position).clone(); S.plateDrag = null;
        if (!S.demo) {
          status('盖好了薄铜片：一端是<b>红磷</b>，另一端是用滤纸吸干了水的<b>白磷</b>。');
          bar.say('铜片正被下面的热水慢慢烤热……盯着铜片两端的磷，和水里的白磷。');
          near(new THREE.Vector3(0, 0.1, 0), [0.1, 0.5, 1], 0.36);
        }
      },
      oxygen(on = !S.o2) { S.o2 = on; if (on) status('导管口对准热水中的白磷，通入<b>氧气</b>。'); },
      lamp() { S.lit = !S.lit; status(S.lit ? '取下灯帽，点燃了酒精灯。' : '用灯帽盖灭了酒精灯。'); },
      /** 一组钳子（木块和煤块一对；碎石）在火焰上松手：放在火焰上加热。酒精灯没点着就放回桌上 */
      hold(lead) {
        const ks = CREW[crewOf(lead)];
        if (!S.lit) { for (const k of ks) S[k].hold = false; glideTo(lead, HOME[lead]); bar.say('酒精灯还没点燃：先<b>点一下酒精灯</b>。'); return; }
        for (const k of ks) S[k].hold = true; glideTo(lead, HOLD[lead]);
      },
      /** 放回桌上 */
      putBack(lead) { for (const k of CREW[crewOf(lead)]) S[k].hold = false; glideTo(lead, HOME[lead]); },
      /** “更多”里的按钮：另一组钳子还在外面，先放回桌上，再把这一组放到火焰上 */
      toFlame(c) {
        if (!S.lit) return bar.say('酒精灯还没点燃：先<b>点一下酒精灯</b>。');
        const other = c === 'pair' ? 'stone' : 'pair';
        if (out(other) || glide[other]) { A.putBack(CREW[other][0]); pendingCrew = c; return; }
        A.hold(CREW[c][0]);
      },
      cover(which) {
        const c = which === 2 ? C2 : C1;
        if (!S['c' + which]) return bar.say('这支蜡烛已经灭了，罩另一支，或者在左边“更多”里全部重来。');
        S.cov = which; S.cupO2 = 1; S.covSeen = true;
        cup.position.set(c.x, 0.0765, c.z); cup.rotation.x = Math.PI; sfx.clink({ freq: 1800 });      // 倒扣：杯口刚好落在桌面上
        fillCup(c, 40);
        far(); near(new THREE.Vector3((C1.x + C2.x) / 2, 0.045, C1.z), [0.05, 0.25, 1], 0.3);
        status('罩住了一支蜡烛。罩子里的<b>蓝点</b>是里面的氧气——看着它们，和两支蜡烛的火焰。');
      },
      reset() {
        S = fresh(); applyState(); W?.tbl.clear();
        for (const c of Object.values(cards)) c.reset();
        if (W) { W.q.hidden = true; W.next.hidden = true; W.water.set(0); }
        bar.undo('plate', 'oxygen', 'heat', 'candle', 'sum'); far();
        status('全部重新摆好了，记录也清空了。');
      },
    };

    const drag = draggable(group, [
      { obj: platePick, plane: 'xy', offset: PLATE_HOME.z, keepOffset: true, anchor: plate, hint: () => (S.plateOn ? '' : '拖到烧杯上：盖上铜片'), enabled: () => !S.plateOn,
        onDrag: (p) => { if (S.plateOn) return; S.plateDrag = new THREE.Vector3(p.x, Math.max(0, p.y), PLATE_HOME.z); },
        onEnd: () => { const p = S.plateDrag; if (p && Math.abs(p.x) < 0.06 && p.y > BH - 0.05) A.plate(); else S.plateDrag = null; } },
      { obj: nzPick, plane: 'xy', offset: 0.004, hint: () => (S.o2 ? '拖出水面：停止通氧气' : '拖到热水中的白磷上：通入氧气'),
        onDrag: (p) => { nozAt(new THREE.Vector3(clamp(p.x, -0.06, 0.12), clamp(p.y, 0.012, 0.2), p.z)); },      // 学生拖的时候 p.z = 0.004；演示里从烧杯前沿（铜片没盖住的地方）伸下去
        onEnd: () => { if (noz.p.distanceTo(NOZ_IN) < 0.03) { nozAt(NOZ_IN); A.oxygen(true); } else { A.oxygen(false); nozHome(); } } },
      { obj: lampPick, plane: 'xy', offset: 0, enabled: () => !overLamp(), hint: () => (overLamp() ? '' : S.lit ? '点一下：盖上灯帽，熄灭酒精灯' : '点一下：点燃酒精灯'), onTap: () => A.lamp(), onStart: () => {}, onDrag: () => {}, onEnd: () => {} },
      // 坩埚钳：拿木块、煤块中的任一把，两把一起走（同时放到火焰上）；碎石单独。另一组还在外面的时候拿不了（火焰上放不下两组）
      ...Object.entries(PIECES).map(([k, g]) => {
        const c = crewOf(k), other = c === 'pair' ? 'stone' : 'pair', busy = () => out(other) || !!glide[other];
        return { obj: g.pick, anchor: g, keepOffset: true, plane: 'xy', offset: LAMP.z, enabled: () => !busy(),
          hint: () => (busy() ? '' : S[k].hold ? (c === 'pair' ? '拖开：把木块和煤块从火焰上拿开' : '拖开：把碎石从火焰上拿开') : c === 'pair' ? '拖到酒精灯火焰上：同时加热小木块和小煤块' : '拖到酒精灯火焰上：加热碎石'),
          onStart: () => { glide[c] = null; },
          onDrag: (p) => { glide[c] = null; placeTongs(k, p.x, p.y); for (const j of CREW[c]) S[j].hold = inFlame(PIECES[j]); },
          onEnd: () => { if (inFlame(g)) A.hold(k); else A.putBack(k); } };
      }),
      { obj: cupPick, anchor: cup, plane: 'xy', offset: CUP_HOME.z, keepOffset: true, hint: () => (S.cov ? '拖开：拿掉烧杯' : '拖到一支蜡烛上：倒扣罩住'),
        onStart: () => { if (S.cov) { S.cov = 0; o2dots.clear(); } },
        onDrag: (p) => { cup.position.set(p.x, Math.max(0, p.y), CUP_HOME.z); cup.rotation.x = Math.PI * clamp((p.x - CUP_HOME.x) / 0.04, 0, 1); },
        onEnd: () => { const x = cup.position.x; const which = Math.abs(x - C1.x) < 0.025 ? 1 : Math.abs(x - C2.x) < 0.025 ? 2 : 0; if (which) A.cover(which); else { cup.position.copy(CUP_HOME); cup.rotation.x = 0; } } },
    ], { tip: tag('', 'pill') });
    const pointer = {
      down: (r, e) => { if (bar.playing) { bar.stop(); return true; } return drag.down(r, e); },
      move: (r, e) => drag.move(r, e),
      up: (r, e) => drag.up(r, e),
      items: drag.items,
    };

    // 演示：沿折线拖过去（先抬起来、越过杯口、再伸下去——直线会从烧杯壁、铜片上穿过去）
    const act = demoActs(drag, group);
    const carry = (obj, pts, o = {}) => act.path(obj, pts, { release: (o.t1 ?? 0.5) + 0.02, ...o });      // 沿几个点拿过去（kit/chemlesson.js 的 act.path；这一课默认走到就松手）
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const PLATE_OVER = V(0, BH + 0.035, PLATE_HOME.z);                     // 铜片拿到烧杯前上方，松手就盖上去
    const NOZ_PATH = [() => nozzle.position.clone(), V(NOZ_HOME.x, 0.15, NOZ_HOME.z), V(0, 0.15, 0.034), V(0, 0.03, 0.034), NOZ_IN];      // 拿起导管，越过杯口，从前沿伸进水里，再挪到白磷旁边

    // ================= 底部步骤栏 + 两段放映：老师的演示（独立的一套器材），和最后的总结 =================
    let saved = null, savedModel = null;
    const tourFlip = (keys) => keys.forEach((k, i) => { if (cards[k].visible && !cards[k].model) cards[k].reveal(0.15 + i * 0.3, i); });
    const bar = lessonBar({
      look, back, group,         // group：提示光圈画在这一组里
      steps: [
        { id: 'plate', title: '盖上铜片', todo: '把桌上的<b>薄铜片</b>拖到烧杯上盖好，看看哪一处的磷会燃烧。', target: () => (S.plateOn ? null : plate) },
        { id: 'oxygen', title: '通入氧气', todo: '热水中的白磷够热，却不燃烧——它缺什么？把<b>导管</b>拖进水里，对准它。', target: () => (S.o2 ? null : nozzle) },
        { id: 'heat', title: '加热木块、煤块、碎石', todo: '点一下<b>酒精灯</b>点燃它。用两把坩埚钳分别夹住<b>小木块和小煤块</b>，<b>同时</b>放到火焰上加热；再加热<b>碎石</b>。',
          target: () => {
            if (!S.lit) return lamp;
            if (!S.seen.has('wood') || !S.seen.has('coal')) return out('stone') ? stone.piece : S.wood.hold ? null : wood.piece;       // 碎石在外面：先放回去
            if (!S.seen.has('stone')) return out('pair') ? wood.piece : S.stone.hold ? null : stone.piece;                              // 木块、煤块还在外面：先放回去
            return null;
          } },
        { id: 'candle', title: '罩住一支蜡烛', todo: '把<b>小烧杯</b>倒过来，扣在一支蜡烛上，比较两支蜡烛。', target: () => (S.cov ? null : cup) },
        { id: 'sum', title: '想一想', todo: '对照每一处的卡片想一想：燃烧需要哪些条件？在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          onStart: () => {
            if (!saved) { saved = S; savedModel = Object.fromEntries(Object.entries(cards).map(([k, c]) => [k, c.model])); }
            S = fresh(); S.demo = true; S.near = false;
            for (const c of Object.values(cards)) c.model = false;
            applyState();
          },
          onEnd: () => {
            if (!saved) return;
            S = saved; saved = null; S.near = false;
            for (const [k, m] of Object.entries(savedModel)) cards[k].model = m;
            applyState();
            bar.say('演示看完了。桌上的器材和记录还是你自己的那一套——接着往下做。', bar.current || 'end');
            setTimeout(() => bar.say(null), 4000);
          },
          shots: [
            { cap: '烧杯里是 80 ℃ 左右的热水，水底有一小块白磷。', dur: 3.0, cam: (k) => [[0, 0.04, 0], [0.3, 0.2, 1], 0.34 - 0.06 * k] },
            { cap: '把薄铜片盖到烧杯上：一端放白磷，一端放红磷。', dur: 3.2, cam: [[0, 0.1, 0.01], [0.15, 0.55, 1], 0.44],
              during: carry(platePick, [() => plate.position.clone(), V(PLATE_HOME.x, BH + 0.035, PLATE_HOME.z), PLATE_OVER], { t0: 0.04, t1: 0.5 }) },
            { cap: '铜片被下面的热水慢慢烤热……', dur: 3.0, cam: (k) => [[0, 0.122, 0], [0.05, 0.55, 1], 0.27 - 0.05 * k], speed: 1.6 },
            { cap: '白磷燃烧起来，冒出大量白烟——同一块铜片上的红磷却不燃烧。', dur: 4.2, cam: [[0, 0.13, 0], [0.4, 0.38, 1], 0.36] },
            { cap: '水里的白磷：一样热，却不燃烧。', dur: 3.0, cam: [[0, 0.03, 0], [0.12, 0.02, 1], 0.24] },
            { cap: '用导管给它通入氧气——', dur: 4.6, cam: [[0.02, 0.07, 0.02], [0.35, 0.3, 1], 0.4], during: carry(nzPick, NOZ_PATH, { t0: 0.04, t1: 0.78 }) },
            { cap: '白磷在水里燃烧起来了。', dur: 3.4, cam: [[0, 0.03, 0], [0.2, 0.1, 1], 0.26] },
            // 实验活动 4（第 181 页）：取下灯帽点燃酒精灯；两把坩埚钳夹住木块、煤块，同时放到火焰上；再加热碎石；用完用灯帽盖灭
            { cap: '取下灯帽，点燃酒精灯。', dur: 2.6, cam: [[LAMP.x, 0.075, LAMP.z], [0.12, 0.3, 1], 0.3], during: act.tap(lampPick, 0.12) },
            { cap: '用两把坩埚钳分别夹住小木块和小煤块，同时放到酒精灯火焰上加热。', dur: 4.2, cam: [[LAMP.x + 0.015, 0.075, LAMP.z + 0.03], [0.15, 0.3, 1], 0.34],
              during: carry(wood.pick, [() => wood.position.clone(), V(HOME.wood.x, 0.115, 0), V(HOLD.wood.x, 0.115, 0), HOLD.wood], { t0: 0.05, t1: 0.7 }) },
            { cap: '小木块很快燃烧起来；同时加热的小煤块烧得发红，却不燃烧。', dur: 5, speed: 2, cam: [[LAMP.x, 0.095, LAMP.z], [0.1, 0.25, 1], 0.22] },
            { cap: '把木块、煤块放回桌上，再用坩埚钳把碎石放到火焰上加热：碎石烧热了，也不燃烧。', dur: 7, speed: 1.5, cam: [[LAMP.x + 0.02, 0.07, LAMP.z + 0.04], [0.15, 0.3, 1], 0.36],
              during: act.seq(carry(wood.pick, [() => wood.position.clone(), V(HOLD.wood.x, 0.115, 0), V(HOME.wood.x, 0.115, 0), HOME.wood], { t0: 0.03, t1: 0.28 }),
                carry(stone.pick, [() => stone.position.clone(), V(HOME.stone.x, 0.115, 0), V(HOLD.stone.x, 0.115, 0), HOLD.stone], { t0: 0.34, t1: 0.6 })) },
            { cap: '把碎石放回桌上。用灯帽盖灭酒精灯，再轻提一下灯帽，重新盖好。演示完了，下面换你自己做。', dur: 5, cam: [[LAMP.x + 0.02, 0.07, LAMP.z + 0.04], [0.15, 0.3, 1], 0.36],
              during: act.seq(carry(stone.pick, [() => stone.position.clone(), V(HOLD.stone.x, 0.115, 0), V(HOME.stone.x, 0.115, 0), HOME.stone], { t0: 0.03, t1: 0.35 }), act.tap(lampPick, 0.45)) },
          ],
        },
        tour: {
          seal: '总结', label: '总结',
          onStart: () => document.body.classList.add('cards-force'),      // 总结镜头讲的就是卡片：卡片关着也要显示
          onEnd: () => { document.body.classList.remove('cards-force'); for (const c of Object.values(cards)) if (c.visible) c.model = true; bar.say('燃烧需要三个条件：<b>可燃物</b>、<b>氧气（或空气）</b>、<b>温度达到着火点</b>，缺一不可。掀开左边的结论看看。', 'end'); },
          shots: [
            { cap: '铜片上：白磷三个条件都满足，燃烧；红磷温度没到它的着火点（260 ℃）。', dur: 3.6, cam: [[0, 0.13, 0], [0.15, 0.45, 1], 0.42], enter: () => tourFlip(['wt', 'rt']) },
            { cap: '热水中的白磷：缺氧气就不燃烧，通入氧气就在水里燃烧。', dur: 3.2, cam: [[0, 0.03, 0], [0.25, 0.18, 1], 0.36], enter: () => tourFlip(['wi']) },
            { cap: '同样在火上加热：木块达到着火点燃烧；煤块的着火点高，没达到；碎石不是可燃物。', dur: 4.2, cam: [[LAMP.x + 0.02, 0.09, LAMP.z], [0.1, 0.35, 1], 0.42], enter: () => tourFlip(['wood', 'coal', 'stone']) },
            { cap: '罩住的蜡烛：氧气减少到一定程度（氧气不足），就熄灭了。灭火，只要破坏其中一个条件。', dur: 3.6, cam: [[(C1.x + C2.x) / 2, 0.05, C1.z], [0.05, 0.3, 1], 0.38], enter: () => tourFlip(['c1', 'c2']) },
            { cap: '燃烧需要三个条件：可燃物、氧气（或空气）、温度达到着火点，缺一不可。', dur: 3.4 },
          ],
        },
      },
    });

    // ================= 每帧 =================
    const tmp = new THREE.Vector3();
    const step = (h, t) => {
      // 水慢慢变凉（80 ℃ 起，1 分钟大约降 5 ℃）；铜片跟着水温变（时间常数约 14 秒）
      S.Tw += (22 - S.Tw) * h * 0.0015;
      S.Tc += ((S.plateOn ? S.Tw - 3 : 25) - S.Tc) * Math.min(1, h / 14);
      therm.setTemp(S.Tw);
      // 铜片：拖着走 / 盖上去时划一道弧落到杯口，轻轻弹一下
      if (S.plateOn) {
        const k0 = S.plateA; S.plateA += h / 0.5;
        const k = Math.min(1, S.plateA);
        plate.position.lerpVectors(S.plateFrom, PLATE_ON, easeOut(k));
        plate.position.y += Math.sin(Math.PI * k) * 0.035;
        if (k0 < 1 && S.plateA >= 1) sfx.clink();
        const after = S.plateA - 1;
        if (after > 0) plate.position.y += 0.003 * Math.exp(-after * 9) * Math.abs(Math.sin(after * 26));
      } else if (S.plateDrag || plateSnap) plate.position.copy(S.plateDrag || PLATE_HOME);
      else plate.position.lerp(PLATE_HOME, 0.22);
      plateSnap = false;
      nozStep();
      const heat = clamp((S.Tc - 25) / 55, 0, 1);
      copperMat.color.lerpColors(COPPER, COPPER_HOT, heat);
      copperMat.emissive.setRGB(0.32 * heat, 0.1 * heat, 0.01 * heat);
      // 热气：水越热越明显；铜片盖上以后从两侧边缘冒出来
      const hw = clamp((S.Tw - 40) / 40, 0, 1);
      for (const m of wisps) {
        const k = (t * 0.32 + m.userData.ph) % 1, a = m.userData.a;
        m.position.set(Math.cos(a) * BR * 0.75, BH + 0.012 + k * 0.05, Math.sin(a) * BR * 0.75);
        m.material.opacity = Math.sin(Math.PI * k) * 0.32 * hw * (S.plateOn ? 0.6 : 1);
      }
      // 铜片上的白磷：有空气（氧气），温度达到 40 ℃ 就燃烧（先冒一点烟，再“呼”地着起来）
      const P = S.wt;
      if (P.state === 'idle' && S.Tc >= IGN.white) { P.state = 'smoulder'; P.t = 0; }
      if (P.state === 'smoulder') { P.t += h; if (P.t > 0.7) { P.state = 'burn'; P.t = 0; sfx.whoosh(); } }
      else if (P.state === 'burn') { P.t += h; if (P.t > 6) P.state = 'done'; }
      fWT.setOn(P.state === 'burn');
      fWT.setSize(P.state === 'burn' ? backOut(Math.min(1, P.t * 2.2)) * (P.t > 5 ? 6 - P.t : 1) : 0); fWT.update(t);
      flash.material.opacity = P.state === 'burn' ? Math.max(0, 1 - P.t * 3.5) : 0; flash.scale.setScalar(0.03 + Math.min(1, P.t * 4) * 0.05);
      wTop.visible = P.state !== 'done'; wTop.scale.setScalar(P.state === 'burn' ? Math.max(0.3, 1 - P.t / 6) : 1); wTop.scale.y *= 0.6;
      smoke.update(h, { rate: P.state === 'burn' ? 40 : P.state === 'smoulder' ? 7 : 0, origin: tmp.copy(plate.position).add(wTop.position).add(new THREE.Vector3(0, 0.006, 0)), spread: 0.01, up: 0.05, size: 0.02 });
      // 水里的白磷：没有氧气不燃烧；通入氧气、温度够了就在水里燃烧
      const Q = S.wi;
      if (S.o2) { S.bacc = (S.bacc || 0) + h * 26; while (S.bacc > 1) { S.bacc -= 1; bubs.spawn({ p: NOZ_IN.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.004, 0.002, 0)), v: new THREE.Vector3(0, 0.03, 0), size: 0.0018 + Math.random() * 0.001, life: 4 }); } }
      if (Q.state === 'idle' && S.o2 && S.Tw >= IGN.white) { Q.state = 'burn'; Q.t = 0; sfx.whoosh({ freq: 300, gain: 0.16 }); }
      if (Q.state === 'burn') { Q.t += h; if (!S.o2) Q.state = 'idle'; if (Q.t > 7) Q.state = 'done'; }
      const qb = Q.state === 'burn';
      fWI.material.opacity = qb ? 0.9 + Math.sin(t * 31) * 0.1 : 0; fWI.scale.setScalar(qb ? 0.05 + Math.sin(t * 25) * 0.008 : 0.03);
      fWIf.setOn(qb); fWIf.setSize(qb ? Math.min(1, Q.t * 2) * (0.85 + Math.sin(t * 19) * 0.15) : 0); fWIf.update(t);
      wIn.visible = Q.state !== 'done';
      smokeIn.update(h, { rate: qb ? 18 : 0, origin: tmp.set(0, WATER_H + 0.004, 0), spread: 0.02, up: 0.05, size: 0.018 });
      bubs.update(h, (p, d) => { p.v.y += 0.2 * d; p.p.addScaledVector(p.v, d); return p.p.y < WATER_H; });
      // 坩埚钳：松手以后滑到火焰上 / 滑回桌上
      for (const c of ['pair', 'stone']) {
        const G = glide[c]; if (!G) continue;
        G.at.lerp(G.to, 1 - Math.exp(-h * 14));
        if (G.at.distanceTo(G.to) < 0.0004) { G.at.copy(G.to); glide[c] = null; }
        placeTongs(G.lead, G.at.x, G.at.y);
      }
      if (pendingCrew && !glide.pair && !glide.stone && !out(pendingCrew === 'pair' ? 'stone' : 'pair')) { const c = pendingCrew; pendingCrew = null; A.toFlame(c); }
      flameOn = capper.update(h, S.lit);        // 灯帽：点燃前取下放到桌上；熄灭时盖上，再轻提一下、重新盖好
      lamp.flame.setOn(flameOn); lamp.flame.update(t);
      // 木块、煤块、碎石：火焰真的亮着、夹在火焰上才受热
      for (const [k, g] of Object.entries(PIECES)) {
        const o = S[k];
        const hot = o.hold && flameOn && inFlame(g);
        if (hot) S.heldOnce[k] = true;
        o.T += ((hot ? FLAME_T : 25) - o.T) * Math.min(1, h * (hot ? (k === 'wood' ? 0.35 : 0.22) : 0.15));
        if (IGN[k] && o.T >= IGN[k] && hot && o.burn === 0) { o.burn = 0.01; sfx.whoosh({ freq: 420, gain: 0.14, dur: 0.6 }); }      // 碎石没有着火点：不是可燃物
        if (o.burn > 0) o.burn += h;
        g.flame.setOn(o.burn > 0 && o.burn < 30); g.flame.setSize(Math.min(1, o.burn * 1.5)); g.flame.update(t);
        g.glow.material.opacity = clamp((o.T - 300) / 300, 0, 0.7) * (o.burn > 0 ? 0 : 1);
        if (k === 'wood' && o.burn > 0) g.piece.material.color.lerpColors(g.base, new THREE.Color(0x3b2a1e), Math.min(1, o.burn / 6));      // 慢慢烧黑
      }
      cupLip.visible = Math.abs(cup.rotation.x) < 1.6;      // 倒扣时杯嘴那段翻边（往上翘 7 mm）不画：否则会戳进桌面
      // 蜡烛：罩住以后罩子里的氧气越来越少（蓝点一颗颗消失），火焰变小；氧气减少到原来的约 3/4（体积分数约 16%）就熄灭了，
      // 冒出一缕烟——罩子里还剩不少氧气（蓝点还剩约 3/4）
      if (S.cov && S['c' + S.cov]) {
        S.cupO2 = Math.max(O2_OUT, S.cupO2 - h * O2_USE);
        const want = Math.round(40 * S.cupO2);
        while (o2dots.list.length > want) o2dots.list.splice((Math.random() * o2dots.list.length) | 0, 1);
        if (S.cupO2 <= O2_OUT) { S['c' + S.cov] = false; S.cOut = 2.5; S.outAt = S.cov === 2 ? C2 : C1; }
      }
      o2dots.update(h, (p) => { p.p.set(p.b.x + Math.sin(t * 1.3 + p.ph) * 0.0035, p.b.y + Math.cos(t * 1.1 + p.ph * 1.7) * 0.0035, p.b.z); p.alpha = 0.9; });
      const fk = (n) => (S.cov === n ? 0.3 + 0.7 * smooth((S.cupO2 - O2_OUT) / (1 - O2_OUT)) : 1);      // 罩住的那支：氧气越少火焰越小
      const k1 = fk(1), k2 = fk(2);
      c1.flame.setOn(S.c1); c1.flame.setSize(k1); c1.flame.update(t);
      c2.flame.setOn(S.c2); c2.flame.setSize(k2); c2.flame.update(t + 1.3);
      if (S.cOut > 0) S.cOut -= h;
      smokeC.update(h, { rate: S.cOut > 0 ? 9 : 0, origin: S.outAt ? tmp.copy(S.outAt).add(new THREE.Vector3(0, 0.054, 0)) : null, spread: 0.002, up: 0.025, size: 0.006, life: 2 });
      bar.near(S.near);
      if (W && !S.demo) record(P, Q, h);
      placeCards();
    };

    // 记录和进度（演示的时候不记）
    const record = (P, Q, h) => {
      const hot = !S.cold, T = (x) => `${Math.round(x)} ℃`;
      if (P.state === 'burn' && P.t > 0.6 && !S.seen.has('wt' + S.cold)) { S.seen.add('wt' + S.cold); S.snap.wt = { T: S.Tc, o2: 'air', burn: true }; row('wt' + S.cold, '铜片上的白磷', `${T(S.Tc)}，有空气`, '<b>燃烧</b>，产生白烟'); if (hot) status('铜片上的<b>白磷燃烧</b>起来，产生大量白烟。再看看另一端的<b>红磷</b>，和热水里的<b>白磷</b>。'); }
      if (P.state === 'burn' && P.t > 2.2 && !S.seen.has('red' + S.cold) && hot) { S.seen.add('red' + S.cold); S.snap.rt = { T: S.Tc, o2: 'air', burn: false }; row('red', '铜片上的红磷', `${T(S.Tc)}，有空气`, '不燃烧'); }
      if (S.Tw > 60 && P.state === 'burn' && P.t > 3 && !S.o2 && !S.seen.has('wi0')) { S.seen.add('wi0'); S.snap.wi = { T: S.Tw, o2: 'none', burn: false }; row('wi0', '热水中的白磷', `${T(S.Tw)}，没有氧气`, '不燃烧'); S.backT = 2.5; }
      // 三处都看清楚了：过一会儿镜头退回整套器材
      if (S.backT > 0 && (S.backT -= h) <= 0) { far(); status('铜片上的白磷燃烧，红磷不燃烧；热水中的白磷也够热，却不燃烧。'); }
      if (S.seen.has('wt' + false) && S.seen.has('red' + false) && S.seen.has('wi0')) bar.done('plate');
      if (Q.state === 'burn' && Q.t > 0.8 && !S.seen.has('wi1' + S.cold)) {
        S.seen.add('wi1' + S.cold); S.snap.wi = { T: S.Tw, o2: 'pure', burn: true, note: S.seen.has('wi0') ? '通氧气前：不燃烧' : '' };
        row('wi1', '热水中的白磷', `${T(S.Tw)}，通入氧气`, '<b>在水中燃烧</b>'); bar.done('oxygen');
        status('通入氧气，热水中的白磷<b>在水里燃烧</b>起来了！它原来缺的就是氧气。');
      }
      if (S.cold && S.Tc < 30 && S.o2 && !S.seen.has('coldO2')) { S.seen.add('coldO2'); S.snap.wi = { T: S.Tw, o2: 'pure', burn: false }; row('coldO2', '冷水中的白磷', `${T(S.Tw)}，通入氧气`, '不燃烧'); status('冷水里，通了氧气，白磷也<b>不燃烧</b>——温度太低了。'); }
      if (S.cold && S.plateOn && !S.seen.has('coldTop') && S.Tc < 30 && (S.coldT = (S.coldT || 0) + h) > 4) { S.seen.add('coldTop'); S.snap.wt = { T: S.Tc, o2: 'air', burn: false }; row('coldTop', '冷水上方铜片上的白磷', `${T(S.Tc)}，有空气`, '不燃烧'); status('冷水上方的铜片只有二十几摄氏度，铜片上的白磷<b>不燃烧</b>。'); }
      if (S.wood.burn > 0.5 && !S.seen.has('wood')) { S.seen.add('wood'); S.snap.wood = { T: S.wood.T, o2: 'air', burn: true }; row('wood', '小木块（和煤块同时加热）', '有空气，在火焰上加热', '<b>很快燃烧</b>'); status('小木块很快就<b>燃烧</b>起来了。'); }
      if (S.coal.hold && flameOn) S.coalT = (S.coalT || 0) + h;
      if (S.coal.hold && flameOn && S.coal.T > 420 && S.coalT > 6 && !S.seen.has('coal')) { S.seen.add('coal'); S.snap.coal = { T: S.coal.T, o2: 'air', burn: false }; row('coal', '小煤块（和木块同时加热）', '有空气，在火焰上加热同样长时间', '发红，<b>不燃烧</b>'); status('同时加热的小煤块烧得发红，却<b>没有燃烧</b>。'); }
      if (S.stone.hold && flameOn) S.stoneT = (S.stoneT || 0) + h;
      if (S.stone.hold && flameOn && S.stoneT > 5 && !S.seen.has('stone')) { S.seen.add('stone'); S.snap.stone = { T: S.stone.T, o2: 'air', burn: false }; row('stone', '碎石（同样加热）', '有空气，在火焰上加热', '烧热了，<b>不燃烧</b>'); status('碎石怎么加热也<b>不燃烧</b>。'); }
      if (bar.current === 'heat') {
        const pairDone = S.seen.has('wood') && S.seen.has('coal');
        const msg = !S.lit ? null
          : !pairDone ? (out('stone') ? '先把<b>碎石</b>放回桌上，再用两把坩埚钳夹住<b>小木块和小煤块</b>，同时放到火焰上加热。' : S.wood.hold ? null : '酒精灯点着了。用两把坩埚钳夹住<b>小木块和小煤块</b>，同时放到火焰上加热。')
            : !S.seen.has('stone') ? (out('pair') ? '把木块、煤块放回桌上，再用坩埚钳把<b>碎石</b>夹到火焰上加热。' : S.stone.hold ? null : '再用坩埚钳把<b>碎石</b>夹到火焰上加热。') : null;
        if (msg !== S.heatMsg) { S.heatMsg = msg; bar.say(msg); }
      }
      if (S.seen.has('wood') && S.seen.has('coal') && S.seen.has('stone')) bar.done('heat');
      const outK = !S.c1 ? 1 : !S.c2 ? 2 : 0;
      if (outK && !S.seen.has('candle')) { S.seen.add('candle'); row('candle', '用烧杯罩住的蜡烛', '烧杯里的氧气减少到一定程度（氧气不足）', '<b>熄灭</b>'); row('candle2', '没罩的蜡烛', '有空气', '继续燃烧'); bar.done('candle'); status('罩住的蜡烛<b>熄灭</b>了，旁边那支照样燃烧。罩子里的氧气减少到一定程度（<b>氧气不足</b>），蜡烛就熄灭了。'); }
      if (bar.current === 'sum' && W.q.hidden && !S.asked) { S.asked = true; far(); W.ask(); }
    };

    // 观察卡：钉在每一处东西上（卡片在它旁边固定的几十像素处）；记下来的那一刻定格
    const placeCards = () => {
      const pp = plate.position, sn = S.snap;
      const live = { wt: { T: S.Tc, o2: 'air', burn: null }, rt: { T: S.Tc, o2: 'air', burn: null }, wi: { T: S.Tw, o2: S.o2 ? 'pure' : 'none', burn: S.wi.state !== 'idle' ? true : null } };
      if (S.demo) { if (S.wt.state === 'burn' || S.wt.state === 'done') live.wt.burn = true; if ((S.wt.state === 'burn' && S.wt.t > 2) || S.wt.state === 'done') live.rt.burn = false; if (S.wi.state === 'idle' && S.wt.state !== 'idle') live.wi.burn = false; }
      for (const k of ['wood', 'coal', 'stone']) live[k] = { T: S[k].T, o2: 'air', burn: S[k].burn > 0 ? true : null };
      const use = (k) => (S.demo ? live[k] : sn[k] || live[k]);
      cards.wt.set(use('wt')).loc(group, pp.x + wTop.position.x, pp.y + 0.006, pp.z).show(S.plateOn);
      cards.rt.set(use('rt')).loc(group, pp.x + rTop.position.x, pp.y + 0.008, pp.z).show(S.plateOn);
      cards.wi.set(use('wi')).loc(group, 0, 0.012, 0).show(true);
      for (const k of ['wood', 'coal', 'stone']) {
        const g = PIECES[k];
        cards[k].set(use(k)).loc(group, g.position.x, g.position.y + 0.006, g.position.z).show(!!S.heldOnce[k] || !!sn[k]);
      }
      for (const [n, c] of [[1, C1], [2, C2]]) {
        const covered = S.cov === n || (!S['c' + n] && S.outAt === c);
        const st = { o2: covered ? (S['c' + n] ? 'less' : 'gone') : 'air', burn: S['c' + n] ? true : 'out', hot: S['c' + n], title: covered ? '罩住的蜡烛' : '没罩的蜡烛' };
        cards['c' + n].set(st).loc(group, c.x, 0.075, c.z).show(!!S.covSeen);
      }
    };

    return {
      group: root,
      pointer,
      card: false,                 // 不要实验台板：器材直接立在课本这一页上
      toggles: ['cards', 'steps'],  // 右下角的显示开关：观察卡片、底部步骤栏
      size: { w: 0.5, d: 0.22, h: 0.2 },
      view: { elev: 28, azim: -6, lookY: 0.4, frameMargin: 1.02 },
      mount(ui) {
        ui.el.classList.add('xuean');
        // 想一想：先摆出学生自己记下的现象，再问
        const ctxEl = h('div', { class: 'sum-ctx' });
        const opts = buttons(['可燃物；氧气（或空气）；温度达到着火点——三个条件缺一不可', '只要有可燃物和氧气就能燃烧', '只要温度够高就能燃烧'].map((t, j) => ({ text: t, ghost: true, onClick: () => {
          if (j === 1) return status('看<b>铜片上的红磷</b>：它是可燃物，也接触空气，却不燃烧——还差什么？');
          if (j === 2) return status('看<b>热水中的白磷</b>：温度够了，没有氧气也不燃烧。');
          q.hidden = true; next.hidden = false; S.revealed = true;
          bar.done('sum');
          status('对。看下面的总结镜头：每一处的卡片翻过来，对着这三个条件。');
          bar.play('tour');
        } })));
        opts.el.dataset.keep = '1';
        const q = h('div', { class: 'think', hidden: true }, h('div', { class: 'think-t' }, '想一想'), ctxEl, h('p', { class: 'think-q' }, '燃烧的和不燃烧的，差在哪里？燃烧需要——'), opts.el);
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const ask = () => {
          const name = { wt: '铜片上的白磷', rt: '铜片上的红磷', wood: '小木块', coal: '小煤块', stone: '碎石' };
          const yes = [], no = [];
          for (const k of ['wt', 'rt', 'wood', 'coal', 'stone']) if (S.snap[k]) (S.snap[k].burn ? yes : no).push(name[k]);
          if (S.seen.has('wi0')) no.push('热水中的白磷（通氧气前）');
          if (S.seen.has('wi1false')) yes.push('热水中的白磷（通氧气后）');
          if (S.seen.has('candle')) { yes.push('没罩的蜡烛'); no.push('罩住的蜡烛（熄灭了）'); }
          ctxEl.innerHTML = `<div><b class="y">燃烧的：</b>${yes.join('、')}</div><div><b class="n">不燃烧的：</b>${no.join('、')}</div>`;
          q.hidden = false;
          status('四件事都做完了。对照你记下的，回答下面的问题。');
        };
        const tbl = table(['对象', '条件', '现象']);
        const water = seg('', ['热水（约 80 ℃）', '冷水（约 20 ℃）'], (_, k) => A.water(!!k));
        const vary = h('details', { class: 'more' }, h('summary', {}, '换个条件再试'), h('p', { class: 'fineprint' }, '把烧杯里的热水换成冷水，再盖上铜片：铜片上的白磷还会燃烧吗？（课本上没有这一步，用来单独改变“温度”。）'), water.el);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'),
          buttons([
            { text: '把铜片盖到烧杯上', ghost: true, onClick: () => A.plate() },
            { text: '向水中的白磷通氧气', ghost: true, onClick: () => { nozAt(NOZ_IN, true); A.oxygen(true); } },
            { text: '停止通氧气', ghost: true, onClick: () => { nozHome(true); A.oxygen(false); } },
            { text: '点燃酒精灯', ghost: true, onClick: () => { if (!S.lit) A.lamp(); } },
            { text: '同时加热小木块和小煤块', ghost: true, onClick: () => A.toFlame('pair') },
            { text: '加热碎石', ghost: true, onClick: () => A.toFlame('stone') },
            { text: '用烧杯罩住一支蜡烛', ghost: true, onClick: () => A.cover(1) },
          ]).el,
          buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const safe = h('p', { class: 'fineprint warn', html: '课本提示：白磷有毒，烧杯中的实验由教师演示，在通风橱中进行。加热时要从侧面观察，防止烧伤。' });
        ui.controls.append(q, next, vary, more, safe);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, q, next, water, ask, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('课本上，烧杯里的白磷实验由老师演示。可以先看演示（下方 <b>▶ 看老师演示</b>），也可以直接动手。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { document.body.classList.remove('cards-force'); bar.dispose(); bubs.dispose(); smoke.dispose(); smokeIn.dispose(); smokeC.dispose(); o2dots.dispose(); },
      debug: { get S() { return S; }, A, bar, wood, coal, cup, cards, picks: { plate: platePick, nozzle: nzPick, lamp: lampPick, wood: wood.pick, coal: coal.pick, stone: stone.pick, cup: cupPick },
        qa: qaFlow(drag, [
          { name: '盖上铜片', drag: platePick, to: PLATE_OVER, wait: 12 },
          { name: '导管伸进水里通氧气', drag: nzPick, to: NOZ_IN, wait: 3 },
          { name: '点燃酒精灯', tap: lampPick },
          { name: '同时加热木块和煤块', drag: wood.pick, to: HOLD.wood, wait: 7 },
          { name: '木块和煤块放回去', drag: coal.pick, to: HOME.coal },
          { name: '加热碎石', drag: stone.pick, to: HOLD.stone, wait: 7 },
          { name: '碎石放回去', drag: stone.pick, to: HOME.stone },
          { name: '盖灭酒精灯', tap: lampPick },
          { name: '烧杯罩住一支蜡烛', drag: cupPick, to: V(C1.x, 0.075, CUP_HOME.z), wait: 7 },
          { name: '想一想', run: () => W.q.querySelector('button').click(), wait: 2 },
        ]) },
    };
  },
};
