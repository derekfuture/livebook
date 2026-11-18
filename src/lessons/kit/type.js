// 活字：数学“面积与代数”这一组活页共用的器物。
// 一块字的大小就是它的面积；排满了铁框（版框）才锁得住，锁住了才能印。
// 材质：枫木字身（侧面看得见木纹）、字面上了墨、铸铁版框、黄铜把手、胡桃木托盘、橡胶墨辊。
// 颜色只留给概念：a 那一边青，b 那一边品红；a×b 两边都有，是紫。这一组活页里一直这么用。
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SERIF } from './sheet.js';

export const TYPE_H = 0.015;            // 字高：字身有多厚
export const HUE = { a: '#1b8fc2', b: '#d12a74', ab: '#7048b0' };
export const KINDS = {
  a2: { ink: '#14688f', hue: HUE.a, term: [['a', 'i'], ['2', 's']] },
  ab: { ink: '#57388f', hue: HUE.ab, term: [['a', 'i'], ['b', 'i']] },
  b2: { ink: '#9e1b57', hue: HUE.b, term: [['b', 'i'], ['2', 's']] },
};

// ---------- 环境光：金属、墨面的反光要有东西可反（只生成一次） ----------
let envTex = null;
const waitEnv = new Set();
export function envFor(mat, k = 1) {
  mat.envMapIntensity = k;
  if (envTex) { mat.envMap = envTex; return mat; }
  waitEnv.add(mat);
  return mat;
}
/** 每帧调一下：渲染器有了就生成环境贴图，补给还没拿到的材质 */
export function envTick() {
  if (envTex || !waitEnv.size) return;
  const r = globalThis.__lb?.stage?.renderer;
  if (!r) return;
  const pm = new THREE.PMREMGenerator(r);
  envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  pm.dispose();
  for (const m of waitEnv) { m.envMap = envTex; m.needsUpdate = true; }
  waitEnv.clear();
}

// ---------- 木纹 ----------
const rng = (seed) => { let s = seed % 2147483647 || 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };
const woodCache = new Map();
/** 顺纹的木头：年轮细线沿着贴图的横向走 */
export function wood({ base = '#e0c597', dark = '#9b7442', light = '#f3e2bd', rings = 54, seed = 7 } = {}) {
  const key = [base, dark, light, rings, seed].join();
  if (woodCache.has(key)) return woodCache.get(key);
  const w = 512, h = 256, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), rnd = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < rings; i++) {
    const y0 = rnd() * h, amp = 1.5 + rnd() * 5, f = 0.004 + rnd() * 0.012, ph = rnd() * 6.28;
    g.strokeStyle = rnd() < 0.72 ? dark : light; g.globalAlpha = 0.1 + rnd() * 0.2; g.lineWidth = 0.6 + rnd() * 2.4;
    g.beginPath();
    for (let x = 0; x <= w; x += 8) { const y = y0 + Math.sin(x * f + ph) * amp + Math.sin(x * f * 3.3 + ph * 2) * amp * 0.35; if (x) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
  }
  g.globalAlpha = 0.07;
  for (let i = 0; i < 1600; i++) { g.fillStyle = rnd() < 0.55 ? dark : light; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 7, 1); }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  woodCache.set(key, t);
  return t;
}

// ---------- 材质（同一种东西只用一份） ----------
let MAT = null;
export function mats() {
  if (MAT) return MAT;
  MAT = {
    maple: new THREE.MeshStandardMaterial({ map: wood(), roughness: 0.62, metalness: 0 }),
    walnut: new THREE.MeshStandardMaterial({ map: wood({ base: '#7b5536', dark: '#4a3020', light: '#97704c', seed: 3, rings: 60 }), roughness: 0.55, metalness: 0 }),
    iron: envFor(new THREE.MeshStandardMaterial({ color: 0x34373d, roughness: 0.46, metalness: 0.72 }), 0.85),
    brass: envFor(new THREE.MeshStandardMaterial({ color: 0xc19a4b, roughness: 0.3, metalness: 0.92 }), 1),
    rubber: envFor(new THREE.MeshStandardMaterial({ color: 0x1d1e22, roughness: 0.32, metalness: 0 }), 0.55),
    handle: new THREE.MeshStandardMaterial({ map: wood({ base: '#9a6a3c', dark: '#5a391b', light: '#c08b55', seed: 11, rings: 40 }), roughness: 0.45, metalness: 0 }),
    ink: {},
  };
  for (const [k, v] of Object.entries(KINDS)) MAT.ink[k] = envFor(new THREE.MeshStandardMaterial({ map: inkTexture(v.ink, k.length * 13), roughness: 0.4, metalness: 0 }), 0.5);
  return MAT;
}

/** 上了墨的字面：墨不是死平的，透出一点顺纹的木头纹理 */
function inkTexture(ink, seed) {
  const n = 256, c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d'), rnd = rng(seed + 5);
  g.fillStyle = ink; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 46; i++) {
    const y0 = rnd() * n, amp = 1 + rnd() * 3, f = 0.01 + rnd() * 0.02, ph = rnd() * 6.28;
    g.strokeStyle = rnd() < 0.5 ? '#ffffff' : '#000000'; g.globalAlpha = 0.03 + rnd() * 0.05; g.lineWidth = 0.8 + rnd() * 2.2;
    g.beginPath(); for (let x = 0; x <= n; x += 8) { const y = y0 + Math.sin(x * f + ph) * amp; if (x) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// ---------- 字面上刻的字（凹下去的字，没沾墨，露着木头） ----------
const termCache = new Map();
/** 画一个式子里的项：parts = [['a','i'], ['2','s']]（i 斜体字母，s 上标，n 正体） */
export function drawTerm(g, parts, cx, cy, px, color) {
  const fonts = parts.map(([, k]) => (k === 'i' ? `italic 500 ${px}px ${SERIF}` : k === 's' ? `500 ${px * 0.58}px ${SERIF}` : `500 ${px}px ${SERIF}`));
  let W = 0; const ws = parts.map(([t], i) => { g.font = fonts[i]; const w = g.measureText(t).width + (parts[i][1] === 's' ? px * 0.02 : 0); W += w; return w; });
  let x = cx - W / 2;
  g.textBaseline = 'alphabetic'; g.textAlign = 'left'; g.fillStyle = color;
  parts.forEach(([t, k], i) => { g.font = fonts[i]; g.fillText(t, x + (k === 's' ? px * 0.02 : 0), cy + px * 0.34 - (k === 's' ? px * 0.42 : 0)); x += ws[i]; });
  return W;
}
function termTexture(kind) {
  if (termCache.has(kind)) return termCache.get(kind);
  const n = 256, c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d');
  const parts = KINDS[kind].term, px = parts.length > 1 && parts[1][1] === 'i' ? 132 : 150;
  drawTerm(g, parts, n / 2 - 3, n / 2 - 3, px, 'rgba(20,14,6,0.55)');          // 凹下去的那一圈阴影
  drawTerm(g, parts, n / 2 + 2, n / 2 + 2, px, 'rgba(255,248,232,0.5)');
  drawTerm(g, parts, n / 2, n / 2, px, '#ecd9b4');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  termCache.set(kind, t);
  return t;
}

// ---------- 一块字 ----------
/**
 * w（左右）× d（前后）的一块字，字高 TYPE_H。返回 Group：.body 字身，.face 字面，.kind。
 * 原点在字身底面的中心。
 */
export function typeBlock(kind, w, d) {
  const M = mats(), g = new THREE.Group();
  const r = Math.min(0.0011, w * 0.2, d * 0.2);
  const body = new THREE.Mesh(new RoundedBoxGeometry(w, TYPE_H, d, 2, r), M.maple);
  body.position.y = TYPE_H / 2; body.castShadow = body.receiveShadow = true;
  const inset = r * 0.9, fw = Math.max(0.0005, w - 2 * inset), fd = Math.max(0.0005, d - 2 * inset);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(fw, fd).rotateX(-Math.PI / 2), M.ink[kind]);
  face.position.y = TYPE_H + 0.00012; face.receiveShadow = true;
  const s = Math.min(w, d) * 0.66;
  const term = new THREE.Mesh(new THREE.PlaneGeometry(s, s).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: termTexture(kind), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  term.position.y = TYPE_H + 0.00024; term.renderOrder = 6;
  for (const m of [face, term]) { m.raycast = () => {}; m.userData.noFrame = true; }
  g.add(body, face, term);
  g.body = body; g.face = face; g.kind = kind; g.w = w; g.d = d;
  g.dispose = () => { body.geometry.dispose(); face.geometry.dispose(); term.geometry.dispose(); term.material.dispose(); };
  return g;
}

// ---------- 铁框（版框）----------
export const CHASE = { bar: 0.012, h: 0.011 };
/**
 * 内框 W（左右）× D（前后）的铁框，原点在内框中心、托盘面上。
 * marks：沿着前边和左边各两段刻度——[{ from, to, hue, label }]（from/to 从内框左端、后端量起）
 * 返回 Group：.handles（左右两个黄铜把手的拾取盒）
 */
export function chaseFrame(W, D, { front = [], left = [], labelH = 0.0076, bar = CHASE.bar } = {}) {
  const M = mats(), g = new THREE.Group(), B = bar, H = CHASE.h;
  const beam = (w, d, x, z) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, H, d, 2, 0.0014), M.iron); m.position.set(x, H / 2, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  beam(W + 2 * B, B, 0, -D / 2 - B / 2); beam(W + 2 * B, B, 0, D / 2 + B / 2);
  beam(B, D, -W / 2 - B / 2, 0); beam(B, D, W / 2 + B / 2, 0);
  // 刻度：铁框顶面上贴着内沿的一条色线，两头各有一道往外的短线；字刻在铁框顶面中间
  const flat = (w, d, color) => new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color }));
  const E = 0.0009;          // 色线离内沿多远
  for (const m of front) {
    const x0 = -W / 2 + m.from, x1 = -W / 2 + m.to; if (x1 - x0 < 1e-5) continue;
    const line = flat(x1 - x0, 0.0011, m.hue); line.position.set((x0 + x1) / 2, H + 0.0002, D / 2 + E); g.add(line);
    for (const x of [x0, x1]) { const t = flat(0.0007, 0.0034, m.hue); t.position.set(x, H + 0.0002, D / 2 + E + 0.0012); g.add(t); }
    if (m.label) { const t = labelMesh(m.label, m.hue, labelH); t.position.set((x0 + x1) / 2, H + 0.0003, D / 2 + B * 0.6); g.add(t); }
  }
  for (const m of left) {
    const z0 = -D / 2 + m.from, z1 = -D / 2 + m.to; if (z1 - z0 < 1e-5) continue;
    const line = flat(0.0011, z1 - z0, m.hue); line.position.set(-W / 2 - E, H + 0.0002, (z0 + z1) / 2); g.add(line);
    for (const z of [z0, z1]) { const t = flat(0.0034, 0.0007, m.hue); t.position.set(-W / 2 - E - 0.0012, H + 0.0002, z); g.add(t); }
    if (m.label) { const t = labelMesh(m.label, m.hue, labelH); t.position.set(-W / 2 - B * 0.6, H + 0.0003, (z0 + z1) / 2); g.add(t); }
  }
  // 把手：左右两边外侧各一个黄铜提环
  g.handles = [];
  for (const s of [-1, 1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0062, 0.0011, 8, 22, Math.PI), M.brass);
    ring.rotation.set(0, s > 0 ? 0 : Math.PI, -Math.PI / 2); ring.rotation.order = 'YXZ';
    ring.position.set(s * (W / 2 + B), H * 0.55, 0); ring.castShadow = true; ring.userData.handle = s; g.add(ring);
    const pick = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.02, 0.026), new THREE.MeshBasicMaterial({ visible: false }));
    pick.position.set(s * (W / 2 + B + 0.006), H * 0.6, 0); pick.userData.pick = true; pick.userData.noFrame = true; g.add(pick);
    g.handles.push(pick);
  }
  g.traverse((o) => { if (o.isMesh && !o.userData.pick && o.material?.isMeshBasicMaterial) { o.raycast = () => {}; o.userData.noFrame = true; } });
  g.bar = B;
  return g;
}

/** 躺着的一小行字（铁框、字盘上刻的 a、b） */
const labelCache = new Map();
export function labelMesh(parts, color, h) {
  const key = JSON.stringify(parts) + color;
  let tex = labelCache.get(key);
  if (!tex) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
    drawTerm(g, typeof parts === 'string' ? [[parts, 'i']] : parts, 128, 58, 132, color);
    tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; labelCache.set(key, tex);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(h * 2, h).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  m.raycast = () => {}; m.userData.noFrame = true; m.renderOrder = 7;
  return m;
}

// ---------- 托盘（galley）----------
export const GALLEY = { floor: 0.004, rim: 0.011, wall: 0.006 };
/** x0..x1、z0..z1 的托盘，三面有边（前面敞着，好推墨辊）；原点在书页上 */
export function galleyTray(x0, x1, z0, z1) {
  const M = mats(), g = new THREE.Group(), F = GALLEY.floor, R = GALLEY.rim, T = GALLEY.wall;
  const box = (w, h, d, x, y, z, mat = M.walnut) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(0.0016, h / 3)), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  const floor = box(x1 - x0, F, z1 - z0, (x0 + x1) / 2, F / 2, (z0 + z1) / 2);
  floor.userData.qaSupport = true;
  box(x1 - x0, F + R, T, (x0 + x1) / 2, (F + R) / 2, z0 + T / 2);
  box(T, F + R, z1 - z0, x0 + T / 2, (F + R) / 2, (z0 + z1) / 2);
  box(T, F + R, z1 - z0, x1 - T / 2, (F + R) / 2, (z0 + z1) / 2);
  for (const x of [x0 + T / 2, x1 - T / 2]) box(T + 0.0012, F + R + 0.0008, 0.012, x, (F + R) / 2 + 0.0002, z0 + 0.006, M.brass);          // 后面两个角包铜
  return g;
}

// ---------- 墨辊 ----------
/** 墨辊：辊子沿 z 放（长 L，半径 r），把手往 +x 斜着伸出去。原点在辊子轴心。 */
export function brayer(L = 0.1, r = 0.0125) {
  const M = mats(), g = new THREE.Group();
  const spin = new THREE.Group(); g.add(spin); g.spin = spin;
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 40, 1).rotateX(Math.PI / 2), M.rubber);
  drum.castShadow = drum.receiveShadow = true; spin.add(drum);
  // 辊子上一道浅色的缝，转起来看得出在滚
  const seam = new THREE.Mesh(new THREE.BoxGeometry(0.0009, 0.0006, L * 0.98), new THREE.MeshStandardMaterial({ color: 0x3a3c42, roughness: 0.5 }));
  seam.position.y = r; spin.add(seam);
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.42, r * 0.42, 0.003, 18).rotateX(Math.PI / 2), M.brass);
    cap.position.z = s * (L / 2 + 0.0015); g.add(cap);
  }
  // 弯过来的钢丝架：两头从轴伸出，往 +x 斜上方收到一起
  const wire = (s) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, s * (L / 2 + 0.003)), new THREE.Vector3(0.012, 0.004, s * (L / 2 + 0.005)), new THREE.Vector3(0.034, 0.014, s * 0.022), new THREE.Vector3(0.046, 0.02, 0),
  ]), 24, 0.0011, 8, false), M.brass);
  g.add(wire(-1), wire(1));
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0062, 0.05, 20), M.handle);
  grip.rotation.z = -Math.PI / 2 + 0.42; grip.position.set(0.068, 0.03, 0); grip.castShadow = true; g.add(grip);
  g.r = r; g.L = L;
  return g;
}

// ---------- 排字手托上的小号字（式子里的一个记号：a²、＋、＝、(a+b)²……） ----------
// 和面积字块反过来：这里是字凸起来、沾了墨，周围是没沾墨的木头——印出来就是白纸上的彩色字。
const sortTexCache = new Map();
/** parts 见 drawTerm；ink 字的墨色；w×d 字面大小。原点在字身底面中心。 */
export function sortBlock(parts, ink, w, d) {
  const M = mats(), g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(w, TYPE_H, d, 2, 0.0008), M.maple);
  body.position.y = TYPE_H / 2; body.castShadow = body.receiveShadow = true;
  const key = JSON.stringify(parts) + ink + w.toFixed(4) + d.toFixed(4);
  let tex = sortTexCache.get(key);
  if (!tex) {
    const H = 128, Wc = Math.max(64, Math.round((H * w) / d)), c = document.createElement('canvas'); c.width = Wc; c.height = H;
    const cg = c.getContext('2d');
    cg.fillStyle = '#d9bb8a'; cg.fillRect(0, 0, Wc, H);
    cg.fillStyle = 'rgba(120,84,40,0.18)'; for (let y = 6; y < H; y += 11) cg.fillRect(0, y + ((y * 7) % 5), Wc, 1.5);
    drawTerm(cg, parts, Wc / 2 + 2.5, H / 2 + 2.5, 86, 'rgba(70,46,18,0.45)');
    drawTerm(cg, parts, Wc / 2, H / 2, 86, ink);
    tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; sortTexCache.set(key, tex);
  }
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.0012, d - 0.0012).rotateX(-Math.PI / 2), envFor(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.42 }), 0.45));
  face.position.y = TYPE_H + 0.00012; face.raycast = () => {}; face.userData.noFrame = true;
  g.add(body, face);
  g.dispose = () => { body.geometry.dispose(); face.geometry.dispose(); face.material.dispose(); };
  return g;
}

/** 量一个式子的记号有多宽（米）：h 是字高 */
let measureCtx = null;
export function termWidth(parts, h) {
  measureCtx ||= document.createElement('canvas').getContext('2d');
  const px = 100; let W = 0;
  for (const [t, k] of parts) { measureCtx.font = k === 'i' ? `italic 500 ${px}px ${SERIF}` : k === 's' ? `500 ${px * 0.58}px ${SERIF}` : `500 ${px}px ${SERIF}`; W += measureCtx.measureText(t).width + (k === 's' ? px * 0.02 : 0); }
  return (W / px) * h;
}
