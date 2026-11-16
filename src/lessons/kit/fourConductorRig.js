import * as THREE from 'three';
import { Circuit, battery, switchPart, rheostatPart, wirePart } from './circuit.js';
import { capacitorVoltmeter } from './capacitorParts.js';
import { canvasTex } from './props.js';
import {
  FOUR_SAMPLES,
  FOUR_SOURCE,
  FOUR_RMAX,
  FOUR_METER_OHMS,
  FOUR_WIRING,
  sampleResistance,
} from './fourConductors.js';

export function fourConductorRig() {
  const circuit = new Circuit(),
    { group } = circuit,
    textures = [];
  const source = circuit.add(battery('E', FOUR_SOURCE), [-0.2, -0.25]);
  const sw = circuit.add(switchPart('S'), [0.2, -0.25]);
  const rheostat = circuit.add(rheostatPart('P', { Rmax: FOUR_RMAX, pos: 1 }), [0, -0.25]);
  function label(text, x, z, w = 0.23) {
    const tex = canvasTex(1024, 90, (c, W, H) => {
      c.fillStyle = '#e4dec7';
      c.fillRect(0, 0, W, H);
      c.fillStyle = '#273c3d';
      c.font = 'bold 65px sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(text, W / 2, H / 2, W * 0.95);
    });
    textures.push(tex);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.016), new THREE.MeshBasicMaterial({ map: tex }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.0003, z);
    group.add(mesh);
    return mesh;
  }
  const samples = FOUR_SAMPLES.map((s, i) => {
    const part = circuit.add(
      wirePart(s.id, {
        length: s.length,
        R: sampleResistance(s),
        // Keep relative diameters; enlarge only the hair-thin cross-section for visibility.
        thick: 4 * Math.sqrt(s.area / Math.PI),
        color: i === 3 ? 0x56656e : 0x52433b,
      }),
      [-0.25 + s.length / 2, -0.13 + i * 0.085],
      i % 2 ? Math.PI : 0,
    );
    part.group.name = 'four-conductor-' + s.id;
    label(s.label, part.group.position.x, part.group.position.z + 0.027);
    return part;
  });
  const digital = capacitorVoltmeter('V');
  const meter = circuit.add(
    {
      name: 'M',
      kind: 'voltmeter',
      group: digital.group,
      terminals: { red: digital.positive.position.toArray(), black: digital.negative.position.toArray() },
      branches() {
        return [{ a: 'red', b: 'black', R: FOUR_METER_OHMS }];
      },
      read(bs) {
        this.value = bs[0].U;
      },
      value: 0,
    },
    [0.15, 0.23],
  );
  const routes = [
    [
      [-0.13, 0.018, -0.31],
      [0.16, 0.018, -0.31],
    ],
    [
      [0.26, 0.02, -0.2],
      [0.1, 0.018, -0.18],
      [-0.066, 0.018, -0.2],
    ],
    [
      [-0.12, 0.035, -0.19],
      [-0.25, 0.018, -0.19],
    ],
    [
      [0.27, 0.016, -0.13],
      [0.27, 0.016, -0.045],
    ],
    [],
    [],
    [
      [-0.31, 0.016, 0.125],
      [-0.31, 0.016, -0.235],
    ],
  ];
  FOUR_WIRING.forEach(([a, b], i) =>
    circuit.wire(a, b, { points: routes[i].length ? routes[i] : undefined, color: 0x515958 }),
  );
  label('l = 24 cm   S = 0.0314 mm²', -0.105, 0.185, 0.27);
  label('细丝直径放大4倍显示', -0.105, 0.211, 0.22);
  circuit.solve();
  digital.draw(0);
  return {
    circuit,
    group,
    source,
    sw,
    rheostat,
    samples,
    meter,
    digital,
    dispose() {
      textures.forEach((t) => t.dispose());
      digital.dispose();
    },
  };
}
