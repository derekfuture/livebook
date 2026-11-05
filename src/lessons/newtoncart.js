import { buttons, chart, goals, note, seg, table } from './kit/ui.js';
import { draggable } from './kit/interact.js';
import { apparatus } from './kit/ticker/apparatus.js';
import { advance, power } from './kit/ticker/motion.js';
import { auxiliary, benchCue, probePaper } from './kit/ticker/bench.js';
import { tapeReader } from './kit/ticker/reader.js';
import { CARTS, GRAVITY, HANGERS, tractionRun } from './kit/ticker/traction.js';

const MODES = ['balance', 'force', 'mass'];
const LIFTS = [0, 15, 30];

export default {
  id: 'newtoncart',
  sceneFirst: true,
  fig: '图4.2-2',
  title: '探究加速度与力、质量的关系',
  stampText: '探究',
  predict: {
    q: '把木板右端垫高，摘下槽码，沿板向左轻推带着纸带的小车。什么现象说明阻力刚好得到补偿？',
    options: ['小车很快停下', '相同时间内的点距相等', '纸带上的点距越来越大'],
    answer: 1,
    hint: '先用无牵引试滑检查，再分两组改变一个条件。',
  },
  conclusion: {
    quote: '同一质量下，加速度与合力成正比；相同合力下，加速度与质量成反比。',
    why: '右端垫高后，用无牵引的匀速试滑检查沿板的重力分量能否补偿阻力。补偿后小车沿板的合力等于绳的拉力 T。悬挂物向下加速，所以 T = m(g − a)。只有 m 远小于小车总质量 M，才能用 mg 近似 T，并用固定槽码近似保持拉力不变。',
    src: '人教版高中物理必修第一册，第 88–90 页 · 参考案例 1',
  },
  create({ tag }) {
    const rig = apparatus({ adjustable: true });
    let mode = 'balance',
      lift = 0,
      cartIndex = 0,
      hangerIndex = 0;
    let balanced = false,
      moving = false,
      finished = false,
      trial = 1;
    let ui, reader, modeSeg, liftSeg, cartSeg, hangerSeg, actions, goal;
    const cue = benchCue(tag),
      adjust = benchCue(tag),
      compare = benchCue(tag);
    let empty = false,
      taken = false,
      powered = false,
      probe,
      graphs,
      nextMode = false;
    const enter = () => {
      if (ui && document.body.classList.contains('predicting')) ui.go(1);
    };
    function adjustLift(index) {
      if (moving || mode !== 'balance') return;
      enter();
      liftSeg.set(index, true);
    }
    function changeLoad() {
      if (moving || finished) return;
      if (mode === 'force') hangerSeg.set((hangerIndex + 1) % HANGERS.length, true);
      if (mode === 'mass') cartSeg.set((cartIndex + 1) % CARTS.length, true);
    }
    function guide() {
      cue(null);
      adjust(null);
      compare(null);
      if (!ui || moving) return;
      if (mode === 'balance') {
        if (finished && run.marks.length < 16) cue(rig.cart, [0, 0.078, 0], '点数太少 · 再推一次', prepare);
        else if (finished) cue(rig.strip, [0, 0, 0.034], '试滑定格 · 看纸带', take);
        else cue(rig.cart, [0, 0.078, 0], '向左轻推小车', start);
        if (!finished)
          adjust(rig.board, [0.31, 0.026, 0.052], '垫块 ' + lift + ' mm', () =>
            adjustLift((LIFTS.indexOf(lift) + 1) % LIFTS.length),
          );
        return;
      }
      if (taken) cue(rig.cart, [0, 0.078, 0], empty ? '打点不足 · 换新纸带' : '装新纸带，再做一次', prepare);
      else if (finished && !powered) cue(rig.strip, [0, 0, 0.034], '取下纸带，量两次速度', take);
      else if (!finished && powered) cue(rig.cart, [0, 0.078, 0], '松开小车', start);
      else cue(rig.timer, [0, 0.515, 0], finished ? '关闭计时器' : '接通计时器', timer);
      if (!finished && mode === 'force')
        adjust(rig.pan, [0, -0.06, 0], HANGERS[hangerIndex] * 1000 + ' g · 换槽码', changeLoad);
      if (!finished && mode === 'mass')
        adjust(rig.board, [-0.03, -0.035, 0.05], CARTS[cartIndex] * 1000 + ' g · 加减车载重物', changeLoad);
      if (!balanced && !powered && (!finished || taken))
        compare(rig.board, [0.24, -0.045, 0.05], '摘下槽码，重调木板', () => modeSeg.set(0, true));
      else if (mode === 'mass' && taken)
        compare(rig.timer, [0, 0.515, 0], '改做固定车质量', () => modeSeg.set(1, true));
      else if (finished && taken && nextMode)
        compare(rig.timer, [0, 0.515, 0], '固定槽码，改车质量', () => modeSeg.set(2, true));
      else if (finished && taken && graphs)
        compare(rig.timer, [0, 0.515, 0], '看实验图表', () => {
          ui.go(1);
          ui.fold(false);
          graphs.scrollIntoView({ block: 'start' });
        });
    }
    const status = (text) => ui?.status(text);
    const settings = () => ({ mode, lift, cartIndex, hangerIndex, balanced });
    let run = tractionRun(settings());
    function refresh() {
      rig.draw(run);
      guide();
      if (!actions) return;
      const locked = moving || finished;
      MODES.forEach((_, i) => modeSeg.disable(i, moving));
      LIFTS.forEach((_, i) => liftSeg.disable(i, locked));
      CARTS.forEach((_, i) => cartSeg.disable(i, locked || mode !== 'mass'));
      HANGERS.forEach((_, i) => hangerSeg.disable(i, locked || mode !== 'force'));
      const [start, replace] = actions.btns;
      start.textContent =
        mode === 'balance'
          ? finished
            ? '查看试滑纸带'
            : '轻推无牵引小车'
          : finished && !powered && !taken
            ? '取下纸带'
            : !powered || finished
              ? powered
                ? '关闭计时器'
                : '接通计时器'
              : '释放小车';
      start.disabled = moving || taken;
      replace.disabled = !finished;
    }
    function prepare() {
      run = tractionRun(settings());
      moving = finished = powered = taken = false;
      probe?.close();
      rig.setPaperVisible(true);
      refresh();
    }
    function switchMode(index) {
      mode = MODES[index];
      nextMode = false;
      cartIndex = 0;
      hangerIndex = mode === 'mass' ? 1 : 0;
      cartSeg.set(cartIndex);
      hangerSeg.set(hangerIndex);
      hangerSeg.el.hidden = mode === 'balance';
      prepare();
      status(
        [
          '摘掉槽码，轻推小车。观察相邻 0.10 s 的位移是否相等。',
          '固定车和车上重物的总质量为 500 g，改变悬挂质量。',
          '固定悬挂质量为 20 g，给小车添加重物。',
        ][index],
      );
    }
    function start() {
      if (moving || finished) return;
      enter();
      if (mode === 'balance') {
        // 定格比较最初三个等时段；手推过轻或提前触挡块时可以重试。
        run.end = Math.min(run.end, 0.3);
        power(run, true);
      }
      moving = true;
      refresh();
      status(mode === 'balance' ? '小车已离手，纸带正在记录无牵引运动。' : '小车由静止释放，纸带正在记录运动。');
    }
    function stop() {
      if (mode === 'balance') power(run, false);
      moving = false;
      finished = true;
      refresh();
      if (mode === 'balance') {
        const marks = run.marks;
        if (marks.length < 16) {
          status('试滑太短，重新轻推以取得三个等时间隔。');
          return;
        }
        const steps = [5, 10, 15].map((i) => ((marks[i].x - marks[i - 5].x) * 1000).toFixed(1));
        status('连续三个 0.10 s 的位移为 ' + steps.join('、') + ' mm。' + '这组点距告诉你该怎样调木板？');
        return;
      }
      status(powered ? '小车已停，关闭计时器再取带。' : '小车已停，取下纸带检查记录。');
    }
    function timer() {
      if (mode === 'balance' || taken || (finished && !powered)) return;
      enter();
      powered = !powered;
      power(run, powered);
      refresh();
    }
    function take() {
      if (!finished || taken) return;
      if (mode === 'balance') {
        if (run.marks.length >= 16) probe.open(run.marks);
        else prepare();
        return;
      }
      if (powered) return status('先关计时器。');
      taken = true;
      empty = !reader.add(run, trial++);
      if (!empty) {
        rig.setPaperVisible(false);
        status('取下了本轮纸带。对准 A、B 记录两个不同时刻的速度，用速度差除以时间差得到加速度。');
      } else status('纸带缺少连续打点。检查是否通电及木板高度。');
      refresh();
    }
    let dragLift = 0,
      pushStart = 0,
      stroke = 0;
    const pointer = draggable(
      rig.group,
      [
        {
          obj: rig.cart,
          plane: 'xy',
          offset: 0,
          enabled: () => !moving && (!finished || taken || (mode === 'balance' && run.marks.length < 16)),
          hint: () => (finished ? '装新纸带' : mode === 'balance' ? '沿木板向左推，松手后观察点距' : '点车身松开小车'),
          onStart: () => {
            enter();
            pushStart = performance.now();
            stroke = 0;
          },
          onDrag: (point, from) => {
            if (!from || mode !== 'balance' || finished) return;
            stroke = Math.max(0, Math.min(0.055, from.x - point.x));
            run.startOffset = stroke;
            rig.draw(run);
          },
          onEnd: (moved) => {
            if (!moved || mode !== 'balance' || finished) return;
            if (stroke < 0.002) {
              prepare();
              return;
            }
            const speed = stroke / Math.max(0.02, (performance.now() - pushStart) / 1000);
            run = tractionRun({ ...settings(), pushSpeed: speed, startOffset: stroke });
            start();
          },
          onTap: () => (finished ? prepare() : start()),
        },
        {
          obj: rig.board,
          plane: 'xy',
          offset: 0,
          enabled: () => mode === 'balance' && !moving,
          hint: '拖木板右端上下调整垫高量，或点一下换一档',
          onStart: () => {
            dragLift = lift;
          },
          onDrag: (p, from) => {
            if (from) {
              const i = Math.max(0, Math.min(2, Math.round((dragLift + (p.y - from.y) * 1000) / 15)));
              if (LIFTS[i] !== lift) adjustLift(i);
            }
          },
          onTap: () => adjustLift((LIFTS.indexOf(lift) + 1) % 3),
        },
      ],
      {
        highlight: true,
        tip: tag('', 'pill'),
        taps: [
          {
            obj: rig.cartTop,
            enabled: () => mode === 'mass' && !moving && !finished,
            hint: '点车顶加减重物',
            onTap: changeLoad,
          },
          {
            obj: rig.timer,
            enabled: () => mode !== 'balance' && !taken && (!finished || powered),
            hint: '开关计时器',
            onTap: timer,
          },
          { obj: rig.strip, enabled: () => finished && !taken, hint: '点纸带近看', onTap: take },
          {
            obj: rig.pan,
            enabled: () => mode === 'force' && !finished && !moving,
            hint: '点槽码更换悬挂质量',
            onTap: changeLoad,
          },
        ],
      },
    );
    refresh();
    return {
      group: rig.group,
      size: { w: 0.94, d: 0.32, h: 0.55 },
      view: { elev: 18, azim: -10, lookY: 0.55, margin: 1.02 },
      pointer,
      mount(panel) {
        ui = panel;
        goal = goals(ui, [
          ['balanced', '无牵引试滑得到相等点距'],
          ['force', '量三种轻槽码，比较力改变时的加速度'],
          ['mass', '量三种车质量，比较加速度的变化'],
        ]);
        const logs = table(['带号', 'M / kg', 'mg / N', 't₁→t₂ / s', 'v₁→v₂ / (m/s)', 'a / (m/s²)', '条件']);
        logs.el.style.overflowX = 'auto';
        const plots = {};
        const valid = { force: new Map(), mass: new Map() };
        const questions = {};
        const comparisons = {
          force: '固定车质量，槽码由 10 g 加至 20 g，实测加速度接近原来的多少？',
          mass: '固定槽码，小车由 500 g 加至 1000 g，实测加速度接近原来的多少？',
        };
        for (const key of ['force', 'mass']) {
          plots[key] = chart({
            x: { label: key === 'force' ? 'mg / N' : '1/M / kg⁻¹', min: 0, max: key === 'force' ? 0.4 : 2.1 },
            y: { label: 'a / (m/s²)', min: 0, max: 0.65 },
            series: [
              { points: [], dots: true, line: false },
              { points: [], dots: true, line: false, color: '#ac5134' },
            ],
            fit: true,
            legend:
              key === 'force'
                ? '车总质量 500 g · 横轴为槽码重力（拉力估计值），赭色为重槽码对照'
                : '悬挂质量 20 g · 横轴为车总质量的倒数',
          });
        }
        for (const key of ['force', 'mass']) {
          const question = document.createElement('div');
          question.append(
            note(comparisons[key]),
            buttons(
              [0.5, 1, 2].map((ratio) => ({
                text: ratio + ' 倍',
                onClick: () => {
                  const points = valid[key];
                  const first = key === 'force' ? points.get(HANGERS[0] * GRAVITY) : points.get(1 / CARTS[0]);
                  const last = key === 'force' ? points.get(HANGERS[1] * GRAVITY) : points.get(1 / CARTS[2]);
                  const observed = last / first;
                  const expected = key === 'force' ? 2 : 0.5;
                  if (!(observed > 0) || Math.abs(observed / expected - 1) > 0.25)
                    return status('这两次读数的比值偏离较大。换纸带重测这两个条件，选相距更远的计数点以减小读尺误差。');
                  if (ratio !== expected) return status('用第二个条件的实测加速度除以第一个，再对照选项。');
                  question.hidden = true;
                  goal.done(key);
                  status(
                    '你的实测比值约为 ' +
                      observed.toFixed(2) +
                      '。' +
                      (key === 'force'
                        ? '车的质量相同，拉力约加倍，加速度也接近加倍。'
                        : '拉力近似相同，车的质量加倍，加速度约减半。'),
                  );
                },
              })),
            ).el,
          );
          question.hidden = true;
          questions[key] = question;
        }
        graphs = plots.force.el;
        probe = probePaper((choice) => {
          const expected = Math.abs(run.a) < 1e-8 ? 1 : run.a < 0 ? 0 : 2;
          if (choice === 1) {
            balanced = expected === 1;
            if (balanced) goal.done('balanced');
            modeSeg.set(1, true);
            status(balanced ? '点距相等，挂上槽码后可以测量。' : '仍有点距变化，本轮将保留为未补偿对照。');
          } else adjustLift(Math.max(0, Math.min(2, LIFTS.indexOf(lift) + (choice === 0 ? 1 : -1))));
        });
        reader = tapeReader(
          (sheet, t, v) => {
            const r = sheet.run;
            sheet.points.push([t, v]);
            if (sheet.points.length === 1) return status('已记下一个速度。选另一个时刻，再测一次。');
            sheet.complete = true;
            sheet.points.sort((p, q) => p[0] - q[0]);
            const [[t1, v1], [t2, v2]] = sheet.points;
            const a = (v2 - v1) / (t2 - t1);
            sheet.acceleration = a;
            const heavy = r.load / r.mass > 0.1;
            const condition = !r.balanced ? '未验证阻力补偿' : heavy ? '重槽码对照' : '已补偿 · 轻槽码';
            logs.add([
              String(sheet.trial),
              r.mass.toFixed(2),
              (r.load * GRAVITY).toFixed(3),
              t1.toFixed(2) + '→' + t2.toFixed(2),
              v1.toFixed(4) + '→' + v2.toFixed(4),
              a.toFixed(3),
              condition,
            ]);
            if (!r.balanced) return status('本轮已留在表内。先验证无牵引匀速，再把测量结果加入比较图。');
            const x = r.mode === 'force' ? r.load * GRAVITY : 1 / r.mass;
            plots[r.mode].series[heavy ? 1 : 0].points.push([x, a]);
            plots[r.mode].draw();
            if (heavy)
              return status(
                '重槽码对照：mg = ' +
                  x.toFixed(2) +
                  ' N，用实测 a 估算 T = m(g − a) ≈ ' +
                  (r.load * (GRAVITY - a)).toFixed(2) +
                  ' N。重力与拉力的差异已不能忽略。',
              );
            valid[r.mode].set(x, a);
            nextMode = mode === 'force' && valid.force.size >= 3;
            guide();
            if (valid[r.mode].size >= 3) {
              goal.undo(r.mode);
              questions[r.mode].hidden = false;
            }
            status(
              '纸带 ' +
                sheet.trial +
                ' 得到 a = ' +
                a.toFixed(3) +
                (questions[r.mode].hidden
                  ? ' m/s²。保持另一条件，换新纸带再比较。'
                  : ' m/s²。到下方图表比较两次测量的比值。'),
            );
          },
          status,
          (sheet) => {
            ui.go(1);
            ui.fold(false);
            (sheet.run.mode === 'mass' ? plots.mass : plots.force).el.scrollIntoView({ block: 'start' });
          },
        );
        modeSeg = seg('实验步骤', ['补偿阻力', '固定车质量', '固定槽码'], (_, i) => switchMode(i));
        liftSeg = seg(
          '木板右端垫高',
          LIFTS.map((v) => v + ' mm'),
          (_, i) => {
            if (lift !== LIFTS[i]) {
              lift = LIFTS[i];
              balanced = false;
            }
            prepare();
          },
        );
        cartSeg = seg(
          '小车和车上重物的总质量',
          CARTS.map((v) => v * 1000 + ' g'),
          (_, i) => {
            cartIndex = i;
            prepare();
          },
        );
        hangerSeg = seg(
          '悬挂总质量',
          HANGERS.map((v) => v * 1000 + ' g'),
          (_, i) => {
            hangerIndex = i;
            prepare();
          },
        );
        actions = buttons([
          {
            text: '',
            onClick: () =>
              mode === 'balance'
                ? finished
                  ? take()
                  : start()
                : finished && !powered
                  ? take()
                  : powered && !finished
                    ? start()
                    : timer(),
          },
          { text: '换新纸带', onClick: prepare },
          {
            text: '全部重做',
            ghost: true,
            onClick: () => {
              reader.clear();
              logs.clear();
              trial = 1;
              balanced = false;
              lift = 0;
              liftSeg.set(0);
              for (const key of ['force', 'mass']) {
                valid[key].clear();
                questions[key].hidden = true;
                plots[key].series.forEach((s) => (s.points.length = 0));
                plots[key].draw();
              }
              goal.undo('balanced', 'force', 'mass');
              modeSeg.set(0, true);
            },
          },
        ]);
        ui.controls.append(reader.el, auxiliary(modeSeg.el, liftSeg.el, cartSeg.el, hangerSeg.el, actions.el));
        ui.data.append(
          plots.force.el,
          questions.force,
          plots.mass.el,
          questions.mass,
          logs.el,
          note(
            '模型取轻绳和理想滑轮，向左运动的阻力与正压力成正比。纸带每隔 0.02 s 打一点，车抵达挡块后结束有效测量。',
          ),
        );
        switchMode(0);
      },
      update(dt) {
        if (!moving) return;
        advance(run, dt);
        rig.draw(run);
        if (run.t >= run.end) stop();
      },
      dispose() {
        reader?.dispose();
        probe?.dispose();
      },
    };
  },
};
