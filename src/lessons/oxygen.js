// 课题2 氧气（课本第 38–41 页）：实验 2-1 带火星的木条、2-2 木炭、2-3 硫（教师演示）、2-4 细铁丝——分别在空气和氧气中燃烧，比较现象。
//
// 一排四瓶氧气（第四瓶瓶底预先放了水），中间一盏点着的酒精灯。每样东西先在灯焰上“在空气中”烧，再伸进氧气瓶。
// 看不见的东西：氧气画成蓝点——灯焰周围的空气里每 5 个点里约 1 个蓝点，氧气瓶里几乎全是蓝点；燃烧时瓶里的蓝点被一颗颗用掉
// （木炭、硫、木条：氧气变成别的气体，蓝点变灰；铁丝：生成固体，蓝点消失）。
// 模型：瓶里的氧气体积分数 x（排水法收集的“一瓶氧气”取约 90%）；燃烧剧烈程度跟着 x 走。
//   带火星的木条：x ≥ 45% 复燃（近似，同制取氧气那一课）。细铁丝：x ≥ 57% 才能燃烧（近似）；
//   火柴还旺的时候就插进去，火柴自己先用掉瓶里的氧气（课本：“待火柴快燃尽时，插入”）。
//   木炭烧过以后瓶里有二氧化碳：倒进澄清石灰水，振荡，石灰水变浑浊（实验活动 1，第 53 页）。
import * as THREE from 'three';
import { buttons, seg, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { canvasTex, glowTexture } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { gasJar, splint, ironWire, crucibleTongs, chemLamp, glassMat, CHEM } from './kit/chem.js';
import { flame2, Sparks, smoke2, milky, water2 } from './kit/chemfx.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, demoActs } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked, hull, glassEdge } from '../live/ink.js';
import { h } from '../ui/Panel.js';

/**
 * 细口瓶（课本第 17 页：液体试剂盛放在细口瓶里），装澄清石灰水，瓶口塞着玻璃塞。瓶底是原点。
 * .stopper：瓶塞（瓶子的子物体，原点在塞子正中：倒放在桌上时翻过来还是一样高）；.mouthY：瓶口的高度。——建议进 kit
 */
function narrowBottle({ r = 0.012, color = 0xe7eef0 } = {}) {
  const g = new THREE.Group();
  const NECK = 0.0042, TOP = 0.0455;
  const pts = [[0.0003, 0], [r - 0.001, 0], [r, 0.002], [r, 0.028], [r * 0.45, 0.036], [NECK, 0.038], [NECK, TOP - 0.001], [NECK + 0.0007, TOP - 0.0003], [NECK + 0.0007, TOP], [NECK - 0.0004, TOP]].map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), glassMat({ opacity: 0.3 })); body.renderOrder = 9; glassEdge(body, 0.0006);
  const liq = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.0012, r - 0.0012, 0.022, 24), water2({ color, base: 0.34 })); liq.position.y = 0.0122; liq.renderOrder = 7;
  const stopper = new THREE.Group();
  const plugM = new THREE.Mesh(new THREE.CylinderGeometry(NECK - 0.0003, NECK - 0.0008, 0.006, 16), paint(0xeef1f3)); plugM.position.y = -0.0015;      // 塞进瓶颈的那一段（磨砂）
  const headM = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.003, 18), paint(0xeef1f3)), { width: 0.5 }); headM.position.y = 0.003;      // 塞头
  stopper.add(plugM, headM); stopper.position.y = TOP - 0.0015;
  g.add(body, liq, stopper);
  Object.assign(g, { stopper, mouthY: TOP, half: 0.0045 });
  return g;
}

const X_JAR = 0.9;                    // 一瓶氧气（排水法）里氧气的体积分数
const RELIGHT = 0.45, IRON = 0.57;
const JR = 0.024, JH = 0.09;          // 集气瓶
const JARS = [-0.21, -0.11, 0.11, 0.21].map((x) => new THREE.Vector3(x, 0, 0));
const LAMP = new THREE.Vector3(0, 0, 0), FLAME_Y = 0.1;
const NAMES = ['带火星的木条', '木炭', '硫', '细铁丝'];
const SLOW_IN = 0.015;               // 木炭由瓶口向下缓慢插入（实验活动 1，第 53 页）：在瓶口以下每秒约往下 1.5 cm
const BLUE = 0x2f7fd8, GRAY = 0x9aa1ad;

export default {
  id: 'oxygen',
  fig: '图2-11',
  title: '氧气的性质',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '细铁丝在酒精灯火焰上烧——在<b>空气</b>里，和在一瓶<b>氧气</b>里，会怎样？',
    hint: '课本第 38–40 页 实验 2-1 到 2-4',
    options: ['在空气中只是红热、不燃烧；在氧气中剧烈燃烧，火星四射', '在空气和氧气中都剧烈燃烧', '在空气和氧气中都不能燃烧'],
    answer: 0,
  },
  need: '带火星的木条、木炭、硫、细铁丝，分别比较在空气中和在氧气中燃烧的现象，再想一想',
  conclusion: {
    crops: [{ page: 47, rect: [64, 380, 480, 462] }],
    quote: '氧气的化学性质比较活泼，能支持燃烧，在一定条件下能与碳、硫、铁等发生反应。由两种或两种以上物质生成另一种物质的反应，叫作化合反应。物质与氧气发生的反应属于氧化反应。',
    formula: '碳 + 氧气 <span style="font-size:.8em">点燃</span>→ 二氧化碳　　硫 + 氧气 <span style="font-size:.8em">点燃</span>→ 二氧化硫　　铁 + 氧气 <span style="font-size:.8em">点燃</span>→ 四氧化三铁',
    why: '同一种物质，在氧气中燃烧比在空气中剧烈得多：木炭在空气中只是红热，在氧气中发出白光；硫在空气中是微弱的淡蓝色火焰，在氧气中是明亮的蓝紫色火焰；细铁丝在空气中只红热，在氧气中却剧烈燃烧、火星四射。物质在空气中燃烧，实际上是和其中的<b>氧气</b>反应；空气里的氧气只占约 1/5，所以在空气中燃烧不如在氧气中剧烈。<br>这三个反应都是两种物质生成另一种物质（<b>化合反应</b>），也都是物质与氧气发生的反应（<b>氧化反应</b>）。',
    src: '课本第 38–41 页 · 第二单元 课题2 氧气；石灰水检验：实验活动1（第 53 页）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null;
    const near = (v, d, dist) => { if (S.demo) return; S.near = true; look([v.x, v.y, v.z], d || [0.05, 0.28, 1], dist || 0.3, () => { S.near = false; }); };
    const far = () => { if (S.near) { S.near = false; back(); } };

    // 器材脚下一层淡淡的白，把这块书页上的字压下去
    const sheetTex = canvasTex(512, 256, (g, W, H) => {
      const gr = g.createRadialGradient(W / 2, H / 2, H * 0.12, W / 2, H / 2, W * 0.5);
      gr.addColorStop(0, 'rgba(253,251,245,0.9)'); gr.addColorStop(0.62, 'rgba(253,251,245,0.82)'); gr.addColorStop(1, 'rgba(253,251,245,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    });
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.3), new THREE.MeshLambertMaterial({ map: sheetTex, transparent: true, depthWrite: false }));
    sheet.rotation.x = -Math.PI / 2; sheet.position.set(0, 0.0004, 0.04); sheet.receiveShadow = true; sheet.renderOrder = 1; sheet.raycast = () => {}; sheet.userData.noFrame = true;
    group.add(sheet);

    // ================= 四瓶氧气（第四瓶瓶底有水）、酒精灯 =================
    const jars = JARS.map((p, k) => { const j = gasJar({ r: JR, h: JH }); j.position.copy(p); group.add(j); return j; });
    const jarMilk = jars.map((j) => milky(j.water, { n: 30 })), milkK = jars.map(() => 0);        // 倒进石灰水、振荡：变浑浊（只管画面，慢慢变）
    const lamp = chemLamp(); lamp.position.copy(LAMP); group.add(lamp);
    // 瓶身上的小标签：氧气
    jars.forEach((j) => { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.016, 0.0074), new THREE.MeshBasicMaterial({ map: canvasTex(256, 118, (g, W, H) => { g.fillStyle = '#fffaf0'; g.fillRect(0, 0, W, H); g.strokeStyle = '#c9bda6'; g.lineWidth = 4; g.strokeRect(2, 2, W - 4, H - 4); g.fillStyle = '#2f7fd8'; g.font = 'bold 70px "Songti SC", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('氧气', W / 2, H / 2 + 4); }) })); l.position.set(0, JH * 0.42, JR + 0.0016); l.renderOrder = 10; j.add(l); });

    // ================= 四样东西（不用的时候放在桌上靠前的地方） =================
    const HOME = [new THREE.Vector3(-0.21, 0.006, 0.1), new THREE.Vector3(-0.12, 0.008, 0.1), new THREE.Vector3(0.06, 0.008, 0.1), new THREE.Vector3(0.15, 0.006, 0.09), new THREE.Vector3(0.21, 0.006, 0.11)];
    // ① 带火星的木条
    const stick = splint({ len: 0.11 });
    const stickPick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.02), new THREE.MeshBasicMaterial({ visible: false })); stickPick.position.y = 0.055; stickPick.userData.pick = true; stick.add(stickPick);
    // ② 坩埚钳夹着的木炭（钳口在原点，钳柄朝 +x）
    const coal = new THREE.Group();
    const coalPiece = inked(new THREE.Mesh(new THREE.DodecahedronGeometry(0.0068, 0), paint(0x2a2a30, { unique: true, keep: true })), { width: 0.7 }); coalPiece.scale.set(1, 0.8, 0.86);
    const coalGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff5a1f, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); coalGlow.scale.set(0.03, 0.03, 1);
    const coalPick = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), new THREE.MeshBasicMaterial({ visible: false })); coalPick.position.x = 0.035; coalPick.userData.pick = true;
    coal.add(coalPiece, crucibleTongs(), coalGlow, coalPick);
    // ③ 燃烧匙里的硫（原点在小勺）
    const sul = new THREE.Group();
    const sRod = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.0013, 0.0013, 0.12, 8), paint(0x8a929e)), 0.0005); sRod.position.y = 0.06;
    const sCup = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), paint(0x8a929e, { side: THREE.DoubleSide })); sCup.scale.y = 0.7;
    const sHeap = new THREE.Mesh(new THREE.SphereGeometry(0.0058, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xe8cf3a, { unique: true, keep: true })); sHeap.position.y = -0.0012; sHeap.scale.set(1, 0.55, 1);
    const sFlame = flame2({ w: 0.014, h: 0.03, core: 0xc9d8ff, mid: 0x6f8cff, edge: 0x5a52e0, blue: 0.9, blueColor: 0x4a5bff, alpha: 0.55, glowK: 0.25 }); sFlame.position.y = 0.002; sFlame.setOn(false);
    const sPick = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.13, 0.025), new THREE.MeshBasicMaterial({ visible: false })); sPick.position.y = 0.055; sPick.userData.pick = true;
    sul.add(sRod, sCup, sHeap, sFlame, sPick);
    // ④ 两根细铁丝（课本：“把两根光亮的细铁丝分别盘成螺旋状”）：一根在空气中烧；另一根下端系着火柴，伸进氧气
    const mkWire = (withMatch) => { const w = ironWire(); w.match.visible = w.head.visible = withMatch; const pk = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.02), new THREE.MeshBasicMaterial({ visible: false })); pk.position.y = 0.04; pk.userData.pick = true; w.add(pk); w.pick = pk; return w; };
    const wireA = mkWire(false), wire = mkWire(true);
    const TOOLS = [stick, coal, sul, wireA, wire];
    group.add(...TOOLS);
    // 澄清石灰水（细口瓶）
    const lime = narrowBottle({ r: 0.012, color: 0xe7eef0 }); const LIME_HOME = new THREE.Vector3(-0.05, 0, 0.11); lime.position.copy(LIME_HOME); group.add(lime);
    const limePick = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.05, 10), new THREE.MeshBasicMaterial({ visible: false })); limePick.position.y = 0.022; limePick.userData.pick = true; lime.add(limePick);
    // 倒石灰水：瓶塞先拔出来倒放在桌上；瓶口对着第 2 瓶的瓶口斜着倒（瓶底是原点）；一股细流
    const limeCap = lime.stopper, CAP_ON = limeCap.position.clone(), CAP_REST = new THREE.Vector3(-0.022, lime.half, 0.118);
    const LIME_TILT = 1.9, LIME_POUR = new THREE.Vector3(JARS[1].x - 0.001, JH + 0.0194, 0).add(new THREE.Vector3(Math.sin(LIME_TILT) * lime.mouthY, -Math.cos(LIME_TILT) * lime.mouthY, 0));      // 瓶口在第 2 瓶瓶口正上方约 2 cm
    const limeStream = new THREE.Mesh(new THREE.CylinderGeometry(0.0011, 0.0011, 1, 8), water2({ color: 0xe7eef0, base: 0.5 })); limeStream.geometry.translate(0, -0.5, 0); limeStream.renderOrder = 8; limeStream.visible = false; group.add(limeStream);

    // ================= 火星、白光、烟；瓶里的气体小点 =================
    const sparks = new Sparks({ max: 360, color: 0xffe6a8, tail: 0.022 }); group.add(sparks.mesh);
    const smoke = smoke2({ max: 60, color: 0xdfe2e6, opacity: 0.35 }); group.add(smoke.mesh);
    const dotTex = canvasTex(64, 64, (g, W) => { const gr = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,1)'); gr.addColorStop(0.75, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, W); });
    const blueP = new Particles({ max: 240, sprite: true, color: BLUE }), grayP = new Particles({ max: 240, sprite: true, color: GRAY });
    for (const p of [blueP, grayP]) { p.mat.uniforms.map.value = dotTex; p.mesh.renderOrder = 10; group.add(p.mesh); }
    const PER_JAR = 34;          // 每瓶画 34 个点
    const dot = (k, i) => ({ k, i, u: Math.sqrt(Math.random()) * 0.85, th: Math.random() * Math.PI * 2, v: Math.random(), ph: Math.random() * 6, p: new THREE.Vector3(), size: 0.0036, alpha: 0.92, age: 0, life: 1e9 });
    const airDots = Array.from({ length: 20 }, (_, i) => ({ ...dot(-1, i), blue: i % 5 === 0 }));     // 灯焰周围的空气：每 5 个里 1 个氧气

    // ================= 卡片：每瓶一张（瓶里氧气约占多少；空气中 / 氧气中的现象） =================
    const cards = JARS.map((p, k) => { const t = tag('', 'cond'); t.px = [0, -78]; return t; });

    // ================= 状态 =================
    const fresh = () => ({
      jars: JARS.map((_, k) => ({ x: X_JAR, used: 0, open: false, water: k === 3 ? 0.14 : 0, co2: false, lime: 0, cracked: false })),
      hold: -1, hot: [0, 0, 0, 0, 0], burn: [0, 0, 0, 0, 0], inJar: [-1, -1, -1, -1, -1], match: 0, matchLit: false, sulMelt: 0, coalUsed: false,
      res: NAMES.map(() => ({ air: '', o2: '' })), demo: false, near: false, test: null, noWater: false, asked: false, limeT: -1,
    });
    S = fresh();
    let W = null;
    const status = (m) => { if (!S.demo) W?.status(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const rows = new Set();
    const row = (key, what, res) => { if (S.demo || rows.has(key)) return; rows.add(key); W?.tbl.add([what, res]); };
    // 每件工具要去的地方（位置 goal、转角 rotG）：每帧滑过去，不跳。ret：正在放回桌上
    const homeRot = (k) => new THREE.Euler(0, k === 1 ? -0.35 : 0, k === 1 ? 0 : Math.PI / 2);
    const goal = HOME.map((p) => p.clone()), rotG = TOOLS.map((_, k) => homeRot(k)), ret = TOOLS.map(() => false);
    let limeGo = null;
    const homeAll = () => {
      TOOLS.forEach((t, k) => { t.position.copy(HOME[k]); t.rotation.copy(homeRot(k)); goal[k].copy(HOME[k]); rotG[k].copy(homeRot(k)); ret[k] = false; });
      stick.setState('none');
      lime.position.copy(LIME_HOME); lime.rotation.set(0, 0, 0); limeGo = null; lime.add(limeCap); limeCap.position.copy(CAP_ON); limeCap.rotation.set(0, 0, 0); limeStream.visible = false;
      sparks.clear(); smoke.clear();
    };
    homeAll();

    // 工具的“工作端”（木条的火星、木炭、硫、铁丝下端）在 group 里的位置
    const tipOf = (k) => {
      const t = TOOLS[k];
      const local = k === 0 ? new THREE.Vector3(0, 0.004, 0) : k === 1 ? new THREE.Vector3(0, 0, 0) : k === 2 ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3(0, 0.014, 0);
      t.updateMatrixWorld(true);
      return t.localToWorld(local).applyMatrix4(new THREE.Matrix4().copy(group.matrixWorld).invert());
    };
    const TIP = (k) => (k === 0 ? new THREE.Vector3(0, 0.004, 0) : k <= 2 ? new THREE.Vector3() : new THREE.Vector3(0, 0.014, 0));
    const tipGoal = (k) => TIP(k).applyEuler(rotG[k]).add(goal[k]);          // 工具到了 goal 以后，工作端在哪里（松手时按这个判断）
    const flameAt = (p) => Math.abs(p.x - LAMP.x) < 0.02 && Math.abs(p.y - FLAME_Y) < 0.03 && Math.abs(p.z) < 0.02;
    const jarAtP = (p) => JARS.findIndex((J) => Math.abs(p.x - J.x) < JR - 0.004 && Math.abs(p.z - J.z) < JR && p.y < JH - 0.004 && p.y > JH * 0.15);
    const inFlame = (k) => flameAt(tipOf(k));
    const jarAt = (k) => jarAtP(tipOf(k));
    // 拿起来：木条火星朝下、燃烧匙竖直、铁丝竖直（火柴在下）、木炭水平
    // 坩埚钳斜着拿（钳柄朝右上）：伸进瓶口时钳柄从瓶口出来，不会穿过瓶壁
    const holdPose = (k) => { ret[k] = false; rotG[k].set(0, 0, k === 0 ? Math.PI : k === 1 ? 1.25 : 0); if (k === 0) stick.setState('ember', 0.4); };

    const A = {
      /** k 号工具放在 p（工作端的位置）上 */
      place(k, p) {
        ret[k] = false;
        goal[k].copy(TIP(k).applyEuler(rotG[k]).negate().add(p));
      },
      /** 放回桌上（检验做完了；铁丝换一根新火柴） */
      home(k) {
        ret[k] = true; goal[k].copy(HOME[k]); rotG[k].copy(homeRot(k));          // 先从瓶里提出来，再拿回桌上（step 里滑过去）
        if (k === 0) stick.setState('none');
        if (k === 4 && !S.matchLit) { S.match = 0; wire.head.visible = true; }
      },
      release(k) {
        const tp = tipGoal(k), j = jarAtP(tp);
        if (j >= 0) return A.intoJar(k, j);
        // 木炭拿到瓶口上方松手：由瓶口向下缓慢插进去
        const jm = k === 1 ? JARS.findIndex((J) => Math.hypot(tp.x - J.x, tp.z - J.z) < JR * 0.72 && tp.y >= JH - 0.004 && tp.y < JH + 0.035) : -1;
        if (jm >= 0) return A.intoJar(k, jm);
        if (flameAt(tp)) return;                         // 留在火焰上继续烧
        ret[k] = true; goal[k].copy(HOME[k]); rotG[k].copy(homeRot(k));
        if (k === 0) stick.setState('none');
      },
      intoJar(k, j) {
        const J = S.jars[j];
        if (J.used > 0.25 && k !== 0) return status(`这瓶里的氧气已经用掉不少了，换一瓶（第 ${j + 1} 瓶）。`);
        J.open = true; S.inJar[k] = j; S.test = { k, j, t: 0 };
        const top = JARS[j].clone(); top.y = JH * 0.55;
        A.place(k, top);
        near(JARS[j].clone().add(new THREE.Vector3(0, JH * 0.5, 0)), [0.05, 0.25, 1], 0.32);
        if (k === 1 && S.hot[1] < 0.6) status('木炭还没烧红。先在酒精灯火焰上加热，再伸进氧气里。');
        if (k === 2 && S.burn[2] <= 0) status('硫还没烧起来。先在酒精灯火焰上加热，直到燃烧。');
        if (k === 3) status('这根铁丝没系火柴，伸进去也点不着——用另一根<b>系着火柴</b>的铁丝。');
        if (k === 4 && !S.matchLit && S.burn[4] <= 0) status('火柴还没点着。先在酒精灯火焰上点燃铁丝下端的火柴。');
        if (k === 4 && S.matchLit && S.match < 0.6) status('火柴还烧得很旺就插进去了……看瓶里的蓝点。');
      },
      lime() {
        const J = S.jars[1];
        if (J.lime || S.limeT >= 0) return;
        J.lime = 1; J.open = true; S.limeT = 0; sfx.clink({ freq: 1400 });          // 倒的动画放完以后 limed()
        near(JARS[1].clone().add(new THREE.Vector3(0, JH * 0.25, 0)), [0.05, 0.2, 1], 0.28);
      },
      limed() {
        const J = S.jars[1];
        S.limeT = -1; J.water = 0.14;
        if (!S.demo) setTimeout(() => { if (S.limeT < 0 && !S.test) far(); }, 2200);          // 看清楚变浑浊以后，镜头退回去
        if (J.co2) { status('向烧过木炭的集气瓶里倒入澄清石灰水，振荡：石灰水<b>变浑浊</b>了——说明生成了<b>二氧化碳</b>。'); row('lime', '烧过木炭的瓶里倒入澄清石灰水', '<b>变浑浊</b>（生成了二氧化碳）'); }
        else status('倒进了澄清石灰水，振荡：石灰水<b>没有变浑浊</b>（瓶里还没有二氧化碳）。先让木炭在这瓶氧气里燃烧。');
      },
      reset() {
        S = fresh(); homeAll(); rows.clear(); W?.tbl.clear(); far();
        if (W) { W.q1.hidden = true; W.q2.hidden = true; W.next.hidden = true; }
        bar.undo('stick', 'coalAir', 'coalO2', 'sAir', 'sO2', 'feAir', 'feO2', 'why');
        status('全部重新摆好了：四瓶新的氧气，记录也清空了。');
      },
    };

    // ================= 拖放（演示里也走这一套：器材沿路线移过去） =================
    const drag = draggable(group, [
      ...TOOLS.map((t, k) => ({ obj: [stickPick, coalPick, sPick, wireA.pick, wire.pick][k], plane: 'xy', offset: 0,
        hint: () => (S.inJar[k] >= 0 ? '' : ['拖进第 1 瓶氧气里', '拖到火焰上加热，再拖到第 2 瓶瓶口：由瓶口向下缓慢插入', '拖到火焰上加热，再拖进第 3 瓶氧气', '拖到火焰上烧：看它在空气中能不能燃烧', '拖到火焰上点燃火柴，快燃尽时拖进第 4 瓶氧气'][k]),
        onStart: () => { if (S.test?.k === k) S.test = null; S.inJar[k] = -1; S.hold = k; holdPose(k); },
        onDrag: (p) => A.place(k, new THREE.Vector3(clamp(p.x, -0.28, 0.28), clamp(p.y, 0.02, 0.2), p.z || 0)),
        onEnd: () => { S.hold = -1; A.release(k); } })),
      { obj: limePick, plane: 'xy', offset: 0, hint: '拖到第 2 瓶上：倒入澄清石灰水',
        onStart: () => { if (S.limeT >= 0) return; limeGo = lime.position.clone(); },
        onDrag: (p) => { if (S.limeT >= 0) return; limeGo = new THREE.Vector3(p.x, Math.max(0, p.y), p.z || 0); },
        onEnd: () => { if (S.limeT >= 0 || !limeGo) return; if (Math.abs(limeGo.x - JARS[1].x) < 0.04 && limeGo.y > JH - 0.01) A.lime(); limeGo = null; } },
    ], { tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    // 演示：沿折线拖过去（先抬起来、越过瓶子和灯，再放下去）。点给的是工作端（火星、木炭、硫、铁丝下端）要去的地方，
    // pts[0] 为 null 时从工作端现在的地方出发。——建议进 kit（act.path）
    const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
    const path = (obj, pts, o) => act.path(obj, pts, o);      // 沿几个点拿过去（kit/chemlesson.js 的 act.path）
    const PK = [stickPick, coalPick, sPick, wireA.pick, wire.pick];
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const FL = V3(LAMP.x, FLAME_Y, 0);
    const JT = (j) => V3(JARS[j].x, JH * 0.55, 0);
    const TOP = 0.165;                      // 拿着走的高度：工作端高过瓶口和灯
    // k 号工具：从现在的地方竖直抬起来 → 平移到 to 的正上方 → 放下去（到火焰上 / 伸进瓶里）
    const carry = (k, to, opt) => path(PK[k], [() => tipOf(k), () => tipOf(k).setY(TOP), () => to.clone().setY(TOP), () => to.clone()], opt);

    // ================= 底部步骤栏 + 老师的演示（独立的一套器材） =================
    let saved = null, savedPose = null;
    // 演示前后：学生手里 / 火焰上 / 瓶里的工具放回原处（不然演示完都回到桌上，火焰上的东西就凉了）
    const poses = () => ({ t: TOOLS.map((t, k) => [t.position.clone(), t.rotation.clone(), goal[k].clone(), rotG[k].clone(), ret[k]]), lime: [lime.position.clone(), lime.rotation.z, limeGo?.clone() || null] });
    const unpose = (P) => { P.t.forEach(([p, r, g, rg, rt], k) => { TOOLS[k].position.copy(p); TOOLS[k].rotation.copy(r); goal[k].copy(g); rotG[k].copy(rg); ret[k] = rt; }); lime.position.copy(P.lime[0]); lime.rotation.z = P.lime[1]; limeGo = P.lime[2]; };
    const bar = lessonBar({
      look, back, group,         // group：提示光圈画在这一组里
      steps: [
        { id: 'stick', title: '带火星的木条', todo: '把<b>带火星的木条</b>伸进第 1 瓶氧气里，看它能不能复燃。', target: () => (S.test ? null : stick) },
        { id: 'coalAir', title: '木炭在空气中', todo: '用坩埚钳夹着<b>木炭</b>，放到酒精灯火焰上加热，看它在空气中怎样燃烧。', target: () => (S.hold === 1 ? null : coal) },
        { id: 'coalO2', title: '木炭在氧气中', todo: '把烧红的木炭拖到第 2 瓶瓶口，<b>由瓶口向下缓慢插入</b>氧气中，比一比。（烧完以后，还可以把<b>澄清石灰水</b>倒进这瓶里看看。）', target: () => (S.hold === 1 || S.test ? null : coal) },
        { id: 'sAir', title: '硫在空气中', todo: '把燃烧匙里的<b>硫</b>放到火焰上加热，直到燃烧，看它的火焰。（课本上这个实验由老师在通风橱里演示。）', target: () => (S.hold === 2 ? null : sul) },
        { id: 'sO2', title: '硫在氧气中', todo: '把燃着的硫伸进第 3 瓶氧气里，比一比火焰。', target: () => (S.hold === 2 || S.test ? null : sul) },
        { id: 'feAir', title: '铁丝在空气中', todo: '把一根<b>细铁丝</b>（没系火柴的那根）放到火焰上烧，看它在空气中能不能燃烧。', target: () => (S.hold === 3 ? null : wireA) },
        { id: 'feO2', title: '铁丝在氧气中', todo: '在火焰上点燃铁丝下端的<b>火柴</b>，等火柴<b>快燃尽</b>时，伸进第 4 瓶氧气（瓶底有水）。', target: () => (S.hold === 4 || S.test ? null : wire) },
        { id: 'why', title: '想一想', todo: '对照你记下的现象：在空气中和在氧气中燃烧，为什么不一样？在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          onStart: () => { if (!saved) { saved = S; savedPose = poses(); } S = fresh(); S.demo = true; homeAll(); },
          onEnd: () => { if (!saved) return; S = saved; saved = null; S.near = false; homeAll(); unpose(savedPose); bar.say('演示看完了。桌上的器材和记录还是你自己的那一套——接着往下做。', bar.current || 'end'); setTimeout(() => bar.say(null), 4000); },
          shots: [
            { cap: '四瓶氧气，一盏点着的酒精灯。蓝点是氧气：瓶里几乎全是，空气里只有约 1/5。', dur: 3.6, cam: [[0, 0.06, 0], [0.08, 0.22, 1], 0.7] },
            { cap: '带火星的木条伸进氧气里——复燃了。', dur: 4.6, cam: [[JARS[0].x, 0.07, 0.03], [0.05, 0.25, 1], 0.4], during: carry(0, JT(0), { t0: 0.04, t1: 0.42, release: 0.44 }) },
            { cap: '木炭在酒精灯上加热：在空气中只是红热。', dur: 3.8, cam: [[-0.05, 0.09, 0.04], [0.05, 0.22, 1], 0.4], during: carry(1, FL, { t0: 0.03, t1: 0.4, release: 0.42 }), speed: 2 },
            { cap: '由瓶口向下缓慢插入氧气中：木炭剧烈燃烧，发出白光。', dur: 5.2, cam: [[JARS[1].x + 0.04, 0.07, 0], [0.05, 0.25, 1], 0.4], during: carry(1, V3(JARS[1].x, JH + 0.012, 0), { t0: 0.04, t1: 0.3, release: 0.32 }) },      // 拿到瓶口松手：木炭由瓶口向下慢慢插进去（和学生用的是同一套）
            { cap: '木炭烧完以后，向这瓶里倒入澄清石灰水，振荡：石灰水变浑浊——生成了二氧化碳。', dur: 7.5, cam: [[JARS[1].x + 0.04, 0.06, 0.04], [0.05, 0.25, 1], 0.38],
              during: path(limePick, [() => lime.position.clone().setY(0.022), V3(LIME_HOME.x, 0.15, LIME_HOME.z), V3(JARS[1].x + 0.03, 0.15, 0), V3(JARS[1].x + 0.03, JH + 0.02, 0)], { t0: 0.43, t1: 0.62, release: 0.64 }) },
            { cap: '硫在空气中：微弱的淡蓝色火焰。', dur: 3.8, cam: [[0.03, 0.09, 0.04], [0.05, 0.22, 1], 0.4], during: carry(2, FL, { t0: 0.03, t1: 0.4, release: 0.42 }), speed: 2 },
            { cap: '在氧气中：明亮的蓝紫色火焰，生成有刺激性气味的气体。', dur: 4.4, cam: [[JARS[2].x - 0.03, 0.07, 0], [0.05, 0.25, 1], 0.4], during: carry(2, JT(2), { t0: 0.04, t1: 0.36, release: 0.38 }) },
            { cap: '细铁丝在空气中烧：红热，不能燃烧。', dur: 3.8, cam: [[0.06, 0.09, 0.04], [0.05, 0.22, 1], 0.4], during: carry(3, FL, { t0: 0.03, t1: 0.4, release: 0.42 }), speed: 2 },
            { cap: '另一根铁丝下端系一根火柴，在火焰上点燃火柴……', dur: 4.6, cam: [[0.08, 0.09, 0.04], [0.05, 0.22, 1], 0.42],
              during: act.seq(path(PK[3], [() => tipOf(3), () => tipOf(3).setY(TOP)], { t0: 0.02, t1: 0.14, release: 0.16 }),          // 先把第一根铁丝从火焰上拿开，放回桌上
                carry(4, FL, { t0: 0.42, t1: 0.72, release: 0.74 })) },
            { cap: '火柴快燃尽时伸进氧气：剧烈燃烧，火星四射，生成黑色固体。演示完了，下面换你自己做。', dur: 6, cam: [[JARS[3].x - 0.04, 0.07, 0], [0.05, 0.25, 1], 0.42],
              during: act.seq(act.at(0.28, () => { if (S.matchLit) S.match = Math.max(S.match, 0.68); }),          // 演示里省掉等的时间：拿到瓶口时火柴正好快燃尽
                carry(4, JT(3), { t0: 0.06, t1: 0.34, release: 0.36 })) },
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
    // 滑过去：转角逐个分量 lerp
    const turn = (o, e, a) => o.rotation.set(o.rotation.x + (e.x - o.rotation.x) * a, o.rotation.y + (e.y - o.rotation.y) * a, o.rotation.z + (e.z - o.rotation.z) * a);
    // 放回桌上：先水平挪到原处的上方，再放下去（不斜着穿过别的器材）
    const carryHome = (o, p, a) => { const d = Math.hypot(o.position.x - p.x, o.position.z - p.z); o.position.lerp(d > 0.004 ? new THREE.Vector3(p.x, Math.max(o.position.y, p.y), p.z) : p, a); };
    // 跟着手滑过去，但不超过每秒 0.4 m（石灰水瓶：等瓶塞拔开以后才动，不会一下子蹿过去）
    const follow = (o, to, a, h) => { const d = to.clone().sub(o.position).multiplyScalar(a); if (d.length() > 0.4 * h) d.setLength(0.4 * h); o.position.add(d); };
    const moveTools = (h) => {
      const aF = 1 - Math.exp(-h * 22), aS = 1 - Math.exp(-h * 6);
      TOOLS.forEach((t, k) => {
        if (!ret[k]) {
          const y0 = t.position.y;
          t.position.lerp(goal[k], aF); turn(t, rotG[k], aF);
          // 木炭（钳口就是原点）：到了瓶口以下，只能由瓶口向下慢慢插进去
          if (k === 1 && JARS.some((J) => Math.hypot(t.position.x - J.x, t.position.z - J.z) < JR * 0.72 && t.position.y < JH + 0.004) && t.position.y < y0 - SLOW_IN * h) t.position.y = y0 - SLOW_IN * h;
          return;
        }
        // 放回桌上：工作端还在瓶里（或瓶口下面）就先竖直提出来
        const tp = tipOf(k), inJar = JARS.some((J) => Math.hypot(tp.x - J.x, tp.z - J.z) < JR + 0.008 && tp.y < JH + 0.012);
        if (inJar) t.position.y += (JH + 0.03 - tp.y) * aF * 0.6;
        else { carryHome(t, HOME[k], aS); turn(t, rotG[k], aS); if (t.position.distanceTo(HOME[k]) < 0.0005) ret[k] = false; }
      });
      // 澄清石灰水：拿起来时先拔出瓶塞，倒放在桌上（瓶塞离开瓶口以前，瓶子先不动）；拿着跟手；倒（瓶口对着第 2 瓶，一股细流）；放回去再塞好瓶塞
      const J = S.jars[1];
      const away = S.limeT >= 0 || !!limeGo || lime.position.distanceTo(LIME_HOME) > 0.003;
      if (away && limeCap.parent === lime) group.attach(limeCap);
      let capClear = true;
      if (limeCap.parent === group) {
        // 拔：先竖直拔出瓶颈，再横着挪开、翻过来，放到桌上倒放；塞回去：先抬到瓶口上方，横着挪过去、翻正，再竖直塞进瓶颈
        const cp = limeCap.position, ON = LIME_HOME.clone().add(CAP_ON), UP = ON.y + 0.012, off = Math.hypot(cp.x - ON.x, cp.z - ON.z);
        capClear = off > 0.02;
        let tgt, flip;
        if (away) { const atRest = Math.hypot(cp.x - CAP_REST.x, cp.z - CAP_REST.z) < 0.003; tgt = off < 0.003 && cp.y < UP - 0.001 ? new THREE.Vector3(cp.x, UP, cp.z) : !atRest ? new THREE.Vector3(CAP_REST.x, Math.max(cp.y, CAP_REST.y + 0.008), CAP_REST.z) : Math.abs(limeCap.rotation.x - Math.PI) < 0.1 ? CAP_REST : new THREE.Vector3(CAP_REST.x, cp.y, CAP_REST.z); flip = off > 0.008 ? Math.PI : 0; }
        else { tgt = off > 0.003 ? (cp.y < UP - 0.001 ? new THREE.Vector3(cp.x, UP, cp.z) : new THREE.Vector3(ON.x, UP, ON.z)) : Math.abs(limeCap.rotation.x) < 0.05 ? ON : new THREE.Vector3(ON.x, UP, ON.z); flip = 0; }
        cp.lerp(tgt, aF * 0.8);
        limeCap.rotation.x += (flip - limeCap.rotation.x) * aF * 0.5; limeCap.rotation.z += (0 - limeCap.rotation.z) * aF * 0.5;
        if (!away && cp.distanceTo(ON) < 0.0006 && Math.abs(limeCap.rotation.x) < 0.02) { lime.attach(limeCap); limeCap.position.copy(CAP_ON); limeCap.rotation.set(0, 0, 0); }
      }
      limeStream.visible = false;
      if (S.limeT >= 0) {
        if (capClear) { follow(lime, LIME_POUR, aF * 0.7, h); const near = lime.position.distanceTo(LIME_POUR) < 0.03; lime.rotation.z += ((near ? LIME_TILT : 0) - lime.rotation.z) * aF * 0.7; }      // 竖着拿过去，到了瓶口上方再斜过来
        const there = lime.position.distanceTo(LIME_POUR) < 0.004 && Math.abs(lime.rotation.z - LIME_TILT) < 0.08;
        if (capClear && (there || S.limeT > 0)) S.limeT += h;          // 瓶口对好了才开始倒
        const lt = S.limeT;
        if (lt > 0.35 && lt < 1.35) {
          J.water = 0.14 * clamp((lt - 0.35) / 0.95, 0, 1);
          lime.updateMatrixWorld(true); const m = group.worldToLocal(lime.localToWorld(new THREE.Vector3(0, lime.mouthY, 0)));
          limeStream.visible = true; limeStream.position.copy(m); limeStream.scale.y = Math.max(0.001, m.y - JH * J.water);
        }
        if (lt > 1.6) A.limed();
      } else if (limeGo) { if (capClear) { follow(lime, limeGo, aF, h); lime.rotation.z += (0 - lime.rotation.z) * aF; } }          // 拿着走时竖着（到了瓶口上方松手，再斜过来倒）
      else { carryHome(lime, LIME_HOME, aS); lime.rotation.z += (0 - lime.rotation.z) * aS; }
    };
    const step = (h, t) => {
      lamp.flame.setOn(true); lamp.flame.update(t);
      moveTools(h);
      for (let k = 0; k < 5; k++) {
        const fl = inFlame(k), j = S.inJar[k], J = j >= 0 ? S.jars[j] : null;
        const x = J ? J.x : 0.21;              // 周围氧气的浓度：瓶里 / 空气
        // 加热
        if (fl) S.hot[k] = Math.min(1, S.hot[k] + h * (k >= 3 ? 0.5 : 0.45)); else if (!J || S.burn[k] <= 0) S.hot[k] = Math.max(0, S.hot[k] - h * 0.12);
        if (k === 0) {
          // 带火星的木条：在氧气里复燃
          if (J && x >= RELIGHT && S.test?.t > 0.5) { stick.setState('flame', 1); if (!S.res[0].o2) { S.res[0].o2 = '复燃'; sfx.whoosh({ freq: 500, gain: 0.12, dur: 0.5 }); row('s-o2', '带火星的木条伸进氧气中', '<b>复燃</b>'); done('stick'); status('带火星的木条伸进氧气里，<b>复燃</b>了——氧气能<b>支持燃烧</b>。'); } J.x = Math.max(0.21, J.x - h * 0.02); }
          else if (S.hold === 0 && !J) { stick.setState('ember', 0.4); S.airT0 = (S.airT0 || 0) + h; if (S.airT0 > 1.5 && !S.res[0].air) { S.res[0].air = '只有火星'; row('s-air', '带火星的木条在空气中', '只有一点火星，不复燃'); } }
        }
        if (k === 1) {
          // 木炭：在空气中红热；烧红以后伸进氧气，发出白光
          const red = S.hot[1];
          if (fl && red > 0.8 && !S.res[1].air) { S.res[1].air = '红热'; row('c-air', '木炭在空气中燃烧', '<b>红热</b>（发红光）'); done('coalAir'); status('木炭在空气中加热：<b>红热</b>，发出红光。现在把它伸进第 2 瓶氧气里。'); }
          if (J && red > 0.6 && J.x > 0.3) { S.burn[1] += h; J.x = Math.max(0.05, J.x - h * 0.06); J.used += h * 0.06; J.co2 = true; }
          else if (S.burn[1] > 0 && (!J || J.x <= 0.3)) S.burn[1] = 0;
          const white = J && S.burn[1] > 0 ? clamp((J.x - 0.25) / 0.4, 0, 1) : 0;
          coalGlow.material.color.lerpColors(new THREE.Color(0xff4a1a), new THREE.Color(0xfff6e0), white);
          coalGlow.material.opacity = Math.max(red * 0.75, white); coalGlow.scale.setScalar(0.025 + red * 0.01 + white * 0.05);
          coalPiece.material.color.setHex(white > 0.2 ? 0xfff0d0 : red > 0.5 ? 0x9a2a12 : 0x2a2a30);
          if (white > 0.5 && S.burn[1] > 0.6 && !S.res[1].o2) { S.res[1].o2 = '发出白光'; sfx.whoosh({ freq: 380, gain: 0.12 }); row('c-o2', '木炭在氧气中燃烧', '<b>剧烈燃烧，发出白光</b>，放出热量'); done('coalO2'); status('在氧气里，木炭<b>剧烈燃烧，发出白光</b>。（烧完以后，可以把桌上的<b>澄清石灰水</b>倒进这瓶里，看看生成了什么。）'); }
          if (white > 0.5 && Math.random() < h * 10) { const c = tipOf(1); sparks.spawn(c, new THREE.Vector3((Math.random() - 0.5) * 0.1, Math.random() * 0.08, (Math.random() - 0.5) * 0.1), 0.2); }
        }
        if (k === 2) {
          // 硫：受热熔化，点燃；在空气中微弱的淡蓝色火焰，在氧气中明亮的蓝紫色火焰
          if (fl) { S.sulMelt = Math.min(1, S.sulMelt + h * 0.8); if (S.sulMelt > 0.7 && S.burn[2] <= 0) { S.burn[2] = 0.01; sfx.whoosh({ freq: 300, gain: 0.08 }); } }
          if (S.burn[2] > 0) { S.burn[2] += h; if (J && J.x > 0.3) { J.x = Math.max(0.05, J.x - h * 0.05); J.used += h * 0.05; } if (S.burn[2] > 40) S.burn[2] = 0; }
          const strong = J && S.burn[2] > 0 ? clamp((J.x - 0.25) / 0.4, 0, 1) : 0;
          sFlame.setOn(S.burn[2] > 0);
          sFlame.setSize(0.45 + strong * 0.9);
          sFlame.setColors?.({ core: strong > 0.3 ? 0xe4dcff : 0xd6e4ff, mid: strong > 0.3 ? 0x7a5cff : 0x8fb0ff, edge: strong > 0.3 ? 0x5a2fe0 : 0x7aa0f5 });
          sHeap.material.color.setHex(S.sulMelt > 0.5 ? 0xc9832a : 0xe8cf3a);
          if (S.burn[2] > 1 && !J && !S.res[2].air) { S.res[2].air = '淡蓝色'; row('su-air', '硫在空气中燃烧', '<b>微弱的淡蓝色火焰</b>'); done('sAir'); status('硫在空气中燃烧：发出<b>微弱的淡蓝色火焰</b>。现在把它伸进第 3 瓶氧气里。'); }
          if (strong > 0.5 && S.test?.t > 0.8 && !S.res[2].o2) { S.res[2].o2 = '蓝紫色'; row('su-o2', '硫在氧气中燃烧', '<b>明亮的蓝紫色火焰</b>，生成有刺激性气味的气体，放出热量'); done('sO2'); status('在氧气里，硫燃烧得更旺，发出<b>明亮的蓝紫色火焰</b>，生成一种有<b>刺激性气味</b>的气体（二氧化硫）。'); }
          smoke.update(h, { rate: S.burn[2] > 0 && !J ? 4 : 0, origin: tipOf(2).add(new THREE.Vector3(0, 0.02, 0)), spread: 0.004, up: 0.03, size: 0.01, life: 2 });
        }
        if (k === 3) {
          // 第一根铁丝：在空气中（酒精灯上）烧——红热，不能燃烧
          wireA.glow.material.opacity = fl ? S.hot[3] * 0.7 : 0; wireA.glow.material.color.setHex(0xff5a1f); wireA.glow.scale.setScalar(0.035);
          if (fl && S.hot[3] > 0.8 && !S.res[3].air) { S.res[3].air = '红热'; row('fe-air', '细铁丝在空气中（酒精灯上）加热', '<b>红热</b>，不能燃烧'); done('feAir'); status('细铁丝在空气中烧：<b>红热</b>，但<b>不能燃烧</b>。现在用另一根<b>系着火柴</b>的铁丝试试氧气。'); }
        }
        if (k === 4) {
          // 第二根铁丝：火柴在火焰上点着，烧大约 5 秒；火柴还旺的时候就插进去，火柴会先用掉瓶里的氧气
          if (fl && !S.matchLit && S.match === 0 && S.burn[4] <= 0) { S.matchLit = true; status('火柴点着了——等它<b>快燃尽</b>时，伸进第 4 瓶氧气。'); }
          if (S.matchLit) {
            S.match += h / 5;
            if (J && S.match < 0.85) { J.x = Math.max(0.21, J.x - h * 0.09 * (1 - S.match)); J.used += h * 0.04; }
            if (S.match >= 1) {
              S.matchLit = false;
              if (J && J.x >= IRON) { S.burn[4] = 0.01; sfx.whoosh({ freq: 600, gain: 0.16 }); }
              else if (J) { status(`火柴烧完了，可铁丝只是红热——瓶里的氧气被火柴用掉了不少（降到约 ${Math.round(J.x * 100)}%）。要等火柴<b>快燃尽</b>时再插进去。“全部重来”换几瓶新的氧气再试。`); row('fe-early', '火柴还旺时就插进氧气', '火柴把瓶里的氧气用掉了不少，铁丝只红热'); }
              else status('火柴在外面烧完了。把铁丝放回桌上，换一根新火柴再点。');
            }
          }
          wire.flame.setOn(S.matchLit); wire.flame.setSize(1 - S.match * 0.7); wire.flame.update(t);
          wire.head.visible = S.match < 0.5;
          const burning = S.burn[4] > 0 && J && J.x >= IRON * 0.9;
          if (S.burn[4] > 0) { S.burn[4] += h; if (J) { J.x = Math.max(0.1, J.x - h * 0.05); J.used += h * 0.05; } if (S.burn[4] > 6 || !J) S.burn[4] = 0; }
          wire.glow.material.opacity = burning ? 1 : fl ? S.hot[4] * 0.5 : 0;
          wire.glow.material.color.setHex(burning ? 0xfff1c0 : 0xff5a1f); wire.glow.scale.setScalar(burning ? 0.07 : 0.035);
          if (burning) { const n = Math.round(30 * h * 30); const c = tipOf(4); for (let i = 0; i < n; i++) sparks.spawn(c.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.006, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.006)), new THREE.Vector3((Math.random() - 0.5) * 0.42, Math.random() * 0.24 - 0.06, (Math.random() - 0.5) * 0.42), 0.25 + Math.random() * 0.3); }
          if (burning && S.burn[4] > 0.6 && !S.res[3].o2) {
            S.res[3].o2 = '火星四射'; row('fe-o2', '细铁丝在氧气中燃烧', '<b>剧烈燃烧，火星四射</b>，放出大量的热，生成黑色固体'); done('feO2');
            if (S.noWater) { S.jars[3].cracked = true; status('铁丝在氧气中<b>剧烈燃烧，火星四射</b>——可是瓶底没有留水，溅落的高温熔融物使<b>瓶底炸裂</b>了。'); }
            else status('细铁丝在氧气中<b>剧烈燃烧，火星四射</b>，放出大量的热，生成<b>黑色固体</b>。瓶底的水防止了溅落的熔融物炸裂瓶底。');
          }
        }
      }
      sparks.update(h, 0.5);
      if (S.test) { S.test.t += h; }
      // 瓶：水、玻璃片（伸进东西时滑开）
      jars.forEach((j, k) => {
        const J = S.jars[k];
        j.setWater(S.noWater && k === 3 ? 0 : J.water); j.plate.position.x += ((J.open ? 0.03 : 0) - j.plate.position.x) * Math.min(1, h * 8);      // 玻璃片推开 j.plate.visible = true;
        j.water.material.color.setHex(J.lime ? 0xdde9ed : CHEM.water);                    // 澄清石灰水：几乎无色
        milkK[k] = J.lime && J.co2 ? Math.min(1, milkK[k] + h * 0.6) : 0; jarMilk[k].set(milkK[k]); jarMilk[k].update(t);
      });
      // 气体小点：每瓶 34 个，蓝 = 氧气；燃烧用掉的变灰（木炭、硫、木条生成别的气体）或消失（铁生成固体）
      const blue = [], gray = [];
      S.jars.forEach((J, k) => {
        J.dots ||= Array.from({ length: PER_JAR }, (_, i) => dot(k, i));
        const nb = Math.round(PER_JAR * J.x), ironGone = k === 3 ? Math.round(PER_JAR * Math.max(0, X_JAR - J.x) * 0.9) : 0;
        const base = JARS[k], wy = JH * (S.noWater && k === 3 ? 0 : J.water) + 0.004, span = JH * 0.76 - wy;
        J.dots.forEach((d, i) => {
          if (k === 3 && i >= PER_JAR - ironGone) return;
          const y = wy + ((d.v + Math.sin(t * 0.6 + d.ph) * 0.03 + 1) % 1) * span, rr = (JR - 0.004) * d.u, a = d.th + Math.sin(t * 0.4 + d.ph) * 0.15;
          d.p.set(base.x + Math.cos(a) * rr, y, base.z + Math.sin(a) * rr);
          (i < nb ? blue : gray).push(d);
        });
      });
      // 灯焰周围的空气：有东西在火焰上时才画
      const anyFlame = [0, 1, 2, 3, 4].some(inFlame);
      if (anyFlame) for (const d of airDots) { const a = d.th + t * 0.3, rr = 0.012 + d.u * 0.03; d.p.set(LAMP.x + Math.cos(a) * rr, FLAME_Y - 0.015 + d.v * 0.05, Math.sin(a) * rr); (d.blue ? blue : gray).push(d); }
      blueP.list = blue; grayP.list = gray; blueP.update(0, () => true); grayP.update(0, () => true);
      // 卡片：每瓶一张
      cards.forEach((c, k) => {
        const J = S.jars[k], r = S.res[k];
        const lines = [r.air ? `<div class="cc-obs">空气中：<b class="o2-dim">${r.air}</b></div>` : '', r.o2 ? `<div class="cc-obs">氧气中：<b>${r.o2}</b></div>` : ''].join('');
        c.text(`<div class="cc"><div class="cc-t"><span class="cc-name">${NAMES[k]}</span>${J.cracked ? '<span class="cc-res">瓶底炸裂</span>' : ''}</div><div class="cc-more"><div class="cc-obs"><span class="o2-read"><i style="width:${Math.round(J.x * 100)}%"></i></span><b class="o2-num">${Math.round(J.x * 100)}%</b><small>氧气</small></div>${lines}</div></div>`).loc(group, JARS[k].x, JH, 0).show(true);
      });
      if (S.test && S.test.t > (S.test.k === 4 ? 8 : 5)) { const k = S.test.k; S.test = null; if (S.hold !== k) { S.inJar[k] = -1; A.home(k); } far(); if (!S.demo) A.maybeAsk(); }
      bar.near(S.near);
    };
    A.maybeAsk = () => { if (!W || S.asked) return; const all = ['stick', 'coalAir', 'coalO2', 'sAir', 'sO2', 'feAir', 'feO2'].every((x) => bar.has(x)); if (all) { S.asked = true; W.ask(); } };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.65, d: 0.2, h: 0.16 },
      view: { elev: 22, azim: -4, lookY: 0.4, frameMargin: 1.04 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = h('div', { class: 'sum-ctx' });
        const qa = buttons(['氧气的浓度越大，燃烧越剧烈；物质在空气中燃烧，实际上是和其中的氧气反应', '空气里没有氧气，所以在空气中烧不旺', '在氧气中温度更低，所以燃烧更剧烈'].map((t, j) => ({ text: t, ghost: true, onClick: () => {
          if (j === 1) return status('空气里有氧气——看灯焰周围的蓝点，每 5 个里大约有 1 个。');
          if (j === 2) return status('燃烧的剧烈程度和氧气有关。看瓶里和空气里蓝点的多少。');
          q1.hidden = true; q2.hidden = false; status('对：空气里的氧气只占约 1/5，所以在空气中燃烧不如在氧气中剧烈；有些在空气中不能燃烧的物质（铁丝），在氧气中却能燃烧。');
        } })));
        qa.el.dataset.keep = '1';
        const q1 = h('div', { class: 'think', hidden: true }, h('div', { class: 'think-t' }, '想一想'), ctx, h('p', { class: 'think-q' }, '同一种物质，在空气中和在氧气中燃烧的现象不同。这说明——'), qa.el);
        const qb = buttons(['都是两种物质生成另一种物质，都是物质与氧气发生的反应', '都生成了气体', '都不需要点燃'].map((t, j) => ({ text: t, ghost: true, onClick: () => {
          if (j === 1) return status('铁和氧气反应生成的是黑色固体（四氧化三铁），不是气体。');
          if (j === 2) return status('三个反应的条件都是“点燃”。');
          q2.hidden = true; next.hidden = false; done('why');
          status('对。由两种或两种以上物质生成另一种物质的反应叫<b>化合反应</b>；物质与氧气发生的反应属于<b>氧化反应</b>。可以掀开结论看看。');
        } })));
        qb.el.dataset.keep = '1';
        const q2 = h('div', { class: 'think', hidden: true }, h('div', { class: 'think-t' }, '想一想'),
          h('div', { class: 'sum-ctx', html: '<div>碳 + 氧气 → 二氧化碳</div><div>硫 + 氧气 → 二氧化硫</div><div>铁 + 氧气 → 四氧化三铁</div>' }),
          h('p', { class: 'think-q' }, '这三个反应有什么共同特点？'), qb.el);
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const ask = () => {
          const r = S.res;
          ctx.innerHTML = [['木炭', 1], ['硫', 2], ['细铁丝', 3]].map(([n, k]) => `<div>${n}：空气中 <b class="n">${r[k].air || '—'}</b>，氧气中 <b class="y">${r[k].o2 || '—'}</b></div>`).join('');
          q1.hidden = false; far(); status('四样东西都比较过了。看看下面你记下的现象，回答问题。');
        };
        const tbl = table(['实验内容', '现象']);
        const water = seg('', ['第 4 瓶瓶底留水', '瓶底不留水（错误示范）'], (_, k) => { S.noWater = !!k; status(k ? '第 4 瓶的水倒掉了。看看铁丝燃烧时会怎样。' : '第 4 瓶瓶底留了一些水。'); });
        const vary = h('details', { class: 'more' }, h('summary', {}, '换个条件再试'), h('p', { class: 'fineprint' }, '做铁丝燃烧之前，把第 4 瓶瓶底的水倒掉，看看会怎样。也可以试试：火柴还烧得很旺时就把铁丝插进去。'), water.el);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'),
          buttons([{ text: '全部重来（四瓶新的氧气，清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const safe = h('p', { class: 'fineprint warn', html: '课本提示：硫的燃烧实验由教师演示，应在通风橱中或排风设备下进行（二氧化硫有毒）。细铁丝燃烧时，集气瓶底要预先放一些水。' });
        const note = h('p', { class: 'fineprint', html: '说明：一瓶排水法收集的氧气按氧气约占 90% 计；木条复燃（约 45% 以上）、细铁丝燃烧（约 57% 以上）所需的氧气浓度是按初中探究题里的实验数据取的近似值。' });
        ui.controls.append(q1, q2, next, vary, more, safe, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, q1, q2, next, ask, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('一排四瓶氧气，中间是点着的酒精灯。蓝点是氧气。可以先看<b>老师演示</b>，也可以直接动手。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); stick.update(t); },
      dispose() { bar.dispose(); sparks.clear?.(); smoke.dispose(); blueP.dispose(); grayP.dispose(); },
      debug: { get S() { return S; }, A, bar, tipOf, inFlame, jarAt, picks: { stick: stickPick, coal: coalPick, sulfur: sPick, wireA: wireA.pick, wire: wire.pick, lime: limePick, jar2: jars[1] },
        qa: qaFlow(drag, [
          { name: '带火星的木条伸进第 1 瓶', drag: stickPick, to: () => JT(0), wait: 6 },
          { name: '木炭在火焰上加热', drag: coalPick, to: () => FL, wait: 3 },
          { name: '木炭由瓶口缓慢插入第 2 瓶', drag: coalPick, to: () => V3(JARS[1].x, JH + 0.012, 0), wait: 6 },      // 拿到瓶口松手，木炭自己慢慢插下去
          { name: '倒入澄清石灰水', drag: limePick, to: () => V3(JARS[1].x + 0.03, JH + 0.02, 0), wait: 12 },      // 倒完镜头要停一会儿让人看清变浑浊（约 2 秒后才拉远）
          { name: '硫在火焰上加热', drag: sPick, to: () => FL, wait: 3 },
          { name: '硫伸进第 3 瓶', drag: sPick, to: () => JT(2), wait: 6 },
          { name: '细铁丝在火焰上烧', drag: wireA.pick, to: () => FL, wait: 3 },
          { name: '细铁丝放回桌上', drag: wireA.pick, to: () => V3(0.05, 0.16, 0), wait: 1.5 },
          { name: '点燃铁丝下端的火柴', drag: wire.pick, to: () => FL, wait: 2.6, scale: 1 },      // 真实速度：等火柴快燃尽
          { name: '火柴快燃尽时伸进第 4 瓶', drag: wire.pick, to: () => JT(3), wait: 9 },
          { name: '答第一题', run: () => W.q1.querySelector('button').click() },
          { name: '答第二题', run: () => W.q2.querySelector('button').click() },
        ]) },
    };
  },
};
