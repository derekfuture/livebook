// 图16.4-3 连接滑动变阻器。电源、开关、小灯泡、电流表已经连好一部分，留出两个接头接滑动变阻器。
// 滑动变阻器四个接线柱：A、B 在线圈两端（下面），C、D 在金属杆两端（上面）。要“一上一下”接入，滑片才能改变接入电路的电阻丝长度。
// 接两个下接线柱：整根电阻丝都接进去，电阻最大且不变；接两个上接线柱：只接了金属杆，电阻几乎为 0。
import * as THREE from 'three';
import { slider, buttons, goals, note, readout } from './kit/ui.js';
import { Circuit, battery, switchPart, lampPart, meterPart, rheostatPart } from './kit/circuit.js';
import { Bench } from './kit/bench.js';

export default {
  id: 'rheostat',
  fig: '图16.4-3',
  title: '练习使用滑动变阻器',
  stampText: '探究',
  predict: {
    q: '滑动变阻器接的是 A、D 两个接线柱（一上一下，图16.4-3）。<br>把滑片从 A 端向 B 端移动，小灯泡会——',
    hint: '课本第 83 页「实验」',
    options: ['变亮', '变暗', '亮度不变'],
    answer: 1,
  },
  conclusion: {
    crops: [{ page: 88, rect: [228, 396, 458, 622] }, { page: 90, rect: [160, 240, 458, 366] }],   // 课本第 82、84 页
    quote: '能改变接入电路中电阻大小的元件叫作变阻器。……通常，在使用前应将滑动变阻器的电阻调节到最大。',
    why: '滑动变阻器要和用电器<b>串联</b>，并且“一上一下”地接：电流从下面的接线柱进入线圈，经过一段电阻丝到达滑片，再从金属杆流出。移动滑片，改变的是<b>接入电路的电阻丝的长度</b>，所以改变了电阻，也就改变了电路中的电流和灯的亮度。接 A 的时候，滑片离 A 越远，接入的电阻丝越长，灯越暗。只接两个下接线柱，相当于一个最大的定值电阻；只接两个上接线柱，相当于一根导线。',
    src: '课本第 82–84 页 · 第十六章 第4节 变阻器',
  },

  create({ tag }) {
    const group = new THREE.Group();
    const C = new Circuit();
    // 课本图16.4-3 的样子（左右镜像，让电池的正极朝右）：电池在上，电流表右上，开关左边，变阻器和小灯泡在前排
    C.add(battery('E', { cells: 2, r: 0.15 }), [-0.02, -0.1]);
    const A = C.add(meterPart('A', { type: 'A' }), [0.14, -0.065]);
    const sw = C.add(switchPart('S'), [-0.16, -0.005]);
    const R = C.add(rheostatPart('R', { Rmax: 20, pos: 0.5 }), [-0.04, 0.075]);
    const L = C.add(lampPart('L'), [0.12, 0.08]);
    group.add(C.group);
    C.wire('E.+', 'A.0.6').wire('A.-', 'L.b').wire('S.a', 'E.-');
    for (const k of ['A', 'B', 'C', 'D']) { const p = C.terminalWorld(`R.${k}`); tag(`<i>${k}</i>`, 'mag').loc(group, p.x + (p.x < -0.04 ? -0.016 : 0.016), p.y + 0.008, p.z + 0.006); }
    for (const [txt, x, z] of [['电源', -0.02, -0.135], ['开关', -0.16, -0.035], ['滑动变阻器', -0.04, 0.115], ['小灯泡', 0.12, 0.115], ['电流表', 0.14, -0.015]]) tag(txt, 'pill').loc(group, x, 0.005, z);

    let W = null;
    const S = { iMin: 9, iMax: 0 };
    // 变阻器的接法和此刻接入电路的电阻
    const how = () => {
      const ends = ['A', 'B', 'C', 'D'].filter((k) => C.wires.some((w) => w.a === `R.${k}` || w.b === `R.${k}`));
      const low = ends.filter((k) => k === 'A' || k === 'B'), up = ends.filter((k) => k === 'C' || k === 'D');
      if (ends.length < 2) return { k: 'off' };
      if (low.length === 2 && !up.length) return { k: 'bottom', R: R.Rmax };
      if (up.length >= 1 && !low.length) return { k: 'top', R: 0 };
      if (low.length === 1 && up.length >= 1) return { k: 'updown', low: low[0], R: low[0] === 'A' ? R.pos * R.Rmax : (1 - R.pos) * R.Rmax };
      return { k: 'other' };
    };
    const lit = () => (L.brightness || 0) > 0.03;

    const judge = (circuit, ev = {}) => {
      if (!W) return;
      if (ev.msg) return W.status(ev.msg);
      const h = how(), i = Math.abs(A.value || 0);
      W.out.set('i', i, 2);
      W.out.set('l', !lit() ? '不亮' : L.brightness > 0.7 ? '很亮' : L.brightness > 0.3 ? '较亮' : '较暗');
      if (S.asking && (S.asking === 'range' ? h.k !== 'updown' : h.k !== S.asking || !sw.closed)) W.drop();     // 接法变了，问的那种接法已经不在了
      if (sw.closed && h.k === 'updown') W.goal.done('updown');
      if (ev.toggled === 'S' && sw.closed && h.k === 'updown') {
        if (h.R > 0.85 * R.Rmax) { W.goal.done('safe'); return W.status('开关闭合前，滑片已经在<b>接入电阻最大</b>的位置：电流最小，最安全。现在移动滑片，让灯由暗变亮。'); }
        return W.status(`开关闭合了。不过闭合前最好先把滑片移到<b>接入电阻最大</b>的位置（离 ${h.low} 端最远的那一端）——这样一开始电流最小。断开开关，试一次。`);
      }
      if (!sw.closed || (h.k !== 'bottom' && h.k !== 'top')) S.baseKey = null;     // 断开、拆线、换成别的接法：下次重新从头算
      if (!sw.closed) return W.status(h.k === 'off' ? '把滑动变阻器接进电路：从小灯泡左边的接线柱和开关右边的接线柱，各拉一根导线到变阻器的两个接线柱上。' : '开关是断开的。闭合开关之前，先想一想滑片该放在哪里。');
      if (h.k === 'off' || h.k === 'other') return W.status('变阻器还没有正确接进电路：要从它的两个接线柱接出去，一个接小灯泡，一个接开关。');
      // 两下、两上：先让学生动一动滑片，再说出为什么不变
      if (h.k === 'bottom' || h.k === 'top') {
        const key = h.k;
        S.moved ||= {};
        // 每换一次接法，从“现在的滑片位置”重新算起：只有在这种接法下真的移动过滑片，才算看到了“亮度不变”
        if (S.baseKey !== key) { S.baseKey = key; S.lastPos = R.pos; S.moved[key] = false; }
        else if (Math.abs(S.lastPos - R.pos) > 0.2) S.moved[key] = true;
        if (!S.moved[key]) return W.status(`接的是两个<b>${key === 'bottom' ? '下面' : '上面'}</b>的接线柱。灯${L.brightness > 0.7 ? '很亮' : '比较暗'}。移动滑片试试，灯的亮度会变吗？`);
        if (!W.goal.has(key) && !S.asking) W.ask(key);
        return;
      }
      S.lastPos = null; S.baseKey = null;
      W.goal.done('updown');
      S.iMin = Math.min(S.iMin, i); S.iMax = Math.max(S.iMax, i);
      const far = h.low === 'A' ? 'B' : 'A';
      if (S.iMax - S.iMin > 0.12 && !W.goal.has('range') && !S.asking) { S.low = h.low; return W.ask('range'); }
      if (!S.asking) W.status(`“一上一下”接法。移动滑片，看电流表和小灯泡：滑片往哪一端移，灯变亮？`);
    };
    const bench = new Bench(C, group, { onChange: (c, ev) => { W?.slider.set(Math.round(R.pos * 100)); judge(c, ev); }, unscrew: false });

    const demo = () => { C.clearWires().wire('E.+', 'A.0.6').wire('A.-', 'L.b').wire('S.a', 'E.-').wire('S.b', 'R.A').wire('R.D', 'L.a'); R.setPos(1); W.slider.set(100); sw.closed = false; C.solve(); judge(C); W.status('按课本图16.4-3 接好了：A、D 一上一下，滑片放在 B 端（接入电阻最大）。点开关闭合电路。'); };

    return {
      group,
      size: { w: 0.4, d: 0.28, h: 0.09 },
      view: { elev: 46, azim: 0, lookY: 0.25, margin: 1.0 },
      pointer: bench.pointer(),
      mount(ui) {
        const out = readout([{ key: 'i', label: '电流表示数', unit: 'A' }, { key: 'l', label: '小灯泡' }]);
        const sl = slider('滑片的位置（也可以直接拖滑片）', { min: 0, max: 100, value: 50, fmt: (v) => (v <= 2 ? 'A 端' : v >= 98 ? 'B 端' : `离 A 端 ${v}%`), onInput: (v) => { R.setPos(v / 100); judge(C, { slid: true }); } });
        W = {};
        ui.controls.append(note('<b>连导线</b>：按住接线柱拖到另一个接线柱。<b>拆导线</b>：点导线。点开关闭合/断开。'), out.el, sl.el, buttons([{ text: '示范：按课本接', ghost: true, onClick: demo }, { text: '拆掉变阻器的导线', ghost: true, onClick: () => { C.clearWires().wire('E.+', 'A.0.6').wire('A.-', 'L.b').wire('S.a', 'E.-'); C.solve(); judge(C); } }]).el);
        const qb = buttons([0, 1, 2].map(() => ({ text: '', ghost: true, onClick: () => {} })));
        qb.el.hidden = true;
        ui.controls.append(qb.el);
        const Q = {
          range: () => ({ q: `灯能由暗变亮了。滑片往 <b>${S.low}</b> 端移时灯变亮，是因为接入电路的那段电阻丝（${S.low} 端到滑片之间）——`, opts: ['变短了，电阻变小，电流变大', '变长了，电阻变大，电流变大', '长度没变，是电压变大了'], ok: '对：滑动变阻器靠改变<b>接入电路中电阻丝的长度</b>来改变电阻，从而改变电路中的电流。' }),
          bottom: () => ({ q: '接两个下接线柱时，移动滑片灯的亮度不变。这是因为——', opts: ['整根电阻丝都接入了电路，滑片不起作用，相当于定值电阻', '电阻丝都没有接入电路，相当于一根导线', '滑片坏了'], ok: '对：两个下接线柱把<b>整根电阻丝</b>都接进了电路，电阻最大且不变，变阻器相当于一个定值电阻。' }),
          top: () => ({ q: '接两个上接线柱时，灯很亮，移动滑片也不变。这是因为——', opts: ['电流只经过金属杆，电阻丝没有接入，相当于一根导线', '整根电阻丝都接入了电路', '电流表坏了'], ok: '对：两个上接线柱之间只有金属杆，<b>电阻几乎为 0</b>，变阻器相当于一根导线。' }),
        };
        W.ask = (id) => {
          const c = Q[id](), sh = [0, 1, 2].sort(() => Math.random() - 0.5);
          S.asking = id;
          qb.btns.forEach((b, j) => { b.innerHTML = c.opts[sh[j]]; b.onclick = () => { if (sh[j]) return ui.status('再想一想：电流要流过哪一段电阻丝？'); qb.el.hidden = true; S.asking = null; W.goal.done(id); ui.status(c.ok); }; });
          qb.el.hidden = false; ui.status(c.q);
        };
        W.drop = () => { if (S.asking) { S.asking = null; qb.el.hidden = true; } };
        Object.assign(W, { out, slider: sl, status: (m) => ui.status(m), goal: goals(ui, [['updown', '“一上一下”把变阻器串联进电路'], ['safe', '闭合开关前，把滑片放到接入电阻最大的位置'], ['range', '移动滑片，让小灯泡由暗变亮'], ['bottom', '试试只接两个下接线柱'], ['top', '试试只接两个上接线柱']]) });
        judge(C);
      },
      update(dt) { C.update(dt); bench.update(dt); },
      debug: { demo, C, how },
    };
  },
};
