// 课题1 我们周围的空气 · 思考与讨论：测定空气中氧气的含量（课本第 31 页、图 2-4；第 32 页数字化实验 图 2-5）。
//
// 集气瓶里加少量水，水面上方分成 5 等份；夹紧弹簧夹；燃烧匙里放足量红磷，在酒精灯上点燃，立即伸入瓶中塞紧；
// 红磷熄灭、冷却到室温后打开弹簧夹，烧杯里的水被吸进集气瓶。
//
// 看不见的东西：瓶里的气体画成小点——蓝点是氧气，灰点是其余的气体（主要是氮气），开始时大约每 5 个里 1 个蓝点；
// 旁边的卡片是一个“氧气读数”（对应课本第 32 页用氧气传感器的数字化实验）。
//
// 模型（照实建，不凑 1/5）：
// - 瓶里气体的量 n、温度 T、气体体积 V（水面上方，单位 = 开始时水面上方的空间），压强 p = n·T / (V·T0)。
// - 红磷燃烧消耗氧气、放热；氧气降到约 8% 时红磷熄灭——人教社《中小学数字化教学》2018 年第 9 期：
//   “用氧气传感器测定红磷燃烧耗氧时发现，氧气含量降至 8.0% 就不再减少”。所以操作完全正确，进水也略少于 1 格。
// - 燃烧匙伸进去、塞子还没塞紧的那一会儿，瓶口是敞开的：瓶里的空气受热膨胀，从瓶口跑掉一些（伸得越慢跑得越多 → 进水偏多）。
// - 弹簧夹没夹紧：燃烧时受热的气体从导管跑进烧杯（冒气泡），进水偏多。红磷太少：氧气没用完，进水偏少。
//   塞子没塞紧：冷却时外面的空气漏进来，进水偏少。没冷却就打开：刚打开时进水偏少（之后随着冷却还会继续进）。
import * as THREE from 'three';
import { buttons, seg, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { canvasTex, textPlate } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { glassMat, glassTube, rubberTube, chemLamp, chemBeaker, reagentBottle, spatula, CHEM } from './kit/chem.js';
import { glass2, water2, waterSurface, flame2, smoke2, bubble2 } from './kit/chemfx.js';
import { microWorld, airScene } from './kit/microworld.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, demoActs } from './kit/chemlesson.js';
import { lampCap } from './kit/labops.js';
import { sfx } from './kit/audio.js';
import { paint, inked, hull } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const T0 = 25;                        // 室温 ℃
const K0 = T0 + 273;
const R = 0.032, BODY = 0.112, NECK = 0.0215, MOUTH = 0.134;     // 广口瓶：瓶身半径、瓶身高、瓶颈半径、瓶口高
const W0 = 0.016;                     // 瓶底预先加的水
const SEAT = 0.124;                   // 塞紧时塞子下沿的高度
const CUP = 0.069;                    // 燃烧匙的小勺在塞子下沿下面多远
const O2_OUT = 0.08;                  // 红磷熄灭时的氧气体积分数（约 8%）
const SCOOP = 0.09;                   // 一勺红磷大约能消耗的氧气（单位：瓶里空气的份数）
const LAMP = new THREE.Vector3(-0.15, 0, 0.0), FLAME_Y = 0.1;
const BK = new THREE.Vector3(0.19, 0, 0.0);
const BOTTLE = new THREE.Vector3(-0.1, 0, 0.075);
const SP_HOME = new THREE.Vector3(-0.045, 0.07, 0.07);          // 燃烧匙不用的时候斜靠在集气瓶旁边，小勺着地（小勺落在红磷试剂瓶右边，不和试剂瓶叠在一起）
const LEAN = -0.32;
const BLUE = 0x2f7fd8, GRAY = 0x9aa1ad;
const SPAT_HOME = new THREE.Vector3(-0.135, 0.0043, 0.1);       // 药匙：平放在试剂瓶前面
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

// 瓶子的内轮廓（半径随高度），用来按“体积”而不是按高度分 5 等份
const rAt = (y) => (y < BODY ? R - 0.0012 : y < BODY + 0.012 ? R - 0.0012 - (R - NECK) * ((y - BODY) / 0.012) : NECK - 0.0012);
const volBetween = (a, b) => { let v = 0; const n = 80; for (let i = 0; i < n; i++) { const y = a + ((b - a) * (i + 0.5)) / n; v += Math.PI * rAt(y) ** 2; } return (v * (b - a)) / n; };
const SPACE = volBetween(W0, SEAT);                                // 水面上方的空间（= 1 份）
const levelOf = (f) => { let lo = W0, hi = SEAT; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (volBetween(W0, m) / SPACE < f) lo = m; else hi = m; } return (lo + hi) / 2; };
const MARKS = [1, 2, 3, 4, 5].map((k) => levelOf(k / 5));

export default {
  id: 'airoxygen',
  fig: '图2-4',
  title: '测定空气中氧气的含量',
  stampText: '探究',
  style: 'paper',
  predict: {
    q: '在集气瓶里点燃红磷，塞紧瓶塞。红磷熄灭、冷却以后打开弹簧夹，烧杯里的水会进入集气瓶，大约进到——',
    hint: '课本第 31 页“思考与讨论”。集气瓶水面上方的空间分成了 5 等份。',
    options: ['水面上方空间的 1/5 左右', '一半左右', '几乎充满整个瓶子'],
    answer: 0,
  },
  need: '夹紧弹簧夹，点燃红磷伸入瓶中，冷却后打开弹簧夹，读出进水；想一想空气里的氧气约占多少',
  conclusion: {
    crops: [{ page: 37, rect: [66, 262, 336, 322] }],
    quote: '通过实验测定，空气的成分按体积计算，大约是：氮气 78%、氧气 21%、稀有气体 0.94%、二氧化碳 0.04%、其他气体 0.02%。',
    why: '红磷燃烧消耗瓶里的<b>氧气</b>，生成的五氧化二磷是固体（白烟，慢慢溶进水里）。瓶里的气体少了，冷却后压强比外面小，打开弹簧夹，大气压把烧杯里的水压进瓶里——<b>进去的水的体积 ≈ 消耗掉的氧气的体积</b>，约占瓶内空气的 1/5。剩下的气体主要是氮气：不能燃烧、也不支持燃烧，难溶于水。<br>用氧气传感器测会发现，红磷熄灭时瓶里还剩约 8% 的氧气，所以操作完全正确，进水也常常<b>略少于</b> 1/5。进水偏多：弹簧夹没夹紧、燃烧匙伸入太慢（瓶里的空气受热跑掉了）；进水偏少：红磷太少、塞子漏气、没冷却就打开弹簧夹。',
    src: '课本第 31–32 页 · 第二单元 课题1 我们周围的空气；剩余氧气约 8%：人教社《中小学数字化教学》2018 年第 9 期',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null;
    const near = (v, d, dist) => { S.near = true; look([v.x, v.y, v.z], d || [0.05, 0.3, 1], dist || 0.3, () => { S.near = false; }); };
    const far = () => { if (S.near) { S.near = false; back(); } };

    // 器材脚下一层淡淡的白，把这块书页上的字压下去
    const sheetTex = canvasTex(512, 256, (g, W, H) => {
      const gr = g.createRadialGradient(W / 2, H / 2, H * 0.12, W / 2, H / 2, W * 0.5);
      gr.addColorStop(0, 'rgba(253,251,245,0.9)'); gr.addColorStop(0.62, 'rgba(253,251,245,0.82)'); gr.addColorStop(1, 'rgba(253,251,245,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    });
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), new THREE.MeshLambertMaterial({ map: sheetTex, transparent: true, depthWrite: false }));
    sheet.rotation.x = -Math.PI / 2; sheet.position.set(0.01, 0.0004, 0.03); sheet.receiveShadow = true; sheet.renderOrder = 1; sheet.raycast = () => {}; sheet.userData.noFrame = true;
    group.add(sheet);

    // ================= 集气瓶（广口瓶）、瓶里的水、5 等份刻度 =================
    const prof = [new THREE.Vector2(0.0003, 0), new THREE.Vector2(R - 0.003, 0), new THREE.Vector2(R, 0.003), new THREE.Vector2(R, BODY), new THREE.Vector2(NECK, BODY + 0.012), new THREE.Vector2(NECK, MOUTH - 0.002), new THREE.Vector2(NECK + 0.0025, MOUTH)];
    const jar = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), glass2({ base: 0.05, rim: 0.42, band: 0.55 }));
    jar.geometry.translate(0, 0.0006, 0); jar.renderOrder = 9; group.add(jar);
    const jw = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.0013, R - 0.0013, 1, 40), water2({ color: CHEM.water }));
    jw.geometry.translate(0, 0.5, 0); jw.position.y = 0.0012; jw.renderOrder = 7; group.add(jw);
    const jws = waterSurface({ r: R - 0.0013 }); jws.renderOrder = 8; group.add(jws);
    const setJarWater = (y) => { jw.scale.y = y - 0.0012; jws.position.y = y; };
    // 刻度：瓶身正面的 5 道短线和数字（按体积等分）
    const tickMat = new THREE.LineBasicMaterial({ color: 0x2b3142, transparent: true, opacity: 0.75 });
    MARKS.forEach((y, i) => {
      const a0 = -0.42, a1 = -0.12, pts = [];
      for (let k = 0; k <= 6; k++) { const a = a0 + ((a1 - a0) * k) / 6; pts.push(new THREE.Vector3(Math.sin(a) * (R + 0.0005), y, Math.cos(a) * (R + 0.0005))); }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), tickMat));
      if (i < 4) { const n = textPlate(String(i + 1), { w: 0.01, h: 0.01, color: '#2b3142', font: 'bold 300px "Times New Roman", serif' }); n.position.set(Math.sin(-0.5) * (R + 0.003), y, Math.cos(-0.5) * (R + 0.003)); n.rotation.y = -0.5; n.renderOrder = 10; group.add(n); }
    });
    // 原来的水面：一道淡淡的虚线（进水从这里算起）
    { const pts = []; for (let k = 0; k <= 6; k++) { const a = -0.42 + (0.3 * k) / 6; pts.push(new THREE.Vector3(Math.sin(a) * (R + 0.0005), W0, Math.cos(a) * (R + 0.0005))); }
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0x2b3142, dashSize: 0.002, gapSize: 0.0015, transparent: true, opacity: 0.6 })); l.computeLineDistances(); group.add(l); }
    // 瓶里的白烟（五氧化二磷）：一层随浓度变的乳白，慢慢溶进水里
    const fog = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.002, R - 0.002, 1, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    fog.geometry.translate(0, 0.5, 0); fog.renderOrder = 8; group.add(fog);

    // ================= 燃烧匙 + 橡胶塞 + 弯导管（一起拿、一起塞进去） =================
    // 原点在塞子下沿中心；小勺在下面 CUP 处；塞子上面伸出的导管弯向右边
    const spoon = new THREE.Group(); group.add(spoon);
    const steel = paint(0x8a929e);
    const rod = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.0013, 0.0013, 0.13, 8), steel), 0.0005); rod.position.y = 0.065 - CUP; rod.position.x = -0.004;
    const cup = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), paint(0x8a929e, { side: THREE.DoubleSide }));
    cup.position.set(-0.004, -CUP, 0); cup.scale.y = 0.7;
    const plug = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0245, NECK - 0.0012, 0.02, 24), paint(CHEM.rubber)), { width: 1 }); plug.position.y = 0.01;
    const elbowPts = [new THREE.Vector3(0.009, -0.004, 0), new THREE.Vector3(0.009, 0.034, 0), new THREE.Vector3(0.016, 0.042, 0), new THREE.Vector3(0.04, 0.042, 0)];
    const elbow = glassTube(elbowPts);
    const heap = new THREE.Mesh(new THREE.SphereGeometry(0.0058, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xb5432f, { unique: true, keep: true }));
    heap.position.set(-0.004, -CUP - 0.0012, 0); heap.scale.set(1, 0.55, 1);
    const pFlame = flame2({ w: 0.014, h: 0.034, core: 0xffffff, mid: 0xfff0a8, edge: 0xffa24a, glowK: 0.5 }); pFlame.position.set(-0.004, -CUP + 0.002, 0); pFlame.setOn(false);
    const spoonPick = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.03), new THREE.MeshBasicMaterial({ visible: false })); spoonPick.position.y = -0.03; spoonPick.userData.pick = true;
    spoon.add(rod, cup, heap, plug, elbow, pFlame, spoonPick);
    const smokeOut = smoke2({ max: 120, opacity: 0.8 }); group.add(smokeOut.mesh);

    // ================= 烧杯、伸进烧杯的导管、乳胶管和弹簧夹 =================
    const bk = chemBeaker({ r: 0.036, h: 0.09, level: 0.06, color: CHEM.water }); bk.position.copy(BK); group.add(bk);
    const TUBE_TOP = new THREE.Vector3(BK.x - 0.06, 0.166, 0);
    const bTube = glassTube([TUBE_TOP, new THREE.Vector3(BK.x - 0.012, 0.166, 0), new THREE.Vector3(BK.x, 0.155, 0), new THREE.Vector3(BK.x, 0.012, 0)]);
    group.add(bTube);
    const clampG = new THREE.Group(); group.add(clampG);
    const jawA = inked(new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.003, 0.026), paint(0xc9ced6)), { width: 0.7 });
    const jawB = jawA.clone(); jawA.position.y = 0.006; jawB.position.y = -0.006;
    const coil = hull(new THREE.Mesh(new THREE.TorusGeometry(0.004, 0.0012, 6, 16), paint(0x8a929e)), 0.0004); coil.position.z = -0.016; coil.rotation.y = Math.PI / 2;
    const clampPick = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.04), new THREE.MeshBasicMaterial({ visible: false })); clampPick.userData.pick = true;
    clampG.add(jawA, jawB, coil, clampPick);
    let hose = null, hoseKey = '';
    const elbowEnd = () => spoon.localToWorld(elbowPts[3].clone()).applyMatrix4(new THREE.Matrix4().copy(group.matrixWorld).invert());
    const rebuildHose = () => {
      group.updateMatrixWorld(true);
      const a = elbowEnd(), b = TUBE_TOP;
      const key = a.toArray().map((x) => x.toFixed(4)).join();
      if (key === hoseKey) return; hoseKey = key;
      if (hose) { group.remove(hose); hose.geometry.dispose(); }
      const mid = a.clone().lerp(b, 0.5); mid.y = Math.max(a.y, b.y) + 0.012;
      hose = rubberTube([a.clone().add(new THREE.Vector3(-0.004, 0, 0)), a.clone().add(new THREE.Vector3(0.01, 0.004, 0)), mid, b.clone().add(new THREE.Vector3(-0.012, 0.003, 0)), b.clone().add(new THREE.Vector3(0.004, 0, 0))]);
      group.add(hose);
      const c = hose.curve.getPointAt(0.62), tg = hose.curve.getTangentAt(0.62); clampG.position.copy(c); clampG.rotation.z = Math.atan2(tg.y, tg.x);      // 夹子顺着乳胶管的方向
    };

    // ================= 酒精灯、红磷试剂瓶 =================
    const lamp = chemLamp(); lamp.position.copy(LAMP); group.add(lamp);
    const lampPick = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.07), new THREE.MeshBasicMaterial({ visible: false })); lampPick.position.y = 0.045; lampPick.userData.pick = true; lamp.add(lampPick);
    // 灯帽（课本第 18 页）：点燃前取下，放在灯的左前方桌上；熄灭时用灯帽盖灭，再轻提一下、重新盖好
    const capper = lampCap(group, lamp, { off: new THREE.Vector3(-0.2, 0, 0.045) });
    let flameOn = false;                    // 火焰真的亮着：灯帽拿开了才亮，盖上了才灭
    const bottle = reagentBottle({ color: 0xb5432f }); bottle.position.copy(BOTTLE); group.add(bottle);
    const bLabel = textPlate('红磷', { w: 0.026, h: 0.01, color: '#8a2a1a', bg: '#fffaf0', font: 'bold 160px "Songti SC", serif' }); bLabel.position.set(BOTTLE.x, 0.028, BOTTLE.z + 0.0185); group.add(bLabel);
    // 药匙：点一下试剂瓶，打开瓶盖，用药匙取一勺红磷，倒进燃烧匙里，再放回去（学生点的和演示里一样）
    const bCap = bottle.children[2], CAP_Y = bCap.position.y;
    const spat = spatula({ color: 0xb5432f }); spat.rotation.order = 'YZX'; spat.position.copy(SPAT_HOME); spat.rotation.set(0, -0.3, 0); group.add(spat);
    spat.heap.visible = false;
    const bottlePick = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.06, 10), new THREE.MeshBasicMaterial({ visible: false })); bottlePick.position.set(0, 0.03, 0); bottlePick.userData.pick = true; bottle.add(bottlePick);

    // ================= 瓶里的气体：蓝点 = 氧气，灰点 = 其余气体（主要是氮气） =================
    const dotTex = canvasTex(64, 64, (g, W) => { const gr = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,1)'); gr.addColorStop(0.75, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, W); });
    const blueP = new Particles({ max: 80, sprite: true, color: BLUE }), grayP = new Particles({ max: 120, sprite: true, color: GRAY });
    for (const p of [blueP, grayP]) { p.mat.uniforms.map.value = dotTex; p.mesh.renderOrder = 10; group.add(p.mesh); }
    const N_DOTS = 70;          // 开始时瓶里一共 70 个点：约 15 个蓝点
    const newDot = (kind) => ({ kind, u: Math.sqrt(Math.random()) * 0.88, th: Math.random() * Math.PI * 2, v: Math.random(), ph: Math.random() * 6, p: new THREE.Vector3(), size: 0.0042, alpha: kind === 'O' ? 0.95 : 0.55, age: 0, life: 1e9 });

    // ================= 气泡（导管口冒到烧杯里）、导管里流动的水 =================
    const bubs = new Particles({ max: 80, geometry: new THREE.SphereGeometry(1, 8, 6), material: bubble2() }); group.add(bubs.mesh);
    const flowPath = new THREE.CatmullRomCurve3([new THREE.Vector3(BK.x, 0.03, 0), new THREE.Vector3(BK.x, 0.155, 0), new THREE.Vector3(BK.x - 0.03, 0.17, 0), new THREE.Vector3(0.05, 0.172, 0), new THREE.Vector3(0.009, 0.165, 0), new THREE.Vector3(0.009, 0.12, 0), new THREE.Vector3(0.009, 0.06, 0)]);
    const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0024, 8, 6), water2({ color: 0x6fb6e0, base: 0.6, rim: 0.3 }), 14); drops.count = 0; drops.renderOrder = 11; drops.raycast = () => {}; group.add(drops);

    // ================= 卡片：瓶里的空气（氧气读数）、燃烧匙里的红磷 =================
    const jarCard = tag('', 'cond'); jarCard.px = [-150, -40];
    const spCard = tag('', 'cond'); spCard.px = [-90, 30];

    // ================= 状态 =================
    const fresh = () => {
      const s = {
        clamp: false, lit: false, amount: 0, burnOut: false, burning: false, inFlameT: 0,
        sp: SP_HOME.clone(), lying: true, seated: false, wasSealedBurn: false, openT: 0, slow: false,
        nO: 0.21, nN: 0.79, T: T0, f: 0, fog: 0, leak: false, early: false, opened: false,
        dots: [], runFlags: {}, readings: null, flowT: 0, settleT: 0, demo: false, near: false,
        scoopQ: 0, scoopA: null, spDrag: false,       // 药匙还要倒几勺、正在倒的这一勺；燃烧匙是不是正被拿着
      };
      const nb = Math.round(N_DOTS * 0.21);
      for (let i = 0; i < N_DOTS; i++) s.dots.push(newDot(i < nb ? 'O' : 'N'));
      return s;
    };
    S = fresh();
    let W = null, runs = 0, snapSp = true;        // snapSp：换一套器材时燃烧匙直接摆好（平时松手以后滑过去）
    const snapCap = () => { capper.snap(S.lit); flameOn = S.lit; };      // 换一套器材（演示开始、结束，再做一次）时灯帽直接摆好
    const status = (m) => { if (!S.demo) W?.status(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };      // 演示里的操作不算学生的步骤
    const o2pct = () => (100 * S.nO) / (S.nO + S.nN);
    const gasV = () => 1 - S.f;
    const pres = () => ((S.nO + S.nN) * (S.T + 273)) / (gasV() * K0);
    const cupPos = () => spoon.localToWorld(cup.position.clone()).applyMatrix4(new THREE.Matrix4().copy(group.matrixWorld).invert());
    // 微观次元：燃烧匙里的红磷表面——O₂ 落上去变成 P₂O₅，N₂ 撞上去又弹开
    const mwState = () => ({ xO: S.nO / (S.nO + S.nN), burning: S.burning });
    const mw = microWorld({ mode: 'holo', scene: airScene(), place: () => ({ pos: group.localToWorld(cupPos().add(new THREE.Vector3(0, 0.004, 0))), scale: 0.0062 * group.getWorldScale(new THREE.Vector3()).x, cam: window.__lb.stage.camera }) });
    const goBtn = tag('钻进红磷表面看 ⊙', 'pill mw-go', () => openMicro());
    const openMicro = (demo = false) => {
      const p = cupPos(); if (!demo) { S.near = true; look([p.x, p.y + 0.05, p.z], [0.06, 0.2, 1], 0.3, () => { S.near = false; }); }
      const r = () => { const cam = window.__lb?.stage?.camera; if (!cam) return [innerWidth / 2, innerHeight * 0.8]; const v = group.localToWorld(cupPos()).project(cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; };
      mw.open(r, mwState());
    };
    mw.onClose = () => { if (!bar.playing) far(); };
    const inJar = () => { const c = cupPos(); return !S.lying && Math.abs(c.x) < NECK - 0.004 && Math.abs(c.z) < NECK && c.y < MOUTH && c.y > W0; };

    const A = {
      clamp(on = !S.clamp) {
        S.clamp = on; sfx.clink({ freq: on ? 2600 : 1900 });
        if (on) { status('用弹簧夹<b>夹紧</b>了乳胶管：瓶里的气体出不去，烧杯里的水也进不来。'); if (!S.seated) done('clamp'); }
        else if (S.seated) { S.opened = true; S.early = S.T > T0 + 5; S.runFlags.early = S.early; done('open'); status(S.early ? '还没冷却就打开了弹簧夹……看看水进去多少。' : '打开了弹簧夹。看烧杯里的水。'); }
        else { bar.undo('clamp'); status('松开了弹簧夹。'); }
      },
      scoop() {
        if (S.burning) return status('燃烧匙里的红磷正在燃烧。');
        if (!S.lying && S.seated) return status('燃烧匙已经塞进瓶里了。');
        if (S.amount < 3) S.scoopQ++;
        S.amount = Math.min(3, S.amount + 1); S.burnOut = false;
        status(S.amount === 1 ? '往燃烧匙里放了<b>一小勺</b>红磷。要“足量”，可以再加一勺。' : `燃烧匙里有 <b>${S.amount} 勺</b>红磷了（足量）。`);
        if (S.amount >= 2) done('load'); else if (bar.current === 'load') bar.say('只有一小勺。课本要求放<b>足量</b>的红磷——再点一下试剂瓶，或者就这样试试看。');
      },
      lamp() { S.lit = !S.lit; status(S.lit ? '取下灯帽，点燃了酒精灯。把燃烧匙伸到火焰上，点燃红磷。' : '用灯帽盖灭了酒精灯。'); },
      seat() {
        S.seated = true; S.sp.set(0, SEAT, 0); S.lying = false; sfx.clink({ freq: 1500 });
        S.runFlags.slow = S.openT > 1.4; S.runFlags.unclamped = !S.clamp; S.runFlags.little = S.amount < 2;
        if (S.burning) { S.wasSealedBurn = true; done('insert'); status(`塞紧了橡胶塞。${S.openT > 1.4 ? '（这次伸进去用了 ' + S.openT.toFixed(1) + ' 秒，有点慢。）' : ''}红磷在瓶里燃烧——看瓶里的蓝点。`); if (!S.demo) near(new THREE.Vector3(0, 0.07, 0), [0.15, 0.25, 1], 0.36); }
        else status('塞上了橡胶塞，可红磷还没点着。把燃烧匙拔出来，先在酒精灯上点燃。');
      },
      home() { S.lying = true; S.seated = false; S.sp.copy(SP_HOME); },
      /** 再做一次：换一瓶新的空气，器材摆回去；记录保留 */
      again() {
        const keepLeak = S.leak; S = fresh(); S.leak = keepLeak; snapSp = true; snapCap();
        bubs.clear(); smokeOut.clear(); far();
        bar.undo('clamp', 'load', 'light', 'insert', 'cool', 'open', 'read');
        if (W) { W.readBox.hidden = true; }
        status('换了一瓶新的空气，器材都摆回去了。这次可以换一种做法，看看进水偏多还是偏少。');
      },
      reset() { mw.close(); A.again(); runs = 0; W?.tbl.clear(); if (W) { W.q.hidden = true; W.next.hidden = true; } bar.undo('why'); S.leak = false; W?.leakSeg.set(0); status('全部重来，记录也清空了。'); },
    };

    // ================= 拖放、点击（演示里也走这一套） =================
    const drag = draggable(group, [
      { obj: spoonPick, plane: 'xy', offset: 0, hint: () => (S.seated ? '往上拖：拔出燃烧匙' : S.burning ? '拖进集气瓶：塞紧橡胶塞' : S.amount ? '拖到酒精灯火焰上：点燃红磷' : '先往燃烧匙里放红磷（点试剂瓶）'),
        onStart: () => { if (S.seated) { S.seated = false; S.wasSealedBurn = false; } if (S.lying) S.sp.y = Math.max(S.sp.y, CUP + 0.006); S.lying = false; S.spDrag = true; },      // 从桌上拿起来：小勺不碰桌面
        onDrag: (p) => { S.sp.set(clamp(p.x, -0.24, 0.12), clamp(p.y + 0.03, CUP + 0.006, 0.26), 0); },      // 前后（z）由下面每帧慢慢挪过来，不跳
        onEnd: () => { S.spDrag = false; if (inJar()) A.seat(); else A.home(); } },
      { obj: clampPick, plane: 'xy', offset: 0, hint: () => (S.clamp ? '点一下：打开弹簧夹' : '点一下：夹紧弹簧夹'), onTap: () => A.clamp(), onStart: () => {}, onDrag: () => {}, onEnd: () => {} },
      { obj: lampPick, plane: 'xy', offset: 0, hint: () => (S.lit ? '点一下：盖上灯帽，熄灭酒精灯' : '点一下：点燃酒精灯'), onTap: () => A.lamp(), onStart: () => {}, onDrag: () => {}, onEnd: () => {} },
      { obj: bottlePick, plane: 'xy', offset: 0, hint: '点一下：往燃烧匙里放一勺红磷', onTap: () => A.scoop(), onStart: () => {}, onDrag: () => {}, onEnd: () => {} },
    ], { tip: tag('', 'pill') });
    const pointer = {
      down: (r, e) => { if (bar.playing) { bar.stop(); return true; } return drag.down(r, e); },
      move: (r, e) => drag.move(r, e),
      up: (r, e) => drag.up(r, e),
      items: drag.items,
    };
    const act = demoActs(drag, group);
    // 演示：沿折线拖过去（先抬起来、再平移、再放下——直线会从集气瓶的瓶壁上穿过去）。release > 1：这个镜头里不松手
    const carry = (obj, pts, o = {}) => act.path(obj, pts, { release: (o.t1 ?? 0.5) + 0.02, ...o });      // 沿几个点拿过去（kit/chemlesson.js 的 act.path；这一课默认走到就松手）
    const SPP = (x, y, z = 0) => new THREE.Vector3(x, y - 0.03, z);              // 燃烧匙的塞子要到 (x, y)：拖动时手的位置（onDrag 里加了 0.03）
    const SP_FLAME = SPP(LAMP.x + 0.004, FLAME_Y + CUP - 0.004), SP_SEAT = SPP(0, SEAT);

    // ================= 底部步骤栏 + 老师的演示（独立的一套器材） =================
    let saved = null;
    const bar = lessonBar({
      look, back, group,         // group：提示光圈画在这一组里
      steps: [
        { id: 'clamp', title: '夹紧弹簧夹', todo: '先用<b>弹簧夹</b>夹紧乳胶管（点一下弹簧夹）。', target: () => (S.clamp ? null : clampG) },
        { id: 'load', title: '放足量红磷', todo: '点一下<b>红磷</b>试剂瓶，往燃烧匙里放足量的红磷。', target: () => bottle },
        { id: 'light', title: '点燃红磷', todo: '点燃<b>酒精灯</b>，拿起燃烧匙，伸到火焰上点燃红磷。', target: () => (!S.lit ? lamp : S.lying ? spoon : null) },
        { id: 'insert', title: '立即伸入、塞紧', todo: '点着了就<b>立即</b>把燃烧匙伸进集气瓶，塞紧橡胶塞。', target: () => (S.burning && !S.seated ? jar : null) },
        { id: 'cool', title: '等它冷却', todo: '看瓶里的氧气读数和蓝点。等红磷熄灭、瓶子冷却到室温（等待的时间压缩了）。' },
        { id: 'open', title: '打开弹簧夹', todo: '冷却到室温了：点一下<b>弹簧夹</b>，打开它。', target: () => (S.T < T0 + 3 ? clampG : null) },
        { id: 'read', title: '读刻度', todo: '水进到了第几格？在左边填上你的读数。' },
        { id: 'why', title: '想一想', todo: '空气里的氧气大约占多少？在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          onStart: () => { if (!saved) saved = S; S = fresh(); S.demo = true; snapSp = true; snapCap(); bubs.clear(); smokeOut.clear(); mw.close(); },
          onEnd: () => { mw.close(); if (!saved) return; S = saved; saved = null; S.near = false; snapSp = true; snapCap(); bubs.clear(); smokeOut.clear(); bar.say('演示看完了。桌上的器材和记录还是你自己的那一套——接着往下做。', bar.current || 'end'); setTimeout(() => bar.say(null), 4000); },
          shots: [
            { cap: '集气瓶里加了少量水，水面上方分成 5 等份。蓝点是瓶里的氧气——大约每 5 个点里有 1 个。', dur: 4.0, cam: [[0, 0.07, 0], [0.2, 0.15, 1], 0.34] },
            { cap: '用弹簧夹夹紧乳胶管。', dur: 2.4, cam: [[0.1, 0.16, 0], [0.1, 0.35, 1], 0.3], during: act.tap(clampPick, 0.25) },
            // 药匙取两勺红磷倒进燃烧匙；点燃酒精灯；拿起燃烧匙，抬过试剂瓶，伸到火焰上
            { cap: '燃烧匙里放足量的红磷，在酒精灯上点燃。', dur: 9.0, cam: [[-0.09, 0.07, 0.04], [0.1, 0.25, 1], 0.44],
              during: act.seq(
                act.tap(bottlePick, 0.03), act.tap(bottlePick, 0.25),
                act.tap(lampPick, 0.5),
                carry(spoonPick, [() => S.sp.clone().sub(new THREE.Vector3(0, 0.03, 0)), SPP(SP_HOME.x, 0.2, SP_HOME.z), SPP(LAMP.x + 0.004, 0.2), SP_FLAME], { t0: 0.54, t1: 0.78, release: 2 })) },
            // 抬起来、移到瓶口正上方，再竖直伸下去、塞紧
            { cap: '点着以后立即伸入瓶中，塞紧橡胶塞。', dur: 2.2, cam: [[-0.04, 0.1, 0], [0.1, 0.25, 1], 0.42],
              during: carry(spoonPick, [() => S.sp.clone().sub(new THREE.Vector3(0, 0.03, 0)), SPP(LAMP.x + 0.004, 0.215), SPP(0, 0.215), SP_SEAT], { t0: 0.04, t1: 0.72, release: 0.75 }) },
            { cap: '钻进红磷表面看：O₂ 分子落到红磷上，和磷原子结合成 P₂O₅（白烟）；N₂ 撞上去不反应，又弹开了。瓶里的 O₂ 越来越少。', dur: 11, cam: [[0, 0.1, 0], [0.06, 0.2, 1], 0.3], during: act.at(0.02, () => openMicro(true)) },
            { cap: '氧气降到 8% 左右，红磷就熄灭了。等瓶子冷却到室温……', enter: () => mw.close(), dur: 3.4, cam: [[0, 0.07, 0], [0.15, 0.2, 1], 0.36], speed: 2.5 },
            { cap: '冷却后打开弹簧夹：烧杯里的水被压进集气瓶。', dur: 3.6, cam: [[0.04, 0.08, 0], [0.1, 0.2, 1], 0.46], during: act.tap(clampPick, 0.08) },
            { cap: '水进到了接近第 1 格：被消耗掉的氧气，约占瓶内空气的 1/5。演示完了，下面换你自己做。', dur: 4.0, cam: [[0, 0.04, 0], [0.1, 0.08, 1], 0.3] },
          ],
        },
      },
    });

    // ================= 药匙取红磷 =================
    // 一勺 1.9 秒：拧开瓶盖放到一边 → 药匙伸进试剂瓶 → 取出来 → 移到燃烧匙上方 → 一翻，红磷落进燃烧匙 → 放回去、盖上瓶盖
    const SCOOP_T = 1.9, TIP_T = 1.3;
    const capAside = new THREE.Vector3(-0.03, 0.004 - CAP_Y, -0.02);           // 瓶盖翻过来放在瓶子左后方的桌上（相对原来的位置）
    const scoopStep = (h) => {
      if (!S.scoopA && S.scoopQ > 0) S.scoopA = { t: 0, poured: false };
      const a = S.scoopA, t = a ? a.t : 0;
      if (a) { a.t += h; if (!a.poured && a.t > TIP_T) { a.poured = true; S.scoopQ = Math.max(0, S.scoopQ - 1); } if (a.t > SCOOP_T) S.scoopA = null; }
      // 瓶盖：0–0.3 s 拿起来放到一边，1.55–1.9 s 盖回去
      const ck = a ? smooth(t / 0.3) * (1 - smooth((t - 1.55) / 0.35)) : 0;
      bCap.position.set(capAside.x * ck, CAP_Y + capAside.y * ck + Math.sin(Math.PI * ck) * 0.02, capAside.z * ck);
      bCap.rotation.x = Math.PI * ck;
      // 药匙：关键帧 [时刻, 勺头位置, 翻转, 朝向, 柄抬起的角度]
      // 来回都先抬到 7.5 cm 高再平移（不从试剂瓶、燃烧匙的杆上穿过去）
      const c = cupPos(), mouthUp = BOTTLE.clone().setY(0.078), inBottle = BOTTLE.clone().setY(0.024), overCup = c.clone().add(new THREE.Vector3(0.002, 0.014, 0.004));
      const homeUp = SPAT_HOME.clone().setY(0.075), cupUp = overCup.clone().setY(Math.max(0.075, overCup.y)), Q = -Math.PI / 2;
      const K = [
        [0, SPAT_HOME, 0, -0.3, 0], [0.18, homeUp, 0, Q, 0.6], [0.35, mouthUp, 0, Q, 1.15], [0.6, inBottle, 0, Q, 1.15], [0.82, mouthUp, 0, Q, 1.15],
        [1.1, overCup, 0, Q, 0.2], [1.38, overCup, 1.6, Q, 0.2], [1.55, cupUp, 0, Q, 0.2], [1.75, homeUp, 0, -0.3, 0.1], [SCOOP_T, SPAT_HOME, 0, -0.3, 0],
      ];
      let i = 1; while (i < K.length - 1 && K[i][0] < t) i++;
      const A0 = a ? K[i - 1] : K[0], A1 = a ? K[i] : K[0], e = a ? smooth((t - A0[0]) / (A1[0] - A0[0])) : 0;
      spat.position.lerpVectors(A0[1], A1[1], e);
      spat.rotation.set(A0[2] + (A1[2] - A0[2]) * e, A0[3] + (A1[3] - A0[3]) * e, A0[4] + (A1[4] - A0[4]) * e);
      spat.heap.visible = !!a && t > 0.55 && t < TIP_T;
    };

    // ================= 每帧 =================
    const tmp = new THREE.Vector3(), m4 = new THREE.Matrix4();
    const step = (h, t) => {
      // 燃烧匙的位置（按钮“立即伸入”：用约 0.6 秒送进瓶里——真人再快也要这么一会儿，瓶口敞着时会跑掉一点受热的空气）
      if (S.auto) { S.auto.t += h / 0.6; const k = Math.min(1, S.auto.t); S.sp.lerpVectors(S.auto.from, new THREE.Vector3(0, SEAT, 0), k * k * (3 - 2 * k)); if (k >= 1) { S.auto = null; A.seat(); } }
      // 拿着的时候跟手；松手以后（放回桌上、塞进瓶口）滑过去、慢慢斜靠下来
      const follow = snapSp || S.spDrag || S.auto ? 1 : 0.22;
      const z0 = spoon.position.z; spoon.position.lerp(S.sp, follow); spoon.position.z = z0 + (S.sp.z - z0) * (snapSp ? 1 : 0.2); spoon.rotation.set(0, 0, spoon.rotation.z + ((S.lying ? LEAN : 0) - spoon.rotation.z) * (snapSp ? 1 : 0.2));
      snapSp = false;
      spoon.updateMatrixWorld(true); rebuildHose();
      // 弹簧夹：两片夹子慢慢合上 / 张开（点一下也看得见夹的动作）
      jawA.position.y += ((S.clamp ? 0.0042 : 0.007) - jawA.position.y) * 0.25; jawB.position.y = -jawA.position.y;
      scoopStep(h);
      flameOn = capper.update(h, S.lit);        // 灯帽：点燃前取下放到桌上；熄灭时盖上，再轻提一下、重新盖好
      lamp.flame.setOn(flameOn); lamp.flame.update(t);
      if (S.toFlame && flameOn) { S.toFlame = false; S.lying = false; S.sp.set(LAMP.x + 0.004, FLAME_Y + CUP - 0.004, 0); }
      const c = cupPos();
      // 在酒精灯火焰上点燃红磷（火焰真的亮着才行）
      const inFlame = flameOn && !S.lying && Math.abs(c.x - LAMP.x) < 0.016 && Math.abs(c.y - FLAME_Y) < 0.025 && Math.abs(c.z - LAMP.z) < 0.02;
      if (inFlame && S.amount > 0 && !S.burning) { S.inFlameT += h; if (S.inFlameT > 0.6) { S.burning = true; sfx.whoosh(); done('light'); status('红磷<b>燃烧</b>起来了，发出黄白色的火焰和大量白烟。<b>立即</b>把燃烧匙伸进集气瓶，塞紧橡胶塞！'); } }
      if (!inFlame) S.inFlameT = 0;
      // 瓶口敞着、燃烧匙已经伸进去了（还没塞紧）：计时
      const open = !S.seated, inside = inJar();
      if (S.burning && inside && open) S.openT += h;
      // 燃烧：在瓶里（敞口或塞紧）消耗瓶里的氧气；在瓶外只是慢慢烧掉红磷
      const xO = S.nO / (S.nO + S.nN);
      if (S.burning) {
        if (inside) {
          const burnK = clamp((xO - O2_OUT) / 0.05, 0, 1);
          const use = Math.min(0.035 * Math.max(0.2, burnK) * h, S.amount * SCOOP - (S.used || 0));
          S.nO = Math.max(0, S.nO - use); S.used = (S.used || 0) + use;
          S.fog = Math.min(1.2, S.fog + use * 9);
          S.T += (T0 + 110 - S.T) * Math.min(1, h * 0.5);      // 燃烧放热：瓶里的气体几秒内热起来（传感器实验里压强先陡升）
          if (xO <= O2_OUT + 0.002 || S.used >= S.amount * SCOOP - 1e-4) { S.burning = false; S.burnOut = true; S.amount = 0; S.used = 0; if (S.seated) status('氧气降到 8% 左右，<b>红磷熄灭</b>了。白烟慢慢溶进水里。等瓶子冷却到室温……'); }
        } else { S.used = (S.used || 0) + 0.006 * h; if (S.used >= S.amount * SCOOP) { S.burning = false; S.amount = 0; S.used = 0; status('红磷在外面烧完了。点着以后要<b>立即</b>伸进瓶里。'); } }
      }
      if (!S.burning || !inside) S.T += (T0 - S.T) * Math.min(1, h / 4.5);
      S.fog *= Math.exp(-h / 7);
      // 气体：敞口时压强一直等于外面（受热跑出去、变凉吸进空气）；塞紧以后看弹簧夹和漏气
      const p = pres();
      if (open) {
        const want = (gasV() * K0) / (S.T + 273), n = S.nO + S.nN;
        if (want < n) { const k = want / n; S.nO *= k; S.nN *= k; } else if (!inside) { S.nO += (want - n) * 0.21; S.nN += (want - n) * 0.79; }
        if (!inside && !S.burning) { const mix = Math.min(1, h * 0.4), tot = S.nO + S.nN; S.nO += (0.21 * tot - S.nO) * mix; S.nN += (0.79 * tot - S.nN) * mix; }    // 敞口放着：和外面的空气慢慢混匀
      } else {
        const path = !S.clamp;       // 导管通着
        if (path && p > 1.0005) { const out = Math.min((p - 1) * 2.2 * h, 0.2) * (S.nO + S.nN); const k = 1 - out / (S.nO + S.nN); S.nO *= k; S.nN *= k; S.bacc = (S.bacc || 0) + out * 900; }
        if (path && p < 0.9995) { S.f = Math.min(0.9, S.f + (1 - p) * 1.4 * h); S.flowT = 0.6; }
        if (S.leak) { const dn = (1 - p) * 0.05 * h * (S.nO + S.nN); if (dn > 0) { S.nO += dn * 0.21; S.nN += dn * 0.79; } else { const k = 1 + dn / (S.nO + S.nN); S.nO *= k; S.nN *= k; } }
      }
      while ((S.bacc || 0) > 1) { S.bacc -= 1; bubs.spawn({ p: new THREE.Vector3(BK.x + (Math.random() - 0.5) * 0.003, 0.014, 0), v: new THREE.Vector3(0, 0.05, 0), size: 0.0016 + Math.random() * 0.001, life: 2 }); }
      bubs.update(h, (q, d) => { q.v.y += 0.25 * d; q.p.addScaledVector(q.v, d); return q.p.y < 0.06; });
      // 水
      const wy = levelOf(S.f); setJarWater(wy);
      bk.setLevel(Math.max(0.02, 0.06 - (S.f * SPACE) / (Math.PI * 0.0348 ** 2)));
      fog.position.y = wy; fog.scale.y = Math.max(0.001, (S.seated ? SEAT : MOUTH) - wy); fog.material.opacity = Math.min(0.55, S.fog * 0.5);
      // 导管里流动的水
      if (S.flowT > 0) S.flowT -= h;
      const nd = S.flowT > 0 ? 14 : 0; drops.count = nd;
      for (let i = 0; i < nd; i++) { const u = ((t * 0.9 + i / nd) % 1); drops.setMatrixAt(i, m4.makeTranslation(flowPath.getPointAt(u))); }
      if (nd) drops.instanceMatrix.needsUpdate = true;
      // 红磷的火焰、白烟
      const shownAmt = Math.max(0, S.amount - S.scoopQ);      // 药匙还没倒进来的那一勺不算
      heap.visible = shownAmt > 0 || S.burning; heap.scale.set(0.7 + 0.25 * Math.min(shownAmt, 3), 0.55, 0.7 + 0.25 * Math.min(shownAmt, 3));
      const fk = S.burning ? (inside ? clamp((xO - O2_OUT) / 0.06, 0.25, 1) : 1) : 0;
      pFlame.setOn(S.burning); pFlame.setSize(fk); pFlame.update(t);
      smokeOut.update(h, { rate: S.burning && !inside ? 30 : 0, origin: c.clone().add(new THREE.Vector3(0, 0.006, 0)), spread: 0.006, up: 0.05, size: 0.016 });
      // 气体小点：个数跟着 n 变（氧气被消耗 → 蓝点消失；跑出去 → 两种都少；漏进来 → 两种都多）
      const wantO = Math.round(N_DOTS * S.nO), wantN = Math.round(N_DOTS * S.nN);
      const dots = S.dots, cnt = (k) => dots.filter((d) => d.kind === k).length;
      let o = cnt('O'), n = cnt('N');
      while (o > wantO) { const i = dots.findIndex((d) => d.kind === 'O'); dots.splice(i, 1); o--; }
      while (n > wantN) { const i = dots.findIndex((d) => d.kind === 'N'); dots.splice(i, 1); n--; }
      while (o < wantO) { dots.push(newDot('O')); o++; }
      while (n < wantN) { dots.push(newDot('N')); n++; }
      const top = (S.seated ? SEAT : BODY) - 0.004, span = top - wy - 0.004;
      for (const d of dots) {
        const y = wy + 0.004 + ((d.v + Math.sin(t * 0.7 + d.ph) * 0.03 + 1) % 1) * span;
        const rr = (rAt(y) - 0.003) * d.u, a = d.th + Math.sin(t * 0.5 + d.ph) * 0.15;
        d.p.set(Math.cos(a) * rr, y, Math.sin(a) * rr);
      }
      blueP.list = dots.filter((d) => d.kind === 'O'); grayP.list = dots.filter((d) => d.kind === 'N');
      blueP.update(0, () => true); grayP.update(0, () => true);      // 位置上面已经算好了，只把它们写进缓冲区
      // 进度
      if (W && !S.demo) progress(h);
      bar.near(S.near);
      cards(c);
    };

    // 记录、读数、进度
    const progress = (h) => {
      if (S.wasSealedBurn && !S.burning && S.T < T0 + 3 && !bar.has('cool')) { bar.done('cool'); far(); status('瓶子冷却到室温了。现在打开<b>弹簧夹</b>。'); }
      // 打开以后水停下来（或者没冷却就打开、刚涌进去的那一下停住）：请学生读刻度
      // 没夹弹簧夹：没有“打开”这一步，水在冷却时自己就进去了——冷下来以后同样请学生读
      if (S.runFlags.unclamped && S.wasSealedBurn && !S.burning && S.T < T0 + 3 && !S.opened) { S.opened = true; bar.done('open'); }
      if (S.opened && S.wasSealedBurn && !S.readings) {
        S.settleT = S.flowT > 0 && (pres() < 0.985) ? 0 : S.settleT + h;
        if (S.settleT > 0.8 && W.readBox.hidden) { W.readBox.hidden = false; W.readIn.value = ''; near(new THREE.Vector3(0, 0.05, 0), [0.25, 0.06, 1], 0.24); status('水进到了第几格？凑近看瓶身上的刻度，在下面填你的读数（可以估到 0.1 格）。'); }
      }
      if (S.readings && S.early && !S.readings.final && S.T < T0 + 1.5 && pres() > 0.996) {
        S.readings.final = S.f * 5;
        W.tbl.add(['（同一瓶，等冷却以后）', `约 ${S.readings.final.toFixed(1)} 格`, '水又继续进去了一些']);
        status(`等瓶子冷却下来，水又继续进去了一些，最后到了约 <b>${S.readings.final.toFixed(1)} 格</b>。所以“没冷却就打开”，是刚打开时读到的偏少。`);
      }
    };
    const record = (val) => {
      const act = S.f * 5, F = S.runFlags;
      if (Math.abs(val - act) > 0.2) return status(`再看看刻度：水面在第 ${Math.floor(act)} 格和第 ${Math.floor(act) + 1} 格之间，${act % 1 < 0.5 ? '靠近下面那道线' : '靠近上面那道线'}。`);
      S.readings = { first: act };
      const how = [!S.wasSealedBurn ? '红磷没在瓶里燃烧' : '', F.unclamped ? '弹簧夹没夹紧' : '', F.little ? '红磷太少' : '', F.slow ? '燃烧匙伸入太慢' : '', S.leak ? '塞子漏气' : '', F.early ? '没冷却就打开' : ''].filter(Boolean);
      const cmp = act > 1.1 ? '<b>偏多</b>' : act >= 0.92 ? '约 1/5' : act >= 0.65 ? '略少于 1/5' : '<b>偏少</b>';
      runs++;
      W.tbl.add([how.length ? how.join('、') : '正确操作', `约 ${val.toFixed(1)} 格（${Math.round(act * 20)}%）`, cmp]);
      W.readBox.hidden = true; bar.done('read'); far();
      const why = F.unclamped ? '弹簧夹没夹紧：燃烧时受热的气体从导管跑进了烧杯（你看到烧杯里冒气泡了吧），瓶里的气体少了，进的水就多。'
        : F.slow ? '伸得慢：塞紧之前，瓶里的空气受热膨胀，从瓶口跑掉了一些，进的水就多。'
          : F.little ? '红磷太少：烧完了，瓶里的氧气还没用到头，进的水就少。'
            : S.leak ? '塞子漏气：冷却的时候，外面的空气钻进了瓶里，进的水就少。'
              : F.early ? '还没冷却就打开：瓶里的气体还热、还胀着，刚打开时进的水少。等一会儿看看。'
                : '操作都对。你会发现水进到了接近 1 格、略少一点——看看卡片上的氧气读数：红磷熄灭的时候，瓶里还剩约 8% 的氧气。';
      status(`记下了：约 <b>${val.toFixed(1)} 格</b>。${why}`);
      if (!bar.has('why') && !how.length) W.ask();
      else if (!bar.has('why')) bar.say('这次的做法和课本不一样。点左边“更多”里的<b>再做一次</b>，按课本的步骤做一遍，再想一想。');
    };

    // 卡片
    let lastJ = '', lastS = '';
    const cards = (c) => {
      const pct = o2pct(), T = Math.round(S.T);
      const k = Math.max(0.03, Math.min(1, pct / 21));
      const pTxt = S.seated ? (pres() > 1.01 ? '比外面大' : pres() < 0.99 ? '比外面小' : '和外面一样') : '瓶口敞着';
      const jhtml = `<div class="cc"><div class="cc-t"><span class="cc-name">瓶里的空气</span></div><div class="cc-more"><div class="cc-obs"><span class="o2-read"><i style="width:${(k * 100).toFixed(0)}%"></i></span><b class="o2-num">${pct.toFixed(1)}%</b><small>氧气</small></div><div class="cc-obs"><span class="cc-th"><i style="height:${Math.max(4, Math.min(100, (T / 100) * 100)).toFixed(0)}%"></i></span><b>${T}</b><small>℃</small><span class="cc-air ${S.seated ? '' : 'on'}">压强${pTxt}</span></div></div></div>`;
      if (jhtml !== lastJ) { lastJ = jhtml; jarCard.text(jhtml); }
      jarCard.loc(group, -R, 0.09, 0).show(true);
      const amt = S.amount >= 2 ? `足量（${S.amount} 勺）` : S.amount === 1 ? '一小勺' : S.burnOut ? '烧完了' : '空的';
      const st = S.burning ? '<span class="cc-res burn">燃烧</span>' : S.burnOut ? '<span class="cc-res">熄灭了</span>' : '';
      const shtml = `<div class="cc"><div class="cc-t"><span class="cc-name">燃烧匙里的红磷</span>${st}</div><div class="cc-more"><div class="cc-obs">${amt}</div></div></div>`;
      if (shtml !== lastS) { lastS = shtml; spCard.text(shtml); }
      spCard.loc(group, c.x, c.y, c.z).show(!S.seated || S.burning);
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.46, d: 0.2, h: 0.2 },
      view: { elev: 22, azim: -4, lookY: 0.45, frameMargin: 1.04 },
      mount(ui) {
        ui.el.classList.add('xuean');
        // 读刻度
        const readIn = h('input', { class: 'read-in', type: 'number', step: '0.1', min: '0', max: '5', placeholder: '例如 0.9' });
        const readBtn = h('button', { class: 'go', onclick: () => { const v = parseFloat(readIn.value); if (!Number.isFinite(v)) return status('先填一个数，例如 0.9。'); record(v); } }, '记下来');
        const readBox = h('div', { class: 'think', hidden: true }, h('div', { class: 'think-t' }, '读一读'), h('p', { class: 'think-q' }, '水进到了第几格？'), h('div', { class: 'read-row' }, '约', readIn, '格', readBtn));
        // 想一想
        const q1 = buttons(['约 1/5', '约 4/5', '约 1/2'].map((t, j) => ({ text: t, ghost: true, onClick: () => {
          if (j === 1) return status('4/5 是剩下的气体（主要是氮气）——它没有被红磷消耗，水也就进不到那里。');
          if (j === 2) return status('看你的读数：水只进到了 1 格左右，5 格里的 1 格。');
          q1.el.hidden = true; q2.hidden = false; status('对：进去的水约占 1/5，说明被消耗的氧气约占瓶内空气的 <b>1/5</b>。');
        } })));
        q1.el.dataset.keep = '1';
        const q2b = buttons(['红磷熄灭时，瓶里还剩一些氧气', '有一部分氮气也被消耗了', '瓶里加的水太少'].map((t, j) => ({ text: t, ghost: true, onClick: () => {
          if (j === 1) return status('氮气不和红磷反应——看灰点，一个也没少。');
          if (j === 2) return status('瓶底的水只是用来吸收热量和白烟，不影响进水的多少。');
          q.hidden = true; next.hidden = false; bar.done('why');
          status('对。卡片上的氧气读数没有降到 0，而是停在 8% 左右——这时红磷就烧不下去了（用氧气传感器真的能测到）。所以实验结果常常略少于 1/5。可以掀开结论看看。');
        } })));
        q2b.el.dataset.keep = '1';
        const q2 = h('div', { hidden: true }, h('p', { class: 'think-q' }, '可是你的读数比 1 格略少一点。为什么？'), q2b.el);
        const q = h('div', { class: 'think', hidden: true }, h('div', { class: 'think-t' }, '想一想'), h('p', { class: 'think-q' }, '这说明空气中的氧气，大约占空气体积的——'), q1.el, q2);
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const ask = () => { q.hidden = false; q1.el.hidden = false; q2.hidden = true; status('读数记下了。回答下面的问题。'); };
        const tbl = table(['做法', '进水', '和 1/5 比']);
        const leakSeg = seg('', ['塞子塞得紧', '塞子塞不紧（漏气）'], (_, k) => { S.leak = !!k; status(k ? '这一瓶的塞子塞不紧：冷却的时候外面的空气会钻进去。' : '塞子塞紧了。'); });
        const vary = h('details', { class: 'more' }, h('summary', {}, '换个条件再试'),
          h('p', { class: 'fineprint' }, '先“再做一次”，再故意换一种做法，看进水偏多还是偏少：不夹弹簧夹；只放一小勺红磷；点燃后慢慢伸进去；没冷却就打开弹簧夹；或者让塞子漏气——'), leakSeg.el);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'),
          buttons([
            { text: '夹紧 / 打开弹簧夹', ghost: true, onClick: () => A.clamp() },
            { text: '放一勺红磷', ghost: true, onClick: () => A.scoop() },
            { text: '点燃酒精灯', ghost: true, onClick: () => { if (!S.lit) A.lamp(); } },
            { text: '在火焰上点燃红磷', ghost: true, onClick: () => { if (!S.lit) A.lamp(); S.toFlame = true; } },      // 灯帽拿开、火焰亮了再把燃烧匙伸过去
            { text: '立即伸入瓶中、塞紧', ghost: true, onClick: () => { S.lying = false; S.auto = { from: S.sp.clone(), t: 0 }; } },
          ]).el,
          buttons([{ text: '再做一次（保留记录）', ghost: true, onClick: () => A.again() }, { text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const safe = h('p', { class: 'fineprint warn', html: '红磷燃烧产生大量白烟（五氧化二磷），注意通风。燃烧匙很烫，点燃后伸入瓶中时不要碰到瓶壁。' });
        ui.controls.append(readBox, q, next, vary, more, safe);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, q, next, readBox, readIn, leakSeg, ask, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('集气瓶里的蓝点是氧气，灰点是其余的气体（主要是氮气）。可以先看<b>老师演示</b>，也可以直接动手。');
      },
      update(dt, t) {
        const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t);
        mw.set(mwState()); mw.update(Math.min(dt, 1 / 30) * Math.min(k, 1.5));
        const p = cupPos(); goBtn.loc(group, p.x, p.y + 0.02, p.z).show((S.amount > 0 || S.burning) && !S.lying && !mw.isOpen && !bar.playing);
      },
      dispose() { mw.dispose(); bar.dispose(); bubs.dispose(); smokeOut.dispose(); blueP.dispose(); grayP.dispose(); },
      debug: { get S() { return S; }, A, bar, MARKS, levelOf, clampG, picks: { spoon: spoonPick, clamp: clampPick, lamp: lampPick, bottle: bottlePick },
        qa: qaFlow(drag, [
          { name: '夹紧弹簧夹', tap: clampPick },
          { name: '放一勺红磷', tap: bottlePick, wait: 2.2 },
          { name: '再放一勺', tap: bottlePick, wait: 2.2 },
          { name: '点燃酒精灯', tap: lampPick },
          { name: '拿起燃烧匙', hold: spoonPick },
          { name: '伸到火焰上点燃红磷', run: () => drag.items()[0].onDrag(SP_FLAME.clone()), wait: 1.5 },
          { name: '移到瓶口上方，伸进瓶里，塞紧', run: () => { const d = drag.items()[0]; d.onDrag(SPP(0, 0.215)); d.onDrag(SP_SEAT.clone()); S.sp.z = 0; spoon.position.copy(S.sp); spoon.updateMatrixWorld(true); d.onEnd(true); window.__qaHeld = false; }, wait: 2 },
          { name: '等它冷却', run: () => {}, wait: 22 },
          { name: '打开弹簧夹', tap: clampPick, wait: 5 },
          { name: '读刻度', run: () => { W.readIn.value = (S.f * 5).toFixed(1); W.readBox.querySelector('button').click(); } },
          { name: '想一想 1', run: () => W.q.querySelectorAll('button')[0].click() },
          { name: '想一想 2', run: () => W.q.querySelectorAll('button')[3].click() },
        ]) },
    };
  },
};
