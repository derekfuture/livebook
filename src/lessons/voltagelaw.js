// 图16.2-2 / 16.2-4 探究串、并联电路中电压的规律。同一个电路，把电压表依次并联到不同的两点；换不同规格的小灯泡再测。
// 串联：A 在 L₁ 左端，B 在 L₁、L₂ 之间，C 在 L₂ 右端，测 U_AB、U_BC、U_AC。并联：测 L₁、L₂ 两端和电源两端的电压。
import * as THREE from 'three';
import { seg, buttons, goals, note, table } from './kit/ui.js';
import { Circuit, battery, switchPart, lampPart, meterPart } from './kit/circuit.js';
import { Bench, nets, voltageOf } from './kit/bench.js';

const SPECS = [
  { label: '两个都是 2.5 V 的灯', L1: { R0: 4, Rhot: 10, rated: 2.5 }, L2: { R0: 4, Rhot: 10, rated: 2.5 } },
  { label: 'L₁ 2.5 V，L₂ 3.8 V', L1: { R0: 4, Rhot: 10, rated: 2.5 }, L2: { R0: 6, Rhot: 15, rated: 3.8 } },
];
// 电压表接到哪两点：[接 “3” 的一端（电势高的一端）, 接 “−” 的一端, 导线绕开灯泡的偏移]
const PAIRS = {
  series: [['L1.b', 'L1.a'], ['L2.b', 'L2.a'], ['L2.b', 'L1.a']],
  parallel: [['L1.b', 'L1.a'], ['L2.a', 'L2.b'], ['E.+', 'E.-']],     // 并联时 L₂ 转了 −90°：a 端在后
};
const NAMES = {
  series: ['U<sub>AB</sub>（L₁ 两端）', 'U<sub>BC</sub>（L₂ 两端）', 'U<sub>AC</sub>（A、C 两点）'],
  parallel: ['U₁（L₁ 两端）', 'U₂（L₂ 两端）', 'U（电源两端）'],
};

export default {
  id: 'voltagelaw',
  fig: '图16.2-2',
  title: '串、并联电路中电压的规律',
  stampText: '探究',
  predict: {
    q: '两个规格<b>不同</b>的小灯泡串联（图16.2-2）。<br>L₁ 两端的电压 U<sub>AB</sub>、L₂ 两端的电压 U<sub>BC</sub> 和 A、C 两点间的电压 U<sub>AC</sub> 有什么关系？',
    hint: '课本第 72 页「实验」',
    options: ['三个电压都相等', 'L₁、L₂ 两端的电压加起来，等于 A、C 间的电压', '没有确定的关系'],
    answer: 1,
  },
  conclusion: {
    crops: [{ page: 79, rect: [62, 326, 360, 408] }, { page: 80, rect: [160, 598, 456, 664] }],   // 课本第 73、74 页
    quote: '在由两个小灯泡组成的串联电路中，电源两端的电压等于各小灯泡两端的电压之和。并联电路中两个支路上小灯泡两端的电压与电源两端的电压相等。',
    formula: '串联 <i>U</i><sub>AC</sub> = <i>U</i><sub>AB</sub> + <i>U</i><sub>BC</sub>　　并联 <i>U</i> = <i>U</i><sub>1</sub> = <i>U</i><sub>2</sub>',
    why: '串联时两个灯“分”电源的电压：规格不同的灯分到的电压不同，但加起来等于电源两端的电压。并联时两个灯的两端分别连在一起，都直接接在电源两端，所以电压都和电源两端的电压相等。电压表读数精确到 0.1 V，两次读数加起来差 0.1 V 是读数误差。',
    src: '课本第 72–74 页 · 第十六章 第2节 串、并联电路中电压的规律',
  },

  create({ tag, look, back }) {
    const group = new THREE.Group();
    let C, bench, V;
    const S = { mode: 'series', at: 0, spec: 1, rows: { series: [], parallel: [] }, v: 0 };
    let W = null;
    const tags = [];

    const build = () => {
      if (C) { group.remove(C.group); C.dispose(); }
      for (const t of tags.splice(0)) t.remove();
      C = new Circuit();
      const sp = SPECS[S.spec], ser = S.mode === 'series';
      // 课本电路图的样子：电源、开关在后排，小灯泡在中间，电压表摆在最前面
      C.add(battery('E', { cells: 2, r: 0.1 }), [-0.06, -0.12]);
      C.add(switchPart('S', { closed: true }), [0.08, -0.12]);
      // 并联：两个灯竖着摆成左右两条支路（后端连在一起、前端连在一起），电压表的导线从两灯中间走，不跨过灯泡
      const L1 = C.add(lampPart('L1', sp.L1), ser ? [-0.065, -0.03] : [-0.065, -0.035], ser ? 0 : Math.PI / 2);
      const L2 = C.add(lampPart('L2', sp.L2), ser ? [0.065, -0.03] : [0.045, -0.035], ser ? 0 : -Math.PI / 2);
      V = C.add(meterPart('V', { type: 'V' }), [0, 0.095]);
      group.add(C.group);
      C.wire('E.+', 'S.a');
      if (ser) C.wire('S.b', 'L2.b').wire('L2.a', 'L1.b').wire('L1.a', 'E.-');
      else C.wire('S.b', 'L2.a').wire('L2.a', 'L1.b').wire('E.-', 'L1.a', { via: [-0.015, 0, 0] }).wire('L1.a', 'L2.b');
      const [hi, lo] = PAIRS[S.mode][S.at];
      C.wire('V.3', hi).wire('V.-', lo, lo === 'E.-' ? { via: [-0.035, 0, 0] } : {});
      C.solve();
      bench = new Bench(C, group, { onChange: () => read(), unscrew: false });
      if (ser) {
        const p = (t) => C.terminalWorld(t);
        for (const [k, t] of [['A', 'L1.a'], ['B', 'L1.b'], ['C', 'L2.b']]) { const q = p(t); tags.push(tag(`<i>${k}</i>`, 'mag big').loc(group, k === 'B' ? 0 : q.x, 0.03, q.z - 0.03)); }
      }
      tags.push(tag('L₁', 'pill').loc(group, L1.group.position.x - 0.05, 0.005, L1.group.position.z + 0.01), tag('L₂', 'pill').loc(group, L2.group.position.x + 0.05, 0.005, L2.group.position.z + 0.01));
      read();
    };
    const read = () => {
      if (!W || !V) return;
      S.v = Math.round(Math.abs(V.value || 0) * 10) / 10;
      W.drop?.();
      W.status(`电压表接在${NAMES[S.mode][S.at].replace(/（.*）/, '').replace(/<\/?sub>/g, '')}。${V.reverse ? '指针反偏了——正负接线柱接反了。' : '读电压表的示数，再点“记下这个电压”。'}`);
    };

    // 记录之前核对：电压表实际并联在哪两点（学生可能自己改过线），电路是不是要研究的接法
    const check = () => {
      const lamps = ['L1', 'L2'].map((n) => C.get(n));
      if (V.reverse) return '指针反偏了：正负接线柱接反了。';
      if (lamps.some((L) => !L.screwed || L.broken || (L.brightness || 0) < 0.03)) return '有一个灯不亮——电路和要研究的不一样了。先恢复电路。';
      const U = Math.abs(C.get('E').U || 0), u1 = voltageOf(C, 'L1'), u2 = voltageOf(C, 'L2');
      if (S.mode === 'series' && Math.abs(u1 + u2 - U) > 0.1 * U) return '现在两个灯不是串联的，先恢复串联。';
      if (S.mode === 'parallel' && !(u1 > 0.8 * U && u2 > 0.8 * U)) return '现在两个灯不是并联的，先恢复并联。';
      const f = nets(C), [hi, lo] = PAIRS[S.mode][S.at];
      const on = (t) => C.wires.some((w) => w.a === t || w.b === t);
      const plus = on('V.3') ? 'V.3' : on('V.15') ? 'V.15' : null;
      if (!plus || !on('V.-')) return '电压表还没有接好。';
      if (!(f(plus) === f(hi) && f('V.-') === f(lo))) return `电压表实际并联的不是${NAMES[S.mode][S.at].replace(/<\/?sub>/g, '')}——看一看它的两根线接到了哪两点。`;
      return null;
    };
    const record = () => {
      const bad = check();
      if (bad) return W.status(`<b>这次不能记：</b>${bad}`);
      // 学生自己读电压表（“3” 接线柱，每小格 0.1 V）
      const v = +S.v.toFixed(1);
      W.ask(`读电压表（“3” 接线柱，每小格 0.1 V）：示数 = ?`, [v, +(v + 0.1).toFixed(1), +(v * 5).toFixed(1)].map((x) => `${x.toFixed(1)} V`), `${v.toFixed(1)} V`, '再看看指针：接的是 3 V 量程，看下面那排刻度，每小格 0.1 V。', () => save());
      look(group.worldToLocal(V.group.getWorldPosition(new THREE.Vector3())).toArray(), [0, 1, 0.35], 0.12, () => back());
    };
    const save = () => {
      back();
      const list = S.rows[S.mode];
      let row = list.find((r) => r.spec === S.spec);
      if (!row) { row = { spec: S.spec, u: [] }; list.push(row); }
      row.u[S.at] = S.v;
      redraw();
      const done = list.filter((r) => [0, 1, 2].every((i) => r.u[i] != null));
      const next = [0, 1, 2].find((i) => row.u[i] == null);
      const nm = (i) => NAMES[S.mode][i].replace(/（.*）/, '').replace(/<\/?sub>/g, '');
      if (next != null) return W.status(`记下了 ${nm(S.at)} = ${S.v.toFixed(1)} V。再把电压表接到下一处，测 ${nm(next)}。`);
      if (done.length < 2) return W.status('这一组三处都测完了。换另一种规格的灯再测一组。');
      // 两组都测完：学生自己从表里找关系（相差一个小格算读数误差）
      const f = (t) => t.replace(/U_(\w+)/g, '<i>U</i><sub>$1</sub>');
      const opts = S.mode === 'series' ? ['U_AC = U_AB + U_BC', 'U_AB = U_BC = U_AC', 'U_AC = U_AB − U_BC'] : ['U_1 = U_2 = U', 'U = U_1 + U_2', 'U_1 + U_2 = 0'];
      W.ask(`两组都测完了。看${S.mode === 'series' ? '串联' : '并联'}电路的表格（相差一个小格算读数误差）：`, opts.map(f), f(opts[0]), '把表里每一行的三个数比一比、加一加。', () => {
        W.goal.done(S.mode);
        W.status(S.mode === 'series' ? '对：<b>串联电路中，电源两端电压等于各用电器两端电压之和</b>。' : '对：<b>并联电路中，各支路用电器两端的电压与电源两端电压相等</b>。');
      });
    };

    let redraw = () => {};

    return {
      group,
      size: { w: 0.36, d: 0.3, h: 0.09 },
      view: { elev: 50, azim: 0, lookY: 0.25, margin: 1.0 },
      pointer: { down: (r, e) => bench.pointer().down(r, e), move: (r, e) => bench.pointer().move(r, e), up: (r, e) => bench.pointer().up(r, e) },
      mount(ui) {
        const atS = seg('电压表接到', ['A、B 两点', 'B、C 两点', 'A、C 两点'], (_, k) => { S.at = k; build(); });
        const atP = seg('电压表接到', ['L₁ 两端', 'L₂ 两端', '电源两端'], (_, k) => { S.at = k; build(); });
        atP.el.hidden = true;
        const mode = seg('电路', ['串联', '并联'], (_, k) => {
          S.mode = k ? 'parallel' : 'series'; S.at = 0;
          atS.el.hidden = !!k; atP.el.hidden = !k; atS.set(0); atP.set(0);
          build();
        });
        const spec = seg('小灯泡', SPECS.map((x) => x.label), (_, k) => { S.spec = k; build(); }, { value: 1 });
        const rec = buttons([{ text: '记下这个电压', onClick: record }]);
        const tb = { series: table(['小灯泡规格', ...NAMES.series.map((x) => `<i>${x.replace(/（.*）/, '')}</i>/V`)]), parallel: table(['小灯泡规格', ...NAMES.parallel.map((x) => `<i>${x.replace(/（.*）/, '')}</i>/V`)]) };
        redraw = () => {
          for (const m of ['series', 'parallel']) {
            tb[m].clear();
            for (const r of S.rows[m]) tb[m].add([SPECS[r.spec].label, ...[0, 1, 2].map((i) => (r.u[i] != null ? r.u[i].toFixed(1) : ''))], { highlight: false });
          }
        };
        ui.controls.append(mode.el, atS.el, atP.el, spec.el, rec.el, note('电路已经连好，电压表用的是 “−” 和 “3” 接线柱（分度值 0.1 V）。点“电压表接到”就会把电压表改接过去；你也可以自己拆线重连。'));
        ui.data.append(note('<b>串联</b>'), tb.series.el, note('<b>并联</b>'), tb.parallel.el);
        const qb = buttons([0, 1, 2].map(() => ({ text: '', ghost: true, onClick: () => {} })));
        qb.el.hidden = true;
        ui.controls.append(qb.el);
        W = { ask: (q, opts, right, hint, ok) => {
          const sh = opts.slice().sort(() => Math.random() - 0.5);
          qb.btns.forEach((b, j) => { b.innerHTML = sh[j]; b.onclick = () => { if (sh[j] !== right) return ui.status(hint); qb.el.hidden = true; ok(); }; });
          qb.el.hidden = false; ui.status(q);
        }, drop: () => { if (!qb.el.hidden) { qb.el.hidden = true; back(); } }, status: (m) => ui.status(m), goal: goals(ui, [['series', '串联：用两种规格的灯，各测 A、B、C 三点间的电压'], ['parallel', '并联：用两种规格的灯，各测 L₁、L₂ 和电源两端的电压']]) };
        build();
      },
      update(dt) { C?.update(dt); bench?.update(dt); },
      debug: { get C() { return C; }, record, set: (m, at, sp) => { S.mode = m; S.at = at; S.spec = sp; build(); } },
    };
  },
};
