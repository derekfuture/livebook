import * as THREE from 'three';
import { paint, inked } from '../../live/ink.js';
import { battery, switchPart } from './circuit.js';
import { textPlate } from './props.js';
import { relayMechanism } from './relayMechanism.js';

export const HINGE = -0.218,
  DOOR_Z = -0.036,
  MOUNT_X = 0.093,
  MOUNT_Y = 0.1415;
export const MOUNT_Z = 0.012;
const reedY = MOUNT_Y + 0.0105;
const vec = (x, y, z) => new THREE.Vector3(x, y, z);
function block(parent, w, h, d, x, y, z, c) {
  const obj = inked(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint(c)), { width: 0.65 });
  obj.position.set(x, y, z);
  parent.add(obj);
  return obj;
}
function caption(parent, text, x, y, z, w = 0.034, h = 0.011) {
  const tag = textPlate(text, { w, h, bg: '#e4d9bd', color: '#383b3b' });
  tag.rotation.x = -Math.PI / 2;
  tag.position.set(x, y, z);
  parent.add(tag);
}
function wireGeometry(points, r = 0.0012) {
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points.map((p) => (Array.isArray(p) ? vec(...p) : p))),
    Math.max(22, points.length * 6),
    r,
    7,
    false,
  );
}
function wire(parent, points, color, r) {
  const obj = new THREE.Mesh(wireGeometry(points, r), paint(color));
  parent.add(obj);
  obj.raycast = () => {};
  return obj;
}
export function alarmRig() {
  const group = new THREE.Group();
  block(group, 0.153, 0.009, 0.088, HINGE + 0.055, 0.0045, DOOR_Z, 0x9c7756);
  for (const x of [HINGE - 0.006, HINGE + 0.117]) block(group, 0.011, 0.154, 0.018, x, 0.086, DOOR_Z, 0x9b7452);
  block(group, 0.134, 0.013, 0.018, HINGE + 0.055, 0.158, DOOR_Z, 0x987151);
  const door = new THREE.Group();
  group.add(door);
  door.position.set(HINGE, 0.009, DOOR_Z);
  block(door, 0.108, 0.137, 0.01, 0.054, 0.069, 0, 0xcfad82);
  block(door, 0.089, 0.105, 0.001, 0.054, 0.067, 0.0058, 0xe2c797);
  const handle = block(door, 0.011, 0.005, 0.014, 0.095, 0.067, 0.012, 0x826448);
  const mount = block(door, 0.021, 0.003, 0.015, MOUNT_X, MOUNT_Y - 0.009 - 0.004, MOUNT_Z, 0x795f53);
  for (const y of [0.034, 0.115]) {
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.0027, 0.0027, 0.014, 16), paint(0x777b7a));
    hinge.position.set(HINGE, y, DOOR_Z);
    group.add(hinge);
  }
  const reed = new THREE.Group();
  group.add(reed);
  reed.position.set(HINGE + MOUNT_X, reedY, DOOR_Z + MOUNT_Z + 0.002);
  const glass = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.0027, 0.021, 6, 20),
    paint(0xaaccc6, { transparent: true, opacity: 0.3, depthWrite: false }),
  );
  glass.rotation.z = Math.PI / 2;
  reed.add(glass);
  const leaves = [-1, 1].map((sign) => {
    const leaf = block(reed, 0.015, 0.00045, 0.0014, sign * 0.0063, 0, 0, 0x687878);
    const tail = block(reed, 0.009, 0.0008, 0.0014, sign * 0.016, 0, 0, 0x677471);
    return { leaf, tail, sign };
  });
  for (const s of [-1, 1])
    block(group, 0.007, 0.013, 0.013, reed.position.x + s * 0.017, reedY + 0.006, DOOR_Z + 0.009, 0x7f7766);
  const magnet = new THREE.Group();
  block(magnet, 0.006, 0.006, 0.006, -0.003, 0, 0, 0x487caa);
  block(magnet, 0.006, 0.006, 0.006, 0.003, 0, 0, 0xbf5845);
  const pick = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.015, 0.017),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  pick.userData.pick = true;
  magnet.add(pick);
  group.add(magnet);
  const homeMagnet = vec(HINGE + 0.055, 0.005, 0.069);
  magnet.position.copy(homeMagnet);

  const relay = relayMechanism();
  relay.group.position.set(0.035, 0, -0.015);
  relay.group.scale.setScalar(0.8);
  group.add(relay.group);
  const board = block(group, 0.257, 0.007, 0.159, 0.085, 0.0035, 0.034, 0xc9ae84);
  board.position.y = -0.0035;
  const E = battery('E', { cells: 4 }),
    S = switchPart('S');
  E.group.scale.setScalar(0.75);
  E.group.position.set(0.06, 0, -0.098);
  group.add(E.group);
  S.group.position.set(0.158, 0, -0.047);
  group.add(S.group);
  const source = (part, key) => group.worldToLocal(part.group.localToWorld(vec(...part.terminals[key])));
  const positive = source(E, '+'),
    negative = source(E, '-'),
    s1 = source(S, 'a'),
    switched = source(S, 'b');
  wire(group, [positive, [0.15, 0.008, -0.085], s1], 0x965649);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.006, 20, 14),
    new THREE.MeshBasicMaterial({ color: 0x3b674e }),
  );
  lamp.position.set(0.154, 0.021, 0.022);
  group.add(lamp);
  const rbody = block(group, 0.023, 0.007, 0.007, 0.157, 0.011, -0.002, 0xbda77e);
  for (const shift of [-0.006, -0.002, 0.003])
    block(group, 0.0018, 0.0074, 0.0074, rbody.position.x + shift, 0.011, -0.002, shift < 0 ? 0xb9783b : 0x875b48);
  caption(group, '330 Ω', 0.185, 0.001, -0.002);
  wire(group, [switched, [0.188, 0.006, -0.026], [0.182, 0.007, -0.004], [0.171, 0.011, -0.002]], 0x9e5b49);
  wire(
    group,
    [
      [0.145, 0.011, -0.002],
      [0.137, 0.008, 0.009],
      [0.15, 0.015, 0.022],
    ],
    0x967052,
  );
  block(group, 0.017, 0.007, 0.015, 0.154, 0.006, 0.022, 0x555b55);
  caption(group, 'LED', 0.177, 0.001, 0.028);
  const buzzer = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.012, 40), paint(0x424a4e));
  buzzer.position.set(0.17, 0.008, 0.076);
  group.add(buzzer);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.004, 24), new THREE.MeshBasicMaterial({ color: 0x171d21 }));
  hole.rotation.x = -Math.PI / 2;
  hole.position.set(0.17, 0.0142, 0.076);
  group.add(hole);
  caption(group, 'H', 0.192, 0.001, 0.077);
  wire(group, [switched, [0.213, 0.003, -0.028], [0.217, 0.003, 0.064], [0.182, 0.004, 0.075]], 0x985f49);
  wire(
    group,
    [
      switched,
      [0.115, 0.004, -0.069],
      [-0.092, 0.004, -0.073],
      [HINGE + 0.115, 0.148, DOOR_Z - 0.009],
      [reed.position.x + 0.02, reedY, reed.position.z],
    ],
    0x97614f,
  );

  const tips = {};
  function terminal(id, x, z, label, color = 0x8e6a4b) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.009, 18), paint(color));
    post.position.set(x, 0.007, z);
    group.add(post);
    tips[id] = vec(x, 0.0115, z);
    caption(group, label, x, 0.001, z + 0.011, 0.024, 0.008);
  }
  terminal('K', -0.001, 0.022, 'K');
  terminal('a', 0.071, 0.051, 'a');
  terminal('b', 0.1, 0.051, 'b');
  terminal('neg', -0.017, 0.07, '−', 0x414950);
  wire(group, [negative, [-0.031, 0.004, -0.074], [-0.038, 0.003, 0.044], tips.neg], 0x44474a);
  wire(group, [negative, [0.007, 0.005, -0.061], [0.021, 0.006, -0.025]], 0x44474a);
  // a 是吸合时的下触点，b 是释放时的上触点，c 由衔铁铰链引出。
  const relayPos = (x, y, z) => group.worldToLocal(relay.group.localToWorld(vec(x, y, z)));
  wire(group, [tips.K, relayPos(-0.015, 0.007, 0.025), relayPos(-0.016, 0.014, 0)], 0x8f6948);
  for (const [id, height, side] of [
    ['a', 0.04, 0.016],
    ['b', 0.058, -0.016],
  ]) {
    wire(
      group,
      [relayPos(0.038, height, 0), relayPos(0.049, height, side), relayPos(0.053, 0.013, side), tips[id]],
      0x99896a,
    );
  }
  caption(group, 'c', 0.011, 0.001, -0.051);
  const anchors = [
    vec(reed.position.x - 0.02, reedY, reed.position.z),
    vec(0.003, 0.041, -0.015),
    vec(0.159, 0.013, 0.022),
    vec(0.159, 0.004, 0.076),
  ];
  const homes = [
    vec(-0.048, 0.004, 0.028),
    vec(0.018, 0.004, 0.095),
    vec(0.113, 0.004, 0.08),
    vec(0.093, 0.004, 0.098),
  ];
  const wires = anchors.map((anchor, i) => {
    const color = [0x9e644f, 0x3f4748, 0x748562, 0xa67a46][i];
    const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.0044, 0.0044, 0.01, 16), paint(color));
    plug.position.copy(homes[i]);
    group.add(plug);
    const wire = new THREE.Mesh(new THREE.BufferGeometry(), paint(color));
    wire.raycast = () => {};
    group.add(wire);
    return { anchor, plug, wire, home: homes[i], to: null };
  });
  function route(i) {
    const l = wires[i],
      end = l.plug.position;
    const middle = l.anchor.clone().lerp(end, 0.55);
    middle.y = 0.003;
    middle.z += i === 0 ? 0.005 : 0.023;
    const points =
      i === 0
        ? [l.anchor, vec(HINGE - 0.007, reedY + 0.002, DOOR_Z), vec(HINGE - 0.008, 0.008, DOOR_Z), middle, end]
        : [l.anchor, middle, end];
    l.wire.geometry.dispose();
    l.wire.geometry = wireGeometry(points);
  }
  wires.forEach((_, i) => route(i));
  // 与实验台共用坐标，不随书页缩放或相机转动改变磁场。
  const relativeMagnet = new THREE.Vector3(),
    axisEnd = new THREE.Vector3(),
    mountPoint = new THREE.Vector3();
  function fieldGeometry() {
    group.worldToLocal(magnet.getWorldPosition(relativeMagnet));
    axisEnd.set(1, 0, 0);
    group.worldToLocal(magnet.localToWorld(axisEnd)).sub(relativeMagnet).normalize();
    return { position: relativeMagnet, axis: axisEnd };
  }
  function mountingPoint() {
    return group.worldToLocal(door.localToWorld(mountPoint.set(MOUNT_X, MOUNT_Y - 0.009, MOUNT_Z)));
  }
  function draw(state) {
    for (const { leaf, sign } of leaves) {
      leaf.rotation.z = sign * (state.reed ? 0.015 : 0.055);
      leaf.position.y = sign * (state.reed ? 0.00015 : 0.00064);
    }
    relay.arm.rotation.z = THREE.MathUtils.lerp(0.04, -0.065, state.travel);
    lamp.material.color.setHex(state.ledCurrent > 0 ? 0x73e68d : 0x3b674e);
  }
  return {
    group,
    door,
    handle,
    mount,
    magnet,
    homeMagnet,
    reed,
    relay,
    S,
    lamp,
    buzzer,
    wires,
    tips,
    route,
    draw,
    fieldGeometry,
    mountingPoint,
  };
}
