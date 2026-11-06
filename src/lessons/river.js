// 高中地理 选择性必修1 第二章第三节 河流地貌的发育 · 河谷的演变（课本第 33 页，图 2.27）。
//
// 课本的图就是模型：图 2.27 本来就是三块地块（V 形谷 → 河道变弯 → 槽形谷），这里是一块会自己变的地块，浮在书页上。
// 开头是一片高地，一条刚出现的小河。学生拖时间：河谷先往下切、往源头延长，成了 V 形；落差变小后河道开始变弯，
// 凹岸被冲、凸岸堆积，河道越来越弯，河谷展宽成槽形，凸岸堆出河漫滩。
// 学生自己动手的两件事：
//   1. 切开看：拖地块前面的那把刀，地块从刀口切开，切面就是这里的横剖面（V 形、槽形；河湾处凹岸深陡、凸岸浅缓）。
//   2. 两个渡口（课本开头的问题：镇江的西津渡为什么离长江越来越远）：河道变弯以后，两岸各建一个渡口，可以挪到别处。
//      接着拖时间：凸岸的渡口离江越来越远，脚下淤成了陆地；凹岸的渡口脚下的岸被冲塌。
// 教学示意：竖直方向夸大了；时间大大加快（实际要经过漫长的地质年代）。
import * as THREE from 'three';
import { seg, buttons, note, slider } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { airLabel, groundLabel, noteBadge } from './kit/labels.js';
import { h } from '../ui/Panel.js';
import { XL, XR, ZD, WC, DC, APEX, LAM, smooth, stage, heightAt, gullyAt, waterY, floorY, drop, centerZ, gapAt, topY } from './kit/river.js';

const LIFT = 0;          // 地块直接放在书页上
const NX = 220, NZ = 140;
const ASK = ['先猜一下（可以不猜）：在这个情境里，港口建在哪一岸，过很多年还能停大船？', ['凹岸', '凸岸', '两岸都一样']];
const DOCK_T = 0.62;          // 一开始就是这个时候：河道已经弯了

export default {
  id: 'river',
  fig: '图2.27',
  title: '河谷的演变',
  flow: 'explore',
  ask: '镇江的西津渡，从前就在长江边上，后来离江越来越远，码头埋到了地下。长江岸线为什么会一直往北移？',
  need: '切开一个河湾看哪边水深；把你的港口建在岸边，往后拖时间，看它和西津渡后来怎样了',
  conclusion: {
    page: 37,
    quote: '在河流发育初期，河流落差大，流速快，能量集中，河流侵蚀作用以向下和向源头侵蚀为主，使河谷不断加深和延长。这时的河谷深而窄，谷壁陡峭，横剖面呈“V”形（图2.27 a，图2.28）。“V”形河谷形成后，河流落差减小，河流向下的侵蚀作用减弱，向河谷两岸的侵蚀作用加强，河道开始变得弯曲。河流在凹岸侵蚀，在凸岸堆积（图2.29），使得河道更为弯曲，河谷拓宽（图2.27 b）。长江镇江段南岸为凸岸，北岸为凹岸，所以岸线不断向北推移。经过漫长的过程，河谷展宽，横剖面呈宽而浅的槽形（图2.27 c）。',
    why: '河水流过河湾时，受惯性作用冲向外侧的凹岸，凹岸一侧水深流急，岸被不断冲刷后退；内侧的凸岸水浅流缓，泥沙沉积下来。凹岸越冲越往外，凸岸越堆越往外长，河道就越来越弯，整条河一点点向凹岸那边移动。镇江在南岸，南岸是凸岸：江水在北岸冲刷、在南岸堆积，岸线向北推移，西津渡脚下淤成了陆地。',
    src: '课本第 33 页 · 第二章 第三节 河流地貌的发育',
  },

  create({ tag, reframe }) {
    const group = new THREE.Group();
    const S = { visited: new Set(), t: 0, play: false, cut: XR, drag: null, docks: null, logs: [], done: false, guess: null, cutMoved: false, said: -1 };
    let W = null;
    const block = new THREE.Group(); block.position.y = LIFT; group.add(block);
    const LINE = new THREE.LineBasicMaterial({ color: 0x2a3140, transparent: true, opacity: 0.35 });
    const lit = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.15, roughness: 0.95, metalness: 0, ...o });

    // ---- 影子、取景框 ----
    const shadowTex = canvasTex(256, 256, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(60,45,30,0.45)'); gr.addColorStop(0.6, 'rgba(60,45,30,0.18)'); gr.addColorStop(1, 'rgba(60,45,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry((XR - XL) * 1.3, ZD * 2 * 1.35), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.0006; shadow.raycast = () => {}; shadow.userData.noFrame = true; group.add(shadow);
    const frameBox = new THREE.Mesh(new THREE.BoxGeometry(XR - XL, 0.085, ZD * 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    frameBox.position.y = LIFT + 0.0425; frameBox.raycast = () => {}; group.add(frameBox);

    // ---- 地面：一张高度网格（高地、谷壁、谷底、河道）。颜色按坡度和位置上色，再叠一层细细的笔触纹理（草、砂砾、岩面） ----
    const topGeo = new THREE.BufferGeometry();
    const NV = (NX + 1) * (NZ + 1), tPos = new Float32Array(NV * 3), tCol = new Float32Array(NV * 3), tUV = new Float32Array(NV * 2), idx = [];
    for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) { const a = i * (NZ + 1) + j, b = a + NZ + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    topGeo.setIndex(idx); topGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3)); topGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3)); topGeo.setAttribute('uv', new THREE.BufferAttribute(tUV, 2));
    const grain = canvasTex(512, 512, (g, w) => {          // 笔触：浅底上撒小点、短划，乘到地面颜色上
      g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, w, w);
      for (let i = 0; i < 9000; i++) { const v = 150 + Math.random() * 90; g.fillStyle = `rgba(${v},${v},${v},${0.25 + Math.random() * 0.4})`; const x = Math.random() * w, y = Math.random() * w; if (i % 3) g.fillRect(x, y, 1.6, 1.6); else { g.fillRect(x, y, 1, 3.5); } }
    });
    grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
    const topMesh = new THREE.Mesh(topGeo, new THREE.MeshBasicMaterial({ vertexColors: true, map: grain })); block.add(topMesh);          // 光影直接算进颜色里（像晕渲地图：统一从西北上方来的光，谷底压暗一点），不受书桌灯光的影响
    const LIGHT = new THREE.Vector3(-0.6, 0.9, -0.5).normalize();
    const C = { grass: new THREE.Color(0x86b45c), grass2: new THREE.Color(0x5f9447), grass3: new THREE.Color(0xa9c46e), rock: new THREE.Color(0xc29a64), rock2: new THREE.Color(0x8c6840), gully: new THREE.Color(0x4f7a3a), sand: new THREE.Color(0xe7d49a), sand2: new THREE.Color(0xd2b97c), bed: new THREE.Color(0xa8916a), flat: new THREE.Color(0xb3cc80) };
    const tmp = new THREE.Color();
    const noise = (x, z) => 0.5 + 0.25 * Math.sin(x * 61 + Math.sin(z * 37) * 2) + 0.25 * Math.sin(z * 83 - x * 29 + Math.sin(x * 17));          // 成片的深浅

    // ---- 水：沿河道的一条水带（边缘平滑），上面一层慢慢流动的波纹 ----
    const ripple = canvasTex(256, 64, (g, w, hh) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, hh);
      for (let i = 0; i < 70; i++) { const y = Math.random() * hh, x = Math.random() * w, l = 10 + Math.random() * 30; g.strokeStyle = `rgba(210,232,245,${0.4 + Math.random() * 0.4})`; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (Math.random() - 0.5) * 2); g.stroke(); }
    });
    ripple.wrapS = ripple.wrapT = THREE.RepeatWrapping;
    const waterGeo = new THREE.BufferGeometry(), WQ = 4;
    const water = new THREE.Mesh(waterGeo, new THREE.MeshBasicMaterial({ map: ripple, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false })); water.renderOrder = 3; water.raycast = () => {}; block.add(water);
    const cDeep = new THREE.Color(0x3f86b8), cShallow = new THREE.Color(0x8cc4de);
    const placeWater = (x1, t) => {
      const st = stage(t), P = [], Cc = [], U = [], I = [], x0 = st.head + 0.012; let acc = 0, prev = null, row = 0;
      for (let i = 0; i <= NX; i++) {
        const x = x0 + (x1 - x0) * (i / NX); if (x1 <= x0) break;
        const f = smooth(st.head, st.head + 0.04, x), dc = DC * f * (0.6 + 0.4 * st.inc), hw = (WC / 2) * Math.sqrt(Math.max(0, 1 - 0.0016 / Math.max(1e-5, dc))) * smooth(x0, x0 + 0.03, x);
        const zc = centerZ(x, t), wy = waterY(x, t);
        if (prev) acc += Math.hypot(x - prev[0], zc - prev[1]); prev = [x, zc];
        const outerS = Math.sign(-zc) || 0;          // 凹岸在哪一边（−1：北，+1：南）：那边水深、颜色深；凸岸那边水浅，透出沙底
        for (let q = 0; q <= WQ; q++) { const v = q / WQ, z = zc - hw + 2 * hw * v, side = (v - 0.5) * 2, deep = Math.max(0, Math.min(1, 0.55 + 0.45 * (outerS ? -side * outerS : 0) - Math.abs(side) * 0.25)); P.push(x, wy, z); tmp.copy(cShallow).lerp(cDeep, deep * Math.sin(v * Math.PI) ** 0.5); if (q === 0 || q === WQ) tmp.lerp(new THREE.Color(0xe6f2f7), 0.55); Cc.push(tmp.r, tmp.g, tmp.b); U.push(acc * 26, v); }
        if (row) { const a = (row - 1) * (WQ + 1); for (let q = 0; q < WQ; q++) I.push(a + q, a + q + 1, a + q + WQ + 1, a + q + 1, a + q + WQ + 2, a + q + WQ + 1); }
        row++;
      }
      waterGeo.dispose(); waterGeo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); waterGeo.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3)); waterGeo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); waterGeo.setIndex(I); waterGeo.computeVertexNormals(); waterGeo.computeBoundingSphere();
    };

    // ---- 树：高地上一丛丛的小树；那里被河谷冲掉了，树就跟着没了 ----
    const NT = 170, trees = new THREE.InstancedMesh(new THREE.ConeGeometry(0.0026, 0.0075, 7).translate(0, 0.0037, 0), new THREE.MeshStandardMaterial({ color: 0x3f6f35, roughness: 0.9, emissive: 0x1d3318, emissiveIntensity: 0.4 }), NT);
    trees.raycast = () => {}; block.add(trees);
    const rr = (() => { let q = 17; return () => ((q = (q * 16807) % 2147483647) / 2147483647); })();
    const clusters = Array.from({ length: 30 }, () => [XL + 0.01 + rr() * (XR - XL - 0.02), (rr() * 2 - 1) * (ZD - 0.01), 2 + Math.floor(rr() * 8)]);          // 一丛丛大小不一的树林，位置随机（固定种子）
    const treeAt = Array.from({ length: NT }, (_, k) => { const [cx, cz, m] = clusters[k % clusters.length], a = rr() * 6.28, d = Math.sqrt(rr()) * 0.004 * m; return [cx + Math.cos(a) * d, Math.max(-ZD + 0.004, Math.min(ZD - 0.004, cz + Math.sin(a) * d)), 0.7 + rr() * 0.6]; });
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v4 = new THREE.Vector3(), s4 = new THREE.Vector3();
    const placeTrees = (x1, t) => {
      treeAt.forEach(([x, z, sc], k) => {
        const y = heightAt(x, z, t), keep = x < x1 - 0.003 ? smooth(topY(x) - 0.004, topY(x) - 0.0015, y) : 0;          // 只长在原来的高地面上
        m4.compose(v4.set(x, y - 0.0004, z), q4, s4.setScalar(Math.max(1e-4, sc * keep))); trees.setMatrixAt(k, m4);
      });
      trees.instanceMatrix.needsUpdate = true;
    };

    // ---- 侧面：一层层的岩层（切面就是横剖面） ----
    const strata = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL || '/'}tex/geo/strata-side.jpg`); strata.colorSpace = THREE.SRGBColorSpace; strata.wrapS = strata.wrapT = THREE.RepeatWrapping;          // 手绘的岩层（生成的贴图，可左右平铺）
    const sides = [0.8, 0.86, 0.74, 0.97].map((c) => { const m = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ map: strata, color: new THREE.Color(c, c, c), side: THREE.DoubleSide })); block.add(m); return m; });          // 四个侧面明暗不同；切面最亮
    const outline = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x5a4028, transparent: true, opacity: 0.45 })); outline.raycast = () => {}; block.add(outline);
    const side = (m, pts) => {          // pts：沿着边的顶面点 [x, y, z]；从顶面一直到底（y = 0）
      const P = [], U = [], I = [];
      pts.forEach(([x, y, z], k) => { P.push(x, y, z, x, 0, z); const s = k / (pts.length - 1); U.push(s * 2.2, y / 0.075, s * 2.2, 0); if (k) { const a = (k - 1) * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
      m.geometry.dispose(); m.geometry = new THREE.BufferGeometry(); m.geometry.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); m.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); m.geometry.setIndex(I); m.geometry.computeVertexNormals();
    };

    const build = () => {
      const t = S.t, x1 = S.cut, st = stage(t);
      for (let i = 0; i <= NX; i++) {
        const x = XL + (x1 - XL) * (i / NX);
        for (let j = 0; j <= NZ; j++) { const z = -ZD + 2 * ZD * (j / NZ), k = i * (NZ + 1) + j; tPos.set([x, heightAt(x, z, t), z], k * 3); tUV.set([x * 9, z * 9], k * 2); }
      }
      topGeo.attributes.position.needsUpdate = true; topGeo.attributes.uv.needsUpdate = true; topGeo.computeVertexNormals(); topGeo.computeBoundingSphere(); topGeo.computeBoundingBox();
      const nrm = topGeo.attributes.normal;
      for (let i = 0; i <= NX; i++) {
        const x = XL + (x1 - XL) * (i / NX), fy = floorY(x, t), zc = centerZ(x, t), ty = topY(x);
        for (let j = 0; j <= NZ; j++) {
          const k = i * (NZ + 1) + j, z = tPos[k * 3 + 2], y = tPos[k * 3 + 1], ny = nrm.getY(k), n = noise(x, z), gl = gullyAt(x, z, t);
          const steep = smooth(0.93, 0.7, ny), onFloor = y < fy + 0.0012 && st.floorHalf > WC * 0.8, inCh = Math.abs(z - zc) < WC / 2 && y < fy - 0.0004;
          const o = Math.sign(z - zc) === Math.sign(-centerZ(x, t)) || Math.abs(centerZ(x, t)) < 0.004 ? 1 : 0;          // 1：这一边是凸岸（河湾内侧）
          if (inCh) tmp.copy(C.bed);
          else if (onFloor && o && Math.abs(z - zc) - WC / 2 < 0.012 && st.amp > 0.008) tmp.copy(C.sand).lerp(new THREE.Color(0xf0e2b4), 0.5);          // 凸岸：一片浅色的沙洲（堆积）
          else if (onFloor) { tmp.copy(C.sand).lerp(C.sand2, n * 0.5).lerp(C.flat, smooth(0.006, 0.03, Math.abs(z - zc) - WC / 2) * 0.55 * smooth(0.7, 1, t)); }          // 谷底：靠河是沙和砂砾，离河远、年代久的地方长了草
          else { tmp.copy(C.grass).lerp(n > 0.55 ? C.grass2 : C.grass3, Math.abs(n - 0.55) * 1.4); const rk = tmp.clone().copy(C.rock).lerp(C.rock2, n * 0.6); tmp.lerp(rk, steep * (0.45 + 0.55 * smooth(0.35, 0.75, n))); if (gl > 0.0012 && y < ty - 0.002) tmp.lerp(C.gully, 0.5); }          // 高地：成片深浅的草；谷壁：岩面；冲沟里长着树丛          // 谷坡上一片片还长着草，露岩的地方是岩面
          const lam = 0.66 + 0.46 * Math.max(0, nrm.getX(k) * LIGHT.x + nrm.getY(k) * LIGHT.y + nrm.getZ(k) * LIGHT.z), ao = 1 - 0.2 * smooth(0, 0.045, ty - y);
          tmp.multiplyScalar(lam * ao);
          tCol.set([tmp.r, tmp.g, tmp.b], k * 3);
        }
      }
      topGeo.attributes.color.needsUpdate = true;
      placeWater(x1, t); placeTrees(x1, t);
      const along = (z) => Array.from({ length: NX + 1 }, (_, i) => { const x = XL + (x1 - XL) * (i / NX); return [x, heightAt(x, z, t), z]; });
      const across = (x) => Array.from({ length: NZ + 1 }, (_, j) => { const z = -ZD + 2 * ZD * (j / NZ); return [x, heightAt(x, z, t), z]; });
      const cutPts = across(x1);
      side(sides[0], along(-ZD)); side(sides[1], along(ZD)); side(sides[2], across(XL)); side(sides[3], cutPts);
      const L = [];          // 切面的轮廓线描深一点，就是横剖面
      for (let j = 0; j < NZ; j++) L.push(...cutPts[j], ...cutPts[j + 1]);
      for (const [x, z] of [[XL, -ZD], [XL, ZD], [x1, -ZD], [x1, ZD]]) L.push(x, 0, z, x, heightAt(x, z, t), z);
      L.push(XL, 0, -ZD, x1, 0, -ZD, XL, 0, ZD, x1, 0, ZD, XL, 0, -ZD, XL, 0, ZD, x1, 0, -ZD, x1, 0, ZD);
      outline.geometry.dispose(); outline.geometry = new THREE.BufferGeometry(); outline.geometry.setAttribute('position', new THREE.Float32BufferAttribute(L, 3));
      // 切面上的水：河道那一段画一块水的截面；谷底上面一层是河流堆积的泥沙（冲积层），下面才是原来的岩层
      placeCutWater(x1, t);
      const th = 0.004 * smooth(0.45, 1, t), fy1 = floorY(x1, t), A = [];
      if (th > 0.0002) for (let j = 0; j < NZ; j++) {
        const [, ya, za] = cutPts[j], [, yb, zb] = cutPts[j + 1];
        if (ya > fy1 + 0.0008 || yb > fy1 + 0.0008 || gapAt(x1, za, t) < 0 || gapAt(x1, zb, t) < 0) continue;
        const X = x1 + 0.0003; A.push(X, ya, za, X, ya - th, za, X, yb - th, zb, X, ya, za, X, yb - th, zb, X, yb, zb);
      }
      alluv.geometry.dispose(); alluv.geometry = new THREE.BufferGeometry(); alluv.geometry.setAttribute('position', new THREE.Float32BufferAttribute(A, 3)); alluv.visible = A.length > 0;
      knife.position.set(x1, 0, 0); placeRail(x1);
    };
    const alluvTex = canvasTex(128, 32, (g, w, hh) => { g.fillStyle = '#e2cf93'; g.fillRect(0, 0, w, hh); for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(120,95,55,${0.25 + Math.random() * 0.35})`; g.fillRect(Math.random() * w, Math.random() * hh, 1.5, 1.5); } });
    const alluv = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ map: alluvTex, side: THREE.DoubleSide })); alluv.raycast = () => {}; block.add(alluv);
    const cutWaterGeo = new THREE.BufferGeometry(), cutWater = new THREE.Mesh(cutWaterGeo, new THREE.MeshBasicMaterial({ color: 0x5aa3cc, transparent: true, opacity: 0.85, side: THREE.DoubleSide })); cutWater.raycast = () => {}; block.add(cutWater);
    const placeCutWater = (x, t) => {
      const zc = centerZ(x, t), wy = waterY(x, t), P = [];
      if (x > stage(t).head + 0.01) for (let j = 0; j < 24; j++) { const z0 = zc - WC / 2 + (WC * j) / 24, z1 = z0 + WC / 24, y0 = heightAt(x, z0, t), y1 = heightAt(x, z1, t); if (y0 < wy && y1 < wy) P.push(x + 0.0004, y0, z0, x + 0.0004, wy, z0, x + 0.0004, wy, z1, x + 0.0004, y0, z0, x + 0.0004, wy, z1, x + 0.0004, y1, z1); }
      cutWaterGeo.dispose(); cutWaterGeo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); cutWater.visible = P.length > 0;
    };

    // ---- 切刀：挂在地块前沿的一根导轨上，拖着它沿导轨走，地块就从刀口切开 ----
    const steel = new THREE.MeshStandardMaterial({ color: 0xc9ced6, emissive: 0x6b7280, emissiveIntensity: 0.35, metalness: 0.5, roughness: 0.35 });
    const RY = 0.084, RZ = ZD + 0.007;
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.0011, 0.0011, 1, 10), steel); rail.rotation.z = Math.PI / 2; rail.raycast = () => {}; block.add(rail);
    const postGeo = (x) => new THREE.CylinderGeometry(0.0008, 0.0008, RY - topY(x) + 0.002, 8);
    const post0 = new THREE.Mesh(postGeo(XL + 0.06), steel); post0.position.set(XL + 0.06, (RY + topY(XL + 0.06)) / 2, RZ); post0.raycast = () => {}; block.add(post0);
    const post1 = new THREE.Mesh(postGeo(XR), steel); post1.raycast = () => {}; block.add(post1);
    const placeRail = (x1) => { rail.scale.y = x1 - (XL + 0.06); rail.position.set((XL + 0.06 + x1) / 2, RY, RZ); post1.geometry.dispose(); post1.geometry = postGeo(x1); post1.position.set(x1, (RY + topY(x1)) / 2, RZ); };          // 导轨只伸到切口，切开以后不会悬空伸出去
    const knife = new THREE.Group(); block.add(knife);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 20, 14), new THREE.MeshStandardMaterial({ color: 0xc0462e, emissive: 0x7a2416, emissiveIntensity: 0.35, roughness: 0.45 })); knob.position.set(0, RY, RZ); knife.add(knob);
    const pointerGeo = new THREE.ConeGeometry(0.0022, 0.006, 3); pointerGeo.rotateX(Math.PI);
    const ptr = new THREE.Mesh(pointerGeo, knob.material); ptr.position.set(0, RY - 0.0068, RZ); knife.add(ptr);          // 小尖头指着刀口
    const knifePick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.02), new THREE.MeshBasicMaterial({ visible: false })); knifePick.position.set(0, RY - 0.002, RZ); knifePick.userData.pick = true; knife.add(knifePick);

    // ---- 渡口：一段木栈桥 + 一间小屋。挪到哪儿，就在哪儿的河岸上 ----
    const makeDock = (south) => {
      const g = new THREE.Group(), wood = lit(0x8a6240);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.0015, 0.014), wood); deck.position.set(0, 0.002, south ? -0.004 : 0.004); g.add(deck);
      for (const dz of [-0.011, -0.001]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.0007, 0.0007, 0.008, 6), wood); p.position.set(0, -0.002, (south ? 1 : -1) * dz); g.add(p); }
      const hut = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, 0.008), lit(0xf3ede1)); hut.position.set(0, 0.003, south ? 0.005 : -0.005); g.add(hut);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.0068, 0.004, 4), lit(0x6f7f95)); roof.rotation.y = Math.PI / 4; roof.position.set(0, 0.008, south ? 0.005 : -0.005); g.add(roof);
      const pick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.03), new THREE.MeshBasicMaterial({ visible: false })); pick.userData.pick = true; g.add(pick);
      g.visible = false; block.add(g); return { g, pick, south, x: APEX, z: 0, t0: DOCK_T, g0: 0.003, seen: null, moved: false, placed: south, tag: airLabel(block, '', { h: 0.0115, color: '#2c3245', icon: 'anchor', dim: 0 }) };
    };
    const docks = [makeDock(true), makeDock(false)];
    const atBank = (d, x, side, t) => { const zc = centerZ(x, t); d.x = x; d.z = zc + side * (WC / 2 + 0.003); d.t0 = t; d.g0 = gapAt(d.x, d.z, t); d.seen = null; };          // 渡口建在水边（谷底上）
    const TRAY = [XL + 0.04, ZD + 0.035];          // 你的港口一开始放在地块外面的书页上，等你拖到岸边
    const homeDock = (d) => { if (d.south) { atBank(d, APEX, 1, DOCK_T); d.placed = true; } else { d.placed = false; d.seen = null; } d.moved = false; };          // 南岸那个是西津渡（课本的例子）；另一个是你的港口
    docks.forEach(homeDock);
    const bankName = (d) => { const zc = centerZ(d.x, d.t0), k = 2 * Math.PI / LAM, c = Math.sin(k * (d.x - APEX) - Math.PI / 2), outerNorth = c < 0; const north = d.z < zc; return stage(d.t0).amp < 0.008 ? '岸边' : north === outerNorth ? '凹岸' : '凸岸'; };
    const fateOf = (d) => {          // 按现在的时间算：河道移过了渡口脚下＝岸塌了；水边离开它比建的时候远了很多＝淤成了陆地
      if (S.t <= d.t0 + 0.001) return null;
      const gap = gapAt(d.x, d.z, S.t), sideNow = Math.sign(d.z - centerZ(d.x, S.t)), side0 = Math.sign(d.z - centerZ(d.x, d.t0));
      return gap < 0 || sideNow !== side0 ? 'fell' : gap - d.g0 > 0.012 ? 'far' : null;
    };
    const depthAt = (d, flip = 1) => { const zc = centerZ(d.x, S.t), side = (Math.sign(d.z - zc) || 1) * flip; return waterY(d.x, S.t) - heightAt(d.x, zc + side * WC * 0.3, S.t); };          // 靠这一岸（flip = −1：对岸）的河道里水有多深
    const nameOf = (d) => (d.south ? '西津渡' : '你的港口');
    const placeDocks = () => {
      for (const d of docks) {
        if (!d.placed) { d.g.visible = S.t >= DOCK_T - 0.001; d.g.position.set(TRAY[0], -LIFT + 0.0062, TRAY[1]); d.g.rotation.x = 0; d.tag.position.set(TRAY[0], -LIFT + 0.02, TRAY[1]); d.tag.setText('你的港口 · 拖到岸边').setOn(d.g.visible); continue; }
        const show = S.t >= d.t0 - 0.001 && d.x < S.cut - 0.006 && S.t >= DOCK_T - 0.001;
        d.g.visible = show; d.tag.setOn(show); if (!show) continue;
        const y = heightAt(d.x, d.z, S.t), f = fateOf(d);
        if (f === 'fell' || (f === 'far' && d.seen !== 'fell')) d.seen = f;          // 这一轮看到过的结局（记录里写）
        const fallen = f === 'fell', deep = depthAt(d) > depthAt(d, -1) * 1.25;          // 和对岸比：深得多才算水深
        d.g.position.set(d.x, fallen ? Math.max(y, waterY(d.x, S.t)) - 0.004 : y, d.z); d.g.rotation.x = fallen ? (d.z > centerZ(d.x, d.t0) ? -0.6 : 0.6) : 0;
        d.tag.position.set(d.x, y + (d.south ? 0.004 : 0.03), d.z + (d.south ? 0.03 : -0.01)); d.tag.setText(`${nameOf(d)} · ${bankName(d)}${fallen ? ' · 岸塌了' : f === 'far' ? ' · 离江远了' : deep ? ' · 水深，大船能靠' : ' · 水浅'}`);
      }
    };

    // ---- 测水深：刀切到哪儿，面板里就画出那里河道的横剖面 ----
    const drawDepth = () => {
      if (!W) return;
      const c = W.depth, g = c.getContext('2d'), w = c.width, hh = c.height, x = S.cut - 0.001, t = S.t, zc = centerZ(x, t), wy = waterY(x, t), span = WC * 1.15;
      g.fillStyle = '#f4efe2'; g.fillRect(0, 0, w, hh);
      const X = (z) => w / 2 + ((z - zc) / span) * (w / 2 - 20), Y = (y) => 26 + ((wy + 0.0015 - y) / 0.0085) * (hh - 46);
      g.fillStyle = 'rgba(90,163,204,0.9)'; g.fillRect(0, Y(wy), w, hh - Y(wy));          // 先铺一层水，再画河床盖住河床以下的部分
      g.fillStyle = '#d7c08a'; g.beginPath(); g.moveTo(0, hh); for (let k = 0; k <= 120; k++) { const z = zc - span + (2 * span * k) / 120; g.lineTo(X(z), Math.min(hh, Y(heightAt(x, z, t)))); } g.lineTo(w, hh); g.closePath(); g.fill();
      g.strokeStyle = '#8a6a40'; g.lineWidth = 1.2; g.stroke();
      g.strokeStyle = '#2f6fb0'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, Y(wy)); g.lineTo(w, Y(wy)); g.stroke();
      const k2 = 2 * Math.PI / LAM, c0 = Math.sin(k2 * (x - APEX) - Math.PI / 2), bend = stage(t).amp > 0.008 && Math.abs(c0) > 0.45, outerNorth = c0 < 0;
      g.font = '600 12px "PingFang SC", sans-serif'; g.fillStyle = '#2a3140'; g.textAlign = 'left'; g.fillText(`北岸${bend ? (outerNorth ? '（凹岸）' : '（凸岸）') : ''}`, 6, 16); g.textAlign = 'right'; g.fillText(`南岸${bend ? (outerNorth ? '（凸岸）' : '（凹岸）') : ''}`, w - 6, 16);
      g.textAlign = 'center'; g.fillStyle = '#5f4f3c'; g.fillText(bend ? '这里是河湾：最深的地方偏向凹岸' : '这里河道比较直：两边差不多', w / 2, hh - 6);
      if (bend && S.cutMoved && !S.measured) { S.measured = true; drawLogs(); }          // 你自己拖刀切到河湾才算测过
    };

    // ---- 标签 ----
    const tStage = airLabel(block, '', { h: 0.0105, color: '#a8341f', dim: 0 }), tKnife = tag('<span>拖这个红球往上游走</span><small>切开看横剖面</small>', 'hint'), tScale = noteBadge(tag, '教学示意：竖直方向夸大了，时间大大加快');
    const tOuter = airLabel(block, '凹岸', { h: 0.0135, color: '#12305a', dim: 0 }), tInner = airLabel(block, '凸岸', { h: 0.0135, color: '#12305a', dim: 0 }), tPlain = groundLabel(block, '河漫滩（凸岸堆积的泥沙）', { h: 0.011, color: '#3a2a16', opacity: 0.9 });          // 河道太窄，两岸的名字立在岸边；河漫滩的名字印在滩面上
    const stageOf = (t) => (t < 0.08 ? 0 : t < 0.35 ? 1 : t < 0.6 ? 2 : t < 0.93 ? 3 : 4);
    const STAGE = [
      ['一条刚出现的小河', ''],
      ['向下、向源头侵蚀为主：河谷加深、延长', '横剖面：深而窄的“V”形'],
      ['落差减小：向下侵蚀减弱，向两岸侵蚀加强，河道开始变弯', '横剖面：谷底开始变宽'],
      ['凹岸侵蚀、凸岸堆积：河道更弯，河谷拓宽', '横剖面：谷底更宽'],
      ['河谷展宽：横剖面成了宽而浅的槽形', '横剖面：宽而浅的槽形'],
    ];
    const placeTags = () => {
      const t = S.t, x1 = S.cut, s = stageOf(t), st = stage(t);
      tStage.position.set(x1, 0.095, -ZD + 0.02); tStage.setText(STAGE[s][1] || '横剖面').setOn(s > 0);
      tKnife.loc(block, x1 + 0.045, RY + 0.025, RZ + 0.004).show(!S.cutMoved && t > 0.15);          // 写在导轨上方、红球的上游那边
      const xb = APEX - LAM / 2, bend = st.amp > 0.012 && x1 > xb + 0.02, zc = centerZ(xb, t);          // 另一个湾（向南凸）标上凹岸、凸岸；有渡口的那个湾看渡口的牌子
      tOuter.position.set(xb, waterY(xb, t) + 0.006, zc + WC / 2 + 0.004); tOuter.setOn(bend); tInner.position.set(xb, waterY(xb, t) + 0.006, zc - WC / 2 - 0.014); tInner.setOn(bend);
      tPlain.position.set(xb - 0.045, floorY(xb, t) + 0.0012, centerZ(xb - 0.045, t) - WC / 2 - 0.022); tPlain.visible = t > 0.75 && x1 > xb + 0.02;          // 离凹岸、凸岸的牌子远一点
      tScale.loc(block, XL + 0.07, -0.006, ZD + 0.01);
    };

    // ---- 记录：你看到了什么 ----
    const record = () => {
      const s = stageOf(S.t);
      S.logs = [...S.visited].sort().filter((k) => k > 0).map((k) => STAGE[k][0]);          // 只记你真的拖到、看到过的阶段，不替你把前面的过程写好
      if (s !== S.said && W) { S.said = s; W.ui.status(s === 0 ? '这是一片高地，中间刚出现一条小河。拖下面的<b>时间</b>（或按“流下去”），看河谷怎么变。' : Math.abs(S.t - DOCK_T) < 0.002 ? '这是一段弯弯的河，南岸那个是西津渡。先拖<b>红球</b>切开一个河湾，看左边小图：哪一岸水深？再把<b>你的港口</b>拖到岸边，然后往后拖时间。' : STAGE[s][0] + '。'); }
      drawLogs();
    };
    const drawLogs = () => {
      if (!W) return;
      const rows = [h('div', { class: 'tl-row' }, h('b', {}, '河谷：'), h('span', {}, S.logs.length ? S.logs.join(' → ') : '还没开始'))];
      if (S.measured) rows.push(h('div', { class: 'tl-row' }, h('b', {}, '切开河湾：'), h('span', {}, '凹岸一侧水深、岸陡；凸岸一侧水浅、岸缓')));
      for (const d of docks) if (d.placed && (d.seen || !d.south)) rows.push(h('div', { class: 'tl-row' }, h('b', {}, `${nameOf(d)}（${bankName(d)}）：`), h('span', {}, d.seen === 'fell' ? '水一直深，船能靠岸；可是河道往这边移，岸被冲塌了（凹岸要修护岸）' : d.seen === 'far' ? '水边越退越远，脚下的泥沙淤成了陆地，船靠不了了' : '刚建好，往后拖时间看看')));
      const mine = docks[1];
      if (mine.seen && S.guess != null) rows.push(h('div', { class: 'tl-row' }, h('small', {}, `你猜：${ASK[1][S.guess]}　实际：凹岸水深能停大船，但岸在后退要护岸；凸岸会淤浅`)));
      W.logs.replaceChildren(...rows);
      W.drop.textContent = `河床的落差（示意）：${drop(S.t) > 0.017 ? '大' : drop(S.t) > 0.009 ? '在变小' : '小'}`;
      if (!S.done && S.measured && docks.every((d) => d.placed && d.seen)) { S.done = true; W.ui.unlock(); }
    };

    const setT = (t, user = false) => { S.t = Math.min(1, Math.max(0, t)); if (user) S.visited.add(stageOf(S.t)); build(); placeDocks(); placeTags(); record(); drawDepth(); if (W) W.time.input.value = Math.round(S.t * 1000); };

    // ---- 拖刀、拖渡口 ----
    const plane = new THREE.Plane(), hit = new THREE.Vector3(), wq = new THREE.Vector3();
    const onFloor = (ray, y) => { block.updateMatrixWorld(); block.localToWorld(wq.set(0, y, 0)); plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), wq); if (!ray.intersectPlane(plane, hit)) return null; return block.worldToLocal(hit.clone()); };
    const pickAt = (rc) => { const hits = rc.intersectObjects([knifePick, ...docks.filter((d) => d.g.visible && !d.south).map((d) => d.pick)], false); if (!hits.length) return null; return hits[0].object === knifePick ? 'knife' : docks.find((d) => d.pick === hits[0].object); };          // 西津渡是课本里的，不搬；你的港口可以拖
    const pointer = {
      down(rc) { const w = pickAt(rc); if (!w) return false; S.drag = w; document.getElementById('c').style.cursor = 'grabbing'; return true; },
      move(rc) {
        const c = document.getElementById('c');
        if (!S.drag) { if (c) c.style.cursor = pickAt(rc) ? 'grab' : ''; return false; }
        if (S.drag === 'knife') { const p = onFloor(rc.ray, 0.06); if (!p) return true; S.cut = Math.min(XR, Math.max(XL + 0.08, p.x)); S.cutMoved = true; build(); placeDocks(); placeTags(); drawDepth(); drawLogs(); return true; }
        const d = S.drag, p = onFloor(rc.ray, floorY(d.x, S.t)); if (!p) return true;
        const x = Math.min(S.cut - 0.012, Math.max(stage(S.t).head + 0.03, p.x)), side = Math.sign(p.z - centerZ(x, S.t)) || 1;
        atBank(d, x, side, S.t); d.moved = true; d.placed = true;          // 拖到哪儿，就建在那儿的水边，从现在起看
        placeDocks(); drawLogs(); return true;
      },
      up() { if (!S.drag) return false; S.drag = null; document.getElementById('c').style.cursor = ''; return true; },
    };

    setT(DOCK_T);

    return {
      group,
      card: false,
      emerge: 'flat',          // 课本的图平放在书页上，模型从它上面长出来、它慢慢淡掉：一张图立了起来，连贯不闪
      size: { w: 0.36, d: 0.22, h: 0.12 },
      view: { elev: 32, azim: 48, lookY: 0.4, frameMargin: 1.2 },          // 从下游的东南方向、略高处看：河道和切面（横剖面）都看得见
      pointer,
      mount(ui) {
        const time = slider('时间（示意，实际要经过漫长的年代）', { min: 0, max: 1000, value: Math.round(DOCK_T * 1000), fmt: () => '', onInput: (v) => { S.play = false; playBtn.textContent = '流下去'; setT(v / 1000, true); } });
        const acts = buttons([
          { text: '流下去', onClick: () => { S.play = !S.play; if (S.play && S.t >= 1) setT(DOCK_T); playBtn.textContent = S.play ? '停一下' : '流下去'; } },
          { text: '从头看这条河谷是怎么来的', ghost: true, onClick: () => { setT(0); S.play = true; playBtn.textContent = '停一下'; } },
          { text: '重来', ghost: true, onClick: () => { ui.relock?.(); S.play = false; playBtn.textContent = '流下去'; S.cut = XR; S.cutMoved = false; S.measured = false; S.logs = []; S.visited = new Set(); S.guess = null; S.done = false; S.said = -1; docks.forEach(homeDock); guess.set(-1); setT(DOCK_T); } },
        ]);
        const playBtn = acts.btns[0];
        const guess = seg(...ASK, (_, i) => { S.guess = i; drawLogs(); }, { value: -1 });
        const logs = h('div', { class: 'timeline' }), dropEl = h('p', { class: 'note' });
        const depth = h('canvas', { class: 'wx-map', width: 320, height: 120 });
        ui.controls.append(h('div', { class: 'bar-title' }, '切开处河道的横剖面（测水深）'), depth, guess.el, time.el, acts.el, note('红球（刀）和你的港口都可以拖。'));
        ui.data.append(dropEl, h('div', { class: 'bar-title' }, '你看到了什么'), logs);
        W = { ui, logs, time, drop: dropEl, play: playBtn, depth };
        drawDepth();
        S.said = -1; record();
      },
      update(dt) {
        [tStage, tOuter, tInner, ...docks.map((d) => d.tag)].forEach((l) => l.tick(dt));
        ripple.offset.x -= dt * 0.35;          // 水往下游流（+x）
        if (S.play) { setT(S.t + dt / 24, true); if (S.t >= 1) { S.play = false; if (W) W.play.textContent = '流下去'; } }
      },
    };
  },
};
