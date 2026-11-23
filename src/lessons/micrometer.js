// 必修第三册图 11.3-4、11.3-6。学生在同一把仪器上查零和测电阻丝。
import * as THREE from 'three';
import { paint } from '../live/ink.js';
import { buttons, note, table } from './kit/ui.js';
import { draggable } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { sfx } from './kit/audio.js';
import { woodBlock } from './kit/props.js';
import { turnSpindle, SCREW_PITCH } from './kit/micrometer.js';
import { micrometerTool, readMicrometerTick, ANVIL_X, AXIS_Y, SCALE_ZERO } from './kit/micrometerTool.js';

const DIAMETER = 0.625,
  HOME_X = 0.046,
  HOME_Z = 0.025;
export default {
  id: 'micrometer',
  fig: '图11.3-4',
  title: '螺旋测微器测电阻丝直径',
  stampText: '测量',
  predict: {
    q: '旋钮转一圈，测微螺杆移动 0.5 mm。微分筒一周有 50 格，转过一格，螺杆移动多少？',
    options: ['0.01 mm', '0.1 mm', '0.5 mm'],
    answer: 0,
    hint: '把一个螺距分成 50 份。',
  },
  conclusion: {
    crops: [
      { page: 68, rect: [216.49, 675.89, 537.5, 761.66] },
      { page: 69, rect: [87.78, 54.73, 345.33, 98.5] },
    ],
    quote: '读数时，先读固定刻度B上的刻度，如图11. 3-5，观察到B 上的半毫米刻度线已露出，故B 上的读数为 6.5 mm ；再读E 上的刻度，考虑到每一格对应0.01 mm，可知E上的读数为……22.5×0.01 mm＝0.225 mm综合B 及E 的读数得到被测长度为6.725 mm。',
    why: '微分筒每一格对应 0.01 mm，可以估读到 0.001 mm。露出的半毫米刻线也要计入。靠近电阻丝时改用微调旋钮，棘轮打滑表示已达到测量压力。',
    src: '课本第 64–65 页 · 第十一章 第3节 实验：导体电阻率的测量',
  },
  create(ctx) {
    const tool = micrometerTool(),
      group = tool.group;
    const wire = new THREE.Group();
    const metal = new THREE.Mesh(
      new THREE.CylinderGeometry(DIAMETER / 2000, DIAMETER / 2000, 0.043, 20),
      paint(0xb96943),
    );
    metal.rotation.x = Math.PI / 2;
    wire.add(metal);
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(0.004, 0.005, 0.043),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    hit.userData.pick = true;
    wire.add(hit);
    group.add(wire);
    // 两只支脚把尺架支在纸面上，留出手指滚动旋钮的空间。
    for (const [x, z] of [
      [-0.048, 0.01],
      [-0.008, 0.01],
    ]) {
      const foot = woodBlock(0.008, AXIS_Y - 0.0045, 0.008);
      foot.position.set(x, (AXIS_Y - 0.0045) / 2, z);
      group.add(foot);
    }
    let gap, ratchetTurns, inserted, checked, clicked, locked, near, sleeveRead, grabGap, grabRatchet, ui, log;
    const minimum = () => (inserted ? DIAMETER : 0);
    const contact = () => Math.abs(gap - minimum()) < 1e-8;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'zero', title: '查零', todo: '用微调轮轻合测面，检查零位。', target },
        { id: 'place', title: '放入电阻丝', todo: '张开测面，把电阻丝拖到测砧和螺杆之间。', target },
        { id: 'read', title: '测量直径', todo: '用微调轮夹住电阻丝，读固定套筒和微分筒。', target },
      ],
    });
    function target() {
      if (near || bar.finished) return null;
      if (locked && !clicked) return tool.screw;
      if (checked && !inserted) return gap > DIAMETER + 0.06 ? wire : tool.grip;
      return clicked ? tool.scale : gap - minimum() > 0.2 ? tool.grip : tool.ratchet;
    }
    function guide() {
      if (bar.finished && !near && !clicked)
        return bar.say(locked ? '直径已记录。先松锁，再张开测面取丝。' : '直径已记录。张开测面可取丝重测。');
      if (near)
        return bar.say(
          sleeveRead === null
            ? '点固定套筒上刚露出的最后一条整毫米或半毫米刻线。'
            : '沿固定套筒的基准线，点微分筒上的对应位置，估读到格内。',
        );
      if (clicked) return bar.say('微调轮已打滑。点两筒交界的刻度，沿基准线近看。');
      if (locked) return bar.say('先点上方的锁紧装置松锁，再转旋钮。');
      if (checked && !inserted)
        return bar.say(
          gap > DIAMETER + 0.06
            ? '拖动右前方的电阻丝，把它横放在左端两测面之间。'
            : '把大旋钮朝自己滚动，张开左端测面，给电阻丝留出空隙。',
        );
      if (gap - minimum() > 0.2)
        return bar.say('把棕色大旋钮朝桌后滚动，使螺杆向左靠近' + (inserted ? '电阻丝。' : '测砧。'));
      bar.say('改滚最右端的小微调轮，朝桌后滚到棘轮发出喀声。');
    }
    function placeWire() {
      wire.position.set(
        inserted ? ANVIL_X + DIAMETER / 2000 : HOME_X,
        inserted ? AXIS_Y : DIAMETER / 2000,
        inserted ? 0 : HOME_Z,
      );
    }
    function enter() {
      if (ui && document.body.classList.contains('predicting')) ui.go(1);
    }
    function leave() {
      if (near) ctx.back();
      near = false;
      sleeveRead = null;
      bar.near(false);
      guide();
    }
    function inspect() {
      enter();
      if (!clicked || !contact()) {
        guide();
        return;
      }
      near = true;
      sleeveRead = null;
      bar.near(true);
      guide();
      ctx.look([SCALE_ZERO + gap / 1000, AXIS_Y, 0.0044], [0, 0, 1], 0.02, leave);
    }
    function roll(obj, fine, radius) {
      return {
        obj,
        plane: 'xz',
        offset: AXIS_Y,
        enabled: () => !near,
        hint: fine ? '滚动微调轮' : '滚动大旋钮，朝自己张开，朝桌后收拢',
        onStart() {
          enter();
          grabGap = gap;
          grabRatchet = ratchetTurns;
        },
        onDrag(p, from) {
          if (!from || locked) return;
          const turns = (p.z - from.z) / (2 * Math.PI * radius);
          const next = turnSpindle(grabGap, turns, minimum(), fine);
          const wasClicked = clicked;
          gap = next.gap;
          ratchetTurns = grabRatchet + (fine ? turns : (gap - grabGap) / SCREW_PITCH);
          clicked = next.slipped || (wasClicked && contact());
          if (next.slipped && !wasClicked) sfx.clink({ freq: 1750, gain: 0.055 });
          tool.update(gap, ratchetTurns);
          guide();
        },
        onEnd() {
          guide();
        },
      };
    }
    let wireMoved = false;
    const desk = draggable(
      group,
      [
        roll(tool.grip, false, 0.0067),
        roll(tool.ratchet, true, 0.004),
        {
          obj: wire,
          plane: 'xz',
          offset: AXIS_Y,
          keepOffset: true,
          enabled: () => !near,
          hint: '把电阻丝放入或取出测面',
          onStart() {
            enter();
            wireMoved = false;
          },
          onDrag(p) {
            if (inserted && contact()) return;
            wireMoved = true;
            wire.position.set(p.x, AXIS_Y, p.z);
          },
          onEnd(moved) {
            if (!moved) return;
            const atGap = Math.abs(wire.position.x - ANVIL_X) < 0.01 && Math.abs(wire.position.z) < 0.022;
            let message = '';
            if (!wireMoved) message = '电阻丝还夹在测面之间。先张开测面再取出。';
            else if (atGap && !checked) message = '先轻合空测面，检查零位。';
            else if (atGap && gap < DIAMETER + 0.06) message = '测面还太近。把大旋钮朝自己滚，再放入电阻丝。';
            else if (atGap) {
              inserted = true;
              clicked = false;
              bar.done('place');
            } else if (wire.position.z > 0.022) {
              inserted = false;
              clicked = false;
            }
            placeWire();
            if (message) bar.say(message);
            else guide();
          },
        },
      ],
      {
        highlight: true,
        taps: [
          {
            obj: tool.screw,
            hint: '锁住或松开测微螺杆',
            onTap() {
              enter();
              locked = !locked;
              tool.screw.rotation.z = locked ? 0.55 : 0;
              guide();
            },
          },
          { obj: tool.scale, hint: '近看两筒交界的刻度', onTap: inspect },
          { obj: tool.sleevePick, hint: '沿基准线近看', onTap: inspect },
        ],
      },
    );
    function read(ray) {
      const result = readMicrometerTick(tool, gap, sleeveRead, ray);
      if (result.error) return bar.say(result.error);
      if (result.coarse !== undefined) {
        sleeveRead = result.coarse;
        guide();
        return;
      }
      if (result.value === undefined) return;
      const { division, value } = result;
      if (!checked) {
        checked = true;
        bar.done('zero');
        clicked = false;
        leave();
        return;
      }
      if (!inserted) {
        leave();
        return;
      }
      log.add([sleeveRead.toFixed(1), division.toFixed(1), value.toFixed(3)]);
      log.el.hidden = false;
      clicked = false;
      bar.done('read');
      leave();
      bar.say('实读直径 ' + value.toFixed(3) + ' mm。张开测面后可取丝重测。');
    }
    function reset() {
      if (near) leave();
      gap = 0.45;
      ratchetTurns = gap / SCREW_PITCH;
      inserted = checked = clicked = locked = near = false;
      sleeveRead = null;
      tool.screw.rotation.z = 0;
      tool.update(gap, ratchetTurns);
      placeWire();
      log?.clear();
      if (log) log.el.hidden = true;
      bar.undo('zero', 'place', 'read');
      guide();
    }
    reset();
    return {
      group,
      size: { w: 0.13, d: 0.106, h: 0.023 },
      view: { azim: 0, elev: 42, lookY: 0.4, margin: 1.03 },
      toggles: ['steps'],
      pointer: {
        items: desk.items,
        down(ray, e) {
          if (near) {
            read(ray);
            return true;
          }
          return desk.down(ray, e);
        },
        move(ray) {
          return near || desk.move(ray);
        },
        up() {
          return desk.up();
        },
      },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        log = table(['固定套筒 / mm', '微分筒 / 格', '直径 / mm']);
        log.el.hidden = true;
        ui.data.append(log.el);
        ui.notes.append(
          note(
            '本模型采用均匀电阻丝，忽略零点误差和丝的形变。转动大旋钮调开口，临近接触时用微调轮控制测量压力。读数时先认清露出的半毫米线。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
      },
      dispose() {
        desk.dispose();
        bar.dispose();
        tool.dispose();
      },
    };
  },
};
