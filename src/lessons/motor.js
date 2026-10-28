// 图20.4-2 磁场中的导体棒 / 图20.4-3 通电线圈不能连续转动 / 图20.4-4 换向器。
// 场景一：蹄形磁体（上 N 下 S，或者调换）中间两根平行导轨，导轨上放一根导体棒 ab。闭合开关，棒受力沿导轨滚动。
//   直接操作：点开关；点电源对调正负极（电流反向）；点磁体把上下磁极调换；拖导体棒放回中间。
// 场景二：线圈 abcd 放在 N、S 两极之间。没有换向器时，线圈转过平衡位置后受力阻碍它，来回摆几下停在平衡位置；
//   装上换向器（每转过平衡位置就改变线圈中电流的方向），线圈就能连续转动——这就是直流电动机。
//   直接操作：拖线圈转到某个位置再松手；点开关；面板选“有/没有换向器”。
// 物理：F = BIL（示意数值）；线圈力矩 τ = NBIA·cosθ（θ 是线圈平面与磁场的夹角），加转动阻尼和一点摩擦。
import * as THREE from 'three';
import { seg, buttons, goals, note, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { battery, switchPart } from './kit/circuit.js';
import { paint, inked, hull, arrow, MAGENTA } from '../live/ink.js';

export default {
  id: 'motor',
  fig: '图20.4-3',
  title: '磁场对通电导线的作用 · 电动机',
  stampText: '探究',
  predict: {
    q: '导体棒放在蹄形磁体的磁场里，通电后向外滚。<br><b>同时</b>把电流方向和磁场方向都反过来，导体棒会——',
    hint: '课本第 162 页',
    options: ['向里滚', '还是向外滚', '不动'],
    answer: 1,
  },
  conclusion: {
    crops: [{ page: 168, rect: [160, 50, 460, 145] }, { page: 168, rect: [160, 592, 460, 664] }, { page: 169, rect: [60, 44, 360, 70] }],
    quote: '通电导线在磁场中要受到力的作用，力的方向跟电流的方向、磁场的方向都有关系，当电流的方向或者磁场的方向变得相反时，通电导线受力的方向也变得相反。……线圈不能连续转动，是因为线圈越过了平衡位置以后，受到的力阻碍它的转动。如果在线圈越过了平衡位置后，设法改变线圈中电流的方向，线圈将会继续转动。',
    why: '只改变电流方向，或只改变磁场方向，导体棒受力方向都反过来；两个都改变，受力方向不变。线圈的两条边电流方向相反，受力方向也相反，于是线圈转动；转到线圈平面和磁场垂直（平衡位置）时，两边的力在一条直线上，不再使它转。没有换向器，它越过平衡位置后受力反过来把它拉回去。换向器在线圈刚转过平衡位置时自动改变线圈中的电流方向，力的作用就一直使它朝同一个方向转——电动机就是这样把电能转化为机械能的。',
    src: '课本第 161–163 页 · 第二十章 第4节 电动机',
  },

  create({ tag, look, back: goBack, reframe }) {
    const group = new THREE.Group();
    const S = { scene: 'rod', on: false, Iflip: 1, Bflip: 1, rodZ: -0.03, rodV: 0, th: 0.35, w: 0, comm: false, seen: new Set(), turned: 0, swings: 0, lastSign: 0 };
    let W = null;
    const status = (m) => W?.status(m);
    const bat = battery('E', { cells: 2 }); bat.group.scale.setScalar(0.75);
    const sw = switchPart('S');
    group.add(bat.group, sw.group);
    bat.group.position.set(0.08, 0, 0.11); sw.group.position.set(-0.06, 0, 0.11);

    // ================= 场景一：导体棒 =================
    const rodG = new THREE.Group();
    const base = inked(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.006, 0.12), paint(0x9aa3b2)), { width: 1.2 }); base.position.y = 0.003;
    // 蹄形磁体：开口朝 +z，上臂、下臂在导轨上下
    const shoe = new THREE.Group();
    const armMat = { top: paint(0xd9483b, { unique: true }), bot: paint(0x2f6fd0, { unique: true }) };
    const armT = inked(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.07), armMat.top), { width: 1.2 }); armT.position.set(0, 0.062, -0.03);
    const armB = inked(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.07), armMat.bot), { width: 1.2 }); armB.position.set(0, 0.012, -0.03);
    const back = inked(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.062, 0.014), paint(0x8f99a8)), { width: 1.2 }); back.position.set(0, 0.037, -0.072);
    shoe.add(armT, armB, back);
    const tTop = tag('N', 'mag big'), tBot = tag('S', 'mag big');
    // 导轨（沿 z）和导体棒（沿 x）
    for (const sx of [-1, 1]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.16, 8), paint(0xc8cdd4)); r.rotation.x = Math.PI / 2; r.position.set(sx * 0.03, 0.022, 0.01); rodG.add(r); }
    const rod = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.075, 14), paint(0xc9a347)), 0.001);
    rod.rotation.z = Math.PI / 2;
    const fArrow = arrow(MAGENTA, 0.002);
    rodG.add(base, shoe, rod, fArrow);
    group.add(rodG);
    const tAB = [tag('<i>a</i>', 'mag'), tag('<i>b</i>', 'mag')];

    // ================= 场景二：线圈 =================
    const coilG = new THREE.Group();
    const poleN = inked(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.07, 0.06), paint(0xd9483b)), { width: 1.2 }); poleN.position.set(0.07, 0.045, 0);
    const poleS = inked(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.07, 0.06), paint(0x2f6fd0)), { width: 1.2 }); poleS.position.set(-0.07, 0.045, 0);
    const coil = new THREE.Group(); coil.position.set(0, 0.045, 0);
    const wm = paint(0x3b4150), wm2 = paint(0xc8cdd4);
    const side = (len, mat, x, y, z, rx, rz) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, len, 8), mat); m.position.set(x, y, z); m.rotation.set(rx || 0, 0, rz || 0); coil.add(m); return m; };
    // 线圈在 xz 平面里（θ = 0 时水平），转轴沿 z
    side(0.05, wm, -0.035, 0, 0, Math.PI / 2);        // ab 边（深色）
    side(0.05, wm2, 0.035, 0, 0, Math.PI / 2);        // cd 边（浅色）
    side(0.07, wm, 0, 0, -0.025, 0, Math.PI / 2); side(0.07, wm2, 0, 0, 0.025, 0, Math.PI / 2);
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.12, 6), paint(0x8f99a8)); axle.rotation.x = Math.PI / 2; axle.position.set(0, 0.045, 0.02);
    // 换向器：两个半环
    const comm = new THREE.Group(); comm.position.set(0, 0.045, 0.055);
    for (const s of [0, 1]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.008, 16, 1, true, s * Math.PI + 0.15, Math.PI - 0.3), paint(s ? 0xe0b552 : 0x9a6a30, { side: THREE.DoubleSide })); h.rotation.x = Math.PI / 2; comm.add(h); }
    // 两个电刷：左右两边各一块，压在换向器上；换向器转过去，接触的半环就换了
    const brushes = [-1, 1].map((sx) => { const b = inked(new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.005, 0.006), paint(0x3b4150)), { width: 1 }); b.position.set(sx * 0.0085, 0.045, 0.055); return b; });
    const commPick = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.022, 0.022), new THREE.MeshBasicMaterial({ visible: false }));
    const fArrows = [arrow(MAGENTA, 0.0018), arrow(MAGENTA, 0.0018)];
    coilG.add(poleN, poleS, coil, axle, comm, ...brushes, commPick, ...fArrows);
    const tComm = tag('', 'pill');
    // 换向器装上：套在转轴前端；拆下：放在桌上
    const placeComm = () => {
      if (S.comm) { comm.position.set(0, 0.045, 0.055); comm.rotation.set(0, 0, S.th); }
      else { comm.position.set(0.045, 0.006, 0.07); comm.rotation.set(Math.PI / 2, 0, 0); }
      brushes.forEach((b) => (b.visible = S.comm));
      commPick.position.copy(comm.position);
      tComm.loc(group, comm.position.x, comm.position.y + 0.018, comm.position.z).text(S.comm || S.scene !== 'coil' ? '' : '换向器');
    };
    group.add(coilG);
    const tNS = [tag('N', 'mag big'), tag('S', 'mag big')];
    const coilPick = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.07), new THREE.MeshBasicMaterial({ visible: false }));
    coilPick.position.set(0, 0.045, 0); coilG.add(coilPick);

    const wires = [];
    const wireMat = paint(0xe08a3c);
    const wire = (pts) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 30, 0.0013, 6, false), wireMat); group.add(m); wires.push(m); };
    const buildWires = () => {
      wires.forEach((m) => { group.remove(m); m.geometry.dispose(); }); wires.length = 0;
      if (S.scene === 'rod') { wire([[-0.03, 0.022, 0.09], [-0.05, 0.02, 0.1], [-0.06 - 0.022, 0.02, 0.11]]); wire([[0.03, 0.022, 0.09], [0.05, 0.02, 0.1], [0.08 + 0.03, 0.015, 0.11]]); }
      else if (S.comm) { wire([[-0.011, 0.045, 0.056], [-0.03, 0.02, 0.08], [-0.06 - 0.022, 0.02, 0.11]]); wire([[0.011, 0.045, 0.056], [0.03, 0.02, 0.08], [0.08 + 0.03, 0.015, 0.11]]); }
      else { wire([[-0.002, 0.045, 0.08], [-0.03, 0.02, 0.09], [-0.06 - 0.022, 0.02, 0.11]]); wire([[0.002, 0.045, 0.08], [0.03, 0.02, 0.09], [0.08 + 0.03, 0.015, 0.11]]); }
      wire([[-0.06 + 0.022, 0.02, 0.11], [0.0, 0.02, 0.13], [0.08 - 0.03, 0.015, 0.11]]);
    };
    const setScene = (k) => { if (S.scene !== k) reframe?.(); S.scene = k; rodG.visible = k === 'rod'; coilG.visible = k === 'coil'; sw.closed = false; S.on = false; buildWires(); placeComm?.(); };
    const setComm = (on) => { S.comm = on; S.swings = 0; S.turned = 0; placeComm(); buildWires(); W?.syncComm(); status(on ? '把换向器套在了转轴上，两个电刷压着它。每当线圈转过平衡位置，电刷就换接到另一个半环上——线圈中的电流方向改变了。闭合开关看看。' : '拆下了换向器：线圈两端直接接电源。'); };
    setScene('rod');

    const toggle = () => { sw.closed = !sw.closed; S.on = sw.closed; if (S.on) status(S.scene === 'rod' ? '通电了：导体棒受到力的作用，沿导轨滚动起来。' : '通电了，看线圈怎样转。'); };
    const flipI = () => { W?.dropDir?.(); S.Iflip *= -1; bat.group.rotation.y = S.Iflip > 0 ? 0 : Math.PI; status('电源正负极对调了：导体棒中的电流方向反过来。'); S.dirty = true; };
    const flipB = () => { W?.dropDir?.(); S.Bflip *= -1; armT.material = S.Bflip > 0 ? armMat.top : armMat.bot; armB.material = S.Bflip > 0 ? armMat.bot : armMat.top; status('蹄形磁体的上下磁极调换了：磁场方向反过来。'); S.dirty = true; };
    let th0 = null;
    const pointer = draggable(group, [
      { obj: rod, plane: 'xz', offset: 0.022, keepOffset: true, hint: '拖导体棒，放回导轨中间', enabled: () => S.scene === 'rod', onDrag: (p) => { S.rodZ = clamp(p.z - 0.01, -0.07, 0.07); S.rodV = 0; } },
      { obj: coilPick, plane: 'xy', offset: 0, hint: '上下拖：把线圈转到某个位置', enabled: () => S.scene === 'coil', onStart: (p) => { th0 = p ? { y: p.y, th: S.th } : null; S.w = 0; S.hold = true; }, onDrag: (p) => { if (th0) S.th = th0.th + (p.y - th0.y) * 25; S.w = 0; }, onEnd: () => { S.hold = false; S.swings = 0; } },
    ], { tip: tag('', 'pill'), taps: [
      { obj: sw.group, hint: () => (sw.closed ? '点一下：断开' : '点一下：闭合开关'), onTap: toggle },
      { obj: bat.group, hint: '点一下：电源正负极对调', onTap: flipI },
      { obj: shoe, hint: '点一下：上下磁极调换', enabled: () => S.scene === 'rod', onTap: flipB },
      { obj: commPick, hint: () => (S.comm ? '点一下：拆下换向器' : '点一下：把换向器装到转轴上'), enabled: () => S.scene === 'coil', onTap: () => S.scene === 'coil' && setComm(!S.comm) },
    ] });

    return {
      group,
      size: { w: 0.26, d: 0.26, h: 0.08 },
      view: { elev: 22, azim: -25, lookY: 0.35, margin: 1.05 },
      pointer,
      mount(ui) {
        const sc = seg('做哪个', ['① 磁场中的导体棒', '② 通电线圈'], (_, k) => { setScene(k ? 'coil' : 'rod'); status(k ? '线圈放在 N、S 两极之间。先<b>拖线圈</b>转到某个位置，再闭合开关。' : '导体棒 ab 放在蹄形磁体的磁场里。<b>点开关</b>通电。'); });
        const cm = seg('换向器', ['没有（直接接电源）', '装上换向器'], (_, k) => setComm(!!k));
        const btns = buttons([{ text: '开关', ghost: true, onClick: toggle }, { text: '电流反向', ghost: true, onClick: flipI }, { text: '磁极调换', ghost: true, onClick: flipB }, { text: '导体棒放回中间', ghost: true, onClick: () => { S.rodZ = -0.03; S.rodV = 0; } }, { text: '凑近看换向器', ghost: true, onClick: () => { if (S.scene !== 'coil') return status('先选“② 通电线圈”。'); if (!S.comm) return status('换向器还在桌上，先点它装到转轴上。'); look([0, 0.05, 0.055], [0.15, 0.35, 1], 0.07, () => goBack()); status('两个半环跟着线圈一起转，两个电刷不动。看：线圈每转过平衡位置，左边的电刷就从一个半环换到另一个半环上。点场景任意处回去。'); } }]);
        ui.controls.append(sc.el, note('可以直接<b>点开关、点电源、点磁体</b>；拖导体棒、拖线圈；<b>点桌上的换向器</b>把它装到转轴上。'), btns.el, cm.el);
        // 导体棒每换一种条件，学生自己说它往哪边滚，记进表格；最后比较
        const tb = table(['电流方向', '磁场方向', '导体棒运动']);
        ui.data.append(tb.el);
        let pend = null;
        const dirQ = buttons(['向外（朝你）滚', '向里滚'].map((t, j) => ({ text: t, ghost: true, onClick: () => {
          if (!pend) return;
          const ans = j ? -1 : 1;
          if (pend.cmp) {
            if ((ans === 1) !== pend.same) return ui.status('对照表格第一行和最后一行再看看。');
          } else if (ans !== pend.dir) return ui.status('再看看导体棒往哪边滚（可以把它放回中间再试一次）。');
          if (!pend.cmp) {
            const { key, dir } = pend;
            tb.add([key[0] === '-' ? '<i>b</i> → <i>a</i>（对调）' : '<i>a</i> → <i>b</i>', key.endsWith('-1') ? '上 S 下 N（调换）' : '上 N 下 S', dir > 0 ? '向外' : '向里']);
            W.goal.done('move'); if (key === '-11') W.goal.done('revI'); if (key === '1-1') W.goal.done('revB');
            if (key === '-1-1' && S.first) {
              pend = { cmp: true, same: S.first === dir };
              dirQ.btns[0].textContent = '和第一次相同'; dirQ.btns[1].textContent = '和第一次相反';
              return ui.status('电流和磁场方向<b>都</b>反过来了。和表格第一行比，导体棒的运动方向——');
            }
            if (key === '11') S.first = dir;
            pend = null; dirQ.el.hidden = true;
            return ui.status(key === '11' ? '记下了。试试把电源正负极对调（只改变电流方向），或者把磁极调换（只改变磁场方向）。' : '记下了。和第一行比一比：只改变一个方向，受力方向就反过来。');
          }
          pend = null; dirQ.el.hidden = true; dirQ.btns[0].textContent = '向外（朝你）滚'; dirQ.btns[1].textContent = '向里滚';
          ui.status('对：电流方向和磁场方向<b>同时</b>改变，受力方向不变。通电导线在磁场中受力的方向，跟电流方向和磁场方向都有关。');
        } })));
        dirQ.el.hidden = true;
        ui.controls.prepend(dirQ.el);
        W = { dropDir: () => { if (pend && !pend.cmp) { S.seen.delete(pend.key); pend = null; dirQ.el.hidden = true; } }, asking: () => !!pend, askDir: (key, dir) => { pend = { key, dir }; dirQ.el.hidden = false; ui.status(`电流${key[0] === '-' ? '从 b 到 a' : '从 a 到 b'}，磁场${key.endsWith('-1') ? '上 S 下 N' : '上 N 下 S'}。导体棒往哪边滚？`); }, syncComm: () => cm.set(S.comm ? 1 : 0), status: (m) => ui.status(m), goal: goals(ui, [['move', '通电，看导体棒怎样运动'], ['revI', '只改变电流方向'], ['revB', '只改变磁场方向'], ['osc', '没有换向器时，线圈能连续转动吗'], ['run', '装上换向器，让线圈连续转动']]) };
        ui.status('导体棒 ab 放在蹄形磁体的磁场里。<b>点开关</b>通电，看它怎样运动。');
      },
      update(dt) {
        const h = Math.min(dt, 1 / 30);
        // 磁场：上 N 下 S 时磁场竖直向下（Bflip = 1）；电流从 a 到 b 为 +x（Iflip = 1）。F = I L × B
        if (S.scene === 'rod') {
          const Ix = S.Iflip, By = -S.Bflip;            // I 沿 x，B 沿 y → F = Ix·By (x̂×ŷ = ẑ)
          const under = S.rodZ + 0.01 < 0.008 && S.rodZ + 0.01 > -0.062;       // 只有在两个磁极之间才有磁场
          const F = S.on && under ? Ix * By * 0.6 : 0;
          S.rodV += (F - S.rodV * 1.5) * h; S.rodZ += S.rodV * h * 0.12;
          if (S.rodZ > 0.07 || S.rodZ < -0.05) { S.rodZ = clamp(S.rodZ, -0.05, 0.07); S.rodV = 0; }
          rod.position.set(0, 0.0255, 0.01 + S.rodZ); rod.rotation.x += S.rodV * h * 3;
          fArrow.visible = !!F; if (S.on) fArrow.set(new THREE.Vector3(0, 0.035, 0.01 + S.rodZ), new THREE.Vector3(0, 0, Math.sign(F) * 0.03));
          tAB[0].loc(group, -0.04, 0.03, 0.01 + S.rodZ); tAB[1].loc(group, 0.04, 0.03, 0.01 + S.rodZ);
          tTop.loc(group, 0.06, 0.075, -0.03).text(S.Bflip > 0 ? 'N' : 'S'); tBot.loc(group, 0.06, 0.012, 0.01).text(S.Bflip > 0 ? 'S' : 'N');
          tNS.forEach((t) => t.loc(group, 0, -9, 0));
          if (S.on && Math.abs(S.rodV) > 0.1) {
            const key = `${S.Iflip}${S.Bflip}`;
            if (!S.seen.has(key) && !W?.asking()) { S.seen.add(key); W?.askDir(key, S.rodV > 0 ? 1 : -1); }
          }
        } else {
          tAB.forEach((t) => t.loc(group, 0, -9, 0)); tTop.loc(group, 0, -9, 0); tBot.loc(group, 0, -9, 0);
          tNS[0].loc(group, 0.07, 0.09, 0).text('N'); tNS[1].loc(group, -0.07, 0.09, 0).text('S');
          // 磁场沿 −x（N 在右）。线圈平面与磁场夹角 θ（绕 z 轴转）。τ = k·I·cosθ，换向器让 I 的符号跟着 cosθ 走
          let I = S.on ? S.Iflip : 0;
          if (S.comm && S.on) I = Math.sign(Math.cos(S.th) || 1) * S.Iflip;
          const tau = 120 * I * Math.cos(S.th);
          if (!S.hold) {
            S.w += (tau - S.w * (S.comm ? 1.2 : 1.8)) * h;
            if (!S.on && Math.abs(S.w) < 0.3) S.w *= 0.9;
            S.th += S.w * h;
            if (S.on) S.turned += Math.abs(S.w * h);
            const sg = Math.sign(S.w); if (sg && sg !== S.lastSign) { S.swings++; S.lastSign = sg; }
          }
          coil.rotation.z = S.th; if (S.comm) comm.rotation.z = S.th;
          // 两条边受的力（竖直方向，大小不变、方向相反）
          const r = 0.035, F = 0.025 * I;
          const pa = new THREE.Vector3(-r * Math.cos(S.th), 0.045 - r * Math.sin(S.th), 0.03), pc = new THREE.Vector3(r * Math.cos(S.th), 0.045 + r * Math.sin(S.th), 0.03);
          fArrows[0].visible = fArrows[1].visible = S.on && !!F;
          if (F) { fArrows[0].set(pa, new THREE.Vector3(0, F, 0)); fArrows[1].set(pc, new THREE.Vector3(0, -F, 0)); }
          if (S.on && !S.comm && S.swings > 4 && Math.abs(S.w) < 0.5 && !S.seen.has('osc')) { S.seen.add('osc'); W?.goal.done('osc'); status('线圈转过平衡位置后，受到的力反过来阻碍它，来回摆了几下，停在<b>平衡位置</b>（线圈平面和磁场垂直）。它不能连续转动。'); }
          if (S.on && S.comm && S.turned > Math.PI * 4 && !S.seen.has('run')) { S.seen.add('run'); W?.goal.done('run'); status('装上换向器，线圈<b>连续转动</b>起来了：每转过平衡位置，换向器就改变线圈中的电流方向。这就是直流电动机。'); }
        }
      },
      debug: { S, toggle, flipI, flipB, setScene },
    };
  },
};
