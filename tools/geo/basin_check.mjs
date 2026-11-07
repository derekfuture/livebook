// 核对黄河调沙减淤：node tools/geo/basin_check.mjs（选必2 第 61–64 页，图 4.5、图 4.7）
import { STATIONS, ERAS, EVENTS, eraOf, loadAt, bedAt, bedCounter, leveeAt, delta } from '../../src/lessons/kit/basin.js';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
const T47 = { 头道拐: [1.41, 0.39, 0.49], 龙门: [9.14, 4.33, 1.04], 小浪底: [13.33, 5.46, 0.55], 利津: [9.78, 3.33, 1.02] };
ok(STATIONS.every((st, i) => ERAS.every((e, k) => e.load[i] === T47[st][k])), '四个站、三个时段的年均输沙量和课本图 4.7 一字不差');
ok(ERAS.map((e) => e.span).join() === '1956—1986 年,1987—2005 年,2006—2016 年', '三个时段和图 4.7 一样');
ok(eraOf(1986).key === 'pre' && eraOf(1987).key === 'soil' && eraOf(2016).key === 'flush' && loadAt(1990, '小浪底') === 5.46, '年份落在哪个时段、取哪个时段的值');
ok(bedAt(1986) > 7 && bedAt(1960) < bedAt(1986), '治理前河床一路淤高，到 1986 年前后高出两岸 7 米以上（图 4.5）');
ok((bedAt(2001) - bedAt(1987)) / 14 < (bedAt(1986) - bedAt(1956)) / 30, '水土保持以后，河床还在长高，但慢多了');
ok(bedAt(2015) <= bedAt(2009) && bedAt(2016) > 0, `2009—2015 年“地上河”没有再长高（课本：${EVENTS.scoured} 亿吨淤沙入海），河床仍高出两岸`);
ok(bedCounter(2016) > bedAt(2016) + 1, '对照：假如一直不治理，河床会比现在高得多');
ok(leveeAt(1986) > leveeAt(1956) && leveeAt(1990) - bedAt(1990) > 3, '大堤跟着一次次加高，始终比河床高');
ok(loadAt(2010, '利津') > loadAt(2010, '小浪底'), '调水调沙时段入海的沙比小浪底站还多：下游河床被冲刷');
const d76 = delta(1976), d86 = delta(1986), d16 = delta(2016), d05 = delta(2005);
ok(d76.old > delta(1956).old && d76.new === 0, '1976 年以前，泥沙从老河口入海，老河口一带往海里长');
ok(d86.old < d76.old && d16.old < d86.old, '1976 年改道以后，老河口不再有泥沙补给，海岸后退');
ok(d86.new - delta(1977).new > (d05.new - d86.new) * (10 / 19) && d16.new - d05.new < 0.02, '新河口：治理前长得快，水土保持以后慢了，调水调沙时段几乎不再往外长（示意）');
process.exit(bad ? 1 : 0);
