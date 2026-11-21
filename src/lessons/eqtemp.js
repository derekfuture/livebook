// 人教版高中化学 选择性必修 1，第 39 页【实验2-3】图2-7。
import * as THREE from 'three';
import { h } from '../ui/Panel.js';
import { lessonBar } from './kit/lessonbar.js';
import { demoActs, mountXuean, moreBox, paperSheet, qaFlow, sandbox, wrapPointer } from './kit/chemlesson.js';
import { clamp, draggable } from './kit/interact.js';
import { inviteRing } from './kit/invite.js';
import { show } from '../ui/prefs.js';
import { micro } from './kit/microworld.js';
import {
  V, BATH_X, BATH_T, ROOM, RADIUS, RIM, LOW, HIGH, CLEAR, BATH_NAMES, FLASK_NAMES,
  FORMULA, NIST, ROOM_C, equilibrium, bathLevel, bath, apparatus, supports, temperatureScene,
} from './kit/eqtemp-parts.js';

const INTRO = '两只烧瓶已通入 NO₂ 和 N₂O₄ 的混合气体。';
const CLIP = '夹紧弹簧夹', SOAK = '浸入热水和冰水', WATCH = '观察红棕色';
const DRAG = '拖动烧瓶，让两瓶一起浸入水中';
const SWAP = '也可以把两只烧瓶提过杯口，将一只拖到对面，再把两只浸回水中。';
const OPEN_TUBE = '两瓶气体仍相通。先点弹簧夹夹紧乳胶管，再分别比较颜色。';
const START = { x: 0, y: HIGH, angle: 0 };
const ALIGN = 0.010, BATH_ZONE = 0.057, STAND_ZONE = 0.030;
const MICRO_CAM = [[0, 0.115, 0], [0.02, 0.56, 1], 0.35];
const pair = (value) => [value, value];
const indexAt = (angle) => Math.cos(angle) > 0 ? [0, 1] : [1, 0];
const deltaText = (delta) => delta > 0.00025 ? '红棕色加深' : delta < -0.00025 ? '红棕色变浅' : '变化不明显';
const lerp = (a, b, u) => a + (b - a) * u;
const ease = (u) => { const k = clamp(u, 0, 1); return k * k * (3 - 2 * k); };

export default {
  id: 'eqtemp',
  title: '温度对化学平衡的影响',
  fig: '实验2-3 · 图2-7',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '两只烧瓶里的混合气体起初一样深。一只浸入热水，另一只浸入冰水。和浸泡前相比，红棕色会怎样？',
    options: ['热水中加深，冰水中变浅', '热水中变浅，冰水中加深', '两边颜色都不变'],
    answer: 0,
  },
  need: '夹紧乳胶管，把两只烧瓶分别浸入热水和冰水，比较颜色。',
  conclusion: {
    crops: [{ page: 43, rect: [65, 525, 383, 712] }],
    quote: '前面已提及，在NO2生成N2O4的反应中，存在如下平衡：……实验表明，浸泡在热水中的烧瓶内红棕色加深，说明升高温度，NO2的浓度增大；浸泡在冰水中的烧瓶内红棕色变浅，说明降低温度，NO2的浓度减小。大量实验证明，在其他条件不变的情况下，升高温度，会使化学平衡向吸热反应的方向移动；降低温度，会使化学平衡向放热反应的方向移动。',
    formula: FORMULA,
    src: '课本第 39 页 · 第二章 第二节 化学平衡',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    paperSheet(group, { w: 0.44, d: 0.26, z: 0.015 });
    const backing = paperSheet(group, { w: 0.39, d: 0.20, z: 0.014 });
    backing.position.y = 0.0009;
    backing.renderOrder = 1.2;
    const plates = [];
    const nameplate = (obj, text, x, y, z = 0) => {
      plates.push(tag(text, 'eqtemp-name').loc(obj, x, y, z));
    };
    const baths = BATH_X.map((x, side) => {
      nameplate(group, `烧杯 · ${BATH_NAMES[side]}`, x, 0.004, 0.059);
      return bath(group, side);
    });
    const holders = supports(group, nameplate);
    const { rig, flasks, clip, clipPick, draw } = apparatus(group, nameplate);
    const cards = BATH_X.map(() => tag('', 'cond'));
    cards.forEach((c) => { c.px = [0, -24]; c.el.setAttribute('data-eqtemp-card', ''); });
    const connection = tag('气体相通 ↔', 'pill').loc(clip, 0, 0.044, 0).show(false);
    const scene = temperatureScene();
    const peerRing = inviteRing(group, { color: 0xf26a36, minOpacity: 0.55 });
    let W;
    const fresh = () => ({
      demo: false, pose: { ...START }, rest: { ...START }, grip: null, returning: null,
      closed: false, pinch: 0, immersed: false, finished: false, elapsed: 0, temp: pair(ROOM),
      c: pair(ROOM_C), run: null,
    });
    let S = fresh();
    const say = (msg) => { if (!S.demo) W?.ui.status(msg); };
    const done = (step) => { if (!S.demo) bar.done(step); };
    const align = (angle) => Math.acos(clamp(Math.abs(Math.cos(angle)), 0, 1)) < 0.12;
    const settled = () => S.immersed && BATH_T.every((temp, k) => {
      const id = indexAt(S.rest.angle)[k];
      return Math.abs(temp - S.temp[id]) < 1.2 && Math.abs(equilibrium(temp) - S.c[id]) < 0.00024;
    });

    const clipHose = () => {
      if (S.closed || S.grip || S.returning) return;
      S.closed = true;
      done('clip');
      say('乳胶管已夹紧。两只烧瓶里的气体不再互通。');
    };
    const grip = (id) => {
      S.returning = null;
      S.grip = { id, from: { ...S.pose }, start: [...S.c], crossed: false, leftRest: false };
    };
    const move = (id, p) => {
      if (S.grip?.id !== id) return;
      const g = S.grip, from = g.from;
      const radius = BATH_X[id];
      const side = Math.sign(radius * Math.cos(S.rest.angle));
      const x0 = from.x + radius * Math.cos(from.angle);
      // 拿离当前停放点时先跟手，拖离这块热区后才允许它再次吸附。
      if (Math.hypot(p.x - x0, p.y - from.y) > (S.immersed ? BATH_ZONE : STAND_ZONE)) g.leftRest = true;
      let y = clamp(p.y, S.closed ? LOW : CLEAR, HIGH + 0.034);
      if (!S.closed && !g.openTube && y < from.y - 0.004) {
        g.openTube = true;
        say(OPEN_TUBE);
      }
      let angle = from.angle, x = clamp(from.x + p.x - x0, -0.040, 0.040);
      const toward = side * (x0 - p.x);
      // 杯口上方，横向拖出本侧水浴的吸附范围才换边。
      if (S.finished && y >= CLEAR && (toward > BATH_ZONE || g.crossed)) {
        g.crossed = true;
        const progress = clamp((toward - BATH_ZONE) / (2 * Math.abs(radius) - BATH_ZONE - STAND_ZONE), 0, 1);
        angle = S.rest.angle + (id === 0 ? 1 : -1) * Math.acos(1 - 2 * progress);
        x *= 1 - progress;
      } else if (g.crossed) {
        angle = S.pose.angle;
        x = 0;
      }
      if (y < CLEAR && align(angle) && Math.abs(p.x - radius * Math.cos(angle)) <= BATH_ZONE) {
        x = clamp(x, -ALIGN, ALIGN);
      } else if (y < CLEAR && (!align(angle) || Math.abs(x) > ALIGN)) {
        // Entering through the mouth precedes lateral movement within the beaker.
        if (S.pose.y < CLEAR - 0.004) x = clamp(x, -ALIGN, ALIGN);
        else y = CLEAR;
      }
      S.pose = { x, y, angle };
    };

    const dock = (angle, inWater) => {
      const changed = inWater && (!S.immersed || indexAt(S.rest.angle)[0] !== indexAt(angle)[0]);
      S.immersed = inWater;
      S.rest = { x: 0, y: inWater ? LOW : HIGH, angle };
      if (changed) {
        S.run = { number: (S.run?.number ?? 0) + 1, start: S.grip.start, ids: indexAt(angle) };
        S.elapsed = 0;
        done('soak');
        say(S.finished ? SWAP : '比较两只烧瓶里红棕色的变化。');
      } else if (!inWater && S.finished) say(SWAP);
    };
    const release = (moved, zone) => {
      if (!S.grip) return;
      const { x, y, angle } = S.pose;
      if (moved && !zone && S.closed && S.grip.leftRest) {
        say('烧瓶没有放到位。先提过杯口，再对准两只烧杯放下。');
      }
      S.grip = null;
      // Choose the shortest equivalent rotation, with the flasks above the rim while turning.
      let target = S.rest.angle;
      while (target - angle > Math.PI) target -= 2 * Math.PI;
      while (target - angle < -Math.PI) target += 2 * Math.PI;
      const overRims = S.rest.y < CLEAR && (!align(angle) || Math.abs(x) > ALIGN);
      S.returning = { from: { x, y, angle }, target, overRims, t: 0 };
    };

    const hover = () => S.finished ? '拖动烧瓶，可提起、换边' : DRAG;
    const drag = draggable(group, flasks.map((f, id) => ({
      obj: f.pick, keepOffset: true, anchor: f.body, hint: () => mic.isOpen ? '' : hover(),
      dropOffset: V(0, -RADIUS),
      dropzones: BATH_X.flatMap((x, side) => {
        const angle = side === id ? 0 : Math.PI;
        return [
          { name: BATH_NAMES[side], position: V(x, LOW - RADIUS), radius: BATH_ZONE,
            enabled: () => S.closed && (!S.immersed || S.grip?.leftRest) && indexAt(S.pose.angle)[side] === id && align(S.pose.angle),
            onDrop: () => dock(angle, true) },
          { name: FLASK_NAMES[id], position: V(x, HIGH - RADIUS), radius: STAND_ZONE,
            enabled: () => S.closed && (indexAt(S.rest.angle)[side] === id || S.grip?.crossed) && (S.immersed || S.grip?.leftRest),
            onDrop: () => dock(angle, false) },
        ];
      }),
      enabled: () => !mic.isOpen, onStart: () => grip(id), onDrag: (p) => move(id, p), onEnd: release,
    })), {
      tip: tag('', 'pill'),
      taps: [{ obj: clipPick, hint: () => !S.closed && !mic.isOpen ? '点弹簧夹，夹紧乳胶管' : '',
        enabled: () => !S.closed && !mic.isOpen, onTap: clipHose }],
    });
    const act = demoActs(drag, group);
    const recenter = () => {
      const { pose } = S;
      draw(pose, S.pinch, S.c);
      const level = bathLevel(pose.y);
      baths.forEach((setLevel) => setLevel(level));
      const free = clamp(Math.max(Math.abs(pose.x) / 0.024, Math.abs(Math.sin(pose.angle)) / 0.42,
        (pose.y - HIGH - 0.004) / 0.019), 0, 1);
      holders.forEach((apply) => apply(pose.y, free));
      clip.userData.ringY = pose.y + clip.position.y + 0.010;
      flasks.forEach(({ body }) => { body.userData.ringY = S.immersed ? RIM + 0.003 : pose.y + 0.018; });
    };
    recenter();
    const sb = sandbox({
      get: () => S, set: (s) => { S = s; }, fresh, apply: recenter,
      view: {
        save: () => ({ micro: mic.isOpen ? scene.snapshot() : null }),
        restore: ({ micro }) => {
          if (micro && S.run) { scene.resume(micro); mic.open(); }
        },
      },
    });
    const bar = lessonBar({
      look, back, group, ringOptions: { color: 0xf26a36, minOpacity: 0.55 },
      steps: [
        { id: 'clip', title: CLIP, todo: '点<b>弹簧夹</b>，夹紧连通两只烧瓶的乳胶管。', target: () => clip },
        { id: 'soak', title: SOAK, todo: '<b>拖住一只烧瓶</b>往下，两只分别浸入热水和冰水后松手。', target: () => S.grip ? null : flasks[0].body },
        { id: 'watch', title: WATCH, todo: '比较<b>两只烧瓶</b>里的红棕色，看看它们怎样变化。',
          target: () => S.immersed && !S.grip && !mic.isOpen ? flasks[0].body : null },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          onStart() { sb.onStart(); mic.close(); },
          onEnd() { mic.close(); sb.onEnd(); },
          shots: [
            { cap: '两只烧瓶已通入同一种混合气体。用弹簧夹夹紧乳胶管。', dur: 2.4,
              during: act.tap(clipPick, 0.49) },
            { cap: '把一只烧瓶浸泡在热水中，另一只浸泡在冰水中。', dur: 4,
              during: act.drag(flasks[0].pick, V(BATH_X[0], LOW), {
                from: V(BATH_X[0], HIGH), t0: 0.12, t1: 0.63, release: 0.68,
              }) },
            { cap: '热水一侧的红棕色在加深，冰水一侧在变浅。', dur: 3.2 },
            { cap: '钻进去看两侧的分子，比较结合和分解。', dur: 10, cam: MICRO_CAM,
              enter: () => mic.open(true) },
          ],
        },
      },
    });
    [...document.querySelectorAll('.lbar')].pop()?.setAttribute('data-eqtemp', '');
    const mic = micro({
      tag, look, back, group, scene, bar: () => bar, label: '钻进两只烧瓶对照看', at: () => V(0, 0.084),
      btnAt: () => V(BATH_X[0], S.pose.y - 0.016, 0.021),
      lookD: MICRO_CAM[1], dist: MICRO_CAM[2], scale: 0.0087,
      show: () => S.immersed && S.run && !S.grip && !S.returning,
      state: () => {
        const { start, ids } = S.run;
        return { ids, start: ids.map((id) => start[id]), current: ids.map((id) => S.c[id]), settled: settled() };
      },
    });
    const layout = h('style', {}, `
      .tag3d.eqtemp-name {
        padding: 1px 4px; background: #fffcf2e8; color: #423d35; border-radius: 2px;
        font: 600 clamp(11px, 1vw, 15px)/1.25 var(--sans); white-space: nowrap; text-shadow: none;
        pointer-events: none;
      }
      body.predicting .tag3d.eqtemp-name { visibility: visible !important; }
      [data-eqtemp].eqtemp-demo .p-body { visibility: hidden; }
      [data-eqtemp] .big-next:disabled { display: none; }
      [data-eqtemp] .formula sub { font-size: 0.65em; line-height: 0; }
      [data-eqtemp] .answer .src { min-height: 54px; padding: 8px 64px 0 0; margin-bottom: 0; }
      [data-eqtemp] .answer .seal-stamp {
        right: 20px; bottom: 15px; width: 44px; height: 44px; font-size: 17px;
        writing-mode: horizontal-tb; letter-spacing: 0; transform: scale(1.35) rotate(-14deg);
      }
      .mw[data-eqtemp] .mw-hud { top: 79px !important; }
      .mw[data-eqtemp] .mw-cap { font-size: 15px; max-width: 100%; }
      @media (min-width: 1051px) {
        .mw[data-eqtemp] .mw-hud {
          left: calc(50% + 197px) !important; width: min(760px, calc(100vw - 420px)) !important; transform: translateX(-50%);
        }
      }
      .mw[data-eqtemp] .mw-eq { font-size: clamp(17px,2.4vw,30px); }
      .eqtemp-counts { display: flex; justify-content: space-evenly; gap: 10px; padding: 6px 0; font-variant-numeric: tabular-nums; }
      .eqtemp-counts span:first-child b { color: #984f2c; }
      .eqtemp-counts span:last-child b { color: #385f76; }
      .eqtemp-playback { margin-top: 6px; }
      .eqtemp-playback button {
        pointer-events: auto; cursor: pointer; padding: 4px 12px; margin: 0 3px;
        border: 1px solid #827c70; border-radius: 5px; background: #fffaf0; color: #39372f; font: 14px var(--sans);
      }
      @media (max-width: 760px) {
        .mw[data-eqtemp] .mw-hud, .mw[data-eqtemp] .mw-scale {
          left: 12px !important; width: calc(100vw - 24px) !important;
        }
        .mw[data-eqtemp] .mw-scale { top: 57px !important; text-align: left; width: calc(100vw - 116px) !important; }
        .mw[data-eqtemp] .mw-hud {
          top: auto !important; bottom: 5vh; padding: 8px 4px; box-sizing: border-box;
          background: #fffaf1f2; border-radius: 5px;
        }
        .lbar[data-eqtemp] { gap: 5px; }
        .lbar[data-eqtemp] .lb-steps { gap: 2px; flex-wrap: nowrap; }
        .lbar[data-eqtemp] .lb-steps i { width: 16px; height: 16px; line-height: 15px; }
        .lbar[data-eqtemp] .lb-steps i.done::after { line-height: 15px; }
        .lbar[data-eqtemp] .lb-demo { font-size: 12px; padding-inline: 5px; }
        .tag3d[data-eqtemp-card] .cc { padding: 3px 5px; }
        .mw[data-eqtemp] .mw-cap { font-size: 13px; }
        .mw[data-eqtemp] .mw-close { left: auto !important; right: 12px; top: 45px !important; }
      }
      @media (min-width: 761px) and (max-width: 1050px) and (max-height: 550px) {
        .lbar[data-eqtemp] {
          left: 411px; right: 62px; bottom: 6px; width: auto; transform: none; font-size: 13px; gap: 5px; padding: 5px 7px;
        }
        .lbar[data-eqtemp] .lb-steps { gap: 2px; }
        .lbar[data-eqtemp] .lb-demo { padding-inline: 5px; }
        .mw[data-eqtemp] .mw-hud, .mw[data-eqtemp] .mw-scale { left: 18px !important; width: 348px !important; }
        .mw[data-eqtemp] .mw-hud { top: 62px !important; }
        .mw[data-eqtemp] .mw-scale { top: 38px !important; }
      }
    `);
    document.head.append(layout);
    const microRoot = [...document.querySelectorAll('.mw')].pop();
    microRoot.setAttribute('data-eqtemp', '');
    const pause = h('button', { type: 'button', onclick: () => { scene.paused = !scene.paused; } }, '暂停');
    const playback = h('div', { class: 'eqtemp-playback' }, pause,
      h('button', { type: 'button', onclick: () => mic.mw.reset() }, '从头看'));
    microRoot.querySelector('.mw-hud').append(playback);

    const returnStep = (dt) => {
      const r = S.returning;
      if (!r) return;
      r.t += dt;
      const u = clamp(r.t / 0.42, 0, 1);
      const across = ease(r.overRims ? u / 0.62 : u);
      const down = ease(r.overRims ? (u - 0.62) / 0.38 : u);
      S.pose.x = lerp(r.from.x, 0, across);
      S.pose.angle = lerp(r.from.angle, r.target, across);
      S.pose.y = lerp(r.overRims ? Math.max(CLEAR, r.from.y) : r.from.y, S.rest.y, down);
      if (u === 1) { S.pose = { ...S.rest }; S.returning = null; }
    };
    const chemistry = (dt) => {
      const { x, angle, y } = S.pose, ids = indexAt(angle);
      const wetted = S.closed && align(angle) && Math.abs(x) <= ALIGN ? clamp((bathLevel(y) + RADIUS - y) / (2 * RADIUS), 0, 1) : 0;
      ids.forEach((id, k) => {
        const s = S.temp[id];
        const rate = 0.075 + 1.85 * wetted;
        const goal = lerp(ROOM, BATH_T[k], 1 - (1 - wetted) ** 4);
        S.temp[id] = lerp(s, goal, 1 - Math.exp(-dt * rate));
        S.c[id] = lerp(S.c[id], equilibrium(S.temp[id]), 1 - Math.exp(-dt * 3.6));
        if (S.grip && !S.immersed && !wetted) S.grip.start[id] = S.c[id];
      });
    };
    const record = (dt) => {
      if (!S.run || S.grip || S.returning || !S.immersed) return;
      S.elapsed += dt;
      if (S.demo) return;
      const observations = S.run.ids.map((id) => deltaText(S.c[id] - S.run.start[id]));
      if (W.run !== S.run || observations.join() !== W.last) {
        W.last = observations.join();
        const current = S.run.ids.map((id, k) => [String(S.run.number), FLASK_NAMES[id], BATH_NAMES[k], observations[k]]);
        if (W.run !== S.run) {
          current.forEach((row) => W.tbl.add(row));
          W.run = S.run;
          W.row = W.tbl.rows.length - 2;
        } else current.forEach((row, k) => W.tbl.set(W.row + k, row));
      }
      if (S.elapsed > 2.1 && settled() && !S.finished) {
        S.finished = true;
        const first = S.run.ids.map((id, k) => `${BATH_NAMES[k]}中${deltaText(S.c[id] - ROOM_C)}`);
        W.ui.observePrediction(first.join('，') + '。');
        done('watch');
        W.review.hidden = false;
        say(SWAP);
      }
    };
    const displayCards = () => {
      const show = !S.demo && !mic.isOpen && !S.grip && !S.returning;
      const ids = indexAt(S.pose.angle);
      ids.forEach((id, k) => {
        const diff = S.c[id] - ROOM_C;
        const result = diff > 0.00025 ? '深红棕色' : diff < -0.00025 ? '浅红棕色' : '红棕色';
        cards[k].text(`<div class="cc"><div class="cc-t"><span class="cc-name">${FLASK_NAMES[id]}</span><span class="cc-res">${result}</span></div></div>`)
          .loc(group, BATH_X[k], S.pose.y + 0.076, -0.018).show(show);
      });
    };
    const pointer = wrapPointer(drag, bar);

    const reset = () => {
      if (bar.playing) bar.stop();
      mic.close();
      drag.clearDropzones();
      S = fresh();
      recenter();
      W.tbl.clear();
      W.run = W.last = null;
      W.review.hidden = true;
      W.ui.observePrediction(null);
      W.ui.relock();
      bar.undo('clip', 'soak', 'watch');
      bar.say(null);
      say(INTRO);
    };
    const qa = qaFlow(drag, [
      { name: '夹紧乳胶管', tap: clipPick },
      { name: '浸入热水和冰水', drag: flasks[0].pick, to: V(BATH_X[0], LOW), wait: 6 },
      { name: '核对颜色和结论', run: () => {
        if (!S.finished || !(S.c[0] > ROOM_C && S.c[1] < ROOM_C)) throw new Error('两侧颜色或步骤不符');
      } },
      { name: '钻进去看', run: () => mic.open(), wait: 7, scale: 1 },
      { name: '回到桌上', run: () => mic.close(), wait: 2 },
      { name: '提起烧瓶', drag: flasks[0].pick, to: V(BATH_X[0], HIGH) },
      { name: '交换两只烧瓶', drag: flasks[0].pick, to: V(BATH_X[1], HIGH) },
      { name: '换浴后浸泡', drag: flasks[0].pick, to: V(BATH_X[1], LOW), wait: 6 },
      { name: '核对颜色反转', run: () => {
        if (!S.immersed || !(S.c[0] < ROOM_C && S.c[1] > ROOM_C) || S.run.ids[0] !== 1) throw new Error('换浴后颜色没有反转');
      } },
    ]);

    return {
      group: root, pointer, card: false, toggles: ['cards', 'steps'],
      size: { w: 0.34, d: 0.14, h: 0.24 },
      view: { elev: 27, azim: 0, lookY: 0.5, frameMargin: 1.20 },
      mount(ui) {
        const review = h('details', { class: 'more', hidden: true },
          h('summary', {}, '想一想（选做）'),
          h('p', { class: 'fineprint' }, '换浴后，原来红棕色较深的烧瓶会怎样？达到新平衡后，分子还在结合和分解吗？'));
        const model = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'),
          h('p', { class: 'fineprint' }, '示意条件：室温约 22 ℃，热水约 60 ℃，冰水约 0 ℃。夹紧后视作两只定容烧瓶，气体按理想气体处理。各瓶 c(NO₂) + 2c(N₂O₄) 按约 0.012 mol/L 计算。'),
          h('p', { class: 'fineprint' }, '用气相热力学数据近似计算 Kp：ΔH° ≈ −57.12 kJ/mol，ΔS° ≈ −175.70 J/(mol·K)，近似取为常数。课本反应热为 −56.9 kJ/mol。'),
          h('p', { class: 'fineprint' }, '用物料守恒计算 NO₂ 的浓度。红棕色随 NO₂ 浓度和光程变化，透明度、换热快慢、微观分子数和反应节奏均为示意。'),
          h('p', { class: 'fineprint' }, '数据：',
            h('a', { href: NIST[0], target: '_blank', rel: 'noopener noreferrer' }, 'NIST Chemistry WebBook（NO₂）'), '、',
            h('a', { href: NIST[1], target: '_blank', rel: 'noopener noreferrer' }, 'NIST Chemistry WebBook（N₂O₄）'), '。'));
        const safety = h('p', { class: 'note' }, 'NO₂ 有毒、具腐蚀性。实际实验戴护目镜，实验后洗手。');
        W = { ...mountXuean(ui, { controls: [review, model, moreBox([], reset), safety], headers: ['轮次', '器材', '浸泡在', '较本次入水前'], intro: INTRO }), ui, review };
        ui.el.setAttribute('data-eqtemp', '');
        const conclusionButton = ui.data.nextElementSibling;
        conclusionButton.classList.add('big-next');
        ui.controls.prepend(conclusionButton);
        W.next.remove();
        if (ui.el.querySelector('.page-crop')) ui.el.querySelector('.answer .formula')?.remove();
        ui.observePrediction(null);
        bar.attach(ui);
      },
      reset,
      update(dt) {
        const k = bar.update(dt), d = Math.min(dt, 1 / 30) * k;
        drag.update(k ? Math.min(dt, 0.08) : 0);
        if (d > 0) {
          S.pinch = Math.min(1, S.pinch + (S.closed ? d * 6 : 0));
          returnStep(d);
          chemistry(d);
          recenter();
          record(d);
        }
        peerRing.update(!S.demo && show.steps && bar.current === 'watch' && bar.target ? flasks[1].body : null, dt);
        if (W && W.inDemo !== S.demo) {
          W.inDemo = S.demo;
          W.ui.el.classList.toggle('eqtemp-demo', S.demo);
        }
        connection.show(!S.demo && Boolean(S.grip?.openTube));
        for (const plate of plates) plate.show(!mic.isOpen);
        displayCards();
        mic.update(dt, k);
        if (mic.isOpen) {
          playback.hidden = S.demo;
          const label = scene.paused ? '继续' : '暂停';
          if (pause.textContent !== label) pause.textContent = label;
        }
      },
      dispose() { layout.remove(); mic.dispose(); peerRing.dispose(); bar.dispose(); drag.dispose(); },
      debug: { get S() { return S; }, bar, qa, mic, picks: { clip: clipPick, A: flasks[0].pick, B: flasks[1].pick }, rig },
    };
  },
};
