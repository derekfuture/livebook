import { CoupledPendulums } from './kit/coupledPendulums.js';
import { coupledPendulumsRig, PIVOT_Y } from './kit/coupledPendulumsRig.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { note, buttons, table } from './kit/ui.js';
export default {
  id: 'coupledpendulums',
  fig: '图2.6-3',
  title: '演示共振现象',
  stampText: '实验',
  predict: {
    q: '只拉开重摆 D，其他摆中谁的响应会更明显？',
    options: ['与 D 等长的 A、G', '最短的 E', '所有摆都一样'],
    answer: 0,
    hint: '先看最初怎样动起来，再连续比较几个周期。',
  },
  conclusion: {
    quote: '固有频率与 D 摆相同的 A 摆、G 摆振幅最大。',
    why: '重摆 D 通过可微动的横梁传递能量。A、G 与 D 等长，固有频率相同，经过最初的过渡后响应较明显。D 比其他摆重，初始储能较多；质量较大不会使同长单摆的固有频率变小。这里没有持续电动驱动，后期会有衰减和能量往返。',
    src: '人教版高中物理选择性必修第一册第55–56页 · 图2.6-3',
  },
  create(ctx) {
    const model = new CoupledPendulums(),
      rig = coupledPendulumsRig(model),
      records = [];
    let ui,
      rows,
      capture = null,
      clean = false,
      near = false;
    const bar = lessonBar({
      ...ctx,
      group: rig.group,
      back: leave,
      steps: [
        {
          id: 'release',
          title: '拉开重摆',
          todo: '前后拖动中间较大的 D 球，偏离竖直位置后松手。',
          target: () => rig.bobs[3],
        },
        {
          id: 'observe',
          title: '比较响应',
          todo: '先看小摆逐渐动起来，再连续观察 A、G 与长短不同的其他摆。',
        },
      ],
    });
    const enter = () => {
      if (document.body.classList.contains('predicting')) ui?.go(1);
    };
    function guide() {
      if (capture)
        return bar.say(
          model.time - capture.start < 8
            ? '先观察小摆怎样逐渐动起来。D 通过横梁传能；不要再碰摆球，接着比较同一时段的摆幅。'
            : '继续观察这一段的往返：A、G 与 D 等长，比较它们和 C、E 的响应。辅助记录只取同一观察时段。',
        );
      if (bar.finished)
        return bar.say(
          '这一轮已观察。A、G 的响应较明显，C、E 较小。可以继续看后期衰减；再次拉 D 会改变能量，原记录仍保留。',
        );
      bar.say('前后拖中间的大球 D，约拉开一个球直径后松手；其他摆由横梁带动，不会同时被自动拉开。');
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
      ctx.look([0, 0.465, 0], [0, 0.2, 1], ctx.camera.aspect < 1 ? 0.65 : 0.6, leave);
      bar.say('同一横梁由两端弹性支承连接到铁架。支承与横梁的细小运动传递能量；返回全景比较摆球。');
    }
    const desk = draggable(
      rig.group,
      [
        {
          obj: rig.bobs[3],
          plane: 'yz',
          keepOffset: true,
          hint: '前后拉开 D，再松手',
          onStart() {
            enter();
            const s = model.observe();
            clean = s.bobs.every((b, i) => i === 3 || (Math.abs(b.angle) < 0.005 && Math.abs(b.omega) < 0.02));
            capture = null;
            model.hold(3);
          },
          onDrag(p) {
            model.moveHeld(clamp(Math.atan2(p.z - model.state[0], PIVOT_Y - p.y), -0.23, 0.23));
            rig.animate();
            bar.say('松手让 D 自由摆动。它通过横梁带动其他摆，不需要逐个拨动小摆。');
          },
          onEnd() {
            const angle = model.observe().bobs[3].angle;
            model.release();
            if (Math.abs(angle) < 0.09) {
              bar.say('这次拉开的幅度很小，其他摆仍会响应，但不易看清。再把 D 前后拉开约一个球直径后松手。');
              return;
            }
            if (!clean) {
              bar.say(
                '其他摆还在运动，这次拨动会叠加新的能量。可以继续观察；要重新比较从静止起动的一轮，请展开笔记本点“全部重做”。',
              );
              return;
            }
            bar.done('release');
            capture = {
              start: model.time,
              angle,
              min: Array(7).fill(Infinity),
              max: Array(7).fill(-Infinity),
              observing: false,
            };
            guide();
          },
        },
      ],
      { highlight: true, taps: [{ obj: rig.beam, hint: '近看原横梁与弹性支承', onTap: inspect }] },
    );
    const pointer = {
      items: desk.items,
      down(ray, e) {
        return near || desk.down(ray, e);
      },
      move(ray) {
        return near || desk.move(ray);
      },
      up() {
        return desk.up();
      },
      dispose() {
        desk.dispose();
      },
    };
    function reset() {
      model.reset();
      capture = null;
      records.length = 0;
      rows.clear();
      rows.el.hidden = true;
      bar.undo('release', 'observe');
      rig.animate();
      leave();
    }
    return {
      group: rig.group,
      pointer,
      toggles: ['steps'],
      size: { w: 0.56, d: 0.24, h: 0.52 },
      view: { elev: 15, azim: -35, margin: 1.12 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        rows = table(['轮', '观察时段 / s', ...model.pendulums.map((p) => p.name + ' / mm')]);
        rows.el.hidden = true;
        ui.data.append(rows.el);
        ui.notes.append(
          note(
            '前后拉开较大的 D 球后松手。摆长按悬点到球心计，A、D、G 等长；D 的质量较大。先观察起动过程，再比较同一时段的往返幅度。横梁的细小运动未放大。辅助记录取释放后 8–13 s 内、各球相对其悬点的横向位移半峰峰值，供回看，不是教材给出的实测数据。',
          ),
          buttons([
            { text: '近看横梁', onClick: inspect },
            { text: '全部重做', onClick: reset },
          ]).el,
          note(
            '该装置只在拉开 D 时输入初始能量，没有电机持续补能。观察窗是本活页的比较时段，不代表永恒稳态；更晚可能出现能量往返。模型使用可微动横梁、点质量摆和阻尼；等长摆质量不同仍有相同的小角度固有频率。重新握住 D 不会重置其余摆。',
          ),
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        // Sample at intervals no longer than 10 ms, even when rendering is slower.
        let remaining = dt;
        while (remaining > 0) {
          const h = Math.min(remaining, 0.01);
          remaining -= h;
          const s = model.advance(h);
          if (capture) {
            const elapsed = model.time - capture.start;
            if (elapsed >= 8 && elapsed <= 13) {
              if (!capture.observing) {
                capture.observing = true;
                guide();
              }
              s.bobs.forEach((b, i) => {
                const x = b.horizontal - s.x;
                capture.min[i] = Math.min(capture.min[i], x);
                capture.max[i] = Math.max(capture.max[i], x);
              });
            }
            if (elapsed > 13) {
              const r = capture;
              capture = null;
              const amplitudes = r.max.map((v, i) => ((v - r.min[i]) / 2) * 1000);
              records.push(amplitudes);
              rows?.add([String(records.length), '8–13', ...amplitudes.map((v) => v.toFixed(1))]);
              if (rows) rows.el.hidden = false;
              bar.done('observe');
              guide();
            }
          }
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
