// 高中地理 选择性必修1 第三章第二节 气压带和风带 · 海陆分布对气压带和风带的影响、季风（课本第 50–53 页，图 3.14 东亚季风示意、图 3.15 大陆空气柱、活动“理解海陆差异对气压带的影响”）。
//
// 一个问题：为什么我国东部冬天刮干冷的西北风，夏天刮暖湿的东南风？风为什么一年里会倒过来？
// 课本的图就是模型：图 3.15 那样一块理想化的北半球（赤道到北纬 60°，西边一块大陆、东边一片大洋），大陆和大洋上各立一根空气柱。
// 学生亲手做的：
//   1. 拨书页旁边的月份盘：冬季陆地比海洋冷，大陆上的空气柱收缩下沉，形成冷高压；夏季陆地比海洋热，空气受热上升，形成热低压。
//      地面上的等压线、高低压中心、一支支风箭头跟着变；东岸那座城市冬季吹西北风（干冷）、夏季吹东南风（暖湿、下雨）。侧栏把每个月的风向排成一年。
//   2. 假如这一片全是海洋：气压带呈带状分布，只随季节南北挪一点，东岸那里的风不会冬夏倒过来。
// 数据：kit/monsoon.js（tools/geo/monsoon_check.mjs 核对课本说法）。教学示意：大陆和大洋是理想化的，不是真实地图；气压、风速是示意。
import * as THREE from 'three';
import { seg, buttons, note } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { h } from '../ui/Panel.js';
import { airLabel, groundLabel, noteBadge } from './kit/labels.js';
import { COAST, LATMAX, CITY, isLand, landT, seaT, pressure, wind, windName, windFrom, cityWeather } from './kit/monsoon.js';

const XL = -0.17, XR = 0.17, ZS = 0.1, ZN = -0.1, G = 0.018;          // 地图左右、南（赤道，靠镜头）北（北纬 60°，往后）、地面高度
const X = (u) => XL + (XR - XL) * u, Z = (lat) => ZS + (ZN - ZS) * (lat / LATMAX), U = (x) => (x - XL) / (XR - XL), LAT = (z) => ((z - ZS) / (ZN - ZS)) * LATMAX;
const ASK = ['先猜一下（可以不猜）：冬季，大陆上会形成高压还是低压？', ['高压', '低压', '和海洋上一样']];
const rnd = (() => { let s = 29; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const MON = ['', '1 月', '2 月', '3 月', '4 月', '5 月', '6 月', '7 月', '8 月', '9 月', '10 月', '11 月', '12 月'];

export default {
  id: 'monsoon',
  fig: '图3.15',
  title: '海陆分布和季风',
  flow: 'explore',
  ask: '我国东部冬天刮干冷的西北风，夏天刮暖湿的东南风。风为什么一年里会倒过来？',
  need: '拨月份盘，把冬季（1 月前后）、夏季（7 月前后）都看一遍，看大陆上的空气柱、高低压和东岸城市的风；再试试“假如全是海洋”',
  conclusion: {
    page: 56,
    quote: '海陆的热力差异影响海陆的气压分布。冬季，陆地降温比海洋快，陆地气温较低，出现冷高压。夏季，陆地增温比海洋快，陆地气温较高，出现热低压。……使纬向分布的气压带被分裂为一个个高、低气压中心。……海陆上气压中心的季节变化，引起一年中盛行风向随季节有规律地变换，形成季风。亚洲东部季风环流最为典型。冬季，强大的亚洲高压与北太平洋副极地低压和赤道低压之间，形成势力强大、干燥寒冷、范围很广的冬季风。夏季，北太平洋副热带高压势力大大增强，亚洲大陆上形成印度低压，太平洋暖湿气流就沿着北太平洋副热带高压的西部边缘，以东南风吹到亚洲东南岸，即东亚的东南季风。',
    why: '陆地比海洋升温快、降温也快。冬季大陆冷，空气收缩下沉，近地面形成冷高压；夏季大陆热，空气受热上升，近地面形成热低压。大洋上，原来的气压带被保留、加强：冬季是副极地低压，夏季是副热带高压（它们本来就是三圈环流形成的，不是海洋自己的热力环流）。于是冬季风从冷的大陆吹向海洋，干燥寒冷；夏季风从海洋吹向热的大陆，暖湿多雨。风从高压吹向低压，在北半球向右偏，所以东岸冬季是西北风、夏季是东南风。假如没有大陆，气压带只是一圈圈带状分布、随季节南北挪一点，就不会有冬夏倒过来的季风。（课本还讲了另一个原因：气压带、风带的季节移动，比如南亚的西南季风，本活页没有画。）',
    src: '课本第 50–53 页 · 第三章 第二节 气压带和风带',
  },

  create({ tag }) {
    const group = new THREE.Group(), block = new THREE.Group(); group.add(block);
    const S = { m: 1, land: true, drag: false, seen: { land: {}, sea: {} }, moved: false, guess: null };
    let W = null;
    const mi = () => ((Math.round(S.m) - 1 + 12) % 12) + 1;

    // ---- 地图：一块切开的地块，西边大陆、东边大洋 ----
    const NX = 144, NZ = 96, geo = new THREE.PlaneGeometry(XR - XL, ZS - ZN, NX, NZ); geo.rotateX(-Math.PI / 2);
    const col = new Float32Array(geo.attributes.position.count * 3); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const grain = canvasTex(256, 256, (g, w) => { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, w); for (let i = 0; i < 2400; i++) { const v = 150 + Math.random() * 100; g.fillStyle = `rgba(${v},${v},${v},${0.2 + Math.random() * 0.3})`; g.fillRect(Math.random() * w, Math.random() * w, 1.6, 1.6); } }, { repeat: [4, 3] });
    const surf = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: grain, roughness: 0.7, side: THREE.DoubleSide })); block.add(surf);
    const sectionTex = canvasTex(256, 256, (g, w) => {
      g.fillStyle = '#c2b499'; g.fillRect(0, 0, w, w);
      for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(65,60,50,${0.025 + (i % 7) * 0.013})`; g.fillRect((i * 67.7) % w, (i * 31.9) % w, 2, 1); }
      for (let k = 0; k < 16; k++) { g.strokeStyle = 'rgba(80,70,55,0.08)'; g.beginPath(); for (let x = 0; x <= w; x += 4) g.lineTo(x, k * 17 + Math.sin(x / 45 + k) * 2); g.stroke(); }
    });
    const walls = new THREE.Mesh(new THREE.BufferGeometry(), [new THREE.MeshStandardMaterial({ vertexColors: true, map: sectionTex, roughness: 0.85, side: THREE.DoubleSide }), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, side: THREE.DoubleSide })]); block.add(walls);
    const bottom = new THREE.Mesh(new THREE.PlaneGeometry(XR - XL, ZS - ZN), new THREE.MeshStandardMaterial({ color: 0x477da5, side: THREE.DoubleSide })); bottom.rotation.x = -Math.PI / 2; bottom.position.y = 0.0001; block.add(bottom);
    // 海岸沿用原模型；青藏高原附近抬高，起伏在两个水平方向连续变化。
    const terrainY = (x, z) => {
      const u = U(x), lat = LAT(z);
      if (!isLand(u, lat, S.land)) return G + 0.00022 * Math.sin(x * 510 + z * 190) * Math.sin(z * 650);
      const edge = Math.min(1, Math.max(0, (COAST + 0.025 * Math.sin(lat / 7) - u) / 0.07), Math.max(0, (lat - 8) / 5));
      const plateau = Math.exp(-(((u - 0.26) / 0.18) ** 4) - ((lat - 32) / 11) ** 4);
      return G + 0.0035 + edge * (0.022 * plateau + 0.0028 * (0.5 + 0.5 * Math.sin(u * 47 + lat * 0.17)) * (0.65 + 0.35 * Math.cos(lat * 0.8 - u * 28)));
    };
    // 图示悬在地形上方，箭头整个足迹内取最高点，避免尖端插进坡面。
    const symbolY = (x, z) => { let y = G; for (const dx of [-0.009, 0, 0.009]) for (const dz of [-0.009, 0, 0.009]) y = Math.max(y, terrainY(x + dx, z + dz)); return y; };
    const buildWalls = () => {
      const P = [], C = [], UV = [], groups = [], c = new THREE.Color();
      const edge = (ax, az, bx, bz, n) => { for (let i = 0; i < n; i++) {
        const t = i / n, v = (i + 1) / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t, xx = ax + (bx - ax) * v, zz = az + (bz - az) * v, y = terrainY(x, z), yy = terrainY(xx, zz), land = isLand(U((x + xx) / 2), LAT((z + zz) / 2), S.land);
        groups.push([P.length / 3, 6, land ? 0 : 1]);
        P.push(x, 0, z, xx, 0, zz, x, y, z, xx, 0, zz, xx, yy, zz, x, y, z); UV.push(t, 0, v, 0, t, 1, v, 0, v, 1, t, 1);
        for (const f of [0.65, 0.65, 1, 0.65, 1, 1]) { c.setHex(land ? 0xb4a488 : 0x619bc3).multiplyScalar(f); C.push(c.r, c.g, c.b); }
      } };
      edge(XL, ZN, XR, ZN, NX); edge(XR, ZN, XR, ZS, NZ); edge(XR, ZS, XL, ZS, NX); edge(XL, ZS, XL, ZN, NZ);
      walls.geometry.dispose(); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.computeVertexNormals(); for (const args of groups) g.addGroup(...args); walls.geometry = g;
    };
    const latLines = [];
    const LANDC = new THREE.Color(0xd9c79a), LANDS = new THREE.Color(0xa9c27a), SEA = new THREE.Color(0x6fa8d4), DEEP = new THREE.Color(0x4f88bf), tc = new THREE.Color();
    const shapeMap = () => {
      const p = geo.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const x = p.getX(k), z = p.getZ(k), u = U(x), lat = LAT(z), l = isLand(u, lat, S.land);
        p.setY(k, terrainY(x, z));
        if (l) tc.copy(LANDS).lerp(LANDC, Math.min(1, Math.max(0, (lat - 25) / 30) + 0.25 * Math.sin(u * 9))); else tc.copy(SEA).lerp(DEEP, Math.min(1, Math.abs(u - COAST) * 3));
        col.set([tc.r, tc.g, tc.b], k * 3);
      }
      p.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere(); buildWalls();
      for (const [line, lat] of latLines) { const points = []; for (let i = 0; i <= NX; i++) { const x = X(i / NX); points.push(new THREE.Vector3(x, symbolY(x, Z(lat)) + 0.001, Z(lat))); } line.geometry.dispose(); line.geometry = new THREE.BufferGeometry().setFromPoints(points); line.computeLineDistances(); }
    };
    // 纬线：赤道、北回归线、30°、60°
    const latM = new THREE.LineDashedMaterial({ color: 0x5a6a80, dashSize: 0.003, gapSize: 0.003, transparent: true, opacity: 0.55 });
    for (const [lat, name] of [[0, '赤道'], [23.44, '北回归线'], [30, '30°N'], [60, '60°N']]) { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(XL, G + 0.0046, Z(lat)), new THREE.Vector3(XR, G + 0.0046, Z(lat))]), latM); l.computeLineDistances(); block.add(l); latLines.push([l, lat]); groundLabel(block, name, { x: XR - 0.018, y: G + 0.0006, z: Z(lat) - 0.004, h: 0.0055, color: '#2c3a52', opacity: 0.75 }); }
    const gLand = groundLabel(block, '大　陆', { x: X(0.3), y: G + 0.032, z: Z(22), h: 0.013, color: '#5a4a2c', opacity: 0.6 });
    const gSea = groundLabel(block, '大　洋', { x: X(0.82), y: G + 0.0008, z: Z(22), h: 0.013, color: '#173a63', opacity: 0.6 });

    // ---- 等压线（地面上的细线）和高、低压中心 ----
    const isoM = new THREE.LineBasicMaterial({ color: 0x2c3a52, transparent: true, opacity: 0.55 });
    const iso = new THREE.LineSegments(new THREE.BufferGeometry(), isoM); iso.raycast = () => {}; block.add(iso);
    const GX = 64, GZ = 44, field = new Float32Array((GX + 1) * (GZ + 1));
    const buildIso = () => {
      for (let j = 0; j <= GZ; j++) for (let i = 0; i <= GX; i++) field[j * (GX + 1) + i] = pressure(i / GX, (j / GZ) * LATMAX, S.m, S.land);
      const P = [], at = (i, j) => field[j * (GX + 1) + i], pt = (i, j) => [X(i / GX), Z((j / GZ) * LATMAX)];
      for (let lev = -6; lev <= 6; lev += 0.6) for (let j = 0; j < GZ; j++) for (let i = 0; i < GX; i++) {          // 等压线：在每个小格里找穿过这个气压值的线段
        const v = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)], c = [pt(i, j), pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1)], cut = [];
        for (let e = 0; e < 4; e++) { const a = v[e], b = v[(e + 1) % 4]; if ((a - lev) * (b - lev) < 0) { const t = (lev - a) / (b - a), A = c[e], B = c[(e + 1) % 4]; cut.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); } }
        if (cut.length >= 2) P.push(cut[0][0], symbolY(cut[0][0], cut[0][1]) + 0.002, cut[0][1], cut[1][0], symbolY(cut[1][0], cut[1][1]) + 0.002, cut[1][1]);
        if (cut.length === 4) P.push(cut[2][0], symbolY(cut[2][0], cut[2][1]) + 0.002, cut[2][1], cut[3][0], symbolY(cut[3][0], cut[3][1]) + 0.002, cut[3][1]);
      }
      iso.geometry.dispose(); iso.geometry = new THREE.BufferGeometry(); iso.geometry.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    };
    const centerL = [0, 1, 2, 3].map(() => airLabel(block, '', { h: 0.012, color: '#b03a2a', dim: 0 }));
    const placeCenters = () => {          // 找出地图里最明显的高、低压中心（局部最大、最小）
      const found = [];
      for (let j = 2; j < GZ - 1; j++) for (let i = 2; i < GX - 1; i++) { const v = field[j * (GX + 1) + i]; let mx = true, mn = true; for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { if (!di && !dj) continue; const w = field[(j + dj) * (GX + 1) + i + di]; if (w >= v) mx = false; if (w <= v) mn = false; } if (mx || mn) found.push({ i, j, v, hi: mx }); }
      found.sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
      centerL.forEach((t, k) => { const f = found[k]; if (!f || Math.abs(f.v) < 0.9) { t.setOn(false); return; } t.position.set(X(f.i / GX), symbolY(X(f.i / GX), Z((f.j / GZ) * LATMAX)) + 0.009, Z((f.j / GZ) * LATMAX)); t.setColor(f.hi ? '#b03a2a' : '#1f4f86').setText(f.hi ? '高' : '低').setOn(true); });
    };

    // ---- 风：一支支扁箭头，指着风往哪吹；长短表示风大小 ----
    const arrowGeo = new THREE.BufferGeometry(); arrowGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.5, 0.18, 0, 0.1, 0.06, 0, 0.1, 0.06, 0, 0.5, -0.06, 0, 0.5, -0.06, 0, 0.1, -0.18, 0, 0.1], 3)); arrowGeo.setIndex([0, 2, 1, 0, 5, 2, 2, 5, 3, 3, 5, 4, 0, 6, 5]);          // 尖朝 −z
    const AN = 14 * 9, arrows = new THREE.InstancedMesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0x1f3f75, transparent: true, opacity: 0.78, side: THREE.DoubleSide }), AN); arrows.raycast = () => {}; block.add(arrows);
    const placeWinds = () => {
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(); let k = 0;
      for (let j = 0; j < 9; j++) for (let i = 0; i < 14; i++) {
        const u = (i + 0.5) / 14, lat = 4 + (j + 0.5) * (52 / 9), [we, wn] = wind(u, lat, S.m, S.land), sp = Math.hypot(we, wn), L = Math.min(0.016, 0.004 + sp * 0.0011);
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-we, wn)); s.set(L * 0.5, 1, L); p.set(X(u), symbolY(X(u), Z(lat)) + 0.004, Z(lat)); m4.compose(p, q, s); arrows.setMatrixAt(k++, m4);          // 北是 −z：往北吹的风箭头尖朝 −z
      }
      arrows.instanceMatrix.needsUpdate = true;
    };

    // ---- 两根空气柱（图 3.15）：冷的收缩下沉、热的受热上升；里面的小点跟着沉、升 ----
    const colGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.1, 24, 1, true).translate(0, 0.05, 0);
    const mkCol = () => { const m = new THREE.Mesh(colGeo, new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide })); m.renderOrder = 5; m.raycast = () => {}; block.add(m); return m; };
    const colL = mkCol(), colS = mkCol();
    const dotTex = canvasTex(32, 32, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const ND = 90, dpos = new Float32Array(ND * 3), dots = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(dpos, 3)), new THREE.PointsMaterial({ map: dotTex, size: 0.006, color: 0x2a3a52, transparent: true, opacity: 0.6, depthWrite: false })); dots.raycast = () => {}; block.add(dots);
    const D = Array.from({ length: ND }, (_, i) => ({ c: i % 2, a: rnd() * 6.28, r: rnd() * 0.013, y: rnd() * 0.1 }));
    const aColL = airLabel(block, '', { h: 0.0078, color: '#2c3245', icon: 'thermo', dim: 0 }), aColS = airLabel(block, '', { h: 0.0078, color: '#2c3245', icon: 'thermo', dim: 0 });
    const COLD = new THREE.Color(0x5f8fd0), HOT = new THREE.Color(0xe0743a), MID = new THREE.Color(0xe8e2d4);
    const placeCols = () => {
      const lt = landT(S.m), st = seaT(S.m), d = lt - st;
      colL.position.set(X(0.32), symbolY(X(0.32), Z(42 - 7 * lt)), Z(42 - 7 * lt)); colS.position.set(X(0.86), G, Z(45 - 12 * lt));
      colL.material.color.copy(MID).lerp(d < 0 ? COLD : HOT, Math.min(1, Math.abs(d))); colS.material.color.copy(MID).lerp(d > 0 ? COLD : HOT, Math.min(1, Math.abs(d) * 0.6));
      colL.visible = S.land; aColL.setOn(S.land); colS.visible = S.land; aColS.setOn(S.land);
      aColL.position.set(colL.position.x, colL.position.y + 0.112, colL.position.z); aColL.setText(d < -0.3 ? '大陆比海洋冷：空气下沉' : d > 0.3 ? '大陆比海洋热：空气上升' : '海陆温差不大');
      aColS.position.set(colS.position.x, colS.position.y + 0.112, colS.position.z); aColS.setText(d < -0.3 ? '大洋上：副极地低压加强' : d > 0.3 ? '大洋上：副热带高压加强' : '大洋上：原有的气压带');          // 大洋上不是单纯的热力环流：是原来就有的气压带被保留、加强（课本第 48—51 页）
    };
    const stepDots = (dt) => { const d = landT(S.m) - seaT(S.m); for (let i = 0; i < ND; i++) { const p = D[i], c = p.c ? colS : colL, vy = (p.c ? 1 : -1) * Math.sign(d) * -0.03 * Math.min(1, Math.abs(d) + 0.15); p.y += vy * dt * (p.c ? 0.6 : 1); if (p.y > 0.1) p.y -= 0.1; if (p.y < 0) p.y += 0.1; dpos.set(c.visible ? [c.position.x + Math.cos(p.a) * p.r, c.position.y + p.y, c.position.z + Math.sin(p.a) * p.r] : [0, -1, 0], i * 3); } dots.geometry.attributes.position.needsUpdate = true; };          // 大陆冷（d<0）：大陆那根往下沉、海洋那根往上升；热时反过来

    // ---- 东岸的城市：几栋房子、一根风向标；夏季风来了有云有雨 ----
    const town = new THREE.Group(); block.add(town); town.position.set(X(CITY.x), G + 0.0035, Z(CITY.lat));
    for (const [dx, dz, w, hh] of [[-0.004, 0.003, 0.005, 0.007], [0.003, -0.002, 0.006, 0.01], [0.001, 0.006, 0.004, 0.005]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, w), new THREE.MeshLambertMaterial({ color: 0xf0ebe0 })); b.position.set(dx, hh / 2, dz); town.add(b); }
    const vane = new THREE.Group(); vane.position.y = 0.022; town.add(vane);
    { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.0004, 0.0004, 0.022, 6), new THREE.MeshLambertMaterial({ color: 0x555a62 })); pole.position.y = 0.011; town.add(pole); const vm = new THREE.MeshLambertMaterial({ color: 0xc8402c }); const sh = new THREE.Mesh(new THREE.BoxGeometry(0.0012, 0.0012, 0.016), vm); vane.add(sh); const hd = new THREE.Mesh(new THREE.ConeGeometry(0.0024, 0.006, 8), vm); hd.rotation.x = -Math.PI / 2; hd.position.z = -0.01; vane.add(hd); }          // 风向标的箭头指着风吹来的方向
    const cloudTex = canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const rainCloud = new THREE.Group(); block.add(rainCloud);
    for (let i = 0; i < 9; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, color: 0xc4cad4, transparent: true, depthWrite: false })); s.position.set(X(CITY.x) + (rnd() - 0.5) * 0.06, 0.05 + rnd() * 0.008, Z(CITY.lat) + (rnd() - 0.5) * 0.04); const r = 0.018 + rnd() * 0.01; s.scale.set(r * 1.5, r * 0.8, 1); s.raycast = () => {}; rainCloud.add(s); }
    const rainP = new Float32Array(60 * 6), rain = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(rainP, 3)), new THREE.LineBasicMaterial({ color: 0x5f86b8, transparent: true, opacity: 0.6 })); rain.raycast = () => {}; block.add(rain);
    const drops = Array.from({ length: 60 }, () => ({ x: (rnd() - 0.5) * 0.05, z: (rnd() - 0.5) * 0.035, t: rnd() }));
    const aCity = airLabel(block, '', { h: 0.0085, color: '#2c3245', icon: 'wind' });

    // ---- 月份盘：立在地图前面的书页上，拖指针换月份 ----
    const dial = new THREE.Group(); dial.position.set(XL - 0.045, 0.002, ZS - 0.02); block.add(dial);
    const DR = 0.032;
    const face = new THREE.Mesh(new THREE.CircleGeometry(DR, 64), new THREE.MeshLambertMaterial({ map: canvasTex(512, 512, (g, w) => {
      g.fillStyle = '#f7f2e6'; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 4, 0, 7); g.fill(); g.strokeStyle = '#8a7a5e'; g.lineWidth = 6; g.stroke();
      for (let m = 1; m <= 12; m++) { const a = ((m - 1) / 12) * Math.PI * 2 - Math.PI / 2, winter = m === 12 || m <= 2, summer = m >= 6 && m <= 8; g.fillStyle = winter ? '#dbe6f4' : summer ? '#f6dcc6' : 'transparent'; g.beginPath(); g.moveTo(w / 2, w / 2); g.arc(w / 2, w / 2, w / 2 - 10, a - Math.PI / 12, a + Math.PI / 12); g.fill(); g.fillStyle = '#3a3226'; g.font = '600 40px "PingFang SC", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(m), w / 2 + Math.cos(a) * (w * 0.37), w / 2 + Math.sin(a) * (w * 0.37)); }
      g.font = '600 30px "PingFang SC", sans-serif'; g.fillStyle = '#4a6fa0'; g.fillText('冬', w / 2, w * 0.24); g.fillStyle = '#b0603a'; g.fillText('夏', w / 2, w * 0.78);
    }) })); face.rotation.x = -Math.PI / 2; dial.add(face);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.0022, 0.0016, DR * 0.72).translate(0, 0, -DR * 0.36), new THREE.MeshLambertMaterial({ color: 0xc8402c })); hand.position.y = 0.0012; dial.add(hand);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.003, 16), new THREE.MeshLambertMaterial({ color: 0x3a3226 })); knob.position.y = 0.0015; dial.add(knob);
    const dialPick = new THREE.Mesh(new THREE.CylinderGeometry(DR, DR, 0.006, 24), new THREE.MeshBasicMaterial({ visible: false })); dialPick.userData.pick = true; dial.add(dialPick);
    const aDial = airLabel(block, '', { h: 0.0095, color: '#a8341f' }); aDial.position.set(dial.position.x, 0.016, dial.position.z - DR - 0.006);
    const tHint = tag('<span>转这个月份盘</span><small>拨到夏季（7 月前后）看看</small>', 'hint');
    noteBadge(tag, '教学示意：大陆和大洋是理想化的，不是真实地图；气压、风速、海陆温差都是示意；固定右偏 45°仅示意中纬度近地面风向，不适用于赤道附近').loc(block, XL + 0.012, -0.002, ZS + 0.01);
    const labels = [...centerL, aColL, aColS, aCity, aDial];

    // ---- 摆好 ----
    const layout = () => {
      S.m = mi();          // 全部展示先吸附到同一个整数月份
      buildIso(); placeCenters(); placeWinds(); placeCols();
      town.position.y = terrainY(X(CITY.x), Z(CITY.lat)) + 0.0004;
      hand.rotation.y = -((S.m - 1) / 12) * Math.PI * 2; aDial.setText(MON[mi()]);
      const cw = cityWeather(mi(), S.land); vane.visible = !cw.calm; if (!cw.calm) vane.rotation.y = Math.atan2(-cw.w[0], cw.w[1]) + Math.PI;          // 箭头转向风吹来的那边
      aCity.position.set(X(CITY.x) - 0.006, 0.07, Z(CITY.lat)); aCity.setText(`${CITY.name} · ${cw.name}${S.land && cw.season === 'winter' && !cw.fromSea ? ' · 干燥寒冷' : S.land && cw.season === 'summer' && cw.fromSea ? ' · 暖湿多雨' : ''}`);
      const wet = S.land && cw.fromSea && landT(S.m) > 0.3; rainCloud.visible = rain.visible = wet;
      tHint.loc(block, dial.position.x, 0.03, dial.position.z).show(!S.moved);
      gLand.visible = S.land; town.children.forEach((c) => { if (c.isMesh && c.geometry.type === 'BoxGeometry') c.visible = S.land; }); drawChart(); drawLog();          // 全是海洋时：大陆和房子都没了，只留风向标标着原来东岸城市的位置
    };
    const note1 = () => { const m = mi(), key = S.land ? 'land' : 'sea'; if (!S.seen[key][m]) { S.seen[key][m] = cityWeather(m, S.land); drawLog(); drawChart(); } say(m); };
    const say = (m) => { if (!W) return; const winter = m === 12 || m <= 2, summer = m >= 6 && m <= 8; if (!S.land) { W.ui.status(`假如全是海洋（${MON[m]}）：气压带一圈圈呈带状分布，东岸那里吹${cityWeather(m, false).name}。拨到另一个季节比一比，风会倒过来吗？`); return; } if (winter) { S.saidW = true; W.ui.status(`${MON[m]}：大陆比海洋冷，空气收缩下沉，大陆上形成<b>冷高压</b>；风从大陆吹向海洋，东岸的城市吹<b>${cityWeather(m).name}</b>，干燥寒冷。再把月份盘拨到夏季。`); } if (summer) { S.saidS = true; W.ui.status(`${MON[m]}：大陆比海洋热，空气受热上升，大陆上形成<b>热低压</b>；大洋上的副热带高压加强，暖湿空气从海上吹来，东岸吹<b>${cityWeather(m).name}</b>，多雨。风倒过来了。`); } if (!winter && !summer) W.ui.status(`${MON[m]}，过渡季节：${cityWeather(m).text}，东岸城市吹${cityWeather(m).name}。继续拨月份盘，比一比冬夏。`); };

    // ---- 侧栏：东岸城市一年里每个月的风（拨过的月份才画） ----
    const drawChart = () => {
      if (!W) return;
      const c = W.chart, g = c.getContext('2d'), w = c.width, hh = c.height, L = 74, cw = (w - L - 6) / 12;
      g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, hh); g.textBaseline = 'middle';
      g.font = '11px "PingFang SC", sans-serif'; g.fillStyle = '#7a705e'; g.textAlign = 'center'; for (let m = 1; m <= 12; m++) g.fillText(String(m), L + (m - 0.5) * cw, 12);
      const row = (y, key, name) => {
        g.font = '600 12px "PingFang SC", sans-serif'; g.fillStyle = '#3a3226'; g.textAlign = 'left'; g.fillText(name, 4, y);
        for (let m = 1; m <= 12; m++) {
          const x = L + (m - 0.5) * cw, r = S.seen[key][m];
          if (mi() === m && (key === 'land') === S.land) { g.fillStyle = 'rgba(200,64,44,0.12)'; g.fillRect(x - cw / 2, y - 20, cw, 40); }
          if (!r) { g.fillStyle = '#c8bfae'; g.fillText('·', x - 2, y); continue; }
          if (r.calm) { g.fillStyle = '#5a6a80'; g.font = '11px "PingFang SC", sans-serif'; g.textAlign = 'center'; g.fillText('静', x, y); continue; }          // 静风不画方向
          const a = Math.atan2(r.w[0], r.w[1]), L2 = 14; g.save(); g.translate(x, y); g.rotate(a); g.strokeStyle = g.fillStyle = key === 'land' ? (r.fromSea ? '#2f7d8c' : '#9a6a3a') : '#5a6a80'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(0, L2 / 2); g.lineTo(0, -L2 / 2 + 4); g.stroke(); g.beginPath(); g.moveTo(0, -L2 / 2 - 1); g.lineTo(-4, -L2 / 2 + 5); g.lineTo(4, -L2 / 2 + 5); g.fill(); g.restore();          // 箭头指着风往哪吹（上是北）
        }
      };
      row(44, 'land', '有大陆'); row(96, 'sea', '假如全是海洋');
      g.font = '11px "PingFang SC", sans-serif'; g.textAlign = 'left'; g.fillStyle = '#2f7d8c'; g.fillText('■ 从海上吹来', 4, hh - 10); g.fillStyle = '#9a6a3a'; g.fillText('■ 从大陆吹来', 92, hh - 10); g.fillStyle = '#7a705e'; g.fillText('箭头：风往哪吹，上是北', 180, hh - 10);
    };
    const drawLog = () => {
      if (!W) return;
      const rows = [], r = (b, t) => rows.push(h('div', { class: 'tl-row' }, h('b', {}, b), h('span', {}, t))), A = S.seen.land, B = S.seen.sea;
      const wm = [12, 1, 2].find((m) => A[m]), sm = [6, 7, 8].find((m) => A[m]);
      if (wm) r(`冬季（${MON[wm]}）：`, `大陆上是冷高压；东岸吹${A[wm].name}，从大陆吹来，干燥寒冷`);
      if (sm) r(`夏季（${MON[sm]}）：`, `大陆上是热低压，海洋上的副热带高压加强；东岸吹${A[sm].name}，从海上吹来，暖湿多雨`);
      if (wm && sm) r('季风：', '一年中盛行风向随季节有规律地变换——冬季风从大陆吹向海洋，夏季风从海洋吹向大陆');
      const bw = [12, 1, 2].find((m) => B[m]), bs = [6, 7, 8].find((m) => B[m]);
      if (bw || bs) r('假如全是海洋：', `气压带呈带状分布${bw ? `；冬季东岸吹${B[bw].name}` : ''}${bs ? `；夏季吹${B[bs].name}` : ''}${bw && bs ? '：没有冬夏相反的季风' : ''}`);
      if (S.guess != null && wm) rows.push(h('div', { class: 'tl-row' }, h('small', {}, `你猜：${ASK[1][S.guess]}　实际：冷高压（陆地降温比海洋快）`)));
      W.log.replaceChildren(...rows);
      const m = mi(), cw = cityWeather(m, S.land);
      W.read.innerHTML = `现在 <b>${MON[m]}</b>${S.land ? `，大陆比海洋${landT(m) - seaT(m) < -0.3 ? '冷得多' : landT(m) - seaT(m) > 0.3 ? '热得多' : '差不多'}` : '，假如全是海洋'}；东岸吹 <b>${cw.name}</b><br><small>等压线、风都是示意，只用来比较</small>`;
      if (wm && sm && (bw || bs)) W.ui.unlock();
    };

    // ---- 指针：拖月份盘的指针 ----
    const plane = new THREE.Plane(), hit = new THREE.Vector3();
    const pointer = {
      down(rc) { if (!rc.intersectObject(dialPick, false).length) return false; S.drag = true; document.getElementById('c').style.cursor = 'grabbing'; pointer.move(rc); return true; },
      move(rc) {
        const c = document.getElementById('c');
        if (!S.drag) { if (c) c.style.cursor = rc.intersectObject(dialPick, false).length ? 'grab' : ''; return false; }
        dial.updateMatrixWorld(); plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), dial.localToWorld(new THREE.Vector3(0, 0, 0))); if (!rc.ray.intersectPlane(plane, hit)) return true;
        const l = dial.worldToLocal(hit.clone()), a = Math.atan2(l.x, -l.z); let m = 1 + (((a / (Math.PI * 2)) * 12 + 12) % 12); S.m = m; S.moved = true;          // 12 点方向是 1 月，顺时针往后
        layout(); note1(); return true;
      },
      up() { if (!S.drag) return false; S.drag = false; document.getElementById('c').style.cursor = ''; S.m = mi(); if (S.m > 12) S.m = 1; layout(); note1(); return true; },
    };
    shapeMap(); layout();

    return {
      group,
      card: false,
      emerge: 'flat',          // 课本的图平放在书页上，模型从它上面长出来、它慢慢淡掉
      size: { w: 0.42, d: 0.22, h: 0.17 },
      view: { elev: 34, azim: 10, lookY: 0.35, frameMargin: 1.08 },
      pointer,
      debug: { month: (m, land = S.land) => { S.m = m; S.land = land; S.moved = true; shapeMap(); layout(); note1(); } },
      mount(ui) {
        const landBtn = buttons([{ text: '假如这一片全是海洋', onClick: () => { S.land = !S.land; landBtn.btns[0].textContent = S.land ? '假如这一片全是海洋' : '把大陆放回来'; shapeMap(); layout(); note1(); ui.status(S.land ? '大陆放回来了。' : '假如这一片全是海洋：拨月份盘，冬季、夏季各看一次，东岸那里的风会倒过来吗？'); } }]);
        const guess = seg(...ASK, (_, i) => { S.guess = i; drawLog(); }, { value: -1 });
        const acts = buttons([{ text: '重来', ghost: true, onClick: () => { ui.relock?.(); Object.assign(S, { m: 1, land: true, moved: false, guess: null, saidW: false, saidS: false }); S.seen = { land: {}, sea: {} }; landBtn.btns[0].textContent = '假如这一片全是海洋'; guess.set(-1); shapeMap(); layout(); drawLog(); ui.status(START); } }]);
        const chart = h('canvas', { class: 'wx-map', width: 320, height: 140 }), read = h('div', { class: 'read-out' }), log = h('div', { class: 'timeline' });
        ui.controls.append(h('div', { class: 'bar-title' }, '东岸城市一年里的风（拨过的月份才画）'), chart, read, landBtn.el, guess.el, acts.el, note('地图上红“高”蓝“低”是气压中心，细线是等压线；深蓝的小箭头指着风往哪吹；两根空气柱里的小点在下沉还是上升。'));
        ui.data.append(h('div', { class: 'bar-title' }, '你看到了什么'), log);
        W = { ui, chart, read, log };
        ui.status(START);
        note1(); drawChart(); drawLog();
      },
      update(dt) {
        labels.forEach((l) => l.tick(dt)); stepDots(Math.min(dt, 0.05));
        if (rain.visible) { for (let i = 0; i < 60; i++) { const d = drops[i]; d.t += dt * 1.2; if (d.t > 1) d.t -= 1; const x = X(CITY.x) + d.x, z = Z(CITY.lat) + d.z, y = 0.046 - d.t * 0.036; rainP.set([x, y, z, x - 0.0005, y - 0.004, z], i * 6); } rain.geometry.attributes.position.needsUpdate = true; }
      },
    };
  },
};
const START = '一块理想化的北半球：西边大陆、东边大洋，各立一根空气柱。现在是 1 月。<b>转月份盘</b>，看大陆上的气压中心和东岸城市的风一年里怎么变。';
