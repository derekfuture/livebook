// 图18.4-2 / 18.4-3 电热与电阻、电流的关系。两个透明容器里密封着等量的空气，各有一段电阻丝；每个容器连一个 U 形管，
// U 形管中液面高度差反映密闭空气温度的变化（也就是电阻丝产生的热量多少）。
//   甲（图18.4-2）：5 Ω 和 10 Ω 串联——电流相同，比较电阻；
//   乙（图18.4-3）：两个容器里都是 5 Ω，右边容器外再并联一段 5 Ω——电阻相同，比较电流。
// 点开关通电（场景里点开关，或面板按钮），通电时间一样时比较两个 U 形管。点右边容器外那段电阻丝可以接上 / 拆掉它。
// 模型：电源 6 V；空气升温使 U 形管高度差 Δh ∝ Q = I²Rt（再减去一点向外散热）。示意数值。
import * as THREE from 'three';
import { seg, buttons, goals, note, table, readout } from './kit/ui.js';
import { draggable } from './kit/interact.js';
import { canvasTex } from './kit/props.js';
import { battery, switchPart } from './kit/circuit.js';
import { paint, inked, hull, glassEdge } from '../live/ink.js';

const E = 6, K_H = 1.4e-3, COOL = 0.004;      // 电源电压；每焦耳热量使高度差增加（米）；散热
const CX = 0.11, CY = 0.03, UH = 0.17;         // 两个容器的 x 位置；容器高度一半；U 形管顶高

export default {
  id: 'joule',
  fig: '图18.4-2',
  title: '电流的热效应与焦耳定律',
  stampText: '探究',
  predict: {
    q: '5 Ω 和 10 Ω 的电阻丝串联，通过它们的电流相同。通电一段时间后，<br>哪边容器里的空气温度升得多（U 形管液面高度差大）？',
    hint: '课本第 120 页「演示」',
    options: ['5 Ω 那边', '10 Ω 那边', '一样多'],
    answer: 1,
  },
  conclusion: {
    crops: [{ page: 127, rect: [62, 50, 362, 120] }, { page: 127, rect: [62, 425, 362, 512] }, { page: 127, rect: [62, 566, 362, 668] }],
    quote: '在电流相同、通电时间相同的情况下，一段电阻丝的电阻越大，这段电阻丝产生的热量越多。在电阻相同、通电时间相同的情况下，通过一段电阻丝的电流越大，这段电阻丝产生的热量越多。……电流通过导体产生的热量跟电流的二次方成正比，跟导体的电阻成正比，跟通电时间成正比。',
    formula: '<i>Q</i> = <i>I</i><sup>2</sup><i>Rt</i>',
    why: '密闭容器里的空气受热膨胀，把 U 形管里的液面压下去，另一边升起来——高度差越大，电阻丝产生的热量越多（这是“转换法”）。甲：两段电阻丝串联，电流相同，10 Ω 那段产生的热量约是 5 Ω 的 2 倍。乙：右边容器外并联了一段 5 Ω，干路电流在这里分成两半，容器里的电阻丝电流只有左边的一半，产生的热量约只有左边的 1/4——热量跟电流的二次方成正比。这就是电炉丝热得发红而导线几乎不发热的原因：导线的电阻很小。',
    src: '课本第 120–121 页 · 第十八章 第4节 焦耳定律',
  },

  create({ tag }) {
    const group = new THREE.Group();
    const S = { mode: 'R', on: false, t: 0, dh: [0, 0], ext: true, rows: [], seen: new Set() };
    let W = null;

    // ---- 两个容器（透明盒 + 盒里的电阻丝螺旋） ----
    const boxes = [-1, 1].map((sx) => {
      const g = new THREE.Group();
      g.position.set(sx * CX, 0, 0);
      const box = glassEdge(new THREE.Mesh(new THREE.BoxGeometry(0.06, CY * 2, 0.05), paint(0xdbeaf3, { unique: true, transparent: true, opacity: 0.35, depthWrite: false })));
      box.position.y = CY;
      const lid = inked(new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.005, 0.054), paint(0x8f99a8)), { width: 1 });
      lid.position.y = CY * 2 + 0.0025;
      const pts = [];
      for (let i = 0; i <= 200; i++) { const a = (i / 200) * Math.PI * 2 * 9; pts.push(new THREE.Vector3(Math.cos(a) * 0.012, CY + 0.008 + Math.sin(a) * 0.012, -0.012 + (i / 200) * 0.024)); }
      const coilMat = new THREE.MeshBasicMaterial({ color: 0x8a6d4a });
      const coil = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 300, 0.0008, 5, false), coilMat);
      // 两个接线柱
      for (const dx of [-0.018, 0.018]) { const p = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.008, 10), paint(0xc0392b)), 0.0008); p.position.set(dx, CY * 2 + 0.009, 0.01); g.add(p); }
      // 空气受热“发热”的淡红色
      const warm = new THREE.Mesh(new THREE.BoxGeometry(0.056, CY * 2 - 0.004, 0.046), new THREE.MeshBasicMaterial({ color: 0xff7a4a, transparent: true, opacity: 0, depthWrite: false }));
      warm.position.y = CY;
      g.add(box, lid, coil, warm);
      group.add(g);
      return { g, coilMat, warm, label: tag('', 'pill') };
    });
    // ---- 两个 U 形管（中间），刻度板 ----
    const uts = [-1, 1].map((sx) => {
      const g = new THREE.Group();
      g.position.set(sx * 0.03, 0, 0);
      const W2 = 0.014, bot = 0.03, r = 0.0032;
      const path = new THREE.CurvePath();
      path.add(new THREE.LineCurve3(new THREE.Vector3(-W2, UH, 0), new THREE.Vector3(-W2, bot, 0)));
      path.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(-W2, bot, 0), new THREE.Vector3(0, bot - W2 * 1.4, 0), new THREE.Vector3(W2, bot, 0)));
      path.add(new THREE.LineCurve3(new THREE.Vector3(W2, bot, 0), new THREE.Vector3(W2, UH, 0)));
      g.add(new THREE.Mesh(new THREE.TubeGeometry(path, 60, r, 8, false), paint(0xd6ecf5, { unique: true, transparent: true, opacity: 0.35, depthWrite: false })));
      const liq = paint(0x3d8fd6);
      const bend = new THREE.Mesh(new THREE.TubeGeometry(path.curves[1], 20, r * 0.75, 6, false), liq);
      const cols = [-W2, W2].map((x) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.75, r * 0.75, 1, 10), liq); m.geometry.translate(0, 0.5, 0); m.position.set(x, bot, 0); g.add(m); return m; });
      // 刻度板：中间，每 1 cm 一格
      const tex = canvasTex(64, 512, (c, w, h) => { c.fillStyle = '#f6c443'; c.fillRect(0, 0, w, h); c.fillStyle = '#2f6fd0'; for (let i = 0; i < 16; i++) if (i % 2) c.fillRect(0, (i / 16) * h, w, h / 16); });
      const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.008, 0.16), new THREE.MeshBasicMaterial({ map: tex }));
      sc.position.set(0, 0.1, 0.001);     // 刻度板的中线对着液面原来的高度
      g.add(bend, sc);
      group.add(g);
      // 连到容器的细管
      const link = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(sx * (0.03 + W2), UH, 0), new THREE.Vector3(sx * (0.03 + W2 + 0.006), UH + 0.012, 0), new THREE.Vector3(sx * (CX - 0.012), UH + 0.012, 0), new THREE.Vector3(sx * (CX - 0.012), CY * 2 + 0.005, 0)]), 30, 0.0025, 6, false), paint(0xd6ecf5, { unique: true, transparent: true, opacity: 0.5 }));
      group.add(link);
      return { cols, bot, W2 };
    });
    // ---- 电源、开关、导线；乙图时右边容器外并联的那段电阻丝 ----
    const bat = battery('E', { cells: 4 });
    bat.group.position.set(-0.05, 0, 0.1); bat.group.scale.setScalar(0.8);
    const sw = switchPart('S');
    sw.group.position.set(0.08, 0, 0.09);
    group.add(bat.group, sw.group);
    const swTag = tag('开关', 'pill'); swTag.loc(group, 0.08, 0.005, 0.115);
    const ext = new THREE.Group();
    const extPts = []; for (let i = 0; i <= 120; i++) { const a = (i / 120) * Math.PI * 2 * 6; extPts.push(new THREE.Vector3(-0.012 + (i / 120) * 0.024, Math.cos(a) * 0.008, Math.sin(a) * 0.008)); }
    const extCoil = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(extPts), 200, 0.0008, 5, false), new THREE.MeshBasicMaterial({ color: 0x8a6d4a }));
    const extPick = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.03), new THREE.MeshBasicMaterial({ visible: false }));
    ext.add(extCoil, extPick);
    ext.position.set(CX + 0.005, CY * 2 + 0.045, 0.01);
    group.add(ext);
    const extTag = tag('', 'pill');
    const wireMat = paint(0xe08a3c);
    let wires = [];
    const wire = (pts) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 40, 0.0014, 6, false), wireMat); group.add(m); wires.push(m); };
    const buildWires = () => {
      wires.forEach((m) => { group.remove(m); m.geometry.dispose(); }); wires = [];
      const top = CY * 2 + 0.013;
      wire([[-0.05 - 0.04, 0.016, 0.1], [-0.15, 0.03, 0.06], [-CX - 0.018, top + 0.01, 0.01], [-CX - 0.018, top, 0.01]]);       // 电源 − → 左容器左端
      wire([[-CX + 0.018, top, 0.01], [-0.04, top + 0.03, 0.02], [CX - 0.018, top + 0.03, 0.02], [CX - 0.018, top, 0.01]]);           // 左容器 → 右容器
      wire([[CX + 0.018, top, 0.01], [0.15, 0.03, 0.06], [0.08 + 0.022, 0.02, 0.09]]);                                                   // 右容器 → 开关
      wire([[0.08 - 0.022, 0.02, 0.09], [0.02, 0.02, 0.1], [-0.05 + 0.03, 0.016, 0.1]]);                                                 // 开关 → 电源 +
      if (S.mode === 'I' && S.ext) {
        wire([[CX - 0.018, top, 0.01], [CX - 0.02, top + 0.03, 0.01], [CX - 0.007, CY * 2 + 0.045, 0.01]]);
        wire([[CX + 0.018, top, 0.01], [CX + 0.02, top + 0.03, 0.01], [CX + 0.017, CY * 2 + 0.045, 0.01]]);
      }
      ext.visible = S.mode === 'I';
    };
    // 当前每段电阻丝的电阻和电流
    const parts = () => {
      if (S.mode === 'R') { const I = E / 15; return [{ R: 5, I }, { R: 10, I }]; }
      const Rr = S.ext ? 2.5 : 5, I = E / (5 + Rr);
      return [{ R: 5, I }, { R: 5, I: S.ext ? I / 2 : I }];
    };
    const reset = () => { S.t = 0; S.dh = [0, 0]; S.on = false; sw.closed = false; };
    const setMode = (m) => { S.mode = m; reset(); S.drop?.(); buildWires(); };
    buildWires();

    const toggle = () => {
      sw.closed = !sw.closed; S.on = sw.closed;
      if (S.on) S.drop?.();
      W?.status(S.on ? '通电了。两段电阻丝里的电流在发热——看两个 U 形管的液面。' : `断开了开关。通电 ${S.t.toFixed(0)} s。比较两个 U 形管液面的高度差。`);
    };
    const pointer = draggable(group, [], {
      tip: tag('', 'pill'),
      taps: [
        { obj: sw.group, hint: () => (sw.closed ? '点一下：断开开关' : '点一下：闭合开关，通电'), onTap: toggle },
        { obj: extPick, hint: () => (S.ext ? '点一下：拆掉外面这段电阻丝' : '点一下：把这段电阻丝并联上'), enabled: () => S.mode === 'I', onTap: () => { if (S.mode !== 'I') return; S.ext = !S.ext; reset(); S.drop?.(); buildWires(); W?.status(S.ext ? '右边容器外又并联上了一段 5 Ω 电阻丝。电路变了，等容器冷却后重新通电。' : '拆掉了外面那段电阻丝：现在两段 5 Ω 是串联的，电流相同。电路变了，重新通电比较。'); } },
      ],
    });

    return {
      group,
      size: { w: 0.36, d: 0.16, h: 0.2 },
      view: { elev: 16, azim: 0, lookY: 0.45, margin: 1.1 },
      pointer,
      mount(ui) {
        const out = readout([{ key: 't', label: '通电时间', unit: 's' }]);
        const mode = seg('装置', ['甲：5 Ω 和 10 Ω 串联', '乙：5 Ω 和 5 Ω，右边外面并联 5 Ω'], (_, k) => { setMode(k ? 'I' : 'R'); ui.status(k ? '乙：两个容器里都是 5 Ω。右边容器外并联了一段 5 Ω。闭合开关，通电一段时间。' : '甲：5 Ω 和 10 Ω 串联。闭合开关，通电一段时间。'); });
        const tb = table(['装置', '电阻丝', '电流', '通电时间/s', 'U 形管高度差/cm']);
        const choices = buttons([0, 1, 2].map((j) => ({ text: '', ghost: true, onClick: () => answer(j) })));
        choices.el.hidden = true;
        let cur = null;
        const ask = () => {
          if (S.on) return ui.status('先断开开关，再读两个 U 形管的高度差。');
          if (S.t < 5) return ui.status('通电时间太短了，液面变化还不明显。闭合开关，多通一会儿电。');
          const [a, b] = S.dh.map((x) => Math.round(x * 100));
          const opts = [[a, b], [b, a], [a, a]].map((x) => x.join(' / '));
          const right = opts[0];
          const sh = [...new Set(opts)].sort(() => Math.random() - 0.5);
          const p = parts();
          cur = { right, sh, a, b, t: S.t, p, mode: S.mode, ext: S.ext, lab: S.mode === 'R' ? '甲' : S.ext ? '乙' : '乙（拆掉外面的）' };
          choices.btns.forEach((x, j) => { x.hidden = j >= sh.length; x.textContent = `左 / 右 = ${sh[j]} cm`; });
          choices.el.hidden = false;
          ui.status('数一数两个 U 形管的液面高度差（刻度板每格 1 cm）：');
        };
        const answer = (j) => {
          if (!cur) return;
          if (cur.concl) return concl(j);
          if (cur.sh[j] !== cur.right) return ui.status('再看看：左右两个 U 形管哪个液面差得多？');
          const { p, lab, mode, ext } = cur;
          tb.add([lab, `${p[0].R} Ω / ${p[1].R} Ω`, mode === 'R' ? '相同' : ext ? '左大，右是左的一半' : '相同', cur.t.toFixed(0), `${cur.a} / ${cur.b}`]);
          if (mode === 'I' && !ext) { choices.el.hidden = true; cur = null; return ui.status('两段 5 Ω 串联，电流相同，两边高度差差不多。'); }
          // 再让学生自己说出这一组说明了什么
          cur.concl = mode === 'R'
            ? { opts: ['电阻越大，产生的热量越多', '电阻越小，产生的热量越多', '产生的热量跟电阻无关'], q: '电流、通电时间都相同。这组数据说明：' }
            : { opts: ['电流越大，产生的热量越多', '电流越小，产生的热量越多', '产生的热量跟电流无关'], q: '电阻、通电时间都相同，左边电流大。这组数据说明：' };
          cur.concl.sh = [0, 1, 2].sort(() => Math.random() - 0.5);
          choices.btns.forEach((x, k) => { x.hidden = false; x.textContent = cur.concl.opts[cur.concl.sh[k]]; });
          ui.status(cur.concl.q);
        };
        const concl = (j) => {
          if (cur.concl.sh[j] !== 0) return ui.status(cur.mode === 'R' ? '看表格：电流相同时，哪段电阻丝那边的高度差大？它的电阻大还是小？' : '看表格：电阻相同时，电流大的左边高度差大还是小？');
          choices.el.hidden = true;
          S.seen.add(cur.mode === 'R' ? 'R' : 'I');
          if (S.seen.has('R')) W.goal.done('R');
          if (S.seen.has('I')) W.goal.done('I');
          ui.status(cur.mode === 'R' ? `对。10 Ω 那边的高度差约是 5 Ω 的 ${(cur.b / Math.max(1, cur.a)).toFixed(1)} 倍——电流相同时，电阻越大，产生的热量越多。` : `对。右边电流只有左边的一半，高度差只有左边的约 ${(cur.b / Math.max(1, cur.a)).toFixed(2)}——不是 1/2，而是约 1/4：热量跟电流的二次方有关。`);
          cur = null;
        };
        S.drop = () => { if (cur) { cur = null; choices.el.hidden = true; } };
        ui.controls.append(mode.el, buttons([{ text: '开关', ghost: true, onClick: toggle }, { text: '读数记录…', onClick: ask }, { text: '重来', ghost: true, onClick: () => { reset(); S.drop(); } }]).el, choices.el, out.el, note('可以直接<b>点场景里的开关</b>通电、断电；乙图里<b>点右边容器外那段电阻丝</b>能拆掉或接上它。'));
        ui.data.append(tb.el);
        W = { out, status: (m) => ui.status(m), goal: goals(ui, [['R', '甲：电流相同，比较 5 Ω 和 10 Ω'], ['I', '乙：电阻相同，比较不同的电流']]) };
        ui.status('甲：5 Ω 和 10 Ω 的电阻丝串联。<b>点开关</b>通电，过一会儿看两个 U 形管。');
      },
      update(dt) {
        sw.update?.(dt);
        const p = parts();
        S.on = sw.closed;
        if (S.on) S.t += dt * 1.5;          // 时间加快一点
        p.forEach((x, i) => {
          const P = S.on ? x.I * x.I * x.R : 0;
          S.dh[i] = Math.max(0, S.dh[i] + (P * K_H - S.dh[i] * COOL) * dt * 1.5);
          S.dh[i] = Math.min(0.12, S.dh[i]);
          const u = uts[i];
          // 连着容器的那根管（左边 U 形管是左侧那根，右边的是右侧那根）液面被压下去，另一根升起来
          const pressed = u.cols[i === 0 ? 0 : 1], other = u.cols[i === 0 ? 1 : 0];
          pressed.scale.y = 0.1 - u.bot - S.dh[i] / 2; other.scale.y = 0.1 - u.bot + S.dh[i] / 2;
          const b = boxes[i];
          b.coilMat.color.setRGB(0.54 + Math.min(0.46, P * 0.12), 0.43 - Math.min(0.2, P * 0.05), 0.29 - Math.min(0.2, P * 0.05));
          b.warm.material.opacity = Math.min(0.25, S.dh[i] * 2.5);
          b.label.loc(group, (i ? 1 : -1) * CX, CY * 0.6, 0.03).text(`${x.R} Ω`);
        });
        extTag.loc(group, CX + 0.005, CY * 2 + 0.065, 0.01).text(S.mode === 'I' ? (S.ext ? '外面并联的 5 Ω' : '（拆掉了）') : '');
        extCoil.visible = S.mode === 'I' && S.ext;
        W?.out.set('t', S.t, 0);
      },
      debug: { S, toggle },
    };
  },
};
