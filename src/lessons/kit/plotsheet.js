// 七上“绘制和阅读”活动的坐标纸（气温曲线图 4.11、降水量柱状图 4.20）：书桌上立着一块硬纸板（像画架往后仰），贴着一张坐标纸——
// 横坐标 12 个月、纵坐标按课本定好的取值范围和刻度画好（课本绘图步骤 1、2）。
// 学生照着纸板最上面贴着的表格，一个月一个月地把点（气温）或柱子顶（降水）拖到对应的高度（步骤 3）；
// 松手时离表格的数不到 snap，就落在表格的数上、变成红点（蓝柱）；不准就留着灰色，再对照表格拖一拖。
// 曲线（步骤 4）：12 个点都标好以后，用平滑的曲线一段一段画出来（单调的三次插值：曲线在两个点之间只升或只降，最高、最低就落在那两个点上，不会冲过头）。
// 画好以后又去拖某个点：拖着的时候曲线先收起来；放回表上的数，曲线回来；放错了，由活页把“画好了”撤回（onGrab、onPlace）。
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { canvasTex } from './props.js';
import { draggable } from './interact.js';
import { paint, inked } from '../../live/ink.js';

const D2R = Math.PI / 180;
const MONTHS = 12;

/**
 * plotSheet(group, opts) → { board, drag, markers, vals, ok, x(m), y(v), set(m, v), place(m), drawCurve(k), showSpan(on), tableHi(m), allOk() }
 * opts：kind 'line' | 'bar'；values（12 个，表格上的数）；yMin、yMax、yStep（纵坐标）；yTitle（如“气温/℃”）；unit（读数用）；snap（插对的范围）；
 *       tableTitle、rowTitle（表格的标题、那一行的名字）；fmt（数怎么写）；onGrab(m)（抓起时）；onPlace(m, ok, v)（松手时）；tag（ctx.tag）；taps（桌上别的能点的东西，如铅笔）
 */
export function plotSheet(group, { kind = 'line', values, yMin, yMax, yStep, yTitle, unit, snap, tableTitle, rowTitle, fmt = (v) => String(v), onGrab, onPlace, tag, taps = [] }) {
  const W = 0.26, H = 0.235, TILT = 66 * D2R, T = 0.004;          // 纸板宽、高、和桌面的夹角、厚
  const PX0 = 0.036, PX1 = W - 0.014, PY0 = 0.024, PY1 = H - 0.078;          // 坐标区在纸板上的位置（从纸板左下角量）；最上面一条贴着表格
  const board = new THREE.Group(); board.position.set(-W / 2, 0.0065, -0.03); board.rotation.x = -(Math.PI / 2 - TILT); group.add(board);          // 纸板的下沿抬起一点：往后仰时背面的下角不钻进桌面
  const x = (m) => PX0 + ((m - 0.5) / MONTHS) * (PX1 - PX0);          // 第 m 月（1—12）在纸上的横坐标
  const y = (v) => PY0 + ((v - yMin) / (yMax - yMin)) * (PY1 - PY0);
  const vOf = (py) => yMin + ((py - PY0) / (PY1 - PY0)) * (yMax - yMin);

  // 纸板、后面的撑脚
  const card = inked(new THREE.Mesh(new THREE.BoxGeometry(W + 0.008, H + 0.006, T), paint(0xc9b48e)), { width: 0.6 }); card.position.set(W / 2, H / 2 + 0.001, -T / 2 - 0.0005); board.add(card);
  // 撑脚：从纸板背面上部斜着撑到桌面（两根细木条）
  board.updateMatrixWorld(true); group.updateMatrixWorld(true);
  for (const sx of [0.22, 0.78]) {
    const top = group.worldToLocal(board.localToWorld(new THREE.Vector3(W * sx, H * 0.78, -T - 0.0015))), foot = new THREE.Vector3(top.x, 0.0015, top.z - 0.075);
    const len = top.distanceTo(foot), mid = top.clone().add(foot).multiplyScalar(0.5);
    const leg = inked(new THREE.Mesh(new THREE.BoxGeometry(0.008, len, 0.003), paint(0xb39c74)), { width: 0.5 });
    leg.position.copy(mid); leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(foot).normalize()); group.add(leg);
  }
  // 坐标纸：网格（每一格一条细线）、坐标轴、刻度数字、月份
  const PXW = 2048, PXH = Math.round((2048 * H) / W);
  const tex = canvasTex(PXW, PXH, (g, Wc, Hc) => {
    const sx = Wc / W, sy = Hc / H, X = (u) => u * sx, Y = (v) => Hc - v * sy;
    g.fillStyle = '#fdfcf7'; g.fillRect(0, 0, Wc, Hc);
    // 细网格：横线按刻度、竖线按月份（再细一档：每格再分两半，淡一点）
    g.lineWidth = 1.2;
    for (let v = yMin; v <= yMax + 1e-6; v += yStep / 5) { g.strokeStyle = Math.abs(((v - yMin) / yStep) % 1) < 1e-6 || Math.abs(((v - yMin) / yStep) % 1 - 1) < 1e-6 ? 'rgba(70,120,170,0.55)' : 'rgba(70,120,170,0.16)'; g.beginPath(); g.moveTo(X(PX0), Y(y(v))); g.lineTo(X(PX1), Y(y(v))); g.stroke(); }
    for (let m = 0; m <= MONTHS; m++) { const u = PX0 + (m / MONTHS) * (PX1 - PX0); g.strokeStyle = 'rgba(70,120,170,0.3)'; g.beginPath(); g.moveTo(X(u), Y(PY0)); g.lineTo(X(u), Y(PY1)); g.stroke(); }
    // 坐标轴（横轴放在 0 那条线上：气温有零下，柱子从 0 往上长）
    g.strokeStyle = '#26304a'; g.lineWidth = 3.4;
    const y0 = y(Math.max(yMin, Math.min(yMax, 0)));
    g.beginPath(); g.moveTo(X(PX0), Y(PY0) + 4); g.lineTo(X(PX0), Y(PY1) - 18); g.stroke();
    g.beginPath(); g.moveTo(X(PX0) - 6, Y(PY1) - 30); g.lineTo(X(PX0), Y(PY1) - 44); g.lineTo(X(PX0) + 6, Y(PY1) - 30); g.stroke();
    g.beginPath(); g.moveTo(X(PX0), Y(y0)); g.lineTo(X(PX1) + 10, Y(y0)); g.stroke();
    g.fillStyle = '#26304a'; g.font = '600 30px "Times New Roman", serif'; g.textAlign = 'right'; g.textBaseline = 'middle';
    for (let v = yMin; v <= yMax + 1e-6; v += yStep) g.fillText(String(Math.round(v)).replace('-', '–'), X(PX0) - 10, Y(y(v)));
    g.textAlign = 'center'; g.textBaseline = 'top';
    for (let m = 1; m <= MONTHS; m++) g.fillText(String(m), X(x(m)), Y(PY0) + 8);
    g.font = '600 28px "Songti SC", serif'; g.textAlign = 'left'; g.textBaseline = 'bottom';
    g.fillText(yTitle, X(PX0) - 60, Y(PY1) - 46);
    g.textAlign = 'right'; g.textBaseline = 'top'; g.fillText('月份', X(PX1) + 8, Y(PY0) + 40);
  });
  tex.anisotropy = 8;
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshLambertMaterial({ map: tex })); paper.position.set(W / 2, H / 2, 0.0002); paper.raycast = () => {}; board.add(paper);

  // 点（气温）、柱子（降水）：每个月一个，拖着上下走
  const vals = values.map(() => null), ok = values.map(() => false), markers = [];
  const SURF = 0.0012;          // 离纸面一点点
  const mat = { dot: new THREE.MeshBasicMaterial({ color: 0x8a8f99 }), dotOk: new THREE.MeshBasicMaterial({ color: 0xd8342a }), bar: new THREE.MeshLambertMaterial({ color: 0xb8c3d4 }), barOk: new THREE.MeshLambertMaterial({ color: 0x3f7fc8 }) };
  const colW = ((PX1 - PX0) / MONTHS) * 0.62;
  for (let m = 1; m <= MONTHS; m++) {
    const g = new THREE.Group(); g.position.set(x(m), 0, SURF); board.add(g);
    let vis, cap = null;
    if (kind === 'line') {
      vis = new THREE.Mesh(new THREE.SphereGeometry(0.0026, 16, 12), mat.dot); g.add(vis);
    } else {
      vis = new THREE.Mesh(new THREE.BoxGeometry(colW, 1, 0.0016), mat.bar); vis.geometry.translate(0, 0.5, 0); g.add(vis);
      cap = new THREE.Mesh(new THREE.BoxGeometry(colW * 1.18, 0.0022, 0.0028), paint(0x26304a, { keep: true })); g.add(cap);          // 柱子顶上一道深色的边：拖它
    }
    const pick = new THREE.Mesh(new THREE.SphereGeometry(kind === 'line' ? 0.0062 : 0.0068, 10, 8), new THREE.MeshBasicMaterial({ visible: false })); pick.userData.pick = true; pick.userData.track = true; g.add(pick);
    markers.push({ m, g, vis, cap, pick });
  }
  const startV = kind === 'line' ? yMin + (yMax - yMin) * 0.5 : 0;          // 还没拖的时候：点放在中间那条线上，柱子是 0
  const show = (i) => {
    const mk = markers[i], v = vals[i] ?? startV, py = y(v);
    if (kind === 'line') { mk.vis.position.y = py; mk.pick.position.y = py; mk.vis.material = ok[i] ? mat.dotOk : mat.dot; }
    else { const h0 = y(0); mk.vis.position.y = h0; mk.vis.scale.y = Math.max(0.0004, py - h0); mk.cap.position.y = py; mk.pick.position.y = py; mk.vis.material = ok[i] ? mat.barOk : mat.bar; }
  };
  markers.forEach((_, i) => show(i));

  // 读数：拖着的那一个旁边写出几月、多少
  const readout = tag ? tag('', 'pill') : null;
  const readAt = (i) => { if (!readout) return; const v = vals[i] ?? startV; readout.text(`${i + 1} 月　${fmt(v)} ${unit}`).loc(board, x(i + 1) + 0.016, y(v) + 0.006, 0.004); };
  const hideRead = () => readout?.loc(board, 0, -9, 0);

  // 表格：贴在纸板最上面（课本的表 4.1 / 4.2），拖哪个月就高亮哪一格
  let hiM = 0;
  const tableTex = canvasTex(2048, 300, () => {});          // 画在它自己的那张画布上（tableTex.image），换高亮时重画
  const drawTable = () => {
    const c = tableTex.image, g = c.getContext('2d'), Wc = c.width, Hc = c.height;
    g.clearRect(0, 0, Wc, Hc); g.fillStyle = '#fdfcf7'; g.fillRect(0, 0, Wc, Hc);
    g.fillStyle = '#26304a'; g.font = '600 40px "Songti SC", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tableTitle, Wc / 2, 42);
    const c0 = 300, cw = (Wc - c0 - 30) / MONTHS, r1 = 96, r2 = 186, r3 = 276;
    if (hiM) { g.fillStyle = 'rgba(232,137,12,0.22)'; g.fillRect(c0 + (hiM - 1) * cw, r1, cw, r3 - r1); }
    g.strokeStyle = '#26304a'; g.lineWidth = 3; g.beginPath(); g.moveTo(30, r1); g.lineTo(Wc - 30, r1); g.moveTo(30, r3); g.lineTo(Wc - 30, r3); g.stroke();
    g.lineWidth = 1.5; g.beginPath(); g.moveTo(30, r2); g.lineTo(Wc - 30, r2); g.moveTo(c0, r1); g.lineTo(c0, r3); g.stroke();
    g.font = '600 38px "Songti SC", serif'; g.fillText('月份', c0 / 2 + 15, (r1 + r2) / 2); g.fillText(rowTitle, c0 / 2 + 15, (r2 + r3) / 2);
    g.font = '600 42px "Times New Roman", serif';
    for (let m = 1; m <= MONTHS; m++) { const cx = c0 + (m - 0.5) * cw; g.fillStyle = '#26304a'; g.fillText(String(m), cx, (r1 + r2) / 2); g.fillStyle = ok[m - 1] ? '#c8342a' : '#26304a'; g.fillText(fmt(values[m - 1]).replace('-', '–'), cx, (r2 + r3) / 2); }
    tableTex.needsUpdate = true;
  };
  drawTable();
  const table = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.02, (W - 0.02) * 300 / 2048), new THREE.MeshLambertMaterial({ map: tableTex }));
  table.position.set(W / 2, H - 0.026, 0.0004); table.raycast = () => {}; board.add(table);          // 表格贴在纸板最上面（和课本一样，表在图的上面），一抬眼就对得上
  const tableHi = (m) => { if (m !== hiM) { hiM = m; drawTable(); } };

  // 拖：纸面上的平面（板子自己的坐标 z = 0），只用纵坐标
  const items = markers.map((mk, i) => ({
    obj: mk.pick, plane: 'xy', offset: SURF,
    hint: () => `${i + 1} 月：拖到 ${fmt(values[i])} ${unit}`,
    onStart: () => { tableHi(i + 1); readAt(i); onGrab?.(i + 1); },
    onDrag: (p) => { const v = Math.max(yMin, Math.min(yMax, vOf(p.y))); vals[i] = v; ok[i] = false; show(i); readAt(i); },
    onEnd: () => {
      const v = vals[i] ?? startV, good = Math.abs(v - values[i]) <= snap;
      if (good) { vals[i] = values[i]; ok[i] = true; } else ok[i] = false;
      show(i); hideRead(); drawTable(); onPlace?.(i + 1, good, v);
    },
  }));
  const drag = draggable(board, items, { taps, tip: tag ? tag('', 'pill') : undefined });

  // 曲线：12 个点用平滑的曲线连起来，k 从 0 到 1 一段一段画出来。单调三次插值（Fritsch–Carlson）：每一段只升或只降，最高、最低正好是 7 月、1 月那两个点
  const n = values.length, d = [], m = [];
  for (let i = 0; i < n - 1; i++) d.push(values[i + 1] - values[i]);          // 相邻两个月差多少（横坐标每月一格）
  for (let i = 0; i < n; i++) m.push(i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] > 0 ? (d[i - 1] + d[i]) / 2 : 0);          // 在最高、最低点（前后升降相反）斜率取 0
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], r = a * a + b * b;
    if (r > 9) { const t = 3 / Math.sqrt(r); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  /** 曲线在第 u 月（1—12，可以是小数）的数值 */
  const curveV = (u) => {
    const i = Math.max(0, Math.min(n - 2, Math.floor(u - 1))), t = Math.max(0, Math.min(1, u - 1 - i)), t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * values[i] + (t3 - 2 * t2 + t) * m[i] + (-2 * t3 + 3 * t2) * values[i + 1] + (t3 - t2) * m[i + 1];
  };
  let curve = null;
  const drawCurve = (k) => {
    if (!curve) {
      const SEG = 20, N = SEG * (n - 1), P = [];
      for (let j = 0; j <= N; j++) { const u = 1 + j / SEG; P.push(x(u), y(curveV(u)), SURF + 0.0004); }
      const geo = new LineGeometry(); geo.setPositions(P);
      curve = new Line2(geo, new LineMaterial({ color: 0xd8342a, linewidth: 2.6, worldUnits: false })); curve.raycast = () => {}; board.add(curve);
      curve.userData.n = N;
    }
    curve.geometry.instanceCount = Math.max(1, Math.round(curve.userData.n * Math.max(0, Math.min(1, k))));
    curve.visible = k > 0;
  };
  // 最高、最低两条虚线和中间的差（年较差）
  const span = new THREE.Group(); span.visible = false; board.add(span);
  const dashM = paint(0x26304a, { keep: true });
  const iMax = values.indexOf(Math.max(...values)), iMin = values.indexOf(Math.min(...values));
  for (const v of [values[iMax], values[iMin]]) for (let u = PX0; u < PX1 - 0.002; u += 0.006) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.0034, 0.0005, 0.0006), dashM); d.position.set(u + 0.0017, y(v), SURF + 0.0003); d.raycast = () => {}; span.add(d); }
  { const ax = PX1 - 0.006, a = y(values[iMin]), b = y(values[iMax]); const bar = new THREE.Mesh(new THREE.BoxGeometry(0.0009, b - a, 0.0008), new THREE.MeshBasicMaterial({ color: 0xd8342a })); bar.position.set(ax, (a + b) / 2, SURF + 0.0005); span.add(bar);
    for (const yy of [a, b]) { const tri = new THREE.Mesh(new THREE.ConeGeometry(0.0022, 0.004, 10), new THREE.MeshBasicMaterial({ color: 0xd8342a })); tri.position.set(ax, yy + (yy === a ? 0.002 : -0.002), SURF + 0.0005); tri.rotation.z = yy === a ? Math.PI : 0; span.add(tri); } }
  const spanTag = tag ? tag('', 'pill') : null;
  const showSpan = (on, text = '') => { span.visible = on; if (spanTag) { if (on) spanTag.text(text).loc(board, PX1 - 0.03, (y(values[iMin]) + y(values[iMax])) / 2, 0.004); else spanTag.loc(board, 0, -9, 0); } };

  return {
    board, drag, markers, vals, ok, x, y, iMax, iMin,
    allOk: () => ok.every(Boolean),
    /** 演示、质检拖到第 m 月、数值 v 的位置（纸板自己的坐标，和学生拖的时候 onDrag 收到的一样） */
    pointOf: (m, v) => new THREE.Vector3(x(m), y(v), SURF),
    drawCurve, showSpan, tableHi, curveV,
    reset() { values.forEach((_, i) => { vals[i] = null; ok[i] = false; show(i); }); drawCurve(0); showSpan(false); drawTable(); },
    /** 老师演示前存下学生标的点，演示完放回去 */
    snapshot: () => ({ vals: [...vals], ok: [...ok] }),
    restore(sn) { sn.vals.forEach((v, i) => { vals[i] = v; ok[i] = sn.ok[i]; show(i); }); drawTable(); },
    dispose() { readout?.remove(); spanTag?.remove(); },
  };
}
