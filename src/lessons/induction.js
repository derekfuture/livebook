// 图20.6-2 / 20.6-3 探究导体在磁场中运动时产生感应电流的条件。
// 蹄形磁体（上 N 下 S，磁感线竖直向下），一根导线 ab 水平穿过两极之间，两端用导线接到灵敏电流计，组成闭合电路。
// 直接操作：拖导线 ab（在竖直平面里：可以上下动、前后动）；拖磁体前后移动（导线不动、磁体动）；点电流计旁的接线柱拆掉 / 接上一根导线。
// 面板：换强一点的磁体、让导线“沿自身方向左右移动”、断开电路。
// 物理：感应电流 I ∝ B·L·v⊥（v⊥ 是垂直于磁感线、垂直于导线的速度分量），只有闭合电路才有电流；电流计零点在中间，左右偏表示方向。
import * as THREE from 'three';
import { seg, buttons, goals, note } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { canvasTex } from './kit/props.js';
import { paint, inked, hull } from '../live/ink.js';

const GAP_Y0 = 0.02, GAP_Y1 = 0.065;      // 两磁极之间的高度范围
const MZ0 = -0.02, MD = 0.07;             // 磁体（两臂）在 z 方向的中心和深度

export default {
  id: 'induction',
  fig: '图20.6-2',
  title: '电磁感应',
  stampText: '探究',
  predict: {
    q: '导线 ab 放在蹄形磁体两极之间（磁感线竖直方向）。让导线<b>上下</b>运动（顺着磁感线），电流计的指针——',
    hint: '课本第 168 页「实验」',
    options: ['偏转', '不偏转', '上下运动时偏、静止时也偏'],
    answer: 1,
  },
  conclusion: {
    page: 174, rect: [180, 300, 460, 410],
    quote: '闭合电路的一部分导体在磁场中做切割磁感线运动时，导体中就产生电流。这种由于导体在磁场中运动而产生电流的现象叫作电磁感应，产生的电流叫作感应电流。',
    why: '导线静止、或顺着磁感线上下运动、或沿着自己的方向移动时，都没有“切割”磁感线，没有感应电流。导线前后运动（垂直于磁感线）就切割磁感线，电流计指针偏转；运动方向反过来，指针偏转方向也反过来；动得越快、磁体越强，电流越大。导线不动、磁体动，也一样会切割磁感线。电路断开时，即使切割磁感线也没有电流。发电机就是根据这个原理做成的。',
    src: '课本第 167–168 页 · 第二十章 第6节 磁生电',
  },

  create({ tag }) {
    const group = new THREE.Group();
    const S = { strong: false, closed: true, wy: 0.042, wz: 0.0, mz: 0, vw: new THREE.Vector3(), I: 0, ang: 0, w: 0, seen: new Set(), last: null, slideT: 0, slideV: 0, quietT: 0 };
    let W = null;
    const status = (m) => W?.status(m);
    // ---- 蹄形磁体：开口朝 +x，上臂 N、下臂 S ----
    const shoe = new THREE.Group();
    const armT = inked(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, MD), paint(0xd9483b)), { width: 1.2 }); armT.position.set(0, GAP_Y1 + 0.006, 0);
    const armB = inked(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, MD), paint(0x2f6fd0)), { width: 1.2 }); armB.position.set(0, GAP_Y0 - 0.006, 0);
    const back = inked(new THREE.Mesh(new THREE.BoxGeometry(0.014, GAP_Y1 - GAP_Y0 + 0.024, MD), paint(0x8f99a8)), { width: 1.2 }); back.position.set(-0.057, (GAP_Y0 + GAP_Y1) / 2, 0);
    shoe.add(armT, armB, back);
    shoe.position.z = MZ0;
    group.add(shoe);
    const tN = tag('N', 'mag big'), tS = tag('S', 'mag big');
    // 磁感线（竖直的细线，示意）
    const fieldG = new THREE.Group();
    for (let i = 0; i < 5; i++) for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.0004, 0.0004, GAP_Y1 - GAP_Y0, 4), new THREE.MeshBasicMaterial({ color: 0x5b6272, transparent: true, opacity: 0.5 })); l.position.set(-0.04 + i * 0.02, (GAP_Y0 + GAP_Y1) / 2, -0.024 + k * 0.024); fieldG.add(l); }
    shoe.add(fieldG);
    // ---- 导线 ab（沿 x），两根竖杆模拟课本里用手拿着的支架 ----
    const wireG = new THREE.Group();
    const ab = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.18, 10), paint(0xc8743a)), 0.0008);
    ab.rotation.z = Math.PI / 2;
    const pick = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.026, 0.026), new THREE.MeshBasicMaterial({ visible: false }));
    wireG.add(ab, pick);
    // 导线右端的两个双向小箭头：竖的是“上下”（顺着磁感线），横的是“前后”（切割磁感线）
    const arrows = new THREE.Group();
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x6b7385, transparent: true, opacity: 0.75 });
    for (const axis of ['y', 'z']) {
      const a = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0008, 0.0008, 0.03, 6), arrowMat);
      a.add(shaft);
      for (const sgn of [1, -1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.0028, 0.007, 10), arrowMat); c.position.y = sgn * 0.017; if (sgn < 0) c.rotation.z = Math.PI; a.add(c); }
      if (axis === 'z') a.rotation.x = Math.PI / 2;
      arrows.add(a);
    }
    arrows.position.set(0.075, 0, 0);
    wireG.add(arrows);
    group.add(wireG);
    const tA = tag('<i>a</i>', 'mag'), tB = tag('<i>b</i>', 'mag');
    // ---- 灵敏电流计（零点在中间） ----
    const G = new THREE.Group(); G.position.set(0.06, 0, -0.13); G.rotation.y = 1.0;
    const box = inked(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.03), paint(0xb07a45)), { width: 1.2 }); box.position.y = 0.035;
    const dialTex = canvasTex(512, 300, (c, w, h) => {
      c.fillStyle = '#fbfbf7'; c.fillRect(0, 0, w, h); c.strokeStyle = '#1d2433'; c.fillStyle = '#1d2433'; c.lineWidth = 4;
      const cx = w / 2, cy = h * 0.95, R = h * 0.8;
      c.beginPath(); c.arc(cx, cy, R, -Math.PI / 2 - 0.7, -Math.PI / 2 + 0.7); c.stroke();
      for (let i = -10; i <= 10; i++) { const a = -Math.PI / 2 + (i / 10) * 0.7, r0 = R - (i % 5 === 0 ? 30 : 16); c.lineWidth = i % 5 === 0 ? 5 : 3; c.beginPath(); c.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); c.lineTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.stroke(); }
      c.font = 'bold 40px sans-serif'; c.textAlign = 'center'; c.fillText('0', cx, cy - R - 12); c.fillText('G', cx, cy - R * 0.4);
    });
    const dial = new THREE.Mesh(new THREE.PlaneGeometry(0.056, 0.033), new THREE.MeshBasicMaterial({ map: dialTex })); dial.position.set(0, 0.048, 0.0155);
    const pivot = new THREE.Group(); pivot.position.set(0, 0.048 - 0.033 / 2 + 0.001, 0.0162);
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.0007, 0.027, 0.0004), new THREE.MeshBasicMaterial({ color: 0xd23b2b })); needle.position.y = 0.0135; pivot.add(needle);
    const posts = [-1, 1].map((s) => { const p = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.008, 10), paint(s > 0 ? 0xc0392b : 0x23293a)), 0.0008); p.position.set(s * 0.018, 0.004, 0.02); G.add(p); return p; });
    G.add(box, dial, pivot);
    group.add(G);
    tag('灵敏电流计', 'pill').loc(group, 0.08, 0.005, -0.1);
    // 两根连接导线（随导线 ab 一起动）
    const leads = [new THREE.Mesh(new THREE.BufferGeometry(), paint(0x8a2b2b)), new THREE.Mesh(new THREE.BufferGeometry(), paint(0x8a2b2b))];
    leads.forEach((m) => group.add(m));
    const layout = () => {
      wireG.position.set(0, S.wy, S.wz);
      shoe.position.z = MZ0 + S.mz;
      const ends = [new THREE.Vector3(-0.09, S.wy, S.wz), new THREE.Vector3(0.09, S.wy, S.wz)];
      G.updateMatrixWorld(); const tgt = posts.map((pp) => group.worldToLocal(pp.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(0, 0.004, 0)));
      leads.forEach((m, i) => {
        m.visible = i === 1 || S.closed;
        const a = ends[i], b = tgt[i];
        const pts = i === 0 ? [a, a.clone().add(new THREE.Vector3(-0.02, -0.02, -0.02)), new THREE.Vector3(-0.1, 0.003, -0.12), new THREE.Vector3(0.0, 0.003, -0.16), b] : [a, a.clone().add(new THREE.Vector3(0.02, -0.01, -0.02)), new THREE.Vector3(0.1, 0.003, -0.08), b];
        m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.0012, 5, false);
      });
      tA.loc(group, -0.1, S.wy + 0.01, S.wz); tB.loc(group, 0.1, S.wy + 0.01, S.wz);
      tN.loc(group, 0.04, GAP_Y1 + 0.02, MZ0 + S.mz); tS.loc(group, 0.04, GAP_Y0 - 0.025, MZ0 + S.mz + MD / 2);
    };
    layout();

    let last = null;
    const pointer = draggable(group, [
      { obj: pick, plane: 'yz', offset: 0, keepOffset: true, hint: () => '拖导线：竖着拖是上下动，横着拖是前后动',
        // 一次拖动只沿一个方向（先动得多的那个方向），这样“上下”和“前后”分得清
        onStart: (p) => { S.lock = null; S.p0 = p ? p.clone() : null; S.w0 = [S.wy, S.wz]; },
        onDrag: (p) => {
          if (!S.p0) return;
          const dy = p.y - S.p0.y, dz = p.z - S.p0.z;
          if (!S.lock && Math.hypot(dy, dz) > 0.004) S.lock = Math.abs(dy) > Math.abs(dz) ? 'y' : 'z';
          if (S.lock === 'y') S.wy = clamp(S.w0[0] + dy, GAP_Y0 + 0.004, GAP_Y1 + 0.04);
          if (S.lock === 'z') S.wz = clamp(S.w0[1] + dz, -0.1, 0.08);
        } },
      { obj: back, anchor: shoe, plane: 'xz', offset: 0, keepOffset: true, hint: '前后拖磁体：让磁体动、导线不动', onDrag: (p) => { S.mz = clamp(p.z - MZ0, -0.06, 0.06); } },     // 抓磁体的弯头（两臂中间是导线，不和导线抢）
    ], { tip: tag('', 'pill'), taps: [{ obj: posts[0], hint: () => (S.closed ? '点一下：拆掉这根导线（电路断开）' : '点一下：接上（电路闭合）'), onTap: () => { S.closed = !S.closed; W?.sync(); status(S.closed ? '接上了：导线 ab 和电流计组成闭合电路。' : '拆掉了一根导线：电路断开了。'); } }] });

    return {
      group,
      size: { w: 0.32, d: 0.2, h: 0.09 },
      view: { elev: 16, azim: 62, lookY: 0.4, margin: 1.05 },
      pointer,
      mount(ui) {
        const mag = seg('磁体', ['普通磁体', '强磁体'], (_, k) => { S.strong = !!k; });
        const circ = seg('电路', ['闭合', '断开（拆掉一根线）'], (_, k) => { S.closed = !k; });
        const btns = buttons([{ text: '让导线沿自身方向（左右）移动', ghost: true, onClick: () => { S.slideT = 1.2; } }, { text: '导线放回两极中间', ghost: true, onClick: () => { S.wy = 0.042; S.wz = 0; S.mz = 0; } }]);
        ui.controls.append(note('<b>拖导线 ab</b>：可以上下动（顺着磁感线），也可以前后动（垂直于磁感线）；<b>拖磁体</b>前后移动；<b>点电流计左边的接线柱</b>拆 / 接导线。'), mag.el, circ.el, btns.el);
        W = { status: (m) => ui.status(m), sync: () => circ.set(S.closed ? 0 : 1), goal: goals(ui, [['still', '导线静止，看指针'], ['along', '导线上下运动（顺着磁感线）'], ['slide', '导线沿自身方向（左右）移动'], ['cut', '导线前后运动（切割磁感线）'], ['back', '反方向切割，看指针偏向'], ['magnet', '导线不动，让磁体前后动'], ['open', '电路断开时切割磁感线']]) };
        ui.status('导线 ab 静止在两极之间——看电流计的指针。然后<b>拖动导线</b>。');
        setTimeout(() => { if (Math.abs(S.ang) < 0.01) W.goal.done('still'); }, 1500);
      },
      update(dt) {
        const h = Math.max(1e-3, Math.min(dt, 1 / 30));
        // 导线相对磁体的速度
        const pos = new THREE.Vector3(S.slideT > 0 ? Math.sin((1.2 - S.slideT) * 6) * 0.02 : 0, S.wy, S.wz - S.mz);
        S.slideT = Math.max(0, S.slideT - dt);
        if (!last) last = pos.clone();
        const v = pos.clone().sub(last).divideScalar(h); last.copy(pos);
        S.vw.lerp(v, 0.5);
        // 导线在磁场里吗（两极之间，z 在磁体范围内）
        const inField = S.wy > GAP_Y0 && S.wy < GAP_Y1 && Math.abs(S.wz - (MZ0 + S.mz)) < MD / 2 + 0.003;
        const B = (S.strong ? 2.2 : 1) * (inField ? 1 : 0);
        const emf = B * S.vw.z;                      // 只有垂直于 B（y）和导线（x）的速度分量 vz 才切割磁感线
        S.I = S.closed ? emf : 0;
        const target = clamp(S.I * 6, -0.7, 0.7);
        S.w += ((target - S.ang) * 300 - S.w * 22) * h; S.ang += S.w * h;
        pivot.rotation.z = -S.ang;
        if (pointer) layout();
        if (!W) return;
        const moving = S.vw.length() > 0.01, defl = Math.abs(S.ang) > 0.06;
        if (Math.abs(S.vw.y) > 0.03 && Math.abs(S.vw.z) < 0.008 && inField && S.closed) { S.seen.add('along'); W.goal.done('along'); if (S.last !== 'along') { S.last = 'along'; status('导线顺着磁感线上下运动：指针<b>不偏转</b>——没有切割磁感线。'); } }
        if (S.slideT > 0 && inField && S.closed) { W.goal.done('slide'); if (S.last !== 'slide') { S.last = 'slide'; status('导线沿着自身的方向移动：也没有切割磁感线，指针不偏转。'); } }
        if (defl && S.closed) {
          const dir = Math.sign(S.ang);
          if (Math.abs(S.mz - (S.mzLast ?? S.mz)) > 1e-4 && Math.abs(S.wz - (S.wzLast ?? S.wz)) < 1e-5) { W.goal.done('magnet'); if (S.last !== 'magnet') { S.last = 'magnet'; status('导线不动、磁体动，导线同样<b>切割磁感线</b>，指针偏转。'); } }
          else if (S.last !== `cut${dir}`) {
            if (S.seen.has(`cut${-dir}`)) W.goal.done('back');
            S.seen.add(`cut${dir}`); W.goal.done('cut'); S.last = `cut${dir}`;
            status(`导线前后运动，<b>切割磁感线</b>：指针向${dir > 0 ? '右' : '左'}偏转——电路中产生了感应电流。${S.seen.has(`cut${-dir}`) ? '运动方向反过来，电流方向也反过来。' : '再反方向动一动。'}`);
          }
        }
        if (!S.closed && Math.abs(emf) > 0.03 && inField) { W.goal.done('open'); if (S.last !== 'open') { S.last = 'open'; status('电路断开时，导线切割磁感线，指针也<b>不偏转</b>——要有感应电流，电路必须是闭合的。'); } }
        if (!moving) { S.quietT += dt; if (S.quietT > 0.6 && S.last && S.last.startsWith('cut')) S.last = null; } else S.quietT = 0;
        S.mzLast = S.mz; S.wzLast = S.wz;
      },
      debug: { S },
    };
  },
};
