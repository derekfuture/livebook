import * as THREE from 'three';
import { stand, textPlate } from './props.js';
import { block, wire, wireGeometry, caption } from './electronicsBench.js';
import { psuPart, switchPart, rheostatPart, meterPart } from './circuit.js';
import { paint } from '../../live/ink.js';
import { AMPERE_TAPS } from './ampereFactors.js';
export const AMPERE_PIVOT = 0.19;
export function ampereFactorsRig() {
  const group = new THREE.Group(),
    frame = stand({ height: 0.22, baseW: 0.075, baseD: 0.1 });
  frame.position.set(-0.11, 0, 0);
  frame.clamp(AMPERE_PIVOT, 0.19);
  group.add(frame);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.15, 20), paint(0xc09257));
  rod.rotation.z = Math.PI / 2;
  rod.name = 'ampere-rod';
  group.add(rod);
  const sockets = AMPERE_TAPS.map((x) => new THREE.Vector3(x, AMPERE_PIVOT + 0.006, 0.012));
  const threads = AMPERE_TAPS.map((x, i) => {
    block(group, 0.009, 0.014, 0.014, x, AMPERE_PIVOT, 0, 0xc8bb99);
    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.005, 14), paint(0xa69360));
    socket.position.copy(sockets[i]);
    group.add(socket);
    const tag = textPlate(String(i + 1), {
      w: 0.012,
      h: 0.01,
      bg: '#efe4c9',
      color: '#343434',
      font: 'bold 290px sans-serif',
    });
    tag.position.set(x, AMPERE_PIVOT + 0.016, 0.009);
    group.add(tag);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.00055, 0.00055, 0.14, 10), paint(0x645b49));
    group.add(m);
    return m;
  });
  const observation = new THREE.Group();
  observation.name = 'suspension-observation';
  group.add(observation);
  // Transparent picking volume follows the outermost suspension. It does not draw a second rod.
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.15, 0.02), new THREE.MeshBasicMaterial({ visible: false }));
  hit.userData.pick = true;
  observation.add(hit);
  for (const x of [-0.04, 0, 0.04]) {
    const magnet = new THREE.Group();
    magnet.position.x = x;
    group.add(magnet);
    block(magnet, 0.036, 0.014, 0.17, 0, 0.007, 0, 0xcf4334);
    block(magnet, 0.036, 0.014, 0.17, 0, 0.093, 0, 0x356ac3);
    block(magnet, 0.036, 0.1, 0.014, 0, 0.05, -0.092, 0x727a80);
    for (const [sign, y] of [
      ['N', 0.007],
      ['S', 0.093],
    ]) {
      const t = textPlate(sign, { w: 0.016, h: 0.011, color: '#ffffff', font: 'bold 245px sans-serif' });
      t.position.set(0, y, 0.0852);
      magnet.add(t);
    }
  }
  function swing(a) {
    const y = AMPERE_PIVOT - 0.14 * Math.cos(a),
      z = 0.14 * Math.sin(a);
    rod.position.set(0, y, z);
    threads.forEach((m, i) => {
      m.position.set(AMPERE_TAPS[i], (y + AMPERE_PIVOT) / 2, z / 2);
      m.rotation.x = -a;
    });
    observation.position.set(0.06, (y + AMPERE_PIVOT) / 2, z / 2);
    observation.rotation.x = -a;
  }
  const source = psuPart('E', { U: 3, r: 0.1 }),
    sw = switchPart('S'),
    rheostat = rheostatPart('P', { Rmax: 5, pos: 0.5 }),
    meter = meterPart('A', { type: 'A' });
  source.group.position.set(-0.17, 0, 0.19);
  sw.group.position.set(-0.055, 0, 0.19);
  rheostat.group.position.set(0.09, 0, 0.19);
  meter.group.position.set(0.22, 0, 0.14);
  group.add(source.group, sw.group, rheostat.group, meter.group);
  const switchHit = new THREE.Mesh(
    new THREE.BoxGeometry(0.068, 0.052, 0.033),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  switchHit.position.y = 0.024;
  switchHit.userData.pick = true;
  sw.group.add(switchHit);
  const at = (p, k) => new THREE.Vector3(...p.terminals[k]).add(p.group.position).toArray();
  const resistor = block(group, 0.065, 0.016, 0.022, 0.19, 0.008, -0.07, 0xe2d9bd);
  resistor.name = 'ceramic-ballast';
  caption(group, '1.5 Ω 10 W', 0.19, 0.0162, -0.07, 0.063, 0.014);
  wire(group, [at(source, '+'), [-0.12, 0.012, 0.24], at(sw, 'a')], 0xa2503e);
  wire(group, [at(sw, 'b'), [0.005, 0.012, 0.24], at(rheostat, 'A')], 0xa2503e);
  wire(group, [at(rheostat, 'C'), [0.15, 0.02, 0.13], [0.26, 0.018, 0.19], at(meter, '3')], 0xa2503e);
  wire(group, [at(meter, '-'), [0.19, 0.02, 0.06], [0.23, 0.016, -0.07], [0.2225, 0.008, -0.07]], 0x475b71);
  const cables = [],
    plugs = [];
  for (const col of [0xa2503e, 0x475b71]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.014, 14), paint(col));
    group.add(m);
    plugs.push(m);
    const cable = new THREE.Mesh(new THREE.BufferGeometry(), paint(col));
    cable.raycast = () => {};
    group.add(cable);
    cables.push(cable);
  }
  function lead(i, p) {
    plugs[i].position.copy(p);
    const path = i
      ? [at(source, '-'), [-0.22, 0.016, 0.12], [-0.15, 0.08, 0.08], [-0.09, 0.215, 0.028]]
      : [
          [0.1575, 0.008, -0.07],
          [0.13, 0.016, -0.08],
          [0.12, 0.15, -0.015],
          [0.09, 0.22, 0.025],
        ];
    path.push([p.x, 0.22, p.z + 0.018], p.toArray());
    cables[i].geometry.dispose();
    cables[i].geometry = wireGeometry(path, 0.001);
  }
  // Red cable goes from the ballast to the rod; black returns to the supply.
  sockets.slice(1, 3).forEach((p, i) => lead(i, p));
  swing(0);
  caption(group, '2—3：4 cm    1—4：12 cm', -0.02, 0.0004, 0.12, 0.19, 0.015);
  caption(group, '三块磁体保持不动', -0.015, 0.0004, -0.13, 0.17, 0.014);
  return { group, rod, threads, observation, sockets, plugs, source, sw, rheostat, meter, swing, lead };
}
