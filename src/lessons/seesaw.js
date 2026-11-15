// 数学 七年级上册 2.2.1 有理数的乘法 · “思考”（3×3＝9，3×2＝6，3×1＝3，3×0＝0……）。课本第 38–39 页。
//
// 一件事：负负得正不是规定出来的怪规矩，是“让原来的规律继续成立”的必然结果。
// 课本的办法：3×3＝9，3×2＝6，3×1＝3，3×0＝0，后一乘数每减 1，积就减 3；“要使这个规律在引入负数后仍然成立”，3×(−1)＝−3……
// 再看 (−3)×3＝−9，(−3)×2＝−6，(−3)×1＝−3：后一乘数每减 1，积增加 3，接下去 (−3)×0＝0，(−3)×(−1)＝3。
// 这里把这几列算式摆到纸上：横着 7 条竖线是后一个乘数（−3 … 3），竖着是积；一把尺子钉在 0 上，尺子压着的钉子就是积。
//   1. 尺子在 0 那里是能折的：开始时右半截斜着，压着 3、6、9（每退一格，积少 3）；左半截平躺在 0 线上，负数那边还不知道。
//      学生转动左半截：左边每退一格变多少，跟着它变。只有把尺子掰直（左边也是每格少 3），规律才延续——“咔”地锁住，
//      左边的钉子落在 −3、−6、−9。这一步就是课本那句“要使这个规律在引入负数后仍然成立”。
//   2. 压尺子的右端，前一个乘数从 3 变成 2、1、0、−1、−2、−3：右边的钉子沉到 0 线以下，左边的钉子翘到 0 线以上——负负得正。
// 横、竖一格一样长（不压缩纵轴）：“乘 1”的尺子正好是 45°，以后学正比例函数、一次函数时斜的程度是对得上的。
// 钉子的颜色取自本章的阅读材料“正负术”：正算赤，负算黑。
import * as THREE from 'three';
import { sheet, stroke, text, pin, tweens, clamp, easeOut, PENCIL, SERIF } from './kit/sheet.js';
import { draggable } from './kit/interact.js';
import { sfx } from './kit/audio.js';

const W = 0.355, D = 0.235, U = 0.0108;         // 纸的大小；一格多长
const C0 = [-0.06, 0];                        // 0 在纸上的位置
const HALF = 10.6 * U;                        // 尺子半截的长度（斜到“乘 3”时要够得着第 3 条竖线）
const KMAX = 3;
const RED = 0xd8372c, BLACK = 0x2a2d36, ZERO = 0xcfc7b3;
const fmt = (x) => (x < 0 ? `(−${-x})` : `${x}`);
const num = (x) => (x < 0 ? `−${-x}` : `${x}`);

export default {
  id: 'seesaw',
  fig: '思考',
  title: '有理数的乘法',
  flow: 'explore',
  ask: '3×3＝9，3×2＝6，3×1＝3，3×0＝0……后一个乘数每减 1，积就减 3。<br>数的范围扩大到负数以后，3×(−1) 该等于几？(−3)×(−1) 呢？<br>课本的办法是：<b>让这个规律继续成立</b>。把这几列算式摆到纸上，用一把尺子看看“规律继续成立”是什么样子。',
  need: '把尺子掰直，再把尺子的右端一直压到 −3',
  conclusion: {
    quote: '两数相乘，同号得正，异号得负，且积的绝对值等于乘数的绝对值的积。任何数与0相乘，都得0。',
    why: '课本是这样得到的：3×3＝9，3×2＝6，3×1＝3，3×0＝0，随着后一乘数逐次递减 1，积逐次递减 3。<b>要使这个规律在引入负数后仍然成立</b>，应有 3×(−1)＝−3，3×(−2)＝−6，3×(−3)＝−9。<br>再看 (−3)×3＝−9，(−3)×2＝−6，(−3)×1＝−3：随着后一乘数逐次递减 1，积逐次增加 3。按照这个规律，(−3)×0＝0，(−3)×(−1)＝3，(−3)×(−2)＝6，(−3)×(−3)＝9。<br><br>纸上那把尺子是直的，说的就是“每退一格，变化都一样”。尺子钉在 0 上（任何数乘 0 都得 0）：右边压下去，左边只能翘起来。',
    src: '课本第 38–39 页 · 第二章 2.2.1 有理数的乘法',
  },

  create() {
    const group = new THREE.Group();
    const tw = tweens();
    const P = (n, y) => [C0[0] + n * U, C0[1] + y * U];
    // ---- 纸上印好的：7 条竖线、刻度、0 线 ----
    const paper = sheet({ w: W, d: D, draw: (g, px) => {
      const X = (u) => (u + W / 2) * px, Y = (v) => (D / 2 - v) * px;
      g.lineCap = 'round';
      for (let n = -3; n <= 3; n++) {
        const [u] = P(n, 0);
        g.strokeStyle = 'rgba(60,70,90,0.55)'; g.lineWidth = px * 0.0004; g.beginPath(); g.moveTo(X(u), Y(P(0, 9.5)[1])); g.lineTo(X(u), Y(P(0, -9.5)[1])); g.stroke();
        for (let y = -9; y <= 9; y++) { const big = y % 3 === 0, w = (big ? 0.0019 : 0.001) * px; g.strokeStyle = big ? 'rgba(60,70,90,0.65)' : 'rgba(60,70,90,0.34)'; g.lineWidth = px * (big ? 0.00045 : 0.0003); g.beginPath(); g.moveTo(X(u) - w, Y(P(0, y)[1])); g.lineTo(X(u) + w, Y(P(0, y)[1])); g.stroke(); }
      }
      g.strokeStyle = 'rgba(35,41,58,0.85)'; g.lineWidth = px * 0.00065; g.beginPath(); g.moveTo(X(P(-3.8, 0)[0]), Y(C0[1])); g.lineTo(X(P(3.8, 0)[0]), Y(C0[1])); g.stroke();          // 0 线
      g.fillStyle = '#6a7080'; g.font = `500 ${px * 0.0056}px ${SERIF}`; g.textAlign = 'left'; g.textBaseline = 'middle';
      for (const y of [9, 6, 3, -3, -6, -9]) g.fillText(num(y), X(P(3.55, 0)[0]), Y(P(0, y)[1]));
      g.font = `400 ${px * 0.0058}px "Kaiti SC", "STKaiti", serif`;
      g.fillText('后一个乘数', X(P(4.0, 0)[0]), Y(P(0, -0.95)[1]));
      g.fillText('积', X(P(3.55, 0)[0]), Y(P(0, 10.2)[1]));
    } });
    group.add(paper.group);
    const root = paper.group;
    const S = { k: 3, m: 0, locked: false, held: null, done: false, min: 3 };          // k：右半截（锁住以后是整把尺子）斜在“乘几”；m：左半截斜在乘几
    let ui = null, dead = false;

    // ---- 尺子：钉在 0 上，中间能折。右半截、左半截各是一条透明的塑料尺，正中一条细线，它压着的就是积 ----
    const RW = 0.011;
    const half = (dir) => {
      const g = new THREE.Group(); g.position.set(C0[0], 0.0012, -C0[1]); root.add(g);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(HALF, 0.0011, RW), new THREE.MeshStandardMaterial({ color: 0x8fc8e2, transparent: true, opacity: 0.5, roughness: 0.25, depthWrite: false }));
      strip.position.set((dir * HALF) / 2, 0.0008, 0); strip.renderOrder = 6;
      const hair = stroke({ width: 0.0005, color: '#1d5d7a', y: 0.0016, order: 7 }).set([[0, 0], [dir * HALF, 0]]);
      const rim = stroke({ width: 0.00045, color: '#3b88a8', opacity: 0.85, y: 0.0016, order: 7 }).set([[0, RW / 2], [dir * HALF, RW / 2], [dir * HALF, -RW / 2], [0, -RW / 2]], true);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.0036, 0.0036, 0.0016, 24), new THREE.MeshStandardMaterial({ color: 0xf2a23a, roughness: 0.5 })); grip.position.set(dir * (HALF - 0.0042), 0.0022, 0); grip.castShadow = true;          // 橙色的把手：捏着它转
      const pick = new THREE.Mesh(new THREE.BoxGeometry(HALF * 0.92, 0.003, RW * 2.4), new THREE.MeshBasicMaterial({ visible: false })); pick.userData.pick = true; pick.userData.noFrame = true; pick.position.set(dir * HALF * 0.54, 0.002, 0);
      g.add(strip, hair, rim, grip, pick);
      return { g, grip, pick };
    };
    const rr = half(1), rl = half(-1);
    const pivot = pin({ color: 0xc9a13b, r: 0.0036 }); pivot.position.set(C0[0], 0.0026, -C0[1]); root.add(pivot);

    // ---- 钉子（7 条竖线上各一颗，第 0 条就是钉尺子的那颗）、它旁边的数、一级一级的台阶 ----
    const pegs = [], vals = [], steps = [], stepLab = [];
    for (let n = -3; n <= 3; n++) {
      const g = n === 0 ? null : pin({ color: RED, r: 0.0033 }); if (g) { g.position.y = 0.0024; root.add(g); }
      pegs.push(g);
      vals.push(n === 0 ? null : text(root, '', { h: 0.0082, font: SERIF, weight: 600, y: 0.0032, order: 12 }));
    }
    // 后一个乘数：像数轴那样写在 0 线旁边（钉子在线下面时，数就写到线上面去，免得压住）
    const axis = []; for (let n = -3; n <= 3; n++) axis.push(text(root, num(n), { h: 0.0074, font: SERIF, color: '#3d4456', weight: 500 }));
    for (let i = 0; i < 6; i++) { steps.push(stroke({ width: 0.00045, color: PENCIL, opacity: 0.8, dash: [0.0016, 0.0012], y: 0.0003 })); stepLab.push(text(root, '', { h: 0.0064, font: SERIF, color: '#5b6170', weight: 500 })); }
    root.add(...steps);
    // ---- 右边：课本那一列算式 ----
    const rows = [];
    for (let i = 0; i < 7; i++) rows.push({ l: text(root, '', { h: 0.0112, font: SERIF, weight: 500 }), r: text(root, '', { h: 0.0112, font: SERIF, weight: 600 }) });
    const note = text(root, '', { hand: true, h: 0.0074, color: '#4a5165' });
    const head = text(root, '负数乘负数，为什么得正数？', { h: 0.0082, color: '#2a3550', weight: 600 }); head.at(0.064 + head.scale.x / 2, D / 2 - 0.0135);
    text(root, '钉子：正的红，负的黑', { hand: true, h: 0.0058, color: '#7a7f8c' }).at(0.118, -0.108);

    const setPin = (g, c) => g.traverse((o) => { if (o.isMesh) o.material.color.setHex(c); });
    const chg = (sl) => (Math.abs(sl) < 1e-3 ? '0' : sl > 0 ? `−${sl}` : `+${-sl}`);          // 每退一格，积变多少
    const layout = () => {
      const k = S.k, m = S.locked ? k : S.m, ki = Math.round(k), mi = Math.round(m), whole = Math.abs(k - ki) < 1e-3 && Math.abs(m - mi) < 1e-3;
      rr.g.rotation.y = Math.atan(k); rl.g.rotation.y = Math.atan(m);
      rr.grip.visible = rr.pick.visible = S.locked;
      for (let n = -3; n <= 3; n++) {
        if (n === 0) continue;
        const i = n + 3, sl = n > 0 ? k : m, si = n > 0 ? ki : mi, y = sl * n, p = P(n, y), ok = n > 0 || S.locked;
        pegs[i].position.set(p[0], 0.0024, -p[1]);
        setPin(pegs[i], !ok ? ZERO : Math.abs(y) < 0.02 ? ZERO : y > 0 ? RED : BLACK);
        vals[i].say(whole && (ok || si !== 0) ? num(si * n) : '').at(p[0] + 0.0098 + (si * n < 0 ? 0.0014 : 0), p[1] + 0.0002).ink(!ok ? '#a39c88' : si * n > 0 ? '#c22d24' : si * n < 0 ? '#23293a' : '#7a7566');
      }
      for (let n = -3; n <= 3; n++) { const sl = n > 0 ? k : m, below = n === 0 ? true : sl * n < -0.02, x = n === 0 ? (k < -0.02 || m < -0.02 ? -0.55 : 0.55) : 0.34; axis[n + 3].at(P(n + x, 0)[0], P(0, n !== 0 && below ? 0.95 : -0.95)[1]); }
      // 台阶：每退一格（后一个乘数减 1）积变多少。右边三级跟着右半截，左边三级跟着左半截
      for (let j = 0; j < 6; j++) {
        const n = 3 - j, q = n - 1, sl = j < 3 ? k : m, si = Math.round(sl), on = Math.abs(sl) > 0.02, bad = j >= 3 && !S.locked && Math.abs(m - k) > 1e-3;
        steps[j].set(on ? [P(n, sl * n), P(q, sl * n), P(q, sl * q)] : null).tint(bad ? '#d9822b' : PENCIL);
        stepLab[j].say(whole && Math.abs(si) >= 2 ? chg(si) : '').ink(bad ? '#d9822b' : '#5b6170').at(P(q, 0)[0] - 0.0068, P(0, (sl * (n + q)) / 2)[1]);
      }
      // 算式（照课本的顺序：后一个乘数从 3 到 −3）
      const x0 = 0.064, y0 = 0.083, dy = 0.0152;
      for (let i = 0; i < 7; i++) {
        const n = 3 - i, ok = n >= 0 || S.locked, R = rows[i], pr = ki * n, o = Math.abs(k - ki) < 1e-3 ? 1 : 0.3;
        R.l.say(`${fmt(ki)} × ${fmt(n)} ＝`).at(x0 + R.l.scale.x / 2, y0 - i * dy).fade(o);
        R.r.say(ok ? num(pr) : '？').ink(!ok ? '#a39c88' : pr > 0 ? '#c22d24' : pr < 0 ? '#23293a' : '#7a7566').at(x0 + R.l.scale.x + 0.003 + R.r.scale.x / 2, y0 - i * dy).fade(o);
      }
    };

    // ---- 提示 ----
    const say = (s, html) => { note.say(s).at(0.064 + note.scale.x / 2, -0.024 - note.scale.y / 2); ui?.status(html); };
    const hint = () => {
      const ki = Math.round(S.k), mi = Math.round(S.m);
      if (!S.locked) {
        if (mi === 0) return say('右边：每退一格，积少 3。\n左边是负数，还不知道。\n\n捏住左边橙色的把手，\n转一转左半截尺子', '右半截尺子压着 3、6、9：后一个乘数每减 1，积就减 3。<br>左边是负数，还不知道该是多少。捏住<b>左边橙色的把手</b>，转一转左半截尺子。');
        if (mi !== 3) return say(`左边每退一格是 ${chg(mi)}，\n右边是 −3：\n规律在 0 这里断了。\n\n怎样才能让规律\n延续下去？`, `现在左边每退一格，积是 <b>${chg(mi)}</b>；右边每退一格是 <b>−3</b>。规律在 0 这里断了。<br>怎样放，才能让“每退一格少 3”<b>延续</b>下去？`);
        return say('左边也是每格少 3：\n松手，尺子就锁直了', '左边也是每退一格少 3 了——松手，尺子就锁成一把直尺。');
      }
      if (S.min > 0 && ki === 3) return say('尺子直了，规律延续下去：\n3×(−1)＝−3，\n3×(−2)＝−6，\n3×(−3)＝−9。\n正数乘负数，得负数。\n\n现在把右端往下压', '尺子掰直了，规律延续下去：3×(−1)＝−3，3×(−2)＝−6，3×(−3)＝−9——<b>正数乘负数，得负数</b>。<br>现在捏住<b>右端的把手往下压</b>，让前一个乘数从 3 变小。');
      if (ki > 0) return say(`现在是“${ki} 乘几”。\n继续往下压`, `现在尺子斜在“<b>${ki}</b> 乘几”。继续往下压。`);
      if (ki === 0) return say('0 乘任何数都得 0：\n钉子全在 0 线上。\n\n继续往下压，\n看左边的钉子', '<b>0 乘任何数都得 0</b>：所有钉子都在 0 线上。<br>继续往下压，注意看<b>左边</b>的钉子。');
      return say(`右边沉下去，\n左边就翘起来：\n${fmt(ki)}×(−1)＝${-ki}。\n负数乘负数，得正数`, `右边的钉子沉到 0 线以下（<b>负数乘正数，得负数</b>），尺子是直的，左边的钉子只能翘到 0 线以上：${fmt(ki)}×(−1)＝${-ki}——<b>负数乘负数，得正数</b>。`);
    };
    const check = () => { if (S.locked && S.min <= -3 && !S.done) { S.done = true; ui?.unlock(); setTimeout(() => { if (!dead) { ui?.go?.(1); ui?.fold?.(false); } }, 1400); } hint(); };

    // ---- 拖动 ----
    const uv = (p) => [p.x, -p.z];
    /** 鼠标在尺子的哪一侧（side = 1 右、−1 左），对应斜在“乘几”；整数那几档有一点吸力 */
    const slope = (p, side) => {
      const q = uv(p), dx = (q[0] - C0[0]) * side, dy = (q[1] - C0[1]) * side;
      if (Math.hypot(dx, dy) < 0.012) return null;
      let k = dx <= 1e-4 ? Math.sign(dy || 1) * KMAX : clamp(dy / dx, -KMAX, KMAX);
      const ki = Math.round(k);
      if (Math.abs(k - ki) < 0.11) k = ki;
      return k;
    };
    const bend = {
      obj: rl.pick, plane: 'xz', offset: 0,
      enabled: () => !S.locked,
      hint: () => '转一转左半截尺子',
      onStart: () => { tw.clear(); S.held = 'bend'; },
      onDrag: (p) => { const m = slope(p, -1); if (m == null) return; if (m === Math.round(m) && S.m !== m) sfx.clink({ freq: 1500 + m * 60, gain: 0.04 }); S.m = m; layout(); if (m === Math.round(m)) hint(); },
      onEnd: () => {
        S.held = null; const from = S.m, to = Math.round(from);
        tw.to(0.14, (x) => { S.m = from + (to - from) * easeOut(x); layout(); }, () => { S.m = to; if (to === 3) { S.locked = true; sfx.clink({ freq: 1000, gain: 0.08 }); sfx.ding(700, { gain: 0.04 }); } layout(); check(); });
      },
    };
    const tilt = (h, side) => ({
      obj: h.pick, plane: 'xz', offset: 0,
      enabled: () => S.locked,
      hint: () => '压一压、抬一抬：换一个乘数',
      onStart: () => { tw.clear(); S.held = 'tilt'; },
      onDrag: (p) => { const k = slope(p, side); if (k == null) return; const ki = Math.round(k); if (k === ki && S.k !== k) { sfx.clink({ freq: 1500 + ki * 60, gain: 0.04 }); S.min = Math.min(S.min, ki); } S.k = k; layout(); if (k === ki) hint(); },
      onEnd: () => { S.held = null; const from = S.k, to = Math.round(from); tw.to(0.14, (x) => { S.k = from + (to - from) * easeOut(x); layout(); }, () => { S.k = to; S.min = Math.min(S.min, to); layout(); check(); }); },
    });
    const pointer = draggable(group, [bend, tilt(rr, 1), tilt(rl, -1)], { onClick: (ray) => ray.intersectObject(paper.mesh, false).length > 0 });          // 在纸上没按中东西时不转镜头
    layout(); hint();

    return {
      group,
      card: false,
      panel: 'folded',          // 面板先收成书脊：整张纸是主角，提示写在纸上
      place: 'spread',
      scale: 0.8,
      size: { w: W, d: D, h: 0.02 },
      view: { elev: 76, azim: 0, lookY: 0, frameMargin: 1.09 },          // 几乎从正上方看：横竖一格一样长，才看得出“乘 1”是 45°
      pointer,
      mount(u) { ui = u; hint(); },
      dispose() { dead = true; },
      update(dt) {
        tw.update(dt);
        // 提示：左半截尺子自己轻轻抬一下（每 2.6 秒一次），一看就知道它能转
        if (!S.locked && S.held == null && S.m === 0 && !tw.busy) { S.clock = (S.clock || 0) + dt; const ph = (S.clock % 2.6) / 0.9; rl.g.rotation.y = ph < 1 ? 0.07 * Math.sin(Math.PI * ph) ** 2 : 0; }
      },
      test: { S, C0, U, HALF, P, set: (k, locked = true) => { S.k = k; S.locked = locked; S.min = Math.min(S.min, k); layout(); check(); } },
    };
  },
};
