import { LongitudinalSpring } from './kit/longitudinalSpring.js';
import { longitudinalSpringRig, LONGITUDINAL_SCALE, LONGITUDINAL_MARKER } from './kit/longitudinalSpringRig.js';
import { draggable } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { note, buttons, h } from './kit/ui.js';

export default {
  id: 'longitudinalwave',
  fig: '图3.1-4',
  title: '观察弹簧形成的波',
  stampText: '演示',
  predict: {
    q: '沿弹簧轴线推拉左端，传播到远处的是哪一个？',
    options: ['疏密变化', '左端的同一圈弹簧', '整根弹簧一起向右平移'],
    answer: 0,
  },
  conclusion: {
    crops: [
      { page: 68, rect: [216.5, 695.51, 537.55, 760.28] },
      { page: 69, rect: [63.66, 56.13, 378.58, 98.24] },
    ],
    quote: '在图3.1-4 所示的波中，质点左右振动，波向右传播，二者的方向在同一直线上。质点的振动方向与波的传播方向在同一直线上的波，叫作纵波（longitudinal wave）。',
    why: '手沿轴线带动近圈，近圈再带动远圈。疏密变化沿弹簧传播，红圈仍是原来那一圈，在一定位置附近往复。本装置右端自由，波到达后会反射；返波不是又生成了一根弹簧，也不是红圈随波迁移。',
    src: '课本第 64–65 页 · 第三章 第1节 波的形成',
  },
  create(ctx) {
    const model = new LongitudinalSpring(),
      rig = longitudinalSpringRig(model),
      { group } = rig;
    let ui, aim, report, motion, direction;
    let near = false,
      held = false,
      lastFrame = null;
    let swings = [],
      nearArrival = null,
      farArrival = null,
      compressed = false,
      sparse = false;
    let redSwings = [],
      nearSince = 0;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'drive', title: '推拉左端', todo: '沿轴线左右拖动左端的手，看疏密变化向右传。', target: () => aim },
        {
          id: 'marker',
          title: '观察红圈',
          todo: '点原红圈近看，继续推拉，比较它与固定红线的位置。',
          target: () => aim,
        },
        {
          id: 'compare',
          title: '比较方向',
          todo: '用笔记本记录红圈怎样运动，以及它与传播方向的关系。',
          target: () => aim,
        },
      ],
    });
    const say = (text, object = null) => {
      aim = object;
      bar.say(text);
    };
    const enter = () => {
      if (document.body.classList.contains('predicting')) ui?.go(1);
    };
    function guide() {
      if (bar.finished) return say('记录已保留。可继续推拉，观察自由末端的返波；红圈仍是原来的那一圈。');
      if (!bar.has('drive')) {
        if (swings.length >= 4 && (!compressed || !sparse))
          return say('已来回推拉。稍快一点，让密处和疏处依次向右传；不要只停在一边。', rig.hand);
        return say('抓左端的手，沿弹簧左右推拉两次，再停回绿色起点线；看密处、疏处向右传。', rig.hand);
      }
      if (!bar.has('marker')) {
        if (!near) return say('疏密变化已传到远处。点弹簧上的红圈近看，它就是原来那一圈。', rig.marker);
        return say('继续左右推拉左端的手；看红圈相对固定红线向两边运动。手停下时仍握住左端。', rig.hand);
      }
      say('已看到原红圈来回运动。展开笔记本，比较红圈运动和疏密变化的传播方向。');
    }
    function leave() {
      near = false;
      ctx.back();
      bar.near(false);
      guide();
    }
    function inspect() {
      enter();
      if (!near) {
        redSwings = [];
        nearSince = model.time;
      }
      near = true;
      bar.near(true);
      // Keep the original hand and marked turn together in view, so observing
      // the marker never strands the student away from the wave source.
      ctx.look([-0.18, rig.axisY, 0], [0, 0.7, 1], Math.max(0.68, 0.31 * ctx.camera.aspect), leave);
      guide();
    }
    const manip = draggable(
      group,
      [
        {
          obj: rig.hand,
          anchor: rig.hand,
          plane: 'xz',
          offset: rig.hand.position.y,
          keepOffset: true,
          onStart() {
            enter();
            held = true;
          },
          onDrag(p) {
            model.setHand((p.x - rig.left) / LONGITUDINAL_SCALE);
          },
          onEnd() {
            held = false;
            // Releasing the pointer stops moving the depicted hand; it still grips
            // the spring. No automatic snap to a new centre and no deletion of waves.
            model.setHand(model.q[0]);
            guide();
          },
        },
      ],
      { highlight: true, taps: [{ obj: rig.marker, onTap: inspect }] },
    );

    function readMotion() {
      const hand = model.q[0],
        sign = hand > 0.03 ? 1 : hand < -0.03 ? -1 : 0;
      if (sign && swings.at(-1) !== sign) {
        swings.push(sign);
        if (swings.length > 4) swings.shift();
      }
      const nearStrain = (model.q[17] - model.q[16]) / model.pitch;
      const farStrain = (model.q[57] - model.q[56]) / model.pitch;
      if (nearArrival === null && Math.abs(nearStrain) > 0.07) nearArrival = model.time;
      if (farArrival === null && Math.abs(farStrain) > 0.07) farArrival = model.time;
      if (farStrain < -0.07) compressed = true;
      if (farStrain > 0.07) sparse = true;
      if (
        !bar.has('drive') &&
        swings.length >= 4 &&
        compressed &&
        sparse &&
        nearArrival !== null &&
        farArrival > nearArrival + 0.1
      ) {
        bar.done('drive');
        if (!held) guide();
      }
      // Do not count a moment glimpsed during the camera move as an observation.
      // Three alternating sides describe one complete out-and-back, not a single crossing.
      if (near && model.time - nearSince > 0.8 && bar.has('drive') && !bar.has('marker')) {
        const q = (model.q[LONGITUDINAL_MARKER] + model.q[LONGITUDINAL_MARKER + 1]) / 2;
        const side = q < -0.006 ? -1 : q > 0.006 ? 1 : 0;
        if (side && side !== redSwings.at(-1)) redSwings.push(side);
        if (redSwings.length >= 3) {
          bar.done('marker');
          if (report) report.hidden = false;
          if (!held) guide();
        }
      }
    }
    function reset() {
      model.reset();
      swings = [];
      nearArrival = farArrival = null;
      compressed = sparse = held = false;
      redSwings = [];
      nearSince = 0;
      lastFrame = null;
      if (motion) motion.value = '';
      if (direction) direction.value = '';
      if (report) report.hidden = true;
      bar.undo('drive', 'marker', 'compare');
      rig.pose();
      if (near) leave();
      else guide();
    }
    return {
      group,
      pointer: manip,
      card: false,
      toggles: ['steps'],
      size: { w: 0.94, d: 0.24, h: 0.1 },
      view: { elev: 36, azim: 0, margin: 1.05 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        motion = h(
          'select',
          { 'aria-label': '红圈怎样运动' },
          h('option', { value: '' }, '红圈怎样运动？'),
          h('option', { value: 'oscillate' }, '沿弹簧轴线来回运动'),
          h('option', { value: 'travel' }, '一直随密处向右移动'),
          h('option', { value: 'still' }, '固定不动，只有其他圈运动'),
        );
        direction = h(
          'select',
          { 'aria-label': '振动与传播方向' },
          h('option', { value: '' }, '振动方向与传播方向有什么关系？'),
          h('option', { value: 'parallel' }, '在同一直线上'),
          h('option', { value: 'perpendicular' }, '相互垂直'),
        );
        for (const el of [motion, direction]) el.addEventListener('change', () => bar.undo('compare'));
        report = h(
          'div',
          {},
          note('依据刚才原弹簧的运动填写，不必测波速或换用其他器材。'),
          h('div', { class: 'read-row' }, motion),
          h('div', { class: 'read-row' }, direction),
          buttons([
            {
              text: '核对观察',
              onClick() {
                if (!bar.has('marker')) return guide();
                if (motion.value !== 'oscillate')
                  return say('再看原红圈和固定红线：密处向前传播，红圈会向两边来回运动。');
                if (direction.value !== 'parallel')
                  return say('红圈沿弹簧轴线运动，疏密变化也沿这条轴线传播；这与上下抖绳不同。');
                bar.done('compare');
                guide();
              },
            },
          ]).el,
        );
        report.hidden = true;
        ui.data.append(report);
        ui.notes.append(
          note(
            '拖的是始终握住左端的手。沿轴线来回拖动产生波；松开鼠标只是手停住，弹簧中已有的运动继续传播。点红圈近看时，左手仍留在画面内；用原返回钮回全景。',
          ),
          note(
            '红色只标记原来的一圈，台面红线固定。右端自由，没有隐形夹具，所以波会反射。两次往返用于充分观察，不是教材规定的计量要求。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
          note(
            '实速演示，统一缩尺。弹簧名义原长0.96m、质量0.12kg、整根轴向刚度0.075N/m；采用相邻轴向弹力、微弱阻尼与近密接的弹性接触近似，只模拟轴向运动。参数未作实物标定，不用画面估测真实器材的波速。',
          ),
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        const now = performance.now();
        let remaining = lastFrame === null ? 0 : Math.min(0.25, (now - lastFrame) / 1000);
        lastFrame = now;
        while (remaining > 1e-8) {
          const h = Math.min(0.004, remaining);
          model.advance(h);
          readMotion();
          remaining -= h;
        }
        rig.pose();
      },
      dispose() {
        manip.dispose();
        rig.dispose();
        bar.dispose();
      },
    };
  },
};
