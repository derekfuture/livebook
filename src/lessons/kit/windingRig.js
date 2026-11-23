import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { block } from './electronicsBench.js';
import { rulerMesh } from './props.js';
import { alongWire, WIRE_MM } from './wireWinding.js';

export const RADIUS = 0.007,
  AXIS = 0.019,
  START = -0.018,
  SPAN = 0.1,
  RULE_W = 0.014;
const wireRadius = WIRE_MM / 2000,
  coilRadius = RADIUS + wireRadius;
export const CLIP = [START, AXIS + coilRadius, 0];

function axle(parent, radius, length, x, y, z, color) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 48), paint(color));
  mesh.rotation.z = Math.PI / 2;
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}
function tube(points, radius, segments) {
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, radius, 8);
  // 沿单根圆丝的弧面排明暗，紧靠的两圈仍各有可辨认的边缘。
  const normals = geo.attributes.normal;
  const colors = new Float32Array(normals.count * 3);
  const dark = new THREE.Color(0x48515a),
    bright = new THREE.Color(0xbfc7c9),
    tint = new THREE.Color();
  for (let i = 0; i < normals.count; i++) {
    tint
      .copy(dark)
      .lerp(bright, 1 - Math.abs(normals.getX(i)) ** 1.6)
      .toArray(colors, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

export function windingRig() {
  const group = new THREE.Group();
  const rotor = new THREE.Group();
  rotor.position.y = AXIS;
  group.add(rotor);
  const wood = 0xb69463;
  axle(rotor, RADIUS, 0.09, 0, 0, 0, wood);
  const knob = axle(rotor, 0.01, 0.012, 0.056, 0, 0, 0x90704f);
  block(rotor, 0.011, 0.0005, 0.0016, 0.056, 0.01, 0, 0xf1d9a4);
  block(rotor, 0.0022, 0.0005, 0.002, START, RADIUS, 0, 0x514a40);
  for (const x of [-0.045, 0.045]) {
    block(group, 0.008, 0.003, 0.022, x, 0.0015, 0, wood);
    block(group, 0.005, AXIS, 0.008, x, AXIS / 2, 0, wood);
    axle(group, 0.003, 0.012, x, AXIS, 0, 0x7b7e79);
  }
  const scale = rulerMesh({
    length: (SPAN * 4096) / 4080,
    width: RULE_W,
    thick: 0.0018,
    divisions: 100,
    every: 10,
    labelEvery: 10,
  });
  group.add(scale);
  const guide = new THREE.Group();
  group.add(guide);
  block(guide, 0.006, 0.003, 0.008, 0, -0.003, 0, 0x94734b);
  block(group, 0.068, 0.003, 0.006, 0, 0.0015, -0.016, 0xb39870);
  block(guide, 0.0035, AXIS + coilRadius - 0.006, 0.0035, 0, -(AXIS + coilRadius) / 2, 0, 0x90918a);
  const eye = new THREE.Mesh(new THREE.TorusGeometry(0.0015, 0.00035, 10, 26), paint(0x626e6c));
  guide.add(eye);
  const end = new THREE.Mesh(new THREE.SphereGeometry(0.0014, 20, 12), paint(0x9e7450));
  const pick = new THREE.Mesh(new THREE.SphereGeometry(0.004, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
  pick.userData.pick = true;
  end.add(pick);
  group.add(end);
  const coil = new THREE.Mesh(new THREE.BufferGeometry(), paint(0xffffff, { vertexColors: true, keep: true }));
  const tail = new THREE.Mesh(new THREE.BufferGeometry(), coil.material);
  group.add(coil, tail);
  const reel = new THREE.Group();
  group.add(reel);
  reel.position.set(-0.047, 0.01, -0.034);
  axle(reel, 0.0045, 0.018, 0, 0, 0, 0x747a79);
  for (const x of [-0.01, 0.01]) {
    axle(reel, 0.008, 0.002, x, 0, 0, wood);
    block(group, 0.003, 0.01, 0.005, reel.position.x + x * 1.24, 0.005, reel.position.z, 0x957f63);
  }
  // 供丝卷有四层，每层反向排线。卷到圆柱上的丝长从外层依次扣除，退丝则倒卷。
  const spoolTurns = 20,
    segments = 400;
  const layers = Array.from({ length: 4 }, (_, i) => {
    const r = 0.0045 + (2 * i + 1) * wireRadius;
    const xAt = (n) => ((i % 2 ? 1 : -1) * (spoolTurns / 2 - n) * WIRE_MM) / 1000;
    const points = Array.from({ length: segments + 1 }, (_, k) => {
      const n = (k / segments) * spoolTurns,
        a = n * 2 * Math.PI;
      return new THREE.Vector3(xAt(n), r * Math.cos(a), r * Math.sin(a));
    });
    const mesh = new THREE.Mesh(tube(points, wireRadius, segments), coil.material);
    reel.add(mesh);
    return { mesh, r, xAt, length: spoolTurns * Math.hypot(2 * Math.PI * r, WIRE_MM / 1000) };
  });
  function unwindSpool(parts) {
    let removed = parts.reduce(
      (sum, p) => sum + (p.end - p.start) * Math.hypot(2 * Math.PI * coilRadius, p.pitch / 1000),
      0,
    );
    let outlet;
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      const left = Math.max(0, 1 - removed / layer.length);
      removed = Math.max(0, removed - layer.length);
      layer.mesh.geometry.setDrawRange(0, Math.round(segments * left) * 8 * 6);
      if (!outlet && left > 0) {
        const n = left * spoolTurns;
        reel.rotation.x = Math.PI / 3 - 2 * Math.PI * n;
        outlet = new THREE.Vector3(layer.xAt(n), layer.r * 0.5, layer.r * Math.sin(Math.PI / 3)).add(reel.position);
      }
    }
    return outlet;
  }
  function ink(mesh, points, segments) {
    mesh.geometry.dispose();
    mesh.geometry = tube(points, wireRadius, segments);
  }
  function render(parts, attached, gap, free) {
    const turns = parts.at(-1)?.end || 0;
    rotor.rotation.x = 2 * Math.PI * turns;
    const x = START + alongWire(parts, turns) / 1000;
    guide.position.set(x + gap / 1000, AXIS + coilRadius, -0.016);
    coil.visible = turns > 0.0001;
    if (coil.visible) {
      const steps = Math.max(4, Math.ceil(turns * 32)),
        points = [];
      for (let i = 0; i <= steps; i++) {
        const t = (turns * i) / steps,
          a = (turns - t) * Math.PI * 2;
        points.push(
          new THREE.Vector3(
            START + alongWire(parts, t) / 1000,
            AXIS + coilRadius * Math.cos(a),
            coilRadius * Math.sin(a),
          ),
        );
      }
      ink(coil, points, steps);
    }
    end.position.copy(free);
    end.visible = !attached;
    const root = attached ? new THREE.Vector3(x, AXIS + coilRadius, 0) : end.position;
    const pin = guide.position;
    ink(
      tail,
      [
        root.clone(),
        new THREE.Vector3((root.x + pin.x) / 2, (root.y + pin.y) / 2, (root.z + pin.z) / 2),
        pin.clone(),
        new THREE.Vector3(pin.x - 0.008, pin.y - 0.002, -0.027),
        unwindSpool(parts),
      ],
      32,
    );
  }
  return { group, knob, rotor, scale, guide, end, render };
}
