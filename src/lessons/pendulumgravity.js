// 选择性必修一图 2.5-1。读尺、释放、起停计时均由学生操作；振动积分与停表共用实验时钟。
import { gravityPendulumRig, SUSPEND, RULER_SPAN, RADIUS } from './kit/gravityPendulumRig.js';
import { advancePendulum, pendulumEstimate, timingMark, pendulumSeries } from './kit/gravityPendulum.js';
import { lessonBar } from './kit/lessonbar.js';
import { draggable, clamp } from './kit/interact.js';
import { note, table, buttons, chart, h } from './kit/ui.js';

const DEG = Math.PI / 180,
  MIN_OSCILLATIONS = 20;
export default {
  id: 'pendulumgravity',
  fig: '图2.5-1',
  title: '用单摆测量重力加速度',
  stampText: '测量',
  predict: {
    q: '从摆球向右经过中线开始计时，哪一次才完成了一次全振动？',
    options: ['下一次向右过中线', '下一次向左过中线', '到达右端最高点'],
    answer: 0,
    hint: '一次全振动后，摆球回到相同位置，运动方向也相同。',
  },
  conclusion: {
    page: 55, rect: [64.0, 359.0, 381.0, 440.0],
    quote: '当摆角较小时，单摆做简谐运动，根据其周期公式可得 g＝4π²l/T²',
    why: '摆长是悬点到球心的距离。用总时间 t 除以全振动次数 N 得到周期 T，再由 g = 4π²l/T² 计算。起停时对准同一位置、同一运动方向，多周期计时能减小反应时间在结果中的占比。改变摆长取得多组记录，T²–l图近似为过原点的直线，斜率k=4π²/g；T与l本身不成正比。',
    src: '课本第 51 页 · 第二章 第5节 实验：用单摆测量重力加速度',
  },
  create(ctx) {
    const rig = gravityPendulumRig(),
      { group } = rig;
    let ui,
      log,
      report,
      clockRows,
      aim,
      near = null,
      length,
      angle,
      omega,
      amplitude,
      running,
      measured,
      upper,
      elapsed,
      started,
      stopped,
      pending,
      turns,
      heldAngle,
      catching,
      initialLen,
      grabX,
      clickedY,
      lastFrame;
    let watchView = false;
    const samples = [];
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'length', title: '量摆长', todo: '沿尺分别读取悬点和球心的位置。', target: () => aim },
        { id: 'time', title: '多周期计时', todo: '从静止释放，计至少 20 次全振动。', target: () => aim },
        {
          id: 'repeat',
          title: '多摆长复测',
          todo: '测至少四种摆长，总跨度至少20cm；每种都重新量长和计时。',
          target: () => aim,
        },
        { id: 'g', title: '分析周期与摆长', todo: '用原数据计算周期和g，再比较T–l、T²–l图。', target: () => aim },
      ],
    });
    const say = (msg, obj = null) => {
      aim = near || watchView ? null : obj;
      bar.say(msg);
    };
    const enter = () => {
      if (ui && document.body.classList.contains('predicting')) ui.go(1);
    };
    const aligned = () => Math.abs(rig.ruler.position.x + 0.024 - (SUSPEND.x - RADIUS - 0.003)) < 0.01;
    const enough = () => samples.length >= 4 && pendulumSeries(samples).sufficient;
    const repeatedLength = () => measured !== null && samples.some((s) => Math.abs(measured - s.l) < 0.049);
    function guide() {
      if (bar.finished) return say('已用多组原数据比较周期与摆长，并估算重力加速度。');
      if (near)
        return say(
          near === 'top'
            ? '点与线的悬点齐平的毫米刻线。尺上数字是厘米。'
            : '点与球心齐平的毫米刻线，留意球的上下边缘。',
        );
      if (pending) return say('停表读数 ' + pending.t.toFixed(2) + ' s。展开笔记本，填写自己数的全振动次数。');
      if (enough()) return say('摆长范围已有充分记录。在原笔记本计算周期和g，再用两幅图比较关系。');
      if (started)
        return say(
          '起表方向为' + (started.dir > 0 ? '向右' : '向左') + '。数满至少 20 次全振动，在同向过中线时再按停表。',
          rig.key,
        );
      if (samples.length > 0 && repeatedLength())
        return say(
          running
            ? '先抓住摆球带回中线，停稳后改变摆长。'
            : '上下拖动线轴，选与已有记录相差至少5cm的摆长；总跨度需达20cm。',
          running ? rig.ball : rig.spool,
        );
      if (running)
        return say(
          measured === null
            ? '先把球带回中线停住，测摆长。'
            : watchView
              ? '看球心经过中线时的方向，按停表开始，记作第 0 次。'
              : '点停表近看，让球心和表盘同时留在视野中。',
          measured === null ? rig.ball : watchView ? rig.key : rig.watch,
        );
      if (measured === null) {
        if (!aligned()) return say('把竖尺横向拖到悬线旁，让毫米刻线靠近悬点和球心。', rig.ruler);
        return say(
          upper === null ? '点悬点旁的尺，近看它与哪条刻线齐平。' : '上端已读。点球心旁的同一把尺，再读球心的位置。',
          rig.scale,
        );
      }
      say('向左或向右拉开摆球一点，松手释放。用小摆角测量。', rig.ball);
    }
    function leave() {
      if (near || watchView) ctx.back();
      watchView = false;
      near = null;
      bar.near(false);
      guide();
    }
    function look() {
      if (running || pending || enough()) {
        guide();
        return;
      }
      if (!aligned()) {
        guide();
        return;
      }
      const target = upper === null ? SUSPEND.y : SUSPEND.y - length;
      if (Math.abs(clickedY - target) > 0.065) {
        guide();
        return;
      }
      near = upper === null ? 'top' : 'bob';
      bar.near(true);
      ctx.look(
        [(rig.ruler.position.x - 0.024 + SUSPEND.x + RADIUS) / 2, target, rig.ruler.position.z],
        [0, 0, 1],
        0.17,
        leave,
      );
      guide();
    }
    function read(ray) {
      const hit = ray.intersectObject(rig.scale)[0];
      if (!hit) return;
      const n = Math.round((1 - hit.uv.y) * RULER_SPAN * 1000);
      const y = near === 'top' ? SUSPEND.y : SUSPEND.y - length;
      if (Math.abs(n - (rig.ruler.position.y - y) * 1000) > 1)
        return say(
          near === 'top'
            ? '从细线离开夹子的悬点水平看过去，再点尺刻。'
            : '从球心向尺水平看过去。读到球顶会少一个半径。',
        );
      if (near === 'top') {
        upper = n;
        leave();
        return;
      }
      measured = (n - upper) / 1000;
      bar.done('length');
      leave();
      say('两端相差 ' + (n - upper) + ' mm。轻拉摆球，从静止松手。', rig.ball);
    }
    function stopReading() {
      if (!running || measured === null || !amplitude) {
        guide();
        return;
      }
      const { dir, atCenter, ordinal } = timingMark(angle, omega, amplitude, turns);
      if (!started) {
        if (!atCenter) return say('球尚未经过中线。等它经过平衡位置时按停表，记住运动方向。', rig.key);
        started = { t: elapsed, dir, ordinal };
        stopped = 0;
        rig.display(0);
        guide();
        return;
      }
      stopped = elapsed - started.t;
      const n = ordinal - started.ordinal,
        same = dir === started.dir;
      started = null;
      rig.display(stopped);
      if (!same || !atCenter)
        return say(
          '停表读到 ' + stopped.toFixed(2) + ' s，但起停没有对准同方向的中线。下次同向过中线时重新起表。',
          rig.key,
        );
      if (n < MIN_OSCILLATIONS)
        return say(
          '停表读到 ' + stopped.toFixed(2) + ' s，只经过 ' + n + ' 次全振动。再起表，数满至少 20 次。',
          rig.key,
        );
      if (amplitude > 5.5 * DEG) return say('这组摆角偏大。把球带回中线，再小幅拉开重测。', rig.ball);
      pending = { t: stopped, n, l: measured };
      guide();
    }
    function saveCount() {
      if (!pending) return;
      const n = clockRows.valueAsNumber;
      if (n !== pending.n) {
        say('本轮次数与同向过中线的记录不符。左右各经过一次才算一次全振动；可重新计时。');
        return;
      }
      const sample = { ...pending, t: +pending.t.toFixed(2), accepted: false };
      pending = null;
      samples.push(sample);
      log.el.hidden = false;
      log.add([sample.l.toFixed(3), String(n), sample.t.toFixed(2)]);
      bar.done('time');
      if (enough()) bar.done('repeat');
      clockRows.value = '';
      countForm.hidden = true;
      if (enough()) {
        buildReport();
        guide();
      } else say('已记' + samples.length + '组。抓球回中线停住，再调线轴；需至少四种摆长、总跨度20cm。', rig.ball);
    }
    let countForm;
    function buildReport() {
      report.replaceChildren();
      const values = samples.map(() => []);
      const plots = h('div', { hidden: true });
      let plotted = null;
      const invalidate = () => {
        plotted = null;
        plots.hidden = true;
        bar.undo('g');
      };
      report.append(note('用原表的t/N计算周期T（保留三位小数），再算每组g并取平均。核对后，在同一笔记本画两幅图。'));
      for (const [i, s] of samples.entries()) {
        const labels = ['第 ' + (i + 1) + ' 组周期 / s', '第 ' + (i + 1) + ' 组 g / (m/s²)'];
        for (const label of labels) {
          const el = h('input', { type: 'number', step: 'any', 'aria-label': label, style: 'width:6em' });
          el.addEventListener('input', invalidate);
          values[i].push(el);
          report.append(h('div', { class: 'read-row' }, h('label', {}, label + ' ', el)));
        }
      }
      const avg = h('input', { type: 'number', step: 'any', 'aria-label': '平均 g / (m/s²)', style: 'width:6em' });
      avg.addEventListener('input', invalidate);
      report.append(
        h('div', { class: 'read-row' }, h('label', {}, '平均 g / (m/s²) ', avg)),
        buttons([
          {
            text: '核对并画图',
            onClick() {
              let sum = 0;
              for (const [i, s] of samples.entries()) {
                const [t, g] = values[i].map((el) => el.valueAsNumber),
                  expected = pendulumEstimate(s.l, s.t, s.n);
                if (!Number.isFinite(t) || Math.abs(t - expected.period) > 0.00051)
                  return say('第' + (i + 1) + '组先用总时间除以全振动次数，周期保留三位小数。');
                if (!Number.isFinite(g) || Math.abs(g - (4 * Math.PI ** 2 * s.l) / t ** 2) > 0.1)
                  return say('第' + (i + 1) + '组请用米和秒，计算4π²l/T²。');
                sum += g;
              }
              if (!Number.isFinite(avg.valueAsNumber) || Math.abs(avg.valueAsNumber - sum / samples.length) > 0.025)
                return say('取你计算的各组g的算术平均值。');
              // 图上的T采用学生刚核对的值；继续改输入会撤回图和完成状态。
              plotted = pendulumSeries(samples.map((s, i) => ({ ...s, t: values[i][0].valueAsNumber * s.n })));
              bar.undo('g');
              plots.replaceChildren();
              plots.hidden = false;
              const squares = table(['摆长 l / m', '周期 T / s', 'T² / s²']);
              for (const r of plotted.rows) squares.add([r.l.toFixed(3), r.period.toFixed(3), r.squared.toFixed(4)]);
              plots.append(
                squares.el,
                note(
                  'T²由上面核对的T平方得到。圆点保留实测差别；棕色虚线是自由截距的直线拟合，不强迫过原点。点图可放大。',
                ),
              );
              for (const [key, fit, label, max] of [
                ['period', plotted.periodFit, 'T / s', 2.2],
                ['squared', plotted.squaredFit, 'T² / s²', 4],
              ]) {
                const end = 0.9,
                  line = [
                    [0, fit.intercept],
                    [end, fit.intercept + fit.slope * end],
                  ];
                const graph = chart({
                  preserveAspect: true,
                  x: { label: 'l / m', min: 0, max: end },
                  y: {
                    label,
                    min: Math.min(0, fit.intercept * 1.2),
                    max: Math.max(max, ...line.map((p) => p[1] * 1.08)),
                  },
                  series: [
                    { color: '#a17e51', points: line, line: true, dash: true },
                    { points: plotted.rows.map((r) => [r.l, r[key]]), line: false, dots: true },
                  ],
                  legend:
                    label +
                    '：拟合截距 ' +
                    fit.intercept.toFixed(3) +
                    '，斜率 ' +
                    fit.slope.toFixed(3) +
                    (key === 'period' ? ' s/m' : ' s²/m'),
                });
                plots.append(graph.el);
              }
              const choice = h(
                'select',
                { 'aria-label': '周期与摆长的关系' },
                h('option', { value: '' }, '选择图像支持的关系'),
                h('option', { value: 't' }, 'T与l近似成正比'),
                h('option', { value: 'square' }, 'T²与l近似成正比'),
                h('option', { value: 'inverse' }, 'T²与l近似成反比'),
              );
              const slopeG = h('input', {
                type: 'number',
                step: 'any',
                'aria-label': '由斜率估算 g / (m/s²)',
                style: 'width:6em',
              });
              for (const el of [choice, slopeG]) el.addEventListener('input', () => bar.undo('g'));
              plots.append(
                note(
                  '比较两条拟合线的截距和点的分布，不能只看“像直线”就判断正比。由T²–l斜率k计算g=4π²/k；有限范围的测量只支持近似关系。',
                ),
                h('div', { class: 'read-row' }, h('label', {}, '周期与摆长的关系 ', choice)),
                h('div', { class: 'read-row' }, h('label', {}, '由斜率估算 g / (m/s²) ', slopeG)),
                buttons([
                  {
                    text: '核对图像分析',
                    onClick() {
                      if (choice.value !== 'square')
                        return say('看哪一幅图更接近过原点的直线；T–l局部接近直线不等于T与l成正比。');
                      if (
                        !Number.isFinite(slopeG.valueAsNumber) ||
                        plotted.slopeGravity === null ||
                        Math.abs(slopeG.valueAsNumber - plotted.slopeGravity) > 0.1
                      )
                        return say('使用T²–l的斜率k，单位s²/m，计算4π²/k。');
                      bar.done('g');
                      say(
                        '各组平均g=' +
                          avg.valueAsNumber.toFixed(2) +
                          '，斜率估算g=' +
                          slopeG.valueAsNumber.toFixed(2) +
                          ' m/s²。保留两种估算的差别。',
                      );
                    },
                  },
                ]).el,
              );
              say('原记录已画在两幅图中。比较截距和点的分布，再用T²–l斜率估算g。');
            },
          },
        ]).el,
        plots,
      );
    }
    const manip = draggable(
      group,
      [
        {
          obj: rig.ruler,
          plane: 'xy',
          offset: -0.036,
          enabled: () => !running && !pending,
          hint: '把尺横向靠近悬线，点刻度近看',
          onStart() {
            enter();
            grabX = rig.ruler.position.x;
          },
          onDrag(p, from) {
            if (!from) return;
            rig.ruler.position.x = clamp(grabX + p.x - from.x, SUSPEND.x - 0.13, SUSPEND.x - RADIUS - 0.026);
            upper = measured = null;
          },
          onEnd(moved) {
            if (moved) guide();
          },
          onTap: look,
        },
        {
          obj: rig.spool,
          plane: 'xy',
          offset: SUSPEND.z,
          enabled: () => !pending,
          hint: '停稳后上下拖线轴改变摆长',
          onStart() {
            enter();
            initialLen = length;
          },
          onDrag(p, from) {
            if (!from || running) return;
            length = clamp(initialLen - (p.y - from.y), 0.46, 0.83);
            rig.spool.rotation.y = (length - 0.64) * 18;
            upper = measured = null;
            rig.pose(length, 0);
          },
          onEnd() {
            if (running) say('先用手把球带回中线停住，再改摆长。', rig.ball);
            else guide();
          },
        },
        {
          obj: rig.ball,
          plane: 'xy',
          offset: SUSPEND.z,
          enabled: () => !pending,
          hint: '拉开摆球再松手，或带回中线停住',
          onStart() {
            enter();
            catching = running;
            heldAngle = angle;
            running = false;
            started = null;
            omega = 0;
          },
          onDrag(p, from) {
            if (!from) return;
            angle = Math.asin(clamp(Math.sin(heldAngle) + (p.x - from.x) / length, -0.5, 0.5));
            if (catching && Math.abs(length * Math.sin(angle)) < 0.012) {
              angle = 0;
              say('球心已回到中线，松手停住。');
            }
            rig.pose(length, angle);
          },
          onEnd() {
            amplitude = Math.abs(angle);
            running = amplitude > 0.35 * DEG;
            if (!running) {
              angle = 0;
              rig.pose(length, angle);
            }
            omega = 0;
            turns = { 1: 0, '-1': 0 };
            guide();
            if (amplitude > 5.5 * DEG)
              say(
                '摆角约 ' + Math.round(amplitude / DEG) + '°。观察后可把球带回中线，改用不超过约 5° 的小摆角测量。',
                rig.ball,
              );
          },
        },
      ],
      {
        highlight: true,
        taps: [
          {
            obj: rig.watch,
            hint: '按停表开始或停止计时',
            onTap() {
              enter();
              if (pending) {
                guide();
                return;
              }
              if (enough() || (samples.length > 0 && repeatedLength())) {
                say('先换一种未测过的摆长，重新用尺量长，再计时。', rig.spool);
                return;
              }
              if (running && measured !== null && !watchView && !started) {
                watchView = true;
                bar.near(true);
                ctx.look(
                  [-0.082, (SUSPEND.y - length + 0.35) / 2, 0.04],
                  [0, 0.36, 1],
                  Math.max(0.72, (Math.abs(SUSPEND.y - length - 0.35) + 0.2) * 2.6, (0.42 * innerWidth) / innerHeight),
                  leave,
                );
                guide();
                return;
              }
              stopReading();
              if (pending) {
                countForm.hidden = false;
              }
            },
          },
        ],
      },
    );
    function reset() {
      if (near || watchView) leave();
      samples.length = 0;
      length = 0.64;
      angle = omega = amplitude = elapsed = stopped = 0;
      started = pending = upper = measured = null;
      running = false;
      turns = { 1: 0, '-1': 0 };
      lastFrame = null;
      rig.ruler.position.set(SUSPEND.x - 0.11, SUSPEND.y + 0.035, -0.036);
      rig.spool.rotation.y = 0;
      rig.pose(length, angle);
      rig.display(0);
      if (log) {
        log.clear();
        log.el.hidden = true;
        report.replaceChildren();
        clockRows.value = '';
        countForm.hidden = true;
      }
      bar.undo('length', 'time', 'repeat', 'g');
      guide();
    }
    reset();
    return {
      group,
      size: { w: 0.86, d: 0.45, h: 1.02 },
      view: { elev: 11, azim: -8, lookY: 0.5, margin: 1.06 },
      toggles: ['steps'],
      pointer: {
        items: manip.items,
        down(ray, e) {
          if (near) {
            read(ray);
            return true;
          }
          const hit = ray.intersectObject(rig.scale)[0];
          if (hit) clickedY = group.worldToLocal(hit.point.clone()).y;
          else clickedY = Infinity;
          return manip.down(ray, e);
        },
        move(ray) {
          return !!near || manip.move(ray);
        },
        up() {
          return manip.up();
        },
      },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        log = table(['实测摆长 / m', '全振动次数', '总时间 / s']);
        log.el.hidden = true;
        clockRows = h('input', { type: 'number', step: '1', 'aria-label': '全振动次数', style: 'width:6em' });
        countForm = h(
          'div',
          {},
          h('label', {}, '全振动次数 ', clockRows),
          buttons([
            { text: '记录本轮', onClick: saveCount },
            {
              text: '重新计时',
              onClick() {
                pending = null;
                started = null;
                countForm.hidden = true;
                guide();
              },
            },
          ]).el,
        );
        countForm.hidden = true;
        report = h('div', {});
        ui.data.append(countForm, log.el, report);
        ui.notes.append(
          note('尺上数字为厘米，小格为毫米。停表按下时开始，再按停止。数同一方向的过中线，每次全振动计一次。'),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        const now = performance.now(),
          step = lastFrame === null ? 0 : Math.min(0.25, (now - lastFrame) / 1000);
        lastFrame = now;
        if (!running) return;
        const s = advancePendulum(angle, omega, length, step);
        angle = s.angle;
        omega = s.omega;
        elapsed += step;
        for (const e of s.crossings) turns[e.direction]++;
        rig.pose(length, angle);
        if (started) rig.display(elapsed - started.t);
      },
      dispose() {
        manip.dispose();
        rig.dispose();
        bar.dispose();
      },
    };
  },
};
