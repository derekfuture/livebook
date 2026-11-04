// 第二章 第二节 地形图的判读 · 活动：在等高线地形图上判读地形部位（课本七年级上册第 34 页图 2.13；第 32–33 页图 2.10）。
//
// 桌上铺的就是课本图 2.13（某地等高线地形图，书页上的那张图）。点一下，它“立起来”成两座山：图上原来的每条线
// 跟着升到自己的海拔（250–550 米）。高度是从图上的等高线算出来的（src/lessons/data/fig213.js）：每两条等高线之间
// 按离两条线的远近插值，陡崖处几条线重叠、高度陡降；山顶取在最里一圈以内。
// 下一场雨：雨点落到山坡上，雨水顺着最陡的方向往下流——汇进山谷（⑤），在山脊（④、⑥）两边分开。
// 学生（课本的两题）：识别 ①—⑦ 表示的地形部位；比较 ④ 和 ⑥ 的坡度。
// 竖直方向放大了（375 米 → 7.5 厘米），为了看清起伏，在面板的说明里写明。
import * as THREE from 'three';
import { seg, buttons } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { canvasTex, textPlate } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked, hull } from '../live/ink.js';
import { h } from '../ui/Panel.js';
import { FIG213 } from './data/fig213.js';

const IMG_W = FIG213.img[0], IMG_H = FIG213.img[1];
const WM = 0.3, DM = (WM * IMG_H) / IMG_W, HM = 0.075, Z0 = 200, Z1 = 575, BASE = 0.006;      // 图宽、图深；375 米 → 7.5 厘米；底板厚
const PAGE = { url: '/books/dili-7s/hi/038.jpg', size: [521.575, 737.008], rect: [150, 246, 353, 368] };     // 课本第 34 页上图 2.13 的位置（PDF 点）
const MARK = { 1: [505, 292], 2: [378, 122], 3: [1040, 427], 4: [180, 650], 5: [683, 596], 6: [1114, 709], 7: [765, 360] };   // ①–⑦ 在原图上的位置（像素）
const CIRC = ['', '①', '②', '③', '④', '⑤', '⑥', '⑦'];
const NAMES = ['山峰', '山谷', '山脊', '鞍部', '陡崖'];
const ANSWER = { 1: '山峰', 2: '陡崖', 3: '山峰', 4: '山脊', 5: '山谷', 6: '山脊', 7: '鞍部' };
const HOW = {                                             // 课本图 2.10 的说法
  山峰: '等高线闭合，数值从四周向中间逐渐增大',
  山谷: '等高线的弯曲部分向高处凸出',
  山脊: '等高线的弯曲部分向低处凸出',
  鞍部: '两侧的山脊、山谷等高线近似对称',
  陡崖: '等高线重叠',
};

// ---------------- 高度场 ----------------
const GW = FIG213.w, GH = FIG213.h;
const ELEV = (() => { const b = Uint8Array.from(atob(FIG213.dm), (c) => c.charCodeAt(0)); const u = new Uint16Array(b.buffer); return Float32Array.from(u, (v) => v / 10); })();
const at = (i, j) => ELEV[clamp(j, 0, GH - 1) * GW + clamp(i, 0, GW - 1)];
/** 格子坐标（可以是小数）上的海拔：双线性 */
const elevAt = (gx, gy) => {
  const i = Math.floor(gx), j = Math.floor(gy), fx = gx - i, fy = gy - j;
  return at(i, j) * (1 - fx) * (1 - fy) + at(i + 1, j) * fx * (1 - fy) + at(i, j + 1) * (1 - fx) * fy + at(i + 1, j + 1) * fx * fy;
};
const toGrid = (px, py) => [px / FIG213.cell - 0.5, py / FIG213.cell - 0.5];        // 原图像素 → 格子
const gridToLocal = (gx, gy) => [(gx / (GW - 1) - 0.5) * WM, (gy / (GH - 1) - 0.5) * DM];
const yOf = (m, rise) => BASE + rise * ((m - Z0) / (Z1 - Z0)) * HM;
/** 汇流（多方向）：每一格的雨水按坡度（1.5 次方）分给周围所有更低的格子；从高往低累加，得到“上游有多少格的雨水流到这里”。
 *  山谷里的水越汇越多；山脊上的水向两边分走，一直很少。 */
const ACC = (() => {
  const n = GW * GH, acc = new Float32Array(n).fill(1), NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const order = Array.from({ length: n }, (_, k) => k).sort((a, b) => ELEV[b] - ELEV[a]);
  const ws = new Float32Array(8), ks = new Int32Array(8);
  for (const k of order) {
    const i = k % GW, j = (k - i) / GW; let m = 0, sum = 0;
    for (const [di, dj] of NB) {
      const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= GW || jj >= GH) continue;
      const d = (ELEV[k] - ELEV[jj * GW + ii]) / Math.hypot(di, dj);
      if (d > 0) { ws[m] = d ** 1.5; ks[m] = jj * GW + ii; sum += ws[m]; m++; }
    }
    for (let q = 0; q < m; q++) acc[ks[q]] += (acc[k] * ws[q]) / sum;
  }
  return acc;
})();

export default {
  id: 'contour',
  fig: '图2.13',
  title: '等高线地形图',
  stampText: '活动',
  style: 'paper',
  predict: {
    q: '图 2.13 上，⑤ 那条虚线所在的地方，是山谷还是山脊？',
    hint: '课本第 34 页活动：在等高线地形图上判读地形部位。',
    options: ['山谷', '山脊', '看不出来'],
    answer: 0,
  },
  need: '把等高线地形图立起来，下一场雨看水往哪里流；识别图中 ①—⑦ 表示的地形部位，比较 ④ 和 ⑥ 的坡度差异',
  conclusion: {
    crops: [{ page: 36, rect: [40, 576, 462, 640] }, { page: 37, rect: [64, 150, 478, 336] }],
    quote: '在等高线地形图上，可以判断坡的陡缓：等高线密集，说明坡较陡；等高线稀疏，说明坡较缓。通过等高线的特征，还可以识别山峰、山谷、山脊、鞍部和陡崖等常见的地形部位。',
    why: '图 2.13 里：①、③ 是<b>山峰</b>（等高线闭合，数值从四周向中间逐渐增大）；② 是<b>陡崖</b>（等高线重叠）；⑤ 是<b>山谷</b>（等高线的弯曲部分向高处凸出——雨水汇到这里）；④、⑥ 是<b>山脊</b>（等高线的弯曲部分向低处凸出——雨水从这里向两边分开）；⑦ 是<b>鞍部</b>（两座山峰之间，两侧等高线近似对称）。<br>⑥ 处等高线密集，坡较陡；④ 处等高线稀疏，坡较缓。',
    src: '课本七年级上册第 32–34 页 · 第二章 第二节 地形图的判读（图 2.10；活动：在等高线地形图上判读地形部位，图 2.13）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); else bar.caption(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };

    paperSheet(group, { w: 0.42, d: 0.27, x: 0.02, z: 0.0 });

    // ================= 地形：网格、贴图（课本那张图）、四周的侧面 =================
    const geo = new THREE.PlaneGeometry(WM, DM, GW - 1, GH - 1); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const tex = new THREE.TextureLoader().load(PAGE.url, () => { mapM.needsUpdate = true; }, undefined, () => useFallback());
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    { const [pw, ph] = PAGE.size, [x0, y0, x1, y1] = PAGE.rect; tex.repeat.set((x1 - x0) / pw, (y1 - y0) / ph); tex.offset.set(x0 / pw, 1 - y1 / ph); }
    const mapM = new THREE.MeshLambertMaterial({ map: tex });
    const land = new THREE.Mesh(geo, mapM); land.receiveShadow = true; group.add(land);
    // 没有课本书页的时候：按高度场自己画等高线
    function useFallback() {
      const c = canvasTex(1406, 850, (g, Wc, Hc) => {
        g.fillStyle = '#fbfaf5'; g.fillRect(0, 0, Wc, Hc); g.strokeStyle = '#23293a'; g.lineWidth = 4;
        for (let L = 250; L <= 550; L += 50) {
          for (let j = 0; j < GH - 1; j++) for (let i = 0; i < GW - 1; i++) {
            const v = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)], p = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]], cut = [];
            for (let e = 0; e < 4; e++) { const a = v[e], b = v[(e + 1) % 4]; if ((a < L) !== (b < L)) { const t = (L - a) / (b - a), A = p[e], B = p[(e + 1) % 4]; cut.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); } }
            if (cut.length >= 2) { g.beginPath(); g.moveTo((cut[0][0] + 0.5) * 6, (cut[0][1] + 0.5) * 6); g.lineTo((cut[1][0] + 0.5) * 6, (cut[1][1] + 0.5) * 6); g.stroke(); }
          }
        }
        g.font = 'bold 44px "Times New Roman", serif'; g.fillStyle = '#23293a'; g.textAlign = 'center'; g.textBaseline = 'middle';
        for (const [n, [x, y]] of Object.entries(MARK)) g.fillText(CIRC[n], x, y);
      });
      mapM.map = c; mapM.needsUpdate = true;
    }
    // 侧面：沿四条边，从地面一直到桌面
    const skirt = (() => {
      const ring = [];
      for (let i = 0; i < GW; i++) ring.push([i, 0]);
      for (let j = 1; j < GH; j++) ring.push([GW - 1, j]);
      for (let i = GW - 2; i >= 0; i--) ring.push([i, GH - 1]);
      for (let j = GH - 2; j > 0; j--) ring.push([0, j]);
      const n = ring.length, g = new THREE.BufferGeometry(), P = new Float32Array(n * 2 * 3), idx = [];
      for (let k = 0; k < n; k++) { const a = k * 2, b = ((k + 1) % n) * 2; idx.push(a, b, a + 1, b, b + 1, a + 1); }
      g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setIndex(idx);
      const m = new THREE.Mesh(g, paint(0xe6dcc3, { side: THREE.DoubleSide })); group.add(m);
      return { ring, g, P };
    })();
    const base = inked(new THREE.Mesh(new THREE.BoxGeometry(WM, BASE - 0.0008, DM), paint(0xd9cdb0)), { width: 0.8 }); base.position.y = (BASE - 0.0008) / 2; group.add(base);        // 比地面低一点：放平的时候不和贴图抢
    const mapPick = new THREE.Mesh(new THREE.BoxGeometry(WM, 0.02, DM), new THREE.MeshBasicMaterial({ visible: false })); mapPick.position.y = 0.01; mapPick.userData.pick = true; group.add(mapPick);
    let shownRise = -1;
    const shape = (rise) => {
      if (Math.abs(rise - shownRise) < 1e-4) return;
      shownRise = rise;
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) pos.setY(j * GW + i, yOf(ELEV[j * GW + i], rise));
      pos.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
      const { ring, g, P } = skirt;
      ring.forEach(([i, j], k) => { const [x, z] = gridToLocal(i, j), y = yOf(at(i, j), rise); P.set([x, y, z, x, BASE, z], k * 6); });
      g.attributes.position.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
      mapPick.scale.y = 1 + rise * 4; mapPick.position.y = 0.01 + rise * 0.03;
    };

    // 在地面上：原图像素 → 局部坐标（随立起的程度）
    const onLand = (px, py, rise, lift = 0) => { const [gx, gy] = toGrid(px, py), [x, z] = gridToLocal(gx, gy); return new THREE.Vector3(x, yOf(elevAt(gx, gy), rise) + lift, z); };

    // ================= 云、雨 =================
    const cloud = new THREE.Group(); cloud.position.set(WM / 2 + 0.035, 0.15, -DM / 2 + 0.02); group.add(cloud);
    for (const [x, y, z, r] of [[0, 0, 0, 0.018], [0.02, -0.002, 0.004, 0.014], [-0.019, -0.003, 0.002, 0.013], [0.006, 0.011, -0.002, 0.013], [-0.008, 0.008, 0.008, 0.011]]) {
      const b = hull(new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), paint(0xf4f6f8)), 0.0009); b.position.set(x, y, z); b.scale.y = 0.8; cloud.add(b);
    }
    const cloudPick = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.04), new THREE.MeshBasicMaterial({ visible: false })); cloudPick.userData.pick = true; cloud.add(cloudPick);
    const drops = new Particles({ max: 120, geometry: new THREE.CylinderGeometry(0.04, 0.04, 1, 5), material: new THREE.MeshBasicMaterial({ color: 0x8fb8e8, transparent: true, opacity: 0.75 }) });
    group.add(drops.mesh);
    const water = new Particles({ max: 900, sprite: true, color: 0x2f74c8, size: 0.0032, opacity: 0.95 }); water.mesh.renderOrder = 6; group.add(water.mesh);
    // 水流过的地方慢慢变湿（蓝色的痕迹），盖在地形上
    const WET_W = GW, WET_H = GH, wetC = document.createElement('canvas'); wetC.width = WET_W; wetC.height = WET_H;        // 一格一个像素，贴上去时线性插值
    const wg = wetC.getContext('2d'), wetTex = new THREE.CanvasTexture(wetC); wetTex.colorSpace = THREE.SRGBColorSpace; wetTex.magFilter = THREE.LinearFilter;
    const wet = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: wetTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    wet.renderOrder = 4; wet.raycast = () => {}; group.add(wet);
    const clearWet = () => { wg.clearRect(0, 0, WET_W, WET_H); wetTex.needsUpdate = true; lastTh = Infinity; };
    let lastTh = Infinity;
    const wetImg = wg.createImageData(WET_W, WET_H);
    const drawStreams = (th) => {
      const D = wetImg.data;
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
        const k = j * GW + i, edge = Math.min(1, Math.min(i, j, GW - 1 - i, GH - 1 - j) / 4);          // 图边上的水不画（边上平，水沿着边流）
        const v = th === Infinity ? 0 : clamp((Math.log10(ACC[k]) - Math.log10(th)) / 1.0, 0, 1) * edge;
        D[k * 4] = 40; D[k * 4 + 1] = 110; D[k * 4 + 2] = 205; D[k * 4 + 3] = Math.round(225 * v);
      }
      wg.putImageData(wetImg, 0, 0); wetTex.needsUpdate = true;
    };

    // ================= 状态 =================
    const fresh = () => ({ demo: false, rise: 0, riseT: 0, rain: false, rainT: 0, named: {}, slope: false, look: 0 });
    S = fresh();
    const A = {
      tapMap() {
        S.riseT = S.riseT > 0.5 ? 0 : 1; sfx.clink?.({ freq: 700, gain: 0.03 });
        status(S.riseT ? '等高线图<b>立起来</b>了：每条等高线升到它自己的海拔——两座山峰 ①、③，中间低一点的地方是 ⑦。可以转着看看。' : '放平了：又是课本上的那张等高线图。');
      },
      tapCloud() {
        S.rain = !S.rain;
        if (S.rain && S.riseT < 0.5) { S.riseT = 1; }
        status(S.rain ? '下雨了：雨水顺着山坡最陡的方向往下流。看哪里的水<b>汇在一起</b>，哪里的水<b>向两边分开</b>。' : '雨停了。');
      },
      name(n, v) {
        if (v === ANSWER[n]) { S.named[n] = true; W?.rows[n].tick(NAMES.indexOf(v)); status(`${CIRC[n]} 是<b>${v}</b>：${HOW[v]}。`); if (Object.keys(S.named).length === 7) { done('name'); W?.t1.open(); } }
        else status(`${CIRC[n]} 不是${v}。` + (ANSWER[n] === '山谷' || ANSWER[n] === '山脊' ? '下一场雨看看：这里的雨水是汇过来，还是向两边分开？' : `看看 ${CIRC[n]} 周围的等高线是什么样子，对照课本图 2.10 的五种说法。`));
      },
      reset() { const keep = S.demo; S = fresh(); S.demo = keep; water.clear(); drops.clear(); clearWet(); W?.rows && Object.values(W.rows).forEach((r) => r.set(-1)); if (W) { W.t1.close(); W.next.hidden = true; } bar.undo('rise', 'rain', 'name', 'slope'); status('放平了，记录也清空了。'); },
    };

    const drag = draggable(group, [], { taps: [
      { obj: mapPick, hint: () => (S.riseT > 0.5 ? '点一下：放平' : '点一下：把等高线图立起来'), onTap: () => A.tapMap() },
      { obj: cloudPick, hint: () => (S.rain ? '点一下：雨停' : '点一下：下一场雨'), onTap: () => A.tapCloud() },
    ], tip: tag('', 'pill') });
    const act = demoActs(drag, group);

    const C = (n, lift = 0.02) => { const p = onLand(MARK[n][0], MARK[n][1], 1); return [p.x, p.y + lift, p.z]; };
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'rise', title: '立起来', todo: '点一下<b>等高线图</b>，让它立起来：每条等高线升到自己的海拔。', target: () => (S.riseT > 0.5 ? null : mapPick) },
        { id: 'rain', title: '下一场雨', todo: '点一下<b>云</b>，下一场雨：看雨水往哪里流——哪里汇在一起，哪里向两边分开。', target: () => (S.rain ? null : cloudPick) },
        { id: 'name', title: '识别 ①—⑦', todo: '识别图中 ①—⑦ 表示的地形部位：在左边给每个编号选一个名字。' },
        { id: 'slope', title: '比较 ④、⑥ 的坡度', todo: '比较 ④ 和 ⑥ 的坡度差异：侧过来看看两处的山坡，再看等高线的疏密。在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { water.clear(); drops.clear(); clearWet(); } }),
          shots: [
            { cap: '课本图 2.13：某地的等高线地形图。让它立起来：每条等高线升到自己的海拔。', dur: 5.5, cam: [[0, 0.03, 0], [0.05, 0.75, 1], 0.42], during: act.tap(mapPick, 0.12) },
            { cap: '①、③ 是山峰：等高线闭合，数值从四周向中间逐渐增大。⑦ 在两座山峰之间，是鞍部。', dur: 6, cam: [C(7, 0), [0.1, 0.55, 1], 0.3] },
            { cap: '下一场雨：雨水顺着山坡最陡的方向往下流。', dur: 6, cam: [[0, 0.03, 0], [0.05, 0.75, 1], 0.4], during: act.tap(cloudPick, 0.05) },
            { cap: '⑤ 是山谷：等高线的弯曲部分向高处凸出——两边的雨水汇到这里，往下流。', dur: 6, cam: [C(5, 0), [0.05, 0.6, 1], 0.24] },
            { cap: '④、⑥ 是山脊：等高线的弯曲部分向低处凸出——雨水从这里向两边分开。', dur: 6, cam: [C(6, 0), [0.2, 0.55, 1], 0.26] },
            { cap: '② 是陡崖：几条等高线重叠在一起，坡几乎是直上直下的。', dur: 5, cam: [C(2, 0), [-0.75, 0.6, -0.3], 0.24] },
            { cap: '比较 ④ 和 ⑥ 的坡度。先侧着看 ④：等高线稀疏，坡较缓。', dur: 5, cam: [C(4, 0), [0.74, 0.3, 0.67], 0.3] },
            { cap: '再侧着看 ⑥：等高线密集，坡较陡。演示完了，下面换你自己做。', dur: 6, cam: [C(6, 0), [0.96, 0.3, -0.28], 0.3], during: act.tap(cloudPick, 0.95) },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ================= 雨水 =================
    const spawnWater = (gx, gy) => water.spawn({ p: new THREE.Vector3(), gx, gy, vx: 0, vy: 0, size: 0.0032 + Math.random() * 0.0012, alpha: 0.95, life: 5 + Math.random() * 3 });
    const flow = (p, d) => {
      // 最陡的下坡方向 + 一点惯性；格子 / 秒
      const e = 1, gx = (elevAt(p.gx + e, p.gy) - elevAt(p.gx - e, p.gy)) / (2 * e), gy = (elevAt(p.gx, p.gy + e) - elevAt(p.gx, p.gy - e)) / (2 * e);
      const s = Math.hypot(gx, gy), sp = s < 0.05 ? 0 : 7 + 6 * Math.sqrt(s);
      p.vx = p.vx * 0.82 + (-gx / (s + 1e-6)) * sp * 0.18; p.vy = p.vy * 0.82 + (-gy / (s + 1e-6)) * sp * 0.18;
      p.gx += p.vx * d; p.gy += p.vy * d;
      if (p.gx < 0 || p.gy < 0 || p.gx > GW - 1 || p.gy > GH - 1) return false;
      const [x, z] = gridToLocal(p.gx, p.gy); p.p.set(x, yOf(elevAt(p.gx, p.gy), S.rise) + 0.0012, z);
      p.alpha = Math.min(0.95, (p.life - p.age) * 1.5);
      return true;
    };

    // ================= 每帧 =================
    const step = (h) => {
      // 立起来 / 放平
      S.rise += clamp(S.riseT - S.rise, -h * 0.8, h * 0.8);
      shape(S.rise);
      if (S.rise >= 0.999 && S.riseT === 1 && !bar.has('rise') && !S.demo) done('rise');
      // 下雨：雨点从云下面落到地面上，落地变成一点水
      if (S.rain) {
        S.rainT += h;
        for (let k = 0; k < Math.round(h * 70); k++) {
          const gx = Math.random() * (GW - 1), gy = Math.random() * (GH - 1), [x, z] = gridToLocal(gx, gy);
          drops.spawn({ p: new THREE.Vector3(x, 0.15, z), v: new THREE.Vector3(0, -0.5, 0), gx, gy, size: 0.012, life: 1 });
        }
        if (S.rainT > 5 && !bar.has('rain') && !S.demo) { done('rain'); status('看：雨水<b>汇进</b>了 ⑤ 那样的地方（山谷），在 ④、⑥ 那样的地方<b>向两边分开</b>（山脊）。在左边识别 ①—⑦。'); }
      }
      drops.update(h, (p, d) => { p.p.addScaledVector(p.v, d); const ground = yOf(elevAt(p.gx, p.gy), S.rise); if (p.p.y < ground) { spawnWater(p.gx, p.gy); return false; } return true; });
      water.update(h, flow);
      // 汇在一起的水：上游流过来的格子越多，水越多；雨下得越久，越小的沟也有水（从山谷下游往上长）
      const th = S.rainT > 0 ? Math.max(25, 1500 / (1 + S.rainT * S.rainT * 0.35)) : Infinity;
      if (Math.abs(th - lastTh) / Math.min(th, lastTh || th) > 0.04 || (th === Infinity) !== (lastTh === Infinity)) { lastTh = th; drawStreams(th); }
      wet.visible = S.rise > 0.3;
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['steps'],
      size: { w: 0.36, d: 0.22, h: 0.1 },
      view: { elev: 40, azim: -6, lookY: 0.3, frameMargin: 1.04 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const rows = {};
        const nameBox = h('div', { class: 'think' }, h('div', { class: 'think-t' }, '识别地形部位'), h('p', { class: 'think-q', html: '图中 ①—⑦ 分别表示什么地形部位？' }));
        for (let n = 1; n <= 7; n++) { const r = seg(CIRC[n], NAMES, (v) => A.name(n, v), { value: -1 }); rows[n] = r; nameBox.append(r.el); }
        const t1 = think({ title: '想一想', status: (m) => ui.status(m),
          q: '比较图中 ④ 和 ⑥ 的坡度差异。',
          options: ['⑥ 处坡较陡，④ 处坡较缓', '④ 处坡较陡，⑥ 处坡较缓', '两处一样陡'],
          wrong: ['侧过来看：哪一处的山坡更陡？再数数两处的等高线，哪里更密？', '⑥ 处的等高线挤得更紧。'],
          ok: '对：⑥ 处等高线密集，坡较陡；④ 处等高线稀疏，坡较缓。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('slope'); } });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：地形是按图 2.13 上的等高线算出来的（两条等高线之间按远近插值），竖直方向放大了，为了看清起伏。雨水沿最陡的下坡方向流。' });
        ui.controls.append(nameBox, t1.el, next, more, note);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.hidden = true;
        W = { rows, t1, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('图 2.13：某地的等高线地形图（单位：米）。可以先看<b>老师演示</b>，也可以直接动手：先点一下这张图，让它立起来。');
      },
      update(dt) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k); },
      dispose() { bar.dispose(); drops.dispose?.(); water.dispose?.(); wetTex.dispose(); tex.dispose(); },
      debug: { get S() { return S; }, A, bar, picks: { map: mapPick, cloud: cloudPick }, elevAt, toGrid,
        qa: qaFlow(drag, [
          { name: '立起来', tap: mapPick, wait: 2.5 },
          { name: '下雨', tap: cloudPick, wait: 6 },
          ...Object.entries(ANSWER).map(([n, v]) => ({ name: `识别 ${CIRC[n]}`, run: () => W.rows[n].set(NAMES.indexOf(v), true) })),
          { name: '比较坡度', run: () => W.t1.el.querySelector('button').click() },
        ]) },
    };
  },
};
