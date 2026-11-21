// 人教版必修第二册，印刷第 68 页（PDF 零基页序 72），实验 7-3、图 7-11。
import * as THREE from 'three';
import { h } from '../ui/Panel.js';
import { draggable, clamp, rayToLocal } from './kit/interact.js';
import { dropzones } from './kit/dropzone.js';
import { lessonBar } from './kit/lessonbar.js';
import { paperSheet, mountXuean, moreBox, wrapPointer, sandbox, demoActs, qaFlow } from './kit/chemlesson.js';
import { micro } from './kit/microworld.js';
import { apparatus, additionScene, V, HOME, WET, BEND, X, R, RIM, LEVEL, FORMULA } from './kit/c2h4br2-parts.js';

const STEP = '将乙烯通入盛有溴的四氯化碳溶液的试管中，观察现象。';
const DRAG = '拖动导气管，把下端伸到橙色液面以下。';
const STOW = '溶液已褪色。将导气管提出液面，松手放回管架。';
const CLEAR = '整管溶液由橙色逐渐变为无色。';
const source = '必修第二册第 68 页 · 实验 7-3 · 图 7-11';
const microCam = [[X, 0.089, 0], [0.015, 0.38, 1], 0.26];
const gripAt = (tip, angle = 0) => tip.clone().add(V(-Math.sin(angle), Math.cos(angle)).multiplyScalar(BEND / 2));
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
    card.px = [51, 0];
    const contents = tag('', 'ethene-plate ethene-contents').loc(group, X - R, LEVEL, 0);
    const pipePlate = tag('导气管 · 乙烯', 'ethene-plate ethene-pipe').loc(rig.stem, 0.008, 0.018, 0);
    const hintLine = h('span', { hidden: true });
    pipePlate.el.append(hintLine);
    const plates = [
      pipePlate,
      tag('试管架', 'ethene-plate').loc(group, X + 0.029, 0.024, -0.020),
      contents,
    ];
    const fresh = () => ({
      demo: false, pos: HOME.clone(), angle: Math.PI / 2, grip: false, returning: null, progress: 0,
      gas: [], nextBubble: 0, sequence: 0, flowing: false, faded: false,
    });
    let S = fresh(), W, cancelled = false, lastCard = '';
    const wet = () => S.pos.y < LEVEL;
    const say = (msg) => { if (!S.demo) W?.ui.status(msg); };
    const record = (action, observation) => { if (!S.demo) W?.tbl.add([action, observation]); };
    const mic = micro({
      tag, look, back, group, scene, at: () => V(X, LEVEL - 0.005), btnAt: () => V(X, RIM - 0.014, R),
      label: '钻进试管里看', state: () => ({ progress: S.progress, paused: S.demo && pausedDemo }),
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
      .tag3d.ethene-plate {font:13px/1.3 var(--song);color:#51483b;background:#fffaf0;
        padding:2px 6px;border:1px solid #c8bba3;border-radius:2px;text-shadow:none}
      body.predicting .tag3d.ethene-plate {visibility:visible !important}
      .ethene-pipe {translate:calc(50% + 5px) 0}
      @media(max-width:1050px){.tag3d.ethene-pipe {max-width:6em;white-space:normal;font-size:12px;padding:2px 4px}}
      .ethene-pipe span:not([hidden]) {display:block}
      .ethene-contents {translate:calc(-50% - 4px) 0}
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
      @media(min-width:761px) and (max-width:1050px) and (max-height:500px){
        .lbar {bottom:2px;gap:5px;padding:4px 7px;font-size:14px;line-height:1.25}
      }
    `);
    document.head.append(layout);

    const bore = R - 0.0032, mouthAxis = V(X, RIM);
    const guide = dropzones(group);
    const axis = V(0, 0, 1), clearance = RIM + 0.012;
    let atMouth = false, lastHandX = X, hand = null, startAngle = 0;
    const startTip = V(0, 0), startCenter = V(0, 0), handFromCenter = V(0, 0), handFromTip = V(0, 0);
    const guided = guide.wrap({
      dropzones: [{ name: '试管口', position: mouthAxis, radius: 2.5 * R, enabled: () => atMouth }],
      onDrag(p) {
        const outside = Math.abs(p.x - X) > bore;
        S.pos.set(p.x, outside ? Math.max(RIM, p.y) : p.y, 0);
        rig.pose(S.pos, S.angle);
      },
    });
    function move(p) {
      if (!p || !S.grip) return;
      // p 含按下时的平移偏差。转动后再扣掉同一抓点的新偏差。
      const turn = clamp((startCenter.y - p.y) / 0.032, 0, 1);
      S.angle = startAngle * (1 - turn);
      const tip = p.clone().add(handFromCenter).sub(handFromTip.clone().applyAxisAngle(axis, S.angle - startAngle));
      const y = clamp(tip.y, WET.y, 0.221 - BEND * Math.cos(S.angle));
      const inside = S.pos.y < RIM && y < RIM;
      const x = inside ? clamp(S.pos.x + tip.x - lastHandX, X - bore, X + bore)
        : clamp(tip.x, X - 0.080, X + 0.080);
      lastHandX = tip.x;
      atMouth = !inside && y <= RIM + 0.5 * R;
      mouthAxis.y = y; // 只对中管尖，竖直方向仍由手控制。
      guided.onDrag(V(x, y));
    }
    function end(moved) {
      guide.clear();
      if (!S.grip) return;
      S.grip = false;
      const to = (cancelled ? startTip.y < LEVEL : wet()) ? WET : HOME;
      S.returning = { from: S.pos.clone(), angle: S.angle, to, t: 0, finish: moved && !cancelled };
      if (moved && to === HOME && !cancelled && !S.progress) say('导气管下端还在液面上方。沿试管口往下拖。');
    }
    const canDrag = () => !mic.isOpen && (S.demo || !bar.finished);
    const pipeHint = () => S.progress === 1 ? '按住玻璃管向上提。' : '按住玻璃管向下拖。';
    const drag = draggable(group, [{
      obj: rig.pick, keepOffset: true, plane: 'xy', enabled: canDrag,
      hint: () => canDrag() ? pipeHint() : '', onStart() {
        startTip.copy(S.pos); startAngle = S.angle;
        startCenter.copy(gripAt(startTip, startAngle));
        handFromCenter.subVectors(hand || startCenter, startCenter);
        handFromTip.subVectors(hand || startCenter, startTip);
        S.grip = true; S.returning = null; hintLine.hidden = true;
        lastHandX = S.pos.x; atMouth = false; guided.onStart();
      },
      onDrag: move, onEnd: end,
    }]);
    const act = demoActs(drag, group);
    const demo = sandbox({
      get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar,
      apply() { guide.clear(); hintLine.hidden = true; mic.close(); rig.pose(S.pos, S.angle); rig.display(S.progress, S.gas); },
      view: {
        save: () => mic.isOpen ? { clock: scene.clock } : null,
        restore: (v) => { mic.open(); scene.clock = v.clock; },
      },
    });
    const bar = lessonBar({
      look, back, group, ringOptions: { minOpacity: 0.52 },
      steps: [{ id: 'observe', title: '通入乙烯，观察颜色', todo: DRAG, target: () => !mic.isOpen && !S.flowing && !S.grip ? rig.stem : null },
        { id: 'stow', title: '提起导气管并归位', todo: STOW, target: () => !mic.isOpen && !S.grip && !S.returning ? rig.stem : null }],
      reels: { demo: { label: '老师演示', seal: '演示', ...demo, shots: [
        { dur: 4.2, cap: DRAG, during: act.drag(rig.pick, gripAt(WET), { from: gripAt(HOME, Math.PI / 2), t0: 0.08, t1: 0.88, release: 0.93 }) },
        { dur: 6.2, cap: '看液面下的气泡，也看整管溶液的颜色。' },
        { dur: 3.2, cap: STOW, during: act.drag(rig.pick, gripAt(V(X, clearance)), { from: gripAt(WET), t0: 0.06, t1: 0.64, release: 0.67 }) },
        { dur: 11.0, cap: '跟着两个溴原子，看它们最后各连在哪里。', cam: microCam, enter: () => mic.open(true) },
      ] } },
    });
    const wrapped = wrapPointer(drag, bar);
    const canvas = document.getElementById('c');
    const hideHint = () => { hintLine.hidden = true; };
    canvas.addEventListener('pointerleave', hideHint);
    const pointer = { ...wrapped, down(ray, event) {
      hand = rayToLocal(ray, group);
      try { return wrapped.down(ray, event); } finally { hand = null; }
    }, move(ray, event) {
      const handled = wrapped.move(ray, event);
      hintLine.hidden = S.grip || S.demo || mic.isOpen || bar.finished || !drag.hovered();
      if (!hintLine.hidden) hintLine.textContent = pipeHint();
      return handled;
    }, up(ray, event) {
      cancelled = event?.type === 'pointercancel';
      try { return wrapped.up(ray, event); } finally { cancelled = false; }
    } };

    function updateGas(dt) {
      if (S.returning) {
        const r = S.returning;
        r.t += dt;
        const home = r.to === HOME;
        const lift = home && r.from.y < clearance;
        const liftTime = lift ? 0.24 : 0;
        if (r.t < liftTime) {
          S.pos.y = THREE.MathUtils.lerp(r.from.y, clearance, r.t / liftTime);
        } else {
          const u = clamp((r.t - liftTime) / 0.45, 0, 1);
          const k = u * u * (3 - 2 * u);
          S.pos.lerpVectors(r.from, r.to, k);
          if (lift) S.pos.y = THREE.MathUtils.lerp(clearance, HOME.y, k);
          S.angle = THREE.MathUtils.lerp(r.angle, home ? Math.PI / 2 : 0, k);
          if (u === 1) {
            S.pos.copy(r.to);
            S.returning = null;
            if (home && r.finish && S.progress === 1 && !S.demo) {
              bar.done('stow');
              W.review.hidden = false;
              say(CLEAR);
            }
          }
        }
        rig.pose(S.pos, S.angle);
      }
      const flow = wet();
      if (flow !== S.flowing) {
        S.flowing = flow;
        if (flow) {
          record('导管伸入液面下', '管口冒出气泡');
          if (S.progress < 1) say('乙烯正从导管口冒出。观察溶液的颜色。');
          if (!S.demo && bar.current === 'observe') bar.say('观察试管里的颜色。提起导气管，暂停向溶液通入乙烯。');
        } else {
          record('导管提出液面', '液内不再产生新气泡');
          if (S.progress < 1) say('导气管已离开液面。再伸入溶液，可接着观察。');
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
        say(STOW);
      }
    }
    function reset() {
      if (bar.playing) bar.stop();
      guide.clear(); hideHint();
      mic.close();
      S = fresh(); rig.pose(S.pos, S.angle); rig.display(0, S.gas);
      W.tbl.clear(); W.review.hidden = true;
      W.ui.observePrediction(null); W.ui.relock();
      bar.undo('observe', 'stow'); bar.say(null); say(STEP);
    }
    const qa = qaFlow(drag, [
      { name: '导管停在液面上方', drag: rig.pick, to: gripAt(V(X, LEVEL + 0.009)) },
      { name: '核对溶液仍为橙色', run() { if (S.progress || !S.pos.equals(HOME)) throw Error('未通气时的液色或归位错误'); } },
      { name: '导管伸入液面以下', drag: rig.pick, to: gripAt(V(X, LEVEL - 0.009)), wait: 0.5, scale: 1 },
      { name: '提出导管暂停通气', drag: rig.pick, to: gripAt(V(X, RIM + 0.002)) },
      { name: '核对中途停气', run() {
        if (S.flowing || S.progress <= 0 || S.progress >= 1 || !S.pos.equals(HOME)) throw Error('提管后应停止通气并保留褪色进度');
      } },
      { name: '重新通入乙烯', drag: rig.pick, to: gripAt(WET), wait: 7 },
      { name: '核对褪色后仍须提管', run() { if (S.progress !== 1 || !S.flowing || bar.current !== 'stow') throw Error('提管前的结论状态错误'); } },
      { name: '褪色后提管归位', drag: rig.pick, to: gripAt(V(X, clearance)) },
      { name: '核对停气归位和结论', run() {
        if (S.flowing || S.gas.length || S.returning || !S.pos.equals(HOME) || !bar.finished) throw Error('归位收尾错误');
      } },
      { name: '钻进试管里看', run: () => mic.open(), wait: 3 },
      { name: '回到桌上', run: () => mic.close(), wait: 1.5 },
    ]);
    return {
      group: root, pointer, card: false, toggles: ['cards', 'steps'],
      size: { w: 0.20, d: 0.10, h: 0.235 }, view: { auto: false, elev: 16, azim: 0, lookY: 0.49, margin: 1.22 },
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
        guide.update(rate ? dt : 0);
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
          contents.text(S.progress >= 1 ? '试管 · 1,2-二溴乙烷溶液' : '试管 · 溴的四氯化碳溶液');
          card.text('<div class="cc"><div class="cc-t"><span class="cc-name">试管</span><span class="cc-res">' + word + '</span></div></div>');
        }
        card.loc(group, X + R, LEVEL + 0.014, 0).show(!S.demo && !mic.isOpen);
        for (const plate of plates) plate.show(!mic.isOpen);
        if (mic.isOpen) replayNote.hidden = !S.progress;
        mic.update(dt, rate);
      },
      dispose() {
        canvas.removeEventListener('pointerleave', hideHint);
        guide.dispose();
        W?.ui.el.removeAttribute('data-ethene-panel');
        W?.ui.el.removeAttribute('data-ethene-demo');
        W?.demoNote.remove(); layout.remove(); mic.dispose(); bar.dispose(); drag.dispose();
      },
      debug: { get S() { return S; }, bar, mic, scene, qa, picks: { pipe: rig.pick } },
    };
  },
};
