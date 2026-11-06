// 核对潮汐：node tools/geo/tide_check.mjs（必修第一册第 59 页）
import { range, highs, lunarName } from '../../src/lessons/kit/tide.js';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
for (const D of [0, 7, 14.8, 22]) { const n = highs(D).n; ok(n >= 1 && n <= 2, `${lunarName(D)}：一天里 ${n} 次高潮（通常两次）`); }
const r0 = range(0).r, r15 = range(14.8).r, r7 = range(7.4).r, r22 = range(22.1).r;
ok(r0 > r7 * 1.6 && r15 > r22 * 1.6, `初一（${r0.toFixed(1)} 米）、十五（${r15.toFixed(1)} 米）的潮差远大于上弦（${r7.toFixed(1)}）、下弦（${r22.toFixed(1)}）：初一、十五前后潮汐最明显`);
ok(lunarName(0) === '初一' && lunarName(14) === '十五', '农历日子的名字');
process.exit(bad ? 1 : 0);
