// 图 11.3-7。线圈两端跨接电源，滑片取出分压；电压表只跨接被测丝。
import * as THREE from 'three';
import { Circuit, battery, switchPart, rheostatPart, wirePart, meterPart } from './circuit.js';

const LENGTH = 0.56,
  DIAMETER = 0.625e-3,
  MATERIAL_RHO = 1.1e-6;

// 接线柱外各有一截余丝。它们与中间段来自同一根丝，开路的余段不贡献被测电阻。
export function resistivityBench() {
  const circuit = new Circuit();
  const sample = circuit.add(
    wirePart('X', {
      length: LENGTH,
      R: (MATERIAL_RHO * LENGTH) / ((Math.PI * DIAMETER ** 2) / 4),
      color: 0xaf6c4b,
      thick: DIAMETER / 2,
    }),
    [0, 0.035],
  );
  for (const [side, tail] of [
    [-1, 0.027],
    [1, 0.041],
  ]) {
    const end = new THREE.Mesh(
      new THREE.CylinderGeometry(DIAMETER / 2, DIAMETER / 2, tail, 12),
      sample.wireMesh.material,
    );
    end.rotation.z = Math.PI / 2;
    end.position.set((side * (LENGTH + tail)) / 2, sample.wireMesh.position.y, 0);
    sample.group.add(end);
  }
  const source = circuit.add(battery('E', { cells: 1, emf: 1.5, r: 0.6 }), [-0.205, -0.142]);
  const sw = circuit.add(switchPart('S'), [0.205, -0.142]);
  const divider = circuit.add(rheostatPart('P', { Rmax: 10, pos: 0 }), [0, -0.152]);
  const ammeter = circuit.add(meterPart('A', { type: 'A' }), [0.17, -0.045]);
  const voltmeter = circuit.add(meterPart('V', { type: 'V' }), [-0.12, -0.045]);
  const fixed = [
    ['E.+', 'P.A'],
    ['P.B', 'S.a'],
    ['S.b', 'E.-'],
    ['P.A', 'X.a', { points: [
      [-0.085, 0.024, -0.105],
      [-0.20, 0.022, -0.105],
      [-0.22, 0.018, -0.065],
      [-0.26, 0.018, 0.015],
    ] }],
    ['A.-', 'P.C'],
  ];
  const leads = [
    ['X.b', 'A.0.6'],
    ['X.a', 'V.3'],
    ['X.b', 'V.-'],
  ];
  for (const [a, b, options] of fixed) circuit.wire(a, b, options);
  circuit.solve();
  return { circuit, source, sw, divider, sample, ammeter, voltmeter, fixed, leads };
}
