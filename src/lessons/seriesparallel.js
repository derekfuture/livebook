// 图15.3-1 / 15.3-2 两个小灯泡的串联和并联；图15.3-3 / 15.3-4 开关的控制作用。
// 桌上：电池盒、干路开关 S、两个支路开关 S₁ S₂、两个小灯泡。学生自己连。点小灯泡可以拧下 / 拧上。
import * as THREE from 'three';
import { readout, buttons, goals, note } from './kit/ui.js';
import { Circuit, battery, switchPart, lampPart } from './kit/circuit.js';
import { Bench, voltageOf } from './kit/bench.js';

export default {
  id: 'seriesparallel',
  fig: '图15.3-1',
  title: '串联电路和并联电路',
  stampText: '探究',
  predict: {
    q: '两个小灯泡<b>串联</b>，都在发光。<br>拧下其中一个小灯泡，另一个会怎样？',
    hint: '课本第 50–51 页',
    options: ['还亮着', '也熄灭了', '变得更亮'],
    answer: 1,
  },
  conclusion: {
    page: 57, rect: [62, 555, 362, 640],     // 课本第 51 页：实验结果表明……
    quote: '在串联电路中，开关可以控制所有用电器，开关位置的改变并不影响它对用电器的控制作用；在并联电路中，干路开关可以控制所有用电器，支路开关只能控制其所在支路的用电器。',
    why: '串联电路只有一条电流的路径：拧下一个灯，电路就断了，另一个灯也熄灭。并联电路里两个灯各在一条支路上：拧下一个，另一条支路照样有电流，另一个灯继续亮。家里的电灯、电视机、电脑大多是并联的。',
    src: '课本第 50–52 页 · 第十五章 第3节 串联电路和并联电路',
  },

  create({ tag }) {
    const group = new THREE.Group();
    const C = new Circuit();
    const bat = C.add(battery('E', { cells: 2 }), [0.03, -0.085]);
    const S = C.add(switchPart('S'), [-0.11, -0.085]);
    const S1 = C.add(switchPart('S1'), [-0.13, 0.05]);
    const S2 = C.add(switchPart('S2'), [0.13, 0.05]);
    const L1 = C.add(lampPart('L1'), [-0.05, 0.05]);
    const L2 = C.add(lampPart('L2'), [0.05, 0.05]);
    group.add(C.group);
    for (const [txt, x, z] of [['电源', 0.03, -0.12], ['开关 S', -0.11, -0.115], ['开关 S₁', -0.13, 0.08], ['开关 S₂', 0.13, 0.08], ['L₁', -0.05, 0.085], ['L₂', 0.05, 0.085]]) tag(txt, 'pill').loc(group, x, 0.005, z);
    void bat;

    let W = null;
    const seen = new Set();
    const lit = (L) => L.screwed && !L.broken && (L.brightness || 0) > 0.04;
    // 判断两个灯是串联还是并联（都要在电路里、都亮着时才判断）
    const kind = () => {
      if (!lit(L1) || !lit(L2)) return null;
      const u1 = voltageOf(C, 'L1'), u2 = voltageOf(C, 'L2'), U = Math.abs(bat.U || 0);
      if (u1 > 0.8 * U && u2 > 0.8 * U) return 'parallel';           // 每个灯两端都是电源电压
      if (Math.abs(u1 + u2 - U) < 0.08 * U) return 'series';          // 两个灯分电源电压
      return null;
    };
    let mode = null;          // 最近一次确认的连接方式

    const judge = (circuit, ev = {}) => {
      if (!W) return;
      if (ev.msg) return W.status(ev.msg);
      W.out.set('l', [lit(L1) ? 'L₁ 亮' : L1.screwed ? 'L₁ 不亮' : 'L₁ 拧下了', lit(L2) ? 'L₂ 亮' : L2.screwed ? 'L₂ 不亮' : 'L₂ 拧下了'].join('，'));
      W.out.set('s', [S, S1, S2].map((x) => `${x.name.replace('1', '₁').replace('2', '₂')}${x.closed ? '合' : '断'}`).join(' '));
      if (bat.short) return W.status('<b>电源被短路了！</b>快把那根导线拆掉。');
      const k = kind();
      if (k) { mode = k; W.out.set('k', k === 'series' ? '串联' : '并联'); }
      if (k === 'series') { W.goal.done('series'); return W.status('两个灯<b>串联</b>：电流只有一条路，依次通过 L₁ 和 L₂。试试拧下一个灯（点一下灯泡），再试试断开不同位置的开关。'); }
      if (k === 'parallel') { W.goal.done('parallel'); return W.status('两个灯<b>并联</b>：两个灯的两端分别连在一起，电流分成两条支路。试试拧下一个灯，再试试只断开支路上的开关。'); }
      // 拧下 / 断开开关之后看到的现象
      if (ev.unscrewed && mode) {
        const other = ev.unscrewed === 'L1' ? L2 : L1, gone = ev.unscrewed === 'L1' ? L1 : L2;
        if (!gone.screwed) {
          if (mode === 'series' && !lit(other)) { W.goal.done('s-unscrew'); return W.status('串联时拧下一个灯，电路断了——另一个灯<b>也熄灭了</b>。'); }
          if (mode === 'parallel' && lit(other)) { W.goal.done('p-unscrew'); return W.status('并联时拧下一个灯，另一条支路还是通的——另一个灯<b>照样亮</b>。'); }
        }
      }
      if (ev.toggled && mode === 'parallel' && !circuit.get(ev.toggled).closed) {
        if ((ev.toggled === 'S1' && !lit(L1) && lit(L2)) || (ev.toggled === 'S2' && !lit(L2) && lit(L1))) { W.goal.done('branch'); return W.status('断开<b>支路开关</b>：只有它所在支路的灯熄灭了，另一个灯照样亮——支路开关只能控制它所在的支路。'); }
        if (ev.toggled === 'S' && !lit(L1) && !lit(L2)) { W.goal.done('main'); return W.status('断开<b>干路开关</b> S：两个灯都熄灭了——干路开关控制所有用电器。'); }
      }
      if (ev.toggled && mode === 'series' && !circuit.get(ev.toggled).closed && !lit(L1) && !lit(L2)) { seen.add(ev.toggled); return W.status(`串联电路里，开关 ${ev.toggled} 断开，两个灯都灭了。${seen.size < 2 ? '把开关换个位置串在电路里，再试一次。' : '开关放在哪里，都能控制所有用电器。'}`); }
      return W.status('连线：按住接线柱拖到另一个接线柱。先让两个灯一起亮起来（串联或并联都行）。');
    };

    const bench = new Bench(C, group, { onChange: judge, maxWires: 12 });
    const demo = (k) => {
      C.clearWires();
      for (const x of [S, S1, S2]) x.closed = true;
      if (k === 'series') C.wire('E.+', 'S.b').wire('S.a', 'L1.a').wire('L1.b', 'L2.a').wire('L2.b', 'E.-');
      else C.wire('E.+', 'S.b').wire('S.a', 'S1.a').wire('S1.b', 'L1.a').wire('S.a', 'S2.b').wire('S2.a', 'L2.b').wire('L1.b', 'E.-').wire('L2.a', 'E.-');
      L1.screwed = L2.screwed = true;
      C.solve(); judge(C);
    };

    return {
      group,
      size: { w: 0.36, d: 0.26, h: 0.08 },
      view: { elev: 44, azim: 0, lookY: 0.3, margin: 1.0 },
      pointer: bench.pointer(),
      mount(ui) {
        const out = readout([{ key: 'k', label: '连接方式' }, { key: 's', label: '开关' }, { key: 'l', label: '小灯泡', span: true }]);
        const btn = buttons([{ text: '示范：串联', ghost: true, onClick: () => demo('series') }, { text: '示范：并联', ghost: true, onClick: () => demo('parallel') }, { text: '拆掉全部导线', ghost: true, onClick: () => { C.clearWires(); C.solve(); mode = null; judge(C); } }]);
        ui.controls.append(note('<b>连导线</b>：按住接线柱拖到另一个接线柱。<b>拆导线</b>：点导线。点开关合上/断开；<b>点灯泡拧下/拧上</b>。'), out.el, btn.el);
        W = { out, status: (m) => ui.status(m), goal: goals(ui, [['series', '把两个灯串联起来'], ['s-unscrew', '串联时拧下一个灯'], ['parallel', '把两个灯并联起来（干路一个开关，每条支路一个开关）'], ['p-unscrew', '并联时拧下一个灯'], ['branch', '并联时只断开一个支路开关'], ['main', '并联时断开干路开关']]) };
        judge(C);
      },
      update(dt) { C.update(dt); bench.update(dt); },
      debug: { demo, C },
    };
  },
};
