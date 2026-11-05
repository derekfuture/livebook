// 课题2 金属的化学性质 · 探究：金属活动性顺序（课本下册第 12–13 页图 8-11、8-12）。
//
// 三支试管：硫酸铜溶液（蓝）、硝酸银溶液、硫酸铝溶液。铝丝先在砂纸上打磨，浸入硫酸铜溶液；一根铜丝浸入硝酸银溶液；另一根铜丝浸入硫酸铝溶液。
// 过一会儿取出，观察表面。由此得出 Al > Cu > Ag。
// 模型（课堂常用量）：2Al + 3CuSO₄ ══ Al₂(SO₄)₃ + 3Cu（铝丝表面长出红色的铜，蓝色变浅）；Cu + 2AgNO₃ ══ Cu(NO₃)₂ + 2Ag（铜丝上长出银白色的枝状晶体，溶液变蓝）；
//   铜和硫酸铝不反应。铝丝不打磨：表面致密的氧化铝薄膜挡着，反应极慢（按打磨程度算）。真实里要几分钟，这里时间加快 8 倍。
import * as THREE from 'three';
import { buttons, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { textPlate } from './kit/props.js';
import { testTube } from './kit/chem.js';
import { water2 } from './kit/chemfx.js';
import { microWorld, metalScene } from './kit/microworld.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const SPEED = 8;
const T_R = 0.0095, T_LEN = 0.12, T_Y = 0.012;
const XS = [-0.045, 0, 0.045];
const SOL = [
  { name: '硫酸铜溶液', c0: 0x5aaee0, c1: 0xcfe6ee },        // 蓝 → 变浅
  { name: '硝酸银溶液', c0: 0xe6eef2, c1: 0x8ec8e6 },        // 无色 → 变蓝
  { name: '硫酸铝溶液', c0: 0xe6eef2, c1: 0xe6eef2 },
];
const LIQ_H = 0.05;
const WIRES = [
  { key: 'al', name: '铝丝', color: 0xc7ccd3, home: new THREE.Vector3(-0.03, 0.014, 0.06), coil: true },
  { key: 'cu1', name: '铜丝', color: 0xb8673a, home: new THREE.Vector3(0.0, 0.014, 0.06) },
  { key: 'cu2', name: '铜丝', color: 0xb8673a, home: new THREE.Vector3(0.03, 0.014, 0.06) },
];
const SAND = new THREE.Vector3(-0.13, 0, 0.0);              // 砂纸（和试管在同一个竖直面里，拖着在上面来回蹭）
// 每根丝放进每种溶液会怎样：rate（每秒，模型时间）、deposit 表面长出的东西
const RX = {
  'al|0': { rate: 0.03, dep: 'cu', eq: '2Al + 3CuSO₄ ══ Al₂(SO₄)₃ + 3Cu' },
  'cu1|1': { rate: 0.03, dep: 'ag', eq: 'Cu + 2AgNO₃ ══ Cu(NO₃)₂ + 2Ag' }, 'cu2|1': { rate: 0.03, dep: 'ag', eq: 'Cu + 2AgNO₃ ══ Cu(NO₃)₂ + 2Ag' },
  'al|1': { rate: 0.04, dep: 'ag', eq: 'Al + 3AgNO₃ ══ Al(NO₃)₃ + 3Ag' },
};

function wire(w) {
  const g = new THREE.Group();
  const mat = paint(w.color, { keep: true, unique: true });
  let pts;
  if (w.coil) { pts = []; for (let i = 0; i <= 60; i++) { const u = i / 60; pts.push(new THREE.Vector3(Math.cos(u * 26) * 0.0045, 0.006 + u * 0.05, Math.sin(u * 26) * 0.0045)); } pts.push(new THREE.Vector3(0, 0.07, 0), new THREE.Vector3(0, 0.1, 0)); }
  else pts = [new THREE.Vector3(0, 0.004, 0), new THREE.Vector3(0, 0.09, 0), new THREE.Vector3(0.004, 0.1, 0), new THREE.Vector3(0.01, 0.1, 0)];
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), w.coil ? 240 : 40, 0.0009, 6, false);
  const m = inked(new THREE.Mesh(geo, mat), { width: 0.35 }); g.add(m);
  // 表面长出来的东西：红色的铜（铝丝上）/ 银白色的枝状晶体（铜丝上）
  const dep = new THREE.Group(); g.add(dep);
  const cuMat = paint(0xa8442c, { keep: true }), agMat = paint(0xe9ecef, { keep: true });
  for (let i = 0; i < 70; i++) {
    const u = Math.random(), p = w.coil ? new THREE.Vector3(Math.cos(u * 26) * 0.0045, 0.006 + u * 0.034, Math.sin(u * 26) * 0.0045) : new THREE.Vector3(0, 0.006 + u * 0.04, 0);
    const n = new THREE.Mesh(new THREE.BoxGeometry(0.0012, 0.0012 + Math.random() * 0.003, 0.0012), cuMat);        // 红色的铜：疏松的一层
    n.position.copy(p); n.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3); n.userData.k = 0.3 + Math.random() * 0.7; n.userData.cu = true; dep.add(n);
  }
  // 银白色的枝状晶体（图 8-12）：从铜丝上一簇簇长出来，越长越密
  for (let i = 0; i < 150; i++) {
    const y = 0.004 + Math.random() * 0.044, a = Math.random() * Math.PI * 2, L = 0.003 + Math.random() * 0.009;
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.0006, L, 0.0006), agMat);
    s.geometry.translate(0, L / 2, 0); s.position.set(0, y, 0);
    s.rotation.set(Math.cos(a) * (0.6 + Math.random() * 0.9), 0, Math.sin(a) * (0.6 + Math.random() * 0.9)); s.userData.k = 0.15 + Math.random() * 0.85; dep.add(s);
  }
  const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.1, 8), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 0.05; pick.userData.pick = true; g.add(pick);
  return Object.assign(g, { mat, dep, pick });
}

export default {
  id: 'metalsalt',
  fig: '图8-11',
  title: '金属活动性顺序',
  stampText: '探究',
  style: 'paper',
  predict: {
    q: '把打磨过的铝丝浸入蓝色的硫酸铜溶液，过一会儿取出——铝丝表面会怎样？',
    hint: '课本第 12 页：铁丝放在硫酸铜溶液中，铁丝上会有红色的铜生成。',
    options: ['铝丝表面长出红色的铜，溶液的蓝色变浅', '没有变化', '铝丝溶解，溶液变得更蓝'],
    answer: 0,
  },
  need: '铝丝打磨后浸入硫酸铜溶液、铜丝浸入硝酸银溶液、铜丝浸入硫酸铝溶液，过一会儿取出观察，得出铝、铜、银的活动性顺序',
  conclusion: {
    crops: [{ page: 17, rect: [289, 39, 481, 204] }],
    quote: '经过许多实验探究，人们总结出了常见金属在水溶液中的活动性顺序：K Ca Na Mg Al Zn Fe Sn Pb (H) Cu Hg Ag Pt Au，金属活动性由强逐渐减弱。',
    formula: '2Al + 3CuSO₄ ══ Al₂(SO₄)₃ + 3Cu　　Cu + 2AgNO₃ ══ Cu(NO₃)₂ + 2Ag',
    why: '铝能把铜从硫酸铜溶液里置换出来（铝丝上长出红色的铜，蓝色变浅）——铝比铜活泼；铜能把银从硝酸银溶液里置换出来（铜丝上长出银白色的银，溶液变蓝）——铜比银活泼；铜不能置换硫酸铝里的铝——铜不如铝活泼。所以 <b>Al > Cu > Ag</b>。<br>这些反应都是<b>置换反应</b>：在金属活动性顺序里，位于前面的金属能把位于后面的金属从它们化合物的溶液里置换出来。铝丝要先打磨：表面有一层致密的氧化铝薄膜。',
    src: '课本下册第 10–13 页 · 第八单元 课题2 金属的化学性质（探究：金属活动性顺序）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); else bar.caption(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };

    paperSheet(group, { w: 0.34, d: 0.17, x: -0.02, z: 0.03 });

    // ================= 试管架、三支试管、三种溶液 =================
    const rackM = paint(0xd9c9a6);
    const base = inked(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.008, 0.036), rackM), { width: 0.7 }); base.position.y = 0.004; group.add(base);
    for (const sx of [-1, 1]) { const post = inked(new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.07, 0.03), rackM), { width: 0.6 }); post.position.set(sx * 0.067, 0.043, 0); group.add(post); }
    const plate = inked(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.004, 0.024), rackM), { width: 0.6 }); plate.position.set(0, 0.075, -0.01); group.add(plate);
    const tubes = XS.map((x, k) => {
      const t = testTube({ r: T_R, len: T_LEN }); t.position.set(x, T_Y, 0); group.add(t);
      const ring = inked(new THREE.Mesh(new THREE.TorusGeometry(T_R + 0.0012, 0.0011, 6, 20), rackM), { width: 0.4 }); ring.rotation.x = Math.PI / 2; ring.position.set(x, 0.077, 0); group.add(ring);
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(T_R - 0.0008, T_R - 0.0008, LIQ_H, 18), water2({ color: SOL[k].c0, base: 0.4 })); liq.position.y = 0.0012 + LIQ_H / 2; liq.renderOrder = 7; t.add(liq);
      const lab = textPlate(SOL[k].name, { w: 0.034, h: 0.0075, color: '#23293a', bg: '#fffaf0', font: 'bold 84px "Songti SC", serif' }); lab.position.set(x, 0.004, 0.0185); group.add(lab);
      return Object.assign(t, { liq });
    });
    const MOUTH = (k) => new THREE.Vector3(XS[k], T_Y + T_LEN, 0);
    // 砂纸
    const sand = inked(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.002, 0.03), paint(0xc9a36a, { keep: true })), { width: 0.6 }); sand.position.copy(SAND).add(new THREE.Vector3(0, 0.001, 0)); group.add(sand);
    const sandLab = textPlate('砂纸', { w: 0.014, h: 0.007, color: '#5a4630', bg: 'rgba(0,0,0,0)', font: 'bold 96px "Songti SC", serif' }); sandLab.rotation.x = -Math.PI / 2; sandLab.position.copy(SAND).add(new THREE.Vector3(0, 0.0025, 0.009)); group.add(sandLab);
    // 一个小木座：三根丝竖着插在上面（取出来也插回这里，表面看得清）
    const holder = inked(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.014, 0.022), paint(0xd9b27c)), { width: 0.6 }); holder.position.set(0, 0.007, 0.06); group.add(holder);
    const wires = WIRES.map((w) => { const g = wire(w); g.position.copy(w.home); group.add(g); return g; });
    const cards = XS.map(() => { const c = tag('', 'cond'); c.px = [0, -70]; return c; });

    // ================= 状态 =================
    const freshW = () => ({ at: 'tray', tube: -1, carry: null, polish: 0, dep: 0, depKind: null, inT: 0, logged: false, lastX: null });
    const fresh = () => ({ demo: false, w: WIRES.map(freshW), sol: XS.map(() => ({ ion: 0 })), warnedFilm: false, logged: {}, focus: -1 });
    // 微观次元：最近浸进溶液的那根丝，表面上的原子和溶液里的离子怎样交换
    const mwAt = () => new THREE.Vector3(XS[Math.max(0, S.w[Math.max(0, S.focus)].tube)], T_Y + 0.03, 0);
    const mwState = () => { const i = Math.max(0, S.focus), w = S.w[i]; return { metal: WIRES[i].key === 'al' ? 'Al' : 'Cu', sol: Math.max(0, w.tube), dep: w.depKind ? w.dep : 0, film: WIRES[i].key === 'al' && w.polish < 0.6 }; };
    const mw = microWorld({ mode: 'holo', scene: metalScene(), place: () => ({ pos: group.localToWorld(mwAt()), scale: 0.0068 * group.getWorldScale(new THREE.Vector3()).x, cam: window.__lb.stage.camera }) });
    const goBtn = tag('钻进丝的表面看 ⊙', 'pill mw-go', () => openMicro());
    let mwKey = '';
    const openMicro = (demo = false) => {
      if (S.focus < 0 || S.w[S.focus].at !== 'tube') return;
      const p = mwAt(); if (!demo) look([p.x, p.y + 0.06, p.z], [0.04, 0.25, 1], 0.3);
      const r = () => { const cam = window.__lb?.stage?.camera; if (!cam) return [innerWidth / 2, innerHeight * 0.8]; const v = group.localToWorld(mwAt()).project(cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; };
      const st = mwState(); mwKey = `${S.focus}|${st.sol}|${st.film}`; mw.open(r, st);
    };
    mw.onClose = () => { if (!bar.playing) back(); };
    S = fresh();

    const A = {
      wireDrag(i, p) {
        if (!p) return; const w = S.w[i];
        if (w.at === 'tube') { w.at = 'hand'; w.tube = -1; }
        w.at = 'hand'; w.carry = p.clone();
        // 在砂纸上来回蹭：打磨（只有铝丝要打磨）
        // 丝的下端碰到砂纸（手抓的地方比下端高 5 cm）
        if (Math.abs(p.x - SAND.x) < 0.03 && p.y - 0.05 < 0.012) { if (w.lastX != null) w.polish = Math.min(1, w.polish + Math.abs(p.x - w.lastX) * 6); w.lastX = p.x; } else w.lastX = null;
      },
      wireDrop(i) {
        const w = S.w[i], p = w.carry; w.carry = null; w.lastX = null; if (!p) return;
        // 往下放进管里才算浸入（丝的下端在管口以下）；刚从这支试管里提出来、在它上方松手的不算
        const k = XS.findIndex((x, kk) => Math.abs(p.x - x) < 0.016 && p.y - 0.05 < T_Y + T_LEN - 0.01 && p.y > T_Y + 0.04 && !(w.lastTube === kk && w.inT > 0 && !w.logged));
        if (k >= 0 && !S.w.some((o, j) => j !== i && o.at === 'tube' && o.tube === k)) {
          w.at = 'tube'; w.tube = k; w.inT = 0; S.focus = i; sfx.clink({ freq: 1600, gain: 0.03 });
          if (WIRES[i].key === 'al' && k === 0) { if (w.polish < 0.6) status('铝丝<b>没有打磨</b>就浸进去了——看看会怎样。'); else status('打磨过的铝丝浸入了<b>硫酸铜溶液</b>。等一会儿，再取出来看。'); done('al'); }
          else status(`${WIRES[i].name}浸入了<b>${SOL[k].name}</b>。等一会儿，再取出来看。`);
          if (WIRES[i].key !== 'al' && k === 1) done('cuag');
          if (WIRES[i].key !== 'al' && k === 2) done('cual');
        } else {
          if (w.tube < 0 && w.inT > 0 && !w.logged) takeOut(i);
          w.at = 'tray';
        }
      },
      reset() {
        S = fresh(); W?.tbl.clear(); mw.close();
        if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; }
        bar.undo('sand', 'al', 'cuag', 'cual', 'out', 'why');
        status('全部重新摆好了，记录也清空了。');
      },
    };
    const takeOut = (i) => {
      // 取出来看：记录这一根丝在那种溶液里的现象
      const w = S.w[i], k = w.lastTube, R = RX[`${WIRES[i].key}|${k}`];
      w.logged = true;
      const name = WIRES[i].name, sol = SOL[k].name;
      let ph, eq = '—';
      if (!R || w.dep < 0.15) ph = WIRES[i].key === 'al' && k === 0 && S.w[i].polish < 0.6 ? '几乎<b>没有变化</b>（没打磨：表面有氧化铝薄膜）' : '<b>没有变化</b>';
      else if (R.dep === 'cu') { ph = '铝丝表面有<b>红色</b>物质，溶液的<b>蓝色变浅</b>'; eq = R.eq; }
      else { ph = `${name}表面有<b>银白色</b>物质，溶液变成<b>蓝色</b>`; eq = R.eq; }
      log([`将${name}浸入${sol}中`, ph, eq]);
      const key = `${WIRES[i].key[0] === 'a' ? 'al' : 'cu'}|${k}`; S.logged[key] = true;
      if ((S.logged['al|0'] || S.logged['cu|0']) && S.logged['cu|1'] && S.logged['cu|2']) { done('out'); if (W && !S.demo) W.t1.open(); }
      status(`取出${name}：${ph.replace(/<[^>]+>/g, '')}。`);
    };

    const drag = draggable(group, WIRES.map((w, i) => ({ obj: wires[i].pick, plane: 'xy', offset: 0, hint: () => (S.w[i].at === 'tube' ? `过一会儿：把${w.name}取出来看` : w.key === 'al' && S.w[i].polish < 1 ? '铝丝：先在砂纸上来回蹭（打磨），再浸入硫酸铜溶液' : `${w.name}：拖进试管`),
      onStart: (p) => A.wireDrag(i, p), onDrag: (p) => A.wireDrag(i, p), onEnd: () => A.wireDrop(i) })), { tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const into = (k) => () => new THREE.Vector3(XS[k], T_Y + 0.07, 0);
    const outTo = (i) => () => new THREE.Vector3(WIRES[i].home.x, 0.18, 0);        // 提到管口上方再松手（回到木座上）
    const sandPath = () => [null, new THREE.Vector3(SAND.x + 0.02, 0.09, 0), ...[0, 1, 2, 3, 4, 5].map((j) => new THREE.Vector3(SAND.x + (j % 2 ? 0.02 : -0.02), 0.055, 0)), new THREE.Vector3(XS[0], T_Y + T_LEN + 0.03, 0), into(0)()];

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'sand', title: '打磨铝丝', todo: '拿起<b>铝丝</b>，在<b>砂纸</b>上来回蹭几下（打磨）。', target: () => (S.w[0].carry ? null : wires[0]) },
        { id: 'al', title: '铝丝浸入硫酸铜溶液', todo: '把打磨过的铝丝浸入<b>硫酸铜溶液</b>。', target: () => (S.w[0].carry ? null : wires[0]) },
        { id: 'cuag', title: '铜丝浸入硝酸银溶液', todo: '把一根<b>铜丝</b>浸入<b>硝酸银溶液</b>。', target: () => (S.w[1].carry ? null : wires[1]) },
        { id: 'cual', title: '铜丝浸入硫酸铝溶液', todo: '把另一根<b>铜丝</b>浸入<b>硫酸铝溶液</b>。', target: () => (S.w[2].carry ? null : wires[2]) },
        { id: 'out', title: '取出观察', todo: '过一会儿，把三根丝分别<b>取出来</b>（拖回木座上），看表面。', target: () => { const i = S.w.findIndex((w) => w.at === 'tube'); return i >= 0 ? wires[i] : null; } },
        { id: 'why', title: '想一想', todo: '铝、铜、银的活动性顺序？在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => mw.close() }),
          shots: [
            { cap: '铝丝先在砂纸上打磨（去掉表面的氧化铝薄膜），再浸入硫酸铜溶液。', dur: 7, cam: [[-0.07, 0.06, 0], [0.05, 0.25, 1], 0.3], during: act.path(wires[0].pick, sandPath(), { t0: 0.04, t1: 0.85, release: 0.9 }) },
            { cap: '一根洁净的铜丝浸入硝酸银溶液，另一根浸入硫酸铝溶液。', dur: 6, cam: [[0.02, 0.07, 0], [0.05, 0.25, 1], 0.32],
              during: act.seq(act.path(wires[1].pick, [null, new THREE.Vector3(0, T_Y + T_LEN + 0.03, 0), into(1)()], { t0: 0.04, t1: 0.42, release: 0.45 }), act.path(wires[2].pick, [null, new THREE.Vector3(XS[2], T_Y + T_LEN + 0.03, 0), into(2)()], { t0: 0.5, t1: 0.88, release: 0.9 })) },
            { cap: '钻进铝丝表面看：铝原子变成 Al³⁺ 跑进溶液，溶液里的 Cu²⁺ 落到表面，变成铜原子。', dur: 11, cam: [[XS[0], T_Y + 0.09, 0], [0.04, 0.25, 1], 0.3], during: act.at(0.03, () => { S.focus = 0; openMicro(true); }) },
            { enter: () => mw.close(), cap: '过一会儿：铝丝上长出红色的铜，蓝色变浅；铜丝上长出银白色的银，溶液变蓝；硫酸铝里的铜丝没有变化。', dur: 7, speed: 3, cam: [[0, 0.06, 0], [0.05, 0.22, 1], 0.28] },
            { cap: '取出来看：铝 > 铜 > 银。演示完了，下面换你自己做。', dur: 6,
              during: act.seq(...[0, 1, 2].map((i) => act.path(wires[i].pick, [null, new THREE.Vector3(XS[i], T_Y + T_LEN + 0.04, 0), outTo(i)()], { t0: 0.05 + i * 0.28, t1: 0.25 + i * 0.28, release: 0.27 + i * 0.28 }))) },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ================= 每帧 =================
    const step = (h, t) => {
      const hh = h * SPEED;
      S.w.forEach((w, i) => {
        const g = wires[i], W0 = WIRES[i];
        if (w.at === 'tube') {
          w.lastTube = w.tube; w.inT += hh;
          const R = RX[`${W0.key}|${w.tube}`];
          if (R) {
            const film = W0.key === 'al' ? 0.02 + 0.98 * w.polish : 1;        // 氧化铝薄膜：没打磨反应极慢
            const d = R.rate * film * (1 - w.dep) * hh; w.dep = Math.min(1, w.dep + d); w.depKind = R.dep;
            S.sol[w.tube].ion = Math.min(1, S.sol[w.tube].ion + d * 0.7);
          }
          if (W0.key === 'al' && w.tube === 0 && w.polish < 0.6 && w.inT > 40 && !S.warnedFilm) { S.warnedFilm = true; status('铝丝浸了好一会儿，几乎<b>没有变化</b>：没打磨的铝丝表面有一层致密的<b>氧化铝薄膜</b>。取出来，在砂纸上打磨后再试。'); }
          g.position.lerp(new THREE.Vector3(XS[w.tube], T_Y + 0.004, 0), 0.3); g.rotation.z += (0 - g.rotation.z) * 0.3;
        } else if (w.carry) { const q = w.carry.clone().add(new THREE.Vector3(0, -0.05, 0)); q.y = Math.max(0.002, q.y); g.position.lerp(q, 0.45); g.rotation.z += (0 - g.rotation.z) * 0.25; }        // 最低只到桌面
        else { g.position.lerp(W0.home, 0.2); g.rotation.z += (0 - g.rotation.z) * 0.2; }
        if (W0.key === 'al' && w.polish >= 1 && !S.demo && !bar.has('sand')) { done('sand'); status('铝丝打磨好了，表面发亮。把它浸入<b>硫酸铜溶液</b>。'); }
        // 打磨过的铝丝发亮
        // 打磨过的铝丝发亮；表面盖上一层红色的铜以后变成红褐色
        if (W0.key === 'al') g.mat.color.setHex(0xc7ccd3).lerp(new THREE.Color(0xf2f5f8), w.polish).lerp(new THREE.Color(0xa8442c), w.depKind === 'cu' ? Math.min(1, w.dep * 1.3) : 0);
        for (const n of g.dep.children) n.visible = !!w.depKind && (n.userData.cu ? w.depKind === 'cu' : w.depKind === 'ag') && w.dep * 1.2 > 1 - n.userData.k;
        g.dep.children.forEach((n) => { if (n.visible) n.scale.setScalar(Math.min(1, w.dep * 1.6)); });
      });
      // 溶液颜色
      tubes.forEach((tb, k) => tb.liq.material.color.lerpColors(new THREE.Color(SOL[k].c0), new THREE.Color(SOL[k].c1), S.sol[k].ion));
      // 卡片
      tubes.forEach((tb, k) => {
        const w = S.w.find((x) => x.at === 'tube' && x.tube === k);
        cards[k].text(`<div class="cc"><div class="cc-t"><span class="cc-name">${SOL[k].name}</span></div><div class="cc-more"><div class="cc-obs"><small>${w ? (w.dep > 0.15 ? (w.depKind === 'cu' ? '丝上长出红色的铜' : '丝上长出银白色的银') : '还看不出变化') : '还没放东西'}</small></div></div></div>`)
          .loc(group, XS[k], T_Y + T_LEN + 0.004, 0).show(!!w);
      });
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.26, d: 0.14, h: 0.15 },
      view: { elev: 18, azim: -4, lookY: 0.42, frameMargin: 1.08 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = () => [...W.tbl.el.querySelectorAll('tr')].slice(1).map((tr) => `<div>${[...tr.children].slice(0, 2).map((td) => td.innerHTML).join('：')}</div>`).join('');
        const t2 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '由这三个实验，铝、铜、银的金属活动性由强到弱是——',
          options: ['Al > Cu > Ag', 'Ag > Cu > Al', 'Cu > Al > Ag'],
          wrong: ['看记录：铝能把铜从硫酸铜溶液里置换出来，谁更活泼？', '看记录：铜不能置换硫酸铝里的铝，铜比铝活泼吗？'],
          ok: '对：<b>Al > Cu > Ag</b>。前面的金属能把后面的金属从它们化合物的溶液里置换出来。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); } });
        const t1 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '能发生的两个反应（铝和硫酸铜、铜和硝酸银），属于哪种反应类型？',
          options: ['置换反应：一种单质和一种化合物，生成另一种单质和另一种化合物', '化合反应', '分解反应'],
          wrong: ['反应物是两种，生成物也是两种，不是化合反应。', '反应物有两种，不是分解反应。'],
          ok: '对：都是<b>置换反应</b>——活泼的金属把不活泼的金属从溶液里“换”了出来。',
          onOk: () => t2.open() });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['实验内容', '现象', '化学方程式']);
        const vary = h('details', { class: 'more' }, h('summary', {}, '换个条件再试'), h('p', { class: 'fineprint', html: '铝丝<b>不打磨</b>就浸入硫酸铜溶液，会怎样？（先“全部重来”。）也可以把铝丝浸入硝酸银溶液试试。' }));
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：时间加快 8 倍（真实里要几分钟）；表面长出东西、颜色变化的快慢是示意。' });
        ui.controls.append(t1.el, t2.el, next, vary, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, t1, t2, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('图 8-11、8-12：三支试管里分别是<b>硫酸铜、硝酸银、硫酸铝</b>溶液；前面木座上插着一根铝丝、两根铜丝，左边一张砂纸。可以先看<b>老师演示</b>，也可以直接动手。');
      },
      update(dt, t) {
        const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t);
        const fw = S.focus >= 0 ? S.w[S.focus] : null;
        if (mw.isOpen) {
          if (!fw || fw.at !== 'tube') mw.close();
          else { const st = mwState(), key = `${S.focus}|${st.sol}|${st.film}`; if (key !== mwKey) { mwKey = key; mw.reset(st); } else mw.set(st); }
        }
        mw.update(Math.min(dt, 1 / 30) * Math.min(k, 1.5));
        const p = fw && fw.at === 'tube' ? mwAt() : null;
        if (p) goBtn.loc(group, p.x, T_Y + T_LEN + 0.012, p.z);
        goBtn.show(!!p && !mw.isOpen && !bar.playing);
      },
      dispose() { mw.dispose(); bar.dispose(); },
      debug: { get S() { return S; }, A, bar, picks: { al: wires[0].pick, cu1: wires[1].pick, cu2: wires[2].pick },
        qa: qaFlow(drag, [
          { name: '拿起铝丝', hold: wires[0].pick },
          ...[0, 1, 2, 3, 4, 5].map((j) => ({ name: `打磨 ${j + 1}`, run: () => A.wireDrag(0, new THREE.Vector3(SAND.x + (j % 2 ? 0.02 : -0.02), 0.055, 0)), wait: 0.1 })),
          { name: '浸入硫酸铜', run: () => A.wireDrag(0, into(0)()), wait: 0.3 },
          { name: '松手', release: wires[0].pick, wait: 0.5 },
          { name: '铜丝浸入硝酸银', drag: wires[1].pick, to: into(1), wait: 0.5 },
          { name: '铜丝浸入硫酸铝', drag: wires[2].pick, to: into(2), wait: 4 },
          ...[0, 1, 2].map((i) => ({ name: `取出 ${i + 1}`, drag: wires[i].pick, to: outTo(i), wait: 0.5 })),
          { name: '答第一题', run: () => W.t1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.t2.el.querySelector('button').click() },
        ]) },
    };
  },
};
