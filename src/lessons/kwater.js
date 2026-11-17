// 人教版高中化学必修第一册第 100 页 探究“碱金属化学性质的比较”（图4-9 钾与水反应）：回忆钠与水反应的现象，观察钾与水反应（由教师演示）。
// 两个烧杯都加了水、滴了几滴酚酞；滤纸上是切好、吸干煤油的两小块（绿豆大）：钠和钾。用镊子分别投进左、右两杯，比较“难易程度”。
// 第 101 页的结论：碱金属元素的化学性质相似（最外层都是 1 个电子），并且有递变性——从锂到铯金属性逐渐增强，钾的反应比钠剧烈。
// 模型：钠、钾共用 kit/sodium.js 的 metalWater（球表面退缩、放热升温、熔化、氢气推着走、酚酞显色）；钾按课本表 4-2（密度 0.86、熔点 63.65 ℃），
//   表面反应快约 3 倍（教学近似），绿豆大一块一两秒就着火、冒白烟。钠绿豆大不着火。时间按实秒。
//   钻进去看：钠、钾原子的结构（课本第 99 页的表），最外层电子交给水里的氢。
import * as THREE from 'three';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs, mountXuean, moreBox } from './kit/chemlesson.js';
import { draggable, clamp } from './kit/interact.js';
import { tweezers, metalWater, alkaliScene, NAM, KM } from './kit/sodium.js';
import { micro } from './kit/microworld.js';
import { textPlate } from './kit/props.js';
import { paint, inked } from '../live/ink.js';
import { sfx } from './kit/audio.js';
import { h } from '../ui/Panel.js';

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const CUP = { na: V(-0.075, 0, -0.01), k: V(0.075, 0, -0.01) };
const PAPER = V(0, 0.002, 0.065), TW = V(-0.032, 0.003, 0.108);
const PIECE = { na: V(-0.014, 0.006, 0.065), k: V(0.014, 0.006, 0.065) };
const NAME = { na: '钠', k: '钾' }, MASS = { na: NAM.mass, k: KM.mass };
// 平放在纸上的字牌：字号按牌子大小定（textPlate 的画布总是 512 宽）
const plate = (text, w, h) => textPlate(text, { w, h, color: '#23293a', bg: '#fffaf0', font: `bold ${Math.floor(Math.min(0.8 * 512 * h / w, 0.82 * 512 / text.length))}px "Songti SC", serif` });
const WORD = { float: '浮在水面', melt: '熔成闪亮的小球', move: '四处游动', hiss: '嘶嘶响', red: '溶液变红', fire: '<b>着火，火焰带紫色，冒白烟</b>' };

export default {
  id: 'kwater',
  fig: '图4-9',
  title: '碱金属化学性质的比较：钠、钾与水',
  stampText: '探究',
  style: 'paper',
  predict: {
    q: '钾和钠一样，原子最外层只有 1 个电子，但多一个电子层、原子半径更大。把绿豆大的钾投进水里，和钠比会怎样？',
    hint: '课本第 100 页探究。先猜，再看两杯对比。',
    options: ['比钠剧烈', '和钠差不多', '比钠缓和'],
    answer: 0,
  },
  need: '用镊子把绿豆大的钠、钾分别投进两杯滴了酚酞的水里，比较现象和反应的难易程度（课本里钾的实验由教师演示）',
  conclusion: {
    crops: [{ page: 104, rect: [221, 699, 535, 741] }, { page: 105, rect: [64, 55, 382, 347] }],
    quote: '（1）碱金属元素的化学性质相似。碱金属元素的原子最外层电子数相同，都是1 个电子，它们的化学性质相似，都能与氧气等非金属单质以及水反应。……而且，上述反应的产物中，碱金属元素的化合价都是+1 价。（2）碱金属元素的化学性质具有递变性。随着核电荷数的增加，碱金属元素原子的电子层数逐渐增多，原子半径逐渐增大，原子核对最外层电子的引力逐渐减弱，原子失去最外层电子的能力逐渐增强。即从锂到铯，金属性逐渐增强。例如，碱金属单质与氧气或水反应时，钠的反应比锂剧烈；钾的反应比钠剧烈',
    formula: '2Na + 2H₂O ══ 2NaOH + H₂↑　　2K + 2H₂O ══ 2KOH + H₂↑',
    why: '相似：两杯都浮在水面、熔成小球、四处游动、嘶嘶响、溶液变红——钠、钾都能和水反应，生成碱和氢气，产物里都是 +1 价（最外层只有 1 个电子，容易失去）。<br>不同：钾熔得更快、游得更急，<b>一两秒就着火</b>，比钠剧烈得多。钾比钠多一个电子层，原子半径更大，原子核对最外层电子的引力更弱，这个电子更容易失去——<b>金属性更强</b>。由此推断：锂与水反应比钠缓和。',
    src: '课本第 100–101 页 · 第四章 第一节 原子结构与元素周期表',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    paperSheet(group, { w: 0.3, d: 0.2, x: 0, z: 0.035 });

    // ---- 两个烧杯（水 + 几滴酚酞）----
    const rigs = {
      na: metalWater(group, { at: CUP.na, metal: NAM, onSee: (k) => seen('na', k) }),
      k: metalWater(group, { at: CUP.k, metal: KM, flame: { core: 0xfff6fb, mid: 0xf1c6ff, edge: 0xc48cf2, w: 0.011, h: 0.024 }, onSee: (k) => seen('k', k) }),
    };
    for (const key of ['na', 'k']) { const lab = key === 'na' ? plate('钠（回忆）', 0.03, 0.009) : plate('钾', 0.012, 0.009); lab.position.set(CUP[key].x, 0.0012, CUP[key].z + 0.045); lab.rotation.x = -Math.PI / 2; group.add(lab); }
    // ---- 玻璃片上的滤纸，两小块金属；镊子 ----
    const glass = inked(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.0018, 0.045), paint(0xd5e2e5, { transparent: true, opacity: 0.3, depthWrite: false })), { width: 0.6 }); glass.position.copy(PAPER).setY(0.0012); group.add(glass);
    const paper = inked(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.0007, 0.038), paint(0xfffced)), { width: 0.6 }); paper.position.copy(PAPER).setY(0.0026); group.add(paper);
    const metalMat = paint(0xdce2e8, { keep: true });
    const pieces = {};
    for (const k of ['na', 'k']) {
      pieces[k] = inked(new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.006, 0.008), metalMat), { width: 0.5 }); pieces[k].position.copy(PIECE[k]); group.add(pieces[k]);
      const lab = plate(NAME[k], 0.009, 0.008); lab.rotation.x = -Math.PI / 2; lab.position.set(PIECE[k].x, 0.0032, PIECE[k].z + 0.0125); group.add(lab);
    }
    const tw = tweezers(); tw.position.copy(TW); group.add(tw);
    const held = inked(new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.006, 0.008), metalMat), { width: 0.5 }); held.position.x = -0.006; held.visible = false; tw.add(held);

    const fresh = () => ({ demo: false, near: false, tw: { pos: TW.toArray(), drag: false, motion: null }, held: '', used: { na: false, k: false }, rig: { na: rigs.na.fresh(), k: rigs.k.fresh() }, row: { na: -1, k: -1 }, saw: { na: [], k: [] } });
    S = fresh();
    const bind = () => { rigs.na.s = S.rig.na; rigs.k.s = S.rig.k; };
    bind();

    // ---- 观察记录：每种金属一行，现象一样样长出来 ----
    const rowOf = (key) => [key === 'na' ? '钠（回忆）' : '钾', S.saw[key].map((w) => WORD[w]).join('、') || '—', S.rig[key].finished ? `约 ${Math.round(S.rig[key].doneAt)} 秒` : '还在反应'];
    const record = (key) => { if (S.demo || !W) return; if (S.row[key] < 0) S.row[key] = W.tbl.add(rowOf(key)) - 1; else W.tbl.set(S.row[key], rowOf(key)); };
    function seen(key, k) {
      const r = S.rig[key];
      if (k === 'done') { r.doneAt = r.clock; record(key); if (S.rig.na.finished && S.rig.k.finished) { done('compare'); if (!S.demo) { W?.t1.open(); status('两块都反应完了。看看记录：哪些现象相同？哪一个更剧烈？在左边作答。'); } } return; }
      if (WORD[k]) { S.saw[key].push(k); record(key); }
      if (key === 'k' && k === 'fire') status('钾<b>着火了</b>，还冒白烟——比钠剧烈得多。注意：不要近距离俯视烧杯。');
    }

    // ---- 镊子：拖过去松手。靠近哪块就夹起哪块（夹起后放回手边），靠近对应的烧杯就投进去 ----
    const DOCK = { na: () => PIECE.na.clone().add(V(0.006, 0.001, 0)), k: () => PIECE.k.clone().add(V(0.006, 0.001, 0)), cupna: () => CUP.na.clone().add(V(0.004, rigs.na.LEVEL + 0.012, 0)), cupk: () => CUP.k.clone().add(V(0.004, rigs.k.LEVEL + 0.012, 0)) };
    const travel = (dest, event) => { const t = S.tw, p = V(...t.pos), up = Math.max(0.115, p.y, dest.y + 0.025); t.drag = false; t.motion = { points: [V(p.x, up, p.z).toArray(), V(dest.x, up, dest.z).toArray(), dest.toArray()], event }; };
    const home = () => travel(TW.clone(), '');
    const events = {
      take: (k) => { S.held = k; sfx.clink({ freq: 1800, gain: 0.02 }); status(`镊子夹起了绿豆大的${NAME[k]}。拖到${k === 'na' ? '左边' : '右边'}烧杯上方，松手投进去。`); },
      put: (k) => { S.held = ''; S.used[k] = true; rigs[k].drop(MASS[k], 0.004, 0); done(k); sfx.clink({ freq: 1400, gain: 0.02 }); status(k === 'k' ? '钾投进去了：看它和钠有什么不同。不要近距离俯视烧杯。' : `钠投进去了：回忆一下它在水里的样子。${S.used.k ? '' : '再夹起钾，投进右边烧杯。'}`); },
    };
    const release = () => {
      const p = V(...S.tw.pos);
      if (!S.held) {
        for (const k of ['na', 'k']) if (!S.used[k] && Math.abs(p.x - PIECE[k].x) < 0.022 && p.y < 0.06) return travel(DOCK[k](), `take:${k}`);
        return home();
      }
      for (const k of ['na', 'k']) if (Math.abs(p.x - CUP[k].x) < 0.05 && p.y > 0.03) {
        if (S.held !== k) { status(`这一杯留给${NAME[k]}：两种金属一左一右对比。`); return home(); }
        return travel(DOCK[`cup${k}`](), `put:${k}`);
      }
      home();
    };
    const drag = draggable(group, [
      { obj: tw.pick, plane: 'xy', offset: 0.06, keepOffset: true, anchor: tw,
        hint: () => (S.near ? '' : S.held ? `镊子：拖到${S.held === 'na' ? '左边' : '右边'}烧杯上方，松手投进去` : '镊子：拖到滤纸上的小块，松手夹起（不要用手直接接触）'),
        onStart: () => { S.tw.drag = true; S.tw.motion = null; },
        onDrag: (p) => { S.tw.pos = [clamp(p.x, -0.17, 0.17), clamp(p.y, 0.008, 0.2), 0.06]; },
        onEnd: (moved) => { S.tw.drag = false; if (moved) release(); else home(); } },
    ], { tip: tag('', 'pill'), highlight: true });
    const act = demoActs(drag, group);
    const mic = micro({ tag, look, back, group, scene: alkaliScene(), at: () => V(0, 0.115, -0.01), btnAt: () => V(0, 0.092, -0.01), label: '钻进去看原子',
      state: () => ({ na: S.rig.na.total > 0, k: S.rig.k.total > 0 }), key: () => `${S.rig.na.total > 0}|${S.rig.k.total > 0}`, bar: () => bar, scale: 0.0085, lookD: [0.02, 0.18, 1], dist: 0.27 });
    const kMark = new THREE.Object3D(); kMark.position.set(CUP.k.x, 0.07, CUP.k.z); group.add(kMark);          // 连拍特写用
    const A = {
      reset() { if (bar.playing) bar.stop(); S = fresh(); bind(); rigs.na.reset(); rigs.k.reset(); bind(); tw.position.copy(TW); tw.rotation.set(0, 0, 0); mic.close(); W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.t3.close(); W.next.hidden = true; W.ui.relock(); } bar.undo('na', 'k', 'compare', 'why'); status('两杯水和两小块金属都换新的了。'); },
    };
    // 演示：镊子沿路线拿过去（和学生拖的同一套处理）
    const demoPath = (to, t0, t1) => act.path(tw.pick, [null, () => V(tw.position.x, 0.14, 0.06), () => to().setY(Math.max(0.14, to().y)), to], { t0, t1, release: t1 + 0.02 });
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'na', title: '投钠（回忆）', todo: '用<b>镊子</b>夹起滤纸上的<b>钠</b>，投进左边烧杯（水里滴了酚酞）。', target: () => tw },
        { id: 'k', title: '投钾', todo: '再用镊子夹起<b>钾</b>，投进右边烧杯。不要近距离俯视烧杯。', target: () => tw },
        { id: 'compare', title: '比较', todo: '看两杯：哪些现象相同？哪一个更剧烈？等两块都反应完。也可以<b>钻进去看原子</b>。', target: () => null },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; bind(); }, fresh, bar: () => bar, apply: () => { bind(); rigs.na.clearFx(); rigs.k.clearFx(); tw.position.fromArray(S.tw.pos); mic.close(); } }),
          shots: [
            { cap: '回忆：绿豆大的钠投进滴了酚酞的水里——浮在水面、熔成小球、四处游动、嘶嘶响、溶液变红。', dur: 8, cam: [[-0.04, 0.05, 0.02], [0.02, 0.4, 1], 0.3], during: act.seq(demoPath(DOCK.na, 0.03, 0.22), demoPath(() => DOCK.cupna().setY(0.12), 0.42, 0.58)) },
            { cap: '钾（由教师演示）：同样浮、熔、游、响、变红，但熔得更快、游得更急，一两秒就着火，冒白烟。', dur: 9, cam: [[0.04, 0.05, 0.02], [0.02, 0.4, 1], 0.3], during: act.seq(demoPath(DOCK.k, 0.03, 0.2), demoPath(() => DOCK.cupk().setY(0.12), 0.38, 0.52)) },
            { cap: '钻进去看：钾比钠多一个电子层，原子半径更大，最外层电子离核更远、受的引力更弱，更容易失去——金属性更强。演示完了，换你自己做。', dur: 10, cam: [[0, 0.12, 0], [0.02, 0.3, 1], 0.34], enter: () => mic.open(true), during: act.at(0.98, () => mic.close()) },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    const step = (dt, t) => {
      const T = S.tw;
      if (T.motion) {
        const p = V(...T.pos), goal = V(...T.motion.points[0]), d = goal.clone().sub(p);
        p.addScaledVector(d, Math.min(1, dt * 0.26 / Math.max(0.00001, d.length()))); T.pos = p.toArray();
        if (p.distanceTo(goal) < 0.0005) {
          T.motion.points.shift();
          if (!T.motion.points.length) { const [ev, k] = T.motion.event.split(':'); T.motion = null; if (events[ev]) { events[ev](k); home(); } }
        }
      }
      tw.position.lerp(V(...T.pos), 1 - Math.exp(-dt * 26));
      const overCup = ['na', 'k'].some((k) => Math.abs(tw.position.x - CUP[k].x) < 0.045) && tw.position.z < 0.035 && tw.position.y < 0.14;
      tw.rotation.z += ((overCup ? Math.PI / 2 : 0) - tw.rotation.z) * Math.min(1, dt * 12);
      held.visible = !!S.held;
      for (const k of ['na', 'k']) pieces[k].visible = !S.used[k] && S.held !== k;
      rigs.na.step(dt, t); rigs.k.step(dt, t);
      mic.update?.(dt);
    };

    return {
      group: root, pointer, card: false, toggles: ['steps'],
      size: { w: 0.29, d: 0.17, h: 0.12 },
      view: { elev: 26, azim: -4, lookY: 0.4, frameMargin: 1.04 },
      mount(ui) {
        const ctx = () => `<div>钠：${S.rig.na.finished ? `${S.saw.na.map((w) => WORD[w]).join('、')}；约 ${Math.round(S.rig.na.doneAt)} 秒反应完` : '还没做完'}</div><div>钾：${S.rig.k.finished ? `${S.saw.k.map((w) => WORD[w]).join('、')}；约 ${Math.round(S.rig.k.doneAt)} 秒反应完` : '还没做完'}</div>`;
        const atoms = '<div>钠：+11，2 8 1，原子半径 0.186 nm；钾：+19，2 8 8 1，原子半径 0.227 nm（课本第 99 页）</div>';
        const t3 = think({ q: '钾比钠更容易和水反应，这和原子结构有什么关系？', ctx: () => ctx() + atoms, options: ['钾多一个电子层，原子半径更大，原子核对最外层电子的引力更弱，更容易失去这个电子', '钾的密度比钠小', '钾的熔点比钠低'], wrong: ['密度只决定浮不浮。', '熔点低让它熔得快，但不是它更容易反应的原因。'], ok: '对：从锂到铯，电子层数增多、原子半径增大，原子失去最外层电子的能力逐渐增强，金属性逐渐增强（课本第 101 页）。', status: (m) => W?.status(m), onOk: () => { done('why'); if (W) W.next.hidden = false; } });
        const t2 = think({ q: '比较钾、钠与水反应的难易程度。由此推断：锂与水反应会怎样？', ctx, options: ['钾比钠剧烈；锂比钠缓和', '钠比钾剧烈；锂比钾还剧烈', '差不多；锂也差不多'], wrong: ['看看记录：谁反应得快？谁着火了？', '时间和着火都不一样：钾快得多。'], ok: '对：钾比钠剧烈。锂在钠的上面一行（电子层更少、原子半径更小），与水反应比钠缓和。', status: (m) => W?.status(m), onOk: () => t3.open() });
        const t1 = think({ q: '钠、钾与水反应，有哪些相同的现象？说明它们的化学性质怎样？', ctx, options: ['都浮在水面、熔成小球、游动、嘶嘶响、溶液变红：都和水反应生成碱和氢气，化学性质相似', '现象完全一样，没有区别', '只有钾能和水反应'], wrong: ['再看看记录：钾还着火了，反应得也快。', '钠也和水反应，左边那杯也变红了。'], ok: '对：2Na + 2H₂O ══ 2NaOH + H₂↑，2K + 2H₂O ══ 2KOH + H₂↑，产物里都是 +1 价（课本第 101 页）。', status: (m) => W?.status(m), onOk: () => t2.open() });
        const more = moreBox([['钻进去看原子', () => mic.open()]], () => A.reset());
        const note = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'), h('p', { class: 'fineprint', html: '绿豆大按钠 40 mg、钾 35 mg（体积相近）计；水约 150 mL、22 ℃；钠、钾的直径放大 3 倍画（示意）。<br>密度、熔点按课本表 4-2；反应热钠约 184、钾约 196 kJ/mol；钾的表面反应速度按钠的 3 倍取（教学近似），升到约 420 ℃ 时氢气被点燃（示意）。时间按实秒。<br>原子结构按课本第 99 页的表；“钻进去看”里最外层电子跳走的快慢只表示难易（慢放示意）。<br>课本里钾的实验由教师演示，要离远些；不要近距离俯视烧杯。' }));
        const base = mountXuean(ui, { controls: [more, note], headers: ['金属', '现象', '反应完用时'], intro: '两杯水都滴了几滴酚酞；滤纸上是切好、吸干煤油的绿豆大的钠和钾。用镊子先投钠（回忆），再投钾，比较。' });
        ui.data.append(t1.el, t2.el, t3.el, base.next);
        W = { ...base, ui, t1, t2, t3, status: ui.status }; bar.attach(ui);
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { bar.dispose(); drag.dispose(); mic.dispose?.(); rigs.na.dispose(); rigs.k.dispose(); },
      debug: {
        get S() { return S; }, bar, A, rigs, kcup: kMark,
        picks: { tw: tw.pick },
        qa: qaFlow(drag, [
          { name: '夹钠', drag: tw.pick, to: () => DOCK.na(), wait: 2.5 },
          { name: '投钠', drag: tw.pick, to: () => DOCK.cupna().setY(0.12), wait: 2.5 },
          { name: '夹钾', drag: tw.pick, to: () => DOCK.k(), wait: 2.5 },
          { name: '投钾', drag: tw.pick, to: () => DOCK.cupk().setY(0.12), wait: 3, scale: 1 },
          { name: '钻进去看', run: () => mic.open(), wait: 4 },
          { name: '合上', run: () => mic.close(), wait: 1 },
          { name: '等反应完', run: () => {}, wait: 24 },
          { name: '核对', run: () => { const a = S.rig.na, b = S.rig.k; if (!(a.finished && b.finished && b.seen.fire && !a.seen.fire && b.doneAt < a.doneAt)) throw new Error(JSON.stringify({ na: [a.finished, a.doneAt, a.seen], k: [b.finished, b.doneAt, b.seen] })); }, wait: 1 },
          { name: '想一想 1', run: () => W.t1.el.querySelector('button').click() },
          { name: '想一想 2', run: () => W.t2.el.querySelector('button').click() },
          { name: '想一想 3', run: () => W.t3.el.querySelector('button').click() },
        ]),
      },
    };
  },
};
