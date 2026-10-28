// 图14.2-4 四冲程汽油机剖面图 / 图14.2-5 工作示意图。剖开的气缸：进气门、排气门、火花塞、活塞、连杆、曲轴、飞轮。
// 直接操作：拖飞轮（或曲轴）慢慢转，看每个冲程里活塞、气门和缸内气体怎样变化；也可以让它自己运转、调快慢。
// 先认冲程：随机停在某个位置，学生看气门开闭和活塞运动方向，判断是哪个冲程；再回答能量转化的问题。
// 一个工作循环：曲轴转 2 圈（720°），活塞往复 2 次，四个冲程，只有做功冲程对外做功，其余三个靠飞轮的惯性完成。
import * as THREE from 'three';
import { seg, slider, buttons, goals, note } from './kit/ui.js';
import { draggable } from './kit/interact.js';
import { paint, inked, hull, arrow, MAGENTA } from '../live/ink.js';

const R = 0.022, L = 0.06, BORE = 0.05, TOP = 0.185;        // 曲柄半径、连杆长、缸径、气缸顶
const STROKES = [
  { name: '吸气冲程', valve: [1, 0], dir: '向下', gas: 0x8fc4ea, desc: '进气门打开，排气门关闭，活塞向下运动，汽油和空气的混合物进入气缸。' },
  { name: '压缩冲程', valve: [0, 0], dir: '向上', gas: 0x6fa8d8, desc: '进气门和排气门都关闭，活塞向上运动，燃料混合物被压缩——机械能转化为内能，温度升高。' },
  { name: '做功冲程', valve: [0, 0], dir: '向下', gas: 0xff8a3a, desc: '压缩冲程结束时火花塞产生电火花，燃料猛烈燃烧，产生高温高压的气体，推动活塞向下运动，通过连杆带动曲轴转动——内能转化为机械能。' },
  { name: '排气冲程', valve: [0, 1], dir: '向上', gas: 0x9a9a9a, desc: '进气门保持关闭，排气门打开，活塞向上运动，把废气排出气缸。' },
];

export default {
  id: 'engine',
  fig: '图14.2-5',
  title: '四冲程汽油机',
  stampText: '观察',
  predict: {
    q: '汽油机的一个工作循环有四个冲程。<br>哪个冲程使汽车获得动力（内能转化为机械能）？',
    hint: '课本第 27 页',
    options: ['压缩冲程', '做功冲程', '排气冲程'],
    answer: 1,
  },
  conclusion: {
    crops: [{ page: 32, rect: [160, 555, 460, 664] }, { page: 33, rect: [60, 70, 480, 278] }],
    quote: '活塞在气缸内往复运动时，从气缸的一端运动到另一端的过程，叫作一个冲程。多数汽油机是由吸气、压缩、做功、排气四个冲程的不断循环来保证连续工作的。',
    why: '判断冲程看两样：气门的开闭和活塞的运动方向。进气门开、活塞向下——吸气；两个气门都关、活塞向上——压缩（机械能转化为内能）；两个都关、火花塞点火、活塞向下——做功（内能转化为机械能，汽车获得动力）；排气门开、活塞向上——排气。一个工作循环曲轴转 2 圈、活塞往复 2 次、对外做功 1 次；另外三个冲程靠飞轮的惯性来完成。',
    src: '课本第 26–27 页 · 第十四章 第2节 热机的效率（四冲程汽油机）',
  },

  create({ tag }) {
    const group = new THREE.Group();
    // ---- 气缸（剖开：只画后半个缸壁和两侧边） ----
    const wallMat = paint(0xb8bec8);
    const back = inked(new THREE.Mesh(new THREE.BoxGeometry(BORE + 0.02, 0.1, 0.006), wallMat), { width: 1.2 }); back.position.set(0, TOP - 0.05, -0.02);
    for (const s of [-1, 1]) { const w = inked(new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.1, 0.04), wallMat), { width: 1.2 }); w.position.set(s * (BORE / 2 + 0.005), TOP - 0.05, 0); group.add(w); }
    const head = inked(new THREE.Mesh(new THREE.BoxGeometry(BORE + 0.02, 0.012, 0.04), paint(0x9aa3b2)), { width: 1.2 }); head.position.set(0, TOP + 0.006, 0);
    group.add(back, head);
    // 气门（向下打开）
    const valves = [-1, 1].map((s) => {
      const g = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.03, 8), paint(0x8f99a8)); stem.position.y = 0.015;
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.005, 0.004, 16), paint(0x2b2f3a));
      g.add(stem, disc); g.position.set(s * 0.014, TOP, 0.019);     // 画在剖面前面，开闭看得清
      group.add(g);
      const port = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.01, 0.03), paint(s < 0 ? 0x5aa9d6 : 0x8a8a8a)); port.position.set(s * 0.03, TOP + 0.018, 0); group.add(port);
      return g;
    });
    tag('进气门', 'pill').loc(group, -0.04, TOP + 0.035, 0); tag('排气门', 'pill').loc(group, 0.04, TOP + 0.035, 0);
    // 气门打开时的气流：混合气从进气口流进缸里，废气从排气口流出去（一串小箭头）
    const flows = [-1, 1].map((s) => {
      const g = new THREE.Group();
      const col = s < 0 ? 0x2f7fd8 : 0x6b6b6b;
      const as = [0, 1, 2].map(() => { const a = arrow(col, 0.0024); g.add(a); return a; });
      group.add(g);
      return { g, as, s };
    });
    const flowPath = (s, u) => {
      // s<0 进气：从口外 → 气门下面；s>0 排气：从气门下面 → 口外
      const P0 = new THREE.Vector3(s * 0.045, TOP + 0.03, 0.022), P1 = new THREE.Vector3(s * 0.02, TOP + 0.012, 0.022), P2 = new THREE.Vector3(s * 0.012, TOP - 0.02, 0.022);
      const t = s < 0 ? u : 1 - u;
      return t < 0.5 ? P0.clone().lerp(P1, t * 2) : P1.clone().lerp(P2, (t - 0.5) * 2);
    };
    const plug = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.02, 8), paint(0xf2f2f2)), 0.001); plug.position.set(0, TOP + 0.016, 0); group.add(plug);
    tag('火花塞', 'pill').loc(group, 0, TOP + 0.045, 0);
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0 })); spark.position.set(0, TOP - 0.003, 0); group.add(spark);
    // 缸内气体
    const gasMat = new THREE.MeshBasicMaterial({ color: 0x8fc4ea, transparent: true, opacity: 0.7, depthWrite: false });
    const gas = new THREE.Mesh(new THREE.BoxGeometry(BORE - 0.002, 1, 0.034), gasMat); gas.geometry.translate(0, -0.5, 0); gas.position.set(0, TOP, 0); group.add(gas);
    // 活塞、连杆、曲轴、飞轮
    const piston = inked(new THREE.Mesh(new THREE.BoxGeometry(BORE - 0.002, 0.018, 0.034), paint(0x7d8593)), { width: 1.2 }); group.add(piston);
    const rod = inked(new THREE.Mesh(new THREE.BoxGeometry(0.006, L, 0.006), paint(0x9aa3b2)), { width: 1 }); group.add(rod);
    const CY = 0.065;
    const crank = new THREE.Group(); crank.position.set(0, CY, 0.0);
    const arm = inked(new THREE.Mesh(new THREE.BoxGeometry(0.01, R + 0.008, 0.008), paint(0x6b7280)), { width: 1 }); arm.position.y = R / 2; crank.add(arm);
    const fly = new THREE.Group(); fly.position.set(0, CY, -0.035);      // 飞轮在曲轴后面，不挡住曲轴和连杆
    const wheel = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.008, 40), paint(0x5b6272)), 0.0012); wheel.rotation.x = Math.PI / 2;
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.03, 0.002), paint(0xd9483b)); mark.position.set(0, 0.035, 0.005);
    fly.add(wheel, mark);
    group.add(crank, fly);
    // 机座：飞轮后面一块立板托着曲轴，下面是底座（不然整台机器像浮在半空）
    const standMat = paint(0x8f99a8);
    const stand = inked(new THREE.Mesh(new THREE.BoxGeometry(0.03, CY, 0.008), standMat), { width: 1 }); stand.position.set(0, CY / 2, -0.046);
    const foot = inked(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.006, 0.05), standMat), { width: 1 }); foot.position.set(0, 0.003, -0.03);
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.05, 10), paint(0x5b6272)); axle.rotation.x = Math.PI / 2; axle.position.set(0, CY, -0.02);
    for (const sx of [-1, 1]) { const leg = inked(new THREE.Mesh(new THREE.BoxGeometry(0.006, TOP - 0.1 - 0.006, 0.006), standMat), { width: 1 }); leg.position.set(sx * (BORE / 2 + 0.005), 0.006 + (TOP - 0.1 - 0.006) / 2, 0.012); group.add(leg); }
    group.add(stand, foot, axle);
    tag('飞轮', 'pill').loc(group, 0.06, CY - 0.04, -0.03);
    const pArrow = arrow(MAGENTA, 0.002); group.add(pArrow);
    const strokeTag = tag('', 'pill');

    const S = { a: 0, w: 0, auto: false, speed: 1, quiz: null, seen: new Set(), lastStroke: -1, shown: true };
    let W = null;
    const stroke = () => Math.floor((((S.a % (4 * Math.PI)) + 4 * Math.PI) % (4 * Math.PI)) / Math.PI);   // 0..3：每半圈一个冲程（a=0 时活塞在最上）
    const layout = () => {
      const a = S.a;
      const px = R * Math.sin(a), py = CY + R * Math.cos(a);
      const yPin = py + Math.sqrt(L * L - px * px);            // 活塞销高度
      piston.position.set(0, yPin + 0.009, 0);
      rod.position.set(px / 2, (py + yPin) / 2, 0.006); rod.rotation.z = Math.atan2(px, yPin - py);
      crank.rotation.z = -a; fly.rotation.z = -a;
      const k = stroke(), st = STROKES[k];
      const frac = (((S.a % Math.PI) + Math.PI) % Math.PI) / Math.PI;
      const lift = Math.sin(frac * Math.PI) * 0.011;
      valves[0].position.y = TOP - (st.valve[0] ? lift : 0); valves[1].position.y = TOP - (st.valve[1] ? lift : 0);
      const gasTop = TOP, gasBot = yPin + 0.018;
      gas.scale.y = Math.max(0.001, gasTop - gasBot);
      // 气体颜色：做功冲程开始时最亮（燃烧），之后变暗；压缩时越压越深
      const c = new THREE.Color(st.gas);
      if (k === 2) c.lerp(new THREE.Color(0x9a9a9a), frac);
      if (k === 1) c.lerp(new THREE.Color(0xe0a060), frac * 0.6);
      gasMat.color.copy(c);
      flows.forEach((f, j) => {
        const open = st.valve[j] && lift > 0.003;
        f.g.visible = !!open;
        if (open) f.as.forEach((a, n) => { const u = (frac * 3 + n / 3) % 1; const p0 = flowPath(f.s, u), p1 = flowPath(f.s, Math.min(1, u + 0.12)); a.set(p0, p1.sub(p0).setLength(0.011)); });
      });
      spark.material.opacity = k === 2 && frac < 0.15 ? 1 - frac / 0.15 : 0;
      const dirDown = k === 0 || k === 2;
      pArrow.visible = Math.abs(S.w) > 0.05 || S.auto;
      pArrow.set(new THREE.Vector3(BORE / 2 + 0.02, yPin, 0.02), new THREE.Vector3(0, dirDown ? -0.025 : 0.025, 0));
      strokeTag.loc(group, -BORE / 2 - 0.05, TOP - 0.05, 0).text(S.shown ? st.name : '这是哪个冲程？');
    };
    layout();
    let a0 = null;
    const pointer = draggable(group, [{ obj: wheel, plane: 'xy', offset: -0.035, hint: '拖着飞轮转（顺时针）',
      onStart: (p) => { S.auto = false; a0 = p ? Math.atan2(p.x, p.y - CY) - S.a : null; },
      onDrag: (p) => { if (a0 == null) return; let na = Math.atan2(p.x, p.y - CY) - a0; while (na - S.a > Math.PI) na -= 2 * Math.PI; while (na - S.a < -Math.PI) na += 2 * Math.PI; if (na > S.a) S.a = na; } }], { tip: tag('', 'pill') });

    return {
      group,
      size: { w: 0.2, d: 0.1, h: 0.22 },
      view: { elev: 8, azim: 0, lookY: 0.5, margin: 1.15 },
      pointer,
      mount(ui) {
        const run = seg('运转', ['停', '慢', '快'], (_, k) => { S.auto = k > 0; S.speed = k === 2 ? 6 : 1.2; });
        const names = seg('显示冲程名称', ['显示', '不显示（自己判断）'], (_, k) => { S.shown = !k; });
        const quiz = buttons(STROKES.map((st, i) => ({ text: st.name, ghost: true, onClick: () => answer(i) })));
        quiz.el.hidden = true;
        const answer = (i) => {
          const k = stroke();
          if (i !== k) return ui.status(`不对。看气门：进气门${STROKES[k].valve[0] ? '开' : '关'}、排气门${STROKES[k].valve[1] ? '开' : '关'}；活塞正在${STROKES[k].dir}运动。`);
          quiz.el.hidden = true; S.seen.add(`q${k}`);
          ui.status(`对，是<b>${STROKES[k].name}</b>：${STROKES[k].desc}`);
          if ([0, 1, 2, 3].every((j) => S.seen.has(`q${j}`))) W.goal.done('quiz');
        };
        const btns = buttons([{ text: '随机停在一个位置，考考我', onClick: () => { S.auto = false; run.set(0); const left = [0, 1, 2, 3].filter((j) => !S.seen.has(`q${j}`)); const k = (left.length ? left : [0, 1, 2, 3])[Math.floor(Math.random() * (left.length || 4))]; S.a = k * Math.PI + (0.3 + Math.random() * 0.3) * Math.PI; layout(); names.set(1); S.shown = false; quiz.el.hidden = false; ui.status('看气门的开闭和活塞运动的方向（往前拖一点飞轮看看活塞往哪走）：这是哪个冲程？'); } }]);
        ui.controls.append(note('<b>拖着飞轮</b>慢慢转，看活塞、气门、缸内气体；也可以让它自己运转。'), run.el, names.el, btns.el, quiz.el);
        W = { status: (m) => ui.status(m), goal: goals(ui, [['cycle', '拖着飞轮转完一个工作循环（两圈）'], ['quiz', '四个冲程各认对一次']]) };
        ui.status('<b>拖着飞轮</b>顺时针转，看一个工作循环里发生了什么。');
      },
      update(dt) {
        if (S.auto) S.a += dt * S.speed * Math.PI;
        layout();
        const k = stroke();
        if (k !== S.lastStroke) {
          if (S.shown && W) W.status(`<b>${STROKES[k].name}</b>：${STROKES[k].desc}`);
          S.seen.add(`s${k}`); S.lastStroke = k;
          if ([0, 1, 2, 3].every((j) => S.seen.has(`s${j}`)) && S.a > 4 * Math.PI) W?.goal.done('cycle');
        }
      },
      debug: { S },
    };
  },
};
