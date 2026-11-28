// 人教版必修一图 3.4-3。两次使用同一根橡皮条，以环心的平面位置判定作用效果。
import * as THREE from 'three';
import { paint } from '../live/ink.js';
import { canvasTex, woodBlock } from './kit/props.js';
import { forceMeter, FM } from './kit/forcemeter.js';
import { lessonBar } from './kit/lessonbar.js';
import { draggable, rayToLocal, clamp } from './kit/interact.js';
import { buttons, h, table } from './kit/ui.js';
import { qaFlow } from './kit/chemlesson.js';
import { balanceRing, FIXED, RUBBER_K, RUBBER_LENGTH, CORD_LENGTH } from './kit/ringforces.js';

const W = 0.87,
  D = 0.55,
  Y = 0.023,
  E = { x: FIXED.x + RUBBER_LENGTH, z: 0 },
  tol = 0.005;
const origin = { x: -0.365, z: 0.158 };
const dock = { x: 0.383, z: 0.234 };
const vec = (p, y = Y) => new THREE.Vector3(p.x, y, p.z);
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const shift = (p, d, length) => ({ x: p.x + length * d.x, z: p.z + length * d.z });
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
function pickBox(w, h, d) {
  const obj = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
  obj.userData.pick = true;
  return obj;
}

export default {
  id: 'forceaddition',
  fig: '图3.4-3',
  title: '探究两个互成角度的力的合成规律',
  stampText: '探究',
  predict: {
    q: '两个力一起把圆环拉到 O 点。换成一个力，仍把圆环拉到 O 点。这个力的大小和方向跟那两个力有什么关系？',
    options: ['大小等于两个拉力之和', '大小和方向由两个拉力共同决定', '方向总跟较大的拉力相同'],
    answer: 1,
  },
  conclusion: {
    page: 77, rect: [63.78, 613.94, 378.79, 698.32],
    quote: '通过多次的实验探究我们会发现，两个力合成时，如果以表示这两个力的有向线段为邻边作平行四边形，这两个邻边之间的对角线就代表合力的大小和方向（图3.4-4）。这个规律叫作平行四边形定则 （parallelogram rule）。',
    why: '同一根橡皮条的固定端不动，圆环两次停在同一个 O 点，橡皮条的伸长和方向都相同。环平衡时，两表拉力的矢量和与单表拉力相等。读数和环心复位都有误差，按本轮单表读数画出的箭头与作图所得的对角线可能略有偏差。',
    src: '课本第 73 页 · 第三章 第4节 力的合成和分解',
  },
  create(ctx) {
    const group = new THREE.Group(),
      board = woodBlock(W, 0.012, D);
    board.position.y = 0.006;
    group.add(board);
    const pixels = 3072,
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
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.0018, 8, 32), paint(0x4f6375, { unique: true, keep: true }));
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
      badge.position.set(0, -0.184, 0.006);
      mesh.add(badge);
      const grip = pickBox(0.054, 0.217, 0.019);
      grip.position.y = -0.102;
      mesh.add(grip);
      const strings = new THREE.Group();
      group.add(strings);
      return {
        mesh, grip,
        strings,
        tie: cord(strings, 0.0011, i ? 0xa45539 : 0x346c86),
        handle: { x: 0, z: 0 },
        dir: { x: 1, z: 0 },
        force: 0,
      };
    });
    const meterRest = -meters[0].mesh.hookEnd + CORD_LENGTH + 0.009;

    const steps = [['pair', '测两个分力'], ['single', '测等效的单个力'], ['draw', '作图比较'], ['repeat', '换夹角检验']];
    const rounds = [];
    const rows = table(['组', '夹角', 'F₁ / N', 'F₂ / N', '单表 / N', '作图 / N'], { note: 'F₁、F₂ 和单表 F 均为模拟测力计读数。' });
    const calculation = h('p', { class: 'note' });
    for (const note of [rows.el.querySelector('.note'), calculation]) {
      note.style.color = '#594f40';
      note.style.fontSize = '14px';
    }
    const paperY = paper.position.y + 0.0004;
    const sheet = pickBox(0.28, 0.001, 0.20);
    sheet.position.set(-0.263, paperY, 0.145);
    const pen = pickBox(0.019, 0.001, 0.019);
    group.add(sheet, pen);
    let phase, point, mark, single, near, aim, ui, scale, pencil, returning, start, lifted;
    const guideLayer = new THREE.Group();
    guideLayer.position.y = paperY;
    group.add(guideLayer);
    const bar = lessonBar({ ...ctx, group: guideLayer, back: leave, steps: steps.map(([id, title]) => ({ id, title, todo: title, target: () => ui?.step === 1 ? aim : null })) });
    const penDot = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.0006, 20), paint(0x464b46));
    pen.add(penDot);
    const paperCorner = penDot.clone();
    paperCorner.position.set(-0.137, 0.0003, -0.093);
    sheet.add(paperCorner);
    const tip = ctx.tag('', 'pill');
    const field = h('input', { type: 'number', step: 'any', inputmode: 'decimal', required: true, style: 'width:5em;margin:0 .5em' });
    const headerPaper = h('style', {}, 'body.theme-day #hud-top .brand{background:#fff7e5;padding:5px 8px;border-radius:3px}');
    const fieldName = h('span');
    const form = h('form', { onsubmit(e) { e.preventDefault(); if (phase === 'measure') recordLength(); else recordGauge(); } },
      h('label', {}, fieldName, field), h('button', { type: 'submit', class: 'go', style: 'width:auto;margin:0' }, '记下'));
    const enter = () => { if (ui?.step !== 1) ui?.go(1); };
    function say(text, obj) {
      const meter = meters.find(m => m.grip === obj);
      aim = meter ? (canRead(meters.indexOf(meter)) ? meter.mesh.pointer : meter.mesh.ring) : obj === pick ? hoop : obj || null;
      bar.say(text);
    }
    function initialHandles() {
      meters.forEach((m, i) => {
        const a = (i ? 1 : -1) * 0.43;
        m.handle = shift(E, { x: Math.cos(a), z: Math.sin(a) }, meterRest);
      });
    }
    function activeMeters() {
      return !lifted && ['pair', 'readPair', 'park'].includes(phase) ? meters : meters.slice(0, 1);
    }
    function equilibrium(active) {
      return balanceRing(active.length === 1 ? E : point, active.map(m => m.handle), meterRest, FM.PER_N);
    }
    function updateRig() {
      const active = activeMeters(), state = equilibrium(active);
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
    function label(text, p, color, size = 0.013) {
      g.font = '600 ' + Math.round(size * pixels / W) + 'px sans-serif';
      g.fillStyle = color;
      g.fillText(text, ...paperPoint(p));
    }
    function circle(p, r, color) {
      const [x, y] = paperPoint(p);
      g.beginPath();
      g.arc(x, y, r * pixels / (W - 0.008), 0, Math.PI * 2);
      g.strokeStyle = color;
      g.lineWidth = 3;
      g.stroke();
    }
    function cross(p, color) {
      line({ x: p.x - 0.014, z: p.z }, { x: p.x + 0.014, z: p.z }, color, 3);
      line({ x: p.x, z: p.z - 0.014 }, { x: p.x, z: p.z + 0.014 }, color, 3);
    }
    function arrow(a, b, color, width = 5, dash = []) {
      line(a, b, color, width, dash);
      const d = unit(b.x - a.x, b.z - a.z);
      const size = Math.min(0.005, distance(a, b) / 3);
      for (const side of [-1, 1]) {
        line(b, { x: b.x - size * (d.x - side * 0.55 * d.z), z: b.z - size * (d.z + side * 0.55 * d.x) }, color, width);
      }
    }
    const forceTip = i => shift(origin, mark.dirs[i], scale * mark.values[i]);
    const vertex = () => shift(forceTip(0), mark.dirs[1], scale * mark.values[1]);
    const gridSize = () => scale / 2;
    function atVertex(p) {
      const from = phase === 'side' ? forceTip(0) : origin;
      return distance(p, vertex()) <= Math.min(0.007, distance(from, vertex()) * 0.18);
    }
    function drawGraduations() {
      const end = vertex(), dir = unit(end.x - origin.x, end.z - origin.z);
      const normal = { x: -dir.z, z: dir.x };
      const zero = shift(origin, normal, 0.009);
      const tenths = Math.ceil(distance(origin, end) / gridSize() * 10) + 2;
      line(zero, shift(zero, dir, tenths * gridSize() / 10), '#71695d', 2);
      for (let i = 0; i <= tenths; i++) {
        const tick = shift(zero, dir, i * gridSize() / 10);
        line(tick, shift(tick, normal, i % 5 === 0 ? 0.004 : 0.002), '#71695d', 2);
        if (i % 10 === 0) {
          const p = shift(tick, normal, 0.012);
          const [x, y] = paperPoint(p);
          g.fillStyle = '#fffdf4';
          g.fillRect(x - 14, y - 24, 28, 28);
          g.textAlign = 'center';
          label(String(i / 10), p, '#534c42', 0.007);
          g.textAlign = 'start';
        }
      }
      line(end, shift(end, normal, 0.009), '#71695d', 2, [4, 3]);
    }
    const drawingPhase = () => phase === 'side' || phase === 'diagonal';
    function drawSheet() {
      const left = -0.406, right = -0.119, top = 0.048, bottom = 0.254;
      const [x, y] = paperPoint({ x: left, z: top }), [u, v] = paperPoint({ x: right, z: bottom });
      g.fillStyle = '#fffdf4';
      g.fillRect(x, y, u - x, v - y);
      g.strokeStyle = '#c0b7a2'; g.lineWidth = 3; g.strokeRect(x, y, u - x, v - y);
      for (let xx = left + gridSize(); xx < right; xx += gridSize())
        line({ x: xx, z: top + 0.034 }, { x: xx, z: bottom - 0.024 }, '#e8e6d9', 1.4);
      for (let zz = top + 0.034; zz <= bottom - 0.024; zz += gridSize())
        line({ x: left, z: zz }, { x: right, z: zz }, '#e8e6d9', 1.4);
      const groupNo = rounds.length + (phase === 'result' ? 0 : 1);
      label('第 ' + groupNo + ' 组 · 力的图示', { x: left + 0.009, z: top + 0.022 }, '#534c42', 0.012);
      const key = { x: right - scale - 0.034, z: top + 0.016 };
      line(key, { x: key.x + scale, z: key.z }, '#534c42', 4);
      for (const dx of [0, gridSize(), scale])
        line({ x: key.x + dx, z: key.z - 0.002 }, { x: key.x + dx, z: key.z + 0.002 }, '#534c42', 3);
      label('1 N', { x: key.x + scale + 0.005, z: key.z + 0.003 }, '#534c42', 0.01);
      mark.values.forEach((value, i) => {
        if (value !== null) arrow(origin, forceTip(i), colors[i]);
      });
      if (single) arrow(origin, shift(origin, single.dir, single.value * scale), '#278063', 8);
      if (['diagonal', 'measure', 'result'].includes(phase)) {
        for (const i of [0, 1]) line(forceTip(i), vertex(), '#625d52', 3, [11, 8]);
      }
      if (phase === 'measure' || phase === 'result') arrow(origin, vertex(), '#383933', 3.8, [9, 8]);
      if (phase === 'measure' && near === 'paper') drawGraduations();
      if (drawingPhase() && near === 'paper') {
        const from = phase === 'side' ? forceTip(0) : origin;
        pen.position.copy(vec(from, paperY));
        circle(from, 0.004, phase === 'side' ? colors[0] : '#514941');
        if (pencil) {
          const snapped = atVertex(pencil);
          arrow(from, snapped ? vertex() : pencil, '#484640', 4, [9, 7]);
          if (snapped) circle(vertex(), 0.004, '#484640');
        }
      }
      label('O', { x: origin.x - 0.012, z: origin.z + 0.004 }, '#554c41', 0.011);
      [[colors[0], 'F₁'], [colors[1], 'F₂'], ['#278063', '单表 F'], ['#383933', '对角线']].forEach(([color, name], i) => {
        if ((i === 2 && !single) || (i === 3 && phase !== 'result' && phase !== 'measure')) return;
        const a = { x: left + [0.009, 0.062, 0.113, 0.199][i], z: bottom - 0.011 };
        line(a, { x: a.x + 0.014, z: a.z }, color, 4, i === 3 ? [8, 5] : []);
        label(name, { x: a.x + 0.018, z: a.z + 0.004 }, color, 0.01);
      });
    }
    function drawPaper() {
      g.fillStyle = '#fff7e3'; g.fillRect(0, 0, pixels, paperTex.canvas.height);
      cross(E, '#938876');
      label('G', { x: FIXED.x - 0.007, z: -0.019 }, '#5f574c');
      label('E', { x: E.x - 0.006, z: -0.019 }, '#5f574c');
      pen.visible = drawingPhase() && near === 'paper';
      sheet.visible = !!mark;
      if (mark) {
        const color = '#a44432';
        cross(mark.o, color); circle(mark.o, 0.010, color);
        label('O', { x: mark.o.x + 0.008, z: mark.o.z + 0.022 }, color);
        mark.dirs.forEach((d, i) => line(mark.o, shift(mark.o, d, 0.058), colors[i], 3, [8, 7]));
        drawSheet();
      }
      if (phase === 'park' || (mark && phase !== 'readPair')) {
        const a = { x: dock.x - 0.215, z: dock.z - 0.026 }, b = { x: dock.x + 0.006, z: dock.z + 0.026 };
        for (const [c, d] of [[a, { x: b.x, z: a.z }], [{ x: b.x, z: a.z }, b], [b, { x: a.x, z: b.z }], [{ x: a.x, z: b.z }, a]])
          line(c, d, '#996c50', 3, [10, 7]);
        if (phase === 'park') label('②', { x: dock.x - 0.11, z: dock.z + 0.008 }, colors[1], 0.02);
      }
      paperTex.needsUpdate = true;
    }

    function guide(prefix = '') {
      const tell = (s, obj) => say(prefix + s, obj);
      if (phase === 'pair') {
        const i = meters.findIndex(m => m.force < 0.32);
        return i < 0 ? tell('两根绳已绷紧。点圆环，标下 O 和两条拉力的方向。', pick)
          : tell('向外拖' + numbers[i] + '表，让两根绳斜着拉紧，圆环离开原位 E。', meters[i].grip);
      }
      if (typeof near === 'number') return tell('每小格 0.2 N。读红针最接近的刻线，填入读数栏。');
      if (phase === 'readPair') {
        const i = mark.values.findIndex(v => v === null);
        return tell('点' + numbers[i] + '表读数，确定这支分力箭头的长度。', meters[i].grip);
      }
      if (phase === 'park') return tell('两个分力已记下。把②表拖到右下虚线框，撤去它的拉力。', meters[1].grip);
      if (phase === 'release') return tell('把①表向 E 移近，直到细绳松弛、红针回零，再松手。', meters[0].grip);
      if (phase === 'single') return tell('只拖①表，使环心对准 O 再松手，重现两表共同拉的效果。', meters[0].grip);
      if (phase === 'readSingle') return tell('环心回到 O，橡皮条和两表拉时一样长，方向也相同。点①表读出等效的力。', meters[0].grip);
      if (drawingPhase() && near !== 'paper') return tell('三个力已按同一标尺画出。点左下的力图，比较三支箭头。', sheet);
      if (phase === 'measure') return near === 'paper'
        ? tell('笔尖已吸附到交点。沿对角线读出长度，每大格分成十小格。')
        : tell('点左下的力图，量出对角线的长度。', sheet);
      if (phase === 'side') return tell('从蓝箭头尖拖出一条与棕箭头平行、同向、等长的边。', pen);
      if (phase === 'diagonal') return tell('两组对边已平行且等长。从 O 拖到对角顶点，和绿色单表箭头比较。', pen);
      if (phase === 'result' && near === 'paper' && rounds.length === 1)
        return tell(mark.comparison + '回到全景，换个夹角检验。');
      if (rounds.length === 1) return tell('点左下的记录纸换一组，用不同夹角检验刚才的发现。', sheet);
      return tell(rounds.every(r => r.close) ? '两组中，对角线的长度和方向都与单表所测接近。可以掀开课本结论了。'
        : '两组已测完。对照单表箭头和对角线的偏差，再看课本结论。');
    }
    function noteRing() {
      enter();
      const dirs = meters.map(m => ({ ...m.dir })), angle = included(dirs);
      const slack = meters.find(m => m.force < 0.32);
      if (slack) return say('至少一根红针的偏转太小。把这只表往外拖，让两个读数都清楚。', slack.grip);
      if (angle < 16 || angle > 150) return say('两根绳几乎在一条直线上。改变拉的方向，留出明显的夹角。', meters[1].grip);
      const along = unit(point.x - FIXED.x, point.z - FIXED.z);
      const net = (distance(point, FIXED) - RUBBER_LENGTH) * RUBBER_K;
      const hand = shift(point, along, meterRest + FM.PER_N * net);
      if (net > FM.MAX || meters.some(m => m.force > FM.MAX))
        return say('拉力太大，测力计量程不够。把表向环移近些再标 O。', meters[0].grip);
      if (hand.x > 0.408 || Math.abs(hand.z) > 0.18)
        return say('O 太靠纸边，单表没有拉伸的余地。把两表向环移近些再试。', meters[0].grip);
      if (rounds.length && Math.abs(angle - rounds[0].angle) < 12)
        return say('这次夹角和上一组太接近。把两根绳再张开或收拢一些。', meters[1].grip);
      mark = { o: { ...point }, angle, dirs, values: [null, null] };
      scale = Math.min(0.077, 0.19 / (net + 0.25), 0.062 / Math.max(1, ...meters.map(m => Math.abs(m.dir.z) * (m.force + 0.1)), Math.abs(along.z) * (net + 0.15)));
      rows.add([String(rounds.length + 1), '≈' + Math.round(angle) + '°', '—', '—', '—', '—']);
      phase = 'readPair'; drawPaper(); guide('O 和绳的方向已标好。');
    }
    function leave() {
      near = null; pencil = null; form.hidden = true;
      bar.near(false); ctx.back(); drawPaper(); guide();
    }
    function openGauge(i) {
      near = i; ui.fold(false); bar.near(true); form.hidden = false;
      field.value = ''; fieldName.textContent = (phase === 'readSingle' ? '单表 F' : ['F₁', 'F₂'][i]) + ' / N';
      const m = meters[i], narrow = innerWidth <= 760;
      const center = group.worldToLocal(m.mesh.localToWorld(new THREE.Vector3(0, narrow ? -0.132 : m.mesh.hookEnd / 2, 0.005)));
      const dist = narrow ? 0.405 : (0.015 - m.mesh.hookEnd) * 1.94;
      ctx.look(center.toArray(), [-0.25 * m.dir.x, 1, -0.25 * m.dir.z], dist, leave);
      guide();
    }
    function recordGauge() {
      if (typeof near !== 'number') return;
      const m = meters[near], value = Number(field.value);
      if (!field.value.trim() || !Number.isFinite(value) || value < 0 || value > FM.MAX)
        return say('这只表的量程是 0 到 5 N，请在量程内读数。');
      if (Math.abs(value * 5 - Math.round(value * 5)) > 1e-6)
        return say('每小格是 0.2 N，请记下红针最接近的那一格。');
      if (Math.abs(m.force - value) > 0.100001)
        return say((value > m.force ? '读大了。' : '读小了。') + '从标整数的长刻线向红针数，每小格是 0.2 N。');
      const i = near, row = rows.rows[rounds.length].slice();
      const last = phase === 'readSingle';
      row[last ? 4 : 2 + i] = value.toFixed(1);
      rows.set(rounds.length, row);
      if (last) {
        single = { value, dir: { ...m.dir } };
        phase = 'side'; if (!rounds.length) bar.done('single');
      } else {
        mark.values[i] = value;
        if (mark.values.every(n => n !== null)) { phase = 'park'; if (!rounds.length) bar.done('pair'); }
      }
      leave();
      if (phase === 'readPair') guide('已按读数画出' + ['蓝', '棕'][i] + '箭头。');
    }
    function openSheet() {
      if (phase === 'result' && rounds.length === 1) { startRound(); return; }
      near = 'paper'; bar.near(true); drawPaper();
      if (phase === 'measure') showLengthField();
      const narrow = innerWidth <= 760;
      ctx.look([narrow ? -0.253 : -0.263, paperY, narrow ? 0.187 : 0.151], [0, 1, 0.016], narrow ? 0.52 : 0.49, leave);
      guide();
    }
    function finishLine() {
      if (!pencil) return;
      const snapped = atVertex(pencil);
      pencil = null;
      if (!snapped) {
        drawPaper();
        return say(phase === 'side' ? '这条边和棕箭头还不相等或不平行。看着格线，从蓝箭头尖再画一次。'
          : '这条线没有连到两条虚线的交点。从 O 再画一次。', pen);
      }
      if (phase === 'side') phase = 'diagonal';
      else {
        phase = 'measure';
        showLengthField();
      }
      drawPaper(); guide();
    }
    function showLengthField() {
      ui.fold(false); form.hidden = false; field.value = '';
      fieldName.textContent = '对角线长度 / 大格';
    }
    function recordLength() {
      if (near !== 'paper') return;
      const end = vertex(), grids = Number(field.value);
      if (!(grids > 0) || Math.abs(grids - distance(origin, end) / gridSize()) > 0.11 ||
          Math.abs(grids * 10 - Math.round(grids * 10)) > 1e-6)
        return say('从 O 旁的 0 刻线数到对角线末端，读到 0.1 大格。');
      const force = grids / 2;
      const direction = unit(end.x - origin.x, end.z - origin.z);
      const angle = included([direction, single.dir]);
      mark.close = angle <= 6 && Math.abs(force - single.value) <= 0.25;
      mark.comparison = mark.close ? '对角线和单表箭头近乎重合。'
        : '两支箭头的方向相差约 ' + Math.round(angle) + '°，长度偏差对应约 ' + Math.abs(force - single.value).toFixed(1) + ' N。';
      calculation.textContent = '按图换算：' + grids + ' 大格 ÷ 2 大格 × 1 N = ' + force + ' N。';
      const row = rows.rows[rounds.length].slice();
      row[5] = '≈' + force;
      rows.set(rounds.length, row); rounds.push(mark);
      form.hidden = true; phase = 'result'; bar.done(rounds.length === 1 ? 'draw' : 'repeat');
      drawPaper(); guide();
    }
    function restoreHandle(dt) {
      if (!returning) return;
      returning.t = Math.min(1, returning.t + dt / 0.4);
      const { m, from, to, t, dir, angle } = returning, f = 1 - (1 - t) ** 2;
      m.handle = { x: from.x + (to.x - from.x) * f, z: from.z + (to.z - from.z) * f };
      if (lifted) m.dir = { x: Math.cos(angle + (dir - angle) * f), z: Math.sin(angle + (dir - angle) * f) };
      if (t === 1) { lifted = false; returning = null; }
      updateRig();
    }
    function reject(m, message) {
      returning = { m, t: 0, from: { ...m.handle }, to: start.handle,
        angle: Math.atan2(m.dir.z, m.dir.x), dir: Math.atan2(start.dir.z, start.dir.x) };
      say(message, m.grip);
    }
    // 表身绕环心转动。用抓住的那个点反求提环的位置，转向时手指仍贴在原处。
    let contact = null;
    function pull(m, i, p) {
      const raw = start.contact;
      const dx = raw.x - start.handle.x, dz = raw.z - start.handle.z;
      const along = dx * start.dir.x + dz * start.dir.z;
      const across = -dx * start.dir.z + dz * start.dir.x;
      const x = p.x + dx, z = p.z + dz;
      const active = activeMeters();
      for (let j = 0; j < 8; j++) {
        const last = m.handle;
        m.handle = { x: clamp(x - along * m.dir.x + across * m.dir.z, -0.04, 0.411),
          z: clamp(z - along * m.dir.z - across * m.dir.x, i === 1 ? 0.035 : -0.239,
            phase === 'pair' && i === 0 ? -0.035 : phase === 'single' ? 0.187 : 0.244) };
        if (phase === 'release' || phase === 'single') {
          // 细绳可以弯下，表的硬挂钩不能推过圆环。
          const minReach = meterRest - CORD_LENGTH * 0.65;
          const dz = m.handle.z - E.z;
          m.handle.x = Math.max(m.handle.x, E.x + Math.sqrt(Math.max(0, minReach ** 2 - dz ** 2)));
        }
        if (lifted) {
          const f = clamp(distance(start.handle, m.handle) / Math.max(0.006, distance(start.handle, dock)), 0, 1);
          const a = Math.atan2(start.dir.z, start.dir.x) * (1 - f);
          m.dir = { x: Math.cos(a), z: Math.sin(a) };
        } else {
          const center = equilibrium(active).point;
          m.dir = unit(m.handle.x - center.x, m.handle.z - center.z);
        }
        if (distance(last, m.handle) < 0.00005) break;
      }
      updateRig();
    }
    const canRead = i => (phase === 'readPair' && mark.values[i] === null) || (phase === 'readSingle' && i === 0);
    const drags = meters.map((m, i) => {
      const enabled = () => near === null && !returning && (phase === 'pair' || canRead(i) ||
        (phase === 'park' && i === 1) || ((phase === 'release' || phase === 'single') && i === 0));
      return {
        obj: m.grip, anchor: m.mesh, plane: 'xz', offset: Y, keepOffset: true, enabled,
        hint: () => !enabled() || ui?.step !== 1 ? '' : canRead(i) ? '点一下：读测力计' : phase === 'park' ? '拖动：放下②表' : phase === 'release' ? '向环推：放松①表' : phase === 'single' ? '拖动：拉环回 O' : '向外拖：拉紧细绳',
        onStart() { enter(); start = { handle: { ...m.handle }, dir: { ...m.dir }, contact: contact || { ...m.handle } }; },
        onTap() { if (canRead(i)) openGauge(i); },
        onDrag(p) {
          if (canRead(i)) return;
          lifted = phase === 'park';
          pull(m, i, p);
          if (phase === 'single') {
            const atO = distance(point, mark.o) <= tol;
            hoop.material.color.set(atO ? 0x278063 : 0x4f6375);
            if (atO) say('环心已对准 O，松手保留这个位置。', pick);
            else guide();
          }
        },
        onEnd(moved) {
          if (!moved || canRead(i) || !start) return;
          if (phase === 'park') {
            if (distance(m.handle, dock) > 0.016) return reject(m, '②表还没放进虚线框，细绳重新接上了。把表平放到框内。');
            lifted = false; m.handle = { ...dock }; m.dir = { x: 1, z: 0 };
            phase = 'release'; updateRig(); drawPaper(); guide('②表已回零。');
          } else if (phase === 'release') {
            if (m.force > 1e-6 || distance(point, m.handle) > meterRest - 0.003)
              return reject(m, '细绳还没松弛。把①表再向 E 移近些。');
            phase = 'single'; guide('两个拉力都已撤去。');
          } else if (phase === 'single') {
            if (distance(point, mark.o) > tol) {
              const lengthOK = Math.abs(distance(point, FIXED) - distance(mark.o, FIXED)) <= tol;
              return reject(m, lengthOK ? '橡皮条的长度接近了，方向还差一点。横向调整，让环心对准 O。'
                : '环心还没回到 O，两次拉的效果不同。沿 GO 的方向调整拉力再试。');
            }
            phase = 'readSingle'; guide();
          } else guide();
        },
      };
    });
    const penEnabled = () => near === 'paper' && drawingPhase();
    drags.push({
      obj: pen, plane: 'xz', offset: paperY, enabled: penEnabled,
      hint: () => penEnabled() && ui?.step === 1 ? phase === 'side' ? '拖动：补平行边' : '拖动：画对角线' : '',
      onDrag(p) {
        pencil = { x: clamp(p.x, -0.405, -0.12), z: clamp(p.z, 0.05, 0.25) };
        drawPaper();
      },
      onEnd(moved) { if (moved) finishLine(); },
    });
    const ringEnabled = () => phase === 'pair' && near === null && !returning;
    const sheetEnabled = () => near === null && (drawingPhase() || phase === 'measure' || phase === 'result');
    const desk = draggable(group, drags, {
      tip, taps: [
        { obj: pick, enabled: ringEnabled, hint: () => ringEnabled() && ui?.step === 1 ? '点一下：标记环心' : '', onTap: noteRing },
        { obj: sheet, enabled: sheetEnabled, hint: () => !sheetEnabled() || ui?.step !== 1 ? '' : phase === 'result' && rounds.length === 1 ? '点一下：换记录纸' : '点一下：凑近看图', onTap: openSheet },
      ],
    });
    const pointer = { ...desk, items: () => desk.items().filter(item => item.enabled()),
      down(ray, event) {
        contact = rayToLocal(ray, group, 'xz', Y);
        const handled = desk.down(ray, event);
        contact = null;
        return handled;
      },
    };
    const hideTip = () => tip.loc(group, 0, -9, 0).text('');
    const canvas = document.getElementById('c');
    canvas.addEventListener('pointerleave', hideTip);
    function startRound() {
      phase = 'pair'; near = mark = single = pencil = returning = start = null;
      calculation.textContent = ''; lifted = false; scale = 0.04; point = { ...E }; form.hidden = true;
      hoop.material.color.set(0x4f6375);
      initialHandles(); updateRig(); drawPaper(); hideTip();
      guide(rounds.length ? '换个夹角。' : '');
    }
    function reset() {
      rounds.length = 0; rows.clear();
      bar.undo(...steps.map(s => s[0])); bar.near(false); ctx.back();
      ui?.relock(); startRound(); ctx.reframe();
    }
    startRound();
    const submitReading = (name, value) => ({ name, run() {
      if (typeof near !== 'number') throw Error('未进入读数视图');
      field.value = String(value === undefined ? Math.round(meters[near].force * 5) / 5 : value);
      form.querySelector('button').click();
    } });
    const toO = () => {
      const d = unit(mark.o.x - FIXED.x, mark.o.z - FIXED.z);
      const net = (distance(mark.o, FIXED) - RUBBER_LENGTH) * RUBBER_K;
      return vec(shift(mark.o, d, meterRest + FM.PER_N * net));
    };
    const roundQA = (n, a, b) => [
      { name: '拉第一只表', drag: meters[0].grip, to: vec(a) },
      { name: '拉第二只表', drag: meters[1].grip, to: vec(b) },
      { name: '标 O 和方向', tap: pick },
      { name: '近看第一只表', tap: meters[0].grip },
      ...(n === 1 ? [submitReading('误读第一只表', 4.8)] : []),
      submitReading('记录第一个分力'),
      { name: '近看第二只表', tap: meters[1].grip }, submitReading('记录第二个分力'),
      ...(n === 1 ? [{ name: '放在框外', drag: meters[1].grip, to: vec({ x: 0.23, z: 0.145 }) }] : []),
      { name: '撤去第二只表', drag: meters[1].grip, to: vec(dock) },
      ...(n === 1 ? [{ name: '带着旧拉力直接拉回 O', drag: meters[0].grip, to: toO },
        { name: '核对旧拉力尚未撤去', run() { if (phase !== 'release') throw Error('未放松就进入单表测量'); } }] : []),
      { name: '放松第一只表', drag: meters[0].grip, to: vec(shift(E, unit(1, -0.52), meterRest - 0.021)) },
      { name: '核对撤力和原标记', run() {
        if (phase !== 'single' || distance(point, E) > tol || meters.some(m => m.force > 1e-6) ||
            distance(point, meters[0].handle) > meterRest - 0.003 || !mark.values.every(v => v > 0))
          throw Error('两表未回零、细绳未松弛或记录丢失');
      } },
      ...(n === 1 ? [{ name: '环心偏离 O 就松手', drag: meters[0].grip, to: vec({ x: 0.235, z: -0.045 }) }] : []),
      { name: '单表拉回 O', drag: meters[0].grip, to: toO },
      { name: '近看单表', tap: meters[0].grip }, submitReading('记录等效的力'),
      { name: '近看三个力', tap: sheet },
      ...(n === 1 ? [{ name: '平行边画短了', drag: pen, to: () => vec(forceTip(0), paperY).lerp(vec(vertex(), paperY), 0.45) }] : []),
      { name: '补平行边', drag: pen, to: () => vec(vertex(), paperY) },
      { name: '作对角线', drag: pen, to: () => vec(shift(vertex(), { x: 0, z: 1 }, 0.004), paperY) },
      ...(n === 1 ? [{ name: '核对量图误读可重试', run() {
        if (phase !== 'measure') throw Error('对角线未吸附到交点');
        field.value = '0.2'; form.requestSubmit();
        if (form.hidden || rows.rows[0][5] !== '—') throw Error('误读已写入记录');
        leave();
      } }, { name: '回到力图量取长度', tap: sheet }] : []),
      { name: '按图读对角线长度', run() {
        if (phase !== 'measure' || form.hidden || rows.rows[n - 1][5] !== '—') throw Error('量图前就填入结果');
        const grids = Math.floor(distance(origin, vertex()) / gridSize() * 10) / 10;
        field.value = String(grids); form.requestSubmit();
        if (rows.rows[n - 1][5] !== '≈' + grids / 2) throw Error('记录没有使用本轮量图读数');
      } },
      { name: '核对本组图和记录', run() {
        if (phase !== 'result' || rounds.length !== n || rows.rows[n - 1].includes('—')) throw Error('本组尚未测完');
        const row = rows.rows[n - 1];
        if (Math.abs(+row[4] - Number(row[5].slice(1))) > 0.3) throw Error('单表与作图相差超过读数精度');
        leave();
      } },
    ];
    return {
      group: new THREE.Group().add(group), pointer, reset, card: false,
      size: { w: W, d: D, h: 0.045 },
      view: { elev: 63, azim: 0, frameMargin: 1.05 }, toggles: ['steps'],
      mount(panel) {
        ui = panel;
        const source = ui.el.querySelector('.answer .src');
        source.style.paddingRight = '84px';
        source.style.minHeight = '58px';
        bar.attach({ need: () => ui.need(''), unlock: () => { ui.unlock(); ui.need(''); } });
        ui.status('G 是固定端，E 是橡皮条自然伸直时的环心位置。');
        ui.controls.append(form, headerPaper);
        ui.data.append(rows.el, calculation, buttons([{ text: '全部重来', ghost: true, onClick: reset }]).el);
        guide();
      },
      update(dt) { bar.update(dt); restoreHandle(dt); tip.show(ui?.step === 1); },
      dispose() {
        headerPaper.remove();
        canvas.removeEventListener('pointerleave', hideTip);
        pointer.dispose(); bar.dispose(); paperTex.dispose();
      },
      debug: { bar, qa: qaFlow(pointer, [
        { name: '绳未拉紧就标记', tap: pick },
        ...roundQA(1, { x: 0.245, z: -0.199 }, { x: 0.206, z: 0.19 }),
        { name: '换纸检验', tap: sheet },
        ...roundQA(2, { x: 0.272, z: -0.098 }, { x: 0.238, z: 0.1 }),
        { name: '掀开课本原文', run() {
          if (!bar.finished || Math.abs(rounds[0].angle - rounds[1].angle) < 12) throw Error('未完成两种夹角的比较');
          ui.go(2); ui.el.querySelector('.flap-front').click();
        } },
      ]) },
    };
  },
};
