// 核对喀斯特地貌：node tools/geo/karst_check.mjs（必修1 第 66–68 页，图 4.2、图 4.4）
import { STAGES, stageName, RATE, STEP, cave } from '../../src/lessons/kit/karst.js';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
ok(STAGES.map((s) => s[0]).join('→') === '溶沟→洼地→峰丛→峰林→孤峰→残丘', '演变顺序：溶沟 → 洼地 → 峰丛 → 峰林 → 孤峰 → 残丘（图 4.2）');
ok(STAGES.every((s, i) => !i || s[1] > STAGES[i - 1][1]), '一步步往后，不会倒回去');
const seq = []; for (let t = 0; t <= 1; t += 0.01) { const n = stageName(t); if (n && seq[seq.length - 1] !== n) seq.push(n); } ok(seq.length === 6, '发育程度从 0 到 1，六个阶段都会经过');
ok(RATE.granite.wet === 0, '花岗岩不是可溶性岩石：不形成喀斯特地貌');
ok(RATE.limestone.wet > 4 * RATE.limestone.dry, '同样是石灰岩，湿润地区比干旱地区发育得快得多');
const n = (r) => { let t = 0, k = 0; while (t < 0.9 && k < 200) { t += STEP * r; k++; } return k; }; ok(n(RATE.limestone.wet) < n(RATE.limestone.dry), `湿润地区的石灰岩 ${n(RATE.limestone.wet)} 步发育到残丘，干旱地区要 ${n(RATE.limestone.dry)} 步`);
ok(!cave(0.5).column && cave(0.8).column && cave(0.5).drip > 0, '溶洞里先长石钟乳、石笋，连起来才是石柱');
process.exit(bad ? 1 : 0);
