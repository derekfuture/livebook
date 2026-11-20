// 选必 2 印刷第 49 页。长度统一缩放，键角始终取两条三维方向的夹角。
import * as THREE from 'three';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rad = Math.PI / 180;
const tilt = 105 * rad / 2;
const tripod = angle => {
  const y = -Math.sqrt((1 + 2 * Math.cos(angle * rad)) / 3);
  return [0, 1, 2].map(i => {
    const a = (i * 120 + 79) * rad, r = Math.sqrt(1 - y * y);
    return V(r * Math.cos(a), y, r * Math.sin(a));
  });
};
const tetra = tripod(Math.acos(-1 / 3) / rad);
export const models = [
  { name: '水', formula: 'H₂O', center: 'O', outer: 'H', pm: 96, angle: '105°', shape: 'V形',
    dirs: [-1, 1].map(s => V(s * Math.sin(tilt), -Math.cos(tilt), 0)),
    lone: [-1, 1].map(s => V(0, 1 / Math.sqrt(3), s * Math.sqrt(2 / 3))) },
  { name: '二氧化碳', formula: 'CO₂', center: 'C', outer: 'O', pm: 116, angle: '180°', shape: '直线形',
    dirs: [V(-1), V(1)], lone: [] },
  { name: '氨', formula: 'NH₃', center: 'N', outer: 'H', pm: 101, angle: '107°', shape: '三角锥形',
    dirs: tripod(107), lone: [V(0, 1)] },
  { name: '甲烷', formula: 'CH₄', center: 'C', outer: 'H', pm: 109, angle: '109°28′', shape: '正四面体形',
    dirs: [...tetra, V(0, 1)], lone: [] },
];
export const lengthOf = m => m.pm * 0.00049;
const elements = { C: [0x3d4350, 0.4], O: [0xe0483a, 0.36], H: [0xf2f1ec, 0.24], N: [0x4a78d8, 0.36] };
export const radius = el => elements[el][1] * 0.042;
// 保持最低的球与纸面相切。转动时模型仍然落在书页上。
export function centerOf(m, q = new THREE.Quaternion()) {
  const floor = Math.max(radius(m.center), ...m.dirs.map(dir =>
    radius(m.outer) - dir.clone().applyQuaternion(q).y * lengthOf(m)));
  return V(-0.052, floor + 0.0022, -0.003);
}
export const restDir = V(0.42, 0, 0.91).normalize();
export function home(m, i) {
  const n = m.dirs.length - 1;
  return V(n === 1 ? 0.089 : 0.056 + (i % 2) * 0.061, radius(m.outer) + 0.003, n === 3 && i < 2 ? -0.006 : 0.041);
}
function sphere(el, clay) {
  const g = new THREE.SphereGeometry(radius(el), 48, 32);
  if (clay) {
    const p = g.attributes.position, v = V(), r = radius(el);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).divideScalar(r);
      const ripple = Math.sin(v.x * 8 + v.y * 5) * Math.cos(v.z * 6) * 0.012;
      const ridge = Math.sin(53 * (v.y + 0.23 * v.x * v.x + v.z * 0.13)) * 0.0025;
      v.multiplyScalar(r * (1 + ripple + ridge));
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
  }
  const ball = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: elements[el][0], roughness: clay ? 0.92 : 0.58 }));
  ball.castShadow = ball.receiveShadow = true;
  return ball;
}
function stick(len, micro) {
  const profile = [[0.00012, 0], [0.00135, 0.005], [0.00165, len * 0.48], [0.0014, len - 0.005], [0.00012, len]];
  const geo = micro ? new THREE.CylinderGeometry(0.0018, 0.0018, len, 16).translate(0, len / 2, 0)
    : new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 16);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: micro ? 0x777d88 : 0xc59a5e, roughness: 0.8 }));
  mesh.castShadow = true; return mesh;
}
function branch(m, clay) {
  const ball = sphere(m.outer, clay);
  // 从球心沿 -Y 指回中心；双键在微观模型里展开为两根平行的键线。
  const count = !clay && m.center === 'C' && m.outer === 'O' ? 2 : 1;
  for (let i = 0; i < count; i++) {
    const s = stick(lengthOf(m), !clay);
    s.position.set((i - (count - 1) / 2) * 0.0049, -lengthOf(m), 0);
    ball.add(s);
  }
  return ball;
}
export const along = dir => new THREE.Quaternion().setFromUnitVectors(V(0, 1), dir);
function arc(directions, r) {
  const [a, b] = directions, theta = a.angleTo(b);
  const normal = V().crossVectors(a, b);
  if (normal.lengthSq() < 1e-8) normal.set(0, 0, -1);
  normal.normalize();
  const points = Array.from({ length: 46 }, (_, i) => a.clone().applyAxisAngle(normal, theta * i / 45).multiplyScalar(r));
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0x297f79 }));
}
// 在模型坐标中比较五个球对相机张开的角度，避免把被遮住的氢算作已看清。
export function clearTetraView(m, hub, camera) {
  const eye = hub.worldToLocal(camera.getWorldPosition(V()));
  const points = [V(), ...m.dirs.map(d => d.clone().multiplyScalar(lengthOf(m)))];
  if (Math.abs(eye.y - points[1].y) / eye.distanceTo(points[1]) < 0.25) return false;
  const rays = points.map(p => p.sub(eye));
  const sizes = rays.map((r, i) => Math.asin(radius(i ? m.outer : m.center) / r.length()));
  return rays.every((r, i) => rays.slice(0, i).every((s, j) => r.angleTo(s) > sizes[i] + sizes[j]));
}
export function makeRig(m) {
  const frame = new THREE.Group(), hub = sphere(m.center, true);
  hub.position.copy(centerOf(m)); hub.userData.track = true; frame.add(hub);
  const first = branch(m, true); first.quaternion.copy(along(m.dirs[0]));
  first.position.copy(m.dirs[0]).multiplyScalar(lengthOf(m)); hub.add(first);
  const guides = m.dirs.slice(1).map(dir => {
    const root = new THREE.Group(), end = dir.clone().multiplyScalar(lengthOf(m));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([dir.clone().multiplyScalar(radius(m.center)), end]),
      new THREE.LineDashedMaterial({ color: 0x617b79, dashSize: 0.002, gapSize: 0.002, transparent: true, opacity: 0.75 }));
    line.computeLineDistances();
    const guide = new THREE.Mesh(new THREE.SphereGeometry(radius(m.outer) * 0.8, 18, 12),
      new THREE.MeshBasicMaterial({ color: 0x5e8987, transparent: true, opacity: 0.2, depthWrite: false }));
    guide.position.copy(end); root.add(line, guide); hub.add(root); return root;
  });
  const pieces = guides.map(() => { const b = branch(m, true); b.userData.track = true; frame.add(b); return b; });
  const angle = arc(m.dirs, lengthOf(m) * 0.52); hub.add(angle);
  let face;
  if (m.dirs.length === 4) {
    // 辅助面只连三个氢的位置，不在氢之间画成键线。
    const vertices = m.dirs.slice(0, 3).map(d => d.clone().multiplyScalar(lengthOf(m)));
    face = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints(vertices),
      new THREE.MeshBasicMaterial({ color: 0x458b82, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
    face.visible = false; hub.add(face);
  }
  return { frame, hub, guides, pieces, angle, face };
}

// 书页上的工作垫同时是本轮的课本数据卡。
export function sheet(m) {
  const c = document.createElement('canvas'); c.width = 1440; c.height = 800;
  const g = c.getContext('2d');
  g.fillStyle = '#faf5e8'; g.fillRect(0, 0, 1440, 800);
  g.fillStyle = '#e2e9e2'; g.fillRect(825, 12, 603, 776);
  g.strokeStyle = '#b8beb1'; g.lineWidth = 2; g.strokeRect(12, 12, 1416, 776);
  const px = x => (x / 0.33 + 0.5) * 1440, pz = z => (z / 0.185 + 0.5) * 800;
  g.fillStyle = '#d9d7c9';
  for (let x = 44; x < 820; x += 35) for (let y = 35; y < 605; y += 35) g.fillRect(x, y, 2.5, 2.5);
  g.strokeStyle = '#aab8aa'; g.lineWidth = 2;
  for (let i = 0; i < m.dirs.length - 1; i++) {
    const p = home(m, i); g.beginPath(); g.arc(px(p.x), pz(p.z), radius(m.outer) * 4820, 0, 2 * Math.PI); g.stroke();
  }
  g.fillStyle = '#314a4a'; g.font = 'bold 66px Georgia, serif'; g.fillText(m.formula, 48, 699);
  g.font = '34px sans-serif'; g.fillText(m.pm + ' pm   /   ' + m.angle, 48, 757);
  g.fillStyle = '#43584e'; g.font = '37px sans-serif'; g.fillText('黏土与牙签', 887, 748);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(0.33, 0.185), new THREE.MeshStandardMaterial({ map, roughness: 1 }));
  mat.rotation.x = -Math.PI / 2; mat.position.y = 0.0013; mat.receiveShadow = true;
  return mat;
}

export function microScene() {
  let rig, clouds, angle, elapsed = 0;
  return {
    still: true, holoBase: false, paused: false,
    get elapsed() { return elapsed; }, set elapsed(t) { elapsed = t; },
    init(c, { k }) {
      const m = models[k]; elapsed = 0; this.paused = false;
      c.view.paper = null; c.view.film = 0;
      rig = new THREE.Group(); rig.scale.setScalar(73); c.layer.add(rig);
      rig.add(sphere(m.center, false));
      for (const dir of m.dirs) {
        const b = branch(m, false); b.position.copy(dir).multiplyScalar(lengthOf(m)); b.quaternion.copy(along(dir)); rig.add(b);
      }
      angle = arc(m.dirs, lengthOf(m) * 0.54); rig.add(angle);
      clouds = m.lone.map(dir => {
        const cloud = new THREE.Group(); cloud.quaternion.copy(along(dir));
        const geo = new THREE.SphereGeometry(1, 36, 24);
        const p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const y = p.getY(i), r = 0.011 * (1 + 0.38 * y);
          p.setXYZ(i, p.getX(i) * r, 0.030 + y * 0.020, p.getZ(i) * r);
        }
        geo.computeVertexNormals();
        cloud.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x8874b7, transparent: true, depthWrite: false, roughness: 0.72 })));
        for (const side of [-1, 1]) {
          const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0024, 16, 12), new THREE.MeshBasicMaterial({ color: 0x423659, transparent: true }));
          dot.position.set(side * 0.004, 0.034, 0.003); cloud.add(dot);
        }
        rig.add(cloud); return cloud;
      });
    },
    step(c, { k }, dt) {
      if (!this.paused) elapsed += dt;
      const t = elapsed % 12;
      rig.rotation.set(0.13 + 0.13 * Math.sin(elapsed * 0.45), k === 0 ? -0.69 + 0.19 * Math.sin(elapsed * 0.48) : -0.37 + 0.43 * Math.sin(elapsed * 0.48), 0);
      const alpha = 1 - THREE.MathUtils.smoothstep(t, 5, 6.8) + THREE.MathUtils.smoothstep(t, 10, 11.8);
      for (const cloud of clouds) cloud.children.forEach((o, i) => { o.material.opacity = (i ? 1 : 0.48) * alpha; o.visible = alpha > 0.01; });
      angle.visible = !clouds.length || alpha < 0.5;
    },
    text(c, { k }) {
      const m = models[k], t = elapsed % 12;
      const cap = m.lone.length && (t < 6 || t >= 11)
        ? m.center + ' 上有 ' + m.dirs.length + ' 个成键方向、' + m.lone.length + ' 对孤电子对。每个紫色区域里的两点表示一对。'
        : ['略去孤电子对，只看三个原子的位置，水分子呈 V 形。', 'C 上没有孤电子对。两个碳氧双键各占一个方向，夹角为 180°。',
          '略去孤电子对，三个 H 构成底面，N 在底面上方。', 'C 上没有孤电子对，四个成键方向指向正四面体的四个顶点。'][k];
      return { eq: m.formula + '　' + m.angle, cap, on: true };
    },
  };
}
