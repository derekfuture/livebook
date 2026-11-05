import { lessonBar } from './kit/lessonbar.js';
import { loadRack } from './kit/ticker/loadRack.js';
import { buttons, chart, note, seg, table } from './kit/ui.js';
import { draggable } from './kit/interact.js';
import { apparatus } from './kit/ticker/apparatus.js';
import { advance, power } from './kit/ticker/motion.js';
import { tapeReader } from './kit/ticker/reader.js';
import { CARTS, GRAVITY, HANGERS, tractionRun } from './kit/ticker/traction.js';

const MODES = ['balance', 'force', 'mass'];
const LIFTS = [0, 15, 30];

export default {
  id: 'newtoncart',
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
  create(ctx) {
    const { tag } = ctx;
    const rig = apparatus({ adjustable: true });
    let mode = 'balance',
      lift = 0,
      cartIndex = 0,
      hangerIndex = 0;
    let balanced = false,
      moving = false,
      finished = false,
      trial = 1;
    let ui, modeSeg, liftSeg, cartSeg, hangerSeg, actions;
    const valueLabel = tag('', 'pill');
    function target() {
      if (reader.inspecting) return null;
      if (moving || bar.finished) return null;
      if (mode === 'balance')
        return observed ? (Math.abs(run.a) < 1e-8 ? rack.drags[0].obj : rig.board) : finished ? rig.strip : rig.cart;
      if (taken && reader.canMeasureMore && reader.count < 2) return reader.paper;
      return taken ? rig.cart : finished ? (powered ? rig.timer : rig.strip) : powered ? rig.cart : rig.timer;
    }
    const bar = lessonBar({
      look: ctx.look,
      back: () => reader.leave(),
      group: rig.group,
      steps: [
        { id: 'balanced', title: '补偿阻力', todo: '轻推小车，观察纸带上的点距。', target },
        { id: 'force', title: '固定车质量', todo: '保持车质量，改变悬挂槽码，比较三条纸带。', target },
        { id: 'mass', title: '固定槽码', todo: '保持槽码不变，增减车载砝码，比较加速度。', target },
      ],
    });
    const reader = tapeReader(rig.group, ctx, bar, refresh);
    const rack = loadRack(
      rig,
      HANGERS,
      () => !moving && (!finished || mode === 'balance') && !cartIndex,
      (i) => {
        enter();
        if (mode !== 'force') {
          modeSeg.set(1, true);
        }
        hangerSeg.set(i, true);
      },
    );
    let taken = false,
      powered = false,
      observed = false;
    const enter = () => {
      if (ui && document.body.classList.contains('predicting')) ui.go(1);
    };
    function adjustLift(index) {
      if (moving || mode !== 'balance') return;
      enter();
      liftSeg.set(index, true);
    }
    const status = (text) => ui?.status(text);
    const settings = () => ({ mode, lift, cartIndex, hangerIndex, balanced });
    let run = tractionRun(settings());
    const forceMeasurements = new Map();
    const massMeasurements = new Map();
    function nextTrial() {
      if (!run.balanced) return '先回实验台，用无牵引试滑验证阻力已补偿。';
      if (mode === 'force') {
        const next = HANGERS.slice(0, 3).find((m) => !forceMeasurements.has(m * GRAVITY));
        if (next) return '拖回小车，保持车的质量，把 ' + Math.round(next * 1000) + ' g 槽码拖到挂钩。';
        return bar.has('force')
          ? '拖回小车，保持悬挂槽码，把台上的砝码拖上车。'
          : '已测三种悬挂质量。展开笔记本，读图比较 10 g 与 20 g 的加速度。';
      }
      const set = massMeasurements.get(run.load);
      const next = CARTS.find((m) => !set?.has(1 / m));
      if (next)
        return (
          '拖回小车，保持槽码不变，' +
          (next > run.mass ? '从台面往车上加砝码' : '从车上取下砝码') +
          '，使车总质量为 ' +
          Math.round(next * 1000) +
          ' g。'
        );
      return '已测三种车质量。展开笔记本，读图比较 500 g 与 1000 g 的加速度。';
    }
    function refresh() {
      rig.draw(run);
      rack.draw(run.load);
      if (mode === 'balance') valueLabel.loc(rig.board, 0.31, 0.032, 0.05).text('垫高 ' + lift + ' mm');
      else
        valueLabel
          .loc(rig.cart, 0, 0.08, 0)
          .text('车 ' + CARTS[cartIndex] * 1000 + ' g · 悬挂 ' + HANGERS[hangerIndex] * 1000 + ' g');
      valueLabel.show(!moving);
      bar.say(
        bar.finished
          ? null
          : reader.inspecting
            ? mode !== 'balance' && reader.count >= 2
              ? '回实验台。' + nextTrial()
              : reader.instruction
            : moving
              ? '观察小车和纸带。'
              : mode === 'balance'
                ? finished
                  ? run.marks.length < 16
                    ? '试滑太短，拖回小车再推一次。'
                    : observed
                      ? Math.abs(run.a) < 1e-8
                        ? '点距相等，把一组槽码拖到左端挂钩。'
                        : '点距在变化，调整木板右端再试滑。'
                      : '取下试滑纸带，比较三段点距。'
                  : '向左轻推小车，松手后比较点距。'
                : taken
                  ? reader.canMeasureMore && reader.count < 2
                    ? '点台面上刚取下的纸带，沿尺量两个时刻。'
                    : reader.count >= 2
                      ? nextTrial()
                      : '纸带打点不足。拖回小车，换纸带重新测。'
                  : finished
                    ? powered
                      ? '关计时器，再取纸带。'
                      : '取下纸带，测两个时刻的速度。'
                    : powered
                      ? '计时器已通电，松开小车。'
                      : '开计时器，再松开小车。',
      );
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
      reader.stow();
      observed = false;
      rig.setPaperVisible(true);
      refresh();
    }
    function switchMode(index, fixedHanger = 1) {
      if (mode === 'balance' && index !== 0 && observed) {
        balanced = Math.abs(run.a) < 1e-8;
        if (balanced) bar.done('balanced');
      }
      mode = MODES[index];
      cartIndex = 0;
      hangerIndex = mode === 'mass' ? fixedHanger : 0;
      cartSeg.set(cartIndex);
      hangerSeg.set(hangerIndex);
      hangerSeg.el.hidden = mode === 'balance';
      prepare();
      status(
        [
          '摘掉槽码，轻推小车。观察相邻 0.10 s 的位移是否相等。',
          '固定车和车上重物的总质量为 500 g，改变悬挂质量。',
          '悬挂质量固定为 ' + HANGERS[hangerIndex] * 1000 + ' g，把台上的砝码放到小车上。',
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
        if (run.marks.length >= 16) {
          observed = true;
          reader.trialStrip(run.marks);
          bar.say(
            Math.abs(run.a) < 1e-8
              ? '点距相等。返回后，把槽码拖到左端挂钩。'
              : run.a < 0
                ? '点距减小。返回后，把木板右端往上拖，再试滑。'
                : '点距增大。返回后，把木板右端往下拖，再试滑。',
          );
        } else prepare();
        return;
      }
      if (powered) return status('先关计时器。');
      taken = true;
      if (reader.add(run, trial++)) {
        rig.setPaperVisible(false);
        status('取下了本轮纸带。对准 A、B 记录两个不同时刻的速度，用速度差除以时间差得到加速度。');
      } else status('纸带缺少连续打点。检查是否通电及木板高度。');
      refresh();
    }
    let dragLift = 0,
      pushStart = 0,
      stroke = 0,
      returnPosition = 0;
    // 砝码和车身分别拾取。落在车顶才装车，落回台面才卸下。
    const weightDrags = rig.ballast.map((weight) => {
      let loaded;
      function transfer() {
        const count = cartIndex,
          from = rig.ballast.indexOf(weight),
          to = loaded ? count - 1 : count;
        [rig.ballast[from], rig.ballast[to]] = [rig.ballast[to], rig.ballast[from]];
        if (mode !== 'mass') {
          modeSeg.set(2);
          switchMode(2, hangerIndex);
        }
        cartSeg.set(count + (loaded ? -1 : 1), true);
        status('车总质量 ' + CARTS[cartIndex] * 1000 + ' g，悬挂质量仍为 ' + HANGERS[hangerIndex] * 1000 + ' g。');
      }
      return {
        obj: weight,
        plane: 'xy',
        offset: 0.06,
        keepOffset: true,
        enabled: () => mode !== 'balance' && !moving && (!finished || taken),
        hint: () => (weight.parent === rig.cart ? '250 g 砝码：拖回台面' : '250 g 砝码：拖到小车上'),
        onStart: () => {
          loaded = weight.parent === rig.cart;
          rig.group.attach(weight);
        },
        onDrag: (p) => {
          weight.position.set(p.x, Math.max(0.0045, p.y), 0.12 * (1 - Math.min(1, Math.max(0, p.y) / 0.47)));
        },
        onEnd: (moved) => {
          if (!moved) {
            refresh();
            return;
          }
          const car = rig.group.worldToLocal(rig.cart.getWorldPosition(rig.cart.position.clone()));
          const onCar = Math.abs(weight.position.x - car.x) < 0.07 && Math.abs(weight.position.y - car.y - 0.05) < 0.07;
          if ((!loaded && onCar) || (loaded && weight.position.y < 0.08)) transfer();
          else refresh();
        },
      };
    });
    const pointer = draggable(
      rig.group,
      [
        reader.drag,
        ...weightDrags,
        ...rack.drags,
        {
          obj: rig.cart,
          plane: 'xy',
          offset: 0,
          enabled: () => !moving && (!finished || taken || (mode === 'balance' && run.marks.length < 16)),
          hint: () =>
            finished
              ? '把小车向右拖回起点，装上新纸带'
              : mode === 'balance'
                ? '沿木板向左推，松手后观察点距'
                : '点车身松开小车',
          onStart: () => {
            enter();
            pushStart = performance.now();
            stroke = 0;
            returnPosition = run.x;
          },
          onDrag: (point, from) => {
            if (!from) return;
            if (finished) {
              returnPosition = Math.max(0, Math.min(run.x, run.x - (point.x - from.x)));
              rig.draw({ ...run, x: returnPosition });
              return;
            }
            if (mode !== 'balance') return;
            stroke = Math.max(0, Math.min(0.055, from.x - point.x));
            run.startOffset = stroke;
            rig.draw(run);
          },
          onEnd: (moved) => {
            if (!moved) return;
            if (finished) {
              if (returnPosition < 0.04) prepare();
              else refresh();
              return;
            }
            if (mode !== 'balance') return;
            if (stroke < 0.002) {
              prepare();
              return;
            }
            const speed = stroke / Math.max(0.02, (performance.now() - pushStart) / 1000);
            run = tractionRun({ ...settings(), pushSpeed: speed, startOffset: stroke });
            start();
          },
          onTap: () => {
            if (!finished && mode !== 'balance') start();
          },
        },
        {
          obj: rig.board,
          plane: 'xy',
          offset: 0,
          enabled: () => mode === 'balance' && !moving,
          hint: '上下拖木板右端，调整垫高量',
          onStart: () => {
            dragLift = lift;
          },
          onDrag: (p, from) => {
            if (from) {
              const i = Math.max(0, Math.min(2, Math.round((dragLift + (p.y - from.y) * 1000) / 15)));
              if (LIFTS[i] !== lift) adjustLift(i);
            }
          },
        },
      ],
      {
        highlight: true,
        taps: [
          {
            obj: rig.timer,
            enabled: () => mode !== 'balance' && !taken && (!finished || powered),
            hint: '开关计时器',
            onTap: timer,
          },
          { obj: rig.strip, enabled: () => finished && !taken, hint: '点纸带近看', onTap: take },
        ],
      },
    );
    refresh();
    return {
      group: rig.group,
      size: { w: 0.94, d: 0.42, h: 0.55 },
      view: { elev: 18, azim: -10, lookY: 0.55, margin: 1.02 },
      pointer,
      toggles: ['steps'],
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        const logs = table(['带号', 'M / kg', 'mg / N', 't₁→t₂ / s', 'v₁→v₂ / (m/s)', 'a / (m/s²)', '条件']);
        logs.el.style.overflowX = 'auto';
        logs.el.hidden = true;
        const plots = {};
        let questionLoad;
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
                : '横轴为车总质量的倒数。蓝绿 10 g，赭红 20 g，紫色 30 g，灰色 150 g。',
          });
        }
        for (const key of ['force', 'mass']) {
          if (key === 'mass')
            plots.mass.series = ['#176e74', '#b35430', '#765490', '#667080'].map((color) => ({
              color,
              points: [],
              line: false,
              dots: true,
            }));
          plots[key].el.hidden = true;
          const question = document.createElement('div');
          question.append(
            note(comparisons[key]),
            buttons(
              [0.5, 1, 2].map((ratio) => ({
                text: ratio + ' 倍',
                onClick: () => {
                  const points = key === 'mass' ? massMeasurements.get(questionLoad) : forceMeasurements;
                  const first = key === 'force' ? points.get(HANGERS[0] * GRAVITY) : points.get(1 / CARTS[0]);
                  const last = key === 'force' ? points.get(HANGERS[1] * GRAVITY) : points.get(1 / CARTS[2]);
                  const observed = last / first;
                  const expected = key === 'force' ? 2 : 0.5;
                  if (!(observed > 0) || Math.abs(observed / expected - 1) > 0.25)
                    return status('这两次读数的比值偏离较大。换纸带重测这两个条件，选相距更远的计数点以减小读尺误差。');
                  if (ratio !== expected) return status('用第二个条件的实测加速度除以第一个，再对照选项。');
                  question.hidden = true;
                  bar.done(key);
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
        reader.bind(
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
            logs.el.hidden = false;
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
            plots[r.mode].el.hidden = false;
            const seriesIndex = r.mode === 'mass' ? HANGERS.indexOf(r.load) : Number(heavy);
            plots[r.mode].series[seriesIndex].points.push([x, a]);
            plots[r.mode].draw();
            if (heavy)
              return status(
                '重槽码对照：mg = ' +
                  (r.load * GRAVITY).toFixed(2) +
                  ' N，用实测 a 估算 T = m(g − a) ≈ ' +
                  (r.load * (GRAVITY - a)).toFixed(2) +
                  ' N。重力与拉力的差异已不能忽略。',
              );
            if (r.mode === 'mass' && !massMeasurements.has(r.load)) massMeasurements.set(r.load, new Map());
            const set = r.mode === 'mass' ? massMeasurements.get(r.load) : forceMeasurements;
            set.set(x, a);
            if (set.size >= 3) {
              if (r.mode === 'mass') {
                questionLoad = r.load;
                questions.mass.firstElementChild.textContent =
                  '固定 ' + r.load * 1000 + ' g 槽码，小车从 500 g 加至 1000 g，加速度接近原来的多少？';
              }
              bar.undo(r.mode);
              questions[r.mode].hidden = false;
              bar.say(
                r.mode === 'force'
                  ? '已测三种悬挂质量。展开笔记本读图，或拖回小车，保持槽码不变再加车载砝码。'
                  : '已测三种车质量。展开笔记本，比较加速度图上的点。',
              );
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
          (sheet) => {
            ui.go(1);
            ui.fold(false);
            const target = sheet.run.balanced ? plots[sheet.run.mode].el : logs.el;
            target.scrollIntoView({ block: 'start' });
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
              massMeasurements.clear();
              forceMeasurements.clear();
              logs.el.hidden = true;
              trial = 1;
              balanced = false;
              lift = 0;
              liftSeg.set(0);
              for (const key of ['force', 'mass']) {
                plots[key].el.hidden = true;
                questions[key].hidden = true;
                plots[key].series.forEach((s) => (s.points.length = 0));
                plots[key].draw();
              }
              bar.undo('balanced', 'force', 'mass');
              modeSeg.set(0, true);
            },
          },
        ]);
        ui.controls.append(modeSeg.el);
        ui.notes.append(
          note('向左推小车，点纸带比较点距。拖木板右端调整高度；把槽码拖到滑轮下方，把台上的砝码拖到车顶。'),
          liftSeg.el,
          cartSeg.el,
          hangerSeg.el,
          actions.el,
          reader.el,
        );
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
        bar.update(dt);
        if (!moving) return;
        advance(run, dt);
        rig.draw(run);
        if (run.t >= run.end) stop();
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
