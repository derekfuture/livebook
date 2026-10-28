// 直流电路：求解（节点电压法）+ 课本插图风格的 3D 元件 + 导线里流动的电流点 + 电路图符号。
//
// 用法：
//   const c = new Circuit();
//   c.add(battery('E', { cells: 2 }), [-0.1, 0.05]);
//   c.add(lampPart('L'), [0.1, 0.05]);
//   c.add(switchPart('S'), [0, -0.05]);
//   c.wire('E.+', 'S.a').wire('S.b', 'L.a').wire('L.b', 'E.-');
//   group.add(c.group); 每帧 c.update(dt)；改了开关/导线后 c.solve()
import * as THREE from 'three';
import { paint, inked, hull, glassEdge, INK } from '../../live/ink.js';
import { canvasTex, glowTexture } from './props.js';

// ---------------------------------------------------------------- 求解器
function solveLinear(A, b) {
  const n = b.length;
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
    const d = A[i][i];
    if (Math.abs(d) < 1e-18) continue;
    for (let r = i + 1; r < n; r++) {
      const f = A[r][i] / d;
      if (!f) continue;
      for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
      b[r] -= f * b[i];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c];
    x[i] = Math.abs(A[i][i]) < 1e-18 ? 0 : s / A[i][i];
  }
  return x;
}

/**
 * 元件的电学描述：branches() 返回 [{ a, b, R, E? }]，a/b 是端子名，
 * R 电阻（Infinity = 断开），E 电动势（从 a 指向 b 的升压，即 b 为正极）。
 */
/** “元件.接线柱” 拆开：只按第一个点（接线柱名可能是 “0.6”） */
export const splitId = (id) => { const k = id.indexOf('.'); return [id.slice(0, k), id.slice(k + 1)]; };

export class Circuit {
  constructor() {
    this.group = new THREE.Group();
    this.parts = new Map();
    this.wires = [];
    this.wireGroup = new THREE.Group();
    this.group.add(this.wireGroup);
    this.result = null;
    this.dots = null;
    this.flowScale = 0.35;     // 电流点速度：每安培多少米/秒
    this._t = 0;
  }

  add(part, [x, z] = [0, 0], rotY = 0) {
    part.group.position.set(x, 0, z);
    part.group.rotation.y = rotY;
    part.circuit = this;
    this.parts.set(part.name, part);
    this.group.add(part.group);
    return part;
  }

  get(name) { return this.parts.get(name); }

  /** 连一根导线。opts.lift 导线拱起的高度，opts.color。 */
  wire(a, b, opts = {}) {
    this.wires.push({ a, b, ...opts });
    this._dirty = true;
    return this;
  }

  clearWires() { this.wires = []; this._dirty = true; return this; }

  removeWire(a, b) {
    this.wires = this.wires.filter((w) => !((w.a === a && w.b === b) || (w.a === b && w.b === a)));
    this._dirty = true;
    return this;
  }

  terminalWorld(id, out = new THREE.Vector3()) {
    const [pn, tn] = splitId(id);
    const p = this.parts.get(pn);
    if (!p) throw new Error(`没有元件 ${pn}`);
    const t = p.terminals[tn];
    if (!t) throw new Error(`${pn} 没有端子 ${tn}`);
    out.set(...t);
    p.group.updateMatrixWorld(true);
    p.group.localToWorld(out);
    return this.group.worldToLocal(out);
  }

  // ---- 求解 ----
  // 每个端子一个节点；导线、元件内部相连的端子都当作 0.1 mΩ 的支路，这样每根导线里的电流都能直接算出来。
  solve() {
    const ids = new Map();
    const id = (x) => { if (!ids.has(x)) ids.set(x, ids.size); return ids.get(x); };
    for (const p of this.parts.values()) for (const t of Object.keys(p.terminals)) id(`${p.name}.${t}`);
    const wireBranches = this.wires.map((w) => ({ wire: w, R: 1e-4, na: id(w.a), nb: id(w.b) }));
    const shortBranches = [];
    for (const p of this.parts.values()) for (const [a, b] of p.shorted || []) shortBranches.push({ R: 1e-4, na: id(`${p.name}.${a}`), nb: id(`${p.name}.${b}`) });
    const node = (pn, t) => id(`${pn}.${t}`);

    let branches = [];
    for (let iter = 0; iter < 16; iter++) {
      branches = [];
      for (const p of this.parts.values()) for (const br of p.branches()) branches.push({ part: p, ...br, na: node(p.name, br.a), nb: node(p.name, br.b) });
      const all = [...branches, ...wireBranches, ...shortBranches];
      const n = ids.size;
      const ground = branches.find((b) => b.E)?.na ?? 0;
      const G = Array.from({ length: n }, () => new Array(n).fill(0));
      const I = new Array(n).fill(0);
      for (const b of all) {
        if (!Number.isFinite(b.R) || b.na === b.nb) continue;
        const g = 1 / Math.max(b.R, 1e-6);
        G[b.na][b.na] += g; G[b.nb][b.nb] += g; G[b.na][b.nb] -= g; G[b.nb][b.na] -= g;
        if (b.E) { I[b.nb] += b.E * g; I[b.na] -= b.E * g; }
      }
      for (let i = 0; i < n; i++) G[i][i] += 1e-9;   // 悬空的节点
      for (let c = 0; c < n; c++) G[ground][c] = 0;
      G[ground][ground] = 1; I[ground] = 0;
      const V = solveLinear(G, I);
      for (const b of all) {
        b.Va = V[b.na]; b.Vb = V[b.nb];
        b.I = Number.isFinite(b.R) && b.na !== b.nb ? (b.Va - b.Vb + (b.E || 0)) / Math.max(b.R, 1e-6) : 0;   // a → b 方向
        b.U = b.Va - b.Vb;
      }
      this.V = V; this.node = node;
      let change = 0;
      for (const p of this.parts.values()) change = Math.max(change, p.relax?.(branches.filter((b) => b.part === p)) || 0);
      if (change < 1e-4) break;
    }
    this.branches = branches;
    this.wireCurrents = wireBranches.map((b) => b.I);
    const wasBroken = [...this.parts.values()].filter((p) => p.broken);
    for (const p of this.parts.values()) p.read?.(branches.filter((b) => b.part === p), this);
    // 这一次求解里有元件烧坏了（灯丝断了）：它变成断路，马上按断路重新求解（灯立刻熄灭）
    if (!this._resolving && [...this.parts.values()].some((p) => p.broken && !wasBroken.includes(p))) { this._resolving = true; this.solve(); this._resolving = false; this.justBroke = true; }
    return this;
  }

  /** 两个端子之间的电压 U(a) − U(b)。 */
  voltage(a, b) {
    const [pa, ta] = splitId(a), [pb, tb] = splitId(b);
    return this.V[this.node(pa, ta)] - this.V[this.node(pb, tb)];
  }

  current(partName) {
    return this.branches.filter((b) => b.part.name === partName && b.main !== false).reduce((s, b) => s + b.I, 0);
  }

  // ---- 3D 导线 + 电流点 ----
  _buildWires() {
    this._dirty = false;
    for (const c of [...this.wireGroup.children]) { c.geometry?.dispose(); this.wireGroup.remove(c); }
    this._wireTubes = [];
    this.curves = [];
    const copper = paint(0xe08a3c);
    for (const w of this.wires) {
      const a = this.terminalWorld(w.a), b = this.terminalWorld(w.b);
      // 接电表的导线贴着桌面走，不从表盘前面拱过去挡住刻度
      const meter = [w.a, w.b].some((t) => ['ammeter', 'voltmeter'].includes(this.parts.get(splitId(t)[0])?.kind));
      const lift = w.lift ?? (meter ? 0.004 : Math.min(0.028, 0.008 + a.distanceTo(b) * 0.1));
      const mid = a.clone().lerp(b, 0.5);
      mid.y = Math.max(a.y, b.y) + lift;
      if (w.via) mid.add(new THREE.Vector3(...w.via));
      const curve = new THREE.CatmullRomCurve3([a, a.clone().add(new THREE.Vector3(0, lift * 0.6, 0)), mid, b.clone().add(new THREE.Vector3(0, lift * 0.6, 0)), b], false, 'centripetal');
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.0018, 6, false), w.color ? paint(w.color) : copper);
      tube.castShadow = true;
      tube.raycast = () => {};
      const pick = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.006, 6, false), new THREE.MeshBasicMaterial({ visible: false }));
      pick.userData.wire = w;
      tube.userData.wire = w;
      this.wireGroup.add(tube, pick);
      this.curves.push({ curve, w, len: curve.getLength() });
      this._wireTubes.push(tube);
    }
    // 电流点
    const MAX = 600;
    if (!this.dots) {
      this.dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0013, 6, 4), new THREE.MeshBasicMaterial({ color: 0xfff2a8 }), MAX);
      this.dots.frustumCulled = false;     // 实例位置会变，包围球不准
      this.dots.raycast = () => {};
      this.group.add(this.dots);
    }
    this.dots.count = 0;
  }

  update(dt) {
    if (this._dirty) this._buildWires();
    this._t += dt;
    for (const p of this.parts.values()) p.update?.(dt, this._t);
    if (!this.curves?.length || !this.branches) return;
    const I = this.wireCurrents || [];
    const m = new THREE.Matrix4();
    let k = 0;
    const spacing = 0.026;
    this.curves.forEach((c, i) => {
      const cur = I[this.wires.indexOf(c.w)] || 0;
      if (Math.abs(cur) < 1e-4) return;
      const n = Math.floor(c.len / spacing);
      const speed = Math.min(0.5, Math.abs(cur) * this.flowScale + 0.01);
      const off = ((this._t * speed) / spacing) % 1;
      for (let j = 0; j < n && k < 600; j++) {
        let u = (j + off) / n;
        if (cur < 0) u = 1 - u;
        const p = c.curve.getPointAt(Math.min(1, Math.max(0, u)));
        m.makeTranslation(p.x, p.y + 0.0005, p.z);
        this.dots.setMatrixAt(k++, m);
      }
    });
    this.dots.count = k;
    this.dots.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    for (const c of this.wireGroup.children) c.geometry?.dispose();
  }
}

// ---------------------------------------------------------------- 元件
const post = (color = 0xc0392b) => {
  const g = new THREE.Group();
  const p = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.01, 12), paint(color)), 0.0012);
  p.position.y = 0.005;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.003, 12), paint(color));
  cap.position.y = 0.011;
  g.add(p, cap);
  return g;
};

function base(w, d, color = 0xf0f2f5, h = 0.008) {
  const m = inked(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint(color)), { width: 1.3 });
  m.position.y = h / 2;
  return m;
}

/** 电池组。cells 节数，每节 1.5 V；r 内阻（每节）。端子 '+'、'-'。 */
export function battery(name, { cells = 2, emf = 1.5, r = 0.15 } = {}) {
  const g = new THREE.Group();
  const L = 0.05, W = cells * L + 0.016;
  g.add(base(W, 0.03, 0x4d5668, 0.006));
  for (let i = 0; i < cells; i++) {
    const cell = new THREE.Group();
    const body = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, L - 0.006, 20), paint(0xf2c94c)), 0.0016);
    body.rotation.z = Math.PI / 2;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0092, 0.0092, 0.006, 20), paint(0xd9483b));
    cap.rotation.z = Math.PI / 2;
    cap.position.x = (L - 0.006) / 2 - 0.003;
    const nub = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.004, 10), paint(0xb0b7c3));
    nub.rotation.z = Math.PI / 2;
    nub.position.x = L / 2 - 0.002;
    const plus = new THREE.Mesh(new THREE.PlaneGeometry(0.008, 0.008), new THREE.MeshBasicMaterial({ map: plusTex(), transparent: true }));
    plus.rotation.x = -Math.PI / 2;
    plus.position.set((L - 0.006) / 2 - 0.012, 0.0093, 0);
    cell.add(body, cap, nub, plus);
    cell.position.set(-W / 2 + 0.008 + L / 2 + i * L, 0.016, 0);
    g.add(cell);
  }
  const pp = post(0xc0392b), pn = post(0x23293a);
  pp.position.set(W / 2 - 0.006, 0.006, 0.012);
  pn.position.set(-W / 2 + 0.006, 0.006, 0.012);
  g.add(pp, pn);
  const part = {
    name, group: g, kind: 'battery', cells, emf, r,
    terminals: { '+': [W / 2 - 0.006, 0.018, 0.012], '-': [-W / 2 + 0.006, 0.018, 0.012] },
    get E() { return this.cells * this.emf; },
    branches() { return [{ a: '-', b: '+', R: this.cells * this.r, E: this.cells * this.emf }]; },
    read(bs) {
      this.I = bs[0].I; this.U = -bs[0].U;
      this.shorted = false;
      this.short = Math.abs(this.I) > 2.5;
    },
    update(dt, t) {
      // 短路时电池发热变红
      for (const c of g.children) if (c.children?.[0]?.material) {
        const m = c.children[0].material;
        if (m.emissive) m.emissive.setRGB(this.short ? 0.4 + 0.2 * Math.sin(t * 10) : 0, 0, 0);
      }
    },
    width: W,
  };
  return part;
}

let _plus;
function plusTex() {
  return (_plus ||= canvasTex(32, 32, (g) => { g.fillStyle = '#c0392b'; g.fillRect(13, 4, 6, 24); g.fillRect(4, 13, 24, 6); }));
}

/** 学生电源（输出电压固定，面板上显示电压）。端子 '+'、'-'。 */
export function psuPart(name, { U = 6, r = 0.01 } = {}) {
  const g = new THREE.Group();
  const box = inked(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.05), paint(0x8fb3c9)), { width: 1.3 });
  box.position.set(0, 0.02, -0.004);
  const face = canvasTex(256, 128, (c, W, H) => {
    c.fillStyle = '#7ea3ba'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#16233a'; c.fillRect(20, 16, 150, 62);
    c.fillStyle = '#ff6a3d'; c.font = 'bold 50px Menlo, monospace'; c.textAlign = 'right'; c.fillText(`${U}`, 140, 66);
    c.fillStyle = '#ffd2c2'; c.font = 'bold 26px sans-serif'; c.fillText('V', 165, 66);
    c.fillStyle = '#1d2433'; c.font = '20px sans-serif'; c.textAlign = 'left'; c.fillText('学生电源', 24, 112);
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.078, 0.039), new THREE.MeshBasicMaterial({ map: face }));
  panel.position.set(0, 0.02, 0.0211);
  const pp = post(0xc0392b), pn = post(0x23293a);
  pp.position.set(0.026, 0.04, 0.012); pn.position.set(0.01, 0.04, 0.012);
  g.add(box, panel, pp, pn);
  return {
    name, group: g, kind: 'battery', cells: 1, emf: U, r,
    terminals: { '+': [0.026, 0.052, 0.012], '-': [0.01, 0.052, 0.012] },
    get E() { return U; },
    branches() { return [{ a: '-', b: '+', R: r, E: U }]; },
    read(bs) { this.I = bs[0].I; this.U = -bs[0].U; this.short = Math.abs(this.I) > 6; },
  };
}

/** 单刀开关。端子 a、b。点它切换。 */
export function switchPart(name, { closed = false } = {}) {
  const g = new THREE.Group();
  g.add(base(0.06, 0.024));
  const pa = post(0x8f99a8), pb = post(0x8f99a8);
  pa.position.set(-0.022, 0.008, 0); pb.position.set(0.022, 0.008, 0);
  const clip = inked(new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.012, 0.01), paint(0xb0b7c3)));
  clip.position.set(0.016, 0.014, 0);
  const hinge = new THREE.Group();
  hinge.position.set(-0.016, 0.016, 0);
  const blade = inked(new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.002, 0.006), paint(0xc8cdd4)));
  blade.position.x = 0.018;
  const knob = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.005, 0.016, 12), paint(0x2b2f3a)), 0.0012);
  knob.position.set(0.034, 0.007, 0);
  hinge.add(blade, knob);
  g.add(pa, pb, clip, hinge);
  let ang = closed ? 0 : -0.75;
  return {
    name, group: g, kind: 'switch', closed, clickable: true,
    terminals: { a: [-0.022, 0.02, 0], b: [0.022, 0.02, 0] },
    branches() { return [{ a: 'a', b: 'b', R: this.closed ? 1e-4 : Infinity }]; },
    toggle() { this.closed = !this.closed; this.circuit?.solve(); return this.closed; },
    update(dt) {
      const target = this.closed ? 0 : -0.75;
      ang += (target - ang) * Math.min(1, dt * 14);
      hinge.rotation.z = -ang;
    },
  };
}

/**
 * 小灯泡。R0 冷态电阻，Rhot 正常发光时电阻，rated 额定电压。端子 a、b。
 * brightness = P / P额定。点它可以拧下来（screwed=false 时断路）。
 */
export function lampPart(name, { R0 = 4, Rhot = 10, rated = 2.5, fixedR = false, color = 0xffd27a } = {}) {
  const g = new THREE.Group();
  g.add(base(0.05, 0.034));
  const pa = post(0x8f99a8), pb = post(0x8f99a8);
  pa.position.set(-0.02, 0.008, 0.01); pb.position.set(0.02, 0.008, 0.01);
  const socket = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.009, 0.012, 16), paint(0xb0b7c3)), 0.0015);
  socket.position.set(0, 0.014, -0.004);
  const bulbG = new THREE.Group();
  bulbG.position.set(0, 0.02, -0.004);
  const glassMat = new THREE.MeshToonMaterial({ color: 0xf4f7fb, gradientMap: paint(0xffffff).gradientMap, transparent: true, opacity: 0.45, emissive: new THREE.Color(0xfff1c2), emissiveIntensity: 0, depthWrite: false });
  // 发光的灯丝芯：一个小亮球，亮度跟着功率
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff6d8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  core.position.y = 0.012;
  const glass = glassEdge(new THREE.Mesh(new THREE.SphereGeometry(0.011, 20, 14), glassMat));     // 不用 hull：黑色外壳会透过玻璃，让灯泡看起来是灰的
  glass.position.y = 0.012;
  const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.008, 14), paint(0xc9a347));
  thread.position.y = 0.002;
  const fil = new THREE.Mesh(new THREE.TorusGeometry(0.003, 0.0006, 4, 10, Math.PI), new THREE.MeshBasicMaterial({ color: 0x5a4a3a }));
  fil.position.y = 0.012;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(0.09, 0.09, 1);
  halo.renderOrder = 20;
  // 灯光照在底座和桌面上的一圈暖光
  const pool = new THREE.Mesh(new THREE.CircleGeometry(0.05, 32), new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0xffd98a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.0085;
  halo.position.y = 0.012;
  const light = new THREE.PointLight(color, 0, 0.5, 2);
  light.position.y = 0.014;
  bulbG.add(glass, core, thread, fil, halo, light);
  g.add(pa, pb, socket, bulbG, pool);
  const Prated = (rated * rated) / Rhot;
  let lift = 0;
  return {
    name, group: g, kind: 'lamp', clickable: true, R0, Rhot, rated, Prated, screwed: true, broken: false, R: fixedR ? Rhot : R0,
    terminals: { a: [-0.02, 0.02, 0.01], b: [0.02, 0.02, 0.01] },
    branches() { return [{ a: 'a', b: 'b', R: this.screwed && !this.broken ? this.R : Infinity }]; },
    relax(bs) {
      if (fixedR) return 0;
      const P = Math.abs(bs[0].I * bs[0].U);
      const k = Math.min(1.25, Math.sqrt(P / Prated));
      const target = this.R0 + (this.Rhot - this.R0) * k;
      const old = this.R;
      this.R = old + (target - old) * 0.6;
      return Math.abs(this.R - old);
    },
    read(bs) {
      this.I = bs[0].I; this.U = bs[0].U; this.P = Math.abs(this.I * this.U);
      this.brightness = this.screwed ? this.P / Prated : 0;
      if (this.P > Prated * 2.6) this.broken = true;      // 电压太高烧坏
    },
    unscrew() { this.screwed = !this.screwed; this.circuit?.solve(); return this.screwed; },
    update(dt, t) {
      const b = Math.min(1.6, this.brightness || 0);
      // 亮度感：灯泡本身发白发黄 + 灯丝亮点 + 外面一圈光晕 + 照在底座上的暖光。很暗时（b < 0.1）只有灯丝微红。
      const v = Math.sqrt(Math.min(1.6, b));
      glassMat.emissiveIntensity = Math.min(1.6, v * 1.4);
      glassMat.opacity = 0.45 + Math.min(0.4, v * 0.35);
      core.material.opacity = Math.min(1, v * 1.2);
      core.material.color.setRGB(1, 0.55 + 0.45 * Math.min(1, v), 0.25 + 0.6 * Math.min(1, v * v));
      halo.material.opacity = Math.min(0.6, v * 0.5);
      halo.scale.setScalar(0.025 + Math.min(1.3, v) * 0.032);
      pool.material.opacity = Math.min(0.4, v * 0.32);
      pool.scale.setScalar(0.45 + Math.min(1.3, v) * 0.35);
      light.intensity = b * 0.02;
      fil.material.color.setRGB(0.35 + b * 0.65, 0.3 + b * 0.6, 0.25 + b * 0.3);
      lift += ((this.screwed ? 0 : 0.03) - lift) * Math.min(1, dt * 8);
      bulbG.position.y = 0.02 + lift;
      bulbG.rotation.y = lift * 40;
      glass.material.color.setHex(this.broken ? 0x8a8f99 : 0xf4f7fb);
    },
  };
}

/** 定值电阻（带色环）。端子 a、b。 */
export function resistorPart(name, { R = 10, label } = {}) {
  const g = new THREE.Group();
  g.add(base(0.06, 0.026));
  const pa = post(0x8f99a8), pb = post(0x8f99a8);
  pa.position.set(-0.024, 0.008, 0.006); pb.position.set(0.024, 0.008, 0.006);
  const body = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.026, 16), paint(0xd9c29a)), 0.0012);
  body.rotation.z = Math.PI / 2;
  body.position.set(0, 0.016, -0.004);
  const colors = [0x7a4b2a, 0x111111, 0xd23b2b, 0xc9a347];
  colors.forEach((c, i) => {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0058, 0.0058, 0.0022, 16), paint(c));
    band.rotation.z = Math.PI / 2;
    band.position.set(-0.008 + i * 0.005, 0.016, -0.004);
    g.add(band);
  });
  g.add(pa, pb, body);
  return {
    name, group: g, kind: 'resistor', R, label,
    terminals: { a: [-0.024, 0.02, 0.006], b: [0.024, 0.02, 0.006] },
    branches() { return [{ a: 'a', b: 'b', R: this.R }]; },
    read(bs) { this.I = bs[0].I; this.U = bs[0].U; this.P = Math.abs(this.I * this.U); },
  };
}

/** 一段电阻丝（研究电阻与长度、横截面积、材料）。端子 a、b，length 米。 */
export function wirePart(name, { length = 0.16, R = 5, color = 0x9aa3b2, thick = 0.0012 } = {}) {
  const g = new THREE.Group();
  const pa = post(0x8f99a8), pb = post(0x8f99a8);
  pa.position.set(-length / 2, 0, 0); pb.position.set(length / 2, 0, 0);
  const w = new THREE.Mesh(new THREE.CylinderGeometry(thick, thick, length, 8), paint(color));
  w.rotation.z = Math.PI / 2;
  w.position.y = 0.012;
  g.add(pa, pb, w);
  return {
    name, group: g, kind: 'wire', R, wireMesh: w,
    terminals: { a: [-length / 2, 0.014, 0], b: [length / 2, 0.014, 0] },
    branches() { return [{ a: 'a', b: 'b', R: this.R }]; },
    read(bs) { this.I = bs[0].I; this.U = bs[0].U; },
  };
}

/**
 * 滑动变阻器。端子 A、B（线圈两端）、C、D（金属杆两端）。pos 0..1：滑片离 A 端的位置。
 * A–P 电阻 = pos·Rmax，P–B = (1−pos)·Rmax，C、D 和滑片 P 相连。
 */
export function rheostatPart(name, { Rmax = 20, pos = 0.5 } = {}) {
  const g = new THREE.Group();
  const L = 0.12;
  g.add(base(L + 0.04, 0.03, 0xe9edf2, 0.006));
  const coil = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, L, 24), new THREE.MeshToonMaterial({ map: coilTex(), gradientMap: paint(0xffffff).gradientMap })), 0.0014);
  coil.rotation.z = Math.PI / 2;
  coil.position.set(0, 0.02, 0);
  const rod = hull(new THREE.Mesh(new THREE.BoxGeometry(L + 0.01, 0.004, 0.006), paint(0xb0b7c3)), 0.001);
  rod.position.set(0, 0.038, 0);
  const slider = new THREE.Group();
  const sb = inked(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.01, 0.012), paint(0x3b4150)));
  sb.position.y = 0.038;
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.012, 0.004), paint(0xb0b7c3));
  tip.position.y = 0.03;
  slider.add(sb, tip);
  for (const sx of [-1, 1]) {
    const leg = inked(new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.036, 0.02), paint(0xe9edf2)));
    leg.position.set(sx * (L / 2 + 0.006), 0.02, 0);
    g.add(leg);
  }
  const posts = {};
  const P = { A: [-L / 2 - 0.006, 0.006, 0.014], B: [L / 2 + 0.006, 0.006, 0.014], C: [-L / 2 - 0.006, 0.04, 0], D: [L / 2 + 0.006, 0.04, 0] };
  for (const [k, v] of Object.entries(P)) { const p = post(0x8f99a8); p.position.set(...v); p.scale.setScalar(0.8); g.add(p); posts[k] = p; }
  g.add(coil, rod, slider);
  const part = {
    name, group: g, kind: 'rheostat', Rmax, pos, L, slider, clickable: true,
    terminals: { A: [P.A[0], 0.016, P.A[2]], B: [P.B[0], 0.016, P.B[2]], C: [P.C[0], 0.05, 0], D: [P.D[0], 0.05, 0], P: [0, 0.05, 0] },
    shorted: [['C', 'P'], ['D', 'P']],
    branches() { return [{ a: 'A', b: 'P', R: Math.max(1e-3, this.pos * this.Rmax), main: false }, { a: 'P', b: 'B', R: Math.max(1e-3, (1 - this.pos) * this.Rmax), main: false }]; },
    read(bs) { this.Iap = bs[0].I; this.Ipb = bs[1].I; },
    setPos(p) { this.pos = Math.min(1, Math.max(0, p)); slider.position.x = -L / 2 + this.pos * L; this.circuit?.solve(); },
    /** 鼠标拖到某个局部 x（米）时 */
    posFromLocalX(x) { return (x + L / 2) / L; },
  };
  slider.position.x = -L / 2 + pos * L;
  return part;
}

let _coil;
function coilTex() {
  return (_coil ||= canvasTex(512, 64, (g, W, H) => {
    g.fillStyle = '#8a5a34'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,220,170,.55)'; g.lineWidth = 2;
    for (let x = 0; x < W; x += 5) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 3, H); g.stroke(); }
  }));
}

/**
 * 电表（电流表 A / 电压表 V）。端子 '-'、以及两个量程端子（电流表 '0.6'、'3'；电压表 '3'、'15'）。
 * reading：表头指针读数（按接的量程端子换算），over：超量程，reverse：接反。
 */
export function meterPart(name, { type = 'A', ranges } = {}) {
  ranges = ranges || (type === 'A' ? [0.6, 3] : [3, 15]);
  const g = new THREE.Group();
  const FW = 0.07, FH = 0.068, D = 0.034;   // 表盘整体抬高：前面的接线柱不会挡住表盘下部的转轴
  // 机身：后面一个浅灰的方盒，前面竖着一块白色表盘，底下一条绿色的接线板
  const box = inked(new THREE.Mesh(new THREE.BoxGeometry(FW, FH, D), paint(0xe9ecef)), { width: 1.3 });
  box.position.set(0, 0.016 + FH / 2, -0.004);
  const base = inked(new THREE.Mesh(new THREE.BoxGeometry(FW + 0.004, 0.016, D + 0.012), paint(0x9aa3b2)), { width: 1.2 });
  base.position.set(0, 0.008, 0.002);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(FW - 0.006, 0.0025, 0.012), paint(0x2e8b57, { keep: true }));
  strip.position.set(0, 0.0165, 0.012);
  const plate = canvasTex(512, 96, (c, W, H) => { c.fillStyle = '#2e8b57'; c.fillRect(0, 0, W, H); c.fillStyle = '#fff'; c.font = 'bold 54px sans-serif'; c.textAlign = 'center'; ['−', String(ranges[0]), String(ranges[1])].forEach((t, i) => c.fillText(t, W * (0.18 + i * 0.32), H * 0.72)); });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(FW - 0.006, 0.0075), new THREE.MeshBasicMaterial({ map: plate }));
  label.position.set(0, 0.0085, 0.0201);
  const dialTex = canvasTex(1024, 840, (c, W, H) => drawDial(c, W, H, type, ranges));
  const dial = new THREE.Mesh(new THREE.PlaneGeometry(FW - 0.008, (FW - 0.008) * 420 / 512), new THREE.MeshBasicMaterial({ map: dialTex }));
  const DH = (FW - 0.008) * 420 / 512;
  const face = new THREE.Group();
  face.position.set(0, 0.016 + FH / 2 + 0.005, D / 2 - 0.004 + 0.0005);
  face.add(dial);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.0007, 1, 0.0004), new THREE.MeshBasicMaterial({ color: 0x1d2433 }));
  needle.geometry.translate(0, 0.5, 0);
  const pivot = new THREE.Group();
  // 指针转轴和表盘上刻度圆弧的圆心严格重合（drawDial 里圆心在 (W/2, 0.9H)）
  pivot.position.set(0, DH * (0.5 - 0.9), 0.0006);
  needle.scale.y = DH * 0.74;
  pivot.add(needle);
  const hub = new THREE.Mesh(new THREE.CircleGeometry(0.004, 20), new THREE.MeshBasicMaterial({ color: 0x3b4150 }));
  hub.position.set(0, DH * (0.5 - 0.9), 0.0008);
  face.add(pivot, hub);
  g.add(box, base, strip, label, face);
  const tnames = ['-', String(ranges[0]), String(ranges[1])];
  const tx = [-0.022, 0.0, 0.022];
  const terms = {};
  tnames.forEach((t, i) => {
    const p = post(i === 0 ? 0x23293a : 0xc0392b);
    p.position.set(tx[i], 0.0165, 0.012);
    p.scale.setScalar(0.8);
    g.add(p);
    terms[t] = [tx[i], 0.028, 0.012];
  });
  g.face = face;
  let ang = 0;
  const rInt = type === 'A' ? 0.02 : 2e5;   // 电压表内阻取得较大但有限，方便说明“并联”
  return {
    name, group: g, kind: type === 'A' ? 'ammeter' : 'voltmeter', type, ranges,
    terminals: terms,
    branches() {
      return [
        { a: String(ranges[0]), b: '-', R: type === 'A' ? rInt : rInt * 0.2 },
        { a: String(ranges[1]), b: '-', R: type === 'A' ? rInt * 0.2 : rInt },
      ];
    },
    read(bs) {
      // 读数：通过哪个量程端子的电流（电流表）/ 量程端子与 '-' 之间的电压（电压表）
      const [b0, b1] = bs;
      if (type === 'A') {
        const i0 = b0.I, i1 = b1.I;
        this.used = Math.abs(i0) > Math.abs(i1) ? 0 : 1;
        this.value = i0 + i1;
      } else {
        const u0 = b0.U, u1 = b1.U;
        const c0 = Math.abs(b0.I), c1 = Math.abs(b1.I);
        this.used = c0 > c1 ? 0 : 1;
        this.value = this.used === 0 ? u0 : u1;
        if (c0 < 1e-12 && c1 < 1e-12) this.value = 0;
      }
      const range = ranges[this.used];
      this.range = range;
      this.reverse = this.value < -1e-6;
      this.over = Math.abs(this.value) > range * 1.02;
      this.reading = Math.max(-0.08 * range, Math.min(range * 1.12, this.value));
    },
    update(dt) {
      const r = this.range || ranges[0];
      const target = ((this.reading || 0) / r) * 1.2 - 0.6;      // 与 drawDial 的 a0..a1（±0.6 rad）一一对应
      ang += (target - ang) * Math.min(1, dt * 7);
      pivot.rotation.z = -ang;
    },
  };
}

function drawDial(c, W, H, type, ranges) {
  const k = W / 512;   // 线宽、字号按画布大小缩放
  c.fillStyle = '#fbfbf7'; c.fillRect(0, 0, W, H);
  c.strokeStyle = '#1d2433'; c.fillStyle = '#1d2433';
  const cx = W / 2, cy = H * 0.9;   // 圆心 = 指针转轴；刻度弧半径 RR = 指针长度（都按表盘高度的比例）
  const a0 = -Math.PI / 2 - 0.6, a1 = -Math.PI / 2 + 0.6;
  const RR = H * 0.74;
  c.lineWidth = 3 * k;
  c.beginPath(); c.arc(cx, cy, RR, a0, a1); c.stroke();
  const n = 30;
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n, major = i % 10 === 0, mid = i % 5 === 0;
    const r0 = RR - (major ? 24 : mid ? 18 : 12) * k;
    c.lineWidth = (major ? 4.5 : mid ? 3 : 2.4) * k;
    c.beginPath(); c.moveTo(cx + Math.cos(a) * RR, cy + Math.sin(a) * RR); c.lineTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.stroke();
    if (major) {
      const fmt = (v) => String(+v.toFixed(2));
      c.font = `bold ${28 * k}px sans-serif`; c.textAlign = 'center';
      c.fillText(fmt((ranges[1] * i) / n), cx + Math.cos(a) * (RR + 22 * k), cy + Math.sin(a) * (RR + 22 * k) + 8 * k);
      c.font = `${24 * k}px sans-serif`;
      c.fillText(fmt((ranges[0] * i) / n), cx + Math.cos(a) * (RR - 44 * k), cy + Math.sin(a) * (RR - 44 * k) + 8 * k);
    }
  }
  c.font = `bold ${54 * k}px serif`; c.textAlign = 'center';
  c.fillText(type, cx - RR * 0.38, cy - RR * 0.3);   // 字母放在指针扫过区域的旁边
}

// ---------------------------------------------------------------- 电路图符号（2D canvas）
/**
 * 在 canvas 上画电路图。parts: [{ type, x, y, rot, label, state }]，wires: [[x,y],[x,y],...] 折线。
 * type: battery | switch | lamp | resistor | rheostat | ammeter | voltmeter | node
 */
export function drawSchematic(g, { parts = [], wires = [], highlight } = {}) {
  g.save();
  g.lineWidth = 3; g.strokeStyle = '#1d2433'; g.fillStyle = '#1d2433';
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const w of wires) {
    g.strokeStyle = highlight?.includes(w) ? '#ff6a3d' : '#1d2433';
    g.beginPath(); w.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
  }
  g.strokeStyle = '#1d2433';
  for (const p of parts) {
    g.save();
    g.translate(p.x, p.y);
    g.rotate(((p.rot || 0) * Math.PI) / 180);
    // 符号占 [-30, 30] 的水平段，先擦掉底下的导线
    g.fillStyle = '#fbf8f1';
    if (p.type !== 'node') g.fillRect(-28, -18, 56, 36);
    g.fillStyle = '#1d2433';
    g.beginPath();
    switch (p.type) {
      case 'battery': {
        g.moveTo(-30, 0); g.lineTo(-6, 0); g.moveTo(6, 0); g.lineTo(30, 0); g.stroke();
        g.lineWidth = 3; g.beginPath(); g.moveTo(-6, -18); g.lineTo(-6, 18); g.stroke();
        g.lineWidth = 6; g.beginPath(); g.moveTo(6, -9); g.lineTo(6, 9); g.stroke();
        break;
      }
      case 'switch': {
        g.moveTo(-30, 0); g.lineTo(-14, 0); g.moveTo(14, 0); g.lineTo(30, 0); g.stroke();
        g.beginPath(); g.arc(-14, 0, 3, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.moveTo(-14, 0);
        if (p.state) g.lineTo(16, -2); else g.lineTo(12, -16);
        g.stroke();
        break;
      }
      case 'lamp': {
        g.moveTo(-30, 0); g.lineTo(-13, 0); g.moveTo(13, 0); g.lineTo(30, 0); g.stroke();
        g.beginPath(); g.arc(0, 0, 13, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.moveTo(-9, -9); g.lineTo(9, 9); g.moveTo(9, -9); g.lineTo(-9, 9); g.stroke();
        if (p.state) { g.fillStyle = 'rgba(255,200,60,.35)'; g.beginPath(); g.arc(0, 0, 13, 0, Math.PI * 2); g.fill(); }
        break;
      }
      case 'resistor': {
        g.moveTo(-30, 0); g.lineTo(-18, 0); g.moveTo(18, 0); g.lineTo(30, 0); g.stroke();
        g.strokeRect(-18, -8, 36, 16);
        break;
      }
      case 'rheostat': {
        g.moveTo(-30, 0); g.lineTo(-18, 0); g.moveTo(18, 0); g.lineTo(30, 0); g.stroke();
        g.strokeRect(-18, -8, 36, 16);
        const sx = -18 + 36 * (p.state ?? 0.5);
        g.beginPath(); g.moveTo(sx, -26); g.lineTo(sx, -10); g.stroke();
        g.beginPath(); g.moveTo(sx - 5, -16); g.lineTo(sx, -9); g.lineTo(sx + 5, -16); g.stroke();
        break;
      }
      case 'ammeter': case 'voltmeter': {
        g.moveTo(-30, 0); g.lineTo(-14, 0); g.moveTo(14, 0); g.lineTo(30, 0); g.stroke();
        g.beginPath(); g.arc(0, 0, 14, 0, Math.PI * 2); g.stroke();
        g.rotate(-((p.rot || 0) * Math.PI) / 180);
        g.font = 'bold 18px "Times New Roman", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(p.type === 'ammeter' ? 'A' : 'V', 0, 1);
        break;
      }
      case 'node': g.arc(0, 0, 4.5, 0, Math.PI * 2); g.fill(); break;
    }
    g.restore();
    if (p.label) {
      g.font = 'italic 20px "Times New Roman", serif'; g.textAlign = 'center';
      g.fillText(p.label, p.x + (p.lx ?? 0), p.y + (p.ly ?? -26));
    }
  }
  g.restore();
}

/** 面板里放一张电路图：返回 { el, draw(spec) } */
export function schematicCanvas(h, { width = 680, height = 300 } = {}) {
  const canvas = h('canvas', { class: 'chart', width, height });
  canvas.style.height = `${height / 2}px`;
  return {
    el: canvas,
    draw(spec) {
      const g = canvas.getContext('2d');
      g.clearRect(0, 0, width, height);
      g.save();
      g.scale(width / 340, height / 150);
      g.lineWidth = 1.6;
      g.scale(0.5, 0.5);
      drawSchematic(g, spec);
      g.restore();
    },
  };
}

/** 找出射线打到的元件（返回元件对象）。 */
export function pickPart(circuit, ray) {
  const hits = ray.intersectObject(circuit.group, true);
  for (const hit of hits) {
    for (let o = hit.object; o; o = o.parent) {
      for (const p of circuit.parts.values()) if (p.group === o) return { part: p, point: hit.point };
    }
  }
  return null;
}

export { INK };
