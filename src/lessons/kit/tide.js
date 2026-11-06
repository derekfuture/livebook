// 潮汐的教学模型（纯计算，活页 tide.js 和核对脚本共用）。课本必修第一册第 59–60 页：一天通常两次涨落；农历初一、十五前后潮汐最明显。
// 用两个最主要的分潮相加（示意）：月亮引起的（周期 12.42 小时）、太阳引起的（周期 12 小时，约为月亮的一半）。两者同相时（新月、满月）叠加成大潮，
// 差半个相位时（上弦、下弦）互相抵消一部分，成了小潮。D：农历第几天（初一 = 0）；h：这一天的几点（地方时）。数值都是示意。
export const SYN = 29.53, M2 = 12.42, S2 = 12, AM = 1.0, AS = 0.46, K = 1.6;
export const hours = (D, h) => D * 24 + h;
/** 港口的水位（米，示意，相对平均海面） */
export function level(D, h) { const T = hours(D, h); return K * (AM * Math.cos((2 * Math.PI * T) / M2) + AS * Math.cos((2 * Math.PI * T) / S2)); }
/** 这一天的最高、最低水位和潮差 */
export function range(D) { let hi = -9, lo = 9; for (let h = 0; h <= 24; h += 0.05) { const v = level(D, h); hi = Math.max(hi, v); lo = Math.min(lo, v); } return { hi, lo, r: hi - lo }; }
/** 这一天出现几次高潮（极大值） */
export function highs(D) { let n = 0, t = []; for (let h = 0; h < 24; h += 0.05) { const a = level(D, h - 0.05), b = level(D, h), c = level(D, h + 0.05); if (b > a && b >= c) { n++; t.push(h); } } return { n, t }; }
export const lunarName = (D) => { const d = Math.round(D) % 30 + 1, n = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十']; return d <= 10 ? n[d - 1] : d < 20 ? `十${'一二三四五六七八九'[d - 11]}` : d === 20 ? '二十' : d < 30 ? `廿${'一二三四五六七八九'[d - 21]}` : '三十'; };
export const phaseName = (D) => { const f = ((D % SYN) + SYN) % SYN / SYN; return f < 0.06 || f > 0.94 ? '新月' : Math.abs(f - 0.25) < 0.06 ? '上弦月' : Math.abs(f - 0.5) < 0.06 ? '满月' : Math.abs(f - 0.75) < 0.06 ? '下弦月' : f < 0.5 ? '月亮渐圆' : '月亮渐缺'; };
