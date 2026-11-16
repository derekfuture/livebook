import { RopeSuperposition } from './kit/ropeSuperposition.js';
import { ropeWaveRig, ROPE_Y } from './kit/ropeWaveRig.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { note, buttons } from './kit/ui.js';

export default {
  id: 'ropesuperposition',
  fig: '图3.4-1',
  title: '观察波的叠加',
  stampText: '观察',
  predict: {
    q: '绳上两个凸起迎面相遇，会像两个小球一样弹回吗？',
    options: ['彼此穿过，继续原方向传播', '碰撞后各自弹回', '合成一个凸起不再分开'],
    answer: 0,
  },
  conclusion: {
    page: 78, rect: [216.5, 592.81, 537.5, 697.93],
    quote: '可以发现，两列波在彼此相遇并穿过后，波的形状和相遇前一样，传播的情形也和相遇前一样（图3.4-1 戊）。生活中常见的水波也是如此，两列水波相遇后彼此穿过，仍然保持各自的运动特征，继续传播，就像没有跟另一列水波相遇一样。',
    why: '相遇处只有同一根绳。绳上质点的位移等于两列波单独传播时位移的矢量和。同向位移相加、反向位移相减，但波不会像小球碰撞那样弹回。后来到达绳端产生的反射是另一件事。',
    src: '课本第 74 页 · 第三章 第4节 波的干涉',
  },
  create(ctx) {
    const model = new RopeSuperposition({ length: 2, tension: 4 }),
      rig = ropeWaveRig(model, { twoHands: true, markerIndex: 80, reference: false, scale: 0.36 });
    let ui,
      episodes = [null, null],
      pulses = [null, null],
      pair = null,
      failed = false,
      passed = false,
      phase = '',
      held = [false, false];
    const rate = 0.03;
    const handles = [rig.handle, rig.rightHandle];
    const bar = lessonBar({
      ...ctx,
      group: rig.group,
      steps: [
        {
          id: 'launch',
          title: '两端抖动',
          todo: '左端上抖回中后，马上把右端也上抖回中。',
          target: () => (pulses[0] ? rig.rightHandle : rig.handle),
        },
        {
          id: 'observe',
          title: '看相遇穿过',
          todo: '观察两个凸起相遇后穿过，再点绳上红标记确认。',
          target: () => (passed ? rig.marker : null),
        },
      ],
    });
    const say = (text) => bar.say('0.03×慢放。' + text);
    function guide() {
      if (bar.finished) return say('凸起相遇后穿过。可继续抖绳，注意两端的返波。');
      if (failed) return say(failed + '在笔记本点“全部重做”再试。');
      if (held.some(Boolean)) return;
      if (passed) return say('两波已穿过。看完后，点原绳红标记确认。');
      if (pair)
        return say(phase === 'overlap' ? '看两个凸起怎样重叠，再向对侧传开。' : '看两个凸起相向靠近，不用再动握柄。');
      if (pulses[0] || pulses[1]) return say(`马上把${pulses[0] ? '右' : '左'}端圆柄上拉，再回中线。`);
      say('左柄上拉回中，马上换右柄上拉回中。');
    }
    function mark() {
      if (document.body.classList.contains('predicting')) ui?.go(1);
      if (!passed) {
        if (pair) return say('两波还没穿过，先看绳上的变化。');
        return guide();
      }
      bar.done('observe');
      guide();
    }
    const pointer = draggable(
      rig.group,
      handles.map((obj, side) => ({
        obj,
        anchor: obj,
        plane: 'xy',
        keepOffset: true,
        hint: '向上抖一下，再回红色中线',
        onStart() {
          if (document.body.classList.contains('predicting')) ui?.go(1);
          held[side] = true;
        },
        onDrag(p) {
          const y = clamp((p.y - ROPE_Y) / 0.36, -0.18, 0.18);
          if (side) model.setRightHand(y);
          else model.setHand(y);
        },
        onEnd() {
          held[side] = false;
          const target = side ? model.rightTarget : model.target;
          if (Math.abs(target) < 0.04) {
            if (side) model.setRightHand(0);
            else model.setHand(0);
          }
          if (Math.abs(target) >= 0.04) say('把这个圆柄拖回红色中线，才是一次抖动。');
          else guide();
        },
      })),
      { highlight: true, taps: [{ obj: rig.marker, hint: '看完相遇和穿过后确认', onTap: mark }] },
    );
    function reset() {
      model.reset();
      episodes = [null, null];
      pulses = [null, null];
      pair = null;
      failed = passed = false;
      phase = '';
      held = [false, false];
      bar.undo('launch', 'observe');
      rig.animate();
      guide();
    }
    function readMovement() {
      if (failed || passed || bar.finished) return;
      for (let side = 0; side < 2; side++) {
        const y = model.y[side ? model.segments : 0],
          target = side ? model.rightTarget : model.target;
        if (!episodes[side] && Math.abs(y) > 0.02)
          episodes[side] = { start: model.time, peak: y, peakTime: model.time, min: y };
        const e = episodes[side];
        if (e) {
          if (y > e.peak) {
            e.peak = y;
            e.peakTime = model.time;
          }
          e.min = Math.min(e.min, y);
          if (Math.abs(y) < 0.012 && Math.abs(target) < 0.02) {
            episodes[side] = null;
            if (e.peak > 0.045 && e.min > -0.02 && model.time - e.start < 0.065 && !pulses[side]) pulses[side] = e;
            else {
              failed =
                e.min <= -0.02
                  ? '这次向下抖了；先试两端都向上。'
                  : e.peak <= 0.045
                    ? '抖动太小，波峰不清楚。'
                    : pulses[side]
                      ? '一端重复抖动，出现了更多波。'
                      : '握柄停留太久，没形成短脉冲。';
              guide();
              return;
            }
            guide();
          }
        }
      }
      if (!pair && pulses.every(Boolean)) {
        if (Math.abs(pulses[0].peakTime - pulses[1].peakTime) > 0.08) {
          failed = '换手间隔太久，没赶上这轮相遇。';
          guide();
          return;
        }
        pair = { cross: (pulses[0].peakTime + pulses[1].peakTime + model.length / model.speed) / 2 };
        bar.done('launch');
        guide();
      }
      if (!pair && pulses.some(Boolean) && model.time - pulses.find(Boolean).peakTime > 0.12) {
        failed = '换手间隔太久，没赶上这轮相遇。';
        guide();
      }
      if (pair && model.time >= pair.cross - 0.018 && phase !== 'overlap') {
        phase = 'overlap';
        guide();
      }
      if (pair && model.time >= pair.cross + 0.035) {
        passed = true;
        guide();
      }
    }
    return {
      group: rig.group,
      pointer,
      toggles: ['steps'],
      size: { w: 0.9, d: 0.23, h: 0.33 },
      view: { elev: 24, azim: -4, margin: 1.08 },
      mount(panel) {
        ui = panel;
        bar.attach(panel);
        panel.notes.append(
          note(
            '先把一端圆柄向上拖，再主动回到支杆红色中线，马上换另一端做同样动作。一端高一些、一端低一些，更容易认出两个凸起穿过前后的位置。两端都由你操作，没有自动产生的第二列波。若换手太晚或握住高处不回中，本轮不算清楚的双脉冲对照，可重做。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
          note(
            '固定 0.03× 慢放，物理时间按画面时间的 3% 推进，便于一个人依次操作两端。绳长 2 m、张力 4 N、线密度 0.04 kg/m，波速 10 m/s；小斜率线性模型，含静态下垂、阻尼和绳端反射。装置缩尺显示，绳粗与红标记为便于观察放大。圆柄代替手握绳端，中线附近有回中定位。',
          ),
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        let remaining = dt * rate;
        while (remaining > 0) {
          const h = Math.min(0.001, remaining);
          remaining -= h;
          model.advance(h);
          readMovement();
        }
        rig.animate();
      },
      dispose() {
        pointer.dispose();
        bar.dispose();
        rig.dispose();
      },
    };
  },
};
