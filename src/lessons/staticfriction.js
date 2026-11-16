import * as THREE from 'three';
import { FM, forceMeter } from './kit/forcemeter.js';
import { frictionTrial, pullTo, STATIC_MU } from './kit/staticFriction.js';
import { woodBlock } from './kit/props.js';
import { paint } from '../live/ink.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { table, note, buttons } from './kit/ui.js';

const BLOCK_X = -0.205,
  BOARD_Y = 0.012,
  AXIS_Y = 0.036;
const RING_X = BLOCK_X + 0.049 + FM.L + 0.03;
const ZERO = 0.012 + FM.ZERO;

export default {
  id: 'staticfriction',
  fig: '图3.2-4',
  title: '测量最大静摩擦力',
  stampText: '测量',
  predict: {
    q: '水平拉木块，木块仍然静止。再多拉一点但还没拉动，静摩擦力会怎样？',
    options: ['随拉力增大', '始终等于最大静摩擦力', '木块没动就没有摩擦力'],
    answer: 0,
    hint: '留意红指针与木块是否同时开始移动。',
  },
  conclusion: {
    crops: [
      { page: 69, rect: [57.77, 505.08, 384.7, 631.19] },
      { page: 70, rect: [216.48, 369.33, 531.52, 477.16] },
    ],
    quote: '由于这时相互接触的两个物体之间只有相对运动的趋势，而没有相对运动，所以这时的摩擦力叫作静摩擦力（static frictional force）。静摩擦力的方向总是跟物体相对运动趋势的方向相反。只要沙发与地面间没有产生相对运动，静摩擦力的大小就随着推力的增大而增大，并与推力保持大小相等。……静摩擦力的增大有一个限度。图3.2-5中木块所受静摩擦力的最大值Fmax在数值上等于物体即将开始运动时的拉力。两物体之间实际产生的静摩擦力F在0与最大静摩擦力Fmax之间，即0 < F ≤ Fmax',
    why: '木块保持静止时，静摩擦力与拉力大小相等、方向相反。缓慢增大拉力，小纸团保留指针达到的位置。突然猛拉会使弹簧示数产生过冲，木块加速滑动时的示数也不能直接当作滑动摩擦力。',
    src: '课本第 65–66 页 · 第三章 第2节 摩擦力',
  },
  create(ctx) {
    const group = new THREE.Group(),
      meter = forceMeter(),
      block = new THREE.Group();
    const board = woodBlock(0.74, BOARD_Y, 0.14);
    board.position.set(0.066, BOARD_Y / 2, 0);
    group.add(board, block, meter);
    const body = woodBlock(0.09, 0.042, 0.062);
    body.position.y = 0.021;
    block.add(body);
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0013, 8, 20), paint(0x707c80));
    eye.rotation.y = Math.PI / 2;
    eye.position.set(0.049, 0.024, 0);
    block.add(eye);
    for (const x of [-0.022, 0.022])
      for (const z of [-0.014, 0.014]) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.008, 20), paint(0x878c89));
        w.position.set(x, 0.046, z);
        block.add(w);
      }
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.001, 0.0004, 0.08), paint(0x786449));
    line.position.set(BLOCK_X - 0.045, BOARD_Y + 0.0002, 0);
    group.add(line);
    meter.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
    const grip = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 14, 8),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    grip.userData.pick = true;
    meter.add(grip);
    const paper = new THREE.Mesh(new THREE.DodecahedronGeometry(0.0034), paint(0xf4e5cb));
    group.add(paper);
    let state,
      target,
      held,
      inserted,
      peak,
      ready,
      pausedView,
      grab,
      base,
      reading,
      aim,
      ui,
      rows,
      still,
      observedSlip,
      needsZero,
      touch;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'paper', title: '放纸团', todo: '把小纸团轻塞在红指针的零刻线旁。', target: () => aim },
        { id: 'still', title: '木块静止时', todo: '两次轻拉，读两种没把木块拉动的拉力。', target: () => aim },
        { id: 'start', title: '测起动峰值', todo: '继续缓慢拉到木块起动，读纸团保留的刻度。', target: () => aim },
      ],
    });
    function say(s, obj) {
      aim = pausedView ? null : obj;
      bar.say(s);
    }
    function layout() {
      block.position.set(BLOCK_X + state.x, BOARD_Y, 0);
      meter.position.set(RING_X + state.handle, AXIS_Y, 0);
      meter.set(state.tension);
      if (inserted) paper.position.set(meter.position.x - ZERO - peak * FM.PER_N - 0.004, AXIS_Y + 0.007, 0);
    }
    const settled = () => Math.abs(state.handle - state.x) < 0.001 && state.v < 0.001;
    function guide() {
      if (bar.finished)
        return say(
          '木块静止时读到 ' +
            still.map((v) => v.toFixed(1)).join('、') +
            ' N；开始滑动前的缓拉峰值约 ' +
            reading.toFixed(1) +
            ' N。',
        );
      if (!inserted) return say('把台前的小纸团拖到测力计红指针旁，塞在零刻线靠木块的一侧。', paper);
      if (pausedView) return say('读纸团靠红指针的一边，点旁边的刻线。每小格 0.2 N。');
      if (held)
        return say(
          state.slipped
            ? '木块已动。观察指针怎样回落，松手卸力后纸团仍会留在峰值。'
            : '木块若还在起线，就先松手卸力。纸团会保留这次读数。',
        );
      if (ready && !settled()) return say('观察红针卸力回零，纸团停在刚才的位置。');
      if (ready && state.peak > FM.MAX) return say('猛拉超过 5 N 量程。将木块拖回起线，再把纸团推回零刻。', block);
      if (ready) return say('红针已卸力，纸团保留这次最远位置。点测力计近看读数。', paper);
      if (state.slipped) return say('将木块向左拖回起线，重置纸团后再缓慢拉。', block);
      if (needsZero) return say('沿测力计把纸团向右推回红针零刻，再测下一次拉力。', paper);
      if (still.length >= 2) return say('慢慢向右拉圆环，直到木块离开起线，再松手读纸团。', grip);
      return say(
        still.length
          ? '再向右多拉一点，木块仍在起线时松手，比较两个拉力。'
          : '轻轻向右拖圆环，木块仍在起线时松手，再读纸团。',
        grip,
      );
    }
    function leave() {
      ctx.back();
      pausedView = false;
      bar.near(false);
      guide();
    }
    function inspect() {
      if (!ready || held || !settled() || state.peak > FM.MAX) return guide();
      const mid = meter.position.x - ZERO - peak * FM.PER_N;
      pausedView = true;
      bar.near(true);
      ctx.look([mid, AXIS_Y, 0], [0, 1, 0.02], ctx.camera.aspect < 1 ? 0.1 : 0.14, leave);
      guide();
    }
    function read(p) {
      if (!pausedView) {
        inspect();
        return;
      }
      const f = Math.round(((meter.position.x - ZERO - p.x) / FM.PER_N) * 5) / 5;
      if (Math.abs(f - peak) > 0.13 || f < 0 || f > FM.MAX) return say('沿纸团靠指针的一边看相邻刻线，再读一次。');
      const slip = state.slipped,
        validPeak = slip && peak <= STATIC_MU * state.mass * 9.8 + 0.22;
      rows.add([slip ? '已起动' : '静止', f.toFixed(1), slip ? (validPeak ? '缓拉峰值' : '猛拉过冲') : '由静摩擦平衡']);
      ready = false;
      needsZero = true;
      leave();
      if (!slip) {
        if (still.every((x) => Math.abs(x - f) > 0.3)) still.push(f);
        if (still.length >= 2) bar.done('still');
        guide();
      } else if (still.length >= 2 && validPeak) {
        reading = f;
        bar.done('start');
        guide();
      } else
        say(
          validPeak
            ? '木块已经滑动。拖回起线，这次先轻拉到木块仍静止。'
            : '这次拉得太快，纸团读数包含惯性过冲。拖回起线，慢慢重试。',
          block,
        );
    }
    function rewind() {
      state = frictionTrial();
      target = 0;
      needsZero = inserted && peak > 0;
      held = ready = observedSlip = false;
      layout();
      guide();
    }
    function reset() {
      if (pausedView) leave();
      inserted = pausedView = false;
      still = [];
      peak = reading = 0;
      rewind();
      paper.position.set(RING_X - ZERO, 0.0034, 0.105);
      rows?.clear();
      bar.undo('paper', 'still', 'start');
      guide();
    }
    const manip = draggable(
      group,
      [
        {
          obj: paper,
          plane: 'xz',
          offset: AXIS_Y + 0.007,
          hint: '放纸团或近看纸团留下的读数',
          onStart(p) {
            touch = p?.clone();
            grab = paper.position.clone();
            base = peak;
          },
          onDrag(p, start) {
            if (!start || pausedView) return;
            if (inserted) {
              if (needsZero && !state.slipped) {
                peak = clamp(base - (p.x - start.x) / FM.PER_N, 0, base);
                layout();
              }
              return;
            }
            paper.position.set(p.x, AXIS_Y + 0.007, p.z);
          },
          onEnd(moved) {
            if (moved && needsZero && !state.slipped && peak < 0.07) {
              state.peak = peak = 0;
              needsZero = false;
              layout();
              guide();
            }
            if (!inserted && moved) {
              if (Math.abs(paper.position.x - (meter.position.x - ZERO)) < 0.018 && Math.abs(paper.position.z) < 0.02) {
                inserted = true;
                bar.done('paper');
                layout();
              } else paper.position.copy(grab);
              guide();
            }
          },
          onTap() {
            if (pausedView && touch) read(touch);
            else if (inserted) inspect();
          },
        },
        {
          obj: grip,
          plane: 'xz',
          offset: AXIS_Y,
          enabled: () => inserted && !pausedView && !bar.finished && !needsZero && !ready && !state.slipped,
          hint: '向右拖圆环，松手卸力',
          onStart() {
            held = true;
            ready = false;
            base = state.handle;
            target = base;
            guide();
          },
          onDrag(p, start) {
            if (start) target = clamp(base + p.x - start.x, 0, 0.245);
          },
          onEnd(moved) {
            held = false;
            if (moved && peak > 0.14) ready = true;
            guide();
          },
        },
        {
          obj: block,
          plane: 'xz',
          offset: BOARD_Y + 0.03,
          enabled: () => inserted && !pausedView && !held && state.slipped && !bar.finished,
          hint: '将木块拖回起线',
          onStart() {
            base = state.x;
          },
          onDrag(p, start) {
            if (!start) return;
            state.x = clamp(base + p.x - start.x, 0, base);
            state.v = 0;
            state.handle = state.x;
            state.tension = 0;
            layout();
          },
          onEnd() {
            if (state.x < 0.009) rewind();
            else guide();
          },
        },
        {
          obj: meter,
          plane: 'xz',
          offset: AXIS_Y + 0.006,
          enabled: () => inserted && !held,
          hint: '近看纸团与刻度',
          onStart(p) {
            grab = p?.clone();
          },
          onTap() {
            if (grab) read(grab);
          },
        },
      ],
      { highlight: true },
    );
    reset();
    return {
      group,
      size: { w: 0.76, d: 0.23, h: 0.11 },
      view: { azim: 1, elev: 46, lookY: 0.38, margin: 1.03 },
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
        rows = table(['木块', '纸团 / N', '观察']);
        panel.data.append(rows.el);
        panel.notes.append(
          note(
            '水平拉环，木块和上面砝码总质量为 0.50 kg。松手后卸去拉力。纸团是机械记号，只随向大读数移动的指针前进。缓拉才适于用峰值估计最大静摩擦力。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        if (!inserted) return;
        // 松手卸力后，测力计回到不受拉的位置；纸团仍相对于刻度板保留在峰值。
        const wasSettled = settled();
        const x = held ? target : Math.max(state.x, state.handle - dt * 0.22);
        pullTo(state, x, dt);
        if (!needsZero) peak = Math.min(FM.MAX, state.peak);
        if (ready && !wasSettled && settled()) guide();
        if (state.slipped && !observedSlip) {
          observedSlip = true;
          guide();
        }
        layout();
      },
      dispose() {
        manip.dispose();
        bar.dispose();
      },
    };
  },
};
