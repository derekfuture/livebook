import { buttons, chart, goals, note, seg, table } from './kit/ui.js';
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
    let ui, reader, modeSeg, liftSeg, cartSeg, hangerSeg, actions, goal, diagnosis;
    const status = (text) => ui?.status(text);
    const settings = () => ({ mode, lift, cartIndex, hangerIndex, balanced });
    let run = tractionRun(settings());
    function refresh() {
      rig.draw(run);
      if (!actions) return;
      const locked = moving || finished;
      MODES.forEach((_, i) => modeSeg.disable(i, moving));
      LIFTS.forEach((_, i) => liftSeg.disable(i, locked));
      CARTS.forEach((_, i) => cartSeg.disable(i, locked || mode !== 'mass'));
      HANGERS.forEach((_, i) => hangerSeg.disable(i, locked || mode !== 'force'));
      const [start, replace] = actions.btns;
      start.textContent = mode === 'balance' ? '轻推无牵引小车' : '通电并释放小车';
      start.disabled = locked;
      replace.disabled = !finished;
    }
    function prepare() {
      run = tractionRun(settings());
      moving = finished = false;
      if (diagnosis) diagnosis.el.hidden = true;
      rig.setPaperVisible(true);
      refresh();
    }
    function switchMode(index) {
      mode = MODES[index];
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
      power(run, true);
      moving = true;
      refresh();
      status(mode === 'balance' ? '小车已离手，纸带正在记录无牵引运动。' : '小车由静止释放，纸带正在记录运动。');
    }
    function stop() {
      power(run, false);
      moving = false;
      finished = true;
      refresh();
      if (mode === 'balance') {
        const marks = run.marks;
        const steps = [5, 10, 15].map((i) => ((marks[i].x - marks[i - 5].x) * 1000).toFixed(1));
        diagnosis.el.hidden = false;
        status('连续三个 0.10 s 的位移为 ' + steps.join('、') + ' mm。' + '这组点距告诉你该怎样调木板？');
        return;
      }
      if (reader.add(run, trial++)) {
        rig.setPaperVisible(false);
        status('取下了本轮纸带。对准 A、B 记录两个不同时刻的速度，用速度差除以时间差得到加速度。');
      } else status('小车未获得足够的有效打点。先回到无牵引试滑，检查木板高度。');
    }
    const pointer = draggable(rig.group, [], {
      tip: tag('', 'pill'),
      taps: [
        { obj: rig.cart, hint: '点小车开始本轮运动', onTap: start },
        {
          obj: rig.pan,
          hint: '力实验：点槽码更换悬挂质量',
          onTap: () => {
            if (mode === 'force' && !moving && !finished) hangerSeg.set((hangerIndex + 1) % HANGERS.length, true);
          },
        },
      ],
    });
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
        reader = tapeReader((sheet, t, v) => {
          const r = sheet.run;
          sheet.points.push([t, v]);
          if (sheet.points.length === 1) return status('已记下一个速度。选另一个时刻，再测一次。');
          sheet.complete = true;
          sheet.points.sort((p, q) => p[0] - q[0]);
          const [[t1, v1], [t2, v2]] = sheet.points;
          const a = (v2 - v1) / (t2 - t1);
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
        }, status);
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
          { text: '', onClick: start },
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
        diagnosis = buttons(
          ['再垫高', '已平衡', '降低右端'].map((text, i) => ({
            text,
            onClick: () => {
              const expected = Math.abs(run.a) < 1e-8 ? 1 : run.a < 0 ? 0 : 2;
              if (i !== expected) return status('再比较相邻时段的位移：越来越小表示补偿不足，越来越大表示过度。');
              balanced = i === 1;
              if (balanced) goal.done('balanced');
              diagnosis.el.hidden = true;
              status(
                balanced
                  ? '点距相等，补偿已验证。进入固定车质量或固定槽码的实验。'
                  : '判断正确。换新纸带，改变垫高量后试滑。',
              );
            },
          })),
        );
        ui.controls.append(modeSeg.el, liftSeg.el, cartSeg.el, hangerSeg.el, actions.el, diagnosis.el, reader.el);
        ui.data.append(
          plots.force.el,
          questions.force,
          plots.mass.el,
          questions.mass,
          logs.el,
          note('模型取轻绳和理想滑轮，向左运动的阻力与正压力成正比。纸带每隔 0.02 s 打一点，车抵达挡块后结束有效测量。'),
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
      },
    };
  },
};
