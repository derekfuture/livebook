// 图2.2-3与图2.1-4共用同一钢球：多周期计时、半振幅复测和辅助等时记录。
import { FreeSpring, springTimingMark } from './kit/freeSpring.js';
import { freeSpringRig, FREE_SPRING_TOP } from './kit/freeSpringRig.js';
import { lessonBar } from './kit/lessonbar.js';
import { draggable } from './kit/interact.js';
import { note, table, buttons, chart, h } from './kit/ui.js';

const MIN_CYCLES = 10;
export default {
  id: 'freespring',
  fig: '图2.2-3',
  title: '测量弹簧振子的周期',
  stampText: '测量',
  predict: {
    q: '原钢球的释放距离减半，弹簧仍在弹性范围内，周期会怎样？',
    options: ['基本不变', '也减半', '变为两倍'],
    answer: 0,
    hint: '用同一装置、同一计时方法比较两组，保留测量的差别。',
  },
  conclusion: {
    page: 42, rect: [216.58, 55.77, 531.65, 118.88],
    quote: '通过这个实验你会发现，弹簧振子的振动周期与其振幅无关。不仅弹簧振子的简谐运动，所有简谐运动的周期均与其振幅无关。',
    why: '钢球原来静止的位置是平衡位置。由多次全振动的总时间t与次数n得到T=t/n；改变释放距离后复测，不用理论周期替换停表读数。位移每隔0.04s取一点可看出近似正弦变化；本装置保留微弱阻尼，因此振幅会缓慢减小。理想简谐运动忽略这一耗散。',
    src: '课本第 38 页 · 第二章 第2节 简谐运动的描述',
  },
  create(ctx) {
    const model = new FreeSpring(),
      rig = freeSpringRig(model),
      { group } = rig;
    const samples = [],
      traces = [];
    let ui,
      aim,
      near = false,
      initialQ = 0,
      release = null,
      started = null,
      pending = null;
    let log,
      countForm,
      countInput,
      report,
      recordArea,
      traceNote,
      compare,
      shape,
      periodInputs = [];
    let lastFrame = null,
      lastPlot = 0,
      activeTrace = null;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        {
          id: 'release',
          title: '拉开释放',
          todo: '看尺上0刻线与球心齐平。向下拉原钢球3–5cm，松手。',
          target: () => aim,
        },
        { id: 'time', title: '多周期计时', todo: '按停表，数至少10次全振动，再同向过零停表。', target: () => aim },
        { id: 'half', title: '振幅减半', todo: '抓住原球，对照原尺拉到第一次距离的一半，再松手。', target: () => aim },
        { id: 'retime', title: '再次计时', todo: '用同一停表与计数方法复测，保留两组原记录。', target: () => aim },
        {
          id: 'trace',
          title: '等时位置记录',
          todo: '展开笔记本，开始辅助等时记录，观察同一钢球的位移变化。',
          target: () => aim,
        },
        { id: 'compare', title: '比较结果', todo: '用原时间和次数算周期，比较两组与等时位置图。', target: () => aim },
      ],
    });
    const say = (text, obj = null) => {
      aim = obj;
      bar.say(text);
    };
    const enter = () => {
      if (document.body.classList.contains('predicting')) ui?.go(1);
    };
    const halfTarget = () => samples[0]?.q / 2;
    const cm = (q) => (100 * q).toFixed(1);
    function guide() {
      if (pending)
        return say('停表为 ' + pending.t.toFixed(2) + ' s。展开笔记本，填自己数的全振动次数，点“记录本轮”。');
      if (started)
        return say(
          '起表时球向' +
            (started.direction > 0 ? '下' : '上') +
            '过0。来回一次才算1次，数满至少10次，同向过0再按橙色按钮。',
          rig.key,
        );
      if (model.held) return;
      if (samples.length === 2) {
        if (model.recording?.active) return say('正在每0.04s记录原球位置，共2.4s。不要抓球；图上的点会依次增加。');
        if (!bar.has('trace')) return say('两次计时已记下。展开笔记本，点“开始等时记录”；原球继续运动，不换球。');
        if (!bar.has('compare')) return say('用原表的t÷n分别算周期，再比较两组与等时位置图。');
        return say('已用同一钢球比较两种振幅。原记录保留，可再拉球或另录一段位置变化。');
      }
      if (!release) {
        if (samples.length)
          return say(
            '第一轮释放距离为' + cm(samples[0].q) + 'cm。抓住原球，拉到0下方约' + cm(halfTarget()) + 'cm，松手复测。',
            rig.ball,
          );
        return say(
          near
            ? '球心原来对着0。向下拖原钢球3–5cm，看球心对应的刻度，再松手。'
            : '点竖尺近看球心与0刻线，再向下拉原钢球3–5cm、松手。',
          near ? rig.ball : rig.ruler,
        );
      }
      if (!near) return say('钢球已释放。点停表近看，让球心、0刻线和按钮同时留在画面中。', rig.watch);
      say('球心向上或向下经过0刻线时，按停表橙色按钮开始，记作第0次；记住方向。', rig.key);
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
        near = true;
        bar.near(true);
        ctx.look([-0.012, 0.13, 0.035], [0, 0.18, 1], Math.max(0.74, (0.39 * innerWidth) / innerHeight), leave);
      }
      guide();
    }
    function clock() {
      enter();
      if (!near) return inspect();
      if (pending || !release || model.held || samples.length >= 2) return guide();
      const mark = springTimingMark(model);
      if (!started) {
        if (!mark.atCenter) return say('现在还没经过0刻线。看球心，等它过0再按橙色按钮起表。', rig.key);
        started = mark;
        rig.display(0);
        guide();
        return;
      }
      const elapsed = model.time - started.time,
        n = mark.ordinal - started.ordinal;
      const valid = mark.atCenter && mark.direction === started.direction;
      started = null;
      rig.display(elapsed);
      if (!valid)
        return say('停表为' + elapsed.toFixed(2) + 's，但起停位置或方向不同。等球再次同向过0，重新起表。', rig.key);
      if (n < MIN_CYCLES) return say('这次只有' + n + '次全振动。下次过0重新起表，数满至少10次再停。', rig.key);
      pending = { q: release.q, t: +elapsed.toFixed(2), n };
      countForm.hidden = false;
      guide();
    }
    function saveCount() {
      if (!pending) return;
      if (countInput.valueAsNumber !== pending.n)
        return say('所填次数与本轮同向过0次数不符。上下各过一次才算一个全振动；也可点“重新计时”再数。');
      const row = { ...pending };
      samples.push(row);
      pending = null;
      release = null;
      log.el.hidden = false;
      log.add([String(samples.length), cm(row.q), String(row.n), row.t.toFixed(2)]);
      countInput.value = '';
      countForm.hidden = true;
      bar.done(samples.length === 1 ? 'time' : 'retime');
      if (samples.length === 2) buildReport();
      guide();
    }
    function buildReport() {
      report.replaceChildren();
      periodInputs = [];
      report.append(note('按原记录计算T=t/n，保留三位小数。释放位移是松手位置的辅助记录；时间是实际停表读数。'));
      samples.forEach((s, i) => {
        const label = '第' + (i + 1) + '组周期 / s';
        const input = h('input', { type: 'number', step: '0.001', 'aria-label': label, style: 'width:6em' });
        input.addEventListener('input', () => bar.undo('compare'));
        periodInputs.push(input);
        report.append(h('div', { class: 'read-row' }, h('label', {}, label + ' ', input)));
      });
      compare = h(
        'select',
        { 'aria-label': '振幅与周期' },
        h('option', { value: '' }, '选择两组比较结果'),
        h('option', { value: 'same' }, '周期近似相同'),
        h('option', { value: 'half' }, '周期也减半'),
        h('option', { value: 'double' }, '周期变为两倍'),
      );
      shape = h(
        'select',
        { 'aria-label': '等时位置图' },
        h('option', { value: '' }, '选择位置图的特点'),
        h('option', { value: 'sine' }, '围绕0近似正弦变化'),
        h('option', { value: 'line' }, '位移随时间匀速增加'),
        h('option', { value: 'equal' }, '每隔相同时间移动相同距离'),
      );
      for (const el of [compare, shape]) el.addEventListener('change', () => bar.undo('compare'));
      report.append(
        h('div', { class: 'read-row' }, compare),
        h('div', { class: 'read-row' }, shape),
        buttons([
          {
            text: '核对比较',
            onClick() {
              if (!bar.has('trace')) return say('先点“开始等时记录”，完成一段没有手干预的位置记录再比较。');
              if (
                periodInputs.some(
                  (input, i) =>
                    !Number.isFinite(input.valueAsNumber) ||
                    Math.abs(input.valueAsNumber - samples[i].t / samples[i].n) > 0.0006,
                )
              )
                return say('每组用自己的停表总时间除以全振动次数，保留三位小数；不要填理论周期。');
              if (compare.value !== 'same' || shape.value !== 'sine')
                return say('对照两组算出的周期和位置点：位移变化并非匀速，释放距离减半也没有使周期减半。');
              bar.done('compare');
              guide();
            },
          },
        ]).el,
      );
      recordArea.hidden = false;
    }
    function startTrace() {
      if (samples.length < 2) return guide();
      if (model.recording?.active) return say('这一段还在记录；先等待结束或点“停止本段”。');
      if (
        model.held ||
        Math.hypot(model.q, model.v / Math.sqrt(model.parameters.stiffness / model.parameters.mass)) < 0.008
      )
        return say('钢球已接近停住。先向下拉开原球一点再松手，然后开始记录。', rig.ball);
      model.startRecording({ interval: 0.04, duration: 2.4 });
      const plot = chart({
        x: { label: 't / s', min: 0, max: 2.4 },
        y: { label: 'x / cm（向下为正）', min: -6, max: 6 },
        series: [{ color: '#397d90', points: [], line: false, dots: true }],
        height: 210,
        preserveAspect: true,
        legend: '每0.04s一点；由同一球的实际位置辅助记录，不是相机照片。',
      });
      const status = note('第' + (traces.length + 1) + '段 · 记录中');
      activeTrace = { plot, status, count: -1, finished: false, valid: false };
      traces.push(activeTrace);
      traceNote.append(status, plot.el);
      guide();
    }
    function drawTrace() {
      if (!activeTrace || activeTrace.finished) return;
      const a = activeTrace,
        points = model.samples;
      if (a.count !== points.length) {
        a.count = points.length;
        a.plot.series[0].points = points.map((s) => [s.t, s.q * 100]);
        a.plot.draw();
      }
      if (!model.recording?.active) {
        a.finished = true;
        const crossings = points.slice(1).filter((s, i) => s.q * points[i].q < 0).length;
        a.valid = !a.interrupted && points.at(-1).t >= 2.39 && !points.some((s) => s.held) && crossings >= 4;
        a.status.textContent =
          '第' +
          traces.length +
          '段 · ' +
          (a.valid ? '完整自由振动记录' : '提前停止或有手干预；原记录保留，可另录一段');
        if (a.valid) bar.done('trace');
        guide();
      }
    }
    const manip = draggable(
      group,
      [
        {
          obj: rig.ball,
          plane: 'xy',
          offset: FREE_SPRING_TOP.z,
          enabled: () => !pending,
          onStart() {
            enter();
            initialQ = model.q;
            if (activeTrace && !activeTrace.finished) activeTrace.interrupted = true;
            if (samples.length === 0) bar.undo('release');
            else if (samples.length === 1) bar.undo('half');
            model.grab();
            started = null;
            release = null;
          },
          onDrag(p, from) {
            if (!from) return;
            model.move(initialQ - (p.y - from.y));
            rig.pose();
            if (samples.length === 1) say('球心对准0下方约' + cm(halfTarget()) + 'cm，再松手；用原来同一把尺。');
            else say('看球心对应的刻度，向下拉开3–5cm，松手释放。');
          },
          onEnd(moved) {
            model.release();
            rig.pose();
            if (samples.length >= 2) return guide();
            if (samples.length === 0 && model.q >= 0.029 && model.q <= 0.055) {
              release = { q: model.q };
              bar.done('release');
            } else if (samples.length === 1 && Math.abs(model.q - halfTarget()) <= 0.002) {
              release = { q: model.q };
              bar.done('half');
            }
            if (!moved && !near) inspect();
            else guide();
          },
        },
      ],
      {
        highlight: true,
        taps: [
          { obj: rig.key, onTap: clock },
          { obj: rig.watch, onTap: inspect },
          { obj: rig.ruler, onTap: inspect },
        ],
      },
    );
    function reset() {
      document.querySelector('.chart-zoom')?.click();
      if (near) leave();
      model.reset();
      samples.length = traces.length = 0;
      release = started = pending = activeTrace = null;
      lastFrame = null;
      rig.pose();
      rig.display(0);
      if (log) {
        log.clear();
        log.el.hidden = true;
        countInput.value = '';
        countForm.hidden = true;
        report.replaceChildren();
        traceNote.replaceChildren();
        recordArea.hidden = true;
      }
      bar.undo('release', 'time', 'half', 'retime', 'trace', 'compare');
      guide();
    }
    return {
      group,
      size: { w: 0.46, d: 0.24, h: 0.53 },
      card: false,
      view: { elev: 14, azim: -6, lookY: 0.5, margin: 1.07 },
      toggles: ['steps'],
      pointer: manip,
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        log = table(['组', '松手位移 / cm（辅助）', '全振动次数', '停表 / s']);
        log.el.hidden = true;
        countInput = h('input', { type: 'number', step: '1', 'aria-label': '全振动次数', style: 'width:6em' });
        countForm = h(
          'div',
          {},
          h('div', { class: 'read-row' }, h('label', {}, '全振动次数 ', countInput)),
          buttons([
            { text: '记录本轮', onClick: saveCount },
            {
              text: '重新计时',
              onClick() {
                pending = started = null;
                countForm.hidden = true;
                guide();
              },
            },
          ]).el,
        );
        countForm.hidden = true;
        report = h('div', {});
        traceNote = h('div', {});
        recordArea = h(
          'div',
          {},
          note('辅助等时记录：同一球继续运动，每0.04s取实际位移。每一段原记录单独保留。'),
          buttons([
            { text: '开始等时记录', onClick: startTrace },
            {
              text: '停止本段',
              onClick() {
                model.stopRecording();
                drawTrace();
              },
            },
          ]).el,
          traceNote,
        );
        recordArea.hidden = true;
        ui.data.append(countForm, log.el, recordArea, report);
        ui.notes.append(
          note(
            '点竖尺或停表近看；拖钢球再松手。球心同向经过0刻线时按橙色按钮起停表，上下各经过一次才是一次全振动。10次是本活页的计时要求，教材要求取较多次数。',
          ),
          note(
            '轻弹簧在线性弹性范围内，忽略其质量，保留微弱空气阻尼。球被抓住时会停下，松手后从该位置重新振动；不会自动换球或重置原记录。',
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
        if (started) rig.display(model.time - started.time);
        if (now - lastPlot > 100 || (activeTrace && !model.recording?.active)) {
          lastPlot = now;
          drawTrace();
        }
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
