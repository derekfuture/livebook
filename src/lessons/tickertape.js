import { lessonBar } from './kit/lessonbar.js';
import { loadRack } from './kit/ticker/loadRack.js';
import { buttons, chart, note, seg, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { apparatus } from './kit/ticker/apparatus.js';
import { advance, LOADS, makeRun, power } from './kit/ticker/motion.js';
import { tapeReader } from './kit/ticker/reader.js';

export default {
  id: 'tickertape',
  fig: '图2.1-1',
  title: '探究小车速度随时间变化的规律',
  stampText: '测量',
  predict: {
    q: '小车从静止开始，槽码牵引它运动。纸带上相邻两点的距离会怎样变化？',
    options: ['逐渐变大', '保持相等', '逐渐变小'],
    answer: 0,
    hint: '打点计时器每隔相同的时间打一个点。',
  },
  conclusion: {
    page: 43, rect: [64.28, 369.61, 381.28, 456.39],
    quote: '无论 Δt 选在什么区间，对应的速度的变化量 Δv 与时间的变化量 Δt 之比都是一样的，即物体运动的加速度保持不变。所以，实验中小车的运动是加速度不变的运动。',
    why: '纸带上每五个打点间隔对应 0.10 s。量出某计数点前后各 0.10 s 的总位移，除以 0.20 s，就得到这段的平均速度。匀加速时，它等于中间时刻的瞬时速度。在速度—时间图上比较同一条纸带的两点，速度差除以时间差就是这段的加速度。',
    src: '课本第 39 页 · 第二章 第2节 匀变速直线运动的速度与时间的关系',
  },

  create(ctx) {
    const { tag } = ctx;
    const rig = apparatus();
    const loadLabel = tag('', 'pill').loc(rig.pan, 0, -0.06, 0);
    const measured = new Set();
    function newRun(load) {
      const result = makeRun(load);
      // 基准组取三点，才能比较同一条纸带上前、后两段速度增量。
      result.requiredSpeeds = load === LOADS[0] ? 3 : 2;
      return result;
    }
    const remaining = () => LOADS.filter((m) => !measured.has(m));
    function target() {
      if (reader.inspecting) return null;
      if (moving || bar.finished || bar.current === 'plot') return null;
      if (bar.current === 'compare' && !taken && !finished && measured.has(run.load)) {
        const i = LOADS.indexOf(remaining()[0]);
        if (i >= 0) return rack.drags[i].obj;
      }
      if (taken && reader.canMeasureMore && reader.count < run.requiredSpeeds) return reader.paper;
      return taken
        ? rig.cart
        : finished
          ? run.recording
            ? rig.timer
            : rig.strip
          : run.recording
            ? rig.cart
            : rig.timer;
    }
    const bar = lessonBar({
      look: ctx.look,
      back: () => reader.leave(),
      group: rig.group,
      steps: [
        { id: 'tape', title: '打出纸带', todo: '先开计时器，再释放小车。', target },
        { id: 'slope', title: '测不同时刻的速度', todo: '在同一条纸带上测不同时刻的速度。', target },
        { id: 'compare', title: '换槽码重测', todo: '更换槽码，保留三次运动的记录。', target },
        { id: 'plot', title: '描速度图', todo: '展开笔记本，把纸带读数标到速度图上。' },
      ],
    });
    const reader = tapeReader(rig.group, ctx, bar, refresh);
    const rack = loadRack(
      rig,
      LOADS,
      () => !moving && !finished,
      (i) => {
        enter();
        chooseMass(i);
      },
    );
    const enter = () => {
      if (ui && document.body.classList.contains('predicting')) ui.go(1);
    };
    function replace() {
      if (taken) {
        trial++;
        prepare(run.load);
      }
    }
    let run = newRun(LOADS[0]);
    let moving = false,
      finished = false,
      taken = false,
      trial = 1;
    let ui, controls, masses, removePlot;
    let plotHint = '';
    const status = (message) => ui?.status(message);

    function stepHint() {
      if (bar.finished) return '三组速度图已画好。相同时间内速度增加越多，图上的线就越陡。';
      if (bar.current === 'plot')
        return '三组纸带已测完。' + (reader.inspecting ? '回实验台，' : '') + '展开笔记本，在速度图上标出表里的读数。';
      const compare = bar.current === 'compare';
      const progress = compare ? '已完成 ' + measured.size + '/3 组。' : '';
      const mass = run.load * 1000 + ' g';
      const next = remaining()[0] * 1000 + ' g';
      if (reader.inspecting) {
        if (compare && reader.count >= run.requiredSpeeds)
          return progress + '回实验台，向右拖回小车，再换 ' + next + ' 槽码。';
        return progress + reader.instruction;
      }
      if (moving) return progress + '看相邻两个点的距离怎样变化。';
      if (taken)
        return (
          progress +
          (!reader.canMeasureMore && reader.count < run.requiredSpeeds
            ? '纸带不够长。向右拖回小车，用同一组槽码重新打带。'
            : compare && measured.has(run.load)
              ? '向右拖回小车；把 ' + next + ' 槽码拖到滑轮下的挂钩。'
              : '看刚取下的纸带。点它放大，比较小车先后经过不同点时的速度。')
        );
      if (finished) return progress + (run.recording ? '关计时器，再取下纸带。' : '点纸带取下，看上面留下了哪些点。');
      if (compare && measured.has(run.load))
        return progress + '这组 ' + mass + ' 已测过。把 ' + next + ' 槽码拖到左端挂钩。';
      return progress + (run.recording ? '已通电，松开小车。' : '当前 ' + mass + '。先开右端计时器，再松开小车。');
    }
    function refresh() {
      rig.draw(run);
      rack.draw(run.load);
      loadLabel.text('悬挂 ' + Math.round(run.load * 1000) + ' g').show(!moving);
      bar.say(stepHint());
      if (!controls) return;
      const [timer, release, take, replace] = controls.btns;
      timer.textContent = run.recording ? '关闭计时器' : '接通计时器';
      timer.disabled = finished && !run.recording;
      release.disabled = moving || finished;
      take.disabled = !finished || run.recording || taken;
      replace.disabled = moving || !taken;
      LOADS.forEach((_, i) => masses.disable(i, moving || finished));
    }
    function toggle() {
      if (finished && !run.recording) return;
      enter();
      power(run, !run.recording);
      refresh();
      status(
        run.recording
          ? '计时器已通电。小车运动时，纸带每隔 0.02 s 留下一个点。'
          : finished
            ? '计时器已关闭。点纸带取下本轮记录。'
            : '计时器已关闭，纸带暂停打点。',
      );
    }
    function release() {
      if (moving || finished) return;
      enter();
      moving = true;
      refresh();
      status(run.recording ? '观察车尾的纸带和下降的槽码。' : '小车已经出发，计时器仍未通电。');
    }
    function take() {
      if (!finished || taken) return;
      if (run.recording) return status('先关闭计时器，再取下纸带。');
      taken = true;
      const valid = reader.add(run, trial, rig.stripLayout(run));
      if (valid) bar.done('tape');
      rig.setPaperVisible(false);
      refresh();
      status(
        valid
          ? '纸带已平放在尺旁。点它近看，在同一把尺上读 A、B 两处的位置。'
          : '这条纸带没有连续十个打点间隔。换新纸带，先通电再放车。',
      );
    }
    function prepare(load) {
      reader.stow();
      run = newRun(load);
      moving = finished = taken = false;
      rig.setPaperVisible(true);
      masses.set(LOADS.indexOf(load));
      refresh();
      status('点右侧计时器通电，再点小车释放。也可以用面板按钮操作。');
    }
    function chooseMass(index) {
      if (!moving && !finished) {
        const powered = run.recording;
        run = newRun(LOADS[index]);
        if (powered) power(run, true);
        masses.set(index);
        refresh();
      }
    }
    let returnPosition = 0;
    const cartDrag = {
      obj: rig.cart,
      plane: 'xy',
      offset: 0,
      enabled: () => !moving && (!finished || taken),
      hint: () => (taken ? '把小车向右拖回起点，装上新纸带' : '松手释放小车'),
      onStart: () => {
        returnPosition = run.x;
      },
      onDrag: (p, from) => {
        if (taken && from) {
          returnPosition = clamp(run.x - (p.x - from.x), 0, run.x);
          rig.draw({ ...run, x: returnPosition });
        }
      },
      onEnd: (moved) => {
        if (taken && moved) {
          if (returnPosition < 0.04) replace();
          else refresh();
        }
      },
      onTap: () => {
        if (!finished) release();
      },
    };
    const pointer = draggable(rig.group, [reader.drag, cartDrag, ...rack.drags], {
      highlight: true,
      taps: [
        { obj: rig.timer, enabled: () => !finished || run.recording, hint: '点一下：切换打点计时器', onTap: toggle },
        { obj: rig.strip, enabled: () => finished && !taken && !run.recording, hint: '点一下：取下纸带', onTap: take },
      ],
    });
    refresh();
    return {
      group: rig.group,
      size: { w: 0.94, d: 0.42, h: 0.52 },
      view: { elev: 17, azim: -10, lookY: 0.55, margin: 1.02 },
      pointer,
      toggles: ['steps'],
      mount(panel) {
        ui = panel;
        const records = table(['纸带 / 槽码', 't / s', 'A / mm', 'B / mm', 'v / (m/s)']);
        const graph = chart({
          x: { label: 't / s', min: 0, max: 0.8 },
          y: { label: 'v / (m/s)', min: 0, max: 1.1 },
          legend:
            '槽码质量：蓝绿 50 g · 赭红 75 g · 紫色 100 g。每个点是一次速度读数，同色线连接同一条纸带上不同时刻的读数。',
        });
        const sheets = new Map(),
          pending = [];
        let coords;
        graph.extra = (_, X, Y) => {
          coords = { X, Y };
        };
        const prompt = note('');
        const updatePlotHint = () => {
          const n = pending[0];
          plotHint = n
            ? '第 ' +
              n.sheet.trial +
              ' 条纸带：横轴找 ' +
              n.time.toFixed(2) +
              ' s，纵轴找 ' +
              n.speed.toFixed(3) +
              ' m/s，点两者交会处。'
            : '';
          prompt.textContent = plotHint || '同色点来自同一条纸带。用速度变化量除以时间间隔，可以比较斜率。';
          graph.canvas.title = n ? '在速度图上描点' : '点一下放大';
        };
        const mark = (event) => {
          if (!pending.length || !coords) return;
          event.stopImmediatePropagation();
          const { sheet, time, speed } = pending[0];
          const r = graph.canvas.getBoundingClientRect();
          const px = ((event.clientX - r.left) * graph.canvas.width) / (2 * r.width);
          const py = ((event.clientY - r.top) * graph.canvas.height) / (2 * r.height);
          if (Math.abs(px - coords.X(time)) > 11 || Math.abs(py - coords.Y(speed)) > 10) {
            prompt.textContent = '再对一遍坐标。' + plotHint;
            return;
          }
          const dots = sheets.get(sheet).points;
          dots.push([time, speed]);
          dots.sort((a, b) => a[0] - b[0]);
          pending.shift();
          graph.draw();
          updatePlotHint();
          if (measured.size === LOADS.length && !pending.length) {
            bar.done('plot');
            const baseline = [...sheets.keys()].find((s) => s.points.length >= 3 && s.run.load === LOADS[0]);
            if (baseline) {
              const [a, b, c] = baseline.points;
              const slopes = [(b[1] - a[1]) / (b[0] - a[0]), (c[1] - b[1]) / (c[0] - b[0])];
              prompt.textContent =
                '50 g 纸带上，前后两段的斜率分别为 ' +
                slopes.map((v) => v.toFixed(2)).join('、') +
                ' m/s²。比较另外两条纸带，看哪条更陡。';
            }
          }
          bar.say(stepHint());
        };
        graph.canvas.addEventListener('click', mark, true);
        removePlot = () => graph.canvas.removeEventListener('click', mark, true);
        graph.el.prepend(prompt);
        graph.el.hidden = records.el.hidden = true;
        bar.attach(ui);
        reader.bind(
          (sheet, time, speed, a, b) => {
            records.el.hidden = false;
            if (!sheet.points.length) {
              const series = {
                color: ['#176e74', '#b35430', '#765490'][LOADS.indexOf(sheet.run.load)],
                points: [],
                dots: true,
              };
              graph.series.push(series);
              sheets.set(sheet, series);
            }
            bar.undo('plot');
            pending.push({ sheet, time, speed });
            updatePlotHint();
            sheet.points.push([time, speed]);
            sheet.points.sort((p, q) => p[0] - q[0]);
            records.add([
              sheet.trial + ' / ' + sheet.run.load * 1000 + ' g',
              time.toFixed(2),
              a.toFixed(1),
              b.toFixed(1),
              speed.toFixed(3),
            ]);
            const first = sheet.points[0],
              last = sheet.points.at(-1);
            let message = '本次读数得到 ' + speed.toFixed(3) + ' m/s。';
            if (sheet.points.length >= sheet.run.requiredSpeeds) {
              measured.add(sheet.run.load);
              bar.done('slope');
              const slope = (last[1] - first[1]) / (last[0] - first[0]);
              message += '这条纸带首末两个测量点的斜率约为 ' + slope.toFixed(2) + ' m/s²。';
            } else message += '换下一个计数点再量一次。';
            if (measured.size === LOADS.length) {
              bar.done('compare');
              graph.el.hidden = false;
              const points = [...sheets.keys()].flatMap((s) => s.points);
              for (const [index, axis] of [graph.x, graph.y].entries()) {
                const largest = Math.max(...points.map((p) => p[index]));
                axis.max = Math.ceil((largest + 0.015) * 10) / 10;
              }
              graph.draw();
            }
            bar.say(stepHint());
            status(message);
          },
          () => {
            ui.go(1);
            ui.fold(false);
            (graph.el.hidden ? records.el : graph.el).scrollIntoView({ block: 'start' });
          },
        );
        masses = seg(
          '悬挂的槽码质量',
          LOADS.map((m) => m * 1000 + ' g'),
          (_, i) => chooseMass(i),
        );
        controls = buttons([
          { text: '接通计时器', onClick: toggle },
          { text: '释放小车', onClick: release },
          { text: '取下纸带', onClick: take },
          {
            text: '换新纸带',
            onClick: replace,
          },
          {
            text: '全部重做',
            ghost: true,
            onClick: () => {
              reader.clear();
              records.clear();
              graph.el.hidden = records.el.hidden = true;
              pending.length = 0;
              sheets.clear();
              updatePlotHint();
              graph.series.length = 0;
              graph.draw();
              measured.clear();
              bar.undo('tape', 'slope', 'compare', 'plot');
              trial = 1;
              prepare(LOADS[0]);
            },
          },
        ]);
        ui.notes.append(note('点计时器通电，点小车放手。停车后关电，点纸带近看。'), masses.el, controls.el, reader.el);
        ui.data.append(
          graph.el,
          records.el,
          note(
            '小车质量 450 g，水平木板，忽略阻力、绳和滑轮的质量。每个点间隔 0.02 s。用 A、B 间的位移除以 0.20 s，估计中间计数点的速度。',
          ),
        );
        prepare(LOADS[0]);
      },
      update(dt) {
        bar.update(dt);
        if (!moving) return;
        advance(run, dt);
        rig.draw(run);
        if (run.t >= run.end) {
          moving = false;
          finished = true;
          refresh();
          status(run.recording ? '小车停止。关闭计时器，再取下纸带。' : '小车停止。取下纸带看看记录了哪些点。');
        }
      },
      dispose() {
        removePlot?.();
        rig.dispose();
        rack.dispose();
        pointer.dispose();
        bar.dispose();
        reader.dispose();
      },
    };
  },
};
