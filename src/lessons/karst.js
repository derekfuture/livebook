// 高中地理 必修第一册 第四章第一节 常见地貌类型 · 喀斯特地貌（课本第 66–68 页，图 4.2 地表喀斯特地貌景观演变示意、图 4.4 溶洞、活动“大窝凼”）。
//
// 一个问题：为什么广西、贵州、云南等地的喀斯特地貌特别典型？峰林和溶洞是怎样形成的？
// 课本的图就是模型：图 4.2 那样的一块块岩石，淋着雨。这里并排三块：湿润地区的石灰岩、干旱地区的石灰岩、湿润地区的花岗岩——这里、那里一起比。
// 每块前面切开，看得见地下：石灰岩里慢慢溶出溶洞，洞顶长石钟乳、洞底长石笋，连起来是石柱。
// 学生亲手做的：
//   1. 拖“经过的时间”（或按“让时间走”）：三块同时变。湿润的石灰岩依次出现溶沟、洼地、峰丛、峰林、孤峰、残丘（图 4.2）；干旱的慢得多；花岗岩保持不变。
//   2. 鼠标停在地块上，看那是什么地貌；洼地底平，就是“坝子”，长出了田和村子。
// 数据：kit/karst.js（tools/geo/karst_check.mjs 核对课本说法）。教学示意：时间大大压缩了；三块的发育快慢只是示意的比较。
import * as THREE from 'three';
import { slider, buttons, note, seg } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { h } from '../ui/Panel.js';
import { airLabel, noteBadge } from './kit/labels.js';
import { rockTextures, rockMat, worldUV } from './kit/strata.js';
import { STAGES, stageName, RATE, STEP, cave, terrainHeight, terrainFrom, peakCone, joint, shifting } from './kit/karst.js';

const BW = 0.11, BD = 0.11, GAP = 0.022, H0 = 0.09, N = 128;          // 一块的宽、深；块与块的间隔；原来的地面高度；网格密度
const BLOCKS = [{ key: 'wet', rock: 'limestone', clim: 'wet', name: '湿润地区 · 石灰岩', x: -(BW + GAP) }, { key: 'dry', rock: 'limestone', clim: 'dry', name: '干旱地区 · 石灰岩', x: 0 }, { key: 'gra', rock: 'granite', clim: 'wet', name: '湿润地区 · 花岗岩', x: BW + GAP }];
const ASK = ['先猜一下（可以不猜）：同样淋了很久的雨，哪一块最先长出石头山（峰林）？', ['湿润地区的石灰岩', '干旱地区的石灰岩', '湿润地区的花岗岩']];
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mkRnd = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);

export default {
  id: 'karst',
  fig: '图4.2',
  title: '喀斯特地貌',
  flow: 'explore',
  ask: '为什么广西、贵州、云南等地的喀斯特地貌特别典型？那一座座峰林和地下的溶洞是怎样形成的？',
  need: '让时间走，看三块岩石各变成什么样；比一比湿润和干旱、石灰岩和花岗岩；再看看地下的溶洞',
  conclusion: {
    page: 70,
    quote: '组成地壳的岩石有一部分是可溶性岩石，如石灰岩等。在适当条件下，这类岩石的物质溶于水并被带走，或重新沉淀，从而在地表和地下形成形态各异的地貌，统称为喀斯特地貌。……地表喀斯特地貌主要有溶沟、洼地、峰林等（图4.2）。……溶沟进一步发展，可形成面积较大的洼地。……洼地边缘残留的岩体，常常呈锥状耸立，构成峰丛、峰林。峰林可演变为孤峰（图4.3），以至残丘。……地下喀斯特地貌以溶洞（图4.4）为主。……溶洞顶部常见向下发育的石钟乳、石幔或石帘；底部常见向上发育的石笋。石钟乳和石笋连接起来形成石柱。',
    why: '石灰岩是可溶性岩石。雨水吸收空气及土壤中的 CO₂，形成弱酸性水，沿裂隙入渗，一边走一边把岩石溶掉、带走：地表先溶出一道道溶沟，溶沟连成洼地，洼地之间剩下的岩体就成了峰丛、峰林，再溶下去只剩孤峰、残丘。地下的水把岩石溶出溶洞；洞顶滴下的水里，二氧化碳跑出去，溶在水里的物质又沉淀下来，洞顶长出石钟乳、洞底长出石笋。在岩性、裂隙等条件相近时，水分越充足通常越有利于溶蚀（水温、水里溶进的二氧化碳等也有影响），我国广西、贵州、云南等地石灰岩分布广、气候湿热，喀斯特地貌最为典型；干旱地区发育得慢得多；花岗岩不是可溶性岩石，不会形成这样的喀斯特地貌（它的风化、侵蚀是另一回事，本活页没有模拟）。这里展示的是一种典型演变示意，不是每个地方都要依次经过这六步。',
    src: '课本第 66–68 页 · 第四章 第一节 常见地貌类型',
  },

  create({ tag, look }) {
    const group = new THREE.Group(), block = new THREE.Group(); group.add(block);
    const S = { time: 0, play: false, seen: {}, moved: false, guess: null, near: null };          // near：正凑近看哪一块的溶洞
    let W = null;
    const tOf = (b) => Math.min(1, S.time * STEP * RATE[b.rock][b.clim]);

    // ---- 每块的山峰：在格点附近随机放一些锥形的峰（溶下去以后剩下的就是它们） ----
    const peaksOf = (seed) => { const R = mkRnd(seed), P = []; for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) P.push({ x: -BW / 2 + BW * (i + 0.5 + (R() - 0.5) * 0.3) / 3, z: -BD / 2 + BD * (j + 0.5 + (R() - 0.5) * 0.3) / 3, r: R(), k: 0.75 + R() * 0.5 }); return P; };
    const height = (b, P, x, z) => terrainHeight(b, P, x, z, tOf(b), H0) + nz(x, z);

    // ---- 三块岩石：每块都是实心的一块地，前面切开；上面按岩性、气候长东西 ----
    const grain = canvasTex(256, 256, (g, w) => { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, w); for (let i = 0; i < 2400; i++) { const v = 150 + Math.random() * 100; g.fillStyle = `rgba(${v},${v},${v},${0.2 + Math.random() * 0.35})`; g.fillRect(Math.random() * w, Math.random() * w, 1.6, 1.6); } }, { repeat: [2, 2] });
    const C = (hx) => new THREE.Color(hx), tc = new THREE.Color(), t2 = new THREE.Color();
    const ROCKC = C(0xbab7ad), ROCKD = C(0x8f8c84), VEG = C(0x4b8a3c), VEG2 = C(0x6f9e48), FIELD1 = C(0x9cc25a), FIELD2 = C(0xc9c76a), WATERF = C(0x7fb0c8), TAN = C(0xcdb88e), OLIVE = C(0x9a9a62), GRASS = C(0x7fa452), FOREST = C(0x3f7a38);
    const nz = (x, z) => 0.0012 * Math.sin(x * 230 + z * 90) * Math.sin(z * 210 - x * 70) + 0.0005 * Math.sin(x * 610 + 1) * Math.sin(z * 530);          // 地面的小起伏（不随时间变，不影响溶蚀模型）
    const mergeV = (parts) => { const P = [], Cc = []; for (const [geo, col] of parts) { const A = geo.toNonIndexed().attributes.position.array; P.push(...A); for (let i = 0; i < A.length; i += 3) Cc.push(col.r, col.g, col.b); } const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g2.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3)); g2.computeVertexNormals(); return g2; };
    const treeGeo = mergeV([[new THREE.SphereGeometry(0.0021, 7, 5).scale(1, 1.15, 1).translate(0, 0.0036, 0), C(0xffffff)], [new THREE.CylinderGeometry(0.0003, 0.0004, 0.0018, 5).translate(0, 0.0009, 0), C(0x6a4a30)]]);          // 树冠白（按实例上色）、树干棕
    const shrubGeo = new THREE.SphereGeometry(0.0013, 6, 4).scale(1.3, 0.75, 1.3).translate(0, 0.0007, 0);
    const houseGeo = mergeV([[new THREE.BoxGeometry(0.0034, 0.0024, 0.0046).translate(0, 0.0012, 0), C(0xf2ece0)], [new THREE.ConeGeometry(0.0034, 0.0018, 4).rotateY(Math.PI / 4).scale(0.75, 1, 1.05).translate(0, 0.0033, 0), C(0x55504a)]]);          // 白墙、黑瓦
    const TILE = 0.045, rockPat = (g, kind, w) => { const p2 = g.createPattern(rockTextures(kind).map.image, 'repeat'); p2.setTransform(new DOMMatrix().scale(((w / BW) * TILE) / 512)); return p2; };          // 画布横着是一块地的宽（BW）
    const rockFace = (rock, withCave) => (g, w, hh) => {          // 岩石的切面：石灰岩一层层、竖着的节理；花岗岩是斑点和弧形的节理
      const R = mkRnd(rock === 'granite' ? 21 : 13);
      if (rock === 'granite') {
        g.fillStyle = rockPat(g, 'granite', w); g.fillRect(0, 0, w, hh);          // 花岗岩：kit/strata.js 的晶粒（白长石、肉红长石、石英、黑云母）
        g.strokeStyle = 'rgba(70,50,45,0.35)'; g.lineWidth = 1.6; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(w * (0.2 + 0.3 * k), hh * 0.1, w * 0.5, hh * (0.18 + k * 0.05), 0, 0.15, Math.PI - 0.15); g.stroke(); }
      } else {
        g.fillStyle = rockPat(g, 'limestone', w); g.fillRect(0, 0, w, hh);          // 石灰岩：kit/strata.js 的层面、节理、斑块（一块块的，像真的石灰岩）
        const bg = g.createLinearGradient(0, 0, 0, hh); bg.addColorStop(0, 'rgba(255,255,250,0.08)'); bg.addColorStop(1, 'rgba(40,38,34,0.26)'); g.fillStyle = bg; g.fillRect(0, 0, w, hh);          // 越往下越暗
        for (let i = 0; i < 26; i++) { const x0 = R() * w, wd = 6 + R() * 22, gr = g.createLinearGradient(x0 - wd, 0, x0 + wd, 0); gr.addColorStop(0, 'rgba(70,68,62,0)'); gr.addColorStop(0.5, `rgba(70,68,62,${0.06 + R() * 0.1})`); gr.addColorStop(1, 'rgba(70,68,62,0)'); g.fillStyle = gr; g.fillRect(x0 - wd, 0, wd * 2, hh * (0.3 + R() * 0.7)); }          // 雨水顺着岩壁流下的深色水痕
        for (let i = 0; i < w * hh / 50; i++) { g.fillStyle = `rgba(90,88,80,${R() * 0.13})`; g.fillRect(R() * w, R() * hh, 2, 2); }
        g.strokeStyle = 'rgba(60,58,54,0.45)'; for (let i = 0; i < 7; i++) { const x0 = R() * w, y0 = R() * hh * 0.5, len = hh * (0.25 + R() * 0.6); g.lineWidth = 1 + R() * 1.5; g.beginPath(); g.moveTo(x0, y0); for (let yy = 0; yy <= len; yy += 14) g.lineTo(x0 + Math.sin(yy / 30 + i) * 4 + (R() - 0.5) * 3, y0 + yy); g.stroke(); }          // 节理（裂隙）：长短不一、不贯通
      }
      void withCave;
    };
    // ---- 3D 溶洞：从切面的洞口往里是一个穹顶（洞壁不规则，洞底平），一侧是地下河；洞顶往下长石钟乳，洞底往上长石笋，连起来是石柱 ----
    const caveRim = (a3) => (1 + 0.12 * Math.sin(-3 * a3 + 1) + 0.08 * Math.sin(-5 * a3 + 2) + 0.05 * Math.sin(-9 * a3)) * (Math.sin(a3) < 0 ? 0.8 : 1);          // 洞口（和穹顶前缘）在各个方向上的半径：原来画的那条轮廓；洞底那一半扁一些
    const flatFloor = (y) => (y < -0.5 ? -0.5 + (y + 0.5) * 0.12 : y);          // 洞底基本是平的
    const rimPt = (a3) => { const r = caveRim(a3); return [Math.cos(a3) * r, flatFloor(Math.sin(a3) * r)]; };          // 洞口轮廓上的一点（洞的单位坐标，y 朝上）
    const domeGeo = (() => {
      const geo = new THREE.SphereGeometry(1, 72, 36, Math.PI, Math.PI, 0, Math.PI), pos = geo.attributes.position, col = new Float32Array(pos.count * 3), R = mkRnd(41);
      const bump = Array.from({ length: 9 }, () => [R() * 6.28, R() * 6.28, 2 + R() * 5]);
      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);          // 后半个球：z ≤ 0（朝岩块里面）
        const a3 = Math.atan2(y, x), rim = caveRim(a3), dz = -z;
        const mask = Math.min(1, dz * 4); let f = 1; for (const [p1, p2, fr] of bump) f += 0.035 * Math.sin(a3 * fr + p1) * Math.sin(dz * fr * 2 + p2) * mask;          // 洞壁凹凸（洞口那一圈不动：和切面上挖的洞口对得上）
        f += mask * (0.028 * Math.sin(a3 * 17 + dz * 3) + 0.018 * Math.sin(a3 * 31 - dz * 7) + 0.02 * Math.sin(dz * 23 + a3 * 5));          // 洞壁上一道道竖的“石帘”褶皱和小的凹凸
        x *= rim * f; y *= rim * f; z *= f * (0.9 + 0.1 * Math.cos(a3 * 2));
        y = flatFloor(y);
        pos.setXYZ(i, x, y, z);
        const k2 = (0.38 + 0.47 * Math.max(0, 1 - dz * 1.2)) * (y < -0.45 ? 0.62 : 1) * (0.86 + 0.28 * (0.5 + 0.5 * Math.sin(a3 * 9 + dz * 11)));          // 深浅不一（湿的地方暗）          // 越往里越暗；洞口附近亮一点（外面的光照进来）；洞底湿、暗一些
        col.set([k2, k2 * 0.94, k2 * 0.86], i * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals(); worldUV(geo, 0.6);
      return geo;
    })();
    const domeMat = rockMat('flowstone', { side: THREE.BackSide, tint: 0x8a7d6c }); domeMat.vertexColors = true; domeMat.emissiveIntensity = 0.1; domeMat.normalScale.set(1.6, 1.6);          // 洞壁是流石的样子（竖的流痕），不是外面的层面、节理；洞里不放灯（一盏点光会让整个场景每个像素都多算一次），洞壁自己亮一点
    // 钟乳石的形状：一节节往下收细、带几道“滴水环”（绕 y 轴转出来的旋转体；底在 y = 0，尖在 y = −1）
    const dripGeo = (() => { const pts = []; for (let i = 0; i <= 14; i++) { const v = i / 14, r = Math.max(0.02, (1 - v) ** 1.25 * (1 + 0.12 * Math.sin(v * 22))); pts.push(new THREE.Vector2(r, -v)); } return new THREE.LatheGeometry(pts, 10); })();
    const columnGeo = (() => { const pts = []; for (let i = 0; i <= 18; i++) { const v = i / 18, r = 0.42 + 0.58 * Math.abs(v * 2 - 1) ** 1.6 + 0.07 * Math.sin(v * 30); pts.push(new THREE.Vector2(r, -v)); } return new THREE.LatheGeometry(pts, 12); })();          // 石柱：中间细、两头粗（上半是石钟乳、下半是石笋）
    const dripMat = new THREE.MeshStandardMaterial({ color: 0xf3e9d4, roughness: 0.42, metalness: 0, emissive: 0x6a4c26, emissiveIntensity: 0.42 });          // 碳酸钙：米白、湿润有光泽；洞里暖光
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x4fb3c8, roughness: 0.08, metalness: 0.2, emissive: 0x0f4a5c, emissiveIntensity: 0.7, transparent: true, opacity: 0.9 });          // 地下河：清，偏青绿
    const ROOF = (x, z) => { const pos = domeGeo.attributes.position; let best = -1; for (let i = 0; i < pos.count; i++) { if (Math.abs(pos.getX(i) - x) < 0.05 && Math.abs(pos.getZ(i) - z) < 0.05) best = Math.max(best, pos.getY(i)); } return best; };          // 穹顶在 (x, z) 正上方的高度（洞的单位坐标）：钟乳石正好长在洞顶上
    const SPOTS = (() => { const R = mkRnd(77), L = []; for (let i = 0; i < 90 && L.length < 34; i++) { const x = -0.82 + R() * 1.64, z = -(0.12 + R() * 0.7); if (x * x + z * z > 0.8) continue; L.push({ x, z, len: 0.35 + R() * 0.65, w: 0.7 + R() * 0.6, up: R() < 0.55, col: false, roof: 0 }); } for (const sp of L) sp.roof = ROOF(sp.x, sp.z); [3, 8, 13, 21].forEach((i) => { if (L[i]) L[i].col = true; }); return L; })();          // 洞里哪些地方长：一部分石钟乳下面对着长石笋，三处连成石柱
    function makeCave(g) {
      const grp = new THREE.Group(); grp.visible = false; g.add(grp);
      const dome = new THREE.Mesh(domeGeo, domeMat); dome.raycast = () => {}; grp.add(dome);
      const lake = new THREE.Mesh(new THREE.CircleGeometry(1, 40), waterMat); lake.rotation.x = -Math.PI / 2; lake.raycast = () => {}; grp.add(lake);
      const drips = new THREE.InstancedMesh(dripGeo, dripMat, SPOTS.length * 2), cols = new THREE.InstancedMesh(columnGeo, dripMat, SPOTS.length);
      drips.raycast = cols.raycast = () => {}; drips.castShadow = false; g.add(drips, cols);
      const pick = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.004), new THREE.MeshBasicMaterial({ visible: false })); g.add(pick);          // 洞口：点它钻进去看
      const names = { stal: tag('石钟乳', 'pill'), mite: tag('石笋', 'pill'), col: tag('石柱', 'pill'), river: tag('地下河', 'pill') };
      for (const t of Object.values(names)) t.show(false);
      return { grp, dome, lake, drips, cols, pick, names, at: {} };
    }
    const m4c = new THREE.Matrix4(), qc = new THREE.Quaternion(), vc = new THREE.Vector3(), sc = new THREE.Vector3(), FLIP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
    function growCave(u) {
      const C3 = u.cave3, at = u.caveAt, c = at?.c;
      const on = !!c && c.size > 0.02; C3.grp.visible = on; C3.drips.visible = C3.cols.visible = on; C3.pick.visible = false; C3.ok = on && c.size > 0.3; if (!on) return;
      const rx = at.rx, ry = at.ry, rz = Math.min(BD * 0.42, rx * 0.85);          // 洞往岩块里伸多深
      C3.grp.position.set(at.x, at.y, BD / 2); C3.grp.scale.set(rx, ry, rz);
      C3.lake.position.set(0.32, -0.49, -0.42); C3.lake.scale.set(0.42, 0.3, 1);          // 地下河：洞底靠右那一侧（洞的单位坐标）
      C3.pick.position.set(at.x, at.y, BD / 2 + 0.002); C3.pick.scale.set(rx * 2, ry * 2, 1);
      C3.at = { river: new THREE.Vector3(at.x + 0.5 * rx, at.y - 0.49 * ry, BD / 2 - 0.2 * rz) };          // 地下河的字：写在水面靠前那一边
      const floorY = -ry * 0.5;
      let nd = 0, nc = 0;
      for (const sp of SPOTS) {
        const X = at.x + sp.x * rx, Z = BD / 2 + sp.z * rz, top = at.y + sp.roof * ry, bot = at.y + floorY, gap = top - bot; if (sp.roof < -0.2 || gap < 0.002) continue;
        if (sp.col && c.column) { m4c.compose(vc.set(X, top + 0.0006, Z), qc.identity(), sc.set(0.0016 * sp.w, gap + 0.0012, 0.0016 * sp.w)); C3.cols.setMatrixAt(nc++, m4c); if (!C3.at.col) C3.at.col = new THREE.Vector3(X, bot + gap * 0.5, Z); continue; }
        const l1 = gap * (sp.col ? 0.48 : 0.62 * sp.len) * c.drip; if (l1 > 0.0004) { m4c.compose(vc.set(X, top + 0.0006, Z), qc.identity(), sc.set(Math.max(0.0005, l1 * 0.16 * sp.w), l1 + 0.0006, Math.max(0.0005, l1 * 0.16 * sp.w))); C3.drips.setMatrixAt(nd++, m4c); if (l1 > gap * 0.22 && sp.x > -0.35 && sp.x < 0.25 && (!C3.at.stal || l1 > C3.at.stalL)) { C3.at.stal = new THREE.Vector3(X, top - l1, Z); C3.at.stalL = l1; } }          // “石钟乳”写在中间一根长的下面          // 石钟乳：从洞顶往下
        if ((sp.up || sp.col) && sp.x < 0.1) { const l2 = gap * (sp.col ? 0.46 : 0.3 * sp.len) * c.drip; if (l2 > 0.0004) { m4c.compose(vc.set(X, bot - 0.0004, Z), FLIP, sc.set(Math.max(0.0006, l2 * 0.26 * sp.w), l2 + 0.0004, Math.max(0.0006, l2 * 0.26 * sp.w))); C3.drips.setMatrixAt(nd++, m4c); if (l2 > gap * 0.1 && sp.x < -0.4 && (!C3.at.mite || sp.x < C3.at.miteX)) { C3.at.mite = new THREE.Vector3(X, bot + l2, Z); C3.at.miteX = sp.x; } } }          // “石笋”写在靠左的一根上，和“石钟乳”分开          // 石笋：从洞底往上，矮胖（地下河那边不长）
      }
      C3.drips.count = nd; C3.cols.count = nc; placeNames(u); C3.drips.instanceMatrix.needsUpdate = true; C3.cols.instanceMatrix.needsUpdate = true;
    }
    function placeNames(u) {          // 洞里的标签：只在凑近看这一块的溶洞时显示；钟乳石、石笋、石柱长出来了才写
      const C3 = u.cave3, near = S.near === u && C3.grp.visible, A = C3.at;
      for (const [k, t] of Object.entries(C3.names)) { const v = A[k]; t.show(!!(near && v)); if (v) t.loc(u.g, v.x, v.y + (k === 'stal' ? -0.003 : k === 'river' ? 0.0012 : 0.0035), v.z); }
    }
    const faceBase = new Map();          // 切面的岩石底图（不随时间变）：每种岩石画一次，存着
    const baseOf = (rock, w, hh) => { if (!faceBase.has(rock)) { const c = document.createElement('canvas'); c.width = w; c.height = hh; rockFace(rock, true)(c.getContext('2d'), w, hh); faceBase.set(rock, c); } return faceBase.get(rock); };
    // 从刚算好的地形网格里读高度（双线性）：比按公式算快得多；网格的第 iz 行在 z = −BD/2 + iz·BD/N
    const gridH = (u, x, z) => {
      const a = u.geo.attributes.position.array, fx = Math.min(N, Math.max(0, ((x + BW / 2) / BW) * N)), fz = Math.min(N, Math.max(0, ((z + BD / 2) / BD) * N));
      const ix = Math.min(N - 1, Math.floor(fx)), iz = Math.min(N - 1, Math.floor(fz)), tx = fx - ix, tz = fz - iz, k = iz * (N + 1) + ix, W1 = N + 1;
      return (a[k * 3 + 1] * (1 - tx) + a[(k + 1) * 3 + 1] * tx) * (1 - tz) + (a[(k + W1) * 3 + 1] * (1 - tx) + a[(k + W1 + 1) * 3 + 1] * tx) * tz;
    };
    const units = BLOCKS.map((b, bi) => {
      const g = new THREE.Group(); g.position.x = b.x; block.add(g);
      const P = peaksOf(17 + bi * 31);
      const geo = new THREE.PlaneGeometry(BW, BD, N, N); geo.rotateX(-Math.PI / 2);
      const col = new Float32Array(geo.attributes.position.count * 3); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const topM = new THREE.MeshLambertMaterial({ vertexColors: true, map: grain });
      if (b.rock === 'limestone') {          // 陡壁上按世界坐标三个方向投影石灰岩的纹理（层面、节理）：峰林的石壁像真的石头，不是光溜溜的锥
        const lime = rockTextures('limestone').map;
        topM.onBeforeCompile = (sh) => {
          sh.uniforms.uLime = { value: lime }; sh.uniforms.uTile = { value: 1 / TILE };
          sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);');
          sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uLime; uniform float uTile; varying vec3 vWP; varying vec3 vWN;').replace('#include <color_fragment>', `#include <color_fragment>
            { vec3 n = normalize(vWN), w = pow(abs(n), vec3(4.0)); w /= (w.x + w.y + w.z);
              vec3 tri = texture2D(uLime, vWP.zy * uTile * 3.0).rgb * w.x + texture2D(uLime, vWP.xz * uTile * 3.0).rgb * w.y + texture2D(uLime, vWP.xy * uTile * 3.0).rgb * w.z;
              float steep = 1.0 - smoothstep(0.45, 0.85, n.y);
              diffuseColor.rgb *= mix(vec3(1.0), tri / vec3(0.46, 0.45, 0.42), steep * 0.85); }`);
        };
      }
      const top = new THREE.Mesh(geo, topM); g.add(top);
      const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 840; const ftex = new THREE.CanvasTexture(cv); ftex.colorSpace = THREE.SRGBColorSpace; ftex.anisotropy = 8;
      const bump = () => { const n = rockTextures(b.rock === 'granite' ? 'granite' : 'limestone').normalMap.clone(); n.repeat.set(BW / TILE, 0.1 / TILE); n.needsUpdate = true; return n; };          // 岩壁的凹凸（法线贴图，拷一份再设重复次数）
      const front = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ map: ftex, normalMap: bump(), normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.92, metalness: 0, emissive: 0xffffff, emissiveMap: ftex, emissiveIntensity: 0.1, side: THREE.DoubleSide, alphaTest: 0.5 })); g.add(front);          // alphaTest：洞口挖空的地方透过去
      const sideTex = canvasTex(512, 420, rockFace(b.rock, false)), sides = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ map: sideTex, normalMap: bump(), normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.92, metalness: 0, emissive: 0xffffff, emissiveMap: sideTex, emissiveIntensity: 0.1, side: THREE.DoubleSide })); g.add(sides);
      const houses = new THREE.InstancedMesh(houseGeo, new THREE.MeshLambertMaterial({ vertexColors: true }), 18); houses.raycast = () => {}; g.add(houses);
      const trees = new THREE.InstancedMesh(treeGeo, new THREE.MeshLambertMaterial({ vertexColors: true }), 520); trees.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(520 * 3), 3); trees.raycast = () => {}; g.add(trees);
      const shrubs = new THREE.InstancedMesh(shrubGeo, new THREE.MeshLambertMaterial({ color: 0x8a8a58 }), 120); shrubs.raycast = () => {}; g.add(shrubs);
      // 雨：湿润的地方雨密，干旱的地方稀
      const rp = new Float32Array(80 * 6), rain = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(rp, 3)), new THREE.LineBasicMaterial({ color: 0x7898c0, transparent: true, opacity: 0.55 })); rain.raycast = () => {}; g.add(rain);
      const R = mkRnd(5 + bi), drops = Array.from({ length: b.clim === 'wet' ? 80 : 10 }, () => ({ x: (R() - 0.5) * BW * 0.9, z: (R() - 0.5) * BD * 0.9, t: R() }));
      const cloudTex = canvasTex(128, 128, (c2, w) => { const gr = c2.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c2.fillStyle = gr; c2.fillRect(0, 0, w, w); });
      for (let k = 0; k < (b.clim === 'wet' ? 9 : 3); k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, color: b.clim === 'wet' ? 0xb8c0cc : 0xe8e6e0, transparent: true, depthWrite: false })); s.position.set((R() - 0.5) * BW * 0.8, 0.135 + R() * 0.008, (R() - 0.5) * BD * 0.6); const r = 0.03 + R() * 0.012; s.scale.set(r * 1.4, r * 0.7, 1); s.raycast = () => {}; g.add(s); }
      const label = airLabel(g, b.name, { x: 0, y: 0.16, z: 0, h: 0.0078, color: '#2c3245' }), stageL = airLabel(g, '', { x: 0, y: 0.149, z: 0, h: 0.0085, color: '#a8341f' });
      const cave3 = b.rock === 'limestone' ? makeCave(g) : null;
      return { b, g, P, geo, col, top, cv, ftex, front, sides, houses, trees, shrubs, rain, rp, drops, label, stageL, cave3 };
    });
    const rebuild = (u) => {
      const { b, P, geo, col } = u, t = tOf(b), p = geo.attributes.position;
      if (u.builtT != null && Math.abs(t - u.builtT) < (b.clim === 'dry' ? 0.004 : 1e-7) && u.builtNear === S.near) return;          // 花岗岩不变、干旱那块变得极慢：没变（或变得太少）就不重算
      u.builtT = t; u.builtNear = S.near;
      if (!u.cache && b.rock !== 'granite') {          // 每个点到每座峰的锥度、节理、小起伏只和位置有关：第一次算好存着
        const n = p.count, cones = new Float32Array(n * P.length), jv = new Float32Array(n), nzv = new Float32Array(n);
        for (let k = 0; k < n; k++) { const x = p.getX(k), z = p.getZ(k); for (let i = 0; i < P.length; i++) cones[k * P.length + i] = peakCone(P[i], x, z); jv[k] = joint(x, z); nzv[k] = nz(x, z); }
        u.cache = { cones, jv, nzv };
      }
      if (u.cache) { const { cones, jv, nzv } = u.cache, m = P.length; for (let k = 0; k < p.count; k++) p.setY(k, terrainFrom(b, P, cones.subarray(k * m, k * m + m), jv[k], t, H0) + nzv[k]); }
      else for (let k = 0; k < p.count; k++) { const x = p.getX(k), z = p.getZ(k); p.setY(k, height(b, P, x, z)); }
      p.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
      const nrm = geo.attributes.normal, base = H0 - 0.05 * sm(0.14, 0.62, t) - 0.008 * sm(0.75, 1, t);          // 溶低的地面（和溶蚀模型里的一样）
      for (let k = 0; k < p.count; k++) {
        const x = p.getX(k), z = p.getZ(k), hgt = p.getY(k), ny = nrm.getY(k), steep = 1 - sm(0.5, 0.82, ny), n1 = 0.5 + 0.5 * Math.sin(x * 470 + z * 230) * Math.sin(z * 390 - x * 170);
        if (b.rock === 'granite') tc.copy(FOREST).lerp(GRASS, n1 * 0.6);          // 花岗岩地块：森林和草地
        else if (b.clim === 'wet') {
          const flat = hgt < base + 0.006 && t > 0.3 && ny > 0.9;          // 洼地的平底：坝子里是一块块田
          if (flat && t > 0.45) { const cell = Math.floor((x + 1) / 0.0055) * 7 + Math.floor((z + 1) / 0.0045) * 13; tc.copy([FIELD1, FIELD2, VEG2, WATERF][cell % 4 === 3 && cell % 7 === 1 ? 3 : cell % 3]).multiplyScalar(0.94 + 0.06 * n1); }
          else { tc.copy(VEG).lerp(VEG2, n1 * 0.5); t2.copy(ROCKC).lerp(ROCKD, 0.5 + 0.5 * Math.sin(hgt * 2400 + x * 300)); tc.lerp(t2, Math.min(1, steep * 1.15 + (n1 > 0.86 ? 0.5 : 0))); }          // 峰顶、缓坡长满树；陡壁露出灰白的石灰岩
        } else { tc.copy(TAN).lerp(OLIVE, n1 * 0.45); t2.copy(ROCKC).lerp(ROCKD, 0.4); tc.lerp(t2, Math.min(1, steep + (n1 > 0.8 ? 0.4 : 0))); }          // 干旱：土黄、稀疏的草，露出岩石
        col.set([tc.r, tc.g, tc.b], k * 3);
      }
      geo.attributes.color.needsUpdate = true;
      // 前面的切面、两侧和后面：都是贴着地形的岩壁
      const strip = (pts, flip) => { const P2 = [], U = [], I = []; let s = 0; pts.forEach(([x, z], i) => { if (i) s += Math.hypot(x - pts[i - 1][0], z - pts[i - 1][1]); const y = gridH(u, x, z); P2.push(x, y, z, x, 0, z); U.push(s / BW, y / 0.1, s / BW, 0); if (i) { const a = 2 * i - 2; flip ? I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) : I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }); const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(P2, 3)); g2.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g2.setIndex(I); g2.computeVertexNormals(); return g2; };
      const line = (f) => Array.from({ length: N + 1 }, (_, i) => f(i / N));
      u.front.geometry.dispose(); u.front.geometry = strip(line((v) => [-BW / 2 + BW * v, BD / 2]));
      const parts = [strip(line((v) => [-BW / 2, BD / 2 - BD * v])), strip(line((v) => [-BW / 2 + BW * v, -BD / 2])), strip(line((v) => [BW / 2, -BD / 2 + BD * v]))];          // 左、后、右：一圈连起来
      const merged = new THREE.BufferGeometry(), PP = [], UU = [], II = []; let off = 0; for (const q of parts) { PP.push(...q.attributes.position.array); UU.push(...q.attributes.uv.array); II.push(...Array.from(q.index.array, (i) => i + off)); off += q.attributes.position.count; q.dispose(); }
      merged.setAttribute('position', new THREE.Float32BufferAttribute(PP, 3)); merged.setAttribute('uv', new THREE.Float32BufferAttribute(UU, 2)); merged.setIndex(II); merged.computeVertexNormals();
      u.sides.geometry.dispose(); u.sides.geometry = merged;
      paintFace(u, t); if (u.cave3) growCave(u);
      // 坝子里的村子；树（湿润地区）和灌丛（干旱地区）
      const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0), tcol = new THREE.Color(), R = mkRnd(3); let nh = 0, nt = 0, ns = 0;
      const hAt = (x, z) => gridH(u, x, z), slopeAt = (x, z) => { const e = 0.0012; return Math.hypot(hAt(x + e, z) - hAt(x - e, z), hAt(x, z + e) - hAt(x, z - e)) / (2 * e); };
      if (b.rock === 'limestone' && b.clim === 'wet' && t > 0.5) { let vc = null; for (let k = 0; k < 900 && nh < 18; k++) { const x = vc ? vc[0] + (R() - 0.5) * 0.026 : (R() - 0.5) * BW * 0.8, z = vc ? vc[1] + (R() - 0.5) * 0.02 : (R() - 0.5) * BD * 0.8; if (Math.abs(x) > BW * 0.46 || Math.abs(z) > BD * 0.46) continue; const hg = hAt(x, z); if (hg < base + 0.004 && slopeAt(x, z) < 0.6) { vc ||= [x, z]; q4.setFromAxisAngle(Y, (R() < 0.5 ? 0 : Math.PI / 2)); m4.compose(pv.set(x, hg, z), q4, sv.setScalar(1.3)); u.houses.setMatrixAt(nh++, m4); } } }          // 坝子里聚成一个村子
      if (b.clim === 'wet') for (let k = 0; k < 4000 && nt < 520; k++) {
        const x = (R() - 0.5) * BW * 0.95, z = (R() - 0.5) * BD * 0.95, hg = hAt(x, z), sl = slopeAt(x, z);
        const ok = b.rock === 'granite' ? R() < 0.55 : sl < 1.4 && !(t > 0.45 && hg < base + 0.008 && R() > 0.015) && R() < 0.7;          // 石灰岩：峰上、缓坡上长树；陡壁不长；坝子里是田，只有零星几棵
        if (!ok) continue; const s = 0.75 + R() * 0.5; q4.setFromAxisAngle(Y, R() * 6.28); m4.compose(pv.set(x, hg - 0.0003, z), q4, sv.setScalar(s)); u.trees.setMatrixAt(nt, m4); u.trees.setColorAt(nt, tcol.setHex(b.rock === 'granite' ? 0x3d7a36 : 0x3f8240).multiplyScalar(0.8 + R() * 0.35)); nt++;
      }
      if (b.clim === 'dry') for (let k = 0; k < 800 && ns < 120; k++) { const x = (R() - 0.5) * BW * 0.95, z = (R() - 0.5) * BD * 0.95, hg = hAt(x, z); if (slopeAt(x, z) < 0.8 && R() < 0.4) { m4.compose(pv.set(x, hg - 0.0002, z), q4.identity(), sv.setScalar(0.7 + R() * 0.6)); u.shrubs.setMatrixAt(ns++, m4); } }          // 干旱：零星的灌丛
      u.houses.count = nh; u.trees.count = nt; u.shrubs.count = ns; u.houses.instanceMatrix.needsUpdate = true; u.trees.instanceMatrix.needsUpdate = true; if (u.trees.instanceColor) u.trees.instanceColor.needsUpdate = true; u.shrubs.instanceMatrix.needsUpdate = true;
      const sn = b.rock === 'granite' ? null : stageName(t); u.stageL.setText(sn === '峰丛' && shifting(t) ? '峰丛 → 峰林（过渡中）' : sn ?? (b.rock === 'granite' ? '不出现喀斯特形态' : t > 0 ? '刚开始溶蚀' : '')).setOn(S.time > 0);
      if (sn) { (S.seen[b.key] ||= new Set()).add(sn); }
    };
    // 切面：一层层石灰岩（或花岗岩）、裂隙、地下的溶洞和钟乳石
    function paintFace(u, t) {
      if (u.b.rock === 'granite' && u.facePainted) return; u.facePainted = true;          // 花岗岩纹理只绘制一次，避免随时间重新随机生成
      const { cv, ftex, b, P } = u, g = cv.getContext('2d'), w = cv.width, hh = cv.height, X = (x) => ((x + BW / 2) / BW) * w, Y = (y) => hh - (y / 0.1) * hh;
      g.clearRect(0, 0, w, hh); g.drawImage(baseOf(b.rock, w, hh), 0, 0);
      if (b.rock === 'limestone') {
        // 地表的溶沟：顺着裂隙往下溶宽的 V 形缝
        const tops = []; for (let i = 0; i <= w; i += 2) tops.push(Y(gridH(u, -BW / 2 + (i / w) * BW, BD / 2)));
        if (t > 0.01) { g.fillStyle = 'rgba(60,58,54,0.55)'; let prev = 0; for (let i = 1; i < w; i += 2) { const x = -BW / 2 + (i / w) * BW, jv = joint(x, BD / 2); if (jv > 0.6 && prev <= 0.6) { const d = (30 + 90 * sm(0, 0.3, t)) * (0.6 + 0.4 * jv), hw = 2 + 6 * sm(0, 0.2, t), yt = tops[(i - 1) / 2] ?? 0; g.beginPath(); g.moveTo(i - hw, yt); g.lineTo(i + hw, yt); g.lineTo(i + 1, yt + d); g.fill(); } prev = jv; } }          // 溶沟：就在顶面那两组节理和切面相交的地方，沿裂隙往下溶宽
        if (b.clim === 'wet') { g.fillStyle = 'rgba(150,80,50,0.55)'; for (let i = 0; i <= w; i += 2) { const sl = Math.abs((tops[i / 2 + 1] ?? tops[i / 2]) - tops[i / 2]) / 2; if (sl < 0.9) g.fillRect(i, tops[i / 2], 2, sl < 0.25 ? 9 : 4); } }          // 风化土：平缓处和洼地厚一些，陡壁上断开（土壤覆盖只是示意）
        const c = cave(t), cx = w * 0.52, cy = Y(0.0165), rx = 40 + 300 * c.size, ry = 18 + 96 * c.size; u.caveAt = { x: -BW / 2 + 0.52 * BW, y: 0.0165, rx: (rx / w) * BW, ry: (ry / hh) * 0.1, c };          // 溶洞画大一些（示意），洞里的石钟乳、石笋、石柱看得清          // 溶洞在地下深处：比后来溶低的地面（坝子）还低
        if (c.size > 0.02) {
          const outline = (k = 1) => { g.beginPath(); for (let i = 0; i <= 96; i++) { const [ux, uy] = rimPt((i / 96) * Math.PI * 2); g.lineTo(cx + ux * rx * k, cy - uy * ry * k); } g.closePath(); };          // 和 3D 洞的穹顶前缘同一条轮廓（洞的单位坐标，画布的 y 朝下）
          g.save(); outline(1.18); const rim = g.createRadialGradient(cx, cy, Math.min(rx, ry) * 0.7, cx, cy, Math.max(rx, ry) * 1.2); rim.addColorStop(0, 'rgba(40,32,24,0.55)'); rim.addColorStop(1, 'rgba(40,32,24,0)'); g.fillStyle = rim; g.fill(); g.restore();          // 洞口外一圈暗下去
          g.save(); outline(0.97); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.fill(); g.restore();          // 挖空：从洞口看进去是 3D 的洞（比穹顶小一点，穹顶的边藏在岩壁后面）
          g.font = '600 26px "PingFang SC", sans-serif'; g.textAlign = 'left'; g.lineWidth = 5; g.strokeStyle = 'rgba(30,30,30,0.55)';
          const say = (txt, x, y, cl) => { g.strokeText(txt, x, y); g.fillStyle = cl; g.fillText(txt, x, y); };
          if (S.near !== u) say('水往下渗：溶蚀、带走', 12, Y(0.044), '#d9ecff');          // 一样是水，在这里是溶蚀（凑近看洞时不写在切面上，免得字放得很大）
          if (c.drip > 0.05 && S.near !== u) say('滴水：CO₂ 逸出，碳酸钙沉淀', Math.max(8, cx - rx * 0.9), cy - ry - 12, '#fff2c8');          // 在洞里又是沉淀
          if (t > 0.18 && t < 0.62) { g.strokeStyle = '#4f87b8'; g.lineWidth = 3; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(X(0.012), Y(gridH(u, 0.012, BD / 2)) + 6); g.lineTo(cx - rx * 0.3, cy - ry * 0.8); g.stroke(); g.setLineDash([]); }          // 洼地底下有裂隙通到地下河（像大窝凼）
        }
      } else { g.fillStyle = 'rgba(120,80,50,0.5)'; for (let i = 0; i <= w; i += 2) { const x = -BW / 2 + (i / w) * BW; g.fillRect(i, Y(gridH(u, x, BD / 2)), 2, 10); } }          // 花岗岩上一层土
      g.save(); g.beginPath(); g.moveTo(0, 0); for (let i = 0; i <= w; i += 2) { const x = -BW / 2 + (i / w) * BW; g.lineTo(i, Y(gridH(u, x, BD / 2))); } g.lineTo(w, 0); g.closePath(); g.globalCompositeOperation = 'destination-out'; g.fill(); g.restore();          // 地面以上透明（一次擦掉，不再一列列擦）
      ftex.needsUpdate = true;
    }
    const aHover = airLabel(block, '', { h: 0.0075, color: '#3a3226', dim: 0 });
    const tHint = tag('<span>拖“经过的时间”</span><small>三块经历同样长的时间</small>', 'hint');
    noteBadge(tag, '教学示意：时间大大压缩了；溶洞和裂隙的尺度作了示意性放大，不表示真实比例和形成时间；地表的土壤覆盖只是示意，颜色不代表所有岩溶区；两块石灰岩的发育快慢只是示意的比较；展示的是一种典型演变，不代表每个地方都要依次经过各阶段；地下的石钟乳、石笋和地表的阶段没有固定对应；竖直方向夸大了；花岗岩的风化、侵蚀没有模拟').loc(block, -1.5 * BW - GAP + 0.01, -0.002, BD / 2 + 0.012);
    const labels = [aHover, ...units.flatMap((u) => [u.label, u.stageL])];
    const layoutAll = () => { units.forEach(rebuild); tHint.loc(block, 0, 0.18, 0).show(!S.moved); drawChart(); drawLog(); };

    // ---- 侧栏：图 4.2 的六个阶段，三块各走到了哪 ----
    const drawChart = () => {
      if (!W) return;
      const c = W.chart, g = c.getContext('2d'), w = c.width, hh = c.height, L = 96, cw = (w - L - 6) / 6;
      g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, hh); g.textBaseline = 'middle'; g.textAlign = 'center'; g.font = '11px "PingFang SC", sans-serif';
      STAGES.forEach(([n], i) => { g.fillStyle = '#5a5040'; g.fillText(n, L + (i + 0.5) * cw, 12); });
      units.forEach((u, r) => {
        const y = 40 + r * 34, t = tOf(u.b), seen = S.seen[u.b.key] || new Set();
        g.textAlign = 'left'; g.font = '600 11px "PingFang SC", sans-serif'; g.fillStyle = '#3a3226'; g.fillText(u.b.name.replace(' · ', ''), 4, y);
        STAGES.forEach(([n, a], i) => { const x = L + (i + 0.5) * cw, cur = stageName(t) === n; g.fillStyle = cur ? '#a8341f' : seen.has(n) ? '#c9a68a' : 'rgba(120,110,90,0.15)'; g.beginPath(); g.arc(x, y, cur ? 8 : 6, 0, 7); g.fill(); if (i) { g.strokeStyle = seen.has(n) ? '#c9a68a' : 'rgba(120,110,90,0.2)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - cw + 8, y); g.lineTo(x - 8, y); g.stroke(); } void a; });
        if (u.b.rock === 'granite') { g.fillStyle = '#7a705e'; g.font = '10px "PingFang SC", sans-serif'; g.textAlign = 'left'; g.fillText('不可溶：不出现这样的喀斯特形态', L + 4, y + 13); }
      });
    };
    const drawLog = () => {
      if (!W) return;
      const rows = [], r = (b2, t2) => rows.push(h('div', { class: 'tl-row' }, h('b', {}, b2), h('span', {}, t2))), wet = S.seen.wet || new Set(), dry = S.seen.dry || new Set();
      const inOrder = (set) => STAGES.map((x) => x[0]).filter((n) => set.has(n)).join(' → ');          // 按演变的先后排，不按拖动的先后
      if (wet.size) r('湿润地区的石灰岩：', `看到过 ${inOrder(wet)}`);
      if (dry.size) r('干旱地区的石灰岩：', `看到过 ${inOrder(dry)}（同样的时间，发育得慢得多）`);
      if (S.time > 2) r('湿润地区的花岗岩：', '花岗岩不是可溶性岩石，不出现石灰岩那样的喀斯特形态（它的风化、侵蚀本活页没有模拟）');
      if (wet.has('洼地') || wet.has('峰林')) r('坝子：', '有的洼地面积较大、底部平坦，在云南、贵州等地称为坝子，可以成为重要的农耕区');
      if (wet.has('峰丛')) r('地下：', '溶洞越溶越大；洞顶长石钟乳，洞底长石笋，连起来是石柱。洼地底下有裂隙通到地下河——大窝凼就是这样的洼地，排水通畅');
      if (S.guess != null && wet.has('峰林')) rows.push(h('div', { class: 'tl-row' }, h('small', {}, `你猜：${ASK[1][S.guess]}　实际：湿润地区的石灰岩`)));
      W.log.replaceChildren(...rows);
      if (wet.size >= 5 && wet.has('残丘') && dry.size) W.ui.unlock();          // 要真的看过大部分阶段，不是一下拖到底
    };

    // ---- 指针：鼠标停在地块上看地貌的名字 ----
    const cvs = () => document.getElementById('c');
    const caveHit = (rc) => rc.intersectObjects(units.filter((u) => u.cave3?.ok).map((u) => { u.cave3.pick.visible = true; return u.cave3.pick; }), false)[0];
    const pickCave = (rc) => { const ht = caveHit(rc); for (const u of units) if (u.cave3) u.cave3.pick.visible = false; return ht ? units.find((q) => q.cave3?.pick === ht.object) : null; };
    const enterCave = (u) => {          // 镜头到洞口前面、稍微往下看进去
      const at = u.caveAt; group.updateMatrixWorld(true); const c = group.worldToLocal(u.g.localToWorld(new THREE.Vector3(at.x, at.y - at.ry * 0.15, BD / 2 - at.rx * 0.3)));
      S.near = u; paintFace(u, tOf(u.b)); units.forEach((q) => q.cave3 && placeNames(q));
      look([c.x, c.y, c.z], [0, 0.045, 1], Math.max(0.11, at.rx * 3.2), () => { S.near = null; paintFace(u, tOf(u.b)); units.forEach((q) => q.cave3 && placeNames(q)); });
      W?.ui.status('钻到溶洞口：洞顶往下长的是<b>石钟乳</b>，洞底往上长的是<b>石笋</b>，两个连起来就是<b>石柱</b>；洞底一侧是<b>地下河</b>。含碳酸氢钙的水从洞顶滴下来，二氧化碳逸出，碳酸钙一点点沉淀下来。');
    };
    const pointer = {
      down(rc) { const u = pickCave(rc); if (u && S.near !== u) { enterCave(u); return true; } return false; },
      up: () => false,
      move(rc) {
        const cu = pickCave(rc); if (cvs()) cvs().style.cursor = cu ? 'pointer' : '';
        if (cu) { aHover.setText(S.near === cu ? '溶洞' : '溶洞：点一下，钻进去看'); const wp = block.worldToLocal(cu.g.localToWorld(new THREE.Vector3(cu.caveAt.x, cu.caveAt.y + cu.caveAt.ry + 0.008, BD / 2))); aHover.position.copy(wp); aHover.userData.want = 1; return false; }
        const ht = rc.intersectObjects(units.map((u) => u.top), false)[0];
        if (!ht) { aHover.userData.want = 0; return false; }
        const u = units.find((q) => q.top === ht.object), l = u.g.worldToLocal(ht.point.clone()), t = tOf(u.b), hg = l.y, lowFlat = hg < H0 - 0.04 && t > 0.3;
        const relTop = (hg - (H0 - 0.05 * sm(0.14, 0.62, t) - 0.008 * sm(0.75, 1, t))) / Math.max(0.001, H0 - 0.03), sn = stageName(t);          // 这一点比溶低的地面高出多少：高的是峰体，低平的是洼地
        const nm = u.b.rock === 'granite' ? '花岗岩：不出现喀斯特形态（风化、侵蚀没有模拟）' : t < 0.05 ? '石灰岩的地面' : t < 0.18 ? '溶沟：顺着裂隙溶出的沟' : lowFlat && relTop < 0.08 ? (u.b.clim === 'wet' && t > 0.5 ? '洼地：底部平坦的，可以是坝子（农耕区）' : '洼地') : sn === '洼地' ? '洼地边上残留的岩体' : sn ? `${sn}${sn === '峰丛' ? (shifting(t) ? '：正在变成峰林，峰与峰之间的连接越来越低' : '：基部相连的成片山峰') : sn === '峰林' ? '：一座座分开的峰' : ''}` : '石灰岩';
        aHover.setText(nm); const wp = block.worldToLocal(ht.point.clone()); aHover.position.set(wp.x, wp.y + 0.012, wp.z); aHover.userData.want = 1; return false;
      },
    };
    layoutAll();

    return {
      group,
      card: false,
      emerge: 'flat',          // 课本的图平放在书页上，模型从它上面长出来、它慢慢淡掉
      size: { w: 0.38, d: 0.12, h: 0.16 },
      view: { elev: 22, azim: 10, lookY: 0.42, frameMargin: 1.08 },
      pointer,
      debug: { time: (v) => { S.time = v; S.moved = true; layoutAll(); }, cave: () => units[0].cave3?.ok && enterCave(units[0]) },
      mount(ui) {
        const time = slider('经过的时间（示意，很长很长）', { min: 0, max: 8, step: 0.05, value: 0, fmt: (v) => (v ? `第 ${v.toFixed(1)} 段` : '刚开始'), onInput: (v) => { S.time = v; S.moved = true; S.play = false; acts.btns[0].textContent = '让时间走'; layoutAll(); } });
        const guess = seg(...ASK, (_, i) => { S.guess = i; drawLog(); }, { value: -1 });
        const acts = buttons([
          { text: '让时间走', onClick: () => { S.play = !S.play; acts.btns[0].textContent = S.play ? '停一下' : '让时间走'; } },
          { text: '重来', ghost: true, onClick: () => { ui.relock?.(); Object.assign(S, { time: 0, play: false, moved: false, guess: null }); S.seen = {}; time.set(0); guess.set(-1); acts.btns[0].textContent = '让时间走'; layoutAll(); ui.status(START); } },
        ]);
        const chart = h('canvas', { class: 'wx-map', width: 320, height: 140 }), log = h('div', { class: 'timeline' });
        ui.controls.append(h('div', { class: 'bar-title' }, '图 4.2：三块各走到了哪一步'), chart, time.el, acts.el, guess.el, note('每块前面都切开了：看得见地下的岩层、裂隙和溶洞。鼠标停在地块上，会写出那是什么地貌。'));
        ui.data.append(h('div', { class: 'bar-title' }, '你看到了什么'), log);
        W = { ui, chart, log, time };
        ui.status(START);
        drawChart(); drawLog();
      },
      update(dt) {
        labels.forEach((l) => l.tick(dt));
        if (S.play) { S.time = Math.min(8, S.time + dt * 0.5); S.moved = true; W?.time.set(S.time); if (Math.floor(S.time * 20) !== S.lastT) { S.lastT = Math.floor(S.time * 20); layoutAll(); } if (S.time >= 8) { S.play = false; if (W) W.ui.status('时间走完了。比一比三块：只有湿润地区的石灰岩走完了图 4.2 的六步。'); } }
        for (const u of units) { const n = u.drops.length; for (let i = 0; i < n; i++) { const d = u.drops[i]; d.t = (d.t + dt * 1.4) % 1; const y = 0.13 - d.t * 0.035; u.rp.set([d.x, y, d.z, d.x - 0.0006, y - 0.004, d.z], i * 6); } u.rain.geometry.attributes.position.needsUpdate = true; u.rain.geometry.setDrawRange(0, n * 2); }
      },
    };
  },
};
const START = '三块岩石经历同样长的时间，但岩性或降水条件不同：湿润地区的石灰岩、干旱地区的石灰岩、湿润地区的花岗岩。拖<b>经过的时间</b>（或按“让时间走”），看它们各变成什么样。';
// 土壤 CO₂ 参与岩溶：NPS，What Makes a Cave，https://www.nps.gov/wica/learn/education/classrooms/what-makes-a-cave.htm
