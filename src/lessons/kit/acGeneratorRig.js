import * as THREE from 'three';
import { GENERATOR } from './acGenerator.js';
import { block, wire, wireGeometry } from './electronicsBench.js';
import { labBase, paint } from '../../live/ink.js';
import { textPlate, glowTexture, canvasTex } from './props.js';
export const AXLE_Y = 0.115,
  CRANK_Z = 0.13,
  CRANK_RADIUS = 0.055;
export function acGeneratorRig() {
  const group = new THREE.Group();
  function caption(parent, text, x, y, z, w, h) {
    const font = Math.min(360, 430 / [...text].length, (h / w) * 410);
    const plate = textPlate(text, { w, h, bg: '#e4d9bd', font: `bold ${font}px sans-serif` });
    plate.rotation.x = -Math.PI / 2;
    plate.position.set(x, y, z);
    parent.add(plate);
    return plate;
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
    block(group, 0.026, 0.142, 0.093, side * 0.082, 0.096, 0, side < 0 ? 0xb75240 : 0x466f93);
    for (const facing of [-1, 1]) {
      const label = textPlate(side < 0 ? 'N' : 'S', {
        w: 0.018,
        h: 0.02,
        bg: '#e7ddc7',
        font: 'bold 360px sans-serif',
      });
      label.position.set(side * 0.082, 0.105, facing * 0.047);
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
  const root = new THREE.Group();
  group.position.x = -0.15;
  root.add(group, labBase(0.59, 0.398));
  const lampBoard = new THREE.Group();
  lampBoard.position.x = 0.136;
  group.add(lampBoard);
  block(lampBoard, 0.15, 0.014, 0.205, 0.215, 0.007, 0.047, 0xc5c8af);
  // Parallel buses, with a shared series protection resistor before the A bus.
  wire(
    lampBoard,
    [
      [0.16, 0.02, 0.105],
      [0.145, 0.02, 0.085],
      [0.145, 0.02, 0.045],
    ],
    0x9a7245,
    0.0008,
  );
  cylinder(lampBoard, 0.0035, 0.025, 0.145, 0.021, 0.028, 0xc5aa77, 'z');
  wire(
    lampBoard,
    [
      [0.145, 0.021, 0.015],
      [0.145, 0.02, -0.025],
      [0.25, 0.02, -0.025],
    ],
    0x9a7245,
    0.0008,
  );
  wire(
    lampBoard,
    [
      [0.27, 0.023, 0.105],
      [0.27, 0.02, 0.065],
      [0.18, 0.02, 0.065],
    ],
    0x9a7245,
    0.0008,
  );
  caption(lampBoard, '180 Ω', 0.164, 0.015, 0.035, 0.032, 0.01);
  const leds = [0.19, 0.245].map((x, i) => {
    const led = new THREE.Group();
    led.position.set(x, 0.026, 0.016);
    lampBoard.add(led);
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
      lampBoard,
      [
        [x, 0.019, 0.007],
        [x, 0.019, -0.025],
      ],
      0x9a7245,
      0.0008,
    );
    wire(
      lampBoard,
      [
        [x, 0.019, 0.025],
        [x, 0.019, 0.065],
      ],
      0x9a7245,
      0.0008,
    );
    const polarities = [false, true].map((opposed) => {
      const reverse = i && opposed;
      return [
        caption(lampBoard, reverse ? '−' : '+', x + 0.015, 0.017, -0.013, 0.014, 0.012),
        caption(lampBoard, reverse ? '+' : '−', x + 0.015, 0.017, 0.046, 0.014, 0.012),
      ];
    });
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
    return { group: led, mat, glow, polarities };
  });
  const wiringLabels = ['同向并联', '反向并联'].map((label) =>
    caption(lampBoard, label, 0.218, 0.015, -0.041, 0.068, 0.015));
  const yellowSeat = cylinder(lampBoard, 0.016, 0.005, 0.245, 0.022, 0.016, 0x796d53);
  const yellowPick = block(lampBoard, 0.034, 0.034, 0.034, 0.245, 0.034, 0.016, 0xffffff);
  yellowPick.material.visible = false;
  for (const child of yellowPick.children) child.visible = false;
  yellowPick.userData.pick = true;
  function setWiring(opposed) {
    wiringLabels.forEach((label, k) => {
      const visible = k === Number(opposed);
      label.visible = visible;
      for (const led of leds) led.polarities[k].forEach((mark) => { mark.visible = visible; });
    });
  }
  setWiring(false);
  // 两只插头共用绝缘手柄；棕线接 E，蓝线接 F。
  const sites = [0.168, 0.351].map((x) => new THREE.Vector3(x, 0.033, 0.111));
  for (const [i, site] of sites.entries()) {
    for (const dx of [-0.012, 0.012]) cylinder(group, 0.007, 0.01, site.x + dx, 0.019, site.z, 0x49534d);
    caption(group, i ? '灯板' : '电流表', site.x, 0.015, 0.138, 0.056, 0.016);
  }
  for (const [x, end] of [
    [0.16, -0.012],
    [0.27, 0.012],
  ]) {
    wire(
      lampBoard,
      [
        [x, 0.02, 0.105],
        [0.215 + end, 0.022, 0.111],
      ],
      0x946f49,
      0.0009,
    );
  }
  // 倾斜表盘、表针与刻度在同一平面。零刻度居中，右偏为正。
  block(group, 0.101, 0.014, 0.205, 0.168, 0.007, 0.047, 0x6d817b);
  const meter = new THREE.Group();
  meter.position.set(0.168, 0.053, 0.033);
  meter.rotation.x = -0.57;
  group.add(meter);
  block(meter, 0.117, 0.088, 0.018, 0, 0, 0, 0x405854);
  const dial = canvasTex(512, 370, (g, w, h) => {
    g.fillStyle = '#fff8e4';
    g.fillRect(0, 0, w, h);
    const cx = w / 2,
      cy = 278,
      r = 197;
    g.strokeStyle = g.fillStyle = '#354941';
    for (let i = -5; i <= 5; i++) {
      const a = i * 0.185;
      g.lineWidth = i % 5 ? 3 : 6;
      g.beginPath();
      g.moveTo(cx + r * Math.sin(a), cy - r * Math.cos(a));
      g.lineTo(cx + (r - 16) * Math.sin(a), cy - (r - 16) * Math.cos(a));
      g.stroke();
      if (!(i % 5)) {
        g.font = 'bold 39px sans-serif';
        g.textAlign = 'center';
        g.fillText(i === 0 ? '0' : i > 0 ? '+25' : '−25', cx + (r + 24) * Math.sin(a), cy - (r + 24) * Math.cos(a) + 11);
      }
    }
    g.textAlign = 'center';
    g.font = '600 34px sans-serif';
    g.fillText('mA', 132, 340);
    g.font = '600 28px sans-serif';
    g.fillText('内阻 180 Ω', 337, 340);
  });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.111, 0.08), new THREE.MeshBasicMaterial({ map: dial }));
  face.position.z = 0.0095;
  meter.add(face);
  const overload = textPlate('超量程', { w: 0.043, h: 0.014, color: '#94321c', bg: '#fff1d5', font: 'bold 135px sans-serif' });
  overload.position.set(-0.029, -0.015, 0.0105);
  meter.add(overload);
  const needle = new THREE.Group();
  needle.position.set(0, -0.0201, 0.0103);
  meter.add(needle);
  block(needle, 0.0017, 0.042, 0.0007, 0, 0.021, 0, 0xa6402e);
  cylinder(needle, 0.0042, 0.002, 0, 0, 0.001, 0x403f36, 'z');
  const plug = new THREE.Group();
  group.add(plug);
  const plugPick = block(plug, 0.041, 0.015, 0.018, 0, 0, 0, 0xa26939);
  for (const dx of [-0.012, 0.012]) cylinder(plug, 0.003, 0.011, dx, -0.01, 0, 0xc5ac82);
  const leads = [-1, 1].map((sign, i) => {
    const x = sign * 0.055;
    cylinder(group, 0.006, 0.011, x, 0.02, 0.144, 0x484e49);
    caption(group, i ? 'F' : 'E', x + 0.013, 0.0145, 0.14, 0.014, 0.014);
    wire(
      group,
      [
        [0.014, AXLE_Y, ringZ[i]],
        [sign * 0.105, 0.054, -0.103],
        [sign * 0.11, 0.02, 0.11],
        [x, 0.021, 0.144],
      ],
      0x50574c,
      0.00095,
    );
    return wire(
      group,
      [
        [x, 0.024, 0.144],
        [x, 0.014, 0.16],
      ],
      i ? 0x425e73 : 0x886243,
      0.0011,
    );
  });
  function layoutLeads() {
    leads.forEach((line, i) => {
      const sign = i ? 1 : -1,
        p = plug.position;
      line.geometry.dispose();
      const firstX = sign * 0.055,
        lastX = p.x + sign * 0.012;
      const front = i ? 0.169 : 0.187;
      line.geometry = wireGeometry(
        [
          [firstX, 0.025, 0.144],
          [firstX + 0.006, 0.02, 0.162],
          [firstX + 0.035, 0.007, front],
          [(firstX + lastX) / 2, 0.006, front + 0.006],
          [lastX - 0.013, 0.008, front],
          [lastX, 0.02, (front + p.z) / 2],
          [lastX, p.y, p.z + 0.009],
        ],
        0.0011,
      );
    });
  }
  const neutral = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(
      [
        [0, -0.047, -0.047],
        [0, 0.047, -0.047],
        [0, 0.047, 0.047],
        [0, -0.047, 0.047],
      ].map((v) => new THREE.Vector3(...v)),
    ),
    new THREE.LineDashedMaterial({ color: 0x2e726a, dashSize: 0.004, gapSize: 0.002 }),
  );
  neutral.computeLineDistances();
  neutral.position.y = AXLE_Y;
  group.add(neutral);
  const field = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-0.064, 0.176, -0.026),
    0.128,
    0x356f69,
    0.009,
    0.006,
  );
  group.add(field);
  const currentArrow = new THREE.Group();
  currentArrow.position.set(0, 0.043, 0);
  rotor.add(currentArrow);
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0x126b63 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0014, 0.0014, 0.047, 10), arrowMat);
  shaft.rotation.x = Math.PI / 2;
  currentArrow.add(shaft);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.012, 12), arrowMat);
  head.rotation.x = Math.PI / 2;
  head.position.z = 0.027;
  currentArrow.add(head);
  const clampNeedle = (current) => Math.max(-1, Math.min(1, current / GENERATOR.meterRange));
  function animate(theta, current, meterConnected, redCurrent = 0, yellowCurrent = 0) {
    rotor.rotation.z = theta;
    overload.visible = meterConnected && Math.abs(current) > GENERATOR.meterRange;
    currentArrow.visible = Math.abs(current) > 1e-7;
    currentArrow.rotation.y = current >= 0 ? 0 : Math.PI;
    needle.rotation.z = meterConnected ? -clampNeedle(current) * 0.925 : 0;
    leds.forEach(({ mat, glow }, i) => {
      const light = Math.min(1, (i ? yellowCurrent : redCurrent) / 0.003);
      mat.emissiveIntensity = 3 * light;
      glow.material.opacity = light * 0.8;
    });
  }
  animate(0, 0, false);
  const rest = new THREE.Vector3(0.244, sites[0].y, 0.154);
  for (const dx of [-0.018, 0.018]) block(group, 0.005, 0.025, 0.022, rest.x + dx, 0.0125, rest.z, 0xad9a78);
  plug.position.copy(rest);
  layoutLeads();
  return {
    root,
    group,
    knob,
    knobPick,
    plug,
    plugPick,
    sites,
    rest,
    yellowSeat,
    yellowPick,
    setWiring,
    layoutLeads,
    animate,
    neutral,
    needle,
    currentArrow,
    leds,
  };
}
