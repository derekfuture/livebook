import * as THREE from 'three';
import { ballRangeRig, LIP, PAPER_Y, CY, PAN_X, PAN_Y, RELEASE_X, trackHeight, BOB_Z, TRIAL_SLOPE } from './kit/ballRangeRig.js';
import { rangeShot, BALL_MASSES, BALL_RADIUS as R } from './kit/ballRange.js';
import { rollingExitSpeed } from './kit/projectileTrack.js';
import { inviteRing } from './kit/invite.js';
import { show } from '../ui/prefs.js';
import { lessonBar } from './kit/lessonbar.js';
import { draggable, clamp, rayToLocal } from './kit/interact.js';
import { qaFlow } from './kit/chemlesson.js';
import { table, h, buttons } from './kit/ui.js';

const vec = (x, y, z) => new THREE.Vector3(x, y, z);
const seats = RELEASE_X.map(x => vec(x, CY + trackHeight(x), 0));
const homes = [0.093, 0.141].map(x => vec(x, PAPER_Y + R, 0.111));
const panAt = vec(PAN_X, PAN_Y + R, 0.052), lipAt = vec(LIP, CY, 0);
const rulerHome = vec(LIP - 0.183, PAPER_Y + 0.001, 0.068);
const rulerAt = vec(LIP - 0.2, PAPER_Y + 0.001, 0.022);
const letters = ['A', 'B'], names = ['重球', '轻球'];
const predictions = ['比较各球质量乘射程的总和', '只把碰后的两段射程相加', '比较两球谁先落地'];
const labels = ['P', 'M', 'N'], descriptions = ['单飞重球', '碰后重球', '碰后轻球'];
const steps = [['setup', '称球、定原点'], ['level', '检查槽口水平'], ['solo', '量碰前射程'], ['hit', '量碰后射程'], ['repeat', '换高度复测']];
const massLabel = '模型设定的质量';
const inspectLip = '点一下：检查槽口';
const originResult = '零线与飞行中心线相交于 O。从 O 沿飞行方向量射程。';
const checkLevel = '点槽口侧面的调节柄，对照横线检查槽口是否水平。';
const initialStatus = '两球大小相同。';
const cm = mm => (mm / 10).toFixed(1);

export default {
  id: 'ballrange',
  fig: '图1.4-5',
  title: '用两球落点验证动量守恒',
  stampText: '验证',
  predict: {
    q: '不测速度，怎样用两球的落点验证碰撞前后总动量是否守恒？',
    options: predictions,
    answer: 0,
  },
  conclusion: {
    page: 24, rect: [68.5, 131.46, 520.69, 193.54],
    quote: '在这个实验中也可以不测量速度的具体数值。做平抛运动的小球落到地面，它们的下落高度相同，飞行时间也就相同。因此，小球碰撞后的速度之比就等于它们落地时飞行的水平距离之比。根据这一思路，也可以验证动量守恒定律。',
    why: '两球从同一水平槽口飞出，下落高度相同。把质量与射程的乘积除以共同的飞行时间，就得到水平方向的动量。碰撞期间，两球所受外力的总冲量在水平方向上可忽略。',
    src: '课本第 20 页 · 第一章 第4节 实验：验证动量守恒定律',
  },
  create(ctx) {
    const rig = ballRangeRig();
    const { group, balls, paper, scale, bob, screen } = rig;
    const masses = [null, null], records = [], marks = [];
    const rows = table(['释放点', 'OP / cm', 'OM / cm', 'ON / cm'], { note: '射程取自模拟落点，读到毫米。' });
    const massNote = h('p', { class: 'note', style: 'font-size:14px;color:#514b42' });
    const sums = h('div', { style: 'font-size:14px;color:#463e34;line-height:1.55;font-variant-numeric:tabular-nums' });
    const field = h('input', { type: 'number', inputmode: 'decimal', step: 'any', required: true, style: 'width:5em;font:inherit' });
    const caption = h('span');
    const form = h('form', { onsubmit(e) { e.preventDefault(); read(); } },
      h('label', {}, caption, ' ', field), ' ', h('button', { class: 'go', type: 'submit', style: 'width:auto;margin:0' }, '记下读数'));
    let ui, near, aim, origin, pan, attached, soloSeat, shot, returning, held, cancelled;
    let zeroed, first, dragDepth, candidate, slope, inspected;
    const ring = inviteRing(group, { ground: -1 });
    const bar = lessonBar({ ...ctx, back: leave,
      steps: steps.map(([id, title]) => ({ id, title, todo: title, target: () => aim })) });
    const pending = () => marks.find(m => !m.excluded && m.mm === null);
    const measured = () => marks.filter(m => !m.excluded);
    const tell = text => ui?.status(text);
    const ink = () => rig.ink(origin, marks, near === 'origin');
    const lightOnPaper = () => records.length > 0 && soloSeat === null && !balls[1].position.equals(homes[1]) && pan !== 1;
    function guide() {
      aim = null;
      function say(text, obj) { aim = near || shot || held || ui?.step === 0 ? null : obj; bar.say(text); }
      if (shot) return say('看球第一次碰到纸的地方，纸上会留下印迹。');
      if (near === 'mass') return say('读秤上的克数，记下这只球的质量。');
      if (near === 'origin' && origin) return say('找到 O 后，回到全景检查槽口。');
      if (near === 'origin') return say('点锤尖正下方纸面上的小圈，用这个投影定出零线。');
      if (near === 'level') return say('向上拖调节柄，使柄上细线与横线对齐，也可回到全景先试放重球。');
      if (near === 'read') return say('沿落点的细线读到最近的毫米刻线，用厘米记录。');
      if (bar.finished) return say('两个高度都已检验，可以掀开课本结论。');
      if (masses.includes(null)) {
        if (pan !== null && masses[pan] === null) return say('点秤的显示屏，读球的质量。', screen);
        if (pan !== null) return say('把称好的球拖回木座，腾出秤盘。', balls[pan]);
        const i = masses[0] === null ? 0 : 1;
        return say('把' + names[i] + '拖到空秤盘上，单独称它的质量。', balls[i]);
      }
      if (!origin) return say('点铅锤近看，找它在纸面上的投影。', bob);
      if (!inspected || (slope && marks.length)) return say(checkLevel, rig.grip);
      if (slope) return say('槽口上翘。把重球拖到 A 或 B 试放，或点调节柄调平。', balls[0]);
      if (pending()) {
        if (!zeroed) return say('把尺拖到落点旁，让零刻线与 O 线重合。', scale);
        return say('点尺近看，量' + descriptions[labels.indexOf(pending().label)] + '从 O 到 ' + pending().label + ' 的距离。', scale);
      }
      if (lightOnPaper())
        return say('把轻球拖回木座，清空落点区再换高度。', balls[1]);
      if (soloSeat === null) return say(records.length ? '换到另一个字母标记，先让重球单独滚下。' : '槽口留空，把重球拖到 A 或 B 松手，留下碰前的落点 P。', balls[0]);
      if (!attached) return say('把轻球拖到水平槽口，让它静止等候碰撞。', balls[1]);
      return say('把重球拖回 ' + letters[soloSeat] + ' 松手，使碰前速度与单飞时相同。', balls[0]);
    }
    function leave() {
      if (near) ctx.back();
      near = null;
      ink();
      form.hidden = true;
      bar.near(false);
      guide();
    }
    function close(which, at, direction, distance) {
      near = which;
      ink();
      form.hidden = which === 'origin' || which === 'level';
      if (!form.hidden) {
        ui.fold(false);
        caption.textContent = which === 'mass' ? names[pan] + '质量 / g' : 'O' + pending().label + ' / cm';
        field.value = '';
      }
      bar.near(true);
      ctx.look(at.toArray(), direction, distance, leave);
      guide();
    }
    function inspectScale() {
      const m = pending();
      if (!m || !zeroed) return guide();
      // 看得到落点两侧的整段厘米、毫米刻度，避免用镜头中心充当读数线。
      const center = LIP - Math.round(m.range * 20) / 20;
      close('read', vec(center, PAPER_Y, 0.005), [0, 1, 0.045], 0.17);
    }
    function read() {
      const value = field.valueAsNumber;
      if (!Number.isFinite(value)) return;
      if (near === 'mass') {
        const expected = BALL_MASSES[pan] * 1000;
        if (value !== expected) return tell('读数与秤面不符，显示的单位是克。');
        masses[pan] = value;
        massNote.textContent = massLabel + '　' + names.map((n, i) => n + ' ' + (masses[i] === null ? '—' : masses[i] + ' g')).join('　');
        tell(names[pan] + '质量已记为 ' + value + ' g。');
        leave();
      } else if (near === 'read') {
        const m = pending();
        const expected = Math.round(m.range * 1000);
        if (Math.abs(value * 10 - expected) > 1e-6) {
          return tell(value >= expected * 0.8 ? '尺上的数字是厘米，每一小格是 0.1 cm。' :
            '读数偏' + (value * 10 > expected ? '大' : '小') + '。从带数字的长线数到落点细线，每格 0.1 cm。');
        }
        m.mm = Math.round(value * 10);
        rows.set(records.length, [letters[soloSeat], ...labels.map(l => {
          const mark = measured().find(d => d.label === l);
          return mark && mark.mm !== null ? cm(mark.mm) : '—';
        })]);
        if (m.label === 'P') {
          bar.done('solo');
          tell('OP = ' + cm(m.mm) + ' cm，记下了同高度单飞的射程。');
        } else if (m.label === 'M') tell('OM = ' + cm(m.mm) + ' cm，这是碰后重球的射程。');
        else compare();
        leave();
      }
    }
    function compare() {
      const [p, m, n] = measured().map(mark => mark.mm);
      const before = masses[0] * p / 10, after = (masses[0] * m + masses[1] * n) / 10;
      sums.append(h('p', {}, h('b', {}, letters[soloSeat] + ' 点 · 质量 × 射程'), h('br'),
        '碰前　' + masses[0] + ' × ' + cm(p) + ' = ' + before.toFixed(1) + ' g·cm', h('br'),
        '碰后　' + masses[0] + ' × ' + cm(m) + ' + ' + masses[1] + ' × ' + cm(n) + ' = ' + after.toFixed(1) + ' g·cm'));
      records.push(soloSeat);
      tell('ON = ' + cm(n) + ' cm。按毫米读尺，碰前重球的质量乘射程与碰后两球的质量乘射程之和接近。');
      bar.done('hit');
      if (records.length === 2) bar.done('repeat');
      soloSeat = null;
    }
    function start(seat, collision) {
      const x = RELEASE_X[seat], height = trackHeight(x, slope), end = LIP + (collision ? 2 * R : 0);
      const pts = [{ x, y: CY + height, t: 0 }];
      for (let j = 1; j <= 64; j++) {
        const u = x + (end - x) * j / 64, y = CY + trackHeight(u, slope), prev = pts[j - 1];
        const v0 = rollingExitSpeed(Math.max(0, CY + height - prev.y));
        const v1 = rollingExitSpeed(Math.max(0, CY + height - y));
        pts.push({ x: u, y, t: prev.t + 2 * Math.hypot(u - prev.x, y - prev.y) / (v0 + v1) });
      }
      if (!collision) {
        marks.length = 0;
        if (!slope) {
          soloSeat = seat;
          rows.add([letters[seat], '—', '—', '—']);
        }
      } else marks.splice(1);
      ink();
      rig.trialPath(null);
      shot = { collision, seat, pts, physics: rangeShot(height, collision, slope), t: 0, printed: [] };
      balls[0].position.copy(seats[seat]);
      attached = false;
      tell('');
      guide();
    }
    function advance(dt) {
      const s = shot;
      s.t += dt;
      const flightTime = s.t - s.pts[s.pts.length - 1].t;
      if (flightTime < 0) {
        const i = s.pts.findIndex(q => q.t >= s.t), a = s.pts[Math.max(0, i - 1)], b = s.pts[i];
        const f = a.t === b.t ? 0 : (s.t - a.t) / (b.t - a.t);
        balls[0].position.set(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, 0);
        return;
      }
      s.physics.flights.forEach((f, i) => {
        const p = s.physics.position(i, flightTime), drift = clamp(flightTime - f.land, 0, 0.12);
        balls[i].position.set(LIP - p.x - f.v * drift * (1 - drift / 0.24), CY - p.drop, 0);
        if (!s.printed[i] && flightTime >= f.land) {
          s.printed[i] = true;
          marks.push({ label: labels[s.collision ? 1 + i : 0], range: f.range, mm: null, excluded: s.seat !== soloSeat });
          ink();
        }
      });
      if (flightTime < Math.max(...s.physics.flights.map(f => f.land)) + 0.13) return;
      // 轻球先离槽，两个落点仍须按 P、M、N 参与同一组计算。
      marks.sort((a, b) => labels.indexOf(a.label) - labels.indexOf(b.label));
      shot = null;
      if (slope) {
        rig.trialPath(s.physics);
        tell('重球先向上飞再下落，飞行时间比平抛时长。调平后重新取点。');
      } else if (s.seat !== soloSeat) tell('释放点' + (s.seat < soloSeat ? '较低，入射速度偏小' : '较高，入射速度偏大') + '。两个 × 属于这次碰撞，不能和 P 配成一组。');
      else tell(s.collision ? '两球分开了。M 是重球的落点，N 是轻球的落点。' : 'P 是重球第一次触纸的位置。');
      guide();
    }
    function reject(obj, from, msg) {
      returning = { obj, from: obj.position.clone(), to: from, t: 0 };
      tell(msg);
      guide();
    }
    const free = () => !shot && !returning && !near && !bar.finished;
    const hint = (enabled, text) => () => enabled() && ui?.step === 1 ? (typeof text === 'function' ? text() : text) : '';
    function ballHint(i) {
      if (masses[i] === null) return '拖动：放上秤盘';
      if (masses.includes(null) || (i === 1 && (lightOnPaper() || attached))) return '拖动：放回木座';
      return i ? '拖动：放到槽口' : '拖动：从标记放球';
    }
    function ballDrag(obj, i) {
      // 通过所抓球心的视线找目标。秤盘、木座与轨道不在同一深度，换深度时仍保持在指尖。
      const sites = [{ kind: 'home', at: homes[i], radius: 0.022 }, { kind: 'pan', at: panAt, radius: 0.026 },
        ...(i ? [{ kind: 'lip', at: lipAt, radius: 0.021 }] : seats.map((at, seat) => ({ kind: 'rail', seat, at, radius: 0.023 })))];
      return { obj, plane: 'xy', get offset() { return held === obj ? dragDepth : obj.position.z; },
        keepOffset: true, enabled: free, hint: hint(free, () => ballHint(i)),
        onStart() { first = obj.position.clone(); dragDepth = first.z; held = obj; candidate = null; },
        onDrag(p) {
          const eye = group.worldToLocal(ctx.camera.getWorldPosition(vec()));
          const atDepth = z => Math.abs(p.z - eye.z) < 1e-8 ? p.clone() : eye.clone().lerp(p, (z - eye.z) / (p.z - eye.z));
          let best = 1;
          candidate = null;
          for (const site of sites) {
            const d = atDepth(site.at.z).distanceTo(site.at) / site.radius;
            if (d < best) { best = d; candidate = site; }
          }
          const to = atDepth(candidate ? candidate.at.z : dragDepth);
          obj.position.copy(to);
          obj.position.y = Math.max(PAPER_Y + R, to.y);
          if (pan === i) rig.weigh(0);
        },
        onTap: guide,
        onEnd(moved) {
          held = null;
          if (!moved) return;
          const fail = msg => reject(obj, first, msg);
          if (cancelled || !candidate) return fail('球没有放稳，已回到刚才的位置。');
          const { kind, at, seat } = candidate;
          if (kind === 'pan' && pan !== null && pan !== i) return fail('秤盘上已经有球，两只球要分开称。');
          if (kind === 'rail' || kind === 'lip') {
            if (!origin) return fail('质量和原点还未备齐，这次没有放球。');
            if (!inspected) return fail(checkLevel);
            if (pending()) return fail('这张纸上还有未读的落点，先记下这一球的射程。');
            if (kind === 'lip' && soloSeat === null) return fail('先留空槽口，测重球单飞的射程。');
            if (kind === 'rail' && soloSeat !== null && !attached) return fail('单飞射程已记下，槽口还缺轻球。');
            if (kind === 'rail' && lightOnPaper())
              return fail('纸上还有轻球，先把它收回木座。');
            if (kind === 'rail' && soloSeat === null && records.includes(seat)) return fail('这个高度已经检验过，换另一个标记。');
          }
          if (pan === i) pan = null;
          if (i) attached = kind === 'lip';
          obj.position.copy(at);
          if (kind === 'pan') pan = i;
          rig.weigh(pan === null ? 0 : BALL_MASSES[pan] * 1000);
          if (kind === 'rail') return start(seat, attached);
          if (kind === 'pan' && masses[i] === null) {
            close('mass', screen.position.clone().setZ(0.071), [0, 1, 0.5], 0.18);
            tell('秤面稳定了。');
          } else {
            tell(kind === 'lip' ? '轻球已静止在水平槽口。' : kind === 'home' ? '球已放回木座。' : '球已放稳。');
            guide();
          }
        },
      };
    }
    function rulerDrag() {
      const enabled = () => free() && origin && !!pending();
      return { obj: scale, plane: 'xz', offset: rulerAt.y, keepOffset: true, enabled,
        hint: hint(enabled, () => zeroed ? '点一下：凑近读尺' : '拖动：零线对准 O'),
        onStart() { first = scale.position.clone(); held = scale; },
        onDrag(p) { scale.position.set(clamp(p.x, LIP - 0.25, LIP - 0.15), rulerAt.y, clamp(p.z, 0.012, 0.08)); },
        onEnd(moved) {
          held = null;
          if (!moved) return;
          if (cancelled || Math.abs(scale.position.x - rulerAt.x) > 0.005 || Math.abs(scale.position.z - rulerAt.z) > 0.007)
            return reject(scale, first, '尺的零线没有对上 O，尺已回到原处。');
          zeroed = true;
          scale.position.copy(rulerAt);
          tell('零刻线已对齐 O，尺边与飞出方向平行。');
          guide();
        }, onTap: inspectScale,
      };
    }
    const needOrigin = () => free() && !origin && !masses.includes(null);
    const pickPaper = () => near === 'origin' && !origin;
    const inspectOrigin = () => close('origin', vec(LIP, PAPER_Y, BOB_Z / 2), [0.55, 1, 0.65], 0.18);
    const massScreen = () => free() && pan !== null;
    function markOrigin(p) {
      if (!p || Math.hypot(p.x - LIP, p.z - BOB_Z) > 0.005) return tell('请点锤尖正下方纸面上的小圈。');
      origin = true;
      ink(); bar.done('setup'); guide();
      tell(originResult);
    }
    const tip = ctx.tag('', 'pill');
    const hideTip = () => tip.loc(group, 0, -9, 0);
    const canvas = document.getElementById('c');
    canvas.addEventListener('pointerleave', hideTip);
    const grip = rig.grip;
    const canAdjust = () => origin && !bar.has('level') && !shot && !returning && (!near || near === 'level');
    function inspectLevel() {
      inspected = true;
      close('level', vec(LIP + 0.025, CY - R, 0.012), [0, 0.12, 1], 0.22);
    }
    const gripDrag = {
      obj: grip, plane: 'xy', offset: grip.position.z, keepOffset: true, enabled: canAdjust,
      hint: hint(canAdjust, () => near ? '上拖：调平槽口' : inspectLip),
      onStart() { held = grip; first = slope; },
      onDrag(p) {
        if (near !== 'level') return;
        slope = rig.slopeAtGrip(p.y);
        rig.setSlope(slope);
      },
      onEnd(moved) {
        held = null;
        if (!moved || near !== 'level') return;
        if (cancelled) {
          slope = first;
          rig.setSlope(slope);
          return;
        }
        if (slope > 0.05) return;
        slope = 0;
        rig.setSlope(0);
        marks.length = 0;
        rig.trialPath(null);
        bar.done('level'); leave();
        tell('槽口已调平。现在从单飞落点 P 开始记录。');
      },
      onTap: inspectLevel,
    };
    const manip = draggable(group, [...balls.map(ballDrag), rulerDrag(), gripDrag], { tip, taps: [
      { obj: bob, enabled: needOrigin, hint: hint(needOrigin, '点一下：近看铅锤'), onTap: inspectOrigin },
      { obj: paper, enabled: () => pickPaper() || needOrigin(), hint: hint(() => pickPaper() || needOrigin(), () => near ? '点纸面：定零线' : '点一下：近看铅锤'),
        onTap(ray) { if (near) markOrigin(rayToLocal(ray, group, 'xz', PAPER_Y)); else inspectOrigin(); } },
      { obj: screen, enabled: massScreen, hint: hint(massScreen, '点一下：读秤面'), onTap() {
        close('mass', screen.position.clone().setZ(0.071), [0, 1, 0.5], 0.18);
      } },
    ] });
    const pointer = { ...manip, down(ray, e) {
      const hit = manip.down(ray, e);
      if (hit && ui?.step === 0) { ui.go(1); guide(); }
      return hit;
    }, up(ray, e) { cancelled = e?.type === 'pointercancel'; const ok = manip.up(ray, e); cancelled = false; return ok; } };
    function reset() {
      if (near) ctx.back();
      near = shot = returning = held = pan = soloSeat = null;
      origin = attached = zeroed = inspected = false;
      slope = TRIAL_SLOPE;
      rig.setSlope(slope);
      rig.trialPath(null);
      masses.fill(null);
      records.length = marks.length = 0;
      balls.forEach((b, i) => b.position.copy(homes[i]));
      rig.weigh(0); scale.position.copy(rulerHome); ink();
      form.hidden = true; field.value = ''; sums.replaceChildren(); rows.clear();
      massNote.textContent = massLabel + '　重球 —　轻球 —';
      tell(initialStatus);
      bar.near(false); bar.undo(...steps.map(s => s[0]));
      ui?.relock(); guide();
    }
    reset();
    const submit = (name, value, check) => ({ name, run() {
      if (form.hidden) throw Error('未进入读数视图');
      field.value = String(value);
      form.querySelector('button').click();
      if (!check()) throw Error('读数或记录状态不符');
    } });
    const paperPoint = (name, dx) => {
      const p = vec(LIP + dx, PAPER_Y, BOB_Z), obj = new THREE.Mesh(new THREE.PlaneGeometry(0, 0));
      obj.visible = false; obj.position.copy(p); group.add(obj);
      return { name, mouse: { kind: 'tap', obj }, run: () => markOrigin(p) };
    };
    const carry = (name, i, to) => ({ name, drag: balls[i], to });
    const openRuler = () => ({ name: '近看落点和尺刻', tap: scale });
    const trial = (seat, testMistakes) => {
      const x = seats[seat], h0 = trackHeight(x.x);
      const ranges = [rangeShot(h0, false).flights[0], ...rangeShot(h0, true).flights].map(f => cm(Math.round(f.range * 1000)));
      return [
        carry('从 ' + letters[seat] + ' 单飞', 0, x),
        ...(testMistakes ? [{ name: '把零刻线对准 O', drag: scale, to: rulerAt }] : []),
        openRuler(),
        ...(testMistakes ? [submit('读错一格', +ranges[0] + 0.1, () => near === 'read' && pending()?.mm === null)] : []),
        submit('记录 OP', ranges[0], () => near === null && measured()[0]?.mm === +ranges[0] * 10),
        carry('轻球就位', 1, lipAt),
        ...(testMistakes ? [carry('从较低标记误放', 0, seats[0]), { name: '核对两枚作废印迹', run() {
          if (marks.filter(m => m.excluded).length !== 2 || pending()) throw Error('异高数据混入本组');
        } }, carry('重新放轻球', 1, lipAt)] : []),
        carry('从原标记碰撞', 0, x), openRuler(),
        submit('记录 OM', ranges[1], () => pending()?.label === 'N'),
        openRuler(), submit('记录 ON 并比较', ranges[2], () => records.includes(seat)),
      ];
    };
    const qa = qaFlow(manip, [
      carry('试放到秤盘外', 0, vec(0.045, 0.12, 0.05)),
      { name: '检查球已归位', run() { if (!balls[0].position.equals(homes[0])) throw Error('未归位'); } },
      carry('称重球', 0, panAt), submit('读重球质量', 32, () => masses[0] === 32),
      carry('腾出秤盘', 0, homes[0]), carry('称轻球', 1, panAt),
      submit('读轻球质量', 11, () => masses[1] === 11), { name: '近看铅锤', tap: bob },
    ]);
    qa.push(paperPoint('试点偏离锤尖的位置', -0.016), paperPoint('标出原点 O', 0),
      ...qaFlow(manip, [
        { name: '看清零线与飞行中心线的交点', run() {
          if (!origin || near !== 'origin') throw Error('纸面原点未标出');
          document.querySelector('.lb-back').click();
        } },
        { name: '检查上翘的槽口', tap: grip },
        { name: '保留倾斜试放', run: () => document.querySelector('.lb-back').click() },
        carry('倾斜槽口试放重球', 0, seats[1]),
        { name: '核对上翘试放', run() {
          if (marks.length !== 1 || !marks[0].excluded || pending() || rows.rows.length || soloSeat !== null)
            throw Error('试放落点进入了正式记录');
        } },
        { name: '近看调节柄', tap: grip },
        { name: '上拖调平', drag: grip, to: () => grip.position.clone().setY(rig.levelY) },
        { name: '核对调平清点', run() {
          if (slope || marks.length || !bar.has('level')) throw Error('未调平或试放印迹未清除');
        } },
        ...trial(1, true), carry('收起纸上的轻球', 1, homes[1]), ...trial(0, false)]),
      { name: '核对两次检验并掀开结论', run() {
        if (!bar.finished || records.join() !== '1,0' || rows.rows.length !== 2 || sums.children.length !== 2) throw Error('两组记录不完整');
        ui.go(2); ui.el.querySelector('.flap-front').click();
      } });
    return {
      group: new THREE.Group().add(group), pointer, reset,
      size: { w: 0.65, d: 0.245, h: 0.38 }, view: { azim: 2, elev: 27, frameMargin: 1.03 },
      toggles: ['steps'], predicting() { if (ui) guide(); },
      mount(panel) {
        ui = panel;
        bar.attach({ need: () => panel.need(''), unlock: () => panel.unlock() });
        panel.controls.append(form);
        panel.data.append(massNote, rows.el, sums);
        panel.notes.append(h('p', { class: 'note' }, '模型中忽略空气阻力。纸上的黑点记录球第一次触纸的位置。'), buttons([{ text: '全部重做', onClick: reset }]).el);
        panel.el.querySelector('.answer').style.paddingBottom = '90px';
        panel.el.querySelector('.flap-front').addEventListener('click', () => {
          if (!bar.finished) return;
          const prediction = panel.prediction();
          const yourPick = prediction === null || prediction === undefined ? '' : '你的预测：“' + predictions[prediction] + '”。';
          panel.el.querySelector('.verdict').textContent = yourPick + '两轮模拟读数中，碰前、碰后的质量乘射程之和接近。飞行时间相同，可以用这两个和比较水平方向的总动量。';
        });
        tell(initialStatus);
        guide();
      },
      update(dt) {
        const speed = bar.update(dt);
        const target = show.steps && ui?.step === 1 && !near && !held && !returning ? aim : null;
        ring.update(target === scale ? rig.zero : target, dt);
        if (returning) {
          const r = returning;
          r.t = Math.min(1, r.t + dt / 0.38);
          r.obj.position.lerpVectors(r.from, r.to, r.t * (2 - r.t));
          if (r.t === 1) {
            r.obj.position.copy(r.to);
            returning = null;
            rig.weigh(pan === null ? 0 : BALL_MASSES[pan] * 1000);
            guide();
          }
        }
        if (shot) advance(dt * speed);
      },
      debug: { bar, qa },
      dispose() { canvas.removeEventListener('pointerleave', hideTip); manip.dispose(); bar.dispose(); ring.dispose(); },
    };
  },
};
