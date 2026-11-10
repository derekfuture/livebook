// 潮汐的教学模型（纯计算，活页 tide.js 和核对脚本共用）。课本必修第一册第 59–60 页：一天通常两次涨落；农历初一、十五前后潮汐最明显。
// 用两个最主要的分潮相加（示意）：月亮引起的（周期 12.42 小时）、太阳引起的（周期 12 小时，约为月亮的一半）。两者同相时（新月、满月）叠加成大潮，
// 差半个相位时（上弦、下弦）互相抵消一部分，成了小潮。D：农历第几天（初一 = 0）；h：这一天的几点（地方时）。数值都是示意。
export const SYN = 29.53, M2 = 1 / (1 / 12 - 2 / (29.53 * 24)), S2 = 12, AM = 1.0, AS = 0.46, K = 1.6;
export const hours = (D, h) => D * 24 + h;
/** 港口的水位（米，示意，相对平均海面） */
export function level(D, h) { return surface(D, h, angles(D, h).port); }
/** 同一日月合成式用于小盘各方位和港口潮位；小盘径向比例仅为示意。 */
// 太阳也影响隆起位置，依据：https://oceanservice.noaa.gov/education/tutorial_tides/tides03_gravity.html
export function surface(D, h, theta) { return K * (AM * Math.cos(2 * (theta - angles(D, h).moon)) + AS * Math.cos(2 * theta)); }
export function bulgeRadius(D, h, theta) { return 0.012 + 0.001 * surface(D, h, theta); }
/** 解析导数单位为米/小时；绝对变化率不足0.01时标记极值附近（显示阈值，示意）。 */
export function tideTrend(D, h) {
  const T = hours(D, h), wm = 2 * Math.PI / M2, ws = 2 * Math.PI / S2, rate = -K * (AM * wm * Math.sin(wm * T) + AS * ws * Math.sin(ws * T));
  const near = Math.abs(rate) < 0.01, curvature = -K * (AM * wm * wm * Math.cos(wm * T) + AS * ws * ws * Math.cos(ws * T));
  return { rate, rising: !near && rate > 0, label: near ? (curvature < 0 ? '高潮附近' : '低潮附近') : rate > 0 ? '↑涨' : '↓落' };
}
/** 这一天的最高、最低水位和潮差 */
export function range(D) { let hi = -9, lo = 9; for (let h = 0; h <= 24; h += 0.05) { const v = level(D, h); hi = Math.max(hi, v); lo = Math.min(lo, v); } return { hi, lo, r: hi - lo }; }
/** 这一天出现几次高潮（极大值） */
export function highs(D) { let n = 0, t = []; for (let h = 0; h < 24; h += 0.05) { const a = level(D, h - 0.05), b = level(D, h), c = level(D, h + 0.05); if (b > a && b >= c) { n++; t.push(h); } } return { n, t }; }
export const lunarName = (D) => { const d = Math.round(D) % 30 + 1, n = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十']; return d <= 10 ? n[d - 1] : d < 20 ? `十${'一二三四五六七八九'[d - 11]}` : d === 20 ? '二十' : d < 30 ? `廿${'一二三四五六七八九'[d - 21]}` : '三十'; };
/** 从地球上看到的月相（D 从初一 0 时算起的天数）。新月、上弦、满月、下弦是某一时刻的相位，这里按整日吸附，不一定正好在那一刻，所以前后约半天写“……前后”；中间写蛾眉月、盈凸月、亏凸月、残月
 * （NASA：https://science.nasa.gov/moon/moon-phases/；美国海军天文台月相定义：https://aa.usno.navy.mil/faq/moon_phases） */
export const phaseName = (D) => { const f = ((D % SYN) + SYN) % SYN / SYN, T = 0.02; return f < T || f > 1 - T ? '新月前后' : Math.abs(f - 0.25) < T ? '上弦前后' : Math.abs(f - 0.5) < T ? '满月前后' : Math.abs(f - 0.75) < T ? '下弦前后' : f < 0.25 ? '蛾眉月' : f < 0.5 ? '盈凸月' : f < 0.75 ? '亏凸月' : '残月'; };

// 同一连续时间驱动太阳参考系中的港口、月球和分潮。太阴日约 24 小时 50 分。
// 依据：https://oceanservice.noaa.gov/education/tutorial_tides/tides05_lunarday.html
export function angles(D, h) { const T = hours(D, h); return { moon: Math.PI + 2 * Math.PI * T / (SYN * 24), port: 2 * Math.PI * T / 24 }; }
export const MSL = 0.03, KY = 0.004, SHIP_DRAFT = 0.015, HULL_BOTTOM = -0.002;
export const shore = (x) => x < -0.06 ? 0.05 : x < 0.08 ? 0.05 - (x + 0.06) / 0.14 * 0.04 : 0.01 - (x - 0.08) * 0.08;
export const SHIP_BED = shore(0.11 - 0.017);          // 水平船底覆盖范围内最高的海床，避免船头穿入斜坡
export function shipState(v) { const water = MSL + v * KY, bottom = Math.max(water - SHIP_DRAFT, SHIP_BED); return { afloat: water - SHIP_BED > SHIP_DRAFT, y: bottom - HULL_BOTTOM, bottom }; }
export const intertidal = { hi: -0.06 + (0.05 - MSL - KY * K * (AM + AS)) * 3.5, lo: -0.06 + (0.05 - MSL + KY * K * (AM + AS)) * 3.5 };
export const playHour = (h, dt) => Math.min(24, h + dt * 2);
/** 任意微小日期变化都作废当前活动判断；远日期保留旧曲线仅供对照。 */
export function setDate(state, D) { const previous = state.D; state.D = Math.max(0, Math.min(29, Math.round(D))); if (D !== previous) state.pick = null; if (Math.abs(state.D - previous) > 3) state.cmp = previous; }

/** 日期吸附整数；显示分钟统一进位，24时表示当天终点。 */
export const timeText = (h) => { const m = Math.round(h * 60); return `${Math.floor(m / 60)} 时 ${String(m % 60).padStart(2, '0')} 分`; };
export const NET_WIDTH = 0.011, NET_TILT = Math.atan(0.04 / 0.14);
export function netRow(r) { const x = 0.01 + r * 0.012, y = shore(x) + 0.005, half = NET_WIDTH / 2 * Math.sin(NET_TILT); return { x, y, lo: y - half, hi: y + half }; }
export function netState(r, water) { const { lo, hi } = netRow(r); return water <= lo ? '全部出露' : water >= hi ? '全部浸水' : '部分浸水'; }
/** 低潮取局部极小值；前后半小时为本页练习的示意窗口，并非现实赶海安全建议。 */
export function lows(D) { const t = []; for (let h = -0.5; h <= 24.5; h += 0.01) if (level(D, h) < level(D, h - 0.01) && level(D, h) <= level(D, h + 0.01)) t.push(h); return t; }
const lowCache = new Map();
export function nearLow(D, h) { if (!lowCache.has(D)) lowCache.set(D, lows(D)); return lowCache.get(D).some((t) => Math.abs(t - h) <= 0.5); }
