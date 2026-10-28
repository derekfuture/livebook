// 图12.2-2 自制杆秤（跨学科实践）。一根约 40 cm 的筷子：A 槽挂小盆做秤盘，B 槽系提纽，20 g 钩码做秤砣。
//   1 秤盘空着，移动秤砣使秤杆平衡，标出定盘星 O；2 盘里放 100 g 砝码，再平衡，标出 C（100 g）；3 O 到 C 之间均匀画 49 条刻度线，每格 2 g；
//   4 用它称几样东西，和天平称的结果比一比。
// 直接操作：拖秤砣的挂绳沿秤杆移动；点秤杆标记当前秤砣的位置；拖东西放进秤盘。面板也有。
// 物理：以提纽 B 为支点，杠杆平衡 m盘·AB + m物·AB = m杆·(重心到 B) + m砣·(砣到 B)；秤杆转动有阻尼，碰到限位停住。
import * as THREE from 'three';
import { seg, buttons, goals, note, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { canvasTex, hookWeight, stand } from './kit/props.js';
import { paint, inked, hull } from '../live/ink.js';

const LEN = 0.4, AB = 0.04, M_ROD = 10, X_CG = 0.2, M_PAN = 50;      // 秤杆（m）、A 到 B、秤杆质量 g、重心离 A、秤盘 g
const OBJS = [{ name: '100 g 砝码', m: 100 }, { name: '橡皮', m: 24 }, { name: '苹果', m: 152 }, { name: '一包纸巾', m: 66 }];
const TOP = 0.3;

export default {
  id: 'steelyard',
  fig: '图12.2-2',
  title: '制作简易杆秤',
  stampText: '测量',
  predict: {
    q: '杆秤的秤盘里放的东西越重，秤砣要挂得——',
    hint: '课本第 111–112 页',
    options: ['离提纽越远', '离提纽越近', '位置不变'],
    answer: 0,
  },
  conclusion: {
    page: 116, rect: [40, 290, 460, 478],
    quote: '用细线系一个 20 g 的钩码，作为秤砣。调节秤砣的位置使秤杆平衡，这时细线在秤杆上的位置为秤的定盘星 O……在秤盘中放 100 g 砝码，手提提纽，并调节秤砣的位置使秤杆平衡。此时，标记秤砣细线在秤杆上的位置 C，并记为 100 g。在定盘星 O 到 C 之间均匀地画上 49 条刻度线，每一格就表示 2 g。',
    formula: '<i>m</i><sub>物</sub>·<i>l</i><sub>AB</sub> = <i>m</i><sub>砣</sub>·Δ<i>l</i>',
    why: '提纽是支点。秤盘里的东西产生的力矩，由秤砣移动产生的力矩来平衡：东西越重，秤砣要离提纽越远。秤盘和秤杆自身的重已经在定盘星 O 处平衡掉了，所以从 O 开始，秤砣每移动相同的距离，对应的质量增加相同——刻度是均匀的。用更重的秤砣，或者把提纽移得离秤盘更近，就能称更重的东西（量程变大，但同样长的一段秤杆代表的质量更多，称得没有原来精确）。',
    src: '课本第 111–112 页 · 第十二章 第2节 跨学科实践：制作简易杆秤',
  },

  create({ tag, look, back }) {
    const group = new THREE.Group();
    const st = stand({ height: TOP + 0.06, baseW: 0.1, baseD: 0.08 });
    st.position.set(-0.09 - st.rodX, 0, -0.04);
    st.clamp(TOP + 0.05, 0.12).rotation.y = -0.3;
    group.add(st);
    const S = { xw: 0.12, mw: 20, ang: 0, w: 0, onPan: null, O: null, C: null, marks: false, rows: [], drag: null, dragPos: new THREE.Vector3() };
    let W = null;
    const status = (m) => W?.status(m);
    // 秤杆：绕提纽 B 转动；局部 x 从 A（−AB）到 −AB + LEN
    const beam = new THREE.Group(); beam.position.set(0, TOP, 0);
    let scaleTex = null;
    const rodMat = [paint(0xd9b98a), paint(0xd9b98a), null, paint(0xd9b98a), paint(0xd9b98a), paint(0xd9b98a)];
    const drawScale = () => {
      scaleTex = canvasTex(2048, 64, (c, w, h) => {
        c.fillStyle = '#e4c99a'; c.fillRect(0, 0, w, h);
        const px = (x) => ((x + AB) / LEN) * w;
        c.fillStyle = '#23293a';
        if (S.O != null) { c.beginPath(); c.arc(px(S.O), h / 2, 9, 0, 7); c.fill(); }
        if (S.C != null) { c.fillStyle = '#d9483b'; c.beginPath(); c.arc(px(S.C), h / 2, 9, 0, 7); c.fill(); c.fillStyle = '#23293a'; }
        if (S.marks && S.O != null && S.C != null) {
          const step = (S.C - S.O) / 50;
          for (let i = 0; i * step + S.O < LEN - AB; i++) { const x = px(S.O + i * step); c.fillRect(x - 1.5, i % 5 ? h * 0.55 : h * 0.25, 3, h); if (i % 10 === 0) { c.font = 'bold 26px sans-serif'; c.fillText(String(i * 2), x + 4, 26); } }
        }
      });
      rodMat[2] = new THREE.MeshLambertMaterial({ map: scaleTex });
      rod.material = rodMat;
    };
    const rod = inked(new THREE.Mesh(new THREE.BoxGeometry(LEN, 0.008, 0.008), rodMat.map((m) => m || paint(0xd9b98a))), { width: 1.2 });
    rod.position.x = -AB + LEN / 2;
    beam.add(rod);
    drawScale();
    for (const [x, t] of [[-AB, 'A'], [0, 'B']]) tag(t, 'mag').loc(beam, x, 0.012, 0.01);
    group.add(beam);
    // 提纽（挂在铁架台的横杆上）
    const hold = new THREE.Mesh(new THREE.CylinderGeometry(0.0006, 0.0006, 0.04, 4), new THREE.MeshBasicMaterial({ color: 0x444444 })); hold.position.set(0, TOP + 0.024, 0); group.add(hold);
    // 秤盘（挂在 A）
    const pan = new THREE.Group();
    const bowl = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.018, 0.015, 24, 1, true), paint(0xc8cdd4, { side: THREE.DoubleSide })), 0.001); bowl.position.y = 0.0075;
    const bowlB = new THREE.Mesh(new THREE.CircleGeometry(0.018, 24), paint(0xc8cdd4)); bowlB.rotation.x = -Math.PI / 2;
    pan.add(bowl, bowlB); group.add(pan);
    const panStr = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x444444 })); group.add(panStr);
    // 秤砣
    const wt = hookWeight({ r: 0.009, h: 0.016 }); group.add(wt);
    const wStr = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x444444 })); group.add(wStr);
    // 秤砣挂绳在秤杆上套的那个绳圈（从上面看得见，读数就看它对着哪条刻度）
    const wLoop = new THREE.Mesh(new THREE.BoxGeometry(0.0012, 0.0092, 0.0092), new THREE.MeshBasicMaterial({ color: 0x3b2f2a })); beam.add(wLoop);
    const wPick = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.03), new THREE.MeshBasicMaterial({ visible: false })); group.add(wPick);
    // 桌上的东西
    const items = OBJS.map((o, i) => {
      let m;
      if (o.name === '苹果') m = hull(new THREE.Mesh(new THREE.SphereGeometry(0.016, 18, 14), paint(0xd9483b)), 0.001);
      else if (o.name === '橡皮') m = inked(new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.008, 0.015), paint(0xf0f0f0)), { width: 1 });
      else if (o.name === '一包纸巾') m = inked(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.015, 0.025), paint(0x8fc4ea)), { width: 1 });
      else { m = new THREE.Group(); const w = hookWeight({ r: 0.011, h: 0.02 }); w.position.y = 0.026; m.add(w); }
      m.userData.home = new THREE.Vector3(0.05 + i * 0.06, o.name === '苹果' ? 0.016 : 0.008, 0.07);
      m.position.copy(m.userData.home); group.add(m);
      const t = tag(o.name === '100 g 砝码' ? '100 g' : o.name, 'pill').loc(group, m.userData.home.x, 0.0, 0.1);
      return { ...o, mesh: m, tag: t };
    });

    const torque = () => {
      const mObj = S.onPan ? S.onPan.m : 0;
      return (M_PAN + mObj) * AB - M_ROD * (X_CG - AB) - S.mw * S.xw;       // >0：左边（秤盘一侧）下沉
    };
    const balanced = () => Math.abs(torque()) < 0.06 && Math.abs(S.w) < 0.05;
    const reading = () => (S.O != null && S.C != null ? ((S.xw - S.O) / (S.C - S.O)) * 100 : null);

    const markHere = () => {
      if (!balanced()) return status('秤杆还没平衡（还在倾斜或摆动），等它<b>水平静止</b>再标记。');
      if (S.O == null) { if (S.onPan) return status('先把秤盘里的东西拿走：定盘星要在秤盘空着时标。'); S.O = S.xw; drawScale(); W?.goal.done('O'); return status('标出了定盘星 O。现在把 <b>100 g 砝码</b>放进秤盘，再移动秤砣让秤杆平衡。'); }
      if (S.C == null) { if (S.onPan?.m !== 100) return status('标 C 时，秤盘里要放 100 g 的砝码。'); S.C = S.xw; S.calMw = S.mw; (S.Cd ||= {})[S.mw] = S.C - S.O; drawScale(); W?.goal.done('C'); if (S.mw === 50 && S.Cd[20] != null) { W?.askHeavy(); return; } return status('标出了 C（100 g）。点“画刻度线”，在 O、C 之间均匀画上 49 条刻度线。'); }
      status('刻度已经标好了。');
    };
    const drags = [
      { obj: wPick, plane: 'xy', offset: 0, keepOffset: true, hint: '左右拖：移动秤砣', onDrag: (p) => { S.xw = Math.round(clamp(p.x, -0.03, LEN - AB - 0.01) * 1000) / 1000; W?.drop?.(); } },
      ...items.map((it) => ({ obj: it.mesh, plane: 'xy', offset: 0.07, keepOffset: true, hint: S.onPan === it ? '拖出来' : '拖进秤盘', onStart: () => { if (S.onPan === it) S.onPan = null; S.drag = it; S.dragPos.copy(it.mesh.position); W?.drop?.(); }, onDrag: (p) => S.dragPos.set(p.x, p.y, 0.07), onEnd: () => { S.drag = null; if (Math.abs(S.dragPos.x + AB) < 0.06 && !S.onPan) S.onPan = it; } })),
    ];
    const pointer = draggable(group, drags, { tip: tag('', 'pill'), taps: [{ obj: rod, hint: '点一下：在秤砣挂绳处做记号', onTap: markHere }] });

    return {
      group,
      size: { w: 0.48, d: 0.14, h: 0.36 },
      view: { elev: 8, azim: 0, lookY: 0.5, margin: 1.05 },
      pointer,
      mount(ui) {
        const tb = table(['物体', '秤砣/g', '杆秤读数/g', '事先用天平称的/g'], { note: '最后一列是事先用天平称好、写在标签上的质量，用来检验自制杆秤准不准。' });
        const pick = buttons([0, 1, 2].map(() => ({ text: '', ghost: true, onClick: () => {} })));
        pick.el.hidden = true;
        W = { status: (m) => ui.status(m), drop: () => { if (!pick.el.hidden) { pick.el.hidden = true; back(); } } };
        const weigh = () => {
          if (!S.marks) return ui.status('先做好刻度：标 O、标 C、画刻度线。');
          if (S.calMw !== S.mw) return ui.status('秤砣换过了，杆上的刻度是用别的秤砣做的，已经<b>不能用</b>。先重新标 O、C、画刻度。');
          if (!S.onPan) return ui.status('把要称的东西拖进秤盘。');
          if (!balanced()) return ui.status('移动秤砣，让秤杆<b>水平平衡</b>，再读数。');
          const r = Math.round(reading() / 2) * 2;
          // 凑近看秤砣挂绳对着的刻度
          look([S.xw * Math.cos(S.ang), TOP + S.xw * Math.sin(S.ang), 0], [0, 1, 0.55], 0.14, () => back());
          const opts = [...new Set([r, r + 2, r - 10])].sort(() => Math.random() - 0.5);
          pick.btns.forEach((b, j) => { b.hidden = j >= opts.length; if (b.hidden) return; b.textContent = `${opts[j]} g`; b.onclick = () => {
            if (opts[j] !== r) return ui.status('看秤砣挂绳对着哪条刻度：每一小格 2 g，长线是 10 g，数字每 20 g 一个。');
            pick.el.hidden = true; back();
            tb.add([S.onPan.name, String(S.mw), String(r), String(S.onPan.m)]);
            S.rows.push(S.onPan.name);
            if (new Set(S.rows).size >= 2) W.goal.done('weigh');
            ui.status(`杆秤读数 ${r} g，标签上（天平事先称的）是 ${S.onPan.m} g。${Math.abs(r - S.onPan.m) <= 2 ? '差不多一样准。' : '有一点差别——想一想怎样提高精度。'}`);
          }; });
          pick.el.hidden = false;
          ui.status('秤杆平衡了。读秤砣挂绳对着的刻度：');
        };
        const mw = seg('秤砣', ['20 g 钩码', '50 g 钩码'], (_, k) => {
          S.mw = k ? 50 : 20; wt.scale.setScalar(k ? 1.35 : 1); W.drop(); hq.el.hidden = true;
          // 刻度是按某一个秤砣做的：换了秤砣，整套标定都作废，要重新做
          if (S.O != null || S.marks) { S.O = S.C = null; S.marks = false; drawScale(); W.goal.undo('O', 'C', 'marks'); ui.status(`换成了 ${S.mw} g 的秤砣：原来的定盘星和刻度都是用别的秤砣做的，<b>作废了</b>。秤盘空着，重新调平、标 O，再放 100 g 砝码标 C。`); }
        });
        const hq = buttons(['C 离提纽更近', 'C 离提纽更远', '和原来一样'].map((t, j) => ({ text: t, ghost: true, onClick: () => {
          if (j) return ui.status(`看看杆上：用 50 g 秤砣标出的 C，和刚才 20 g 秤砣标出的 C（离提纽约 ${(S.Cd[20] * 100).toFixed(1)} cm）比一比。`);
          hq.el.hidden = true; W.goal.done('heavy');
          ui.status(`对：秤砣重了，平衡 100 g 只要离提纽更近的地方（O 到 C 约 ${(S.Cd[50] * 100).toFixed(1)} cm，原来约 ${(S.Cd[20] * 100).toFixed(1)} cm）。同样长的秤杆，就能称<b>更重</b>的东西——量程变大了；不过 O 到 C 变短，每 2 g 一格的刻度挤得更密，读数没有原来精确。`);
        } })));
        hq.el.hidden = true;
        W.askHeavy = () => { hq.el.hidden = false; ui.status('用 50 g 秤砣标出了 C（100 g）。和刚才用 20 g 秤砣时比，C 离提纽——'); };
        ui.controls.append(note('<b>拖秤砣</b>沿秤杆移动；秤杆水平静止时<b>点秤杆</b>在挂绳处做记号；<b>拖桌上的东西</b>进出秤盘。'), buttons([{ text: '在秤砣处做记号', ghost: true, onClick: markHere }, { text: '画刻度线', ghost: true, onClick: () => { if (S.O == null || S.C == null) return ui.status('先标出 O 和 C。'); S.marks = true; drawScale(); W.goal.done('marks'); ui.status('O 到 C 之间均匀画了 49 条刻度线，每格 2 g。现在称一称桌上的东西。'); } }, { text: '读数并记录…', onClick: weigh }, { text: '重新做刻度', ghost: true, onClick: () => { S.O = S.C = null; S.marks = false; drawScale(); W.drop(); W.goal.undo('O', 'C', 'marks'); } }]).el, pick.el, mw.el, hq.el);
        ui.data.append(tb.el);
        W.goal = goals(ui, [['O', '秤盘空着，平衡后标出定盘星 O'], ['C', '放 100 g 砝码，平衡后标出 C'], ['marks', '在 O、C 之间画刻度'], ['weigh', '称两样东西，和天平事先称的结果比较'], ['heavy', '换一个 50 g 的秤砣重新标定，比较 C 的位置']]);
        ui.status('秤盘空着。<b>拖秤砣</b>左右移动，让秤杆水平平衡，然后<b>点秤杆</b>标出定盘星 O。');
      },
      update(dt) {
        const h = Math.min(dt, 1 / 30);
        const tq = torque();
        const target = clamp(tq * 0.04, -0.25, 0.25);
        S.w += ((target - S.ang) * 30 - S.w * 6) * h; S.ang += S.w * h;
        beam.rotation.z = S.ang;
        const at = (x) => new THREE.Vector3(x * Math.cos(S.ang), TOP + x * Math.sin(S.ang), 0);
        const A = at(-AB); pan.position.set(A.x, A.y - 0.08, 0);
        panStr.geometry.setFromPoints([A, new THREE.Vector3(A.x, A.y - 0.065, 0)]);
        wLoop.position.x = S.xw;
        const Wp = at(S.xw); wt.position.set(Wp.x, Wp.y - 0.05, 0); wPick.position.set(Wp.x, Wp.y - 0.04, 0);
        wStr.geometry.setFromPoints([Wp, new THREE.Vector3(Wp.x, Wp.y - 0.05, 0)]);
        for (const it of items) {
          it.tag.show(S.onPan !== it && S.drag !== it);
          if (S.drag === it) it.mesh.position.copy(S.dragPos);
          else if (S.onPan === it) it.mesh.position.set(pan.position.x, pan.position.y + 0.004 + (it.name === '苹果' ? 0.016 : it.name === '100 g 砝码' ? 0 : 0.006), 0);
          else it.mesh.position.lerp(it.mesh.userData.home, Math.min(1, dt * 8));
        }
      },
      debug: { S, torque },
    };
  },
};
