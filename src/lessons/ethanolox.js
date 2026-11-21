import * as THREE from 'three';
import { h } from '../ui/Panel.js';
import { show } from '../ui/prefs.js';
import { demoActs, mountXuean, moreBox, paperSheet, qaFlow, sandbox, wrapPointer } from './kit/chemlesson.js';
import { clamp, draggable } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { micro } from './kit/microworld.js';
import { vec, apparatus, surfaceScene, LAMP, TUBE, RIM, LEVEL, WIRE_HOME, HEAT, ABOVE, DIP, ADD } from './kit/ethanolox-parts.js';

const APPLY = '把滴管尖端对准管口上方，按住胶头滴加少量乙醇，再松手。';
const PUT_BACK = '把滴管放回乙醇滴瓶，再点燃酒精灯。';
const BURN = '拖动铜丝，把螺旋端放进酒精灯火焰。';
const IMMERSE = '提起铜丝，对准试管口，再把螺旋端降到乙醇液面下。';
const REPEAT = '抓住露出管口的线柄，向上提出铜丝。';
const COVER = '点一下灯帽，用灯帽盖灭酒精灯。';
const RELIGHT = '灯已盖灭。要继续灼烧，点一下酒精灯重新点燃。';
const WAFT = '从管口右旁的手掌开始，向右轻划一小段，再松手扇闻。';
const WAFT_AGAIN = '再试一次：按住手掌，向右划过约一个手掌的宽度再松手。';
const WALL = '铜丝碰到了试管外壁，从管口上方伸入。';
const BLACK = '铜丝表面变黑', RED = '黑色退去，露出铜红色', ODOR = '出现刺激性气味';

export default {
  id: 'ethanolox', title: '乙醇的催化氧化', fig: '实验7-5 · 图7-20', stampText: '实验', style: 'paper',
  predict: { q: '铜丝在空气中灼烧后变黑。把黑色的螺旋端插入乙醇，再取出来，会看到什么？', options: ['还是黑色', '重新露出铜红色', '铜丝逐渐消失'], answer: 1 },
  need: '反复灼烧、浸入，观察铜丝的颜色，再小心扇闻。',
  conclusion: { crops: [{ page: 82, rect: [218, 712, 538, 755] }, { page: 83, rect: [98, 54, 350, 97] }],
    quote: '乙醇在加热和有催化剂（如铜或银）存在等条件下，可以被空气中的氧气氧化为乙醛（CH3CHO）。',
    formula: '', src: '必修第二册第 78—79 页 · 实验7-5，图7-20' },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    paperSheet(group, { w: 0.50, d: 0.27 });
    const rig = apparatus(group), dropHome = rig.bottle.tipHome, handHome = rig.hand.position.clone();
    const bottleMouth = dropHome.clone().setY(rig.bottle.mouthY);
    const fresh = () => ({ wire: WIRE_HOME.clone(), dropper: dropHome.clone(), dock: WIRE_HOME.clone(), returns: {}, filled: false, level: 0,
      pour: 0, drops: 0, dropFrom: vec(0, 0), lit: false, capped: false, black: 0, heats: 0, cycles: 0, products: false, smelled: false, grip: '', hand: handHome.clone(), gesture: null, note: APPLY, demo: false });
    let state = fresh(), panel, bar, mic, cancelled = false;
    const say = text => { state.note = text; if (!state.demo) panel?.ui.status(text); };
    const done = id => { if (!state.demo) bar.done(id); };
    const record = row => { if (state.demo) bar.caption(row.join(' · ')); else panel?.tbl.add(row); };
    const inFlame = pos => Math.abs(pos.x - LAMP) < 0.010 && pos.y >= 0.078 && pos.y <= 0.113;
    const aligned = pos => Math.abs(pos.x - TUBE) <= 0.0045;
    const immersed = pos => aligned(pos) && pos.y + 0.019 <= LEVEL + 0.001;
    const overMouth = pos => pos.distanceTo(ADD) < 0.003;
    const sync = () => { rig.wire.position.copy(state.wire); rig.dropper.position.copy(state.dropper); rig.surface(state.black);
      rig.dropper.userData.ringY = Math.max(0.048, state.dropper.y + 0.039); rig.wire.userData.ringY = state.wire.y + (aligned(state.wire) && state.wire.y < RIM ? 0.102 : 0.014);
      rig.hand.position.copy(state.hand); rig.palm.visible = state.capped && !state.smelled;
      rig.drop.visible = state.pour > 0; rig.liquid.setLevel(state.level * (LEVEL - 0.009));
      rig.contents(1 - (state.drops + (state.pour > 0 ? 1 : 0)) / 3, state.level, state.products); };
    const returnTo = (key, destination) => { state.returns[key] = { from: state[key].clone(), to: destination.clone(), elapsed: 0 }; };
    let departing = null, lastPoint = null;
    const begin = key => { departing = lastPoint = null; state.grip = key; delete state.returns[key]; };
    const end = () => { departing = lastPoint = null; state.grip = ''; };
    // 离开热区时公共吸附会撤掉偏移。只在这一刻用几帧消掉偏移，普通拖动直接跟手。
    function easeDeparture(dt) {
      departing.elapsed += dt;
      const left = Math.max(0, 1 - departing.elapsed / 0.14);
      const travel = Math.max(0, 1 - departing.target.distanceTo(departing.exit) / 0.025);
      departing.place(departing.target.clone().addScaledVector(departing.offset, left * left * travel));
      if (!left || !travel) departing = null;
    }
    function follow(key, point, docks, place) {
      const jump = lastPoint ? point.distanceTo(lastPoint) : 0;
      if (!departing && jump > 0.015 && jump < 0.05 &&
          docks.some(dock => lastPoint.distanceTo(dock) < 0.008)) {
        departing = { offset: state[key].clone().sub(point), exit: point.clone(), target: point.clone(), elapsed: 0, place };
      }
      lastPoint = point.clone();
      if (departing) { departing.target.copy(point); easeDeparture(0); }
      else place(point);
    }
    const drip = () => {
      if (state.grip !== 'dropper' || !overMouth(state.dropper) || state.pour || state.filled) return;
      if (state.note !== APPLY) say(APPLY);
      state.dropFrom.copy(state.dropper); rig.drop.position.copy(state.dropFrom); state.pour = 0.30;
    };
    const dropperAvailable = () => !state.filled || state.grip === 'dropper' || state.dropper.distanceTo(dropHome) > 0.001;
    function placeDropper(pos) {
      state.dropper.set(clamp(pos.x, -0.15, 0.15), clamp(pos.y, dropHome.y, 0.16), 0);
      if (Math.abs(pos.x - TUBE) < 0.016 && pos.y < RIM) state.dropper.x = TUBE + (pos.x < TUBE ? -0.017 : 0.017);
      if (Math.abs(pos.x - bottleMouth.x) < 0.023 && Math.abs(pos.x - bottleMouth.x) > 0.002) state.dropper.y = Math.max(state.dropper.y, bottleMouth.y);
      sync();
    }
    const dropDocks = [ADD, bottleMouth], wireDocks = [HEAT, ABOVE, DIP];
    const dropDrag = { obj: rig.dropPick, anchor: rig.dropper, keepOffset: true, enabled: dropperAvailable,
      hint: () => dropperAvailable() ? (state.filled ? PUT_BACK : APPLY) : '',
      dropzones: [
        { name: '试管口', position: ADD, radius: 0.035 },
        { name: '乙醇滴瓶', position: bottleMouth, radius: 0.036 },
      ],
      onStart: () => begin('dropper'), onDrag(pos) { follow('dropper', pos, dropDocks, placeDropper); drip(); },
      onEnd(moved, zone) {
        end();
        if (zone) placeDropper(zone.position);
        if (moved && zone?.position !== ADD) returnTo('dropper', dropHome);
      } };
    function placeWire(pos) {
      const next = vec(clamp(pos.x, -0.15, 0.15), clamp(pos.y, 0.002, 0.134));
      const old = state.wire;
      const across = Math.abs(next.x - TUBE);
      if (next.y < RIM && aligned(old)) {
        if (old.y < RIM || (across < 0.032 && across <= ABOVE.y - next.y)) next.x = TUBE;
        else if (across < 0.022) next.y = RIM;
      } else if (next.y < RIM && across < 0.021) {
        next.x = TUBE + (old.x < TUBE ? -0.022 : 0.022);
        if (state.grip && state.note !== WALL) say(WALL);
      }
      if (aligned(next)) next.y = Math.max(DIP.y, next.y);
      if (Math.abs(next.x - LAMP) < 0.037) next.y = Math.max(0.077, next.y);
      if (state.cycles === 1 && state.heats === 1 && old.y < RIM && next.y >= RIM) { say(BURN); if (!state.demo) bar.say(BURN); }
      state.wire.copy(next); sync();
    }
    const wireDrag = { obj: rig.wirePick, anchor: rig.wire, keepOffset: true, hint: () => state.heats > state.cycles ? IMMERSE : immersed(state.wire) ? REPEAT : BURN,
      dropzones: [
        { name: '酒精灯火焰', position: HEAT, radius: 0.035 },
        { name: '试管口', position: ABOVE, radius: 0.034 },
        { name: '试管内', position: DIP, radius: 0.035, enabled: () => aligned(state.wire) && state.wire.y <= ABOVE.y + 0.001 },
      ],
      onStart: () => begin('wire'), onDrag: pos => follow('wire', pos, wireDocks, placeWire),
      onEnd(moved, zone) {
        if (zone) placeWire(zone.position);
        if (zone && (inFlame(state.wire) || (aligned(state.wire) && (state.wire.y >= RIM || immersed(state.wire))))) {
          state.dock.copy(state.wire);
          if (immersed(state.wire) && (!state.filled || !state.heats && !state.black && !state.products)) say(state.filled ? '铜丝仍是铜红色。先在空气中灼烧，再插入乙醇。' : '螺旋端没有碰到乙醇，管中还是空的。');
          if (inFlame(state.wire) && !state.lit) say('灯芯还没点燃，铜丝没有变黑。');
        } else if (moved) returnTo('wire', state.dock);
        end();
      } };
    const sniffDrag = { obj: rig.rimPick, anchor: rig.hand, keepOffset: true, plane: 'xy', offset: handHome.z, hint: WAFT,
      enabled: () => rig.palm.visible,
      onStart() { begin('hand'); state.gesture = state.hand.clone(); }, onDrag(pos) {
        state.hand.set(clamp(pos.x, -0.14, 0.15), clamp(pos.y, 0.04, 0.18), handHome.z); sync();
        if (state.gesture && pos.x < state.gesture.x - 0.005) state.gesture = null;
      }, onEnd(moved) {
        const right = state.gesture ? state.hand.x - state.gesture.x : 0;
        if (moved && !cancelled && right >= 0.009 && Math.abs(state.hand.y - state.gesture.y) <= right + 0.003 && rig.palm.visible) {
          say('扇闻时察觉到与乙醇不同的刺激性气味。'); record(['扇闻', '管口旁', ODOR]);
          state.smelled = true; done('smell'); if (!state.demo) panel.review.hidden = false;
        } else if (!cancelled && rig.palm.visible) { say(WAFT_AGAIN); if (!state.demo) bar.say(WAFT_AGAIN); }
        state.gesture = null; returnTo('hand', handHome); end();
      } };
    const capTap = { obj: rig.cap.cap, hint: COVER, enabled: () => state.lit, onTap() {
      if (!state.lit) return;
      state.lit = false;
      if (state.cycles < 2) { say(RELIGHT); if (!state.demo) bar.say(RELIGHT); }
    } };
    const canLight = () => !state.lit && state.cycles < 2;
    const lampTap = { obj: rig.lampPick, enabled: canLight, hint: () => canLight() ? '点燃酒精灯' : '', onTap() {
      if (!canLight()) return;
      if (!state.filled || state.grip === 'dropper' || state.returns.dropper || state.dropper.distanceTo(dropHome) > 0.001) return say('先加少量乙醇，把滴管放回，再点灯。');
      state.lit = true; done('light');
      const next = state.heats > state.cycles ? IMMERSE : immersed(state.wire) ? REPEAT : BURN;
      say(next); if (!state.demo) bar.say(next); sync();
    } };
    const drag = draggable(group, [dropDrag, wireDrag, sniffDrag], { taps: [lampTap, capTap], tip: tag('', 'pill hint') });
    function clearDrag() { drag.clearDropzones(); departing = lastPoint = null; }
    function advance(dt) {
      if (departing) easeDeparture(dt);
      for (const [key, ret] of Object.entries(state.returns)) {
        ret.elapsed += dt; const frac = Math.min(1, ret.elapsed / 0.40);
        state[key].lerpVectors(ret.from, ret.to, frac * frac * (3 - 2 * frac));
        if (key === 'dropper' && ret.from.distanceTo(bottleMouth) > 0.001 && Math.abs(ret.from.x - dropHome.x) > 0.002) {
          const entry = bottleMouth.clone().setY(Math.max(bottleMouth.y, ret.from.y));
          if (frac < 0.65) state.dropper.lerpVectors(ret.from, entry, frac / 0.65);
          else state.dropper.lerpVectors(entry, dropHome, (frac - 0.65) / 0.35);
        }
        if (frac === 1) delete state.returns[key];
      }
      if (state.pour > 0) {
        state.pour = Math.max(0, state.pour - dt); const progress = 1 - state.pour / 0.30;
        rig.drop.position.copy(state.dropFrom); rig.drop.position.y += (0.009 + state.level * (LEVEL - 0.009) - state.dropFrom.y) * progress * progress;
        if (!state.pour) {
          state.level = ++state.drops / 3;
          if (state.drops === 3) { state.filled = true; record(['加入乙醇', '试管内', '少量无色液体']); say(PUT_BACK); if (!state.demo) bar.say(PUT_BACK); }
        }
      }
      drip();
      if (state.filled && !state.demo && bar.current === 'add' && !state.grip && !state.returns.dropper && state.dropper.distanceTo(dropHome) < 0.001) {
        done('add'); say('点一下酒精灯，点燃灯芯。');
      }
      rig.lamp.flame.setOn(rig.cap.update(dt, state.lit));
      if (state.cycles >= 2 && !state.lit && rig.cap.k === 0 && !state.capped) { state.capped = true; done('cap'); say(WAFT); }
      if (!state.returns.wire && state.lit && inFlame(state.wire)) {
        state.black = Math.min(1, state.black + dt * 0.93);
        if (state.black === 1 && state.heats === state.cycles) {
          state.heats++; done('heat'); record([`第 ${state.heats} 次`, '灼烧', BLACK]); say(IMMERSE); if (!state.demo && bar.current === 'repeat') bar.say(IMMERSE);
        }
      } else if (!state.returns.wire && state.filled && immersed(state.wire) && state.black > 0) {
        state.products = true;
        state.black = Math.max(0, state.black - dt * 0.92);
        if (!state.black && state.heats > state.cycles) {
          state.cycles++; done('dip'); record([`第 ${state.cycles} 次`, '浸入乙醇', RED]);
          if (!state.demo) panel.ui.observePrediction(RED);
          if (state.cycles >= 2) done('repeat'); say(state.cycles >= 2 ? COVER : REPEAT);
        } else if (!state.black) { record(['短暂灼烧后', '浸入乙醇', '暗色退去']); say('刚才只烧了一会儿。再把螺旋端放进火焰，观察表面怎样变黑。'); }
      }
      sync();
    }
    const card = tag('', 'cond');
    const act = demoActs(drag, group);
    const action = (item, from, to) => act.drag(item, to, { from, t0: 0.035, t1: 0.55, release: 0.70 });
    const travel = (from, to, points) => act.path(rig.wirePick, [from, ...points, to], { t0: 0.035, t1: 0.64, release: 0.88 });
    const aboveLamp = vec(LAMP, RIM + 0.008);
    const restoreBench = () => { rig.cap.snap(state.lit); rig.lamp.flame.setOn(state.lit); sync(); };
    const session = sandbox({ get: () => state, set: value => { state = value; }, fresh, apply: restoreBench });
    const demo = { onStart() { clearDrag(); session.onStart(); microLayer.style.display = 'none'; }, onEnd() {
      clearDrag(); session.onEnd(); microLayer.style.display = ''; if (mic.isOpen) focusSurface();
    } };
    const mouthStart = handHome, mouthEnd = mouthStart.clone().add(vec(0.037, 0.005));
    bar = lessonBar({ look, back, group, ringOptions: { minOpacity: 0.45 }, steps: [
      { id: 'add', title: '加入乙醇', todo: APPLY, target: () => rig.dropper },
      { id: 'light', title: '点燃酒精灯', todo: '点一下酒精灯，点燃灯芯。', target: () => rig.lamp },
      { id: 'heat', title: '灼烧铜丝', todo: BURN, target: () => rig.wire },
      { id: 'dip', title: '插入乙醇', todo: IMMERSE, target: () => rig.wire },
      { id: 'repeat', title: '反复灼烧、浸入', todo: REPEAT, target: () => rig.wire },
      { id: 'cap', title: '盖灭酒精灯', todo: COVER, target: () => rig.cap.cap },
      { id: 'smell', title: '小心扇闻', todo: WAFT, target: () => rig.hand },
    ], reels: { demo: { ...demo, shots: [
      { cap: APPLY, dur: 4, during: act.path(rig.dropPick, [dropHome, vec(dropHome.x, ADD.y + 0.004), ADD], { t0: 0.035, t1: 0.53, release: 0.84 }) },
      { cap: PUT_BACK, dur: 2.4, during: act.path(rig.dropPick, [ADD, vec(dropHome.x, ADD.y), bottleMouth], { t0: 0.035, t1: 0.65, release: 0.76 }) },
      { cap: '点燃酒精灯。', dur: 1.4, during: act.tap(rig.lampPick, 0.25) },
      { cap: BURN, dur: 3.7, during: travel(WIRE_HOME, HEAT, [vec(WIRE_HOME.x, HEAT.y)]) },
      { cap: IMMERSE, dur: 4.4, during: travel(HEAT, DIP, [aboveLamp, ABOVE]) },
      { cap: '把铜丝提出来，再灼烧。', dur: 4.4, during: travel(DIP, HEAT, [ABOVE, aboveLamp]) },
      { cap: '再把螺旋端浸入乙醇，比较前后的颜色。', dur: 4.4, during: travel(HEAT, DIP, [aboveLamp, ABOVE]) },
      { cap: COVER, dur: 1.8, during: act.tap(rig.cap.cap, 0.20) },
      { cap: WAFT, dur: 2.6, during: action(rig.rimPick, mouthStart, mouthEnd) },
    ] } } });
    const atomState = () => ({ heated: Boolean(state.heats || state.black || state.products), dipped: immersed(state.wire) && state.products });
    const atSurface = () => state.wire.clone().add(vec(0, 0.021));
    function focusSurface() { const pos = atSurface(); look([pos.x, pos.y + 0.05, pos.z], [0.06, 0.34, 1], 0.30); }
    let surfaceButton;
    const fireLabel = '钻进火焰看铜丝表面', tubeLabel = '钻进试管看铜丝表面';
    mic = micro({ tag: (...args) => (surfaceButton = tag(...args)), look, back, group, scene: surfaceScene(), bar: () => bar, at: atSurface,
      btnAt: () => immersed(state.wire) ? vec(TUBE, 0.098) : vec(LAMP, 0.078),
      label: fireLabel, state: atomState, show: () => !state.grip && !state.returns.wire && ((state.lit && inFlame(state.wire) && state.heats > 0) || (immersed(state.wire) && state.products)),
      scale: 0.008, lookD: [0.06, 0.34, 1], dist: 0.30 });
    const microLayer = document.querySelectorAll('.mw')[document.querySelectorAll('.mw').length - 1];
    const legend = microLayer.querySelector('.mw-scale'); let paused = false;
    const playback = h('button', { type: 'button', onclick: () => setPaused(!paused) });
    function setPaused(value) { paused = value; playback.textContent = value ? '继续播放' : '暂停播放'; }
    setPaused(false); legend.replaceChildren('微观示意 · 重新进入可重看　', playback); microLayer.classList.add('ethanolox-micro');
    const previousClose = mic.mw.onClose; mic.mw.onClose = () => { setPaused(false); previousClose?.(); };
    microLayer.append(h('style', {}, `.ethanolox-micro.live .mw-scale button{pointer-events:auto;cursor:pointer;border:1px solid #977d5e;border-radius:14px;background:#fffaf1;color:#443c34;padding:3px 12px}.ethanolox-micro .mw-cap{font-size:15px}.ethanolox-micro .mw-hud{background:rgba(253,251,246,.87);border-radius:8px;padding:6px 12px;box-sizing:border-box}@media(max-width:850px){.ethanolox-micro .mw-hud{left:4%!important;width:92%!important;top:100px!important}.ethanolox-micro .mw-eq{font-size:19px}.ethanolox-micro .mw-scale{left:0!important;width:100%!important;top:35px!important}}`));
    const wrapped = wrapPointer(drag, bar);
    const pointer = { ...wrapped, up(ray, event) { if (state.grip === 'dropper') end(); cancelled = event?.type === 'pointercancel'; try { return wrapped.up(ray, event); } finally { cancelled = false; } } };
    function reset() {
      if (bar.playing) bar.stop(); clearDrag(); mic.close(); state = fresh(); restoreBench(); panel.tbl.clear(); panel.review.hidden = true; panel.review.open = false;
      panel.ui.relock(); panel.ui.observePrediction(null); bar.undo('add','light','heat','dip','repeat','cap','smell'); bar.say(null); say(APPLY);
    }
    const move = (name, to) => ({ name, drag: rig.wirePick, to, wait: 2 });
    const qa = qaFlow(drag, [ ...['滴加乙醇', '继续滴加', '加入乙醇'].map(name => ({ name, drag: rig.dropPick, to: ADD })), { name: '放回滴管', drag: rig.dropPick, to: bottleMouth }, { name: '点灯', tap: rig.lampPick }, move('第一次灼烧', HEAT), move('提到管口', ABOVE), move('第一次浸入', DIP),
      { name: '提前盖灭', tap: rig.cap.cap }, { name: '核对提前熄灯', run() { if (state.lit || state.capped || state.cycles !== 1 || bar.current !== 'repeat') throw new Error('提前盖灭改变了实验进度'); } },
      { name: '重新点燃', tap: rig.lampPick }, move('从管口提出', ABOVE), move('第二次灼烧', HEAT), move('再次对准管口', ABOVE), move('第二次浸入', DIP), { name: '盖灭酒精灯', tap: rig.cap.cap },
      { name: '反向不计扇闻', drag: rig.rimPick, to: handHome.clone().add(vec(-0.036, 0)) }, { name: '核对扇闻方向', run() { if (state.smelled || bar.finished) throw new Error('反向扇闻误判'); } },
      { name: '向右短划扇闻', drag: rig.rimPick, to: handHome.clone().add(vec(0.013, 0.006)) }, { name: '核对观察记录', run() { if (state.cycles !== 2 || state.black !== 0 || !bar.finished) throw new Error('两轮颜色或扇闻未完成'); } },
      { name: '钻进去看', run: () => mic.open(), scale: 1, wait: 4 }, { name: '回到桌上', run: () => mic.close() },
    ]);
    sync();
    return { group: root, pointer, card: false, toggles: ['cards','steps'], view: { elev: 18, azim: 0, frameMargin: 1.12 }, size: { w: 0.32, d: 0.14, h: 0.25 },
      mount(ui) {
        ui.el.querySelector('.answer').style.paddingBottom = '75px';
        const review = h('details', { class: 'more', hidden: true }, h('summary', {}, '想一想（选做）'), h('p', { class: 'fineprint' }, '铜丝恢复红色，能说明铜没有参与反应吗？乙醛中的氧原来在哪里？'));
        const model = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'), h('p', { class: 'fineprint' }, '依据：必修第二册第 78—79 页。液滴大小和液面变化为示意。只画铜丝表面；粒子代表局部组成，不是孤立的氧化铜分子。颜色变化和原子移动已放慢，不表示实际反应机理或速率。气味用文字模拟，不能只凭气味鉴定乙醛。'));
        const method = h('p', { class: 'note' }, '向试管中加入少量乙醇，取一根铜丝，下端绕成螺旋状，在酒精灯上灼烧后插入乙醇，反复几次。注意观察反应现象，小心地闻试管中液体产生的气味。');
        panel = { ...mountXuean(ui, { headers: ['操作', '位置或动作', '观察到'], intro: APPLY, controls: [review, model, moreBox([], reset), method, h('p', { class: 'note' }, '乙醇远离明火。实际闻气味时用手轻轻扇动，不要把鼻子凑到管口。')] }), ui, review };
        const next = ui.data.nextElementSibling; next.classList.add('big-next'); ui.controls.prepend(next); panel.next.remove(); ui.observePrediction(null); bar.attach(ui);
      }, reset, update(dt, elapsed) {
        const speed = bar.update(dt);
        const elapsedStep = Math.min(dt, 0.10) * speed;
        drag.update(elapsedStep);
        if (elapsedStep > 0) advance(elapsedStep);
        rig.lamp.flame.update(elapsed);
        surfaceButton.text((immersed(state.wire) ? tubeLabel : fireLabel) + ' ⊙');
        if (!mic.isOpen || (!state.demo && !paused)) mic.update(dt, speed);
        const color = state.black >= 0.99 ? '黑色' : state.black <= 0.01 ? '铜红色' : immersed(state.wire) ? '转红' : '暗褐色';
        card.text(`<div class="cc"><div class="cc-t"><span class="cc-name">螺旋端</span><span class="cc-res">${color}</span></div></div>`).loc(group, state.wire.x + (state.wire.x < 0 ? 0.038 : -0.041), state.wire.y + 0.029, 0).show(show.cards && !state.demo && !mic.isOpen && state.heats > 0 && !state.grip);
      }, dispose() { mic.dispose(); bar.dispose(); drag.dispose(); }, debug: { get S() { return state; }, bar, mic, qa, picks: { wire: rig.wirePick } } };
  },
};
