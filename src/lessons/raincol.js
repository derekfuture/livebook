// 第四章 第三节 降水的变化与分布 · 活动：绘制和阅读降水量柱状图（课本七年级上册第 81—82 页图 4.20、表 4.2）。
//
// 书桌上立着一块贴着坐标纸的硬纸板：横坐标 12 个月、纵坐标 0—200 毫米、每格 25 毫米（课本绘图步骤 1、2 已经画好）；坐标纸上面贴着表 4.2。
// 学生：照着表格把 12 个月的柱子一根一根拖到对应的高度（步骤 3）→ 读图：哪几个月降水多、哪几个月少、年降水量大约多少、
//   降水的季节变化有什么特点（课本第 81—82 页的问题）。
// 数据是课本表 4.2“北半球某地多年平均各月降水量”，不改、不编；年降水量 = 12 个月相加 = 745 毫米。
import * as THREE from 'three';
import { buttons } from './kit/ui.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, paperSheet, think, wrapPointer } from './kit/chemlesson.js';
import { plotSheet } from './kit/plotsheet.js';
import { sfx } from './kit/audio.js';
import { h } from '../ui/Panel.js';

const P42 = [10, 5, 22, 47, 71, 81, 135, 169, 112, 57, 24, 12];          // 表 4.2 北半球某地多年平均各月降水量（毫米）
const YEAR = P42.reduce((a, b) => a + b, 0);          // 745
const fmtP = (v) => String(Math.round(v));

export default {
  id: 'raincol',
  fig: '图4.20',
  title: '绘制降水量柱状图',
  stampText: '活动',
  style: 'paper',
  predict: {
    q: '表 4.2 是北半球某地多年平均各月降水量。画成柱状图以后，最高的几根柱子会集中在一年里的什么时候？',
    hint: '课本第 81 页活动：绘制和阅读降水量柱状图。',
    options: ['夏季（6—9 月）', '冬季（12—2 月）', '一年里差不多一样高'],
    answer: 0,
  },
  need: '照着表 4.2，把 12 个月的降水量柱子拖到坐标纸上对应的高度；再说说哪几个月降水多、哪几个月少，年降水量大约多少，降水的季节变化有什么特点',
  conclusion: {
    crops: [{ page: 84, rect: [186, 52, 458, 132] }],
    quote: '一个地区，一年内各月的降水量是有差别的。通常用各月降水量柱状图表示一个地区一年内降水的季节变化。不同地区降水的季节变化不同。有的地区，降水的季节变化比较小（图4.19甲地）；有的地区，降水的季节变化比较大（图4.19乙地）。',
    why: `画出来的柱子：6—9 月高（81、135、169、112 毫米），8 月最多；12—2 月最矮（12、10、5 毫米）。<br>年降水量 = 12 个月相加 = <b>${YEAR} 毫米</b>，大约 750 毫米。<br>这个地方的降水集中在夏季，冬季降水少，降水的季节变化比较大。`,
    src: '课本七年级上册第 79—82 页 · 第四章 第三节 降水的变化与分布（活动：绘制和阅读降水量柱状图）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); else bar.caption(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };

    paperSheet(group, { w: 0.32, d: 0.2, x: 0, z: 0.0 });
    let kept = null;          // 老师演示前学生标的点（演示完放回去）
    const fresh = () => ({ demo: false, read: false });
    S = fresh();

    const sheet = plotSheet(group, {
      kind: 'bar', values: P42, yMin: 0, yMax: 200, yStep: 25, yTitle: '降水量/毫米', unit: '毫米', snap: 3.5, tableTitle: '表 4.2　北半球某地多年平均各月降水量', rowTitle: '降水量/毫米', fmt: fmtP, tag,
      onPlace: (m, good, v) => {
        if (good) { sfx.clink?.({ freq: 600 + m * 30, gain: 0.025 }); status(`${m} 月：<b>${P42[m - 1]} 毫米</b>，画对了。${sheet.allOk() ? '12 根柱子都画好了，在左边回答几个问题。' : `还差 ${sheet.ok.filter((x) => !x).length} 个月。`}`); }
        else status(`${m} 月拖到了 ${fmtP(v)} 毫米；表上是 <b>${P42[m - 1]} 毫米</b>——${v > P42[m - 1] ? '高了' : '低了'}，对照纵坐标的刻度再拖一拖（每一大格 25 毫米，每一小格 5 毫米）。`);
        if (sheet.allOk()) { done('plot'); if (!S.demo) W?.t1.open(); }
      },
    });

    const A = { reset() { S = fresh(); sheet.reset(); W?.t1.close(); W?.t2.close(); if (W) W.next.hidden = true; bar.undo('plot', 'read'); status('坐标纸擦干净了，重新画柱子。'); } };

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'plot', title: '画柱子', todo: '照着坐标纸上面的<b>表 4.2</b>，把 1—12 月的柱子<b>一根一根拖到对应的高度</b>（拖柱子顶上那道深色的边；每一大格 25 毫米，每一小格 5 毫米）。画对了柱子会变蓝。', target: () => sheet.markers.find((mk, i) => !sheet.ok[i])?.g || null },
        { id: 'read', title: '读图', todo: '看你画的柱状图：哪几个月降水多、哪几个月少？年降水量大约多少？在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => ({ ...S, sheet: sheet.snapshot() }), set: (s) => { const { sheet: sn, ...rest } = s; S = rest; kept = sn || null; }, fresh, bar: () => bar, apply: () => { if (S.demo) { sheet.reset(); return; } if (kept) sheet.restore(kept); } }),
          shots: [
            { cap: '横坐标 12 个月，纵坐标 0—200 毫米、每格 25 毫米——课本绘图步骤的前两步已经画好。上面贴着表 4.2。', dur: 4.5 },
            { cap: '照着表格画柱子：1 月 10 毫米，柱子只到第一格的一小段。', dur: 4, during: dragTo(1, { t0: 0.1, t1: 0.75 }) },
            { cap: '8 月 169 毫米：拖到 150 和 175 之间、靠近 175 的地方。', dur: 4, during: dragTo(8, { t0: 0.1, t1: 0.75 }) },
            { cap: '其余的月份也一根一根画上去。', dur: 7, during: seq([2, 3, 4, 5, 6, 7, 9, 10, 11, 12].map((m, j) => dragTo(m, { t0: 0.04 + j * 0.09, t1: 0.1 + j * 0.09 }))) },
            { cap: `柱子高的都在夏季（6—9 月），冬季很矮：降水集中在夏季。12 个月加起来，年降水量约 ${YEAR} 毫米。演示完了，下面换你自己画。`, dur: 6 },
          ],
        },
      },
    });
    function dragTo(m, { t0, t1 }) {
      let st = null;
      return (k) => {
        if (k < t0) { st = null; return; } if (st?.done) return;
        const it = sheet.drag.items().find((x) => x.obj === sheet.markers[m - 1].pick);
        const a = sheet.pointOf(m, sheet.vals[m - 1] ?? 0), b = sheet.pointOf(m, P42[m - 1]);
        if (!st) { st = { a }; it.onStart(a.clone()); }
        const u = Math.min(1, (k - t0) / Math.max(1e-3, t1 - t0)), e = u * u * (3 - 2 * u);
        it.onDrag(st.a.clone().lerp(b, e));
        if (k >= t1) { st.done = true; it.onEnd(true); }
      };
    }
    function seq(fns) { return (k) => fns.forEach((f) => f(k)); }
    const pointer = wrapPointer(sheet.drag, bar);

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.3, d: 0.2, h: 0.22 },
      view: { elev: 24, azim: 0, lookY: 0.5, frameMargin: 1.1 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const t2 = think({ title: '想一想', status: (m) => ui.status(m),
          q: '年降水量大约是多少？降水的季节变化有什么特点？',
          options: [`约 ${YEAR} 毫米；降水集中在夏季，冬季降水少`, '约 169 毫米；降水集中在夏季', `约 ${YEAR} 毫米；一年里各月降水差不多`],
          wrong: ['169 毫米只是 8 月一个月；年降水量要把 12 个月加起来。', '看柱子：夏季的柱子比冬季高出十几倍，差得很多。'],
          ok: `对：12 个月加起来约 ${YEAR} 毫米；降水集中在夏季（8 月最多），冬季降水少，季节变化比较大。可以掀开结论看看。`,
          onOk: () => { next.hidden = false; done('read'); S.read = true; } });
        const t1 = think({ title: '想一想', status: (m) => ui.status(m),
          q: '看柱状图：哪几个月降水量较多？哪几个月较少？',
          options: ['6—9 月较多（8 月最多），12—2 月较少', '12—2 月较多，6—9 月较少', '3—5 月最多'],
          wrong: ['看柱子：最高的几根在 6—9 月，12、1、2 月的柱子最矮。', '3—5 月的柱子只有 22、47、71 毫米，比 7、8 月矮得多。'],
          ok: '对：6—9 月降水较多（7 月 135、8 月 169、9 月 112 毫米），12 月、1 月、2 月较少（12、10、5 毫米）。',
          onOk: () => t2.open() });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来（擦掉重画）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：数据是课本表 4.2“北半球某地多年平均各月降水量”。柱子拖到离表上的数不到 3.5 毫米就算画对，会落在表上的数上。' });
        ui.controls.append(t1.el, t2.el, next, more, note);
        W = { t1, t2, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('图 4.20：坐标纸的横坐标是 1—12 月，纵坐标 0—200 毫米、每格 25 毫米（课本绘图步骤的前两步）。照着坐标纸上面的表 4.2，把 12 个月的柱子拖到对应的高度。可以先看<b>老师演示</b>，也可以直接动手。');
      },
      update(dt) { bar.update(dt); },
      dispose() { bar.dispose(); sheet.dispose(); },
      debug: { get S() { return S; }, A, bar, sheet,
        qa: qaFlow(sheet.drag, [
          ...P42.map((v, i) => ({ name: `画 ${i + 1} 月`, drag: sheet.markers[i].pick, to: () => sheet.pointOf(i + 1, v + 1), wait: 0.3 })),
          { name: '答第一题', run: () => W.t1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.t2.el.querySelector('button').click() },
        ]) },
    };
  },
};
