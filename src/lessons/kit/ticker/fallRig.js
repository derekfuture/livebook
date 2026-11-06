import * as THREE from 'three';
import { paint, polyline } from '../../../live/ink.js';
import { stand, woodBlock, canvasTex, textPlate, rulerMesh } from '../props.js';
import { tickerHead, SLOT_Y } from './head.js';

export const X = 0.13,
  HEAD = 0.365,
  LEAD = 0.047,
  TRAVEL = 0.255,
  L = 0.355,
  WIDTH = 0.027;
export const BASE = HEAD - LEAD,
  ZERO = -0.16,
  LANE = 0.116,
  RULER_Z = LANE + WIDTH / 2 + 0.016;
export function fallingRig({ mass = 200 } = {}) {
  const group = new THREE.Group();
  function box(parent, w, h, d, x, y, z, color) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint(color));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  const tableTop = 0.21;
  const desk = woodBlock(0.355, 0.015, 0.175);
  desk.position.set(-0.1125, tableTop - 0.0075, -0.057);
  group.add(desk);
  for (const x of [-0.263, 0.042])
    for (const z of [-0.124, 0.006]) box(group, 0.016, tableTop - 0.015, 0.016, x, (tableTop - 0.015) / 2, z, 0xb58b5d);
  const st = stand({ height: 0.49, baseW: 0.115, baseD: 0.085 });
  st.position.set(-0.017, tableTop, -0.063);
  group.add(st);
  const head = tickerHead();
  head.group.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)),
  );
  head.group.position.set(X, HEAD, -SLOT_Y);
  group.add(head.group);
  const rodX = st.position.x + st.rodX;
  function clampAt(y) {
    st.clamp(y - tableTop, X - rodX);
    box(group, 0.012, 0.01, 0.035, X, y, -0.049, 0x5d6670);
  }
  clampAt(HEAD);
  clampAt(BASE + L - 0.009);
  const supply = box(group, 0.075, 0.04, 0.055, -0.195, tableTop + 0.02, -0.045, 0x39666b);
  const plate = textPlate('AC 50 Hz', { w: 0.065, h: 0.021, font: 'bold 92px sans-serif', bg: '#e9dfc7' });
  plate.position.z = 0.028;
  supply.add(plate);
  for (const dx of [-0.009, 0.009])
    group.add(
      polyline(
        [
          [-0.18 + dx, tableTop + 0.043, -0.038],
          [-0.1 + dx, tableTop + 0.008, -0.088],
          [0.032 + dx, tableTop + 0.012, -0.078],
          [X + dx, HEAD, -0.041],
        ].map((p) => new THREE.Vector3(...p)),
        { color: 0x43494b, width: 1.5 },
      ),
    );
  box(group, 0.042, 0.016, 0.03, X, BASE + L - 0.009, -0.02, 0x65757e);
  box(group, 0.013, 0.014, 0.027, X, BASE + L - 0.009, -0.04, 0x65757e);
  const jaw = new THREE.Group();
  jaw.position.set(X - 0.02, BASE + L - 0.009, 0.005);
  group.add(jaw);
  box(group, 0.008, 0.015, 0.03, X - 0.02, BASE + L - 0.009, -0.006, 0x65757e);
  box(jaw, 0.043, 0.014, 0.01, 0.019, 0, 0, 0xa77549);
  const weight = new THREE.Group();
  group.add(weight);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.035, 32), paint(0xaa8450));
  body.position.y = -0.028;
  weight.add(body);
  box(weight, 0.031, 0.014, 0.011, 0, -0.005, 0, 0x5c6870);
  const massPlate = textPlate(mass + ' g', {
    w: 0.039,
    h: 0.016,
    font: 'bold 175px sans-serif',
    color: '#302b27',
    bg: '#e8c58d',
  });
  massPlate.position.set(0, -0.028, 0.0212);
  weight.add(massPlate);
  const padH = BASE - TRAVEL - 0.0455;
  box(group, 0.08, padH, 0.08, X, padH / 2, 0, 0x60716b);
  const tex = canvasTex(3072, 256, () => {}),
    ink = tex.canvas.getContext('2d');
  const tape = new THREE.Mesh(
    new THREE.PlaneGeometry(L, WIDTH),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
  );
  group.add(tape);
  const vertical = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2),
    flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const ruler = rulerMesh({
    length: (L * 4096) / 4080,
    width: 0.032,
    divisions: 355,
    every: 10,
    labelEvery: 50,
    labelStep: 10,
  });
  ruler.position.set(ZERO + L / 2, 0.002, RULER_Z);
  group.add(ruler);
  const pencil = new THREE.Mesh(new THREE.BoxGeometry(0.0007, 0.0005, 0.031), paint(0xa25339));
  pencil.position.set(0, 0.004, RULER_Z);
  pencil.visible = false;
  group.add(pencil);
  return { group, head, jaw, weight, tape, tex, ink, ruler, pencil, vertical, flat, massPlate };
}
