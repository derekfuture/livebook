// 图10.3-6 潜水艇示意图。玻璃水槽里有一个潜水艇模型，艇身两侧是透明的水舱。
// 按住“向水舱充水”：水舱进水，潜水艇变重，逐渐潜入水中；按住“用压缩空气排水”：水舱里的水被排出，潜水艇变轻，上浮。
// 物理：艇身体积不变 V = 320 cm³，浸没时 F浮 = ρ水 g V 不变；改变的是自身的重力 G = (m艇 + m舱水) g。
// 竖直方向 m·a = F浮 − G − 阻力（与速度成正比）；露出水面时按浸入的体积算浮力；碰到槽底就停住。
import * as THREE from 'three';
import { buttons, goals, note, readout } from './kit/ui.js';
import { Particles } from './kit/fx.js';
import { draggable, clamp } from './kit/interact.js';
import { paint, inked, hull, arrow } from '../live/ink.js';

const V = 3.2e-4, M0 = 0.26, MB = 0.1, RHO = 1000, G = 9.8;
const TW = 0.4, TH = 0.24, TD = 0.12, WL = 0.2;        // 水槽、水面高度
const R = 0.026, L = 0.13;                              // 艇身半径、长度

export default {
  id: 'submarine',
  fig: '图10.3-6',
  title: '潜水艇的浮沉',
  stampText: '推理',
  predict: {
    q: '潜水艇已经<b>浸没</b>在水中。它继续下潜到更深处时，受到的浮力——',
    hint: '课本第 75 页',
    options: ['变大', '变小', '不变'],
    answer: 2,
  },
  conclusion: {
    page: 79, rect: [62, 206, 362, 330],      // 课本第 75 页
    quote: '潜水艇能潜入水下航行。它的艇身内有水舱，向水舱充水时，潜水艇变重，逐渐潜入水中。当水舱充水后潜水艇所受的重力等于浮力时，它可以悬浮在水中。当用压缩空气将水舱里的水排出一部分时，潜水艇变轻，从而上浮。',
    why: '潜水艇浸没以后，排开水的体积就是它自身的体积，不论潜得多深，浮力都不变。它是靠改变<b>自身的重力</b>来实现浮沉的：G > F浮 时下沉，G = F浮 时悬浮，G < F浮 时上浮；浮出水面后，排开水的体积变小，浮力减小，直到浮力等于重力，漂浮在水面上。',
    src: '课本第 74–75 页 · 第十章 第3节 物体的浮沉条件及应用',
  },

  create({ tag }) {
    const group = new THREE.Group();
    // 水槽
    const glassMat = paint(0xd6ecf5, { unique: true, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });
    const tank = new THREE.Mesh(new THREE.BoxGeometry(TW, TH, TD), glassMat);
    tank.position.y = TH / 2;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(tank.geometry), new THREE.LineBasicMaterial({ color: 0x6f9fb8 }));
    edges.position.copy(tank.position);
    const water = new THREE.Mesh(new THREE.BoxGeometry(TW - 0.004, WL - 0.004, TD - 0.004), paint(0x7fc4e6, { unique: true, transparent: true, opacity: 0.32, depthWrite: false }));
    water.position.y = 0.002 + (WL - 0.004) / 2;
    water.renderOrder = 2;
    // 槽底：薄薄一层压在台板上面（不能和台板占同一块空间，否则两者的面重合、画面闪烁）
    const floor = inked(new THREE.Mesh(new THREE.BoxGeometry(TW + 0.01, 0.0018, TD + 0.01), paint(0x4d5668)), { width: 1.2 });
    floor.position.y = 0.0009;
    group.add(floor, tank, edges, water);
    // 潜水艇
    const sub = new THREE.Group();
    const bodyMat = paint(0x3f5b7a);
    const body = hull(new THREE.Mesh(new THREE.CapsuleGeometry(R, L - 2 * R, 10, 24), bodyMat), 0.0015);
    body.rotation.z = Math.PI / 2;
    const tower = hull(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.022, 0.016), bodyMat), 0.0012);
    tower.position.set(0.01, R + 0.008, 0);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.02, 6), paint(0x8f99a8));
    mast.position.set(0.016, R + 0.028, 0);
    const prop = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.022, 0.004), paint(0xc9a347));
    prop.position.set(-L / 2 - 0.004, 0, 0);
    sub.add(body, tower, mast, prop);
    // 两侧的水舱（透明，里面的水位可以看见）
    const tanks = [-1, 1].map((sz) => {
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 18), paint(0xe8f2f8, { unique: true, transparent: true, opacity: 0.45, depthWrite: false }));
      shell.rotation.z = Math.PI / 2;
      shell.position.set(0, -R * 0.45, sz * (R + 0.008));
      const fill = new THREE.Mesh(new THREE.BoxGeometry(0.086, 1, 0.016), paint(0x2f86c9, { unique: true, transparent: true, opacity: 0.75 }));
      fill.geometry.translate(0, 0.5, 0);
      fill.position.set(0, -R * 0.45 - 0.0115, sz * (R + 0.008));
      sub.add(shell, fill);
      return fill;
    });
    group.add(sub);
    // 注射器：放在水槽右边，用细软管连到艇上的水舱。往外拉活塞，水舱里的空气被抽出、水进来；往里推，空气把水压出去。
    const SY = { x: TW / 2 + 0.05, y: WL + 0.05, L: 0.09 };
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, SY.L, 20, 1, true), paint(0xe8f2f8, { unique: true, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
    barrel.rotation.z = Math.PI / 2; barrel.position.set(SY.x + SY.L / 2, SY.y, 0);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.012, 10), paint(0xe8f2f8));
    nozzle.rotation.z = Math.PI / 2; nozzle.position.set(SY.x - 0.006, SY.y, 0);
    const plunger = new THREE.Group();
    const pHead = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.0105, 0.006, 20), paint(0x3d4352));
    pHead.rotation.z = Math.PI / 2;
    const pRod = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, SY.L, 10), paint(0xd2d6dc));
    pRod.rotation.z = Math.PI / 2; pRod.position.x = SY.L / 2;
    const pGrip = inked(new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.03, 0.022), paint(0x3d4352)), { width: 1 });
    pGrip.position.x = SY.L;
    plunger.add(pHead, pRod, pGrip);
    const stand2 = inked(new THREE.Mesh(new THREE.BoxGeometry(0.02, SY.y - 0.011, 0.02), paint(0x9aa3b2)), { width: 1 });
    stand2.position.set(SY.x + 0.02, (SY.y - 0.011) / 2, 0);
    const hoseG = new THREE.Mesh(new THREE.BufferGeometry(), paint(0xd99a3c));
    group.add(barrel, nozzle, plunger, stand2, hoseG);
    // 取景用的空盒：活塞拉到底时把手也要在画面里（不画出来）
    const reach = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.03, 0.02), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    reach.position.set(SY.x + 0.003 + (SY.L - 0.01) + SY.L + 0.006, SY.y, 0); reach.raycast = () => {};
    group.add(reach);
    tag('注射器', 'pill').loc(group, SY.x + SY.L / 2, SY.y + 0.03, 0);
    const aG = arrow(0xd9483b, 0.0025), aF = arrow(0x2f7fd8, 0.0025);
    group.add(aG, aF);
    const tG = tag('', 'pill'), tF = tag('', 'pill');
    const bubbles = new Particles({ max: 120, sprite: true, color: 0xffffff });
    group.add(bubbles.mesh);

    const S = { y: WL - R * 0.6, v: 0, mb: 0, fill: 0, drain: 0, pull: 0, seen: new Set(), hoverT: 0, wasDeep: false };
    let W = null;
    const subFrac = (y) => {
      // 艇身中心在 y：浸入水中的比例（按圆截面近似）
      const d = (WL - (y - R)) / (2 * R);
      if (d <= 0) return 0;
      if (d >= 1) return 1;
      const th = 2 * Math.acos(1 - 2 * d);
      return (th - Math.sin(th)) / (2 * Math.PI);
    };

    // 抓把手或活塞杆都一样：按“从按下的地方挪了多少”来推拉，抓哪儿都不会跳。
    // 活塞只走手移动距离的一半——像拧着慢慢推，方便微调到悬浮
    let pull0 = 0;
    const grab = (p) => { pull0 = S.pull; };
    const toPull = (p, st) => { if (st) S.pull = clamp(pull0 + ((p.x - st.x) * 0.5) / (SY.L - 0.01), 0, 1); };
    const pointer = draggable(group, [
      { obj: pGrip, plane: 'xy', offset: 0, hint: '左右拖：往外拉吸水，往里推排水（慢慢拖可以微调）', onStart: grab, onDrag: toPull },
      { obj: pRod, plane: 'xy', offset: 0, hint: '左右拖活塞', onStart: grab, onDrag: toPull },
    ], { tip: tag('', 'pill') });

    return {
      group,
      pointer,
      size: { w: 0.58, d: 0.14, h: 0.26 },
      view: { elev: 14, azim: 0, lookY: 0.45, margin: 1.3 },
      mount(ui) {
        const out = readout([{ key: 'g', label: '重力 G', unit: 'N' }, { key: 'f', label: '浮力 F浮', unit: 'N' }, { key: 'w', label: '水舱里的水', unit: 'g' }, { key: 's', label: '潜水艇', span: true }]);
        const fine = buttons([{ text: '充水（拉活塞 +5 g）', ghost: true, onClick: () => { S.pull = Math.min(1, S.pull + 0.05); } }, { text: '排水（推活塞 −5 g）', ghost: true, onClick: () => { S.pull = Math.max(0, S.pull - 0.05); } }]);
        ui.controls.append(fine.el, note('也可以直接<b>拖注射器的活塞</b>：往外拉，水进入水舱；往里推，水被压出来。'), out.el, note('潜水艇的体积是 320 cm³，艇和设备的质量 260 g，两个水舱最多能装 100 g 水。'));
        W = { out, status: (m) => ui.status(m), goal: goals(ui, [['dive', '向水舱充水，让潜水艇潜入水中'], ['hover', '让潜水艇悬浮在水中（不碰槽底）'], ['rise', '把水排出，让潜水艇上浮，漂浮在水面上']]) };
        ui.status('潜水艇漂浮在水面上。<b>把右边注射器的活塞往外拉</b>，让水进入水舱。');
      },
      update(dt) {
        const h = Math.min(dt, 1 / 30);
        // 水舱里的水跟着活塞走（有一点滞后：水要流过细管）
        const want = S.pull * MB;
        const dm = clamp(want - S.mb, -0.03 * h, 0.03 * h);
        S.mb = clamp(S.mb + dm, 0, MB);
        S.fill = dm > 1e-6 ? 1 : 0; S.drain = dm < -1e-6 ? 1 : 0;
        plunger.position.set(SY.x + 0.003 + S.pull * (SY.L - 0.01), SY.y, 0);
        // 软管：注射器嘴 → 弯下去进水 → 接到艇顶
        const a0 = new THREE.Vector3(SY.x - 0.012, SY.y, 0), a1 = new THREE.Vector3(0.016, S.y + R + 0.03, 0.002);
        const curve = new THREE.CatmullRomCurve3([a0, new THREE.Vector3(SY.x - 0.04, SY.y + 0.02, 0.003), new THREE.Vector3((a0.x + a1.x) / 2, Math.max(SY.y, S.y + R) + 0.04, 0.004), a1, new THREE.Vector3(0.016, S.y + R + 0.012, 0)]);
        hoseG.geometry.dispose(); hoseG.geometry = new THREE.TubeGeometry(curve, 40, 0.0018, 6, false);
        const m = M0 + S.mb;
        const frac = subFrac(S.y);
        const Fb = RHO * G * V * frac, Gw = m * G;
        const a = (Fb - Gw - S.v * 2.2) / (m * 2.2);          // 2.2：连同被带动的水（附加质量）
        S.v += a * h; S.y += S.v * h;
        const ymin = R * 0.45 + 0.012 + 0.002;
        if (S.y < ymin) { S.y = ymin; S.v = Math.max(0, S.v); }
        if (S.y > WL + R) { S.y = WL + R; S.v = 0; }
        sub.position.set(0, S.y, 0);
        tanks.forEach((f) => { f.scale.y = Math.max(0.0005, (S.mb / MB) * 0.023); });
        // 力的示意图：画在艇的重心上
        const c = new THREE.Vector3(0.07, S.y, TD / 2 - 0.01);
        aG.set(c, new THREE.Vector3(0, -Gw * 0.012, 0)); aF.set(c.clone().add(new THREE.Vector3(0.012, 0, 0)), new THREE.Vector3(0, Fb * 0.012, 0));
        tG.loc(group, 0.1, S.y - Gw * 0.012 - 0.01, TD / 2).text(`G = ${Gw.toFixed(2)} N`);
        tF.loc(group, 0.11, S.y + Fb * 0.012 + 0.012, TD / 2).text(`F浮 = ${Fb.toFixed(2)} N`);
        // 排水时冒气泡
        if (S.drain && S.mb > 0 && Math.random() < 0.6) bubbles.spawn({ p: new THREE.Vector3((Math.random() - 0.5) * 0.06, S.y - R * 0.3, (Math.random() < 0.5 ? -1 : 1) * (R + 0.008)), v: new THREE.Vector3(0, 0.05, 0), size: 0.006, life: 4, alpha: 0.7 });
        bubbles.update(dt, (p, d) => { p.p.addScaledVector(p.v, d); return p.p.y < WL; });
        if (!W) return;
        W.out.set('g', Gw, 2); W.out.set('f', Fb, 2); W.out.set('w', S.mb * 1000, 0);
        const deep = frac > 0.999, onBottom = S.y <= ymin + 1e-4;
        const st = onBottom ? '沉在槽底' : !deep ? (Math.abs(S.v) < 0.002 ? '漂浮在水面上' : S.v > 0 ? '上浮' : '下沉') : Math.abs(S.v) < 0.0025 ? '悬浮在水中' : S.v > 0 ? '上浮' : '下沉';
        W.out.set('s', st);
        if (deep && !S.seen.has('dive')) { S.seen.add('dive'); W.goal.done('dive'); W.status('水舱充水，潜水艇变重，G > F浮，潜入了水中。浸没后浮力就不再变了——看浮力的读数。'); }
        if (deep && !onBottom && Math.abs(S.v) < 0.0025 && Math.abs(Fb - Gw) < 0.04 && !S.fill && !S.drain) { S.hoverT += dt; if (S.hoverT > 1.5 && !S.seen.has('hover')) { S.seen.add('hover'); W.goal.done('hover'); W.status(`悬浮：G = F浮 ≈ ${Fb.toFixed(2)} N，潜水艇停在水中。`); } } else S.hoverT = 0;
        if (deep) S.wasDeep = true;
        if (S.wasDeep && !deep && Math.abs(S.v) < 0.002 && !S.seen.has('rise')) { S.seen.add('rise'); W.goal.done('rise'); W.status('排出水舱里的水，潜水艇变轻，G < F浮，上浮；露出水面后排开的水变少，浮力减小，直到浮力等于重力——漂浮在水面上。'); }
        if (onBottom && !S.saidBottom) { S.saidBottom = true; W.status('沉到了槽底：水舱里的水太多，G > F浮。排出一些水。'); }
        if (!onBottom) S.saidBottom = false;
      },
      dispose() { bubbles.dispose?.(); },
      debug: { S },
    };
  },
};
