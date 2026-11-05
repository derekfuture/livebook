// 课题1 水资源及其利用 · 实验 4-3 制取蒸馏水（课本上册第 89 页图 4-14）。
//
// 烧瓶里加自来水和几粒沸石，放在铁架台的陶土网上，用酒精灯加热；水蒸气经导管进入浸在冷水里的试管，冷凝成蒸馏水。
// 课本：加沸石防暴沸；不要沸腾得太剧烈；弃去开始馏出的部分液体；收集约 10 mL 蒸馏水后停止加热。
// 顺序照课本：烧瓶里已经加了自来水，带导管的塞子还拔着；用药匙往瓶口里加几粒沸石（看得见沸石落进去），再塞紧塞子、连接好装置，然后加热。
// 酒精灯有灯帽（kit/labops.js 的 lampCap）：点燃前取下放在桌上，用完用灯帽盖灭，再轻提一下、重新盖好。
// 看不见的东西：自来水里溶着的可溶性钙、镁化合物等杂质（橙色小点）——加热时只有水变成水蒸气（淡蓝点）跑出去，杂质留在烧瓶里，
//   越来越浓；试管里的蒸馏水里没有杂质点。不加沸石：暴沸，液体直接冲进导管、流进试管，蒸馏水就不纯了。
// 模型：烧瓶里约 60 mL 自来水；加热升温约 2 ℃/s 到 100 ℃，沸腾后约 0.5 mL/s 馏出（画面时间）。
import * as THREE from 'three';
import { buttons, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { stand, textPlate, canvasTex } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { testTube, glassTube, chemLamp, chemBeaker, stopper, labJack, glassMat, spatula, CHEM } from './kit/chem.js';
import { water2, bubble2 } from './kit/chemfx.js';
import { micro, distillScene } from './kit/microworld.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { lampCap } from './kit/labops.js';
import { sfx } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const ST = new THREE.Vector3(-0.1, 0, 0), FL_Y = 0.132, FL_R = 0.03;        // 陶土网高 0.1：酒精灯外焰正好顶到网下
const TT = new THREE.Vector3(0.07, 0.04, 0), TT_R = 0.008, TT_LEN = 0.11;
const CHIPS_HOME = new THREE.Vector3(-0.17, 0, 0.07), V0 = 60;
const LIFT = 0.04;                           // 塞子（连着导管）拔开时提起来多高
const SPAT_HOME = new THREE.Vector3(-0.135, 0.0043, 0.065);    // 药匙：平放在沸石碟子右边的桌上（柄朝右）
const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const BLUE = 0x8fc6e8, IMP = 0xe08a3a;

export default {
  id: 'distill',
  fig: '图4-14',
  title: '制取蒸馏水',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '加热自来水、把水蒸气冷凝下来，得到的蒸馏水和原来的自来水比——',
    hint: '课本第 89 页实验 4-3。溶在水里的钙、镁化合物会不会跟着水蒸气跑出去？',
    options: ['更纯：溶解的杂质留在烧瓶里', '一样：杂质也跟着蒸出来了', '更脏'],
    answer: 0,
  },
  need: '烧瓶里加自来水和沸石，加热，弃去开始馏出的部分液体，收集约 10 mL 蒸馏水后停止加热',
  conclusion: {
    crops: [{ page: 95, rect: [175, 160, 390, 435] }],
    quote: '实验室用的蒸馏水是净化程度较高的水，可以通过蒸馏自来水制取。',
    why: '加热时，水变成水蒸气离开烧瓶，到了冷的试管里又冷凝成水；溶解在自来水里的钙、镁化合物等杂质不会变成蒸气，<b>留在了烧瓶里</b>——所以蒸馏得到的水净化程度很高。<br>加沸石（或碎瓷片）是为了防止<b>暴沸</b>；开始馏出的液体可能带有装置里的杂质，要弃去。吸附、沉降、过滤只能除去难溶性杂质和部分可溶性杂质，蒸馏能除去溶解的杂质，净化程度最高。',
    src: '课本上册第 88–89 页 · 第四单元 课题1 水资源及其利用（实验 4-3）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); };      // 演示的字幕只写画面上正在发生的事（写在镜头里），不换成给学生的提示
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };

    paperSheet(group, { w: 0.34, d: 0.18, x: -0.02, z: 0.02 });

    // ================= 铁架台、陶土网、烧瓶、酒精灯 =================
    const st = stand({ height: 0.24, baseW: 0.1, baseD: 0.08 }); st.position.copy(ST); group.add(st);
    const FX = ST.x + st.rodX + 0.06;
    st.clamp(FL_Y - FL_R - 0.004, 0.06, { ring: true, r: 0.028 });
    const net = inked(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.0016, 0.06), paint(0xd8d4cc)), { width: 0.5 }); net.position.set(FX, FL_Y - FL_R - 0.002, 0); group.add(net);
    const flask = new THREE.Group(); flask.position.set(FX, FL_Y, 0); group.add(flask);
    const flaskGlass = new THREE.Mesh(new THREE.LatheGeometry([[0.0003, -FL_R], [0.016, -0.026], [0.026, -0.015], [FL_R, 0], [0.026, 0.015], [0.012, 0.028], [0.009, 0.032], [0.009, 0.06]].map(([r, y]) => new THREE.Vector2(r, y)), 36), glassMat({ opacity: 0.18 })); flaskGlass.renderOrder = 9; flask.add(flaskGlass);
    const cut = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    const fLiqM = water2({ color: 0xe4eef2, base: 0.35 }); fLiqM.clippingPlanes = [cut];
    const fLiq = new THREE.Mesh(new THREE.SphereGeometry(FL_R - 0.0012, 28, 20), fLiqM); fLiq.renderOrder = 7; flask.add(fLiq);
    // 带导管的塞子：塞子和导管是一件（head），拔开时一起提起来，塞紧时一起放下去
    const head = new THREE.Group(); group.add(head);
    const plug = stopper({ r1: 0.0088, r2: 0.0105, h: 0.014 }); plug.position.set(FX, FL_Y + 0.052, 0); head.add(plug);
    const plugPick = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.05, 10), new THREE.MeshBasicMaterial({ visible: false })); plugPick.position.set(FX, FL_Y + 0.07, 0); plugPick.userData.pick = true; head.add(plugPick);
    const chips = new THREE.Group(); flask.add(chips);
    for (let i = 0; i < 4; i++) { const c = inked(new THREE.Mesh(new THREE.DodecahedronGeometry(0.0025, 0), paint(0xe9e6df)), { width: 0.4 }); c.position.set((Math.random() - 0.5) * 0.02, -FL_R + 0.003, (Math.random() - 0.5) * 0.02); c.userData.end = c.position.clone(); chips.add(c); }
    chips.visible = false;
    const lamp = chemLamp(); lamp.scale.setScalar(0.85); lamp.position.set(FX, 0, 0); group.add(lamp);
    const lampPick = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.06, 10), new THREE.MeshBasicMaterial({ visible: false })); lampPick.position.y = 0.035; lampPick.userData.pick = true; lamp.add(lampPick);
    // 灯帽（课本第 18 页）：点燃前取下，放在灯的右前方桌上；熄灭时用灯帽盖灭，再轻提一下、重新盖好
    const capper = lampCap(group, lamp, { off: new THREE.Vector3(-0.015, 0, 0.05) });
    let flameOn = false;                    // 火焰真的亮着：灯帽拿开了才亮，盖上了才灭
    // ================= 导管、浸在冷水里的试管、升降台 =================
    const jack = labJack({ w: 0.07, d: 0.05, h: 0.024 }); jack.position.set(TT.x, 0, 0); group.add(jack);
    const cold = chemBeaker({ r: 0.022, h: 0.06, level: 0.045, color: CHEM.water, marks: false }); cold.position.set(TT.x, 0.024, 0); group.add(cold);
    const tubeG = glassTube([new THREE.Vector3(FX, FL_Y + 0.045, 0), new THREE.Vector3(FX, FL_Y + 0.075, 0), new THREE.Vector3(FX + 0.012, FL_Y + 0.086, 0), new THREE.Vector3(TT.x - 0.012, FL_Y + 0.086, 0), new THREE.Vector3(TT.x, FL_Y + 0.075, 0), new THREE.Vector3(TT.x, TT.y + 0.03, 0)], { r: 0.0018 }); head.add(tubeG);
    const tubes = [0, 1].map((k) => {
      const t = testTube({ r: TT_R, len: TT_LEN }); group.add(t);
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(TT_R - 0.0008, TT_R - 0.0008, 1, 18), water2({ color: 0xe4eef2, base: 0.4 })); liq.geometry.translate(0, 0.5, 0); liq.position.y = 0.0012; liq.scale.y = 0.0001; liq.renderOrder = 7.2; t.add(liq);
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, TT_LEN, 8), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = TT_LEN / 2; pick.userData.pick = true; t.add(pick);
      return Object.assign(t, { liq, pick });
    });
    const TUBE_REST = [new THREE.Vector3(0.15, 0.0095, 0.07), new THREE.Vector3(0.15, 0.0095, 0.09)];
    const potChips = new THREE.Group(); potChips.position.copy(CHIPS_HOME); group.add(potChips);
    { const dish = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.013, 0.006, 20), paint(0xf2eee4)), { width: 0.5 }); dish.position.y = 0.003; potChips.add(dish);
      for (let i = 0; i < 6; i++) { const c = inked(new THREE.Mesh(new THREE.DodecahedronGeometry(0.0025, 0), paint(0xe9e6df)), { width: 0.4 }); c.position.set((Math.random() - 0.5) * 0.016, 0.007, (Math.random() - 0.5) * 0.016); potChips.add(c); }
      const lab = textPlate('沸石', { w: 0.012, h: 0.007, color: '#23293a', bg: 'rgba(0,0,0,0)', font: 'bold 96px "Songti SC", serif' }); lab.rotation.x = -Math.PI / 2; lab.position.set(0, 0.0004, 0.022); potChips.add(lab); }
    const chipsPick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.014, 10), new THREE.MeshBasicMaterial({ visible: false })); chipsPick.position.y = 0.006; chipsPick.userData.pick = true; potChips.add(chipsPick);
    // 药匙：舀几粒沸石，伸到瓶口上方（拔开的塞子下面），一翻，沸石落进瓶里，再放回桌上
    const spat = spatula({ color: 0xe9e6df }); spat.rotation.order = 'YZX'; spat.heap.visible = false; group.add(spat);
    const spatChips = new THREE.Group(); spat.add(spatChips);
    for (let i = 0; i < 4; i++) { const c = inked(new THREE.Mesh(new THREE.DodecahedronGeometry(0.0022, 0), paint(0xe9e6df)), { width: 0.4 }); c.position.set((i % 2 - 0.5) * 0.004, 0.0012, (i < 2 ? -0.5 : 0.5) * 0.004); spatChips.add(c); }
    const SPAT_UP = new THREE.Vector3(-0.12, FL_Y + 0.083, 0.045), MOUTH = new THREE.Vector3(FX - 0.002, FL_Y + 0.071, 0);      // 勺头：先抬到瓶口前上方，再伸到瓶口正上方
    const SK = [      // [时刻 s, 勺头位置, 翻转, 柄抬起]
      [0, SPAT_HOME, 0, 0], [0.25, new THREE.Vector3(CHIPS_HOME.x, 0.035, CHIPS_HOME.z), 0, 0], [0.45, new THREE.Vector3(CHIPS_HOME.x, 0.0075, CHIPS_HOME.z), 0, 0.12],
      [0.65, new THREE.Vector3(CHIPS_HOME.x, 0.05, CHIPS_HOME.z), 0, 0], [1.1, SPAT_UP, 0, 0], [1.35, MOUTH, 0, 0], [1.6, MOUTH, 1.6, 0], [1.8, MOUTH, 0, 0],
      [2.05, SPAT_UP, 0, 0], [2.45, new THREE.Vector3(SPAT_HOME.x, 0.04, SPAT_HOME.z), 0, 0], [2.7, SPAT_HOME, 0, 0],
    ];
    const TIP = 1.5, CHIPS_END = 2.75;     // 翻到一半沸石开始落下；最后一粒落到瓶底
    const spatPose = (t) => {
      let i = 1; while (i < SK.length - 1 && SK[i][0] < t) i++;
      const a = SK[i - 1], b = SK[i], e = ease((t - a[0]) / (b[0] - a[0]));
      spat.position.lerpVectors(a[1], b[1], e); spat.rotation.set(a[2] + (b[2] - a[2]) * e, 0, a[3] + (b[3] - a[3]) * e);
      spatChips.visible = t > 0.45 && t < TIP;
    };
    // 沸石落进瓶里：从勺头经瓶口、瓶颈落进水里，沉到瓶底（烧瓶的局部坐标；一粒接一粒）
    const NECK = new THREE.Vector3(0, 0.026, 0), mouthL = MOUTH.clone().sub(new THREE.Vector3(FX, FL_Y, 0));
    const layChips = (t) => chips.children.forEach((c, i) => {
      const u = t == null ? 1 : clamp((t - TIP - i * 0.07) / 0.9, 0, 1);
      if (u < 0.45) c.position.lerpVectors(mouthL, NECK, (u / 0.45) ** 2); else c.position.lerpVectors(NECK, c.userData.end, (u - 0.45) / 0.55);
      c.visible = t == null || t >= TIP + i * 0.07;
    });
    // ================= 小点：杂质（橙）、水蒸气（淡蓝）、气泡、水滴 =================
    const dotTex = canvasTex(64, 64, (g, Wd) => { const gr = g.createRadialGradient(Wd / 2, Wd / 2, 0, Wd / 2, Wd / 2, Wd / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,1)'); gr.addColorStop(0.75, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, Wd, Wd); });
    const impP = new Particles({ max: 120, sprite: true, color: IMP }), vapP = new Particles({ max: 140, sprite: true, color: BLUE });
    for (const p of [impP, vapP]) { p.mat.uniforms.map.value = dotTex; p.mesh.renderOrder = 10; group.add(p.mesh); }
    const IMPN = 36, impDots = Array.from({ length: IMPN }, () => ({ u: Math.random(), th: Math.random() * 6.28, y: Math.random(), ph: Math.random() * 6, p: new THREE.Vector3(), size: 0.0062, alpha: 0.95 }));
    const bubs = new Particles({ max: 80, geometry: new THREE.SphereGeometry(1, 8, 6), material: bubble2({ color: 0x6f8797, white: 0.2 }) }); bubs.mesh.renderOrder = 9.8; group.add(bubs.mesh);
    const drops = new Particles({ max: 60, geometry: new THREE.SphereGeometry(1, 6, 5), material: water2({ color: 0xdfeef6, base: 0.6 }) }); group.add(drops.mesh);
    const cards = { fl: tag('', 'cond'), tt: tag('', 'cond') }; cards.fl.px = [-130, -40]; cards.tt.px = [70, -60];
    // 沿导管的路线（水蒸气走的路）
    const PATH = [new THREE.Vector3(FX, FL_Y + 0.02, 0), new THREE.Vector3(FX, FL_Y + 0.075, 0), new THREE.Vector3(FX + 0.012, FL_Y + 0.086, 0), new THREE.Vector3(TT.x - 0.012, FL_Y + 0.086, 0), new THREE.Vector3(TT.x, FL_Y + 0.075, 0), new THREE.Vector3(TT.x, TT.y + 0.03, 0)];
    const along = (u) => { const L = PATH.length - 1, f = clamp(u, 0, 0.999) * L, i = Math.floor(f); return PATH[i].clone().lerp(PATH[i + 1], f - i); };

    // ================= 状态 =================
    const fresh = () => ({ demo: false, chips: false, chipsA: null, plug: 'up', plugA: 0, lit: false, T: 20, V: V0, imp: 0, cur: 0, tv: [0, 0], timp: [0, 0], bump: 0, said: {}, tubeCarry: null, done10: false });      // plug：带导管的塞子（'up' 拔着 / 'in' 塞紧），plugA：塞上的程度
    S = fresh();

    // 微观次元：钻进烧瓶里看，水分子从液面飞出去成了水蒸气，钙、镁离子留下
    const mic = micro({ tag, look, back, group, scene: distillScene(), at: () => new THREE.Vector3(ST.x, FL_Y - 0.016, 0), label: '钻进烧瓶里看', state: () => ({ T: S.T, lit: flameOn }), bar: () => bar, btnAt: () => new THREE.Vector3(ST.x - 0.045, FL_Y, 0.02) });
    // 换一套器材（演示开始、结束，全部重来）时直接摆好：塞子、灯帽、药匙、沸石
    const snapAll = () => {
      S.plugA = S.plug === 'in' ? 1 : 0; head.position.y = LIFT * (1 - S.plugA);
      capper.snap(S.lit); flameOn = S.lit;
      spatPose(S.chipsA ? S.chipsA.t : 0); layChips(S.chipsA ? S.chipsA.t : null);
    };
    snapAll();
    const A = {
      /** 加沸石：瓶口要敞着——塞子塞着就先拔开，加好再塞回去；拔着的就一直拔着，等着塞紧、连接装置 */
      chipsTap() {
        if (S.chips || S.chipsA) return;
        if (S.T > 60) return status('烧瓶里的水已经很热了，不能再加沸石（会突然暴沸）。');
        S.chipsA = { t: 0, reseat: S.plug === 'in' }; S.plug = 'up';
      },
      plugTap() {
        if (S.plug === 'in' || S.chipsA) return;
        S.plug = 'in'; sfx.clink({ freq: 1500, gain: 0.03 }); done('plug');
        status('塞紧了带导管的塞子，连接好了装置。点一下<b>酒精灯</b>，开始加热。');
      },
      lampTap() {
        if (!S.lit) { S.lit = true; done('heat'); status(S.chips ? '取下灯帽，点燃酒精灯，加热烧瓶。' : '取下灯帽，点燃酒精灯，加热烧瓶——还没加沸石哦。'); }
        else { S.lit = false; if (S.tv[1] >= 9.5) { done('stop'); status('收集了约 10 mL 蒸馏水，<b>停止加热</b>：用灯帽盖灭了酒精灯。看看试管里的蒸馏水和烧瓶里剩下的水。'); if (!S.demo) W?.t1.open(); } else status('用灯帽盖灭了酒精灯。'); }
      },
      swapTap() {
        if (S.cur === 1) return;
        if (S.tv[0] < 1) return status('还没有馏出液体。等开始馏出以后，先接一点再换。');
        S.cur = 1; sfx.clink({ freq: 1500, gain: 0.03 }); done('discard');
        log(['开始馏出的部分液体', `约 ${S.tv[0].toFixed(1)} mL，弃去`, '可能带有装置里原来的杂质']);
        status('把开始馏出的那一点液体<b>弃去</b>，换上一支干净的试管，接着收集。');
      },
      reset() { S = fresh(); snapAll(); mic.close(); bubs.clear(); drops.clear(); vapP.clear(); W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; } bar.undo('chips', 'plug', 'heat', 'discard', 'collect', 'stop', 'why'); status('全部重新摆好了，记录也清空了。'); },
    };
    const lampOk = () => S.lit || (S.plug === 'in' && S.plugA > 0.99 && !S.chipsA);      // 装置连接好了才能点灯（停止加热随时可以）
    const drag = draggable(group, [], { taps: [
      { obj: chipsPick, hint: () => (S.chips || S.chipsA ? '' : '点一下：用药匙往烧瓶里加几粒沸石'), onTap: () => A.chipsTap() },
      { obj: plugPick, hint: () => (S.plug === 'up' && !S.chipsA ? '点一下：塞紧带导管的塞子，连接好装置' : ''), onTap: () => A.plugTap() },
      { obj: lampPick, enabled: lampOk, hint: () => (!lampOk() ? '' : S.lit ? '点一下：停止加热（盖上灯帽）' : '点一下：点燃酒精灯'), onTap: () => A.lampTap() },
      ...tubes.map((t, k) => ({ obj: t.pick, hint: () => (S.cur === 0 && k === 0 && S.tv[0] > 0 ? '点一下：弃去开始馏出的液体，换一支试管' : ''), onTap: () => A.swapTap() })),
    ], tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    // 演示：等到 cond() 成立的那一刻点一下（收集到约 10 mL 就停止加热），同时换上这一刻的字幕
    const tapWhen = (obj, cond, cap) => { let did = false, lastK = 1; return (k) => { if (k < lastK) did = false; lastK = k; if (did || !cond()) return; did = true; drag.items().find((x) => x.obj === obj).onTap?.(); if (cap) bar.caption(cap); }; };

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'chips', title: '加沸石', todo: '烧瓶里已经加了自来水，带导管的塞子还拔着。点一下<b>沸石</b>，用药匙往烧瓶里加几粒（防暴沸）。', target: () => potChips },
        { id: 'plug', title: '连接装置', todo: '点一下带导管的<b>塞子</b>：塞紧塞子，连接好装置。', target: () => (S.plug === 'in' ? null : plug) },
        { id: 'heat', title: '加热', todo: '点一下<b>酒精灯</b>，加热烧瓶。注意不要使液体沸腾得太剧烈。', target: () => lamp },
        { id: 'discard', title: '弃去开始馏出的液体', todo: '开始馏出液体以后，点一下<b>试管</b>：把开始馏出的那一点弃去，换一支试管。', target: () => (S.tv[0] > 0.5 ? tubes[0] : null) },
        { id: 'collect', title: '收集约 10 mL', todo: '接着收集，到约 <b>10 mL</b>。看试管里的水有没有橙色的杂质点。', target: () => null },
        { id: 'stop', title: '停止加热', todo: '收集约 10 mL 后，点一下<b>酒精灯</b>停止加热。', target: () => (S.tv[1] >= 9.5 ? lamp : null) },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { snapAll(); bubs.clear(); drops.clear(); vapP.clear(); mic.close(); } }),
          // 照课本的顺序：加沸石 → 连接装置 → 加热 → 弃去开始馏出的液体 → 收集约 10 mL → 停止加热。等待的时间用 speed 压缩
          shots: [
            { cap: '烧瓶里已经加了自来水。用药匙往瓶口里加几粒沸石，防止加热时暴沸。', dur: 3.8, cam: [[FX - 0.035, 0.15, 0.03], [0.1, 0.25, 1], 0.34], during: act.tap(chipsPick, 0.05) },
            { cap: '如图 4-14 连接好装置：塞紧带导管的塞子。', dur: 2.6, cam: [[0, 0.14, 0], [0.05, 0.2, 1], 0.4], during: act.tap(plugPick, 0.12) },
            { cap: '取下灯帽，点燃酒精灯，加热烧瓶。', dur: 7, get speed() { return flameOn && capper.k >= 1 && S.T < 99.5 ? 7 : 1; }, cam: [[0, 0.1, 0], [0.05, 0.2, 1], 0.4], during: act.tap(lampPick, 0.06) },
            { cap: '水沸腾了：水蒸气经导管进入冷的试管，冷凝成水。橙色的点是溶在自来水里的杂质：它们不会变成蒸气，留在烧瓶里。', dur: 6, get speed() { return S.T < 99.5 ? 7 : 1; }, cam: [[0, 0.1, 0], [0.05, 0.2, 1], 0.36] },
            { cap: '弃去开始馏出的部分液体，换一支干净的试管接着收集。', dur: 3, cam: [[TT.x, 0.08, 0], [0.05, 0.2, 1], 0.26], during: act.tap(tubes[0].pick, 0.08) },
            { cap: '钻进烧瓶里看：沸腾时水分子一个个从液面飞出去，成了水蒸气；钙、镁离子一个也跑不出去，留在烧瓶里。', dur: 10, cam: [[ST.x, FL_Y + 0.04, 0], [0.05, 0.22, 1], 0.3], during: act.at(0.02, () => mic.open(true)) },
            { cap: '试管里的蒸馏水没有杂质点。接着收集，到约 10 mL……', enter: () => mic.close(), dur: 6, get speed() { return S.lit && S.tv[1] < 10 ? 3 : 1; }, cam: [[0, 0.09, 0], [0.05, 0.2, 1], 0.42],      // 试管和酒精灯都在画面里：收到约 10 mL，看得见盖上灯帽
              during: tapWhen(lampPick, () => S.lit && S.tv[1] >= 10, '收集了约 10 mL 蒸馏水，停止加热：用灯帽盖灭酒精灯，再轻提一下灯帽，重新盖好。') },
            { cap: '收集了约 10 mL 蒸馏水，停止加热了。杂质留在烧瓶里，试管里的蒸馏水没有杂质点。演示完了，下面换你自己做。', dur: 4, cam: [[0, 0.1, 0], [0.05, 0.2, 1], 0.4] },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ================= 每帧 =================
    const step = (h, t) => {
      // 带导管的塞子：拔开 / 塞紧（约 0.4 秒，塞子和导管一起动）
      S.plugA += clamp((S.plug === 'in' ? 1 : 0) - S.plugA, -h * 2.5, h * 2.5);
      head.position.y = LIFT * (1 - ease(S.plugA));
      // 药匙加沸石：舀起几粒，伸到瓶口上方一翻，沸石落进瓶里（塞子还没拔开的话，药匙先在瓶口前上方等着）
      if (S.chipsA) {
        const C = S.chipsA; C.t += h;
        if (S.plugA > 0.01) C.t = Math.min(C.t, 1.0);
        spatPose(C.t); layChips(C.t);
        if (C.t >= CHIPS_END) {
          S.chipsA = null; S.chips = true; spatPose(0); layChips(null); if (C.reseat) S.plug = 'in';
          sfx.clink({ freq: 2400, gain: 0.03 }); done('chips');
          status('烧瓶里加了几粒<b>沸石</b>（防止加热时暴沸）。' + (S.plug === 'in' ? '点一下酒精灯，开始加热。' : '再点一下带导管的<b>塞子</b>：塞紧塞子，连接好装置。'));
        }
      }
      flameOn = capper.update(h, S.lit);        // 灯帽：点燃前取下放到桌上；熄灭时盖上，再轻提一下、重新盖好
      lamp.flame.setOn(flameOn); lamp.flame.update(t);
      S.T += ((flameOn ? 100 : 20) - S.T) * (flameOn ? 0 : 0.01 * h) + (flameOn ? Math.min(2 * h, 100 - S.T) : 0);
      const boiling = flameOn && S.T >= 99.5 && S.V > 5, linked = S.plugA > 0.99;      // linked：塞子塞紧、装置连着，水蒸气才走导管
      let rate = 0;
      if (boiling) {
        rate = 0.5;
        if (!S.chips && linked) { S.bump += h; if (S.bump > 2.5 && Math.random() < h * 0.6) { S.bump = 0; const slug = 1.5; S.V -= slug; S.tv[S.cur] += slug; S.timp[S.cur] += slug * (S.imp + 1); sfx.clink({ freq: 260, gain: 0.12 }); for (let i = 0; i < 10; i++) drops.spawn({ p: along(0.95), v: new THREE.Vector3(0, -0.05, 0), size: 0.0018, life: 0.8 }); if (!S.said.bump && !S.demo) { S.said.bump = true; status('<b>暴沸！</b>没加沸石，水猛地冲起来，一股液体直接冲过导管流进了试管——试管里的水混进了杂质。（“更多 → 全部重来”，先加沸石。）'); log(['没加沸石加热', '<b>暴沸</b>，液体直接冲进试管', '蒸馏水不纯了']); } } }
        S.V -= rate * h; if (linked) S.tv[S.cur] += rate * h;
        if (Math.random() < h * 30) bubs.spawn({ p: new THREE.Vector3(FX + (Math.random() - 0.5) * 0.02, FL_Y - FL_R + 0.004, (Math.random() - 0.5) * 0.02), v: new THREE.Vector3(0, 0.04, 0), size: 0.001 + Math.random() * 0.001, life: 1 });
        if (linked && Math.random() < h * 25) vapP.spawn({ p: along(0), v: new THREE.Vector3(), size: 0.0045, alpha: 0.85, life: 2.5, u: 0 });
        if (!S.said.boil && !S.demo) { S.said.boil = true; status('水<b>沸腾</b>了：水蒸气（淡蓝点）沿导管进入冷的试管，冷凝成水。橙色的杂质点留在烧瓶里。'); }
      }
      bubs.update(h, (p, d) => { p.p.addScaledVector(p.v, d); return p.p.y < FL_Y - FL_R + (S.V / V0) * 0.04; });
      vapP.update(h, (p, d) => { p.u += d / 2.2; p.p.copy(along(p.u)); p.alpha = 0.85 * (p.u > 0.85 ? (1 - p.u) / 0.15 : 1); return p.u < 1; });
      drops.update(h, (p, d) => { p.p.addScaledVector(p.v, d); return p.p.y > TT.y + 0.005; });
      if (S.cur === 1 && S.tv[1] >= 9.5 && !S.done10) { S.done10 = true; done('collect'); status('收集了约 <b>10 mL</b> 蒸馏水。点一下酒精灯，<b>停止加热</b>。'); }
      if (S.tv[S.cur] > 0.1 && !S.said.first && !S.demo) { S.said.first = true; status('开始馏出液体了。点一下<b>试管</b>：把开始馏出的那一点弃去，换一支干净的试管。'); }
      // 烧瓶里的水位（切面）、杂质浓度
      flask.updateMatrixWorld(true);
      const lvl = (S.V / V0) * 0.04 - FL_R + 0.001;
      const wp = flask.localToWorld(new THREE.Vector3(0, lvl, 0)); cut.constant = wp.y;
      const conc = V0 / Math.max(5, S.V);
      const show = Math.min(IMPN, Math.round(14 * conc));
      const imp = [];
      impDots.forEach((d, i) => { if (i >= show) return; const th = d.th + Math.sin(t * 0.5 + d.ph) * 0.3 + (boiling ? t * 0.8 : 0), y = -FL_R + 0.004 + (lvl + FL_R - 0.006) * d.y, rr = Math.sqrt(Math.max(0, (FL_R - 0.004) ** 2 - y * y)) * d.u; d.p.set(FX + Math.cos(th) * rr, FL_Y + y, Math.sin(th) * rr); imp.push(d); });
      impP.list = imp; impP.update(0, () => true);
      chips.visible = S.chips || !!S.chipsA;
      // 试管：0 号接开始馏出的，1 号接蒸馏水
      tubes.forEach((tb, k) => {
        const active = k === S.cur;
        tb.position.lerp(active ? new THREE.Vector3(TT.x, TT.y, 0) : TUBE_REST[k === 0 ? 0 : 1], 0.2);
        tb.rotation.z += ((active ? 0 : Math.PI / 2) - tb.rotation.z) * 0.2;        // 换下来的平放，管口朝左
        tb.liq.scale.y = Math.max(0.0001, (S.tv[k] * 1e-6) / (Math.PI * (TT_R - 0.0008) ** 2));
        tb.liq.material.color.set(S.timp[k] > 0.5 ? 0xe9d2b8 : 0xe4eef2);
      });
      // 卡片
      cards.fl.text(`<div class="cc"><div class="cc-t"><span class="cc-name">烧瓶 ${Math.round(S.T)} ℃</span>${boiling ? '<span class="cc-res burn">沸腾</span>' : ''}</div><div class="cc-more"><div class="cc-obs"><small>剩 ${S.V.toFixed(0)} mL 水 · 杂质浓了 ${conc.toFixed(1)} 倍</small></div></div></div>`).loc(group, FX, FL_Y + 0.02, 0).show(true);
      cards.tt.text(`<div class="cc"><div class="cc-t"><span class="cc-name">${S.cur ? '蒸馏水' : '开始馏出的液体'}</span></div><div class="cc-more"><div class="cc-obs"><small>${S.tv[S.cur].toFixed(1)} mL · ${S.timp[S.cur] > 0.5 ? '<b>混进了杂质</b>（暴沸冲进来的）' : '没有杂质点'}</small></div></div></div>`).loc(group, TT.x, TT.y + TT_LEN, 0).show(S.tv[S.cur] > 0.05 || S.cur === 1);
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.3, d: 0.14, h: 0.25 },
      view: { elev: 14, azim: -4, lookY: 0.5, frameMargin: 1.06 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = () => [...W.tbl.el.querySelectorAll('tbody tr')].map((tr) => `<div>${tr.children[0].innerHTML}：${tr.children[1].innerHTML}</div>`).join('') + `<div>收集到的蒸馏水 ${S.tv[1].toFixed(1)} mL：${S.timp[1] > 0.5 ? '混进了杂质' : '没有杂质点'}；烧瓶里的杂质浓了 ${(V0 / Math.max(5, S.V)).toFixed(1)} 倍</div>`;
        const t2 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '为什么要在烧瓶里加几粒沸石？',
          options: ['防止加热时暴沸', '让水更快沸腾', '吸附水里的杂质'],
          wrong: ['沸石的作用不是加快沸腾。可以“全部重来”，不加沸石试试。', '沸石不是用来吸附杂质的（那是活性炭）。'],
          ok: '对：沸石（或碎瓷片）防止<b>暴沸</b>。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); } });
        const t1 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '蒸馏为什么能得到净化程度很高的水？',
          options: ['水变成水蒸气离开，溶解的杂质留在烧瓶里', '杂质被沸石吸走了', '加热杀死了杂质'],
          wrong: ['看橙色的点：它们去哪儿了？', '杂质是溶解的钙、镁化合物，不是“活的”。'],
          ok: '对：只有水变成蒸气、再冷凝下来，<b>溶解的杂质</b>留在了烧瓶里。',
          onOk: () => t2.open() });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['做了什么', '现象', '说明']);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：烧瓶里按约 60 mL 自来水计；升温、馏出的快慢是示意（加快了）；橙色小点代表溶解的杂质（钙、镁化合物等），一个点代表很多。' });
        ui.controls.append(t1.el, t2.el, next, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, t1, t2, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('图 4-14：烧瓶里是自来水（橙色小点：溶在水里的杂质），放在陶土网上，下面一盏酒精灯；导管通到浸在冷水里的试管。左边一小碟沸石。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); mic.update(dt, k); },
      dispose() { mic.dispose(); bar.dispose(); bubs.dispose(); drops.dispose(); impP.dispose(); vapP.dispose(); },
      debug: { get S() { return S; }, A, bar, picks: { chips: chipsPick, plug: plugPick, lamp: lampPick, t0: tubes[0].pick },
        qa: qaFlow(drag, [
          { name: '加沸石', tap: chipsPick, wait: 3 },
          { name: '塞紧塞子，连接装置', tap: plugPick, wait: 1 },
          { name: '点灯', tap: lampPick, wait: 42 },
          { name: '换试管', tap: tubes[0].pick, wait: 17 },
          { name: '停止加热', tap: lampPick, wait: 1 },
          { name: '答第一题', run: () => W.t1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.t2.el.querySelector('button').click() },
        ]) },
    };
  },
};
