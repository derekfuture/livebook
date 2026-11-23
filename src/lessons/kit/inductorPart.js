import * as THREE from 'three';
import { paint, inked } from '../../live/ink.js';
// 外观沿用通电自感的线圈；可见绕组作示意，电感由独立模型给定。
export function inductorPart(name, { resistance = 50 } = {}) {
  function block(parent, w, h, d, x, y, z, color) {
    const o = inked(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint(color)));
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }
  const coil = {
    name,
    kind: 'coil',
    group: new THREE.Group(),
    terminals: { a: [-0.067, 0.02, 0.013], b: [0.067, 0.02, 0.013] },
  };
  block(coil.group, 0.15, 0.008, 0.052, 0, 0.004, 0, 0xd3c8af);
  block(coil.group, 0.125, 0.022, 0.022, 0, 0.031, 0, 0x65706c);
  for (const x of [-0.048, 0.048]) block(coil.group, 0.008, 0.045, 0.044, x, 0.03, 0, 0x444f4d);
  const helix = [];
  for (let i = 0; i <= 960; i++) {
    const q = i / 960;
    helix.push(
      new THREE.Vector3(
        -0.044 + q * 0.088,
        0.031 + 0.018 * Math.cos(q * 48 * Math.PI),
        0.018 * Math.sin(q * 48 * Math.PI),
      ),
    );
  }
  coil.group.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), 960, resistance > 100 ? 0.0006 : 0.001, 5, false),
      paint(0xa56c47),
    ),
  );
  for (const side of [-1, 1]) {
    const points = [
      [side * 0.044, 0.049, 0],
      [side * 0.05, 0.058, 0.004],
      [side * 0.067, 0.022, 0.013],
    ].map((p) => new THREE.Vector3(...p));
    coil.group.add(
      new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 20, 0.001, 6, false), paint(0xa56c47)),
    );
  }
  for (const x of [-0.067, 0.067]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.014, 12), paint(0x8d8c7d));
    p.position.set(x, 0.015, 0.013);
    coil.group.add(p);
  }
  return coil;
}
