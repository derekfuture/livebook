import * as THREE from 'three';
import { generatorState, GENERATOR } from './kit/acGenerator.js';
import { acGeneratorRig, AXLE_Y, CRANK_Z, CRANK_RADIUS } from './kit/acGeneratorRig.js';
import { generatorPlot } from './kit/acGeneratorPlot.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow } from './kit/chemlesson.js';
import { buttons, h } from './kit/ui.js';

const SPEED = Math.PI;
const atNeutral = '线圈经过中性面时，AB、CD 两边的运动方向与磁场平行，感应电动势为零。';
const lights = '沿同一方向转动手柄时，红灯和黄灯交替发光。';
const missed = '插头没有对准插孔，已退回原处。';
const disconnected = '回路断开，线圈转动时也没有电流。';
const stopped = '线圈停住了，磁通量不再变化，电流为零。';
const reversed = '手柄改变了转向。沿同一方向转过中性面，再比较前后的电流。';
const sockets = ['电流表', '灯板'];

export default {
  id: 'acgenerator',
  fig: '图3.1-2',
  title: '观察交变电流的方向',
  stampText: '观察',
  predict: {
    q: '两只灯反向并联，沿同一方向匀速转动手柄，你会看到什么？',
    options: ['只有一只灯发光', '红灯和黄灯交替发光', '两只灯总是同时发光'],
    answer: 1,
  },
  conclusion: {
    page: 54,
    rect: [216.5, 555.08, 537.5, 702.19],
    quote: '教学用发电机产生的电流，大小和方向都在不断地变化，是一种交变电流。',
    why: '线圈沿同一方向转过中性面时，感应电动势过零并改变符号。接纯电阻负载时，电流随之换向。如果线圈匀速转动，这个回路的电流就按正弦规律变化。接反向并联的灯板时，中性面附近两灯都灭。反向的电动势足以使另一只灯导通时，才有反向电流。',
    src: '课本第 50 页 · 第三章 第1节 交变电流',
  },
  create(ctx) {
    const rig = acGeneratorRig(), plot = generatorPlot();
    let ui, theta = 0, omega = 0, t = 0, current = 0;
    let load = -1, opposed = false, unplugged = true, returning = null;
    let running = false, held = false, started = false, frozen = false, freezeAt = null;
    let bearing = 0, handTarget = 0, handDirection = 0, reversedHand = false;
    let direction = 0, firstSign = 0, crossed = false;
    const bar = lessonBar({
      group: rig.group, look: ctx.look, back: ctx.back,
      steps: [
        { id: 'wire', title: '反向并联', todo: '点一下黄灯座，调换它的正、负极，使两只灯的正极朝向不同。', target: () => rig.yellowSeat },
        { id: 'plug', title: '接灯板', todo: '把发电机的双插头拖进灯板插孔，接通回路。', target: () => rig.plug },
        { id: 'observe', title: '观察灯光', todo: '沿同一方向转手柄，或点“匀速转动”，看过中性面前后哪只灯亮。', target: () => rig.knob },
      ],
    });
    const feedback = h('p', { class: 'status', 'aria-live': 'polite' });
    const enter = () => { if (ui.step !== 1) ui.go(1); };
    const say = (s) => { if (feedback.textContent !== s) feedback.textContent = s; };
    const hint = (s) => () => (ui?.step === 1 ? s : '');
    ctx.tag('磁场方向（示意）', 'pill').loc(rig.group, 0, 0.187, -0.04);

    function clearEvidence() {
      direction = firstSign = 0;
      crossed = false;
    }
    function record(neutral = false) {
      const lamp = !unplugged && load === 1;
      const meter = !unplugged && load === 0;
      const e = generatorState(theta, omega, lamp, { parallelForward: !opposed });
      current = meter ? e.emf / (GENERATOR.coilResistance + GENERATOR.meterResistance) : e.current;
      if (neutral) current = 0;
      plot.sample(t, current, neutral && !unplugged);
      rig.animate(theta, current, meter, e.redCurrent, e.yellowCurrent);
      if (!lamp || !opposed || !omega || bar.finished) return;
      if (Math.sign(omega) !== direction) {
        clearEvidence();
        direction = Math.sign(omega);
      }
      if (neutral && firstSign) crossed = true;
      if (Math.abs(current) < 0.0001) return;
      const sign = Math.sign(current);
      if (crossed && firstSign === -sign) {
        bar.done('observe');
        ui.need('');
        ui.observePrediction(lights);
        bar.say('已观察到两灯交替发光。换接电流表，可以对照指针何时经过零刻度。');
      }
      firstSign = sign;
      crossed = false;
    }
    const draw = () => plot.draw(theta, current, unplugged ? '回路断开' : sockets[load] + '回路');
    function motionFeedback() {
      if (returning) return;
      if (unplugged) return say(disconnected);
      if (held && reversedHand) return say(reversed);
      if (load === 0) {
        if (Math.abs(current) > GENERATOR.meterRange) return say('电流超过电流表量程。慢一点转，再读表。');
        if (current === 0) return say(atNeutral);
        return say(current > 0 ? '指针右偏，电流从 E 经电流表流向 F。' : '指针左偏，电流从 F 经电流表流向 E。');
      }
      if (!opposed && current) return say('电流从 E 经灯板流向 F。同向接法只允许这一个方向的电流通过。');
      if (!opposed && omega * Math.sin(theta) < 0) return say('两灯都灭。两只灯同向并联时，反方向的电流无法通过。');
      if (!current) return say('此时电压不足以点亮任何一只灯。');
      say(current > 0 ? '红灯亮，电流从 E 经灯板流向 F。' : '黄灯亮，电流从 F 经灯板流向 E。');
    }
    // 在这一帧实际扫过的角区间中插入中性面样本，正摇和反摇共用同一时钟。
    function moveTo(end, dt) {
      const delta = end - theta, sense = Math.sign(delta);
      omega = delta / dt;
      const boundary = (sense > 0 ? Math.floor(theta / Math.PI) + 1 : Math.ceil(theta / Math.PI) - 1) * Math.PI;
      const endTime = t + dt;
      if ((end - boundary) * sense >= 0) {
        t += (boundary - theta) / omega;
        theta = boundary;
        record(true);
      }
      t = endTime;
      if (end !== boundary) {
        theta = end;
        record();
      }
    }
    function stop() {
      clearEvidence();
      omega = 0;
      record();
      draw();
      say(stopped);
    }
    const motion = buttons([
      {
        text: '匀速转动',
        onClick: () => {
          if (running) {
            running = false;
            freezeAt = null;
            stop();
          } else {
            clearEvidence();
            started = running = true;
            frozen = false;
          }
          syncButtons();
        },
      },
      {
        text: '定格在中性面', ghost: true,
        onClick: () => {
          if (!running) clearEvidence();
          freezeAt = (Math.floor(theta / Math.PI + 1e-9) + 1) * Math.PI;
          started = running = true;
          frozen = false;
          syncButtons();
        },
      },
    ]);
    function syncButtons() {
      motion.btns[0].textContent = running ? '停转' : frozen ? '继续匀速转动' : '匀速转动';
      motion.btns[1].disabled = freezeAt !== null;
    }
    const phase = (p) => Math.atan2(p.y - AXLE_Y, p.x);
    const wheel = {
      obj: rig.knobPick, plane: 'xy', offset: CRANK_Z, hint: hint('绕轴拖：转动线圈'),
      onStart(p) {
        enter();
        clearEvidence();
        running = frozen = reversedHand = false;
        freezeAt = null;
        held = true;
        omega = handDirection = 0;
        handTarget = theta;
        bearing = p ? phase(p) : theta;
        if (started) { record(); draw(); }
        syncButtons();
      },
      onDrag(p) {
        const a = phase(p), delta = Math.atan2(Math.sin(a - bearing), Math.cos(a - bearing));
        if (Math.abs(delta) < 1e-6) return;
        if (handDirection && Math.sign(delta) !== handDirection) {
          clearEvidence();
          reversedHand = true;
        }
        handDirection = Math.sign(delta);
        handTarget += delta;
        bearing = a;
        started = true;
      },
      onEnd() {
        held = false;
        // 鼠标松开可能早于下一帧。保留最后的位置，松手时的速度为零。
        theta = handTarget;
        if (started) stop();
      },
    };
    function syncWiring() {
      if (bar.finished) return;
      if (opposed) bar.done('wire'); else bar.undo('wire');
      if (opposed && !unplugged && load === 1) bar.done('plug'); else bar.undo('plug');
    }
    const flip = {
      obj: rig.yellowPick, hint: hint('点灯座：调换黄灯正负极'),
      onTap() {
        enter();
        opposed = !opposed;
        rig.setWiring(opposed);
        clearEvidence();
        syncWiring();
        if (load === 1 && !unplugged) { t = 0; plot.reset(); record(); draw(); }
        say(opposed ? '两只灯的正极朝向相反。' : '两只灯的正极现在朝向同一侧。');
      },
    };
    const socketPosition = () => load < 0 ? rig.rest : rig.sites[load];
    const plug = {
      obj: rig.plugPick, anchor: rig.plug, keepOffset: true, plane: 'xz', offset: rig.sites[0].y,
      enabled: () => !returning, hint: hint('拖插头：连接回路'),
      dropzones: rig.sites.map((position, i) => ({ name: sockets[i], position, radius: 0.018 })),
      onStart: enter,
      onDrag(p) {
        if (!unplugged) clearEvidence();
        unplugged = true;
        rig.plug.position.set(clamp(p.x, 0.1, 0.42), rig.sites[0].y, clamp(p.z, 0.091, 0.19));
        rig.layoutLeads();
        syncWiring();
        current = 0;
        rig.animate(theta, 0, false);
        draw();
        say(disconnected);
      },
      onEnd(moved, zone) {
        if (!moved) return;
        if (zone) {
          const nextLoad = sockets.indexOf(zone.name);
          if (nextLoad !== load) { t = 0; plot.reset(); }
          load = nextLoad;
          unplugged = false;
          syncWiring();
          say(load ? '灯板已接入发电机。' : '已接电流表。指针右偏表示电流从 E 经电流表流向 F。');
        } else {
          returning = { from: rig.plug.position.clone(), elapsed: 0 };
          say(missed);
        }
        if (started) record();
        draw();
      },
    };
    const desk = draggable(rig.group, [wheel, plug], { taps: [flip], tip: ctx.tag('', 'pill') });
    function reset() {
      desk.clearDropzones();
      running = held = started = frozen = opposed = reversedHand = false;
      unplugged = true;
      load = -1;
      returning = freezeAt = null;
      theta = omega = current = t = handTarget = handDirection = 0;
      clearEvidence();
      bar.undo('wire', 'plug', 'observe');
      rig.setWiring(false);
      rig.plug.position.copy(rig.rest);
      rig.layoutLeads();
      rig.animate(0, 0, false);
      syncButtons();
      plot.reset();
      say('');
      ui.relock();
      ui.observePrediction(null);
    }
    function advance(dt) {
      if (frozen || !started || dt <= 0) return;
      if (running) {
        const end = freezeAt === null ? theta + SPEED * dt : Math.min(freezeAt, theta + SPEED * dt);
        if (end > theta) moveTo(end, (end - theta) / SPEED);
        if (freezeAt !== null && theta === freezeAt) {
          freezeAt = null;
          frozen = true;
          running = false;
          omega = 0;
          clearEvidence();
          syncButtons();
          say(atNeutral);
        } else motionFeedback();
      } else if (held && handTarget !== theta) {
        moveTo(handTarget, dt);
        motionFeedback();
      } else {
        if (omega) { clearEvidence(); say(stopped); }
        omega = 0;
        t += dt;
        record();
      }
      draw();
    }
    const qaCheck = (ok, msg) => { if (!ok) throw new Error(msg); };
    return {
      group: rig.root, card: false,
      size: { w: 0.59, d: 0.398, h: 0.195 },
      view: { elev: 32, azim: 12, frameMargin: 1.01 },
      toggles: [], pointer: desk, reset,
      mount(panel) {
        ui = panel;
        bar.attach({ unlock: ui.unlock, need: () => {} });
        ui.controls.append(motion.el, feedback);
        ui.data.append(
          plot.canvas,
          h('p', { class: 'note' }, '实心点是此刻，空心点是经过中性面的时刻。线圈上的箭头表示电流方向（示意）。'),
          h('details', {}, h('summary', {}, '模型设值'), h('p', { class: 'note' },
            '线圈为 400 匝，面积 0.0064 m²，磁感应强度 0.35 T，匀速时每 2 s 转一圈。线圈电阻 60 Ω，电流表内阻 180 Ω。灯板另有 180 Ω 限流电阻，红灯、黄灯的导通电压分别取 1.8 V、2.0 V，导通后的电压每增加 0.01 V，单灯电流增加 1 mA。')),
          buttons([{ text: '全部重做', ghost: true, onClick: reset }]).el,
        );
        ui.observePrediction(null);
      },
      update(dt) {
        desk.update(dt);
        bar.update(dt);
        if (returning) {
          returning.elapsed += dt;
          const u = Math.min(1, returning.elapsed / 0.36);
          rig.plug.position.lerpVectors(returning.from, socketPosition(), u * u * (3 - 2 * u));
          rig.layoutLeads();
          if (u === 1) {
            returning = null;
            unplugged = load < 0;
            syncWiring();
            draw();
          }
        }
        advance(dt);
      },
      dispose() { desk.dispose(); bar.dispose(); },
      debug: {
        get bar() { return ui?.step === 1 ? bar : null; },
        get state() { return { theta, omega, current, t, load, running, frozen, unplugged, opposed, finished: bar.finished, samples: plot.samples }; },
        qa: [
          ...qaFlow(desk, [{ name: '把发电机接到电流表', drag: plug.obj, to: rig.sites[0] }]),
          {
            name: '拖手柄转过四分之一圈', wait: 0.1,
            mouse: { kind: 'drag', obj: wheel.obj, to: () => new THREE.Vector3(0, AXLE_Y + CRANK_RADIUS, CRANK_Z), over: desk.hovered },
            run() {
              wheel.onStart(new THREE.Vector3(CRANK_RADIUS, AXLE_Y, CRANK_Z));
              wheel.onDrag(new THREE.Vector3(0, AXLE_Y + CRANK_RADIUS, CRANK_Z));
              advance(0.1);
              wheel.onEnd();
            },
          },
          ...qaFlow(desk, [
            { name: '核对手摇后停转', run() {
              qaCheck(load === 0 && theta > 1 && current === 0 && plot.samples.some((s) => s.ma > 0), '手摇停转记录不符');
              motion.btns[0].click();
            }, wait: 2.5 },
            { name: '核对电流表不能跳过灯板', run() {
              qaCheck(plot.samples.some((s) => s.ma < -1) && !bar.finished, '电流表回路判定不符');
              motion.btns[1].click();
            }, wait: 1.5 },
            { name: '核对中性面', run() {
              qaCheck(frozen && current === 0 && Math.abs(Math.sin(theta)) < 1e-9 && rig.needle.rotation.z === 0, '中性面未同步过零');
            } },
            { name: '插头落空', drag: plug.obj, to: new THREE.Vector3(0.25, 0.033, 0.15), wait: 0.6 },
            { name: '核对插头退回', run() { qaCheck(!returning && !unplugged && load === 0 && feedback.textContent === missed, '插头没有退回'); } },
            { name: '调换黄灯正负极', tap: flip.obj },
            { name: '换接灯板', drag: plug.obj, to: rig.sites[1] },
            { name: '沿同一方向观察两灯', run() {
              qaCheck(opposed && load === 1 && !bar.finished, '灯板接线或观察进度不符');
              motion.btns[0].click();
            }, wait: 3.5 },
            { name: '核对灯光与中性面记录', run() {
              qaCheck(bar.finished && plot.samples.some((s) => s.neutral) && plot.samples.some((s) => s.ma > 1) && plot.samples.some((s) => s.ma < -1), '同向转动未观察到灯光交替');
              motion.btns[0].click();
            } },
            { name: '全部重来', run() {
              reset();
              qaCheck(ui.step === 0 && !plot.samples.length && theta === 0 && unplugged && load === -1 && !opposed && !bar.finished, '重置不完整');
            } },
          ]),
        ],
      },
    };
  },
};
