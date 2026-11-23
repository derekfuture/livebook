import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { Circuit } from './circuit.js';
import { multimeterTool } from './multimeterTool.js';
import { block } from './electronicsBench.js';
import { beaker, textPlate } from './props.js';
import { THERMISTOR_BULB_RADIUS, THERMISTOR_HAND, THERMISTOR_WATER, thermistorExposure } from './thermistor.js';
import { THERMISTOR_HOME, THERMISTOR_CUP_OUTER_RADIUS } from './thermistorMotion.js';

export function thermistorRig() {
  const circuit = new Circuit(),
    group = circuit.group;
  block(group, 0.58, 0.006, 0.34, 0, -0.003, 0, 0xc8ac80);
  const meter = circuit.add(multimeterTool(), [-0.185, -0.02]);
  function label(text, x, z, w = 0.1) {
    const m = textPlate(text, {
      w,
      h: 0.014,
      bg: '#e9d9b7',
      font: `bold ${Math.min(430 / [...text].length, (0.014 / w) * 400)}px sans-serif`,
    });
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.001, z);
    group.add(m);
    return m;
  }
  const ports = new THREE.Group();
  block(ports, 0.067, 0.009, 0.032, 0, 0.0045, 0, 0x66756b);
  for (const x of [-0.022, 0.022]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.011, 16), paint(0xb8b5a6));
    p.position.set(x, 0.013, 0);
    ports.add(p);
  }
  const thermistor = circuit.add(
    {
      name: 'N',
      group: ports,
      terminals: { a: [-0.022, 0.0185, 0], b: [0.022, 0.0185, 0] },
      R: 2517.13,
      power: 0,
      branches() {
        return [{ a: 'a', b: 'b', R: this.R }];
      },
      read([branch]) {
        this.power = branch.I ** 2 * this.R;
      },
    },
    [-0.025, -0.11],
  );
  label('感温头接点', -0.025, -0.143, 0.096);

  const cup = beaker({
    r: THERMISTOR_CUP_OUTER_RADIUS,
    h: THERMISTOR_WATER.rim,
    level: THERMISTOR_WATER.surface,
    opacity: 0.32,
  });
  cup.position.set(THERMISTOR_WATER.x, 0, THERMISTOR_WATER.z);
  group.add(cup);
  label('冷水', 0.16, 0.121, 0.07);

  const hand = new THREE.Group();
  hand.position.set(THERMISTOR_HAND.x, THERMISTOR_HAND.y, THERMISTOR_HAND.z);
  group.add(hand);
  const skin = paint(0xd6a578);
  function ball(parent, point, r, scale = null) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), skin);
    m.position.set(...point);
    if (scale) m.scale.set(...scale);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function finger(points, r) {
    for (let i = 0; i < points.length; i++) {
      ball(hand, points[i], r);
      if (!i) continue;
      const a = new THREE.Vector3(...points[i - 1]),
        b = new THREE.Vector3(...points[i]),
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 20), skin);
      mesh.position.copy(a).add(b).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      mesh.castShadow = mesh.receiveShadow = true;
      hand.add(mesh);
    }
  }
  ball(hand, [-0.044, -0.02, -0.012], 1, [0.027, 0.012, 0.026]);
  // 拇指和食指留有开口；原感温头从上方放到两指腹间。
  finger(
    [
      [-0.047, -0.014, -0.027],
      [-0.023, 0.008, -0.021],
      [0, 0, -0.0105],
    ],
    0.006,
  );
  finger(
    [
      [-0.049, -0.025, 0.004],
      [-0.02, -0.012, 0.026],
      [0, 0, 0.0105],
    ],
    0.006,
  );
  for (let i = 0; i < 3; i++)
    finger(
      [
        [-0.06 + i * 0.009, -0.023, -0.026],
        [-0.057 + i * 0.009, -0.027, -0.045],
        [-0.044 + i * 0.009, -0.034, -0.043],
      ],
      0.005,
    );
  label('指间温热接触', 0.015, 0.123, 0.12);

  // 支架承托同一个感温头。横臂伸缩、立柱滑块随握柄移动，停下时不会悬空。
  const standX = 0.235,
    standZ = -0.065;
  block(group, 0.067, 0.009, 0.15, standX, 0.0045, standZ, 0x536468);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.29, 24), paint(0x9ca5a2));
  rod.position.set(standX, 0.15, standZ);
  group.add(rod);
  for (const y of [0.035, 0.272]) block(group, 0.018, 0.005, 0.023, standX, y, standZ - 0.005, 0x586967);
  const collar = block(group, 0.017, 0.018, 0.019, standX, 0.22, standZ, 0x586967);
  const armX = block(group, 1, 0.006, 0.006, 0, 0, standZ, 0x929e9b),
    armZ = block(group, 0.006, 0.006, 0.12, 0, 0, -0.005, 0x929e9b);
  const clamp = block(group, 0.021, 0.012, 0.019, 0, 0, THERMISTOR_WATER.z, 0x526364);
  const probe = new THREE.Group();
  group.add(probe);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(THERMISTOR_BULB_RADIUS, 32, 20), paint(0x393f39));
  probe.add(bulb);
  bulb.castShadow = true;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.094, 20), paint(0x898f83));
  stem.position.y = 0.048;
  probe.add(stem);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.023, 24), paint(0x333d3c));
  grip.position.y = 0.079;
  probe.add(grip);
  grip.castShadow = true;
  label('绝缘封装 NTC', 0.08, -0.003, 0.11);
  const cables = [-1, 1].map((sign) => {
    const m = new THREE.Mesh(new THREE.BufferGeometry(), paint(sign < 0 ? 0x5a6055 : 0xa89668));
    m.raycast = () => {};
    group.add(m);
    return m;
  });
  function setProbe(p) {
    probe.position.set(p.x, p.y, THERMISTOR_WATER.z);
    const height = p.y + 0.1;
    collar.position.y = height;
    armX.position.set((standX + p.x) / 2, height, standZ);
    armX.scale.x = standX - p.x;
    armZ.position.set(p.x, height, -0.005);
    clamp.position.set(p.x, height, THERMISTOR_WATER.z);
    cables.forEach((m, i) => {
      const sign = i ? 1 : -1,
        start = circuit.terminalWorld(i ? 'N.b' : 'N.a');
      const pts = [
        start.toArray(),
        [start.x, 0.008, -0.145],
        [standX + sign * 0.006, 0.018, standZ - 0.012],
        [standX + sign * 0.006, 0.273, standZ - 0.012],
        [(standX + p.x) / 2 + sign * 0.003, Math.min(0.273, height + 0.003) - 0.025, -0.018],
        [p.x + sign * 0.002, height + 0.003, THERMISTOR_WATER.z],
      ];
      m.geometry.dispose();
      const bend = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
      const supported = new THREE.Curve();
      supported.getPoint = (t, target = new THREE.Vector3()) => {
        bend.getPoint(t, target);
        target.y = Math.max(0.003, target.y); // 余线落在台面上，不能由样条过冲穿到板下。
        return target;
      };
      m.geometry = new THREE.TubeGeometry(supported, 120, 0.001, 7, false);
    });
    group.updateMatrixWorld(true);
  }
  setProbe(THERMISTOR_HOME);
  function dispose() {
    meter.dispose();
    circuit.dispose();
    const geometries = new Set(),
      materials = new Set(),
      textures = new Set();
    group.traverse((o) => {
      if (o.geometry) geometries.add(o.geometry);
      for (const m of o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []) {
        materials.add(m);
        if (m.map) textures.add(m.map);
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  }
  return {
    group,
    circuit,
    meter,
    thermistor,
    probe,
    bulb,
    grip,
    hand,
    cup,
    setProbe,
    exposure: () => thermistorExposure(probe.position),
    dispose,
  };
}
