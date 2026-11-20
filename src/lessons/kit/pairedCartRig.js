// 图 4.2-3：两条平行车道共用木板；黑板擦跨过两条尾绳。
import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { canvasTex, textPlate } from './props.js';
import { block } from './electronicsBench.js';
import { stampMass } from './ticker/loadRack.js';
import { LOW_TOP, boardWedge, WEDGE } from './ticker/apparatus.js';

export const TRAVEL = 0.13;
export const START_X = -0.041,
  TOP = LOW_TOP,
  BOARD_LEFT = -0.277,
  BRAKE_X = 0.164;
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
  const length = TRAVEL + 0.012;
  const tex = canvasTex(1200, 144, (g, w, h) => {
    g.fillStyle = '#ebd4a4';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#403b32';
    g.font = 'bold 58px sans-serif';
    g.textAlign = 'center';
    for (let mm = 0; mm <= Math.round(TRAVEL * 1000); mm++) {
      const x = w * (1 - (mm / 1000 + 0.006) / length);
      g.fillRect(x - 1, 0, mm % 5 ? 2 : 3, mm % 10 === 0 ? 54 : mm % 5 === 0 ? 39 : 24);
      if (mm % 10 === 0) g.fillText(String(mm / 10), x, 125);
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
  block(board, 0.665, 0.017, 0.28, 0.0555, -0.0085, 0, 0xb99965);
  block(group, 0.042, TOP - 0.017, 0.17, -0.224, (TOP - 0.017) / 2, 0, 0xb48c5a);
  block(group, 0.167, TOP - 0.017, 0.17, 0.414, (TOP - 0.017) / 2, 0, 0xb48c5a);
  const wedge = boardWedge(0.17);
  group.add(wedge);
  const brake = new THREE.Group();
  brake.position.set(BRAKE_X, 0, 0);
  board.add(brake);
  block(brake, 0.043, 0.013, 0.185, 0, 0.0075, 0, 0x384c4a);
  const handle = block(brake, 0.047, 0.015, 0.19, 0, 0.0215, 0, 0xa78359);
  const grip = block(handle, 0.034, 0.004, 0.16, 0, 0.0095, 0, 0x76583e);
  for (const end of [-0.055, 0.055]) block(grip, 0.029, 0.0008, 0.002, 0, 0.0023, end, 0xc1a17b);
  const cars = LANES.map((z, i) => {
    for (const side of [-0.02, 0.02]) block(board, 0.009, 0.02, 0.017, START_X - TRAVEL - 0.0465, 0.01, z + side, 0x68716a);
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
    block(car, 0.0008, 0.001, 0.017, 0, 0.002, 0.0305, 0xa33323);
    const scale = tape(board, z);
    const title = textPlate((i ? '后车' : '前车') + ' · cm', { w: 0.057, h: 0.018, font: 'bold 111px sans-serif', color: '#453a2a' });
    title.rotation.x = -Math.PI / 2; title.position.set(START_X + 0.039, 0.0006, z + 0.043); board.add(title);
    const axle = cylinder(board, RADIUS, 0.014, PULLEY_X, EYE - RADIUS, z, 0xbc975c, true);
    cylinder(axle, 0.012, 0.016, 0, 0, 0, 0x8c754e);
    cylinder(axle, 0.004, 0.024, 0, 0, 0, 0xc4c2b4);
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
    const spare = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(97 * 3), 3)), new THREE.LineBasicMaterial({ color: THREAD }));
    board.add(spare);
    const pan = new THREE.Group();
    cylinder(pan, 0.018, 0.004, 0, -0.031, 0, 0xae8952);
    cylinder(pan, 0.0013, 0.03, 0, -0.015, 0, THREAD);
    const disc = cylinder(pan, 0.013, 0.007, 0, -0.0255, 0, 0x898c7c);
    group.add(pan);
    return { car, scale, wheels, axle, cord, tail, arc, vertical, spare, pan, disc };
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
    wedge.position.set(0.388 - lift / 1000 * WEDGE.len / WEDGE.rise, TOP - 0.017, 0);
    board.updateMatrix();
  }
  const rimAt = i => new THREE.Vector3(PULLEY_X - RADIUS, EYE - RADIUS, LANES[i]).applyMatrix4(board.matrix);
  const panHook = i => rimAt(i).add(new THREE.Vector3(0, -0.035, 0));
  const panHome = i => new THREE.Vector3(PULLEY_X - RADIUS - 0.035, 0.033, LANES[i]);
  function setCart(i, distance, attached, prepared = false) {
    const z = LANES[i],
      c = cars[i],
      x = START_X - distance;
    c.car.position.set(x, 0, z);
    c.axle.rotation.y = -distance / RADIUS;
    for (const tire of c.wheels) tire.rotation.y = -distance / 0.01;
    const v = (x, y, z) => new THREE.Vector3(x, y, z);
    stretch(c.tail, v(x + 0.042, EYE, z), v(BRAKE_X - 0.022, 0.001, z));
    // 尾绳经过擦底，在后方留有余量。随着车左移，松弛部分逐步被拉直。
    const slack = TRAVEL - distance;
    for (let j = 0; j <= 96; j++) {
      const u = j / 96;
      c.spare.geometry.attributes.position.setXYZ(j, BRAKE_X - 0.022 + u * (0.054 + slack), 0.0012, z + slack * 0.09 * Math.sin(u * Math.PI * 4));
    }
    c.spare.geometry.attributes.position.needsUpdate = true;
    c.spare.geometry.computeBoundingSphere();
    c.tail.visible = c.spare.visible = attached;
    c.cord.visible = c.arc.visible = c.vertical.visible = prepared || attached;
    stretch(c.cord, v(PULLEY_X, EYE, z), v(x - 0.042, EYE, z));
    const rim = v(PULLEY_X - RADIUS, EYE - RADIUS, z).applyMatrix4(board.matrix);
    c.pan.position.copy(attached ? panHook(i).add(v(0, -distance, 0)) : panHome(i));
    stretch(c.vertical, rim, attached ? c.pan.position : panHook(i));
  }
  setLift(0);
  for (let i = 0; i < 2; i++) setCart(i, 0, false);
  return { group, board, wedge, brake, cars, weights, setLift, setCart, panHome, panHook };
}
