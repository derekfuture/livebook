// 选择性必修二图 5.3-2。门扇带动磁体，干簧管控制继电器，实际接线决定灯和报警器的工作状态。
import * as THREE from 'three';
import { alarmRig, alarmNotebook, HINGE, DOOR_Z, MOUNT_Z } from './kit/alarmRig.js';
import { alarmState, axialField, stepAlarm } from './kit/reedAlarm.js';
import { Tone, sfx } from './kit/audio.js';
import { lessonBar } from './kit/lessonbar.js';
import { draggable, clamp } from './kit/interact.js';
import { buttons, h, table } from './kit/ui.js';
import { qaFlow } from './kit/chemlesson.js';
const expected = ['K', 'neg', 'a', 'b'];
const reedAxis = new THREE.Vector3(1, 0, 0);
export default {
  id: 'dooralarm',
  fig: '图5.3-2',
  title: '门窗防盗报警装置',
  stampText: '制作',
  predict: {
    q: '怎样让门关好时绿灯亮、门一开就报警？先猜猜，开门时干簧管里的两片金属会怎样？',
    options: ['两片分开，干簧管断开', '两片吸合，干簧管接通'],
    answer: 0,
    hint: '磁体装在门上，干簧管装在门框上。',
  },
  conclusion: {
    page: 108,
    rect: [216.49, 321.32, 531.5, 491.22],
    quote:
      '闭合电路开关S，系统处于防盗状态。当门窗紧闭时，磁体M 靠近干簧管SA，干簧管两个簧片被磁化相吸而接通继电器线圈K，使继电器工作。继电器的动触点c与常开触点a 接通，发光二极管LED 发光，显示电路处于正常工作状态。当门窗开启时，磁体离开干簧管，干簧管失磁断开，继电器被断电。继电器的动触点c 与常闭触点b 接通，蜂鸣器H 发声报警。干簧管在电路中起传感器和控制开关的作用，继电器则相当于一个自动的双向开关。',
    why: '门关闭时干簧管接通，继电器吸合，c 与 a 接通，绿灯亮。开门时簧片释放，继电器断电，c 接回 b，蜂鸣器响。',
    src: '课本第 104 页 · 第五章 第3节 利用传感器制作简单的自动控制装置',
  },
  create(ctx) {
    const rig = alarmRig();
    const { group, magnet, magnetPick, door, handle, S, switchPick, wires, tips } = rig;
    const root = new THREE.Group();
    group.position.y = 0.006;
    root.add(group);
    const vec = (x, y, z) => new THREE.Vector3(x, y, z);
    const seat = () => rig.mountingPoint().clone();
    const magnetPlane = DOOR_Z + MOUNT_Z;
    const canvas = h('canvas', { width: 310, height: 90, style: 'width:100%;display:block' });
    const diagram = alarmNotebook(canvas);
    const rows = table(['门', '干簧管', '触点', '绿灯', '蜂鸣器']);
    const returns = new Map();
    let ui,
      aim,
      state = alarmState(),
      nearSeen = false,
      mounted = false,
      angle = 0;
    let reversedSeen = false,
      cancelled = false;
    let heldMagnet = false,
      grabAngle = 0,
      initialAngle = 0,
      boardView = false;
    let tone,
      sounding = false;
    const steps = [
      ['reed', '检验干簧管', '把磁体移到门框玻璃管下，再移开，检验簧片能否吸合、分开。'],
      ['mount', '安装磁体', '簧片能随磁体分开。把磁体放进玻璃管正下方的门扇卡座。'],
      ['circuit', '按图接线', '磁体已固定。把棕线接 K，让干簧管控制线圈。'],
      ['door', '开关门检验', '拉开门再关好，检验能否自动报警和解除报警。'],
    ];
    function back() {
      ctx.back();
      boardView = false;
      bar.near(false);
      guide();
    }
    const bar = lessonBar({
      ...ctx,
      group,
      back,
      steps: steps.map(([id, title, todo]) => ({
        id,
        title,
        todo,
        target: () => (ui?.step === 1 ? aim : null),
      })),
    });
    const wired = () => wires.every((w, i) => w.to === expected[i]);
    function say(message, target) {
      bar.say(message);
      aim = target;
    }
    const instructions = [
      '把棕线接 K，让干簧管控制线圈。',
      '把动触点 c 的黑线接到电源负极。',
      '参照接线图，把绿灯的绿线接到一个触点。',
      '把蜂鸣器的黄线接到另一个触点。',
    ];
    function guide(prefix = '') {
      if (!mounted && S.closed) return say('开关已闭合。先断开电源，再检验或安装门磁。', S.group);
      if (bar.current === 'reed')
        return say(nearSeen && state.reed ? '两片簧片吸合了。拖开磁体，看簧片能否分开。' : steps[0][2], magnet);
      if (!mounted) return say(steps[1][2], magnet);
      if (!S.closed) {
        if (reversedSeen && wires[2].to === 'b' && wires[3].to === 'a')
          return say('电源已断开。先把绿线插头拖回绿圈，腾出 b。', wires[2].plug);
        if (reversedSeen && wires[2].to === null && wires[3].to === 'a')
          return say('b 已空出。把蜂鸣器的黄线从 a 移到 b。', wires[3].plug);
        const i = wires.findIndex((w) => w.to === null);
        if (i >= 0) return say(prefix + instructions[i], wires[i].plug);
        return say(prefix + '合上开关 S，检验两条支路。', S.group);
      }
      if (!wired()) {
        if (wires.some((w) => w.to === null)) return say('电路还没接全。断开 S，补接空着的线。', S.group);
        reversedSeen = true;
        if (state.contact)
          return say(
            (state.buzzing ? '蜂鸣器响，绿灯灭。' : '绿灯亮，蜂鸣器停。') + '两条支路接反了，断开 S 后对调绿线和黄线。',
            S.group,
          );
        return;
      }
      if (boardView) return back();
      if (bar.finished) return say('已验证开门报警、关门灯亮且警报解除。可以掀开课本结论。');
      if (!rows.rows.length) return say('把门关紧，让磁体对准干簧管，看哪条支路接通。', handle);
      if (rows.rows.length === 1) return say('门关好，c 接 a，绿灯亮。拉开把手，看磁体离开后哪条支路接通。', handle);
      say('门打开，c 接 b，灯灭、蜂鸣器响。把门推回去，检验警报能否解除。', handle);
    }
    function returnTo(obj, destination, update) {
      returns.set(obj, { start: obj.position.clone(), destination: destination.clone(), t: 0, update });
    }
    function reset() {
      if (boardView) back();
      returns.clear();
      reversedSeen = false;
      nearSeen = heldMagnet = mounted = false;
      angle = door.rotation.y = 0;
      group.add(magnet);
      magnet.position.copy(rig.homeMagnet);
      S.closed = false;
      S.update(1);
      if (sounding) tone.on(false);
      sounding = false;
      state = alarmState();
      for (const [i, w] of wires.entries()) {
        w.to = null;
        w.plug.position.copy(w.home);
        rig.route(i);
      }
      rows.clear();
      rows.el.hidden = true;
      diagram(false, state, false, false);
      rig.draw(state);
      bar.undo(...steps.map((step) => step[0]));
      ui?.relock();
      guide();
    }
    const hint = (value) => () => (ui?.step === 1 ? value : '');
    function invalidateCircuit() {
      if (!bar.has('circuit')) return;
      rows.clear();
      rows.el.hidden = true;
      bar.undo('circuit', 'door');
      ui.relock({ full: false });
    }
    const plugs = wires.map((w, i) => {
      let origin, previous, moved;
      return {
        obj: w.plug,
        plane: 'xz',
        offset: 0.011,
        keepOffset: true,
        enabled: () => mounted && !returns.has(w.plug),
        hint: hint('拖插头：接线或拔线'),
        onStart() {
          origin = w.plug.position.clone();
          previous = w.to;
          moved = false;
        },
        onDrag(p, start) {
          if (S.closed) return say('电源还通着，先断开 S 再改线。', S.group);
          if (!moved && p.distanceTo(start) < 0.0003 && p.distanceTo(origin) < 0.0003) return;
          moved = true;
          w.to = null;
          w.plug.position.set(clamp(p.x, -0.09, 0.22), 0.011, clamp(p.z, -0.06, 0.12));
          rig.route(i);
        },
        onEnd() {
          if (!moved) return;
          if (cancelled) {
            w.to = previous;
            returnTo(w.plug, origin, () => rig.route(i));
            guide();
            return;
          }
          const id = Object.keys(tips).find(
            (key) => Math.hypot(w.plug.position.x - tips[key].x, w.plug.position.z - tips[key].z) < 0.012,
          );
          const allowed = i < 2 ? id === expected[i] : id === 'a' || id === 'b';
          const occupied = id && wires.some((other) => other !== w && other.to === id);
          if (id && allowed && !occupied) {
            w.to = id;
            w.plug.position.copy(tips[id]).y += 0.005;
            rig.route(i);
            if (previous !== id) invalidateCircuit();
            guide('已接' + (id === 'neg' ? '负极' : id) + '。');
          } else if (!id && previous && w.plug.position.distanceTo(w.home) < 0.019) {
            returnTo(w.plug, w.home, () => rig.route(i));
            invalidateCircuit();
            guide('插头已拔下。');
          } else {
            w.to = previous;
            returnTo(w.plug, origin, () => rig.route(i));
            say(
              occupied
                ? '接线柱已占用。先把原来的插头拖回同色圆圈。'
                : id
                  ? '这根线接错了柱，已退回。按图找它要接的柱。'
                  : '插头没接好，已退回。对准接线柱再松手。',
              w.plug,
            );
          }
        },
      };
    });
    const pointer = draggable(
      group,
      [
        {
          obj: magnetPick,
          anchor: magnet,
          keepOffset: true,
          plane: 'xy',
          offset: magnetPlane,
          enabled: () => !mounted && !S.closed && !returns.has(magnet),
          hint: hint('拖磁体：靠近或移开'),
          onStart() {
            heldMagnet = true;
          },
          onDrag(p) {
            magnet.position.set(clamp(p.x, HINGE - 0.02, -0.055), clamp(p.y, 0.0035, 0.177), magnetPlane);
            update(0);
          },
          onEnd(moved) {
            heldMagnet = false;
            if (!moved) return;
            if (cancelled) {
              returnTo(magnet, rig.homeMagnet);
              guide();
              return;
            }
            if (magnet.position.distanceTo(seat()) < 0.01) {
              magnet.position.copy(seat());
              if (bar.has('reed')) {
                door.attach(magnet);
                mounted = true;
                bar.done('mount');
                guide('磁体已固定。');
              }
            } else {
              returnTo(magnet, rig.homeMagnet);
              if (!bar.has('reed')) say('磁体还没对准。把它拖到门框玻璃管正下方。', magnet);
              else if (bar.current === 'mount' && magnet.position.y > 0.115)
                say('磁体没落进卡座。对准玻璃管正下方再松手。', magnet);
            }
          },
        },
        {
          obj: handle,
          plane: 'xz',
          offset: 0.076,
          enabled: () => mounted && !boardView,
          hint: hint('拖把手：开门或关门'),
          onStart(p) {
            initialAngle = angle;
            grabAngle = Math.atan2(p.z - DOOR_Z, p.x - HINGE);
          },
          onDrag(p) {
            angle = clamp(initialAngle + Math.atan2(p.z - DOOR_Z, p.x - HINGE) - grabAngle, 0, 1.35);
            door.rotation.y = -angle;
          },
        },
        ...plugs,
      ],
      {
        tip: ctx.tag('', 'pill'),
        taps: [
          {
            obj: switchPick,
            hint: () => (ui?.step === 1 ? (S.closed ? '点一下：断开电源' : '点一下：接通电源') : ''),
            onTap() {
              S.toggle();
              guide();
            },
          },
          {
            obj: rig.relay.group,
            enabled: () => mounted && !S.closed,
            hint: hint('点一下：近看接线'),
            onTap() {
              if (boardView) return back();
              boardView = true;
              ctx.look([0.073, 0.025, 0.004], [0.04, 1, 0.65], ctx.camera.aspect < 1 ? 0.54 : 0.48, back);
              bar.near(true);
            },
          },
        ],
      },
    );
    function update(dt) {
      bar.update(dt);
      S.update(dt);
      for (const [obj, r] of returns) {
        r.t = Math.min(1, r.t + dt / 0.4);
        obj.position.lerpVectors(r.start, r.destination, r.t * (2 - r.t));
        r.update?.();
        if (r.t === 1) {
          obj.position.copy(r.destination);
          returns.delete(obj);
        }
      }
      const { position, axis } = rig.fieldGeometry();
      const previous = state;
      state = stepAlarm(state, dt, {
        field: axialField(position, axis, rig.reed.position, reedAxis),
        power: S.closed,
        coilWire: wires[0].to === 'K',
        commonWire: wires[1].to === 'neg',
        ledWire: wires[2].to,
        buzzerWire: wires[3].to,
      });
      diagram(mounted, state, wired(), S.closed);
      rig.draw(state);
      const audible = state.buzzing && !sfx.muted;
      if (audible !== sounding) {
        if (audible && !tone) tone = new Tone({ type: 'square', freq: 1220, gain: 0.027 });
        tone?.on(audible);
        sounding = audible;
      }
      if (!bar.has('reed')) {
        if (state.reed && !previous.reed) {
          nearSeen = true;
          guide();
        }
        if (heldMagnet && nearSeen && !state.reed && previous.reed) {
          bar.done('reed');
          guide();
        }
      }
      if (!mounted || !S.closed) return;
      if (!wired()) {
        if (
          state.contact &&
          (previous.contact !== state.contact ||
            previous.buzzing !== state.buzzing ||
            previous.ledCurrent !== state.ledCurrent)
        )
          guide();
        return;
      }
      if (!bar.has('circuit')) {
        bar.done('circuit');
        guide();
      }
      if (bar.finished) return;
      const shut = angle < 0.035 && state.reed && state.ledCurrent > 0;
      const open = angle > 0.22 && !state.reed && state.buzzing;
      if (rows.rows.length === 1 ? !open : !shut) return;
      rows.add([
        shut ? '关闭' : '打开',
        state.reed ? '接通' : '断开',
        'c–' + state.contact,
        state.ledCurrent ? '亮' : '灭',
        state.buzzing ? '响' : '停',
      ]);
      rows.el.hidden = false;
      if (rows.rows.length === 3) bar.done('door');
      guide();
    }
    reset();
    const connect = (i, id) => ({ name: '接线 ' + i + ' → ' + id, drag: wires[i].plug, to: tips[id] });
    const power = { name: '开合电源', tap: switchPick };
    const check = (name, test) => ({
      name,
      run() {
        if (!test()) throw Error(name);
      },
    });
    const handleAt = (a) =>
      vec(HINGE + 0.095 * Math.cos(a) - 0.012 * Math.sin(a), 0.076, DOOR_Z + 0.095 * Math.sin(a) + 0.012 * Math.cos(a));
    function doorStep(name, angle) {
      const action = qaFlow(pointer, [{ name, drag: handle, to: () => handleAt(angle) }])[0];
      action.run = () => {
        const item = pointer.items().find((entry) => entry.obj === handle);
        item.onStart(group.worldToLocal(handle.getWorldPosition(vec(0, 0, 0))));
        item.onDrag(handleAt(angle));
      };
      return action;
    }
    return {
      group: root,
      size: { w: 0.5, d: 0.255, h: 0.17 },
      card: false,
      view: { azim: 9, elev: 32, frameMargin: 1.02 },
      toggles: ['steps'],
      reset,
      pointer: {
        ...pointer,
        items: () => pointer.items().filter((it) => it.enabled?.() !== false),
        down(ray, e) {
          if (ui?.step === 2) return false;
          const hit = pointer.down(ray, e);
          if (hit && ui?.step === 0) ui.go(1);
          return hit;
        },
        move(ray, e) {
          return ui?.step === 1 && pointer.move(ray, e);
        },
        up(ray, e) {
          cancelled = e?.type === 'pointercancel';
          const handled = pointer.up(ray, e);
          cancelled = false;
          return handled;
        },
      },
      mount(panel) {
        ui = panel;
        bar.attach({ need: () => ui.need(''), unlock: () => ui.unlock() });
        ui.controls.append(canvas);
        ui.data.append(rows.el);
        ui.controls.append(buttons([{ text: '全部重来', ghost: true, onClick: reset }]).el);
        const source = ui.el.querySelector('.answer .src');
        if (source) {
          source.style.paddingRight = '76px';
          source.style.minHeight = '48px';
        }
        guide();
      },
      update,
      debug: {
        bar,
        qa: [
          { name: '靠近干簧管', drag: magnetPick, to: seat },
          check('靠近后簧片应吸合', () => nearSeen && state.reed && !bar.has('reed')),
          { name: '移开磁体', drag: magnetPick, to: rig.homeMagnet },
          { name: '偏离卡座松手', drag: magnetPick, to: () => seat().add(vec(0.027, 0, 0)) },
          check('未装准应退回', () => bar.has('reed') && !mounted && magnet.position.equals(rig.homeMagnet)),
          { name: '把磁体固定在门上', drag: magnetPick, to: seat },
          connect(0, 'K'),
          connect(1, 'neg'),
          connect(2, 'b'),
          connect(3, 'a'),
          power,
          check('接反时关门报警', () => state.buzzing && !state.ledCurrent && !bar.has('circuit')),
          power,
          { name: '拔下绿线', drag: wires[2].plug, to: wires[2].home },
          connect(3, 'b'),
          connect(2, 'a'),
          power,
          check('正确接线关门亮灯', () => rows.rows.length === 1 && state.ledCurrent && !state.buzzing),
          doorStep('拉开门触发报警', 1.04),
          doorStep('推回门解除报警', -0.08),
          check('关门开门再关门', () => bar.finished && rows.rows.length === 3 && state.ledCurrent && !state.buzzing),
          {
            name: '掀开课本原文',
            run() {
              ui.go(2);
              ui.el.querySelector('.flap-front').click();
            },
          },
        ].map((step) => (step.mouse ? step : qaFlow(pointer, [step])[0])),
      },
      dispose() {
        tone?.stop();
        pointer.dispose();
        bar.dispose();
      },
    };
  },
};
