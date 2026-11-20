// Positions are measured at the working end (spout, rod tip, dropper tip or jaws).
import * as THREE from 'three';
import { chemBeaker, chemLamp, crucibleTongs, glassMat, spatula } from './chem.js';
import { milky, water2 } from './chemfx.js';
import { dropBottle, lampCap } from './labops.js';
import { canvasTex, stand, textPlate } from './props.js';
import { textSprite } from './microworld.js';
import { clamp } from './interact.js';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const CUP = 0.025,
  R = 0.025,
  H = 0.059;
export const PAN = -0.087,
  FILTER = -0.068,
  RECEIVER = FILTER + 0.019;
export const DISH = 0.044,
  DY = 0.099,
  MAT = -0.082,
  STRIP = 0.104;
export const NAMES = { ba: 'BaCl₂', oh: 'NaOH', co: 'Na₂CO₃', acid: '盐酸' };
const neutral = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.65, side: THREE.DoubleSide });
function mesh(parent, geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function plate(parent, label, w, h, x, y, z, bg = '#fffaf0') {
  const p = textPlate(label, { w, h, bg, font: 'bold ' + Math.min(102, 780 / label.length) + 'px sans-serif' });
  p.position.set(x, y, z);
  parent.add(p);
  p.renderOrder = 12;
  return p;
}
function grains(parent, n, radius, color, size, dish = false) {
  const g = new THREE.Group();
  parent.add(g);
  const geom = new THREE.BoxGeometry(size, size, size),
    mat = neutral(color);
  for (let i = 0; i < n; i++) {
    const r = radius * Math.sqrt((i + 0.5) / n),
      a = i * 2.4;
    const height = dish ? 0.005 + 0.017 * (r / 0.03) ** 2 : 0.002 + (1 - r / radius) * 0.005;
    const c = mesh(g, geom, mat, r * Math.cos(a), height, r * Math.sin(a));
    c.rotation.set(0.19, i, 0.15);
    c.scale.setScalar(0.7 + (i % 5) * 0.12);
  }
  return g;
}
export function bench(group) {
  const tools = {},
    bottles = {};
  const metal = neutral(0x79858d),
    ivory = neutral(0xf3ede0),
    ink = neutral(0x46545a);
  function tool(id, model, home, size, center) {
    const g = new THREE.Group();
    g.position.copy(home);
    g.add(model);
    group.add(g);
    const pick = mesh(g, new THREE.BoxGeometry(...size), new THREE.MeshBasicMaterial({ visible: false }), ...center);
    pick.userData.pick = true;
    tools[id] = { g, model, pick, home };
    return g;
  }
  const balance = new THREE.Group();
  group.add(balance);
  balance.position.x = PAN;
  mesh(balance, new THREE.BoxGeometry(0.071, 0.014, 0.058), ink, 0, 0.008);
  mesh(balance, new THREE.CylinderGeometry(0.026, 0.022, 0.006, 40), metal, 0, 0.018);
  const readout = ['0.0 g', '5.0 g'].map((t) => plate(balance, t, 0.037, 0.011, 0, 0.009, 0.03, '#c6d2bc'));
  const spoon = spatula({ color: 0xddd3b9 });
  spoon.scale.setScalar(0.56);
  spoon.rotation.y = -0.46;
  const spoonSalt = grains(spoon, 28, 0.0068, 0xe6dabc, 0.003);
  spoon.heap.add(spoonSalt);
  tool('spoon', spoon, V(-0.041, 0.004, 0.017), [0.065, 0.012, 0.023], [0.027, 0.004, 0.012]);
  const paper = new THREE.Group();
  mesh(paper, new THREE.BoxGeometry(0.046, 0.001, 0.038), ivory);
  for (const s of [-1, 1])
    mesh(paper, new THREE.BoxGeometry(0.046, 0.001, 0.009), ivory, 0, 0.002, s * 0.021).rotation.x = -s * 0.42;
  const sample = grains(paper, 52, 0.014, 0xd9ceb6, 0.0034);
  tool('paper', paper, V(PAN, 0.022), [0.046, 0.009, 0.044], [0, 0.004, 0]);
  const cylinder = chemBeaker({ r: 0.0115, h: 0.064, level: 0.049, color: 0xc3dfe5 });
  mesh(cylinder, new THREE.CylinderGeometry(0.018, 0.019, 0.004, 8), glassMat({ opacity: 0.55 }), 0, 0.002);
  plate(cylinder, '20 mL', 0.025, 0.009, 0, 0.032, 0.012);
  function pouring(id, cup, x, y, r, height) {
    cup.position.set(r + 0.003, -height, 0);
    return tool(id, cup, V(x - r - 0.003, y + height), [2 * r, height, 2 * r], [r + 0.003, -height / 2, 0]);
  }
  pouring('water', cylinder, 0.112, 0.001, 0.0115, 0.064);
  const bowl = chemBeaker({ r: R, h: H, level: 0, color: 0xc9dfe3 });
  const raw = grains(bowl, 45, R * 0.66, 0xe7dfcc, 0.0033);
  const sand = grains(bowl, 16, R * 0.81, 0x816f5a, 0.0013);
  const sediment = new THREE.Group();
  bowl.add(sediment);
  const floc = new THREE.IcosahedronGeometry(0.0027, 1);
  const white = new THREE.MeshStandardMaterial({
    color: 0xf8f8f4,
    emissive: 0x888888,
    emissiveIntensity: 0.25,
    roughness: 0.98,
  });
  for (let i = 0; i < 90; i++) {
    const r = R * 0.85 * Math.sqrt((i + 0.5) / 90),
      a = i * 2.4;
    const m = mesh(sediment, floc, white, r * Math.cos(a), 0.002 + (1 - r / R) * 0.002, r * Math.sin(a));
    m.scale.set(1.5, 0.62, 1.2);
  }
  const cloud = milky(bowl.liq, { n: 45, speck: 0.0009 });
  pouring('cup', bowl, CUP, 0.001, R, H);
  // At the lip the free surface cuts a wedge out of the tilted beaker.
  const pourGeo = new THREE.CylinderGeometry(1, 1, 1, 40);
  const outline = pourGeo.attributes.position.clone();
  const pouringWater = mesh(bowl, pourGeo, water2({ color: 0x9cc6d2, base: 0.68 }));
  pouringWater.renderOrder = 9.5;
  pouringWater.frustumCulled = false;
  pouringWater.visible = false;
  const waterWidth = (left) => 1.6 * (R - 0.001) * Math.pow(left, 2 / 3);
  function filterWater(left) {
    const r = R - 0.001, width = waterWidth(left);
    const positions = pourGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const u = (outline.getX(i) + 1) / 2;
      const x = -r + width * u;
      const z = Math.sign(outline.getZ(i)) * Math.sqrt(Math.max(0, r * r - x * x));
      positions.setXYZ(i, x, 0.001 + (outline.getY(i) + 0.5) * (H - 0.002) * (1 - u), z);
    }
    positions.needsUpdate = true;
    pourGeo.computeVertexNormals();
  }
  const rod = new THREE.Group();
  const shaft = mesh(
    rod,
    new THREE.CylinderGeometry(0.00165, 0.00165, 0.084, 12),
    glassMat({ color: 0x91a7af, opacity: 0.78 }),
    0,
    0.042,
  );
  shaft.renderOrder = 10;
  tool('rod', rod, V(0.013, 0.003, 0.04), [0.009, 0.084, 0.01], [0, 0.042, 0]);
  for (const [i, id] of ['ba', 'oh', 'co', 'acid'].entries()) {
    const x = [-0.115, -0.069, -0.023, 0.125][i];
    const b = (bottles[id] = dropBottle(group, V(x, 0.001), { label: NAMES[id], r: 0.016, h: 0.041 }));
    const d = new THREE.Group();
    mesh(d, new THREE.CylinderGeometry(0.0025, 0.0009, 0.046, 12), glassMat({ color: 0x8da0ab, opacity: 0.7 }), 0, 0.023);
    mesh(d, new THREE.SphereGeometry(0.0057, 16, 12), neutral(0x884d40), 0, 0.051).scale.y = 1.6;
    tool(id, d, b.tipHome, [0.019, 0.029, 0.02], [0, 0.052, 0]);
    tools[id].g.userData.ringY = 0.051;
  }
  function support(x, y, r, height) {
    const s = stand({ height, baseW: 0.087, baseD: 0.065 });
    s.position.x = x - s.rodX - 0.054;
    group.add(s);
    s.clamp(y, 0.054, { ring: true, r });
    return s;
  }
  const fs = support(FILTER, 0.113, 0.021, 0.15);
  const filterArm = fs.children[fs.children.length - 1];
  fs.children[0].scale.x = 1.42;
  fs.children[0].position.x = 0.024;
  const funnel = new THREE.Group();
  group.add(funnel);
  funnel.position.set(FILTER, 0.112, 0);
  const lathe = (pts) =>
    new THREE.LatheGeometry(
      pts.map(([r, y]) => new THREE.Vector2(r, y)),
      48,
    );
  mesh(
    funnel,
    lathe([
      [0.002, -0.049],
      [0.0025, -0.02],
      [0.004, -0.016],
      [0.032, 0.016],
    ]),
    glassMat({ opacity: 0.36 }),
  ).renderOrder = 9;
  mesh(
    funnel,
    lathe([
      [0.0002, -0.016],
      [0.029, 0.013],
    ]),
    ivory,
  );
  const residue = grains(funnel, 80, 0.023, 0xe8e3d9, 0.0038, true);
  residue.children.forEach((c) => {
    c.position.y = -0.012 + Math.hypot(c.position.x, c.position.z);
  });
  const receiver = chemBeaker({ r: 0.025, h: 0.054, level: 0, color: 0xc9dfe3 });
  pouring('filtrate', receiver, RECEIVER, 0.017, 0.025, 0.054);
  const heater = support(DISH, DY + 0.007, 0.024, 0.143);
  heater.children[0].position.x = 0.0225;
  heater.children[0].scale.x = 1.1;
  const dish = new THREE.Group();
  group.add(dish);
  mesh(
    dish,
    lathe([
      [0.0001, 0.001],
      [0.011, 0.001],
      [0.022, 0.007],
      [0.031, 0.018],
      [0.032, 0.019],
      [0.031, 0.02],
      [0.022, 0.01],
      [0.012, 0.003],
      [0.0001, 0.003],
    ]),
    neutral(0xe8ded0),
  );
  const brine = mesh(
    dish,
    new THREE.CylinderGeometry(0.027, 0.012, 0.011, 44),
    water2({ color: 0xc4dfe3, base: 0.52 }),
    0,
    0.008,
  );
  const crystals = grains(dish, 95, 0.025, 0xfffaf2, 0.0038, true);
  const lamp = chemLamp();
  const lampG = tool('lamp', lamp, V(DISH, 0.016), [0.064, 0.067, 0.064], [0, 0.034, 0]);
  lampG.scale.setScalar(0.75);
  const capper = lampCap(group, lampG, { off: V(DISH - 0.048, 0, 0.053) });
  const mat = new THREE.Group();
  mat.position.set(MAT, 0.003, 0);
  group.add(mat);
  const grid = neutral(0x80898c);
  for (let i = -8; i <= 8; i++) {
    mesh(mat, new THREE.BoxGeometry(0.081, 0.001, 0.0007), grid, 0, 0, i * 0.0048);
    mesh(mat, new THREE.BoxGeometry(0.0007, 0.001, 0.081), grid, i * 0.0048, 0.0006, 0);
  }
  mesh(mat, new THREE.CylinderGeometry(0.025, 0.026, 0.002, 32), neutral(0xcbc3b1), 0, 0.0018);
  const tongs = crucibleTongs({ len: 0.067 });
  tool('tongs', tongs, V(0.094, 0.003, 0.013), [0.07, 0.014, 0.02], [0.028, 0, 0]);
  const strip = new THREE.Group();
  group.add(strip);
  strip.position.set(STRIP, 0.001, 0.012);
  mesh(strip, new THREE.BoxGeometry(0.045, 0.001, 0.023), ivory);
  mesh(strip, new THREE.BoxGeometry(0.039, 0.001, 0.009), neutral(0xe1bc70), 0, 0.001);
  const swatches = [
    ['酸性', 0xc94b38],
    ['微酸性', 0xa8b953],
    ['中性', 0x82a651],
    ['碱性', 0x657ba8],
  ];
  swatches.forEach(([label, color], i) => {
    const x = (i - 1.5) * 0.014;
    mesh(strip, new THREE.BoxGeometry(0.012, 0.001, 0.008), neutral(color), x, 0, 0.02);
    const p = plate(strip, label, 0.014, 0.006, x, 0.001, 0.027);
    p.rotation.x = -Math.PI * 0.43;
  });
  const stain = mesh(strip, new THREE.CircleGeometry(0.004, 24), neutral(0x9aab51), -0.006, 0.002);
  stain.rotation.x = -Math.PI / 2;
  const drop = mesh(group, new THREE.SphereGeometry(0.0017, 12, 8), water2({ color: 0x94b4be, base: 0.75 }));
  const stream = mesh(group, new THREE.CylinderGeometry(0.0014, 0.0015, 1, 10), water2({ color: 0x8cb4bf, base: 0.7 }));
  const spray = Array.from({ length: 5 }, () =>
    mesh(group, new THREE.SphereGeometry(0.0013, 10, 8), water2({ color: 0xc0d6d9, base: 0.85 })),
  );
  const draining = mesh(group, new THREE.SphereGeometry(0.0016, 12, 8), water2({ color: 0x839eaa, base: 0.8 }));
  const bubbleMap = canvasTex(64, 64, (ctx) => {
    const fill = ctx.createRadialGradient(24, 19, 2, 32, 32, 27);
    fill.addColorStop(0, '#ffffff');
    fill.addColorStop(0.4, 'rgba(218,243,244,.28)');
    fill.addColorStop(0.78, 'rgba(164,203,211,.4)');
    fill.addColorStop(1, '#426877');
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(32, 32, 27, 0, 2 * Math.PI);
    ctx.fill();
  });
  const bubbleMat = new THREE.SpriteMaterial({ map: bubbleMap, transparent: true, depthWrite: false });
  const bubbles = Array.from({ length: 18 }, () => {
    const b = new THREE.Sprite(bubbleMat);
    b.renderOrder = 11;
    group.add(b);
    return b;
  });
  stream.renderOrder = 12;
  draining.renderOrder = 11;
  return {
    pouringWater,
    filterWater,
    waterWidth,
    spray,
    draining,
    filterArm,
    tools,
    bottles,
    balance,
    readout,
    sample,
    spoon,
    cylinder,
    bowl,
    raw,
    sand,
    sediment,
    cloud,
    fs,
    funnel,
    residue,
    receiver,
    heater,
    dish,
    brine,
    crystals,
    lamp,
    capper,
    mat,
    strip,
    stain,
    drop,
    stream,
    bubbles,
  };
}

// Keep the same atoms throughout approach, contact and settlement. A formula unit
// represents a small region of ionic solid, not a discrete precipitate molecule.
const PAIRS = {
  sulfate: ['Ba2+', 'SO4 2-', 'BaSO₄', 'Ba²⁺ + SO₄²⁻ → BaSO₄↓'],
  magnesium: ['Mg2+', 'OH-', 'Mg(OH)₂', 'Mg²⁺ + 2OH⁻ → Mg(OH)₂↓'],
  calcium: ['Ca2+', 'CO3 2-', 'CaCO₃', 'Ca²⁺ + CO₃²⁻ → CaCO₃↓'],
  competing: ['Ba2+', 'CO3 2-', 'BaCO₃', 'Ba²⁺ + CO₃²⁻ → BaCO₃↓'],
  barium: ['Ba2+', 'CO3 2-', 'BaCO₃', 'Ba²⁺ + CO₃²⁻ → BaCO₃↓'],
};
export function ionScene() {
  let index = -1,
    pieces = [],
    seed = [],
    spare,
    product,
    current;
  const duration = 4.2;
  return {
    time: 0,
    paused: false,
    still: true,
    holoBase: false,
    labels: (_, m) => m.rep,
    labelOnly: (_, m) => m.rep,
    init(c) {
      this.time = 0;
      index = -1;
      pieces = [];
      seed = [];
      spare = null;
      current = null;
      c.view.paper = null;
      c.view.film = 0;
      product = textSprite('', '#343d46');
      c.layer.add(product);
      product.visible = false;
    },
    step(c, st, dt) {
      if (!st.events.length) return;
      if (!this.paused) this.time = Math.min(st.events.length * duration, this.time + dt);
      const i = Math.min(st.events.length - 1, Math.floor(this.time / duration));
      const e = st.events[i],
        def = PAIRS[e.kind];
      if (index !== i) {
        for (const p of pieces.concat(seed)) c.remove(p);
        if (spare) c.remove(spare);
        product.material.map.dispose();
        product.material.dispose();
        c.layer.remove(product);
        product = textSprite(def[2], '#324853', 'rgba(255,255,255,0.9)');
        product.scale.multiplyScalar(1.15);
        c.layer.add(product);
        pieces = [def[0], def[1], ...(e.kind === 'magnesium' ? [def[1]] : [])].map((kind) =>
          c.add(kind, V(), { fixed: true }),
        );
        // Three occupied sites border the vacant corner. Repeat the same
        // stoichiometry at each site, keeping the incoming ions identifiable.
        const hydroxide = e.kind === 'magnesium';
        const sites = hydroxide
          ? [V(-1.2, 3.25, 0.5), V(-0.30, 3.64, 0.7), V(-1.58, 2.52, 1.12)]
          : [V(-2.12, 3.15, 0.4), V(0.08, 3.15, 0.4)];
        if (e.kind === 'sulfate') sites[0].set(-1.75, 4.01, -0.46);
        const across = hydroxide ? V(-1.45, 0.12, -0.46) : V(-2.6, 0.48, -1.45);
        const down = V(-0.12, -1.42, -0.94);
        seed = [];
        pieces.forEach((m, j) => {
          m.site = sites[j];
          m.g.rotation.set(0, 0, j === 2 || (j === 1 && !hydroxide && e.kind !== 'sulfate') ? Math.PI : 0);
          m.label.center.y = -0.12;
          for (const offset of [across, down, across.clone().add(down)]) {
            const site = m.site.clone().add(offset);
            const neighbor = c.add(m.kind, site, { fixed: true });
            neighbor.g.rotation.copy(m.g.rotation);
            neighbor.site = site;
            seed.push(neighbor);
          }
        });
        spare = e.spare && e.kind !== 'barium' ? c.add('Ba2+', V(5.1, 4.6, -1.4), { fixed: true, rep: true }) : null;
        index = i;
        current = e;
      }
      const t = this.time - i * duration;
      const k = clamp((t - 0.65) / 1.4, 0, 1),
        fall = clamp((t - 2.1) / 1.0, 0, 1);
      const x = e.kind === 'barium' ? 5.1 : -5.45;
      pieces.forEach((m, j) => {
        const start = j === 0 ? V(x, 4.6, -1.4) : j === 1 ? V(3, 2.7, 1.1) : V(-0.2, 5.2, 0.9);
        m.g.position.lerpVectors(start, m.site, k * k * (3 - 2 * k));
        m.g.position.y -= fall * 1.25;
        m.rep = k < 0.38 && j < 2;
        if (!m.rep) m.label.material.opacity = 0;
      });
      for (const m of seed) m.g.position.y = m.site.y - fall * 1.25;
      product.position.set(-2.9, 5.75 - fall * 1.25, -1);
      product.visible = k >= 0.99;
      if (spare) spare.g.position.y = 4.6 + 0.12 * Math.sin(t * 1.4);
    },
    text(c, st) {
      if (!current) return { eq: '粗盐水中的杂质离子', cap: '加入沉淀剂后，可以追踪离子进入沉淀的过程。' };
      const def = PAIRS[current.kind],
        t = this.time - index * duration;
      const cap =
        t < 0.65
          ? current.kind === 'barium'
            ? '右上方是先前多加的 Ba²⁺。'
            : '先看溶液中仍然分开的离子。'
          : t < 2.1
            ? current.kind === 'magnesium'
              ? '一个 Mg²⁺ 和两个 OH⁻ 正在并入固体。'
              : '两种离子正在靠拢，并入固体。'
            : t < 3.15
              ? def[2] + ' 颗粒长大，逐渐下沉。'
              : current.kind === 'competing'
                ? '已有的碳酸根也会使后来加入的钡离子形成白色沉淀。'
                : current.kind === 'barium'
                  ? '过量 BaCl₂ 引入的 Ba²⁺ 也进入了沉淀。'
                  : current.spare
                    ? '这部分固体已经沉下，右上方的 Ba²⁺ 仍在溶液里。'
                    : '这组离子进入了沉淀。';
      return { eq: def[3], on: true, cap: '离子固体的局部示意　' + cap };
    },
  };
}
