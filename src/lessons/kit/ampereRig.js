// 悬线同时是导线。磁体先沿导杆退出，翻面后再进入棒的下方，翻转过程中不穿过悬棒。
import * as THREE from 'three';
import { stand, textPlate } from './props.js';
import { block, wire, wireGeometry } from './electronicsBench.js';
import { psuPart, switchPart } from './circuit.js';
import { paint } from '../../live/ink.js';
import { SUSPENSION } from './ampereRod.js';

const MID = 0.112,
  PIVOT = MID + SUSPENSION,
  HALF = 0.057;
export function ampereRig() {
  const group = new THREE.Group();
  const frame = stand({ height: PIVOT + 0.02, baseW: 0.105, baseD: 0.095 });
  frame.position.set(-0.082, 0, 0);
  frame.clamp(PIVOT, 0.179);
  group.add(frame);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, HALF * 2 + 0.008, 20), paint(0xc09257));
  rod.rotation.z = Math.PI / 2;
  group.add(rod);
  const threads = [-HALF, HALF].map((x) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0009, SUSPENSION, 10), paint(0x645b49));
    group.add(m);
    // 两只绝缘环将导电悬线与金属支架隔开。
    block(group, 0.009, 0.014, 0.012, x, PIVOT, 0, 0xc5bb9e);
    const mark = textPlate(x < 0 ? 'A' : 'B', {
      w: 0.012,
      h: 0.009,
      color: '#343434',
      bg: '#efe4c9',
      font: 'bold 290px sans-serif',
    });
    mark.position.set(x, PIVOT + 0.009, 0.007);
    group.add(mark);
    return m;
  });
  function swing(a) {
    const z = SUSPENSION * Math.sin(a),
      y = PIVOT - SUSPENSION * Math.cos(a);
    rod.position.set(0, y, z);
    threads.forEach((m, i) => {
      m.position.set(i ? HALF : -HALF, (y + PIVOT) / 2, z / 2);
      m.rotation.x = -a;
    });
  }
  const magnet = new THREE.Group();
  block(magnet, 0.035, 0.014, 0.092, 0, 0.027, -0.009, 0x356ac3);
  block(magnet, 0.035, 0.014, 0.092, 0, -0.027, -0.009, 0xcf4334);
  block(magnet, 0.035, 0.068, 0.014, 0, 0, -0.061, 0x727a80);
  for (const [pole, sign] of [
    ['S', 1],
    ['N', -1],
  ]) {
    const tag = textPlate(pole, { w: 0.019, h: 0.011, color: '#ffffff', font: 'bold 245px sans-serif' });
    tag.position.set(0, sign * 0.027, 0.0372);
    magnet.add(tag);
  }
  group.add(magnet);
  // 后支架托住一根可轴向移动并翻转的圆柄。
  block(group, 0.049, MID, 0.024, 0, MID / 2, -0.178, 0x767a7a);
  const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.145, 12), paint(0x989ea2));
  spindle.rotation.x = Math.PI / 2;
  spindle.position.z = -0.13;
  magnet.add(spindle);
  function flip(t) {
    const travel = Math.min(1, 3 * t, 3 * (1 - t));
    magnet.position.set(0, MID, -0.078 * travel);
    magnet.rotation.z = Math.PI * Math.max(0, Math.min(1, 3 * t - 1));
  }
  const source = psuPart('直流电源', { U: 3 }),
    sw = switchPart('电键');
  source.group.position.set(0.11, 0, 0.09);
  sw.group.position.set(-0.015, 0, 0.095);
  group.add(source.group, sw.group);
  const switchHit = new THREE.Mesh(
    new THREE.BoxGeometry(0.068, 0.052, 0.033),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  switchHit.position.y = 0.024;
  switchHit.userData.pick = true;
  sw.group.add(switchHit);
  const socket = ['+', '-'].map((k) => new THREE.Vector3(...source.terminals[k]).add(source.group.position));
  const at = (which) => new THREE.Vector3(...sw.terminals[which]).add(sw.group.position).toArray();
  wire(
    group,
    [
      at('b'),
      [0.023, 0.011, 0.07],
      [-0.077, 0.011, 0.056],
      [-0.106, 0.035, 0.011],
      [-0.106, PIVOT, 0.011],
      [-HALF, PIVOT, 0],
    ],
    0x92584a,
  );
  const cables = [],
    plugs = [];
  for (const [i, col] of [0xa2503e, 0x475b71].entries()) {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.0047, 0.0047, 0.015, 14), paint(col));
    group.add(handle);
    plugs.push(handle);
    cables.push(new THREE.Mesh(new THREE.BufferGeometry(), paint(col)));
    group.add(cables[i]);
  }
  function lead(i, p) {
    plugs[i].position.copy(p);
    const path = i
      ? [
          [HALF, PIVOT, 0],
          [0.094, PIVOT, 0.006],
          [0.095, 0.012, 0.008],
          [0.081, 0.008, 0.061],
        ]
      : [at('a'), [-0.059, 0.009, 0.132], [0.063, 0.009, 0.135]];
    path.push([p.x, 0.012, p.z + 0.016], p.toArray());
    cables[i].geometry.dispose();
    cables[i].geometry = wireGeometry(path);
    cables[i].raycast = () => {};
  }
  swing(0);
  flip(0);
  socket.forEach((p, i) => lead(i, p));
  return { group, magnet, source, sw, rod, plugs, socket, swing, flip, lead };
}
