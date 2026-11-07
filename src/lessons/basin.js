// 高中地理 选择性必修2 第四章第一节 流域内协调发展 · 黄河的调沙减淤（课本第 61–64 页，图 4.5 黄河下游的“地上河”、图 4.6 水土保持、图 4.7 主要水文站年均输沙量、图 4.9 小浪底放水调沙、思考：下游冲淤平衡对入海口的影响）。
//
// 一个问题：治理以前，黄河下游出了什么问题？调沙减淤以后，到底换来了什么？
// 课本的图就是模型：一段立在书页上的黄河流域（示意）——后面是千沟万壑的黄土高原（中游），中间是小浪底，前面是华北平原上被大堤夹着的下游河道，
// 地块前面切开就是图 4.5 的“地上河”剖面；旁边另立一小块：入海口的黄河三角洲。
// 学生亲手做的：沿着时间线（1956 → 2016 年）往前走，泥沙多少按课本图 4.7 三个统计时段的实测年均输沙量——
//   1. 问题：泥沙从黄土高原的冲沟冲进河，在下游淤下，河床越淤越高，大堤只能跟着加高。按“假如大堤失守”：看“地上悬河”一旦决口，水从高处冲向开封城（历史上的情形，课本：决口 1 500 余次）。
//   2. 中游保持水土（50 年代就开始，一直在做）：黄土高原慢慢变绿，修起梯田、淤地坝。
//   3. 小浪底：1999 年蓄水拦沙；2002—2015 年汛前调水调沙，亲手按一次，人造洪峰冲刷下游河床；“地上河”没有再长高。
//   4. 入海口：入海流路几次改道；正在走水的河口仍在淤长，但入海泥沙少了，长得慢了；失去主流水沙补给的老河口，海岸后退。
// 数据：kit/basin.js（课本图 4.7 的实测输沙量、核对过的年份；高度、三角洲伸缩只是示意）。tools/geo/basin_check.mjs 核对。
import * as THREE from 'three';
import { seg, slider, buttons, note } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { h } from '../ui/Panel.js';
import { airLabel, faceLabel, noteBadge } from './kit/labels.js';
import { STATIONS, ERAS, Y0, Y1, EVENTS, MOUTHS, eraOf, loadAt, mouthAt, flushYear, bedRel, leveeRel, soilRel, delta, shoreAt } from './kit/basin.js';

const XL = -0.19, XR = 0.19, ZD = 0.1, NX = 170, NZ = 90, PLAIN = 0.01, KM = 0.0016;          // 地块；平原（开封城里地面）的高度；1 米在画面上多高（竖直方向夸大）
const DAM_S = 0.47, SB = 0.86, FLOOD = 3.5;          // 小浪底在河的哪一段；决口处；洪水位比河床高多少（示意）
const MS = 0.72, DW = 0.105, DD = 0.09, SHORE0 = -0.035, LAND_Y = 0.008, SEA_Y = 0.006;          // 入海口那一块（放大示意）：缩放、半宽、半深；岸线基准；陆地、海面高度
const ASK = ['先猜一下（可以不猜）：入海的泥沙少了以后，河口一带的海岸会——', ['处处都长得更快', '各岸段不一样：有的后退，有的仍在淤长', '没有变化']];
const rnd = (() => { let s = 53; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const yr = (y) => `${Math.floor(y)} 年`;

export default {
  id: 'basin',
  fig: '图4.5',
  title: '黄河的调沙减淤',
  flow: 'explore',
  ask: '黄河下游原来有什么问题？中游保持水土、小浪底调水调沙，到底换来了什么？入海口又会怎样？',
  need: '按一次“假如大堤失守”看看问题有多严重；沿着时间线从 1956 年走到 2016 年，在 2002—2015 年里按一次“汛前放水调沙”，再看看入海口的三角洲',
  conclusion: {
    page: 66,
    quote: '含沙量大是黄河最突出的水文特征。黄土高原水土流失严重，导致黄河挟带泥沙数量之多，居世界大河首位。黄河下游流经华北平原，坡度变小，流速缓慢，泥沙沉积使下游河床不断抬高，因此下游的黄河自古以“易淤、易决、易徙”而闻名。据历史文献记载，黄河下游决口泛滥1 500余次，较大的改道有20多次……为了防治水害，两岸不断加高大堤，使得黄河下游河床高出两岸地面，成为世界上著名的“地上悬河”（图4.5）。……中游的黄土高原是黄河流域的主要侵蚀区，水土保持是减少入黄泥沙的根本措施。……小浪底工程从2009年竣工到2015年，累计将下游河道中9.66亿吨淤沙送入大海，“地上河”没有再长高，黄河下游基本保持冲淤平衡。',
    why: '中游黄土高原的泥沙大量冲进黄河，到了坡度变小的下游就淤下来，河床越淤越高；人们只能把大堤一次次加高，河床和大堤一起往上长，成了高出两岸的“地上悬河”。历史上一旦决口，水就从高处冲向平原（1949 年以后，靠加高加固大堤和防汛，黄河伏秋大汛没有决口，但悬河越悬越高，风险越来越大）。治理从两头下手：中游保持水土，从源头减少入黄泥沙；小浪底（1999 年蓄水，2001 年底主体工程完工，2009 年通过国家竣工验收）拦沙，并在汛前调水调沙，用人造洪峰冲刷下游河床，把淤沙送进大海。课本图 4.7 显示，和第一个时段比，各站的输沙量总体大幅减少（头道拐站第三时段比第二时段略有回升；减少里也有降水变化、上游水库、引水用水等的影响）；2009—2015 年 9.66 亿吨淤沙入海，“地上河”没有再长高，下游淤积得到缓解、防洪能力提高。入海的泥沙少了，河口一带的海岸也跟着变：失去主流水沙补给的老河口岸段被海浪侵蚀后退，主流入海的河口仍可能淤长，各岸段不一样——一个地方的治理，会牵动流域的另一头。',
    src: '课本第 61–64 页 · 第四章 第一节 流域内协调发展',
  },

  create({ tag }) {
    const group = new THREE.Group(), block = new THREE.Group(); group.add(block);
    const S = { y: Y0, play: false, breach: null, pulse: 0, did: { breach: false, flush: false, delta: false }, seen: new Set(), moved: false, guess: null, scourY: null };
    let W = null;
    const era = () => eraOf(S.y), veg = () => soilRel(S.y), damOn = () => S.y >= EVENTS.damFill;
    const bed = () => 4 + 4 * bedRel(S.y), levee = () => 10 + 4 * leveeRel(S.y);          // 画面用的高度（只是示意，不写米数）：大堤比河床高一截；河床冲深时大堤不跟着变低

    // ---- 河的走向（俯视）：从后面的黄土高原流出来，过小浪底，到前面的平原上，一直流到地块前面的切面 ----
    const curve = new THREE.CatmullRomCurve3([[-0.2, -0.085], [-0.13, -0.06], [-0.07, -0.05], [-0.025, -0.022], [0.012, -0.004], [0.05, 0.02], [0.07, 0.06], [0.074, 0.12]].map(([x, z]) => new THREE.Vector3(x, 0, z)));
    const NS = 260, SP = curve.getSpacedPoints(NS);
    const near = (x, z) => { let bi = 0, bd = 1e9; for (let i = 0; i <= NS; i += 2) { const p = SP[i], d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; bi = i; } } for (let i = Math.max(0, bi - 2); i <= Math.min(NS, bi + 2); i++) { const p = SP[i], d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; bi = i; } } const p = SP[bi], t = curve.getTangentAt(bi / NS); return { s: bi / NS, d: Math.sqrt(bd), side: Math.sign((x - p.x) * t.z - (z - p.z) * t.x) }; };          // side < 0：顺流看的右岸（南岸，开封城那一边）
    const sAtZ = (z) => { for (let i = 0; i <= NS; i++) if (SP[i].z >= z) return i / NS; return 1; };
    const FRONT_X = curve.getPointAt(sAtZ(ZD)).x;
    const floorAt = (s) => PLAIN + bed() * KM + 0.025 * Math.max(0, 1 - s / 0.6);          // 河床的纵剖面：上游高、下游低（连续坡降示意）
    const waterAt = (s) => floorAt(s) + 0.0026 + (S.breach && s > DAM_S ? Math.min(1, S.breach.t / 1.4) * Math.max(0, (levee() - bed()) * KM - 0.003) * sm(DAM_S, DAM_S + 0.15, s) : 0) + (S.pulse > 0 && s > DAM_S ? 0.0025 * Math.sin(Math.min(1, S.pulse / 2.4) * Math.PI) : 0);          // 洪水来了：水位一路涨到堤顶；人造洪峰：下游水位涨一涨

    // ---- 地面：后面高（黄土高原、沟谷纵横），前面低（华北平原）；河在高原上切出峡谷，到平原上被两道大堤夹着 ----
    const platMask = (x, z) => 1 - sm(-0.02, 0.06, x * 0.8 + z * 0.9 + 0.02);
    const gully = (x, z) => { const a = x * 80 + z * 34 + 2.4 * Math.sin(z * 30 + x * 11), b = x * 31 - z * 77 + 1.7 * Math.sin(x * 40); return 0.6 * (1 - Math.abs(Math.sin(a))) ** 7 + 0.5 * (1 - Math.abs(Math.sin(b))) ** 9; };          // 一道道冲沟
    const bedY = () => PLAIN + bed() * KM, leveeY = () => PLAIN + levee() * KM;
    const height = (x, z) => {
      const m = platMask(x, z), g = gully(x, z) * m;
      let hgt = PLAIN + m * (0.042 + 0.004 * Math.sin(x * 47) * Math.sin(z * 39)) - g * 0.013;
      const { s, d, side } = near(x, z);
      if (s < DAM_S + 0.04) hgt = Math.min(hgt, floorAt(s) + Math.max(0, d - 0.005) * 1.4);          // 峡谷：河床从上游往下游一路降低
      else {
        const w = sm(DAM_S + 0.02, DAM_S + 0.12, s), notch = S.breach && side < 0 && Math.abs(s - SB) < 0.013 * Math.min(1, Math.max(0, S.breach.t - 1.2) / 0.5);          // 决口：右岸（开封那边）的大堤在这一段被冲开
        const lv = d < 0.0065 ? bedY() : d < 0.0115 ? (notch ? PLAIN + 0.001 : leveeY()) : d < 0.02 ? (notch ? PLAIN : leveeY() - (leveeY() - PLAIN) * ((d - 0.0115) / 0.0085)) : PLAIN;
        hgt = hgt * (1 - w) + Math.max(PLAIN, lv) * w; if (d > 0.02) hgt = Math.max(hgt, PLAIN);
      }
      if (d < 0.0065) hgt = floorAt(s);
      return hgt;
    };
    const topGeo = new THREE.PlaneGeometry(XR - XL, 2 * ZD, NX, NZ); topGeo.rotateX(-Math.PI / 2);
    const tCol = new Float32Array(topGeo.attributes.position.count * 3); topGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
    const grain = canvasTex(256, 256, (g, w) => { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, w); for (let i = 0; i < 2600; i++) { const v = 150 + Math.random() * 100; g.fillStyle = `rgba(${v},${v},${v},${0.2 + Math.random() * 0.35})`; g.fillRect(Math.random() * w, Math.random() * w, 1.6, 1.6); } }, { repeat: [6, 3] });
    const topMesh = new THREE.Mesh(topGeo, new THREE.MeshLambertMaterial({ vertexColors: true, map: grain })); block.add(topMesh);
    const LOESS = new THREE.Color(0xc9a46a), LOESS_D = new THREE.Color(0xa77d48), GREEN = new THREE.Color(0x7fa356), FIELD = new THREE.Color(0xb7b86e), PLAINC = new THREE.Color(0xa9c27e), LEVEE = new THREE.Color(0x9c8a6a), tc = new THREE.Color();
    const paint = (x, z, hgt) => {
      const m = platMask(x, z), g = gully(x, z) * m, { s, d } = near(x, z), v = veg();
      if (m > 0.5) { tc.copy(g > 0.25 ? LOESS_D : LOESS); if (v > 0 && g < 0.25) tc.lerp(FIELD, 0.5 * v).multiplyScalar(1 - 0.06 * v * (Math.sin(hgt * 2600) > 0 ? 1 : 0)); tc.lerp(GREEN, (g > 0.2 ? 0.75 : 0.4) * v); }          // 水土保持：塬面沿等高线成田、坡上一级级梯田、沟里长树——50 年代就开始，随年份慢慢扩大
      else tc.copy(PLAINC);
      if (s > DAM_S + 0.05 && d > 0.006 && d < 0.02) tc.copy(LEVEE);
      return tc;
    };
    const shapeTop = () => {
      const p = topGeo.attributes.position;
      for (let k = 0; k < p.count; k++) { const x = p.getX(k), z = p.getZ(k), hgt = height(x, z); p.setY(k, hgt); const c = paint(x, z, hgt); tCol.set([c.r, c.g, c.b], k * 3); }
      p.needsUpdate = true; topGeo.attributes.color.needsUpdate = true; topGeo.computeVertexNormals(); topGeo.computeBoundingSphere();
    };
    // ---- 前面的切面（图 4.5）、后面、两头 ----
    const soilTex = canvasTex(512, 128, (g, w, hh) => { const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#c9a46a'); gr.addColorStop(1, '#9b7a52'); g.fillStyle = gr; g.fillRect(0, 0, w, hh); for (let k = 0; k < 12; k++) { g.strokeStyle = `rgba(80,55,30,${0.06 + Math.random() * 0.08})`; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); const y0 = (k / 12) * hh; for (let x = 0; x <= w; x += 16) g.lineTo(x, y0 + Math.sin(x / 50 + k) * 2); g.stroke(); } });
    const faceMat = new THREE.MeshLambertMaterial({ map: soilTex, side: THREE.DoubleSide });
    const front = new THREE.Mesh(new THREE.BufferGeometry(), faceMat), back = new THREE.Mesh(new THREE.BufferGeometry(), faceMat), ends = new THREE.Mesh(new THREE.BufferGeometry(), faceMat); block.add(front, back, ends);
    const strip = (zf, flip) => { const P = [], U = [], I = []; for (let i = 0; i <= NX; i++) { const x = XL + ((XR - XL) * i) / NX, y = height(x, zf); P.push(x, y, zf, x, 0, zf); U.push(i / NX, y / 0.06, i / NX, 0); if (i) { const a = 2 * i - 2; flip ? I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) : I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals(); return g; };
    const waterFace = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xb08a4a, side: THREE.DoubleSide })); block.add(waterFace);          // 切面上河里的水
    const buildFaces = () => {
      front.geometry.dispose(); front.geometry = strip(ZD, false); back.geometry.dispose(); back.geometry = strip(-ZD, true);
      const P = []; for (const x of [XL, XR]) for (let k = 0; k < NZ; k++) { const z0 = -ZD + (2 * ZD * k) / NZ, z1 = z0 + (2 * ZD) / NZ; P.push(x, 0, z0, x, height(x, z0), z0, x, height(x, z1), z1, x, 0, z0, x, height(x, z1), z1, x, 0, z1); }
      ends.geometry.dispose(); ends.geometry = new THREE.BufferGeometry(); ends.geometry.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); ends.geometry.computeVertexNormals();
      const wl = waterAt(1), x0 = FRONT_X - 0.0065, x1 = FRONT_X + 0.0065, zf = ZD + 0.0004;
      waterFace.geometry.dispose(); waterFace.geometry = new THREE.BufferGeometry(); waterFace.geometry.setAttribute('position', new THREE.Float32BufferAttribute([x0, bedY(), zf, x1, bedY(), zf, x1, wl, zf, x0, bedY(), zf, x1, wl, zf, x0, wl, zf], 3));
    };

    // ---- 河水：一条带子；颜色按那一段的年输沙量（图 4.7），越黄越多（不是含沙浓度） ----
    const waterGeo = new THREE.BufferGeometry(), WN = 200;
    const water = new THREE.Mesh(waterGeo, new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.92 })); water.raycast = () => {}; block.add(water);
    const MUDDY = new THREE.Color(0xb08a4a), CLEAR = new THREE.Color(0x6f9ab8);
    const segLoad = (s) => (s < DAM_S + 0.02 ? loadAt(S.y, '龙门') : s < 0.9 ? loadAt(S.y, '小浪底') : loadAt(S.y, '利津'));          // 这一段河里一年过多少沙（所在统计时段的年均值）：小浪底以上看龙门站，以下看小浪底站，河口一段看利津站
    const buildWater = () => {
      const P = [], C = [], I = [], up = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i <= WN; i++) {
        const s = i / WN, p = curve.getPointAt(Math.min(1, s)), t = curve.getTangentAt(Math.min(1, s)), n = new THREE.Vector3().crossVectors(t, up).normalize();
        if (p.z > ZD) p.z = ZD;
        const flood = S.breach && s > DAM_S ? Math.min(1, S.breach.t / 1.4) : 0, w = s < DAM_S ? 0.0035 + 0.002 * s : 0.0062 + 0.004 * flood, y = waterAt(s);
        P.push(p.x + n.x * w, y, p.z + n.z * w, p.x - n.x * w, y, p.z - n.z * w);
        tc.copy(CLEAR).lerp(MUDDY, Math.min(1, segLoad(s) / 10)); C.push(tc.r, tc.g, tc.b, tc.r, tc.g, tc.b);
        if (i) { const a = 2 * i - 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      }
      waterGeo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); waterGeo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); waterGeo.setIndex(I); waterGeo.computeVertexNormals();
      waterFace.material.color.copy(CLEAR).lerp(MUDDY, Math.min(1, segLoad(0.8) / 10));
    };
    // ---- 小浪底：一道坝，坝后一片水库（1999 年以后才有） ----
    const damP = curve.getPointAt(DAM_S), damT = curve.getTangentAt(DAM_S);
    const dam = new THREE.Group(); dam.position.set(damP.x, 0, damP.z); dam.rotation.y = Math.atan2(-damT.z, damT.x) + Math.PI / 2; block.add(dam);
    { const wall = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.024, 0.0045), new THREE.MeshLambertMaterial({ color: 0xd4d0c6 })); wall.position.y = 0.028; dam.add(wall); for (const dx of [-0.006, 0, 0.006]) { const gate = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.006, 0.0048), new THREE.MeshLambertMaterial({ color: 0x6a6f78 })); gate.position.set(dx, 0.022, 0.0002); dam.add(gate); } }
    const jet = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.02, 12, 1, true).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xc9b07a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })); jet.position.set(0, 0.022, 0.012); dam.add(jet);          // 放水调沙时：闸门喷出的浑水
    const lakeLevel = PLAIN + 7.4 * KM + 0.025 * (1 - 0.26 / 0.6) + 0.0026, lakePts = []; for (let i = Math.floor(NS * 0.26); i <= Math.floor(NS * DAM_S); i += 3) lakePts.push(SP[i]);
    const lake = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshLambertMaterial({ color: 0x7f9fae, transparent: true, opacity: 0.9 })); lake.raycast = () => {}; block.add(lake);
    { const P = [], up = new THREE.Vector3(0, 1, 0); for (let k = 0; k < lakePts.length - 1; k++) { const a = lakePts[k], b = lakePts[k + 1], t = new THREE.Vector3().subVectors(b, a).normalize(), n = new THREE.Vector3().crossVectors(t, up).normalize(), wa = 0.006 + 0.02 * (k / lakePts.length), wb = 0.006 + 0.02 * ((k + 1) / lakePts.length); P.push(a.x + n.x * wa, lakeLevel, a.z + n.z * wa, b.x + n.x * wb, lakeLevel, b.z + n.z * wb, b.x - n.x * wb, lakeLevel, b.z - n.z * wb, a.x + n.x * wa, lakeLevel, a.z + n.z * wa, b.x - n.x * wb, lakeLevel, b.z - n.z * wb, a.x - n.x * wa, lakeLevel, a.z - n.z * wa); } lake.geometry.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); lake.geometry.computeVertexNormals(); }

    // ---- 黄土高原上的措施：树和草、淤地坝（1987 年以后慢慢出现） ----
    const trees = new THREE.InstancedMesh(new THREE.ConeGeometry(0.0022, 0.0062, 6).translate(0, 0.0031, 0), new THREE.MeshLambertMaterial({ color: 0x4f7f3a }), 420); trees.raycast = () => {}; block.add(trees);
    const checks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.008, 0.003, 0.0018).translate(0, 0.0015, 0), new THREE.MeshLambertMaterial({ color: 0x8c7650 }), 40); checks.raycast = () => {}; block.add(checks);
    const treeM = [], checkM = [];
    { let tries = 0; while (treeM.length < 420 && tries++ < 8000) { const x = XL + rnd() * (XR - XL), z = -ZD + rnd() * 2 * ZD; if (platMask(x, z) < 0.8 || near(x, z).d < 0.01) continue; treeM.push([x, z, 0.8 + rnd() * 0.5, rnd()]); }
      tries = 0; while (checkM.length < 40 && tries++ < 20000) { const x = XL + 0.01 + rnd() * (XR - XL - 0.02), z = -ZD + 0.01 + rnd() * (2 * ZD - 0.02); if (platMask(x, z) < 0.85 || gully(x, z) < 0.5 || near(x, z).d < 0.012) continue; checkM.push([x, z, rnd()]); } }          // 淤地坝：横着打在冲沟里
    const placeVeg = () => {
      const v = veg(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(80, 34)); let n = 0, k = 0;
      for (const [x, z, sc, r] of treeM) if (r < v) { m4.compose(new THREE.Vector3(x, height(x, z) - 0.0004, z), q, new THREE.Vector3(1, sc, 1)); trees.setMatrixAt(n++, m4); }
      for (const [x, z, r] of checkM) if (r < v) { m4.compose(new THREE.Vector3(x, height(x, z) - 0.0005, z), q2, new THREE.Vector3(1, 1, 1)); checks.setMatrixAt(k++, m4); }
      trees.count = n; checks.count = k; trees.instanceMatrix.needsUpdate = true; checks.instanceMatrix.needsUpdate = true;
    };

    // ---- 开封城：几片房子和一座铁塔，在大堤外面低处 ----
    const city = new THREE.Group(); block.add(city);
    const CITY = [FRONT_X - 0.055, ZD - 0.03];          // 开封在黄河南岸（顺流看的右岸）
    for (let i = 0; i < 26; i++) { const x = CITY[0] + (rnd() - 0.5) * 0.07, z = CITY[1] + (rnd() - 0.5) * 0.05; if (Math.abs(x - FRONT_X) < 0.03 || x < CITY[0] - 0.03) continue; const w = 0.004 + rnd() * 0.003, hh = 0.003 + rnd() * 0.004, b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, w * 1.3), new THREE.MeshLambertMaterial({ color: [0xe9e2d4, 0xd8cdb8, 0xc9b9a0][i % 3] })); b.position.set(x, PLAIN + hh / 2, z); city.add(b); }
    const pagoda = new THREE.Group(); for (let k = 0; k < 7; k++) { const r = 0.0034 - k * 0.00028, seg2 = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r, 0.0034, 8), new THREE.MeshLambertMaterial({ color: 0x7a5a48 })); seg2.position.y = 0.0017 + k * 0.0034; pagoda.add(seg2); const eave = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.25, r * 1.25, 0.0006, 8), new THREE.MeshLambertMaterial({ color: 0x5a4034 })); eave.position.y = 0.0034 * (k + 1); pagoda.add(eave); }
    pagoda.position.set(FRONT_X - 0.045, PLAIN, ZD - 0.012); block.add(pagoda);          // 开封铁塔：不按比例，只保留课本图 4.5 里的高低关系——塔比大堤、洪水位都高
    pagoda.scale.y = ((14 + 8) * KM) / (7 * 0.0034);

    // ---- 决口：洪水从冲开的大堤口子漫向平原（一张贴图，按时间往外铺开） ----
    const bp = curve.getPointAt(SB), bt = curve.getTangentAt(SB), bn = new THREE.Vector3(-bt.z, 0, bt.x).normalize();          // 决口处、往右岸（开封那边）的方向
    const FX0 = XL + 0.06, FX1 = FRONT_X + 0.01, FZ0 = -0.02, FZ1 = ZD;          // 洪水贴图铺在右岸的低地上；高处的黄土高原自然把它挡住
    const floodCv = document.createElement('canvas'); floodCv.width = 256; floodCv.height = 256; const floodTex = new THREE.CanvasTexture(floodCv); floodTex.colorSpace = THREE.SRGBColorSpace;
    const floodM = new THREE.Mesh(new THREE.PlaneGeometry(FX1 - FX0, FZ1 - FZ0), new THREE.MeshLambertMaterial({ map: floodTex, transparent: true, depthWrite: false })); floodM.rotation.x = -Math.PI / 2; floodM.position.set((FX0 + FX1) / 2, PLAIN + 0.0012, (FZ0 + FZ1) / 2); floodM.renderOrder = 5; floodM.raycast = () => {}; floodM.visible = false; block.add(floodM);
    const drawFlood = (r, fade) => {
      const g = floodCv.getContext('2d'), w = 256, cx = ((bp.x + bn.x * 0.012 - FX0) / (FX1 - FX0)) * w, cz = ((bp.z + bn.z * 0.012 - FZ0) / (FZ1 - FZ0)) * w, rp = (r / (FX1 - FX0)) * w;
      g.clearRect(0, 0, w, w); if (r <= 0) return;
      g.save(); g.translate(cx, cz); g.beginPath(); for (let a = 0; a <= 64; a++) { const th = (a / 64) * Math.PI * 2, wob = 1 + 0.18 * Math.sin(th * 5 + 1.3) + 0.1 * Math.sin(th * 11), dir = Math.max(0.35, 0.65 + 0.5 * Math.cos(th - Math.atan2(bn.z, bn.x))); g.lineTo(Math.cos(th) * rp * wob * dir, Math.sin(th) * rp * wob * dir); } g.closePath();          // 顺着冲出去的方向铺得远
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, rp * 1.2); gr.addColorStop(0, `rgba(140,98,48,${0.97 * fade})`); gr.addColorStop(0.85, `rgba(160,118,64,${0.9 * fade})`); gr.addColorStop(1, `rgba(235,225,200,${0.9 * fade})`); g.fillStyle = gr; g.fill(); g.restore();
      floodTex.needsUpdate = true;
    };

    // ---- 入海口：一块放大的黄河三角洲，紧贴在主地块的右后方（整体接近方形，演示时两块一眼都看得到） ----
    const TILT = 0.3, inset = new THREE.Group(); inset.position.set(XR - DD * MS, 0, -ZD - 0.004); inset.rotation.x = TILT; group.add(inset);          // 放大图斜着立在主地块后面（前沿着地、后沿抬起），朝着看的人，不被平原挡住
    const mouth = new THREE.Group(); mouth.scale.setScalar(MS); mouth.rotation.y = Math.PI / 2; mouth.position.set(0, 0, -DW * MS); inset.add(mouth);          // 转 90°：河从南边（靠主地块那边）进来，往北入渤海
    { const L = 2 * DW * MS, x0 = inset.position.x - DD * MS, x1 = inset.position.x + DD * MS, z0 = inset.position.z, z1 = z0 - L * Math.cos(TILT), yt = L * Math.sin(TILT), v = [[x0, 0, z0], [x0, 0, z1], [x0, yt, z1], [x1, 0, z0], [x1, 0, z1], [x1, yt, z1]], f = [[0, 1, 2], [3, 5, 4], [1, 4, 5], [1, 5, 2]], P = []; for (const t of f) for (const k of t) P.push(...v[k]); const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); wg.computeVertexNormals(); const wedge = new THREE.Mesh(wg, new THREE.MeshLambertMaterial({ color: 0x8f7a5e, side: THREE.DoubleSide })); wedge.raycast = () => {}; group.add(wedge); }          // 底下一块楔形垫座，托住抬起的后沿
    const RIVZ = 0.0;          // 河从西边进来的位置；四个河口在 kit 的 MOUTHS 里（z：越往后越偏北）
    const shoreX = (z, L) => SHORE0 + shoreAt(z, L);
    const DN = 80, dGeo = new THREE.PlaneGeometry(2 * DW, 2 * DD, DN, DN); dGeo.rotateX(-Math.PI / 2);
    const dCol = new Float32Array(dGeo.attributes.position.count * 3); dGeo.setAttribute('color', new THREE.BufferAttribute(dCol, 3));
    const dMesh = new THREE.Mesh(dGeo, new THREE.MeshLambertMaterial({ vertexColors: true })); mouth.add(dMesh);
    const dBase = new THREE.Mesh(new THREE.BoxGeometry(2 * DW, LAND_Y, 2 * DD), new THREE.MeshLambertMaterial({ color: 0x8f7a5e })); dBase.position.y = LAND_Y / 2 - 0.0003; mouth.add(dBase);
    const dSea = new THREE.Mesh(new THREE.BoxGeometry(2 * DW, 0.001, 2 * DD), new THREE.MeshBasicMaterial({ color: 0x5f9bd2, transparent: true, opacity: 0.55, depthWrite: false })); dSea.position.y = LAND_Y + 0.0002; dSea.renderOrder = 4; dSea.raycast = () => {}; mouth.add(dSea);
    const dRiver = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xa88a52 })); mouth.add(dRiver);
    const ghost = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0x3a3226, dashSize: 0.003, gapSize: 0.002, transparent: true, opacity: 0.55 })); ghost.raycast = () => {}; mouth.add(ghost);          // 虚线：1986 年时的海岸线（三角洲长得最快的年代），好比一比后来伸缩了多少
    const SANDC = new THREE.Color(0xe2c98e), MARSH = new THREE.Color(0x9cba6c), SEAB = new THREE.Color(0x3d78b8);
    const buildDelta = () => {
      const d = delta(S.y), p = dGeo.attributes.position, xs = (z) => shoreX(z, d);
      for (let k = 0; k < p.count; k++) { const x = p.getX(k), z = p.getZ(k), dx = x - xs(z), land = dx < 0; p.setY(k, land ? LAND_Y + 0.0012 * Math.min(1, -dx / 0.02) : LAND_Y - 0.002 - Math.min(0.003, dx * 0.05)); tc.copy(land ? (dx > -0.012 ? SANDC : MARSH) : SEAB); dCol.set([tc.r, tc.g, tc.b], k * 3); }
      p.needsUpdate = true; dGeo.attributes.color.needsUpdate = true; dGeo.computeVertexNormals();
      const mz = mouthAt(S.y).z, P = [], up = new THREE.Vector3(0, 1, 0), pts = [];          // 河道：从西边进来，弯到当时的河口
      for (let i = 0; i <= 30; i++) { const t = i / 30, z = RIVZ + (mz - RIVZ) * sm(0.3, 1, t), x = -DW + (xs(mz) + DW + 0.003) * t; pts.push(new THREE.Vector3(x, LAND_Y + 0.0016, z)); }
      for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], t = new THREE.Vector3().subVectors(b, a).normalize(), n = new THREE.Vector3().crossVectors(t, up).normalize().multiplyScalar(0.003); P.push(a.x + n.x, a.y, a.z + n.z, b.x + n.x, b.y, b.z + n.z, b.x - n.x, b.y, b.z - n.z, a.x + n.x, a.y, a.z + n.z, b.x - n.x, b.y, b.z - n.z, a.x - n.x, a.y, a.z - n.z); }
      dRiver.geometry.dispose(); dRiver.geometry = new THREE.BufferGeometry(); dRiver.geometry.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      dRiver.material.color.copy(CLEAR).lerp(MUDDY, Math.min(1, loadAt(S.y, '利津') / 10));
      const g1996 = delta(1996), gp = []; for (let i = 0; i <= 40; i++) { const z = -DD + (2 * DD * i) / 40; gp.push(new THREE.Vector3(shoreX(z, g1996), LAND_Y + 0.0022, z)); } ghost.geometry.dispose(); ghost.geometry = new THREE.BufferGeometry().setFromPoints(gp); ghost.computeLineDistances(); ghost.visible = S.y > 2000;
      riverPts = pts;
    };
    let riverPts = [];
    const aMouth = airLabel(mouth, '入海口：黄河三角洲', { x: 0, y: 0.05, z: 0, h: 0.0177, color: '#2c3245' });
    const aOld = airLabel(mouth, '', { x: 0.03, y: 0.022, z: -0.06, h: 0.0131, color: '#8a3a2a', dim: 0 }), aNew = airLabel(mouth, '', { x: 0.04, y: 0.028, z: 0.03, h: 0.0131, color: '#2c3245', dim: 0 });
    const aSea = airLabel(mouth, '渤海', { x: DW - 0.03, y: 0.016, z: -DD + 0.03, h: 0.0150, color: '#173a63' });
    const aGhost = airLabel(mouth, '虚线：1996 年的海岸线', { x: -0.02, y: 0.02, z: DD - 0.015, h: 0.0125, color: '#5a5040', dim: 0 });
    const linkY = PLAIN + 0.004;          // 顺流而下：从前面剖面那里出去的河，沿着地块外沿连到入海口那块的西边（河从那里进来）
    const linkL = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.074, linkY, ZD + 0.006), new THREE.Vector3(XR + 0.008, linkY, ZD + 0.006), new THREE.Vector3(XR + 0.008, linkY, -ZD + 0.006)]), new THREE.LineDashedMaterial({ color: 0x8a7a5e, dashSize: 0.004, gapSize: 0.003 })); linkL.computeLineDistances(); linkL.raycast = () => {}; group.add(linkL);
    const frame = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => new THREE.Vector3(a * (DW + 0.004), LAND_Y + 0.0035, b * (DD + 0.004)))), new THREE.LineBasicMaterial({ color: 0x5a5040, transparent: true, opacity: 0.7 })); frame.raycast = () => {}; mouth.add(frame);          // 放大框
    const aLink = airLabel(group, '顺流而下 → 入海口（放大）', { x: XR + 0.02, y: 0.026, z: 0, h: 0.0084, color: '#5a5040' });

    // ---- 水文站：龙门、小浪底、利津（和侧栏图 4.7 对得上） ----
    const stake = (parent, x, y, z) => { const g2 = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.0006, 0.0006, 0.014, 6), new THREE.MeshLambertMaterial({ color: 0xe8e4da })); pole.position.y = 0.007; g2.add(pole); const flagM = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.0028, 0.0005), new THREE.MeshLambertMaterial({ color: 0x2f6fb0 })); flagM.position.set(0.0022, 0.0125, 0); g2.add(flagM); g2.position.set(x, y, z); parent.add(g2); return g2; };
    const lmP = curve.getPointAt(0.3), xldP = curve.getPointAt(DAM_S + 0.04);
    stake(block, lmP.x + 0.012, floorAt(0.3) + 0.004, lmP.z); stake(block, xldP.x + 0.012, PLAIN + 0.03, xldP.z);
    const stLm = airLabel(block, '', { x: lmP.x + 0.012, y: 0.07, z: lmP.z, h: 0.0081, color: '#1f4f86' }), stXl = airLabel(block, '', { x: xldP.x + 0.02, y: 0.062, z: xldP.z, h: 0.0081, color: '#1f4f86' });
    stake(mouth, -DW + 0.03, LAND_Y, RIVZ + 0.008); const stLj = airLabel(mouth, '', { x: -DW + 0.03, y: 0.03, z: RIVZ + 0.008, h: 0.0129, color: '#1f4f86' });

    // ---- 一粒粒泥沙：按图 4.7 各站的年输沙量放；水库拦下、下游淤下、调水调沙时从河床冲起 ----
    const dotTex = canvasTex(32, 32, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const NP = 420, ppos = new Float32Array(NP * 3), P = Array.from({ length: NP }, () => ({ on: false }));
    const dots = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(ppos, 3)), new THREE.PointsMaterial({ size: 0.022, map: dotTex, color: 0x8a5e2a, transparent: true, depthWrite: false })); dots.raycast = () => {}; dots.renderOrder = 7; block.add(dots);
    const NQ = 120, qpos = new Float32Array(NQ * 3), Q = Array.from({ length: NQ }, () => ({ on: false }));
    const dots2 = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(qpos, 3)), dots.material); dots2.raycast = () => {}; dots2.renderOrder = 7; mouth.add(dots2);
    let acc = { a: 0, b: 0, c: 0, scour: 0 };
    const spawn = (s, end, kind) => { const q = P.find((p) => !p.on); if (q) Object.assign(q, { on: true, s, end, off: (rnd() - 0.5) * 0.007, kind }); };
    // 三段各放各的粒子，多少只示意那一段所在时段的年均输沙量（不推算水库拦沙率）：小浪底以上看龙门站，小浪底以下看小浪底站，河口一段看利津站；
    // 利津站比小浪底站多的那部分、调水调沙时，粒子从下游河床里冲起来
    const stepDots = (dt) => {
      const lm = loadAt(S.y, '龙门'), xl = loadAt(S.y, '小浪底'), lj = loadAt(S.y, '利津'), k = 2.2;          // 每秒放的粒数 ∝ 年均输沙量
      acc.a += dt * lm * k; acc.b += dt * xl * k; acc.c += dt * Math.min(lj, xl) * k * 0.5; acc.scour += dt * (Math.max(0, lj - xl) + (S.pulse > 0 ? 4 : 0)) * k;
      while (acc.a > 1) { acc.a -= 1; spawn(0.03 + rnd() * 0.3, DAM_S, 'a'); }          // 有水库时停在坝前（拦下），没有时走到这一段的尽头
      while (acc.b > 1) { acc.b -= 1; spawn(DAM_S + 0.01 + rnd() * 0.08, 0.86 + rnd() * 0.05, 'b'); }          // 小浪底以下：一路往下游走，有的在下游淤下
      while (acc.c > 1) { acc.c -= 1; spawn(0.84 + rnd() * 0.04, 1, 'c'); }
      while (acc.scour > 1) { acc.scour -= 1; spawn(0.62 + rnd() * 0.3, 1, 'scour'); }          // 从下游河床冲起来的沙
      for (let i = 0; i < NP; i++) {
        const p = P[i]; if (!p.on) { ppos.set([0, -1, 0], i * 3); continue; }
        p.s += dt * (S.pulse > 0 && p.s > DAM_S ? 0.2 : 0.07);
        if (p.s >= p.end) { p.on = false; continue; }
        const q = curve.getPointAt(Math.min(1, p.s)), t = curve.getTangentAt(Math.min(1, p.s));
        if (q.z > ZD) { p.on = false; continue; }
        ppos.set([q.x - t.z * p.off, floorAt(p.s) + 0.0018 + (p.kind === 'scour' ? 0.0008 : 0), q.z + t.x * p.off], i * 3);
      }
      dots.geometry.attributes.position.needsUpdate = true;
      // 入海口：一粒粒沙顺着河道到河口，再在口门外散开、沉下
      const seaRate = lj * k * 0.8; acc.seaD = (acc.seaD || 0) + dt * seaRate;
      while (acc.seaD > 1) { acc.seaD -= 1; const q = Q.find((o) => !o.on); if (q) Object.assign(q, { on: true, t: 0, off: (rnd() - 0.5) * 0.004, sp: (rnd() - 0.5) * 0.03, out: 0.004 + rnd() * 0.02 }); }
      for (let i = 0; i < NQ; i++) {
        const o = Q[i]; if (!o.on || riverPts.length < 2) { qpos.set([0, -1, 0], i * 3); continue; }
        o.t += dt * 0.35; if (o.t > 1.5) { o.on = false; continue; }
        if (o.t <= 1) { const f = o.t * (riverPts.length - 1), j = Math.min(riverPts.length - 2, Math.floor(f)), a = riverPts[j], b = riverPts[j + 1], u = f - j; qpos.set([a.x + (b.x - a.x) * u, LAND_Y + 0.002, a.z + (b.z - a.z) * u + o.off], i * 3); }
        else { const e = riverPts[riverPts.length - 1], u = (o.t - 1) / 0.5; qpos.set([e.x + o.out * u, LAND_Y + 0.0008, e.z + o.sp * u], i * 3); }
      }
      dots2.geometry.attributes.position.needsUpdate = true;
    };

    // ---- 画面里的字 ----
    const aPlat = airLabel(block, '黄土高原（中游）', { x: -0.12, y: 0.07, z: -0.03, h: 0.0123, color: '#6a4a1e' });
    const aDam = airLabel(block, '小浪底水库', { x: damP.x, y: 0.058, z: damP.z, h: 0.0111, color: '#2c3245', dim: 0 });
    const aPlain = airLabel(block, '华北平原（下游）', { x: 0.14, y: 0.03, z: -0.05, h: 0.0111, color: '#3a4a2a' });
    const aKaifeng = airLabel(block, '开封', { x: CITY[0] - 0.006, y: PLAIN + 0.02, z: CITY[1] - 0.006, h: 0.0111, color: '#2c3245' });
    const aBed = airLabel(block, '', { h: 0.0101, color: '#a8341f' }), aBreach = airLabel(block, '', { h: 0.0123, color: '#b03a2a', icon: 'warn', dim: 0 }), aFlush = airLabel(block, '', { h: 0.0111, color: '#1f4f86', dim: 0 }), aVeg = airLabel(block, '', { x: -0.13, y: 0.062, z: 0.05, h: 0.0097, color: '#3f6a2a', dim: 0 });
    faceLabel(block, '黄河', { x: FRONT_X, y: PLAIN + 0.004, z: ZD, h: 0.0072, color: '#ffffff', stroke: 'rgba(40,30,20,0.6)' });
    faceLabel(block, '开封城里的地面', { x: CITY[0] - 0.01, y: PLAIN - 0.004, z: ZD, h: 0.0072, color: '#ffffff', stroke: 'rgba(40,30,20,0.6)' });
    const measure = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xa8341f })); measure.raycast = () => {}; block.add(measure);          // 切面上一道红线：河床比城里地面高多少
    const tHint = tag('<span>先按“假如大堤失守”</span><small>再拖“年份”往后走</small>', 'hint');
    noteBadge(tag, '教学示意：流域的形状、方向、竖直比例都是示意。泥沙多少、河水颜色、粒子多少按课本图 4.7 三个统计时段的实测年均输沙量（不在时段间插值，粒子只示意多少）；河床和大堤的高度、三角洲的伸缩只表示方向；“假如大堤失守”是历史上的情形，不是所选年份的事；输沙量减少也有降水、上游水库、引水用水等的作用').loc(block, XL + 0.012, -0.002, ZD + 0.012);
    const aHover = airLabel(block, '', { h: 0.0101, color: '#3a3226', dim: 0 });
    const labels = [aPlat, aDam, aPlain, aKaifeng, aBed, aBreach, aFlush, aVeg, aHover, aMouth, aOld, aNew, aSea, aGhost, aLink, stLm, stXl, stLj];

    // ---- 摆好 ----
    const layout = () => {
      const e = era();
      dam.visible = lake.visible = damOn(); aDam.setOn(damOn());
      buildWater(); placeVeg();
      const fx = FRONT_X + 0.016; measure.geometry.dispose(); measure.geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(fx, PLAIN, ZD + 0.0008), new THREE.Vector3(fx, bedY(), ZD + 0.0008), new THREE.Vector3(fx - 0.003, bedY(), ZD + 0.0008), new THREE.Vector3(fx + 0.003, bedY(), ZD + 0.0008), new THREE.Vector3(fx, bedY(), ZD + 0.0008), new THREE.Vector3(fx, PLAIN, ZD + 0.0008), new THREE.Vector3(fx - 0.003, PLAIN, ZD + 0.0008), new THREE.Vector3(fx + 0.003, PLAIN, ZD + 0.0008)]);
      aBed.position.set(fx + 0.04, (PLAIN + bedY()) / 2 + 0.004, ZD + 0.002); aBed.setText('河床高出两岸（图 4.5）');
      aVeg.setText(S.y >= 1987 ? '水土保持：梯田、淤地坝、林草' : '').setOn(S.y >= 1987);
      const sp = era().span.replace(' 年', ''); stLm.setText(`龙门站 ${sp} 年均 ${loadAt(S.y, '龙门')} 亿吨`); stXl.setText(`小浪底站 ${sp} 年均 ${loadAt(S.y, '小浪底')} 亿吨`); stLj.setText(`利津站 ${sp} 年均 ${loadAt(S.y, '利津')} 亿吨`);
      const mo = mouthAt(S.y), Ld = delta(S.y), dead = MOUTHS.filter((m) => m.to <= S.y && Ld[m.key] > 0.05);
      aNew.setText(`主流入海：${mo.name}（${mo.from} 年起）${mo.key === 'q8' ? (S.y < 2002 ? '，一度后退' : '，又向海淤长') : '，向海淤长'}`).setOn(true); aNew.position.z = mo.z + 0.012;
      aOld.setText(dead.length ? '老河口：失去主流水沙补给，海岸后退' : '').setOn(dead.length > 0); if (dead.length) aOld.position.z = dead[dead.length - 1].z - 0.008; aGhost.setOn(S.y > 2000);
      buildDelta();
      tHint.loc(block, 0.11, 0.07, ZD * 0.6).show(!S.moved);
      drawChart(); drawLog();
    };
    const rebuild = () => { shapeTop(); buildFaces(); layout(); };
    // 这一年发生了什么（状态栏按当前年份重写，往回拖也对）
    const statusFor = (y) => {
      const mo = mouthAt(y), parts = [`<b>${Math.floor(y)} 年</b>（图 4.7 统计时段 ${era().span}）：中游的水土保持在做（50 年代就开始），范围一年年扩大。`];
      if (y >= EVENTS.damFill) parts.push('小浪底水库 1999 年蓄水，拦下大量泥沙。');
      if (flushYear(y)) parts.push('这一年汛前有调水调沙：按<b>汛前放水调沙</b>看看。'); else if (y >= EVENTS.lastFlush + 1) parts.push('2016 年没有进行调水调沙。');
      parts.push(`入海走的是${mo.name}（${mo.from} 年起）。`);
      return parts.join('');
    };
    const stopDemos = () => { const had = !!S.breach || S.pulse > 0; S.pulse = 0; jet.material.opacity = 0; aFlush.setOn(false); S.breach = null; floodM.visible = false; aBreach.setOn(false); for (const p of P) p.on = false; for (const q of Q) q.on = false; ppos.fill(0); qpos.fill(0); for (let i = 1; i < ppos.length; i += 3) ppos[i] = -1; for (let i = 1; i < qpos.length; i += 3) qpos[i] = -1; dots.geometry.attributes.position.needsUpdate = true; dots2.geometry.attributes.position.needsUpdate = true; acc = { a: 0, b: 0, c: 0, scour: 0 }; if (had) rebuild(); };          // 换年份、两种演示互切、重来：演示停下，粒子清空，堤防、水面、剖面都恢复
    const setYear = (y) => {
      const prev = S.y; S.y = Math.max(Y0, Math.min(Y1, y)); if (Math.floor(prev) === Math.floor(S.y) && !S.force) return; S.force = false;
      stopDemos(); S.seen.add(era().key); if (S.y >= 2010) S.did.delta = true;
      rebuild(); W?.year.set(S.y); W?.eraSeg.set(ERAS.indexOf(era())); W?.ui.status(statusFor(S.y));
    };

    // ---- 假如大堤失守：水位涨到堤顶，大堤决口，水冲向开封（历史上的情形，不是所选年份发生的事） ----
    const startBreach = () => {
      if (S.pulse > 0) stopDemos();
      tHint.show(false); S.breach = { t: 0 }; S.did.breach = true; floodM.visible = true; S.moved = true; drawLog();
      aBreach.position.set(bp.x + bn.x * 0.03, leveeY() + 0.02, bp.z + bn.z * 0.03); aBreach.setText('假如：洪水位逼近堤顶……');
      W?.ui.status('<b>假如大堤失守</b>（这是历史上反复发生过的情形，不是所选年份的事）：洪水来了，水位在高出两岸的河道里一路上涨，逼近堤顶……');
    };
    const startFlush = () => {
      if (!flushYear(S.y)) { W?.ui.status(S.y < EVENTS.firstFlush ? '调水调沙从 2002 年开始。把年份拖到 2002—2015 年。' : '2016 年没有进行调水调沙。把年份拖到 2002—2015 年。'); return; }
      if (S.breach) stopDemos();
      tHint.show(false); S.pulse = 2.4; S.did.flush = true; S.moved = true; aFlush.position.set(curve.getPointAt(0.72).x + 0.03, PLAIN + 0.05, curve.getPointAt(0.72).z); aFlush.setText('人造洪峰：冲刷下游河床，泥沙送进大海').setOn(true); drawLog();
      W?.ui.status(`${Math.floor(S.y)} 年汛期以前，上中游的水库联动放水，在小浪底形成<b>人造洪峰</b>，冲刷下游河床。课本：${EVENTS.scourFrom}—${EVENTS.scourTo} 年累计把 <b>${EVENTS.scoured} 亿吨</b>淤沙送进大海，“地上河”没有再长高。`);
    };

    // ---- 侧栏：图 4.7（四个站、三个时段，当前时段亮）；下面一条大事年表（年份都核对过） ----
    const TL = [[1956, '50 年代起：中游水土保持一直在做', '#3f6a2a'], [1964, '1964 入海改走刁口河', '#5a5040'], [1976, '1976 改走清水沟', '#5a5040'], [1996, '1996 清 8 汊改道', '#5a5040'], [1999, '1999 小浪底蓄水（2001 主体完工，2009 竣工验收）', '#1f4f86'], [2002, '2002—2015 汛前调水调沙', '#1f4f86'], [2009, '2009—2015 9.66 亿吨淤沙入海', '#a8341f']];
    const drawChart = () => {
      if (!W) return;
      const c = W.chart, g = c.getContext('2d'), w = c.width, hh = c.height, cur = ERAS.indexOf(era()), B0 = 138, T0 = 36, Y = (v) => B0 - (v / 14) * (B0 - T0), COLS = ['#5f9a72', '#8a74b0', '#c07a9a'];
      g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, hh); g.textBaseline = 'middle';
      g.font = '600 12px "PingFang SC", sans-serif'; g.fillStyle = '#3a3226'; g.textAlign = 'left'; g.fillText('图 4.7 各站实测年均输沙量（亿吨/年）', 6, 10);
      g.font = '10px "PingFang SC", sans-serif'; ERAS.forEach((e, i) => { const x = 6 + i * 102; g.fillStyle = COLS[i]; g.globalAlpha = i === cur ? 1 : 0.45; g.fillRect(x, 23, 10, 6); g.fillStyle = '#5a5040'; g.fillText(e.span, x + 13, 26); }); g.globalAlpha = 1;
      g.fillStyle = '#7a705e'; g.textAlign = 'right'; for (const v of [0, 5, 10]) { g.fillText(String(v), 22, Y(v)); g.strokeStyle = 'rgba(60,50,40,0.08)'; g.beginPath(); g.moveTo(26, Y(v)); g.lineTo(w - 4, Y(v)); g.stroke(); }
      STATIONS.forEach((st, si) => { const x0 = 32 + si * 72; ERAS.forEach((e, i) => { const v = e.load[si], x = x0 + i * 20; g.globalAlpha = i === cur ? 1 : 0.35; g.fillStyle = COLS[i]; g.fillRect(x, Y(v), 17, B0 - Y(v)); if (i === cur) { g.fillStyle = '#3a3226'; g.textAlign = 'center'; g.fillText(String(v), x + 8, Y(v) - 6); } }); g.globalAlpha = 1; g.fillStyle = '#3a3226'; g.textAlign = 'center'; g.font = '11px "PingFang SC", sans-serif'; g.fillText(st, x0 + 29, B0 + 11); g.font = '10px "PingFang SC", sans-serif'; });
      const T1 = 178, X = (y) => 14 + ((y - Y0) / (Y1 - Y0)) * (w - 28);
      g.font = '600 12px "PingFang SC", sans-serif'; g.fillStyle = '#3a3226'; g.textAlign = 'left'; g.fillText('大事年表', 6, T1 - 12);
      g.strokeStyle = '#8a7a5e'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(Y0), T1 + 4); g.lineTo(X(Y1), T1 + 4); g.stroke(); g.lineWidth = 1;
      g.fillStyle = 'rgba(31,79,134,0.12)'; g.fillRect(X(2002), T1 - 2, X(2016) - X(2002), 12);          // 调水调沙的年份（2002—2015）
      g.font = '10px "PingFang SC", sans-serif'; TL.forEach(([y, t, cl], k) => { const x = X(y), yy = T1 + 16 + k * 15; g.strokeStyle = cl; g.beginPath(); g.moveTo(x, T1 + 4); g.lineTo(x, yy - 5); g.stroke(); g.fillStyle = cl; g.textAlign = x > w * 0.6 ? 'right' : 'left'; g.fillText(t, x + (x > w * 0.6 ? -3 : 3), yy); });
      g.fillStyle = '#a8341f'; g.beginPath(); g.moveTo(X(S.y), T1 + 1); g.lineTo(X(S.y) - 5, T1 - 7); g.lineTo(X(S.y) + 5, T1 - 7); g.fill(); g.textAlign = 'center'; g.fillText(String(Math.floor(S.y)), X(S.y), T1 - 13);
      g.fillStyle = '#7a705e'; g.textAlign = 'left'; g.fillText('1956', X(Y0), hh - 8); g.textAlign = 'right'; g.fillText('2016', X(Y1), hh - 8);
    };
    const drawLog = () => {
      if (!W) return;
      const rows = [], r = (b, t) => rows.push(h('div', { class: 'tl-row' }, h('b', {}, b), h('span', {}, t)));
      if (S.did.breach) r('问题：', '泥沙在下游淤下，河床越淤越高，大堤只能一次次加高，河床高出两岸地面，成了“地上悬河”；一旦决口，水从高处冲向平原和城市。课本：历史上黄河下游决口泛滥 1 500 余次，较大的改道有 20 多次（1949 年以后伏秋大汛没有决口，但悬河的风险一直在）');
      if (S.seen.has('a')) r('1956—1986 年均：', '小浪底站 13.33 亿吨/年，入海（利津站）9.78 亿吨/年：大量泥沙在下游淤下');
      if (S.seen.has('b')) r('1987—2005 年均：', '小浪底站 5.46 亿吨/年，利津站 3.33 亿吨/年：比第一时段少了一大半');
      if (S.seen.has('c')) r('2006—2016 年均：', '小浪底站 0.55 亿吨/年，利津站 1.02 亿吨/年——利津站反而比小浪底站多，下游河道被冲刷、泥沙被带走是重要原因');
      if (S.did.flush) r('效果：', `${EVENTS.scourFrom}—${EVENTS.scourTo} 年累计 ${EVENTS.scoured} 亿吨淤沙送进大海，“地上河”没有再长高，下游淤积得到缓解、防洪能力提高（河床仍高出两岸）`);
      if (S.did.delta) r('入海口：', '入海泥沙从 9.78 降到 1.02 亿吨/年（时段年均）。失去主流水沙补给的老河口（神仙沟、刁口河、清水沟一带），海岸被海浪侵蚀后退（刁口河 2010 年起有生态补水，不等于恢复为主流）；主流入海的清 8 汊河口 1996—2002 年一度后退，调水调沙以后又向海淤长。各岸段的变化不一样：下游的治理，牵动了河口');
      if (S.seen.has('c')) r('注意：', '和第一时段比，各站总体大幅减少（头道拐站第三时段比第二时段略有回升）；减少里也有降水变化、上游水库、引水用水等的影响');
      if (S.guess != null && S.did.delta) rows.push(h('div', { class: 'tl-row' }, h('small', {}, `你猜：${ASK[1][S.guess]}　实际：各岸段不一样，老河口后退，主流河口调水调沙以后仍在淤长`)));
      W.log.replaceChildren(...rows);
      W.read.innerHTML = `<b>${yr(S.y)}</b> · 图 4.7 统计时段 ${era().span}${damOn() ? ' · 小浪底水库已蓄水' : ''}${flushYear(S.y) ? ' · 有调水调沙' : ''}<br><small>泥沙多少按所在时段的年均值（图 4.7）；高度、三角洲伸缩是示意</small>`;
      if (S.seen.size === 3 && S.did.breach && S.did.flush && S.did.delta) W.ui.unlock();
    };

    // ---- 指针：鼠标停在地块上看名字 ----
    const pointer = {
      down() { return false; },
      move(rc) {
        const ht = rc.intersectObject(topMesh, false)[0];
        if (ht) { const lp = block.worldToLocal(ht.point.clone()), { s, d } = near(lp.x, lp.z), m = platMask(lp.x, lp.z), nm = d < 0.007 ? (s < DAM_S ? '黄河（中游）' : s < 0.7 ? '小浪底以下的河段' : '黄河下游：河床高出两岸') : s > DAM_S + 0.05 && d < 0.02 ? '黄河大堤' : m > 0.6 ? (gully(lp.x, lp.z) * m > 0.25 ? (veg() > 0.5 ? '冲沟：打了淤地坝、种了树' : '冲沟：水土流失') : '黄土塬') : '华北平原'; aHover.setText(nm); aHover.position.set(lp.x, lp.y + 0.01, lp.z); aHover.userData.want = 1; } else aHover.userData.want = 0;
        return false;
      },
      up() { return false; },
    };
    S.seen.add('a'); rebuild();

    return {
      group,
      card: false,
      emerge: 'flat',          // 课本的图平放在书页上，模型从它上面长出来、它慢慢淡掉
      size: { w: 0.4, d: 0.36, h: 0.09 },
      view: { elev: 27, azim: 10, lookY: 0.3, frameMargin: 0.98 },
      pointer,
      debug: { year: (y) => { S.force = true; setYear(y); }, breach: () => startBreach(), flush: () => startFlush(), state: () => ({ y: S.y, breach: !!S.breach, pulse: S.pulse, did: S.did }) },
      mount(ui) {
        const year = slider('年份（拖着往后走，也可以按“让时间走”）', { min: Y0, max: Y1, step: 0.5, value: S.y, fmt: (v) => yr(v), onInput: (v) => { S.play = false; acts.btns[0].textContent = '让时间走'; S.moved = true; setYear(v); } });
        const eraSeg = seg('跳到哪个时段（课本图 4.7）', ERAS.map((e) => e.span), (_, i) => { S.moved = true; S.force = true; setYear([1980, 2003, 2010][i]); }, { value: 0 });
        const acts = buttons([
          { text: '让时间走', onClick: () => { S.play = !S.play; acts.btns[0].textContent = S.play ? '停一下' : '让时间走'; if (S.play && S.y >= Y1) { S.force = true; setYear(Y0); } } },
          { text: '假如大堤失守（历史上的情形）', onClick: () => startBreach() },
          { text: '汛前放水调沙（2002—2015 年）', onClick: () => startFlush() },
        ]);
        const guess = seg(...ASK, (_, i) => { S.guess = i; drawLog(); }, { value: -1 });
        const reset = buttons([{ text: '重来', ghost: true, onClick: () => { ui.relock?.(); stopDemos(); Object.assign(S, { y: Y0, play: false, breach: null, pulse: 0, moved: false, guess: null, scourY: null, force: true }); S.did = { breach: false, flush: false, delta: false }; S.seen = new Set(['a']); floodM.visible = false; aBreach.setOn(false); aFlush.setOn(false); acts.btns[0].textContent = '让时间走'; guess.set(-1); setYear(Y0); rebuild(); ui.status(START); } }]);
        const chart = h('canvas', { class: 'wx-map', width: 320, height: 300 }), read = h('div', { class: 'read-out' }), log = h('div', { class: 'timeline' });
        ui.controls.append(h('div', { class: 'bar-title' }, '泥沙和河床，一年年怎么变'), chart, read, year.el, eraSeg.el, acts.el, guess.el, reset.el, note('前面的切面就是课本图 4.5：大堤夹着的河床比开封城里的地面高。河水越黄，那一段一年过的沙越多（按图 4.7）。右边那一小块是入海口的黄河三角洲。'));
        ui.data.append(h('div', { class: 'bar-title' }, '你看到了什么'), log);
        W = { ui, chart, read, log, year, eraSeg };
        ui.status(START);
        drawChart(); drawLog();
      },
      update(dt) {
        labels.forEach((l) => l.tick(dt)); stepDots(Math.min(dt, 0.05));
        if (S.play) { const ny = S.y + dt * 4; if (ny >= Y1) S.play = false; setYear(Math.min(Y1, ny)); }          // 1 秒走 4 年
        if (S.pulse > 0) { S.pulse -= dt; jet.material.opacity = 0.75 * Math.min(1, S.pulse); jet.scale.z = 1 + 0.3 * Math.sin(S.pulse * 12); buildWater(); buildFaces(); if (S.pulse <= 0) { jet.material.opacity = 0; aFlush.setOn(false); buildWater(); } }
        if (S.breach) {
          const b = S.breach, t0 = b.t; b.t += dt;
          if (t0 < 1.2 && b.t >= 1.2) { aBreach.setText('假如决口：水从高处冲向开封城'); W?.ui.status('<b>决口了！</b>河床本来就比城里高，水一下子从冲开的口子冲向平原和城市。课本：历史上黄河下游决口泛滥 <b>1 500 余次</b>，较大的改道有 <b>20 多次</b>，所以黄河下游以“易淤、易决、易徙”闻名。（1949 年以后，靠加高加固大堤和防汛，伏秋大汛没有决口。）'); }
          aBreach.setOn(true);
          if (b.t < 7) { const r = 0.15 * sm(1.2, 5.5, b.t), fade = b.t < 5.5 ? 1 : 1 - (b.t - 5.5) / 1.5 * 0.4; drawFlood(r, fade); shapeTop(); buildFaces(); buildWater(); }
          if (b.t > 9) { S.breach = null; floodM.visible = false; aBreach.setOn(false); rebuild(); W?.ui.status('这就是“地上悬河”的危险：河床越淤越高，大堤只能越修越高，一旦失守，后果严重。拖着年份往后走，看看治理换来了什么。'); }
        }
      },
    };
  },
};
const START = '这是 1956 年的黄河：后面是黄土高原（中游），前面是华北平原上的下游，切面就是课本图 4.5 的“地上河”；右边是入海口。先按一次<b>假如大堤失守</b>看看问题有多严重，再拖<b>年份</b>往后走。';
