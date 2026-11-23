import * as THREE from 'three';
import { rippleRig, WATER } from './rippleRig.js';
import { REFLECTOR_LENGTH, REFLECTOR_THICKNESS } from './reflectionTank.js';
import { DX, NX, NZ } from './rippleTank.js';
import { block } from './electronicsBench.js';
import { paint } from '../../live/ink.js';

export function reflectionRig(tank) {
  const rig = rippleRig(tank, { reflection: true });
  const board = new THREE.Group();
  rig.group.add(board);
  block(board, REFLECTOR_LENGTH, 0.018, REFLECTOR_THICKNESS, 0, 0.025, 0, 0x855f39);
  const grips = [-1, 1].map((s) => {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.012, 20), paint(0xd9b37f));
    grip.position.set(s * 0.095, 0.039, 0);
    board.add(grip);
    return grip;
  });
  const normal = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, WATER + 0.002, -0.09),
      new THREE.Vector3(0, WATER + 0.002, 0.09),
    ]),
    new THREE.LineDashedMaterial({ color: 0x55534d, dashSize: 0.004, gapSize: 0.003 }),
  );
  normal.computeLineDistances();
  normal.visible = false;
  normal.raycast = () => {};
  board.add(normal);
  function layout() {
    board.rotation.y = -tank.angle;
  }
  function snapshot() {
    const photo = rig.snapshot(-1, -1),
      c = photo.getContext('2d');
    c.strokeStyle = '#805e40';
    c.lineWidth = 5;
    c.beginPath();
    for (const s of [-1, 1]) {
      const x = ((s * REFLECTOR_LENGTH) / 2) * Math.cos(tank.angle),
        z = ((s * REFLECTOR_LENGTH) / 2) * Math.sin(tank.angle);
      const px = (x / DX + (NX - 1) / 2) * 2,
        py = (z / DX + (NZ - 1) / 2) * 2;
      if (s < 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.stroke();
    return photo;
  }
  layout();
  return { ...rig, board, grips, normal, layout, snapshot };
}
