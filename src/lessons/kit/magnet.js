// 磁场实验的公共器材：条形磁体、蹄形磁体、小磁针、铁屑、磁感线。都在水平面（局部 xz）里，y 是高度。
// 磁场模型：“磁荷”——每个磁极看成一个点源，B = Σ q·r / |r|³（N 极 q > 0，S 极 q < 0）。条形磁体两端各放一串点源，
// 外部磁场的形状和真实的很接近；通电螺线管外部的磁场和条形磁体一样，也用这个模型（极性由电流方向和绕法决定）。
import * as THREE from 'three';
import { paint, inked, hull, polyline } from '../../live/ink.js';
import { canvasTex } from './props.js';

/** 磁场：poles = [{ x, z, q }]。返回 (x, z) 处的 [Bx, Bz]。 */
export function fieldAt(poles, x, z) {
  let bx = 0, bz = 0;
  for (const p of poles) {
    const dx = x - p.x, dz = z - p.z, r2 = dx * dx + dz * dz + 1e-6, r3 = r2 * Math.sqrt(r2);
    bx += (p.q * dx) / r3; bz += (p.q * dz) / r3;
  }
  return [bx, bz];
}

/** 条形磁体：长 L、宽 w。返回 group（group.poles(local→parent) 给出这块磁体的磁极）。 */
export function barMagnet({ L = 0.1, w = 0.022, h = 0.012 } = {}) {
  const g = new THREE.Group();
  const tex = (txt, col) => canvasTex(128, 64, (c, W, H) => { c.fillStyle = col; c.fillRect(0, 0, W, H); c.fillStyle = '#fff'; c.font = 'bold 44px sans-serif'; c.textAlign = 'center'; c.fillText(txt, W / 2, 48); });
  for (const [s, txt, col] of [[1, 'N', '#d9483b'], [-1, 'S', '#2f6fd0']]) {
    const top = new THREE.MeshBasicMaterial({ map: tex(txt, col) }), side = paint(s > 0 ? 0xd9483b : 0x2f6fd0);
    const m = inked(new THREE.Mesh(new THREE.BoxGeometry(L / 2, h, w), [side, side, top, side, side, side]), { width: 1.2 });
    m.position.set((s * L) / 4, h / 2, 0);
    g.add(m);
  }
  g.footprint = { L, w };
  // 每个磁极：沿宽度方向 3 个点源，略在端面里面
  g.poles = () => {
    g.updateMatrix();
    const out = [];
    for (const [s, q] of [[1, 1], [-1, -1]]) for (const dz of [-w * 0.3, 0, w * 0.3]) {
      const v = new THREE.Vector3((s * L) / 2 - s * L * 0.06, 0, dz).applyMatrix4(g.matrix);
      out.push({ x: v.x, z: v.z, q: q / 3 });
    }
    return out;
  };
  g.inside = (x, z, pad = 0.004) => { const v = new THREE.Vector3(x, 0, z); g.updateMatrix(); v.applyMatrix4(g.matrix.clone().invert()); return Math.abs(v.x) < L / 2 + pad && Math.abs(v.z) < w / 2 + pad; };
  return g;
}

/** 蹄形磁体（U 形）：开口朝 +x。 */
export function horseshoe({ L = 0.08, gap = 0.04, w = 0.016, h = 0.012 } = {}) {
  const g = new THREE.Group();
  const red = paint(0xd9483b), blue = paint(0x2f6fd0);
  for (const [s, mat] of [[1, red], [-1, blue]]) {
    const arm = inked(new THREE.Mesh(new THREE.BoxGeometry(L, h, w), mat), { width: 1.2 });
    arm.position.set(0, h / 2, (s * (gap + w)) / 2);
    g.add(arm);
  }
  const back = inked(new THREE.Mesh(new THREE.BoxGeometry(w, h, gap + 2 * w), paint(0x8f99a8)), { width: 1.2 });
  back.position.set(-L / 2 - w / 2, h / 2, 0);
  g.add(back);
  g.poles = () => {
    g.updateMatrix();
    const out = [];
    for (const [s, q] of [[1, 1], [-1, -1]]) for (const dx of [0, -0.006]) {
      const v = new THREE.Vector3(L / 2 - 0.004 + dx, 0, (s * (gap + w)) / 2).applyMatrix4(g.matrix);
      out.push({ x: v.x, z: v.z, q: q / 2 });
    }
    return out;
  };
  g.inside = (x, z, pad = 0.004) => {
    const v = new THREE.Vector3(x, 0, z); g.updateMatrix(); v.applyMatrix4(g.matrix.clone().invert());
    const inArm = Math.abs(v.x) < L / 2 + pad && Math.abs(Math.abs(v.z) - (gap + w) / 2) < w / 2 + pad;
    const inBack = v.x < -L / 2 + pad && v.x > -L / 2 - w - pad && Math.abs(v.z) < gap / 2 + w + pad;
    return inArm || inBack;
  };
  return g;
}

/** 小磁针：一个透明小圆盒，里面一根红（N）蓝（S）指针。update(B, dt) 让它转向磁场方向（有一点晃动）。 */
export function compass({ r = 0.011 } = {}) {
  const g = new THREE.Group();
  const base = inked(new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.004, 24), paint(0x3b4150)), { width: 1 });
  base.position.y = 0.002;
  const face = new THREE.Mesh(new THREE.CircleGeometry(r * 0.88, 24), new THREE.MeshBasicMaterial({ color: 0xf6f2e6 }));
  face.rotation.x = -Math.PI / 2; face.position.y = 0.0042;
  const needle = new THREE.Group();
  needle.position.y = 0.0055;
  const mk = (col, s) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r * 0.22, r * 0.85, 4), new THREE.MeshBasicMaterial({ color: col })); m.rotation.z = (-s * Math.PI) / 2; m.scale.z = 0.35; m.position.x = (s * r * 0.85) / 2; return m; };
  needle.add(mk(0xd9483b, 1), mk(0x2f6fd0, -1));
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.003, 8), paint(0xc9a347)); pin.position.y = 0.006;
  g.add(base, face, needle, pin);
  let ang = Math.random() * Math.PI * 2, w = 0;
  g.setAngle = (a) => { ang = a; needle.rotation.y = -a; };
  g.update = ([bx, bz], dt, earth = [0, 0]) => {
    const tx = bx + earth[0], tz = bz + earth[1];
    if (tx * tx + tz * tz < 1e-8) return;
    const target = Math.atan2(tz, tx);
    let d = target - ang; d = Math.atan2(Math.sin(d), Math.cos(d));
    const k = Math.min(400, Math.hypot(tx, tz) * 0.02 + 60);
    w += (d * k - w * 9) * dt; ang += w * dt;
    needle.rotation.y = -ang;
  };
  g.needleAngle = () => ang;
  return g;
}

/** 铁屑：在一块矩形区域（玻璃板）上随机撒 n 粒。tap(poles) 后它们逐渐转向磁场方向，磁场强的地方转得快、聚得密。 */
export function filings({ w = 0.3, d = 0.2, n = 3000, y = 0.002 } = {}) {
  const geo = new THREE.BoxGeometry(0.0042, 0.0006, 0.0008);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0x2b2f3a }), n);
  mesh.frustumCulled = false;     // 实例位置会变，包围球不准
  mesh.raycast = () => {};
  const P = Array.from({ length: n }, () => ({ x: (Math.random() - 0.5) * w, z: (Math.random() - 0.5) * d, a: Math.random() * Math.PI, s: 0.7 + Math.random() * 0.6 }));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  let shown = 0, settle = 0;
  const api = {
    mesh,
    get shown() { return shown; },
    sprinkle(k = n) { shown = Math.min(n, k); for (const p of P) p.a = Math.random() * Math.PI; api.draw(); },
    clear() { shown = 0; api.draw(); },
    /** inside(x,z) 为真的地方（磁体身上）不放铁屑 */
    tap(poles, inside) {
      settle = 1;
      for (let i = 0; i < shown; i++) {
        const p = P[i];
        if (inside?.(p.x, p.z)) { p.hide = true; continue; }
        p.hide = false;
        const [bx, bz] = fieldAt(poles, p.x, p.z);
        const B = Math.hypot(bx, bz);
        p.target = Math.atan2(bz, bx);
        p.k = Math.min(1, B * 0.0015 + 0.15);      // 场越强，一次敲击转得越多
      }
    },
    update(dt) {
      if (settle <= 0) return;
      settle = Math.max(0, settle - dt * 1.5);
      for (let i = 0; i < shown; i++) {
        const p = P[i];
        if (p.target == null) continue;
        let d = p.target - p.a; d = Math.atan2(Math.sin(2 * d), Math.cos(2 * d)) / 2;     // 铁屑没有正反，转到最近的方向
        p.a += d * p.k * Math.min(1, dt * 6) + (Math.random() - 0.5) * 0.05 * settle;
      }
      api.draw();
    },
    draw() {
      for (let i = 0; i < n; i++) {
        const p = P[i];
        if (i >= shown || p.hide) { m4.makeScale(0, 0, 0); mesh.setMatrixAt(i, m4); continue; }
        q.setFromAxisAngle(up, -p.a); sc.set(p.s, 1, 1); pos.set(p.x, y, p.z);
        m4.compose(pos, q, sc); mesh.setMatrixAt(i, m4);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
  api.draw();
  return api;
}

/** 磁感线：从每个 N 极附近出发，沿 B 方向积分，直到进入 S 极或出界。返回 THREE.Group（细线 + 箭头）。 */
export function fieldLines(poles, { n = 12, bounds = [-0.16, 0.16, -0.11, 0.11], y = 0.003, color = 0x1f4f8f, inside } = {}) {
  const g = new THREE.Group();
  const N = poles.filter((p) => p.q > 0), S = poles.filter((p) => p.q < 0);
  const cx = N.reduce((s, p) => s + p.x, 0) / N.length, cz = N.reduce((s, p) => s + p.z, 0) / N.length;
  // 起点：围着 N 极一圈、在磁体外面的点（在磁体里面的起点跳过）
  const seeds = [];
  for (let i = 0; i < n * 3; i++) {
    const a = (i / (n * 3)) * Math.PI * 2 + 0.05;
    for (const r of [0.014, 0.02]) { const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; if (!inside?.(x, z, 0.001)) { seeds.push([x, z]); break; } }
  }
  const step = Math.max(1, Math.floor(seeds.length / n));
  for (let i = 0; i < seeds.length; i += step) {
    let [x, z] = seeds[i];
    const pts = [new THREE.Vector3(x, y, z)];
    let out = !inside?.(x, z, 0);
    for (let k = 0; k < 1500; k++) {
      const [bx, bz] = fieldAt(poles, x, z), B = Math.hypot(bx, bz) || 1;
      x += (bx / B) * 0.0015; z += (bz / B) * 0.0015;
      const ins = inside?.(x, z, 0);
      if (!ins) out = true; else if (out) break;        // 从磁体里出来以后，再碰到磁体就停
      if (x < bounds[0] || x > bounds[1] || z < bounds[2] || z > bounds[3]) break;
      if (S.some((p) => Math.hypot(p.x - x, p.z - z) < 0.004)) break;
      if (!ins) pts.push(new THREE.Vector3(x, y, z));
      else if (!out) pts[0].set(x, y, z);
    }
    if (pts.length < 4) continue;
    g.add(polyline(pts, { width: 2, color }));
    // 箭头：线的中间
    const mi = Math.floor(pts.length * 0.45), p0 = pts[mi], p1 = pts[Math.min(pts.length - 1, mi + 3)];
    const ar = new THREE.Mesh(new THREE.ConeGeometry(0.0025, 0.007, 8), new THREE.MeshBasicMaterial({ color }));
    ar.position.copy(p0);
    ar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize());
    g.add(ar);
  }
  return g;
}

export { hull };
