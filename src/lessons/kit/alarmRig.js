import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { battery, switchPart } from './circuit.js';
import { textPlate } from './props.js';
import { block, wireGeometry, wire } from './electronicsBench.js';
import { relayMechanism } from './relayMechanism.js';

export const HINGE = -0.218,
  DOOR_Z = -0.036,
  MOUNT_X = 0.093,
  MOUNT_Y = 0.1415;
export const MOUNT_Z = 0.012;
const reedY = MOUNT_Y + 0.0105;
const vec = (x, y, z) => new THREE.Vector3(x, y, z);
export function alarmRig() {
  const group = new THREE.Group();
  function label(text, x, z, width, y = 0.001) {
    const tag = textPlate(text, {
      w: width,
      h: 0.011,
      font: 'bold ' + Math.round((512 * 0.0085) / width) + 'px sans-serif',
      bg: '#eadfc7',
    });
    tag.rotation.x = -Math.PI * 0.39;
    tag.position.set(x, y + 0.003, z);
    group.add(tag);
    return tag;
  }
  block(group, 0.153, 0.009, 0.088, HINGE + 0.055, 0.0045, DOOR_Z, 0x9c7756);
  for (const x of [HINGE - 0.006, HINGE + 0.117]) block(group, 0.011, 0.154, 0.018, x, 0.086, DOOR_Z, 0x9b7452);
  block(group, 0.134, 0.013, 0.018, HINGE + 0.055, 0.158, DOOR_Z, 0x987151);
  const door = new THREE.Group();
  group.add(door);
  door.position.set(HINGE, 0.009, DOOR_Z);
  block(door, 0.108, 0.137, 0.01, 0.054, 0.069, 0, 0xcfad82);
  block(door, 0.089, 0.105, 0.001, 0.054, 0.067, 0.0058, 0xe2c797);
  const handle = block(door, 0.017, 0.009, 0.017, 0.095, 0.067, 0.012, 0x826448);
  const mount = block(door, 0.027, 0.003, 0.018, MOUNT_X, MOUNT_Y - 0.009 - 0.004, MOUNT_Z, 0x795f53);
  for (const y of [0.034, 0.115]) {
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.0027, 0.0027, 0.014, 16), paint(0x777b7a));
    hinge.position.set(HINGE, y, DOOR_Z);
    group.add(hinge);
  }
  const reedLabel = textPlate('SA', {
    w: 0.02,
    h: 0.01,
    font: 'bold 195px sans-serif',
    color: '#483f30',
    bg: '#e7d8b6',
  });
  reedLabel.position.set(HINGE + 0.059, 0.158, DOOR_Z + 0.0092);
  group.add(reedLabel);
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
  block(magnet, 0.009, 0.007, 0.008, -0.0045, 0, 0, 0x487caa);
  block(magnet, 0.009, 0.007, 0.008, 0.0045, 0, 0, 0xbf5845);
  const pick = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.015, 0.017),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  pick.userData.pick = true;
  magnet.add(pick);
  group.add(magnet);
  const homeMagnet = vec(-0.07, 0.0035, DOOR_Z + MOUNT_Z);
  magnet.position.copy(homeMagnet);

  const relay = relayMechanism();
  relay.group.position.set(0.035, 0, -0.015);
  relay.group.scale.setScalar(0.8);
  group.add(relay.group);
  const board = block(group, 0.487, 0.006, 0.254, -0.006, 0, -0.002, 0xddc9a6);
  board.position.y = -0.003;
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
  label('R  330 Ω', 0.188, -0.003, 0.043);
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
  label('LED', 0.193, 0.023, 0.029);
  const buzzer = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.012, 40), paint(0x424a4e));
  buzzer.position.set(0.17, 0.008, 0.076);
  group.add(buzzer);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.004, 24), new THREE.MeshBasicMaterial({ color: 0x171d21 }));
  hole.rotation.x = -Math.PI / 2;
  hole.position.set(0.17, 0.0142, 0.076);
  group.add(hole);
  label('H', 0.196, 0.083, 0.014);
  wire(group, [switched, [0.213, 0.003, -0.028], [0.217, 0.003, 0.064], [0.182, 0.004, 0.075]], 0x985f49);
  wire(
    group,
    [
      switched,
      [0.115, 0.004, -0.069],
      [-0.092, 0.014, -0.073],
      [-0.092, 0.03, -0.073],
      [HINGE + 0.115, 0.148, DOOR_Z - 0.009],
      [reed.position.x + 0.02, reedY, reed.position.z],
    ],
    0x97614f,
  );

  const tips = {};
  function terminal(id, x, z, symbol, color = 0x8e6a4b) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.009, 18), paint(color));
    post.position.set(x, 0.007, z);
    group.add(post);
    tips[id] = vec(x, 0.0115, z);
    label(symbol, x, z + 0.016, 0.019);
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
  label('c', 0.002, -0.011, 0.014, 0.04);
  const anchors = [
    vec(reed.position.x - 0.02, reedY, reed.position.z),
    vec(0.003, 0.041, -0.015),
    vec(0.159, 0.013, 0.022),
    vec(0.159, 0.004, 0.076),
  ];
  const homes = [
    vec(-0.048, 0.005, 0.028),
    vec(0.018, 0.005, 0.095),
    vec(0.113, 0.005, 0.08),
    vec(0.093, 0.005, 0.098),
  ];
  const wires = anchors.map((anchor, i) => {
    const color = [0x9e644f, 0x3f4748, 0x387858, 0xcb913c][i];
    const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.0058, 0.0058, 0.01, 16), paint(color));
    const dock = new THREE.Mesh(new THREE.RingGeometry(0.007, 0.009, 32), new THREE.MeshBasicMaterial({ color }));
    dock.rotation.x = -Math.PI / 2;
    dock.position.copy(homes[i]).y = 0.0005;
    group.add(dock);
    plug.position.copy(homes[i]);
    group.add(plug);
    const grip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.009, 0.012, 16),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    grip.userData.pick = true;
    plug.add(grip);
    const wire = new THREE.Mesh(new THREE.BufferGeometry(), paint(color));
    wire.raycast = () => {};
    group.add(wire);
    return { anchor, plug, wire, home: homes[i], to: null };
  });
  function route(i) {
    const l = wires[i],
      end = l.plug.position;
    const middle = l.anchor.clone().lerp(end, 0.55);
    middle.y = 0.007;
    middle.z += i === 0 ? 0.04 : 0.023;
    const points =
      i === 0
        ? [
            l.anchor,
            vec(HINGE - 0.012, reedY, reed.position.z),
            vec(HINGE - 0.014, 0.028, DOOR_Z + 0.02),
            vec(HINGE - 0.014, 0.01, DOOR_Z + 0.055),
            middle,
            end,
          ]
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
  const soundArcs = new THREE.Group();
  for (const radius of [0.013, 0.02]) {
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.0012, 8, 24, Math.PI * 0.68),
      new THREE.MeshBasicMaterial({ color: 0xbe6829 }),
    );
    arc.rotation.z = Math.PI * 0.16;
    soundArcs.add(arc);
  }
  soundArcs.position.copy(buzzer.position).y += 0.008;
  group.add(soundArcs);
  const glow = new THREE.Mesh(
    new THREE.RingGeometry(0.008, 0.011, 36),
    new THREE.MeshBasicMaterial({ color: 0x81df8f, side: THREE.DoubleSide }),
  );
  glow.position.set(lamp.position.x, 0.011, lamp.position.z);
  glow.rotation.x = -Math.PI / 2;
  group.add(glow);
  const openLabel = label('S 断开', 0.203, -0.071, 0.04);
  const closedLabel = label('S 闭合', 0.203, -0.071, 0.04);
  const switchPick = new THREE.Mesh(
    new THREE.BoxGeometry(0.057, 0.042, 0.024),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  switchPick.userData.pick = true;
  switchPick.position.y = 0.022;
  S.group.add(switchPick);
  function draw(state) {
    openLabel.visible = !S.closed;
    closedLabel.visible = S.closed;
    soundArcs.visible = state.buzzing;
    glow.visible = state.ledCurrent > 0;
    for (const { leaf, sign } of leaves) {
      leaf.rotation.z = sign * (state.reed ? 0.015 : 0.055);
      leaf.position.y = sign * (state.reed ? 0.00015 : 0.00064);
    }
    relay.arm.rotation.z = THREE.MathUtils.lerp(0.04, -0.065, state.travel);
    lamp.material.color.setHex(state.ledCurrent > 0 ? 0x87ff93 : 0x284337);
  }
  return {
    group,
    door,
    handle,
    mount,
    magnet,
    homeMagnet,
    magnetPick: pick,
    switchPick,
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

// 笔记本里放大簧片的实际状态；装好门磁后，换成按课本图 5.3-2 重画的接线参照。
export function alarmNotebook(canvas) {
  const pen = canvas.getContext('2d');
  function line(points, color = '#434c46', width = 1.8) {
    pen.strokeStyle = color;
    pen.lineWidth = width;
    pen.beginPath();
    points.forEach(([x, y], i) => (i ? pen.lineTo(x, y) : pen.moveTo(x, y)));
    pen.stroke();
  }
  function text(value, x, y, size = 14) {
    pen.fillStyle = '#35443c';
    pen.font = size + 'px system-ui, sans-serif';
    pen.fillText(value, x, y);
  }
  function dot(x, y) {
    pen.fillStyle = '#434c46';
    pen.beginPath();
    pen.arc(x, y, 2.6, 0, Math.PI * 2);
    pen.fill();
  }
  let previous;
  return (mounted, state, connected, power) => {
    const closed = state.reed;
    const live = mounted && connected;
    const key = live
      ? [closed, power, state.contact, state.buzzing, !!state.ledCurrent].join('/')
      : mounted
        ? 'reference'
        : closed;
    if (key === previous) return;
    previous = key;
    canvas.height = mounted ? 170 : 90;
    pen.clearRect(0, 0, 310, canvas.height);
    text(live ? '电路实况 · 触点位置示意' : mounted ? '接线参考 · 图 5.3-2' : '干簧管 SA · 簧片放大示意', 8, 21);
    if (!mounted) {
      pen.fillStyle = '#d5e7df';
      pen.beginPath();
      pen.ellipse(151, 55, 104, 20, 0, 0, Math.PI * 2);
      pen.fill();
      line(
        [
          [17, 53],
          [64, 53],
          [157, closed ? 55 : 46],
        ],
        '#53645c',
        4,
      );
      line(
        [
          [287, 57],
          [240, 57],
          [145, closed ? 58 : 65],
        ],
        '#7d8980',
        4,
      );
      return;
    }
    pen.save();
    pen.strokeStyle = '#9a998b';
    pen.lineWidth = 1;
    pen.setLineDash([4, 3]);
    pen.strokeRect(16, 108, 174, 38);
    pen.restore();
    // 供电母线：电池长线为正极。S、SA 和 c 均画在未通电、磁体远离的位置。
    line([
      [42, 55],
      [42, 41],
      [248, 41],
      [248, 58],
    ]);
    line([
      [248, 77],
      [248, 97],
    ]);
    line([[248, 77], live && power ? [248, 58] : [237, 59]]);
    line([
      [237, 97],
      [259, 97],
    ]);
    line([
      [242, 103],
      [254, 103],
    ]);
    line([
      [248, 103],
      [248, 152],
      [42, 152],
      [42, 133],
    ]);
    line([
      [42, 55],
      [42, 67],
    ]);
    line([
      [42, 83],
      [42, 113],
    ]);
    line([[42, 83], live && closed ? [42, 67] : [36, 66]]);
    pen.strokeRect(30, 113, 24, 20);
    text('SA', 54, 78);
    text('K', 58, 129);
    text('S', 259, 74);
    text('6 V', 263, 106);
    line([
      [109, 41],
      [109, 68],
    ]);
    line([
      [109, 84],
      [109, 120],
    ]);
    pen.strokeRect(101, 68, 16, 16);
    line([
      [101, 69],
      [95, 65],
      [95, 87],
      [101, 83],
    ]);
    text('H', 119, 82);
    line([
      [164, 41],
      [164, 54],
    ]);
    pen.strokeRect(159, 54, 10, 20);
    line([
      [164, 74],
      [164, 85],
    ]);
    line([
      [157, 85],
      [171, 85],
      [164, 96],
      [157, 85],
    ]);
    line([
      [156, 97],
      [172, 97],
    ]);
    line([
      [164, 97],
      [164, 120],
    ]);
    for (const x of [172, 178]) {
      line([
        [x, 88],
        [x + 6, 82],
        [x + 3, 83],
      ]);
      line([
        [x + 6, 82],
        [x + 5, 85],
      ]);
    }
    text('R', 176, 68);
    text('LED', 187, 98);
    if (live && state.ledCurrent) {
      pen.fillStyle = '#437f52';
      pen.beginPath();
      pen.moveTo(157, 85);
      pen.lineTo(171, 85);
      pen.lineTo(164, 96);
      pen.fill();
    }
    if (live && state.buzzing) {
      for (const radius of [8, 13]) {
        pen.strokeStyle = '#b96a30';
        pen.beginPath();
        pen.arc(96, 76, radius, Math.PI * 0.73, Math.PI * 1.27);
        pen.stroke();
      }
    }
    dot(109, 120);
    dot(164, 120);
    dot(139, 139);
    const contactX = !live || state.contact === 'b' ? 109 : state.contact === 'a' ? 164 : 139;
    line([
      [contactX, 120],
      [139, 139],
      [139, 152],
    ]);
    text('b', 94, 127);
    text('a', 172, 126);
    text('c', 147, 144);
    dot(109, 41);
    dot(164, 41);
    dot(139, 152);
  };
}
