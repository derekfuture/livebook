// 图 2.1-1 的闭合回路。绕组下端接黑柱，上端接红柱。
import * as THREE from 'three';
import { paint, inked } from '../../live/ink.js';
import { textPlate } from './props.js';
import { galvanometer } from './galvanometer.js';
import { COIL_RADIUS, COIL_HEIGHT, COIL_TURNS, MAGNET_LENGTH } from './inductionCoil.js';

export const COIL_X = -0.081, COIL_BOTTOM = 0.009;

function wire(points, radius, color) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  return new THREE.Mesh(new THREE.TubeGeometry(curve, points.length * 10, radius, 10, false), paint(color));
}

export function lenzRig() {
  const group = new THREE.Group();
  const base = inked(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.008, 0.105), paint(0x786857)));
  base.position.set(COIL_X, 0.004, 0);
  group.add(base);
  const former = new THREE.Mesh(
    new THREE.CylinderGeometry(COIL_RADIUS - 0.0012, COIL_RADIUS - 0.0012, COIL_HEIGHT, 64, 1, true),
    paint(0x845f44, { side: THREE.DoubleSide }),
  );
  former.position.set(COIL_X, COIL_BOTTOM + COIL_HEIGHT / 2, 0);
  group.add(former);
  for (const height of [COIL_BOTTOM, COIL_BOTTOM + COIL_HEIGHT]) {
    const lip = new THREE.Mesh(new THREE.TorusGeometry(COIL_RADIUS - 0.0005, 0.0016, 10, 64), paint(0xc89c65));
    lip.rotation.x = Math.PI / 2;
    lip.position.set(COIL_X, height, 0);
    group.add(lip);
  }
  // 五层密绕共 160 匝，外层自下而上；从上方看，正电流逆时针。
  const turns = COIL_TURNS / 5, segments = turns * 48;
  const path = [];
  for (let k = 0; k <= segments; k++) {
    const f = k / segments, a = f * turns * 2 * Math.PI;
    path.push(new THREE.Vector3(COIL_X + COIL_RADIUS * Math.cos(a),
      COIL_BOTTOM + f * COIL_HEIGHT, -COIL_RADIUS * Math.sin(a)));
  }
  group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path), segments, 0.00066, 8, false), paint(0xb46a40)));

  const { group: meter, pivot, posts } = galvanometer();
  meter.scale.setScalar(1.65);
  meter.position.set(0.068, 0, -0.003);
  pivot.children[0].scale.x = 2.6;
  group.add(meter);
  for (const [i, symbol] of ['−', '+'].entries()) {
    const plate = textPlate(symbol, { w: 0.010, h: 0.010, color: '#fffaf0', font: 'bold 405px sans-serif' });
    plate.position.set(posts[i].position.x, 0.015, 0.0158);
    meter.add(plate);
  }
  const post = i => posts[i].position.clone().add(new THREE.Vector3(0, 0.003, 0))
    .multiplyScalar(meter.scale.x).add(meter.position).toArray();
  const endX = COIL_X + COIL_RADIUS;
  group.add(
    wire([[endX, COIL_BOTTOM + COIL_HEIGHT, 0], [-0.043, 0.048, -0.018], [-0.021, 0.018, -0.044],
      [0.011, 0.004, -0.059], [0.109, 0.003, -0.051], [0.141, 0.004, -0.019],
      [0.141, 0.004, 0.040], [0.119, 0.007, 0.051], post(1)], 0.0015, 0xb84c40),
    wire([[endX, COIL_BOTTOM, 0], [-0.035, 0.011, 0.016], [-0.018, 0.004, 0.033],
      [0.002, 0.003, 0.049], [0.025, 0.006, 0.047], post(0)], 0.0015, 0x343a40),
  );

  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.0023, 0.0023, 0.178, 20), paint(0x899599));
  rod.position.set(COIL_X, 0.097, -0.038);
  const slider = new THREE.Group();
  slider.position.set(COIL_X, 0, -0.038);
  const sleeve = inked(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.012), paint(0x65727a)));
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.034, 16), paint(0x879799));
  axle.rotation.x = Math.PI / 2;
  axle.position.z = 0.017;
  slider.add(sleeve, axle);
  const carrier = new THREE.Group(), labels = [];
  for (const [end, mark, color] of [[-1, 'N', 0xd9483b], [1, 'S', 0x2f6fd0]]) {
    const half = inked(new THREE.Mesh(new THREE.BoxGeometry(0.021, MAGNET_LENGTH / 2, 0.016), paint(color)));
    half.position.y = end * MAGNET_LENGTH / 4;
    carrier.add(half);
    const label = textPlate(mark, { w: 0.016, h: 0.016, color: '#fff', font: 'bold 455px sans-serif' });
    label.position.set(0, half.position.y, 0.0081);
    carrier.add(label);
    labels.push(label);
  }
  const pick = new THREE.Mesh(new THREE.BoxGeometry(0.031, MAGNET_LENGTH, 0.021),
    new THREE.MeshBasicMaterial({ visible: false }));
  pick.userData.pick = true;
  carrier.add(pick);
  group.add(carrier, slider, rod);
  function pose(bottom, rotation) {
    carrier.position.set(COIL_X, COIL_BOTTOM + bottom + MAGNET_LENGTH / 2, 0);
    slider.position.y = carrier.position.y;
    carrier.rotation.z = rotation;
    for (const label of labels) label.rotation.z = -rotation;
  }
  return { group, carrier, pick, pivot, pose };
}
