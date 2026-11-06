// 核对黄河调沙减淤：node tools/geo/basin_check.mjs（选必2 第 61–64 页，图 4.7）
import { loads, bedRise, run } from '../../src/lessons/kit/basin.js';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
const near = (a, b, tol) => Math.abs(a - b) <= tol, ALL = { bio: true, farm: true, eng: true };
const L0 = loads(), L1 = loads(ALL), L2 = loads({ ...ALL, dam: true, flush: true });
ok(near(L0.inflow, 13.33, 0.01) && near(L0.sea, 9.78, 0.05), `不治理、没有水库：进入小浪底一带 ${L0.inflow.toFixed(2)}、入海 ${L0.sea.toFixed(2)} 亿吨（图 4.7，1956—1986 年小浪底站 13.33、利津站 9.78）`);
ok(L0.mid / L0.inflow > 0.85, `按图 4.7 的 1956—1986 年，中游是主要来沙区：约占 ${(L0.mid / L0.inflow * 100).toFixed(0)}%（小浪底站和头道拐站之差，忽略了河段冲淤）`);
ok(near(L1.inflow, 5.46, 0.6) && near(L1.sea / L1.inflow, 3.33 / 5.46, 0.15), `三类水土保持措施都做：进入小浪底一带约 ${L1.inflow.toFixed(2)}、入海约 ${L1.sea.toFixed(2)} 亿吨（量级和图 4.7 的 1987—2005 年 5.46、3.33 相当），下游照样淤三成左右`);
ok(near(L2.out, 0.55, 0.1) && near(L2.sea, 1.02, 0.1), `再加小浪底水库（还没淤满）和调水调沙：下泄约 ${L2.out.toFixed(2)}、入海约 ${L2.sea.toFixed(2)} 亿吨（图 4.7，2006—2016 年小浪底站 0.55、利津站 1.02）`);
ok(L2.sea > L2.out && bedRise(L2.deposit) < 0, '调水调沙以后，入海的沙比水库下泄的还多：下游河床被冲刷，淤沙送进大海');
const no = run({ dam: true, flush: true }, { bed: 7.5 }, 20), yes = run({ ...ALL, dam: true, flush: true }, { bed: 7.5 }, 20);
ok(no.bed > 7.5 + 0.5 && yes.bed < 7.5, `20 年后：只修水库、中游不治理，水库不到 10 年就淤满，下游河床又抬高到 ${no.bed.toFixed(1)} 米；中游治理加水库调沙，河床 ${yes.bed.toFixed(1)} 米，没有再长高`);
const r10a = run({ dam: true }, { bed: 7.5 }, 10).res, r10b = run({ ...ALL, dam: true }, { bed: 7.5 }, 10).res; ok(r10a > r10b * 1.8, `10 年里水库淤进去的沙：中游不治理 ${r10a.toFixed(0)} 亿吨，治理后 ${r10b.toFixed(0)} 亿吨——中游减沙，水库才能用得更久`);
const one = ['bio', 'farm', 'eng'].map((k) => loads({ [k]: true }).inflow); ok(one.every((v) => v < L0.inflow && v > L1.inflow), '每一类措施都减少入黄泥沙，三类结合最有效');
process.exit(bad ? 1 : 0);
