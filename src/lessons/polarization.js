import { PolarizationBench, POLAR } from './kit/polarization.js';
import { polarizationRig, PZ, QZ } from './kit/polarizationRig.js';
import { draggable } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { note, buttons } from './kit/ui.js';
export default {
  id: 'polarization',
  fig: '图4.6-3',
  title: '观察光的偏振',
  stampText: '观察',
  predict: {
    q: '只转动一片偏振片，与转动两片中的后一片，明暗变化相同吗？',
    options: ['不同，两片时会随相对方向改变', '相同，转动都会忽明忽暗', '都不改变明暗'],
    answer: 0,
  },
  conclusion: {
    page: 114, rect: [216.48, 138.42, 537.49, 329.19],
    quote: '自然光在通过偏振片P时，只有振动方向与偏振片的透振方向一致的光波才能顺利通过。也就是说，通过偏振片P 的光波，在垂直于传播方向的平面上，沿着某个特定的方向振动。这种光叫作偏振光（polarized light）。通过偏振片P的偏振光照射到偏振片Q时，如果两个偏振片的透振方向平行，那么，通过P 的偏振光的振动方向与偏振片Q的透振方向一致，可以透过Q（图4.6-3乙）；如果两个偏振片的透振方向垂直，那么，偏振光的振动方向跟偏振片Q 的透振方向垂直，不能透过Q（图4.6-3丙）。',
    why: '转动单片，透射光强不随方向变化；两片透振方向平行时较亮，垂直时最暗。这里的明暗取决于两片的相对方向，而不是某一片在桌面上的绝对方向。',
    src: '课本第 110 页 · 第四章 第6节 光的偏振 激光',
  },
  create(ctx) {
    const model = new PolarizationBench(),
      rig = polarizationRig(model),
      { group } = rig;
    let ui,
      near = false,
      singleMin = 0,
      singleMax = 0,
      seenBright = false,
      darkAngle = 0,
      dragAngle = 0,
      dragStart = 0;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        {
          id: 'single',
          title: '转动单片',
          todo: '沿 P 的圆框拖动棕色柄，转约四分之一圈，再点后方光屏观察。',
          target: () => rig.p.handle,
        },
        {
          id: 'dark',
          title: '加入第二片',
          todo: '把 Q 的底座沿槽拖到光路中，转动 Q，从亮找到最暗，再点光屏。',
          target: () => (model.qx > 0.005 ? rig.q.base : rig.q.handle),
        },
        {
          id: 'bright',
          title: '转回较亮',
          todo: '继续转同一片 Q，让光斑重新变亮，再点光屏。',
          target: () => rig.q.handle,
        },
      ],
    });
    const inserted = () => model.qx <= 0.005;
    function guide() {
      if (bar.finished)
        return bar.say('单片旋转明暗不变；双片改变相对方向，透射光随之变亮或变暗。可继续移动、转动对照。');
      if (bar.current === 'single')
        return bar.say(
          model.qx < 0.085
            ? '先把 Q 底座拖回右端，只留 P 在光路中。'
            : singleMax - singleMin < Math.PI / 2 - 0.08
              ? '沿 P 圆框拖棕色柄，转约四分之一圈；再点后方光屏。'
              : 'P 已转过不同方向。看后方光斑，点光屏确认明暗没有变化。',
        );
      if (!inserted()) return bar.say('把 Q 的底座沿槽拖到左端，与 P 对齐。');
      if (bar.current === 'dark')
        return bar.say(
          seenBright
            ? '沿 Q 圆框转棕色柄，找到最暗位置，再点后方光屏。'
            : '先转 Q，让光斑亮起来；再继续转到最暗，点光屏。',
        );
      return bar.say('继续沿圆框转 Q，让原光斑重新变亮，再点光屏。');
    }
    function changed() {
      rig.draw();
      if (model.qx >= 0.085) {
        singleMin = Math.min(singleMin, model.p);
        singleMax = Math.max(singleMax, model.p);
      } else singleMin = singleMax = model.p;
      if (bar.has('single') && inserted() && model.mean() > 0.44) seenBright = true;
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
      ctx.look([0.025, 0.115, -0.015], [0.35, 0.42, 1], ctx.camera.aspect < 1 ? 0.51 : 0.65, leave);
      guide();
    }
    function observe() {
      const power = model.mean();
      if (bar.current === 'single') {
        if (model.qx < 0.085 || singleMax - singleMin < Math.PI / 2 - 0.08) return guide();
        bar.done('single');
      } else if (bar.current === 'dark') {
        if (!inserted()) return guide();
        if (!seenBright || power > 0.015) return bar.say('先看见较亮的光斑，再转 Q 找最暗；底座保持在左端。');
        darkAngle = model.q;
        bar.done('dark');
      } else if (bar.current === 'bright') {
        if (!inserted()) return guide();
        if (power < 0.44 || Math.abs(model.q - darkAngle) < 0.5)
          return bar.say('继续转 Q，找到较亮光斑；不要移走 Q 来代替转动。');
        bar.done('bright');
      }
      guide();
    }
    const rotation = (which, z) => ({
      obj: rig[which].handle,
      plane: 'xy',
      offset: z + 0.006,
      hint: `沿圆框拖动 ${which.toUpperCase()}`,
      onStart(p) {
        dragAngle = Math.atan2(p.y - POLAR.height, p.x - (which === 'q' ? model.qx : 0));
        dragStart = model[which];
      },
      onDrag(p) {
        const a = Math.atan2(p.y - POLAR.height, p.x - (which === 'q' ? model.qx : 0));
        const d = Math.atan2(Math.sin(a - dragAngle), Math.cos(a - dragAngle));
        model.setAngle(which, dragStart + d);
        dragStart = model[which];
        dragAngle = a;
        changed();
      },
    });
    const pointer = draggable(
      group,
      [
        rotation('p', PZ),
        rotation('q', QZ),
        {
          obj: rig.q.base,
          plane: 'xz',
          offset: 0.012,
          keepOffset: true,
          hint: '沿槽移动第二片 Q',
          onDrag(p) {
            model.moveQ(p.x);
            changed();
          },
          onEnd() {
            if (model.qx < 0.008) model.moveQ(0);
            if (model.qx > POLAR.park - 0.008) model.moveQ(POLAR.park);
            changed();
          },
        },
        { obj: rig.screen, onTap: observe, hint: '观察原光屏，确认明暗' },
      ],
      { highlight: true },
    );
    function reset() {
      if (near) leave();
      model.reset();
      singleMin = singleMax = darkAngle = 0;
      seenBright = false;
      bar.undo('single', 'dark', 'bright');
      changed();
    }
    return {
      group,
      size: { w: 0.39, d: 0.47, h: 0.23 },
      view: { elev: 34, azim: 30, margin: 1.08 },
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
            'P 留在光路中。棕色柄沿圆框转动偏振片；Q 的底座沿槽平移，把同一片加入或移出光路。框上的两道短标记表示透振方向，薄片没有狭缝。观察后点原光屏留下记录。',
          ),
          buttons([
            { text: '近看原器材', onClick: inspect },
            { text: '全部重做', onClick: reset },
          ]).el,
          note(
            '光源为准直自然光，观察屏接收透射光。按理想线性偏振片计算，不含边缘衍射、斜入射效应；片框会遮光。暗处仍有环境光，因此屏幕不会变成纯黑。转约四分之一圈是单片对照的操作要求，不是偏振发生的门槛。',
          ),
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
      },
      dispose() {
        pointer.dispose();
        bar.dispose();
        rig.dispose();
      },
    };
  },
};
