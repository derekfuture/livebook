// 图6.1-4 托盘天平：放在水平桌面上 → 游码移到零刻度线 → 调平衡螺母使指针指在分度盘中线 → 左物右码 → 加减砝码、移动游码 → 读数。
// 横梁的转动：力矩平衡 + 阻尼，指针摆动后停下来。
import * as THREE from 'three';
import { seg, slider, readout, buttons, goals, note, h, table, guard } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { paint, inked, hull } from '../live/ink.js';
import { draggable, rayToLocal } from './kit/interact.js';

const ARM = 0.09;                                  // 横梁半长
const WEIGHTS = [100, 50, 20, 20, 10, 5];          // 砝码盒（g）
const DIV = 0.2;                                   // 标尺的分度值（g）
const TICK = 0.1;                                  // 分度盘上一小格对应左右两盘相差多少克
const THETA_PER_G = 0.024 / TICK;                  // 相差 1 g，横梁稳定后转多少（弧度），超过就碰到限位
const OBJECTS = [{ name: '橡皮', m: 23.4, color: 0xf6a3a8, size: 0.022 }, { name: '铅笔盒', m: 86.8, color: 0x5b8fd6, size: 0.04 }, { name: '金属块', m: 157.0, color: 0xb8c2cf, size: 0.026 }];

export default {
  id: 'balance',
  fig: '图6.1-4',
  title: '用托盘天平测量物体的质量',
  predict: {
    q: '天平放好后，游码已经移到零刻度线处，可是指针偏向分度盘的<b>右侧</b>（就像现在这样）。<br>该怎样调节平衡螺母？',
    hint: '课本第 143 页「练习与应用」第 3 题',
    options: ['向左调', '向右调', '不用调螺母，往右盘加砝码'],
    answer: 0,
  },

  stampText: '测量',
  conclusion: {
    page: 148, rect: [40, 290, 460, 412],      // 课本第 142 页：托盘天平的使用步骤 2、3
    quote: '把被测物体放在左盘中，在右盘中加减砝码，并调节游码在标尺上的位置，直到横梁恢复水平平衡。这时右盘中砝码的总质量加上游码在标尺上所对应的质量，就等于被测物体的质量。',
    why: '使用前：把天平放在水平台上，把游码移到标尺左端的零刻度线处，调节横梁上的<b>平衡螺母</b>，使指针指在分度盘的中线处。称量时：左物右码，用镊子按从大到小的顺序加减砝码；<b>称量过程中不能再调平衡螺母</b>。物体所含物质的多少叫作质量，质量不随物体的形状、状态、位置而改变。',
    src: '课本第 140–142 页 · 第六章 第1节 质量',
  },

  create({ tag, look, back }) {
    const group = new THREE.Group();
    // 底座
    const base = inked(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.016, 0.07), paint(0x9aa3b2)));
    base.position.y = 0.008;
    const post = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.009, 0.08, 14), paint(0x8f99a8)), 0.0015);
    post.position.y = 0.056;
    group.add(base, post);
    // 分度盘
    const dialTex = canvasTex(256, 128, (g, W, H) => {
      g.fillStyle = '#f6f4ec'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#1d2433'; g.lineWidth = 3;
      const step = (0.065 * 0.024 / 0.05) * W;        // 指针长 6.5 cm，一格 = 相差 0.1 g 时指针尖移动的距离
      for (let i = -15; i <= 15; i++) { const x = W / 2 + i * step; g.lineWidth = i === 0 ? 4 : i % 5 === 0 ? 3 : 2; g.beginPath(); g.moveTo(x, 10); g.lineTo(x, i === 0 ? 76 : i % 5 === 0 ? 58 : 40); g.stroke(); }
    });
    const dial = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.025), new THREE.MeshBasicMaterial({ map: dialTex }));
    dial.position.set(0, 0.03, 0.036);
    group.add(dial);
    // 横梁（可转动）
    const beam = new THREE.Group();
    beam.position.set(0, 0.1, 0);
    group.add(beam);
    const bar = inked(new THREE.Mesh(new THREE.BoxGeometry(ARM * 2, 0.008, 0.012), paint(0xc8ced8)));
    beam.add(bar);
    // 标尺（游码在上面滑）。刻度、游码步进、游码读数端共用同一套几何：
    //   标尺长 RULER_L，0 g 刻度在 x0，5 g 刻度在 x0 + SPAN；每 0.2 g 一条小刻线；读游码的【左端】。
    const RULER_L = 0.1, MARGIN = 0.005, SPAN = RULER_L - 2 * MARGIN, X0 = -RULER_L / 2 + MARGIN, RIDER_W = 0.004;
    const gToX = (g) => X0 + (g / 5) * SPAN;
    const scaleTex = canvasTex(2048, 180, (g, W, H) => {
      g.fillStyle = '#f6f4ec'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#1d2433'; g.fillStyle = '#1d2433'; g.font = 'bold 64px sans-serif'; g.textAlign = 'center';
      const px = (gr) => ((gToX(gr) + RULER_L / 2) / RULER_L) * W;
      for (let i = 0; i <= 25; i++) {
        const gr = i * DIV, x = px(gr), major = i % 5 === 0;
        g.lineWidth = major ? 6 : 3.5;
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, major ? 78 : 46); g.stroke();
        if (major) g.fillText(String(gr), x, 150);
      }
      g.font = 'bold 44px sans-serif'; g.textAlign = 'right'; g.fillText('g', W - 8, 150);
    });
    const ruler = new THREE.Mesh(new THREE.PlaneGeometry(RULER_L, 0.009), new THREE.MeshBasicMaterial({ map: scaleTex }));
    ruler.position.set(0, -0.012, 0.0062);
    const rulerBack = inked(new THREE.Mesh(new THREE.BoxGeometry(RULER_L + 0.004, 0.011, 0.002), paint(0xe9e6dc)));
    rulerBack.position.set(0, -0.012, 0.005);
    beam.add(rulerBack, ruler);
    // 游码：一个骑在标尺上的小方框，左边缘有一道红线（读数就读这条线对着的刻度）
    const rider = new THREE.Group();
    const riderBox = inked(new THREE.Mesh(new THREE.BoxGeometry(RIDER_W, 0.013, 0.006), paint(0x3b4150)));
    riderBox.position.x = RIDER_W / 2;
    const riderEdge = new THREE.Mesh(new THREE.BoxGeometry(0.0005, 0.013, 0.0005), new THREE.MeshBasicMaterial({ color: 0xd4006c }));
    riderEdge.position.set(0, 0, 0.0034);
    rider.add(riderBox, riderEdge);
    rider.position.set(gToX(0), -0.012, 0.007);
    beam.add(rider);
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.0016, 0.065, 0.001), new THREE.MeshBasicMaterial({ color: 0x1d2433 }));
    needle.geometry.translate(0, -0.0325, 0);
    needle.position.set(0, 0, 0.037);
    beam.add(needle);
    const nuts = [];
    for (const s of [-1, 1]) { const n = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.008, 10), paint(0xc9a347)), 0.001); n.rotation.z = Math.PI / 2; n.position.x = s * (ARM + 0.006); beam.add(n); nuts.push(n); }
    // 两个托盘（挂在横梁两端，始终保持水平）
    const pans = [-1, 1].map((s) => {
      const g = new THREE.Group();
      const pan = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.004, 32), paint(0xd5d9de)), 0.0012);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.05, 8), paint(0x9aa3b2));
      stem.position.y = -0.026;
      g.add(pan, stem);
      group.add(g);
      g.side = s;
      return g;
    });
    const content = [new THREE.Group(), new THREE.Group()];
    pans.forEach((p, i) => p.add(content[i]));
    // 砝码盒
    const box = inked(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.012, 0.05), paint(0x9a6a3a)));
    box.position.set(0.19, 0.006, 0.02);
    group.add(box);
    const tN = tag('', 'pill');

    const S = { nut: 0.6, rider: 0, obj: -1, onRight: [], angle: 0.1, w: 0, stage: 'setup', calibrated: false, nutAfterLoad: false, rows: [] };
    let G = null;

    const leftMass = () => (S.obj >= 0 ? OBJECTS[S.obj].m : 0);
    const rightMass = () => S.onRight.reduce((a, b) => a + b, 0);
    // 力矩：左盘 m_L·ARM，右盘 m_R·ARM + 游码 rider·ARM（游码读数 rider 克等效到右盘）+ 平衡螺母偏差
    // 左盘比右盘重多少克（平衡螺母偏离中间时相当于给某一边加了一点，最多 ±2 g）
    const imbal = () => leftMass() - rightMass() - S.rider - S.nut * 2;

    const rebuildContent = () => {
      content[0].clear(); content[1].clear(); syncBox?.();
      if (S.obj >= 0) {
        const o = OBJECTS[S.obj];
        const m = inked(new THREE.Mesh(new THREE.BoxGeometry(o.size * 1.4, o.size * 0.7, o.size), paint(o.color)));
        m.position.y = 0.002 + o.size * 0.35;
        content[0].add(m);
      }
      S.onRight.forEach((w, i) => {
        const r = 0.006 + Math.cbrt(w) * 0.0022, hh = r * 1.4;
        const c = hull(new THREE.Mesh(new THREE.CylinderGeometry(r, r, hh, 20), paint(0xc9a347)), 0.0012);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(r * 0.35, 10, 8), paint(0xc9a347));
        knob.position.y = hh / 2 + r * 0.2;
        c.add(knob);
        c.position.set(-0.018 + (i % 3) * 0.018, 0.002 + hh / 2 + Math.floor(i / 3) * (hh + 0.004), -0.008 + (i % 2) * 0.012);
        c.userData.w = w; c.userData.i = i;
        content[1].add(c);
      });
    };

    // 指针偏向重的一边（课本：指针偏右，说明右边重，平衡螺母向左调）
    const pointerDir = () => (S.angle > 0.012 ? '偏左' : S.angle < -0.012 ? '偏右' : '指在中线');
    const settled = () => Math.abs(S.w) < 0.01;

    // 直接拖游码：在横梁的局部坐标里取 x，按分度值吸附
    let onRider = null;
    // ---- 直接动手的器材：桌上的被测物体、砝码盒里的砝码、横梁两端的平衡螺母 ----
    const A = {};          // 动作（面板按钮和器材共用）：mount 里填上要说话的部分
    const objMeshes = OBJECTS.map((o, k) => {
      const m = inked(new THREE.Mesh(new THREE.BoxGeometry(o.size * 1.4, o.size * 0.7, o.size), paint(o.color)));
      m.userData.home = new THREE.Vector3(-0.14 + k * 0.055, o.size * 0.35, 0.075);
      m.position.copy(m.userData.home); group.add(m);
      m.userData.tag = tag(o.name, 'pill').loc(group, m.userData.home.x, 0, 0.1);
      return m;
    });
    const boxW = WEIGHTS.map((w, i) => {
      const r = 0.006 + Math.cbrt(w) * 0.0022, hh = r * 1.4;
      const c = hull(new THREE.Mesh(new THREE.CylinderGeometry(r, r, hh, 20), paint(0xc9a347)), 0.0012);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(r * 0.35, 10, 8), paint(0xc9a347)); knob.position.y = hh / 2 + r * 0.2; c.add(knob);
      c.position.set(0.163 + (i % 3) * 0.027, 0.012 + hh / 2, 0.008 + Math.floor(i / 3) * 0.024);
      c.userData.w = w; group.add(c);
      return c;
    });
    tag('砝码盒', 'pill').loc(group, 0.19, 0, 0.05);
    const syncBox = () => {
      // 盘里有几个这种质量的砝码，盒里就少几个
      const used = {};
      for (const w of S.onRight) used[w] = (used[w] || 0) + 1;
      boxW.forEach((c) => { const w = c.userData.w; c.visible = !(used[w] > 0 && used[w]-- > 0); });
      objMeshes.forEach((m, k) => { m.visible = S.obj !== k; m.userData.tag.show(m.visible); });
    };
    let nut0 = null;
    const beamPtr = draggable(beam, [
      { obj: rider, plane: 'xy', offset: 0.007, hint: '左右拖游码', onDrag: (p) => {
        const g = Math.round(Math.max(0, Math.min(5, ((p.x - X0) / SPAN) * 5)) / DIV) * DIV;
        if (g !== S.rider) { S.rider = +g.toFixed(1); onRider?.(S.rider); }
      } },
      ...nuts.map((n) => ({ obj: n, plane: 'xy', offset: 0, hint: '左右拖：旋动平衡螺母', onStart: (p) => { nut0 = p ? { x: p.x, v: S.nut } : null; }, onDrag: (p) => { if (nut0) A.nut?.(Math.round(Math.max(-1, Math.min(1, nut0.v + (p.x - nut0.x) / 0.1)) * 20) / 20); } })),     // 拧一下走 0.05（一小格的一半）
    ], { tip: tag('', 'pill') });
    const pickIn = (ray, objs) => { const hit = ray.intersectObjects(objs.filter((o) => o.visible), true)[0]; if (!hit) return null; for (let o = hit.object; o; o = o.parent) if (objs.includes(o)) return o; return null; };
    const tablePtr = draggable(group, [], { tip: tag('', 'pill'), taps: [
      ...objMeshes.map((m, k) => ({ obj: m, hint: '点一下：放到左盘上', onTap: () => A.putObj?.(k) })),
      ...boxW.map((c) => ({ obj: c, hint: `点一下：用镊子把 ${c.userData.w} g 砝码夹到右盘`, onTap: () => A.addW?.(c.userData.w) })),
      { obj: content[1], hint: '点一下：用镊子把这个砝码夹回盒里', onTap: (ray) => { const c = pickIn(ray, content[1].children); if (c) A.removeW?.(c.userData.i); } },
      { obj: content[0], hint: '点一下：把物体拿下来', onTap: () => A.takeObj?.() },
    ] });
    const pointer = {
      down: (r, e) => beamPtr.down(r, e) || tablePtr.down(r, e),
      move: (r, e) => beamPtr.move(r, e) || tablePtr.move(r, e),
      up: (r, e) => beamPtr.up(r, e) || tablePtr.up(r, e),
      items: () => [...beamPtr.items(), ...tablePtr.items()],
    };

    return {
      group,
      pointer,
      size: { w: 0.32, d: 0.16, h: 0.14 },
      view: { elev: 14, azim: -10, lookY: 0.45, margin: 1.06 },
      mount(ui) {
        const out = readout([{ key: 'p', label: '指针' }, { key: 'm', label: '砝码 + 游码', unit: 'g', secret: '自己数砝码、读游码' }]);
        A.nut = (v, fromSlider) => { S.nut = Math.round(v * 100) / 100; if (!fromSlider) nut.set(Math.round(S.nut * 100)); if (S.obj >= 0 || S.onRight.length) { S.nutAfterLoad = true; ui.status('<b>称量过程中不能调节平衡螺母！</b>只能加减砝码、移动游码。'); } };
        const nut = slider('平衡螺母（也可以直接拖横梁两端的螺母）', { min: -100, max: 100, value: 60, fmt: (v) => (v > 0 ? `向右 ${v}` : v < 0 ? `向左 ${-v}` : '中间'), onInput: (v) => A.nut(v / 100, true) });
        const rid = slider(`游码（分度值 ${DIV} g，读游码左端；也可以直接拖游码）`, { min: 0, max: 5, step: DIV, value: 0, fmt: (v) => (v ? '已移动' : '零刻度'), onInput: (v) => { S.rider = Math.round(v / DIV) * DIV; } });
        onRider = (g) => rid.set(g);
        let near = false;
        // 窄屏（手机）看不全整条标尺：镜头对准游码附近
        const peek = buttons([{ text: '凑近看标尺', ghost: true, onClick: () => {
          near = !near;
          if (near) { look([innerWidth < 760 ? gToX(Math.min(4, Math.max(1, S.rider))) : 0, 0.088, 0.01], [0, 0.15, 1], 0.12, () => { near = false; peek.btns[0].textContent = '凑近看标尺'; back(); }); peek.btns[0].textContent = '↩ 看整台天平'; ui.status('读游码<b>左端</b>（红线）对着的刻度。每一小格是 0.2 g。'); }
          else { back(); peek.btns[0].textContent = '凑近看标尺'; }
        } }]);
        A.putObj = (k) => {
          if (!S.calibrated) { ui.status('先把游码移到零刻度线处，调节平衡螺母，让指针指在分度盘中线。'); objSel.set(-1); return; }
          if (S.obj >= 0 && S.obj !== k) return ui.status('左盘里已经有东西了。先点它拿下来（或点“拿下物体和砝码，重新调平衡”）。');
          S.obj = k; objSel.set(k); rebuildContent(); ui.status(`左盘放上了${OBJECTS[k].name}。用镊子从砝码盒里<b>按从大到小</b>的顺序往右盘加砝码（点盒里的砝码）。`);
        };
        A.takeObj = () => { if (S.obj < 0) return; if (S.onRight.length) return ui.status('先把右盘的砝码夹回盒里。'); S.obj = -1; objSel.set(-1); rebuildContent(); };
        A.addW = (w) => { if (S.obj < 0) return ui.status('先在左盘放被测物体（点桌上的东西）。'); if (S.onRight.filter((x) => x === w).length >= WEIGHTS.filter((x) => x === w).length) return ui.status(`${w} g 的砝码已经用完了。`); S.onRight.push(w); rebuildContent(); };
        A.removeW = (i) => { S.onRight.splice(i, 1); rebuildContent(); };
        const objSel = seg('左盘放被测物体（也可以点桌上的东西）', OBJECTS.map((o) => o.name), (_, k) => A.putObj(k));
        objSel.set(-1);
        const wBtns = WEIGHTS.map((w) => h('button', { onclick: () => A.addW(w) }, `+${w} g`));
        const clear = buttons([{ text: '取下最后放的砝码', ghost: true, onClick: () => { S.onRight.pop(); rebuildContent(); } }]);
        const tb = table(['物体', '砝码/g', '游码/g', '质量/g']);
        const rec = buttons([{ text: '读数并记录', onClick: () => {
          if (S.obj < 0) return;
          if (!settled()) return ui.status('横梁还在摆动，等指针停下来再读。');
          if (S.nutAfterLoad) return ui.status('刚才在称量中调了平衡螺母，结果不准。拿下物体和砝码，重新调平衡后再称。');
          if (Math.abs(imbal()) > TICK / 2 + 1e-9) return ui.status(`指针${pointerDir()}，横梁还没有平衡：${imbal() > 0 ? '右盘轻了，加砝码或把游码往右移' : '右盘重了，减砝码或把游码往左移'}。`);
          const m = rightMass() + S.rider;
          const o = OBJECTS[S.obj];
          // 学生自己读：砝码的总质量 + 游码左端对着的刻度
          if (!S.answered) {
            const opts = [...new Set([m, rightMass() + S.rider + 0.2, rightMass() + (5 - S.rider), rightMass()].map((x) => +x.toFixed(1)))].slice(0, 3).sort(() => Math.random() - 0.5);
            pick.btns.forEach((b, j) => { b.hidden = j >= opts.length; if (b.hidden) return; b.textContent = `${opts[j].toFixed(1)} g`; b.onclick = () => {
              if (opts[j] !== +m.toFixed(1)) return ui.status(opts[j] === +rightMass().toFixed(1) ? '别忘了加上游码的读数。' : '游码读它的<b>左端</b>对着的刻度（每小格 0.2 g），再加上右盘所有砝码的质量。可以“凑近看标尺”。');
              pick.el.hidden = true; S.answered = true; out.reveal('m'); rec.btns[0].click(); S.answered = false;
            }; });
            pick.el.hidden = false; S.guard?.arm();
            return ui.status('数一数右盘里的砝码，再读游码：<b>物体的质量是多少？</b>');
          }
          const old = S.rows.findIndex((r) => r.name === o.name);
          const row = { name: o.name, w: rightMass(), r: S.rider, m };
          if (old >= 0) S.rows[old] = row; else S.rows.push(row);
          tb.clear();
          for (const r of S.rows) tb.add([r.name, r.w, r.r.toFixed(1), r.m.toFixed(1)]);
          ui.status(`${o.name}的质量 = ${rightMass()} g + ${S.rider.toFixed(1)} g = <b>${m.toFixed(1)} g</b>。${old >= 0 ? '（重新称过，已更正）' : ''}`);
          if (S.rows.length >= 2) G.goal.done('two');
        } }, { text: '拿下物体和砝码，重新调平衡', ghost: true, onClick: () => { S.obj = -1; S.onRight = []; S.nutAfterLoad = false; S.calibrated = false; S.stage = 'setup'; rebuildContent(); objSel.set(-1); rid.set(0, true); ui.status('游码归零，调节平衡螺母使横梁平衡。'); } }]);
        const pick = buttons([0, 1, 2].map(() => ({ text: '', ghost: true, onClick: () => {} })));
        pick.el.hidden = true;
        S.guard = guard(pick.el, () => `${S.obj}|${S.onRight.join()}|${S.rider}|${S.nut}`, () => { ui.status("盘里的东西、砝码或游码变了，刚才那道读数题作废。平衡后再读。"); });     // 条件变了，待答的题作废
        ui.controls.append(h('div', { class: 'bar-title' }, '① 调节天平'), rid.el, peek.el, nut.el,
          h('div', { class: 'bar-title' }, '② 称量'), objSel.el, h('div', { class: 'ctl-label' }, '右盘加砝码（从大到小；也可以直接点砝码盒里的砝码）'), h('div', { class: 'seg', style: 'margin-bottom:8px' }, wBtns), clear.el, out.el, rec.el, pick.el);
        ui.data.append(tb.el);
        G = { out, ui, goal: goals(ui, [['cal', '游码归零，调平衡螺母使横梁平衡'], ['two', '称出两个物体的质量']]) };
        this._G = G;
        ui.status('天平的横梁不平衡：指针偏向一侧。先调节天平。');
      },
      debug: { S },
      update(dt) { S.guard?.check();
        // 横梁转动：I·α = τ − mg·d·sinθ（横梁重心略低于支点，自己会回到平衡）− c·ω
        const target = Math.max(-0.2, Math.min(0.2, imbal() * THETA_PER_G));
        S.w += (-(S.angle - target) * 16 - S.w * 2.6) * dt;
        S.angle += S.w * dt;
        if (Math.abs(S.angle) > 0.2) { S.angle = Math.sign(S.angle) * 0.2; S.w = 0; }   // 碰到限位
        beam.rotation.z = S.angle;
        needle.rotation.z = -2 * S.angle;     // 指针偏向重的一边
        for (const p of pans) {
          const x = p.side * ARM * Math.cos(S.angle), y = 0.1 + p.side * ARM * Math.sin(S.angle);
          p.position.set(x, y + 0.05 - 0.07, 0);
        }
        rider.position.x = gToX(S.rider);     // 游码左端对准读数
        nuts.forEach((n) => (n.position.x = n.position.x > 0 ? ARM + 0.006 + S.nut * 0.004 : -(ARM + 0.006) + S.nut * 0.004));
        tN.loc(group, 0, 0.06, 0.05).text(`指针${pointerDir()}`);
        const G = this._G;
        if (!G) return;
        G.out.set('p', pointerDir());
        G.out.set('m', rightMass() + S.rider, 1);
        if (!S.calibrated && S.obj < 0 && !S.onRight.length && S.rider === 0 && Math.abs(imbal()) <= TICK / 2 && settled()) {
          S.calibrated = true; G.goal.done('cal'); G.ui.status('横梁平衡了，指针指在分度盘的中线处。现在在左盘放上要称的物体。');
        }
      },
    };
  },
};
