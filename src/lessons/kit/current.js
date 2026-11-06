// 洋流的教学模型（纯计算，活页 current.js 和核对脚本共用）。课本选必1 第 68–71 页，图 4.11 全球风带和世界洋流模式。
// 一个理想化的大洋（不是真实地图）：西边一块大陆、东边一块大陆，中间是海，南纬 45° 以南四周没有陆地（像南极大陆外围）。
// 洋流用流函数 ψ 描述：u（向东）= −∂ψ/∂y，v（向北）= ∂ψ/∂x；大洋西边的洋流窄而快（西部强化，示意）。land = false：本模型仅保留东西向流动的理想情境，不代表真实无大陆海洋。
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
/** 理想情境仅保留东西向分量（信风带向西、西风带向东、极地东风带向西），连续变化 */
export const zonalU = (lat) => -0.35 * Math.sin((6 * Math.abs(lat) * Math.PI) / 180);
export function vel(x, n, land = true) {
  if (isLand(x, n, land)) return [0, 0];
  if (!land || latOf(n) <= SOUTH_OPEN) return [zonalU(latOf(n)), 0];          // 南纬 45°—60° 是向东的西风漂流，再往南是向西的极地东风流
  const lat = latOf(n), u = (x - XW) / (XE - XW);
  for (const [a, b, sign] of GYRES) if (lat >= a && lat <= b) {
    const phase = Math.PI * (lat - a) / (b - a), dg = -1 + 10 * Math.exp(-u / 0.1) + Math.exp(-10);
    return [-sign * 0.01 * g(u) * Math.cos(phase) * Math.PI * LATMAX / (NB * (b - a)), sign * 0.01 * dg / (XE - XW) * Math.sin(phase)];
  }
  return [0, 0];
}
/** 寒暖流按相对于流经海区周围海水的温度定义；下面按典型位置和方向配色，仅限本示意模型 */
export function kindOf(x, n, land = true) {
  const [u, v] = vel(x, n, land), lat = latOf(n), sp = Math.hypot(u, v); if (sp < 0.02) return null;
  const side = (x - XW) / (XE - XW), boundary = land && lat > SOUTH_OPEN && (side < 0.25 || side > 0.8);
  if (boundary && Math.abs(v) > 0.5 * Math.abs(u)) return v * Math.sign(lat) > 0 ? '暖流' : '寒流';          // 沿岸南北流的：往高纬流是暖流，往低纬流是寒流
  if (Math.abs(lat) < 15) return '暖流';          // 赤道两侧向西的赤道暖流
  if (land && lat > 30 && lat < 50 && u > 0) return '暖流';          // 北半球向东的（像北大西洋暖流、北太平洋暖流）
  if (lat < -40) return '寒流';          // 西风漂流
  return null;
}
/** 洋流对沿岸的定性影响，不能反推出独立贡献多少摄氏度。 */
export function coastEffect(lat, side, land = true) { if (!land) return null; const k = kindOf(side === 'west' ? XW + 0.006 : XE - 0.006, nOf(lat), land); return k === '暖流' ? '偏暖' : k === '寒流' ? '偏冷' : '未标定'; }
// 风场、地转偏向力、压力梯度和边界共同影响真实洋流；此处是预设稳态流函数。
// 依据：https://www.noaa.gov/education/resource-collections/ocean-coasts/ocean-currents
const STEP = 1 / 600;
const rk4 = (x, n, dt, land) => {
  const a = vel(x, n, land), b = vel(x + a[0] * dt / 2, n + a[1] * dt / 2, land), c = vel(x + b[0] * dt / 2, n + b[1] * dt / 2, land), d = vel(x + c[0] * dt, n + c[1] * dt, land);
  return [x + dt * (a[0] + 2 * b[0] + 2 * c[0] + d[0]) / 6, n + dt * (a[1] + 2 * b[1] + 2 * c[1] + d[1]) / 6];
};
function step(o, dt, land, depth = 0) {
  const [x, n] = rk4(o.x, o.n, dt, land), closed = land && latOf(o.n) > SOUTH_OPEN;
  const error = closed ? Math.abs(psi(x, n) - psi(o.x, o.n)) : 0;
  if (closed && (isLand(x, n) || error > 1e-10)) { if (depth < 16) { step(o, dt / 2, land, depth + 1); step(o, dt / 2, land, depth + 1); } return; }
  o.x = x; o.n = n;
  if (!closed) o.x = ((o.x + 0.167) % 0.334 + 0.334) % 0.334 - 0.167;
}
/** 固定模型时间步加 RK4，按流函数误差细分；鸭子和水粒共用边界，不模拟搁浅。 */
export function advance(o, dt, wind = 1, land = true) {
  o.rest = (o.rest || 0) + dt * 2.2 * wind;
  while (o.rest + 1e-12 >= STEP) { step(o, STEP, land); o.rest -= STEP; }
}

/** 精确积分线性起停风，截断到0或1后按恒值积分；与显示帧率无关。 */
export function windStep(w, blow, dt) { const target = blow ? 1 : 0, ramp = Math.min(dt, Math.abs(target - w) * 3), end = w + (blow ? 1 : -1) * ramp / 3; return { w: end, integral: (w + end) * ramp / 2 + target * (dt - ramp) }; }
/** 自动记录投放瞬间完整速度（模型坐标/秒，含时间倍率与风速）；静止没有流向。 */
export function driftInfo(x, n, land = true, wind = 1) {
  const [u, v] = vel(x, n, land).map((v) => v * 2.2 * wind), eps = 1e-8, lat = latOf(n), dir = (Math.abs(v) > eps ? (v > 0 ? '北' : '南') : '') + (Math.abs(u) > eps ? (u > 0 ? '东' : '西') : '');
  return { x, n, wind, u, v, lat, motion: dir ? `先向${dir.length === 2 ? dir[1] + dir[0] : dir}漂移` : u === 0 && v === 0 ? '投放时静止（模型速度为0）' : '投放时近乎静止（模型速度极小）', target: Math.abs(x) < 0.005 && Math.abs(lat - 20) < 0.5 && u < -eps };
}

/** 每次投放覆盖最近记录，包括弱风、零风速和模型静止区。 */
export function recordDrop(state, x, n) { state.first = driftInfo(x, n, state.land, state.w); state.saw.duck = true; return state.first; }
