import * as THREE from 'three';
import { paint, inked } from '../../live/ink.js';
import { textPlate } from './props.js';
export function block(parent, w, h, d, x, y, z, c) {
  const obj = inked(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint(c)), { width: 0.65 });
  obj.position.set(x, y, z);
  parent.add(obj);
  return obj;
}
export function caption(parent, text, x, y, z, w = 0.034, h = 0.011) {
  const tag = textPlate(text, { w, h, bg: '#e4d9bd', color: '#383b3b' });
  tag.rotation.x = -Math.PI / 2;
  tag.position.set(x, y, z);
  parent.add(tag);
}
export function wireGeometry(points, r = 0.0012) {
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points.map((p) => (Array.isArray(p) ? new THREE.Vector3(...p) : p))),
    Math.max(22, points.length * 6),
    r,
    7,
    false,
  );
}
export function wire(parent, points, color, r) {
  const obj = new THREE.Mesh(wireGeometry(points, r), paint(color));
  parent.add(obj);
  obj.raycast = () => {};
  return obj;
}
