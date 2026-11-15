// 数学 八年级下册 20.1 勾股定理及其应用 · 图20.1-5（赵爽的证法）。课本第 24–25 页。
//
// 一件事：边长 a、b 的两个正方形，只转动两块三角形，就变成一个边长 c 的正方形——没有多一点，也没有少一点，所以 a² + b² = c²。
// 课本原文：“把边长分别为 a，b 的两个正方形连在一起，它的面积是 a²+b²。这两个正方形还可以分割成四个全等的直角三角形（红色）
// 和一个正方形（黄色），把图 20.1-5（1）中左、右两个三角形移到图 20.1-5（2）中所示的位置，就会形成一个以 c 为边长的正方形”。
// 学生亲手做的：
//   1. 拖左、右两块三角形：各绕一颗图钉转 90°（转过的位置留下一串淡淡的影子）。
//   2. 拼好以后，四个角上各标出两个锐角——每个角都是“一个 ∠1 加一个 ∠2”，直角三角形的两个锐角互余，所以四个角都是直角：它确实是正方形。
//   3. 拖底边上的点，换一个直角三角形（a、b 的比例变了），纸片跟着重新剪，仍然成立。
// 图里的坐标（以两个正方形的左下角为原点）：a 正方形 [0,a]×[0,a]，b 正方形 [a,a+b]×[0,b]，底边上的分割点 P = (b, 0)。
import * as THREE from 'three';
import { sheet, stroke, piece, text, pin, arcPts, tweens, add, sub, mul, unit, ang, rot, mid, wrap, clamp, easeOut, INK, PENCIL, SERIF } from './kit/sheet.js';
import { draggable } from './kit/interact.js';
import { sfx } from './kit/audio.js';

const W = 0.30, D = 0.22, L = 0.15;          // 纸的大小；a + b
const O = [-0.118, -0.076];                  // 图的原点（两个正方形的左下角）在纸上的位置
const RED = '#e3382f', RED_D = '#8f1d18', YELLOW = '#f8d21c', YELLOW_D = '#9a7d00';
const Q = Math.PI / 2;

export default {
  id: 'xiantu',
  fig: '图20.1-5',
  title: '勾股定理',
  flow: 'explore',
  ask: '直角三角形两条直角边上的两个正方形，面积加起来等于斜边上的正方形——这是量出来、猜出来的。<br>我国古代数学家赵爽只动了两块纸，就让人看明白它为什么<b>一定</b>成立。你也来动一动。',
  need: '把两块三角形都转上去，再拖底边上的点换一个直角三角形',
  conclusion: {
    quote: '如果直角三角形的两条直角边长分别为a，b，斜边长为c，那么a²+b²=c²。',
    why: '赵爽的思路（图20.1-5）：把边长分别为 <i>a</i>，<i>b</i> 的两个正方形连在一起，它的面积是 <i>a</i>²＋<i>b</i>²。这两个正方形还可以分割成四个全等的直角三角形（红色）和一个正方形（黄色），把左、右两个三角形移到上面，就形成一个以 <i>c</i> 为边长的正方形，它的面积是 <i>c</i>²。前后都由四个全等的直角三角形和一个小正方形组成，面积相等，即 <i>a</i>²＋<i>b</i>²＝<i>c</i>²。<br><br>拼出来的为什么是正方形？四条边都是直角三角形的斜边 <i>c</i>；每个角都由一个 ∠1 和一个 ∠2 拼成，而直角三角形的两个锐角互余，所以四个角都是直角。<br>这种割下来、补上去的方法，是我国古代数学家常用的“<b>出入相补法</b>”。',
    src: '课本第 24–25 页 · 第二十章 20.1 勾股定理及其应用',
  },

  create() {
    const group = new THREE.Group();
    const tw = tweens();
    const paper = sheet({ w: W, d: D });
    group.add(paper.group);
    const root = paper.group;
    const S = { a: 0.06, t1: 0, t2: 0, held: null, sq: 0, ang: 0, moved: 0, done: false };          // t1、t2：两块三角形转了多少（0…1 对应 0…90°）
    let ui = null, dead = false;
    const g2 = (p) => add(O, p);

    // ---- 纸片 ----
    const tri = [0, 1, 2, 3].map(() => piece(root, null, { color: RED, edge: RED_D, y: 0.0006 }));          // 0 左（会转）、1 右（会转）、2 左中、3 右中
    const yel = piece(root, null, { color: YELLOW, edge: YELLOW_D, y: 0.0006 });
    tri[0].baseY = tri[1].baseY = 0.0009;
    // 两块三角形原来的位置：转走以后留下虚线
    const hole = [stroke({ width: 0.00045, color: PENCIL, opacity: 0.7, dash: [0.003, 0.0022] }), stroke({ width: 0.00045, color: PENCIL, opacity: 0.7, dash: [0.003, 0.0022] })];
    // 转动时留下的影子（每 15° 一个）
    const strobe = [0, 1].map(() => [1, 2, 3, 4, 5].map(() => stroke({ width: 0.0004, color: RED_D, opacity: 0.32, y: 0.0003 })));
    const sqA = stroke({ width: 0.001, color: INK, y: 0.0012, order: 9 }), sqB = stroke({ width: 0.001, color: INK, y: 0.0012, order: 9 });          // 开始时的两个正方形
    const sqC = stroke({ width: 0.0012, color: INK, y: 0.0016, order: 10 });                                                                       // 拼成的大正方形
    // 四个角上的 ∠1（一道弧）、∠2（两道弧）：红纸上用白线，旁边写 1、2
    const arcs = [0, 1, 2, 3, 4, 5, 6, 7].map(() => stroke({ width: 0.0008, color: '#ffffff', y: 0.0018, order: 11 }));
    const arcs2 = [0, 1, 2, 3].map(() => stroke({ width: 0.0008, color: '#ffffff', y: 0.0018, order: 11 }));
    const angLab = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => text(root, i % 2 ? '2' : '1', { h: 0.0052, color: '#ffffff', font: SERIF, weight: 600, y: 0.002, order: 12 }));
    const corner = [0, 1, 2, 3].map(() => stroke({ width: 0.0005, color: INK, y: 0.0018, order: 11 }));                                            // 直角记号
    root.add(...hole, ...strobe.flat(), sqA, sqB, sqC, ...arcs, ...arcs2, ...corner);
    const pins = [pin({ color: 0x2f6fb0 }), pin({ color: 0x2f6fb0 })];
    for (const p of pins) { p.position.y = 0.001; root.add(p); }
    const lab = { a1: text(root, 'a', { math: true, h: 0.008 }), b1: text(root, 'b', { math: true, h: 0.008 }), a2: text(root, 'a', { math: true, h: 0.008 }), b2: text(root, 'b', { math: true, h: 0.008 }),
      c1: text(root, 'c', { math: true, h: 0.008 }), c2: text(root, 'c', { math: true, h: 0.008 }), c3: text(root, 'c', { math: true, h: 0.008, y: 0.002 }), c4: text(root, 'c', { math: true, h: 0.008, y: 0.002 }) };
    const fml = { l: text(root, 'a² + b²', { math: true, h: 0.0125, weight: 500 }), r: text(root, '= c²', { math: true, h: 0.0125, weight: 500 }) };
    const sub1 = text(root, '', { hand: true, h: 0.0062, color: '#4a5165' }), sub2 = text(root, '', { hand: true, h: 0.0062, color: '#4a5165' });
    const note = text(root, '', { hand: true, h: 0.0068, color: '#4a5165' });
    const head = text(root, '两个正方形，怎样变成一个正方形？', { h: 0.0082, color: '#2a3550', weight: 600 }); head.at(-W / 2 + 0.022 + head.scale.x / 2, D / 2 - 0.0135);
    const handle = (() => { const g = new THREE.Group(); const f = new THREE.Mesh(new THREE.CircleGeometry(0.0024, 22).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); f.renderOrder = 12; f.raycast = () => {}; f.userData.noFrame = true; g.add(f, stroke({ width: 0.0006, color: INK, y: 0.0001, order: 13 }).set(arcPts([0, 0], 0.0024, 0, Math.PI * 2, 24), true)); g.position.y = 0.0022; root.add(g); return g; })();
    const knob = new THREE.Mesh(new THREE.CircleGeometry(0.0095, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ visible: false })); knob.userData.pick = true; knob.userData.noFrame = true; root.add(knob);

    // ---- 几何 ----
    const geo = () => {
      const a = S.a, b = L - a;
      return { a, b, P: g2([b, 0]), H1: g2([0, a]), H2: g2([L, b]), top: g2([a, L]),
        T: [[[0, 0], [b, 0], [0, a]], [[b, 0], [L, 0], [L, b]], [[0, a], [b, a], [b, 0]], [[b, 0], [b, b], [L, b]]].map((t) => t.map(g2)),
        Y: [[a, a], [b, a], [b, b], [a, b]].map(g2) };
    };
    const angleArc = (m, V, p, q, r) => { const a0 = ang(sub(p, V)), sw = wrap(ang(sub(q, V)) - a0); m.set(arcPts(V, r, a0, a0 + sw)); };
    const build = () => {
      const G = geo(), { a, b } = G;
      tri[0].set(G.T[0], G.H1); tri[1].set(G.T[1], G.H2); tri[2].set(G.T[2], G.T[2][0]); tri[3].set(G.T[3], G.T[3][0]);
      yel.show(b - a > 0.0015); if (b - a > 0.0015) yel.set(G.Y, G.Y[0]);
      pins[0].position.set(G.H1[0], 0.001, -G.H1[1]); pins[1].position.set(G.H2[0], 0.001, -G.H2[1]);
      hole[0].set(G.T[0], true); hole[1].set(G.T[1], true);
      for (const i of [0, 1]) strobe[i].forEach((m, k) => m.set(G.T[i].map((p) => rot(p, i ? G.H2 : G.H1, (i ? -1 : 1) * (k + 1) * (Q / 6))), true));
      sqA.set([[0, 0], [a, 0], [a, a], [0, a]].map(g2), true); sqB.set([[a, 0], [L, 0], [L, b], [a, b]].map(g2), true);
      sqC.set([G.H1, G.P, G.H2, G.top], true);
      // 四个角：每个角都是一个 ∠1（对着 a 的那个锐角）加一个 ∠2（对着 b 的那个锐角）。pairs[i] = [顶点, ∠1 的两条边, ∠2 的两条边]
      const r = 0.0105, V = [G.P, G.H2, G.top, G.H1], up = add(G.P, [0, 1]), lf = add(G.H2, [-1, 0]), dn = add(G.top, [0, -1]), rt = add(G.H1, [1, 0]);
      const pairs = [[G.P, [up, G.H2], [G.H1, up]], [G.H2, [lf, G.top], [G.P, lf]], [G.top, [dn, G.H1], [G.H2, dn]], [G.H1, [rt, G.P], [G.top, rt]]];
      pairs.forEach(([v, a1, a2], i) => {
        angleArc(arcs[2 * i], v, a1[0], a1[1], r); angleArc(arcs[2 * i + 1], v, a2[0], a2[1], r); angleArc(arcs2[i], v, a2[0], a2[1], r + 0.0016);
        [a1, a2].forEach((q, j) => { const bis = unit(add(unit(sub(q[0], v)), unit(sub(q[1], v)))); angLab[2 * i + j].at(...add(v, mul(bis, r + (j ? 0.0062 : 0.0046)))); });
      });
      V.forEach((v, i) => { const n = V[(i + 1) % 4], pv = V[(i + 3) % 4], e1 = unit(sub(n, v)), e2 = unit(sub(pv, v)), k = 0.0042; corner[i].set([add(v, mul(e1, k)), add(add(v, mul(e1, k)), mul(e2, k)), add(v, mul(e2, k))]); });
      lab.a1.at(...g2([-0.007, a / 2])); lab.b1.at(...g2([L + 0.007, b / 2])); lab.a2.at(...g2([b + a / 2, -0.007])); lab.b2.at(...g2([b / 2, -0.007]));
      const out = (p, q, k = 0.0075) => { const m = mid(p, q), e = unit(sub(q, p)); return add(m, mul([e[1], -e[0]], k)); };
      lab.c1.at(...out(G.H1, G.P)); lab.c2.at(...out(G.P, G.H2)); lab.c3.at(...out(G.H2, G.top)); lab.c4.at(...out(G.top, G.H1));
      handle.position.set(G.P[0], 0.0022, -G.P[1]); knob.position.set(G.P[0], 0.004, -G.P[1]);
      fml.l.at(0.085, 0.052); fml.r.at(0.085, 0.034);
      sub1.say('两个正方形').at(0.085, 0.066); sub2.say('一个正方形').at(0.085, 0.02);
      layout();
    };
    const layout = () => {
      tri[0].pose({ a: S.t1 * Q, lift: S.held === 0 ? 0.003 : 0 }); tri[1].pose({ a: -S.t2 * Q, lift: S.held === 1 ? 0.003 : 0 });
      [S.t1, S.t2].forEach((t, i) => { hole[i].show(t > 0.01); strobe[i].forEach((m, k) => m.show(t * 6 > k + 1 - 0.02 && t < 0.999)); });
      const two = S.t1 < 0.01 && S.t2 < 0.01;
      sqA.fade(two ? 1 : 0.25); sqB.fade(two ? 1 : 0.25);
      const q = easeOut(S.sq), k = easeOut(S.ang);
      sqC.show(q > 0.01).fade(q);
      for (const m of [...arcs, ...arcs2]) m.show(k > 0.01).fade(k);
      for (const m of angLab) m.fade(k);
      for (const m of corner) m.show(k > 0.6).fade(clamp((k - 0.6) / 0.4, 0, 1));
      for (const n of ['c1', 'c2', 'c3', 'c4']) lab[n].fade(q);
      fml.r.fade(q); sub2.fade(q);
    };

    // ---- 提示 ----
    const say = (s, html = s) => { note.say(s).at(-W / 2 + 0.024 + note.scale.x / 2, -D / 2 + 0.013); ui?.status(html); };
    const both = () => S.t1 === 1 && S.t2 === 1;
    const hint = () => {
      if (S.t1 < 1 && S.t2 < 1) return say('两个正方形连在一起：a² + b²。拖左边那块三角形，绕图钉转上去', '边长 <i>a</i>、<i>b</i> 的两个正方形连在一起，面积是 <i>a</i>²＋<i>b</i>²。<br>拖<b>左边那块三角形</b>，它会绕图钉转上去。');
      if (!both()) return say(`再把${S.t1 === 1 ? '右' : '左'}边那块也转上去`, `再把<b>${S.t1 === 1 ? '右' : '左'}边那块</b>三角形也转上去。`);
      if (S.moved < 2) return say('四条边都是 c，每个角都是 ∠1 + ∠2 = 90°：是正方形。拖底边上的点，换个三角形', '两个正方形变成了<b>一个正方形</b>，纸片一块没多、一块没少。<br>它真是正方形吗？四条边都是斜边 <i>c</i>；每个角都是一个 ∠1 加一个 ∠2（直角三角形的两个锐角），正好是直角。<br>拖一拖<b>底边上的白点</b>，换一个直角三角形再看。');
      return say('换了直角三角形，还是成立：a² + b² = c²', '不管直角三角形是胖是瘦，两个正方形都能这样变成一个：<i>a</i>²＋<i>b</i>²＝<i>c</i>²。');
    };
    const check = () => {
      if (both() && !S.sqOn) { S.sqOn = true; sfx.ding(660, { gain: 0.05 }); tw.to(0.7, (k) => { S.sq = k; layout(); }, () => tw.to(0.9, (k) => { S.ang = k; layout(); })); }
      if (!both() && S.sqOn) { S.sqOn = false; tw.clear(); S.sq = 0; S.ang = 0; layout(); }
      if (both() && S.moved >= 2 && !S.done) { S.done = true; ui?.unlock(); setTimeout(() => { if (!dead) { ui?.go?.(1); ui?.fold?.(false); } }, 1400); }
      hint();
    };

    // ---- 拖动 ----
    const uv = (p) => [p.x, -p.z];
    const turn = (i) => ({
      obj: tri[i].fill, plane: 'xz', offset: 0.001,
      hint: () => ((i ? S.t2 : S.t1) === 1 ? '还可以转回来' : '拖一拖：绕图钉转上去'),
      onStart: (p) => { tw.clear(); if (S.sqOn) { S.sq = both() ? 1 : 0; S.ang = both() ? S.ang : 0; } const G = geo(), H = i ? G.H2 : G.H1; S.held = i; S.grabA = ang(sub(uv(p), H)); S.grabT = i ? S.t2 : S.t1; layout(); },
      onDrag: (p) => {
        const G = geo(), H = i ? G.H2 : G.H1, d = wrap(ang(sub(uv(p), H)) - S.grabA) * (i ? -1 : 1);
        const t = clamp(S.grabT + d / Q, 0, 1);
        if (i) S.t2 = t; else S.t1 = t;
        if (S.sqOn && !both()) { S.sqOn = false; S.sq = 0; S.ang = 0; hint(); }
        layout();
      },
      onEnd: () => {
        const from = i ? S.t2 : S.t1, to = from > 0.5 ? 1 : 0; S.held = null;
        tw.to(0.12 + Math.abs(to - from) * 0.3, (k) => { const v = from + (to - from) * easeOut(k); if (i) S.t2 = v; else S.t1 = v; layout(); }, () => { if (to === 1) sfx.clink({ freq: 1500, gain: 0.05 }); check(); });
      },
    });
    const slide = {
      obj: knob, plane: 'xz', offset: 0,
      enabled: () => S.held == null,
      hint: () => '拖一拖：换一个直角三角形',
      onStart: () => { S.a0 = S.a; },
      onDrag: (p) => { const b = clamp(uv(p)[0] - O[0], L * 0.5, L * 0.76); S.a = L - b; build(); },
      onEnd: () => { if (Math.abs(S.a - S.a0) > 0.006) S.moved++; check(); },
    };
    const pointer = draggable(group, [slide, turn(0), turn(1)], { onClick: (ray) => ray.intersectObject(paper.mesh, false).length > 0 });          // 在纸上没按中东西时不转镜头

    build(); hint();

    return {
      group,
      card: false,
      panel: 'folded',          // 面板先收成书脊：整张纸是主角，提示写在纸上
      place: 'spread',
      scale: 0.8,
      size: { w: W, d: D, h: 0.02 },
      view: { elev: 78, azim: 0, lookY: 0, frameMargin: 1.09 },          // 几乎从正上方看：斜着看，正方形就不像正方形了
      pointer,
      mount(u) { ui = u; hint(); },
      dispose() { dead = true; },
      update(dt) {
        tw.update(dt);
        // 提示：该动的那块三角形自己轻轻转一下
        const next = S.held != null || tw.busy ? null : S.t1 === 0 ? 0 : S.t2 === 0 && S.t1 === 1 ? 1 : null;
        S.clock = next != null ? (S.clock || 0) + dt : 0;
        for (const i of [0, 1]) {
          const t = i ? S.t2 : S.t1; if (t !== 0 || S.held === i) continue;
          const ph = i === next ? (S.clock % 2.6) / 0.9 : 2, on = ph < 1 ? 0.06 * Math.sin(Math.PI * ph) ** 2 : 0;
          if (on > 0 || tri[i].a !== 0) tri[i].pose({ a: (i ? -1 : 1) * on * Q, lift: on * 0.02 });
        }
      },
      test: { S, geo, set: (t1, t2) => { S.t1 = t1; S.t2 = t2; layout(); check(); } },
    };
  },
};
