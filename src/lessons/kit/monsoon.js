// 海陆分布对气压带的影响和东亚季风的教学模型（纯计算，活页 monsoon.js 和核对脚本共用）。课本选必1 第 50–53 页，图 3.14 东亚季风示意、图 3.15 大陆空气柱、活动“理解海陆差异对气压带的影响”。
// 一块理想化的北半球（不是真实地图）：赤道到北纬 60°，西边一块大陆、东边一片大洋。x：0（西）…1（东），lat：纬度（°）。
// 冬季陆地降温比海洋快，陆地上出现冷高压；夏季陆地增温比海洋快，出现热低压；大洋上相反（冬季副极地低压加强、夏季副热带高压加强）。
// 气压、温度都是示意的相对值，只用来比较。land = false：假如这一片全是海洋，气压带呈带状分布、只随季节南北移动。
export const COAST = 0.58, LATMAX = 60, CITY = { x: 0.555, lat: 35, name: '东岸的城市' };          // 海岸线位置、大陆东岸一座城市（北纬 35° 左右，示意）
export const isLand = (x, lat, land = true) => land && x < COAST + 0.025 * Math.sin(lat / 7) && lat > 8;
/** 月份 m（1—12）里陆地、海洋的温度距平（−1 最冷 … +1 最热；海洋变化小、慢一个月） */
export const landT = (m) => -Math.cos((2 * Math.PI * (m - 1)) / 12), seaT = (m) => -0.35 * Math.cos((2 * Math.PI * (m - 2)) / 12);
/** 气压带的季节移动：夏季偏北、冬季偏南（度） */
export const shift = (m) => 5 * landT(m);
const blob = (x, lat, cx, clat, rx, rlat) => Math.exp(-(((x - cx) / rx) ** 2) - ((lat - clat) / rlat) ** 2);
/** 海平面气压（相对值）：带状的气压带 + 海陆热力差异形成的高、低压中心 */
export function pressure(x, lat, m, land = true) {
  const s = shift(m), zonal = -Math.cos((2 * Math.PI * (lat - s)) / 60);          // 赤道低压、副热带高压（30°）、副极地低压（60°）
  if (!land) return zonal;
  const d = landT(m) - seaT(m);          // 陆地比海洋热多少
  return zonal - 4.5 * d * blob(x, lat, 0.32, 42 - 7 * landT(m), 0.36, 18) + 1.5 * d * blob(x, lat, 0.88, 45 - 12 * landT(m), 0.26, 16);          // 大陆上的高、低压中心（冬季偏北、像亚洲高压；夏季偏南、像印度低压，示意）；大洋上冬季加强副极地低压、夏季加强副热带高压
}
/** 近地面的风（东、北分量）：从高压吹向低压，在北半球向右偏（近地面有摩擦，偏约 45°） */
export function wind(x, lat, m, land = true) {
  const e = 0.004, ky = 1 / 100, gx = (pressure(x + e, lat, m, land) - pressure(x - e, lat, m, land)) / (2 * e), gy = (pressure(x, lat + e / ky, m, land) - pressure(x, lat - e / ky, m, land)) / (2 * e);          // x 方向 1 个单位约等于 100 个纬度的距离（示意）
  const a = -gx, b = -gy, th = Math.PI / 4;          // 气压梯度力指向低压
  return [a * Math.cos(th) + b * Math.sin(th), -a * Math.sin(th) + b * Math.cos(th)];
}
const DIRS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
/** 风从哪边吹来（风向） */
export function windName([u, v]) { if (Math.hypot(u, v) < 0.05) return '静风'; const from = (Math.atan2(-u, -v) * 180) / Math.PI; return `${DIRS[Math.round(((from + 360) % 360) / 45) % 8]}风`; }
/** 风从哪个方向来（度，北 0、东 90） */
export const windFrom = ([u, v]) => ((Math.atan2(-u, -v) * 180) / Math.PI + 360) % 360;
/** 城市这个月的天气：风从海上来（夏季风）暖湿多雨；从大陆来（冬季风）干燥寒冷 */
export function cityWeather(m, land = true) {
  const w = wind(CITY.x, CITY.lat, m, land), u = w[0], fromSea = u < 0;          // 风往西吹，就是从东边的海上吹来
  return { w, name: windName(w), fromSea, text: !land ? '风向一年里变化不大' : fromSea ? '风从海上来：暖湿，多雨' : '风从大陆来：干燥寒冷' };
}
export const monthName = (m) => `${m} 月`;
