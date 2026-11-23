import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { block } from './electronicsBench.js';
export const ROPE_SCALE = 0.18,
  ROPE_Y = 0.22,
  ROPE_LEFT = -0.36,
  MARKER_INDEX = 40;
export function ropeWaveRig(
  model,
  { twoHands = false, markerIndex = MARKER_INDEX, reference = true, scale = ROPE_SCALE } = {},
) {
  const group = new THREE.Group();
  const cylinder = (parent, r, h, x, y, z, c) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), paint(c));
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  for (const x of [ROPE_LEFT, ROPE_LEFT + model.length * scale]) {
    block(group, 0.085, 0.012, 0.1, x, 0.006, 0, 0x607a7c);
    cylinder(group, 0.003, 0.3, x, 0.162, -0.025, 0x939d9b);
  }
  // Sliding grip stays at the chosen height; the student must bring it back to the middle mark.
  const handle = new THREE.Group();
  group.add(handle);
  block(handle, 0.025, 0.018, 0.025, 0, 0, -0.025, 0x708c8b);
  cylinder(handle, 0.002, 0.025, 0, 0, -0.0125, 0x8b9591).rotation.x = Math.PI / 2;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.003, 8, 32), paint(0x9a774d));
  ring.position.x = -0.024;
  handle.add(ring);
  const pick = new THREE.Mesh(
    new THREE.BoxGeometry(0.065, 0.045, 0.04),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  pick.position.x = -0.02;
  pick.userData.pick = true;
  handle.add(pick);
  block(group, 0.018, 0.002, 0.008, ROPE_LEFT - 0.012, ROPE_Y, -0.025, 0xa65642);
  const rightHandle = twoHands ? handle.clone() : null;
  if (rightHandle) {
    rightHandle.scale.x = -1;
    group.add(rightHandle);
    block(group, 0.018, 0.002, 0.008, ROPE_LEFT + model.length * scale + 0.012, ROPE_Y, -0.025, 0xa65642);
  } else block(group, 0.02, 0.018, 0.033, ROPE_LEFT + model.length * scale, ROPE_Y, -0.013, 0x7c9290);
  const count = model.segments + 1,
    sides = 8;
  const positions = new Float32Array(count * sides * 3),
    normals = new Float32Array(positions.length),
    indices = [];
  for (let i = 0; i < count - 1; i++)
    for (let j = 0; j < sides; j++) {
      const a = i * sides + j,
        b = i * sides + ((j + 1) % sides),
        c = a + sides,
        d = b + sides;
      indices.push(a, b, c, b, d, c);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  const rope = new THREE.Mesh(geometry, paint(0x715434));
  rope.frustumCulled = false;
  group.add(rope);
  const marker = new THREE.Group();
  group.add(marker);
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.004, 16, 12), paint(0xb94f3c));
  marker.add(knot);
  if (twoHands) {
    const markerPick = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.045, 0.035),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    markerPick.userData.pick = true;
    marker.add(markerPick);
  }
  block(marker, 0.012, 0.014, 0.0015, 0, -0.008, 0, 0xb94f3c);
  // A stationary reference behind the marker makes its material coordinate visible.
  const markX = ROPE_LEFT + markerIndex * model.dx * scale;
  if (reference) {
    for (let i = 0; i < 9; i++) block(group, 0.0008, 0.005, 0.0008, markX, 0.165 + i * 0.012, -0.018, 0x8d978e);
    cylinder(group, 0.0006, 0.27, markX, 0.143, -0.018, 0xb1b3a4);
    block(group, 0.036, 0.008, 0.035, markX, 0.004, -0.018, 0xa79d82);
  }
  function animate() {
    const s = model.observe();
    handle.position.set(ROPE_LEFT, ROPE_Y + s.hand * scale, 0);
    if (rightHandle) rightHandle.position.set(ROPE_LEFT + model.length * scale, ROPE_Y + s.rightHand * scale, 0);
    for (let i = 0; i < count; i++) {
      const p = s.points[i],
        before = s.points[Math.max(0, i - 1)],
        after = s.points[Math.min(count - 1, i + 1)];
      const dx = after.x - before.x,
        dy = after.y - before.y,
        len = Math.hypot(dx, dy),
        nx = -dy / len,
        ny = dx / len;
      for (let j = 0; j < sides; j++) {
        const a = (j / sides) * 2 * Math.PI,
          c = Math.cos(a),
          z = Math.sin(a),
          k = (i * sides + j) * 3;
        positions[k] = ROPE_LEFT + p.x * scale + 0.002 * nx * c;
        positions[k + 1] = ROPE_Y + p.y * scale + 0.002 * ny * c;
        positions[k + 2] = 0.002 * z;
        normals[k] = nx * c;
        normals[k + 1] = ny * c;
        normals[k + 2] = z;
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.normal.needsUpdate = true;
    marker.position.set(markX, ROPE_Y + s.points[markerIndex].y * scale, 0);
  }
  animate();
  return { group, handle, rightHandle, marker, rope, animate, dispose() {} };
}
