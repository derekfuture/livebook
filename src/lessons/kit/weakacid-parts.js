// 实验 3-1，器材的局部坐标以探头尖端或镁条下缘为原点。
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { beaker, glowTexture } from './props.js';
import { faceLabel } from './labels.js';
import { clamp } from './interact.js';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const X = [-0.086, 0.086], R = 0.035, RIM = 0.069, WATER = 0.046;
export const ACIDS = ['盐酸', '醋酸'];
// 每杯各有一支 pH 笔和一个导电测试器，按器材种类、溶液排列。
const CLAMP_OFFSET = 0.019;
export const HOME = [X[0] - CLAMP_OFFSET, X[1] - CLAMP_OFFSET, X[0] + CLAMP_OFFSET, X[1] + CLAMP_OFFSET].map((x) => V(x, 0.131))
  .concat([V(-0.156, 0.002), V(0.156, 0.002)]);
export const kindOf = (id) => Math.floor(id / 2);
const KA = 1.75e-5, C = 0.1;
// Kₐ = x²/(C − x)，正根有理化以避免相减消去。
const H_AC = 2 * C * KA / (Math.sqrt(KA * KA + 4 * C * KA) + KA);
export const PH = [C, H_AC].map((n) => (-Math.log10(n)).toFixed(1));
export const DISSOCIATION = (100 * H_AC / C).toFixed(1);
export const GAS_TIME = [13, 40];
export const WINDOW = 3;
const TOTAL_BUBBLES = 160;
export function bubbleCount(side, age) {
  const f = clamp(age / GAS_TIME[side], 0, 1);
  return Math.floor(TOTAL_BUBBLES * f * (2 - f));
}
const paint = (color, extra) => new THREE.MeshStandardMaterial({ color, roughness: 0.46, ...extra });
function part(g, geometry, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  g.add(mesh);
  return mesh;
}
const box = (g, x, y, z, w, h, d, mat, r = 0.001) =>
  part(g, new RoundedBoxGeometry(w, h, d, 2, r), mat, x, y, z);
const cyl = (g, x, y, z, r, h, mat) => part(g, new THREE.CylinderGeometry(r, r, h, 32), mat, x, y, z);
const sphere = (g, p, radius, mat) => part(g, new THREE.SphereGeometry(radius, 24, 16), mat, p.x, p.y, p.z);
const ease = (n) => { const k = clamp(n, 0, 1); return k * k * (3 - 2 * k); };

function probe(group, id, g) {
  const dark = paint(0x384649), ivory = paint(0xeceadd), metal = paint(0xa7b0b0, { metalness: 0.32 });
  const kind = kindOf(id);
  const stand = new THREE.Group();
  stand.position.x = HOME[id].x;
  group.add(stand);
  box(stand, 0, 0.003, -0.065, 0.038, 0.006, 0.046, ivory, 0.002);
  cyl(stand, 0, 0.091, -0.072, 0.0021, 0.182, metal);
  // 横臂的后端套在立柱上，前端的两片夹爪夹住仪表外壳。
  const arm = new THREE.Group();
  g.add(arm);
  arm.position.y = 0.046;
  cyl(arm, 0, 0, -0.072, 0.004, 0.009, dark);
  box(arm, 0, 0, -0.041, 0.007, 0.005, 0.062, dark);
  box(arm, 0, 0, -0.010, 0.030, 0.005, 0.004, dark);
  for (const x of [-0.014, 0.014]) box(arm, x, 0, -0.001, 0.003, 0.005, 0.018, dark);
  box(g, 0, 0.053, 0, 0.026, 0.044, 0.017, kind ? dark : ivory, 0.004);
  faceLabel(g, ACIDS[id % 2], { y: kind ? 0.040 : 0.069, z: 0.009, h: 0.006, color: kind ? '#ffffff' : '#385453', stroke: null });
  if (kind === 0) {
    cyl(g, 0, 0.019, 0, 0.0032, 0.032, metal);
    sphere(g, V(0, 0.004), 0.0036, paint(0xaed7d7));
    box(g, 0, 0.057, 0.009, 0.021, 0.014, 0.0015, paint(0xc4d9c4));
    const values = ['—', ...PH.map((n) => '≈' + n)].map((v) => faceLabel(g, v, { y: 0.057, z: 0.010, h: 0.009, color: '#203e39', stroke: null }));
    faceLabel(g, 'pH 笔', { y: 0.041, z: 0.009, h: 0.009, color: '#385453', stroke: null });
    g.read = (side) => values.forEach((v, k) => { v.visible = k === side + 1; });
  } else {
    for (const x of [-0.007, 0.007]) cyl(g, x, 0.017, 0, 0.0026, 0.033, dark);
    cyl(g, 0, 0.077, 0, 0.008, 0.009, metal);
    const bulb = sphere(g, V(0, 0.087), 0.011, paint(0xbacac7, { transparent: true, opacity: 0.78 }));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffda73, transparent: true, depthWrite: false }));
    glow.scale.setScalar(0.059); glow.position.copy(bulb.position); g.add(glow);
    faceLabel(g, '导电测试器', { y: 0.057, z: 0.009, h: 0.0068, stroke: null });
    g.read = (side) => {
      bulb.material.color.setHex([0xbacac7, 0xffed90, 0xc9ae70][side + 1]);
      bulb.material.emissive.setHex([0, 0xffbd47, 0x6e521c][side + 1]);
      glow.material.opacity = [0, 0.95, 0.12][side + 1];
    };
  }
}

function ribbon(g) {
  // 同一段带状几何体，既是拿起来的镁条，也是杯底开始反应的镁条。
  const pts = [], indices = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, x = (t - 0.5) * 0.015;
    const y = 0.002 + 0.005 * Math.sin(t * Math.PI), z = (t - 0.5) * 0.022;
    pts.push(x - 0.004, y, z, x + 0.004, y + 0.0008, z);
    const a = 2 * i;
    if (i < 24) indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  geo.setIndex(indices); geo.computeVertexNormals();
  return part(g, geo, paint(0xb3babd, { metalness: 0.62, side: THREE.DoubleSide }));
}

export function bench(group) {
  const bubbles = [];
  X.forEach((x, i) => {
    const b = beaker({ r: R, h: RIM, level: WATER, color: 0xd9e7e7, opacity: 0.22 });
    b.setColor(0xd4e3e3, 0.22);
    b.surface.material.opacity = 0.19;
    const meniscus = part(b, new THREE.TorusGeometry(R * 0.947, 0.00050, 8, 64), paint(0x9bb4b9), 0, WATER);
    meniscus.rotation.x = Math.PI / 2;
    group.add(b); b.position.x = x;
    faceLabel(b, '烧杯 · ' + ACIDS[i], { y: 0.061, z: R, h: 0.012, color: '#243a44', stroke: '#fff' });
    const gas = [];
    const geo = new THREE.SphereGeometry(1, 12, 10), mat = paint(0xdee9e9, { transparent: true, opacity: 0.85, roughness: 0.14 });
    for (let j = 0; j < 28; j++) {
      const bubble = part(b, geo, mat); bubble.visible = false; gas.push(bubble);
    }
    bubbles.push(gas);
  });
  const tools = HOME.map((p, id) => {
    const g = new THREE.Group(); group.add(g); g.position.copy(p);
    let plate;
    if (id < 4) probe(group, id, g);
    else {
      ribbon(g);
      plate = faceLabel(g, '镁条', { y: 0.009, z: 0.014, h: 0.009, color: '#243a44', stroke: '#fff' });
    }
    const height = id < 2 ? 0.077 : id < 4 ? 0.100 : 0.015;
    const pick = new THREE.Mesh(new THREE.BoxGeometry(id < 4 ? 0.028 : 0.024, height, id < 2 ? 0.022 : 0.026),
      new THREE.MeshBasicMaterial({ visible: false }));
    pick.position.y = height / 2;
    pick.userData.pick = true; g.add(pick);
    g.userData.ringY = id < 4 ? p.y + 0.035 : 0.002;
    return { g, pick, plate };
  });
  function drawBubbles(side, age, origin) {
    // 两段等量镁均完全反应，两杯最终放出的氢气相同。只改变各气泡的出生时刻。
    const duration = GAS_TIME[side], rise = 0.98;
    const born = bubbleCount(side, age);
    bubbles[side].forEach((b, j) => {
      const index = born - 1 - j;
      const birth = duration * (1 - Math.sqrt(1 - (index + 1) / TOTAL_BUBBLES));
      const u = (age - birth) / rise;
      b.visible = index >= 0 && u >= 0 && u < 1;
      if (!b.visible) return;
      const a = index * 2.4;
      b.position.set(origin.x - X[side] + 0.006 * Math.sin(a) + 0.002 * Math.sin(u * 5 + a),
        THREE.MathUtils.lerp(Math.min(WATER - 0.002, origin.y + 0.006), WATER - 0.001, u), origin.z + 0.008 * Math.cos(a));
      b.scale.setScalar((0.0011 + 0.00065 * (index % 3) / 2) * (0.5 + 0.7 * u));
    });
    return bubbles[side].some((b) => b.visible);
  }
  const replayStrips = X.map(() => {
    const frame = ribbon(group);
    frame.visible = false;
    return frame;
  });
  return { tools, replayStrips, drawBubbles };
}

// 采用 microworld 的元素颜色及半径。把同一颗羧基氢从原来的 O 移到水的 O 上。
const ELEMENT = { H: [0xf2f1ec, 0.24], O: [0xe0483a, 0.36], C: [0x3d4350, 0.40], Cl: [0x4cbf63, 0.60] };
// 和课本图 3-2 一样，用相接的球表示原子，球间不标键级。
function transferPair(layer, side) {
  const g = new THREE.Group();
  layer.add(g);
  const small = innerWidth <= 760;
  g.scale.setScalar(small ? 1.48 : 1);
  g.position.set(small ? -0.95 : -0.65, small ? -0.25 : 2.65, 0);
  const atom = (symbol, x, y, z = 0) =>
    sphere(g, V(x, y, z), 1.9 * ELEMENT[symbol][1], paint(ELEMENT[symbol][0]));
  let donor;
  if (side) {
    atom('C', -1.3, 0);
    // 甲基略朝向镜头，三个氢在斜上方视角下也能分辨。
    atom('C', -2.54, -0.38, 0.70);
    atom('H', -3.15, 0.51, 0.87);
    atom('H', -2.29, -0.84, 1.65);
    atom('H', -3.10, -1.09, 0.09);
    atom('O', -1.04, 1.19);
    donor = atom('O', -0.29, -0.86);
  } else donor = atom('Cl', -0.55, 0);
  const startH = donor.position.clone().add(side ? V(0.89, 0.36) : V(1.27, 0));
  const h = atom('H', startH.x, startH.y);
  const ox = atom('O', 0, 0), ha = atom('H', 0, 0), hb = atom('H', 0, 0);
  const waterAt = startH.clone().add(V(3.5, 0.12)), near = startH.clone().add(V(1.65, 0.12));
  const label = (text, x) => faceLabel(g, text, { x, y: -2.25, h: 0.68, color: '#223c46', stroke: '#fff' });
  const before = label(side ? 'CH₃COOH' : 'HCl', -1.35), after = label(side ? 'CH₃COO⁻' : 'Cl⁻', -1.35);
  const water = label('H₂O', 0), ion = label('H₃O⁺', 0);
  return (u) => {
    const approach = ease(u / 0.34), transfer = ease((u - 0.34) / 0.28), apart = ease((u - 0.62) / 0.38);
    ox.position.copy(waterAt).lerp(near, approach).x += apart * 1.55;
    h.position.copy(startH).lerp(ox.position.clone().add(V(-0.91, -0.13, 0.2)), transfer);
    ha.position.copy(ox.position).add(V(0.46, 0.73, -0.44));
    hb.position.copy(ox.position).add(V(0.63, -0.68, -0.27));
    before.visible = water.visible = transfer < 0.5;
    after.visible = ion.visible = !before.visible;
    water.position.x = ion.position.x = ox.position.x;
  };
}

export function ionizationScene() {
  let clock = 0, drawPair, saved = null;
  const duration = 4.5;
  const eqs = ['HCl + H<sub>2</sub>O → Cl<sup>−</sup> + H<sub>3</sub>O<sup>+</sup>',
    'CH<sub>3</sub>COOH + H<sub>2</sub>O ⇌ CH<sub>3</sub>COO<sup>−</sup> + H<sub>3</sub>O<sup>+</sup>'];
  return {
    holoBase: false, solid: true, still: true,
    snapshot: () => clock,
    resume: (t) => { saved = t; },
    init(c, st) {
      clock = saved ?? 0; saved = null;
      c.view.film = 0; c.view.paper = null;
      drawPair = transferPair(c.layer, st.side);
    },
    step(c, st, dt) {
      clock = Math.min(clock + dt, duration);
      const u = clamp((clock - 0.7) / 2.9, 0, 1);
      drawPair(u);
    },
    text(_, st) {
      const cap = clock < duration
        ? (st.side ? '看一个醋酸分子怎样把羧基上的 H⁺ 转移给水。' : '氯化氢把 H⁺ 转移给水，生成 Cl⁻ 和 H₃O⁺。')
        : (st.side ? '醋酸只有部分分子电离。' : '氯化氢在稀溶液中全部电离。');
      return { eq: eqs[st.side], cap, on: true };
    },
  };
}
