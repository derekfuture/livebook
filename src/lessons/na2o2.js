// 人教版高中化学必修第一册第 37 页【实验2-3】（图2-5 过氧化钠与水反应）：将 1~2 mL 水滴入盛有 1~2 g 过氧化钠固体的试管中，
//   立即把带火星的木条伸入试管中，检验生成的气体。用手轻轻触摸试管外壁，有什么感觉？用 pH 试纸检验溶液的酸碱性。
// 课本：过氧化钠与水反应生成氢氧化钠和氧气：2Na₂O₂ + 2H₂O ══ 4NaOH + O₂↑
// 模型（示意，界面上写明）：
//   Na₂O₂ 1.5 g（19.2 mmol，淡黄色固体）；水一滴 0.05 mL（2.8 mmol）。有水就反应，速度和剩下的 Na₂O₂ 成正比（几秒内大部分反应完），水不够时按水算。
//   生成的 O₂ 按 2Na₂O₂ ~ O₂、24.5 mL/mmol 算，从试管口冒出去：试管上部的 O₂ 越来越多（把空气赶出去）；不冒了以后约十几秒散掉。O₂ 占一半以上，带火星的木条复燃。
//   放热：按标准生成焓（298 K；Na₂O₂(s) −510.9、H₂O(l) −285.8、NaOH(aq) −470.1 kJ/mol，NBS / CRC 数据表）算，每摩尔 Na₂O₂ 约 144 kJ。
//   教学有效热容 = 试管玻璃约 16 J/K（约 19 g × 0.84 J/(g·K)）+ 液体（4.18 J/(g·K)）+ 剩余固体（约 1 J/(g·K)），随加水、反应变化；向空气散热 0.25 W/K（示意）。
//   很快发烫（不写温度数字，最高按接近 100 ℃ 算）。
//   溶液是很浓的 NaOH：pH 试纸显强碱性（变成比色卡碱性那一端的深紫色；浓溶液不按比色卡读具体数值）。O₂ 用蓝点表示（这套书里蓝 = 氧气），热用橙色表示。
//   气泡跟着产气速率从过氧化钠表面冒出来（水少、还没有液面时，在润湿的固体表面冒）。水不够时剩下的过氧化钠留在试管底，钻进去看也留着。
//   拿放：滴管走 tubeBench 的 exact（抓哪儿是哪儿，真悬在管口里面才滴，镜头不凑近）；木条、玻璃棒按住时到了管口才伸进去、蘸取、点样，松手就放回桌上。
import * as THREE from 'three';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs, mountXuean, moreBox } from './kit/chemlesson.js';
import { draggable, clamp } from './kit/interact.js';
import { tubeBench, T_Y, T_LEN, T_R, R_IN, levelY } from './kit/tubebench.js';
import { Particles } from './kit/fx.js';
import { bubble2 } from './kit/chemfx.js';
import { splint } from './kit/chem.js';
import { peroxideScene } from './kit/sodium.js';
import { micro } from './kit/microworld.js';
import { canvasTex, textPlate } from './kit/props.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const TX = -0.045, MOUTH = T_Y + T_LEN, BOT = V(0.02, 0, 0.035), TILE = V(0.095, 0, 0);
const N0 = 19.2, DROP = 0.05, H2O_PER_ML = 55.5, Q_MOL = 24.5, HEAT = 143.6;          // mmol；mL；mmol/mL；mL/mmol；J/mmol
const STICK_REST = V(0.05, 0.004, 0.08), ROD_REST = V(0.15, 0.004, 0.062);          // 木条横放在试管架前面；玻璃棒放在右边
const ST_Y = MOUTH + 0.012, ST_IN = MOUTH - 0.022, ROD_Y = MOUTH + 0.006;          // 拿着走时：木条火星端、玻璃棒下端高过试管口；木条伸进试管口里 2.2 cm
const nearMouth = (h) => !!h && Math.hypot(h[0] - TX, h[1]) < 0.014;          // 手在试管口范围内就算
const onPaper = (h) => !!h && Math.abs(h[0] - TILE.x) < 0.02 && Math.abs(h[1] - TILE.z) < 0.018;
const CHART = ['#c22b3c', '#d8343a', '#e1503c', '#ea7040', '#f08b3a', '#f2a63a', '#d8b43a', '#a9a640', '#81783d', '#463951', '#342d34', '#60305c', '#5c2b54', '#572a51'];          // 和初中 pH 试纸那课的比色卡一样
const PAPER0 = '#f0c64a';

export default {
  id: 'na2o2',
  fig: '图2-5',
  title: '过氧化钠与水反应',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '氧化钠与水反应生成氢氧化钠。过氧化钠（Na₂O₂）与水反应，会生成什么？',
    hint: '课本第 37 页【实验2-3】。先猜，再用带火星的木条、手和 pH 试纸检验。',
    options: ['氢氧化钠和氧气', '只有氢氧化钠', '氢氧化钠和氢气'],
    answer: 0,
  },
  need: '向盛有过氧化钠固体的试管中滴入 1~2 mL 水；立即伸入带火星的木条，摸摸试管外壁，用 pH 试纸检验溶液的酸碱性',
  conclusion: {
    page: 41, rect: [88, 646, 312, 697],
    quote: '过氧化钠与水反应生成氢氧化钠和氧气：2Na2O2 + 2H2O = 4NaOH + O2↑',
    formula: '2Na₂O₂ + 2H₂O ══ 4NaOH + O₂↑',
    why: '加水后剧烈冒气泡；伸进带火星的木条，木条<b>复燃</b>——生成的气体是<b>氧气</b>。试管外壁<b>发烫</b>——反应放出热量。pH 试纸显<b>强碱性</b>——生成了氢氧化钠。<br>所以 2Na₂O₂ + 2H₂O ══ 4NaOH + O₂↑。过氧化钠还能与二氧化碳反应放出氧气，可在呼吸面具或潜水艇中作为氧气的来源（课本第 37–38 页）。',
    src: '课本第 37 页 · 第二章 第一节 钠及其化合物',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (key, row) => { if (S.said[key]) return; S.said[key] = true; if (!S.demo) W?.tbl.add(row); };
    paperSheet(group, { w: 0.29, d: 0.16, x: 0.04, z: 0.035 });
    // 预测的时候：书页上那两行答案（“过氧化钠与水反应生成氢氧化钠和氧气”和方程式）先压在台板下面，翻到实验页再露出来
    const cover = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.07), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, map: canvasTex(256, 96, (g, Wc, Hc) => {
      const gx = g.createLinearGradient(0, 0, Wc, 0); gx.addColorStop(0, 'rgba(253,251,245,0)'); gx.addColorStop(0.08, 'rgba(253,251,245,0.97)'); gx.addColorStop(0.92, 'rgba(253,251,245,0.97)'); gx.addColorStop(1, 'rgba(253,251,245,0)');
      g.fillStyle = gx; g.fillRect(0, Hc * 0.1, Wc, Hc * 0.8); g.globalCompositeOperation = 'destination-in';
      const gy = g.createLinearGradient(0, 0, 0, Hc); gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(0.2, 'rgba(0,0,0,1)'); gy.addColorStop(0.8, 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gy; g.fillRect(0, 0, Wc, Hc);
    }) }));
    cover.rotation.x = -Math.PI / 2; cover.position.set(-0.035, 0.0005, 0.122); cover.renderOrder = 1; cover.raycast = () => {}; cover.userData.noFrame = true; group.add(cover);

    const B = tubeBench(group, {
      tag, look, back, rate: 5, exact: true, getS: () => S.bench,
      tubes: [{ x: TX, label: 'Na₂O₂', vol: 0, color: 0xe8eef2, hint: '试管：点一下，用手轻轻摸摸外壁' }],
      reagents: [{ key: 'water', name: '水', at: BOT, inside: 0xe6f2f8, hint: '水：拖到试管口上方，按住一滴一滴地加' }],
      onDrop: (k, key) => {          // 液滴落到试管里才算加进去
        if (key !== 'water') return;
        S.water += DROP;
        if (!S.said.first) { S.said.first = true; status('一加水就剧烈冒气泡！<b>立即</b>把带火星的木条伸进试管口。'); }
        if (S.water >= 1 - 1e-9 && !S.said.ml) { S.said.ml = true; done('water'); }
        if (S.water > 2 + 1e-9 && !S.said.much) { S.said.much = true; status('已经超过 2 mL 了：课本是 1~2 mL。'); }
      },
    });
    const tube = B.tubes[0];          // 试管只用来摸（点一下），不拿起来
    // 试管底的 Na₂O₂ 粉末、试管上部的 O₂（蓝点）、发热（橙色）
    // 过氧化钠铺在试管底：从管底填起来的一层（圆底里的一截球冠，上面一个平面），反应掉多少就矮多少
    const YC = T_R + 0.0008, R_P = R_IN * 0.97, H0 = 0.62 * R_P;
    const powderMat = paint(0xf2e2a2, { keep: true });
    const powder = new THREE.Group(); powder.position.y = YC; tube.add(powder);
    const bowl = new THREE.Mesh(new THREE.BufferGeometry(), powderMat), lid = new THREE.Mesh(new THREE.CircleGeometry(1, 24), powderMat); lid.rotation.x = -Math.PI / 2;
    bowl.renderOrder = lid.renderOrder = 9.85; powder.add(bowl, lid);
    let bedNow = -1;
    const bedH = () => H0 * Math.pow(Math.max(0, S.left / N0), 0.6);          // 这层固体有多厚（示意）
    const bedTop = () => YC - R_P + bedH();          // 固体上表面的高度（试管局部坐标）
    const setBed = (hh) => {
      const q = Math.round(hh / 0.0002) * 0.0002; if (q === bedNow) return; bedNow = q;
      const th = Math.acos(clamp((R_P - Math.max(q, 0.0002)) / R_P, -1, 1)), t0 = Math.PI - th;
      bowl.geometry.dispose(); bowl.geometry = new THREE.SphereGeometry(R_P, 18, 6, 0, Math.PI * 2, t0, th);
      lid.position.y = -(R_P - q); lid.scale.setScalar(Math.max(1e-4, R_P * Math.sin(t0)));
    };
    const ox = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: 0x2f7fe0, transparent: true, opacity: 0.85 }), 50); ox.count = 0; ox.renderOrder = 9.95; ox.frustumCulled = false; tube.add(ox);
    const OXP = Array.from({ length: 50 }, () => ({ u: Math.sqrt(Math.random()), a: Math.random() * 6.28, y: Math.random(), w: 0.3 + Math.random() * 0.5 }));
    const heat = new THREE.Mesh(new THREE.CylinderGeometry(T_R + 0.004, T_R + 0.004, 0.04, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); heat.position.y = 0.022; heat.renderOrder = 9.97; tube.add(heat);
    // 气泡：跟着产气速率从过氧化钠表面冒出来；有液面就升到液面破掉，还没有液面（水少）就在润湿的固体表面鼓起来、破掉
    const fizz = new Particles({ max: 120, geometry: new THREE.SphereGeometry(1, 8, 6), material: bubble2({ color: 0x8aa1b0, white: 0.35 }) }); fizz.mesh.renderOrder = 10; tube.add(fizz.mesh);
    let fizzAcc = 0;
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3(), p4 = new THREE.Vector3();
    const card = tag('', 'cond'); card.px = [-125, -20];          // 观察卡：试管左边

    // 带火星的木条（火星端在原点，木条朝 +y；平放时朝左）
    const stick = splint(); group.add(stick);
    const stickPick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, 0.02), new THREE.MeshBasicMaterial({ visible: false })); stickPick.position.y = 0.065; stickPick.userData.pick = true; stick.add(stickPick);
    // 玻璃棒、白瓷板上的 pH 试纸、比色卡
    const hands = { st: new THREE.Object3D(), rod: new THREE.Object3D() }; group.add(hands.st, hands.rod);          // 手：拿着时在拖动平面上，没拿着时在器材的原点
    const rod = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.09, 10), paint(0xe8f2f6, { transparent: true, opacity: 0.85 })), { width: 0.5 }); rod.geometry.translate(0, 0.045, 0); group.add(rod);
    const rodPick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 8), new THREE.MeshBasicMaterial({ visible: false })); rodPick.position.y = 0.045; rodPick.userData.pick = true; rod.add(rodPick);
    const rodDrop = new THREE.Mesh(new THREE.SphereGeometry(0.0018, 10, 8), paint(0xdfeef6, { keep: true, transparent: true, opacity: 0.8 })); rodDrop.visible = false; rod.add(rodDrop);
    const tile = inked(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.004, 0.032), paint(0xfafaf8)), { width: 0.6 }); tile.position.copy(TILE).setY(0.002); group.add(tile);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.0006, 0.024), paint(PAPER0, { keep: true, unique: true })); strip.position.copy(TILE).setY(0.0043); group.add(strip);
    const spot = new THREE.Mesh(new THREE.CircleGeometry(0.0045, 20), paint(PAPER0, { keep: true, unique: true })); spot.rotation.x = -Math.PI / 2; spot.position.copy(strip.position).add(V(0, 0.0004, 0)); spot.visible = false; group.add(spot);
    const chartTex = canvasTex(700, 120, (g, Wc, Hc) => { g.fillStyle = '#fffdf6'; g.fillRect(0, 0, Wc, Hc); CHART.forEach((c, i) => { g.fillStyle = c; g.fillRect(10 + i * 49, 10, 44, 70); g.fillStyle = '#23293a'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.fillText(String(i + 1), 32 + i * 49, 110); }); });
    const chart = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.012), new THREE.MeshBasicMaterial({ map: chartTex })); chart.position.set(TILE.x, 0.005, TILE.z + 0.03); chart.rotation.x = -1.35; group.add(chart);
    const pl = (text, w, hh, x, z) => { const t = textPlate(text, { w, h: hh, color: '#23293a', bg: '#fffaf0', font: `bold ${Math.floor(Math.min(0.8 * 512 * hh / w, 0.82 * 512 / text.length))}px "Songti SC", serif` }); t.rotation.x = -Math.PI / 2; t.position.set(x, 0.0012, z); group.add(t); };
    pl('pH 试纸', 0.022, 0.006, TILE.x, TILE.z - 0.022);

    const fresh = () => ({ demo: false, bench: B.fresh(), water: 0, left: N0, reacted: 0, rate: 0, o2: 0, f: 0, T: 22, touched: false, stick: { drag: false, hand: null, grabY: 0, home: false, inTube: 0, lit: false, t: 0, judged: false }, rod: { drag: false, hand: null, grabY: 0, in: false, go: null, wet: false }, spot: false, said: {} });
    S = fresh();
    const solVol = () => Math.max(0, S.water - S.reacted / H2O_PER_ML);          // 剩下的液体（mL，近似）
    const liqVis = () => solVol() > 0.05 && levelY(solVol()) > (S.left / N0 > 0.01 ? bedTop() : 0) + 0.0008;          // 液面高过固体才看得到液体（少量的水渗在固体里）
    const A = {
      touch() {
        if (S.T > 45) { S.touched = true; done('touch'); log('touch', ['用手轻轻摸试管外壁', '<b>发烫</b>', '反应放出热量']); status('试管外壁<b>发烫</b>：反应放出热量。'); }
        else if (S.T > 30) status('试管外壁有点热。');
        else status(S.water > 0 ? '试管外壁不热。' : '试管还是凉的：还没加水。');
      },
      // 木条、玻璃棒松手：很快放回桌上（伸在试管里的先竖直抽出来）。检验、蘸取、点样都要按着做到
      stickDrop() {
        const st = S.stick, wasIn = st.inTube > 0 && !st.judged; st.drag = false; st.hand = null; st.inTube = 0; st.home = true;
        if (wasIn) status('木条刚伸进去就松手了，放回了桌上。按住木条，伸在试管口里停一下，看它怎样。');
      },
      rodDrop() { const R = S.rod; R.drag = false; R.hand = null; R.in = false; R.go = { ev: 'home' }; },
      rodWet() { S.rod.wet = true; status('玻璃棒蘸上了溶液。按住拖到 <b>pH 试纸</b>上方，点上去。'); },
      rodTouch() {
        if (!S.rod.wet) { status('玻璃棒是干的：先伸进试管里蘸取溶液。'); return; }
        if (!S.spot) { S.spot = true; done('ph'); log('ph', ['用玻璃棒蘸取溶液，点在 pH 试纸上', '试纸变成<b>深紫色</b>（比色卡碱性那一端）', '溶液显<b>强碱性</b>：生成了 NaOH']); status('试纸变成了深紫色，对应比色卡碱性那一端——溶液显<b>强碱性</b>。'); if (!S.demo) W?.t1.open(); }
        S.rod.wet = false;
      },
      reset() { if (bar.playing) bar.stop(); S = fresh(); sync(); mic.close(); W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; W.ui.relock(); } bar.undo('water', 'splint', 'touch', 'ph', 'why'); status('试管里又是 1.5 g 过氧化钠了。'); },
    };
    const sync = () => { B.drops.clear(); fizz.clear(); fizzAcc = 0; stick.position.copy(STICK_REST); stick.rotation.z = Math.PI / 2; rod.position.copy(ROD_REST); rod.rotation.z = Math.PI / 2; hands.st.position.copy(STICK_REST); hands.rod.position.copy(ROD_REST); };
    sync();
    const drag = draggable(group, [
      ...B.items.filter((d) => d.obj !== tube.pick),
      // 拖动平面：按下去时器材所在高度的水平面；记住抓的地方（手的位置用 hands.* 表示）——按住先竖直提起来，再跟着手平移
      { obj: stickPick, plane: 'xz', get offset() { return S.stick.drag ? S.stick.grabY : stick.position.y; }, keepOffset: true, anchor: hands.st, hint: '带火星的木条：拖到试管口，伸进去',
        onStart: (p) => { const st = S.stick; st.grabY = stick.position.y; st.drag = true; st.home = false; st.inTube = 0; st.judged = false; st.hand = p ? [p.x, p.z] : [stick.position.x, stick.position.z]; },
        onDrag: (p) => { if (p) S.stick.hand = [clamp(p.x, -0.15, 0.17), clamp(p.z, -0.08, 0.14)]; }, onEnd: () => A.stickDrop() },
      { obj: rodPick, plane: 'xz', get offset() { return S.rod.drag ? S.rod.grabY : rod.position.y; }, keepOffset: true, anchor: hands.rod, hint: () => (S.rod.wet ? '玻璃棒：拖到 pH 试纸上方，点上去' : '玻璃棒：拖到试管口上方，伸进去蘸取溶液'),
        onStart: (p) => { const R = S.rod; R.grabY = rod.position.y; R.drag = true; R.go = null; R.hand = p ? [p.x, p.z] : [rod.position.x, rod.position.z]; },
        onDrag: (p) => { if (p) S.rod.hand = [clamp(p.x, -0.15, 0.17), clamp(p.z, -0.08, 0.14)]; }, onEnd: () => A.rodDrop() },
    ], { tip: tag('', 'pill'), taps: [{ obj: tube.pick, hint: '试管：点一下，用手轻轻摸摸外壁', onTap: () => A.touch() }] });
    const act = demoActs(drag, group);
    const pScene = peroxideScene();
    let resume = 0;          // 老师演示完回来：学生原来已经看过几列（接着演，不从头）
    const dry = () => S.water > 0 && S.left / N0 > 0.1 && S.water * H2O_PER_ML - S.reacted < 0.05;          // 水用完了、还剩过氧化钠
    const mic = micro({ tag, look, back, group, scene: pScene, at: () => V(TX, T_Y + 0.03, 0), btnAt: () => V(TX + 0.026, T_Y + T_LEN * 0.75, 0.01), label: '钻进去看',
      state: () => ({ water: S.water > 0, x: 1 - S.left / N0, dry: dry(), resume }), key: () => String(S.water > 0), bar: () => bar, scale: 0.0072, lookD: [0.03, 0.7, 1], dist: 0.26 });          // 从斜上方看：前后两排分得开

    const tapTube = (at) => act.tap(tube.pick, at);
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'water', title: '滴水', todo: '把<b>水</b>的滴管拖到试管口上方，按住，滴入 1~2 mL 水（约 20~40 滴）。', target: () => (S.bench.carry[0] ? null : B.droppers[0]) },
        { id: 'splint', title: '伸入带火星的木条', todo: '<b>立即</b>把<b>带火星的木条</b>拖到试管口，伸进去，检验生成的气体。', target: () => stick },
        { id: 'touch', title: '摸试管外壁', todo: '点一下<b>试管</b>：用手轻轻触摸试管外壁，有什么感觉？', target: () => tube },
        { id: 'ph', title: 'pH 试纸', todo: '用<b>玻璃棒</b>伸进试管蘸取溶液，点到 <b>pH 试纸</b>上，检验溶液的酸碱性。', target: () => rod },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { sync(); mic.close(); },
            view: { save: () => (mic.isOpen ? { made: pScene.made } : null), restore: (v) => { resume = v.made; mic.open(); resume = 0; } } }),          // 演示前开着钻进去看，演示完再打开，从看到的那一列接着演
          shots: [
            { cap: '向盛有过氧化钠固体的试管中滴入水：剧烈反应，产生大量气泡。', dur: 8, cam: [[TX + 0.02, 0.08, 0.01], [0.04, 0.25, 1], 0.26], during: B.dripSeq(drag, 0, [[0, () => S.water + B.inflight(0) * DROP >= 1.2 - 1e-9]], 0.04, 0.96) },
            { cap: '立即把带火星的木条伸入试管中：木条复燃——生成的气体是氧气。', dur: 6, cam: [[TX + 0.02, 0.1, 0.01], [0.04, 0.25, 1], 0.27], during: act.path(stickPick, [() => stick.position.clone(), () => stick.position.clone().setY(0.12), () => V(TX, 0.12, 0), [() => V(TX, ST_IN, 0), 0.1]], { t0: 0.04, t1: 0.4, release: 0.85 }) },          // 按着木条伸在试管口里，看它复燃
            { cap: '用手轻轻触摸试管外壁：发烫——反应放出热量。', dur: 4, cam: [[TX, 0.06, 0.01], [0.04, 0.25, 1], 0.24], during: tapTube(0.3) },
            { cap: '用玻璃棒蘸取溶液，点在 pH 试纸上：显强碱性——生成了氢氧化钠。', dur: 9, cam: [[0.04, 0.06, 0.01], [0.04, 0.3, 1], 0.34],
              during: act.seq(act.path(rodPick, [() => rod.position.clone(), () => rod.position.clone().setY(0.1), () => V(TX, 0.1, 0), [() => V(TX, 0.04, 0), 0.07]], { t0: 0.04, t1: 0.3, release: 0.42 }), act.path(rodPick, [() => rod.position.clone(), () => rod.position.clone().setY(0.1), () => V(TILE.x, 0.1, 0), [() => V(TILE.x, 0.04, 0), 0.05]], { t0: 0.5, t1: 0.76, release: 0.9 })) },          // 按着蘸取、按着点样，做完才松手
            { cap: '钻进去看：过氧根和水反应，生成 OH⁻ 和 O₂。演示完了，换你自己做。', dur: 13, cam: [[TX, T_Y + 0.08, 0], [0.03, 0.7, 1], 0.26], enter: () => mic.open(true), during: act.at(0.98, () => mic.close()) },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    const step = (dt, t) => {
      B.update(dt, t);
      // 反应：有水就反应；水不够时按水算
      const waterLeft = S.water * H2O_PER_ML - S.reacted;
      const r = S.left > 0.01 && waterLeft > 0 ? Math.min(0.2 * S.left, waterLeft / Math.max(dt, 1e-3)) : 0;
      const d = Math.min(S.left, r * dt); S.left -= d; S.reacted += d; S.rate = r; S.o2 += d / 2;
      const Q = (r / 2) * Q_MOL;          // O₂ 流量 mL/s
      S.f = clamp(S.f + ((Q / 16) * (1 - S.f) - S.f / 12) * dt, 0, 1);
      const C = 16 + solVol() * 4.18 + (S.left / 1000) * 77.98;
      S.T = Math.min(98, S.T + (d * HEAT - 0.25 * (S.T - 22) * dt) / C);
      if (r > 1) log('bubbles', ['滴入水', '剧烈反应，产生<b>大量气泡</b>', '生成了气体']);
      else if (r > 0.1) log('bubbles', ['滴入水', '产生<b>气泡</b>', '生成了气体']);
      if (S.left < 0.5 && S.water > 0 && !S.said.over) { S.said.over = true; if (!S.stick.lit) status('气泡少了：过氧化钠快反应完了。木条要在冒气泡时<b>立即</b>伸进去。'); }
      // 拿着：先竖直提到工作高度，再跟着手；放回：平移到原处上方再放下去（在试管里先竖直提出来）；在原处上方时跟着高度放平 / 竖起来
      const ex = (r) => 1 - Math.exp(-dt * r);
      const homeTo = (o, rest, cy) => { const p = o.position, far = Math.hypot(p.x - rest.x, p.z - rest.z) > 0.003; p.lerp(far && p.y < cy - 0.008 ? V(p.x, cy, p.z) : far ? V(rest.x, Math.max(p.y, rest.y), rest.z) : rest, ex(18)); return !far && p.distanceTo(rest) < 0.0008; };
      const lay = (o, rest) => { const p = o.position, k = Math.hypot(p.x - rest.x, p.z - rest.z) < 0.01 ? Math.PI / 2 * (1 - clamp((p.y - rest.y) / 0.03, 0, 1)) : 0; o.rotation.z += (k - o.rotation.z) * ex(25); };
      // 木条：拿着的时候竖着（火星朝下）；按着拿到试管口上方就伸进去检验；松手放回桌上
      const st = S.stick, sp = stick.position;
      if (st.drag) {
        const h = st.hand || [sp.x, sp.z];
        let goal;
        if (st.inTube > 0) {
          if (nearMouth(h)) goal = V(TX, ST_IN, 0);
          else if (sp.y < ST_Y - 0.004) goal = V(sp.x, ST_Y + 0.002, sp.z);          // 手移开：先竖直抽出来
          else { st.inTube = 0; st.judged = false; goal = V(h[0], ST_Y, h[1]); }
        } else if (sp.y < ST_Y - 0.008) goal = V(sp.x, ST_Y, sp.z);          // 从桌上拿起来：先竖直提起来
        else if (nearMouth(h)) { goal = V(TX, ST_Y, 0); if (Math.hypot(sp.x - TX, sp.z) < 0.003) { st.inTube = 0.001; st.t = 0; st.judged = false; } }
        else goal = V(h[0], ST_Y, h[1]);
        sp.lerp(goal, ex(26));
      } else if (homeTo(stick, STICK_REST, ST_Y)) { st.home = false; st.lit = false; }
      lay(stick, STICK_REST);
      if (st.inTube > 0 && sp.y < MOUTH - 0.008) {
        st.t += dt;
        if (st.t > 0.5 && !st.judged) {
          st.judged = true;
          if (S.f >= 0.5) { st.lit = true; done('splint'); log('splint', ['立即把带火星的木条伸入试管', '木条<b>复燃</b>', '生成的气体是<b>氧气</b>']); status('木条<b>复燃</b>了：生成的气体是氧气。'); }
          else status(S.water > 0 ? '木条没有复燃：试管里的氧气已经散出去了。重来一次，加水后<b>立即</b>伸进去。' : '试管里还是空气：木条只是带着火星。先滴水。');
        }
      }
      stick.setState(st.inTube > 0 && st.lit ? 'flame' : st.drag || st.inTube > 0 ? 'ember' : 'none', st.lit ? 1 : 0.5); stick.update(t);
      if (st.drag && st.hand) hands.st.position.set(st.hand[0], st.grabY, st.hand[1]); else hands.st.position.copy(sp);
      // 玻璃棒：拿着时竖着；按着拿到试管口上方就伸进溶液里（棒尖碰到液面才蘸上），手移开先竖直提出来；蘸了溶液按着拿到 pH 试纸上方就点下去（棒尖碰到试纸才算）；松手放回桌上
      const R = S.rod, rp = rod.position;
      const dipY = () => (liqVis() ? T_Y + Math.max(levelY(solVol()) - 0.006, bedTop() + 0.001) : T_Y + bedTop() + 0.001);          // 棒尖伸到液面下（碰不到固体）；没有液体就停在固体表面
      if (R.drag) {
        const h = R.hand || [rp.x, rp.z];
        let goal;
        if (R.in) {
          if (nearMouth(h)) goal = V(TX, dipY(), 0);
          else if (rp.y < ROD_Y - 0.004) goal = V(rp.x, ROD_Y + 0.002, rp.z);          // 手移开：先竖直提出来
          else { R.in = false; goal = V(h[0], ROD_Y, h[1]); }
        } else if (R.wet && onPaper(h)) {
          const x = clamp(h[0], TILE.x - 0.003, TILE.x + 0.003), z = clamp(h[1], TILE.z - 0.008, TILE.z + 0.008);
          goal = Math.hypot(rp.x - x, rp.z - z) < 0.003 ? V(x, 0.0047, z) : V(x, Math.max(rp.y, ROD_Y - 0.004), z);
          if (rp.y < 0.0062) A.rodTouch();
        } else if (rp.y < ROD_Y - 0.008) goal = V(rp.x, ROD_Y, rp.z);          // 从桌上拿起来 / 点完试纸：先竖直提起来
        else if (nearMouth(h)) { goal = V(TX, ROD_Y, 0); if (Math.hypot(rp.x - TX, rp.z) < 0.003) { R.in = true; R.told = false; } }
        else goal = V(h[0], ROD_Y, h[1]);
        rp.lerp(goal, ex(26));
        if (R.in && rp.y < dipY() + 0.003 && !R.told) { R.told = true; if (liqVis()) { if (!R.wet) A.rodWet(); } else status(S.water > 0 ? '试管里的液体太少，蘸不到。再滴些水。' : '试管里还没有溶液。'); }
      } else if (R.go && homeTo(rod, ROD_REST, ROD_Y)) R.go = null;
      lay(rod, ROD_REST);
      if (R.drag && R.hand) hands.rod.position.set(R.hand[0], R.grabY, R.hand[1]); else hands.rod.position.copy(rp);
      rodDrop.visible = S.rod.wet; spot.visible = S.spot; if (S.spot) spot.material.color.set(CHART[13]);
      // 试管里：液体、气泡、粉末、蓝点、发热
      const vol = solVol(), k = S.left / N0;
      B.setTube(0, { vol: liqVis() ? vol : 0, color: 0xe8eef2, milk: Math.min(0.5, r * 0.05), milkColor: 0xffffff, speckColor: 0xffffff, gas: 0 });
      powder.visible = k > 0.01; if (powder.visible) setBed(bedH());
      // 气泡从过氧化钠表面冒出来：个数跟着产气速率（r mmol/s 的 Na₂O₂ → r/2 mmol/s 的 O₂）
      {
        const bt = bedTop(), lv = liqVis(), wetTop = lv ? levelY(vol) : bt + 0.003;          // 有液面：升到液面破掉；没有液面（水都渗在固体里）：在润湿的固体表面鼓起来破掉
        if (k > 0.01 && r > 0.05) {
          fizzAcc += dt * Math.min(70, 18 * r);
          while (fizzAcc > 1) {
            fizzAcc -= 1; const a = Math.random() * 6.28, rr = Math.sqrt(Math.random()) * R_IN * 0.8, big = liqVis() ? 0.0005 + Math.random() * 0.0006 : 0.0006 + Math.random() * 0.0007;
            fizz.spawn({ p: V(Math.cos(a) * rr * Math.max(0.3, lid.scale.x / R_IN), bt + 0.0004, Math.sin(a) * rr * Math.max(0.3, lid.scale.x / R_IN)), v: V(0, lv ? 0.025 + Math.random() * 0.02 : 0.004 + Math.random() * 0.004, 0), size: big, life: 2, top: wetTop });
          }
        }
        fizz.update(dt, (p, d) => { p.p.addScaledVector(p.v, d); return p.p.y < p.top; });
      }
      const lo = levelY(vol) + 0.003, hi = T_LEN - 0.004, n = Math.round(50 * S.f);
      for (let i = 0; i < n; i++) { const o = OXP[i], yy = lo + (hi - lo) * ((o.y + t * o.w * (r > 0.1 ? 0.25 : 0.04)) % 1), rr = R_IN * 0.8 * o.u; p4.set(Math.cos(o.a + t * 0.3) * rr, yy, Math.sin(o.a + t * 0.3) * rr); s4.setScalar(0.00045); m4.compose(p4, q4, s4); ox.setMatrixAt(i, m4); }
      ox.count = n; ox.instanceMatrix.needsUpdate = true;
      heat.material.opacity = clamp((S.T - 26) / 70, 0, 0.1);
      {
        // 照初中的卡片：名字 + 气泡，一行数字和外壁的感觉，图例
        const stamp = !S.water ? '' : r > 1 ? '<span class="cc-res burn">大量气泡</span>' : r > 0.1 ? '<span class="cc-res burn">冒气泡</span>' : S.left < 0.5 ? '<span class="cc-res">反应完</span>' : '<span class="cc-res">不冒泡</span>';
        const wall = !S.water ? '' : S.T > 45 ? '外壁发烫' : S.T > 30 ? '外壁有点热' : '外壁不热';
        card.text(`<div class="cc"><div class="cc-t"><span class="cc-name">试管里</span>${stamp}</div><div class="cc-more"><div class="cc-obs"><small>剩</small><b>${(S.left * 77.98 / 1000).toFixed(2)}</b><small>g Na₂O₂（约）</small>${wall ? `<small>${wall}</small>` : ''}</div><div class="cc-note">蓝点 = O₂，橙色 = 热（示意）</div></div></div>`)
          .loc(group, TX, T_Y + 0.05, 0).show(!bar.playing && !mic.isOpen);
      }          // 热：管外一圈淡橙色（不盖住液体本来的颜色）
      mic.update?.(dt);
    };

    // 质检：按住一件器材拿到 to（手的位置，只看 x、z），until() 成立再松手（木条、玻璃棒要按着做到才算）
    const qaHold = (obj, to, until) => {
      const d = drag.items().find((x) => x.obj === obj), S0 = S, T0 = performance.now(), a = d.anchor.position.clone();
      d.onStart(a.clone()); d.onDrag(to.clone(), a.clone());
      const go = () => { if (S !== S0) return; if (until() || performance.now() - T0 > 6000) { d.onEnd(true); return; } d.onDrag(to.clone(), a.clone()); requestAnimationFrame(go); }; requestAnimationFrame(go);
    };
    return {
      group: root, pointer, card: false, toggles: ['cards', 'steps'],
      size: { w: 0.27, d: 0.13, h: 0.13 },
      view: { elev: 22, azim: -6, lookY: 0.45, frameMargin: 1.06 },
      mount(ui) {
        const t2 = think({ q: '综合三个现象，过氧化钠与水反应生成了什么？', options: ['氢氧化钠和氧气，并放出热量', '只有氢氧化钠', '氢氧化钠和氢气'], wrong: ['木条复燃说明还有一种气体。', '能使带火星的木条复燃的是氧气，不是氢气。'], ok: '对：2Na₂O₂ + 2H₂O ══ 4NaOH + O₂↑（课本第 37 页）。', status: (m) => W?.status(m), onOk: () => { done('why'); if (W) W.next.hidden = false; } });
        const t1 = think({ q: '带火星的木条复燃，说明生成的气体是什么？', options: ['氧气', '氢气', '二氧化碳'], wrong: ['氢气遇火会燃烧、爆鸣，不是让火星复燃。', '二氧化碳会让木条熄灭。'], ok: '对：氧气能使带火星的木条复燃。', status: (m) => W?.status(m), onOk: () => t2.open() });
        const more = moreBox([['钻进去看', () => mic.open()]], () => A.reset());
        const note = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'), h('p', { class: 'fineprint', html: '过氧化钠按 1.5 g（19.2 mmol）计；水一滴约 0.05 mL。有水就反应，几秒内大部分反应完（示意）；水不够时按水算。<br>O₂ 按 2Na₂O₂ ~ O₂ 算，从试管口冒出去；试管上部 O₂ 占一半以上时带火星的木条复燃，不冒了以后十几秒散掉（示意）。蓝点表示 O₂（这套书里蓝 = 氧气）。<br>放热按标准生成焓算（298 K；Na₂O₂(s) −510.9、H₂O(l) −285.8、NaOH(aq) −470.1 kJ/mol，NBS / CRC 数据表）：每摩尔 Na₂O₂ 约 144 kJ。热容是教学有效值：试管玻璃约 16 J/K 加上液体（4.18 J/(g·K)）和剩余固体，随加水、反应变化；向空气散热按 0.25 W/K（示意）。很快发烫（橙色表示热，不写温度数字）。溶液是很浓的 NaOH，pH 试纸显强碱性。' }));
        const base = mountXuean(ui, { controls: [more, note], headers: ['做了什么', '现象', '说明'], intro: '试管里是 1.5 g 淡黄色的过氧化钠固体。先用滴管滴水，再立即伸进带火星的木条。' });
        ui.data.append(t1.el, t2.el, base.next);
        W = { ...base, ui, t1, t2, status: ui.status }; bar.attach(ui);
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); cover.visible = W?.ui.step === 0; },
      dispose() { bar.dispose(); drag.dispose(); mic.dispose?.(); B.dispose(); },
      debug: {
        get S() { return S; }, bar, A,
        picks: { dropper: B.droppers[0].pick, tube: tube.pick, stick: stickPick, rod: rodPick },
        qa: qaFlow(drag, [
          { name: '滴水', run: () => B.qaDrip(drag, 0, 0, () => S.water + B.inflight(0) * DROP >= 1.2 - 1e-9), wait: 2, scale: 1 },
          { name: '伸入木条', run: () => qaHold(stickPick, V(TX, 0, 0), () => S.stick.judged), wait: 2.5, scale: 1 },
          { name: '摸试管', tap: tube.pick, wait: 1 },
          { name: '蘸取溶液', run: () => qaHold(rodPick, V(TX, 0, 0), () => S.rod.wet), wait: 2, scale: 1 },
          { name: '点到试纸', run: () => qaHold(rodPick, V(TILE.x, 0, TILE.z), () => S.spot), wait: 2.5, scale: 1 },
          { name: '钻进去看', run: () => mic.open(), wait: 4 },
          { name: '合上', run: () => mic.close(), wait: 1 },
          { name: '核对', run: () => { if (!(S.said.splint && S.touched && S.spot && S.reacted > 15)) throw new Error(JSON.stringify({ said: S.said, touched: S.touched, spot: S.spot, left: S.left, f: S.f, T: S.T })); }, wait: 1 },
          { name: '想一想 1', run: () => W.t1.el.querySelector('button').click() },
          { name: '想一想 2', run: () => W.t2.el.querySelector('button').click() },
        ]),
      },
    };
  },
};
