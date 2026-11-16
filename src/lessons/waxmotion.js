import { waxMotion } from './kit/waxMotion.js';
import { waxMotionRig, WAX_SCALE, WAX_CENTER_Y, WAX_START_X } from './kit/waxMotionRig.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { note, buttons } from './kit/ui.js';

export default {
  id: 'waxmotion',
  fig: '图5.2-1',
  title: '观察蜡块的合运动',
  stampText: '观察',
  predict: {
    q: '蜡块稳定上升时，把竖直水管匀速向右移动，相对固定背景的轨迹怎样？',
    options: ['向右上方的直线', '仍然竖直向上', '一定是弯曲的线'],
    answer: 0,
  },
  conclusion: {
    page: 11, rect: [63.78, 613, 378.86, 681.1],
    quote: '也就是说，蜡块的运动轨迹是直线。',
    why: '蜡块相对水管上升，水管相对背景横移。只有这两个分运动都近似匀速，背景上的记录才接近斜直线；手移动得忽快忽慢或停顿，实际轨迹就会改变。最初浮升的加速阶段不能当作匀速。',
    src: '课本第 7 页 · 第五章 第2节 运动的合成与分解',
  },
  create(ctx) {
    const rig = waxMotionRig(),
      { group } = rig;
    let model = waxMotion(),
      ui,
      angle = 0,
      targetAngle = 0,
      x = WAX_START_X / WAX_SCALE;
    let turning = false,
      moving = false,
      near = false,
      steadyTime = 0;
    let record = null,
      records = [],
      points = [],
      nextSampleTime = 0,
      movedDistance = 0,
      horizontalSamples = 0,
      lastX = x;
    let previousPointerAngle = 0;
    const pose = () => ({ x, angle });
    const vertical = () => Math.abs(Math.sin(angle)) < 0.025 && Math.abs(targetAngle - angle) < 0.005;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        {
          id: 'flip',
          title: '翻转水管',
          todo: '抓住上端橡皮塞，向右绕半圈，把它翻到下方。',
          target: () => rig.stopper,
        },
        { id: 'rise', title: '观察上升', todo: '先不横移水管，看蜡块上升和固定背景上的等时位置点。' },
        {
          id: 'move',
          title: '横移水管',
          todo: '抓住玻璃管中段，慢慢向右拖，观察相对背景的运动。',
          target: () => rig.shell,
        },
        { id: 'compare', title: '比较轨迹', todo: '点固定背景近看：比较横移前后的点迹。' },
      ],
    });
    function guide() {
      if (near) return bar.say('点间隔都是0.2秒。比较竖直上升、横移和停顿时的记录；看完可回到全景。');
      if (turning) return bar.say('抓住橡皮塞，缓慢沿右侧绕管中心转半圈；不要直接把塞子拉穿水管。');
      if (!vertical()) return bar.say('水管还倾斜着。抓住橡皮塞，继续沿圆弧转到正上方或正下方。');
      if (bar.has('move') && !bar.has('compare')) return bar.say('点绿色固定背景，近看横移前后的原位置记录。');
      if (model.snapshot().atEnd && bar.has('flip'))
        return bar.say('蜡块已到管端。再把原水管翻转半圈即可重试，旧位置记录保留。');
      if (!bar.has('flip')) return bar.say('抓住水管上端的棕色橡皮塞，向右绕半圈，把它翻到下方。');
      if (!bar.has('rise')) return bar.say('先停住水管，观察蜡块上升；相邻位置点间距趋于相等时，再横移。');
      if (!bar.has('move') && movedDistance > 0.3 && horizontalSamples < 5)
        return bar.say('横移得有些快，位置点还不够比较。抓住管身再缓慢移动，留下一段连续的横移记录。');
      if (!bar.has('move')) return bar.say('抓住玻璃管中段，缓慢向右拖过至少三格；背景和尺保持不动。');
      if (!bar.has('compare')) return bar.say('点绿色固定背景，近看横移前后的原位置记录。');
      bar.say('变速、停顿的轨迹也会原样保留。可继续移动，或翻转原水管再试一次。');
    }
    function leave() {
      near = false;
      ctx.back();
      bar.near(false);
      guide();
    }
    function inspect() {
      if (turning || moving) return;
      near = true;
      bar.near(true);
      ctx.look([0, 0.25, -0.04], [0, 0.08, 1], Math.max(1.2, (0.72 * innerWidth) / innerHeight), leave);
      if (bar.has('move')) bar.done('compare');
      guide();
    }
    function beginRecord() {
      record = rig.makeTrace(records.length % 2 ? 0x9cd9ec : 0xf1c979);
      records.push(record);
      movedDistance = horizontalSamples = 0;
      points = [];
      nextSampleTime = model.snapshot().time + 0.2;
    }
    function reset() {
      if (near) leave();
      model = waxMotion();
      angle = targetAngle = 0;
      x = WAX_START_X / WAX_SCALE;
      turning = moving = false;
      steadyTime = nextSampleTime = movedDistance = horizontalSamples = 0;
      lastX = x;
      record = null;
      records = [];
      points = [];
      rig.clearTraces();
      bar.undo('flip', 'rise', 'move', 'compare');
      rig.draw(model.snapshot(), pose());
      guide();
    }
    const pointer = draggable(
      group,
      [
        {
          obj: rig.stopper,
          plane: 'xy',
          enabled: () => !near,
          onStart(p) {
            turning = true;
            record = null;
            steadyTime = 0;
            previousPointerAngle = Math.atan2(p.x - x * WAX_SCALE, p.y - WAX_CENTER_Y);
            guide();
          },
          onDrag(p) {
            const dx = p.x - x * WAX_SCALE,
              dy = p.y - WAX_CENTER_Y;
            if (Math.hypot(dx, dy) < 0.07) return;
            const a = Math.atan2(dx, dy);
            let delta = a - previousPointerAngle;
            while (delta > Math.PI) delta -= 2 * Math.PI;
            while (delta < -Math.PI) delta += 2 * Math.PI;
            targetAngle = clamp(targetAngle + delta, 0, Math.PI);
            previousPointerAngle = a;
          },
          onEnd() {
            turning = false;
            // 松手后不继续追赶旧鼠标目标，也不自动翻转到另一端。
            targetAngle = angle;
            if (angle < 0.025) targetAngle = 0;
            else if (Math.PI - angle < 0.025) targetAngle = Math.PI;
            guide();
          },
        },
        {
          obj: rig.shell,
          anchor: rig.tube,
          plane: 'xy',
          keepOffset: true,
          enabled: () => !near,
          onStart() {
            moving = true;
            lastX = x;
          },
          onDrag(p) {
            if (!vertical()) return;
            x = clamp(p.x / WAX_SCALE, -0.425, 0.5);
            if (bar.has('rise') && !model.snapshot().atEnd) movedDistance += Math.abs(x - lastX);
            lastX = x;
          },
          onEnd() {
            moving = false;
            guide();
          },
          onTap: guide,
        },
      ],
      { highlight: true, taps: [{ obj: rig.board, onTap: inspect }] },
    );
    rig.draw(model.snapshot(), pose());
    return {
      group,
      size: { w: 0.96, d: 0.2, h: 0.54 },
      view: { elev: 14, azim: 0, margin: 1.05 },
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
          note('抓塞子沿圆弧翻转同一根管，抓玻璃管中段横移。蜡块先加速再趋于稳定上升；先停住管观察，再缓慢横移。'),
          note(
            '固定背景上的点是辅助位置记录，每0.2秒一点，不是蜡块接触黑板留下的痕迹。变速和停顿也照实保留，不自动修成直线。',
          ),
          buttons([
            { text: '近看位置记录', onClick: inspect },
            { text: '全部重做', onClick: reset },
          ]).el,
          note(
            '装满水、塞紧的管已准备好。采用低速窄管浮升近似和等效阻力，未模拟快速摇晃、涡流及侧壁摩擦；阻力参数不是蜡块的实测标定。',
          ),
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        const duration = Math.min(dt, 0.1),
          start = angle,
          change = clamp(targetAngle - angle, -duration * 0.8, duration * 0.8);
        const startTime = model.snapshot().time;
        // 轴向动力学持续运行；角度在这帧内连续变化，蜡块不随步骤重置。
        const control = (t) => ({
          x,
          angle: start + change * clamp((t - startTime) / (duration || 1), 0, 1),
          omega: change / (duration || 1),
        });
        let state = model.snapshot(control(startTime));
        const endTime = startTime + duration;
        while (state.time < endTime - 1e-10) {
          const recording = record && vertical() && !turning && !state.atEnd;
          const h = Math.min(endTime - state.time, recording ? Math.max(0, nextSampleTime - state.time) : Infinity);
          state = model.step(h, control);
          if (recording && state.time >= nextSampleTime - 1e-9) {
            if (points.length && Math.abs(state.x - points.at(-1).x) > 0.003) horizontalSamples++;
            points.push(state);
            rig.drawTrace(record, points);
            nextSampleTime += 0.2;
          }
        }
        angle = start + change;
        rig.draw(state, pose());
        if (vertical() && !turning) {
          if (!bar.has('flip') && angle > 3.1) {
            bar.done('flip');
            guide();
          }
          if (bar.has('flip') && !state.atEnd) {
            if (!record) beginRecord();
            const accel = model.acceleration(state.s, state.velocity, pose());
            if (!moving && Math.abs(accel) < 0.005 && Math.abs(state.velocity) > 0.06) steadyTime += duration;
            else steadyTime = 0;
            if (!bar.has('rise') && steadyTime > 1 && points.length >= 10) {
              bar.done('rise');
              guide();
            }
            if (bar.has('rise') && !bar.has('move') && movedDistance > 0.3 && horizontalSamples >= 5) {
              bar.done('move');
              guide();
            }
          }
        }
        if (state.atEnd && Math.abs(state.velocity) === 0 && bar.has('flip')) guide();
      },
      dispose() {
        pointer.dispose();
        bar.dispose();
        rig.dispose();
      },
    };
  },
};
