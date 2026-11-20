// 人教版必修第二册，印刷第 68 页（PDF 零基页序 72），实验 7-3、图 7-11。
import * as THREE from 'three';
import { h } from '../ui/Panel.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { paperSheet, mountXuean, moreBox, wrapPointer, sandbox, demoActs, qaFlow } from './kit/chemlesson.js';
import { micro } from './kit/microworld.js';
import { apparatus, additionScene, V, HOME, WET, X, R, RIM, LEVEL, FORMULA } from './kit/c2h4br2-parts.js';

const STEP = '将乙烯通入盛有溴的四氯化碳溶液的试管中，观察现象。';
const DRAG = '拖动导气管，把下端伸到橙色液面以下。';
const CLEAR = '整管溶液由橙色逐渐变为无色。';
const compact = () => innerWidth <= 1050;
const source = '必修第二册第 68 页 · 实验 7-3 · 图 7-11';
const microCam = [[X, 0.089, 0], [0.015, 0.38, 1], 0.26];
const colorName = (p) => p >= 1 ? '无色' : p >= 0.18 ? '浅橙色' : '橙色';

export default {
  id: 'c2h4br2', title: '乙烯与溴反应', fig: '图7-11', stampText: '实验', style: 'paper',
  predict: {
    q: '向橙色的溴的四氯化碳溶液中通入乙烯，试管里的液体会怎样？',
    options: ['分成橙色和无色两层', '整管溶液逐渐变为无色', '只冒气泡，橙色不变'],
    answer: 1,
  },
  need: STEP,
  conclusion: {
    crops: [{ page: 72, rect: [219, 225, 533, 368] }],
    quote: '乙烯与溴发生化学反应，使溴的四氯化碳溶液褪色。反应中，乙烯双键中的一个键断裂，两个溴原子分别加在两个价键不饱和的碳原子上，生成无色的1,2-二溴乙烷①液体。',
    formula: FORMULA, src: source,
  },
  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    paperSheet(group, { w: 0.32, d: 0.17 });
    const rig = apparatus(group), scene = additionScene();
    const card = tag('', 'cond');
    const fresh = () => ({
      demo: false, pos: HOME.clone(), grip: false, returning: null, progress: 0,
      gas: [], nextBubble: 0, sequence: 0, flowing: false, faded: false,
    });
    let S = fresh(), W, cancelled = false, lastCard = '';
    const wet = () => Math.abs(S.pos.x - X) < R - 0.0024 && S.pos.y < LEVEL - 0.001;
    const say = (msg) => { if (!S.demo) W?.ui.status(msg); };
    const record = (action, observation) => { if (!S.demo) W?.tbl.add([action, observation]); };
    const mic = micro({
      tag, look, back, group, scene, at: () => V(X, LEVEL - 0.005), btnAt: () => compact() ? V(X - 0.044, 0.036) : V(X + 0.046, 0.024),
      label: '钻进去看', state: () => ({ progress: S.progress, paused: S.demo && pausedDemo }),
      show: () => W?.ui.step === 1 && !S.grip, bar: () => bar, scale: 0.013, lookD: microCam[1], dist: microCam[2],
    });
    let pausedDemo = false;
    const overlay = [...document.querySelectorAll('.mw')].pop();
    overlay.dataset.ethene = '';
    const replayNote = h('div', { class: 'fineprint', hidden: true }, '本轮通气回放 · 净成键变化示意，省略中间体');
    overlay.querySelector('.mw-hud').prepend(replayNote);
    const layout = h('style', {}, `
      [data-ethene-demo] .p-body, [data-ethene-demo] .p-tabs {visibility:hidden}
      .ethene-demo-note {position:absolute;left:24px;right:24px;top:104px}
      [data-ethene-panel] .answer .src {min-height:52px;padding-right:64px}
      [data-ethene-panel] .answer .seal-stamp {width:44px;height:44px;font-size:16px;bottom:12px;right:16px;writing-mode:horizontal-tb;letter-spacing:0;line-height:1;display:grid;place-items:center}
      .mw[data-ethene] .mw-hud {left:calc(50% + 160px) !important;top:auto !important;bottom:17%;transform:translateX(-50%);width:min(580px,52vw) !important}
      .mw[data-ethene] .mw-scale {left:calc(50% + 160px) !important;transform:translateX(-50%);width:auto !important}
      .mw[data-ethene] .mw-cap {font-size:16px}
      .mw[data-ethene] .fineprint {margin:0 0 4px;font-size:14px;color:#635741}
      .mw[data-ethene] .mw-hud {background:rgba(252,249,242,.91);border-radius:6px;padding:8px}
      @media(max-width:760px){
        .mw[data-ethene] .mw-hud {left:50% !important;bottom:16%;width:88vw !important}
        .mw[data-ethene] .mw-scale {left:50% !important;white-space:nowrap;top:16px !important}
        .mw[data-ethene] .mw-close {top:45px !important;right:12px;left:auto !important}
      }
      @media(min-width:761px) and (max-width:1050px){.mw[data-ethene] .mw-close {top:6px !important;left:auto !important;right:8px}.mw[data-ethene] .mw-hud{left:66% !important;bottom:14%}.mw[data-ethene] .mw-scale{left:63% !important;top:5px !important}}
    `);
    document.head.append(layout);

    function move(p) {
      if (!p || !S.grip) return;
      let x = clamp(p.x, X - 0.061, X + 0.057), y = clamp(p.y, LEVEL - 0.026, HOME.y + 0.022);
      // 插进试管以后横拖只能抵到内壁。先提出管口，才可移到管外。
      const bore = R - 0.0032;
      if (y < RIM + 0.001) {
        if (S.pos.y < RIM + 0.001 && Math.abs(S.pos.x - X) <= bore + 1e-6) x = clamp(x, X - bore, X + bore);
        else if (Math.abs(x - X) > bore) y = RIM + 0.001;
      }
      S.pos.set(x, y, 0);
      rig.pose(S.pos);
    }
    function end(moved) {
      if (!S.grip) return;
      S.grip = false;
      if (!moved || (!cancelled && wet())) return;
      S.returning = { from: S.pos.clone(), t: 0 };
      if (!cancelled && S.progress < 1) say(S.progress > 0
        ? '导气管已离开液面。再伸入溶液，可接着观察。'
        : '导气管下端还在液面上方。沿试管口往下拖。');
    }
    const drag = draggable(group, [{
      obj: rig.pick, anchor: rig.tip, keepOffset: true, plane: 'xy', enabled: () => !mic.isOpen,
      hint: '拖动乙烯导气管', onStart() { S.grip = true; S.returning = null; },
      onDrag: move, onEnd: end,
    }], { tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const demo = sandbox({
      get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar,
      apply() { mic.close(); rig.pose(S.pos); rig.display(S.progress, S.gas); },
      view: {
        save: () => mic.isOpen ? { clock: scene.clock } : null,
        restore: (v) => { mic.open(); scene.clock = v.clock; },
      },
    });
    const bar = lessonBar({
      look, back, group, ringOptions: { minOpacity: 0.52 },
      steps: [{ id: 'observe', title: '通入乙烯，观察颜色', todo: DRAG, target: () => !mic.isOpen && !S.flowing && !S.grip ? rig.stem : null }],
      reels: { demo: { label: '老师演示', seal: '演示', ...demo, shots: [
        { dur: 4.2, cap: DRAG, during: act.drag(rig.pick, WET, { from: HOME, t0: 0.08, t1: 0.88, release: 0.93 }) },
        { dur: 6.2, cap: '看液面下的气泡，也看整管溶液的颜色。' },
        { dur: 11.0, cap: '跟着两个溴原子，看它们最后各连在哪里。', cam: microCam, enter: () => mic.open(true) },
      ] } },
    });
    const wrapped = wrapPointer(drag, bar);
    const pointer = { ...wrapped, up(ray, event) {
      cancelled = event?.type === 'pointercancel';
      try { return wrapped.up(ray, event); } finally { cancelled = false; }
    } };

    function updateGas(dt) {
      if (S.returning) {
        const r = S.returning;
        r.t += dt;
        const u = Math.min(1, r.t / 0.42);
        S.pos.lerpVectors(r.from, HOME, u * u * (3 - 2 * u));
        rig.pose(S.pos);
        if (u === 1) S.returning = null;
      }
      const flow = !S.returning && wet();
      if (flow !== S.flowing) {
        S.flowing = flow;
        if (flow) {
          record('导管伸入液面下', '管口冒出气泡');
          if (S.progress < 1) say('乙烯正从导管口冒出。观察溶液的颜色。');
          if (!S.demo && !bar.finished) bar.say('观察试管里的颜色。提起导气管，暂停向溶液通入乙烯。');
        } else {
          record('导管提出液面', '液内不再产生新气泡');
          if (!S.demo) bar.say(null);
        }
      }
      for (const g of S.gas) {
        g.age += dt;
        g.y = g.start - 0.0012 + Math.max(0, g.age - 0.16) * 0.020;
      }
      S.gas = S.gas.filter((g) => g.y < LEVEL - 0.0009);
      if (!flow) { S.nextBubble = 0; return; }
      S.nextBubble -= dt;
      if (S.nextBubble <= 0) {
        S.nextBubble += 0.20;
        S.gas.push({ x: S.pos.x, y: S.pos.y, start: S.pos.y, age: 0, phase: S.sequence++ * 2.4 });
      }
      if (S.progress >= 1) return;
      S.progress = Math.min(1, S.progress + dt / 5.4);
      if (!S.faded && colorName(S.progress) === '浅橙色') {
        S.faded = true;
        record('通入乙烯', '橙色逐渐变浅');
      }
      if (S.progress === 1 && !S.demo) {
        record('继续通入乙烯', '溶液变为无色');
        W.ui.observePrediction(CLEAR);
        bar.done('observe');
        W.review.hidden = false;
        say(CLEAR);
      }
    }
    function reset() {
      if (bar.playing) bar.stop();
      mic.close();
      S = fresh(); rig.pose(S.pos); rig.display(0, S.gas);
      W.tbl.clear(); W.review.hidden = true;
      W.ui.observePrediction(null); W.ui.relock();
      bar.undo('observe'); bar.say(null); say(STEP);
    }
    const qa = qaFlow(drag, [
      { name: '导管停在液面上方', drag: rig.pick, to: V(X, LEVEL + 0.009) },
      { name: '核对溶液仍为橙色', run() { if (S.progress || !S.pos.equals(HOME)) throw Error('未通气时的液色或归位错误'); } },
      { name: '导管伸入液面以下', drag: rig.pick, to: WET, wait: 7 },
      { name: '核对褪色和结论', run() { if (S.progress !== 1 || !bar.finished) throw Error('通气后未完成褪色'); } },
      { name: '钻进去看', run: () => mic.open(), wait: 3 },
      { name: '回到桌上', run: () => mic.close(), wait: 1.5 },
    ]);
    return {
      group: root, pointer, card: false, toggles: ['cards', 'steps'],
      size: { w: 0.20, d: 0.10, h: 0.21 }, view: { elev: 16, azim: 0, lookY: 0.50, frameMargin: 1.29 },
      mount(ui) {
        const review = h('details', { class: 'more', hidden: true }, h('summary', {}, '想一想（选做）'),
          h('p', { class: 'fineprint' }, '对照反应前后，乙烯里的氢少了吗？两个溴原子分别连在哪个碳上？'));
        const model = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'),
          h('p', { class: 'fineprint' }, '液色深浅、气泡大小和反应快慢均为示意。微观画面每次追踪一对分子的成键变化，省略溶剂和反应中间体。'),
          h('p', { class: 'fineprint' }, source));
        W = { ...mountXuean(ui, { controls: [review, model, moreBox([], reset), h('p', { class: 'note' },
          '按课本图标，戴护目镜，注意排风，实验后洗手。')], intro: STEP, headers: ['做了什么', '试管里看到的'] }), ui, review };
        W.next.remove();
        ui.el.dataset.ethenePanel = '';
        if (ui.el.querySelector('.page-crop')) ui.el.querySelector('.answer .formula')?.remove();
        W.demoObservation = h('p', { class: 'status' });
        W.demoNote = h('div', { class: 'ethene-demo-note', hidden: true },
          h('div', { class: 'bar-title' }, '老师演示'), h('p', { class: 'note' }, STEP), W.demoObservation);
        ui.el.append(W.demoNote);
        ui.observePrediction(null);
        bar.attach(ui);
      },
      reset,
      update(dt) {
        const rate = bar.update(dt);
        pausedDemo = !rate;
        if (rate) updateGas(Math.min(dt, 0.05) * rate);
        rig.display(S.progress, S.gas);
        const word = colorName(S.progress);
        if (W) {
          W.ui.el.toggleAttribute('data-ethene-demo', S.demo);
          W.demoNote.hidden = !S.demo;
          if (S.demo) {
            const seen = S.progress === 1 ? CLEAR : S.faded ? '橙色逐渐变浅。' : S.flowing ? '管口冒出气泡。' : '试管里是橙色溶液。';
            if (W.demoObservation.textContent !== seen) W.demoObservation.textContent = seen;
          }
        }
        if (word !== lastCard) {
          lastCard = word;
          card.text('<div class="cc"><div class="cc-t"><span class="cc-name">试管</span><span class="cc-res">' + word + '</span></div></div>');
        }
        card.loc(group, X + (compact() ? -0.044 : 0.040), LEVEL + 0.014, 0).show(!S.demo && !mic.isOpen);
        if (mic.isOpen) replayNote.hidden = !S.progress;
        mic.update(dt, rate);
      },
      dispose() {
        W?.ui.el.removeAttribute('data-ethene-panel');
        W?.ui.el.removeAttribute('data-ethene-demo');
        W?.demoNote.remove(); layout.remove(); mic.dispose(); bar.dispose(); drag.dispose();
      },
      debug: { get S() { return S; }, bar, mic, scene, qa, picks: { pipe: rig.pick } },
    };
  },
};
