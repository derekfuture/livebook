// 图16.1-5 用电压表测量电压。电源、开关、小灯泡已经连成通路；电压表先接在小灯泡两端，再接在电源两端，比较两次的示数。
// 电压表必须和被测用电器并联；“−”接线柱靠近电源负极；先用 15 V 量程试触，不超过 3 V 再改用 3 V。接错（串联、反接）的后果都按电路算出来。
import * as THREE from 'three';
import { readout, buttons, goals, note, table, guard } from './kit/ui.js';
import { Circuit, battery, switchPart, lampPart, meterPart } from './kit/circuit.js';
import { Bench, nets } from './kit/bench.js';

export default {
  id: 'voltmeter',
  fig: '图16.1-5',
  title: '用电压表测量电压',
  stampText: '测量',
  predict: {
    q: '电路里只有一个小灯泡。先把电压表接在小灯泡两端，再接在电源两端。<br>两次的示数相比——',
    hint: '课本第 69 页「实验」',
    options: ['接在电源两端时大', '两次相同', '接在小灯泡两端时大'],
    answer: 1,
  },
  conclusion: {
    page: 75, rect: [62, 598, 360, 664],     // 课本第 69 页：实验结果表明……
    quote: '实验结果表明，电压表两次的示数是相同的，即在只有一个用电器的电路中，用电器两端的电压与电源两端的电压相等。',
    why: '电压表的电阻很大，和小灯泡<b>并联</b>时几乎没有电流从它那里通过，不影响电路，测的就是小灯泡两端的电压。要让电流从“+”接线柱流进、“−”接线柱流出，也就是“−”接线柱靠近电源的负极。如果误把电压表串联在电路里，它的电阻太大，电路中几乎没有电流，小灯泡不亮，电压表的示数接近电源电压。接 “3” 接线柱时读表盘下排（分度值 0.1 V），接 “15” 时读上排（分度值 0.5 V）。',
    src: '课本第 68–69 页 · 第十六章 第1节 电压',
  },

  create({ tag, look, back }) {
    const group = new THREE.Group();
    const C = new Circuit();
    const bat = C.add(battery('E', { cells: 2, r: 0.1 }), [0.05, -0.08]);
    const sw = C.add(switchPart('S', { closed: true }), [-0.11, -0.08]);
    const L = C.add(lampPart('L'), [-0.05, 0.04]);
    const V = C.add(meterPart('V', { type: 'V' }), [0.1, 0.075], -0.35);   // 表盘略朝向小灯泡这边
    group.add(C.group);
    // 课本图16.1-5：开关—电池—小灯泡连成一圈，电压表摆在前面
    C.wire('S.b', 'E.-').wire('E.+', 'L.b').wire('L.a', 'S.a');
    for (const [txt, x, z] of [['电源', 0.05, -0.115], ['开关', -0.11, -0.11], ['小灯泡', -0.05, 0.077], ['电压表', 0.115, 0.112]]) tag(txt, 'pill').loc(group, x, 0.005, z);

    let W = null;
    const S = { rows: [], tried15: false };
    const lit = () => L.screwed && !L.broken && (L.brightness || 0) > 0.05;
    // 电压表接在哪：小灯泡两端 / 电源两端 / 开关两端 / 串联在电路里 / 没接上
    const how = () => {
      const ends = ['-', '3', '15'].filter((t) => C.wires.some((w) => w.a === `V.${t}` || w.b === `V.${t}`));
      if (ends.length < 2 || !ends.includes('-')) return { k: 'off' };
      const f = nets(C, { closedSwitch: false });
      const pair = (a, b) => { const x = f('V.-'), y = f(`V.${ends[1]}`); return (x === f(a) && y === f(b)) || (x === f(b) && y === f(a)); };
      if (pair('L.a', 'L.b')) return { k: 'lamp' };
      if (pair('E.+', 'E.-')) return { k: 'battery' };
      if (pair('S.a', 'S.b')) return { k: 'switch' };
      if (Math.abs(V.value || 0) > 0.5 && !lit()) return { k: 'series' };
      return { k: 'other' };
    };

    const judge = (circuit, ev = {}) => {
      if (!W) return;
      if (ev.msg) return W.status(ev.msg);
      const h = how().k, v = V.value || 0;
      W.out.set('r', h === 'off' ? '—' : `0 ~ ${V.range} V`);
      W.out.set('l', lit() ? '亮' : '不亮');
      if (bat.short) return W.status('<b>电源被短路了！</b>快把那根导线拆掉。');
      if (h === 'series') { W.goal.done('series'); return W.status('电压表<b>串联</b>在了电路里：它的电阻很大，电路中几乎没有电流，小灯泡不亮了，电压表的示数却接近电源电压。电压表要和被测的用电器<b>并联</b>。'); }
      if (h === 'off' || h === 'other') return W.status(C.wires.length < 3 ? '电路断开了：电源、开关、小灯泡要连成一圈，小灯泡才会亮。' : '把电压表的两个接线柱分别接到<b>小灯泡的两端</b>（一个接 “−”，另一个先接 “15”）。');
      if (V.reverse) { W.goal.done('reverse'); return W.status('指针向<b>左</b>偏了：“−”接线柱接到了靠近电源<b>正极</b>的那一端，正负接线柱接反了。'); }
      if (V.range > 5) S.tried15 = true;
      else if (S.tried15) W.goal.done('range');
      if (h === 'switch') return W.status(sw.closed ? '电压表接在了开关两端：开关合上时，它两端几乎没有电压，示数是 0。断开开关看看。' : '开关断开时，电压表通过小灯泡接到了电源两端，示数接近电源电压。');
      const where = h === 'lamp' ? '小灯泡两端' : '电源两端';
      if (!sw.closed) return W.status(h === 'lamp' ? '开关断开，电路中没有电流，小灯泡两端没有电压。合上开关。' : '电压表接在电源两端。开关断开也有示数——电源两端本来就有电压。');
      return W.status(`电压表接在<b>${where}</b>，指针向右偏转了。${V.range > 5 ? '接的是 “15” 接线柱（看上排）：指针还没过 3 V 吗？如果没有，改接 “3” 接线柱读得更准。' : '接的是 “3” 接线柱（看下排）。凑近看看指针指在哪一格，然后记录读数。'}`);
    };
    const bench = new Bench(C, group, { onChange: judge, unscrew: false });

    const demo = () => {
      C.clearWires().wire('S.b', 'E.-').wire('E.+', 'L.b').wire('L.a', 'S.a').wire('V.-', 'L.a').wire('V.3', 'L.b');
      sw.closed = true; C.solve(); judge(C);
    };
    let near = false;

    return {
      group,
      size: { w: 0.4, d: 0.29, h: 0.1 },
      view: { elev: 40, azim: 0, lookY: 0.3, margin: 1.0 },
      pointer: bench.pointer(),
      mount(ui) {
        const out = readout([{ key: 'r', label: '测量范围' }, { key: 'l', label: '小灯泡' }]);
        const tb = table(['电压表接在', '接线柱', '分度值/V', '读数/V'], { note: '读数要你自己看表盘——点“记录读数”，选你读到的数。' });
        const close = buttons([{ text: '凑近看电压表', ghost: true, onClick: () => {
          near = !near;
          if (near) { look([0.103, 0.058, 0.085], [-0.3, 0.5, 0.82], 0.15, () => { near = false; close.btns[0].textContent = '凑近看电压表'; back(); }); close.btns[0].textContent = '↩ 回到整个电路'; }
          else { back(); close.btns[0].textContent = '凑近看电压表'; }
        } }]);
        const pick = buttons([{ text: '记录读数…', onClick: () => ask() }]);
        const choices = buttons([0, 1, 2].map((i) => ({ text: '', ghost: true, onClick: () => answer(i) })));
        choices.el.hidden = true;
        S.guard = guard(choices.el, () => `${V.range}|${Math.abs(V.value || 0).toFixed(3)}|${how().k}|${V.reverse}|${sw.closed}`, () => { ui.status("电路变了（量程、接法或读数和出题时不一样），刚才那道读数题作废。"); });     // 条件变了，待答的题作废
        let opts = [], asked = null;
        const ask = () => {
          const k = how().k;
          if ((k !== 'lamp' && k !== 'battery') || V.reverse || !sw.closed) return ui.status('先把电压表正确地并联在小灯泡（或电源）两端，合上开关，让指针正常偏转。');
          const v = Math.abs(V.value), r = V.range, div = r > 5 ? 0.5 : 0.1;
          const right = +(Math.round(v / div) * div).toFixed(1);
          const wrong = +(r > 5 ? right / 5 : right * 5).toFixed(1);          // 读错了排
          opts = [...new Set([right, wrong, +(right - div).toFixed(1)])].sort(() => Math.random() - 0.5);
          asked = { right, wrong, r, div, k };
          choices.btns.forEach((b, i) => { b.hidden = i >= opts.length; b.textContent = `${opts[i]} V`; });
          choices.el.hidden = false; S.guard?.arm();
          ui.status(`接的是 “${r}” 接线柱。看表盘${r > 5 ? '上排' : '下排'}的刻度，你读到多少？`);
        };
        const answer = (i) => {
          const a = asked; if (!a) return;
          if (opts[i] !== a.right) return ui.status(opts[i] === a.wrong ? `读错排了：接 “${a.r}” 接线柱，要读${a.r > 5 ? '上排' : '下排'}的数。` : '再仔细数一数：指针过了几小格？');
          choices.el.hidden = true;
          const where = a.k === 'lamp' ? '小灯泡两端' : '电源两端';
          tb.add([where, `“−”和“${a.r}”`, a.div, a.right.toFixed(1)]);
          S.rows.push({ k: a.k, r: a.r, v: a.right });
          if (a.r < 5) W.goal.done(a.k);
          const has = (k) => S.rows.some((x) => x.k === k && x.r < 5);
          if (has('lamp') && has('battery')) {
            const [u1, u2] = ['lamp', 'battery'].map((k) => S.rows.filter((x) => x.k === k && x.r < 5).pop().v);
            return ui.status(`小灯泡两端 ${u1.toFixed(1)} V，电源两端 ${u2.toFixed(1)} V——${u1 === u2 ? '两次的示数<b>相同</b>。' : '几乎相同。'}`);
          }
          ui.status(`记下了 ${a.right.toFixed(1)} V。${a.r > 5 ? '再改用 “3” 接线柱读一次。' : a.k === 'lamp' ? '再把电压表接到电源两端测一次。' : '再把电压表接到小灯泡两端测一次。'}`);
        };
        ui.controls.append(note('电源、开关、小灯泡已经连好。从电压表的接线柱按住拖到小灯泡的接线柱上连导线；<b>点导线</b>可以拆掉。'), out.el, close.el, pick.el, choices.el, buttons([{ text: '示范接法', ghost: true, onClick: demo }]).el);
        ui.data.append(tb.el);
        W = { out, status: (m) => ui.status(m), goal: goals(ui, [['range', '先用 15 V 量程试触，再改用 3 V 量程'], ['lamp', '测出小灯泡两端的电压（3 V 量程）'], ['battery', '测出电源两端的电压（3 V 量程）'], ['reverse', '试试把正负接线柱接反'], ['series', '试试把电压表串联在电路里（看看为什么不行）']]) };
        judge(C);
      },
      update(dt) { S.guard?.check(); C.update(dt); bench.update(dt); },
      debug: { demo, C, how },
    };
  },
};
