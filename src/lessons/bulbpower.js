// 图18.2-4 改变小灯泡两端的电压（演示：小灯泡的电功率随电压变化）。电路按图连好：电源、开关、电流表、小灯泡（2.5 V）、滑动变阻器串联，
// 电压表并在小灯泡两端。移动滑片，使小灯泡两端的电压分别等于、低于和略高于 2.5 V，读两个电表，算出电功率 P = UI，比较亮度。
// 电压调得太高（超过额定电压很多）小灯泡会烧坏。灯丝电阻随温度变化（kit/circuit.js 的 lampPart）。
import * as THREE from 'three';
import { slider, buttons, goals, note, table } from './kit/ui.js';
import { Circuit, battery, switchPart, meterPart, lampPart, rheostatPart } from './kit/circuit.js';
import { Bench } from './kit/bench.js';

export default {
  id: 'bulbpower',
  fig: '图18.2-4',
  title: '小灯泡的电功率随电压变化',
  stampText: '测量',
  predict: {
    q: '标有“2.5 V”的小灯泡，两端的电压低于 2.5 V 时——',
    hint: '课本第 115 页「演示」',
    options: ['电功率比正常发光时小，灯变暗', '电功率不变，亮度不变', '电功率变大，灯更亮'],
    answer: 0,
  },
  conclusion: {
    crops: [{ page: 121, rect: [60, 616, 362, 664] }, { page: 122, rect: [160, 50, 460, 305] }],          // 课本第 116 页
    quote: '在不同的电压下，同一个小灯泡的亮度不同，电功率也不一样；小灯泡的电功率随着它两端的电压而改变。……用电器正常工作时的电压叫作额定电压，用电器在额定电压下工作时的电功率叫作额定功率。……实际电压偏低，用电器的电功率低，不能正常工作。实际电压偏高，有可能损坏用电器。',
    formula: '<i>P</i> = <i>UI</i>',
    why: '小灯泡的亮度由它的实际功率决定：U 等于额定电压 2.5 V 时，实际功率等于额定功率，正常发光；U 低于 2.5 V，电流也变小，实际功率小于额定功率，灯较暗；U 略高于 2.5 V，实际功率大于额定功率，灯比正常时亮，但时间长了容易烧坏。所以说一个用电器的电功率，要指明是在什么电压下。（灯丝的电阻随温度升高而增大，所以电压加倍，功率并不是变成 4 倍。）',
    src: '课本第 115–116 页 · 第十八章 第2节 电功率',
  },

  create({ tag, look, back }) {
    const group = new THREE.Group();
    const C = new Circuit();
    // 课本图18.2-4 的电路：上面电池、开关；左边电流表；中间小灯泡，上面并着电压表；右下滑动变阻器
    const E = C.add(battery('E', { cells: 3, r: 0.1 }), [-0.04, -0.11]);
    const sw = C.add(switchPart('S', { closed: false }), [0.13, -0.11]);
    const A = C.add(meterPart('A', { type: 'A' }), [-0.17, -0.0]);
    const L = C.add(lampPart('L'), [-0.02, 0.08]);
    const V = C.add(meterPart('V', { type: 'V' }), [-0.02, -0.01]);
    const R = C.add(rheostatPart('R', { Rmax: 20, pos: 1 }), [0.13, 0.08]);
    A.group.scale.setScalar(0.85); V.group.scale.setScalar(0.85);
    group.add(C.group);
    C.wire('E.+', 'S.a').wire('S.b', 'R.D').wire('R.A', 'L.b').wire('L.a', 'A.0.6').wire('A.-', 'E.-').wire('V.3', 'L.b').wire('V.-', 'L.a');
    for (const [txt, x, z] of [['小灯泡（2.5 V）', -0.02, 0.118], ['滑动变阻器', 0.13, 0.118], ['电源（3 节干电池）', -0.04, -0.142], ['开关', 0.13, -0.137]]) tag(txt, 'pill').loc(group, x, 0.005, z);
    void E;

    let W = null, sl = null;
    const S = { rows: [], seen: new Set() };
    const lit = () => !L.broken && (L.brightness || 0) > 0.03;
    const judge = (c, ev = {}) => {
      if (!W) return;
      sl?.set(Math.round(R.pos * 100));
      const pre = S.stale?.() ? '<b>电路变了，刚才那组读数作废</b>，调好以后重新读。' : '';
      if (L.broken) return W.status('<b>小灯泡烧坏了！</b>它两端的电压比额定电压 2.5 V 高太多，实际功率太大，灯丝烧断了。点“换一个新的小灯泡”，滑片放回电阻最大的一端再闭合开关。');
      if (pre || ev.msg) return W.status(pre || ev.msg);
      if (!sw.closed) return W.status('开关是断开的。滑片已经放在接入电阻最大的一端（B 端），点开关闭合电路。');
      const u = Math.abs(V.value || 0);
      if (V.over) return W.status('电压表的指针超过了 3 V——小灯泡两端的电压太高了，赶快把滑片往 B 端移！');
      W.status(`${u > 2.6 ? '小灯泡比正常发光时<b>更亮</b>了，' : u > 2.4 ? '小灯泡<b>正常发光</b>。' : lit() ? '小灯泡发光，但比较<b>暗</b>。' : '小灯泡几乎不亮。'}移动滑片，让电压表的示数分别等于、低于、略高于 2.5 V，每次凑近读两个电表。`);
    };
    const bench = new Bench(C, group, { onChange: judge, unscrew: false });

    let near = null;
    return {
      group,
      size: { w: 0.42, d: 0.29, h: 0.09 },
      view: { elev: 48, azim: 0, lookY: 0.25, margin: 1.0 },
      pointer: bench.pointer(),
      mount(ui) {
        sl = slider('滑片的位置（也可以直接拖滑片）', { min: 0, max: 100, value: 100, fmt: (v) => (v <= 2 ? 'A 端' : v >= 98 ? 'B 端' : `离 A 端 ${v}%`), onInput: (v) => { R.setPos(v / 100); judge(C); } });
        const choices = buttons([0, 1, 2].map((j) => ({ text: '', ghost: true, onClick: () => answer(j) })));
        choices.el.hidden = true;
        const tb = table(['', 'U/V', 'I/A', 'P = UI /W', '亮度']);
        let q = null;
        const opts3 = (v, step) => [...new Set([v, +(v + step).toFixed(2), +(v - step).toFixed(2)])].sort(() => Math.random() - 0.5);
        const ask = (stage, right, step, unit, text) => { q = { stage, right, opts: opts3(right, step) }; choices.btns.forEach((b, j) => { b.hidden = j >= q.opts.length; b.textContent = `${q.opts[j].toFixed(step < 0.1 ? 2 : 1)} ${unit}`; }); choices.el.hidden = false; ui.status(text); };
        let cur = null;
        // 电路一变（滑片、开关、灯丝），正在读的那组读数就作废，要重新读
        S.stale = () => {
          if (!cur) return;
          const u = Math.round(Math.abs(V.value || 0) * 10) / 10;
          if (sw.closed && !L.broken && Math.abs(u - cur.u) < 0.05) return;
          cur = null; q = null; choices.el.hidden = true;
          return true;
        };
        const start = () => {
          if (L.broken) return ui.status('小灯泡的灯丝已经烧断了，电路断开，读不出数。点“换一个新的小灯泡”。');
          if (!sw.closed || !lit()) return ui.status('先闭合开关，让小灯泡发光。');
          if (V.over) return ui.status('电压表超量程了，先把电压调低。');
          const u = Math.round(Math.abs(V.value) * 10) / 10, i = Math.round(Math.abs(A.value) / 0.02) * 0.02;
          const kind = u > 2.55 ? 'high' : u >= 2.45 ? 'rated' : 'low';
          cur = { u, i: +i.toFixed(2), kind };
          look([-0.02, 0.05, 0.02], [0, 0.35, 1], 0.2, () => back());
          ask('u', u, 0.1, 'V', '读<b>电压表</b>（“3” 接线柱，每小格 0.1 V）：小灯泡两端的电压 U = ?');
        };
        const answer = (j) => {
          if (!q) return;
          const P = +(cur.u * cur.i).toFixed(2);
          const LOOKS = { low: '比正常发光时暗', rated: '正常发光', high: '比正常发光时亮' };
          if (q.stage === 'lit') {
            if (q.opts[j] !== q.right) return ui.status(`再看看灯：电压表示数 ${cur.u.toFixed(1)} V，额定电压是 2.5 V。`);
          } else if (q.opts[j] !== q.right) {
            return ui.status(q.stage === 'p' ? `电功率 P = UI：用 ${cur.u.toFixed(1)} V 乘 ${cur.i.toFixed(2)} A。` : '再看一看指针（每小格 ' + (q.stage === 'u' ? '0.1 V' : '0.02 A') + '）。');
          }
          if (q.stage === 'u') { look([-0.17, 0.05, 0.02], [0.2, 0.35, 1], 0.2, () => back()); return ask('i', cur.i, 0.02, 'A', '再读<b>电流表</b>（“0.6” 接线柱，每小格 0.02 A）：I = ?'); }
          if (q.stage === 'i') {
            back();
            const opts = [...new Set([P, +(cur.u / cur.i).toFixed(2), +(cur.u + cur.i).toFixed(2)])].sort(() => Math.random() - 0.5);
            q = { stage: 'p', right: P, opts };
            choices.btns.forEach((b, k) => { b.hidden = k >= opts.length; b.textContent = `${opts[k]} W`; });
            return ui.status(`U = ${cur.u.toFixed(1)} V，I = ${cur.i.toFixed(2)} A。算一算小灯泡的实际功率 P = ?`);
          }
          if (q.stage === 'p') {
            const opts = ['low', 'rated', 'high'];
            q = { stage: 'lit', right: cur.kind, opts };
            choices.btns.forEach((b, k) => { b.hidden = false; b.textContent = `灯${LOOKS[opts[k]]}`; });
            return ui.status('看看小灯泡现在的亮度：');
          }
          choices.el.hidden = true; q = null;
          const name = { rated: '等于 2.5 V', low: '低于 2.5 V', high: '略高于 2.5 V' }[cur.kind];
          S.rows.push(cur); S.seen.add(cur.kind);
          tb.add([name, cur.u.toFixed(1), cur.i.toFixed(2), P.toFixed(2), { rated: '正常发光', low: '较暗', high: '较亮' }[cur.kind]]);
          W.goal.done(cur.kind);
          ui.status(`记下了：${cur.u.toFixed(1)} V 时 P ≈ ${P.toFixed(2)} W，${LOOKS[cur.kind]}。${cur.kind === 'rated' ? '这就是小灯泡的<b>额定功率</b>。' : ''}${S.seen.size < 3 ? '再调到另外的电压试试。' : '比较三次的电功率和亮度：电压越高，实际功率越大，灯越亮。'}`);
          cur = null;
        };
        ui.controls.append(note('电路已经按图18.2-4 连好，滑片在接入电阻最大的 B 端。<b>点开关</b>闭合电路，<b>拖滑动变阻器的滑片</b>改变小灯泡两端的电压（也可以用下面的滑块）。'), sl.el,
          buttons([{ text: '开关', ghost: true, onClick: () => { sw.toggle(); judge(C); } }, { text: '读电表、记录…', onClick: start }, { text: '换一个新的小灯泡', ghost: true, onClick: () => { L.broken = false; R.setPos(1); sw.closed = false; C.solve(); judge(C); } }]).el, choices.el);
        ui.data.append(tb.el);
        W = { status: (m) => ui.status(m), goal: goals(ui, [['rated', '电压等于额定电压 2.5 V'], ['low', '电压低于 2.5 V'], ['high', '电压略高于 2.5 V（不超过 3 V）']]) };
        judge(C);
        void near;
      },
      update(dt) { C.update(dt); bench.update(dt); },
      debug: { C, R },
    };
  },
};
