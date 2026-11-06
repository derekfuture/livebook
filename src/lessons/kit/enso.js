// 厄尔尼诺、拉尼娜的教学模型（纯计算，活页 enso.js 和核对脚本共用）。课本选必1 第 74–75 页，图 4.17、4.18。
// 沿着赤道的一个东西向剖面：x 从西太平洋（−1）到东太平洋（+1）。a：表层海水的状态，−1 拉尼娜、0 正常、+1 厄尔尼诺（示意）。
// 数值（℃）都是示意，只用来比较；变化方向按课本：厄尔尼诺时中东部海温异常升高、东西温差减小；拉尼娜相反、温差增大。
export const sst = (x, a) => { const normal = 29 - 3.5 * (x + 1) ** 1.3, warm = a > 0 ? a * 4.2 * Math.max(0, (x + 0.3) / 1.3) : a * 2.2 * Math.max(0, (x + 0.3) / 1.3); return normal + warm; };
export const west = (a) => sst(-0.9, a), east = (a) => sst(0.9, a), diff = (a) => west(a) - east(a);
/** 上升气流在哪（x）：正常在西边；厄尔尼诺时东移；拉尼娜时更偏西 */
export const riseX = (a) => -0.7 + 1.35 * Math.max(0, a) + 0.12 * Math.min(0, a);
/** 下沉气流在哪：正常、拉尼娜在东边；厄尔尼诺时上升移到中东部，下沉移到西边 */
export const sinkX = (a) => (a > 0.5 ? -0.8 : Math.min(0.92, riseX(a) + 1.35));
/** 上升那里的雨有多大（0–1，示意）：东西温差越大，环流越强 */
export const rainAmt = (a) => (a < -0.5 ? 1 : a > 0.5 ? 0.85 : 0.65);
/** 东、西两岸的天气 */
export function weather(a) {
  return {
    west: a > 0.5 ? { t: '上升气流减弱，干燥少雨：旱灾、森林大火', rain: false } : { t: '上升气流，温润多雨', rain: true },
    east: a > 0.5 ? { t: '下沉气流减弱、甚至上升：多雨，洪涝', rain: true } : { t: a < -0.5 ? '下沉气流更强，更干燥' : '下沉气流，干燥少雨', rain: false },
  };
}
/** 秘鲁沿岸上涌的冷水有多强（0–1）：上涌带来营养物质、鱼多 */
export const upwell = (a) => Math.max(0, Math.min(1, 0.6 - 0.6 * a));
export const stateName = (a) => (a > 0.5 ? '厄尔尼诺' : a < -0.5 ? '拉尼娜' : '正常年份');
