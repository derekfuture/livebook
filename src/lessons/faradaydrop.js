// 选必二第 30–31 页：手插磁体看闭合回路的电流，图 2.2-1 用高阻电压传感器测峰值。
import * as THREE from 'three';
import { FaradayDrop, DROP_TOP, dropFlux } from './kit/faradayDrop.js';
import { faradayDropRig, MAGNET_DOCKS } from './kit/faradayDropRig.js';
import { draggable, clamp } from './kit/interact.js';
import { qaFlow } from './kit/chemlesson.js';
import { faradayDropPlot } from './kit/faradayDropPlot.js';
import { h, seg, table, buttons } from './kit/ui.js';

const HAND_COIL = 0.094, UP = 0.183, DOWN = HAND_COIL + 0.008;
const HAND_R = 1000;
const point = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const mouth = point(0, DROP_TOP), docks = MAGNET_DOCKS.map(x => point(x, 0.035));
const modes = ['手插磁体', '管中落体'];
const hints = [
  '拖动磁体，让滑块从上标记移到下标记。把磁体提回上标记，换个速度再插一次。',
  '把线圈移到距管口 20、30、40 或 50 cm 处，向右拉柄释放磁体。也可换匝数或换磁体。',
];
const missedPlug = '插头没对准接线柱，已接回原来的抽头。';
const still = '磁体停住时，即使有磁感线穿过线圈，表针也会回零。';
const noSpeedComparison = '本轮未比较快慢。';
const markedInsertion = r => r.direction === '插入' && Math.abs(r.startY - UP) < 0.001 && Math.abs(r.endY - DOWN) < 0.001;

function dropFactor(a, b) {
  const sameHeight = Math.round(a.distance * 1000) === Math.round(b.distance * 1000);
  if (sameHeight && a.turns === b.turns && a.magnet !== b.magnet) return 'magnet';
  if (sameHeight && a.turns !== b.turns && a.magnet === b.magnet) return 'turns';
  if (Math.abs(a.distance - b.distance) > 0.003 && a.turns === b.turns && a.magnet === b.magnet) return 'height';
}

export default {
  id: 'faradaydrop',
  fig: '图2.2-1',
  title: '探究感应电动势大小的影响因素',
  stampText: '实验',
  predict: {
    q: '用同一磁体和线圈，让滑块从上标记移到下标记。一次慢插，一次快插，哪一次电流表的最大偏转更大？',
    options: ['快插时更大', '两次一样大', '慢插时更大'], answer: 0,
  },
  conclusion: {
    page: 35, rect: [64.52, 119.12, 379.55, 245.5],
    quote: '闭合电路中感应电动势的大小，跟穿过这一电路的磁通量的变化率成正比。',
    why: '用同一磁体，让滑块从上标记移到下标记，两次穿过每匝线圈的磁通量变化量相同。经过同一位置时，磁体运动越快，磁通量变化越快，感应电动势就越大。回路电阻一定时，磁通量变化最快的时刻也是电流偏离零值最远的时刻。每匝磁通量的变化率相同时，匝数加倍，感应电动势也加倍。',
    src: '课本第 31 页 · 第二章 第2节 法拉第电磁感应定律',
  },
  create(ctx) {
    const rig = faradayDropRig(UP, DOWN), root = new THREE.Group();
    const fieldLabel = ctx.tag('磁感线（示意）', 'sticky').loc(rig.magnets[0], -0.042, 0.044, 0);
    fieldLabel.el.style.cssText = 'font:600 clamp(12px,1.05vw,16px)/1.3 sans-serif;color:#216965;background:#fff9eb;padding:2px 5px;border-radius:3px;white-space:nowrap';
    root.add(rig.group);
    const plot = faradayDropPlot();
    const legend = h('p', { class: 'note' });
    const feedback = h('p', { class: 'status', 'aria-live': 'polite' });
    const instruction = h('p', { class: 'note' });
    const rows = table(['距管口 / cm', '匝数', '磁体', '|U|峰值 / V']);
    const captions = ['电流随时间的变化（模拟）', '电压随下落时间的变化（模拟）'];
    const caption = h('b', {}, captions[0]);
    const recordBox = h('div', {}, h('p', { class: 'note' }, '下落记录（模拟值）'), rows.el);
    const handTraces = [], dropTraces = [];
    let ui, drop = false, turns = 300, distance = 0.2, loaded = 0, activeMagnet = 0;
    let model = new FaradayDrop(), hand = null, retreat = null, carrying = false;
    let trace = null, reference = null, needle = 0, signal = 0, flux = -1, dialKey = '', dirty = true;
    let lastPlot = 0, trayMagnet = null;
    const say = text => { feedback.textContent = text; };
    const enter = () => { if (ui.step !== 1) ui.go(1); };
    const unlocked = () => { ui.unlock(); ui.need(''); };
    const free = () => !model.running && !retreat && !carrying && !hand;
    const hint = (enabled, text) => () => ui?.step === 1 && enabled() ? text : '';
    const port = n => point(n === 300 ? 0.085 : 0.125, rig.coil.position.y - 0.027, 0.055);
    const fluxMax = dropFlux(0, { turns: 1, strength: 2 }).linkage;
    function readFlux(y, strength = 1) {
      flux = dropFlux(y - rig.coil.position.y, { turns: 1, strength }).linkage / fluxMax;
    }
    function showField() {
      rig.fields.forEach((field, i) => { field.visible = i === activeMagnet; });
      const magnet = rig.magnets[activeMagnet];
      if (drop) fieldLabel.text(`磁体 ${activeMagnet ? 'B' : 'A'} 的磁感线（示意）`);
      else fieldLabel.text('磁感线（示意）').loc(magnet, -0.042, 0.044, 0);
    }
    function instrument() {
      if (drop) fieldLabel.loc(rig.group, -0.20, clamp(rig.magnets[activeMagnet].position.y + 0.015, 0.095, DROP_TOP), 0);
      const state = !drop ? '感应电流' : model.running ? '采集中 · 慢放' : loaded !== null ? '等待释放' : '采集结束';
      const shownFlux = carrying || retreat?.obj === rig.magnets[activeMagnet] || rig.magnets[activeMagnet].position.x !== 0 ? -1 : flux;
      const key = [state, Math.round(needle * (drop ? 1200 : 25)), Math.round(shownFlux * 32)].join('/');
      if (key !== dialKey) { rig.display(drop, needle, shownFlux, state); dialKey = key; }
    }
    function describe(r) {
      if (r.drop) return +(r.distance * 100).toFixed(1) + ' cm · ' + r.turns + ' 匝 · ' + (r.magnet ? 'B' : 'A');
      return r.direction + ' · ' + r.turns + ' 匝' + (r.strokeTime ? ' · ' + r.strokeTime.toFixed(2) + ' s' : '');
    }
    function graph() {
      plot.draw(drop, trace, reference);
      legend.textContent = trace ? '实线：' + describe(trace) + (reference ? '　虚线：' + describe(reference) : '') : '';
      dirty = false;
    }
    function setup(isDrop) {
      drop = isDrop; hand = retreat = null; carrying = false;
      loaded = 0; activeMagnet = 0; trayMagnet = null; model = new FaradayDrop(); needle = signal = 0;
      rig.arrangement(drop); rig.moveCoil(drop ? distance : DROP_TOP - HAND_COIL, turns);
      rig.magnets[0].position.set(0, drop ? DROP_TOP : UP, 0); rig.magnets[1].position.copy(docks[1]);
      showField();
      rig.gate.position.x = 0;
      const list = drop ? dropTraces : handTraces;
      trace = list[list.length - 1]; reference = trace?.reference;
      readFlux(rig.magnets[0].position.y); instrument();
      choices.set(Number(drop)); caption.textContent = captions[Number(drop)]; instruction.textContent = hints[Number(drop)];
      recordBox.hidden = !drop || !dropTraces.length; graph(); say('');
    }
    const choices = seg('', modes, (_, index) => {
      if (drop === !!index) return;
      if (!free()) { choices.set(Number(drop)); return; }
      desk.clearDropzones(); hideTip(); setup(!!index); ctx.reframe();
    });
    function addSample(r, t, value) {
      r.time = t; r.peak = Math.max(r.peak, Math.abs(value));
      const s = r.samples;
      if (!value && s.length > 1 && !s[s.length - 1][1] && !s[s.length - 2][1]) s[s.length - 1][0] = t;
      else s.push([t, value]);
      dirty = true;
    }
    function startHand() {
      enter();
      const y = rig.magnets[0].position.y;
      hand = { startY: y, lastY: y, last: performance.now(), start: 0, trial: null };
    }
    function slide(y) {
      const now = performance.now(), dy = y - hand.lastY;
      if (Math.abs(dy) < 0.00001) return;
      if (!hand.trial) {
        hand.start = hand.last;
        const direction = dy < 0 ? '插入' : '抽出';
        trace = { turns, direction, startY: hand.startY, samples: [[0, 0]], time: 0, peak: 0 };
        reference = handTraces.slice().reverse().find(r => r.direction === direction);
        trace.reference = reference; hand.trial = trace;
      }
      const movingText = dy < 0 ? '磁体插入，穿过线圈的磁通量增大。' : '磁体抽出，穿过线圈的磁通量减小。';
      if (feedback.textContent !== movingText) say(movingText);
      if ((dy < 0 && trace.direction === '抽出') || (dy > 0 && trace.direction === '插入')) {
        trace.direction = '往返'; reference = trace.reference = null;
      }
      // Approximate the actual stroke as linear between pointer events. Integrate changes
      // in flux linkage so a fast pointer crossing cannot skip the active part of the coil.
      const seconds = Math.max(0.001, (now - hand.last) / 1000);
      const slices = Math.max(1, Math.ceil(Math.abs(dy) / 0.002));
      const start = (hand.last - hand.start) / 1000;
      let linkage = dropFlux(hand.lastY - HAND_COIL, { turns }).linkage;
      for (let i = 1; i <= slices; i++) {
        const next = dropFlux(hand.lastY + dy * i / slices - HAND_COIL, { turns }).linkage;
        signal = -(next - linkage) / (seconds / slices) / HAND_R * 1e6;
        addSample(trace, start + seconds * i / slices, signal); linkage = next;
      }
      rig.magnets[0].position.y = y;
      trace.strokeTime = trace.time; trace.endY = y;
      hand.last = now; hand.lastY = y; readFlux(y);
    }
    function stopHand() {
      if (!hand) return;
      signal = 0;
      if (hand.trial) {
        addSample(trace, (performance.now() - hand.start) / 1000, 0);
        let message = still;
        if (markedInsertion(trace)) {
          const prior = handTraces.slice().reverse().find(r => markedInsertion(r) && r.turns === trace.turns &&
            Math.max(r.strokeTime, trace.strokeTime) > 1.1 * Math.min(r.strokeTime, trace.strokeTime));
          if (prior) {
            reference = trace.reference = prior;
            const [fast, slow] = trace.strokeTime < prior.strokeTime ? [trace, prior] : [prior, trace];
            message = `从上标记到下标记，用时较短的一次电流峰值约为 ${fast.peak.toFixed(1)} μA，用时较长的一次约为 ${slow.peak.toFixed(1)} μA。`;
            ui.observePrediction(message); unlocked();
          } else message = '表针回零了。提回上标记，保持匝数相同，再用明显不同的速度插到下标记。';
        } else if (trace.direction === '插入') message = '表针回零了。要比较快慢，两次都让滑块从上标记移到下标记。';
        handTraces.push(trace); say(message);
      } else say('按住不动，磁通量没有变化，表针停在零位。');
      hand = null;
    }
    const handEnabled = () => !drop && !retreat;
    const handDrag = { obj: rig.picks[0], anchor: rig.magnets[0], plane: 'xy', keepOffset: true,
      enabled: handEnabled, hint: hint(handEnabled, '上下拖：插入或抽出磁体'),
      onStart: startHand, onDrag(p) { slide(clamp(p.y, DOWN, 0.223)); }, onEnd: stopHand };
    function slideBack(obj, path, update) {
      const route = new THREE.CurvePath();
      for (let i = path.length - 1; i > 0; i--) {
        if (!path[i].equals(path[i - 1])) route.add(new THREE.LineCurve3(path[i], path[i - 1]));
      }
      if (route.curves.length) retreat = { obj, route, time: 0, update };
    }
    const plugEnabled = () => !model.running && !retreat;
    const plugDrag = { obj: rig.plug, plane: 'xy', offset: 0.055, keepOffset: true, enabled: plugEnabled,
      hint: hint(plugEnabled, '拖插头：换接线圈匝数'),
      dropzones: [300, 600].map(n => ({ name: n + ' 匝', position: () => port(n), radius: 0.010,
        enabled: plugEnabled, onDrop() { turns = n; } })),
      onStart() { enter(); },
      onDrag(p) { rig.plug.position.set(clamp(p.x, 0.05, 0.16), clamp(p.y, rig.coil.position.y - 0.073, rig.coil.position.y + 0.01), 0.055); rig.updateWires(); },
      onEnd(moved, zone) {
        if (!moved) return;
        if (!zone) slideBack(rig.plug, [port(turns), rig.plug.position.clone()], rig.updateWires);
        say(zone ? '已接入 ' + turns + ' 匝，保持磁体和运动方式相同再比较。' : missedPlug);
      } };
    const dropEnabled = () => drop && free();
    const handle = { obj: rig.handle, anchor: rig.coil, plane: 'xy', offset: -0.055, keepOffset: true,
      enabled: dropEnabled, hint: hint(dropEnabled, '上下拖：改变线圈高度'),
      onStart: enter,
      onDrag(p) {
        distance = clamp(DROP_TOP - p.y, 0.2, 0.5); rig.moveCoil(distance, turns);
        readFlux(rig.magnets[activeMagnet].position.y, activeMagnet + 1);
      },
      onEnd(moved) {
        if (moved) say('线圈距管口 ' + (distance * 100).toFixed(1) + ' cm。每次都从管口静止释放。');
      } };
    function release() {
      activeMagnet = loaded; loaded = null;
      model = new FaradayDrop({ distance, turns, strength: activeMagnet + 1 }); model.release();
      trace = { drop: true, distance, turns, magnet: activeMagnet, samples: model.samples, time: 0, peak: 0 };
      reference = dropTraces.slice().reverse().find(r => dropFactor(trace, r)) || dropTraces[dropTraces.length - 1];
      trace.reference = reference;
      dirty = true; say('磁体从静止下落，传感器正在记录电压。');
    }
    const gateEnabled = () => dropEnabled() && loaded !== null;
    const clearTrayHint = () => {
      const letter = trayMagnet === 0 ? 'A' : 'B';
      return `接盘里还有磁体 ${letter}。先把它拖回标有 ${letter} 的底座，再拉柄释放。`;
    };
    const gate = { obj: rig.gateHandle, anchor: rig.gate, keepOffset: true, enabled: gateEnabled,
      hint: hint(gateEnabled, '向右拉：松夹释放磁体'), onStart: enter,
      onDrag(p) {
        if (loaded === null) return;
        if (trayMagnet !== null) { say(clearTrayHint()); return; }
        rig.gate.position.x = clamp(p.x, 0, 0.042);
        if (rig.gate.position.x >= 0.023) release();
      },
      onEnd() { if (loaded !== null) { rig.gate.position.x = 0; say(trayMagnet !== null ? clearTrayHint() : '夹具仍夹着磁体，再向右拉一些。'); } } };
    // The glass wall constrains the actual path, including on an unsuccessful return.
    function carry(i) {
      const m = rig.magnets[i];
      let trail;
      const available = () => drop && !model.running && !retreat;
      const atMouth = () => loaded === null || loaded === i;
      return { obj: rig.picks[i], anchor: m, plane: 'xy', keepOffset: true, enabled: available,
        hint: hint(available, '拖磁体：放到管口或底座'),
        dropzones: [
          { name: '管口', position: mouth, radius: 0.015, enabled: atMouth },
          { name: '底座', position: docks[i], radius: 0.018, enabled: () => true },
        ],
        onStart() { enter(); carrying = true; trail = [m.position.clone()]; },
        onDrag(p) {
          const start = m.position.clone();
          const end = point(clamp(p.x, -0.24, 0), clamp(p.y, 0.035, 0.647));
          const steps = Math.max(1, Math.ceil(start.distanceTo(end) / 0.003));
          for (let j = 1; j <= steps; j++) {
            let x = start.x + (end.x - start.x) * j / steps, y = start.y + (end.y - start.y) * j / steps;
            const here = m.position;
            if (here.x === 0 && here.y >= DROP_TOP && here.y < 0.623) {
              x = 0; y = Math.max(y, DROP_TOP);
            } else if (x > -0.026 && y > 0.054 && y < 0.623) {
              if (here.y <= 0.054) y = 0.054;
              else if (here.y >= 0.623 && here.x > -0.026) {
                if (atMouth() && Math.abs(x) < 0.006) x = 0;
                else y = 0.623;
              } else x = -0.026;
            }
            if (!atMouth() && x > -0.025 && y > 0.56) x = -0.026;
            here.set(x, y, 0);
            if (!here.equals(trail[trail.length - 1])) trail.push(here.clone());
          }
          if (i === activeMagnet) readFlux(m.position.y, i + 1);
        },
        onEnd(moved, zone) {
          carrying = false;
          if (!moved) return;
          if (zone && m.position.distanceTo(zone.position) < 0.001) {
            if (trayMagnet === i) trayMagnet = null;
            if (zone.position === mouth) {
              loaded = activeMagnet = i; rig.gate.position.x = 0;
              showField();
              readFlux(m.position.y, i + 1);
              say(trayMagnet !== null ? clearTrayHint() : '磁体已夹在管口，可以从静止释放。');
            } else {
              if (loaded === i) loaded = null;
              say(loaded !== null ? '接盘已空，可以拉柄释放管口的磁体。' : '磁体已放回底座，可将另一块磁体送到管口。');
            }
          } else {
            slideBack(m, trail, () => { if (i === activeMagnet) readFlux(m.position.y, i + 1); });
            say('磁体没有就位。沿管外提起，高过管口再放入。');
          }
        } };
    }
    // The first magnet has one pick and two distinct physical arrangements.
    const carriers = [carry(0), carry(1)];
    const tip = ctx.tag('', 'pill');
    const hideTip = () => tip.loc(root, 0, -9, 0).text('');
    const canvas = document.getElementById('c');
    canvas.addEventListener('pointerleave', hideTip);
    const deskHand = draggable(rig.group, [handDrag, plugDrag], { tip });
    const deskDrop = draggable(rig.group, [handle, plugDrag, gate, ...carriers], { tip });
    const activeDesk = () => drop ? deskDrop : deskHand;
    const desk = {
      items: () => activeDesk().items(), hovered: () => activeDesk().hovered(),
      down: (...a) => activeDesk().down(...a), move: (...a) => activeDesk().move(...a), up: (...a) => activeDesk().up(...a),
      update: dt => activeDesk().update(dt), clearDropzones: () => activeDesk().clearDropzones(),
    };
    function reset() {
      desk.clearDropzones(); turns = 300; distance = 0.2;
      handTraces.length = dropTraces.length = 0; rows.clear(); setup(false);
      hideTip(); ui.observePrediction(noSpeedComparison); ui.relock(); ctx.reframe();
    }
    setup(false);
    function finishDrop() {
      trayMagnet = activeMagnet;
      dropTraces.push(trace); recordBox.hidden = false;
      rows.add([(distance * 100).toFixed(1), String(turns), activeMagnet ? 'B' : 'A', trace.peak.toFixed(3)]);
      let message = '进、出线圈时电压符号相反，磁体停住后电压回零。把磁体沿管外送回管口，只改一个条件再测一次。';
      const factor = reference && dropFactor(trace, reference);
      if (factor === 'height') message = '线圈位置较低的那次，磁体经过线圈时更快，电压峰值也更大。';
      if (factor === 'turns') message = '同一磁体经过同一位置，600 匝线圈的电压峰值约为 300 匝的两倍。';
      if (factor === 'magnet') message = '线圈位置和匝数相同，较强的磁体 B 产生的电压峰值更大。';
      say(message);
      if (factor) unlocked();
    }
    const check = (ok, message) => { if (!ok) throw Error(message); };
    const locked = () => ui.el.querySelector('.flap').classList.contains('locked');
    const qa = qaFlow(desk, [
      { name: '插入磁体', drag: rig.picks[0], to: point(0, DOWN) },
      { name: '检查有磁通而电流归零', run() { check(locked() && handTraces.length === 1 && flux > 0.4 && trace.peak > 0 && Math.abs(needle) < 0.1, '单次插入的现象或完成状态不符'); } },
      { name: '抽出磁体', drag: rig.picks[0], to: point(0, UP) },
      { name: '插头落在两柱之间', drag: rig.plug, to: () => point(0.105, rig.coil.position.y - 0.06, 0.055) },
      { name: '核对插头归位', run() { check(feedback.textContent === missedPlug && rig.plug.position.distanceTo(port(300)) < 0.001, '插头误接'); } },
      { name: '改接六百匝', drag: rig.plug, to: () => port(600) },
      { name: '再次插入磁体', drag: rig.picks[0], to: point(0, DOWN) },
      { name: '对照两次插入', run() { check(trace.turns === 600 && reference.turns === 300 && reference.direction === '插入', '曲线未保留'); choices.el.querySelectorAll('button')[1].click(); } },
      { name: '把线圈移到五十厘米处', drag: rig.handle, to: point(0, 0.1) },
      { name: '松夹记录电压', drag: rig.gateHandle, to: point(0.04, DROP_TOP + 0.01), wait: 12 },
      { name: '检查首次落体并沿管外装入磁体 B', run() {
        check(locked() && model.finished && rows.rows.length === 1 && Math.abs(distance - 0.5) < 0.004 && trace.peak > 0.24, '首次落体记录或完成状态不符');
        const b = desk.items().find(d => d.obj === rig.picks[1]);
        b.onStart(docks[1]);
        for (const p of [point(docks[1].x, 0.64), point(0, 0.64), mouth]) b.onDrag(p, docks[1]);
        b.onEnd(true);
        check(loaded === 1 && feedback.textContent === clearTrayHint(), '换磁体时未提示清空接盘');
      } },
      { name: '接盘有磁体时试拉柄', drag: rig.gateHandle, to: point(0.04, DROP_TOP + 0.01) },
      { name: '检查夹具仍闭合', run() { check(locked() && loaded === 1 && trayMagnet === 0 && rig.gate.position.x === 0 && rows.rows.length === 1, '空盘前误放行'); } },
      { name: '把旧磁体送回 A 底座', drag: rig.picks[0], to: docks[0] },
      { name: '释放较强磁体', drag: rig.gateHandle, to: point(0.04, DROP_TOP + 0.01), wait: 12 },
      { name: '核对磁体对照并掀开原文', run() {
        check(!locked() && trayMagnet === 1 && rows.rows.length === 2 && Math.abs(trace.peak / reference.peak - 2) < 0.001, '磁体对照或完成判定有误');
        ui.go(2); ui.el.querySelector('.flap-front').click();
        check(ui.el.querySelector('.verdict').textContent.includes(noSpeedComparison), '落体对照被记为手插快慢结果');
      } },
    ]);
    return {
      group: root, pointer: desk, reset, toggles: [], card: false,
      size: { w: 0.65, d: 0.26, h: 0.65 }, view: { elev: 16, azim: -8, frameMargin: 1.05 },
      mount(panel) {
        // Reserve a place beside the citation for the notebook's completion stamp.
        const source = panel.el.querySelector('.answer .src');
        if (source) { source.style.paddingRight = '84px'; source.style.minHeight = '68px'; }
        ui = panel; ui.observePrediction(noSpeedComparison); ui.status('比较磁通量变化的快慢与感应电动势的大小。');
        ui.controls.append(choices.el, h('div', {}, instruction, feedback));
        ui.data.append(caption, plot.el, legend, recordBox, buttons([{ text: '全部重做', ghost: true, onClick: reset }]).el);
        ui.notes.append(h('p', { class: 'note' }, '手插时回路总电阻固定为 1 kΩ。落体时改接高阻电压传感器，画面放慢 8 倍，图中时间为实际下落时间。圆点越多，穿过单匝线圈的净磁通量越大。'));
      },
      update(dt) {
        desk.update(dt);
        const now = performance.now();
        if (retreat) {
          retreat.time = Math.min(1, retreat.time + dt / 0.38);
          retreat.route.getPointAt(retreat.time, retreat.obj.position); retreat.update();
          if (retreat.time >= 1) retreat = null;
        }
        if (drop && model.running) {
          const s = model.advance(dt / 8);
          rig.magnets[activeMagnet].position.y = model.y;
          trace.time = model.time; trace.peak = model.peak;
          signal = s.voltage; readFlux(model.y, activeMagnet + 1); dirty = true;
          if (model.finished) finishDrop();
        }
        if (hand && now - hand.last > 90) {
          if (hand.trial) { addSample(trace, (now - hand.start) / 1000, 0); if (feedback.textContent !== still) say(still); }
          hand.last = now; signal = 0;
        }
        needle += (signal - needle) * -Math.expm1(-dt / (drop ? 0.025 : 0.055));
        instrument();
        if (dirty && now - lastPlot > 40) { graph(); lastPlot = now; }
      },
      dispose() { canvas.removeEventListener('pointerleave', hideTip); deskHand.dispose(); deskDrop.dispose(); rig.dispose(); },
      debug: { qa, get state() { return { drop, turns, distance, loaded, flux, signal, needle, records: rows.rows, traces: handTraces.map(t => [t.direction, t.turns, t.peak, t.time]), y: rig.magnets[0].position.y }; } },
    };
  },
};
