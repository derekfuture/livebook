// 核对黄河调沙减淤：node tools/geo/basin_check.mjs（选必2 第 61–64 页，图 4.5、图 4.7）
import { STATIONS, ERAS, EVENTS, MOUTHS, eraOf, loadAt, mouthAt, flushYear, bedRel, soilRel, delta } from '../../src/lessons/kit/basin.js';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
const T47 = { 头道拐: [1.41, 0.39, 0.49], 龙门: [9.14, 4.33, 1.04], 小浪底: [13.33, 5.46, 0.55], 利津: [9.78, 3.33, 1.02] };
ok(STATIONS.every((st, i) => ERAS.every((e, k) => e.load[i] === T47[st][k])), '四个站、三个时段的年均输沙量和课本图 4.7 一字不差');
ok(ERAS.map((e) => e.span).join() === '1956—1986 年,1987—2005 年,2006—2016 年' && ERAS.every((e) => !('name' in e)), '三个时段只是统计时段，不当成治理阶段的名字');
ok(eraOf(1986).key === 'a' && eraOf(1987).key === 'b' && eraOf(2016).key === 'c' && loadAt(1990, '小浪底') === 5.46, '年份落在哪个时段、取哪个时段的值');
ok(T47.头道拐[2] > T47.头道拐[1], '头道拐站第三时段比第二时段略有回升（解释文字不能说“一路下降”）');
ok(EVENTS.damFill === 1999 && EVENTS.firstFlush === 2002 && EVENTS.scourFrom === 2009 && EVENTS.scourTo === 2015 && EVENTS.scoured === 9.66, '小浪底 1999 年蓄水、2002 年首次调水调沙；课本 2009—2015 年 9.66 亿吨');
ok(flushYear(2002) && flushYear(2015) && !flushYear(2016) && !flushYear(2001), '调水调沙只在 2002—2015 年可以按；2016 年没有进行');
ok(MOUTHS.map((m) => `${m.name}${m.from}`).join() === '神仙沟1953,刁口河1964,清水沟1976,清 8 汊1996' && mouthAt(1970).name === '刁口河' && mouthAt(2000).name === '清 8 汊', '入海流路：1964 刁口河、1976 清水沟、1996 清 8 汊');
ok(bedRel(1990) > bedRel(1960) && bedRel(2015) <= bedRel(2009) && bedRel(2016) > 0, '河床（示意）：先淤高；2009—2015 年“地上河”没有再长高；始终高出两岸');
ok(soilRel(1956) > 0 && soilRel(2010) > soilRel(1980), '水土保持 50 年代就开始，范围逐步扩大');
const L76 = delta(1976), L96 = delta(1996), L16 = delta(2016), L05 = delta(2005);
ok(L96.dkh < L76.dkh && L16.dkh < L96.dkh, '刁口河 1976 年以后失去主流水沙补给，岸段后退');
ok(L16.q8 > L05.q8 && L16.q8 - L05.q8 < L05.q8 - delta(1996).q8, '正在走水的河口仍在淤长，但入海泥沙少了，长得慢了（不再用“几乎不长”的阈值）');
process.exit(bad ? 1 : 0);
