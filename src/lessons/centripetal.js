// 人教版必修二图 6.2-4。水平槽中挡板的压力提供径向力，套筒露出的格数与该力成正比。
import * as THREE from 'three';
import { paint, inked } from '../live/ink.js';
import { textPlate, woodBlock } from './kit/props.js';
import { lessonBar } from './kit/lessonbar.js';
import { draggable, clamp } from './kit/interact.js';
import { h, table } from './kit/ui.js';
import { qaFlow } from './kit/chemlesson.js';
import { GROOVES, FORCE_DIV, compareRotors, isolatedFactor } from './kit/centripetal.js';

const SHAFT = [-0.149, 0.149],
  TRAY = 0.16,
  BALL = 0.017,
  SLEEVE_TOP = 0.326,
  UNIT = 0.0038,
  BANDS = 18,
  SLEEVE = 0.073,
  LEVEL = [0.106, 0.134],
  CRANK = 0.057,
  RADII = [0.06, 0.12],
  PIVOT_X = RADII[0] + BALL + 0.002,
  PIVOT_Y = TRAY + 0.030,
  // 横臂短端受球的推力，长端的销沿套筒托耳滑动，横臂自身长度不变。
  ARM_X = PIVOT_X - 0.005,
  ARM_Y = SLEEVE_TOP - SLEEVE + 0.004 - PIVOT_Y,
  ARM_LENGTH = Math.hypot(ARM_X, ARM_Y),
  ARM_ANGLE = Math.atan2(ARM_Y, ARM_X);
export default {
  id: 'centripetal',
  fig: '图6.2-4',
  title: '探究向心力大小的表达式',
  stampText: '探究',
  predict: {
    q: '怎样分别看出质量、轨道半径和角速度对向心力的影响？',
    hint: '先猜一组：两球质量、半径相同，左球角速度是右球的两倍，所需向心力是右球的几倍？',
    options: ['两倍', '四倍', '一半'],
    answer: 1,
  },
  conclusion: {
    page: 33,
    rect: [87.79, 263.42, 322.79, 403.0],
    quote: '精确的实验表明，向心力的大小可以表示为 Fn＝mω2r 或者 Fn＝m r v 2',
    why: '匀速转动时，挡板对球的水平压力指向圆心。球对挡板的反作用力经横臂使套筒下降，左右标尺的露出长度可用来比较向心力。保持角速度相同时，改变半径也会改变线速度；用线速度表示同一关系为 F = mv²/r。',
    src: '课本第 29 页 · 第六章 第2节 向心力',
  },
  create(ctx) {
    const group = new THREE.Group();
    const metal = 0x71808a,
      blue = 0x486776;
    function box(parent, w, h, d, x, y, z, color, outline = false) {
      const obj = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint(color));
      if (outline) inked(obj);
      obj.position.set(x, y, z);
      parent.add(obj);
      return obj;
    }
    function cyl(parent, r, h, x, y, z, color) {
      const obj = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 36), paint(color));
      obj.position.set(x, y, z);
      parent.add(obj);
      return obj;
    }
    function link(parent, r, color) {
      const obj = cyl(parent, r, 1, 0, 0, 0, color),
        up = new THREE.Vector3(0, 1, 0);
      return (a, b) => {
        const d = b.clone().sub(a);
        obj.position.copy(a).lerp(b, 0.5);
        obj.scale.y = d.length();
        obj.quaternion.setFromUnitVectors(up, d.normalize());
      };
    }
    box(group, 0.545, 0.018, 0.136, 0, 0.084, -0.008, blue, true);
    for (const x of [-0.262, 0.262])
      for (const z of [-0.061, 0.049]) box(group, 0.019, 0.078, 0.021, x, 0.039, z, blue);
    const stations = SHAFT.map((x, i) => {
      const rotor = new THREE.Group();
      rotor.position.x = x;
      group.add(rotor);
      cyl(rotor, 0.008, 0.164, 0, 0.107, 0, metal);
      for (let level = 0; level < 2; level++) {
        const r = GROOVES[level][i];
        cyl(rotor, r - 0.0027, 0.011, 0, LEVEL[level], 0, 0x889596);
        for (const d of [-0.006, 0.006]) cyl(rotor, r + 0.002, 0.002, 0, LEVEL[level] + d, 0, 0x526165);
      }
      const length = i ? 0.1 : 0.161;
      box(rotor, length, 0.007, 0.04, length / 2 - 0.01, TRAY, 0, metal, true);
      for (const z of [-0.021, 0.021]) box(rotor, length, 0.012, 0.003, length / 2 - 0.01, TRAY + 0.006, z, blue);
      const pivots = (i ? [RADII[0]] : RADII).map((r) => {
        const rocker = new THREE.Group();
        rocker.position.set(r + BALL + 0.002, PIVOT_Y, 0);
        rotor.add(rocker);
        for (const z of [-0.019, 0.019])
          box(rotor, 0.007, 0.028, 0.004, rocker.position.x, PIVOT_Y - 0.014, z, metal);
        const pin = cyl(rotor, 0.003, 0.046, rocker.position.x, PIVOT_Y, 0, 0xcab477);
        pin.rotation.x = Math.PI / 2;
        box(rocker, 0.004, 0.037, 0.032, 0, -0.005, 0, 0x9b673d, true);
        return rocker;
      });
      const v = (x, y, z) => new THREE.Vector3(x, y, z);
      link(pivots[0], 0.0033, 0x555f61)(v(0, 0, -0.013), v(-ARM_X, ARM_Y, -0.013));
      // 两个挡板的支点都固定在长槽上，以相同力臂通过平行连杆传力。
      const tie = i ? null : box(rotor, RADII[1] - RADII[0], 0.004, 0.004, 0, 0, -0.014, metal);
      cyl(rotor, 0.009, 0.163, 0, SLEEVE_TOP - 0.0815, 0, metal);
      const bands = BANDS;
      for (let j = 0; j < bands; j++)
        cyl(rotor, 0.0125, UNIT, 0, SLEEVE_TOP - (j + 0.5) * UNIT, 0, j % 2 ? 0xf8efda : 0xad4836);
      const sleeve = cyl(rotor, 0.015, SLEEVE, 0, SLEEVE_TOP - SLEEVE / 2, 0, 0x465a62);
      box(sleeve, 0.044, 0.004, 0.012, -0.01, -SLEEVE / 2, -0.012, metal);
      cyl(rotor, 0.0145, 0.002, 0, SLEEVE_TOP + 0.001, 0, 0xa7a8a0);
      box(rotor, 0.013, 0.004, 0.006, 0, SLEEVE_TOP + 0.002, 0.011, i ? 0xa0523d : 0x326c78);
      const coilLen = SLEEVE_TOP - SLEEVE - (TRAY + 0.009);
      const centers = Array.from({ length: 169 }, (_, j) => {
        const t = j / 168,
          a = t * 2 * Math.PI * 14;
        return new THREE.Vector3(0.0105 * Math.cos(a), coilLen * t, 0.0105 * Math.sin(a));
      });
      const coil = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(centers), 168, 0.0012, 6, false),
        paint(0xa6a9a5),
      );
      coil.position.y = TRAY + 0.009;
      rotor.add(coil);
      return { rotor, pivots, tie, sleeve, coil, coilLen };
    });
    const handle = new THREE.Group();
    handle.position.set(SHAFT[1], CRANK, 0);
    group.add(handle);
    // 手轮在台板下，前缘伸出台板，可从任意角度继续摇动。
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.005, 8, 48), paint(0x556267));
    wheel.rotation.x = Math.PI / 2;
    handle.add(wheel);
    for (let j = 0; j < 3; j++) {
      const a = (j * 2 * Math.PI) / 3;
      const spoke = box(handle, 0.104, 0.005, 0.006, 0.052 * Math.cos(a), 0, -0.052 * Math.sin(a), metal);
      spoke.rotation.y = a;
    }
    const grip = cyl(handle, 0.013, 0.034, 0, -0.008, 0.105, 0x303b40);
    const belt = new THREE.Group();
    group.add(belt);
    const paths = GROOVES.map(([l, r], i) => {
      // 外公切线和两段包角：左、右轮半径不同也能贴槽，不穿轮。
      const normalX = (l - r) / (SHAFT[1] - SHAFT[0]),
        angle = Math.acos(normalX);
      const pts = [];
      for (let j = 0; j <= 40; j++) {
        const a = angle - (2 * angle * j) / 40;
        pts.push(new THREE.Vector3(SHAFT[1] + r * Math.cos(a), LEVEL[i], r * Math.sin(a)));
      }
      for (let j = 0; j <= 40; j++) {
        const a = -angle - ((2 * Math.PI - 2 * angle) * j) / 40;
        pts.push(new THREE.Vector3(SHAFT[0] + l * Math.cos(a), LEVEL[i], l * Math.sin(a)));
      }
      const path = new THREE.CurvePath();
      pts.forEach((p, j) => path.add(new THREE.LineCurve3(p, pts[(j + 1) % pts.length])));
      const obj = new THREE.Mesh(new THREE.TubeGeometry(path, 160, 0.0027, 6, true), paint(0x4f4239));
      belt.add(obj);
      return { obj, path };
    });
    const beltMesh = paths[0].obj,
      other = paths[1].obj;
    beltMesh.geometry.morphAttributes.position = [other.geometry.attributes.position];
    beltMesh.geometry.morphAttributes.normal = [other.geometry.attributes.normal];
    beltMesh.updateMorphTargets();
    other.visible = false;
    const beltGrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.23, 0.013, 0.017),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    beltGrip.userData.pick = true;
    belt.add(beltGrip);
    // 皮带接头是包住皮带的薄箍。
    const seam = new THREE.Mesh(new THREE.CylinderGeometry(0.0038, 0.0038, 0.007, 24, 1, true), paint(0xc5a676));
    belt.add(seam);
    const balls = [0.05, 0.1, 0.05].map((mass, i) => {
      const obj = new THREE.Mesh(new THREE.SphereGeometry(BALL, 28, 20), paint(mass === 0.1 ? 0x9c6b43 : 0x9da8b0));
      group.add(obj);
      return { mass, obj, home: { x: -0.227 + i * 0.06, z: 0.114 } };
    });
    const rack = woodBlock(0.136, 0.01, 0.056);
    rack.position.set(-0.195, 0.005, 0.114);
    group.add(rack);
    for (const ball of balls.slice(0, 2)) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.002, 6, 24), paint(0x796b58));
      ring.rotation.x = Math.PI / 2;
      ring.position.set(ball.home.x, 0.011, ball.home.z);
      group.add(ring);
      const plate = textPlate(ball.mass * 1000 + ' g', {
        w: 0.048,
        h: 0.016,
        font: 'bold 135px sans-serif',
        color: '#3e3429',
        bg: '#e8d0a2',
      });
      plate.rotation.x = -Math.PI / 5;
      plate.position.set(ball.home.x, 0.008, 0.145);
      group.add(plate);
    }
    for (const r of [0.06, 0.12]) {
      const m = textPlate(r * 100 + ' cm', {
        w: 0.042,
        h: 0.013,
        font: 'bold 122px sans-serif',
        color: '#f5edd8',
        bg: '#586466',
      });
      m.position.set(r, TRAY + 0.005, 0.0227);
      stations[0].rotor.add(m);
    }
    const root = new THREE.Group();
    root.add(group);
    const point = (x, y, z) => new THREE.Vector3(x, y, z);
    let left = 0,
      radius = 0.06,
      level = 0,
      levelMix = 0,
      omega = 0,
      theta = [0, Math.PI],
      seamDistance = 0,
      dragging = null,
      returning = null,
      turn = null,
      frozen = null,
      near = null,
      ui,
      aim = null;
    const trials = [
      { id: 'mass', change: '质量加倍', fixed: '半径、角速度相同' },
      { id: 'radius', change: '半径加倍', fixed: '质量、角速度相同' },
      { id: 'omega', change: '角速度加倍', fixed: '质量、半径相同' },
    ];
    const measured = new Set();
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: trials.map((_, index) => ({
        id: String(index + 1),
        title: '第' + (index + 1) + '组对照',
        todo: '每次只改变一个量，比较两尺露出的格数。',
        target: () => aim,
      })),
    });
    const records = table(['左球的变化', '左尺 / 格', '右尺 / 格', '向心力比（左 ÷ 右）'], {
      note: '格数是从模型标尺上估读的。左右两尺每格代表的力相同。',
    });
    const caption = h('span');
    const input = h('input', {
      type: 'number',
      step: 'any',
      inputmode: 'decimal',
      required: true,
      style: 'width:5em;margin:0 .5em;font:inherit',
    });
    const form = h(
      'form',
      {
        onsubmit(e) {
          e.preventDefault();
          read(input.valueAsNumber);
        },
      },
      h('label', {}, caption, input),
      h('button', { type: 'submit', class: 'go', style: 'width:auto;margin:0' }, '记下'),
    );
    const conditions = h('p', { style: 'font-size:14px;line-height:1.65;color:#544b40' });
    const explanation = h('p', { style: 'line-height:1.55;color:#423d37' });
    const stopped = () => !turn && !frozen && !returning && !bar.finished;
    const mass = () => (left === null ? 0 : balls[left].mass);
    function say(text, obj = null) {
      aim = obj;
      bar.say(text);
    }
    function place(obj, parent, x, y, z) {
      if (obj.parent !== parent) parent.add(obj);
      obj.position.set(x, y, z);
    }
    function rotateBy(delta) {
      theta[1] += delta;
      theta[0] += (delta * GROOVES[level][1]) / GROOVES[level][0];
      seamDistance += delta * GROOVES[level][1];
    }
    function draw() {
      const result = compareRotors(mass(), radius, level, omega);
      handle.rotation.y = theta[1] - Math.PI;
      beltMesh.morphTargetInfluences[0] = levelMix;
      beltGrip.position.set(0, LEVEL[0] + levelMix * (LEVEL[1] - LEVEL[0]), 0.049 - levelMix * 0.001);
      beltGrip.rotation.y = -Math.atan2(levelMix * (GROOVES[1][1] - GROOVES[1][0]), SHAFT[1] - SHAFT[0]);
      const len = paths[level].path.getLength(),
        u = (((seamDistance / len) % 1) + 1) % 1;
      seam.position.copy(paths[0].path.getPointAt(u)).lerp(paths[1].path.getPointAt(u), levelMix);
      seam.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        paths[0].path.getTangentAt(u).lerp(paths[1].path.getTangentAt(u), levelMix).normalize(),
      );
      stations.forEach((s, i) => {
        s.rotor.rotation.y = theta[i];
        const exposed = Math.min(BANDS, result[i].force / FORCE_DIV) * UNIT;
        const angle = ARM_ANGLE - Math.asin((ARM_Y - exposed) / ARM_LENGTH);
        for (const rocker of s.pivots) rocker.rotation.z = angle;
        if (s.tie) {
          s.tie.position.x = PIVOT_X + (RADII[1] - RADII[0]) / 2 - 0.011 * Math.sin(angle);
          s.tie.position.y = PIVOT_Y + 0.011 * Math.cos(angle);
        }
        s.sleeve.position.y = SLEEVE_TOP - SLEEVE / 2 - exposed;
        s.coil.scale.y = (s.coilLen - exposed) / s.coilLen;
      });
      balls.forEach((b, i) => {
        if (b === dragging || b === returning?.ball) return;
        if (i !== 2 && i !== left) return place(b.obj, group, b.home.x, 0.024, b.home.z);
        const station = stations[i === 2 ? 1 : 0];
        const r = i === 2 ? RADII[0] : radius;
        const angle = station.pivots[0].rotation.z;
        const y = TRAY + 0.0035 + BALL;
        // 让球面贴住绕销转动的挡板内侧。
        const x = r + BALL + 0.002 + (PIVOT_Y - y) * Math.tan(angle) - (BALL + 0.002) / Math.cos(angle);
        place(b.obj, station.rotor, x, y, 0);
      });
      return result;
    }
    function guide(prefix = '') {
      const tell = (msg, obj) => say(prefix + msg, obj);
      if (bar.finished) return tell('三组已记好，可以掀开课本结论。');
      if (near !== null) return tell('从顶帽下数到套筒上沿，红、白各算一格，估读到半格。');
      if (frozen)
        return tell('两尺已同时定格。点套筒，数露出的红白格。', stations[frozen.readings[0] === null ? 0 : 1].sleeve);
      const factor = isolatedFactor(mass(), radius, level);
      const id = factor && !measured.has(factor) ? factor : trials.find((trial) => !measured.has(trial.id)).id;
      const want = id === 'mass' ? 1 : 0;
      if (left === null) return tell('把 ' + balls[want].mass * 1000 + ' g 球拖进左槽，贴住挡板。', balls[want].obj);
      if (level && id !== 'omega')
        return tell('把皮带向下拖回等径轮槽，使两球角速度相同。', belt);
      if (left !== want)
        return tell(
          (id === 'mass' ? '' : '先恢复两球等质量。') +
            '把左球拖回球座，再换 ' +
            balls[want].mass * 1000 +
            ' g 球。',
          balls[left].obj,
        );
      if ((radius === 0.12) !== (id === 'radius'))
        return tell(
          id === 'radius'
            ? '两球等质量、角速度相同。把左球移到 12 cm 处的挡板旁。'
            : '把左球移回 6 cm 处的挡板旁，使两球的轨道半径相同。',
          balls[left].obj,
        );
      if (id === 'omega' && !level)
        return tell('两球质量、半径相同。把皮带向上拖到左小右大的轮槽。', belt);
      tell('绕右轴匀速摇手柄，约一秒半一圈。两尺露格稳定时松手定格。', grip);
    }
    function showConditions() {
      conditions.textContent =
        '左球　' +
        (left === null ? '空槽' : mass() * 1000 + ' g') +
        ' · ' +
        Math.round(radius * 100) +
        ' cm　　右球　50 g · 6 cm';
      conditions.append(h('br'), level ? '上层轮槽 · 左轮直径是右轮的一半' : '下层轮槽 · 左右轮直径相等');
    }
    function leave() {
      near = null;
      form.hidden = true;
      input.value = '';
      ctx.back();
      bar.near(false);
      guide();
    }
    function inspect(i) {
      near = i;
      const side = i ? '右' : '左';
      caption.textContent = side + '尺 / 格';
      input.value = '';
      form.hidden = false;
      if (ui.el.classList.contains('folded')) ui.fold(false);
      ctx.look([SHAFT[i], SLEEVE_TOP - 0.045, 0], [0, 0, 1], 0.27, leave);
      bar.near(true);
      guide();
    }
    function read(value) {
      if (!frozen || near === null || !Number.isFinite(value)) return;
      const div = frozen.divs[near];
      if (value * 2 !== Math.round(value * 2)) return say('估读到半格，记整数或半格。');
      if (Math.abs(value - div) > 0.27) {
        return say(
          value < div ? '数少了。每段白色也算一格，数到套筒上沿。' : '数多了。只数露出的色带，顶帽和套筒都不算。',
        );
      }
      input.blur();
      frozen.readings[near] = value;
      const other = 1 - near;
      if (frozen.readings[other] === null) {
        inspect(other);
        return guide((other ? '左' : '右') + '尺记下 ' + value + ' 格。');
      }
      const [a, b] = frozen.readings;
      const ratio = Number((a / b).toFixed(1));
      const factor = isolatedFactor(mass(), radius, level);
      const trial = trials.find((t) => t.id === factor);
      const message = trial
        ? trial.fixed + '，左球' + trial.change + '。这次估读的向心力比约为 ' + ratio +
          '，理论值为 ' + (factor === 'omega' ? 4 : 2) + '。'
        : mass() === 0.05 && radius === 0.06 && !level
          ? '两球条件相同，还看不出改变一个量的影响。'
          : '同时改变了几个量，不能把力的变化归给其中一个。';
      const changes = [mass() === 0.1 && '质量加倍', radius === 0.12 && '半径加倍', level === 1 && '角速度加倍'].filter(
        Boolean,
      );
      const sameScale = (n) =>
        n +
        '<span aria-hidden="true" style="display:block;width:3em;max-width:100%;height:4px;margin:3px auto;background:#e5dfd2"><i style="display:block;height:100%;width:' +
        (100 * n) / BANDS +
        '%;background:#a34836"></i></span>';
      records.add([changes.join('、') || '条件相同', sameScale(a), sameScale(b), a + ' ÷ ' + b + ' ≈ ' + ratio]);
      records.el.hidden = false;
      explanation.textContent = message;
      frozen = null;
      omega = 0;
      draw();
      if (trial && !measured.has(factor)) {
        measured.add(factor);
        bar.done(String(measured.size));
      }
      leave();
    }
    function home(ball) {
      return point(ball.home.x, 0.024, ball.home.z);
    }
    function slot(r = radius) {
      return group.worldToLocal(stations[0].rotor.localToWorld(point(r, TRAY + 0.0035 + BALL, 0)));
    }
    const localRay = new THREE.Ray();
    let pointerDown = false;
    function dragBall(b, i) {
      let start, offset, targets;
      return {
        obj: b.obj,
        keepOffset: true,
        enabled: stopped,
        hint: () => (left === i ? '拖球：换位置或放回球座' : '拖动：把球放入左槽'),
        onStart() {
          dragging = b;
          group.attach(b.obj);
          start = b.obj.position.clone();
          targets = RADII.map((r) => ({ pos: slot(r), r }));
          if (left === i) targets.push({ pos: home(b), r: null });
          offset = start.clone().sub(localRay.closestPointToPoint(start, point(0, 0, 0)));
        },
        onDrag(p) {
          if (pointerDown) {
            // 指针决定屏幕位置，离射线最近的搬球路线决定深度；转盘停在哪个角度都能换位。
            const ray = localRay.clone();
            ray.origin.add(offset);
            const onRay = point(0, 0, 0);
            let nearest = Infinity;
            for (const { pos } of targets) {
              if (start.distanceToSquared(pos) < 1e-10) continue;
              const gap = ray.distanceSqToSegment(start, pos, onRay);
              if (gap < nearest) {
                nearest = gap;
                b.obj.position.copy(onRay);
              }
            }
          } else b.obj.position.copy(p);
          b.obj.position.y = Math.max(BALL, b.obj.position.y);
        },
        onEnd(moved) {
          dragging = null;
          if (!moved) return draw();
          const target = targets.find(({ pos }) => b.obj.position.distanceTo(pos) < 0.025);
          if (!target || (left !== null && left !== i)) {
            returning = { ball: b, from: b.obj.position.clone(), to: start, time: 0 };
            return say(target ? '左槽已有球，先把原球放回球座。' : '球没落到位，已松手。对准球座或挡板旁再放。');
          }
          const changedRadius = target.r !== null && radius !== target.r;
          left = target.r === null ? null : i;
          if (left !== null) radius = target.r;
          draw();
          showConditions();
          guide(left === null ? '左槽空出来了。' : changedRadius ? '左球半径已调到 ' + radius * 100 + ' cm。' : '');
        },
      };
    }
    let startLevel;
    const beltDrag = {
      obj: beltGrip,
      keepOffset: true,
      enabled: stopped,
      plane: 'xy',
      offset: 0.049,
      hint: '上下拖：换皮带轮槽',
      onStart() {
        startLevel = level;
      },
      onDrag(p) {
        levelMix = clamp((p.y - LEVEL[0]) / (LEVEL[1] - LEVEL[0]), 0, 1);
        draw();
      },
      onEnd(moved) {
        if (!moved) return;
        const target = 1 - startLevel;
        if (Math.abs(levelMix - target) > 0.18) {
          returning = { from: levelMix, to: startLevel, time: 0 };
          return say('皮带没进另一层轮槽，松手退回原槽。');
        }
        level = levelMix = target;
        draw();
        showConditions();
        guide(level ? '皮带不打滑，右轮转一圈，左轮转两圈。' : '下层两轮等径，角速度相同。');
      },
    };
    function startTurn(p, time) {
      turn = { angle: Math.atan2(-p.z, p.x - SHAFT[1]), arc: 0, samples: [[time, 0]], last: time, steady: false };
      omega = 0;
    }
    function advanceTurn(p, time) {
      if (!turn) return;
      const angle = Math.atan2(-p.z, p.x - SHAFT[1]);
      const delta = Math.atan2(Math.sin(angle - turn.angle), Math.cos(angle - turn.angle));
      if (!delta) return;
      rotateBy(delta);
      turn.angle = angle;
      turn.arc += delta;
      const samples = turn.samples;
      samples.push([time, turn.arc]);
      while (samples.length > 2 && time - samples[1][0] > 0.46) samples.shift();
      const [t0, a0] = samples[0],
        span = time - t0;
      omega = (turn.arc - a0) / Math.max(0.015, span);
      // 比较前后两段的平均角速度，停顿、反转均不能充作匀速读数。
      const mid = samples[Math.floor(samples.length / 2)];
      const first = (mid[1] - a0) / Math.max(0.001, mid[0] - t0);
      const last = (turn.arc - mid[1]) / Math.max(0.001, time - mid[0]);
      turn.steady =
        span >= 0.24 &&
        Math.abs(turn.arc - a0) >= 0.55 &&
        first * last > 0 &&
        Math.abs(first - last) < Math.abs(omega) * 0.42;
      turn.last = time;
      const divs = draw().map((p) => p.force / FORCE_DIV);
      const cue =
        left === null
          ? '左槽空着，只有右尺露格。'
          : !turn.steady
            ? '沿同一方向摇，让两尺露出的格数稳定。'
            : Math.min(...divs) < 2
              ? '露格太少，再摇快一点。'
              : Math.max(...divs) > BANDS - 0.25
                ? '标尺到头了，再摇慢一点。'
                : '两尺露格稳定了，现在松手可定格读数。';
      if (cue !== turn.cue) {
        turn.cue = cue;
        say(cue);
      }
    }
    const now = () => performance.now() / 1000;
    function finishTurn(time) {
      if (!turn) return;
      const steady = turn.steady && time - turn.last < 0.25;
      turn = null;
      const divs = draw().map((p) => p.force / FORCE_DIV);
      let reason;
      if (left === null) reason = '左槽空着，左尺没有露格。先放球再比较。';
      else if (!steady) reason = '转速还没稳住。沿同一方向均匀摇动，边摇边松手。';
      else if (Math.min(...divs) < 2) reason = '露出的格数太少，再摇快一点。';
      else if (Math.max(...divs) > BANDS - 0.25) reason = '标尺已经到底，再摇慢一点。';
      if (reason) {
        omega = 0;
        draw();
        return say(reason, left === null ? balls[measured.has('mass') ? 0 : 1].obj : grip);
      }
      frozen = { divs, readings: [null, null] };
      guide();
    }
    const crank = {
      obj: handle,
      plane: 'xz',
      offset: CRANK,
      enabled: stopped,
      hint: '绕轴拖：匀速摇手柄',
      onStart(p) {
        if (p) startTurn(p, now());
      },
      onDrag(p) {
        advanceTurn(p, now());
      },
      onEnd(moved) {
        if (moved) finishTurn(now());
        else {
          turn = null;
          guide();
        }
      },
    };
    const tip = ctx.tag('', 'pill');
    const canvas = document.getElementById('c');
    const hideTip = () => tip.show(false);
    canvas.addEventListener('pointerleave', hideTip);
    const desk = draggable(group, [...balls.slice(0, 2).map(dragBall), beltDrag, crank], {
      tip,
      taps: stations.map((s, i) => ({
        obj: s.sleeve,
        enabled: () => !!frozen && near === null && frozen.readings[i] === null,
        hint: '点一下：凑近数格',
        onTap: () => inspect(i),
      })),
    });
    function follow(ray) {
      group.updateWorldMatrix(true, false);
      localRay.copy(ray.ray).applyMatrix4(group.matrixWorld.clone().invert());
    }
    const pointer = {
      items: () => desk.items().filter((d) => d.enabled()),
      down(ray, e) {
        pointerDown = true;
        follow(ray);
        const hit = desk.down(ray, e);
        if (hit && ui?.step === 0) ui.go(1);
        return hit;
      },
      move(ray, e) {
        if (ui?.step !== 1) return false;
        tip.show(true);
        follow(ray);
        return desk.move(ray, e);
      },
      up(ray, e) {
        pointerDown = false;
        return desk.up(ray, e);
      },
    };
    function reset() {
      returning = dragging = turn = frozen = null;
      omega = seamDistance = level = levelMix = 0;
      left = 0;
      radius = 0.06;
      theta = [0, Math.PI];
      records.clear();
      measured.clear();
      records.el.hidden = true;
      explanation.textContent = '';
      bar.undo(...bar.stepList.map((t) => t.id));
      leave();
      draw();
      showConditions();
      ui?.relock();
    }
    reset();
    const pos = (object) => group.worldToLocal(object.getWorldPosition(point(0, 0, 0)));
    const moveBall = (i, out) => ({
      name: out ? '把原球放回球座' : '换球入槽',
      drag: balls[i].obj,
      to: out ? () => home(balls[i]) : slot,
    });
    const shiftRadius = (r) => ({
      name: '把左球移到 ' + r * 100 + ' cm 处',
      drag: balls[0].obj,
      to: () => slot(r),
    });
    const check = (test, message) => {
      if (!test) throw Error(message);
    };
    // 真鼠标流程的直线拖动不能表达匀速圆弧；在同一手柄采样函数上送入等时、等角的位置。
    const spin = {
      name: '匀速摇柄，松手定格',
      run() {
        const t = now(),
          omegaTest = Math.sqrt((4 * FORCE_DIV) / (0.05 * 0.06));
        const at = (angle) => point(SHAFT[1] + 0.105 * Math.sin(angle), CRANK, 0.105 * Math.cos(angle));
        startTurn(at(0), t);
        for (let i = 1; i <= 60; i++) {
          const angle = (2 * Math.PI * i) / 60;
          advanceTurn(at(angle), t + angle / omegaTest);
        }
        finishTurn(t + (2 * Math.PI) / omegaTest);
        check(frozen, '两侧未定格');
      },
    };
    const submit = (name, value) => ({
      name,
      run() {
        input.value = String(value);
        form.querySelector('button').click();
      },
    });
    const measure = (factor, count, first, wrong = false) => [
      spin,
      { name: '近看左尺', tap: stations[0].sleeve },
      ...(wrong
        ? [
            submit('故意少数一格', first - 1),
            {
              name: '核对误读保留现场',
              run() {
                check(
                  near === 0 &&
                    frozen.readings[0] === null &&
                    document.querySelector('.lb-txt').textContent.includes('数少了'),
                  '误读没有得到纠正',
                );
              },
            },
          ]
        : []),
      submit('记下左尺', first),
      submit('记下右尺', 4),
      {
        name: '核对本组记录',
        run() {
          check(measured.has(factor) && measured.size === count && records.rows.length === count, '单变量记录不完整');
        },
      },
    ];
    const qa = qaFlow(desk, [
      { name: '松手时没有对准球座', drag: balls[0].obj, to: () => slot().lerp(home(balls[0]), 0.5) },
      { name: '把皮带换到上层轮槽', drag: beltGrip, to: () => pos(beltGrip).add(point(0, LEVEL[1] - LEVEL[0], 0)) },
      ...measure('omega', 1, 16, true),
      { name: '把皮带换回等径轮槽', drag: beltGrip, to: () => pos(beltGrip).add(point(0, LEVEL[0] - LEVEL[1], 0)) },
      shiftRadius(0.12),
      ...measure('radius', 2, 8),
      shiftRadius(0.06),
      moveBall(0, true),
      moveBall(1, false),
      ...measure('mass', 3, 8),
      {
        name: '掀开课本结论',
        run() {
          ui.go(2);
          ui.el.querySelector('.flap-front').click();
          check(bar.finished && ui.el.querySelector('.flap.open'), '原文未解锁');
        },
      },
    ]);
    return {
      group: root,
      pointer,
      reset,
      toggles: ['steps'],
      size: { w: 0.64, d: 0.35, h: 0.35 },
      view: { elev: 23, azim: -5, frameMargin: 1.04 },
      debug: { bar, qa },
      mount(panel) {
        ui = panel;
        bar.attach({
          need: () => ui.need(''),
          unlock: () => {
            ui.unlock();
            ui.need('');
          },
        });
        ui.status('挡板对球的压力提供向心力。球推挡板，横臂绕支点转动，压下套筒。露出的格数越多，力越大。');
        ui.controls.append(conditions, form);
        ui.data.append(records.el, explanation, h('button', { class: 'go ghost', onclick: reset }, '全部重来'));
        ui.notes.append(
          h('p', { class: 'note' }, '模型忽略皮带打滑。两侧套筒按同一比例放大行程，松手保留匀速转动时的读数。'),
        );
        const fallback = ui.el.querySelector('.answer blockquote');
        if (fallback) fallback.textContent = fallback.textContent.replace('Fn＝mω2r', 'Fₙ＝mω²r').replace('Fn＝m r v 2', 'Fₙ＝mv²/r');
        const source = ui.el.querySelector('.answer .src');
        source.style.paddingRight = '82px';
        source.style.minHeight = '48px';
        guide();
      },
      update(dt) {
        bar.update(dt);
        if (turn && omega && now() - turn.last > 0.25) {
          omega = 0;
          turn.steady = false;
          draw();
        }
        if (!returning) return;
        const r = returning;
        r.time += dt;
        const t = Math.min(1, r.time / 0.38),
          f = 1 - (1 - t) ** 2;
        if (r.ball) r.ball.obj.position.lerpVectors(r.from, r.to, f);
        else levelMix = r.from + (r.to - r.from) * f;
        if (t === 1) returning = null;
        draw();
      },
      dispose() {
        canvas.removeEventListener('pointerleave', hideTip);
        desk.dispose();
        bar.dispose();
      },
    };
  },
};
