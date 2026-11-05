import { buttons, chart, goals, note, seg, table } from './kit/ui.js';
import { draggable } from './kit/interact.js';
import { apparatus } from './kit/ticker/apparatus.js';
import { advance, LOADS, makeRun, power } from './kit/ticker/motion.js';
import { benchCue, auxiliary } from './kit/ticker/bench.js';
import { tapeReader } from './kit/ticker/reader.js';

export default {
  id: 'tickertape',
  sceneFirst: true,
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
    quote: '在本实验的理想条件下，小车的速度随时间均匀增加。',
    why: '纸带上每五个打点间隔对应 0.10 s。量出某计数点前后各 0.10 s 的总位移，除以 0.20 s，就得到这段的平均速度。匀加速时，它等于中间时刻的瞬时速度。在速度—时间图上比较同一条纸带的两点，速度差除以时间差就是这段的加速度。',
    src: '本实验模型 · 对应人教版高中物理必修第一册第 36–37 页',
  },

  create({ tag }) {
    const rig = apparatus();
    const cue = benchCue(tag),
      loadCue = benchCue(tag);
    const enter = () => {
      if (ui && document.body.classList.contains('predicting')) ui.go(1);
    };
    function replace() {
      if (taken) {
        trial++;
        prepare(run.load);
      }
    }
    function cycleMass() {
      enter();
      chooseMass((LOADS.indexOf(run.load) + 1) % LOADS.length);
    }
    function guide() {
      loadCue(!finished && !moving ? rig.pan : null, [0, -0.058, 0], run.load * 1000 + ' g · 换槽码', cycleMass);
      if (moving) cue(null);
      else if (taken) cue(rig.cart, [0, 0.072, 0], empty ? '打点不足 · 换新纸带' : '装新纸带，再做一次', replace);
      else if (finished && !run.recording) cue(rig.strip, [0, 0, 0.035], '取下纸带，量点距', take);
      else if (run.recording && !finished) cue(rig.cart, [0, 0.076, 0], '松开小车', release);
      else cue(rig.timer, [0, 0.515, 0], finished ? '关闭计时器' : '接通计时器', toggle);
    }
    let run = makeRun(LOADS[0]);
    let moving = false,
      finished = false,
      taken = false,
      trial = 1;
    let ui,
      reader,
      controls,
      masses,
      empty = false;
    const status = (message) => ui?.status(message);

    function refresh() {
      rig.draw(run);
      guide();
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
      const valid = reader.add(run, trial);
      empty = !valid;
      rig.setPaperVisible(false);
      refresh();
      status(
        valid
          ? '纸带已取下。把两条游标对准 A、B，记下第一个速度点。'
          : '这条纸带没有连续十个打点间隔。换新纸带，先通电再放车。',
      );
    }
    function prepare(load) {
      run = makeRun(load);
      moving = finished = taken = false;
      rig.setPaperVisible(true);
      masses.set(LOADS.indexOf(load));
      refresh();
      status('点右侧计时器通电，再点小车释放。也可以用面板按钮操作。');
    }
    function chooseMass(index) {
      if (!moving && !finished) {
        const powered = run.recording;
        run = makeRun(LOADS[index]);
        if (powered) power(run, true);
        masses.set(index);
        refresh();
      }
    }
    const pointer = draggable(rig.group, [], {
      highlight: true,
      tip: tag('', 'pill'),
      taps: [
        { obj: rig.timer, hint: '点一下：切换打点计时器', onTap: toggle },
        { obj: rig.cart, hint: '点一下：释放小车', onTap: () => (taken ? replace() : release()) },
        {
          obj: rig.pan,
          hint: '点一下：更换槽码',
          onTap: cycleMass,
        },
        { obj: rig.strip, hint: '点一下：取下纸带', onTap: take },
      ],
    });
    refresh();
    return {
      group: rig.group,
      size: { w: 0.94, d: 0.32, h: 0.52 },
      view: { elev: 17, azim: -10, lookY: 0.55, margin: 1.02 },
      pointer,
      mount(panel) {
        ui = panel;
        const records = table(['纸带 / 槽码', 't / s', 'A / mm', 'B / mm', 'v / (m/s)']);
        const graph = chart({
          x: { label: 't / s', min: 0, max: 0.8 },
          y: { label: 'v / (m/s)', min: 0, max: 1.1 },
          legend: '槽码质量：蓝绿 50 g · 赭红 75 g · 紫色 100 g。每条连线来自同一条纸带。',
        });
        const goal = goals(ui, [
          ['slope', '在同一条纸带上量出两个速度点'],
          ['compare', '三种槽码的纸带各量两个点以比较斜率'],
        ]);
        const measured = new Set();
        reader = tapeReader(
          (sheet, time, speed, a, b) => {
            if (!sheet.points.length)
              graph.series.push({
                color: ['#176e74', '#b35430', '#765490'][LOADS.indexOf(sheet.run.load)],
                points: sheet.points,
                dots: true,
              });
            sheet.points.push([time, speed]);
            sheet.points.sort((p, q) => p[0] - q[0]);
            graph.draw();
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
            if (sheet.points.length > 1) {
              measured.add(sheet.run.load);
              goal.done('slope');
              const slope = (last[1] - first[1]) / (last[0] - first[0]);
              message += '这条纸带首末两个测量点的斜率约为 ' + slope.toFixed(2) + ' m/s²。';
            } else message += '换下一个计数点再量一次。';
            if (measured.size === LOADS.length) goal.done('compare');
            status(message);
          },
          status,
          () => {
            ui.go(1);
            ui.fold(false);
            graph.el.scrollIntoView({ block: 'start' });
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
              graph.series.length = 0;
              graph.draw();
              measured.clear();
              goal.undo('slope', 'compare');
              trial = 1;
              prepare(LOADS[0]);
            },
          },
        ]);
        ui.controls.append(reader.el, auxiliary(masses.el, controls.el));
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
        reader?.dispose();
      },
    };
  },
};
