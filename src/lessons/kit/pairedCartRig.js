// 图 4.2-3：两条平行车道共用木板；黑板擦跨过两条尾绳。
import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { canvasTex } from './props.js';
import { block } from './electronicsBench.js';
import { stampMass } from './ticker/loadRack.js';

export const START_X = 0.125,
  TOP = 0.411,
  BOARD_LEFT = -0.277,
  BRAKE_X = 0.256;
export const LANES = [0.071, -0.071];
const PULLEY_X = BOARD_LEFT - 0.014,
  RADIUS = 0.019,
  EYE = 0.031;
const THREAD = 0x534a3b;

function cylinder(parent, radius, height, x, y, z, color, across = false) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 28), paint(color));
  m.position.set(x, y, z);
  if (across) m.rotation.x = Math.PI / 2;
  parent.add(m);
  return m;
}
function string(parent) {
  return cylinder(parent, 0.00085, 1, 0, 0, 0, THREAD);
}
const axis = new THREE.Vector3(0, 1, 0);
function stretch(mesh, a, b) {
  const delta = b.clone().sub(a);
  mesh.position.copy(a).addScaledVector(delta, 0.5);
  mesh.scale.y = delta.length();
  mesh.quaternion.setFromUnitVectors(axis, delta.normalize());
}
function tape(board, z) {
  const length = 0.355;
  const tex = canvasTex(2048, 100, (g, w, h) => {
    g.fillStyle = '#ebd4a4';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#403b32';
    g.font = 'bold 40px sans-serif';
    g.textAlign = 'center';
    for (let mm = 0; mm <= 340; mm++) {
      const x = w * (1 - (mm / 1000 + 0.006) / length);
      g.fillRect(x, 0, 2, mm % 10 === 0 ? 32 : mm % 5 === 0 ? 22 : 12);
      if (mm % 20 === 0) g.fillText(String(mm / 10), x, 78);
    }
  });
  const scale = new THREE.Mesh(new THREE.PlaneGeometry(length, 0.017), new THREE.MeshBasicMaterial({ map: tex }));
  scale.rotation.x = -Math.PI / 2;
  scale.position.set(START_X + 0.006 - length / 2, 0.0004, z + 0.043);
  board.add(scale);
  return scale;
}

export function pairedCartRig() {
  const group = new THREE.Group(),
    board = new THREE.Group();
  group.add(board);
  board.position.y = TOP;
  block(board, 0.692, 0.017, 0.23, 0.069, -0.0085, 0, 0xb99965);
  for (const x of [-0.245, 0.388]) {
    for (const z of [-0.092, 0.092]) block(group, 0.019, TOP - 0.036, 0.019, x, (TOP - 0.036) / 2, z, 0xa58e70);
    block(group, 0.03, 0.019, 0.216, x, TOP - 0.0265, 0, 0xbba887);
  }
  const wedge = block(group, 0.051, 0.005, 0.22, 0.388, TOP - 0.017, 0, 0x986740);
  const brake = new THREE.Group();
  brake.position.set(BRAKE_X, 0, 0);
  board.add(brake);
  block(brake, 0.043, 0.008, 0.185, 0, 0.005, 0, 0x494443);
  block(brake, 0.045, 0.018, 0.19, 0, 0.018, 0, 0xa78359);
  const cars = LANES.map((z, i) => {
    block(board, 0.009, 0.02, 0.062, START_X - 0.335 - 0.042 - 0.0045, 0.01, z, 0x68716a);
    const car = new THREE.Group();
    board.add(car);
    block(car, 0.084, 0.023, 0.052, 0, 0.028, 0, i === 0 ? 0x568b89 : 0xa67552);
    block(car, 0.073, 0.004, 0.046, 0, 0.042, 0, 0xc7c0a7);
    const wheels = [];
    for (const x of [-0.026, 0.026])
      for (const side of [-0.028, 0.028]) {
        const tire = cylinder(car, 0.01, 0.006, x, 0.01, side, 0x43474a, true);
        cylinder(tire, 0.003, 0.007, 0, 0, 0, 0xc3c6bd);
        wheels.push(tire);
      }
    block(car, 0.0015, 0.001, 0.021, 0, 0.002, 0.034, 0x984e32);
    const scale = tape(board, z);
    const axle = cylinder(board, RADIUS, 0.014, PULLEY_X, EYE - RADIUS, z, 0xbc975c, true);
    block(board, 0.053, 0.006, 0.006, PULLEY_X + 0.022, EYE - RADIUS, z + 0.012, 0x67716d);
    const cord = string(board),
      tail = string(board),
      vertical = string(group);
    const arcPts = Array.from({ length: 17 }, (_, j) => {
      const a = (Math.PI * j) / 32;
      return new THREE.Vector3(PULLEY_X - RADIUS * Math.sin(a), EYE - RADIUS + RADIUS * Math.cos(a), z);
    });
    const arc = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arcPts), 24, 0.00085, 8, false),
      paint(THREAD),
    );
    board.add(arc);
    const spare = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: THREAD }));
    board.add(spare);
    const pan = new THREE.Group();
    cylinder(pan, 0.018, 0.004, 0, -0.031, 0, 0xae8952);
    cylinder(pan, 0.0013, 0.03, 0, -0.015, 0, THREAD);
    cylinder(pan, 0.013, 0.007, 0, -0.026, 0, 0xac864a);
    group.add(pan);
    return { car, scale, wheels, axle, cord, tail, arc, vertical, spare, pan };
  });
  const weights = [-0.035, 0.04].map((x) => {
    const mesh = cylinder(group, 0.018, 0.017, x, 0.0085, 0.157, 0xb3975b);
    stampMass(mesh, 250, 0.03, 0.013, 0.0085);
    return mesh;
  });
  function setLift(lift) {
    const theta = Math.atan(lift / 633);
    board.rotation.z = theta;
    board.position.y = TOP + 0.245 * Math.sin(theta);
    wedge.scale.y = Math.max(0.15, lift / 5);
    wedge.position.y = TOP - 0.017 + lift / 2000;
    board.updateMatrix();
  }
  function setCart(i, distance, attached) {
    const z = LANES[i],
      c = cars[i],
      x = START_X - distance;
    c.car.position.set(x, 0, z);
    c.axle.rotation.y = -distance / RADIUS;
    for (const tire of c.wheels) tire.rotation.y = -distance / 0.01;
    const v = (x, y, z) => new THREE.Vector3(x, y, z);
    stretch(c.tail, v(x + 0.042, EYE, z), v(BRAKE_X - 0.022, 0.001, z));
    // 尾绳经过擦底，在后方留有余量。随着车左移，松弛部分逐步被拉直。
    const slack = Math.max(0, 0.335 - distance);
    const pts = Array.from({ length: 97 }, (_, j) => {
      const u = j / 96,
        a = u * Math.PI * 8;
      return v(BRAKE_X - 0.022 + u * 0.073 + slack * 0.04 * Math.sin(a), 0.0012, z + slack * 0.11 * Math.sin(a));
    });
    c.spare.geometry.setFromPoints(pts);
    c.spare.geometry.computeBoundingSphere();
    c.tail.visible = c.spare.visible = attached;
    c.cord.visible = c.arc.visible = c.vertical.visible = attached;
    stretch(c.cord, v(PULLEY_X, EYE, z), v(x - 0.042, EYE, z));
    const rim = v(PULLEY_X - RADIUS, EYE - RADIUS, z).applyMatrix4(board.matrix);
    c.pan.position.copy(attached ? rim.clone().add(v(0, -0.037 - distance, 0)) : v(rim.x, 0.033, z));
    stretch(c.vertical, rim, c.pan.position);
  }
  setLift(0);
  for (let i = 0; i < 2; i++) setCart(i, 0, false);
  return { group, board, wedge, brake, cars, weights, setLift, setCart };
}
