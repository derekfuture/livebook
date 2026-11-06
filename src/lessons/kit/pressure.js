// 气旋、反气旋的教学模型（纯计算，活页和核对脚本 tools/geo/cyclone_check.mjs 共用）。坐标：x 朝东、n 朝北。
// 虚构气压场，数值为教学设定：p = 1008 ∓ 10·e^(−r²/σ²) hPa（低压中心约 998，高压中心约 1018）
export const MODEL = { SIG: 0.09, P0: 1008, DP: 10, C: 1.4e-3, F: 2.4, K: 1.08 };          // 加速度 = −C∇p + 地转偏向力（f）− 摩擦（k）；k/f = 0.45，风和等压线夹角 atan(0.45) ≈ 24°
export function pAt(mode, x, n) { const e = Math.exp(-(x * x + n * n) / MODEL.SIG ** 2); return MODEL.P0 + (mode === 'low' ? -1 : 1) * MODEL.DP * e; }
export function accP(mode, x, n) {          // 气压梯度力（单位质量）：从高压指向低压
  const e = Math.exp(-(x * x + n * n) / MODEL.SIG ** 2), s = (mode === 'low' ? 1 : -1) * MODEL.C * MODEL.DP * 2 * e / MODEL.SIG ** 2;
  return [-s * x, -s * n];
}
/** 三力平衡时的风（近地面）：k·v − f·(v_n, −v_x) = 气压梯度力 */
export function windAt(mode, hemi, x, n) {
  const [ax, an] = accP(mode, x, n), f = MODEL.F * hemi, k = MODEL.K, det = k * k + f * f;
  return [(k * ax + f * an) / det, (k * an - f * ax) / det];
}
const DIRS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
/** 风向：按风从哪边吹来叫 */
export const CALM_SPEED = 1e-5;          // 模型速度的静风阈值，不对应实测风速单位
export function windName(vx, vn) {
  if (Math.hypot(vx, vn) < CALM_SPEED) return { name: '静风', lean: null };
  const b = (Math.atan2(-vx, -vn) * 180 / Math.PI + 360) % 360, d = DIRS[Math.round(b / 45) % 8];
  const lean = -vn > Math.abs(vx) * 0.25 ? '偏北' : vn > Math.abs(vx) * 0.25 ? '偏南' : null;          // 从北边来＝偏北风
  return { name: `${d}风`, lean: lean && `${lean}风` };
}

/** 烟是空气示踪物：按与风向标相同的瞬时风场平流，中点法减小轨迹误差。 */
export function advect(mode, hemi, x, n, dt) {
  const [u, v] = windAt(mode, hemi, x, n), [um, vm] = windAt(mode, hemi, x + u * dt / 2, n + v * dt / 2);
  const nx = x + um * dt, nn = n + vm * dt;
  return { x: nx, n: nn, velocity: windAt(mode, hemi, nx, nn) };
}
export const windCaption = (name) => name === '静风' ? '静风' : `风从${name.replace('风', '')}边吹来`;

/** 用释放点风场的径向、切向分量判断性质；短轨迹不能用累计转角当作无旋转的证据。 */
export function motionText(mode, hemi, x, n) {
  const [u, v] = windAt(mode, hemi, x, n), r = Math.hypot(x, n);
  if (r === 0 || Math.hypot(u, v) < CALM_SPEED) return '释放处水平静风，未发生水平流入或流出';
  const radial = (x * u + n * v) / r, tangent = (x * v - n * u) / r, inward = radial < 0;
  if (Math.abs(tangent) <= Number.EPSILON * Math.hypot(u, v) * 8) return inward ? '直直流进中心' : '直直流出去';
  return `绕着中心${tangent > 0 ? '逆' : '顺'}时针${inward ? '转进去' : '转着流出去'}`;
}
