// 第四章 第二节 气温的变化与分布 · 活动：绘制和阅读气温年变化曲线图（课本七年级上册第 74—75 页图 4.11、表 4.1）。
//
// 书桌上立着一块贴着坐标纸的硬纸板：横坐标 12 个月、纵坐标 −25—25 ℃、每格 5 ℃（课本绘图步骤 1、2 已经画好）；坐标纸上面贴着表 4.1。
// 学生：照着表格把 12 个月的点一个一个拖到对应的气温（步骤 3）→ 点一下铅笔，用平滑的曲线把各点连起来（步骤 4）→
//   读图：找出最热月、最冷月的平均气温，算气温年较差，归纳气温的年变化特点（课本第 75 页的问题）。
// 数据是课本表 4.1“某地多年平均各月气温”，不改、不编；年较差 = 最热月平均气温 − 最冷月平均气温 = 23.3 − (−20.1) = 43.4 ℃。
import * as THREE from 'three';
import { buttons } from './kit/ui.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, paperSheet, think, wrapPointer } from './kit/chemlesson.js';
import { plotSheet } from './kit/plotsheet.js';
import { sfx } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const T41 = [-20.1, -15.8, -6.0, 5.8, 13.9, 19.7, 23.3, 21.6, 14.3, 5.6, -6.7, -16.8];          // 表 4.1 某地多年平均各月气温（℃）
const fmtT = (v) => (Math.round(v * 10) / 10).toFixed(1).replace('-0.0', '0.0');

export default {
  id: 'tempcurve',
  fig: '图4.11',
  title: '绘制气温年变化曲线图',
  stampText: '活动',
  style: 'real',
  flow: 'explore',
  ask: '表 4.1 是某地多年平均各月气温。不画图先估一估：这个地方的气温年较差（最热月平均气温减最冷月平均气温）大约是多少？',
  guess: { options: ['约 43 ℃', '约 23 ℃', '约 3 ℃'], answer: 0 },          // 动手看里的“先猜一下（可以不猜）”
  need: '照着表 4.1，把 12 个月的气温点标在坐标纸上；用平滑的曲线把各点连起来；再找出最热月、最冷月的平均气温，算出气温年较差，说说这个地方气温的年变化特点',
  conclusion: {
    crops: [{ page: 77, rect: [305, 268, 472, 362] }],
    quote: '一年中，北半球气温，通常陆地上7月最高，1月最低；海洋上8月最高，2月最低。一年内的最高月平均气温与最低月平均气温的差，叫气温年较差。',
    why: '画出来的曲线：7 月最高（23.3 ℃），1 月最低（−20.1 ℃），中间先升后降，像一座山。<br>气温年较差 = 23.3 ℃ − (−20.1 ℃) = <b>43.4 ℃</b>。<br>这个地方夏季（7 月前后）气温较高，冬季（1 月前后）气温在 0 ℃ 以下、很冷，气温的年变化大。',
    src: '课本七年级上册第 72—75 页 · 第四章 第二节 气温的变化与分布（活动：绘制和阅读气温年变化曲线图）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null, said = '';
    const status = (m) => { if (!S.demo) { said = m; W?.status(m); } else bar.caption(m); };          // said：学生这边最后一句（老师演示完放回去）
    const done = (id) => { if (!S.demo) bar.done(id); };
    const undo = (...ids) => { if (!S.demo) bar.undo(...ids); };

    paperSheet(group, { w: 0.32, d: 0.2, x: 0, z: 0.0 });
    // 铅笔：点它，用平滑的曲线把各点连起来（课本步骤 4）
    const pencil = new THREE.Group(); pencil.position.set(0.105, 0.003, 0.088); pencil.rotation.y = 0.5; group.add(pencil);
    { const body = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.07, 6), paint(0xe2b23a)), { width: 0.5 }); body.rotation.z = Math.PI / 2; pencil.add(body);
      const tip = inked(new THREE.Mesh(new THREE.ConeGeometry(0.0028, 0.009, 6), paint(0xe9d2a6)), { width: 0.4 }); tip.rotation.z = Math.PI / 2; tip.position.x = 0.0395; pencil.add(tip);
      const lead = new THREE.Mesh(new THREE.ConeGeometry(0.0009, 0.003, 6), paint(0x2a2f3a, { keep: true })); lead.rotation.z = Math.PI / 2; lead.position.x = 0.0445; pencil.add(lead); }
    const pencilPick = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.012, 0.014), new THREE.MeshBasicMaterial({ visible: false })); pencilPick.userData.pick = true; pencil.add(pencilPick);

    let kept = null;          // 老师演示前学生标的点（演示完放回去）
    const fresh = () => ({ demo: false, plotted: false, drawn: false, drawK: 0, drawing: false, paused: false, read: false });
    S = fresh();

    const sheet = plotSheet(group, {
      kind: 'line', values: T41, yMin: -25, yMax: 25, yStep: 5, yTitle: '气温/℃', unit: '℃', snap: 0.6, tableTitle: '表 4.1　某地多年平均各月气温', rowTitle: '气温/℃', fmt: fmtT, tag,
      taps: [{ obj: pencilPick, hint: () => (sheet?.allOk() ? '点一下：用平滑的曲线把各点连起来' : '先把 12 个点都标好'), onTap: () => A.draw() }],
      onGrab: () => {          // 画好以后（或正在连线时）又去拖点：曲线先收起来；正在画的停下，放回表上的数以后再点铅笔重新连
        if (S.drawing) { S.drawing = false; S.drawK = 0; S.paused = true; }
        if (S.drawn || S.paused) { sheet.drawCurve(0); sheet.showSpan(false); }
      },
      onPlace: (m, good, v) => {
        if (good) {
          sfx.clink?.({ freq: 700 + m * 30, gain: 0.025 });
          if (S.drawn && sheet.allOk()) { sheet.drawCurve(1); if (S.read) sheet.showSpan(true, '年较差 43.4 ℃'); status(`${m} 月放回了 <b>${fmtT(T41[m - 1])} ℃</b>，曲线还是这一条。`); return; }
          if (S.paused && sheet.allOk()) { S.paused = false; status(`${m} 月放回了 <b>${fmtT(T41[m - 1])} ℃</b>。刚才连线停下了：再点一下<b>铅笔</b>，重新用平滑的曲线把各点连起来。`); return; }
          status(`${m} 月：<b>${fmtT(T41[m - 1])} ℃</b>，标对了（离表上的数很近，点落在了 ${fmtT(T41[m - 1])} ℃ 上）。${sheet.allOk() ? '12 个点都标好了，点一下<b>铅笔</b>，用平滑的曲线把各点连起来。' : `还差 ${sheet.ok.filter((x) => !x).length} 个月。`}`);
        } else {
          const had = S.drawn || S.drawing || S.read;
          if (had || S.plotted || S.paused) { S.plotted = S.drawn = S.drawing = S.read = S.paused = false; S.drawK = 0; sheet.drawCurve(0); sheet.showSpan(false); if (!S.demo) W?.ui.relock?.(); undo('plot', 'curve', 'read'); W?.t1.close(); W?.t2.close(); if (W) W.next.hidden = true; }          // 12 个点标好以后又改错了：标点、曲线、读图、这一次的结论都作废（重新锁上），标对以后重新连线、读图
          status(`${m} 月拖到了 ${fmtT(v)} ℃；表上是 <b>${fmtT(T41[m - 1])} ℃</b>——${v > T41[m - 1] ? '高了' : '低了'}，对照纵坐标的刻度再拖一拖（每一大格 5 ℃，每一小格 1 ℃）。${had ? '这个点改了，曲线和下面的读图要等 12 个点都标对以后重新来。' : ''}`);
        }
        if (sheet.allOk()) { S.plotted = true; done('plot'); }
      },
    });

    const A = {
      draw() {
        if (!sheet.allOk()) { status(`还有 ${sheet.ok.filter((x) => !x).length} 个月的点没标好，标好了再连线。`); return; }
        if (S.drawn || S.drawing) return;
        S.drawing = true; S.paused = false; sfx.clink?.({ freq: 520, gain: 0.02 });
        status('用平滑的曲线把各点连起来……');
      },
      reset() { W?.ui?.relock?.(); S = fresh(); sheet.reset(); W?.t1.close(); W?.t2.close(); if (W) W.next.hidden = true; bar.undo('plot', 'curve', 'read'); status('坐标纸擦干净了，重新标点。'); },
    };

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'plot', title: '标点', todo: '照着坐标纸上面的<b>表 4.1</b>，把 1—12 月的点<b>一个一个拖到对应的气温</b>上（每一大格 5 ℃，每一小格 1 ℃）。标对了点会变红。', target: () => sheet.markers.find((mk, i) => !sheet.ok[i])?.g || null },
        { id: 'curve', title: '连线', todo: '点一下桌上的<b>铅笔</b>，用平滑的曲线把各点连接起来，完成图 4.11。', target: () => (S.drawn ? null : pencil) },
        { id: 'read', title: '读图', todo: '看你画的曲线：最热月、最冷月各是几月、多少度？气温年较差是多少？在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => ({ ...S, sheet: sheet.snapshot() }), set: (s) => { const { sheet: sn, ...rest } = s; S = rest; kept = sn || null; }, fresh, bar: () => bar, apply: () => {
            if (S.demo) { sheet.reset(); W?.status('老师演示中：看画面下面的字幕。你刚才标的点先存着，演示完放回来。'); return; }
            if (kept) sheet.restore(kept);          // 演示完：学生自己标的点、画的线放回去
            sheet.drawCurve(S.drawn ? 1 : 0); sheet.showSpan(!!S.read, '年较差 43.4 ℃'); if (said) W?.status(said);
          } }),
          shots: [
            { cap: '横坐标 12 个月，纵坐标 −25—25 ℃、每格 5 ℃——课本绘图步骤的前两步已经画好。上面贴着表 4.1。', dur: 4.5 },
            { cap: '照着表格标点：1 月 −20.1 ℃，往下拖到 −20 下面一点点。', dur: 4, during: dragTo(1, { t0: 0.1, t1: 0.75 }) },
            { cap: '7 月 23.3 ℃：最高的一个点。', dur: 3.5, during: dragTo(7, { t0: 0.1, t1: 0.75 }) },
            { cap: '其余的月份也一个一个标上去。', dur: 7, during: seq([2, 3, 4, 5, 6, 8, 9, 10, 11, 12].map((m, j) => dragTo(m, { t0: 0.04 + j * 0.09, t1: 0.1 + j * 0.09 }))) },
            { cap: '点一下铅笔，用平滑的曲线把各点连起来：7 月最高，1 月最低，像一座山。', dur: 5, during: at(0.12, () => A.draw()) },
            { cap: '最热月 23.3 ℃，最冷月 −20.1 ℃：气温年较差 = 23.3 − (−20.1) = 43.4 ℃。演示完了，下面换你自己画。', dur: 6, during: at(0.1, () => sheet.showSpan(true, '年较差 43.4 ℃')) },
          ],
        },
      },
    });
    // 演示里的动作：走学生拖点、点铅笔的同一套处理函数
    function dragTo(m, { t0, t1 }) {
      let st = null;
      return (k) => {
        if (k < t0) { st = null; return; } if (st?.done) return;
        const it = sheet.drag.items().find((x) => x.obj === sheet.markers[m - 1].pick);
        const a = sheet.pointOf(m, sheet.vals[m - 1] ?? 0), b = sheet.pointOf(m, T41[m - 1]);
        if (!st) { st = { a }; it.onStart(a.clone()); }
        const u = Math.min(1, (k - t0) / Math.max(1e-3, t1 - t0)), e = u * u * (3 - 2 * u);
        it.onDrag(st.a.clone().lerp(b, e));
        if (k >= t1) { st.done = true; it.onEnd(true); }
      };
    }
    function seq(fns) { return (k) => fns.forEach((f) => f(k)); }
    function at(t, fn) { let fired = false; return (k) => { if (k < t) { fired = false; return; } if (!fired) { fired = true; fn(); } }; }
    const pointer = wrapPointer(sheet.drag, bar);

    // 铅笔画线：笔尖跟着曲线画到的那一头走（画完回到桌上原来的地方）
    const rest = { p: pencil.position.clone(), q: pencil.quaternion.clone() }, tipLocal = 0.0455;
    const nB = new THREE.Vector3(0, 0, 1).applyQuaternion(sheet.board.quaternion), into = nB.clone().negate().add(new THREE.Vector3(0.35, -0.25, 0)).normalize();
    const drawQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), into);
    const penAt = (k) => {          // 曲线画到 k 时，那一头在纸上的位置（实验的坐标）
      const u = 1 + 11 * Math.min(1, k);
      sheet.board.updateMatrixWorld(true); group.updateMatrixWorld(true);
      return group.worldToLocal(sheet.board.localToWorld(new THREE.Vector3(sheet.x(u), sheet.y(sheet.curveV(u)), 0.002)));
    };
    const movePencil = (dt) => {
      const want = S.drawing ? { p: penAt(S.drawK).addScaledVector(into, -tipLocal), q: drawQ } : rest, k = Math.min(1, dt * (S.drawing ? 14 : 5));
      pencil.position.lerp(want.p, k); pencil.quaternion.slerp(want.q, k);
    };
    const step = (dt) => {
      movePencil(dt);
      if (S.drawing) {
        S.drawK = Math.min(1, S.drawK + dt / 2.2); sheet.drawCurve(S.drawK);
        if (S.drawK >= 1) { S.drawing = false; S.drawn = true; done('curve'); status('曲线画好了：<b>7 月最高、1 月最低</b>，中间先升后降。在左边回答几个问题。'); if (!S.demo) W?.t1.open(); }
      }
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.3, d: 0.2, h: 0.22 },
      view: { elev: 24, azim: 0, lookY: 0.5, frameMargin: 1.1 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const t2 = think({ title: '想一想', status,
          q: '归纳这个地方气温的年变化特点：',
          options: ['夏季气温较高，冬季在 0 ℃ 以下、很冷，气温年较差大', '一年四季气温差不多', '冬季气温比夏季高'],
          wrong: ['看你画的曲线：最高点和最低点差了 40 多摄氏度，差得很多。', '看曲线：1 月在最下面，7 月在最上面。'],
          ok: '对：这个地方夏季较热、冬季寒冷，气温年较差大（43.4 ℃）。可以掀开结论看看。',
          onOk: () => { if (!S.drawn) return; next.hidden = false; done('read'); S.read = true; sheet.showSpan(true, '年较差 43.4 ℃'); } });
        const t1 = think({ title: '想一想', status,
          q: '看曲线：最热月、最冷月的平均气温各是多少？气温年较差是多少？',
          options: ['最热月 7 月 23.3 ℃，最冷月 1 月 −20.1 ℃，年较差 43.4 ℃', '最热月 8 月 21.6 ℃，最冷月 12 月 −16.8 ℃，年较差 38.4 ℃', '最热月 7 月 23.3 ℃，最冷月 1 月 −20.1 ℃，年较差 3.2 ℃'],
          wrong: ['找曲线上最高、最低的那两个点：最高是 7 月，最低是 1 月。', '年较差是最热月平均气温减最冷月平均气温：23.3 − (−20.1) = 23.3 + 20.1 = 43.4 ℃。减去一个负数，等于加上它的相反数。'],
          ok: '对：最热月 7 月 23.3 ℃，最冷月 1 月 −20.1 ℃，年较差 = 23.3 − (−20.1) = 43.4 ℃。',
          onOk: () => { if (S.drawn) t2.open(); } });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '对照课本原文 →');
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来（擦掉重画）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：数据是课本表 4.1“某地多年平均各月气温”。点拖到离表上的数不到 0.6 ℃ 就算标对，会落在表上的数上。' });
        ui.controls.append(t1.el, t2.el, next, more, note);
        W = { ui, t1, t2, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        status('图 4.11：坐标纸的横坐标是 1—12 月，纵坐标 −25—25 ℃、每格 5 ℃（课本绘图步骤的前两步）。照着坐标纸上面的表 4.1，把 12 个月的点拖到对应的位置。可以先看<b>老师演示</b>，也可以直接动手。');
      },
      update(dt) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k); },
      dispose() { bar.dispose(); sheet.dispose(); },
      debug: { get S() { return S; }, A, bar, sheet,
        qa: qaFlow(sheet.drag, [
          ...T41.map((v, i) => ({ name: `标 ${i + 1} 月`, drag: sheet.markers[i].pick, to: () => sheet.pointOf(i + 1, v + 0.2), wait: 0.3 })),
          { name: '连线', tap: pencilPick, wait: 3 },
          { name: '答第一题', run: () => W.t1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.t2.el.querySelector('button').click() },
        ]) },
    };
  },
};
