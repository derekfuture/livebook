// 高中地理 选择性必修1 第二章第二节 构造地貌的形成 · 断层（课本第 27–28 页，图 2.17 断层两侧岩石运动示意）。
//
// 一个问题：华山为什么那么陡、拔地而起？它旁边的渭河平原为什么又平又低？
// 课本的图就是模型：图 2.17 那样一块块分层的岩块。学生亲手做的：
//   1. 垂直位移：按住两头的红板往外拉（张力）。先只是绷紧、出现细小的裂纹；超出岩层能承受的程度，一下子断开（地块一震），
//      西边的岩块抬升（断块山，如华山），中间的岩块下降（谷地，如渭河平原）。断层两侧同一层岩层错开了，可以对着看。
//   2. 水平位移：换一种，按住近处这半块往旁边推；断开以后，横穿断层的公路和小河被错开（像圣安德列斯断层）。
//   3. 拖时间（风化、侵蚀）：抬升的岩块被风化侵蚀成陡峭的山；断层沿线岩石破碎，发育成沟谷、河流；下降的岩块里堆起泥沙，成了平原。
// 教学示意：竖直方向夸大了，时间大大加快；位移、岩层厚度都是示意。
import * as THREE from 'three';
import { seg, slider, buttons, note } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { h } from '../ui/Panel.js';

const XL = -0.17, XR = 0.17, ZD = 0.07, F1 = -0.05, F2 = 0.05;          // 两条断层（垂直位移那一种）
const LAYERS = [[0x8a9096, 0.022], [0xa05a46, 0.016], [0xd8a75c, 0.014], [0x7fae55, 0.004]];          // 从下往上：灰岩、红层、黄砂岩、地面（草）
const BREAK = 0.35;          // 拉（推）到这个程度，岩层断开
const ASK = {
  v: ['先猜一下（可以不猜）：在这个情境里，一直往外拉，岩层会——', ['越拉越长，不会断', '断开，有的岩块抬升、有的下降', '整块一起往下沉']],
  hz: ['先猜一下（可以不猜）：在这个情境里，断开以后，横穿断层的公路会——', ['被错开', '还是一条直线', '被抬高']],
};
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export default {
  id: 'fault',
  fig: '图2.17',
  title: '断层',
  flow: 'explore',
  ask: '华山为什么那么陡，像是从平地上一下子拔起来的？它北边的渭河平原为什么又平又低？',
  need: '把岩层拉断，看哪块抬升、哪块下降；再让风化侵蚀很久，看抬升的、下降的岩块和断层沿线各成了什么地形；也试试水平错开',
  conclusion: {
    page: 32,
    quote: '当岩层受到的压力、张力等超出所能承受的程度，岩层就会断裂并沿断裂面发生明显的位移，称为断层。断层的位移方向有水平和垂直两种（图2.17），并由此形成不同方向上的地貌错断现象。……如果断层的位移以垂直方向为主，上升的岩块经风化侵蚀常成为断块山或高地，如我国的华山、庐山、泰山；相对下降的岩块，则常形成谷地或低地，如我国的渭河平原、汾河谷地。在山地，断层沿线岩石破碎，易受风化侵蚀，常常发育成沟谷、河流。',
    why: '岩层能承受的力有限度：力不大时只是绷紧、出现细小裂纹；一超过限度就突然断开，两边沿着断裂面错开。判断是不是断层，看两侧同一层岩层有没有错开。垂直错开时，抬升的那块被风化侵蚀成陡峭的断块山，下降的那块成了谷地、低地，慢慢被泥沙填平；断层沿线的岩石被错碎了，最容易被冲刷，就成了沟谷和河流。',
    src: '课本第 27–28 页 · 第二章 第二节 构造地貌的形成',
  },

  create({ tag }) {
    const group = new THREE.Group();
    const S = { mode: 'v', s: 0, broken: false, shake: 0, e: 0, play: false, drag: null, said: {}, guess: {} };
    let W = null;
    const block = new THREE.Group(); group.add(block);
    const H0 = LAYERS.reduce((a, l) => a + l[1], 0);

    // ---- 岩块：每块是一叠四层的盒子（和课本图 2.17 一样的配色） ----
    const grain = canvasTex(256, 256, (g, w) => { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, w); for (let i = 0; i < 2400; i++) { const v = 150 + Math.random() * 90; g.fillStyle = `rgba(${v},${v},${v},${0.2 + Math.random() * 0.3})`; g.fillRect(Math.random() * w, Math.random() * w, 1.6, 1.6); } }); grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(4, 2);
    const mats = LAYERS.map(([c]) => new THREE.MeshLambertMaterial({ color: c, map: grain }));
    const edgeM = new THREE.LineBasicMaterial({ color: 0x3a2a1a, transparent: true, opacity: 0.45 });
    const makeBlock = (x0, x1, z0, z1) => {
      const g = new THREE.Group(); let y = 0;
      for (let i = 0; i < LAYERS.length; i++) { const t = LAYERS[i][1], m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, t, z1 - z0), mats[i]); m.position.set((x0 + x1) / 2, y + t / 2, (z0 + z1) / 2); const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), edgeM); e.raycast = () => {}; m.add(e); g.add(m); y += t; }
      g.userData = { x0, x1, z0, z1 }; block.add(g); return g;
    };
    const vBlocks = [makeBlock(XL, F1, -ZD, ZD), makeBlock(F1, F2, -ZD, ZD), makeBlock(F2, XR, -ZD, ZD)];
    const hBlocks = [makeBlock(XL, XR, -ZD, 0), makeBlock(XL, XR, 0, ZD)];

    // 公路和小河（水平位移那种）：横穿断层；断开以后近处那一半跟着岩块挪
    const roadM = new THREE.MeshBasicMaterial({ color: 0x6b6e75 }), riverM = new THREE.MeshBasicMaterial({ color: 0x5f9fcc });
    const strip = (mat, x, w, parent, z0, z1) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, z1 - z0), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, H0 + 0.0006, (z0 + z1) / 2); m.raycast = () => {}; parent.add(m); return m; };
    for (const [i, z0, z1] of [[0, -ZD, 0], [1, 0, ZD]]) { strip(roadM, -0.06, 0.008, hBlocks[i], z0, z1); strip(riverM, 0.07, 0.01, hBlocks[i], z0, z1); }

    // ---- 风化侵蚀以后的地形：抬升的岩块上一道道陡的山脊；断层沿线的沟谷和河；下降的岩块上一片平原 ----
    const ridgeMat = new THREE.MeshLambertMaterial({ color: 0x8c9a6a, map: grain });
    const ridgeGeo = new THREE.BufferGeometry(), ridge = new THREE.Mesh(ridgeGeo, ridgeMat); ridge.raycast = () => {}; vBlocks[0].add(ridge);
    const buildRidge = (amt) => {          // 西边那块顶上：锯齿一样的山脊，越侵蚀越尖、越陡
      const NXr = 26, NZr = 10, P = [], I = [], x0 = XL + 0.004, x1 = F1 - 0.006;
      for (let j = 0; j <= NZr; j++) for (let i = 0; i <= NXr; i++) { const u = i / NXr, v = j / NZr, x = x0 + (x1 - x0) * u, z = -ZD + 0.004 + (2 * ZD - 0.008) * v, hgt = amt * 0.024 * Math.pow(Math.max(0, Math.sin(u * Math.PI * 3.2 + v * 1.3) * 0.5 + 0.5), 1.6) * Math.sin(u * Math.PI) * (0.7 + 0.3 * Math.sin(v * 7)); P.push(x, H0 + hgt, z); }
      for (let j = 0; j < NZr; j++) for (let i = 0; i < NXr; i++) { const a = j * (NXr + 1) + i, b = a + NXr + 1; I.push(a, b, a + 1, a + 1, b, b + 1); }
      ridgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); ridgeGeo.setIndex(I); ridgeGeo.computeVertexNormals(); ridge.visible = amt > 0.02;
    };
    const gully = [F1, F2].map((x) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.012, ZD * 2), new THREE.MeshBasicMaterial({ color: 0x5f9fcc, transparent: true, opacity: 0 })); m.rotation.x = -Math.PI / 2; m.raycast = () => {}; m.position.x = x; block.add(m); return m; });
    const plain = new THREE.Mesh(new THREE.PlaneGeometry(F2 - F1 - 0.004, ZD * 2 - 0.004), new THREE.MeshLambertMaterial({ color: 0xc6c98a, map: grain, transparent: true, opacity: 0 })); plain.rotation.x = -Math.PI / 2; plain.raycast = () => {}; vBlocks[1].add(plain); plain.position.set(0, H0 + 0.0008, 0);
    // 裂纹：还没断的时候，断层将要出现的地方先出现细细的裂纹
    const crackTex = canvasTex(64, 256, (g, w, hh) => { g.strokeStyle = 'rgba(30,20,10,0.9)'; g.lineWidth = 2; for (let k = 0; k < 3; k++) { g.beginPath(); let x = w / 2 + (k - 1) * 8; g.moveTo(x, 0); for (let y = 0; y < hh; y += 12) { x += (Math.random() - 0.5) * 8; g.lineTo(x, y); } g.stroke(); } });
    const cracks = [F1, F2, 'h'].map((f) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.01, H0), new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, opacity: 0, depthWrite: false })); m.raycast = () => {}; if (f === 'h') { m.rotation.y = Math.PI / 2; m.position.set(XR + 0.0005, H0 / 2, 0); } else m.position.set(f, H0 / 2, ZD + 0.0005); block.add(m); return m; });

    // ---- 红板：两头各一块（垂直那种往外拉）；近处那半块上一个把手（水平那种往旁边推） ----
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xb84a32, roughness: 0.5, emissive: 0x5a1a10, emissiveIntensity: 0.3 });
    const plates = [-1, 1].map((sd) => {
      const g = new THREE.Group(), p = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.05, ZD * 2 + 0.01), plateMat); p.position.y = 0.03; g.add(p);
      const ar = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.018, 16), plateMat); ar.rotation.z = sd > 0 ? -Math.PI / 2 : Math.PI / 2; ar.position.set(sd * 0.022, 0.03, 0); g.add(ar);          // 箭头朝外：张力的方向
      const pick = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, ZD * 2 + 0.02), new THREE.MeshBasicMaterial({ visible: false })); pick.position.set(sd * 0.018, 0.03, 0); pick.userData.pick = true; g.add(pick);
      g.userData = { sd, pick }; block.add(g); return g;
    });
    const handle = new THREE.Group(); hBlocks[1].add(handle);
    { const p = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.012), plateMat); p.position.set(0.12, H0 + 0.008, ZD - 0.016); handle.add(p); for (const sd of [-1, 1]) { const ar = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.012, 14), plateMat); ar.rotation.z = sd > 0 ? -Math.PI / 2 : Math.PI / 2; ar.position.set(0.12 + sd * 0.022, H0 + 0.008, ZD - 0.016); handle.add(ar); } }
    const handlePick = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.03), new THREE.MeshBasicMaterial({ visible: false })); handlePick.position.set(0.12, H0 + 0.008, ZD - 0.016); handlePick.userData.pick = true; handle.add(handlePick);

    // ---- 影子、取景框、标签 ----
    const shadowTex = canvasTex(256, 128, (g, w, hh) => { const gr = g.createRadialGradient(w / 2, hh / 2, 0, w / 2, hh / 2, w / 2); gr.addColorStop(0, 'rgba(60,45,30,0.4)'); gr.addColorStop(0.7, 'rgba(60,45,30,0.12)'); gr.addColorStop(1, 'rgba(60,45,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, hh); });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry((XR - XL) * 1.15, ZD * 2.6), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.0006; shadow.raycast = () => {}; shadow.userData.noFrame = true; group.add(shadow);
    const frameBox = new THREE.Mesh(new THREE.BoxGeometry(XR - XL + 0.06, 0.1, ZD * 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); frameBox.position.y = 0.05; frameBox.raycast = () => {}; group.add(frameBox);
    const tHint = tag('', 'pill'), tScale = tag('教学示意 · 竖直方向夸大了 · 时间大大加快', 'pill');
    const tW = tag('', 'pill'), tM = tag('', 'pill'), tFault = [tag('断层', 'pill'), tag('断层', 'pill')], tRoad = tag('公路被错开了', 'pill');
    const callout = tag('', 'pill callout'); callout.show(false); let calloutT = 0;
    const say1 = (text, x, y, z) => { callout.loc(block, x, y, z).text(text).show(true); calloutT = 4.5; };

    const D = () => (S.broken ? sm(BREAK, 1, S.s) : 0);          // 断开以后的位移（0–1）
    const layout = () => {
      const v = S.mode === 'v', d = D();
      vBlocks.forEach((b) => (b.visible = v)); hBlocks.forEach((b) => (b.visible = !v));
      plates.forEach((g) => { const { sd } = g.userData; g.visible = v; g.position.x = sd * ((XR - XL) / 2 + 0.012 + 0.012 * S.s); });
      handle.visible = !v;
      const jitter = S.shake > 0 ? Math.sin(S.shake * 90) * 0.0015 * S.shake : 0;
      if (v) {
        const up = 0.022 * d, dn = 0.016 * d;
        vBlocks[0].position.set(-0.004 * S.s + jitter, up, 0); vBlocks[1].position.set(jitter, -dn, 0); vBlocks[2].position.set(0.004 * S.s + jitter, 0, 0);
        vBlocks[1].scale.y = 1; vBlocks[1].position.y = -dn;
        buildRidge(S.e * d); plain.material.opacity = sm(0.3, 0.8, S.e) * d;
        gully.forEach((m, i) => { m.material.opacity = sm(0.4, 0.9, S.e) * d * 0.9; m.position.y = (i === 0 ? H0 - dn : H0 - dn) + 0.0012; });
      } else {
        const off = 0.05 * d; hBlocks[0].position.set(jitter, 0, 0); hBlocks[1].position.set(off + jitter, 0, 0);
        buildRidge(0); gully.forEach((m) => (m.material.opacity = 0));
      }
      const pre = S.broken ? 0 : sm(0.1, BREAK, S.s);          // 断开之前：裂纹越来越多
      cracks[0].material.opacity = cracks[1].material.opacity = v ? pre * 0.9 : 0; cracks[2].material.opacity = v ? 0 : pre * 0.9;
      placeTags();
      drawChart();
    };
    const placeTags = () => {
      const v = S.mode === 'v', d = D();
      tScale.loc(block, XL + 0.06, -0.004, ZD + 0.01);
      tHint.loc(block, v ? XR + 0.04 : 0.12, v ? 0.07 : H0 + 0.03, v ? 0 : ZD - 0.016).text(v ? '按住两头的红板往外拉：张力' : '按住这个把手往旁边推').show(S.s < 0.08);
      tW.loc(block, (XL + F1) / 2, H0 + 0.022 * d + 0.012 + 0.024 * S.e, 0).text(S.e > 0.5 ? '断块山（如华山）' : '抬升的岩块').show(v && d > 0.3);
      tM.loc(block, 0, H0 - 0.016 * d + 0.01, 0).text(S.e > 0.5 ? '谷地、平原（如渭河平原）' : '下降的岩块').show(v && d > 0.3);
      tFault.forEach((t, i) => t.loc(block, i ? F2 : F1, H0 * 0.5, ZD + 0.004).show(v && S.broken));
      tRoad.loc(block, -0.06, H0 + 0.012, 0).show(!v && d > 0.3);
    };

    // ---- 侧栏：一张图——断层两侧同一层（黄砂岩）的高度，或者水平错开了多少 ----
    const drawChart = () => {
      if (!W) return;
      const c = W.chart, g = c.getContext('2d'), w = c.width, hh = c.height, v = S.mode === 'v', d = D();
      g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, hh); g.font = '600 11px "PingFang SC", sans-serif'; g.fillStyle = '#5f4f3c'; g.textAlign = 'left';
      if (v) {
        g.fillText('剖面：同一层（黄砂岩）在断层两侧的高低', 8, 14);
        const PX = (x) => 12 + ((x - XL) / (XR - XL)) * (w - 24), PY = (y) => hh - 18 - (y / 0.09) * (hh - 40);
        const tops = [0.022 * d, -0.016 * d, 0];
        [[XL, F1], [F1, F2], [F2, XR]].forEach(([a, b], i) => { let y = 0; for (let k = 0; k < LAYERS.length; k++) { const t = LAYERS[k][1]; g.fillStyle = '#' + LAYERS[k][0].toString(16).padStart(6, '0'); g.fillRect(PX(a) + 1, PY(y + t + tops[i] + 0.016), PX(b) - PX(a) - 2, PY(y + tops[i] + 0.016) - PY(y + t + tops[i] + 0.016)); y += t; } });
        if (S.broken) { g.strokeStyle = '#2a3140'; g.setLineDash([4, 3]); for (const x of [F1, F2]) { g.beginPath(); g.moveTo(PX(x), 20); g.lineTo(PX(x), hh - 16); g.stroke(); } g.setLineDash([]); }
        W.read.innerHTML = S.broken ? `已经断开：西边抬升约 <b>${Math.round(22 * d * 40)} 米</b>，中间下降约 <b>${Math.round(16 * d * 40)} 米</b>（示意）<br><small>同一层岩层在断层两侧错开了：这就是断层</small>` : `${S.s < 0.05 ? '还没用力' : `岩层被拉紧了（${Math.round((S.s / BREAK) * 100)}%）`}<br><small>力超过岩层能承受的程度，才会断开</small>`;
      } else {
        g.fillText('从上往下看：公路在断层两侧错开了多少', 8, 14);
        const off = 0.05 * d, PX = (x) => 12 + ((x - XL) / (XR - XL)) * (w - 24), mid = hh / 2;
        g.fillStyle = '#d9cfb8'; g.fillRect(12, 24, w - 24, hh - 40); g.strokeStyle = '#2a3140'; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(12, mid); g.lineTo(w - 12, mid); g.stroke(); g.setLineDash([]);
        g.fillStyle = '#6b6e75'; g.fillRect(PX(-0.064), 24, PX(-0.056) - PX(-0.064), mid - 24); g.fillRect(PX(-0.064 + off), mid, PX(-0.056) - PX(-0.064), hh - 16 - mid);
        g.fillStyle = '#5f9fcc'; g.fillRect(PX(0.065), 24, PX(0.075) - PX(0.065), mid - 24); g.fillRect(PX(0.065 + off), mid, PX(0.075) - PX(0.065), hh - 16 - mid);
        W.read.innerHTML = S.broken ? `已经断开：两侧水平错开约 <b>${Math.round(50 * d * 40)} 米</b>（示意）<br><small>断层两侧的岩块沿断层水平移动</small>` : `${S.s < 0.05 ? '还没用力' : `岩层被推紧了（${Math.round((S.s / BREAK) * 100)}%）`}<br><small>力超过岩层能承受的程度，才会断开</small>`;
      }
    };
    const drawLog = () => {
      if (!W) return;
      const rows = [], r = (b, t) => rows.push(h('div', { class: 'tl-row' }, h('b', {}, b), h('span', {}, t)));
      if (S.said.strain) r('用力：', '先只是绷紧，出现细小的裂纹，岩层还连着');
      if (S.said.vbreak) r('垂直位移：', '超过限度一下子断开：西边岩块抬升，中间岩块下降，同一层岩层在断层两侧错开');
      if (S.said.erode) r('风化侵蚀很久：', '抬升的岩块成了陡峭的断块山；下降的岩块积了泥沙，成了平原；断层沿线岩石破碎，成了沟谷、河流');
      if (S.said.hbreak) r('水平位移：', '岩块沿断层水平错开，横穿断层的公路、小河也被错开');
      const gv = S.guess.v, gh = S.guess.hz;
      if (gv != null && S.said.vbreak) rows.push(h('div', { class: 'tl-row' }, h('small', {}, `你猜：${ASK.v[1][gv]}　实际：断开，有的岩块抬升、有的下降`)));
      if (gh != null && S.said.hbreak) rows.push(h('div', { class: 'tl-row' }, h('small', {}, `你猜：${ASK.hz[1][gh]}　实际：被错开`)));
      W.log.replaceChildren(...rows);
      if (S.said.vbreak && S.said.erode && S.said.hbreak) W.ui.unlock();
    };
    const events = () => {
      const v = S.mode === 'v';
      if (S.s > 0.15 && !S.said.strain) { S.said.strain = true; W?.ui.status('岩层被拉紧了，看侧面：出现了细小的<b>裂纹</b>，但岩层还连着。再用力。'); drawLog(); }
      if (!S.broken && S.s >= BREAK) { S.broken = true; S.shake = 1; if (v) { S.said.vbreak = true; say1('断开了！两边的岩层错开', 0, H0 + 0.04, ZD); W?.ui.status('超过了岩层能承受的程度，<b>一下子断开</b>：西边的岩块抬升，中间的岩块下降。对着侧面看，同一层岩层在断层两侧错开了。现在拖<b>时间</b>，看风化侵蚀以后会怎样。'); } else { S.said.hbreak = true; say1('断开了！公路被错开', -0.06, H0 + 0.04, 0); W?.ui.status('断开以后，两侧的岩块沿断层<b>水平</b>错开，横穿断层的公路、小河也被错开了。'); } drawLog(); }
      if (v && S.broken && S.e > 0.7 && !S.said.erode) { S.said.erode = true; say1('断层沿线成了河谷', F2, H0, ZD); W?.ui.status('风化侵蚀了很久：抬升的岩块成了陡峭的<b>断块山</b>（像华山）；下降的岩块积了泥沙，成了<b>平原</b>（像渭河平原）；断层沿线岩石破碎，发育成了<b>沟谷、河流</b>。'); drawLog(); }
    };

    // ---- 指针 ----
    const plane = new THREE.Plane(), hit = new THREE.Vector3(), wq = new THREE.Vector3();
    let x0 = 0, s0 = 0;
    const onY = (ray, y) => { block.updateMatrixWorld(); block.localToWorld(wq.set(0, y, 0)); plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), wq); if (!ray.intersectPlane(plane, hit)) return null; return block.worldToLocal(hit.clone()); };
    const picks = () => (S.mode === 'v' ? plates.map((g) => g.userData.pick) : [handlePick]);
    const pointer = {
      down(rc) {
        const hp = rc.intersectObjects(picks(), false)[0]; if (!hp) return false;
        const g = plates.find((q) => q.userData.pick === hp.object); S.drag = g ? g.userData.sd : 'h';
        const p = onY(rc.ray, 0.03); x0 = p ? p.x : 0; s0 = S.s; document.getElementById('c').style.cursor = 'grabbing'; return true;
      },
      move(rc) {
        const c = document.getElementById('c');
        if (S.drag == null) { if (c) c.style.cursor = rc.intersectObjects(picks(), false).length ? 'grab' : ''; return false; }
        const p = onY(rc.ray, 0.03); if (!p) return true;
        const dx = p.x - x0, amt = S.drag === 'h' ? Math.abs(dx) / 0.05 : (S.drag * dx) / 0.03;          // 垂直：往外拉；水平：往旁边推
        S.s = Math.max(S.broken ? BREAK : 0, Math.min(1, s0 + amt)); events(); layout(); return true;
      },
      up() { if (S.drag == null) return false; S.drag = null; document.getElementById('c').style.cursor = ''; return true; },
    };
    const reset = (mode) => { S.mode = mode; S.s = 0; S.broken = false; S.e = 0; S.play = false; S.shake = 0; callout.show(false); if (W) { W.time.set(0); W.time.el.style.display = mode === 'v' ? '' : 'none'; W.play.textContent = '让时间走'; W.play.style.display = mode === 'v' ? '' : 'none'; const [q, o] = ASK[mode], g = seg(q, o, (_, i) => { S.guess[mode] = i; drawLog(); }, { value: S.guess[mode] ?? -1 }); W.guess.el.replaceWith(g.el); W.guess = g; } layout(); };

    layout();

    return {
      group,
      card: false,
      emerge: 'flat',          // 课本的图平放在书页上，模型从它上面长出来、它慢慢淡掉
      size: { w: 0.38, d: 0.16, h: 0.1 },
      view: { elev: 24, azim: 24, lookY: 0.4, frameMargin: 1.08 },
      pointer,
      mount(ui) {
        const modeSeg = seg('哪一种位移', ['垂直位移（拉断）', '水平位移（错开）'], (_, i) => { reset(i ? 'hz' : 'v'); ui.status(i ? '这回岩层从中间断开、两边往不同方向走。按住近处那半块上的<b>把手</b>往旁边推。' : '按住两头的<b>红板</b>往外拉，给岩层加上张力。'); }, { value: 0 });
        const time = slider('风化、侵蚀的时间（示意）', { min: 0, max: 100, value: 0, fmt: (v) => (v ? `约 ${v} 万年` : '刚开始'), onInput: (v) => { S.e = v / 100; S.play = false; W.play.textContent = '让时间走'; events(); layout(); } });
        const guess = seg(...ASK.v, (_, i) => { S.guess.v = i; drawLog(); }, { value: -1 });
        const acts = buttons([
          { text: '让时间走', onClick: () => { if (!S.broken) { ui.status('先把岩层拉断，再看风化侵蚀。'); return; } S.play = !S.play; acts.btns[0].textContent = S.play ? '停一下' : '让时间走'; } },
          { text: '重来', ghost: true, onClick: () => { S.said = {}; S.guess = {}; modeSeg.set(0); reset('v'); drawLog(); ui.status('按住两头的<b>红板</b>往外拉，给岩层加上张力。'); } },
        ]);
        const chart = h('canvas', { class: 'wx-map', width: 320, height: 130 }), read = h('div', { class: 'read-out' }), log = h('div', { class: 'timeline' });
        ui.controls.append(h('div', { class: 'bar-title' }, '断层两侧'), chart, read, modeSeg.el, time.el, acts.el, guess.el, note('拉、推都要用力超过一定程度，岩层才会断开。'));
        ui.data.append(h('div', { class: 'bar-title' }, '你看到了什么'), log);
        W = { ui, chart, read, log, time, guess, play: acts.btns[0] };
        ui.status('这是一块一层层的岩层（最上面是地面）。按住两头的<b>红板</b>往外拉，给它加上张力。');
        layout(); drawLog();
      },
      update(dt) {
        if (calloutT > 0) { calloutT -= dt; if (calloutT <= 0) callout.show(false); }
        if (S.shake > 0) { S.shake = Math.max(0, S.shake - dt * 1.6); layout(); }          // 断开那一下，整块地震一震
        if (S.play) { S.e = Math.min(1, S.e + dt / 10); W?.time.set(Math.round(S.e * 100)); if (S.e >= 1) { S.play = false; if (W) W.play.textContent = '让时间走'; } events(); layout(); }
      },
    };
  },
};
