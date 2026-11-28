// 选择性必修第一册，第 51–53 页。用图 2.5-3 的直接读尺法量到球心。
import { gravityPendulumRig, SUSPEND, RADIUS } from './kit/gravityPendulumRig.js';
import { GRAVITY, advancePendulum, pendulumEstimate, timingMark } from './kit/gravityPendulum.js';
import { lessonBar } from './kit/lessonbar.js';
import { draggable, clamp } from './kit/interact.js';
import { qaFlow } from './kit/chemlesson.js';
import { table, chart, h } from './kit/ui.js';

const DEG = Math.PI / 180;
const HOME = SUSPEND.x - 0.14, ALIGNED = SUSPEND.x - RADIUS - 0.028;
const stages = [['length', '量摆长'], ['time', '测多次全振动'], ['repeat', '复测取平均']];
const first = '把竖尺向右拖到摆线旁，量悬点到球心的距离。';
const cm = n => (n * 100).toFixed(1);

export default {
  id: 'pendulumgravity', fig: '图2.5-1', title: '用单摆测量重力加速度', stampText: '测量',
  predict: {
    q: '用单摆测这里的重力加速度，要量哪两个量？',
    options: ['摆线的长度和周期', '悬点到球心的距离和周期', '摆球的质量和周期'], answer: 1,
  },
  conclusion: {
    page: 55, rect: [64.0, 359.0, 381.0, 440.0],
    quote: '当摆角较小时，单摆做简谐运动，根据其周期公式可得',
    formula: 'g = 4π²l / T²',
    why: '摆线长加上球半径就是摆长。把多次全振动的总时间除以次数，起停时的反应误差就分摊到多个周期里。',
    src: '课本第 51 页 · 第二章 第5节 实验：用单摆测量重力加速度',
  },
  create(ctx) {
    const rig = gravityPendulumRig(), { group, scale, ball, grip, caseFace } = rig;
    const point = (x, y, z) => new ctx.THREE.Vector3(x, y, z);
    const local = obj => group.worldToLocal(obj.getWorldPosition(point(0, 0, 0)));
    const samples = [], points = [];
    let ui, target, view, aligned, returning, length, measured, readings;
    let angle, omega, amplitude, running, elapsed, turns, start, pending, stopped;
    let catching, grabAngle, grabLength, grabX, lastFrame;
    const bar = lessonBar({ ...ctx, group, back: leave, steps: stages.map(([id, title]) =>
      ({ id, title, todo: id === 'length' ? first : title, target: () => ui?.step === 1 ? target : null })) });
    const stepBar = document.querySelector('.lbar');
    let shortOverview = false, holding = false, layoutPending = false, adjusting = false;
    const say = (message, obj = null) => { target = obj; bar.say(message); };
    const labels = ['悬点刻度 / cm', '球顶刻度 / cm', '球心刻度 / cm'];
    const heights = () => [SUSPEND.y, SUSPEND.y - length + RADIUS, SUSPEND.y - length];
    const scaleValue = () => (rig.ruler.position.y - heights()[readings.length]) * 100;
    const field = (label, step) => h('input', { type: 'number', step, inputmode: step === '1' ? 'numeric' : 'decimal',
      'aria-label': label, style: 'width:5.5em;font:inherit;padding:4px 6px' });
    const rulerInput = field(labels[0], '0.1'), count = field('全振动次数 N', '1'), time = field('停表读数 t / s', '0.01');
    const rulerLabel = h('span'), rulerLine = h('label', {}, rulerLabel, '　', rulerInput);
    function form(rows, caption, submit) {
      return h('form', { hidden: true, novalidate: true, onsubmit(e) { e.preventDefault(); submit(); } },
        rows.map(label => h('div', { class: 'read-row' }, label)), h('button', { class: 'go', type: 'submit' }, caption));
    }
    const rulerForm = form([rulerLine], '记下刻度', readLength);
    const timerForm = form([h('label', {}, '全振动次数 N　', count), h('label', {}, '停表读数 t / s　', time)], '记录这组', record);
    const log = table(['l / m', 'N / 次', 't / s', 'T / s', 'g / (m/s²)']);
    const work = h('p', { class: 'note' }), average = h('p', { class: 'note' });
    const graph = chart({ preserveAspect: true,
      x: { label: 'l / m', min: 0, max: 0.9 }, y: { label: 'T² / s²', min: 0, max: 4 },
      series: [{ points, dots: true, line: false, color: '#28656f' }] });
    const comparison = h('div', { class: 'sum-ctx', hidden: true });
    const data = h('div', {}, log.el, graph.el, average, comparison);
    const resetButton = h('button', { class: 'go ghost', onclick: reset }, '全部重来');

    function guide() {
      if (bar.finished) return say('三组都已记录。用各组 g 的平均值表示这次测量的结果。');
      if (view === 'ruler') {
        const prompts = ['平视细线离开夹子的地方，读悬点刻度。每小格是 1 mm。',
          '悬点已记下。读球的上边缘，先量出摆线有多长。',
          '沿三角尺的上边读球心刻度。球顶到球心的距离就是半径。'];
        return say(prompts[readings.length]);
      }
      if (pending) return say('表停了。把自己数的全振动次数和表上的秒数记下来。');
      if (start) return say('起表时球向' + (start.dir > 0 ? '右' : '左') + '过中线。每次同向回来数一次，数满 20 次或更多再按表。', caseFace);
      if (running) return say('球心经过红色中线时按表，记作第 0 次，同时记住运动方向。', caseFace);
      if (measured !== null) return say('向旁边轻拉摆球，松手让它小角度摆动。', ball);
      if (!aligned) return say(first, scale);
      say('点竖尺凑近读数。摆长的起点在夹子下方的悬点。', scale);
    }
    function closeView() {
      if (view || shortOverview) ctx.back();
      shortOverview = false;
      rig.straightedge.visible = false;
      view = null;
      rulerForm.hidden = true;
      bar.near(false);
      fitLayout();
    }
    function leave() { closeView(); guide(); }
    function readView() {
      view = 'ruler';
      const k = readings.length;
      rig.straightedge.visible = k === 2;
      const y = heights()[k];
      rulerLabel.textContent = labels[k]; rulerInput.setAttribute('aria-label', labels[k]); rulerInput.value = '';
      rulerForm.hidden = false;
      if (ui?.el.classList.contains('folded')) ui.fold(false);
      ctx.look([(ALIGNED + SUSPEND.x) / 2, y, 0], [0, 0, 1], 0.34, leave);
      bar.near(true); guide();
    }
    function frameWatch() {
      const y = SUSPEND.y - length;
      ctx.look([-0.038, (y + 0.37) / 2, 0.035], [0, 0.015, 1], Math.max(amplitude > 5 * DEG ? 0.93 : 0.75, Math.abs(y - 0.37) * 2.8 + 0.29), leave);
    }
    function watchView() {
      view = 'watch';
      bar.near(true);
      fitLayout();
    }
    // 矮横屏按顶栏和步骤栏之间的实际空位取景。计时只框住摆球的运动范围、中线和停表。
    function fitLayout() {
      if (!ui || view === 'ruler' || !document.body.classList.contains('lesson-on')) return;
      if (holding) { layoutPending = true; return; }
      layoutPending = false;
      const bounds = stepBar.getBoundingClientRect();
      if (innerWidth <= 760 || innerHeight > 600 || !bounds.height) {
        if (view === 'watch') frameWatch();
        else if (shortOverview) ctx.back();
        shortOverview = false;
        return;
      }
      const watch = view === 'watch', y = SUSPEND.y - length;
      const low = watch ? Math.min(y - RADIUS - 0.04, rig.watch.position.y) : -0.02;
      const high = watch ? Math.max(y + length * (1 - Math.cos(amplitude)) + RADIUS, rig.watch.position.y + 0.10) : 1.03;
      const top = (document.querySelector('#btn-import')?.getBoundingClientRect().bottom || 48) + 8;
      const bottom = bounds.top - 8;
      const swing = length * Math.sin(amplitude) + RADIUS;
      const left = watch ? SUSPEND.x - swing : -0.40;
      const right = watch ? Math.max(rig.watch.position.x + 0.07, SUSPEND.x + swing) : 0.40;
      const pxPerMeter = Math.min(Math.max(40, bottom - top) / (high - low), Math.max(80, bounds.width - 64) / (right - left));
      const centerY = (high + low) / 2 - (innerHeight - top - bottom) / (2 * pxPerMeter);
      const center = point((left + right) / 2, centerY, 0.035);
      const dist = innerHeight / (2 * Math.tan(ctx.camera.fov * DEG / 2) * pxPerMeter) + 0.07;
      const dir = watch ? point(0, 0, 1) : point(-0.12, 0.18, 1).normalize();
      ctx.lookFrom(center.clone().addScaledVector(dir, dist).toArray(), center.toArray(), leave);
      shortOverview = !watch;
    }
    const layoutObserver = new ResizeObserver(fitLayout);
    function readLength() {
      if (view !== 'ruler') return;
      const value = rulerInput.valueAsNumber, correct = scaleValue(), k = readings.length;
      if (!Number.isFinite(value)) return say('先把看到的厘米数写下来。');
      if (Math.abs(value - correct) > 0.055) {
        if (k === 2 && Math.abs(value - readings[1]) < 0.07) return say('这是球顶的刻度，还差一个半径。沿球最宽处水平读尺。');
        return say(['从细线离开夹子的下沿平视尺面。', '从细线接触球顶的地方平视尺面。', '从球最宽的地方平视尺面。'][k] + '每 10 小格是 1 cm。');
      }
      readings.push(value);
      work.textContent = '悬点 ' + readings[0].toFixed(1) + ' cm' + (k > 0 ? '，球顶 ' + readings[1].toFixed(1) + ' cm' : '') + '。';
      if (k < 2) { readView(); return; }
      const cord = readings[1] - readings[0], radius = value - readings[1];
      measured = (value - readings[0]) / 100;
      work.textContent = '摆线长 ' + cord.toFixed(1) + ' cm，球半径 ' + radius.toFixed(1) + ' cm。摆长 l = ' + cm(measured) + ' cm。';
      bar.done('length'); closeView();
      say('量到球心才是完整的摆长。轻拉摆球，松手让它小角度摆动。', ball);
    }
    function tick(dt) {
      if (!running) return;
      const state = advancePendulum(angle, omega, length, dt);
      angle = state.angle; omega = state.omega; elapsed += dt;
      for (const cross of state.crossings) turns[cross.direction]++;
      rig.pose(length, angle);
      if (start) rig.display(elapsed - start.t, '计时中');
    }
    function press() {
      if (!running || bar.finished) return;
      if (view !== 'watch') { watchView(); guide(); return; }
      if (pending) { pending = null; timerForm.hidden = true; }
      const mark = timingMark(angle, omega, amplitude, turns);
      if (!start) {
        if (!mark.atCenter) return say('球心还没到红色中线。经过中线时再起表。', caseFace);
        start = { ...mark, t: elapsed }; rig.display(0, '计时中'); guide(); return;
      }
      stopped = Number((elapsed - start.t).toFixed(2));
      const n = mark.ordinal - start.ordinal, same = mark.dir === start.dir;
      start = null; rig.display(stopped, '已停表');
      if (!same || !mark.atCenter) return say('起停的位置或方向不同，这一段没有数齐全振动。同向过中线时重新计时。', caseFace);
      if (n < 20) return say('只计了 ' + n + ' 次。再起表，数满 20 次，让起停误差分摊到更多周期。', caseFace);
      if (amplitude > 5 * DEG) return say('摆角偏大，小角度公式不够准。把球带回中线，小幅拉开再测。', ball);
      pending = { n, t: stopped };
      count.value = time.value = ''; timerForm.hidden = false;
      if (ui.el.classList.contains('folded')) ui.fold(false); guide();
    }
    function record() {
      if (!pending) return;
      const n = count.valueAsNumber, t = time.valueAsNumber;
      if (n !== pending.n) return say('次数和同向过中线的次数对不上。起表算 0，向对面再回来才算 1。可再按表重测。', caseFace);
      if (t !== pending.t) return say('核对停住的表盘，连同小数点后两位一起读。');
      const row = { l: measured, n, t, ...pendulumEstimate(measured, t, n) };
      samples.push(row); points.push([row.l, row.period ** 2]); graph.draw();
      log.add([row.l.toFixed(3), String(n), t.toFixed(2), row.period.toFixed(3), row.gravity.toFixed(2)]);
      work.textContent = 'T = ' + t.toFixed(2) + ' ÷ ' + n + ' ≈ ' + row.period.toFixed(3) + ' s；g = 4π² × ' +
        row.l.toFixed(3) + ' / T² ≈ ' + row.gravity.toFixed(2) + ' m/s²。';
      graph.el.hidden = false; pending = null; timerForm.hidden = true; closeView(); bar.done('time');
      if (samples.length === 3) {
        const mean = samples.reduce((sum, s) => sum + s.gravity, 0) / samples.length;
        average.textContent = '平均 g = (' + samples.map(s => s.gravity.toFixed(2)).join(' + ') + ') / 3 ≈ ' + mean.toFixed(2) + ' m/s²。';
        comparison.replaceChildren(
          h('div', {}, '模拟设定 g = ' + GRAVITY + ' m/s²，与本轮平均值相差约 ' + Math.abs(mean - GRAVITY).toFixed(2) + ' m/s²。'),
          h('div', {}, '想一想，摆长读数和起停表的时机会怎样影响算出的 g？'),
          h('div', {}, '选做：查一查当地的重力加速度，和你的测量结果比较。'));
        comparison.hidden = false;
        bar.done('repeat'); guide();
        comparison.scrollIntoView({ block: 'nearest' });
      } else say('第 ' + samples.length + ' 组已上图。测三组取平均。可再按表，或把球带回中线、拖线端换摆长。', ball);
    }
    const ready = () => !bar.finished && !returning && !adjusting;
    const hint = text => () => ui?.step === 1 ? text : '';
    const tip = ctx.tag('', 'pill').show(false);
    tip.el.style.transition = 'none';
    const canvas = document.getElementById('c');
    const hideTip = () => tip.show(false);
    canvas.addEventListener('pointerleave', hideTip);
    const pointer = draggable(group, [
      { obj: scale, plane: 'xy', offset: -0.012, enabled: () => ready() && !view && !running && measured === null,
        hint: () => ui?.step !== 1 ? '' : aligned ? '点一下：凑近读尺' : '向右拖：把尺靠近摆线',
        onStart() { grabX = rig.ruler.position.x; },
        onDrag(p, from) { if (from && !aligned) rig.ruler.position.x = clamp(grabX + p.x - from.x, HOME - 0.09, ALIGNED); },
        onEnd(moved) {
          if (aligned || !moved) return;
          if (rig.ruler.position.x < ALIGNED - 0.006) {
            returning = { x: rig.ruler.position.x, t: 0 }; say('尺离摆线还远。把尺拖到球旁再松手。', scale);
          } else { aligned = true; rig.ruler.position.x = ALIGNED; readView(); }
        },
        onTap() { if (aligned) readView(); else guide(); } },
      { obj: ball, plane: 'xy', offset: SUSPEND.z, enabled: () => ready() && measured !== null && !pending && view !== 'ruler',
        hint: () => ui?.step !== 1 ? '' : running ? '拖回中线：停住摆球' : '左右拖：拉开摆球',
        onStart() { catching = running; grabAngle = angle; running = false; omega = 0; start = null; rig.display(0, '待计时'); },
        onDrag(p, from) {
          if (!from) return;
          const x = clamp(length * Math.sin(grabAngle) + p.x - from.x, -0.16, 0.16);
          angle = catching && Math.abs(x) < 0.011 ? 0 : Math.asin(x / length);
          rig.pose(length, angle);
        },
        onEnd() {
          amplitude = Math.abs(angle); running = amplitude > 0.35 * DEG; turns = { 1: 0, '-1': 0 }; elapsed = 0;
          if (!running) {
            angle = 0; rig.pose(length, angle); closeView();
            return say('球已停稳。可上下拖线端换摆长，也可轻拉摆球再测。', grip);
          }
          watchView(); guide();
          if (amplitude > 5 * DEG) say('摆角约 ' + Math.round(amplitude / DEG) + '°，小角度公式会有偏差。拖回中线，轻拉到 5° 以内。', ball);
        } },
      { obj: grip, plane: 'xy', offset: SUSPEND.z, enabled: () => ready() && !running && !view && !pending,
        hint: hint('按住松夹，上下拖线'),
        onStart() { grabLength = length; adjusting = true; rig.openClamp(true); say('铁夹已松开。上下拖线端调摆长，松手夹紧。'); },
        onDrag(p, from) { if (from) { length = clamp(grabLength + p.y - from.y, 0.46, 0.83); rig.pose(length, 0); } },
        onEnd() {
          adjusting = false; rig.openClamp(false);
          if (Math.abs(length - grabLength) < 1e-6) { guide(); return; }
          readings = []; measured = null; work.textContent = ''; rig.display(0, '待计时');
          if (aligned) { readView(); say('铁夹已夹紧。重新读悬点刻度，量出这一组的摆长。'); } else guide();
        } },
    ], { tip, taps: [{ obj: caseFace, enabled: () => ready() && running && view !== 'ruler',
      hint: () => ui?.step !== 1 ? '' : !view ? '点一下：近看停表' : start ? '点一下：停表' : '点一下：起表', onTap: press }] });

    function reset() {
      adjusting = false; rig.openClamp(false); holding = layoutPending = false;
      qaClock = false; closeView(); aligned = running = false; returning = start = pending = measured = null;
      readings = []; samples.length = points.length = 0; length = 0.64;
      angle = omega = amplitude = elapsed = stopped = 0; turns = { 1: 0, '-1': 0 }; lastFrame = null;
      rig.ruler.position.set(HOME, SUSPEND.y + 0.035, -0.012);
      rig.pose(length, 0); rig.display(0, '待计时');
      work.textContent = average.textContent = ''; count.value = time.value = rulerInput.value = '';
      log.clear(); graph.draw(); graph.el.hidden = timerForm.hidden = comparison.hidden = true;
      bar.undo(...stages.map(s => s[0])); ui?.relock(); ui?.fold(false); guide();
    }
    // 质检把实验时钟停在穿越中线的那一帧，鼠标仍需按真实的表键。
    // 从起表到停表逐帧积分，与课堂里使用同一套过线计数和停表逻辑。
    let qaClock = false;
    function crossing(dir, n = 0) {
      return { name: '等球同向过线 ' + n + ' 次', run() {
        if (!running) throw Error('摆球未释放');
        qaClock = true;
        const threshold = start ? start.ordinal + n : turns[dir] + 1;
        for (let i = 0; i < 9000; i++) {
          const before = turns[dir];
          tick(1 / 120);
          if (turns[dir] > before && turns[dir] >= threshold) return;
        }
        throw Error('未观察到预期过线');
      } };
    }
    function qaRead(k, wrong = false) {
      return { name: (wrong ? '误读' : '记录') + labels[k], run() {
        if (view !== 'ruler' || readings.length !== k) throw Error('读尺位置不符');
        rulerInput.value = String(wrong ? readings[1] : Number(scaleValue().toFixed(1)));
        rulerForm.querySelector('button').click();
        if (wrong && (readings.length !== k || !document.querySelector('.lb-txt').textContent.includes('半径'))) throw Error('球顶误读未被指出');
      } };
    }
    function trial(i) {
      return [
        qaRead(0), qaRead(1), ...(i === 0 ? [qaRead(2, true)] : []), qaRead(2),
        { name: '轻拉后松手', drag: ball, to: () => point(SUSPEND.x + 0.036, SUSPEND.y - length, SUSPEND.z) },
        crossing(1), { name: '同向过线起表', tap: caseFace },
        ...(i === 0 ? [crossing(1, 1), { name: '只计一次便停表', tap: caseFace }, crossing(1), { name: '重新起表', tap: caseFace }] : []),
        crossing(1, 20), { name: '数齐后停表', tap: caseFace },
        ...(i === 0 ? [{ name: '抄错停表小数', run() {
          if (!pending) throw Error('未停表'); count.value = '20'; time.value = String(pending.t + 1);
          timerForm.querySelector('button').click(); if (samples.length || !pending) throw Error('误读进了记录');
        } }] : []),
        { name: '记入第 ' + (i + 1) + ' 组', run() {
          if (pending?.n !== 20) throw Error('计数不符');
          count.value = '20'; time.value = pending.t.toFixed(2); timerForm.querySelector('button').click();
          if (samples.length !== i + 1 || points.length !== i + 1) throw Error('记录没有上图');
        } },
      ];
    }
    const qa = qaFlow(pointer, [
      { name: '竖尺未靠近便松手', drag: scale, to: () => local(scale).add(point(0.022, 0, 0)) },
      { name: '把竖尺靠在摆线旁', drag: scale, to: () => local(scale).setX(ALIGNED) },
      ...trial(0),
      ...[0.50, 0.77].flatMap((len, i) => [
        { name: '把摆球带回中线', drag: ball, to: () => point(SUSPEND.x, SUSPEND.y - length, SUSPEND.z) },
        { name: '拖线端调整摆长', drag: grip, to: () => local(grip).add(point(0, len - length, 0)) },
        ...trial(i + 1),
      ]),
      { name: '掀开课本结论', run() {
        if (!bar.finished || samples.length !== 3 || !average.textContent.includes('m/s²')) throw Error('三组测量未完成');
        qaClock = false; ui.go(2); ui.el.querySelector('.flap-front').click();
      } },
    ]);
    for (const step of qa) {
      if (step.mouse?.kind !== 'drag') continue;
      step.run = () => {
        const item = pointer.items().find(d => d.obj === step.mouse.obj);
        const from = local(item.obj), to = step.mouse.to();
        item.onStart(from); item.onDrag(to, from); item.onEnd(true);
      };
    }
    reset();
    return {
      group: new ctx.THREE.Group().add(group), size: { w: 0.84, d: 0.43, h: 1.02 },
      view: { elev: 10, azim: -7, lookY: 0.50, margin: 1.13 }, toggles: ['steps'],
      reset,
      pointer: {
        items: () => pointer.items().filter(d => d.enabled()),
        down(ray, event) {
          const handled = pointer.down(ray, event);
          if (handled) { holding = true; if (ui?.step === 0) ui.go(1); }
          return handled;
        },
        move(ray, event) { tip.show(ui?.step === 1); return ui?.step === 1 && pointer.move(ray, event); },
        up(ray, event) {
          holding = false;
          const handled = pointer.up(ray, event);
          if (layoutPending) fitLayout();
          return handled;
        },
      },
      mount(panel) {
        ui = panel;
        layoutObserver.observe(stepBar); layoutObserver.observe(canvas);
        bar.attach({ need: () => ui.need(''), unlock() { ui.unlock(); ui.need(''); } });
        if (ui.el.querySelector('.page-crop')) ui.el.querySelector('.answer .formula').hidden = true;
        const source = ui.el.querySelector('.answer .src');
        source.style.paddingRight = '82px'; source.style.minHeight = '48px';
        ui.status('模拟实验 · 细线不易伸长，小球密实。');
        ui.controls.append(rulerForm, timerForm);
        ui.data.append(work, data);
        ui.notes.append(resetButton);
        guide();
      },
      update(dt) {
        bar.update(dt);
        if (returning) {
          returning.t = Math.min(1, returning.t + dt / 0.38);
          rig.ruler.position.x = HOME + (returning.x - HOME) * (1 - returning.t) ** 2;
          if (returning.t === 1) returning = null;
        }
        const now = performance.now();
        if (!qaClock && lastFrame !== null) tick(Math.min(0.25, (now - lastFrame) / 1000));
        lastFrame = now;
      },
      debug: { bar, qa },
      dispose() { layoutObserver.disconnect(); canvas.removeEventListener('pointerleave', hideTip); pointer.dispose(); rig.dispose(); bar.dispose(); },
    };
  },
};
