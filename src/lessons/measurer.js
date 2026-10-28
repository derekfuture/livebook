// 图17.3-2 用电流表和电压表测量电阻（伏安法）。桌上的器材没有连，学生按电路图自己连：
// 待测电阻、电流表串联，电压表并在待测电阻两端，滑动变阻器“一上一下”串联进来改变电压。多测几组，算出电阻再求平均值。
// 想想做做：把电阻器换成小灯泡——算出来的电阻随电压升高而变大（灯丝温度升高，电阻变大），这时求平均值没有意义。
import * as THREE from 'three';
import { seg, slider, buttons, goals, note, table, chart } from './kit/ui.js';
import { Circuit, battery, switchPart, meterPart, resistorPart, rheostatPart, lampPart } from './kit/circuit.js';
import { Bench, nets } from './kit/bench.js';

const RX = 8;     // 待测电阻的阻值（学生不知道）

export default {
  id: 'measurer',
  fig: '图17.3-2',
  title: '用电流表和电压表测量电阻',
  stampText: '测量',
  predict: {
    q: '用同样的方法测一个<b>小灯泡</b>的电阻：电压越高，灯越亮。<br>每次算出来的电阻——',
    hint: '课本第 102 页「想想做做」',
    options: ['都差不多，误差而已', '电压越高，算出的电阻越大', '电压越高，算出的电阻越小'],
    answer: 1,
  },
  conclusion: {
    crops: [{ page: 107, rect: [62, 280, 360, 344] }, { page: 107, rect: [62, 498, 360, 572] }],   // 课本第 101 页
    quote: '可以通过测量电阻器两端的电压和通过的电流来间接地测量电阻器的电阻。这种测量电阻的方法，有时简称为伏安法。……为了减小误差，实际测量中要改变待测电阻器两端的电压，多次测量电压及电流，并分别算出相应的电阻，最后求出电阻的平均值。',
    formula: '<i>R</i> = <i>U</i> / <i>I</i>',
    why: '电阻器的电阻基本不随电压变化，几次算出的值只是因为读数误差而略有不同，求平均值可以减小误差。小灯泡不一样：电压越高，灯丝越热，电阻越大——这不是误差，而是灯丝电阻随温度变化，所以不能用平均值作为小灯泡的电阻。闭合开关前，滑片要放在接入电阻最大的位置，使开始测量时电流最小。',
    src: '课本第 101–102 页 · 第十七章 第3节 电阻的测量',
  },

  create({ tag, look, back }) {
    const group = new THREE.Group();
    let C, bench, A, V, P, X, sw;
    const S = { dut: 'R', rows: { R: [], L: [] } };
    let W = null;
    const tags = [];

    const build = (keep) => {
      const wires = keep && C ? C.wires.map((w) => [w.a, w.b]) : [];
      const closed = sw?.closed || false, pos = P?.pos ?? 1;
      if (C) { group.remove(C.group); C.dispose(); }
      for (const t of tags.splice(0)) t.remove();
      C = new Circuit();
      C.add(battery('E', { cells: 2, r: 0.1 }), [-0.03, -0.115]);
      sw = C.add(switchPart('S', { closed }), [-0.17, -0.04]);
      A = C.add(meterPart('A', { type: 'A' }), [0.15, -0.055]);
      V = C.add(meterPart('V', { type: 'V' }), [0.0, -0.005]);
      P = C.add(rheostatPart('P', { Rmax: 20, pos }), [-0.1, 0.1]);
      X = C.add(S.dut === 'R' ? resistorPart('X', { R: RX }) : lampPart('X'), [0.1, 0.1]);
      A.group.scale.setScalar(0.85); V.group.scale.setScalar(0.85);
      group.add(C.group);
      for (const [a, b] of wires) C.wire(a, b);
      C.solve();
      bench = new Bench(C, group, { onChange: (c, ev) => { W?.slider.set(Math.round(P.pos * 100)); judge(ev); }, unscrew: false });
      for (const [txt, x, z] of [[S.dut === 'R' ? '待测电阻 Rₓ' : '小灯泡（2.5 V）', 0.1, 0.138], ['滑动变阻器', -0.1, 0.135], ['电源', -0.03, -0.145], ['开关', -0.17, -0.07]]) tags.push(tag(txt, 'pill').loc(group, x, 0.005, z));
      judge();
    };

    // 电路连对了没有
    const check = () => {
      const f = nets(C);
      const iA = Math.abs(A.value || 0), iX = Math.abs(X.I || 0);
      const vEnds = ['3', '15'].filter((t) => C.wires.some((w) => w.a === `V.${t}` || w.b === `V.${t}`));
      const vOn = vEnds.length === 1 && [f('V.-'), f(`V.${vEnds[0]}`)].sort().join() === [f('X.a'), f('X.b')].sort().join();
      const pEnds = ['A', 'B', 'C', 'D'].filter((k) => C.wires.some((w) => w.a === `P.${k}` || w.b === `P.${k}`));
      const updown = pEnds.filter((k) => k < 'C').length === 1 && pEnds.some((k) => k >= 'C');
      const pI = Math.max(Math.abs(P.Iap || 0), Math.abs(P.Ipb || 0));
      if (!sw.closed) return { k: 'open' };
      if (iA > 1) return { k: 'bad', msg: '电流表的示数一下打到了头——电流表可能直接接在了电源两端，或者和待测元件并联了。快断开开关检查。' };
      if (iA < 0.005 && Math.abs(V.value || 0) > 2) return { k: 'bad', msg: '电流表几乎没有示数，电压表的示数却接近电源电压：电压表<b>串联</b>在电路里了。电压表要和待测元件<b>并联</b>。' };
      if (iA < 0.005) return { k: 'none' };
      if (Math.abs(iA - iX) > 0.005) return { k: 'bad', msg: '电流表测的不是通过待测元件的电流：电流表要和待测元件<b>串联</b>。' };
      if (!vOn) return { k: 'bad', msg: '电压表要并联在<b>待测元件</b>的两端（一个接 “−”，另一个接 “3”）。' };
      if (A.reverse || V.reverse) return { k: 'bad', msg: '有电表的指针反偏了：电流要从 “+” 接线柱流进去，“−” 接线柱流出来。' };
      if (pI < 0.005 || !updown) return { k: 'nor', msg: pI < 0.005 ? '滑动变阻器没有接进电路，就没法改变待测元件两端的电压。把它“一上一下”串联进来。' : '滑动变阻器要“一上一下”地接，滑片才能改变电阻。' };
      return { k: 'ok' };
    };
    const reading = () => ({ u: Math.round(Math.abs(V.value || 0) * 10) / 10, i: Math.round(Math.abs(A.value || 0) / 0.02) * 0.02 });

    const judge = (ev = {}) => {
      if (!W || !A) return;
      if (ev.msg) return W.status(ev.msg);
      const c = check();
      if (ev.toggled === 'S' && sw.closed && c.k === 'ok') {
        const pEnd = ['A', 'B'].find((k) => C.wires.some((w) => w.a === `P.${k}` || w.b === `P.${k}`));
        const rIn = pEnd === 'A' ? P.pos : 1 - P.pos;
        if (rIn > 0.85) W.goal.done('safe');
        else return W.status('电路连对了。不过闭合开关<b>之前</b>，应该先把滑片移到接入电阻最大的位置，让开始测量时电流最小。断开开关，移好滑片再闭合一次。');
      }
      if (c.k === 'open') return W.status(C.wires.length < 5 ? '按图17.3-2 连电路：从接线柱按住拖到另一个接线柱。点“示范接法”可以看一种连法。' : '开关是断开的。闭合之前，先把滑片放到接入电阻最大的位置。');
      if (c.k === 'none') return W.status('电路中没有电流：检查电路是不是断开了。');
      if (c.msg) return W.status(c.msg);
      W.goal.done('wire');
      const { u, i } = reading();
      if (S.ask && (S.ask.u !== u || S.ask.i !== i)) { W.drop(); return W.status('电路变了，刚才那组读数作废。'); }
      if (!S.ask) W.status('两个电表都有示数了。读一读两个电表，点“记下这组数据”；移动滑片，多测几组。');
    };

    let redraw = () => {};
    const record = () => {
      const c = check();
      if (c.k !== 'ok') return W.status(c.msg || '先把电路连好、闭合开关，让两个电表都正常偏转。');
      const { u, i } = reading();
      const list = S.rows[S.dut];
      if (list.some((r) => Math.abs(r.u - u) < 0.05)) return W.status('这个电压已经测过了，移动滑片换一个电压。');
      // 学生自己读两个电表，再自己算 R = U / I
      S.ask = { u, i };
      const at = (m) => group.worldToLocal(m.group.getWorldPosition(new THREE.Vector3())).toArray();
      look(at(V), [0, 1, 0.35], 0.12, () => back());
      W.ask('读<b>电压表</b>（“3” 接线柱，每小格 0.1 V）：<i>U</i> = ?', [u, u + 0.1, u * 5].map((x) => `${x.toFixed(1)} V`), `${u.toFixed(1)} V`, '再看看电压表的指针：3 V 量程看下面那排刻度，每小格 0.1 V。', () => {
        look(at(A), [0, 1, 0.35], 0.12, () => back());
        W.ask('再读<b>电流表</b>（“0.6” 接线柱，每小格 0.02 A）：<i>I</i> = ?', [i, i + 0.02, i * 5].map((x) => `${x.toFixed(2)} A`), `${i.toFixed(2)} A`, '0.6 A 量程看下面那排刻度，每小格 0.02 A。', () => {
          back();
          const R = u / i;
          W.ask(`<i>U</i> = ${u.toFixed(1)} V，<i>I</i> = ${i.toFixed(2)} A。算一算：<i>R</i> = ?`, [R, i / u, u * i].map((x) => `${x.toFixed(x < 1 ? 2 : 1)} Ω`), `${R.toFixed(R < 1 ? 2 : 1)} Ω`, '伏安法：R = U ÷ I。', () => { S.ask = null; save(u, i); });
        });
      });
    };
    const save = (u, i) => {
      const list = S.rows[S.dut];
      list.push({ u, i, r: u / i });
      list.sort((a, b) => a.u - b.u);
      redraw();
      const spread = list[list.length - 1].u - list[0].u;
      if (S.dut === 'R') {
        if (list.length < 3) return W.status(`第 ${list.length} 组记下了。移动滑片，换一个电压再测。`);
        // 电阻器：学生自己求平均值
        const avg = list.reduce((s, r) => s + r.r, 0) / list.length;
        const f = (x) => `${x.toFixed(1)} Ω`;
        W.ask(`电阻器已经测了 ${list.length} 组。看表格最后一列，求平均值：<i>R</i> ≈ ?`, [avg, list[list.length - 1].r === avg ? avg + 1 : list[list.length - 1].r, avg * list.length].map(f), f(avg), `把表里每一组算出的 R 加起来，再除以 ${list.length}。`, () => {
          W.goal.done('rx'); S.avgOK = true; redraw();
          W.status(`对：平均值 <i>R</i> ≈ ${avg.toFixed(1)} Ω。每次算出的值略有不同，是读数的误差；多测几次取平均值，可以减小误差。`);
        });
      } else {
        if (list.length < 3 || spread < 1) return W.status(list.length < 3 ? `第 ${list.length} 组记下了。再测几组，从暗到亮。` : '电压再拉开一些（灯从很暗到正常发光）。');
        W.ask('小灯泡测了几组。比一比表格：电压越高（灯越亮），算出的电阻——', ['越大', '越小', '基本不变'], '越大', '看表格最后一列，从上往下（电压从低到高）是变大还是变小？', () => {
          W.goal.done('lamp');
          W.status('对：电压越高，灯丝越热，<b>灯丝的电阻越大</b>。这不是误差，所以不能用平均值作为小灯泡的电阻。');
        });
      }
    };

    return {
      group,
      size: { w: 0.42, d: 0.29, h: 0.09 },
      view: { elev: 48, azim: 0, lookY: 0.25, margin: 1.0 },
      pointer: { down: (r, e) => bench.pointer().down(r, e), move: (r, e) => bench.pointer().move(r, e), up: (r, e) => bench.pointer().up(r, e) },
      mount(ui) {
        const dut = seg('待测元件', ['电阻器 Rₓ', '小灯泡'], (_, k) => { W.drop(); S.dut = k ? 'L' : 'R'; build(true); redraw(); });
        const sl = slider('滑片的位置（也可以直接拖滑片）', { min: 0, max: 100, value: 100, fmt: (v) => (v <= 2 ? 'A 端' : v >= 98 ? 'B 端' : `离 A 端 ${v}%`), onInput: (v) => { P.setPos(v / 100); judge(); } });
        const rec = buttons([{ text: '记下这组数据', onClick: record }]);
        const demo = () => {
          C.clearWires().wire('E.+', 'A.0.6').wire('A.-', 'X.b').wire('X.a', 'P.C').wire('P.A', 'S.b').wire('S.a', 'E.-').wire('V.3', 'X.b').wire('V.-', 'X.a');
          sw.closed = false; P.setPos(1); sl.set(100); C.solve(); judge();
          W.status('按图17.3-2 连好了，滑片在 B 端（接入电阻最大）。点开关闭合电路，再移动滑片测几组。');
        };
        const tb = { R: table(['序号', 'U/V', 'I/A', 'R = U/I /Ω']), L: table(['序号', 'U/V', 'I/A', 'R = U/I /Ω', '亮度']) };
        const avgEl = note('');
        const ch = chart({ x: { label: 'U/V', min: 0, max: 3 }, y: { label: 'I/A', min: 0, max: 0.4 }, series: [{ color: '#1f6fb8', points: [], dots: true }, { color: '#d98a1c', points: [], dots: true }], legend: '<span style="color:#1f6fb8">●</span> 电阻器　<span style="color:#d98a1c">●</span> 小灯泡' });
        redraw = () => {
          for (const k of ['R', 'L']) {
            tb[k].clear();
            S.rows[k].forEach((r, j) => tb[k].add([String(j + 1), r.u.toFixed(1), r.i.toFixed(2), r.r.toFixed(1), ...(k === 'L' ? [r.u > 2.2 ? '较亮' : r.u > 1.2 ? '较暗' : '很暗'] : [])], { highlight: false }));
          }
          const l = S.rows.R;
          avgEl.innerHTML = S.avgOK && l.length >= 2 ? `电阻器的平均值 R ≈ (${l.map((r) => r.r.toFixed(1)).join(' + ')}) ÷ ${l.length} ≈ <b>${(l.reduce((s, r) => s + r.r, 0) / l.length).toFixed(1)} Ω</b>` : '';
          ch.series[0].points = l.map((r) => [r.u, r.i]); ch.series[0].line = l.length > 1;
          ch.series[1].points = S.rows.L.map((r) => [r.u, r.i]); ch.series[1].line = S.rows.L.length > 1;
          ch.draw();
        };
        ui.controls.append(note('<b>连导线</b>：按住接线柱拖到另一个接线柱；<b>拆导线</b>：点导线。电压表用 “3”、电流表用 “0.6” 接线柱。'), dut.el, sl.el, rec.el,
          buttons([{ text: '示范接法', ghost: true, onClick: demo }, { text: '拆掉全部导线', ghost: true, onClick: () => { C.clearWires(); C.solve(); judge(); } }]).el);
        ui.data.append(note('<b>电阻器</b>'), tb.R.el, avgEl, note('<b>小灯泡</b>'), tb.L.el, ch.el);
        const qb = buttons([0, 1, 2].map(() => ({ text: '', ghost: true, onClick: () => {} })));
        qb.el.hidden = true;
        ui.controls.append(qb.el);
        W = { ask: (q, opts, right, hint, ok) => {
          const sh = [...new Set(opts)].sort(() => Math.random() - 0.5);
          qb.btns.forEach((b, j) => { b.hidden = j >= sh.length; if (b.hidden) return; b.innerHTML = sh[j]; b.onclick = () => { if (sh[j] !== right) return ui.status(hint); qb.el.hidden = true; ok(); }; });
          qb.el.hidden = false; ui.status(q);
        }, drop: () => { S.ask = null; if (!qb.el.hidden) { qb.el.hidden = true; back(); } }, slider: sl, status: (m) => ui.status(m), goal: goals(ui, [['wire', '按图17.3-2 连好电路'], ['safe', '闭合开关前，把滑片放到接入电阻最大的位置'], ['rx', '测电阻器：至少 3 组，求平均值'], ['lamp', '换成小灯泡：从暗到亮测 3 组以上']]) };
        build();
      },
      update(dt) { C?.update(dt); bench?.update(dt); },
      debug: { get C() { return C; }, record, set: (p) => { P.setPos(p); judge(); } },
    };
  },
};
