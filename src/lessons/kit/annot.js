// 画面里的字，和整套活页一个手稿的样子：手写体、墨水笔的线（有一点手抖）、要紧的写在贴着胶带的纸条上。
// 要在教室投影上看清：字 18–24 像素，线 2–3 像素。四种：
//   print     —— 地名、剖面上的字：按透视写在地面、水面、剖面上（正片叠底，像直接写在模型上），远近跟着模型
//   printPath —— 顺着河道、海岸线弯着写的名字
//   flow      —— 过程：一条手画的、往前走的虚线箭头，名字顺着线写；发生时才有
//   note      —— 读数、状态、悬停的名字：物体上一个墨点，一笔引线拉到旁边写字；paper：写在纸条上（状态、提示）
// 字是网页字体（SVG），怎么缩放都清楚；每帧和 tags 用同一台相机摆位置（不晚一帧）。
import * as THREE from 'three';
import { onTagsUpdate } from '../../ui/tags.js';

const NS = 'http://www.w3.org/2000/svg';
export const HAND = '"Hannotate SC", "HanziPen SC", "Kaiti SC", "STKaiti", serif';
export const INK = '#2c3245', BLUE = '#1f4f8f', RED = '#b8321f';
const el = (n, a = {}, parent) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); parent?.appendChild(e); return e; };
const v = new THREE.Vector3(), wp = new THREE.Vector3();
let uid = 0;

/** 手画的线：每个点顺着法向抖一点（抖法固定，镜头动时不闪），再用二次曲线连起来 */
function pen(S, seed = 0, amp = 1.2) {
  const n = S.length; if (n < 2) return '';
  const Q = S.map(([x, y], k) => {
    if (k === 0 || k === n - 1) return [x, y];
    const [ax, ay] = S[k - 1], [bx, by] = S[k + 1], dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, j = amp * Math.sin(seed * 1.7 + k * 2.3);
    return [x - (dy / l) * j, y + (dx / l) * j];
  });
  let d = `M${Q[0][0].toFixed(1)} ${Q[0][1].toFixed(1)}`;
  for (let k = 1; k < n - 1; k++) d += `Q${Q[k][0].toFixed(1)} ${Q[k][1].toFixed(1)} ${((Q[k][0] + Q[k + 1][0]) / 2).toFixed(1)} ${((Q[k][1] + Q[k + 1][1]) / 2).toFixed(1)}`;
  return `${d}L${Q[n - 1][0].toFixed(1)} ${Q[n - 1][1].toFixed(1)}`;
}
/** 手画的箭头：末端两笔 */
function chevron(S, len = 13) {
  const [ax, ay] = S[S.length - 2], [bx, by] = S[S.length - 1], a = Math.atan2(by - ay, bx - ax);
  const p = (s) => `${(bx - len * Math.cos(a + s)).toFixed(1)} ${(by - len * Math.sin(a + s)).toFixed(1)}`;
  return `M${p(0.5)}L${bx.toFixed(1)} ${by.toFixed(1)}L${p(-0.45)}`;
}

export function inkLayer({ tag, camera }) {
  const host = tag('', 'ink-host');          // 借一个空牌子：模型长出来、收起来时，批注跟着别的牌子一起淡入淡出
  const mk = (cls) => { const s = el('svg', { class: `ink-layer ${cls}` }); document.body.appendChild(s); return s; };
  const printSvg = mk('print'), noteSvg = mk('note');
  const items = [], rc = new THREE.Raycaster();
  let W = innerWidth, H = innerHeight, last = performance.now(), frame = 0;
  const proj = (obj, p, out) => { v.set(p[0], p[1], p[2]); obj.localToWorld(v); out.wx = v.x; out.wy = v.y; out.wz = v.z; v.project(camera); out.x = ((v.x + 1) / 2) * W; out.y = ((1 - v.y) / 2) * H; out.z = v.z; return out; };
  const base = (o) => { o.o = 0; o.want = 1; o.seed = uid++; o.show = (on) => { o.want = on ? 1 : 0; return o; }; items.push(o); return o; };
  // occl：被山挡住的字淡掉（量左、中、右三点，每 6 帧量一次，免得半个字压在山上）
  const hidden1 = (P, occl) => { wp.set(P.wx, P.wy, P.wz); const d = camera.position.distanceTo(wp); rc.set(camera.position, wp.sub(camera.position).normalize()); const h = rc.intersectObjects(occl, false)[0]; return h && h.distance < d - 0.004; };

  /** 写在面上的字。at：位置；ax：字往右写的方向；up：字的上方（平躺在地上时是 [0,0,-1]，写在朝前的剖面上是 [0,1,0]）；h：字高（模型单位） */
  function print(obj, text, { at = [0, 0, 0], ax = [1, 0, 0], up = [0, 0, -1], h = 0.012, color = INK, opacity = 0.9, spacing = 0.12, occl = null } = {}) {
    const g = el('g', {}, printSvg), t = el('text', { 'font-size': 100, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: color, 'letter-spacing': spacing * 100, dx: spacing * 50, style: `font-family:${HAND};font-weight:700` }, g);
    t.textContent = text;
    const P0 = {}, Pa = {}, Pu = {}, o = base({ at: at.slice(), occ: false });
    o.set = (s) => { if (t.textContent !== s) t.textContent = s; return o; };
    o.move = (x, y, z) => { o.at[0] = x; o.at[1] = y; o.at[2] = z; return o; };
    o.draw = () => {
      const a = o.at; proj(obj, a, P0); proj(obj, [a[0] + ax[0] * h, a[1] + ax[1] * h, a[2] + ax[2] * h], Pa); proj(obj, [a[0] + up[0] * h, a[1] + up[1] * h, a[2] + up[2] * h], Pu);
      const m = [(Pa.x - P0.x) / 100, (Pa.y - P0.y) / 100, -(Pu.x - P0.x) / 100, -(Pu.y - P0.y) / 100];
      if (occl && frame % 6 === 0) { const L = {}, R = {}, wd = (h * t.textContent.length * (1 + spacing)) / 2; proj(obj, [a[0] - ax[0] * wd, a[1] - ax[1] * wd, a[2] - ax[2] * wd], L); proj(obj, [a[0] + ax[0] * wd, a[1] + ax[1] * wd, a[2] + ax[2] * wd], R); o.occ = hidden1(P0, occl) || hidden1(L, occl) || hidden1(R, occl); }
      const back = m[0] * m[3] - m[1] * m[2] <= 0 || P0.z > 1;          // 从背面看过去（字是反的），就不写
      g.setAttribute('transform', `matrix(${m.join(' ')} ${P0.x} ${P0.y})`); g.style.opacity = back || o.occ ? 0 : o.o * opacity;
    };
    return o;
  }

  /** 顺着一条线弯着写（河道、海岸线）。pts：模型坐标的点；h：字高（模型单位，按那里的远近换成像素） */
  function printPath(obj, text, { pts, h = 0.009, color = BLUE, opacity = 0.9, spacing = 0.2, dy = -0.65 } = {}) {
    const id = `ink${uid++}`, path = el('path', { id, fill: 'none' }, printSvg), t = el('text', { fill: color, 'text-anchor': 'middle', style: `font-family:${HAND};font-weight:700` }, printSvg), tp = el('textPath', { href: `#${id}`, startOffset: '50%' }, t);
    tp.textContent = text;
    const o = base({ pts }), P = {}, Q = {};
    o.draw = () => {
      const S = o.pts.map((p) => { proj(obj, p, P); return [P.x, P.y]; });
      if (S[S.length - 1][0] < S[0][0]) S.reverse();          // 字总是从左往右读
      const mid = o.pts[o.pts.length >> 1]; proj(obj, mid, P); proj(obj, [mid[0], mid[1] + h, mid[2]], Q); const px = Math.max(16, Math.hypot(Q.x - P.x, Q.y - P.y));
      path.setAttribute('d', `M${S.map((s) => s.join(' ')).join('L')}`); t.setAttribute('font-size', px.toFixed(1)); t.setAttribute('letter-spacing', (px * spacing).toFixed(1)); t.setAttribute('dy', (px * dy).toFixed(1)); t.style.opacity = o.o * opacity;
    };
    return o;
  }

  /** 过程：手画的、往前走的虚线箭头 + 名字。vertical：竖着的过程（蒸发、降水），名字竖着写在线旁边（side：1 右、−1 左） */
  function flow(obj, { pts, color = BLUE, label = '', vertical = false, at = 0.5, size = 20, width = 2.6, speed = 26, side = 1 } = {}) {
    const id = `ink${uid++}`, g = el('g', {}, noteSvg);
    const line = el('path', { fill: 'none', stroke: color, 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-dasharray': '10 8' }, g);
    const head = el('path', { fill: 'none', stroke: color, 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    const tpath = el('path', { id, fill: 'none' }, g);
    const t = el('text', { fill: color, 'font-size': size, 'letter-spacing': size * 0.12, 'text-anchor': 'middle', style: `font-family:${HAND};font-weight:700${vertical ? ';writing-mode:vertical-rl' : ''}` }, g);
    let tp = null;
    if (vertical) t.textContent = label; else { t.setAttribute('dy', -size * 0.6); tp = el('textPath', { href: `#${id}`, startOffset: `${at * 100}%` }, t); tp.textContent = label; }
    const o = base({ pts, off: 0 }), P = {};
    o.set = (s) => { (tp || t).textContent = s; return o; };
    o.draw = (dt) => {
      if (o.pts.length < 2) { g.style.opacity = 0; return; }
      const S = o.pts.map((p) => { proj(obj, p, P); return [P.x, P.y]; });
      line.setAttribute('d', pen(S, o.seed)); head.setAttribute('d', chevron(S)); o.off -= dt * speed; line.setAttribute('stroke-dashoffset', o.off.toFixed(1));
      if (vertical) { const k = Math.min(S.length - 1, Math.round(at * (S.length - 1))); t.setAttribute('x', S[k][0] + side * size * 0.95); t.setAttribute('y', S[k][1]); }
      else { const R = S[S.length - 1][0] < S[0][0] ? S.slice().reverse() : S; tpath.setAttribute('d', `M${R.map((s) => s.join(' ')).join('L')}`); }
      g.style.opacity = o.o;
    };
    return o;
  }

  /** 批注：物体上一个墨点，一笔引线拉到旁边（dx、dy 像素）写字。sub：小一号的说明（stack：另起一行）；paper：写在贴着胶带的纸条上（'paper' 白纸、'sticky' 黄便签） */
  function note(obj, main, { at = [0, 0, 0], dx = 40, dy = -34, color = INK, size = 20, sub = '', dot = true, stack = false, paper = null, tilt = -1.2 } = {}) {
    const g = el('g', {}, noteSvg), slip = paper ? el('g', { class: 'ink-slip' }, g) : null;
    const rect = slip && el('rect', { fill: paper === 'sticky' ? '#fdf3c4' : '#fdfaf1', rx: 1.5 }, slip), tape = slip && el('rect', { fill: 'rgba(230,215,170,.8)', width: 34, height: 11 }, slip);
    const ld = el('path', { fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-opacity': 0.85 }, g), pt = el('circle', { r: 3.6, fill: color }, g);
    const t = el('text', { fill: color, 'dominant-baseline': 'central', style: `font-family:${HAND}` }, g), t1 = el('tspan', { 'font-size': size, 'font-weight': 700 }, t), t2 = el('tspan', { 'font-size': size * 0.8, 'font-weight': 400, dx: size * 0.4, 'fill-opacity': 0.85 }, t);
    if (stack) { t2.setAttribute('dx', 0); t2.setAttribute('dy', size * 1.3); }
    const o = base({ at: at.slice(), dx, dy, box: null }), P = {};
    o.set = (m, s = sub) => { if (t1.textContent !== m || t2.textContent !== s) { t1.textContent = m; t2.textContent = s; o.box = null; } return o; };
    o.move = (x, y, z) => { o.at[0] = x; o.at[1] = y; o.at[2] = z; return o; };
    o.set(main, sub); pt.style.display = dot ? '' : 'none';
    o.draw = () => {
      proj(obj, o.at, P); if (P.z > 1 || o.o < 0.01) { g.style.opacity = 0; return; }
      const ex = P.x + o.dx, ey = P.y + o.dy, side = Math.abs(o.dx) > 4 ? Math.sign(o.dx) : 0, tx = ex + side * 8;
      t.setAttribute('x', tx); t.setAttribute('y', side ? ey : ey - size * 0.75); if (stack) t2.setAttribute('x', tx); t.setAttribute('text-anchor', side > 0 ? 'start' : side < 0 ? 'end' : 'middle');
      const cx = P.x + o.dx * 0.15, cy = ey + (P.y - ey) * 0.1;          // 一笔带一点弧
      ld.setAttribute('d', `M${P.x.toFixed(1)} ${P.y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${(side ? ey : ey - 2).toFixed(1)}`); pt.setAttribute('cx', P.x); pt.setAttribute('cy', P.y);
      const L = Math.hypot(o.dx, o.dy) * 1.05; ld.setAttribute('stroke-dasharray', L.toFixed(1)); ld.setAttribute('stroke-dashoffset', (L * (1 - Math.min(1, o.o / 0.6))).toFixed(1));          // 引线先画出来，字再淡入
      const to = Math.max(0, (o.o - 0.4) / 0.6); t.style.opacity = to;
      if (slip) {
        if (!o.box) { const b = t.getBBox(); if (b.width) o.box = { x: b.x - tx, y: b.y - (side ? ey : ey - size * 0.75), w: b.width, h: b.height }; }
        if (o.box) { const bx = tx + o.box.x - 12, by = (side ? ey : ey - size * 0.75) + o.box.y - 9, bw = o.box.w + 24, bh = o.box.h + 16; rect.setAttribute('x', bx); rect.setAttribute('y', by); rect.setAttribute('width', bw); rect.setAttribute('height', bh); tape.setAttribute('x', bx + bw / 2 - 17); tape.setAttribute('y', by - 6); slip.setAttribute('transform', `rotate(${tilt} ${bx + bw / 2} ${by + bh / 2})`); t.setAttribute('transform', `rotate(${tilt} ${bx + bw / 2} ${by + bh / 2})`); }
        slip.style.opacity = to;
      }
      g.style.opacity = 1;
    };
    return o;
  }

  const off = onTagsUpdate(() => {
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now; frame++; W = innerWidth; H = innerHeight;
    const hv = host.el.style.visibility === 'hidden' ? 0 : parseFloat(host.el.style.opacity || '1');
    printSvg.style.opacity = noteSvg.style.opacity = hv; if (!hv) return;
    for (const o of items) { o.o += (o.want - o.o) * Math.min(1, dt * 6); if (o.o < 0.005 && o.want === 0) o.o = 0; o.draw(dt); }
  });
  return { print, printPath, flow, note, dispose() { off(); printSvg.remove(); noteSvg.remove(); host.remove(); } };
}
