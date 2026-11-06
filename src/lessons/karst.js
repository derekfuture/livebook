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
import { STAGES, stageName, RATE, STEP, cave, terrainHeight } from './kit/karst.js';

const BW = 0.11, BD = 0.11, GAP = 0.022, H0 = 0.09, N = 70;          // 一块的宽、深；块与块的间隔；原来的地面高度；网格密度
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
    quote: '组成地壳的岩石有一部分是可溶性岩石，如石灰岩等。在适当条件下，这类岩石的物质溶于水并被带走，或重新沉淀，从而在地表和地下形成形态各异的地貌，统称为喀斯特地貌。……地表喀斯特地貌主要有溶沟、洼地、峰林等。……溶沟进一步发展，可形成面积较大的洼地。……洼地边缘残留的岩体，常常呈锥状耸立，构成峰丛、峰林。峰林可演变为孤峰，以至残丘。……地下喀斯特地貌以溶洞为主。……溶洞顶部常见向下发育的石钟乳、石幔或石帘；底部常见向上发育的石笋。石钟乳和石笋连接起来形成石柱。',
    why: '石灰岩是可溶性岩石。雨水吸收空气及土壤中的 CO₂，形成弱酸性水，沿裂隙入渗，一边走一边把岩石溶掉、带走：地表先溶出一道道溶沟，溶沟连成洼地，洼地之间剩下的岩体就成了峰丛、峰林，再溶下去只剩孤峰、残丘。地下的水把岩石溶出溶洞；洞顶滴下的水里，二氧化碳跑出去，溶在水里的物质又沉淀下来，洞顶长出石钟乳、洞底长出石笋。在岩性、裂隙等条件相近时，水分越充足通常越有利于溶蚀（水温、水里溶进的二氧化碳等也有影响），我国广西、贵州、云南等地石灰岩分布广、气候湿热，喀斯特地貌最为典型；干旱地区发育得慢得多；花岗岩不是可溶性岩石，不会形成这样的喀斯特地貌（它的风化、侵蚀是另一回事，本活页没有模拟）。这里展示的是一种典型演变示意，不是每个地方都要依次经过这六步。',
    src: '课本第 66–68 页 · 第四章 第一节 常见地貌类型',
  },

  create({ tag }) {
    const group = new THREE.Group(), block = new THREE.Group(); group.add(block);
    const S = { time: 0, play: false, seen: {}, moved: false, guess: null };
    let W = null;
    const tOf = (b) => Math.min(1, S.time * STEP * RATE[b.rock][b.clim]);

    // ---- 每块的山峰：在格点附近随机放一些锥形的峰（溶下去以后剩下的就是它们） ----
    const peaksOf = (seed) => { const R = mkRnd(seed), P = []; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) P.push({ x: -BW / 2 + BW * (i + 0.5 + (R() - 0.5) * 0.6) / 4, z: -BD / 2 + BD * (j + 0.5 + (R() - 0.5) * 0.6) / 4, r: R(), k: 0.75 + R() * 0.5 }); return P; };
    const height = (b, P, x, z) => terrainHeight(b, P, x, z, tOf(b), H0);

    // ---- 三块岩石 ----
    const grain = canvasTex(256, 256, (g, w) => { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, w); for (let i = 0; i < 2400; i++) { const v = 150 + Math.random() * 100; g.fillStyle = `rgba(${v},${v},${v},${0.2 + Math.random() * 0.35})`; g.fillRect(Math.random() * w, Math.random() * w, 1.6, 1.6); } }, { repeat: [2, 2] });
    const LIME = new THREE.Color(0xbfbdb4), GRA = new THREE.Color(0xc8aaa0), GREEN = new THREE.Color(0x6f9a4c), FIELD = new THREE.Color(0xc2c86a), DRYC = new THREE.Color(0xc9b48a), tc = new THREE.Color();
    const units = BLOCKS.map((b, bi) => {
      const g = new THREE.Group(); g.position.x = b.x; block.add(g);
      const P = peaksOf(17 + bi * 31);
      const geo = new THREE.PlaneGeometry(BW, BD, N, N); geo.rotateX(-Math.PI / 2);
      const col = new Float32Array(geo.attributes.position.count * 3); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const top = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, map: grain })); g.add(top);
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 360; const ftex = new THREE.CanvasTexture(cv); ftex.colorSpace = THREE.SRGBColorSpace; ftex.anisotropy = 8;
      const front = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshLambertMaterial({ map: ftex, side: THREE.DoubleSide })); g.add(front);
      const sideM = new THREE.MeshLambertMaterial({ color: b.rock === 'granite' ? 0xb8988e : 0xaaa79e }), sides = new THREE.Mesh(new THREE.BufferGeometry(), sideM); g.add(sides);
      const houses = new THREE.InstancedMesh(new THREE.BoxGeometry(0.0035, 0.0028, 0.0045).translate(0, 0.0014, 0), new THREE.MeshLambertMaterial({ color: 0xf0e8da }), 14); houses.raycast = () => {}; g.add(houses);
      const trees = new THREE.InstancedMesh(new THREE.ConeGeometry(0.0016, 0.0045, 6).translate(0, 0.0022, 0), new THREE.MeshLambertMaterial({ color: 0x3f6f35 }), 160); trees.raycast = () => {}; g.add(trees);
      // 雨：湿润的地方雨密，干旱的地方稀
      const rp = new Float32Array(80 * 6), rain = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(rp, 3)), new THREE.LineBasicMaterial({ color: 0x7898c0, transparent: true, opacity: 0.55 })); rain.raycast = () => {}; g.add(rain);
      const R = mkRnd(5 + bi), drops = Array.from({ length: b.clim === 'wet' ? 80 : 10 }, () => ({ x: (R() - 0.5) * BW * 0.9, z: (R() - 0.5) * BD * 0.9, t: R() }));
      const cloudTex = canvasTex(128, 128, (c2, w) => { const gr = c2.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c2.fillStyle = gr; c2.fillRect(0, 0, w, w); });
      for (let k = 0; k < (b.clim === 'wet' ? 9 : 3); k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, color: b.clim === 'wet' ? 0xb8c0cc : 0xe8e6e0, transparent: true, depthWrite: false })); s.position.set((R() - 0.5) * BW * 0.8, 0.135 + R() * 0.008, (R() - 0.5) * BD * 0.6); const r = 0.03 + R() * 0.012; s.scale.set(r * 1.4, r * 0.7, 1); s.raycast = () => {}; g.add(s); }
      const label = airLabel(g, b.name, { x: 0, y: 0.16, z: 0, h: 0.0078, color: '#2c3245' }), stageL = airLabel(g, '', { x: 0, y: 0.149, z: 0, h: 0.0085, color: '#a8341f' });
      return { b, g, P, geo, col, top, cv, ftex, front, sides, houses, trees, rain, rp, drops, label, stageL };
    });
    const rebuild = (u) => {
      const { b, P, geo, col } = u, t = tOf(b), p = geo.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const x = p.getX(k), z = p.getZ(k), hgt = height(b, P, x, z); p.setY(k, hgt);
        if (b.rock === 'granite') tc.copy(GRA).lerp(GREEN, 0.35); else { const low = hgt < H0 - 0.04 && t > 0.45, slope = (H0 - hgt) / H0; tc.copy(LIME).lerp(b.clim === 'wet' ? GREEN : DRYC, b.clim === 'wet' ? 0.25 + 0.45 * (1 - slope) * sm(0.2, 0.6, t) : 0.35); if (low && b.clim === 'wet') tc.copy(FIELD).multiplyScalar(0.92 + 0.08 * Math.sign(Math.sin(x * 900) * Math.sin(z * 700))); }          // 湿润的峰上长着树（绿），坝子里是一块块田
        col.set([tc.r, tc.g, tc.b], k * 3);
      }
      p.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
      // 前面的切面、两侧和后面
      const strip = (zf, flip) => { const P2 = [], U = [], I = []; for (let i = 0; i <= N; i++) { const x = -BW / 2 + (BW * i) / N, y = height(b, P, x, zf); P2.push(x, y, zf, x, 0, zf); U.push(i / N, y / 0.1, i / N, 0); if (i) { const a = 2 * i - 2; flip ? I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) : I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } } const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(P2, 3)); g2.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g2.setIndex(I); g2.computeVertexNormals(); return g2; };
      u.front.geometry.dispose(); u.front.geometry = strip(BD / 2, false);
      const SP = []; for (const x of [-BW / 2, BW / 2]) for (let k = 0; k < N; k++) { const z0 = -BD / 2 + (BD * k) / N, z1 = z0 + BD / N; SP.push(x, 0, z0, x, height(b, P, x, z0), z0, x, height(b, P, x, z1), z1, x, 0, z0, x, height(b, P, x, z1), z1, x, 0, z1); }
      for (let i = 0; i < N; i++) { const x0 = -BW / 2 + (BW * i) / N, x1 = x0 + BW / N, z = -BD / 2; SP.push(x0, 0, z, x1, height(b, P, x1, z), z, x0, height(b, P, x0, z), z, x0, 0, z, x1, 0, z, x1, height(b, P, x1, z), z); }
      u.sides.geometry.dispose(); u.sides.geometry = new THREE.BufferGeometry(); u.sides.geometry.setAttribute('position', new THREE.Float32BufferAttribute(SP, 3)); u.sides.geometry.computeVertexNormals();
      paintFace(u, t);
      // 坝子里的村子；湿润的峰上的树
      const m4 = new THREE.Matrix4(), R = mkRnd(3); let nh = 0, nt = 0;
      if (b.rock === 'limestone' && b.clim === 'wet' && t > 0.5) for (let k = 0; k < 400 && nh < 14; k++) { const x = (R() - 0.5) * BW * 0.9, z = (R() - 0.5) * BD * 0.9, hg = height(b, P, x, z); if (hg < H0 - 0.045) { m4.makeTranslation(x, hg, z); u.houses.setMatrixAt(nh++, m4); } }
      if (b.clim === 'wet') for (let k = 0; k < 1200 && nt < 160; k++) { const x = (R() - 0.5) * BW * 0.94, z = (R() - 0.5) * BD * 0.94, hg = height(b, P, x, z); if (b.rock === 'granite' ? R() < 0.15 : hg > H0 - 0.035 || t < 0.3) { if (R() < (b.rock === 'granite' ? 1 : 0.5)) { m4.makeTranslation(x, hg - 0.0003, z); u.trees.setMatrixAt(nt++, m4); } } }
      u.houses.count = nh; u.trees.count = nt; u.houses.instanceMatrix.needsUpdate = true; u.trees.instanceMatrix.needsUpdate = true;
      const sn = b.rock === 'granite' ? null : stageName(t); u.stageL.setText(sn ?? (b.rock === 'granite' ? '不出现喀斯特形态' : t > 0 ? '刚开始溶蚀' : '')).setOn(S.time > 0);
      if (sn) { (S.seen[b.key] ||= new Set()).add(sn); }
    };
    // 切面：一层层石灰岩（或花岗岩）、裂隙、地下的溶洞和钟乳石
    function paintFace(u, t) {
      if (u.b.rock === 'granite' && u.facePainted) return; u.facePainted = true;          // 花岗岩纹理只绘制一次，避免随时间重新随机生成
      const { cv, ftex, b, P } = u, g = cv.getContext('2d'), w = cv.width, hh = cv.height, X = (x) => ((x + BW / 2) / BW) * w, Y = (y) => hh - (y / 0.1) * hh;
      g.clearRect(0, 0, w, hh);
      if (b.rock === 'granite') { g.fillStyle = '#c4a49a'; g.fillRect(0, 0, w, hh); for (let i = 0; i < 2600; i++) { g.fillStyle = ['#2a2a2a', '#f2ece4', '#a87a70'][i % 3]; g.fillRect(Math.random() * w, Math.random() * hh, 2 + Math.random() * 2, 2 + Math.random() * 2); } }
      else { for (let k = 0; k < 12; k++) { g.fillStyle = k % 2 ? '#b9b6ac' : '#c6c3b9'; g.fillRect(0, (k / 12) * hh, w, hh / 12 + 1); } g.strokeStyle = 'rgba(70,70,70,0.35)'; g.lineWidth = 1.5; for (let i = 0; i < 9; i++) { const x0 = (i + 0.5) * (w / 9) + Math.sin(i * 7) * 12; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + 10, hh); g.stroke(); } }          // 层理、竖着的裂隙
      if (b.rock === 'limestone') {
        const c = cave(t), cx = w * 0.52, cy = Y(0.016), rx = 30 + 120 * c.size, ry = 8 + 30 * c.size;          // 溶洞在地下深处：比后来溶低的地面（坝子）还低
        if (c.size > 0.02) {
          g.fillStyle = '#2a2a2c'; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.fill();          // 溶洞
          g.fillStyle = '#4f87b8'; g.beginPath(); g.ellipse(cx + rx * 0.45, cy + ry * 0.86, rx * 0.4, ry * 0.12, 0, 0, 7); g.fill();          // 地下河：在洞底一侧的河槽里
          const R = mkRnd(9); g.fillStyle = '#e4ddcc';
          for (let i = 0; i < 9; i++) { const x = cx - rx * 0.75 + (i / 8) * rx * 1.5 + (R() - 0.5) * 8, half = ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2)), L1 = half * 0.9 * c.drip * (0.5 + R() * 0.5), L2 = half * 0.7 * c.drip * (0.5 + R() * 0.5), col = c.column && i % 3 === 1;
            g.beginPath(); g.moveTo(x - 4, cy - half); g.lineTo(x + 4, cy - half); g.lineTo(x, cy - half + (col ? half : L1)); g.fill();          // 石钟乳：从洞顶往下
            if ((i % 2 === 0 || col) && x < cx + rx * 0.05) { g.beginPath(); g.moveTo(x - 5, cy + half - 1); g.lineTo(x + 5, cy + half - 1); g.lineTo(x, cy + half - 1 - (col ? half * 2 : L2)); g.fill(); }          // 石笋：从洞底往上（河槽那边不长）；和石钟乳连起来就是石柱
          }
          g.font = '600 24px "PingFang SC", sans-serif'; g.textAlign = 'left'; g.lineWidth = 5; g.strokeStyle = 'rgba(30,30,30,0.55)';
          const say = (txt, x, y, cl) => { g.strokeText(txt, x, y); g.fillStyle = cl; g.fillText(txt, x, y); };
          say('水往下渗：溶蚀、带走', 10, Y(0.042), '#d9ecff');          // 一样是水，在这里是溶蚀
          if (c.drip > 0.05) say('滴水：CO₂ 逸出，碳酸钙沉淀', Math.max(6, cx - rx * 0.9), cy - ry - 10, '#fff2c8');          // 在洞里又是沉淀
          if (t > 0.18 && t < 0.62) { g.strokeStyle = '#4f87b8'; g.lineWidth = 2.5; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(X(0.012), Y(height(b, P, 0.012, BD / 2)) + 4); g.lineTo(cx - rx * 0.3, cy - ry * 0.8); g.stroke(); g.setLineDash([]); }          // 洼地底下有裂隙通到地下河（像大窝凼）
        }
      }
      for (let i = 0; i <= w; i++) { const x = -BW / 2 + (i / w) * BW, top = Y(height(b, P, x, BD / 2)); g.clearRect(i, 0, 1, top); }
      ftex.needsUpdate = true;
    }
    const aHover = airLabel(block, '', { h: 0.0075, color: '#3a3226', dim: 0 });
    const tHint = tag('<span>拖“经过的时间”</span><small>三块经历同样长的时间</small>', 'hint');
    noteBadge(tag, '教学示意：时间大大压缩了；两块石灰岩的发育快慢只是示意的比较；展示的是一种典型演变，不代表每个地方都要依次经过各阶段；地下的石钟乳、石笋和地表的阶段没有固定对应；竖直方向夸大了；花岗岩的风化、侵蚀没有模拟').loc(block, -1.5 * BW - GAP + 0.01, -0.002, BD / 2 + 0.012);
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
    const pointer = {
      down: () => false, up: () => false,
      move(rc) {
        const ht = rc.intersectObjects(units.map((u) => u.top), false)[0];
        if (!ht) { aHover.userData.want = 0; return false; }
        const u = units.find((q) => q.top === ht.object), l = u.g.worldToLocal(ht.point.clone()), t = tOf(u.b), hg = l.y, lowFlat = hg < H0 - 0.04 && t > 0.3;
        const relTop = (hg - (H0 - 0.05 * sm(0.14, 0.62, t) - 0.008 * sm(0.75, 1, t))) / Math.max(0.001, H0 - 0.03), sn = stageName(t);          // 这一点比溶低的地面高出多少：高的是峰体，低平的是洼地
        const nm = u.b.rock === 'granite' ? '花岗岩：不出现喀斯特形态（风化、侵蚀没有模拟）' : t < 0.05 ? '石灰岩的地面' : t < 0.18 ? '溶沟：顺着裂隙溶出的沟' : lowFlat && relTop < 0.08 ? (u.b.clim === 'wet' && t > 0.5 ? '洼地：底部平坦的，可以是坝子（农耕区）' : '洼地') : sn === '洼地' ? '洼地边上残留的岩体' : sn ? `${sn}${sn === '峰丛' ? '：基部相连的成片山峰' : sn === '峰林' ? '：一座座分开的峰' : ''}` : '石灰岩';
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
      debug: { time: (v) => { S.time = v; S.moved = true; layoutAll(); } },
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
