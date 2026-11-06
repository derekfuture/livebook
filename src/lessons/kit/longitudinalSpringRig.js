import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { block } from './electronicsBench.js';
import { textPlate } from './props.js';

export const LONGITUDINAL_SCALE = 0.64;
export const LONGITUDINAL_MARKER = 32;

// All coils belong to one continuous helix. Axial positions come from the model;
// neither the coloured turn nor a compression travels by swapping mesh identity.
export function longitudinalSpringRig(model) {
  const group = new THREE.Group(),
    textures = [];
  const scale = LONGITUDINAL_SCALE,
    p = model.parameters;
  const left = (-p.length * scale) / 2;
  const radius = p.coilRadius * scale,
    wireRadius = (p.wireDiameter * scale) / 2;
  const surfaceY = 0.012,
    axisY = surfaceY + radius + wireRadius;
  const board = block(group, 0.94, surfaceY - 0.0006, 0.24, 0, (surfaceY - 0.0006) / 2, 0, 0xd8c7a5);
  block(group, 0.92, 0.0006, 0.22, 0, surfaceY - 0.0003, 0, 0xe6e1d1);
  function label(text, x, z, w = 0.08) {
    const tag = textPlate(text, { w, h: 0.018, font: 'bold 78px sans-serif', color: '#59645a', bg: '#e6e1d1' });
    tag.rotation.x = -Math.PI / 2;
    tag.position.set(x, surfaceY + 0.0002, z);
    group.add(tag);
    textures.push(tag.material.map);
    return tag;
  }
  // Fixed reference marks live on the plane, not on a moving ruler.
  const markerCoordinate = (LONGITUDINAL_MARKER + 0.5) * model.pitch;
  const referenceX = left + markerCoordinate * scale;
  for (const z of [-0.052, 0.052]) {
    block(group, 0.001, 0.0004, 0.025, referenceX, surfaceY + 0.0002, z, 0xb46550);
  }
  label('红圈原位置', referenceX, 0.084, 0.1);
  block(group, 0.001, 0.0004, 0.028, left - 0.031, surfaceY + 0.0002, 0.05, 0x658479);
  label('手的起点', left - 0.031, 0.084, 0.078);
  label('自由末端', left + p.length * scale, 0.084, 0.085);

  const hand = new THREE.Group();
  group.add(hand);
  const skin = paint(0xd6a578);
  function rounded(a, b, r) {
    const from = new THREE.Vector3(...a),
      to = new THREE.Vector3(...b);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, from.distanceTo(to), 16), skin);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    hand.add(mesh);
    for (const point of [from, to]) {
      const end = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), skin);
      end.position.copy(point);
      hand.add(end);
    }
  }
  const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), skin);
  palm.scale.set(0.023, 0.011, 0.015);
  palm.position.set(-0.033, 0.007, -0.004);
  hand.add(palm);
  // Thumb and index finger visibly pinch the end of the original wire.
  rounded([-0.023, 0.012, -0.009], [-0.009, 0.01, -0.009], 0.004);
  rounded([-0.009, 0.01, -0.009], [-0.001, 0.004, -0.002], 0.004);
  rounded([-0.027, -0.002, 0.012], [-0.01, -0.002, 0.009], 0.004);
  rounded([-0.01, -0.002, 0.009], [-0.001, -0.003, 0.002], 0.0035);
  for (let i = 0; i < 3; i++) rounded([-0.038, 0.006, -0.012 + i * 0.007], [-0.017, 0.005, -0.013 + i * 0.007], 0.004);
  const handPick = new THREE.Mesh(
    new THREE.BoxGeometry(0.065, 0.04, 0.045),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  handPick.position.set(-0.028, 0.005, 0);
  handPick.userData.pick = true;
  hand.add(handPick);

  const perTurn = 24,
    sides = 6,
    samples = p.segments * perTurn + 1;
  const positions = new Float32Array(samples * sides * 3),
    normals = new Float32Array(positions.length);
  const indices = [],
    geometry = new THREE.BufferGeometry();
  for (let i = 0; i < samples - 1; i++)
    for (let j = 0; j < sides; j++) {
      const a = i * sides + j,
        b = i * sides + ((j + 1) % sides);
      indices.push(a, b, a + sides, b, b + sides, a + sides);
    }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setIndex(indices);
  const turnIndices = perTurn * sides * 6,
    start = LONGITUDINAL_MARKER * turnIndices;
  geometry.addGroup(0, start, 0);
  geometry.addGroup(start, turnIndices, 1);
  geometry.addGroup(start + turnIndices, indices.length - start - turnIndices, 0);
  const spring = new THREE.Mesh(geometry, [paint(0x71858d), paint(0xba5741, { keep: true })]);
  spring.frustumCulled = false;
  group.add(spring);
  const marker = new THREE.Group();
  group.add(marker);
  const markerPick = new THREE.Mesh(
    new THREE.BoxGeometry(model.pitch * scale * 2, radius * 2 + 0.008, radius * 2 + 0.008),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  markerPick.userData.pick = true;
  marker.add(markerPick);

  function pose() {
    hand.position.set(left + model.q[0] * scale, axisY + radius, 0);
    marker.position.set(
      referenceX + ((model.q[LONGITUDINAL_MARKER] + model.q[LONGITUDINAL_MARKER + 1]) * scale) / 2,
      axisY,
      0,
    );
    for (let i = 0; i < samples; i++) {
      const turn = Math.min(p.segments - 1, Math.floor(i / perTurn));
      const fraction = i / perTurn - turn;
      const angle = (i / perTurn) * 2 * Math.PI,
        c = Math.cos(angle),
        s = Math.sin(angle);
      const gap = model.pitch + model.q[turn + 1] - model.q[turn];
      const tangentLength = Math.hypot(gap, (2 * Math.PI * radius) / scale);
      const bx = (-2 * Math.PI * radius) / scale / tangentLength;
      const by = (-gap * s) / tangentLength,
        bz = (gap * c) / tangentLength;
      const x =
        left +
        ((turn + fraction) * model.pitch + model.q[turn] * (1 - fraction) + model.q[turn + 1] * fraction) * scale;
      for (let j = 0; j < sides; j++) {
        const a = (j / sides) * 2 * Math.PI,
          ca = Math.cos(a),
          sa = Math.sin(a);
        const nx = bx * sa,
          ny = c * ca + by * sa,
          nz = s * ca + bz * sa;
        const k = (i * sides + j) * 3;
        positions[k] = x + wireRadius * nx;
        positions[k + 1] = axisY + radius * c + wireRadius * ny;
        positions[k + 2] = radius * s + wireRadius * nz;
        normals[k] = nx;
        normals[k + 1] = ny;
        normals[k + 2] = nz;
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.normal.needsUpdate = true;
    geometry.computeBoundingSphere();
  }
  pose();
  return {
    group,
    board,
    hand,
    spring,
    marker,
    left,
    axisY,
    referenceX,
    pose,
    dispose() {
      textures.forEach((t) => t.dispose());
    },
  };
}
