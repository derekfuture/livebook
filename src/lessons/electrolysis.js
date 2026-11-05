// 课题2 水的组成（课本第 92–93 页「探究」、图 4-17；实验活动 2 在第 107 页）：电解水。
// 直接动手：把硫酸钠溶液拖到电解器上面的漏斗里；点电源开关通电 / 断电；从两根玻璃管的刻度上读气体体积并记录；
//   断电后把燃着的木条拖到玻璃管尖嘴，点活塞放出气体检验。
// 化学：2H₂O 通电→ 2H₂↑ + O₂↑。法拉第定律：每 2 mol 电子生成 1 mol H₂，每 4 mol 电子生成 1 mol O₂。
//   同温同压下体积比等于物质的量之比，所以负极（H₂）∶正极（O₂）= 2∶1。
//   实际测量时正极的氧气略少：氧气比氢气更易溶于水（室温下 1 L 水约溶 30 mL O₂、约 18 mL H₂），刚开始比值会大于 2。
// 纯水几乎不导电：不加硫酸钠时电流只有约千分之一。实际电解要十几分钟，这里时间加快 10 倍（界面上标明）。
//
// 新标准：纸本画风；底部步骤栏 ①–⑨（每一步自带提示光圈）；独立的老师演示（换一套干净的器材，看完恢复学生的进度）；
// 学案式面板（读一读 / 想一想，题目前先摆出学生自己的记录）；检验之后管子旁出现结论卡；氧气检验出来以后那根管里的气体染上淡蓝。
import * as THREE from 'three';
import { buttons, seg, table, guard } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { stand, canvasTex } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { glassMat, splint, CHEM } from './kit/chem.js';
import { bubble2, water2, flame2 } from './kit/chemfx.js';
import { microWorld, electrolysisScene } from './kit/microworld.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, demoActs } from './kit/chemlesson.js';
import { bottleCap } from './kit/labops.js';
import { paint, inked, hull, glassEdge } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const F = 96485, VM = 24.5;          // 法拉第常数；室温下气体摩尔体积 L/mol
const SPEED = 10;                    // 时间加快倍数
const R_IN = 0.0065;                 // 玻璃管内半径（m）
const ML_LEN = 1e-6 / (Math.PI * R_IN * R_IN);   // 1 mL 对应的管长（m），约 7.5 mm
const TUBE_H = 0.2, MAX_ML = 22;
const X = { neg: -0.04, pos: 0.04 }; // 两根玻璃管的位置：左边接负极，右边接正极（和图 4-17 的接线一样，正负极在电源上标明）
const BASE_Y = 0.05;                 // 玻璃管底（电极所在处）的高度
const DISSOLVE = { pos: 0.6, neg: 0.35 };  // 先溶进管里水中的气体（mL）：氧气多一些（约 30 mL 水按室温溶解度估算，电极附近未必饱和，取一半多）

export default {
  id: 'electrolysis',
  fig: '图4-17',
  title: '水的组成：电解水',
  stampText: '探究',
  style: 'paper',
  predict: {
    q: '在电解器里加满水（加了少量硫酸钠），接通直流电源。<br>两根玻璃管里产生气体的体积会怎样？',
    hint: '课本第 92 页“探究”',
    options: ['两边一样多', '与负极相连的那边多，大约是另一边的 2 倍', '与正极相连的那边多，大约是另一边的 2 倍'],
    answer: 1,
  },
  need: '通电产生气体，自己读两根管里的气体体积并记录，比较体积比，再分别检验两种气体',
  conclusion: {
    crops: [{ page: 100, rect: [40, 544, 452, 596] }],
    quote: '水是由氢元素和氧元素组成的。在通电条件下水可以发生分解反应。',
    formula: '水 <span style="font-size:.8em">通电</span>→ 氢气 + 氧气',
    why: '与电源负极相连的管里是<b>氢气</b>（能燃烧，火焰淡蓝色），与正极相连的管里是<b>氧气</b>（使燃着的木条燃烧更旺）；氢气的体积约是氧气的 <b>2 倍</b>。氢气由氢元素组成，氧气由氧元素组成，化学反应前后元素的种类不变，所以水由<b>氢、氧两种元素</b>组成。<br>注意：体积比约 2∶1，<b>质量比</b>却是 1∶8（每个水分子里 2 个氢原子、1 个氧原子，氧原子比氢原子重得多）。实际测得的体积比常常略大于 2，是因为氧气比氢气更易溶于水。',
    src: '课本第 92–94 页 · 第四单元 课题2 水的组成；实验活动2（第 107 页）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    const near = (v, d = [0.1, 0.25, 1], dist = 0.3) => { if (S.demo) return; S.near = true; look([v.x, v.y, v.z], d, dist, () => { S.near = false; }); };
    const far = () => { if (S.near) { S.near = false; back(); } };

    // 器材脚下一层淡淡的白，把这块书页上的字压下去
    const sheetTex = canvasTex(512, 256, (g, W, H) => {
      const gr = g.createRadialGradient(W / 2, H / 2, H * 0.12, W / 2, H / 2, W * 0.5);
      gr.addColorStop(0, 'rgba(253,251,245,0.9)'); gr.addColorStop(0.62, 'rgba(253,251,245,0.82)'); gr.addColorStop(1, 'rgba(253,251,245,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    });
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.26), new THREE.MeshLambertMaterial({ map: sheetTex, transparent: true, depthWrite: false }));
    sheet.rotation.x = -Math.PI / 2; sheet.position.set(-0.01, 0.0004, 0.02); sheet.receiveShadow = true; sheet.renderOrder = 1; sheet.raycast = () => {}; sheet.userData.noFrame = true;
    group.add(sheet);

    // ---------------- 铁架台 + 电解器（霍夫曼式） ----------------
    // 铁架台放在右后方、转过来：横杆朝左伸向电解器
    const st = stand({ height: 0.36, baseW: 0.16, baseD: 0.09 });
    st.position.set(0.17, 0, -0.03); st.rotation.y = Math.PI;
    const rodX = st.position.x - st.rodX;   // 支架绕竖轴转了半圈。
    st.clamp(BASE_Y + 0.11, rodX - 0.05);
    const upper = st.clamp(BASE_Y + 0.259, Math.hypot(rodX, 0.03) - 0.023);
    upper.rotation.y = Math.atan2(0.03, rodX);
    group.add(st);
    const glass = glassMat({ opacity: 0.16 });
    const mkTube = (x) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(R_IN + 0.0011, R_IN + 0.0011, TUBE_H, 24, 1, true), glass);
      body.position.y = BASE_Y + TUBE_H / 2; body.renderOrder = 9; glassEdge(body, 0.0006);
      const top = new THREE.Mesh(new THREE.ConeGeometry(R_IN + 0.0011, 0.018, 24, 1, true), glass);
      top.position.y = BASE_Y + TUBE_H + 0.009; top.renderOrder = 9;
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.0013, 0.0016, 0.02, 10), glass);
      tip.position.y = BASE_Y + TUBE_H + 0.03; tip.renderOrder = 9;
      // 活塞（横着的小把手，开 = 竖直）
      const cock = new THREE.Group(); cock.position.y = BASE_Y + TUBE_H + 0.022;
      const knob = inked(new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.004, 0.004), paint(0xe9edf0)), { width: 0.8 });
      cock.add(knob);
      const cockPick = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.02), new THREE.MeshBasicMaterial({ visible: false })); cockPick.userData.pick = true; cock.add(cockPick);
      // 管里的水（上面是气体）
      const water = new THREE.Mesh(new THREE.CylinderGeometry(R_IN - 0.0003, R_IN - 0.0003, 1, 20), water2({ color: CHEM.water }));
      water.geometry.translate(0, 0.5, 0); water.position.y = BASE_Y; water.renderOrder = 7;
      // 电极（铂片）
      const el = inked(new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.018, 0.0012), paint(0xc9ccd2)), { width: 0.6 });
      el.position.y = BASE_Y + 0.012;
      // 刻度：从管顶往下 0–22 mL
      const scale = new THREE.Mesh(new THREE.PlaneGeometry(0.014, MAX_ML * ML_LEN + 0.006), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, map: canvasTex(64, 760, (c, w, hh) => {
        c.clearRect(0, 0, w, hh); c.fillStyle = '#243049'; c.font = 'bold 22px sans-serif'; c.textAlign = 'left';
        const top0 = 8, per = (hh - 16) / MAX_ML;
        for (let m = 0; m <= MAX_ML * 2; m++) {
          const y = top0 + (m / 2) * per, big = m % 10 === 0, mid = m % 2 === 0;
          c.fillRect(0, y - 1.2, big ? 30 : mid ? 20 : 11, 2.4);
          if (big) c.fillText(String(m / 2), 34, y + 8);
        }
      }) }));
      scale.position.set(R_IN + 0.0085, BASE_Y + TUBE_H - (MAX_ML * ML_LEN) / 2 - 0.001, 0.0); scale.renderOrder = 11;
      // 管顶的气体：检验出是氧气以后染上淡蓝（这套书里“蓝色 = 氧气”）
      const gas = new THREE.Mesh(new THREE.CylinderGeometry(R_IN - 0.0004, R_IN - 0.0004, 1, 20), new THREE.MeshBasicMaterial({ color: 0x2f7fd8, transparent: true, opacity: 0, depthWrite: false }));
      gas.geometry.translate(0, -0.5, 0); gas.position.y = BASE_Y + TUBE_H; gas.renderOrder = 8;
      g.add(body, top, tip, cock, water, el, scale, gas);
      g.position.x = x;
      Object.assign(g, { water, gas, cock, knob, cockPick, tipY: BASE_Y + TUBE_H + 0.04, ruler: scale });
      return g;
    };
    const tubes = { neg: mkTube(X.neg), pos: mkTube(X.pos) };
    group.add(tubes.neg, tubes.pos);
    // 底部的连通管和中间的长颈漏斗（储水）
    const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, X.pos - X.neg, 14), glass);
    bottom.rotation.z = Math.PI / 2; bottom.position.y = BASE_Y - 0.004; bottom.renderOrder = 9; glassEdge(bottom, 0.0005);
    const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.24, 12), glass);
    mid.position.set(0, BASE_Y + 0.115, 0); mid.renderOrder = 9;
    const bulbPts = [new THREE.Vector2(0.0036, 0), new THREE.Vector2(0.006, 0.006), new THREE.Vector2(0.022, 0.02), new THREE.Vector2(0.024, 0.032), new THREE.Vector2(0.025, 0.034)];
    const bulb = new THREE.Mesh(new THREE.LatheGeometry(bulbPts, 28), glass);
    bulb.position.set(0, BASE_Y + 0.235, 0); bulb.renderOrder = 9; glassEdge(bulb, 0.0006);
    const bulbWater = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.006, 1, 24), water2({ color: CHEM.water }));
    bulbWater.geometry.translate(0, 0.5, 0); bulbWater.position.set(0, BASE_Y + 0.238, 0); bulbWater.renderOrder = 7;
    const midWater = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.24, 10), water2({ color: CHEM.water }));
    midWater.position.copy(mid.position);
    const bulbPick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 10), new THREE.MeshBasicMaterial({ visible: false }));
    bulbPick.position.set(0, BASE_Y + 0.255, 0); bulbPick.userData.pick = true;
    const ring = hull(new THREE.Mesh(new THREE.TorusGeometry(0.023, 0.0025, 8, 28), paint(0x3d4352)), 0.0008);
    ring.rotation.x = Math.PI / 2; ring.position.set(0, BASE_Y + 0.259, 0);
    group.add(bottom, mid, midWater, bulb, bulbWater, bulbPick, ring);
    // 夹子
    const holder = inked(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.012), paint(0x9aa3b2)), { width: 0.8 });
    holder.position.set(0, BASE_Y + 0.11, -0.012); group.add(holder);
    const holderArm = inked(new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.006, 0.03), paint(0x8a929e)), { width: 0.8 });
    holderArm.position.set(0.05, BASE_Y + 0.11, -0.024); group.add(holderArm);

    // ---------------- 直流电源、导线 ----------------
    const box = new THREE.Group(); box.position.set(-0.19, 0, 0.01);
    const shell = inked(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.065, 0.075), paint(0x2c3140)), { width: 1 });
    shell.position.y = 0.0325; box.add(shell);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.094, 0.058), new THREE.MeshBasicMaterial({ map: canvasTex(320, 200, (c, w, hh) => {
      c.fillStyle = '#2c3140'; c.fillRect(0, 0, w, hh);
      c.fillStyle = '#e8ecf2'; c.font = 'bold 22px sans-serif'; c.fillText('学生电源', 14, 30);
      c.font = '18px sans-serif'; c.fillText('直流', 230, 30);
      c.fillStyle = '#d8402e'; c.beginPath(); c.arc(230, 160, 16, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 26px sans-serif'; c.fillText('+', 221, 169);
      c.fillStyle = '#1b1e26'; c.beginPath(); c.arc(285, 160, 16, 0, 7); c.fill(); c.strokeStyle = '#999'; c.stroke(); c.fillStyle = '#fff'; c.fillText('−', 277, 168);
    }) }));
    face.position.set(0, 0.0325, 0.0376); box.add(face);
    const sw = inked(new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.012, 0.008), paint(0xd9dde3, { unique: true })), { width: 0.8 });
    sw.position.set(-0.03, 0.022, 0.04); box.add(sw);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 10, 8), new THREE.MeshBasicMaterial({ color: 0x3a1a1a }));
    led.position.set(-0.008, 0.024, 0.039); box.add(led);
    const swPick = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.08), new THREE.MeshBasicMaterial({ visible: false })); swPick.position.y = 0.0325; swPick.userData.pick = true; box.add(swPick);
    group.add(box);
    // 导线：从电源接线柱垂到桌面，贴着桌面走过去，再抬起来接到电极夹上——全程不低于桌面（器材直接放在书页上，没有台板挡着）
    const R_W = 0.0017, LIE = R_W + 0.0028;
    const wire = (from, to, color) => { const c = new THREE.CatmullRomCurve3([from, new THREE.Vector3(from.x + 0.008, LIE + 0.004, from.z + 0.012), new THREE.Vector3(from.x + 0.03, LIE, from.z + 0.02), new THREE.Vector3(to.x - 0.025, LIE, to.z + 0.03), new THREE.Vector3(to.x - 0.004, LIE + 0.006, to.z + 0.012), to], false, 'centripetal'); return hull(new THREE.Mesh(new THREE.TubeGeometry(c, 60, R_W, 6), paint(color, { keep: true })), 0.0006); };      // 红、黑导线保留本色：正负极就靠颜色认
    const termPos = new THREE.Vector3(-0.19 + 0.022, 0.012, 0.05), termNeg = new THREE.Vector3(-0.19 + 0.04, 0.012, 0.05);
    group.add(wire(termNeg, new THREE.Vector3(X.neg, BASE_Y - 0.008, 0.004), 0x1b1e26), wire(termPos, new THREE.Vector3(X.pos, BASE_Y - 0.01, 0.006), 0xc8341f));
    const clipN = inked(new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.008), paint(0x1b1e26, { keep: true })), { width: 0.6 }); clipN.position.set(X.neg, BASE_Y - 0.008, 0.004);
    const clipP = inked(new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.008), paint(0xc8341f, { keep: true })), { width: 0.6 }); clipP.position.set(X.pos, BASE_Y - 0.01, 0.006);
    group.add(clipN, clipP);

    // ---------------- 桌上：硫酸钠溶液、木条 ----------------
    const dropper = new THREE.Group();
    const dbody = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 18), glassMat({ opacity: 0.25, color: 0xa9774f })); dbody.position.y = 0.02; dbody.renderOrder = 8;
    const dneck = new THREE.Mesh(new THREE.CylinderGeometry(0.0048, 0.0052, 0.007, 14, 1, true), glassMat({ opacity: 0.25, color: 0xa9774f })); dneck.position.y = 0.0435; dneck.renderOrder = 8; glassEdge(dneck, 0.0004);      // 瓶颈（瓶盖拿下来以后看得见瓶口）
    const dliq = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.0105, 0.026, 16), paint(0xdbe8ee, { unique: true, transparent: true, opacity: 0.7 })); dliq.position.y = 0.014;
    const dcap = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.006, 0.02, 12), paint(0xb8432f)), { width: 0.7 }); dcap.position.y = 0.05;
    const dPick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.07, 10), new THREE.MeshBasicMaterial({ visible: false })); dPick.position.y = 0.03; dPick.userData.pick = true;
    dropper.add(dbody, dneck, dliq, dcap, dPick);
    const DROP_HOME = new THREE.Vector3(-0.07, 0, 0.115);      // 放在导线前面，不挡着导线
    dropper.position.copy(DROP_HOME); group.add(dropper);
    // 瓶盖：拿起瓶子时取下来倒放在瓶子右边的桌上；瓶子放回原处以后盖好（课本上册第 17 页）
    const dLid = bottleCap(group, dropper, dcap, { rest: DROP_HOME.clone().add(new THREE.Vector3(0.032, 0, 0.004)) });
    const lidAway = () => dcap.parent === group && Math.hypot(dcap.position.x - dropper.position.x, dcap.position.z - dropper.position.z) > 0.014;
    // 往漏斗里倒的姿势（瓶底是原点）：瓶身朝右下斜，瓶口挨着漏斗口左边的沿；POUR_UP 是它正上方（先在这里斜过来，再落下去）
    const POUR_AT = new THREE.Vector3(-0.068, 0.332, 0), POUR_UP = new THREE.Vector3(-0.068, 0.345, 0), POUR_TILT = -1.75, SAFE_Y = 0.34;
    const saltDrops = new Particles({ max: 30, geometry: new THREE.SphereGeometry(1, 6, 5), material: water2({ color: 0xdbe8ee, base: 0.5 }) }); group.add(saltDrops.mesh);
    const stick = splint({ len: 0.12 }); const STICK_HOME = new THREE.Vector3(0.0, 0.006, 0.09); stick.position.copy(STICK_HOME); stick.rotation.z = Math.PI / 2; group.add(stick);
    const stickPick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.13, 0.02), new THREE.MeshBasicMaterial({ visible: false })); stickPick.position.y = 0.06; stickPick.userData.pick = true; stick.add(stickPick);

    // ---------------- 粒子：气泡、氢气的火焰、分子示意 ----------------
    const bubs = new Particles({ max: 260, geometry: new THREE.SphereGeometry(1, 10, 8), material: bubble2() });
    bubs.mesh.renderOrder = 10;
    const blue = flame2({ w: 0.009, h: 0.024, core: 0xdbe8ff, mid: 0x9cc0ff, edge: 0x6f9cf5, blue: 0.6, blueColor: 0x5f8ff0, alpha: 0.5, glowK: 0.15 });      // 氢气燃烧：淡蓝色、很淡的火焰
    blue.setOn(false);
    group.add(bubs.mesh, blue);
    // 微观次元：电极之间的水里，水分子怎样分解成氢分子和氧分子（数一数：总是 2∶1）
    const MW_AT = new THREE.Vector3(0, BASE_Y + 0.012, 0.05);
    const mw = microWorld({ mode: 'holo', scene: electrolysisScene(), place: () => ({ pos: group.localToWorld(MW_AT.clone()), scale: 0.0095 * group.getWorldScale(new THREE.Vector3()).x, cam: window.__lb.stage.camera }) });
    const goBtn = tag('钻进水里看 ⊙', 'pill mw-go', () => openMicro());
    const openMicro = (demo = false) => {
      if (!demo) { S.near = true; look([MW_AT.x, MW_AT.y + 0.075, MW_AT.z], [0.03, 0.22, 1], 0.36, () => { S.near = false; }); }
      const r = () => { const cam = window.__lb?.stage?.camera; if (!cam) return [innerWidth / 2, innerHeight * 0.8]; const v = group.localToWorld(MW_AT.clone()).project(cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; };
      mw.open(r, { on: S.on, salt: S.salt });
    };
    mw.onClose = () => { if (!bar.playing) far(); };


    const tags = { neg: tag('', 'pill'), pos: tag('', 'pill') };
    // 卡片：电源（电流、通电时间）；检验之后，两根管旁边各一张结论卡
    const powerCard = tag('', 'cond'); powerCard.px = [0, -64];
    const resCard = { neg: tag('', 'cond'), pos: tag('', 'cond') }; resCard.neg.px = [-96, -10]; resCard.pos.px = [96, -10];

    const fresh = () => ({
      salt: false, on: false, t: 0, gas: { neg: 0, pos: 0 }, made: { neg: 0, pos: 0 }, I: 0, cock: { neg: false, pos: false },
      rows: [], view: false, seen: new Set(), test: null, tested: { neg: '', pos: '' }, near: false, demo: false,
    });
    let S = fresh();
    let W = null;
    const status = (m) => { if (!S.demo) W?.status(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };          // 演示里的操作不算学生的步骤
    // 拿着的木条 / 硫酸钠溶液要去的地方（每帧滑过去，不跳）；pour：正在往漏斗里倒
    let stickTo = null, dropTo = null, pour = null;
    const home = () => { stick.setState('none'); stick.position.copy(STICK_HOME); stick.rotation.z = Math.PI / 2; stick.userData.at = null; dropper.position.copy(DROP_HOME); dropper.rotation.z = 0; blue.setOn(false); stickTo = dropTo = pour = null; saltDrops.clear(); };
    // 木条凑到尖嘴上时的姿势：燃着的一端在尖嘴旁边，木条朝外斜（负极那边朝左下，不碰到中间的长颈漏斗）
    const near2 = (a, cur) => a + Math.PI * 2 * Math.round((cur - a) / (Math.PI * 2));      // 转最近的那一边
    const stickTilt = (x) => near2(x < -0.005 ? Math.PI * 0.75 : -Math.PI * 0.75, stick.rotation.z);
    const atTip = (side) => new THREE.Vector3(X[side] + (side === 'neg' ? -0.007 : 0.007), tubes[side].tipY + 0.004, 0);
    // 放回桌上：先水平挪到原处的上方，再放下去（不斜着穿过别的器材）
    const carryHome = (o, p, a) => { const d = Math.hypot(o.position.x - p.x, o.position.z - p.z); o.position.lerp(d > 0.004 ? new THREE.Vector3(p.x, Math.max(o.position.y, p.y), p.z) : p, a); };

    const A = {
      salt() {
        if (S.salt) return status('已经加过硫酸钠溶液了，少量就够。');
        S.salt = true; done('salt');
        status('向漏斗里加了少量<b>硫酸钠溶液</b>，增强水的导电性。' + (S.on ? '看看电极上的气泡。' : '现在接通电源。'));
      },
      power(v = !S.on) {
        if (v && (S.cock.neg || S.cock.pos)) return status('先关上玻璃管上的活塞，再通电。');
        S.on = v;
        if (v) { done('power'); status('通电了。看两个电极上的气泡，和两根玻璃管里的液面。（时间加快 10 倍）'); }
        else { if (bar.has('ratio')) done('off'); status('切断了电源。' + (S.gas.neg > 2 && S.gas.pos > 1 ? '现在可以检验两种气体。' : '')); }
      },
      cock(side) {
        if (S.on) return status('先<b>切断电源</b>，再检验气体（课本第 93 页步骤（2））。');
        S.cock[side] = !S.cock[side];
        if (S.cock[side] && stick.userData.at === side && !S.test) return A.test(side);       // 木条已经凑在尖嘴上：放出气体就检验
        if (S.cock[side] && S.gas[side] < 0.2) status('这根管里没有气体。');
        else if (S.cock[side]) status('打开了活塞，气体从尖嘴放了出去。要检验，先把<b>燃着的木条</b>凑到尖嘴上。');
      },
      test(side) {
        if (S.test) return status('等这一次检验做完，再检验另一根管。');
        if (S.on) return status('先切断电源。');
        if (S.gas[side] < 0.5) return status('这根管里的气体太少了。');
        S.test = { side, t: 0 }; S.cock[side] = true; stickTo = atTip(side); stick.setState('flame', 0.6);
        near(new THREE.Vector3(X[side], BASE_Y + TUBE_H + 0.03, 0), [0.05, 0.2, 1], 0.24);
      },
      reset() {
        bubs.clear(); S = fresh(); home(); mw.close();
        if (W) { W.tbl.clear(); W.rows.length = 0; for (const b of [W.readBox, W.qBox, W.q2Box, W.q3Box, W.next]) b.hidden = true; }
        bar.undo('power', 'salt', 'read', 'ratio', 'off', 'testpos', 'testneg', 'what', 'mass');
        status('重新加满了水（还没加硫酸钠），记录也清空了。');
      },
    };

    // ================= 拖放（演示里也走这一套：器材沿路线移过去） =================
    const drag = draggable(group, [
      { obj: swPick, plane: 'xy', offset: 0.05, hint: () => (S.on ? '点一下：切断电源' : '点一下：接通电源'), onTap: () => A.power(), onStart: () => {}, onDrag: () => {}, onEnd: () => {} },
      { obj: dPick, plane: 'xy', offset: 0, hint: '拖到漏斗里：加少量硫酸钠溶液', enabled: () => !S.salt && !pour,
        onStart: () => { if (!pour) dropTo = dropper.position.clone(); },
        onDrag: (p) => { if (!pour) dropTo = new THREE.Vector3(p.x, Math.max(0, p.y), p.z || 0); },
        onEnd: () => {
          if (pour || !dropTo) return;
          const over = Math.abs(dropTo.x) < 0.04 && dropTo.y > BASE_Y + 0.17;
          if (over && !S.salt) pour = { ph: 'up', t: 0 };          // 先升高、到漏斗左上方斜过来，再落下去让瓶口挨着漏斗口，倒进去（倒的时候才算加进去）
          else if (over) A.salt();
          dropTo = null;
        } },
      ...['neg', 'pos'].map((side) => ({ obj: tubes[side].cockPick, plane: 'xy', offset: 0, hint: () => (S.cock[side] ? '点一下：关上活塞' : '点一下：打开活塞，放出气体'), onTap: () => A.cock(side), onStart: () => {}, onDrag: () => {}, onEnd: () => {} })),
      { obj: stickPick, plane: 'xy', offset: 0, hint: '拖到玻璃管尖嘴：用燃着的木条检验',
        onStart: () => { if (S.test) return; stick.setState('flame', 0.6); stickTo = stick.position.clone(); },          // 燃着的一端朝上（朝外斜着拿）
        onDrag: (p) => { if (S.test) return; stickTo = new THREE.Vector3(p.x, Math.max(0.09, p.y), p.z || 0); },          // 燃着的一端跟着鼠标
        onEnd: () => {
          if (S.test || !stickTo) return;
          const tipX = stickTo.x, tipY = stickTo.y;
          const side = ['neg', 'pos'].find((s) => Math.abs(tipX - X[s]) < 0.02 && Math.abs(tipY - tubes[s].tipY) < 0.03);
          if (side) { stick.userData.at = side; if (!S.cock[side]) status('木条凑到了尖嘴上。现在点这根管上的<b>活塞</b>，放出气体。'); else A.test(side); }
          else { stickTo = null; stick.userData.at = null; stick.setState('none'); }
        } },
    ], { tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    // 演示：沿折线拖过去（先抬起来、越过别的器材，再凑过去）。pts[0] 为 null 时从器材现在的地方出发。——建议进 kit（act.path）
    const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
    const centerOf = (o) => { group.updateMatrixWorld(true); return group.worldToLocal(new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3())); };
    const path = (obj, pts, o) => act.path(obj, pts, o);      // 沿几个点拿过去（kit/chemlesson.js 的 act.path）
    // 木条：从桌上拿起来（往上抬），从前面绕到尖嘴上方，再凑到尖嘴旁
    const stickRoute = (side) => [null, () => { const c = centerOf(stickPick); return new THREE.Vector3(c.x, 0.33, c.z); }, () => atTip(side).add(new THREE.Vector3(0, 0.03, 0.03)), () => atTip(side)];

    // ================= 底部步骤栏 + 老师的演示（独立的一套器材） =================
    let saved = null;
    const bar = lessonBar({
      look, back, group,         // group：提示光圈画在这一组里
      steps: [
        { id: 'salt', title: '加硫酸钠', todo: '把桌上的<b>硫酸钠溶液</b>拖到电解器上面的漏斗里，加少量，增强水的导电性。', target: () => (S.salt || pour ? null : dropper) },
        { id: 'power', title: '接通电源', todo: '点一下<b>电源</b>，接通直流电源，观察两根玻璃管里的现象。', target: () => (S.on ? null : box) },
        { id: 'read', title: '读刻度', todo: '两根管里聚了一些气体以后，点左边的<b>读刻度</b>，自己读两根管的刻度、记一组。负极管里有 8 mL 以上时再记一组。' },
        { id: 'ratio', title: '比体积', todo: '比一比你记下的数据：负极管和正极管里气体的体积比大约是多少？在左边作答。' },
        { id: 'off', title: '切断电源', todo: '点一下<b>电源</b>切断它，准备检验两种气体。', target: () => (S.on ? box : null) },
        { id: 'testpos', title: '检验正极的气体', todo: '把<b>燃着的木条</b>拖到<b>正极</b>那根管的尖嘴上，再点这根管的活塞，放出气体。', target: () => (S.test ? null : stick) },
        { id: 'testneg', title: '检验负极的气体', todo: '再把燃着的木条拖到<b>负极</b>那根管的尖嘴上，点活塞放出气体。', target: () => (S.test ? null : stick) },
        { id: 'what', title: '水由什么组成', todo: '两种气体都检验了：水由什么组成？在左边作答。' },
        { id: 'mass', title: '比质量', todo: '最后算一算：生成的氢气和氧气，质量比是多少？在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          onStart: () => { if (!saved) saved = S; S = fresh(); S.demo = true; bubs.clear(); home(); mw.close(); },
          onEnd: () => { mw.close(); if (!saved) return; S = saved; saved = null; S.near = false; bubs.clear(); home(); bar.say('演示看完了。桌上的器材和记录还是你自己的那一套——接着往下做。', bar.current || 'end'); setTimeout(() => bar.say(null), 4000); },
          shots: [
            { cap: '电解器里加满了水。向漏斗里加少量硫酸钠溶液，增强水的导电性。', dur: 9, cam: [[-0.03, BASE_Y + 0.2, 0.04], [0.1, 0.12, 1], 0.68],
              during: path(dPick, [null, new THREE.Vector3(-0.07, 0.35, 0.115), new THREE.Vector3(-0.02, 0.35, 0)], { t0: 0.04, t1: 0.3, release: 0.33 }) },
            { cap: '接通直流电源。', dur: 2.4, cam: [[-0.06, BASE_Y + 0.08, 0], [0.12, 0.12, 1], 0.62], during: act.tap(swPick, 0.3) },
            { cap: '两个电极上都冒出气泡，气体聚在玻璃管顶端，管里的液面下降。', dur: 3.4, cam: [[0, BASE_Y + 0.12, 0], [0.08, 0.1, 1], 0.42], speed: 3 },
            { cap: '钻进水里看：两个水分子拆成原子，重新组合成两个氢分子和一个氧分子。', dur: 9, cam: [[MW_AT.x, MW_AT.y + 0.075, MW_AT.z], [0.03, 0.22, 1], 0.36], during: act.at(0.04, () => openMicro(true)) },
            { cap: '与负极相连的管里气体多，大约是正极的 2 倍。', dur: 3.4, enter: () => mw.close(), cam: [[0, BASE_Y + TUBE_H - 0.05, 0], [0.02, 0.05, 1], 0.3], speed: 3 },
            { cap: '切断电源。', dur: 1.8, cam: [[-0.19, 0.04, 0.01], [0.12, 0.16, 1], 0.3], during: act.tap(swPick, 0.3) },
            { cap: '把燃着的木条凑到正极管的尖嘴，打开活塞——木条燃烧得更旺：是氧气。', dur: 7, cam: [[X.pos, BASE_Y + TUBE_H + 0.01, 0.02], [0.05, 0.2, 1], 0.34],
              during: act.seq(path(stickPick, stickRoute('pos'), { t0: 0.04, t1: 0.36, release: 0.38 }), act.tap(tubes.pos.cockPick, 0.44)) },
            { cap: '再凑到负极管的尖嘴——气体被点燃，发出淡蓝色火焰：是氢气。', dur: 7, cam: [[X.neg, BASE_Y + TUBE_H + 0.01, 0.02], [0.05, 0.2, 1], 0.34],
              during: act.seq(path(stickPick, stickRoute('neg'), { t0: 0.04, t1: 0.36, release: 0.38 }), act.tap(tubes.neg.cockPick, 0.44)) },
            { cap: '水通电分解，生成了氢气和氧气。演示完了，下面换你自己做。', dur: 3.2, cam: [[0, BASE_Y + 0.12, 0], [0.12, 0.12, 1], 0.6] },
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

    // ---------------- 每帧 ----------------
    const step = (h) => {
      const hv = h * SPEED;
      // 电流：加了硫酸钠约 0.30 A；纯水约 0.3 mA
      S.I += ((S.on ? (S.salt ? 0.3 : 0.0003) : 0) - S.I) * Math.min(1, h * 4);
      if (S.on) S.t += hv;
      const nE = (S.I * hv) / F;                       // 这一帧流过的电子（mol）
      const dH = (nE / 2) * VM * 1000, dO = (nE / 4) * VM * 1000;     // mL
      S.made.neg += dH; S.made.pos += dO;
      // 先溶进水里一部分，之后才在管顶聚成气体
      const intoGas = (side, d) => { const left = Math.max(0, DISSOLVE[side] - (S.made[side] - d)); const g = Math.max(0, d - Math.min(d, left)); S.gas[side] = Math.min(MAX_ML, S.gas[side] + g); };
      intoGas('neg', dH); intoGas('pos', dO);
      // 活塞开着：气体放出去
      for (const side of ['neg', 'pos']) if (S.cock[side] && S.gas[side] > 0) S.gas[side] = Math.max(0, S.gas[side] - h * 0.8);      // 检验只放出一部分，管里还留着气体
      // 气泡
      const rate = { neg: S.I * 520, pos: S.I * 260 };
      for (const side of ['neg', 'pos']) {
        S['acc' + side] = (S['acc' + side] || 0) + rate[side] * h;
        while (S['acc' + side] > 1) { S['acc' + side] -= 1; bubs.spawn({ p: new THREE.Vector3(X[side] + (Math.random() - 0.5) * 0.005, BASE_Y + 0.008 + Math.random() * 0.016, (Math.random() - 0.5) * 0.002), v: new THREE.Vector3(0, 0.04, 0), size: side === 'neg' ? 0.0007 : 0.0009, life: 8, side }); }
      }
      bubs.update(h, (p, d) => { p.v.y += 0.3 * d; p.p.addScaledVector(p.v, d); const lvl = BASE_Y + TUBE_H - S.gas[p.side] * ML_LEN; return p.p.y < lvl; });
      // 硫酸钠溶液：拿起瓶子时瓶盖先取下来倒放在桌上（拿开了瓶子才跟着手走）；在漏斗上方松手：先升高，挪到漏斗左上方斜过来，
      // 再落下去让瓶口挨着漏斗口，倒进去少量；倒好了抬起来、摆正，放回原处，盖好瓶盖（课本上册第 17 页）
      const ar = 1 - Math.exp(-h * 22), ah = 1 - Math.exp(-h * 6), ap = 1 - Math.exp(-h * 9);
      const dp = dropper.position, rotTo = (want, a) => { dropper.rotation.z += (want - dropper.rotation.z) * a; };
      dLid.update(1 - Math.exp(-h * 10), !!(pour || dropTo) || dp.distanceTo(DROP_HOME) > 0.0015 || Math.abs(dropper.rotation.z) > 0.02);
      // 滑过去：每帧靠近一部分，但一帧不超过 vmax·h（离得远时匀速走，不跳）
      const glide = (p, a, v = 0.4) => { const d = p.clone().sub(dp).multiplyScalar(a), m = v * h; if (d.length() > m) d.setLength(m); dp.add(d); };
      if (pour) {
        const P = pour, tr = Math.min(1, h * 5);
        if (P.ph === 'up' && !lidAway()) { glide(DROP_HOME.clone().setY(dp.y), ap); }          // 瓶盖还没拿开：瓶子先不动
        else if (P.ph === 'up') { glide(new THREE.Vector3(dp.x, Math.max(dp.y, SAFE_Y), dp.z), ap); rotTo(0, ap); if (dp.y > SAFE_Y - 0.003) P.ph = 'over'; }
        else if (P.ph === 'over') { glide(POUR_UP, ap); rotTo(0, ap); if (dp.distanceTo(POUR_UP) < 0.003) P.ph = 'tilt'; }
        else if (P.ph === 'tilt') { glide(POUR_UP, ap); rotTo(POUR_TILT, tr); if (Math.abs(dropper.rotation.z - POUR_TILT) < 0.06) P.ph = 'in'; }
        else if (P.ph === 'in') { glide(POUR_AT, ap); rotTo(POUR_TILT, tr); if (dp.distanceTo(POUR_AT) < 0.0015) { P.ph = 'pour'; P.t = 0; if (!S.salt) A.salt(); } }
        else if (P.ph === 'pour') {
          P.t += h; glide(POUR_AT, ap); rotTo(POUR_TILT, tr);
          if (P.t < 1.2 && Math.random() < h * 9) {
            dropper.updateMatrixWorld(true);
            const m = group.worldToLocal(dropper.localToWorld(new THREE.Vector3(0, 0.048, 0)));
            saltDrops.spawn({ p: m, v: new THREE.Vector3(0, -0.02, 0), size: 0.0017, life: 2 });
          }
          if (P.t > 1.5) P.ph = 'out';
        }
        else if (P.ph === 'out') { glide(POUR_UP, ap); rotTo(POUR_TILT, tr); if (dp.distanceTo(POUR_UP) < 0.003) P.ph = 'level'; }
        else if (P.ph === 'level') { glide(POUR_UP, ap); rotTo(0, tr); if (Math.abs(dropper.rotation.z) < 0.03) pour = null; }
      } else if (dropTo && !lidAway()) { dp.lerp(DROP_HOME, ar); rotTo(0, ar); }          // 瓶盖还没拿开：瓶子先留在桌上
      else if (dropTo) { dp.lerp(dropTo, ar); rotTo(0, ar); }
      else { const far = Math.hypot(dp.x - DROP_HOME.x, dp.z - DROP_HOME.z) > 0.004; glide(far ? new THREE.Vector3(DROP_HOME.x, Math.max(dp.y, DROP_HOME.y), DROP_HOME.z) : DROP_HOME, Math.min(1, ah * 1.5)); rotTo(0, ah); }      // 放回原处：先挪到原处上方，再放下去
      const bulbTop = BASE_Y + 0.238 + bulbWater.scale.y;
      saltDrops.update(h, (q, d) => { q.v.y -= 0.8 * d; q.p.addScaledVector(q.v, d); return q.p.y > bulbTop; });
      // 木条：拿着的时候跟着走，朝外斜着；放下就拿回桌上
      if (!S.test) {
        if (stickTo) { stick.position.lerp(stickTo, ar); stick.rotation.z += (stickTilt(stickTo.x) - stick.rotation.z) * ar; }
        else { carryHome(stick, STICK_HOME, ah); stick.rotation.z += (near2(Math.PI / 2, stick.rotation.z) - stick.rotation.z) * ah; }
      }
      // 检验
      const T = S.test;
      blue.setOn(false);
      if (T) {
        T.t += h;
        const side = T.side, tipY = tubes[side].tipY;
        stick.position.lerp(atTip(side), ar * 0.6); stick.rotation.z += (stickTilt(X[side]) - stick.rotation.z) * ar;
        const flowing = S.gas[side] > 0.05 && S.cock[side];
        if (side === 'pos') {
          stick.setState('flame', flowing ? 1.6 : 0.6);
          if (T.t > 0.8 && !S.tested.pos) { S.tested.pos = 'more'; done('testpos'); status('打开<b>正极</b>那根管的活塞：燃着的木条<b>燃烧得更旺</b>了——是<b>氧气</b>。'); }
        } else {
          stick.setState('flame', 0.6);
          blue.position.set(X.neg, tipY + 0.001, 0); blue.setOn(flowing);
          if (T.t > 0.8 && !S.tested.neg) { S.tested.neg = 'burn'; done('testneg'); status('打开<b>负极</b>那根管的活塞：气体被点燃，在尖嘴处燃烧，发出<b>淡蓝色火焰</b>——是<b>氢气</b>。'); }
        }
        if (T.t > 3.5 || (!flowing && T.t > 1.2)) { S.test = null; S.cock[side] = false; far(); stickTo = null; stick.userData.at = null; stick.setState('none'); blue.setOn(false); if (!S.demo) A.maybeWhat?.(); }      // 检验完：木条拿回桌上
      }
      // 水面：管里的水被气体压下去，漏斗里的水升上来；检验出是氧气以后，那根管里的气体染上淡蓝
      for (const side of ['neg', 'pos']) {
        const tb = tubes[side];
        const lvl = TUBE_H - S.gas[side] * ML_LEN;
        tb.water.scale.y = Math.max(0.001, lvl);
        tb.gas.scale.y = Math.max(0.0001, S.gas[side] * ML_LEN); tb.gas.visible = S.gas[side] > 0.05;
        tb.gas.material.opacity += ((side === 'pos' && S.tested.pos ? 0.2 : 0) - tb.gas.material.opacity) * Math.min(1, h * 3);
        tb.knob.rotation.z += ((S.cock[side] ? Math.PI / 2 : 0) - tb.knob.rotation.z) * Math.min(1, h * 12);      // 活塞转过去
      }
      const up = (S.gas.neg + S.gas.pos) * 1e-6 / (Math.PI * 0.016 * 0.016);
      bulbWater.scale.y = 0.004 + Math.min(0.028, up);
      led.material.color.setHex(S.on ? 0xff4a3a : 0x3a1a1a);
      sw.position.z += ((S.on ? 0.037 : 0.04) - sw.position.z) * Math.min(1, h * 14);      // 开关按下去 / 弹回来
      mw.set({ on: S.on && S.I > 0.0002, salt: S.salt });
      goBtn.loc(group, MW_AT.x, MW_AT.y + 0.02, MW_AT.z).show(!mw.isOpen && !bar.playing);
      // 标签和卡片
      tags.neg.loc(group, X.neg - 0.024, BASE_Y - 0.022, 0.03).text('接电源负极');
      tags.pos.loc(group, X.pos + 0.024, BASE_Y - 0.022, 0.03).text('接电源正极');
      const pc = `<div class="cc"><div class="cc-t"><span class="cc-name">直流电源</span>${S.on ? '<span class="cc-res burn">通电</span>' : '<span class="cc-res">断开</span>'}</div><div class="cc-more"><div class="cc-obs">${S.on ? `电流约 <b>${S.salt ? '0.30 A' : '0.3 mA'}</b>` : ''}${S.t > 0 ? `<small>　已通电 ${(S.t / 60).toFixed(1)} 分钟（时间加快 10 倍）</small>` : ''}</div></div></div>`;
      powerCard.text(pc).loc(group, -0.19, 0.07, 0.01).show(true);
      const res = { neg: S.tested.neg && ['负极管里的气体', '能燃烧', '火焰淡蓝色 → <b style="color:#2b3142">氢气</b>'], pos: S.tested.pos && ['正极管里的气体', '助燃', '使燃着的木条燃烧更旺 → <b class="o2-num">氧气</b>'] };
      for (const side of ['neg', 'pos']) {
        const r = res[side];
        resCard[side].text(r ? `<div class="cc"><div class="cc-t"><span class="cc-name">${r[0]}</span><span class="cc-res burn">${r[1]}</span></div><div class="cc-more"><div class="cc-obs">${r[2]}</div></div></div>` : '').loc(group, X[side], BASE_Y + TUBE_H - 0.02, 0).show(!!r);
      }
      bar.near(S.near);
    };

    return {
      group: root,
      pointer,
      card: false,                 // 不要实验台板：器材直接立在课本这一页上
      toggles: ['cards', 'steps'],
      size: { w: 0.51, d: 0.16, h: 0.33 },
      view: { elev: 10, azim: -10, lookY: 0.52, margin: 1.02 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const rows = [];
        const tbl = table(['时间/min', '正极管中气体/mL', '负极管中气体/mL']);
        // 读一读：学生自己输入两个读数，和真实值比较（误差 0.5 mL 以内算读对）
        const inPos = h('input', { type: 'number', step: '0.5', min: '0', max: String(MAX_ML), class: 'read-in', placeholder: '正极' });
        const inNeg = h('input', { type: 'number', step: '0.5', min: '0', max: String(MAX_ML), class: 'read-in', placeholder: '负极' });
        let pending = null;
        const okBtn = h('button', { class: 'go', onclick: () => {
          const a = parseFloat(inPos.value), b = parseFloat(inNeg.value);
          if (!(a >= 0) || !(b >= 0)) return status('两根管的读数都要填。');
          const ea = Math.abs(a - pending.pos), eb = Math.abs(b - pending.neg);
          if (ea > 0.55 || eb > 0.55) return status(`再看一下刻度：${ea > 0.55 ? '正极' : '负极'}那根管的读数好像不对。刻度从<b>管顶</b>往下数，每小格 0.5 mL；读气体和水的<b>分界面</b>（液面）。`);
          rows.push({ t: pending.t / 60, pos: a, neg: b }); tbl.add([(pending.t / 60).toFixed(1), a.toFixed(1), b.toFixed(1)]);
          readBox.hidden = true; inPos.value = ''; inNeg.value = ''; S.held = null; far();
          const big = rows.some((r) => r.neg >= 8);
          if (rows.length >= 2 && big) {
            done('read');
            if (qBox.hidden && !bar.has('ratio')) { ctx1.innerHTML = rows.map((r) => `<div>${r.t.toFixed(1)} 分钟：负极 <b>${r.neg.toFixed(1)}</b> mL，正极 <b>${r.pos.toFixed(1)}</b> mL</div>`).join(''); qBox.hidden = false; qg.arm(); status('看看你记下的几组数据，回答下面的问题。'); }
          } else if (!big) status('记下了。气体还比较少，读数的误差相对大；等<b>负极管里有 8 mL 以上</b>时再记一组。');
          else status('记下了一组。再等一会儿，<b>再记一组</b>。');
        } }, '记下这一组');
        const readBox = h('div', { class: 'think', hidden: true }, h('div', { class: 'think-t' }, '读一读'),
          h('p', { class: 'think-q' }, '凑近看两根管的刻度（管顶是 0，每小格 0.5 mL），读出两边气体的体积：'),
          h('div', { class: 'read-row' }, '正极', inPos, '负极', inNeg, okBtn));
        const readB = buttons([{ text: '读刻度，记录一组数据', onClick: () => {
          if (!S.salt || S.gas.neg < 0.5) return status('先通电，让两根管里都收集到一些气体，再读刻度。');
          pending = { neg: S.gas.neg, pos: S.gas.pos, t: S.t }; readBox.hidden = false;
          near(new THREE.Vector3(0, BASE_Y + TUBE_H - Math.max(S.gas.neg, 4) * ML_LEN * 0.6, 0), [0, 0.05, 1], 0.22);
          status(S.on ? '读数这段时间里液面会继续变，按你按下按钮那一刻的读数记。' : '凑近看刻度，填进下面。');
        } }]);
        readB.el.dataset.keep = '1';
        // 想一想 ①：体积比（先摆出学生自己记下的数据）
        const ctx1 = h('div', { class: 'sum-ctx' });
        const q = buttons(['约 2∶1', '约 1∶2', '约 1∶1', '约 8∶1'].map((t, j) => ({ text: t, ghost: true, onClick: () => {
          if (j) { const r = rows[rows.length - 1]; return status(`用你表里的数据算一算：负极那根管里的气体（${r.neg.toFixed(1)} mL）是正极（${r.pos.toFixed(1)} mL）的几倍？`); }
          qBox.hidden = true; done('ratio');
          const last = rows[rows.length - 1];
          status(`对：负极∶正极 ≈ <b>2∶1</b>（你最后一组是 ${last.neg.toFixed(1)}∶${last.pos.toFixed(1)}）。实际测得的值往往<b>略大于 2</b>——氧气比氢气更易溶于水。`);
        } })));
        q.el.dataset.keep = '1';
        const qBox = h('div', { class: 'think', hidden: true }, h('div', { class: 'think-t' }, '想一想'), ctx1, h('p', { class: 'think-q' }, '负极管和正极管里气体的体积比，大约是——'), q.el);
        const qg = guard(qBox, () => rows.length, () => status('记录变了，重新看看表里的数据。'));
        // 想一想 ②：水由什么组成（先摆出两次检验的结果）
        const q2 = buttons(['由氢、氧两种元素组成', '由氢气和氧气组成', '是一种元素'].map((t, j) => ({ text: t, ghost: true, onClick: () => {
          if (j === 1) return status('水是一种纯净物，里面并没有氢气和氧气；氢气、氧气是通电以后<b>新生成</b>的物质。');
          if (j === 2) return status('水通电分解成了两种不同的物质，说明它不是一种元素。');
          q2Box.hidden = true; done('what');
          const r = rows[rows.length - 1];
          q3title.innerHTML = `课本给的是标准状况下的密度（氢气约 0.09 g/L，氧气约 1.43 g/L）；两管气体在同样的温度和压强下收集，室温让两边的密度按同一比例变小，所以算出的<b>比值</b>不受影响：<br>${r.neg.toFixed(1)} mL 氢气 × 0.09 g/L，${r.pos.toFixed(1)} mL 氧气 × 1.43 g/L。`;
          q3Box.hidden = false;
          status('对。生成的氢气由氢元素组成、氧气由氧元素组成，化学反应前后元素种类不变——所以<b>水由氢、氧两种元素组成</b>。');
        } })));
        q2.el.dataset.keep = '1';
        const q2Box = h('div', { class: 'think', hidden: true }, h('div', { class: 'think-t' }, '想一想'),
          h('div', { class: 'sum-ctx', html: '<div>正极管里的气体：使燃着的木条燃烧更旺——<b>氧气</b></div><div>负极管里的气体：能燃烧，火焰淡蓝色——<b>氢气</b></div>' }),
          h('p', { class: 'think-q' }, '水通电生成了氢气和氧气。由此可知，水——'), q2.el);
        // 想一想 ③：质量比
        const q3title = h('div', { class: 'sum-ctx' });
        const q3 = buttons(['约 1∶8', '约 2∶1', '约 1∶1', '约 8∶1'].map((t, j) => ({ text: t, ghost: true, onClick: () => {
          if (j === 1) return status('2∶1 是<b>体积</b>比。氢气很轻：同样体积，氢气的质量只有氧气的约 1/16。用密度乘一下看看。');
          if (j) return status('把两边的“体积 × 密度”都算出来，再比一比。');
          const r = rows[rows.length - 1], mH = r.neg * 0.09, mO = r.pos * 1.43;
          q3Box.hidden = true; next.hidden = false; done('mass');
          status(`对：按标准状况密度估算，氢气约 ${mH.toFixed(2)} mg，氧气约 ${mO.toFixed(2)} mg（室温下实际会少几个百分点，两边一样少），质量比约 1∶${(mO / mH).toFixed(1)}，接近 <b>1∶8</b>。体积比 2∶1，质量比却是 1∶8——两种比不要混。`);
        } })));
        q3.el.dataset.keep = '1';
        const q3Box = h('div', { class: 'think', hidden: true }, h('div', { class: 'think-t' }, '想一想'), q3title, h('p', { class: 'think-q' }, '体积比约 2∶1。那么氢气∶氧气的<b>质量比</b>约为——'), q3.el);
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        A.maybeWhat = () => { if (S.tested.neg && S.tested.pos && q2Box.hidden && !bar.has('what')) { q2Box.hidden = false; far(); status('两种气体都检验了。回答下面的问题。'); } };
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'),
          buttons([
            { text: '加硫酸钠溶液', ghost: true, onClick: () => A.salt() },
            { text: '接通 / 切断电源', ghost: true, onClick: () => A.power() },
            { text: '检验正极的气体', ghost: true, onClick: () => A.test('pos') },
            { text: '检验负极的气体', ghost: true, onClick: () => A.test('neg') },
          ]).el,
          buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：时间加快 10 倍；电流按 0.30 A 计，气体按室温下的体积计。氧气、氢气在水里溶解的量取室温下的溶解度估算。' });
        ui.controls.append(readB.el, readBox, qBox, q2Box, q3Box, next, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, rows, readBox, qBox, q2Box, q3Box, next, qg, readB, inPos, inNeg, okBtn, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('电解器里已经加满了水。可以先看<b>老师演示</b>，也可以直接动手：先向漏斗里加少量<b>硫酸钠溶液</b>。');
      },
      update(dt, t) {
        const k = bar.update(dt);
        step(Math.min(dt, 1 / 30) * k);
        mw.update(Math.min(dt, 1 / 30) * Math.min(k, 1.5));
        stick.update(t); blue.update(t);
        W?.qg.check();
        if (!S.demo && S.on && S.salt && S.gas.neg > 1 && !S.seen.has('run')) { S.seen.add('run'); status('两个电极上都有<b>气泡</b>冒出，气体聚在玻璃管顶端，管里的液面在下降。比一比：<b>哪边的气体多？</b>'); }
      },
      dispose() { mw.dispose(); bar.dispose(); bubs.dispose(); saltDrops.dispose?.(); },
      debug: { get S() { return S; }, A, bar, tubes, lid: dcap, picks: { power: swPick, salt: dPick, stick: stickPick, cockPos: tubes.pos.cockPick, cockNeg: tubes.neg.cockPick },
        qa: (() => {
          const read = () => { W.readB.el.querySelector('button').click(); W.inPos.value = (Math.round(S.gas.pos * 2) / 2).toFixed(1); W.inNeg.value = (Math.round(S.gas.neg * 2) / 2).toFixed(1); W.okBtn.click(); };
          return qaFlow(drag, [
            { name: '加硫酸钠溶液', drag: dPick, to: () => new THREE.Vector3(-0.02, 0.35, 0), wait: 4.5 },
            { name: '接通电源', tap: swPick },
            { name: '通电一会儿', run: () => {}, wait: 6 },
            { name: '读刻度（一）', run: read },
            { name: '再通电一会儿', run: () => {}, wait: 16 },
            { name: '读刻度（二）', run: read },
            { name: '比体积', run: () => W.qBox.querySelector('button').click() },
            { name: '切断电源', tap: swPick },
            { name: '木条凑到正极尖嘴', drag: stickPick, to: () => atTip('pos'), wait: 1 },
            { name: '打开正极活塞', tap: tubes.pos.cockPick, wait: 4 },
            { name: '木条凑到负极尖嘴', drag: stickPick, to: () => atTip('neg'), wait: 1 },
            { name: '打开负极活塞', tap: tubes.neg.cockPick, wait: 4 },
            { name: '水由什么组成', run: () => W.q2Box.querySelector('button').click() },
            { name: '比质量', run: () => W.q3Box.querySelector('button').click() },
          ]);
        })() },
    };
  },
};
