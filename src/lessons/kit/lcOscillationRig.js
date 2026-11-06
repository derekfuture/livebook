import * as THREE from 'three';
import { block, wire } from './electronicsBench.js';
import { paint } from '../../live/ink.js';
import { canvasTex, textPlate } from './props.js';
export const LC_PIVOT_Z = 0.065,
  LC_ARM = 0.06,
  LC_THROW = 0.6;
export const SCOPE = {
  width: 0.25,
  height: 0.15,
  y: 0.135,
  z: -0.16,
  L: 110,
  R: 1070,
  T: 125,
  B: 625,
  W: 1180,
  H: 720,
  duration: 0.4,
  range: 6,
};
export function lcOscillationRig() {
  const group = new THREE.Group(),
    textures = [];
  function label(text, x, y, z, w = 0.06, h = 0.011) {
    const font = Math.min(360, 430 / [...text].length, (h / w) * 410);
    const m = textPlate(text, { w, h, bg: '#e4d9bd', font: `bold ${font}px sans-serif` });
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    group.add(m);
    return m;
  }
  function cylinder(r, h, x, y, z, c, axis = 'y') {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), paint(c));
    if (axis === 'z') m.rotation.x = Math.PI / 2;
    if (axis === 'x') m.rotation.z = Math.PI / 2;
    m.position.set(x, y, z);
    group.add(m);
    return m;
  }
  const peg = (x, z, c = 0x837455) => cylinder(0.0045, 0.01, x, 0.014, z, c);
  // Non-polar film capacitor: the LC voltage reverses, so this must not be an electrolytic can.
  block(group, 0.08, 0.008, 0.06, 0, 0.004, 0.14, 0xc9c6ae);
  block(group, 0.046, 0.032, 0.028, 0, 0.025, 0.14, 0x738777);
  const capA = peg(-0.033, 0.14),
    capB = peg(0.033, 0.14);
  wire(
    group,
    [
      [-0.033, 0.014, 0.14],
      [-0.021, 0.014, 0.14],
    ],
    0xa5a798,
    0.001,
  );
  wire(
    group,
    [
      [0.033, 0.014, 0.14],
      [0.021, 0.014, 0.14],
    ],
    0xa5a798,
    0.001,
  );
  label('47 μF', 0, 0.0415, 0.14, 0.041, 0.014);
  label('无极性电容', 0, 0.0085, 0.164, 0.07, 0.01);
  // Fixed coil; a few visible turns represent the winding whose measured L is 0.5 H.
  block(group, 0.075, 0.008, 0.115, -0.15, 0.004, -0.015, 0xc9c6ae);
  cylinder(0.009, 0.095, -0.15, 0.037, -0.015, 0x606b67, 'z');
  for (const z of [-0.049, 0.019]) cylinder(0.026, 0.005, -0.15, 0.037, z, 0x697a70, 'z');
  const winding = [];
  for (let i = 0; i <= 800; i++) {
    const t = i / 800,
      a = t * 80 * Math.PI;
    winding.push(new THREE.Vector3(-0.15 + 0.021 * Math.cos(a), 0.037 + 0.021 * Math.sin(a), -0.045 + 0.06 * t));
  }
  group.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(winding), 1000, 0.00055, 6, false),
      paint(0xb5824d),
    ),
  );
  const coilA = peg(-0.15, -0.066),
    coilB = peg(-0.15, 0.037);
  wire(
    group,
    [
      [-0.129, 0.037, -0.045],
      [-0.124, 0.025, -0.061],
      [-0.15, 0.014, -0.066],
    ],
    0xb5824d,
    0.0007,
  );
  wire(
    group,
    [
      [-0.129, 0.037, 0.015],
      [-0.124, 0.025, 0.033],
      [-0.15, 0.014, 0.037],
    ],
    0xb5824d,
    0.0007,
  );
  label('L  0.5 H', -0.15, 0.0085, 0.054, 0.068, 0.011);
  block(group, 0.075, 0.044, 0.09, 0.15, 0.022, -0.015, 0x6b7c77);
  label('6 V 电源', 0.15, 0.0445, -0.015, 0.065, 0.017);
  const sourceA = peg(0.15, -0.065, 0xa95440),
    sourceB = peg(0.15, 0.038, 0x4f5c57);
  label('+', 0.17, 0.009, -0.064, 0.01, 0.009);
  label('−', 0.17, 0.009, 0.038, 0.01, 0.009);
  cylinder(0.004, 0.035, 0.084, 0.016, -0.058, 0xc6ad79, 'x');
  label('10 kΩ', 0.084, 0.008, -0.043, 0.047, 0.009);
  // Original SPDT knife: neutral is genuinely open; either side uses the same hinge.
  block(group, 0.105, 0.008, 0.095, 0, 0.004, 0.035, 0xd2c8b0);
  const hinge = peg(0, LC_PIVOT_Z),
    throws = [-1, 1].map((s) => peg(s * LC_ARM * Math.sin(LC_THROW), LC_PIVOT_Z - LC_ARM * Math.cos(LC_THROW)));
  label('线圈', -0.045, 0.0085, 0.008, 0.032, 0.011);
  label('电源', 0.045, 0.0085, 0.008, 0.032, 0.011);
  label('断开', 0, 0.0085, -0.002, 0.03, 0.01);
  const blade = new THREE.Group();
  blade.position.set(0, 0.02, LC_PIVOT_Z);
  group.add(blade);
  block(blade, 0.006, 0.003, LC_ARM, 0, 0, -LC_ARM / 2, 0xa8aaa0);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.014, 20), paint(0x505e56));
  handle.position.set(0, 0.008, -0.055);
  blade.add(handle);
  const pick = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
  pick.userData.pick = true;
  handle.add(pick);
  const v = (o) => o.position.toArray();
  wire(group, [v(hinge), [-0.025, 0.014, 0.09], v(capA)], 0x956b43);
  wire(group, [v(throws[0]), [-0.08, 0.012, -0.065], v(coilA)], 0x906c47);
  wire(group, [v(throws[1]), [0.055, 0.014, -0.058], [0.0665, 0.016, -0.058]], 0x99683e);
  wire(group, [[0.1015, 0.016, -0.058], v(sourceA)], 0x99683e);
  wire(
    group,
    [
      v(coilB),
      [-0.19, 0.012, 0.13],
      [-0.19, 0.012, 0.22],
      [0.06, 0.012, 0.22],
      [0.19, 0.012, 0.22],
      [0.19, 0.012, 0.1],
      v(sourceB),
    ],
    0x4f5d58,
  );
  wire(group, [v(capB), [0.06, 0.012, 0.22]], 0x4f5d58);
  // One physical voltage sensor stays connected to the same capacitor throughout.
  block(group, 0.27, 0.17, 0.018, 0, SCOPE.y, SCOPE.z, 0x607a79);
  block(group, 0.11, 0.012, 0.09, 0, 0.006, -0.16, 0x607a79);
  block(group, 0.014, 0.07, 0.014, 0, 0.047, -0.16, 0x86958b);
  const tex = canvasTex(SCOPE.W, SCOPE.H, () => {});
  textures.push(tex);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(SCOPE.width, SCOPE.height),
    new THREE.MeshBasicMaterial({ map: tex }),
  );
  screen.position.set(0, SCOPE.y, SCOPE.z + 0.0095);
  group.add(screen);
  for (const [i, p] of [capA, capB].entries()) {
    const x = i ? 0.06 : -0.06;
    wire(
      group,
      [v(p), [x, 0.015, 0.09], [x, 0.025, -0.09], [i ? 0.025 : -0.025, 0.054, -0.148]],
      i ? 0x4b5754 : 0xa45c46,
    );
  }
  for (const x of [-0.025, 0.025]) cylinder(0.003, 0.008, x, 0.054, -0.148, x < 0 ? 0xa45c46 : 0x4b5754, 'z');
  function draw(voltage, samples, { capturing = false, frozen = false, start = 0, now = 0 } = {}) {
    const c = tex.canvas.getContext('2d'),
      s = SCOPE;
    c.fillStyle = '#eee9d9';
    c.fillRect(0, 0, s.W, s.H);
    c.fillStyle = '#334a4c';
    c.textAlign = 'left';
    c.font = 'bold 40px sans-serif';
    c.fillText('电容两端电压', 28, 48);
    c.textAlign = 'right';
    c.fillText(voltage.toFixed(2) + ' V', s.W - 28, 48);
    c.textAlign = 'left';
    c.font = '30px sans-serif';
    c.fillText(capturing ? '采集中 · 0.4 s' : frozen ? '已保存这次波形 · 点屏幕近看' : '实时 · 最近 0.4 s', 28, 90);
    for (let k = 0; k <= 6; k++) {
      const y = s.T + ((s.B - s.T) * k) / 6;
      c.strokeStyle = k === 3 ? '#607e7a' : '#c4cec3';
      c.lineWidth = k === 3 ? 3 : 1.5;
      c.beginPath();
      c.moveTo(s.L, y);
      c.lineTo(s.R, y);
      c.stroke();
      c.fillStyle = '#3c5653';
      c.font = '28px sans-serif';
      c.textAlign = 'right';
      c.fillText(String(6 - 2 * k), s.L - 12, y + 9);
    }
    for (let k = 0; k <= 8; k++) {
      const x = s.L + ((s.R - s.L) * k) / 8;
      c.strokeStyle = '#c4cec3';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(x, s.T);
      c.lineTo(x, s.B);
      c.stroke();
      if (k % 2 === 0) {
        c.fillStyle = '#3c5653';
        c.textAlign = 'center';
        c.fillText(String(capturing || frozen ? k * 50 : k * 50 - 400), x, s.B + 40);
      }
    }
    c.textAlign = 'right';
    c.fillText('t / ms', s.R, s.B + 78);
    c.textAlign = 'left';
    c.fillText('U / V', 10, s.T - 10);
    const origin = capturing || frozen ? start : now - s.duration;
    c.save();
    c.beginPath();
    c.rect(s.L, s.T, s.R - s.L, s.B - s.T);
    c.clip();
    c.strokeStyle = '#ae5940';
    c.lineWidth = 3;
    c.beginPath();
    let first = true;
    for (const p of samples) {
      const x = s.L + ((p.time - origin) / s.duration) * (s.R - s.L),
        y = (s.T + s.B) / 2 - ((p.voltage / s.range) * (s.B - s.T)) / 2;
      if (first) {
        c.moveTo(x, y);
        first = false;
      } else c.lineTo(x, y);
    }
    c.stroke();
    c.restore();
    tex.needsUpdate = true;
  }
  return {
    group,
    handle,
    blade,
    screen,
    setAngle(q) {
      blade.rotation.y = -q;
    },
    draw,
    dispose() {
      textures.forEach((t) => t.dispose());
    },
  };
}
