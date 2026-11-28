// 摆长从悬点量到球心。动力学保留 sinθ，只有学生最后估算 g 时才用小角度公式。
export const GRAVITY = 9.8;
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

// 两幅图共用学生记录的 l、t、N，不用理论周期替换原计时。
// 自由截距直线用于检查趋势，不能先强迫拟合线过原点再宣称正比。
export function pendulumSeries(samples) {
  if (
    !Array.isArray(samples) ||
    samples.length < 3 ||
    samples.some(
      (s) =>
        !Number.isFinite(s.l) || s.l <= 0 || !Number.isFinite(s.t) || s.t <= 0 || !Number.isInteger(s.n) || s.n <= 0,
    )
  )
    throw new RangeError('至少需要三组有效摆长、总时间和全振动次数');
  const rows = samples.map((s) => {
    const estimate = pendulumEstimate(s.l, s.t, s.n);
    return { l: s.l, t: s.t, n: s.n, ...estimate, squared: estimate.period ** 2 };
  });
  function fit(key) {
    const xMean = rows.reduce((sum, r) => sum + r.l, 0) / rows.length;
    const yMean = rows.reduce((sum, r) => sum + r[key], 0) / rows.length;
    const xx = rows.reduce((sum, r) => sum + (r.l - xMean) ** 2, 0);
    if (xx < 1e-12) throw new RangeError('摆长不能全部相同');
    const slope = rows.reduce((sum, r) => sum + (r.l - xMean) * (r[key] - yMean), 0) / xx;
    const intercept = yMean - slope * xMean;
    const residuals = rows.map((r) => r[key] - (slope * r.l + intercept));
    const rms = Math.sqrt(residuals.reduce((sum, r) => sum + r * r, 0) / rows.length);
    return { slope, intercept, residuals, rms };
  }
  const periodFit = fit('period'),
    squaredFit = fit('squared');
  const lengths = rows.map((r) => r.l).sort((a, b) => a - b),
    span = lengths[lengths.length - 1] - lengths[0];
  // 四种摆长和至少20cm跨度是本活页的取样要求，不是教材规定的固定数值。
  const distinct = lengths.reduce((list, l) => {
    if (!list.length || l - list[list.length - 1] >= 0.049) list.push(l);
    return list;
  }, []);
  return {
    rows,
    periodFit,
    squaredFit,
    span,
    sufficient: distinct.length >= 4 && span >= 0.199,
    slopeGravity: squaredFit.slope > 0 ? (4 * Math.PI ** 2) / squaredFit.slope : null,
  };
}
