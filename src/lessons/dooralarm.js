// 选择性必修二图 5.3-2。门扇带动磁体，干簧管控制继电器，实际接线决定灯和报警器的工作状态。
import * as THREE from 'three';
import { alarmRig, HINGE, DOOR_Z, MOUNT_Y, MOUNT_X, MOUNT_Z } from './kit/alarmRig.js';
import { alarmState, axialField, stepAlarm } from './kit/reedAlarm.js';
import { Tone, sfx } from './kit/audio.js';
import { lessonBar } from './kit/lessonbar.js';
import { draggable, clamp } from './kit/interact.js';
import { buttons, note, table } from './kit/ui.js';
const expected = ['K', 'neg', 'a', 'b'];
const reedAxis = new THREE.Vector3(1, 0, 0);
export default {
  id: 'dooralarm',
  fig: '图5.3-2',
  title: '门窗防盗报警装置',
  stampText: '制作',
  predict: {
    q: '门关好后，磁体使干簧管吸合。若要开门时才报警，蜂鸣器应接在哪个继电器触点？',
    options: ['释放时闭合的常闭触点 b', '吸合时闭合的常开触点 a'],
    answer: 0,
    hint: '开门时，磁体远离干簧管。',
  },
  conclusion: {
    page: 108, rect: [216.49, 321.32, 531.5, 491.22],
    quote: '闭合电路开关S，系统处于防盗状态。当门窗紧闭时，磁体M 靠近干簧管SA，干簧管两个簧片被磁化相吸而接通继电器线圈K，使继电器工作。继电器的动触点c与常开触点a 接通，发光二极管LED 发光，显示电路处于正常工作状态。当门窗开启时，磁体离开干簧管，干簧管失磁断开，继电器被断电。继电器的动触点c 与常闭触点b 接通，蜂鸣器H 发声报警。干簧管在电路中起传感器和控制开关的作用，继电器则相当于一个自动的双向开关。',
    why: '门关闭时干簧管接通，继电器吸合，c 与 a 接通，绿灯亮。开门时簧片释放，继电器断电，c 接回 b，蜂鸣器响。',
    src: '课本第 104 页 · 第五章 第3节 利用传感器制作简单的自动控制装置',
  },
  create(ctx) {
    const look = ctx.look;
    ctx = { ...ctx, look: (at, ...args) => look([at[0], at[1] + 0.0066, at[2]], ...args) };
    const rig = alarmRig(),
      { group, door, magnet, reed, S, wires } = rig;
    let ui,
      rows,
      view,
      aim,
      state,
      nearSeen,
      tested,
      mounted,
      angle,
      dragged,
      tone,
      sounding = false,
      completed,
      magnetStart,
      doorStart,
      doorGrab;
    let falling = false,
      dropSpeed = 0;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'reed', title: '检验干簧管', todo: '把磁体靠近干簧管再移开，观察簧片接合、分开。', target: () => aim },
        { id: 'mount', title: '安装门磁', todo: '把磁体装到门上沿与干簧管相对的卡座。', target: () => aim },
        { id: 'circuit', title: '接报警电路', todo: '在断电时连接控制线和两条输出支路。', target: () => aim },
        { id: 'door', title: '开关门检验', todo: '关门、开门再关门，检查灯光和报警声。', target: () => aim },
      ],
    });
    const say = (text, obj) => {
      aim = obj;
      bar.say(text);
    };
    function leave() {
      ctx.back();
      view = null;
      bar.near(false);
      guide();
    }
    function close(v) {
      view = v;
      bar.near(true);
      if (v === 'reed') ctx.look([reed.position.x, reed.position.y, reed.position.z], [0.12, 0.18, 1], 0.065, leave);
      else if (v === 'board')
        ctx.look([0.07, 0.022, 0.035], [0.12, 1, 0.3], ctx.camera.aspect < 1 ? 0.39 : 0.65, leave);
      else
        ctx.look([HINGE + 0.062, 0.083, DOOR_Z + 0.017], [0.24, 0.18, 1], ctx.camera.aspect < 1 ? 0.36 : 0.48, leave);
      guide();
    }
    function guide() {
      if (bar.finished) return say('已观察关门、开门和重新关门。打开笔记本，对照继电器触点与两条支路。');
      if (S.closed && (!tested || !mounted)) return say('先断开刀开关，在断电状态检验和安装门磁。', S.group);
      if (!tested) {
        if (nearSeen) return say('簧片已吸合。把磁体向旁边移开，看两片金属重新分开。', magnet);
        if (view === 'reed') return say('管内两片金属现在分开。回全景，把台前的磁体移到玻璃管旁。');
        return say('把台前的小磁体拖到门框上方玻璃管旁。点干簧管可以近看金属簧片。', magnet);
      }
      if (!mounted) return say('把同一块磁体拖到门扇上沿、玻璃管正下方的卡座，松手固定。', rig.mount);
      if (!S.closed) {
        const i = wires.findIndex((w) => w.to === null);
        if (i >= 0)
          return say(
            [
              '把干簧管引出的棕色插头接到 K，控制继电器线圈。',
              '把动触点 c 的黑线接到负极。',
              '把 LED 的绿线接到常开触点 a。',
              '把蜂鸣器的黄线接到常闭触点 b。',
            ][i],
            wires[i].plug,
          );
        return say('合上刀开关，观察现在亮的是灯还是蜂鸣器在响。', S.group);
      }
      if (wires.some((w, i) => w.to !== expected[i])) {
        return say(
          '检查实际现象：绿灯' +
            (state.ledCurrent ? '亮' : '灭') +
            '，蜂鸣器' +
            (state.buzzing ? '响' : '停') +
            '。断电后沿线检查，LED 应接 a，蜂鸣器应接 b。',
          S.group,
        );
      }
      if (completed === 0) return say('合上门，让门上的磁体正对门框干簧管，观察绿灯。', rig.handle);
      if (completed === 1) return say('门已关好，绿灯亮。抓住把手把门拉开，观察触点和蜂鸣器。', rig.handle);
      say('门已打开，绿灯灭，警报响。把门关回门框，检查警报能否解除。', rig.handle);
    }
    function reset() {
      if (view) leave();
      if (sounding) {
        tone.on(false);
        sounding = false;
      }
      nearSeen = tested = mounted = falling = false;
      dropSpeed = 0;
      angle = completed = 0;
      state = alarmState();
      group.add(magnet);
      magnet.rotation.set(0, 0, 0);
      magnet.position.copy(rig.homeMagnet);
      door.rotation.y = 0;
      S.closed = false;
      rig.draw(state);
      wires.forEach((w, i) => {
        w.to = null;
        w.plug.position.copy(w.home);
        rig.route(i);
      });
      rows?.clear();
      bar.undo('reed', 'mount', 'circuit', 'door');
      guide();
    }
    function wireItem(i) {
      const w = wires[i];
      let moved;
      return {
        obj: w.plug,
        plane: 'xz',
        offset: 0.008,
        keepOffset: true,
        hint: '拖动接线插头',
        enabled: () => view !== 'reed' && view !== 'door' && !bar.finished,
        onStart() {
          moved = false;
        },
        onDrag(p) {
          if (S.closed) return say('先断开刀开关，再改接线。', S.group);
          moved = true;
          w.to = null;
          w.plug.position.set(clamp(p.x, -0.08, 0.23), 0.011, clamp(p.z, -0.06, 0.12));
          rig.route(i);
        },
        onEnd() {
          if (!moved) return;
          let nearest = null,
            dist = 0.017;
          for (const [id, pt] of Object.entries(rig.tips)) {
            const d = Math.hypot(w.plug.position.x - pt.x, w.plug.position.z - pt.z);
            if (d < dist) {
              nearest = id;
              dist = d;
            }
          }
          if (nearest && wires.some((other) => other !== w && other.to === nearest)) {
            w.plug.position.copy(w.home);
            rig.route(i);
            return say(nearest + ' 柱已插有另一根线。先拔出那根线放在台面，再接入这根。');
          }
          if (nearest && (i < 2 ? nearest === expected[i] : nearest === 'a' || nearest === 'b')) {
            w.to = nearest;
            w.plug.position.copy(rig.tips[nearest]);
            w.plug.position.y += 0.002;
          } else w.plug.position.y = 0.004;
          rig.route(i);
          guide();
        },
      };
    }
    const manip = draggable(
      group,
      [
        {
          obj: magnet,
          plane: 'xy',
          offset: DOOR_Z + MOUNT_Z,
          enabled: () => !mounted && !S.closed,
          hint: '拖磁体靠近或远离玻璃管',
          onStart() {
            dragged = falling = false;
            magnetStart = magnet.position.clone();
          },
          onDrag(p, start) {
            if (!start) return;
            if (!dragged && p.distanceTo(start) < 0.002) return;
            dragged = true;
            const approach = clamp(p.distanceTo(start) / 0.04, 0, 1);
            magnet.position.set(
              clamp(p.x, HINGE - 0.035, HINGE + 0.15),
              clamp(p.y, 0.005, 0.18),
              THREE.MathUtils.lerp(magnetStart.z, DOOR_Z + MOUNT_Z + 0.003, approach),
            );
          },
          onEnd() {
            if (!dragged) return;
            if (tested && magnet.position.distanceTo(rig.mountingPoint()) < 0.016) {
              door.add(magnet);
              magnet.position.set(MOUNT_X, MOUNT_Y - 0.009, MOUNT_Z);
              mounted = true;
              bar.done('mount');
              if (view) leave();
              guide();
            } else {
              falling = true;
              dropSpeed = 0;
            }
            guide();
          },
          onTap() {
            if (!view) close('door');
          },
        },
        {
          obj: door,
          plane: 'xz',
          offset: 0.076,
          enabled: () => mounted && view !== 'reed' && view !== 'board',
          hint: '抓住把手，拉开或推回门扇',
          onStart(p) {
            doorStart = angle;
            doorGrab = p ? Math.atan2(p.z - DOOR_Z, p.x - HINGE) : 0;
          },
          onDrag(p) {
            const a = Math.atan2(p.z - DOOR_Z, p.x - HINGE);
            angle = clamp(doorStart + a - doorGrab, 0, 1.35);
            door.rotation.y = -angle;
          },
          onTap() {
            if (!view) close('door');
          },
        },
        ...wires.map((_, i) => wireItem(i)),
      ],
      {
        highlight: true,
        taps: [
          { obj: reed, hint: '近看玻璃管内的簧片', onTap: () => (view === 'reed' ? leave() : close('reed')) },
          {
            obj: rig.relay.group,
            hint: '近看继电器和接线柱',
            onTap: () => (view === 'board' ? leave() : close('board')),
          },
          {
            obj: S.group,
            hint: '开合刀开关',
            onTap() {
              S.toggle();
              if (S.closed && wires.every((w, i) => w.to === expected[i]) && mounted) bar.done('circuit');
              guide();
            },
          },
        ],
      },
    );
    reset();
    const benchGroup = new group.constructor();
    benchGroup.add(group);
    group.position.y = 0.0066;
    return {
      group: benchGroup,
      size: { w: 0.52, d: 0.3, h: 0.18 },
      view: { azim: 8, elev: 28, margin: 1.04 },
      toggles: ['steps'],
      pointer: {
        ...manip,
        down(ray, e) {
          if (document.body.classList.contains('predicting')) ui?.go(1);
          return manip.down(ray, e);
        },
      },
      mount(panel) {
        ui = panel;
        bar.attach(panel);
        rows = table(['门', '干簧管', '继电器', '绿灯', '蜂鸣器']);
        panel.data.append(rows.el);
        panel.notes.append(
          note(
            '6 V 电池。控制和负载的正极供电线已接好。补接干簧管到线圈 K、公共动触点 c 到负极，以及 LED 和蜂鸣器到继电器触点。触点 a 为常开，b 为常闭。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        S.update(dt);
        if (falling) {
          const floor =
            Math.abs(magnet.position.z - DOOR_Z) < 0.045 &&
            magnet.position.x > HINGE - 0.021 &&
            magnet.position.x < HINGE + 0.131
              ? 0.012
              : 0.003;
          dropSpeed += 9.8 * dt;
          magnet.position.y = Math.max(floor, magnet.position.y - dropSpeed * dt);
          if (magnet.position.y === floor) falling = false;
        }
        const { position, axis } = rig.fieldGeometry();
        const previousContact = state.contact;
        state = stepAlarm(state, dt, {
          field: axialField(position, axis, reed.position, reedAxis),
          power: S.closed,
          coilWire: wires[0].to === 'K',
          commonWire: wires[1].to === 'neg',
          ledWire: wires[2].to,
          buzzerWire: wires[3].to,
        });
        rig.draw(state);
        if (state.contact !== previousContact && S.closed && wires.some((w, i) => w.to !== expected[i])) guide();
        const sound = state.buzzing && !sfx.muted;
        if (sound !== sounding) {
          if (sound && !tone) tone = new Tone({ type: 'square', freq: 1220, gain: 0.027 });
          tone?.on(sound);
          sounding = sound;
        }
        if (!tested) {
          if (state.reed && !nearSeen) {
            nearSeen = true;
            guide();
          }
          if (nearSeen && !state.reed) {
            tested = true;
            bar.done('reed');
            guide();
          }
        }
        if (!rows || !bar.has('circuit') || bar.finished || !wires.every((w, i) => w.to === expected[i])) return;
        const shut = angle < 0.035 && state.reed && state.ledCurrent > 0 && !state.buzzing;
        const open = angle > 0.22 && !state.reed && state.buzzing;
        if (completed === 1 ? !open : !shut) return;
        rows.add([
          shut ? '关闭' : '打开',
          state.reed ? '接通' : '断开',
          'c–' + state.contact,
          state.ledCurrent > 0 ? '亮' : '灭',
          state.buzzing ? '响' : '停',
        ]);
        completed++;
        if (completed === 3) bar.done('door');
        guide();
      },
      dispose() {
        tone?.stop();
        manip.dispose();
        bar.dispose();
      },
    };
  },
};
