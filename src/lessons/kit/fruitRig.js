import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { Circuit, switchPart, meterPart } from './circuit.js';
import { block, caption, wire, wireGeometry } from './electronicsBench.js';
import { canvasTex } from './props.js';
import { fruitResistance, FRUIT_EMF } from './fruitCell.js';

export const PEAR_X = -0.115,
  PEAR_Z = -0.015,
  Y = 0.043;
const radius = 0.044;
function front(x) {
  return PEAR_Z + Math.sqrt(radius * radius - (x - PEAR_X) ** 2);
}
function post(parent, x, z, color) {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.01, 20), paint(color));
  o.position.set(x, 0.015, z);
  parent.add(o);
}
function makePear(group) {
  const profile = [
    [0, 0.002],
    [0.024, 0.004],
    [0.036, 0.013],
    [0.043, 0.029],
    [radius, Y],
    [0.04, 0.059],
    [0.034, 0.069],
    [0.025, 0.08],
    [0.017, 0.091],
    [0.009, 0.096],
    [0, 0.095],
  ];
  const skin = canvasTex(512, 512, (c, w, h) => {
    const grad = c.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#d3b462');
    grad.addColorStop(0.55, '#cba951');
    grad.addColorStop(1, '#ad9046');
    c.fillStyle = grad;
    c.fillRect(0, 0, w, h);
    let n = 73;
    const random = () => (n = (n * 1664525 + 1013904223) >>> 0) / 2 ** 32;
    for (let k = 0; k < 2300; k++) {
      c.fillStyle = k % 4 ? 'rgba(107,74,37,.43)' : 'rgba(235,212,153,.45)';
      c.beginPath();
      c.arc(random() * w, random() * h, random() * 1.1 + 0.3, 0, 2 * Math.PI);
      c.fill();
    }
  });
  const pear = new THREE.Mesh(
    new THREE.LatheGeometry(
      profile.map(([r, y]) => new THREE.Vector2(r, y)),
      64,
    ),
    paint(0xffffff, { map: skin }),
  );
  pear.position.set(PEAR_X, 0, PEAR_Z);
  group.add(pear);
  wire(          // 梨梗：长在梨上（挂在梨下面），一头插进果肉
    pear,
    [
      [0, 0.093, 0],
      [-0.003, 0.105, -0.002],
      [-0.01, 0.117, -0.004],
    ],
    0x6d5438,
    0.0015,
  );
  block(group, 0.104, 0.003, 0.097, PEAR_X, 0.0015, PEAR_Z, 0xaea68b);
}

function fruitSource() {
  const group = new THREE.Group();
  makePear(group);
  const cols = [0xb66a40, 0x9aa6a9],
    identities = ['铜', '锌'];
  const posts = [-0.07, -0.159].map((x) => [x, 0.021, 0.091]);
  for (let i = 0; i < 2; i++) {
    const [x, , z] = posts[i];
    block(group, 0.022, 0.01, 0.023, x, 0.005, z, 0x737c78);
    post(group, x, z, i ? 0x444943 : 0xac5640);
    caption(group, identities[i], x, 0.011, z + 0.014, 0.019, 0.009);
  }
  const blades = cols.map((color, i) => {
    const blade = new THREE.Group();
    group.add(blade);
    block(blade, 0.0016, 0.017, 0.05, 0, 0, 0.025, color);
    for (let mm = 5; mm <= 40; mm += 5)
      block(blade, 0.0019, mm % 10 ? 0.003 : 0.006, 0.00055, 0, 0.005, mm / 1000, 0x554c44);
    const outward = i ? -1 : 1;
    block(blade, 0.009, 0.01, 0.012, outward * 0.0045, 0.001, 0.048, i ? 0x484a48 : 0xa9533e);
    const collar = block(blade, 0.0035, 0.018, 0.002, 0, 0, 0, 0x827359);
    block(blade, 0.006, 0.037, 0.006, outward * 0.005, -0.02, 0.049, 0x858d86);
    block(blade, 0.012, 0.003, 0.015, outward * 0.006, -Y + 0.0015, 0.049, 0xa3947e);
    const g = wire(
      group,
      [
        [posts[i][0], 0.02, 0.091],
        [posts[i][0], 0.031, 0.07],
        [PEAR_X, 0.043, 0.07],
      ],
      i ? 0x494847 : 0xa9533e,
      0.0013,
    );
    return { blade, g, collar };
  });
  const source = {
    name: 'E',
    group,
    kind: 'battery',
    terminals: { '+': posts[0], '-': posts[1] },
    polarization: 0,
    I: 0,
    geometry() {
      const a = blades.map((o) => o.blade.position);
      return {
        spacing: Math.abs(a[0].x - a[1].x) * 1000,
        depths: a.map((p) => Math.max(0, (front(p.x) - p.z) * 1000)),
      };
    },
    branches() {
      const { spacing, depths } = this.geometry();
      const r = fruitResistance(spacing, depths, this.polarization);
      return [{ a: '-', b: '+', R: r, E: Number.isFinite(r) ? FRUIT_EMF : 0 }];
    },
    read(bs) {
      this.I = bs[0].I;
      this.U = -bs[0].U;
    },
  };
  function lateral(i, x) {
    const other = blades[1 - i].blade.position;
    x = Math.max(PEAR_X - 0.025, Math.min(PEAR_X + 0.025, x));
    // 铜在右，锌在左。金属片的厚度必须留在两片之间。
    if (other.y !== 0) x = i ? Math.min(x, other.x - 0.002) : Math.max(x, other.x + 0.002);
    return x;
  }
  function set(i, x, z) {
    x = lateral(i, x);
    const b = blades[i].blade,
      lip = front(x);
    b.position.set(x, Y, Math.max(lip - 0.032, Math.min(lip + 0.027, z)));
    blades[i].collar.position.z = Math.max(0, lip - b.position.z);
    const [px, py, pz] = posts[i],
      end = [x, Y + 0.002, b.position.z + 0.051];
    const points = [[px, py, pz], [px, 0.035, pz + 0.012], [(px + x) / 2, 0.052, pz + 0.018], end];
    blades[i].g.geometry.dispose();
    blades[i].g.geometry = wireGeometry(points, 0.0013);
  }
  function reset() {
    source.polarization = 0;
    for (const item of blades) item.blade.position.set(0, 0, 0);
    for (let i = 0; i < 2; i++) {
      const x = PEAR_X + (i ? -0.005 : 0.005);
      set(i, x, front(x) + 0.02);
    }
  }
  reset();
  function shift(i, start, dx, dz, sideways) {
    if (sideways) {
      const x = lateral(i, start.x + dx);
      set(i, x, front(x) - (front(start.x) - start.z));
    } else set(i, start.x, start.z + dz);
  }
  return { source, blades: blades.map((b) => b.blade), shift, set, reset };
}
function resistanceBox() {
  const group = new THREE.Group();
  block(group, 0.103, 0.032, 0.066, 0, 0.016, 0, 0x625f52);
  const digits = [5, 0];
  const knobs = [-0.025, 0.025].map((x, i) => {
    const tex = canvasTex(320, 320, (g, w, h) => {
      g.fillStyle = '#d8c8a2';
      g.fillRect(0, 0, w, h);
      g.font = '40px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#3d3f37';
      for (let n = 0; n < 10; n++) {
        const a = (n * Math.PI) / 5;
        g.fillText(String(n), w / 2 + Math.sin(a) * 120, h / 2 - Math.cos(a) * 120);
      }
    });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.045, 0.045), new THREE.MeshBasicMaterial({ map: tex }));
    face.rotation.x = -Math.PI / 2;
    face.position.set(x, 0.0322, -0.005);
    group.add(face);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.009, 20), paint(0x454b49));
    knob.position.set(x, 0.038, -0.005);
    group.add(knob);
    block(knob, 0.002, 0.0008, 0.01, 0, 0.0046, -0.004, 0xf1dbae);
    caption(group, i ? '×100 Ω' : '×1 kΩ', x, 0.0324, 0.024, 0.041, 0.009);
    return knob;
  });
  block(group, 0.104, 0.01, 0.024, 0, 0.005, 0.039, 0x7c6b54);
  for (const x of [-0.043, 0.043]) post(group, x, 0.042, 0x675b48);
  const part = {
    name: 'R',
    group,
    kind: 'resistor',
    terminals: { a: [-0.043, 0.021, 0.042], b: [0.043, 0.021, 0.042] },
    get R() {
      return digits[0] * 1000 + digits[1] * 100;
    },
    branches() {
      return [{ a: 'a', b: 'b', R: Math.max(0.0001, this.R) }];
    },
  };
  function set(i, n) {
    digits[i] = ((n % 10) + 10) % 10;
    knobs[i].rotation.y = (-digits[i] * Math.PI) / 5;
  }
  set(0, 5);
  set(1, 0);
  return { part, knobs, set, digits };
}
export function fruitRig() {
  const circuit = new Circuit(),
    fruit = fruitSource(),
    box = resistanceBox();
  circuit.add(fruit.source);
  circuit.add(box.part, [0.046, -0.055]);
  const sw = circuit.add(switchPart('S'), [0.13, 0.041]);
  const meter = circuit.add(meterPart('V', { type: 'V', ranges: [1.5, 3] }), [0.005, 0.065]);
  // 本台使用高内阻电压表，两档都对电路施加实际有限的负载。
  meter.branches = () => [
    { a: '1.5', b: '-', R: 3e6 },
    { a: '3', b: '-', R: 6e6 },
  ];
  return { group: circuit.group, circuit, fruit, box, sw, meter };
}
