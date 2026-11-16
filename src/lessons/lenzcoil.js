// 选择性必修二图 2.1-1，四次实际磁通变化分别留下观察记录。
import { lenzRig, COIL_X } from './kit/lenzRig.js';
import { fluxLinkage, inductionStep } from './kit/inductionCoil.js';
import { clamp, draggable } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { buttons, h, note, table } from './kit/ui.js';

const UP = 0.115,
  DOWN = 0.009;
export default {
  id: 'lenzcoil',
  fig: '图2.1-1',
  title: '探究影响感应电流方向的因素',
  stampText: '探究',
  predict: {
    q: '把 N 极向下插入线圈后保持不动，电流计的指针会怎样？',
    options: ['偏转后回到零位', '一直向右偏', '一直向左偏'],
    answer: 0,
    hint: '比较移动和静止时线圈中的磁通量。',
  },
  conclusion: {
    quote: '感应电流的磁场阻碍引起感应电流的磁通量的变化。',
    why: '磁通量增加时，感应电流产生的磁场与原磁场方向相反；磁通量减小时，两者方向相同。同一磁极插入和抽出时，俯视线圈的电流方向相反。',
    src: '人教版高中物理选择性必修第二册第 24–26 页',
  },
  create(ctx) {
    const rig = lenzRig(),
      { group, carrier, pivot, plug } = rig;
    let bottom,
      rotation,
      north,
      closed,
      flux,
      current,
      needle,
      pending,
      aim,
      ui,
      rows,
      question,
      currentChoices,
      fieldChoices,
      lawForm;
    let startHeight,
      gesture,
      peak,
      strokeSign,
      near = false,
      flip = null;
    const seen = new Set();
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'open', title: '试开路', todo: '先在线圈开路时移动磁体，再接上红导线。', target: () => aim },
        { id: 'n', title: '观察 N 极', todo: '观察 N 极插入和抽出时的电流方向。', target: () => aim },
        { id: 's', title: '观察 S 极', todo: '翻转磁体，再做插入和抽出。', target: () => aim },
        { id: 'law', title: '比较磁场', todo: '根据四组证据比较两个磁场的方向。', target: () => aim },
      ],
    });
    let openStroke = false;
    const say = (text, item) => {
      aim = item;
      bar.say(text);
    };
    function leave() {
      ctx.back();
      near = false;
      bar.near(false);
      guide();
    }
    function guide() {
      if (bar.finished) return say('四种情况已记录。翻看笔记本，对照插入和抽出时两个磁场的方向。');
      if (!openStroke && closed) return say('拔下红插头，再移动磁体，观察开路时表针会怎样。', plug);
      if (!openStroke) return say('红线还在桌上。上下拖磁体穿过线圈口，同时看电流计是否偏转。', carrier);
      if (!closed) return say('把桌上的红插头拖到电流计红接线柱，闭合回路。', plug);
      if (pending)
        return say(
          pending.pole + ' 极' + pending.motion + '时的偏转已观察。展开笔记本，按表针方向判断俯视线圈的电流。',
        );
      if (seen.size === 4) return say('比较四行记录，在笔记本判断感应电流的磁场起什么作用。');
      const pole = north ? 'N' : 'S';
      if (seen.has(pole + '插入') && seen.has(pole + '抽出')) {
        if (bottom < 0.093) return say('先向上拖，把磁体完全抽出线圈。', carrier);
        return say('按住磁体一端横向拖，让它绕滑架横轴翻转。', carrier);
      }
      if (bottom < 0.052) return say('向上抽出磁体，同时观察表针偏向哪边；停住再看。', carrier);
      return say('向下拖磁体，插入线圈，同时观察表针偏向哪边；停住再看。', carrier);
    }
    function reset() {
      if (near) leave();
      bottom = UP;
      north = true;
      rotation = -Math.PI / 2;
      closed = false;
      openStroke = false;
      pending = null;
      flip = null;
      gesture = null;
      needle = current = peak = 0;
      flux = fluxLinkage(bottom, north);
      pivot.rotation.z = 0;
      rig.pose(bottom, rotation);
      rig.connect(false);
      seen.clear();
      rows?.clear();
      if (question) question.hidden = true;
      if (lawForm) lawForm.hidden = true;
      bar.undo('open', 'n', 's', 'law');
      guide();
    }
    function observe() {
      if (!gesture || gesture === 'flip') return;
      if (Math.abs(bottom - startHeight) < 0.026) return guide();
      if (!closed) {
        openStroke = true;
        guide();
        return;
      }
      if (peak < 0.028) {
        say('指针偏转太小。让磁极靠近线圈口，连贯地插入或抽出。', carrier);
        return;
      }
      const pole = north ? 'N' : 'S',
        motion = bottom < startHeight ? '插入' : '抽出';
      if (seen.has(pole + motion)) {
        guide();
        return;
      }
      const sign = (north ? 1 : -1) * (motion === '插入' ? 1 : -1);
      if (strokeSign !== sign) {
        say('刚才中途改变了方向，沿一个方向拖一次再记录。', carrier);
        return;
      }
      pending = { pole, motion, sign };
      currentChoices.hidden = false;
      fieldChoices.hidden = true;
      question.hidden = false;
      question.querySelector('b').textContent = pole + ' 极' + motion + '。俯视线圈，电流是哪个方向？';
      guide();
    }
    function readCurrent(sign) {
      if (!pending) return;
      if (pending.sign !== sign) return say('红柱进电流时指针右偏。沿红线追到线圈上端，再看绕线方向。');
      pending.read = true;
      currentChoices.hidden = true;
      fieldChoices.hidden = false;
      question.querySelector('b').textContent =
        (sign > 0 ? '俯视逆时针' : '俯视顺时针') + '。用右手判断感应电流的磁场方向。';
      say('四指沿绕线的电流方向弯曲，看拇指指向哪一端。');
    }
    function readField(sign) {
      if (!pending?.read) return;
      if (pending.sign !== sign) return say('从线圈上方向下看，四指沿电流弯曲，拇指指向线圈内部的磁场方向。');
      const { pole, motion } = pending;
      rows.add([
        pole,
        motion,
        pole === 'N' ? '向下' : '向上',
        sign > 0 ? '右' : '左',
        sign > 0 ? '逆时针' : '顺时针',
        sign > 0 ? '向上' : '向下',
      ]);
      seen.add(pole + motion);
      pending = null;
      question.hidden = true;
      if (seen.has(pole + '插入') && seen.has(pole + '抽出')) bar.done(pole.toLowerCase());
      if (seen.size === 4) lawForm.hidden = false;
      guide();
    }
    const manip = draggable(
      group,
      [
        {
          obj: carrier,
          plane: 'xy',
          offset: 0,
          enabled: () => !flip && !bar.finished,
          hint: '上下拖磁体；完全抽出后可横拖翻转',
          onStart() {
            startHeight = bottom;
            gesture = null;
            peak = 0;
            strokeSign = 0;
          },
          onDrag(p, start) {
            if (!start || flip) return;
            const dx = p.x - start.x,
              dy = p.y - start.y;
            if (!gesture) {
              if (Math.max(Math.abs(dx), Math.abs(dy)) < 0.002) return;
              gesture = Math.abs(dx) > Math.abs(dy) ? 'flip' : 'slide';
            }
            if (gesture === 'flip') {
              if (bottom < 0.093) {
                say('磁体还在线圈附近。先完全抽出，再翻转。', carrier);
                return;
              }
              if (Math.abs(dx) >= 0.025) {
                flip = { from: rotation, to: rotation + (dx > 0 ? Math.PI : -Math.PI), t: 0 };
                gesture = 'turning';
              }
              return;
            }
            if (gesture === 'turning') return;
            bottom = clamp(startHeight + dy, DOWN, UP);
            rig.pose(bottom, rotation);
          },
          onEnd() {
            if (gesture === 'slide') observe();
            gesture = null;
          },
        },
        {
          obj: plug,
          plane: 'xz',
          offset: 0.01,
          keepOffset: true,
          hint: () => (closed ? '拖下红插头使回路断开' : '将红插头拖到红接线柱'),
          onDrag(p) {
            closed = false;
            current = 0;
            rig.connect(false, [clamp(p.x, 0.052, 0.15), 0.007, clamp(p.z, 0.01, 0.078)]);
          },
          onEnd(moved) {
            if (!moved) return guide();
            const connect = Math.hypot(plug.position.x - rig.plus[0], plug.position.z - rig.plus[2]) < 0.015;
            closed = connect;
            current = 0;
            rig.connect(closed, [plug.position.x, 0.002, plug.position.z]);
            if (closed && openStroke) bar.done('open');
            guide();
          },
        },
      ],
      {
        highlight: true,
        taps: [
          {
            obj: rig.meter,
            hint: '近看磁体和表针',
            onTap() {
              if (near) return leave();
              near = true;
              bar.near(true);
              ctx.look([0.004, 0.076, 0], [0.06, 0.27, 1], 0.47, leave);
              guide();
            },
          },
        ],
      },
    );
    reset();
    return {
      group,
      size: { w: 0.34, d: 0.19, h: 0.24 },
      view: { azim: 3, elev: 24, margin: 1.1 },
      toggles: ['steps'],
      pointer: manip,
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        rows = table(['下端', '运动', '原磁场', '表针', '俯视电流', '感应磁场']);
        currentChoices = buttons([
          { text: '逆时针', onClick: () => readCurrent(1) },
          { text: '顺时针', onClick: () => readCurrent(-1) },
        ]).el;
        fieldChoices = buttons([
          { text: '向上', onClick: () => readField(1) },
          { text: '向下', onClick: () => readField(-1) },
        ]).el;
        question = h('div', {}, h('b', {}), currentChoices, fieldChoices);
        lawForm = h(
          'div',
          {},
          note('结合四次记录，感应电流的磁场总是怎样？'),
          buttons([
            { text: '与原磁场反向', onClick: () => say('再看抽出两行，此时两个磁场同向。') },
            {
              text: '阻碍原磁通量的变化',
              onClick: () => {
                if (seen.size === 4) {
                  bar.done('law');
                  lawForm.hidden = true;
                  guide();
                }
              },
            },
          ]).el,
        );
        lawForm.hidden = question.hidden = true;
        panel.data.append(rows.el, question, lawForm);
        panel.notes.append(
          note(
            '这只零中表从红柱进电流时指针右偏。红线连线圈上端；从下端沿绕组走向上端，俯视为逆时针。可点表身近看，或旋转视角查看绕线。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        if (dt <= 0) return;
        if (flip) {
          flip.t = Math.min(1, flip.t + dt / 0.42);
          const t = flip.t * flip.t * (3 - 2 * flip.t);
          rotation = flip.from + (flip.to - flip.from) * t;
          rig.pose(bottom, rotation);
          if (flip.t === 1) {
            north = !north;
            flip = null;
            guide();
          }
        }
        // 翻转只在远端进行，轴向磁矩分量连续反号。
        const linked = fluxLinkage(bottom, true) * -Math.sin(rotation);
        const state = inductionStep(flux, linked, dt, closed, current);
        flux = linked;
        current = state.current;
        const target = clamp(current / 0.00024, -1, 1);
        needle += (target - needle) * -Math.expm1(-dt / 0.085);
        pivot.rotation.z = -needle * 0.7;
        if (gesture === 'slide' && Math.abs(needle) > peak) {
          peak = Math.abs(needle);
          strokeSign = Math.sign(needle);
        }
      },
      dispose() {
        manip.dispose();
        bar.dispose();
      },
    };
  },
};
