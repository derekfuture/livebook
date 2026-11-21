// 图 1-3 的前壁剖开，以便从杯外看到内筒、隔热层和搅拌环。
import * as THREE from 'three';
import { glass2, water2 } from './chemfx.js';
import { faceLabel } from './labels.js';
import { canvasTex } from './props.js';
import { clamp } from './interact.js';
import { homeTo, spread } from './microlayout.js';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const RIM = 0.07;
export const cupSurface = (ml) => 0.0113 + ml * 0.00043;
const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.59, ...opts });
const put = (g, geometry, material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  g.add(m);
  return m;
};
const cyl = (g, r, height, m, x, y, z, r2 = r) => put(g, new THREE.CylinderGeometry(r, r2, height, 48), m, x, y, z);
const ring = (g, r, tube, m, x, y, z) => {
  const o = put(g, new THREE.TorusGeometry(r, tube, 8, 64), m, x, y, z);
  o.rotation.x = Math.PI / 2;
  return o;
};
const blank = () => new THREE.MeshBasicMaterial({ visible: false });
const pick = (g, w, h, d, x = 0, y = 0) => {
  const o = put(g, new THREE.BoxGeometry(w, h, d), blank(), x, y);
  o.userData.pick = true;
  return o;
};
function annulus(g, outer, inner, height, y, material, cut = false) {
  const profile = [
    [inner, 0],
    [outer, 0],
    [outer, height],
    [inner, height],
    [inner, 0],
  ];
  const start = cut ? 0.87 : 0,
    arc = 2 * Math.PI - 2 * start;
  put(
    g,
    new THREE.LatheGeometry(
      profile.map(([r, h]) => new THREE.Vector2(r, h)),
      80,
      start,
      arc,
    ),
    material,
    0,
    y,
  );
  if (cut)
    for (const a of [start, -start]) {
      const r = (outer + inner) / 2;
      put(
        g,
        new THREE.BoxGeometry(0.0004, height, outer - inner),
        material,
        Math.sin(a) * r,
        y + height / 2,
        Math.cos(a) * r,
      ).rotation.y = a;
    }
}
// 废液槽在量热计后方，内筒绕靠近槽口的一侧倾倒。
export const WASTE = V(-0.054, 0.122, -0.073);
export function calorimeter(group) {
  const g = new THREE.Group();
  group.add(g);
  const shell = mat(0x426564),
    steel = mat(0xb1c0be, { metalness: 0.35 });
  const cork = mat(0xc49b66, {
    map: canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#f8ebd3';
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 3600; i++) {
        c.fillStyle = i % 3 ? '#e6d8b8' : '#b9a789';
        c.fillRect((i * 137) % 251, (i * i * 57) % 253, 1 + (i % 3), 1 + (i % 2));
      }
    }),
  });
  cyl(g, 0.039, 0.005, shell, 0, 0.0026, 0);
  annulus(g, 0.039, 0.036, 0.062, 0.005, shell, true);
  annulus(g, 0.036, 0.029, 0.059, 0.006, cork, true);
  const insert = new THREE.Group();
  g.add(insert);
  annulus(insert, 0.029, 0.027, 0.06, 0.009, steel, true);
  cyl(insert, 0.0288, 0.004, steel, 0, 0.009, 0);
  ring(insert, 0.0284, 0.0011, steel, 0, RIM - 0.001, 0);
  const depth = RIM - cupSurface(0);
  const fill = cylinderLiquid(insert, 0.0268, depth, depth / 0.00043, cupSurface(0));
  const surface = ring(insert, 0.0263, 0.00045, mat(0x88a9ad), 0, 0, 0);

  const drain = new THREE.Group();
  drain.position.set(WASTE.x, 0, WASTE.z);
  g.add(drain);
  const enamel = mat(0x71918b);
  annulus(drain, 0.031, 0.028, 0.047, 0.001, enamel);
  cyl(drain, 0.028, 0.002, enamel, 0, 0.003, 0);
  cyl(drain, 0.006, 0.001, mat(0x344944), 0, 0.0045, 0);
  faceLabel(drain, '废液槽', { y: 0.034, z: 0.032, h: 0.009 });
  const jet = cyl(drain, 0.0015, WASTE.y - 0.006,
    water2({ color: 0xb8d9dc, base: 0.76 }), 0, (WASTE.y + 0.006) / 2, 0);
  return { insert, show(ml, angle, pouring) {
    fill(ml, angle);
    surface.visible = ml > 0 && angle === 0;
    surface.position.y = cupSurface(ml);
    jet.visible = pouring;
  } };
}

export function cover(group, park) {
  // 杯盖停放架从外缘承托杯盖，搅拌环可以垂在架内。
  const rack = new THREE.Group();
  group.add(rack);
  rack.position.x = park.x;
  const support = mat(0x718a84, { metalness: 0.3 });
  ring(rack, 0.034, 0.0014, support, 0, park.y - 0.0014, 0);
  for (const a of [0, 2 * Math.PI / 3, 4 * Math.PI / 3]) {
    cyl(rack, 0.0015, park.y - 0.0014, support,
      0.034 * Math.sin(a), (park.y - 0.0014) / 2, 0.034 * Math.cos(a));
  }
  const body = new THREE.Group();
  group.add(body);
  const shape = new THREE.Shape();
  shape.absarc(0, 0, 0.0395, 0, Math.PI * 2, false);
  for (const [x, r] of [
    [-0.009, 0.0031],
    [0.012, 0.0023],
  ]) {
    const p = new THREE.Path();
    p.absarc(x, 0, r, 0, Math.PI * 2, true);
    shape.holes.push(p);
  }
  const top = put(
    body,
    new THREE.ExtrudeGeometry(shape, {
      depth: 0.005,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelThickness: 0.0006,
      bevelSize: 0.0006,
      curveSegments: 48,
    }),
    mat(0x536d68),
  );
  top.rotation.x = -Math.PI / 2;
  // 左孔的厚孔沿贴合温度计杆，右孔给搅拌器留出上下活动的余量。
  const edge = mat(0xc5cfc7);
  const lip = new THREE.Group();
  body.add(lip);
  lip.position.x = -0.009;
  annulus(lip, 0.005, 0.0025, 0.0027, 0.005, edge);
  ring(body, 0.0028, 0.0006, edge, 0.012, 0.0053, 0);
  const rod = new THREE.Group();
  body.add(rod);
  rod.position.x = 0.012;
  const glass = glass2({ base: 0.48, rim: 0.79, tint: 0xb5d0cc });
  cyl(rod, 0.00165, 0.094, glass, 0, 0.047, 0);
  // 杆在工作位时，下限位环的底面压在右孔孔沿上。
  cyl(rod, 0.0042, 0.003, mat(0xb96d38), 0, 0.0544, 0);
  const loop = ring(rod, 0.0095, 0.00165, glass, -0.0095, 0, 0);
  loop.rotation.z = 0.07;
  const grip = put(rod, new THREE.SphereGeometry(0.0023, 16, 12), glass, 0, 0.094, 0);
  grip.scale.y = 1.3;
  faceLabel(body, '杯盖', { x: 0, y: 0.006, z: 0.041, h: 0.008 });
  faceLabel(rod, '玻璃搅拌器', { x: 0.016, y: 0.092, h: 0.008, color: '#344c49', stroke: '#fff9e8' });
  const lidPick = pick(body, 0.07, 0.009, 0.061, 0, 0.003);
  return { body, pick: lidPick, ringTarget: top, rod, grip, rodPick: pick(rod, 0.009, 0.03, 0.009, 0, 0.082) };
}

const CYL_H = 0.089,
  CYL_R = 0.014;
function cylinderLiquid(g, radius = CYL_R * 0.95, length = CYL_H - 0.002, capacity = 60, bottom = -CYL_H / 2) {
  // 截取倾斜量筒中水平液面以下的几何，并补上水平的液面。
  const n = 32,
    pts = Array.from({ length: n }, (_, i) => [
      Math.cos((2 * Math.PI * i) / n) * radius,
      Math.sin((2 * Math.PI * i) / n) * radius,
    ]);
  const geometry = new THREE.BufferGeometry(),
    material = water2({ color: 0xbad9dc, base: 0.51 });
  const buffer = new THREE.BufferAttribute(new Float32Array(n * 54), 3);
  geometry.setAttribute('position', buffer);
  geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 54), 3));
  const mesh = put(g, geometry, material, 0, bottom, 0);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  let old = '';
  return (ml, angle) => {
    const key = ml.toFixed(2) + '/' + angle.toFixed(3);
    if (key === old) return;
    old = key;
    mesh.visible = ml > 0.001;
    if (!mesh.visible) return;
    const sn = Math.sin(angle),
      cs = Math.cos(angle);
    // 由横截面平均液柱长度反求水平面的高度。
    let lo = Math.min(0, length * cs) - radius,
      hi = Math.max(0, length * cs) + radius;
    for (let j = 0; j < 16; j++) {
      const level = (lo + hi) / 2;
      let filled = 0,
        weights = 0;
      for (let k = 0; k < 32; k++) {
        const u = (k + 0.5) / 16 - 1,
          w = Math.sqrt(1 - u * u);
        const f = clamp((level - u * radius * sn) / ((Math.abs(cs) < 1e-6 ? 1e-6 : cs) * length), 0, 1);
        filled += w * (cs < 0 ? 1 - f : f);
        weights += w;
      }
      if (filled / weights < ml / capacity) lo = level;
      else hi = level;
    }
    const level = (lo + hi) / 2,
      intersections = [],
      vertices = [];
    const clip = (poly) => {
      const out = [];
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i],
          b = poly[(i + 1) % poly.length],
          da = a.x * sn + a.y * cs - level,
          db = b.x * sn + b.y * cs - level;
        if (da <= 0) out.push(a);
        if (da <= 0 !== db <= 0) {
          const p = a.clone().lerp(b, da / (da - db));
          out.push(p);
          intersections.push(p);
        }
      }
      return out;
    };
    const fan = (p) => {
      for (let i = 1; i + 1 < p.length; i++) vertices.push(p[0], p[i], p[i + 1]);
    };
    const bot = pts.map(([x, z]) => V(x, 0, z)),
      top = pts.map(([x, z]) => V(x, length, z));
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      fan(clip([bot[i], top[i], top[j], bot[j]]));
    }
    fan(clip(bot));
    fan(clip(top.slice().reverse()));
    const cap = intersections.filter((p, i) => intersections.findIndex((q) => q.distanceToSquared(p) < 1e-14) === i);
    if (cap.length > 2) {
      const center = cap.reduce((s, p) => s.add(p), V()).divideScalar(cap.length);
      const angleOf = (p) => Math.atan2(p.z - center.z, (p.x - center.x) * cs - (p.y - center.y) * sn);
      fan(cap.sort((a, b) => angleOf(b) - angleOf(a)));
    }
    vertices.forEach((p, i) => buffer.setXYZ(i, p.x, p.y, p.z));
    buffer.needsUpdate = true;
    geometry.setDrawRange(0, vertices.length);
    geometry.computeVertexNormals();
  };
}
export function graduate(group, name, sign) {
  const body = new THREE.Group();
  group.add(body);
  const glass = glass2({ base: 0.12, rim: 0.66 }),
    edge = mat(0x9bb7b6);
  const base = cyl(body, 0.02, 0.004, edge, 0, -0.0465, 0);
  base.geometry.dispose();
  base.geometry = new THREE.CylinderGeometry(0.018, 0.02, 0.004, 6);
  const wall = put(body, new THREE.CylinderGeometry(CYL_R, CYL_R, CYL_H, 48, 1, true), glass);
  wall.renderOrder = 5;
  ring(body, CYL_R, 0.00065, edge, 0, CYL_H / 2, 0);
  const lip = put(body, new THREE.ConeGeometry(0.004, 0.005, 3, 1, true), glass, sign * 0.014, 0.045, 0);
  lip.rotation.z = -sign * 1.1;
  const scale = canvasTex(160, 720, (c, w, h) => {
    c.fillStyle = '#274642';
    c.font = 'bold 37px sans-serif';
    c.fillText('mL', 72, 40);
    c.lineWidth = 3;
    c.strokeStyle = '#395953';
    for (let i = 0; i <= 60; i++) {
      const y = h * (1 - i / 60);
      c.beginPath();
      c.moveTo(5, y);
      c.lineTo(i % 10 === 0 ? 62 : i % 5 === 0 ? 44 : 26, y);
      c.stroke();
      if (i % 10 === 0 && i > 0 && i < 60) c.fillText(String(i), 71, y + 11);
    }
  });
  put(
    body,
    new THREE.PlaneGeometry(0.016, 0.087),
    new THREE.MeshBasicMaterial({ map: scale, transparent: true, depthWrite: false }),
    0,
    -0.001,
    0.0141,
  ).renderOrder = 7;
  const mouth = new THREE.Object3D();
  mouth.position.set(sign * 0.016, 0.045, 0);
  body.add(mouth);
  // 直立读数时，壁边的液面略高，刻度对准中央最低处。
  const meniscus = put(body, new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(0.010, 0),
    new THREE.Vector2(0.012, 0.0003), new THREE.Vector2(CYL_R * 0.95, 0.0012),
  ], 48), water2({ color: 0xbad9dc, base: 0.6 }));
  meniscus.renderOrder = 4;
  const edgePoints = Array.from({ length: 25 }, (_, i) => {
    const a = (i / 24 - 0.5) * Math.PI, x = Math.sin(a);
    return V(CYL_R * 0.95 * x, 0.0012 * x ** 6, CYL_R * 0.95 * Math.cos(a));
  });
  put(meniscus, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edgePoints), 32, 0.00014, 6, false),
    mat(0x809997)).renderOrder = 6;
  const fill = cylinderLiquid(body);
  const plate = faceLabel(body, name, { y: -0.034, z: 0.015, h: 0.0075, color: '#223f3d', stroke: '#fffff6' });
  const empty = faceLabel(body, '量筒 · 空', { y: -0.034, z: 0.015, h: 0.0075, color: '#223f3d', stroke: '#fffff6' });
  return { body, mouth, liquid(ml, angle) {
    fill(ml, angle);
    meniscus.position.y = -CYL_H / 2 + (CYL_H - 0.002) * ml / 60;
    meniscus.visible = ml > 0 && Math.abs(angle) < 0.005;
    plate.visible = ml > 0;
    empty.visible = !plate.visible;
  } };
}
export function cylinderHandle(group) {
  const body = new THREE.Group();
  group.add(body);
  return { body, pick: pick(body, 0.033, 0.09, 0.033) };
}
export function cleaning(group, x, clothX, rack) {
  const stand = new THREE.Group();
  group.add(stand);
  stand.position.x = x;
  // 冲洗口与接水槽合在同一处，流水只在温度计移入时出现。
  const enamel = mat(0xe3e9e3),
    metal = mat(0x9faea8, { metalness: 0.45 });
  cyl(stand, 0.019, 0.003, enamel, 0, 0.002, 0);
  annulus(stand, 0.019, 0.016, 0.009, 0.003, enamel);
  const curve = new THREE.CatmullRomCurve3([
    V(0, 0.006, -0.019),
    V(0, 0.043, -0.019),
    V(0, 0.047, -0.015),
    V(0, 0.047, -0.011),
    V(0, 0.041, -0.008),
  ]);
  put(stand, new THREE.TubeGeometry(curve, 30, 0.0019, 10, false), metal);
  const jet = V(0, 0.041, -0.008).sub(V(0, 0.003, 0.010));
  const water = cyl(stand, 0.0011, jet.length(), water2({ color: 0xb8dedf, base: 0.7 }), 0, 0.022, 0.001);
  water.quaternion.setFromUnitVectors(V(0, 1, 0), jet.normalize());
  water.visible = false;
  // 两端的 V 形托口托住水平的温度计杆，球泡伸在接液盘上。
  const tray = mat(0x648a84);
  put(group, new THREE.BoxGeometry(0.014, 0.003, 0.116), tray, rack.x, 0.0016, 0);
  for (const z of [-0.032, 0.032]) {
    for (const side of [-1, 1]) {
      put(group, new THREE.BoxGeometry(0.004, 0.012, 0.005), tray,
        rack.x + side * 0.0036, rack.y - 0.005, z).rotation.z = -side * 0.35;
    }
  }
  faceLabel(group, '湿用托架', { x: rack.x, y: 0.008, z: 0.061, h: 0.007, color: '#324744', stroke: '#fff9e8' });
  const cloth = mat(0xf0e9d6, {
    map: canvasTex(128, 512, (c, w, h) => {
      c.fillStyle = '#f4eee1';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#e2d9c5';
      for (let x = 0; x < w; x += 4) c.fillRect(x, 0, 1, h);
      for (let y = 0; y < h; y += 4) c.fillRect(0, y, w, 1);
      c.fillStyle = '#aab6ac';
      c.fillRect(0, 18, w, 6);
      c.fillRect(0, 29, w, 3);
    }),
  });
  for (let i = 0; i < 3; i++)
    put(
      group,
      new THREE.BoxGeometry(0.034, 0.0014, 0.126),
      cloth,
      clothX + i * 0.00055,
      0.001 + i * 0.0014,
      -0.006,
    ).rotation.y = 0.08 - i * 0.04;
  faceLabel(group, '冲洗槽 · 水', { x, y: 0.009, z: 0.019, h: 0.008, color: '#324744', stroke: '#fff9e8' });
  faceLabel(group, '干布', { x: clothX, y: 0.006, z: 0.064, h: 0.008, color: '#324744', stroke: '#fff9e8' });
  return water;
}
export function probe(group) {
  const body = new THREE.Group();
  group.add(body);
  const glass = glass2({ base: 0.24, rim: 0.74 }),
    red = mat(0xa73725);
  const grip = 0.055,
    length = 0.106;
  cyl(body, 0.0025, length, glass, 0, length / 2 - grip, 0);
  const radius = 0.0027, bulb = put(body, new THREE.SphereGeometry(radius, 16, 12), red, 0, -grip, 0);
  bulb.scale.y = 1.5;
  const plate = faceLabel(body, '温度计', { x: -0.012, y: 0.049, h: 0.008, color: '#344c49', stroke: '#fff9e8' });
  const center = V();
  const col = cyl(body, 0.00092, 1, red, 0, -grip, 0);
  col.geometry.translate(0, 0.5, 0);
  col.renderOrder = 7;
  const tex = canvasTex(130, 720, (c, w, h) => {
    c.fillStyle = '#f8f6eb';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#394542';
    c.font = 'bold 42px sans-serif';
    for (let k = 0; k <= 50; k++) {
      const y = h - 7 - (k * (h - 14)) / 50;
      c.fillRect(3, y, k % 10 === 0 ? 52 : k % 5 === 0 ? 37 : 20, 3);
      if (k % 10 === 0) c.fillText(String(20 + k / 5), 57, clamp(y + 11, 36, h - 5));
    }
  });
  put(body, new THREE.PlaneGeometry(0.0058, 0.047), new THREE.MeshBasicMaterial({ map: tex }), 0.0042, 0.025, 0);
  return {
    body, bulb, plate,
    ringTarget: cyl(body, 0.00265, 0.0013, mat(0xa3b0aa), 0, 0.025, 0),
    pick: pick(body, 0.011, 0.09, 0.009),
    immersed(x, width, bottom, surface) {
      center.copy(bulb.position).applyQuaternion(body.quaternion).add(body.position);
      return Math.hypot(center.x - x, center.z) + radius <= width &&
        center.y - radius * bulb.scale.y >= bottom && center.y + radius * bulb.scale.y <= surface;
    },
    read: (t) => {
      col.scale.y = grip + 0.025 - 0.0235 + 0.047 * (7 + 706 * clamp((t - 20) / 10, 0, 1)) / 720;
    },
  };
}

// 箭头在杯口和外壁之间向外移动。方向表示散热，深浅随示意热流变化。
export function heatLossArrows(group) {
  const directions = [V(-0.55, 0.83, 0.1), V(0.55, 0.83, 0.1), V(1, 0.1, 0.12)].map((v) => v.normalize());
  const arrows = directions.map((dir) => {
    const arrow = new THREE.Group(),
      ink = new THREE.MeshBasicMaterial({ color: 0xe17738, transparent: true, depthWrite: false });
    cyl(arrow, 0.00072, 0.008, ink, 0, 0.004, 0);
    put(arrow, new THREE.ConeGeometry(0.0026, 0.005, 12), ink, 0, 0.009, 0);
    arrow.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
    group.add(arrow);
    return { arrow, ink };
  });
  return (r, t, closed) => {
    arrows.forEach(({ arrow, ink }, i) => {
      arrow.visible = r.heat > 8 && r.phase <= 15 && (closed ? i === 2 : i !== 2);
      if (!arrow.visible) return;
      const u = (t * (closed ? 0.5 : 0.95) + i * 0.34) % 1;
      const start = closed ? V(0.039, 0.032, 0.012) : V(i ? 0.015 : -0.015, RIM + 0.002, 0.01);
      arrow.position.copy(start).addScaledVector(directions[i], u * 0.022);
      ink.opacity = (closed ? 0.29 : 0.86) * Math.sin(Math.PI * u) * Math.min(1, r.heat / 400);
    });
  };
}

export function heatScene() {
  let elapsed = 0,
    made = 0,
    pulse = null,
    releaseAt = 0;
  const reaction = {
    in: ['H+', 'OH-'],
    out: ['H2O'],
    host: 1,
    near: [[-1.3, 0.8, 0], null],
    map: [
      [1, 0],
      [1, 1],
      [0, 0],
    ],
    approach: 2.1,
    dur: 1.8,
    burst: [0xe9ac65, 0xf5a347],
  };
  return {
    labels: () => false,
    dim: 0.34,
    init(c) {
      elapsed = 0;
      made = 0;
      c.view.film = 4.6;
      c.view.speed = 0.65;
      const place = (kind, p, rep) => {
        const m = c.add(kind, c.V(p));
        m.rep = rep;
        m.g.rotation.set(0, 0, 0);
        m.site = m.g.position.clone();
        return m;
      };
      place('H+', [-2.9, 2.6, 1.3], true);
      place('Cl-', [-4.8, 1.4, -2.8], true);
      for (const p of [
        [-2.8, 1.1, 3.4],
        [-0.6, 1.8, -3.4],
        [3.9, 1.4, 2.9],
      ])
        place('H2O', p, false);
      pulse = ring(
        c.layer,
        1,
        0.045,
        new THREE.MeshBasicMaterial({ color: 0xf1a44f, transparent: true, depthWrite: false }),
        0,
        2,
        0,
      );
      pulse.visible = false;
    },
    step(c, st, dt) {
      elapsed += dt;
      if (st.mixed && elapsed > 1.25 && !c.count('Na+')) {
        for (const [kind, pos] of [['OH-', [1.8, 2.6, 0.4]], ['Na+', [4.7, 1.1, -2.9]]]) {
          const ion = c.add(kind, c.V(pos));
          ion.rep = true;
          ion.site = ion.g.position.clone();
          ion.g.rotation.set(0, 0, 0);
        }
      }
      if (!made && st.mixed && elapsed > 3.3 && !c.events.length && c.count('OH-'))
        c.start(reaction, [c.free('H+')[0], c.free('OH-')[0]], {
          then: ([m]) => {
            made++;
            m.rep = true;
            m.site = m.g.position.clone();
            releaseAt = elapsed;
            pulse.position.copy(m.site);
            c.view.speed = 2.6;
            for (const water of c.free('H2O'))
              if (water !== m) water.v.addScaledVector(water.g.position.clone().sub(m.site).normalize(), 1.8);
          },
        });
      const age = elapsed - releaseAt;
      pulse.visible = made > 0 && age < 2.2;
      if (pulse.visible) {
        pulse.scale.setScalar(0.2 + age * 2.7);
        pulse.material.opacity = 0.95 * (1 - age / 2.2);
      }
      spread(
        c.mols.filter((m) => !m.busy),
        1.8,
        dt,
      );
      for (const m of c.mols) {
        if (m.site && !m.busy) homeTo(m, m.site, 1.3);
        m.labelK = m.rep ? 1 : 0;
        m.labelT = null;
      }
    },
    text(c, st) {
      const e = c.events[0];
      const cap = made
        ? '图中只追踪一对反应离子。' + (st.excess ? '碱稍过量，溶液中仍有少量 OH⁻。' : '') + '反应放热，周围水分子的热运动加快（幅度夸大）。'
        : e?.temp
          ? '同一个氧原子与两个氢原子结合，形成一个水分子。橙色表示放出的能量。'
          : e
            ? '盐酸中的 H⁺ 正向 OH⁻ 靠近。'
            : c.count('OH-')
              ? '碱液带入 OH⁻。看带正电的 H⁺ 和带负电的 OH⁻。'
              : st.mixed
                ? '从混合前看起，量热计里先有盐酸。'
                : '量热计里是盐酸。碱液还未加入。';
      return { eq: 'H<sup>+</sup> + OH<sup>−</sup> ═ H<sub>2</sub>O', on: made > 0, cap };
    },
  };
}

// 贴在温度计旁的正视放大图。液柱和本体使用同一个温度，分度为 0.2 ℃。
export function drawThermometer(canvas, temperature, peak) {
  const c = canvas.getContext('2d');
  const y = (t) => 181 - (t - 24) * 29;
  c.clearRect(0, 0, 82, 206);
  c.fillStyle = '#354b47';
  c.textAlign = 'center';
  c.font = '13px sans-serif';
  c.fillText(peak ? '峰值留影' : '温度计', 41, 17);
  c.font = '11px sans-serif';
  c.fillText('℃', 68, 33);
  c.fillStyle = '#d6ddd5';
  c.fillRect(19, 31, 7, 154);
  c.fillStyle = '#ab432f';
  c.fillRect(20, y(temperature), 5, 187 - y(temperature));
  c.textAlign = 'left';
  c.fillStyle = '#354b47';
  for (let i = 0; i <= 25; i++) {
    const row = y(24 + i / 5);
    c.fillRect(28, row - 0.5, i % 5 ? 6 : 12, 1);
    if (i % 5 === 0) c.fillText(String(24 + i / 5), 44, row + 4);
  }
}
