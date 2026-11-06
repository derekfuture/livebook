// 高中地理 选择性必修2 第四章第一节 流域内协调发展 · 黄河的调沙减淤（课本第 61–64 页，图 4.5 黄河下游的“地上河”、图 4.6 水土保持、图 4.7 主要水文站年均输沙量、图 4.9 小浪底放水调沙）。
//
// 一个问题：黄河下游的河床为什么会高出两岸的城市？要让“地上河”不再长高，该在下游加高大堤，还是到中游去治理？
// 课本的图就是模型：一段立在书页上的黄河流域（示意）——后面是千沟万壑的黄土高原（中游，主要侵蚀区），中间是小浪底，
// 前面是华北平原上被大堤夹着的下游河道；地块前面切开，切面就是图 4.5 那张“地上河”剖面：河床比开封城高，铁塔比洪水位还低。
// 学生亲手做的：
//   1. 让 10 年过去：一粒粒泥沙从黄土高原的沟里冲进河，到下游慢慢淤下来，河床一年年抬高；水位逼近堤顶时，只能加高大堤。
//   2. 到中游治理：生物、耕作、工程三类水土保持措施（课本图 4.6），黄土高原变绿、修起梯田和淤地坝，河里的沙一下子少了。
//   3. 建小浪底水库、汛前调水调沙：人造洪峰把下游河床冲刷下去，淤沙送进大海。
//   侧栏：三处一年各有多少沙（和课本图 4.7 的数比），下游河床的高度一年年怎么变。上游的选择，结果出在下游。
// 数据：kit/basin.js（tools/geo/basin_check.mjs 核对课本图 4.7）。教学示意：流域的形状、方向、竖直比例都是示意。
import * as THREE from 'three';
import { seg, buttons, note } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { h } from '../ui/Panel.js';
import { airLabel, faceLabel, groundLabel, noteBadge } from './kit/labels.js';
import { MEASURES, RES_CAP, loads, run, frameAt, configKey, configName, leveeResult } from './kit/basin.js';

const XL = -0.19, XR = 0.19, ZD = 0.1, NX = 170, NZ = 90, PLAIN = 0.01, KM = 0.0016;          // 地块；平原（开封城里地面）的高度；1 米在画面上多高（示意，夸大了）
const DAM_S = 0.47, BED0 = 7.5, LEVEE0 = 14, FLOOD = 3.5;          // 小浪底在河的哪一段；开始时河床比开封城里的地面高 7 米多（课本图 4.5：＞7 米）、堤顶高 14 米；洪水位比河床高约 3.5 米（示意）
const ASK = ['先猜一下（可以不猜）：要让下游的“地上河”不再长高，最根本的办法是——', ['不断加高下游的大堤', '在中游黄土高原保持水土', '把下游的河道挖深']];
const rnd = (() => { let s = 53; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export default {
  id: 'basin',
  fig: '图4.5',
  title: '黄河的调沙减淤',
  flow: 'explore',
  ask: '黄河下游的河床为什么会高出两岸的城市，成了“地上悬河”？要让它不再长高，是在下游加高大堤，还是到中游去治理？',
  need: '先什么都不做，让几个 10 年过去，看下游的河床和大堤；再到中游做水土保持，建小浪底水库、调水调沙，比一比',
  conclusion: {
    page: 66,
    quote: '含沙量大是黄河最突出的水文特征。黄土高原水土流失严重，导致黄河挟带泥沙数量之多，居世界大河首位。黄河下游流经华北平原，坡度变小，流速缓慢，泥沙沉积使下游河床不断抬高……为了防治水害，两岸不断加高大堤，使得黄河下游河床高出两岸地面，成为世界上著名的“地上悬河”。黄河沙患的解决，需要流域内综合协调：侵蚀区需要减少入河泥沙量，堆积区需要减少河道淤积。中游的黄土高原是黄河流域的主要侵蚀区，水土保持是减少入黄泥沙的根本措施。',
    why: '下游河床抬高的泥沙，主要来自中游的黄土高原（按课本图 4.7 的 1956—1986 年，约九成）。只在下游加高大堤，沙照样年年淤，河床和大堤一起越长越高，“悬”得越来越危险。在中游做水土保持（生物、耕作、工程措施结合），从源头减少入黄泥沙；再用小浪底水库拦沙，汛前调水调沙，人造洪峰冲刷下游河床，把淤沙送进大海，有助于下游减淤，但不能保证每个时段都冲淤平衡。本模型固定水文条件，未模拟真实调水调沙中的库区排沙、减淤，不能预测水库寿命；100 亿吨仅是假设拦沙质量容量，河床变化须按所运行时段判断。一个地方的问题，要在整个流域里找原因、分工解决。',
    src: '课本第 61–64 页 · 第四章 第一节 流域内协调发展',
  },

  create({ tag }) {
    const group = new THREE.Group(), block = new THREE.Group(); group.add(block);
    const S = { bio: false, farm: false, eng: false, dam: false, flush: false, res: 0, year: 0, bed: BED0, levee: LEVEE0, hist: [{ y: 0, bed: BED0, levee: LEVEE0 }], runs: [], anim: null, raised: 0, moved: false, guess: null, pulse: 0 };
    let W = null;
    const L = () => S.anim ? frameAt(S.anim.result, S.anim.t * 10).loads : loads(S, S.res);

    // ---- 河的走向（俯视）：从后面的黄土高原流出来，过小浪底，到前面的平原上，一直流到地块前面的切面 ----
    const curve = new THREE.CatmullRomCurve3([[-0.2, -0.085], [-0.13, -0.06], [-0.07, -0.05], [-0.025, -0.022], [0.012, -0.004], [0.05, 0.02], [0.07, 0.06], [0.074, 0.12]].map(([x, z]) => new THREE.Vector3(x, 0, z)));
    const NS = 260, SP = curve.getSpacedPoints(NS);
    const near = (x, z) => { let bi = 0, bd = 1e9; for (let i = 0; i <= NS; i += 2) { const p = SP[i], d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; bi = i; } } for (let i = Math.max(0, bi - 2); i <= Math.min(NS, bi + 2); i++) { const p = SP[i], d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; bi = i; } } return { s: bi / NS, d: Math.sqrt(bd) }; };
    const sAtZ = (z) => { for (let i = 0; i <= NS; i++) if (SP[i].z >= z) return i / NS; return 1; };
    const FRONT_X = curve.getPointAt(sAtZ(ZD)).x;

    // ---- 地面：后面高（黄土高原、沟谷纵横），前面低（华北平原）；河在高原上切出峡谷，到平原上被两道大堤夹着 ----
    const platMask = (x, z) => 1 - sm(-0.02, 0.06, x * 0.8 + z * 0.9 + 0.02);
    const gully = (x, z) => { const a = x * 80 + z * 34 + 2.4 * Math.sin(z * 30 + x * 11), b = x * 31 - z * 77 + 1.7 * Math.sin(x * 40); return 0.6 * (1 - Math.abs(Math.sin(a))) ** 7 + 0.5 * (1 - Math.abs(Math.sin(b))) ** 9; };          // 一道道冲沟
    const bedY = () => PLAIN + S.bed * KM, leveeY = () => PLAIN + S.levee * KM;
    const height = (x, z) => {
      const m = platMask(x, z), g = gully(x, z) * m;
      let hgt = PLAIN + m * (0.042 + 0.004 * Math.sin(x * 47) * Math.sin(z * 39)) - g * 0.013;
      const { s, d } = near(x, z);
      if (s < DAM_S + 0.04) { const base = 0.036 - (0.036 - 0.019) * (s / DAM_S); hgt = Math.min(hgt, base + Math.max(0, d - 0.005) * 1.4); }          // 峡谷：河床从上游往下游一路降低
      else { const w = sm(DAM_S + 0.02, DAM_S + 0.12, s), lv = d < 0.0065 ? bedY() : d < 0.0115 ? leveeY() : d < 0.02 ? leveeY() - (leveeY() - PLAIN) * ((d - 0.0115) / 0.0085) : PLAIN; hgt = hgt * (1 - w) + Math.max(PLAIN, lv) * w; if (d > 0.02) hgt = Math.max(hgt, PLAIN); }          // 平原上：河床在中间、两边是大堤、堤外是城里的地面
      return hgt;
    };
    const topGeo = new THREE.PlaneGeometry(XR - XL, 2 * ZD, NX, NZ); topGeo.rotateX(-Math.PI / 2);
    const tCol = new Float32Array(topGeo.attributes.position.count * 3); topGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
    const grain = canvasTex(256, 256, (g, w) => { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, w); for (let i = 0; i < 2600; i++) { const v = 150 + Math.random() * 100; g.fillStyle = `rgba(${v},${v},${v},${0.2 + Math.random() * 0.35})`; g.fillRect(Math.random() * w, Math.random() * w, 1.6, 1.6); } }, { repeat: [6, 3] });
    const topMesh = new THREE.Mesh(topGeo, new THREE.MeshLambertMaterial({ vertexColors: true, map: grain })); block.add(topMesh);
    const LOESS = new THREE.Color(0xc9a46a), LOESS_D = new THREE.Color(0xa77d48), GREEN = new THREE.Color(0x7fa356), FIELD = new THREE.Color(0xb7b86e), PLAINC = new THREE.Color(0xa9c27e), LEVEE = new THREE.Color(0x9c8a6a), tc = new THREE.Color();
    const paint = (x, z, hgt) => {
      const m = platMask(x, z), g = gully(x, z) * m, { s, d } = near(x, z);
      if (m > 0.5) {
        tc.copy(g > 0.25 ? LOESS_D : LOESS);
        if (S.farm && g < 0.25) tc.lerp(FIELD, 0.55).multiplyScalar(0.92 + 0.08 * Math.sin(hgt * 2600));          // 沿等高线耕作：田面上一道道顺着等高线的垄
        if (S.eng && g > 0.12) tc.multiplyScalar(0.9 + 0.12 * Math.sign(Math.sin(hgt * 1900)));          // 梯田：坡上一级级台阶
        if (S.bio) tc.lerp(GREEN, g > 0.2 ? 0.75 : 0.45);
      } else tc.copy(PLAINC);
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
      const wl = bedY() + 0.0028, x0 = FRONT_X - 0.0065, x1 = FRONT_X + 0.0065, zf = ZD + 0.0004;
      waterFace.geometry.dispose(); waterFace.geometry = new THREE.BufferGeometry(); waterFace.geometry.setAttribute('position', new THREE.Float32BufferAttribute([x0, bedY(), zf, x1, bedY(), zf, x1, wl, zf, x0, bedY(), zf, x1, wl, zf, x0, wl, zf], 3));
    };

    // ---- 河水：一条带子，颜色编码年输沙量，不代表实际清浑 ----
    const waterGeo = new THREE.BufferGeometry(), wCol = [], WN = 200;
    const water = new THREE.Mesh(waterGeo, new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.92 })); water.raycast = () => {}; block.add(water);
    const MUDDY = new THREE.Color(0xb08a4a), CLEAR = new THREE.Color(0x6f9ab8);
    const conc = (s) => { const l = L(); return Math.min(1, (s < DAM_S ? l.inflow * (0.35 + 0.65 * s / DAM_S) : S.dam ? l.out : l.inflow) / 12); };          // 年输沙量的颜色编码（0–1，非浓度）：中游一路汇进泥沙；水库下面看下泄的；调沙过程用粒子加速提示，不改变年度配色
    const buildWater = () => {
      const P = [], C = [], I = [], up = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i <= WN; i++) {
        const s = i / WN, p = curve.getPointAt(Math.min(1, s)), t = curve.getTangentAt(Math.min(1, s)), n = new THREE.Vector3().crossVectors(t, up).normalize();
        if (p.z > ZD) { p.z = ZD; }
        const w = s < DAM_S ? 0.0035 + 0.002 * s : 0.0062, base = s < DAM_S + 0.04 ? 0.036 - (0.036 - 0.019) * (Math.min(s, DAM_S) / DAM_S) : bedY(), y = Math.max(base, s > DAM_S + 0.04 ? bedY() : base) + 0.0026;
        P.push(p.x + n.x * w, y, p.z + n.z * w, p.x - n.x * w, y, p.z - n.z * w);
        tc.copy(CLEAR).lerp(MUDDY, conc(s)); C.push(tc.r, tc.g, tc.b, tc.r, tc.g, tc.b);
        if (i) { const a = 2 * i - 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      }
      waterGeo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); waterGeo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); waterGeo.setIndex(I); waterGeo.computeVertexNormals();
      waterFace.material.color.copy(CLEAR).lerp(MUDDY, conc(1));
    };
    // ---- 小浪底：一道坝，坝后一片水库 ----
    const damP = curve.getPointAt(DAM_S), damT = curve.getTangentAt(DAM_S);
    const dam = new THREE.Group(); dam.position.set(damP.x, 0, damP.z); dam.rotation.y = Math.atan2(-damT.z, damT.x) + Math.PI / 2; block.add(dam);
    { const wall = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.024, 0.0045), new THREE.MeshLambertMaterial({ color: 0xd4d0c6 })); wall.position.y = 0.028; dam.add(wall); for (const dx of [-0.006, 0, 0.006]) { const gate = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.006, 0.0048), new THREE.MeshLambertMaterial({ color: 0x6a6f78 })); gate.position.set(dx, 0.022, 0.0002); dam.add(gate); } }
    const lakeLevel = 0.036, lakePts = []; for (let i = Math.floor(NS * 0.26); i <= Math.floor(NS * DAM_S); i += 3) lakePts.push(SP[i]);
    const lake = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshLambertMaterial({ color: 0x7f9fae, transparent: true, opacity: 0.9 })); lake.raycast = () => {}; block.add(lake);
    { const P = [], up = new THREE.Vector3(0, 1, 0); for (let k = 0; k < lakePts.length - 1; k++) { const a = lakePts[k], b = lakePts[k + 1], t = new THREE.Vector3().subVectors(b, a).normalize(), n = new THREE.Vector3().crossVectors(t, up).normalize(), wa = 0.006 + 0.02 * (k / lakePts.length), wb = 0.006 + 0.02 * ((k + 1) / lakePts.length); P.push(a.x + n.x * wa, lakeLevel, a.z + n.z * wa, b.x + n.x * wb, lakeLevel, b.z + n.z * wb, b.x - n.x * wb, lakeLevel, b.z - n.z * wb, a.x + n.x * wa, lakeLevel, a.z + n.z * wa, b.x - n.x * wb, lakeLevel, b.z - n.z * wb, a.x - n.x * wa, lakeLevel, a.z - n.z * wa); } lake.geometry.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); lake.geometry.computeVertexNormals(); }          // 坝后的水面：比峡谷里的河宽，越靠近坝越宽；被两岸更高的地面挡住的地方自然看不到

    // ---- 黄土高原上的措施：树和草（生物）、淤地坝（工程） ----
    const trees = new THREE.InstancedMesh(new THREE.ConeGeometry(0.0022, 0.0062, 6).translate(0, 0.0031, 0), new THREE.MeshLambertMaterial({ color: 0x4f7f3a }), 420); trees.raycast = () => {}; block.add(trees);
    const checks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.008, 0.003, 0.0018).translate(0, 0.0015, 0), new THREE.MeshLambertMaterial({ color: 0x8c7650 }), 40); checks.raycast = () => {}; block.add(checks);
    { const m4 = new THREE.Matrix4(); let n = 0, k = 0, tries = 0; while (n < 420 && tries++ < 8000) { const x = XL + rnd() * (XR - XL), z = -ZD + rnd() * 2 * ZD; if (platMask(x, z) < 0.8 || near(x, z).d < 0.01) continue; m4.compose(new THREE.Vector3(x, height(x, z) - 0.0004, z), new THREE.Quaternion(), new THREE.Vector3(1, 0.8 + rnd() * 0.5, 1)); trees.setMatrixAt(n++, m4); }
      tries = 0; while (k < 40 && tries++ < 20000) { const x = XL + 0.01 + rnd() * (XR - XL - 0.02), z = -ZD + 0.01 + rnd() * (2 * ZD - 0.02); if (platMask(x, z) < 0.85 || gully(x, z) < 0.5 || near(x, z).d < 0.012) continue; m4.compose(new THREE.Vector3(x, height(x, z) - 0.0005, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(80, 34)), new THREE.Vector3(1, 1, 1)); checks.setMatrixAt(k++, m4); } checks.count = k; }          // 淤地坝：横着打在冲沟里

    // ---- 开封城：几片房子和一座铁塔，在大堤外面低处 ----
    const city = new THREE.Group(); block.add(city);
    const CITY = [FRONT_X + 0.06, ZD - 0.03];
    for (let i = 0; i < 26; i++) { const x = CITY[0] + (rnd() - 0.5) * 0.07, z = CITY[1] + (rnd() - 0.5) * 0.05; if (Math.abs(x - FRONT_X) < 0.03) continue; const w = 0.004 + rnd() * 0.003, hh = 0.003 + rnd() * 0.004, b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, w * 1.3), new THREE.MeshLambertMaterial({ color: [0xe9e2d4, 0xd8cdb8, 0xc9b9a0][i % 3] })); b.position.set(x, PLAIN + hh / 2, z); city.add(b); }
    const pagoda = new THREE.Group(); for (let k = 0; k < 7; k++) { const r = 0.0034 - k * 0.00028, seg2 = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r, 0.0034, 8), new THREE.MeshLambertMaterial({ color: 0x7a5a48 })); seg2.position.y = 0.0017 + k * 0.0034; pagoda.add(seg2); const eave = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.25, r * 1.25, 0.0006, 8), new THREE.MeshLambertMaterial({ color: 0x5a4034 })); eave.position.y = 0.0034 * (k + 1); pagoda.add(eave); }
    pagoda.position.set(FRONT_X + 0.045, PLAIN, ZD - 0.012); block.add(pagoda);          // 开封铁塔：不按比例，只保留课本图 4.5 里的高低关系——塔比大堤、洪水位都高
    pagoda.scale.y = ((LEVEE0 + 8) * KM) / (7 * 0.0034);

    // ---- 一粒粒泥沙：从高原的沟里冲进河，顺流而下；到下游有的淤下、有的流走 ----
    const dotTex = canvasTex(32, 32, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const NP = 360, ppos = new Float32Array(NP * 3), P = Array.from({ length: NP }, () => ({ on: false }));
    const dots = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(ppos, 3)), new THREE.PointsMaterial({ size: 0.022, map: dotTex, color: 0x8a5e2a, transparent: true, depthWrite: false })); dots.raycast = () => {}; dots.renderOrder = 7; block.add(dots);
    let spawnAcc = 0;
    const stepDots = (dt) => {
      const l = L(); spawnAcc += dt * l.inflow * 2.2;
      while (spawnAcc > 1) { spawnAcc -= 1; const q = P.find((p) => !p.on); if (!q) break; const s0 = rnd() < l.up / l.inflow ? 0 : 0.05 + rnd() * (DAM_S - 0.1); Object.assign(q, { on: true, s: s0, off: (rnd() - 0.5) * 0.007, fate: rnd() }); }
      for (let i = 0; i < NP; i++) {
        const p = P[i]; if (!p.on) { ppos.set([0, -1, 0], i * 3); continue; }
        p.s += dt * (S.pulse > 0 && p.s > DAM_S ? 0.22 : 0.07);
        if (S.dam && p.s > DAM_S - 0.02 && p.s < DAM_S && p.fate < l.trapped / l.inflow) { p.on = false; continue; }          // 小浪底水库拦下大部分沙（淤满了就拦不住）
        const keep = l.out > 0 ? Math.min(1, l.sea / l.out) : 1;
        if (p.s > 0.75 && p.fate > keep && p.s > 0.75 + (p.fate - keep) * 0.8) { p.on = false; continue; }          // 按当年下泄与入海之比示意河道沉积
        if (p.s >= 1) { p.on = false; continue; }
        const q = curve.getPointAt(p.s), t = curve.getTangentAt(p.s), base = p.s < DAM_S + 0.04 ? 0.036 - (0.036 - 0.019) * (Math.min(p.s, DAM_S) / DAM_S) : bedY();
        if (q.z > ZD) { p.on = false; continue; }
        ppos.set([q.x - t.z * p.off, base + 0.0032, q.z + t.x * p.off], i * 3);
      }
      dots.geometry.attributes.position.needsUpdate = true;
    };

    // ---- 画面里的字 ----
    const aPlat = airLabel(block, '黄土高原（中游）', { x: -0.12, y: 0.07, z: -0.03, h: 0.0095, color: '#6a4a1e' });
    const aDam = airLabel(block, '小浪底水库', { x: damP.x, y: 0.058, z: damP.z, h: 0.0085, color: '#2c3245', dim: 0 });
    const aPlain = airLabel(block, '华北平原（下游）', { x: 0.14, y: 0.03, z: -0.05, h: 0.0085, color: '#3a4a2a' });
    const aKaifeng = airLabel(block, '开封', { x: CITY[0] + 0.012, y: PLAIN + 0.02, z: CITY[1] - 0.006, h: 0.0085, color: '#2c3245' });
    const aBed = airLabel(block, '', { h: 0.0085, color: '#a8341f' }), aDanger = airLabel(block, '', { h: 0.0095, color: '#b03a2a', icon: 'warn', dim: 0 });
    const aErode = airLabel(block, '', { x: -0.06, y: 0.06, z: -0.075, h: 0.0078, color: '#6a4a1e' });
    const fWater = faceLabel(block, '黄河', { x: FRONT_X, y: PLAIN + 0.004, z: ZD, h: 0.0055, color: '#ffffff', stroke: 'rgba(40,30,20,0.6)' });
    faceLabel(block, '开封城里的地面', { x: CITY[0] + 0.03, y: PLAIN - 0.004, z: ZD, h: 0.0055, color: '#ffffff', stroke: 'rgba(40,30,20,0.6)' });
    const measureM = new THREE.LineBasicMaterial({ color: 0xa8341f }), measure = new THREE.Line(new THREE.BufferGeometry(), measureM); measure.raycast = () => {}; block.add(measure);          // 切面上一道红线：河床比城里地面高多少
    const tHint = tag('<span>先什么都不做</span><small>按“让 10 年过去”，看下游的河床</small>', 'hint');
    noteBadge(tag, '教学示意：流域的形状、方向、竖直比例都是示意；每年的泥沙量参照课本图 4.7，措施各减多少是示意').loc(block, XL + 0.012, -0.002, ZD + 0.012);
    const aHover = airLabel(block, '', { h: 0.0078, color: '#3a3226', dim: 0 });
    const labels = [aPlat, aDam, aPlain, aKaifeng, aBed, aDanger, aErode, aHover];

    // ---- 摆好 ----
    const layout = () => {
      const l = L(); dam.visible = lake.visible = S.dam; aDam.setOn(S.dam); trees.visible = S.bio; checks.visible = S.eng;
      buildWater();
      const fx = FRONT_X - 0.016; measure.geometry.dispose(); measure.geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(fx, PLAIN, ZD + 0.0008), new THREE.Vector3(fx, bedY(), ZD + 0.0008), new THREE.Vector3(fx - 0.003, bedY(), ZD + 0.0008), new THREE.Vector3(fx + 0.003, bedY(), ZD + 0.0008), new THREE.Vector3(fx, bedY(), ZD + 0.0008), new THREE.Vector3(fx, PLAIN, ZD + 0.0008), new THREE.Vector3(fx - 0.003, PLAIN, ZD + 0.0008), new THREE.Vector3(fx + 0.003, PLAIN, ZD + 0.0008)]);
      aBed.position.set(fx - 0.03, (PLAIN + bedY()) / 2 + 0.004, ZD + 0.002); aBed.setText(`模拟河床高 ${S.bed.toFixed(1)} 米`);
      const margin = S.levee - (S.bed + FLOOD); aDanger.position.set(FRONT_X, leveeY() + 0.012, ZD - 0.01); aDanger.setText('洪水位快漫过堤顶：决口危险').setOn(margin < 0.5);
      aErode.setText(`中游冲进河里的沙：一年约 ${l.mid.toFixed(1)} 亿吨`);
      tHint.loc(block, 0.11, 0.06, ZD * 0.6).show(!S.moved);
      drawChart(); drawLog();
    };
    const rebuild = () => { shapeTop(); buildFaces(); layout(); };

    // ---- 时间：10 年一步，河床慢慢抬高或者被冲低 ----
    // 一开始就把这 10 年按当时的配置算好（kit 的 run），动画只是把结果播出来；播的时候不许换措施，记账也按这个快照
    const passDecade = () => {
      if (S.anim) return; const cfg = { bio: S.bio, farm: S.farm, eng: S.eng, dam: S.dam, flush: S.flush }, R0 = run(cfg, { bed: S.bed, res: S.res }, 10);
      S.anim = { t: 0, result: R0, res1: R0.res, snap: { cfg, key: configKey(cfg), name: cfgName(), first: R0.first, last: R0.last, from: S.bed, to: R0.bed } }; S.moved = true;
      if (S.dam && S.flush) S.pulse = 2.4;          // 汛前放水调沙：人造洪峰
    };
    const finishDecade = () => {
      const a = S.anim, sn = a.snap; S.bed = sn.to; S.res = a.res1; S.anim = null; S.year += 10; S.hist.push({ y: S.year, bed: S.bed, levee: S.levee, cfg: sn.name });
      const d = sn.to - sn.from; S.runs.push({ cfg: sn.name, key: sn.key, options: sn.cfg, d, start: S.year - 9, end: S.year, l: sn.first, last: sn.last, filled: sn.cfg.dam && sn.last.full });
      const margin = S.levee - (S.bed + FLOOD), filledNow = sn.cfg.dam && sn.last.full;
      W?.ui.status(`${filledNow ? `本段结束时<b>模型已达拦沙质量上限</b>，此后不再拦沙。` : ''}${d > 0.05 ? `又过了 10 年：下游淤下来的沙让河床抬高了 <b>${d.toFixed(1)} 米</b>。` : d < -0.05 ? `又过了 10 年：下游河床被冲低了 <b>${(-d).toFixed(1)} 米</b>。` : '又过了 10 年：下游河床基本没有变化，冲淤大致平衡。'}${margin < 0.5 ? '洪水位逼近堤顶了：要么<b>加高大堤</b>，要么想办法让河里的沙少一点。' : ''}`);
      layout();
    };
    const cfgName = () => configName(S);

    // ---- 侧栏：三处一年各有多少沙（和图 4.7 比）；下游河床、大堤的高度一年年怎么变 ----
    const drawChart = () => {
      if (!W) return;
      const c = W.chart, g = c.getContext('2d'), w = c.width, hh = c.height, l = L(), bars = [['进入水库一带', l.inflow, null], ['小浪底站', l.out, [13.33, 5.46, 0.55]], ['入海（利津站）', l.sea, [9.78, 3.33, 1.02]]], B0 = 128, T0 = 44, Y = (v) => B0 - (v / 14) * (B0 - T0);          // 图 4.7 的实测是“小浪底站”（水库下面）和“利津站”的年均输沙量，短横线就挂在这两栏
      g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, hh); g.textBaseline = 'middle';
      g.font = '600 12px "PingFang SC", sans-serif'; g.fillStyle = '#3a3226'; g.textAlign = 'left'; g.fillText('一年里的泥沙（亿吨）', 6, 10);
      g.font = '11px "PingFang SC", sans-serif'; g.fillStyle = '#7a705e'; g.textAlign = 'right'; for (const v of [0, 5, 10]) { g.fillText(String(v), 28, Y(v)); g.strokeStyle = 'rgba(60,50,40,0.08)'; g.beginPath(); g.moveTo(32, Y(v)); g.lineTo(w - 6, Y(v)); g.stroke(); }
      bars.forEach(([name, v, ref], i) => {
        const x = 46 + i * 92; g.fillStyle = '#b08a4a'; g.fillRect(x, Y(v), 34, B0 - Y(v)); g.fillStyle = '#3a3226'; g.textAlign = 'center'; g.fillText(v.toFixed(2), x + 17, Y(v) - 7); g.fillText(name, x + 30, B0 + 12);
        if (ref) ref.forEach((r, k) => { g.strokeStyle = ['#5f9a72', '#8a74b0', '#c07a9a'][k]; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 40, Y(r)); g.lineTo(x + 56, Y(r)); g.stroke(); g.lineWidth = 1; });
      });
      g.font = '10px "PingFang SC", sans-serif'; g.textAlign = 'left'; g.fillStyle = '#7a705e'; g.fillText('短横线：图 4.7 实测', 6, 27); if (S.dam) { g.textAlign = 'right'; g.fillStyle = S.res >= RES_CAP ? '#b03a2a' : '#5a5040'; g.fillText(`库存占上限 ${((S.res / RES_CAP) * 100).toFixed(0)}%`, w - 6, 10); g.textAlign = 'left'; g.fillStyle = '#7a705e'; } [['1956—1986', '#5f9a72'], ['1987—2005', '#8a74b0'], ['2006—2016', '#c07a9a']].forEach(([t, cl], k) => { const x = 100 + k * 72; g.fillStyle = cl; g.fillRect(x, 26, 10, 2); g.fillStyle = '#7a705e'; g.fillText(t, x + 13, 27); });
      // 下面：河床、堤顶、洪水位一年年的高度（比城里地面高几米）
      const T1 = 182, B1 = hh - 18, ys = S.hist.map((p) => p.y), ymax = Math.max(40, ...ys, S.year + 10), X = (y) => 40 + (y / ymax) * (w - 50), Y2 = (m) => B1 - (m / 24) * (B1 - T1);
      g.font = '600 12px "PingFang SC", sans-serif'; g.fillStyle = '#3a3226'; g.textAlign = 'left'; g.fillText('模拟断面：比城里地面高几米', 6, T1 - 12);
      g.font = '11px "PingFang SC", sans-serif'; g.fillStyle = '#7a705e'; g.textAlign = 'right'; for (const m of [0, 5, 10, 15, 20]) { g.fillText(String(m), 34, Y2(m)); g.strokeStyle = 'rgba(60,50,40,0.08)'; g.beginPath(); g.moveTo(38, Y2(m)); g.lineTo(w - 6, Y2(m)); g.stroke(); }
      const line = (key, add, cl, dash) => { g.strokeStyle = cl; g.lineWidth = 2; g.setLineDash(dash); g.beginPath(); S.hist.forEach((p, i) => { const v = p[key] + add; i ? g.lineTo(X(p.y), Y2(v)) : g.moveTo(X(p.y), Y2(v)); }); if (S.anim) g.lineTo(X(S.year + S.anim.t * 10), Y2((key === 'bed' ? S.bed : S.levee) + add)); g.stroke(); g.setLineDash([]); };
      line('levee', 0, '#6a5a3a', []); line('bed', FLOOD, '#5f86b8', [4, 3]); line('bed', 0, '#a8341f', []);
      g.textAlign = 'left'; g.font = '10px "PingFang SC", sans-serif'; [['堤顶', '#6a5a3a'], ['洪水位', '#5f86b8'], ['河床', '#a8341f']].forEach(([t, cl], k) => { g.fillStyle = cl; g.fillText(t, 44 + k * 50, B1 + 10); }); g.fillStyle = '#7a705e'; g.textAlign = 'right'; g.fillText(`第 ${S.anim ? (S.year + S.anim.t * 10).toFixed(1) : S.year} 年`, w - 6, B1 + 10);
    };
    const drawLog = () => {
      if (!W) return;
      const rows = [], r = (b, t) => rows.push(h('div', { class: 'tl-row' }, h('b', {}, b), h('span', {}, t)));
      const seen = new Map(); for (const x of S.runs) seen.set(x.key, x);
      for (const x of seen.values()) r(`${x.cfg}：`, `第 ${x.start}—${x.end} 年：首年入库一带 ${x.l.inflow.toFixed(1)}、入海 ${x.l.sea.toFixed(1)} 亿吨；末年入库一带 ${x.last.inflow.toFixed(1)}、入海 ${x.last.sea.toFixed(1)} 亿吨；这 10 年里下游河床${x.d > 0.05 ? `抬高 ${x.d.toFixed(1)} 米` : x.d < -0.05 ? `冲低 ${(-x.d).toFixed(1)} 米` : '基本不变'}${x.filled ? '（本段已达到假设质量上限；达到上限的当年只拦剩余容量，随后不再拦沙）' : ''}`);
      if (S.raised) r('加高大堤：', `加高了 ${S.raised} 次。加堤不减少河里的沙，能否挡住模拟洪水须比较堤顶与洪水位；只要下游还在淤，河床和大堤就一起越长越高——“地上悬河”越悬越高`);
      const base = [...seen.values()].find((x) => x.cfg === '中游不治理'), best = [...seen.values()].find((x) => x.options.bio && x.options.farm && x.options.eng && x.options.dam && x.options.flush);
      const damOnly = [...seen.values()].find((x) => x.cfg === '中游不治理，小浪底调水调沙' || x.cfg === '中游不治理，小浪底只拦沙');
      if (damOnly && damOnly.filled) r('只修水库：', '中游不治理，进库的沙太多，在未模拟库区排沙的条件下，库存达到假设质量上限后，下游又开始淤：水库替代不了中游的水土保持');
      if (base && best) r('比一比：', `中游保持水土可从源头减沙。三类措施加调沙的最近一段（第 ${best.start}—${best.end} 年），模拟河床${best.d > 0.05 ? '仍在抬高' : best.d < -0.05 ? '被冲低' : '基本不变'}；这一时段的结果不能外推为长期不再淤积。模型未模拟库区排沙，不能预测实际水库寿命。`);
      if (S.guess != null && base && best) rows.push(h('div', { class: 'tl-row' }, h('small', {}, `你猜：${ASK[1][S.guess]}　实际：在中游黄土高原保持水土是根本措施`)));
      W.log.replaceChildren(...rows);
      W.read.innerHTML = `第 <b>${S.anim ? (S.year + S.anim.t * 10).toFixed(1) : S.year}</b> 年${S.anim ? `（年输沙量：第 ${S.year + frameAt(S.anim.result, S.anim.t * 10).year} 年）` : "（年输沙量：下一年预估）"} · ${cfgName()}${S.dam || S.res > 0 ? `（库存占上限 ${((S.res / RES_CAP) * 100).toFixed(0)}%）` : ''}<br>模拟断面：河床比城里地面高 <b>${S.bed.toFixed(1)} 米</b>，堤顶高 ${S.levee.toFixed(0)} 米<br><small>假设拦沙质量容量 100 亿吨（不是体积库容）；初始河床 7.5 米、堤顶 14 米、洪水深 3.5 米均为模拟断面参数。固定年水量、年内水文过程及河道条件，以假设输沙能力判冲淤；未模拟库区排沙，不能预测实际寿命</small>`;
      if (base && seen.size >= 3 && [...seen.values()].some((x) => x.options.dam)) W.ui.unlock();
    };

    // ---- 指针：鼠标停在地块上看名字 ----
    const pointer = {
      down() { return false; },
      move(rc) {
        const ht = rc.intersectObject(topMesh, false)[0];
        if (ht) { const lp = block.worldToLocal(ht.point.clone()), { s, d } = near(lp.x, lp.z), m = platMask(lp.x, lp.z), nm = d < 0.007 ? (s < DAM_S ? '黄河（中游）' : '黄河下游：河床高出两岸') : s > DAM_S + 0.05 && d < 0.02 ? '黄河大堤' : m > 0.6 ? (gully(lp.x, lp.z) * m > 0.25 ? '冲沟：水土流失' : '黄土塬') : '华北平原'; aHover.setText(nm); aHover.position.set(lp.x, lp.y + 0.01, lp.z); aHover.userData.want = 1; } else aHover.userData.want = 0;
        return false;
      },
      up() { return false; },
    };
    rebuild();

    return {
      group,
      card: false,
      emerge: 'flat',          // 课本的图平放在书页上，模型从它上面长出来、它慢慢淡掉
      size: { w: 0.4, d: 0.22, h: 0.09 },
      view: { elev: 30, azim: 16, lookY: 0.32, frameMargin: 1.06 },
      pointer,
      debug: { state: () => ({ ...S, currentLoads: L() }), set: (o) => { Object.assign(S, o); rebuild(); }, decade: () => { passDecade(); if (S.anim) S.anim.t = 0.999; } },
      mount(ui) {
        const tog = (k, label) => ({ text: label, onClick: () => { if (S.anim) return; S[k] = !S[k];          // 这 10 年还在走的时候不许换措施
 mBtns.btns[['bio', 'farm', 'eng'].indexOf(k)].classList.toggle('on', S[k]); rebuild(); ui.status(S[k] ? `中游实施了<b>${MEASURES[k].name}</b>——${MEASURES[k].where}：${MEASURES[k].how}。入黄泥沙少了，让 10 年过去看看下游。` : '撤掉了这一类措施。'); } });
        const mBtns = buttons([tog('bio', '生物措施（封山育林、退耕还林还草）'), tog('farm', '耕作措施（沿等高线耕作、少耕免耕）'), tog('eng', '工程措施（梯田、淤地坝、鱼鳞坑）')]);
        const damSeg = seg('小浪底水库', ['不启用拦沙', '启用，只拦沙', '启用，汛前调水调沙'], (_, i) => { if (S.anim) { damSeg.set(S.dam ? (S.flush ? 2 : 1) : 0); return; } S.dam = i > 0;          // 启停拦沙不清除库存；不模拟拆坝或库区排沙
 S.flush = i === 2; rebuild(); ui.status(i === 2 ? '每年汛期前，上中游的水库联动放水，在小浪底形成“人造洪峰”，冲刷下游河床。让 10 年过去看看。已有库存保留。' : '已切换拦沙状态，已有库存保留；不启用时来沙直接下泄，本模型不模拟拆坝或库存排沙。'); }, { value: 0 });
        const time = buttons([
          { text: '让 10 年过去', onClick: () => passDecade() },
          { text: '加高两岸大堤（+2 米）', ghost: true, onClick: () => { if (S.anim) return; S.levee += 2; S.raised++; S.hist.push({ y: S.year, bed: S.bed, levee: S.levee }); rebuild(); const last = S.runs[S.runs.length - 1]; ui.status(`两岸的大堤加高了 2 米。${leveeResult(S.levee, S.bed + FLOOD)}${last && last.d > 0.05 ? '可是上一个 10 年里河床还在长高……' : '大堤只挡洪水，不减少河里的沙。'}`); } },
        ]);
        const guess = seg(...ASK, (_, i) => { S.guess = i; drawLog(); }, { value: -1 });
        const reset = buttons([{ text: '重来', ghost: true, onClick: () => { ui.relock?.(); Object.assign(S, { bio: false, farm: false, eng: false, dam: false, flush: false, res: 0, year: 0, bed: BED0, levee: LEVEE0, hist: [{ y: 0, bed: BED0, levee: LEVEE0 }], runs: [], anim: null, raised: 0, moved: false, guess: null, pulse: 0 }); mBtns.btns.forEach((b) => b.classList.remove('on')); damSeg.set(0); guess.set(-1); rebuild(); ui.status(START); } }]);
        const chart = h('canvas', { class: 'wx-map', width: 320, height: 292 }), read = h('div', { class: 'read-out' }), log = h('div', { class: 'timeline' });
        ui.controls.append(h('div', { class: 'bar-title' }, '泥沙从哪来、到哪去'), chart, read, time.el, h('div', { class: 'bar-title' }, '中游：水土保持（课本图 4.6）'), mBtns.el, damSeg.el, guess.el, reset.el, note('前面的切面就是课本图 4.5：大堤夹着的河床比开封城里的地面高，红线量的是高多少。颜色越黄表示年输沙量越大，不表示含沙浓度；调沙用粒子加速示意。启停拦沙保留已有库存，不模拟拆坝或库区排沙。'));
        ui.data.append(h('div', { class: 'bar-title' }, '你看到了什么'), log);
        W = { ui, chart, read, log };
        ui.status(START);
        drawChart(); drawLog();
      },
      update(dt) {
        labels.forEach((l) => l.tick(dt)); stepDots(Math.min(dt, 0.05));
        if (S.pulse > 0) { S.pulse -= dt; buildWater(); if (S.pulse <= 0) buildWater(); }
        if (S.anim) { const a = S.anim; a.t = Math.min(1, a.t + dt / 2.2); const f = frameAt(a.result, a.t * 10); S.bed = f.bed; S.res = f.res; shapeTop(); buildFaces(); layout(); if (a.t >= 1) finishDecade(); }
      },
    };
  },
};
const START = '后面是黄土高原（中游），前面是华北平原上的黄河下游，切面就是课本图 4.5 的“地上河”。先什么都不做，按<b>让 10 年过去</b>，看下游的河床。';
