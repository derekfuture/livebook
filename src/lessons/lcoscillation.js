import { LCOscillation } from './kit/lcOscillation.js';
import { lcOscillationRig, LC_PIVOT_Z, LC_THROW, SCOPE } from './kit/lcOscillationRig.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { note, buttons } from './kit/ui.js';
export default {
  id: 'lcoscillation',
  fig: '图4.1-1',
  title: '观察 LC 电路的电压波形',
  stampText: '观察',
  predict: {
    q: '电容充电后接到线圈上，两端电压会一直保持同一个正负方向吗？',
    options: ['会反向，并来回变化', '只会从正电压慢慢降到零', '保持充电时的电压'],
    answer: 0,
  },
  conclusion: {
    page: 76, rect: [216.87, 135.08, 531.96, 303.19],
    quote: '在前面的实验中，电路的电压发生周期性的变化，电路中的电流也发生周期性的变化。像这样大小和方向都做周期性迅速变化的电流，叫作振荡电流（oscillating current），产生振荡电流的电路叫作振荡电路（oscillating circuit）。图4.1-1甲中，当开关置于线圈一侧时，由电感线圈L和电容C组成的电路，就是最简单的振荡电路，称为LC振荡电路。',
    why: '电容放电时，电场能转化为线圈的磁场能；电容电压降到零后，线圈电流仍能继续，给电容反向充电。能量来回转换，同时因电阻等损耗逐渐减少，所以这里的波形振幅逐渐变小。',
    src: '课本第 72 页 · 第四章 第1节 电磁振荡',
  },
  create(ctx) {
    const model = new LCOscillation(),
      rig = lcOscillationRig(),
      { group } = rig;
    let ui,
      angle = 0,
      near = false,
      point,
      shot = null,
      ticks = 0,
      drawAge = 0;
    const history = [];
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        {
          id: 'charge',
          title: '给电容充电',
          todo: '把黑色刀柄拖向“电源”，看电压升到 5.5 V。',
          target: () => rig.handle,
        },
        {
          id: 'capture',
          title: '接入线圈',
          todo: '把同一刀柄拨向“线圈”，观察屏幕记录的变化。',
          target: () => rig.handle,
        },
        { id: 'read', title: '看电压反向', todo: '点原屏幕近看，再点零线下方的波形。', target: () => rig.screen },
      ],
    });
    function guide() {
      if (bar.finished) return bar.say('电压反复过零、振幅减小。可重新充电，再记录一轮。');
      if (shot?.capturing) return bar.say('正在记录这 0.4 s；先别动开关，看电压来回变化。');
      if (bar.current === 'read' && shot?.valid)
        return bar.say(near ? '点前几次零线下方的波形，确认电压曾反向。' : '点原屏幕近看：波形是否越过了零线？');
      if (model.contact === 'charge')
        return bar.say(
          model.voltage < 5.5 ? '保持在电源侧，看屏幕电压升到 5.5 V。' : '电已充好。把同一刀柄拖到左侧“线圈”。',
        );
      if (shot?.interrupted) return bar.say('中途切走使波形改变。先拨回电源充电，再接线圈重试。');
      if (model.contact === 'oscillate') return bar.say('这次充电不足。先拨向电源，等到 5.5 V 再接线圈。');
      return bar.say('黑色刀柄现在断开。把它拖向右侧“电源”。');
    }
    function mode(contact) {
      if (contact === model.contact) return;
      if (shot?.capturing && contact !== 'oscillate') shot.interrupted = true;
      model.setSwitch(contact);
      if (contact === 'oscillate')
        shot = {
          start: model.time,
          initial: model.voltage,
          samples: [{ time: model.time, voltage: model.voltage }],
          capturing: true,
          frozen: false,
          interrupted: false,
          valid: false,
          min: model.voltage,
        };
      guide();
    }
    function move(q) {
      angle = clamp(q, -LC_THROW, LC_THROW);
      rig.setAngle(angle);
      mode(angle < -0.53 ? 'oscillate' : angle > 0.53 ? 'charge' : 'open');
    }
    function leave() {
      near = false;
      ctx.back();
      bar.near(false);
      guide();
    }
    function inspect() {
      near = true;
      bar.near(true);
      ctx.look([0, SCOPE.y, SCOPE.z], [0, 0.02, 1], ctx.camera.aspect < 1 ? 0.45 : 0.58, leave);
      guide();
    }
    function read(p) {
      if (!near) return inspect();
      if (!bar.has('capture') || !shot?.frozen || !shot.valid) return guide();
      const px = (p.x / SCOPE.width + 0.5) * SCOPE.W,
        py = (0.5 - (p.y - SCOPE.y) / SCOPE.height) * SCOPE.H;
      const t = shot.start + ((px - SCOPE.L) / (SCOPE.R - SCOPE.L)) * SCOPE.duration;
      const sample = shot.samples.reduce(
        (best, s) => (Math.abs(s.time - t) < Math.abs(best.time - t) ? s : best),
        shot.samples[0],
      );
      const y = (SCOPE.T + SCOPE.B) / 2 - ((sample.voltage / SCOPE.range) * (SCOPE.B - SCOPE.T)) / 2;
      if (px < SCOPE.L || px > SCOPE.R || sample.voltage > -0.8 || Math.abs(py - y) > 26)
        return bar.say('看标着 0 的横线，点前几次落在它下面的曲线。');
      bar.done('read');
      guide();
    }
    model.onStep = (s) => {
      ticks++;
      if (ticks % 5 === 0) {
        history.push({ time: s.time, voltage: s.voltage });
        while (history[0]?.time < s.time - 0.4) history.shift();
      }
      if (model.contact === 'charge' && s.voltage >= 5.5 && !bar.has('charge')) {
        bar.done('charge');
        guide();
      }
      if (shot?.capturing) {
        shot.min = Math.min(shot.min, s.voltage);
        if (ticks % 5 === 0) shot.samples.push({ time: s.time, voltage: s.voltage });
        if (s.time - shot.start >= SCOPE.duration) {
          shot.capturing = false;
          shot.frozen = true;
          shot.valid = !shot.interrupted && shot.initial >= 5.5 && shot.min < -1 && bar.has('charge');
          if (shot.valid) bar.done('capture');
          guide();
        }
      }
    };
    const pointer = draggable(
      group,
      [
        {
          obj: rig.handle,
          plane: 'xz',
          offset: 0.028,
          keepOffset: true,
          hint: '拖刀柄，在电源与线圈间切换',
          onDrag(p) {
            move(Math.atan2(p.x, LC_PIVOT_Z - p.z));
          },
          onEnd() {
            move(Math.abs(angle) > 0.4 ? Math.sign(angle) * LC_THROW : 0);
          },
        },
        {
          obj: rig.screen,
          plane: 'xy',
          offset: SCOPE.z + 0.0095,
          hint: '近看原电压波形',
          onStart(p) {
            point = p?.clone();
          },
          onTap() {
            if (point) read(point);
          },
        },
      ],
      { highlight: true },
    );
    function reset() {
      if (near) leave();
      model.reset();
      angle = ticks = drawAge = 0;
      shot = null;
      history.length = 0;
      rig.setAngle(0);
      bar.undo('charge', 'capture', 'read');
      rig.draw(0, [], { now: 0 });
      guide();
    }
    return {
      group,
      size: { w: 0.45, d: 0.46, h: 0.23 },
      view: { elev: 38, azim: -5, margin: 1.06 },
      toggles: ['steps'],
      pointer: {
        ...pointer,
        down(ray, e) {
          if (document.body.classList.contains('predicting')) ui?.go(1);
          return pointer.down(ray, e);
        },
      },
      mount(panel) {
        ui = panel;
        bar.attach(panel);
        panel.notes.append(
          note(
            '同一开关右接电源、左接线圈，中间断开。先充到 5.5 V，再拨向线圈；屏幕会记录并保留随后 0.4 s 的实际电容电压。重新充电时，已保存的曲线仍在原屏幕，右上角显示当前电压；再次接入线圈才开始新记录。中途切换不会清空电容电压或线圈电流。',
          ),
          buttons([
            { text: '近看原屏幕', onClick: inspect },
            { text: '全部重做', onClick: reset },
          ]).el,
          note(
            '示意装置：无极性电容 47 μF、线圈 0.5 H / 8 Ω、电源 6 V、充电限流 10 kΩ、传感器输入 1 MΩ。线圈匝数和器材外形为示意，不据画面尺寸推算电容或电感。5.5 V 是本页便于看清波形的充电条件，不是振荡发生的门槛。模型以等效寄生电容承接开关暂态，不预测电弧或击穿。',
          ),
        );
        rig.draw(0, [], { now: 0 });
        guide();
      },
      update(dt) {
        bar.update(dt);
        model.advance(dt);
        drawAge += dt;
        if (drawAge > 0.035) {
          drawAge = 0;
          rig.draw(model.voltage, shot?.samples || history, {
            capturing: shot?.capturing,
            frozen: shot?.frozen,
            start: shot?.start || 0,
            now: model.time,
          });
        }
      },
      dispose() {
        model.onStep = null;
        pointer.dispose();
        bar.dispose();
        rig.dispose();
      },
    };
  },
};
