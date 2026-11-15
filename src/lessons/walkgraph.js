// 数学 八年级下册 22.2 函数的表示 · 例2（图22.2-5 李明家、食堂、图书馆在同一条直线上；图22.2-6 李明离家的距离 y 与时间 x 的图象）。课本第 103–104 页。
//
// 一件事：函数的图象不是路线图，是“变化的记录”——横着走的是时间，竖着走的是李明离家的距离。
// 学生最容易想错的地方：把图象当成李明走的路（以为斜线是上坡、平线是平路）。这里让两样东西同时摆在眼前：
//   街道竖着摆在纸的左边（和纵轴同一个方向）：家在最下面，食堂在 0.6 km，图书馆在 0.8 km。李明只在这条直路上来回走。
//   李明身上连着一把横着的丁字尺，尺上有一支笔。按住李明，时间才走：笔沿着尺匀速往右（每秒 4 分钟），李明走到哪儿，尺就跟到哪儿。
// 学生亲手做的：按住李明拖着他走，笔就在纸上画出图象；照着纸上淡淡的那条（课本的图 22.2-6）走一遍。
//   停着不动，线是平的；往回走，线往下；走得越快，线越陡。时间不会倒流、人不会分身，所以线不会往回拐，也不会竖起来。
// 数值：图象的六个点照课本图 22.2-6：(0,0)→(8,0.6)→(25,0.6)→(28,0.8)→(58,0.8)→(68,0)。
import * as THREE from 'three';
import { sheet, stroke, text, tweens, clamp, MAGENTA, SERIF } from './kit/sheet.js';
import { draggable } from './kit/interact.js';
import { person } from './kit/props.js';
import { paint, inked } from '../live/ink.js';
import { sfx } from './kit/audio.js';

const W = 0.36, D = 0.22;
const OG = [-0.058, -0.079];          // 图象的原点在纸上的位置
const XS = 0.0029, YS = 0.145;        // 1 分钟、1 千米在纸上多长
const TMAX = 72, YMAX = 0.9;
const RATE = 4;                       // 按住李明时，每秒过几分钟
const VMAX = 0.11;                    // 李明最快每分钟走多少千米（跑起来也就这么快）
const SNAP = 0.07;                    // 离一个地方这么近（千米）就算到了
const REF = [[0, 0], [8, 0.6], [25, 0.6], [28, 0.8], [58, 0.8], [68, 0]];
const PLACES = [{ name: '李明家', y: 0 }, { name: '食堂', y: 0.6 }, { name: '图书馆', y: 0.8 }];
const ROAD = -0.112;                  // 街道中线的位置
const G = (t, y) => [OG[0] + t * XS, OG[1] + y * YS];

export default {
  id: 'walkgraph',
  fig: '图22.2-6',
  title: '函数的图象',
  flow: 'explore',
  ask: '图22.2-6 画的是李明离家的距离 <i>y</i> 随时间 <i>x</i> 的变化。可是李明家、食堂、图书馆明明在同一条直线上，他走的是一条直路——图上怎么会有斜线、有平线？<br>你来当一回李明：<b>按住他，时间就开始走</b>；拖着他走，笔会把“离家的距离”一路记下来。',
  need: '在食堂或图书馆停一会儿，再走回家',
  conclusion: {
    quote: '李明离家的距离y是时间x的函数。由图象中有两段平行于x轴的线段可知，李明离家后有两段时间先后停留在食堂与图书馆里。',
    why: '图象上的每一个点，横坐标是一个时刻，纵坐标是那一刻李明离家的距离。<br>停在一个地方，距离不变，线是平的（平行于 <i>x</i> 轴）；离家越来越远，线往上；往回走，线往下；走得越快，线越陡。<br>图象不是李明走的路——他一直在那条直路上。每一个时刻他只在一个地方，所以对于 <i>x</i> 的每一个确定的值，<i>y</i> 都有唯一确定的值与其对应，这正是函数的定义；图象也因此不会往回拐，不会竖起来。',
    src: '课本第 103–104 页 · 第二十二章 22.2 函数的表示（例2）',
  },

  create({ tag }) {
    const group = new THREE.Group();
    const tw = tweens();
    // ---- 纸上印好的：方格、坐标轴、课本图上的刻度和虚线、街道 ----
    const paper = sheet({ w: W, d: D, grid: 0.005, gridColor: 'rgba(70,150,190,0.16)', holes: false, draw: (g, px) => {
      const X = (u) => (u + W / 2) * px, Y = (v) => (D / 2 - v) * px;
      // 街道：一条直路
      g.fillStyle = '#d9d4c6'; g.fillRect(X(ROAD - 0.0085), Y(G(0, YMAX)[1] + 0.012), 0.017 * px, (YMAX * YS + 0.03) * px);
      g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = px * 0.0007; g.setLineDash([px * 0.004, px * 0.003]); g.beginPath(); g.moveTo(X(ROAD), Y(G(0, YMAX)[1] + 0.009)); g.lineTo(X(ROAD), Y(G(0, 0)[1] - 0.015)); g.stroke(); g.setLineDash([]);
      // 坐标轴
      g.strokeStyle = '#23293a'; g.fillStyle = '#23293a'; g.lineWidth = px * 0.00055; g.lineCap = 'round';
      const ax = (a, b) => { g.beginPath(); g.moveTo(X(a[0]), Y(a[1])); g.lineTo(X(b[0]), Y(b[1])); g.stroke(); const d = Math.atan2(-(b[1] - a[1]), b[0] - a[0]), s = px * 0.003; g.beginPath(); g.moveTo(X(b[0]), Y(b[1])); g.lineTo(X(b[0]) - s * Math.cos(d - 0.32), Y(b[1]) - s * Math.sin(d - 0.32)); g.lineTo(X(b[0]) - s * Math.cos(d + 0.32), Y(b[1]) - s * Math.sin(d + 0.32)); g.closePath(); g.fill(); };
      ax(G(-2.5, 0), G(TMAX + 2.5, 0)); ax(G(0, -0.06), G(0, YMAX + 0.07));
      // 课本图上的那几条青色虚线
      g.strokeStyle = 'rgba(26,159,201,0.75)'; g.lineWidth = px * 0.0004; g.setLineDash([px * 0.0018, px * 0.0014]);
      for (const [t, y] of [[8, 0.6], [25, 0.6], [28, 0.8], [58, 0.8]]) { g.beginPath(); g.moveTo(X(G(t, 0)[0]), Y(G(0, 0)[1])); g.lineTo(X(G(t, 0)[0]), Y(G(0, y)[1])); g.stroke(); }
      for (const [t, y] of [[8, 0.6], [28, 0.8]]) { g.beginPath(); g.moveTo(X(G(0, 0)[0]), Y(G(0, y)[1])); g.lineTo(X(G(t, 0)[0]), Y(G(0, y)[1])); g.stroke(); }
      g.setLineDash([]);
      // 刻度上的数
      g.fillStyle = '#23293a'; g.font = `500 ${px * 0.0058}px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'top';
      for (const t of [8, 25, 28, 58, 68]) g.fillText(String(t), X(G(t, 0)[0]) + (t === 25 ? -px * 0.002 : t === 28 ? px * 0.002 : 0), Y(G(0, 0)[1]) + px * 0.002);
      g.textAlign = 'right'; g.textBaseline = 'middle';
      for (const y of [0.6, 0.8]) g.fillText(String(y), X(G(0, 0)[0]) - px * 0.0022, Y(G(0, y)[1]));
      g.font = `italic 500 ${px * 0.0062}px ${SERIF}`;
      g.fillText('O', X(G(0, 0)[0]) - px * 0.0022, Y(G(0, 0)[1]) + px * 0.0048);
      g.textAlign = 'left'; g.fillText('x', X(G(TMAX + 3.3, 0)[0]), Y(G(0, 0)[1]) + px * 0.005); g.fillText('y', X(G(0, 0)[0]) - px * 0.011, Y(G(0, YMAX + 0.06)[1]));
      g.font = `500 ${px * 0.0056}px ${SERIF}`; g.fillText('/min', X(G(TMAX + 3.3, 0)[0]) + px * 0.0034, Y(G(0, 0)[1]) + px * 0.005); g.fillText('/km', X(G(0, 0)[0]) - px * 0.0078, Y(G(0, YMAX + 0.06)[1]));
    } });
    group.add(paper.group);
    const root = paper.group;
    const S = { t: 0, y: 0, target: 0, hold: false, face: 1, flat: 0, flatFrom: 0, seenFlat: false, seenBack: false, maxY: 0, done: false, runs: 0, pts: [[0, 0]], wasAway: false, home: true };
    let ui = null, dead = false;

    // ---- 课本的图（淡淡的，照着走）和学生走出来的图 ----
    const ref = stroke({ width: 0.0024, color: '#f3a9d0', opacity: 0.55, y: 0.0002, order: 3 }).set(REF.map(([t, y]) => G(t, y)));
    const trace = stroke({ width: 0.0011, color: MAGENTA, y: 0.0005, order: 6 });
    root.add(ref, trace);
    text(root, '课本的图 22.2-6', { h: 0.0056, color: '#c77aa6', hand: true }).at(...G(43, 0.845));
    const flatLab = text(root, '停着不动：线是平的', { hand: true, h: 0.0062, color: '#4a5165', y: 0.0007 }).fade(0);
    const backLab = text(root, '往回走：线往下', { hand: true, h: 0.0062, color: '#4a5165', y: 0.0007 }).fade(0);
    const note = text(root, '', { hand: true, h: 0.0072, color: '#4a5165' });
    const head = text(root, '李明走的是直路，图象为什么有斜有平？', { h: 0.0082, color: '#2a3550', weight: 600 }); head.at(-W / 2 + 0.016 + head.scale.x / 2, D / 2 - 0.0135);

    // ---- 街边的三处：纸做的小房子 ----
    const house = (kind) => {
      const g = new THREE.Group();
      const box = (w, h, d, c, y = h / 2) => { const m = inked(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint(c)), { width: 1.1, opacity: 0.8 }); m.position.y = y; g.add(m); return m; };
      if (kind === 0) { box(0.02, 0.013, 0.017, 0xf6ead2); const roof = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0001, 0.0125, 0.008, 4).rotateY(Math.PI / 4).scale(1.18, 1, 1), paint(0xd9654f)), { width: 1.1, opacity: 0.8 }); roof.position.y = 0.017; g.add(roof); box(0.004, 0.007, 0.0006, 0x8a6a4a, 0.0035).position.z = 0.0088; }
      if (kind === 1) { box(0.027, 0.011, 0.018, 0xfbe7b8); box(0.029, 0.0018, 0.02, 0xe9973a, 0.0119); box(0.014, 0.0012, 0.006, 0xe9973a, 0.0075).position.z = 0.0115; }
      if (kind === 2) { box(0.024, 0.017, 0.018, 0xdfe8ee); box(0.027, 0.002, 0.021, 0x6f8fae, 0.018); for (const x of [-0.008, 0, 0.008]) box(0.0022, 0.014, 0.0022, 0xffffff, 0.007).position.set(x, 0.007, 0.0105); }
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      return g;
    };
    PLACES.forEach((pl, i) => {
      const h = house(i); h.scale.setScalar(0.66); h.position.set(ROAD - 0.0215, 0, -G(0, pl.y)[1]); h.rotation.y = 0.32; root.add(h); pl.obj = h;
      pl.lab = text(root, pl.name, { h: 0.0064, color: '#3d4456' }); pl.lab.at(ROAD + 0.0108 + pl.lab.scale.x / 2, G(0, pl.y)[1] + (i === 0 ? -0.0058 : 0.0002));
    });

    // ---- 李明、丁字尺、笔 ----
    const ming = new THREE.Group(); root.add(ming);
    const body = person({ shirt: 0x3f8fd0 }); body.scale.setScalar(0.21); body.traverse((o) => { if (o.isMesh) o.castShadow = true; }); ming.add(body);
    const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.034, 16), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 0.017; pick.userData.pick = true; ming.add(pick);
    const BAR0 = ROAD + 0.006, BAR1 = G(TMAX + 4, 0)[0];
    const bar = new THREE.Mesh(new THREE.BoxGeometry(BAR1 - BAR0, 0.001, 0.0048), new THREE.MeshStandardMaterial({ color: 0x8fc8e2, transparent: true, opacity: 0.45, roughness: 0.25, depthWrite: false })); bar.renderOrder = 7; root.add(bar);
    const barLine = stroke({ width: 0.0004, color: '#1d5d7a', y: 0.0024, order: 8 }); root.add(barLine);
    const headT = inked(new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.0022, 0.016), paint(0x6fb0cf)), { width: 1.0, opacity: 0.7 }); root.add(headT);          // 丁字尺的头，贴着街边
    const pen = new THREE.Group(); root.add(pen);
    { const tilt = new THREE.Group(); tilt.rotation.set(0.42, 0, -0.3); pen.add(tilt);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0018, 0.005, 6), paint(0xe8c9a0)); tip.rotation.x = Math.PI; tip.position.y = 0.0025;
      const lead = new THREE.Mesh(new THREE.ConeGeometry(0.0006, 0.0017, 6), new THREE.MeshBasicMaterial({ color: 0xe4007f })); lead.rotation.x = Math.PI; lead.position.y = 0.00085;
      const shaft = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 0.03, 6), paint(0xf2c230)), { width: 0.9, opacity: 0.6 }); shaft.position.y = 0.02;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.00185, 0.00185, 0.004, 6), paint(0xe4007f)); cap.position.y = 0.037;
      tilt.add(tip, lead, shaft, cap); tilt.traverse((o) => { if (o.isMesh) o.castShadow = true; }); }
    const read = tag('', 'pill');
    // ---- 橡皮：点一下，擦掉重走 ----
    const eraser = new THREE.Group(); eraser.position.set(0.158, 0, -0.092); eraser.rotation.y = 0.35; root.add(eraser);
    { const a = inked(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.0065, 0.011), paint(0xffffff)), { width: 1.1, opacity: 0.8 }); a.position.y = 0.00325; const b = inked(new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.0069, 0.0114), paint(0x4f8fd6)), { width: 1.0, opacity: 0.7 }); b.position.set(0.0015, 0.00345, 0); eraser.add(a, b); eraser.traverse((o) => { if (o.isMesh) o.castShadow = true; }); }
    text(root, '擦掉重走', { hand: true, h: 0.0058, color: '#7a7f8c' }).at(0.158, 0.08);

    // ---- 摆放 ----
    const where = () => { const pl = PLACES.find((p) => Math.abs(S.y - p.y) < 1e-6); return pl ? pl.name : null; };
    const layout = () => {
      const [u, v] = G(S.t, S.y);
      ming.position.set(ROAD, 0, -v); body.rotation.y = S.face > 0 ? Math.PI / 2 : -Math.PI / 2;
      bar.position.set((BAR0 + BAR1) / 2, 0.0019, -v); barLine.set([[BAR0, v], [BAR1, v]]); headT.position.set(BAR0 + 0.001, 0.0011, -v);
      pen.position.set(u, 0.0006, -v);
      trace.set(S.pts.length > 1 ? S.pts.map(([t, y]) => G(t, y)) : null);
      const w = where();
      read.loc(root, u, 0.03, -v - 0.012).text(`第 <b>${S.t.toFixed(0)}</b> 分钟　离家 <b>${S.y.toFixed(2)}</b> km${w && S.t > 0 ? `　${w === '李明家' ? '到家了' : '在' + w}` : ''}`).show(S.t > 0 || S.hold);
      for (const pl of PLACES) pl.lab.ink(pl.name === w && S.t > 0 ? '#e4007f' : '#3d4456');
    };
    const record = () => {
      const P = S.pts, n = P.length, p = [S.t, S.y];
      if (n >= 2) { const a = P[n - 2], b = P[n - 1]; const s1 = (b[1] - a[1]) / Math.max(1e-6, b[0] - a[0]), s2 = (p[1] - b[1]) / Math.max(1e-6, p[0] - b[0]); if (Math.abs(s1 - s2) < 1e-4) { P[n - 1] = p; return; } }          // 还在同一条直线上：只把末端往前挪
      P.push(p);
    };
    const say = (s, html) => { note.say(s).at(G(40, 0)[0], 0.076); ui?.status(html); };
    const hint = () => {
      if (S.t === 0) return say('按住李明不放，时间就开始走；拖着他去食堂。\n照着纸上淡淡的那条线，把它“走”出来', '<b>按住李明不放</b>，时间就开始走（笔往右移）；拖着他沿着街走，笔会把“离家的距离”记下来。<br>纸上淡淡的那条线是课本的图22.2-6：试着把它“走”出来——先去食堂。');
      if (S.done) return say('他走的一直是那条直路；图上记的是每个时刻离家多远。\n每个时刻只在一个地方：线不会往回拐，也不会竖起来', '李明走的一直是那条直路。图象记的是：每一个时刻，他离家多远。<br>停着，线是平的；往回走，线往下；走得快，线就陡。每个时刻他只在一个地方，所以线不会往回拐，也不会竖起来。<br>点一下右上角的<b>橡皮</b>可以擦掉重走。');
      if (S.t >= TMAX) return say('纸走到头了。点一下橡皮，擦掉重走', '纸走到头了。点一下右上角的<b>橡皮</b>，擦掉重走。');
      if (!S.hold) return say('松手，时间就停了。按住李明接着走', '松手，时间就停了。<b>按住李明</b>接着走。');
      return null;
    };
    const reset = () => { Object.assign(S, { t: 0, y: 0, target: 0, hold: false, face: 1, flat: 0, pts: [[0, 0]], maxY: 0, wasAway: false, home: true }); flatLab.fade(0); backLab.fade(0); S.seenFlatNow = S.seenBackNow = false; S.runs++; layout(); hint(); sfx.whoosh({ dur: 0.25, freq: 1800, gain: 0.05 }); };

    // ---- 拖动 ----
    const drag = {
      obj: pick, plane: 'xz', offset: 0,
      enabled: () => S.t < TMAX,
      hint: () => '按住不放，时间就走；拖着他走',
      onStart: () => { S.hold = true; S.target = S.y; hint(); },
      onDrag: (p) => { S.target = clamp((-p.z - OG[1]) / YS, 0, YMAX); },
      onEnd: () => { S.hold = false; layout(); hint(); },
    };
    const pointer = draggable(group, [drag], { taps: [{ obj: eraser, hint: '擦掉重走', onTap: reset }], onClick: (ray) => ray.intersectObject(paper.mesh, false).length > 0 });          // 在纸上没按中东西时不转镜头
    layout(); hint();

    return {
      group,
      card: false,
      panel: 'folded',          // 面板先收成书脊：整张纸是主角，提示写在纸上
      place: 'spread',
      scale: 0.8,
      size: { w: W, d: D, h: 0.03 },
      view: { elev: 64, azim: 0, lookY: 0, frameMargin: 1.09 },
      pointer,
      mount(u) { ui = u; hint(); },
      dispose() { dead = true; },
      update(dt) {
        tw.update(dt);
        if (S.hold && S.t < TMAX) {
          const dm = Math.min(dt, 0.05) * RATE * (window.__lbTimeScale || 1);          // 这一帧过了几分钟
          let target = S.target;
          // 快到门口就算到了（停下来的线是真的平）：还没到时离得稍远就吸过去，过了门口一点点就放开——路过食堂不会平白停住
          for (const pl of PLACES) {
            const dir = Math.sign(pl.y - S.y), along = (target - pl.y) * (dir || 1);          // along：手相对门口的位置，负 = 还没到，正 = 过了
            if (dir === 0 ? Math.abs(along) < 0.04 : along > -SNAP && along < 0.025) { target = pl.y; break; }
          }
          const y0 = S.y, step = VMAX * dm;
          S.y = Math.abs(target - S.y) <= step ? target : S.y + Math.sign(target - S.y) * step;
          S.t = Math.min(TMAX, S.t + dm);
          if (S.y !== y0) S.face = Math.sign(S.y - y0);
          record();
          S.maxY = Math.max(S.maxY, S.y);
          // 停着：线是平的（第一次停够 4 分钟，在那一段上写一句）
          if (S.y === y0 && S.y > 0) { if (!S.flat) S.flatFrom = S.t - dm; S.flat += dm; if (S.flat > 4 && !S.seenFlatNow) { S.seenFlatNow = S.seenFlat = true; flatLab.at(G(S.flatFrom, 0)[0] + flatLab.scale.x / 2 + 0.004, G(0, S.y)[1] - 0.0068).fade(1); sfx.ding(880, { gain: 0.04 }); } } else S.flat = 0;
          // 往回走：线往下
          if (S.y < y0 - 1e-9 && !S.seenBackNow && S.maxY - S.y > 0.12) { S.seenBackNow = S.seenBack = true; backLab.at(G(S.t, 0)[0] + backLab.scale.x / 2 + 0.006, G(0, S.y)[1] + 0.004).fade(1); sfx.ding(740, { gain: 0.04 }); }
          if (S.maxY > 0.3) S.wasAway = true;
          if (S.wasAway && S.y === 0 && S.seenFlat && !S.done) { S.done = true; ui?.unlock(); sfx.ding(660, { gain: 0.05 }); hint(); setTimeout(() => { if (!dead) { ui?.go?.(1); ui?.fold?.(false); } }, 1800); }
          if (S.t >= TMAX) { S.hold = false; hint(); }
          layout();
        } else if (S.t === 0 && !S.hold) {
          // 提示：李明自己往前探一小步（每 2.6 秒一次）
          S.clock = (S.clock || 0) + dt; const ph = (S.clock % 2.6) / 0.9; ming.position.z = -G(0, 0)[1] - (ph < 1 ? 0.004 * Math.sin(Math.PI * ph) ** 2 : 0);
        }
      },
      test: { S, G, ROAD, reset, hold: (on) => { S.hold = on; }, go: (y) => { S.target = y; } },
    };
  },
};
