// 高中地理 选择性必修1 第二章第二节 构造地貌的形成 · 褶皱（课本第 27 页，图 2.15 褶皱示意、图 2.16 背斜成谷、向斜成山示意）。
//
// 一个问题：为什么有的山顶上的岩层是往下弯的，有的山谷底下的岩层反而是拱起来的？
// 课本的图就是模型：一块切开的地块，侧面就是图 2.15、2.16 那样的岩层剖面，一层层平平地叠着（最下面最老）。
// 学生亲手做的：
//   1. 推地块两头的挤压板：岩层被挤弯，拱起来的是背斜（形成山岭），弯下去的是向斜（形成谷地）。挤得越狠，背斜顶上越容易裂开。
//   2. 拖时间（外力长期作用）：背斜顶部裂隙多，冲得快，慢慢成了谷地；向斜槽部致密，冲得慢，反而高耸成山岭——地形倒置。
//   3. 在地面上点一点“取样”：看露出来的是哪一层。背斜：中间老、两边新；向斜：中间新、两边老。侧栏把整条地面露出的岩层排成一条带。
// 教学示意：竖直方向夸大了，侵蚀阶段无时间标定；岩层厚度、侵蚀快慢都是示意。
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { seg, slider, buttons, note } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { airLabel, faceLabel, noteBadge } from './kit/labels.js';
import { rockPixels } from './kit/strata.js';
import { h } from '../ui/Panel.js';
import { XL, XR, NLAY, TH, LAM, surface, layerAt, exposed, crack, bend, hasFold, terrain, terrainText, changeText } from './kit/fold.js';

const ZD = 0.07, NX = 220;
const LAYC = ['#6f5038', '#8f6844', '#b0814f', '#c99e62', '#dbbb83', '#e9d4a2'];          // 第 1 层（最老）到第 6 层（最新）
const AGE = ['最老', '较老', '偏老', '偏新', '较新', '最新'];
const LITH = ['limestone', 'shale', 'sandstone', 'limestone', 'shale', 'sandstone'];          // 每一层是什么岩石：借它的颗粒、层理、节理当细节（顺着褶皱弯），颜色仍按新老，侧栏的色条对得上
const TILE = 0.03;          // 岩石纹理铺一遍多大
const ASK = ['先猜一下（可以不猜）：在这个情境里，外力作用很久以后，背斜那里会是——', ['还是山岭', '变成谷地']];
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };


// 装饰植被采用固定种子，树种与岩层无关；只按坡度减少数量。
function woodland(parent, bounds, count) {
  const merge = (a, b) => {
    const A = (a.index ? a.toNonIndexed() : a), B = (b.index ? b.toNonIndexed() : b), g = new THREE.BufferGeometry();
    const pa = A.attributes.position.array, pb = B.attributes.position.array, p = new Float32Array(pa.length + pb.length), c = new Float32Array(p.length);
    p.set(pa); p.set(pb, pa.length);
    for (let i = 0; i < p.length; i += 3) c.set(i < pa.length ? [1, 1, 1] : [0.48, 0.34, 0.22], i);
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.computeVertexNormals();
    a.dispose(); b.dispose(); A.dispose(); B.dispose(); return g;
  };
  const shapes = [merge(new THREE.IcosahedronGeometry(0.0022, 1).scale(1, 1.15, 1).translate(0, 0.0044, 0), new THREE.CylinderGeometry(0.0003, 0.0005, 0.0036, 5).translate(0, 0.0018, 0)), merge(new THREE.ConeGeometry(0.002, 0.006, 7).translate(0, 0.0045, 0), new THREE.CylinderGeometry(0.0003, 0.0004, 0.0026, 5).translate(0, 0.0013, 0))];
  const meshes = shapes.map((geo) => { const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), count); m.count = 0; m.raycast = () => {}; parent.add(m); return m; });
  let seed = 31; const r = () => ((seed = seed * 16807 % 2147483647) / 2147483647);
  const [x0, x1, z0, z1] = bounds, sites = Array.from({ length: count }, () => ({ x: x0 + 0.004 + r() * (x1 - x0 - 0.008), z: z0 + 0.004 + r() * (z1 - z0 - 0.008), s: 0.65 + r() * 0.65, t: r() > 0.45 ? 0 : 1, tone: r(), yaw: r() * 6.28 }));
  const obj = new THREE.Object3D(), col = new THREE.Color();
  return (height, avoid = () => false) => {
    meshes.forEach((m) => { m.count = 0; });
    for (const p of sites) {
      const slope = Math.hypot(height(p.x + 0.0005, p.z) - height(p.x - 0.0005, p.z), height(p.x, p.z + 0.0005) - height(p.x, p.z - 0.0005)) / 0.001;
      if (avoid(p.x, p.z) || slope > 0.45 + p.tone * 1.1) continue;
      const m = meshes[p.t]; obj.position.set(p.x, height(p.x, p.z) - 0.00015, p.z); obj.rotation.y = p.yaw; obj.scale.setScalar(p.s); obj.updateMatrix();
      m.setMatrixAt(m.count, obj.matrix); col.setHex(p.t ? 0x356347 : 0x577c3e).multiplyScalar(0.82 + p.tone * 0.38); m.setColorAt(m.count++, col);
    }
    meshes.forEach((m) => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); });
  };
}

export default {
  id: 'fold',
  fig: '图2.16',
  title: '褶皱：背斜和向斜',
  flow: 'explore',
  ask: '有的山，山顶上的岩层是往下弯的；有的山谷，谷底下的岩层反而是拱起来的。这是怎么回事？',
  need: '把岩层挤弯，再让外力作用很久，看背斜、向斜的地形怎么变；在地面上取两处样，看岩层的新老',
  conclusion: {
    page: 31,
    quote: '在地壳运动产生的强大挤压力作用下，岩层会发生塑性变形，产生一系列波状弯曲，叫作褶皱。褶皱是由背斜和向斜组成的。背斜岩层一般向上拱起，形成山岭；向斜岩层一般向下弯曲，形成谷地（图2.15）。在外力长期作用下，背斜、向斜的地表形态也会出现倒置现象。背斜顶部因受张力产生裂隙，容易被侵蚀成谷地；而向斜槽部由于受到挤压，岩石致密，不易被侵蚀，相对高耸形成山岭（图2.16）。',
    why: '本例为正常层序的直立褶皱：背斜一般向上拱，中心岩层老、两翼新；向斜一般向下弯，中心新、两翼老。构造识别以岩层新老关系为依据，不能仅看地面高低。本例初期背斜为山、向斜为谷；在所设差异侵蚀条件下，背斜顶部裂隙多、侵蚀较快，向斜槽部较致密、侵蚀较慢，发生地形倒置。这不是所有褶皱必然的结局，地形还取决于岩性、侵蚀等条件。',
    src: '课本第 27 页 · 第二章 第二节 构造地貌的形成',
  },

  create({ tag }) {
    const group = new THREE.Group();
    const S = { c: 0, e: 0, play: false, drag: null, probes: [], guess: null, said: {} };
    let W = null;
    const block = new THREE.Group(); group.add(block);

    // ---- 侧面（剖面）：按岩层画的贴图，每次挤、冲以后重画 ----
    const SW = 1536, SH = 512, YMAX = 0.1;
    const sideCv = document.createElement('canvas'); sideCv.width = SW; sideCv.height = SH;
    const sideTex = new THREE.CanvasTexture(sideCv); sideTex.colorSpace = THREE.SRGBColorSpace;
    const topCv = document.createElement('canvas'); topCv.width = SW; topCv.height = 256;
    const topTex = new THREE.CanvasTexture(topCv); topTex.colorSpace = THREE.SRGBColorSpace;
    const X = (u) => XL + (XR - XL) * u;
    const grassCv = document.createElement('canvas'); grassCv.width = SW; grassCv.height = 256;
    { const t = grassCv.getContext('2d'); for (let i = 0; i < SW; i++) for (let j = 0; j < 256; j++) {
      const n = Math.sin(i * 0.14 + j * 0.12) * Math.sin(i * 0.037 - j * 0.081) * 9 + Math.sin(i * 4.7 + j * 8.3) * 5;
      t.fillStyle = `rgb(${115 + n},${143 + n},${73 + n * 0.6})`; t.fillRect(i, j, 1, 1);
    } }
    const paint = () => {
      const g = sideCv.getContext('2d'), img = g.createImageData(SW, SH), cols = LAYC.map((h2) => [parseInt(h2.slice(1, 3), 16), parseInt(h2.slice(3, 5), 16), parseInt(h2.slice(5, 7), 16)]), PXS = LITH.map((kd) => rockPixels(kd));
      for (let i = 0; i < SW; i++) {
        const x = X(i / (SW - 1)), b = bend(x, S.c), top = surface(x, S.c, S.e);
        for (let j = 0; j < SH; j++) {
          const y = YMAX * (1 - j / (SH - 1)), k = (i + j * SW) * 4;
          if (y > top) { img.data[k + 3] = 0; continue; }
          const f = (y - b) / TH, L = Math.max(1, Math.min(NLAY, Math.floor(f) + 1)), edge = Math.abs(f - Math.round(f)) < 0.045 && f > 0.5 && f < NLAY - 0.5;          // 层与层之间一条细的深线
          const n = 0.94 + 0.07 * Math.sin(i * 0.9 + j * 1.7) * Math.sin(j * 0.6 - i * 0.3) - 0.055 * Math.pow(Math.max(0, Math.sin(f * 37 + Math.sin(x * 140) * 0.7)), 12), c = top - y < 0.0012 ? [100, 81, 51] : cols[L - 1];
          const P = PXS[L - 1], tn = P.n, tu = ((Math.floor(((x - XL) / TILE) * tn) % tn) + tn) % tn, tv = ((Math.floor(((y - b) / TILE) * tn) % tn) + tn) % tn, q = (tv * tn + tu) * 4;          // 纹理按“层里的位置”取：层理、节理跟着岩层一起弯
          const d0 = 0.5 + 0.5 * P.data[q] / P.mean[0], d1 = 0.5 + 0.5 * P.data[q + 1] / P.mean[1], d2 = 0.5 + 0.5 * P.data[q + 2] / P.mean[2], e = edge ? 0.55 : 1;
          img.data[k] = c[0] * n * d0 * e; img.data[k + 1] = c[1] * n * d1 * e; img.data[k + 2] = c[2] * n * d2 * e; img.data[k + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);
      // 两头写上第几层、新老：背斜中间老、两翼新，对着数字就看得出
      g.font = '700 24px "PingFang SC", "Songti SC", sans-serif'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      for (const [xl, align] of [[XL + 0.006, 'left'], [XR - 0.006, 'right']]) {
        const i0 = ((xl - XL) / (XR - XL)) * (SW - 1), bb = bend(xl, S.c), top0 = surface(xl, S.c, S.e); g.textAlign = align;
        for (let L = 1; L <= NLAY; L++) { const y = bb + (L - 0.5) * TH; if (y > top0 - 0.003) continue; const j = (1 - y / YMAX) * (SH - 1), t = L === 1 || L === NLAY ? `${L} ${AGE[L - 1]}` : String(L); g.strokeStyle = 'rgba(40,28,18,0.7)'; g.lineWidth = 5; g.strokeText(t, i0, j); g.fillStyle = '#fff8ea'; g.fillText(t, i0, j); }
      }
      for (let k = 0; k < 2400; k++) {
        const u = (k * 0.61803398875) % 1, v = (k * 0.41421356237) % 1, x = X(u), y = v * YMAX;
        if (y > surface(x, S.c, S.e) - 0.0015) continue;
        g.fillStyle = k % 3 ? 'rgba(58,43,29,0.17)' : 'rgba(255,241,209,0.16)'; g.fillRect(u * SW, (1 - v) * SH, 1.1 + (k % 3), 0.8 + (k % 2));
      }
      sideTex.needsUpdate = true;
      // 草地颜色只表示地表装饰，不按岩层决定覆盖率。
      const t = topCv.getContext('2d');
      t.drawImage(grassCv, 0, 0); t.globalAlpha = 0.24;
      for (let i = 0; i < SW; i++) { t.fillStyle = LAYC[exposed(X(i / (SW - 1)), S.c, S.e) - 1]; t.fillRect(i, 0, 1, 256); }
      t.globalAlpha = 1;
      t.strokeStyle = 'rgba(60,40,25,0.8)'; t.lineWidth = 2;
      for (let k = 0; k < 90; k++) { const u = (k * 0.618) % 1, x = X(u), cr = crack(x, S.c); if (cr < 0.25 || ((k * 37) % 100) / 100 > cr) continue; const i = u * SW, j = (k * 53) % 250; t.beginPath(); t.moveTo(i, j); t.lineTo(i + 3, j + 4); t.stroke(); }
      topTex.needsUpdate = true;
    };

    // ---- 地块的几何：顶面、前后两个剖面、两头 ----
    const sideMat = new THREE.MeshStandardMaterial({ roughness: 0.95, map: sideTex, transparent: true, side: THREE.DoubleSide, alphaTest: 0.5 });
    const front = new THREE.Mesh(new THREE.PlaneGeometry(XR - XL, YMAX), sideMat); front.position.set(0, YMAX / 2, ZD); block.add(front);
    const backM = new THREE.Mesh(new THREE.PlaneGeometry(XR - XL, YMAX), sideMat); backM.position.set(0, YMAX / 2, -ZD); backM.rotation.y = Math.PI; backM.scale.x = -1; block.add(backM);
    const topGeo = new THREE.PlaneGeometry(XR - XL, ZD * 2, NX, 40); topGeo.rotateX(-Math.PI / 2);
    const topMesh = new THREE.Mesh(topGeo, new THREE.MeshStandardMaterial({ map: topTex, roughness: 1, side: THREE.DoubleSide })); block.add(topMesh);
    const ends = [XL, XR].map((x) => {
      const geo = new THREE.PlaneGeometry(ZD * 2, 1), uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, x === XL ? 0.5 / SW : 1 - 0.5 / SW);
      const m = new THREE.Mesh(geo, sideMat); m.rotation.y = Math.PI / 2; m.position.x = x; block.add(m); return m;
    });
    const bottom = new THREE.Mesh(new THREE.PlaneGeometry(XR - XL, ZD * 2), new THREE.MeshStandardMaterial({ color: 0x6f5038, roughness: 1, side: THREE.DoubleSide })); bottom.rotation.x = Math.PI / 2; block.add(bottom);
    const visualHeight = (x, z) => surface(x, S.c, S.e) + 0.0009 * Math.sin(x * 135 + z * 72) * Math.sin(z * 113 - x * 48) * Math.max(0, 1 - (z / ZD) ** 2) * Math.max(0, 1 - (x / XR) ** 8);
    const plant = woodland(block, [XL, XR, -ZD, ZD], 340);
    let visualKey = '';
    const outline = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x4a3420, transparent: true, opacity: 0.6 })); outline.raycast = () => {}; block.add(outline);
    const shape = () => {
      const key = `${S.c}:${S.e}`; if (key === visualKey) return; visualKey = key;
      const p = topGeo.attributes.position;
      for (let k = 0; k < p.count; k++) p.setY(k, visualHeight(p.getX(k), p.getZ(k)));
      p.needsUpdate = true; topGeo.computeVertexNormals(); topGeo.computeBoundingSphere();
      ends.forEach((m, i) => { const hgt = surface(i ? XR : XL, S.c, S.e); m.scale.y = hgt; m.position.y = hgt / 2; const uv = m.geometry.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setY(k, k < 2 ? hgt / YMAX : 0); uv.needsUpdate = true; });
      const L = []; for (const z of [-ZD, ZD]) for (let i = 0; i < NX; i++) { const a = X(i / NX), b = X((i + 1) / NX); L.push(a, surface(a, S.c, S.e), z, b, surface(b, S.c, S.e), z); }
      for (const x of [XL, XR]) for (const z of [-ZD, ZD]) L.push(x, 0, z, x, surface(x, S.c, S.e), z);
      L.push(XL, 0, ZD, XR, 0, ZD, XL, 0, -ZD, XR, 0, -ZD);
      outline.geometry.dispose(); outline.geometry = new THREE.BufferGeometry(); outline.geometry.setAttribute('position', new THREE.Float32BufferAttribute(L, 3));
      paint(); plant(visualHeight);
    };
    const shadowTex = canvasTex(256, 128, (g, w, hh) => { const gr = g.createRadialGradient(w / 2, hh / 2, 0, w / 2, hh / 2, w / 2); gr.addColorStop(0, 'rgba(60,45,30,0.4)'); gr.addColorStop(0.7, 'rgba(60,45,30,0.12)'); gr.addColorStop(1, 'rgba(60,45,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, hh); });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry((XR - XL) * 1.12, ZD * 2.5), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.0006; shadow.raycast = () => {}; shadow.userData.noFrame = true; group.add(shadow);
    const frameBox = new THREE.Mesh(new THREE.BoxGeometry(XR - XL + 0.05, 0.1, ZD * 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); frameBox.position.y = 0.05; frameBox.raycast = () => {}; group.add(frameBox);

    // ---- 挤压板：地块两头各一块，按住往里推 ----
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xb84a32, roughness: 0.32, metalness: 0.48, emissive: 0x5a1a10, emissiveIntensity: 0.08 });
    const plates = [-1, 1].map((sd) => {
      const g = new THREE.Group(), p = new THREE.Mesh(new RoundedBoxGeometry(0.006, 0.06, ZD * 2 + 0.01, 3, 0.0015), plateMat); p.position.y = 0.04; g.add(p);
      const ar = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.018, 16), plateMat); ar.rotation.z = sd > 0 ? Math.PI / 2 : -Math.PI / 2; ar.position.set(sd * 0.018, 0.04, 0); g.add(ar);          // 箭头朝里：挤压力的方向
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.02, 10), plateMat); sh.rotation.z = Math.PI / 2; sh.position.set(sd * 0.03, 0.04, 0); g.add(sh);
      const pick = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, ZD * 2 + 0.02), new THREE.MeshBasicMaterial({ visible: false })); pick.position.set(sd * 0.02, 0.04, 0); pick.userData.pick = true; g.add(pick);
      g.userData = { sd, pick }; block.add(g); return g;
    });
    const placePlates = () => plates.forEach((g) => { const { sd } = g.userData; g.position.x = sd * (XR - XL) / 2 + sd * (0.012 - 0.008 * S.c); });          // 挤得越狠，板子越往里

    // ---- 标签：背斜、向斜（在剖面上，按岩层怎么弯）；山岭、谷地（在地面上，按此刻的高低） ----
    const face = (t) => faceLabel(block, t, { h: 0.0095, color: '#ffffff', stroke: 'rgba(40,30,20,0.6)' });          // 背斜、向斜写在岩层剖面上，跟着岩层弯
    const tAnti = face('背斜'), tSyn = [face('向斜'), face('向斜')], tLand = [0, 1, 2].map(() => airLabel(block, '', { h: 0.011, color: '#2c3245', dim: 0 }));
    const tPush = tag('<span>按住两头的红板往里推</span><small>挤压</small>', 'hint'), tScale = noteBadge(tag, '教学示意：竖直方向夸大了，侵蚀阶段无时间标定');
    const callout = airLabel(block, '', { h: 0.009, color: '#a8341f', dim: 0 }); callout.setOn(false); let calloutT = 0;
    callout.show = (on) => callout.setOn(on);          // 一段话亮几秒就收
    const say1 = (text, x, y, z) => { callout.position.set(x, y, z); callout.setText(text).setOn(true); calloutT = 4.5; };
    const AX = [-LAM / 2, 0, LAM / 2];          // 向斜、背斜、向斜的轴
    const placeTags = () => {
      const shown = hasFold(S.c);
      tAnti.position.set(0, bend(0, S.c) + TH * 3, ZD + 0.0008); tAnti.visible = shown;
      tSyn.forEach((t, i) => { t.position.set(AX[i * 2], bend(AX[i * 2], S.c) + TH * 3, ZD + 0.0008); t.visible = shown; });
      AX.forEach((x, i) => { const y = surface(x, S.c, S.e), state = terrain(S.c, S.e), hi = (i === 1) === (state === 'normal'); tLand[i].position.set(x, y + 0.012, -ZD * 0.7); tLand[i].setText(state === 'flat' || state === 'unfolded' ? '地表近乎平坦' : hi ? '山岭' : '谷地').setOn(shown); });
      tPush.loc(block, XR + 0.03, 0.08, 0).show(S.c < 0.2);
      tScale.loc(block, XL + 0.015, -0.004, ZD + 0.01);
    };

    // ---- 取样：在地面上点一处，插一面小旗，标出露出来的是第几层 ----
    const probeMat = new THREE.MeshBasicMaterial({ color: 0x2a3140 });
    const probeObjs = [];
    const addProbe = (x) => {
      const near = S.probes.findIndex((q) => Math.abs(q.x - x) < 0.015); if (near >= 0) { S.probes[near].x = x; return; }          // 点在已有小旗旁边：挪那面旗，不再插一面叠在一起
      if (S.probes.length >= 4) { S.probes.shift(); const o = probeObjs.shift(); block.remove(o.g); o.g.traverse((m) => { m.geometry?.dispose(); if (m.material !== probeMat) m.material?.dispose(); }); block.remove(o.t); o.t.material.dispose(); }
      const g = new THREE.Group(), pole = new THREE.Mesh(new THREE.CylinderGeometry(0.0006, 0.0006, 0.018, 6), probeMat); pole.position.y = 0.009; g.add(pole);
      const f = new THREE.Mesh(new THREE.PlaneGeometry(0.008, 0.005), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })); f.position.set(0.004, 0.016, 0); g.add(f);
      block.add(g); const t = airLabel(block, '', { h: 0.0085, color: '#2c3245' }); probeObjs.push({ g, t }); S.probes.push({ x });
    };
    const placeProbes = () => probeObjs.forEach((o, i) => { const x = S.probes[i].x, y = surface(x, S.c, S.e), L = exposed(x, S.c, S.e); o.g.position.set(x, y, ZD * 0.4); o.t.position.set(x, y + 0.024 + (i % 2) * 0.014, ZD * 0.4); o.t.setText(`第 ${L} 层 · ${AGE[L - 1]}`); });

    // ---- 侧栏：一张图——上面是地面高低，下面是整条地面露出来的岩层（颜色＋第几层） ----
    const drawChart = () => {
      if (!W) return;
      const c = W.chart, g = c.getContext('2d'), w = c.width, hh = c.height, L = 10, R = w - 10, PX = (x) => L + ((x - XL) / (XR - XL)) * (R - L);
      g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, hh);
      g.font = '600 11px "PingFang SC", sans-serif'; g.fillStyle = '#5f4f3c'; g.textAlign = 'left'; g.fillText('地面高低（西 → 东）', L, 12);
      g.strokeStyle = '#6b8f4e'; g.lineWidth = 2; g.beginPath(); for (let i = 0; i <= 120; i++) { const x = XL + (XR - XL) * i / 120, y = 20 + (1 - (surface(x, S.c, S.e) - 0.0) / 0.09) * 60; if (i) g.lineTo(PX(x), y); else g.moveTo(PX(x), y); } g.stroke();
      g.fillText('地面露出的岩层（数字：第几层，1 最老）', L, 98);
      let prev = 0, x0 = XL;
      for (let i = 0; i <= 240; i++) { const x = XL + (XR - XL) * i / 240, k = exposed(x, S.c, S.e); if (k !== prev || i === 240) { if (prev) { g.fillStyle = LAYC[prev - 1]; g.fillRect(PX(x0), 104, PX(x) - PX(x0), 22); if (PX(x) - PX(x0) > 12) { g.fillStyle = prev <= 2 ? '#fff' : '#3a2a1a'; g.textAlign = 'center'; g.fillText(prev, (PX(x0) + PX(x)) / 2, 119); } } prev = k; x0 = x; } }
      for (const [x, n] of [[0, '背斜'], [-LAM / 2, '向斜'], [LAM / 2, '向斜']]) { g.fillStyle = '#2a3140'; g.textAlign = 'center'; if (hasFold(S.c)) g.fillText(n, PX(x), 140); }
      W.read.innerHTML = `挤压：${S.c < 0.05 ? '还没挤' : S.c < 0.5 ? '挤弯了一点' : '挤得很弯'}　外力作用：${S.e < 0.05 ? '刚开始' : `侵蚀阶段 ${Math.round(S.e * 100)}/100`}<br>${terrainText(S.c, S.e)}<br><small>本例：正常层序的直立褶皱，按设定的差异侵蚀演化；倒置并非必然。取样旗与记录均显示当前露头。</small>`;
    };
    const drawLog = () => {
      if (!W) return;
      const rows = [];
      const r = (b, t) => rows.push(h('div', { class: 'tl-row' }, h('b', {}, b), h('span', {}, t)));
      if (S.said.fold) r('曾观察到挤压：', '岩层弯成一拱一凹：拱起来的是背斜，弯下去的是向斜；地形另看当前地表高低');
      if (S.said.inv) r('曾观察到倒置：', '背斜顶上裂隙多、冲得快，成了谷地；向斜底部致密、冲得慢，成了山岭');
      const near = (x, a) => Math.abs(x - a) < 0.03, pa = S.probes.find((p) => near(p.x, 0)), ps = S.probes.find((p) => near(p.x, LAM / 2) || near(p.x, -LAM / 2));
      if (pa) r(hasFold(S.c) ? '背斜处当前露头：' : '原背斜轴位置当前露头：', `中间露出第 ${exposed(pa.x, S.c, S.e)} 层（${AGE[exposed(pa.x, S.c, S.e) - 1]}）`);
      if (ps) r(hasFold(S.c) ? '向斜处当前露头：' : '原向斜轴位置当前露头：', `中间露出第 ${exposed(ps.x, S.c, S.e)} 层（${AGE[exposed(ps.x, S.c, S.e) - 1]}）`);
      if (S.guess != null && S.said.inv) rows.push(h('div', { class: 'tl-row' }, h('small', {}, `你猜：${ASK[1][S.guess]}　曾观察到：在本例差异侵蚀下，背斜成谷`)));
      W.log.replaceChildren(...rows);
      if (S.said.fold && S.said.inv && pa && ps) W.ui.unlock();
    };
    let previous = { c: S.c, e: S.e };
    const events = () => {
      const state = terrain(S.c, S.e), changed = S.c !== previous.c || S.e !== previous.e;
      if (changed) { callout.setOn(false); W?.ui.status(changeText(previous, S.c, S.e)); }
      if (S.c > 0.6 && !S.said.fold) { S.said.fold = true; say1('拱起来的是背斜，弯下去的是向斜', LAM / 4, surface(LAM / 4, S.c, S.e) + 0.05, ZD); }
      if (state === 'inverted' && !S.said.inv) { S.said.inv = true; say1('背斜成了谷地，向斜成了山岭', -LAM / 4, surface(LAM / 2, S.c, S.e) + 0.05, ZD); }
      previous = { c: S.c, e: S.e };
    };
    const layout = () => { shape(); placePlates(); placeTags(); placeProbes(); drawChart(); events(); drawLog(); };

    // ---- 指针：推板子、在地面上取样 ----
    const plane = new THREE.Plane(), hit = new THREE.Vector3(), wq = new THREE.Vector3();
    let x0 = 0, c0 = 0;
    const onY = (ray, y) => { block.updateMatrixWorld(); block.localToWorld(wq.set(0, y, 0)); plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), wq); if (!ray.intersectPlane(plane, hit)) return null; return block.worldToLocal(hit.clone()); };
    const pointer = {
      down(rc) {
        const hp = rc.intersectObjects(plates.map((g) => g.userData.pick), false)[0];
        if (hp) { const g = plates.find((q) => q.userData.pick === hp.object); S.drag = g.userData.sd; const p = onY(rc.ray, 0.04); x0 = p ? p.x : 0; c0 = S.c; document.getElementById('c').style.cursor = 'grabbing'; return true; }
        const ht = rc.intersectObject(topMesh, false)[0];
        if (ht && S.c > 0.05) { const l = block.worldToLocal(ht.point.clone()); addProbe(Math.max(XL + 0.005, Math.min(XR - 0.005, l.x))); layout(); drawLog(); return true; }
        return false;
      },
      move(rc) {
        const c = document.getElementById('c');
        if (S.drag == null) { if (c) c.style.cursor = rc.intersectObjects(plates.map((g) => g.userData.pick), false).length ? 'grab' : rc.intersectObject(topMesh, false).length && S.c > 0.05 ? 'crosshair' : ''; return false; }
        const p = onY(rc.ray, 0.04); if (!p) return true;
        S.c = Math.max(0, Math.min(1, c0 + (-S.drag * (p.x - x0)) / 0.025));          // 往里推多少，就挤弯多少
        layout(); return true;
      },
      up() { if (S.drag == null) return false; S.drag = null; document.getElementById('c').style.cursor = ''; return true; },
    };

    layout();

    return {
      debug: { S, layout, addProbe },
      group,
      card: false,
      emerge: 'flat',          // 课本的图平放在书页上，模型从它上面长出来、它慢慢淡掉
      size: { w: 0.38, d: 0.16, h: 0.1 },
      view: { elev: 22, azim: 24, lookY: 0.4, frameMargin: 1.05 },
      pointer,
      mount(ui) {
        const time = slider('侵蚀阶段（无时间标定）', { min: 0, max: 100, value: 0, fmt: (v) => (v ? `阶段 ${v}/100` : '刚开始'), onInput: (v) => { S.e = v / 100; S.play = false; W.play.textContent = '推进侵蚀'; layout(); } });
        const guess = seg(...ASK, (_, i) => { S.guess = i; drawLog(); }, { value: -1 });
        const acts = buttons([
          { text: '推进侵蚀', onClick: () => { S.play = !S.play; acts.btns[0].textContent = S.play ? '停一下' : '推进侵蚀'; } },
          { text: '重来', ghost: true, onClick: () => { ui.relock?.(); S.c = 0; S.e = 0; S.play = false; S.said = {}; S.guess = null; while (probeObjs.length) { const o = probeObjs.pop(); block.remove(o.g); block.remove(o.t); } S.probes = []; time.set(0); guess.set(-1); acts.btns[0].textContent = '推进侵蚀'; callout.show(false); layout(); drawLog(); ui.status('岩层一层层平平地叠着，最下面最老。按住两头的<b>红板</b>往里推。'); } },
        ]);
        const chart = h('canvas', { class: 'wx-map', width: 320, height: 150 }), read = h('div', { class: 'read-out' }), log = h('div', { class: 'timeline' });
        ui.controls.append(h('div', { class: 'bar-title' }, '地面和露出的岩层'), chart, read, time.el, acts.el, guess.el, note('在地面上点一下就是取样，最多插四面小旗。'));
        ui.data.append(h('div', { class: 'bar-title' }, '你看到了什么'), log);
        W = { ui, chart, read, log, time, play: acts.btns[0] };
        ui.status('岩层一层层平平地叠着，最下面最老。按住两头的<b>红板</b>往里推，给它加上挤压力。');
        layout(); drawLog();
      },
      update(dt) {
        [...tLand, callout, ...probeObjs.map((o) => o.t)].forEach((l) => l.tick(dt));
        if (calloutT > 0) { calloutT -= dt; if (calloutT <= 0) callout.show(false); }
        if (S.play) { S.e = Math.min(1, S.e + dt / 12); W?.time.set(Math.round(S.e * 100)); if (S.e >= 1) { S.play = false; if (W) W.play.textContent = '推进侵蚀'; } layout(); }
      },
    };
  },
};
