import { RopeWave } from './kit/ropeWave.js';
import { ropeWaveRig, ROPE_Y, ROPE_SCALE, MARKER_INDEX } from './kit/ropeWaveRig.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { note, buttons, table } from './kit/ui.js';
export default {
  id: 'ropewave',
  fig: '图3.1-1',
  title: '观察绳波的产生和传播',
  stampText: '实验',
  predict: {
    q: '凸起沿绳向前传播，绳上的红色标记也会跟着走吗？',
    options: ['不会，它在原位置附近上下运动', '会，一直跟着波峰', '只跟着凹下部分'],
    answer: 0,
    hint: '同时看凸起的传播和红标记后方的固定参考线。',
  },
  conclusion: {
    quote: '绳子上的各点只是在一定位置上下振动，没有向前运动，而振动这种形式却传播出去了。',
    why: '握柄带动邻近绳段，邻近绳段再带动后面的绳段。红标记始终属于同一段绳，波形却会经过它向前传播。右端固定，因此到达后还会产生反射，不能把返波当作红点随波移动。',
    src: '人教版高中物理选择性必修第一册第62–63页 · 图3.1-1',
  },
  create(ctx) {
    const model = new RopeWave(),
      rig = ropeWaveRig(model),
      records = [];
    let ui,
      rows,
      rate = 0.1,
      near = false,
      episode = null,
      train = [],
      lastSign = 0,
      redUp = false,
      redDown = false,
      held = false;
    const bar = lessonBar({
      ...ctx,
      group: rig.group,
      back: leave,
      steps: [
        { id: 'up', title: '上抖一次', todo: '握左端圆柄向上拖，再回到支杆的红色中线。', target: () => rig.handle },
        { id: 'down', title: '下抖一次', todo: '握柄向下拖，再回到中线，看凹下部分的传播。', target: () => rig.handle },
        {
          id: 'train',
          title: '连续抖动',
          todo: '连续上下往返两次，再回到中线，观察一列波。',
          target: () => rig.handle,
        },
        {
          id: 'marker',
          title: '看红标记',
          todo: '观察红标记相对固定参考线的运动，再点原红标记确认。',
          target: () => rig.marker,
        },
      ],
    });
    const say = (text) => bar.say(`${rate === 1 ? '实速' : '0.1×慢放'}。${text}`);
    const enter = () => {
      if (document.body.classList.contains('predicting')) ui?.go(1);
    };
    function guide() {
      if (bar.finished) return say('红点仍在原处上下动。可继续抖绳，注意固定端的返波。');
      if (bar.current === 'up') return say('上拉左端圆柄，再拖回红色中线，看凸起向右传。');
      if (bar.current === 'down') return say('这次下拉圆柄，再回中线，看凹下部分向右传。');
      if (bar.current === 'train') return say('圆柄连续上下往返两次，再回中线，看凹凸相间的波列。');
      say('看红标记相对固定参考线的运动，再点它确认。');
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
      ctx.look([-0.18, 0.22, 0], [0, 0.3, 1], ctx.camera.aspect < 1 ? 0.44 : 0.48, leave);
      say('仍是原绳的红标记。比较固定参考线，再返回全景继续抖绳。');
    }
    function mark() {
      enter();
      if (!bar.has('train')) return say('先用握柄完成上下抖动；只点标记不会产生波。');
      if (!redUp || !redDown) return say('再上下抖动，让波经过红标记；观察它分别高于、低于原位置后再确认。');
      bar.done('marker');
      guide();
    }
    function setRate(r) {
      rate = r;
      episode = null;
      train = [];
      lastSign = 0;
      guide();
    }
    const desk = draggable(
      rig.group,
      [
        {
          obj: rig.handle,
          anchor: rig.handle,
          plane: 'xy',
          keepOffset: true,
          hint: '握圆柄上下拖，回到红色中线',
          onStart() {
            enter();
            held = true;
          },
          onDrag(p) {
            model.setHand(clamp((p.y - ROPE_Y) / ROPE_SCALE, -0.18, 0.18));
          },
          onEnd() {
            held = false;
            if (Math.abs(model.target) < 0.04) model.setHand(0);
            if (Math.abs(model.target) > 0.025)
              say('握柄停在当前位置。请把它拖回支杆的红色中线，完成这次抖动；远离中线松手时不会自动回中。');
            else guide();
          },
        },
      ],
      { highlight: true, taps: [{ obj: rig.marker, hint: '确认红标记在原位置附近上下运动', onTap: mark }] },
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
      episode = null;
      train = [];
      lastSign = 0;
      redUp = redDown = held = false;
      rate = 0.1;
      records.length = 0;
      rows.clear();
      rows.el.hidden = true;
      bar.undo('up', 'down', 'train', 'marker');
      rig.animate();
      leave();
    }
    function readMovement() {
      const y = model.y[0],
        sign = y > 0.06 ? 1 : y < -0.06 ? -1 : 0;
      if (!episode && Math.abs(y) > 0.025) episode = { max: y, min: y };
      if (episode) {
        episode.max = Math.max(episode.max, y);
        episode.min = Math.min(episode.min, y);
        if (Math.abs(y) < 0.015 && Math.abs(model.target) < 0.02) {
          const e = episode;
          episode = null;
          lastSign = 0;
          if (e.max > 0.06) bar.done('up');
          if (e.min < -0.06) bar.done('down');
          if (train.length >= 4 && model.time - train.at(-1).time < 0.16) bar.done('train');
          if (e.max > 0.06 || e.min < -0.06) {
            records.push(e);
            rows?.add([
              String(records.length),
              e.max > 0.06 && e.min < -0.06 ? '上下往返' : e.max > 0.06 ? '向上后回中' : '向下后回中',
            ]);
            if (rows) rows.el.hidden = false;
            if (!held) guide();
          }
        }
      }
      if (sign && sign !== lastSign) {
        if (train.length && model.time - train.at(-1).time > 0.16) train = [];
        if (!train.length || train.at(-1).sign !== sign) train.push({ sign, time: model.time });
        if (train.length > 4) train.shift();
        lastSign = sign;
      }
      if (model.y[MARKER_INDEX] > 0.02) redUp = true;
      if (model.y[MARKER_INDEX] < -0.02) redDown = true;
    }
    return {
      group: rig.group,
      pointer,
      toggles: ['steps'],
      size: { w: 0.9, d: 0.23, h: 0.33 },
      view: { elev: 24, azim: -4, margin: 1.08 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        rows = table(['次', '握柄实际动作']);
        rows.el.hidden = true;
        ui.data.append(rows.el);
        ui.notes.append(
          note(
            '左端握柄代替手握绳端，可沿支杆上下拖动；远离中线松手会保持所在高度，中线附近有回中定位。每次抖动需要主动回到红色中线。先看波向右传播，再看红标记相对固定参考线的运动。远端固定，后来出现的返波是反射。',
          ),
          buttons([
            { text: '0.1×慢放', onClick: () => setRate(0.1) },
            { text: '实速', onClick: () => setRate(1) },
            { text: '近看红标记', onClick: inspect },
            { text: '全部重做', onClick: reset },
          ]).el,
          note(
            '默认 0.1× 慢放，物理时间按画面时间的十分之一推进，绳的参数不变。模型绳长 4 m、张力 16 N、线密度 0.04 kg/m，波速 20 m/s；采用小斜率近似，保留静态下垂和阻尼。装置缩尺显示，绳粗与红标记为便于观察放大，不能据屏幕尺寸估实际波速。',
          ),
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        let remaining = dt * rate;
        while (remaining > 0) {
          const h = Math.min(0.002, remaining);
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
