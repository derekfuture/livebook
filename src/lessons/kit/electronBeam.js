// 理想匀强磁场中的电子束，坐标与装置一致：+y 向上，+z 朝正面观察者。
// 电子质量：CODATA 2022；电荷量为 SI 定义值。
// 线圈与加速电压关系核自 PHYWE 06959-00 / 06960-06 操作说明，教材图 1.3-2。
export const ELECTRON_MASS = 9.1093837139e-31;
export const CHARGE = 1.602176634e-19;
export const BULB_RADIUS = 0.085;
export const GUN = [0, -0.055, 0];
export const speedFromVoltage = (voltage) => Math.sqrt((2 * CHARGE * Math.max(0, voltage)) / ELECTRON_MASS);
// 124 匝、平均半径 15 cm 的串联亥姆霍兹线圈，取 μ0 ≈ 4π×10^-7。
export const coilField = (current) => (((4 / 5) ** 1.5 * 4 * Math.PI * 1e-7 * 124) / 0.15) * current;

export function beamOrbit({ voltage = 200, field = -coilField(2), angle = 0, origin = GUN } = {}) {
  const speed = speedFromVoltage(voltage),
    theta = (angle * Math.PI) / 180;
  // 绕玻璃泡竖直颈轴转动，枪口从向左逐渐转向观察者。
  const vx = -speed * Math.cos(theta),
    vz = speed * Math.sin(theta),
    omega = (-CHARGE * field) / ELECTRON_MASS;
  const straight = Math.abs(omega) < 1e-9 || Math.abs(vx) < speed * 1e-12;
  const period = Math.abs(omega) > 0 ? (2 * Math.PI) / Math.abs(omega) : Infinity;
  function sample(t) {
    const a = omega * t,
      s = straight ? t : Math.sin(a) / omega;
    // 2 sin²(a/2) 避免弱场时 1-cos(a) 的消去误差。
    const bend = straight ? 0 : (2 * Math.sin(a / 2) ** 2) / omega;
    return { x: origin[0] + vx * s, y: origin[1] - vx * bend, z: origin[2] + vz * t, t };
  }
  function velocity(t) {
    const a = omega * t;
    return straight ? [vx, 0, vz] : [vx * Math.cos(a), -vx * Math.sin(a), vz];
  }
  return {
    speed,
    period,
    radius: Math.abs(omega) < 1e-9 ? Infinity : Math.abs(vx / omega),
    sample,
    velocity,
    kind: straight ? 'line' : Math.abs(vz) < speed * 1e-12 ? 'circle' : 'helix',
  };
}

// 发光径迹只留在玻璃泡内。圆轨道画一整周；螺旋线在第一次碰壁处结束。
export function traceBeam(options = {}) {
  const orbit = beamOrbit(options),
    radius = options.bulbRadius ?? BULB_RADIUS;
  const points = [orbit.sample(0)];
  if (!orbit.speed) return { ...orbit, points, hitWall: false };
  const dt = Math.min(0.0004 / orbit.speed, orbit.period / 800);
  const parallel = Math.abs(orbit.velocity(0)[2]);
  const wallTime =
    orbit.kind === 'circle'
      ? orbit.period
      : orbit.kind === 'line'
        ? (2 * radius) / orbit.speed
        : (2 * radius) / parallel;
  // 极小倾角时碰壁可能需要很多周；显示最多十二周，并明确标记未到壁的截断。
  const limit = Math.min(wallTime, 12 * orbit.period);
  const norm = (p) => Math.hypot(p.x, p.y, p.z);
  for (let t = dt; ; t += dt) {
    const end = Math.min(t, limit),
      p = orbit.sample(end);
    if (norm(p) >= radius) {
      let lo = points.at(-1).t,
        hi = end;
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        if (norm(orbit.sample(mid)) >= radius) hi = mid;
        else lo = mid;
      }
      points.push(orbit.sample((lo + hi) / 2));
      return { ...orbit, points, hitWall: true };
    }
    points.push(p);
    if (end === limit) return { ...orbit, points, hitWall: false, truncated: limit < wallTime };
  }
}
