// 图4.4-3 光的折射 + 图4.4-1 让硬币出现。只有世界内界面：所有操作都是场景里的实物。
//   ① 激光射入水中：拖激光笔绕入射点 O 转（拖进水里就是“从水中射入空气”），或用实验板上的选项；
//   ② 让硬币出现：往杯里加水。两个小实验之间像立体书一样折叠切换。
// 坐标：竖直面 xy，水面 y = Y0，入射点 O = (0, Y0)。激光笔的位置用极角 φ 表示：从 +y 量起，左负右正。
import * as THREE from 'three';
import { canvasTex } from './kit/props.js';
import { beaker } from './kit/props.js';
import { OpticsScene, RayView, laserPen } from './kit/optics.js';
import { draggable, clamp, deg } from './kit/interact.js';
import { popup } from './kit/world.js';
import { seg, readout, buttons, table, goals, note } from './kit/ui.js';
import { paint, inked, polyline, hull } from '../live/ink.js';

const N_WATER = 1.33;
const TW = 0.3, TD = 0.12, TH = 0.11;   // 水槽
const Y0 = TH + 0.004;                   // 水面高度
const RA = 0.11, RW = 0.095;             // 激光笔离 O 的距离：空气中 / 水中
const CRIT = Math.asin(1 / N_WATER) / deg;

export default {
  id: 'refraction',
  fig: '图4.4-3',
  title: '光的折射',
  stampText: '观察',
  predict: {
    q: '让一束激光从空气斜射入水中，光在水面处会怎样？',
    options: ['沿原来的方向直线前进', '偏向远离法线的一侧', '偏向靠近法线的一侧'],
    answer: 2,
  },
  worldTable: { headers: ['入射角', '折射角', '光的去向'], cols: [0.3, 0.3, 0.4] },
  conclusion: {
    page: 110, rect: [160, 324, 462, 472],      // 课本第 104 页：“当光从空气斜射入水中……光路可逆。”
    quote: '光从空气斜射入水中时，传播方向发生了偏折，这种现象叫作光的折射。',
    why: '光从空气斜射入水中时，折射光线向法线方向偏折，<b>折射角小于入射角</b>；入射角增大，折射角也增大。光垂直射入水中时，传播方向不变。在折射现象中，<b>光路是可逆的</b>。看水中的硬币：硬币反射的光从水中斜射入空气时，折射角大于入射角，人眼逆着折射光线看去，看到的是比实际位置<b>偏高</b>的虚像——所以水看起来比实际的浅。',
    src: '课本第 104 页 · 第四章 第4节 光的折射',
  },

  create({ tag, look, back }) {
    const group = new THREE.Group();
    const laserScene = new THREE.Group(), coinScene = new THREE.Group();
    group.add(laserScene, coinScene);
    // 硬币小实验放大一些，和水槽差不多大；在同一个位置原地切换，镜头和实验板都不动
    const coinInner = new THREE.Group();
    coinInner.scale.setScalar(1.7);
    coinInner.position.set(-0.03, 0, 0);
    coinScene.add(coinInner);

    // ======================= ① 激光射入水中 =======================
    const tank = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(TW, TH + 0.04, TD), paint(0xdff1f8, { transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
    box.position.y = TH / 2 + 0.02;
    box.renderOrder = 6;
    inked(box, { width: 1.3, color: 0x5d7f95 });
    const water = new THREE.Mesh(new THREE.BoxGeometry(TW - 0.004, TH, TD - 0.004), paint(0xb9dcec, { transparent: true, opacity: 0.42, depthWrite: false }));
    water.position.y = TH / 2 + 0.002;
    water.renderOrder = 5;
    const surf = new THREE.Mesh(new THREE.PlaneGeometry(TW - 0.004, TD - 0.004), new THREE.MeshBasicMaterial({ color: 0x7cc2e2, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
    surf.rotation.x = -Math.PI / 2;
    surf.position.y = Y0;
    tank.add(box, water, surf);
    laserScene.add(tank);
    // 法线（虚线）
    laserScene.add(polyline([new THREE.Vector3(0, 0.01, 0.001), new THREE.Vector3(0, Y0 + 0.13, 0.001)], { dashed: true, color: 0x1d2433, width: 1.4, dash: 0.008, gap: 0.006 }));
    // 量角器：一块竖直的圆形刻度盘，圆心在入射点，0° 在法线上，每 1° 一小格、10° 标数字（课本实验里用光屏上的量角器读角）
    const protTex = canvasTex(1024, 1024, (c, w) => {
      const cx = w / 2, R = w * 0.47;
      c.fillStyle = 'rgba(255,253,245,0.82)'; c.beginPath(); c.arc(cx, cx, R, 0, 7); c.fill();
      c.strokeStyle = '#1d2433'; c.fillStyle = '#1d2433'; c.lineWidth = 3; c.beginPath(); c.arc(cx, cx, R, 0, 7); c.stroke();
      c.textAlign = 'center'; c.font = 'bold 30px sans-serif';
      for (let k = 0; k < 360; k++) {
        const a = (k * Math.PI) / 180, major = k % 10 === 0, mid = k % 5 === 0;
        const r0 = R - (major ? 34 : mid ? 24 : 14);
        c.lineWidth = major ? 3 : 1.6;
        c.beginPath(); c.moveTo(cx + Math.sin(a) * R, cx - Math.cos(a) * R); c.lineTo(cx + Math.sin(a) * r0, cx - Math.cos(a) * r0); c.stroke();
        if (major) { const v = k <= 90 ? k : k <= 180 ? 180 - k : k <= 270 ? k - 180 : 360 - k; c.fillText(String(v), cx + Math.sin(a) * (R - 56), cx - Math.cos(a) * (R - 56) + 10); }
      }
    });
    const prot = new THREE.Mesh(new THREE.CircleGeometry(0.075, 64), new THREE.MeshBasicMaterial({ map: protTex, transparent: true, depthWrite: false }));
    prot.position.set(0, Y0, -0.016); prot.renderOrder = 1;
    laserScene.add(prot);
    const tN = tag('法线', 'pill');
    // 激光笔 + 幽灵笔（光路可逆的提示）
    const pen = laserPen();
    laserScene.add(pen);
    const rays = new RayView({ width: 2.4, glow: 9 });
    const weak = new RayView({ width: 1.2, glow: 3 });
    weak.core.material.opacity = 0.35;
    laserScene.add(rays.group, weak.group);
    const arcs = new THREE.Group();
    laserScene.add(arcs);
    const tI = tag('', 'mag'), tR = tag('', 'mag');
    const sc = new OpticsScene();
    sc.media.push({ poly: [{ x: -TW / 2, y: 0.002 }, { x: TW / 2, y: 0.002 }, { x: TW / 2, y: Y0 }, { x: -TW / 2, y: Y0 }], n: N_WATER });

    // ======================= ② 让硬币出现 =======================
    // 不透明的瓷杯（课本：从杯沿刚好看不到杯底的硬币——杯子必须不透明）
    const CR = 0.035, CH = 0.07, WALL = 0.003;
    const cup = new THREE.Group();
    const prof = [new THREE.Vector2(0.001, 0), new THREE.Vector2(CR, 0), new THREE.Vector2(CR, CH), new THREE.Vector2(CR - WALL, CH), new THREE.Vector2(CR - WALL, WALL), new THREE.Vector2(0.001, WALL)];
    const porcelain = inked(new THREE.Mesh(new THREE.LatheGeometry(prof, 48), paint(0xf4f0e6, { side: THREE.DoubleSide })), { width: 1.3, angle: 60 });
    const bandRing = new THREE.Mesh(new THREE.CylinderGeometry(CR + 0.0003, CR + 0.0003, 0.006, 48, 1, true), paint(0x3f7cb0, { keep: true, side: THREE.DoubleSide }));
    bandRing.position.y = CH - 0.01;
    cup.add(porcelain, bandRing);
    const cupWater = new THREE.Mesh(new THREE.CylinderGeometry(CR - WALL - 0.0005, CR - WALL - 0.0005, 1, 40), paint(0x8fc8e6, { unique: true, transparent: true, opacity: 0.45, depthWrite: false }));
    cupWater.geometry.translate(0, 0.5, 0);
    cupWater.renderOrder = 5;
    cup.add(cupWater);
    cup.setLevel = (lv) => { cupWater.visible = lv > 0.001; cupWater.scale.y = Math.max(0.001, lv - WALL); cupWater.position.y = WALL; };
    const coinGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.002, 24);
    const coin = hull(new THREE.Mesh(coinGeo, paint(0xd7b24a)), 0.001);
    coin.position.set(-0.018, WALL + 0.001, 0);
    cup.add(coin);
    // 眼睛看到的硬币（加水后被“抬高”的像）：只在“从眼睛的位置看”时出现
    const coinImg = new THREE.Mesh(coinGeo, paint(0xd7b24a, { unique: true }));
    coinImg.visible = false;
    cup.add(coinImg);
    coinInner.add(cup);
    const eye = new THREE.Group();
    const ball = hull(new THREE.Mesh(new THREE.SphereGeometry(0.008, 16, 12), paint(0xffffff)), 0.0012);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 12, 8), paint(0x22252e));
    pupil.position.x = -0.006;
    eye.add(ball, pupil);
    eye.position.set(0.1 + 0.006, 0.135, 0);
    coinInner.add(eye);
    const coinRays = new RayView({ width: 2, glow: 6 });
    coinInner.add(coinRays.group);
    const tEye = tag('从这里看', 'pill');
    const coinSc = new OpticsScene();

    // ======================= 场景切换（纸卡） =======================
    const pop = popup({ laser: laserScene, coin: coinScene }, { onShown: (id) => onScene(id) });
    // ======================= 状态 =======================
    const S = { pred: true, phi: -45, rows: [], lastAir: null, perpT: 0, level: 0, coinSeen: false, scene: 'laser', tirSaid: false };
    let W = null;

    const geom = () => {
      const fromWater = Math.abs(S.phi) > 90;
      const i = fromWater ? 180 - Math.abs(S.phi) : Math.abs(S.phi);
      const r0 = fromWater ? RW : RA;
      const a = S.phi * deg;
      const start = { x: Math.sin(a) * r0, y: Y0 + Math.cos(a) * r0 };
      return { fromWater, i, start, side: Math.sign(S.phi) || -1 };
    };

    const layoutLaser = () => {
      const G = geom();
      pen.position.set(G.start.x, G.start.y, 0.004);
      pen.rotation.z = Math.atan2(Y0 - G.start.y, -G.start.x);
      const d = { x: -G.start.x, y: Y0 - G.start.y };
      const tr = sc.trace(G.start, d, { maxLen: 0.32 });
      const hit = tr.hits.find((x) => x.kind === 'refract' || x.kind === 'tir');
      const tir = hit?.kind === 'tir';
      const clip = (p) => ({ x: clamp(p.x, -TW / 2, TW / 2), y: clamp(p.y, 0.003, Y0 + 0.16) });
      rays.set([{ pts: tr.pts.slice(0, S.pred ? 2 : 3).map(clip), color: 0xff2a2a }], (x, y) => new THREE.Vector3(x, y, 0.002));
      // 水面处总有一点反射光（全反射时就是全部）
      const refl = { x: -G.start.x * 0.85, y: Y0 + (G.start.y - Y0) * 0.85 };
      weak.set(tir || S.pred ? [] : [{ pts: [{ x: 0, y: Y0 }, refl], color: 0xff5a5a }], (x, y) => new THREE.Vector3(x, y, 0.002));
      const r = hit && !tir ? hit.r / deg : null;
      const f = (x) => (Math.round(x * 10) / 10).toString();
      S.cur = { ...G, r, tir };
      // 角度弧
      arcs.clear();
      const arcAt = (ang, up, sgn, col) => {
        const p = [];
        for (let k = 0; k <= 20; k++) { const t = (ang * deg * k) / 20; p.push(new THREE.Vector3(sgn * Math.sin(t) * 0.032, Y0 + (up ? 1 : -1) * Math.cos(t) * 0.032, 0.003)); }
        arcs.add(polyline(p, { color: col, width: 1.6 }));
      };
      if (G.i > 0.5) arcAt(G.i, !G.fromWater, G.side, 0xd4006c);
      if (r != null && r > 0.5 && !S.pred) arcAt(r, G.fromWater, -G.side, 0x2f7fd8);
      const half = (G.i / 2) * deg, hr = ((r ?? 0) / 2) * deg;
      tI.loc(laserScene, G.side * Math.sin(half) * 0.055, Y0 + (G.fromWater ? -1 : 1) * Math.cos(half) * 0.055, 0.004).text(`入射角 ${f(G.i)}°`);
      tR.loc(laserScene, -G.side * Math.sin(hr) * 0.055, Y0 + (G.fromWater ? 1 : -1) * Math.cos(hr) * 0.055, 0.004).text(tir ? '全反射：没有折射光' : S.rows.some((row) => r != null && Math.abs(row.r - r) < 0.05) ? `折射角 ${f(r)}°` : '折射角 ?').show(r != null || tir);
      tR.el.style.color = '#2f7fd8';
      tN.loc(laserScene, 0.012, Y0 + 0.135, 0);
      // 状态
      if (!W) return;
      W.out.set('i', `${f(G.i)}°`); W.out.set('r', tir ? '全反射' : r == null ? '—' : `${f(r)}°`); W.out.set('dir', G.fromWater ? '水 → 空气' : '空气 → 水');
      const L = S.lastAir;
      if (G.i < 0.5) W.status('光<b>垂直</b>射到水面：传播方向不变。');
      else if (tir) { W.status(`光从水中射向空气，入射角超过约 ${CRIT.toFixed(0)}° 时，光全部被反射回水中，空气中没有折射光（这叫全反射，高中会学到）。`); }
      else if (L && G.fromWater && Math.abs(G.i - L.r) < 0.6) {
        W.status(`光从水中以 ${f(G.i)}° 射向水面——看空气中的光：它正好沿着原来的入射光射出去了（读一读折射角，和原来的入射角 ${f(L.i)}° 比一比）。光沿原路返回：<b>光路可逆</b>。`);
        W.done('reverse');
      } else W.status(G.fromWater ? '光从水中斜射入空气。看量角器：折射光比入射光离法线<b>更远还是更近</b>？读出折射角，记下来。' : '光从空气斜射入水中。看量角器：折射光比入射光离法线<b>更远还是更近</b>？读出折射角，记下来。');
    };

    const record = () => {
      const c = S.cur;
      if (!c || c.tir || c.i < 0.5) return;
      if (S.rows.some((row) => Math.abs(row.i - c.i) < 0.05 && row.fromWater === c.fromWater)) return W.status('这一组已经记过了。换一个角度。');
      const f = (x) => (Math.round(x * 10) / 10).toString();
      // 学生自己从量角器上读折射角（读到整数度）
      const rr = Math.round(c.r), opts = [...new Set([rr, Math.round(90 - c.r), Math.round(c.i)])].filter((x) => x !== rr || true).slice(0, 3).sort(() => Math.random() - 0.5);
      W.ask(`从量角器上读出<b>折射角</b>（折射光和法线的夹角，读到整数度）：`, opts.map((x) => `${x}°`), `${rr}°`, (opt) => opt === `${Math.round(90 - c.r)}°` ? '折射角是折射光和<b>法线</b>的夹角，不是和水面的夹角。' : '再看看折射光对着量角器的哪条刻度（从法线量起）。', () => {
        S.rows.push(c);
        W.record([`${f(c.i)}°`, `${rr}°`, c.fromWater ? '水 → 空气' : '空气 → 水']);
        if (!c.fromWater) { S.lastAir = c; W.status(`记下了：入射角 ${f(c.i)}°，折射角约 ${rr}°。换一个角度再测，或者试试“逆着刚才的折射光射回去”。`); }
        if (S.rows.filter((row) => !row.fromWater).length >= 3) W.done('air3');
        layoutLaser();
      });
    };

    // ---- 硬币 ----
    const LEVELS = [0, 0.032, 0.062];
    const layoutCoin = () => {
      const lv = S.level;
      cup.setLevel(lv);
      coinSc.media.length = 0;
      if (lv > 0.001) coinSc.media.push({ poly: [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 1, y: lv }, { x: -1, y: lv }], n: N_WATER });
      const coinP = { x: -0.018, y: 0.006 }, rim = { x: 0.035, y: 0.07 }, eyeP = { x: 0.1, y: 0.135 };   // 眼睛的位置：空杯时刚好被杯沿挡住
      // 找一条从硬币出发、经水面折射后到达眼睛的光：不被杯壁挡住才算看得见
      let best = null;
      for (let a = 5; a < 85; a += 0.25) {
        const t = coinSc.trace(coinP, { x: Math.sin(a * deg), y: Math.cos(a * deg) }, { maxLen: 0.3 });
        const last = t.pts.at(-1), prev = t.pts.at(-2);
        const k = (eyeP.x - prev.x) / (last.x - prev.x || 1e-9);
        const yAt = prev.y + (last.y - prev.y) * k;
        const err = Math.abs(yAt - eyeP.y);
        if (!best || err < best.err) best = { err, pts: [...t.pts.slice(0, -1), eyeP] };
      }
      // 杯沿：光线在 x = rim.x 处的高度要高于杯沿
      const seg = best.pts;
      let yRim = null;
      for (let i = 0; i < seg.length - 1; i++) if (seg[i].x <= rim.x && seg[i + 1].x >= rim.x) { const u = (rim.x - seg[i].x) / (seg[i + 1].x - seg[i].x); yRim = seg[i].y + (seg[i + 1].y - seg[i].y) * u; }
      const visible = yRim != null && yRim > rim.y;
      // 像的位置：进入眼睛的光反向延长，和硬币所在的竖直线相交（课本图4.4-4 的画法）
      S.coinApparent = null;
      if (visible && lv > 0) {
        const a = seg.at(-2), b2 = seg.at(-1);
        const k2 = (coinP.x - a.x) / (b2.x - a.x);
        S.coinApparent = { x: coinP.x, y: a.y + (b2.y - a.y) * k2 };
      }
      S.coinVisible = visible && lv > 0;
      applyEyeView();
      const pts = visible ? best.pts : [coinP, rim, { x: rim.x + (rim.x - coinP.x) * 1.2, y: rim.y + (rim.y - coinP.y) * 1.2 }];
      coinRays.set([{ pts, color: visible ? 0xffc23a : 0xd9c48a }], (x, y) => new THREE.Vector3(x, y, 0.036));
      tEye.loc(coinInner, eyeP.x + 0.02, eyeP.y + 0.02, 0);
      if (!W) return;
      if (visible && lv > 0) {
        W.status(S.eyeView ? '硬币“出现”了！看到的是硬币被抬高的<b>像</b>——光从水中斜射入空气时偏折，越过了杯沿。' : '加水后，硬币发出的光从水中斜射入空气时<b>偏折</b>，越过杯沿进入了眼睛。从眼睛的位置看看。');
        if (!S.coinSeen && S.eyeView) { S.coinSeen = true; W.done('coin'); }
      } else if (lv > 0) W.status('还看不到硬币。再加点水。');
      else W.status(S.eyeView ? '从这里看，杯沿刚好挡住了杯底的硬币。往杯里加水试试。' : '空杯。点“从眼睛的位置看”，确认看不到杯底的硬币。');
    };

    // 从眼睛的位置看：镜头就在眼睛那里；看到的是“像”，不是光路
    S.eyeView = false;
    const applyEyeView = () => {
      const on = S.eyeView;
      coinRays.group.visible = !on;
      eye.visible = !on;
      tEye.show(!on && S.scene === 'coin');
      const ap = S.coinApparent;
      coinImg.visible = on && !!ap;
      coin.visible = !(on && ap);                  // 加水后眼睛看到的是被抬高的像
      if (ap) coinImg.position.set(ap.x, ap.y, 0);
    };
    const eyeLook = (on) => {
      S.eyeView = on;
      if (on) {
        // coinInner 局部 → 实验组局部：×1.7，再左移 0.03
        const E = { x: 0.1 * 1.7 - 0.03, y: 0.135 * 1.7 }, T = { x: -0.018 * 1.7 - 0.03, y: 0.03 * 1.7 };
        const d = Math.hypot(E.x - T.x, E.y - T.y);
        look([T.x, T.y, 0], [(E.x - T.x) / d, (E.y - T.y) / d, 0.0001], d * 1.9, () => { eyeLook(false); W?.syncEye?.(false); });
      } else back();
      applyEyeView();
    };

    const onScene = (id) => {
      S.scene = id;
      const laser = id === 'laser';
      for (const t of [tN, tI, tR]) t.show(laser);
      tEye.show(!laser);
      if (S.eyeView && laser) eyeLook(false);
      if (laser) layoutLaser(); else layoutCoin();
    };

    // ======================= 指针 =======================
    const pointer = draggable(group, [
      { obj: pen, plane: 'xy', onDrag: (p) => {
        let phi = Math.atan2(p.x, p.y - Y0) / deg;
        // 不能贴着水面：80°~100° 之间吸到最近的一边
        if (Math.abs(phi) > 80 && Math.abs(phi) < 100) phi = Math.sign(phi) * (Math.abs(phi) < 90 ? 80 : 100);
        let i = Math.round(Math.abs(phi) > 90 ? 180 - Math.abs(phi) : Math.abs(phi));
        if (i < 2) i = 0;                                   // 吸附到垂直
        S.phi = (Math.abs(phi) > 90 ? 180 - i : i) * (Math.sign(phi) || -1);
        if (i === 0) S.phi = Math.abs(phi) > 90 ? 180 : 0;
        layoutLaser(); W?.sync();
      } },
    ]);

    layoutLaser();
    onScene('laser');
    tEye.show(false);
    const reverse = () => { const L = S.lastAir; if (!L) return W?.status('先让光从空气射入水中，记下一组。'); S.phi = (180 - L.r) * -L.side; layoutLaser(); W.sync(); };

    return {
      group,
      size: { w: 0.36, d: 0.3, h: 0.26 },
      view: { elev: 18, azim: 0, lookY: 0.4, margin: 1.5 },
      pointer,
      mount(ui) {
        const out = readout([{ key: 'i', label: '入射角' }, { key: 'r', label: '折射角', secret: true }, { key: 'dir', label: '光的去向', span: true }]);
        const which = seg('做哪个', ['激光射入水中', '让硬币出现'], (_, k) => { pop.switchTo(k ? 'coin' : 'laser'); laserBox.hidden = k === 1; coinBox.hidden = k === 0; ui.status(k ? '杯底放着一枚硬币。眼睛的位置固定，空杯时杯沿刚好挡住硬币。慢慢往杯里加水，看看会怎样。' : '激光从空气斜射入水中。改变入射角，看折射光线怎样偏折。'); });
        const from = seg('光从哪里射来', ['空气 → 水', '水 → 空气'], (_, k) => { const i = Math.min(geom().i, k ? 45 : 80); S.phi = (k ? 180 - i : i) * (geom().side || -1); layoutLaser(); sync(); });
        const ANG = [0, 20, 30, 45, 60];
        const ang = seg('入射角（也可以直接拖激光笔）', ANG.map((a) => `${a}°`), (_, k) => { const g = geom(); S.phi = (g.fromWater ? 180 - ANG[k] : ANG[k]) * (g.side || -1); if (ANG[k] === 0) S.phi = g.fromWater ? 180 : 0; layoutLaser(); });
        const acts = buttons([{ text: '记下这一组', onClick: () => record() }, { text: '逆着折射光射回去', ghost: true, onClick: () => reverse() }, { text: '凑近看量角器', ghost: true, onClick: () => { group.updateMatrixWorld(true); const l = group.worldToLocal(prot.getWorldPosition(new THREE.Vector3())); look([l.x, l.y, l.z], [0, 0.1, 1], 0.2, () => back()); } }]);
        const tb = table(['入射角', '折射角', '光的去向']);
        const water = seg('往杯里加水', ['空杯', '加一半', '加满'], (_, k) => { S.level = LEVELS[k]; layoutCoin(); });
        const laserBox = document.createElement('div'), coinBox = document.createElement('div');
        laserBox.append(from.el, ang.el, out.el, acts.el, note('注意避免激光射入眼睛。'));
        const eyeBtn = buttons([{ text: '👁 从眼睛的位置看', ghost: true, onClick: () => { eyeLook(!S.eyeView); syncEye(S.eyeView); } }]);
        const syncEye = (on) => { eyeBtn.btns[0].textContent = on ? '↩ 回到旁边看（看光路）' : '👁 从眼睛的位置看'; };
        coinBox.append(eyeBtn.el, water.el, note('眼睛的位置固定不动。空杯时，杯沿刚好挡住杯底的硬币。从旁边看可以看到光是怎么走的。'));
        coinBox.hidden = true;
        ui.controls.append(which.el, laserBox, coinBox);
        ui.data.append(tb.el);
        const G = goals(ui, [['air3', '光从空气射入水中：换 3 个入射角，各记一次'], ['perp', '让光垂直射到水面'], ['reverse', '让光逆着折射光射回去'], ['coin', '从眼睛的位置看，让杯底的硬币“出现”']]);
        const sync = () => { const g = geom(); from.set(g.fromWater ? 1 : 0); const k = ANG.findIndex((a) => Math.abs(a - g.i) < 0.05); ang.set(k); };
        const askB = buttons([0, 1, 2].map(() => ({ text: '', ghost: true, onClick: () => {} })));
        askB.el.hidden = true;
        ui.controls.append(askB.el);
        W = { out, status: (m) => ui.status(m), done: (id) => G.done(id), record: (cells) => { tb.add(cells); out.reveal('r'); }, sync, syncEye,
          ask: (q, opts, right, hint, ok) => { askB.btns.forEach((b, j) => { b.hidden = j >= opts.length; if (b.hidden) return; b.textContent = opts[j]; b.onclick = () => { if (opts[j] !== right) return ui.status(hint(opts[j])); askB.el.hidden = true; ok(); }; }); askB.el.hidden = false; ui.status(q); } };
        ui.status('拖动激光笔，看光在水面怎样偏折。');
        layoutLaser(); sync();
      },
      predicting(on) { S.pred = on; layoutLaser(); },
      update(dt, t) {
        pop.update(dt);
        if (S.scene === 'laser' && S.cur?.i < 0.5) { S.perpT += dt; if (S.perpT > 0.6) W?.done('perp'); } else S.perpT = 0;
      },
      debug: { set: (phi) => { S.phi = phi; layoutLaser(); }, record: () => record(), ghost: () => reverse(), scene: (id) => pop.switchTo(id), pour: () => { const k = LEVELS.findIndex((l) => l > S.level + 1e-6); if (k >= 0) { S.level = LEVELS[k]; layoutCoin(); } }, state: () => ({ ...S.cur, rows: S.rows.length }) },
    };
  },
};
