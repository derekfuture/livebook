// 课题3 金属资源的利用和保护 · 探究：铁钉生锈的条件（课本下册第 19–20 页图 8-18）。
//
// 三支试管各放一根洁净无锈的铁钉，学生自己搭：
//   ① 蒸馏水浸没铁钉的一半（有水、有空气）；② 煮沸过迅速冷却的蒸馏水浸没铁钉，水面滴植物油封住（只有水）；
//   ③ 放干燥剂（裹在棉花里的氯化钙），塞紧（只有干燥的空气）。
// 然后“放置一周”（压成十几秒），每天看一眼。只有 ① 生锈——铁生锈要同时和氧气、水接触。
// 模型：每段铁钉的生锈速度 ∝ 那里的氧气 ×（水或水蒸气）。
//   水里的氧气：没煮沸的蒸馏水约 8 mg/L（饱和），煮沸过的约 0；水面开着，空气里的氧气慢慢溶进去，盖了油就溶不进去。
//   空气的湿度：有水的试管里约 100%；放了氯化钙、塞紧的约 5%；不放干燥剂约 60%（室内）。水面附近氧气和水都充足，锈得最快。
// 看不见的东西：蓝点 = 氧气（空气里、溶在水里的）。
import * as THREE from 'three';
import { buttons, seg, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { textPlate, canvasTex } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { testTube, stopper, cottonBall, chemBeaker, CHEM } from './kit/chem.js';
import { water2 } from './kit/chemfx.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const T_R = 0.0095, T_LEN = 0.12, T_Y = 0.012;
const XS = [-0.05, 0, 0.05];
const VTUBE = Math.PI * (T_R - 0.0008) ** 2 * 1e6;           // 每 1 m 高多少 mL
const NAIL_TOP = 0.072, NSEG = 14;                            // 铁钉从管底到 7.2 cm 高
const DAY = 2;                                                // 一天 = 2 秒
const BLUE = 0x2f7fd8;
const CUPS = [
  { key: 'w', name: '蒸馏水', home: new THREE.Vector3(0.105, 0, 0.0), o2: 1 },
  { key: 'bw', name: '煮沸过的蒸馏水', home: new THREE.Vector3(0.16, 0, 0.0), o2: 0 },
];
const OIL_HOME = new THREE.Vector3(0.075, 0, 0.078), DRY_HOME = new THREE.Vector3(0.13, 0, 0.078);        // 放在两杯水前面一排，不挡住杯子
const PLUG_HOME = new THREE.Vector3(0.185, 0, 0.075), CAL = new THREE.Vector3(-0.12, 0, 0.05);
const RUST = new THREE.Color(0x9a4a1c), IRON = new THREE.Color(0x6b717c);

export default {
  id: 'rust',
  fig: '图8-18',
  title: '铁钉生锈的条件',
  stampText: '探究',
  style: 'paper',
  predict: {
    q: '三根铁钉放一周：① 一半浸在蒸馏水里；② 全浸在煮沸过的蒸馏水里、水面盖一层植物油；③ 放在干燥的空气里——哪根会生锈？',
    hint: '课本第 19 页探究：铁钉生锈需要哪些条件？',
    options: ['只有 ①', '① 和 ②', '① 和 ③', '三根都生锈'],
    answer: 0,
  },
  need: '搭好三支试管（有水有空气 / 只有水 / 只有干燥的空气），放置一周，每天观察铁钉，得出铁生锈的条件',
  conclusion: {
    crops: [{ page: 24, rect: [44, 180, 455, 280] }],
    quote: '以上探究中铁钉生锈的过程，实际上是铁与空气中的氧气、水蒸气等发生化学反应的过程。……铁与氧气、水等反应生成的铁锈很疏松，不能阻碍里层的铁继续与氧气、水等反应，因此铁制品可以全部锈蚀。',
    why: '① 有水、有空气（氧气）：铁钉生锈，水面附近锈得最厉害；② 只有水（煮沸赶走了水里的氧气，植物油隔绝空气）：不生锈；③ 只有干燥的空气（氯化钙吸收了水蒸气）：不生锈。所以铁生锈要<b>同时和氧气、水</b>接触。<br>这个设计是<b>控制变量</b>：三支试管都用同样的铁钉；① 分别和 ②、③ 比，每次只差一个条件。防锈就是破坏这两个条件之一：保持干燥、涂油、刷漆、镀一层别的金属……',
    src: '课本下册第 19–20 页 · 第八单元 课题3 金属资源的利用和保护（探究：铁钉生锈的条件）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); else bar.caption(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };

    paperSheet(group, { w: 0.4, d: 0.17, x: 0.04, z: 0.03 });

    // ================= 试管架、三支试管、三根铁钉 =================
    const rackM = paint(0xd9c9a6);
    const base = inked(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.008, 0.036), rackM), { width: 0.7 }); base.position.y = 0.004; group.add(base);
    for (const sx of [-1, 1]) { const post = inked(new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.07, 0.03), rackM), { width: 0.6 }); post.position.set(sx * 0.072, 0.043, 0); group.add(post); }
    const plate = inked(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.004, 0.024), rackM), { width: 0.6 }); plate.position.set(0, 0.075, -0.01); group.add(plate);
    const tubes = XS.map((x, k) => {
      const t = testTube({ r: T_R, len: T_LEN }); t.position.set(x, T_Y, 0); group.add(t);
      const ring = inked(new THREE.Mesh(new THREE.TorusGeometry(T_R + 0.0012, 0.0011, 6, 20), rackM), { width: 0.4 }); ring.rotation.x = Math.PI / 2; ring.position.set(x, 0.077, 0); group.add(ring);
      // 铁钉：分成一段段，每段自己生锈
      const nail = new THREE.Group(); nail.position.set(0.0015, 0.002, 0); nail.rotation.z = 0.05; t.add(nail);
      const segs = [];
      for (let i = 0; i < NSEG; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0011, 0.0011, NAIL_TOP / NSEG, 8), paint(0x6b717c, { keep: true, unique: true })); m.position.y = (i + 0.5) * NAIL_TOP / NSEG; nail.add(m); segs.push(m); }
      const head = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0032, 0.0032, 0.0012, 14), paint(0x6b717c, { keep: true, unique: true })), { width: 0.4 }); head.position.y = NAIL_TOP; nail.add(head); segs.push(head);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0011, 0.004, 8), segs[0].material); tip.rotation.x = Math.PI; tip.position.y = -0.0015; nail.add(tip);
      const water = new THREE.Mesh(new THREE.CylinderGeometry(T_R - 0.0008, T_R - 0.0008, 1, 18), water2({ color: CHEM.water, base: 0.3 })); water.geometry.translate(0, 0.5, 0); water.position.y = 0.0012; water.visible = false; water.renderOrder = 7; t.add(water);
      const oil = new THREE.Mesh(new THREE.CylinderGeometry(T_R - 0.0008, T_R - 0.0008, 1, 18), water2({ color: 0xe8c860, base: 0.55 })); oil.geometry.translate(0, 0.5, 0); oil.visible = false; oil.renderOrder = 7.2; t.add(oil);
      const lab = textPlate(['①', '②', '③'][k], { w: 0.008, h: 0.008, color: '#23293a', bg: '#fffaf0', font: 'bold 100px "Songti SC", serif' }); lab.position.set(x, 0.004, 0.0185); group.add(lab);
      return Object.assign(t, { nail, segs, water, oil });
    });
    const MOUTH = (k) => new THREE.Vector3(XS[k], T_Y + T_LEN, 0);

    // ================= 两杯水、植物油、干燥剂、塞子、日历 =================
    const cupPiv = CUPS.map((c) => {
      const piv = new THREE.Group(); group.add(piv);
      const cup = chemBeaker({ r: 0.02, h: 0.05, level: 0.035, color: CHEM.water, marks: false }); cup.position.set(0.023, -0.05, 0); piv.add(cup);
      const lab = textPlate(c.name, { w: c.key === 'w' ? 0.026 : 0.044, h: 0.008, color: '#23293a', bg: '#fffaf0', font: 'bold 80px "Songti SC", serif' }); lab.position.set(0.023, -0.03, 0.0205); piv.add(lab);
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.05, 10), new THREE.MeshBasicMaterial({ visible: false })); pick.position.set(0.023, -0.025, 0); pick.userData.pick = true; piv.add(pick);
      piv.position.copy(c.home).add(new THREE.Vector3(-0.023, 0.05, 0));
      return Object.assign(piv, { cup, pick });
    });
    const CUP_PIV_HOME = (i) => CUPS[i].home.clone().add(new THREE.Vector3(-0.023, 0.05, 0));
    // 植物油（滴瓶）
    const oilB = new THREE.Group(); group.add(oilB);
    { const body = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.03, 20), water2({ color: 0xe8c860, base: 0.6 })); body.position.y = 0.015; body.renderOrder = 7; oilB.add(body);
      const bulb = inked(new THREE.Mesh(new THREE.SphereGeometry(0.0055, 14, 10), paint(0x3d4352)), { width: 0.5 }); bulb.position.y = 0.042; oilB.add(bulb);
      const neck = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.008, 12), paint(0x3d4352)), { width: 0.5 }); neck.position.y = 0.034; oilB.add(neck);
      const lab = textPlate('植物油', { w: 0.02, h: 0.007, color: '#23293a', bg: '#fffaf0', font: 'bold 84px "Songti SC", serif' }); lab.position.set(0, 0.014, 0.0115); oilB.add(lab); }
    const oilPick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.05, 10), new THREE.MeshBasicMaterial({ visible: false })); oilPick.position.y = 0.025; oilPick.userData.pick = true; oilB.add(oilPick);
    oilB.position.copy(OIL_HOME);
    // 干燥剂：棉花裹着的氯化钙（一小团）
    const dry = new THREE.Group(); group.add(dry);
    const cot = cottonBall(0.0075); dry.add(cot);
    for (let i = 0; i < 7; i++) { const g = inked(new THREE.Mesh(new THREE.DodecahedronGeometry(0.0022, 0), paint(0xf6f6f2)), { width: 0.4 }); g.position.set((Math.random() - 0.5) * 0.008, 0.004 + Math.random() * 0.003, (Math.random() - 0.5) * 0.008); dry.add(g); }
    const dryLab = textPlate('氯化钙（干燥剂）', { w: 0.04, h: 0.007, color: '#23293a', bg: '#fffaf0', font: 'bold 72px "Songti SC", serif' }); dryLab.rotation.x = -Math.PI / 2; dryLab.position.set(DRY_HOME.x, 0.0006, DRY_HOME.z + 0.016); group.add(dryLab);
    const dryPick = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshBasicMaterial({ visible: false })); dryPick.userData.pick = true; dry.add(dryPick);
    dry.position.copy(DRY_HOME).add(new THREE.Vector3(0, 0.007, 0));
    const plug = stopper({ r1: T_R - 0.0004, r2: T_R + 0.0016, h: 0.016 }); group.add(plug);
    const plugPick = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.026, 10), new THREE.MeshBasicMaterial({ visible: false })); plugPick.position.y = 0.008; plugPick.userData.pick = true; plug.add(plugPick);
    plug.position.copy(PLUG_HOME);
    // 小日历：点一下，放置一周
    const cal = new THREE.Group(); cal.position.copy(CAL); group.add(cal);
    const calTex = canvasTex(256, 256, () => {});
    const calFace = new THREE.Mesh(new THREE.PlaneGeometry(0.036, 0.036), new THREE.MeshBasicMaterial({ map: calTex }));
    calFace.position.set(0, 0.0245, 0.0081); cal.add(calFace);
    const calBox = inked(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.016), paint(0xf4efe2)), { width: 0.7 }); calBox.position.y = 0.0225; calBox.rotation.x = -0.25; calFace.rotation.x = -0.25; calFace.position.z = 0.0083 + 0.004; cal.add(calBox);
    const calPick = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.044, 0.02), new THREE.MeshBasicMaterial({ visible: false })); calPick.position.y = 0.02; calPick.userData.pick = true; cal.add(calPick);
    let calDay = -1;
    const drawCal = (d, running) => {
      if (calDay === d * 10 + (running ? 1 : 0)) return; calDay = d * 10 + (running ? 1 : 0);
      const c = calTex.image, g = c.getContext('2d');
      g.fillStyle = '#fffaf0'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#c23a3a'; g.fillRect(0, 0, 256, 60);
      g.fillStyle = '#fff'; g.font = 'bold 40px "Songti SC", serif'; g.textAlign = 'center'; g.fillText(running ? '放置中' : '放置一周', 128, 44);
      g.fillStyle = '#23293a'; g.font = 'bold 120px "Times New Roman", serif'; g.fillText(String(d), 128, 190);
      g.font = '32px "Songti SC", serif'; g.fillText('第　天', 128, 238);
      calTex.needsUpdate = true;
    };
    drawCal(0, false);

    // ================= 氧气小点 =================
    const dotTex = canvasTex(64, 64, (g, Wd) => { const gr = g.createRadialGradient(Wd / 2, Wd / 2, 0, Wd / 2, Wd / 2, Wd / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,1)'); gr.addColorStop(0.75, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, Wd, Wd); });
    const blueP = new Particles({ max: 160, sprite: true, color: BLUE }); blueP.mat.uniforms.map.value = dotTex; blueP.mesh.renderOrder = 10; group.add(blueP.mesh);
    const oDots = XS.map(() => Array.from({ length: 22 }, () => ({ u: Math.sqrt(Math.random()) * 0.75, th: Math.random() * 6.28, y: Math.random(), rank: Math.random(), ph: Math.random() * 6, p: new THREE.Vector3(), size: 0.0026, alpha: 0.9 })));
    const drops = new Particles({ max: 60, geometry: new THREE.SphereGeometry(1, 6, 5), material: water2({ color: CHEM.water, base: 0.5 }) }); group.add(drops.mesh);
    const cards = XS.map(() => { const c = tag('', 'cond'); c.px = [0, -70]; return c; });
    const calCard = tag('', 'cond'); calCard.px = [-20, -70];

    // ================= 状态 =================
    const freshT = () => ({ vol: 0, o2w: 0, oil: false, dry: false, plug: false, rust: new Array(NSEG + 1).fill(0) });
    const fresh = () => ({ demo: false, t: XS.map(freshT), cup: -1, carry: null, tilt: 0, oilCarry: null, dryCarry: null, plugAt: -1, day: 0, running: false, logged: false, vary: { boil: true, oil: true, dry: true } });
    S = fresh();
    const level = (k) => (S.t[k].vol / VTUBE);            // 水面高度（m，从管底算）

    // ================= 操作 =================
    const A = {
      cupDrag(i, p) { if (!p || S.day > 0) return; S.cup = i; S.carry = p.clone(); },
      cupDrop() { S.carry = null; },
      oilDrag(p) { if (!p) return; S.oilCarry = p.clone(); },
      oilDrop() {
        const p = S.oilCarry; S.oilCarry = null; if (!p) return;
        const k = XS.findIndex((x) => Math.abs(p.x - x) < 0.016 && p.y < T_Y + T_LEN + 0.05 && p.y > T_Y + T_LEN - 0.04);
        if (k < 0) return;
        const T = S.t[k];
        if (T.vol < 1) return status('先往试管里加水，再滴植物油封住水面。');
        T.oil = true; sfx.clink({ freq: 1800, gain: 0.03 });
        status(`${['①', '②', '③'][k]} 号试管的水面上滴了一层<b>植物油</b>——空气里的氧气溶不进水里了。`);
        if (k === 1) done('oil');
      },
      dryDrag(p) { if (!p) return; S.dryCarry = p.clone(); },
      dryDrop() {
        const p = S.dryCarry; S.dryCarry = null; if (!p) return;
        const k = XS.findIndex((x) => Math.abs(p.x - x) < 0.016 && p.y < T_Y + T_LEN + 0.04 && p.y > T_Y + T_LEN - 0.05);
        if (k < 0 || S.t[k].vol > 1) return k >= 0 ? status('有水的试管里放干燥剂没有意义。') : null;
        S.t[k].dry = true; sfx.clink({ freq: 1500, gain: 0.03 });
        status(`在 ${['①', '②', '③'][k]} 号试管上部放了一团裹着<b>氯化钙</b>的棉花（干燥剂）。再点一下<b>塞子</b>塞紧。`);
        if (k === 2) done('dry');
      },
      plugTap() {
        const k = S.t.findIndex((T) => T.dry && !T.plug); if (k < 0) return status('先放干燥剂，再塞塞子。');
        S.t[k].plug = true; S.plugAt = k; sfx.clink({ freq: 1300, gain: 0.04 }); done('plug');
        status('塞紧了：③ 号试管里只有<b>干燥的空气</b>。' + (S.demo ? '三支试管都搭好了。' : '三支试管都搭好了——点一下左边的<b>日历</b>，放置一周。'));
      },
      calTap() {
        if (S.running) return;
        if (S.day >= 7) return status('已经放了一周了。可以“全部重来”，换个条件再试。');
        if (!(S.t[0].vol > 1 && S.t[1].vol > 1 && S.t[1].oil && S.t[2].plug) && !S.demo) status('（三支试管还没全搭好，也可以先放着看看。）');
        S.running = true; status('开始放置……每天看一眼铁钉。');
      },
      reset() {
        const vary = S.vary; S = fresh(); S.vary = vary; drops.clear(); W?.tbl.clear();
        if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; }
        bar.undo('a', 'b', 'oil', 'dry', 'plug', 'week', 'why');
        status('全部重新摆好了，记录也清空了。');
      },
    };

    const drag = draggable(group, [
      ...CUPS.map((c, i) => ({ obj: cupPiv[i].pick, plane: 'xy', offset: 0, hint: () => (S.day > 0 ? '' : `${c.name}：拖到试管口倒进去`), onStart: (p) => A.cupDrag(i, p), onDrag: (p) => A.cupDrag(i, p), onEnd: () => A.cupDrop() })),
      { obj: oilPick, plane: 'xy', offset: 0, hint: '植物油：拖到有水的试管口，滴一层', onStart: (p) => A.oilDrag(p), onDrag: (p) => A.oilDrag(p), onEnd: () => A.oilDrop() },
      { obj: dryPick, plane: 'xy', offset: 0, hint: '干燥剂：拖到空试管口放进去', onStart: (p) => A.dryDrag(p), onDrag: (p) => A.dryDrag(p), onEnd: () => A.dryDrop() },
    ], { taps: [
      { obj: plugPick, hint: '点一下：塞紧放了干燥剂的试管', onTap: () => A.plugTap() },
      { obj: calPick, hint: () => (S.running ? '' : '点一下：放置一周'), onTap: () => A.calTap() },
    ], tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const pourAt = (k) => () => MOUTH(k).add(new THREE.Vector3(0.006, -0.025 + 0.004, 0));
    const dropAt = (k) => () => MOUTH(k).add(new THREE.Vector3(0, 0.012, 0));

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'a', title: '① 有水有空气', todo: '把<b>蒸馏水</b>拖到 ① 号试管口，倒到浸没铁钉的<b>一半</b>左右，松手。', target: () => (S.carry ? null : cupPiv[0]) },
        { id: 'b', title: '② 只有水', todo: '把<b>煮沸过的蒸馏水</b>拖到 ② 号试管口，倒到<b>浸没铁钉</b>。', target: () => (S.carry ? null : cupPiv[1]) },
        { id: 'oil', title: '② 用油封住', todo: '把<b>植物油</b>拖到 ② 号试管口，滴一层封住水面。', target: () => (S.oilCarry ? null : oilB) },
        { id: 'dry', title: '③ 放干燥剂', todo: '把<b>干燥剂</b>（裹着氯化钙的棉花）拖到 ③ 号试管口放进去。', target: () => (S.dryCarry ? null : dry) },
        { id: 'plug', title: '③ 塞紧', todo: '点一下<b>塞子</b>，塞紧 ③ 号试管。', target: () => plug },
        { id: 'week', title: '放置一周', todo: '点一下<b>日历</b>，放置一周；每天看一眼铁钉。', target: () => (S.running ? null : cal) },
        { id: 'why', title: '想一想', todo: '铁钉生锈需要哪些条件？在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { drops.clear(); } }),
          shots: [
            { cap: '① 倒蒸馏水，浸没铁钉的一半：铁钉既接触水，又接触空气。', dur: 7, speed: 1.6, cam: [[XS[0], 0.08, 0], [0.06, 0.22, 1], 0.3],
              during: act.drag(cupPiv[0].pick, pourAt(0), { t0: 0.04, t1: 0.22, release: 0.98, until: () => level(0) > NAIL_TOP * 0.5 }) },
            { cap: '② 倒煮沸过迅速冷却的蒸馏水（赶走了水里的氧气），浸没铁钉；再滴一层植物油，隔绝空气。', dur: 15, speed: 2.4, cam: [[XS[1], 0.08, 0], [0.06, 0.22, 1], 0.3],
              during: act.seq(act.drag(cupPiv[1].pick, pourAt(1), { t0: 0.02, t1: 0.1, release: 0.8, until: () => level(1) > NAIL_TOP + 0.008 }), act.path(oilPick, [null, new THREE.Vector3(OIL_HOME.x, 0.18, 0), dropAt(1)()], { t0: 0.83, t1: 0.95, release: 0.97 })) },
            { cap: '③ 放一团裹着氯化钙的棉花（干燥剂），塞紧：试管里只有干燥的空气。', dur: 6, cam: [[XS[2], 0.09, 0], [0.06, 0.22, 1], 0.3],
              during: act.seq(act.path(dryPick, [null, new THREE.Vector3(DRY_HOME.x, 0.18, 0), dropAt(2)()], { t0: 0.04, t1: 0.5, release: 0.52 }), act.tap(plugPick, 0.7)) },
            { cap: '放置一周，每天观察铁钉。', dur: 16, cam: [[0.0, 0.07, 0], [0.06, 0.22, 1], 0.36], during: act.tap(calPick, 0.04) },
            { cap: '一周后：只有 ① 号的铁钉生锈了，水面附近锈得最厉害；② 号、③ 号没有生锈。', dur: 5, cam: [[0.0, 0.07, 0], [0.06, 0.22, 1], 0.36] },
            { cap: '铁生锈要同时和氧气、水接触。演示完了，下面换你自己做。', dur: 4, cam: [[0.0, 0.07, 0], [0.06, 0.22, 1], 0.4] },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ================= 每帧 =================
    const step = (h, t) => {
      // 倒水
      let at = -1;
      cupPiv.forEach((piv, i) => {
        const carrying = S.carry && S.cup === i;
        if (carrying) {
          const spout = S.carry.clone().add(new THREE.Vector3(-0.023, 0.025, 0));
          at = XS.findIndex((x) => Math.abs(spout.x - x) < 0.022 && Math.abs(spout.y - (T_Y + T_LEN)) < 0.03);
          piv.position.lerp(at >= 0 ? MOUTH(at).add(S.tilt > 1.1 ? new THREE.Vector3(0.006, 0.004, 0) : new THREE.Vector3(0.012, 0.03, 0)) : spout, at >= 0 ? 0.25 : 0.5);
          S.tilt += ((at >= 0 && S.t[at].vol < (T_LEN - 0.03) * VTUBE ? 1.5 : 0) - S.tilt) * Math.min(1, h * 4);
          piv.rotation.z = S.tilt;
          if (at >= 0 && S.tilt > 1.2) {
            const T = S.t[at], dv = 2 * h;            // 约 2 mL/s
            if (T.vol < (T_LEN - 0.03) * VTUBE) { T.o2w = (T.o2w * T.vol + CUPS[i].o2 * (i === 1 && !S.vary.boil ? 1 : CUPS[i].o2) * dv) / (T.vol + dv); T.vol += dv; T.cup = i; }
            if (Math.random() < h * 25) drops.spawn({ p: MOUTH(at).add(new THREE.Vector3(0.003, 0.002, 0)), v: new THREE.Vector3(0, -0.05, 0), size: 0.0012, life: 0.8 });
          }
        } else { piv.position.lerp(CUP_PIV_HOME(i), 0.25); piv.rotation.z *= 0.8; }
      });
      if (!S.carry) {
        // 松手以后判断这一步做成没有
        if (S.t[0].vol > 1 && !bar.has('a') && !S.demo) { const f = level(0) / NAIL_TOP; if (f > 0.25 && f < 0.8) { done('a'); status('① 号：铁钉一半在水里、一半在空气里。'); } else if (f >= 0.8) status('① 号：水太多了，铁钉快全浸没了——要让铁钉<b>一半</b>露在空气里。（“更多 → 全部重来”）'); }
        if (S.t[1].vol > 1 && !bar.has('b') && !S.demo) { if (level(1) > NAIL_TOP + 0.004) { done('b'); status('② 号：铁钉全浸在煮沸过的蒸馏水里。再滴一层<b>植物油</b>封住水面。'); } }
      }
      drops.update(h, (p, d) => { p.v.y -= 0.5 * d; p.p.addScaledVector(p.v, d); return p.p.y > T_Y + 0.01; });
      // 植物油、干燥剂、塞子的位置
      oilB.position.lerp(S.oilCarry ? S.oilCarry.clone().add(new THREE.Vector3(0, -0.025, 0)) : OIL_HOME, S.oilCarry ? 0.45 : 0.25);
      const dk = S.t.findIndex((T) => T.dry);
      dry.position.lerp(S.dryCarry ? S.dryCarry.clone() : dk >= 0 ? new THREE.Vector3(XS[dk], T_Y + T_LEN - 0.022, 0) : DRY_HOME.clone().add(new THREE.Vector3(0, 0.007, 0)), 0.3);
      const pk = S.t.findIndex((T) => T.plug);
      plug.position.lerp(pk >= 0 ? MOUTH(pk).add(new THREE.Vector3(0, -0.01, 0)) : PLUG_HOME, 0.2);
      // 放置：一天 2 秒
      if (S.running) { S.day = Math.min(7, S.day + h / DAY); if (S.day >= 7) { S.running = false; finish(); } }
      drawCal(Math.floor(S.day), S.running);
      const dd = S.running ? h / DAY : 0;          // 这一帧过去了多少天
      // 生锈：每段的氧气 × 水
      S.t.forEach((T, k) => {
        const tb = tubes[k], lv = level(k);
        // 水面开着：空气里的氧气慢慢溶进水里（约一天溶到饱和的一半）；盖了油就溶不进去；铁锈也会消耗水里的氧气
        if (T.vol > 1 && !T.oil && !T.plug) T.o2w += (1 - T.o2w) * dd * 0.7;
        const hum = T.vol > 1 ? 1 : T.dry ? 0.05 : 0.6;          // 空气的湿度
        const airO2 = T.vol > 1 && T.oil && lv > NAIL_TOP ? 0 : 1;
        for (let i = 0; i <= NSEG; i++) {
          const y = i === NSEG ? NAIL_TOP : (i + 0.5) * NAIL_TOP / NSEG;
          const inW = y < lv;
          let r;
          if (inW) r = T.o2w * (Math.abs(y - lv) < 0.008 && !T.oil ? 1.8 : 0.5);         // 水里：靠溶解的氧气；水面附近氧气、水都足
          else r = airO2 * (hum > 0.9 ? 0.45 : hum > 0.5 ? 0.06 : 0.002);                 // 空气里：靠水蒸气
          T.rust[i] = Math.min(1, T.rust[i] + r * dd * 0.22);
          if (inW) T.o2w = Math.max(0, T.o2w - r * dd * 0.02);
          const seg = tb.segs[i]; seg.material.color.copy(IRON).lerp(RUST, Math.min(1, T.rust[i] * 1.2));
        }
        tb.water.visible = T.vol > 0.3; tb.water.scale.y = Math.max(0.0001, lv);
        tb.water.material.color.lerpColors(new THREE.Color(CHEM.water), new THREE.Color(0xd9a060), Math.min(0.5, T.rust.reduce((a, b) => a + b, 0) / NSEG * 0.8));
        tb.oil.visible = T.oil; tb.oil.position.y = 0.0012 + lv; tb.oil.scale.y = 0.006;
      });
      // 氧气小点：空气里（油下面、塞紧放了干燥剂的空气里照样有氧气）、溶在水里的
      const blue = [];
      S.t.forEach((T, k) => {
        const lv = level(k), top = T.dry ? T_LEN - 0.032 : T_LEN - 0.004;
        for (const d of oDots[k]) {
          const th = d.th + Math.sin(t * 0.4 + d.ph) * 0.2, rr = (T_R - 0.0025) * d.u;
          if (d.rank < 0.5) { if (T.vol > 1 && T.oil && lv > top - 0.01) continue; const y = lv + 0.004 + (T.oil ? 0.006 : 0) + (top - lv - 0.006) * d.y; if (y > top) continue; d.p.set(XS[k] + Math.cos(th) * rr, T_Y + y, Math.sin(th) * rr); d.size = 0.0026; blue.push(d); }
          else if (T.vol > 1 && (d.rank - 0.5) * 2 < T.o2w * 0.5) { d.p.set(XS[k] + Math.cos(th) * rr, T_Y + 0.003 + (lv - 0.006) * d.y, Math.sin(th) * rr); d.size = 0.0019; blue.push(d); }
        }
      });
      blueP.list = blue; blueP.update(0, () => true);
      // 卡片
      S.t.forEach((T, k) => {
        const max = Math.max(...T.rust), cond = T.vol > 1 ? (T.oil ? '只有水' : level(k) > NAIL_TOP ? '浸没在水里' : '有水，有空气') : T.dry && T.plug ? '只有干燥的空气' : '空气';
        cards[k].text(`<div class="cc"><div class="cc-t"><span class="cc-name">${['①', '②', '③'][k]} ${cond}</span>${max > 0.3 ? '<span class="cc-res burn">生锈</span>' : ''}</div></div>`)
          .loc(group, XS[k], T_Y + T_LEN + 0.004, 0).show(T.vol > 1 || T.dry || S.day > 0);
      });
      // 每天记一下（第 2 天、第 7 天）
      if (S.day >= 2 && !S.d2 && !S.demo) { S.d2 = true; const r = S.t.map((T) => Math.max(...T.rust)); log(['放置第 2 天', r.map((x, k) => `${['①', '②', '③'][k]} ${x > 0.3 ? '<b>生锈</b>' : x > 0.08 ? '有一点锈' : '没有变化'}`).join('；'), '']); }
    };
    const finish = () => {
      if (S.demo) return;
      const r = S.t.map((T) => Math.max(...T.rust));
      const word = (x) => (x > 0.3 ? '<b>生锈</b>' : x > 0.08 ? '有一点锈' : '<b>没有生锈</b>');
      log(['放置一周后 ①（有水、有空气）', word(r[0]) + (r[0] > 0.3 ? '，水面附近锈得最厉害' : ''), '铁和氧气、水同时接触']);
      log(['放置一周后 ②（只有水）', word(r[1]), S.t[1].oil ? '没有氧气' : '水面没封住：空气里的氧气溶进了水里']);
      log(['放置一周后 ③（只有干燥的空气）', word(r[2]), S.t[2].dry ? '没有水' : '没放干燥剂：空气里有水蒸气']);
      done('week'); status('一周到了。看看三根铁钉，再看左边的记录和问题。');
      W?.t1.open();
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.36, d: 0.14, h: 0.15 },
      view: { elev: 16, azim: -4, lookY: 0.42, frameMargin: 1.06 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = () => [...W.tbl.el.querySelectorAll('tr')].slice(1).map((tr) => `<div>${[...tr.children].slice(0, 2).map((td) => td.innerHTML).join('：')}</div>`).join('');
        const t2 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '对铁钉生锈的条件，你能得出什么结论？',
          options: ['铁生锈要同时和氧气、水接触', '只要有水，铁就会生锈', '只要有空气，铁就会生锈'],
          wrong: ['② 号一直泡在水里，生锈了吗？', '③ 号在空气里放了一周，生锈了吗？'],
          ok: '对：铁生锈要<b>同时和氧气、水</b>接触。防锈就是破坏这两个条件之一。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); } });
        const t1 = think({ title: '想一想', ctx: () => '<div>① 有水、有空气　② 只有水（煮沸、油封）　③ 只有干燥的空气（干燥剂、塞紧）</div><div>三根都是同样洁净的铁钉，放同样长的时间</div>', status: (m) => ui.status(m),
          q: '这个实验是怎样控制变量的？',
          options: ['铁钉、时间都相同；① 和 ② 只差有没有氧气，① 和 ③ 只差有没有水', '三支试管的条件全都不同', '没有控制变量'],
          wrong: ['① 和 ② 只差有没有空气（氧气），① 和 ③ 只差有没有水。', '看 ① 和 ②：除了有没有空气，别的都一样。'],
          ok: '对：比较 ① 和 ②，说明要有<b>氧气</b>；比较 ① 和 ③，说明要有<b>水</b>。',
          onOk: () => t2.open() });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['做了什么', '现象', '说明']);
        const boilSeg = seg('② 号的水', ['煮沸过（课本）', '没煮沸'], (_, k) => { S.vary.boil = !k; });
        const vary = h('details', { class: 'more' }, h('summary', {}, '换个条件再试'),
          h('p', { class: 'fineprint', html: '② 号用<b>没煮沸</b>的水、或者不滴植物油；③ 号<b>不放干燥剂</b>——一周以后会怎样？（选好后“全部重来”再搭。）' }), boilSeg.el);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：一周压成 14 秒（一天 2 秒）。没煮沸的蒸馏水约溶有 8 mg/L 氧气；氯化钙干燥后的空气湿度按约 5% 计；生锈快慢是示意。' });
        ui.controls.append(t1.el, t2.el, next, vary, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, t1, t2, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('图 8-18：三支试管里各有一根洁净无锈的铁钉。右边是蒸馏水、煮沸过的蒸馏水、植物油、干燥剂和塞子，左边一个小日历。照着课本搭好三支试管，再放置一周。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { bar.dispose(); blueP.dispose(); drops.dispose(); },
      debug: { get S() { return S; }, A, bar, picks: { w: cupPiv[0].pick, bw: cupPiv[1].pick, oil: oilPick, dry: dryPick, plug: plugPick, cal: calPick },
        qa: qaFlow(drag, [
          { name: '拿起蒸馏水', hold: cupPiv[0].pick },
          { name: '倒进 ①', run: () => A.cupDrag(0, pourAt(0)()), wait: 0.5 },
          { name: '松手', release: cupPiv[0].pick, wait: 0.5 },
          { name: '拿起煮沸过的水', hold: cupPiv[1].pick },
          { name: '倒进 ②', run: () => A.cupDrag(1, pourAt(1)()), wait: 6 },
          { name: '松手 ②', release: cupPiv[1].pick, wait: 0.5 },
          { name: '滴植物油', drag: oilPick, to: dropAt(1), wait: 0.5 },
          { name: '放干燥剂', drag: dryPick, to: dropAt(2), wait: 0.5 },
          { name: '塞紧', tap: plugPick, wait: 0.5 },
          { name: '放置一周', tap: calPick, wait: 16 },
          { name: '答第一题', run: () => W.t1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.t2.el.querySelector('button').click() },
        ]) },
    };
  },
};
