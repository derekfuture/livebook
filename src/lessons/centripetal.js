// 人教版必修二图 6.2-4。水平槽中挡板的压力提供径向力，套筒露出的格数与该力成正比。
import * as THREE from 'three';
import { paint, inked } from '../live/ink.js';
import { canvasTex, textPlate, woodBlock } from './kit/props.js';
import { lessonBar } from './kit/lessonbar.js';
import { draggable, rayToLocal, clamp } from './kit/interact.js';
import { buttons, note, table } from './kit/ui.js';
import { GROOVES, FORCE_DIV, compareRotors, isolatedFactor } from './kit/centripetal.js';

const SHAFT = [-0.149, 0.149],
  TRAY = 0.16,
  BALL = 0.017,
  SLEEVE_TOP = 0.326,
  UNIT = 0.0038,
  BANDS = 18,
  SLEEVE = 0.073,
  LEVEL = [0.106, 0.134],
  CRANK = 0.057;
export default {
  id: 'centripetal',
  fig: '图6.2-4',
  title: '探究向心力大小的表达式',
  stampText: '探究',
  predict: {
    q: '质量和轨道半径相同，左球角速度是右球的两倍。让左球做圆周运动所需的向心力约为右球的几倍？',
    options: ['两倍', '四倍', '一半'],
    answer: 1,
  },
  conclusion: {
    quote: '做匀速圆周运动所需的向心力大小为 F = mω²r。',
    why: '匀速转动时，挡板对球的水平压力指向圆心。球对挡板的反作用力经横臂使套筒下降，左右标尺的露出长度可用来比较向心力。保持角速度相同时，改变半径也会改变线速度；用线速度表示同一关系为 F = mv²/r。',
    src: '人教版高中物理必修第二册第 28–29 页 · 图 6.2-4',
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
      const stop = new THREE.Group();
      rotor.add(stop);
      const carriage = new THREE.Group();
      rotor.add(carriage);
      box(carriage, 0.006, 0.03, 0.035, 0.019, TRAY + 0.02, 0, 0x9b673d, true);
      for (const z of [-0.019, 0.019]) box(carriage, 0.014, 0.03, 0.004, 0.023, TRAY + 0.016, z, metal);
      const pivot = cyl(carriage, 0.003, 0.045, 0.023, TRAY + 0.03, 0, 0xcab477);
      pivot.rotation.x = Math.PI / 2;
      cyl(stop, 0.006, 0.014, 0.022, TRAY + 0.038, 0, 0x80644d);
      cyl(stop, 0.01, 0.014, 0.025, TRAY + 0.05, 0, 0xbf9457);
      const pick = new THREE.Mesh(
        new THREE.BoxGeometry(0.028, 0.024, 0.032),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      pick.position.set(0.029, TRAY + 0.054, 0);
      pick.userData.pick = true;
      stop.add(pick);
      // 挡板和横臂同侧联动；读数用理想标定，忽略挡板的微小径向位移。
      const lever = link(rotor, 0.0033, 0x555f61);
      cyl(rotor, 0.009, 0.163, 0, SLEEVE_TOP - 0.0815, 0, metal);
      const bands = BANDS;
      for (let j = 0; j < bands; j++)
        cyl(rotor, 0.0125, UNIT, 0, SLEEVE_TOP - (j + 0.5) * UNIT, 0, j % 2 ? 0xf8efda : 0xad4836);
      const sleeve = cyl(rotor, 0.015, SLEEVE, 0, SLEEVE_TOP - SLEEVE / 2, 0, 0x465a62);
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
      return { rotor, stop, carriage, sleeve, lever, coil, coilLen };
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
    cyl(handle, 0.01, 0.03, 0, -0.012, 0.105, 0x303b40);
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
    const seam = cyl(belt, 0.003, 0.007, 0, 0, 0, 0xc5a676);
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
        w: 0.036,
        h: 0.011,
        font: 'bold 135px sans-serif',
        color: '#3e3429',
        bg: '#e8d0a2',
      });
      plate.rotation.x = -Math.PI / 2;
      plate.position.set(ball.home.x, 0.0105, 0.133);
      group.add(plate);
    }
    for (const r of [0.06, 0.12]) {
      const m = textPlate(r * 100 + ' cm', {
        w: 0.029,
        h: 0.012,
        font: 'bold 138px sans-serif',
        color: '#f5edd8',
        bg: '#586466',
      });
      m.rotation.x = -Math.PI / 2;
      m.position.set(r, TRAY + 0.005, 0.002);
      stations[0].rotor.add(m);
    }
    let left = 0,
      radius = 0.06,
      level = 0,
      levelMix = 0,
      omega = 0,
      theta = [0, Math.PI],
      seamDistance = 0,
      dragging = null,
      turning = false,
      lastAngle = 0,
      lastTime = 0,
      lastMove = 0,
      still = 0,
      braking = null,
      frozen = null,
      near = null,
      readings = [],
      ui,
      records,
      aim = null;
    const bar = lessonBar({
      ...ctx,
      back: leave,
      group,
      steps: [
        { id: 'mass', title: '只换质量', todo: '比较相同半径、相同角速度的两球。', target: () => aim },
        { id: 'radius', title: '只换半径', todo: '两球质量、角速度相同，只改变左槽半径。', target: () => aim },
        { id: 'omega', title: '只换角速度', todo: '恢复等质量、等半径，把皮带换到不同直径的轮槽。', target: () => aim },
      ],
    });
    const now = () => performance.now() / 1000;
    const stopped = () => !turning && omega === 0 && !frozen;
    const mass = () => (left === null ? 0 : balls[left].mass);
    function say(s, target = null) {
      aim = target;
      bar.say(s);
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
        const r = i ? 0.06 : radius;
        s.stop.position.x = r;
        s.carriage.position.x = r;
        const exposed = Math.min(BANDS, result[i].force / FORCE_DIV) * UNIT;
        s.sleeve.position.y = SLEEVE_TOP - SLEEVE / 2 - exposed;
        s.coil.scale.y = (s.coilLen - exposed) / s.coilLen;
        s.lever(new THREE.Vector3(0, s.sleeve.position.y + 0.015, 0), new THREE.Vector3(r + 0.019, TRAY + 0.036, 0));
      });
      balls.forEach((b, i) => {
        if (b === dragging) return;
        if (i === 2) place(b.obj, stations[1].rotor, 0.06, TRAY + 0.0035 + BALL, 0);
        else if (i === left) place(b.obj, stations[0].rotor, radius, TRAY + 0.0035 + BALL, 0);
        else place(b.obj, group, b.home.x, 0.024, b.home.z);
      });
      return result;
    }
    function guide(prefix = '') {
      const instruct = (msg, obj) => say(prefix + msg, obj);
      if (frozen) {
        const i = readings[0] === null ? 0 : 1;
        instruct('已定格同一瞬间。点' + (i ? '右' : '左') + '侧套筒近看，读露出的红白格数。', stations[i].sleeve);
        return;
      }
      if (omega || turning) {
        instruct('点任一套筒定格读数；要调整器材，点手轮停下。', stations[0].sleeve);
        return;
      }
      if (bar.finished) {
        instruct('三组比较完成。展开笔记本，看每次保持了哪些条件。');
        return;
      }
      const goal = bar.current;
      if (left === null) {
        const wanted = goal === 'mass' ? 1 : 0;
        instruct('把台前 ' + balls[wanted].mass * 1000 + ' g 球拖入左槽，靠住挡板。', balls[wanted].obj);
        return;
      }
      if ((goal === 'mass') !== (mass() === 0.1)) {
        instruct('把左槽球拖回台前球座，再换 ' + (goal === 'mass' ? '100' : '50') + ' g 球。', balls[left].obj);
        return;
      }
      if ((goal === 'radius') !== (radius === 0.12)) {
        instruct('沿长槽拖动挡板，把左球移到 ' + (goal === 'radius' ? 12 : 6) + ' cm 位置。', stations[0].stop);
        return;
      }
      if ((goal === 'omega') !== (level === 1)) {
        instruct('把前侧皮带' + (goal === 'omega' ? '向上拖到一大一小' : '向下拖回同直径') + '的轮槽。', belt);
        return;
      }
      instruct('抓住右端手轮前缘，约一秒多摇一圈。松手后点套筒读数。', handle);
    }
    function halt() {
      braking = null;
      omega = 0;
      turning = false;
      still = 0;
      frozen = null;
      near = null;
      readings = [];
      ctx.back();
      bar.near(false);
      draw();
      guide();
    }
    function leave() {
      near = null;
      ctx.back();
      bar.near(false);
      guide();
    }
    function inspect(i) {
      if (braking) {
        say('读数已保存，等手轮停稳再调整。');
        return;
      }
      if (!frozen) {
        if (left === null && Math.abs(omega) >= 0.1) {
          say('左槽没有球。点手轮停下，把台前的球放到左槽。', handle);
          return;
        }
        if (Math.abs(omega) < 0.1) {
          guide();
          return;
        }
        const pair = draw(),
          divs = pair.map((p) => p.force / FORCE_DIV);
        if (Math.min(...divs) < 2) {
          say('露出的格数太少。沿手轮再摇快些，再读两侧。', handle);
          return;
        }
        if (Math.max(...divs) > BANDS - 0.25) {
          say('标尺露到头了。稍慢些摇，让两侧都在量程内。', handle);
          return;
        }
        if (still < 0.25) {
          say('等转速基本稳定，再取同一瞬间的两侧读数。', stations[i].sleeve);
          return;
        }
        frozen = { divs, omega: pair.map((p) => p.omega), factor: isolatedFactor(mass(), radius, level) };
        readings = [null, null];
      }
      if (readings[i] !== null) {
        guide();
        return;
      }
      near = i;
      bar.near(true);
      ctx.look([SHAFT[i], SLEEVE_TOP - 0.033, 0], [0, 0, 1], 0.15, leave);
      say('从顶部向下数红白格，在套筒上沿点尺，估读到半格。');
    }
    function read(ray) {
      const i = near,
        p = rayToLocal(ray, group, 'xy', 0.013);
      if (!p) return;
      if (Math.abs(p.x - SHAFT[i]) > 0.019) {
        say('沿标尺看套筒上沿对应哪一格。');
        return;
      }
      const div = Math.round(((SLEEVE_TOP - p.y) / UNIT) * 2) / 2;
      if (div < 0 || div > BANDS || Math.abs(div - frozen.divs[i]) > 0.55) {
        say('每一段红色或白色为一格。从顶部数到套筒上沿。');
        return;
      }
      readings[i] = div;
      leave();
      if (readings.some((v) => v === null)) return;
      const { factor } = frozen,
        ratio = readings[0] / readings[1];
      records.el.hidden = false;
      records.add([
        mass() * 1000 + ' / 50',
        radius * 100 + ' / 6',
        frozen.omega.map((v) => Math.abs(v).toFixed(1)).join(' / '),
        readings.join(' / '),
        ratio.toFixed(2),
      ]);
      if (factor) {
        bar.done(factor);
      }
      frozen = null;
      braking = {
        start: omega,
        time: 0,
        prefix: factor ? '本组左/右约 ' + ratio.toFixed(2) + '。' : '本次记录未单独改变一项。',
      };
      say(braking.prefix + '松开装置，等手轮停稳。');
    }
    const drags = [];
    const grabRay = new THREE.Ray();
    function followRay(ray) {
      group.updateWorldMatrix(true, false);
      grabRay.copy(ray.ray).applyMatrix4(new THREE.Matrix4().copy(group.matrixWorld).invert());
    }
    function slot() {
      return group.worldToLocal(stations[0].rotor.localToWorld(new THREE.Vector3(radius, TRAY + 0.0035 + BALL, 0)));
    }

    for (let i = 0; i < 2; i++) {
      const b = balls[i];
      drags.push({
        obj: b.obj,
        plane: 'xz',
        offset: TRAY + 0.02,
        keepOffset: true,
        enabled: stopped,
        hint: '在左槽和台前球座之间拖动',
        onStart() {
          dragging = b;
          group.attach(b.obj);
        },
        onDrag() {
          // 球跨越台面和高槽。先沿视线求出这次拖动所处的深度，再让球一直跟着手指。
          const seat = slot(),
            home = new THREE.Vector3(b.home.x, 0.024, b.home.z);
          const dSlot = grabRay.distanceToPoint(seat),
            dHome = grabRay.distanceToPoint(home);
          const t = dHome / Math.max(0.001, dSlot + dHome),
            z = home.z + (seat.z - home.z) * t;
          const distance = (z - grabRay.origin.z) / grabRay.direction.z;
          if (Number.isFinite(distance) && distance > 0) grabRay.at(distance, b.obj.position);
          b.obj.position.y = Math.max(0.024, b.obj.position.y);
        },
        onEnd(moved) {
          const d = grabRay.distanceToPoint(slot()),
            home = grabRay.distanceToPoint(new THREE.Vector3(b.home.x, 0.024, b.home.z));
          if (moved && left === i && home < 0.03) left = null;
          else if (moved && left === null && d < 0.03) left = i;
          dragging = null;
          draw();
          guide();
          if (moved && d < 0.03 && left !== null && left !== i)
            say('左槽已有球，先把原球移回台前空座。', balls[left]?.obj);
          else if (moved && Math.min(home, d) > 0.03) say('还没放到球座或挡板旁，球已放回原处。', b.obj);
        },
      });
    }
    let fromR = 0;
    drags.push({
      obj: stations[0].stop,
      plane: 'xz',
      offset: TRAY + 0.044,
      enabled: stopped,
      hint: '沿槽移动挡板改变左球半径',
      onStart() {
        fromR = radius;
      },
      onDrag(p, start) {
        if (!start) return;
        const angle = theta[0],
          along = (p.x - start.x) * Math.cos(angle) - (p.z - start.z) * Math.sin(angle);
        radius = clamp(fromR + along, 0.06, 0.12);
        draw();
      },
      onEnd(moved) {
        if (moved) radius = radius < 0.09 ? 0.06 : 0.12;
        draw();
        guide();
      },
    });
    let startLevel = 0;
    drags.push({
      obj: belt,
      plane: 'xy',
      offset: 0.05,
      enabled: stopped,
      hint: '上下拖皮带换轮槽',
      onStart() {
        startLevel = level;
      },
      onDrag(p, from) {
        if (!from) return;
        levelMix = clamp(startLevel + (p.y - from.y) / (LEVEL[1] - LEVEL[0]), 0, 1);
        draw();
      },
      onEnd() {
        level = levelMix = Math.round(levelMix);
        draw();
        guide();
      },
    });
    drags.push({
      obj: handle,
      plane: 'xz',
      offset: CRANK,
      hint: '绕右轴摇手轮；点手轮停下',
      enabled: () => near === null,
      onStart(p) {
        if (!p) return;
        if (document.body.classList.contains('predicting')) ui.go(1);
        frozen = null;
        braking = null;
        turning = true;
        omega = 0;
        still = 0;
        lastTime = lastMove = now();
        lastAngle = Math.atan2(-p.z, p.x - SHAFT[1]);
      },
      onDrag(p) {
        const t = now(),
          angle = Math.atan2(-p.z, p.x - SHAFT[1]),
          delta = Math.atan2(Math.sin(angle - lastAngle), Math.cos(angle - lastAngle)),
          dt = t - lastTime;
        if (dt <= 0) return;
        omega += clamp(dt / 0.12, 0, 1) * (delta / dt - omega);
        rotateBy(delta);
        lastAngle = angle;
        lastTime = lastMove = t;
        draw();
      },
      onEnd(moved) {
        turning = false;
        if (!moved || now() - lastMove > 0.16) omega = 0;
        draw();
        guide();
      },
    });
    const desk = draggable(group, drags, {
      highlight: true,
      taps: stations.map((s, i) => ({
        obj: s.sleeve,
        enabled: () => !!frozen || (!braking && Math.abs(omega) > 0.1),
        hint: '定格读套筒标尺',
        onTap: () => inspect(i),
      })),
    });
    const pointer = {
      items: desk.items,
      down(ray, e) {
        followRay(ray);
        if (near !== null) {
          read(ray);
          return true;
        }
        const hit = desk.down(ray, e);
        if (hit && document.body.classList.contains('predicting')) ui.go(1);
        return hit;
      },
      move(ray) {
        followRay(ray);
        return near !== null || desk.move(ray);
      },
      up() {
        return desk.up();
      },
    };
    function reset() {
      halt();
      left = 0;
      radius = 0.06;
      level = levelMix = 0;
      theta = [0, Math.PI];
      seamDistance = 0;
      dragging = null;
      records.clear();
      records.el.hidden = true;
      bar.undo('mass', 'radius', 'omega');
      draw();
      guide();
    }
    draw();
    return {
      group,
      pointer,
      toggles: ['steps'],
      size: { w: 0.64, d: 0.35, h: 0.35 },
      view: { elev: 24, azim: -7, lookY: 0.48, margin: 1.03 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        records = table(['球质量左/右 (g)', '半径左/右 (cm)', '角速度大小左/右 (rad/s)', '露出格数左/右', '格数比']);
        records.el.hidden = true;
        records.el.style.overflowX = 'auto';
        ui.data.append(records.el);
        ui.notes.append(
          note(
            '右槽用 50 g 球、半径 6 cm。模型忽略皮带打滑和挡板的微小位移。两侧按相同灵敏度放大显示套筒行程，点套筒可定格同一瞬间，比较露出的格数。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
        if (frozen) return;
        if (turning) {
          if (now() - lastMove > 0.16) {
            omega = 0;
            draw();
          }
          return;
        }
        if (braking) {
          const t = Math.min(0.42, braking.time + dt),
            next = braking.start * (1 - t / 0.42);
          const delta = ((omega + next) * (t - braking.time)) / 2;
          rotateBy(delta);
          omega = next;
          braking.time = t;
          draw();
          if (t === 0.42) {
            const prefix = braking.prefix;
            braking = null;
            guide(prefix);
          }
          return;
        }
        if (omega) {
          rotateBy(omega * dt);
          omega *= Math.exp(-0.12 * dt);
          still += dt;
          if (Math.abs(omega) < 0.08) {
            omega = 0;
            guide();
          }
          draw();
        }
      },
      dispose() {
        desk.dispose();
        bar.dispose();
      },
    };
  },
};
