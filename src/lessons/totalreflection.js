import * as THREE from 'three';
import { flatFace } from './kit/criticalAngle.js';
import { protractorTexture } from './kit/protractor.js';
import { laserPen } from './kit/optics.js';
import { draggable, clamp, deg } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { note, table, buttons } from './kit/ui.js';
import { paint } from '../live/ink.js';

const R = 0.17,
  BRICK = 0.069,
  FACE = 0.01,
  TOP = 0.022,
  PEN = 0.176;
const bearing = (p) => Math.atan2(-p.x, -p.z) / deg;

export default {
  id: 'totalreflection',
  fig: '图4.2-1',
  title: '观察全反射现象',
  stampText: '观察',
  predict: {
    q: '光从玻璃射向空气，逐渐增大入射角，空气一侧的光迹会怎样？',
    options: ['一直偏折但仍可见', '逐渐贴近平面，然后消失', '转回法线方向'],
    answer: 1,
  },
  conclusion: {
    page: 95, rect: [64.29, 56.12, 379.36, 224.23],
    quote: '当光从光密介质射入光疏介质时，同时发生折射和反射。如果入射角逐渐增大，折射光离法线会越来越远，而且越来越弱，反射光却越来越强。当入射角增大到某一角度，使折射角达到90°时，折射光完全消失，只剩下反射光，这种现象叫作全反射（total reflection），这时的入射角叫作临界角（critical angle）。当光从光密介质射入光疏介质时，如果入射角等于或大于临界角，就会发生全反射现象。',
    why: '入射角从平面法线量起。折射角趋近 90° 时，穿过平面的光功率趋于零。玻璃折射率取 1.50，空气取 1.00，由 sin C = 1/1.50 得 C 约为 41.8°。',
    src: '课本第 91 页 · 第四章 第2节 全反射',
  },
  create(ctx) {
    const group = new THREE.Group();
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(R, R, FACE, 96), paint(0xdbc9a7));
    disk.position.y = FACE / 2;
    group.add(disk);
    const texture = protractorTexture();
    const scale = new THREE.Mesh(
      new THREE.PlaneGeometry(2 * R, 2 * R),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
    );
    scale.rotation.x = -Math.PI / 2;
    scale.position.y = FACE + 0.0002;
    group.add(scale);
    const glassShape = new THREE.Shape();
    glassShape.absarc(0, 0, BRICK, 0, Math.PI, false);
    glassShape.closePath();
    const glass = new THREE.Mesh(
      new THREE.ExtrudeGeometry(glassShape, { depth: 0.022, bevelEnabled: false, curveSegments: 70 }),
      new THREE.MeshPhongMaterial({ color: 0x99c7d2, transparent: true, opacity: 0.37, depthWrite: false }),
    );
    glass.rotation.x = -Math.PI / 2;
    glass.position.y = FACE + 0.0004;
    group.add(glass);
    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(glass.geometry, 15),
      new THREE.LineBasicMaterial({ color: 0x637c82 }),
    );
    glass.add(outline);
    function line(points, color, dashed = false) {
      const mat = dashed
        ? new THREE.LineDashedMaterial({ color, dashSize: 0.004, gapSize: 0.003 })
        : new THREE.LineBasicMaterial({ color });
      const mesh = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points.map(([x, z]) => new THREE.Vector3(x, FACE + 0.0005, z))),
        mat,
      );
      mesh.computeLineDistances();
      group.add(mesh);
    }
    line(
      [
        [0, -R * 0.92],
        [0, R * 0.92],
      ],
      0x70787b,
      true,
    );
    line(
      [
        [-R * 0.92, 0],
        [R * 0.92, 0],
      ],
      0x8c8980,
    );
    const pen = laserPen();
    group.add(pen);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.028, TOP - 0.006, 0.018), paint(0x888783));
    foot.position.set(-0.045, -(TOP + 0.006) / 2, 0);
    pen.add(foot);
    // 光迹来自盘面散射；仅描教材关注的一次平面反射和折射。
    function ray() {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.00095, 0.00095, 1, 10),
        new THREE.MeshBasicMaterial({ color: 0xeb3426, transparent: true, depthWrite: false }),
      );
      mesh.renderOrder = 3;
      group.add(mesh);
      return mesh;
    }
    const incoming = ray(),
      reflected = ray(),
      transmitted = ray(),
      emerging = ray();
    function trace(mesh, x1, z1, x2, z2, power) {
      mesh.visible = power > 0;
      if (!mesh.visible) return;
      const dx = x2 - x1,
        dz = z2 - z1,
        l = Math.hypot(dx, dz);
      mesh.position.set((x1 + x2) / 2, TOP, (z1 + z2) / 2);
      mesh.scale.y = l;
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / l, 0, dz / l));
      mesh.material.opacity = Math.sqrt(power);
    }
    let angle = 20,
      low = null,
      high = null,
      near = false,
      identifying = false,
      start,
      held,
      point,
      rows,
      ui;
    const records = new Set();
    const target = () => (!near && !identifying && records.has(angle) ? pen : null);
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        {
          id: 'split',
          title: '观察两束光',
          todo: '沿入射光读盘面刻度，记下玻璃和空气两侧的光迹。',
          target,
        },
        {
          id: 'total',
          title: '找到全反射',
          todo: '沿盘边拖光笔，增大入射角，找到只剩反射光的角度。',
          target,
        },
        {
          id: 'bound',
          title: '夹出临界角',
          todo: '来回微调光笔，记录临界角两侧的相邻刻度。',
          target,
        },
      ],
    });
    function draw() {
      const a = angle * deg,
        s = Math.sin(a),
        c = Math.cos(a),
        opt = flatFace(angle);
      pen.position.set(-PEN * s, TOP, -PEN * c);
      pen.rotation.y = a - Math.PI / 2;
      trace(incoming, -PEN * s, -PEN * c, 0, 0, 1);
      trace(reflected, 0, 0, BRICK * s, -BRICK * c, opt.reflectance);
      trace(emerging, BRICK * s, -BRICK * c, R * 0.94 * s, -R * 0.94 * c, opt.reflectance * 0.96);
      const r = opt.refracted ?? 0;
      trace(transmitted, 0, 0, R * 0.94 * Math.sin(r), R * 0.94 * Math.cos(r), opt.transmittance);
    }
    function guide() {
      if (bar.finished)
        return bar.say('在 ' + low + '° 仍有折射光，' + high + '° 已全反射。临界角就在这两次实测之间。');
      if (near) return bar.say('顺着光笔发出的那束光，点它经过的盘边刻线。从法线的 0° 数起。');
      if (identifying)
        return bar.say(angle + '°。若空气侧有折射光，点它靠盘边的一段；若只剩反射光，点反射光靠盘边的一段。');
      if (low !== null && high !== null && (angle <= low || angle >= high))
        return bar.say('已夹在 ' + low + '° 与 ' + high + '° 之间。把光笔移到两者之间，点刻度盘读数，直到只差 1°。');
      if (records.has(angle))
        return bar.say(
          low === null
            ? '沿盘边把光笔转向法线，找回空气一侧的折射光。'
            : '沿盘边拖光笔，让入射光渐渐偏离法线，观察空气一侧。',
        );
      return bar.say('看平面两侧的光迹。点刻度盘近看，记录此时的入射角。');
    }
    function leave() {
      near = false;
      ctx.back();
      bar.near(false);
      guide();
    }
    function inspect() {
      near = true;
      bar.near(true);
      const a = angle * deg;
      ctx.look(
        [-R * 0.9 * Math.sin(a), FACE, -R * 0.9 * Math.cos(a)],
        [0, 1, 0.035],
        ctx.camera.aspect < 1 ? 0.115 : 0.18,
        leave,
      );
      guide();
    }
    function read(p) {
      if (!near) {
        if (identifying) identify(p);
        else inspect();
        return;
      }
      const value = Math.round(bearing(p));
      if (value !== angle || Math.abs(Math.hypot(p.x, p.z) - R * 0.91) > 0.013)
        return bar.say('对准入射光穿过的盘边刻线。读光笔所在一侧，从法线量起。');
      identifying = !records.has(value);
      leave();
    }
    function identify(p) {
      const value = angle,
        optical = flatFace(value);
      const split = optical.refracted !== null;
      const direction = split ? optical.refracted : Math.PI - angle * deg;
      const along = p.x * Math.sin(direction) + p.z * Math.cos(direction);
      const across = p.x * Math.cos(direction) - p.z * Math.sin(direction);
      if (along < R * 0.56 || along > R * 1.05 || Math.abs(across) > 0.017)
        return bar.say('从圆心向两侧看：空气侧有光就沿折射光点向盘边；那里没有光，再沿反射光点向盘边。');
      identifying = false;
      records.add(value);
      rows.add([value + '°', split ? '有折射光' : '无折射光', '有反射光']);
      if (split) {
        low = low === null ? value : Math.max(low, value);
        bar.done('split');
      } else {
        high = high === null ? value : Math.min(high, value);
        bar.done('total');
      }
      if (low !== null && high !== null && high - low <= 1) bar.done('bound');
      guide();
    }
    const pointer = draggable(
      group,
      [
        {
          obj: pen,
          plane: 'xz',
          offset: TOP,
          hint: '沿盘边转动光笔，改变入射角',
          onStart(p) {
            start = p ? bearing(p) : angle;
            held = angle;
          },
          onDrag(p) {
            identifying = false;
            angle = clamp(held + bearing(p) - start, 0, 80);
            draw();
          },
          onEnd() {
            angle = Math.round(angle);
            draw();
            if (near) inspect();
            else guide();
          },
        },
        {
          obj: scale,
          plane: 'xz',
          offset: FACE,
          hint: '近看盘面，读入射光经过的刻线',
          onStart(p) {
            point = p?.clone();
          },
          onTap() {
            if (point) read(point);
          },
        },
      ],
      { highlight: true },
    );
    function reset() {
      if (near) leave();
      identifying = false;
      angle = 20;
      low = high = null;
      records.clear();
      rows?.clear();
      bar.undo('split', 'total', 'bound');
      draw();
      guide();
    }
    draw();
    return {
      group,
      size: { w: 0.55, d: 0.55, h: 0.045 },
      view: { elev: 59, azim: 0, margin: 1.06, lookY: 0.3 },
      toggles: ['steps'],
      pointer: {
        ...pointer,
        down(ray, e) {
          if (document.body.classList.contains('predicting')) ui?.go(1);
          return pointer.down(ray, e);
        },
      },
      mount(panel) {
        ui = panel;
        bar.attach(panel);
        rows = table(['入射角', '空气一侧', '玻璃一侧']);
        panel.data.append(rows.el);
        panel.notes.append(
          note(
            '光沿半圆玻璃砖半径进入，入射方向一直经过圆心；角度从平面的法线量起。盘上的散射光迹用来观察方向和相对强弱，省略曲面上的弱反光。松手时光笔对准最近的整度刻线。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
      },
      dispose() {
        pointer.dispose();
        bar.dispose();
        texture.dispose();
      },
    };
  },
};
