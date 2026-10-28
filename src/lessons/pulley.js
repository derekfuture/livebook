// 图12.3-4 研究定滑轮和动滑轮的特点 / 图12.3-5 滑轮组。用弹簧测力计拉绳端把钩码匀速提起，记下拉力的大小和方向、
// 钩码升高的高度 h 和绳端移动的距离 s。钩码 4 个共 2 N，动滑轮重 0.2 N（忽略绳重和摩擦）。
import * as THREE from 'three';
import { seg, buttons, goals, note, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { rig, RIG } from './kit/pulleys.js';
import { polyline } from '../live/ink.js';

const TOP = 0.62, KINDS = ['direct', 'fixed', 'movable', 'g3', 'g2'];

export default {
  id: 'pulley',
  fig: '图12.3-4',
  title: '定滑轮和动滑轮的特点',
  stampText: '探究',
  predict: {
    q: '用<b>动滑轮</b>把重 2 N 的钩码提起 10 cm。<br>和直接提起相比——',
    hint: '课本第 114 页「演示」',
    options: ['省力，但绳端要多拉一段距离', '省力，也省距离', '不省力，但可以改变力的方向'],
    answer: 0,
  },
  conclusion: {
    crops: [{ page: 118, rect: [160, 516, 456, 612] }, { page: 119, rect: [62, 50, 362, 166] }],
    quote: '实验结果表明：使用定滑轮不省力，但可以改变力的方向；使用动滑轮可以省力，但不能改变力的方向，而且费距离。……用滑轮组提起重物时，动滑轮上有几段绳子承担物重，提起重物的力就是物重的几分之一。',
    formula: '<i>F</i> = (<i>G</i> + <i>G</i><sub>动</sub>) / <i>n</i>　　<i>s</i> = <i>nh</i>',
    why: '定滑轮的轴固定不动，绳子两边的拉力相等，它只是把向下的拉力变成向上提钩码的力。动滑轮和钩码一起上升，有两段绳子共同承担钩码和动滑轮的重，所以拉力约为它们总重的一半；可是钩码升高 h，两段绳子都要缩短 h，绳端要拉 2h——省了力，费了距离。滑轮组由几段绳子承担物重（数一数和动滑轮相连的绳子），拉力就约为总重的几分之一，绳端移动的距离就是钩码升高的几倍。',
    src: '课本第 114–115 页 · 第十二章 第3节 滑轮',
  },

  create({ tag }) {
    const outer = new THREE.Group();
    let R = null;
    const S = { kind: 'direct', s: 0, rows: [] };
    let W = null;
    const tags = { h: tag('', 'pill'), s: tag('', 'pill'), k: tag('', 'pill') };
    const pick = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.03), new THREE.MeshBasicMaterial({ visible: false }));      // 整个测力计都能抓（不只是圆环）
    pick.userData.pick = true;
    outer.add(pick);
    let start = 0;
    const marks = polyline([new THREE.Vector3(), new THREE.Vector3(1, 0, 0), new THREE.Vector3(), new THREE.Vector3(1, 0, 0)], { dashed: true, width: 1.2, dash: 0.006, gap: 0.004 });
    outer.add(marks);

    const build = () => {
      if (R) outer.remove(R.group);
      R = rig(S.kind, { top: TOP, nW: 4, wG: 0.5, gm: 0.2 });
      outer.add(R.group);
      S.s = 0;
      R.info.set(0);
      S.start = { load: R.info.loadTop, end: R.info.end.y };
    };
    build();
    const smax = () => RIG[S.kind].n * 0.08;     // 钩码最多升高 8 cm
    const pointer = draggable(outer, [{ obj: pick, plane: 'xy', offset: 0, onStart: (p) => { start = p.y - (RIG[S.kind].down ? -S.s : S.s); S.drop?.(); }, onDrag: (p) => { const d = p.y - start; S.s = clamp(RIG[S.kind].down ? -d : d, 0, smax()); } }]);
    const layout = () => {
      R.info.set(S.s);
      pick.position.copy(R.info.ring).add(new THREE.Vector3(0, R.info.down ? 0.11 : -0.11, 0));
      const I = R.info;
      const x0 = 0.13;
      marks.geometry.setPositions([-0.06, S.start.load, 0, x0, S.start.load, 0, -0.06, I.loadTop, 0, x0, I.loadTop, 0]);
      marks.computeLineDistances();
      tags.h.loc(outer, x0 + 0.03, (S.start.load + I.loadTop) / 2, 0).text(`h = ${(I.h * 100).toFixed(1)} cm`);
      if (S.kind === 'direct') tags.s.loc(outer, 0, -9, 0); else tags.s.loc(outer, I.end.x + (I.end.x < 0 ? -0.06 : 0.06), I.end.y + (I.down ? 0.02 : -0.02), 0).text(`绳端移动 s = ${(I.s * 100).toFixed(1)} cm`);
      tags.k.loc(outer, 0, TOP + 0.04, 0).text(RIG[S.kind].label);
    };
    layout();

    return {
      group: outer,
      size: { w: 0.3, d: 0.08, h: 0.86 },
      view: { elev: 4, azim: 0, lookY: 0.46, margin: 0.98 },
      pointer,
      mount(ui) {
        const kind = seg('装置', ['直接提', '定滑轮', '动滑轮', '滑轮组 甲', '滑轮组 乙'], (_, k) => { S.kind = KINDS[k]; build(); layout(); choices.el.hidden = true; ui.status(`${RIG[S.kind].label}：拖动测力计${RIG[S.kind].down ? '向下' : '向上'}拉，把钩码慢慢提起来。`); });
        const choices = buttons([0, 1, 2].map((j) => ({ text: '', ghost: true, onClick: () => answer(j) })));
        choices.el.hidden = true;
        const tb = table(['装置', '拉力 F/N', '拉力方向', 'h/cm', 's/cm']);
        let cur = null;
        S.drop = () => { if (cur) { cur = null; choices.el.hidden = true; } };
        const ask = () => {
          if (R.info.h < 0.02) return ui.status('先把钩码提起来一段（至少 2 cm），拉动时测力计的示数就是拉力。');
          const F = Math.round(R.info.F * 10) / 10;
          const opts = [...new Set([F, +(F + 0.2).toFixed(1), +(Math.max(0.1, F - 0.2)).toFixed(1)])].sort(() => Math.random() - 0.5);
          cur = { F, opts };
          choices.btns.forEach((b, j) => { b.hidden = j >= opts.length; b.textContent = `${opts[j].toFixed(1)} N`; });
          choices.el.hidden = false;
          ui.status('测力计的示数是多少？（每小格 0.2 N）');
        };
        const answer = (j) => {
          if (!cur) return;
          if (cur.opts[j] !== cur.F) return ui.status('再看一看指针的位置。');
          choices.el.hidden = true;
          const I = R.info;
          S.rows.push({ kind: S.kind, F: cur.F });
          tb.add([({ g3: '滑轮组甲（3 段绳子）', g2: '滑轮组乙（2 段绳子）' }[S.kind] || RIG[S.kind].label.replace(/（.*）/, '')), cur.F.toFixed(1), I.down ? '向下' : '向上', (I.h * 100).toFixed(1), S.kind === 'direct' ? (I.h * 100).toFixed(1) : (I.s * 100).toFixed(1)]);
          W.goal.done(S.kind === 'g2' ? 'g3' : S.kind);
          const d = S.rows.find((r) => r.kind === 'direct');
          ui.status(`记下了。${d && S.kind !== 'direct' ? `和直接提（${d.F.toFixed(1)} N）比：${cur.F < d.F - 0.15 ? '省力' : '不省力'}；绳端移动的距离是钩码升高的 ${RIG[S.kind].n} 倍。` : ''}`);
          cur = null;
        };
        ui.controls.append(kind.el, buttons([{ text: '读拉力并记录…', onClick: ask }, { text: '放下钩码', ghost: true, onClick: () => { S.s = 0; S.drop?.(); } }]).el, choices.el, note('<b>拖动测力计</b>把钩码匀速提起来。钩码共 2 N，动滑轮重 0.2 N。'));
        ui.data.append(tb.el);
        W = { status: (m) => ui.status(m), goal: goals(ui, [['direct', '直接用测力计提起钩码'], ['fixed', '用定滑轮提起钩码'], ['movable', '用动滑轮提起钩码'], ['g3', '用滑轮组提起钩码']]) };
        ui.status('先直接用测力计把钩码提起来：拖动测力计向上。');
      },
      update() { layout(); },
      debug: { S },
    };
  },
};
