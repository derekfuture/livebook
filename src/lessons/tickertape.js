import * as THREE from 'three';
import { paint } from '../live/ink.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow } from './kit/chemlesson.js';
import { buttons, h, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { apparatus } from './kit/ticker/apparatus.js';
import { stampMass } from './kit/ticker/loadRack.js';
import { advance, makeRun } from './kit/ticker/motion.js';
import { speedTape, seriesColors } from './kit/ticker/speedTape.js';
import { speedGraph } from './kit/ticker/speedGraph.js';

const TRAVEL = 0.12,
  HOOK_START = 0.194,
  START = 0.14,
  DISC = 0.009;
const masses = [10, 20, 30];
const steps = [
  ['first', '打第一条纸带'],
  ['repeat', '换槽码和纸带'],
  ['read', '量点距求速度'],
  ['plot', '描速度图'],
];
function newRun(index) {
  const r = makeRun(masses[index] / 1000);
  r.end = Math.sqrt((2 * TRAVEL) / r.a);
  return r;
}
export default {
  id: 'tickertape',
  fig: '图2.1-1',
  title: '探究小车速度随时间变化的规律',
  stampText: '测量',
  predict: {
    q: '小车在槽码牵引下从静止出发。每经过相同的时间，它的速度怎样变化？',
    options: ['增加得一样多', '增加得越来越多', '保持不变'],
    answer: 0,
    hint: '用纸带比较同一辆小车在不同时刻的速度。',
  },
  conclusion: {
    page: 43,
    rect: [64.28, 369.61, 381.28, 456.39],
    quote:
      '无论 Δt 选在什么区间，对应的速度的变化量 Δv 与时间的变化量 Δt 之比都是一样的，即物体运动的加速度保持不变。所以，实验中小车的运动是加速度不变的运动。',
    why: '纸带上每五个打点间隔对应 0.10 s。量出某计数点前后各 0.10 s 的总位移，除以 0.20 s，就得到这段的平均速度。匀加速时，它等于中间时刻的瞬时速度。在速度—时间图上比较同一条纸带的两点，速度差除以时间差就是这段的加速度。',
    src: '课本第 39 页 · 第二章 第2节 匀变速直线运动的速度与时间的关系',
  },

  create(ctx) {
    const rig = apparatus({ low: true, levelTravel: TRAVEL, powerSwitch: true });
    const base = rig.group,
      root = new THREE.Group().add(base);
    base.position.set(-0.025, 0, -0.055);
    const tape = speedTape(base);
    const cartPick = new THREE.Mesh(
      new THREE.BoxGeometry(0.105, 0.045, 0.071),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    cartPick.userData.pick = true;
    cartPick.position.y = 0.025;
    rig.cart.add(cartPick);
    const discs = [],
      textures = [];
    for (let i = 0; i < 3; i++) {
      const profile = [
        [0.002, -DISC / 2],
        [0.023, -DISC / 2],
        [0.023, DISC / 2],
        [0.002, DISC / 2],
        [0.002, -DISC / 2],
      ];
      const mesh = new THREE.Mesh(
        new THREE.LatheGeometry(
          profile.map((p) => new THREE.Vector2(...p)),
          36,
        ),
        paint(0xb58d4d),
      );
      textures.push(stampMass(mesh, 10, 0.03, 0.012, DISC / 2));
      discs.push({ mesh, home: new THREE.Vector3(-0.4 + 0.065 * i, DISC / 2, 0.145) });
    }
    let ui, form, field, rows, archive, graph, result, tableBox;
    let load = 0,
      run = newRun(0),
      state = 'ready',
      powered = false,
      near = false,
      message = '';
    let which = 0,
      count = 0,
      plotted = 0,
      added = false,
      returning = null;
    const sheets = [],
      values = [];
    const canRead = () => bar.current === 'read';
    const sheet = () => sheets[which];
    const display = () => (canRead() || bar.has('read') ? sheet().run : run);
    const eligible = (r, i) => i > 0 && i + 20 < r.marks.length && r.marks[i].x - r.marks[i - 1].x >= 0.0007;
    const valid = () => run.marks.some((_, i) => eligible(run, i));
    const needMass = () => state === 'saved' && !added && sheets.length < 3;
    const canReturn = () => state === 'bad' || (state === 'saved' && added);
    const hint = (text) => (ui?.step === 1 ? text : '');
    const bar = lessonBar({
      look: ctx.look,
      back: leave,
      group: base,
      steps: steps.map(([id, title]) => ({ id, title, todo: title, target })),
    });
    function target() {
      if (near || returning || bar.has('read')) return null;
      if (canRead()) return tape.mesh;
      if (needMass()) return discs[load + 1].mesh;
      if (canReturn() || state === 'position') return cartPick;
      if (state === 'running') return null;
      return state === 'ready' && powered ? cartPick : rig.timer;
    }
    function instruction() {
      if (bar.finished) return '同一条纸带的三个点接近一条上升直线。相等时间内，小车的速度增加得几乎一样多。';
      if (bar.current === 'plot') {
        const r = values[plotted];
        return (
          '在图上描纸带 ' +
          (r.index + 1) +
          ' 的点：横轴 ' +
          r.t.toFixed(2) +
          ' s，纵轴 ' +
          r.v.toFixed(3) +
          ' m/s。'
        );
      }
      if (canRead()) {
        if (!near) return '三条纸带已存好。点前排纸带，放大看点和尺。';
        if (sheet().origin == null)
          return '纸带 ' + (which + 1) + '：舍掉开头密点，点一个能分清的点作计时起点，右侧要留够四个 0.10 s。';
        return (
          '尺的零线已对准第 ' +
          count +
          ' 点。读第 ' +
          (count + 2) +
          ' 点下的毫米数，求中间第 ' +
          (count + 1) +
          ' 点的速度。'
        );
      }
      if (state === 'position') return '把小车向右拖到计时器旁，给它留出运动的距离。';
      if (needMass())
        return '纸带 ' + sheets.length + ' 已留好。把一枚 10 g 槽码拖到左端挂钩上，改变小车受到的牵引。';
      if (canReturn())
        return (added ? '槽码已加到 ' + masses[load] + ' g。' : '') + '向右拖回小车，到起点换上新纸带。';
      if (state === 'running')
        return powered ? '相同时间打一个点，看前排纸带上的点距怎样变化。' : '小车还在走，断电后纸带上没有新点。';
      if (state === 'stopped') return '小车停住了。立即点开关断电，留下本次纸带。';
      return powered
        ? '绿灯亮了。点小车放手，让它拖着纸带运动。'
        : '小车停在计时器旁。先点开关通电，让纸带从放车时开始记点。';
    }
    function say(feedback = '') {
      message = feedback;
      bar.say((feedback ? feedback + ' ' : '') + instruction());
    }
    function drawRig(x = run.x) {
      rig.draw({ ...run, x, powered, tied: true, hookY: HOOK_START - x, wheel: x });
    }
    const narrowRead = () => near && innerWidth <= 760 && sheet()?.origin != null;
    function drawTape() {
      const reading = canRead() || bar.has('read');
      tape.draw(
        display(),
        reading ? which : added ? load - 1 : load,
        reading ? sheet().origin : null,
        count,
        reading,
        narrowRead(),
      );
    }
    function mountDisc(i) {
      const d = discs[i];
      if (i <= load) {
        rig.pan.add(d.mesh);
        d.mesh.position.set(0, -0.058 + (i + 0.5) * DISC, 0);
      } else {
        base.add(d.mesh);
        d.mesh.position.copy(d.home);
      }
    }
    function enter() {
      if (ui?.step === 0) ui.go(1);
    }
    function showForm() {
      if (!form) return;
      form.hidden = !canRead() || !near || sheet()?.origin == null;
      field.value = '';
    }
    function inventory() {
      if (!archive) return;
      archive.replaceChildren(
        ...sheets.map((s, i) =>
          h(
            'span',
            { style: 'color:' + seriesColors[i] + ';margin-right:12px' },
            '纸带 ' + (i + 1) + ' · ' + masses[i] + ' g',
          ),
        ),
      );
    }
    function save() {
      if (!valid()) {
        state = 'bad';
        say(run.marks.length ? '断电太早，可测的点不够。' : '计时器没有通电，这是一条空白纸带。');
        return;
      }
      sheets.push({ run, origin: null });
      state = 'saved';
      inventory();
      if (sheets.length === 1) bar.done('first');
      if (sheets.length === 3) bar.done('repeat');
      if (canRead()) {
        which = 0;
        count = 0;
      }
      drawTape();
      say('同样长的时间里，点距逐渐变大，小车越来越快。');
    }
    function toggle() {
      if (state !== 'ready' && !powered) return;
      enter();
      powered = !powered;
      run.recording = powered;
      if (powered) {
        run.next = 0;
        run.marks.length = 0;
        advance(run, 0);
      }
      drawRig();
      drawTape();
      if (!powered && state === 'stopped') save();
      else say();
    }
    function release() {
      if (state !== 'ready') return;
      enter();
      state = 'running';
      say();
    }
    function resetCart() {
      added = false;
      state = 'ready';
      powered = false;
      run = newRun(load);
      rig.setPaperVisible(true);
      drawRig();
      drawTape();
      say('新纸带已穿过计时器。');
    }
    function leave() {
      if (!near) return;
      near = false;
      ctx.back();
      drawTape();
      bar.near(false);
      showForm();
      say();
    }
    function frameTape() {
      const target = tape.mesh.position.clone().add(base.position);
      // 窄屏上，三种槽码、所有可选起点的读数都在 0–64 mm 内。
      if (narrowRead()) target.x -= 0.105;
      ctx.look(target.toArray(), tape.normal, tape.width * (narrowRead() ? 1.07 : 1.82), leave);
    }
    function inspect() {
      near = true;
      bar.near(true);
      drawTape();
      frameTape();
      ui.fold(false);
      showForm();
      say();
    }
    function chooseOrigin(i) {
      if (!near || !canRead() || sheet().origin != null) return;
      const r = sheet().run;
      if (i < 0) return say('点在纸带的墨点上。');
      if (i + 20 >= r.marks.length) return say('这个点太靠后，右边的间隔不够。');
      if (!eligible(r, i)) return say('这里的点还挤在一起，再向右找。');
      sheet().origin = i;
      count = 0;
      drawTape();
      if (innerWidth <= 760) frameTape();
      showForm();
      say('这里记作 0 点，每五个打点间隔取一个计数点。');
    }
    function expected() {
      const i = sheet().origin + 5 * count,
        marks = sheet().run.marks;
      return (marks[i + 10].x - marks[i].x) * 1000;
    }
    function submit() {
      if (form.hidden) return;
      const d = Math.round(field.valueAsNumber * 10) / 10;
      if (!Number.isFinite(d)) return say('填入两端之间的距离，单位是毫米。');
      const error = d - expected();
      if (Math.abs(error) > 0.55) return say('点距读' + (error > 0 ? '大' : '小') + '了。每小格是 1 mm。');
      // 点距以 0.1 mm 记下，速度以 0.001 m/s 入表。
      const v = Math.round(Math.round(d * 10) / 2) / 1000,
        t = (count + 1) / 10;
      values.push({ index: which, t, v });
      const formula = (d / 1000).toFixed(4) + ' m ÷ 0.20 s ≈ ' + v.toFixed(3) + ' m/s';
      result.textContent = '纸带 ' + (which + 1) + ' · ' + t.toFixed(2) + ' s：' + formula;
      rows.add([masses[which], t.toFixed(2), d.toFixed(1), v.toFixed(3)]);
      tableBox.hidden = false;
      count++;
      let feedback = '读对了。';
      if (count === 3) {
        feedback = '这条纸带量了三个时刻，速度逐次增大。';
        if (which < 2) {
          which++;
          count = 0;
          if (innerWidth <= 760) frameTape();
        } else {
          count = 2;
          bar.done('read');
          leave();
          graph.set(values);
          graph.canvas.hidden = false;
          ui.fold(false);
          ui.el.querySelector('.p-body').scrollTop = 0;
        }
      }
      drawTape();
      showForm();
      say(feedback);
    }
    function onPoint(ok, n) {
      if (!ok) return say('这个位置和读数没有对上。');
      plotted = n;
      if (plotted === values.length) bar.done('plot');
      say(plotted % 3 === 0 && !bar.finished ? '这条纸带的三个点接近一条直线。' : '');
    }
    const canGrabCart = () =>
      !returning && (state === 'position' || state === 'ready' || canReturn()) && !canRead() && !bar.has('read');
    const cartDrag = {
      obj: cartPick,
      anchor: rig.cart,
      keepOffset: true,
      plane: 'xy',
      offset: 0,
      enabled: canGrabCart,
      hint: () =>
        canGrabCart()
          ? hint(state === 'position' ? '向右拖：小车就位' : canReturn() ? '向右拖：换新纸带' : '点一下：放车')
          : '',
      onStart: enter,
      onTap: release,
      onDrag(p) {
        if (state === 'position') drawRig(clamp(START - p.x, 0, TRAVEL));
        else if (canReturn()) {
          rig.setPaperVisible(false);
          drawRig(clamp(START - p.x, 0, TRAVEL));
        }
      },
      onEnd(moved) {
        if (!moved) return;
        if (state === 'position') {
          if (rig.cart.position.x >= START - 0.009) {
            state = 'ready';
            drawRig();
            say();
          } else {
            returning = { cart: true, from: START - rig.cart.position.x, to: 0.072, t: 0 };
            say('小车还没有到计时器旁。');
          }
          return;
        }
        if (!canReturn()) return;
        if (rig.cart.position.x >= START - 0.009) resetCart();
        else {
          returning = { cart: true, from: START - rig.cart.position.x, to: TRAVEL, t: 0 };
          say('小车还没有回到起点。');
        }
      },
    };
    const seat = () => new THREE.Vector3(-0.324, HOOK_START - TRAVEL - 0.058 + (load + 1.5) * DISC, 0);
    const massDrags = discs.slice(1).map(({ mesh, home }, j) => {
      const i = j + 1;
      // 运输平面经过待取槽码和挂钩。沿鼠标视线与平面求交，保持实际抓取偏移。
      let offset;
      function onPlane(p) {
        const cam = base.worldToLocal(ctx.camera.getWorldPosition(new THREE.Vector3()));
        const dir = p.clone().sub(cam),
          target = seat(),
          slope = (target.y - home.y) / (target.z - home.z);
        const k = (home.y - cam.y + slope * (cam.z - home.z)) / (dir.y - slope * dir.z);
        return cam.addScaledVector(dir, k);
      }
      const enabled = () => needMass() && !returning && i === load + 1;
      return {
        obj: mesh,
        plane: 'xz',
        offset: home.y,
        enabled,
        hint: () => (enabled() ? hint('拖动：加挂槽码') : ''),
        onStart(p) {
          offset = p ? home.clone().sub(onPlane(p)) : new THREE.Vector3();
        },
        onDrag(p) {
          mesh.position.copy(onPlane(p).add(offset));
          mesh.position.y = Math.max(DISC / 2, mesh.position.y);
        },
        onEnd(moved) {
          if (!moved) return;
          if (mesh.position.distanceTo(seat()) < 0.034) {
            added = true;
            load++;
            mountDisc(i);
            say();
          } else {
            returning = { mesh, home, from: mesh.position.clone(), t: 0 };
            say('槽码没有套住挂钩。');
          }
        },
      };
    });
    const pointer = draggable(base, [cartDrag, ...massDrags], {
      tip: ctx.tag('', 'pill'),
      taps: [
        {
          obj: rig.switchPick,
          enabled: () => state === 'ready' || powered,
          hint: () =>
            state === 'ready' || powered ? hint(powered ? '点一下：断开电源' : '点一下：接通电源') : '',
          onTap: toggle,
        },
        {
          obj: tape.mesh,
          enabled: () => canRead() && (!near || sheet().origin == null),
          hint: () =>
            canRead() && (!near || sheet().origin == null)
              ? hint(near ? '点墨点：选计时起点' : '点一下：放大纸带')
              : '',
          onTap(ray) {
            if (!near) inspect();
            else chooseOrigin(ray ? tape.hit(ray) : -1);
          },
        },
      ],
    });
    function reset() {
      if (near) leave();
      load = which = count = plotted = 0;
      added = powered = false;
      returning = null;
      sheets.length = values.length = 0;
      state = 'position';
      run = newRun(0);
      bar.undo(...steps.map((s) => s[0]));
      discs.forEach((_, i) => mountDisc(i));
      rig.setPaperVisible(true);
      drawRig(0.072);
      drawTape();
      inventory();
      showForm();
      if (ui) {
        rows.clear();
        tableBox.hidden = true;
        result.textContent = '';
        graph.set([]);
        graph.canvas.hidden = true;
        ui.relock();
        ui.fold(false);
      }
      say();
    }
    reset();
    function update(dt) {
      const scale = bar.update(dt);
      if (returning) {
        const r = returning;
        r.t = Math.min(1, r.t + dt / 0.4);
        const k = 1 - (1 - r.t) ** 2;
        if (r.cart) drawRig(r.from + (r.to - r.from) * k);
        else r.mesh.position.lerpVectors(r.from, r.home, k);
        if (r.t === 1) {
          if (r.cart) rig.setPaperVisible(true);
          returning = null;
        }
      }
      if (state !== 'running') return;
      const before = run.marks.length;
      advance(run, dt * scale);
      drawRig();
      if (run.marks.length !== before) drawTape();
      if (run.t >= run.end) {
        state = 'stopped';
        if (powered) say();
        else save();
      }
    }
    function qaRead(wrong) {
      field.value = (expected() + (wrong ? 5 : 0)).toFixed(1);
      form.querySelector('button').click();
    }
    const sw = (name) => ({ name, tap: rig.switchPick });
    const drive = () => ({ name: '释放小车', tap: cartPick, wait: 5 });
    const rewind = () => ({
      name: '拖回小车换带',
      drag: cartPick,
      to: () => new THREE.Vector3(START, rig.top, 0),
    });
    const pickOrigin = () => {
      const i = sheet().run.marks.findIndex((_, j) => eligible(sheet().run, j)) + 1;
      return i;
    };
    const qa = qaFlow(pointer, [
      { ...rewind(), name: '把小车拖到计时器旁' },
      { name: '忘记通电', tap: cartPick, wait: 5 },
      {
        name: '核对空白纸带',
        run() {
          if (state !== 'bad' || run.marks.length) throw Error('空白纸带有误');
        },
      },
      rewind(),
      ...masses.flatMap((_, i) => [
        ...(i ? [{ name: '加挂槽码', drag: discs[i].mesh, to: seat }, rewind()] : []),
        sw('接通电源'),
        drive(),
        sw('断电保存纸带'),
      ]),
      { name: '近看第一条纸带', tap: tape.mesh },
      ...masses.flatMap((_, i) => [
        {
          name: '选择计时起点',
          run() {
            chooseOrigin(pickOrigin());
          },
        },
        ...(!i
          ? [
              {
                name: '误读毫米尺',
                run() {
                  qaRead(true);
                  if (values.length || !message.includes('读大')) throw Error('错读未被指出');
                },
              },
            ]
          : []),
        ...[1, 2, 3].map((n) => ({ name: '读第' + n + '个点的速度', run: () => qaRead(false) })),
      ]),
      {
        name: '根据九组读数描点',
        run() {
          if (values.length !== 9 || bar.current !== 'plot') throw Error('纸带记录不完整');
          graph.mark(0, 0);
          if (plotted) throw Error('错点进入图像');
          for (const r of values) graph.mark(...graph.point(r));
          if (!bar.finished) throw Error('速度图未完成');
        },
      },
      {
        name: '掀开课本结论',
        run() {
          ui.go(2);
          ui.el.querySelector('.flap-front').click();
        },
      },
    ]);
    // 质检鼠标落在真实墨点上，沿用学生的纸带射线拾取。
    for (const q of qa.filter((q) => q.name === '选择计时起点')) {
      const spot = new THREE.Mesh(new THREE.PlaneGeometry(0.001, 0.001));
      spot.visible = false;
      base.add(spot);
      q.mouse = {
        kind: 'tap',
        get obj() {
          spot.position.copy(base.worldToLocal(tape.localDot(pickOrigin())));
          return spot;
        },
      };
    }
    return {
      group: root,
      size: { w: 0.95, d: 0.44, h: 0.27 },
      view: { elev: 26, azim: -9, frameMargin: 1.04 },
      pointer,
      toggles: ['steps'],
      reset,
      update,
      mount(panel) {
        ui = panel;
        // 给结论页的印章留出纸面，书名和页码完整可读。
        ui.el.querySelector('.answer').style.paddingBottom = '88px';
        bar.attach({ ...ui, need: () => {} });
        ui.status('小车在槽码牵引下，速度怎样随时间变化？');
        archive = h('p', { class: 'note' });
        result = h('p', { class: 'note', 'aria-live': 'polite' });
        field = h('input', {
          type: 'number',
          step: 'any',
          inputmode: 'decimal',
          required: true,
          style: 'width:6em',
        });
        form = h(
          'form',
          {
            hidden: true,
            onsubmit(e) {
              e.preventDefault();
              submit();
            },
          },
          h('label', {}, '点距 / mm　', field),
          h('button', { class: 'go', type: 'submit' }, '记录点距'),
        );
        rows = table(['槽码 / g', 't / s', '点距 / mm', 'v / (m/s)']);
        tableBox = rows.el;
        tableBox.hidden = true;
        graph = speedGraph(onPoint);
        graph.set([]);
        graph.canvas.hidden = true;
        ui.controls.append(archive, form, result, graph.canvas);
        ui.data.append(tableBox, buttons([{ text: '全部重来', ghost: true, onClick: reset }]).el);
        ui.notes.append(
          h(
            'p',
            { class: 'note' },
            '模型中小车质量为 450 g，木板水平，忽略阻力、绳和挂钩的质量。打点频率为 50 Hz。',
          ),
        );
        say();
      },
      dispose() {
        rig.dispose();
        tape.dispose();
        pointer.dispose();
        bar.dispose();
        textures.forEach((t) => t.dispose());
      },
      debug: {
        bar,
        qa,
        get S() {
          return { load, state, powered, near, which, count, plotted, origin: sheet()?.origin };
        },
        dot: (i) => tape.localDot(i),
      },
    };
  },
};
