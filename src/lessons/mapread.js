// 第二章 第一节 地图的阅读 · 地图的语言：方向、图例、比例尺（课本七年级上册第 28—31 页，图 2.2、图 2.6、图 2.7，活动：学习阅读地图）。
//
// 书桌上是一所学校的模型（编的，不是真实的地方：真实地方的地图要送审，PLAN-geo.md 第七节），立在一张纸上；纸就是这所学校的平面图：
// 道路、图名、线段比例尺和数字比例尺（1∶1 000）、指向标、图例都印好了。
// 学生：
//   ① 把纸边上的滑块从“模型”拖到“地图”：楼房、树木矮下去，只剩从正上方看到的样子，用符号画在纸上——地图是运用各种符号，
//      将地理事物按一定的比例缩小以后表示在平面上的图像（课本第 28 页）；
//   ② 图例：三个符号还没写名字（课本第 31 页“将图例名称补充完整”）。点地图上的这些符号，它在纸上立起来，看清是什么，图例里写上名字；
//   ③ 方向：这张图用指向标指方向，指向标指向右上方。把“八个方向”（图 2.6）拖到池塘上，它按指向标转好，读出图书馆在池塘的什么方向
//      （有指向标的地图要按指向标辨别方向，课本第 29 页）；
//   ④ 比例尺：用分规量校门到教学楼门口的图上距离，挪到线段比例尺上读出实地距离；再用数字比例尺 1∶1 000 算一遍（课本第 30 页）。
// 模型和地图一样大（都是 1∶1 000）；楼房、树木的高度放大了 2 倍，在面板的说明里写明。
import * as THREE from 'three';
import { table, buttons } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { canvasTex } from './kit/props.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, paperSheet, think } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked, hull, polyline } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const D2R = Math.PI / 180;
const PW = 20, PH = 15, CM = 0.01;                  // 纸 20 × 15 厘米；图上 1 厘米 = 实验里 0.01（米）
const TOP = 0.0015;                                  // 纸面的高度
const SCALE = 1000;                                  // 数字比例尺 1∶1 000：图上 1 厘米代表实地 1 000 厘米（10 米）
const NORTH = 45;                                    // 指向标：北方在图上正上方往右（顺时针）45°
const HX = 2;                                        // 模型的高度放大 2 倍
const at = (u, v, y = TOP) => new THREE.Vector3((u - PW / 2) * CM, y, -(v - PH / 2) * CM);          // 图上 (u, v) 厘米（左下角是原点，v 往图的上方）→ 实验的坐标
const uvOf = (p) => ({ u: p.x / CM + PW / 2, v: -p.z / CM + PH / 2 });
const DIRS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
const dirOf = (du, dv) => { const map = Math.atan2(du, dv) / D2R, b = (((map - NORTH) % 360) + 360) % 360; return DIRS[Math.round(b / 45) % 8]; };          // 图上从一点到另一点：先量它在图上偏离正上方多少度，再按指向标换成方向

// 校园里的东西（图上的位置，厘米）：key、真实的名字、图例里的名字、中心
const F = {
  teach: { name: '教学楼', legend: '建筑物', c: [11, 9.8] },
  lib: { name: '图书馆', legend: '建筑物', c: [16.5, 12] },
  track: { name: '操场', legend: '操场', c: [4.6, 10.6], blank: true },
  pond: { name: '池塘', legend: '水体', c: [16.5, 8.4], blank: true },
  woods: { name: '一片树林', legend: '树林', c: [3.3, 3.9], blank: true },
  gate: { name: '校门', legend: '校门', c: [9, 1.0] },
};
const GATE = [9, 1.0], DOOR = [9, 9.0];            // 量距离的两点：校门、教学楼门口（图上相距 8 厘米 → 实地 80 米）
const BAR = { u0: 0.8, v: 13.05, len: 10 };          // 线段比例尺：10 厘米长，0—100 米
const LEGEND = [['建筑物', 'bldg'], ['道路', 'road'], ['操场', 'track'], ['水体', 'water'], ['树林', 'tree'], ['校门', 'gate']];
const TREES = [[1.6, 2.6], [2.5, 2.3], [3.5, 2.7], [4.6, 2.4], [1.9, 3.7], [3.0, 3.5], [4.1, 3.8], [5.1, 3.4], [1.5, 4.9], [2.6, 4.7], [3.7, 5.0], [4.8, 4.8], [2.2, 5.6], [3.3, 5.8]];

export default {
  id: 'mapread',
  fig: '图2.2',
  title: '地图的语言：方向、图例、比例尺',
  stampText: '阅读',
  style: 'real',
  flow: 'explore',
  ask: '这张校园平面图的指向标指向右上方。图书馆画在池塘的正上方，图书馆在池塘的什么方向？',
  guess: { options: ['北', '西北', '东北'], answer: 1 },          // 动手看里的“先猜一下（可以不猜）”
  need: '把校园模型变成地图，看楼房、树木怎样变成符号；点没写名字的符号，补全图例；按指向标转好“八个方向”，读出图书馆在池塘的什么方向；用分规量校门到教学楼门口的距离，用线段比例尺读出、用数字比例尺算出实地距离',
  conclusion: {
    crops: [{ page: 32, rect: [185, 198, 458, 306] }, { page: 32, rect: [200, 325, 292, 578] }],
    quote: '地图是运用各种符号，将地理事物按一定的比例缩小以后表示在平面上的图像。方向、图例和比例尺是地图的“语言”，阅读地图应当明确这些“语言”的含义。方向：有的地图用指向标指示方向，有的地图用经纬线指示方向。图例：对地图上各种符号和注记的说明。比例尺：表示图上距离比实地距离缩小的程度。比例尺 = 图上距离 / 实地距离。',
    why: '模型变成地图：从上方看各种东西的位置和占地范围，按比例缩小，再用符号和注记画在纸上；图例说明各种符号和注记表示什么（这张图用蓝色表示<b>水体</b>，那一块是池塘）。<br>这张图有指向标，指向标指向右上方：图书馆画在池塘正上方，按指向标读，在池塘的<b>西北</b>方向；按“上北下南”读成“北”就错了。<br>分规量得校门到教学楼门口图上 8.0 厘米，放到线段比例尺上是 80 米；用数字比例尺算：1∶1 000 表示图上 1 厘米代表实地 1 000 厘米（10 米），8.0 厘米 × 1 000 = 8 000 厘米 = <b>80 米</b>。',
    src: '课本七年级上册第 28—31 页 · 第二章 第一节 地图的阅读（地图的语言；阅读地图；活动：学习阅读地图）',
  },

  create({ tag, aim, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null, said = '';
    const status = (m) => { if (!S.demo) { said = m; W?.status(m); } else bar.caption(m); };          // said：学生这边最后一句（老师演示完放回去）
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };

    paperSheet(group, { w: 0.34, d: 0.24, x: 0.01, z: 0.01 });

    // ================= 纸：这所学校的平面图（道路、图名、比例尺、指向标、图例；楼房这些东西的符号另画，跟着“压成地图”淡入） =================
    const PX = 100;          // 画布上 1 厘米 = 100 像素
    const named = {};          // 图例里已经补上的名字
    const paperTex = canvasTex(PW * PX, PH * PX, () => {});
    const X = (u) => u * PX, Y = (v) => (PH - v) * PX;
    const roadPath = (g, pts, w) => { g.lineCap = 'butt'; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([u, v], i) => (i ? g.lineTo(X(u), Y(v)) : g.moveTo(X(u), Y(v)))); g.strokeStyle = '#8f949c'; g.lineWidth = w * PX + 6; g.stroke(); g.strokeStyle = '#ffffff'; g.lineWidth = w * PX; g.stroke(); };
    const symbol = (g, kind, u, v, s = 1) => {          // 图例里的小符号（u, v 是符号中心）
      const x = X(u), y = Y(v), w = 70 * s, hh = 40 * s;
      if (kind === 'bldg') { g.fillStyle = '#2f8a83'; g.fillRect(x - w / 2, y - hh / 2, w, hh); }
      else if (kind === 'road') { g.fillStyle = '#8f949c'; g.fillRect(x - w / 2, y - 12, w, 24); g.fillStyle = '#fff'; g.fillRect(x - w / 2, y - 8, w, 16); }
      else if (kind === 'track') { g.fillStyle = '#cfe6b8'; g.strokeStyle = '#b5523b'; g.lineWidth = 9 * s; g.beginPath(); g.ellipse(x, y, w / 2, hh / 2, 0, 0, 7); g.fill(); g.stroke(); }
      else if (kind === 'water') { g.fillStyle = '#8cc3ea'; g.strokeStyle = '#4b8fc4'; g.lineWidth = 3; g.beginPath(); g.ellipse(x, y, w / 2, hh / 2, 0, 0, 7); g.fill(); g.stroke(); }
      else if (kind === 'tree') { for (const dx of [-20, 18]) treeSym(g, x + dx * s, y + 4, 0.9 * s); }
      else if (kind === 'gate') gateSym(g, x, y, s);
    };
    const treeSym = (g, x, y, s = 1) => { g.fillStyle = '#3f8f4a'; g.beginPath(); g.arc(x, y - 10 * s, 13 * s, 0, 7); g.fill(); g.fillStyle = '#5a4630'; g.fillRect(x - 2 * s, y, 4 * s, 12 * s); };
    const gateSym = (g, x, y, s = 1) => { g.strokeStyle = '#2f3542'; g.lineWidth = 7 * s; g.beginPath(); g.moveTo(x - 26 * s, y + 14 * s); g.lineTo(x - 26 * s, y - 14 * s); g.lineTo(x + 26 * s, y - 14 * s); g.lineTo(x + 26 * s, y + 14 * s); g.stroke(); };
    const drawPaper = () => {
      const c = paperTex.image, g = c.getContext('2d');
      g.fillStyle = '#fbf8ef'; g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = '#f2eedf'; g.fillRect(X(0.5), Y(14.5) + 0, (PW - 1) * PX, (PH - 1) * PX - 0);          // 校园的地面（淡一点）
      g.strokeStyle = '#2a3040'; g.lineWidth = 5; g.strokeRect(X(0.3), Y(14.7), (PW - 0.6) * PX, (PH - 0.6) * PX);          // 图框
      roadPath(g, [[9, 0.3], [9, 9.0]], 0.5);
      roadPath(g, [[0.3, 6.6], [19.7, 6.6]], 0.45);
      roadPath(g, [[13.8, 6.6], [13.8, 9.0]], 0.35);
      // 图名
      g.fillStyle = '#2a3040'; g.textBaseline = 'alphabetic'; g.textAlign = 'left'; g.font = '700 46px "Songti SC", "STSong", serif'; g.fillText('某中学校园平面图', X(0.8), Y(14.05));
      // 线段比例尺：每 1 厘米一段，黑白相间；下面写 0、20、40……100 米；旁边数字比例尺
      for (let i = 0; i < BAR.len; i++) { g.fillStyle = i % 2 ? '#fbf8ef' : '#2a3040'; g.fillRect(X(BAR.u0 + i), Y(BAR.v) - 9, PX, 18); }
      g.strokeStyle = '#2a3040'; g.lineWidth = 2.5; g.strokeRect(X(BAR.u0), Y(BAR.v) - 9, BAR.len * PX, 18);
      g.fillStyle = '#2a3040'; g.font = '600 34px "Times New Roman", serif'; g.textAlign = 'center';
      for (let i = 0; i <= BAR.len; i += 2) g.fillText(String(i * 10), X(BAR.u0 + i), Y(BAR.v) + 44);
      g.textAlign = 'left'; g.font = '600 28px "Songti SC", serif'; g.fillText('米', X(BAR.u0 + BAR.len) + 22, Y(BAR.v) + 44);
      g.font = '600 34px "Songti SC", serif'; g.fillText('1∶1 000', X(BAR.u0 + BAR.len + 0.9), Y(BAR.v) + 12);
      // 指向标：箭头指北（右上方 45°）
      g.save(); g.translate(X(18.7), Y(13.0)); g.rotate(NORTH * D2R);
      g.fillStyle = '#2a3040'; g.beginPath(); g.moveTo(0, -62); g.lineTo(20, 22); g.lineTo(0, 8); g.closePath(); g.fill();
      g.strokeStyle = '#2a3040'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -62); g.lineTo(-20, 22); g.lineTo(0, 8); g.stroke();
      g.font = '700 32px "Songti SC", serif'; g.textAlign = 'center'; g.fillText('北', 0, -74); g.restore();
      // 图例：两列三行；没补上的名字画一道空线
      const L0 = 11.2, L1 = 19.5, T0 = 5.9, T1 = 0.6;
      g.fillStyle = '#fbf8ef'; g.fillRect(X(L0), Y(T0), (L1 - L0) * PX, (T0 - T1) * PX);
      g.strokeStyle = '#2a3040'; g.lineWidth = 3; g.strokeRect(X(L0), Y(T0), (L1 - L0) * PX, (T0 - T1) * PX);
      g.font = '700 42px "Songti SC", serif'; g.textAlign = 'center'; g.fillStyle = '#2a3040'; g.fillText('图　例', X((L0 + L1) / 2), Y(T0 - 0.72));
      LEGEND.forEach(([name, kind], i) => {
        const col = i % 2, row = Math.floor(i / 2), u = L0 + 1.0 + col * 4.15, v = T0 - 1.85 - row * 1.3;
        symbol(g, kind, u, v, 1.25);
        const key = Object.keys(F).find((k) => F[k].legend === name && F[k].blank), blank = key && !named[key];
        g.textAlign = 'left'; g.font = '600 44px "Songti SC", serif';
        if (blank) { g.strokeStyle = '#2a3040'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(X(u + 0.85), Y(v) + 16); g.lineTo(X(u + 2.95), Y(v) + 16); g.stroke(); }
        else { g.fillStyle = key ? '#c8342a' : '#2a3040'; g.fillText(name, X(u + 0.85), Y(v) + 15); }
      });
      paperTex.needsUpdate = true;
    };
    drawPaper();
    paperTex.anisotropy = 8;
    const paper = new THREE.Mesh(new THREE.BoxGeometry(PW * CM, TOP, PH * CM), [paint(0xeee7d6), paint(0xeee7d6), new THREE.MeshLambertMaterial({ map: paperTex }), paint(0xeee7d6), paint(0xeee7d6), paint(0xeee7d6)]);
    paper.position.y = TOP / 2; paper.receiveShadow = true; group.add(paper);

    // ================= 校园里的东西：每样一个立体模型 + 一块符号（贴在纸上） =================
    // 符号：一块透明的贴片，画布按这一样东西的范围切
    const symPlane = (u0, v0, u1, v1, draw) => {
      const tex = canvasTex(Math.round((u1 - u0) * PX), Math.round((v1 - v0) * PX), (g) => { g.save(); g.translate(-u0 * PX, -(PH - v1) * PX); draw(g); g.restore(); }, {});
      const m = new THREE.Mesh(new THREE.PlaneGeometry((u1 - u0) * CM, (v1 - v0) * CM), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.copy(at((u0 + u1) / 2, (v0 + v1) / 2, TOP + 0.0004)); m.renderOrder = 2; m.raycast = () => {};
      group.add(m); return m;
    };
    const pickBox = (u0, v0, u1, v1) => { const m = new THREE.Mesh(new THREE.BoxGeometry((u1 - u0) * CM, 0.0016, (v1 - v0) * CM), new THREE.MeshBasicMaterial({ visible: false })); m.position.copy(at((u0 + u1) / 2, (v0 + v1) / 2, TOP + 0.0008)); group.add(m); return m; };          // 点符号：贴着纸面薄薄一层（分规的脚、八个方向放在上面时先拿到它们）
    const wallTex = (cols, rows, wall = '#efe6d2', win = '#7aa6c9') => canvasTex(256, 128, (g, Wc, Hc) => {
      g.fillStyle = wall; g.fillRect(0, 0, Wc, Hc);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { g.fillStyle = win; g.fillRect(((c + 0.25) / cols) * Wc, ((r + 0.28) / rows) * Hc, (0.5 / cols) * Wc, (0.44 / rows) * Hc); }
    });
    const building = (u0, v0, u1, v1, hgt, roof, cols, rows) => {
      const g = new THREE.Group(), w = (u1 - u0) * CM, d = (v1 - v0) * CM, side = new THREE.MeshLambertMaterial({ map: wallTex(cols, rows) }), end = new THREE.MeshLambertMaterial({ map: wallTex(Math.max(1, Math.round(cols * d / w)), rows) });
      const box = inked(new THREE.Mesh(new THREE.BoxGeometry(w, hgt, d), [end, end, paint(roof), paint(roof), side, side]), { width: 0.7 }); box.position.y = hgt / 2; g.add(box);
      g.position.copy(at((u0 + u1) / 2, (v0 + v1) / 2)); group.add(g); return g;
    };
    const feats = {};
    const add = (key, obj, sym, pick, flatOnly = false) => { feats[key] = { key, ...F[key], obj, sym, pick, flatOnly, pop: 0, popT: -1 }; };
    // 教学楼（5 层，约 18 米 → 1.8 厘米，放大 2 倍）、图书馆（约 12 米）
    add('teach', building(8.3, 9.0, 13.7, 10.6, 0.018 * HX, 0xb85c47, 9, 5), symPlane(8.2, 8.9, 13.8, 10.7, (g) => { g.fillStyle = '#2f8a83'; g.fillRect(X(8.3), Y(10.6), 5.4 * PX, 1.6 * PX); g.fillStyle = '#fbf8ef'; g.fillRect(X(8.75), Y(9.0) - 14, 50, 14); }), pickBox(8.3, 9.0, 13.7, 10.6, 0.02));
    add('lib', building(15.2, 11.1, 17.8, 12.9, 0.012 * HX, 0x5d6f8a, 4, 3), symPlane(15.1, 11.0, 17.9, 13.0, (g) => { g.fillStyle = '#2f8a83'; g.fillRect(X(15.2), Y(12.9), 2.6 * PX, 1.8 * PX); }), pickBox(15.2, 11.1, 17.8, 12.9, 0.014));
    // 操场：一圈跑道，中间草地（本来就是平的：立体的样子是红色跑道、绿色草地，图上是符号）
    { const g = new THREE.Group(), ov = new THREE.Group(), track = new THREE.Mesh(new THREE.RingGeometry(1, 1.32, 64), new THREE.MeshLambertMaterial({ color: 0xb5523b, transparent: true }));
      const field = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshLambertMaterial({ color: 0x7fb069, transparent: true }));
      for (const m of [track, field]) { m.rotation.x = -Math.PI / 2; ov.add(m); }
      track.position.y = 0.0007; field.position.y = 0.0005;
      const lanes = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.17, 64), new THREE.MeshBasicMaterial({ color: 0xf6efe4, transparent: true })); lanes.rotation.x = -Math.PI / 2; lanes.position.y = 0.0009; ov.add(lanes);
      ov.scale.set(2.65 * CM, 1, 1.5 * CM); g.add(ov);          // 跑道外圈 7 × 4 厘米（实地 70 × 40 米）
      const goals = [-1, 1].map((sx) => { const goal = inked(new THREE.Mesh(new THREE.BoxGeometry(0.0007, 0.0046, 0.0055), paint(0xf4f1ea)), { width: 0.5 }); goal.position.set(sx * 0.0215, 0.0023, 0); g.add(goal); return goal; });          // 两个球门
      g.position.copy(at(4.6, 10.6)); group.add(g);
      g.userData.fade = [track.material, field.material, lanes.material]; g.userData.bits = goals;
      add('track', g, symPlane(0.9, 8.4, 8.3, 12.8, (gg) => { gg.fillStyle = '#cfe6b8'; gg.strokeStyle = '#b5523b'; gg.lineWidth = 0.32 * PX; gg.beginPath(); gg.ellipse(X(4.6), Y(10.6), 3.34 * PX, 1.84 * PX, 0, 0, 7); gg.fill(); gg.stroke(); }), pickBox(1.1, 8.6, 8.1, 12.6, 0.006), true); }
    // 池塘：水面略低于地面，一圈石头边
    { const g = new THREE.Group(), shape = new THREE.Shape(); for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2, r = 1 + 0.08 * Math.sin(a * 3) + 0.05 * Math.cos(a * 5); shape[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
      const water = new THREE.Mesh(new THREE.ShapeGeometry(shape, 40), new THREE.MeshLambertMaterial({ color: 0x5c9fd6, transparent: true })); water.rotation.x = -Math.PI / 2; water.position.y = 0.0008; g.add(water);
      const rim = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.12, 48), new THREE.MeshLambertMaterial({ color: 0xb9b2a2, transparent: true })); rim.rotation.x = -Math.PI / 2; rim.position.y = 0.001; g.add(rim);
      g.scale.set(1.4 * CM, 1, 0.8 * CM); g.position.copy(at(16.5, 8.4)); group.add(g);
      g.userData.fade = [water.material, rim.material];
      add('pond', g, symPlane(14.8, 7.4, 18.2, 9.4, (gg) => { gg.save(); gg.translate(X(16.5), Y(8.4)); gg.scale(1.4 * PX, 0.8 * PX); gg.beginPath(); for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2, r = 1 + 0.08 * Math.sin(a * 3) + 0.05 * Math.cos(a * 5); gg[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, -Math.sin(a) * r); } gg.restore(); gg.fillStyle = '#8cc3ea'; gg.fill(); gg.strokeStyle = '#4b8fc4'; gg.lineWidth = 4; gg.stroke(); }), pickBox(15.1, 7.6, 17.9, 9.2, 0.006), true); }
    // 树林：十几棵树（约 8 米高）
    { const g = new THREE.Group(), leaf = paint(0x4f9a52), trunk = paint(0x7a5a3a);
      for (const [u, v] of TREES) { const t = new THREE.Group(), hgt = 0.008 * HX * (0.85 + ((u * 7 + v * 13) % 1) * 0.3); const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.0007, 0.0009, hgt * 0.45, 6), trunk); tr.position.y = hgt * 0.22; t.add(tr);
        const crown = hull(new THREE.Mesh(new THREE.SphereGeometry(hgt * 0.24, 12, 8), leaf), 0.0004); crown.position.y = hgt * 0.68; crown.scale.y = 1.25; t.add(crown); t.position.copy(at(u, v)).sub(at(3.3, 3.9)); t.position.y = 0; g.add(t); }
      g.position.copy(at(3.3, 3.9)); group.add(g);
      add('woods', g, symPlane(0.8, 1.6, 5.8, 6.3, (gg) => { for (const [u, v] of TREES) treeSym(gg, X(u), Y(v) + 6, 1.1); }), pickBox(1.0, 1.8, 5.6, 6.1, 0.014)); }
    // 校门：两根门柱一道横梁（约 4.5 米高），跨在路口
    { const g = new THREE.Group(), m = paint(0x8a8f99);
      for (const sx of [-1, 1]) { const p = inked(new THREE.Mesh(new THREE.BoxGeometry(0.0022, 0.0082, 0.0022), m), { width: 0.5 }); p.position.set(sx * 0.0032, 0.0041, 0); g.add(p); }
      const beam = inked(new THREE.Mesh(new THREE.BoxGeometry(0.0095, 0.0014, 0.0024), paint(0xb8322c)), { width: 0.5 }); beam.position.y = 0.0089; g.add(beam);
      g.position.copy(at(...GATE)); group.add(g);
      add('gate', g, symPlane(8.3, 0.5, 9.7, 1.5, (gg) => gateSym(gg, X(GATE[0]), Y(GATE[1]), 0.9)), pickBox(7.6, 0.4, 10.4, 1.9)); }

    // ================= 纸边上的滑块：模型 ↔ 地图 =================
    const SL = { x0: -0.07, x1: 0.07, z: PH / 2 * CM + 0.026 };
    const slTex = canvasTex(1600, 160, (g, Wc, Hc) => {
      g.fillStyle = '#f4ecd9'; g.fillRect(0, 0, Wc, Hc); g.strokeStyle = 'rgba(90,70,40,.35)'; g.lineWidth = 4; g.strokeRect(2, 2, Wc - 4, Hc - 4);
      g.fillStyle = '#c9b48e'; g.fillRect(230, Hc / 2 - 7, Wc - 460, 14);
      g.fillStyle = '#2a3040'; g.font = '700 60px "Songti SC", serif'; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText('模型', 115, Hc / 2 + 2); g.fillText('地图', Wc - 115, Hc / 2 + 2);
    });
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.02), new THREE.MeshLambertMaterial({ map: slTex })); strip.rotation.x = -Math.PI / 2; strip.position.set(0, 0.0006, SL.z); strip.raycast = () => {}; group.add(strip);
    const knob = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.006, 24), paint(0xd9a24a)), { width: 0.8, handle: true }); knob.position.set(SL.x0, 0.003, SL.z); group.add(knob);
    const knobPick = new THREE.Mesh(new THREE.SphereGeometry(0.011, 12, 8), new THREE.MeshBasicMaterial({ visible: false })); knobPick.userData.pick = true; knobPick.userData.track = true; knob.add(knobPick);

    // ================= 八个方向（课本图 2.6）：一张圆纸片 =================
    const ROSE_R = 0.026;
    const roseTex = canvasTex(1024, 1024, (g, Wc, Hc) => {
      const c = Wc / 2; g.clearRect(0, 0, Wc, Hc);
      g.fillStyle = 'rgba(253,250,240,0.9)'; g.beginPath(); g.arc(c, c, c - 8, 0, 7); g.fill(); g.strokeStyle = '#2a3040'; g.lineWidth = 6; g.stroke();
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.strokeStyle = i % 2 ? 'rgba(42,48,64,0.45)' : '#2a3040'; g.lineWidth = i % 2 ? 4 : 7; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.sin(a) * (c - 150), c - Math.cos(a) * (c - 150)); g.stroke(); }
      g.textAlign = 'center'; g.textBaseline = 'middle';
      DIRS.forEach((n, i) => { const a = (i / 8) * Math.PI * 2, r = c - 90; g.fillStyle = i ? '#2a3040' : '#c8342a'; g.font = `700 ${i % 2 ? 70 : 84}px "Songti SC", serif`; g.fillText(n, c + Math.sin(a) * r, c - Math.cos(a) * r); });
    }, {});
    const rose = new THREE.Group(), roseDisk = new THREE.Mesh(new THREE.CircleGeometry(ROSE_R, 64), new THREE.MeshBasicMaterial({ map: roseTex, transparent: true, depthWrite: false }));
    roseDisk.rotation.x = -Math.PI / 2; roseDisk.renderOrder = 6; rose.add(roseDisk); group.add(rose);
    const sector = new THREE.Mesh(new THREE.CircleGeometry(ROSE_R * 0.98, 32, Math.PI / 2 - Math.PI / 8, Math.PI / 4), new THREE.MeshBasicMaterial({ color: 0xe8890c, transparent: true, opacity: 0, depthWrite: false }));          // 亮起来的那一格（默认是“北”那一格，转到要指的方向）
    sector.rotation.x = -Math.PI / 2; sector.position.y = 0.0003; sector.renderOrder = 7; rose.add(sector);          // 画在纸片上面
    const rosePick = new THREE.Mesh(new THREE.RingGeometry(ROSE_R * 0.3, ROSE_R * 1.05, 32), new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })); rosePick.rotation.x = -Math.PI / 2; rosePick.position.y = 0.0015; rosePick.userData.pick = true; rosePick.userData.track = true; rose.add(rosePick);          // 拿纸片的边：中间空着，放在池塘上时还点得到池塘
    const ROSE_HOME = new THREE.Vector3(0.138, TOP + 0.0008, -0.02);
    const sight = polyline([at(...F.pond.c, TOP + 0.0012), at(...F.lib.c, TOP + 0.0012)], { width: 2.6, color: 0xe8890c, dashed: true, dash: 0.004, gap: 0.003 }); sight.visible = false; sight.renderOrder = 8; group.add(sight);          // 从池塘到图书馆的一条虚线

    // ================= 分规：两只脚（针尖）、上面的铰链 =================
    const LEG = 0.065;          // 分规一条腿 6.5 厘米：张开 8 厘米时铰链还在 5 厘米高
    const dv = new THREE.Group(); group.add(dv);
    const steel = paint(0x9aa3ad, { keep: true });
    const legs = [0, 1].map(() => { const m = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0011, 0.0006, 1, 8), steel), { width: 0.6, handle: true }); dv.add(m); return m; });
    const cap = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.006, 20), paint(0x55606e, { keep: true })), { width: 0.8, handle: true }); dv.add(cap);
    const tipPick = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 10, 8), new THREE.MeshBasicMaterial({ visible: false })); m.userData.pick = true; m.userData.track = true; dv.add(m); return m; });
    const capPick = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 12, 8), new THREE.MeshBasicMaterial({ visible: false })); capPick.userData.pick = true; capPick.userData.track = true; dv.add(capPick);
    const DV_HOME = [new THREE.Vector3(0.124, TOP, 0.048), new THREE.Vector3(0.134, TOP, 0.048)];
    const POI = [GATE, DOOR];
    const ptA = new THREE.Mesh(new THREE.CircleGeometry(0.0022, 20), new THREE.MeshBasicMaterial({ color: 0xc8342a })), ptB = ptA.clone();          // 量距离的两点（到这一步才标出来）
    for (const [m, p] of [[ptA, GATE], [ptB, DOOR]]) { m.rotation.x = -Math.PI / 2; m.position.copy(at(...p, TOP + 0.0006)); m.visible = false; m.renderOrder = 4; group.add(m); }
    const readTag = tag('', 'pill'); readTag.show(false);
    const nameTag = tag('', 'pill'); nameTag.show(false);

    // ================= 状态 =================
    const fresh = () => ({ demo: false, k: 0, kT: 0, rose: { p: ROSE_HOME.clone(), on: null, rot: 0, rotT: 0 }, tips: DV_HOME.map((v) => v.clone()), glide: null, onBar: false, named: {}, flat: false, dir: false, measured: false, read: false, scaleOk: false, dirOk: false });
    S = fresh();

    const setK = (k) => { S.k = clamp(k, 0, 1); knob.position.x = SL.x0 + (SL.x1 - SL.x0) * S.k; };
    const A = {
      /** 滑块拖到 k（0 模型 … 1 地图） */
      slide(k) { setK(k); S.kT = S.k; },
      release() {
        S.kT = S.k > 0.5 ? 1 : 0;
        aim?.(S.kT ? [0, Math.sin(62 * D2R), Math.cos(62 * D2R)] : [0, Math.sin(34 * D2R), Math.cos(34 * D2R)]);          // 地图：镜头抬高往下看；模型：斜着看
        if (S.kT === 1 && !S.flat) {
          S.flat = true; done('flat'); sfx.clink?.({ freq: 660, gain: 0.03 });
          log(['模型压成地图', '楼房、树木只剩从正上方看到的样子，画成符号']);
          status('从上方看，楼房、树木只剩<b>位置和占地范围</b>；按比例缩小，再用<b>符号和注记</b>画在纸上：这就是地图。地图和模型的平面比例都是 1∶1 000：图上 1 厘米代表实地 1 000 厘米（10 米），纸上写着比例尺 <b>1∶1 000</b>。图例里有三个符号还没写名字：点地图上的这些符号，看看它们是什么。');
        } else if (S.kT === 0) status('又变回了模型。地图上的每个符号，都对着模型里的一样东西。');
      },
      /** 点地图上的一样东西：它在纸上立起来，看清是什么；图例里没写名字的，写上 */
      tap(key) {
        const f = feats[key]; if (!f) return;
        f.popT = 0; nameTag.text(`这是：<b>${f.name}</b>`).loc(f.obj, 0, 0.014, 0).show(true);
        if (S.k < 0.5) { status(`这是<b>${f.name}</b>。先把滑块拖到“地图”，再点地图上的符号，看符号和它对得上。`); return; }
        if (f.blank && !S.named[key]) {
          S.named[key] = true; named[key] = true; drawPaper(); sfx.clink?.({ freq: 880, gain: 0.03 });
          log([`点开：${f.name}`, `图例：${f.legend}`]);
          const left = Object.keys(F).filter((k) => F[k].blank && !S.named[k]);
          status(`点开的是<b>${f.name}</b>：图例里这个符号叫<b>“${f.legend}”</b>${key === 'pond' ? '——这张图用蓝色表示水体，这一块表示池塘。阅读别的地图时，要看那张图的图例辨认具体的符号' : ''}。图例是对地图上各种符号和注记的说明。${left.length ? `还有 ${left.length} 个没写名字。` : '图例补全了。'}`);
          if (!left.length) done('legend');
        } else status(`这是<b>${f.name}</b>，图例里叫“${f.legend}”。`);
      },
      /** 八个方向放到 p（实验坐标，纸面上）：靠近哪样东西就落在它的中心，再按指向标转好 */
      dropRose(p) {
        const uv = uvOf(p); let best = null;
        for (const f of Object.values(feats)) { const d = Math.hypot(f.c[0] - uv.u, f.c[1] - uv.v); if (d < 2.6 && (!best || d < best.d)) best = { f, d }; }
        const onPaper = uv.u > 0 && uv.u < PW && uv.v > 0 && uv.v < PH;
        if (!onPaper) { S.rose.p.copy(ROSE_HOME); S.rose.on = null; S.rose.rotT = 0; sight.visible = false; return; }
        if (best) S.rose.p.copy(at(...best.f.c, TOP + 0.0008)); else S.rose.p.set(p.x, TOP + 0.0008, p.z);
        S.rose.on = best?.f.key || null; S.rose.rotT = -NORTH * D2R;          // 转到“北”对着指向标（右上方 45°）
        if (S.rose.on === 'pond') {
          const lib = F.lib.c, pond = F.pond.c, dname = dirOf(lib[0] - pond[0], lib[1] - pond[1]);
          if (!S.dir) { S.dir = true; done('dir'); log(['八个方向放在池塘上，按指向标转好', `图书馆在池塘的${dname}方向`]); }
          status('“八个方向”按<b>指向标</b>转好了：它的“北”对着指向标，不朝正上方。看图书馆落在哪一格——它在池塘的什么方向？在左边作答。');
          if (!S.demo) W?.t1.open();
        } else if (S.rose.on) status(`“八个方向”放在<b>${F[S.rose.on].name}</b>上，按指向标转好了。这张活页的问题是图书馆在<b>池塘</b>的什么方向：把它放到池塘上。`);
        else status('“八个方向”按指向标转好了。把它放到<b>池塘</b>上，看图书馆在池塘的什么方向。');
      },
      /** 分规的一只脚放到 p（靠近校门、教学楼门口就落在那一点上） */
      tipTo(i, p) {
        const q = p.clone(); q.y = TOP;
        for (const c of POI) { const t = at(...c); if (t.distanceTo(q) < 0.6 * CM) { q.copy(t); break; } }
        const other = S.tips[1 - i], d = q.distanceTo(other);
        if (d > LEG * 1.9) { const dir = other.clone().sub(q).setLength(LEG * 1.9); other.copy(q).add(dir); }          // 张到头了：另一只脚被带着走
        S.tips[i].copy(q); S.onBar = false; S.glide = null;
      },
      tipsDone() {
        const g = at(...GATE), dr = at(...DOOR), [a, b] = S.tips, hit = (a.distanceTo(g) < 1e-4 && b.distanceTo(dr) < 1e-4) || (a.distanceTo(dr) < 1e-4 && b.distanceTo(g) < 1e-4);
        if (hit && !S.measured) { S.measured = true; status('分规的两只脚分别扎在<b>校门</b>和<b>教学楼门口</b>：两脚张开的宽度就是图上距离。现在<b>保持开口</b>，拿着分规顶上的铰链，把它挪到图上方的<b>线段比例尺</b>上，读出实地距离。'); }
      },
      /** 拿着铰链平移整个分规；松手时靠近线段比例尺就放上去：一只脚对准 0 */
      moveBy(dx, dz) { for (const t of S.tips) { t.x += dx; t.z += dz; } S.onBar = false; S.glide = null; },
      dropDividers() {
        const mid = S.tips[0].clone().add(S.tips[1]).multiplyScalar(0.5), uv = uvOf(mid), spread = S.tips[0].distanceTo(S.tips[1]) / CM;
        if (Math.abs(uv.v - BAR.v) < 2.2 && uv.u > BAR.u0 - 2 && uv.u < BAR.u0 + BAR.len + 2) {
          // 分规整个转过来、落到比例尺上：开口一直保持不变（只挪中心、转方向），一只脚对准 0——量好的距离原样搬过去
          const [p0, p1] = S.tips, c0 = p0.clone().add(p1).multiplyScalar(0.5), a0 = Math.atan2(p1.z - p0.z, p1.x - p0.x), wrapA = (x) => Math.atan2(Math.sin(x), Math.cos(x));
          const flip = Math.abs(wrapA(Math.PI - a0)) < Math.abs(wrapA(0 - a0));          // 转到哪一头近：0（第一只脚在左）还是 π（第二只脚在左）
          const a1 = a0 + wrapA((flip ? Math.PI : 0) - a0), c1 = at(BAR.u0 + spread / 2, BAR.v);
          S.glide = { c0, c1, a0, a1, r: (spread * CM) / 2, k: 0 }; S.onBar = true;
          const m = Math.round(spread * 10);          // 线段比例尺上读到 1 米
          if (spread > BAR.len + 0.01) { status(`两脚张开 ${spread.toFixed(1)} 厘米，比线段比例尺还长。`); return; }
          if (S.measured && Math.abs(spread - 8) < 0.05) {
            if (!S.read) { S.read = true; done('scale'); sfx.clink?.({ freq: 990, gain: 0.03 }); log(['分规量校门 → 教学楼门口', `图上 8.0 厘米，线段比例尺上读 ${m} 米`]); }
            status(`一只脚对准比例尺的 0，另一只脚落在 <b>${m} 米</b>：校门到教学楼门口的实地直线距离是 ${m} 米。再用数字比例尺算一遍，在左边作答。`);
            if (!S.demo) W?.t2.open();
          } else status(`分规放到线段比例尺上了：两脚张开 ${spread.toFixed(1)} 厘米，代表实地 ${m} 米。这张活页要量的是<b>校门</b>到<b>教学楼门口</b>：先把两只脚分别扎在这两点上。`);
        }
      },
      reset() {
        W?.ui?.relock?.(); S = fresh(); for (const k of Object.keys(named)) delete named[k]; drawPaper(); setK(0); aim?.([0, Math.sin(34 * D2R), Math.cos(34 * D2R)]);
        if (W) { W.tbl.clear(); W.t1.close(); W.t2.close(); W.next.hidden = true; }
        bar.undo('flat', 'legend', 'dir', 'scale', 'why'); status('全部重新摆好了：又是一座模型，分规、八个方向放回桌边。');
      },
    };

    // ================= 拖动、点击 =================
    let grip = null;
    const tip = tag('', 'pill');
    const drag = draggable(group, [
      { obj: knobPick, plane: 'xz', offset: 0.003, hint: '拖着滑块：模型 ↔ 地图', onDrag: (p) => A.slide((p.x - SL.x0) / (SL.x1 - SL.x0)), onEnd: () => A.release() },
      { obj: rosePick, plane: 'xz', offset: TOP + 0.0008, hint: '抓住“八个方向”的外圈，拖到地图上', onStart: () => { S.rose.rotT = 0; sight.visible = false; }, onDrag: (p) => { S.rose.p.set(p.x, TOP + 0.0008, p.z); }, onEnd: () => A.dropRose(S.rose.p) },
      ...[0, 1].map((i) => ({ obj: tipPick[i], plane: 'xz', offset: TOP, hint: '拖着分规的这只脚', onDrag: (p) => A.tipTo(i, p), onEnd: () => A.tipsDone() })),
      { obj: capPick, plane: 'xz', offset: TOP, hint: '拿着铰链挪动整个分规（开口不变）', onStart: (p) => { grip = p ? p.clone() : null; }, onDrag: (p) => { if (p && grip) { A.moveBy(p.x - grip.x, p.z - grip.z); grip.copy(p); } }, onEnd: () => A.dropDividers() },
    ], { tip, taps: Object.values(feats).map((f) => ({ obj: f.pick, hint: () => (S.k > 0.5 ? `点一下：这个符号是什么？` : `这是${f.name}`), onTap: () => A.tap(f.key) })) });

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'flat', title: '变成地图', todo: '把纸前面的<b>滑块</b>从“模型”拖到“地图”：看楼房、树木怎样变成纸上的符号。', target: () => knob },
        { id: 'legend', title: '图例', todo: '图例里有三个符号还没写名字。<b>点地图上的这些符号</b>，它们会在纸上立起来，看清是什么，图例里就写上名字。', target: () => { const k = Object.keys(F).find((x) => F[x].blank && !S.named[x]); return k ? feats[k].obj : null; } },
        { id: 'dir', title: '方向', todo: '这张图用<b>指向标</b>指方向。把桌边的<b>“八个方向”</b>拖到<b>池塘</b>上，看它怎样转，读出图书馆在池塘的什么方向。', target: () => rose },
        { id: 'scale', title: '比例尺', todo: '用<b>分规</b>量校门到教学楼门口：两只脚分别扎在两个红点上，再拿着铰链把分规挪到<b>线段比例尺</b>上，读出实地距离。', target: () => (S.measured ? cap : legs[0]) },
        { id: 'why', title: '想一想', todo: '在左边回答方向、比例尺的问题。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => {
            setK(S.k); for (const k of Object.keys(named)) delete named[k]; Object.assign(named, S.named); drawPaper();
            if (S.demo) W?.status('老师演示中：看画面下面的字幕。你刚才的操作先存着，演示完放回来。'); else if (said) W?.status(said);
          } }),
          shots: [
            { cap: '一所学校的模型立在一张纸上：教学楼、图书馆、操场、池塘、树林、校门。纸上已经印好了道路、图名、比例尺、指向标和图例。', dur: 5 },
            { cap: '把滑块拖到“地图”：楼房、树木矮下去，只剩从正上方看到的样子，画成符号——这就是地图。', dur: 6, during: slideTo(1, 0.08, 0.7) },
            { cap: '图例里蓝色的符号还没写名字。点一下地图上的这个符号：它是池塘——图例里叫“水体”。', dur: 5.5, during: when(0.15, () => A.tap('pond')) },
            { cap: '这张图有指向标，指向标指向右上方。把“八个方向”放到池塘上：它按指向标转好，图书馆落在“西北”那一格。', dur: 7, during: roseTo(F.pond.c, 0.08, 0.6) },
            { cap: '分规的两只脚扎在校门和教学楼门口，再挪到线段比例尺上：一只脚对着 0，另一只脚落在 80 米。', dur: 9, during: measure(0.06, 0.82) },
            { cap: '数字比例尺 1∶1 000：图上 1 厘米代表实地 1 000 厘米（10 米），8.0 厘米就是 80 米。演示完了，下面换你自己来。', dur: 6 },
          ],
        },
      },
    });

    // 演示里的动作：都走学生拖、点的同一套处理函数（A.slide / A.tap / A.dropRose / A.tipTo / A.moveBy / A.dropDividers），只是由时间推着走
    function slideTo(k1, t0, t1) { let st = null; return (k) => { if (k < t0) { st = null; return; } if (st?.done) return; if (!st) st = { a: S.k }; const u = clamp((k - t0) / (t1 - t0), 0, 1), e = u * u * (3 - 2 * u); A.slide(st.a + (k1 - st.a) * e); if (k >= t1) { st.done = true; A.release(); } }; }
    function when(t, fn) { let fired = false; return (k) => { if (k < t) { fired = false; return; } if (!fired) { fired = true; fn(); } }; }
    function roseTo(c, t0, t1) { let st = null; return (k) => { if (k < t0) { st = null; return; } if (st?.done) return; if (!st) { st = { a: S.rose.p.clone(), b: at3(c) }; S.rose.rotT = 0; } const u = clamp((k - t0) / (t1 - t0), 0, 1), e = u * u * (3 - 2 * u); S.rose.p.lerpVectors(st.a, st.b, e); if (k >= t1) { st.done = true; A.dropRose(S.rose.p); } }; }
    function at3(c) { return at(c[0], c[1], TOP + 0.0008); }
    function at3v(u, v) { return at(u, v, TOP + 0.0008); }
    function measure(t0, t1) {
      let st = null;
      return (k) => {
        if (k < t0) { st = null; return; } if (st?.done) return;
        if (!st) st = { a: S.tips[0].clone(), b: S.tips[1].clone(), moved: false };
        const u = clamp((k - t0) / (t1 - t0), 0, 1), e = (x) => x * x * (3 - 2 * x);
        if (u < 0.5) {          // 前一半：两只脚扎到校门、教学楼门口
          const w = e(clamp(u / 0.45, 0, 1)), ga = at3v(...GATE), gb = at3v(...DOOR);
          A.tipTo(0, st.a.clone().lerp(ga, w)); A.tipTo(1, st.b.clone().lerp(gb, w));
          if (w >= 1 && !st.tipped) { st.tipped = true; A.tipsDone(); }
        } else {          // 后一半：拿着铰链挪到比例尺上
          if (!st.c) st.c = S.tips[0].clone().add(S.tips[1]).multiplyScalar(0.5);
          const w = e(clamp((u - 0.55) / 0.4, 0, 1)), target = at3v(BAR.u0 + 4, BAR.v + 0.8), mid = S.tips[0].clone().add(S.tips[1]).multiplyScalar(0.5), want = st.c.clone().lerp(target, w);
          A.moveBy(want.x - mid.x, want.z - mid.z);
          if (k >= t1) { st.done = true; A.dropDividers(); }
        }
      };
    }
    const pointer = {
      items: drag.items,
      down(ray, e) { if (bar.playing) { bar.stop(); return true; } return drag.down(ray, e); },
      move: (ray, e) => drag.move(ray, e),
      up: (ray, e) => drag.up(ray, e),
    };

    // ================= 每帧 =================
    const TMP = new THREE.Vector3();
    const step = (dt) => {
      // 滑块松手后滑到头
      if (Math.abs(S.k - S.kT) > 1e-4) setK(S.k + (S.kT - S.k) * Math.min(1, dt * 6));          // 拖着的时候 kT 跟着 k，不会自己滑
      for (const f of Object.values(feats)) {
        if (f.popT >= 0) { f.popT += dt; f.pop = f.popT < 0.5 ? f.popT / 0.5 : f.popT < 2.1 ? 1 : Math.max(0, 1 - (f.popT - 2.1) / 0.5); if (f.popT > 2.6) { f.popT = -1; f.pop = 0; nameTag.show(false); } }
        const fe = S.k * (1 - f.pop), e = fe * fe * (3 - 2 * fe);          // 这一样东西“压平”了多少
        f.sym.material.opacity = e;
        if (f.flatOnly) { for (const m of f.obj.userData.fade) m.opacity = 1 - e; for (const b of f.obj.userData.bits || []) b.scale.y = Math.max(0.002, 1 - e); f.obj.visible = e < 0.999; }
        else { f.obj.scale.y = Math.max(0.002, 1 - e); f.obj.visible = e < 0.995; }
      }
      // 八个方向：转到指向标的方向；亮出图书馆所在的那一格
      rose.position.lerp(S.rose.p, Math.min(1, dt * 14));
      S.rose.rot += (S.rose.rotT - S.rose.rot) * Math.min(1, dt * 5); rose.rotation.y = S.rose.rot;
      const onPond = S.rose.on === 'pond' && Math.abs(S.rose.rot - S.rose.rotT) < 0.02;
      sector.material.opacity += ((onPond ? 0.38 : 0) - sector.material.opacity) * Math.min(1, dt * 6);
      if (onPond) sector.rotation.z = -DIRS.indexOf(dirOf(F.lib.c[0] - F.pond.c[0], F.lib.c[1] - F.pond.c[1])) * Math.PI / 4;          // 扇形本来盖着“北”那一格；往顺时针转几格，盖住图书馆所在的那一格
      sight.visible = onPond;
      // 分规（落到比例尺上的那一下：两只脚一起滑过去）
      if (S.glide) {
        const G = S.glide; G.k = Math.min(1, G.k + dt / 0.6); const e = G.k * G.k * (3 - 2 * G.k), c = G.c0.clone().lerp(G.c1, e), ang = G.a0 + (G.a1 - G.a0) * e, d = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang)).multiplyScalar(G.r);
        S.tips[0].copy(c).sub(d); S.tips[1].copy(c).add(d); S.tips[0].y = S.tips[1].y = TOP;
        if (G.k >= 1) S.glide = null;
      }
      const [a, b] = S.tips, mid = TMP.copy(a).add(b).multiplyScalar(0.5), half = a.distanceTo(b) / 2, hgt = Math.sqrt(Math.max(1e-8, LEG * LEG - half * half));
      const hinge = mid.clone(); hinge.y = TOP + hgt;
      [a, b].forEach((t, i) => { const m = legs[i], d = hinge.clone().sub(t), L = d.length(); m.position.copy(t).addScaledVector(d, 0.5); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); tipPick[i].position.copy(t).add(new THREE.Vector3(0, 0.0075, 0)); });          // 拿针尖：拾取球在针尖上面一点（扎在校门上时，校门的符号边上还点得到）
      cap.position.copy(hinge); capPick.position.copy(hinge);
      { const ab = b.clone().sub(a); ab.y = 0; if (ab.lengthSq() > 1e-10) cap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-ab.z, 0, ab.x).normalize()); }
      readTag.text(`${(a.distanceTo(b) / CM).toFixed(1)} 厘米${S.onBar ? ` → 约 ${Math.round((a.distanceTo(b) / CM) * 10)} 米` : ''}`).loc(group, b.x, TOP + 0.012, b.z).show(a.distanceTo(b) > 0.03 && !bar.playing || S.onBar);
      ptA.visible = ptB.visible = S.flat || S.measured;
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.32, d: 0.22, h: 0.06 },
      view: { elev: 34, azim: 0, lookY: 0.2, frameMargin: 1.08 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const t2 = think({ title: '想一想', status,
          q: '数字比例尺 1∶1 000：校门到教学楼门口图上量得 8.0 厘米，实地距离是多少？',
          options: ['80 米', '8 米', '800 米'],
          wrong: ['1∶1 000 表示图上 1 厘米代表实地 1 000 厘米，也就是 10 米。8.0 厘米代表的是 8 000 厘米。', '8.0 × 1 000 = 8 000 厘米；100 厘米是 1 米，8 000 厘米是 80 米，不是 800 米。'],
          ok: '对：8.0 厘米 × 1 000 = 8 000 厘米 = 80 米，和线段比例尺上读出来的一样。比例尺 = 图上距离 / 实地距离。',
          onOk: () => { S.scaleOk = true; finish(); } });
        const t1 = think({ title: '想一想', status,
          q: '按指向标读：图书馆在池塘的什么方向？',
          options: ['西北', '北', '东北'],
          wrong: ['“北”是按“上北下南”读的。这张图有指向标，指向标指向右上方——要按指向标辨别方向。看“八个方向”转好以后，图书馆落在哪一格。', '“八个方向”的“北”要先对准右上方的指向标。转好以后，东北在图纸的正右方，西北在正上方；图书馆在池塘正上方，所以在池塘的西北方向。'],
          ok: '对：在有指向标的地图上，要按照指向标辨别方向。这张图的北方指向右上方，画在池塘正上方的图书馆，在池塘的西北方向。',
          onOk: () => { S.dirOk = true; finish(); } });
        const finish = () => { if (S.dirOk && S.scaleOk) { next.hidden = false; done('why'); } };
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '对照课本原文 →');
        const tbl = table(['做了什么', '看到的']);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：学校是编的，不是真实的地方。模型和地图的平面比例都是 1∶1 000；楼房、树木的高度另外放大了 2 倍，看得清楚一些。图上的厘米按这张纸的刻度读，不用尺子量屏幕。分规的脚靠近两个红点会扎到点上；挪到比例尺附近松手，一只脚会对准 0。' });
        ui.controls.append(t1.el, t2.el, next, more, note);
        ui.data.append(tbl.el);
        const dtl = ui.data.previousElementSibling; if (dtl?.classList.contains('bar-title')) dtl.textContent = '读到了什么';
        W = { ui, tbl, t1, t2, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        status('图 2.2：方向、图例和比例尺是地图的“语言”。这张活页照课本的方法，读一张编出来的校园平面图：桌上是这所学校的模型，立在它自己的平面图上。先把纸前面的<b>滑块</b>拖到“地图”，看模型怎样变成地图。可以先看<b>老师演示</b>，也可以直接动手。');
      },
      update(dt) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k); },
      dispose() { bar.dispose(); tip.remove(); readTag.remove(); nameTag.remove(); },
      debug: { get S() { return S; }, A, bar, feats,
        qa: qaFlow(drag, [
          { name: '滑块拖到地图', drag: knobPick, to: () => new THREE.Vector3(SL.x1 + 0.01, 0.003, SL.z), wait: 1.5 },
          ...Object.keys(F).filter((k) => F[k].blank).map((k) => ({ name: `点${F[k].name}`, tap: feats[k].pick, wait: 0.8 })),
          { name: '八个方向放到池塘上', drag: rosePick, to: () => at3(F.pond.c), wait: 1.2 },
          { name: '分规一只脚到校门', drag: tipPick[0], to: () => at3v(...GATE).setY(TOP), wait: 0.4 },
          { name: '另一只脚到教学楼门口', drag: tipPick[1], to: () => at3v(...DOOR).setY(TOP), wait: 0.4 },
          { name: '分规挪到比例尺上', run: () => { const mid = S.tips[0].clone().add(S.tips[1]).multiplyScalar(0.5), t = at3v(BAR.u0 + 4, BAR.v + 0.6); A.moveBy(t.x - mid.x, t.z - mid.z); A.dropDividers(); }, wait: 1 },
          { name: '答方向', run: () => W.t1.el.querySelector('button').click() },
          { name: '答比例尺', run: () => W.t2.el.querySelector('button').click() },
        ]) },
    };
  },
};
