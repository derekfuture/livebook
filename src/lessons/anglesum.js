// 数学 八年级上册 13.3.1 三角形的内角 · 图13.3-1（探究：把 ∠B 和 ∠C 剪下，拼在 ∠A 的左右）。课本第 11–12 页。
//
// 一件事：三个角拼成平角时出现的那条直线 l，就是证明里要作的那条平行线。
// 学生亲手做的：
//   1. 把 ∠B 撕下来，绕 AB 的中点转半圈，落到 A 的左边；∠C 绕 AC 的中点转半圈，落到 A 的右边（课本图 13.3-1（1））。
//      不是“吸过去”：转半圈是看得见的动作——转过去的那条边和 BC 平行（内错角相等）。
//   2. 两块的外边连成一条直线 l。
//   3. 拖三角形的顶点换形状：贴在 A 旁边的两个角跟着变，外边始终是一条直线。
// 画面不显示角度的数值：课本说得很清楚，量总有误差，靠量不能确认；这里看的是“为什么一定是平角”。
import * as THREE from 'three';
import { sheet, stroke, piece, text, arcPts, tweens, add, sub, mul, unit, ang, rot, mid, dist, wrap, clamp, easeOut, INK, CYAN, PENCIL } from './kit/sheet.js';
import { draggable } from './kit/interact.js';
import { sfx } from './kit/audio.js';

const W = 0.30, D = 0.20;          // 纸的大小（米）
const R = 0.03;                    // 撕下来的角：从顶点起沿边多长
const TEAL = '#9fd3dc', PINK = '#ecc6e1', TEAL_D = '#3f97a8', PINK_D = '#b9679f';
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];

export default {
  id: 'anglesum',
  fig: '图13.3-1',
  title: '三角形的内角',
  flow: 'explore',
  ask: '小学时量过、拼过：三角形的三个内角加起来是 180°。可是量总有误差，三角形又有无数个，量不完。<br>这一次把角撕下来拼一拼——拼出来的那条线，会告诉我们为什么<b>一定</b>是 180°。',
  need: '把 ∠B、∠C 都转到 A 旁边，再拖动顶点换几个形状',
  conclusion: {
    quote: '三角形的内角和等于180°。',
    why: '课本的证明（图13.3-2）：过点 <i>A</i> 作直线 <i>l</i>，使 <i>l</i>∥<i>BC</i>。<br>∵ <i>l</i>∥<i>BC</i>，∴ ∠2＝∠4（两直线平行，内错角相等）。同理 ∠3＝∠5。<br>∵ ∠1，∠4，∠5 组成平角，∴ ∠1＋∠4＋∠5＝180°（平角定义）。<br>∴ ∠1＋∠2＋∠3＝180°（等量代换）。<br><br>你刚才拼出来的那条直线，就是这里的 <i>l</i>：转过去的 ∠B、∠C 就是 ∠4、∠5。量和拼只能发现规律；这样推出来，才对<b>任意</b>一个三角形都成立。',
    src: '课本第 11–12 页 · 第十三章 13.3.1 三角形的内角',
  },

  create() {
    const group = new THREE.Group();
    const tw = tweens();
    const paper = sheet({ w: W, d: D });
    group.add(paper.group);
    const root = paper.group;

    const T = { A: [-0.012, 0.046], B: [-0.088, -0.054], C: [0.082, -0.054] };
    const S = { B: { on: 0, held: false, placed: false }, C: { on: 0, held: false, placed: false }, moved: 0, line: 0, why: 0, done: false };
    let ui = null, dead = false;

    // ---- 纸片：三角形（撕掉两个角以后剩下的）、∠B、∠C ----
    const main = piece(root, null, { color: '#ffffff', y: 0.0005 });
    const cut = { B: piece(root, null, { color: TEAL, edge: TEAL_D, y: 0.0008, order: 7 }), C: piece(root, null, { color: PINK, edge: PINK_D, y: 0.0008, order: 7 }) };
    // 角原来的位置：撕走以后留下一个淡淡的影子（同样的颜色），看得出转过去的是哪个角
    const ghost = { B: piece(root, null, { color: TEAL, opacity: 0.3, edge: TEAL_D, y: 0.0002, shadow: false, order: 3 }), C: piece(root, null, { color: PINK, opacity: 0.3, edge: PINK_D, y: 0.0002, shadow: false, order: 3 }) };
    const tear = { B: stroke({ width: 0.0005, color: TEAL_D, dash: [0.0022, 0.0016], y: 0.0011, order: 9 }), C: stroke({ width: 0.0005, color: PINK_D, dash: [0.0022, 0.0016], y: 0.0011, order: 9 }) };
    const path = { B: stroke({ width: 0.00045, color: PENCIL, opacity: 0.55, dash: [0.003, 0.0025], y: 0.00035 }), C: stroke({ width: 0.00045, color: PENCIL, opacity: 0.55, dash: [0.003, 0.0025], y: 0.00035 }) };
    const pivotDot = { B: stroke({ width: 0.0014, color: PENCIL, y: 0.0012, order: 9 }), C: stroke({ width: 0.0014, color: PENCIL, y: 0.0012, order: 9 }) };
    const lineL = stroke({ width: 0.0006, color: INK, dash: [0.004, 0.0024], y: 0.0013, order: 10 });
    const par = [stroke({ width: 0.0012, color: CYAN, y: 0.0014, order: 11 }), stroke({ width: 0.0012, color: CYAN, y: 0.0014, order: 11 }), stroke({ width: 0.0012, color: CYAN, y: 0.0014, order: 11 })];
    const arcA = stroke({ width: 0.0005, color: INK, y: 0.0011, order: 9 });
    // 能拖的顶点：一个白心的小圆点（∠B、∠C 撕走以后，B、C 才变成能拖的点）
    const dot = (k) => { const g = new THREE.Group(); const f = new THREE.Mesh(new THREE.CircleGeometry(0.0021, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); f.renderOrder = 12; f.raycast = () => {}; f.userData.noFrame = true; const o = stroke({ width: 0.0006, color: INK, y: 0.0001, order: 13 }).set(arcPts([0, 0], 0.0021, 0, Math.PI * 2, 24), true); g.add(f, o); g.position.y = 0.0019; root.add(g); return g; };
    const dots = { A: dot('A'), B: dot('B'), C: dot('C') };
    root.add(...Object.values(tear), ...Object.values(path), ...Object.values(pivotDot), lineL, ...par, arcA);

    const lab = { A: text(root, 'A', { math: true, h: 0.0085 }), B: text(root, 'B', { math: true, h: 0.0085 }), C: text(root, 'C', { math: true, h: 0.0085 }), l: text(root, 'l', { math: true, h: 0.0085 }),
      b: text(root, 'B', { math: true, h: 0.0062, color: '#1f6f80', y: 0.0016 }), c: text(root, 'C', { math: true, h: 0.0062, color: '#8c3f77', y: 0.0016 }), a: text(root, 'A', { math: true, h: 0.0062, y: 0.0016 }) };
    const note = text(root, '', { hand: true, h: 0.0072, color: '#4a5165' });
    const head = text(root, '三角形的内角和，为什么一定是 180°？', { h: 0.0082, color: '#2a3550', weight: 600 }); head.at(-W / 2 + 0.022 + head.scale.x / 2, D / 2 - 0.0135);

    // ---- 几何 ----
    const other = (k) => (k === 'B' ? ['A', 'C'] : ['B', 'A']);          // 角 B 的两条边朝 A、C；角 C 的两条边朝 B、A
    const rmax = () => Math.min(R, 0.42 * Math.min(dist(T.A, T.B), dist(T.A, T.C), dist(T.B, T.C)));
    /** 顶点 V 处撕下来的那一角：从 VP 边上的一点，沿一道不整齐的撕口，到 VQ 边上的一点 */
    const wedge = (V, Pp, Q, r, seed) => {
      const a0 = ang(sub(Pp, V)), sw = wrap(ang(sub(Q, V)) - a0), n = 22, out = [];
      for (let i = 0; i <= n; i++) { const f = i / n, env = Math.sin(Math.PI * f); const rr = r * (1 + env * (0.085 * Math.sin(f * Math.PI * 3 + seed) + 0.04 * Math.sin(f * Math.PI * 7.3 + seed * 2.1))); out.push([V[0] + Math.cos(a0 + sw * f) * rr, V[1] + Math.sin(a0 + sw * f) * rr]); }
      return out;
    };
    const swing = (k) => { const V = T[k], M = mid(T.A, V), O = k === 'B' ? T.C : T.B; const side = Math.sign(cross(sub(T.A, V), sub(O, V))); const s = Math.sign(cross(sub(T.A, V), sub(rot(V, M, Math.PI / 2), V))) === side ? -1 : 1; return { M, s }; };

    const build = () => {
      const r = rmax();
      const wB = wedge(T.B, T.A, T.C, r, 0.6), wC = wedge(T.C, T.B, T.A, r, 2.3);
      main.set([T.A, ...wB, ...wC], T.A);
      for (const k of ['B', 'C']) {
        const w = k === 'B' ? wB : wC, { M, s } = swing(k);
        cut[k].set([T[k], ...w], M); cut[k].pose({ a: s * S[k].on * Math.PI, lift: cut[k].lift });
        ghost[k].set([T[k], ...w], T[k]);
        tear[k].set(w);
        path[k].set(arcPts(M, dist(M, T[k]), ang(sub(T[k], M)), ang(sub(T[k], M)) + s * Math.PI));
        pivotDot[k].set(arcPts(M, 0.0007, 0, Math.PI * 2, 10), true);
      }
      // ∠A 的小弧
      const a0 = ang(sub(T.B, T.A)), sw = wrap(ang(sub(T.C, T.A)) - a0);
      arcA.set(arcPts(T.A, 0.011, a0, a0 + sw));
      const e = unit(sub(T.C, T.B)), up = [-e[1], e[0]];
      lab.A.at(...add(T.A, mul(up, 0.0085)));
      lab.B.at(...add(T.B, add(mul(e, -0.006), mul(up, -0.006))));
      lab.C.at(...add(T.C, add(mul(e, 0.006), mul(up, -0.006))));
      const bis = unit(add(unit(sub(T.B, T.A)), unit(sub(T.C, T.A))));
      lab.a.at(...add(T.A, mul(bis, 0.0185)));
      layout();
    };
    /** 跟着纸片走的东西：角上的字、直线 l、平行的三段 */
    const layout = () => {
      const r = rmax(), e = unit(sub(T.C, T.B));
      for (const k of ['B', 'C']) {
        const P = cut[k], o = other(k), bis = unit(add(unit(sub(T[o[0]], T[k])), unit(sub(T[o[1]], T[k]))));
        const c = P.at(add(T[k], mul(bis, r * 0.56)));
        (k === 'B' ? lab.b : lab.c).at(c[0], c[1], 0.0016 + P.lift);
        const away = S[k].on > 0.02;
        ghost[k].show(away); tear[k].show(!away && !S[k].held);
        path[k].show(S[k].held || (S[k].on > 0.02 && S[k].on < 0.98)); pivotDot[k].show(path[k].visible);
      }
      // 直线 l：两个角都贴好以后，从 A 往两边画出来
      const k = easeOut(S.line), LL = r + 0.034;
      lineL.set(k > 0.01 ? [add(T.A, mul(e, -LL * k)), add(T.A, mul(e, LL * k))] : null);
      lab.l.at(...add(T.A, add(mul(e, LL + 0.006), [0, 0.001]))).fade(clamp((S.line - 0.7) / 0.3, 0, 1));
      // 平行：BC，和转过去的两条边（它们原来都在 BC 上）
      const w = easeOut(S.why);
      par[0].set(w > 0.01 ? [T.B, add(T.B, mul(sub(T.C, T.B), w))] : null);
      par[1].set(w > 0.01 ? [T.A, add(T.A, mul(e, -r * w))] : null);
      par[2].set(w > 0.01 ? [T.A, add(T.A, mul(e, r * w))] : null);
    };

    // ---- 提示 ----
    const say = (s, html = s) => { note.say(s).at(-W / 2 + 0.024 + note.scale.x / 2, -D / 2 + 0.017); ui?.status(html); };
    const both = () => S.B.placed && S.C.placed;
    const hint = () => {
      if (!S.B.placed && !S.C.placed) return say('把 ∠B 撕下来，绕着 AB 的中点转到 A 旁边', '按住左下角的 <b>∠B</b>，把它撕下来，沿着虚线转到 <b>A</b> 的旁边。');
      if (!both()) { const k = S.B.placed ? 'C' : 'B'; return say(`再把 ∠${k} 也转过去`, `再把 <b>∠${k}</b> 也转到 A 的旁边。`); }
      if (S.moved < 3) return say('三个角拼成了一个平角。拖一拖顶点，换个形状', '三个角拼成了一个<b>平角</b>，出现一条过点 A 的直线 <i>l</i>。<br>拖一拖三角形的顶点，换个形状再看。');
      return say('转过去的边都和 BC 平行；过 A 这样的直线只有一条', '不管什么形状，都是一条直线。为什么？<br>∠B、∠C 各转了半圈：转过去的那条边（蓝色）和 <i>BC</i> <b>平行</b>。过点 A 和 <i>BC</i> 平行的直线只有一条，所以它们连成了同一条直线 <i>l</i>。');
    };
    const check = () => {
      placeKnobs();
      if (both() && !S.lineOn) { S.lineOn = true; tw.to(0.7, (k) => { S.line = k; layout(); }); sfx.ding(660, { gain: 0.05 }); }
      if (!both() && S.lineOn) { S.lineOn = false; S.line = 0; S.why = 0; S.whyOn = false; layout(); }
      if (both() && S.moved >= 3 && !S.whyOn) { S.whyOn = true; tw.to(0.8, (k) => { S.why = k; layout(); }); }
      if (both() && S.moved >= 3 && !S.done) { S.done = true; ui?.unlock(); setTimeout(() => { if (!dead) { ui?.go?.(1); ui?.fold?.(false); } }, 1400); }
      hint();
    };

    // ---- 拖动 ----
    const uv = (p) => [p.x, -p.z];
    const settle = (k, to) => {
      const from = S[k].on, lift0 = cut[k].lift;
      S[k].held = false;
      tw.to(0.28 + Math.abs(to - from) * 0.3, (x) => { const e = easeOut(x); S[k].on = from + (to - from) * e; cut[k].pose({ a: swing(k).s * S[k].on * Math.PI, lift: lift0 * (1 - e) }); layout(); },
        () => { S[k].placed = to === 1; if (to === 1) sfx.clink({ freq: 1500, gain: 0.05 }); check(); });
    };
    const cornerDrag = (k) => ({
      obj: cut[k].fill, plane: 'xz', offset: 0.001,
      hint: () => (S[k].placed ? '还可以转回去' : `把 ∠${k} 撕下来，转到 A 旁边`),
      onStart: () => { tw.clear(); S[k].held = true; S[k].placed = false; cut[k].pose({ lift: 0.0035 }); if (S[k].on < 0.02) sfx.whoosh({ dur: 0.18, freq: 2600, gain: 0.05 }); layout(); },
      onDrag: (p) => {
        const q = uv(p), V = T[k], AB = sub(T.A, V), t = clamp(((q[0] - V[0]) * AB[0] + (q[1] - V[1]) * AB[1]) / (AB[0] ** 2 + AB[1] ** 2), 0, 1);
        S[k].on = Math.acos(1 - 2 * t) / Math.PI;          // 纸片在弧线上的位置，正好在鼠标的正对面（沿 AB 方向对齐）
        cut[k].pose({ a: swing(k).s * S[k].on * Math.PI, lift: 0.0035 }); layout();
      },
      onEnd: () => settle(k, S[k].on > 0.6 ? 1 : 0),
    });
    // 顶点的把手：看不见的小圆片。∠B、∠C 撕走以前，那两个角本身是用来撕的，所以要等撕走以后才能拖 B、C
    const knob = (k) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.0105, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ visible: false })); m.userData.pick = true; m.userData.noFrame = true; root.add(m); return m; };
    const knobs = { A: knob('A'), B: knob('B'), C: knob('C') };
    const placeKnobs = () => { for (const k of ['A', 'B', 'C']) { knobs[k].position.set(T[k][0], 0.0045, -T[k][1]); dots[k].position.set(T[k][0], 0.0019, -T[k][1]); dots[k].visible = k === 'A' || S[k].placed; } };
    const valid = (t) => {
      const { A, B, C } = t;
      if (cross(sub(C, B), sub(A, B)) <= 0) return false;                                  // 不能翻过去
      const sides = [dist(A, B), dist(B, C), dist(C, A)];
      if (Math.min(...sides) < 0.075) return false;
      const angs = [[A, B, C], [B, C, A], [C, A, B]].map(([v, p, q]) => Math.abs(wrap(ang(sub(p, v)) - ang(sub(q, v)))));
      if (Math.min(...angs) < 0.38) return false;                                          // 每个角至少 22° 左右，不然纸片太尖看不清
      const e = unit(sub(C, B)), r = R + 0.04;
      for (const p of [A, B, C, add(A, mul(e, r)), add(A, mul(e, -r))]) if (Math.abs(p[0]) > W / 2 - 0.02 || p[1] > D / 2 - 0.034 || p[1] < -D / 2 + 0.028) return false;
      return true;
    };
    const vertexDrag = (k) => ({
      obj: knobs[k], plane: 'xz', offset: 0, keepOffset: false,
      enabled: () => !tw.busy && (k === 'A' || S[k].placed) && !S.B.held && !S.C.held,
      hint: () => '拖一拖，换个形状',
      onStart: (p) => { const q = uv(p); S.grab = sub(T[k], q); S.from = [...T[k]]; },
      onDrag: (p) => {
        const q = add(uv(p), S.grab), t = { ...T, [k]: q };
        if (!valid(t)) return;
        T[k] = q; build(); placeKnobs();
      },
      onEnd: () => { if (dist(S.from, T[k]) > 0.012) S.moved++; check(); },
    });
    // 在纸上按下去没按中东西：不转镜头（纸是平的工作面，手一滑画面就歪了）；想转视角，在纸外面拖
    const pointer = draggable(group, [vertexDrag('A'), vertexDrag('B'), vertexDrag('C'), cornerDrag('B'), cornerDrag('C')], { onClick: (ray) => ray.intersectObject(paper.mesh, false).length > 0 });

    build(); placeKnobs(); hint();

    return {
      group,
      card: false,
      panel: 'folded',          // 面板先收成书脊：整张纸是主角，提示写在纸上
      place: 'spread',
      scale: 0.8,
      size: { w: W, d: D, h: 0.02 },
      view: { elev: 78, azim: 0, lookY: 0, frameMargin: 1.09 },          // 几乎从正上方看：斜着看角会变形
      pointer,
      mount(u) { ui = u; hint(); },
      dispose() { dead = true; },
      update(dt) {
        tw.update(dt);
        // 提示：该动的那个角自己沿着弧线轻轻掀一下（每 2.6 秒一次），一看就知道它能撕下来、往哪边转
        const next = S.B.held || S.C.held || tw.busy ? null : !S.B.placed && S.B.on === 0 ? 'B' : !S.C.placed && S.C.on === 0 && S.B.placed ? 'C' : null;
        S.clock = next ? (S.clock || 0) + dt : 0;
        for (const k of ['B', 'C']) {
          const ph = k === next ? (S.clock % 2.6) / 0.9 : 2, on = ph < 1 ? 0.045 * Math.sin(Math.PI * ph) ** 2 : 0;
          if (S[k].on === 0 && !S[k].held && (on > 0 || cut[k].a !== 0)) cut[k].pose({ a: swing(k).s * on * Math.PI, lift: on * 0.03 });
        }
      },
      // 给检查脚本用
      test: { T, S, cut, place: (k) => { S[k].on = 1; S[k].placed = true; build(); check(); }, move: (k, p) => { T[k] = p; S.moved++; build(); placeKnobs(); check(); } },
    };
  },
};
