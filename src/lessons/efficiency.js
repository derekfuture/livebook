// 图12.4-2 测量滑轮组的机械效率。一个定滑轮、一个动滑轮组成滑轮组，3 段绳子承担物重，用弹簧测力计竖直向上匀速拉动绳端。
// 读出拉力 F，量出钩码升高的高度 h 和绳端移动的距离 s，算出有用功、总功和机械效率；改变钩码的数量重复实验。
// 模型：动滑轮重 0.4 N，绳与轮之间的摩擦使拉力增加 5%：F = (G + G动)/3 × 1.05。
import * as THREE from 'three';
import { seg, buttons, goals, note, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { rig } from './kit/pulleys.js';
import { polyline } from '../live/ink.js';

const TOP = 0.62, WG = 0.5;

export default {
  id: 'efficiency',
  fig: '图12.4-2',
  title: '测量滑轮组的机械效率',
  stampText: '测量',
  predict: {
    q: '用同一个滑轮组提升钩码。钩码越重，滑轮组的机械效率——',
    hint: '课本第 120 页「想想议议」',
    options: ['越高', '越低', '不变'],
    answer: 0,
  },
  conclusion: {
    page: 124, rect: [160, 512, 456, 622],      // 课本第 120 页
    quote: '提高机械效率可以充分发挥机械设备的作用，对节能减排、提高经济效益有重要的意义。提高机械效率的主要办法是改进结构，使机械设备更合理、更轻巧。',
    formula: '<i>η</i> = <i>W</i><sub>有用</sub> / <i>W</i><sub>总</sub> = <i>Gh</i> / <i>Fs</i>',
    why: '提升钩码时，拉力做的总功 W总 = Fs，其中只有 W有用 = Gh 是我们需要的；另外还要把动滑轮一起提起来，还要克服绳和轮之间的摩擦——这部分是额外功。同一个滑轮组，额外功变化不大，钩码越重，有用功在总功里占的比例越大，机械效率越高。所以三次测得的机械效率不一样：影响滑轮组机械效率的因素有物重、动滑轮重、摩擦等。机械效率总小于 1。',
    src: '课本第 119–120 页 · 第十二章 第4节 机械效率',
  },

  create({ tag, look, back }) {
    const outer = new THREE.Group();
    let R = null;
    const S = { nW: 2, s: 0, rows: [] };
    let W = null;
    const tags = { h: tag('', 'pill'), s: tag('', 'pill') };
    const pick = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.03), new THREE.MeshBasicMaterial({ visible: false }));      // 整个测力计都能抓（不只是圆环）
    pick.userData.pick = true;
    outer.add(pick);
    const marks = polyline([new THREE.Vector3(), new THREE.Vector3(1, 0, 0), new THREE.Vector3(), new THREE.Vector3(1, 0, 0), new THREE.Vector3(), new THREE.Vector3(1, 0, 0), new THREE.Vector3(), new THREE.Vector3(1, 0, 0)], { dashed: true, width: 1.2, dash: 0.006, gap: 0.004 });
    outer.add(marks);
    // 取景用的空盒：测力计往上拉 12 cm 左右（够记录了）时，表身也要在画面里
    const reach = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.01), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    reach.raycast = () => {}; outer.add(reach);
    const build = () => {
      if (R) outer.remove(R.group);
      R = rig('g3', { top: TOP, nW: S.nW, wG: WG, gm: 0.8, mu: 0.05 });     // 动滑轮重 0.8 N：三组钩码的 η 在 0.1 N 的读数精度下也分得开
      outer.add(R.group);
      S.s = 0; R.info.set(0);
      S.start = { load: R.info.loadTop, end: R.info.end.y };
      reach.position.copy(R.info.ring).add(new THREE.Vector3(0, 0.15, 0));
    };
    build();
    let start = 0;
    const pointer = draggable(outer, [{ obj: pick, plane: 'xy', offset: 0, onStart: (p) => { start = p.y - S.s; S.drop?.(); }, onDrag: (p) => { S.s = clamp(p.y - start, 0, 0.24); } }]);
    const layout = () => {
      const I = R.info;
      I.set(S.s);
      pick.position.copy(I.ring).add(new THREE.Vector3(0, -0.11, 0));
      marks.geometry.setPositions([-0.03, S.start.load, 0, 0.12, S.start.load, 0, -0.03, I.loadTop, 0, 0.12, I.loadTop, 0,
        I.end.x - 0.03, S.start.end, 0, I.end.x + 0.03, S.start.end, 0, I.end.x - 0.03, I.end.y, 0, I.end.x + 0.03, I.end.y, 0]);
      marks.computeLineDistances();
      tags.h.loc(outer, 0.15, (S.start.load + I.loadTop) / 2, 0).text(`h = ${(I.h * 100).toFixed(1)} cm`);
      tags.s.loc(outer, I.end.x - 0.07, (S.start.end + I.end.y) / 2, 0).text(`s = ${(I.s * 100).toFixed(1)} cm`);
    };
    layout();

    return {
      group: outer,
      size: { w: 0.3, d: 0.08, h: 0.86 },
      view: { elev: 4, azim: 0, lookY: 0.46, margin: 0.98 },
      pointer,
      mount(ui) {
        const nw = seg('钩码（每个 0.5 N）', ['2 个', '4 个', '6 个'], (_, k) => { S.nW = [2, 4, 6][k]; build(); layout(); S.drop?.(); });
        const choices = buttons([0, 1, 2].map((j) => ({ text: '', ghost: true, onClick: () => answer(j) })));
        choices.el.hidden = true;
        const tb = table(['序号', 'G/N', 'h/m', 'W有用/J', 'F/N', 's/m', 'W总/J', 'η']);
        // 一次测量 = 一个快照（拉到的位置、钩码重、拉力）。之后钩码被放下、拉得更高、换了钩码，没答完的题就作废。
        let cur = null;
        const drop = () => { if (cur) { cur = null; choices.el.hidden = true; back(); } };
        S.drop = drop;
        const ask = () => {
          const I = R.info;
          if (I.h < 0.04) return ui.status('把钩码匀速提起来一段（至少 4 cm），再读拉力。');
          if (S.rows.some((r) => r.G === I.G)) return ui.status('这么重的钩码已经测过了，换一组钩码。');
          const Fr = Math.round(I.F * 10) / 10;      // 读到 0.1 N 的估读
          const naive = +(I.G / 3).toFixed(1);
          const opts = [...new Set([Fr, +(Fr + 0.2).toFixed(1), naive === Fr ? +(Fr - 0.2).toFixed(1) : naive])].sort(() => Math.random() - 0.5);
          const h = Math.round(I.h * 100) / 100;
          cur = { step: 'F', Fr, opts, naive, snap: { s: S.s, nW: S.nW, G: I.G, h, sEnd: +(h * 3).toFixed(2) } };
          choices.btns.forEach((b, j) => { b.hidden = j >= opts.length; b.textContent = `${opts[j].toFixed(1)} N`; });
          choices.el.hidden = false;
          { const c = R.meter.getWorldPosition(new THREE.Vector3()); look(outer.worldToLocal(c).add(new THREE.Vector3(0, -0.06, 0)).toArray(), [0, 0.05, 1], 0.3, () => back()); }     // 凑近看测力计
          ui.status('<b>保持住</b>，读测力计的示数 F（每小格 0.2 N，估读到 0.1 N）：');
        };
        const answer = (j) => {
          if (!cur) return;
          const sn = cur.snap;
          if (cur.step === 'F') {
            if (cur.opts[j] !== cur.Fr) return ui.status(cur.opts[j] === cur.naive ? '这是“物重的三分之一”——实际的拉力还要算上动滑轮的重和摩擦。看测力计的指针。' : '再看一看指针的位置。');
            // 第二问：学生自己算机械效率
            const eta = (sn.G * sn.h) / (cur.Fr * sn.sEnd);
            const pct = (x) => `${Math.round(x * 100)}%`;
            const opts = [...new Set([pct(eta), pct(Math.min(1, (sn.G * sn.sEnd) / (cur.Fr * sn.sEnd * 3))), pct((cur.Fr * sn.sEnd) / (sn.G * sn.h) / 3)])].sort(() => Math.random() - 0.5);
            cur = { ...cur, step: 'eta', eta, right: pct(eta), opts2: opts };
            choices.btns.forEach((b, k) => { b.hidden = k >= opts.length; b.textContent = opts[k]; });
            return ui.status(`F = ${cur.Fr.toFixed(1)} N。钩码升高 h = ${sn.h.toFixed(2)} m，绳端移动 s = ${sn.sEnd.toFixed(2)} m（看虚线和刻度）。<b>机械效率 η = W有用 / W总 = ?</b>`);
          }
          if (cur.opts2[j] !== cur.right) return ui.status('W有用 = Gh（提钩码做的功），W总 = Fs（拉力做的功），η = W有用 ÷ W总。');
          choices.el.hidden = true; back();
          const wy = sn.G * sn.h, wz = cur.Fr * sn.sEnd;
          if (!(sn.h > 0 && wz > 0 && Number.isFinite(cur.eta))) { cur = null; return ui.status('这组数据无效，重新测。'); }
          S.rows.push({ G: sn.G, eta: cur.eta });
          tb.add([String(S.rows.length), sn.G.toFixed(1), sn.h.toFixed(2), wy.toFixed(3), cur.Fr.toFixed(1), sn.sEnd.toFixed(2), wz.toFixed(3), cur.right]);
          if (S.rows.length >= 3) W.goal.done('three');
          // 结论按学生自己记下的数说：严格变大才说“越重越高”，否则如实说分辨不出
          let tail = '改变钩码的数量，再测一次。';
          if (S.rows.length >= 3) {
            const r = [...S.rows].sort((a, b) => a.G - b.G).map((x) => Math.round(x.eta * 100));
            tail = r.every((x, i) => i === 0 || x > r[i - 1]) ? `按 G 从小到大，η 是 ${r.join('%、')}%：<b>提升的物体越重，机械效率越高</b>（额外功差不多，有用功变多了）。` : `按 G 从小到大，η 是 ${r.join('%、')}%：在这个读数精度下有几次分辨不出差别。想一想：怎样测才能看得更清楚？`;
          }
          ui.status(`W有用 = ${wy.toFixed(3)} J，W总 = ${wz.toFixed(3)} J，η = ${cur.right}。${tail}`);
          cur = null;
        };
        ui.controls.append(nw.el, buttons([{ text: '读拉力并记录…', onClick: ask }, { text: '放下钩码', ghost: true, onClick: () => { S.s = 0; S.drop?.(); } }]).el, choices.el, note('<b>拖动测力计</b>竖直向上匀速拉，钩码升高 h、绳端移动 s（虚线标出了起点和终点）。'));
        ui.data.append(tb.el);
        W = { status: (m) => ui.status(m), goal: goals(ui, [['three', '用 3 组不同数量的钩码，各测一次机械效率']]) };
        ui.status('按图12.4-2 装好了滑轮组。拖动测力计向上拉，把钩码匀速提起来。');
      },
      update() { layout(); },
      debug: { S },
    };
  },
};
