// 人教版必修一图 3.4-3。两次使用同一根橡皮条，以环心的平面位置判定作用效果。
import * as THREE from 'three';
import { paint } from '../live/ink.js';
import { canvasTex, woodBlock } from './kit/props.js';
import { forceMeter, FM } from './kit/forcemeter.js';
import { lessonBar } from './kit/lessonbar.js';
import { draggable, rayToLocal, clamp } from './kit/interact.js';
import { buttons, note, table } from './kit/ui.js';
import { balanceRing, FIXED, RUBBER_LENGTH, CORD_LENGTH } from './kit/ringforces.js';

const W = 0.87,
  D = 0.55,
  Y = 0.023,
  E = { x: FIXED.x + RUBBER_LENGTH, z: 0 },
  tol = 0.005;
const origin = { x: -0.345, z: 0.141 },
  scale = 0.04;
const colors = ['#346c86', '#a45539'],
  numbers = ['①', '②'];
const unit = (dx, dz) => {
  const length = Math.hypot(dx, dz) || 1;
  return { x: dx / length, z: dz / length };
};
const degrees = (a) => (a * 180) / Math.PI;
function included(dirs) {
  return degrees(Math.acos(clamp(dirs[0].x * dirs[1].x + dirs[0].z * dirs[1].z, -1, 1)));
}
function cord(parent, radius, color) {
  const n = 2,
    pieces = [];
  const geo = new THREE.CylinderGeometry(radius, radius, 1, 8),
    mat = paint(color),
    up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const mesh = new THREE.Mesh(geo, mat);
    parent.add(mesh);
    pieces.push(mesh);
  }
  return (a, b, rest, side) => {
    const dx = b.x - a.x,
      dz = b.z - a.z,
      y0 = a.y ?? Y,
      dy = (b.y ?? Y) - y0,
      length = Math.hypot(dx, dy, dz),
      dir = unit(dx, dz);
    // 松弛时折向纸面一侧；折线两边总长仍为原长。
    const bend = (side * Math.sqrt(Math.max(0, rest ** 2 - length ** 2))) / 2;
    let prev = new THREE.Vector3(a.x, y0, a.z);
    for (let i = 1; i <= n; i++) {
      const t = i / n,
        s = bend * (1 - Math.abs(2 * t - 1)),
        v = new THREE.Vector3(a.x + t * dx - dir.z * s, y0 + t * dy, a.z + t * dz + dir.x * s),
        m = pieces[i - 1];
      const delta = v.clone().sub(prev);
      m.position.copy(prev).lerp(v, 0.5);
      m.scale.y = delta.length();
      if (m.scale.y > 0) m.quaternion.setFromUnitVectors(up, delta.normalize());
      prev = v;
    }
  };
}
export default {
  id: 'forceaddition',
  fig: '图3.4-3',
  title: '探究两个互成角度的力的合成规律',
  stampText: '探究',
  predict: {
    q: '两只测力计斜着拉住圆环。要用一只表把圆环拉回同一点，它的读数会怎样？',
    options: ['等于两表读数之和', '小于两表读数之和', '总是等于较大的那一个'],
    answer: 1,
    hint: '两分力之间有夹角，大小、方向都要考虑。',
  },
  conclusion: {
    page: 77, rect: [63.78, 613.94, 378.79, 698.32],
    quote: '通过多次的实验探究我们会发现，两个力合成时，如果以表示这两个力的有向线段为邻边作平行四边形，这两个邻边之间的对角线就代表合力的大小和方向（图3.4-4）。这个规律叫作平行四边形定则 （parallelogram rule）。',
    why: '同一根橡皮条的固定端不动，圆环两次停在同一个 O 点，橡皮条的伸长和方向都相同。环平衡时，两表拉力的矢量和与单表拉力相等。测力计分度和复位偏差会使两支实测箭头不能完全重合。',
    src: '课本第 73 页 · 第三章 第4节 力的合成和分解',
  },
  create(ctx) {
    const group = new THREE.Group(),
      board = woodBlock(W, 0.012, D);
    board.position.y = 0.006;
    group.add(board);
    const pixels = 2048,
      paperTex = canvasTex(pixels, Math.round((pixels * D) / W), () => {}),
      g = paperTex.canvas.getContext('2d');
    const paper = new THREE.Mesh(
      new THREE.PlaneGeometry(W - 0.008, D - 0.008),
      new THREE.MeshBasicMaterial({ map: paperTex }),
    );
    paper.rotation.x = -Math.PI / 2;
    paper.position.y = 0.0122;
    group.add(paper);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.007, 0.025, 20), paint(0x776451));
    pin.position.set(FIXED.x, 0.024, 0);
    group.add(pin);
    const ring = new THREE.Group();
    group.add(ring);
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.0018, 8, 32), paint(0x4f6375));
    hoop.rotation.x = Math.PI / 2;
    ring.add(hoop);
    const pick = new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 12, 8),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    pick.userData.pick = true;
    ring.add(pick);
    const elastic = cord(group, 0.0024, 0xaa794e);
    const meters = [0, 1].map((i) => {
      const mesh = forceMeter();
      group.add(mesh);
      const badge = new THREE.Mesh(
        new THREE.PlaneGeometry(0.022, 0.012),
        new THREE.MeshBasicMaterial({
          map: canvasTex(128, 70, (c, w, h) => {
            c.fillStyle = colors[i];
            c.fillRect(0, 0, w, h);
            c.fillStyle = '#fff';
            c.font = 'bold 58px sans-serif';
            c.textAlign = 'center';
            c.fillText(numbers[i], w / 2, 58);
          }),
        }),
      );
      badge.position.set(0.012, -0.016, 0.007);
      mesh.add(badge);
      const strings = new THREE.Group();
      group.add(strings);
      return {
        mesh,
        strings,
        tie: cord(strings, 0.0011, i ? 0xa45539 : 0x346c86),
        handle: { x: 0, z: 0 },
        dir: { x: 1, z: 0 },
        force: 0,
      };
    });
    const meterRest = -meters[0].mesh.hookEnd + CORD_LENGTH + 0.009;
    let phase = 'pair',
      point = { ...E },
      mark = null,
      single = null,
      pencil = null,
      drawing = false,
      near = null,
      aim = null,
      ui,
      tableEl;
    const rounds = [];
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'pair', title: '记录两个分力', todo: '拖两只测力计拉开圆环。', target: () => aim },
        { id: 'single', title: '复现同一位置', todo: '用一只表把环心拉回 O。', target: () => aim },
        { id: 'repeat', title: '换夹角再试', todo: '换一个夹角，再比较两次作用效果。', target: () => aim },
      ],
    });
    const gap = () => (mark ? Math.hypot(point.x - mark.o.x, point.z - mark.o.z) : Infinity);
    function say(text, obj = null) {
      bar.say(text);
      aim = near ? null : obj;
    }
    function initialHandles() {
      meters.forEach((m, i) => {
        const a = (i ? 1 : -1) * 0.64;
        m.handle = { x: E.x + meterRest * Math.cos(a), z: E.z + meterRest * Math.sin(a) };
      });
    }
    function updateRig() {
      const active = ['single', 'readSingle', 'draw', 'result'].includes(phase) ? meters.slice(0, 1) : meters;
      const state = balanceRing(
        point,
        active.map((m) => m.handle),
        meterRest,
        FM.PER_N,
      );
      point = state.point;
      ring.position.set(point.x, Y, point.z);
      const along = unit(point.x - FIXED.x, point.z - FIXED.z);
      elastic(FIXED, { x: point.x - 0.009 * along.x, z: point.z - 0.009 * along.z }, RUBBER_LENGTH - 0.009, 1);
      meters.forEach((m, i) => {
        const attached = i < active.length;
        m.force = state.readings[i]?.force || 0;
        if (attached) m.dir = unit(m.handle.x - point.x, m.handle.z - point.z);
        const dir = m.dir;
        m.mesh.position.set(m.handle.x, Y, m.handle.z);
        m.mesh.quaternion.setFromRotationMatrix(
          new THREE.Matrix4().makeBasis(
            new THREE.Vector3(-dir.z, 0, dir.x),
            new THREE.Vector3(dir.x, 0, dir.z),
            new THREE.Vector3(0, 1, 0),
          ),
        );
        m.mesh.set(m.force);
        const end = { x: m.handle.x + dir.x * m.mesh.hookEnd, z: m.handle.z + dir.z * m.mesh.hookEnd };
        if (attached) {
          const rim = { x: point.x + 0.009 * dir.x, z: point.z + 0.009 * dir.z };
          m.tie(rim, end, CORD_LENGTH, i ? 1 : -1);
        } else {
          // 解下的是环端；短绳仍留在测力计的挂钩上，垂落到纸面。
          m.tie(
            {
              x: end.x - 0.025 * dir.x + 0.015 * dir.z,
              z: end.z - 0.025 * dir.z - 0.015 * dir.x,
              y: paper.position.y + 0.0012,
            },
            end,
            CORD_LENGTH,
            1,
          );
        }
      });
    }
    function paperPoint(p) {
      return [(p.x / (W - 0.008) + 0.5) * pixels, (p.z / (D - 0.008) + 0.5) * paperTex.canvas.height];
    }
    function line(a, b, color, width, dash = []) {
      const [x, y] = paperPoint(a),
        [u, v] = paperPoint(b);
      g.strokeStyle = color;
      g.lineWidth = width;
      g.setLineDash(dash);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(u, v);
      g.stroke();
      g.setLineDash([]);
    }
    function label(s, p, color) {
      const [x, y] = paperPoint(p);
      g.font = 'bold 28px sans-serif';
      g.textAlign = 'left';
      g.fillStyle = color;
      g.fillText(s, x, y);
    }
    function arrow(a, b, color, text) {
      line(a, b, color, 4);
      const d = unit(b.x - a.x, b.z - a.z);
      for (const sign of [-1, 1])
        line(b, { x: b.x - 0.006 * d.x + sign * 0.003 * d.z, z: b.z - 0.006 * d.z - sign * 0.003 * d.x }, color, 4);
      label(text, { x: b.x + 0.003, z: b.z + 0.004 }, color);
    }
    function cross(p, color, s) {
      line({ x: p.x - 0.014, z: p.z }, { x: p.x + 0.014, z: p.z }, color, 2);
      line({ x: p.x, z: p.z - 0.014 }, { x: p.x, z: p.z + 0.014 }, color, 2);
      label(s, { x: p.x - 0.012, z: p.z + 0.021 }, color);
    }
    function drawPaper() {
      g.fillStyle = '#fff6df';
      g.fillRect(0, 0, pixels, paperTex.canvas.height);
      cross(E, '#89816e', 'E');
      label('G', { x: FIXED.x - 0.011, z: 0.024 }, '#655849');
      if (mark) {
        cross(mark.o, '#ac513b', 'O');
        const tips = mark.dirs.map((d, i) =>
          mark.values[i] === null
            ? null
            : { x: origin.x + scale * mark.values[i] * d.x, z: origin.z + scale * mark.values[i] * d.z },
        );
        label('力的图示', { x: origin.x, z: origin.z - 0.087 }, '#665c51');
        line({ x: origin.x, z: origin.z + 0.052 }, { x: origin.x + scale, z: origin.z + 0.052 }, '#665c51', 3);
        label('1 N', { x: origin.x + scale + 0.005, z: origin.z + 0.056 }, '#665c51');
        tips.forEach((tip, i) => {
          if (tip) arrow(origin, tip, colors[i], i ? 'F₂' : 'F₁');
        });
        if (single) {
          const sum = { x: tips[0].x + tips[1].x - origin.x, z: tips[0].z + tips[1].z - origin.z };
          for (const tip of tips) line(tip, sum, '#8c8274', 3, [8, 6]);
          if (phase === 'result') line(origin, sum, '#514941', 7, [9, 8]);
          if (pencil && phase === 'draw') arrow(origin, pencil, '#55534e', '');
          if (phase !== 'result') {
            paperTex.needsUpdate = true;
            return;
          }
          const tip = {
            x: origin.x + scale * single.value * single.dir.x,
            z: origin.z + scale * single.value * single.dir.z,
          };
          arrow(origin, tip, '#2e795a', 'F');
          label('单表实测', { x: tip.x + 0.004, z: tip.z + 0.017 }, '#2e795a');
        }
      }
      paperTex.needsUpdate = true;
    }
    function guide() {
      switch (phase) {
        case 'pair':
          {
            const slack = meters.find((m) => m.force < 0.32);
            say(
              slack
                ? '拖动 ' + numbers[meters.indexOf(slack)] + ' 表，把细绳拉紧，让指针偏转。'
                : '两表已拉紧。调整夹角后点圆环，标出 O。',
              slack?.mesh || ring,
            );
          }
          break;
        case 'readPair': {
          const i = mark.values.findIndex((v) => v === null);
          say('O 已标好。点 ' + numbers[i] + ' 表近看，读出这个分力。', meters[i].mesh);
          break;
        }
        case 'detach':
          say('两条分力已画在纸上。点 ② 表解开它的细绳，留下 ① 表。', meters[1].mesh);
          break;
        case 'single':
          say(
            gap() <= tol ? '环心已到 O。点圆环记下单表方向。' : '拖 ① 表，把圆环拉回纸上的 O。长度和方向都要对上。',
            gap() <= tol ? ring : meters[0].mesh,
          );
          break;
        case 'readSingle':
          say('点 ① 表，读出单独拉回 O 所用的力。', meters[0].mesh);
          break;
        case 'draw':
          say(
            near === 'paper'
              ? '从两支箭头的共同起点拖到对角顶点，作出合力。'
              : '已记单表读数。点纸板左下的力图近看，作出对角线。',
          );
          break;
        case 'result':
          say(
            rounds.length >= 2
              ? '两组比较完成。纸上实线是单表实测力，虚线是平行四边形的对角线。'
              : '比较实测箭头和虚线对角线。点 ② 表重新接上，换个夹角再测。',
            rounds.length >= 2 ? null : meters[1].mesh,
          );
          break;
      }
    }
    function noteRing() {
      if (document.body.classList.contains('predicting')) ui.go(1);
      if (phase === 'pair') {
        const dirs = meters.map((m) => ({ ...m.dir })),
          angle = included(dirs);
        if (meters.some((m) => m.force < 0.32) || angle < 16 || angle > 150) {
          say('把两只表往外拉，让两根绳都有明显读数，并形成夹角。', meters.find((m) => m.force < 0.32)?.mesh || ring);
          return;
        }
        const net = Math.hypot(...['x', 'z'].map((k) => meters.reduce((s, m) => s + m.force * m.dir[k], 0)));
        if (net > 4.8 || meters.some((m) => m.force > 5)) {
          say('拉力超过本次可比较的量程，把表稍向环移近些。');
          return;
        }
        const along = unit(point.x - FIXED.x, point.z - FIXED.z),
          reach = meterRest + FM.PER_N * net;
        if (point.x + along.x * reach > 0.41 || Math.abs(point.z + along.z * reach) > 0.244) {
          say('这个 O 太靠近板边，单表拉到同一点会超出纸板。把两表略向环移近再标 O。');
          return;
        }
        if (rounds.length && Math.abs(angle - rounds[0].angle) < 12) {
          say('这次夹角和第一组很接近。把两表方向再张开或收拢一些。', meters[1].mesh);
          return;
        }
        mark = { o: { ...point }, dirs, angle, values: [null, null] };
        phase = 'readPair';
        drawPaper();
      } else if (phase === 'single') {
        if (gap() > tol) {
          if (
            Math.abs(
              Math.hypot(point.x - FIXED.x, point.z - FIXED.z) - Math.hypot(mark.o.x - FIXED.x, mark.o.z - FIXED.z),
            ) < tol
          ) {
            say('橡皮条长度已经接近，但方向还不同。横向调整，让环心也回到 O。', meters[0].mesh);
            return;
          }
          say('环心离 O 还有约 ' + Math.round(gap() * 1000) + ' mm。沿纸面拖 ① 表，让环心与十字重合。', meters[0].mesh);
          return;
        }
        phase = 'readSingle';
      }
      guide();
    }
    function leave() {
      near = null;
      drawing = false;
      ctx.back();
      bar.near(false);
      guide();
    }
    function meterTap(i) {
      if (phase === 'detach' && i === 1) {
        phase = 'single';
        updateRig();
        guide();
        return;
      }
      if (phase === 'result' && i === 1) {
        mark = single = null;
        phase = 'pair';
        updateRig();
        drawPaper();
        guide();
        return;
      }
      if ((phase === 'readPair' && mark.values[i] === null) || (phase === 'readSingle' && i === 0)) {
        near = i;
        bar.near(true);
        const m = meters[i],
          v = group.worldToLocal(m.mesh.pointer.getWorldPosition(new THREE.Vector3()));
        ctx.look(v.toArray(), [0, 1, 0.05], 0.16, leave);
        say('每小格 0.2 N。在红色指针旁点对应的刻度。');
        return;
      }
      guide();
    }
    function recordGauge(ray) {
      const i = near,
        m = meters[i],
        p = rayToLocal(ray, m.mesh, 'xy', 0.0055);
      if (!p || Math.abs(p.x) > 0.026) return;
      const value = Math.round(((-p.y - 0.012 - FM.ZERO) / FM.PER_N) * 5) / 5;
      if (value < 0 || value > 5 || Math.abs(value - m.force) > 0.16) {
        say('再看指针所对的刻线，每小格 0.2 N。');
        return;
      }
      if (phase === 'readPair') {
        mark.values[i] = value;
        if (mark.values.every((v) => v !== null)) {
          phase = 'detach';
          bar.done('pair');
        }
      } else {
        single = { value, dir: { ...m.dir } };
        phase = 'draw';
        pencil = null;
      }
      drawPaper();
      leave();
    }
    function openDiagram() {
      near = 'paper';
      drawing = false;
      bar.near(true);
      ctx.look([origin.x + 0.072, 0.012, origin.z], [0, 1, 0.07], 0.32, leave);
      if (phase === 'result') say('绿色是单表实测力，虚线是按两个分力作出的合力。可沿它们的方向和长度比较。');
      else guide();
    }
    function finishDrawing() {
      if (!drawing) return;
      drawing = false;
      const sum = mark.dirs.reduce((v, d, i) => ({ x: v.x + d.x * mark.values[i], z: v.z + d.z * mark.values[i] }), {
        x: 0,
        z: 0,
      });
      if (Math.hypot(pencil.x - origin.x - scale * sum.x, pencil.z - origin.z - scale * sum.z) > 0.009) {
        pencil = null;
        drawPaper();
        say('对角顶点是两条虚线的交点。从共同起点再画一次。');
        return;
      }
      rounds.push(mark);
      tableEl.el.hidden = false;
      tableEl.add([
        String(rounds.length),
        Math.round(mark.angle) + '°',
        ...mark.values.map((n) => n.toFixed(1)),
        Math.hypot(sum.x, sum.z).toFixed(2),
        single.value.toFixed(1),
      ]);
      phase = 'result';
      bar.done('single');
      if (rounds.length >= 2) bar.done('repeat');
      drawPaper();
      say('虚线是你作出的合力，绿线是单表实测力。比较方向和长度，再回到全景。');
    }
    const drags = meters.map((m, i) => ({
      obj: m.mesh,
      plane: 'xz',
      offset: Y,
      keepOffset: true,
      hint: () => (phase === 'pair' || phase === 'single' ? '拖动测力计拉圆环' : '点测力计读数或解开细绳'),
      onStart() {
        if (document.body.classList.contains('predicting')) ui.go(1);
      },
      onDrag(p) {
        if (Math.hypot(p.x - m.handle.x, p.z - m.handle.z) < 0.001) return;
        if (phase === 'readPair' || phase === 'detach') {
          mark = null;
          phase = 'pair';
          if (!rounds.length) bar.undo('pair');
          drawPaper();
        } else if (phase === 'readSingle' && i === 0) phase = 'single';
        if (!(phase === 'pair' || phase === 'single')) return;
        m.handle.x = clamp(p.x, 0.075, 0.411);
        m.handle.z = clamp(
          p.z,
          phase === 'pair' && i === 1 ? 0.035 : -0.245,
          phase === 'pair' && i === 0 ? -0.035 : 0.245,
        );
        updateRig();
      },
      onEnd(moved) {
        if (moved) guide();
      },
      onTap() {
        meterTap(i);
      },
    }));
    const desk = draggable(group, drags, {
      highlight: true,
      taps: [{ obj: ring, hint: '标出环心位置', onTap: noteRing }],
    });
    const pointer = {
      items: desk.items,
      down(ray, e) {
        const p = rayToLocal(ray, group, 'xz', paper.position.y);
        if (near === 'paper') {
          if (phase === 'draw' && p && Math.hypot(p.x - origin.x, p.z - origin.z) < 0.016) {
            drawing = true;
            pencil = { ...origin };
            drawPaper();
          } else if (phase === 'draw') say('先按住两支分力箭头相接的起点，再拖向对角顶点。');
          return true;
        }
        if (
          near === null &&
          ['draw', 'result'].includes(phase) &&
          p &&
          p.x >= origin.x - 0.035 &&
          p.x <= origin.x + 0.235 &&
          Math.abs(p.z - origin.z) < 0.118
        ) {
          openDiagram();
          return true;
        }
        if (near !== null) {
          recordGauge(ray);
          return true;
        }
        return desk.down(ray, e);
      },
      move(ray) {
        if (drawing) {
          const p = rayToLocal(ray, group, 'xz', paper.position.y);
          if (p) {
            pencil = { x: p.x, z: p.z };
            drawPaper();
          }
          return true;
        }
        return near !== null || desk.move(ray);
      },
      up() {
        if (near === 'paper') {
          finishDrawing();
          return true;
        }
        return desk.up();
      },
    };
    function reset() {
      near = null;
      bar.near(false);
      ctx.back();
      phase = 'pair';
      rounds.length = 0;
      pencil = null;
      drawing = false;
      point = { ...E };
      mark = single = null;
      initialHandles();
      updateRig();
      drawPaper();
      tableEl.clear();
      tableEl.el.hidden = true;
      bar.undo('pair', 'single', 'repeat');
      guide();
    }
    initialHandles();
    updateRig();
    drawPaper();
    return {
      group,
      pointer,
      toggles: ['steps'],
      size: { w: W + 0.025, d: D + 0.025, h: 0.07 },
      view: { elev: 58, azim: 0, lookY: 0.25, margin: 1.02 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        tableEl = table(['组', '夹角', 'F₁ / N', 'F₂ / N', '对角线 / N', '单表 F / N']);
        tableEl.el.hidden = true;
        ui.data.append(tableEl.el);
        ui.notes.append(
          note(
            '把测力计平放在纸板上缓慢拉，忽略摩擦；用同一根橡皮条比较静止位置。纸上的箭头按你读出的力绘制，标尺为 1 N。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        guide();
      },
      update(dt) {
        bar.update(dt);
      },
      dispose() {
        desk.dispose();
        bar.dispose();
        paperTex.dispose();
      },
    };
  },
};
