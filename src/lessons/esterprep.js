import * as THREE from 'three';
import { h } from '../ui/Panel.js';
import { show } from '../ui/prefs.js';
import { lessonBar } from './kit/lessonbar.js';
import { demoActs, mountXuean, moreBox, paperSheet, qaFlow, sandbox, wrapPointer } from './kit/chemlesson.js';
import { clamp, draggable } from './kit/interact.js';
import { micro } from './kit/microworld.js';
import { atomScene, bench, visibleLayer, V, BASE, MOUTH, TIP, DOCK, REST, SOURCE, SITES, BATH, ANGLE } from './kit/esterprep-parts.js';

const INTRO = '把乙醇滴管提到斜试管口，稳住，观察液滴。移开或松手就会停滴。';
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
const bathSite = (index) => V(BATH + (index - 1) * 0.03, 0.008);
const safeDock = () => DOCK.clone();
const fresh = () => ({
  demo: false,
  near: false,
  load: 0,
  fraction: 0,
  dropTime: 0,
  connected: false,
  docked: false,
  immersed: false,
  lit: false,
  oil: 0,
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
  inBath: [false, false, false],
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
      };
    let state = fresh(),
      panel,
      bar,
      lastLabel = '',
      lastHint = '',
      cancel = false;
    const reagent = () => (state.hydro ? HY[state.dose] : PRE[state.load]);
    const targetDose = () =>
      state.hydro ? V(SITES[HY[state.dose][2]], 0.1) : state.load === 4 ? REST.clone().add(V(0, 0.076)) : MOUTH.clone().add(V(0, 0.004));
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
    const nextTube = () => state.inBath.findIndex((value) => !value);
    const shakeText = '左右轻摇试管，再放回架上静置。';
    function instruction() {
      const item = reagent();
      if (state.fault) return FAULT;
      if (state.hydro) {
        if (item) return `将${item[0]}滴入 ${'ABC'[item[2]]} 管（${item[1]}），管尖对准管口后稳住。`;
        const next = nextTube();
        return next < 0 ? '三管就位后同时计时。比较同一时刻三管的酯香强弱（示意）。' : `提起 ${'ABC'[next]} 管，左右轻摇，再从杯口放入热水浴。`;
      }
      if (item)
        return state.load === 3
          ? '把几片碎瓷片拖进斜试管口，防止加热时暴沸。'
          : `把${item[0]}滴到${state.load === 4 ? '右侧接收试管' : '斜试管'}里（${item[1]}）${[1, 2].includes(state.load) ? '，边振荡边慢慢加入。' : '，对准管口后稳住。'}`;
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
      if (state.fault) return null;
      if (state.hydro) return reagent() ? rig.pip : rig.tubes[nextTube()] || null;
      if (reagent()) return state.load === 3 ? rig.chips : rig.pip;
      if (!state.connected) return rig.cork;
      if (!state.docked && !state.heated) return rig.receiver;
      if (!state.heated) return rig.lamp;
      if (!hot() && state.lit && !state.removed) return null;
      if (!state.removed) return rig.receiver;
      if (state.lit) return rig.lamp;
      return state.shaken ? null : rig.receiver;
    };
    const finishDose = () => {
      const [name, amount, index] = reagent();
      log(state.hydro ? 'ABC'[index] + ' 管' : state.load === 4 ? '接收试管' : '反应试管', name + ' ' + amount);
      if (state.hydro) state.dose++;
      else if (++state.load === 5) done('load');
      state.fraction = 0;
      state.grip = null;
      home('pip', SOURCE);
    };
    function canMove(key) {
      if (state.fault) return key === 'receiver' && state.docked;
      if (state.hydro) return key === 'pip' ? !!reagent() : key.startsWith('tube') && !reagent() && !state.inBath[Number(key.slice(4))];
      return key === 'pip'
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
        nextY = clamp(pos.y, key === 'plug' ? 0.072 : 0.002, key === 'pip' ? 0.166 : 0.181);
      if (key === 'receiver' && state.connected && !state.removed) {
        const clearance = TIP.y - 0.073;
        if (Math.abs(loc.x - TIP.x) < 0.009 && Math.min(loc.y, nextY) > clearance && Math.abs(nextX - TIP.x) > 0.009) {
          nextX = TIP.x;
          nextY = Math.min(loc.y, nextY);
        } else if (Math.abs(nextX - TIP.x) >= 0.009 && Math.abs(nextX - TIP.x) < 0.027) nextY = Math.min(clearance, nextY);
      }
      loc.set(nextX, nextY, 0);
      equipment[key].position.copy(loc);
    }
    function end(key) {
      if (state.grip !== key) return;
      state.grip = null;
      const pos = state.poses[key];
      if (key === 'pip') {
        state.dropTime = 0;
        if (state.fraction >= 1) finishDose();
        else home(key, SOURCE);
        return;
      }
      if (key === 'chips') {
        if (!cancel && pos.distanceTo(MOUTH) < 0.012) {
          state.load++;
          log('反应试管', '加入几片碎瓷片');
        }
        home(key, chipHome);
        return;
      }
      if (key === 'plug') {
        if (!cancel && pos.distanceTo(MOUTH) < 0.01) {
          state.connected = true;
          home(key, MOUTH);
        } else home(key, PLUG_HOME);
        return;
      }
      if (key === 'receiver') {
        const gap = TIP.y - pos.y - 0.035 - 0.004 * state.oil;
        if (!cancel && Math.abs(pos.x - TIP.x) < 0.008 && gap < 0.014 && gap > -0.016 && !state.removed && !state.fault) {
          state.docked = true;
          state.immersed = gap <= 0;
          home(key, V(TIP.x, pos.y));
          done('connect');
          status(state.immersed ? '导管口已浸入液面。可下移试管，让管口留在液面上方。' : '导管口停在液面上方。');
          return;
        }
        if (!cancel && pos.distanceTo(REST) < 0.017) {
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
      if (!cancel && state.mixed[index] && Math.abs(pos.x - bathSite(index).x) < 0.016 && pos.y < 0.029 && state.overRim) {
        state.inBath[index] = true;
        home(key, bathSite(index));
        log(SAMPLE[index], '振荡后放入水浴');
      } else {
        home(key, V(SITES[index], 0.009));
        if (!cancel) status(state.mixed[index] ? '先让管底高过烧杯口，再放进水浴。' : '轻轻左右往返振荡，再放入水浴。');
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
    const entries = Object.entries(equipment).map(([key, obj]) => ({
      obj: obj.pick,
      anchor: obj,
      keepOffset: true,
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
      onEnd: () => {
        end(key);
        if (key === 'receiver' && state.docked && !state.fault && !state.returns.receiver?.to.equals(REST))
          state.dockPos = state.returns.receiver?.to.clone();
      },
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
    const microAt = () => (state.hydro ? bathSite(1).add(V(0, 0.063)) : BASE.clone().add(V(0.028, 0.037)));
    const mic = micro({
      tag,
      look,
      back,
      group,
      scene,
      at: microAt,
      btnAt: () => (state.hydro ? V(BATH, 0.119) : V(-0.062, 0.158)),
      label: '钻进去看',
      bar: () => bar,
      show: () => (state.hydro ? state.inBath[1] : state.load >= 3),
      state: () => ({ reverse: state.hydro, react: state.hydro ? state.bathTime > 0 : state.oil > 0, paused: state.paused }),
      key: () => String(state.hydro),
      scale: 0.009,
      lookD: [0.04, 0.39, 1],
      dist: 0.265,
    });
    const card = tag('', 'cond'),
      odors = SITES.map(() => tag('', 'cond'));
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
      '.ester-key{display:block;font:500 15px/1.5 system-ui;margin-top:5px}.ester-scent{display:flex;align-items:center;gap:6px;margin-top:3px;font-size:12px;color:#4c5960}.ester-scent i{width:66px;height:4px;background:linear-gradient(to right,#596d72 var(--scent),#dfddd5 var(--scent))}',
      '.ester-playback{position:absolute;bottom:15%;left:64%;display:flex;gap:8px}.ester-playback .mw-close{position:static}.ester-micro .mw-eq{font:600 22px/1.3 Georgia,serif}.ester-micro .mw-cap{font-size:16px}@media(max-width:760px){.ester-micro .mw-hud,.ester-micro .mw-scale{left:3vw!important;width:94vw!important}.ester-micro .mw-hud{top:112px!important}.ester-micro .mw-eq{font-size:16px}.ester-playback{left:38%}}',
    );
    document.head.append(style);
    function extension(on) {
      if (!state.observed || state.grip) return;
      mic.close();
      state.hydro = on;
      lastHint = '';
    }
    function update(dt, time) {
      for (const [key, ret] of Object.entries(state.returns)) {
        ret.time += dt;
        const u = clamp(ret.time / 0.38, 0, 1);
        state.poses[key].lerpVectors(ret.start, ret.to, u * (2 - u));
        if (u >= 1) delete state.returns[key];
      }
      const item = reagent(), tip = state.poses.pip;
      rig.reactor.rotation.z = ANGLE + (rig.drip.visible && state.grip === 'pip' && !state.hydro && [1, 2].includes(state.load) ? Math.sin(state.phase * Math.PI * 2) * 0.023 : 0);
      const tube = state.hydro ? rig.tubes[item?.[2]] : state.load === 4 ? rig.receiver : rig.reactor;
      const entry = state.grip === 'pip' && item && state.fraction < 1
        ? tube.entryHeight(tip)
        : null;
      const pour = entry !== null;
      rig.drip.visible = pour;
      if (pour) {
        state.dropTime += dt / 0.22;
        rig.drip.position.copy(tip).y -= (tip.y - entry + 0.002) * Math.min(1, state.dropTime);
        if (state.dropTime >= 1) {
          state.dropTime %= 1;
          state.fraction = Math.min(6, Math.round(state.fraction * 6) + 1) / 6;
          if (state.hydro && state.dose < 3) state.ester[item[2]]++;
          else if (state.hydro) state.vol[item[2]] += parseFloat(item[1]) / 6;
        }
      } else state.dropTime = 0;
      const receiving = state.docked && Math.abs(state.poses.receiver.x - TIP.x) < 0.01 && state.poses.receiver.y + 0.072 > TIP.y;
      if (state.lit && !state.removed && receiving) {
        state.oil = Math.min(1, state.oil + dt / 3.2);
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
      if (state.hydro && state.inBath.every(Boolean)) state.bathTime = Math.min(6, state.bathTime + dt);
      if (!state.complete && state.bathTime >= 6) {
        state.complete = true;
        done('compare');
        log('等时水浴（示意）', 'C 管酯香先消退，B 管减弱，A 管变化不明显。');
      }
      if (dt > 0 && (pour || state.lit)) state.phase = (state.phase + dt * 4) % 1;
      Object.entries(equipment).forEach(([key, obj]) => obj.position.copy(state.poses[key]));
      rig.prep.visible = !state.hydro;
      rig.hydro.visible = state.hydro;
      rig.bottle.visible = rig.title.visible = rig.pip.visible = !!reagent() && (state.hydro || state.load !== 3);
      rig.chips.visible = state.load === 3;
      rig.bits.visible = state.load > 3;
      rig.plug.visible = state.load >= 5;
      const title = reagent()?.[0] || '';
      if (title !== lastLabel) {
        lastLabel = title;
        rig.title.setText(title || ' ');
      }
      rig.core.scale.y = Math.max(0.02, 1 - state.fraction);
      const added =
        PRE.slice(0, Math.min(state.load, 3)).reduce((sum, row) => sum + parseFloat(row[1]), 0) +
        (state.load < 3 ? parseFloat(PRE[state.load][1]) * state.fraction : 0);
      rig.reactorLevel(added > 0 ? 0.017 + added * 0.0045 : 0);
      rig.cap.update(dt, state.lit);
      rig.lamp.flame.setOn(state.lit);
      rig.lamp.flame.update(time);
      rig.lamp.flame.visible = state.lit;
      const emulsion = state.shaking ? 1 : state.shaken ? 1 - state.settle : 0,
        sal = state.load > 4 ? 1 : state.load === 4 ? state.fraction : 0;
      const layer = oilDepth() * (1 - emulsion);
      rig.receiver.layersAt(0.035 * sal, layer, emulsion * 0.72);
      rig.receiver.userData.ringY = state.poses.receiver.y + 0.054;
      if (state.docked && !state.grip && !state.returns.receiver) state.immersed = TIP.y <= state.poses.receiver.y + 0.035 + 0.004 * state.oil;
      rig.beads.forEach((bead, i) => {
        bead.visible = state.lit;
        if (!bead.visible) return;
        const rise = (state.phase + i / 6) % 1;
        bead.position.set(0.004 * Math.cos(i * 2.4), 0.011 + rise * 0.022, 0.004 * Math.sin(i * 2.4));
        bead.scale.setScalar(0.5 + rise * 0.7);
      });
      rig.drop.visible = state.lit && receiving && !state.grip;
      if (rig.drop.visible) {
        const along = state.phase;
        rig.drop.position.copy(MOUTH).add(rig.pipe.curve.getPointAt(Math.min(1, along / 0.82)));
        if (along > 0.82) rig.drop.position.y += ((state.poses.receiver.y + 0.035 + 0.004 * state.oil - TIP.y) * (along - 0.82)) / 0.18;
      }
      rig.reflux.visible = state.fault && state.rise > 0;
      const total = rig.reflux.geometry.index.count,
        num = Math.floor((total * state.rise) / 60) * 60;
      rig.reflux.geometry.setDrawRange(total - num, num);
      rig.tubes.forEach((tube, i) => {
        const oil = (state.ester[i] / 6) * 0.0065 * Math.max(0, 1 - state.vol[i] / 5.5);
        tube.layersAt(state.vol[i] ? 0.013 + state.vol[i] * 0.0055 : 0.002, oil);
        tube.userData.ringY = tube.position.y + 0.061;
        const strength = Math.max(0, 1 - state.bathTime * [0, 0.1, 0.25][i]);
        const scent = strength === 0 ? '已消退' : strength <= 0.8 ? '减弱' : '仍明显';
        odors[i].el.style.setProperty('--scent', Math.round(strength * 100) + '%');
        odors[i]
          .text(
            `<div class="cc"><div class="cc-t"><span class="cc-name">${'ABC'[i]} 管</span><span class="cc-res">酯香${scent}</span></div><div class="ester-scent">示意 <i></i></div></div>`,
          )
          .loc(group, tube.position.x + (i - 1) * 0.022, 0.12 + (i === 1 ? 0.02 : 0), 0)
          .show(state.hydro && state.inBath[i] && !mic.isOpen && !state.demo && show.cards && !state.grip);
      });
      const pauseLabel = state.paused ? '继续' : '暂停';
      if (pause.textContent !== pauseLabel) pause.textContent = pauseLabel;
      if (!state.demo) {
        const hint = state.fraction === 1 ? '这一份已经加完，松手放回滴管。' : instruction();
        if (lastHint !== hint) {
          lastHint = hint;
          bar.say(hint);
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
    const doseShot = (cap) => ({
      cap,
      dur: 2.2,
      speed: 2.5,
      during: act.drag(rig.pip.pick, targetDose, { from: () => state.poses.pip, t0: 0.01, t1: 0.32, release: 0.85 }),
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
          at.clone().add(V(-0.018, 0.023)),
          at.clone().add(V(0.015, 0.022)),
          at.clone().add(V(-0.018, 0.022)),
          at.clone().add(V(0.014, 0.025)),
          ...dest,
        ],
        { t0: 0.015, t1: 0.89, release: 0.91 },
      );
    }
    PRE.forEach(([name, amount], i) =>
      shots.push(
        i === 3
          ? moveShot('把碎瓷片加入反应试管。', 'chips', MOUTH)
          : doseShot(`${name} ${amount}，${i === 4 ? '加入接收试管。' : i ? '边振荡边慢慢加入。' : '加入反应试管。'}`),
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
    HY.forEach(([name, amount, index]) => shots.push(doseShot(`${'ABC'[index]} 管：${name} ${amount}。`)));
    SITES.forEach((x, i) =>
      shots.push({
        cap: `振荡 ${'ABC'[i]} 管，放入同一水浴。`,
        dur: 1.9,
        during: rockPath('tube' + i, V(x, 0.009), [V(x, 0.078), V(bathSite(i).x, 0.078), bathSite(i)]),
      }),
    );
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
        mic.close();
        rig.cap.snap(state.lit);
        update(0, 0);
      },
      bar: () => bar,
      view: {
        save: () => ({ open: mic.isOpen, clock: scene.snapshot(), status: panel.ui.now.querySelector('.status').innerHTML }),
        restore: (snap) => {
          status(snap.status);
          if (snap.open) {
            mic.open();
            scene.resume(snap.clock);
          }
        },
      },
    });
    const titles = ['加入试剂和碎瓷片', '连接导管和接收试管', '用小火加热', '先取管再停火', '振荡并静置', '比较酯的水解'];
    bar = lessonBar({
      group,
      look,
      back,
      steps: IDS.map((id, i) => ({ id, title: titles[i], todo: titles[i], target: stepTarget })),
      ringOptions: { minOpacity: 0.42 },
      reels: { demo: { ...box, label: '老师演示', shots } },
    });
    function reset() {
      if (bar.playing) bar.stop();
      mic.close();
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
        const entry = entries[0],
          run = state;
        entry.onStart();
        entry.onDrag(getDest());
        function release() {
          if (state !== run || state.grip !== 'pip') return;
          if (state.fraction >= 1) entry.onEnd();
          else requestAnimationFrame(release);
        }
        requestAnimationFrame(release);
      },
      wait: 2.7,
    });
    const rockQA = (name, key, at, dest) => ({
      name,
      run: () => {
        const entry = entries.find((entry) => entry.obj === equipment[key].pick);
        entry.onStart();
        [at.clone().add(V(-0.018, 0.02)), at.clone().add(V(0.018, 0.02)), at.clone().add(V(-0.018, 0.02)), ...dest].forEach((pos) =>
          entry.onDrag(pos),
        );
        entry.onEnd();
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
      ...SITES.map((x, i) => rockQA('振荡入浴 ' + 'ABC'[i], 'tube' + i, V(x, 0.009), [V(bathSite(i).x, 0.078), bathSite(i)])),
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
    const wrapped = wrapPointer(drag, bar);
    return {
      group: root,
      size: { w: 0.365, d: 0.15, h: 0.239 },
      view: { elev: 18, azim: 0, lookY: 0.46, frameMargin: 1.18 },
      card: false,
      toggles: ['cards', 'steps'],
      pointer: {
        ...wrapped,
        up(ray, event) {
          cancel = event?.type === 'pointercancel';
          try {
            return wrapped.up(ray, event);
          } finally {
            cancel = false;
          }
        },
      },
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
            '制备按必修第二册第 96 页活动 9 用量；第 80 页实验 7-6 的乙醇、浓硫酸、乙酸分别为 3、2、2 mL。每次出现的是对应试剂的专用滴管。加酸同时的振荡由模型配合。',
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
        update(Math.min(dt, 0.05) * speed, time);
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
