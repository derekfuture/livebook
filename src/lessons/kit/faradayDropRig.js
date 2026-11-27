import * as THREE from 'three';
import { paint, labBase } from '../../live/ink.js';
import { block, wire, wireGeometry } from './electronicsBench.js';
import { canvasTex, textPlate } from './props.js';
import { DROP_TOP, MAGNET_LENGTH, COIL_THICKNESS } from './faradayDrop.js';

// Tube ends above the catch tray: the original magnet can be taken out sideways.
export const TUBE_BOTTOM = 0.075;
export const MAGNET_DOCKS = [-0.10, -0.20];
// Meridian curves for the same pair of poles used by dropFlux. Trace in the N → S
// direction; the return branch may cross the coil in the opposite direction.
function fieldLines(stronger) {
  const field = new THREE.Group(), half = MAGNET_LENGTH / 2;
  const angles = stronger ? [60, 68, 77, 88, 101, 113] : [60, 77, 101];
  const mat = new THREE.LineBasicMaterial({ color: 0x237d79, transparent: true, opacity: 0.77 });
  for (const angle of angles) {
    const theta = angle * Math.PI / 180;
    let r = 0.001 * Math.sin(theta), y = half + 0.001 * Math.cos(theta);
    const profile = [];
    for (let i = 0; i < 1500; i++) {
      if (i % 4 === 0) profile.push([r, y]);
      const n = Math.hypot(r, y - half) ** -3, s = Math.hypot(r, y + half) ** -3;
      const dr = r * (n - s), dy = (y - half) * n - (y + half) * s;
      const step = 0.00035 / Math.hypot(dr, dy);
      r += dr * step; y += dy * step;
      if (Math.hypot(r, y + half) < 0.0012) break;
    }
    for (const sign of [-1, 1]) {
      const points = profile.map(([x, h]) => new THREE.Vector3(sign * x, h, 0));
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), mat);
      line.raycast = () => {}; field.add(line);
      const equator = points.find(p => p.y <= 0);
      const arrow = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        equator.clone().add(new THREE.Vector3(-0.002, 0.004, 0)), equator,
        equator.clone().add(new THREE.Vector3(0.002, 0.004, 0)),
      ]), mat);
      arrow.raycast = () => {}; field.add(arrow);
    }
  }
  return field;
}
export function faradayDropRig(upperMark, lowerMark) {
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
  // Only the free-fall arrangement needs the long tube, ruler and release clamp.
  const tower = new THREE.Group();
  group.add(tower);
  block(group, 0.16, 0.012, 0.13, 0.018, 0.006, -0.025, 0x586a70);
  cyl(tower, 0.004, 0.64, 0.075, 0.326, -0.055, 0x929b9c);
  for (const y of [0.09, 0.55]) {
    block(tower, 0.075, 0.009, 0.012, 0.038, y, -0.055, 0x7e8b8b);
    block(tower, 0.01, 0.009, 0.038, 0, y, -0.036, 0x7e8b8b);
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
  tower.add(glass);
  for (const y of [TUBE_BOTTOM, DROP_TOP]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0009, 8, 40), paint(0x95b9ba));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = y;
    tower.add(rim);
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
  tower.add(ruler);
  label(tower, '距管口 / cm', -0.055, 0.632, 0.018, 0.075);
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
  tower.add(gate);
  block(tower, 0.004, 0.016, 0.02, -0.01, DROP_TOP + 0.01, 0, 0x9fa8a6);
  block(tower, 0.085, 0.005, 0.01, 0.0325, DROP_TOP + 0.01, -0.016, 0x7d8c8c);
  block(tower, 0.012, 0.009, 0.039, 0.075, DROP_TOP + 0.01, -0.0355, 0x7d8c8c);
  block(gate, 0.004, 0.016, 0.02, 0.01, 0, 0, 0x9fa8a6);
  block(gate, 0.055, 0.004, 0.006, 0.038, 0, 0.013, 0x9fa8a6);
  const gateHandle = block(gate, 0.023, 0.015, 0.025, 0.067, 0, 0, 0x8a6346);
  label(tower, '拉柄松夹', 0.085, 0.642, 0.025, 0.07);
  block(tower, 0.065, 0.015, 0.065, 0, 0.0075, 0, 0x9f8e70);
  label(tower, '接盘', 0, 0.019, 0.034, 0.036);
  const magnets = [1, 2].map((strength, i) => {
    const m = new THREE.Group();
    for (const sign of [-1, 1])
      cyl(m, 0.008, MAGNET_LENGTH / 2, 0, (sign * MAGNET_LENGTH) / 4, 0, sign > 0 ? 0xb35145 : 0x4d7897);
    label(m, 'N', 0, 0.011, 0.0082, 0.012, 0.011);
    label(m, 'S', 0, -0.011, 0.0082, 0.012, 0.011);
    m.position.set(i === 0 ? 0 : MAGNET_DOCKS[i], i === 0 ? DROP_TOP : 0.035, 0);
    group.add(m);
    block(tower, 0.045, 0.015, 0.045, MAGNET_DOCKS[i], 0.0075, 0, 0xa69b80);
    label(tower, i === 0 ? '磁体 A' : '磁体 B · 较强', MAGNET_DOCKS[i], 0.02, 0.026, i === 0 ? 0.05 : 0.085);
    return m;
  });
  const fields = magnets.map((m, i) => {
    const field = fieldLines(i === 1); m.add(field); return field;
  });
  const picks = magnets.map(m => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.048, 0.024), new THREE.MeshBasicMaterial({ visible: false }));
    p.userData.pick = true; m.add(p); return p;
  });
  const handStand = new THREE.Group(); group.add(handStand);
  cyl(handStand, 0.0045, 0.243, 0.075, 0.1315, -0.055, 0x829799);
  for (const [y, name] of [[upperMark, '上标记'], [lowerMark, '下标记']]) {
    block(handStand, 0.022, 0.0015, 0.003, 0.093, y + 0.023, -0.055, 0x375651);
    label(handStand, name, 0.122, y + 0.023, -0.055, 0.038, 0.013);
  }
  // A friction slide holds the magnet at the depth where the hand stops.
  const slide = new THREE.Group(); magnets[0].add(slide);
  block(slide, 0.081, 0.008, 0.014, 0.037, 0.023, -0.055, 0x738a89);
  block(slide, 0.010, 0.008, 0.056, 0, 0.023, -0.027, 0x738a89);
  cyl(slide, 0.009, 0.014, 0.075, 0.023, -0.055, 0x546f70);
  const board = labBase(0.53, 0.22, 0.006);
  board.position.set(0.14, 0, 0.025); group.add(board);
  const sensor = new THREE.Group();
  sensor.position.set(0.257, 0.095, 0.04);
  group.add(sensor);
  block(sensor, 0.207, 0.146, 0.024, 0, 0, 0, 0x385959);
  block(group, 0.13, 0.012, 0.10, 0.257, 0.006, 0.024, 0x506868);
  block(group, 0.020, 0.028, 0.015, 0.257, 0.022, 0.028, 0x768b88);
  const tex = canvasTex(800, 550, () => {});
  textures.push(tex);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.197, 0.135), new THREE.MeshBasicMaterial({ map: tex }));
  screen.position.z = 0.0125; sensor.add(screen);
  for (const y of [0.048, 0.065]) {
    const socket = cyl(group, 0.004, 0.009, 0.151, y, 0.04, y < 0.05 ? 0x464d50 : 0xa15b49);
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
        [0.056, coil.position.y - 0.043, 0.065],
        [0.089, 0.025, 0.088],
        [0.133, 0.033, 0.057],
        [0.149, 0.048, 0.04],
      ],
      [
        plug.position.toArray(),
        [plug.position.x + 0.012, plug.position.y - 0.018, 0.075],
        [0.137, 0.036, 0.079],
        [0.138, 0.055, 0.053],
        [0.149, 0.065, 0.04],
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
  function arrangement(drop) {
    tower.visible = magnets[1].visible = drop;
    handStand.visible = slide.visible = !drop;
    board.scale.x = drop ? 1.24 : 0.88;
    board.position.x = drop ? 0.068 : 0.15;
  }
  // Top view: each dot stands for the same amount of net upward flux, independent of turns.
  const g = tex.canvas.getContext('2d');
  function display(drop, signal, fraction, state) {
    const w = 800, split = 535, x = 268, y = 350, r = 200, fluxX = 662, fluxY = 282;
    g.fillStyle = '#faf4e6'; g.fillRect(0, 0, w, 550);
    g.fillStyle = '#284b4b'; g.fillRect(0, 0, w, 85);
    g.font = 'bold 40px sans-serif'; g.textAlign = 'left'; g.fillStyle = '#fff9e9';
    g.fillText(drop ? '电压传感器' : '灵敏电流表', 30, 57);
    g.textAlign = 'right'; g.font = '34px Georgia'; g.fillText(drop ? 'V' : 'μA', w - 28, 55);
    g.strokeStyle = '#c9bfa9'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(split, 120); g.lineTo(split, 474); g.stroke();
    const range = drop ? 0.6 : 30;
    const radial = (ang, rr) => [x + rr * Math.sin(ang), y - rr * Math.cos(ang)];
    g.textAlign = 'center'; g.font = 'bold 29px sans-serif'; g.fillStyle = '#334c4b';
    for (let j = -6; j <= 6; j++) {
      const angle = j / 6 * 1.02;
      g.strokeStyle = '#475e59'; g.lineWidth = j % 3 ? 3 : 5; g.beginPath();
      g.moveTo(...radial(angle, r)); g.lineTo(...radial(angle, r - (j % 3 ? 10 : 22))); g.stroke();
      if (!(j % 3)) g.fillText(String(+(range * j / 6).toFixed(2)), ...radial(angle, r + 14));
    }
    const ratio = Math.max(-1, Math.min(1, signal / range));
    g.strokeStyle = '#a44130'; g.lineWidth = 9; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y); g.lineTo(...radial(1.02 * ratio, r - 15)); g.stroke();
    g.fillStyle = '#435956'; g.beginPath(); g.arc(x, y, 14, 0, 2 * Math.PI); g.fill();
    g.font = '32px sans-serif'; g.fillText(Math.abs(signal) > range ? '超量程' : state, x, 447);
    g.font = 'bold 32px sans-serif'; g.fillText('线圈俯视', fluxX, 156);
    g.strokeStyle = '#ad7046'; g.lineWidth = 9; g.beginPath(); g.arc(fluxX, fluxY, 83, 0, 2 * Math.PI); g.stroke();
    g.fillStyle = '#207b78';
    for (let j = 0; j < Math.round(Math.min(1, fraction) * 32); j++) {
      const angle = j * 2.4, radius = 70 * Math.sqrt(j / 32);
      const px = fluxX + radius * Math.cos(angle), py = fluxY + radius * Math.sin(angle);
      g.beginPath(); g.arc(px, py, 5.2, 0, 2 * Math.PI); g.fill();
    }
    g.font = '30px sans-serif'; g.fillText('磁感线穿出', fluxX, 418); g.fillText('（示意）', fluxX, 458);
    tex.needsUpdate = true;
  }
  moveCoil(0.2);
  return {
    group, picks, fields, arrangement,
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
