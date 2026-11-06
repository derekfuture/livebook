// 核对黄河调沙减淤：node tools/geo/basin_check.mjs（选必2 第 61–64 页，图 4.7）
import { loads, bedRise } from '../../src/lessons/kit/basin.js';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const L0 = loads(), L1 = loads({ bio: true, farm: true, eng: true }), L2 = loads({ bio: true, farm: true, eng: true, dam: true, flush: true });
ok(near(L0.inflow, 13.33, 0.01) && near(L0.sea, 9.78, 0.05), `不治理、没有小浪底水库：小浪底一带 ${L0.inflow.toFixed(2)}、入海 ${L0.sea.toFixed(2)} 亿吨（图 4.7，1956—1986 年：13.33、9.78）`);
ok(L0.mid / L0.inflow > 0.85, `中游黄土高原是主要侵蚀区：来沙约占 ${(L0.mid / L0.inflow * 100).toFixed(0)}%`);
ok(near(L1.inflow, 5.46, 0.6), `三类水土保持措施都做：进入小浪底一带约 ${L1.inflow.toFixed(2)} 亿吨（图 4.7，1987—2005 年：5.46，量级相当）`);
ok(near(L2.out, 0.55, 0.1) && near(L2.sea, 1.02, 0.1), `再加小浪底水库和调水调沙：小浪底下泄约 ${L2.out.toFixed(2)}、入海约 ${L2.sea.toFixed(2)} 亿吨（图 4.7，2006—2016 年：0.55、1.02）`);
ok(L2.sea > L2.out, '调水调沙以后，入海的沙比小浪底下泄的还多：下游河床被冲刷，淤沙送进大海');
ok(bedRise(L0.deposit) > 0.05 && bedRise(L2.deposit) < 0, `不治理：下游河床一年抬高约 ${(bedRise(L0.deposit) * 100).toFixed(0)} 厘米；治理加调水调沙：河床不再抬高（“地上河”没有再长高）`);
const one = ['bio', 'farm', 'eng'].map((k) => loads({ [k]: true }).inflow); ok(one.every((v) => v < L0.inflow && v > L1.inflow), '每一类措施都减少入黄泥沙，三类结合最有效');
process.exit(bad ? 1 : 0);
