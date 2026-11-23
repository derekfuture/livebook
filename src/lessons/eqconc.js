// 人教版高中化学 选择性必修 1，第 36–37 页【实验2-1】。
import * as THREE from 'three';
import { lessonBar } from './kit/lessonbar.js';
import { demoActs, mountXuean, moreBox, paperSheet, qaFlow, sandbox, wrapPointer } from './kit/chemlesson.js';
import { clamp, draggable } from './kit/interact.js';
import { tubeBench, T_Y, T_LEN, DROP, levelY } from './kit/tubebench.js';
import { water2 } from './kit/chemfx.js';
import { micro } from './kit/microworld.js';
import { textPlate } from './kit/props.js';
import { h } from '../ui/Panel.js';
import { paint, inked } from '../live/ink.js';
import {
  V, FEED, LIGAND, STRONG, PORTION, IRON, sample, rates, equilibrium, relax, liquorColor,
  pouringTube, retained, pourAngle, ironSpoon, BALANCE, REDOX, equilibriumScene,
} from './kit/eqconc-parts.js';

const X = [-0.02, 0.03, 0.08], NAMES = ['a', 'b', 'c'], MOUTH = T_Y + T_LEN;
const HOME_MIX = V(-0.078, 0.088), HOME_FEED = V(-0.124, 0.088);
const HOME_SPOON = V(-0.017, 0.0036, 0.036), BOTTLE = V(0.13, 0, 0.008);
const MICRO_CAM = [[X[1], 0.112, 0], [0.03, 1.03, 1], 0.305];
const INTRO = '混合试管里已有 5 mL 0.005 mol/L FeCl₃ 溶液。';
const DOCK_RADIUS = 0.023;
const TILT_TRAVEL = 0.026;
const STEPS = ['mix', 'split', 'iron', 'salt'];

export default {
  id: 'eqconc',
  title: '浓度对化学平衡的影响',
  fig: '实验2-1',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '把红色溶液等分到 a、b、c 三管。给 b 加少量铁粉，给 c 滴 4 滴 KSCN 溶液，a 不动。和 a 比，b、c 的红色会怎样？',
    options: ['b 更浅，c 更深', 'b、c 都更深', 'b、c 都更浅', 'b、c 都和 a 差不多'],
    answer: 0,
  },
  need: '混合溶液，等分到 a、b、c 三管，比较加铁粉、滴加 KSCN 前后的颜色。',
  conclusion: {
    crops: [{ page: 41, rect: [65, 488, 381, 654.5] }],
    quote: '在一定条件下，当可逆反应达到平衡状态后，如果改变反应条件，平衡状态被破坏，平衡体系的物质组成也会随着改变，直至达到新的平衡状态。这种由原有的平衡状态达到新的平衡状态的过程叫做化学平衡的移动。实验证明，当可逆反应达到平衡时，在其他条件不变的情况下，如果增大反应物浓度（或减小生成物浓度），平衡向正反应方向移动；同理，如果减小反应物浓度（或增大生成物浓度），平衡向逆反应方向移动。',
    formula: BALANCE,
    src: '课本第 36–37 页 · 第二章 第二节 化学平衡',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    paperSheet(group, { w: 0.34, d: 0.16, z: 0.018 });
    let S, W, generation = 0;
    const feed = pouringTube(group, HOME_FEED, '稀 KSCN 试管', () => sample(S.feed));
    const mix = pouringTube(group, HOME_MIX, '混合试管', () => S.mix, 1.1);
    const sources = [feed, mix];
    const spoon = ironSpoon(group, HOME_SPOON);
    const wood = paint(0xd9c9a6);
    const standPart = (w, height, d, x, y, z) => {
      const mesh = inked(new THREE.Mesh(new THREE.BoxGeometry(w, height, d), wood), { width: 0.6 });
      mesh.position.set(x, y, z); group.add(mesh);
    };
    standPart(0.093, T_Y, 0.037, -0.101, T_Y / 2, 0);
    standPart(0.004, 0.048, 0.018, -0.143, 0.036, -0.008);
    standPart(0.004, 0.048, 0.018, -0.059, 0.036, -0.008);
    standPart(0.088, 0.004, 0.011, -0.101, 0.06, -0.012);

    // 上行标器材，下行随实际装料变化。每种字样只生成一次纹理。
    const contents = [];
    const plate = (word, x, y, z, w) => {
      const p = textPlate(word, { w, h: 0.007, bg: '#fffaf0', font: 'bold 66px "Songti SC", serif' });
      p.position.set(x, y, z); group.add(p);
      return p;
    };
    const nameplate = (name, x, z, w, words, current) => {
      plate(name, x, 0.011, z, w);
      const labels = words.map((word) => plate(word, x, 0.004, z, w));
      contents.push(() => {
        const index = current();
        labels.forEach((label, k) => { label.visible = k === index; });
      });
    };
    nameplate('试管', HOME_FEED.x, 0.021, 0.043, ['稀 KSCN', '空'], () => S.feed > 1e-6 ? 0 : 1);
    nameplate('混合试管', HOME_MIX.x, 0.021, 0.044, ['FeCl₃ 溶液', '混合溶液', '空'], () => S.mix.vol < 1e-6 ? 2 : S.mix.scn ? 1 : 0);
    nameplate('滴瓶、滴管', BOTTLE.x, 0.027, 0.044, ['1 mol/L KSCN'], () => 0);
    nameplate('药匙', 0.021, 0.065, 0.037, ['铁粉', '空'], () => S.loaded ? 0 : 1);
    NAMES.forEach((n, k) => nameplate(`试管 ${n}`, X[k], 0.018, 0.044,
      ['空', '混合溶液', '对照液', '已加铁粉', '已加 KSCN', '铁粉＋KSCN'], () => {
        const s = S.tubes[k];
        if (s.ferrous > 0) return s.drops ? 5 : 3;
        if (s.drops) return 4;
        if (k === 0 && S.base) return 2;
        return s.vol > 1e-6 ? 1 : 0;
      }));

    const B = tubeBench(group, {
      tag, exact: true, rate: 1.35, getS: () => S.bench,
      tubes: X.map((x) => ({ x })),
      reagents: [{ key: 'kscn', name: 'KSCN', at: BOTTLE }],
      onDrop(k) {
        if (!S.base) return;
        const s = S.tubes[k], before = { ...s };
        s.scn += DROP * STRONG; s.vol += DROP; s.drops++;
        remember('salt', k, before);
        if (k === 2 && s.drops <= 4 && !S.demo && !S.invalid) {
          bar.say(`把 <b>1 mol/L KSCN 滴管</b>对准试管 c。已滴 ${s.drops} / 4 滴。`);
          say(`试管 c 已滴 ${s.drops} 滴。观察红色的深浅。`);
        }
      },
    });
    const fresh = () => ({
      demo: false, bench: B.fresh(), feed: 5, mix: sample(5, FEED * 5),
      mixed: false, tubes: X.map(() => sample()), base: null, doses: [],
      carry: [false, false, false], pours: null, falling: null, loaded: true,
      confirm: 0, rows: {}, invalid: false, near: false,
    });
    S = fresh();

    const say = (msg) => { if (!S.demo) W?.ui.status(S.invalid || msg); };
    const done = (id) => { if (!S.demo && !S.invalid) bar.done(id); };
    const write = (key, cells) => {
      if (S.demo || !W) return;
      if (S.rows[key] == null) S.rows[key] = W.tbl.add(cells) - 1;
      else if (W.tbl.rows[S.rows[key]].join('|') !== cells.join('|')) W.tbl.set(S.rows[key], cells);
    };
    const remember = (type, k, before) => {
      const last = S.doses[S.doses.length - 1];
      const after = { ...S.tubes[k] };
      if (type === 'salt' && last?.type === type && last.tube === NAMES[k]) last.pulses.push(after);
      else S.doses.push({ type, tube: NAMES[k], before, after, pulses: type === 'salt' ? [after] : [] });
      S.confirm = 0;
      if (S.invalid || S.demo) return;
      let reason;
      if (k === 0) reason = 'a 管已加料';
      else if (k === 1 && type === 'salt') reason = 'b 管误加了 KSCN';
      else if (k === 2 && type === 'iron') reason = 'c 管误加了铁粉';
      else if (k === 2 && after.drops > 4) reason = 'c 管的 KSCN 超过 4 滴';
      if (reason) {
        S.invalid = `${reason}，本轮对照失效。`; S.finished = false;
        W.next.hidden = W.review.hidden = true; W.redo.hidden = false;
        W.ui.relock({ full: false }); W.ui.observePrediction(null);
        if (W.ui.step === 2) W.ui.go(1);
        bar.undo('salt'); bar.say(S.invalid); W.ui.need(S.invalid); say(S.invalid);
      }
    };
    const shade = (s) => {
      const ratio = s.red / s.vol / (S.base.red / S.base.vol);
      return ratio < 0.93 ? '红色较浅' : ratio > 1.07 ? '红色较深' : '红色';
    };
    const compare = (s, a) => {
      const ratio = (s.red / s.vol) / (a.red / a.vol);
      return ratio < 0.93 ? '比 a 浅' : ratio > 1.07 ? '比 a 深' : '与 a 相近';
    };

    const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0011, 1, 12), water2({ base: 0.76 }));
    stream.renderOrder = 9.6; stream.visible = false; stream.userData.noFrame = true; stream.raycast = () => {};
    group.add(stream);
    const dockFeed = () => V(HOME_MIX.x, MOUTH + 0.009);
    const dockMix = (k) => V(X[k], MOUTH + 0.009);
    const dockSpoon = (k) => V(X[k], MOUTH + 0.007);

    const toolEnabled = (i) => i === 0 ? !S.mixed : i === 1 ? S.mixed && !S.base : !!S.base && S.loaded;
    const destinations = (i) => i === 0 ? [HOME_MIX.x] : X;
    const remaining = (i, k) => i === 0 ? S.feed : PORTION - S.tubes[k].vol;
    let applyingSnap = false;
    const moveTube = (i, p) => {
      const tube = sources[i], { grip, home, ready } = tube;
      // 对口时以管唇为支点。手往上抬使管底升高，往下放则扶正。
      const mouthY = MOUTH + 0.009;
      // 向上是抬管底；横移或下拉离开管口热区才脱附。
      if (S.pours && Math.hypot(p.x - S.pours.target, Math.min(0, p.y - mouthY)) > DOCK_RADIUS) S.pours = null;
      if (!S.pours) {
        const x = clamp(p.x, -0.174, 0.165), y = clamp(p.y, home.y + tube.lip.position.y, 0.217);
        let proximity = 0;
        destinations(i).forEach((target, k) => {
          if (remaining(i, k) < 1e-6) return;
          const dist = Math.hypot(target - p.x, MOUTH + 0.009 - p.y);
          proximity = Math.max(proximity, clamp(1 - dist / DOCK_RADIUS, 0, 1));
          if (dist < 0.0025) {
            const left = (i === 0 ? S.feed : S.mix.vol) - remaining(i, k);
            S.pours = { i, k, target, start: p.clone(), limit: pourAngle(left) };
          }
        });
        tube.tilt(ready * proximity, proximity);
        const travel = Math.abs(x - home.x - tube.lip.position.x);
        grip.position.set(x, y, Math.min(0.032, travel * 0.72) * (1 - proximity))
          .sub(tube.lip.position.clone().applyEuler(grip.rotation));
      }
      const pour = S.pours;
      if (pour) {
        // 公共吸附退出后，以手实际停住的位置作为抬管底的起点。
        if (applyingSnap) pour.start.copy(p);
        pour.start.y = Math.min(pour.start.y, p.y);
        const lift = clamp((p.y - pour.start.y) / TILT_TRAVEL, 0, 1);
        const angle = ready + lift * (pour.limit - ready);
        tube.tilt(angle);
        grip.position.copy(tube.dock(pour.target, MOUTH));
      }
    };
    const moveSpoon = (p) => {
      const x = clamp(p.x, -0.079, 0.124), y = clamp(p.y, HOME_SPOON.y, 0.182);
      spoon.tool.position.set(x, y, HOME_SPOON.z * (1 - clamp((y - 0.06) / 0.05, 0, 1)));
      spoon.tool.rotation.x = 0;
    };
    const releaseIron = (k) => {
      const p = spoon.tool.position;
      S.loaded = false;
      S.falling = { k };
      spoon.tool.rotation.x = 0.65;
      for (let n = 0; n < 18; n++) {
        spoon.dust.spawn({ p: p.clone().add(V((Math.random() - 0.5) * 0.006, -0.001, (Math.random() - 0.5) * 0.005)), k,
          v: V(0, -0.07 - Math.random() * 0.025), size: 0.0006 + Math.random() * 0.00045, life: 1 });
      }
    };
    const addIron = (k) => {
      const s = S.tubes[k], before = { ...s };
      const consumed = Math.min(s.fe - s.red, 2 * IRON);
      s.fe -= consumed; s.ferrous += 1.5 * consumed; s.iron = IRON - consumed / 2;
      remember('iron', k, before);
      if (k === 1) {
        S.ironB = true; done('iron');
        say('铁粉落进了试管 b。观察红色的变化，再给试管 c 滴加 KSCN。');
      }
    };

    const tubeHints = ['稀 KSCN：对准混合试管口，再向上拖动管底', '混合试管：对准接液管口，再向上拖动管底'];
    const spoonHint = '铁粉药匙：把匙头拖到试管口上方，再松手';
    const dropHint = '1 mol/L KSCN：提起滴管，对准试管口，按住滴加';
    const holders = [
      ...sources.map((tube, i) => ({
        obj: tube.pick, anchor: tube.lip, keepOffset: true, plane: 'xy', offset: 0,
        dropzones: destinations(i).map((x, k) => ({
          name: i ? `试管 ${NAMES[k]}` : '混合试管', position: V(x, MOUTH + 0.009), radius: DOCK_RADIUS,
          enabled: () => !S.pours && remaining(i, k) > 1e-6,
        })),
        hint: () => toolEnabled(i) ? tubeHints[i] : '',
        enabled: () => toolEnabled(i),
        onStart: () => { S.carry[i] = true; },
        onDrag: (p) => moveTube(i, p),
        onEnd: () => { S.carry[i] = false; S.pours = null; stream.visible = false; },
      })),
      {
        obj: spoon.pick, anchor: spoon.tool, keepOffset: true, plane: 'xy',
        get offset() { return spoon.tool.position.z; },
        dropzones: X.map((x, k) => ({
          name: `试管 ${NAMES[k]}`, position: dockSpoon(k), radius: 0.023, onDrop: () => releaseIron(k),
        })),
        hint: () => toolEnabled(2) ? spoonHint : '',
        enabled: () => toolEnabled(2),
        onStart: () => { S.carry[2] = true; },
        onDrag: (p) => moveSpoon(p),
        onEnd: () => { S.carry[2] = false; },
      },
      { ...B.items[0], dropzones: X.map((x, k) => ({
        name: `试管 ${NAMES[k]}`, position: V(x, MOUTH + 0.012), radius: 0.023,
      })), get offset() { return B.droppers[0].position.z; }, hint: () => S.base ? dropHint : '', enabled: () => !!S.base },
    ];
    const drag = draggable(group, holders, { tip: tag('', 'pill sticky').loc(group, 0, -9, 0) });
    const act = demoActs(drag, group);
    const card = (name, phenomenon) => `<div class="cc"><div class="cc-t"><span class="cc-name">${name}</span><span class="cc-res">${phenomenon}</span></div></div>`;
    B.cards.forEach((card, k) => { card.px = [k === 0 ? -20 : 20, -30]; });
    const markMaterial = new THREE.LineBasicMaterial({ color: 0x495363 });
    const markGeometry = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 21 }, (_, n) => {
      const a = (n / 20 - 0.5) * 2.5;
      return V(0.0087 * Math.sin(a), levelY(PORTION), 0.0087 * Math.cos(a));
    }));
    B.tubes.forEach((tube) => tube.add(new THREE.Line(markGeometry, markMaterial)));
    const mixCard = tag('', 'cond'); mixCard.px = [0, -30];
    const scene = equilibriumScene();
    let viewing = 1;
    const doorVisible = () => S.base && !S.carry[2] && !S.bench.carry[0];
    const mic = micro({
      tag: (word, cls, open) => tag(word, cls, () => { viewing = 1; open(); }),
      look, back, group, label: '钻进试管 b 里看', scene,
      at: () => V(X[S.demo ? 1 : viewing], 0.062), btnAt: () => V(X[1], innerWidth <= 760 ? 0.075 : 0.083, 0.009),
      show: doorVisible, state: () => ({
        base: S.base, tube: S.demo ? null : NAMES[viewing],
        doses: S.demo ? S.doses : S.doses.filter((d) => d.tube === NAMES[viewing]),
      }),
      bar: () => bar, lookD: MICRO_CAM[1], dist: MICRO_CAM[2], scale: 0.0068,
    });

    const otherDoors = [0, 2].map((k) => {
      const door = tag(`钻进试管 ${NAMES[k]} 里看 ⊙`, 'pill mw-go', () => { viewing = k; mic.open(); });
      return () => {
        const y = innerWidth <= 760 ? (k === 0 ? 0.045 : 0.105) : 0.098;
        door.loc(group, X[k], y, 0.009).show(doorVisible() && !mic.isOpen && !bar.playing && S.doses.some((dose) => dose.tube === NAMES[k]));
      };
    });

    const microPanel = [...document.querySelectorAll('.mw')].pop();
    microPanel.setAttribute('data-eqconc', '');
    const pause = h('button', { class: 'eqconc-pause', onclick: () => scene.togglePause() }, '暂停');
    microPanel.querySelector('.mw-hud').append(pause);
    const layout = h('style', {}, `
      .xuean[data-eqconc] .answer .src { min-height: 44px; padding-right: 62px; display: flex; align-items: center; }
      .xuean[data-eqconc] .seal-stamp { width: 44px; height: 44px; bottom: 14px; font-size: 15px; }
      .mw[data-eqconc] .mw-dim { background-color: rgba(246, 242, 232, 0.88); -webkit-mask-image: none; mask-image: none; }
      .mw[data-eqconc] .eqconc-pause { pointer-events: auto; cursor: pointer; margin-top: 5px; padding: 4px 14px; font: inherit;
        color: #354052; background: #faf7ee; border: 1px solid #9d9c94; border-radius: 16px; }
      .mw[data-eqconc] .mw-cap { font-size: 15px; }
      .mw[data-eqconc] .eqconc-count { font: 700 17px/1.45 var(--sans); color: #74213d; }
      @media (min-width: 761px) and (max-width: 1050px) and (max-height: 550px), (max-width: 760px) {
        #viewctl { pointer-events: none; }
        #viewctl button { pointer-events: auto; }
        .xuean[data-eqconc].board .opts + .go { margin-top: 6px; padding-block: 8px; }
        .xuean[data-eqconc].board .q { margin-bottom: 8px; line-height: 1.45; }
        .xuean[data-eqconc] .opts { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 8px; }
        .xuean[data-eqconc] .opt { padding-block: 6px; font-size: 14px; }
        .xuean[data-eqconc].board .opt::before { top: 8px; }
        .lbar[data-eqconc] {
          grid-template-columns: auto 1fr auto auto; column-gap: 6px; row-gap: 1px;
          padding: 4px 6px; font-size: 13px; line-height: 1.18;
        }
        body.lesson-on:not(.predicting):not(.hide-steps) .lbar[data-eqconc].do,
        body.lesson-on:not(.predicting) .lbar[data-eqconc].film { display: grid; }
        .lbar[data-eqconc] .lb-seal { writing-mode: horizontal-tb; white-space: nowrap; font-size: 11px; }
        .lbar[data-eqconc] .lb-main { grid-column: 2 / -1; }
        .lbar[data-eqconc] .lb-steps { grid-column: 2; }
        .lbar[data-eqconc] button { font-size: 11px; padding: 3px 4px; }
      }
      @media (min-width: 761px) and (max-width: 1050px) and (max-height: 550px) {
        .lbar[data-eqconc] { left: 409px; right: 99px; bottom: 5px; width: auto; transform: none; }
        .mw[data-eqconc] .mw-scale, .mw[data-eqconc] .mw-hud {
          width: 345px !important; left: 16px !important;
        }
        .mw[data-eqconc] .mw-scale { top: 48px !important; }
        .mw[data-eqconc] .mw-hud { top: 70px !important; }
        .mw[data-eqconc] .mw-close { left: auto !important; right: 55px; }
      }
      @media (max-width: 760px) {
        .mw[data-eqconc] .mw-hud, .mw[data-eqconc] .mw-scale {
          left: 12px !important; width: calc(100vw - 24px) !important;
        }
        .mw[data-eqconc] .mw-scale { top: 57px !important; width: calc(100vw - 130px) !important; text-align: left; }
        .mw[data-eqconc] .mw-hud { top: 76px !important; }
        .mw[data-eqconc] .mw-eq { font-size: 20px; }
        .mw[data-eqconc] .mw-close { left: auto !important; right: 13px; top: 39px !important; }
      }
      @media (max-width: 760px) and (orientation: portrait) {
        .lbar[data-eqconc] .lb-steps { max-width: none; flex-wrap: nowrap; }
        body.lesson-on #viewctl {
          top: 48px; bottom: auto; right: 12px; flex-direction: row; align-items: center; gap: 4px;
        }
        #viewctl .show-tg:last-of-type, #viewctl .lesson-community { margin: 0; }
        #viewctl .lesson-community { padding: 0; border: 0; }
        .mw[data-eqconc] .mw-hud { top: 52vh !important; }
      }
    `);
    document.head.append(layout);

    const toPour = (i, dest) => act.path(sources[i].pick, [
      () => sources[i].outlet(),
      () => sources[i].outlet().setY(0.192),
      () => dest().setY(0.192),
      [dest, 0.07],
      () => dest().add(V(0, TILT_TRAVEL + 0.008)),
    ], { t0: 0.03, t1: 0.54, release: 0.93 });
    const demoSpoon = act.path(spoon.pick, [
      HOME_SPOON, V((X[0] + X[1]) / 2, 0.075), V((X[0] + X[1]) / 2, 0.15), V(X[1], 0.15), dockSpoon(1),
    ], { t0: 0.06, t1: 0.59, release: 0.63 });

    const setBench = () => S.tubes.forEach((s, k) => B.setTube(k, { vol: s.vol, color: liquorColor(s), sediment: s.iron > 1e-9 ? 0.10 : 0, sedColor: 0x59585a }));
    const poseHome = () => {
      sources.forEach(({ grip, home }) => { grip.position.copy(home); grip.rotation.set(0, 0, 0); });
      spoon.tool.position.copy(HOME_SPOON); spoon.tool.rotation.x = 0;
      B.droppers[0].position.copy(B.droppers[0].B.tipHome);
    };
    const switchSet = () => {
      drag.clearDropzones(); mic.close(); poseHome(); stream.visible = false; setBench();
      mixCard.show(false); B.cards.forEach((c) => c.show(false));
    };
    const sandboxState = () => {
      const objects = [...sources.map((tube) => tube.grip), spoon.tool, B.droppers[0]];
      return {
        generation, micro: mic.isOpen ? scene.snapshot() : null,
        poses: objects.map((o) => [o, o.position.clone(), o.rotation.clone()]),
        drops: B.drops.list.slice(), dust: spoon.dust.list.slice(),
      };
    };
    const restoreSet = (snapshot) => {
      if (snapshot.generation !== generation) return;
      snapshot.poses.forEach(([object, p, r]) => { object.position.copy(p); object.rotation.copy(r); });
      B.drops.list = snapshot.drops; spoon.dust.list = snapshot.dust;
      if (snapshot.micro && S.base) { scene.resume(snapshot.micro); mic.open(); }
    };

    const bar = lessonBar({
      look, back, group, ringOptions: { minOpacity: 0.32 },
      steps: [
        { id: 'mix', title: '混合两种溶液', todo: '把装有 <b>5 mL 0.015 mol/L KSCN 溶液的试管</b>对准混合试管口。向上拖动管底倒入，向下扶正即停。', target: () => !S.carry[0] && !S.pours ? feed.grip : null },
        { id: 'split', title: '平均分装', todo: '把<b>混合试管</b>依次对准 a、b、c，向上拖动管底，让液面分别达到标线。', target: () => !S.carry[1] && !S.pours ? mix.grip : null },
        { id: 'iron', title: '试管 b 加铁粉', get todo() { return S.invalid || '把<b>铁粉药匙</b>的匙头移到试管 b 口上方，再松手。和试管 a 比颜色。'; }, target: () => !S.invalid && S.loaded && !S.carry[2] ? spoon.tool : null },
        { id: 'salt', title: '试管 c 加 KSCN', get todo() { return S.invalid || '提起 <b>1 mol/L KSCN 滴管</b>，对准试管 c，按住滴 4 滴。和试管 a 比颜色。'; }, target: () => !S.invalid && !S.bench.carry[0] ? B.droppers[0] : null },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({
            get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar,
            apply: () => { B.drops.clear(); spoon.dust.clear(); switchSet(); },
            view: { save: sandboxState, restore: restoreSet },
          }),
          shots: [
            { cap: '向 5 mL 0.005 mol/L FeCl₃ 溶液中加入 5 mL 0.015 mol/L KSCN 溶液，溶液呈红色。', dur: 4.1, during: toPour(0, dockFeed) },
            ...X.map((_, k) => ({ cap: `将红色溶液平均分装。现在倒入试管 ${NAMES[k]}。`, dur: 3.7, during: toPour(1, () => dockMix(k)) })),
            { cap: '向试管 b 加入少量铁粉，和试管 a 比较。', dur: 3.8, during: demoSpoon },
            { cap: '向试管 c 滴加 4 滴 1 mol/L KSCN 溶液，和试管 a 比较。', dur: 5.1,
              during: B.dripSeq(drag, 0, [[2, () => S.tubes[2].drops + B.inflight(2) >= 4]], 0.05, 0.94) },
            { cap: '试管 a 留作对照。试管 b 红色变浅，试管 c 红色加深。', dur: 2 },
            { cap: '数一数结合成 Fe(SCN)₃ 的有几组，再看加铁粉和滴 KSCN 后有什么变化。', dur: 30,
              cam: MICRO_CAM, enter: () => mic.open(true) },
          ],
        },
      },
    });

    [...document.querySelectorAll('.lbar')].pop()?.setAttribute('data-eqconc', '');
    const refitMicro = () => {
      if (!mic.isOpen) return;
      back();
      window.__lb?.live.reframe();
      look([X[S.demo ? 1 : viewing], 0.112, 0], MICRO_CAM[1], MICRO_CAM[2], bar.playing ? () => bar.stop() : undefined);
    };
    window.addEventListener('resize', refitMicro);

    const finishMix = () => {
      S.mixed = true; done('mix');
      write('mix', ['混合两种溶液', '溶液呈红色']);
      say('混合试管里的溶液变红了。把它平均分到 a、b、c 三支试管。');
    };
    const finishSplit = () => {
      S.base = { ...S.tubes[0], red: equilibrium(S.tubes[0]) };
      done('split');
      write('split', ['平均分装', '三支试管的溶液都呈红色']);
      say('三支试管都有了等量的红色溶液。试管 a 留作对照。');
    };
    const transfer = (dt) => {
      const p = S.pours;
      stream.visible = false;
      if (!p) return;
      const source = sources[p.i], tip = source.outlet();
      const dest = p.i === 0 ? S.mix : S.tubes[p.k];
      const endY = T_Y + levelY(dest.vol);
      const vol = p.i === 0 ? S.feed : S.mix.vol;
      const excess = Math.max(0, vol - retained(source.grip.rotation.z));
      const amt = Math.min(remaining(p.i, p.k), excess, dt * 7 * Math.sqrt(excess));
      if (amt < 1e-9) return;
      stream.visible = true;
      stream.position.set(tip.x, (tip.y + endY) / 2, tip.z);
      stream.scale.y = Math.max(0.001, tip.y - endY);
      stream.material.color.set(p.i === 0 ? 0xe1ebed : liquorColor(S.mix));
      if (p.i === 0) {
        S.feed -= amt; dest.vol += amt; dest.scn += amt * LIGAND;
      } else {
        const ratio = amt / S.mix.vol;
        for (const f of ['fe', 'scn', 'red']) { const part = S.mix[f] * ratio; dest[f] += part; S.mix[f] -= part; }
        S.mix.vol -= amt; dest.vol += amt;
      }
      if (remaining(p.i, p.k) > 1e-6) return;
      stream.visible = false;
      if (p.i === 0) { S.feed = 0; finishMix(); }
      else if (S.tubes.every((s) => s.vol >= PORTION - 1e-6)) { S.mix = sample(); finishSplit(); }
    };
    const returnHome = (obj, home, dt) => {
      const a = 1 - Math.exp(-16 * dt);
      obj.position.lerp(home, a); obj.rotation.z *= 1 - a; obj.rotation.y *= 1 - a; obj.rotation.x *= 1 - a;
      if (obj.position.distanceToSquared(home) < 1e-8 && Math.abs(obj.rotation.z) < 0.005 && Math.abs(obj.rotation.x) < 0.005) {
        obj.position.copy(home); obj.rotation.set(0, 0, 0);
      }
    };
    const record = () => {
      if (!S.base || S.demo) return;
      const [a, b, c] = S.tubes;
      S.tubes.forEach((s, k) => {
        const name = NAMES[k];
        const iron = S.doses.some((dose) => dose.type === 'iron' && dose.tube === name);
        const acts = [iron ? '加入铁粉' : '', s.drops ? `滴加 ${s.drops} 滴 KSCN` : ''].filter(Boolean);
        if (acts.length) write(name, [`${name} ${acts.join('；')}`, shade(s)]);
      });
      if (!S.invalid && S.ironB && c.drops === 4 && S.confirm > 1.3 && !S.finished) {
        S.finished = true; done('salt'); W.next.hidden = false; W.review.hidden = false;
        say('颜色已经可以对照。掀开结论，也可以钻进去看。');
      }
      if (S.finished || S.invalid) {
        const observed = `b ${compare(b, a)}，c ${compare(c, a)}`;
        write('compare', [S.invalid ? '本轮颜色（对照失效）' : '与试管 a 对比', observed]);
        if (S.invalid) return;
        if (W && W.observed.textContent !== observed) {
          W.observed.textContent = observed;
          W.ui.observePrediction(observed);
        }
      }
    };

    const reset = () => {
      generation++; viewing = 1;
      if (bar.playing) bar.stop();
      B.drops.clear(); spoon.dust.clear(); S = fresh(); switchSet();
      W?.tbl.clear();
      if (W) {
        W.redo.hidden = true; W.review.hidden = true; W.review.open = false; W.next.hidden = true; W.observed.textContent = '';
        W.ui.relock(); W.ui.observePrediction(null);
      }
      bar.undo(...STEPS); bar.say(null); say(INTRO);
    };
    const pointer = wrapPointer(drag, bar);
    const update = (dt, t) => {
      B.droppers[0].userData.ringY = B.droppers[0].position.y + 0.05;
      const speed = bar.update(dt), h = Math.min(dt, 1 / 30) * speed;
      if (h > 0) {
        applyingSnap = true; drag.update(h); applyingSnap = false;
        transfer(h);
        contents.forEach((refresh) => refresh());
        sources.forEach((tube, i) => { if (!S.carry[i]) returnHome(tube.grip, tube.home, h); tube.draw(); });
        if (!S.carry[2]) returnHome(spoon.tool, spoon.home, h);
        spoon.dust.update(h, (p, d) => {
          p.v.y -= 0.6 * d; p.p.addScaledVector(p.v, d);
          const above = p.p.y > T_Y + levelY(S.tubes[p.k].vol);
          if (!above && S.falling) { addIron(p.k); S.falling = null; }
          return above;
        });
        spoon.tool.heap.visible = S.loaded;
        for (const s of [S.mix, ...S.tubes]) if (s.vol) relax(s, equilibrium(s), h);
        S.confirm = Math.min(2, S.confirm + h);
        setBench(); B.update(h, t); record();
      }
      const visible = !bar.playing && !mic.isOpen;
      mixCard.text(card('混合试管', S.mix.red > 0.00001 ? '红色' : '浅黄色')).loc(group, HOME_MIX.x, MOUTH, 0).show(visible && !S.base && S.mix.vol > 0.001 && !S.carry[0] && !S.carry[1] && !S.pours && mix.grip.position.distanceToSquared(HOME_MIX) < 1e-6);
      const last = S.doses[S.doses.length - 1];
      const peer = last?.tube === 'c' ? 2 : last?.tube === 'b' ? 1 : S.ironB ? 2 : 1;
      const comparing = visible && S.base && !S.carry[2] && !S.bench.carry[0];
      B.cards.forEach((c, k) => {
        const s = S.tubes[k];
        const show = comparing && (k === 0 || k === peer);
        if (show) c.text(card(`试管 ${NAMES[k]}`, !k || !S.doses.length ? shade(s) : compare(s, S.tubes[0]))).loc(group, X[k], MOUTH, 0);
        c.show(show);
      });
      otherDoors.forEach((refresh) => refresh());
      if (speed) mic.update(dt, speed);
      if (mic.isOpen) {
        pause.hidden = bar.playing;
        const label = scene.paused ? '继续' : '暂停';
        if (pause.textContent !== label) pause.textContent = label;
      }
    };

    const qa = qaFlow(drag, [
      { name: '对准混合试管口', drag: feed.pick, to: dockFeed },
      ...[dockFeed, ...X.map((_, k) => () => dockMix(k))].flatMap((dest, n) => {
        const tube = sources[n ? 1 : 0], hand = holders[n ? 1 : 0];
        return [
          { name: n ? `分装 ${NAMES[n - 1]}` : '混合', run: () => {
            hand.onStart(); hand.onDrag(dest()); hand.onDrag(dest().add(V(0, TILT_TRAVEL)));
          }, wait: 2 },
          { name: '扶正放回', release: tube.pick },
        ];
      }),
      { name: '铁粉入 b', drag: spoon.pick, to: () => dockSpoon(1), wait: 2 },
      { name: 'KSCN 四滴', run: () => B.qaDrip(drag, 0, 2, () => S.tubes[2].drops + B.inflight(2) >= 4), wait: 5 },
      { name: '核对', run: () => {
        const [a, b, c] = S.tubes;
        if (!S.finished || !S.ironB || c.drops !== 4 || !(b.red / b.vol < a.red / a.vol && c.red / c.vol > a.red / a.vol)) throw new Error('颜色、剂量或实验进度未到位');
        if (Math.abs(rates(a)[0] - rates(a)[1]) > 0.001) throw new Error('对照组未平衡');
      } },
      { name: '打开微观', run: () => mic.open(), wait: 4 },
    ]);

    return {
      group: root, pointer, card: false, toggles: ['cards', 'steps'],
      size: { w: 0.31, d: 0.095, h: 0.225 },
      view: { elev: 20, azim: -4, lookY: 0.46, frameMargin: 1.1 },
      mount(ui) {
        ui.el.setAttribute('data-eqconc', '');
        const observed = h('b');
        const review = h('details', { class: 'more', hidden: true }, h('summary', {}, '想一想（选做）'),
          h('p', { class: 'fineprint' }, '这一轮：', observed, '。'),
          h('p', { class: 'fineprint' }, '两支试管各改变了哪种反应物的浓度？重新平衡后，正、逆反应还在进行吗？'));
        const model = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'),
          h('p', { class: 'fineprint' }, '浓度、取液量、4 滴和等分操作见课本第 36–37 页。每滴按 0.05 mL 计，铁粉按约 0.15 mg 计，都是示意值。等分时每管约 3.33 mL。'),
          h('p', { class: 'fineprint' }, BALANCE, '。用铁和 SCN 的物料守恒计算平衡。正反应示意速率与 [Fe³⁺][SCN⁻]³ 成正比，逆反应示意速率与 [Fe(SCN)₃] 成正比。示意 Kc ≈ 4.7×10⁶ L³/mol³，颜色深浅随 Fe(SCN)₃ 浓度变化。'),
          h('p', { class: 'fineprint' }, REDOX, '。铁粉剂量、颜色和反应时间为示意。微观回放只数画面中的代表粒子，不表示实际浓度或速率。用课本简式表示配合物，省略水和旁观离子。配位形状、粒子数和尺度均为示意。'));
        const redo = h('button', { class: 'go', hidden: true, onclick: reset }, '重新做这组对照');
        W = { ...mountXuean(ui, { controls: [redo, moreBox([], reset), model], headers: ['做了什么', '现象'], intro: INTRO }), ui, review, observed, redo };
        ui.observePrediction(null);
        ui.data.append(review);
        bar.attach(ui);
      },
      update, reset,
      dispose() { window.removeEventListener('resize', refitMicro); W?.ui.el.removeAttribute('data-eqconc'); layout.remove(); markGeometry.dispose(); markMaterial.dispose(); mic.dispose(); drag.dispose(); bar.dispose(); B.dispose(); spoon.dust.dispose(); sources.forEach((tube) => tube.dispose()); },
      debug: { get S() { return S; }, bar, qa, mic, picks: { feed: feed.pick, mix: mix.pick, iron: spoon.pick, dropper: B.droppers[0].pick } },
    };
  },
};
