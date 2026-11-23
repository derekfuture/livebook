import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { block } from './electronicsBench.js';
import { textPlate } from './props.js';
export const PIVOT_Y = 0.46,
  BOB_SPACING = 0.055;
export const pivotX = (i) => (i - 3) * BOB_SPACING;
export function coupledPendulumsRig(model) {
  const group = new THREE.Group(),
    textures = [],
    bobs = [],
    strings = [],
    supports = [];
  const cylinder = (parent, radius, length, x, y, z, color) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 24), paint(color));
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  block(group, 0.53, 0.012, 0.18, 0, 0.006, 0, 0x647d7e);
  for (const x of [-0.23, 0.23]) cylinder(group, 0.004, 0.49, x, 0.257, 0, 0x909b9b);
  block(group, 0.47, 0.012, 0.026, 0, 0.502, 0, 0x829192);
  const beam = block(group, 0.41, 0.012, 0.018, 0, PIVOT_Y + 0.006, 0, 0x8f9996);
  // Short elastic steel supports connect the moving beam to the fixed frame.
  // Their deflection follows the computed beam displacement, without visual amplification.
  for (const x of [-0.195, 0.195]) {
    for (let j = 0; j < 8; j++) {
      const blade = block(group, 0.014, 1, 0.001, x, 0.48, 0, 0xa4a99e);
      supports.push({ blade, x, j });
    }
    block(group, 0.018, 0.008, 0.024, x, 0.496, 0, 0x627d7e);
  }
  model.pendulums.forEach((p, i) => {
    const bob = new THREE.Group();
    group.add(bob);
    bobs.push(bob);
    const radius = 0.007 * Math.cbrt(p.mass / 0.005);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(radius, 28, 18), paint(0xa8aa9c));
    bob.add(ball);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0025, 0.00065, 6, 20), paint(0x657777));
    ring.position.y = radius + 0.0015;
    bob.add(ring);
    const string = cylinder(group, 0.00055, 1, 0, 0, 0, 0x5c6662);
    strings.push(string);
    const label = textPlate(p.name, { w: 0.02, h: 0.018, bg: '#e9e0cb', font: 'bold 330px sans-serif' });
    label.position.set(0, -radius - 0.013, 0.002);
    bob.add(label);
    textures.push(label.material.map);
    const back = label.clone();
    back.rotation.y = Math.PI;
    back.position.z = 0.0015;
    bob.add(back);
    // Thin tag is tied to the same bob, so no separate hovering instruction bubble.
    const tie = cylinder(bob, 0.0003, 0.012, 0, -radius - 0.006, 0.002, 0x686b60);
    const bolt = cylinder(beam, 0.0015, 0.005, pivotX(i), -0.008, 0, 0x6c7a78);
  });
  function animate() {
    const s = model.observe();
    beam.position.z = s.x;
    supports.forEach(({ blade, x, j }) => {
      const t0 = j / 8,
        t1 = (j + 1) / 8,
        curve = (t) => t * t * (3 - 2 * t);
      const a = new THREE.Vector3(x, 0.496 - 0.03 * t0, s.x * curve(t0)),
        b = new THREE.Vector3(x, 0.496 - 0.03 * t1, s.x * curve(t1));
      blade.position.copy(a).add(b).multiplyScalar(0.5);
      blade.scale.y = a.distanceTo(b);
      blade.rotation.x = -Math.atan2(b.z - a.z, a.y - b.y);
    });
    s.bobs.forEach((b, i) => {
      bobs[i].position.set(pivotX(i), PIVOT_Y + b.vertical, b.horizontal);
      bobs[i].rotation.x = -b.angle;
      const radius = 0.007 * Math.cbrt(model.pendulums[i].mass / 0.005);
      const top = new THREE.Vector3(pivotX(i), PIVOT_Y, s.x);
      const end = bobs[i].position
        .clone()
        .add(new THREE.Vector3(0, Math.cos(b.angle), -Math.sin(b.angle)).multiplyScalar(radius + 0.004));
      strings[i].position.copy(top).add(end).multiplyScalar(0.5);
      const dir = top.clone().sub(end);
      strings[i].scale.y = dir.length();
      strings[i].quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    });
  }
  animate();
  return {
    group,
    beam,
    bobs,
    strings,
    animate,
    dispose() {
      textures.forEach((t) => t.dispose());
    },
  };
}
