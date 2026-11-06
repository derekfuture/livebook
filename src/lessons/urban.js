// 高中地理 必修第二册 第二章第一节 乡村和城镇空间结构 · 城镇内部空间结构的形成（课本第 26–28 页，图 2.4 城镇的功能区、图 2.7 某城市各类土地利用付租能力随距离递减示意、思考）。
//
// 一个问题（课本思考）：为什么市中心是商场写字楼，往外是住宅，再往外是工厂？如果由各类用地的付租能力来决定土地的用途，OA、AB、BC 各会成为哪一类功能区？
// 课本的图就是模型：图 2.7 那张三条线的图，立在一座城市上——从市中心往外竖着一块透明的“地租剖面”，上面画着商业、住宅、工业三条付租能力线；
// 城里每一块地都给出价最高的那一类用：中心是高楼（商业区），往外是住宅楼，再往外是厂房（工业区），城外是农田。
// 学生亲手做的：
//   1. 拖着剖面绕市中心转：转到交通干线上，三条线都被“抬”起来，各区沿干线伸得更远；转到两条干线之间，又缩回来——同样离市中心，干线边上和离干线远的地方用途不同。
//   2. 修一条新的交通干线、建一个城市副中心：看城市的样子怎么跟着变（课本：交通可以在一定程度上改变土地利用的潜能；北京城市副中心）。
// 数据：kit/urban.js（tools/geo/urban_check.mjs 核对图 2.7 的样子）。教学示意：城市是理想化的，租金是示意的相对值；实际的城镇内部空间结构还受政策、文化、环境等因素影响。
import * as THREE from 'three';
import { seg, buttons, note } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { h } from '../ui/Panel.js';
import { airLabel, noteBadge } from './kit/labels.js';
import { USES, KEYS, RMAX, effDist, bid, winner, along } from './kit/urban.js';

const HX = 0.19, HZ = 0.15, SC = 0.17 / RMAX, G = 0.006, CELL = 0.0064;          // 地块的半宽、半深；1 个示意单位在画面上多长；地面高度；一个地块多大
const BASE_ROADS = [0, Math.PI / 2, Math.PI, -Math.PI / 2], NEW_ROAD = Math.PI / 4, SUB = [2.55, -1.15];          // 四条放射状的交通干线；可以新修的一条（东北方向）；副中心的位置（东南边，示意）
const ASK = ['先猜一下（可以不猜）：在图 2.7 里，离市中心最近的 OA 一段，最有可能成为——', ['商业区', '住宅区', '工业区']];
const rnd = (() => { let s = 41; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const toW = (x, y) => [x * SC, -y * SC], toM = (wx, wz) => [wx / SC, -wz / SC];          // 模型坐标（x 东、y 北）↔ 画面（x、z，北是 −z）
const ZONE_TINT = { shop: '#ead3e0', home: '#d9ead5', fact: '#d3e1ee', farm: '#c9d79c' };

export default {
  id: 'urban',
  fig: '图2.7',
  title: '城镇的内部空间结构',
  flow: 'explore',
  ask: '为什么市中心是商场写字楼，往外是住宅，再往外是工厂？如果由各类用地的付租能力来决定土地的用途，图 2.7 里的 OA、AB、BC 各会成为哪一类功能区？',
  need: '拖着“地租剖面”绕市中心转一圈，比一比转到交通干线上和两条干线之间有什么不同；再修一条新干线或建一个副中心',
  conclusion: {
    page: 32,
    quote: '城镇内部空间结构的形成是多种因素共同作用的结果，经济因素是影响城镇内部空间结构的主要因素……在市场竞争的环境下，一块土地用于哪一种活动，主要取决于各种活动愿意付出租金的高低。影响地租高低的因素主要有交通便捷程度和距离城镇中心远近两个方面。……城镇中心的土地利用可能性多，竞争强，因此地租高，交通可以在一定程度上改变土地利用的潜能。一般来说，穿过的道路越多，或者距交通干线越近，土地租金就越高；离城镇中心越近，土地租金也越高。',
    why: '三类活动都愿意为离市中心近的地多付钱，但在乎的程度不同：商业最需要人流、最在乎位置，付租能力在市中心最高、往外掉得最快；工业要大片便宜的地，付租能力最低、掉得最慢；住宅在中间。每块地给出价最高的那一类，于是从市中心往外依次是商业区（OA）、住宅区（AB）、工业区（BC）。交通干线让沿线的地更“近”，三条线都被抬高，各区就沿着干线往外伸；新修干线、建副中心，城市的样子也跟着变。实际上，政策、文化、环境等因素也会影响城镇内部空间结构。',
    src: '课本第 26–28 页 · 第二章 第一节 乡村和城镇空间结构',
  },

  create({ tag }) {
    const group = new THREE.Group(), block = new THREE.Group(); group.add(block);
    const S = { ang: 0.38, newRoad: false, sub: false, drag: false, saw: { on: false, off: false }, segs: {}, moved: false, guess: null };
    let W = null;
    const opt = () => ({ roads: S.newRoad ? [...BASE_ROADS, NEW_ROAD] : BASE_ROADS, sub: S.sub ? SUB : null });

    // ---- 地面：按功能区淡淡上色（像功能区图），画上干线 ----
    const groundCv = document.createElement('canvas'); groundCv.width = 1024; groundCv.height = 808;
    const groundTex = new THREE.CanvasTexture(groundCv); groundTex.colorSpace = THREE.SRGBColorSpace; groundTex.anisotropy = 8;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2, HZ * 2), new THREE.MeshLambertMaterial({ map: groundTex })); ground.rotation.x = -Math.PI / 2; ground.position.y = G; block.add(ground);
    const base = new THREE.Mesh(new THREE.BoxGeometry(HX * 2, G, HZ * 2), new THREE.MeshLambertMaterial({ color: 0x8f7a5e })); base.position.y = G / 2 - 0.0003; block.add(base);
    const paintGround = () => {
      const g = groundCv.getContext('2d'), w = groundCv.width, hh = groundCv.height, px = (wx) => ((wx + HX) / (2 * HX)) * w, pz = (wz) => ((wz + HZ) / (2 * HZ)) * hh, o = opt();
      const step = 4; for (let j = 0; j < hh; j += step) for (let i = 0; i < w; i += step) { const wx = (i / w) * 2 * HX - HX, wz = (j / hh) * 2 * HZ - HZ, [mx, my] = toM(wx, wz), r = winner(mx, my, o).k; g.fillStyle = ZONE_TINT[r ?? 'farm']; g.fillRect(i, j, step, step); }
      for (let i = 0; i < 1400; i++) { const x = Math.random() * w, y = Math.random() * hh; g.fillStyle = `rgba(80,70,50,${Math.random() * 0.06})`; g.fillRect(x, y, 3, 3); }
      g.strokeStyle = '#6b6f78'; g.lineCap = 'round';
      for (const a of o.roads) { g.lineWidth = 9; g.beginPath(); g.moveTo(px(0), pz(0)); g.lineTo(px(Math.cos(a) * 0.4), pz(-Math.sin(a) * 0.4)); g.stroke(); g.strokeStyle = '#f2efe6'; g.lineWidth = 1.2; g.setLineDash([8, 8]); g.beginPath(); g.moveTo(px(0), pz(0)); g.lineTo(px(Math.cos(a) * 0.4), pz(-Math.sin(a) * 0.4)); g.stroke(); g.setLineDash([]); g.strokeStyle = '#6b6f78'; }          // 干线：深灰的路面，中间一道虚线
      groundTex.needsUpdate = true;
    };

    // ---- 房子：商业区是高楼，住宅区是住宅楼和树，工业区是厂房和烟囱，城外是农田里的几棵树 ----
    const winTex = canvasTex(32, 64, (g, w, hh) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, hh); g.fillStyle = 'rgba(70,90,120,0.55)'; for (let y = 3; y < hh; y += 8) for (let x = 3; x < w; x += 8) g.fillRect(x, y, 5, 5); });
    const MAXN = 2200, mk = (geo, mat) => { const m = new THREE.InstancedMesh(geo, mat, MAXN); m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXN * 3), 3); m.count = 0; m.raycast = () => {}; block.add(m); return m; };
    const tower = mk(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ map: winTex }));
    const house = mk(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ map: winTex }));
    const shed = mk(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    const stack = mk(new THREE.CylinderGeometry(0.3, 0.4, 1, 8).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    const tree = mk(new THREE.SphereGeometry(0.5, 7, 5).translate(0, 0.9, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    const build = () => {
      for (const m of [tower, house, shed, stack, tree]) m.count = 0;
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color(), o = opt(), R = (() => { let v = 5; return () => ((v = (v * 16807) % 2147483647) / 2147483647); })();
      const put = (m, x, z, sx, sy, sz, hex, jit = 0.12) => { if (m.count >= MAXN) return; p.set(x, G, z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (R() - 0.5) * 0.3); s.set(sx, sy, sz); m4.compose(p, q, s); m.setMatrixAt(m.count, m4); c.setHex(hex).multiplyScalar(1 - jit + R() * jit * 2); m.setColorAt(m.count, c); m.count++; };
      for (let wz = -HZ + CELL / 2; wz < HZ; wz += CELL) for (let wx = -HX + CELL / 2; wx < HX; wx += CELL) {
        const [mx, my] = toM(wx, wz), near = Math.min(...o.roads.map((a) => { const ux = Math.cos(a), uy = Math.sin(a), t = Math.max(0, mx * ux + my * uy); return Math.hypot(mx - t * ux, my - t * uy); }));
        if (near < 0.11) continue;          // 路上不盖房
        const wn = winner(mx, my, o), jx = (R() - 0.5) * CELL * 0.3, jz = (R() - 0.5) * CELL * 0.3, x = wx + jx, z = wz + jz;
        if (wn.k === 'shop') { const hgt = 0.006 + wn.rent * 0.0038 * (0.7 + R() * 0.6), wd = CELL * (0.62 + R() * 0.18); put(tower, x, z, wd, hgt, wd * (0.8 + R() * 0.3), [0x9fb3c8, 0xb7c4d2, 0x8fa5bd, 0xc9cfd6][Math.floor(R() * 4)]); }
        else if (wn.k === 'home') { if (R() < 0.22) put(tree, x, z, 0.0045, 0.0045, 0.0045, 0x5f9a4c); else { const hgt = 0.0035 + wn.rent * 0.0016 * (0.6 + R() * 0.7), wd = CELL * (0.5 + R() * 0.2); put(house, x, z, wd, hgt, wd * 1.3, [0xf0e6d6, 0xe8d8c4, 0xf2efe8, 0xdcc9b4][Math.floor(R() * 4)]); } }
        else if (wn.k === 'fact') { if (R() < 0.45) { put(shed, x, z, CELL * 0.9, 0.003 + R() * 0.0012, CELL * (0.7 + R() * 0.25), [0x8fa8c0, 0xa9b7c4, 0x9cb0a6, 0xc0b49e][Math.floor(R() * 4)]); if (R() < 0.1) put(stack, x + CELL * 0.3, z, 0.0018, 0.014, 0.0018, 0xa8574a, 0.05); } }          // 厂房：大块、低矮、蓝灰的屋顶；几根红砖烟囱
        else if (R() < 0.05) put(tree, x, z, 0.004, 0.004, 0.004, 0x6a9a50);
      }
      for (const m of [tower, house, shed, stack, tree]) { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; }
    };
    // 副中心的标记
    const subMark = new THREE.Mesh(new THREE.RingGeometry(0.016, 0.019, 48), new THREE.MeshBasicMaterial({ color: 0xb0418c, transparent: true, opacity: 0.8, side: THREE.DoubleSide })); subMark.rotation.x = -Math.PI / 2; { const [x, z] = toW(...SUB); subMark.position.set(x, G + 0.0006, z); } block.add(subMark);
    const aSub = airLabel(block, '城市副中心', { h: 0.0085, color: '#8a2f6c', dim: 0 }); { const [x, z] = toW(...SUB); aSub.position.set(x, 0.05, z); }
    const aCenter = airLabel(block, '市中心', { h: 0.0085, color: '#2c3245' }); aCenter.position.set(0, 0.075, 0);

    // ---- 地租剖面：从市中心竖起来的一块透明板，上面画着三条付租能力线（就是图 2.7） ----
    const PL = RMAX * SC, PH = 0.1, panelCv = document.createElement('canvas'); panelCv.width = 768; panelCv.height = 320;
    const panelTex = new THREE.CanvasTexture(panelCv); panelTex.colorSpace = THREE.SRGBColorSpace; panelTex.anisotropy = 8;
    const panel = new THREE.Group(); block.add(panel);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(PL, PH).translate(PL / 2, PH / 2 + G, 0), new THREE.MeshBasicMaterial({ map: panelTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, depthTest: false })); board.renderOrder = 20; panel.add(board);
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(PL, PH).translate(PL / 2, PH / 2 + G, 0)), new THREE.LineBasicMaterial({ color: 0x3a3226, transparent: true, opacity: 0.5 })); panel.add(frame);
    const handle = new THREE.Mesh(new THREE.SphereGeometry(0.006, 16, 12), new THREE.MeshLambertMaterial({ color: 0xc8402c })); handle.position.set(PL + 0.004, G + 0.006, 0); panel.add(handle);
    const handlePick = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); handlePick.userData.pick = true; handle.add(handlePick);
    const paintPanel = () => {
      const g = panelCv.getContext('2d'), w = panelCv.width, hh = panelCv.height, o = opt(), X = (d) => (d / RMAX) * w, Y = (v) => hh - 26 - (v / 10.5) * (hh - 40);
      g.clearRect(0, 0, w, hh); g.fillStyle = 'rgba(255,253,246,0.86)'; g.fillRect(0, 0, w, hh);
      const sg = along(S.ang, o);
      for (const s of sg) { g.fillStyle = s.k ? USES[s.k].color : '#9fae6a'; g.globalAlpha = 0.85; g.fillRect(X(s.from), hh - 22, X(s.to) - X(s.from), 22); g.globalAlpha = 1; g.fillStyle = '#ffffff'; g.font = '600 18px "PingFang SC", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; if (X(s.to) - X(s.from) > 60) g.fillText(s.k ? USES[s.k].zone : '农田', (X(s.from) + X(s.to)) / 2, hh - 11); }
      for (const k of KEYS) { g.strokeStyle = USES[k].color; g.lineWidth = 7; g.beginPath(); let first = true; for (let d = 0; d <= RMAX; d += 0.02) { const e = effDist(Math.cos(S.ang) * d, Math.sin(S.ang) * d, o), v = bid(k, e); if (v < 0) break; if (first) { g.moveTo(X(d), Y(v)); first = false; } else g.lineTo(X(d), Y(v)); } g.stroke(); }
      g.font = '600 26px "PingFang SC", sans-serif'; g.textAlign = 'left'; for (const k of KEYS) { const d = k === 'shop' ? 0.25 : k === 'home' ? 1.0 : 2.2, e = effDist(Math.cos(S.ang) * d, Math.sin(S.ang) * d, o); g.fillStyle = USES[k].color; g.fillText(USES[k].name, X(d) + 8, Y(bid(k, e)) - 14); }
      g.strokeStyle = 'rgba(58,50,38,0.55)'; g.setLineDash([6, 6]); g.lineWidth = 2; g.fillStyle = '#3a3226'; g.font = 'italic 600 20px "Times New Roman", serif'; g.textAlign = 'center';
      sg.forEach((s, i) => { if (i === 0) return; const x = X(s.from); g.beginPath(); g.moveTo(x, hh - 22); g.lineTo(x, 18); g.stroke(); g.fillText('ABCDEF'[i - 1], x, 12); });
      g.setLineDash([]); g.fillText('O', 10, 12); g.font = '15px "PingFang SC", sans-serif'; g.textAlign = 'left'; g.fillStyle = '#5a5040'; g.fillText('土地租金 ↑　　距市中心距离 →', 30, 14);
      panelTex.needsUpdate = true;
    };
    const aHover = airLabel(block, '', { h: 0.0078, color: '#3a3226', dim: 0 });
    const tHint = tag('<span>拖剖面外头的红球</span><small>绕着市中心转一圈</small>', 'hint');
    noteBadge(tag, '教学示意：城市是理想化的，租金是示意的相对值；实际还受政策、文化、环境等因素影响').loc(block, -HX + 0.012, -0.002, HZ + 0.01);
    const labels = [aSub, aCenter, aHover];

    // ---- 摆好 ----
    const onRoadNow = () => Math.min(...opt().roads.map((a) => Math.abs(((S.ang - a + 3 * Math.PI) % (2 * Math.PI)) - Math.PI))) < 0.05;
    const layoutPanel = () => {
      panel.rotation.y = S.ang; paintPanel();
      const tip = [Math.cos(S.ang) * (PL + 0.004), -Math.sin(S.ang) * (PL + 0.004)]; tHint.loc(block, tip[0], 0.03, tip[1]).show(!S.moved);
      const key = onRoadNow() ? 'on' : 'off', sg = along(S.ang, opt());
      if (S.moved) { S.saw[key] = true; if (!S.newRoad && !S.sub) S.segs[key] = sg; }
      drawChart(); drawLog();
    };
    const rebuild = () => { paintGround(); build(); subMark.visible = S.sub; aSub.setOn(S.sub); layoutPanel(); };

    // ---- 侧栏：图 2.7（这个方向的三条线），和另一种方向比 ----
    const drawChart = () => {
      if (!W) return;
      const c = W.chart, g = c.getContext('2d'), w = c.width, hh = c.height, L = 34, R = w - 10, T = 14, B = hh - 40, X = (d) => L + (d / RMAX) * (R - L), Y = (v) => B - (v / 10.5) * (B - T), o = opt();
      g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, hh);
      g.strokeStyle = '#3a3226'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(L, T); g.lineTo(L, B); g.lineTo(R, B); g.stroke();
      g.font = '11px "PingFang SC", sans-serif'; g.fillStyle = '#5a5040'; g.save(); g.translate(12, (T + B) / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText('土地租金', 0, 0); g.restore(); g.textAlign = 'center'; g.fillText('距市中心距离', (L + R) / 2, B + 28);
      const curve = (ang, dash, width) => { for (const k of KEYS) { g.strokeStyle = USES[k].color; g.lineWidth = width; g.setLineDash(dash); g.beginPath(); let first = true; for (let d = 0; d <= RMAX; d += 0.02) { const v = bid(k, effDist(Math.cos(ang) * d, Math.sin(ang) * d, o)); if (v < 0) break; if (first) { g.moveTo(X(d), Y(v)); first = false; } else g.lineTo(X(d), Y(v)); } g.stroke(); } g.setLineDash([]); };
      const on = onRoadNow(), other = on ? Math.PI / 4 + (S.newRoad ? Math.PI / 4 : 0) : BASE_ROADS[0];
      if (S.saw.on && S.saw.off) curve(other, [4, 4], 1.4);          // 两种方向都看过了：另一种画成虚线比一比
      curve(S.ang, [], 2.4);
      const sg = along(S.ang, o); g.fillStyle = '#3a3226'; g.font = 'italic 12px "Times New Roman", serif';
      g.fillText('O', L, B + 13); sg.forEach((s, i) => { if (!i) return; g.strokeStyle = 'rgba(58,50,38,0.45)'; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(X(s.from), B); g.lineTo(X(s.from), T + 10); g.stroke(); g.setLineDash([]); g.fillText('ABCDEF'[i - 1], X(s.from), B + 13); });
      for (const s of sg) { g.fillStyle = s.k ? USES[s.k].color : '#9fae6a'; g.globalAlpha = 0.25; g.fillRect(X(s.from), B - 6, X(s.to) - X(s.from), 6); g.globalAlpha = 1; }
      g.font = '600 11px "PingFang SC", sans-serif'; g.textAlign = 'right'; KEYS.forEach((k, i) => { g.fillStyle = USES[k].color; g.fillText(`— ${USES[k].name}`, R, T + 6 + i * 14); });
      g.fillStyle = '#7a705e'; g.font = '11px "PingFang SC", sans-serif'; g.fillText(on ? '实线：沿交通干线' : '实线：两条干线之间', R, T + 50); if (S.saw.on && S.saw.off) g.fillText(on ? '虚线：两条干线之间' : '虚线：沿交通干线', R, T + 64);
    };
    const span = (sg, k) => { const s = sg?.find((x) => x.k === k); return s ? `${s.from.toFixed(1)}–${s.to.toFixed(1)}` : '—'; };
    const drawLog = () => {
      if (!W) return;
      const rows = [], r = (b, t) => rows.push(h('div', { class: 'tl-row' }, h('b', {}, b), h('span', {}, t)));
      if (S.saw.on || S.saw.off) r('三条线：', '都随距市中心距离增大而递减；商业在市中心付得最多、降得最快，工业最少、降得最慢');
      if (S.segs.off) r('OA、AB、BC：', `由付租能力决定用途时，OA 是商业区，AB 是住宅区，BC 是工业区（两条干线之间：商业区 ${span(S.segs.off, 'shop')}，住宅区 ${span(S.segs.off, 'home')}，工业区 ${span(S.segs.off, 'fact')}）`);
      if (S.segs.on && S.segs.off) r('沿交通干线：', `三条线都被抬高，各区都往外伸（商业区 ${span(S.segs.on, 'shop')}，住宅区 ${span(S.segs.on, 'home')}）：同样离市中心，干线边上的租金更高`);
      if (S.tried?.road) r('修了新干线：', '沿线的地租升高，商业区、住宅区顺着它往外伸——交通可以改变土地利用的潜能');
      if (S.tried?.sub) r('建了副中心：', '那里出现新的商业中心，周围的住宅区跟着变（像北京城市副中心那样，是政策带动的）');
      if (S.guess != null && S.segs.off) rows.push(h('div', { class: 'tl-row' }, h('small', {}, `你猜：${ASK[1][S.guess]}　实际：商业区`)));
      W.log.replaceChildren(...rows);
      const sg = along(S.ang, opt()); W.read.innerHTML = `剖面${onRoadNow() ? '在<b>交通干线</b>上' : '在<b>两条干线之间</b>'}：${sg.map((s) => `${s.k ? USES[s.k].zone : '农田'} ${s.from.toFixed(1)}–${s.to.toFixed(1)}`).join('，')}<br><small>距离、租金都是示意的相对值</small>`;
      if (S.segs.on && S.segs.off && (S.tried?.road || S.tried?.sub)) W.ui.unlock();
    };

    // ---- 指针：拖剖面的红球绕市中心转；鼠标停在地块上看三类活动各出多少租金 ----
    const plane = new THREE.Plane(), hit = new THREE.Vector3();
    const onGround = (ray) => { block.updateMatrixWorld(); plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), block.localToWorld(new THREE.Vector3(0, G, 0))); if (!ray.intersectPlane(plane, hit)) return null; return block.worldToLocal(hit.clone()); };
    const pointer = {
      down(rc) { if (!rc.intersectObject(handlePick, false).length) return false; S.drag = true; document.getElementById('c').style.cursor = 'grabbing'; return true; },
      move(rc) {
        const c = document.getElementById('c'), p = onGround(rc.ray);
        if (!S.drag) {
          if (c) c.style.cursor = rc.intersectObject(handlePick, false).length ? 'grab' : '';
          if (p && Math.abs(p.x) < HX && Math.abs(p.z) < HZ) { const [mx, my] = toM(p.x, p.z), o = opt(), e = effDist(mx, my, o), wn = winner(mx, my, o); aHover.setText(`商业 ${Math.max(0, bid('shop', e)).toFixed(1)} · 住宅 ${Math.max(0, bid('home', e)).toFixed(1)} · 工业 ${Math.max(0, bid('fact', e)).toFixed(1)} → ${wn.k ? USES[wn.k].zone : '农田'}`); aHover.position.set(p.x, 0.03, p.z); aHover.userData.want = 1; } else aHover.userData.want = 0;
          return false;
        }
        if (!p) return true; let a = Math.atan2(-p.z, p.x);
        for (const ra of opt().roads) if (Math.abs(((a - ra + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) < 0.06) a = ra;          // 靠近干线时吸到干线上
        S.ang = a; S.moved = true; layoutPanel(); return true;
      },
      up() { if (!S.drag) return false; S.drag = false; document.getElementById('c').style.cursor = ''; say(); return true; },
    };
    const say = () => { if (!W) return; const on = onRoadNow(); if (on && !S.saidOn) { S.saidOn = true; W.ui.status('剖面转到了<b>交通干线</b>上：三条线都被抬高，商业区、住宅区、工业区都沿着干线伸得更远。再转到两条干线中间比一比。'); } else if (!on && !S.saidOff) { S.saidOff = true; W.ui.status('在两条干线之间：从市中心往外依次是<b>商业区（OA）、住宅区（AB）、工业区（BC）</b>，C 以外谁都付不起这个租金，是农田。再转到一条交通干线上看看。'); } };
    rebuild();

    return {
      group,
      card: false,
      emerge: 'flat',          // 课本的图平放在书页上，模型从它上面长出来、它慢慢淡掉
      size: { w: 0.4, d: 0.32, h: 0.09 },
      view: { elev: 38, azim: -18, lookY: 0.3, frameMargin: 1.06 },
      pointer,
      debug: { turn: (a) => { S.ang = a; S.moved = true; layoutPanel(); say(); }, set: (k, v) => { S[k] = v; S.tried = { ...(S.tried || {}), [k === 'newRoad' ? 'road' : 'sub']: true }; rebuild(); } },
      mount(ui) {
        const acts = buttons([
          { text: '修一条新的交通干线（东北方向）', onClick: () => { S.newRoad = !S.newRoad; S.tried = { ...(S.tried || {}), road: true }; acts.btns[0].textContent = S.newRoad ? '拆掉新干线' : '修一条新的交通干线（东北方向）'; rebuild(); if (S.newRoad) ui.status('东北方向修了一条新干线：沿线的地租升高了。看看城市的样子怎么变，再把剖面转到新干线上。'); } },
          { text: '建一个城市副中心（东南边）', onClick: () => { S.sub = !S.sub; S.tried = { ...(S.tried || {}), sub: true }; acts.btns[1].textContent = S.sub ? '撤掉副中心' : '建一个城市副中心（东南边）'; rebuild(); if (S.sub) ui.status('东南边建了一个<b>城市副中心</b>（像北京把市级机关搬到通州那样）：那里冒出一片新的高楼，周围的用地也跟着变。'); } },
        ]);
        const guess = seg(...ASK, (_, i) => { S.guess = i; drawLog(); }, { value: -1 });
        const reset = buttons([{ text: '重来', ghost: true, onClick: () => { ui.relock?.(); Object.assign(S, { ang: 0.38, newRoad: false, sub: false, moved: false, guess: null, saidOn: false, saidOff: false, tried: {} }); S.saw = { on: false, off: false }; S.segs = {}; acts.btns[0].textContent = '修一条新的交通干线（东北方向）'; acts.btns[1].textContent = '建一个城市副中心（东南边）'; guess.set(-1); rebuild(); ui.status(START); } }]);
        const chart = h('canvas', { class: 'wx-map', width: 320, height: 200 }), read = h('div', { class: 'read-out' }), log = h('div', { class: 'timeline' });
        ui.controls.append(h('div', { class: 'bar-title' }, '图 2.7：这个方向的付租能力'), chart, read, acts.el, guess.el, reset.el, note('紫红是商业、绿是住宅、蓝是工业（和课本图 2.7 一样）。鼠标停在城里任意一块地上，能看到三类活动各愿意出多少租金。'));
        ui.data.append(h('div', { class: 'bar-title' }, '你看到了什么'), log);
        W = { ui, chart, read, log };
        ui.status(START);
        drawChart(); drawLog();
      },
      update(dt) { labels.forEach((l) => l.tick(dt)); },
    };
  },
};
const START = '一座理想化的城市，从市中心竖着一块“地租剖面”，上面就是课本图 2.7 的三条线。<b>拖剖面外头的红球</b>，绕着市中心转一圈。';
