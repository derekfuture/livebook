// 数学 八年级上册 14.2 三角形全等的判定 · 思考 + 图14.2-5（两边和其中一边的对角）。课本第 33–34 页。
//
// 一件事：同样是“两条边、一个角”，角放在哪儿，决定了三角形定不定得下来。
//   · 角是其中一条边的对角（课本的“思考”）：短边绕 A 摆，它的头走的是一道弧；另一条边的方向被角定住了，
//     弧和它交在两处——同样的三样东西搭得出两个不一样的三角形，就是图14.2-5。
//   · 角夹在两条边中间（边角边）：短边的方向也定住了，它的头只有一个位置——只搭得出一个。
//   · 角拿走，只剩两条边：三角形晃来晃去。
// 桌上的三样东西就是条件本身：一根钉住的长纸条 AB、一根能绕 A 摆的短纸条、一个蓝色的角（卡在哪个顶点，就定住那里的两条边的夹角）。
// 第三条边的长度不知道，所以它是一根开了长槽的纸条：短边头上的铆钉可以卡进槽里的任何地方。
// 学生怎么摆、角卡在哪儿都可以；纸条的位置全由几何算出来（一道弧和一条射线的交点），没有预先排好的几种结果。
import * as THREE from 'three';
import { sheet, stroke, piece, text, arcPts, tweens, add, sub, mul, ang, dist, wrap, clamp, easeOut, lerp, PENCIL, CYAN, MAGENTA } from './kit/sheet.js';
import { draggable } from './kit/interact.js';
import { sfx } from './kit/audio.js';

const W = 0.32, D = 0.22;                              // 纸的大小（米）
const AB = 0.125, R = 0.08, BETA = Math.PI / 6;        // 长边、短边、那个角
const B = [-0.112, -0.05];
const A = add(B, [AB * Math.cos(BETA), AB * Math.sin(BETA)]);
const LR = 0.196, SLOT = [0.03, 0.182];                // 第三条边那根纸条的长度；槽的范围（离 B 多远）
const SW = 0.0125, RC = 0.036;                          // 纸条的宽；蓝色的角的半径
const AB_DIR = BETA + Math.PI;                         // 从 A 看 B 的方向
const TH_A = AB_DIR + BETA;                            // 角夹在中间时，短边的方向
const TRAY = [0.108, 0.06], TRAY_A = 1.75;             // 角不用时搁在这儿
const SNAP = 0.04, POP = 0.11;                         // 离交点多近会卡进槽里；拉开多少才脱出来（弧度）
const BLUE = '#2f86d9', BLUE_D = '#174f8e';

const tipAt = (th) => add(A, [R * Math.cos(th), R * Math.sin(th)]);
/** 从 B 出发、方向角 ph 的那条边，和短边的头走的那道弧（圆心 A、半径 R）的交点，离 B 从近到远 */
const hits = (ph, inSlot = true) => {
  const d = [Math.cos(ph), Math.sin(ph)], m = sub(B, A), b = d[0] * m[0] + d[1] * m[1], q = b * b - (m[0] * m[0] + m[1] * m[1] - R * R);
  if (q < 0) return [];
  const s = Math.sqrt(q);
  return [-b - s, -b + s].filter((t) => !inSlot || (t >= SLOT[0] && t <= SLOT[1])).map((t) => { const p = add(B, mul(d, t)); return { p, t, th: ang(sub(p, A)) }; });
};
const SOL = hits(0);                                   // 角卡在 B 时的两个位置：近的（课本图里的 C）、远的（D）
const C_SAS = tipAt(TH_A), PH_SAS = ang(sub(C_SAS, B));

/** 两头圆的纸条：从 (0,0) 到 (L,0)，半宽 r */
const capsule = (L, r, n = 9) => { const out = []; for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (Math.PI * i) / n; out.push([L + r * Math.cos(a), r * Math.sin(a)]); } for (let i = 0; i <= n; i++) { const a = Math.PI / 2 + (Math.PI * i) / n; out.push([r * Math.cos(a), r * Math.sin(a)]); } return out; };
const sector = (r, a0, a1, n = 12) => [[0, 0], ...arcPts([0, 0], r, a0, a1, n)];
const at = (pts, o, a = 0) => pts.map((p) => { const c = Math.cos(a), s = Math.sin(a); return [o[0] + p[0] * c - p[1] * s, o[1] + p[0] * s + p[1] * c]; });

export default {
  id: 'ssa',
  fig: '图14.2-5',
  title: '两条边和一个角',
  flow: 'explore',
  ask: '课本在这里问：两边和它们的夹角分别相等，两个三角形全等；那两边和<b>其中一边的对角</b>分别相等呢？<br>纸上就是这三样东西：两根纸条、一个角。你来搭。',
  need: '用同样的三样东西搭出两个不一样的三角形，再把角换到两条边中间',
  conclusion: {
    quote: '两边和它们的夹角分别相等的两个三角形全等（可以简写成“边角边”或“SAS”）。',
    why: '课本图14.2-5：△<i>ABC</i> 与 △<i>ABD</i> 满足两边和其中一边的对角分别相等，即 <i>AB</i>＝<i>AB</i>，<i>AC</i>＝<i>AD</i>，∠<i>B</i>＝∠<i>B</i>，但它们显然不全等。这说明，<b>两边和其中一边的对角分别相等的两个三角形不一定全等</b>。<br><br>为什么会有两个？短边绕 <i>A</i> 摆，它的头走的是一道弧；∠<i>B</i> 只定住了另一条边的方向，这条边和弧交在两处。<br>为什么角夹在中间就只有一个？这时短边的方向也定住了，它的头只有一个位置，第三条边只能接到那里。课本的说法是：∠<i>A</i>，<i>AB</i>，<i>AC</i> 的大小确定了，△<i>ABC</i> 的形状、大小也就确定了。',
    src: '课本第 33–34 页 · 第十四章 14.2 三角形全等的判定',
  },

  create() {
    const group = new THREE.Group();
    const tw = tweens();
    const paper = sheet({ w: W, d: D });
    group.add(paper.group);
    const root = paper.group;
    // clasp：蓝色的角在哪儿（'B' | 'A' | 'tray' | 'held'）；th：短边的方向；ph：第三条边的方向；eng：短边头上的铆钉卡在槽里没有
    const S = { clasp: 'B', th: -0.12, ph: 0, eng: false, found: [false, false], sas: false, done: false, held: null, busy: false, fAC: 0, fRay: 0, sw: null, cl: { u: B[0], v: B[1], a: 0, lift: 0 }, clock: 0 };
    let ui = null, dead = false;

    // ---- 纸上的铅笔痕迹 ----
    const tri = piece(root, [B, A, SOL[0].p], { color: '#bfe3f2', edge: 'rgba(40,46,60,0)', opacity: 0.5, shadow: false, y: 0.0003, order: 3 });
    // 搭出过的两个三角形留在纸上（近的那个粉、远的那个蓝，叠在一起）：就是课本的图14.2-5
    const triK = [piece(root, [B, A, SOL[0].p], { color: '#f3bcd3', edge: 'rgba(40,46,60,0)', opacity: 0.5, shadow: false, y: 0.00034, order: 4, pivot: B }), piece(root, [B, A, SOL[1].p], { color: '#b7e0f1', edge: 'rgba(40,46,60,0)', opacity: 0.55, shadow: false, y: 0.0003, order: 3, pivot: B })];
    const arc = stroke({ width: 0.00055, color: PENCIL, opacity: 0.85, y: 0.00086, order: 8 });                              // 短边的头走过的弧
    const ghost = [stroke({ width: 0.0011, color: MAGENTA, y: 0.00035 }), stroke({ width: 0.0011, color: CYAN, y: 0.00035 })];          // 搭出过的两个位置：AC（红）、AD（蓝），和课本图里的颜色一样
    ghost[0].set([A, SOL[0].p]); ghost[1].set([A, SOL[1].p]);
    const seat = [0, 1].map(() => stroke({ width: 0.0006, color: BLUE_D, opacity: 0.6, dash: [0.0028, 0.002], y: 0.0019, order: 11 }));              // 角可以卡的两个位置：虚线
    seat[0].set(at(sector(RC, 0, BETA), B), true); seat[1].set(at(sector(RC, 0, BETA), A, AB_DIR), true);
    const rest = stroke({ width: 0.0005, color: PENCIL, opacity: 0.45, dash: [0.0028, 0.002], y: 0.0003 }).set(at(sector(RC, 0, BETA), TRAY, TRAY_A), true);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.0014, 18).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: PENCIL, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    dot.position.set(C_SAS[0], 0.0004, -C_SAS[1]); dot.renderOrder = 4; dot.raycast = () => {}; dot.userData.noFrame = true;
    const mark = SOL.map((h) => stroke({ width: 0.0006, color: PENCIL, y: 0.0009, order: 8 }).set(arcPts(h.p, 0.0019, 0, Math.PI * 2, 18), true));          // 弧和那条边相交的地方
    root.add(arc, ...ghost, ...seat, rest, dot, ...mark);

    // ---- 三根纸条 ----
    const ray = piece(root, at(capsule(LR, SW / 2), B), { color: '#fbf7ec', pivot: B, y: 0.0006, order: 5, spread: 0 });
    ray.group.add(stroke({ width: 0.0036, color: '#b8ad94', y: 0.00012, order: 6 }).set([[SLOT[0], 0], [SLOT[1], 0]]), stroke({ width: 0.0022, color: '#efe7d3', y: 0.00016, order: 7 }).set([[SLOT[0] + 0.0008, 0], [SLOT[1] - 0.0008, 0]]));
    const ab = piece(root, at(capsule(AB, SW / 2), B, BETA), { color: '#f3e6cc', pivot: B, y: 0.001, order: 8, spread: 0 });
    ab.group.add(stroke({ width: 0.001, color: CYAN, y: 0.00012, order: 9 }).set([[0, 0], [AB * Math.cos(BETA), AB * Math.sin(BETA)]]));
    const ac = piece(root, at(capsule(R, SW / 2), A), { color: '#fdeaf1', pivot: A, y: 0.0014, order: 10, spread: 0 });
    ac.group.add(stroke({ width: 0.001, color: MAGENTA, y: 0.00012, order: 11 }).set([[0, 0], [R, 0]]));
    const clasp = piece(root, sector(RC, 0, BETA), { color: BLUE, edge: BLUE_D, pivot: [0, 0], y: 0.002, opacity: 0.88, order: 12 });
    clasp.group.add(stroke({ width: 0.0007, color: '#ffffff', opacity: 0.9, y: 0.00012, order: 13 }).set(arcPts([0, 0], RC * 0.5, 0.06, BETA - 0.06)));
    // 铆钉：钉住的两头（A、B）是黄铜的，短边头上那颗能卡进槽里
    const brass = new THREE.MeshStandardMaterial({ color: 0xc9a54c, roughness: 0.42, metalness: 0.35 }), brassD = new THREE.MeshStandardMaterial({ color: 0x8d6f2a, roughness: 0.55, metalness: 0.3 });
    const rivet = (r = 0.0027) => { const g = new THREE.Group(); const ring = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.32, 10, 28).rotateX(Math.PI / 2), brass), cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r * 0.7, 0.0007, 20), brassD); ring.position.y = 0.0005; cap.position.y = 0.00035; for (const m of [ring, cap]) { m.raycast = () => {}; m.userData.noFrame = true; m.castShadow = true; } g.add(cap, ring); return g; };
    const rvA = rivet(), rvB = rivet(), rvC = rivet(0.0023);
    rvA.position.set(A[0], 0.0024, -A[1]); rvB.position.set(B[0], 0.0024, -B[1]); rvC.position.set(R, 0.0004, 0);
    root.add(rvA, rvB); ac.group.add(rvC);
    // 插在短边头上的铅笔：摆到哪儿，画到哪儿
    const pencil = (() => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0017, 0.0017, 0.024, 6), new THREE.MeshLambertMaterial({ color: 0xf2b632 })); body.position.y = 0.0165;
      const wood = new THREE.Mesh(new THREE.ConeGeometry(0.0017, 0.0045, 6), new THREE.MeshLambertMaterial({ color: 0xe8c9a0 })); wood.rotation.x = Math.PI; wood.position.y = 0.00225;
      const lead = new THREE.Mesh(new THREE.ConeGeometry(0.0006, 0.0016, 6), new THREE.MeshLambertMaterial({ color: 0x33363d })); lead.rotation.x = Math.PI; lead.position.y = 0.0008;
      g.add(body, wood, lead); g.rotation.set(-0.5, 0, 0.12);          // 朝纸的上方斜着：不和哪根纸条连成一条线
      for (const m of g.children) { m.raycast = () => {}; m.userData.noFrame = true; m.castShadow = true; }
      root.add(g); return g;
    })();

    // ---- 字 ----
    const lab = { A: text(root, 'A', { math: true, h: 0.008 }).at(A[0] + 0.004, A[1] + 0.0125), B: text(root, 'B', { math: true, h: 0.008 }).at(B[0] - 0.0125, B[1] + 0.001),
      C: text(root, 'C', { math: true, h: 0.008 }).at(SOL[0].p[0], B[1] - 0.0135), D: text(root, 'D', { math: true, h: 0.008 }).at(SOL[1].p[0], B[1] - 0.0135),
      C2: text(root, 'C', { math: true, h: 0.008 }).at(C_SAS[0] - 0.002, C_SAS[1] - 0.0135) };
    const head = text(root, '两条边、一个角，能把三角形定下来吗？', { h: 0.0082, color: '#2a3550', weight: 600 }); head.at(-W / 2 + 0.022 + head.scale.x / 2, D / 2 - 0.0135);
    const note = text(root, '', { hand: true, h: 0.0066, color: '#4a5165' });

    // ---- 摆放 ----
    const uv = (p) => [p.x, -p.z];
    const claspHome = (where) => (where === 'B' ? { u: B[0], v: B[1], a: S.ph } : where === 'A' ? { u: A[0], v: A[1], a: AB_DIR } : { u: TRAY[0], v: TRAY[1], a: TRAY_A });
    const layout = () => {
      const loose = !S.eng;
      ray.pose({ a: S.ph + S.fRay, lift: S.clasp !== 'B' && loose ? 0.0012 : 0 });
      ac.pose({ a: S.th + S.fAC + (S.nAC || 0), lift: (S.clasp !== 'A' && loose ? 0.0014 : 0) + (S.nAC ? 0.0016 : 0) });
      if (S.clasp === 'B') { S.cl.u = B[0]; S.cl.v = B[1]; S.cl.a = S.ph + S.fRay; }
      clasp.pose({ a: S.cl.a + (S.nCl || 0), du: S.cl.u, dv: S.cl.v, lift: S.cl.lift + (S.nCl ? 0.003 : 0) });
      const tip = tipAt(S.th + S.fAC + (S.nAC || 0));
      pencil.position.set(tip[0], 0.0014, -tip[1]);
      const atB = S.clasp === 'B';
      triK.forEach((t, k) => t.show(S.found[k] && atB));
      tri.show(S.eng && !atB);
      if (S.eng && !atB && (S.triTh !== S.th || S.triAt !== S.clasp)) { S.triTh = S.th; S.triAt = S.clasp; tri.set([B, A, tipAt(S.th)], B).tint(S.clasp === 'A' ? '#9fd6ee' : '#cfe9f4'); }
      ghost.forEach((g, k) => g.show(S.found[k] && S.clasp !== 'A').fade(atB ? 1 : 0.28));
      mark.forEach((m, k) => m.show(S.found[k] && atB));
      lab.C.fade(S.found[0] && S.clasp !== 'A' ? (atB ? 1 : 0.35) : 0); lab.D.fade(S.found[1] && S.clasp !== 'A' ? (atB ? 1 : 0.35) : 0);
      lab.C2.fade(S.clasp === 'A' && S.eng ? 1 : 0);
      seat[0].show(!atB); seat[1].show(S.clasp !== 'A'); rest.show(S.clasp !== 'tray');
      seat[1].fade(0.35 + 0.65 * (S.nSeat || 0));
      dot.visible = S.clasp === 'A';
      arc.fade(S.clasp === 'A' ? 0.3 : 0.85);
    };
    const trace = () => {          // 铅笔画过的那段弧
      if (!S.sw) S.sw = [S.th, S.th];
      S.sw[0] = Math.min(S.sw[0], S.th); S.sw[1] = Math.max(S.sw[1], S.th);
      if (S.sw[1] - S.sw[0] > Math.PI * 2) S.sw[1] = S.sw[0] + Math.PI * 2;
      if (S.sw[1] - S.sw[0] > 0.02) arc.set(arcPts(A, R, S.sw[0], S.sw[1]));
    };
    const click = () => sfx.clink({ freq: 1500, gain: 0.05 }), pop = () => sfx.clink({ freq: 620, gain: 0.035 });
    /** 短边的头是不是正好在第三条边的槽上 */
    const onRay = () => { const rel = sub(tipAt(S.th), B), d = [Math.cos(S.ph), Math.sin(S.ph)], t = rel[0] * d[0] + rel[1] * d[1], off = Math.abs(d[0] * rel[1] - d[1] * rel[0]); return off < 0.0038 && t >= SLOT[0] && t <= SLOT[1]; };

    // 想把短边摆到 want 这个方向
    const moveAC = (want) => {
      if (S.clasp === 'A') { S.fAC = 0.03 * Math.tanh(wrap(want - TH_A) * 3); return; }          // 角卡着它：拽不动，只是微微一弹
      const d = wrap(want - S.th);
      if (S.clasp === 'B') {
        if (S.eng) { if (Math.abs(d) < POP) { S.fAC = d * 0.22; return; } S.eng = false; S.fAC = 0; pop(); }
        S.th += d; trace();
        for (const h of SOL) if (Math.abs(wrap(h.th - S.th)) < SNAP) { S.th += wrap(h.th - S.th); S.eng = true; trace(); click(); break; }
        return;
      }
      // 角拿走了：两条边都松着。卡在槽里时，短边一动，第三条边跟着转
      if (S.eng) { const t = dist(tipAt(S.th + d), B); if (t < SLOT[0] || t > SLOT[1]) return; S.th += d; S.ph = ang(sub(tipAt(S.th), B)); return; }
      S.th += d; if (onRay()) { S.eng = true; S.ph = ang(sub(tipAt(S.th), B)); click(); }
    };
    // 想把第三条边摆到 want 这个方向
    const moveRay = (want) => {
      if (S.clasp === 'B') { S.fRay = 0.02 * Math.tanh(wrap(want) * 3); return; }          // 角卡着它
      const d = wrap(want - S.ph);
      if (S.clasp === 'A') {
        if (S.eng) { if (Math.abs(d) < POP) { S.fRay = d * 0.22; return; } S.eng = false; S.fRay = 0; pop(); }
        S.ph = clamp(S.ph + d, -1.25, 1.35);
        if (Math.abs(wrap(PH_SAS - S.ph)) < SNAP) { S.ph = PH_SAS; S.eng = true; click(); }
        return;
      }
      if (S.eng) {          // 卡在槽里：第三条边一动，短边的头沿着弧跟着走；转到弧够不着的地方就转不动了
        const hs = hits(S.ph + d), tip = tipAt(S.th); if (!hs.length) return;
        const h = hs.reduce((a, b2) => (dist(a.p, tip) < dist(b2.p, tip) ? a : b2));
        S.ph += d; S.th += wrap(h.th - S.th); return;
      }
      S.ph = clamp(S.ph + d, -1.25, 1.35); if (onRay()) { S.eng = true; click(); }
    };
    // 把角卡到 where：它会把那里的两条边带到 30°
    const place = (where) => {
      const from = { ...S.cl }, to0 = claspHome(where);
      S.busy = true; S.clasp = where === 'B' ? 'held' : where;
      const th0 = S.th, ph0 = S.ph, dTh = where === 'A' ? wrap(TH_A - S.th) : 0, dPh = where === 'B' ? wrap(0 - S.ph) : 0;
      const away = where === 'A' && !S.eng && Math.abs(wrap(S.ph - PH_SAS)) < 0.22 ? 0.3 - S.ph : 0;          // 第三条边正好挨着那个位置：让它松开摆到一边，接上这一步留给学生
      tw.to(0.34, (k) => {
        const e = easeOut(k);
        if (where === 'A') { S.th = th0 + dTh * e; if (away) S.ph = ph0 + away * e; if (S.eng) { const t = dist(tipAt(S.th), B); if (t < SLOT[0] || t > SLOT[1]) S.eng = false; else S.ph = ang(sub(tipAt(S.th), B)); } }
        if (where === 'B') { S.ph = ph0 + dPh * e; if (S.eng) { const hs = hits(S.ph), tip = tipAt(S.th); if (!hs.length) S.eng = false; else { const h = hs.reduce((a, b2) => (dist(a.p, tip) < dist(b2.p, tip) ? a : b2)); S.th += wrap(h.th - S.th); } } }
        const to = where === 'B' ? { ...to0, a: S.ph } : to0;
        S.cl.u = lerp(from.u, to.u, e); S.cl.v = lerp(from.v, to.v, e); S.cl.a = from.a + wrap(to.a - from.a) * e; S.cl.lift = 0.004 * (1 - e);
        layout();
      }, () => {
        S.clasp = where; S.busy = false; S.cl.lift = 0;
        if (where === 'A') S.th = TH_A; if (where === 'B') { S.ph = 0; if (S.eng) { const h = SOL.reduce((a, b2) => (Math.abs(wrap(a.th - S.th)) < Math.abs(wrap(b2.th - S.th)) ? a : b2)); S.th += wrap(h.th - S.th); trace(); } }
        if (!S.eng && where !== 'tray' && onRay()) S.eng = true;
        if (where !== 'tray') click();
        layout(); check();
      });
    };

    // ---- 提示 ----
    const say = (s, html = s) => { note.say(s).at(-W / 2 + 0.024 + note.scale.x / 2, -D / 2 + 0.013); ui?.status(html); };
    const hint = () => {
      const one = S.found[0] || S.found[1], both = S.found[0] && S.found[1];
      if (S.clasp === 'A') {
        if (S.eng) return both ? say('这回只搭得出一个，哪儿也拽不动：两边和它们的夹角，把三角形定下来了', '角夹在两条边中间，<b>只搭得出这一个</b>，哪儿也拽不动。<br>短边的方向被角定住了，它的头只有一个位置（纸上那个铅笔点），第三条边只能接到那里。这就是“边角边”。')
          : say('只搭得出这一个，哪儿也拽不动。把蓝色的角放回 B，数数那样能搭出几个', '角夹在两条边中间，只搭得出这一个，哪儿也拽不动。<br>把<b>蓝色的角</b>放回 <i>B</i>，数数那样能搭出几个。');
        return say('角夹在两条边中间了，短边的方向也定住了。把下面那条边摆过来接上', '角夹在 <i>AB</i> 和短边中间了：短边的方向也定住了，它的头只有一个位置。<br>把<b>下面那条边</b>摆过来，接到那里。');
      }
      if (S.clasp !== 'B') return say(S.eng ? '角拿走了，只剩两条边：三角形晃来晃去，定不下来' : '角拿走了，两条边都松着。把角卡回 A 或 B 试试', S.eng ? '角拿走了，只剩两条边：拖一拖，三角形<b>晃来晃去</b>，定不下来。<br>把蓝色的角卡到 <i>A</i> 或 <i>B</i> 上。' : '角拿走了，两条边都松着。把蓝色的角卡到 <i>A</i> 或 <i>B</i> 上试试。');
      if (!one) return say('两根纸条、一个角。把短的那根摆下来，让它的头搭到下面那条边上', '纸上三样东西：钉住的长边 <i>AB</i>、能绕 <i>A</i> 摆的短边、卡在 <i>B</i> 的蓝色的角（它定住了下面那条边的方向）。<br>把<b>短边</b>摆下来，让它的头搭到下面那条边上。');
      if (!both) return say(S.eng ? '搭成了一个三角形。同样这三样，还能搭出别的吗？把短边拉开，接着摆' : '接着摆，看它的头还能不能搭上', S.eng ? '搭成了一个三角形。<br>同样这三样东西，还能搭出<b>别的</b>三角形吗？把短边拉开，接着摆。' : '接着摆，看短边的头还能不能再搭到那条边上。');
      return say('两个三角形：两条边、∠B 都一样，却不全等。这就是课本的图14.2-5。把蓝色的角换到两条边中间试试', '铅笔画的那道弧，和下面那条边交在<b>两处</b>：△<i>ABC</i> 和 △<i>ABD</i> 的两条边、∠<i>B</i> 都一样，却不全等。这就是课本的图14.2-5。<br>把<b>蓝色的角</b>从 <i>B</i> 取下来，卡到 <i>A</i>——两条边的中间，再试试。');
    };
    const check = () => {
      if (S.clasp === 'B' && S.eng) { const k = Math.abs(wrap(SOL[0].th - S.th)) < Math.abs(wrap(SOL[1].th - S.th)) ? 0 : 1; if (!S.found[k]) { S.found[k] = true; sfx.ding(S.found[1 - k] ? 784 : 660, { gain: 0.05 }); } }
      if (S.clasp === 'A' && S.eng && !S.sas) { S.sas = true; sfx.ding(880, { gain: 0.05 }); }
      if (S.found[0] && S.found[1] && S.sas && !S.done) { S.done = true; ui?.unlock(); setTimeout(() => { if (!dead) { ui?.go?.(1); ui?.fold?.(false); } }, 1800); }
      layout(); hint();
    };

    // ---- 拖动 ----
    const free = () => !S.busy;
    const dragAC = {
      obj: ac.fill, plane: 'xz', offset: 0.0014, enabled: free,
      hint: () => (S.clasp === 'A' ? '角卡着它：拽不动' : '拖一拖：绕 A 摆'),
      onStart: (p) => { S.held = 'ac'; S.grab = wrap(ang(sub(uv(p), A)) - S.th); },
      onDrag: (p) => { const was = S.eng; moveAC(ang(sub(uv(p), A)) - S.grab); layout(); if (S.eng !== was) check(); },
      onEnd: () => { S.held = null; check(); },
    };
    const dragRay = {
      obj: ray.fill, plane: 'xz', offset: 0.0006, enabled: free,
      hint: () => (S.clasp === 'B' ? '角卡着它：拽不动' : '拖一拖：绕 B 摆'),
      onStart: (p) => { S.held = 'ray'; S.grab = wrap(ang(sub(uv(p), B)) - S.ph); },
      onDrag: (p) => { const was = S.eng; moveRay(ang(sub(uv(p), B)) - S.grab); layout(); if (S.eng !== was) check(); },
      onEnd: () => { S.held = null; check(); },
    };
    // 角的尖靠近那个顶点，或者手正在那块虚线的位置上，都算放到了那里
    const over = (J, a) => dist([S.cl.u, S.cl.v], J) < 0.034 || (S.cur && dist(S.cur, add(J, [RC * 0.6 * Math.cos(a + BETA / 2), RC * 0.6 * Math.sin(a + BETA / 2)])) < 0.026);
    const dragClasp = {
      obj: clasp.fill, plane: 'xz', offset: 0.002, enabled: free,
      hint: () => '拖一拖：把角换个地方卡',
      onStart: (p) => { S.held = 'clasp'; S.clasp = 'held'; S.off = sub([S.cl.u, S.cl.v], uv(p)); S.cur = null; S.cl.lift = 0.004; layout(); hint(); },
      onDrag: (p) => {
        const q = add(uv(p), S.off); S.cl.u = q[0]; S.cl.v = q[1]; S.cur = uv(p);
        const near = over(A, AB_DIR) ? AB_DIR : over(B, S.ph) ? S.ph : null;          // 靠近能卡的地方，先转成那里的朝向
        if (near != null) S.cl.a += wrap(near - S.cl.a) * 0.35;
        layout();
      },
      onEnd: () => { S.held = null; place(over(A, AB_DIR) ? 'A' : over(B, S.ph) ? 'B' : 'tray'); },
    };
    const pointer = draggable(group, [dragClasp, dragAC, dragRay], { onClick: (ray2) => ray2.intersectObject(paper.mesh, false).length > 0 });          // 在纸上没按中东西时不转镜头

    layout(); hint();

    return {
      group,
      card: false,
      panel: 'folded',          // 面板先收成书脊：整张纸是主角，提示写在纸上
      place: 'spread',
      scale: 0.8,
      size: { w: W, d: D, h: 0.02 },
      view: { elev: 78, azim: 0, lookY: 0, frameMargin: 1.09 },          // 几乎从正上方看：斜着看，角度就不像了
      pointer,
      mount(u) { ui = u; hint(); },
      dispose() { dead = true; },
      update(dt) {
        tw.update(dt);
        // 松手以后，被拽歪的一点点弹回去
        const k = Math.exp(-dt * 16);
        if (S.held !== 'ac') S.fAC *= k; if (S.held !== 'ray') S.fRay *= k;
        // 提示：该动的那样东西自己轻轻动一下
        const idle = S.held == null && !S.busy && !tw.busy;
        S.clock = idle ? S.clock + dt : 0;
        const ph = (S.clock % 3) / 0.9, n = idle && S.clock > 1.2 && ph < 1 ? Math.sin(Math.PI * ph) ** 2 : 0;
        const both = S.found[0] && S.found[1];
        S.nAC = S.clasp === 'B' && !both ? (S.eng ? 0 : -0.07 * n) : 0;
        S.nCl = S.clasp === 'B' && both && !S.sas ? 0.1 * n : 0;
        S.nSeat = S.clasp !== 'A' && both && !S.sas ? n : 0;
        if (idle && S.clasp === 'B' && S.eng && !both) S.fAC = (S.found[0] ? 1 : -1) * 0.045 * n;          // 搭成一个以后：短边朝另一个位置的方向轻轻挣一下
        if (S.clasp === 'A' && !S.eng && idle) S.fRay = Math.sign(wrap(PH_SAS - S.ph) || 1) * 0.05 * n;
        layout();
      },
      test: { S, A, B, SOL, C_SAS, PH_SAS, TH_A, TRAY, R, AB, tipAt, hits, place, check },
    };
  },
};
