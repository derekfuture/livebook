import { StaticInduction } from './kit/staticInduction.js';
import { staticInductionRig } from './kit/staticInductionRig.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { note, buttons, table, seg } from './kit/ui.js';
export default {
  id: 'staticinduction',
  fig: '图9.1-3',
  title: '观察静电感应',
  stampText: '观察',
  predict: {
    q: '带电体没有碰到导体。分开两导体后移走它，两导体还会带电吗？',
    options: ['要看先分开还是先移走', '不会，没有接触', '一定会'],
    answer: 0,
    hint: '试着交换这两个动作的先后。',
  },
  conclusion: {
    page: 8, rect: [216.5, 468.1, 531.42, 531.21],
    quote: '静电感应过程中导体中的自由电荷只是从导体的一部分转移到另一部分。也就是说，无论是摩擦起电还是感应起电都没有创造电荷，只是电荷的分布发生了变化。',
    why: '正带电体靠近时，电子趋向近端。先分开两导体，再移远带电体，各自保留异号净电荷；先移远再分开，则不能用这个过程留下明显的净电荷。重新接触后电荷重新分布。箔片张开本身不能判断电荷正负。',
    src: '课本第 4 页 · 第九章 第1节 电荷',
  },
  create(ctx) {
    const model = new StaticInduction(),
      rig = staticInductionRig();
    model.setSource(-0.28, 0.19);
    let ui,
      signControl,
      rows,
      showSigns = false,
      near = false,
      splitCharge = false,
      reverseNear = false,
      reverseAway = false,
      dragStart = null;
    const bar = lessonBar({
      ...ctx,
      group: rig.group,
      back: leave,
      steps: [
        {
          id: 'near',
          title: '靠近',
          todo: '拖 C 的绝缘柄，让带正电的球靠近 A，观察两片金属箔。',
          target: () => rig.source,
        },
        {
          id: 'split',
          title: '分开导体',
          todo: 'C 留在近处，握 B 的绝缘柱向右拖，分开 A、B。',
          target: () => rig.conductors[1].handle,
        },
        {
          id: 'away',
          title: '移远 C',
          todo: '保持 A、B 分开，将 C 拖回前方“放远处”，观察金属箔。',
          target: () => rig.source,
        },
        {
          id: 'join',
          title: '重新接触',
          todo: '握绝缘柱，让 A、B 的金属端面重新接触。',
          target: () => rig.conductors[1].handle,
        },
        {
          id: 'compare',
          title: '交换顺序',
          todo: '再靠近 C；这次先移远 C，再分开 A、B，比较结果。',
          target: () => (reverseAway ? rig.conductors[1].handle : rig.source),
        },
      ],
    });
    const close = () => Math.hypot(model.source[0] - (model.centers[0] - 0.055), model.source[1]) < 0.075;
    const far = () => Math.hypot(model.source[0] - (model.centers[0] - 0.055), model.source[1]) > 0.23;
    const enter = () => {
      if (document.body.classList.contains('predicting')) ui?.go(1);
    };
    function guide() {
      if (bar.finished)
        return bar.say('两种顺序已比较。两片箔都张开，不代表两导体带同种电荷；可在笔记本打开净电荷示意。');
      if (bar.current === 'near' && !model.connected)
        return bar.say('先握绝缘柱，让 A、B 金属端面接触，再把 C 靠近 A。');
      if (bar.current === 'split' && !model.connected)
        return bar.say('这次分开时 C 不够近。先让 A、B 重新接触，把 C 靠近，再分开。');
      if (bar.current === 'away' && model.connected)
        return bar.say('A、B 现在仍接触。保持 C 在近处，先握绝缘柱把它们分开。');
      if (bar.current === 'near') return bar.say('握 C 左侧的绝缘柄，把正带电球拖到 A 左端附近；不用碰到金属。');
      if (bar.current === 'split')
        return bar.say(close() ? '保持 C 在近处，握 B 的绝缘柱向右分开。' : '先把 C 移回 A 近处，再分开 A、B。');
      if (bar.current === 'away')
        return bar.say(
          splitCharge
            ? 'A、B 已分开。把 C 拖回前方“放远处”，留意箔片是否合拢。'
            : '先让 A、B 接触，保持 C 在近处再分开；刚才的操作没有留下足够净电荷。',
        );
      if (bar.current === 'join') return bar.say('C 留在远处。握 B 的绝缘柱向左拖，使金属端面接触，观察箔片。');
      if (!model.connected) return bar.say('先让 A、B 重新接触，再靠近 C；这次保持接触，先移远 C，最后才分开。');
      return bar.say(
        reverseAway
          ? '这次已先移远 C。再握绝缘柱分开 A、B，与上一次比较。'
          : reverseNear
            ? '保持两导体接触，先把 C 移到远处。'
            : '两导体接触时，再把 C 靠近 A；随后先移远 C，再分开导体。',
      );
    }
    function record(action) {
      if (!rows) return;
      const state = model.net.map((q) =>
        Math.abs(q) < 0.015 ? '净电荷接近零' : q < 0 ? '净负（示意）' : '净正（示意）',
      );
      rows.add([action, model.connected ? '接触' : '分开', far() ? '远处' : close() ? '近处' : '移动中', ...state]);
      rows.el.hidden = false;
    }
    function sourceChanged() {
      if (model.connected && close()) {
        bar.done('near');
        if (bar.has('join')) reverseNear = true;
      }
      if (!model.connected && splitCharge && far() && bar.has('split')) bar.done('away');
      if (model.connected && reverseNear && far()) reverseAway = true;
      guide();
    }
    function conductorChanged(wasConnected) {
      if (!model.connected && wasConnected) {
        splitCharge = close() && Math.min(...model.net.map(Math.abs)) > 0.02;
        if (splitCharge && bar.has('near')) bar.done('split');
        if (reverseAway && far() && Math.max(...model.net.map(Math.abs)) < 0.015) bar.done('compare');
      }
      if (model.connected && bar.has('away') && far()) bar.done('join');
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
      ctx.look([0.015, 0.085, 0.015], [0, 0.48, 1], ctx.camera.aspect < 1 ? 0.65 : 0.72, leave);
    }
    const pointer = draggable(
      rig.group,
      [
        {
          obj: rig.source,
          anchor: rig.source,
          plane: 'xz',
          offset: 0.13,
          keepOffset: true,
          hint: '握绝缘柄拖动 C：靠近或移远，不接触金属',
          onStart: enter,
          onDrag(p) {
            const x = clamp(p.x, -0.31, model.centers[0] - 0.085),
              z = clamp(p.z, 0, 0.22);
            model.setSource(x, z);
            sourceChanged();
          },
          onEnd() {
            record('移动 C');
          },
        },
        ...rig.conductors.map((p, i) => ({
          obj: p.handle,
          anchor: p.group,
          plane: 'xz',
          offset: 0.06,
          keepOffset: true,
          hint: '握绝缘柱左右拖动，分开或接触金属导体',
          onStart() {
            enter();
            dragStart = { x: model.centers[i], connected: model.connected };
          },
          onDrag(v) {
            const x = i
              ? clamp(v.x, model.centers[0] + 0.11, 0.23)
              : clamp(
                  v.x,
                  model.source[1] < 0.03 ? Math.max(-0.1, model.source[0] + 0.085) : -0.1,
                  model.centers[1] - 0.11,
                );
            if (Math.abs(x - model.centers[i]) < 1e-5) return;
            const was = model.connected;
            if (was) model.separate();
            model.move(i, x);
            if (Math.abs(model.centers[1] - model.centers[0] - 0.11) < 0.001) {
              model.move(i, i ? model.centers[0] + 0.11 : model.centers[1] - 0.11);
              model.join();
            }
            conductorChanged(was);
          },
          onEnd() {
            if (dragStart && Math.abs(dragStart.x - model.centers[i]) > 0.001) record('移动 ' + (i ? 'B' : 'A'));
            dragStart = null;
          },
        })),
      ],
      {
        highlight: true,
        taps: [
          { obj: rig.conductors[0].body, hint: '近看原来的两片金属箔', onTap: inspect },
          { obj: rig.conductors[1].body, hint: '近看原来的两片金属箔', onTap: inspect },
        ],
      },
    );
    function reset() {
      model.reset();
      model.setSource(-0.28, 0.19);
      splitCharge = reverseNear = reverseAway = false;
      showSigns = false;
      signControl?.set(0);
      rig.conductors.forEach((p) => (p.angle = 0));
      bar.undo('near', 'split', 'away', 'join', 'compare');
      rows.clear();
      rows.el.hidden = true;
      leave();
    }
    rig.draw(model, 1);
    return {
      group: rig.group,
      pointer,
      toggles: ['steps'],
      size: { w: 0.69, d: 0.38, h: 0.19 },
      view: { elev: 24, azim: 0, margin: 1.1 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        rows = table(['操作', 'A/B', 'C位置', 'A', 'B']);
        rows.el.hidden = true;
        ui.data.append(rows.el);
        ui.notes.append(
          note(
            '带电体 C 已预先带正电，A、B 由绝缘柱支持。拖 C 的柄移动带电球；拖支柱分开或接触导体，点金属柱可近看箔片。',
          ),
          (signControl = seg('辅助示意', ['隐藏', '净电荷'], (_, i) => {
            showSigns = !!i;
          })).el,
          buttons([
            { text: '近看箔片', onClick: inspect },
            { text: '全部重做', onClick: reset },
          ]).el,
          note(
            '电荷符号不可直接看见，记录中的正负是模型辅助。导体采用离散等势近似；箔片张角为定性放大，不是电荷量读数。带电体在远处仍有微弱影响，“接近零”不等于严格为零。',
          ),
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        rig.draw(model, dt, showSigns);
      },
      dispose() {
        pointer.dispose();
        bar.dispose();
        rig.dispose();
      },
    };
  },
};
