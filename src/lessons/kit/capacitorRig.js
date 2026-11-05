// 图 10.4-1 固定接线。双掷开关只有刀片落在触点上才导通。
import * as THREE from 'three';
import { paint, inked } from '../../live/ink.js';
import { canvasTex } from './props.js';
import { battery, resistorPart } from './circuit.js';

const THROW = 0.6,
  ARM = 0.047;
export function capacitorRig() {
  const group = new THREE.Group(),
    textures = [];
  function block(parent, w, h, d, x, y, z, color) {
    const obj = inked(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint(color)), { width: 0.8 });
    obj.position.set(x, y, z);
    parent.add(obj);
    return obj;
  }
  function peg(parent, x, y, z, color) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.0045, 0.009, 18), paint(color));
    p.position.set(x, y, z);
    parent.add(p);
    return p;
  }
  function plate(parent, w, d, x, y, z, tex) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: tex }));
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(x, y, z);
    parent.add(plane);
    textures.push(tex);
    return plane;
  }
  function caption(parent, text, x, y, z, w) {
    return plate(
      parent,
      w,
      0.008,
      x,
      y,
      z,
      canvasTex(512, 128, (c, W, H) => {
        c.fillStyle = '#e4dec7';
        c.fillRect(0, 0, W, H);
        c.fillStyle = '#273c3d';
        c.font = 'bold 86px sans-serif';
        c.textBaseline = 'middle';
        c.textAlign = 'center';
        c.fillText(text, W / 2, H / 2);
      }),
    );
  }
  function wire(a, b, color, via = []) {
    const points = [a, ...via, b].map((p) => new THREE.Vector3(...p));
    if (points.length === 2) {
      const middle = points[0].clone().lerp(points[1], 0.5);
      middle.y += 0.008;
      points.splice(1, 0, middle);
    }
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.0014, 7, false), paint(color));
    group.add(tube);
  }
  const source = battery('E', { cells: 4, emf: 1.5 });
  source.group.position.set(-0.157, 0, 0);
  group.add(source.group);
  const sw = new THREE.Group();
  sw.position.set(-0.065, 0, -0.067);
  group.add(sw);
  block(sw, 0.081, 0.007, 0.071, 0, 0.0035, -0.004, 0xcfc6af);
  const pivotZ = 0.02,
    hinge = peg(sw, 0, 0.012, pivotZ, 0x7b7560);
  const throws = [1, 2].map((id) => {
    const q = id === 1 ? -THROW : THROW,
      x = ARM * Math.sin(q),
      z = pivotZ - ARM * Math.cos(q);
    const p = peg(sw, x, 0.012, z, 0x8c7855);
    caption(sw, String(id), x, 0.0073, z + 0.012, 0.01);
    return p;
  });
  const blade = new THREE.Group();
  blade.position.set(0, 0.018, pivotZ);
  sw.add(blade);
  block(blade, 0.006, 0.0028, ARM, 0, 0, -ARM / 2, 0xa5a3a0);
  const handle = peg(blade, 0, 0.006, -ARM + 0.005, 0x393f44);
  const resistor = resistorPart('R', { R: 1000 });
  resistor.group.position.set(-0.012, 0, 0.093);
  group.add(resistor.group);
  const cap = new THREE.Group();
  cap.position.set(0.116, 0, 0.035);
  group.add(cap);
  block(cap, 0.062, 0.006, 0.043, 0, 0.003, 0, 0xe6dfcf);
  const positive = peg(cap, -0.022, 0.011, -0.002, 0xac4837),
    negative = peg(cap, 0.022, 0.011, -0.002, 0x374149);
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.035, 32), paint(0x416a68));
  can.position.set(0, 0.025, 0);
  cap.add(can);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.0105, 0.0008, 32), paint(0xabb6ad));
  lid.position.set(0, 0.043, 0);
  cap.add(lid);
  for (const sign of [-1, 1]) {
    const lead = new THREE.Mesh(new THREE.CylinderGeometry(0.001, 0.001, 0.019, 12), paint(0x909b98));
    lead.rotation.z = Math.PI / 2;
    lead.position.set(sign * 0.014, 0.01, -0.002);
    cap.add(lead);
  }
  caption(cap, '+  2200 μF  −', 0, 0.0063, 0.015, 0.056);
  const meter = new THREE.Group();
  meter.position.set(0.056, 0, -0.072);
  group.add(meter);
  block(meter, 0.083, 0.017, 0.065, 0, 0.0085, 0, 0x52625e);
  const center = [512, 596],
    angleFor = (i) => (i / 6) * 0.76;
  const tex = canvasTex(1024, 740, (c, W, H) => {
    c.fillStyle = '#f2edda';
    c.fillRect(0, 0, W, H);
    for (let i = -6; i <= 6; i += 0.5) {
      const q = angleFor(i),
        major = Number.isInteger(i);
      const pt = (r) => [center[0] + r * Math.sin(q), center[1] - r * Math.cos(q)];
      c.strokeStyle = '#344649';
      c.lineWidth = 2.4;
      c.beginPath();
      c.moveTo(...pt(480));
      c.lineTo(...pt(major ? 502 : 492));
      c.stroke();
      if (i % 2 === 0) {
        c.fillStyle = '#263e40';
        c.font = 'bold 36px sans-serif';
        c.textAlign = 'center';
        c.fillText(String(i), ...pt(523));
      }
    }
    c.font = 'bold 54px sans-serif';
    c.fillText('mA', W / 2, H * 0.63);
  });
  const dialWidth = 0.075,
    dialHeight = (dialWidth * 740) / 1024;
  const dial = plate(meter, dialWidth, dialHeight, 0, 0.0172, -0.003, tex);
  const needle = new THREE.Group();
  needle.position.set(0, 0.0182, dial.position.z + (center[1] / 740 - 0.5) * dialHeight);
  meter.add(needle);
  const armLength = (480 / 1024) * dialWidth;
  block(needle, 0.00055, 0.00035, armLength, 0, 0, -armLength / 2, 0x303737);
  const mPos = peg(meter, -0.027, 0.012, 0.028, 0xa44538),
    mNeg = peg(meter, 0.027, 0.012, 0.028, 0x323b40);
  const digital = new THREE.Group();
  digital.position.set(0.156, 0, -0.07);
  group.add(digital);
  block(digital, 0.062, 0.015, 0.046, 0, 0.0075, 0, 0x67746f);
  const screenTex = canvasTex(512, 200, () => {});
  const screen = plate(digital, 0.054, 0.025, 0, 0.0153, -0.006, screenTex);
  const vPos = peg(digital, -0.02, 0.014, 0.017, 0xa44538),
    vNeg = peg(digital, 0.02, 0.014, 0.017, 0x323b40);
  group.updateMatrixWorld(true);
  const at = (obj) => group.worldToLocal(obj.getWorldPosition(new THREE.Vector3())).toArray();
  const terminal = (part, name) =>
    group.worldToLocal(part.group.localToWorld(new THREE.Vector3(...part.terminals[name]))).toArray();
  wire(terminal(source, '+'), at(throws[0]), 0xb44f37, [
    [-0.053, 0.014, -0.042],
    [-0.085, 0.016, -0.087],
  ]);
  wire(terminal(source, '-'), terminal(resistor, 'a'), 0x4c5758, [[-0.151, 0.006, 0.09]]);
  wire(at(throws[1]), terminal(resistor, 'a'), 0x536260, [
    [-0.012, 0.006, -0.111],
    [-0.025, 0.008, 0.04],
  ]);
  wire(at(hinge), at(mPos), 0x9d6443);
  wire(at(mNeg), at(positive), 0xa65a40);
  wire(at(negative), terminal(resistor, 'b'), 0x56615d);
  wire(at(positive), at(vPos), 0xbb5039);
  wire(at(negative), at(vNeg), 0x414b4b);
  let digits;
  return {
    group,
    sw,
    blade,
    handle,
    throws,
    dial,
    screen,
    setAngle(q) {
      blade.rotation.y = -q;
    },
    throwAngle: THROW,
    readDial(point) {
      const dy = needle.position.z - point.z,
        dx = point.x - needle.position.x,
        r = Math.hypot(dx, dy);
      if (Math.abs(r - armLength) > 0.003) return null;
      return Math.round((Math.atan2(dx, dy) / 0.76) * 12) / 2;
    },
    draw(voltage, current) {
      needle.rotation.y = -angleFor(current * 1000);
      const next = voltage.toFixed(2);
      if (next === digits) return;
      digits = next;
      const c = screenTex.canvas.getContext('2d');
      c.fillStyle = '#bdcbb1';
      c.fillRect(0, 0, 512, 200);
      c.fillStyle = '#293e36';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = 'bold 106px monospace';
      c.fillText(digits + ' V', 256, 100);
      screenTex.needsUpdate = true;
    },
    dispose() {
      textures.forEach((t) => t.dispose());
    },
  };
}
