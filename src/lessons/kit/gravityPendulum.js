// 摆长从悬点量到球心。动力学保留 sinθ，只有学生最后估算 g 时才用小角度公式。
const GRAVITY = 9.8;
export function advancePendulum(angle, omega, length, dt) {
  const crossings = [];
  const count = Math.max(1, Math.ceil(dt * 120)),
    h = dt / count;
  const acceleration = (q) => (-GRAVITY / length) * Math.sin(q);
  for (let k = 0; k < count; k++) {
    const start = angle;
    const a1 = acceleration(angle),
      v2 = omega + (h * a1) / 2,
      a2 = acceleration(angle + (h * omega) / 2);
    const v3 = omega + (h * a2) / 2,
      a3 = acceleration(angle + (h * v2) / 2);
    const v4 = omega + h * a3,
      a4 = acceleration(angle + h * v3);
    angle += (h * (omega + 2 * v2 + 2 * v3 + v4)) / 6;
    omega += (h * (a1 + 2 * a2 + 2 * a3 + a4)) / 6;
    if ((start < 0 && angle >= 0) || (start > 0 && angle <= 0))
      crossings.push({ offset: (k + start / (start - angle)) * h, direction: Math.sign(omega) });
  }
  return { angle, omega, crossings };
}
// 点击可能略早或略晚于球心穿过中线。用最近的同向穿越编号核对圈数，
// 停表时间仍采用实际点击时刻，不能反过来用理论周期修正它。
export function timingMark(angle, omega, amplitude, turns) {
  const dir = Math.sign(omega);
  const atCenter = dir !== 0 && Math.abs(Math.sin(angle)) <= 0.48 * Math.sin(amplitude);
  return { dir, atCenter, ordinal: dir === 0 ? null : turns[dir] + Number(angle * dir < 0) };
}
export function pendulumEstimate(length, elapsed, oscillations) {
  const period = elapsed / oscillations;
  return { period, gravity: (4 * Math.PI ** 2 * length) / period ** 2 };
}
