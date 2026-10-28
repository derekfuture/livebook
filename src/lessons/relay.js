// 图20.3-6 电磁继电器的构造 / 练习图20.3-7 影响电磁铁磁性强弱的因素。
// 场景一：电磁铁吸大头针。铁钉上绕着线圈（可选 50 匝 / 100 匝），串着滑动变阻器、开关、电池。闭合开关，把铁钉从大头针盒里提起来，
//   看吸起几枚大头针；改变电流（拖滑片）、匝数，再比较。断电，大头针掉下来。
// 场景二：电磁继电器。低压控制电路（电池、按钮开关）接 D、E；高压工作电路（220 V 电源、电动机、红绿两盏灯）接 A、B、C。
//   按下按钮：线圈中有电流，电磁铁把衔铁吸下，B、C 接通（电动机转、绿灯亮），A、B 断开（红灯灭）；松开按钮，弹簧把衔铁拉回去。
// 直接操作：点开关 / 按住按钮；拖铁钉上下；拖滑片。面板也有。
import * as THREE from 'three';
import { seg, buttons, goals, note, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { battery, switchPart } from './kit/circuit.js';
import { glowTexture } from './kit/props.js';
import { paint, inked, hull } from '../live/ink.js';

const NPIN = 24;

export default {
  id: 'relay',
  fig: '图20.3-6',
  title: '电磁铁 · 电磁继电器',
  stampText: '探究',
  predict: {
    q: '电磁继电器的低压控制电路只接了两节干电池。<br>它能控制 220 V 的电动机吗？',
    hint: '课本第 159 页',
    options: ['不能，电压太低', '能，电磁铁吸下衔铁，接通高压电路', '只能控制小灯泡'],
    answer: 1,
  },
  conclusion: {
    page: 165, rect: [62, 382, 362, 512],
    quote: '电磁继电器就是利用电磁铁来控制工作电路的一种开关。……当较低的电压加在接线柱 D、E 两端，较小的电流通过线圈时，电磁铁把衔铁吸下，使 B、C 两个接线柱所连的触点接通，较大的电流就可以通过 B、C 带动机器工作了。',
    why: '电磁铁通电时有磁性，断电时磁性消失；电流越大、线圈匝数越多，磁性越强（吸起的大头针越多）。电磁继电器利用这一点：用一个低电压、弱电流的控制电路，通过电磁铁吸引衔铁来接通或断开高电压、强电流的工作电路。人只接触低压的按钮，既安全又方便，还可以实现远距离控制和自动控制。',
    src: '课本第 158–159 页 · 第二十章 第3节 电磁铁 电磁继电器',
  },

  create({ tag, look, back, reframe }) {
    const group = new THREE.Group();
    const S = { scene: 'nail', on: false, turns: 50, pos: 0.5, ny: 0.03, held: [], btn: false, arm: 0, motorA: 0, seen: new Set(), counts: {} };
    let W = null;
    const status = (m) => W?.status(m);

    // ================= 场景一：电磁铁吸大头针 =================
    const nailG = new THREE.Group();
    const box = inked(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.012, 0.05), paint(0xd9b98a)), { width: 1 });
    box.position.set(0, 0.006, 0);
    const nail = new THREE.Group();
    const shaft = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.09, 12), paint(0x9aa3b2)), 0.0008);
    const headM = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.003, 14), paint(0x9aa3b2)); headM.position.y = 0.046;
    nail.add(shaft, headM);
    const coilMesh = { m: null };
    const buildCoil = () => {
      if (coilMesh.m) { nail.remove(coilMesh.m); coilMesh.m.geometry.dispose(); }
      const pts = [], n = S.turns === 100 ? 22 : 11, len = S.turns === 100 ? 0.05 : 0.025;
      for (let i = 0; i <= n * 30; i++) { const t = i / (n * 30), a = t * n * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * 0.0045, 0.02 - t * len, Math.sin(a) * 0.0045)); }
      coilMesh.m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 40, 0.0008, 5, false), paint(0xc8743a));
      nail.add(coilMesh.m);
    };
    buildCoil();
    nailG.add(box, nail);
    const pins = Array.from({ length: NPIN }, (_, i) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.0007, 0.0007, 0.02, 5), paint(0xd2d6dc, { unique: true }));
      p.userData.home = new THREE.Vector3((Math.random() - 0.5) * 0.055, 0.013, (Math.random() - 0.5) * 0.035);
      p.userData.rot = new THREE.Euler(Math.PI / 2, Math.random() * Math.PI, 0);
      p.position.copy(p.userData.home); p.rotation.copy(p.userData.rot);
      nailG.add(p); return p;
    });
    const rh = new THREE.Group();
    const coilR = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 18), paint(0x8a5a34)), 0.001); coilR.rotation.z = Math.PI / 2; coilR.position.y = 0.012;
    const slide = inked(new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.014), paint(0x3b4150)), { width: 1 }); slide.position.y = 0.024;
    rh.add(coilR, slide); rh.position.set(0.1, 0, 0.06);
    nailG.add(rh);
    tag('滑动变阻器', 'pill').loc(nailG, 0.1, 0.0, 0.085);
    tag('大头针', 'pill').loc(nailG, 0, 0.0, 0.035);
    const nTag = tag('', 'pill');
    group.add(nailG);

    // ================= 场景二：电磁继电器 =================
    const relG = new THREE.Group();
    const baseR = inked(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.006, 0.07), paint(0x2f4f8a)), { width: 1.2 }); baseR.position.y = 0.003;
    const core = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.035, 18), paint(0x9aa3b2)), 0.001); core.position.set(-0.005, 0.024, 0);
    const cw = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.028, 20), paint(0xc8743a)), 0.001); cw.position.set(-0.005, 0.022, 0);
    const post = inked(new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.05, 0.016), paint(0xc9b38a)), { width: 1 }); post.position.set(-0.04, 0.028, 0);
    const armG = new THREE.Group(); armG.position.set(-0.04, 0.05, 0);
    const armM = inked(new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.004, 0.014), paint(0xc9b38a)), { width: 1 }); armM.position.x = 0.042;
    const contactB = new THREE.Mesh(new THREE.SphereGeometry(0.003, 10, 8), paint(0x23293a)); contactB.position.x = 0.078;
    armG.add(armM, contactB);
    const spring = new THREE.Mesh(new THREE.TorusKnotGeometry(0.004, 0.0008, 40, 6, 1, 8), paint(0x8f99a8)); spring.position.set(-0.05, 0.035, 0); spring.scale.set(1, 2.5, 1);
    const cA = new THREE.Mesh(new THREE.SphereGeometry(0.003, 10, 8), paint(0x23293a)); cA.position.set(0.038, 0.058, 0);
    const cC = new THREE.Mesh(new THREE.SphereGeometry(0.003, 10, 8), paint(0x23293a)); cC.position.set(0.038, 0.04, 0);
    relG.add(baseR, core, cw, post, armG, spring, cA, cC);
    for (const [t, x, y] of [['A', 0.05, 0.062], ['B', 0.055, 0.05], ['C', 0.05, 0.038], ['D', -0.015, 0.005], ['E', 0.005, 0.005]]) tag(t, 'mag').loc(relG, x, y, 0.012);
    tag('衔铁', 'pill').loc(relG, -0.005, 0.065, 0); tag('电磁铁', 'pill').loc(relG, -0.005, 0.01, 0.03); tag('弹簧', 'pill').loc(relG, -0.06, 0.02, 0.02);
    // 工作电路：电动机（风扇）、红灯（A–B 接通时亮）、绿灯（B–C 接通时亮）
    const motor = new THREE.Group(); motor.position.set(0.13, 0.03, -0.02);
    const mb = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 18), paint(0x5b6272)), 0.001); mb.rotation.z = Math.PI / 2;
    const fan = new THREE.Group(); fan.position.x = 0.02;
    for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.03, 0.01), paint(0xd9483b)); b.position.y = 0.015; const g = new THREE.Group(); g.rotation.x = (k / 3) * Math.PI * 2; g.add(b); fan.add(g); }
    motor.add(mb, fan);
    const mkLamp = (col, x) => { const g = new THREE.Group(); const s = new THREE.Mesh(new THREE.SphereGeometry(0.008, 16, 12), new THREE.MeshBasicMaterial({ color: 0x555555 })); s.position.y = 0.012; const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: col, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); h.scale.setScalar(0.05); h.position.y = 0.012; const st = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.005, 0.008, 10), paint(0x8f99a8)); st.position.y = 0.004; g.add(st, s, h); g.position.set(x, 0, 0.05); g.set = (on) => { s.material.color.setHex(on ? col : 0x555555); h.material.opacity = on ? 0.8 : 0; }; return g; };
    const red = mkLamp(0xff4a3a, 0.11), green = mkLamp(0x3adf6a, 0.15);
    relG.add(motor, red, green);
    tag('220 V 工作电路', 'pill').loc(relG, 0.14, 0.07, 0);
    const btnG = new THREE.Group(); btnG.position.set(-0.08, 0, 0.06);
    const btnBase = inked(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.03), paint(0xe9edf2)), { width: 1 }); btnBase.position.y = 0.005;
    const btnTop = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.008, 16), paint(0x2f8b57)); btnTop.position.y = 0.014;
    btnG.add(btnBase, btnTop); relG.add(btnG);
    tag('按钮（按住）', 'pill').loc(relG, -0.08, 0.0, 0.085);
    group.add(relG);

    // 电池、开关（两个场景共用）
    const bat = battery('E', { cells: 2 }); bat.group.scale.setScalar(0.7); bat.group.position.set(-0.03, 0, 0.1);
    const sw = switchPart('S'); sw.group.position.set(-0.11, 0, 0.1);
    group.add(bat.group, sw.group);
    // 场景一的导线：线圈两头 → 开关、滑动变阻器（铁钉上下动，导线跟着）
    const leads = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.BufferGeometry(), paint(0xe08a3c)); nailG.add(m); return m; });
    const fixed = [];
    const fwire = (pts) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q))), 20, 0.0012, 5, false), paint(0xe08a3c)); nailG.add(m); fixed.push(m); };
    fwire([[-0.11 + 0.022, 0.02, 0.1], [-0.06, 0.02, 0.11], [-0.03 - 0.035, 0.012, 0.11]]);
    fwire([[-0.03 + 0.035, 0.012, 0.11], [0.03, 0.02, 0.1], [0.1 - 0.045, 0.012, 0.06]]);
    const updLeads = () => {
      const y = S.ny + 0.045 + 0.02;
      const ends = [[[0.004, y, 0], [-0.04, y + 0.01, 0.04], [-0.11 - 0.022, 0.02, 0.1]], [[0.004, y - (S.turns === 100 ? 0.05 : 0.025), 0], [0.05, 0.05, 0.03], [0.1, 0.03, 0.06]]];
      leads.forEach((m, i) => { m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ends[i].map((q) => new THREE.Vector3(...q))), 24, 0.0012, 5, false); });
    };
    const I = () => (S.scene === 'nail' ? (sw.closed ? 0.3 + (1 - S.pos) * 0.7 : 0) : S.btn ? 1 : 0);
    const strength = () => I() * (S.turns / 50);
    const setScene = (k) => { if (S.scene !== k) reframe?.(); S.scene = k; nailG.visible = k === 'nail'; relG.visible = k === 'relay'; sw.group.visible = k === 'nail'; sw.closed = false; S.btn = false; };
    setScene('nail');

    const toggle = () => { sw.closed = !sw.closed; status(sw.closed ? '通电了。<b>把铁钉往上提</b>，看看能吸起几枚大头针。' : '断电了：电磁铁失去磁性，大头针掉了下来。'); if (!sw.closed && S.held.length) { S.seen.add('off'); W?.goal.done('off'); } };
    const pointer = draggable(group, [
      { obj: nail, plane: 'xy', offset: 0, keepOffset: true, hint: '上下拖：把铁钉插进大头针盒、提起来', onDrag: (p) => { S.ny = clamp(p.y, 0.03, 0.09); } },
      { obj: slide, plane: 'xz', offset: 0.024, hint: '左右拖滑片：改变电流', onDrag: (p) => { S.pos = clamp((p.x - 0.1 + 0.04) / 0.08, 0, 1); } },
    ], { tip: tag('', 'pill'), taps: [{ obj: sw.group, hint: () => (sw.closed ? '点一下：断开' : '点一下：闭合'), onTap: toggle }] });
    // 按钮要“按住”：按下时导通，松开就断
    const ptr = {
      down: (ray, e) => { if (S.scene === 'relay' && ray.intersectObject(btnG, true).length) { S.btn = true; S.seen.add('press'); return true; } return pointer.down(ray, e); },
      items: pointer.items, move: (r, e) => pointer.move(r, e),
      up: (r, e) => { if (S.btn) { S.btn = false; return true; } return pointer.up(r, e); },
    };

    return {
      group,
      size: { w: 0.3, d: 0.16, h: 0.12 },
      view: { elev: 26, azim: 0, lookY: 0.4, margin: 1.1 },
      pointer: ptr,
      mount(ui) {
        const sc = seg('做哪个', ['① 电磁铁吸大头针', '② 电磁继电器'], (_, k) => { setScene(k ? 'relay' : 'nail'); status(k ? '低压控制电路接在 D、E 上。<b>按住绿色按钮</b>，看衔铁、电动机和两盏灯；松开再看。' : '闭合开关，把铁钉提起来。'); });
        const turns = seg('线圈匝数', ['50 匝', '100 匝'], (_, k) => { S.turns = k ? 100 : 50; buildCoil(); });
        const tb = table(['开关', '线圈匝数', '电流', '吸起大头针/枚']);
        const btns = buttons([{ text: '开关', ghost: true, onClick: toggle }, { text: '提起铁钉', ghost: true, onClick: () => { S.ny = 0.03; setTimeout(() => (S.ny = 0.085), 150); } }, { text: '插进大头针盒', ghost: true, onClick: () => { S.ny = 0.03; } }, { text: '数一数，记录', onClick: () => {
          if (S.ny < 0.07) return ui.status('先把铁钉提起来。');
          if (!sw.closed) return ui.status('开关是断开的，线圈里没有电流——铁钉没有磁性，一枚也吸不起来。闭合开关再试。');
          const n = S.held.length, cur = S.pos < 0.33 ? '大' : S.pos > 0.66 ? '小' : '中';
          // 凑近铁钉下端，学生自己数
          look([0, S.ny - 0.014, 0], [0.2, 0.35, 1], 0.13, () => back());
          const opts = [...new Set([n, n + 1, Math.max(0, n - 1)])].sort((a, b) => a - b);
          S.ask = { n, cur, turns: S.turns, ny: S.ny };
          cnt.btns.forEach((b, j) => { b.hidden = j >= opts.length; b.textContent = `${opts[j]} 枚`; b.onclick = () => {
            const q = S.ask; if (!q) return;
            if (opts[j] !== q.n) return ui.status('再仔细数一数铁钉下端吸着的大头针。');
            cnt.el.hidden = true; S.ask = null; back();
            const key = `${q.turns}|${q.cur}`;
            tb.add(['闭合', `${q.turns}`, q.cur, String(q.n)]); S.counts[key] = q.n;
            const has = (t, c) => S.counts[`${t}|${c}`] != null;
            ui.status(`记下了：${q.turns} 匝、电流${q.cur}，吸起 ${q.n} 枚。${Object.keys(S.counts).length < 2 ? '拖滑片改变电流，把铁钉插回盒里再提起来比一比。' : '比一比表格里的几行。'}`);
            // 有了一对只差一个条件的记录，就让学生自己说出规律
            const RANK = { 小: 0, 中: 1, 大: 2 };
            if (!W.goal.has('current')) { const same = Object.keys(S.counts).filter((k) => k.startsWith(`${q.turns}|`)); if (same.length >= 2) { const [a, b] = same.map((k) => k.split('|')[1]).sort((x, y) => RANK[x] - RANK[y]); return lawQ('current', `表里有两行<b>匝数相同（${q.turns} 匝）</b>、电流不同：电流${a}时 ${S.counts[`${q.turns}|${a}`]} 枚，电流${b}时 ${S.counts[`${q.turns}|${b}`]} 枚。这说明——`, ['电流越大，电磁铁的磁性越强', '电流越小，电磁铁的磁性越强', '磁性强弱和电流无关']); } }
            if (!W.goal.has('turns')) { const c = ['大', '中', '小'].find((x) => has(50, x) && has(100, x)); if (c) return lawQ('turns', `表里有两行<b>电流相同（${c}）</b>、匝数不同：50 匝 ${S.counts[`50|${c}`]} 枚，100 匝 ${S.counts[`100|${c}`]} 枚。这说明——`, ['电流相同时，线圈匝数越多，磁性越强', '匝数越少，磁性越强', '磁性强弱和匝数无关']); }
          }; });
          cnt.el.hidden = false;
          ui.status('凑近看铁钉下端：吸起了几枚大头针？');
        } }]);
        const cnt = buttons([0, 1, 2].map(() => ({ text: '', ghost: true, onClick: () => {} })));
        const lawQ = (goal, q, opts) => {
          const sh = [0, 1, 2].sort(() => Math.random() - 0.5);
          cnt.btns.forEach((b, j) => { b.hidden = false; b.textContent = opts[sh[j]]; b.onclick = () => {
            if (sh[j] !== 0) return ui.status('对照表格里那两行再看看：哪一行吸起的大头针多？那一行的电流（匝数）是大还是小？');
            cnt.el.hidden = true; W.goal.done(goal);
            ui.status(goal === 'current' ? '对：匝数相同时，<b>电流越大，电磁铁的磁性越强</b>。再换 100 匝，保持电流不变比一比。' : '对：电流相同时，<b>线圈匝数越多，电磁铁的磁性越强</b>。');
          }; });
          cnt.el.hidden = false; ui.status(q);
        };
        cnt.el.hidden = true;
        S.dropAsk = () => { if (S.ask) { S.ask = null; cnt.el.hidden = true; back(); ui.status('铁钉、电流或匝数变了，重新提起来再数。'); } };
        const press = buttons([{ text: '按下 / 松开按钮', ghost: true, onClick: () => { S.btn = !S.btn; S.seen.add('press'); } }]);
        ui.controls.append(sc.el, note('<b>点开关</b>通电；<b>上下拖铁钉</b>；<b>拖滑片</b>改变电流。继电器里要<b>按住按钮</b>。'), turns.el, btns.el, cnt.el, press.el);
        ui.data.append(tb.el);
        W = { status: (m) => ui.status(m), goal: goals(ui, [['current', '匝数相同，改变电流，比较吸起的大头针'], ['turns', '电流相同，改变匝数再比较'], ['off', '吸着大头针时断电'], ['relay', '用按钮控制电磁继电器，让电动机转起来'], ['release', '松开按钮，看衔铁怎样回去']]) };
        ui.status('电磁铁吸大头针：<b>点开关</b>通电，再把铁钉从大头针盒里<b>提起来</b>。');
      },
      update(dt) {
        sw.update?.(dt);
        // ---- 电磁铁 ----
        if (S.scene === 'nail') {
          nail.position.set(0, S.ny + 0.045, 0);
          updLeads();
          slide.position.x = -0.04 + S.pos * 0.08;
          const cap = Math.round(strength() * 9);         // 能吸住几枚
          const tipY = S.ny;
          if (tipY < 0.035 && strength() > 0) { while (S.held.length < cap) { const p = pins.find((x) => !S.held.includes(x)); if (!p) break; S.held.push(p); } }
          while (S.held.length > cap) S.held.pop();
          pins.forEach((p) => {
            const k = S.held.indexOf(p);
            if (k >= 0) {
              // 第一圈 5 枚吸在钉尖上、向外张开；多的挂在第一圈大头针的下端（被磁化的大头针也吸大头针），数得清
              const ring = Math.min(5, S.held.length), a = ((k % 5) / ring) * Math.PI * 2 + (k >= 5 ? 0.35 : 0), t = k < 5 ? 0.5 : 0.3;
              const dir = new THREE.Vector3(Math.cos(a) * Math.sin(t), -Math.cos(t), Math.sin(a) * Math.sin(t));
              const top = k < 5 ? new THREE.Vector3(Math.cos(a) * 0.002, tipY, Math.sin(a) * 0.002) : S.held[k - 5].userData.bot.clone();
              p.position.copy(top).addScaledVector(dir, 0.01);
              p.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
              p.userData.bot = top.clone().addScaledVector(dir, 0.019);
            }
            else { p.position.lerp(p.userData.home, Math.min(1, dt * 8)); p.rotation.copy(p.userData.rot); }
          });
          nTag.loc(group, 0, -9, 0);
          if (S.ask && (S.ask.n !== S.held.length || S.ask.turns !== S.turns || Math.abs(S.ask.ny - S.ny) > 0.01)) S.dropAsk?.();
        } else nTag.loc(group, 0, -9, 0);
        // ---- 继电器 ----
        if (S.scene === 'relay') {
          const pull = S.btn ? 1 : 0;
          S.arm += (pull - S.arm) * Math.min(1, dt * 14);
          armG.rotation.z = -S.arm * 0.13;
          btnTop.position.y = S.btn ? 0.011 : 0.014;
          const BC = S.arm > 0.6, AB = S.arm < 0.4;
          red.set(AB); green.set(BC);
          if (BC) S.motorA += dt * 25; fan.rotation.x = S.motorA;
          if (BC && !S.seen.has('relay')) { S.seen.add('relay'); W?.goal.done('relay'); status('按下按钮：线圈中有了电流，电磁铁把<b>衔铁吸下</b>，B、C 两个触点接通——220 V 的电动机转了，绿灯亮；A、B 断开，红灯灭。'); }
          if (S.seen.has('relay') && AB && !S.btn && !S.seen.has('release')) { S.seen.add('release'); W?.goal.done('release'); status('松开按钮：电磁铁没有了磁性，<b>弹簧</b>把衔铁拉回去，B、C 断开，电动机停了，红灯又亮。'); }
        }
      },
      debug: { S, toggle, setScene },
    };
  },
};
