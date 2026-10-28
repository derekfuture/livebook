// 平面光路追踪（2D）+ 3D 里的“激光”光线 + 透镜等光学器材。
// 坐标：追踪在 (x, y) 平面里做；画的时候由 toWorld(x, y) 映射到 3D（竖直面或水平桌面都行）。
import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { paint, hull, inked, glassEdge } from '../../live/ink.js';
import { canvasTex, glowTexture } from './props.js';

const V2 = (x, y) => ({ x, y });
const sub = (a, b) => V2(a.x - b.x, a.y - b.y);
const dot = (a, b) => a.x * b.x + a.y * b.y;
const cross = (a, b) => a.x * b.y - a.y * b.x;
const norm = (a) => { const l = Math.hypot(a.x, a.y) || 1; return V2(a.x / l, a.y / l); };

/** 波长（nm）→ 颜色 */
export function wavelengthColor(nm) {
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else r = 1;
  return new THREE.Color(r, g, b);
}
export const SPECTRUM = [{ nm: 680, name: '红' }, { nm: 610, name: '橙' }, { nm: 580, name: '黄' }, { nm: 530, name: '绿' }, { nm: 480, name: '蓝' }, { nm: 445, name: '靛' }, { nm: 410, name: '紫' }];
/** 玻璃的色散（柯西公式，夸大一点让颜色分得开） */
export const glassN = (nm) => 1.5 + 12000 / (nm * nm) * 1.6;

/**
 * 光学场景。
 *   media:     [{ poly: [{x,y}...], n: number | (nm)=>number }]
 *   mirrors:   [{ a, b }]
 *   lenses:    [{ x, y, h, f }]   竖直放置的理想薄透镜（中心 x,y，半高 h，焦距 f，凹透镜 f<0）
 *   screens:   [{ a, b, id }]    挡光屏：光到这里停下，记录落点
 */
export class OpticsScene {
  constructor() { this.media = []; this.mirrors = []; this.lenses = []; this.screens = []; }

  nAt(p, nm) {
    let n = 1;
    for (const m of this.media) if (inPoly(p, m.poly)) n = typeof m.n === 'function' ? m.n(nm) : m.n;
    return n;
  }

  /** 追踪一条光线，返回 { pts: [{x,y}], hits: [{id, p}] , exits: 方向 }。 */
  trace(origin, dir, { nm = 620, maxLen = 3, maxBounces = 24 } = {}) {
    let o = { ...origin }, d = norm(dir);
    const pts = [{ ...o }], hits = [];
    let left = maxLen;
    for (let k = 0; k < maxBounces && left > 0; k++) {
      let best = null;
      const test = (a, b, kind, obj) => {
        const t = segHit(o, d, a, b);
        if (t != null && t > 1e-7 && (!best || t < best.t)) best = { t, a, b, kind, obj };
      };
      for (const m of this.mirrors) test(m.a, m.b, 'mirror', m);
      for (const s of this.screens) test(s.a, s.b, 'screen', s);
      for (const l of this.lenses) test(V2(l.x, l.y - l.h), V2(l.x, l.y + l.h), 'lens', l);
      for (const m of this.media) for (let i = 0; i < m.poly.length; i++) test(m.poly[i], m.poly[(i + 1) % m.poly.length], 'edge', m);
      if (!best || best.t > left) { const e = V2(o.x + d.x * left, o.y + d.y * left); pts.push(e); break; }
      const p = V2(o.x + d.x * best.t, o.y + d.y * best.t);
      pts.push(p);
      left -= best.t;
      const tan = norm(sub(best.b, best.a));
      let nrm = V2(-tan.y, tan.x);
      if (dot(nrm, d) > 0) nrm = V2(-nrm.x, -nrm.y);       // 法线朝着入射光来的一侧
      if (best.kind === 'mirror') {
        const c = dot(d, nrm);
        d = norm(V2(d.x - 2 * c * nrm.x, d.y - 2 * c * nrm.y));
        hits.push({ kind: 'mirror', p, obj: best.obj });
      } else if (best.kind === 'screen') {
        hits.push({ kind: 'screen', id: best.obj.id, p, obj: best.obj });
        break;
      } else if (best.kind === 'lens') {
        const l = best.obj;
        // 理想薄透镜：对竖直透镜，出射光斜率 m' = m − y/f（沿 +x 传播；反向传播时公式对称）
        const sx = Math.sign(d.x) || 1;
        const y = p.y - l.y;
        const m = d.y / d.x;
        const m2 = m - (y / l.f) * sx;
        d = norm(V2(sx, m2 * sx));
        hits.push({ kind: 'lens', p, obj: l });
      } else {
        // 折射：看交点两侧的折射率
        const eps = 1e-6;
        const n1 = this.nAt(V2(p.x + nrm.x * eps, p.y + nrm.y * eps), nm);
        const n2 = this.nAt(V2(p.x - nrm.x * eps, p.y - nrm.y * eps), nm);
        const cosi = -dot(d, nrm);
        const r = n1 / n2, k2 = 1 - r * r * (1 - cosi * cosi);
        if (k2 < 0) {      // 全反射
          d = norm(V2(d.x + 2 * cosi * nrm.x, d.y + 2 * cosi * nrm.y));
          hits.push({ kind: 'tir', p });
        } else {
          const ct = Math.sqrt(k2);
          d = norm(V2(r * d.x + (r * cosi - ct) * nrm.x, r * d.y + (r * cosi - ct) * nrm.y));
          hits.push({ kind: 'refract', p, n1, n2, i: Math.acos(Math.min(1, cosi)), r: Math.acos(Math.min(1, ct)), normal: nrm });
        }
      }
      o = V2(p.x + d.x * 1e-6, p.y + d.y * 1e-6);
    }
    return { pts, hits, dir: d };
  }
}

function segHit(o, d, a, b) {
  const e = sub(b, a), den = cross(d, e);
  if (Math.abs(den) < 1e-12) return null;
  const ao = sub(a, o);
  const t = cross(ao, e) / den, u = cross(ao, d) / den;
  return u >= 0 && u <= 1 ? t : null;
}

function inPoly(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** 薄透镜成像：物距 u、焦距 f → { v, m, real } （v<0 为虚像，在物体同侧） */
export function lensImage(u, f) {
  if (Math.abs(u - f) < 1e-6) return { v: Infinity, m: Infinity, real: false };
  const v = (u * f) / (u - f);
  return { v, m: -v / u, real: v > 0 };
}

// ---------------------------------------------------------------- 画光线
/**
 * 一组“激光”光线：粗的半透明光晕 + 细的亮芯。
 * set(paths, toWorld)：paths = [{ pts: [{x,y}], color }]
 */
export class RayView {
  constructor({ width = 2.6, glow = 9, dashedBack = false } = {}) {
    this.group = new THREE.Group();
    this.core = new LineSegments2(new LineSegmentsGeometry(), new LineMaterial({ vertexColors: true, linewidth: width, worldUnits: false, transparent: true, depthWrite: false }));
    this.halo = new LineSegments2(new LineSegmentsGeometry(), new LineMaterial({ vertexColors: true, linewidth: glow, worldUnits: false, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.virt = new LineSegments2(new LineSegmentsGeometry(), new LineMaterial({ vertexColors: true, linewidth: 1.4, worldUnits: false, dashed: true, dashSize: 0.008, gapSize: 0.006, transparent: true, opacity: 0.85, depthWrite: false }));
    for (const l of [this.core, this.halo, this.virt]) { l.raycast = () => {}; l.frustumCulled = false; l.renderOrder = 20; this.group.add(l); }
  }

  set(paths, toWorld, virtualPaths = []) {
    const build = (list) => {
      const pos = [], col = [];
      for (const p of list) {
        const c = p.color instanceof THREE.Color ? p.color : new THREE.Color(p.color ?? 0xff2a2a);
        for (let i = 0; i < p.pts.length - 1; i++) {
          const a = toWorld(p.pts[i].x, p.pts[i].y), b = toWorld(p.pts[i + 1].x, p.pts[i + 1].y);
          pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
          col.push(c.r, c.g, c.b, c.r, c.g, c.b);
        }
      }
      return { pos, col };
    };
    const real = build(paths), virt = build(virtualPaths);
    for (const [line, data] of [[this.core, real], [this.halo, real], [this.virt, virt]]) {
      line.geometry.dispose();
      line.geometry = new LineSegmentsGeometry();
      line.visible = data.pos.length > 0;
      if (data.pos.length) { line.geometry.setPositions(data.pos); line.geometry.setColors(data.col); }
      if (line === this.virt && data.pos.length) line.computeLineDistances();
    }
  }
}

// ---------------------------------------------------------------- 器材
/** 激光笔（沿 +x 发光，原点在笔尖） */
export function laserPen({ color = 0x30343f } = {}) {
  const g = new THREE.Group();
  const body = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.09, 16), paint(color)), 0.0014);
  body.rotation.z = Math.PI / 2;
  body.position.x = -0.045;
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.006, 0.008, 16), paint(0xb0b7c3));
  tip.rotation.z = Math.PI / 2;
  tip.position.x = -0.004;
  const btn = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.003, 0.004), paint(0xd23b2b));
  btn.position.set(-0.04, 0.006, 0);
  const dot = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff3030, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  dot.scale.set(0.02, 0.02, 1);
  g.add(body, tip, btn, dot);
  return g;
}

/** 透镜（凸/凹），竖直放置、主光轴沿 x。r 半径，thick 中心厚度。 */
export function lensMesh({ r = 0.04, convex = true, thick = 0.012, color = 0xbfe3f2 } = {}) {
  const pts = [];
  const N = 16;
  for (let i = 0; i <= N; i++) {
    const y = (i / N) * r;
    const k = 1 - (y / r) ** 2;
    const half = convex ? 0.0015 + (thick / 2) * k : 0.0015 + (thick / 2) * (1 - k);
    pts.push(new THREE.Vector2(half, y));
  }
  // Lathe 绕 y 轴旋转，得到“一半”的轮廓：这里直接做成绕 x 轴的旋转体
  const shape = [];
  for (let i = N; i >= 0; i--) shape.push(new THREE.Vector2(pts[i].y, -pts[i].x));
  for (let i = 0; i <= N; i++) shape.push(new THREE.Vector2(pts[i].y, pts[i].x));
  const geo = new THREE.LatheGeometry(shape, 40);
  geo.rotateZ(Math.PI / 2);
  const m = new THREE.Mesh(geo, paint(color, { unique: true, transparent: true, opacity: 0.5, depthWrite: false }));
  m.renderOrder = 9;
  glassEdge(m, 0.0012);
  return m;
}

/** 光具座：带刻度的长条导轨，length 米，0 刻度在左端（单位 cm）。 */
export function opticalBench({ length = 1.0 } = {}) {
  const g = new THREE.Group();
  const tex = canvasTex(4096, 96, (c, W, H) => {
    c.fillStyle = '#e9edf2'; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#1d2433'; c.fillStyle = '#1d2433'; c.font = 'bold 34px sans-serif'; c.textAlign = 'center';
    const cm = length * 100;
    for (let i = 0; i <= cm; i++) {
      const x = (i / cm) * W, major = i % 10 === 0;
      c.lineWidth = major ? 4 : 1.5;
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, major ? 40 : i % 5 === 0 ? 28 : 16); c.stroke();
      if (major) c.fillText(String(i), Math.min(W - 30, Math.max(30, x)), 80);
    }
  });
  const top = new THREE.MeshBasicMaterial({ map: tex });
  const side = paint(0x9aa3b2);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(length, 0.012, 0.03), [side, side, side, side, top, side]);
  rail.rotation.x = -Math.PI / 2 * 0;
  // 刻度贴在朝向观众的正面（+z）
  rail.position.set(length / 2, 0.03, 0);
  inked(rail, { width: 1.2 });
  for (const x of [0.04, length - 0.04]) {
    const leg = inked(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.024, 0.06), paint(0x6b7385)));
    leg.position.set(x, 0.012, 0);
    g.add(leg);
  }
  g.add(rail);
  g.railY = 0.036;
  return g;
}

/** 光具座上的支架（滑块 + 竖杆），返回 group，.mount 是顶端的挂载点（y = 立杆高度）。 */
export function benchPost(height = 0.1) {
  const g = new THREE.Group();
  const block = inked(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.014, 0.036), paint(0x4d5668)));
  block.position.y = 0.007;
  const rod = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, height, 10), paint(0x9aa3b2)), 0.0012);
  rod.position.y = height / 2;
  g.add(block, rod);
  g.mount = new THREE.Group();
  g.mount.position.y = height;
  g.add(g.mount);
  return g;
}

/**
 * 光屏：一块白板，上面画像（canvas）。draw(fn) 里用 2D 画。
 */
export function screenBoard({ w = 0.1, h = 0.09 } = {}) {
  const tex = canvasTex(512, Math.round((512 * h) / w), (c, W, H) => { c.fillStyle = '#fbfaf6'; c.fillRect(0, 0, W, H); });
  const g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.004, h, w), [new THREE.MeshBasicMaterial({ map: tex }), new THREE.MeshBasicMaterial({ map: tex }), paint(0xe9e6dc), paint(0xe9e6dc), paint(0xe9e6dc), paint(0xe9e6dc)]);
  inked(board, { width: 1.2 });
  g.add(board);
  g.tex = tex;
  g.size = [w, h];
  g.paint = (fn) => { const c = tex.canvas.getContext('2d'); c.fillStyle = '#fbfaf6'; c.fillRect(0, 0, tex.canvas.width, tex.canvas.height); fn(c, tex.canvas.width, tex.canvas.height); tex.needsUpdate = true; };
  return g;
}

/** 在 2D 画布上画一个烛焰（像），用于光屏上的成像。 */
export function drawFlame(c, cx, cy, size, { invert = false, blur = 0, alpha = 1, rot = 0, wick = false } = {}) {
  // 局部坐标：原点在烛焰底部，烛焰尖在 y = −100（invert 时翻到下方）
  const shape = (k) => {
    c.beginPath();
    c.moveTo(0, -100 * k);
    c.bezierCurveTo(16 * k, -70 * k, 30 * k, -44 * k, 28 * k, -22 * k);
    c.arc(0, -22 * k, 28 * k, 0, Math.PI, false);
    c.bezierCurveTo(-30 * k, -44 * k, -16 * k, -70 * k, 0, -100 * k);
    c.closePath();
  };
  c.save();
  c.globalAlpha = alpha;
  c.translate(cx, cy);
  c.rotate(rot);
  if (invert) c.scale(1, -1);
  c.scale(size / 100, size / 100);
  c.filter = blur > 0.5 ? `blur(${blur}px)` : 'none';
  c.globalCompositeOperation = 'lighter';
  // 焰心底部的淡蓝色
  if (wick) { const b = c.createRadialGradient(0, -6, 2, 0, -10, 26); b.addColorStop(0, 'rgba(90,140,255,.9)'); b.addColorStop(1, 'rgba(90,140,255,0)'); c.fillStyle = b; c.beginPath(); c.ellipse(0, -10, 24, 16, 0, 0, Math.PI * 2); c.fill(); }
  // 外焰：橙色，带一圈光晕
  c.shadowColor = 'rgba(255,150,40,.9)'; c.shadowBlur = 30;
  const outer = c.createLinearGradient(0, 0, 0, -100);
  outer.addColorStop(0, 'rgba(255,170,60,.95)'); outer.addColorStop(0.6, 'rgba(255,120,30,.85)'); outer.addColorStop(1, 'rgba(255,90,20,.2)');
  c.fillStyle = outer; shape(1); c.fill();
  // 内焰：亮黄白
  c.shadowBlur = 0;
  c.translate(0, -6);
  const inner = c.createLinearGradient(0, 0, 0, -70);
  inner.addColorStop(0, 'rgba(255,255,235,1)'); inner.addColorStop(1, 'rgba(255,230,140,.2)');
  c.fillStyle = inner; shape(0.62); c.fill();
  // 灯芯：焰心底部一小截暗的
  if (wick) { c.globalCompositeOperation = 'source-over'; c.globalAlpha = alpha * 0.85; c.fillStyle = '#3a2a22'; c.beginPath(); c.ellipse(0, 4, 3.2, 9, 0, 0, Math.PI * 2); c.fill(); }
  c.restore();
}

export { V2 };
