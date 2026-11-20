// 必修第二册，第 64–65 页，实验 7-1、图 7-8。
import * as THREE from 'three';
import { h } from '../ui/Panel.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { demoActs, mountXuean, moreBox, paperSheet, qaFlow, sandbox, wrapPointer } from './kit/chemlesson.js';
import { micro } from './kit/microworld.js';
import { apparatus, foilSheet, lightAreas, substitutionScene, V, LEFT, START, LIGHT, SUN, LOOSE, WRAPPED, MICRO_END } from './kit/ch4cl2-parts.js';

const INTRO = '两支倒置的试管均已用排饱和 NaCl 溶液法收集半试管 CH₄ 和半试管 Cl₂，分别固定在铁架台上。';
const COVER = '拖动铝箔，贴到左边试管上，套住气体部分。';
const MOVE = '拖住右边铁架台的底座，将整套装置放在光亮处，避开日光直射。';
const WATCH = '让右管静置，看气体颜色、管壁和管内液面。';
const REVEAL = '将铝箔从左管移开，露出整支试管，比较两管。';
const LOST = '左管提前见光，本轮无法验证遮光对照。';
const DIRECT = '装置进入了日光直射处。反应可能过于剧烈，本轮停止观察。请全部重来。';
const fine = text => h('p', { class: 'fineprint' }, text);

export default {
  id: 'ch4cl2', title: '甲烷与氯气反应', fig: '图7-8', stampText: '实验', style: 'paper',
  predict: {
    q: '两管起初都是黄绿色。一支遮光，另一支放在光亮处。静置后，哪一支管内的液面会上升？',
    options: ['只有光照的一支', '两支都会，气体只要混合就会反应', '两支都不会，气体变色不会影响液面'],
    answer: 0,
  },
  need: '给一支试管遮光，将另一支放在光亮处，静置后比较。',
  conclusion: {
    crops: [{ page: 68, rect: [219, 612, 534, 756] }, { page: 69, rect: [65, 56, 380, 511] }],
    quote: '在室温下，甲烷与氯气的混合气体无光照时不发生反应。光照时，试管内气体颜色逐渐变浅，试管壁出现油状液滴，试管内水面上升。甲烷与氯气发生了化学反应：……在上述反应中，甲烷分子中的４个氢原子被氯原子逐一替代，生成４种不同的取代产物。像这样，有机物分子里的某些原子或原子团被其他原子或原子团所替代的反应叫做取代反应。烷烃在一定条件下，可以与卤素单质发生取代反应。',
    formula: '',
    src: '人教版高中化学必修第二册，第 64–65 页 · 实验 7-1',
  },
  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    paperSheet(group, { w: 0.45, d: 0.21, x: 0.017, z: 0.006 });
    // 盖住第 64 页装置前方的现象与反应式。
    const coverText = new THREE.Mesh(new THREE.PlaneGeometry(0.211, 0.098),
      new THREE.MeshBasicMaterial({ color: 0xfffaef }));
    coverText.rotation.x = -Math.PI / 2;
    coverText.position.set(0.049, 0.0003, 0.162);
    coverText.userData.noFrame = true;
    group.add(coverText);
    lightAreas(group);
    const left = apparatus(group, LEFT, -1), right = apparatus(group, START, -1);
    const sheet = foilSheet(group);
    const cards = [tag('', 'cond'), tag('', 'cond')];
    const scene = substitutionScene();
    let W, cancelled = false;
    const fresh = () => ({ demo: false, near: false, covered: false, lit: false, lostControl: false, invalid: false,
      progress: 0, leftProgress: 0, finished: false, recorded: 0, grip: '', returning: null,
      foil: LOOSE.toArray(), rig: [START, 0, 0] });
    let S = fresh();
    const say = msg => { if (!S.demo) W?.ui.status(msg); };
    const done = id => { if (!S.demo) bar.done(id); };
    const log = (...row) => { if (!S.demo) W?.tbl.add(row); };
    function place() {
      coverText.visible = !W || W.ui.step === 0;
      right.rig.position.fromArray(S.rig);
      sheet.foil.position.fromArray(S.foil);
      const alignment = clamp(1 - sheet.foil.position.distanceTo(WRAPPED) / 0.018, 0, 1);
      sheet.draw(alignment);
      sheet.foil.userData.ringY = sheet.foil.position.y + 0.018;
      right.base.userData.ringY = right.rig.position.y + 0.012;
      right.tube.userData.ringY = 0.095;
      left.draw(S.leftProgress); right.draw(S.progress);
    }
    place();
    const appearance = p => p >= 0.48 ? '有油滴' : p >= 0.20 ? '颜色变浅' : '黄绿色';
    const leftObservation = () => S.leftProgress >= 0.48 ? '气体变浅，管壁有油滴，液面上升'
      : S.leftProgress >= 0.06 ? '管内液面也有上升' : '气体仍呈黄绿色，液面未见上升';
    const foilIsAway = () => sheet.foil.position.distanceTo(WRAPPED) > 0.040;
    function finish() {
      S.finished = true;
      done('compare');
      if (!S.demo) {
        W.review.hidden = false;
        W.ui.observePrediction('右管液面上升。揭开铝箔当下，左管仍呈黄绿色，液面未见上升。');
      }
      say('比较两管的记录，可以掀开课本结论了。');
    }
    function loseControl() {
      if (S.lostControl) return;
      S.lostControl = true;
      log('提前揭开铝箔', LOST);
      if (!S.demo) {
        W.retry.hidden = false;
        W.ui.need(LOST);
        W.ui.observePrediction(LOST);
        bar.say(LOST);
      }
      say(LOST);
    }
    function settle(key, target) {
      const from = S[key].slice();
      S.returning = { key, from, to: target.toArray(), t: 0 };
    }
    function start(key) {
      if (!available(key)) return;
      S.grip = key; S.returning = null;
    }
    function move(key, p) {
      if (S.grip !== key) return;
      if (key === 'foil') S.foil = [clamp(p.x, -0.17, 0.16), clamp(p.y, LOOSE.y, 0.17), LOOSE.z];
      else S.rig = [clamp(p.x, -0.003, 0.166), clamp(p.y, 0, 0.072), 0];
      place();
      if (key === 'foil' && S.covered && S.lit && S.progress < 1 && foilIsAway()) loseControl();
    }
    function releaseFoil(moved) {
      const p = sheet.foil.position;
      if (moved && !cancelled && !S.covered && p.distanceTo(WRAPPED) < 0.010) {
        S.covered = true;
        log('左管套上铝箔', appearance(S.leftProgress));
        done('cover'); say(S.lostControl ? LOST : MOVE);
      } else if (moved && !cancelled && S.covered && foilIsAway()) {
        S.covered = false;
        log('揭开铝箔当下', leftObservation());
        if (!S.lit) {
          if (!S.demo) bar.undo('cover');
          say(COVER);
        } else if (!S.lostControl && S.progress >= 1) finish();
      } else if (moved && !cancelled) say(S.covered ? '铝箔还挡着气柱，再向旁边移一点。' : '铝箔还没套住左管，把它对准黄绿色的气柱。');
      settle('foil', S.covered ? WRAPPED : LOOSE);
    }
    function releaseRig(moved) {
      const x = S.rig[0];
      if (moved && !cancelled && S.rig[1] < 0.008) {
        if (Math.abs(x - SUN) < 0.027) {
          S.invalid = true; S.rig = [x, 0, 0];
          log('放在日光直射处', '中止观察'); say(DIRECT);
          if (!S.demo) bar.say(DIRECT);
          return;
        }
        if (S.covered && Math.abs(x - LIGHT) < 0.029) {
          S.lit = true; S.rig = [x, 0, 0];
          log('右管放在光亮处', '起初呈黄绿色');
          done('light'); say(WATCH); return;
        }
      }
      if (moved && !cancelled) say(S.covered ? '把底座放到光亮处的桌面上，再松手。' : '先用铝箔套住左管，留下遮光对照。');
      settle('rig', V(START, 0));
    }
    const available = key => !mic.isOpen && !S.invalid && !S.finished && (!S.returning || S.returning.key === key) && (key === 'foil' || !S.lit);
    const items = [
      ['foil', sheet.pick, sheet.foil, () => S.covered ? '移开铝箔，观察左管' : '拖动铝箔，套住左管'],
      ['rig', right.pick, right.rig, () => '拖动底座，把右管移到光亮处'],
    ].map(([key, obj, anchor, hint]) => ({
      obj, anchor, offset: key === 'foil' ? LOOSE.z : 0, keepOffset: true,
      enabled: () => available(key), hint: () => available(key) ? hint() : '',
      onStart: () => start(key), onDrag: p => move(key, p),
      onEnd(moved) {
        if (S.grip !== key) return;
        S.grip = '';
        if (key === 'foil') releaseFoil(moved); else releaseRig(moved);
      },
    }));
    const drag = draggable(group, items, { tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const safeTarget = target => !S.invalid && !S.lostControl && !S.grip && !mic.isOpen ? target : null;
    const sb = sandbox({ get: () => S, set: s => { S = s; }, fresh, apply: place });
    let savedMicro = null;
    const bar = lessonBar({
      look, back, group, ringOptions: { color: 0xda6b30, minOpacity: 0.55 },
      steps: [
        { id: 'cover', title: '给左管遮光', todo: COVER, target: () => safeTarget(sheet.foil) },
        { id: 'light', title: '右管移到光亮处', todo: MOVE, target: () => safeTarget(right.base) },
        { id: 'watch', title: '静置观察', todo: WATCH, target: () => safeTarget(right.tube) },
        { id: 'compare', title: '比较两管', todo: REVEAL, target: () => safeTarget(sheet.foil) },
      ],
      reels: { demo: {
        seal: '演示', label: '老师演示',
        onStart() { savedMicro = mic.isOpen ? { ...scene.time } : null; sb.onStart(); mic.close(); W?.ui.el.classList.add('ch4cl2-demo'); },
        onEnd() { W?.ui.el.classList.remove('ch4cl2-demo'); sb.onEnd(); if (savedMicro) { mic.open(); Object.assign(scene.time, savedMicro); savedMicro = null; } },
        shots: [
          { cap: COVER, dur: 3.2, during: act.drag(sheet.pick, WRAPPED, { from: LOOSE }) },
          { cap: MOVE, dur: 3.4, during: act.drag(right.pick, V(LIGHT, 0), { from: V(START, 0) }) },
          { cap: WATCH, dur: 8.2 },
          { cap: REVEAL, dur: 3.4, during: act.drag(sheet.pick, LOOSE, { from: WRAPPED }) },
          { cap: '左管仍呈黄绿色。右管颜色变浅，管壁有油滴，液面升高。', dur: 3.6 },
        ],
      } },
    });
    const mic = micro({ tag, look, back, group, scene, bar: () => bar, label: '钻进去看',
      at: () => V(S.rig[0], 0.102), btnAt: () => V(S.rig[0], 0.018, 0.045),
      lookD: [0.05, 0.29, 1], dist: 0.245, scale: 0.0105,
      show: () => S.lit && !S.invalid && !S.grip, state: () => ({}) });
    const mw = Array.from(document.querySelectorAll('.mw')).pop();
    mw.classList.add('ch4cl2-micro');
    const pause = h('button', { onclick: () => { scene.time.paused = !scene.time.paused; } }, '暂停');
    const replay = h('button', { onclick: () => { scene.time.t = 0; scene.time.paused = false; } }, '从头看');
    mw.querySelector('.mw-hud').append(h('div', { class: 'ch4cl2-play' }, pause, replay));
    mw.querySelector('.mw-scale').textContent = '总反应的原子去向';
    const css = h('style', {}, `
      #panel.ch4cl2-demo{bottom:auto;height:auto}
      .ch4cl2-demo .p-tabs,.ch4cl2-demo .p-body{display:none}
      .ch4cl2-micro .mw-cap{font-size:15px}
      .ch4cl2-micro .mw-eq sub,.ch4cl2-micro .mw-eq sup{line-height:0}
      .ch4cl2-play{display:flex;gap:8px;justify-content:center;margin-top:8px;pointer-events:auto}
      .ch4cl2-play button{background:#fffaf0;border:1px solid #a59579;border-radius:5px;color:#4b463d;padding:4px 14px;cursor:pointer}
      @media(max-width:760px){.ch4cl2-micro .mw-hud,.ch4cl2-micro .mw-scale{left:3vw!important;width:94vw!important}
      .ch4cl2-micro .mw-close{left:auto!important;right:8px;top:34px!important}}
      @media(max-width:760px) and (orientation:portrait){
        .ch4cl2-micro.live{pointer-events:auto}
        .ch4cl2-micro .mw-dim{background:#f5f0e6;mask-image:none;-webkit-mask-image:none}
        .ch4cl2-micro .mw-holo{transform:translateY(12vh)}
        .ch4cl2-micro .mw-scale{top:17vh!important}
        .ch4cl2-micro .mw-hud{top:54vh!important}
        .ch4cl2-micro .mw-eq{font-size:clamp(16px,5.4vw,24px)}
      }
    `);
    document.head.append(css);
    const wrapped = wrapPointer(drag, bar);
    const pointer = { ...wrapped, up(ray, e) {
      cancelled = e?.type === 'pointercancel';
      try { return wrapped.up(ray, e); } finally { cancelled = false; }
    } };
    function reset() {
      if (bar.playing) bar.stop();
      mic.close(); S = fresh(); place();
      W.tbl.clear(); W.review.hidden = W.retry.hidden = true; W.ui.observePrediction(null); W.ui.relock();
      bar.undo('cover', 'light', 'watch', 'compare'); bar.say(null); say(INTRO);
    }
    function observe(dt) {
      if (S.invalid || !S.lit || !mw.hidden) return;
      const exposed = !S.covered || (S.grip === 'foil' && foilIsAway());
      if (S.lostControl && exposed) S.leftProgress = Math.min(1, S.leftProgress + dt / 11);
      if (S.progress >= 1) return;
      S.progress = Math.min(1, S.progress + dt / 7.2);
      if (S.recorded === 0 && S.progress >= 0.20) { S.recorded++; log('右管静置', '黄绿色变浅，液面开始上升'); }
      if (S.recorded === 1 && S.progress >= 0.48) { S.recorded++; log('继续观察右管', '管壁出现油状液滴'); }
      if (S.progress === 1) {
        done('watch');
        if (S.lostControl) {
          log('右管静置结束', S.covered ? '左管已重新遮光' : leftObservation());
          if (!S.demo) { bar.say(LOST); W.ui.need(LOST); }
        } else say(REVEAL);
      }
    }
    function card(tag, name, value, x) {
      tag.text(`<div class="cc"><div class="cc-t"><span class="cc-name">${name}</span><span class="cc-res">${value}</span></div></div>`)
        .loc(group, x, 0.165, 0).show(!bar.playing && !mic.isOpen && !S.grip);
    }
    const qa = qaFlow(drag, [
      { name: '铝箔套住左管', drag: sheet.pick, to: WRAPPED },
      { name: '右管移到光亮处', drag: right.pick, to: V(LIGHT, 0), wait: 0.25 },
      { name: '静置观察', run() { if (!S.covered || !S.lit) throw Error('装置未就位'); }, wait: 8 },
      { name: '移开铝箔比较', drag: sheet.pick, to: LOOSE },
      { name: '钻进去看', run() { if (!S.finished || !bar.finished) throw Error('观察完成后结论仍未解锁'); mic.open(); }, wait: 2, scale: 1 },
      { name: '回到桌上', run: () => mic.close(), wait: 2 },
    ]);
    return {
      group: root, pointer, card: false, toggles: ['cards', 'steps'],
      size: { w: 0.36, d: 0.15, h: 0.19 }, view: { elev: 17, azim: 1, lookY: 0.48, frameMargin: 1.06 },
      mount(ui) {
        const retry = h('button', { class: 'go', hidden: true, onclick: reset }, '重做遮光对照');
        const review = h('details', { class: 'more', hidden: true }, h('summary', {}, '想一想（选做）'),
          fine('管壁上的油滴会是一氯甲烷吗？结合第 64–65 页给出的沸点想一想。'));
        const model = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'),
          fine(INTRO), fine('现象和取代产物见课本第 64–65 页。静置时间已缩短，颜色、液面高度和油滴大小为示意。'),
          fine('微观图按总反应追踪原子去向。四次取代各消耗一分子 Cl₂，管内不同分子的取代程度可以不同。'),
          fine('生成的 HCl 易溶于水，部分有机产物凝成液滴，气体体积减小，槽内溶液进入试管。'));
        W = { ...mountXuean(ui, { controls: [retry, review, model, moreBox([], reset)], headers: ['操作', '观察到的现象'], intro: INTRO }), ui, review, retry };
        W.next.remove(); ui.observePrediction(null); bar.attach(ui);
      },
      reset,
      update(dt) {
        const k = bar.update(dt), d = dt * k;
        const r = S.returning;
        if (r) {
          r.t += Math.min(dt, 0.06) * (k > 0 ? 1 : 0);
          const u = Math.min(1, r.t / 0.38), s = u * u * (3 - 2 * u);
          S[r.key] = r.from.map((v, i) => v + (r.to[i] - v) * s);
          if (u === 1) S.returning = null;
        }
        observe(d); place();
        card(cards[0], '左管', S.covered ? '已遮光' : appearance(S.leftProgress), LEFT);
        card(cards[1], '右管', S.invalid ? '已中止' : appearance(S.progress), S.rig[0]);
        mic.update(dt, k);
        pause.textContent = scene.time.paused ? '继续' : '暂停';
        pause.hidden = scene.time.t >= MICRO_END;
      },
      dispose() { W?.ui.el.classList.remove('ch4cl2-demo'); mic.dispose(); sheet.dispose(); css.remove(); drag.dispose(); bar.dispose(); },
      debug: { get S() { return S; }, bar, qa, mic, scene, picks: { foil: sheet.pick, rig: right.pick } },
    };
  },
};
