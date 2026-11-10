// 课本选必1 第 29—30 页：六大板块名称与 PB2002 详细边界分层展示。
// 地表为 ETOPO1 模型采样，地球与切片均夸大高差；地下几何仅为机制示意，不表示真实厚度或深度。
// 科学补注：https://www.usgs.gov/faqs/are-tectonic-plates-floating-magma
// 弧岩浆机制：https://volcanoes.usgs.gov/about/edu/dynamicplanet/nutshell.php
// 案例背景：https://pubs.usgs.gov/gip/dynamic/understanding.html
// 数据和极性来源见 tools/geo/plates_prep.py；地貌案例名不由高程自动推断。
import * as THREE from 'three';
import { buttons, note } from './kit/ui.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { h } from '../ui/Panel.js';
import { airLabel, noteBadge } from './kit/labels.js';
import { NAMES, SIX_NAMES, CLASS, OVERVIEW, ll2v, v2ll, profile, dest, bearing, nearestBoundary, arrowFrame, sectionSides, elevationState, roundedHeight, sectionGeometry } from './kit/plates.js';
import LINES, { GRID, HEIGHT } from './data/plates.js';
import reliefUrl from './data/earth_relief.jpg';

const R = 0.085, GC = new THREE.Vector3(-0.07, R + 0.022, 0), EXAG = 0.0042 / 9000;          // 地球半径、球心；1 米抬高多少（夸大，约 40 倍）
const SL = { w: 0.24, d: 0.1, base: 0.05, rows: 21 };          // 切开以后的切片：宽（2400 千米）、厚（沿边界方向 1000 千米）、海平面在多高；rows：沿边界方向采几条剖面
const CUT = { slice: new THREE.Vector3(0.045, 0, 0.03), globe: new THREE.Vector3(-0.2, 0, -0.075), s: 0.5 };
const SLICE_ON_BOOK = new THREE.Vector3(0, 0, 0.05);          // 地球主探索：地球在书的后上方，切片落在两页正中          // 切开以后轮到切片当主角：切片放大摆在画面中间，地球缩小退到左后方
// 案例位置与解释：课本图 2.20—2.21；USGS This Dynamic Earth / Understanding plate motions。
// 安第斯选在纳斯卡—南美段；日本海沟按 PB2002 标鄂霍次克—太平洋，不改称亚欧。
const PRESETS = [['喜马拉雅山', 28.5, 85.2, '印度板块与亚欧板块大陆碰撞；印度板块在课本六大板块的划分里属于印度洋板块'], ['安第斯山', -32.65, -72, '纳斯卡板块向南美板块下方俯冲；南美板块在课本六大板块的划分里属于美洲板块'], ['大西洋中脊', -30, -13.5, '非洲板块与南美板块之间的洋底扩张'], ['东非裂谷', 5, 36.6, '非洲板块与索马里板块之间张裂；在课本六大板块的划分里属于非洲板块内部'], ['日本海沟', 38, 143.5, '太平洋板块向鄂霍次克板块下方俯冲（PB2002 划分）']];
const KINDS = Object.fromEntries(Object.entries(CLASS).map(([k, v]) => [k, v.name]));

export default {
  id: 'plates',
  fig: '图2.20',
  title: '板块运动与地貌',
  flow: 'explore',
  ask: '陆地上大规模的山系、高原，海底延绵的山脉和狭长的海沟，是怎样形成的？它们与板块边界有什么联系？',
  need: '转动地球，看看高山、海沟、海底的山脉在哪；再在几种边界上点一下切开看：大陆和大陆碰撞、大洋板块俯冲、大洋中脊、大陆裂谷',
  conclusion: {
    page: 33,
    quote: '板块构造学说认为，地球岩石圈是刚性的，破碎成为多个不规则的块体，即板块（图2.20）。这些板块覆盖于熔融的软流层之上，一直处于缓慢的、不断的运动之中。板块间的相互运动主要有相向、相离等形式，并因此产生不同的地貌形态。板块内部相对稳定，两个板块之间的交界处是地壳比较活跃的地带。……当大洋板块与大陆板块相碰撞时，大洋板块俯冲到大陆板块下方，俯冲边界处形成海沟，大陆板块边缘形成海岸山脉或岛弧。当大陆板块与大陆板块相碰撞时，相互挤压并抬升形成巨大的褶皱山系。青藏高原的抬升就是亚欧板块和印度洋板块相碰撞所造成的。……板块相离运动形成裂谷、海洋。',
    why: OVERVIEW + '。科学补注：软流层主体是能缓慢流动的固态岩石，并非全球熔岩层。典型俯冲带中，下插板片释放流体，促进上覆地幔楔局部部分熔融；图中区分板片、地幔楔和部分熔融区。',
    src: '课本原文节选（……表示删节）；第 29—30 页 · 第二章 第二节 构造地貌的形成',
  },

  create({ tag, camera, reframe, spot }) {
    const WM = !!spot?.world?.inplace;          // 地球主探索：这颗地球就是书后上方那颗（没有铜座），切片从它身上拉出来落到书上
    const group = new THREE.Group(), block = new THREE.Group(), globeG = new THREE.Group(); group.add(block); block.add(globeG);          // globeG：地球连同底座，切开时一起缩小、退到一旁
    const S = { k: 0, kTo: 0, e: 0, framed: true, pick: null, seen: new Set(), drag: null, moved: false, rot: new THREE.Quaternion(), target: null };
    let W = null; const terrain = elevationState(GRID); let pending = null;
    const hgt = (lat, lon) => terrain.sample(lat, lon);

    // ---- 地球：真实地形的晕渲贴图；顶点按高度往外推（夸大） ----
    const pivot = new THREE.Group(); pivot.position.copy(GC); globeG.add(pivot);
    const earthRot = new THREE.Group(); pivot.add(earthRot);
    const tex = new THREE.TextureLoader().load(reliefUrl); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    tex.wrapS = THREE.RepeatWrapping; tex.offset.set((-180 - GRID.lon0 + GRID.dlon / 2) / (GRID.width * GRID.dlon), (-90 - GRID.lat0 - (GRID.height - 0.5) * GRID.dlat) / (-GRID.height * GRID.dlat));          // 贴图像元中心与真实采样节点对齐，接缝经度周期重复
    const geo = new THREE.SphereGeometry(R, 360, 180);
    const globe = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0 })); earthRot.add(globe);
    const loadElevation = async (promise) => {
      terrain.status = 'loading'; terrain.data = null;
      if (S.pick) pending = { lat: S.pick.lat, lon: S.pick.lon, preset: S.pick.preset }; S.pick = null;
      await Promise.resolve(); clearSlice(); drawChart(); W?.ui.status('ETOPO1 地形数据加载中，暂不提供高程结论。');
      try { terrain.load(await promise); } catch { terrain.status = 'failed'; }
      if (terrain.status !== 'ready') { drawChart(); W?.ui.status('ETOPO1 地形数据不可用，暂不提供高程结论。'); return; }
      const p = geo.attributes.position, uv = geo.attributes.uv, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) { const u = uv.getX(i), w = uv.getY(i), e = hgt(w * 180 - 90, u * 360 - 180); v.fromBufferAttribute(p, i).normalize().multiplyScalar(R + e * EXAG * (e < 0 ? 0.55 : 1)); p.setXYZ(i, v.x, v.y, v.z); }
      p.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
      if (pending) { const q = pending; pending = null; choose(q.lat, q.lon, q.preset); } else { drawChart(); W?.ui.status(START); }
    };
    const atm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.035, 64, 32), new THREE.MeshBasicMaterial({ color: 0x9cc6ef, transparent: true, opacity: 0.12, side: THREE.BackSide, depthWrite: false })); atm.raycast = () => {}; pivot.add(atm);          // 一圈淡淡的大气
    { const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.008, 48), new THREE.MeshStandardMaterial({ color: 0x8a6a40, metalness: 0.5, roughness: 0.4 })); stand.position.set(GC.x, 0.004, 0); globeG.add(stand); const ring = new THREE.Mesh(new THREE.TorusGeometry(R * 0.36, 0.0018, 8, 48), stand.material); ring.rotation.x = Math.PI / 2; ring.position.set(GC.x, 0.009, 0); globeG.add(ring); const post = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.005, 0.016, 16), stand.material); post.position.set(GC.x, 0.014, 0); globeG.add(post); if (WM) stand.visible = ring.visible = post.visible = false; }          // 一个铜座托着（地球主探索里地球浮在书的后上方，不要座）

    // ---- 板块边界：红生长、绿汇聚、灰错动；箭头画在边界两侧，朝外（相离）或朝里（相向） ----
    const COL = { grow: 0xd8342c, die: 0x23a04e, slide: 0x8a8e96 };
    const bnd = { grow: [], die: [], slide: [] }, arrowsP = { grow: [], die: [] };
    const onR = (lat, lon, k = 1.03) => { const [x, y, z] = ll2v(lat, lon); return [x * R * k, y * R * k, z * R * k]; };
    LINES.forEach((l, li) => {
      const arr = bnd[l.k]; for (let i = 0; i < l.pts.length - 1; i++) { const a = l.pts[i], b = l.pts[i + 1]; arr.push(...onR(a[1], a[0]), ...onR(b[1], b[0])); }
      if (l.k !== 'slide' && li % 14 === 0 && l.pts.length >= 2) { const m = l.pts[0], n2 = l.pts[1], az = bearing(m[1], m[0], n2[1], n2[0]); arrowsP[l.k].push([m[1], m[0], az]); }
    });
    for (const k in bnd) { const g2 = new LineSegmentsGeometry(); g2.setPositions(bnd[k]); const ln = new LineSegments2(g2, new LineMaterial({ color: COL[k], linewidth: k === 'slide' ? 1.3 : 2.6, worldUnits: false, transparent: k === 'slide', opacity: k === 'slide' ? 0.6 : 1 })); ln.raycast = () => {}; earthRot.add(ln); }          // 线按屏幕像素粗细画：远近一样清楚
    const arrowGeo = new THREE.ConeGeometry(0.0011, 0.0036, 8).rotateX(Math.PI / 2);          // 尖朝 +z
    for (const k of ['grow', 'die']) {
      const list = arrowsP[k], im = new THREE.InstancedMesh(arrowGeo, new THREE.MeshBasicMaterial({ color: COL[k] }), list.length * 2), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); im.raycast = () => {};
      list.forEach(([lat, lon, az], i) => { for (const sd of [1, -1]) { const f = arrowFrame(lat, lon, az, k, sd), pos = new THREE.Vector3(...f.position).multiplyScalar(R * 1.035), dir = new THREE.Vector3(...f.direction); q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir); m4.compose(pos, q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i * 2 + (sd > 0 ? 0 : 1), m4); } });          // 圆锥尖端 +Z 对准数据法向；相离向外，相向向内
      earthRot.add(im);
    }
    // 板块的名字（只在朝着镜头的那一面显示）
    const plateL = [['EU', 52, 78], ['AF', 4, 18], ['AM', 15, -88], ['PA', 2, -158], ['IN', -26, 118], ['AN', -78, 40]].map(([k, la, lo]) => { const l = airLabel(earthRot, SIX_NAMES[k], { h: 0.010, color: '#1c2a44' }); l.position.set(...onR(la, lo, 1.06)); l.userData.n = new THREE.Vector3(...ll2v(la, lo)); return l; });

    // ---- 选中的点和切线 ----
    const mark = new THREE.Mesh(new THREE.SphereGeometry(0.0024, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffd23a })); mark.visible = false; earthRot.add(mark);
    const cutLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffd23a })); cutLine.visible = false; cutLine.raycast = () => {}; earthRot.add(cutLine);
    // 指着地球上的边界：那一条边界亮起来，旁边写是哪种边界、哪两个板块、相向还是相离（不用先去侧栏找）
    const hiLine = new LineSegments2(new LineSegmentsGeometry(), new LineMaterial({ color: 0xfff1a8, linewidth: 5, worldUnits: false, transparent: true, opacity: 0.95, depthWrite: false })); hiLine.visible = false; hiLine.raycast = () => {}; earthRot.add(hiLine);
    const aHover = airLabel(earthRot, '', { h: 0.0085, color: '#1c2a44', dim: 0 }); aHover.userData.want = 0;
    let hiFor = null;
    const showHover = (nb, at) => {
      if (!nb) { hiLine.visible = false; aHover.userData.want = 0; hiFor = null; return; }
      if (hiFor !== nb.l) { hiFor = nb.l; const P = []; for (let i = 0; i < nb.l.pts.length - 1; i++) { const a = nb.l.pts[i], b = nb.l.pts[i + 1]; P.push(...onR(a[1], a[0], 1.036), ...onR(b[1], b[0], 1.036)); } hiLine.geometry.dispose(); hiLine.geometry = new LineSegmentsGeometry(); hiLine.geometry.setPositions(P); aHover.setText(`${CLASS[nb.l.c].name} · ${pairName(nb.l.p)} · ${CLASS[nb.l.c].how.split(/[，；]/)[0].replace('两侧板块', '').replace('主要', '')}`); }
      hiLine.visible = true; aHover.position.copy(at).multiplyScalar(1.09); aHover.center.x = WM ? 0 : 0.5; aHover.userData.want = 1;          // 地球主探索：字从边界往右写（左边是“看法”按钮）
    };
    // 切开之前先说清楚：沿哪条线切、两头各是哪个板块
    const aEnds = [0, 1].map(() => airLabel(earthRot, '', { h: 0.0078, color: '#7a4a10', dim: 0 }));
    // ---- 切片：上面是ETOPO1 模型采样地形（夸大），前面画着两块板块怎么动 ----
    const slice = new THREE.Group(); slice.visible = false; block.add(slice);          // 没切开的时候不出现；切开时从地球上切开的那一点“拉出来”
    const faceCv = document.createElement('canvas'); faceCv.width = 1024; faceCv.height = 512; const faceTex = new THREE.CanvasTexture(faceCv); faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 8;
    const sFront = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ map: faceTex, side: THREE.DoubleSide, transparent: true })); slice.add(sFront);
    const sTop = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); slice.add(sTop);
    const sSea = new THREE.Mesh(new THREE.BoxGeometry(SL.w, 0.0005, SL.d), new THREE.MeshLambertMaterial({ color: 0x4f8fc4, transparent: true, opacity: 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 })); sSea.position.y = SL.base; sSea.renderOrder = 6; slice.add(sSea);          // 海面往后让一点：海边的低地不和海面打架（不出条纹）
    const sBack = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshLambertMaterial({ color: 0x8a7a66, side: THREE.DoubleSide })); slice.add(sBack);
    const sEnds = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); slice.add(sEnds);          // 两头和底面：切片是实心的一块
    const tether = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0xffd23a, dashSize: 0.004, gapSize: 0.003, transparent: true, opacity: 0 })); tether.raycast = () => {}; tether.frustumCulled = false; block.add(tether);          // 两条虚线：从地球上切线的两端连到切片两头，看得出切片是从哪切下来的
    const SV = (hm) => SL.base + hm * (0.028 / 9000);          // 切片上 1 米多高（比地球上夸大得更多，切片是近看）
    const blank = new THREE.Mesh(new THREE.BoxGeometry(SL.w, SL.base, SL.d), new THREE.MeshLambertMaterial({ color: 0xd8cbb4, transparent: true, opacity: 0.55 })); blank.position.y = SL.base / 2; slice.add(blank);          // 还没切的时候：一块空白的切片，等着
    const aBlank = airLabel(slice, '', { x: 0, y: SL.base + 0.012, z: 0, h: 0.0068, color: '#5a5040' }); blank.visible = false; aBlank.setOn(false);          // 旧的空白切片不再用：没切开时画面里只有地球
    const aForm = [0, 1].map(() => airLabel(slice, '', { h: 0.0072, color: '#a8341f', dim: 0 }));
    const aPlates = [0, 1].map(() => airLabel(slice, '', { h: 0.0068, color: '#1c2a44', dim: 0 }));
    const aSlice = airLabel(slice, '', { h: 0.0078, color: '#2c3245', dim: 0 });

    const nearest = (lat, lon) => nearestBoundary(LINES, lat, lon);
    const choose = (lat, lon, preset = null) => {
      if (terrain.status !== 'ready') { pending = { lat, lon, preset }; W?.ui.status(terrain.status === 'failed' ? 'ETOPO1 地形数据不可用，暂不提供高程结论。' : 'ETOPO1 地形数据加载中，暂不提供高程结论。'); return; }
      const nb = nearest(lat, lon); if (!nb || nb.dist > 600) { W?.ui.status('这里离板块边界较远。在红线、绿线或灰线上点一下。'); return; }
      const C = CLASS[nb.l.c], pr = profile(hgt, nb.lat, nb.lon, nb.strike, 1200, 121);
      S.pick = { lat: nb.lat, lon: nb.lon, strike: nb.strike, c: nb.l.c, pair: nb.l.p, line: nb.l, preset, pr }; if (KINDS[nb.l.c]) S.seen.add(nb.l.c);
      mark.position.set(...onR(nb.lat, nb.lon, 1.04)); mark.visible = true;
      const cl = [];          // 切线：沿剖面方向画一道黄线
 for (let i = 0; i <= 40; i++) { const s = -1200 + 60 * i, [la2, lo2] = (() => { const D = 6371, d2 = s / D, la = nb.lat * Math.PI / 180, th = (nb.strike + 90) * Math.PI / 180, l2 = Math.asin(Math.sin(la) * Math.cos(d2) + Math.cos(la) * Math.sin(d2) * Math.cos(th)), o2 = nb.lon * Math.PI / 180 + Math.atan2(Math.sin(th) * Math.sin(d2) * Math.cos(la), Math.cos(d2) - Math.sin(la) * Math.sin(l2)); return [l2 * 180 / Math.PI, o2 * 180 / Math.PI]; })(); cl.push(new THREE.Vector3(...onR(la2, lo2, 1.038))); }
      cutLine.geometry.dispose(); cutLine.geometry = new THREE.BufferGeometry().setFromPoints(cl); cutLine.visible = true;
      buildSlice(); if (WM) { turnToCut(nb.lat, nb.lon, nb.strike); S.preview = 1.0; const [A, B] = sideNames(), P = cutLine.geometry.attributes.position; aEnds[0].position.fromBufferAttribute(P, 0).multiplyScalar(1.12); aEnds[1].position.fromBufferAttribute(P, P.count - 1).multiplyScalar(1.12); aEnds[0].setText(A).setOn(true); aEnds[1].setText(B).setOn(true); showHover(null); } else turnTo(nb.lat, nb.lon); S.e = 0; S.kTo = 1; S.framed = false; W?.backBtn && (W.backBtn.style.display = ''); drawChart(); drawLog(); W?.ui.status(`${preset ? `<b>${preset[0]}</b>：${preset[3]}。<br>` : ''}<b>${C.name}</b>（${pairName(nb.l.p)}）：${C.how}。${nb.l.c === 'SUB' ? `下插板块：${NAMES[nb.l.subducting]}。` : ''}地表为 ETOPO1 地形模型采样值，地下为所选边界附近的机制示意。`);          // 轮到切片当主角
    };
    const pairName = (p) => (p.slice(0, 2) === p.slice(2) ? `${NAMES[p.slice(0, 2)]}内部的张裂` : `${NAMES[p.slice(0, 2)]}和${NAMES[p.slice(2)]}`);
    // 切片的几何和前面的示意
    const buildSlice = () => {
      const pk = S.pick; if (!pk) return; blank.visible = false; aBlank.setOn(false); const pr = pk.pr, n = pr.length, X = (i) => -SL.w / 2 + (SL.w * i) / (n - 1);
      // 顶面：沿边界方向（往后）再采 rows 条平行的 ETOPO1 剖面，拼成一块真实的地形；最前面那条就是剖面图的那一条
      const rows = SL.rows, KM = SL.d * 10000 / (rows - 1), grid = [pr];
      for (let k = 1; k < rows; k++) { const [la, lo] = dest(pk.lat, pk.lon, pk.strike, k * KM); grid.push(profile(hgt, la, lo, pk.strike, 1200, n)); }
      const Z = (k) => SL.d / 2 - (SL.d * k) / (rows - 1), P = [], C2 = [], I = [], col = new THREE.Color(), shade = new THREE.Color();
      for (let k = 0; k < rows; k++) for (let i = 0; i < n; i++) { const hm = grid[k][i].h, y = SV(hm); P.push(X(i), y, Z(k)); col.set(hm < -3000 ? 0x3d6f95 : hm < 0 ? 0x5d8fae : hm > 4500 ? 0xe9e7e2 : hm > 2000 ? 0x9a8064 : hm > 800 ? 0xa59a6a : 0x7fa25c); col.multiply(shade.setScalar(0.96 + 0.04 * ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1))); C2.push(col.r, col.g, col.b); if (k && i) { const a = (k - 1) * n + i - 1, b = k * n + i - 1; I.push(a, a + 1, b, a + 1, b + 1, b); } }          // 分层设色（只表示高程）：< −3000 米、< 0 米、< 800 米、< 2000 米、< 4500 米、> 4500 米；白色不表示冰雪
      sTop.geometry.dispose(); sTop.geometry = new THREE.BufferGeometry(); sTop.geometry.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); sTop.geometry.setAttribute('color', new THREE.Float32BufferAttribute(C2, 3)); sTop.geometry.setIndex(I); sTop.geometry.computeVertexNormals();
      const face = (zf, prof) => { const Q = [], U = [], J = []; for (let i = 0; i < n; i++) { const y = SV(prof[i].h); Q.push(X(i), y, zf, X(i), 0, zf); U.push(i / (n - 1), y / 0.1, i / (n - 1), 0); if (i) { const a = 2 * i - 2; J.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } } const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(Q, 3)); g2.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g2.setIndex(J); g2.computeVertexNormals(); return g2; };
      sFront.geometry.dispose(); sFront.geometry = face(SL.d / 2 + 0.0002, pr); sBack.geometry.dispose(); sBack.geometry = face(-SL.d / 2, grid[rows - 1]);
      { const EP = [], EC = [], cTop = new THREE.Color(0x9a8a72), cBot = new THREE.Color(0xc46a32), push = (a, ca) => { EP.push(...a); EC.push(ca.r, ca.g, ca.b); };
        for (const [i, x] of [[0, -SL.w / 2], [n - 1, SL.w / 2]]) for (let k = 1; k < rows; k++) { const z0 = Z(k - 1), z1 = Z(k), y0 = SV(grid[k - 1][i].h), y1 = SV(grid[k][i].h); for (const [a, ca] of [[[x, 0, z0], cBot], [[x, 0, z1], cBot], [[x, y1, z1], cTop], [[x, 0, z0], cBot], [[x, y1, z1], cTop], [[x, y0, z0], cTop]]) push(a, ca); }          // 两头：按每条剖面的端点围起来，下面软流层橙、上面岩石圈
        for (const a of [[-SL.w / 2, 0.0004, SL.d / 2], [SL.w / 2, 0.0004, SL.d / 2], [SL.w / 2, 0.0004, -SL.d / 2], [-SL.w / 2, 0.0004, SL.d / 2], [SL.w / 2, 0.0004, -SL.d / 2], [-SL.w / 2, 0.0004, -SL.d / 2]]) push(a, cBot);
        sEnds.geometry.dispose(); sEnds.geometry = new THREE.BufferGeometry(); sEnds.geometry.setAttribute('position', new THREE.Float32BufferAttribute(EP, 3)); sEnds.geometry.setAttribute('color', new THREE.Float32BufferAttribute(EC, 3)); sEnds.geometry.computeVertexNormals(); }
      paintSlice();
      // 任意剖面只报告采样极值，案例名称只由预设按钮提供，不绑定最高点或最低点。
      let hi = 0, lo = 0; pr.forEach((p, i) => { if (p.h > pr[hi].h) hi = i; if (p.h < pr[lo].h) lo = i; });
      const C = CLASS[pk.c], tagAt = (t, i, txt) => { t.position.set(X(i), SV(pr[i].h) + 0.012, SL.d / 2); t.setText(`${txt}约 ${roundedHeight(pr[i].h)} 米`).setOn(true); };
      tagAt(aForm[0], hi, '剖面最高点'); tagAt(aForm[1], lo, '剖面最低点');
      const [A, B] = sideNames(); aPlates[0].position.set(-SL.w / 2 + 0.02, 0.012, SL.d / 2 + 0.002); aPlates[0].setText(A).setOn(true); aPlates[1].position.set(SL.w / 2 - 0.02, 0.012, SL.d / 2 + 0.002); aPlates[1].setText(B).setOn(true);
      aSlice.position.set(0, SL.base + 0.03, -SL.d / 2); aSlice.setText(`${pk.preset ? pk.preset[0] + ' · ' : ''}${C.form}`).setOn(true);
    };
    // 剖面负距离是有向边界的左侧，不用地形高低猜板块身份。
    const sideNames = () => { const sides = sectionSides(S.pick.line); return [NAMES[sides.left], NAMES[sides.right]]; };
    const clearSlice = () => { S.kTo = 0; S.framed = false; for (const m of [sTop, sFront, sBack, sEnds]) { m.geometry.dispose(); m.geometry = new THREE.BufferGeometry(); } aForm.concat(aPlates, [aSlice], aEnds).forEach((t) => t.setOn(false)); mark.visible = cutLine.visible = false; };
    function paintSlice() {
      const pk = S.pick, g = faceCv.getContext('2d'), w = faceCv.width, hh = faceCv.height, n = pk.pr.length, X = (i) => (i / (n - 1)) * w, Y = (y) => hh - (y / 0.1) * hh, base = Y(SL.base);
      g.clearRect(0, 0, w, hh);
      const geom = sectionGeometry(pk.pr, sectionSides(pk.line).subLeft, w, hh);
      // 软流层
      const asth = g.createLinearGradient(0, hh * 0.55, 0, hh); asth.addColorStop(0, '#d9a25c'); asth.addColorStop(1, '#c46a32'); g.fillStyle = asth; g.fillRect(0, 0, w, hh);
      g.fillStyle = '#5a4a3a'; g.font = '600 26px "PingFang SC", sans-serif'; g.textAlign = 'left'; g.fillText('软流层（主体固态）', 14, hh - 6);
      const band = (x0, x1, top, bottom, cl) => { const xs = []; for (let x = x0; x < x1; x += 2) xs.push(x); xs.push(x1); g.fillStyle = cl; g.beginPath(); xs.forEach((x, i) => i ? g.lineTo(x, top(x)) : g.moveTo(x, top(x))); xs.reverse().forEach((x) => g.lineTo(x, bottom(x))); g.closePath(); g.fill(); };
      const crust = (x0, x1, thick, cl) => band(x0, x1, geom.surface, (x) => geom.bottom(x, thick), cl);
      const arrow = (x, y, dx, dy, cl = '#ffffff') => { g.strokeStyle = cl; g.fillStyle = cl; g.lineWidth = 8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx, y + dy); g.stroke(); const a = Math.atan2(dy, dx); g.beginPath(); g.moveTo(x + dx + Math.cos(a) * 16, y + dy + Math.sin(a) * 16); g.lineTo(x + dx + Math.cos(a + 2.4) * 18, y + dy + Math.sin(a + 2.4) * 18); g.lineTo(x + dx + Math.cos(a - 2.4) * 18, y + dy + Math.sin(a - 2.4) * 18); g.fill(); };
      const k = pk.c, mid = w / 2;
      if (k === 'SUB') {
        const oL = sectionSides(pk.line).subLeft, sign = oL ? 1 : -1;
        const upperBottom = (x) => Math.min(geom.bottom(x, 80), geom.slab(x));
        band(oL ? mid : 0, oL ? w : mid, geom.surface, upperBottom, '#b89a74');
        band(oL ? mid : 0, oL ? w : mid, upperBottom, geom.slab, '#ddb77c');          // 地幔楔位于上覆岩石圈与下插板片之间
        band(0, w, geom.slab, (x) => geom.slab(x) + 50, '#4f5f74');          // 海底以下保持连续厚度，进入边界后向下倾斜
        const ax = oL ? 120 : w - 120, wx = mid + sign * 180, wy = (upperBottom(wx) + geom.slab(wx)) / 2;
        arrow(ax, geom.slab(ax) + 25, sign * 100, geom.slab(ax + sign * 100) - geom.slab(ax));
        g.fillStyle = '#d8462c'; g.beginPath(); g.ellipse(wx, wy, 24, Math.min(12, (geom.slab(wx) - upperBottom(wx)) / 4), 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ffffff'; g.font = '600 20px "PingFang SC", sans-serif'; g.textAlign = 'center';
        g.fillText('下插板片', mid + sign * 200, Math.min(hh - 40, geom.slab(mid + sign * 200) + 34)); g.fillText('地幔楔', wx - sign * 10, wy - 20); g.textAlign = sign > 0 ? 'left' : 'right'; g.fillText('局部部分熔融', wx + sign * 30, wy + 6); g.textAlign = 'center';          // 三处字错开，不叠在一起
        arrow(wx - sign * 35, geom.slab(wx) - 8, sign * 20, -24, '#d0e6f3');          // 板片释放流体，促进上覆地幔楔局部部分熔融
      } else if (k === 'CCB' || k === 'OCB') {
        crust(0, mid, hh * 0.36, '#c0a27a'); crust(mid, w, hh * 0.36, '#b4946c');
        g.fillStyle = '#a8865e'; g.beginPath(); g.ellipse(mid, base + hh * 0.33, 200, 80, 0, 0, Math.PI); g.fill();          // 汇聚挤压示意，不据类别推断大陆碰撞、海沟或火山
        g.strokeStyle = 'rgba(70,50,30,0.5)'; g.lineWidth = 3; for (let j = 0; j < 5; j++) { g.beginPath(); for (let x = mid - 260; x <= mid + 260; x += 10) { const y = base + 40 + j * 26 - 50 * Math.exp(-(((x - mid) / 150) ** 2)) + 10 * Math.sin(x / 30); x === mid - 260 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }          // 褶皱的岩层
        arrow(110, base + 70, 130, 0); arrow(w - 110, base + 70, -130, 0); g.fillStyle = '#ffffff'; g.font = '600 24px sans-serif'; g.textAlign = 'center'; g.fillText(pk.preset?.[0] === '喜马拉雅山' ? '大陆碰撞：挤压、增厚' : '汇聚挤压（不自动推断俯冲）', mid, base + 180);
      } else if (k === 'OSR' || k === 'CRB') {
        crust(0, mid - 6, hh * (k === 'OSR' ? 0.12 : 0.3), k === 'OSR' ? '#4f5f74' : '#b89a74'); crust(mid + 6, w, hh * (k === 'OSR' ? 0.12 : 0.3), k === 'OSR' ? '#4f5f74' : '#b4946c');
        if (k === 'OSR') { g.fillStyle = '#e0542c'; g.beginPath(); g.moveTo(mid - 30, hh); g.quadraticCurveTo(mid - 8, base + 60, mid, base + 10); g.quadraticCurveTo(mid + 8, base + 60, mid + 30, hh); g.fill(); }          // 洋中脊岩浆补充；大陆张裂不默认画成岩浆裂隙
        const ay = (x0, x1) => Math.max(geom.surface(x0), geom.surface(x1), base) + 36; arrow(mid - 80, ay(mid - 210, mid - 80), -130, 0); arrow(mid + 80, ay(mid + 80, mid + 210), 130, 0);          // 箭头画在当地海底以下的岩石圈里，不被裁掉
      } else {
        crust(0, w, hh * 0.2, '#8a8070'); g.fillStyle = '#ffffff'; g.font = '600 26px "PingFang SC", sans-serif'; g.textAlign = 'center'; g.fillText('两侧板块沿着边界水平错动（从侧面看不出相向、相离）', mid, base + 80);
      }
      g.strokeStyle = 'rgba(255,255,255,0.6)'; g.setLineDash([10, 8]); g.lineWidth = 3; g.beginPath(); g.moveTo(0, base); g.lineTo(w, base); g.stroke(); g.setLineDash([]);          // 海平面
      g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); for (let x = w; x >= 0; x -= 2) g.lineTo(x, geom.surface(x)); g.closePath(); g.fill(); g.restore();
      faceTex.needsUpdate = true;
    }

    // ---- 转动地球：拖着转；选中一个点时，地球转过去让它朝着镜头 ----
    const camDirLocal = () => { const c = new THREE.Vector3(); camera.getWorldPosition(c); const p = new THREE.Vector3(); pivot.getWorldPosition(p); const d = c.sub(p).normalize(); const q = new THREE.Quaternion(); pivot.getWorldQuaternion(q); return d.applyQuaternion(q.invert()); };
    const frame = (f, upHint) => { const u = upHint.clone().sub(f.clone().multiplyScalar(upHint.dot(f))).normalize(), r = new THREE.Vector3().crossVectors(u, f); return new THREE.Matrix4().makeBasis(r, u, f); };
    const turnTo = (lat, lon) => { const v = new THREE.Vector3(...ll2v(lat, lon)), to = camDirLocal(); const src = frame(v, new THREE.Vector3(0, 1, 0)), dst = frame(to, new THREE.Vector3(0, 1, 0)); S.target = new THREE.Quaternion().setFromRotationMatrix(dst.multiply(src.invert())); };          // 把这一点转到正对镜头，北方朝上
    // 地球主探索：转到切开的地方，切线横着摆（和切片的左右一致：左边是剖面的负一侧）
    const turnToCut = (lat, lon, strike) => {
      const la = lat * Math.PI / 180, lo = lon * Math.PI / 180, b = (strike + 90) * Math.PI / 180;
      const v = new THREE.Vector3(...ll2v(lat, lon)), east = new THREE.Vector3(-Math.sin(lo), 0, -Math.cos(lo)), north = new THREE.Vector3(-Math.sin(la) * Math.cos(lo), Math.cos(la), Math.sin(la) * Math.sin(lo));
      const t = north.multiplyScalar(Math.cos(b)).add(east.multiplyScalar(Math.sin(b))).normalize();
      const q = new THREE.Quaternion(); pivot.getWorldQuaternion(q); const qi = q.clone().invert();
      const f2 = camDirLocal(), r2 = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).applyQuaternion(qi); r2.sub(f2.clone().multiplyScalar(r2.dot(f2))).normalize();
      const basis = (r, f) => new THREE.Matrix4().makeBasis(r, new THREE.Vector3().crossVectors(f, r), f);
      S.target = new THREE.Quaternion().setFromRotationMatrix(basis(r2, f2).multiply(basis(t, v).invert()));
    };
    const tHint = tag('<span>拖着地球转一转</span><small>在红线、绿线或灰线上点一下，切开看</small>', 'hint');
    noteBadge(tag, '地表：ETOPO1 地形模型采样值（0.25°，赤道约28千米，可能漏掉狭窄峰谷）；分层设色不表示冰盖。竖向夸大，地下机制和尺寸为示意。大字为课本六大板块，线为 PB2002 详细边界。').loc(block, GC.x - R, 0.004, 0.06);
    const labels = [...plateL, ...aForm, ...aPlates, aSlice, aBlank, aHover, ...aEnds];

    // ---- 侧栏：剖面（ETOPO1 模型采样）；看过的几种边界 ----
    const drawChart = () => {
      if (!W) return; const c = W.chart, g = c.getContext('2d'), w = c.width, hh = c.height, pk = S.pick;
      g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, hh); g.textBaseline = 'middle'; g.font = '600 12px "PingFang SC", sans-serif'; g.fillStyle = '#3a3226'; g.textAlign = 'left';
      if (!pk) { g.fillText(terrain.status === 'loading' ? '地形数据加载中，暂无高程结论' : terrain.status === 'failed' ? '地形数据不可用' : '在边界上点一下，查看 ETOPO1 剖面', 8, hh / 2); return; }
      const L = 40, Rr = w - 8, T = 22, B = hh - 24, X = (s) => L + ((s + 1200) / 2400) * (Rr - L), Y = (m) => T + ((9000 - m) / 20000) * (B - T);
      g.fillText(`${CLASS[pk.c].name}（${pairName(pk.pair)}）`, 6, 10);
      g.font = '11px "PingFang SC", sans-serif'; g.fillStyle = '#7a705e'; g.textAlign = 'right'; for (const m of [-10000, -5000, 0, 5000]) { g.fillText(`${m / 1000}`, L - 4, Y(m)); g.strokeStyle = m === 0 ? 'rgba(42,90,154,0.5)' : 'rgba(60,50,40,0.08)'; g.beginPath(); g.moveTo(L, Y(m)); g.lineTo(Rr, Y(m)); g.stroke(); }
      g.save(); g.translate(10, (T + B) / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText('海拔（千米）', 0, 0); g.restore();
      g.beginPath(); pk.pr.forEach((p, i) => (i ? g.lineTo(X(p.s), Y(p.h)) : g.moveTo(X(p.s), Y(p.h)))); g.lineTo(X(1200), B); g.lineTo(X(-1200), B); g.closePath(); g.fillStyle = '#c9b48a'; g.fill();
      g.fillStyle = 'rgba(63,127,184,0.35)'; g.beginPath(); pk.pr.forEach((p, i) => { const y = Y(Math.min(0, p.h)); i ? g.lineTo(X(p.s), y) : g.moveTo(X(p.s), Y(0)); }); g.lineTo(X(1200), Y(0)); g.closePath(); g.fill();
      g.strokeStyle = '#d8342c'; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(X(0), T); g.lineTo(X(0), B); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#7a705e'; g.textAlign = 'center'; g.fillText('−1200 千米', X(-1200) + 20, B + 12); g.fillText('边界', X(0), B + 12); g.fillText('1200 千米', X(1200) - 22, B + 12);
      const hi = pk.pr.reduce((a, b) => (b.h > a.h ? b : a)), lo = pk.pr.reduce((a, b) => (b.h < a.h ? b : a)); g.textAlign = 'right'; g.fillStyle = '#3a3226'; g.fillText(`最高约 ${roundedHeight(hi.h)} 米，最低约 ${roundedHeight(lo.h)} 米`, Rr, T + 4);
    };
    const drawLog = () => {
      if (!W) return; const rows = [], r = (b, t) => rows.push(h('div', { class: 'tl-row' }, h('b', {}, b), h('span', {}, t)));
      for (const k of Object.keys(KINDS)) if (S.seen.has(k)) r(`${KINDS[k]}：`, `${CLASS[k].form}——${CLASS[k].how}`);
      if (S.seen.size >= 3) r('合起来看：', OVERVIEW);
      W.log.replaceChildren(...rows); if (S.seen.size >= 3 && (S.seen.has('CCB') || S.seen.has('SUB'))) W.ui.unlock();
    };

    // ---- 轮流当主角：切开以后切片放大到中间，地球缩小退到左后方；“收起切片”换回来（“回到地球”留给地球主探索：回到这本书的地球目录） ----
    const backToGlobe = () => { S.kTo = 0; S.framed = false; if (W) W.backBtn.style.display = 'none'; W?.ui.status('收起了切片，地球又在中间了。再在别的边界上点一下，切开看。'); };
    const tBack = tag('<span>收起切片</span>', 'view', backToGlobe);
    const ease = (x) => x * x * (3 - 2 * x), vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3(), base0 = new THREE.Vector3(GC.x, 0, 0);
    const stepView = (dt) => {
      if (S.preview > 0) { S.preview -= dt; if (S.target) S.preview = Math.max(S.preview, 0.45); }          // 地球主探索：先转好、看清切线，再拉出切片
      const hold = S.preview > 0, sp = dt * 1.4; S.k = hold ? S.k : S.kTo > S.k ? Math.min(S.kTo, S.k + sp) : Math.max(S.kTo, S.k - sp); S.e = S.kTo ? Math.min(1, S.e + (!hold && S.k > 0.35 ? sp * 1.2 : 0)) : Math.max(0, S.e - sp * 1.6);          // 先让地球退开，切片再拉出来；回去时切片先缩回去
      const k = ease(S.k);
      if (home) { const g = (home.r + (home.retreat.r - home.r) * k) / R; globeG.scale.setScalar(g); vA.copy(home.pos).lerp(home.retreat.pos, k); globeG.position.copy(vA).addScaledVector(GC, -g); }          // 地球在书的后上方：切片出来时稍微抬高、缩小一点
      else { const sc = 1 - (1 - CUT.s) * k; globeG.scale.setScalar(sc); vA.copy(base0).lerp(CUT.globe, k); globeG.position.copy(vA).addScaledVector(base0, -sc); }
      const e = ease(S.e); slice.visible = !!S.pick && S.e > 0.001;
      if (slice.visible) { mark.getWorldPosition(vB); block.worldToLocal(vB); slice.position.copy(vB).lerp(home ? SLICE_ON_BOOK : CUT.slice, e); slice.scale.setScalar(0.04 + 0.96 * e); }          // 地球主探索：落在两页正中          // 从地球上切开的那一点拉出来，长大、落到画面中间
      const tOn = slice.visible && e > 0.25 && cutLine.visible; tether.material.opacity = tOn ? 0.85 * Math.min(1, (e - 0.25) / 0.4) : 0;
      if (tOn) { const P = cutLine.geometry.attributes.position, n = S.pick.pr.length, a = vA.fromBufferAttribute(P, 0), pts = []; for (const [idx, i] of [[0, 0], [P.count - 1, n - 1]]) { vC.fromBufferAttribute(P, idx); earthRot.localToWorld(vC); block.worldToLocal(vC); const end = slice.localToWorld(new THREE.Vector3(i ? SL.w / 2 : -SL.w / 2, SV(S.pick.pr[i].h), SL.d / 2)); block.worldToLocal(end); pts.push(vC.x, vC.y, vC.z, end.x, end.y, end.z); } void a; tether.geometry.dispose(); tether.geometry = new THREE.BufferGeometry(); tether.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); tether.computeLineDistances(); }
      if (home) tBack.loc(block, home.retreat.pos.x + home.retreat.r * 1.25, home.retreat.pos.y - home.retreat.r * 0.75, home.retreat.pos.z).show(S.kTo === 1 && S.k > 0.95);          // 右下边（左边是“看法”按钮）
      else tBack.loc(block, CUT.globe.x, GC.y * CUT.s * 2 + 0.03, CUT.globe.z).show(S.kTo === 1 && S.k > 0.95);
      if (!S.framed && S.k === S.kTo && (S.kTo ? S.e === 1 : S.e === 0)) { S.framed = true; reframe?.(); }          // 换好了：镜头按现在的东西重新取景
    };

    // ---- 指针：拖地球转；点一下选边界 ----
    let down = null; const q0 = new THREE.Quaternion();
    const pointer = {
      down(rc, e) { if (!rc.intersectObject(globe, false).length) return false; down = { x: e?.clientX ?? 0, y: e?.clientY ?? 0, moved: false, rc }; q0.copy(earthRot.quaternion); S.target = null; showHover(null); document.getElementById('c').style.cursor = 'grabbing'; return true; },
      move(rc, e) {
        const c = document.getElementById('c');
        if (!down) { const ht = rc.intersectObject(globe, false)[0]; if (c) c.style.cursor = ht ? 'pointer' : ''; if (ht && terrain.status === 'ready') { const l = earthRot.worldToLocal(ht.point.clone()).normalize(), [la, lo] = v2ll([l.x, l.y, l.z]), nb = nearest(la, lo); showHover(nb && nb.dist <= 600 ? nb : null, new THREE.Vector3(...ll2v(nb?.lat ?? la, nb?.lon ?? lo)).multiplyScalar(R)); } else showHover(null); return !!ht; }
        const dx = (e?.clientX ?? 0) - down.x, dy = (e?.clientY ?? 0) - down.y; if (Math.hypot(dx, dy) > 4) down.moved = true;
        const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * 0.008), qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * 0.006); earthRot.quaternion.copy(qy.multiply(qx).multiply(q0)); S.moved = true; return true;
      },
      up(rc) {
        if (!down) return false; const d = down; down = null; document.getElementById('c').style.cursor = '';
        if (!d.moved) { const hit = (rc || d.rc).intersectObject(globe, false)[0]; if (hit) { const l = earthRot.worldToLocal(hit.point.clone()).normalize(), [lat, lon] = v2ll([l.x, l.y, l.z]); S.moved = true; choose(lat, lon); } }
        return true;
      },
    };
    earthRot.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -1.5);          // 一开始亚洲朝着镜头

    let home = null;
    loadElevation(Promise.resolve(HEIGHT));
    return {
      group,
      globe,
      // 地球主探索：地球摆在书后上方的那个位置（活页自己的坐标）；朝向接着刚才那颗地球
      worldHome: (h2) => { home = { pos: h2.pos.clone(), r: h2.r, retreat: { pos: h2.retreat.pos.clone(), r: h2.retreat.r } }; if (h2.q) earthRot.quaternion.copy(h2.q); S.target = null; stepView(0); },
      sliceOut: () => S.kTo === 1,
      sliceIn: () => backToGlobe(),
      slice,
      // 回到地球再进来：切开的地方、看过的边界、地球的朝向都还在
      save: () => ({ pick: S.pick ? { lat: S.pick.lat, lon: S.pick.lon, preset: S.pick.preset?.[0] ?? null } : null, k: S.kTo, rot: earthRot.quaternion.toArray(), seen: [...S.seen] }),
      restore: (st) => {
        if (!st) return; S.seen = new Set(st.seen || []); S.moved = true;
        if (st.pick) { const pr = PRESETS.find((p) => p[0] === st.pick.preset) || null; choose(st.pick.lat, st.pick.lon, pr); S.preview = 0; if (st.k) { S.k = S.e = 1; } else { S.kTo = 0; S.k = S.e = 0; if (W) W.backBtn.style.display = 'none'; } }
        earthRot.quaternion.fromArray(st.rot); S.target = null; drawLog(); stepView(0);
      },
      // 地球主探索：从别的活页带着地方进来（如垂直地带性的喜马拉雅）；where：现在切开的是哪个案例
      goPlace: (name) => { const pr = PRESETS.find((p) => p[0] === name); if (pr) { S.moved = true; choose(pr[1], pr[2], pr); } },
      where: () => S.pick?.preset?.[0] ?? null,
      card: false,
      emerge: 'flat',          // 课本的图平放在书页上，模型从它上面长出来、它慢慢淡掉
      place: 'spread',          // 放在两页正中、按整个对开页放大（切片落在两页中间）
      size: { w: 0.34, d: 0.2, h: 0.2 },
      view: { elev: 16, azim: 8, lookY: 0.5, frameMargin: 1.06 },
      pointer,
      debug: { S, pick: (lat, lon) => choose(lat, lon), snapshot: () => ({ status: terrain.status, pick: S.pick, pending }), reloadHeight: (promise = Promise.resolve(HEIGHT)) => loadElevation(promise) },
      mount(ui) {
        const pre = buttons(PRESETS.map((preset) => ({ text: preset[0], ghost: true, onClick: () => { S.moved = true; choose(preset[1], preset[2], preset); } })));
        const acts = buttons([{ text: '收起切片', onClick: backToGlobe }, { text: '重来', ghost: true, onClick: () => { ui.relock?.(); S.pick = null; pending = null; S.seen.clear(); S.moved = false; clearSlice(); S.e = 0; slice.visible = false; earthRot.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -1.5); drawChart(); drawLog(); ui.status(terrain.status === 'ready' ? START : terrain.status === 'failed' ? 'ETOPO1 地形数据不可用，暂无高程结论。' : 'ETOPO1 地形数据加载中，暂无高程结论。'); } }]);
        const chart = h('canvas', { class: 'wx-map', width: 320, height: 190 }), log = h('div', { class: 'timeline' });
        const sw = (c, t) => `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${c};vertical-align:-1px;margin:0 3px 0 8px"></span>${t}`;
        const legend = h('div', { class: 'note', html: `切片顶面的颜色只表示高程（米）：${sw('#3d6f95', '<−3000')}${sw('#5d8fae', '<0')}${sw('#7fa25c', '<800')}${sw('#a59a6a', '<2000')}${sw('#9a8064', '<4500')}${sw('#e9e7e2', '>4500')}` });          // 色标：白色只表示海拔高，不表示冰雪
        ui.controls.append(h('div', { class: 'bar-title' }, '剖面：ETOPO1 采样（约数）'), chart, legend, h('div', { class: 'bar-title' }, '也可以直接去这些地方'), pre.el, acts.el, note('红线是生长边界，绿线是汇聚边界（含俯冲），灰线是转换边界。箭头朝外是相离，朝里是相向。'));
        ui.controls.append(h('a', { href: 'https://coastwatch.pfeg.noaa.gov/erddap/info/etopo180/index.html', target: '_blank', rel: 'noopener' }, 'ETOPO1 数据来源'), h('br'), h('a', { href: 'https://github.com/fraxen/tectonicplates/blob/master/original/README.md', target: '_blank', rel: 'noopener' }, 'PB2002 分类与极性说明'));
        ui.data.append(h('div', { class: 'bar-title' }, '你看到了什么'), log);
        W = { ui, chart, log, backBtn: acts.btns[0] }; acts.btns[0].style.display = 'none';          // “收起切片”只在切开以后出现
        ui.status(terrain.status === 'ready' ? START : 'ETOPO1 地形数据加载中，暂无高程结论。'); drawChart(); drawLog();
      },
      update(dt) {
        labels.forEach((l) => l.tick(dt));
        if (S.target) { earthRot.quaternion.slerp(S.target, Math.min(1, dt * 3)); if (earthRot.quaternion.angleTo(S.target) < 0.002) S.target = null; }
        const cd = camDirLocal(); for (const l of plateL) { const n = l.userData.n.clone().applyQuaternion(earthRot.quaternion); l.userData.want = n.dot(cd) > 0.25 ? 1 : 0; }          // 转到背面的板块名字藏起来
        if (home) tHint.loc(block, home.pos.x, home.pos.y - home.r * 1.18, home.pos.z + home.r).show(!S.moved); else tHint.loc(block, GC.x - R * 1.25, GC.y + R * 0.5, 0).show(!S.moved); stepView(dt);          // 地球主探索：提示写在地球下面（左边是“看法”按钮）
        if (S.k > 0.5) for (const l of plateL) l.userData.want = 0;          // 地球缩小当配角时，板块名字先收起来
      },
    };
  },
};
const START = '课本图 2.20 立了起来：一颗展示 ETOPO1 地形模型的地球，红、绿、灰线为 PB2002 详细边界。<b>拖着地球转一转</b>，看看最高的山、最深的海沟在哪；再在边界上点一下，切开看。';
