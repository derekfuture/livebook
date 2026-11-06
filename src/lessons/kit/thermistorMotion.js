import { THERMISTOR_BULB_RADIUS as R, THERMISTOR_WATER as W } from './thermistor.js';
export const THERMISTOR_HOME = Object.freeze({ x: 0.08, y: 0.125, z: W.z });
export const THERMISTOR_CUP_OUTER_RADIUS = W.radius / 0.95; // 与原beaker器材的内半径一致。
export const THERMISTOR_CLEARANCE = W.rim + 0.0016 + R; // 杯沿的实际圆环也留出感温头半径。
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function free(x, y) {
  const d = Math.abs(x - W.x);
  if (d < THERMISTOR_CUP_OUTER_RADIUS + R && y < W.floor + R) return false;
  return y >= THERMISTOR_CLEARANCE || d <= W.radius * 0.98 - R || d >= THERMISTOR_CUP_OUTER_RADIUS + R;
}
// 装置的横臂限定感温头在杯子直径所在竖直面内移动。逐段扫掠并沿接触面滑动，
// 一次大鼠标位移也不能穿过杯壁、杯沿或杯底；先提过杯沿才能横移。
export function thermistorMove(from, to) {
  if (
    ![from, to].every((p) => p && [p.x, p.y, p.z].every(Number.isFinite)) ||
    Math.abs(from.z - W.z) > 1e-8 ||
    Math.abs(to.z - W.z) > 1e-8 ||
    !free(from.x, from.y)
  )
    throw new RangeError('感温头须从装置竖直面内的无碰撞位置移动');
  const tx = clamp(to.x, -0.045, 0.22),
    ty = clamp(to.y, R + 0.001, 0.16);
  let x = from.x,
    y = from.y,
    blocked = false;
  const n = Math.max(1, Math.ceil(Math.hypot(tx - x, ty - y) / 0.0005)),
    dx = (tx - x) / n,
    dy = (ty - y) / n;
  for (let i = 0; i < n; i++) {
    if (free(x, y + dy)) y += dy;
    else blocked = true;
    if (free(x + dx, y)) x += dx;
    else blocked = true;
  }
  return { x, y, z: W.z, blocked };
}
