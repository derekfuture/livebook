// 人教版高中化学 选择性必修 1 第 38 页，实验 2-2、图 2-6。
import * as THREE from 'three';
import { h } from '../ui/Panel.js';
import { draggable } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { demoActs, mountXuean, moreBox, paperSheet, qaFlow, sandbox, wrapPointer } from './kit/chemlesson.js';
import { micro } from './kit/microworld.js';
import { V, I, II, AXIS, LEFT, UNIT, gripAt, volumeAt, equilibrium, FORMULA, syringe, pressureScene } from './kit/eqpressure-parts.js';

const INTRO = '50 mL 注射器已吸入 20 mL NO₂ 和 N₂O₄ 的混合气体，活塞在Ⅰ处，细管端已用橡胶塞封闭。';
const PULL = '向右拉活塞，让黑色胶头的左边缘对准Ⅱ，看气体颜色。';
const PUSH = '向左推活塞，让黑色胶头的左边缘对准Ⅰ，再看颜色。';
const WAIT = '保持活塞位置，观察管内红棕色接下来怎样变化。';
const AGAIN = '可以反复推拉活塞，比较每次刚移动和停住后的颜色。';
const compare = d => d > 0.012 ? '变深' : d < -0.012 ? '变浅' : '变化不明显';
const at = (v, mark) => Math.abs(v - mark) < 0.065;
const position = v => at(v, I) ? 'Ⅰ' : at(v, II) ? 'Ⅱ' : v < I ? 'Ⅰ左侧' : '两线间';
const CAM = [[0, 0.096, 0], [0.02, 0.53, 1], 0.36];

export default {
  id: 'eqpressure', title: '压强对化学平衡的影响', fig: '实验2-2 · 图2-6', stampText: '实验', style: 'paper',
  predict: {
    q: '把活塞从Ⅰ拉到Ⅱ并停住。管内的红棕色会怎样变化？',
    options: ['变浅后一直保持', '先变浅，又逐渐变深', '从一开始就逐渐变深'], answer: 1,
  },
  need: '拉出、推回活塞，观察两次颜色变化。',
  conclusion: {
    crops: [{ page: 42, rect: [220, 500, 536, 626] }],
    quote: '实验表明，把注射器的活塞往外拉，管内容积增大，气体的压强减小，浓度减小，混合气体的颜色先变浅又逐渐变深。颜色逐渐变深是因为生成了更多的NO2。把注射器的活塞往里推，管内容积减小，气体的压强增大，浓度增大，混合气体的颜色先变深又逐渐变浅。颜色逐渐变浅是因为消耗了更多的NO2。',
    formula: FORMULA, src: '课本第 38 页 · 第二章 第二节 化学平衡',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    paperSheet(group, { w: 0.59, d: 0.24, z: 0.004 });
    paperSheet(group, { w: 0.48, d: 0.19, z: 0.004 }).position.y = 0.0008;
    const rig = syringe(group), scene = pressureScene();
    const card = tag('', 'cond');
    card.px = [0, -18];
    const fresh = () => ({ demo: false, v: I, n: 1, held: false, newStroke: true, run: null, serial: 0 });
    let S = fresh(), W;
    const draw = () => rig.draw(S.v, S.n);
    draw();
    const quiet = () => Math.abs(S.n - equilibrium(S.v)) < 0.0015;
    const say = msg => { if (!S.demo) W.ui.status(msg); };
    const row = () => {
      if (S.demo || !S.run) return;
      const r = S.run, c = S.n / S.v;
      const after = r.still < 0.18 ? '—' : compare(c - r.stopC);
      const cells = [(r.sign > 0 ? '拉至' : '推至') + position(S.v), compare(r.stopC - r.startN / r.startV), after];
      if (W.lastRow === r && W.lastText === cells.join()) return;
      if (W.lastRow === r) W.tbl.set(W.tbl.rows.length - 1, cells);
      else W.tbl.add(cells);
      W.lastRow = r;
      W.lastText = cells.join();
    };
    const move = p => {
      if (!S.held || !p) return;
      const v = volumeAt(p.x), delta = v - S.v;
      if (Math.abs(delta) < 1e-6) return;
      const sign = Math.sign(delta);
      if (S.newStroke || S.run.sign !== sign || S.run.still >= 0.22) {
        S.run = { sign, startV: S.v, startN: S.n, still: 0, stopC: S.n / S.v, reported: false };
        S.newStroke = false;
        S.serial++;
        if (!S.demo) bar.say(null);
        say(sign > 0 ? '活塞向外拉，管内气体占据的空间变大。' : '活塞向里推，管内气体占据的空间变小。');
      }
      S.v = v;
      S.run.stopC = S.n / v;
      S.run.still = 0;
      S.run.reported = false;
      draw();
      row();
    };
    const hint = '按住活塞柄，沿针筒左右拖动';
    const drag = draggable(group, [{
      obj: rig.pick, keepOffset: true, anchor: rig.piston, hint: () => mic.isOpen ? '' : hint,
      enabled: () => !mic.isOpen,
      onStart() { S.held = true; S.newStroke = true; },
      onDrag: move,
      onEnd() { S.held = false; },
    }], { tip: tag('', 'pill eqpressure-grip-tip') });
    const act = demoActs(drag, group);
    const target = () => !S.held && !mic.isOpen ? rig.handle : null;
    const restore = sandbox({
      fresh, get: () => S, set(s) { S = s; }, apply: draw,
      view: {
        save: () => mic.isOpen ? scene.snapshot() : null,
        restore(t) { if (S.run) { scene.resume(t); mic.open(); } },
      },
    });
    const demoStroke = (a,b) => act.drag(rig.pick, gripAt(b), { from: gripAt(a), t0: 0.08, t1: 0.43, release: 0.46 });
    const bar = lessonBar({ look, back, group, ringOptions: { color: 0xee6937, minOpacity: 0.60 },
      steps: [
        { id: 'pull', title: '拉到Ⅱ，观察颜色', todo: PULL, target },
        { id: 'push', title: '推回Ⅰ，观察颜色', todo: PUSH, target },
      ],
      reels: { demo: {
        seal: '演示', label: '老师演示',
        onStart() { restore.onStart(); mic.close(); },
        onEnd() { mic.close(); restore.onEnd(); },
        shots: [
          { cap: '从Ⅰ拉到Ⅱ，观察气体刚占据更大空间时的颜色。', dur: 2.3, during: demoStroke(I, II) },
          { cap: '活塞停在Ⅱ处，红棕色又逐渐变深。', dur: 3.9 },
          { cap: '从Ⅱ推回Ⅰ，观察气体刚被压缩时的颜色。', dur: 2.3, during: demoStroke(II, I) },
          { cap: '活塞停在Ⅰ处，红棕色又逐渐变浅。', dur: 3.9 },
          { cap: '回看刚才推活塞时，分子间距和分子数怎样变化。', dur: 11, cam: CAM, enter: () => mic.open(true) },
        ],
      } },
    });
    const mic = micro({ tag, look, back, group, scene, bar: () => bar, label: '钻进去看',
      at: () => V(0, 0.046), btnAt: () => V(LEFT + UNIT * S.v / 2, AXIS - 0.016, 0.046),
      lookD: CAM[1], dist: CAM[2], scale: innerWidth <= 760 ? 0.010 : 0.0085, key: () => String(S.serial),
      show: () => Boolean(S.run) && !S.held,
      state: () => ({ v: S.v, n: S.n, startV: S.run?.startV ?? I, startN: S.run?.startN ?? 1, settled: quiet() }),
    });
    const microEl = [...document.querySelectorAll('.mw')].pop();
    microEl.classList.add('eqpressure-micro');
    const style = h('style', {}, `
      body.predicting .tag3d.pill.eqpressure-grip-tip { visibility: visible !important; }
      [data-eqpressure] .big-next:disabled { display: none; }
      [data-eqpressure].in-demo .p-body { visibility: hidden; }
      [data-eqpressure] .answer .formula { font: 600 16px/1.4 system-ui, sans-serif; }
      [data-eqpressure] .answer .src { padding-right: 70px; min-height: 52px; }
      .eqpressure-micro .mw-cap { font: 500 17px/1.5 system-ui, sans-serif; }
      .eqpressure-micro .mw-eq { font-family: system-ui, sans-serif; }
      .eqpressure-micro .mw-hud { top: 90px !important; }
      @media (min-width: 1051px) {
        .eqpressure-micro .mw-hud { left: calc(50% + 190px) !important; width: min(740px, calc(100vw - 430px)) !important; transform: translateX(-50%); }
      }
      @media (max-width:760px) {
        #viewctl { pointer-events: none; }
        #viewctl button { pointer-events: auto; }
        .eqpressure-micro .mw-hud { top: 84px !important; left: 10px !important; width: calc(100vw - 20px) !important; }
        .eqpressure-micro .mw-close { left: auto !important; right: 12px; top: 46px !important; }
        .eqpressure-micro .mw-scale { left: 12px !important; top: 55px !important; width: auto !important; }
        .eqpressure-micro .mw-eq { font-size: 19px; }
        .eqpressure-micro .mw-cap { font-size: 13px; }
      }
    `);
    document.head.append(style);

    function chemistry(dt) {
      const r = S.run;
      if (!r) return;
      r.still = Math.min(6, r.still + dt);
      const goal = equilibrium(S.v);
      S.n = goal + (S.n - goal) * Math.exp(-dt * 0.96);
      if (quiet()) S.n = goal;
      draw();
      row();
      if (S.demo || r.reported || r.still < 0.22) return;
      const step = bar.current;
      // 初态在Ⅰ；只有在Ⅱ稳定后才进入推回这一步。对线时可以往回微调。
      const reached = step && at(S.v, step === 'pull' ? II : I);
      if (reached && !quiet()) {
        if (!r.waiting) { r.waiting = true; bar.say(WAIT); }
        return;
      }
      if (r.waiting && !reached) { r.waiting = false; bar.say(null); }
      if (!quiet()) return;
      r.reported = true;
      if (reached) {
        if (step === 'pull') {
          W.ui.observePrediction(S.serial === 1
            ? '拉出时' + compare(r.stopC - r.startN / r.startV) + '，停住后' + compare(S.n / S.v - r.stopC) + '。'
            : '这次分段移动了活塞，各段颜色变化见观察记录。可重来，从Ⅰ连续拉到Ⅱ，再和预测对照。');
        }
        bar.done(step);
        W.review.hidden = !bar.finished;
        say(bar.finished ? AGAIN : PUSH);
      } else if (step) say(step === 'pull' ? PULL : PUSH);
    }
    function reset() {
      if (bar.playing) bar.stop();
      mic.close();
      S = fresh(); draw();
      W.tbl.clear(); W.lastRow = null; W.lastText = '';
      W.review.hidden = true;
      W.ui.observePrediction(null); W.ui.relock(); bar.undo('pull','push'); bar.say(null);
      say(INTRO);
    }
    const qa = qaFlow(drag, [
      { name: '拉出活塞到Ⅱ', drag: rig.pick, to: gripAt(II), wait: 7 },
      { name: '看拉出后的分子', run() {
        if (!bar.has('pull') || !(S.n > 1 && S.n / S.v < 1)) throw new Error('拉出后未见新平衡');
        mic.open();
      }, wait: 5.5, scale: 1 },
      { name: '回到注射器', run: () => mic.close(), wait: 1.6 },
      { name: '推回活塞到Ⅰ', drag: rig.pick, to: gripAt(I), wait: 7 },
      { name: '看推回后的分子', run() {
        if (!bar.finished || !(S.n < S.run.startN)) throw new Error('推回后未见新平衡');
        mic.open();
      }, wait: 5.5, scale: 1 },
      { name: '对照本轮记录', run: () => mic.close(), wait: 1.6 },
    ]);
    let lastCard;
    return {
      group: root, card: false, pointer: wrapPointer(drag, bar), toggles: ['cards','steps'],
      size: { w: 0.36, d: 0.12, h: 0.11 }, view: { auto: innerWidth > 760, margin: 1.38, elev: 22, azim: 17, lookY: innerWidth <= 760 ? 0.72 : 0.36, frameMargin: 1.48 },
      mount(ui) {
        const review = h('details', { hidden: true, class: 'more' }, h('summary', {}, '想一想（选做）'),
          h('p', { class: 'fineprint' }, '拉出活塞后，气体逐渐变深。和拉出前相比，最后的红棕色一样深吗？'));
        const model = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'),
          h('p', { class: 'fineprint' }, '按等温、密闭处理。根据氮原子守恒和恒温下的平衡常数计算 NO₂ 浓度。红棕色随浓度加深，N₂O₄ 无色。'),
          h('p', { class: 'fineprint' }, '容量 50 mL、Ⅰ处 20 mL 来自课本第 38 页图 2-6 及实验正文。Ⅱ处容积、初始组成、色深、变化快慢和微观粒子数量均为示意。'));
        W = { ...mountXuean(ui, { intro: INTRO, controls: [review, model, moreBox([], reset),
          h('p', { class: 'note' }, '戴护目镜，注意通风，实验后洗手。推拉活塞时，细管端保持封闭。')], headers: ['活塞', '移动时', '停住后'] }), ui, review };
        ui.el.setAttribute('data-eqpressure','');
        const next = ui.data.nextElementSibling;
        next.classList.add('big-next'); ui.controls.prepend(next); W.next.remove();
        ui.observePrediction(null);
        bar.attach(ui);
      },
      reset,
      update(dt) {
        const k = bar.update(dt);
        if (k > 0) chemistry(Math.min(0.06, dt) * k);
        const c = S.n / S.v;
        const name = c < 0.8 ? '浅红棕色' : c > 1.12 ? '深红棕色' : '红棕色';
        if (lastCard !== name) {
          lastCard = name;
          card.text('<div class="cc"><div class="cc-t"><span class="cc-name">注射器内</span><span class="cc-res">' + name + '</span></div></div>');
        }
        card.loc(group, LEFT + UNIT * S.v / 2, AXIS + 0.035, -0.019).show(!S.demo && !mic.isOpen);
        if (W) W.ui.el.classList.toggle('in-demo', S.demo);
        mic.update(dt, k);
      },
      dispose() { style.remove(); mic.dispose(); drag.dispose(); bar.dispose(); W?.ui.el.removeAttribute('data-eqpressure'); },
      debug: { get S() { return S; }, qa, bar, mic, picks: { piston: rig.pick } },
    };
  },
};
