// 八年级上册 第二章 第一节 地形 · 地势西高东低，呈现三级阶梯（课本第 24—25 页：图 2.1 下面的沿 36°N 纬线地形剖面；活动：用地形剖面图表示我国的地势特征）。
//
// 书桌上是一长条真实的地形：沿 36°N 切下来的一条“剖面带”（从昆仑山脉一带到黄海）。前面的切面就是地形剖面，顶上是那一带真实的地面，按海拔分层设色。
// 学生：
//   ① 拖着小旗沿剖面从西往东走，读出沿线的海拔；走进哪一级阶梯，那一级的范围和平均海拔就标出来（课本图 2.1 的三段）：地势西高东低，呈阶梯状；
//   ② 点“沿 30°N 切开”（活动第 2 题）：剖面带换成 30°N 的，第二级阶梯里有低平的四川盆地，第三级阶梯里有皖南的山地，不如 36°N 典型；
//   ③ 点“沿 105°E 切开”（活动第 3 题）：经线南北延伸，从云贵高原到内蒙古高原一路都在第二级阶梯上，显示不出三级阶梯；
//   ④ 回答活动的三个问题。
// 数据：AWS Terrain Tiles（SRTM 等公开高程数据），tools/geo/profile_strips.py 沿线取平均；线的两头都在我国境内，不画任何边界，只是地形剖面。
// 竖直方向放大约 100 倍；顺着线按比例，三条线一个比例；横过线的宽度（0.5°）放大了，好看清顶上的地形。
import * as THREE from 'three';
import { table, buttons } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { canvasTex } from './kit/props.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked, hull, polyline } from '../live/ink.js';
import { h } from '../ui/Panel.js';
import STRIPS from './data/jieti.js';

const KXKM = 0.68 / 3780;          // 顺着线：1 千米在模型里多长（三条线一个比例）
const KY = 0.15 / 6000;            // 竖直：1 米多高（顺着线 1 米只有 0.18 微米，竖直放大约 140 倍；课本图 2.1 放大得更多）
const Y0 = 0.012;                  // 海平面离桌面多高（下面一层是岩石底座）
const ZF = 0.03, ZD = 0.07;        // 剖面带前面（切面）的位置、横过线的宽度（放大了）
const NA = 420;                    // 顺着线取多少个点
const FACE_H = 0.15;               // 切面前面那层字的高度范围
const EK = ['', '第一级阶梯', '第二级阶梯', '第三级阶梯'];
const BRACKET_M = [0, 6400, 3400, 1900];
const READ_Y = Y0 + 7700 * KY;          // 小旗的读数写在最上面一排（比各级阶梯的括线都高），一条虚线连到小旗、再到海平面          // 各级阶梯的括线画在多高（米，像课本图 2.1 一样一级比一级低）
// 三条剖面线：steps [起, 止, 第几级]；regions 小旗读数用的地名；face 切面上写的字 [坐标, 字, 写在多高（米）, 选项]
const LINES = {
  '36N': {
    name: '沿 36°N', sub: '昆仑山脉一带 → 黄海', ends: ['西', '东'], unit: '°E', tick: 5, sea: 120.4,
    steps: [[80, 103, 1], [103, 113.9, 2], [113.9, 120.4, 3]],
    regions: [[80, 99.5, '青藏高原（昆仑山脉一带）'], [99.5, 103, '青藏高原东北边缘（黄河谷地）'], [103, 104, '兰州附近（黄河）'], [104, 110.3, '黄土高原'], [110.3, 110.7, '黄河（晋陕之间）'], [110.7, 113.6, '黄土高原东部（山西的山地、盆地）'], [113.6, 114, '太行山脉'], [114, 116.8, '华北平原'], [116.8, 119.4, '鲁中山地'], [119.4, 120.4, '胶莱平原—青岛'], [120.4, 121, '黄海']],
    face: [[90, '青 藏 高 原', 3000], [91.5, '昆仑山脉一带', 2100, { small: true }], [107.2, '黄 土 高 原', 800], [103.83, '兰州', 0, { dot: true }], [110.45, '黄河', 0, { river: true }], [115.9, '黄河', 0, { river: true }], [114.17, '太行山脉', 1800, { vertical: true, small: true }], [115.65, '华北平原', 330, { small: true }], [118.2, '鲁中山地', 1050, { small: true }], [120.7, '黄海', 330, { sea: true, small: true }]],
  },
  '30N': {
    name: '沿 30°N', sub: '西藏中部 → 东海', ends: ['西', '东'], unit: '°E', tick: 5, sea: 121.7,
    steps: [[83, 102.8, 1], [102.8, 111.2, 2], [111.2, 121.7, 3]],
    regions: [[83, 97.5, '青藏高原'], [97.5, 102.8, '横断山区'], [102.8, 106.6, '四川盆地'], [106.6, 111.2, '川东、鄂西的山地'], [111.2, 114.8, '长江中游平原（江汉平原、洞庭湖平原一带）'], [114.8, 116.6, '长江沿岸的平原和丘陵'], [116.6, 119.6, '皖南、浙西的山地丘陵（黄山一带）'], [119.6, 121.7, '杭州—宁绍平原'], [121.7, 122.2, '东海']],
    face: [[90, '青 藏 高 原', 3000], [100.1, '横断山区', 2600], [104.7, '四 川 盆 地', 820], [109.1, '川东、鄂西山地', 2000], [113, '长江中游平原', 330, { small: true }], [118.1, '皖南山地', 1300, { small: true }], [120.15, '宁绍平原', 650, { small: true }], [122, '东海', 150, { sea: true, small: true }]],
  },
  '105E': {
    name: '沿 105°E', sub: '云南东部 → 阿拉善', ends: ['南', '北'], unit: '°N', tick: 5, sea: null,
    steps: [[24, 40.5, 2]],
    regions: [[24, 28.4, '云贵高原'], [28.4, 32, '四川盆地'], [32, 34.6, '盆地北边的山地、秦岭西段'], [34.6, 37.4, '黄土高原'], [37.4, 40.5, '内蒙古高原西部（腾格里沙漠一带）']],
    face: [[26.3, '云贵高原', 650], [30.2, '四川盆地', 900], [33.4, '秦岭西段等山地', 2750, { small: true }], [35.9, '黄土高原', 950, { small: true }], [38.75, '内蒙古高原西部', 420, { small: true }]],
  },
};
const KEYS = ['36N', '30N', '105E'];
const fmtM = (m) => { const r = Math.round(m); return r >= 1000 ? `${Math.floor(r / 1000)} ${String(r % 1000).padStart(3, '0')}` : String(r); };
const ease = (x) => x * x * (3 - 2 * x);

// 每条线重采样成 NA 个点、7 行（第 0 行在线上，往北或往西）；算出长度、各级阶梯的平均海拔
const PROF = Object.fromEntries(KEYS.map((key) => {
  const R = STRIPS[key], L = LINES[key], na = R.na, nc = R.nc, r = (na - 1) / (NA - 1);
  const E = Array.from({ length: nc }, (_, j) => Float32Array.from({ length: NA }, (_, i) => {
    const a = i * r, lo = Math.max(0, Math.floor(a - r / 2)), hi = Math.min(na - 1, Math.ceil(a + r / 2));
    if (r <= 1) { const k = Math.min(na - 2, Math.floor(a)), t = a - k; return R.h[j * na + k] * (1 - t) + R.h[j * na + k + 1] * t; }
    let s = 0; for (let k = lo; k <= hi; k++) s += R.h[j * na + k]; return s / (hi - lo + 1);
  }));
  const coord = (f) => R.a0 + f * (R.a1 - R.a0), fOf = (c) => (c - R.a0) / (R.a1 - R.a0);
  const mean = (c0, c1) => { let s = 0, n = 0; for (let k = 0; k < na; k++) { const c = R.a0 + k * 0.05; if (c >= c0 - 1e-6 && c <= c1 + 1e-6) { s += R.h[k]; n++; } } return s / Math.max(1, n); };
  return [key, { E, len: R.km * KXKM, coord, fOf, avg: L.steps.map(([c0, c1]) => Math.round(mean(c0, c1) / 100) * 100), seaF: L.sea == null ? 1 : fOf(L.sea) }];
}));

export default {
  id: 'jieti',
  fig: '图2.1',
  title: '地势西高东低，呈现三级阶梯',
  stampText: '剖面',
  style: 'real',
  flow: 'explore',
  ask: '沿 36°N 把我国的陆地切开，从西往东看切面：地面的高低会是什么样子？',
  guess: { options: ['西边低、东边高', '西边高、东边低，一级一级降下来', '东西差不多一样高'], answer: 1 },          // 动手看里的“先猜一下（可以不猜）”
  need: '拖着小旗沿 36°N 的剖面从西往东走，读出沿线的海拔，找出三级阶梯；再换成沿 30°N、沿 105°E 切开，比一比哪条剖面线显示的三级阶梯最典型',
  conclusion: {
    crops: [{ page: 28, rect: [42, 198, 458, 241] }, { page: 29, rect: [64, 50, 376, 156] }],
    quote: '“百川东到海”，反映了我国地势西高东低的总体趋势。我国陆地地势自西向东可以划分出三级阶梯（图2.1）。第一级阶梯平均海拔在4 000米以上，由“世界屋脊”——青藏高原构成。第二级阶梯的海拔一般在1 000—2 000米，以高原、盆地为主。第三级阶梯的海拔大多在500米以下，以平原、丘陵为主。我国陆地向海洋延伸的部分，形成广阔的大陆架。',
    why: '沿 36°N 从西往东：青藏高原（昆仑山脉一带）这一段平均海拔约 4 400 米，是第一级阶梯；过了兰州附近，黄土高原这一段平均约 1 400 米，是第二级阶梯；过了太行山脉，华北平原、鲁中山地这一段平均约 100 米，是第三级阶梯——<b>地势西高东低，呈三级阶梯</b>。<br>沿 30°N 也是西高东低，但第二级阶梯里有低平的四川盆地（这一段平均只有约 700 米），第三级阶梯里有皖南的山地，台阶不如 36°N 分明；沿 105°E 这样的经线，从南到北几乎都在第二级阶梯上（平均约 1 300 米），显示不出三级阶梯——三级阶梯是<b>自西向东</b>排列的，要用东西方向的剖面线。<br>和地形图相比，地形剖面图把沿线地面的高低起伏直接画出来，阶梯一眼就能看出；但它只表示一条线上的情况。',
    src: '课本八年级上册第 24—25 页 · 第二章 第一节 地形（地势西高东低，呈现三级阶梯；活动：用地形剖面图表示我国的地势特征）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null, said = '';
    const status = (m) => { if (!S.demo) { said = m; W?.status(m); } else bar.caption(m); };          // said：学生这边最后一句（老师演示完放回去）
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };

    paperSheet(group, { w: 0.86, d: 0.36, x: 0, z: 0.04 });

    // ================= 剖面带：顶上一片真实地形（NA × 7 个点），前后两面、两头各一面；按海拔分层设色 =================
    const rampTex = canvasTex(512, 4, (g, Wc, Hc) => {          // 课本地形图的分层设色：低处绿、往上黄、橙、棕，最高处偏白
      const gr = g.createLinearGradient(0, 0, Wc, 0);
      [[0, '#5d9f55'], [200, '#8dbf68'], [500, '#d3d98a'], [1000, '#ead08a'], [2000, '#d9a462'], [3000, '#c47f48'], [4000, '#a8663e'], [5000, '#8f5843'], [6000, '#c9b7ac'], [6500, '#ece6e0']].forEach(([e, c]) => gr.addColorStop(e / 6500, c));
      g.fillStyle = gr; g.fillRect(0, 0, Wc, Hc);
    });
    const landM = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0 });
    landM.onBeforeCompile = (sh) => {          // 颜色按高度（模型里的 y）查色带：顶面、切面一个规矩，切面上的色带就是一级级的台阶
      Object.assign(sh.uniforms, { uRamp: { value: rampTex }, uY0: { value: Y0 }, uKY: { value: KY } });
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vH;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvH = position.y;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vH;\nuniform sampler2D uRamp;\nuniform float uY0, uKY;')
        .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'float eH = (vH - uY0) / uKY;\nvec3 rc = eH < -8.0 ? vec3(0.36, 0.3, 0.24) : texture2D(uRamp, vec2(clamp(eH / 6500.0, 0.0, 1.0), 0.5)).rgb;\nvec4 diffuseColor = vec4( rc, opacity );')
        .replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = rc * 0.14;');
    };
    const NC = 7, nTop = NA * NC;
    const topGeo = new THREE.BufferGeometry(), topPos = new Float32Array(nTop * 3);
    topGeo.setAttribute('position', new THREE.BufferAttribute(topPos, 3));
    { const idx = []; for (let j = 0; j < NC - 1; j++) for (let i = 0; i < NA - 1; i++) { const a = j * NA + i, b = a + 1, c = a + NA, d = c + 1; idx.push(a, b, c, b, d, c); } topGeo.setIndex(idx); }
    const top = new THREE.Mesh(topGeo, landM); top.receiveShadow = true; top.castShadow = true; top.raycast = () => {}; group.add(top);
    // 四面墙：前（切面）、后各 NA × 2 个点，两头各 NC × 2 个点
    const nWall = NA * 4 + NC * 4, wallGeo = new THREE.BufferGeometry(), wallPos = new Float32Array(nWall * 3), wallNrm = new Float32Array(nWall * 3);
    wallGeo.setAttribute('position', new THREE.BufferAttribute(wallPos, 3)); wallGeo.setAttribute('normal', new THREE.BufferAttribute(wallNrm, 3));
    { const idx = [], strip = (o, n, flip) => { for (let i = 0; i < n - 1; i++) { const a = o + i * 2, b = a + 1, c = a + 2, d = a + 3; if (flip) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c); } };
      strip(0, NA, false); strip(NA * 2, NA, true); strip(NA * 4, NC, true); strip(NA * 4 + NC * 2, NC, false); wallGeo.setIndex(idx);          // 绕向：前面朝 +z、后面朝 −z、西头朝 −x、东头朝 +x
      const setN = (o, n, x, z) => { for (let k = o; k < o + n * 2; k++) wallNrm.set([x, 0, z], k * 3); };
      setN(0, NA, 0, 1); setN(NA * 2, NA, 0, -1); setN(NA * 4, NC, -1, 0); setN(NA * 4 + NC * 2, NC, 1, 0); }
    const wall = new THREE.Mesh(wallGeo, landM); wall.receiveShadow = true; wall.castShadow = true; wall.raycast = () => {}; group.add(wall);
    // 海：东头一段薄薄的蓝色水体（盖住海里那一截）
    const sea = new THREE.Mesh(new THREE.BoxGeometry(1, 0.0048, ZD + 0.0012), new THREE.MeshStandardMaterial({ color: 0x77b9dd, roughness: 0.35, transparent: true, opacity: 0.88 }));
    sea.raycast = () => {}; sea.renderOrder = 2; group.add(sea);

    // 现在画成的样子：长度、每行的高程（换线时从旧的慢慢变到新的）
    const cur = { len: PROF['36N'].len, E: PROF['36N'].E.map((r) => Float32Array.from(r)), seaF: PROF['36N'].seaF };
    let morph = null;
    const xOf = (f, len = cur.len) => (f - 0.5) * len;
    const yTop = (f) => { const t = clamp(f, 0, 1) * (NA - 1), i = Math.min(NA - 2, Math.floor(t)), u = t - i; return Y0 + (cur.E[0][i] * (1 - u) + cur.E[0][i + 1] * u) * KY; };
    const eAt = (f) => (yTop(f) - Y0) / KY;
    const shape = () => {
      for (let j = 0; j < NC; j++) { const z = ZF - (j / (NC - 1)) * ZD, row = cur.E[j]; for (let i = 0; i < NA; i++) topPos.set([xOf(i / (NA - 1)), Y0 + row[i] * KY, z], (j * NA + i) * 3); }
      topGeo.attributes.position.needsUpdate = true; topGeo.computeVertexNormals(); topGeo.computeBoundingSphere(); topGeo.computeBoundingBox();
      const zb = ZF - ZD;
      for (let i = 0; i < NA; i++) { const x = xOf(i / (NA - 1)); wallPos.set([x, Y0 + cur.E[0][i] * KY, ZF, x, 0, ZF], i * 6); wallPos.set([x, Y0 + cur.E[NC - 1][i] * KY, zb, x, 0, zb], (NA * 2 + i * 2) * 3); }
      for (let j = 0; j < NC; j++) { const z = ZF - (j / (NC - 1)) * ZD, xl = xOf(0), xr = xOf(1); wallPos.set([xl, Y0 + cur.E[j][0] * KY, z, xl, 0, z], (NA * 4 + j * 2) * 3); wallPos.set([xr, Y0 + cur.E[j][NA - 1] * KY, z, xr, 0, z], (NA * 4 + NC * 2 + j * 2) * 3); }
      wallGeo.attributes.position.needsUpdate = true; wallGeo.computeBoundingSphere(); wallGeo.computeBoundingBox();
      face.scale.x = cur.len;
      const x0 = xOf(Math.min(1, cur.seaF)), x1 = xOf(1); sea.visible = x1 - x0 > 0.001; sea.scale.x = Math.max(0.001, x1 - x0); sea.position.set((x0 + x1) / 2, Y0 - 0.0018, ZF - ZD / 2);
    };

    // ================= 切面前面的一层字（像课本图 2.1：地形区、兰州、黄河……），两头写西、东（或南、北），底座上标经纬度 =================
    const faceTex = Object.fromEntries(KEYS.map((key) => [key, canvasTex(Math.round((2400 * PROF[key].len) / 0.68), 560, () => {})]));          // 一条线一张，宽度跟着线的长短，字不变形
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1, FACE_H), new THREE.MeshBasicMaterial({ map: faceTex['36N'], transparent: true, depthWrite: false, opacity: 0 }));
    face.position.set(0, FACE_H / 2, ZF + 0.0008); face.renderOrder = 6; face.raycast = () => {}; face.userData.noFrame = true; group.add(face);
    const drawFace = (key) => {
      const L = LINES[key], P = PROF[key], T = faceTex[key], c = T.image, g = c.getContext('2d'), Wc = c.width, Hc = c.height;
      const X = (co) => P.fOf(co) * Wc, Y = (m) => (1 - (Y0 + m * KY) / FACE_H) * Hc, eOf = (co) => { const t = clamp(P.fOf(co), 0, 1) * (NA - 1), i = Math.min(NA - 2, Math.floor(t)), u = t - i; return P.E[0][i] * (1 - u) + P.E[0][i + 1] * u; };
      g.clearRect(0, 0, Wc, Hc); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      const say = (text, x, y, { size = 44, color = '#2b2116', halo = 'rgba(255,250,238,0.75)', vertical = false } = {}) => {
        g.font = `700 ${size}px "Songti SC", "STSong", serif`; g.fillStyle = color; g.strokeStyle = halo; g.lineWidth = 7;
        if (vertical) { [...text].forEach((ch, k) => { const yy = y + k * size * 1.05; g.strokeText(ch, x, yy); g.fillText(ch, x, yy); }); return; }          // 竖排：第一个字在 y，往下写
        g.strokeText(text, x, y); g.fillText(text, x, y);
      };
      for (const [co, text, m, o = {}] of L.face) {
        if (o.dot) { const e = eOf(co), y = Y(e); g.fillStyle = '#fff'; g.strokeStyle = '#2b2116'; g.lineWidth = 4; g.beginPath(); g.arc(X(co), y, 10, 0, 7); g.fill(); g.stroke(); say(text, X(co) + 8, y - 44, { size: 38 }); continue; }
        if (o.river) { say(text, X(co), Y(eOf(co)) - 34, { size: 32, color: '#2f78b7' }); continue; }
        say(text, X(co), Y(m), { size: o.small ? 36 : 46, color: o.sea ? '#2f78b7' : '#2b2116', vertical: o.vertical });
      }
      // 底座：两头写方向，中间每 5° 一个刻度
      g.fillStyle = 'rgba(255,248,232,0.9)'; g.font = '700 30px "Songti SC", serif';
      g.textAlign = 'left'; g.fillText(L.ends[0], 14, Y(0) + 34); g.textAlign = 'right'; g.fillText(L.ends[1], Wc - 14, Y(0) + 34);
      g.textAlign = 'center'; g.font = '600 26px "Times New Roman", serif';
      const R = STRIPS[key];
      for (let co = Math.ceil(R.a0 / L.tick) * L.tick; co <= R.a1; co += L.tick) { const x = X(co); if (x < 70 || x > Wc - 70) continue; g.fillRect(x - 1.5, Y(0) + 4, 3, 12); g.fillText(`${co}${L.unit}`, x, Y(0) + 36); }
      T.needsUpdate = true;
    };
    for (const key of KEYS) drawFace(key);

    // ================= 海拔尺：立在剖面带西头（0—6 000 米） =================
    const RH = Y0 + 6600 * KY;
    const rulerTex = canvasTex(160, 1024, (g, Wc, Hc) => {
      g.clearRect(0, 0, Wc, Hc); g.fillStyle = 'rgba(253,250,240,0.92)'; g.fillRect(70, 0, Wc - 70, Hc);
      const yOf = (m) => Hc - ((Y0 + m * KY) / RH) * Hc;
      g.strokeStyle = '#2b2116'; g.lineWidth = 3; g.beginPath(); g.moveTo(Wc - 6, yOf(0)); g.lineTo(Wc - 6, yOf(6500)); g.stroke();
      g.fillStyle = '#2b2116'; g.font = '600 24px "Times New Roman", serif'; g.textAlign = 'right'; g.textBaseline = 'middle';
      for (let m = 0; m <= 6000; m += 500) { const y = yOf(m), big = m % 1000 === 0; g.fillRect(Wc - (big ? 30 : 18), y - 1.5, big ? 24 : 12, 3); if (big) g.fillText(fmtM(m), Wc - 36, y); }
      g.save(); g.translate(40, yOf(3200)); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.font = '700 28px "Songti SC", serif'; g.fillText('海拔/米', 0, 0); g.restore();
    }, {});
    const ruler = new THREE.Mesh(new THREE.PlaneGeometry(0.02, RH), new THREE.MeshBasicMaterial({ map: rulerTex, transparent: true, depthWrite: false }));
    ruler.position.set(0, RH / 2, ZF + 0.002); ruler.renderOrder = 6; ruler.raycast = () => {}; group.add(ruler);

    // ================= 各级阶梯的括线：虚线竖在分界处，双箭头横在上面，写上平均海拔（小旗走进那一级才标出来） =================
    const INK = 0x2b6fb0;
    const brk = [0, 1, 2].map(() => ({ line: polyline([new THREE.Vector3(), new THREE.Vector3()], { width: 2, color: INK }), tag: tag('', 'pill'), a: 0 }));
    const bnd = [0, 1, 2, 3].map(() => polyline([new THREE.Vector3(), new THREE.Vector3(0, 0.01, 0)], { width: 1.6, color: INK, dashed: true, dash: 0.004, gap: 0.003 }));
    for (const b of brk) { b.line.renderOrder = 7; b.line.material.transparent = true; group.add(b.line); b.tag.show(false); }
    for (const l of bnd) { l.renderOrder = 7; l.material.transparent = true; group.add(l); }
    const layoutBrackets = () => {
      const L = LINES[S.line], P = PROF[S.line], zf = ZF + 0.0015, ah = 0.006;
      brk.forEach((b, k) => {
        const st = L.steps[k]; b.line.visible = !!st && b.a > 0.01; b.tag.show(!!st && b.a > 0.5 && !morph);
        if (!st) return;
        const [c0, c1, lv] = st, x0 = xOf(P.fOf(c0)), x1 = xOf(P.fOf(c1)), y = Y0 + BRACKET_M[lv] * KY;
        b.line.geometry.setPositions([x0, y, zf, x1, y, zf, x0, y, zf, x0 + ah, y + ah * 0.45, zf, x0, y, zf, x0 + ah, y - ah * 0.45, zf, x1, y, zf, x1 - ah, y + ah * 0.45, zf, x1, y, zf, x1 - ah, y - ah * 0.45, zf]);
        b.line.material.opacity = b.a;
        b.tag.text(`${EK[lv]} · 平均约 ${fmtM(P.avg[k])} 米`).loc(group, (x0 + x1) / 2, y + 0.009, zf);
      });
      // 分界的虚线：从地面竖到两边括线里高的那一条
      const cuts = []; L.steps.forEach(([c0, c1], k) => { if (!k) cuts.push([c0, k, k]); cuts.push([c1, k, Math.min(k + 1, L.steps.length - 1)]); });
      bnd.forEach((l, n) => {
        const ct = cuts[n]; l.visible = !!ct && Math.max(brk[ct[1]].a, brk[ct[2]].a) > 0.01;
        if (!ct) return;
        const f = P.fOf(ct[0]), x = xOf(f), yb = Y0 + Math.max(BRACKET_M[L.steps[ct[1]][2]], BRACKET_M[L.steps[ct[2]][2]]) * KY + 0.003;
        l.geometry.setPositions([x, yTop(clamp(f, 0, 1)) + 0.002, zf, x, yb, zf]); l.computeLineDistances(); l.material.opacity = Math.max(brk[ct[1]].a, brk[ct[2]].a);
      });
    };

    // ================= 小旗（拖着沿剖面走） =================
    const probe = new THREE.Group(); group.add(probe);
    const steel = paint(0x8a8f99, { keep: true });
    const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.0007, 0.0007, 0.03, 8), steel); needle.position.y = 0.015; probe.add(needle);
    const flagTex = canvasTex(128, 80, (g, Wc, Hc) => { g.fillStyle = '#c8342a'; g.beginPath(); g.moveTo(0, 0); g.lineTo(Wc, Hc * 0.5); g.lineTo(0, Hc); g.closePath(); g.fill(); }, {});
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.014, 0.009), new THREE.MeshStandardMaterial({ map: flagTex, transparent: true, side: THREE.DoubleSide, roughness: 0.8 })); flag.position.set(0.007, 0.0255, 0); probe.add(flag);
    const knob = hull(new THREE.Mesh(new THREE.SphereGeometry(0.0022, 12, 10), paint(0xe0b04a, { keep: true })), 0.0005, undefined, { handle: true }); knob.position.y = 0.0305; probe.add(knob);
    const probePick = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshBasicMaterial({ visible: false })); probePick.position.y = 0.022; probePick.userData.pick = true; probePick.userData.track = true; probe.add(probePick);
    const drop = polyline([new THREE.Vector3(), new THREE.Vector3(0, 0.01, 0)], { width: 1.4, color: 0xc8342a, dashed: true, dash: 0.003, gap: 0.0025 }); drop.renderOrder = 7; group.add(drop);
    const readTag = tag('', 'pill');

    // ================= 换剖面线：剖面带前面三张小立牌 =================
    const cards = Object.fromEntries(KEYS.map((key, n) => {
      const L = LINES[key], tex = canvasTex(512, 210, () => {});
      const g = new THREE.Group(); g.position.set((n - 1) * 0.13, 0, ZF + 0.105); group.add(g);
      const board = inked(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.041, 0.003), [paint(0xc9b48e), paint(0xc9b48e), paint(0xc9b48e), paint(0xc9b48e), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), paint(0xc9b48e)]), { width: 0.6, handle: true }); board.position.set(0, 0.0225, -0.0025); board.rotation.x = -0.22; g.add(board);          // 往后靠一点
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.104, 0.004, 0.016), paint(0xa7865a)); foot.position.set(0, 0.002, -0.004); g.add(foot);
      const draw = (on) => { const c = tex.image, x = c.getContext('2d'), Wc = c.width, Hc = c.height; x.fillStyle = on ? '#fff7e6' : '#f4ecd9'; x.fillRect(0, 0, Wc, Hc); x.strokeStyle = on ? '#c8342a' : 'rgba(90,70,40,.4)'; x.lineWidth = on ? 12 : 5; x.strokeRect(6, 6, Wc - 12, Hc - 12); x.fillStyle = on ? '#c8342a' : '#2a3040'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '700 70px "Songti SC", serif'; x.fillText(`${L.name} 切开`, Wc / 2, Hc * 0.4); x.font = '500 36px "Songti SC", serif'; x.fillStyle = '#5b5040'; x.fillText(L.sub, Wc / 2, Hc * 0.76); tex.needsUpdate = true; };
      return [key, { g, board, draw }];
    }));

    // ================= 状态 =================
    const fresh = () => ({ demo: false, line: '36N', f: 0.03, seen: { '36N': [], '30N': [], '105E': [] }, bins: { '36N': [], '30N': [], '105E': [] }, done: {}, a1: false, a2: false, a3: false, a4: false });
    S = fresh();
    const binsN = 12;

    const setLine = (key, instant = false) => {
      const from = { len: cur.len, E: cur.E.map((r) => Float32Array.from(r)), seaF: cur.seaF };
      S.line = key; for (const k of KEYS) cards[k].draw(k === key);
      if (instant) { const P = PROF[key]; cur.len = P.len; cur.E = P.E.map((r) => Float32Array.from(r)); cur.seaF = P.seaF; morph = null; shape(); face.material.map = faceTex[key]; face.material.opacity = 1; return; }
      morph = { from, to: PROF[key], t: 0, drawn: false };
    };
    const visit = (f) => {          // 小旗走到 f：记下走过哪一段；走进哪一级阶梯，那一级标出来
      const key = S.line, L = LINES[key], P = PROF[key], c = P.coord(f), bins = S.bins[key];
      const b = Math.min(binsN - 1, Math.floor(f * binsN)); if (!bins.includes(b)) bins.push(b);
      L.steps.forEach(([c0, c1], k) => { if (c >= c0 && c <= c1 && !S.seen[key].includes(k)) { S.seen[key].push(k); sfx.clink?.({ freq: 520 + k * 140, gain: 0.025 }); } });
      if (bins.length >= binsN - 1 && !S.done[key] && S.seen[key].length === L.steps.length) finishLine(key);
    };
    const finishLine = (key) => {
      S.done[key] = true; const P = PROF[key], L = LINES[key];
      const cell = (lv) => { const k = L.steps.findIndex((s) => s[2] === lv); return k < 0 ? '—' : `约 ${fmtM(P.avg[k])} 米`; };
      log([L.name, cell(1), cell(2), cell(3)]);
      if (key === '36N') { done('read'); status(`沿 36°N 走完了：西头的青藏高原平均约 ${fmtM(P.avg[0])} 米，中间的黄土高原约 ${fmtM(P.avg[1])} 米，过了太行山脉，华北平原、鲁中山地只有约 ${fmtM(P.avg[2])} 米——一级比一级低。在左边说说地势怎样变化；再点前面的<b>“沿 30°N 切开”</b>。`); if (!S.demo) W?.t1.open(); }
      if (key === '30N') { done('cut30'); status(`沿 30°N 也是西高东低：青藏高原、横断山区约 ${fmtM(P.avg[0])} 米；可第二级阶梯这一段平均只有约 ${fmtM(P.avg[1])} 米（中间是低平的四川盆地），第三级阶梯里又有黄山一带的山地。和 36°N 比一比，在左边作答；再点<b>“沿 105°E 切开”</b>。`); if (!S.demo) W?.t2.open(); }
      if (key === '105E') { done('cut105'); status(`沿 105°E 从南走到北：云贵高原、四川盆地、秦岭、黄土高原、内蒙古高原，几乎都在第二级阶梯上（平均约 ${fmtM(P.avg[0])} 米），看不出一级一级的台阶。在左边说说为什么。`); if (!S.demo) W?.t3.open(); }
    };

    const A = {
      /** 小旗走到 f（0 西头/南头 … 1 东头/北头） */
      probeTo(f) { S.f = clamp(f, 0, 1); if (!morph) visit(S.f); },
      line(key) {
        if (key === S.line && !morph) return;
        setLine(key); const L = LINES[key];
        status(key === '105E' ? `换成沿 105°E 切开：这回是一条经线，左边是南、右边是北（从${L.sub.replace(' → ', '到')}）。拖着小旗从南走到北。` : `换成${L.name}切开（${L.sub.replace(' → ', '到')}）。拖着小旗从西往东走一遍。`);
      },
      reset() {
        W?.ui?.relock?.(); S = fresh(); setLine('36N', true); for (const b of brk) b.a = 0;
        if (W) { W.tbl.clear(); for (const t of [W.t1, W.t2, W.t3, W.t4]) t.close(); W.next.hidden = true; }
        bar.undo('read', 'cut30', 'cut105', 'why'); status('全部重来：又是沿 36°N 切开的剖面带，小旗回到西头。');
      },
    };

    // ================= 拖、点 =================
    const tip = tag('', 'pill');
    const drag = draggable(group, [
      { obj: probePick, plane: 'xy', offset: ZF, keepOffset: true, anchor: probe, hint: '拖着小旗沿剖面走', onDrag: (p) => A.probeTo(p.x / cur.len + 0.5) },
    ], { tip, taps: KEYS.map((key) => ({ obj: cards[key].board, hint: `点一下：${LINES[key].name}切开`, onTap: () => A.line(key) })) });
    const act = demoActs(drag, group);
    const sweep = (t0, t1) => act.drag(probePick, () => new THREE.Vector3(xOf(S.f < 0.5 ? 0.98 : 0.02), 0, ZF), { from: () => new THREE.Vector3(xOf(S.f), 0, ZF), t0, t1, release: t1 + 0.02 });          // 小旗从它现在在的那一头，走到另一头

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'read', title: '沿 36°N', todo: '拖着剖面带上的<b>小旗</b>，从西头一直走到东头：读出沿线的海拔，看三级阶梯在哪里。', target: () => probe },
        { id: 'cut30', title: '沿 30°N', todo: '点前面的<b>“沿 30°N 切开”</b>，再拖着小旗从西走到东，和 36°N 比一比。', target: () => (S.line === '30N' ? probe : cards['30N'].g) },
        { id: 'cut105', title: '沿经线', todo: '点<b>“沿 105°E 切开”</b>，拖着小旗从南走到北：沿经线的剖面能看出三级阶梯吗？', target: () => (S.line === '105E' ? probe : cards['105E'].g) },
        { id: 'why', title: '想一想', todo: '在左边回答活动的三个问题。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => {
            setLine(S.line); for (const b of brk) b.a = 0;
            if (S.demo) W?.status('老师演示中：看画面下面的字幕。你刚才的操作先存着，演示完放回来。'); else if (said) W?.status(said);
          } }),
          shots: [
            { cap: '沿 36°N 切下来的一条地形：前面的切面就是地形剖面。小旗从西往东走——青藏高原 4 000 多米，黄土高原一两千米，过了太行山脉，华北平原只有几十米。', dur: 12, during: sweep(0.05, 0.85) },
            { cap: '换成沿 30°N 切开：也是西高东低，可第二级阶梯里有低平的四川盆地，第三级阶梯里有黄山一带的山地，台阶不如 36°N 分明。', dur: 12, during: act.seq(act.tap(cards['30N'].board, 0.03), sweep(0.2, 0.9)) },
            { cap: '换成沿 105°E（经线）切开：从南到北几乎都在第二级阶梯上，看不出三级阶梯——三级阶梯是自西向东排列的。', dur: 11, during: act.seq(act.tap(cards['105E'].board, 0.03), sweep(0.22, 0.9)) },
            { cap: '地形剖面图把沿线的高低起伏直接画出来，三级阶梯一眼就能看出；但要选东西方向、穿过三级阶梯的剖面线。演示完了，下面换你自己来。', dur: 6, during: act.tap(cards['36N'].board, 0.1) },
          ],
        },
      },
    });
    const pointer = {
      items: drag.items,
      down(ray, e) { if (bar.playing) { bar.stop(); return true; } return drag.down(ray, e); },
      move: (ray, e) => drag.move(ray, e),
      up: (ray, e) => drag.up(ray, e),
    };

    // ================= 每帧 =================
    let probeY = null;
    const step = (dt) => {
      if (morph) {          // 换线：剖面带从旧的形状慢慢变成新的；字先淡出，变完再淡入
        morph.t = Math.min(1, morph.t + dt / 1.4); const k = ease(morph.t), F = morph.from, T = morph.to;
        cur.len = F.len + (T.len - F.len) * k; cur.seaF = F.seaF + (T.seaF - F.seaF) * k;
        for (let j = 0; j < NC; j++) for (let i = 0; i < NA; i++) cur.E[j][i] = F.E[j][i] + (T.E[j][i] - F.E[j][i]) * k;
        face.material.opacity = Math.max(0, 1 - morph.t * 4);
        if (morph.t >= 1) { morph = null; face.material.map = faceTex[S.line]; visit(S.f); }
        shape();
      } else face.material.opacity = Math.min(1, face.material.opacity + dt * 2.5);
      // 括线：这条线上走进过的阶梯淡入，换线时先收起来
      brk.forEach((b, k) => { const on = !morph && S.seen[S.line].includes(k); b.a += ((on ? 1 : 0) - b.a) * Math.min(1, dt * (on ? 4 : 10)); });
      layoutBrackets();
      // 小旗、读数
      const f = S.f, x = xOf(f), y = yTop(f), e = eAt(f), P = PROF[S.line], L = LINES[S.line], c = P.coord(f);
      probeY = probeY == null || morph ? y : probeY + (y - probeY) * Math.min(1, dt * 14);          // 爬上、走下陡坎时滑过去，不一帧一跳
      probe.position.set(x, probeY, ZF - 0.004);
      drop.geometry.setPositions([x, READ_Y - 0.007, ZF + 0.0014, x, Y0, ZF + 0.0014]); drop.computeLineDistances();
      const reg = L.regions.find(([c0, c1]) => c >= c0 && c <= c1), st = L.steps.find(([c0, c1]) => c >= c0 && c <= c1);
      const where = `${L.unit === '°E' ? `${c.toFixed(1)}°E` : `${c.toFixed(1)}°N`}`;
      readTag.text(morph ? '' : reg?.[2] === '黄海' || reg?.[2] === '东海' ? `${where} · ${reg[2]}` : `${where} · 海拔约 ${fmtM(Math.round(e / 10) * 10)} 米 · ${reg ? reg[2] : ''}${st ? ` · ${EK[st[2]]}` : ''}`).loc(group, x, READ_Y, ZF).show(!morph);
      ruler.position.x = xOf(0) - 0.016;
    };

    setLine('36N', true); cards['36N'].draw(true);

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.78, d: 0.3, h: 0.2 },
      view: { elev: 22, azim: 0, lookY: 0.4, frameMargin: 1.04 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const t1 = think({ title: '想一想', status,
          q: '沿 36°N 从西往东，地势怎样变化？',
          options: ['西高东低，一级一级降下来，呈阶梯状', '东高西低', '中间高、两头低'],
          wrong: ['看剖面：西头的青藏高原 4 000 多米，东头的华北平原只有几十米。', '最高的是西头的青藏高原，不在中间；从西往东是一级一级降下来的。'],
          ok: '对：沿 36°N，西边的青藏高原平均海拔在 4 000 米以上，中间的黄土高原一般在 1 000—2 000 米，东边的华北平原在 500 米以下——地势西高东低，呈三级阶梯。“百川东到海”说的就是这个总体趋势。',
          onOk: () => { S.a1 = true; finish(); } });
        const t2 = think({ title: '想一想', status,
          q: '活动第 2 题：沿 30°N 的剖面也能看出三级阶梯吗？和沿 36°N 比，哪个更典型？',
          options: ['也能看出，但沿 36°N 更典型：沿 30°N 的第二级阶梯里有低平的四川盆地，第三级阶梯里有皖南的山地', '沿 30°N 更典型', '沿 30°N 完全看不出阶梯'],
          wrong: ['看表里的数：沿 30°N 的第二级阶梯这一段平均只有约 700 米，四川盆地只有三四百米，台阶不分明。', '沿 30°N 也是西高东低：青藏高原、横断山区 4 000 多米，往东降到四川盆地，再降到长江中下游平原。只是中间那级台阶高低不平。'],
          ok: '对：沿 30°N 也是西高东低，但第二级阶梯里有低平的四川盆地，第三级阶梯里又有黄山一带的山地，台阶高低不平；沿 36°N 三级阶梯分得更清楚，更典型。',
          onOk: () => { S.a2 = true; finish(); } });
        const t3 = think({ title: '想一想', status,
          q: '活动第 3 题：沿经线（比如 105°E）的剖面，能显示我国地势的三级阶梯吗？为什么？',
          options: ['基本不能：三级阶梯是自西向东排列的，经线南北延伸，这条线从南到北几乎都在第二级阶梯上', '能，和沿纬线一样清楚', '能，而且是南高北低的三级阶梯'],
          wrong: ['看剖面：沿 105°E 从云贵高原到内蒙古高原，几乎都在 1 000—2 000 米，中间夹着四川盆地，看不出一级一级的台阶。', '沿 105°E 南北两头差不多高（云贵高原、内蒙古高原都在 1 000 多米），没有南高北低。'],
          ok: '对：我国地势的三级阶梯自西向东排列，阶梯之间的分界大致是南北方向的；经线也是南北方向，基本上只在一级阶梯里走（105°E 几乎都在第二级阶梯），显示不出三级阶梯。要用东西方向的剖面线。',
          onOk: () => { S.a3 = true; t4.open(); finish(); } });
        const t4 = think({ title: '想一想', status,
          q: '活动第 1 题：和地形图相比，地形剖面图刻画我国的地势阶梯有什么优点？',
          options: ['把沿线地面的高低起伏直接画出来，一眼就能看出一级一级的阶梯', '能显示各个地形区的位置和范围', '能显示各地的气温和降水'],
          wrong: ['地形区的位置和范围要看地形图（平面图）；剖面图只沿一条线，长处是把高低起伏“立”起来。', '气温、降水不是地形剖面图表示的内容。'],
          ok: '对：地形图用颜色表示高低，要对照图例才看得出；剖面图把沿线的高低起伏直接画出来，三级阶梯一眼就能看出。不过剖面图只表示一条线上的情况，所以要选合适的剖面线。',
          onOk: () => { S.a4 = true; finish(); } });
        const finish = () => { if (S.a1 && S.a2 && S.a3 && S.a4) { done('why'); next.hidden = false; } };
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '对照课本原文 →');
        const tbl = table(['剖面线', '第一级阶梯', '第二级阶梯', '第三级阶梯'], { note: '每一格是这条线在那一级阶梯里的平均海拔（沿线每一点取附近约 5 千米的平均）。' });
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：剖面是真实的高程数据（AWS Terrain Tiles，SRTM 等公开数据），沿线每一点取附近约 5 千米见方的平均海拔，所以和某一座城市、某一座山峰的海拔不完全一样。竖直方向放大约 100 倍；剖面带顺着线是按比例的（三条线一个比例），横过线的宽度（0.5°）放大了。线的两头都在我国境内，阶梯的分界按课本图 2.1 的分界线取近似位置。' });
        ui.controls.append(t1.el, t2.el, t3.el, t4.el, next, more, note);
        ui.data.append(tbl.el);
        const dtl = ui.data.previousElementSibling; if (dtl?.classList.contains('bar-title')) dtl.textContent = '各级阶梯的平均海拔';
        W = { ui, tbl, t1, t2, t3, t4, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        status('图 2.1：沿 36°N 把我国的陆地切开，切面就是地形剖面。拖着剖面带上的<b>小旗</b>，从西头走到东头，看沿线的海拔怎么变。可以先看<b>老师演示</b>，也可以直接动手。');
      },
      update(dt) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k); },
      dispose() { bar.dispose(); for (const t of [tip, readTag, ...brk.map((b) => b.tag)]) t.remove(); },
      debug: { get S() { return S; }, A, bar,
        qa: qaFlow(drag, [
          { name: '小旗走 36°N', run: () => { for (let f = 0; f <= 1.0001; f += 0.02) A.probeTo(f); }, wait: 1 },
          { name: '答地势', run: () => W.t1.el.querySelector('button').click() },
          { name: '换 30°N', tap: cards['30N'].board, wait: 2 },
          { name: '小旗走 30°N', run: () => { for (let f = 1; f >= -0.0001; f -= 0.02) A.probeTo(f); }, wait: 1 },
          { name: '答 30°N', run: () => W.t2.el.querySelector('button').click() },
          { name: '换 105°E', tap: cards['105E'].board, wait: 2 },
          { name: '小旗走 105°E', run: () => { for (let f = 0; f <= 1.0001; f += 0.02) A.probeTo(f); }, wait: 1 },
          { name: '答经线', run: () => W.t3.el.querySelector('button').click() },
          { name: '答剖面图', run: () => W.t4.el.querySelector('button').click() },
        ]) },
    };
  },
};
