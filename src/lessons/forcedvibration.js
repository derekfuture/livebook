import { ForcedVibration } from './kit/forcedVibration.js';
import { forcedVibrationRig } from './kit/forcedVibrationRig.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { note, buttons, table } from './kit/ui.js';
export default {
  id: 'forcedvibration',
  fig: '图2.6-2',
  title: '研究受迫振动的频率',
  stampText: '实验',
  predict: {
    q: '两组弹簧软硬不同，稳定后的振动频率会不同吗？',
    options: ['相同，都跟随驱动频率', '软弹簧一定更慢', '硬弹簧一定更慢'],
    answer: 0,
    hint: '先观察启动的过渡，再比较稳定后的三个频率。',
  },
  conclusion: {
    page: 59, rect: [63.85, 431.39, 382.85, 473.5],
    quote: '大量的实验都证实：物体做受迫振动达到稳定后，物体振动的频率等于驱动力的频率，与物体的固有频率无关。',
    why: '电机通过偏心轮移动两弹簧的上端。两钩码的瞬时运动、振幅和相位可以不同，但过渡衰减后，其振动频率都跟随电机。改变转速后需要重新等待稳定；断电后则不再持续受迫。',
    src: '课本第 55 页 · 第二章 第6节 受迫振动 共振',
  },
  create(ctx) {
    const model = new ForcedVibration(),
      rig = forcedVibrationRig(model),
      records = [];
    let ui,
      rows,
      near = false,
      capture = null,
      values = null,
      drawClock = 0,
      knobStart = 0,
      lastAngle = 0;
    const bar = lessonBar({
      ...ctx,
      group: rig.group,
      back: leave,
      steps: [
        { id: 'start', title: '接通电源', todo: '点底座左侧电源，观察两钩码从静止到振动。', target: () => rig.power },
        {
          id: 'first',
          title: '测三组周期',
          todo: '点右侧测周期键，待过渡结束后记录驱动、A、B。',
          target: () => rig.record,
        },
        { id: 'change', title: '调速再测', todo: '沿圆弧拖转速旋钮，改变转速后再次测周期。', target: () => rig.knob },
        { id: 'off', title: '断电观察', todo: '断开电源，观察轮子滑行和钩码振动衰减。', target: () => rig.power },
      ],
    });
    const enter = () => {
      if (document.body.classList.contains('predicting')) ui?.go(1);
    };
    function guide() {
      if (capture)
        return bar.say(
          capture.waiting
            ? '已按测周期。先观察启动或变速的过渡；稳定后周期计自动开始，不把过渡数据混入记录。'
            : '保持旋钮不动。周期计正分别测驱动、A、B 的 3 个完整周期。',
        );
      if (bar.finished)
        return bar.say('两种转速已比较。振幅、相位可以不同，稳定后的频率都跟随驱动。还可调别的转速再试。');
      if (!model.powered)
        return bar.say(
          bar.current === 'off'
            ? '电机正在滑行，钩码继续衰减；观察它们逐渐停下。'
            : '点底座左侧电源，再点右侧“测周期”；先观察两钩码的过渡过程。',
        );
      if (bar.current === 'change') return bar.say('沿圆弧拖左侧旋钮，把设定转速改变至少 15 转/分，再点“测周期”比较。');
      if (bar.current === 'off') return bar.say('两组记录已保留。点电源断开，观察电机与钩码是否立即停住。');
      bar.say('观察两钩码，再点底座右侧“测周期”。周期计会等过渡结束后分别测 3 个周期。');
    }
    function cancel() {
      capture = null;
    }
    function power() {
      enter();
      model.switch(!model.powered);
      cancel();
      if (model.powered) bar.done('start');
      guide();
    }
    function measure() {
      enter();
      if (!model.powered) return bar.say('先接通左侧电源。断电后的衰减不能当作稳定受迫振动。');
      if (capture) return;
      capture = { waiting: true };
      values = null;
      guide();
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
      ctx.look([0.025, 0.045, 0.091], [0, 0.04, 1], ctx.camera.aspect < 1 ? 0.38 : 0.42, leave);
      bar.say('原周期计分别记录 3 个周期再求频率。数值不是旋钮设定值；返回全景后继续调速或断电。');
    }
    const desk = draggable(
      rig.group,
      [
        {
          obj: rig.knob,
          plane: 'xy',
          offset: 0.107,
          hint: '沿圆弧转动旋钮，改变电机转速',
          onStart(p) {
            enter();
            knobStart = model.frequency;
            lastAngle = Math.atan2(p.x + 0.115, p.y - 0.048);
          },
          onDrag(p) {
            const angle = Math.atan2(p.x + 0.115, p.y - 0.048);
            let delta = angle - lastAngle;
            if (delta > Math.PI) delta -= 2 * Math.PI;
            if (delta < -Math.PI) delta += 2 * Math.PI;
            lastAngle = angle;
            knobStart = clamp(knobStart + (delta / (1.5 * Math.PI)) * 2, 0.6, 2.6);
            model.setFrequency(knobStart);
            cancel();
            bar.say(`旋钮设定 ${(model.frequency * 60).toFixed(0)} 转/分。松手后点“测周期”，等待新的过渡结束。`);
          },
          onEnd() {
            guide();
          },
        },
      ],
      {
        highlight: true,
        taps: [
          { obj: rig.power, hint: '接通或断开电源', onTap: power },
          { obj: rig.record, hint: '测驱动与两钩码的周期', onTap: measure },
          { obj: rig.screen, hint: '近看同一周期计', onTap: inspect },
        ],
      },
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
      model.frequency = 1;
      model.reset();
      cancel();
      values = null;
      records.length = 0;
      rows.clear();
      rows.el.hidden = true;
      bar.undo('start', 'first', 'change', 'off');
      leave();
    }
    return {
      group: rig.group,
      pointer,
      toggles: ['steps'],
      size: { w: 0.44, d: 0.26, h: 0.53 },
      view: { elev: 14, azim: -4, margin: 1.12 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        rows = table(['组', '驱动 / Hz', 'A / Hz', 'B / Hz']);
        rows.el.hidden = true;
        ui.data.append(rows.el);
        ui.notes.append(
          note(
            '点左侧电源，沿圆弧拖转速旋钮，点右侧测周期。周期计在过渡衰减后，分别用驱动整圈及钩码同向通过平衡位置的事件测 3 个完整周期。记录中调速或断电会取消本次测量，旧记录仍保留。',
          ),
          buttons([
            { text: '电源', onClick: power },
            { text: '测周期', onClick: measure },
            { text: '近看周期计', onClick: inspect },
            { text: '全部重做', onClick: reset },
          ]).el,
          note(
            '两组钩码均为模型 50 g，弹簧刚度分别 8、4.5 N/m。偏心轮、导向横梁和光电周期计用于实现教材的周期驱动与频率测量；光电计为辅助器材。偏心距 3 mm，线性弹簧与黏性阻尼近似，不预测真实电机的电流、负载调速或传动损耗。',
          ),
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        model.advance(dt);
        rig.animate();
        if (capture?.waiting && model.settled()) {
          capture.waiting = false;
          model.clearReadings();
          guide();
        }
        if (capture && !capture.waiting) {
          const r = [0, 1, 2].map((i) => model.reading(i));
          if (r.every(Boolean)) {
            values = r.map((q) => q.frequency);
            records.push(values);
            rows?.add([String(records.length), ...values.map((v) => v.toFixed(2))]);
            if (rows) rows.el.hidden = false;
            capture = null;
            bar.done('first');
            if (records.some((v) => Math.abs(v[0] - values[0]) >= 0.25)) bar.done('change');
            guide();
            if (records.length > 1 && !bar.has('change'))
              bar.say('本次已记录，但驱动频率与已有组相差不足 0.25 Hz。再多转动一点旋钮，至少改变 15 转/分后复测。');
          }
        }
        if (!model.powered && bar.has('change') && !bar.has('off') && model.time - model.lastChange > 1.5) {
          const s = model.observe();
          if (s.frequency < 0.01 && s.bodies.every((b) => Math.abs(b.q - s.base) < 0.0003 && Math.abs(b.v) < 0.001)) {
            bar.done('off');
            guide();
            if (records.length > 1 && !bar.has('change'))
              bar.say('本次已记录，但驱动频率与已有组相差不足 0.25 Hz。再多转动一点旋钮，至少改变 15 转/分后复测。');
          }
        }
        drawClock += dt;
        if (drawClock > 0.1) {
          drawClock = 0;
          rig.draw(
            capture
              ? capture.waiting
                ? '等待过渡结束'
                : `完整周期：${model.crossings.map((a) => Math.min(3, Math.max(0, a.length - 1)) + '/3').join('   ')}`
              : values
                ? '已保存的测量'
                : model.powered
                  ? '点右侧键测周期'
                  : '电源断开',
            values,
            records.length,
          );
        }
      },
      dispose() {
        pointer.dispose();
        bar.dispose();
        rig.dispose();
      },
    };
  },
};
