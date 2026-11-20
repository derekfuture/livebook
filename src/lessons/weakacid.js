// 人教版高中化学选择性必修 1，第 58 页实验 3-1、图 3-1 和图 3-2。
import * as THREE from 'three';
import { h } from '../ui/Panel.js';
import { lessonBar } from './kit/lessonbar.js';
import { draggable, clamp } from './kit/interact.js';
import { demoActs, mountXuean, moreBox, paperSheet, qaFlow, sandbox, wrapPointer } from './kit/chemlesson.js';
import { micro } from './kit/microworld.js';
import { X, R, RIM, WATER, HOME, ACIDS, PH, GAS_TIME, DISSOCIATION, V, bench, kindOf, bubbleCount, WINDOW, ionizationScene } from './kit/weakacid-parts.js';

const INTRO = '两杯酸体积相同，浓度都是 0.1 mol/L。';
const KEYS = ['ph', 'ec', 'mg'];
const TITLES = ['测 pH', '试验导电能力', '加入等量镁条'];
const TODO = ['把两支 pH 笔分别浸入笔身标明的酸，比较读数。', '把两个导电测试器分别浸入标明的酸，比较灯光。', '将两段镁条分别拖进两只杯口，比较刚放入时的气泡。'];
const HINT = ['拖动 pH 笔，浸入液面', '拖动导电测试器，两极浸入液面', '拿起镁条，放进杯口'];
const MISSING = ['笔尖还没有浸入液面。', '两根电极都要浸入液面，灯才会亮。', '镁条还在杯外。提过杯沿，再从杯口放入。'];
const VALUES = [PH.map((x) => '约 ' + x), ['灯亮', '灯微亮'], ACIDS.map((_, side) => bubbleCount(side, WINDOW) + ' 个气泡')];
const ROWS = ['pH（理论）', '导电测试', '前 3 秒（示意）'];
const aim = (id, side) => V(X[side], id < 4 ? WATER - 0.006 : RIM + 0.004);
const MICRO_CAM = [[0, 0.114, 0], [0, 0.43, 1], 0.32];
// 入液为 0 秒。同一条下落轨迹用于桌面实验和起始片段回放。
function stripHeight(from, age) {
  const elapsed = Math.max(0, age + Math.sqrt((from - WATER) / 0.65));
  return Math.max(0.005, from - 0.65 * elapsed * elapsed);
}
export default {
  id: 'weakacid', title: '盐酸与醋酸的比较', fig: '实验3-1', stampText: '实验', style: 'paper',
  predict: {
    q: '盐酸和醋酸都是 0.1 mol/L。刚放入等量镁条，哪一杯冒泡更快？',
    options: ['一样快，酸的浓度相同', '盐酸更快', '醋酸更快'], answer: 1,
  },
  need: '比较两杯酸的 pH、导电能力和加镁之初的气泡。',
  conclusion: {
    crops: [{ page: 62, rect: [214, 622, 538, 747] }],
    quote: '实验表明，相同物质的量浓度的盐酸和醋酸的pH、导电能力及与活泼金属反应的剧烈程度都有差别，这说明两种酸中H+浓度是不同的，即HCl和CH3COOH的电离程度不同。在稀溶液中，HCl全部电离生成H+和Cl-（如图3-1），CH3COOH只有部分电离生成CH3COO-和H+（如图3-2）。',
    formula: '', src: '课本第 58 页 · 第三章 第一节 电离平衡',
  },
  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    paperSheet(group, { w: 0.45, d: 0.27 });
    const { tools, replayStrips, drawBubbles } = bench(group);
    const bubbling = [false, false];
    const cards = X.map(() => tag('', 'cond wa-card'));
    const timer = tag('', 'pill');
    const scene = ionizationScene();
    let W, cancelled = false;
    const fresh = () => ({
      demo: false, pos: HOME.map((p) => p.clone()), held: -1, returns: HOME.map(() => null),
      seen: KEYS.map(() => [false, false]), last: [-1, -1], wet: -1,
      strips: [-1, -1], age: [-1, -1], drop: [0, 0], replay: -1,
    });
    let S = fresh();
    const ready = (j) => S.seen[j].every(Boolean);
    const available = (id) => id < 4 ? S.strips.every((s) => s < 0) : S.strips[id - 4] < 0;
    const say = (msg) => { if (!S.demo) W?.ui.status(msg); };
    const observed = (j, side) => {
      S.last[side] = j;
      if (S.seen[j][side]) return;
      S.seen[j][side] = true;
      if (S.demo || !W) return;
      W.tbl.set(j, [ROWS[j], ...S.seen[j].map((seen, i) => seen ? VALUES[j][i] : '—')]);
      say(ACIDS[side] + ' · ' + ROWS[j] + ' · ' + VALUES[j][side]);
      if (ready(j)) bar.done(KEYS[j]);
    };
    const sideOf = (x, margin) => X.findIndex((cx) => Math.abs(x - cx) < R - margin);
    const sizeAt = (side, age) => Math.max(0, 1 - Math.max(0, age) / GAS_TIME[side]) ** 0.55;
    const draw = () => {
      tools.forEach(({ g }, id) => {
        g.position.copy(S.pos[id]);
        if (id < 4) g.read(S.held === id ? S.wet : -1);
        else {
          const side = S.strips[id - 4];
          g.scale.setScalar(side < 0 ? 1 : sizeAt(side, S.age[side]));
          g.visible = S.replay < 0 && g.scale.x > 0;
        }
      });
      X.forEach((_, side) => {
        const mg = S.strips.indexOf(side), frame = replayStrips[side];
        const origin = mg < 0 ? HOME[4] : S.pos[mg + 4];
        frame.visible = S.replay >= 0;
        if (frame.visible) {
          frame.position.copy(origin).y = stripHeight(S.drop[mg], S.replay);
          frame.scale.setScalar(sizeAt(side, S.replay));
        }
        bubbling[side] = drawBubbles(side, frame.visible ? S.replay : S.age[side], frame.visible ? frame.position : origin);
      });
    };
    const start = (id) => {
      if (!available(id)) return;
      S.held = id; S.returns[id] = null; S.wet = -1;
    };
    function move(id, p) {
      if (S.held !== id) return;
      const v = S.pos[id], old = v.clone(), margin = kindOf(id) === 0 ? 0.005 : 0.012;
      v.set(clamp(p.x, -0.18, 0.18), clamp(p.y, 0.002, 0.201), 0);
      // 杯壁挡住横移。已在杯内时先提起；从杯外靠近时可以沿杯沿滑入。
      for (const cx of X) {
        const dx = v.x - cx, prev = old.x - cx;
        if (v.y >= RIM + 0.002) continue;
        if (Math.abs(prev) < R - margin && old.y < RIM && Math.abs(dx) >= R - margin) {
          v.x = cx + Math.sign(dx) * (R - margin - 0.0001);
        } else if (Math.abs(prev) > R + margin && old.y < RIM - 0.001 && Math.abs(dx) <= R + margin) {
          v.x = cx + Math.sign(prev) * (R + margin + 0.0001);
        } else if (Math.abs(Math.abs(dx) - R) <= margin) v.y = RIM + 0.002;
      }
      const side = sideOf(v.x, margin);
      if (side >= 0) v.y = Math.max(v.y, id < 4 ? 0.006 : RIM - 0.003);
      if (id < 4 && side >= 0 && side !== id % 2) v.y = Math.max(v.y, RIM + 0.002);
      S.wet = id < 4 && side >= 0 && v.y < WATER - 0.003 ? side : -1;
      if (S.wet >= 0) observed(kindOf(id), S.wet);
      draw();
    }
    function release(id, moved) {
      if (S.held !== id) return;
      const p = S.pos[id], side = sideOf(p.x, kindOf(id) === 0 ? 0.005 : 0.012), mg = id - 4;
      let fall = false;
      if (moved && !cancelled) {
        if (id < 4) {
          if (side >= 0 && side !== id % 2) say('这支探头专用于' + ACIDS[id % 2] + '。请按器材上的名称选杯。');
          else if (S.wet < 0) say(MISSING[kindOf(id)]);
        } else if (side < 0 || p.y > RIM + 0.009) say(MISSING[2]);
        else if (!ready(0) || !ready(1)) say('先测完两杯原溶液。加入镁条后，溶液的组成会改变。');
        else if (S.strips.includes(side)) say('这杯已放入一段镁条。另一段放进另一杯，才能比较。');
        else {
          S.strips[mg] = side;
          S.drop[mg] = p.y;
          S.age[side] = -Math.sqrt((p.y - WATER) / 0.65);
          S.last[side] = 2;
          fall = true;
        }
      }
      if (!fall) S.returns[id] = { from: p.clone(), t: 0, inside: side >= 0 && p.y < RIM };
      S.held = -1; S.wet = -1;
      draw();
    }
    const tip = tag('', 'pill');
    const drag = draggable(group, tools.map(({ g, pick }, id) => ({
      obj: pick, anchor: g, keepOffset: true,
      hint: () => available(id) && !mic.isOpen ? (id < 4 ? ACIDS[id % 2] + '专用 · ' : '') + HINT[kindOf(id)] : '',
      enabled: () => available(id) && !mic.isOpen,
      onStart: () => start(id), onDrag: (p) => move(id, p), onEnd: (moved) => release(id, moved),
    })), { tip });
    const act = demoActs(drag, group);
    const camAt = () => V(0, MICRO_CAM[0][1] - 0.05);
    const mic = micro({
      tag, look, back, group, scene, bar: () => bar, label: '钻进去看',
      at: camAt, btnAt: () => V(0, innerWidth <= 760 ? 0.045 : 0.019, 0.065), lookD: MICRO_CAM[1], dist: MICRO_CAM[2], scale: 0.012,
      show: () => ready(0) && S.held < 0 && S.replay < 0 && (!S.strips.every((side) => side >= 0) || ready(2)), state: () => ({ ec: ready(1), mg: ready(2) }),
    });
    const sb = sandbox({ get: () => S, set: (s) => { S = s; }, fresh, apply: draw,
      view: { save: () => mic.isOpen ? scene.snapshot() : null,
        restore: (t) => { scene.resume(t); mic.open(); } } });
    const target = (j) => {
      if (mic.isOpen || S.held >= 0) return null;
      if (j < 2) return tools[2 * j + Math.max(0, S.seen[j].indexOf(false))].g;
      const mg = S.strips.findIndex((side) => side < 0);
      return mg >= 0 ? tools[mg + 4].g : null;
    };
    const seq = [[0, 0], [1, 1], [2, 0], [3, 1], [4, 0], [5, 1]];
    const demoCaps = ['将 pH 笔浸入盐酸，读数。', '用醋酸专用的 pH 笔测量，比较读数。', '把导电测试器的两极浸入盐酸，看指示灯。', '换用醋酸专用的测试器，比较灯光。', '把一段镁条放入盐酸，观察气泡。', '把等量镁条放入醋酸，比较刚放入时的气泡。'];
    const shots = seq.map(([id, side], k) => {
      const to = aim(id, side), high = RIM + 0.034;
      return { cap: demoCaps[k], dur: 3.35,
        during: act.path(tools[id].pick, [HOME[id], V(HOME[id].x, high), V(to.x, high), to],
          { t0: 0.06, t1: 0.49, release: id < 4 ? 0.82 : 0.57 }) };
    });
    const bar = lessonBar({
      look, back, group, ringOptions: { minOpacity: 0.63 },
      steps: KEYS.map((id, i) => ({ id, title: TITLES[i], todo: TODO[i], target: () => target(i) })),
      reels: { demo: { label: '老师演示', onStart() { sb.onStart(); mic.close(); },
        onEnd() { mic.close(); sb.onEnd(); },
        shots: [...shots, { cap: '从各自入液的一刻起，并排重看前 3 秒的气泡。', dur: 6.6 }, { cap: '重看两种酸在水中电离的过程。', cam: MICRO_CAM, dur: 11, enter: () => mic.open(true) }] } },
    });
    const wrap = wrapPointer(drag, bar);
    const pointer = { ...wrap, up(ray, e) {
      cancelled = e?.type === 'pointercancel';
      try { return wrap.up(ray, e); } finally { cancelled = false; }
    } };
    function advance(dt) {
      S.returns.forEach((r, id) => {
        if (!r) return;
        const u = clamp((r.t += dt) / 0.43, 0, 1), p = S.pos[id];
        if (r.inside && u < 0.35) p.copy(r.from).y += (RIM + 0.004 - r.from.y) * u / 0.35;
        else {
          const f = r.inside ? (u - 0.35) / 0.65 : u;
          p.copy(r.from); if (r.inside) p.y = RIM + 0.004;
          p.lerp(HOME[id], f * f * (3 - 2 * f));
        }
        if (u === 1) S.returns[id] = null;
      });
      S.strips.forEach((side, mg) => {
        if (side < 0) return;
        S.age[side] = Math.min(GAS_TIME[side] + 2, S.age[side] + dt);
        S.pos[mg + 4].y = stripHeight(S.drop[mg], S.age[side]);
      });
      if (S.replay < 0) {
        if (!ready(2) && S.age.every((t) => t >= WINDOW)) {
          S.replay = 0;
          say('同步回放：从两段镁条各自入液的一刻开始。');
        }
      } else if (S.replay < WINDOW) {
        S.replay = Math.min(S.replay + dt, WINDOW);
      } else {
        S.replay = -1;
        if (ready(2)) return;
        X.forEach((_, side) => observed(2, side));
        if (S.demo) return;
        W.ui.observePrediction(`入液后前 3 秒，盐酸产生 ${VALUES[2][0]}，醋酸产生 ${VALUES[2][1]}（示意）。`);
        W.replay.hidden = W.review.hidden = false;
        say('已记录两杯各自入液后前 3 秒产生的气泡。');
      }
    }
    function showCards() {
      const narrow = innerWidth <= 760;
      timer.text(`同步回放 · ${Math.max(0, S.replay).toFixed(1)} / 3 秒`).loc(group, 0, narrow ? 0.137 : RIM + 0.025, 0).show(S.replay >= 0 && !mic.isOpen);
      X.forEach((x, side) => {
        const j = S.last[side];
        let obs = j < 0 ? '无色' : j === 0 ? 'pH ≈ ' + PH[side] + '（理论）' : j === 1 ? '测时' + VALUES[j][side] : bubbling[side] ? '冒气泡' : '无气泡';
        if (S.replay >= 0) obs = `累计 ${bubbleCount(side, S.replay)} 个`;
        if (S.wet === side && S.held >= 0 && S.held < 4) obs = kindOf(S.held) ? VALUES[1][side] : 'pH ≈ ' + PH[side] + '（理论）';
        const card = cards[side].text(`<div class="cc"><div class="cc-t"><span class="cc-name">${ACIDS[side]}</span><span class="cc-res">${obs}</span></div></div>`);
        if (narrow && j === 2) card.loc(group, x, 0.105, 0);
        else card.loc(group, x, narrow ? 0.021 : 0.008, narrow ? 0.039 : 0.080);
        card.show(!mic.isOpen && !S.demo && j >= 0);
      });
    }
    const initRows = () => ROWS.forEach((row) => W.tbl.add([row, '—', '—'], { highlight: false }));
    function reset() {
      bar.stop(); mic.close(); S = fresh(); draw(); showCards();
      W.tbl.clear(); initRows(); W.review.hidden = W.replay.hidden = true;
      W.ui.el.querySelectorAll('details[open]').forEach((el) => { el.open = false; });
      W.ui.observePrediction(null); W.ui.relock(); bar.undo(...KEYS); bar.say(null); say(INTRO);
    }
    const qa = qaFlow(drag, [...seq.map(([id, side]) => ({
      name: ACIDS[side] + ' · ' + TITLES[kindOf(id)], drag: tools[id].pick, to: aim(id, side), wait: id === 5 ? 8 : 1.3,
    })), { name: '核对观察记录', run() {
      if (!KEYS.every((_, j) => ready(j)) || !bar.finished || W.review.hidden) throw new Error('三组对照未完成');
    } }, { name: '钻进去看', run: () => mic.open(), wait: 1 }, { name: '回到桌上', run: () => mic.close() }]);
    const skin = h('style', {}, `
      .weakacid-page table.data {table-layout:fixed;width:100%}
      .weakacid-page table.data th:first-child {width:38%}
      .wa-card .cc-res {animation:none;transform:none}
      .weakacid-page table.data th,.weakacid-page table.data td {text-align:center}
      .weakacid-micro.holo .mw-dim {background:rgba(247,245,236,.84);mask-image:none;-webkit-mask-image:none}
      .weakacid-micro.holo .mw-hud {top:125px!important}
      .wa-ratio {display:grid;grid-template-columns:2.3em 1fr 4.5em;align-items:center;gap:8px;max-width:300px;margin:4px auto;font:14px/1.15 system-ui;letter-spacing:0;text-align:left}
      .wa-track {height:7px;background:#d2d7d0;border-radius:3px;overflow:hidden}
      .wa-track i {display:block;height:100%;background:#376764}
      .weakacid-micro .mw-eq sup {font-size:0.60em}
      .weakacid-page .big-next:disabled {display:none}
      .weakacid-page .answer .src {padding-right:53px; min-height:42px}
      .weakacid-page .seal-stamp {font-size:16px;right:14px;bottom:13px}
      .weakacid-micro .mw-eq {font-size:clamp(17px,1.65vw,24px);line-height:1.45}
      .weakacid-micro .mw-cap {font-size:15px}
      .weakacid-demo .p-body {visibility:hidden}
      @media(max-width:760px){
        body.lesson-on #viewctl {top:45px;bottom:auto;right:8px;flex-direction:row;gap:4px;align-items:center;pointer-events:none}
        body.lesson-on #viewctl button {pointer-events:auto}
        #viewctl .show-tg:last-of-type,#viewctl .lesson-community {margin:0}
        #viewctl .lesson-community {border:0;padding:0}
        body.lesson-on:not(.predicting):not(.hide-steps) .lbar.do,body.lesson-on .lbar.film {display:grid;grid-template-columns:auto 1fr auto auto;gap:3px 6px;padding:5px 8px;font-size:13px;line-height:1.25}
        .lbar .lb-main {grid-column:2 / -1}
        .lbar .lb-steps {grid-column:2;max-width:none;flex-wrap:nowrap;gap:3px}
        .lbar .lb-seal {writing-mode:horizontal-tb;white-space:nowrap}
        .weakacid-micro .mw-hud,.weakacid-micro .mw-scale {left:10px!important;width:calc(100vw - 20px)!important}
        .weakacid-micro.holo .mw-hud {top:37vh!important;background:#fffdf2ed;padding:5px;box-sizing:border-box}
        .weakacid-micro .mw-scale {top:77px!important;text-align:center;font-size:12px}
        .weakacid-micro .mw-close {left:auto!important;right:10px;top:38px!important}
      }
    `);
    document.head.append(skin);
    const layers = document.querySelectorAll('.mw'), layer = layers[layers.length - 1];
    layer.classList.add('weakacid-micro');
    const scaleNote = layer.querySelector('.mw-scale');
    scaleNote.textContent = '电离比例 · 25 ℃，0.1 mol/L（理论）';
    for (const [i, percent] of [100, Number(DISSOCIATION)].entries()) {
      scaleNote.append(h('div', { class: 'wa-ratio' }, ACIDS[i],
        h('span', { class: 'wa-track' }, h('i', { style: 'width:' + percent + '%' })),
        h('span', {}, (i ? '约 ' : '') + percent + '%')));
    }
    draw();
    return {
      group: root, card: false, pointer, toggles: ['cards', 'steps'],
      size: { w: 0.35, d: 0.16, h: 0.20 }, view: { azim: 0, elev: 23, lookY: 0.45, frameMargin: 1.10 },
      mount(ui) {
        const replay = h('button', { class: 'go ghost', hidden: true, onclick: () => { S.replay = 0; } }, '重看入液后前 3 秒');
        const review = h('details', { class: 'more', hidden: true }, h('summary', {}, '想一想（选做）'),
          h('p', { class: 'fineprint' }, '两杯酸的浓度相同。哪杯里能自由移动的离子更多？这怎样解释灯的亮暗？'));
        const model = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'),
          h('p', { class: 'fineprint' }, '按 25 ℃ 理想稀溶液估算 pH。盐酸全部电离；醋酸按 Kₐ = 1.75 × 10⁻⁵ 计算（课本第 62 页第 6 题）。'),
          h('p', { class: 'fineprint' }, '按课本第 58 页实验 3-1，取等体积的两种酸和等量镁条。两杯各用专用的洁净探头，导电测试条件相同。两段镁都能反应完。灯光亮暗、气泡个数和反应时间为示意。'),
          h('p', { class: 'fineprint' }, '图 3-1、图 3-2 将水中的 H⁺ 画作 H₃O⁺。特写每次只展示一个酸分子向水转移质子的过程。比例条表示平衡时已电离的比例。'));
        W = { ...mountXuean(ui, { controls: [replay, review, model, moreBox([], reset)], headers: ['比较项目', ...ACIDS], intro: INTRO }), ui, review, replay };
        initRows(); ui.el.classList.add('weakacid-page');
        const next = ui.data.nextElementSibling;
        next.classList.add('big-next'); ui.controls.prepend(next); W.next.remove();
        ui.observePrediction(null); bar.attach(ui);
      },
      update(dt) {
        const k = bar.update(dt);
        advance(dt * k); draw(); showCards();
        W?.ui.el.classList.toggle('weakacid-demo', S.demo);
        mic.update(dt, k);
      },
      reset,
      dispose() { skin.remove(); W?.ui.el.classList.remove('weakacid-page', 'weakacid-demo'); bar.dispose(); mic.dispose(); drag.dispose(); },
      debug: { get S() { return S; }, qa, bar, mic },
    };
  },
};
