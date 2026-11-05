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
import { h } from '../ui/Panel.js';
import { XL, XR, ZD, WC, APEX, LAM, smooth, stage, heightAt, waterY, floorY, drop, centerZ, gapAt, topY } from './kit/river.js';

const LIFT = 0.04;
const NX = 170, NZ = 110;
const ASK = ['先猜一下（可以不猜）：在这个情境里，再过很久，原来建在南岸（凸岸）的渡口会——', ['被江水冲掉', '离江越来越远', '一直在江边']];
const DOCK_T = 0.62;          // 河道变弯以后，两岸建起渡口

export default {
  id: 'river',
  fig: '图2.27',
  title: '河谷的演变',
  flow: 'explore',
  ask: '镇江的西津渡，从前就在长江边上，后来离江越来越远，码头埋到了地下。长江岸线为什么会一直往北移？',
  need: '把时间拖到最后，看河谷从 V 形变成槽形；切开河湾看一看；看两岸的渡口后来怎样了',
  conclusion: {
    page: 37,
    quote: '在河流发育初期，河流落差大，流速快，能量集中，河流侵蚀作用以向下和向源头侵蚀为主，使河谷不断加深和延长。这时的河谷深而窄，谷壁陡峭，横剖面呈“V”形（图2.27 a，图2.28）。“V”形河谷形成后，河流落差减小，河流向下的侵蚀作用减弱，向河谷两岸的侵蚀作用加强，河道开始变得弯曲。河流在凹岸侵蚀，在凸岸堆积（图2.29），使得河道更为弯曲，河谷拓宽（图2.27 b）。长江镇江段南岸为凸岸，北岸为凹岸，所以岸线不断向北推移。经过漫长的过程，河谷展宽，横剖面呈宽而浅的槽形（图2.27 c）。',
    why: '河水流过河湾时，受惯性作用冲向外侧的凹岸，凹岸一侧水深流急，岸被不断冲刷后退；内侧的凸岸水浅流缓，泥沙沉积下来。凹岸越冲越往外，凸岸越堆越往外长，河道就越来越弯，整条河一点点向凹岸那边移动。镇江在南岸，南岸是凸岸：江水在北岸冲刷、在南岸堆积，岸线向北推移，西津渡脚下淤成了陆地。',
    src: '课本第 33 页 · 第二章 第三节 河流地貌的发育',
  },

  create({ tag, reframe }) {
    const group = new THREE.Group();
    const S = { t: 0, play: false, cut: XR, drag: null, docks: null, logs: [], done: false, guess: null, cutMoved: false, said: -1 };
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

    // ---- 地面：一张高度网格（高地、谷壁、谷底、河道），颜色跟着地形走 ----
    const topGeo = new THREE.BufferGeometry();
    const tPos = new Float32Array((NX + 1) * (NZ + 1) * 3), tCol = new Float32Array((NX + 1) * (NZ + 1) * 3), idx = [];
    for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) { const a = i * (NZ + 1) + j, b = a + NZ + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    topGeo.setIndex(idx); topGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3)); topGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
    const topMesh = new THREE.Mesh(topGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, emissive: 0x222222, emissiveIntensity: 0.25 })); block.add(topMesh);
    const wPos = new Float32Array((NX + 1) * (NZ + 1) * 3), wCol = new Float32Array((NX + 1) * (NZ + 1) * 4), waterGeo = new THREE.BufferGeometry();
    waterGeo.setIndex(idx); waterGeo.setAttribute('position', new THREE.BufferAttribute(wPos, 3)); waterGeo.setAttribute('color', new THREE.BufferAttribute(wCol, 4));
    const water = new THREE.Mesh(waterGeo, new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, roughness: 0.25, metalness: 0, depthWrite: false })); water.renderOrder = 3; block.add(water);
    const C = { grass: new THREE.Color(0x8db866), grass2: new THREE.Color(0x76a356), rock: new THREE.Color(0xa98452), rock2: new THREE.Color(0x8a6a45), sand: new THREE.Color(0xe2cf93), bed: new THREE.Color(0xb9a274), flat: new THREE.Color(0xb7cf86) };
    const tmp = new THREE.Color();

    // ---- 侧面：一层层的岩层（切面就是横剖面） ----
    const strata = canvasTex(512, 256, (g, w, hh) => {
      const bands = ['#c9a877', '#b8915f', '#d4b98a', '#a07a52', '#c2a06c', '#b08659', '#d0b282'];
      let y = 0, i = 0; while (y < hh) { const t = 18 + ((i * 13) % 20); g.fillStyle = bands[i % bands.length]; g.fillRect(0, y, w, t); y += t; i++; }
      g.strokeStyle = 'rgba(70,50,30,0.25)'; g.lineWidth = 1; for (let k = 0; k < hh; k += 9) { g.beginPath(); g.moveTo(0, k); g.lineTo(w, k + ((k * 7) % 5) - 2); g.stroke(); }
    });
    const sideMat = new THREE.MeshStandardMaterial({ map: strata, roughness: 1, emissive: 0xffffff, emissiveMap: strata, emissiveIntensity: 0.2, side: THREE.DoubleSide });
    const sides = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.BufferGeometry(), sideMat); block.add(m); return m; });
    const outline = new THREE.LineSegments(new THREE.BufferGeometry(), LINE); outline.raycast = () => {}; block.add(outline);
    const side = (m, pts) => {          // pts：沿着边的顶面点 [x, y, z]；从顶面一直到底（y = 0）
      const P = [], U = [], I = [];
      pts.forEach(([x, y, z], k) => { P.push(x, y, z, x, 0, z); const s = k / (pts.length - 1); U.push(s * 3, y / 0.08, s * 3, 0); if (k) { const a = (k - 1) * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
      m.geometry.dispose(); m.geometry = new THREE.BufferGeometry(); m.geometry.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); m.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); m.geometry.setIndex(I); m.geometry.computeVertexNormals();
    };

    const build = () => {
      const t = S.t, x1 = S.cut, st = stage(t);
      for (let i = 0; i <= NX; i++) {
        const x = XL + (x1 - XL) * (i / NX), fy = floorY(x, t), wy = waterY(x, t), zc = centerZ(x, t);
        for (let j = 0; j <= NZ; j++) {
          const z = -ZD + 2 * ZD * (j / NZ), y = heightAt(x, z, t), k = i * (NZ + 1) + j;
          tPos.set([x, y, z], k * 3);
          // 颜色：高地绿、谷壁岩石、谷底（河漫滩）是沙和草，河道里是河床
          const top = y > topY(x) - 0.0035, inCh = Math.abs(z - zc) < WC / 2 && y < fy - 0.0004;
          const n = 0.5 + 0.5 * Math.sin(x * 310 + z * 170) * Math.sin(z * 260 - x * 90);
          if (inCh) tmp.copy(C.bed);
          else if (y < fy + 0.0015 && st.floorHalf > WC) { tmp.copy(C.sand).lerp(C.flat, smooth(0.004, 0.02, Math.abs(z - zc) - WC / 2) * 0.6); if (n > 0.8) tmp.multiplyScalar(0.9); }          // 谷底：靠河是沙（点点砂砾），远一点长了草
          else if (top) tmp.copy(C.grass).lerp(C.grass2, n * 0.6);
          else tmp.copy(C.rock).lerp(C.rock2, n * 0.5);
          tCol.set([tmp.r, tmp.g, tmp.b], k * 3);
          const wet = y < wy && Math.abs(z - zc) < WC / 2 + 0.002 && x > st.head + 0.01;
          wPos.set([x, wet ? wy : y - 0.002, z], k * 3); wCol.set([0.42, 0.68, 0.82, wet ? 0.88 : 0], k * 4);
        }
      }
      topGeo.attributes.position.needsUpdate = true; topGeo.attributes.color.needsUpdate = true; topGeo.computeVertexNormals(); topGeo.computeBoundingSphere(); topGeo.computeBoundingBox();
      waterGeo.attributes.position.needsUpdate = true; waterGeo.attributes.color.needsUpdate = true; waterGeo.computeVertexNormals(); waterGeo.computeBoundingSphere();
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
      knife.position.set(x1 + 0.006, 0, 0);
    };
    const alluvTex = canvasTex(128, 32, (g, w, hh) => { g.fillStyle = '#e2cf93'; g.fillRect(0, 0, w, hh); for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(120,95,55,${0.25 + Math.random() * 0.35})`; g.fillRect(Math.random() * w, Math.random() * hh, 1.5, 1.5); } });
    const alluv = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xe2cf93, side: THREE.DoubleSide })); alluv.raycast = () => {}; block.add(alluv);
    const cutWaterGeo = new THREE.BufferGeometry(), cutWater = new THREE.Mesh(cutWaterGeo, new THREE.MeshBasicMaterial({ color: 0x5aa3cc, transparent: true, opacity: 0.85, side: THREE.DoubleSide })); cutWater.raycast = () => {}; block.add(cutWater);
    const placeCutWater = (x, t) => {
      const zc = centerZ(x, t), wy = waterY(x, t), P = [];
      if (x > stage(t).head + 0.01) for (let j = 0; j < 24; j++) { const z0 = zc - WC / 2 + (WC * j) / 24, z1 = z0 + WC / 24, y0 = heightAt(x, z0, t), y1 = heightAt(x, z1, t); if (y0 < wy && y1 < wy) P.push(x + 0.0004, y0, z0, x + 0.0004, wy, z0, x + 0.0004, wy, z1, x + 0.0004, y0, z0, x + 0.0004, wy, z1, x + 0.0004, y1, z1); }
      cutWaterGeo.dispose(); cutWaterGeo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); cutWater.visible = P.length > 0;
    };

    // ---- 刀：拖它，地块从刀口切开 ----
    const knife = new THREE.Group(); block.add(knife);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.01, 0.05), new THREE.MeshStandardMaterial({ color: 0xb0412a, emissive: 0xb0412a, emissiveIntensity: 0.3 })); handle.position.y = 0.1; knife.add(handle);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.0012, 0.012, 0.05), new THREE.MeshStandardMaterial({ color: 0xd9dde3, emissive: 0x8a9099, emissiveIntensity: 0.3, metalness: 0.5, roughness: 0.3 })); edge.position.y = 0.089; knife.add(edge);          // 刀刃：只露一小截在切口正上方，不挡切面
    const knifePick = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.03, 0.07), new THREE.MeshBasicMaterial({ visible: false })); knifePick.position.y = 0.098; knifePick.userData.pick = true; knife.add(knifePick);          // 只包住红把手，不挡渡口

    // ---- 渡口：一段木栈桥 + 一间小屋。挪到哪儿，就在哪儿的河岸上 ----
    const makeDock = (south) => {
      const g = new THREE.Group(), wood = lit(0x8a6240);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.0015, 0.014), wood); deck.position.set(0, 0.002, south ? -0.004 : 0.004); g.add(deck);
      for (const dz of [-0.011, -0.001]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.0007, 0.0007, 0.008, 6), wood); p.position.set(0, -0.002, (south ? 1 : -1) * dz); g.add(p); }
      const hut = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, 0.008), lit(0xf3ede1)); hut.position.set(0, 0.003, south ? 0.005 : -0.005); g.add(hut);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.0068, 0.004, 4), lit(0x6f7f95)); roof.rotation.y = Math.PI / 4; roof.position.set(0, 0.008, south ? 0.005 : -0.005); g.add(roof);
      const pick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.03), new THREE.MeshBasicMaterial({ visible: false })); pick.userData.pick = true; g.add(pick);
      g.visible = false; block.add(g); return { g, pick, south, x: APEX, z: 0, t0: DOCK_T, g0: 0.003, seen: null, moved: false, tag: tag('', 'pill') };
    };
    const docks = [makeDock(true), makeDock(false)];
    const atBank = (d, x, side, t) => { const zc = centerZ(x, t); d.x = x; d.z = zc + side * (WC / 2 + 0.003); d.t0 = t; d.g0 = gapAt(d.x, d.z, t); d.seen = null; };          // 渡口建在水边（谷底上）
    const homeDock = (d) => { atBank(d, APEX, d.south ? 1 : -1, DOCK_T); d.moved = false; };
    docks.forEach(homeDock);
    const bankName = (d) => { const zc = centerZ(d.x, d.t0), k = 2 * Math.PI / LAM, c = Math.sin(k * (d.x - APEX) - Math.PI / 2), outerNorth = c < 0; const north = d.z < zc; return stage(d.t0).amp < 0.008 ? '岸边' : north === outerNorth ? '凹岸' : '凸岸'; };
    const fateOf = (d) => {          // 按现在的时间算：河道移过了渡口脚下＝岸塌了；水边离开它比建的时候远了很多＝淤成了陆地
      if (S.t <= d.t0 + 0.001) return null;
      const gap = gapAt(d.x, d.z, S.t), sideNow = Math.sign(d.z - centerZ(d.x, S.t)), side0 = Math.sign(d.z - centerZ(d.x, d.t0));
      return gap < 0 || sideNow !== side0 ? 'fell' : gap - d.g0 > 0.012 ? 'far' : null;
    };
    const placeDocks = () => {
      for (const d of docks) {
        const show = S.t >= d.t0 - 0.001 && d.x < S.cut - 0.006 && S.t >= DOCK_T - 0.001;
        d.g.visible = show; d.tag.show(show); if (!show) continue;
        const y = heightAt(d.x, d.z, S.t), name = `${d.south ? '南岸' : '北岸'}渡口`, f = fateOf(d);
        if (f === 'fell' || (f === 'far' && d.seen !== 'fell')) d.seen = f;          // 这一轮看到过的结局（记录里写）
        const fallen = f === 'fell';
        d.g.position.set(d.x, fallen ? Math.max(y, waterY(d.x, S.t)) - 0.004 : y, d.z); d.g.rotation.x = fallen ? (d.south ? -0.6 : 0.6) : 0;
        d.tag.loc(block, d.x, y + (d.south ? 0.016 : 0.03), d.z).text(`<b>${name}</b> · ${bankName(d)}${fallen ? ' · 岸塌了' : f === 'far' ? ' · 离江远了' : ''}`);
      }
    };

    // ---- 标签 ----
    const tStage = tag('', 'pill'), tKnife = tag('拖这把刀往上游切，看横剖面', 'pill'), tScale = tag('教学示意 · 竖直方向夸大了 · 时间大大加快', 'pill');
    const tOuter = tag('凹岸', 'pill'), tInner = tag('凸岸', 'pill'), tPlain = tag('河漫滩（凸岸堆积的泥沙）', 'pill');
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
      tStage.loc(block, x1, 0.095, -ZD + 0.02).text(STAGE[s][1] || '横剖面').show(s > 0);
      tKnife.loc(block, x1 + 0.006, 0.12, 0).show(!S.cutMoved && t > 0.15);
      const xb = APEX - LAM / 2, bend = st.amp > 0.012 && x1 > xb + 0.02, zc = centerZ(xb, t);          // 另一个湾（向南凸）标上凹岸、凸岸；有渡口的那个湾看渡口的牌子
      tOuter.loc(block, xb, waterY(xb, t) + 0.006, zc + WC / 2 + 0.004).show(bend); tInner.loc(block, xb, waterY(xb, t) + 0.006, zc - WC / 2 - 0.014).show(bend);
      tPlain.loc(block, xb + 0.03, floorY(xb, t) + 0.004, centerZ(xb, t) - WC / 2 - 0.03).show(t > 0.75 && x1 > xb + 0.04);
      tScale.loc(block, XL + 0.07, -0.006, ZD + 0.01);
    };

    // ---- 记录：你看到了什么 ----
    const record = () => {
      const s = stageOf(S.t);
      for (let k = 1; k <= s; k++) if (!S.logs.includes(STAGE[k][0])) S.logs.push(STAGE[k][0]);
      if (s !== S.said && W) { S.said = s; W.ui.status(s === 0 ? '这是一片高地，中间刚出现一条小河。拖下面的<b>时间</b>（或按“流下去”），看河谷怎么变。' : s === 2 && S.t >= DOCK_T ? '河道变弯了，两岸建起了渡口（南岸、北岸各一个，也可以挪到别处）。接着往后拖时间，看渡口会怎样。' : STAGE[s][0] + '。'); }
      drawLogs();
    };
    const drawLogs = () => {
      if (!W) return;
      const rows = [h('div', { class: 'tl-row' }, h('b', {}, '河谷：'), h('span', {}, S.logs.length ? S.logs.join(' → ') : '还没开始'))];
      for (const d of docks) if (d.seen) rows.push(h('div', { class: 'tl-row' }, h('b', {}, `${d.south ? '南岸' : '北岸'}渡口（${bankName(d)}）：`), h('span', {}, d.seen === 'fell' ? '河道移过来，脚下的岸被冲塌了' : '水边越退越远，脚下的泥沙淤成了陆地')));
      const sd = docks[0];
      if (sd.seen && !sd.moved && S.guess != null) rows.push(h('div', { class: 'tl-row' }, h('small', {}, `你猜：${ASK[1][S.guess]}　实际：${sd.seen === 'fell' ? '被江水冲掉' : '离江越来越远'}`)));
      W.logs.replaceChildren(...rows);
      W.drop.textContent = `河床的落差（示意）：${drop(S.t) > 0.017 ? '大' : drop(S.t) > 0.009 ? '在变小' : '小'}`;
      if (!S.done && S.t > 0.93 && docks.every((d) => d.seen) && S.cutMoved) { S.done = true; W.ui.unlock(); }
    };

    const setT = (t) => { S.t = Math.min(1, Math.max(0, t)); build(); placeDocks(); placeTags(); record(); if (W) W.time.input.value = Math.round(S.t * 1000); };

    // ---- 拖刀、拖渡口 ----
    const plane = new THREE.Plane(), hit = new THREE.Vector3(), wq = new THREE.Vector3();
    const onFloor = (ray, y) => { block.updateMatrixWorld(); block.localToWorld(wq.set(0, y, 0)); plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), wq); if (!ray.intersectPlane(plane, hit)) return null; return block.worldToLocal(hit.clone()); };
    const pickAt = (rc) => { const hits = rc.intersectObjects([knifePick, ...docks.filter((d) => d.g.visible).map((d) => d.pick)], false); if (!hits.length) return null; return hits[0].object === knifePick ? 'knife' : docks.find((d) => d.pick === hits[0].object); };
    const pointer = {
      down(rc) { const w = pickAt(rc); if (!w) return false; S.drag = w; document.getElementById('c').style.cursor = 'grabbing'; return true; },
      move(rc) {
        const c = document.getElementById('c');
        if (!S.drag) { if (c) c.style.cursor = pickAt(rc) ? 'grab' : ''; return false; }
        if (S.drag === 'knife') { const p = onFloor(rc.ray, 0.06); if (!p) return true; S.cut = Math.min(XR, Math.max(XL + 0.08, p.x)); S.cutMoved = true; build(); placeDocks(); placeTags(); drawLogs(); return true; }
        const d = S.drag, p = onFloor(rc.ray, floorY(d.x, S.t)); if (!p) return true;
        const x = Math.min(S.cut - 0.012, Math.max(stage(S.t).head + 0.03, p.x)), side = Math.sign(p.z - centerZ(x, S.t)) || 1;
        atBank(d, x, side, S.t); d.moved = true;          // 挪到哪儿，就建在那儿的水边，从现在起看
        placeDocks(); drawLogs(); return true;
      },
      up() { if (!S.drag) return false; S.drag = null; document.getElementById('c').style.cursor = ''; return true; },
    };

    setT(0);

    return {
      group,
      card: false,
      size: { w: 0.36, d: 0.22, h: 0.12 },
      view: { elev: 24, azim: 58, lookY: 0.4, frameMargin: 1.05 },          // 从下游的东南方向看：切面（横剖面）正对着镜头
      pointer,
      mount(ui) {
        const time = slider('时间（示意，实际要经过漫长的年代）', { min: 0, max: 1000, value: 0, fmt: () => '', onInput: (v) => { S.play = false; playBtn.textContent = '流下去'; setT(v / 1000); } });
        const acts = buttons([
          { text: '流下去', onClick: () => { S.play = !S.play; if (S.play && S.t >= 1) setT(0); playBtn.textContent = S.play ? '停一下' : '流下去'; } },
          { text: '重来', ghost: true, onClick: () => { S.play = false; playBtn.textContent = '流下去'; S.cut = XR; S.cutMoved = false; S.logs = []; S.guess = null; S.done = false; S.said = -1; docks.forEach(homeDock); guess.set(-1); setT(0); } },
        ]);
        const playBtn = acts.btns[0];
        const guess = seg(...ASK, (_, i) => { S.guess = i; drawLogs(); }, { value: -1 });
        const logs = h('div', { class: 'timeline' }), dropEl = h('p', { class: 'note' });
        ui.controls.append(time.el, acts.el, guess.el, note('刀和两个渡口都可以拖。'));
        ui.data.append(dropEl, h('div', { class: 'bar-title' }, '你看到了什么'), logs);
        W = { ui, logs, time, drop: dropEl, play: playBtn };
        S.said = -1; record();
      },
      update(dt) {
        if (S.play) { setT(S.t + dt / 24); if (S.t >= 1) { S.play = false; if (W) W.play.textContent = '流下去'; } }
      },
    };
  },
};
