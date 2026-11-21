// 人教版选择性必修 1，第 104–105 页，实验 4-2。
import * as THREE from 'three';
import {
  apparatus,
  electrodeScene,
  X,
  R,
  RIM,
  HALF,
  HOME,
  V,
  PAPER_TIP,
  PAPER_Z,
  pourAt,
  dipAt,
  paperAt,
} from './kit/cucl2-parts.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import {
  demoActs,
  mountXuean,
  moreBox,
  paperSheet,
  qaFlow,
  sandbox,
  think,
  wrapPointer,
} from './kit/chemlesson.js';
import { micro } from './kit/microworld.js';
import { h } from '../ui/Panel.js';

const INTRO = '提起装有 25% 氯化铜溶液（质量分数）的烧杯，把杯嘴对准 U 形管口，按住直到烧杯倒空。';
const PARTIAL = '烧杯里还有溶液，继续倒完。';
const STEPS = [
  ['fill', '注入溶液', INTRO],
  ['rods', '插入石墨棒', '把接负极的石墨棒拖入左管，接正极的拖入右管，让棒端浸入溶液。'],
  ['strip', '放湿润试纸', '把湿润的碘化钾淀粉试纸拖到接电源正极的石墨棒旁，纸端搭在管口。'],
  ['power', '接通直流电源', '戴好护目镜，开启排风，再点开关通电，观察两极和试纸。'],
];
const RESULT = '接负极的石墨棒上析出红色的铜，接正极的石墨棒上有气泡。';
const BLUE = '湿润的碘化钾淀粉试纸在正极侧变蓝。';
const HINTS = [
  '提起烧杯，把杯嘴对准管口',
  '把接负极的石墨棒拖入左管',
  '把接正极的石墨棒拖入右管',
  '拖动湿润的碘化钾淀粉试纸',
];
const waitForRods = '先将两根石墨棒分别插入氯化铜溶液。';
const SOURCE =
  '在U形管中注入质量分数为25%的CuCl₂溶液，插入两根石墨棒作电极（如图4-9）。把湿润的碘化钾淀粉试纸放在与直流电源正极相连的石墨棒附近。接通直流电源，观察U形管内的现象和试纸颜色的变化。';
const SAFETY = '通电前戴好护目镜，开启排风，注意用电安全。实验后洗手。';
const note =
  '依据课本第 104–105 页实验4-2、图4-9和图4-10。铜层厚度、气泡大小、粒子数目和运动时间为示意。微观图只追踪参与电极反应的离子，电子沿石墨棒与外电路传递。';
const MICRO_AT = [0, 0.096, 0],
  MICRO_DIR = [0.015, 0.44, 1];
const fresh = () => ({
  demo: false,
  pos: HOME.map((p) => p.clone()),
  grip: -1,
  returns: [],
  fill: 0,
  tilt: 0,
  wet: [false, false],
  side: -1,
  power: false,
  charge: 0,
  bubbleClock: 0,
  sinceOff: 2,
  blue: 0,
  seen: {},
});
export default {
  id: 'cucl2',
  title: '电解氯化铜溶液',
  fig: '实验4-2 · 图4-9',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '两根石墨棒原来都是黑色的。通电后，哪根棒上会出现红色的铜？',
    options: ['接电源正极的石墨棒', '接电源负极的石墨棒', '两根石墨棒都会'],
    answer: 1,
  },
  need: '观察两根石墨棒和湿润试纸的变化。',
  conclusion: {
    crops: [{ page: 108, rect: [219, 483, 536, 585] }],
    quote:
      '通电后不久可以看到，与直流电源负极相连的石墨棒上逐渐覆盖一层红色的铜，与直流电源正极相连的石墨棒上有气泡产生，湿润的碘化钾淀粉试纸变成蓝色。根据气体的刺激性气味和试纸变色情况，可以推测产生的是氯气。实验表明，CuCl2溶液在通电条件下生成了Cu和Cl2。',
    formula: 'Cu²⁺ + 2Cl⁻ <span class="cucl2-eq"><small>电解</small>══</span> Cu + Cl₂↑',
    why: '本轮判断阳极产物的依据是阳极冒泡、湿润的碘化钾淀粉试纸在阳极侧变蓝。<br>阴极上，铜离子得到电子成为铜原子。阳极上，两个氯离子各失去一个电子，形成一个氯分子。',
    src: '课本第 104 页 · 第四章 第二节 电解池',
  },
  create({ tag, look, back }) {
    const root = new THREE.Group(),
      group = new THREE.Group();
    root.add(group);
    paperSheet(group, { w: 0.44, d: 0.26 });
    const rig = apparatus(group),
      scene = electrodeScene();
    const objects = [rig.cup, ...rig.rods, rig.paper];
    const picks = [rig.beakerPick, ...rig.rods, rig.paper];
    const card = tag('', 'cond');
    let S = fresh(),
      W,
      gen = 0;
    const say = (msg) => {
      if (!S.demo) W?.ui.status(msg);
    };
    const done = (id) => {
      if (!S.demo) bar.done(id);
    };
    const record = (id, setting, result) => {
      if (S.seen[id]) return;
      S.seen[id] = true;
      if (!S.demo) W.tbl.add([setting, result]);
    };
    const enabled = (i) => !mic.isOpen && (i === 0 ? S.fill < 1 : i === 3 || !S.wet[i - 1]);

    const returnTo = (i, to) => {
      S.returns[i] = { p: S.pos[i].clone(), to: to.clone(), tilt: S.tilt, elapsed: 0 };
    };
    function dragItem(i, p) {
      const pos = S.pos[i];
      pos.copy(p).setZ(HOME[i].z);
      pos.y = clamp(p.y, HOME[i].y, 0.197);
      if (i === 1 || i === 2) {
        pos.z = S.demo ? p.z : HOME[i].z * (1 - THREE.MathUtils.smoothstep(pos.y, 0.056, dipAt(i - 1).y));
      }
      if (i === 0) {
        // 杯嘴是支点。只在杯嘴真正位于开口上方时才倾倒。
        const distance = Math.min(...X.map((_, side) => pos.distanceTo(pourAt(side))));
        const tip = clamp(1 - distance / 0.006, 0, 1);
        S.tilt = tip * 1.6;
      }
      if (i === 3 && S.side >= 0 && paperSide(pos) !== S.side) setPaperSide(-1);
    }
    function paperSide(p) {
      return X.findIndex((x, i) => S.wet[i] && Math.hypot(p.x - PAPER_TIP - x, PAPER_Z) < R && Math.abs(p.y - RIM) < 0.009);
    }
    function setPaperSide(side) {
      S.side = side;
      if (S.demo || S.seen.blue) return;
      if (side === 1) {
        done('strip');
        if (S.power) bar.say('观察正极侧试纸的颜色变化。', 'power');
      } else bar.undo('strip');
    }
    function release(i, moved, zone) {
      S.grip = -1;
      if (!moved) return;
      if (i === 0) {
        returnTo(i, HOME[0]);
        if (S.fill > 0 && S.fill < 1) {
          say(PARTIAL);
          if (!S.demo) bar.say(PARTIAL, 'fill');
        } else if (!S.fill) say('将杯嘴贴近 U 形管的开口上方，让溶液流入。');
        return;
      }
      if (i === 3) {
        const side = zone ? zone.side : -1;
        setPaperSide(side);
        if (side >= 0) {
          say(side === 1 ? '试纸已放在接正极的石墨棒旁。' : '试纸现在靠近接负极的石墨棒。');
        } else {
          returnTo(i, HOME[3]);
          say('把试纸的一端搭到石墨棒旁边的管口上。');
        }
        return;
      }
      const side = i - 1;
      if (zone) {
        S.wet[side] = true;
        if (S.wet.every(Boolean)) {
          done('rods');
          record('rods', '两棒入液', '石墨棒均为黑色');
          say('两根石墨棒都已浸入溶液。');
        } else say('一根石墨棒已入液，把另一根插入另一侧管口。');
      } else {
        returnTo(i, HOME[i]);
        if (S.fill < 1) say(S.fill > 0 ? PARTIAL : INTRO);
        else say('让石墨棒的下端沿管口伸到液面以下。');
      }
    }
    function toggle() {
      if (!S.wet.every(Boolean)) {
        say(waitForRods);
        return;
      }
      S.power = !S.power;
      S.sinceOff = 0;
      if (!S.demo && S.side === 1 && !S.seen.blue) bar.say(S.power ? '观察正极侧试纸的颜色变化。' : null, 'power');
      say(S.power ? '已通电。比较两根石墨棒和试纸的变化。' : '已断电。观察石墨棒上留下的物质。');
    }
    const drag = draggable(
      group,
      picks.map((obj, i) => ({
        obj,
        anchor: objects[i],
        dropOffset: i === 3 ? V(-PAPER_TIP, 0) : i ? V(0, -HALF) : undefined,
        dropzones: X.flatMap((x, side) => {
          if (i === 0) return [{ name: '管口', position: pourAt(side), radius: 0.03 }];
          if (i === 3) return [{ name: '管口', side, position: V(x, RIM + 0.002, PAPER_Z), radius: 0.028, enabled: () => S.wet[side] }];
          return side === i - 1 ? [{ name: '液面下', position: dipAt(side).sub(V(0, HALF)), radius: 0.033, enabled: () => S.fill === 1 }] : [];
        }),
        keepOffset: true,
        plane: 'xy',
        offset: HOME[i].z,
        enabled: () => enabled(i),
        hint: () => (enabled(i) ? HINTS[i] : ''),
        onStart() {
          S.grip = i;
        },
        onDrag(p) {
          S.returns[i] = null;
          dragItem(i, p);
          rig.draw(S);
        },
        onEnd(moved, zone) {
          release(i, moved, zone);
        },
      })),
      {
        tip: tag('', 'pill cucl2-tool-hint'),
        taps: [
          {
            obj: rig.sw,
            enabled: () => !mic.isOpen,
            hint: () => (S.power ? '点开关，断开直流电源' : '点开关，接通直流电源'),
            onTap: toggle,
          },
        ],
      },
    );
    const act = demoActs(drag, group);
    // 在电源前方竖起并横移，对准各自的管口后才向后送。收棒沿原路返回。
    const rodPaths = X.map((x, i) => {
      const home = HOME[i + 1];
      const height = RIM + 2 * HALF + 0.006;
      return [home, V(home.x, height, home.z), V(x, height, home.z), V(x, height), dipAt(i)];
    });
    const rodTiming = { t1: 0.91, release: 0.95 };
    const rodCamera = [[-0.035, 0.117, 0.02], [0.22, 0.38, 1], 0.57];
    const paperPath = [HOME[3], V(HOME[3].x, RIM + 0.005, PAPER_Z), paperAt(1)];
    const sb = sandbox({
      get: () => S,
      set: (s) => {
        S = s;
      },
      fresh,
      apply: () => rig.draw(S),
      view: {
        save: () => (mic.isOpen ? { time: scene.time, paused: scene.paused, gen } : null),
        restore: (v) => {
          if (v.gen === gen) {
            mic.open();
            scene.time = v.time;
            scene.paused = v.paused;
          }
        },
      },
    });
    const targets = [() => rig.beakerPick, () => rig.rods[S.wet[0] ? 1 : 0], () => rig.paper, () => S.power ? null : rig.sw];
    const bar = lessonBar({
      group,
      look,
      back,
      ringOptions: { minOpacity: 0.64 },
      steps: STEPS.map(([id, title, todo], i) => ({
        id,
        title,
        todo,
        target: () => (mic.isOpen || S.grip >= 0 ? null : targets[i]()),
      })),
      reels: {
        demo: {
          label: '老师演示',
          seal: '演示',
          onStart() {
            drag.clearDropzones();
            sb.onStart();
            document.body.classList.add('cucl2-demo');
            mic.close();
          },
          onEnd() {
            drag.clearDropzones();
            mic.close();
            sb.onEnd();
            document.body.classList.remove('cucl2-demo', 'cucl2-handoff');
          },
          shots: [
            {
              cap: STEPS[0][2],
              dur: 3.5,
              during: act.path(picks[0], [HOME[0], V(HOME[0].x, RIM + 0.015, HOME[0].z), pourAt()], {
                t1: 0.43,
                release: 0.91,
              }),
            },
            ...rig.rods.map((rod, i) => ({
              cap: i === 0 ? '把接负极的石墨棒插入左管。' : '把接正极的石墨棒插入右管。',
              dur: 3.6,
              cam: rodCamera,
              during: act.path(rod, rodPaths[i], rodTiming),
            })),
            {
              cap: STEPS[2][2],
              dur: 3,
              during: act.path(rig.paper, paperPath, { t1: 0.72 }),
            },
            { cap: STEPS[3][2], dur: 5, during: act.tap(rig.sw, 0.14) },
            {
              cap: '追踪两极附近的离子和电子。',
              dur: 12,
              cam: [[0, MICRO_AT[1] + 0.05, 0], MICRO_DIR, 0.32],
              enter: () => mic.open(true),
            },
            {
              cap: '断开电源，观察电流表指针回到零位。',
              dur: 3,
              enter: () => mic.close(),
              during: act.tap(rig.sw, 0.38),
            },
            {
              cap: '移开试纸，观察纸端留下的蓝色。',
              dur: 2.2,
              during: act.path(rig.paper, paperPath.slice().reverse(), rodTiming),
            },
            ...[1, 0].map((i) => ({
              cap: i ? '从右管竖直提起正极棒，再放回桌上。' : '从左管竖直提起负极棒，观察棒端的红色铜层。',
              dur: 3.6,
              cam: rodCamera,
              enter: () => { S.wet[i] = false; },
              during: act.path(rig.rods[i], rodPaths[i].slice().reverse(), rodTiming),
            })),
            {
              cap: '演示结束，回到你自己的实验桌，接着刚才的进度做。',
              dur: 2.2,
              during(k) {
                document.body.classList.toggle('cucl2-handoff', k >= 0.7);
              },
            },
          ],
        },
      },
    });
    const mic = micro({
      tag,
      look,
      back,
      group,
      scene,
      at: () => V(...MICRO_AT),
      btnAt: () => V(0, 0.027, 0.014),
      bar: () => bar,
      state: () => ({ running: S.power, charge: S.charge }),
      key: () => String(S.power),
      show: () => S.wet.every(Boolean),
      label: '钻进 U 形管里看',
      lookD: MICRO_DIR,
      dist: 0.32,
      scale: 0.011,
    });
    document.body.classList.add('cucl2-lesson');
    const overlay = [...document.querySelectorAll('.mw')].pop();
    overlay.classList.add('cucl2-micro');
    const pause = h(
      'button',
      {
        onclick: () => {
          scene.paused = !scene.paused;
        },
      },
      '暂停',
    );
    const replay = h(
      'button',
      {
        onclick: () => {
          scene.replay();
        },
      },
      '重看',
    );
    const playback = h('div', { class: 'cucl2-play' }, pause, replay);
    overlay.querySelector('.mw-hud').append(playback);
    const style = h(
      'style',
      {},
      `
      .cucl2-lesson #panel .answer .src {min-height:48px;padding-right:55px;margin-bottom:0}
      body.cucl2-lesson.predicting .tag3d.cucl2-tool-hint {visibility:visible!important}
      .cucl2-lesson #panel .seal-stamp {width:43px;height:43px;font-size:16px;bottom:12px;right:14px}
      .cucl2-safety {border-left:2px solid #a77937;padding-left:8px}
      .cucl2-demo #panel {visibility:hidden}
      .cucl2-demo .lbar.film {z-index:59}
      .cucl2-demo .cucl2-micro .mw-close {display:none}
      .cucl2-lesson::after {content:'';position:fixed;inset:0;z-index:58;background:#f6f3ea;opacity:0;pointer-events:none;transition:opacity .45s}
      .cucl2-lesson.cucl2-handoff::after {opacity:1}
      .cucl2-micro .half-cell {display:inline-block;white-space:nowrap}
      .cucl2-eq {display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;line-height:.65}
      .cucl2-eq small {font-size:.56em;line-height:1.05}
      .cucl2-play {margin-top:7px;pointer-events:auto}
      .cucl2-play button {font:inherit;font-size:13px;background:#f8f5ea;color:#304340;border:1px solid #b8c1b7;border-radius:12px;margin:0 4px;padding:2px 12px;cursor:pointer}
      .cucl2-micro .mw-dim {background:rgba(246,243,234,.94);mask-image:none;-webkit-mask-image:none}
      @media(max-width:760px) {
        .cucl2-micro .mw-hud,.cucl2-micro .mw-scale {left:10px!important;width:calc(100% - 20px)!important}
        body.cucl2-lesson #viewctl {top:48px;bottom:auto;right:8px;flex-direction:row;gap:3px;align-items:center;pointer-events:none}
        .cucl2-lesson #viewctl button {pointer-events:auto;width:29px;height:29px}
        .cucl2-lesson #viewctl .show-tg:last-of-type,.cucl2-lesson #viewctl .lesson-community {margin:0}
        .cucl2-lesson #viewctl .lesson-community {padding:0;border:0}
        .cucl2-lesson #viewctl .feedback-entry {display:flex;width:auto;min-width:66px;white-space:nowrap}
        body.cucl2-lesson.lesson-on:not(.predicting):not(.hide-steps) .lbar.do,.cucl2-demo .lbar.film {display:grid;grid-template-columns:auto 1fr auto auto;gap:2px 6px;padding:4px 7px;font-size:13px;line-height:1.2}
        .cucl2-lesson .lb-main {grid-column:2 / -1}
        .cucl2-lesson .lb-steps {grid-column:2;max-width:none;flex-wrap:nowrap}
        .cucl2-demo .lb-steps {flex-wrap:wrap}
        .cucl2-lesson .lb-seal {writing-mode:horizontal-tb;white-space:nowrap}
        .cucl2-micro .mw-hud {top:43vh!important}
        .cucl2-micro .mw-eq {font-size:18px;line-height:1.45}
        .cucl2-micro .eq-gap {display:none}
        .cucl2-micro .half-cell {display:block}
        .cucl2-micro .mw-close {left:auto!important;right:10px;top:46px!important}
        .cucl2-micro .mw-scale {top:72px!important}
      }`,
    );
    document.head.append(style);
    function advance(dt) {
      S.returns.forEach((r, i) => {
        if (!r || S.grip === i) return;
        r.elapsed += dt;
        const t = clamp(r.elapsed / 0.39, 0, 1);
        S.pos[i].lerpVectors(r.p, r.to, t);
        if (i === 0) S.tilt = r.tilt * (1 - t);
        if (t === 1) S.returns[i] = null;
      });
      if (S.grip === 0 && !S.returns[0]) S.fill = Math.min(1, S.fill + dt * S.tilt / 1.6);
      if (S.fill === 1 && !S.seen.fill) {
        done('fill');
        record('fill', '注入溶液', '两边液面相平');
        say('U 形管的两边都有氯化铜溶液。');
      }
      if (S.power || S.sinceOff < 2) S.bubbleClock += dt;
      if (!S.power) S.sinceOff = Math.min(2, S.sinceOff + dt);
      if (S.power) {
        S.charge += dt;
        if (S.side === 1 && S.grip !== 3 && S.charge > 0.55) S.blue = Math.min(1, S.blue + dt * 0.85);
        if (S.charge >= 1 && !S.seen.poles) {
          record('poles', '通电，比较两极', '负极侧覆铜，正极侧冒泡');
          if (!S.demo) W.ui.observePrediction(RESULT);
          say(RESULT);
        }
        if (S.charge >= 1 && S.side === 0 && S.grip !== 3 && S.blue === 0 && !S.seen.wrong) {
          record('wrong', '试纸在负极侧', '未见变蓝');
          say('负极侧的试纸未见变蓝。把试纸移到另一侧管口比较。');
        }
        if (S.blue >= 0.85 && !S.seen.blue) {
          record('blue', '试纸在正极侧', '试纸变蓝');
          done('power');
          say(BLUE);
          if (!S.demo) {
            W.next.hidden = false;
            W.question.open();
          }
        }
      }
    }
    function reset() {
      gen++;
      if (bar.playing) bar.stop();
      drag.clearDropzones();
      mic.close();
      S = fresh();
      rig.draw(S);
      W.tbl.clear();
      W.next.hidden = true;
      W.question.close();
      W.ui.relock();
      W.ui.observePrediction('');
      bar.undo(...STEPS.map((s) => s[0]));
      bar.say(null);
      say(INTRO);
    }
    const qa = qaFlow(drag, [
      { name: '短时倾倒后松手', drag: picks[0], to: pourAt },
      { name: '持杯对准管口', run: () => {
        if (S.fill === 1) return;
        const cup = drag.items()[0];
        cup.onStart();
        cup.onDrag(pourAt());
      }, wait: 1.8 },
      { name: '注入溶液', release: picks[0] },
      ...rig.rods.map((rod, i) => ({
        name: i ? '插入正极侧石墨棒' : '插入负极侧石墨棒',
        drag: rod,
        to: dipAt(i),
      })),
      { name: '放湿润试纸', drag: rig.paper, to: paperAt(1) },
      { name: '接通电源', tap: rig.sw, wait: 3 },
      { name: '钻进去看', run: () => mic.open(), wait: 4 },
      { name: '回到桌上', run: () => mic.close(), wait: 2 },
      { name: '断开电源', tap: rig.sw, wait: 3 },
      {
        name: '核对本轮记录',
        run: () => {
          if (!bar.finished || !S.seen.blue || S.power || W.next.hidden)
            throw Error('本轮操作、现象与结论状态不符');
        },
      },
    ]);
    rig.draw(S);
    return {
      group: root,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.37, d: 0.18, h: 0.19 },
      view: { elev: 20, azim: 0, lookY: 0.46, frameMargin: 1.02 },
      pointer: wrapPointer(drag, bar),
      reset,
      update(dt) {
        const k = bar.update(dt);
        // 演示的落点精确给定；鼠标吸附会把正在拔出的棒拉回管中。
        if (!S.demo) drag.update(dt * k);
        advance(Math.min(dt, 0.08) * k);
        rig.draw(S);
        const stage = S.charge > 0 ? (S.power ? '冒气泡' : '留有铜层') : '液面相平';
        const info =
          S.charge > 0 ? (S.blue > 0.65 ? '试纸已变蓝' : S.power ? '负极侧覆铜' : '电源已断开') : '尚未通电';
        card
          .text(
            '<div class="cc"><div class="cc-t"><span class="cc-name">U 形管</span><span class="cc-res">' +
              stage +
              '</span></div><div class="cc-note">' +
              info +
              '</div></div>',
          )
          .loc(group, innerWidth <= 760 ? 0.141 : 0.083, innerWidth <= 760 ? 0.171 : 0.074, 0)
          .show(S.fill === 1 && !mic.isOpen && !bar.playing && S.grip < 0);
        mic.update(dt, k);
        if (mic.isOpen) {
          pause.textContent = scene.paused ? '继续' : '暂停';
          playback.hidden = bar.playing;
        }
      },
      mount(ui) {
        const question = think({
          title: '想一想（选做）',
          q: '氯离子在阳极失去的电子，接下来进入哪里？',
          options: ['进入石墨棒，沿外电路流向电源正极', '进入溶液，游向另一根石墨棒'],
          ok: '电子进入阳极，沿外电路流向电源正极。',
          wrong: ['再看微观图，留意电子离开氯离子后的去向。'],
          status: ui.status,
        });
        const base = mountXuean(ui, {
          intro: INTRO,
          headers: ['操作', '观察到的现象'],
          controls: [
            h('p', { class: 'fineprint cucl2-safety' }, SAFETY),
            moreBox([], reset),
            h(
              'details',
              { class: 'more' },
              h('summary', {}, '模型、近似和出处'),
              h('p', { class: 'fineprint' }, SOURCE),
              h('p', { class: 'fineprint' }, note),
            ),
          ],
        });
        ui.data.nextElementSibling.hidden = true;
        ui.data.append(base.next, question.el);
        W = { ...base, ui, question };
        ui.observePrediction('');
        bar.attach(ui);
      },
      debug: {
        get S() {
          return S;
        },
        qa,
        bar,
        picks: { cup: picks[0], negative: picks[1], positive: picks[2], paper: rig.paper, power: rig.sw },
      },
      dispose() {
        gen++;
        document.body.classList.remove('cucl2-lesson', 'cucl2-demo', 'cucl2-handoff');
        style.remove();
        bar.dispose();
        mic.dispose();
        drag.dispose();
        rig.dispose();
      },
    };
  },
};
