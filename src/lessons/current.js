// 高中地理 选择性必修1 第四章第二节 洋流（课本第 68–71 页，图 4.11 全球风带和世界洋流模式、活动“绘制世界洋流模式图”）。
//
// 一个问题（课本开头）：1992 年一艘货轮在太平洋上遇到风暴，约2.88万件塑料洗澡玩具（包括玩具鸭等）散落海面，后来在世界很多海岸陆续被发现。它们是怎么漂过去的？
// 课本的图就是模型：图 4.11 那样一个理想化的大洋（不是真实地图，不画国界）：西边一块大陆、东边一块大陆，南纬 45° 以南四周是开阔的海。
// 学生亲手做的：
//   1. 让风吹起来：信风、西风吹动海面，海水被陆地挡住、转弯，慢慢转成几个大的环流；箭头红的是暖流、蓝的是寒流。
//   2. 在海上点一下，放一只玩具鸭，看它跟着洋流漂到哪里。
//   3. 假如没有大陆挡着：本模型仅保留东西向流动的理想情境，不能推广为真实海洋规律——洋流的方向还受海陆分布的影响。
//   4. 看同纬度大洋两岸：北纬 60° 东岸暖、西岸冷；中低纬东岸有寒流，岸上成了沙漠；寒暖流交汇的地方有大渔场。
// 教学示意：大洋、大陆都是理想化的；流速是示意，沿岸影响仅定性比较。
import * as THREE from 'three';
import { seg, buttons, note } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { airLabel, groundLabel, noteBadge } from './kit/labels.js';
import { h } from '../ui/Panel.js';
import { XW, XE, NB, latOf, nOf, SOUTH_OPEN, isLand, vel, kindOf, coastEffect, advance, windStep, recordDrop, GYRES } from './kit/current.js';

const XL = -0.17, XR = 0.17, G = 0.016, SPEED = 2.2;
const ASK = ['先猜一下（可以不猜）：在这个情境里，从北纬 20° 大洋中间放下的玩具鸭，会先往——', ['西漂', '东漂', '原地打转']];
const rnd = (() => { let s = 21; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export default {
  id: 'current',
  fig: '图4.11',
  title: '洋流',
  flow: 'explore',
  // 案例数量依据：https://www.metlink.org/resource/rubber-ducks-an-unexpected-journey/
  ask: '一艘货轮在太平洋上遇到风暴，约2.88万件塑料洗澡玩具（包括玩具鸭等）散落海面，后来在世界很多海岸陆续被发现。它们是怎么漂过去的？',
  need: '让风吹起来，看海水转成哪几个环流；放几只玩具鸭看它们漂到哪；再假设没有大陆比一比；比较洋流对同纬度两岸的定性影响',
  conclusion: {
    page: 73,
    quote: '盛行风吹拂海面，推动海水随风漂流，并且使上层海水带动下层海水流动，在海洋表层形成规模很大的洋流。洋流运动的方向还受海陆分布、地转偏向力等因素的影响。……信风驱动赤道南北两侧的海水由东向西流动，到达大洋西岸时，受到陆地阻挡，……大部分沿着海岸流向较高纬度海区。到中纬度海区时，在盛行西风吹拂下，洋流向东流去。到达大洋东岸时，又有一部分折向低纬度海区。这样就在中低纬度海区形成大洋环流，在北半球呈顺时针方向流动，在南半球呈逆时针方向流动。……在北半球中高纬度海区也形成大洋环流，它呈逆时针方向流动。……南极大陆外围，海面广阔。这里终年受西风影响，形成西风漂流。',
    why: '风推着海面走：信风带里海水往西，西风带里海水往东。风场、地转偏向力、压力梯度和海岸边界共同影响大洋环流。本页用预设流函数示意环流，未逐项求解成因。暖流比流经海区周围海水温度高，寒流较低；低纬向高纬通常是暖流，反向通常是寒流，但流向不是定义。暖流让沿岸暖湿，寒流让沿岸凉、干，所以同纬度的大洋两岸气温、景观可以差很多；寒暖流相遇的地方海水扰动，营养物质上涌，鱼多，成了大渔场。',
    src: '课本第 68–71 页 · 第四章 第二节 洋流',
  },

  create({ tag }) {
    const group = new THREE.Group();
    const S = { w: 0, blow: false, land: true, ducks: [], saw: {}, guess: null };
    let W = null;
    const block = new THREE.Group(); group.add(block);
    const P3 = (x, n, y = G) => new THREE.Vector3(x, y, -n);

    // ---- 地块和地图：海、两块理想化的大陆（东西岸）、纬线 ----
    const BASE = import.meta.env.BASE_URL || '/';
    const strata = new THREE.TextureLoader().load(`${BASE}tex/geo/strata-side.jpg`); strata.colorSpace = THREE.SRGBColorSpace;
    const sm2 = (rx, c) => { const t = strata.clone(); t.wrapS = THREE.RepeatWrapping; t.repeat.set(rx, 0.3); return new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(c, c, c) }); };
    const soil = new THREE.Mesh(new THREE.BoxGeometry(XR - XL, 0.005, NB * 2), [sm2(0.9, 0.9), sm2(0.9, 0.8), new THREE.MeshBasicMaterial({ color: 0x819b99 }), new THREE.MeshBasicMaterial({ color: 0x6b5236 }), sm2(1.3, 0.97), sm2(1.3, 0.84)]); soil.position.y = 0.0025; block.add(soil);
    // 闭合海盆与大陆：海岸仍用模式图的直线边界，起伏不参与洋流计算。
    const landforms = new THREE.Group(); block.add(landforms);
    const relief = (x, z) => {
      const coast = Math.min(1, Math.max(0, (Math.abs(x) - XE) / 0.018)), end = Math.min(1, Math.max(0, (-nOf(SOUTH_OPEN) - z) / 0.018));
      return G + 0.0005 + coast * end * (0.0038 + 0.009 * (0.5 + 0.5 * Math.sin(z * 92 + x * 84)) + 0.0008 * Math.sin(x * 490 + z * 160));
    };
    const grass = canvasTex(256, 256, (g, w) => { g.fillStyle = '#a7ae85'; g.fillRect(0, 0, w, w); for (let i = 0; i < 6000; i++) { g.fillStyle = i % 2 ? 'rgba(62,78,44,0.16)' : 'rgba(241,227,192,0.2)'; g.fillRect(((Math.sin(i * 127.1) * 43758.5 % 1 + 1) % 1) * w, ((Math.sin(i * 311.7) * 9631.9 % 1 + 1) % 1) * w, 1, 2); } });
    const landMat = new THREE.MeshStandardMaterial({ map: grass, roughness: 0.94, color: 0xffffff });
    // 沿岸受洋流影响的地方（定性）：东边大陆西岸中低纬寒流经过，岸上是沙漠；西边大陆东岸暖流经过，是湿润的森林；高纬西边大陆东岸寒流，苔原（低矮的苔藓、草和矮灌木）；东边大陆西岸暖流，有森林
    const COAST = [[XE, XE + 0.028, 30, 12, 'desert'], [XE, XE + 0.028, -12, -30, 'desert'], [XW - 0.028, XW, 30, 12, 'forest'], [XW - 0.03, XW, 70, 52, 'tundra'], [XE, XE + 0.03, 70, 52, 'forest']];
    const inCoast = (x, z, kind) => COAST.some(([x0, x1, n0, n1, k]) => k === kind && x >= x0 && x <= x1 && -z <= nOf(n0) && -z >= nOf(n1));
    const coastMat = (a, b) => {
      const cvL = document.createElement('canvas'); cvL.width = 256; cvL.height = 1024; const g = cvL.getContext('2d');
      g.fillStyle = g.createPattern(grass.image, 'repeat'); g.fillRect(0, 0, 256, 1024);
      const U = (x) => ((x - a) / (b - a)) * 256, V = (n) => ((-nOf(n) - landZ + landDepth / 2) / landDepth) * 1024;
      for (const [x0, x1, n0, n1, k] of COAST) { if (x1 < a || x0 > b) continue; const c = { desert: '226,196,120', forest: '52,100,46', tundra: '150,152,112' }[k], y0 = V(n0), y1 = V(n1), gr = g.createLinearGradient(0, y0 - 18, 0, y1 + 18); gr.addColorStop(0, `rgba(${c},0)`); gr.addColorStop(0.15, `rgba(${c},0.88)`); gr.addColorStop(0.85, `rgba(${c},0.88)`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(U(x0), y0 - 18, U(x1) - U(x0), y1 - y0 + 36); }
      const tex = new THREE.CanvasTexture(cvL); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.94 });
    };
    const landBottom = 0.005, landDepth = NB + nOf(-SOUTH_OPEN), landZ = (-NB - nOf(SOUTH_OPEN)) / 2;
    for (const [a, b] of [[XL, XW], [XE, XR]]) {
      const geo = new THREE.BoxGeometry(b - a, 1, landDepth, 18, 1, 70), p = geo.attributes.position;
      for (let k = 0; k < p.count; k++) { const x = p.getX(k) + (a + b) / 2, z = p.getZ(k) + landZ; p.setXYZ(k, x, p.getY(k) > 0 ? relief(x, z) : landBottom, z); }
      geo.computeVertexNormals(); landforms.add(new THREE.Mesh(geo, [sm2(0.7, 0.9), sm2(0.7, 0.84), coastMat(a, b), sm2(1, 0.8), sm2(0.8, 0.95), sm2(0.8, 0.85)]));
    }
    // 树：散布在两侧大陆上；沙漠和苔原上不长
    const trees = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.0015, 1), new THREE.MeshStandardMaterial({ color: 0x62734d, roughness: 1 }), 210);
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0002, 0.0003, 0.002, 5), new THREE.MeshStandardMaterial({ color: 0x776450 }), 210);
    const dummy = new THREE.Object3D(), hash = (k) => (Math.sin(k * 127.1 + 4) * 43758.5453 % 1 + 1) % 1;
    for (let k = 0; k < 210; k++) {
      let x = (k % 2 ? -1 : 1) * (XE + 0.006 + hash(k) * 0.037), z = -NB + 0.007 + hash(k + 900) * (landDepth - 0.014);
      if (k >= 150) { const f = COAST.filter((c) => c[4] === 'forest')[k % 2]; x = f[0] + 0.002 + hash(k + 70) * (f[1] - f[0] - 0.004); z = -nOf(f[2]) + hash(k + 130) * (nOf(f[2]) - nOf(f[3])); }          // 后 60 棵种在受暖流影响的森林里
      if (inCoast(x, z, 'desert') || inCoast(x, z, 'tundra')) { dummy.position.set(0, -1, 0); dummy.scale.setScalar(0.0001); dummy.updateMatrix(); trunks.setMatrixAt(k, dummy.matrix); trees.setMatrixAt(k, dummy.matrix); continue; }          // 沙漠、苔原上不长树
      dummy.position.set(x, relief(x, z) + 0.001, z); dummy.scale.setScalar(0.7 + hash(k + 500) * 0.6); dummy.updateMatrix(); trunks.setMatrixAt(k, dummy.matrix);
      dummy.position.y += 0.0018; dummy.scale.y *= 1.2; dummy.updateMatrix(); trees.setMatrixAt(k, dummy.matrix);
    }
    trees.raycast = trunks.raycast = () => {}; landforms.add(trees, trunks);
    const waterGeo = new THREE.BoxGeometry(XR - XL - 0.0001, G - 0.0055, NB * 2 - 0.0001, 100, 1, 72), waterPos = waterGeo.attributes.position;
    for (let k = 0; k < waterPos.count; k++) if (waterPos.getY(k) > 0) waterPos.setY(k, waterPos.getY(k) + 0.00013 * Math.sin(waterPos.getX(k) * 610 + waterPos.getZ(k) * 240) * Math.cos(waterPos.getZ(k) * 390));
    waterGeo.computeVertexNormals();
    const water = new THREE.Mesh(waterGeo, new THREE.MeshStandardMaterial({ color: 0x5aa6d6, transparent: true, opacity: 0.5, roughness: 0.28, metalness: 0.08, depthWrite: false })); water.position.y = (G + 0.0045) / 2; water.raycast = () => {}; block.add(water);
    const bedGeo = new THREE.PlaneGeometry(XR - XL, NB * 2, 80, 60); bedGeo.rotateX(-Math.PI / 2);
    const bp = bedGeo.attributes.position;
    for (let k = 0; k < bp.count; k++) bp.setY(k, 0.0053 + 0.0006 * (1 + Math.sin(bp.getX(k) * 120 + bp.getZ(k) * 85) * Math.cos(bp.getZ(k) * 110)));
    const bedTex = canvasTex(512, 512, (g, w) => {
      g.fillStyle = '#a6c4cc'; g.fillRect(0, 0, w, w);
      for (let k = 0; k < 100; k++) { g.strokeStyle = 'rgba(225,241,216,0.16)'; g.lineWidth = 1.5; g.beginPath(); const x = hash(k + 1200) * w, y = hash(k + 1500) * w; for (let j = 0; j < 45; j++) g.lineTo(x + j, y + Math.sin(j / 8 + k) * 2); g.stroke(); }
    });
    bedGeo.computeVertexNormals(); block.add(new THREE.Mesh(bedGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, map: bedTex, roughness: 1 })));
    const TW = 1400, TH = Math.round(1400 * (NB * 2) / (XR - XL));
    const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH; const mapTex = new THREE.CanvasTexture(cv); mapTex.colorSpace = THREE.SRGBColorSpace; mapTex.anisotropy = 8;
    const PX = (x) => ((x - XL) / (XR - XL)) * TW, PY = (n) => ((NB - n) / (2 * NB)) * TH;
    const meadow = new Image(); meadow.src = `${BASE}tex/geo/meadow-tile.jpg`;
    const drawMap = () => {
      const g = cv.getContext('2d');
      g.clearRect(0, 0, TW, TH);
      landforms.visible = S.land;
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2; g.setLineDash([10, 8]); g.font = '600 30px "PingFang SC", sans-serif'; g.fillStyle = 'rgba(30,50,80,0.8)'; g.textBaseline = 'middle';
      for (const lat of [60, 30, 0, -30, -60]) { g.beginPath(); g.moveTo(0, PY(nOf(lat))); g.lineTo(TW, PY(nOf(lat))); g.stroke(); g.fillText(lat === 0 ? '赤道' : `${Math.abs(lat)}°${lat > 0 ? 'N' : 'S'}`, PX(XW) + 10, PY(nOf(lat)) - 18); }
      g.setLineDash([]);
      if (S.land) { g.font = '600 34px "Songti SC", serif'; g.fillStyle = '#2a3a26'; g.fillText('渔场（寒暖流交汇）', PX(XW) + 20, PY(nOf(50.5))); for (let k = 0; k < 5; k++) { const X = PX(XW + 0.012 + k * 0.006), Y = PY(nOf(44.5)); g.fillStyle = 'rgba(30,60,90,0.9)'; g.beginPath(); g.ellipse(X, Y, 12, 5, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(X + 10, Y); g.lineTo(X + 18, Y - 6); g.lineTo(X + 18, Y + 6); g.fill(); } }
      mapTex.needsUpdate = true;
    };
    meadow.onload = drawMap; drawMap();
    const top = new THREE.Mesh(new THREE.PlaneGeometry(XR - XL, NB * 2), new THREE.MeshBasicMaterial({ map: mapTex, transparent: true, depthWrite: false })); top.rotation.x = -Math.PI / 2; top.position.y = G + 0.0002; block.add(top);
    const shadowTex = canvasTex(256, 256, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(60,45,30,0.4)'); gr.addColorStop(0.7, 'rgba(60,45,30,0.12)'); gr.addColorStop(1, 'rgba(60,45,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry((XR - XL) * 1.08, NB * 2.2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.0006; shadow.raycast = () => {}; shadow.userData.noFrame = true; group.add(shadow);

    // ---- 洋流箭头：一格格摆在海上，红是暖流、蓝是寒流；风越大越清楚 ----
    const pts = []; for (let x = XL + 0.01; x < XR; x += 0.019) for (let n = -NB + 0.01; n < NB; n += 0.017) pts.push([x, n]);          // 箭头摆得疏一点，画面不乱
    const cone = new THREE.ConeGeometry(0.0022, 0.008, 8); cone.rotateX(Math.PI / 2);
    const arrows = new THREE.InstancedMesh(cone, new THREE.MeshBasicMaterial({ vertexColors: false }), pts.length); arrows.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(pts.length * 3), 3); arrows.raycast = () => {}; block.add(arrows);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), cW = new THREE.Color(0xd9472f), cC = new THREE.Color(0x1f4f9a), cN = new THREE.Color(0x7d93aa);
    const placeArrows = () => {
      pts.forEach(([x, n], k) => {
        const [u, v] = vel(x, n, S.land), sp = Math.hypot(u, v) * S.w;
        if (sp < 0.03 || isLand(x, n, S.land)) { m4.compose(P3(x, n, G + 0.001), q, sc.setScalar(1e-4)); arrows.setMatrixAt(k, m4); return; }
        q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(u, 0, -v).normalize()); m4.compose(P3(x, n, G + 0.0015), q, sc.set(1, 1, Math.min(1.6, 0.5 + sp * 1.2))); arrows.setMatrixAt(k, m4);
        const kd = kindOf(x, n, S.land); arrows.setColorAt(k, kd === '暖流' ? cW : kd === '寒流' ? cC : cN);
      });
      arrows.instanceMatrix.needsUpdate = true; arrows.instanceColor.needsUpdate = true;
    };
    // ---- 风：大洋两边的空中一排小白箭头（信风向西、西风向东） ----
    const windArrows = new THREE.Group(); block.add(windArrows);
    for (const lat of [15, -15, 45, -45, -58]) { const dir = Math.abs(lat) < 30 ? -1 : 1; for (let x = -0.1; x <= 0.1; x += 0.05) { const a = new THREE.Mesh(new THREE.ConeGeometry(0.003, 0.012, 3), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })); a.rotation.z = dir > 0 ? -Math.PI / 2 : Math.PI / 2; a.position.copy(P3(x, nOf(lat) + (lat > 0 ? 0.004 : -0.004), G + 0.02)); a.raycast = () => {}; windArrows.add(a); } }
    const tWind = ['东北信风（东西分量）', '西风（东西分量）', '东南信风（东西分量）', '西风（东西分量）'].map((t) => airLabel(block, t, { h: 0.0085, color: '#1f4f86', icon: 'wind', dim: 0 }));

    // ---- 漂浮的海水：一粒粒，跟着洋流走 ----
    const NP = 420, pp = new Float32Array(NP * 3), parts = Array.from({ length: NP }, () => ({ x: XL + rnd() * (XR - XL), n: -NB + rnd() * 2 * NB, a: rnd() * 4 }));
    const dotTex = canvasTex(32, 32, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    const dots = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.022, map: dotTex, color: 0xe8f4ff, transparent: true, opacity: 0.8, depthWrite: false })); dots.raycast = () => {}; dots.renderOrder = 6; block.add(dots);
    let frameWind = 0;
    const advect = (o, dt) => advance(o, dt, frameWind, S.land);


    // ---- 玩具鸭：点哪儿放哪儿，留下一路的轨迹 ----
    const duckMat = new THREE.MeshStandardMaterial({ color: 0xf6c63a, roughness: 0.5, emissive: 0x5a4210, emissiveIntensity: 0.3 });
    const addDuck = (x, n) => {
      if (S.ducks.length >= 4) { const d0 = S.ducks.shift(); block.remove(d0.m, d0.line); d0.line.geometry.dispose(); }
      const m = new THREE.Group(), body = new THREE.Mesh(new THREE.SphereGeometry(0.003, 12, 8), duckMat); body.scale.set(1.3, 0.8, 1); body.position.y = 0.002; m.add(body); const hd = new THREE.Mesh(new THREE.SphereGeometry(0.0018, 10, 8), duckMat); hd.position.set(0.0026, 0.0045, 0); m.add(hd);
      const MAX = 600, pos = new Float32Array(MAX * 3), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setDrawRange(0, 0);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xf6c63a })); line.raycast = () => {}; line.renderOrder = 7;
      block.add(m, line); S.ducks.push({ x, n, m, line, pos, np: 0, t: 0, x0: x, n0: n });
    };
    const stepDucks = (dt) => {
      for (const d of S.ducks) {
        const px = d.x; advect(d, dt); d.t += dt;
        if (Math.abs(d.x - px) > 0.1) { d.np = 0; }          // 绕地球一圈从另一边回来：轨迹从新的地方重新画，不横穿整个海
        if (d.np >= 600) { d.pos.copyWithin(0, 3); d.np--; }          // 轨迹太长：丢掉最老的一段，鸭子照样漂
        if (d.t > 0.05 || !d.np) { d.t = 0; d.pos.set([d.x, G + 0.0012, -d.n], d.np * 3); d.np++; d.line.geometry.setDrawRange(0, d.np); d.line.geometry.attributes.position.needsUpdate = true; }
        d.m.position.copy(P3(d.x, d.n, G + 0.0006));
      }
    };

    // ---- 沿岸的小城：北纬 60° 大洋两岸各一座 ----
    const town = (x, n) => { const g = new THREE.Group(); for (const [dx, dz, hh] of [[-0.003, 0, 0.004], [0.003, 0.003, 0.006], [0, -0.004, 0.003]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.004, hh, 0.004), new THREE.MeshLambertMaterial({ color: 0xf3ede1 })); b.position.set(dx, hh / 2, dz); g.add(b); } g.position.copy(P3(x, n, relief(x, -n))); block.add(g); return g; };
    const townW = town(XW - 0.012, nOf(60)), townE = town(XE + 0.012, nOf(60));
    const tTownW = airLabel(block, '', { h: 0.0085, color: '#2c3245', icon: 'thermo', dim: 0 }), tTownE = airLabel(block, '', { h: 0.0085, color: '#2c3245', icon: 'thermo', dim: 0 });
    const tHint = tag('<span>在海上点一下</span><small>放一只玩具鸭</small>', 'hint'), tScale = noteBadge(tag, '教学示意：大洋和大陆是理想化的；沿岸的沙漠、森林、苔原借用两岸典型景观（如北大西洋两岸），范围只是示意，苔原以低矮植被为主、不是冰原；流速是示意，沿岸影响仅定性比较；赤道逆流、季风洋流本模型省略');
    const callout = airLabel(block, '', { h: 0.0085, color: '#a8341f', dim: 0 }); callout.setOn(false); let calloutT = 0;
    callout.show = (on) => callout.setOn(on);          // 一段话亮几秒就收
    const say1 = (text, x, n) => { callout.position.set(x, G + 0.03, -n); callout.setText(text).setOn(true); calloutT = 4.5; };
    const tGyre = GYRES.map((g2) => ({ g: g2, t: groundLabel(block, g2[3].replace(/海区的大洋环流/, '环流'), { x: 0, y: G + 0.0012, z: -nOf((g2[0] + g2[1]) / 2), h: 0.0095, color: '#12305a', opacity: 0.9 }) }));          // 环流的名字印在海面上
    const labels = [...tWind, tTownW, tTownE, callout];
    const placeTags = () => {
      const on = S.w > 0.6;
      tGyre.forEach(({ t }) => (t.visible = on && S.land));
      [[15, 0], [45, 1], [-15, 2], [-55, 3]].forEach(([lat, i]) => { tWind[i].position.set(0.085, G + 0.022, -nOf(lat)); tWind[i].setOn(S.blow || S.w > 0.05); });
      tTownW.position.set(XW - 0.012, G + 0.014, -nOf(60)); tTownW.setText(`北纬 60° 西岸：${coastEffect(60, 'west')}`).setOn(S.w > 0.6 && S.land);
      tTownE.position.set(XE + 0.012, G + 0.014, -nOf(60)); tTownE.setText(`东岸：${coastEffect(60, 'east')}`).setOn(S.w > 0.6 && S.land); townW.visible = townE.visible = S.land;
      tHint.loc(block, 0, G + 0.012, -nOf(7)).show(S.w > 0.6 && !S.ducks.length);
      tScale.loc(block, XL + 0.08, G + 0.002, NB - 0.008);
      windArrows.visible = S.blow || S.w > 0.05;
    };

    // ---- 侧栏：同纬度两岸比一比 ----
    const drawChart = () => {
      if (!W) return;
      const c = W.chart, g = c.getContext('2d'), w = c.width, hh = c.height, on = S.w > 0.6;
      g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, hh); g.font = '600 13px "PingFang SC", sans-serif'; g.textBaseline = 'middle'; g.fillStyle = '#3a3226'; g.textAlign = 'left';
      W.chart.hidden = !S.land;
      if (!S.land) { W.read.textContent = '无大陆情境没有“两岸”。本模型仅保留东西向流动，不能据此断言真实海洋不形成环流。'; return; }
      g.fillText('沿岸洋流的定性影响（非气温预测）', 8, 12);
      [[60, '北纬 60°'], [25, '北纬 25°']].forEach(([lat, name], i) => {
        g.fillStyle = '#3a3226'; g.fillText(name, 8, 48 + i * 42);
        for (const [side, title, x] of [['west', '西岸', 100], ['east', '东岸', 210]]) { const effect = coastEffect(lat, side); g.fillStyle = effect === '偏暖' ? '#bd492c' : '#315c98'; g.fillText(`${title}：${effect}`, x, 48 + i * 42); }
      });
      W.read.innerHTML = '暖流通常增温增湿，寒流通常降温减湿；气候还受大气环流、地形等影响。<br><small>仅示意影响方向，不表示洋流独立造成的温差。</small>';
    };
    const drawLog = () => {
      if (!W) return;
      const rows = [], r = (b, t) => rows.push(h('div', { class: 'tl-row' }, h('b', {}, b), h('span', {}, t)));
      if (S.saw.gyre) r('风吹起来：', '北半球中低纬转成顺时针的环流、中高纬逆时针；南半球中低纬逆时针；南纬 45°—60° 是向东的西风漂流');
      if (S.saw.duck) r('最近投放的玩具鸭：', `${Math.abs(S.first.lat).toFixed(1)}°${S.first.lat >= 0 ? 'N' : 'S'}，${S.first.motion}；本页未模拟真实沿岸搁浅过程`);
      if (S.saw.noland) r('假如没有大陆：', '本模型仅保留东西向流动的理想情境，不能推广为真实海洋规律');
      if (S.saw.coast) r('同纬度两岸：', '北纬 60° 东岸暖、西岸冷；中低纬大洋东岸有寒流（有助于形成干旱的沙漠），西岸有暖流、湿润；寒暖流交汇处有渔场');
      if (S.guess != null && S.saw.duck) rows.push(h('div', { class: 'tl-row' }, h('small', {}, `你猜：${ASK[1][S.guess]}　实际：你在${Math.abs(S.first.lat).toFixed(1)}°${S.first.lat >= 0 ? 'N' : 'S'}放的鸭子${S.first.motion}${S.first.target ? '（信风推着海水往西）' : '（此次投放不用于题设判断；需中央20°N附近且海水向西流动）'}`)));
      W.log.replaceChildren(...rows);
      if (S.saw.gyre && S.saw.duck && S.saw.noland) W.ui.unlock();
    };

    // ---- 指针：在海上点一下，放玩具鸭 ----
    const plane = new THREE.Plane(), hit = new THREE.Vector3(), wq = new THREE.Vector3();
    const onMap = (ray) => { block.updateMatrixWorld(); block.localToWorld(wq.set(0, G, 0)); plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), wq); if (!ray.intersectPlane(plane, hit)) return null; const l = block.worldToLocal(hit.clone()); return l.x > XL && l.x < XR && Math.abs(l.z) < NB ? { x: l.x, n: -l.z } : null; };
    const pointer = {
      down(rc) { const m = onMap(rc.ray); if (!m || isLand(m.x, m.n, S.land)) return false; addDuck(m.x, m.n); recordDrop(S, m.x, m.n); drawLog(); say1(S.first.motion, m.x, m.n); if (S.w < 0.3) W?.ui.status(S.w === 0 ? '玩具鸭投放时静止。按“让风吹起来”观察变化。' : '玩具鸭已投放，目前风速较小；记录保存投放时的流向。'); placeTags(); return true; },
      move(rc) { const c = document.getElementById('c'); if (c) { const m = onMap(rc.ray); c.style.cursor = m && !isLand(m.x, m.n, S.land) ? 'crosshair' : ''; } return false; },
      up() { return false; },
    };

    placeArrows(); placeTags();

    return {
      group,
      card: false,
      emerge: 'flat',          // 课本的图平放在书页上，模型从它上面长出来、它慢慢淡掉
      size: { w: 0.36, d: 0.26, h: 0.05 },
      view: { elev: 52, azim: 4, lookY: 0.25, frameMargin: 1.05 },
      pointer,
      mount(ui) {
        const acts = buttons([
          { text: '让风吹起来', onClick: () => { S.blow = !S.blow; acts.btns[0].textContent = S.blow ? '风停下' : '让风吹起来'; placeTags(); ui.status(S.blow ? '风吹起来了：<b>信风</b>推着赤道两侧的海水往西，<b>西风</b>推着中纬度的海水往东。看海水碰到大陆以后怎么走。' : '风停了，海水慢慢停下来。'); } },
          { text: '重来', ghost: true, onClick: () => { ui.relock?.(); S.w = 0; S.blow = false; S.land = true; S.saw = {}; S.guess = null; while (S.ducks.length) { const d = S.ducks.pop(); block.remove(d.m, d.line); d.line.geometry.dispose(); } landSeg.set(0); guess.set(-1); acts.btns[0].textContent = '让风吹起来'; callout.show(false); drawMap(); placeArrows(); placeTags(); drawChart(); drawLog(); ui.status('这是一个理想化的大洋，两边是大陆。先按<b>让风吹起来</b>。'); } },
        ]);
        const landSeg = seg('大陆', ['有大陆挡着', '假如没有大陆'], (_, i) => { S.land = !i; S.ducks.forEach((d) => { d.rest = 0; d.np = 0; if (isLand(d.x, d.n, S.land)) d.x = Math.max(XW + 0.001, Math.min(XE - 0.001, d.x)); }); if (i) S.saw.noland = true; drawMap(); placeArrows(); placeTags(); drawChart(); drawLog(); ui.status(i ? '假如没有大陆挡着：本模型仅保留东西向流动，未推导真实无大陆海洋的环流。' : '有大陆情境：预设环流示意风场、地转偏向力和海岸边界的共同影响。'); }, { value: 0 });
        const guess = seg(...ASK, (_, i) => { S.guess = i; drawLog(); }, { value: -1 });
        const chart = h('canvas', { class: 'wx-map', width: 320, height: 130 }), read = h('div', { class: 'read-out' }), log = h('div', { class: 'timeline' });
        ui.controls.append(h('div', { class: 'bar-title' }, '同纬度的大洋两岸'), chart, read, acts.el, guess.el, landSeg.el, note('暖流比流经海区周围海水温度高，寒流较低；流向不是定义。箭头红暖、蓝寒，按典型模式配色；风箭头仅示东西向分量。真实洋流受风场、地转偏向力、压力梯度和海岸边界共同影响，本页预设流线，不模拟搁浅。'));
        ui.data.append(h('div', { class: 'bar-title' }, '你看到了什么'), log);
        W = { ui, chart, read, log };
        ui.status('这是一个理想化的大洋（不是真实地图），西边、东边各一块大陆。先按<b>让风吹起来</b>。');
        drawChart(); drawLog();
      },
      update(dt) {
        labels.forEach((l) => l.tick(dt));
        const d = dt, w0 = S.w;
        const wind = windStep(w0, S.blow, d); S.w = wind.w; frameWind = d > 0 ? wind.integral / d : w0;          // 风吹起来，洋流慢慢建立；风停了，慢慢停下
        if (Math.abs(S.w - w0) > 1e-4) { placeArrows(); placeTags(); if (Math.floor(S.w * 10) !== Math.floor(w0 * 10)) drawChart(); }
        if (S.w > 0.9 && S.land && !S.saw.gyre) { S.saw.gyre = true; drawLog(); say1('风场、地转偏向力和边界共同影响环流', XW + 0.02, nOf(25)); }
        if (S.w > 0.9 && S.land && !S.saw.coast && S.saw.gyre) { S.saw.coast = true; drawLog(); }
        if (calloutT > 0) { calloutT -= dt; if (calloutT <= 0) callout.show(false); }
        for (let k = 0; k < NP; k++) { const o = parts[k]; advect(o, d); o.a += d; if (o.a > 6 || isLand(o.x, o.n, S.land) || Math.abs(o.n) > NB - 0.003) { do { o.x = XL + rnd() * (XR - XL); o.n = -NB + rnd() * 2 * NB; } while (isLand(o.x, o.n, S.land)); o.a = 0; } pp.set([o.x, G + 0.0016, -o.n], k * 3); }
        pg.attributes.position.needsUpdate = true; dots.material.opacity = 0.2 + 0.6 * S.w;
        stepDucks(d);
      },
    };
  },
};
