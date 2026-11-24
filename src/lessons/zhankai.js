// 数学 七年级上册 6.1.1 立体图形与平面图形 · 展开图（课本 PDF 第 159–165 页：图 6.1-9 粉笔盒、图 6.1-10、练习第 3 题、习题第 6、8 题）。
// 情境就是课本里的粉笔盒：要做一只正方体的粉笔盒，硬纸板该裁成什么形状？能裁出几种？
// 课本上铺一块裁纸垫，粉笔盒立在上面；盒子的六个面是六块硬纸板，压痕处能折（外面印着“粉笔”，里面是牛皮纸色）。
// 一个画面里讲完，每一步都由学生的那一下做出来：
//   点一下盒子：盒子展开、铺平——这就是展开图（课本的定义），6 个正方形；
//   按住一块挪到别的边上，再点一下折起来：又围成了正方体——展开图不止一种；
//   有的折不成：两个面撞在一起，另一面空着（田字形：四块围着一个点，折不起来）——后果看得见，打开再挪就是回来的路；
//   哪两个面会相对？折起来，三对相对的面各连成一条线；打开，这三条线躺在展开图上：相对的面不挨着，同一行里隔一个；
//   一共几种？先四个连成一行（6 种），再最长一行三个……找到的一种种排在后面，数写在旁边；转一转、翻过来一样的算一种；
//   找齐第 11 种的那一下：11 张展开图一起折起来，变成 11 只一模一样的粉笔盒（全课唯一的重拍）；
//   课本的“中国梦 我的梦”：“的”字的对面是哪个字？折起来、打开，看“的”连着的那一头 → 答开头的问题。
// 所有的“能不能折成”“落在哪一面”“一共 11 种”都由程序真的折一遍算出来（六连方块一共 35 种，逐个折）。
import * as THREE from 'three';
import { clamp, lerp, easeOut } from './kit/sheet.js';
import { mathActionCue } from './kit/mathActionCue.js';
import { draggable } from './kit/interact.js';
import { sfx, audio } from './kit/audio.js';

const S0 = 0.058, T = 0.0013, GC = S0 / 5;                // 主角每块的边长、纸板厚、后面陈列的每块边长（裁纸垫的细格，五格一粗格）
const COLS = 6, ROWS = 3, HX0 = -3 * S0, HZ0 = -4 * GC;  // 主角的工作区：6 × 3 个粗格
const GRID = { x0: -16 * GC, x1: 16 * GC, z0: -13 * GC, z1: HZ0 + ROWS * S0 };
const MAT = { x0: -0.193, x1: 0.193, z0: -0.158, z1: 0.188 }, MY = 0.003;
const ROWZ = [-10.5 * GC, -6.5 * GC];                      // 陈列：后排（四个连成一行的）、前排（其余的）
const CAPZ = [0.134, 0.183];                              // 此刻那一句：印在裁纸垫前沿的空白处
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const TEXTBOOK = [[1, 1], [2, 1], [3, 1], [4, 1], [1, 0], [3, 2]];          // 课本粉笔盒的那张展开图（四个一行，上一个、下一个）
const DREAM = [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]];             // 习题：中 国 梦 / 我 的 梦
const DREAM_CH = ['中', '国', '梦', '我', '的', '梦'];

// ================= 展开图的计算（纯几何，不靠摆样子） =================
const has = (cells, x, z) => cells.some((c) => c[0] === x && c[1] === z);
const SYM = [(x, z) => [x, z], (x, z) => [-x, z], (x, z) => [x, -z], (x, z) => [-x, -z], (x, z) => [z, x], (x, z) => [-z, x], (x, z) => [z, -x], (x, z) => [-z, -x]];
const norm = (cells) => { const mx = Math.min(...cells.map((c) => c[0])), mz = Math.min(...cells.map((c) => c[1])); return cells.map((c) => [c[0] - mx, c[1] - mz]).sort((a, b) => a[1] - b[1] || a[0] - b[0]); };
const str = (cells) => cells.map((c) => c[0] + ',' + c[1]).join(' ');
/** 转一转、翻过来能重合的算同一种：取 8 种摆法里最小的写法当名字；陈列时用横着放的那种摆法 */
function canon(cells) {
  let key = null, disp = null, dk = null;
  for (const f of SYM) { const n = norm(cells.map((c) => f(c[0], c[1]))), s = str(n), w = Math.max(...n.map((c) => c[0])) + 1, h = Math.max(...n.map((c) => c[1])) + 1;
    if (key === null || s < key) key = s; if (w >= h && (dk === null || s < dk)) { dk = s; disp = n; } }
  return { key, disp };
}
/** 折的时候留在桌上不动的那一块：邻居最多的，一样多取离中心近的 */
function rootOf(cells) {
  const cx = cells.reduce((a, c) => a + c[0], 0) / cells.length, cz = cells.reduce((a, c) => a + c[1], 0) / cells.length;
  let best = 0, bs = -1e9;
  cells.forEach((c, i) => { const deg = DIRS.filter(([dx, dz]) => has(cells, c[0] + dx, c[1] + dz)).length, sc = deg * 1e4 - Math.round(Math.hypot(c[0] - cx, c[1] - cz) * 100) * 10 - c[1] * 0.1 - c[0] * 0.01; if (sc > bs) { bs = sc; best = i; } });
  return best;
}
function tree(cells, root) {
  const par = cells.map(() => -2), order = [root]; par[root] = -1; const q = [root];
  while (q.length) { const i = q.shift(); cells.forEach((c, j) => { if (par[j] !== -2) return; if (Math.abs(c[0] - cells[i][0]) + Math.abs(c[1] - cells[i][1]) === 1) { par[j] = i; q.push(j); order.push(j); } }); }
  return { par, order };
}
const _r = new THREE.Matrix4(), _t = new THREE.Matrix4();
/** 每一块相对“桌上那一块”的摆放：每条压痕都往上折 ang(i) 弧度（谷折，里面朝里） */
function frames(cells, tr, s, ang, out) {
  for (const i of tr.order) { const p = tr.par[i]; if (p < 0) { out[i].identity(); continue; }
    const dx = cells[i][0] - cells[p][0], dz = cells[i][1] - cells[p][1], a = ang(i);
    _t.makeTranslation((dx * s) / 2, 0, (dz * s) / 2);
    if (dx) _r.makeRotationZ(dx > 0 ? a : -a); else _r.makeRotationX(dz > 0 ? -a : a);
    out[i].copy(out[p]).multiply(_t).multiply(_r).multiply(_t); }
}
const POS = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
const NRM = { px: [1, 0, 0], nx: [-1, 0, 0], py: [0, 1, 0], ny: [0, -1, 0], pz: [0, 0, 1], nz: [0, 0, -1] };
const OPP = { px: 'nx', nx: 'px', py: 'ny', ny: 'py', pz: 'nz', nz: 'pz' };
/** 真的折一遍：每一块落在正方体的哪一面；有没有两块落在一处（另一面就空着）；有没有田字（四块围着一个点） */
function fold90(cells, root) {
  const tr = tree(cells, root), M = cells.map(() => new THREE.Matrix4()), v = new THREE.Vector3();
  frames(cells, tr, 1, () => Math.PI / 2, M);
  const land = M.map((m) => { v.setFromMatrixPosition(m); v.y -= 0.5; const a = [Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)], k = a.indexOf(Math.max(...a)); return k === 0 ? (v.x > 0 ? 'px' : 'nx') : k === 1 ? (v.y > 0 ? 'py' : 'ny') : v.z > 0 ? 'pz' : 'nz'; });
  return { tr, M, land };
}
const SEEN = { pz: 4, py: 3, px: 2, nx: 0, nz: 0, ny: 0 };          // 从镜头（右前上方）看得见哪一面
function judge(cells) {
  let root = rootOf(cells), F = fold90(cells, root);
  const gapOf = (land) => POS.filter((p) => !land.includes(p));
  if (gapOf(F.land).length) {          // 折不成：换一块留在桌上，让空着的那一面朝着人（前面或上面），后果看得见
    let best = -1;
    cells.forEach((_, r) => { const G = fold90(cells, r), g = gapOf(G.land), dupSeen = G.land.some((p, i) => G.land.indexOf(p) !== i && SEEN[p] >= 3) ? 1 : 0, sc = Math.max(...g.map((p) => SEEN[p])) * 10 + dupSeen * 3 + (r === root ? 1 : 0); if (sc > best) { best = sc; F = G; F.root = r; } });
    root = F.root;
  }
  const { tr, M, land } = F;
  const v = new THREE.Vector3();
  const q = new THREE.Quaternion(), inv = new THREE.Quaternion();
  // 外面印的字要正着：这一面上“世界的上方”在纸板的哪个方向
  const up = M.map((m, i) => { m.decompose(v, q, new THREE.Vector3()); inv.copy(q).invert(); const w = land[i] === 'py' || land[i] === 'ny' ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0); w.applyQuaternion(inv); return [Math.round(w.x), Math.round(w.z)]; });
  let vtx = null; for (const c of cells) if (has(cells, c[0] + 1, c[1]) && has(cells, c[0], c[1] + 1) && has(cells, c[0] + 1, c[1] + 1)) { vtx = [c[0] + 0.5, c[1] + 0.5]; break; }
  const cnt = {}; land.forEach((p) => { cnt[p] = (cnt[p] || 0) + 1; });
  const leaf = (i) => !tr.par.includes(i), rank = land.map(() => 0);          // 撞在一起的几块：先落的贴住，后到的（尽量是没有别的块挂着的那一块）翘着
  for (const p of POS) { const g = land.map((x, i) => (x === p ? i : -1)).filter((i) => i >= 0).sort((a, b) => leaf(a) - leaf(b)); g.forEach((i, k) => { rank[i] = k; }); }
  const gap = POS.filter((p) => !cnt[p]);
  return { root, tr, land, up, vtx, rank, dup: land.map((p) => cnt[p] > 1), gap, kind: vtx ? 'block' : gap.length ? 'overlap' : 'ok' };
}
/** 最长的一行（或一列）连着几个：4 → 四个连成一行的那一族 */
function run(cells) { let best = 1; for (const c of cells) for (const [dx, dz] of [[1, 0], [0, 1]]) { if (has(cells, c[0] - dx, c[1] - dz)) continue; let k = 1; while (has(cells, c[0] + dx * k, c[1] + dz * k)) k++; best = Math.max(best, k); } return best; }
/** 六个正方形连在一起，一共有几种（35 种）；逐个真的折一遍，能折成正方体的有几种（11 种） */
const ALL = (() => {
  let cur = new Map([['0,0', [[0, 0]]]]);
  for (let n = 2; n <= 6; n++) { const nx = new Map(); for (const cells of cur.values()) for (const c of cells) for (const [dx, dz] of DIRS) { const p = [c[0] + dx, c[1] + dz]; if (has(cells, p[0], p[1])) continue; const nc = [...cells, p], k = canon(nc).key; if (!nx.has(k)) nx.set(k, norm(nc)); } cur = nx; }
  const nets = []; for (const [k, cells] of cur) if (judge(cells).kind === 'ok') nets.push({ key: k, cells, fam: run(cells) === 4 ? 0 : 1 });
  return { hexominoes: cur.size, nets };
})();

export default {
  id: 'zhankai',
  fig: '图6.1-9',
  title: '正方体的展开图',
  flow: 'explore',
  ask: '要做一只正方体的粉笔盒，先得把硬纸板裁好。<br>纸板要裁成什么形状？能裁出几种？',
  need: '先把粉笔盒打开，铺平看看。',
  conclusion: {
    page: 159, rect: [68, 427, 476, 669],
    quote: '有些立体图形是由一些平面图形围成的，将它们的表面适当展开，可以展开成平面图形．这样的平面图形称为相应立体图形的展开图．',
    why: '课本上的粉笔盒是长方体，这里把它换成正方体，只看 6 个面怎么排。正方体由 6 个正方形围成，沿着一些棱剪开铺平，就得到它的展开图；把展开图折起来，又围成原来的正方体。同一个正方体，换一种剪法，可能得到另一种展开图。<br><br>不是 6 个正方形连在一起就都能折成正方体：折一折，有两个面重在一起，另一面就空着；四个正方形围着一个点（田字形）折不起来，因为正方体的每个顶点处只有 3 个面。<br><br>折成正方体后相对的两个面，在展开图上不相邻；同一行（或同一列）里连着三个面时，两头的两个面相对。课本习题里“中国梦 我的梦”那张展开图，有“的”字一面的相对面上是“国”。<br><br>转一转、翻过来能重合的算同一种，正方体的展开图一共有 11 种：四个面连成一行的 6 种，其余 5 种。',
    src: '课本 · 6.1.1 立体图形与平面图形（粉笔盒的展开图；正方体展开图见本节练习、习题）',
  },

  create({ aim, tag, camera }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    let ui = null, dead = false;
    const T0 = performance.now(), now = () => (performance.now() - T0) / 1000;
    const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    const basic = (o) => new THREE.MeshBasicMaterial(o);
    const lit = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o });
    const quiet = (m) => { m.raycast = () => {}; m.userData.noFrame = true; return m; };
    const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
    const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
    const GOLD = 0xffc83d, BLUE = 0x58c4dd, TEAL = 0x5cd0b3, RED = 0xfc6255, WHITE = 0xffffff;
    const PAIR = { py: GOLD, ny: GOLD, pz: BLUE, nz: BLUE, px: TEAL, nx: TEAL };          // 三对相对的面：上下、前后、左右
    const UP = new THREE.Vector3(0, 1, 0);
    const cellPos = (c) => new THREE.Vector3(HX0 + (c[0] + 0.5) * S0, MY + T, HZ0 + (c[1] + 0.5) * S0);

    // ================= 裁纸垫：深灰绿的垫子，细格 1.5、粗格 4.5（主角的每一块正好盖住一个粗格） =================
    const MW = MAT.x1 - MAT.x0, MD = MAT.z1 - MAT.z0;
    const matTex = tex(2048, Math.round((2048 * MD) / MW), (g, w, h) => {
      const X = (x) => ((x - MAT.x0) / MW) * w, Z = (z) => ((z - MAT.z0) / MD) * h;
      g.fillStyle = '#3c4744'; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 60; k++) { const x = Math.random() * w, y = Math.random() * h, r = 80 + Math.random() * 220, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${Math.random() < 0.5 ? '90,104,98' : '40,48,46'},0.18)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
      for (let k = 0; k < 9000; k++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '20,26,24' : '120,134,128'},${Math.random() * 0.12})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); }
      for (let k = 0; k < 26; k++) { g.strokeStyle = `rgba(150,164,158,${0.05 + Math.random() * 0.06})`; g.lineWidth = 1; const x = Math.random() * w, y = Math.random() * h, a = Math.random() * 6.3, l = 30 + Math.random() * 120; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }          // 刀划过的细痕
      const gx0 = GRID.x0, gx1 = GRID.x1, gz0 = GRID.z0, gz1 = GRID.z1;
      for (let k = Math.round(gx0 / GC); k * GC <= gx1 + 1e-9; k++) { const bold = k % 5 === 0; g.strokeStyle = bold ? 'rgba(222,232,226,0.34)' : 'rgba(222,232,226,0.14)'; g.lineWidth = bold ? 2.6 : 1.3; g.beginPath(); g.moveTo(X(k * GC), Z(gz0)); g.lineTo(X(k * GC), Z(gz1)); g.stroke(); }
      for (let k = Math.round(gz0 / GC); k * GC <= gz1 + 1e-9; k++) { const bold = (k + 4) % 5 === 0; g.strokeStyle = bold ? 'rgba(222,232,226,0.34)' : 'rgba(222,232,226,0.14)'; g.lineWidth = bold ? 2.6 : 1.3; g.beginPath(); g.moveTo(X(gx0), Z(k * GC)); g.lineTo(X(gx1), Z(k * GC)); g.stroke(); }
      g.strokeStyle = 'rgba(222,232,226,0.4)'; g.lineWidth = 3; g.strokeRect(X(MAT.x0 + 0.005), Z(MAT.z0 + 0.005), X(MAT.x1 - 0.005) - X(MAT.x0 + 0.005), Z(MAT.z1 - 0.005) - Z(MAT.z0 + 0.005));
    });
    matTex.wrapS = matTex.wrapT = THREE.ClampToEdgeWrapping; matTex.repeat.set(1 / MW, 1 / MD); matTex.offset.set(-MAT.x0 / MW, MAT.z1 / MD);
    { const r = 0.012, sh = new THREE.Shape(), x0 = MAT.x0, x1 = MAT.x1, y0 = -MAT.z1, y1 = -MAT.z0;          // 形状的 y = −z
      sh.moveTo(x0 + r, y0); sh.lineTo(x1 - r, y0); sh.quadraticCurveTo(x1, y0, x1, y0 + r); sh.lineTo(x1, y1 - r); sh.quadraticCurveTo(x1, y1, x1 - r, y1); sh.lineTo(x0 + r, y1); sh.quadraticCurveTo(x0, y1, x0, y1 - r); sh.lineTo(x0, y0 + r); sh.quadraticCurveTo(x0, y0, x0 + r, y0);
      const g = new THREE.ExtrudeGeometry(sh, { depth: MY - 0.0008, bevelEnabled: true, bevelThickness: 0.0004, bevelSize: 0.0006, bevelSegments: 2, curveSegments: 6 }); g.rotateX(-Math.PI / 2); g.translate(0, 0.0004, 0);
      const m = new THREE.Mesh(g, [lit({ map: matTex, roughness: 0.92 }), lit({ color: 0x2f3836, roughness: 0.8 })]); m.receiveShadow = true; m.raycast = () => {}; m.userData.qaSupport = true; group.add(m); }

    // ================= 硬纸板：里面牛皮纸色，外面印着粉笔盒的图样（和课本的粉笔盒一样：橙色的“粉笔”标、侧面斜条纹） =================
    const kraftTex = tex(256, 256, (g, w, h) => { g.fillStyle = '#b98c5c'; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 900; k++) { g.strokeStyle = `rgba(${Math.random() < 0.5 ? '120,84,48' : '222,190,146'},${0.08 + Math.random() * 0.14})`; g.lineWidth = 0.6 + Math.random(); const x = Math.random() * w, y = Math.random() * h, a = Math.random() * 6.3, l = 3 + Math.random() * 10; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
      const gr = g.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.75); gr.addColorStop(0, 'rgba(255,240,210,0.06)'); gr.addColorStop(1, 'rgba(80,50,20,0.16)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const paper = (g, w, h, col = '#f1e7d0') => { g.fillStyle = col; g.fillRect(0, 0, w, h); for (let k = 0; k < 1600; k++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '150,128,96' : '255,255,255'},${Math.random() * 0.07})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 2); } };
    const blob = (g, cx, cy, rx, ry, col) => { g.fillStyle = col; g.beginPath(); for (let k = 0; k <= 48; k++) { const a = (k / 48) * Math.PI * 2, r = 1 + 0.06 * Math.sin(a * 3 + 0.6) + 0.04 * Math.cos(a * 5); const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r * (1 + 0.08 * Math.cos(a)); if (k) g.lineTo(x, y); else g.moveTo(x, y); } g.closePath(); g.fill(); };
    const SANS = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
    const PRINT = {
      label: (g, w, h) => { paper(g, w, h); blob(g, w * 0.5, h * 0.56, w * 0.36, h * 0.2, '#e58a3e'); g.save(); g.translate(w * 0.5, h * 0.57); g.rotate(-0.06); g.fillStyle = '#fff8ec'; g.font = `700 ${Math.round(w * 0.2)}px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('粉笔', 0, 0); g.restore();
        g.fillStyle = 'rgba(205,120,52,0.9)'; g.fillRect(w * 0.08, h * 0.12, w * 0.84, h * 0.025); g.fillRect(w * 0.08, h * 0.86, w * 0.84, h * 0.025); },
      stripe: (g, w, h) => { paper(g, w, h); g.save(); g.beginPath(); g.rect(0, 0, w, h); g.clip(); g.strokeStyle = 'rgba(196,150,100,0.75)'; g.lineWidth = w * 0.05; for (let k = -6; k < 12; k++) { g.beginPath(); g.moveTo(k * w * 0.16, h); g.lineTo(k * w * 0.16 + w * 0.6, 0); g.stroke(); } g.restore(); },
      top: (g, w, h) => { paper(g, w, h); blob(g, w * 0.5, h * 0.5, w * 0.32, h * 0.22, '#f1b678'); g.fillStyle = 'rgba(255,246,230,0.95)'; g.font = `700 ${Math.round(w * 0.15)}px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('粉笔', w * 0.5, h * 0.5); },
      plain: (g, w, h) => paper(g, w, h),
    };
    const KIND = { pz: 'label', nz: 'label', px: 'stripe', nx: 'stripe', py: 'top', ny: 'plain' };
    const printBase = {}; for (const k in PRINT) printBase[k] = tex(512, 512, PRINT[k]);
    const printCache = new Map();
    const printTex = (kind, up) => { const phi = Math.atan2(-up[0], up[1]), key = kind + ':' + Math.round((phi * 2) / Math.PI); if (!printCache.has(key)) { const t = printBase[kind].clone(); t.center.set(0.5, 0.5); t.rotation = phi; t.needsUpdate = true; printCache.set(key, t); } return printCache.get(key); };
    const outMatCache = new Map();
    const outMat = (kind, up) => { const t = printTex(kind, up), key = t.uuid; if (!outMatCache.has(key)) outMatCache.set(key, lit({ map: t, roughness: 0.7 })); return outMatCache.get(key); };
    const kraftMat = lit({ map: kraftTex, roughness: 0.93 }), edgeMat = lit({ color: 0xcdb38a, roughness: 0.9 });

    // ================= 数学的线：亮的芯、一圈加色的光晕、底下一层淡淡的暗影（压在牛皮纸和深色垫子上都跳出来） =================
    const coreTex = tex(64, 4, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); for (const [o, a] of [[0, 0], [0.18, 0.6], [0.3, 1], [0.7, 1], [0.82, 0.6], [1, 0]]) gr.addColorStop(o, `rgba(255,255,255,${a})`); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const glowTex = tex(64, 4, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); for (let k = 0; k <= 10; k++) { const x = k / 10, d = (x - 0.5) / 0.22; gr.addColorStop(x, `rgba(255,255,255,${Math.exp(-d * d * 0.5).toFixed(3)})`); } g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    coreTex.colorSpace = glowTex.colorSpace = THREE.NoColorSpace;
    /** 平躺在 y 高度的一串线段（局部 xz 平面里），dash > 0 画成虚线 */
    const quads = (segs, hw, y, dash = 0) => { const pos = [], uv = [];
      const q = (ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1, nx = (-dz / L) * hw, nz = (dx / L) * hw; pos.push(ax + nx, y, az + nz, ax - nx, y, az - nz, bx + nx, y, bz + nz, bx + nx, y, bz + nz, ax - nx, y, az - nz, bx - nx, y, bz - nz); uv.push(0, 0.5, 1, 0.5, 0, 0.5, 0, 0.5, 1, 0.5, 1, 0.5); };
      for (const [ax, az, bx, bz] of segs) { const L = Math.hypot(bx - ax, bz - az); if (!dash) { const ex = ((bx - ax) / L) * hw * 0.9, ez = ((bz - az) / L) * hw * 0.9; q(ax - ex, az - ez, bx + ex, bz + ez); continue; } for (let t = 0; t < L - 1e-6; t += dash * 2) { const t1 = Math.min(L, t + dash); q(ax + ((bx - ax) * t) / L, az + ((bz - az) * t) / L, ax + ((bx - ax) * t1) / L, az + ((bz - az) * t1) / L); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return g; };
    const lineSet = (parent, color, w, { glow = 0.4, shadow = 0.3, dash = 0, order = 6, y = 0.0003 } = {}) => {
      const mk = (map, col, op, ord, blending = THREE.NormalBlending) => { const m = quiet(new THREE.Mesh(new THREE.BufferGeometry(), basic({ color: col, map, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide, blending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }))); m.renderOrder = ord; parent.add(m); return m; };
      const sh = shadow ? mk(glowTex, 0x0d1014, shadow, order - 2) : null, gl = glow ? mk(glowTex, color, glow, order - 1, THREE.AdditiveBlending) : null, co = mk(coreTex, color, 1, order);
      return { co, gl, sh, k: 1,
        set(segs) { for (const [m, hw, yy, d] of [[co, w / 2, y + 0.0001, dash], [gl, w * 2.4, y + 0.00005, 0], [sh, w * 1.6, y, 0]]) { if (!m) continue; m.geometry.dispose(); m.geometry = segs && segs.length ? quads(segs, hw, yy, d) : new THREE.BufferGeometry(); } },
        fade(k) { this.k = k; co.material.opacity = k; if (gl) gl.material.opacity = glow * k; if (sh) sh.material.opacity = shadow * k; co.visible = k > 0.005; if (gl) gl.visible = co.visible; if (sh) sh.visible = co.visible; },
        color(c) { co.material.color.set(c); if (gl) gl.material.color.set(c); } };
    };
    const discGeo = new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2);
    const dotTex = tex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    /** 发光的圆点：光晕、暗边、实心 */
    const dot = (parent, r) => { const g = new THREE.Group(), glow = quiet(new THREE.Mesh(discGeo, basic({ map: dotTex, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }))), rim = quiet(new THREE.Mesh(discGeo, basic({ color: 0x0e1418, transparent: true, opacity: 0.5, depthWrite: false }))), core = quiet(new THREE.Mesh(discGeo, basic({ transparent: true, depthWrite: false })));
      glow.scale.setScalar(r * 3.4); rim.scale.setScalar(r * 1.32); core.scale.setScalar(r); rim.position.y = 0.00006; core.position.y = 0.00012; glow.renderOrder = 7; rim.renderOrder = 8; core.renderOrder = 9; g.add(glow, rim, core); g.visible = false; parent.add(g);
      g.userData.set = (col) => { glow.material.color.set(col); core.material.color.set(col); }; return g; };

    // ================= 一块纸板（一个面）：里、外两层纸面，中间是纸芯的边 =================
    const geoCache = new Map();
    const faceGeos = (s) => { if (!geoCache.has(s)) { const e = s - 0.0006; geoCache.set(s, { inside: new THREE.PlaneGeometry(e, e).rotateX(-Math.PI / 2).translate(0, 0.00002, 0), outside: new THREE.PlaneGeometry(e, e).rotateX(Math.PI / 2).translate(0, -T - 0.00002, 0), edge: new THREE.BoxGeometry(e, T, e).translate(0, -T / 2, 0), char: new THREE.PlaneGeometry(e * 0.8, e * 0.8).rotateX(-Math.PI / 2).translate(0, 0.0005, 0) }); } return geoCache.get(s); };
    const makeFace = (parent, s, own) => {
      const G = faceGeos(s), f = new THREE.Group(); f.matrixAutoUpdate = false;
      const inM = own ? lit({ map: kraftTex, roughness: 0.93, emissive: RED, emissiveIntensity: 0 }) : kraftMat;
      const inside = new THREE.Mesh(G.inside, inM), outside = new THREE.Mesh(G.outside, own ? lit({ roughness: 0.7, emissive: RED, emissiveIntensity: 0 }) : outMat('plain', [0, 1])), edge = new THREE.Mesh(G.edge, edgeMat);
      for (const m of [inside, outside, edge]) { m.castShadow = true; m.receiveShadow = true; m.userData.noFrame = true; f.add(m); }
      if (!own) for (const m of [inside, outside, edge]) m.raycast = () => {};
      f.userData = { inside, outside, edge, s };
      parent.add(f); return f; };

    // ================= 主角：六块纸板（粉笔盒） =================
    const hero = new THREE.Group(); group.add(hero);
    const HF = Array.from({ length: 6 }, () => { const f = makeFace(hero, S0, true);
      f.userData.cut = lineSet(f, WHITE, 0.0011, { glow: 0.3, shadow: 0.34 });
      f.userData.crease = lineSet(f, WHITE, 0.0008, { glow: 0.2, shadow: 0.2, dash: 0.0032 });
      f.userData.dot = dot(f, 0.0021); f.userData.dot.position.y = 0.0004;
      const ch = quiet(new THREE.Mesh(faceGeos(S0).char, basic({ transparent: true, depthWrite: false, opacity: 0 }))); ch.renderOrder = 6; ch.visible = false; f.add(ch); f.userData.ch = ch;
      f.userData.pick = true; return f; });
    const disp = HF.map(() => new THREE.Vector3());          // 平放时每一块显示的位置（挪动、整体挪正时滑过去）
    const FM = HF.map(() => new THREE.Matrix4()), tmpM = new THREE.Matrix4(), tmpV = new THREE.Vector3();
    const charTex = DREAM_CH.map((c) => tex(256, 256, (g, w, h) => { g.font = `600 ${Math.round(w * 0.62)}px "Songti SC","STSong","SimSun",serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(52,30,14,0.9)'; g.fillText(c, w / 2, h * 0.53); }));
    // 挪的时候，要落的那个空格：白色虚线框
    const ghost = new THREE.Group(); ghost.visible = false; group.add(ghost);
    { const h = S0 / 2 - 0.0012, gl = lineSet(ghost, WHITE, 0.0012, { glow: 0.45, shadow: 0.25, dash: 0.003, order: 12 }); gl.set([[-h, -h, h, -h], [h, -h, h, h], [h, h, -h, h], [-h, h, -h, -h]]);
      const fill = quiet(new THREE.Mesh(new THREE.PlaneGeometry(S0 - 0.003, S0 - 0.003).rotateX(-Math.PI / 2), basic({ color: WHITE, transparent: true, opacity: 0.08, depthWrite: false }))); fill.renderOrder = 5; ghost.add(fill); }
    // 折不成的后果：空着的那一面（红色虚线框）、田字中间的那个点（红点）
    const gaps = Array.from({ length: 3 }, () => { const g = new THREE.Group(); g.visible = false; hero.add(g); const h = S0 / 2 - 0.001, l = lineSet(g, RED, 0.0016, { glow: 0.6, shadow: 0.2, dash: 0.0034, order: 14 }); l.set([[-h, -h, h, -h], [h, -h, h, h], [h, h, -h, h], [-h, h, -h, -h]]);
      const fill = quiet(new THREE.Mesh(new THREE.PlaneGeometry(S0 - 0.003, S0 - 0.003).rotateX(-Math.PI / 2), basic({ color: RED, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }))); fill.renderOrder = 13; g.add(fill); g.userData.l = l; g.userData.fill = fill; return g; });
    const vtxDot = dot(group, 0.0034); vtxDot.userData.set(RED);
    // 合上的那一下：七条接缝亮一下，粉笔灰扑出来
    const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true);
    const seams = Array.from({ length: 7 }, () => { const c = quiet(new THREE.Mesh(cylGeo, basic({ color: 0xfff6dc, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }))); c.renderOrder = 15; hero.add(c); return c; });
    const setSeg = (m, a, b, r) => { tmpV.copy(b).sub(a); const L = tmpV.length(); if (L < 1e-6) { m.visible = false; return; } m.visible = true; m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UP, tmpV.divideScalar(L)); m.scale.set(r, L, r); };
    const puffTex = tex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); });
    const puffs = Array.from({ length: 16 }, () => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: 0xf8f6f0, transparent: true, depthWrite: false, opacity: 0 }))); sp.renderOrder = 16; group.add(sp); return { sp, t0: -9, p: new THREE.Vector3(), v: new THREE.Vector3() }; });
    // 相对的两个面：一条发光的线把两个面的中心连起来（折起来是穿过盒子中心的轴，打开就躺在展开图上）
    const NS = 24, NR = 6;          // 一条弯管：NS 段、每圈 NR 个点；每帧只改顶点，不新建几何体
    const tubeGeo = () => { const g = new THREE.BufferGeometry(), idx = []; g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((NS + 1) * NR * 3), 3)); for (let k = 0; k < NS; k++) for (let r = 0; r < NR; r++) { const a = k * NR + r, b = k * NR + ((r + 1) % NR), c = a + NR, d = b + NR; idx.push(a, c, b, b, c, d); } g.setIndex(idx); return g; };
    const _A = new THREE.Vector3(), _B = new THREE.Vector3(), _C = new THREE.Vector3(), _P = new THREE.Vector3(), _T = new THREE.Vector3(), _N = new THREE.Vector3(), _W = new THREE.Vector3();
    const bez = (a, c, b, k, out) => out.copy(a).multiplyScalar((1 - k) * (1 - k)).addScaledVector(c, 2 * k * (1 - k)).addScaledVector(b, k * k);
    const setTube = (m, a, c, b, rad) => { const pos = m.geometry.attributes.position;
      for (let k = 0; k <= NS; k++) { const u = k / NS; bez(a, c, b, u, _P); _T.copy(c).sub(a).multiplyScalar(2 * (1 - u)).addScaledVector(_W.copy(b).sub(c), 2 * u).normalize(); _N.set(0, 1, 0); if (Math.abs(_T.y) > 0.9) _N.set(1, 0, 0); _N.cross(_T).normalize(); _W.copy(_T).cross(_N);
        for (let r = 0; r < NR; r++) { const ang = (r / NR) * Math.PI * 2, x = Math.cos(ang) * rad, y = Math.sin(ang) * rad; pos.setXYZ(k * NR + r, _P.x + _N.x * x + _W.x * y, _P.y + _N.y * x + _W.y * y, _P.z + _N.z * x + _W.z * y); } }
      pos.needsUpdate = true; m.geometry.computeBoundingSphere(); m.visible = true; };
    const pairLine = (col) => { const mk = (o, ord) => { const m = quiet(new THREE.Mesh(tubeGeo(), basic({ color: col, transparent: true, depthWrite: false, ...o }))); m.renderOrder = ord; m.visible = false; m.frustumCulled = false; group.add(m); return m; };
      const ends = [0, 1].map(() => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))); sp.renderOrder = 19; sp.visible = false; group.add(sp); return sp; });
      return { core: mk({}, 17), glow: mk({ opacity: 0.3, blending: THREE.AdditiveBlending }, 16), xray: mk({ opacity: 0.4, depthTest: false }, 18), ends, col }; };
    const PL = { y: pairLine(GOLD), z: pairLine(BLUE), x: pairLine(TEAL) };

    // ================= 陈列：找到的一种种排在后面（后排：四个连成一行的；前排：其余的），旁边写上第几种 =================
    const galRoot = new THREE.Group(); group.add(galRoot);
    const gal = [];
    const measure = (font, txt) => { const g = document.createElement('canvas').getContext('2d'); g.font = font; return g.measureText(txt).width; };
    const labTex = (txt, col, px = 72) => { const f = `600 ${px}px "Times New Roman","Songti SC",serif`; return tex(Math.ceil(measure(f, txt)) + 40, Math.round(px * 1.5), (g, w, h) => { g.font = f; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = px * 0.2; g.strokeStyle = 'rgba(14,18,22,0.75)'; g.strokeText(txt, w / 2, h / 2 + 2); g.fillStyle = col; g.fillText(txt, w / 2, h / 2 + 2); }); };
    const label = (txt, col, hgt) => { const t = labTex(txt, col), sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }))); sp.renderOrder = 30; sp.scale.set((hgt * t.image.width) / t.image.height, hgt, 1); return sp; };
    function addGal(cells, key) {
      const { disp: dc } = canon(cells), fam = run(dc) === 4 ? 0 : 1, J = judge(dc), item = { key, fam, cells: dc, J, faces: [], f: 0, fT0: -9, born: now(), x: 0, tx: 0, z: ROWZ[fam], w: Math.max(...dc.map((c) => c[0])) + 1, h: Math.max(...dc.map((c) => c[1])) + 1, M: dc.map(() => new THREE.Matrix4()), g: new THREE.Group() };
      galRoot.add(item.g);
      for (let i = 0; i < 6; i++) { const f = makeFace(item.g, GC, false); f.userData.outside.material = outMat(KIND[J.land[i]], J.up[i]); const h = GC / 2 - 0.0006, segs = [];
        for (const [dx, dz] of DIRS) if (!has(dc, dc[i][0] + dx, dc[i][1] + dz)) segs.push(dx ? [dx * h, -h, dx * h, h] : [-h, dz * h, h, dz * h]);
        f.userData.cut = lineSet(f, WHITE, 0.0005, { glow: 0.22, shadow: 0.25 }); f.userData.cut.set(segs);
        f.userData.dot = dot(f, 0.0011); f.userData.dot.position.y = 0.0003; f.userData.dot.userData.set(PAIR[J.land[i]]); f.userData.dot.visible = S.opp;
        item.faces.push(f); }
      item.num = label(String(gal.length + 1), '#ffffff', 0.0118); galRoot.add(item.num);
      gal.push(item); arrangeGal(); item.x = item.tx; return item;
    }
    function arrangeGal() {
      for (const fam of [0, 1]) { const row = gal.filter((g) => g.fam === fam), W = row.reduce((a, g) => a + g.w, 0) + Math.max(0, row.length - 1); let x = -Math.round(W / 2);
        for (const g of row) { g.tx = (x + g.w / 2) * GC; x += g.w + 1; } }
    }
    function layoutGal(t) {
      for (const it of gal) {
        it.x += (it.tx - it.x) * 0.15;
        const k = it.fT0 > 0 ? ease(clamp((t - it.fT0) / 0.75, 0, 1)) : it.f, born = easeOut(clamp((t - it.born) / 0.45, 0, 1));
        it.f = k; frames(it.cells, it.J.tr, GC, () => (k * Math.PI) / 2, it.M);
        const rc = it.cells[it.J.root], sk = smooth(0.8, 1, k), ox = it.x + (rc[0] + 0.5 - it.w / 2) * GC * (1 - sk), oz = it.z + (rc[1] + 0.5 - it.h / 2) * GC * (1 - sk);
        it.g.position.set(ox, MY + T, oz); it.g.scale.setScalar(0.6 + 0.4 * born);
        it.faces.forEach((f, i) => { f.matrix.copy(it.M[i]); f.matrixWorldNeedsUpdate = true; });
        it.num.position.set(it.x - ((it.w / 2) * (1 - sk) + 0.5 * sk) * GC - GC * 0.55, MY + 0.004 + 0.003 * sk, it.z + 0.001); it.num.material.opacity = born;
      }
    }

    // ================= 此刻那一句：印在裁纸垫前沿的空白处（像垫子上印的字），不挡图 =================
    const CAPW = MAT.x1 - MAT.x0 - 0.02, CW = 2048, CH = Math.round((CW * (CAPZ[1] - CAPZ[0])) / CAPW);
    const capMesh = quiet(new THREE.Mesh(new THREE.PlaneGeometry(CAPW, CAPZ[1] - CAPZ[0]).rotateX(-Math.PI / 2), basic({ transparent: true, opacity: 0, depthWrite: false })));
    capMesh.position.set(0, MY + 0.0002, (CAPZ[0] + CAPZ[1]) / 2); capMesh.renderOrder = 3; capMesh.visible = false; group.add(capMesh);
    const capTex = (big, small) => tex(CW, CH, (g, w, h) => {
      const fb = (f) => `600 ${Math.round(h * 0.4 * f)}px "Songti SC","STSong","Times New Roman",serif`, fs = (f) => `500 ${Math.round(h * 0.25 * f)}px "Songti SC","STSong","Times New Roman",serif`;
      let f = 1; for (; f > 0.45; f -= 0.04) { g.font = fb(f); const wb = g.measureText(big).width; g.font = fs(f); const ws = small ? g.measureText(small).width : 0; if (Math.max(wb, ws) < w - h * 0.8) break; }
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = fb(f); g.fillStyle = '#f6efdf'; g.fillText(big, w / 2, small ? h * 0.37 : h * 0.5); if (small) { g.font = fs(f); g.fillStyle = 'rgba(232,226,210,0.86)'; g.fillText(small, w / 2, h * 0.76); } });
    const cap = { key: '', born: -9, out: 1e9, next: null };
    function clearFoldResult() { if (cap.failed) { cap.key = ''; cap.next = null; cap.out = 1e9; cap.failed = false; capMesh.visible = false; S.cap = []; } }
    function caption(big, small = '', failed = false) { const key = big + '|' + small; cap.failed = failed; if (key === cap.key) return; cap.key = key; S.cap = [big, small];
      const show = () => { capMesh.material.map?.dispose?.(); capMesh.material.map = capTex(big, small); capMesh.material.needsUpdate = true; capMesh.visible = true; cap.born = now(); cap.out = 1e9; };
      if (capMesh.visible && now() - cap.born > 0.2) { cap.out = now(); cap.next = show; } else show(); }
    const prompt = (txt) => { S.ask = txt; if (ui?.status) ui.status(txt); };

    // ================= 板书：学生做出一样，就用课本的话写一行；只写已经发现的 =================
    const css = document.createElement('style');
    css.textContent = `
.zk-board{margin:4px 0 6px;display:flex;flex-direction:column;gap:8px;font:15px/1.7 "Kaiti SC","STKaiti","Songti SC",serif;color:#2b2722}
.zk-board .zb-row{opacity:0;transform:translateY(5px);transition:opacity .5s,transform .5s,background-color 2.4s;padding:3px 8px 3px 6px;border-radius:5px;border-left:3px solid transparent}
.zk-board .zb-row.in{opacity:1;transform:none}
.zk-board .zb-row.fresh{background:rgba(255,206,110,.34);border-left-color:#d98a2b}
.zk-board .n{display:inline-block;min-width:1.25em;color:#b0532a;font-weight:700}
.zk-board b{color:#8a2f1d}
.zk-board .gd{color:#c98600;font-weight:600}.zk-board .bl{color:#2589b0;font-weight:600}.zk-board .tl{color:#1a9a82;font-weight:600}.zk-board .rd{color:#d4402f;font-weight:600}
.zk-board .zb-h{font:600 12px/1.3 "PingFang SC","Hiragino Sans GB",sans-serif;color:#a07a45;letter-spacing:.3em;margin:6px 0 -4px;opacity:0;transition:opacity .4s}
.zk-board .zb-h.in{opacity:1}
.zk-board.review .zb-row[data-k]{cursor:pointer}.zk-board.review .zb-row[data-k]:hover{background:rgba(255,206,110,.16)}
.zk-board .zb-row.sel{background:rgba(255,206,110,.34);border-left-color:#d98a2b}`;
    document.head.append(css);
    let boardEl = null, lastH = ''; const rows = [];
    const reveal = (r) => { const body = boardEl?.closest('.p-body'); if (!body) return; setTimeout(() => { const rb = r.getBoundingClientRect(), bb = body.getBoundingClientRect(); if (rb.bottom > bb.bottom - 14) body.scrollBy({ top: rb.bottom - bb.bottom + 28, behavior: 'smooth' }); }, 80); };
    const board = (html, key = '') => { const r = document.createElement('div'); r.className = 'zb-row'; r.innerHTML = html; r.dataset.k = key; rows.push(r); for (const o of rows) o.classList?.remove('fresh'); if (boardEl) { boardEl.append(r); requestAnimationFrame(() => { r.classList.add('in', 'fresh'); reveal(r); }); } return r; };
    const num = () => `<span class="n">${++S.n}</span>`;
    board.h = (title) => { if (title === lastH) return; lastH = title; const r = document.createElement('div'); r.className = 'zb-h'; r.textContent = title; rows.push(r); if (boardEl) { boardEl.append(r); requestAnimationFrame(() => { r.classList.add('in'); reveal(r); }); } };

    // ================= 状态 =================
    const fresh = () => ({ beat: 'open', cells: TEXTBOOK.map((c) => [...c]), f: 1, anim: null, held: -1, grab: null, slot: null, multi: false, failed: false, blocked: false, overlapSaid: false, n: 0, dupSaid: false, opp: false, oppAt: -9, famSaid: false, found: [], wowAt: -9, dream: false, dreamOpen: false, done: false, tested: '', closedAt: -9, clashAt: -9, vtxAt: -9, seamAt: -9, cap: ['', ''], ask: '', beatAt: 0, hint: 0, pose: '', moves: 0 });
    let S = fresh(), J = judge(S.cells), runId = 0;
    const later = (ms, f) => { const id = runId; setTimeout(() => { if (!dead && id === runId) f(); }, ms); };
    const go = (beat, ask) => { S.beat = beat; S.beatAt = now(); S.hint = 0; if (ask !== undefined) prompt(ask); };

    // 一张展开图换了形状：重新判一遍，压痕、切口的线重画，外面的图样按落在哪一面印
    function relayout() {
      J = judge(S.cells); J.key = canon(S.cells).key;
      HF.forEach((f, i) => { const c = S.cells[i], h = S0 / 2 - 0.0013, cut = [], crease = [];
        for (const [dx, dz] of DIRS) { const seg = dx ? [dx * h, -h, dx * h, h] : [-h, dz * h, h, dz * h], j = S.cells.findIndex((q) => q[0] === c[0] + dx && q[1] === c[1] + dz); if (j < 0) cut.push(seg); else if (j > i) crease.push(seg); }
        f.userData.cut.set(cut); f.userData.crease.set(crease);
        const om = f.userData.outside.material, t = printTex(KIND[J.land[i]], J.up[i]); if (om.map !== t) { om.map = t; om.needsUpdate = true; }
        f.userData.dot.userData.set(PAIR[J.land[i]]);
        const ch = f.userData.ch; ch.visible = S.dream; if (S.dream) { ch.material.map = charTex[i]; ch.material.needsUpdate = true; } });
    }
    function recenter() {
      const xs = S.cells.map((c) => c[0]), zs = S.cells.map((c) => c[1]), w = Math.max(...xs) - Math.min(...xs) + 1, h = Math.max(...zs) - Math.min(...zs) + 1;
      const dx = Math.floor((COLS - w) / 2) - Math.min(...xs), dz = Math.ceil((ROWS - h) / 2) - Math.min(...zs);
      if (dx || dz) S.cells = S.cells.map((c) => [c[0] + dx, c[1] + dz]);
    }
    function setCells(cells, snap = false) { S.cells = cells.map((c) => [...c]); recenter(); relayout(); if (snap) S.cells.forEach((c, i) => disp[i].copy(cellPos(c))); }

    // ---- 折、打开 ----
    function fold() {
      if (S.anim || S.held >= 0) return;
      const t = now(); S.beatAt = t; sfx.whoosh({ dur: 0.7, freq: 1100, gain: 0.035 });
      if (J.kind === 'block') { S.anim = { from: 0, to: 0.16, t0: t, dur: 0.45, done: () => { S.vtxAt = now(); sfx.clink({ freq: 520, gain: 0.05 }); blocked(); S.anim = { from: S.f, to: 0, t0: now() + 0.5, dur: 0.5, done: clearFoldResult }; } }; return; }
      S.anim = { from: S.f, to: 1, t0: t, dur: 1.0, done: () => (J.kind === 'ok' ? closed() : clashed()) };
    }
    function unfold(dur = 0.75, done) { if (S.anim) return; clearFoldResult(); S.anim = { from: S.f, to: 0, t0: now(), dur, done }; sfx.whoosh({ dur: 0.5, freq: 800, gain: 0.03 }); }
    function tap() { if ((S.done && !S.pose) || S.anim || S.held >= 0) return; if (S.f > 0.5) { if (S.beat === 'open') return openBox(); unfold(0.75, afterUnfold); } else fold(); }
    function afterUnfold() {
      if (S.beat === 'oppOpen') oppOpened();
      else if (S.beat === 'dreamOpen') dreamOpened();
    }

    // ================= 一课的主线 =================
    function openBox() {          // 点一下盒子：展开、铺平
      S.anim = { from: 1, to: 0, t0: now(), dur: 1.5, done: opened }; sfx.whoosh({ dur: 1.2, freq: 700, gain: 0.05 });
    }
    function opened() {
      ripple(cellPos(S.cells[J.root]), WHITE, 0.05); sfx.ding(990, { gain: 0.05 });
      caption('这样的平面图形，叫作正方体的展开图', '将它的表面适当展开，可以展开成平面图形：6 个正方形');
      board.h('问题'); board('要设计、制作一个正方体形状的粉笔盒，硬纸板要裁成什么形状？能裁出几种？', '');
      board.h('概念'); board(num() + '有些立体图形是由一些平面图形围成的，将它们的表面适当展开，可以展开成平面图形。这样的平面图形称为相应立体图形的<b>展开图</b>。正方体的展开图由 6 个正方形组成', 'open');
      record(true);
      later(1800, () => go('edit', '只能裁成这样吗？按住一块挪到别的边上，再点一下折起来'));
    }
    function closed() {          // 合上了：是一张展开图
      S.closedAt = now(); S.tested = J.key; sfx.clink({ freq: 1500, gain: 0.05 }); puff(); seamsOn();
      if (S.pose) return;
      if (S.beat === 'dream') return dreamFolded();
      if (S.beat === 'oppAsk') return oppFolded();
      record(false);
    }
    function clashed() {          // 折不成：两块撞在一起，另一面空着
      S.clashAt = now(); sfx.clink({ freq: 380, gain: 0.07 }); later(90, () => sfx.clink({ freq: 300, gain: 0.05 }));
      const c = new THREE.Vector3(); let n = 0; J.dup.forEach((d, i) => { if (d) { c.add(tmpV.setFromMatrixPosition(HF[i].matrix)); n++; } }); if (n) ripple(c.multiplyScalar(1 / n), RED, 0.07, true);
      caption('两个面撞在了一起，另一面空着', '6 个正方形要围成 6 个面：两块折到一处，就少一面', true);
      if (S.pose) return;
      if (!S.overlapSaid) { S.overlapSaid = true; board.h('探究'); board((S.failed ? '' : num()) + '不是 6 个正方形连在一起就都是正方体的展开图：折一折，有<span class="rd">两个面重在一起</span>，另一面就空着', 'fail'); }
      S.failed = true;
      if (S.beat === 'edit') afterEdit(); else prompt('点一下打开，挪一挪再试');
    }
    function blocked() {          // 田字：四块围着一个点，折不起来
      caption('四个面围着一个点，折不起来', '正方体的每个顶点处，只有 3 个面', true);
      if (S.pose) return;
      if (!S.blocked) { S.blocked = true; board.h('探究'); board((S.failed ? '' : num()) + '四个正方形围着一个点（田字形），折不成正方体：<span class="rd">正方体的每个顶点处只有 3 个面</span>', 'block'); }
      S.failed = true; if (S.beat === 'edit') afterEdit();
    }
    function record(first, quiet = false) {          // 记下这一种（转一转、翻过来一样的算一种）
      const { key } = canon(S.cells), had = gal.find((g) => g.key === key);
      if (had && quiet) return;
      if (had) {
        ripple(new THREE.Vector3(had.x, MY + 0.003, had.z), WHITE, 0.03); had.born = now() - 0.2;
        caption('这一种已经有了', '转一转、翻过来就一样，算同一种');
        if (!S.dupSaid) { S.dupSaid = true; board('转一转、翻过来能重合的展开图，算同一种', 'dup'); }
        if (S.beat === 'edit') afterEdit(); else if (S.beat === 'count') countPrompt();
        return;
      }
      const it = addGal(S.cells, key); S.found.push(key); later(250, () => { ripple(new THREE.Vector3(it.x, MY + 0.003, it.z), GOLD, 0.03); sfx.ding(1180 + gal.length * 30, { gain: 0.04 }); });
      if (first || quiet) return;
      if (!S.multi) { S.multi = true; caption('又折成了正方体', '同一个正方体，展开图不止一种'); board.h('探究'); board(num() + '把纸板复原成粉笔盒；换一种剪法，也能围成同一个正方体：正方体的展开图<b>不止一种</b>', 'multi'); }
      else caption(`第 ${gal.length} 种`, it.fam === 0 ? '四个面连成一行' : run(it.cells) === 3 ? '最长的一行连着三个' : '两个两个错开，像台阶');
      if (gal.length >= 11) return wow();
      if (S.beat === 'edit') afterEdit(); else if (S.beat === 'count') countPrompt();
    }
    function afterEdit() {          // 不止一种、折不成，两样都见过了：问相对的面
      if (S.multi && S.failed) later(2400, () => { if (S.beat !== 'edit') return; go('oppAsk', '哪两个面会相对？挪成一个能折成的，再折起来看看'); caption('折之前，看得出哪两个面相对吗？', '再折一个能折成的，看看'); });
      else if (S.multi) prompt('随便连 6 个正方形，都能折成正方体吗？挪一挪试试');
      else prompt('挪一挪，再折折看');
    }
    function oppFolded() {          // 折起来：三对相对的面各连成一条线
      S.opp = true; S.oppAt = now(); sfx.ding(1250, { gain: 0.06 }); later(350, () => sfx.ding(1560, { gain: 0.045 }));
      record(false, true); go('oppOpen', '点一下打开：相对的两个面，在展开图上在哪？');
      caption('三对相对的面，各连成一条线', '点一下打开：它们在展开图上在哪？');
    }
    function oppOpened() {          // 打开：三条线躺在展开图上
      sfx.ding(1180, { gain: 0.05 });
      caption('相对的两个面，在展开图上不挨着', '同一行连着三个面，两头的两个面折起来正好相对');
      board.h('探究'); board(num() + '折成正方体后，<span class="gd">相</span><span class="bl">对</span><span class="tl">的</span>两个面在展开图上不相邻；同一行（或同一列）里连着三个面时，两头的两个面相对', 'opp');
      for (const g of gal) for (const f of g.faces) f.userData.dot.visible = true;
      later(2600, () => { go('count'); if (gal.length >= 11) { wow(); return; } countPrompt(); caption('一共有几种？', '先让四个面连成一行：另外两个面放在哪？'); });
    }
    function countPrompt() {
      const a = gal.filter((g) => g.fam === 0).length, b = gal.length - a;
      if (a >= 6 && !S.famSaid) { S.famSaid = true; caption('四个面连成一行的，一共 6 种', b < 5 ? '四个连不成一行呢？' : ''); }
      prompt(a < 6 ? '一共有几种？先让四个面连成一行：另外两个面能放在哪？' : b < 5 ? '四个连不成一行呢？最长一行只连着三个……' : '');
    }
    function wow() {          // 找齐 11 种：11 张展开图一起折起来
      if (S.wowAt > 0) return; S.wowAt = now(); go('wow', '');
      const order = [...gal].sort((p, q) => p.fam - q.fam || p.x - q.x);
      order.forEach((it, k) => { it.fT0 = now() + k * 0.08; later(k * 80 + 700, () => { sfx.clink({ freq: 1100 + k * 70, gain: 0.03 }); ripple(new THREE.Vector3(it.x, MY + 0.003, it.z), k === order.length - 1 ? GOLD : WHITE, 0.022); }); });
      later(11 * 80 + 900, () => { sfx.ding(1320, { gain: 0.07 }); later(380, () => sfx.ding(1760, { gain: 0.05 }));
        const last = gal[gal.length - 1]; last.num.material.map = labTex('11', '#ffd45c'); last.num.material.needsUpdate = true;
        caption('11 种展开图，折起来是同一个正方体', '正方体的展开图，一共 11 种');
        board.h('结论'); board(num() + '四个面连成一行的有 6 种，其余的有 5 种：正方体的展开图一共有 <b>11</b> 种', 'eleven');
        later(3400, dreamStart); });
    }
    function dreamStart() {          // 课本习题：“中国梦 我的梦”
      const begin = () => { S.dream = true; setCells(DREAM); go('dream', '“的”字的对面是哪个字？点一下纸板，折起来'); caption('“的”字的对面是哪个字？', '课本上的这张展开图：点一下，折起来'); };
      if (S.f > 0.01) unfold(0.75, begin); else begin();
    }
    function dreamFolded() { go('dreamOpen', '点一下打开：看“的”连着哪个字'); caption('“的”连着的那一头，在哪个字上？', '点一下打开'); }
    function dreamOpened() {
      S.dreamOpen = true; sfx.ding(1250, { gain: 0.06 }); const a = HF[4], b = HF[1]; ripple(tmpV.setFromMatrixPosition(a.matrix).clone(), GOLD, 0.03); ripple(tmpV.setFromMatrixPosition(b.matrix).clone(), GOLD, 0.03);
      caption('“的”的对面是“国”', '“中”和“梦”、“我”和“梦”，也各是一对相对的面');
      board.h('应用'); board(num() + '课本“中国梦 我的梦”的展开图：折成正方体后，有“的”字一面的<span class="gd">相对面</span>上的字是“国”', 'dream');
      later(2600, finish);
    }
    function finish() {
      S.beat = 'end'; S.done = true; boardEl?.classList.add('review');
      caption('答：可以裁成 11 种展开图', '6 个正方形连在一起、能折成正方体的形状，一共 11 种');
      board.h('答'); board('<b>答</b>：硬纸板要裁成正方体的展开图：6 个正方形连在一起、能折成正方体的形状一共有 11 种（转一转、翻过来一样的算一种），都能围成正方体的盒子；其他形状折不成。真做粉笔盒，还要在边上留出粘口。', 'ans');
      prompt(''); ui?.unlock?.();
      later(2600, () => { ui?.go?.(2); ui?.fold?.(false); });          // 一课结束：翻到“对照课本原文”
    }
    // 讲完以后点板书：场景摆回那一刻
    const POSE = { multi: [[1, 1], [2, 1], [3, 1], [4, 1], [2, 0], [2, 2]], fail: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [2, 0]], block: [[1, 0], [2, 0], [1, 1], [2, 1], [3, 1], [4, 1]] };
    function pose(k) {
      S.pose = k; S.anim = null; S.dream = k === 'dream'; S.vtxAt = -9; S.clashAt = -9;
      const cells = k === 'dream' ? DREAM : POSE[k] || TEXTBOOK;
      if (k === 'eleven') { for (const it of gal) { it.fT0 = -9; it.f = 0; } later(300, () => gal.forEach((it, n) => { it.fT0 = now() + n * 0.08; })); }
      setCells(cells, true); S.f = 0; if (!POSE[k]) S.tested = J.key;
      const CAP = { open: ['这样的平面图形，叫作正方体的展开图', '将它的表面适当展开，可以展开成平面图形：6 个正方形'], multi: ['又折成了正方体', '同一个正方体，展开图不止一种'], fail: ['两个面撞在了一起，另一面空着', '6 个正方形要围成 6 个面：两块折到一处，就少一面'], block: ['四个面围着一个点，折不起来', '正方体的每个顶点处，只有 3 个面'], dup: ['这一种已经有了', '转一转、翻过来就一样，算同一种'], opp: ['相对的两个面，在展开图上不挨着', '同一行里隔一个的两个面，折起来正好相对'], eleven: ['11 种展开图，折起来是同一个正方体', '正方体的展开图，一共 11 种'], dream: ['“的”的对面是“国”', '“中”和“梦”、“我”和“梦”，也各是一对相对的面'], ans: ['答：可以裁成 11 种展开图', '6 个正方形连在一起、能折成正方体的形状，一共 11 种'] };
      caption(...(CAP[k] || CAP.ans));
      if (k === 'multi' || k === 'fail' || k === 'block') later(250, () => { if (S.pose === k) fold(); });
      if (k === 'opp' || k === 'dream') { S.f = 1; later(900, () => { if (S.pose === k) unfold(0.9); }); }
    }

    // ================= 动手：按住一块挪到别的边上；点一下折起来 / 打开 =================
    const free = (i) => { const rest = S.cells.filter((_, j) => j !== i); const seen = new Set([0]), q = [0]; while (q.length) { const a = q.shift(); rest.forEach((c, j) => { if (!seen.has(j) && Math.abs(c[0] - rest[a][0]) + Math.abs(c[1] - rest[a][1]) === 1) { seen.add(j); q.push(j); } }); } return seen.size === rest.length; };          // 拿走这一块，剩下的还连着
    const slots = (i) => { const rest = S.cells.filter((_, j) => j !== i), out = [];
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) { if (has(rest, c, r)) continue; if (DIRS.some(([dx, dz]) => has(rest, c + dx, r + dz))) out.push([c, r]); }
      return out; };
    const canMove = () => S.f < 0.001 && !S.anim && !S.done && S.beat !== 'open' && S.beat !== 'wow' && !S.dream;
    function moveStart(i, p) { if (!canMove() || !free(i)) return; S.held = i; S.grab = disp[i].clone().sub(p); sfx.clink({ freq: 1300, gain: 0.025 }); }
    function moveDrag(i, p) {
      if (S.held !== i) return; const q = p.clone().add(S.grab); disp[i].set(q.x, MY + T, q.z);
      let best = null, bd = 0.75 * S0; for (const s of slots(i)) { const d = Math.hypot(cellPos(s).x - q.x, cellPos(s).z - q.z); if (d < bd) { bd = d; best = s; } }
      S.slot = best; ghost.visible = !!best && !(best[0] === S.cells[i][0] && best[1] === S.cells[i][1]); if (best) ghost.position.copy(cellPos(best)).setY(MY + 0.0004);
    }
    function moveEnd(i, moved) {
      if (S.held !== i) return; S.held = -1; ghost.visible = false;
      if (moved && S.slot && !(S.slot[0] === S.cells[i][0] && S.slot[1] === S.cells[i][1])) { S.cells[i] = [...S.slot]; S.moves++; S.beatAt = now(); sfx.clink({ freq: 1700, gain: 0.04 }); recenter(); relayout(); if (S.pose) S.pose = ''; }
      S.slot = null;
    }
    const boxPick = new THREE.Mesh(new THREE.BoxGeometry(S0 * 1.1, S0 * 1.1, S0 * 1.1), basic({ visible: false })); boxPick.userData.pick = true; boxPick.userData.noFrame = true; group.add(boxPick);
    const live = () => !S.done || !!S.pose;
    const surfaces = f => [f.userData.inside, f.userData.outside];
    const taps = [{ obj: boxPick, cueTarget: HF.flatMap(surfaces), hint: () => (S.f > 0.5 && live() ? (S.beat === 'open' ? '点一下：把盒子打开' : '点一下：打开') : ''), enabled: () => S.f > 0.5 && live(), onTap: () => tap() }];
    const drags = HF.map((f, i) => ({ obj: f, cueTarget: surfaces(f), plane: 'xz', offset: MY + T,
      hint: () => (S.f > 0.5 || !live() ? '' : canMove() && free(i) ? '拖动：挪到别的边上 · 点一下：折起来' : '点一下：折起来'),
      enabled: () => S.f <= 0.5 && live(),
      onStart: (p) => moveStart(i, p), onDrag: (p) => moveDrag(i, p), onEnd: (moved) => moveEnd(i, moved), onTap: () => tap() }));
    const dragApi = draggable(group, drags, { taps, onClick: () => false, tip: tag?.('', 'pill') });
    let heard = false;
    const pointer = { down: (r, e) => { if (!heard) { heard = true; audio(); } return dragApi.down(r, e); }, move: (r, e) => dragApi.move(r, e), up: (r, e) => dragApi.up(r, e), items: dragApi.items };

    // ================= 重拍的小光：从一点迸出一圈短光线（3Blue1Brown 的 Flash），不压暗画面 =================
    const flashes = [];
    function ripple(p, col, r = 0.04, up = false) { const ls = []; for (let n = 0; n < 12; n++) ls.push(lineSet(group, col, 0.0014, { glow: 0.4, shadow: 0, order: 22 })); flashes.push({ p: p.clone(), ls, r, t0: now(), up }); }
    function puff() { const c = tmpV.setFromMatrixPosition(HF[J.root].matrix).clone().add(new THREE.Vector3(0, S0, 0)); puffs.forEach((q, n) => { const a = (n / puffs.length) * Math.PI * 2 + Math.random() * 0.4; q.t0 = now() + Math.random() * 0.12; q.p.copy(c).add(new THREE.Vector3(Math.cos(a) * S0 * 0.5, -Math.random() * S0 * 0.6, Math.sin(a) * S0 * 0.5)); q.v.set(Math.cos(a) * 0.02, 0.012 + Math.random() * 0.012, Math.sin(a) * 0.02); }); }
    function seamsOn() {
      const C = new THREE.Vector3(0, S0 / 2, 0), hinge = new Set(); J.tr.par.forEach((p, i) => { if (p >= 0) hinge.add([J.land[i], J.land[p]].sort().join()); });
      C.add(disp[J.root]);
      let k = 0; for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) { const A = POS[a], B = POS[b]; if (OPP[A] === B || hinge.has([A, B].sort().join())) continue;
        const na = new THREE.Vector3(...NRM[A]), nb = new THREE.Vector3(...NRM[B]), m = C.clone().add(na.clone().add(nb).multiplyScalar(S0 / 2 + 0.0009)), d = na.clone().cross(nb).multiplyScalar(S0 / 2);
        if (seams[k]) { setSeg(seams[k], m.clone().sub(d), m.clone().add(d), 0.0011); seams[k].userData.on = true; k++; } }
      S.seamAt = now();
    }

    function opening() { caption('纸板要裁成什么形状？能裁出几种？', '要做一只正方体的粉笔盒，先得把硬纸板裁好'); prompt('粉笔盒铺平是什么样子？点一下盒子'); }
    const cue = mathActionCue(camera, pointer, dragApi, () => {
      if (S.anim || S.done || S.beat === 'wow' || S.dreamOpen) return;
      if (S.f > 0.5) return boxPick;
      if (S.beat === 'dream') return HF[4];
      if (canMove() && S.beat !== 'oppOpen') return HF.find((_, i) => free(i));
    });
    function reset() {
      cue.reset();
      runId++; { const keepG = new Set([discGeo]), keepM = new Set([kraftMat, edgeMat, ...outMatCache.values()]); for (const G of geoCache.values()) for (const g of Object.values(G)) keepG.add(g);
        for (const it of gal) { it.g.traverse((o) => { if (!o.isMesh) return; if (!keepG.has(o.geometry)) o.geometry.dispose(); if (!keepM.has(o.material)) o.material.dispose(); }); galRoot.remove(it.g); galRoot.remove(it.num); it.num.material.map?.dispose?.(); it.num.material.dispose(); } } gal.length = 0;
      S = fresh(); S.beatAt = now(); setCells(TEXTBOOK, true); rows.length = 0; lastH = ''; if (boardEl) { boardEl.innerHTML = ''; boardEl.classList.remove('review'); }
      cap.key = ''; ui?.relock?.(); ui?.go?.(1); opening();
    }
    const onKey = (e) => { if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !e.target?.closest?.('input,textarea')) reset(); };
    addEventListener('keydown', onKey);

    setCells(TEXTBOOK, true);
    const EL = 0.87, AZ = 0.21, DIR = [Math.sin(AZ) * Math.cos(EL), Math.sin(EL), Math.cos(AZ) * Math.cos(EL)];
    let last = now();
    return {
      group: root, card: false, place: 'spread', scale: 0.97,
      size: { w: 0.4, d: 0.35, h: 0.06 },
      view: { elev: 50, azim: 12, lookY: 0.12, frameMargin: 1.0 },
      pointer: cue.pointer,
      mount(u) { ui = u; boardEl = document.createElement('div'); boardEl.className = 'zk-board' + (S.done ? ' review' : ''); u.controls?.append(boardEl);
        boardEl.addEventListener('click', (e) => { const r = e.target.closest?.('.zb-row'); if (!S.done || !r?.dataset.k) return; for (const o of rows) o.classList?.remove('sel', 'fresh'); r.classList.add('sel'); sfx.clink({ freq: 1200, gain: 0.03 }); pose(r.dataset.k); });
        for (const r of rows) { boardEl.append(r); r.classList.add('in'); }
        ui.go?.(1); if (!cap.key) opening(); else if (S.ask) ui.status?.(S.ask);
        requestAnimationFrame(() => aim?.(DIR)); setTimeout(() => { if (!dead) aim?.(DIR); }, 700); },
      dispose() { cue.dispose(); dead = true; runId++; removeEventListener('keydown', onKey); css.remove(); },
      update() {
        const t = now(), dt = Math.min(0.05, t - last); last = t;
        if (S.anim && t >= S.anim.t0) { const a = S.anim, k = clamp((t - a.t0) / a.dur, 0, 1); S.f = lerp(a.from, a.to, ease(k)); if (k >= 1) { S.anim = null; a.done?.(); } }
        // 主角：平放时每一块在自己的格子上（挪动时跟着手）；折的时候围着桌上那一块往上折
        S.cells.forEach((c, i) => { if (S.held !== i) disp[i].lerp(cellPos(c), 1 - Math.exp(-dt * 16)); });
        const th = (S.f * Math.PI) / 2, wob = S.beat === 'open' && !S.anim ? 0.11 + 0.07 * Math.sin(t * 2.3) : 0, flapI = J.land.indexOf('pz');
        const clash = J.kind === 'overlap' ? smooth(0.85, 1, S.f) : 0, pairsOn = S.opp && J.kind === 'ok' && S.held < 0 && S.tested === J.key && S.beat !== 'wow';
        frames(S.cells, J.tr, S0, (i) => th - (i === flapI && J.tr.order.slice(1).includes(i) && !J.tr.par.includes(i) ? wob : 0) - (J.rank[i] > 0 ? 0.42 * smooth(0.6, 1, S.f) : 0), FM);
        boxPick.position.set(disp[J.root].x, MY + S0 / 2, disp[J.root].z);
        HF.forEach((f, i) => {
          if (S.f < 0.0005) { tmpM.makeTranslation(disp[i].x, disp[i].y + (S.held === i ? 0.006 : 0), disp[i].z); f.matrix.copy(tmpM); }
          else { const r0 = disp[J.root]; f.matrix.makeTranslation(r0.x, r0.y, r0.z).multiply(FM[i]); }
          f.matrixWorldNeedsUpdate = true;
          const hot = clash && J.dup[i] ? clash * (0.55 + 0.25 * Math.sin(t * 7)) : 0; f.userData.inside.material.emissiveIntensity = hot; f.userData.outside.material.emissiveIntensity = hot * 0.8;
          const lk = 1 - smooth(0.05, 0.6, S.f) * 0.55; f.userData.cut.fade(lk); f.userData.crease.fade(lk * 0.9);
          f.userData.dot.visible = pairsOn;
          if (f.userData.ch.visible) f.userData.ch.material.opacity = 1;
        });
        // 折不成：空着的那一面画成红色虚线框
        gaps.forEach((g, k) => { const p = J.kind === 'overlap' ? J.gap[k] : null; g.visible = !!p && clash > 0.05; if (!g.visible) return; const n = new THREE.Vector3(...NRM[p]), r0 = disp[J.root]; g.position.set(r0.x, r0.y + S0 / 2, r0.z).add(n.clone().multiplyScalar(S0 / 2 + 0.0015)); g.quaternion.setFromUnitVectors(UP, n); g.userData.l.fade(clash * (0.7 + 0.3 * Math.sin(t * 6))); g.userData.fill.material.opacity = 0.14 * clash; });
        // 田字中间的那个点
        { const k = clamp((t - S.vtxAt) / 2.6, 0, 1); vtxDot.visible = J.vtx && k < 1 && S.f < 0.5; if (vtxDot.visible) { vtxDot.position.set(HX0 + (J.vtx[0] + 0.5) * S0, MY + T + 0.0006, HZ0 + (J.vtx[1] + 0.5) * S0); vtxDot.scale.setScalar(1 + 0.25 * Math.sin(t * 9)); } }
        // 合上的那一下：接缝亮一下
        { const k = clamp((t - S.seamAt) / 0.9, 0, 1); seams.forEach((m) => { m.visible = !!m.userData.on && k < 1 && S.f > 0.97; m.material.opacity = Math.sin(k * Math.PI) * 0.85; }); if (k >= 1) seams.forEach((m) => { m.userData.on = false; }); }
        for (const q of puffs) { const k = (t - q.t0) / 0.9; if (k < 0 || k > 1) { q.sp.material.opacity = 0; continue; } q.sp.position.copy(q.p).addScaledVector(q.v, k); q.sp.scale.setScalar(0.005 + 0.012 * k); q.sp.material.opacity = 0.22 * (1 - k) * smooth(0, 0.15, k); }
        // 相对的两个面连成的线（三条）：合上时是三条轴，打开时躺在展开图上
        { const grow = easeOut(clamp((t - S.oppAt) / 0.8, 0, 1)), fk = smooth(0.15, 1, S.f);
          for (const ax of ['y', 'z', 'x']) { const L = PL[ax], ia = J.land.indexOf('p' + ax), ib = J.land.indexOf('n' + ax), on = pairsOn && ia >= 0 && ib >= 0;
            for (const m of [L.core, L.glow, L.xray, ...L.ends]) m.visible = on; if (!on) continue;
            _A.set(0, 0.0022, 0).applyMatrix4(HF[ia].matrix); _B.set(0, 0.0022, 0).applyMatrix4(HF[ib].matrix);
            const span = _A.distanceTo(_B), out = 0.42 * S0 * fk; _T.copy(_A).sub(_B).normalize(); _A.addScaledVector(_T, out); _B.addScaledVector(_T, ax === 'y' ? 0 : -out);          // 合上时两头露出盒外（底下那一头贴着垫子，不往下伸）
            _C.copy(_A).add(_B).multiplyScalar(0.5); _C.y += span * 0.55 * (1 - fk) * (ax === 'z' ? 0.8 : ax === 'x' ? 1.15 : 1);          // 平放时拱起来，三道拱高低错开
            _A.lerp(_C, 1 - grow); _B.lerp(_C, 1 - grow);
            const de = S.dream && (ia === 4 || ib === 4), dim = S.dream && !de ? 0.4 : 1, w = de ? 1.5 : 1;          // 中国梦：“的”的那一条最亮
            setTube(L.core, _A, _C, _B, 0.00085 * w); setTube(L.glow, _A, _C, _B, 0.003 * w); setTube(L.xray, _A, _C, _B, 0.00085 * w);
            L.core.material.opacity = dim; L.glow.material.opacity = 0.3 * dim; L.xray.material.opacity = 0.5 * fk * dim;
            L.ends[0].position.copy(_A); L.ends[1].position.copy(_B); L.ends.forEach((e, n) => { e.scale.setScalar(0.009 * w * fk + 0.0001); e.material.opacity = fk * dim; e.visible = fk > 0.02 && !(ax === 'y' && n === 1); }); } }
        layoutGal(t);
        // 重拍：一圈短光线往外迸
        for (let n = flashes.length - 1; n >= 0; n--) { const fl = flashes[n], k = (t - fl.t0) / 0.6; if (k >= 1) { for (const l of fl.ls) for (const m of [l.co, l.gl, l.sh]) if (m) { group.remove(m); m.geometry.dispose(); m.material.dispose(); } flashes.splice(n, 1); continue; }
          const e = 1 - (1 - k) ** 2; fl.ls.forEach((l, q) => { const a = (q / fl.ls.length) * Math.PI * 2 + 0.13, c = Math.cos(a), s = Math.sin(a), r0 = fl.r * (0.25 + 0.75 * e), r1 = r0 + fl.r * 0.4 * (1 - k); l.set([[fl.p.x + c * r0, fl.p.z + s * r0, fl.p.x + c * r1, fl.p.z + s * r1]]); for (const m of [l.co, l.gl]) if (m) m.position.y = fl.p.y + 0.001; l.fade(1 - k); }); }
        // 此刻那一句：淡进淡出
        if (cap.out < 1e9) { const k = clamp(1 - (t - cap.out) / 0.35, 0, 1); capMesh.material.opacity = k; if (k <= 0) { cap.out = 1e9; const nx = cap.next; cap.next = null; nx?.(); } } else capMesh.material.opacity = clamp((t - cap.born) / 0.5, 0, 1);
        // 卡住很久，才给提示（提示用问题）
        if (S.held < 0 && !S.anim && !S.done && S.hint < 1 && t - S.beatAt > 15) {
          const a = gal.filter((g) => g.fam === 0).length;
          const H1 = { open: ['盒子的前面翘着呢', '点一下盒子，把它打开'], edit: S.multi ? ['五个连成一行，还能折成吗？', '挪一挪，试试看'] : ['最下面那一块，挪到别的边上呢？', '按住它，拖到别的空格上，再点一下折起来'], oppAsk: ['先挪回一个能折成的', '比如四个连成一行，上面一个、下面一个'], oppOpen: ['点一下盒子，把它打开', ''], count: a < 6 ? ['四个连成一行：上面那一块挪到别的位置呢？', '下面那一块也可以挪'] : ['最长一行只连着三个，可以怎么摆？', '还有两个两个错开、像台阶一样的'], dream: ['点一下纸板，折起来', ''], dreamOpen: ['点一下盒子，打开看看', ''] }[S.beat];
          if (H1) { S.hint = 1; S.beatAt = t; caption(...H1); } }
        cue.update();
      },
      debug: {
        get S() { return S; }, get J() { return J; }, ALL, rows, pose, gal, canon, judge,
        cap: () => S.cap,
        labels: () => gal.map((g) => g.num),
        tap: () => tap(),
        /** 把第 i 块挪到格子 to（和手拖的结果一样） */
        move: (i, to) => { if (!canMove() || !free(i)) return false; S.held = i; S.slot = to; moveEnd(i, true); return true; },
        set: (cells) => setCells(cells),
        /** 直接把还没找到的几种折一遍（测试用：每一种都走“设好、折起来、合上”这一条路） */
        findRest: (n = 99) => { for (const net of ALL.nets) { if (n <= 0) break; if (gal.find((g) => g.key === net.key)) continue; setCells(net.cells, true); S.f = 1; S.anim = null; closed(); n--; } },
        qa: [
          { name: '点一下盒子：展开', run: () => tap(), wait: 3.6, scale: 1 },
          { name: '挪一块，再折起来', run: () => { const i = S.cells.findIndex((c) => c[0] === 3 && c[1] === 2); if (S.f > 0.5) S.f = 0; S.held = i; S.slot = [2, 2]; moveEnd(i, true); fold(); }, wait: 4.4, scale: 1 },
          { name: '五个连成一行，折不成', run: () => { S.f = 0; S.anim = null; setCells([[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [2, 0]], true); fold(); }, wait: 5.2, scale: 1 },
          { name: '再折一个能折成的：三对相对的面', run: () => { S.f = 0; S.anim = null; setCells(TEXTBOOK, true); fold(); }, wait: 2.4, scale: 1 },
          { name: '点一下打开', run: () => tap(), wait: 4.2, scale: 1 },
          { name: '找齐 11 种', run: () => { for (const net of ALL.nets) { if (gal.find((g) => g.key === net.key)) continue; setCells(net.cells, true); S.f = 1; S.anim = null; closed(); } }, wait: 7.5, scale: 1 },
          { name: '中国梦：折起来', run: () => tap(), wait: 2.2, scale: 1 },
          { name: '中国梦：打开', run: () => tap(), wait: 5.6, scale: 1 },
        ],
      },
    };
  },
};
