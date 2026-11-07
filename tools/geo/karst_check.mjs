import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
// 核对喀斯特地貌：node tools/geo/karst_check.mjs（必修1 第 66–68 页，图 4.2、图 4.4）
import { STAGES, stageName, RATE, STEP, cave, terrainHeight, joint } from '../../src/lessons/kit/karst.js';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
ok(STAGES.map((s) => s[0]).join('→') === '溶沟→洼地→峰丛→峰林→孤峰→残丘', '演变顺序：溶沟 → 洼地 → 峰丛 → 峰林 → 孤峰 → 残丘（图 4.2）');
ok(STAGES.every((s, i) => !i || s[1] > STAGES[i - 1][1]), '一步步往后，不会倒回去');
const seq = []; for (let t = 0; t <= 1; t += 0.01) { const n = stageName(t); if (n && seq[seq.length - 1] !== n) seq.push(n); } ok(seq.length === 6, '发育程度从 0 到 1，六个阶段都会经过');
ok(RATE.granite.wet === 0, '花岗岩不是可溶性岩石：不形成喀斯特地貌');
ok(RATE.limestone.wet > 4 * RATE.limestone.dry, '同样是石灰岩，湿润地区比干旱地区发育得快得多');
const n = (r) => { let t = 0, k = 0; while (t < 0.9 && k < 200) { t += STEP * r; k++; } return k; }; ok(n(RATE.limestone.wet) < n(RATE.limestone.dry), `湿润地区的石灰岩 ${n(RATE.limestone.wet)} 步发育到残丘，干旱地区要 ${n(RATE.limestone.dry)} 步`);
ok(!cave(0.5).column && cave(0.8).column && cave(0.5).drip > 0, '溶洞里先长石钟乳、石笋，连起来才是石柱');
const source = readFileSync(new URL('../../src/lessons/karst.js', import.meta.url), 'utf8');
const BW = 0.11, H0 = 0.09, mkRnd = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const peaksOf = runInNewContext(source.slice(source.indexOf('    const peaksOf ='), source.indexOf('    const height =')) + '; peaksOf', { BW, BD: BW, mkRnd });
let unchanged = true, monotone = true, minHeight = Infinity, maxRise = 0;
for (const [rock, clim, seed] of [['limestone', 'wet', 17], ['limestone', 'dry', 48], ['granite', 'wet', 79]]) {
  const b = { rock, clim }, peaks = peaksOf(seed);
  for (let ix = 0; ix <= 70; ix++) for (let iz = 0; iz <= 70; iz++) {
    const x = -BW / 2 + BW * ix / 70, z = -BW / 2 + BW * iz / 70; let prev = H0;
    for (let step = 0; step <= 1000; step++) {
      const t = step / 1000, value = terrainHeight(b, peaks, x, z, t, H0);
      maxRise = Math.max(maxRise, value - prev); minHeight = Math.min(minHeight, value); monotone &&= value <= prev + 1e-12;
      if (rock === 'granite') unchanged &&= value === H0; prev = value;
    }
  }
}
ok(unchanged, '花岗岩全网格、全部发育程度保持初始高度');
ok(monotone && minHeight >= 0.03, `三块地形全网格、1001 个发育程度：岩面不回升且不穿透底面，最大回升 ${maxRise}`);
const peaks = peaksOf(17), x = -0.055 + 0.11 * 29 / 70, z = -0.055 + 0.11 * 48 / 70;
const h25 = terrainHeight({ rock: 'limestone' }, peaks, x, z, 2.5 * STEP), h4 = terrainHeight({ rock: 'limestone' }, peaks, x, z, 4 * STEP);
ok(h4 <= h25, `审稿点：2.5 段 ${h25.toFixed(6)} → 4 段 ${h4.toFixed(6)}，不再长回去`);
ok(['峰林等（图4.2）', '孤峰（图4.3）', '溶洞（图4.4）'].every((t) => readFileSync(new URL('../../src/lessons/karst.js', import.meta.url), 'utf8').includes(t)), '本轮文字复核：概念或引文图号准确');
// 峰丛：峰体基部相连；峰林：一座座分开的峰（相邻峰之间的连线最低处落到洼地基面附近）
{ const P = peaksOf(17), sm2 = (a, b, x) => { const q = Math.min(1, Math.max(0, (x - a) / (b - a))); return q * q * (3 - 2 * q); }, baseAt = (t) => H0 - 0.05 * sm2(0.14, 0.62, t) - 0.008 * sm2(0.75, 1, t);
  const linked = (t) => { const live = P.filter((p) => !(p.r < 0.82 * sm2(0.62, 0.92, t))); let pairs = 0, conn = 0; for (let a = 0; a < live.length; a++) for (let b = a + 1; b < live.length; b++) { const A = live[a], B = live[b]; if (Math.hypot(A.x - B.x, A.z - B.z) > 0.045) continue; pairs++; let mn = 1; for (let s2 = 0; s2 <= 40; s2++) { const u = s2 / 40, x2 = A.x + (B.x - A.x) * u, z2 = A.z + (B.z - A.z) * u; mn = Math.min(mn, terrainHeight({ rock: 'limestone' }, P, x2, z2, t, H0) + 0.01 * joint(x2, z2) * sm2(0, 0.16, t) - baseAt(t)); } if (mn > 0.004) conn++; } return [conn, pairs]; };
  const fc = STAGES.find((s2) => s2[0] === '峰丛')[1] + 0.04, fl = STAGES.find((s2) => s2[0] === '峰林')[1] + 0.02, [c1, p1] = linked(fc), [c2, p2] = linked(fl);
  ok(c1 > p1 * 0.8, `峰丛（t=${fc.toFixed(2)}）：相邻峰 ${c1}/${p1} 对基部相连`); ok(c2 === 0, `峰林（t=${fl.toFixed(2)} 起）：相邻峰 ${c2}/${p2} 对相连，一座座分开`); }
process.exit(bad ? 1 : 0);
