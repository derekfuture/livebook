// 数学 八年级上册 16.3.2 完全平方公式。课本第 114–115 页：“思考”（图16.3-2）和练习第 1 题“(a+b)²＝a²+b² 对吗”。
//
// 一件事：(a+b)² 是一版要印的字。铁框就是边长 a+b 的正方形；字盘里有三种字块 a²、ab、b²，每块的大小就是它的面积。
// 学生照自己的想法把字块排进前面的铁框；排了什么，排字手托上就排出什么式子：(a+b)²＝……
// 后面两个铁框大小不一样（a、b 换了），前面排一块，后面照样排一块：同一个想法，在几个大小上一起跑。
// 提起铁框：排满了，整版一起起来；没排满，字块掉下去。a²＋b² 只在 b＝0 的那一版碰巧排满。
// 推墨辊：先滚过字版和手托，再滚到活页上——框里有什么就印出什么，空着的地方印出来是白的。
// 数学上的分寸：铁框说的是 a、b 为长度（正数）的情形；任意的数，靠多项式乘法 (a+b)(a+b)＝a²＋ab＋ab＋b²。
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { sheet, text, tweens, clamp } from './kit/sheet.js';
import { draggable } from './kit/interact.js';
import { sfx } from './kit/audio.js';
import { TYPE_H, HUE, KINDS, typeBlock, chaseFrame, CHASE, galleyTray, GALLEY, brayer, mats, envTick, labelMesh, drawTerm, sortBlock, termWidth } from './kit/type.js';

const U = 0.022;                         // 一个长度单位多长（米）
const GF = GALLEY.floor;                 // 托盘底板的上表面
const LIFT = 0.055;                      // 铁框提起来多高
const HOLD = GF + TYPE_H + 0.03;         // 拿在手里的字块有多高
const HERO = { a: 3, b: 2, x: -0.03, z: 0.045 };
const FAM = [{ a: 1.5, b: 3, x: -0.072, z: -0.094 }, { a: 3, b: 0, x: 0.058, z: -0.094 }];
const TRAY = { x0: -0.142, x1: 0.124, z0: -0.172, z1: 0.152 };
const STICK = { x0: -0.101, x1: 0.042, z: 0.126, d: 0.017, h: 0.0102 };       // 排字手托；h 是小字的字高
const ROLL = { rest: 0.094, z: 0.062, L: 0.156, r: 0.0125, land: -0.168, end: -0.33 };
const PAPER = { x: -0.25, z: 0.04, w: 0.172, d: 0.25 };
const PR = { x: -0.255, z: 0.0645, w: 0.17, d: 0.165 };                        // 活页上印字的那一块
const SHIFT = -0.2225;                   // 印到活页上：比字版往左挪这么多
const CASE = { x: 0.212, z: -0.004, tilt: 0.2 };
const ORDER = ['a2', 'ab', 'b2'];
const KEYS = ['A', 'AB1', 'AB2', 'B'];
const PLAIN = '#2b2d33';                 // ＋、＝、括号这些记号的墨
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const smooth = (t) => t * t * (3 - 2 * t);
const termHTML = { a2: '<i>a</i>²', ab: '<i>ab</i>', b2: '<i>b</i>²' };

/** 边长 a+b 的铁框里的四个格子（格子中心相对铁框中心），和课本图16.3-2 一样：a² 在左前，b² 在右后 */
function cellsOf(a, b) {
  const S = (a + b) * U, h = S / 2, au = a * U, bu = b * U;
  return {
    S,
    A: { kind: 'a2', w: au, d: au, x: -h + au / 2, z: -h + bu + au / 2, rot: 0, sides: ['a', 'a'] },
    AB1: { kind: 'ab', w: au, d: bu, x: -h + au / 2, z: -h + bu / 2, rot: 0, sides: ['a', 'b'] },
    AB2: { kind: 'ab', w: bu, d: au, x: -h + au + bu / 2, z: -h + bu + au / 2, rot: 1, sides: ['b', 'a'] },
    B: { kind: 'b2', w: bu, d: bu, x: -h + au + bu / 2, z: -h + bu / 2, rot: 0, sides: ['b', 'b'] },
  };
}
const live = (cell) => cell.w > 1e-6 && cell.d > 1e-6;
const dimsOf = (kind, a, b) => (kind === 'a2' ? [a * U, a * U] : kind === 'b2' ? [b * U, b * U] : [a * U, b * U]);

export default {
  id: 'huozi',
  fig: '图16.3-2',
  title: '和的平方',
  flow: 'explore',
  ask: '课本练习问：(<i>a</i>＋<i>b</i>)²＝<i>a</i>²＋<i>b</i>² 对吗？<br>把 (<i>a</i>＋<i>b</i>)² 当成一版要印的字：铁框是边长 <i>a</i>＋<i>b</i> 的正方形，字块的大小就是它的面积。照你想的排，再提起铁框看看。',
  need: '排满铁框，几个大小都提得起来，再印到活页上',
  conclusion: {
    quote: '(a+b)²＝a²＋2ab＋b²，(a−b)²＝a²−2ab＋b²．也就是说，两个数的和（或差）的平方，等于它们的平方和，加上（或减去）它们的积的2倍．',
    why: '课本用多项式乘法得到它：(<i>a</i>＋<i>b</i>)²＝(<i>a</i>＋<i>b</i>)(<i>a</i>＋<i>b</i>)＝<i>a</i>²＋<i>ab</i>＋<i>ab</i>＋<i>b</i>²＝<i>a</i>²＋2<i>ab</i>＋<i>b</i>²。<br>铁框说的是同一件事：边长 <i>a</i>＋<i>b</i> 的正方形，按 <i>a</i>、<i>b</i> 的分界正好切成四块，<i>a</i>²、<i>ab</i>、<i>ab</i>、<i>b</i>²。少了中间那两块 <i>ab</i> 就排不满；只有 <i>a</i>、<i>b</i> 里有一个是 0 时，那两块没有了，<i>a</i>²＋<i>b</i>² 才碰巧排满。<br><br>用面积说明时，<i>a</i>、<i>b</i> 是长度（正数）；<i>a</i>、<i>b</i> 是任意的数时，靠的是上面那一串乘法。',
    src: '课本第 114–115 页 · 第十六章 16.3.2 完全平方公式',
  },

  create(ctx) {
    const group = new THREE.Group();
    const root = group, tw = tweens(), M = mats();
    const S = { busy: false, rolling: false, held: null, lifted: 0, liftedSince: false, last: null, ink: 'none', reveal: 1, rx: ROLL.rest, printed: null, done: false, clock: 0 };
    let ui = null, dead = false;
    const v3 = new THREE.Vector3();
    const tip = ctx?.tag?.('', 'pill');

    // ---- 活页：左边一张纸，印东西用 ----
    const paper = sheet({ w: PAPER.w, d: PAPER.d, res: 1024 });
    paper.group.position.set(PAPER.x, 0, PAPER.z);
    root.add(paper.group);
    const heading = text(root, '练习 1　(a+b)²＝a²＋b² 对吗？', { h: 0.0088, color: '#2a3550', weight: 600 });
    heading.at(PAPER.x - PAPER.w / 2 + 0.012 + heading.scale.x / 2, 0.066);
    const note = text(root, '', { hand: true, h: 0.0082, color: '#4a5165' });

    // ---- 托盘、字盘、排字手托、墨辊 ----
    root.add(galleyTray(TRAY.x0, TRAY.x1, TRAY.z0, TRAY.z1));

    // 字盘：前低后高斜放，从前往后三格——b²、ab、a²
    const box = new THREE.Group(), stackTop = {};
    {
      const wall = 0.004, IW = 3 * U + 0.008, H = 0.02, base = 0.004, OW = IW + 2 * wall;
      const dims = { a2: [3 * U, 3 * U], ab: [3 * U, 2 * U], b2: [2 * U, 2 * U] }, front = ['b2', 'ab', 'a2'];
      let D = wall; for (const k of front) D += dims[k][1] + 0.008 + wall;
      const part = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.0012), M.walnut); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; box.add(m); };
      part(OW, base, D, 0, base / 2, 0);
      part(wall, H, D, -OW / 2 + wall / 2, base + H / 2, 0); part(wall, H, D, OW / 2 - wall / 2, base + H / 2, 0);
      let z = D / 2; part(OW, H, wall, 0, base + H / 2, z - wall / 2); z -= wall;
      for (const k of front) {
        const dd = dims[k][1] + 0.008, cz = z - dd / 2; z -= dd;
        part(OW, H, wall, 0, base + H / 2, z - wall / 2); z -= wall;
        const [w, d] = dims[k];
        const lo = typeBlock(k, w - 0.0008, d - 0.0008); lo.position.set(0, base, cz);
        const hi = typeBlock(k, w - 0.0008, d - 0.0008); hi.position.set(0.0007, base + TYPE_H, cz - 0.0005); hi.rotation.y = 0.012;
        box.add(lo, hi); stackTop[k] = hi;
      }
      box.rotation.x = CASE.tilt;
      box.position.set(CASE.x, (D / 2) * Math.sin(CASE.tilt) + 0.0005, CASE.z);
      root.add(box);
      // 后面垫两块木头，字盘前低后高
      const legH = D * Math.sin(CASE.tilt);
      for (const s of [-1, 1]) { const leg = new THREE.Mesh(new RoundedBoxGeometry(0.008, legH, 0.012, 2, 0.001), M.walnut); leg.position.set(CASE.x + s * (OW / 2 - 0.006), legH / 2, CASE.z - (D / 2) * Math.cos(CASE.tilt) + 0.008); leg.castShadow = true; root.add(leg); }
    }

    // 排字手托：一条钢槽，式子的小字排在里面
    {
      const steel = M.iron, len = STICK.x1 - STICK.x0 + 0.008;
      const plate = new THREE.Mesh(new RoundedBoxGeometry(len, 0.0012, STICK.d + 0.004, 2, 0.0005), steel);
      plate.position.set((STICK.x0 + STICK.x1) / 2, GF + 0.0006, STICK.z); plate.receiveShadow = plate.castShadow = true;
      const lip = new THREE.Mesh(new RoundedBoxGeometry(len, 0.009, 0.0016, 2, 0.0005), steel);
      lip.position.set((STICK.x0 + STICK.x1) / 2, GF + 0.0045, STICK.z - STICK.d / 2 - 0.002); lip.castShadow = true;
      const knee = new THREE.Mesh(new RoundedBoxGeometry(0.0016, 0.009, STICK.d + 0.004, 2, 0.0005), steel);
      knee.position.set(STICK.x0 - 0.004, GF + 0.0045, STICK.z); knee.castShadow = true;
      root.add(plate, lip, knee);
    }

    const rol = brayer(ROLL.L, ROLL.r);
    root.add(rol);

    // ---- 铁框 ----
    const chases = [];
    const makeChase = (spec, isHero) => {
      const c = { spec: { ...spec }, C: null, frame: null, hero: isHero, set: {}, proud: [], ok: false };
      buildFrame(c);
      chases.push(c);
      return c;
    };
    function buildFrame(c) {
      const spec = c.spec, isHero = c.hero, C = cellsOf(spec.a, spec.b), Sz = C.S, front = [], left = [];
      if (c.frame) { root.remove(c.frame); c.frame.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); }
      if (spec.a) { front.push({ from: 0, to: spec.a * U, hue: HUE.a, label: 'a' }); left.push({ from: spec.b * U, to: Sz, hue: HUE.a, label: 'a' }); }
      if (spec.b) { front.push({ from: spec.a * U, to: Sz, hue: HUE.b, label: 'b' }); left.push({ from: 0, to: spec.b * U, hue: HUE.b, label: 'b' }); }
      const bar = isHero ? CHASE.bar : 0.009, frame = chaseFrame(Sz, Sz, { front, left, bar, labelH: isHero ? 0.017 : 0.014 });
      frame.position.set(spec.x, GF, spec.z);
      frame.traverse((o) => { o.userData.noFrame = true; });
      root.add(frame);
      c.C = C; c.frame = frame;
      if (c.resizable) {
        // b＝0 写在框前面的托盘上，字大一点；右边一条看不见的拾取条，拖它就是改 b
        if (c.zeroTag) { root.remove(c.zeroTag); c.zeroTag = null; }
        if (!spec.b) { const t = labelMesh([['b', 'i'], ['＝0', 'n']], HUE.b, 0.024); t.position.set(spec.x + 0.006, GF + 0.0004, spec.z + Sz / 2 + bar + 0.012); root.add(t); c.zeroTag = t; }
        // 只占右边框的后半截，前半截留给铜把手
        const zd = Sz / 2 + bar - 0.015, pick = new THREE.Mesh(new THREE.BoxGeometry(bar + 0.012, 0.03, zd), new THREE.MeshBasicMaterial({ visible: false }));
        pick.position.set(Sz / 2 + bar / 2 + 0.003, 0.012, -Sz / 2 - bar + zd / 2); pick.userData.pick = true; pick.userData.noFrame = true; frame.add(pick);
        c.sizer = pick;
      }
    }
    const hero = makeChase(HERO, true);
    const fam = FAM.map((f, i) => { if (i === 1) { const c = { spec: { ...f }, C: null, frame: null, hero: false, set: {}, proud: [], ok: false, resizable: true }; buildFrame(c); chases.push(c); return c; } return makeChase(f, false); });
    const piecesOf = (c) => [...KEYS.map((k) => c.set[k]).filter(Boolean), ...c.proud];
    const locked = (c) => KEYS.every((k) => !live(c.C[k]) || c.set[k]) && !c.proud.length;

    // ---- 字块 ----
    let uid = 0;
    const makePiece = (kind, a, b) => {
      const [w, d] = dimsOf(kind, a, b);
      if (w < 1e-6 || d < 1e-6) return null;          // b＝0 时，ab、b² 没有面积，也就没有这块字
      const g = typeBlock(kind, w - 0.0008, d - 0.0008);
      g.traverse((o) => { o.userData.noFrame = true; });
      root.add(g);
      return { id: ++uid, kind, g, cell: null, c: null, v: 0, base: null };
    };
    const killPiece = (p) => { root.remove(p.g); p.g.dispose(); };
    /** 把字块挪到 (x, y, z)，绕竖轴转 ry；arc 是中途抬起多高 */
    const moveTo = (p, x, y, z, ry, { arc = 0.016, delay = 0, dur = 0.3, done } = {}) => {
      const g = p.g, v = ++p.v, f = { x: g.position.x, y: g.position.y, z: g.position.z, ry: g.rotation.y, rx: g.rotation.x, rz: g.rotation.z }, T = dur + delay;
      p.base = { x, y, z, ry };
      tw.to(T, (k0) => {
        if (p.v !== v) return;
        const k = clamp((k0 * T - delay) / dur, 0, 1), e = easeOut(k);
        g.position.set(f.x + (x - f.x) * e, f.y + (y - f.y) * e + Math.sin(Math.PI * k) * arc, f.z + (z - f.z) * e);
        g.rotation.set(f.rx * (1 - e), f.ry + (ry - f.ry) * e, f.rz * (1 - e));
      }, () => { if (p.v === v) done?.(); });
    };
    const tock = () => sfx.clink({ freq: 760 + Math.random() * 160, gain: 0.035 });

    // ---- 排字手托上的式子：前面铁框里有什么，这里就排出什么 ----
    let sorts = [];
    const counts = () => { const n = { a2: 0, ab: 0, b2: 0 }; for (const p of piecesOf(hero)) n[p.kind]++; return n; };
    const tokens = () => {
      const n = counts(), out = [{ parts: [['(', 'n'], ['a', 'i'], ['+', 'n'], ['b', 'i'], [')', 'n'], ['2', 's']], ink: PLAIN }, { parts: [['＝', 'n']], ink: PLAIN }];
      let first = true;
      for (const kind of ORDER) {
        if (!n[kind]) continue;
        if (!first) out.push({ parts: [['＋', 'n']], ink: PLAIN });
        first = false;
        out.push({ parts: [...(n[kind] > 1 ? [[String(n[kind]), 'n']] : []), ...KINDS[kind].term], ink: KINDS[kind].ink, kind });
      }
      return out;
    };
    const layoutSorts = () => {
      const old = sorts; sorts = [];
      let x = STICK.x0 + 0.0015;
      for (const t of tokens()) {
        const w = termWidth(t.parts, STICK.h) + 0.0042, d = STICK.d - 0.0016;
        const was = old.find((o) => o.key === JSON.stringify(t.parts) && !o.used);
        let g;
        if (was) { was.used = true; g = was.g; } else { g = sortBlock(t.parts, t.ink, w, d); g.traverse((o) => { o.userData.noFrame = true; }); root.add(g); g.position.set(x + w / 2, GF + 0.0012 + 0.008, STICK.z); }
        sorts.push({ key: JSON.stringify(t.parts), g, x: x + w / 2, w, parts: t.parts, ink: t.ink });
        x += w + 0.0008;
      }
      for (const o of old) if (!o.used) { root.remove(o.g); o.g.dispose(); }
    };
    const placeSorts = () => {
      for (const s of sorts) {
        const g = s.g, fx = g.position.x, fy = g.position.y;
        tw.to(0.22, (k) => { const e = easeOut(k); g.position.set(fx + (s.x - fx) * e, fy + (GF + 0.0012 - fy) * e, STICK.z); });
      }
    };

    // ---- 后面的铁框照前面的排：同一种字，按各自的 a、b 大小 ----
    const syncFamily = (delay = 0.16) => {
      const n = counts();
      fam.forEach((c, ci) => {
        const want = {}, left = { ...n }, extra = [];
        for (const k of KEYS) { const cell = c.C[k]; if (live(cell) && left[cell.kind] > 0) { want[k] = cell.kind; left[cell.kind]--; } }
        for (const kind of ORDER) { const [w, d] = dimsOf(kind, c.spec.a, c.spec.b); if (w < 1e-6 || d < 1e-6) continue; for (let i = 0; i < left[kind]; i++) extra.push(kind); }
        for (const k of KEYS) {
          const have = c.set[k];
          if (have && have.kind === want[k]) continue;
          if (have) { c.set[k] = null; moveTo(have, have.g.position.x, GF + 0.03, have.g.position.z, have.g.rotation.y, { arc: 0, dur: 0.2, done: () => killPiece(have) }); }
          if (want[k]) {
            const p = makePiece(want[k], c.spec.a, c.spec.b), cell = c.C[k];
            p.c = c; p.cell = k; c.set[k] = p;
            p.g.position.set(c.spec.x + cell.x, GF + 0.034, c.spec.z + cell.z); p.g.rotation.y = cell.rot ? Math.PI / 2 : 0;
            moveTo(p, c.spec.x + cell.x, GF, c.spec.z + cell.z, cell.rot ? Math.PI / 2 : 0, { arc: 0, dur: 0.24, delay: delay + 0.07 * ci, done: tock });
          }
        }
        for (const p of c.proud) moveTo(p, p.g.position.x, GF + 0.03, p.g.position.z, p.g.rotation.y, { arc: 0, dur: 0.2, done: () => killPiece(p) });
        c.proud = [];
        extra.forEach((kind, i) => {
          const p = makePiece(kind, c.spec.a, c.spec.b); p.c = c; c.proud.push(p);
          const x = c.spec.x + (i % 2 ? -1 : 1) * 0.006, z = c.spec.z + 0.004 * i;
          p.g.position.set(x, GF + 0.05, z);
          moveTo(p, x, GF + TYPE_H * (1 + i), z, 0.22 * (i % 2 ? -1 : 1), { arc: 0, dur: 0.24, delay: delay + 0.07 * ci, done: tock });
        });
      });
    };

    // ---- 前面铁框：放进去、拿出来 ----
    const drags = [];
    const changed = () => { S.liftedSince = false; layoutSorts(); placeSorts(); syncFamily(); hint(); };
    const nearestKey = (c, kind, lx, lz) => {
      let best = null, bd = 1e9;
      for (const k of KEYS) { const cell = c.C[k]; if (cell.kind !== kind || !live(cell) || c.set[k]) continue; const dd = lx == null ? 0 : Math.hypot(cell.x - lx, cell.z - lz); if (dd < bd) { bd = dd; best = k; } }
      return best;
    };
    const putHero = (p, lx, lz) => {
      const c = hero, key = nearestKey(c, p.kind, lx, lz);
      p.c = c;
      if (key) {
        const cell = c.C[key]; p.cell = key; c.set[key] = p;
        moveTo(p, c.spec.x + cell.x, GF, c.spec.z + cell.z, cell.rot ? Math.PI / 2 : 0, { arc: 0.012, done: tock });
      } else {
        // 没有合适的空格：只能搁在别的字上面，高出一截
        p.cell = null; c.proud.push(p);
        const i = c.proud.length - 1, h = c.C.S / 2;
        moveTo(p, c.spec.x + clamp(lx ?? 0.004 * i, -h * 0.4, h * 0.4), GF + TYPE_H * (1 + i), c.spec.z + clamp(lz ?? 0.004 * i, -h * 0.4, h * 0.4), 0.2 * (i % 2 ? -1 : 1), { arc: 0.012, done: tock });
      }
      if (!drags.some((d) => d.p === p)) drags.push(pieceDrag(p));
      changed();
    };
    const unseat = (p) => {
      const c = p.c; if (!c) return;
      if (p.cell && c.set[p.cell] === p) c.set[p.cell] = null;
      c.proud = c.proud.filter((q) => q !== p);
      p.cell = null;
    };
    const toCase = (p) => {
      const i = drags.findIndex((d) => d.p === p); if (i >= 0) drags.splice(i, 1);
      unseat(p); p.c = null;
      root.updateMatrixWorld(true);
      const w = root.worldToLocal(stackTop[p.kind].getWorldPosition(new THREE.Vector3()));
      moveTo(p, w.x, w.y + 0.006, w.z, 0, { arc: 0.02, dur: 0.3, done: () => killPiece(p) });
      changed();
    };
    const inside = (c, x, z, m = 0.012) => Math.abs(x - c.spec.x) <= c.C.S / 2 + c.frame.bar + m && Math.abs(z - c.spec.z) <= c.C.S / 2 + c.frame.bar + m;
    const drop = (p, x, z) => {
      if (inside(hero, x, z)) return putHero(p, x - HERO.x, z - HERO.z);
      if (fam.some((c) => inside(c, x, z))) return putHero(p);
      toCase(p);
    };
    function pieceDrag(p) {
      let from = null;
      return {
        p, obj: p.g.body, plane: 'xz', offset: HOLD,
        enabled: () => !S.busy && !S.rolling,
        hint: () => '拖出来：换个格子，或者放回字盘',
        onStart: () => { from = p.cell; unseat(p); S.held = p; p.v++; },
        onDrag: (q) => { p.v++; p.g.position.set(q.x, HOLD, q.z); p.g.rotation.x = p.g.rotation.z = 0; },
        onEnd: (moved) => {
          S.held = null;
          if (!moved) { if (from) { hero.set[from] = p; p.cell = from; const cell = hero.C[from]; moveTo(p, HERO.x + cell.x, GF, HERO.z + cell.z, cell.rot ? Math.PI / 2 : 0, { arc: 0.006, dur: 0.18 }); showSides(cell); } else putHero(p); return; }
          drop(p, p.g.position.x, p.g.position.z);
        },
      };
    }
    // 字盘：每格最上面那块拿得起来（拿走一块，下面还有）
    let held = null;
    const caseDrags = ORDER.map((kind) => ({
      obj: stackTop[kind].body, plane: 'xz', offset: HOLD,
      enabled: () => !S.busy && !S.rolling,
      hint: () => `拿一块 ${termHTML[kind]}：拖进前面的铁框（点一下也行）`,
      onStart: () => {
        const p = makePiece(kind, HERO.a, HERO.b);
        root.updateMatrixWorld(true);
        p.g.position.copy(root.worldToLocal(stackTop[kind].getWorldPosition(new THREE.Vector3()))).y += 0.004;
        held = p; S.held = p;
        sfx.clink({ freq: 1150, gain: 0.025 });
      },
      onDrag: (q) => { if (held) { held.v++; held.g.position.set(q.x, HOLD, q.z); } },
      onEnd: (moved) => { const p = held; held = null; S.held = null; if (!p) return; if (!moved) putHero(p); else drop(p, p.g.position.x, p.g.position.z); },
    }));

    // ---- 空着的格子：鼠标移上去看它的两条边 ----
    const sideLines = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); m.raycast = () => {}; m.userData.noFrame = true; m.renderOrder = 9; root.add(m); return m; });
    const sideTags = {};
    const sideTag = (name) => {
      if (!sideTags[name]) {
        sideTags[name] = [0, 1].map(() => { const m = labelMesh(name, name === 'a' ? HUE.a : HUE.b, 0.022); m.material = m.material.clone(); m.material.opacity = 0; root.add(m); return m; });
      }
      return sideTags[name];
    };
    let sideT = 0, sideShown = [];
    function showSides(cell) {
      const x = HERO.x + cell.x, z = HERO.z + cell.z, w = cell.w, d = cell.d, t = 0.0028, y = GF + 0.0008;
      const hue = (s) => (s === 'a' ? HUE.a : HUE.b);
      const set = (m, px, pz, sx, sz, col) => { m.position.set(px, y, pz); m.scale.set(sx, 1, sz); m.material.color.set(col); };
      set(sideLines[0], x, z - d / 2 + t / 2, w, t, hue(cell.sides[0])); set(sideLines[1], x, z + d / 2 - t / 2, w, t, hue(cell.sides[0]));
      set(sideLines[2], x - w / 2 + t / 2, z, t, d, hue(cell.sides[1])); set(sideLines[3], x + w / 2 - t / 2, z, t, d, hue(cell.sides[1]));
      for (const m of sideShown) m.material.opacity = 0;
      const top = sideTag(cell.sides[0])[0], side = sideTag(cell.sides[1])[1];
      top.position.set(x, y + 0.0004, z - d / 2 + 0.011); side.position.set(x - w / 2 + 0.014, y + 0.0004, z);
      sideShown = [top, side];
      sideT = 2.4;
    }
    const gapTaps = KEYS.map((k) => {
      const cell = hero.C[k];
      const m = new THREE.Mesh(new THREE.BoxGeometry(cell.w, TYPE_H, cell.d), new THREE.MeshBasicMaterial({ visible: false }));
      m.position.set(HERO.x + cell.x, GF + TYPE_H / 2, HERO.z + cell.z); m.userData.pick = true; m.userData.noFrame = true; root.add(m);
      const say = { a: '<i>a</i>', b: '<i>b</i>' };
      return { obj: m, enabled: () => !hero.set[k] && !S.busy && !S.rolling, hint: () => `这个空：一边 ${say[cell.sides[0]]}，一边 ${say[cell.sides[1]]}`, onTap: () => showSides(cell) };
    });

    // ---- 提起铁框 ----
    const clatter = () => { for (let i = 0; i < 5; i++) setTimeout(() => { if (!dead) sfx.clink({ freq: 480 + Math.random() * 420, gain: 0.045 }); }, i * 48); };
    function lift() {
      if (S.busy || S.rolling) return;
      S.busy = true;
      const res = chases.map((c) => (c.ok = locked(c)));
      const r = (k) => (Math.random() - 0.5) * k;
      for (const c of chases) for (const p of piecesOf(c)) { p.v++; const [w, d] = dimsOf(p.kind, c.spec.a, c.spec.b); p.drop = { tx: r(0.012), tz: r(0.012), rx: r(0.36), rz: r(0.36), ry: r(0.25), half: Math.max(w, d) / 2, jx: r(0.004), jz: r(0.004) }; }
      sfx.whoosh({ dur: 0.5, freq: 280, gain: 0.05 });
      let rang = false;
      // 0–0.55 一起升上去；停到 0.85；没锁住的先晃一下（0.85–0.97），再滑出来往下掉（0.97–1.22），落地弹一下、歪倒；2.3 起铁框放下，字块摆正
      const D = 2.95, T0 = 0.85, T1 = 0.97, T2 = 1.22, DOWN = 2.3;
      const up = (t) => (t < 0.55 ? easeOut(t / 0.55) : t < DOWN ? 1 : 1 - smooth(clamp((t - DOWN) / 0.6, 0, 1)));
      tw.to(D, (k) => {
        const t = k * D, e = up(t);
        for (const c of chases) {
          c.frame.position.y = GF + LIFT * e;
          for (const p of piecesOf(c)) {
            const b = p.base; if (!b) continue;
            if (c.ok || t < T0) { p.g.position.set(b.x, b.y + LIFT * e, b.z); p.g.rotation.set(0, b.ry, 0); continue; }
            let y = b.y, jig = 0;
            if (t < T1) { y = b.y + LIFT; jig = Math.sin(((t - T0) / (T1 - T0)) * Math.PI * 3) * (1 - (t - T0) / (T1 - T0)); }
            else if (t < T2) { const f = (t - T1) / (T2 - T1); y = b.y + LIFT * (1 - f * f); }
            else if (t < T2 + 0.14) y = b.y + Math.sin((Math.PI * (t - T2)) / 0.14) * 0.004;
            const tilt = t < T2 ? 0 : t < T2 + 0.12 ? (t - T2) / 0.12 : t < DOWN ? 1 : 1 - smooth(clamp((t - DOWN) / 0.6, 0, 1));
            const ax = p.drop.rx * tilt, az = p.drop.rz * tilt;
            p.g.position.set(b.x + p.drop.tx * tilt + p.drop.jx * jig, y + p.drop.half * Math.sin(Math.max(Math.abs(ax), Math.abs(az))), b.z + p.drop.tz * tilt + p.drop.jz * jig);
            p.g.rotation.set(ax, b.ry + p.drop.ry * tilt, az);
          }
        }
        if (t > T0 && !rang) { rang = true; if (res.every(Boolean)) sfx.ding(660, { gain: 0.06 }); else setTimeout(() => { if (!dead) clatter(); }, (T2 - T0) * 1000); }
      }, () => {
        for (const c of chases) { c.frame.position.y = GF; for (const p of piecesOf(c)) if (p.base) { p.g.position.set(p.base.x, p.base.y, p.base.z); p.g.rotation.set(0, p.base.ry, 0); } }
        S.busy = false; S.lifted++; S.liftedSince = true; S.last = res; hint();
      });
    }
    const handleTaps = chases.flatMap((c) => [0, 1].map((i) => ({ get obj() { return c.frame.handles[i]; }, enabled: () => !S.busy && !S.rolling, hint: () => '提起铁框：排满了，整版一起起来', onTap: lift })));

    // ---- 墨辊和印 ----
    const yFloor = GF + ROLL.r, yTop = GF + TYPE_H + 0.0012 + ROLL.r, yPaper = 0.0004 + ROLL.r;
    const heroR = HERO.x + 2.5 * U + CHASE.bar, heroL = HERO.x - 2.5 * U;
    const rollY = (x) => {
      const x1 = heroR + ROLL.r + 0.012, x0 = heroR + ROLL.r;
      if (x >= x1) return yFloor;
      if (x >= x0) return yFloor + (yTop - yFloor) * smooth((x1 - x) / (x1 - x0));
      if (x >= -0.15) return yTop;
      if (x >= -0.172) return yPaper + (yTop - yPaper) * smooth((x + 0.172) / 0.022);
      return yPaper;
    };
    const prCanvas = document.createElement('canvas'); prCanvas.width = 1200; prCanvas.height = Math.round((1200 * PR.d) / PR.w);
    const prTex = new THREE.CanvasTexture(prCanvas); prTex.colorSpace = THREE.SRGBColorSpace; prTex.anisotropy = 8;
    const clip = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
    const prMesh = new THREE.Mesh(new THREE.PlaneGeometry(PR.w, PR.d).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: prTex, transparent: true, depthWrite: false, clippingPlanes: [clip], polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    prMesh.position.set(PR.x, 0.0003, PR.z); prMesh.visible = false; prMesh.raycast = () => {}; prMesh.userData.noFrame = true; prMesh.renderOrder = 4;
    root.add(prMesh);
    /** 按前面铁框和手托现在的样子，画出印到活页上的东西 */
    function drawPrint() {
      const g = prCanvas.getContext('2d'), W = prCanvas.width, k = W / PR.w;
      const X = (x) => (x + SHIFT - (PR.x - PR.w / 2)) * k, Z = (z) => (z - (PR.z - PR.d / 2)) * k;
      g.clearRect(0, 0, W, prCanvas.height);
      const block = (p) => {
        const [w0, d0] = dimsOf(p.kind, HERO.a, HERO.b), b = p.base;
        g.save(); g.translate(X(b.x), Z(b.z)); g.rotate(-b.ry);
        const w = (w0 - 0.0016) * k, d = (d0 - 0.0016) * k;
        g.globalAlpha = 0.9; g.fillStyle = KINDS[p.kind].ink; g.fillRect(-w / 2, -d / 2, w, d);
        g.globalAlpha = 0.12; g.fillStyle = '#ffffff'; for (let i = 0; i < 40; i++) g.fillRect(-w / 2 + Math.random() * w, -d / 2 + Math.random() * d, 2 + Math.random() * 14, 1.5);
        g.globalAlpha = 1;
        const s = Math.min(w, d) * 0.62, px = KINDS[p.kind].term[1][1] === 'i' ? s * 0.52 : s * 0.59;
        drawTerm(g, KINDS[p.kind].term, 0, 0, px, '#fbf7ec');
        g.restore();
      };
      for (const key of KEYS) if (hero.set[key]) block(hero.set[key]);
      for (const p of hero.proud) block(p);
      for (const s of sorts) drawTerm(g, s.parts, X(s.x), Z(STICK.z), STICK.h * k * 1.05, s.ink);
      prTex.needsUpdate = true;
    }
    const startPrint = () => { drawPrint(); prMesh.visible = true; S.ink = 'printing'; S.reveal = ROLL.land; S.printed = { ok: locked(hero), gaps: KEYS.filter((k) => live(hero.C[k]) && !hero.set[k]).length, proud: hero.proud.length }; sfx.whoosh({ dur: 0.9, freq: 700, gain: 0.04 }); };
    const finishPrint = () => {
      S.ink = 'printed'; S.reveal = -1;
      hint();
      if (S.printed.ok && chases.every(locked) && !S.done) { S.done = true; sfx.ding(880, { gain: 0.06 }); ui?.unlock?.(); setTimeout(() => { if (!dead) { ui?.go?.(1); ui?.fold?.(false); } }, 1300); }
    };
    const setRoll = (x) => {
      S.rx = x;
      rol.position.set(x, rollY(x), ROLL.z);
      rol.spin.rotation.z = (ROLL.rest - x) / ROLL.r;
      if (x <= heroL && S.ink === 'none') S.ink = 'inked';
      if (x <= ROLL.land && S.ink === 'inked') startPrint();
      if (S.ink === 'printing') { S.reveal = Math.min(S.reveal, x); if (x <= PR.x - PR.w / 2 + 0.008) finishPrint(); }
    };
    setRoll(ROLL.rest);
    const rollDrag = {
      obj: rol.spin.children[0], plane: 'xz', offset: yTop,
      enabled: () => !S.busy,
      hint: () => '往左推墨辊：滚过字版，再滚到活页上',
      onStart: () => { S.rolling = true; S.held = 'roller'; },
      onDrag: (q) => setRoll(clamp(q.x, ROLL.end, ROLL.rest)),
      onEnd: () => {
        S.held = null;
        if (S.ink === 'printing') finishPrint();
        const x0 = S.rx;
        tw.to(0.9, (k) => setRoll(x0 + (ROLL.rest - x0) * smooth(k)), () => { S.rolling = false; S.ink = 'none'; });
      },
    };

    const sizeC = fam[1], B_MAX = 1.5;
    let sizeFrom = null;          // 拖框边从哪儿开始、那时 b 是多少：拖多少改多少，不会一抓就跳
    const resize = (b) => {
      if (Math.abs(b - sizeC.spec.b) < 1e-6) return;
      for (const p of piecesOf(sizeC)) killPiece(p);
      sizeC.set = {}; sizeC.proud = [];
      sizeC.spec.b = b; buildFrame(sizeC);
      syncFamily(0); S.liftedSince = false; S.last = null; hint();
      sfx.clink({ freq: 900 + 160 * b, gain: 0.02 });
    };
    const sizeDrag = {
      get obj() { return sizeC.sizer; }, plane: 'xz', offset: GF + CHASE.h,
      enabled: () => !S.busy && !S.rolling,
      hint: () => '拖框边：把 <i>b</i> 换一个数',
      onStart: (q) => { S.held = 'sizer'; sizeFrom = q ? [q.x, sizeC.spec.b] : null; },
      onDrag: (q) => { if (!sizeFrom) { sizeFrom = [q.x, sizeC.spec.b]; return; } resize(clamp(Math.round((sizeFrom[1] + (2 * (q.x - sizeFrom[0])) / U) * 4) / 4, 0, B_MAX)); },
      onEnd: () => { S.held = null; },
    };
    const pointer = draggable(root, drags, { tip, taps: [...handleTaps, ...gapTaps] });
    drags.push(sizeDrag);
    drags.push(...caseDrags, rollDrag);

    // ---- 取景：只认这个看不见的盒子 ----
    const frameBox = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false }));
    frameBox.raycast = () => {};
    frameBox.scale.set(0.594, 0.075, 0.345); frameBox.position.set(-0.039, 0.037, -0.002);
    root.traverse((o) => { o.userData.noFrame = true; });
    frameBox.userData.noFrame = false; root.add(frameBox);

    // ---- 说明：活页上的铅笔字，和面板上的一行 ----
    const say = (s, html = s) => { note.say(s).at(PAPER.x - PAPER.w / 2 + 0.012 + note.scale.x / 2, 0.043); ui?.status?.(html); };
    function hint() {
      const n = counts(), any = n.a2 + n.ab + n.b2;
      if (S.ink === 'printed' && S.printed) {
        if (S.printed.ok) return say('印出来了：(a+b)²＝a²＋2ab＋b²', '印出来的这一行，就是课本上的<b>完全平方公式</b>：(<i>a</i>＋<i>b</i>)²＝<i>a</i>²＋2<i>ab</i>＋<i>b</i>²。<br>中间的 2<i>ab</i>，就是正方形里那两块长 <i>a</i>、宽 <i>b</i> 的长方形。');
        if (S.printed.gaps) return say(`印出来的正方形缺了 ${S.printed.gaps} 块`, `框里有什么就印出什么：正方形<b>缺了 ${S.printed.gaps} 块</b>，空着的地方印出来是白的。<br>把缺的字块补进铁框，再印一次。`);
        return say('多出来的字块，印到正方形外面去了', '多放的字块搁在别的字上面，印出来叠在一起：<b>多了</b>。<br>把多的拿回字盘，再印一次。');
      }
      if (!any) return say('照你想的排：(a+b)² 用哪几块字？', '课本练习问：(<i>a</i>＋<i>b</i>)²＝<i>a</i>²＋<i>b</i>² 对吗？<br>从右边的<b>字盘</b>里，把你觉得该用的字块拖进前面的铁框（点一下字盘也行）。手托上会排出你的式子。');
      if (!S.liftedSince) return say('排好了，就提起铁框看看', `后面两个铁框大小不一样，也照你的排法排上了${sizeC.spec.b ? '' : '（右后那个 <i>b</i>＝0，框边拖得动，可以换一个 <i>b</i>）'}。<br>点铁框两边的<b>铜把手</b>，提起来：排满了，整版一起起来；没排满，字块会掉下去。`);
      const [h, ...f] = S.last || [];
      if (h && f.every(Boolean)) return say('三版都提起来了。推墨辊，印到活页上', '三个大小的版都排满了，整版提了起来：不管 <i>a</i>、<i>b</i> 多大，都是 <i>a</i>²、<i>ab</i>、<i>ab</i>、<i>b</i>² 四块。<br>把<b>墨辊</b>往左推：滚过字版和手托，再滚到左边的活页上。');
      const gaps = KEYS.filter((k) => live(hero.C[k]) && !hero.set[k]).length, held = f.map((x, i) => (x ? i : -1)).filter((i) => i >= 0);
      const zero = held.some((i) => !fam[i].spec.b);
      if (!h && gaps) return say(`前面这版掉了：框里还空着 ${gaps} 块`, `提起来，前面这一版的字块<b>掉了</b>：框里还空着 ${gaps} 块。${zero ? '后面 <i>b</i>＝0 的那一版倒是提起来了——那里根本没有中间那两块。拖它的框边，把 <i>b</i> 换个数再提一次。' : ''}<br>把鼠标移到空着的地方，看看它的两条边是什么。`);
      if (!h) return say('多放了字块，锁不住', '有字块没地方放，搁在别的字上面，铁框锁不住，提起来就掉。<br>把多的拖回字盘。');
      return say('前面这版提起来了，后面的呢？', '前面这一版排满了。后面不同大小的版，有没有掉下去的？');
    }

    layoutSorts(); for (const t of sorts) t.g.position.set(t.x, GF + 0.0012, STICK.z);
    hint();

    return {
      group,
      card: false,
      panel: 'folded',
      place: 'spread',
      scale: 1,
      size: { w: 0.6, d: 0.345, h: 0.07 },
      view: { elev: 35, azim: -10, lookY: 0.2, frameMargin: 0.97 },
      pointer,
      mount(u) { ui = u; hint(); },
      dispose() { dead = true; tip?.remove?.(); },
      update(dt) {
        tw.update(dt); envTick(); S.clock += dt;
        // 墨辊印到活页上：辊子右边的已经印上了
        root.updateMatrixWorld(true);
        const n = v3.set(1, 0, 0).transformDirection(root.matrixWorld);
        const p = root.localToWorld(new THREE.Vector3(S.ink === 'printing' ? S.reveal : -9, 0, 0));
        clip.setFromNormalAndCoplanarPoint(n, p);
        // 空格的两条边：亮一会儿就淡掉
        sideT = Math.max(0, sideT - dt); for (const m of [...sideLines, ...sideShown]) m.material.opacity = Math.min(1, sideT / 0.5) * 0.95;
        // 不用读字也知道该动哪儿：没排字时字盘里的字轻轻起伏；排好了没提时铜把手轻轻晃；都排满了墨辊轻轻转
        const idle = !S.busy && !S.rolling && S.held == null, ph = (S.clock % 2.6) / 0.9, bump = idle && ph < 1 ? Math.sin(Math.PI * ph) ** 2 : 0;
        const n0 = counts(), none = !(n0.a2 + n0.ab + n0.b2);
        for (const k of ORDER) stackTop[k].position.y = 0.004 + TYPE_H + (none ? 0.003 * bump : 0);
        const wantLift = !none && !S.liftedSince;
        for (const c of chases) for (const o of c.frame.children) if (o.userData.handle) o.rotation.x = wantLift ? -0.35 * bump : 0;
        if (!S.rolling && S.last && S.last.every(Boolean) && S.liftedSince && S.ink !== 'printed') rol.spin.rotation.z = (ROLL.rest - S.rx) / ROLL.r + 0.25 * bump;
      },
      test: { S, hero, fam, chases, U, HERO, ROLL, STICK, lift, setRoll, locked, resize, sizerAt: () => { root.updateMatrixWorld(true); return root.worldToLocal(sizeC.sizer.getWorldPosition(new THREE.Vector3())).toArray(); }, put: (kind) => { const p = makePiece(kind, HERO.a, HERO.b); p.g.position.set(CASE.x, HOLD, CASE.z); putHero(p); return p; }, take: (key) => { const p = hero.set[key]; if (p) toCase(p); }, stackAt: (kind) => { root.updateMatrixWorld(true); return root.worldToLocal(stackTop[kind].getWorldPosition(new THREE.Vector3())).toArray(); }, handleAt: () => { root.updateMatrixWorld(true); return root.worldToLocal(hero.frame.handles[1].getWorldPosition(new THREE.Vector3())).toArray(); } },
    };
  },
};
