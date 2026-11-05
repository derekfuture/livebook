// 必修二图5.3-3：挡板决定哪一个位置被印到背板上，等时水平位移取自学生的描线。
import {
  projectilePaperRig,
  EXIT_X,
  EXIT_Y,
  RAMP_LENGTH,
  BALL_R,
  PAPER_LEFT,
  PAPER_TOP,
  PAPER_W,
  PAPER_H,
  PAPER_Z,
  rampY,
} from './kit/projectilePaperRig.js';
import { printAtDrop, rollingExitSpeed, tracedX, TIME_STEP, fallDistance } from './kit/projectileTrack.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { buttons, table, note, h } from './kit/ui.js';

const levels = [1, 2, 3].map((n) => fallDistance(n * TIME_STEP));
export default {
  id: 'projectilepaper',
  fig: '图5.3-3',
  title: '用落点探究平抛的水平分运动',
  stampText: '探究',
  predict: {
    q: '钢球每次从斜槽的同一处静止释放。在相等的下落时间里，水平位移怎样变化？',
    options: ['每段相等', '每段增加', '每段减少'],
    answer: 0,
    hint: '竖直方向自由下落，能由落差找到等时间隔。',
  },
  conclusion: {
    quote: '在实验误差范围内，相等时间内水平位移相等，平抛的水平分运动是匀速直线运动。',
    why: '从同一位置静止释放，使各次离槽水平速度相同。由自由落体的落差找出等时刻，在实测轨迹上读出三个水平位置，以相邻读数之差比较分段位移。',
    src: '人教版高中物理必修第二册第 11–12 页，步骤 2',
  },
  create(ctx) {
    const rig = projectilePaperRig(),
      { group, ball, paper, handle, baffle, ruleBar } = rig;
    let ui,
      rows,
      finishForm,
      view,
      aim,
      origin,
      carbon,
      drop,
      release,
      marks,
      trace,
      traced,
      readings,
      reader,
      shot,
      draggingBall,
      traceActive;
    let grab, grabX;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'origin', title: '定原点', todo: '在背板上标出槽口球心的位置，再铺好复写纸。', target: () => aim },
        { id: 'print', title: '留下落点', todo: '调节挡板，每次从同一位置放球，印出多个位置。', target: () => aim },
        { id: 'curve', title: '描轨迹', todo: '收起复写纸，沿白纸上的实际印迹描出轨迹。', target: () => aim },
        { id: 'equal', title: '比较等时位移', todo: '用落差找到等时刻，读水平位移并比较。', target: () => aim },
      ],
    });
    const say = (s, obj) => {
      aim = obj;
      bar.say(s);
    };
    const valid = () => marks.filter((m) => m.valid);
    function heights() {
      const sorted = valid().map((m) => m.drop).sort((a, b) => a - b);
      const distinct = [];
      for (const d of sorted) {
        if (!distinct.length || d - distinct.at(-1) >= 0.004) distinct.push(d);
      }
      return distinct;
    }
    const parked = () => drop >= 0.207;
    function enough() {
      const drops = heights();
      return (
        drops.length >= 5 &&
        drops[0] <= 0.021 &&
        drops.at(-1) >= levels[2] &&
        drops.every((v, i) => i === 0 || v - drops[i - 1] <= 0.058)
      );
    }
    function render() {
      rig.ink(origin, marks, trace, readings);
      rig.setReader(reader, traced);
    }
    function leave() {
      ctx.back();
      view = null;
      bar.near(false);
      guide();
    }
    function near() {
      view = 'paper';
      bar.near(true);
      ctx.look([EXIT_X + 0.065, EXIT_Y - 0.069, PAPER_Z], [0, 0, 1], ctx.camera.aspect >= 1 ? 0.6 : 0.42, leave);
      guide();
    }
    function guide() {
      if (bar.finished) return say('三个等时间隔的水平位移已记录。笔记本里保留了你的落点和比较结果。');
      if (!origin)
        return say(
          view ? '点白纸上与槽口钢球中心重合的位置，定为 O。' : '点白纸近看。钢球还在槽口，在球心对应处标出坐标原点。',
          view ? null : paper,
        );
      if (shot) return say('观察钢球离槽、碰挡板和压纸的位置。');
      if (!traced) {
        if (enough() && carbon > 0.05)
          return say('把复写纸下夹条右侧的木柄向上推，露出白纸上的印迹。', handle);
        if (enough() && !parked()) return say('把挡板沿支架降到底，给白纸上的印迹腾出描线位置。', baffle);
        if (enough())
          return say(
            view ? '从 O 起笔，沿印迹向右下描一条平滑轨迹。' : '点白纸近看，从 O 起笔沿印迹描线。',
            view ? null : paper,
          );
        if (carbon < 0.98) return say('把蓝黑色复写纸的下夹条拖到底，盖在已标好原点的白纸上。', handle);
        if (release === null) return say('把钢球沿斜槽拖到较高处，松手让它自己滚下。', ball);
        if (valid().some((m) => Math.abs(m.drop - drop) < 0.004)) {
          const ys = heights();
          const bounds = [0, ...ys, Math.max(levels[2] + 0.004, ys.at(-1))];
          let widest = 1;
          for (let i = 2; i < bounds.length; i++)
            if (bounds[i] - bounds[i - 1] > bounds[widest] - bounds[widest - 1]) widest = i;
          const target = ys[0] > 0.021 ? 0.015 : ys.at(-1) < levels[2]
            ? levels[2] + 0.005 : (bounds[widest] + bounds[widest - 1]) / 2;
          const hint = '沿右侧尺把挡板移到 O 下约 ' + (target * 100).toFixed(1) + ' cm';
          return say('已留下 ' + ys.length + ' 个不同高度的点。' + hint + '，再把球拖回原释放标记。', baffle);
        }
        return say('把球拖回槽上的赭色标记再松手，保持相同的释放高度。', ball);
      }
      if (readings.length === 3) return say('展开笔记本，比较三段 0.05 s 内的水平位移。');
      const t = (readings.length + 1) * TIME_STEP,
        y = levels[readings.length];
      return say(
        (view ? '' : '点白纸近看。') +
          't = ' +
          t.toFixed(2) +
          ' s 时落差约 ' +
          (y * 100).toFixed(2) +
          ' cm。拖横尺到这个落差，在描线与尺边相交处读水平刻度。',
        view ? ruleBar : paper,
      );
    }
    function launch(x) {
      const height = rampY(x) - EXIT_Y;
      if (height >= 0.01 && release === null) {
        release = x;
        rig.releaseMark.position.set(x, rampY(x) - BALL_R - 0.002, PAPER_Z + BALL_R);
        rig.releaseMark.visible = true;
      }
      const points = [{ x, y: rampY(x), t: 0 }];
      for (let i = 1; i <= 80; i++) {
        const u = x + ((EXIT_X - x) * i) / 80,
          y = rampY(u),
          prev = points[i - 1];
        const v0 = rollingExitSpeed(Math.max(0, rampY(x) - prev.y)),
          v1 = rollingExitSpeed(Math.max(0, rampY(x) - y));
        points.push({ x: u, y, t: prev.t + (2 * Math.hypot(u - prev.x, y - prev.y)) / (v0 + v1) });
      }
      const m = printAtDrop(height, drop);
      shot = { points, height, m, t: 0, printed: false, valid: release !== null && Math.abs(x - release) <= 0.0025 };
      guide();
    }
    function drawStroke(p) {
      const q = { x: p.x - EXIT_X, drop: EXIT_Y - p.y };
      if (q.x < -0.006 || q.drop < -0.006) return;
      const last = trace.at(-1);
      if (!last || Math.hypot(last.x - q.x, last.drop - q.drop) > 0.0015) {
        trace.push(q);
        render();
      }
    }
    function checkTrace() {
      const ms = valid();
      if (trace.length < 7 || Math.hypot(trace[0].x, trace[0].drop) > 0.008)
        return say('从 O 开始描。抬手后可以接着线尾继续。');
      if (!ms.every((m) => trace.some((q) => Math.hypot(q.x - m.x, q.drop - m.drop) < 0.009)))
        return say('还有印迹没有连到；可沿线尾继续，或从 O 重新描。');
      if (!levels.every((d) => tracedX(trace, d) !== null)) return say('将轨迹描到最下方的实测点。');
      // 检查笔迹没有折返或绕离同一组印迹。
      const order = [{ x: 0, drop: 0 }, ...ms.sort((a, b) => a.drop - b.drop)];
      if (
        trace.some(
          (q, i) =>
            i &&
            (q.drop < trace[i - 1].drop - 0.003 ||
              q.x < trace[i - 1].x - 0.003 ||
              (tracedX(order, q.drop) !== null && Math.abs(q.x - tracedX(order, q.drop)) > 0.018)),
        )
      )
        return say('轨迹有折返或明显偏离落点。从 O 重新连线。');
      traced = true;
      bar.done('curve');
      render();
      guide();
    }
    function paperTap(p) {
      if (!view) {
        near();
        return;
      }
      if (!origin) {
        if (Math.hypot(p.x - EXIT_X, p.y - EXIT_Y) > 0.008) return say('原点应取槽口处的球心。');
        origin = true;
        render();
        leave();
        return;
      }
      if (!traced || readings.length >= 3) return guide();
      const d = levels[readings.length],
        x = p.x - EXIT_X,
        cross = tracedX(trace, reader);
      if (Math.abs(reader - d) > 0.0016) return say('横尺还没有对准这一时刻的落差。', ruleBar);
      if (cross === null || Math.abs(x - cross) > 0.0028 || Math.abs(EXIT_Y - p.y - reader) > 0.003)
        return say('沿横尺找与自己的轨迹相交处，再读水平刻度。');
      const mm = Math.round(x * 1000),
        previous = readings.at(-1)?.x || 0;
      readings.push({ x: mm / 1000, drop: reader });
      rows.add([
        (TIME_STEP * readings.length).toFixed(2),
        (reader * 100).toFixed(2),
        (mm / 10).toFixed(1),
        ((mm / 1000 - previous) * 100).toFixed(1),
      ]);
      if (readings.length === 3) {
        finishForm.hidden = false;
        leave();
      }
      render();
      guide();
    }
    let penDown;
    const manip = draggable(
      group,
      [
        {
          obj: handle,
          plane: 'xy',
          offset: PAPER_Z + 0.002,
          enabled: () => origin && !shot && !traced,
          hint: '上下移动复写纸的下夹条',
          onStart() {
            grab = carbon;
          },
          onDrag(p, start) {
            if (!start) return;
            carbon = clamp(grab + (start.y - p.y) / PAPER_H, 0, 1);
            rig.setCarbon(carbon);
          },
          onEnd() {
            if (carbon > 0.96) {
              carbon = 1;
              bar.done('origin');
            } else if (carbon < 0.06) carbon = 0;
            rig.setCarbon(carbon);
            guide();
          },
        },
        {
          obj: baffle,
          plane: 'xy',
          offset: 0.034,
          enabled: () => origin && !shot && !traced,
          hint: '上下拖动挡板，改变取点高度',
          onStart() {
            grab = drop;
          },
          onDrag(p, start) {
            if (!start) return;
            drop = clamp(grab + start.y - p.y, 0.009, EXIT_Y - PAPER_TOP + PAPER_H - BALL_R);
            if (marks.length && ball.position.x > EXIT_X) rig.placeBall(ball.position.x, EXIT_Y - drop);
            rig.setDrop(drop);
          },
          onEnd: guide,
        },
        {
          obj: ball,
          plane: 'xy',
          offset: PAPER_Z + BALL_R,
          enabled: () => origin && carbon > 0.98 && !shot && !traced,
          hint: '将钢球拖回斜槽，从同一标记松手',
          onStart() {
            draggingBall = false;
            grabX = ball.position.x;
          },
          onDrag(p) {
            draggingBall = true;
            grabX = p.x;
            if (p.x <= EXIT_X) {
              grabX = clamp(p.x, EXIT_X - RAMP_LENGTH, EXIT_X);
              rig.placeBall(grabX, rampY(grabX));
            } else rig.placeBall(p.x, clamp(p.y, PAPER_TOP - PAPER_H + BALL_R, EXIT_Y + 0.06));
          },
          onEnd() {
            if (!draggingBall) return;
            if (grabX >= EXIT_X) {
              rig.placeBall(EXIT_X, EXIT_Y);
              return guide();
            }
            launch(grabX);
          },
        },
        {
          obj: rig.ruler,
          plane: 'xy',
          offset: PAPER_Z + 0.001,
          enabled: () => traced && readings.length < 3,
          hint: '拖横尺到所需落差',
          onStart() {
            grab = reader;
          },
          onDrag(p, start) {
            if (start) {
              reader = clamp(grab + start.y - p.y, 0, 0.189);
              rig.setReader(reader, true);
            }
          },
          onEnd: guide,
        },
        {
          obj: ruleBar,
          plane: 'xy',
          offset: PAPER_Z + 0.001,
          enabled: () => traced && readings.length < 3,
          hint: '上下拖横尺；点它与轨迹的交点读数',
          onStart(p) {
            grab = reader;
            penDown = p?.clone();
          },
          onDrag(p, start) {
            if (start) {
              reader = clamp(grab + start.y - p.y, 0, 0.189);
              rig.setReader(reader, true);
            }
          },
          onEnd(moved) {
            if (moved) guide();
          },
          onTap() {
            if (penDown) paperTap(penDown);
          },
        },
        {
          obj: paper,
          plane: 'xy',
          offset: PAPER_Z,
          enabled: () => !shot && carbon < 0.06 && !bar.finished,
          hint: '近看或在白纸上作图',
          onStart(p) {
            penDown = p?.clone();
            traceActive = !!(view && origin && enough() && parked() && !traced && p);
            if (traceActive) {
              if (!trace.length || Math.hypot(p.x - EXIT_X - trace.at(-1).x, EXIT_Y - p.y - trace.at(-1).drop) > 0.012)
                trace = [];
              drawStroke(p);
            }
          },
          onDrag(p) {
            if (traceActive) drawStroke(p);
          },
          onEnd(moved) {
            if (traceActive && moved) checkTrace();
            traceActive = false;
          },
          onTap() {
            if (penDown) paperTap(penDown);
          },
        },
      ],
      { highlight: true },
    );
    function reset() {
      if (view) leave();
      origin = traced = draggingBall = false;
      carbon = 0;
      drop = 0.045;
      release = shot = null;
      reader = 0.006;
      marks = [];
      trace = [];
      readings = [];
      rig.releaseMark.visible = false;
      rig.placeBall(EXIT_X, EXIT_Y);
      rig.setDrop(drop);
      rig.setCarbon(0);
      render();
      rows?.clear();
      if (finishForm) finishForm.hidden = true;
      bar.undo('origin', 'print', 'curve', 'equal');
      guide();
    }
    reset();
    return {
      group,
      size: { w: 0.43, h: 0.31, d: 0.115 },
      view: { azim: 8, elev: 15, margin: 1.09, lookY: 0.47 },
      toggles: ['steps'],
      pointer: {
        ...manip,
        down(ray, e) {
          if (document.body.classList.contains('predicting')) ui?.go(1);
          return manip.down(ray, e);
        },
      },
      mount(panel) {
        ui = panel;
        bar.attach(panel);
        rows = table(['t / s', '落差 / cm', 'x / cm', '本段 Δx / cm']);
        const answer = (equal) => {
          if (readings.length !== 3) return;
          if (!equal) return say('请比较最后一列：第一段从 O 算起，后两段要把相邻两次水平读数相减。');
          const dx = readings.map((r, i) => r.x - (readings[i - 1]?.x || 0));
          if (Math.max(...dx) - Math.min(...dx) > 0.009) {
            readings = [];
            traced = false;
            trace = [];
            bar.undo('curve');
            rows.clear();
            finishForm.hidden = true;
            render();
            return say('三段差别偏大。请保留这张白纸，从 O 沿印迹重新描线，再对准尺边读数。');
          }
          bar.done('equal');
          finishForm.hidden = true;
          guide();
        };
        finishForm = h(
          'div',
          {},
          note('比较三个相等时间内的 Δx。在读数误差内，水平运动符合哪一种？'),
          buttons([
            { text: '匀速', onClick: () => answer(true) },
            { text: '匀加速', onClick: () => answer(false) },
          ]).el,
        );
        finishForm.hidden = true;
        panel.data.append(rows.el, finishForm);
        panel.notes.append(
          note(
            '球心离开水平槽口处为 O。水平挡板的截面朝复写纸倾斜，球与挡板首次接触的位置在纸上留下印迹。用竖直方向 y = gt²/2 选等时刻，g 取 9.8 m/s²。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        if (!shot) return;
        const s = shot;
        s.t += dt;
        const last = s.points.at(-1),
          fly = s.t - last.t;
        if (fly < 0) {
          const end = s.points.findIndex((q) => q.t >= s.t);
          const a = s.points[Math.max(0, end - 1)],
            b = s.points[end];
          const f = b.t === a.t ? 0 : (s.t - a.t) / (b.t - a.t);
          rig.placeBall(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f);
          return;
        }
        if (fly < s.m.t) {
          rig.placeBall(EXIT_X + rollingExitSpeed(s.height) * fly, EXIT_Y - fallDistance(fly));
          return;
        }
        if (!s.printed) {
          s.printed = true;
          marks.push({ ...s.m, valid: s.valid });
          render();
          if (enough()) bar.done('print');
        }
        const drift = Math.min(fly - s.m.t, 0.22),
          travel = rollingExitSpeed(s.height) * drift * (1 - drift / 0.44);
        rig.placeBall(Math.min(PAPER_LEFT + PAPER_W - 0.02, EXIT_X + s.m.x + travel), EXIT_Y - s.m.drop);
        if (drift >= 0.22) {
          shot = null;
          if (release === null) say('已留下一个低速试放点。把球沿斜槽再推高一些，让后面的印迹容易分开。', ball);
          else if (!s.valid) say('这次从不同位置释放，印迹保留作对照。拖回原标记，再测这一高度。', ball);
          else guide();
        }
      },
      dispose() {
        manip.dispose();
        bar.dispose();
      },
    };
  },
};
