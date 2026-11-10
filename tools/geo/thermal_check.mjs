// 核对热力环流活页的模型：node tools/geo/thermal_check.mjs（必修第一册第 36、38 页；《台海使槎录》：内地之风，早西晚东，惟台地早东风，午西风）
import { makeState, step, field, settled, streamline, seaClock, pressure, seaLandTemp, windName, xOf, N, H, COAST_W, COAST_E } from '../../src/lessons/kit/thermal.js';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
const A = 0, B = -0.12, C = 0.12;
const st = makeState();
for (let i = 0; i < N; i++) st.th[i] = 6 * Math.exp(-((xOf(i) - A) ** 2) / 0.03 ** 2);          // A 地受热
for (let k = 0; k < 12; k++) step(st, 0.05); const early = { pA: pressure(st, A, true), sA: pressure(st, A, false), up: Math.abs(field(st).at(0.06, H * 0.92)[0]), low: Math.abs(field(st).at(0.06, H * 0.08)[0]) };
for (let k = 0; k < 400; k++) { for (let i = 0; i < N; i++) st.th[i] = 6 * Math.exp(-((xOf(i) - A) ** 2) / 0.03 ** 2); step(st, 0.05); }
const F = field(st), zLow = H * 0.08, zHigh = H * 0.92;
ok(F.at(A, H / 2)[1] > 0 && F.at(B, H / 2)[1] < 0 && F.at(C, H / 2)[1] < 0, 'A 地上升，B、C 两地下沉');
ok(pressure(st, A, true) > 0 && pressure(st, B, true) < 0 && pressure(st, C, true) < 0, '上空：A 高压，B、C 低压');
ok(pressure(st, A, false) < 0 && pressure(st, B, false) > 0 && pressure(st, C, false) > 0, '近地面：A 低压，B、C 高压');
ok(F.at(-0.06, zLow)[0] > 0 && F.at(0.06, zLow)[0] < 0, '近地面：风从 B、C 吹向 A');
ok(F.at(-0.06, zHigh)[0] < 0 && F.at(0.06, zHigh)[0] > 0, '上空：空气从 A 流向 B、C');
ok(early.pA / pressure(st, A, true) > Math.abs(early.sA / pressure(st, A, false)), '先是上空聚积成高压，近地面的低压后形成（顺序和课本一致）');
ok(early.up > 1.5 * early.low, `刚受热时：上空向外流（${early.up.toFixed(4)}）先于近地面流回（${early.low.toFixed(4)}）`);
ok(F.at(0.06, H * 0.08)[0] < 0 && Math.abs(Math.abs(F.at(0.06, H * 0.08)[0]) - Math.abs(F.at(0.06, H * 0.92)[0])) < 0.2 * Math.abs(F.at(0.06, H * 0.92)[0]), '稳定以后：上下两层一样强，是一个闭合的环流');
const strait = (h) => { const s = makeState(); for (let k = 0; k < 400; k++) { for (let i = 0; i < N; i++) s.th[i] = seaLandTemp(xOf(i), h); step(s, 0.05); } const f = field(s); return { fj: windName(f.at(COAST_W - 0.012, zLow)[0]), tw: windName(f.at(COAST_E + 0.012, zLow)[0]) }; };
const m = strait(6), a = strait(14);
console.log(`  早上 6 时：福建沿海 ${m.fj}，台湾西岸 ${m.tw}；下午 14 时：福建沿海 ${a.fj}，台湾西岸 ${a.tw}`);
ok(m.fj === '西风' && a.fj === '东风', '内地（福建）之风，早西晚东');
ok(m.tw === '东风' && a.tw === '西风', '惟台地早东风，午西风');
const jump = makeState();
for (let k = 0; k < 400; k++) { for (let i = 0; i < N; i++) jump.th[i] = seaLandTemp(xOf(i), 6); step(jump, 0.05, { tauP: 0.6, tauS: 1.2 }); }
for (let i = 0; i < N; i++) jump.th[i] = seaLandTemp(xOf(i), 14);
step(jump, 0.016, { tauP: 0.6, tauS: 1.2 });
ok(windName(field(jump).at(COAST_W - 0.014, zLow)[0]) === '西风', '6时切14时下一帧仍是西风，当前观察必须保留风场滞后');
for (let k = 0; k < 400; k++) { for (let i = 0; i < N; i++) jump.th[i] = seaLandTemp(xOf(i), 14); step(jump, 0.05, { tauP: 0.6, tauS: 1.2 }); }
ok(windName(field(jump).at(COAST_W - 0.014, zLow)[0]) === '东风', '14时稳定后才转为东风');
ok(settled(jump), '14时稳定状态可完成记录');
for (let k = 0; k < 1200; k++) { for (let i = 0; i < N; i++) jump.th[i] = seaLandTemp(xOf(i), 6); step(jump, 1 / 60, { tauP: 0.6, tauS: 1.2 }); }
for (const hour of [14, 12]) {
  for (let i = 0; i < N; i++) jump.th[i] = seaLandTemp(xOf(i), hour);
  ok(!settled(jump), `跳到${hour}时不能立即作为稳定对照`);
  for (let k = 0; k < 30; k++) { for (let i = 0; i < N; i++) jump.th[i] = seaLandTemp(xOf(i), hour); step(jump, 1 / 60, { tauP: 0.6, tauS: 1.2 }); }
  const f = field(jump);
  for (const x of [-0.08, 0.08]) {
    const line = streamline(jump, x, H * 0.25); let worst = 0;
    for (let k = 0; k < 4; k++) {
      const j = Math.floor((k + 0.5) * line.length / 4); if (!line[j + 1]) continue;
      const [px, z] = line[j], [u, w] = f.at(px, z), dx = line[j + 1][0] - px, dz = line[j + 1][1] - z;
      worst = Math.max(worst, Math.acos(Math.max(-1, Math.min(1, (u * dx + w * dz) / Math.hypot(u, w) / Math.hypot(dx, dz)))) * 180 / Math.PI);
    }
    ok(worst < 10, `${hour}时切换0.5秒，${x}侧箭头与流线夹角 ${worst.toFixed(2)}°`);
  }
}
// 扫描双向切换全过程的每一帧、每一线段，包含审稿的第46帧与第75帧。
for (const [from, to] of [[6, 14], [14, 6]]) {
  const state = makeState();
  const tick = (hour) => { for (let i = 0; i < N; i++) state.th[i] = seaLandTemp(xOf(i), hour); step(state, 1 / 60, { tauP: 0.6, tauS: 1.2 }); };
  for (let j = 0; j < 1200; j++) tick(from);
  let worst = 0, finite = true, continuous = true;
  for (let frame = 1; frame <= 720; frame++) {
    tick(to); const f = field(state);
    for (let i = 1; i < N; i++) {
      const x = xOf(i) - 0.0025, a = f.at(x - 1e-9, H / 4), b = f.at(x + 1e-9, H / 4);
      continuous &&= Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6;
    }
    for (const x of [-0.08, 0.08]) {
      const line = streamline(state, x, H / 4);
      for (let j = 0; j < line.length - 1; j++) {
        const [px, z] = line[j], [u, w] = f.at(px, z), dx = line[j + 1][0] - px, dz = line[j + 1][1] - z;
        const angle = Math.acos(Math.max(-1, Math.min(1, (u * dx + w * dz) / Math.hypot(u, w) / Math.hypot(dx, dz)))) * 180 / Math.PI;
        finite &&= Number.isFinite(angle); worst = Math.max(worst, angle);
      }
    }
  }
  ok(continuous && finite && worst <= 4.01, `${from}→${to}时720帧全线段相切检查，最大夹角${worst.toFixed(3)}°，网格风场连续`);
}
ok(streamline(makeState(), 0, H / 4).length === 1, '静风停滞点终止积分');
for (const preload of [false, true]) {
  const state = makeState(), logs = {}; let hour = 6, held = 0;
  if (preload) for (let k = 0; k < 1200; k++) { for (let i = 0; i < N; i++) state.th[i] = seaLandTemp(xOf(i), 6); step(state, 1 / 60, { tauP: 0.6, tauS: 1.2 }); }
  for (let k = 0; k < 4800; k++) {
    const next = seaClock(hour, 1 / 60, logs); if (next === hour) held++; hour = next;
    for (let i = 0; i < N; i++) state.th[i] = seaLandTemp(xOf(i), hour);
    step(state, 1 / 60, { tauP: 0.6, tauS: 1.2 });
    const slot = hour >= 5 && hour <= 7 ? '早上' : hour >= 13 && hour <= 15 ? '下午' : null;
    if (slot && settled(state)) logs[slot] = [windName(field(state).at(COAST_W - 0.014, zLow)[0]), windName(field(state).at(COAST_E + 0.014, zLow)[0])];
  }
  ok(held > 0 && logs['早上']?.join() === '西风,东风' && logs['下午']?.join() === '东风,西风', `${preload ? '6时先稳定' : '进入立即'}自动播放可完成早晚稳定记录并继续走时`);
}
process.exit(bad ? 1 : 0);
