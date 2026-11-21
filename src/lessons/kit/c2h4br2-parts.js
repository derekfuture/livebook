// 图 7-11。试管和导管共用同一个液面高度。
import * as THREE from 'three';
import { testTube, tubeRack } from './chem.js';
import { glass2, tubeLiquid, bubble2 } from './chemfx.js';
import { textSprite } from './microworld.js';
import { clamp } from './interact.js';

export const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
export const X = 0.018, R = 0.013, BASE = 0.0085, RIM = 0.106, LEVEL = 0.052;
const GLASS_R = 0.0024;
export const WET = V(X, LEVEL - 0.026);
export const FORMULA = 'CH₂=CH₂ + Br₂ → BrCH₂—CH₂Br';
export const BEND = RIM + GLASS_R - WET.y;
export const HOME = V(X + BEND / 2, RIM + 0.075);
const smooth = (u) => { const t = clamp(u, 0, 1); return t * t * (3 - 2 * t); };

export function apparatus(group) {
  const rack = tubeRack({ h: 0.066, r: R + 0.0017, w: 0.063, d: 0.049 });
  rack.position.x = X;
  // 管架后侧的托架托住横管，管口上方留出绕抓点转动的空间。
  const support = new THREE.MeshStandardMaterial({ color: 0xb9a77f, roughness: 0.65 });
  const seatY = HOME.y - GLASS_R;
  for (const dx of [-0.029, -0.021]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, seatY - 0.008, 12), support);
    post.position.set(dx, (seatY + 0.008) / 2, -0.017);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.002, 0.021), support);
    arm.position.set(dx, seatY - 0.001, -0.007);
    rack.add(post, arm);
  }
  const tube = testTube({ r: R, len: RIM - BASE });
  tube.position.set(X, BASE, 0);
  const solution = tubeLiquid({ R: R - 0.0002, yc: R + 0.0012, top: RIM - BASE, base: 0.47, specks: 0 });
  solution.setLevel(LEVEL - BASE);
  tube.add(solution);
  const liquidColor = new THREE.Color(), orange = new THREE.Color(0xef7115), clear = new THREE.Color(0xf0f1ed);
  const tip = new THREE.Group();
  const pipe = new THREE.Group();
  tip.add(pipe);
  const path = new THREE.CurvePath();
  path.add(new THREE.QuadraticBezierCurve3(V(0, BEND - 0.010), V(0, BEND), V(-0.010, BEND)));
  path.add(new THREE.LineCurve3(V(-0.010, BEND), V(-0.026, BEND)));
  const glass = new THREE.Mesh(new THREE.TubeGeometry(path, 52, GLASS_R, 16, false), glass2({ tint: 0x80949d, base: 0.32, rim: 0.74 }));
  glass.renderOrder = 10;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(GLASS_R, GLASS_R, BEND - 0.010, 20, 1, true), glass.material);
  stem.position.y = (BEND - 0.010) / 2;
  stem.renderOrder = 10;
  pipe.add(stem, glass);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.0021, 0.00038, 8, 24),
    new THREE.MeshStandardMaterial({ color: 0x86999b }));
  lip.rotation.x = Math.PI / 2;
  pipe.add(lip);
  const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, BEND, 12),
    new THREE.MeshBasicMaterial({ visible: false }));
  pick.position.y = BEND / 2;
  pick.userData.pick = true;
  const elbowPick = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.014, 0.014), pick.material);
  elbowPick.position.set(-0.012, BEND / 2 - 0.002, 0);
  elbowPick.userData.pick = true;
  pick.add(elbowPick);
  pipe.add(pick);
  const hose = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: 0x907864, roughness: 0.85 }));
  const last = V(Infinity, 0);
  function pose(p, angle) {
    if (p.equals(last) && angle === pipe.rotation.z) return;
    last.copy(p);
    tip.position.copy(p);
    pipe.rotation.z = angle;
    const end = V(-0.025, BEND).applyQuaternion(pipe.quaternion).add(p);
    const curve = new THREE.CubicBezierCurve3(V(-0.082, 0.0008, -0.017), V(-0.082, 0.044, -0.017),
      end.clone().add(V(-0.06, 0).applyQuaternion(pipe.quaternion)), end);
    hose.geometry.dispose();
    hose.geometry = new THREE.TubeGeometry(curve, 38, 0.0030, 12, false);
  }
  const bubbles = Array.from({ length: 10 }, () => {
    const bead = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), bubble2({ color: 0x797c76, white: 0.6 }));
    bead.renderOrder = 10.5;
    bead.visible = false;
    group.add(bead);
    return bead;
  });
  group.add(rack, tube, hose, tip);
  pose(HOME, Math.PI / 2);
  return { stem, pick, pose, display(progress, gas) {
    // 调色只表示溴的相对剩余量。褪色后仍画出透明的液体和液面。
    solution.setColor(liquidColor.copy(clear).lerp(orange, Math.pow(1 - progress, 0.72)));
    bubbles.forEach((b, i) => {
      const g = gas[i];
      b.visible = !!g;
      if (!g) return;
      const skirt = smooth(g.age / 0.16);
      const offset = (g.x > X ? -1 : 1) * (0.0054 + 0.0011 * Math.sin(g.phase));
      b.position.set(g.x + skirt * offset, g.y, 0.0027 * skirt);
      b.scale.setScalar(0.0012 + 0.00055 * skirt);
    });
  } };
}

// 一次跟踪一对分子。两端 CH₂ 始终各保留原来的两个 H，C—C 键始终可见。
// Br 的运动表示净成键变化，不表示反应机理或真实的粒子轨迹。
export function additionScene() {
  const elements = [[0x3d4350, 0.4], [0xf2f1ec, 0.24], [0x934835, 0.55]];
  const kinds = [0, 0, 1, 1, 1, 1, 2, 2];
  const plane = [V(-0.67, 0), V(0.67, 0)];
  const product = [V(-0.77, 0), V(0.77, 0)];
  const bromines = [];
  for (const side of [-1, 1]) {
    const center = side < 0 ? 0 : 1;
    const angle = side < 0 ? -0.97 : 0.06;
    const tetra = (length, a) => product[center].clone().add(V(side / 3, Math.sqrt(8) / 3 * Math.cos(a),
      Math.sqrt(8) / 3 * Math.sin(a)).multiplyScalar(length));
    for (const sign of [1, -1]) {
      plane.push(plane[center].clone().add(V(side * 0.545, sign * 0.944)));
      const turn = side < 0 ? sign : -sign;
      product.push(tetra(1.09, angle + turn * 2 * Math.PI / 3));
    }
    bromines.push(tetra(1.94, angle));
  }
  product.push(...bromines);
  // 选一个能同时分辨四个氢和两条 C—Br 键的观察方向。
  const vertical = V(0, 1);
  for (const p of product) p.applyAxisAngle(vertical, -0.64);
  let clock = 0, atoms, bonds, labels;
  let productBonds = false;
  const bondColor = new THREE.Color(0x9b9fa3), highlight = new THREE.Color(0xd69951);
  const up = V(0, 1), axis = V(0, 0);
  const links = [[0, 1], [0, 1], [0, 2], [0, 3], [1, 4], [1, 5], [6, 7], [0, 6], [1, 7]];
  return {
    holoBase: false,
    get clock() { return clock; },
    set clock(value) { clock = value; },
    init(c) {
      clock = 0;
      const sphere = new THREE.SphereGeometry(1, 32, 24);
      const rod = new THREE.CylinderGeometry(1, 1, 1, 16);
      atoms = kinds.map((kind) => {
        const [color, radius] = elements[kind];
        const a = new THREE.Mesh(sphere, new THREE.MeshPhysicalMaterial({ color, roughness: 0.29, clearcoat: 0.65 }));
        a.scale.setScalar(radius);
        c.layer.add(a);
        return a;
      });
      bonds = links.map(() => {
        const b = new THREE.Mesh(rod, new THREE.MeshStandardMaterial({ color: bondColor, roughness: 0.43, transparent: true }));
        c.layer.add(b);
        return b;
      });
      labels = ['C₂H₄', 'Br₂', 'C₂H₄Br₂'].map((word) => {
        const label = textSprite(word, '#3b332f', '#fff');
        label.scale.multiplyScalar(0.90);
        c.layer.add(label);
        return label;
      });
    },
    step(c, st, dt) {
      if (st.progress > 0 && !st.paused) clock = Math.min(7.0, clock + dt);
      const approach = smooth((clock - 1.5) / 2.3), make = smooth((clock - 4.1) / 2.9);
      productBonds = make >= 0.5;
      const left = -2.7 * (1 - approach), right = 3.0 * (1 - approach);
      const origin = V(0, 2.5);
      atoms.forEach((a, i) => {
        a.visible = i >= 6 || st.progress > 0;
        if (i < 6) a.position.copy(plane[i]).add(V(left, 0)).lerp(product[i], make);
        else {
          const side = i === 6 ? -1 : 1;
          a.position.set(right + side * 1.10, 1.85 + 0.30 * approach, side * -0.12);
          a.position.lerp(product[i], make);
          if (!st.progress) a.position.x -= right;
        }
        a.position.add(origin);
      });
      links.forEach(([start, end], i) => {
        const b = bonds[i], a = atoms[start].position, z = atoms[end].position;
        // 旧键淡出后整组换成高亮的新键，避免叠出四元环或留下游离的 Br。
        const oldBond = i === 1 || i === 6, newBond = i >= 7;
        b.visible = atoms[start].visible && atoms[end].visible &&
          !(oldBond && productBonds) && !(newBond && !productBonds);
        if (!b.visible) return;
        axis.subVectors(z, a);
        b.material.opacity = oldBond ? 1 - make : 1;
        if (newBond) b.material.color.copy(highlight).lerp(bondColor, 2 * make - 1);
        b.position.copy(a).lerp(z, 0.5);
        if (i < 2) b.position.y += (i ? -1 : 1) * 0.115 * (1 - make);
        b.scale.set(0.074, axis.length(), 0.074);
        b.quaternion.setFromUnitVectors(up, axis.normalize());
      });
      labels[0].position.set(left, 0.64, 0);
      labels[1].position.set(st.progress ? right : 0, 5.38, 0);
      labels[2].position.set(0, 0.45, 0);
      labels[0].visible = st.progress > 0 && clock < 3.8;
      labels[1].visible = clock < 3.8;
      labels[2].visible = clock >= 7.0;
    },
    text(c, st) {
      if (!st.progress) return { eq: 'Br—Br', on: true, cap: '溶液中有溴分子。乙烯还没有通入。' };
      if (clock < 1.5) return { eq: 'CH₂=CH₂　+　Br—Br', on: true, cap: '看两个碳之间的双键，再找到溴分子里的两个溴原子。' };
      if (!productBonds) return { eq: 'CH₂=CH₂　+　Br—Br', on: true, cap: '乙烯分子和溴分子靠近。留意四个氢原子连在哪里。' };
      if (clock < 7.0) return { eq: 'C=C → C—C', on: true, cap: '碳碳双键变为单键，Br—Br 键断开，两个碳各与一个溴成键。' };
      if (st.progress < 1) return { eq: 'BrCH₂—CH₂Br', on: true, cap: '生成了 1,2-二溴乙烷。溶液中还有未反应的溴。' };
      return { eq: 'BrCH₂—CH₂Br', on: true, cap: '生成了 1,2-二溴乙烷。四个氢原子仍连在原来的碳上。' };
    },
  };
}
