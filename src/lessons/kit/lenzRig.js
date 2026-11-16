import * as THREE from 'three';
import { paint, inked } from '../../live/ink.js';
import { barMagnet } from './magnet.js';
import { textPlate } from './props.js';
import { galvanometer } from './galvanometer.js';
import { COIL_RADIUS, COIL_HEIGHT, COIL_TURNS, MAGNET_LENGTH } from './inductionCoil.js';

export const COIL_X = -0.075,
  COIL_BOTTOM = 0.009;
const base = 0x7e6855;

function tube(points, radius, color) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return new THREE.Mesh(new THREE.TubeGeometry(curve, points.length * 5, radius, 7, false), paint(color));
}
export function lenzRig() {
  const group = new THREE.Group();
  const board = inked(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.008, 0.105), paint(base)));
  board.position.set(COIL_X, 0.004, 0);
  group.add(board);
  const former = new THREE.Mesh(
    new THREE.CylinderGeometry(COIL_RADIUS - 0.00013, COIL_RADIUS - 0.00013, COIL_HEIGHT, 56, 1, true),
    paint(0xa85e38),
  );
  former.position.set(COIL_X, COIL_BOTTOM + COIL_HEIGHT / 2, 0);
  group.add(former);
  const inside = new THREE.Mesh(
    new THREE.CylinderGeometry(COIL_RADIUS - 0.004, COIL_RADIUS - 0.004, COIL_HEIGHT, 56, 1, true),
    paint(0x735c47, { side: THREE.BackSide }),
  );
  inside.position.copy(former.position);
  group.add(inside);
  const rim = new THREE.Mesh(new THREE.RingGeometry(COIL_RADIUS - 0.004, COIL_RADIUS - 0.001, 56), paint(0xcdb595));
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(COIL_X, COIL_BOTTOM + COIL_HEIGHT, 0);
  group.add(rim);
  // 下端到上端绕向俯视逆时针，匝数和磁通计算一致。
  const segments = COIL_TURNS * 24;
  const coords = [];
  for (let k = 0; k <= segments; k++) {
    const f = k / (segments),
      a = f * COIL_TURNS * 2 * Math.PI;
    coords.push(
      new THREE.Vector3(COIL_X + COIL_RADIUS * Math.cos(a), COIL_BOTTOM + f * COIL_HEIGHT, -COIL_RADIUS * Math.sin(a)),
    );
  }
  const winding = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coords), segments, 0.00013, 5, false),
    paint(0xa85b35),
  );
  group.add(winding);
  const { group: meter, pivot, posts } = galvanometer();
  meter.position.set(0.092, 0, -0.003);
  group.add(meter);
  for (const [i, symbol] of ['−', '+'].entries()) {
    const plate = textPlate(symbol, { w: 0.008, h: 0.008, bg: '#eadcbd' });
    plate.position.set(posts[i].position.x, 0.014, 0.0156);
    meter.add(plate);
  }
  const plus = [meter.position.x + posts[1].position.x, 0.009, meter.position.z + posts[1].position.z];
  const minus = [meter.position.x + posts[0].position.x, 0.009, meter.position.z + posts[0].position.z];
  const coilEnd = COIL_X + COIL_RADIUS;
  const route = [
    [coilEnd, COIL_BOTTOM + COIL_HEIGHT, 0],
    [-0.032, 0.037, -0.022],
    [-0.017, 0.012, -0.038],
    [0.04, 0.004, -0.05],
    [0.125, 0.005, -0.045],
    [0.137, 0.004, 0.021],
  ];
  const loose = [0.128, 0.002, 0.061];
  const positiveWire = tube([...route, loose], 0.0015, 0xb24d43);
  const blackWire = tube(
    [[coilEnd, COIL_BOTTOM, 0], [-0.035, 0.012, 0.012], [0.012, 0.002, 0.037], [0.055, 0.002, 0.028], minus],
    0.0015,
    0x373b40,
  );
  group.add(positiveWire, blackWire);
  const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.0036, 0.0036, 0.01, 18), paint(0x973e37));
  group.add(plug);
  function connect(closed, position = loose) {
    const end = closed ? plus : position;
    const curve = new THREE.CatmullRomCurve3([...route, end].map((p) => new THREE.Vector3(...p)));
    positiveWire.geometry.dispose();
    positiveWire.geometry = new THREE.TubeGeometry(curve, 36, 0.0015, 7, false);
    plug.position.fromArray(end);
    plug.position.y += 0.003;
  }
  // 手动滑架保持磁体与线圈同轴；滑块横轴允许磁体在完全抽出后翻转。
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.21, 20), paint(0x8b9699));
  rod.position.set(COIL_X, 0.107, -0.043);
  group.add(rod);
  const slider = new THREE.Group();
  slider.position.set(COIL_X, 0, -0.043);
  const collar = inked(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.012, 0.013), paint(0x65727a)));
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.043, 16), paint(0x879799));
  axle.rotation.x = Math.PI / 2;
  axle.position.z = 0.0215;
  slider.add(collar, axle);
  group.add(slider);
  const carrier = new THREE.Group(),
    magnet = barMagnet({ L: MAGNET_LENGTH, w: 0.018, h: 0.014 });
  // 磁极字样朝向学生；转过半周即交换朝下的磁极。
  magnet.rotation.x = Math.PI / 2;
  magnet.position.z = -0.007;
  carrier.add(magnet);
  group.add(carrier);
  function pose(bottom, rotation) {
    carrier.position.set(COIL_X, COIL_BOTTOM + bottom + MAGNET_LENGTH / 2, 0);
    slider.position.y = carrier.position.y;
    carrier.rotation.z = rotation;
  }
  connect(false);
  pose(0.115, -Math.PI / 2);
  return { group, carrier, meter, pivot, posts, plug, plus, loose, connect, pose };
}
