import * as THREE from 'three';
import { inclineRig, SCALE_Z, WIDTH, PAN_X, PAN_Z, PAN_Y } from './kit/inclineRig.js';
import { TRACK_Y } from './kit/momentumRig.js';
import { GATES, FLAG_WIDTH } from './kit/momentum.js';
import { inclineRun, measuredEnergy, energyIntervals } from './kit/inclineEnergy.js';
import { lessonBar } from './kit/lessonbar.js';
import { draggable, clamp } from './kit/interact.js';
import { table, note, h, buttons } from './kit/ui.js';

const MASS = 200;
export default {
  id: 'inclineenergy',
  fig: '图8.5-4',
  title: '研究沿斜面下滑物体的机械能',
  stampText: '验证',
  predict: {
    q: '滑块沿通气的斜导轨经过两道门。重力势能的减少量与哪一项比较？',
    options: ['两门之间动能的增加量', '到第二道门时的全部动能', '两个门的遮光时间差'],
    answer: 0,
    hint: '滑块经过第一道门时已经有速度。',
  },
  conclusion: {
    quote: '在气垫显著减小摩擦时，滑块下滑过程中重力势能的减少量与动能增加量在测量误差范围内相等。',
    why: '沿同一把竖尺读两门红线求高度差。用遮光片宽度除以各门的遮光时间，估计滑块分别经过两门的速率。比较 mgΔh 与 m(v₂²−v₁²)/2。',
    src: '人教版高中物理必修第二册第 97 页，参考案例 2',
  },
  create(ctx) {
    const rig = inclineRig(),
      { group, rail, screw, power, ruler, timers, massScreen } = rig,
      cart = rig.carts[0];
    let ui,
      rows,
      form,
      fields,
      evidence,
      near,
      aim,
      air,
      slope,
      weighed,
      onPan,
      heights,
      run,
      t,
      passed,
      finished,
      saved;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'mass', title: '称滑块', todo: '把带遮光片的滑块放在天平上称量。', target: () => aim },
        { id: 'height', title: '量落差', todo: '升高左端，用竖尺读两道门红线的高度。', target: () => aim },
        { id: 'time', title: '测遮光时间', todo: '通气，从左门上方静止放开滑块。', target: () => aim },
        {
          id: 'energy',
          title: '比较机械能',
          todo: '用本轮读数计算两门之间的势能减少量和动能增加量。',
          target: () => aim,
        },
      ],
    });
    const say = (s, obj) => {
      aim = near === null ? obj : null;
      bar.say(s);
    };
    const at = (obj) => group.worldToLocal(obj.getWorldPosition(new THREE.Vector3()));
    const moving = () => run && !finished;
    function leave() {
      ctx.back();
      near = null;
      bar.near(false);
      guide();
    }
    function look(key, p, dir, dist) {
      near = key;
      bar.near(true);
      ctx.look(p.toArray(), dir, dist, leave);
      guide();
    }
    function updateForm() {
      if (!form) return;
      form.hidden = !(weighed && heights.every(Number.isFinite) && passed.every(Boolean) && !saved);
      evidence.textContent =
        (weighed ? '滑块连遮光片 ' + MASS + ' g。' : '') +
        heights.map((mm, i) => (mm === null ? '' : (i ? '右' : '左') + '门红线 ' + mm + ' mm。')).join('');
    }
    function guide() {
      if (near === 'height') return say('按红线与竖尺平齐的位置读到毫米，点它旁边的刻线。');
      if (near === 'mass') return say('这是滑块连同遮光片的总质量。回全景后调整导轨。');
      if (typeof near === 'number')
        return say('数字是' + (near ? '右' : '左') + '门的遮光时间，单位毫秒。记下读数，回全景比较两道门。');
      if (moving()) return say('观察遮光片扫过两道光束，各门在遮光结束时留下时间。');
      if (saved) return say('这组实测已保存。可改变左端高度、移尺复测，再从左门上方放手。');
      if (!weighed) return say('把装着黑色遮光片的滑块拖到右前方天平的金属秤盘上。', cart);
      if (slope < 0.02) return say('托起左脚的金色调节轮，把导轨左端升高，使两门有可量的落差。', screw);
      const i = heights.findIndex((v) => v === null);
      if (i >= 0) return say('把竖尺沿台面拖到' + (i ? '右' : '左') + '门红线旁，点尺面近看，读同一高度基准。', ruler);
      if (!air) return say('接通左前方的气源。未通气时，这个缓坡上的滑块从静止放手会停住。', power);
      if (finished && !passed.every(Boolean))
        return say('这次没有完整遮住两道门。拖回左门的上坡一侧，再从静止放手。', cart);
      if (!passed.every(Boolean)) return say('抓住滑块，放在左门的上坡一侧，松手让它自己下滑。', cart);
      say('两门的计时已保留。点计时器可近看；展开笔记本，记录毫秒读数并比较两种能量。');
    }
    function emptyTimes() {
      run = null;
      t = 0;
      passed = [false, false];
      finished = saved = false;
      timers.forEach((timer) => timer.draw([]));
      bar.undo('time', 'energy');
      updateForm();
      fields?.forEach((f) => (f.value = ''));
    }
    function start() {
      if (onPan) return guide();
      emptyTimes();
      run = inclineRun({ start: cart.position.x, slope, air });
      guide();
    }
    function reset() {
      if (near !== undefined && near !== null) leave();
      near = null;
      air = weighed = onPan = false;
      slope = 0;
      heights = [null, null];
      rail.add(cart);
      cart.rotation.set(0, 0, 0);
      cart.position.set(-0.46, TRACK_Y, 0);
      rig.level(0);
      rig.weigh(0);
      power.position.y = 0.067;
      ruler.position.set(-0.044, 0, SCALE_Z);
      emptyTimes();
      bar.undo('mass', 'height');
      rows?.clear();
      guide();
    }
    const rulerEdge = () => ruler.position.x - WIDTH / 2;
    const beside = () => rig.refs().findIndex((v) => Math.abs(rulerEdge() - v.x - 0.01) < 0.008);
    let grab, oldSlope, point, dragged;
    const manip = draggable(
      group,
      [
        {
          obj: cart,
          plane: 'xz',
          offset: TRACK_Y,
          enabled: () => !moving() && near === null,
          hint: '提起滑块，移到秤盘或导轨上再松手',
          onStart() {
            grab = at(cart);
            dragged = false;
          },
          onDrag(p, startPoint) {
            if (!startPoint) return;
            dragged = true;
            group.attach(cart);
            cart.rotation.set(0, 0, 0);
            cart.position.copy(grab);
            cart.position.x += p.x - startPoint.x;
            cart.position.z += p.z - startPoint.z;
            cart.position.y = Math.max(grab.y, TRACK_Y) + 0.035;
          },
          onEnd() {
            if (!dragged) return;
            const p = cart.position.clone();
            if (Math.abs(p.x - PAN_X) < 0.11 && Math.abs(p.z - (PAN_Z - 0.018)) < 0.085) {
              onPan = weighed = true;
              emptyTimes();
              cart.position.set(PAN_X, PAN_Y + 0.028, PAN_Z - 0.018);
              rig.weigh(MASS);
              bar.done('mass');
              guide();
            } else if (Math.abs(p.z) < 0.08 && Math.abs(p.x) < 0.6) {
              onPan = false;
              rail.attach(cart);
              cart.rotation.set(0, 0, 0);
              cart.position.set(clamp(cart.position.x, -0.55, 0.55), TRACK_Y, 0);
              rig.weigh(0);
              start();
            } else if (onPan) {
              cart.position.set(PAN_X, PAN_Y + 0.028, PAN_Z - 0.018);
              guide();
            } else {
              rail.attach(cart);
              cart.position.copy(rail.worldToLocal(group.localToWorld(grab.clone())));
              cart.rotation.set(0, 0, 0);
              guide();
            }
          },
        },
        {
          obj: screw,
          plane: 'xy',
          offset: 0.077,
          enabled: () => !moving() && near === null,
          hint: '上下调节左端高度',
          onStart() {
            oldSlope = slope;
          },
          onDrag(p, startPoint) {
            if (!startPoint) return;
            const next = clamp(oldSlope + (p.y - startPoint.y) / 0.96, 0, 0.084);
            if (Math.abs(next - slope) < 0.0001) return;
            slope = next;
            rig.level(-slope);
            heights = [null, null];
            bar.undo('height');
            emptyTimes();
          },
          onEnd() {
            if (air && !onPan) start();
            else guide();
          },
        },
        {
          obj: ruler,
          plane: 'xy',
          offset: SCALE_Z,
          enabled: () => !moving() && (near === null || near === 'height'),
          hint: '平移竖尺，沿红线读高度',
          onStart(p) {
            grab = ruler.position.clone();
            point = p?.clone();
          },
          onDrag(p, startPoint) {
            if (!startPoint || near !== null) return;
            ruler.position.x = clamp(grab.x + p.x - startPoint.x, -0.36, 0.36);
          },
          onEnd(moved) {
            if (!moved || near !== null) return;
            const i = beside();
            if (i >= 0) ruler.position.x = rig.refs()[i].x + 0.01 + WIDTH / 2;
            guide();
          },
          onTap() {
            const i = beside();
            if (i < 0) return say('尺的刻线边要贴到一道门前方红线的右端。', ruler);
            if (near === null) {
              const pos = rig.refs()[i];
              pos.x += 0.021;
              pos.z = SCALE_Z;
              look('height', pos, [0, 0, 1], ctx.camera.aspect < 1 ? 0.09 : 0.14);
              return;
            }
            if (!point) return;
            const mm = Math.round(point.y * 1000);
            if (Math.abs(mm - rig.refs()[i].y * 1000) > 1) return say('沿红线水平看向竖尺，点同高的毫米刻线。');
            heights[i] = mm;
            if (heights.every(Number.isFinite) && heights[0] - heights[1] >= 10) bar.done('height');
            else if (heights.every(Number.isFinite)) {
              heights = [null, null];
              leave();
              return say('两门落差不足 10 mm。再升高左端，重新读两处高度。', screw);
            }
            updateForm();
            leave();
          },
        },
      ],
      {
        highlight: true,
        taps: [
          {
            obj: power,
            enabled: () => !moving() && near === null,
            hint: '接通或关闭气源',
            onTap() {
              air = !air;
              power.position.y = air ? 0.064 : 0.067;
              if (air && !onPan && !finished) start();
              else guide();
            },
          },
          {
            obj: massScreen,
            enabled: () => near === null,
            hint: '近看电子天平读数',
            onTap() {
              look('mass', at(massScreen), [0, 1, 0.1], 0.26);
            },
          },
          ...timers.map((tm, i) => ({
            obj: tm.screen,
            enabled: () => near === null,
            hint: '近看本门的数字计时',
            onTap() {
              look(i, at(tm.screen), [0, 1, 0.1], 0.38);
            },
          })),
        ],
      },
    );
    function record() {
      if (!weighed || !passed.every(Boolean) || !heights.every(Number.isFinite) || saved) return;
      const [ms1, ms2, loss, gain] = fields.map((f) => f.valueAsNumber);
      if (ms1 !== run.gates[0]?.milliseconds || ms2 !== run.gates[1]?.milliseconds)
        return say('请对照两台计时器，左、右两栏都用毫秒。');
      const data = {
        massGrams: MASS,
        heightMm: heights[0] - heights[1],
        timesMs: [ms1, ms2],
        flagMm: FLAG_WIDTH * 1000,
      };
      const values = measuredEnergy(data);
      if (!Number.isFinite(loss) || Math.abs(loss - values.loss) > 0.0006)
        return say('把质量换成 kg、落差换成 m，再算 mgΔh，记到 0.001 J。');
      if (!Number.isFinite(gain) || Math.abs(gain - values.gain) > 0.0006)
        return say('分别用 10 mm 除以两门的毫秒数得到 m/s；动能增加量要减去第一道门时的动能，记到 0.001 J。');
      const { potential, kinetic } = energyIntervals(data);
      const overlaps = potential[0] <= kinetic[1] && kinetic[0] <= potential[1];
      evidence.textContent +=
        '按毫米尺与毫秒计时器的半格估计，势能减少范围 ' +
        potential.map((v) => v.toFixed(3)).join('–') +
        ' J，动能增加范围 ' +
        kinetic.map((v) => v.toFixed(3)).join('–') +
        ' J。';
      rows.add([
        String(MASS),
        heights.join(' → '),
        data.timesMs.join(' → '),
        values.v1.toFixed(3) + ' → ' + values.v2.toFixed(3),
        loss.toFixed(3),
        gain.toFixed(3),
      ]);
      saved = true;
      form.hidden = true;
      if (overlaps) {
        bar.done('energy');
        say(
          '本轮势能减少 ' +
            loss.toFixed(3) +
            ' J，动能增加 ' +
            gain.toFixed(3) +
            ' J，两者在尺与计时器的读数误差内相符。',
        );
      } else say('两量的误差范围没有重叠。这轮保留；请复查高度差或改变坡度重测。');
    }
    reset();
    return {
      group,
      size: { w: 1.49, h: 0.28, d: 0.46 },
      view: { azim: -9, elev: 27, lookY: 0.44, margin: 1.02 },
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
        rows = table(['总质量 / g', '两门高度 / mm', '遮光 / ms', '速率 / (m/s)', '势能减少 / J', '动能增加 / J']);
        const labels = ['左门遮光 / ms', '右门遮光 / ms', '势能减少 / J', '动能增加 / J'];
        fields = labels.map((label, i) =>
          h('input', { type: 'number', step: i < 2 ? '1' : '0.001', 'aria-label': label }),
        );
        form = h(
          'div',
          { class: 'ctl' },
          note('遮光片宽 10 mm。v ≈ 遮光片宽度 / 遮光时间，g 取 9.8 m/s²。把两种能量都记到 0.001 J。'),
          ...fields.map((f, i) => h('label', {}, labels[i] + ' ', f)),
          buttons([{ text: '记录并比较', onClick: record }]).el,
        );
        evidence = note('');
        form.hidden = true;
        panel.data.append(evidence, rows.el, form);
        panel.notes.append(
          note(
            '气源开启时忽略滑块摩擦。沿竖尺读取两个光束的高度；同一遮光片在两门之间下降的高度相同。遮光期间的平均速率近似作为经过门时的速率。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        if (!moving()) return;
        t = Math.min(run.end, t + dt);
        cart.position.x = run.position(t);
        run.gates.forEach((g, i) => {
          if (g && !passed[i] && t >= g.exit) {
            passed[i] = true;
            timers[i].draw([g]);
          }
        });
        if (t >= run.end) {
          finished = true;
          if (passed.every(Boolean)) bar.done('time');
          updateForm();
          guide();
        }
      },
      dispose() {
        manip.dispose();
        bar.dispose();
        rig.dispose();
      },
    };
  },
};
