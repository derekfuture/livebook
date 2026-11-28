// 选择性必修第一册第 17–19 页，图 1.4-1 至图 1.4-4。
import * as THREE from 'three';
import { draggable, clamp } from './kit/interact.js';
import { inviteRing } from './kit/invite.js';
import { show } from '../ui/prefs.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow } from './kit/chemlesson.js';
import { table, h } from './kit/ui.js';
import { FLAG_WIDTH, gliderTrial } from './kit/momentum.js';
import { springRelease } from './kit/momentumSpring.js';
import { TRACK_Y } from './kit/momentumRig.js';
import { momentumBench, point, panSeat, coilHome, freeLength, springSeat } from './kit/momentumBench.js';

const names = ['甲', '乙'];
const modes = ['弹开', '粘连', '弹簧分开'];
const stages = [
  ['mass', '称两块质量'],
  ['level', '通气调平'],
  ['elastic', '弹开'],
  ['stick', '粘连'],
  ['spring', '弹簧分开'],
];
const homeX = [-0.46, 0];
const springX = [-0.118, 0.096];
const squeeze = 0.05;
const tiltGain = 0.12;
const tms = (e) => Number(((e.exit - e.enter) * 1000).toFixed(1));
const atRail = (x) => point(x, TRACK_Y, 0);
const eventName = (e) => (e.stage ? '碰后' : '碰前') + names[e.glider];
const gateName = (i) => (i ? '右门' : '左门');
const kg = (m) => (m / 1000).toFixed(3);

export default {
  id: 'momentum',
  fig: '图1.4-1',
  title: '验证动量守恒定律',
  stampText: '验证',
  predict: {
    q: '质量不同的两块滑块在水平气垫导轨上相撞。如果碰后粘在一起，两块的总动量会怎样变化？',
    options: ['比碰前小', '与碰前近似相等', '比碰前大'],
    answer: 1,
  },
  conclusion: {
    page: 17,
    rect: [64.26, 479.57, 378.34, 542.0],
    quote:
      '理论和实验都表明：如果一个系统不受外力，或者所受外力的矢量和为0，这个系统的总动量保持不变。这就是动量守恒定律（law of conservation of momentum）。',
    why: '两块滑块组成一个系统。气垫减小摩擦，导轨调平后，沿轨道的合外力近似为零。向右取正，两块的动量要带符号相加。',
    src: '课本第 13 页 · 第一章 第3节 动量守恒定律',
  },
  create(ctx) {
    const rig = momentumBench(),
      { group, carts, cartPicks, timers } = rig;
    const root = new THREE.Group().add(group);
    const phoneStyle = h(
      'style',
      {},
      `.board .momentum-note, .momentum-totals .note { font-size:14px; line-height:1.5; color:#354750; }
      @media (max-width:760px) {
      body.lesson-on #viewctl { top:52px; bottom:auto; flex-direction:row; align-items:center; }
      #viewctl .lesson-community { margin:0; padding:0; border:0; }
      .lbar.do { flex-wrap:wrap; row-gap:2px; }
      .lbar.do .lb-main { flex:1 1 calc(100% - 45px); }
      .lbar.do .lb-steps { margin-left:31px; max-width:none; }
    }`,
    );
    let ui,
      aim,
      near = null,
      ballast,
      pan,
      masses,
      air,
      tilt,
      drift,
      leftDrift,
      held,
      settle,
      round,
      run,
      time,
      passed;
    let events, readings, placed, sleeves, coilOn, tied, ray, returning;
    let tieStartZ, lastDragZ;
    // 木座上的小件也要在器材高度显示步骤光圈。
    const ring = inviteRing(group, { ground: 0.004 });
    const bar = lessonBar({
      ...ctx,
      back: leave,
      steps: stages.map(([id, title]) => ({ id, title, todo: title, target: () => aim })),
    });
    const data = table(['总动量<br>kg·m/s', '碰前', '碰后', '差的绝对值'], {
      note: '计时器只读到 0.1 ms，算出的总动量可能略有差别。表中总动量和差值都用未舍入的速度计算。',
    });
    data.el.classList.add('momentum-totals');
    const speeds = table(['滑块', 'Δt / ms', 'v / (m/s)']);
    const massLine = h('p', { class: 'note', style: 'font-size:15px;color:#354750' }),
      formula = h('p', { class: 'note', style: 'font-size:15px;line-height:1.6;color:#354750' }),
      archive = h('div');
    const numeric = (label) =>
      h('input', {
        type: 'number',
        step: 'any',
        inputmode: 'decimal',
        'aria-label': label,
        style: 'width:6.2em;padding:4px',
      });
    const value = numeric('仪器读数'),
      before = numeric('碰前总动量'),
      after = numeric('碰后总动量');
    const unit = h('span'),
      dir = h(
        'select',
        { 'aria-label': '运动方向' },
        h('option', { value: '' }, '运动方向'),
        h('option', { value: '1' }, '向右'),
        h('option', { value: '-1' }, '向左'),
      );
    function form(kids, label, action) {
      return h(
        'form',
        {
          onsubmit: (e) => {
            e.preventDefault();
            action();
          },
          style: 'margin:8px 0',
        },
        ...kids,
        h('button', { class: 'go', type: 'submit' }, label),
      );
    }
    const readForm = form([h('label', {}, unit, ' ', value), ' ', dir], '记下读数', read);
    const pForm = form(
      [h('div', {}, h('label', {}, '碰前 ', before)), h('div', {}, h('label', {}, '碰后 ', after))],
      '核对总动量',
      compare,
    );
    const local = (obj) => group.worldToLocal(obj.getWorldPosition(point(0, 0, 0)));
    function tell(s, obj = null) {
      aim = near === null ? obj : null;
      bar.say(s);
    }
    function mark(x) {
      rig.marker.visible = x !== null;
      if (x !== null) rig.marker.position.x = x;
    }
    const springRound = () => round === 2;
    const onScale = () => pan !== null;
    const pendingEvent = () => events[readings.length];
    function measured() {
      return run && passed === run.events.length;
    }
    function updateForms() {
      const event = pendingEvent();
      const weighing = bar.current === 'mass' && onScale() && masses[pan] === null;
      readForm.hidden = !(weighing || (measured() && event && near === event.gate));
      unit.textContent = weighing ? names[pan] + '的质量 / g' : (event ? eventName(event) : '') + ' / ms';
      dir.hidden = weighing;
      pForm.hidden = !(measured() && !event && !bar.finished);
      speeds.el.hidden = bar.finished || !readings.length;
      data.el.hidden = !data.rows.length;
    }
    function guide(prefix = '') {
      mark(null);
      updateForms();
      const say = (s, obj) => tell(prefix + s, obj);
      if (bar.finished) return say('三组数据都已核对，可以掀开课本原文。');
      if (bar.current === 'mass') {
        if (ballast === null) return say('把 100 g 砝码拖到任一滑块上，使两块质量不同。', rig.weight);
        if (onScale()) {
          if (masses[pan] === null) return say('从天平屏上读出总质量，连同砝码一起计入。', rig.lcd);
          mark(homeX[pan]);
          return say('把称过的' + names[pan] + '放回导轨三角标记处。', carts[pan]);
        }
        const i = masses.indexOf(null);
        return say('把' + names[i] + '拖到前方天平的秤盘上，测量它参加碰撞时的质量。', carts[i]);
      }
      if (bar.current === 'level') {
        if (!air) return say('点开气源减小摩擦，观察松开的乙会不会自己滑走。', rig.power);
        if (tilt !== 0)
          return say(near === 'level' ? '上下拖金色调平轮，让气泡居中。' : '导轨有坡度，乙会向低处滑。点金色调平轮近看，或上下拖到气泡居中。', rig.screw);
        if (near === 'level') return say('气泡居中了。回全景，松开乙检验导轨是否水平。');
        if (!settle) {
          mark(0);
          return say('将乙拖到两门中间再松手。停在原处，说明导轨已调平。', carts[1]);
        }
        return say('观察乙松手后是否停在原处。');
      }
      if (run) {
        if (!measured())
          return say(
            springRound()
              ? '两块从静止向相反方向分开，留意它们各经过哪道门。'
              : '甲先过左门。看两块相撞后各往哪边走，哪块先过门。',
          );
        const e = pendingEvent();
        if (e) {
          const prompt = '读' + eventName(e) + '的遮光时间。';
          if (near === null) return say(prompt + '点它经过的计时器。', timers[e.gate].screen);
          if (near !== e.gate) return say('这道门没有这次记录。回全景，找' + eventName(e) + '经过的门。');
          return say(prompt + '同一道门按过门先后编号；向右取正。');
        }
        return say('用两块的质量乘各自带符号的速度并相加，填写碰前、碰后总动量（保留三位小数）。');
      }
      if (springRound() && sleeves.some(Boolean)) {
        const i = sleeves.indexOf(true);
        return say('先把' + names[i] + '的搭扣拖回右侧木座，腾出两块之间的位置。', rig.sleeves[i]);
      }
      const i = placed.indexOf(false);
      if (i !== -1) {
        const x = (springRound() ? springX : homeX)[i];
        mark(x);
        return say('把' + names[i] + '拖到三角标记处停住，准备' + modes[round] + '。', carts[i]);
      }
      if (round === 1 && !sleeves.every(Boolean)) {
        const i = sleeves.indexOf(false);
        return say('把' + names[i] + '的尼龙搭扣拖到它朝向另一块的端面，使两块相撞时能粘住。', rig.sleeves[i]);
      }
      if (springRound()) {
        if (!coilOn) return say('把木座上的轻弹簧放在两滑块之间。', rig.coil);
        if (!tied) {
          if (tieStartZ !== null) return say('继续按住甲，向天平一侧拖，把线圈套紧。');
          mark(springX[0] + squeeze);
          return say('向右推甲压缩弹簧，到标记处保持按住。', carts[0]);
        }
        if (held) return say('细线已绷紧，可以松手。');
        return say('两块被细线固定，都静止。点细线模拟烧断，观察分开后的方向。', rig.thread);
      }
      return say('乙已静止。向右轻推甲，在左门前松手，让遮光片自由通过光电门。', carts[0]);
    }
    function closeView() {
      if (near !== null) ctx.back();
      near = null;
      bar.near(false);
    }
    function leave() {
      closeView();
      guide();
    }
    function inspect(obj, which, dist) {
      near = which;
      bar.near(true);
      ctx.look(local(obj).toArray(), which === 'level' ? [0, 0.8, 1] : [0, 1, 0.22], ctx.camera.aspect < 1 ? dist * 1.35 : dist, leave);
      guide();
    }
    function clearEntry() {
      value.value = '';
      dir.value = '';
      before.value = '';
      after.value = '';
    }
    function resetTrial() {
      run = null;
      time = passed = 0;
      events = [];
      readings = [];
      speeds.clear();
      clearEntry();
      formula.textContent = '';
      timers.forEach((_, i) => {
        rig.timer(i, []);
        rig.gateLight(i, false);
      });
    }
    function reset() {
      closeView();
      bar.undo(...stages.map(([id]) => id));
      masses = [null, null];
      pan = ballast = null;
      round = 0;
      air = held = coilOn = tied = false;
      tieStartZ = null;
      settle = drift = leftDrift = 0;
      tilt = 0.006;
      sleeves = [false, false];
      placed = [true, true];
      returning = null;
      rig.level(tilt);
      rig.air(false);
      rig.weigh(0);
      carts.forEach((c, i) => {
        rig.rail.add(c);
        c.rotation.set(0, 0, 0);
        c.position.copy(atRail(homeX[i]));
        rig.setSleeve(i, false);
      });
      rig.springPads.forEach((o) => (o.visible = false));
      rig.massAt(null);
      rig.coil.position.copy(coilHome);
      rig.coil.scale.x = 1;
      rig.thread.visible = false;
      archive.replaceChildren();
      data.clear();
      massLine.textContent = '甲 — kg　乙 — kg';
      resetTrial();
      ui?.relock();
      guide();
    }
    function setLevel(slope) {
      tilt = Math.abs(slope) < 0.0014 ? 0 : clamp(slope, -0.012, 0.012);
      rig.level(tilt);
      settle = 0;
      guide();
    }
    function recordMass() {
      const grams = value.valueAsNumber,
        actual = 200 + (pan === ballast ? 100 : 0);
      if (grams !== actual) return tell('读秤盘前的显示屏，单位是 g。砝码放在块上时，天平已经把它算入。');
      masses[pan] = grams;
      massLine.textContent = names
        .map((n, i) => n + ' ' + (masses[i] === null ? '—' : kg(masses[i]) + ' kg'))
        .join('　');
      closeView();
      clearEntry();
      guide('称得' + grams + ' g。');
    }
    function startTrial(launch) {
      const m = masses.map((v) => v / 1000),
        xs = carts.map((c) => c.position.x);
      run = springRound()
        ? springRelease(m, xs, squeeze)
        : gliderTrial({ m1: m[0], m2: m[1], launch, restitution: round === 0 ? 1 : 0, x1: xs[0], x2: xs[1] });
      // 学生按实际的过门顺序读，光电门本身只编号和计时。
      events = run.events.slice();
      rig.thread.visible = false;
      guide();
    }
    function momentum() {
      const byStage = [[null, null], [null, null]];
      for (const r of readings) byStage[r.event.stage][r.event.glider] = r;
      const terms = byStage.map((pair) =>
        pair.map((r, i) => {
          const velocity = r ? '(' + (r.speed < 0 ? '−' : '') + '10/' + r.dt.toFixed(1) + ')' : '0';
          return kg(masses[i]) + ' × ' + velocity;
        }).join(' + '),
      );
      const total = (speedOf) => byStage.map((pair) =>
        pair.reduce((sum, r, i) => sum + (r ? (masses[i] / 1000) * speedOf(r) : 0), 0),
      );
      return { terms, sums: total((r) => r.speed), displayedSums: total((r) => Number(r.speed.toFixed(3))) };
    }
    function read() {
      if (bar.current === 'mass' && onScale() && masses[pan] === null) return recordMass();
      const e = pendingEvent();
      if (!e || near !== e.gate || !measured()) return;
      const dt = value.valueAsNumber,
        sign = Number(dir.value);
      const j = run.events.filter((a) => a.gate === e.gate).indexOf(e) + 1;
      if (dt !== tms(e)) return tell('看' + gateName(e.gate) + '第 ' + j + ' 行，抄下毫秒数，保留一位小数。');
      if (sign !== e.direction)
        return tell(
          '时间读对了。' + eventName(e) + (e.direction > 0 ? '向右过门，速度取正。' : '向左过门，速度取负。'),
        );
      const speed = (sign * FLAG_WIDTH * 1000) / dt;
      readings.push({ event: e, dt, speed });
      speeds.add([eventName(e), dt.toFixed(1), speed.toFixed(3)]);
      formula.textContent =
        'v ≈ ' + (sign < 0 ? '−' : '') + '10 / ' + dt.toFixed(1) + ' ≈ ' + speed.toFixed(3) + ' m/s';
      closeView();
      clearEntry();
      if (!pendingEvent()) {
        const { terms } = momentum();
        formula.append(h('br'), '碰前　' + terms[0], h('br'), '碰后　' + terms[1], h('br'), '总动量单位 kg·m/s');
      }
      guide(eventName(e) + (sign < 0 ? '向左，速度为负。' : '向右，速度为正。'));
    }
    function compare() {
      if (!measured() || pendingEvent() || bar.finished) return;
      const { sums, displayedSums, terms } = momentum(),
        inputs = [before, after];
      for (let i = 0; i < 2; i++) {
        const answer = inputs[i].valueAsNumber;
        if (![sums[i], displayedSums[i]].some((sum) => Math.abs(answer - sum) <= 0.0005 + 1e-12))
          return tell((i ? '碰后' : '碰前') + '总动量要用 kg 乘 m/s，两项带符号相加。');
      }
      const result = sums.map((sum) => sum.toFixed(3).replace(/^-0\.000$/, '0.000'));
      const difference = Math.abs(sums[1] - sums[0]);
      data.add([modes[round], ...result, difference < 1e-12 ? '0' : String(Number(difference.toPrecision(2)))]);
      archive.append(
        h(
          'details',
          {},
          h('summary', {}, modes[round] + ' · 仿真读数'),
          speeds.el.cloneNode(true),
          h(
            'p',
            { class: 'note' },
            '碰前　' + terms[0] + ' ≈ ' + result[0],
            h('br'),
            '碰后　' + terms[1] + ' ≈ ' + result[1] + ' kg·m/s',
          ),
        ),
      );
      const msg = springRound()
        ? '两块各有动量，方向相反，相加仍约为零。'
        : modes[round] + '后两块的总动量与碰前近似相等。';
      bar.done(stages[round + 2][0]);
      if (bar.finished) {
        pForm.hidden = true;
        readForm.hidden = true;
        speeds.el.hidden = true;
        formula.textContent = '';
        data.el.hidden = false;
        return guide(msg);
      }
      round++;
      placed = [false, false];
      resetTrial();
      guide(msg);
    }
    // 秤盘、收纳座都在轨道前方。沿经过原位和落点的斜面拖动；
    // 射线与该平面的交点随手指移动，提起或放下的高度也随之改变。
    function carry(obj, pick, enabled, destinations, onPlace, hint) {
      let origin, plane, offset, owner;
      const hit = () => {
        if (!ray) return null;
        const p = ray.ray.intersectPlane(plane.clone().applyMatrix4(group.matrixWorld), point(0, 0, 0));
        return p && group.worldToLocal(p);
      };
      return {
        obj: pick,
        anchor: obj,
        keepOffset: true,
        enabled: () => !returning && enabled(),
        hint,
        onStart() {
          owner = obj.parent;
          origin = local(obj);
          const to = destinations()[0];
          const dy = to.y - origin.y,
            dz = to.z - origin.z;
          const normal = Math.abs(dz) > 0.005 ? point(0, 1, -dy / dz).normalize() : point(0, 1, 0);
          plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, origin);
          const p = hit();
          offset = p && origin.clone().sub(p);
        },
        onDrag(pos) {
          const p = hit();
          group.attach(obj);
          obj.position.copy(p && offset ? p.add(offset) : pos);
        },
        onEnd(moved) {
          if (!moved) return;
          const p = local(obj),
            targets = destinations(),
            index = targets.findIndex((t) => p.distanceTo(t) < 0.046);
          if (!cancelled && index !== -1) {
            onPlace(index);
            return;
          }
          returning = { obj, owner, from: p, to: origin, t: 0 };
          guide('没有放稳，器材回到原位。');
        },
      };
    }
    const free = () => near === null && !run && !bar.finished;
    const cartPos = (i, at) => group.worldToLocal(rig.rail.localToWorld(atRail(at)));
    function weighItem(i) {
      const to = () => (onScale() ? cartPos(i, homeX[i]) : panSeat);
      return carry(
        carts[i],
        cartPicks[i],
        () =>
          free() &&
          bar.current === 'mass' &&
          ballast !== null &&
          (pan === i ? masses[i] !== null : !onScale() && masses[i] === null),
        () => [to()],
        () => {
          if (onScale()) {
            rig.rail.add(carts[i]);
            carts[i].rotation.set(0, 0, 0);
            carts[i].position.copy(atRail(homeX[i]));
            pan = null;
            rig.weigh(0);
            if (masses.every((v) => v !== null)) bar.done('mass');
            guide('滑块已放回。');
          } else {
            group.attach(carts[i]);
            carts[i].position.copy(panSeat);
            carts[i].rotation.set(0, 0, 0);
            pan = i;
            rig.weigh(200 + (ballast === i ? 100 : 0));
            inspect(rig.lcd, 'mass', 0.4);
          }
        },
        () => (onScale() ? '拖动：放回导轨' : '拖动：放上秤盘'),
      );
    }
    function sleeveItem(i) {
      const remove = () => springRound();
      return carry(
        rig.sleeves[i],
        rig.sleevePicks[i],
        () => free() && ((round === 1 && placed.every(Boolean) && !sleeves[i]) || (remove() && sleeves[i])),
        () => [remove() ? rig.sleeveHome[i] : group.worldToLocal(rig.face(i))],
        () => {
          sleeves[i] = !remove();
          rig.setSleeve(i, sleeves[i]);
          rig.springPads[i].visible = remove();
          guide(sleeves[i] ? '搭扣已贴好。' : '搭扣已取下。');
        },
        () => (remove() ? '拖动：取下搭扣' : '拖动：贴上搭扣'),
      );
    }
    let cancelled = false;
    let cartStart, lastX, lastMove, firstMove, tiltStart;
    const railReady = () => free() && bar.has('level') && !returning && (!springRound() || !sleeves.some(Boolean));
    function springShape() {
      const left = carts[0].position.x + 0.055,
        right = carts[1].position.x - 0.055;
      rig.coil.position.set((left + right) / 2, springSeat.y, 0);
      rig.coil.scale.x = clamp((right - left) / freeLength, 0.15, 1);
    }
    function lowerThread(fraction) {
      const a = -0.48 * (1 - fraction);
      rig.thread.rotation.z = a;
      rig.thread.scale.z = 1 + 0.7 * (1 - fraction);
      rig.thread.position.set(0.14 * (1 - Math.cos(a)), TRACK_Y + 0.004 - 0.14 * Math.sin(a), 0);
    }
    function compress(p) {
      const cart = carts[0], stop = springX[0] + squeeze;
      if (tieStartZ === null) {
        const last = cart.position.x;
        cart.position.x = clamp(p.x, springX[0], stop);
        springShape();
        if (cart.position.x >= stop - 0.001) {
          const fraction = clamp((stop - last) / Math.max(0.001, p.x - last), 0, 1);
          tieStartZ = lastDragZ + fraction * (p.z - lastDragZ);
          cart.position.x = stop;
          springShape();
          guide();
        }
      }
      lastDragZ = p.z;
      if (tieStartZ === null || tied) return;
      const fraction = clamp((p.z - tieStartZ) / 0.067, 0, 1);
      lowerThread(fraction);
      if (fraction === 1) {
        tied = true;
        guide();
      }
    }
    function railItem(i) {
      const preparing = () => !placed[i];
      return {
        obj: cartPicks[i],
        plane: 'xz',
        offset: TRACK_Y,
        anchor: carts[i],
        keepOffset: true,
        enabled: () =>
          free() &&
          ((bar.current === 'level' && air && i === 1) ||
            (railReady() &&
              (preparing() ||
                (i === 0 &&
                  placed.every(Boolean) &&
                  (round === 0 ||
                    (round === 1 && sleeves.every(Boolean)) ||
                    (springRound() && coilOn && !tied)))))),
        hint: () =>
          bar.current === 'level'
            ? '左右拖：松手试平'
            : preparing()
              ? '左右拖：就位'
              : springRound()
                ? '向右推：压缩弹簧'
                : '向右推：松手碰撞',
        onStart() {
          held = true;
          drift = settle = 0;
          cartStart = lastX = carts[i].position.x;
          lastDragZ = 0;
          firstMove = lastMove = performance.now();
        },
        onDrag(p) {
          if (springRound() && coilOn) return compress(p);
          let lo = -0.56,
            hi = 0.56;
          if (!preparing() && i === 0) {
            lo = cartStart;
            hi = homeX[0] + 0.12;
          }
          if (i === 1) lo = carts[0].position.x + 0.11;
          else hi = Math.min(hi, carts[1].position.x - 0.11);
          const x = clamp(p.x, lo, hi);
          if (Math.abs(lastX - x) > 0.0001) {
            lastX = x;
            lastMove = performance.now();
          }
          carts[i].position.x = x;
        },
        onEnd(moved) {
          held = false;
          if (bar.current === 'level') {
            if (!tilt && Math.abs(carts[1].position.x) < 0.073) settle = 0.001;
            return guide();
          }
          const x = carts[i].position.x,
            dx = x - cartStart;
          if (preparing()) {
            const dest = (springRound() ? springX : homeX)[i];
            if (!cancelled && Math.abs(x - dest) < 0.035) {
              placed[i] = true;
              carts[i].position.x = dest;
              return guide('滑块已就位。');
            }
          } else if (springRound()) {
            tieStartZ = null;
            if (tied) return guide();
            lowerThread(0);
          } else if (!cancelled && moved && dx > 0.012 && performance.now() - lastMove < 330) {
            const launch = clamp(dx / Math.max(0.03, (lastMove - firstMove) / 1000), 0.16, 0.72);
            return startTrial(launch);
          }
          if (Math.abs(dx) > 0.0001) {
            const from = local(carts[i]),
              to = cartPos(i, cartStart);
            returning = { obj: carts[i], owner: rig.rail, from, to, t: 0 };
            group.attach(carts[i]);
          }
          if (preparing()) return guide('还没到标记处。');
          if (springRound()) return guide(dx > 0 ? '线还没套牢，弹簧把甲弹回了。' : '');
          guide('松手时甲要向右运动。');
        },
      };
    }
    const weightDest = (i) => group.worldToLocal(carts[i].localToWorld(point(-0.024, 0.02, 0.002)));
    const weight = carry(
      rig.weight,
      rig.weightPick,
      () => free() && ballast === null,
      () => [weightDest(0), weightDest(1)],
      (i) => {
        ballast = i;
        rig.massAt(i);
        guide('两块的质量现在不同了。');
      },
      '拖动：给滑块加砝码',
    );
    const coil = carry(
      rig.coil,
      rig.coilPick,
      () => free() && springRound() && placed.every(Boolean) && !coilOn,
      () => [springSeat],
      () => {
        coilOn = true;
        springShape();
        lowerThread(0);
        rig.thread.visible = true;
        guide('弹簧刚好接触两端。');
      },
      '拖动：放入轻弹簧',
    );
    const screw = {
      obj: rig.screwPick,
      plane: 'xy',
      offset: 0.077,
      enabled: () => bar.current === 'level' && air && (near === null || near === 'level'),
      hint: '上下拖：调平导轨',
      onStart() {
        tiltStart = tilt;
      },
      onDrag(p, start) {
        if (start) setLevel(tiltStart - (p.y - start.y) * tiltGain);
      },
      onTap() {
        inspect(rig.screw, 'level', 0.45);
      },
    };
    const cartMoves = carts.map((_, i) => railItem(i)),
      weighMoves = carts.map((_, i) => weighItem(i));
    // 称量和沿轨道推同一个滑块，按当前步骤分发，避免两个重合的拾取体争抢。
    const cartActions = cartMoves.map((move, i) => {
      const weigh = weighMoves[i],
        active = () => (bar.current === 'mass' ? weigh : move);
      return {
        ...move,
        enabled: () => active().enabled(),
        hint: () => active().hint(),
        onStart: (...a) => active().onStart(...a),
        onDrag: (...a) => active().onDrag(...a),
        onEnd: (...a) => active().onEnd(...a),
      };
    });
    const pointer = draggable(group, [weight, ...cartActions, screw, ...[0, 1].map(sleeveItem), coil], {
      tip: ctx.tag('', 'pill'),
      taps: [
        {
          obj: rig.powerPick,
          enabled: () => bar.current === 'level' && near === null,
          hint: '点一下：开关气源',
          onTap() {
            air = !air;
            drift = settle = 0;
            leftDrift = 0;
            rig.air(air);
            guide(air ? '气源灯亮了。' : '气源已关。');
          },
        },
        {
          obj: rig.lcd,
          enabled: () => onScale() && masses[pan] === null && near === null,
          hint: '点一下：近看天平',
          onTap() {
            inspect(rig.lcd, 'mass', 0.4);
          },
        },
        ...timers.map((t, i) => ({
          obj: t.screen,
          enabled: () => near === null && !!measured() && !!pendingEvent(),
          hint: '点一下：读遮光时间',
          onTap: () => inspect(t.screen, i, 0.48),
        })),
        {
          obj: rig.threadPick,
          enabled: () => free() && tied && !held,
          hint: '点一下：模拟烧断细线',
          onTap: () => startTrial(0),
        },
      ],
    });
    reset();
    function update(dt) {
      const scale = bar.update(dt);
      ring.update(show.steps && ui?.step === 1 ? bar.target : null, dt);
      if (returning) {
        const r = returning;
        r.t = Math.min(1, r.t + dt / 0.38);
        r.obj.position.lerpVectors(r.from, r.to, 1 - (1 - r.t) ** 2);
        if (coilOn && r.obj === carts[0]) springShape();
        if (r.t === 1) {
          r.owner.attach(r.obj);
          returning = null;
        }
      }
      if (bar.current === 'level' && air) {
        leftDrift -= 9.8 * Math.sin(Math.atan(tilt)) * dt;
        const nx = carts[0].position.x + leftDrift * dt;
        carts[0].position.x = clamp(nx, -0.56, carts[1].position.x - 0.11);
        if (nx !== carts[0].position.x) leftDrift = 0;
      }
      if (bar.current === 'level' && air && !held) {
        drift -= 9.8 * Math.sin(Math.atan(tilt)) * dt;
        const next = carts[1].position.x + drift * dt;
        carts[1].position.x = clamp(next, carts[0].position.x + 0.11, 0.56);
        if (next !== carts[1].position.x) drift = 0;
        if (settle > 0 && !tilt && Math.abs(drift) < 0.002 && near === null) {
          settle += dt;
          if (settle > 0.65) {
            placed[0] = false;
            leftDrift = 0;
            bar.done('level');
            guide('乙松手后停在原处，导轨已调平。');
          }
        }
      }
      if (!run || time >= run.end) return;
      time = Math.min(run.end, time + dt * scale);
      run.positions(time).forEach((x, i) => {
        carts[i].position.x = x;
      });
      if (springRound()) {
        if (time <= run.duration) springShape();
        else {
          const end = run.positions(run.duration);
          rig.coil.scale.x = 1;
          rig.coil.position.set(
            (end[0] + end[1]) / 2,
            Math.max(0.013, springSeat.y - 4.9 * (time - run.duration) ** 2),
            Math.min(0.073, (time - run.duration) * 0.93),
          );
        }
      }
      timers.forEach((_, i) =>
        rig.gateLight(
          i,
          events.some((e) => e.gate === i && e.enter <= time && time < e.exit),
        ),
      );
      while (passed < events.length && events[passed].exit <= time) {
        const e = events[passed++];
        rig.timer(
          e.gate,
          events.slice(0, passed).filter((ev) => ev.gate === e.gate),
        );
        if (passed === events.length)
          guide(
            springRound() ? '两块反向经过两道门。' : round === 1 ? '两块粘住，先后经过右门。' : '两块碰后分开了。',
          );
      }
    }
    const gesture = (step) => qaFlow(pointer, [step])[0];
    const move = (name, obj, to) => gesture({ name, drag: obj, to });
    const tap = (name, obj) => gesture({ name, tap: obj });
    function advanceUntil(ready, failure) {
      for (let frame = 0; frame < 1800 && !ready(); frame++) update(1 / 60);
      if (!ready()) throw Error(failure);
    }
    const submit = (f) => f.querySelector('button').click();
    function massStep(i) {
      return [
        move('把' + names[i] + '放上秤盘', cartPicks[i], panSeat),
        {
          name: '读天平',
          run() {
            if (pan !== i) throw Error('滑块不在秤盘');
            value.value = String(200 + (i === ballast ? 100 : 0));
            submit(readForm);
          },
        },
        move('放回' + names[i], cartPicks[i], () => cartPos(i, homeX[i])),
      ];
    }
    function recordStep(j, incorrect = false) {
      return {
        name: incorrect ? '误读时间' : '记录遮光时间和方向',
        run() {
          const e = events[j];
          if (!e || !measured() || near !== e.gate) throw Error('未看到对应门的完整计时');
          value.value = String(tms(e) + (incorrect ? 1 : 0));
          dir.value = String(e.direction);
          submit(readForm);
          if (incorrect && readings.length !== j) throw Error('误读被接受');
        },
      };
    }
    function qaMeasure(gates, first) {
      const steps = [{
        name: '等待两道门完成计时',
        run() {
          if (!run) throw Error('滑块尚未开始运动');
          advanceUntil(measured, '过门计时未完成');
        },
      }];
      gates.forEach((gate, i) => {
        steps.push(tap('看' + gateName(gate), timers[gate].screen));
        if (first && i === 0) steps.push(recordStep(i, true));
        steps.push(recordStep(i));
      });
      if (first)
        steps.push({
          name: '误算总动量',
          run() {
            before.value = '9';
            after.value = '9';
            submit(pForm);
            if (data.rows.length) throw Error('错误的动量被接受');
          },
        });
      steps.push({
        name: '核对碰前后动量',
        run() {
          const { sums } = momentum();
          before.value = sums[0].toFixed(3);
          after.value = sums[1].toFixed(3);
          submit(pForm);
        },
      });
      return steps;
    }
    const park = (i, x) => move('把' + names[i] + '停在标记处', cartPicks[i], atRail(x));
    const push = () => move('向右轻推甲', cartPicks[0], atRail(-0.385));
    const levelTarget = () => local(rig.screwPick).add(point(0, tilt / tiltGain, 0));
    const qa = [
      move('砝码放偏', rig.weightPick, point(0.33, 0.08, 0.08)),
      move('给乙加砝码', rig.weightPick, () => weightDest(1)),
      ...massStep(0),
      ...massStep(1),
      tap('接通气源', rig.powerPick),
      {
        ...move('调平导轨', rig.screwPick, levelTarget),
        run() {
          // 调平轮按相对位移转动，脚本拖动也要传入按下时的位置。
          const start = local(rig.screwPick);
          screw.onStart();
          screw.onDrag(levelTarget(), start);
        },
      },
      park(1, 0),
      { name: '确认乙松手后停稳', run: () => advanceUntil(() => bar.has('level'), '乙松手后导轨未通过调平检验') },
      park(0, homeX[0]),
      push(),
      ...qaMeasure([0, 1, 0], true),
      park(0, homeX[0]),
      park(1, homeX[1]),
      ...[0, 1].map((i) =>
        move('贴上' + names[i] + '搭扣', rig.sleevePicks[i], () => group.worldToLocal(rig.face(i))),
      ),
      push(),
      ...qaMeasure([0, 1, 1], false),
      ...[0, 1].map((i) => move('取下' + names[i] + '搭扣', rig.sleevePicks[i], rig.sleeveHome[i])),
      park(0, springX[0]),
      park(1, springX[1]),
      move('放入轻弹簧', rig.coilPick, springSeat),
      move('压到标记后提前松手', cartPicks[0], atRail(springX[0] + squeeze)),
      { name: '核对回弹', run() {
        advanceUntil(() => !returning, '松开后滑块未归位');
        if (tied || Math.abs(carts[0].position.x - springX[0]) > 1e-6 || Math.abs(rig.coil.scale.x - 1) > 1e-6)
          throw Error('未套线时松手应回弹到原长');
      } },
      move('压住甲并套紧细线', cartPicks[0], point(springX[0] + 0.12, TRACK_Y, 0.16)),
      tap('烧断细线', rig.threadPick),
      ...qaMeasure([0, 1], false),
      {
        name: '掀开结论',
        run() {
          if (!bar.finished || data.rows.length !== 3) throw Error('未完成三种情形');
          ui.go(2);
          ui.el.querySelector('.flap-front').click();
        },
      },
    ];
    return {
      group: root,
      size: { w: 1.36, d: 0.66, h: 0.2 },
      view: { elev: 34, azim: 5, frameMargin: 0.96 },
      toggles: ['steps'],
      reset,
      update,
      pointer: {
        items: () => pointer.items().filter((it) => it.enabled()),
        down(hit, e) {
          ray = hit;
          const handled = pointer.down(hit, e);
          if (handled && ui?.step === 0) ui.go(1);
          return handled;
        },
        move(hit, e) {
          ray = hit;
          if (ui?.step !== 1) return false;
          return pointer.move(hit, e);
        },
        up(hit, e) {
          ray = null;
          cancelled = e?.type === 'pointercancel';
          const handled = pointer.up(hit, e);
          cancelled = false;
          return handled;
        },
      },
      mount(panel) {
        ui = panel;
        ui.el.append(phoneStyle);
        bar.attach({ need: () => ui.need(''), unlock: () => ui.unlock() });
        ui.status('遮光片宽 10 mm。沿导轨向右为正。');
        ui.controls.append(readForm, formula, pForm);
        ui.data.append(
          h('p', { class: 'note momentum-note' }, '仿真读数。调平后忽略阻力。弹开按理想弹性碰撞计算，粘连后两块同速。忽略搭扣质量。'),
          massLine,
          speeds.el,
          data.el,
          archive,
          h('button', { class: 'go ghost', onclick: reset }, '全部重来'),
        );
        const src = ui.el.querySelector('.answer .src');
        src.style.paddingRight = '78px';
        src.style.minHeight = '48px';
        guide();
      },
      dispose() {
        phoneStyle.remove();
        pointer.dispose();
        ring.dispose();
        bar.dispose();
        rig.dispose();
      },
      debug: { bar, qa },
    };
  },
};
