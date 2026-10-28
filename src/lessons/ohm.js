// 图17.1-1 探究电流与电压、电阻的关系。定值电阻 R、滑动变阻器、电流表串联；电压表并在 R 两端。
// ① 电阻一定：移动滑片改变 R 两端的电压，记几组 U、I，描 I–U 图像。
// ② 电压一定：换不同阻值的定值电阻，每次都要调滑片让电压表示数回到同一个值，再记电流。忘了调就记，会被指出来。
import * as THREE from 'three';
import { seg, slider, buttons, goals, note, table, chart } from './kit/ui.js';
import { Circuit, battery, switchPart, meterPart, resistorPart, rheostatPart } from './kit/circuit.js';
import { Bench } from './kit/bench.js';

const RS = [5, 10, 15, 20, 25];
const COLORS = ['#1f6fb8', '#d9483b', '#2e8b57', '#a0522d', '#7b4bb3'];

export default {
  id: 'ohm',
  fig: '图17.1-1',
  title: '电流与电压、电阻的关系',
  stampText: '探究',
  predict: {
    q: '保持定值电阻 R 不变，把它两端的电压从 1 V 增大到 2 V。<br>通过它的电流会——',
    hint: '课本第 93 页「问题」',
    options: ['也变成原来的 2 倍', '变大，但不到 2 倍', '不变'],
    answer: 0,
  },
  conclusion: {
    crops: [{ page: 100, rect: [160, 618, 456, 662] }, { page: 101, rect: [62, 577, 360, 621] }],   // 课本第 94、95 页
    quote: '在电阻一定的情况下，通过导体的电流与导体两端的电压成正比。导体两端的电压一定时，通过导体的电流与导体的电阻成反比。',
    formula: '<i>R</i> 一定：<i>I</i> ∝ <i>U</i>　　<i>U</i> 一定：<i>I</i> ∝ 1/<i>R</i>',
    why: '电阻一定时，I–U 图像是一条过原点的直线；电阻越大，直线越“平”（同样的电压，电流越小）。研究电流与电阻的关系时，每换一个电阻都要移动滑片，让电压表示数回到原来的值——这就是<b>控制变量</b>：只让电阻变，电压不变。滑动变阻器在这两个实验里的作用不同：第一个是<b>改变</b>电阻两端的电压，第二个是<b>保持</b>电阻两端的电压不变。',
    src: '课本第 93–95 页 · 第十七章 第1节 电流与电压、电阻的关系',
  },

  create({ tag }) {
    const group = new THREE.Group();
    const C = new Circuit();
    // 课本图17.1-1 的摆法
    C.add(battery('E', { cells: 2, r: 0.1 }), [-0.03, -0.115]);
    const sw = C.add(switchPart('S', { closed: true }), [-0.17, -0.04]);
    const A = C.add(meterPart('A', { type: 'A' }), [0.15, -0.055]);
    const V = C.add(meterPart('V', { type: 'V' }), [0.0, -0.005]);
    const Rh = C.add(rheostatPart('P', { Rmax: 20, pos: 0.6 }), [-0.1, 0.1]);
    const R = C.add(resistorPart('R', { R: 5 }), [0.1, 0.105]);
    A.group.scale.setScalar(0.85); V.group.scale.setScalar(0.85);
    group.add(C.group);
    C.wire('E.+', 'A.0.6').wire('A.-', 'R.b').wire('R.a', 'P.C').wire('P.A', 'S.b').wire('S.a', 'E.-').wire('V.3', 'R.b').wire('V.-', 'R.a');
    const tR = tag('', 'pill').loc(group, 0.1, 0.005, 0.135);
    for (const [txt, x, z] of [['电源', -0.03, -0.145], ['开关', -0.17, -0.07], ['滑动变阻器', -0.1, 0.135]]) tag(txt, 'pill').loc(group, x, 0.005, z);

    let W = null;
    const S = { mode: 0, ri: 0, iu: new Map(), ir: [], U0: null };
    const reading = () => ({ u: Math.round(Math.abs(V.value || 0) * 10) / 10, i: Math.round(Math.abs(A.value || 0) / 0.02) * 0.02 });
    const judge = (circuit, ev = {}) => {
      if (!W) return;
      if (ev.msg) return W.status(ev.msg);
      W.slider.set(Math.round(Rh.pos * 100));
      tR.text(`定值电阻 R = ${R.R} Ω`);
      if (!sw.closed) return W.status('开关断开了。');
      if (A.reverse || V.reverse) return W.status('有电表的指针反偏了：检查正负接线柱。');
      const { u, i } = reading();
      if (S.mode === 0) return W.status(`R = ${R.R} Ω：电压表 ${u.toFixed(1)} V，电流表 ${i.toFixed(2)} A。移动滑片改变电压，每次都记下来。`);
      if (S.U0 == null) return W.status(`先移动滑片，选一个电压（比如 2.0 V），记下 R = ${R.R} Ω 时的电流。`);
      const off = Math.abs(u - S.U0) > 0.05;
      W.status(off ? `电压表示数是 ${u.toFixed(1)} V，不是 ${S.U0.toFixed(1)} V——换了电阻以后，R 两端的电压变了。<b>移动滑片</b>，让电压表回到 ${S.U0.toFixed(1)} V。` : `电压表 ${u.toFixed(1)} V，和前面一样。R = ${R.R} Ω 时电流 ${i.toFixed(2)} A，可以记下来。`);
    };
    const bench = new Bench(C, group, { onChange: judge, unscrew: false });

    let redraw = () => {};
    const record = () => {
      if (!sw.closed || A.reverse || V.reverse || A.over || V.over) return W.status('电路有问题，先让两个电表都正常偏转。');
      const { u, i } = reading();
      if (S.mode === 0) {
        const list = S.iu.get(R.R) || [];
        if (list.some((p) => Math.abs(p[0] - u) < 0.05)) return W.status('这个电压已经记过了，移动滑片换一个电压。');
        list.push([u, i]); list.sort((a, b) => a[0] - b[0]); S.iu.set(R.R, list);
        const spread = list.length ? list[list.length - 1][0] - list[0][0] : 0;
        const full = [...S.iu.values()].filter((l) => l.length >= 5 && l[l.length - 1][0] - l[0][0] >= 1);
        if (full.length >= 1) W.goal.done('iu');
        if ([...S.iu.values()].filter((l) => l.length >= 3).length >= 2) W.goal.done('iu2');
        W.status(`记下了 U = ${u.toFixed(1)} V，I = ${i.toFixed(2)} A（U/I ≈ ${(u / i).toFixed(1)}）。${list.length < 5 ? `再记几组（已有 ${list.length} 组）。` : spread < 1 ? '电压拉开一些再记。' : '描出的点在一条过原点的直线上吗？换一个电阻再做一组。'}`);
      } else {
        if (S.U0 == null) S.U0 = u;
        if (Math.abs(u - S.U0) > 0.05) return W.status(`<b>不能记！</b>电压表示数 ${u.toFixed(1)} V，和前面的 ${S.U0.toFixed(1)} V 不一样——这样电阻和电压同时变了，没法看出电流和电阻的关系。先移动滑片调回 ${S.U0.toFixed(1)} V。`);
        if (S.ir.some((p) => p[0] === R.R)) return W.status(`R = ${R.R} Ω 已经记过了，换一个电阻。`);
        S.ir.push([R.R, i]); S.ir.sort((a, b) => a[0] - b[0]);
        if (S.ir.length >= 4) W.goal.done('ir');
        W.status(`记下了 R = ${R.R} Ω，I = ${i.toFixed(2)} A（I·R ≈ ${(i * R.R).toFixed(1)} V）。${S.ir.length < 4 ? '换一个电阻（换之前先断开开关更安全），再调滑片让电压回到 ' + S.U0.toFixed(1) + ' V。' : '电阻变成 2 倍，电流变成多少？'}`);
      }
      redraw();
    };

    return {
      group,
      size: { w: 0.42, d: 0.29, h: 0.09 },
      view: { elev: 48, azim: 0, lookY: 0.25, margin: 1.0 },
      pointer: bench.pointer(),
      mount(ui) {
        const sl = slider('滑片的位置（也可以直接拖滑片）', { min: 0, max: 100, value: 60, fmt: (v) => (v <= 2 ? 'A 端' : v >= 98 ? 'B 端' : `离 A 端 ${v}%`), onInput: (v) => { Rh.setPos(v / 100); judge(C); } });
        const rSel = seg('定值电阻', RS.map((r) => `${r} Ω`), (_, k) => {
          R.R = RS[k]; C.solve(); judge(C);
        });
        const modeSel = seg('探究', ['① 电阻一定：I 与 U', '② 电压一定：I 与 R'], (_, k) => {
          S.mode = k;
          for (const [el, m] of [[ivBox, 0], [irBox, 1]]) el.hidden = m !== k;
          judge(C);
        });
        const rec = buttons([{ text: '记下这组数据', onClick: record }]);
        // 数据：① 每个电阻一张表、一条线；② 一张表
        const tIU = table(['R/Ω', '电压 U/V', '电流 I/A', 'U/I']);
        const chIU = chart({ x: { label: 'U/V', min: 0, max: 3 }, y: { label: 'I/A', min: 0, max: 0.6 }, series: RS.map((r, k) => ({ color: COLORS[k], points: [], dots: true })), legend: '不同颜色是不同的电阻。' });
        const tIR = table(['电阻 R/Ω', '电流 I/A', 'I·R']);
        const chIR = chart({ x: { label: 'R/Ω', min: 0, max: 30 }, y: { label: 'I/A', min: 0, max: 0.6 }, series: [{ color: '#1f6fb8', points: [], dots: true }] });
        const ivBox = document.createElement('div'), irBox = document.createElement('div');
        ivBox.append(tIU.el, chIU.el); irBox.append(note('U = <b class="u0">—</b> V'), tIR.el, chIR.el); irBox.hidden = true;
        redraw = () => {
          tIU.clear();
          for (const [r, list] of S.iu) for (const [u, i] of list) tIU.add([String(r), u.toFixed(1), i.toFixed(2), i ? (u / i).toFixed(1) : '—'], { highlight: false });
          RS.forEach((r, k) => {
            const list = S.iu.get(r) || [];
            chIU.series[k].points = list;
            chIU.series[k].line = false;
          });
          // 每个电阻：过原点的拟合直线（I = U/R 的最小二乘斜率）
          chIU.extra = (g, X, Y) => {
            RS.forEach((r, k) => {
              const list = S.iu.get(r) || [];
              if (list.length < 3) return;
              const kk = list.reduce((s, [u, i]) => s + u * i, 0) / list.reduce((s, [u]) => s + u * u, 0);
              g.strokeStyle = COLORS[k]; g.lineWidth = 2; g.setLineDash([8, 6]);
              g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(3), Y(Math.min(0.6, kk * 3))); g.stroke(); g.setLineDash([]);
              g.fillStyle = COLORS[k]; g.font = '20px PingFang SC, sans-serif'; const ux = Math.min(2.2, 0.45 / kk); g.textAlign = 'right'; g.fillText(`${r} Ω`, X(ux) - 6, Y(kk * ux) - 8); g.textAlign = 'left';
            });
          };
          chIU.draw();
          tIR.clear();
          for (const [r, i] of S.ir) tIR.add([String(r), i.toFixed(2), (i * r).toFixed(1)], { highlight: false });
          irBox.querySelector('.u0').textContent = S.U0 != null ? S.U0.toFixed(1) : '—';
          chIR.series[0].points = S.ir;
          chIR.series[0].line = S.ir.length > 1;
          chIR.draw();
        };
        ui.controls.append(modeSel.el, rSel.el, sl.el, rec.el, note('电路已经按图17.1-1 连好：电压表并在 R 两端（“3” 接线柱，分度值 0.1 V），电流表接 “0.6”（分度值 0.02 A）。'),
          buttons([{ text: '重新开始这一项', ghost: true, onClick: () => { if (S.mode === 0) S.iu.clear(); else { S.ir = []; S.U0 = null; } redraw(); judge(C); } }]).el);
        ui.data.append(ivBox, irBox);
        W = { slider: sl, status: (m) => ui.status(m), goal: goals(ui, [['iu', '① 同一个电阻，记 5 组以上不同电压下的电流'], ['iu2', '① 换一个电阻，再记 3 组以上'], ['ir', '② 保持电压不变，换 4 个以上不同的电阻，记下电流']]) };
        judge(C);
      },
      update(dt) { C.update(dt); bench.update(dt); },
      debug: { C, record, set: (pos) => { Rh.setPos(pos); judge(C); } },
    };
  },
};
