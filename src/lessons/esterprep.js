import * as THREE from 'three';
import { h } from '../ui/Panel.js';
import { show } from '../ui/prefs.js';
import { lessonBar } from './kit/lessonbar.js';
import { demoActs, mountXuean, moreBox, paperSheet, qaFlow, sandbox, wrapPointer } from './kit/chemlesson.js';
import { clamp, draggable } from './kit/interact.js';
import { micro } from './kit/microworld.js';
import { atomScene, bench, visibleLayer, V, BASE, MOUTH, TIP, DOCK, REST, SOURCE, CUP_HOME, SITES, bathSite, BATH, BATH_WATER_Y, ANGLE } from './kit/esterprep-parts.js';

const READ_SCALE = '平视液面，读凹液面最低处对应的刻度。';
const INTRO = '点量筒名牌，平视凹液面最低处。回到实验台，把量筒口移到反应试管口，慢慢倒入乙醇。';
const OBS = '静置后，上层是无色透明的油状液体，下层是水溶液。';
const EARLY = '本轮收集量少，未见清晰分层。';
const FAULT = '先停火且导管口浸在液体中：冷却时液体沿导管回升。取下接收试管，停止本轮实验，全部重来。';
const SAMPLE = ['A · 水', 'B · 酸', 'C · 碱'];
const PRE = [
  ['乙醇', '2 mL'],
  ['浓硫酸', '0.5 mL'],
  ['乙酸', '2 mL'],
  ['碎瓷片', '几片'],
  ['饱和 Na₂CO₃ 溶液', '3 mL'],
];
const HY = [
  ['乙酸乙酯', '6 滴', 0],
  ['乙酸乙酯', '6 滴', 1],
  ['乙酸乙酯', '6 滴', 2],
  ['蒸馏水', '5.5 mL', 0],
  ['3 mol/L H₂SO₄', '0.5 mL', 1],
  ['蒸馏水', '5.0 mL', 1],
  ['6 mol/L NaOH', '0.5 mL', 2],
  ['蒸馏水', '5.0 mL', 2],
];
const IDS = ['load', 'connect', 'heat', 'remove', 'settle', 'compare'];
const PLUG_HOME = MOUTH.clone().add(V(0.044, -0.072));
const chipHome = V(-0.143, 0.002);
const STAGING_Y = bathSite(1).y, BATH_BOTTOM_Y = 0.008;
const safeDock = () => DOCK.clone();
const fresh = () => ({
  demo: false,
  near: false,
  load: 0,
  fraction: 0,
  dropTime: 0,
  tilt: 0,
  returningDose: null,
  connected: false,
  docked: false,
  immersed: false,
  lit: false,
  oil: 0,
  condensate: 0,
  chipFall: 0,
  heated: false,
  removed: false,
  shaken: false,
  settle: 0,
  observed: false,
  fault: false,
  rise: 0,
  hydro: false,
  dose: 0,
  vol: [0, 0, 0],
  ester: [0, 0, 0],
  staged: [false, false, false],
  bathDepth: 0,
  mixed: [false, false, false],
  bathTime: 0,
  complete: false,
  grip: null,
  shaking: 0,
  reversals: 0,
  direction: 0,
  phase: 0,
  paused: false,
  poses: {
    pip: SOURCE.clone(),
    cup: CUP_HOME.clone(),
    chips: chipHome.clone(),
    plug: PLUG_HOME.clone(),
    receiver: REST.clone(),
    ...Object.fromEntries(SITES.map((x, i) => ['tube' + i, V(x, 0.009)])),
  },
  returns: {},
});

export default {
  id: 'esterprep',
  title: '乙酸乙酯的制备',
  fig: '实验7-6 · 图7-22',
  style: 'paper',
  stampText: '实验',
  predict: { q: '接收试管振荡后再静置，生成的乙酸乙酯会在哪里？', options: ['浮在水溶液上面', '沉到试管底部', '均匀溶在水溶液里'], answer: 0 },
  need: '小火制酯，取下接收试管后停火，振荡、静置，观察分层。',
  conclusion: {
    crops: [
      { page: 84, rect: [219, 378, 536, 495] },
      { page: 84, rect: [219, 510, 536, 592] },
    ],
    quote:
      '在反应过程中，右侧试管内液体的上层有无色透明的油状液体产生，并可以闻到香味，这种有香味的液体是乙酸乙酯。……这种酸与醇反应生成酯和水的反应，叫做酯化反应。为了提高酯化反应的速率，一般需要加热，并加入浓硫酸等催化剂。酯化反应是可逆反应，乙酸乙酯会与水发生水解反应生成乙酸和乙醇。',
    formula: 'CH₃COOH + C₂H₅OH ⇌ CH₃COOC₂H₅ + H₂O（浓硫酸、加热）',
    src: '必修第二册 第 80 页 · 乙醇与乙酸',
  },
  create({ tag, look, back }) {
    const root = new THREE.Group(),
      group = new THREE.Group();
    root.add(group);
    paperSheet(group, { w: 0.56, d: 0.27 });
    const rig = bench(group),
      equipment = {
        pip: rig.pip,
        chips: rig.chips,
        plug: rig.plug,
        receiver: rig.receiver,
        ...Object.fromEntries(rig.tubes.map((tube, i) => ['tube' + i, tube])),
        cup: rig.cup,
      };
    let state = fresh(),
      panel,
      bar,
      lastHint = '';
    const reagent = () => (state.hydro ? HY[state.dose] : PRE[state.load]);
    const dosingKey = () => state.hydro && state.dose < 3 ? 'pip' : 'cup';
    const doseHome = (key) => key === 'pip' ? SOURCE : CUP_HOME;
    const targetDose = () => {
      const mouth = state.hydro ? V(SITES[reagent()[2]], 0.096) : state.load === 4 ? REST.clone().add(V(0, 0.072)) : MOUTH.clone();
      return mouth.add(V(0, !state.hydro && state.load === 4 ? 0.015 : 0.009));
    };
    const log = (...cells) => {
      if (!state.demo) panel?.tbl.add(cells);
    };
    const status = (text) => {
      if (!state.demo) panel?.ui.status(text);
    };
    const done = (id) => {
      if (!state.demo) bar.done(id);
    };
    const home = (key, to) => {
      state.returns[key] = { start: state.poses[key].clone(), to: to.clone(), time: 0 };
    };
    const hot = () => state.oil >= 0.98;
    const oilDepth = () => 0.004 * state.oil;
    const nextTube = () => state.staged.findIndex((value) => !value);
    const shakeText = '左右轻摇试管，再放回架上静置。';
    function instruction() {
      const item = reagent();
      if (state.fault) return state.docked ? FAULT : '已取下接收试管。点全部重来，重新连接装置。';
      if (state.hydro) {
        if (item) return dosingKey() === 'pip'
          ? `把滴管移到 ${'ABC'[item[2]]} 管口上方，滴入 6 滴乙酸乙酯。`
          : `用量筒向 ${'ABC'[item[2]]} 管加入${item[1]} ${item[0]}。`;
        const next = nextTube();
        if (next >= 0) return `提起 ${'ABC'[next]} 管，左右轻摇，再移到烧杯口上方。`;
        return state.bathTime > 0 ? '三管同时入浴。比较同一时刻三管的酯香强弱（示意）。' : '三管已就位，一起降入热水中。';
      }
      if (item)
        return state.load === 3
          ? '把几片碎瓷片拖进斜试管口，防止加热时暴沸。'
          : `用量筒向${state.load === 4 ? '接收试管' : '反应试管'}加入${item[1]} ${item[0]}${[1, 2].includes(state.load) ? '，边振荡边慢慢加入。' : '，筒口靠近管口后稳住。'}`;
      if (!state.connected) return '拿住橡胶塞，把带导管的塞子塞进斜试管口。';
      if (!state.docked && !state.heated) return '先把接收试管移到导管正下方，再向上托起，使导管口高出液面约 0.5 cm。';
      if (!state.heated) return state.immersed ? '管口已浸入液体，可下移试管；若此时加热再先停火，冷却时可能倒吸。' : '点酒精灯，用小火加热。';
      if (state.lit && !state.removed && !hot()) return '看蒸气在导管内冷凝，液滴进入接收试管。';
      if (!state.removed) return '先下移接收试管，使管口脱离导管，再放回右侧试管架。';
      if (state.lit) return '点酒精灯，盖灭火焰。';
      if (!state.shaken) return shakeText;
      if (!state.observed) return '静置，观察有无分层。';
      if (!visibleLayer(oilDepth())) return EARLY + '可全部重来，等接收试管中出现清晰油层再取管。';
      return '可以掀开结论，也可以展开左栏的水解实验继续比较。';
    }
    const stepTarget = () => {
      if (state.fault) return state.docked ? rig.receiver.glass : null;
      if (state.near || state.grip || state.returningDose) return null;
      if (state.hydro) return reagent() ? rig[dosingKey()] : rig.tubes[nextTube()]?.glass || null;
      if (reagent()) return state.load === 3 ? rig.chips : rig[dosingKey()];
      if (!state.connected) return rig.cork;
      if (!state.docked && !state.heated) return rig.receiver.glass;
      if (!state.heated) return state.immersed ? rig.receiver.glass : rig.lamp;
      if (!hot() && state.lit && !state.removed) return null;
      if (!state.removed) return rig.receiver.glass;
      if (state.lit) return rig.lamp;
      return state.shaken ? null : rig.receiver.glass;
    };
    const finishDose = () => {
      const [name, amount, index] = reagent();
      log(state.hydro ? 'ABC'[index] + ' 管' : state.load === 4 ? '接收试管' : '反应试管', amount === '6 滴' ? name + ' 6 滴' : '已加入' + name);
      if (state.hydro) state.dose++;
      else if (++state.load === 5) done('load');
      state.fraction = 0;
      state.returningDose = null;
    };
    function canMove(key) {
      if (state.near || state.returningDose) return false;
      if (state.fault) return key === 'receiver' && state.docked;
      if (state.hydro) return key === dosingKey() ? !!reagent() : key.startsWith('tube') && !reagent() && !state.staged[Number(key.slice(4))];
      return key === 'cup'
        ? !!reagent() && state.load !== 3
        : key === 'chips'
          ? state.load === 3
          : key === 'plug'
            ? state.load === 5 && !state.connected
            : key === 'receiver' && state.connected && !state.observed;
    }
    function start(key) {
      if (!canMove(key)) return;
      delete state.returns[key];
      state.grip = key;
      state.direction = 0;
      state.reversals = 0;
    }
    function move(key, pos) {
      if (state.grip !== key) return;
      const loc = state.poses[key],
        dx = pos.x - loc.x;
      if (((key === 'receiver' && state.removed && !state.lit) || key.startsWith('tube')) && Math.abs(dx) > 0.00045) {
        const sign = Math.sign(dx);
        if (state.direction && sign !== state.direction) state.reversals++;
        state.direction = sign;
        if (state.reversals >= 2) {
          if (key === 'receiver') state.shaking = 1;
          else state.mixed[Number(key.slice(4))] = true;
        }
      }
      let nextX = clamp(pos.x, -0.17, 0.168),
        nextY = clamp(pos.y, key === 'cup' ? CUP_HOME.y : key === 'plug' ? 0.072 : 0.002, key === 'pip' ? 0.166 : 0.181);
      if (key === 'receiver' && state.connected && !state.removed) {
        const clearance = TIP.y - 0.073;
        if (Math.abs(loc.x - TIP.x) < 0.009 && Math.min(loc.y, nextY) > clearance && Math.abs(nextX - TIP.x) > 0.009) {
          nextX = TIP.x;
          nextY = Math.min(loc.y, nextY);
        } else if (Math.abs(nextX - TIP.x) >= 0.009 && Math.abs(nextX - TIP.x) < 0.027) nextY = Math.min(clearance, nextY);
      }
      if (key.startsWith('tube') && nextX > BATH - 0.064 && nextY < 0.066) {
        if (loc.x <= BATH - 0.064) nextX = BATH - 0.064;
        else nextY = 0.066;
      }
      loc.set(nextX, nextY, 0);
      equipment[key].position.copy(loc);
    }
    function end(key, zone) {
      if (state.grip !== key) return;
      state.grip = null;
      const pos = state.poses[key];
      if (key === 'pip' || key === 'cup') {
        state.dropTime = 0;
        if (state.fraction >= 1) state.returningDose = key;
        home(key, doseHome(key));
        return;
      }
      if (key === 'chips') {
        if (zone) {
          state.load++;
          state.chipFall = 1;
          log('反应试管', '加入几片碎瓷片');
        }
        home(key, chipHome);
        return;
      }
      if (key === 'plug') {
        if (zone) {
          state.connected = true;
          home(key, MOUTH);
        } else home(key, PLUG_HOME);
        return;
      }
      if (key === 'receiver') {
        const gap = TIP.y - pos.y - 0.035 - 0.004 * state.oil;
        if (zone && zone !== rackZone && Math.abs(pos.x - TIP.x) < 0.008 && !state.removed && !state.fault) {
          state.docked = true;
          state.immersed = gap <= 0;
          state.dockPos = V(TIP.x, pos.y);
          home(key, state.dockPos);
          if (!state.immersed) done('connect');
          else if (!state.demo) bar.undo('connect');
          status(state.immersed ? '导管口已浸入液面。可下移试管，让管口留在液面上方。' : '导管口停在液面上方。');
          return;
        }
        if (zone === rackZone) {
          if (state.fault) {
            state.docked = false;
            state.immersed = false;
          } else if (state.heated && !state.removed) {
            state.removed = true;
            state.docked = state.immersed = false;
            done('heat');
            log('取下试管', state.lit ? '火焰仍在' : '火焰已灭');
            if (!state.lit) done('remove');
          } else if (state.removed && !state.lit && state.shaking) {
            state.shaken = true;
            state.shaking = 0;
            state.settle = 0;
          } else if (!state.heated) {
            state.docked = state.immersed = false;
            if (!state.demo) bar.undo('connect');
          }
          home(key, REST);
          return;
        }
        home(key, state.docked ? state.dockPos || DOCK : REST);
        return;
      }
      const index = Number(key.slice(4));
      if (zone) {
        state.staged[index] = true;
        home(key, bathSite(index));
        log(SAMPLE[index], '已振荡，在杯口上方就位');
      } else {
        home(key, V(SITES[index], 0.009));
        status(state.mixed[index] ? '提起试管，把管底移到烧杯口上方。' : '先左右轻摇试管，再移到烧杯口上方。');
      }
    }
    function fire() {
      if (state.fault || state.hydro || !state.connected) return;
      if (!state.lit) {
        if (!state.docked || state.removed) return;
        state.heated = state.lit = true;
        log('小火加热', state.immersed ? '导管口在液面下' : '导管口在液面上');
      } else {
        state.lit = false;
        if (state.immersed && state.docked) {
          state.fault = true;
          log('先停火', '溶液沿导管回升');
          status(FAULT);
        } else if (state.removed) {
          done('remove');
          log('酒精灯', '火焰熄灭');
        } else {
          status('导管口未入液，没有倒吸。可重新小火加热，收集后先取下试管。');
          if (!state.oil) state.heated = false;
        }
      }
    }
    const rackZone = { name: '试管架', position: REST, radius: 0.025, enabled: () => state.docked || !!state.shaking };
    function zones(key) {
      if (key === 'pip' || key === 'cup') return [{ name: '管口', position: targetDose, radius: 0.030, enabled: () => !!reagent() }];
      if (key === 'chips' || key === 'plug') return [{ name: '反应试管口', position: MOUTH, radius: 0.030 }];
      if (key === 'receiver') {
        const canDock = () => !state.removed && !state.fault && !(state.docked && state.heated);
        return [rackZone,
          { name: '液面上方', position: DOCK, radius: 0.030, enabled: () => canDock() && (!state.docked || state.immersed) },
          { name: '液面下方', position: () => DOCK.clone().add(V(0, 0.023)), radius: 0.021, enabled: () => canDock() && !state.immersed }];
      }
      const index = Number(key.slice(4));
      return [{ name: '烧杯口上方', position: bathSite(index), radius: 0.032,
        enabled: () => state.overRim && state.mixed[index] }];
    }
    const entries = Object.entries(equipment).map(([key, obj]) => ({
      obj: obj.pick,
      anchor: obj,
      keepOffset: true,
      dropzones: zones(key),
      plane: 'xy',
      enabled: () => canMove(key),
      hint: () => (canMove(key) ? instruction() : ''),
      onStart: () => {
        start(key);
        if (key.startsWith('tube')) state.overRim = false;
      },
      onDrag: (pos) => {
        move(key, pos);
        if (key.startsWith('tube') && pos.y > 0.064 && Math.abs(pos.x - BATH) < 0.05) state.overRim = true;
      },
      onEnd: (moved, zone) => end(key, zone),
    }));
    const lampEnabled = () => !state.hydro && !state.fault && (state.lit || state.docked);
    const drag = draggable(group, entries, {
      tip: tag('', 'pill'),
      taps: [
        {
          obj: rig.lamp.pick,
          enabled: lampEnabled,
          hint: () => (lampEnabled() ? (state.lit ? '点酒精灯，盖灭火焰' : '点酒精灯，用小火加热') : ''),
          onTap: fire,
        },
      ],
    });
    const scene = atomScene();
    const microAt = () => state.hydro ? state.poses.tube1.clone().add(V(0, 0.052)) : BASE.clone().add(V(0.024, 0.018));
    let microButton;
    const mic = micro({
      tag: (text, cls, click) => {
        microButton = tag(text, cls, click);
        return microButton;
      },
      look,
      back,
      group,
      scene,
      at: microAt,
      btnAt: () => state.hydro ? state.poses.tube1.clone().add(V(0, 0.049, 0.018)) : BASE.clone().add(V(0.048, 0.038, 0.014)),
      label: '钻进反应试管里看',
      bar: () => bar,
      show: () => !state.grip && !state.near && (state.hydro ? state.bathTime > 0 : state.load >= 3),
      state: () => ({ reverse: state.hydro, react: state.hydro ? state.bathTime > 0 : state.oil > 0, paused: state.paused }),
      key: () => String(state.hydro),
      scale: 0.009,
      lookD: [0.04, 0.39, 1],
      dist: 0.265,
    });
    const card = tag('', 'cond'),
      odors = SITES.map(() => tag('', 'cond'));
    function readMeasure() {
      if (state.near) { state.near = false; lastHint = ''; back(); return; }
      if (!canMove('cup') || state.grip || state.demo || state.returns.cup) return;
      state.near = true;
      lastHint = '';
      const ml = parseFloat(reagent()[1]) * (1 - state.fraction);
      look([CUP_HOME.x - 0.0063, rig.cup.readY(ml), 0], [0, 0, 1], 0.115, () => { state.near = false; lastHint = ''; });
    }
    const measurePlate = tag('', 'pill ester-measure', readMeasure);
    const overlay = Array.from(document.querySelectorAll('.mw')).pop();
    const pause = h(
      'button',
      {
        class: 'mw-close',
        onclick: () => {
          state.paused = !state.paused;
        },
      },
      '暂停',
    );
    const replay = h(
      'button',
      {
        class: 'mw-close',
        onclick: () => {
          state.paused = false;
          scene.resume(0);
        },
      },
      '重播',
    );
    const playback = h('div', { class: 'ester-playback' }, pause, replay);
    overlay.append(playback);
    overlay.classList.add('ester-micro');
    const style = h(
      'style',
      {},
      '.ester-measure.moving{pointer-events:none}.ester-key{display:block;font:500 15px/1.5 system-ui;margin-top:5px}.ester-scent{display:flex;align-items:center;gap:6px;margin-top:3px;font-size:12px;color:#4c5960}.ester-scent i{width:66px;height:4px;background:linear-gradient(to right,#596d72 var(--scent),#dfddd5 var(--scent))}',
      '.ester-playback{position:absolute;bottom:15%;left:64%;display:flex;gap:8px}.ester-playback .mw-close{position:static}.ester-micro .mw-eq{font:600 22px/1.3 Georgia,serif}.ester-micro .mw-cap{font-size:16px}@media(max-width:760px){.ester-micro .mw-hud,.ester-micro .mw-scale{left:3vw!important;width:94vw!important}.ester-micro .mw-hud{top:112px!important}.ester-micro .mw-eq{font-size:16px}.ester-playback{left:38%}}',
    );
    document.head.append(style);
    function extension(on) {
      if (!state.observed || state.grip || state.returningDose) return;
      mic.close();
      if (state.near) { state.near = false; back(); }
      state.hydro = on;
      lastHint = '';
    }
    function update(dt, time, handDt = dt) {
      drag.update(Math.min(handDt, 0.025));
      for (const [key, ret] of Object.entries(state.returns)) {
        ret.time += handDt;
        const u = clamp(ret.time / 0.42, 0, 1);
        state.poses[key].lerpVectors(ret.start, ret.to, u * u * (3 - 2 * u));
        if (u >= 1) {
          delete state.returns[key];
          if (key === state.returningDose) finishDose();
        }
      }
      if (state.observed && !state.demo && panel && panel.extend.open !== state.hydro) extension(panel.extend.open);
      const item = reagent(), key = dosingKey(), tip = state.poses[key];
      const tube = state.hydro ? rig.tubes[item?.[2]] : state.load === 4 ? rig.receiver : rig.reactor;
      const entry = item && state.grip === key && state.fraction < 1 ? tube.entryHeight(tip) : null;
      const aligned = entry !== null;
      const ml = key === 'cup' && item && state.load !== 3 ? parseFloat(item[1]) : 0;
      const left = Math.max(0, ml * (1 - state.fraction));
      const angle = aligned && key === 'cup' ? rig.cup.pourAngle(left) : 0;
      state.tilt += clamp(angle - state.tilt, -handDt * 4.8, handDt * 4.8);
      const pouring = aligned && key === 'cup' && Math.abs(angle - state.tilt) < 0.06;
      rig.reactor.rotation.z = ANGLE + (pouring && !state.hydro && [1, 2].includes(state.load) ? Math.sin(state.phase * Math.PI * 2) * 0.018 : 0);
      rig.drip.visible = aligned && key === 'pip';
      if (rig.drip.visible) {
        state.dropTime += dt / 0.27;
        const fall = Math.min(1, state.dropTime);
        const surface = state.poses['tube' + item[2]].y + 0.003 + state.ester[item[2]] * 0.0015;
        rig.drip.position.copy(tip);
        rig.drip.position.y -= (tip.y - surface) * fall * fall;
        if (state.dropTime >= 1) {
          state.dropTime %= 1;
          state.ester[item[2]]++;
          state.fraction = state.ester[item[2]] / 6;
        }
      } else state.dropTime = 0;
      if (pouring) {
        const prev = state.fraction;
        state.fraction = Math.min(1, prev + dt / 1.25);
        if (state.hydro) state.vol[item[2]] += (state.fraction - prev) * ml;
      }
      const receiving = state.docked && Math.abs(state.poses.receiver.x - TIP.x) < 0.01 && state.poses.receiver.y + 0.072 > TIP.y;
      if (state.lit && !state.removed && receiving) {
        state.condensate += dt / 0.64;
        if (state.condensate >= 1) {
          state.condensate %= 1;
          state.oil = Math.min(1, state.oil + 0.2);
        }
        if (hot()) done('heat');
      }
      if (state.fault && state.docked) state.rise = Math.min(1, state.rise + dt / 1.4);
      if (state.shaken && !state.observed && !state.grip) {
        state.settle = Math.min(1, state.settle + dt / 1.9);
        if (state.settle >= 1) {
          state.observed = true;
          done('settle');
          const observation = visibleLayer(oilDepth()) ? OBS : EARLY;
          log('接收试管', observation + (observation === OBS ? '有香味（气味示意）。' : ''));
          if (!state.demo) {
            panel.ui.unlock();
            panel.next.hidden = false;
            panel.review.hidden = panel.extend.hidden = false;
            panel.ui.observePrediction(observation);
          }
        }
      }
      if (state.hydro && nextTube() < 0 && !SITES.some((_, i) => state.returns['tube' + i])) {
        const remainingToWater = Math.max(0, STAGING_Y - state.bathDepth - BATH_WATER_Y);
        const descentSpeed = 0.055;
        state.bathDepth = Math.min(STAGING_Y - BATH_BOTTOM_Y, state.bathDepth + dt * descentSpeed);
        for (let i = 0; i < SITES.length; i++) state.poses['tube' + i].y = STAGING_Y - state.bathDepth;
        state.bathTime = Math.min(6, state.bathTime + Math.max(0, dt - remainingToWater / descentSpeed));
      }
      if (!state.complete && state.bathTime >= 6) {
        state.complete = true;
        done('compare');
        log('等时水浴（示意）', 'C 管酯香先消退，B 管减弱，A 管变化不明显。');
      }
      if (dt > 0 && (pouring || state.lit)) state.phase = (state.phase + dt * 4) % 1;
      Object.entries(equipment).forEach(([key, obj]) => obj.position.copy(state.poses[key]));
      rig.prep.visible = !state.hydro;
      rig.hydro.visible = state.hydro;
      rig.holder.position.y = STAGING_Y - state.bathDepth + 0.058;
      rig.bottle.visible = rig.pip.visible = !!item && key === 'pip';
      rig.cup.visible = !!item && key === 'cup' && state.load !== 3;
      if (rig.cup.visible) rig.cup.draw(ml * (1 - state.fraction), state.tilt, state.near);
      const cupPos = state.poses.cup;
      const carrying = state.grip === 'cup' || !!state.returns.cup;
      measurePlate.el.classList.toggle('moving', carrying || state.demo);
      measurePlate.text(state.near ? '回到实验台' : '量筒 · ' + (item?.[0] || ''))
        .loc(group, cupPos.x + (state.near ? 0.014 : -0.006 + 0.045 * Math.sin(state.tilt)),
          state.near ? rig.cup.readY(left) + 0.013 : cupPos.y + (carrying ? 0.024 : 0.009), 0.012)
        .show(rig.cup.visible && !mic.isOpen);
      microButton.text((state.hydro ? '钻进 B 管里看' : '钻进反应试管里看') + ' ⊙');
      rig.chips.visible = state.load === 3;
      state.chipFall = Math.max(0, state.chipFall - dt / 0.38);
      rig.bits.visible = state.load > 3;
      rig.bits.position.y = 0.007 + 0.109 * (1 - (1 - state.chipFall) ** 2);
      rig.plug.visible = state.load >= 5;
      rig.core.scale.y = Math.max(0.001, 1 - state.fraction);
      rig.core.position.y = 0.0035 + 0.0165 * rig.core.scale.y;
      const added =
        PRE.slice(0, Math.min(state.load, 3)).reduce((sum, row) => sum + parseFloat(row[1]), 0) +
        (state.load < 3 ? parseFloat(PRE[state.load][1]) * state.fraction : 0);
      const reactorY = rig.reactorLevel(Math.max(0, added - 0.45 * state.oil));
      if (pouring && !state.hydro && state.load < 3) {
        const angle = rig.reactor.rotation.z;
        const wallY = BASE.y + (0.0108 - Math.cos(angle) * (tip.x - BASE.x)) / Math.sin(angle);
        const hit = V(tip.x, wallY);
        const endY = Math.max(reactorY, BASE.y + 0.003);
        rig.drawStream(tip, hit, V(hit.x - (endY - wallY) * Math.tan(angle), endY));
      } else if (pouring) {
        const surface = state.hydro ? tube.position.y + 0.013 + state.vol[item[2]] * 0.0055
          : REST.y + Math.max(0.002, 0.035 * state.fraction);
        rig.drawStream(tip, V(tip.x, surface));
      } else rig.drawStream();
      const activeLoad = state.load + (state.fraction > 0 && !state.hydro ? 1 : 0);
      rig.reactorName.setText(activeLoad === 0 ? '反应试管' : activeLoad === 1 ? '反应试管 · 乙醇' :
        activeLoad === 2 ? '反应试管 · 乙醇、浓硫酸' : state.heated ? '反应试管 · 酯化反应液' : '反应试管 · 乙醇、浓硫酸、乙酸');
      rig.cap.update(dt, state.lit);
      rig.lamp.flame.setOn(state.lit);
      rig.lamp.flame.update(time);
      rig.lamp.flame.visible = state.lit;
      const emulsion = state.shaking ? 1 : state.shaken ? 1 - state.settle : 0,
        sal = state.load > 4 ? 1 : state.load === 4 ? state.fraction : 0;
      const layer = oilDepth() * (1 - emulsion);
      rig.receiverName.setText(state.oil > 0 ? '接收试管 · 碳酸钠溶液、乙酸乙酯' : sal ? '接收试管 · 饱和 Na₂CO₃ 溶液' : '接收试管');
      rig.receiver.layersAt(0.035 * sal - 0.008 * state.rise, layer, emulsion * 0.72);
      rig.receiver.glass.userData.ringY = state.poses.receiver.y + 0.054;
      if (state.docked && !state.grip && !state.returns.receiver) state.immersed = TIP.y <= state.poses.receiver.y + 0.035 + 0.004 * state.oil;
      rig.beads.forEach((bead, i) => {
        bead.visible = state.lit;
        if (!bead.visible) return;
        const rise = (state.phase + i / 6) % 1;
        const angle = rig.reactor.rotation.z, x = 0.003 * Math.cos(i * 2.4);
        const bottom = 0.008, worldY = BASE.y + x * Math.sin(angle) + bottom * Math.cos(angle);
        const height = rise * Math.max(0, reactorY - worldY - 0.0013);
        bead.position.set(x + height * Math.sin(angle), bottom + height * Math.cos(angle), 0.003 * Math.sin(i * 2.4));
        bead.scale.setScalar(0.5 + rise * 0.7);
      });
      rig.drawDistillate(state.lit && receiving && !state.grip && !hot(), state.condensate,
        Math.min(TIP.y, state.poses.receiver.y + 0.035 + oilDepth()));
      rig.reflux.visible = state.fault && state.rise > 0;
      const total = rig.reflux.geometry.index.count,
        num = Math.floor((total * state.rise) / 60) * 60;
      rig.reflux.geometry.setDrawRange(total - num, num);
      rig.tubes.forEach((tube, i) => {
        const oil = (state.ester[i] / 6) * 0.0065 * Math.max(0, 1 - state.vol[i] / 5.5);
        tube.layersAt(state.vol[i] ? 0.013 + state.vol[i] * 0.0055 : 0, oil);
        tube.glass.userData.ringY = tube.position.y + 0.061;
        const medium = ['水', '硫酸溶液', 'NaOH 溶液'][i];
        tube.contents.setText(state.ester[i] ? '乙酸乙酯' : '');
        tube.medium.setText(state.vol[i] ? medium : '');
        const strength = Math.max(0, 1 - state.bathTime * [0, 0.1, 0.25][i]);
        const scent = strength === 0 ? '已消退' : strength <= 0.8 ? '减弱' : '仍明显';
        odors[i].el.style.setProperty('--scent', Math.round(strength * 100) + '%');
        odors[i]
          .text(
            `<div class="cc"><div class="cc-t"><span class="cc-name">${'ABC'[i]} 管</span><span class="cc-res">酯香${scent}</span></div><div class="ester-scent">示意 <i></i></div></div>`,
          )
          .loc(group, tube.position.x + (i - 1) * 0.022, 0.12 + (i === 1 ? 0.02 : 0), 0)
          .show(state.hydro && state.bathTime > 0 && !mic.isOpen && !state.demo && show.cards && !state.grip);
      });
      const pauseLabel = state.paused ? '继续' : '暂停';
      if (pause.textContent !== pauseLabel) pause.textContent = pauseLabel;
      if (!state.demo) {
        const hint = state.fraction === 1 ? '这一份已经加完，松手放回器材。' : instruction();
        if (lastHint !== hint) {
          lastHint = hint;
          bar.say(state.near ? READ_SCALE : hint);
          if (panel && (state.load > 0 || state.fraction === 1)) status(hint);
        }
      }
      const visible = show.cards && !state.demo && !mic.isOpen && !state.grip;
      const res = state.fault ? '回升' : state.shaken && state.settle < 1 ? '静置中' : visibleLayer(layer) ? '油层' : state.observed ? '未见清晰分层' : sal ? '澄清' : '';
      const pos = state.poses.receiver;
      card
        .text(`<div class="cc"><div class="cc-t"><span class="cc-name">接收试管</span><span class="cc-res">${res}</span></div></div>`)
        .loc(group, pos.x + 0.008, pos.y + 0.085, -0.007)
        .show(visible && !state.hydro && !!res);
    }
    const act = demoActs(drag, group);
    const shots = [];
    const doseShot = (cap, key) => ({
      cap,
      dur: 2.5,
      speed: 2.5,
      during: act.drag(rig[key].pick, targetDose, { from: () => state.poses[key], t0: 0.01, t1: 0.40, release: 0.80 }),
    });
    const moveShot = (cap, key, to) => ({
      cap,
      dur: 1.25,
      during: act.drag(equipment[key].pick, to, { from: () => state.poses[key], t0: 0.01, t1: 0.74, release: 0.76 }),
    });
    function rockPath(key, at, dest) {
      return act.path(
        equipment[key].pick,
        [
          () => state.poses[key],
          at.clone().add(V(-0.018, 0.042)),
          at.clone().add(V(0.015, 0.042)),
          at.clone().add(V(-0.018, 0.042)),
          at.clone().add(V(0.014, 0.045)),
          ...dest,
        ],
        { t0: 0.015, t1: 0.89, release: 0.91 },
      );
    }
    PRE.forEach(([name, amount], i) =>
      shots.push(
        i === 3
          ? moveShot('把碎瓷片加入反应试管。', 'chips', MOUTH)
          : doseShot(`${name} ${amount}，${i === 4 ? '加入接收试管。' : i ? '边振荡边慢慢加入。' : '加入反应试管。'}`, 'cup'),
      ),
    );
    shots.push(
      moveShot('用带导管的塞子连接装置。', 'plug', MOUTH),
      { cap: '接收试管对准导管，导管口不浸入溶液。', dur: 1.8, during: act.path(rig.receiver.pick, [REST, V(TIP.x, 0.009), DOCK], { t0: 0.025, t1: 0.89, release: 0.92 }) },
      { cap: '小火加热，冷凝液进入接收试管。', dur: 3, speed: 2, during: act.tap(rig.lamp.pick, 0.1) },
      { cap: '先取下接收试管。', dur: 1.8, during: act.path(rig.receiver.pick, [DOCK, V(TIP.x, 0.009), REST], { t0: 0.025, t1: 0.89, release: 0.92 }) },
      { cap: '再盖灭酒精灯。', dur: 0.9, during: act.tap(rig.lamp.pick, 0.3) },
      { cap: shakeText, dur: 1.9, during: rockPath('receiver', REST, [REST]) },
      { cap: '静置后，观察上层的透明油层。', dur: 2.1, speed: 2 },
      { cap: '换到水解实验，三支试管各取六滴酯。', dur: 0.6, enter: () => extension(true) },
    );
    HY.forEach(([name, amount, index], i) => shots.push(doseShot(`${'ABC'[index]} 管：${name} ${amount}。`, i < 3 ? 'pip' : 'cup')));
    SITES.forEach((x, i) =>
      shots.push({
        cap: `振荡 ${'ABC'[i]} 管，移到烧杯口上方。`,
        dur: 1.9,
        during: rockPath('tube' + i, V(x, 0.009), [V(x, STAGING_Y), bathSite(i)]),
      }),
    );
    shots.push({ cap: '三管一起降入热水中。', dur: 1.8 });
    shots.push({ cap: '比较三管在相同水浴时间内酯香的变化（示意）。', dur: 2.4, speed: 4 });
    shots.forEach((shot) => {
      if (shot.during) {
        const animate = shot.during;
        shot.enter = () => animate(0);
      }
    });
    const box = sandbox({
      get: () => state,
      set: (value) => {
        state = value;
        lastHint = '';
      },
      fresh,
      apply: () => {
        drag.clearDropzones();
        mic.close();
        rig.cap.snap(state.lit);
        update(0, 0);
      },
      bar: () => bar,
      view: {
        save: () => ({ near: state.near, open: mic.isOpen, clock: scene.snapshot(), status: panel.ui.now.querySelector('.status').innerHTML }),
        restore: (snap) => {
          status(snap.status);
          if (snap.open) {
            mic.open();
            scene.resume(snap.clock);
          } else if (snap.near) readMeasure();
        },
      },
    });
    const titles = ['加入试剂和碎瓷片', '连接导管和接收试管', '用小火加热', '先取管再停火', '振荡并静置', '比较酯的水解'];
    bar = lessonBar({
      group,
      look,
      back,
      steps: IDS.map((id, i) => ({ id, title: titles[i], get todo() { return state.near ? READ_SCALE : instruction(); }, target: stepTarget })),
      ringOptions: { minOpacity: 0.42 },
      reels: { demo: { ...box, label: '老师演示', shots } },
    });
    function reset() {
      if (bar.playing) bar.stop();
      mic.close();
      drag.clearDropzones();
      state = fresh();
      lastHint = '';
      panel.tbl.clear();
      panel.next.hidden = panel.review.hidden = panel.extend.hidden = true;
      panel.ui.el.querySelectorAll('details[open]').forEach((el) => {
        el.open = false;
      });
      panel.ui.observePrediction(null);
      bar.undo(...IDS);
      panel.ui.relock();
      status(INTRO);
      back();
      update(0, 0);
    }
    const doseQA = (name, getDest) => ({
      name,
      run: () => {
        const entry = drag.items().find((it) => it.anchor === rig[dosingKey()]),
          run = state;
        entry.onStart();
        entry.onDrag(getDest());
        function release() {
          if (state !== run || state.grip !== dosingKey()) return;
          if (state.fraction >= 1) entry.onEnd(true);
          else requestAnimationFrame(release);
        }
        requestAnimationFrame(release);
      },
      wait: 2.7,
    });
    const rockQA = (name, key, at, dest) => ({
      name,
      run: () => {
        const entry = drag.items().find((entry) => entry.obj === equipment[key].pick);
        entry.onStart();
        [at.clone().add(V(-0.018, 0.02)), at.clone().add(V(0.018, 0.02)), at.clone().add(V(-0.018, 0.02)), ...dest].forEach((pos) =>
          entry.onDrag(pos),
        );
        entry.onEnd(true);
      },
      wait: 2.8,
    });
    const qa = qaFlow(drag, [
      ...PRE.map(([name], i) => (i === 3 ? { name, drag: rig.chips.pick, to: MOUTH } : doseQA(name, targetDose))),
      { name: '连接导管', drag: rig.plug.pick, to: MOUTH },
      { name: '托起接收试管', drag: rig.receiver.pick, to: safeDock },
      { name: '小火加热', tap: rig.lamp.pick, wait: 5 },
      { name: '取下试管', drag: rig.receiver.pick, to: REST },
      { name: '停止加热', tap: rig.lamp.pick },
      rockQA('振荡静置', 'receiver', REST, [REST]),
      {
        name: '酯化微观',
        run: () => {
          if (!state.observed) throw Error('未观察到分层');
          mic.open();
        },
        wait: 2,
        scale: 1,
      },
      {
        name: '水解实验',
        run: () => {
          mic.close();
          panel.extend.open = true;
          extension(true);
        },
        wait: 2,
      },
      ...HY.map(([name, , index]) => doseQA('ABC'[index] + ' 管 ' + name, targetDose)),
      ...SITES.map((x, i) => rockQA('振荡就位 ' + 'ABC'[i], 'tube' + i, V(x, 0.009), [bathSite(i)])),
      { name: '观察水解', run: () => {}, wait: 8 },
      {
        name: '水解微观',
        run: () => {
          if (!state.complete) throw Error('水浴对照未完成');
          mic.open();
        },
        wait: 4,
        scale: 1,
      },
      { name: '回到实验台', run: () => mic.close(), wait: 2 },
    ]);

    return {
      group: root,
      size: { w: 0.365, d: 0.15, h: 0.239 },
      view: { elev: 18, azim: 0, lookY: 0.46, frameMargin: 1.18 },
      card: false,
      toggles: ['cards', 'steps'],
      pointer: wrapPointer(drag, bar),
      reset,
      mount(ui) {
        const extend = h(
          'details',
          { class: 'more', hidden: true },
          h('summary', {}, '实验活动 1 · 比较水解'),
          h('p', { class: 'fineprint' }, '展开换到水浴实验，收起回到制备装置。三支试管各取六滴乙酸乙酯，总加液量相同。'),
        );
        extend.addEventListener('toggle', () => {
          if (!state.demo && state.hydro !== extend.open) extension(extend.open);
        });
        const review = h(
          'details',
          { class: 'more', hidden: true },
          h('summary', {}, '想一想（选做）'),
          h('p', {}, '导管口离开液面，为什么能防止倒吸？'),
          h('p', {}, '停止加热后，蒸气冷凝，反应试管内压强降低。管口不浸入液体，外界空气就能进入。'),
        );
        const note = h(
          'details',
          { class: 'more' },
          h('summary', {}, '模型、近似和出处'),
          h(
            'p',
            {},
            '制备按必修第二册第 96 页活动 9 用量；第 80 页实验 7-6 的乙醇、浓硫酸、乙酸分别为 3、2、2 mL。量筒已按课本用量装液。点量筒名牌可平视刻度，按凹液面最低处读数。加酸同时的振荡由模型配合。',
          ),
          h(
            'p',
            {},
            '水解按选择性必修 3 第 98 页活动 1。水浴为 70～80 ℃。油层厚度、滴速和水解时间均为示意。短条表示酯香强弱，不是实测浓度。碱性水解生成乙酸盐和乙醇。',
          ),
          h(
            'p',
            {},
            '星号只追踪乙醇的氧，不改变原子颜色。动画只示意净键变，不是逐步机理；水解动画以酸性条件为例。参见密歇根大学有机化学实验 216，实验 3。',
          ),
        );
        panel = {
          ...mountXuean(ui, { controls: [extend, review, note, moreBox([], reset)], headers: ['器材或操作', '这一轮的记录'], intro: INTRO }),
          ui,
          review,
          extend,
        };
        if (ui.el.querySelector('.page-crop')) ui.el.querySelector('.answer .formula')?.remove();
        ui.data.nextElementSibling.hidden = true;
        ui.observePrediction(null);
        bar.attach(ui);
        update(0, 0);
      },
      update(dt, time) {
        const speed = bar.update(dt);
        update(Math.min(dt, 0.05) * speed, time, speed ? Math.min(dt, 0.05) : 0);
        mic.update(dt, speed);
      },
      dispose() {
        style.remove();
        mic.dispose();
        bar.dispose();
        drag.dispose();
      },
      debug: {
        get S() {
          return state;
        },
        bar,
        qa,
        mic,
        picks: { receiver: rig.receiver.pick, dropper: rig.pip.pick },
      },
    };
  },
};
