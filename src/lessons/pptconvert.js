// 人教版选择性必修 1 第 83 页实验 3-4，图 3-15。PDF 零基页序 87。
import * as THREE from 'three';
import { h } from '../ui/Panel.js';
import { lessonBar } from './kit/lessonbar.js';
import { demoActs, mountXuean, moreBox, paperSheet, qaFlow, sandbox, wrapPointer } from './kit/chemlesson.js';
import { clamp, draggable } from './kit/interact.js';
import { micro } from './kit/microworld.js';
import { apparatus, BASE, conversionScene, DOSE, DROP_ML, LENGTH, limit, microSpan, NAMES, observed, RACK, RADIUS, smooth, TX, V } from './kit/pptconvert-parts.js';

const INTRO = '试管中盛有 2 mL 0.1 mol/L NaCl 溶液。三瓶试剂的浓度均为 0.1 mol/L。';
const SHAKE = '提起试管，左右轻摇，再放回架上。';
const DROP = (i) => '提起 ' + NAMES[i] + ' 滴管，管尖悬在试管口正上方，按住滴加 ' + DOSE[i] + ' 滴。';
const STAGES = ['silver', 'shakeCl', 'iodide', 'shakeI', 'sulfide'];
const TITLES = ['滴加 2 滴 AgNO₃', '振荡试管', '滴加 4 滴 KI', '再次振荡试管', '滴加 8 滴 Na₂S'];
const TODOS = [DROP(0), SHAKE, DROP(1), SHAKE, DROP(2)];
const TUBE = 3, AIM = V(TX, BASE + LENGTH + 0.009), LIFT = RACK + 0.007;
const MICRO_AT = () => V(TX, 0.057, 0);
const MIC_CAM = [[TX, 0.107, 0], [0.04, 0.48, 1], 0.27];
const level = (counts) => {
  const r = RADIUS - 0.00035, vol = 2 + counts.reduce((a, b) => a + b, 0) * DROP_ML;
  return RADIUS + 0.0008 + vol * 1e-6 / (Math.PI * r * r) - 2 * r / 3;
};
export default {
  id: 'pptconvert', title: '沉淀的转化（Ⅰ）', fig: '图3-15', stampText: '实验', style: 'paper',
  predict: {
    q: '白色 AgCl 已经沉在试管里。再滴入无色的 KI 溶液，原来的沉淀会怎样？',
    options: ['仍是白色，银已经沉淀了', '逐渐转化为黄色沉淀', '全部溶解，液体变澄清'], answer: 1,
  },
  need: '按顺序滴加三种试剂，观察同一支试管里的沉淀。',
  conclusion: {
    crops: [{ page: 88, rect: [244, 741, 532, 759] }, { page: 89, rect: [65, 57, 376, 97] }],
    quote: '上述过程说明，沉淀转化的实质就是沉淀溶解平衡的移动。一般来说，溶解度小的沉淀转化为溶解度更小的沉淀容易实现。两者的溶解度差别越大，转化越容易。',
    formula: '',
    src: '课本第 84–85 页 · 第三章 第四节 沉淀溶解平衡',
  },
  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    paperSheet(group, { w: 0.31, d: 0.14, z: 0.008 });
    const bench = apparatus(group), { tube, tubePick, droppers, falling, liquid } = bench;
    const tools = [...droppers.map((d) => d.body), tube];
    const picks = [...droppers.map((d) => d.pick), tubePick];
    const home = [...droppers.map((d) => d.home), V(TX, BASE)];
    const fresh = () => ({
      demo: false, stage: 0, counts: [0, 0, 0], pos: home.map((v) => v.clone()),
      contactX: 0, held: null, returning: home.map(() => null), fall: null, dripClock: 0, shake: null, tilt: 0, swirl: 0, swirlTime: 0,
    });
    let S = fresh(), W;
    const card = tag('', 'cond'), scene = conversionScene();
    const complete = () => {
      const id = STAGES[S.stage++];
      if (!S.demo) bar.done(id);
    };
    const note = (s) => { if (!S.demo) W?.ui.status(s); };
    const logDrop = (i) => {
      const row = [NAMES[i] + '　' + S.counts[i] + ' 滴', observed(S.counts)];
      if (S.counts[i] === 1) W.tbl.add(row);
      else W.tbl.set(W.tbl.rows.length - 1, row);
    };
    const dropHint = (i) => S.counts[i] ? `${NAMES[i]}　已加 ${S.counts[i]}/${DOSE[i]} 滴，还需 ${DOSE[i] - S.counts[i]} 滴。` : DROP(i);
    const land = (i) => {
      S.counts[i]++;
      S.swirl = Math.max(S.swirl, 0.65);
      if (!S.demo) logDrop(i);
      if (S.counts[i] !== DOSE[i]) {
        if (!S.demo) { bar.say(dropHint(i)); note(dropHint(i)); }
        return;
      }
      complete();
      if (S.stage === 5 && !S.demo) {
        W.review.hidden = false;
        W.ui.observePrediction('滴入 KI 后，白色沉淀逐渐变黄。再滴入 Na₂S，沉淀变黑。');
        note('三次滴加的现象已记下，可以掀开课本结论。');
      } else note(TODOS[S.stage]);
    };
    const aimed = (p) => Math.hypot(p.x - TX, p.z) < RADIUS - 0.001 && p.y >= BASE + LENGTH + 0.002 && p.y <= AIM.y + 0.019;
    const dispense = () => {
      const i = S.held;
      if (i == null || i === TUBE || S.stage !== i * 2 || S.returning[TUBE] || S.fall || S.dripClock > 0 || !aimed(S.pos[i])) return;
      S.fall = { i, x: S.pos[i].x, top: S.pos[i].y, t: 0 };
      S.dripClock = 0.34;
    };
    const start = (i) => {
      if (i === TUBE && S.fall) return;
      S.returning[i] = null;
      S.held = i;
      if (i === TUBE) S.shake = { direction: 0, extreme: TX, turned: false };
    };
    const move = (i, p) => {
      if (S.held !== i || !p) return;
      const pos = S.pos[i];
      if (i === TUBE) {
        const y = clamp(p.y, BASE, BASE + 0.068);
        const clear = y >= LIFT;
        const x = clear ? clamp(p.x, TX - 0.039, TX + 0.035) : TX;
        const sh = S.shake;
        if (clear) {
          if (!sh.direction && Math.abs(x - TX) > 0.005) { sh.direction = Math.sign(x - TX); sh.extreme = x; }
          if (sh.direction * (x - sh.extreme) > 0) sh.extreme = x;
          if (sh.direction * (sh.extreme - x) > 0.009) sh.turned = true;
          S.swirl = Math.max(S.swirl, limit(S.swirl + Math.abs(pos.x - x) * 26));
        }
        S.tilt = clear ? clamp((TX - x) * 4, -0.12, 0.12) : 0;
        pos.set(x, y, 0);
      } else {
        const y = clamp(p.y, home[i].y, AIM.y + 0.022);
        let x = clamp(p.x, TX - 0.044, 0.107);
        // 瓶内只能竖直提。管尖从侧面碰到试管壁时停在壁外。
        if (y < 0.047 && Math.abs(pos.x - home[i].x) < 0.003) x = home[i].x;
        if (y < BASE + LENGTH + 0.002 && Math.abs(x - TX) < RADIUS + 0.002) {
          if (aimed(pos)) { pos.y = BASE + LENGTH + 0.002; return; }
          x = TX + (pos.x >= TX ? 1 : -1) * (RADIUS + 0.002);
        }
        pos.set(x, y, 0);
        if (aimed(pos) && S.stage !== i * 2 && S.stage < 5) note(S.stage % 2 ? SHAKE : dropHint(S.stage / 2));
        dispense();
      }
      tools[i].position.copy(pos);
    };
    const release = (i) => {
      if (S.held !== i) return;
      if (i === TUBE && (S.stage === 1 || S.stage === 3)) {
        if (S.shake.turned) {
          if (!S.demo) W.tbl.add(['振荡试管', observed(S.counts)]);
          complete(); note(TODOS[S.stage]);
        } else note(SHAKE);
      }
      S.held = null; S.shake = null;
      S.returning[i] = { i, from: S.pos[i].clone(), tilt: S.tilt, t: 0 };
    };
    const items = tools.map((obj, i) => ({
      obj: picks[i], anchor: obj, keepOffset: true, hint: () => mic.isOpen ? '' : i === TUBE ? SHAKE : dropHint(i),
      enabled: () => !mic.isOpen,
      onStart: () => start(i), onDrag: (p) => move(i, p), onEnd: () => release(i),
    }));
    const aimTip = tag('', 'pill');
    const drag = draggable(group, items, { tip: tag('', 'pill') }), act = demoActs(drag, group);
    const returnStep = (r, dt) => {
      if (!r) return;
      const i = r.i, p = S.pos[i], dest = home[i];
      r.t += dt;
      const u = limit(r.t / 0.44);
      // 先越过瓶肩（试管则越过架圈），再垂直放下。
      const clear = i === TUBE ? LIFT : 0.053;
      const height = Math.abs(r.from.x - dest.x) < 0.002 ? r.from.y : Math.max(clear, r.from.y);
      p.x = THREE.MathUtils.lerp(r.from.x, dest.x, smooth((u - 0.13) / 0.55));
      p.y = u < 0.15 ? THREE.MathUtils.lerp(r.from.y, height, smooth(u / 0.15)) : THREE.MathUtils.lerp(height, dest.y, smooth((u - 0.68) / 0.32));
      if (i === TUBE) S.tilt = r.tilt * (1 - smooth(u / 0.65));
      if (u === 1) { p.copy(dest); S.returning[i] = null; }
    };
    const simulate = (dt) => {
      S.returning.forEach((r) => returnStep(r, dt));
      S.dripClock = Math.max(0, S.dripClock - dt);
      S.swirl = Math.max(0, S.swirl - dt * 0.42);
      S.swirlTime = S.swirl > 0 ? S.swirlTime + dt : 0;
      if (S.fall) {
        S.fall.t += dt;
        if (S.fall.top - 0.5 * 2.5 * S.fall.t ** 2 <= BASE + level(S.counts)) {
          const i = S.fall.i;
          if (i === 2 && !S.counts[i]) S.contactX = S.fall.x - TX;
          S.fall = null; land(i);
        }
      }
      dispense();
    };
    const WHITE = 0xf9f8f3, YELLOW = 0xf4cd42;
    const paintBench = () => {
      tools.forEach((obj, i) => obj.position.copy(S.pos[i]));
      tube.rotation.z = S.tilt;
      const [ag, iodide, sulfide] = S.counts;
      const ink = iodide >= ag ? YELLOW : iodide ? 0xffe6a1 : WHITE;
      const top = level(S.counts);
      liquid.setLevel(top).setMilk(ag && !sulfide ? S.swirl * 0.54 : 0, ink);
      bench.drawFlocs(S.counts, S.swirl, top, S.swirlTime, S.contactX);
      droppers.forEach((d, i) => d.fill(DOSE[i] - S.counts[i] - (S.fall?.i === i ? 1 : 0)));
      const aiming = S.held != null && S.held !== TUBE && !S.demo && !mic.isOpen && S.stage === S.held * 2;
      bench.aimRing.visible = aiming;
      aimTip.show(aiming);
      if (aiming) {
        const ready = aimed(S.pos[S.held]);
        bench.aimRing.material.color.setHex(ready ? 0x23765a : 0xb36526);
        aimTip.loc(group, TX + 0.031, AIM.y + 0.006, 0)
          .text(ready ? '已对准，按住滴加' : '让管尖靠近管口，悬在圈的正上方');
      }
      falling.visible = !!S.fall;
      if (S.fall) falling.position.set(S.fall.x, S.fall.top - 1.25 * S.fall.t ** 2, 0);
      card.text('<div class="cc"><div class="cc-t"><span class="cc-name">试管里</span><span class="cc-res">' + observed(S.counts) + '</span></div></div>')
        .loc(group, innerWidth <= 760 ? TX + 0.020 : TX - 0.030, innerWidth <= 760 ? 0.083 : 0.033, 0.018).show(!S.demo && !mic.isOpen && S.held !== TUBE);
    };
    const pour = (i, dur) => act.path(picks[i], [home[i], V(home[i].x, AIM.y), AIM], { t0: 0.025, t1: 1.3 / dur, release: 1 - 0.5 / dur });
    const shakePath = [home[TUBE], V(TX, LIFT + 0.012), V(TX - 0.012, LIFT + 0.012), V(TX + 0.012, LIFT + 0.012), V(TX - 0.010, LIFT + 0.012)];
    const shake = () => act.path(tubePick, shakePath, { t0: 0.04, t1: 0.7, release: 0.74 });
    const sb = sandbox({ get: () => S, set: (s) => { S = s; }, fresh,
      view: { save: () => mic.isOpen ? scene.save() : null, restore: (v) => { scene.restore(v); mic.open(); } },
    });
    const bar = lessonBar({
      group, look, back, ringOptions: { color: 0xec6134, minOpacity: 0.65 },
      steps: STAGES.map((id, j) => ({ id, title: TITLES[j], todo: TODOS[j],
        target: () => S.held != null || S.returning[j % 2 ? TUBE : j / 2] || mic.isOpen ? null : tools[j % 2 ? TUBE : j / 2] })),
      reels: { demo: { label: '老师演示', seal: '演示',
        onStart() { sb.onStart(); mic.close(); }, onEnd() { mic.close(); sb.onEnd(); },
        shots: [
          { cap: TODOS[0], dur: 3.5, during: pour(0, 3.5) },
          { cap: SHAKE, dur: 2.8, during: shake() },
          { cap: TODOS[2], dur: 4.6, during: pour(1, 4.6) },
          { cap: SHAKE, dur: 2.8, during: shake() },
          { cap: TODOS[4], dur: 6.5, during: pour(2, 6.5) },
          { cap: '观察试管底部沉淀的颜色。', dur: 2.0 },
          { cap: '钻进去看两次转化，追踪同一批银离子。', dur: 26, cam: MIC_CAM,
            enter() { S.microTime = microSpan[0]; mic.open(true); },
            during(k) { S.microTime = microSpan[0] + (microSpan[1] - microSpan[0]) * limit((k - 0.04) / 0.90); } },
        ],
      } },
    });
    [...document.querySelectorAll('.lbar')].pop().dataset.pptconvert = '';
    const mic = micro({ tag, look, back, group, scene, bar: () => bar, at: MICRO_AT,
      label: '钻进去看', btnAt: () => V(innerWidth <= 760 ? TX + 0.026 : TX - 0.029, 0.019, 0.011), lookD: MIC_CAM[1], dist: MIC_CAM[2], scale: 0.009,
      show: () => S.counts[0] > 0 && S.held == null && !S.returning.some(Boolean), state: () => ({ counts: S.counts, microTime: S.microTime }),
    });
    const reset = () => {
      if (bar.playing) bar.stop();
      mic.close(); S = fresh(); paintBench(); W.tbl.clear(); W.review.hidden = true;
      W.ui.observePrediction(null); W.ui.relock(); bar.undo(...STAGES); bar.say(null); note(INTRO);
    };
    const qaSteps = [];
    const holdDose = (i) => {
      if (S.counts[i] === DOSE[i]) return;
      const item = items[i], run = S;
      item.onStart(); item.onDrag(V(home[i].x, AIM.y)); item.onDrag(AIM);
      return new Promise((resolve) => {
        const tick = () => {
          if (run !== S || S.held !== i) return resolve();
          if (S.counts[i] < DOSE[i]) requestAnimationFrame(tick);
          else { item.onEnd(); resolve(); }
        };
        tick();
      });
    };
    for (let i = 0; i < 3; i++) {
      if (i > 0) qaSteps.push({ name: TITLES[i * 2 - 1], run() {
        items[TUBE].onStart(); shakePath.forEach((p) => items[TUBE].onDrag(p)); items[TUBE].onEnd();
      } });
      qaSteps.push({ name: NAMES[i] + ' 第一滴', drag: picks[i], to: AIM });
      qaSteps.push({ name: TITLES[i * 2], run: () => holdDose(i), wait: DOSE[i] * 0.55 + 1 });
    }
    qaSteps.push({ name: '核对沉淀和用量', run() {
      if (S.counts.join() !== DOSE.join() || !bar.finished) throw Error('试剂滴数或振荡顺序不符');
    } }, { name: '钻进去看', run: () => mic.open(), wait: 2, scale: 1 },
    { name: '回到桌上', run: () => mic.close() });
    const style = h('style', {}, `
      [data-pptconvert] .answer .src { padding-right: 3.5rem; }
      [data-pptconvert] .answer .seal-stamp {font-size:18px;width:44px;height:44px;right:9px;bottom:8px;writing-mode:horizontal-tb}
      [data-pptconvert] .big-next:disabled { display:none }
      [data-pptconvert].in-demo .p-body { visibility:hidden }
      .mw[data-pptconvert] .mw-cap { font-size: 16px; }
      .mw[data-pptconvert] .ppt-playback { margin-top: 10px; }
      .mw[data-pptconvert] .ppt-playback button { pointer-events:auto; margin:0 3px; padding:4px 14px; border:1px solid #b8b4a9; border-radius:16px; color:#344051; background:#fffcf4; font:inherit; cursor:pointer; }
      .mw[data-pptconvert] .ppt-playback button:disabled { opacity:0.48; }
      .mw[data-pptconvert] .mw-eq sub, .mw[data-pptconvert] .mw-eq sup { font-size: 65%; line-height: 0; }
      .lbar[data-pptconvert].film { z-index: 59; }
      @media(max-width:760px) {
        .lbar[data-pptconvert] { bottom: 12px; gap: 3px 6px; flex-wrap: wrap; padding: 5px 9px; }
        .lbar[data-pptconvert] .lb-main { flex: 1 1 80%; }
        .lbar[data-pptconvert] .lb-steps { margin-left: auto; }
        [data-pptconvert] .p-body { padding-bottom: 85px; }
        .mw[data-pptconvert] .mw-hud { left: 4vw!important; width: 92vw!important; top: 56vh!important; }
        .mw[data-pptconvert] .mw-scale { left: 4vw!important; width: auto!important; top: 50vh!important; text-align: left; }
        .mw[data-pptconvert] .mw-close { left: auto!important; right: 4vw; top: 49vh!important; }
        .mw[data-pptconvert] .mw-eq { font-size: 20px; }
        .mw[data-pptconvert] .mw-cap { font-size: 15px; }
      }
    `);
    document.head.append(style);
    const world = [...document.querySelectorAll('.mw')].pop();
    world.dataset.pptconvert = '';
    world.querySelector('.mw-scale').textContent = '晶格片段示意 · 粒子数量与尺度经过简化';
    const pause = h('button', { onclick: () => scene.toggle() }, '暂停');
    const playback = h('div', { class: 'ppt-playback' }, pause, h('button', { onclick: () => scene.replay() }, '重播'));
    world.querySelector('.mw-hud').append(playback);
    return {
      group: root, pointer: wrapPointer(drag, bar), card: false, toggles: ['cards', 'steps'],
      size: { w: 0.24, d: 0.09, h: 0.185 }, view: { elev: 16, azim: 1, lookY: 0.46, frameMargin: 1.10 },
      mount(ui) {
        const review = h('details', { class: 'more', hidden: true }, h('summary', {}, '想一想（选做）'),
          h('p', { class: 'fineprint' }, '没有再加 AgNO₃，形成 AgI 和 Ag₂S 的银离子从哪里来？'));
        const model = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'),
          h('p', { class: 'fineprint' }, '试剂用量取自课本第 83 页实验 3-4。滴管预取本步用量，每滴按相同体积约 0.05 mL 示意。'),
          h('p', { class: 'fineprint' }, '晶格只画一小块，游离离子的数量不代表浓度。课本图 3-15 展示加完 8 滴 Na₂S 后的现象，中途变黑的范围和快慢为示意。'));
        W = { ...mountXuean(ui, { controls: [review, model, moreBox([], reset), h('p', { class: 'note' }, '佩戴护目镜，开启排风。实验结束后洗手。')], headers: ['操作', '现象'], intro: INTRO }), ui, review };
        W.next.remove();
        const reveal = ui.data.nextElementSibling;
        reveal.classList.add('big-next'); ui.controls.prepend(reveal);
        ui.el.dataset.pptconvert = ''; ui.observePrediction(null); bar.attach(ui);
      },
      update(dt) {
        const k = bar.update(dt);
        simulate(Math.min(dt, 0.05) * k); paintBench(); mic.update(dt, k);
        if (mic.isOpen) {
          playback.hidden = S.demo;
          pause.disabled = scene.ended;
          const label = scene.paused ? '继续' : '暂停';
          if (pause.textContent !== label) pause.textContent = label;
        }
        W?.ui.el.classList.toggle('in-demo', S.demo);
      },
      reset,
      dispose() { if (W) delete W.ui.el.dataset.pptconvert; style.remove(); mic.dispose(); drag.dispose(); bar.dispose(); liquid.dispose(); },
      debug: { get S() { return S; }, bar, qa: qaSteps.map((s) => s.drag ? qaFlow(drag, [s])[0] : s), mic, scene, picks: { ag: picks[0], ki: picks[1], sulfide: picks[2], tube: tubePick } },
    };
  },
};
