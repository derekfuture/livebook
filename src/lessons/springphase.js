import { SpringPhase } from './kit/springPhase.js';
import { springPhaseRig, PHASE_BALL_Z } from './kit/springPhaseRig.js';
import { draggable } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { note, table, buttons, chart, h } from './kit/ui.js';

export default {
  id: 'springphase',
  fig: '图2.2-4',
  title: '观察两个小球的振动',
  stampText: '观察',
  predict: {
    q: '两只相同振子拉开相同距离，先后释放，什么可能改变？',
    options: ['振动的步调', '弹簧的刚度', '钢球的质量'],
    answer: 0,
  },
  conclusion: {
    page: 43, rect: [63.78, 125.77, 384.77, 188.88],
    quote: '上例中同时放开的两个小球振动步调总是一致，我们说它们的相位是相同的；而对于不同时放开的两个小球，我们说第二个小球的相位落后于第一个小球的相位。',
    why: '相同位置、同时释放时，两球同步过平衡位置、到达同侧端点。先后释放会改变相位关系，但不改变各自的固有周期；若恰好错开整数个周期，仍可同相。本装置有微弱阻尼，先释放的球会多衰减一段时间，不能因此说它的初始振幅不同。持球夹只是单鼠标操作辅助，张开后不再给球施加约束。',
    src: '课本第 39 页 · 第二章 第2节 简谐运动的描述',
  },
  create(ctx) {
    const model = new SpringPhase(),
      rig = springPhaseRig(model),
      { group } = rig;
    let ui,
      aim,
      near = false,
      startCarriage = 0,
      startQ = 0,
      capture = null,
      waitingFor = null,
      lastFrame = null;
    let log, plots, compare, whole, report;
    const records = [];
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'pull', title: '共同拉开', todo: '向下拖棕色共同握柄，把原两球一起拉离O线。', target: () => aim },
        { id: 'same', title: '同时释放', todo: '按中间蓝色钮，同时放开，观察两球的步调。', target: () => aim },
        { id: 'return', title: '原球回夹', todo: '把A、B原球分别拖回各自张开的夹口，松手夹住。', target: () => aim },
        { id: 'different', title: '先后释放', todo: '按A钮，等A第一次过O线时按B钮，再观察。', target: () => aim },
        { id: 'compare', title: '比较步调', todo: '在笔记本比较两次观察的周期、位置图与释放时差。', target: () => aim },
      ],
    });
    const say = (text, obj = null) => {
      aim = obj;
      bar.say(text);
    };
    const enter = () => {
      if (document.body.classList.contains('predicting')) ui?.go(1);
    };
    const names = ['A', 'B'];
    const bothHeld = () => model.clamped.every(Boolean);
    function guide() {
      if (capture) return say('两球都已放开。看它们是否同时过O线、同时到达同侧端点；连续观察约4秒，先不要碰球。');
      if (bar.has('same') && bar.has('different'))
        return say(
          bar.finished
            ? '两组原记录保留。可继续试不同释放间隔，包括错开整周期。'
            : '两种情况已观察。展开笔记本，用原位置图和过线周期记录比较步调。',
        );
      if (bothHeld()) {
        const q = model.bodies.map((b) => b.q);
        if (Math.min(...q) < 0.025)
          return say(
            near
              ? '向下拖中间棕色握柄，把两球拉开约一个半球直径，再松手。夹具会继续握住。'
              : '向下拖中间棕色握柄，把两球拉开约一个半球直径；点背景板可正视近看。',
            rig.handle,
          );
        if (Math.abs(q[0] - q[1]) > 0.002)
          return say('两球在夹中的高度略有不同。分别抓球对正夹口中心再松手，尽量拉开相同距离。', rig.balls[0]);
        bar.done('pull');
        if (bar.has('same')) {
          bar.done('return');
          return say('两球已回到原夹口。按左侧A钮，等A第一次经过O线时再按右侧B钮。', rig.buttons[0]);
        }
        return say('两球仍被夹住。按中间蓝色“同时放开”钮；松开共同握柄不会自动放球。', rig.releaseBoth);
      }
      const waiting = waitingFor;
      if (waiting !== null && model.clamped[waiting])
        return say(
          '只有' +
            names[1 - waiting] +
            '已释放。看它经过O线时，按' +
            names[waiting] +
            '钮放开另一球；不要按已放开的按钮。',
          rig.buttons[waiting],
        );
      const missing = model.clamped.findIndex((v) => !v);
      say(
        '抓住' + names[missing] + '原球，上下拖回对应的张开夹口，球心与两夹爪中点齐平，再松手。另一球保持原状。',
        rig.balls[missing],
      );
    }
    function leave() {
      near = false;
      ctx.back();
      bar.near(false);
      guide();
    }
    function inspect() {
      enter();
      near = true;
      bar.near(true);
      ctx.look([0, rig.equilibriumY, 0.015], [0, 0, 1], Math.max(0.78, (0.48 * innerWidth) / innerHeight), leave);
      guide();
    }
    function interrupt() {
      if (!capture) return;
      for (const b of model.bodies) b.stopRecording();
      finish('中途操作，观察未完成');
    }
    function startObservation() {
      if (model.bodies.some((b) => b.held) || model.releases.some((r) => !r)) return guide();
      const r = model.releases.map((v) => ({ ...v }));
      if (Math.min(...r.map((v) => v.q)) < 0.025) {
        say('这轮拉开得太少，或从O线上方释放。先把原两球拖回夹口，再下拉共同握柄重试。', rig.balls[0]);
        return;
      }
      for (const b of model.bodies) b.startRecording({ interval: 0.04, duration: 3.4 });
      capture = { start: model.time, releases: r };
      guide();
    }
    function release(index) {
      enter();
      const previouslyBoth = bothHeld();
      const changed = index === null ? model.openBoth() : model.clamped[index] && model.open(index);
      rig.pose();
      if (!changed) {
        say('这个夹口已经张开，按钮不会让球重新起动。要重做，抓原球回到夹口再松手。', rig.balls[index ?? 0]);
        return;
      }
      waitingFor = previouslyBoth && index !== null ? 1 - index : null;
      if (!near) inspect();
      startObservation();
    }
    function finish(interrupted = '') {
      if (!capture) return;
      const r = capture;
      capture = null;
      const c = model.comparison(),
        periods = [model.period(0), model.period(1)];
      const aligned = Math.abs(r.releases[0].q - r.releases[1].q) <= 0.002;
      const delay = r.releases[1].time - r.releases[0].time;
      let kind = interrupted
        ? 'interrupted'
        : !aligned
          ? 'unequal'
          : Math.abs(delay) < 0.001
            ? 'same'
            : Math.abs(c?.difference ?? 0) < 0.2
              ? 'whole'
              : Math.abs(c?.difference ?? 0) < 0.45
                ? 'small'
                : 'different';
      if (!interrupted && (!c || periods.some((v) => !v))) kind = 'interrupted';
      const rec = {
        ...r,
        delay,
        periods,
        kind,
        points: model.bodies.map((b) => b.samples.map((s) => [s.t, s.q * 100])),
      };
      records.push(rec);
      log.el.hidden = false;
      log.add([
        String(records.length),
        Math.abs(delay) < 0.001 ? '同时' : delay > 0 ? 'A先' : 'B先',
        Math.abs(delay).toFixed(3),
        ...periods.map((p) => (p ? p.period.toFixed(3) : '—')),
        interrupted || (kind === 'unequal' ? '释放高度不同' : '已观察'),
      ]);
      const plot = chart({
        x: { label: 't / s（两球均释放后）', min: 0, max: 3.4 },
        y: { label: 'x / cm（向下为正）', min: -6, max: 6 },
        height: 205,
        preserveAspect: true,
        series: [
          { color: '#397d90', points: rec.points[0] },
          { color: '#b8794a', points: rec.points[1], dash: true },
        ],
        legend: '第' + records.length + '轮：蓝实线A，棕虚线B。同一时刻采样，重合时两线叠在一起。',
      });
      plots.append(plot.el);
      if (kind === 'same') bar.done('same');
      if (kind === 'different' && bar.has('same') && bar.has('return')) {
        bar.done('different');
        if (report) report.hidden = false;
      }
      if (kind === 'whole')
        return say(
          '这次虽先后释放，两球又接近同相：释放间隔接近整周期。原记录保留；把两球回夹，下次在A第一次过O线时放B。',
          rig.balls[0],
        );
      if (kind === 'small')
        return say('这次相位差很小，不易看清。原记录保留；两球回夹，下次在A第一次过O线时放B。', rig.balls[0]);
      if (kind === 'unequal')
        return say('这次释放高度不同，不能作为同振幅对照。原记录保留，把两球分别放正原夹口，再释放。', rig.balls[0]);
      if (kind === 'different' && !bar.has('same'))
        return say('这轮先后释放的原记录已留下。还要比较同时释放：把两球回夹，再按中间蓝色钮。', rig.balls[0]);
      guide();
    }
    const manip = draggable(
      group,
      [
        {
          obj: rig.handle,
          plane: 'xy',
          offset: 0.07,
          onStart() {
            enter();
            if (model.clamped.some(Boolean)) interrupt();
            startCarriage = model.carriage;
          },
          onDrag(p, from) {
            if (!from) return;
            model.moveCarriage(startCarriage - (p.y - from.y));
            rig.pose();
          },
          onEnd() {
            guide();
          },
        },
        ...rig.balls.map((ball, i) => ({
          obj: ball,
          plane: 'xy',
          offset: PHASE_BALL_Z,
          onStart() {
            enter();
            interrupt();
            waitingFor = null;
            startQ = model.bodies[i].q;
            model.grab(i);
            rig.pose();
          },
          onDrag(p, from) {
            if (!from) return;
            model.move(i, startQ - (p.y - from.y));
            rig.pose();
            say('把' + names[i] + '球心放在原夹口两爪的中点，松手夹住；不会移动另一球。');
          },
          onEnd() {
            const caught = model.drop(i);
            rig.pose();
            if (!caught) return say(names[i] + '没有对正夹口，松手后仍自由振动。再抓住它，把球心对齐两爪中点。', ball);
            guide();
          },
        })),
      ],
      {
        highlight: true,
        taps: [
          { obj: rig.releaseBoth, onTap: () => release(null) },
          ...rig.buttons.map((obj, i) => ({ obj, onTap: () => release(i) })),
          { obj: rig.board, onTap: inspect },
        ],
      },
    );
    function reset() {
      document.querySelector('.chart-zoom')?.click();
      model.reset();
      capture = null;
      waitingFor = null;
      records.length = 0;
      lastFrame = null;
      rig.pose();
      log?.clear();
      if (log) log.el.hidden = true;
      plots?.replaceChildren();
      if (report) report.hidden = true;
      if (compare) compare.value = '';
      if (whole) whole.value = '';
      bar.undo('pull', 'same', 'return', 'different', 'compare');
      if (near) leave();
      else guide();
    }
    return {
      group,
      size: { w: 0.6, d: 0.24, h: 0.53 },
      card: false,
      view: { elev: 0, azim: 0, lookY: rig.equilibriumY / 0.53, margin: 1.08 },
      toggles: ['steps'],
      pointer: manip,
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        log = table(['轮', '释放顺序', '时差 / s', 'A周期 / s', 'B周期 / s', '记录']);
        log.el.hidden = true;
        plots = h('div', {});
        compare = h(
          'select',
          { 'aria-label': '周期与步调' },
          h('option', { value: '' }, '比较两轮观察'),
          h('option', { value: 'phase' }, '周期基本相同，步调可以不同'),
          h('option', { value: 'period' }, '先释放者周期变长'),
          h('option', { value: 'always' }, '周期相同就一定同步'),
        );
        whole = h(
          'select',
          { 'aria-label': '整周期延迟' },
          h('option', { value: '' }, '若相隔整周期释放'),
          h('option', { value: 'same' }, '仍可以同相'),
          h('option', { value: 'different' }, '一定不同相'),
        );
        for (const el of [compare, whole]) el.addEventListener('change', () => bar.undo('compare'));
        report = h(
          'div',
          {},
          note('辅助记录：周期由同向过O线的三个实际周期求平均；位置图每0.04s取一次原球位置，不是预设曲线。'),
          h('div', { class: 'read-row' }, compare),
          h('div', { class: 'read-row' }, whole),
          buttons([
            {
              text: '核对比较',
              onClick() {
                if (!bar.has('same') || !bar.has('different')) return guide();
                if (compare.value !== 'phase' || whole.value !== 'same')
                  return say('比较原两轮的周期和两条位置线：先后释放改变步调；多等整周期，又可以回到相同相位。');
                bar.done('compare');
                guide();
              },
            },
          ]).el,
        );
        report.hidden = true;
        ui.data.append(log.el, plots, report);
        ui.notes.append(
          note(
            '持球夹是单鼠标操作辅助：拖棕色握柄共同拉开，蓝色钮放开两夹，A/B钮分别放开。原球拖回张开夹口并对正后松手，即被夹住；按按钮才再次释放。',
          ),
          note(
            '点背景板正视近看。O线只帮助观察平衡位置，背景不是量尺。两弹簧相同、支架视为刚性；微弱阻尼使先释放者多衰减一段时间。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        const now = performance.now(),
          elapsed = lastFrame === null ? 0 : Math.min(0.25, (now - lastFrame) / 1000);
        lastFrame = now;
        model.advance(elapsed);
        rig.pose();
        if (capture && model.time - capture.start >= 3.4) finish();
      },
      dispose() {
        document.querySelector('.chart-zoom')?.click();
        manip.dispose();
        rig.dispose();
        bar.dispose();
      },
    };
  },
};
