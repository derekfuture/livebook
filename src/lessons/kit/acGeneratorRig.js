import * as THREE from 'three';
import { block, wire, wireGeometry } from './electronicsBench.js';
import { paint } from '../../live/ink.js';
import { textPlate, glowTexture } from './props.js';
export const AXLE_Y = 0.115,
  CRANK_Z = 0.13,
  CRANK_RADIUS = 0.055;
export function acGeneratorRig(model) {
  const group = new THREE.Group();
  function caption(parent, text, x, y, z, w, h) {
    const font = Math.min(360, 430 / [...text].length, (h / w) * 410);
    const plate = textPlate(text, { w, h, bg: '#e4d9bd', font: `bold ${font}px sans-serif` });
    plate.rotation.x = -Math.PI / 2;
    plate.position.set(x, y, z);
    parent.add(plate);
  }
  const cylinder = (parent, r, h, x, y, z, color, axis = 'y') => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), paint(color));
    if (axis === 'z') m.rotation.x = Math.PI / 2;
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  block(group, 0.23, 0.014, 0.29, 0, 0.007, 0.015, 0x627e7c);
  for (const z of [-0.06, 0.075]) {
    block(group, 0.026, 0.09, 0.018, 0, 0.059, z, 0x939c94);
    cylinder(group, 0.012, 0.02, 0, AXLE_Y, z, 0x4b5958, 'z');
  }
  for (const side of [-1, 1]) {
    block(group, 0.028, 0.144, 0.106, side * 0.077, 0.103, 0, side < 0 ? 0xb75240 : 0x466f93);
    for (const facing of [-1, 1]) {
      const label = textPlate(side < 0 ? 'N' : 'S', {
        w: 0.018,
        h: 0.02,
        bg: '#e7ddc7',
        font: 'bold 360px sans-serif',
      });
      label.position.set(side * 0.077, 0.105, facing * 0.054);
      if (facing < 0) label.rotation.y = Math.PI;
      group.add(label);
    }
  }
  block(group, 0.17, 0.014, 0.1, 0, 0.024, 0, 0x6d7673);
  const rotor = new THREE.Group();
  rotor.position.y = AXLE_Y;
  group.add(rotor);
  cylinder(rotor, 0.003, 0.235, 0, 0, 0.01, 0x9ca59f, 'z');
  const pts = [];
  for (let turn = 0; turn < 8; turn++) {
    const corners = [
      [-0.04, -0.04],
      [0.04, -0.04],
      [0.04, 0.04],
      [-0.04, 0.04],
      [-0.04, -0.04],
    ];
    corners.forEach(([y, z], corner) => {
      if (turn && corner === 0) return;
      pts.push(new THREE.Vector3(-0.0072 + (turn + corner / 4) * 0.0018, y, z));
    });
  }
  const path = new THREE.CurvePath();
  for (let i = 1; i < pts.length; i++) path.add(new THREE.LineCurve3(pts[i - 1], pts[i]));
  rotor.add(new THREE.Mesh(new THREE.TubeGeometry(path, pts.length * 5, 0.00065, 7, false), paint(0xb87e46)));
  // Each coil end connects to its own insulated slip ring, not a split-ring commutator.
  cylinder(rotor, 0.007, 0.04, 0, 0, -0.084, 0x504f45, 'z');
  const ringZ = [-0.075, -0.092];
  ringZ.forEach((z, i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0085, 0.0015, 10, 32), paint(0xc19758));
    ring.position.z = z;
    rotor.add(ring);
    // Insulated conductors run inside the hollow shaft past the rear bearing.
    // The path starts at B and ends at A with +x winding normal: when flux decreases,
    // induced current runs B -> A through the coil and A -> B through the red LED.
    const side = i ? -1 : 1;
    const leadPoints = [
      [side * 0.0072, -0.04, -0.04],
      [side * 0.0015, 0, -0.04],
      [side * 0.0015, 0, z],
      [side * 0.0085, 0, z],
    ].map((p) => new THREE.Vector3(...p));
    const leadPath = new THREE.CurvePath();
    for (let j = 1; j < leadPoints.length; j++) leadPath.add(new THREE.LineCurve3(leadPoints[j - 1], leadPoints[j]));
    rotor.add(new THREE.Mesh(new THREE.TubeGeometry(leadPath, 80, 0.0007, 7, false), paint(0xb87e46)));
    block(group, 0.005, 0.007, 0.006, 0.0115, AXLE_Y, z, 0x424a45);
  });
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.0035, 10, 48), paint(0x8f9c94));
  wheel.position.z = 0.113;
  rotor.add(wheel);
  for (const angle of [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]) {
    const spoke = block(rotor, 0.064, 0.005, 0.005, 0.032 * Math.cos(angle), 0.032 * Math.sin(angle), 0.113, 0x8f9c94);
    spoke.rotation.z = angle;
  }
  const knob = cylinder(rotor, 0.008, 0.022, CRANK_RADIUS, 0, CRANK_Z, 0x765b37, 'z');
  const knobPick = new THREE.Mesh(
    new THREE.SphereGeometry(0.015, 12, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  knobPick.userData.pick = true;
  knob.add(knobPick);
  const sockets = [-0.055, 0.055].map((x, i) => {
    const socket = cylinder(group, 0.007, 0.012, x, 0.02, 0.145, 0x4a5450);
    caption(group, i ? 'B' : 'A', x, 0.015, 0.171, 0.014, 0.011);
    wire(
      group,
      [
        [0.014, AXLE_Y, ringZ[i]],
        [i ? 0.12 : -0.12, 0.055, -0.1],
        [i ? 0.12 : -0.12, 0.018, 0.12],
        [x, 0.02, 0.145],
      ],
      0x4b5048,
      0.001,
    );
    return socket;
  });
  block(group, 0.145, 0.014, 0.17, 0.215, 0.007, 0.035, 0xc5c8af);
  const pins = [
    [0.16, 0.023, 0.105],
    [0.27, 0.023, 0.105],
  ];
  pins.forEach((p, i) => {
    cylinder(group, 0.005, 0.008, ...p, 0x666e5d);
    caption(group, i ? 'B' : 'A', p[0], 0.015, 0.118, 0.013, 0.01);
  });
  // Parallel buses, with a shared series protection resistor before the A bus.
  wire(
    group,
    [
      [0.16, 0.02, 0.105],
      [0.145, 0.02, 0.085],
      [0.145, 0.02, 0.045],
    ],
    0x9a7245,
    0.0008,
  );
  const resistor = cylinder(group, 0.0035, 0.025, 0.145, 0.021, 0.028, 0xc5aa77, 'z');
  wire(
    group,
    [
      [0.145, 0.021, 0.015],
      [0.145, 0.02, -0.025],
      [0.25, 0.02, -0.025],
    ],
    0x9a7245,
    0.0008,
  );
  wire(
    group,
    [
      [0.27, 0.023, 0.105],
      [0.27, 0.02, 0.065],
      [0.18, 0.02, 0.065],
    ],
    0x9a7245,
    0.0008,
  );
  caption(group, '180 Ω', 0.164, 0.015, 0.035, 0.032, 0.01);
  const leds = [0.19, 0.245].map((x, i) => {
    const led = new THREE.Group();
    led.position.set(x, 0.026, 0.016);
    group.add(led);
    for (const z of [-0.009, 0.009]) cylinder(led, 0.0008, 0.015, 0, -0.007, z, 0x9b9e91);
    const mat = new THREE.MeshStandardMaterial({
      color: i ? 0x8c7930 : 0x8e392e,
      roughness: 0.35,
      emissive: i ? 0xffd13b : 0xff3f20,
      emissiveIntensity: 0,
    });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.012, 20), mat);
    body.position.y = 0.006;
    led.add(body);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.008, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat);
    dome.position.y = 0.012;
    led.add(dome);
    wire(
      group,
      [
        [x, 0.019, 0.007],
        [x, 0.019, -0.025],
      ],
      0x9a7245,
      0.0008,
    );
    wire(
      group,
      [
        [x, 0.019, 0.025],
        [x, 0.019, 0.065],
      ],
      0x9a7245,
      0.0008,
    );
    caption(group, i ? '−' : '+', x, 0.015, -0.01, 0.01, 0.008);
    caption(group, i ? '+' : '−', x, 0.015, 0.046, 0.01, 0.008);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture(),
        color: i ? 0xffd13b : 0xff3f20,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    glow.position.y = 0.015;
    glow.scale.set(0.035, 0.035, 1);
    glow.raycast = () => {};
    led.add(glow);
    return { group: led, mat, glow };
  });
  caption(group, '反向并联', 0.218, 0.015, -0.041, 0.055, 0.011);
  const parked = [
    [0.12, 0.025, 0.19],
    [0.24, 0.025, 0.19],
  ];
  const plugs = parked.map((p, i) => {
    const plug = new THREE.Group();
    plug.position.fromArray(p);
    group.add(plug);
    cylinder(plug, 0.005, 0.014, 0, 0, 0, i ? 0x485e6c : 0x806449);
    cylinder(plug, 0.002, 0.009, 0, -0.01, 0, 0xaeb3a3);
    const pick = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 12, 8),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    pick.userData.pick = true;
    plug.add(pick);
    return plug;
  });
  const leads = plugs.map((plug, i) =>
    wire(group, [pins[i], [pins[i][0], 0.008, 0.155], parked[i]], i ? 0x425d70 : 0x806449, 0.0014),
  );
  function layoutLeads() {
    plugs.forEach((plug, i) => {
      leads[i].geometry.dispose();
      const p = plug.position;
      leads[i].geometry = wireGeometry(
        [pins[i], [pins[i][0] + 0.02, 0.008, 0.16], [p.x, 0.008, p.z + 0.025], [p.x, p.y - 0.006, p.z]],
        0.0014,
      );
    });
  }
  function animate() {
    rotor.rotation.z = model.theta;
    const e = model.observe();
    leds[0].mat.emissiveIntensity = Math.min(3, e.redCurrent / 0.004);
    leds[1].mat.emissiveIntensity = Math.min(3, e.yellowCurrent / 0.004);
    leds[0].glow.material.opacity = Math.min(0.8, e.redCurrent / 0.008);
    leds[1].glow.material.opacity = Math.min(0.8, e.yellowCurrent / 0.008);
  }
  layoutLeads();
  animate();
  return { group, rotor, knob, sockets, plugs, parked, leds, layoutLeads, animate, dispose() {} };
}
