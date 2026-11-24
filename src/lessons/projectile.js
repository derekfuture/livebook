// 人教版必修二图 5.3-2。坐标单位 m；h 是球底到承接面的垂直距离。
import * as THREE from 'three';
import { inked, paint, hull } from '../live/ink.js';
import { woodBlock, rulerMesh, textPlate, C } from './kit/props.js';
import { clamp, draggable } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { sfx } from './kit/audio.js';
import { qaFlow } from './kit/chemlesson.js';
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
    page: 20, rect: [217.0, 411.81, 531.07, 514.0],
    quote: '物体在 y 方向的分运动是从静止开始、加速度为 g 的匀加速运动，vy＝gt。',
    why: '忽略空气阻力，A 和 B 的初始竖直速度都是零，竖直加速度都是 g。平抛运动的竖直分运动是自由落体运动。',
    src: '课本第 16 页 · 第五章 第4节 抛体运动的规律',
  },
  create(ctx) {
    const root = new THREE.Group();
    const group = new THREE.Group();
    root.add(group);
    function block(parent, w, h, d, x, y, z, color) {
      const mesh = inked(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint(color)));
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    }
    const mat = block(group, 0.64, FLOOR, 0.14, -0.012, FLOOR / 2, 0, 0xd6c4a5);
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
    const collar = block(assembly, 0.070, 0.042, 0.062, -0.08, 0.082, -0.11, C.darkMetal);
    block(assembly, 0.11, 0.018, 0.03, -0.047, 0.082, -0.081, C.metal);
    block(assembly, 0.024, 0.018, 0.105, 0, 0.082, -0.039, C.darkMetal);
    const leaf = new THREE.Group();
    assembly.add(leaf);
    leaf.position.set(0, 0.08, 0);
    block(leaf, 0.005, 0.085, 0.039, 0, -0.0425, 0, C.metal);
    // 弹片下端推动水平滑舌。B 球坐在滑舌左端，A 球坐在固定托座右沿。
    const tongue = new THREE.Group();
    assembly.add(tongue);
    block(tongue, 0.026, 0.004, 0.018, -0.011, -R - 0.002, 0, C.metal);
    block(tongue, 0.004, R, 0.018, 0.002, -R / 2, 0, C.metal);
    // 固定托座开槽，两侧支承避开向右撤出的滑舌。
    for (const z of [-0.012, 0.012])
      block(assembly, 0.015, 0.005, 0.005, 0.0145, -Math.sqrt(R * R - 0.0095 ** 2) - 0.0025, z, C.wood);
    block(assembly, 0.015, 0.012, 0.021, 0.0145, -0.028, -0.001, C.darkMetal);
    block(assembly, 0.015, 0.012, 0.1, 0.0145, -0.028, -0.053, C.darkMetal);
    block(assembly, 0.105, 0.014, 0.017, -0.031, -R - 0.011, -0.095, C.darkMetal);
    block(assembly, 0.021, 0.13, 0.018, -0.08, 0.03, -0.095, C.metal);
    const hammer = new THREE.Group();
    assembly.add(hammer);
    hammer.position.set(-0.032, 0.195, 0);
    block(assembly, 0.012, 0.114, 0.012, -0.032, 0.139, -0.081, C.metal);
    block(assembly, 0.016, 0.014, 0.1, -0.032, 0.195, -0.041, C.metal);
    const handle = woodBlock(0.014, 0.134, 0.018);
    const head = block(hammer, 0.057, 0.026, 0.037, 0, -0.143, 0, C.darkMetal);
    head.add(handle);
    handle.position.y = 0.076;
    // 正面浅色端盖让锤头和后面的夹头容易区分。
    block(head, 0.009, 0.027, 0.038, 0.023, 0, 0, C.metal);
    const indexMark = new THREE.Group();
    indexMark.position.copy(hammer.position);
    assembly.add(indexMark);
    block(indexMark, 0.006, 0.034, 0.005, 0, -0.157, -0.022, 0xa64a35);
    block(assembly, 0.046, 0.004, 0.012, -0.081, -R, -0.083, 0xa85236);
    const balls = ['A', 'B'].map((name, i) => {
      const ball = hull(new THREE.Mesh(new THREE.SphereGeometry(R, 32, 24), paint(i ? 0x93b8c1 : 0xb98961)), 0.001);
      group.add(ball);
      const plate = textPlate(name, { w: 0.022, h: 0.018, color: '#172529', font: 'bold 380px sans-serif' });
      plate.position.z = R + 0.0002;
      ball.add(plate);
      return ball;
    });
    // 每隔相同的物理时间留一对点，只画两球已经走过的路。
    const interval = 0.025;
    const tracks = balls.map((_, i) => {
      const dot = new THREE.SphereGeometry(0.0032, 10, 8);
      const marks = Array.from({ length: 13 }, () => {
        const mesh = new THREE.Mesh(dot, paint(i ? 0x3b7682 : 0x9a5b33));
        group.add(mesh);
        return mesh;
      });
      const impact = new THREE.Mesh(new THREE.RingGeometry(0.022, 0.025, 48),
        new THREE.MeshBasicMaterial({ color: i ? 0x3b7682 : 0x9a5b33, side: THREE.DoubleSide }));
      impact.rotation.x = -Math.PI / 2;
      group.add(impact);
      return { marks, impact };
    });

    const cm = (h) => Math.round(h * 100);
    const rad = THREE.MathUtils.degToRad;
    const startX = (i) => ORIGIN + (i ? -0.024 : 0.022);
    const rows = table(['轮次', '高度 / cm', '拉锤角度', '落地先后']);
    const slowCaption = '四分之一速慢放，两球从同一高度同时出发。';
    const firstGuide = '向左拉开锤头再松手，看水平飞出的 A 和自由下落的 B 谁先落地。';
    let ui, height, phase, angle, elapsed, trial, first, changedHeight, replay, result;

    function target() {
      if (!canSet() || ui?.step !== 1) return null;
      if (bar.current === 'height' && height === first.h) return collar;
      if (bar.current === 'speed' && height !== changedHeight.h) return collar;
      return head;
    }
    const bar = lessonBar({ ...ctx, group, steps: [
      { id: 'drop', title: '比较落地先后', todo: firstGuide, target },
      { id: 'height', title: '只改高度', todo: '上下拖夹头换一个高度，再把锤头拉到红线松手，保持第一次的力度。', target },
      { id: 'speed', title: '只改力度', todo: '保持高度，比红线多拉或少拉一段再松手，比较落地先后。', target },
    ] });
    const actions = buttons([
      { text: '慢放回看', ghost: true, onClick: review },
      { text: '全部重做', ghost: true, onClick: reset },
    ]);
    const replayButton = actions.btns[0];
    const canSet = () => phase === 'ready' || phase === 'landed';
    const reference = () => changedHeight || first;
    const hint = (enabled, words) => () => ui?.step === 1 && enabled() ? words : '';
    function guide() {
      if (bar.finished) return bar.say('两次改变条件，两球都同时落地。可以掀开课本结论，或继续试。');
      if (bar.current === 'height' && height !== first.h)
        return bar.say('高度已改变。把锤头中心拉到红线再松手，用第一次的力度比较。');
      if (bar.current === 'speed' && height !== changedHeight.h)
        return bar.say('上下拖夹头，回到 ' + cm(changedHeight.h) + ' cm，再单独改变力度。');
      bar.say(null);
    }
    function prepare() {
      phase = 'ready';
      replayButton.hidden = true;
      assembly.position.y = FLOOR + height + R;
      balls.forEach((b, i) => b.position.set(startX(i), assembly.position.y, 0));
      tracks.forEach(({ marks, impact }) => {
        marks.forEach(m => { m.visible = false; });
        impact.visible = false;
      });
      tongue.position.x = leaf.rotation.z = hammer.rotation.z = 0;
      showReference();
    }
    function showReference() {
      indexMark.visible = !!reference();
      if (indexMark.visible) indexMark.rotation.z = -rad(reference().angle);
    }
    function reset() {
      height = 0.34;
      angle = elapsed = 0;
      trial = first = changedHeight = null;
      replay = false;
      result = '';
      rows.clear();
      bar.undo('drop', 'height', 'speed');
      ui?.relock();
      ui?.status('两球在同一高度的托座上。');
      prepare();
      hideTip();
      if (ui) ctx.reframe();
      guide();
    }
    function enter() {
      if (ui.step !== 1) ui.go(1);
    }
    function land() {
      phase = 'landed';
      replayButton.hidden = false;
      tracks.forEach(({ impact }, i) => {
        impact.position.set(balls[i].position.x, FLOOR + 0.0005, 0);
        impact.visible = true;
      });
      sfx.clink({ freq: 510 });
      if (!replay) {
        rows.add([String(rows.rows.length + 1), String(cm(height)), angle + '°', '同时']);
        if (!first) {
          first = trial;
          result = 'A 沿曲线飞出，B 竖直下落。两球同时碰到承接板。';
          bar.done('drop');
        } else if (bar.current === 'height' && height !== first.h && angle === first.angle) {
          changedHeight = trial;
          result = (height > first.h ? '放得更高，两球都落得更久' : '放得更低，两球都更早落地') + '，仍然同时着板。';
          bar.done('height');
        } else if (bar.current === 'speed' && height === changedHeight.h && angle !== changedHeight.angle) {
          result = (angle > changedHeight.angle ? '击打更重，A 飞得更远' : '击打更轻，A 飞得更近') + '，却仍和 B 同时落地。';
          bar.done('speed');
        } else if (!bar.finished) {
          const sameHeight = height === reference().h, samePull = angle === reference().angle;
          if (sameHeight && samePull) result = '高度和力度都没变，两球仍同时落地。';
          else if (!sameHeight && !samePull) result = '两球同时落地。高度和力度一起变了，无法单独比较其中一个条件。';
          else result = '两球同时落地。这次只改了' + (sameHeight ? '力度' : '高度') + '。';
        } else result = '这次 A 和 B 也同时落地。';
      }
      showReference();
      ui.status(result);
      guide();
    }
    function positionAt(obj, i, t) {
      obj.position.set(startX(i) + (i ? 0 : trial.v * t),
        FLOOR + R + Math.max(0, trial.h - G * t * t / 2), 0);
    }
    function fly() {
      phase = 'flight';
      replayButton.hidden = true;
      elapsed = 0;
      hammer.rotation.z = 0;
      balls.forEach((ball, i) => {
        positionAt(ball, i, 0);
        tracks[i].impact.visible = false;
        tracks[i].marks.forEach((m, j) => {
          positionAt(m, i, j * interval);
          m.visible = false;
        });
      });
      indexMark.visible = false;
      ui.status(slowCaption);
      bar.say('看两球各自走过的路，再看它们碰板的瞬间。');
      sfx.clink({ freq: 1100 });
    }
    const landed = () => phase === 'landed';
    function review() {
      enter();
      replay = true;
      fly();
    }
    const drags = [
      {
        obj: head, plane: 'xy', keepOffset: true, enabled: canSet,
        hint: hint(canSet, '向左拖：拉开锤头'),
        onStart() { enter(); },
        onDrag(p) {
          if (phase === 'landed') prepare();
          const dx = ORIGIN + hammer.position.x - p.x;
          const dy = assembly.position.y + hammer.position.y - p.y;
          const pull = clamp(Math.atan2(dx, Math.max(0.001, dy)), 0, rad(62));
          const ref = reference();
          const aligned = ref && pull >= rad(16) && Math.abs(degrees(pull) - ref.angle) <= 3;
          angle = aligned ? ref.angle : degrees(pull);
          hammer.rotation.z = aligned ? -rad(angle) : -pull;
          ui.status(aligned ? '锤头已对准红线，松手时力度相同。' : '锤头拉开约 ' + angle + '°。');
        },
        onEnd(moved) {
          if (!moved && phase === 'landed') { guide(); return; }
          if (!moved || -hammer.rotation.z < rad(16)) {
            angle = -hammer.rotation.z * 180 / Math.PI;
            elapsed = 0;
            phase = 'returning';
            ui.status('锤头没有拉开到能击动弹片的位置，两球留在托座上。');
            return;
          }
          trial = { h: height, angle, end: Math.sqrt(2 * height / G), v: launchSpeed(rad(angle)) };
          phase = 'strike';
          elapsed = 0;
          replay = false;
          indexMark.visible = false;
        },
      },
      {
        obj: collar, plane: 'xy', offset: -0.11, keepOffset: true, enabled: canSet,
        hint: hint(canSet, '上下拖：调释放高度'),
        onStart: enter,
        onDrag(p) {
          height = Math.round(clamp(p.y - 0.082 - FLOOR - R, 0.22, 0.44) * 100) / 100;
          prepare();
          ui.status('两球球底距承接板 ' + cm(height) + ' cm。');
          guide();
        },
      },
    ];
    const tip = ctx.tag('', 'pill');
    const hideTip = () => tip.loc(group, 0, -9, 0);
    const canvas = document.getElementById('c');
    canvas.addEventListener('pointerleave', hideTip);
    const pointer = draggable(group, drags, { tip,
      taps: [{ obj: mat, enabled: landed, hint: hint(landed, '点一下：慢放本轮'), onTap: review }],
    });
    reset();

    // 两种运行方式共用鼠标的落点，角度按锤头绕轴的圆弧计算。
    const pullTo = (a) => () => new THREE.Vector3(ORIGIN + hammer.position.x - 0.143 * Math.sin(rad(a)),
      assembly.position.y + hammer.position.y - 0.143 * Math.cos(rad(a)), 0);
    const check = (ok, message) => { if (!ok) throw new Error(message); };
    return {
      group: root, pointer, reset, toggles: ['steps'],
      size: { w: 0.86, d: 0.43, h: 0.69 },
      view: { elev: 10, azim: 0, frameMargin: 1.11 },
      mount(panel) {
        ui = panel;
        bar.attach({ need() {}, unlock() { ui.unlock(); ui.need(''); } });
        ui.status('两球在同一高度的托座上。');
        ui.controls.append(actions.el);
        const source = ui.el.querySelector('.answer .src');
        Object.assign(source.style, { minHeight: '62px', paddingRight: '82px' });
        ui.data.previousElementSibling.textContent = '观察记录';
        ui.data.append(rows.el, note('每隔相同时间，各留一个圆点，标出两球当时的位置（示意）。'));
      },
      update(dt) {
        tip.show(ui?.step === 1);
        const delta = dt * bar.update(dt);
        if (phase === 'returning') {
          elapsed += delta;
          hammer.rotation.z = -rad(angle) * (1 - clamp(elapsed / 0.35, 0, 1)) ** 2;
          if (elapsed >= 0.35) phase = 'ready';
        } else if (phase === 'strike') {
          elapsed += delta;
          hammer.rotation.z = -rad(angle) * (1 - clamp(elapsed / 0.18, 0, 1) ** 2);
          if (elapsed >= 0.18) fly();
        } else if (phase === 'flight') {
          elapsed = Math.min(trial.end, elapsed + delta / 4);
          balls.forEach((ball, i) => {
            positionAt(ball, i, elapsed);
            tracks[i].marks.forEach((m, j) => { m.visible = j * interval <= elapsed; });
          });
          // 滑舌与 A 同向起动，速度不超过球速；等 B 完全落过托座再复位。
          tongue.position.x = Math.min(0.022, trial.v * elapsed) * clamp((0.18 - elapsed) / 0.055, 0, 1);
          leaf.rotation.z = Math.asin(tongue.position.x / 0.08);
          if (elapsed === trial.end) land();
        }
      },
      dispose() {
        canvas.removeEventListener('pointerleave', hideTip);
        pointer.dispose();
        bar.dispose();
      },
      debug: { bar, get state() { return { phase, height, angle, elapsed, result, records: rows.rows }; },
        qa: qaFlow(pointer, [
          { name: '轻拉未击动弹片', drag: head, to: pullTo(4) },
          { name: '两球仍在托座', run() { check(phase === 'ready' && !rows.rows.length, '轻拉触发了释放'); } },
          { name: '第一次击打', drag: head, to: pullTo(34), wait: 2 },
          { name: '同一时刻触板', run() {
            check(bar.current === 'height' && tracks.every(t => t.impact.visible) &&
              balls.every(b => Math.abs(b.position.y - FLOOR - R) < 1e-6), '首次落地有误');
          } },
          { name: '回看同一次击打', tap: mat, wait: 2 },
          { name: '改变释放高度', drag: collar, to: new THREE.Vector3(-0.31, FLOOR + R + 0.42 + 0.082, -0.11) },
          { name: '用原力度再击打', drag: head, to: pullTo(34), wait: 2 },
          { name: '核对高度对照', run() {
            check(bar.current === 'speed' && rows.rows.length === 2 && changedHeight.h === 0.42 &&
              changedHeight.angle === first.angle && changedHeight.end > first.end, '高度对照或回看记数有误');
          } },
          { name: '同高度加大力度', drag: head, to: pullTo(56), wait: 2 },
          { name: '核对力度对照与结论', run() {
            check(bar.finished && rows.rows.length === 3 && trial.end === changedHeight.end &&
              trial.v > changedHeight.v && !ui.el.querySelector('.flap').classList.contains('locked'), '力度对照或结论有误');
          } },
        ]),
      },
    };
  },
};
