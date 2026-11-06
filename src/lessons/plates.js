// 高中地理 选择性必修1 第二章第二节 构造地貌的形成 · 板块运动与地貌（课本第 29 页，图 2.20 六大板块分布示意、图 2.21 板块的相向运动；第 30 页案例 红海的形成）。
//
// 一个问题（课本开头）：陆地上大规模的山系、高原，海底延绵的山脉和狭长的海沟是如何形成的？
// 课本的图就是模型：图 2.20 那张板块分布图，立起来成了一颗真实的地球——地形是实测的（陆地的山、海底的海岭和海沟都在），
// 上面画着六大板块和它们的边界：红的是生长边界，绿的是消亡边界（和课本图 2.20 一样），灰的是课本没讲的错动边界。
// 学生亲手做的：
//   1. 转动地球，看最高的山、最深的海沟、海底的山脉都在哪：几乎都在板块边界上，板块内部平稳。
//   2. 在任意一条边界上点一下，就沿着垂直于边界的方向切开：旁边立起一块“切片”，上面是这里真实的地形（实测，竖直方向夸大），
//      下面画着两块板块怎么动（图 2.21）。喜马拉雅、安第斯山、大西洋中脊、东非裂谷……这里、那里一比，就知道相向、相离各形成什么。
// 数据：NOAA ETOPO1（公有领域）、Bird (2003) PB2002 板块边界；tools/geo/plates_prep.py 生成，tools/geo/plates_check.mjs 核对。
// 教学示意：竖直方向大大夸大了；六大板块是课本的划分，把 PB2002 里的小板块并了进去；不画国界。
import * as THREE from 'three';
import { buttons, note } from './kit/ui.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { h } from '../ui/Panel.js';
import { airLabel, noteBadge } from './kit/labels.js';
import { NAMES, CLASS, ll2v, v2ll, profile, bearing } from './kit/plates.js';
import LINES from './data/plates.js';
import reliefUrl from './data/earth_relief.jpg';
import heightUrl from './data/earth_height.png';

const R = 0.085, GC = new THREE.Vector3(-0.07, R + 0.022, 0), EXAG = 0.0042 / 9000;          // 地球半径、球心；1 米抬高多少（夸大，约 40 倍）
const SL = { x: 0.105, w: 0.13, d: 0.04, base: 0.05 };          // 右边那块切片：中心、宽、厚、海平面在多高
const PRESETS = [['喜马拉雅山', 28.5, 85.2, '亚欧板块和印度洋板块相碰撞'], ['安第斯山', -21, -70.6, '美洲板块和太平洋板块'], ['大西洋中脊', -30, -13.5, '大西洋中间'], ['东非裂谷', 5, 36.6, '非洲板块内部张裂'], ['日本海沟', 38, 143.5, '亚欧板块和太平洋板块']];
const KINDS = { CCB: '大陆与大陆碰撞', SUB: '大洋板块俯冲', OSR: '大洋中脊', CRB: '大陆裂谷' };

export default {
  id: 'plates',
  fig: '图2.20',
  title: '板块运动与地貌',
  flow: 'explore',
  ask: '陆地上大规模的山系、高原，海底延绵的山脉和狭长的海沟，是怎样形成的？为什么它们几乎都排在一条条线上？',
  need: '转动地球，看看高山、海沟、海底的山脉在哪；再在几种边界上点一下切开看：大陆和大陆碰撞、大洋板块俯冲、大洋中脊、大陆裂谷',
  conclusion: {
    page: 33,
    quote: '板块构造学说认为，地球岩石圈是刚性的，破碎成为多个不规则的块体，即板块。这些板块覆盖于熔融的软流层之上，一直处于缓慢的、不断的运动之中。板块间的相互运动主要有相向、相离等形式，并因此产生不同的地貌形态。板块内部相对稳定，两个板块之间的交界处是地壳比较活跃的地带。……当大洋板块与大陆板块相碰撞时，大洋板块俯冲到大陆板块下方，俯冲边界处形成海沟，大陆板块边缘形成海岸山脉或岛弧。当大陆板块与大陆板块相碰撞时，相互挤压并抬升形成巨大的褶皱山系。青藏高原的抬升就是亚欧板块和印度洋板块相碰撞所造成的。……板块相离运动形成裂谷、海洋。',
    why: '地球表面最壮观的地形，大多排在板块的交界处：两块板块相向运动，大陆撞大陆，就挤出喜马拉雅山、青藏高原这样巨大的褶皱山系、高原；大洋板块撞大陆板块，大洋板块俯冲下去，俯冲处是又窄又深的海沟，大陆一侧是安第斯山那样的海岸山脉，大洋撞大洋则形成岛弧。两块板块相离运动，岩浆从中间涌上来，大洋里形成延绵的海岭（大洋中脊），大陆上张裂成东非那样的裂谷，继续张裂可能成为新的海洋（像红海）。板块内部相对稳定，地形就平缓得多。',
    src: '课本第 29—30 页 · 第二章 第二节 构造地貌的形成',
  },

  create({ tag, camera }) {
    const group = new THREE.Group(), block = new THREE.Group(); group.add(block);
    const S = { pick: null, seen: new Set(), drag: null, moved: false, rot: new THREE.Quaternion(), target: null };
    let W = null, hgtData = null, HW = 0, HH = 0;
    const hgt = (lat, lon) => { if (!hgtData) return 0; const x = Math.min(HW - 1, Math.max(0, Math.round(((lon + 180) / 360) * (HW - 1)))), y = Math.min(HH - 1, Math.max(0, Math.round(((90 - lat) / 180) * (HH - 1)))); return hgtData[y * HW + x]; };

    // ---- 地球：真实地形的晕渲贴图；顶点按高度往外推（夸大） ----
    const pivot = new THREE.Group(); pivot.position.copy(GC); block.add(pivot);
    const earthRot = new THREE.Group(); pivot.add(earthRot);
    const tex = new THREE.TextureLoader().load(reliefUrl); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const geo = new THREE.SphereGeometry(R, 360, 180);
    const globe = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0 })); earthRot.add(globe);
    const img = new Image(); img.src = heightUrl;
    img.onload = () => {
      const c = document.createElement('canvas'); HW = c.width = img.width; HH = c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, HW, HH).data; hgtData = new Float32Array(HW * HH); for (let i = 0; i < HW * HH; i++) hgtData[i] = (d[i * 4] / 255) * 20000 - 11000;          // 8 位就够看：每级约 80 米
      const p = geo.attributes.position, uv = geo.attributes.uv, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) { const u = uv.getX(i), w = uv.getY(i), e = hgt(w * 180 - 90, u * 360 - 180); v.fromBufferAttribute(p, i).normalize().multiplyScalar(R + e * EXAG * (e < 0 ? 0.55 : 1)); p.setXYZ(i, v.x, v.y, v.z); }          // 海底往里压得轻一点：海太深会显得坑坑洼洼
      p.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere(); if (S.pick) choose(S.pick.lat, S.pick.lon, true);
    };
    const atm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.035, 64, 32), new THREE.MeshBasicMaterial({ color: 0x9cc6ef, transparent: true, opacity: 0.12, side: THREE.BackSide, depthWrite: false })); atm.raycast = () => {}; pivot.add(atm);          // 一圈淡淡的大气
    { const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.008, 48), new THREE.MeshStandardMaterial({ color: 0x8a6a40, metalness: 0.5, roughness: 0.4 })); stand.position.set(GC.x, 0.004, 0); block.add(stand); const ring = new THREE.Mesh(new THREE.TorusGeometry(R * 0.36, 0.0018, 8, 48), stand.material); ring.rotation.x = Math.PI / 2; ring.position.set(GC.x, 0.009, 0); block.add(ring); const post = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.005, 0.016, 16), stand.material); post.position.set(GC.x, 0.014, 0); block.add(post); }          // 一个铜座托着

    // ---- 板块边界：红生长、绿消亡、灰错动；箭头画在边界两侧，朝外（相离）或朝里（相向） ----
    const COL = { grow: 0xd8342c, die: 0x23a04e, slide: 0x8a8e96 };
    const bnd = { grow: [], die: [], slide: [] }, arrowsP = { grow: [], die: [] };
    const onR = (lat, lon, k = 1.03) => { const [x, y, z] = ll2v(lat, lon); return [x * R * k, y * R * k, z * R * k]; };
    LINES.forEach((l, li) => {
      const arr = bnd[l.k]; for (let i = 0; i < l.pts.length - 1; i++) { const a = l.pts[i], b = l.pts[i + 1]; if (Math.abs(a[0] - b[0]) > 180) continue; arr.push(...onR(a[1], a[0]), ...onR(b[1], b[0])); }
      if (l.k !== 'slide' && li % 7 === 0 && l.pts.length >= 2) { const m = l.pts[l.pts.length >> 1], n2 = l.pts[Math.min(l.pts.length - 1, (l.pts.length >> 1) + 1)], az = bearing(m[1], m[0], n2[1], n2[0]); arrowsP[l.k].push([m[1], m[0], az]); }
    });
    for (const k in bnd) { const g2 = new LineSegmentsGeometry(); g2.setPositions(bnd[k]); const ln = new LineSegments2(g2, new LineMaterial({ color: COL[k], linewidth: k === 'slide' ? 1.3 : 2.6, worldUnits: false, transparent: k === 'slide', opacity: k === 'slide' ? 0.6 : 1 })); ln.raycast = () => {}; earthRot.add(ln); }          // 线按屏幕像素粗细画：远近一样清楚
    const arrowGeo = new THREE.ConeGeometry(0.0011, 0.0036, 8).rotateX(Math.PI / 2);          // 尖朝 +z
    for (const k of ['grow', 'die']) {
      const list = arrowsP[k], im = new THREE.InstancedMesh(arrowGeo, new THREE.MeshBasicMaterial({ color: COL[k] }), list.length * 2), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); im.raycast = () => {};
      list.forEach(([lat, lon, az], i) => { for (const sd of [1, -1]) { const off = 0.03, [la2, lo2] = [lat, lon], p0 = new THREE.Vector3(...ll2v(la2, lo2)), east = new THREE.Vector3(-Math.sin(lon * Math.PI / 180), 0, -Math.cos(lon * Math.PI / 180)), north = new THREE.Vector3().crossVectors(p0, east).normalize().negate(), along = north.clone().multiplyScalar(Math.cos(az * Math.PI / 180)).add(east.clone().multiplyScalar(Math.sin(az * Math.PI / 180))), across = new THREE.Vector3().crossVectors(p0, along).normalize().multiplyScalar(sd); const pos = p0.clone().addScaledVector(across, off).normalize().multiplyScalar(R * 1.035), dir = k === 'grow' ? across : across.clone().negate(); q.setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(), dir, pos.clone().normalize())); m4.compose(pos, q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i * 2 + (sd > 0 ? 0 : 1), m4); } });          // 生长边界：箭头背离边界；消亡边界：箭头指向边界
      earthRot.add(im);
    }
    // 板块的名字（只在朝着镜头的那一面显示）
    const plateL = [['EU', 52, 78], ['AF', 4, 18], ['AM', 15, -88], ['PA', 2, -158], ['IN', -26, 118], ['AN', -78, 40]].map(([k, la, lo]) => { const l = airLabel(earthRot, NAMES[k], { h: 0.0068, color: '#1c2a44' }); l.position.set(...onR(la, lo, 1.06)); l.userData.n = new THREE.Vector3(...ll2v(la, lo)); return l; });

    // ---- 选中的点和切线 ----
    const mark = new THREE.Mesh(new THREE.SphereGeometry(0.0024, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffd23a })); mark.visible = false; earthRot.add(mark);
    const cutLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffd23a })); cutLine.visible = false; cutLine.raycast = () => {}; earthRot.add(cutLine);
    // ---- 切片：上面是实测地形（夸大），前面画着两块板块怎么动 ----
    const slice = new THREE.Group(); slice.position.set(SL.x, 0, 0); block.add(slice);
    const faceCv = document.createElement('canvas'); faceCv.width = 1024; faceCv.height = 512; const faceTex = new THREE.CanvasTexture(faceCv); faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 8;
    const sFront = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ map: faceTex, side: THREE.DoubleSide, transparent: true })); slice.add(sFront);
    const sTop = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); slice.add(sTop);
    const sSea = new THREE.Mesh(new THREE.BoxGeometry(SL.w, 0.0005, SL.d), new THREE.MeshLambertMaterial({ color: 0x3f7fb8, transparent: true, opacity: 0.5, depthWrite: false })); sSea.position.y = SL.base; sSea.renderOrder = 6; slice.add(sSea);
    const sBack = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshLambertMaterial({ color: 0x8a7a66, side: THREE.DoubleSide })); slice.add(sBack);
    const SV = (hm) => SL.base + hm * (0.028 / 9000);          // 切片上 1 米多高（比地球上夸大得更多，切片是近看）
    const blank = new THREE.Mesh(new THREE.BoxGeometry(SL.w, SL.base, SL.d), new THREE.MeshLambertMaterial({ color: 0xd8cbb4, transparent: true, opacity: 0.55 })); blank.position.y = SL.base / 2; slice.add(blank);          // 还没切的时候：一块空白的切片，等着
    const aBlank = airLabel(slice, '在边界上点一下，这里会切开', { x: 0, y: SL.base + 0.012, z: 0, h: 0.0068, color: '#5a5040' });
    const aForm = [0, 1].map(() => airLabel(slice, '', { h: 0.0072, color: '#a8341f', dim: 0 }));
    const aPlates = [0, 1].map(() => airLabel(slice, '', { h: 0.0068, color: '#1c2a44', dim: 0 }));
    const aSlice = airLabel(slice, '', { h: 0.0078, color: '#2c3245', dim: 0 });

    const nearest = (lat, lon) => {          // 最近的边界点；如果附近 150 千米内还有生长或消亡边界，优先它（洋中脊被一段段错动边界切开，点在中脊上时不该选到错动段）
      const p = new THREE.Vector3(...ll2v(lat, lon)), best = { any: null, main: null };
      LINES.forEach((l) => { for (let i = 0; i < l.pts.length; i++) { const q = l.pts[i], d = p.distanceTo(new THREE.Vector3(...ll2v(q[1], q[0]))) * 6371; const n2 = l.pts[Math.min(l.pts.length - 1, i + 1)], n0 = l.pts[Math.max(0, i - 1)], it = { l, lat: q[1], lon: q[0], strike: bearing(n0[1], n0[0], n2[1], n2[0]), dist: d }; if (!best.any || d < best.any.dist) best.any = it; if (l.k !== 'slide' && (!best.main || d < best.main.dist)) best.main = it; } });
      return best.main && best.main.dist < best.any.dist + 150 ? best.main : best.any;
    };
    const choose = (lat, lon, quiet) => {
      const nb = nearest(lat, lon); if (!nb || nb.dist > 600) { W?.ui.status('这里离板块边界太远（板块内部相对稳定）。在红线、绿线或灰线上点一下。'); return; }
      const C = CLASS[nb.l.c], pr = profile(hgt, nb.lat, nb.lon, nb.strike, 1200, 121);
      S.pick = { lat: nb.lat, lon: nb.lon, strike: nb.strike, c: nb.l.c, pair: nb.l.p, pr }; if (KINDS[nb.l.c]) S.seen.add(nb.l.c);
      mark.position.set(...onR(nb.lat, nb.lon, 1.04)); mark.visible = true;
      const cl = [];          // 切线：沿剖面方向画一道黄线
 for (let i = 0; i <= 40; i++) { const s = -1200 + 60 * i, [la2, lo2] = (() => { const D = 6371, d2 = s / D, la = nb.lat * Math.PI / 180, th = (nb.strike + 90) * Math.PI / 180, l2 = Math.asin(Math.sin(la) * Math.cos(d2) + Math.cos(la) * Math.sin(d2) * Math.cos(th)), o2 = nb.lon * Math.PI / 180 + Math.atan2(Math.sin(th) * Math.sin(d2) * Math.cos(la), Math.cos(d2) - Math.sin(la) * Math.sin(l2)); return [l2 * 180 / Math.PI, o2 * 180 / Math.PI]; })(); cl.push(new THREE.Vector3(...onR(la2, lo2, 1.038))); }
      cutLine.geometry.dispose(); cutLine.geometry = new THREE.BufferGeometry().setFromPoints(cl); cutLine.visible = true;
      buildSlice(); turnTo(nb.lat, nb.lon); if (!quiet) { drawChart(); drawLog(); W?.ui.status(`<b>${C.name}</b>（${pairName(nb.l.p)}）：${C.how}。右边立起来的就是这里切开的样子，上面是实测的地形。`); }
    };
    const pairName = (p) => (p.slice(0, 2) === p.slice(2) ? `${NAMES[p.slice(0, 2)]}内部的张裂` : `${NAMES[p.slice(0, 2)]}和${NAMES[p.slice(2)]}`);
    // 切片的几何和前面的示意
    const buildSlice = () => {
      const pk = S.pick; if (!pk) return; blank.visible = false; aBlank.setOn(false); const pr = pk.pr, n = pr.length, X = (i) => -SL.w / 2 + (SL.w * i) / (n - 1);
      const P = [], C2 = [], I = [], col = new THREE.Color();
      for (let i = 0; i < n; i++) { const y = SV(pr[i].h); for (const z of [-SL.d / 2, SL.d / 2]) { P.push(X(i), y, z); col.set(pr[i].h < 0 ? 0x5a7f9a : pr[i].h > 4500 ? 0xe8e6e0 : pr[i].h > 2000 ? 0xa88a66 : 0x8fae64); C2.push(col.r, col.g, col.b); } if (i) { const a = 2 * i - 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
      sTop.geometry.dispose(); sTop.geometry = new THREE.BufferGeometry(); sTop.geometry.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); sTop.geometry.setAttribute('color', new THREE.Float32BufferAttribute(C2, 3)); sTop.geometry.setIndex(I); sTop.geometry.computeVertexNormals();
      const face = (zf) => { const Q = [], U = [], J = []; for (let i = 0; i < n; i++) { const y = SV(pr[i].h); Q.push(X(i), y, zf, X(i), 0, zf); U.push(i / (n - 1), y / 0.1, i / (n - 1), 0); if (i) { const a = 2 * i - 2; J.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } } const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(Q, 3)); g2.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g2.setIndex(J); g2.computeVertexNormals(); return g2; };
      sFront.geometry.dispose(); sFront.geometry = face(SL.d / 2 + 0.0002); sBack.geometry.dispose(); sBack.geometry = face(-SL.d / 2);
      paintSlice();
      // 地貌的名字：最高处、最低处
      let hi = 0, lo = 0; pr.forEach((p, i) => { if (p.h > pr[hi].h) hi = i; if (p.h < pr[lo].h) lo = i; });
      const C = CLASS[pk.c], tagAt = (t, i, k, txt) => { t.position.set(X(i), SV(pr[i].h) + 0.012, SL.d / 2); t.setText(`${txt} ${Math.round(pr[i].h).toLocaleString('en-US').replace(/,/g, ' ')} 米`).setOn(true); void k; };
      aForm.forEach((t) => t.setOn(false));
      if (pk.c === 'SUB' || pk.c === 'OCB') { tagAt(aForm[0], lo, 0, '海沟'); if (pr[hi].h > 0) tagAt(aForm[1], hi, 1, pr[hi].h > 2500 ? '海岸山脉' : '岛弧'); }
      else if (pk.c === 'CCB') tagAt(aForm[0], hi, 0, '褶皱山系');
      else if (pk.c === 'OSR') { const mid = n >> 1; let r = mid; for (let i = mid - 12; i <= mid + 12; i++) if (pr[i].h > pr[r].h) r = i; tagAt(aForm[0], r, 0, '海岭'); }
      else if (pk.c === 'CRB') { const mid = n >> 1; let r = mid; for (let i = mid - 10; i <= mid + 10; i++) if (pr[i].h < pr[r].h) r = i; tagAt(aForm[0], r, 0, '裂谷'); }
      const [A, B] = sideNames(); aPlates[0].position.set(-SL.w / 2 + 0.02, 0.012, SL.d / 2 + 0.002); aPlates[0].setText(A).setOn(true); aPlates[1].position.set(SL.w / 2 - 0.02, 0.012, SL.d / 2 + 0.002); aPlates[1].setText(B).setOn(true);
      aSlice.position.set(0, 0.11, 0); aSlice.setText(`${C.name}：${C.form}`).setOn(true);
    };
    // 切片左边是哪块板块、右边是哪块：看剖面两端的点更靠近边界哪一侧（用 PB2002 两侧板块名按方位粗分）
    const sideNames = () => { const pk = S.pick, a = NAMES[pk.pair.slice(0, 2)], b = NAMES[pk.pair.slice(2)], lowL = avg(pk.pr.slice(0, 40)) < avg(pk.pr.slice(-40)); return sideOrder(a, b, lowL); };
    const avg = (arr) => arr.reduce((s, p) => s + p.h, 0) / arr.length;
    const sideOrder = (a, b, lowLeft) => { const oceanic = ['太平洋板块', '南极洲板块']; if (S.pick.c === 'SUB') { const oa = oceanic.includes(a) && !oceanic.includes(b) ? a : oceanic.includes(b) && !oceanic.includes(a) ? b : null; if (oa) return lowLeft ? [oa, oa === a ? b : a] : [oa === a ? b : a, oa]; } return ['一侧的板块', '另一侧的板块'].map((x, i) => (i ? b : a)); };          // 俯冲带：低（洋底）的那一侧是大洋板块；别的边界两侧的名字按 PB2002 的顺序写（左右不一定对应，示意）
    function paintSlice() {
      const pk = S.pick, g = faceCv.getContext('2d'), w = faceCv.width, hh = faceCv.height, n = pk.pr.length, X = (i) => (i / (n - 1)) * w, Y = (y) => hh - (y / 0.1) * hh, base = Y(SL.base);
      g.clearRect(0, 0, w, hh);
      const lowL = avg(pk.pr.slice(0, 40)) < avg(pk.pr.slice(-40));
      // 软流层
      const asth = g.createLinearGradient(0, hh * 0.55, 0, hh); asth.addColorStop(0, '#d9a25c'); asth.addColorStop(1, '#c46a32'); g.fillStyle = asth; g.fillRect(0, hh * 0.62, w, hh);
      g.fillStyle = '#5a4a3a'; g.font = '600 26px "PingFang SC", sans-serif'; g.textAlign = 'left'; g.fillText('软流层', 14, hh - 18);
      const crust = (x0, x1, thick, cl) => { g.fillStyle = cl; g.beginPath(); for (let x = x0; x <= x1; x += 4) { const i = Math.round((x / w) * (n - 1)), y = Y(SV(pk.pr[Math.max(0, Math.min(n - 1, i))].h)); x === x0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.lineTo(x1, base + thick); g.lineTo(x0, base + thick); g.closePath(); g.fill(); };
      const arrow = (x, y, dx, dy, cl = '#ffffff') => { g.strokeStyle = cl; g.fillStyle = cl; g.lineWidth = 8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx, y + dy); g.stroke(); const a = Math.atan2(dy, dx); g.beginPath(); g.moveTo(x + dx + Math.cos(a) * 16, y + dy + Math.sin(a) * 16); g.lineTo(x + dx + Math.cos(a + 2.4) * 18, y + dy + Math.sin(a + 2.4) * 18); g.lineTo(x + dx + Math.cos(a - 2.4) * 18, y + dy + Math.sin(a - 2.4) * 18); g.fill(); };
      const k = pk.c, mid = w / 2;
      if (k === 'SUB' || k === 'OCB') {
        const oL = lowL, ox0 = oL ? 0 : mid, ox1 = oL ? mid : w;
        crust(oL ? mid : 0, oL ? w : mid, hh * 0.3, '#b89a74');          // 上面那块（大陆或岛弧）
        g.fillStyle = '#4f5f74'; g.beginPath(); g.moveTo(ox0, base + 10); g.lineTo(ox1, base + 10); g.lineTo(oL ? mid + 260 : mid - 260, hh); g.lineTo(oL ? mid + 150 : mid - 150, hh); g.lineTo(oL ? ox1 - 60 : ox0 + 60, base + 60); g.lineTo(ox0, base + 60); g.closePath(); g.fill();          // 大洋板块：薄、密度大，俯冲到下面
        arrow(oL ? 120 : w - 120, base + 36, oL ? 120 : -120, 0); arrow(oL ? mid + 40 : mid - 40, base + 110, oL ? 70 : -70, 70);
        g.fillStyle = '#d8462c'; for (let j = 0; j < 4; j++) { g.beginPath(); g.ellipse(oL ? mid + 170 + j * 6 : mid - 170 - j * 6, base + 150 - j * 40, 10, 22, 0, 0, 7); g.fill(); }          // 俯冲到深处熔融，岩浆往上走（火山）
        g.fillStyle = '#ffffff'; g.font = '600 24px "PingFang SC", sans-serif'; g.fillText('大洋板块俯冲', oL ? mid - 30 : mid - 160, base + 200);
      } else if (k === 'CCB') {
        crust(0, mid, hh * 0.36, '#c0a27a'); crust(mid, w, hh * 0.36, '#b4946c');
        g.fillStyle = '#a8865e'; g.beginPath(); g.ellipse(mid, base + hh * 0.33, 200, 80, 0, 0, Math.PI); g.fill();          // 两块都是大陆，谁也沉不下去：挤压、加厚、抬升
        g.strokeStyle = 'rgba(70,50,30,0.5)'; g.lineWidth = 3; for (let j = 0; j < 5; j++) { g.beginPath(); for (let x = mid - 260; x <= mid + 260; x += 10) { const y = base + 40 + j * 26 - 50 * Math.exp(-(((x - mid) / 150) ** 2)) + 10 * Math.sin(x / 30); x === mid - 260 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }          // 褶皱的岩层
        arrow(110, base + 70, 130, 0); arrow(w - 110, base + 70, -130, 0);
      } else if (k === 'OSR' || k === 'CRB') {
        crust(0, mid - 6, hh * (k === 'OSR' ? 0.12 : 0.3), k === 'OSR' ? '#4f5f74' : '#b89a74'); crust(mid + 6, w, hh * (k === 'OSR' ? 0.12 : 0.3), k === 'OSR' ? '#4f5f74' : '#b4946c');
        g.fillStyle = '#e0542c'; g.beginPath(); g.moveTo(mid - 30, hh); g.quadraticCurveTo(mid - 8, base + 60, mid, base + 10); g.quadraticCurveTo(mid + 8, base + 60, mid + 30, hh); g.fill();          // 岩浆从中间涌上来
        arrow(mid - 80, base + 40, -130, 0); arrow(mid + 80, base + 40, 130, 0);
      } else {
        crust(0, w, hh * 0.2, '#8a8070'); g.fillStyle = '#ffffff'; g.font = '600 26px "PingFang SC", sans-serif'; g.textAlign = 'center'; g.fillText('两侧板块沿着边界水平错动（从侧面看不出相向、相离）', mid, base + 80);
      }
      g.strokeStyle = 'rgba(255,255,255,0.6)'; g.setLineDash([10, 8]); g.lineWidth = 3; g.beginPath(); g.moveTo(0, base); g.lineTo(w, base); g.stroke(); g.setLineDash([]);          // 海平面
      for (let x = 0; x <= w; x += 2) { const i = Math.round((x / w) * (n - 1)), y = Y(SV(pk.pr[Math.min(n - 1, i)].h)); g.clearRect(x, 0, 2, y); }
      faceTex.needsUpdate = true;
    }

    // ---- 转动地球：拖着转；选中一个点时，地球转过去让它朝着镜头 ----
    const camDirLocal = () => { const c = new THREE.Vector3(); camera.getWorldPosition(c); const p = new THREE.Vector3(); pivot.getWorldPosition(p); const d = c.sub(p).normalize(); const q = new THREE.Quaternion(); pivot.getWorldQuaternion(q); return d.applyQuaternion(q.invert()); };
    const frame = (f, upHint) => { const u = upHint.clone().sub(f.clone().multiplyScalar(upHint.dot(f))).normalize(), r = new THREE.Vector3().crossVectors(u, f); return new THREE.Matrix4().makeBasis(r, u, f); };
    const turnTo = (lat, lon) => { const v = new THREE.Vector3(...ll2v(lat, lon)), to = camDirLocal(); const src = frame(v, new THREE.Vector3(0, 1, 0)), dst = frame(to, new THREE.Vector3(0, 1, 0)); S.target = new THREE.Quaternion().setFromRotationMatrix(dst.multiply(src.invert())); };          // 把这一点转到正对镜头，北方朝上
    const tHint = tag('<span>拖着地球转一转</span><small>在红线、绿线上点一下，切开看</small>', 'hint');
    noteBadge(tag, '教学示意：地形是 NOAA ETOPO1 实测（0.25°），竖直方向大大夸大；边界来自 Bird (2003) PB2002，按课本把小板块并进六大板块；切片下面的板块运动是示意；不画国界').loc(block, GC.x - R, 0.004, 0.06);
    const labels = [...plateL, ...aForm, ...aPlates, aSlice, aBlank];

    // ---- 侧栏：剖面（实测）；看过的几种边界 ----
    const drawChart = () => {
      if (!W) return; const c = W.chart, g = c.getContext('2d'), w = c.width, hh = c.height, pk = S.pick;
      g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, hh); g.textBaseline = 'middle'; g.font = '600 12px "PingFang SC", sans-serif'; g.fillStyle = '#3a3226'; g.textAlign = 'left';
      if (!pk) { g.fillText('在边界上点一下，这里画出切开处的地形', 8, hh / 2); return; }
      const L = 40, Rr = w - 8, T = 22, B = hh - 24, X = (s) => L + ((s + 1200) / 2400) * (Rr - L), Y = (m) => T + ((9000 - m) / 20000) * (B - T);
      g.fillText(`${CLASS[pk.c].name}（${pairName(pk.pair)}）`, 6, 10);
      g.font = '11px "PingFang SC", sans-serif'; g.fillStyle = '#7a705e'; g.textAlign = 'right'; for (const m of [-10000, -5000, 0, 5000]) { g.fillText(`${m / 1000}`, L - 4, Y(m)); g.strokeStyle = m === 0 ? 'rgba(42,90,154,0.5)' : 'rgba(60,50,40,0.08)'; g.beginPath(); g.moveTo(L, Y(m)); g.lineTo(Rr, Y(m)); g.stroke(); }
      g.save(); g.translate(10, (T + B) / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText('海拔（千米）', 0, 0); g.restore();
      g.beginPath(); pk.pr.forEach((p, i) => (i ? g.lineTo(X(p.s), Y(p.h)) : g.moveTo(X(p.s), Y(p.h)))); g.lineTo(X(1200), B); g.lineTo(X(-1200), B); g.closePath(); g.fillStyle = '#c9b48a'; g.fill();
      g.fillStyle = 'rgba(63,127,184,0.35)'; g.beginPath(); pk.pr.forEach((p, i) => { const y = Y(Math.min(0, p.h)); i ? g.lineTo(X(p.s), y) : g.moveTo(X(p.s), Y(0)); }); g.lineTo(X(1200), Y(0)); g.closePath(); g.fill();
      g.strokeStyle = '#d8342c'; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(X(0), T); g.lineTo(X(0), B); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#7a705e'; g.textAlign = 'center'; g.fillText('−1200 千米', X(-1200) + 20, B + 12); g.fillText('边界', X(0), B + 12); g.fillText('1200 千米', X(1200) - 22, B + 12);
      const hi = pk.pr.reduce((a, b) => (b.h > a.h ? b : a)), lo = pk.pr.reduce((a, b) => (b.h < a.h ? b : a)); g.textAlign = 'right'; g.fillStyle = '#3a3226'; g.fillText(`最高 ${Math.round(hi.h)} 米，最低 ${Math.round(lo.h)} 米（实测）`, Rr, T + 4);
    };
    const drawLog = () => {
      if (!W) return; const rows = [], r = (b, t) => rows.push(h('div', { class: 'tl-row' }, h('b', {}, b), h('span', {}, t)));
      for (const k of Object.keys(KINDS)) if (S.seen.has(k)) r(`${KINDS[k]}：`, `${CLASS[k].form}——${CLASS[k].how}`);
      if (S.seen.size >= 3) r('合起来看：', '高大的山系、深深的海沟、洋底的海岭、大陆上的裂谷，几乎都在板块交界处；板块内部相对稳定');
      W.log.replaceChildren(...rows); if (S.seen.size >= 3 && (S.seen.has('CCB') || S.seen.has('SUB'))) W.ui.unlock();
    };

    // ---- 指针：拖地球转；点一下选边界 ----
    let down = null; const q0 = new THREE.Quaternion();
    const pointer = {
      down(rc, e) { if (!rc.intersectObject(globe, false).length) return false; down = { x: e?.clientX ?? 0, y: e?.clientY ?? 0, moved: false, rc }; q0.copy(earthRot.quaternion); S.target = null; document.getElementById('c').style.cursor = 'grabbing'; return true; },
      move(rc, e) {
        const c = document.getElementById('c');
        if (!down) { if (c) c.style.cursor = rc.intersectObject(globe, false).length ? 'grab' : ''; return false; }
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

    return {
      group,
      card: false,
      emerge: 'flat',          // 课本的图平放在书页上，模型从它上面长出来、它慢慢淡掉
      size: { w: 0.34, d: 0.2, h: 0.2 },
      view: { elev: 16, azim: 8, lookY: 0.5, frameMargin: 1.06 },
      pointer,
      debug: { pick: (lat, lon) => choose(lat, lon) },
      mount(ui) {
        const pre = buttons(PRESETS.map(([n, la, lo]) => ({ text: n, ghost: true, onClick: () => { S.moved = true; choose(la, lo); } })));
        const acts = buttons([{ text: '重来', ghost: true, onClick: () => { ui.relock?.(); S.pick = null; S.seen.clear(); S.moved = false; blank.visible = true; aBlank.setOn(true); for (const m of [sTop, sFront, sBack]) { m.geometry.dispose(); m.geometry = new THREE.BufferGeometry(); } mark.visible = cutLine.visible = false; aForm.concat(aPlates, [aSlice]).forEach((t) => t.setOn(false)); earthRot.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -1.5); drawChart(); drawLog(); ui.status(START); } }]);
        const chart = h('canvas', { class: 'wx-map', width: 320, height: 190 }), log = h('div', { class: 'timeline' });
        ui.controls.append(h('div', { class: 'bar-title' }, '切开处的地形（实测）'), chart, h('div', { class: 'bar-title' }, '也可以直接去这些地方'), pre.el, acts.el, note('红线是生长边界，绿线是消亡边界（和课本图 2.20 一样），灰线是课本没讲的错动边界。箭头朝外是相离，朝里是相向。'));
        ui.data.append(h('div', { class: 'bar-title' }, '你看到了什么'), log);
        W = { ui, chart, log };
        ui.status(START); drawChart(); drawLog();
      },
      update(dt) {
        labels.forEach((l) => l.tick(dt));
        if (S.target) { earthRot.quaternion.slerp(S.target, Math.min(1, dt * 3)); if (earthRot.quaternion.angleTo(S.target) < 0.002) S.target = null; }
        const cd = camDirLocal(); for (const l of plateL) { const n = l.userData.n.clone().applyQuaternion(earthRot.quaternion); l.userData.want = n.dot(cd) > 0.25 ? 1 : 0; }          // 转到背面的板块名字藏起来
        tHint.loc(block, GC.x - R * 1.25, GC.y + R * 0.5, 0).show(!S.moved);
      },
    };
  },
};
const START = '课本图 2.20 立了起来：一颗地形是实测的地球，红线、绿线是板块的边界。<b>拖着地球转一转</b>，看看最高的山、最深的海沟在哪；再在边界上点一下，切开看。';
