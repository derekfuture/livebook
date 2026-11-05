import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { beaker, canvasTex } from './props.js';
import { block, caption } from './electronicsBench.js';
import { GRID } from './oilFilm.js';

export const STOCK_X = -0.245,
  CUP_X = -0.169,
  PAN_X = 0.04,
  PAN_W = 0.242,
  WATER_Y = 0.017,
  PLATE_Y = 0.026;
export const BAG_HOME = new THREE.Vector3(-0.133, 0.014, 0.089);
export const STROKE = 0.062,
  SYRINGE_ZERO = 0.016;
const GLASS_W = 0.26;
function cyl(parent, r, h, x, y, z, color) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 32), paint(color));
  c.position.set(x, y, z);
  parent.add(c);
  return c;
}
export function oilFilmRig() {
  const group = new THREE.Group();
  const stock = beaker({ r: 0.022, h: 0.055, level: 0.042, color: 0xdfd8a9 }),
    cup = beaker({ r: 0.017, h: 0.035, level: 0, color: 0xdfd8a9 });
  stock.position.x = STOCK_X;
  cup.position.x = CUP_X;
  group.add(stock, cup);
  caption(group, '油酸 1 mL / 溶液 500 mL', STOCK_X, 0.001, 0.034, 0.107, 0.012);
  caption(group, '数滴烧杯', CUP_X, 0.001, 0.032, 0.047, 0.011);
  block(group, PAN_W + 0.01, 0.006, PAN_W + 0.01, PAN_X, 0.003, 0, 0x465158);
  for (const sign of [-1, 1]) {
    block(group, 0.004, 0.022, PAN_W + 0.008, PAN_X + sign * (PAN_W / 2 + 0.002), 0.014, 0, 0x465158);
    block(group, PAN_W, 0.022, 0.004, PAN_X, 0.014, sign * (PAN_W / 2 + 0.002), 0x465158);
  }
  const waterTex = canvasTex(1024, 1024, () => {}),
    waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(PAN_W, PAN_W), new THREE.MeshBasicMaterial({ map: waterTex }));
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.set(PAN_X, WATER_Y, 0);
  group.add(waterMesh);
  let powder = [],
    coverage = new Set();
  function water(outline = [], origin = null, expansion = 1) {
    const g = waterTex.canvas.getContext('2d'),
      w = waterTex.canvas.width,
      px = (n) => (n / PAN_W + 0.5) * w;
    const grad = g.createLinearGradient(0, 0, w, w);
    grad.addColorStop(0, '#657c78');
    grad.addColorStop(0.55, '#435c5a');
    grad.addColorStop(1, '#567875');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, w);
    const radii = origin && outline.map((p) => Math.hypot(p.x - origin.x, p.z - origin.z) * expansion);
    for (const particle of powder) {
      let { x, z } = particle;
      if (radii?.length) {
        const dx = x - origin.x,
          dz = z - origin.z,
          angle = (Math.atan2(dz, dx) + Math.PI * 2) % (2 * Math.PI);
        const k = (angle / (Math.PI * 2)) * radii.length,
          j = Math.floor(k);
        const edge = THREE.MathUtils.lerp(radii[j], radii[(j + 1) % radii.length], k - j);
        if (Math.hypot(dx, dz) < edge) {
          x = origin.x + (edge + particle.r * 0.0016) * Math.cos(angle);
          z = origin.z + (edge + particle.r * 0.0016) * Math.sin(angle);
        }
      }
      g.fillStyle = particle.color;
      g.beginPath();
      g.arc(px(x), px(z), particle.r * 2.2 + 0.8, 0, 2 * Math.PI);
      g.fill();
    }
    waterTex.needsUpdate = true;
  }
  function sprinkle(x, z) {
    for (let i = 0; i < 110; i++) {
      const theta = Math.random() * 2 * Math.PI,
        r = 0.057 * Math.sqrt(Math.random());
      const px = x + r * Math.cos(theta),
        pz = z + r * Math.sin(theta);
      if (Math.abs(px) >= PAN_W / 2 || Math.abs(pz) >= PAN_W / 2) continue;
      const grain = Math.random();
      powder.push({ x: px, z: pz, r: grain, color: grain < 0.5 ? '#d2d1bc' : '#e9e5d3' });
    }
    if (Math.abs(x) < PAN_W / 2 && Math.abs(z) < PAN_W / 2) coverage.add((x >= 0 ? 1 : 0) + (z >= 0 ? 2 : 0));
    water();
  }
  const bag = new THREE.Group();
  group.add(bag);
  const cloth = new THREE.Mesh(new THREE.SphereGeometry(0.016, 24, 18), paint(0xe8dfc6));
  cloth.scale.set(1, 0.8, 1);
  bag.add(cloth);
  cyl(bag, 0.006, 0.01, 0, 0.014, 0, 0x997b56);
  bag.position.copy(BAG_HOME);
  caption(group, '粉袋', BAG_HOME.x, 0.001, BAG_HOME.z + 0.026);
  const gridTex = canvasTex(1040, 1040, () => {}),
    plate = new THREE.Mesh(
      new THREE.PlaneGeometry(GLASS_W, GLASS_W),
      new THREE.MeshBasicMaterial({ map: gridTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    );
  plate.renderOrder = 4;
  group.add(plate);
  const plateHome = new THREE.Vector3(PAN_X, 0.132, -0.155);
  block(group, 0.18, 0.009, 0.022, PAN_X, 0.0045, plateHome.z, 0x967650);
  function grid(trace = [], marked = new Set()) {
    const g = gridTex.canvas.getContext('2d'),
      w = gridTex.canvas.width;
    const px = (n) => (n / GLASS_W + 0.5) * w;
    g.clearRect(0, 0, w, w);
    g.fillStyle = 'rgba(183,212,205,.16)';
    g.fillRect(0, 0, w, w);
    g.strokeStyle = 'rgba(73,94,90,.53)';
    g.lineWidth = 1.8;
    for (let i = -13; i <= 13; i++) {
      const a = px(i * GRID);
      g.beginPath();
      g.moveTo(a, 0);
      g.lineTo(a, w);
      g.moveTo(0, a);
      g.lineTo(w, a);
      g.stroke();
    }
    g.fillStyle = 'rgba(180,95,59,.24)';
    for (const id of marked) {
      const [x, z] = id.split('/').map(Number);
      g.fillRect(px(x * GRID), px(z * GRID), (w * GRID) / GLASS_W, (w * GRID) / GLASS_W);
    }
    if (trace.length) {
      g.strokeStyle = '#893f30';
      g.lineWidth = 4;
      g.lineJoin = 'round';
      g.beginPath();
      trace.forEach((p, i) => (i ? g.lineTo(px(p.x), px(p.z)) : g.moveTo(px(p.x), px(p.z))));
      g.stroke();
    }
    g.strokeStyle = '#698580';
    g.lineWidth = 7;
    g.strokeRect(0, 0, w, w);
    gridTex.needsUpdate = true;
  }
  const syringe = new THREE.Group();
  group.add(syringe);
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0031, 0.0031, 0.066, 32, 1, true),
    paint(0xc6d9d3, { transparent: true, opacity: 0.24, depthWrite: false, side: THREE.DoubleSide }),
  );
  tube.position.y = SYRINGE_ZERO + 0.031;
  syringe.add(tube);
  cyl(syringe, 0.00052, 0.012, 0, 0.006, 0, 0x98a4a0);
  cyl(syringe, 0.0027, 0.004, 0, 0.014, 0, 0x94a5a1);
  const solution = cyl(syringe, 0.00235, 1, 0, 0, 0, 0xd1c28e);
  const plunger = new THREE.Group();
  syringe.add(plunger);
  cyl(plunger, 0.00265, 0.0024, 0, 0.0012, 0, 0x71664e);
  cyl(plunger, 0.0014, 0.069, 0, 0.036, 0, 0xa5ada6);
  const thumb = cyl(plunger, 0.008, 0.002, 0, 0.071, 0, 0xa69880);
  const scaleTex = canvasTex(256, 1536, (g, w, h) => {
    g.fillStyle = '#efe8d1';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#34504f';
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    g.font = '34px sans-serif';
    for (let i = 0; i <= 100; i++) {
      const y = (1 - (i + 2) / 104) * h;
      g.fillRect(0, y - 1, i % 10 === 0 ? 80 : i % 5 === 0 ? 52 : 28, 2);
      if (i % 10 === 0) g.fillText((i / 100).toFixed(1), w - 10, y);
    }
  });
  const scale = new THREE.Mesh(new THREE.PlaneGeometry(0.005, 0.06448), new THREE.MeshBasicMaterial({ map: scaleTex }));
  scale.position.set(0.0049, SYRINGE_ZERO + 0.031, 0.0033);
  syringe.add(scale);
  block(syringe, 0.019, 0.0018, 0.009, 0, SYRINGE_ZERO + 0.064, 0, 0xb6afa1);
  // 支架让学生松手读数。夹头沿横杆平移，低位取液，越过杯口时抬起。
  block(group, 0.038, 0.008, 0.035, -0.274, 0.004, -0.083, 0x686862);
  cyl(group, 0.003, 0.175, -0.274, 0.089, -0.083, 0x86918f);
  block(group, 0.404, 0.006, 0.006, -0.076, 0.158, -0.083, 0x939f9a);
  const carriage = new THREE.Group();
  group.add(carriage);
  block(carriage, 0.012, 0.013, 0.014, 0, 0.158, -0.083, 0x6e7778);
  const arm = block(carriage, 0.005, 0.005, 1, 0, 0.158, 0, 0x8c9791);
  const vertical = cyl(carriage, 0.0018, 1, 0, 0, 0, 0x8c9791);
  const clamp = block(syringe, 0.012, 0.006, 0.01, -0.002, SYRINGE_ZERO + 0.059, -0.003, 0x8e7155);
  function position(x, y, z) {
    syringe.position.set(x, y, z);
    carriage.position.x = x;
    arm.scale.z = z + 0.083;
    arm.position.z = (z - 0.083) / 2;
    const at = y + SYRINGE_ZERO + 0.059;
    vertical.position.set(0, (at + 0.158) / 2, z - 0.003);
    vertical.scale.y = Math.max(0.001, 0.158 - at);
  }
  function volume(ml) {
    plunger.position.y = SYRINGE_ZERO + ml * STROKE;
    solution.scale.y = Math.max(0.00001, ml * STROKE);
    solution.position.y = SYRINGE_ZERO + (ml * STROKE) / 2;
    solution.visible = ml > 0.001;
  }
  const hanging = new THREE.Mesh(new THREE.SphereGeometry(0.0016, 16, 12), paint(0xc9d6c9));
  syringe.add(hanging);
  const drops = new THREE.Group();
  group.add(drops);
  function resetTray() {
    powder = [];
    coverage = new Set();
    water();
    grid();
    plate.position.copy(plateHome);
    plate.rotation.x = -0.06;
    bag.position.copy(BAG_HOME);
  }
  resetTray();
  volume(0);
  position(STOCK_X, 0.035, 0);
  return {
    group,
    stock,
    cup,
    syringe,
    plunger,
    thumb,
    scale,
    clamp,
    hanging,
    drops,
    plate,
    plateHome,
    bag,
    grid,
    water,
    sprinkle,
    resetTray,
    volume,
    position,
    get powdered() {
      return coverage.size === 4;
    },
    get coverage() {
      return coverage.size;
    },
  };
}
