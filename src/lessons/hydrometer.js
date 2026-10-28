// 图10.4-5 / 10.4-6 跨学科实践：制作微型密度计。实心塑料杆（直径约 3 mm，长 8 cm）做标度杆，中部套一个直径约 1.2 cm 的泡沫塑料球做浮子，
// 下端缠铜丝做配重。① 在水中调节配重：浮子浸没、水面上方露出一段标度杆；② 放入标准消毒酒精（0.87 g/cm³），在液面处贴彩色胶布做记号；
// ③ 测老师准备的三瓶酒精，判断哪瓶合格、哪瓶密度偏大、哪瓶偏小。
// 直接操作：拖密度计放进某个瓶子；点铜丝多缠一圈 / 面板减一圈；点标度杆上液面的位置贴胶布。
// 物理：漂浮时 ρ液 g V排 = m g，V排 = 铜丝体积 + 浸入部分的标度杆 + 浮子浸入的部分；解出浸入深度。
import * as THREE from 'three';
import { buttons, goals, note, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { paint, inked, hull } from '../live/ink.js';

const K = 1;                                   // 场景 1 单位 = 1 m；标度杆 8 cm 画成真实大小再放大
const SC = 2.2;                                // 放大倍数（器材很小）
const ROD = 0.11, A = 0.07e-4, BALL_R = 0.006, BALL_Y = 0.025, M_ROD = 0.62e-3, M_BALL = 0.02e-3, CU_TURN = 0.06e-3, RHO_CU = 8.9e3;
const BOTTLES = [{ k: 'water', label: '水', rho: 1.0 }, { k: 'std', label: '标准消毒酒精', rho: 0.87 }, { k: 'a', label: '酒精 甲', rho: 0.87 }, { k: 'b', label: '酒精 乙', rho: 0.83 }, { k: 'c', label: '酒精 丙', rho: 0.92 }];
const BH = 0.22, BRAD = 0.02;                 // 瓶子（真实尺寸的放大后）

// 浸入深度 d（从杆底量）时排开液体的体积（m³）
function vSub(d, cuV) {
  let v = cuV + A * clamp(d, 0, ROD);
  const h = clamp(d - (BALL_Y - BALL_R), 0, 2 * BALL_R);          // 球浸入的高度
  v += (Math.PI * h * h * (3 * BALL_R - h)) / 3;
  return v;
}

export default {
  id: 'hydrometer',
  fig: '图10.4-5',
  title: '制作微型密度计',
  stampText: '测量',
  predict: {
    q: '同一个密度计，漂浮在密度<b>较小</b>的酒精里，和漂浮在密度较大的酒精里相比——',
    hint: '课本第 77–80 页',
    options: ['浸入得深一些（液面在标度杆上的位置高）', '浸入得浅一些', '一样深'],
    answer: 0,
  },
  conclusion: {
    page: 82, rect: [160, 46, 460, 262],
    quote: '密度计所受浮力的大小等于它所受的重力，浮力的大小决定了排开酒精的体积。……可以认为消毒酒精的密度为 0.86×10³～0.88×10³ kg/m³ 是合格的。',
    why: '密度计漂浮时，浮力等于它的重力，不论放在哪种液体里浮力都一样大。由 F浮 = ρ液 g V排，液体的密度越小，排开液体的体积越大，密度计浸入得越深——所以液面落在标准记号<b>上方</b>的酒精密度偏小，落在记号<b>下方</b>的密度偏大。标度杆细，液体密度改变一点，液面位置就变化明显，读起来更灵敏；配重放在最下面，密度计才能竖直漂浮。',
    src: '课本第 77–80 页 · 第十章 第4节 跨学科实践：制作微型密度计',
  },

  create({ tag, look, back }) {
    const group = new THREE.Group();
    const S = { turns: 6, in: null, d: 0, mark: null, held: false, pos: new THREE.Vector3(), seen: new Set(), judged: {} };
    let W = null;
    const status = (m) => W?.status(m);
    // 瓶子排成一排
    const bottles = BOTTLES.map((b, i) => {
      const g = new THREE.Group(); g.position.set(-0.16 + i * 0.08, 0, 0);
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(BRAD, BRAD, BH, 24, 1, true), paint(0xd6ecf5, { unique: true, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide })); wall.position.y = BH / 2;
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(BRAD * 0.96, BRAD * 0.96, BH * 0.85, 24), new THREE.MeshBasicMaterial({ color: b.k === 'water' ? 0x9fd3ec : 0xe6f0f4, transparent: true, opacity: 0.45, depthWrite: false })); liq.position.y = BH * 0.425;
      const surf = new THREE.Mesh(new THREE.CircleGeometry(BRAD * 0.96, 24), new THREE.MeshBasicMaterial({ color: 0x7fb6d6, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })); surf.rotation.x = -Math.PI / 2; surf.position.y = BH * 0.85;
      g.add(wall, liq, surf); group.add(g);
      tag(b.label, 'pill').loc(group, g.position.x, 0.0, 0.03);
      return { ...b, g, top: BH * 0.85 };
    });
    // 密度计（按 SC 放大画）
    const hm = new THREE.Group();
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.0015 * SC, 0.0015 * SC, ROD * SC, 10), paint(0xeef4ea)); rod.position.y = (ROD * SC) / 2;
    const ball = hull(new THREE.Mesh(new THREE.SphereGeometry(BALL_R * SC, 20, 14), paint(0xf08a7a)), 0.001); ball.position.y = BALL_Y * SC;
    const cu = new THREE.Group(); hm.add(rod, ball, cu);
    // 铜丝很细，点它不容易点中：套一个看不见的拾取盒
    const cuPick = new THREE.Mesh(new THREE.BoxGeometry(0.012 * SC, 0.014 * SC, 0.012 * SC), new THREE.MeshBasicMaterial({ visible: false }));
    cuPick.position.y = 0.007 * SC; cuPick.userData.pick = true; hm.add(cuPick);
    const tape = new THREE.Mesh(new THREE.CylinderGeometry(0.0017 * SC, 0.0017 * SC, 0.0008 * SC, 10), paint(0xd9483b)); tape.visible = false; hm.add(tape);     // 窄窄一道红线：比的是液面和这道线
    const buildCu = () => { while (cu.children.length) cu.remove(cu.children[0]); for (let i = 0; i < S.turns; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.0019 * SC, 0.0005 * SC, 6, 14), paint(0xc8743a)); t.rotation.x = Math.PI / 2; t.position.y = (0.0015 + i * 0.0011) * SC; cu.add(t); } };
    buildCu();
    group.add(hm);
    // 改配重（放在瓶子里也可以直接改，密度计会重新浮到新的位置）；已经贴好的记号随之作废
    const setTurns = (n) => {
      n = Math.max(0, Math.min(16, n)); if (n === S.turns) return;
      S.turns = n; buildCu();
      if (S.mark != null) { S.mark = null; tape.visible = false; S.judged = {}; W?.hideAsk?.(); W?.restart?.(); return status(`铜丝 ${n} 圈。配重变了，原来贴的记号<b>作废</b>，上面的判断也不能算了——在标准酒精里重新贴记号，再判断三瓶。`); }
      if (S.in) return dropInto(S.in);
      status(`铜丝 ${n} 圈。`);
    };
    const mass = () => M_ROD + M_BALL + S.turns * CU_TURN;
    const cuV = () => (S.turns * CU_TURN) / RHO_CU;
    // 在液体 rho 中漂浮的浸入深度（m）；沉底返回 Infinity
    const depth = (rho) => { const m = mass(); let lo = 0, hi = ROD; if (rho * 1000 * vSub(ROD, cuV()) < m) return Infinity; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (rho * 1000 * vSub(mid, cuV()) > m) hi = mid; else lo = mid; } return (lo + hi) / 2; };
    const home = new THREE.Vector3(0.24, 0.0, 0.0);
    S.pos.copy(home);

    const dropInto = (b) => {
      S.in = b; S.d = 0;
      const dd = depth(b.rho);
      if (b.k === 'water') {
        if (dd === Infinity) return status('密度计<b>沉底</b>了：配重太重。点“减一圈铜丝”。');
        if (dd < BALL_Y + BALL_R) return status('浮子没有浸没，密度计浮得太高，放到酒精里也看不出差别。<b>多缠几圈铜丝</b>（点铜丝）。');
        W?.goal.done('water'); status(`调好了：浮子浸没在水中，水面上方露出 ${((ROD - dd) * 100).toFixed(1)} cm 标度杆。现在把它放进<b>标准消毒酒精</b>里。`);
      } else if (b.k === 'std') {
        if (!S.seen.has('waterOK') && !W?.goal.has?.('water')) {}
        status(dd === Infinity ? '在酒精里沉底了：配重太重，回到水里调一调。' : '待密度计静止，<b>点标度杆上液面的位置</b>，贴上红色胶布做记号。');
      } else {
        if (S.mark == null) return status('先在标准消毒酒精里做好记号。');
        W?.ask(b, dd);
      }
    };
    const pointer = draggable(group, [
      { obj: rod, anchor: hm, plane: 'xy', offset: 0, keepOffset: true, hint: '拖起来，放进一个瓶子', onStart: () => { S.held = true; S.in = null; W?.hideAsk?.(); }, onDrag: (p) => { S.pos.set(clamp(p.x, -0.2, 0.26), clamp(p.y, 0, 0.3), 0); },
        onEnd: () => { S.held = false; const b = bottles.find((x) => Math.abs(x.g.position.x - S.pos.x) < 0.03); if (b) dropInto(b); else { S.pos.copy(home); } } },
    ], { tip: tag('', 'pill'), taps: [
      { obj: cuPick, hint: '点一下：多缠一圈铜丝', onTap: () => setTurns(S.turns + 1) },
    ] });
    // 贴胶布：点标度杆（在标准酒精里时）
    const markTap = { down: (ray, e) => {
      if (S.in?.k === 'std' && S.mark == null && ray.intersectObject(rod, false).length && !S.held) {     // 贴好以后再按住标度杆就是拖走它
        const dd = depth(S.in.rho); if (dd === Infinity) return true;
        S.mark = dd; tape.visible = true; tape.position.y = dd * SC; W?.goal.done('mark');
        status('贴好了记号（红色胶布）。现在把密度计分别放进<b>甲、乙、丙</b>三瓶酒精里，看液面在记号的上方还是下方。');
        return true;
      }
      return pointer.down(ray, e);
    }, items: pointer.items, move: (r, e) => pointer.move(r, e), up: (r, e) => pointer.up(r, e) };

    return {
      group,
      size: { w: 0.5, d: 0.08, h: 0.26 },
      view: { elev: 8, azim: 0, lookY: 0.5, margin: 1.05 },
      pointer: markTap,
      mount(ui) {
        const tb = table(['酒精', '液面在记号的', '判断']);
        const pick = buttons([0, 1, 2].map(() => ({ text: '', ghost: true, onClick: () => {} })));
        pick.el.hidden = true;
        W = { status: (m) => ui.status(m), hideAsk: () => (pick.el.hidden = true), restart: () => { tb.clear(); W.goal.undo('mark', 'judge'); } };
        W.ask = (b, dd) => {
          if (S.judged[b.k]) return ui.status(`${b.label}已经判断过了。`);
          const right = Math.abs(b.rho - 0.87) < 0.005 ? '合格' : b.rho < 0.87 ? '密度偏小' : '密度偏大';
          const opts = ['合格', '密度偏小', '密度偏大'];
          pick.btns.forEach((bt, j) => { bt.textContent = opts[j]; bt.onclick = () => {
            if (opts[j] !== right) return ui.status('再看看：液面在红色记号的上方（浸得更深）还是下方（浸得更浅）？浸得越深，液体的密度越小。');
            if (S.mark == null) { pick.el.hidden = true; return ui.status('配重改过了，记号作废——先回标准酒精里重新贴记号。'); }
            pick.el.hidden = true; S.judged[b.k] = true;
            tb.add([b.label, Math.abs(dd - S.mark) < 0.0004 ? '正好在记号处' : dd > S.mark ? '上方' : '下方', right]);
            if (Object.keys(S.judged).length >= 3) W.goal.done('judge');
            back();
            ui.status(`${b.label}：${right}。${Object.keys(S.judged).length < 3 ? '把密度计拖到下一瓶酒精里。' : ''}`);
          }; });
          pick.el.hidden = false;
          look([b.g.position.x, b.top + 0.01, 0], [0, 0.1, 1], 0.12, () => back());
          ui.status(`凑近看：${b.label}的液面在红线的上方还是下方？这瓶酒精——`);
        };
        ui.controls.append(note('<b>拖密度计</b>放进一个瓶子；<b>点铜丝</b>多缠一圈；在标准酒精里时<b>点标度杆</b>贴记号。'), buttons([{ text: '多缠一圈铜丝', ghost: true, onClick: () => setTurns(S.turns + 1) }, { text: '减一圈铜丝', ghost: true, onClick: () => setTurns(S.turns - 1) }, { text: '拿出来', ghost: true, onClick: () => { S.in = null; S.pos.copy(home); pick.el.hidden = true; } }]).el, pick.el);
        ui.data.append(tb.el);
        W.goal = goals(ui, [['water', '① 在水中调好配重：浮子浸没，露出一段标度杆'], ['mark', '② 在标准消毒酒精中贴记号'], ['judge', '③ 判断甲、乙、丙三瓶酒精']]);
        ui.status('先调配重：把密度计<b>拖进水里</b>，看它浮得怎么样。');
      },
      update(dt) {
        let target;
        if (S.in && !S.held) {
          const dd = depth(S.in.rho);
          const bottomY = dd === Infinity ? 0.004 : S.in.top - dd * SC;
          target = new THREE.Vector3(S.in.g.position.x, Math.max(0.004, bottomY), 0);
        } else target = S.pos;
        hm.position.lerp(target, Math.min(1, dt * (S.held ? 30 : 4)));
      },
      debug: { S, depth },
    };
  },
};
