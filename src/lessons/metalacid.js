// 课题2 金属的化学性质 · 探究：金属与稀盐酸或稀硫酸的反应（课本下册第 10–11 页图 8-10）。
//
// 试管架上四支试管：镁、锌、铁、铜各少量。拖细口瓶往每支试管里倒 5 mL 稀盐酸；燃着的木条放在试管口，判断生成了什么气体；
// 再换稀硫酸做一遍。现象由模型算出来，自动填进课本那张表。
// 模型（课本没给数，按常见的课堂用量估）：稀盐酸、稀硫酸按约 2 mol/L 的 H⁺ 计，5 mL 约 10 mmol H⁺。
//   镁 0.05 g（约 2 mmol，放出约 50 mL 氢气）、锌 0.2 g、铁 0.2 g、铜 0.2 g。速率：镁带约半分钟反应完（冒泡约 2.6 mL/s），锌约 0.5 mL/s，铁约 0.1 mL/s，铜不反应；
//   镁反应放热，试管发烫；铁生成亚铁盐，溶液慢慢变成浅绿色。试管口积了足够的氢气时，燃着的木条一凑——“噗”一声，淡蓝色火焰。
// 看不见的东西：气泡就是氢气；卡片上的“气泡”是每秒放出多少毫升（模型）。
import * as THREE from 'three';
import { buttons, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { textPlate } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { testTube, splint, glassMat, CHEM } from './kit/chem.js';
import { bubble2, water2, flame2 } from './kit/chemfx.js';
import { microWorld, metalScene } from './kit/microworld.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { bottleCap } from './kit/labops.js';
import { sfx } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const SPEED = 1.5;                                   // 时间加快倍数（镁带大约冒半分钟）
const T_R = 0.0085, T_LEN = 0.12, T_Y = 0.012;       // 试管（底在 y = T_Y）
const XS = [-0.066, -0.022, 0.022, 0.066];
const METALS = [
  { key: 'Mg', name: '镁', color: 0xd6d9de, k: 0.05, mmol: 2.1, heat: 1, shape: 'ribbon', eq: 'Mg + 2HCl ══ MgCl₂ + H₂↑', eq2: 'Mg + H₂SO₄ ══ MgSO₄ + H₂↑' },
  { key: 'Zn', name: '锌', color: 0xa9aeb6, k: 0.006, mmol: 3.1, heat: 0.2, shape: 'granule', eq: 'Zn + 2HCl ══ ZnCl₂ + H₂↑', eq2: 'Zn + H₂SO₄ ══ ZnSO₄ + H₂↑' },
  { key: 'Fe', name: '铁', color: 0x5d636e, k: 0.0012, mmol: 3.6, heat: 0, shape: 'nail', green: true, eq: 'Fe + 2HCl ══ FeCl₂ + H₂↑', eq2: 'Fe + H₂SO₄ ══ FeSO₄ + H₂↑' },
  { key: 'Cu', name: '铜', color: 0xb8673a, k: 0, mmol: 3.1, heat: 0, shape: 'strip', eq: '—', eq2: '—' },
];
const ACID_MMOL = 10, V_ACID = 5;                    // 5 mL 约 10 mmol H⁺
const LIQ_H = (V_ACID * 1e-6) / (Math.PI * (T_R - 0.0008) ** 2);     // 5 mL 在试管里的高度
const BOT = { HCl: new THREE.Vector3(0.13, 0, 0.035), H2SO4: new THREE.Vector3(0.172, 0, 0.035) };
const STICK_HOME = new THREE.Vector3(0.11, 0.006, 0.09);
const ACIDNAME = { HCl: '稀盐酸', H2SO4: '稀硫酸' };

/** 细口瓶（透明，里面是无色的酸，贴着标签） */
function acidBottle(text) {
  const g = new THREE.Group();
  const pts = [[0.0003, 0], [0.016, 0], [0.017, 0.003], [0.017, 0.042], [0.009, 0.052], [0.006, 0.056], [0.006, 0.064]].map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), glassMat({ opacity: 0.3 })); body.renderOrder = 9; g.add(body);
  const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.0155, 0.0155, 0.03, 24), water2({ color: 0xe4eef2, base: 0.32 })); liq.position.y = 0.016; liq.renderOrder = 7; g.add(liq);
  const stopper = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0055, 0.008, 16), paint(0xeef1f3)), { width: 0.5 }); stopper.position.y = 0.067; g.add(stopper);
  const lab = textPlate(text, { w: 0.022, h: 0.009, color: '#23293a', bg: '#fffaf0', font: 'bold 92px "Songti SC", serif' }); lab.position.set(0, 0.026, 0.0173); g.add(lab);
  const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.07, 10), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 0.035; pick.userData.pick = true; g.add(pick);
  g.pick = pick; g.liq = liq; g.stopper = stopper;
  return g;
}

/** 一小块金属：镁带、锌粒、铁钉、铜片 */
function metalPiece(m) {
  const mat = paint(m.color, { keep: true });
  let mesh;
  if (m.shape === 'ribbon') { mesh = new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.022, 0.0006), mat); mesh.position.y = 0.012; mesh.rotation.z = 0.25; }
  else if (m.shape === 'granule') { mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.0034, 0), mat); mesh.position.y = 0.0036; }
  else if (m.shape === 'nail') { mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0009, 0.026, 8), mat); mesh.position.y = 0.014; mesh.rotation.z = 0.2; }
  else { mesh = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.026, 0.0006), mat); mesh.position.y = 0.014; mesh.rotation.z = -0.18; }
  return inked(mesh, { width: 0.4 });
}

export default {
  id: 'metalacid',
  fig: '图8-10',
  title: '金属与稀盐酸或稀硫酸的反应',
  stampText: '探究',
  style: 'paper',
  predict: {
    q: '镁、锌、铁、铜分别放进稀盐酸里，会怎样？',
    hint: '课本第 10 页探究：是不是所有的金属都能与稀盐酸或稀硫酸发生反应？',
    options: ['镁、锌、铁冒气泡（快慢不同），铜不反应', '四种金属都冒气泡', '只有镁冒气泡', '都不反应'],
    answer: 0,
  },
  need: '向盛有镁、锌、铁、铜的试管里分别加入 5 mL 稀盐酸，用燃着的木条检验生成的气体；再用稀硫酸做一遍',
  conclusion: {
    crops: [{ page: 15, rect: [64, 180, 487, 352] }],
    quote: '很多金属不仅能与氧气反应，还能与稀盐酸或稀硫酸反应。金属能否与稀盐酸或稀硫酸反应，可反映金属的活动性。',
    formula: 'Mg + 2HCl ══ MgCl₂ + H₂↑　　Zn + H₂SO₄ ══ ZnSO₄ + H₂↑',
    why: '镁、锌、铁都能和稀盐酸、稀硫酸反应，放出<b>氢气</b>（燃着的木条凑到试管口，“噗”一声，淡蓝色火焰）；铜不反应。冒气泡的快慢是镁 > 锌 > 铁——金属的<b>活动性</b>：镁 > 锌 > 铁 > 铜。<br>这些反应都是一种单质和一种化合物反应，生成另一种单质和另一种化合物——<b>置换反应</b>。',
    src: '课本下册第 10–12 页 · 第八单元 课题2 金属的化学性质（探究：金属与稀盐酸或稀硫酸的反应）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); else bar.caption(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) { W?.tbl.add(row); } };
    let lookAt = '';
    const near = (k) => { if (S.demo || lookAt === k) return; lookAt = k; look([XS[k], 0.08, 0], [0.06, 0.25, 1], 0.24, () => { lookAt = ''; }); };
    const far = () => { if (lookAt) { lookAt = ''; back(); } };

    paperSheet(group, { w: 0.34, d: 0.17, x: 0.04, z: 0.03 });

    // ================= 试管架、四支试管、四种金属 =================
    const rackM = paint(0xd9c9a6);
    const rackBase = inked(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.008, 0.036), rackM), { width: 0.7 }); rackBase.position.set(0, 0.004, 0); group.add(rackBase);
    for (const sx of [-1, 1]) { const post = inked(new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.07, 0.03), rackM), { width: 0.6 }); post.position.set(sx * 0.087, 0.043, 0); group.add(post); }
    const plate = inked(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.004, 0.024), rackM), { width: 0.6 }); plate.position.set(0, 0.075, -0.01); group.add(plate);
    const tubes = XS.map((x, k) => {
      const t = testTube({ r: T_R, len: T_LEN }); t.position.set(x, T_Y, 0); group.add(t);
      const ring = inked(new THREE.Mesh(new THREE.TorusGeometry(T_R + 0.0012, 0.0011, 6, 20), rackM), { width: 0.4 }); ring.rotation.x = Math.PI / 2; ring.position.set(x, 0.077, 0); group.add(ring);
      const piece = metalPiece(METALS[k]); t.add(piece);
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(T_R - 0.0008, T_R - 0.0008, 1, 18), water2({ color: 0xe4eef2, base: 0.32 }));
      liq.geometry.translate(0, 0.5, 0); liq.position.y = 0.0012; liq.scale.y = 0.0001; liq.visible = false; liq.renderOrder = 7; t.add(liq);
      const lab = textPlate(METALS[k].name, { w: 0.014, h: 0.008, color: '#23293a', bg: '#fffaf0', font: 'bold 96px "Songti SC", serif' }); lab.position.set(x, 0.004, 0.0185); group.add(lab);
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.12, 10), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 0.06; pick.userData.pick = true; t.add(pick);
      const flame = flame2({ w: 0.012, h: 0.022, core: 0xeaf4ff, mid: 0x9cc4ff, edge: 0x5b8cff, blue: 0.9, glowK: 0.4 }); flame.position.y = T_LEN + 0.002; flame.setOn(false); t.add(flame);
      return Object.assign(t, { piece, liq, pick, flame });
    });
    const MOUTH = (k) => new THREE.Vector3(XS[k], T_Y + T_LEN, 0);

    // ================= 稀盐酸、稀硫酸、燃着的木条 =================
    const bottles = {};
    // 转轴放在瓶口：倒的时候绕瓶口转，瓶口一直对着试管口
    const BH = 0.068, HOME = (a) => BOT[a].clone().add(new THREE.Vector3(0, BH, 0));
    for (const a of ['HCl', 'H2SO4']) {
      const b = acidBottle(ACIDNAME[a]), piv = new THREE.Group(); b.position.y = -BH; piv.add(b); piv.pick = b.pick; piv.bottle = b; piv.stopper = b.stopper; piv.position.copy(HOME(a)); group.add(piv); bottles[a] = piv;
      piv.cap = bottleCap(group, b, b.stopper, { rest: BOT[a].clone().add(new THREE.Vector3(0, 0, 0.034)) });      // 瓶塞拔下来倒放在瓶前的桌上（课本上册第 17 页）
    }
    const stick = splint({ len: 0.1 });
    const stickPick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.11, 0.02), new THREE.MeshBasicMaterial({ visible: false })); stickPick.position.y = 0.05; stickPick.userData.pick = true; stick.add(stickPick);
    stick.position.copy(STICK_HOME); stick.rotation.z = Math.PI / 2; group.add(stick);
    const bubs = new Particles({ max: 260, geometry: new THREE.SphereGeometry(1, 8, 6), material: bubble2({ color: 0x6f8797, white: 0.2 }) }); bubs.mesh.renderOrder = 9.8; group.add(bubs.mesh);      // 无色的酸里：气泡用深一点的边、画在玻璃之后
    const drops = new Particles({ max: 60, geometry: new THREE.SphereGeometry(1, 6, 5), material: water2({ color: 0xdfeaf0, base: 0.5 }) }); group.add(drops.mesh);

    const cards = XS.map((x, k) => { const c = tag('', 'cond'); c.px = [0, -64]; return c; });

    // ================= 状态 =================
    const freshTube = () => ({ acid: null, vol: 0, metal: 1, h2: 0, rate: 0, heat: 0, green: 0, top: 0, logged: false, pop: 0 });
    // pour：正在用的那瓶酸在做什么（carry 拿着走 / tilt 到试管口正前方斜过来 / in 往里挪，瓶口挨着试管口 / pour 慢慢倒 / out 退回前面 / level 摆正），k 是哪支试管
    const fresh = () => ({ demo: false, acid: 'HCl', t: METALS.map(freshTube), carry: null, pour: { ph: 'carry', k: -1 }, stickCarry: null, test: null, round: 1, popped: { HCl: false, H2SO4: false } });
    S = fresh();

    // ================= 操作 =================
    const A = {
      bottleDrag(p) { if (!p) return; S.carry = p.clone(); },
      bottleDrop() { S.carry = null; },
      stickDrag(p) { if (!p) return; S.stickCarry = new THREE.Vector3(p.x, Math.max(0.03, p.y), p.z ?? 0); },
      stickDrop() {
        const p = S.stickCarry; S.stickCarry = null; if (!p) return;
        const k = XS.findIndex((x) => Math.abs(p.x - x) < 0.018 && Math.abs(p.y - (T_Y + T_LEN + 0.01)) < 0.03);
        if (k < 0) return;
        const T = S.t[k];
        S.test = { k, t: 0 };
        if (!T.acid) return status(`${METALS[k].name}的试管里还没有加酸。`);
        if (T.top > 0.25) {
          T.pop = 1; T.top = 0; sfx.clink({ freq: 520, gain: 0.12 });
          status(`燃着的木条凑到${METALS[k].name}的试管口：<b>“噗”</b>的一声，冒出淡蓝色的火焰——生成的气体是<b>氢气</b>。`);
          if (!S.popped[S.acid]) { S.popped[S.acid] = true; log([`燃着的木条放在${METALS[k].name}的试管口（${ACIDNAME[S.acid]}）`, '“噗”的一声，淡蓝色火焰', '生成的气体是<b>氢气</b>']); done(S.acid === 'HCl' ? 'test' : 'h2so4'); }
        } else status(T.rate > 0 ? `燃着的木条放在${METALS[k].name}的试管口：冒出的气体很少，木条照常燃烧。` : `${METALS[k].name}的试管口没有气体冒出来，木条照常燃烧。`);
      },
      nextAcid() {
        S.acid = 'H2SO4'; S.round = 2; S.t = METALS.map(freshTube); S.pour = { ph: 'carry', k: -1 }; bubs.clear(); far();
        for (const t of tubes) { t.liq.visible = false; t.piece.scale.setScalar(1); t.flame.setOn(false); }
        status('换了四支新试管（同样的镁、锌、铁、铜）。这次倒<b>稀硫酸</b>。');
      },
      reset() {
        S = fresh(); bubs.clear(); drops.clear(); mw.close(); W?.tbl.clear(); far();
        for (const t of tubes) { t.liq.visible = false; t.piece.scale.setScalar(1); }
        if (W) { W.t1.close(); W.t2.close(); W.t3.close(); W.next.hidden = true; W.again.hidden = true; }
        bar.undo('mg', 'test', 'acid', 'h2so4', 'why');
        status('全部重新摆好了，记录也清空了。');
      },
    };

    const drag = draggable(group, [
      ...['HCl', 'H2SO4'].map((a) => ({ obj: bottles[a].pick, plane: 'xy', offset: BOT[a].z, hint: () => (S.acid === a ? `拖到试管口：倒 5 mL ${ACIDNAME[a]}` : a === 'H2SO4' ? '先用稀盐酸做' : ''),
        onStart: (p) => { if (S.acid === a) A.bottleDrag(p); }, onDrag: (p) => { if (S.acid === a) A.bottleDrag(p); }, onEnd: () => A.bottleDrop() })),
      { obj: stickPick, plane: 'xy', offset: 0, hint: '燃着的木条：拖到冒气泡的试管口', onStart: (p) => { stick.setState('flame', 0.8); A.stickDrag(p); }, onDrag: (p) => A.stickDrag(p), onEnd: () => A.stickDrop() },
    ], { tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    // 微观次元：钻进某支试管里金属的表面——金属原子变成离子进溶液，H⁺ 结合成氢分子冒走；铜表面 H⁺ 弹开
    let mwFor = 0, mwKey = '';
    const mwAt = (k = mwFor) => new THREE.Vector3(XS[k], T_Y + 0.008, 0);
    const mwState = (k = mwFor) => { const T = S.t[k]; return { metal: METALS[k].key, sol: S.acid, rate: T.vol >= 1 && T.metal > 0.01 ? T.rate : 0 }; };
    const mw = microWorld({ mode: 'holo', scene: metalScene(), place: () => ({ pos: group.localToWorld(mwAt()), scale: 0.0058 * group.getWorldScale(new THREE.Vector3()).x, cam: window.__lb.stage.camera }) });
    const goBtns = XS.map((x, k) => tag('钻进去看 ⊙', 'pill mw-go', () => openMicro(k)));
    const openMicro = (k, demo = false) => {
      mwFor = k; const p = mwAt();
      if (!demo) look([p.x, p.y + 0.05, p.z], [0.05, 0.22, 1], 0.28);
      const r = () => { const cam = window.__lb?.stage?.camera; if (!cam) return [innerWidth / 2, innerHeight * 0.8]; const v = group.localToWorld(mwAt()).project(cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; };
      const st = mwState(), was = mw.isOpen; mwKey = `${k}|${S.acid}`; mw.open(r, st); if (was) mw.reset(st);
    };
    mw.onClose = () => { if (!bar.playing) back(); };
    const pourAt = (k) => () => new THREE.Vector3(XS[k] + 0.004, T_Y + T_LEN - (BH - 0.035) + 0.004, BOT[S.acid].z);
    // 演示里拿瓶子的路线（手的位置，瓶口在手上方 BH - 0.035；瓶子一直在试管那一排的前面）：先在原处竖着举起来，挪到这支试管前面，再到试管口的高度
    const handUp = (a) => () => new THREE.Vector3(BOT[a].x, 0.12, BOT[a].z), handOver = (k) => () => new THREE.Vector3(XS[k] + 0.004, 0.12, BOT[S.acid].z);
    const stickAt = (k) => () => new THREE.Vector3(XS[k] + 0.004, T_Y + T_LEN + 0.008, 0);
    const nextEmpty = () => S.t.findIndex((T) => !T.full);

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'mg', title: '镁加稀盐酸', todo: '把<b>稀盐酸</b>拖到<b>镁</b>的试管口，倒 5 mL。', target: () => (S.carry ? null : bottles.HCl) },
        { id: 'test', title: '检验气体', todo: '立即把燃着的<b>木条</b>放在镁的试管口，观察现象，判断生成了什么气体。', target: () => (S.stickCarry ? null : stick) },
        { id: 'acid', title: '锌、铁、铜加稀盐酸', todo: '再把<b>稀盐酸</b>分别倒进锌、铁、铜的试管里，各 5 mL。观察现象。', target: () => (S.carry ? null : bottles.HCl) },
        { id: 'h2so4', title: '换稀硫酸', todo: '在左边点“换稀硫酸再做一遍”，用<b>稀硫酸</b>按同样的步骤做：先给镁加 5 mL，立即用燃着的木条检验，再给锌、铁、铜各加 5 mL。',
          target: () => (S.acid !== 'H2SO4' || S.carry || S.stickCarry ? null : !S.t[0].full ? bottles.H2SO4 : !S.popped.H2SO4 ? stick : nextEmpty() >= 0 ? bottles.H2SO4 : null) },
        { id: 'why', title: '想一想', todo: '哪些金属能和酸反应？在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { bubs.clear(); drops.clear(); mw.close(); for (const t of tubes) { t.liq.visible = false; t.piece.scale.setScalar(1); t.flame.setOn(false); } stick.setState('none'); } }),
          shots: [
            // (1) 镁：拿起稀盐酸（瓶塞倒放在桌上），从试管那一排的前面挪到镁的试管口，倒 5 mL，放回原处、塞好瓶塞
            { cap: '在试管里放入少量镁，加入 5 mL 稀盐酸：镁剧烈反应，冒出大量气泡。', dur: 7.2, speed: 1, cam: [[0.02, 0.09, 0], [0.06, 0.25, 1], 0.36],
              during: act.path(bottles.HCl.pick, [null, handUp('HCl'), handOver(0), pourAt(0)], { t0: 0.03, t1: 0.32, release: 0.83 }) },
            // 紧接着：燃着的木条从前面举高、绕到镁的试管口上方，再放到试管口
            { cap: '立即把燃着的木条放在试管口：“噗”的一声，淡蓝色火焰——生成的气体是氢气。', dur: 5, cam: [[XS[0], 0.12, 0], [0.06, 0.2, 1], 0.26],
              during: act.path(stickPick, [STICK_HOME.clone().setY(0.03), new THREE.Vector3(STICK_HOME.x, 0.2, STICK_HOME.z), new THREE.Vector3(XS[0] + 0.004, 0.2, 0), stickAt(0)], { t0: 0.06, t1: 0.42, release: 0.46 }) },
            { cap: '钻进镁的表面看：镁原子变成 Mg²⁺ 进入溶液，两个 H⁺ 在表面结合成一个氢分子冒出去——这就是气泡。', dur: 8, cam: [[XS[0], T_Y + 0.06, 0], [0.05, 0.22, 1], 0.28], during: act.at(0.02, () => openMicro(0, true)) },
            // 再给锌、铁、铜各倒 5 mL：一次拿着瓶子，挨个倒，倒完放回原处
            { cap: '再分别向锌、铁、铜的试管里加入 5 mL 稀盐酸。', enter: () => mw.close(), dur: 12, speed: 1.5, cam: [[0.02, 0.09, 0], [0.06, 0.25, 1], 0.36],
              during: act.path(bottles.HCl.pick, [null, handUp('HCl'), handOver(1), [pourAt(1), 0.22], [pourAt(2), 0.22], [pourAt(3), 0.22]], { t0: 0.02, t1: 0.9, release: 0.92 }) },
            { cap: '锌冒气泡较快，铁很慢，铜不反应。', dur: 5, speed: 2, cam: [[0, 0.06, 0], [0.06, 0.22, 1], 0.3] },
            { cap: '再看铜的表面：H⁺ 撞上去又弹开了——铜排在氢后面，不和稀酸反应。', dur: 7, cam: [[XS[3], T_Y + 0.06, 0], [0.05, 0.22, 1], 0.28], during: act.at(0.02, () => openMicro(3, true)) },
            { cap: '接下来用稀硫酸代替稀盐酸，照同样的步骤再做一遍——这一轮留给你自己做。演示完了，下面换你自己做。', enter: () => mw.close(), dur: 5, cam: [[0.02, 0.08, 0], [0.06, 0.25, 1], 0.4] },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ================= 每帧 =================
    const step = (h, t) => {
      // 倒酸（转轴在瓶口）：拿起瓶子时瓶塞先拔下来倒放在桌上，拿开了瓶子才跟着手走（瓶子拿在试管那一排的前面）。手到了某支试管口：
      // 瓶子在这支试管口的正前方斜过来，再往里挪，让瓶口挨着试管口，慢慢倒 5 mL；倒够了先退回前面，再摆正（课本上册第 17 页）。
      // 松手以后先挪到原处上方，再放下去，塞好瓶塞。
      const TILT = 2.1, RATE = 2.5;          // RATE：每秒倒 2.5 mL
      const LIP = (k) => MOUTH(k).add(new THREE.Vector3(0.002, 0.005, 0)), FRONT = (k) => LIP(k).setZ(BOT[S.acid].z);
      for (const a of ['HCl', 'H2SO4']) {
        const b = bottles[a], bp = b.position, mine = S.acid === a, P = S.pour, held = mine && !!S.carry;
        const idle = !mine || P.ph === 'carry';
        b.cap.update(1 - Math.exp(-h * 10), !(idle && !held && bp.distanceTo(HOME(a)) < 0.0015 && Math.abs(b.rotation.z) < 0.02));
        const plugAway = b.stopper.parent === group && Math.hypot(b.stopper.position.x - bp.x, b.stopper.position.z - bp.z) > 0.012;
        const mouth = held ? S.carry.clone().add(new THREE.Vector3(0, BH - 0.035, 0)) : null;          // 手抓在瓶身中间，瓶口在手上方
        const overK = mouth ? XS.findIndex((x) => Math.abs(mouth.x - x) < 0.025 && Math.abs(mouth.y - (T_Y + T_LEN)) < 0.03) : -1;
        const a2 = 1 - Math.exp(-h * 9), near = (q, d) => bp.distanceTo(q) < d;
        let goal = null, tilt = 0;
        if (mine) {
          if (P.ph === 'carry' && held && plugAway && overK >= 0 && !S.t[overK].full) { P.ph = 'tilt'; P.k = overK; }
          if (P.ph === 'carry' && held) goal = plugAway ? mouth : HOME(a);
          if (P.ph === 'tilt') { goal = FRONT(P.k); tilt = near(FRONT(P.k), 0.01) ? TILT : 0; if (overK !== P.k) P.ph = 'level'; else if (b.rotation.z > TILT - 0.08 && near(FRONT(P.k), 0.003)) P.ph = 'in'; }      // 竖着挪到试管口正前方，再斜过来
          if (P.ph === 'in') { goal = LIP(P.k); tilt = TILT; if (overK !== P.k) P.ph = 'out'; else if (near(LIP(P.k), 0.0015)) P.ph = 'pour'; }
          if (P.ph === 'pour') {
            goal = LIP(P.k); tilt = TILT;
            const T = S.t[P.k], k = P.k;
            T.vol = Math.min(V_ACID, T.vol + RATE * h); T.acid = S.acid;
            if (Math.random() < h * 25) { b.updateMatrixWorld(true); drops.spawn({ p: group.worldToLocal(b.bottle.localToWorld(new THREE.Vector3(-0.003, 0.0645, 0))), v: new THREE.Vector3(-0.005, -0.05, 0), size: 0.0012, life: 0.6 }); }
            if (T.vol >= V_ACID && !T.full) {
              T.full = true; P.ph = 'out';
              status(`${METALS[k].name}的试管里倒了 5 mL ${ACIDNAME[S.acid]}。${nextEmpty() < 0 ? '四支都倒好了——看看哪支冒气泡。' : ''}`);
              if (S.acid === 'HCl' && k === 0) done('mg');
              if (S.acid === 'HCl' && nextEmpty() < 0) done('acid');
            } else if (overK !== P.k) P.ph = 'out';
          }
          if (P.ph === 'out') { goal = FRONT(P.k); tilt = TILT; if (near(FRONT(P.k), 0.003)) P.ph = 'level'; }
          if (P.ph === 'level') { goal = FRONT(P.k); tilt = 0; if (Math.abs(b.rotation.z) < 0.05) { P.ph = 'carry'; P.k = -1; } }
        }
        // 滑过去（一帧不超过 0.45 m/s）；放回原处：先水平挪到原处上方（不低于现在的高度），再放下去
        if (!goal) { const H = HOME(a); goal = Math.hypot(bp.x - H.x, bp.z - H.z) > 0.004 ? new THREE.Vector3(H.x, Math.max(bp.y, H.y), H.z) : H; }
        { const d = goal.clone().sub(bp).multiplyScalar(a2), m = 0.45 * h; if (d.length() > m) d.setLength(m); bp.add(d); }
        b.rotation.z += (tilt - b.rotation.z) * Math.min(1, h * 5);
      }
      drops.update(h, (p, d) => { p.v.y -= 0.5 * d; p.p.addScaledVector(p.v, d); return p.p.y > T_Y + 0.01; });
      // 反应：放氢气、放热、铁的溶液变浅绿
      const hh = h * SPEED;
      S.t.forEach((T, k) => {
        const M = METALS[k], tube = tubes[k];
        tube.liq.visible = T.vol > 0.05; tube.liq.scale.y = Math.max(0.0001, LIQ_H * (T.vol / V_ACID));
        // 木条检验时的火焰（噗）：每支试管都要更新（没倒酸的也是灭着的）
        tube.flame.setOn(T.pop > 0.05); tube.flame.setSize(T.pop); tube.flame.update(t + k); T.pop = Math.max(0, T.pop - h * 2.2);
        if (!T.acid || T.vol < 1) { T.rate = 0; return; }
        const r = M.k * T.metal * (T.vol / V_ACID) * (S.acid === 'H2SO4' && M.key === 'Zn' ? 1.3 : 1);        // 每秒反应掉的“份数”
        const dn = Math.min(T.metal, r * hh); T.metal -= dn;
        const mL = dn * M.mmol * 24.5;              // 放出的氢气（mL，约 24.5 mL/mmol）
        T.rate = mL / Math.max(1e-6, hh);           // mL/s（模型时间）
        T.h2 += mL;
        T.top = Math.min(1, T.top + mL * 0.08 - T.top * hh * 0.12);          // 试管口积的氢气：一直往外跑
        T.heat = Math.min(1, T.heat + M.heat * dn * 12) * Math.pow(0.97, hh);
        if (M.green) T.green = Math.min(1, T.green + dn * 6);
        tube.piece.scale.setScalar(M.shape === 'ribbon' ? Math.max(0.05, T.metal) : 0.6 + 0.4 * T.metal);
        tube.liq.material.color.lerpColors(new THREE.Color(0xe4eef2), new THREE.Color(0xc8e6b8), T.green);
        // 气泡：多少跟着速率走
        for (let n = Math.floor(h * Math.min(120, T.rate * 18) + Math.random()); n > 0; n--) bubs.spawn({ p: tube.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.006, 0.004 + Math.random() * 0.012, (Math.random() - 0.5) * 0.006)), v: new THREE.Vector3(0, 0.02, 0), size: 0.0007 + Math.random() * (M.key === 'Mg' ? 0.0016 : 0.0008), life: 2, k });
        // 记录：倒好以后看一会儿
        if (T.vol >= V_ACID) T.seen = (T.seen || 0) + h;
        if (T.seen > 2.5 && !T.logged) {
          T.logged = true;
          const ph = M.k === 0 ? '<b>没有现象</b>' : M.key === 'Mg' ? '<b>剧烈</b>反应，大量气泡，试管发烫' : M.key === 'Zn' ? '较多气泡' : '少量气泡，溶液慢慢变成<b>浅绿色</b>';
          log([`${M.name} + ${ACIDNAME[S.acid]}`, ph, S.acid === 'HCl' ? M.eq : M.eq2]);
          if (S.t.every((x) => x.logged) && S.acid === 'H2SO4' && bar.has('h2so4')) maybeAsk();
          if (S.t.every((x) => x.logged) && S.acid === 'HCl' && W && !S.demo) W.again.hidden = false;
        }
      });
      bubs.update(h, (p, d) => { p.v.y += 0.12 * d; p.p.addScaledVector(p.v, d); return p.p.y < T_Y + LIQ_H * (S.t[p.k].vol / V_ACID) - 0.001; });
      // 木条
      if (S.stickCarry) { stick.position.lerp(S.stickCarry, 0.45); stick.rotation.z += (-0.5 - stick.rotation.z) * 0.25; }
      else if (S.test) { S.test.t += h; if (S.test.t > 1.5) S.test = null; }
      else { stick.position.lerp(STICK_HOME, 0.18); stick.rotation.z += (Math.PI / 2 - stick.rotation.z) * 0.18; if (stick.position.distanceTo(STICK_HOME) < 0.004) stick.setState('none'); }
      stick.update(t);
      // 卡片：气泡快慢、温度
      S.t.forEach((T, k) => {
        const M = METALS[k], v = Math.min(100, T.rate * 12);
        cards[k].text(`<div class="cc"><div class="cc-t"><span class="cc-name">${M.name}</span>${T.heat > 0.3 ? '<span class="cc-res burn">发烫</span>' : ''}</div><div class="cc-more"><div class="cc-obs"><span class="o2-read"><i style="width:${v}%;background:#6f8aa0"></i></span><small>${T.rate > 0.05 ? `气泡 约 ${T.rate.toFixed(T.rate < 1 ? 2 : 1)} mL/s` : '没有气泡'}</small></div></div></div>`)
          .loc(group, XS[k], T_Y + T_LEN + 0.004, 0).show(T.vol >= V_ACID);
      });
    };
    const maybeAsk = () => { if (W && !S.demo) { W.t1.open(); far(); } };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.28, d: 0.14, h: 0.15 },
      view: { elev: 16, azim: -4, lookY: 0.42, frameMargin: 1.08 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = () => [...W.tbl.el.querySelectorAll('tr')].slice(1).map((tr) => `<div>${[...tr.children].slice(0, 2).map((td) => td.innerHTML).join('：')}</div>`).join('');
        const t3 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '比较四种金属冒气泡的快慢，它们的活动性由强到弱是——',
          options: ['镁 > 锌 > 铁 > 铜', '铜 > 铁 > 锌 > 镁', '铁 > 锌 > 镁 > 铜'],
          wrong: ['看记录：铜一点气泡都没有，镁最剧烈。', '看记录：谁冒气泡最快？'],
          ok: '对：镁 > 锌 > 铁 > 铜。金属能否与稀盐酸或稀硫酸反应、反应的剧烈程度，可以反映金属的活动性。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); } });
        const t2 = think({ title: '想一想', ctx: () => '<div>Mg + 2HCl ══ MgCl₂ + H₂↑</div><div>Zn + H₂SO₄ ══ ZnSO₄ + H₂↑</div><div>Fe + 2HCl ══ FeCl₂ + H₂↑</div>', status: (m) => ui.status(m),
          q: '从反应物和生成物的类别看，这些反应的特点是——',
          options: ['一种单质和一种化合物反应，生成另一种单质和另一种化合物', '两种物质生成一种物质（化合反应）', '一种物质生成两种物质（分解反应）'],
          wrong: ['镁和盐酸是两种物质，生成的也是两种物质，不是化合反应。', '反应物有两种，不是分解反应。'],
          ok: '对：这类反应叫<b>置换反应</b>——金属把酸里的氢“置换”出来。',
          onOk: () => t3.open() });
        const t1 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '哪些金属能和稀盐酸、稀硫酸反应？生成了什么气体？',
          options: ['镁、锌、铁能反应，生成氢气；铜不能反应', '四种都能反应，生成氧气', '只有镁能反应，生成二氧化碳'],
          wrong: ['燃着的木条凑上去“噗”一声，是氢气，不是氧气；铜的试管里也没有气泡。', '锌、铁也有气泡；燃着的木条凑上去“噗”一声，是氢气。'],
          ok: '对：镁、锌、铁能和稀盐酸、稀硫酸反应，放出<b>氢气</b>；铜不能。',
          onOk: () => t2.open() });
        const again = h('button', { class: 'go', hidden: true, onclick: () => { again.hidden = true; A.nextAcid(); } }, '换稀硫酸再做一遍 →');
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['做了什么', '现象', '化学方程式']);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'),
          buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：时间加快 1.5 倍。稀盐酸、稀硫酸按约 2 mol/L 的 H⁺ 计；镁 0.05 g、锌 0.2 g、铁 0.2 g、铜 0.2 g；气泡快慢是模型估计。' });
        ui.controls.append(again, t1.el, t2.el, t3.el, next, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, t1, t2, t3, next, again, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('图 8-10：试管架上四支试管，分别放了少量<b>镁、锌、铁、铜</b>；右边是稀盐酸和稀硫酸，前面一根燃着的木条。可以先看<b>老师演示</b>，也可以直接动手。');
      },
      update(dt, t) {
        const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t);
        if (mw.isOpen && mwKey !== `${mwFor}|${S.acid}`) { mwKey = `${mwFor}|${S.acid}`; mw.reset(mwState()); } else mw.set(mwState());
        mw.update(Math.min(dt, 1 / 30) * Math.min(k, 1.5));
        goBtns.forEach((g, i) => g.loc(group, XS[i], T_Y + LIQ_H + 0.014, 0.012).show(S.t[i].vol >= V_ACID && !mw.isOpen && !bar.playing));
      },
      dispose() { mw.dispose(); bar.dispose(); bubs.dispose(); drops.dispose(); },
      debug: { get S() { return S; }, A, bar, picks: { hcl: bottles.HCl.pick, h2so4: bottles.H2SO4.pick, stick: stickPick, mg: tubes[0].pick, zn: tubes[1].pick }, plugHCl: bottles.HCl.stopper, plugH2SO4: bottles.H2SO4.stopper,
        qa: qaFlow(drag, [
          ...['HCl', 'H2SO4'].flatMap((a) => [
            ...(a === 'H2SO4' ? [{ name: '等一会儿', run: () => {}, wait: 3 }, { name: '换稀硫酸', run: () => W.again.click() }] : []),
            { name: `${a} 拿起瓶子 镁`, hold: bottles[a].pick }, { name: `${a} 倒进镁的试管`, run: () => A.bottleDrag(pourAt(0)()), wait: 3 }, { name: `${a} 放回 镁`, release: bottles[a].pick, wait: 0.3 },
            { name: a === 'HCl' ? '木条放在镁的试管口' : '木条放在镁的试管口（硫酸）', drag: stickPick, to: stickAt(0), wait: 2 },
            ...[1, 2, 3].flatMap((k) => [{ name: `${a} 拿起瓶子 ${k + 1}`, hold: bottles[a].pick }, { name: `${a} 倒进试管 ${k + 1}`, run: () => A.bottleDrag(pourAt(k)()), wait: 3 }, { name: `${a} 放回 ${k + 1}`, release: bottles[a].pick, wait: 0.3 }]),
          ]),
          { name: '再等一会儿', run: () => {}, wait: 3 },
          { name: '答第一题', run: () => W.t1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.t2.el.querySelector('button').click() },
          { name: '答第三题', run: () => W.t3.el.querySelector('button').click() },
        ]) },
    };
  },
};
