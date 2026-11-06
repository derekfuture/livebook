// 画面里的字，像有人在这本书上做的批注：书里的宋体、墨色，不带白底、不描白边。四种：
//   print     —— 地名、剖面上的字：按透视“印”在地面、水面、剖面上（正片叠底，像印进材质里），远近跟着模型
//   printPath —— 顺着河道、海岸线弯着写的名字
//   flow      —— 过程：一条流动的细线带箭头，名字顺着线写；发生时流动、亮着，不发生时收起来
//   note      —— 读数、状态、悬停的名字：物体上一个小点，发丝细的引线拉到旁边空处写字
// 字是网页字体（SVG），怎么缩放都清楚；每帧和 tags 用同一台相机摆位置（不晚一帧）。
import * as THREE from 'three';
import { onTagsUpdate } from '../../ui/tags.js';

const NS = 'http://www.w3.org/2000/svg';
export const SERIF = '"Songti SC", "STSong", "Noto Serif SC", "Source Han Serif SC", serif';
export const SANS = '"PingFang SC", "Hiragino Sans GB", system-ui, sans-serif';
const el = (n, a = {}, parent) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); parent?.appendChild(e); return e; };
const v = new THREE.Vector3(), wp = new THREE.Vector3();
let uid = 0;

export function inkLayer({ tag, camera }) {
  // occl 的字量左、中、右三点，有一点被挡住就整条淡掉（免得半个字压在山上）
  const host = tag('', 'ink-host');          // 借一个空牌子：模型长出来、收起来时，批注跟着别的牌子一起淡入淡出
  const mk = (cls) => { const s = el('svg', { class: `ink-layer ${cls}` }); document.body.appendChild(s); return s; };
  const printSvg = mk('print'), noteSvg = mk('note'), defs = el('defs', {}, noteSvg);
  const items = [], rc = new THREE.Raycaster();
  let W = innerWidth, H = innerHeight, last = performance.now(), frame = 0;
  const proj = (obj, p, out) => { v.set(p[0], p[1], p[2]); obj.localToWorld(v); out.wx = v.x; out.wy = v.y; out.wz = v.z; v.project(camera); out.x = ((v.x + 1) / 2) * W; out.y = ((1 - v.y) / 2) * H; out.z = v.z; return out; };
  const base = (o) => { o.o = 0; o.want = 1; o.show = (on) => { o.want = on ? 1 : 0; return o; }; items.push(o); return o; };
  // 被山挡住的地名淡掉（每 6 帧量一次）
  const hidden1 = (P, occl) => { wp.set(P.wx, P.wy, P.wz); const d = camera.position.distanceTo(wp); rc.set(camera.position, wp.sub(camera.position).normalize()); const h = rc.intersectObjects(occl, false)[0]; return h && h.distance < d - 0.004; };

  /** 印在面上的字。at：位置；ax：字往右写的方向；up：字的上方（平躺在地上时是 [0,0,-1]，写在朝前的剖面上是 [0,1,0]）；h：字高（模型单位） */
  function print(obj, text, { at = [0, 0, 0], ax = [1, 0, 0], up = [0, 0, -1], h = 0.01, color = '#2b2a26', opacity = 0.85, spacing = 0.12, weight = 600, occl = null } = {}) {
    const g = el('g', {}, printSvg), t = el('text', { 'font-size': 100, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: color, 'letter-spacing': spacing * 100, dx: spacing * 50, style: `font-family:${SERIF};font-weight:${weight}` }, g);
    t.textContent = text;
    const P0 = {}, Pa = {}, Pu = {}, o = base({ at: at.slice(), occ: false });
    o.set = (s) => { if (t.textContent !== s) t.textContent = s; return o; };
    o.move = (x, y, z) => { o.at[0] = x; o.at[1] = y; o.at[2] = z; return o; };
    o.draw = () => {
      const a = o.at; proj(obj, a, P0); proj(obj, [a[0] + ax[0] * h, a[1] + ax[1] * h, a[2] + ax[2] * h], Pa); proj(obj, [a[0] + up[0] * h, a[1] + up[1] * h, a[2] + up[2] * h], Pu);
      const m = [(Pa.x - P0.x) / 100, (Pa.y - P0.y) / 100, -(Pu.x - P0.x) / 100, -(Pu.y - P0.y) / 100];
      if (occl && frame % 6 === 0) { const L = {}, Rr = {}, wd = (h * t.textContent.length * (1 + spacing)) / 2; proj(obj, [a[0] - ax[0] * wd, a[1] - ax[1] * wd, a[2] - ax[2] * wd], L); proj(obj, [a[0] + ax[0] * wd, a[1] + ax[1] * wd, a[2] + ax[2] * wd], Rr); o.occ = hidden1(P0, occl) || hidden1(L, occl) || hidden1(Rr, occl); }
      const back = m[0] * m[3] - m[1] * m[2] <= 0 || P0.z > 1;          // 从背面看过去（字是反的），就不写
      g.setAttribute('transform', `matrix(${m.join(' ')} ${P0.x} ${P0.y})`); g.style.opacity = back || o.occ ? 0 : o.o * opacity;
    };
    return o;
  }

  /** 顺着一条线弯着写（河道、海岸线）。pts：模型坐标的点；h：字高（模型单位，按那里的远近换成像素） */
  function printPath(obj, text, { pts, h = 0.008, color = '#1d4f86', opacity = 0.85, spacing = 0.25, dy = -0.7 } = {}) {
    const id = `ink${uid++}`, path = el('path', { id, fill: 'none' }, printSvg), t = el('text', { fill: color, 'text-anchor': 'middle', style: `font-family:${SERIF};font-weight:600` }, printSvg), tp = el('textPath', { href: `#${id}`, startOffset: '50%' }, t);
    tp.textContent = text;
    const o = base({ pts }), P = {}, Q = {};
    o.draw = () => {
      const S = o.pts.map((p) => { proj(obj, p, P); return [P.x, P.y]; });
      if (S[S.length - 1][0] < S[0][0]) S.reverse();          // 字总是从左往右读
      const mid = o.pts[o.pts.length >> 1]; proj(obj, mid, P); proj(obj, [mid[0], mid[1] + h, mid[2]], Q); const px = Math.hypot(Q.x - P.x, Q.y - P.y);
      path.setAttribute('d', `M${S.map((s) => s.join(' ')).join('L')}`); t.setAttribute('font-size', px.toFixed(1)); t.setAttribute('letter-spacing', (px * spacing).toFixed(1)); t.setAttribute('dy', (px * dy).toFixed(1)); t.style.opacity = o.o * opacity;
    };
    return o;
  }

  /** 过程：流动的细线 + 箭头 + 名字。vertical：竖着的过程（蒸发、降水），名字竖着写在线旁边 */
  function flow(obj, { pts, color = '#2a5a9a', label = '', vertical = false, at = 0.5, size = 15, width = 1.6, speed = 28, side = 1 } = {}) {
    const id = `ink${uid++}`, mid = `${id}m`;
    const mk2 = el('marker', { id: mid, viewBox: '0 0 10 10', refX: 6, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse', markerUnits: 'userSpaceOnUse' }, defs); el('path', { d: 'M0 1 L8 5 L0 9 Z', fill: color }, mk2);
    const g = el('g', {}, noteSvg);
    const line = el('path', { fill: 'none', stroke: color, 'stroke-width': width * 0.6, 'stroke-opacity': 0.35, 'marker-end': `url(#${mid})` }, g);
    const dots = el('path', { fill: 'none', stroke: color, 'stroke-width': width * 1.6, 'stroke-linecap': 'round', 'stroke-dasharray': '0.1 9' }, g);
    const tpath = el('path', { id, fill: 'none' }, g);
    const t = el('text', { fill: color, 'font-size': size, 'letter-spacing': size * 0.18, style: `font-family:${SERIF};font-weight:600` }, g);
    let tp = null;
    if (vertical) { t.setAttribute('style', `font-family:${SERIF};font-weight:600;writing-mode:vertical-rl`); t.setAttribute('text-anchor', 'middle'); t.textContent = label; }
    else { t.setAttribute('text-anchor', 'middle'); t.setAttribute('dy', -size * 0.55); tp = el('textPath', { href: `#${id}`, startOffset: `${at * 100}%` }, t); tp.textContent = label; }
    const o = base({ pts, off: 0 }), P = {};
    o.set = (s) => { (tp || t).textContent = s; return o; };
    o.draw = (dt) => {
      const S = o.pts.map((p) => { proj(obj, p, P); return [P.x, P.y]; }), d = `M${S.map((s) => s.join(' ')).join('L')}`;
      line.setAttribute('d', d); dots.setAttribute('d', d); o.off -= dt * speed; dots.setAttribute('stroke-dashoffset', o.off.toFixed(1));
      if (vertical) { const k = Math.min(S.length - 1, Math.round(at * (S.length - 1))); t.setAttribute('x', S[k][0] + side * (size * 0.9)); t.setAttribute('y', S[k][1]); }
      else { const R = S[S.length - 1][0] < S[0][0] ? S.slice().reverse() : S; tpath.setAttribute('d', `M${R.map((s) => s.join(' ')).join('L')}`); }
      g.style.opacity = o.o;
    };
    return o;
  }

  /** 批注：物体上一个小点，引线拉到旁边（dx、dy 像素）写字。main 用宋体；sub 是小一号的说明；num：main 是读数（等宽数字） */
  function note(obj, main, { at = [0, 0, 0], dx = 36, dy = -30, color = '#2b2a26', size = 15, sub = '', num = false, dot = true, stack = false } = {}) {
    const g = el('g', {}, noteSvg);
    const ld = el('polyline', { fill: 'none', stroke: color, 'stroke-width': 0.9, 'stroke-opacity': 0.7 }, g), pt = el('circle', { r: 2.4, fill: color }, g);
    const t = el('text', { fill: color, 'dominant-baseline': 'central' }, g), t1 = el('tspan', {}, t), t2 = el('tspan', { 'font-size': size * 0.72, dx: size * 0.35, fill: color, 'fill-opacity': 0.75, style: `font-family:${SANS};font-weight:500` }, t);
    const o = base({ at: at.slice(), dx, dy }), P = {};
    const style = () => t1.setAttribute('style', num ? `font-family:${SANS};font-weight:600;font-variant-numeric:tabular-nums;font-size:${size * 1.15}px` : `font-family:${SERIF};font-weight:600;font-size:${size}px`);
    o.set = (m, s = sub) => { if (t1.textContent !== m) t1.textContent = m; if (t2.textContent !== s) t2.textContent = s; return o; };
    o.move = (x, y, z) => { o.at[0] = x; o.at[1] = y; o.at[2] = z; return o; };
    style(); o.set(main, sub); pt.style.display = dot ? '' : 'none'; if (stack) { t2.setAttribute('dx', 0); t2.setAttribute('dy', size * 1.35); t2.setAttribute('font-size', size * 0.82); }          // stack：说明另起一行
    o.draw = () => {
      proj(obj, o.at, P); if (P.z > 1) { g.style.opacity = 0; return; }
      const ex = P.x + o.dx, ey = P.y + o.dy, el2 = Math.abs(o.dx) > 4 ? 10 * Math.sign(o.dx) : 0, tx = ex + el2 + (el2 ? 5 * Math.sign(o.dx) : 0);
      ld.setAttribute('points', `${P.x},${P.y} ${ex},${ey} ${ex + el2},${ey}`); pt.setAttribute('cx', P.x); pt.setAttribute('cy', P.y);
      const L = Math.hypot(o.dx, o.dy) + Math.abs(el2); ld.setAttribute('stroke-dasharray', L); ld.setAttribute('stroke-dashoffset', (L * (1 - Math.min(1, o.o / 0.6))).toFixed(1));          // 引线先画出来，字再淡入
      t.setAttribute('x', tx); t.setAttribute('y', el2 ? ey : ey - size * 0.7); if (stack) t2.setAttribute('x', tx); t.setAttribute('text-anchor', el2 ? (o.dx > 0 ? 'start' : 'end') : 'middle'); t.style.opacity = Math.max(0, (o.o - 0.4) / 0.6);
      g.style.opacity = o.o > 0.01 ? 1 : 0;
    };
    return o;
  }

  const off = onTagsUpdate(() => {
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now; frame++; W = innerWidth; H = innerHeight;
    const hv = host.el.style.visibility === 'hidden' ? 0 : parseFloat(host.el.style.opacity || '1');
    printSvg.style.opacity = noteSvg.style.opacity = hv; if (!hv) return;
    for (const o of items) { o.o += (o.want - o.o) * Math.min(1, dt * 6); if (o.o < 0.005 && o.want === 0) { o.o = 0; } o.draw(dt); }
  });
  return { print, printPath, flow, note, dispose() { off(); printSvg.remove(); noteSvg.remove(); host.remove(); } };
}
