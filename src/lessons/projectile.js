// 人教版必修二图 5.3-2。坐标单位 m；h 是球底到承接面的垂直距离。
import * as THREE from 'three';
import { inked, paint, hull } from '../live/ink.js';
import { woodBlock, rulerMesh, textPlate, C } from './kit/props.js';
import { clamp, draggable } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { sfx } from './kit/audio.js';
import { buttons, table, note } from './kit/ui.js';

const R = 0.018,
  FLOOR = 0.012,
  ORIGIN = -0.23,
  G = 9.8;
// 同一把锤从静止摆下，击打速度随 sin(摆角/2) 增大；传给 A 的速率按固定比例近似。
const launchSpeed = (pull) => 3.1 * Math.sin(pull / 2);
const degrees = (pull) => Math.round((pull * 180) / Math.PI);

export default {
  id: 'projectile',
  fig: '图5.3-2',
  title: '研究平抛运动的竖直分运动',
  stampText: '探究',
  predict: {
    q: '同一高度同时出发，A 球被水平击出，B 球由静止下落。你预计哪个先落地？',
    options: ['A 先', '同时', 'B 先'],
    answer: 1,
  },
  conclusion: {
    quote: '从同一高度同时释放，水平抛出的球和自由下落的球同时落地。',
    why: '忽略空气阻力，两球的初始竖直速度都是零，竖直加速度都是 g。相同时间内它们下降相同的距离；提高释放位置，两球的下落时间一起变长。',
    src: '人教版高中物理必修第二册第 11 页 · 图 5.3-2',
  },
  create(ctx) {
    const group = new THREE.Group();
    function block(parent, w, h, d, x, y, z, color) {
      const mesh = inked(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint(color)));
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    }
    const mat = block(group, 0.75, FLOOR, 0.15, 0.025, FLOOR / 2, 0, 0xb5a48b);
    const standBase = woodBlock(0.16, 0.022, 0.15);
    standBase.position.set(-0.31, 0.011, -0.151);
    group.add(standBase);
    block(group, 0.018, 0.61, 0.018, -0.31, 0.321, -0.11, C.metal);
    const scale = rulerMesh({ length: 0.5, width: 0.025, divisions: 500, every: 10, labelEvery: 50 });
    scale.rotation.order = 'ZXY';
    scale.rotation.z = Math.PI / 2;
    scale.rotation.x = Math.PI / 2;
    scale.position.set(-0.324, FLOOR + 0.25, -0.096);
    group.add(scale);
    const assembly = new THREE.Group();
    assembly.position.x = ORIGIN;
    group.add(assembly);
    const collar = block(assembly, 0.059, 0.046, 0.051, -0.08, 0.082, -0.11, C.darkMetal);
    block(assembly, 0.11, 0.018, 0.03, -0.047, 0.082, -0.081, C.metal);
    block(assembly, 0.024, 0.018, 0.105, 0, 0.082, -0.039, C.darkMetal);
    const leaf = new THREE.Group();
    assembly.add(leaf);
    leaf.position.set(0, 0.08, 0);
    block(leaf, 0.005, 0.085, 0.039, 0, -0.0425, 0, C.metal);
    // B 托舌随弹片向右撤开。A 的短托座固定，球被水平推出。
    block(leaf, 0.04, 0.005, 0.035, -0.018, -0.08 - R - 0.0025, 0, C.metal);
    block(leaf, 0.005, R, 0.033, 0, -0.08 - R / 2, 0, C.metal);
    block(assembly, 0.029, 0.005, 0.04, 0.016, -R - 0.0025, 0, C.wood);
    block(assembly, 0.022, 0.014, 0.11, 0.016, -R - 0.011, -0.046, C.darkMetal);
    block(assembly, 0.105, 0.014, 0.017, -0.031, -R - 0.011, -0.095, C.darkMetal);
    block(assembly, 0.021, 0.13, 0.018, -0.08, 0.03, -0.095, C.metal);
    const hammer = new THREE.Group();
    assembly.add(hammer);
    hammer.position.set(-0.032, 0.195, 0);
    block(assembly, 0.012, 0.114, 0.012, -0.032, 0.139, -0.081, C.metal);
    block(assembly, 0.016, 0.014, 0.1, -0.032, 0.195, -0.041, C.metal);
    const handle = woodBlock(0.014, 0.134, 0.018);
    handle.position.y = -0.067;
    hammer.add(handle);
    block(hammer, 0.057, 0.026, 0.037, 0, -0.143, 0, C.darkMetal);
    const balls = ['A', 'B'].map((name, i) => {
      const ball = hull(new THREE.Mesh(new THREE.SphereGeometry(R, 32, 24), paint(i ? 0x93b8c1 : 0xb98961)), 0.001);
      group.add(ball);
      const plate = textPlate(name, { w: 0.022, h: 0.018, color: '#172529', font: 'bold 380px sans-serif' });
      plate.position.z = R + 0.0002;
      ball.add(plate);
      return ball;
    });
    const trials = [];
    let height = 0.34,
      strength = 0.55,
      phase = 'ready',
      elapsed = 0,
      wind = 0,
      replay = false,
      trial = null,
      ui,
      records;
    const startX = (i) => ORIGIN + (i ? -0.024 : 0.022);
    const y0 = () => FLOOR + height + R;
    const parked = () => balls.forEach((b, i) => b.position.set(startX(i), y0(), 0));
    const pose = () => {
      assembly.position.y = y0();
      parked();
    };
    pose();
    function target() {
      if (phase === 'landed') return balls[0];
      if (phase !== 'ready') return null;
      if (bar.current === 'height' && !trials.some((t) => t.h !== height && t.k === strength)) return collar;
      return hammer;
    }
    const bar = lessonBar({
      ...ctx,
      group,
      steps: [
        { id: 'drop', title: '同时释放', todo: '把锤头向左拉开，松手击打弹片，观察两球。', target },
        { id: 'speed', title: '改变击打力度', todo: '保持高度，改变拉锤幅度，比较落地先后。', target },
        { id: 'height', title: '改变释放高度', todo: '上下拖动立杆上的夹头，保持击打力度再做一次。', target },
      ],
    });
    block(assembly, 0.046, 0.004, 0.012, -0.081, -R, -0.083, 0xa85236);
    function guidance() {
      if (phase === 'landed') {
        bar.say(
          bar.finished
            ? '比较已完成。点板慢放；展开笔记本查看三组落地记录。'
            : '点承接板慢放，比较两球高度；点落地的球装回，做下一轮。',
        );
        return;
      }
      if (bar.finished) {
        bar.say('三组比较已完成。展开笔记本查看记录。');
        return;
      }
      if (bar.current === 'drop') bar.say('把锤头向左拉开，松手击打弹片。观察 A、B 谁先落地。');
      else if (bar.current === 'speed')
        bar.say(
          '保持 ' +
            Math.round(trials[0].h * 100) +
            ' cm 高度。这次把锤头拉得' +
            (trials[0].k > 0.75 ? '近一些' : '远一些') +
            '再松手。',
        );
      else
        bar.say(
          trials.some((t) => t.h !== height && t.k === strength)
            ? '球底到承接板 ' + Math.round(height * 100) + ' cm。点锤头，用上次力度再击打。'
            : '上下拖立杆上的夹头换高度，再按上次力度击打。',
        );
    }
    function record() {
      const prior = trials.slice();
      trials.push(trial);
      records.add([
        String(trials.length),
        String(Math.round(height * 100)),
        degrees(strength) + '°',
        trial.end.toFixed(3),
        trial.end.toFixed(3),
        (launchSpeed(strength) * trial.end * 100).toFixed(1),
      ]);
      bar.done('drop');
      if (prior.some((t) => t.h === height && Math.abs(t.k - strength) >= 0.09)) bar.done('speed');
      if (prior.some((t) => t.h !== height && t.k === strength)) bar.done('height');
    }
    function launch() {
      trial = { h: height, k: strength, end: Math.sqrt((2 * height) / G) };
      phase = 'flight';
      elapsed = 0;
      replay = false;
      hammer.rotation.z = 0;
      sfx.clink({ freq: 1100 });
      bar.say('观察两个球离开装置后的高度。');
    }
    function animateFall(t) {
      const dy = (G * t * t) / 2;
      balls.forEach((ball, i) =>
        ball.position.set(startX(i) + (i ? 0 : launchSpeed(trial.k) * t), FLOOR + R + Math.max(0, trial.h - dy), 0),
      );
      leaf.rotation.z = 0.55 * clamp(t / 0.018, 0, 1) * clamp((0.14 - t) / 0.07, 0, 1);
    }
    function slow() {
      if (phase !== 'landed') return;
      replay = true;
      elapsed = 0;
      phase = 'flight';
      animateFall(0);
      bar.say('四分之一速回看同一次击打，比较两球在同一瞬间的高度。');
    }
    let from;
    function reload() {
      if (phase !== 'landed') return;
      phase = 'loading';
      elapsed = 0;
      from = balls.map((b) => b.position.clone());
      bar.say('把 A、B 装回原来的托座。');
    }
    const enter = () => {
      if (document.body.classList.contains('predicting')) ui?.go(1);
    };
    const drags = [
      {
        obj: hammer,
        plane: 'xy',
        offset: 0,
        enabled: () => phase === 'ready',
        hint: '向左拉锤，松手击打',
        onStart() {
          enter();
          wind = 0;
        },
        onDrag(p, start) {
          if (!start) return;
          wind = clamp(start.x - p.x, 0, 0.15);
          hammer.rotation.z = -Math.asin(clamp(wind / 0.143, 0, 0.85));
          bar.say('松手击打 · ' + degrees(-hammer.rotation.z) + '°');
        },
        onEnd(moved) {
          if (moved && wind >= 0.014) {
            strength = -hammer.rotation.z;
            strike();
          } else hammer.rotation.z = 0;
        },
        onTap() {
          if (trials.length) {
            phase = 'backswing';
            elapsed = 0;
          } else guidance();
        },
      },
      {
        obj: collar,
        plane: 'xy',
        offset: -0.11,
        keepOffset: true,
        enabled: () => phase === 'ready',
        hint: '上下拖动夹头，改变释放高度',
        onStart: enter,
        onDrag(p) {
          height = Math.round(clamp(p.y - 0.082 - FLOOR - R, 0.22, 0.44) * 100) / 100;
          pose();
          bar.say('球底到承接板 ' + Math.round(height * 100) + ' cm。松手固定夹头。');
        },
        onEnd() {
          guidance();
        },
      },
    ];
    function strike() {
      phase = 'strike';
      elapsed = 0;
      hammer.rotation.z = -strength;
      bar.say('观察两球释放的瞬间。');
    }
    const pointer = draggable(group, drags, {
      highlight: true,
      taps: [
        ...balls.map((obj) => ({ obj, enabled: () => phase === 'landed', hint: '把两球装回托座', onTap: reload })),
        { obj: mat, enabled: () => phase === 'landed', hint: '慢放上次击打', onTap: slow },
      ],
    });
    return {
      group,
      pointer,
      toggles: ['steps'],
      size: { w: 0.86, d: 0.5, h: 0.66 },
      view: { elev: 12, azim: -7, lookY: 0.45, margin: 1.1 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        guidance();
        records = table(['轮次', '高度 / cm', '拉锤角度', 'A 落地 / s', 'B 落地 / s', 'A 水平位移 / cm']);
        ui.data.append(note('模型忽略空气阻力。表中的秒数取自模拟时钟，从同时释放算到球底接触承接板。'), records.el);
        ui.notes.append(
          note('向左拖锤头并松手。落地后点承接板可慢放，点球可装回。上下拖夹头改变高度；点锤头能重复上次力度。'),
          buttons([
            { text: '慢放上次击打', onClick: slow },
            { text: '装回两球', onClick: reload },
            {
              text: '全部重做',
              onClick() {
                phase = 'ready';
                height = 0.34;
                strength = 0.55;
                wind = elapsed = 0;
                replay = false;
                trial = from = null;
                hammer.rotation.z = leaf.rotation.z = 0;
                pose();
                trials.length = 0;
                records.clear();
                bar.undo('drop', 'speed', 'height');
                guidance();
              },
            },
          ]).el,
        );
      },
      update(dt) {
        bar.update(dt);
        if (phase === 'backswing') {
          elapsed += dt;
          hammer.rotation.z = -strength * clamp(elapsed / 0.25, 0, 1);
          if (elapsed >= 0.25) strike();
        } else if (phase === 'strike') {
          elapsed += dt;
          hammer.rotation.z = -strength * (1 - clamp(elapsed / 0.13, 0, 1) ** 2);
          if (elapsed >= 0.13) launch();
        } else if (phase === 'flight') {
          elapsed = Math.min(trial.end, elapsed + dt * (replay ? 0.25 : 1));
          animateFall(elapsed);
          if (elapsed >= trial.end) {
            phase = 'landed';
            sfx.clink({ freq: 510 });
            if (!replay) record();
            guidance();
          }
        } else if (phase === 'loading') {
          elapsed += dt;
          const u = clamp(elapsed / 0.5, 0, 1);
          balls.forEach((b, i) => {
            b.position.copy(from[i]).lerp(new THREE.Vector3(startX(i), y0(), 0), u);
            b.position.y += 0.05 * Math.sin(u * Math.PI);
          });
          leaf.rotation.z = 0;
          if (u === 1) {
            phase = 'ready';
            guidance();
          }
        }
      },
      dispose() {
        pointer.dispose();
        bar.dispose();
      },
    };
  },
};
