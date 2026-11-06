import * as THREE from 'three';
import { paint, inked } from '../../live/ink.js';
import { textPlate } from './props.js';
import { SHIELDING_HINGE, SHIELDING_LEAF, SHIELDING_SOURCE_RADIUS } from './staticShielding.js';

export function shieldingRig(model) {
  const group = new THREE.Group(),
    textures = [];
  const H = new THREE.Vector3(...SHIELDING_HINGE);
  function mesh(parent, geometry, color, position, outline = true, options = {}) {
    const o = new THREE.Mesh(geometry, paint(color, options));
    if (outline) inked(o);
    o.position.set(...position);
    parent.add(o);
    return o;
  }
  function rod(parent, a, b, radius, color, outline = true) {
    const start = new THREE.Vector3(...a),
      end = new THREE.Vector3(...b),
      delta = end.clone().sub(start);
    const o = mesh(
      parent,
      new THREE.CylinderGeometry(radius, radius, delta.length(), 24),
      color,
      start.add(end).multiplyScalar(0.5).toArray(),
      outline,
    );
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return o;
  }
  function label(text, x, z, w = 0.09) {
    const p = textPlate(text, {
      w,
      h: 0.018,
      bg: '#ede2c8',
      font: `bold ${Math.floor(Math.min(((512 * 0.018) / w) * 0.68, 420 / text.length))}px sans-serif`,
    });
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, 0.0015, z);
    group.add(p);
    textures.push(p.material.map);
    return p;
  }
  mesh(group, new THREE.BoxGeometry(0.34, 0.01, 1.09), 0xcbbd9d, [0, -0.005, 0.005]);
  // All support and enclosure pieces are insulating wood/resin/glass.
  mesh(group, new THREE.CylinderGeometry(0.062, 0.067, 0.012, 32), 0xbaa17b, [0, 0.006, 0]);
  mesh(group, new THREE.BoxGeometry(0.025, 0.015, 0.035), 0xc1ab88, [0, 0.0195, 0]);
  const scope = new THREE.Group();
  scope.name = 'shielding-electroscope';
  group.add(scope);
  for (const z of [-0.023, 0.023])
    mesh(scope, new THREE.TorusGeometry(0.059, 0.0035, 16, 64), 0xc1ab88, [0, 0.0875, z]);
  const windowGeometry = new THREE.CircleGeometry(0.058, 48);
  const windows = [];
  for (const z of [-0.023, 0.023]) {
    const pane = mesh(scope, windowGeometry, 0xa8d6df, [0, 0.0875, z], false, {
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    pane.renderOrder = 3;
    windows.push(pane);
  }
  // Side wall follows the circular frame; the back remains transparent too.
  const wall = mesh(
    scope,
    new THREE.CylinderGeometry(0.059, 0.059, 0.046, 48, 1, true),
    0x9ebec1,
    [0, 0.0875, 0],
    false,
    { transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide },
  );
  wall.rotation.x = Math.PI / 2;
  wall.renderOrder = 3;
  mesh(scope, new THREE.CylinderGeometry(0.006, 0.006, 0.008, 16), 0xa5b6ab, [0, 0.152, 0]);
  rod(scope, [0, 0.1, 0], [0, 0.161, 0], 0.001, 0xaeb5b9, false);
  mesh(scope, new THREE.SphereGeometry(0.009, 24, 16), 0xaeb5b9, [0, 0.17, 0]);
  rod(scope, [-0.0006, 0.1, 0], [0.0006, 0.1, 0], 0.0007, 0xaeb5b9, false);
  const leaves = [-1, 1].map((side) => {
    const leaf = new THREE.Group();
    leaf.name = side < 0 ? 'shielding-leaf-left' : 'shielding-leaf-right';
    leaf.position.set(side * 0.0006, 0.1, 0);
    scope.add(leaf);
    // Physical strip width is along z; its rotation axis is that width, not a
    // front-facing billboard. A slightly oblique inspection view shows it.
    const foil = mesh(
      leaf,
      new THREE.PlaneGeometry(SHIELDING_LEAF.width, SHIELDING_LEAF.length),
      0xc59b39,
      [0, -SHIELDING_LEAF.length / 2, 0],
      false,
      { side: THREE.DoubleSide },
    );
    foil.rotation.y = Math.PI / 2;
    return leaf;
  });
  const scopePick = mesh(group, new THREE.CylinderGeometry(0.061, 0.061, 0.05, 32), 0xffffff, [0, 0.0875, 0], false, {
    visible: false,
  });
  scopePick.rotation.x = Math.PI / 2;
  scopePick.userData.pick = true;
  label('验电器', -0.102, 0.035, 0.075);

  // A friction hinge and two insulating arms carry the actual cage. Rotation
  // is about the exact same axis used by the electrostatic model.
  for (const x of [-0.112, 0.112]) {
    mesh(group, new THREE.BoxGeometry(0.03, 0.015, 0.04), 0x8b8d7d, [x, 0.0075, H.z]);
    rod(group, [x - 0.012, H.y, H.z], [x + 0.012, H.y, H.z], 0.009, 0x626c68);
  }
  const cage = new THREE.Group();
  cage.name = 'shielding-cage';
  cage.position.copy(H);
  group.add(cage);
  const local = (a) => new THREE.Vector3(...a).sub(H).toArray();
  for (const x of [-0.112, 0.112]) {
    rod(cage, local([x, 0.01, -0.24]), local([x, 0.01, -0.08]), 0.005, 0x7d867a);
    rod(cage, local([x, 0.01, -0.08]), local([Math.sign(x) * 0.1, 0.01, -0.08]), 0.004, 0x7d867a);
  }
  const wireMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(model.electrostatics.wireRadius, model.electrostatics.wireRadius, 1, 8),
    paint(0x6e7b83),
    model.electrostatics.cage.length,
  );
  const temp = new THREE.Object3D(),
    up = new THREE.Vector3(0, 1, 0);
  model.electrostatics.cage.forEach((wire, i) => {
    temp.position.copy(new THREE.Vector3(...wire.center).sub(H));
    temp.quaternion.setFromUnitVectors(up, new THREE.Vector3(...wire.direction));
    temp.scale.set(1, wire.length, 1);
    temp.updateMatrix();
    wireMesh.setMatrixAt(i, temp.matrix);
  });
  wireMesh.instanceMatrix.needsUpdate = true;
  cage.add(wireMesh);
  for (const x of [-0.022, 0.022]) rod(cage, local([x, 0.25, 0.08]), local([x, 0.273, 0.08]), 0.0035, 0x8b9d90);
  const coverGrip = rod(cage, local([-0.028, 0.273, 0.08]), local([0.028, 0.273, 0.08]), 0.006, 0x7c9284);
  const coverPick = mesh(cage, new THREE.BoxGeometry(0.075, 0.028, 0.028), 0xffffff, local([0, 0.273, 0.08]), false, {
    visible: false,
  });
  coverPick.userData.pick = true;
  label('翻开 / 盖回', -0.105, -0.34, 0.115);

  // The charged sphere rests on an insulating sliding holder. The wooden
  // guide fixes height and lateral position so both comparisons use one path.
  const source = new THREE.Group();
  source.name = 'shielding-source';
  group.add(source);
  mesh(source, new THREE.BoxGeometry(0.047, 0.013, 0.047), 0x9f8b6f, [0, 0.007, 0]);
  const sourceGrip = rod(source, [0, 0.015, 0], [0, 0.151, 0], 0.006, 0xb5c6b9);
  mesh(source, new THREE.SphereGeometry(SHIELDING_SOURCE_RADIUS, 24, 20), 0xb8bfc3, [0, 0.17, 0]);
  const sourcePick = mesh(source, new THREE.CylinderGeometry(0.017, 0.017, 0.13, 12), 0xffffff, [0, 0.085, 0], false, {
    visible: false,
  });
  sourcePick.userData.pick = true;
  for (const x of [-0.029, 0.029]) mesh(group, new THREE.BoxGeometry(0.004, 0.004, 0.365), 0xa39375, [x, 0.002, 0.305]);
  for (const z of [0.15, 0.46])
    mesh(group, new THREE.BoxGeometry(0.055, 0.004, 0.006), 0x95836a, [0, 0.002, z + (z > 0.3 ? 0.027 : -0.027)]);
  label('近处', 0.084, 0.15, 0.065);
  label('远处', 0.084, 0.46, 0.065);
  label('带正电的球', 0, 0.52, 0.13);
  function pose() {
    source.position.z = model.source[2];
    cage.position.copy(H).add(new THREE.Vector3(...model.cageOffset));
    cage.rotation.x = -model.cageAngle;
    leaves.forEach((leaf, i) => {
      leaf.rotation.z = (i ? 1 : -1) * model.angles[i];
    });
  }
  pose();
  return {
    group,
    scope,
    scopePick,
    leaves,
    windows,
    source,
    sourceGrip,
    sourcePick,
    cage,
    wireMesh,
    coverGrip,
    coverPick,
    pose,
    dispose() {
      textures.forEach((t) => t.dispose());
    },
  };
}
