// 图15.4-3 电流表的连接。电流表必须和被测用电器串联；电流从“+”（红色）接线柱流进、“−”流出；选对测量范围。
// 桌上：电池盒、开关、小灯泡、电流表（“−”“0.6”“3”三个接线柱）。学生自己连；接错的后果都按电路算出来。
import * as THREE from 'three';
import { readout, buttons, goals, note, table } from './kit/ui.js';
import { Circuit, battery, switchPart, lampPart, meterPart } from './kit/circuit.js';
import { Bench, nets } from './kit/bench.js';

export default {
  id: 'ammeter',
  fig: '图15.4-3',
  title: '用电流表测量电流',
  stampText: '测量',
  predict: {
    q: '要用电流表测量通过小灯泡的电流，电流表应该怎样接？',
    hint: '课本第 56 页',
    options: ['和小灯泡并联', '和小灯泡串联', '直接接在电池两极上'],
    answer: 1,
  },
  conclusion: {
    page: 62, rect: [40, 362, 342, 522],     // 课本第 56 页：电流表的连接（第一、第二）
    quote: '第一，必须将电流表和被测的用电器串联。第二，必须让电流从红色（“＋”号）接线柱流进，再从黑色（“－”号）接线柱流出。第三，必须正确选择电流表的测量范围。',
    why: '电流表的电阻很小。和灯串联时，它几乎不影响电路，测的就是通过灯的电流；如果误把它和灯并联，电流几乎全部从电流表通过，电流很大，很容易损坏电流表；直接接到电源两极上更危险。接 “0.6” 接线柱时读表盘下排的数（分度值 0.02 A），接 “3” 时读上排（分度值 0.1 A）。不能估计电流大小时，先用大量程<b>试触</b>。',
    src: '课本第 56–57 页 · 第十五章 第4节 电流的测量',
  },

  create({ tag, look, back }) {
    const group = new THREE.Group();
    const C = new Circuit();
    C.add(battery('E', { cells: 2 }), [-0.04, -0.085]);
    const sw = C.add(switchPart('S'), [-0.14, -0.06]);
    const L = C.add(lampPart('L'), [-0.08, 0.06]);
    const A = C.add(meterPart('A', { type: 'A' }), [0.09, 0.0]);
    group.add(C.group);
    for (const [txt, x, z] of [['电源', -0.04, -0.12], ['开关', -0.14, -0.09], ['小灯泡', -0.08, 0.095], ['电流表', 0.09, 0.05]]) tag(txt, 'pill').loc(group, x, 0.005, z);

    let W = null;
    const S = { rows: [], ranges: new Set() };
    const lit = () => L.screwed && !L.broken && (L.brightness || 0) > 0.05;
    // 电流表接法：串联（它和灯通过同样的电流）/ 并联在灯两端 / 直接在电源两极 / 没接上
    const how = () => {
      const f = nets(C);
      const ends = ['-', '0.6', '3'].filter((t) => C.wires.some((w) => w.a === `A.${t}` || w.b === `A.${t}`));
      if (ends.length < 2) return 'off';
      const iA = Math.abs(A.value || 0), iL = Math.abs(L.I || 0);
      if (iA > 2.5) return f(`A.${ends[0]}`) === f('L.a') || f(`A.${ends[0]}`) === f('L.b') ? 'parallel' : 'battery';
      if (iA > 0.01 && Math.abs(iA - iL) < 0.01) return 'series';
      if (iA > 0.5 && iL < 0.05) return 'parallel';
      return 'off';
    };

    const judge = (circuit, ev = {}) => {
      if (!W) return;
      if (ev.msg) return W.status(ev.msg);
      W.stale?.();
      const h = how(), v = A.value || 0;
      W.out.set('r', A.range ? `0 ~ ${A.range} A` : '—');
      W.out.set('l', lit() ? '亮' : '不亮');
      if (h === 'parallel' || h === 'battery') { W.goal.done('wrong'); return W.status(`<b>电流表接错了！</b>${h === 'parallel' ? '电流表和小灯泡并联：电流几乎全从电流表流过，小灯泡不亮' : '电流表直接接在了电源两极上'}，指针一下打到了头——这样很容易损坏电流表。快拆掉那根导线。`); }
      if (h === 'series' && A.reverse) { W.goal.done('reverse'); return W.status('指针向<b>左</b>偏了：电流是从“−”接线柱流进去的，正负接线柱接反了。'); }
      if (h === 'series' && A.over) return W.status('指针超过了最大刻度：测量范围选小了，换接 “3” 接线柱。');
      if (h === 'series') {
        W.goal.done('series');
        S.ranges.add(A.range);
        return W.status(`电流表和灯串联，电流从“+”流进，指针向右偏转了。${A.range > 1 ? '接的是 “3” 接线柱——看上排的刻度。' : '接的是 “0.6” 接线柱——看下排的刻度。'}凑近看看指针指在哪一格，然后记录读数。`);
      }
      if (!sw.closed && circuit.wires.length >= 3) return W.status('开关还是断开的。');
      return W.status('先把电源、开关、小灯泡和电流表连成一个电路。电流表的 “−” 接线柱是黑色的，“0.6”“3” 是红色的。');
    };
    const bench = new Bench(C, group, { onChange: judge, unscrew: false });

    const demo = () => { C.clearWires().wire('E.+', 'S.b').wire('S.a', 'A.0.6').wire('A.-', 'L.b').wire('L.a', 'E.-'); sw.closed = true; C.solve(); judge(C); };
    let near = false;

    return {
      group,
      size: { w: 0.36, d: 0.26, h: 0.1 },
      view: { elev: 40, azim: 0, lookY: 0.3, margin: 1.0 },
      pointer: bench.pointer(),
      mount(ui) {
        const out = readout([{ key: 'r', label: '测量范围' }, { key: 'l', label: '小灯泡' }]);
        const tb = table(['接线柱', '测量范围/A', '分度值/A', '读数/A'], { note: '读数要你自己看表盘填——点“记录”时，选你读到的数。' });
        const close = buttons([{ text: '凑近看电流表', ghost: true, onClick: () => {
          near = !near;
          if (near) { look([0.09, 0.056, 0.02], [0, 0.2, 1], 0.14, () => { near = false; close.btns[0].textContent = '凑近看电流表'; back(); }); close.btns[0].textContent = '↩ 回到整个电路'; }
          else { back(); close.btns[0].textContent = '凑近看电流表'; }
        } }]);
        // 读数练习：给 3 个候选读数，学生选自己看到的
        const pick = buttons([{ text: '记录读数…', onClick: () => ask() }]);
        const choices = buttons([{ text: '', ghost: true, onClick: () => answer(0) }, { text: '', ghost: true, onClick: () => answer(1) }, { text: '', ghost: true, onClick: () => answer(2) }]);
        choices.el.hidden = true;
        let opts = [];
        const ask = () => {
          if (how() !== 'series' || A.reverse || A.over) return ui.status('先把电流表正确地串联进电路，让指针正常偏转。');
          const v = Math.abs(A.value), r = A.range, div = r > 1 ? 0.1 : 0.02;
          const right = Math.round(v / div) * div;
          const wrongScale = r > 1 ? right / 5 : right * 5;           // 读错了排（量程看反了）
          opts = [right, wrongScale, right + div].map((x) => +x.toFixed(2)).sort(() => Math.random() - 0.5);
          opts.right = +right.toFixed(2);
          opts.snap = snap();
          if (!near) close.btns[0].click();     // 自动凑近，按钮也跟着变成“回到整个电路”
          choices.btns.forEach((b, i) => (b.textContent = `${opts[i]} A`));
          choices.el.hidden = false;
          ui.status(`接的是 “${r}” 接线柱。看表盘${r > 1 ? '上排' : '下排'}的刻度，你读到多少？`);
        };
        const answer = (i) => {
          if (!opts.snap || opts.snap !== snap()) { choices.el.hidden = true; opts = []; if (near) close.btns[0].click(); return ui.status('电路变了（量程、接法或读数和出题时不一样），这道题作废。重新点“记录读数…”。'); }
          const r = A.range;
          if (opts[i] !== opts.right) return ui.status(opts[i] === +(opts.right * (r > 1 ? 0.2 : 5)).toFixed(2) ? `读错排了：接 “${r}” 接线柱，要读${r > 1 ? '上排' : '下排'}的数。` : '再仔细数一数：指针过了几小格？');
          choices.el.hidden = true; if (near) close.btns[0].click();
          if (S.rows.includes(r)) return ui.status('这个量程已经记过了，换另一个量程再测一次。');
          S.rows.push(r);
          tb.add([`“−”和“${r}”`, `0 ~ ${r}`, r > 1 ? 0.1 : 0.02, opts.right]);
          if (S.rows.length >= 2) W.goal.done('both');
          ui.status(`记下了 ${opts.right} A。${S.rows.length < 2 ? '换接另一个量程的接线柱，再测一次。' : '两个量程测的是同一个电流。大量程每小格 0.1 A，只能读到 0.1 A；小量程每小格 0.02 A，读得更准——两次读数在各自的精度内是一致的。'}`);
        };
        ui.controls.append(note('<b>连导线</b>：按住接线柱拖到另一个接线柱。<b>拆导线</b>：点导线。点开关合上/断开。'), out.el, close.el, pick.el, choices.el, buttons([{ text: '示范一种接法', ghost: true, onClick: demo }, { text: '拆掉全部导线', ghost: true, onClick: () => { C.clearWires(); C.solve(); judge(C); } }]).el);
        ui.data.append(tb.el);
        // 出题时的条件：接法正确、量程、读数；任何一个变了，旧题就作废
        const snap = () => (how() === 'series' && !A.reverse && !A.over ? `${A.range}|${Math.abs(A.value).toFixed(3)}` : 'bad');
        W = { stale: () => { if (opts.snap && opts.snap !== snap()) { opts = []; choices.el.hidden = true; if (near) close.btns[0].click(); } }, out, status: (m) => ui.status(m), goal: goals(ui, [['series', '把电流表正确地串联在电路里'], ['both', '分别用 0.6 A 和 3 A 两个量程，读数并记录'], ['reverse', '试试把正负接线柱接反'], ['wrong', '试试把电流表和小灯泡并联（看看为什么不行）']]) };
        judge(C);
      },
      update(dt) { C.update(dt); bench.update(dt); },
      debug: { demo, C },
    };
  },
};
