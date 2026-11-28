import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { beaker, canvasTex, textPlate } from './props.js';
import { block } from './electronicsBench.js';
import { GRID } from './oilFilm.js';

export const STOCK_X = -0.245,
  CUP_X = -0.169,
  PAN_X = 0.04,
  PAN_W = 0.242,
  WATER_Y = 0.017,
  PLATE_Y = 0.026;
export const BAG_HOME = new THREE.Vector3(-0.133, 0.014, 0.089);
export const CAPACITY = 0.20;
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
  const stock = beaker({ r: 0.022, h: 0.055, level: 0.050, color: 0xdfd8a9 }),
    cup = beaker({ r: 0.017, h: 0.035, level: 0, color: 0xdfd8a9 });
  stock.setColor(0xd8d6b9, 0.35);
  cup.setColor(0xd8d6b9, 0.35);
  stock.position.x = STOCK_X;
  cup.position.x = CUP_X;
  group.add(stock, cup);
  function label(text, x, z, width) {
    const tag = textPlate(text, { w: width, h: 0.013, font: 'bold 76px sans-serif', color: '#394b4a', bg: '#f0e6ce' });
    tag.position.set(x, 0.001, z);
    tag.rotation.x = -Math.PI / 2;
    group.add(tag);
  }
  label('稀释液', STOCK_X, 0.033, 0.044);
  label('数滴烧杯', CUP_X, 0.031, 0.054);
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
    coverage = new Array(9).fill(0);
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
    // 轮廓生成时经过横纵向缩放，按实际极角插值，粉线与所描的边界重合。
    const radii = origin && outline.map((p) => ({
      angle: Math.atan2(p.z - origin.z, p.x - origin.x),
      r: Math.hypot(p.x - origin.x, p.z - origin.z) * expansion,
    })).sort((a, b) => a.angle - b.angle);
    const edgeAt = (angle) => {
      let lo = 0, hi = radii.length;
      while (lo < hi) {
        const m = (lo + hi) >> 1;
        if (radii[m].angle < angle) lo = m + 1;
        else hi = m;
      }
      const a = radii[(lo + radii.length - 1) % radii.length], b = radii[lo % radii.length];
      const span = (b.angle - a.angle + 2 * Math.PI) % (2 * Math.PI);
      return THREE.MathUtils.lerp(a.r, b.r, ((angle - a.angle + 2 * Math.PI) % (2 * Math.PI)) / span);
    };
    for (const particle of powder) {
      let { x, z } = particle;
      if (radii?.length) {
        const dx = x - origin.x,
          dz = z - origin.z,
          angle = Math.atan2(dz, dx);
        const edge = edgeAt(angle);
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
    if (Math.abs(x) > PAN_W / 2 || Math.abs(z) > PAN_W / 2) return;
    for (let i = 0; i < 320; i++) {
      const theta = Math.random() * 2 * Math.PI,
        r = 0.080 * Math.sqrt(Math.random());
      const px = x + r * Math.cos(theta),
        pz = z + r * Math.sin(theta);
      if (Math.abs(px) >= PAN_W / 2 || Math.abs(pz) >= PAN_W / 2) continue;
      const grain = Math.random();
      const sector = Math.floor((px / PAN_W + 0.5) * 3) + 3 * Math.floor((pz / PAN_W + 0.5) * 3);
      coverage[sector]++;
      powder.push({ x: px, z: pz, r: grain, color: grain < 0.5 ? '#d2d1bc' : '#e9e5d3' });
    }

    water();
  }
  const sack = new THREE.LatheGeometry([
    [0, -0.013], [0.011, -0.012], [0.017, -0.006], [0.018, 0.001],
    [0.014, 0.008], [0.005, 0.015], [0.004, 0.018], [0.008, 0.023], [0, 0.022],
  ].map(([r, y]) => new THREE.Vector2(r, y)), 36);
  const verts = sack.attributes.position;
  for (let i = 0; i < verts.count; i++) {
    const x = verts.getX(i), z = verts.getZ(i);
    const fold = 1 + 0.08 * Math.cos(8 * Math.atan2(z, x));
    verts.setXYZ(i, x * fold, verts.getY(i), z * fold);
  }
  sack.computeVertexNormals();
  const bag = new THREE.Mesh(sack, paint(0xe6d6b8));
  group.add(bag);
  cyl(bag, 0.0053, 0.0025, 0, 0.016, 0, 0x8d6447);
  bag.position.copy(BAG_HOME);
  label('爽身粉', BAG_HOME.x, BAG_HOME.z + 0.026, 0.048);
  const gridTex = canvasTex(1040, 1040, () => {}),
    plate = new THREE.Mesh(
      new THREE.PlaneGeometry(GLASS_W, GLASS_W),
      new THREE.MeshBasicMaterial({ map: gridTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    );
  plate.renderOrder = 4;
  group.add(plate);
  const plateHome = new THREE.Vector3(PAN_X + 0.273, PLATE_Y, 0);
  for (const sign of [-1, 1]) block(group, 0.012, PLATE_Y - 0.001, 0.255,
    plateHome.x + sign * 0.118, (PLATE_Y - 0.001) / 2, 0, 0xb49c7e);
  label('方格玻璃板', plateHome.x, 0.148, 0.07);
  function grid(trace = [], marked = new Set()) {
    const g = gridTex.canvas.getContext('2d'),
      w = gridTex.canvas.width;
    const px = (n) => (n / GLASS_W + 0.5) * w;
    g.clearRect(0, 0, w, w);
    g.fillStyle = marked.size || (trace.length && trace[0] === trace[trace.length - 1]) ? 'rgba(236,238,212,.83)' : 'rgba(196,221,214,.28)';
    g.fillRect(0, 0, w, w);
    g.strokeStyle = 'rgba(73,94,90,.53)';
    g.lineWidth = 1.8;
    for (let i = -13; i <= 13; i++) {
      const a = px(i * GRID);
      g.strokeStyle = trace.length && trace[trace.length - 1] === trace[0]
        ? 'rgba(27,60,63,.7)' : 'rgba(51,81,81,.60)';
      g.lineWidth = i % 5 === 0 ? 3.5 : 1.55;
      g.beginPath();
      g.moveTo(a, 0);
      g.lineTo(a, w);
      g.moveTo(0, a);
      g.lineTo(w, a);
      g.stroke();
    }
    g.fillStyle = 'rgba(41,114,124,.40)';
    for (const id of marked) {
      const [x, z] = id.split('/').map(Number);
      g.fillRect(px(x * GRID), px(z * GRID), (w * GRID) / GLASS_W, (w * GRID) / GLASS_W);
    }
    if (trace.length) {
      g.strokeStyle = '#a64422';
      g.lineWidth = 5;
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
    new THREE.CylinderGeometry(0.0031, 0.0031, 0.073, 32, 1, true),
    paint(0xc6d9d3, { transparent: true, opacity: 0.24, depthWrite: false, side: THREE.DoubleSide }),
  );
  tube.position.y = SYRINGE_ZERO + 0.0345;
  syringe.add(tube);
  cyl(syringe, 0.00052, 0.012, 0, 0.006, 0, 0x98a4a0);
  cyl(syringe, 0.0027, 0.004, 0, 0.014, 0, 0x94a5a1);
  const solution = cyl(syringe, 0.00235, 1, 0, 0, 0, 0xd1c28e);
  const plunger = new THREE.Group();
  syringe.add(plunger);
  cyl(plunger, 0.0027, 0.0036, 0, 0.0018, 0, 0x30393a);
  cyl(plunger, 0.0014, 0.069, 0, 0.036, 0, 0xa5ada6);
  const thumb = cyl(plunger, 0.011, 0.004, 0, 0.071, 0, 0xa69880);
  const scaleTex = canvasTex(384, 1152, (g, w, h) => {
    g.fillStyle = '#fff4d9';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#273e40';
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.font = 'bold 50px sans-serif';
    g.fillText('mL', w - 84, 28);
    g.font = 'bold 78px sans-serif';
    for (let i = 0; i <= 20; i++) {
      const y = h * (1 - (i + 1.5) / 23);
      const major = i % 5 === 0;
      g.fillRect(0, y - (major ? 4 : 2.5), major ? 112 : 58, major ? 8 : 5);
      if (major) g.fillText((i / 100).toFixed(2), 122, y);
    }
  });
  const scaleWidth = 0.021;
  const scale = new THREE.Mesh(new THREE.PlaneGeometry(scaleWidth, STROKE * 23 / 20), new THREE.MeshBasicMaterial({ map: scaleTex }));
  scale.position.set(0.003 + scaleWidth / 2, SYRINGE_ZERO + STROKE / 2, 0.002);
  syringe.add(scale);
  block(syringe, 0.019, 0.0018, 0.009, 0, SYRINGE_ZERO + 0.069, 0, 0xb6afa1);
  // 支架让学生松手读数。夹头沿横杆平移，低位取液，越过杯口时抬起。
  block(group, 0.038, 0.008, 0.035, -0.274, 0.004, -0.083, 0x686862);
  cyl(group, 0.003, 0.175, -0.274, 0.089, -0.083, 0x86918f);
  const boom = block(group, 1, 0.006, 0.006, 0, 0.158, -0.083, 0x939f9a);
  const carriage = new THREE.Group();
  group.add(carriage);
  block(carriage, 0.018, 0.013, 0.014, -0.003, 0.158, -0.083, 0x6e7778);
  const arm = block(carriage, 0.005, 0.005, 1, 0, 0.158, 0, 0x8c9791);
  const vertical = cyl(carriage, 0.0018, 1, 0, 0, 0, 0x8c9791);
  const clamp = block(syringe, 0.025, 0.006, 0.009, -0.015, SYRINGE_ZERO + 0.056, -0.003, 0x8e7155);
  function position(x, y, z) {
    syringe.position.set(x, y, z);
    boom.scale.x = x + 0.274 + 0.008;
    boom.position.x = -0.274 + boom.scale.x / 2;
    carriage.position.x = x;
    arm.scale.z = z + 0.083;
    arm.position.set(-0.006, 0.158, (z - 0.083) / 2);
    const at = y + clamp.position.y;
    vertical.position.set(-0.006, (at + 0.158) / 2, z - 0.003);
    vertical.scale.y = Math.max(0.001, 0.158 - at);
  }
  function volume(ml) {
    plunger.position.y = SYRINGE_ZERO + ml / CAPACITY * STROKE;
    solution.scale.y = Math.max(0.00001, ml / CAPACITY * STROKE);
    solution.position.y = SYRINGE_ZERO + (ml / CAPACITY * STROKE) / 2;
    solution.visible = ml > 0.001;
  }
  const hanging = new THREE.Mesh(new THREE.SphereGeometry(0.0016, 16, 12), paint(0xc9d6c9));
  syringe.add(hanging);
  const drops = new THREE.Group();
  group.add(drops);
  function resetTray() {
    powder = [];
    coverage = new Array(9).fill(0);
    water();
    grid();
    plate.position.copy(plateHome);
    plate.rotation.x = -Math.PI / 2;
    bag.position.copy(BAG_HOME);
  }
  resetTray();
  volume(0);
  position(STOCK_X, 0.047, 0);
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
      return coverage.every((n) => n >= 32);
    },
  };
}
