// 球心、棍端、微观辅助线共用同一套几何。长度是教具示意，角度由理想构型生成。
import * as THREE from 'three';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const COLOR = { C: 0x3d4350, H: 0xf2f1ec, Cl: 0x4cbf63 };
export const R = { C: 0.015, H: 0.009, Cl: 0.0225 };
const CH = 0.045, TAU = Math.PI * 2;
const point = (el, p, parent = 0, order = 1) => ({ el, p, parent, order });
function tetra(chlorinated = false) {
  const atoms = [point('C', V()), point('H', V(0, CH, 0))];
  for (let j = 0; j < 3; j++) {
    const a = Math.PI / 2 + j * TAU / 3, el = chlorinated && j < 2 ? 'Cl' : 'H';
    atoms.push(point(el, V(Math.sqrt(8) * Math.cos(a), -1, Math.sqrt(8) * Math.sin(a)).multiplyScalar((el === 'Cl' ? 0.057 : CH) / 3)));
  }
  return atoms;
}
function carbonPair(order) {
  const atoms = [point('C', V()), point('C', V([0, 0.06, 0.055, 0.05][order], 0, 0), 0, order)];
  for (let side = 0; side < 2; side++) {
    for (let j = 0; j < 4 - order; j++) {
      const a = order === 1 ? 0.19 + (2 * j + side) * Math.PI / 3 : 0.2 + j * Math.PI;
      const x = [0, 1 / 3, 0.5, 1][order], radial = Math.sqrt(1 - x * x);
      const dir = V(side ? x : -x, radial * Math.cos(a), radial * Math.sin(a));
      atoms.push(point('H', atoms[side].p.clone().addScaledVector(dir, CH), side));
    }
  }
  return atoms;
}
export const models = [
  { name: '甲烷', formula: 'CH₄', atoms: tetra(), tag: '四面体', obs: '五个原子不共面。碳在正四面体中心，四个氢在四个顶点。' },
  { name: '乙烷', formula: 'C₂H₆', atoms: carbonPair(1), tag: '局部四面体', obs: '碳碳单键两端，每个碳的四根键都朝向四面体顶点。' },
  { name: '乙烯', formula: 'C₂H₄', atoms: carbonPair(2), tag: '共平面', obs: '两个碳和四个氢在同一平面内。' },
  { name: '乙炔', formula: 'C₂H₂', atoms: carbonPair(3), tag: '共线', obs: '两个碳和两个氢在同一直线上。' },
  { name: '二氯甲烷', formula: 'CH₂Cl₂', atoms: tetra(true), tag: '重合', obs: '两种画法的同种原子逐一重合，表示同一种分子。' },
];
// 第二个结构式按上、右、下、左独立填入 H、Cl、H、Cl。
export function comparison() {
  const elements = ['C', 'H', 'Cl', 'H', 'Cl'];
  return tetra().map((a, i) => point(elements[i], a.p.clone().multiplyScalar(elements[i] === 'Cl' ? 0.057 / CH : 1)));
}
export function ball(el, outline = false) {
  const geometry = new THREE.SphereGeometry(R[el], 36, 24);
  const material = outline ? new THREE.MeshBasicMaterial({ color: el === 'H' ? 0x8b93a0 : COLOR[el], transparent: true, opacity: 0.32, depthWrite: false })
    : new THREE.MeshStandardMaterial({ color: COLOR[el], roughness: 0.31, metalness: 0.07 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = !outline;
  mesh.receiveShadow = true;
  return mesh;
}
export function sticks(a, b, order, ghost = false) {
  const group = new THREE.Group();
  const dir = b.clone().sub(a), length = dir.length();
  const material = new THREE.MeshStandardMaterial({ color: ghost ? 0x669d80 : 0xb0a790, roughness: 0.46, transparent: ghost, opacity: ghost ? 0.45 : 1 });
  for (let k = 0; k < order; k++) {
    const r = order === 1 ? 0.0026 : 0.00165;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(r, r, length, 14), material);
    rod.position.copy(a).lerp(b, 0.5);
    rod.position.y += (k - (order - 1) / 2) * 0.0058;
    rod.quaternion.setFromUnitVectors(V(0, 1), dir.clone().normalize());
    rod.castShadow = !ghost;
    group.add(rod);
  }
  return group;
}
export const origin = (k) => V(k > 0 && k < 4 ? -0.067 : -0.039, 0.083, -0.004);
export function home(k, i) {
  if (k === 4) {
    const places = [[0.063, 0.034], [0.065, -0.044], [0.12, -0.044], [0.118, 0.034]];
    const [x, z] = places[i - 1];
    return V(x, R[models[k].atoms[i].el] + 0.002, z);
  }
  if (k > 0 && i === 1) return V(0.095, 0.056, -0.043);
  const j = k ? i - 2 : i - 1, n = models[k].atoms.length - 1, cols = n <= 4 ? 2 : 3;
  return V(0.063 + (j % cols) * 0.037, R[models[k].atoms[i].el] + 0.002,
    (k ? -0.004 : -0.035) + Math.floor(j / cols) * 0.043);
}
function guide(group, positions, edges) {
  const vertices = edges.flatMap(([i, j]) => [positions[i], positions[j]]);
  const lines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(vertices),
    new THREE.LineBasicMaterial({ color: 0x3b8583, transparent: true, opacity: 0.76 }));
  group.add(lines);
  return lines;
}
export function structureScene() {
  let rig, phase = 0, outlines, bonds;
  return {
    still: true, holoBase: false, paused: false,
    get phase() { return phase; }, set phase(t) { phase = t; },
    init(c, { k }) {
      phase = 0; this.paused = false; outlines = []; bonds = [];
      c.view.paper = null; c.view.film = 0;
      const { atoms } = models[k];
      rig = new THREE.Group();
      const object = new THREE.Group();
      const center = k > 0 && k < 4 ? atoms[1].p.clone().multiplyScalar(0.5) : V();
      object.position.copy(center).negate();
      atoms.forEach(({ el, p, parent, order }, i) => {
        const atom = ball(el);
        atom.position.copy(p); object.add(atom);
        if (i) {
          const bond = sticks(atoms[parent].p, p, order);
          object.add(bond); bonds.push(bond.children[0].material);
        }
      });
      const ps = atoms.map(a => a.p);
      if (k === 0 || k === 1) {
        const sets = k === 0 ? [[1, 2, 3, 4]] : [[1, 2, 3, 4], [0, 5, 6, 7]];
        outlines = sets.map(set => guide(object, set.map(i => ps[i]), [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]]));
      } else if (k === 2) {
        guide(object, ps, [[2, 4], [4, 5], [5, 3], [3, 2]]);
        const geom = new THREE.BufferGeometry().setFromPoints([ps[2], ps[3], ps[4], ps[5]]);
        geom.setIndex([0, 1, 2, 1, 3, 2]);
        object.add(new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color: 0x5c9e99, side: THREE.DoubleSide, transparent: true, opacity: 0.14, depthWrite: false })));
      } else if (k === 3) {
        guide(object, [V(-0.068), V(ps[1].x + 0.068)], [[0, 1]]);
      }
      rig.add(object); rig.scale.setScalar(68); rig.position.y = 0.7; c.layer.add(rig);
    },
    step(c, { k }, dt) {
      if (!this.paused) phase += dt;
      if (k === 1) {
        const side = Math.floor(phase / 4) % 2;
        outlines.forEach((line, i) => { line.visible = i === side; });
        bonds.forEach((mat, i) => {
          const selected = i === 0 || models[k].atoms[i + 1].parent === side;
          mat.color.setHex(selected ? 0x36837c : 0xb0a790);
        });
      }
      if (k === 2) {
        // 每轮先停在斜视，再缓缓转到近乎沿平面看的方向，停稳后返回。
        const t = phase % 10;
        const u = THREE.MathUtils.smoothstep(t, 2.8, 4.8) - THREE.MathUtils.smoothstep(t, 7.6, 9.6);
        rig.rotation.set(-0.34 + 1.32 * u, -0.22, 0.04);
      } else if (k === 3) {
        const u = THREE.MathUtils.smoothstep(phase % 8, 2.8, 5) - THREE.MathUtils.smoothstep(phase % 8, 5.6, 8);
        rig.rotation.set(0.12, -0.22 + 0.65 * u, 0.08);
      } else {
        rig.rotation.set(0.22 + 0.65 * Math.sin(phase * 0.43), -0.28, 0.08);
      }
    },
    text(c, { k }) { return { eq: models[k].formula, on: true, cap: models[k].obs }; },
  };
}

// 零件盘前沿的名牌稍微立起，从斜上方也能读出元素符号。
function partsLabel(k) {
  const elements = k === 4 ? ['C', 'H', 'Cl'] : ['C', 'H'];
  const names = { C: '碳球 C', H: '氢球 H', Cl: '氯球 Cl' };
  const c = document.createElement('canvas');
  c.width = 200 * elements.length; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f7f4e8'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#a7b3ab'; ctx.lineWidth = 3; ctx.strokeRect(2, 2, c.width - 4, c.height - 4);
  ctx.font = '600 36px "PingFang SC", sans-serif'; ctx.textBaseline = 'middle';
  elements.forEach((el, i) => {
    const x = i * 200 + 28;
    ctx.fillStyle = '#' + COLOR[el].toString(16).padStart(6, '0');
    ctx.strokeStyle = '#81867c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, 32, 14, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#283239'; ctx.fillText(names[el], x + 26, 34);
  });
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(elements.length * 0.035, 0.0112), new THREE.MeshBasicMaterial({ map: tex }));
}

// 垫纸上的零件位置与真实的球共用坐标，球拿走后留下一个空位。
export function modelSheet(k) {
  const w = 1240, h = 652, canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fbf8ed'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#e5e9df'; ctx.fillRect(765, 12, 463, h - 24);
  ctx.lineWidth = 2; ctx.strokeStyle = '#acb6ad'; ctx.strokeRect(12, 12, w - 24, h - 24);
  ctx.strokeStyle = '#dedfd3'; ctx.lineWidth = 1;
  for (let x = 44; x < 752; x += 36) {
    for (let y = 40; y < h - 85; y += 36) ctx.fillRect(x, y, 3, 3);
  }
  ctx.strokeStyle = '#a7b3ab'; ctx.lineWidth = 3;
  models[k].atoms.slice(1).forEach((a, j) => {
    const p = home(k, j + 1), x = w * (0.5 + (p.x - 0.007) / 0.31), y = h * (0.5 + p.z / 0.163);
    ctx.beginPath(); ctx.arc(x, y, (R[a.el] + 0.0018) * 4000, 0, TAU); ctx.stroke();
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.163), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
  sheet.rotation.x = -Math.PI / 2; sheet.position.set(0.007, 0.00184, 0); sheet.receiveShadow = true;
  const label = partsLabel(k);
  label.position.set(0.095, -0.069, 0.0054);
  label.rotation.x = Math.PI * 0.39;
  sheet.add(label);
  return sheet;
}

// 与三维坐标独立的课本结构式。先按元素字宽截短键线，Cl 的两字符不会挤偏竖键。
export function drawFormula(canvas, k, compact = false) {
  const labeled = k === 4 && !compact;
  const ctx = canvas.getContext('2d'), width = compact && k < 4 ? 144 : 320, height = labeled ? 114 : 92;
  canvas.width = width * 3; canvas.height = height * 3;
  ctx.scale(3, 3);
  ctx.font = '600 15px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const single = [[0, 0], [0, -30], [39, 0], [0, 30], [-39, 0]];
  const pair = [[-22, 0], [22, 0]];
  const layouts = [
    single,
    [...pair, [-22,-30], [-61,0], [-22,30], [22,-30], [61,0], [22,30]],
    [...pair, [-52,-26], [-52,26], [52,-26], [52,26]],
    [...pair, [-62,0], [62,0]], single,
  ];
  function draw(x, atoms) {
    const pts = layouts[k];
    atoms.slice(1).forEach(({ parent, order }, j) => {
      const [ax, ay] = pts[parent], [bx, by] = pts[j + 1];
      const length = Math.hypot(bx - ax, by - ay), dx = (bx - ax) / length, dy = (by - ay) / length;
      const padding = el => Math.abs(dx) * ctx.measureText(el).width * 0.5 + Math.abs(dy) * 6 + 3;
      const a = padding(atoms[parent].el), b = padding(atoms[j + 1].el);
      ctx.strokeStyle = '#53616c'; ctx.lineWidth = 1.35;
      for (let n = 0; n < order; n++) {
        const off = (n - (order - 1) / 2) * 3.4;
        ctx.beginPath(); ctx.moveTo(x + ax + dx * a - dy * off, 46 + ay + dy * a + dx * off);
        ctx.lineTo(x + bx - dx * b - dy * off, 46 + by - dy * b + dx * off); ctx.stroke();
      }
    });
    atoms.forEach(({ el }, i) => {
      ctx.fillStyle = el === 'Cl' ? '#357347' : '#33434e';
      ctx.fillText(el, x + pts[i][0], 47 + pts[i][1]);
    });
  }
  draw(k === 4 ? 85 : width / 2, models[k].atoms);
  if (k === 4) draw(235, comparison());
  if (labeled) {
    ctx.font = '14px "PingFang SC", sans-serif';
    ctx.fillStyle = '#33434e';
    ctx.fillText('第一种', 85, 101); ctx.fillText('第二种', 235, 101);
  }
  canvas.setAttribute('aria-label', k === 4 ? '二氯甲烷的两种结构式：第一种把两个氯画在相邻位置，第二种画在相对位置。' : models[k].name + '的结构式');
}
