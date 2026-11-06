// 洋流的教学模型（纯计算，活页 current.js 和核对脚本共用）。课本选必1 第 68–71 页，图 4.11 全球风带和世界洋流模式。
// 一个理想化的大洋（不是真实地图）：西边一块大陆、东边一块大陆，中间是海，南纬 45° 以南四周没有陆地（像南极大陆外围）。
// 洋流用流函数 ψ 描述：u（向东）= −∂ψ/∂y，v（向北）= ∂ψ/∂x；大洋西边的洋流窄而快（西部强化，示意）。land = false：假如没有大陆挡着，海水只随风带东西向流。
export const XW = -0.12, XE = 0.12, NB = 0.12, LATMAX = 70;          // 大洋的东西两岸（模型坐标），南北边界对应南北纬 70°
export const latOf = (n) => (n / NB) * LATMAX, nOf = (lat) => (lat / LATMAX) * NB;
export const SOUTH_OPEN = -45;          // 这以南没有陆地
export const isLand = (x, n, land = true) => land && latOf(n) > SOUTH_OPEN && (x < XW || x > XE);
const g = (u) => Math.max(0, 1 - u - Math.exp(-u / 0.1) + Math.exp(-1 / 0.1) * u);          // 西边陡、东边缓（西部强化）
// 四个环流：[南边纬度, 北边纬度, 方向]：+1 顺时针（北半球中低纬）、−1 逆时针
export const GYRES = [[0, 45, 1, '北半球中低纬度海区的大洋环流（顺时针）'], [45, 68, -1, '北半球中高纬度海区的大洋环流（逆时针）'], [-45, 0, -1, '南半球中低纬度海区的大洋环流（逆时针）']];          // 赤道两侧是向西的南、北赤道暖流（赤道逆流太小，本模型省略）
export function psi(x, n, land = true) {
  const lat = latOf(n);
  if (!land || lat <= SOUTH_OPEN) return 0;
  if (x < XW || x > XE) return 0;
  const u = (x - XW) / (XE - XW);
  for (const [a, b, s] of GYRES) if (lat >= a && lat <= b) return s * 0.01 * g(u) * Math.sin((Math.PI * (lat - a)) / (b - a));
  return 0;
}
/** 没有陆地挡着的地方：海水只随风带东西向流（信风带向西、西风带向东、极地东风带向西），连续变化 */
export const zonalU = (lat) => -0.35 * Math.sin((6 * Math.abs(lat) * Math.PI) / 180);
export function vel(x, n, land = true) {
  if (isLand(x, n, land)) return [0, 0];
  if (!land || latOf(n) <= SOUTH_OPEN) return [zonalU(latOf(n)), 0];          // 南纬 45°—60° 是向东的西风漂流，再往南是向西的极地东风流
  const e = 0.0015, dpx = (psi(x + e, n, land) - psi(x - e, n, land)) / (2 * e), dpy = (psi(x, n + e, land) - psi(x, n - e, land)) / (2 * e);
  return [-dpy, dpx];
}
/** 暖流还是寒流：从水温高的海域流向水温低的海域（往高纬流）是暖流，反过来是寒流 */
export function kindOf(x, n, land = true) {
  const [u, v] = vel(x, n, land), lat = latOf(n), sp = Math.hypot(u, v); if (sp < 0.02) return null;
  const side = (x - XW) / (XE - XW), boundary = land && lat > SOUTH_OPEN && (side < 0.25 || side > 0.8);
  if (boundary && Math.abs(v) > 0.5 * Math.abs(u)) return v * Math.sign(lat) > 0 ? '暖流' : '寒流';          // 沿岸南北流的：往高纬流是暖流，往低纬流是寒流
  if (Math.abs(lat) < 15) return '暖流';          // 赤道两侧向西的赤道暖流
  if (land && lat > 30 && lat < 50 && u > 0) return '暖流';          // 北半球向东的（像北大西洋暖流、北太平洋暖流）
  if (lat < -40) return '寒流';          // 西风漂流
  return null;
}
/** 沿岸某地最冷月的气温（示意，℃）：随纬度降低，再加上沿岸洋流的影响 */
export function coastTemp(lat, side, land = true) {
  const base = 25 - 0.0105 * lat * lat, x = side === 'west' ? XW + 0.006 : XE - 0.006, k = kindOf(x, nOf(lat), land);
  return base + (k === '暖流' ? 9 : k === '寒流' ? -9 : 0);
}
