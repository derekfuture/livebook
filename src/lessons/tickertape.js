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
    quote: '在本实验的理想条件下，小车的速度随时间均匀增加。',
    why: '纸带上每五个打点间隔对应 0.10 s。量出某计数点前后各 0.10 s 的总位移，除以 0.20 s，就得到这段的平均速度。匀加速时，它等于中间时刻的瞬时速度。在速度—时间图上比较同一条纸带的两点，速度差除以时间差就是这段的加速度。',
    src: '本实验模型 · 对应人教版高中物理必修第一册第 36–37 页',
  },

  create(ctx) {
    const { tag } = ctx;
    const rig = apparatus();
    const loadLabel = tag('', 'pill').loc(rig.pan, 0, -0.06, 0);
    const measured = new Set();
    const remaining = () => LOADS.filter((m) => !measured.has(m));
    function target() {
      if (reader.inspecting) return null;
      if (moving || bar.finished) return null;
      if (bar.current === 'compare' && !taken && !finished && measured.has(run.load)) {
        const i = LOADS.indexOf(remaining()[0]);
        if (i >= 0) return rack.drags[i].obj;
      }
      if (taken && reader.canMeasureMore && reader.count < 2) return reader.paper;
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
        { id: 'slope', title: '量两个速度点', todo: '在同一条纸带上量两个不同时刻的速度。', target },
        { id: 'compare', title: '比较三条纸带', todo: '换槽码重测，在同一坐标系比较三条纸带。', target },
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
    let run = makeRun(LOADS[0]);
    let moving = false,
      finished = false,
      taken = false,
      trial = 1;
    let ui, controls, masses;
    const status = (message) => ui?.status(message);

    function stepHint() {
      if (bar.finished) return '已完成 3/3 组。展开笔记本，看三组速度随时间怎样变化。';
      const compare = bar.current === 'compare';
      const progress = compare ? '已完成 ' + measured.size + '/3 组。' : '';
      const mass = run.load * 1000 + ' g';
      const next = remaining()[0] * 1000 + ' g';
      if (reader.inspecting) {
        if (compare && reader.count >= 2) return progress + '回实验台，向右拖回小车，再换 ' + next + ' 槽码。';
        return progress + reader.instruction;
      }
      if (moving) return progress + '看相邻两个点的距离怎样变化。';
      if (taken)
        return (
          progress +
          (!reader.canMeasureMore && reader.count < 2
            ? '纸带不够长。向右拖回小车，用同一组槽码重新打带。'
            : compare && measured.has(run.load)
              ? '向右拖回小车；把 ' + next + ' 槽码拖到滑轮下的挂钩。'
              : '点台面上的纸带量两个时刻；要重测就向右拖回小车。')
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
      const valid = reader.add(run, trial);
      if (valid) bar.done('tape');
      rig.setPaperVisible(false);
      refresh();
      status(
        valid
          ? '纸带已取下。把两条游标对准 A、B，记下第一个速度点。'
          : '这条纸带没有连续十个打点间隔。换新纸带，先通电再放车。',
      );
    }
    function prepare(load) {
      reader.stow();
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
        graph.el.hidden = records.el.hidden = true;
        bar.attach(ui);
        reader.bind(
          (sheet, time, speed, a, b) => {
            graph.el.hidden = records.el.hidden = false;
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
              bar.done('slope');
              const slope = (last[1] - first[1]) / (last[0] - first[0]);
              message += '这条纸带首末两个测量点的斜率约为 ' + slope.toFixed(2) + ' m/s²。';
            } else message += '换下一个计数点再量一次。';
            if (measured.size === LOADS.length) bar.done('compare');
            bar.say(stepHint());
            status(message);
          },
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
              graph.el.hidden = records.el.hidden = true;
              graph.series.length = 0;
              graph.draw();
              measured.clear();
              bar.undo('tape', 'slope', 'compare');
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
        rig.dispose();
        rack.dispose();
        pointer.dispose();
        bar.dispose();
        reader.dispose();
      },
    };
  },
};
