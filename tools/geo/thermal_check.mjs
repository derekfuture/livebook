// 核对热力环流活页的模型：node tools/geo/thermal_check.mjs（必修第一册第 36、38 页；《台海使槎录》：内地之风，早西晚东，惟台地早东风，午西风）
import { makeState, step, field, pressure, seaLandTemp, windName, xOf, N, H, COAST_W, COAST_E } from '../../src/lessons/kit/thermal.js';
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
process.exit(bad ? 1 : 0);
