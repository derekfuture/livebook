// 图17.4-1 / 17.4-3 欧姆定律在串、并联电路中的应用。把课本的两道例题搭成真的电路：
//   例题1（图17.4-1）：18 V 电源，R₁ 与 R₂ 串联，S₂ 并在 R₂ 两端。先闭合 S₂ 读电流求 R₁；再断开 S₂，选一个 R₂ 使 R₁ 两端电压为 16 V（电压表测 R₂：2 V）。
//   例题2（图17.4-3）：R₁ = 10 Ω，R₂ 与 S₂ 串联后和 R₁ 并联。S₂ 断开读 1.2 A 求电压；闭合后读 1.5 A 求 R₂。
// 学生自己算，选出答案；电路给出真实的读数来检验。
import * as THREE from 'three';
import { seg, buttons, goals, note, readout } from './kit/ui.js';
import { Circuit, switchPart, meterPart, resistorPart, psuPart } from './kit/circuit.js';
import { Bench } from './kit/bench.js';

const R2S = [1, 2.5, 5, 10];

export default {
  id: 'equivr',
  fig: '图17.4-1',
  title: '欧姆定律在串、并联电路中的应用',
  stampText: '推理',
  predict: {
    q: '电阻 R₁ 与 R₂ 串联，接在电压不变的电源上。<br>再闭合并在 R₂ 两端的开关 S₂（把 R₂ 短路），电流表的示数会——',
    hint: '课本第 105 页「例题1」',
    options: ['变大', '变小', '不变'],
    answer: 0,
  },
  conclusion: {
    page: 113, rect: [62, 130, 362, 364],     // 课本第 107 页
    quote: '欧姆定律公式中的电压、电流、电阻是对同一个研究对象而言的……在解决串、并联电路的问题时，我们可以先选择某个导体为研究对象，用欧姆定律求解通过它的电流或它两端的电压，再通过该导体与其他导体的串、并联关系求得题目的答案。',
    formula: '串联 <i>I</i> = <i>I</i><sub>1</sub> = <i>I</i><sub>2</sub>，<i>U</i> = <i>U</i><sub>1</sub> + <i>U</i><sub>2</sub>　　并联 <i>U</i> = <i>U</i><sub>1</sub> = <i>U</i><sub>2</sub>，<i>I</i> = <i>I</i><sub>1</sub> + <i>I</i><sub>2</sub>',
    why: '例题1：S₂ 闭合时 R₂ 被短路，只有 R₁ 接在 18 V 上，I = 0.9 A，R₁ = 20 Ω；S₂ 断开后 R₁、R₂ 串联，要 U₁ = 16 V，电流 I = 0.8 A，R₂ 分到 2 V，R₂ = 2.5 Ω。例题2：S₂ 断开时只有 R₁，U = 1.2 A × 10 Ω = 12 V；S₂ 闭合后两个电阻并联，R₂ 的电流 0.3 A，R₂ = 40 Ω。整个电路的电阻：串联时 R₁ + R₂ = 22.5 Ω，比任何一个都大；并联时 12 V ÷ 1.5 A = 8 Ω，比任何一个都小。',
    src: '课本第 105–107 页 · 第十七章 第4节 欧姆定律在串、并联电路中的应用',
  },

  create({ tag }) {
    const group = new THREE.Group();
    let C, bench, A, V, S1, S2, R1, R2;
    const S = { ex: 1, r2: 3, step: {} };
    let W = null;
    const tags = [];

    const build = () => {
      if (C) { group.remove(C.group); C.dispose(); }
      for (const t of tags.splice(0)) t.remove();
      C = new Circuit();
      if (S.ex === 1) {
        // 图17.4-1：上面 S₂ 跨在 R₂ 两端；中间 R₂、R₁；右边电流表；下面电源、S₁。电压表并在 R₂ 两端
        C.add(psuPart('E', { U: 18 }), [-0.17, 0.06]);
        S1 = C.add(switchPart('S1', { closed: false }), [0.07, 0.1]);
        S2 = C.add(switchPart('S2', { closed: true }), [-0.05, -0.1]);
        R2 = C.add(resistorPart('R2', { R: R2S[S.r2] }), [-0.05, -0.02]);
        R1 = C.add(resistorPart('R1', { R: 20 }), [0.08, -0.02]);
        A = C.add(meterPart('A', { type: 'A' }), [0.19, -0.03]);
        V = C.add(meterPart('V', { type: 'V' }), [-0.06, 0.1]);
        C.wire('E.+', 'R2.a').wire('R2.b', 'R1.a').wire('R1.b', 'A.3').wire('A.-', 'S1.b').wire('S1.a', 'E.-').wire('S2.a', 'R2.a').wire('S2.b', 'R2.b').wire('V.15', 'R2.a').wire('V.-', 'R2.b');
        for (const [txt, x, z] of [['S₁', 0.07, 0.13], ['S₂', -0.05, -0.128], [`R₂ = ${R2S[S.r2]} Ω`, -0.05, 0.005], ['R₁', 0.08, 0.005], ['电压表测 R₂', -0.06, 0.15]]) tags.push(tag(txt, 'pill').loc(group, x, 0.005, z));
      } else {
        // 图17.4-3：上面 S₂、R₂ 一条支路；中间 R₁；右边电流表；下面 S₁、电源
        C.add(psuPart('E', { U: 12 }), [0.05, 0.1]);
        S1 = C.add(switchPart('S1', { closed: false }), [-0.1, 0.1]);
        S2 = C.add(switchPart('S2', { closed: false }), [-0.07, -0.1]);
        R2 = C.add(resistorPart('R2', { R: 40 }), [0.07, -0.1]);
        R1 = C.add(resistorPart('R1', { R: 10 }), [0.07, -0.02]);
        A = C.add(meterPart('A', { type: 'A' }), [0.19, 0.03]);
        V = null;
        C.wire('E.+', 'A.3').wire('A.-', 'R1.b').wire('R1.b', 'R2.b').wire('R2.a', 'S2.b').wire('S2.a', 'R1.a').wire('R1.a', 'S1.b').wire('S1.a', 'E.-');
        for (const [txt, x, z] of [['S₁', -0.1, 0.13], ['S₂', -0.07, -0.128], ['R₂ = ?', 0.07, -0.072], ['R₁ = 10 Ω', 0.07, 0.008]]) tags.push(tag(txt, 'pill').loc(group, x, 0.005, z));
      }
      A.group.scale.setScalar(0.8);
      V?.group.scale.setScalar(0.8);
      group.add(C.group);
      C.solve();
      S.sig0 = sig();
      bench = new Bench(C, group, { onChange: (c, ev) => judge(ev), unscrew: false });
      judge();
    };

    // 电路的接法（所有导线的两端）：和刚按课本接好时一样，才是例题里的电路
    const sig = () => C.wires.map((w) => [w.a, w.b].sort().join('~')).sort().join('|');
    const standard = () => sig() === S.sig0;
    const rd = () => ({ i: Math.round(Math.abs(A.value || 0) * 10) / 10, u: V ? Math.round(Math.abs(V.value || 0) * 2) / 2 : 0 });
    let ask = () => {}, keyNow = () => '', dropStale = () => {};
    const judge = (ev = {}) => {
      if (!W) return;
      dropStale();      // 电路条件变了：之前没答完的题作废（它依赖的读数已经不在了）
      if (ev.msg) return W.status(ev.msg);
      const { i, u } = rd();
      W.out.set('i', i, 1); W.out.set('u', V ? u.toFixed(1) : '—');
      W.out.set('s', `S₁ ${S1.closed ? '闭合' : '断开'}，S₂ ${S2.closed ? '闭合' : '断开'}`);
      if (!standard()) return W.status(`电路和例题的电路图<b>不一样了</b>（有导线被拆掉或改接了），现在电流表示数 ${i.toFixed(1)} A。这时的读数不能拿来算例题。点“按例题重新接好”再做。`);
      if (!S1.closed) return W.status('点开关 S₁ 把它闭合。');
      if (S.ex === 1) {
        if (S2.closed) { ask('ex1R1', `S₂ 闭合，R₂ 被短路，电路里只有 R₁ 接在 18 V 上。电流表示数 ${i.toFixed(1)} A。<b>R₁ 是多少？</b>`, ['20 Ω', '0.05 Ω', '16.2 Ω'], 0, '对：R₁ = 18 V ÷ 0.9 A = 20 Ω。现在断开 S₂。'); return; }
        const u1 = 18 - Math.abs(V.value || 0);
        if (Math.abs(Math.abs(V.value) - 2) < 0.05) { W.goal.done('ex1R2'); return W.status(`R₂ = ${R2S[S.r2]} Ω：电压表（测 R₂）示数 2 V，电流 ${i.toFixed(1)} A，R₁ 两端的电压 U₁ = 18 V − 2 V = <b>16 V</b>。和例题算的一样。`); }
        return W.status(`S₂ 断开，R₁ 和 R₂ 串联：电流 ${i.toFixed(1)} A，R₂ 两端 ${u.toFixed(1)} V，R₁ 两端约 ${u1.toFixed(1)} V。要让 R₁ 两端的电压变为 16 V，R₂ 应该选多大？先算一算，再换 R₂ 试试。`);
      }
      if (!S2.closed) { ask('ex2U', `S₁ 闭合、S₂ 断开：只有 R₁ = 10 Ω 接在电路中，电流表示数 ${i.toFixed(1)} A。<b>R₁ 两端的电压是多少？</b>`, ['12 V', '8.3 V', '0.12 V'], 0, '对：U₁ = 1.2 A × 10 Ω = 12 V。现在闭合 S₂。'); return; }
      ask('ex2R2', `S₂ 也闭合了：R₁ 和 R₂ 并联，电流表示数变为 ${i.toFixed(1)} A。<b>R₂ 是多少？</b>`, ['40 Ω', '8 Ω', '30 Ω'], 0, `对：两个电阻并联，U₂ = U₁ = 12 V，I₂ = 1.5 A − 1.2 A = 0.3 A，R₂ = 12 V ÷ 0.3 A = 40 Ω。整个电路的电阻 12 V ÷ 1.5 A = 8 Ω，比 R₁、R₂ 都小。`);
    };

    return {
      group,
      size: { w: 0.48, d: 0.3, h: 0.09 },
      view: { elev: 48, azim: 0, lookY: 0.25, margin: 1.0 },
      pointer: { down: (r, e) => bench.pointer().down(r, e), move: (r, e) => bench.pointer().move(r, e), up: (r, e) => bench.pointer().up(r, e) },
      mount(ui) {
        const out = readout([{ key: 'i', label: '电流表', unit: 'A' }, { key: 'u', label: '电压表', unit: 'V' }, { key: 's', label: '开关', span: true }]);
        const ex = seg('例题', ['例题1（图17.4-1）', '例题2（图17.4-3）'], (_, k) => { S.ex = k + 1; r2.el.hidden = !!k; build(); });
        const r2 = seg('R₂', R2S.map((r) => `${r} Ω`), (_, k) => { S.r2 = k; const c1 = S1.closed, c2 = S2.closed; build(); S1.closed = c1; S2.closed = c2; C.solve(); judge(); }, { value: 3 });
        const choices = buttons([0, 1, 2].map((j) => ({ text: '', ghost: true, onClick: () => answer(j) })));
        choices.el.hidden = true;
        let cur = null;
        keyNow = () => `${S.ex}|${S1.closed}|${S2.closed}|${S.r2}|${sig()}|${rd().i}|${rd().u}`;     // 开关、R₂、接法、读数，任何一个变了，题就作废
        dropStale = () => { if (cur && cur.key !== keyNow()) { cur = null; choices.el.hidden = true; } };
        ask = (id, q, opts, right, ok) => {
          if (S.step[id]) { W.status(ok.replace(/^对：/, '')); choices.el.hidden = true; return; }
          // 读数和例题对不上（比如电源接触不良、电表接错），就不出这道题
          const want = { ex1R1: 0.9, ex2U: 1.2, ex2R2: 1.5 }[id];
          if (want != null && Math.abs(rd().i - want) > 0.05) { choices.el.hidden = true; cur = null; return W.status(`电流表示数是 ${rd().i.toFixed(1)} A，和例题的电路对不上。检查一下电路，或者点“按例题重新接好”。`); }
          cur = { id, opts, right, ok, key: keyNow() };
          W.status(q);
          choices.btns.forEach((b, j) => (b.textContent = opts[j]));
          choices.el.hidden = false;
        };
        const answer = (j) => {
          dropStale();
          if (!cur) return;
          if (j !== cur.right) return ui.status(`不对。${cur.id === 'ex1R1' ? '用欧姆定律：R = U / I。' : cur.id === 'ex2U' ? 'U = I R。' : '并联时 R₂ 两端的电压也是 12 V；通过 R₂ 的电流是两次示数之差。'}`);
          S.step[cur.id] = true;
          W.goal.done(cur.id);
          choices.el.hidden = true;
          ui.status(cur.ok);
          cur = null;
        };
        const rewire = buttons([{ text: '按例题重新接好', ghost: true, onClick: () => { build(); } }]);
        ui.controls.append(ex.el, r2.el, out.el, choices.el, rewire.el, note('电路已经按课本的电路图连好，电源电压不变。点开关闭合 / 断开；先自己算，再选答案。'));
        W = { out, status: (m) => ui.status(m), goal: goals(ui, [['ex1R1', '例题1：求 R₁'], ['ex1R2', '例题1：找出使 R₁ 两端电压为 16 V 的 R₂'], ['ex2U', '例题2：求 R₁ 两端的电压'], ['ex2R2', '例题2：求 R₂']]) };
        build();
      },
      update(dt) { C?.update(dt); bench?.update(dt); },
      debug: { get C() { return C; } },
    };
  },
};
