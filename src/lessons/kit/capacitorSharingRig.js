// 图10.4-4：固定接线，只移动两把原样式刀闸。
import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { battery } from './circuit.js';
import { capacitorBody, capacitorSelector, capacitorVoltmeter, capacitorDischargeSwitch } from './capacitorParts.js';

export function capacitorSharingRig() {
  const group = new THREE.Group();
  const source = battery('E', { cells: 4, emf: 1.5 });
  const selector = capacitorSelector('S₁'),
    discharge = capacitorDischargeSwitch();
  const a = capacitorBody('A'),
    b = capacitorBody('B'),
    meter = capacitorVoltmeter('V');
  const parts = [
    [source, -0.145, -0.115],
    [selector, -0.02, -0.035],
    [a, 0.13, 0.025],
    [b, -0.02, 0.105],
    [discharge, -0.13, 0.105],
    [meter, 0.15, -0.095],
  ];
  for (const [part, x, z] of parts) {
    part.group.position.set(x, 0, z);
    group.add(part.group);
  }
  a.group.name = 'sharing-capacitor-A';
  b.group.name = 'sharing-capacitor-B';
  meter.screen.name = 'sharing-voltmeter';
  group.updateMatrixWorld(true);
  const at = (obj) => group.worldToLocal(obj.getWorldPosition(new THREE.Vector3())).toArray();
  const terminal = (name) =>
    group.worldToLocal(source.group.localToWorld(new THREE.Vector3(...source.terminals[name]))).toArray();
  const wires = [];
  function wire(from, to, color, via = []) {
    const points = [from, ...via, to].map((p) => new THREE.Vector3(...p));
    if (points.length === 2) {
      const middle = points[0].clone().lerp(points[1], 0.5);
      middle.y += 0.006;
      points.splice(1, 0, middle);
    }
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 72, 0.0014, 8, false), paint(color));
    mesh.name = 'sharing-wire';
    group.add(mesh);
    wires.push(mesh);
  }
  const red = 0xb44f37,
    dark = 0x4c5758;
  wire(terminal('+'), at(selector.throws[0]), red, [
    [-0.04, 0.018, -0.09],
    [-0.06, 0.014, -0.078],
  ]);
  wire(at(selector.hinge), at(a.positive), red, [[0.045, 0.014, 0]]);
  wire(at(a.positive), at(meter.positive), red, [
    [0.085, 0.012, -0.01],
    [0.105, 0.021, -0.048],
    [0.13, 0.022, -0.065],
  ]);
  wire(at(selector.throws[1]), at(b.positive), red, [
    [0.04, 0.012, -0.08],
    [0.05, 0.03, 0],
    [0.05, 0.012, 0.065],
    [-0.042, 0.012, 0.065],
  ]);
  wire(at(b.positive), at(discharge.contact), red, [[-0.042, 0.022, 0.103], [-0.065, 0.022, 0.105]]);
  // All black branches end at visible junctions on the common return.
  const nodes = [-0.16, 0.03, 0.19].map((x) => [x, 0.008, 0.185]);
  for (const p of nodes) {
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.003, 16, 8), paint(dark));
    node.position.set(...p);
    group.add(node);
  }
  wire(terminal('-'), nodes[0], dark, [
    [-0.28, 0.01, -0.07],
    [-0.28, 0.008, 0.16],
  ]);
  wire(nodes[0], nodes[1], dark);
  wire(nodes[1], nodes[2], dark);
  wire(nodes[2], at(meter.negative), dark, [
    [0.215, 0.008, 0.15],
    [0.215, 0.008, -0.06],
  ]);
  wire(at(discharge.hinge), nodes[0], dark, [[-0.18, 0.012, 0.135]]);
  wire(at(b.negative), nodes[1], dark, [[0.025, 0.012, 0.14]]);
  wire(at(a.negative), nodes[2], dark, [[0.19, 0.012, 0.055]]);
  return {
    group,
    selector,
    discharge,
    a,
    b,
    meter,
    wires,
    dispose() {
      for (const part of [selector, discharge, a, b, meter]) part.dispose();
    },
  };
}
