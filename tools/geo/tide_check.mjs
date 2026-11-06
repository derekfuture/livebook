// 核对潮汐：node tools/geo/tide_check.mjs（必修第一册第 59 页）
import { surface, bulgeRadius, tideTrend, S2, NET_WIDTH, timeText, netRow, netState, lows, nearLow, range, highs, lunarName, angles, level, M2, K, AM, AS, MSL, KY, shipState, SHIP_BED, HULL_BOTTOM, SHIP_DRAFT, shore, intertidal, playHour, setDate } from '../../src/lessons/kit/tide.js';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
for (const D of [0, 7, 14.8, 22]) { const n = highs(D).n; ok(n >= 1 && n <= 2, `${lunarName(D)}：一天里 ${n} 次高潮（通常两次）`); }
const r0 = range(0).r, r15 = range(14.8).r, r7 = range(7.4).r, r22 = range(22.1).r;
ok(r0 > r7 * 1.6 && r15 > r22 * 1.6, `初一（${r0.toFixed(1)} 米）、十五（${r15.toFixed(1)} 米）的潮差远大于上弦（${r7.toFixed(1)}）、下弦（${r22.toFixed(1)}）：初一、十五前后潮汐最明显`);
ok(lunarName(0) === '初一' && lunarName(14) === '十五', '农历日子的名字');
for (const D of [0, 7, 18, 29]) for (const h of [0, 6, 12, 23.999, 24]) {
  const a = angles(D, h), expected = K * (AM * Math.cos(2 * (a.port - a.moon)) + AS * Math.cos(2 * a.port));
  ok(Math.abs(expected - level(D, h)) < 1e-10, `${D}日${h}时：月球、港口角度和分潮使用同一时间`);
  const v = level(D, h), boat = shipState(v); ok(boat.bottom >= SHIP_BED && Math.abs(boat.y + HULL_BOTTOM - boat.bottom) < 1e-12 && boat.afloat === (MSL + v * KY - SHIP_BED > SHIP_DRAFT), '船底不穿床，位置和吃水判定一致');
}
ok(Math.abs(M2 * 2 - 24.84) < 0.02 && angles(0, 6).moon !== angles(0, 0).moon, '太阴日约24时50分，一天内月球也公转');
ok(playHour(23.999, 0.05) === 24 && playHour(24, 1) === 24 && Math.abs(level(18, 24) - level(18, 23.999)) < 0.002, '18日午夜连续到24时并停止，不倒回0时');
ok(Math.abs(shore(intertidal.hi) - (MSL + KY * K * (AM + AS))) < 1e-12 && Math.abs(shore(intertidal.lo) - (MSL - KY * K * (AM + AS))) < 1e-12, '潮间带边界为模型最高最低潮位与地形交点');
const selected = { D: 0, pick: { ok: true } }; setDate(selected, 0.001); ok(selected.pick === null, '慢拖仅0.001天立即清除旧活动判断');
for (let d = 0.01; d < 18; d += 0.01) setDate(selected, d); ok(selected.pick === null && selected.D > 17.9, '多次微移累计到另一日期，不残留旧判断');

const snapped = [7.6, 8, 8.4].map((D) => { const s = { D: 0, h: 6 }; setDate(s, D); return s; });
ok(snapped.every((s) => s.D === 8 && s.h === 6 && level(s.D, s.h) === level(8, 6) && angles(s.D, s.h).port === angles(8, 6).port), '7.6/8/8.4拖动统一吸附初九6时，潮位与红点一致');
for (const D of [0, 7, 14, 22, 29]) { const ts = lows(D).filter((h) => h >= 0 && h <= 24); ok(ts.length > 0 && ts.every((h) => nearLow(D, h) && nearLow(D, h + 0.4) && !nearLow(D, h + 0.6)), `${D}日：所有低潮及半小时窗口接受，窗口外拒绝`); }
ok(lows(7).some((h) => level(7, h) > -1.4 && nearLow(7, h)), '初八最低潮高于−1.4米也属于低潮');
for (let r = 0; r < 4; r++) { const row = netRow(r); ok(netState(r, MSL - KY * K * (AM + AS)) === '全部出露' && netState(r, MSL + KY * K * (AM + AS)) === '全部浸水' && netState(r, row.y) === '部分浸水' && row.lo > shore(row.x - NET_WIDTH / 2), `第${r + 1}排：低潮全干、高潮全湿、中间部分浸水`); }
ok(timeText(6.999) === '7 时 00 分' && timeText(23.999) === '24 时 00 分' && timeText(6.5) === '6 时 30 分', '分钟进位且保留分钟，午夜为当天24时');
// 第三轮：小盘与时间分潮独立复算，覆盖初五及整月的各方位。
let consistent = true, derivative = true;
for (let D = 0; D < 30; D++) for (const h of [0, 6, 12.25, 18, 24]) {
  const T = D * 24 + h, expected = K * (AM * Math.cos(2 * Math.PI * T / M2) + AS * Math.cos(2 * Math.PI * T / S2));
  consistent &&= Math.abs(level(D, h) - expected) < 1e-10;
  derivative &&= Math.abs(tideTrend(D, h).rate - (level(D, h + 1e-4) - level(D, h - 1e-4)) / 2e-4) < 1e-7;
  for (let theta = 0; theta < 2 * Math.PI; theta += Math.PI / 48) consistent &&= Math.abs((bulgeRadius(D, h, theta) - 0.012) / 0.001 - surface(D, h, theta)) < 1e-10;
}
ok(consistent, '整月小盘各方位与合成式一致，港口与独立时间分潮一致');
ok(derivative, '整月解析变化率与微小中心差分一致');
const moon5 = angles(4, 0).moon, axis5 = Math.atan2(AM * Math.sin(2 * moon5), AM * Math.cos(2 * moon5) + AS) / 2;
const offset = Math.abs(Math.atan(Math.tan(axis5 - moon5))) * 180 / Math.PI;
ok(Math.abs(offset - 12.94) < 0.02 && bulgeRadius(4, 0, axis5) > bulgeRadius(4, 0, moon5), '初五0时合成主轴偏离月球约12.94度，主轴半径大于朝月半径');
ok(tideTrend(0, 12.25).rising && tideTrend(0, 12.25).label === '↑涨' && !tideTrend(0, 12.35).rising, '初一12时15分仍上涨，峰后才转为落潮');
ok(tideTrend(0, 0).label === '高潮附近' && lows(7).every((h) => tideTrend(7, h).label === '低潮附近'), '高潮和低潮极值附近明确显示，不标为涨落');
const low8 = 12 + 11 / 60, depth8 = (MSL + level(7, low8) * KY - SHIP_BED) / KY;
ok(nearLow(7, low8) && Math.abs(depth8 - 4.394) < 0.002 && shipState(level(7, low8)).afloat && SHIP_DRAFT / KY === 3.75, '初八12时11分低潮：水深约4.394米大于吃水3.75米，仍浮起');
process.exit(bad ? 1 : 0);
