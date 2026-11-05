// 课题1 质量守恒定律（课本第 110–115 页）：探究 化学反应前后物质的质量关系（方案一 图 5-1）、实验 5-1、实验 5-2（建议教师演示）。
//
// 中间一台电子天平（读到 0.01 g），三套装置轮流放上去称：
//   ① 方案一（密闭）：锥形瓶底铺铜粉，塞子上的导管系着小气球。先称 m₁；放到陶土网上，点燃酒精灯加热：铜粉变黑，气球鼓起；
//      停止加热（灯帽盖灭），锥形瓶在陶土网上（或桌上）冷却到室温，再放到天平上称 m₂——质量不变（课本：“待装置冷却后再次称量”）。
//      照实建模：还热的时候称，鼓起的气球排开空气，受到浮力，读数偏小。
//   ② 实验 5-1（敞口）：烧杯里的碳酸钠，和盛盐酸的小试管。先称；取下烧杯，点一下——倾斜，盐酸流进去，冒出大量气泡；
//      反应一段时间后再放到天平上称：变轻了。可以改在塞紧的锥形瓶里做：读数不变。
//   ③ 实验 5-2：镁条（已用砂纸打磨干净）和陶土网一起称；取下来放到桌上，点燃酒精灯，用坩埚钳夹着镁条在火焰上点燃，
//      在陶土网上方燃烧，生成的白色固体落在陶土网上；燃烧后连同陶土网一起放回天平上称。
//      空气里的氧气加了进来（变重），白烟又跑掉一些（变轻）——这里按白烟跑掉约 35% 计，所以略重一点；实际可能重也可能轻。
// 两盏酒精灯都有灯帽（kit/labops.js 的 lampCap）：点燃前取下放在桌上，用完盖灭。
// 看不见的东西：原子进出——蓝点 = 氧原子，灰点 = 其他原子。
//
// 数据：铜粉 2.00 g（过量），锥形瓶里约 250 mL 空气（氧气约 0.07 g）；碳酸钠 1.06 g（0.01 mol）→ 二氧化碳 0.44 g；
//   镁条 0.24 g（0.01 mol）→ 氧化镁 0.40 g。空气密度按 1.2 g/L 算浮力。
import * as THREE from 'three';
import { buttons, seg, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { canvasTex, glowTexture } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { chemLamp, chemBeaker, testTube, stopper, glassTube, crucibleTongs, CHEM } from './kit/chem.js';
import { glass2, water2, flame2, smoke2, bubble2 } from './kit/chemfx.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, demoActs } from './kit/chemlesson.js';
import { lampCap } from './kit/labops.js';
import { sfx } from './kit/audio.js';
import { paint, inked, hull } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const T0 = 25;
const BAL = new THREE.Vector3(0.0, 0, 0), PAN_Y = 0.034;
// 三脚架上的陶土网（下面是酒精灯）。网比灯帽取下时抬到的最高处（约 10.2 cm）高一点；火焰调小到外焰刚好顶到网的下面，不穿过网
const HEAT = new THREE.Vector3(-0.19, 0, 0), NET_Y = 0.106, FLAME_UNDER_NET = 0.64;
const LAMP2 = new THREE.Vector3(0.26, 0, 0.11);                  // 点镁条的酒精灯
const CAP1_OFF = new THREE.Vector3(HEAT.x, 0, 0.09), CAP2_OFF = new THREE.Vector3(0.318, 0, 0.066);   // 灯帽取下后放在桌上的地方（灯帽 1 从三脚架前面两条腿之间拿出来）
const HOME = { A: new THREE.Vector3(0.13, 0, -0.06), B: new THREE.Vector3(0.2, 0, -0.01), C: new THREE.Vector3(0.16, 0, 0.1) };
const RHO_AIR = 1.2;          // g/L
const M = {                    // 各套装置反应前的总质量（g）
  A: 130.5,                    // 锥形瓶 + 铜粉 2.00 g + 橡胶塞、导管、小气球
  B: 71.06,                    // 烧杯 + 碳酸钠 1.06 g + 盛盐酸的小试管
  Bs: 118.46,                  // 改用塞紧的锥形瓶
  C: 25.24,                    // 陶土网 25.00 g + 镁条 0.24 g
};
const CO2 = 0.44, MGO = 0.40, MG = 0.24, SMOKE = 0.35;
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
// 实验 5-1 倾斜：先慢慢斜过去（小试管滑到杯壁上，盐酸流出来），停一会儿，再放正。单位：秒
const TILT_UP = 0.6, TILT_HOLD = 1.4, TILT_END = 2.0, POUR0 = 0.5, POUR1 = 1.3;

export default {
  id: 'masscons',
  fig: '图5-1',
  title: '质量守恒定律',
  stampText: '探究',
  style: 'paper',
  predict: {
    q: '在烧杯里让盐酸和碳酸钠反应（烧杯敞着口），反应前后都放在天平上称。<br>反应后的读数会——',
    hint: '课本第 113 页 实验 5-1。“想一想”：你预测反应前后的称量结果是否会有变化？',
    options: ['变小', '不变', '变大'],
    answer: 0,
  },
  need: '称方案一（密闭加热铜粉）、实验 5-1（敞口）、实验 5-2（镁条燃烧）反应前后的质量，再想一想',
  conclusion: {
    crops: [{ page: 121, rect: [64, 330, 478, 438] }],
    quote: '质量守恒定律是指参加化学反应的各物质的质量总和，等于反应后生成的各物质的质量总和。化学反应前后，原子的种类、数目和质量不变，因此化学反应前后各物质的质量总和必然相等。',
    formula: '铜 + 氧气 <span style="font-size:.8em">加热</span>→ 氧化铜　　镁 + 氧气 <span style="font-size:.8em">点燃</span>→ 氧化镁',
    why: '方案一在<b>密闭</b>的锥形瓶里进行，参加反应的铜和氧气、生成的氧化铜都在瓶里，反应前后称得的质量相等。实验 5-1 在敞口的烧杯里进行，生成的二氧化碳气体跑到空气里去了，没有称到，所以变轻；改在密闭容器里做，质量就不变。镁条燃烧时，参加反应的氧气来自空气，反应前没有称进去，生成的氧化镁又有一部分变成白烟跑掉了，所以称得的质量可能变大，也可能变小。<b>这些都不违背质量守恒定律</b>——验证质量守恒定律，有气体参加或生成的反应要在密闭容器中进行。<br>从微观看：化学反应是原子重新组合的过程，反应前后原子的种类、数目和质量都不变。',
    src: '课本第 110–115 页 · 第五单元 课题1 质量守恒定律',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null;
    const near = (v, d, dist) => { if (S.demo) return; S.near = true; look([v.x, v.y, v.z], d || [0.05, 0.25, 1], dist || 0.32, () => { S.near = false; }); };
    const far = () => { if (S.near) { S.near = false; back(); } };

    // 器材脚下一层淡淡的白
    const sheetTex = canvasTex(512, 256, (g, W, H) => {
      const gr = g.createRadialGradient(W / 2, H / 2, H * 0.12, W / 2, H / 2, W * 0.5);
      gr.addColorStop(0, 'rgba(253,251,245,0.9)'); gr.addColorStop(0.62, 'rgba(253,251,245,0.82)'); gr.addColorStop(1, 'rgba(253,251,245,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    });
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.32), new THREE.MeshLambertMaterial({ map: sheetTex, transparent: true, depthWrite: false }));
    sheet.rotation.x = -Math.PI / 2; sheet.position.set(0.03, 0.0004, 0.03); sheet.receiveShadow = true; sheet.renderOrder = 1; sheet.raycast = () => {}; sheet.userData.noFrame = true;
    group.add(sheet);

    // ================= 电子天平 =================
    const bal = new THREE.Group(); bal.position.copy(BAL); group.add(bal);
    const body = inked(new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.026, 0.12), paint(0xd9dde3)), { width: 0.9 }); body.position.y = 0.013;
    const pan = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.003, 40), paint(0xc4cad2)), { width: 0.8 }); pan.position.y = PAN_Y - 0.0015;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.006, 16), paint(0x9aa1ad)); post.position.y = 0.029;
    let shown = '';
    const dispTex = canvasTex(320, 96, () => {});
    const drawDisp = (txt) => { if (txt === shown) return; shown = txt; const c = dispTex.image, g = c.getContext('2d'); g.fillStyle = '#1d2b23'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#9cf5b8'; g.font = 'bold 64px "Courier New", monospace'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(txt, c.width - 54, c.height / 2 + 4); g.font = 'bold 30px sans-serif'; g.fillText('g', c.width - 16, c.height / 2 + 12); dispTex.needsUpdate = true; };
    const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.018), new THREE.MeshBasicMaterial({ map: dispTex })); disp.position.set(0, 0.014, 0.0605); disp.rotation.x = -0.2;
    bal.add(body, pan, post, disp);
    drawDisp('0.00');

    // ================= 三脚架 + 陶土网（下面一盏酒精灯）、第二盏酒精灯 =================
    const lamp = chemLamp(); lamp.position.copy(HEAT); group.add(lamp);
    const tri = new THREE.Group(); tri.position.copy(HEAT); group.add(tri);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.5; const leg = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, NET_Y, 8), paint(0x5f6773)), 0.0005); leg.position.set(Math.cos(a) * 0.04, NET_Y / 2, Math.sin(a) * 0.04); tri.add(leg); }
    const ring = hull(new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.0018, 6, 30), paint(0x5f6773)), 0.0005); ring.rotation.x = Math.PI / 2; ring.position.y = NET_Y - 0.002; tri.add(ring);
    const netTex = canvasTex(128, 128, (g, W) => { g.fillStyle = '#bfc3c8'; g.fillRect(0, 0, W, W); g.strokeStyle = '#8b9098'; g.lineWidth = 1.2; for (let i = 0; i < W; i += 6) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, W); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(W, i); g.stroke(); } g.fillStyle = '#f1ece2'; g.beginPath(); g.arc(W / 2, W / 2, W * 0.3, 0, 7); g.fill(); });
    const net = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.002, 0.1), new THREE.MeshLambertMaterial({ map: netTex })); net.position.y = NET_Y; tri.add(net);
    const lamp2 = chemLamp(); lamp2.position.copy(LAMP2); group.add(lamp2);
    // 灯帽：点燃前取下放在桌上，熄灭时盖上（kit/labops.js）；点一下酒精灯：点燃 / 盖灭
    const capper1 = lampCap(group, lamp, { off: CAP1_OFF }), capper2 = lampCap(group, lamp2, { off: CAP2_OFF });
    let flameOn1 = false, flameOn2 = false;                 // 火焰真的亮着（灯帽拿开了才亮，盖上了才灭）
    const snapCaps = () => { capper1.snap(S.lit1); capper2.snap(S.lit2); flameOn1 = S.lit1; flameOn2 = S.lit2; };     // 换一套状态（演示开始、结束，全部重来）时直接摆好
    const mkLampPick = (l) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.07, 0.072), new THREE.MeshBasicMaterial({ visible: false })); p.position.y = 0.035; p.userData.pick = true; l.add(p); return p; };
    const lampPick1 = mkLampPick(lamp), lampPick2 = mkLampPick(lamp2);
    lamp.flame.setSize(FLAME_UNDER_NET);

    // ================= ① 方案一：锥形瓶 + 铜粉 + 橡胶塞、导管、小气球 =================
    const flask = (withBalloon) => {
      const g = new THREE.Group();
      const prof = [new THREE.Vector2(0.0003, 0), new THREE.Vector2(0.03, 0), new THREE.Vector2(0.032, 0.004), new THREE.Vector2(0.011, 0.07), new THREE.Vector2(0.0095, 0.072), new THREE.Vector2(0.0095, 0.086), new THREE.Vector2(0.0115, 0.088)];
      const glass = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), glass2({ base: 0.05, rim: 0.45, band: 0.5 })); glass.geometry.translate(0, 0.0006, 0); glass.renderOrder = 9;
      const plug = stopper({ r1: 0.0088, r2: 0.0108, h: 0.016 }); plug.position.y = 0.078;
      g.add(glass, plug);
      if (withBalloon) {
        const tube = glassTube([new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(0, 0.112, 0)]);
        const balloon = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), paint(0x3a6fd0, { unique: true, keep: true }));
        balloon.position.y = 0.112; g.add(tube, balloon); g.balloon = balloon;
      }
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.12, 10), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 0.06; pick.userData.pick = true; g.add(pick); g.pick = pick;
      return g;
    };
    const fA = flask(true); group.add(fA);
    const cu = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.028, 0.003, 32), paint(0xc0623a, { unique: true, keep: true })); cu.position.y = 0.002; fA.add(cu);
    // ② 实验 5-1：烧杯（敞口）+ 碳酸钠 + 盛盐酸的小试管；另一种：塞紧的锥形瓶
    const bk = chemBeaker({ r: 0.026, h: 0.06, level: 0, marks: false }); group.add(bk);
    const bkPick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.07, 10), new THREE.MeshBasicMaterial({ visible: false })); bkPick.position.y = 0.035; bkPick.userData.pick = true; bk.add(bkPick);
    const fB = flask(false); group.add(fB);
    const mkInside = (parent) => {
      const soda = new THREE.Mesh(new THREE.SphereGeometry(0.014, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xf4f2ec, { unique: true, keep: true })); soda.scale.y = 0.3; soda.position.y = 0.0012; parent.add(soda);
      const tt = testTube({ r: 0.006, len: 0.05 }); tt.position.set(0.008, 0.002, 0); tt.rotation.z = 0.35; parent.add(tt);
      const acid = new THREE.Mesh(new THREE.CylinderGeometry(0.0052, 0.0052, 0.022, 12), water2({ color: 0xd7e9ef, base: 0.4 })); acid.position.y = 0.017; tt.add(acid);
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 1, 24), water2({ color: 0xd7e9ef, base: 0.35 })); liq.geometry.translate(0, 0.5, 0); liq.scale.y = 0.0001; liq.visible = false; parent.add(liq);
      return { soda, tt, acid, liq };
    };
    const inB = mkInside(bk), inBs = mkInside(fB);
    // ③ 实验 5-2：陶土网（放在桌上）+ 坩埚钳夹着的镁条
    const cNet = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.002, 0.07), new THREE.MeshLambertMaterial({ map: netTex })); cNet.position.y = 0.001;
    const netSet = new THREE.Group(); netSet.add(cNet); group.add(netSet);
    const ash = new THREE.Mesh(new THREE.SphereGeometry(0.012, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xf6f5f0, { unique: true, keep: true })); ash.scale.y = 0.25; ash.position.y = 0.002; ash.visible = false; netSet.add(ash);
    const ribbonOnNet = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.0008, 0.004), paint(0xd3d7dd, { unique: true, keep: true })); ribbonOnNet.position.y = 0.0025; netSet.add(ribbonOnNet);
    const netPick = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.02, 0.075), new THREE.MeshBasicMaterial({ visible: false })); netPick.position.y = 0.008; netPick.userData.pick = true; netSet.add(netPick);
    const tongs = new THREE.Group(); const tArm = crucibleTongs(); tongs.add(tArm); group.add(tongs);
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.05, 0.0008), paint(0xd3d7dd, { unique: true, keep: true })); ribbon.position.y = -0.025; ribbon.visible = false; tongs.add(ribbon);      // 称过以后才从陶土网上夹起来
    const mgGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); mgGlow.scale.set(0.1, 0.1, 1); mgGlow.position.y = -0.04; tongs.add(mgGlow);
    const tPick = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.02), new THREE.MeshBasicMaterial({ visible: false })); tPick.position.x = 0.04; tPick.userData.pick = true; tongs.add(tPick);
    const TONGS_HOME = new THREE.Vector3(0.2, 0.006, 0.16);
    tongs.position.copy(TONGS_HOME);

    // ================= 粒子：气泡、白烟、原子 =================
    const bubs = new Particles({ max: 160, geometry: new THREE.SphereGeometry(1, 8, 6), material: bubble2() }); group.add(bubs.mesh);
    const drips = new Particles({ max: 60, geometry: new THREE.SphereGeometry(1, 6, 5), material: water2({ color: 0xd7e9ef, base: 0.5 }) }); group.add(drips.mesh);      // 倾斜时从小试管口流出来的盐酸
    const smoke = smoke2({ max: 140, opacity: 0.8 }); group.add(smoke.mesh);
    const dotTex = canvasTex(64, 64, (g, W) => { const gr = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,1)'); gr.addColorStop(0.75, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, W); });
    const oP = new Particles({ max: 200, sprite: true, color: 0x2f7fd8 }), xP = new Particles({ max: 200, sprite: true, color: 0x8a8f9a });
    for (const p of [oP, xP]) { p.mat.uniforms.map.value = dotTex; p.mesh.renderOrder = 10; group.add(p.mesh); }

    // ================= 卡片 =================
    const balCard = tag('', 'cond'); balCard.px = [-150, -30];
    const atomCard = tag('', 'cond'); atomCard.px = [130, -40];
    const flaskCard = tag('', 'cond'); flaskCard.px = [-120, -50];        // 方案一：锥形瓶加热、冷却时的温度

    // ================= 状态 =================
    const fresh = () => ({
      on: null,                  // 天平上放的是 'A' | 'B' | 'C' | null
      at: { A: 'home', B: 'home', C: 'home' },
      A: { k: 0, T: T0, vb: 0, m1: null, m2: null, hot: false },
      B: { k: 0, tilted: false, sealed: false, m1: null, m2: null },
      C: { lit: false, burn: 0, done: false, m1: null, m2: null },
      lit1: false, lit2: false,  // 两盏酒精灯：加热锥形瓶的、点镁条的
      reading: 0, show: 0, stable: 0, demo: false, near: false, flyO: [], flyX: [],
    });
    S = fresh();
    let W = null;
    const status = (m) => { if (!S.demo) W?.status(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };

    // 各套装置此刻的“真实”质量（g）和读数（扣掉气球受的浮力）
    const massOf = (k) => {
      if (k === 'A') return M.A - RHO_AIR * S.A.vb;                                     // 质量不变；读数里扣掉气球的浮力（vb：气球比原来多鼓起的体积，升）
      if (k === 'B') return S.B.sealed ? M.Bs : M.B - CO2 * S.B.k * 0.96;                // 敞口：二氧化碳跑掉（少量溶在水里）
      if (k === 'C') { const f = S.C.burn; return M.C - MG * f + MGO * f * (1 - SMOKE); }    // 镁变成氧化镁（加进了氧），白烟跑掉一部分
      return 0;
    };
    const obj = { A: fA, B: () => (S.B.sealed ? fB : bk), C: netSet };
    const getObj = (k) => (typeof obj[k] === 'function' ? obj[k]() : obj[k]);
    // 松手以后滑到天平上 / 陶土网上 / 桌上（不是一下子跳过去）；换一套器材（演示开始、结束，全部重来）时直接摆好
    const posOf = { A: new THREE.Vector3(), B: new THREE.Vector3(), C: new THREE.Vector3() };
    let snapPos = true, lastSealed = null;
    const tiltB = { a: 0, r: 0.026 };        // 烧杯倾斜的角度；绕杯底左边那一点转（杯底不陷进托盘里）
    const place = () => {
      if (lastSealed !== S.B.sealed) { lastSealed = S.B.sealed; posOf.B.copy(HOME.B); }
      for (const k of ['A', 'B', 'C']) {
        const o = getObj(k), where = S.at[k];
        if (S.drag?.k === k) { posOf[k].copy(o.position); continue; }
        posOf[k].lerp(where === 'bal' ? new THREE.Vector3(BAL.x, PAN_Y, BAL.z) : where === 'heat' ? new THREE.Vector3(HEAT.x, NET_Y + 0.001, HEAT.z) : HOME[k], snapPos ? 1 : 0.22);
        o.position.copy(posOf[k]);
        if (k === 'B') o.position.add(new THREE.Vector3(-tiltB.r + tiltB.r * Math.cos(tiltB.a), tiltB.r * Math.sin(tiltB.a), 0));
      }
      snapPos = false;
      fB.visible = S.B.sealed; bk.visible = !S.B.sealed;
      if (S.B.sealed) bk.position.set(9, 0, 9); else fB.position.set(9, 0, 9);
    };

    const A = {
      put(k, where) {
        if (where === 'bal' && S.on && S.on !== k) return status('天平上已经有东西了，先拿下来。');
        if (where === 'heat' && k !== 'A') return status(k === 'C' ? '镁条要用坩埚钳夹着，在酒精灯上点燃。' : '这个实验不用加热。');
        if (k === 'C' && S.C.lit) return;     // 镁条正在陶土网上方燃烧
        const was = S.at[k];
        if (S.on === k && where !== 'bal') S.on = null;
        S.at[k] = where; if (where === 'bal') { S.on = k; S.stable = 0; sfx.clink({ freq: 1600 }); }
        if (where !== 'heat') far();          // 从加热台拿开：镜头退回整套器材
        if (where === 'heat') { status(S.lit1 ? '锥形瓶放在陶土网上，用酒精灯加热。看铜粉和小气球。' : '锥形瓶放在陶土网上了。点一下<b>酒精灯</b>：取下灯帽，点燃，加热。'); near(HEAT.clone().setY(0.125), [0.1, 0.2, 1], 0.58); }      // 镜头里有酒精灯（要点它）和整个锥形瓶
        if (where === 'home' && k === 'A' && was === 'heat' && S.A.k > 0.3) status('锥形瓶拿下来了。等它冷却到室温，再放到天平上称。');
      },
      // 方案一的酒精灯：点燃（先取下灯帽）/ 盖灭（停止加热）
      lamp1() {
        S.lit1 = !S.lit1; sfx.clink({ freq: 900, gain: 0.03 });
        if (S.lit1) status(S.at.A === 'heat' ? '点燃了酒精灯，加热锥形瓶。看铜粉和小气球。' : '点燃了酒精灯。');
        else status(S.A.k > 0.3 && S.A.m2 == null ? '用灯帽盖灭了酒精灯，<b>停止加热</b>。等锥形瓶冷却到室温，再放到天平上称。' : '用灯帽盖灭了酒精灯。');
      },
      // 实验 5-2 的酒精灯
      lamp2() {
        S.lit2 = !S.lit2; sfx.clink({ freq: 900, gain: 0.03 });
        if (S.lit2) status(S.C.m1 != null && S.at.C === 'home' && !S.C.lit && !S.C.done ? '点燃了酒精灯。用<b>坩埚钳</b>夹起镁条，伸到火焰上点燃。' : '点燃了酒精灯。');
        else status('用灯帽盖灭了酒精灯。');
      },
      tilt() {
        const B = S.B;
        if (B.tilted) return;
        if (B.m1 == null) return status('先把装置放在天平上，称一下反应前的质量。');
        if (S.on === 'B') return;              // 课本：取下烧杯再倾斜
        B.tilted = true; sfx.clink({ freq: 1200 });
        status(B.sealed ? '倾斜锥形瓶，盐酸流进去，产生大量气泡——这一次瓶口塞紧了。反应一段时间后，再放到天平上称。' : '倾斜烧杯，盐酸流进烧杯，产生大量<b>气泡</b>。反应一段时间后，再放到天平上称。');
        near(getObj('B').position.clone().setY(0.06), [-0.2, 0.3, 1], 0.36);      // 从左前方看（右前方有酒精灯挡着）
      },
      light() {
        if (S.C.m1 == null) return status('先把镁条和陶土网一起放在天平上，称一下反应前的质量。');
        if (S.C.lit || S.C.done || S.at.C !== 'home' || !flameOn2) return;      // 陶土网放在桌上、酒精灯点着了才点镁条
        S.C.lit = true; S.C.burn = 0; ribbonOnNet.visible = false; ribbon.visible = true; ribbon.scale.y = 1; sfx.whoosh({ freq: 700, gain: 0.18 });
        status('镁条在陶土网上方<b>剧烈燃烧，发出耀眼的白光</b>，生成白色固体，冒出白烟。');
        near(HOME.C.clone().setY(0.08), [-0.12, 0.25, 1], 0.38);
      },
      seal(on) {
        if (S.B.tilted) return status('这一次已经做完了。点“更多”里的“再做一次”。');
        if (S.on === 'B') S.on = null; S.at.B = 'home';
        S.B.sealed = on; S.B.m1 = null; S.B.m2 = null; status(on ? '换成了<b>塞紧的锥形瓶</b>：碳酸钠在瓶底，小试管里装着盐酸。' : '换回了敞口的烧杯。');
      },
      reset() {
        S = fresh(); snapPos = true; W?.tbl.clear(); far(); bubs.clear(); drips.clear(); smoke.clear(); ribbon.visible = false; ribbon.scale.y = 1; ribbon.position.y = -0.025; ribbonOnNet.visible = true; tongs.position.copy(TONGS_HOME); snapCaps();
        if (W) for (const b of [W.q1, W.q2, W.q3, W.next]) b.hidden = true;
        bar.undo('a', 'b', 'c', 'why'); W?.sealSeg.set(0);
        status('全部重新摆好了，记录也清空了。');
      },
    };

    // 镁条、坩埚钳的样子按 S 摆好（演示前后切换状态时用）
    const syncMg = () => {
      const c = S.C;
      ribbon.visible = c.lit; ribbon.scale.y = c.lit ? Math.max(0.05, 1 - c.burn) : 1; ribbon.position.y = -0.025 * ribbon.scale.y;
      ribbonOnNet.visible = !c.lit && !c.done; mgGlow.material.opacity = 0;
      if (!c.lit) tongs.position.copy(TONGS_HOME);
    };

    // ================= 拖放（演示里也走这一套） =================
    const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
    const drag = draggable(group, [
      ...['A', 'B', 'C'].map((k) => ({ obj: k === 'A' ? fA.pick : k === 'B' ? bkPick : netPick, plane: 'xy', offset: 0, keepOffset: true, anchor: k === 'A' ? fA : k === 'B' ? bk : netSet,
        enabled: () => !(k === 'C' && S.C.lit),          // 镁条在陶土网上方燃烧时，陶土网不挪
        hint: () => (k === 'B' && S.B.m1 != null && !S.B.tilted ? (S.on === 'B' ? '拖到桌上：取下烧杯' : '点一下：倾斜烧杯；拖动：放到天平上') : k === 'C' && S.C.lit ? '' : '拖到天平上称量' + (k === 'A' ? '；拖到陶土网上加热' : '')),
        onStart: () => { S.drag = { k, p0: null }; },
        onDrag: (p) => { S.drag.moved = true; const o = getObj(k); o.position.set(clamp(p.x, -0.26, 0.3), Math.max(0, p.y), o.position.z * 0.8); },      // 前后（z）慢慢挪到天平那一排，不跳
        onEnd: () => {
          const o = getObj(k), p = o.position; S.drag = null;
          if (Math.abs(p.x - BAL.x) < 0.05) A.put(k, 'bal');
          else if (k === 'A' && Math.abs(p.x - HEAT.x) < 0.05) A.put(k, 'heat');
          else A.put(k, 'home');
        },
        onTap: () => { if (k === 'B') A.tilt(); } })),
      { obj: fB.pick, plane: 'xy', offset: 0, keepOffset: true, anchor: fB, hint: () => (S.B.m1 != null && !S.B.tilted ? (S.on === 'B' ? '拖到桌上：取下锥形瓶' : '点一下：倾斜锥形瓶；拖动：放到天平上') : '拖到天平上称量'),
        onStart: () => { S.drag = { k: 'B' }; }, onDrag: (p) => { fB.position.set(clamp(p.x, -0.26, 0.3), Math.max(0, p.y), fB.position.z * 0.8); },
        onEnd: () => { const p = fB.position; S.drag = null; A.put('B', Math.abs(p.x - BAL.x) < 0.05 ? 'bal' : 'home'); }, onTap: () => A.tilt() },
      { obj: tPick, plane: 'xy', offset: LAMP2.z, keepOffset: true, anchor: tongs, hint: () => (S.C.lit || S.C.done ? '' : S.C.m1 == null ? '先把陶土网（上面放着镁条）放到天平上称' : S.at.C !== 'home' ? '' : '夹起镁条，拖到右边的酒精灯火焰上：点燃'),
        onStart: () => { if (S.C.m1 == null) { status('先把陶土网（上面放着镁条）放到天平上，称一下反应前的质量。'); S.noPick = true; return; } S.noPick = S.at.C !== 'home'; S.C.grab = !S.noPick && !S.C.lit && !S.C.done; },      // 陶土网从天平上取下来、放在桌上以后，才夹镁条
        onDrag: (p) => {
          if (S.noPick) return; if (S.C.lit || S.C.done) return;
          if (S.C.grab && !ribbon.visible) { ribbonOnNet.visible = false; ribbon.visible = true; }      // 夹起镁条（垂在钳子下面 5 cm，钳子不低于 5.6 cm，镁条不碰桌面）
          tongs.position.set(clamp(p.x, -0.1, 0.32), Math.max(ribbon.visible ? 0.056 : 0.006, p.y), tongs.position.z + (p.z - tongs.position.z) * 0.25); const tip = tongs.position.clone().add(new THREE.Vector3(0, -0.05, 0)); S.C.inFlame = flameOn2 && Math.abs(tip.x - LAMP2.x) < 0.02 && Math.abs(tip.y - 0.1) < 0.03; },      // 酒精灯点着了，在火焰里停一会儿（约半秒）才点着
        onEnd: () => { S.C.inFlame = false; S.C.grab = false; if (!S.C.lit) { tongs.position.copy(TONGS_HOME); if (!S.C.done) { ribbon.visible = false; ribbonOnNet.visible = true; } } } },      // 没点着：镁条放回陶土网上
    ], { taps: [
      { obj: lampPick1, hint: () => (S.lit1 ? '点一下：盖上灯帽，熄灭酒精灯' : '点一下：取下灯帽，点燃酒精灯'), onTap: () => A.lamp1() },
      { obj: lampPick2, hint: () => (S.lit2 ? '点一下：盖上灯帽，熄灭酒精灯' : '点一下：取下灯帽，点燃酒精灯'), onTap: () => A.lamp2() },
    ], tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    // 演示：沿折线拖过去（先抬起来、再平移、再放下——demoActs.drag 只走直线，会从天平、三脚架上穿过去）。
    // pts 里可以放函数（这一段开始时再取）；start: false 不调用 onStart（坩埚钳先空着伸过去）；release > 1：这个镜头里不松手
    const carry = (obj, pts, o = {}) => act.path(obj, pts, { release: (o.t1 ?? 0.5) + 0.02, ...o });      // 沿几个点拿过去（kit/chemlesson.js 的 act.path；这一课默认走到就松手）
    const at = (k) => () => getObj(k).position.clone();
    const PAN = V(BAL.x, PAN_Y), ON_NET = V(HEAT.x, NET_Y + 0.001);
    const TONGS_AT_NET = V(HOME.C.x, 0.058, HOME.C.z), TONGS_AT_FLAME = V(LAMP2.x, 0.142, LAMP2.z);      // 坩埚钳：桌上陶土网里的镁条正上方 / 酒精灯火焰上
    let kNow = 0;                                    // 演示：这个镜头放到哪儿了（0–1），给 speed 用
    const track = (f) => (k) => { kNow = k; f(k); };
    const onBal = (k) => S.on === k && !S.drag;      // 放稳在天平上了（等读数稳定的那一会儿时间加快）

    // ================= 底部步骤栏 + 老师的演示 =================
    let saved = null;
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'a', title: '方案一：密闭加热铜粉', todo: '<b>锥形瓶</b>先放到天平上称；再放到<b>陶土网</b>上，点<b>酒精灯</b>加热；铜粉变黑后盖灭酒精灯，等锥形瓶冷却到室温，再放到天平上称。',
          target: () => { const a = S.A; if (a.m2 != null) return null; if (a.m1 == null) return S.on && S.on !== 'A' ? null : fA; if (a.k < 0.6) return S.at.A !== 'heat' ? fA : S.lit1 ? null : lamp; if (S.lit1) return lamp; return a.T > T0 + 1 || (S.on && S.on !== 'A') ? null : fA; } },
        { id: 'b', title: '实验 5-1：盐酸和碳酸钠', todo: '<b>烧杯</b>先放到天平上称；<b>取下</b>烧杯，点一下让它倾斜，小试管里的盐酸流进去；反应一段时间后，再放到天平上称。',
          target: () => (S.B.m2 != null || (S.on && S.on !== 'B') ? null : getObj('B')) },
        { id: 'c', title: '实验 5-2：镁条燃烧', todo: '<b>陶土网</b>（上面放着镁条）先放到天平上称；<b>取下</b>来放在桌上，点燃右边的<b>酒精灯</b>，用<b>坩埚钳</b>夹起镁条点燃；燃烧后连同陶土网再称。',
          target: () => { const c = S.C; if (c.m2 != null) return null; if (c.m1 == null) return S.on && S.on !== 'C' ? null : netSet; if (!c.lit && !c.done) return S.at.C !== 'home' ? netSet : !S.lit2 ? lamp2 : tongs; if (c.lit) return null; return S.lit2 ? lamp2 : S.on && S.on !== 'C' ? null : netSet; } },
        { id: 'why', title: '想一想', todo: '对照你称得的数据想一想，在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          onStart: () => { if (!saved) saved = S; S = fresh(); S.demo = true; snapPos = true; bubs.clear(); drips.clear(); smoke.clear(); syncMg(); snapCaps(); },
          onEnd: () => { if (!saved) return; S = saved; saved = null; S.near = false; snapPos = true; bubs.clear(); drips.clear(); smoke.clear(); syncMg(); snapCaps(); bar.say('演示看完了。桌上的器材和记录还是你自己的那一套——接着往下做。', bar.current || 'end'); setTimeout(() => bar.say(null), 4000); },
          // 演示和学生走同一套流程：称 m₁、反应、称 m₂ 都是真的放上天平、等读数稳定后记下（record 在演示里也跑，只是不写进学生的记录表）
          shots: [
            // 1 拿起锥形瓶，抬过天平的边，放到托盘上
            { cap: '方案一：锥形瓶底铺着铜粉，塞子上的导管系着小气球。先放在天平上称量。', dur: 3.8, cam: [[0.04, 0.06, 0], [0.1, 0.2, 1], 0.46], get speed() { return onBal('A') ? 3 : 1; },
              during: carry(fA.pick, [at('A'), V(HOME.A.x, 0.07, HOME.A.z), V(BAL.x, 0.07), PAN], { t0: 0.04, t1: 0.42 }) },
            // 2 从天平上拿起来，抬过三脚架，放到陶土网上；点燃酒精灯（灯帽取下、火焰亮了以后实验时间加快：加热要好一会儿）
            { cap: '放在陶土网上，点燃酒精灯加热：红色的铜粉变黑，小气球鼓了起来。', dur: 6.0, cam: [[HEAT.x * 0.6, 0.13, 0], [0.1, 0.2, 1], 0.56], get speed() { return S.at.A === 'heat' && flameOn1 && capper1.k >= 1 ? 4 : 1; },
              during: act.seq(carry(fA.pick, [at('A'), V(BAL.x, 0.16), V(HEAT.x, 0.16), ON_NET], { t0: 0.03, t1: 0.28 }), act.tap(lampPick1, 0.33)) },
            // 3 停止加热：点一下酒精灯，盖上灯帽（盖灭、轻提、再盖好按真实速度放）；锥形瓶留在陶土网上冷却到室温（卡片上的温度降到 25 ℃）
            { cap: '停止加热：用灯帽盖灭酒精灯。锥形瓶留在陶土网上，冷却到室温。', dur: 4.6, cam: [[HEAT.x * 0.6, 0.13, 0], [0.1, 0.2, 1], 0.56], get speed() { return kNow > 0.34 ? 6.5 : 1; },
              during: track(act.tap(lampPick1, 0.04)) },
            // 4 冷却以后再放到天平上
            { cap: '冷却到室温后，再放到天平上称：读数和反应前一样。', dur: 3.8, cam: [[-0.05, 0.06, 0], [0.1, 0.2, 1], 0.5], get speed() { return onBal('A') ? 3 : 1; },
              during: carry(fA.pick, [at('A'), V(HEAT.x, 0.17), V(BAL.x, 0.17), PAN], { t0: 0.03, t1: 0.4 }) },
            // 5 锥形瓶放回桌上；烧杯放上天平称
            { cap: '实验 5-1：烧杯里放着碳酸钠和盛有盐酸的小试管，敞着口。先放在天平上称量。', dur: 4.6, cam: [[0.08, 0.06, 0], [0.15, 0.22, 1], 0.46], get speed() { return onBal('B') ? 3 : 1; },
              during: act.seq(
                carry(fA.pick, [at('A'), V(BAL.x, 0.07), V(HOME.A.x, 0.07, HOME.A.z), HOME.A], { t0: 0.02, t1: 0.24 }),
                carry(bkPick, [at('B'), V(HOME.B.x, 0.065, HOME.B.z), V(BAL.x, 0.065), PAN], { t0: 0.28, t1: 0.52 })) },
            // 6 取下烧杯，点一下：倾斜（倾斜的那一会儿按真实速度放，之后加快：反应一段时间）
            { cap: '取下烧杯，将它倾斜：小试管里的盐酸流进烧杯，和碳酸钠反应，产生大量气泡。', dur: 6.2, cam: [[0.17, 0.05, -0.01], [-0.2, 0.3, 1], 0.4], get speed() { return (S.B.tt || 0) > TILT_END ? 3.5 : 1; },
              during: act.seq(carry(bkPick, [at('B'), V(BAL.x, 0.07), V(HOME.B.x, 0.07, HOME.B.z), HOME.B], { t0: 0.02, t1: 0.24 }), act.tap(bkPick, 0.29)) },
            // 7 反应一段时间后，再放回天平上
            { cap: '反应一段时间后，再放到天平上称：读数比反应前小了。', dur: 3.8, cam: [[0.06, 0.06, 0], [0.15, 0.22, 1], 0.46], get speed() { return onBal('B') ? 3 : 1; },
              during: carry(bkPick, [at('B'), V(HOME.B.x, 0.065, HOME.B.z), V(BAL.x, 0.065), PAN], { t0: 0.03, t1: 0.4 }) },
            // 8 烧杯放回桌上；镁条和陶土网一起放上天平称
            { cap: '实验 5-2：取一根用砂纸打磨干净的镁条，和陶土网一起放在天平上称量。', dur: 4.6, cam: [[0.08, 0.06, 0.05], [0.1, 0.25, 1], 0.5], get speed() { return onBal('C') ? 3 : 1; },
              during: act.seq(
                carry(bkPick, [at('B'), V(BAL.x, 0.07), V(HOME.B.x, 0.07, HOME.B.z), HOME.B], { t0: 0.02, t1: 0.24 }),
                carry(netPick, [at('C'), V(HOME.C.x, 0.075, HOME.C.z), V(BAL.x, 0.075), PAN], { t0: 0.28, t1: 0.52 })) },
            // 9 陶土网取下来放在桌上；点燃酒精灯；坩埚钳伸过去夹起镁条，到火焰上点燃，拿到陶土网上方燃烧
            { cap: '取下来放在桌上。点燃酒精灯，用坩埚钳夹起镁条在火焰上点燃，拿到陶土网上方：剧烈燃烧，发出耀眼的白光，白色固体落在陶土网上。', dur: 9.2, cam: [[0.17, 0.09, 0.08], [0.1, 0.25, 1], 0.5], get speed() { return S.C.lit || S.C.done ? 1.5 : 1; },
              during: act.seq(
                carry(netPick, [at('C'), V(BAL.x, 0.075), V(HOME.C.x, 0.075, HOME.C.z), HOME.C], { t0: 0.02, t1: 0.17 }),
                act.tap(lampPick2, 0.2),
                carry(tPick, [() => tongs.position.clone(), V(TONGS_HOME.x, 0.12, TONGS_HOME.z), V(HOME.C.x, 0.12, HOME.C.z), TONGS_AT_NET], { t0: 0.25, t1: 0.35, release: 2, start: false }),
                act.at(0.36, () => drag.items().find((x) => x.obj === tPick).onStart()),
                carry(tPick, [TONGS_AT_NET, V(HOME.C.x, 0.17, HOME.C.z), V(LAMP2.x, 0.17, LAMP2.z), TONGS_AT_FLAME], { t0: 0.37, t1: 0.5, start: false, release: 0.98 })) },
            // 10 盖灭酒精灯；燃烧后的固体连同陶土网放回天平上称
            { cap: '用灯帽盖灭酒精灯。燃烧后得到的白色固体连同陶土网，放到天平上称：比反应前重了一点。', dur: 4.4, cam: [[0.1, 0.06, 0.05], [0.1, 0.25, 1], 0.5], get speed() { return onBal('C') ? 3 : 1; },
              during: act.seq(act.tap(lampPick2, 0.03), carry(netPick, [at('C'), V(HOME.C.x, 0.075, HOME.C.z), V(BAL.x, 0.075), PAN], { t0: 0.12, t1: 0.45 })) },
            { cap: '为什么有的变了、有的没变？想一想：反应前后，所有的物质都称到了吗？演示完了，下面换你自己做。', dur: 3.5, cam: [[0.02, 0.06, 0.02], [0.1, 0.25, 1], 0.7] },
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

    // ================= 每帧 =================
    const tmp = new THREE.Vector3();
    const spawnFly = (list, from, n, to) => { for (let i = 0; i < n; i++) list.push({ p: from.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.02, 0, (Math.random() - 0.5) * 0.02)), v: (to ? to.clone().sub(from).multiplyScalar(0.6) : new THREE.Vector3((Math.random() - 0.5) * 0.02, 0.05 + Math.random() * 0.03, (Math.random() - 0.5) * 0.02)), life: to ? 1.6 : 3, age: 0, size: 0.0034, alpha: 0.9 }); };
    const step = (h, t) => {
      // 酒精灯：点燃时灯帽先取下放到桌上，火焰才亮；熄灭时灯帽盖上，火焰才灭（盖灭后轻提一下，再盖好）
      flameOn1 = capper1.update(h, S.lit1); flameOn2 = capper2.update(h, S.lit2);
      lamp.flame.setOn(flameOn1); lamp.flame.update(t); lamp2.flame.setOn(flameOn2); lamp2.flame.update(t + 0.7);
      place();
      // ① 铜粉加热：锥形瓶在陶土网上、酒精灯点着才加热；铜和瓶里的氧气生成氧化铜（变黑）；气体受热膨胀，小气球鼓起
      const a = S.A;
      // 加热：瓶里气体的平均温度升到约 130 ℃（铜粉那里更热）；停止加热以后慢慢冷却到室温
      const heating = S.at.A === 'heat' && flameOn1;
      if (heating) { a.hot = true; a.T += (130 - a.T) * Math.min(1, h * 0.25); if (a.T > 90 && a.k < 1) a.k = Math.min(1, a.k + h * 0.08); }
      else a.T += (T0 - a.T) * Math.min(1, h * 0.25);
      if (heating && a.k >= 0.6 && !S.saidBlack) { S.saidBlack = true; status('铜粉变黑了，小气球鼓了起来。点一下<b>酒精灯</b>，盖上灯帽，停止加热。'); }
      if (!heating && a.hot && a.k >= 0.6 && a.m2 == null && a.T < T0 + 1 && S.on !== 'A' && !S.saidCool) { S.saidCool = true; status('锥形瓶冷却到室温了。把它放到天平上称。'); }
      const gasL = 0.25 * (1 - 0.21 * a.k);                                    // 瓶里的气体（室温下的体积，升）：氧气被铜用掉
      a.vb = Math.max(0, gasL * (a.T + 273) / (T0 + 273) - 0.25);            // 比原来多出来的体积进了小气球
      const bR = 0.006 + Math.cbrt(Math.max(0, a.vb) * 1e-3 * 3 / (4 * Math.PI)) * 1.0;
      fA.balloon.scale.set(bR, bR * 1.25, bR); fA.balloon.position.y = 0.112 + bR;
      cu.material.color.lerpColors(new THREE.Color(0xc0623a), new THREE.Color(0x1f1d22), Math.min(1, a.k * 1.3));
      // 瓶里的原子（示意）：蓝 = 氧原子（在空气里成对），被铜粉“吃”进去以后贴在瓶底
      // ② 盐酸和碳酸钠
      // 倾斜：烧杯慢慢斜过去，小试管滑到杯壁上、管口朝下，盐酸流出来落到碳酸钠上（落下去才开始反应），停一会儿再放正
      const b = S.B, ins = b.sealed ? inBs : inB, bo = getObj('B');
      if (b.tilted) b.tt = (b.tt || 0) + h;
      const tt = b.tt || 0;
      if (b.tilted && tt > POUR0 + 0.2 && b.k < 1) b.k = Math.min(1, b.k + h * 0.14);
      const env = smooth(tt / TILT_UP) * (1 - smooth((tt - TILT_HOLD) / (TILT_END - TILT_HOLD)));
      tiltB.a = (b.sealed ? 0.7 : 0.5) * env; tiltB.r = b.sealed ? 0.031 : 0.026;
      bo.rotation.z = tiltB.a;
      for (const x of [inB, inBs]) {
        const on = x === ins, pour = on ? smooth((tt - POUR0) / (POUR1 - POUR0)) : 0;
        x.tt.rotation.z = 0.35 + (on ? (b.sealed ? 0.03 : 0.2) * smooth(tt / TILT_UP) : 0);       // 小试管往杯壁上靠（锥形瓶里地方小，只能靠一点）
        x.acid.scale.y = Math.max(0.001, 1 - pour); x.acid.position.y = 0.006 + 0.011 * (1 - pour); x.acid.visible = pour < 0.98;
        x.liq.visible = on && tt > POUR0 + 0.1; x.liq.scale.y = 0.012 * smooth((tt - POUR0) / 0.6);
      }
      if (b.tilted && tt > POUR0 + 0.05 && tt < POUR1) {
        bo.updateMatrixWorld(true);
        const mouth = group.worldToLocal(ins.tt.localToWorld(new THREE.Vector3(0, 0.05, 0)));
        if (Math.random() < h * 40) drips.spawn({ p: mouth.add(new THREE.Vector3((Math.random() - 0.5) * 0.003, -0.001, (Math.random() - 0.5) * 0.003)), v: new THREE.Vector3(-0.008, -0.02, 0), size: 0.0011 + Math.random() * 0.0005, life: 1, yk: mouth.y - 0.012 });      // 落到杯底（斜着的杯壁）就没了
      }
      drips.update(h, (p, d) => { p.v.y -= 0.6 * d; p.p.addScaledVector(p.v, d); return p.p.y > p.yk; });
      ins.soda.scale.setScalar(Math.max(0.2, 1 - b.k * 0.8)); ins.soda.scale.y *= 0.3;
      if (b.tilted && b.k > 0.05 && b.k < 1) {
        S.bacc = (S.bacc || 0) + h * 60 * (1 - b.k);
        while (S.bacc > 1) { S.bacc -= 1; bubs.spawn({ p: bo.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.03, 0.003, (Math.random() - 0.5) * 0.03)), v: new THREE.Vector3(0, 0.03, 0), size: 0.0012 + Math.random() * 0.0008, life: 0.8 }); }
        if (!b.sealed && Math.random() < h * 8) spawnFly(S.flyO, bo.position.clone().add(new THREE.Vector3(0, 0.05, 0)), 2);     // 二氧化碳从杯口跑掉：两个氧原子 + 一个碳原子
        if (!b.sealed && Math.random() < h * 4) spawnFly(S.flyX, bo.position.clone().add(new THREE.Vector3(0, 0.05, 0)), 1);
      }
      bubs.update(h, (p, d) => { p.v.y += 0.2 * d; p.p.addScaledVector(p.v, d); return p.p.y < bo.position.y + 0.014; });
      // ③ 镁条燃烧（在陶土网上方）：空气里的氧原子加进来，白烟带走一部分
      const c = S.C;
      if (c.inFlame && !c.lit && !c.done) { c.flameT = (c.flameT || 0) + h; if (c.flameT > 0.5) A.light(); } else c.flameT = 0;
      const over = (S.at.C === 'bal' ? new THREE.Vector3(BAL.x, PAN_Y, BAL.z) : HOME.C.clone()).add(new THREE.Vector3(0, 0.07, 0));
      if (c.lit) {
        c.burn = Math.min(1, c.burn + h / 4);
        tongs.position.lerp(over.clone().add(new THREE.Vector3(0.0, 0.05, 0)), 0.15);
        ribbon.scale.y = Math.max(0.05, 1 - c.burn); ribbon.position.y = -0.025 * ribbon.scale.y;
        mgGlow.material.opacity = 0.9 + Math.sin(t * 40) * 0.1; mgGlow.position.y = -0.05 * ribbon.scale.y;
        if (Math.random() < h * 10) spawnFly(S.flyO, over.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.08, 0.02, (Math.random() - 0.5) * 0.08)), 1, over);
        if (c.burn >= 1) { c.lit = false; c.done = true; mgGlow.material.opacity = 0; ribbon.visible = false; status('镁条烧完了。生成的白色固体落在陶土网上，还有一些变成白烟跑掉了。' + (S.lit2 ? '用灯帽盖灭酒精灯；' : '') + '把陶土网连同上面的固体放到天平上称。'); }
      } else if (c.done) tongs.position.lerp(TONGS_HOME, 0.1);          // 没点燃时：位置由拖动决定（松手回到桌上）
      ash.visible = c.burn > 0.05; ash.scale.set(0.4 + 0.6 * c.burn, 0.25 * (0.4 + 0.6 * c.burn), 0.4 + 0.6 * c.burn);
      smoke.update(h, { rate: c.lit ? 40 : 0, origin: over.clone().add(new THREE.Vector3(0, 0.0, 0)), spread: 0.01, up: 0.06, size: 0.02 });
      // 飞走 / 飞进来的原子
      for (const L of [S.flyO, S.flyX]) for (let i = L.length - 1; i >= 0; i--) { const d = L[i]; d.age += h; d.p.addScaledVector(d.v, h); d.alpha = Math.max(0, 0.9 * (1 - d.age / d.life)); if (d.age > d.life) L.splice(i, 1); }
      // 瓶里的氧原子（方案一）：每对蓝点 = 一个氧分子；反应掉的落到铜粉上
      const inFlask = [];
      if (fA.visible) {
        const base = fA.position, n = 16, gone = Math.round(n * a.k);
        for (let i = 0; i < n; i++) {
          const ph = i * 2.39, onCu = i < gone;
          const y = onCu ? 0.005 : 0.02 + ((i * 0.37 + Math.sin(t * 0.6 + ph) * 0.04 + 1) % 1) * 0.04;
          const rr = onCu ? 0.004 + (i % 4) * 0.005 : 0.004 + (i % 3) * 0.004, an = ph + (onCu ? 0 : t * 0.3);
          inFlask.push({ p: new THREE.Vector3(base.x + Math.cos(an) * rr, base.y + y, base.z + Math.sin(an) * rr), size: 0.0034, alpha: 0.9 });
        }
      }
      oP.list = [...S.flyO, ...inFlask]; xP.list = S.flyX; oP.update(0, () => true); xP.update(0, () => true);
      // 天平：读数跟着放上去的东西走；放稳 1 秒以后记录（反应前 m₁ / 反应后 m₂）
      const k = S.on;
      const target = k ? massOf(k) : 0;
      S.show += (target - S.show) * Math.min(1, h * 6);
      drawDisp(S.show.toFixed(2));
      if (k && Math.abs(S.show - target) < 0.005) S.stable += h; else S.stable = 0;
      if (W) record(k, h);          // 演示里也照样称（只是不写进学生的记录表、不算学生的步骤）
      // 卡片
      const fk = k || (S.C.lit ? 'C' : S.B.tilted && S.B.k < 1 ? 'B' : S.at.A === 'heat' ? 'A' : null);      // 天平上的那一套；没有就是正在桌上反应的那一套
      const atomTxt = !fk ? '' : fk === 'A' ? '瓶塞紧了：氧原子从空气里进到铜粉里，<b>一个也没出瓶</b>' : fk === 'B' ? (S.B.sealed ? '瓶塞紧了：生成的二氧化碳<b>留在瓶里</b>' : '敞着口：二氧化碳带着碳原子、氧原子<b>从杯口跑掉了</b>') : '空气里的氧原子<b>加了进来</b>，白烟又<b>带走了</b>一部分';
      const fo = k || !fk ? new THREE.Vector3(BAL.x, 0, 0) : getObj(fk).position;
      balCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">电子天平</span></div><div class="cc-more"><div class="cc-obs"><b style="color:#1d2b23">${S.show.toFixed(2)}</b><small>g</small>${k && k === 'A' && S.A.T > 30 ? '<span class="cc-air">还热着</span>' : ''}</div></div></div>`).loc(group, BAL.x, PAN_Y, 0.06).show(!!k);
      atomCard.text(atomTxt ? `<div class="cc"><div class="cc-t"><span class="cc-name">原子去哪儿了</span></div><div class="cc-more"><div class="cc-obs">${atomTxt}</div></div></div>` : '').loc(group, fo.x, k || !fk ? 0.1 : fo.y + 0.1, fo.z).show(!!atomTxt && (fk === 'A' ? S.A.k > 0.2 : fk === 'B' ? S.B.tilted : fk === 'C' ? S.C.burn > 0.05 : false));
      // 方案一：锥形瓶加热、冷却时的温度（放到天平上以后看天平的卡片）
      flaskCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">锥形瓶里</span></div><div class="cc-more"><div class="cc-obs"><b>约 ${Math.round(S.A.T)}</b><small>℃</small></div></div></div>`).loc(group, fA.position.x, fA.position.y + 0.07, fA.position.z).show(S.A.hot && S.A.m2 == null && k !== 'A');
      bar.near(S.near);
    };

    const record = (k, h) => {
      if (!k || S.stable < 0.6) return;
      const m = Number(S.show.toFixed(2));
      if (k === 'A') {
        const a = S.A;
        if (a.m1 == null && a.k === 0) { a.m1 = m; status(`方案一，反应前：m₁ = <b>${m.toFixed(2)} g</b>。现在把锥形瓶拖到左边的<b>陶土网</b>上，点燃酒精灯加热。`); }
        else if (a.m1 == null && a.k > 0) { if (!S.noM1A) { S.noM1A = true; status('还没称反应前的质量就加热了——这一组的 m₁ 不知道了。点左边“更多”里的<b>全部重来</b>，先称、再加热。'); } }
        else if (a.k > 0.6 && a.m2 == null) {
          if (a.T > 30) { if (!S.hotWarn) { S.hotWarn = true; status(`锥形瓶还热着（约 ${Math.round(a.T)} ℃），读数是 ${m.toFixed(2)} g${m < a.m1 - 0.005 ? '——比反应前少了一点：鼓起的小气球排开空气，受到了浮力' : ''}。课本要求<b>待装置冷却后</b>再称量。`); } return; }
          a.m2 = m; log(['方案一：铜粉在密闭的锥形瓶里加热', a.m1.toFixed(2), m.toFixed(2), Math.abs(m - a.m1) < 0.015 ? '<b>不变</b>' : (m - a.m1).toFixed(2)]);
          done('a'); status(`冷却后：m₂ = <b>${m.toFixed(2)} g</b>，和反应前<b>一样</b>。铜粉变黑了（生成了氧化铜），可总质量没变。`);
          maybeAsk();
        }
      }
      if (k === 'B') {
        const b = S.B;
        if (b.m1 == null && !b.tilted) { b.m1 = m; status(`反应前：m₁ = <b>${m.toFixed(2)} g</b>。把${b.sealed ? '锥形瓶' : '烧杯'}从天平上<b>取下来</b>，点一下它，让它倾斜，盐酸流进去。`); }
        else if (b.m1 != null && b.tilted && b.k >= 1 && b.m2 == null) {
          b.m2 = m; const d = m - b.m1;
          log([b.sealed ? '实验 5-1：改在塞紧的锥形瓶里' : '实验 5-1：盐酸和碳酸钠（敞口烧杯）', b.m1.toFixed(2), m.toFixed(2), Math.abs(d) < 0.015 ? '<b>不变</b>' : `<b>少了 ${(-d).toFixed(2)} g</b>`]);
          done('b'); far(); status(b.sealed ? '塞紧的锥形瓶里，反应前后读数<b>不变</b>。' : `反应后：m₂ = <b>${m.toFixed(2)} g</b>，比反应前<b>少了 ${(-d).toFixed(2)} g</b>。`);
          maybeAsk();
        }
      }
      if (k === 'C') {
        const c = S.C;
        if (c.m1 == null && !c.lit && !c.done) { c.m1 = m; status(`镁条和陶土网：m₁ = <b>${m.toFixed(2)} g</b>。把陶土网<b>取下来</b>放在桌上；点燃右边的<b>酒精灯</b>，再用<b>坩埚钳</b>夹起镁条，伸到火焰上点燃。`); }
        else if (c.m1 != null && c.done && c.m2 == null) {
          c.m2 = m; const d = m - c.m1;
          log(['实验 5-2：镁条燃烧（在陶土网上方）', c.m1.toFixed(2), m.toFixed(2), Math.abs(d) < 0.015 ? '<b>不变</b>' : d > 0 ? `<b>多了 ${d.toFixed(2)} g</b>` : `<b>少了 ${(-d).toFixed(2)} g</b>`]);
          done('c'); status(`燃烧后：m₂ = <b>${m.toFixed(2)} g</b>，${d > 0 ? '比反应前<b>重</b>了一点' : '比反应前<b>轻</b>了一点'}。`);
          maybeAsk();
        }
      }
    };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };
    const maybeAsk = () => { if (S.demo) return; if (bar.has('a') && bar.has('b') && bar.has('c') && W.q1.hidden && !bar.has('why')) { W.q1.hidden = false; far(); status('三组数据都有了。看看下面的记录，回答问题。'); } };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.6, d: 0.24, h: 0.18 },
      view: { elev: 24, azim: -4, lookY: 0.4, frameMargin: 1.04 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const mk = (title, q, opts, ok, wrong, after) => {
          const btns = buttons(opts.map((t, j) => ({ text: t, ghost: true, onClick: () => { if (j) return status(wrong[j - 1]); box.hidden = true; status(ok); after(); } })));
          btns.el.dataset.keep = '1';
          const box = h('div', { class: 'think', hidden: true }, h('div', { class: 'think-t' }, title), h('p', { class: 'think-q', html: q }), btns.el);
          return box;
        };
        const q3 = mk('想一想', '从微观角度看，化学反应前后各物质的质量总和为什么相等？', ['化学反应只是原子重新组合：原子的种类、数目和质量都不变', '分子的种类和数目都不变', '物质的种类不变'],
          '对。化学反应的过程，就是反应物的原子重新组合生成新物质的过程。原子的种类、数目和质量都不变，所以质量守恒。可以掀开结论看看。',
          ['分子变了——氢分子、氧分子变成了水分子。不变的是原子。', '物质的种类变了：铜变成了氧化铜。'], () => { next.hidden = false; done('why'); });
        const q2 = mk('想一想', '镁条燃烧后称得的质量也变了。为什么？', ['参加反应的氧气来自空气，反应前没称进去；生成的氧化镁又有一部分变成白烟跑掉了', '镁条燃烧不遵守质量守恒定律', '陶土网被烧轻了'],
          '对。所以有气体参加或生成的反应，要在<b>密闭容器</b>里进行，才能用来验证质量守恒定律。',
          ['它遵守——只是参加反应的氧气、跑掉的白烟都没称到。', '陶土网不参加反应。'], () => { q3.hidden = false; });
        const q1 = mk('想一想', '方案一反应前后质量不变；实验 5-1 在敞口烧杯里，反应后变轻了。这和质量守恒定律矛盾吗？', ['不矛盾：生成的二氧化碳气体跑到了空气里，没有称到', '矛盾：这个反应不遵守质量守恒定律', '是天平不准'],
          '对：参加反应的碳酸钠、盐酸，等于生成的氯化钠、水和<b>二氧化碳</b>——跑掉的二氧化碳也是生成物。可以在“换个条件再试”里改用塞紧的锥形瓶再做一次。',
          ['看看“原子去哪儿了”：二氧化碳带着原子从杯口跑掉了。', '方案一用同一台天平，读数一点没变。'], () => { q2.hidden = false; });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['实验', '反应前 m₁/g', '反应后 m₂/g', '变化']);
        const sealSeg = seg('', ['敞口的烧杯', '塞紧的锥形瓶'], (_, k) => A.seal(!!k));
        const vary = h('details', { class: 'more' }, h('summary', {}, '换个条件再试'), h('p', { class: 'fineprint' }, '实验 5-1 改在塞紧的锥形瓶里做，读数还会变吗？（方案一：还热着就去称，读数会怎样？）'), sealSeg.el);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'),
          buttons([
            { text: '方案一：放到天平上', ghost: true, onClick: () => A.put('A', 'bal') },
            { text: '方案一：放到陶土网上', ghost: true, onClick: () => A.put('A', 'heat') },
            { text: '方案一：点燃 / 盖灭酒精灯', ghost: true, onClick: () => A.lamp1() },
            { text: '方案一：拿下来', ghost: true, onClick: () => A.put('A', 'home') },
            { text: '实验 5-1：放到天平上', ghost: true, onClick: () => { if (S.on && S.on !== 'B') A.put(S.on, 'home'); A.put('B', 'bal'); } },
            { text: '实验 5-1：拿下来', ghost: true, onClick: () => A.put('B', 'home') },
            { text: '实验 5-1：倾斜', ghost: true, onClick: () => A.tilt() },
            { text: '实验 5-2：放到天平上', ghost: true, onClick: () => { if (S.on && S.on !== 'C') A.put(S.on, 'home'); A.put('C', 'bal'); } },
            { text: '实验 5-2：拿下来', ghost: true, onClick: () => A.put('C', 'home') },
            { text: '实验 5-2：点燃 / 盖灭酒精灯', ghost: true, onClick: () => A.lamp2() },
            { text: '实验 5-2：点燃镁条', ghost: true, onClick: () => A.light() },
          ]).el,
          buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const safe = h('p', { class: 'fineprint warn', html: '课本提示：镁条燃烧的实验建议由教师演示。镁条燃烧发出耀眼的白光，不要直视。' });
        const note = h('p', { class: 'fineprint', html: '说明：铜粉 2.00 g、碳酸钠 1.06 g、镁条 0.24 g；镁条燃烧时白烟按跑掉约 35% 的氧化镁计（实际可能更多或更少，所以称得的质量可能变大也可能变小）；浮力按空气密度 1.2 g/L 计。' });
        ui.controls.append(q1, q2, q3, next, vary, more, safe, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '称量记录';
        W = { tbl, q1, q2, q3, next, sealSeg, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('中间是一台电子天平。三套装置轮流放上去称。可以先看<b>老师演示</b>，也可以直接动手。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { bar.dispose(); bubs.dispose(); smoke.dispose(); oP.dispose(); xP.dispose(); dispTex.dispose(); },
      debug: { get S() { return S; }, A, bar, massOf, picks: { flaskA: fA.pick, beaker: bkPick, flaskB: fB.pick, net: netPick, tongs: tPick, lamp1: lampPick1, lamp2: lampPick2 },
        qa: qaFlow(drag, [
          { name: '锥形瓶放到天平上', drag: fA.pick, to: PAN, wait: 3 },
          { name: '放到陶土网上', drag: fA.pick, to: ON_NET },
          { name: '点燃酒精灯，加热', tap: lampPick1, wait: 14 },
          { name: '盖灭酒精灯，停止加热', tap: lampPick1, wait: 2 },
          { name: '在陶土网上冷却到室温', run: () => {}, wait: 18 },
          { name: '冷却后放到天平上', drag: fA.pick, to: PAN, wait: 3 },
          { name: '锥形瓶拿下来', drag: fA.pick, to: HOME.A },
          { name: '烧杯放到天平上', drag: bkPick, to: PAN, wait: 3 },
          { name: '取下烧杯', drag: bkPick, to: HOME.B },
          { name: '倾斜烧杯', tap: bkPick, wait: 10 },
          { name: '再放到天平上', drag: bkPick, to: PAN, wait: 3 },
          { name: '烧杯拿下来', drag: bkPick, to: HOME.B },
          { name: '陶土网放到天平上', drag: netPick, to: PAN, wait: 3 },
          { name: '取下陶土网', drag: netPick, to: HOME.C },
          { name: '点燃酒精灯（实验 5-2）', tap: lampPick2, wait: 1 },
          { name: '夹起镁条', hold: tPick },
          { name: '伸到酒精灯火焰上', run: () => drag.items().find((x) => x.obj === tPick).onDrag(TONGS_AT_FLAME.clone()), wait: 1.5 },
          { name: '松开（镁条在燃烧）', release: tPick, wait: 6 },
          { name: '盖灭酒精灯（实验 5-2）', tap: lampPick2, wait: 3 },
          { name: '连同陶土网放到天平上', drag: netPick, to: PAN, wait: 3 },
          { name: '想一想 1', run: () => W.q1.querySelector('button').click() },
          { name: '想一想 2', run: () => W.q2.querySelector('button').click() },
          { name: '想一想 3', run: () => W.q3.querySelector('button').click() },
        ]) },
    };
  },
};
