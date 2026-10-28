// 图15.2-7 电路和电路图 / 图15.2-8 小灯泡被短路。亲手连电路：通路、断路、短路。
// 桌上：电池盒（两节干电池）、开关、两个小灯泡。从接线柱拖到接线柱连导线，点导线拆掉，点开关合上/断开。
import * as THREE from 'three';
import { readout, buttons, goals, note, h } from './kit/ui.js';
import { Circuit, battery, switchPart, lampPart } from './kit/circuit.js';
import { Bench, nets } from './kit/bench.js';

export default {
  id: 'circuit',
  fig: '图15.2-8',
  title: '通路、断路和短路',
  stampText: '探究',
  predict: {
    q: '两个小灯泡串联，都在发光。<br>用一根导线把小灯泡 L₁ 的两端连起来，会怎样？',
    hint: '课本第 48 页「演示」图15.2-8',
    options: ['两个灯都更亮了', 'L₁ 熄灭，L₂ 更亮了', '两个灯都熄灭了'],
    answer: 1,
  },
  conclusion: {
    page: 54, rect: [160, 76, 462, 242],    // 课本第 48 页：通路、断路、短路
    quote: '正常接通的电路，即用电器能够工作的电路叫作通路。电路中如果某处被切断，电路中就不会有电流通过，这种情况叫作断路。直接用导线将电源的正、负极连接起来，这种情况下电源被短路……这是不允许的！',
    why: '电路由电源、用电器、开关和导线组成。小灯泡 L₁ 被导线短路后，电流通过这根导线绕过了 L₁，L₁ 就熄灭了；电路里只剩 L₂，它两端的电压变大，所以更亮。如果直接用导线把电源正负极连起来，电流很大，可能烧坏电源。',
    src: '课本第 47–48 页 · 第十五章 第2节 电流和电路',
  },

  create({ tag, look, back }) {
    const group = new THREE.Group();
    const C = new Circuit();
    const bat = C.add(battery('E', { cells: 2 }), [0.02, -0.075]);
    const sw = C.add(switchPart('S'), [-0.11, -0.075]);
    const L1 = C.add(lampPart('L1'), [-0.07, 0.055]);
    const L2 = C.add(lampPart('L2'), [0.07, 0.055]);
    group.add(C.group);
    for (const [p, txt, x, z] of [[bat, '电源', 0.02, -0.11], [sw, '开关 S', -0.11, -0.105], [L1, '小灯泡 L₁', -0.07, 0.09], [L2, '小灯泡 L₂', 0.07, 0.09]]) tag(txt, 'pill').loc(group, x, 0.005, z);
    void L1; void L2;

    let W = null;
    const S = { seen: new Set() };
    const lit = (L) => L.screwed && !L.broken && (L.brightness || 0) > 0.05;

    const judge = (circuit, ev = {}) => {
      if (!W) return;
      if (ev.msg) return W.status(ev.msg);
      const f = nets(circuit);
      const l1 = lit(L1), l2 = lit(L2);
      const shortBat = bat.short;
      const l1Shorted = f('L1.a') === f('L1.b') && (l2 || shortBat);
      const l2Shorted = f('L2.a') === f('L2.b') && (l1 || shortBat);
      W.out.set('s', sw.closed ? '合上' : '断开');
      W.out.set('l', [l1 ? 'L₁ 亮' : 'L₁ 不亮', l2 ? 'L₂ 亮' : 'L₂ 不亮'].join('，'));
      W.out.set('i', Math.abs(bat.I || 0), 2);
      if (shortBat) {
        S.seen.add('short');
        W.goal.done('short');
        return W.status('<b>电源被短路了！</b>电流很大（约 ' + Math.abs(bat.I).toFixed(1) + ' A），电池在发烫，导线变红——这是不允许的。快点那根导线把它拆掉！');
      }
      if (l1 || l2) {
        W.goal.done('lit');
        if (l1 && l2) { S.seen.add('both'); W.goal.done('both'); }
        if ((l1Shorted && !l1 && l2) || (l2Shorted && !l2 && l1)) { W.goal.done('lampShort'); return W.status(`导线把 ${l1Shorted ? 'L₁' : 'L₂'} 的两端连了起来：电流从这根导线<b>绕过</b>了它，它熄灭了；另一个灯两端电压变大，更亮了——这个灯被<b>短路</b>了。`); }
        return W.status(l1 && l2 ? '两个灯都亮了。现在用一根导线，把其中一个灯的两端连起来试试。' : '<b>通路</b>：电流从电源正极出发，经过开关、小灯泡回到负极，灯亮了。再断开开关看看。');
      }
      if (S.everLit && !sw.closed) { W.goal.done('open'); return W.status('开关断开：电路在开关处被切断，没有电流通过——这是<b>断路</b>，灯不亮。'); }
      if (!circuit.wires.length) return W.status('从电池盒的接线柱按住，拖到开关的接线柱上，就连上了一根导线。');
      return W.status(sw.closed ? '灯还没亮：检查一下电路是不是从正极出发，经过开关和灯，回到了负极。' : '开关是断开的。点一下开关把它合上。');
    };

    const bench = new Bench(C, group, { unscrew: false, onChange: (c, ev) => { if ([L1, L2].some(lit)) S.everLit = true; judge(c, ev); } });

    // 示范接法（课本图15.2-7：电源—开关—灯）
    const demo = () => {
      C.clearWires().wire('E.+', 'S.b').wire('S.a', 'L1.a').wire('L1.b', 'E.-');
      sw.closed = true; C.solve(); S.everLit = true; judge(C);
    };

    return {
      group,
      size: { w: 0.34, d: 0.26, h: 0.08 },
      view: { elev: 42, azim: 0, lookY: 0.3, margin: 1.0 },
      pointer: bench.pointer(),
      mount(ui) {
        const out = readout([{ key: 's', label: '开关' }, { key: 'i', label: '电路中的电流', unit: 'A' }, { key: 'l', label: '小灯泡', span: true }]);
        const btn = buttons([{ text: '示范一种接法', ghost: true, onClick: demo }, { text: '拆掉全部导线', ghost: true, onClick: () => { C.clearWires(); C.solve(); judge(C); } }]);
        ui.controls.append(note('<b>连导线</b>：按住一个接线柱，拖到另一个接线柱上松开。<b>拆导线</b>：点一下导线。<b>开关</b>：点一下开关。'), out.el, btn.el);
        W = { out, status: (m) => ui.status(m), goal: goals(ui, [['lit', '连一个通路，让小灯泡亮起来'], ['open', '断开开关，看看断路'], ['both', '让两个小灯泡都亮起来'], ['lampShort', '用一根导线把其中一个灯短路'], ['short', '试一试：把电源正负极直接连起来会怎样']]) };
        judge(C);
      },
      update(dt) { C.update(dt); bench.update(dt); },
      debug: { demo, C },
    };
  },
};
