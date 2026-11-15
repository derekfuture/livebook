// 数学的纸面：数学的图本身就是研究的对象，所以数学的活页不把图变成实物，而是让这页纸自己活过来——
// 一张平放的纸，上面的东西都是纸片、墨线和文具盒里的东西（直尺、图钉、铅笔、橡皮）。
// 纸面坐标 (u, v)：单位米，u 向右，v 向“上”（离读者远的方向）。对应到 3D：x = u，z = −v，y 是离开纸面的高度。
import * as THREE from 'three';
import { HAND } from '../../live/paper.js';

export const INK = '#23293a', PENCIL = '#5b6170', CYAN = '#1a9fc9', MAGENTA = '#e4007f';
export const SERIF = '"Times New Roman", "Songti SC", "STSong", serif';
export const KAI = '"Kaiti SC", "STKaiti", "KaiTi", "Songti SC", serif';
export { HAND };

export const P3 = (u, v, y = 0) => new THREE.Vector3(u, y, -v);
// 太阳在左前上方（Stage.js：(-2.2, 6.5, 3.2)）：离纸面高 1 的东西，影子往右、往远处偏这么多
const SHADOW = [2.2 / 6.5, 3.2 / 6.5];

const col = (c) => (c instanceof THREE.Color ? c : new THREE.Color(c));

// ---------- 纸 ----------
let grainTex = null;
/** 纸的纹理：很淡的纤维和颗粒，可以平铺 */
export function grain() {
  if (grainTex) return grainTex;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5200; i++) { const v = 205 + Math.random() * 50; g.fillStyle = `rgba(${v},${v * 0.985},${v * 0.95},${0.1 + Math.random() * 0.2})`; g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random(), 1 + Math.random()); }
  for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(150,140,120,${0.03 + Math.random() * 0.05})`; g.lineWidth = 0.6; const x = Math.random() * 256, y = Math.random() * 256, a = Math.random() * Math.PI; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14); g.stroke(); }
  grainTex = new THREE.CanvasTexture(c); grainTex.wrapS = grainTex.wrapT = THREE.RepeatWrapping; grainTex.colorSpace = THREE.SRGBColorSpace; grainTex.anisotropy = 8;
  return grainTex;
}

/**
 * 一张活页纸（平放，纸面在 y = 0）：w × d 米，中心在原点。grid：方格的边长（米），不给就是白纸。
 * draw(g, px)：在纸上印东西（画布坐标：左上角为原点，px = 每米多少像素）。
 */
export function sheet({ w, d, grid = 0, gridColor = 'rgba(70,150,190,0.3)', color = '#f4eedd', holes = true, res = 2048, draw = null } = {}) {
  const group = new THREE.Group();
  const c = document.createElement('canvas'); c.width = res; c.height = Math.round((res * d) / w);
  const g = c.getContext('2d'), px = res / w;
  const paint = () => {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    g.globalAlpha = 0.5; g.fillStyle = g.createPattern(grain().image, 'repeat'); g.fillRect(0, 0, c.width, c.height); g.globalAlpha = 1;
    if (grid) {
      g.strokeStyle = gridColor; g.lineWidth = Math.max(1, px * 0.00018);
      const m = 0.012;          // 纸边留白
      const nx = Math.floor((w - 2 * m) / grid), nz = Math.floor((d - 2 * m) / grid), x0 = (w - nx * grid) / 2, z0 = (d - nz * grid) / 2;
      g.beginPath();
      for (let i = 0; i <= nx; i++) { g.moveTo((x0 + i * grid) * px, z0 * px); g.lineTo((x0 + i * grid) * px, (z0 + nz * grid) * px); }
      for (let j = 0; j <= nz; j++) { g.moveTo(x0 * px, (z0 + j * grid) * px); g.lineTo((x0 + nx * grid) * px, (z0 + j * grid) * px); }
      g.stroke();
    }
    if (holes) {          // 活页纸左边的三个孔
      for (const k of [0.2, 0.5, 0.8]) { g.fillStyle = 'rgba(255,253,246,0.95)'; g.beginPath(); g.arc(0.008 * px, k * c.height, 0.0021 * px, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(90,70,40,0.45)'; g.lineWidth = px * 0.00035; g.stroke(); g.strokeStyle = 'rgba(90,70,40,0.28)'; g.beginPath(); g.arc(0.008 * px, k * c.height, 0.0018 * px, Math.PI * 0.9, Math.PI * 1.9); g.stroke(); }
    }
    draw?.(g, px, c);
    tex.needsUpdate = true;
  };
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const T = 0.0012;          // 垫着几张纸的厚度
  const top = new THREE.MeshLambertMaterial({ map: tex }), side = new THREE.MeshLambertMaterial({ color: 0xe6dfcf });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, T, d), [side, side, top, side, side, side]);
  mesh.position.y = -T / 2; mesh.receiveShadow = true; mesh.castShadow = true; mesh.userData.qaSupport = true;
  group.add(mesh);
  // 纸底下一圈柔和的影子：这张纸是放在书上的另一张纸，要和书页分得开
  const sc = document.createElement('canvas'); sc.width = sc.height = 128;
  const sg = sc.getContext('2d'), m = 22;
  sg.shadowColor = 'rgba(40,28,10,0.9)'; sg.shadowBlur = 16; sg.fillStyle = 'rgba(40,28,10,0.9)'; sg.fillRect(m, m, 128 - 2 * m, 128 - 2 * m);
  const st = new THREE.CanvasTexture(sc);
  const k = 128 / (128 - 2 * m);
  const shade = new THREE.Mesh(new THREE.PlaneGeometry(w * k, d * k).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: st, transparent: true, opacity: 0.3, depthWrite: false }));
  shade.position.set(w * 0.012, -T - 0.0002, d * 0.016); shade.renderOrder = 1; shade.raycast = () => {}; shade.userData.noFrame = true;
  group.add(shade);
  paint();
  return { group, mesh, w, d, repaint: paint, canvas: c, px };
}

// ---------- 墨线：贴在纸面上的细带子（不是朝着镜头的线：斜着看时和印在纸上的一样会变扁） ----------
function ribbon(pts, width, closed, out) {
  const n = pts.length; if (n < 2) return;
  const hw = width / 2;
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = closed ? pts[(i - 1 + n) % n] : pts[Math.max(0, i - 1)], b = pts[i], c2 = closed ? pts[(i + 1) % n] : pts[Math.min(n - 1, i + 1)];
    let d1x = b[0] - a[0], d1y = b[1] - a[1], d2x = c2[0] - b[0], d2y = c2[1] - b[1];
    let l1 = Math.hypot(d1x, d1y), l2 = Math.hypot(d2x, d2y);
    if (l1 < 1e-9) { d1x = d2x; d1y = d2y; l1 = l2; } if (l2 < 1e-9) { d2x = d1x; d2y = d1y; l2 = l1; }
    if (l1 < 1e-9) { L.push(b); R.push(b); continue; }
    d1x /= l1; d1y /= l1; d2x /= l2; d2y /= l2;
    let nx = -(d1y + d2y), ny = d1x + d2x; const nl = Math.hypot(nx, ny);
    if (nl < 1e-6) { nx = -d1y; ny = d1x; } else { nx /= nl; ny /= nl; }
    const cos = Math.max(0.35, nx * -d1y + ny * d1x);          // 折角处加长一点（斜接），太尖的角封顶
    const k = hw / cos;
    L.push([b[0] + nx * k, b[1] + ny * k]); R.push([b[0] - nx * k, b[1] - ny * k]);
  }
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const j = (i + 1) % n, a = L[i], b = R[i], c2 = L[j], d2 = R[j];
    out.push(a[0], 0, -a[1], b[0], 0, -b[1], c2[0], 0, -c2[1], c2[0], 0, -c2[1], b[0], 0, -b[1], d2[0], 0, -d2[1]);
  }
}
function dashes(pts, closed, dash, gap) {
  const P = closed ? [...pts, pts[0]] : pts, out = [];
  let cur = null, left = dash, on = true;
  for (let i = 0; i < P.length - 1; i++) {
    let a = P[i]; const b = P[i + 1]; let seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (seg < 1e-9) continue;
    const dx = (b[0] - a[0]) / seg, dy = (b[1] - a[1]) / seg;
    if (on && !cur) cur = [a];
    while (seg > left) {
      const p = [a[0] + dx * left, a[1] + dy * left];
      if (on) { cur.push(p); out.push(cur); cur = null; } else cur = [p];
      seg -= left; a = p; on = !on; left = on ? dash : gap;
    }
    left -= seg;
    if (on) cur.push(b);
  }
  if (on && cur && cur.length > 1) out.push(cur);
  return out;
}
/**
 * 一条墨线。set(pts, closed)：pts = [[u, v], …]。width 是纸面上的宽度（米）；dash: [划, 空]（米）。
 * y：离纸面多高（叠放顺序用，默认紧贴纸面）。
 */
export function stroke({ width = 0.0007, color = INK, opacity = 1, dash = null, y = 0.00025, order = 4 } = {}) {
  const mat = new THREE.MeshBasicMaterial({ color: col(color), transparent: opacity < 1, opacity, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
  mesh.position.y = y; mesh.renderOrder = order; mesh.raycast = () => {}; mesh.userData.noFrame = true;
  mesh.set = (pts, closed = false) => {
    const out = [];
    if (pts && pts.length > 1) {
      if (dash) for (const d of dashes(pts, closed, dash[0], dash[1])) ribbon(d, width, false, out);
      else ribbon(pts, width, closed, out);
    }
    mesh.geometry.dispose();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
    mesh.geometry = geo; mesh.visible = out.length > 0 && mesh.userData.on !== false;
    return mesh;
  };
  mesh.show = (on) => { mesh.userData.on = on; mesh.visible = on && !!mesh.geometry.attributes.position?.count; return mesh; };
  mesh.fade = (o) => { mat.opacity = o; mat.transparent = o < 1; return mesh; };
  mesh.tint = (c2) => { mat.color.copy(col(c2)); return mesh; };
  return mesh;
}
/** 圆弧上的点：圆心 c，半径 r，从 a0 到 a1（弧度，逆时针为正） */
export function arcPts(c, r, a0, a1, n = 0) {
  const m = n || Math.max(4, Math.ceil(Math.abs(a1 - a0) / 0.09)), out = [];
  for (let i = 0; i <= m; i++) { const a = a0 + ((a1 - a0) * i) / m; out.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]); }
  return out;
}

// ---------- 纸片：能拿起来、转、翻的一块纸 ----------
const ccw = (pts) => { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return s > 0 ? pts : [...pts].reverse(); };
function fillGeo(pts, pivot) {
  const P = ccw(pts).map((p) => new THREE.Vector2(p[0] - pivot[0], p[1] - pivot[1]));
  const tri = THREE.ShapeUtils.triangulateShape(P, []);
  const pos = [], uv = [], nor = [];
  for (const p of P) { pos.push(p.x, 0, -p.y); uv.push((p.x + pivot[0]) * 26, (p.y + pivot[1]) * 26); nor.push(0, 1, 0); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(tri.flat());
  return geo;
}
/**
 * 一块纸片。parent：纸面所在的组。pts：纸面坐标里的轮廓；pivot：它转动、翻折时绕着的那一点（默认是轮廓的第一个点）。
 * 位置用 pose({ a, du, dv, lift }) 定：绕 pivot 逆时针转 a（弧度），再平移 (du, dv)，离纸面 lift 高。影子跟着 lift 变远、变淡。
 */
export function piece(parent, pts, { color = '#ffffff', back = '#f4f1e8', edge = 'rgba(40,46,60,0.55)', edgeW = 0.00045, pivot = null, y = 0.0006, opacity = 1, shadow = true, order = 5 } = {}) {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: col(color), map: grain(), transparent: opacity < 1, opacity, side: THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const matB = new THREE.MeshLambertMaterial({ color: col(back), map: grain(), side: THREE.BackSide });
  const fill = new THREE.Mesh(new THREE.BufferGeometry(), mat), under = new THREE.Mesh(fill.geometry, matB);
  fill.renderOrder = under.renderOrder = order; fill.receiveShadow = true;
  under.raycast = () => {};
  const rim = stroke({ width: edgeW, color: edge.startsWith?.('rgba') ? INK : edge, opacity: edge.startsWith?.('rgba') ? Number(edge.match(/[\d.]+\)$/)[0].slice(0, -1)) : 1, y: 0.00008, order: order + 1 });
  group.add(fill, under, rim);
  parent.add(group);
  // 影子：同一个形状，压在纸面上，颜色很淡；纸片抬得越高，影子偏得越远、越淡
  const sh1 = new THREE.Mesh(fill.geometry, new THREE.MeshBasicMaterial({ color: 0x3a3020, transparent: true, opacity: 0.16, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  const sh2 = new THREE.Mesh(fill.geometry, new THREE.MeshBasicMaterial({ color: 0x3a3020, transparent: true, opacity: 0.08, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  for (const s of [sh1, sh2]) { s.raycast = () => {}; s.renderOrder = order - 2; s.userData.noFrame = true; s.visible = shadow; parent.add(s); }
  const P = { group, fill, rim, pts: [], pivot: [0, 0], a: 0, du: 0, dv: 0, lift: 0, baseY: y, flip: 0 };
  P.set = (pp, pv = null) => {
    P.pts = pp; P.pivot = pv || P.pivot0 || pp[0];
    fill.geometry.dispose();
    const geo = fillGeo(pp, P.pivot);
    fill.geometry = under.geometry = sh1.geometry = sh2.geometry = geo;
    rim.set(ccw(pp).map((p) => [p[0] - P.pivot[0], p[1] - P.pivot[1]]), true);
    return P.pose({});
  };
  P.pose = ({ a = P.a, du = P.du, dv = P.dv, lift = P.lift, flip = P.flip, axis = P.axis } = {}) => {
    Object.assign(P, { a, du, dv, lift, flip, axis });
    const u = P.pivot[0] + du, v = P.pivot[1] + dv;
    group.position.set(u, P.baseY + lift, -v);
    group.rotation.set(0, 0, 0);
    if (flip && axis) {          // 沿纸面上的一条轴（方向角 axis）翻过去 flip 弧度：对折、翻面
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(Math.cos(axis), 0, -Math.sin(axis)), flip);
      group.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a));
    } else group.rotation.y = a;
    const k = Math.min(1, lift / 0.012);
    sh1.position.set(u + lift * SHADOW[0], 0.00012, -(v + lift * SHADOW[1])); sh1.rotation.y = a; sh1.material.opacity = 0.17 - 0.07 * k;
    sh2.position.set(u + lift * SHADOW[0] * 1.5 + 0.0005, 0.0001, -(v + lift * SHADOW[1] * 1.5 + 0.0005)); sh2.rotation.y = a; sh2.scale.setScalar(1 + 0.02 + k * 0.05); sh2.material.opacity = 0.09 - 0.03 * k;
    return P;
  };
  /** 纸片上的一点（原来的纸面坐标）现在在哪 */
  P.at = (p) => { const x = p[0] - P.pivot[0], y2 = p[1] - P.pivot[1], c = Math.cos(P.a), s = Math.sin(P.a); return [P.pivot[0] + P.du + x * c - y2 * s, P.pivot[1] + P.dv + x * s + y2 * c]; };
  P.outline = () => P.pts.map(P.at);
  P.show = (on) => { group.visible = on; sh1.visible = sh2.visible = on && shadow; return P; };
  P.tint = (c2) => { mat.color.copy(col(c2)); return P; };
  P.fade = (o) => { mat.opacity = o; mat.transparent = o < 1; return P; };
  P.pivot0 = pivot;
  if (pts) P.set(pts, pivot);
  return P;
}

// ---------- 字：印在纸上、躺在纸面上的字 ----------
const texCache = new Map();
function textTexture(text, { color, font, weight, px, italic, lineH = 1.25 }) {
  const key = [text, color, font, weight, px, italic].join('|');
  if (texCache.has(key)) return texCache.get(key);
  const lines = String(text).split('\n');
  const c = document.createElement('canvas'), g = c.getContext('2d');
  const f = `${italic ? 'italic ' : ''}${weight} ${px}px ${font}`;
  g.font = f;
  const w = Math.ceil(Math.max(...lines.map((l) => g.measureText(l).width))) + px * 0.5, h = Math.ceil(px * lineH * lines.length + px * 0.3);
  c.width = w; c.height = h;
  g.font = f; g.fillStyle = color; g.textBaseline = 'middle'; g.textAlign = 'center';
  lines.forEach((l, i) => g.fillText(l, w / 2, px * 0.15 + px * lineH * (i + 0.5)));
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const r = { tex, w, h, px }; texCache.set(key, r); return r;
}
/**
 * 躺在纸面上的字。h：一行字的高度（米）。math: true 用课本里字母的斜体；hand: true 用手写体（铅笔写的批注）。
 * 返回的网格有 at(u, v)、say(text)、fade(o)、turn(a)。
 */
export function text(parent, str, { h = 0.006, color = INK, math = false, hand = false, weight = 500, y = 0.0004, opacity = 1, order = 8, font = null } = {}) {
  const opt = { color, font: font || (math ? SERIF : hand ? HAND : KAI), weight: hand ? 400 : weight, px: 96, italic: math };
  const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  m.rotation.x = -Math.PI / 2; m.renderOrder = order; m.raycast = () => {}; m.userData.noFrame = true;
  let cur = null;
  m.say = (s) => {
    if (s === cur) return m; cur = s;
    if (!s) { m.visible = false; return m; }
    const t = textTexture(s, opt); mat.map = t.tex; mat.needsUpdate = true;
    const k = h / (t.px * 1.25);          // 一行字高 h
    m.scale.set(t.w * k, t.h * k, 1); m.visible = true;
    return m;
  };
  m.at = (u, v, yy = y) => { m.position.set(u, yy, -v); return m; };
  m.turn = (a) => { m.rotation.set(-Math.PI / 2, 0, a); return m; };
  m.fade = (o) => { mat.opacity = o; m.visible = o > 0.01 && !!cur; return m; };
  m.ink = (c2) => { opt.color = c2; const s = cur; cur = null; return m.say(s); };
  m.position.y = y;
  parent.add(m);
  return m.say(str);
}

// ---------- 文具 ----------
/** 图钉：钉在纸上当转轴 */
export function pin({ color = 0xd8372c, r = 0.0026 } = {}) {
  const g = new THREE.Group();
  const head = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 1), new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.05 }));
  head.position.y = 0.0012;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.75, 0.0012, 16), new THREE.MeshStandardMaterial({ color, roughness: 0.45 }));
  collar.position.y = 0.0006;
  head.castShadow = collar.castShadow = true;
  g.add(collar, head);
  return g;
}

// ---------- 小工具 ----------
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const mul = (a, k) => [a[0] * k, a[1] * k];
export const len = (a) => Math.hypot(a[0], a[1]);
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
export const unit = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
export const ang = (a) => Math.atan2(a[1], a[0]);
export const rot = (p, c, a) => { const x = p[0] - c[0], y = p[1] - c[1], co = Math.cos(a), si = Math.sin(a); return [c[0] + x * co - y * si, c[1] + x * si + y * co]; };
/** 把角度差收到 (−π, π] */
export const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a <= -Math.PI) a += 2 * Math.PI; return a; };
/** 一组会自己走完的小动画：tw.to(dur, fn(k), done)；每帧调 tw.update(dt) */
export function tweens() {
  const list = [];
  return {
    to(dur, fn, done) { const t = { dur, fn, done, t: 0 }; list.push(t); fn(0); return t; },
    get busy() { return list.length > 0; },
    clear() { list.length = 0; },
    update(dt) { for (let i = list.length - 1; i >= 0; i--) { const t = list[i]; t.t += dt; const k = Math.min(1, t.t / t.dur); t.fn(k); if (k >= 1) { list.splice(i, 1); t.done?.(); } } },
  };
}
