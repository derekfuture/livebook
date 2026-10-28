// 图5.1-5 / 5.1-6 凸透镜使光会聚、凹透镜使光发散；焦点和焦距；想想做做：用阳光测凸透镜的焦距（图5.1-4）。
import * as THREE from 'three';
import { seg, slider, readout, goals, note, h, buttons } from './kit/ui.js';
import { canvasTex, rulerMesh } from './kit/props.js';
import { OpticsScene, RayView, lensMesh } from './kit/optics.js';
import { draggable, clamp } from './kit/interact.js';
import { paint, inked, polyline } from '../live/ink.js';

const LENSES = [
  { label: '厚的凸透镜', f: 0.05, thick: 0.02, convex: true },
  { label: '较薄的凸透镜', f: 0.1, thick: 0.011, convex: true },
  { label: '凹透镜', f: -0.08, thick: 0.014, convex: false },
];
const Y = 0.1;   // 主光轴高度

export default {
  id: 'lens',
  fig: '图5.1-5',
  title: '透镜对光的作用',
  predict: {
    q: '让平行于主光轴的几束光分别射向凸透镜和凹透镜。<br>穿过透镜后，这几束光会怎样？',
    hint: '课本第 115 页「演示」',
    options: ['都还是平行的', '凸透镜使光会聚，凹透镜使光发散', '凸透镜使光发散，凹透镜使光会聚'],
    answer: 1,
  },
  conclusion: {
    quote: '凸透镜对光有会聚作用，凹透镜对光有发散作用。',
    why: '凸透镜能使跟主光轴平行的光会聚在主光轴上的一点，这个点叫作凸透镜的<b>焦点</b>；焦点到光心的距离叫作<b>焦距</b>。凸透镜的焦距越小，对光的会聚作用越强。太阳光可以看作平行光：把凸透镜正对太阳，在另一侧移动白纸，纸上出现最小、最亮的光斑时，光斑到透镜的距离就是焦距。',
    src: '课本第 115–116 页 · 第五章 第1节 透镜',
  },

  create({ tag, look, back }) {
    const group = new THREE.Group();
    const bench = new THREE.Group(), sun = new THREE.Group();
    group.add(bench, sun);

    // ---- 光路板（深色，光路看得清） ----
    const board = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.18), new THREE.MeshBasicMaterial({ color: 0x1a2030 }));
    board.position.set(0.02, Y, -0.02);
    bench.add(board);
    const axis = polyline([new THREE.Vector3(-0.2, Y, -0.015), new THREE.Vector3(0.25, Y, -0.015)], { dashed: true, color: 0x8fa3c0, width: 1.2, dash: 0.01, gap: 0.006 });
    bench.add(axis);
    const box = inked(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.09, 0.05), paint(0x3b4150)));
    box.position.set(-0.2, Y, 0);
    bench.add(box);
    let lens = null;
    const lensHolder = new THREE.Group();
    lensHolder.position.set(0, Y, 0);
    bench.add(lensHolder);
    const rays = new RayView({ width: 2, glow: 7 });
    bench.add(rays.group);
    const fDot = new THREE.Mesh(new THREE.SphereGeometry(0.003, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffe066 }));
    bench.add(fDot);
    const tF = tag('<i>F</i>', 'mag big'), tf = tag('', 'pill');
    tF.el.style.color = '#ffe066';

    // ---- 阳光测焦距 ----
    const paperTex = canvasTex(512, 512, () => {});
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshLambertMaterial({ map: paperTex }));
    paper.rotation.x = -Math.PI / 2;
    paper.position.y = 0.001;
    sun.add(paper);
    const sunLens = new THREE.Group();
    sun.add(sunLens);
    const handle = inked(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.008, 0.012), paint(0x2c313c)));
    handle.position.set(-0.075, 0, 0);
    sunLens.add(handle);
    const ruler = rulerMesh({ length: 0.2, width: 0.02, divisions: 200, every: 10 });
    ruler.rotation.z = Math.PI / 2;
    ruler.rotation.y = Math.PI / 2;
    ruler.position.set(0.062, 0.1, 0);          // 和透镜在同一竖直面里，读数没有视差
    sun.add(ruler);
    const sunRays = new RayView({ width: 1.4, glow: 6 });
    sun.add(sunRays.group);
    const tH = tag('', 'pill');
    let burn = 0;

    const S = { mode: 0, lens: 1, H: 0.14, tried: new Set([1]), minSpot: 1 };
    let G = null;
    const sc = new OpticsScene();

    const setLens = (k) => {
      S.lens = k;
      if (lens) lensHolder.remove(lens);
      const L = LENSES[k];
      lens = lensMesh({ r: 0.04, convex: L.convex, thick: L.thick });
      lensHolder.add(lens);
      S.tried.add(k);
      if (sunLensMesh) sunLens.remove(sunLensMesh);
      if (L.convex) {
        sunLensMesh = lensMesh({ r: 0.035, convex: true, thick: L.thick });
        sunLensMesh.rotation.z = Math.PI / 2;
        sunLens.add(sunLensMesh);
      }
    };
    let sunLensMesh = null;

    const layoutBench = () => {
      const L = LENSES[S.lens];
      sc.lenses.length = 0;
      sc.lenses.push({ x: 0, y: Y, h: 0.04, f: L.f });
      const paths = [], virt = [];
      for (const dy of [-0.03, -0.015, 0, 0.015, 0.03]) {
        const t = sc.trace({ x: -0.18, y: Y + dy }, { x: 1, y: 0 }, { maxLen: 0.42 });
        const pts = t.pts.map((p) => ({ x: Math.min(p.x, 0.24), y: clamp(p.y, Y - 0.085, Y + 0.085) }));
        paths.push({ pts, color: 0xff3b3b });
        if (L.f < 0 && dy !== 0) virt.push({ pts: [t.pts[1], { x: L.f, y: Y }], color: 0xffb0b0 });
      }
      rays.set(paths, (x, y) => new THREE.Vector3(x, y, 0), virt);
      fDot.position.set(L.f, Y, 0.002);
      tF.loc(bench, L.f, Y - 0.014, 0.01).text(L.f > 0 ? '<i>F</i>（焦点）' : '<i>F</i>（虚焦点）');
      tf.loc(bench, L.f / 2, Y + 0.05, 0.01).text(`焦距 <i>f</i> = ${Math.abs(L.f * 100).toFixed(0)} cm`);
      if (G) {
        G.status(L.f > 0 ? `平行光经过凸透镜后会聚到焦点 <i>F</i>，焦距 ${Math.round(L.f * 100)} cm。` : '平行光经过凹透镜后发散，它们的反向延长线交于一点——凹透镜的虚焦点。');
        if (L.f < 0) G.goal.done('concave');
        if (S.tried.has(0) && S.tried.has(1)) G.goal.done('thick');
      }
    };

    const layoutSun = () => {
      const L = LENSES[S.lens];
      sunLens.position.set(0, S.H, 0);
      sunLens.visible = L.convex;
      const f = L.f > 0 ? L.f : 0.1;
      const R = 0.032;
      const spot = Math.max(0.0012, (R * Math.abs(S.H - f)) / f);
      S.spot = spot;
      // 阳光：从上面竖直射下，经透镜会聚
      const paths = [];
      for (const dx of [-0.03, -0.015, 0, 0.015, 0.03]) {
        const k = dx / R;
        const xEnd = dx - (dx / f) * S.H;
        paths.push({ pts: [{ x: dx, y: S.H + 0.12 }, { x: dx, y: S.H }, { x: L.convex ? xEnd : dx, y: 0.002 }], color: 0xffd34d });
        void k;
      }
      sunRays.set(paths, (x, y) => new THREE.Vector3(x, y, 0));
      const g = paperTex.canvas.getContext('2d'), W = 512, px = W / 0.16;
      g.fillStyle = '#fbf9f2'; g.fillRect(0, 0, W, W);
      if (burn > 0.05) { g.fillStyle = `rgba(80,45,20,${Math.min(0.85, burn)})`; g.beginPath(); g.arc(W / 2, W / 2, 6 + burn * 6, 0, Math.PI * 2); g.fill(); }
      const r = spot * px;
      const bright = Math.min(1, (0.006 / spot) ** 2 + 0.25);
      const gr = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, r);
      gr.addColorStop(0, `rgba(255,250,200,${bright})`); gr.addColorStop(1, 'rgba(255,230,120,0)');
      g.fillStyle = gr;
      g.beginPath(); g.arc(W / 2, W / 2, r, 0, Math.PI * 2); g.fill();
      paperTex.needsUpdate = true;
      tH.loc(sun, 0.09, S.H, 0).text('透镜到纸的距离：看刻度尺');
      if (G) {
        G.out.set('h', S.H * 100, 1); G.out.set('s', spot * 200, 1);
        if (spot <= 0.0015 && L.convex) G.found();
        else { G.lost(); G.status('上下移动凸透镜，找纸上<b>最小、最亮</b>的光斑。'); }
      }
    };

    const layout = () => {
      bench.visible = S.mode === 0; sun.visible = S.mode === 1;
      tF.show(S.mode === 0); tf.show(S.mode === 0 && LENSES[S.lens].f !== 0); tH.show(S.mode === 1);
      if (S.mode === 0) layoutBench(); else layoutSun();
    };
    setLens(1);
    layout();

    const pointer = draggable(group, [
      { obj: sunLens, plane: 'xy', hint: '上下拖透镜：找最小最亮的光斑', onDrag: (p) => { S.H = clamp(p.y, 0.02, 0.2); layout(); G?.syncH(); } },
    ]);

    return {
      group,
      size: { w: 0.48, d: 0.18, h: 0.22 },
      view: { elev: 10, azim: 0, lookY: 0.48, margin: 1.05 },
      pointer,
      mount(ui) {
        const out = readout([{ key: 'h', label: '透镜到纸的距离', unit: 'cm', secret: '看刻度尺' }, { key: 's', label: '光斑直径', unit: 'cm', secret: '看纸上' }]);
        const mode = seg('做哪个', ['平行光射向透镜', '用阳光测焦距'], (_, k) => { S.mode = k; d1.hidden = k !== 0; d2.hidden = k !== 1; if (k === 1 && !LENSES[S.lens].convex) { setLens(1); lensSel.set(1); } layout(); if (k === 0) layoutBench(); });
        const lensSel = seg('换一块透镜', LENSES.map((l) => l.label), (_, k) => { setLens(k); layout(); }, { value: 1 });
        const hs = slider('透镜离纸的高度（也可以拖透镜）', { min: 2, max: 20, step: 0.1, value: 14, fmt: () => '', onInput: (v) => { S.H = v / 100; layout(); } });
        const d1 = h('div', {}, note('左边的光源发出五束平行光。换不同的透镜看看。'));
        // 找到最小光斑后，学生自己从刻度尺上读透镜到纸的距离
        let fq = null;
        const fpick = buttons([0, 1, 2].map((j) => ({ text: '', ghost: true, onClick: () => {
          if (!fq) return;
          if (fq.opts[j] !== fq.right) return ui.status('再读一读：看刻度尺上，透镜（中间那条线）对着几厘米。每小格 1 mm。');
          fpick.el.hidden = true; back(); G.goal.done('sun'); out.reveal('h');
          ui.status(`对：光斑最小、最亮时，透镜到纸的距离约 ${fq.right} cm——这就是这块凸透镜的<b>焦距</b>。`);
          fq.done = true;
        } })));
        fpick.el.hidden = true;
        const nearR = buttons([{ text: '凑近看刻度尺', ghost: true, onClick: () => look([0.04, S.H, 0], [0, 0.2, 1], 0.16, () => back()) }]);     // 平视：眼睛和透镜一样高，读数才没有视差
        const d2 = h('div', { hidden: true }, hs.el, fpick.el, nearR.el, out.el, note('太阳离我们非常远，射到地面的阳光可以看作平行光。上下移动凸透镜，找到最小最亮的光斑。'));
        ui.controls.append(mode.el, lensSel.el, d1, d2);
        G = {
          out, status: (m) => ui.status(m),
          goal: goals(ui, [['thick', '比较厚、薄两块凸透镜的焦距'], ['concave', '换成凹透镜'], ['sun', '用阳光找到凸透镜的焦点']]),
          syncH: () => hs.set(+(S.H * 100).toFixed(1)),
          found: () => {
            if (fq && Math.abs(fq.H - S.H) < 0.002) return;
            const r = Math.round(S.H * 100);
            fq = { H: S.H, right: r, opts: [r - 2, r, r + 2].sort(() => Math.random() - 0.5) };
            fpick.btns.forEach((b, k) => { b.textContent = `${fq.opts[k]} cm`; });
            fpick.el.hidden = false;
            ui.status('光斑最小、最亮了！看刻度尺（可以点“凑近看刻度尺”）：透镜到纸的距离是多少？');
          },
          lost: () => { if (fq && !fq.done) { fq = null; fpick.el.hidden = true; } },
        };
        layout();
      },
      update(dt) {
        if (S.mode === 1 && S.spot <= 0.0016) { burn = Math.min(1, burn + dt * 0.25); layoutSun(); }
      },
    };
  },
};
