// 图 11.5-1 的练习表：同一根指针，外圈电阻刻度、内圈直流刻度。
import * as THREE from 'three';
import { paint, inked } from '../../live/ink.js';
import { canvasTex } from './props.js';
import { METER_STOPS, OHM_CENTER, meterBranch, meterFraction } from './multimeter.js';

const W = 1200,
  H = 1720,
  UNIT = 0.0001,
  TOP = 0.018;
const pivot = [600, 602],
  selectorAt = [600, 1225],
  ARC = 0.82,
  TURN = Math.PI * 2;
const OHM_RADIUS = 498,
  DC_RADIUS = 413;
const angleFor = (f) => (2 * f - 1) * ARC;
const coord = ([x, y]) => [(x - W / 2) * UNIT, TOP, (y - H / 2) * UNIT];
const selectorAngle = (i) => -Math.PI * 0.66 + (i * TURN) / METER_STOPS.length;
function artwork(g) {
  g.fillStyle = '#dacaa9';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#343f43';
  g.fillRect(26, 26, W - 52, 680);
  g.fillStyle = '#f7f3df';
  g.fillRect(42, 42, W - 84, 648);
  function text(str, x, y, size, color = '#253438') {
    g.fillStyle = color;
    g.font = size + 'px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(str, x, y);
  }
  function xy(f, r) {
    const a = angleFor(f);
    return [pivot[0] + r * Math.sin(a), pivot[1] - r * Math.cos(a)];
  }
  function mark(f, r, len, color) {
    const [x, y] = xy(f, r),
      [u, v] = xy(f, r + len);
    g.strokeStyle = color;
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(u, v);
    g.stroke();
  }
  function arc(r, color) {
    g.strokeStyle = color;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(...pivot, r, -Math.PI / 2 - ARC, -Math.PI / 2 + ARC);
    g.stroke();
  }
  arc(OHM_RADIUS, '#93513e');
  for (const r of [Infinity, 200, 100, 80, 60, 50, 40, 30, 25, 20, 16, 14, 12, 10, 8, 6, 5, 4, 3, 2, 1, 0]) {
    const f = OHM_CENTER / (OHM_CENTER + r),
      major = [Infinity, 100, 50, 30, 20, 10, 5, 2, 0].includes(r);
    mark(f, OHM_RADIUS, major ? 15 : 8, '#93513e');
    if (major) text(r === Infinity ? '∞' : String(r), ...xy(f, OHM_RADIUS + 34), 32, '#814737');
  }
  text('Ω', 1020, 220, 36, '#814737');
  arc(DC_RADIUS, '#273b3f');
  for (let i = 0; i <= 50; i++) {
    mark(i / 50, DC_RADIUS, i % 5 === 0 ? -16 : -8, '#273b3f');
    if (i % 5 === 0) text(String(i / 5), ...xy(i / 50, DC_RADIUS - 39), 32);
  }
  text('V · mA', 600, 398, 33);
  text('机械调零', 600, 804, 24);
  for (const [i, s] of METER_STOPS.entries()) {
    const a = selectorAngle(i);
    text(
      s.label,
      selectorAt[0] + 215 * Math.sin(a),
      selectorAt[1] - 215 * Math.cos(a),
      30,
      s.mode === 'ohm' ? '#814737' : '#253438',
    );
  }
  text('Ω 调零', 1000, 889, 28);
  text('−', 876, 1585, 40);
  text('+', 1080, 1585, 40);
}
export function multimeterTool() {
  const group = new THREE.Group();
  const body = inked(new THREE.Mesh(new THREE.BoxGeometry(W * UNIT, TOP, H * UNIT), paint(0x344446)), { width: 0.8 });
  body.position.y = TOP / 2;
  group.add(body);
  const tex = canvasTex(W, H, artwork);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(W * UNIT, H * UNIT), new THREE.MeshBasicMaterial({ map: tex }));
  face.rotation.x = -Math.PI / 2;
  face.position.y = TOP + 0.0001;
  group.add(face);
  function knob(at, radius, height, color) {
    const obj = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 48), paint(color));
    obj.position.set(...coord(at));
    obj.position.y += height / 2 + 0.0002;
    group.add(obj);
    return obj;
  }
  function stripe(parent, w, h, d, z, color) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(w, 0.0004, d), new THREE.MeshBasicMaterial({ color }));
    stripe.position.set(0, h, z);
    parent.add(stripe);
  }
  const selector = knob(selectorAt, 0.014, 0.006, 0x3a4448);
  stripe(selector, 0.0022, 0.003, 0.013, -0.006, 0xffddb0);
  const trim = knob([1000, 982], 0.006, 0.004, 0x79786d);
  stripe(trim, 0.001, 0.002, 0.009, 0, 0xf4e9d4);
  const zero = knob([600, 731], 0.0035, 0.0018, 0x8a8c85);
  stripe(zero, 0.0008, 0.0009, 0.005, 0, 0x404648);
  const pointer = new THREE.Group();
  pointer.position.set(...coord(pivot));
  pointer.position.y += 0.0015;
  group.add(pointer);
  const needle = new THREE.Mesh(
    new THREE.BoxGeometry(0.00055, 0.0003, 0.0503),
    new THREE.MeshBasicMaterial({ color: 0x293439 }),
  );
  needle.position.z = -0.0503 / 2;
  pointer.add(needle);
  const terminals = {};
  for (const [name, x, color] of [
    ['black', 876, 0x333a3d],
    ['red', 1080, 0xb4503b],
  ]) {
    const socket = knob([x, 1480], 0.0044, 0.004, color);
    terminals[name] = [socket.position.x, socket.position.y + 0.002, socket.position.z];
  }
  const tool = {
    name: 'M',
    group,
    terminals,
    kind: 'multimeter',
    selector,
    face,
    trim,
    zero,
    stop: 0,
    trimOffset: 0,
    mechanical: 0.032,
    fraction: 0,
    display: 0,
    branches() {
      return [{ a: 'red', b: 'black', ...meterBranch(METER_STOPS[this.stop], this.trimOffset) }];
    },
    read([branch]) {
      this.fraction = meterFraction(METER_STOPS[this.stop], branch);
    },
    setStop(i) {
      this.stop = i;
      selector.rotation.y = -selectorAngle(i);
      this.circuit?.solve();
    },
    update(dt) {
      const target = Math.max(-0.04, Math.min(1.04, this.fraction + this.mechanical));
      this.display += (target - this.display) * Math.min(1, dt * 9);
      pointer.rotation.y = -angleFor(this.display);
    },
    // 根据表面上的真实触点反求所指刻线和量程档。两条刻度弧不共用拾取区域。
    pickScale(point) {
      const dx = point.x / UNIT + W / 2 - pivot[0],
        up = pivot[1] - (point.z / UNIT + H / 2);
      const a = Math.atan2(dx, up),
        r = Math.hypot(dx, up);
      if (Math.abs(a) > ARC + 0.025) return null;
      const scale = Math.abs(r - OHM_RADIUS) <= 24 ? 'ohm' : Math.abs(r - DC_RADIUS) <= 24 ? 'dc' : null;
      return scale ? { scale, fraction: Math.max(0, Math.min(1, (a / ARC + 1) / 2)) } : null;
    },
    pickStop(point) {
      const [x, , z] = coord(selectorAt),
        a = Math.atan2(point.x - x, z - point.z);
      return (
        (Math.round(((a - selectorAngle(0)) / TURN) * METER_STOPS.length) + METER_STOPS.length) % METER_STOPS.length
      );
    },
    dispose() {
      tex.dispose();
    },
  };
  tool.setStop(0);
  tool.update(1);
  return tool;
}
