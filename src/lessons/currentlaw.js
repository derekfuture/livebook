// 图15.5-2 / 15.5-3 探究串、并联电路中电流的规律。同一个电路，把电流表依次接到 A、B、C 三点；换不同规格的小灯泡再测。
// 串联：A 在电源正极与 L₁ 之间，B 在 L₁ 与 L₂ 之间，C 在 L₂ 与电源负极之间。并联：A 在 L₁ 支路，B 在 L₂ 支路，C 在干路。
import * as THREE from 'three';
import { seg, buttons, goals, note, table } from './kit/ui.js';
import { Circuit, battery, switchPart, lampPart, meterPart } from './kit/circuit.js';
import { Bench, voltageOf } from './kit/bench.js';

// 电流表（以及 A、B、C 标签）的位置：串联在环上；并联 A、B 在两条支路左边，C 在干路右边
const POS = { series: { A: [-0.16, 0.0], B: [0.01, 0.075], C: [0.17, -0.01] }, parallel: { A: [-0.12, 0.085], B: [-0.12, 0.01], C: [0.15, -0.035] } };

const SPECS = [
  { label: '两个都是 2.5 V 的灯', L1: { R0: 4, Rhot: 10, rated: 2.5 }, L2: { R0: 4, Rhot: 10, rated: 2.5 } },
  { label: 'L₁ 2.5 V，L₂ 3.8 V', L1: { R0: 4, Rhot: 10, rated: 2.5 }, L2: { R0: 6, Rhot: 15, rated: 3.8 } },
];

export default {
  id: 'currentlaw',
  fig: '图15.5-2',
  title: '串、并联电路中电流的规律',
  stampText: '探究',
  predict: {
    q: '两个规格<b>不同</b>的小灯泡串联，一个亮一些、一个暗一些。<br>通过亮的那个灯的电流更大吗？',
    hint: '课本第 60 页「问题」',
    options: ['是，亮的电流更大', '不是，串联电路中电流处处相等', '暗的电流更大'],
    answer: 1,
  },
  conclusion: {
    crops: [{ page: 67, rect: [86, 240, 326, 264] }, { page: 68, rect: [184, 175, 460, 220] }],   // 课本第 61、62 页
    quote: '在串联电路中，电流处处相等。在并联电路中，干路中的电流等于各支路中的电流之和。',
    formula: '串联 <i>I</i><sub>A</sub> = <i>I</i><sub>B</sub> = <i>I</i><sub>C</sub>　　并联 <i>I</i><sub>C</sub> = <i>I</i><sub>A</sub> + <i>I</i><sub>B</sub>',
    why: '串联电路只有一条电流的路径，电荷不会在半路“堆积”或“消失”，所以各处电流相等——灯亮不亮还和灯本身的规格有关。并联电路中，干路的电流在分支处分成两部分，分别流过两条支路，再汇合起来。换用不同规格的灯多测几组，结论才可靠。',
    src: '课本第 60–62 页 · 第十五章 第5节 串、并联电路中电流的规律',
  },

  create({ tag, look, back }) {
    const group = new THREE.Group();
    let C, bench, A, L1, L2, sw;
    const S = { mode: 'series', point: 'A', spec: 0, rows: { series: [], parallel: [] }, reading: {} };
    let W = null;
    const tags = [];

    // 按当前设置重新搭电路（电流表接在 point 处）
    const build = () => {
      if (C) { group.remove(C.group); C.dispose(); }
      for (const t of tags.splice(0)) t.remove();
      C = new Circuit();
      const sp = SPECS[S.spec], ser = S.mode === 'series', P = S.point;
      // 布局：电源在下，开关在左下；串联时两个灯在上面排成一行，并联时两个灯上下排成两条支路。电流表摆在它所接的那一点。
      C.add(battery('E', { cells: 2, r: 0.1 }), [0.02, -0.095]);
      sw = C.add(switchPart('S', { closed: true }), [-0.12, -0.095]);
      L1 = C.add(lampPart('L1', sp.L1), ser ? [-0.07, 0.07] : [0.0, 0.085]);
      L2 = C.add(lampPart('L2', sp.L2), ser ? [0.09, 0.07] : [0.0, 0.01]);
      const AP = POS[S.mode];
      A = C.add(meterPart('A', { type: 'A' }), AP[P]);
      A.group.scale.setScalar(0.85);
      group.add(C.group);
      const via = (x, y, p) => { if (P === p) C.wire(x, 'A.0.6').wire('A.-', y); else C.wire(x, y); };
      if (ser) {
        // 电流从正极出发：E.+ → (C) → L₂ → (B) → L₁ → (A) → S → E.-
        via('E.+', 'L2.b', 'C');
        via('L2.a', 'L1.b', 'B');
        via('L1.a', 'S.a', 'A');
        C.wire('S.b', 'E.-');
      } else {
        // 干路：E.+ → (C) → 分支点（L₁.b、L₂.b 连在一起）；两条支路回到开关 → E.-
        if (P === 'C') C.wire('E.+', 'A.0.6').wire('A.-', 'L2.b'); else C.wire('E.+', 'L2.b');
        C.wire('L2.b', 'L1.b');
        via('L1.a', 'S.a', 'A');
        via('L2.a', 'S.a', 'B');
        C.wire('S.b', 'E.-');
      }
      C.solve();
      bench = new Bench(C, group, { onChange: () => read(), unscrew: false });
      // 测量点的标签：没接电流表的点标在导线上，接了电流表的点标在电表旁边
      for (const [k, [x, z]] of Object.entries(POS[S.mode])) tags.push(tag(`<i>${k}</i>`, 'mag big').loc(group, x + (k === S.point ? -0.05 : 0), 0.02, z));
      tags.push(tag('L₁', 'pill').loc(group, L1.group.position.x + 0.045, 0.005, L1.group.position.z), tag('L₂', 'pill').loc(group, L2.group.position.x + 0.045, 0.005, L2.group.position.z));
      read();
    };
    const read = () => {
      if (!W || !A) return;
      const v = Math.abs(A.value || 0);
      S.reading = { v: Math.round(v / 0.02) * 0.02 };
      W.drop?.();
      W.status(`电流表接在 <b>${S.point}</b> 点（${S.mode === 'series' ? '串联电路' : S.point === 'C' ? '干路' : S.point === 'A' ? 'L₁ 支路' : 'L₂ 支路'}）。闭合开关，读电流表的示数，再点“记下这个电流”。`);
    };

    // 记录之前核对：电路真的是要测的那种接法，电流表真的接在选定的那一点（学生可能自己改过线）
    const check = () => {
      const lit = (L) => L.screwed && !L.broken && (L.brightness || 0) > 0.03;
      const i = Math.abs(A.value || 0), i1 = Math.abs(L1.I || 0), i2 = Math.abs(L2.I || 0);
      if (!sw.closed) return '开关是断开的，电路中没有电流。';
      if (A.reverse) return '电流表的指针反偏了：正负接线柱接反了。';
      if (i < 0.005) return '电流表没有示数：电路断开了，或者电流表没有接进电路。这时的读数不能记。';
      if (!lit(L1) || !lit(L2)) return '有一个灯不亮——电路和要研究的不一样了（可能被短路或断开）。先恢复电路。';
      const U = Math.abs(C.get('E').U || 0), u1 = voltageOf(C, 'L1'), u2 = voltageOf(C, 'L2');
      const ser = Math.abs(u1 + u2 - U) < 0.1 * U, par = u1 > 0.8 * U && u2 > 0.8 * U;
      if (S.mode === 'series' && !ser) return '现在两个灯不是串联的。要研究串联电路，先恢复串联。';
      if (S.mode === 'parallel' && !par) return '现在两个灯不是并联的。要研究并联电路，先恢复并联。';
      const near = (a, b) => Math.abs(a - b) < Math.max(0.006, 0.04 * b);
      const want = S.mode === 'series' ? i1 : S.point === 'A' ? i1 : S.point === 'B' ? i2 : i1 + i2;
      if (!near(i, want)) return `电流表测的不是 ${S.point} 点（${S.mode === 'series' ? '串联电路中' : S.point === 'C' ? '干路' : S.point === 'A' ? 'L₁ 支路' : 'L₂ 支路'}）的电流——看一看它实际串联在哪里。`;
      return null;
    };
    const record = () => {
      const bad = check();
      if (bad) return W.status(`<b>这次不能记：</b>${bad}`);
      // 学生自己读电流表（接的是 0.6 A 量程，每小格 0.02 A）
      const v = +S.reading.v.toFixed(2);
      W.ask(`读电流表（“0.6” 接线柱，每小格 0.02 A）：${S.point} 点的电流 <i>I</i> = ?`, [v, +(v + 0.02).toFixed(2), +(v * 5).toFixed(2)].map((x) => `${x.toFixed(2)} A`), `${v.toFixed(2)} A`, '再看看指针：接的是 0.6 A 量程，看下面那排刻度，每小格 0.02 A。', () => save());
      look(group.worldToLocal(A.group.getWorldPosition(new THREE.Vector3())).toArray(), [0, 1, 0.35], 0.12, () => back());
    };
    const save = () => {
      back();
      const list = S.rows[S.mode];
      let row = list.find((r) => r.spec === S.spec);
      if (!row) { row = { spec: S.spec }; list.push(row); }
      row[S.point] = S.reading.v;
      redraw();
      const done = list.filter((r) => r.A != null && r.B != null && r.C != null);

      const next = ['A', 'B', 'C'].find((k) => row[k] == null);
      // 一组测完：和规律比一比，差的部分说明是读数误差（分度值 0.02 A）
      if (next) return W.status(`记下了 ${S.point} 点的电流。再把电流表接到 ${next} 点。`);
      if (done.length < 2) return W.status('这一组三个点都测完了。换另一种规格的灯再测一组。');
      // 两组都测完：学生自己从表里找关系
      const opts = S.mode === 'series' ? ['I_A = I_B = I_C', 'I_C = I_A + I_B', 'I_A > I_B > I_C'] : ['I_C = I_A + I_B', 'I_A = I_B = I_C', 'I_C = I_A − I_B'];
      const f = (t) => t.replace(/I_([ABC])/g, '<i>I</i><sub>$1</sub>');
      W.ask(`两组都测完了。看${S.mode === 'series' ? '串联' : '并联'}电路的表格（相差一两个小格算读数误差）：`, opts.map(f), f(opts[0]), '把表里每一行的三个数比一比、加一加。', () => {
        W.goal.done(S.mode);
        W.status(S.mode === 'series' ? '对：<b>串联电路中，电流处处相等</b>。' : '对：<b>并联电路中，干路电流等于各支路电流之和</b>。');
      });
    };

    let redraw = () => {};

    return {
      group,
      size: { w: 0.4, d: 0.28, h: 0.1 },
      view: { elev: 46, azim: 0, lookY: 0.25, margin: 1.0 },
      pointer: { down: (r, e) => bench.pointer().down(r, e), move: (r, e) => bench.pointer().move(r, e), up: (r, e) => bench.pointer().up(r, e) },
      mount(ui) {
        const mode = seg('电路', ['串联', '并联'], (_, k) => { S.mode = k ? 'parallel' : 'series'; build(); redraw(); });
        const pt = seg('电流表接到', ['A 点', 'B 点', 'C 点'], (_, k) => { S.point = 'ABC'[k]; build(); });
        const spec = seg('小灯泡', SPECS.map((x) => x.label), (_, k) => { S.spec = k; build(); });
        const rec = buttons([{ text: '记下这个电流', onClick: record }]);
        const tbS = table(['小灯泡规格', '<i>I</i><sub>A</sub>/A', '<i>I</i><sub>B</sub>/A', '<i>I</i><sub>C</sub>/A']);
        const tbP = table(['小灯泡规格', '<i>I</i><sub>A</sub>/A（L₁支路）', '<i>I</i><sub>B</sub>/A（L₂支路）', '<i>I</i><sub>C</sub>/A（干路）']);
        const titleS = note('<b>串联</b>'), titleP = note('<b>并联</b>');
        redraw = () => {
          for (const [tb, m] of [[tbS, 'series'], [tbP, 'parallel']]) {
            tb.clear();
            for (const r of S.rows[m]) tb.add([SPECS[r.spec].label, r.A ?? '', r.B ?? '', r.C ?? ''].map((x) => (typeof x === 'number' ? x.toFixed(2) : x)), { highlight: false });
          }
        };
        ui.controls.append(mode.el, pt.el, spec.el, rec.el, note('电路已经连好。点“电流表接到”就会把电流表改接过去；你也可以自己拆线重连。电流表接的是 “0.6” 接线柱。'));
        ui.data.append(titleS, tbS.el, titleP, tbP.el);
        const qb = buttons([0, 1, 2].map(() => ({ text: '', ghost: true, onClick: () => {} })));
        qb.el.hidden = true;
        ui.controls.append(qb.el);
        W = { ask: (q, opts, right, hint, ok) => {
          const sh = opts.slice().sort(() => Math.random() - 0.5);
          qb.btns.forEach((b, j) => { b.innerHTML = sh[j]; b.onclick = () => { if (sh[j] !== right) return ui.status(hint); qb.el.hidden = true; ok(); }; });
          qb.el.hidden = false; ui.status(q);
        }, drop: () => { if (!qb.el.hidden) { qb.el.hidden = true; back(); } }, status: (m) => ui.status(m), goal: goals(ui, [['series', '串联：用两种规格的灯，各测 A、B、C 三点'], ['parallel', '并联：用两种规格的灯，各测 A、B、C 三点']]) };
        build();
      },
      update(dt) { C?.update(dt); bench?.update(dt); },
      debug: { get C() { return C; }, record, set: (m, p, sp) => { S.mode = m; S.point = p; S.spec = sp; build(); } },
    };
  },
};
