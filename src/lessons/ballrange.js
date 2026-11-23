import { ballRangeRig, LIP, PAPER_Y, CY, PAN_X, PAN_Y, FLAT, LENGTH, trackHeight } from './kit/ballRangeRig.js';
import { rangeShot, BALL_MASSES, BALL_RADIUS as R } from './kit/ballRange.js';
import { rollingExitSpeed } from './kit/projectileTrack.js';
import { lessonBar } from './kit/lessonbar.js';
import { draggable, clamp } from './kit/interact.js';
import { table, note, h, buttons } from './kit/ui.js';

export default {
  id: 'ballrange',
  fig: '图1.4-5',
  title: '用两球落点验证动量守恒',
  stampText: '验证',
  predict: {
    q: '两球从同一水平槽口飞出，怎样利用地上的落点比较碰撞前后的动量？',
    options: ['将球的质量乘以它的水平射程', '只把碰后的两段射程相加', '比较两球谁先落地'],
    answer: 0,
    hint: '球的落差相同，离槽时竖直分速度都是零。',
  },
  conclusion: {
    page: 24, rect: [68.5, 131.46, 520.69, 193.54],
    quote: '在这个实验中也可以不测量速度的具体数值。做平抛运动的小球落到地面，它们的下落高度相同，飞行时间也就相同。因此，小球碰撞后的速度之比就等于它们落地时飞行的水平距离之比。根据这一思路，也可以验证动量守恒定律。',
    why: '在水平槽口做对心碰撞。两球的飞行时间相同，由 v = x/t，可用 m₁x₀ 与 m₁x₁ + m₂x₂ 比较碰前和碰后总动量。同组两次要让重球从相同位置静止滚下。',
    src: '课本第 20 页 · 第一章 第4节 实验：验证动量守恒定律',
  },
  create(ctx) {
    const rig = ballRangeRig(),
      { group, balls, scale, paper, screen, notch } = rig;
    let attached, pan, weights, origin, marks, base, after, shot, near, rows, form, fields, evidence, aim, ui, history;
    let sample, dragging, startScale, fromLip;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'setup', title: '称球定原点', todo: '分别称两球质量，沿铅垂线在纸上定 O。', target: () => aim },
        { id: 'solo', title: '量碰前射程', todo: '先让重球单独滚下，测量它飞出的水平距离。', target: () => aim },
        { id: 'hit', title: '量碰后射程', todo: '放轻球，从原标记放重球，测两个落点。', target: () => aim },
        { id: 'verify', title: '检验动量', todo: '换一个释放位置，再用实测质量与射程检验。', target: () => aim },
      ],
    });
    const say = (s, o) => {
      aim = near ? null : o;
      bar.say(s);
    };
    const ink = () => rig.ink(origin, marks);
    const aligned = () =>
      origin !== null &&
      Math.abs(scale.position.x + 0.2 - origin) < 0.0016 &&
      Math.abs(scale.position.z - 0.022) < 0.002;
    const current = () => [base?.dot, ...(after?.dots || [])].filter(Boolean);
    function nextMark() {
      return current().find((m) => m.read === null);
    }
    function updateForm() {
      if (!form) return;
      form.hidden = !(
        weights.every(Boolean) &&
        origin !== null &&
        base &&
        after &&
        current().every((m) => m.read !== null) &&
        !after.saved
      );
      const mass = weights.map((v, i) => (v ? (i ? '轻' : '重') + '球 ' + v + ' g' : '')).filter(Boolean);
      const distances = current()
        .filter((m) => m.read !== null)
        .map((m) => m.name + ' ' + m.read + ' mm');
      evidence.textContent = [...mass, ...distances].join('；');
    }
    function leave() {
      ctx.back();
      near = null;
      bar.near(false);
      guide();
    }
    function focus(key, x, y, z, dist) {
      near = key;
      bar.near(true);
      ctx.look([x, y, z], [0, 1, 0.025], dist, leave);
      guide();
    }
    function guide() {
      if (shot) return say('观察重球到达槽口，以及球第一次接触记录纸的位置。');
      if (near === 'mass') return say('电子秤显示的是现在放在盘中的球的质量。回全景继续。');
      if (weights.some((v) => !v))
        return say(
          '把' + (!weights[0] ? '深色重球' : '浅色轻球') + '单独拖到右侧电子秤上，称好后取下，再称另一只。',
          balls[weights[0] ? 1 : 0],
        );
      if (origin === null)
        return say(
          near ? '在铅垂线尖端正下方点纸，留下水平射程的零线 O。' : '点铅垂线下面的白纸近看，标出槽口的竖直投影。',
          paper,
        );
      if (after?.saved) {
        const result = '碰前 ' + after.before.toFixed(1) + '、碰后 ' + after.following.toFixed(1) + ' g·cm。';
        if (!after.valid)
          return say(
            result + '两次释放位置不同。放回轻球，把重球拖到原标记，重新测量。',
            attached ? balls[0] : balls[1],
          );
        return say(
          result +
            (history.length >= 2
              ? '两种释放高度都已检验。'
              : after.repeat
                ? '这组释放位置与上一组相近。换一个高度，先让重球单独滚下。'
                : '下一组换一个释放高度，先让重球单独滚下。'),
          history.length >= 2 ? null : balls[0],
        );
      }
      if (!base) return say('先留空槽口，把重球拖到斜槽较高处并松手。', balls[0]);
      if (nextMark()) {
        if (!aligned()) {
          if (Math.abs(scale.position.z - 0.022) < 0.005)
            return say('尺已靠近落点。沿纸边横移，把右端零刻线对准 O。', scale);
          return say('将台前的尺拖到落点旁，把零刻线对齐纸上的 O。', scale);
        }
        const mark = nextMark();
        return say(
          near
            ? '沿' + mark.name + '的黑色落点对到尺面，点它的毫米刻度。'
            : '点尺面近看，量' + mark.name + '的落点到 O 的距离。',
          scale,
        );
      }
      if (!after)
        return say(
          attached ? '重球拖回槽上的赭色释放标记再松手。' : '将浅色轻球放到水平槽口，再从原标记释放重球。',
          attached ? balls[0] : balls[1],
        );
      updateForm();
      say('三段射程已量好。展开笔记本，用质量乘射程比较碰前、碰后两项。');
    }
    function dock(i) {
      balls[i].position.set(0.104 + i * 0.026, PAPER_Y + R, 0.111);
    }
    function removeFromPan(i) {
      if (pan === i) {
        pan = null;
        rig.weigh(0);
      }
    }
    function start(x) {
      if (attached && base && Math.abs(x - base.x) <= 0.0025) x = base.x;
      const height = trackHeight(x);
      if (height < 1e-8) {
        balls[0].position.set(x, CY, 0);
        return say('球在水平段。把它提到弯槽上再松手。', balls[0]);
      }
      const collision = attached,
        end = LIP + (collision ? 2 * R : 0),
        pts = [{ x, y: CY + height, t: 0 }];
      for (let j = 1; j <= 64; j++) {
        const u = x + ((end - x) * j) / 64,
          y = CY + trackHeight(u),
          prev = pts[j - 1];
        const v0 = rollingExitSpeed(Math.max(0, CY + height - prev.y)),
          v1 = rollingExitSpeed(Math.max(0, CY + height - y));
        pts.push({ x: u, y, t: prev.t + (2 * Math.hypot(u - prev.x, y - prev.y)) / (v0 + v1) });
      }
      const physics = rangeShot(height, collision);
      shot = { physics, pts, x, t: 0, collision, printed: [], dots: [] };
      guide();
    }
    function finish(s) {
      shot = null;
      if (!s.collision) {
        base = { x: s.x, dot: s.dots[0] };
        after = null;
        notch.position.set(s.x, CY + trackHeight(s.x) - R - 0.002, 0);
        notch.visible = true;
        if (history.length && history.every((h) => Math.abs(h - s.x) < 0.012))
          say('本次落点已留下。要比较新的高度，请把重球换到相距更远的位置再单独放一次。', balls[0]);
        else guide();
      } else {
        attached = false;
        if (!base || Math.abs(base.x - s.x) > 0.0025) {
          s.dots.forEach((m) => (m.excluded = true));
          ink();
          after = base ? { dots: s.dots, saved: false, valid: false } : null;
          say(
            base
              ? '这次释放位置变了。纸上以 × 标出这两个落点，可量作对照；要复测就把重球拖回原标记。'
              : '两个碰后落点已留下。还要让重球单独飞一次，测同一高度的碰前射程。',
            balls[0],
          );
        } else {
          after = { dots: s.dots, saved: false, valid: true };
          guide();
        }
      }
      updateForm();
    }
    function update(dt) {
      bar.update(dt);
      if (!shot) return;
      const s = shot;
      s.t += dt;
      const flightTime = s.t - s.pts.at(-1).t;
      if (flightTime < 0) {
        const i = s.pts.findIndex((q) => q.t >= s.t),
          a = s.pts[Math.max(0, i - 1)],
          b = s.pts[i];
        const f = a.t === b.t ? 0 : (s.t - a.t) / (b.t - a.t);
        balls[0].position.set(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, 0);
        return;
      }
      s.physics.flights.forEach((f, i) => {
        const p = s.physics.position(i, flightTime);
        const drift = clamp(flightTime - f.land, 0, 0.13);
        balls[i].position.set(LIP - Math.min(0.395, p.x + f.v * drift * (1 - drift / 0.26)), CY - p.drop, 0);
        if (!s.printed[i] && flightTime >= f.land) {
          s.printed[i] = true;
          const dot = { range: f.range, read: null, name: s.collision ? (i ? '轻球' : '碰后重球') : '单独飞出的重球' };
          s.dots[i] = dot;
          marks.push(dot);
          ink();
        }
      });
      if (flightTime >= Math.max(...s.physics.flights.map((f) => f.land)) + 0.13) finish(s);
    }
    function read(p) {
      const m = nextMark();
      if (!m || !aligned()) return guide();
      if (near !== 'read') {
        focus('read', LIP - m.range, PAPER_Y, 0.01, ctx.camera.aspect < 1 ? 0.085 : 0.13);
        return;
      }
      if (Math.abs(p.x - (LIP - m.range)) > 0.0018)
        return say('从这个落点沿垂直于尺边的方向对齐毫米刻线，读它到 O 的距离。');
      m.read = Math.round((scale.position.x + 0.2 - p.x) * 1000);
      ink();
      if (m === base.dot) bar.done('solo');
      if (after?.valid && after.dots.every((d) => d.read !== null)) bar.done('hit');
      updateForm();
      leave();
    }
    function reset() {
      if (near) leave();
      near = null;
      attached = false;
      pan = null;
      weights = [null, null];
      origin = null;
      marks = [];
      base = after = shot = null;
      history = [];
      dock(0);
      dock(1);
      rig.weigh(0);
      notch.visible = false;
      scale.position.set(LIP - 0.2 + 0.012, PAPER_Y + 0.001, 0.068);
      ink();
      rows?.clear();
      if (evidence) evidence.textContent = '';
      fields?.forEach((f) => (f.value = ''));
      if (form) form.hidden = true;
      bar.undo('setup', 'solo', 'hit', 'verify');
      guide();
    }
    const manip = draggable(
      group,
      [
        ...balls.map((b, i) => ({
          obj: b,
          plane: 'xy',
          offset: 0,
          enabled: () => !near && !shot,
          hint: i ? '轻球：移到秤盘或槽口' : '重球：称量后沿斜槽上移，松手滚下',
          onStart() {
            dragging = false;
            sample = b.position.clone();
            fromLip = attached;
          },
          onDrag(p, start) {
            if (!start) return;
            dragging = true;
            removeFromPan(i);
            if (i) attached = false;
            b.position.set(sample.x + p.x - start.x, Math.max(PAPER_Y + R, sample.y + p.y - start.y), 0);
            if (b.position.y > CY - 0.04 && b.position.x >= LIP) {
              b.position.x = clamp(p.x, LIP, LIP + FLAT + LENGTH);
              b.position.y = CY + trackHeight(b.position.x);
            }
          },
          onEnd() {
            if (!dragging) return;
            const { x, y } = b.position;
            if (Math.abs(x - PAN_X) < 0.037 && y < PAN_Y + 0.055) {
              if (pan !== null) {
                b.position.copy(sample);
                if (i) attached = fromLip;
                return say('秤盘上已经有一只球，先把它移回台前。');
              }
              pan = i;
              weights[i] = BALL_MASSES[i] * 1000;
              rig.weigh(weights[i]);
              b.position.set(PAN_X, PAN_Y + R, 0.052);
            } else if (i === 1 && Math.abs(x - LIP) < 0.032 && y > CY - 0.045) {
              attached = true;
              b.position.set(LIP, CY, 0);
            } else if (i === 0 && x > LIP + FLAT && y > CY - 0.045) {
              start(x);
              return;
            } else if (i === 0 && x >= LIP && y > CY - 0.045) {
              b.position.set(Math.max(x, LIP + (attached ? 2 * R : 0)), CY, 0);
            } else dock(i);
            if (weights.every(Boolean) && origin !== null) bar.done('setup');
            updateForm();
            guide();
          },
        })),
        {
          obj: paper,
          plane: 'xz',
          offset: PAPER_Y,
          enabled: () => !shot,
          hint: '沿铅垂线在纸上定原点',
          onStart(p) {
            sample = p?.clone();
          },
          onTap() {
            if (!sample) return guide();
            if (origin !== null) {
              if (!near && aligned() && nextMark()) read(sample);
              else guide();
              return;
            }
            if (near !== 'origin') {
              focus('origin', LIP, PAPER_Y, 0.025, 0.09);
              return;
            }
            if (Math.abs(sample.x - LIP) > 0.0018 || Math.abs(sample.z - 0.026) > 0.006)
              return say('在铅锤尖端正下方点纸。');
            origin = sample.x;
            ink();
            if (weights.every(Boolean)) bar.done('setup');
            leave();
          },
        },
        {
          obj: scale,
          plane: 'xz',
          offset: PAPER_Y + 0.002,
          enabled: () => !shot,
          hint: '移尺使零线对齐 O，沿尺读落点',
          onStart(p) {
            startScale = scale.position.clone();
            sample = p?.clone();
          },
          onDrag(p, start) {
            if (near || !start || origin === null) return;
            scale.position.x = clamp(startScale.x + p.x - start.x, LIP - 0.23, LIP - 0.17);
            scale.position.z = clamp(startScale.z + p.z - start.z, 0.022, 0.077);
          },
          onEnd(moved) {
            if (moved && Math.abs(scale.position.z - 0.022) < 0.006) scale.position.z = 0.022;
            if (moved && origin !== null && Math.abs(scale.position.x + 0.2 - origin) < 0.004)
              scale.position.x = origin - 0.2;
            guide();
          },
          onTap() {
            if (sample) read(sample);
          },
        },
      ],
      {
        highlight: true,
        taps: [
          {
            obj: screen,
            enabled: () => !near && !shot,
            hint: '读电子秤',
            onTap() {
              focus('mass', PAN_X, 0.02, 0.084, 0.105);
            },
          },
        ],
      },
    );
    function record() {
      if (!base || !after || after.saved || current().some((m) => m.read === null)) return;
      const [m1, m2] = weights,
        [p, m, n] = current().map((v) => v.read);
      // 比较质量乘射程，两侧再除以共同的飞行时间才是动量。
      const before = (m1 * p) / 10,
        following = (m1 * m + m2 * n) / 10;
      if (
        [before, following].some(
          (v, i) => !Number.isFinite(fields[i].valueAsNumber) || Math.abs(fields[i].valueAsNumber - v) > 0.55,
        )
      )
        return say('质量用 g，射程把 mm 换成 cm。碰后把重球和轻球各自的质量乘射程再相加。');
      rows.add([
        weights.join(' / '),
        [p, m, n].join(' / '),
        before.toFixed(1),
        following.toFixed(1),
        after.valid ? '同点释放' : '释放点改变',
      ]);
      Object.assign(after, {
        saved: true,
        before,
        following,
        repeat: history.some((x) => Math.abs(x - base.x) < 0.012),
      });
      form.hidden = true;
      fields.forEach((f) => (f.value = ''));
      if (after.valid && history.every((x) => Math.abs(x - base.x) >= 0.012)) history.push(base.x);
      if (history.length >= 2) {
        bar.done('verify');
        guide();
      } else guide();
    }
    reset();
    return {
      group,
      size: { w: 0.69, d: 0.24, h: 0.38 },
      view: { azim: 3, elev: 28, lookY: 0.4, margin: 1.05 },
      pointer: {
        ...manip,
        down(ray, e) {
          if (document.body.classList.contains('predicting')) ui?.go(1);
          return manip.down(ray, e);
        },
      },
      toggles: ['steps'],
      mount(panel) {
        ui = panel;
        bar.attach(panel);
        rows = table(['重/轻质量 g', '碰前重/碰后重/轻 mm', '碰前 g·cm', '碰后 g·cm', '条件']);
        const labels = ['碰前质量乘射程 / (g·cm)', '碰后两项之和 / (g·cm)'];
        fields = labels.map((label) => h('input', { type: 'number', step: '.1', 'aria-label': label }));
        form = h(
          'div',
          { class: 'ctl' },
          ...fields.map((f, i) => h('label', {}, labels[i] + ' ', f)),
          buttons([{ text: '记录并比较', onClick: record }]).el,
        );
        form.hidden = true;
        evidence = note('');
        panel.data.append(evidence, rows.el, form);
        panel.notes.append(
          note(
            '同半径实心球在水平槽口对心相碰；本模型碰撞恢复系数取 0.82，短水平段忽略切向冲量，飞行中忽略空气阻力。记录纸垫在软垫上，黑点表示第一次触纸的位置。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        guide();
      },
      update,
      dispose() {
        manip.dispose();
        bar.dispose();
      },
    };
  },
};
