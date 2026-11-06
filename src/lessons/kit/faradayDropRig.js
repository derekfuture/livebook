import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { block, wire, wireGeometry } from './electronicsBench.js';
import { canvasTex, textPlate } from './props.js';
import { DROP_TOP, MAGNET_LENGTH, COIL_THICKNESS } from './faradayDrop.js';

// Tube ends above the catch tray: the original magnet can be taken out sideways.
export const TUBE_BOTTOM = 0.075;
export const MAGNET_DOCKS = [-0.15, -0.21];
export function faradayDropRig() {
  const group = new THREE.Group(),
    textures = [],
    cables = [];
  const cyl = (parent, r, h, x, y, z, color) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 32), paint(color));
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const label = (parent, text, x, y, z, w = 0.05, h = 0.014) => {
    const o = textPlate(text, {
      w,
      h,
      bg: '#eee6d3',
      font: `bold ${Math.floor(Math.min(((512 * h) / w) * 0.7, 450 / text.length))}px sans-serif`,
    });
    o.position.set(x, y, z);
    parent.add(o);
    textures.push(o.material.map);
    return o;
  };
  block(group, 0.16, 0.012, 0.13, 0.018, 0.006, -0.025, 0x586a70);
  cyl(group, 0.004, 0.64, 0.075, 0.326, -0.055, 0x929b9c);
  for (const y of [0.09, 0.55]) {
    block(group, 0.075, 0.009, 0.012, 0.038, y, -0.055, 0x7e8b8b);
    block(group, 0.01, 0.009, 0.038, 0, y, -0.036, 0x7e8b8b);
  }
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, DROP_TOP - TUBE_BOTTOM, 48, 1, true),
    new THREE.MeshPhongMaterial({
      color: 0xb5d9dc,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  glass.position.y = (DROP_TOP + TUBE_BOTTOM) / 2;
  group.add(glass);
  for (const y of [TUBE_BOTTOM, DROP_TOP]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0009, 8, 40), paint(0x95b9ba));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = y;
    group.add(rim);
  }
  // A physical ruler, zero at the release reference (magnet centre at the mouth).
  const rulerTex = canvasTex(160, 2000, (g, w, h) => {
    g.fillStyle = '#eee0bd';
    g.fillRect(0, 0, w, h);
    g.fillStyle = g.strokeStyle = '#4f514c';
    g.font = '42px sans-serif';
    for (let cm = 0; cm <= 55; cm++) {
      const y = 40 + (cm / 55) * (h - 80);
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(w, y);
      g.lineTo(cm % 5 ? 127 : 105, y);
      g.stroke();
      if (cm % 5 === 0) g.fillText(String(cm), 15, y + 14);
    }
  });
  textures.push(rulerTex);
  const ruler = new THREE.Mesh(new THREE.PlaneGeometry(0.038, 0.574), new THREE.MeshBasicMaterial({ map: rulerTex }));
  ruler.position.set(-0.054, 0.325, 0.018);
  group.add(ruler);
  label(group, '距管口 / cm', -0.055, 0.632, 0.018, 0.075);
  const coil = new THREE.Group();
  group.add(coil);
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, COIL_THICKNESS, 48, 1, true), paint(0xb47b48));
  coil.add(shell);
  const inside = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, COIL_THICKNESS, 48, 1, true),
    paint(0x7c6b55, { side: THREE.BackSide }),
  );
  coil.add(inside);
  for (const y of [-0.006, 0.006]) {
    const rim = new THREE.Mesh(new THREE.RingGeometry(0.018, 0.033, 48), paint(0x718f91, { side: THREE.DoubleSide }));
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = y;
    coil.add(rim);
  }
  for (let i = 0; i < 8; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0301, 0.00045, 6, 48), paint(0xc59258));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.005 + i * 0.0014;
    coil.add(ring);
  }
  block(coil, 0.075, 0.008, 0.012, 0.04, 0, -0.055, 0x819696);
  block(coil, 0.009, 0.008, 0.022, 0, 0, -0.044, 0x819696);
  const handle = block(coil, 0.025, 0.022, 0.018, 0.075, 0, -0.055, 0x6d8587);
  // Winding taps on the carriage. Only the measuring lead changes terminals.
  block(coil, 0.105, 0.019, 0.012, 0.087, -0.027, 0.035, 0xb4a685);
  block(coil, 0.02, 0.02, 0.01, 0.035, -0.015, 0.022, 0x819696);
  const posts = [0.045, 0.085, 0.125].map((x, i) => {
    const o = cyl(coil, 0.003, 0.012, x, -0.027, 0.045, i ? 0x9c5947 : 0x4a5357);
    o.rotation.x = Math.PI / 2;
    return o;
  });
  posts.forEach((post, i) =>
    wire(
      coil,
      [
        [0.03, -0.005 + i * 0.005, 0],
        [0.035 + i * 0.008, -0.014, 0.016],
        [post.position.x, -0.027, 0.038],
      ],
      i ? 0xb77f4e : 0x5b6060,
      0.0007,
    ),
  );
  ['0', '300', '600'].forEach((s, i) => label(coil, s, posts[i].position.x, -0.047, 0.042, 0.033, 0.012));
  const plug = block(group, 0.014, 0.018, 0.012, 0.085, 0.373, 0.055, 0x9f5541);
  const gate = new THREE.Group();
  gate.position.set(0, DROP_TOP + 0.01, 0);
  group.add(gate);
  block(group, 0.004, 0.016, 0.02, -0.01, DROP_TOP + 0.01, 0, 0x9fa8a6);
  block(group, 0.085, 0.005, 0.01, 0.0325, DROP_TOP + 0.01, -0.016, 0x7d8c8c);
  block(group, 0.012, 0.009, 0.039, 0.075, DROP_TOP + 0.01, -0.0355, 0x7d8c8c);
  block(gate, 0.004, 0.016, 0.02, 0.01, 0, 0, 0x9fa8a6);
  block(gate, 0.055, 0.004, 0.006, 0.038, 0, 0.013, 0x9fa8a6);
  const gateHandle = block(gate, 0.023, 0.015, 0.025, 0.067, 0, 0, 0x8a6346);
  label(group, '拉柄松夹', 0.085, 0.642, 0.025, 0.07);
  block(group, 0.065, 0.015, 0.065, 0, 0.0075, 0, 0x9f8e70);
  label(group, '接盘', 0, 0.019, 0.034, 0.036);
  const magnets = [1, 2].map((strength, i) => {
    const m = new THREE.Group();
    for (const sign of [-1, 1])
      cyl(m, 0.008, MAGNET_LENGTH / 2, 0, (sign * MAGNET_LENGTH) / 4, 0, sign > 0 ? 0xb35145 : 0x4d7897);
    label(m, 'N', 0, 0.011, 0.0082, 0.012, 0.011);
    label(m, 'S', 0, -0.011, 0.0082, 0.012, 0.011);
    m.position.set(i === 0 ? 0 : MAGNET_DOCKS[i], i === 0 ? DROP_TOP : 0.035, 0);
    group.add(m);
    block(group, 0.045, 0.015, 0.045, MAGNET_DOCKS[i], 0.0075, 0, 0xa69b80);
    label(group, i === 0 ? '磁体 A' : '磁体 B · 较强', MAGNET_DOCKS[i], 0.02, 0.026, i === 0 ? 0.05 : 0.085);
    return m;
  });
  const sensor = new THREE.Group();
  sensor.position.set(0.215, 0.105, 0.08);
  group.add(sensor);
  block(sensor, 0.23, 0.16, 0.018, 0, 0, 0, 0x617779);
  block(group, 0.12, 0.02, 0.1, 0.215, 0.01, 0.06, 0x617779);
  block(group, 0.012, 0.09, 0.012, 0.215, 0.055, 0.06, 0x879493);
  const tex = canvasTex(1100, 700, () => {});
  textures.push(tex);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.216, 0.145), new THREE.MeshBasicMaterial({ map: tex }));
  screen.position.z = 0.0095;
  sensor.add(screen);
  for (const y of [0.045, 0.06]) {
    const socket = cyl(group, 0.003, 0.008, 0.099, y, 0.08, y === 0.045 ? 0x464d50 : 0xa15b49);
    socket.rotation.z = Math.PI / 2;
  }
  let lastWire = '';
  function moveCoil(distance, turns = 300) {
    coil.position.y = DROP_TOP - distance;
    plug.position.set(turns === 300 ? 0.085 : 0.125, coil.position.y - 0.027, 0.055);
    updateWires();
  }
  function updateWires() {
    const key = `${coil.position.y}:${plug.position.x}:${plug.position.y}`;
    if (key === lastWire) return;
    lastWire = key;
    const paths = [
      [
        [0.045, coil.position.y - 0.027, 0.051],
        [0.072, coil.position.y - 0.07, 0.025],
        [0.072, 0.05, 0.025],
        [0.085, 0.045, 0.075],
        [0.099, 0.045, 0.08],
      ],
      [
        plug.position.toArray(),
        [0.09, coil.position.y - 0.08, 0.04],
        [0.088, 0.07, 0.045],
        [0.09, 0.06, 0.075],
        [0.099, 0.06, 0.08],
      ],
    ];
    paths.forEach((p, i) => {
      if (!cables[i]) cables[i] = wire(group, p, i ? 0xa45c46 : 0x4d5559);
      else {
        cables[i].geometry.dispose();
        cables[i].geometry = wireGeometry(p);
      }
    });
  }
  function display(model, records, status) {
    const g = tex.canvas.getContext('2d');
    g.fillStyle = '#eee9d9';
    g.fillRect(0, 0, 1100, 700);
    g.fillStyle = '#334a4c';
    g.font = 'bold 38px sans-serif';
    g.fillText('电压传感器  U / V', 30, 48);
    g.font = '36px sans-serif';
    g.fillText(status, 30, 92);
    const scale = Math.max(0.1, Math.ceil(model.peak * 10) / 10),
      zero = 240,
      amp = 105;
    g.strokeStyle = '#b7c4bd';
    g.lineWidth = 2;
    for (const y of [zero - amp, zero, zero + amp]) {
      g.beginPath();
      g.moveTo(110, y);
      g.lineTo(1060, y);
      g.stroke();
    }
    g.font = '25px sans-serif';
    g.fillText(scale.toFixed(1), 25, zero - amp + 8);
    g.fillText('0', 60, zero + 8);
    g.fillText((-scale).toFixed(1), 20, zero + amp + 8);
    g.strokeStyle = '#276b71';
    g.lineWidth = 3;
    g.beginPath();
    model.samples.forEach(([t, v], i) => {
      const x = 110 + (t / 0.4) * 950,
        y = zero - (v / scale) * amp;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    });
    g.stroke();
    g.fillStyle = '#334a4c';
    g.fillText('0', 110, 378);
    g.fillText('0.4 s', 985, 378);
    g.font = 'bold 43px sans-serif';
    g.fillText(`${model.finished ? '已记录' : '本次'} |U| 峰值 ${model.peak.toFixed(3)} V`, 35, 425);
    g.font = '40px sans-serif';
    ['距离/cm', '匝数', '磁体', '|U|峰值/V'].forEach((s, i) => g.fillText(s, [35, 310, 510, 720][i], 480));
    const latest = records.at(-1);
    const reference =
      latest &&
      records
        .slice(0, -1)
        .find(
          (r) =>
            Math.abs(r.distance - latest.distance) < 0.005 &&
            (latest.magnet === 1
              ? r.magnet === 0 && r.turns === latest.turns
              : latest.turns === 600 && r.magnet === latest.magnet && r.turns === 300),
        );
    const shown = reference ? [reference, latest] : records.slice(-4);
    shown.forEach((r, i) => {
      [(r.distance * 100).toFixed(1), String(r.turns), r.magnet === 0 ? 'A' : 'B', r.peak.toFixed(3)].forEach((s, j) =>
        g.fillText(s, [35, 310, 510, 720][j], 528 + i * 49),
      );
    });
    if (reference) {
      g.font = '36px sans-serif';
      g.fillText('上行：同位置对照    下行：本次', 35, 657);
    }
    tex.needsUpdate = true;
  }
  moveCoil(0.2);
  return {
    group,
    coil,
    handle,
    posts,
    plug,
    gate,
    gateHandle,
    magnets,
    screen,
    sensor,
    moveCoil,
    updateWires,
    display,
    dispose() {
      textures.forEach((t) => t.dispose());
    },
  };
}
