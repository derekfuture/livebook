// 图4.2-3 探究光反射时的规律：平面镜平放，纸板 ENF 竖直立在镜面上，激光贴着纸板射到 O 点。
// 坐标：纸板在 xy 平面（z = 0），镜面是 y = 0，O 在原点，法线 ON 沿 +y。
import * as THREE from 'three';
import { seg, readout, buttons, table, goals, note, guard } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { RayView, laserPen } from './kit/optics.js';
import { draggable, clamp, deg } from './kit/interact.js';
import { paint, inked, polyline } from '../live/ink.js';

const BW = 0.12, BH = 0.12, R = 0.105;
const PENS = ['#d33a2c', '#2f6fd0', '#2e9b4f', '#a24bd0', '#e08a1e'];

export default {
  id: 'reflection',
  fig: '图4.2-3',
  title: '探究光反射时的规律',
  predict: {
    q: '让一束光贴着纸板射到平面镜上的 O 点。<br>入射角增大时，反射角会怎样变化？',
    hint: '课本第 94 页「实验」：入射角 ∠i、反射角 ∠r 都从法线 ON 量起',
    options: ['反射角变小', '反射角也变大，而且总和入射角相等', '反射角不变，总是 45°'],
    answer: 1,
  },
  conclusion: {
    quote: '在反射现象中，反射光线、入射光线和法线在同一平面内；反射光线和入射光线分别位于法线两侧；反射角等于入射角。',
    why: '这就是<b>光的反射定律</b>。把纸板 NOF 向后折，纸板上就看不到反射光了——说明反射光线、入射光线和法线在同一平面内。让光逆着原来的反射光射到镜面，它会逆着原来的入射光射出：<b>在反射现象中，光路可逆</b>。',
    src: '课本第 94–95 页 · 第四章 第2节 光的反射',
  },

  create({ tag }) {
    const group = new THREE.Group();

    // 平面镜（镜面和实验台板顶面同高：画的时候让镜面略微靠前，免得两者重合闪烁）
    const mirror = inked(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.006, 0.16), [paint(0x9aa8b8), paint(0x9aa8b8), new THREE.MeshPhongMaterial({ color: 0xcfe3f2, shininess: 120, specular: 0xffffff, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }), paint(0x9aa8b8), paint(0x9aa8b8), paint(0x9aa8b8)]));
    mirror.position.y = -0.003;
    group.add(mirror);

    // 纸板（两半，各一张画布：量角刻度 + 笔迹）
    const half = (side) => {
      const tex = canvasTex(512, 512, () => {});
      const m = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
      m.position.set((side * BW) / 2, BH / 2, 0);
      const edge = polyline([new THREE.Vector3(-BW / 2, -BH / 2, 0), new THREE.Vector3(-BW / 2, BH / 2, 0), new THREE.Vector3(BW / 2, BH / 2, 0), new THREE.Vector3(BW / 2, -BH / 2, 0)], { width: 1.3 });
      m.add(edge);
      const pivot = new THREE.Group();
      pivot.add(m);
      group.add(pivot);
      return { tex, mesh: m, pivot, side };
    };
    const E = half(-1), F = half(1);
    const traces = [];   // { i, r, color, reverse }
    const paintBoard = () => {
      for (const b of [E, F]) {
        const g = b.tex.canvas.getContext('2d'), W = 512;
        g.fillStyle = '#fbfaf5'; g.fillRect(0, 0, W, W);
        // O 在画布底边：左半张的 O 在右下角，右半张在左下角
        const ox = b.side < 0 ? W : 0, oy = W, rr = (R / BW) * W;
        g.strokeStyle = 'rgba(40,50,70,.55)'; g.lineWidth = 2;
        g.beginPath(); g.arc(ox, oy, rr, b.side < 0 ? Math.PI : -Math.PI / 2, b.side < 0 ? -Math.PI / 2 : 0); g.stroke();
        g.fillStyle = 'rgba(40,50,70,.75)'; g.font = '22px sans-serif'; g.textAlign = 'center';
        for (let a = 0; a <= 90; a += 5) {
          const t = (a * Math.PI) / 180, dx = Math.sin(t) * b.side, dy = -Math.cos(t);
          const l = a % 10 === 0 ? 18 : 10;
          g.lineWidth = a % 10 === 0 ? 2.5 : 1.5;
          g.beginPath(); g.moveTo(ox + dx * rr, oy + dy * rr); g.lineTo(ox + dx * (rr - l), oy + dy * (rr - l)); g.stroke();
          if (a % 10 === 0 && a > 0 && a < 90) g.fillText(String(a), ox + dx * (rr - 34), oy + dy * (rr - 34) + 8);
        }
        // 法线
        g.setLineDash([12, 9]); g.strokeStyle = '#1d2433'; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox, 0); g.stroke(); g.setLineDash([]);
        g.font = 'italic bold 34px "Times New Roman", serif'; g.fillStyle = '#1d2433';
        if (b.side < 0) { g.fillText('E', 30, 40); g.fillText('N', W - 24, 36); }
        else g.fillText('F', W - 30, 40);
        // 笔迹
        for (const tr of traces) {
          const a = (b.side < 0) !== tr.reverse ? tr.i : tr.r;
          const t = a * deg;
          g.strokeStyle = tr.color; g.lineWidth = 4;
          g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + Math.sin(t) * b.side * W * 1.4, oy - Math.cos(t) * W * 1.4); g.stroke();
        }
        b.tex.needsUpdate = true;
      }
    };
    paintBoard();
    const oLabel = tag('<i>O</i>', 'mag'); oLabel.el.style.color = '#1d2433';
    oLabel.loc(group, 0.006, -0.006, 0.01);

    // 激光笔
    const pen = laserPen();
    group.add(pen);
    const rays = new RayView({ width: 2.4, glow: 8 });
    const ghost = new RayView({ width: 1.2, glow: 0 });
    ghost.core.material.opacity = 0.25;
    group.add(rays.group, ghost.group);
    const tI = tag('', 'mag'), tR = tag('', 'mag');
    const arcI = new THREE.Group(), arcR = new THREE.Group();
    group.add(arcI, arcR);

    const S = { i: 40, fold: 0, reverse: false, rows: [] };
    let G = null;

    const layout = () => {
      const i = S.i * deg;
      // 入射光从哪一侧来
      const inSide = S.reverse ? 1 : -1;
      const start = { x: inSide * Math.sin(i) * R, y: Math.cos(i) * R };
      pen.position.set(start.x, start.y, 0.003);
      pen.rotation.z = Math.atan2(-start.y, -start.x);
      const outEnd = { x: -inSide * Math.sin(i) * R * 1.12, y: Math.cos(i) * R * 1.12 };
      F.pivot.rotation.y = -S.fold * deg;
      const folded = S.fold > 2;
      const toW = (x, y) => new THREE.Vector3(x, y, 0.0015);
      // 入射光总在不动的那半张纸上能看到（除非反向时入射在 F 上且 F 折了）
      const incOnPaper = !(S.reverse && folded);
      const outOnPaper = !(!S.reverse && folded);
      const vis = [], faint = [];
      (incOnPaper ? vis : faint).push({ pts: [start, { x: 0, y: 0 }], color: 0xff2a2a });
      (outOnPaper ? vis : faint).push({ pts: [{ x: 0, y: 0 }, outEnd], color: 0xff2a2a });
      rays.set(vis, toW);
      ghost.set(faint, toW);
      // 角度弧
      for (const [grp, side] of [[arcI, inSide], [arcR, -inSide]]) {
        grp.clear();
        const pts = [];
        for (let k = 0; k <= 20; k++) { const t = (i * k) / 20; pts.push(new THREE.Vector3(side * Math.sin(t) * 0.035, Math.cos(t) * 0.035, 0.002)); }
        grp.add(polyline(pts, { color: 0xd4006c, width: 1.6 }));
      }
      arcR.visible = outOnPaper;
      tI.loc(group, inSide * Math.sin(i / 2) * 0.05, Math.cos(i / 2) * 0.05, 0.004).text(`<i>i</i> ${S.i}°`);
      tR.loc(group, -inSide * Math.sin(i / 2) * 0.05, Math.cos(i / 2) * 0.05, 0.004).text(S.rows.includes(S.i) ? `<i>r</i> ${S.i}°` : '<i>r</i> ?').show(outOnPaper);     // 反射角要学生自己从量角器上读
      if (G) {
        G.out.set('i', `${S.i}°`); G.out.set('r', outOnPaper ? `${S.i}°` : '看不到');
        if (folded) G.goal.done('fold');
        G.status(folded ? '把纸板 NOF 向后折了：纸板上<b>看不到</b>反射光。' : S.reverse ? '光沿着原来的反射光方向射入，反射后沿原来的入射光射出。' : '');
      }
    };
    layout();

    const pointer = draggable(group, [
      { obj: pen, plane: 'xy', onDrag: (p) => { const side = S.reverse ? 1 : -1; S.i = Math.round(clamp(Math.atan2(side * p.x, Math.max(0.001, p.y)) / deg, 5, 85)); layout(); G?.sync(); } },
      { obj: F.mesh, plane: 'xz', onDrag: (p) => { S.fold = Math.round(clamp((Math.atan2(-p.z, Math.max(0.005, p.x)) / deg), 0, 80)); layout(); G?.syncFold(); } },
    ]);

    return {
      group,
      size: { w: 0.3, d: 0.18, h: 0.14 },
      view: { elev: 22, azim: 0, lookY: 0.4, margin: 1.12 },
      pointer,
      update() { S.guard?.check();},
      mount(ui) {
        const out = readout([{ key: 'i', label: '入射角 ∠<i>i</i>' }, { key: 'r', label: '反射角 ∠<i>r</i>', secret: true }]);
        const ang = seg('入射角（也可以拖动激光笔）', ['20°', '30°', '40°', '50°', '60°', '70°'], (v) => { S.i = parseInt(v, 10); layout(); }, { value: 2 });
        const fold = seg('纸板 NOF', ['摊平', '向后折 30°', '向后折 60°'], (_, k) => { S.fold = [0, 30, 60][k]; layout(); });
        const dir = seg('入射光', ['从 E 侧射入', '逆着原来的反射光射入'], (_, k) => {
          S.reverse = k === 1; layout();
          if (S.reverse) G.goal.done('reverse');
        });
        const tb = table(['序号', '∠<i>i</i>', '∠<i>r</i>']);
        const btn = buttons([{ text: '描下光路，记录角度', onClick: () => {
          if (S.fold > 2) return ui.status('先把纸板摊平，才能在纸板上描出反射光。');
          if (S.reverse) return ui.status('记录时让光从 E 侧射入。');
          if (S.rows.includes(S.i)) return ui.status('这个角度已经记过了，换一个入射角。');
          // 先让学生读反射角：量角器从法线 ON 量起
          const r = S.i, opts = [...new Set([r, 90 - r, r + 10])].sort(() => Math.random() - 0.5);
          pick.btns.forEach((b, j) => { b.hidden = j >= opts.length; b.textContent = `∠r = ${opts[j]}°`; b.onclick = () => {
            if (opts[j] !== r) return ui.status(opts[j] === 90 - r ? '反射角是反射光和<b>法线 ON</b> 的夹角，不是和镜面的夹角。从 ON 开始数。' : '再看看反射光对着量角器的哪条刻度（从法线 ON 量起）。');
            pick.el.hidden = true;
            S.rows.push(S.i);
            traces.push({ i: S.i, r: S.i, color: PENS[traces.length % PENS.length], reverse: false });
            paintBoard(); layout();
            tb.add([S.rows.length, `${S.i}°`, `${r}°`]);
            out.reveal('r');
            if (S.rows.length >= 3) G.goal.done('rows');
            ui.status(`描下了第 ${S.rows.length} 条光路：∠i = ${S.i}°，∠r = ${r}°。${S.rows.length < 3 ? '换一个入射角再试。' : '比较每一行的 ∠i 和 ∠r。'}`);
          }; });
          pick.el.hidden = false; S.guard?.arm();
          ui.status('从量角器上读出<b>反射角</b> ∠r（反射光和法线 ON 的夹角）：');
        } }]);
        const pick = buttons([0, 1, 2].map(() => ({ text: '', ghost: true, onClick: () => {} })));
        pick.el.hidden = true;
        S.guard = guard(pick.el, () => `${S.i}|${S.fold}|${S.reverse}`, () => { ui.status("入射角或纸板变了，刚才那道读数题作废。"); });     // 条件变了，待答的题作废
        ui.controls.append(ang.el, fold.el, dir.el, out.el, btn.el, pick.el, note('激光笔可以沿量角器拖动；纸板 NOF 也可以直接用鼠标往后扳。'));
        ui.data.append(tb.el);
        G = {
          out, status: (m) => m && ui.status(m),
          goal: goals(ui, [['rows', '用 3 个不同的入射角各描一次光路'], ['fold', '把纸板 NOF 向后折'], ['reverse', '让光逆着反射光射入']]),
          sync: () => ang.set([20, 30, 40, 50, 60, 70].indexOf(S.i)),
          syncFold: () => fold.set(S.fold < 15 ? 0 : S.fold < 45 ? 1 : 2),
        };
        ui.status('注意避免激光射入眼睛。拖动激光笔，看反射光怎么变。');
        layout();
      },
    };
  },
};
