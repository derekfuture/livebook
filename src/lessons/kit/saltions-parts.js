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
export const PH_COLORS = { 酸性: 0xc94b38, 微酸性: 0xc4bc46, 中性: 0x82a651, 碱性: 0x657ba8 };
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
// Vertical slices of the round cavity share one horizontal free surface.
// At the pouring angle that plane just meets the inside edge of the lip.
function liquidIn(cup) {
  const r = cup.r - 0.0012, base = 0.0012, depth = cup.h - base;
  const slices = 40, dx = 2 * r / slices;
  const weights = Array.from({ length: slices }, (_, i) => Math.sqrt(r * r - (-r + (i + 0.5) * dx) ** 2));
  const total = weights.reduce((sum, v) => sum + v, 0);
  function meanHeight(left, slope) {
    return weights.reduce((sum, w, i) => sum + w * clamp(left - (i + 0.5) * dx * slope, 0, depth), 0) / total;
  }
  let lastFill, lastSlope, lastHeight, lastAngle;
  function slopeAtLip(fill) {
    if (lastFill === fill) return lastSlope;
    let lo = 0, hi = depth * slices / r;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (meanHeight(depth, mid) > fill) lo = mid;
      else hi = mid;
    }
    lastFill = fill;
    return lastSlope = (lo + hi) / 2;
  }
  const geo = new THREE.BufferGeometry();
  const pos = new THREE.Float32BufferAttribute((slices + 1) * 4 * 3, 3);
  geo.setAttribute('position', pos);
  const faces = [];
  for (let j = 0; j < slices; j++) {
    for (let k = 0; k < 4; k++) {
      const a = j * 4 + k, b = j * 4 + (k + 1) % 4;
      faces.push(a, b, a + 4, b, b + 4, a + 4);
    }
  }
  geo.setIndex(faces);
  const body = mesh(cup, geo, water2({ color: 0x9dc4cf, base: 0.64 }));
  body.frustumCulled = false;
  body.renderOrder = 8;
  return {
    angle: (height) => Math.atan(slopeAtLip(Math.max(0, height - base))),
    draw(height, angle) {
      if (lastHeight === height && lastAngle === angle) return;
      lastHeight = height;
      lastAngle = angle;
      body.visible = angle > 0.001 && height > base;
      cup.setLevel(body.visible ? 0 : height);
      if (!body.visible) return;
      const slope = Math.tan(angle);
      let low = 0, high = depth + 2 * r * slope;
      for (let i = 0; i < 19; i++) {
        const mid = (low + high) / 2;
        if (meanHeight(mid, slope) < height - base) low = mid;
        else high = mid;
      }
      const left = (low + high) / 2, width = Math.min(2 * r, left / slope);
      for (let j = 0; j <= slices; j++) {
        const d = width * j / slices, x = d - r;
        const z = Math.sqrt(Math.max(0, r * r - x * x));
        const y = base + clamp(left - d * slope, 0, depth);
        pos.setXYZ(4 * j, x, base, -z);
        pos.setXYZ(4 * j + 1, x, y, -z);
        pos.setXYZ(4 * j + 2, x, y, z);
        pos.setXYZ(4 * j + 3, x, base, z);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    },
  };
}

const SCALE_BASE = 0.003, ML = 0.0023;
export const WATER_LEVEL = SCALE_BASE + 20 * ML;
function cylinderScale(cup) {
  const tex = canvasTex(384, 1200, (ctx, w, h) => {
    ctx.fillStyle = '#324956';
    ctx.font = 'bold 60px sans-serif';
    ctx.textBaseline = 'middle';
    for (let ml = 1; ml <= 25; ml++) {
      const y = h - (SCALE_BASE + ml * ML) / cup.h * h;
      const major = ml % 5 === 0;
      ctx.fillRect(12, y - 1.5, major ? 145 : 75, major ? 5 : 3);
      if (major) ctx.fillText(String(ml), 172, y);
    }
    ctx.font = '48px sans-serif';
    ctx.fillText('mL', 178, h - 51);
  });
  const scale = mesh(cup, new THREE.PlaneGeometry(0.014, cup.h), new THREE.MeshBasicMaterial({
    map: tex, transparent: true, depthWrite: false,
  }), 0.002, cup.h / 2, cup.r + 0.0004);
  scale.renderOrder = 12;
  const profile = Array.from({ length: 16 }, (_, i) => {
    const u = i / 15;
    return new THREE.Vector2(u * (cup.r - 0.0012), 0.0011 * u ** 5);
  });
  profile.push(new THREE.Vector2(cup.r - 0.0012, 0));
  const meniscus = mesh(cup, new THREE.LatheGeometry(profile, 48), water2({ color: 0xa9cbd1, base: 0.48 }), 0, WATER_LEVEL);
  meniscus.renderOrder = 9;
  return meniscus;
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
  const display = plate(balance, '0.0 g', 0.037, 0.011, 0, 0.009, 0.03, '#c6d2bc').material.map;
  let displayed = '0.0 g';
  function readout(mass) {
    const text = mass.toFixed(1) + ' g';
    if (text === displayed) return;
    displayed = text;
    const canvas = display.image, ctx = canvas.getContext('2d');
    ctx.fillStyle = '#c6d2bc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#23293a';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    display.needsUpdate = true;
  }
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
  const cylinder = chemBeaker({ r: 0.0115, h: 0.064, level: WATER_LEVEL, color: 0xc3dfe5, marks: false });
  mesh(cylinder, new THREE.CylinderGeometry(0.018, 0.019, 0.004, 8), glassMat({ opacity: 0.55 }), 0, 0.002);
  const meniscus = cylinderScale(cylinder);
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
  const fallingSalt = grains(group, 18, 0.007, 0xd8cdad, 0.0025);
  const cloud = milky(bowl.liq, { n: 45, speck: 0.0009 });
  pouring('cup', bowl, CUP, 0.001, R, H);
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
    const b = (bottles[id] = dropBottle(group, V(x, 0.001), { r: 0.016, h: 0.041 }));
    plate(b, '滴瓶 · ' + NAMES[id], 0.036, 0.008, 0, 0.023, 0.0165);
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
  Object.entries(PH_COLORS).forEach(([label, color], i) => {
    const x = (i - 1.5) * 0.014;
    mesh(strip, new THREE.BoxGeometry(0.012, 0.001, 0.008), neutral(color), x, 0, 0.02);
    const p = plate(strip, label, 0.014, 0.006, x, 0.001, 0.027);
    p.rotation.x = -Math.PI * 0.43;
  });
  const stain = mesh(strip, new THREE.CircleGeometry(0.004, 24), neutral(0x9aab51), -0.006, 0.002);
  stain.rotation.x = -Math.PI / 2;
  const drop = mesh(group, lathe([[0, -0.0021], [0.0015, -0.0014], [0.0019, -0.0004], [0.0015, 0.001], [0, 0.0031]]),
    new THREE.MeshPhysicalMaterial({ color: 0x668994, transparent: true, opacity: 0.85, roughness: 0.18 }));
  drop.renderOrder = 12;
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
    liquid: { water: liquidIn(cylinder), cup: liquidIn(bowl), filtrate: liquidIn(receiver) },
    meniscus,
    spray,
    draining,
    filterArm,
    tools,
    bottles,
    balance,
    readout,
    sample,
    fallingSalt,
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
