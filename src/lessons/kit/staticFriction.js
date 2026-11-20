// 图 3.2-4。坐标沿拉动方向；handle 是从木块初始位置、弹簧恰好不伸长时算起的拉环位移。
export const STATIC_MU = 0.6,
  SLIDING_MU = 0.46,
  SPRING_K = 1 / 0.024;
const G = 9.8;

export function frictionTrial(mass = 0.5) {
  return { mass, x: 0, v: 0, handle: 0, tension: 0, friction: 0, peak: 0, slipped: false };
}

export function pullTo(s, target, dt) {
  if (!(dt > 0)) return;
  const start = s.handle,
    steps = Math.ceil(dt * 480),
    h = dt / steps;
  const normal = s.mass * G,
    limit = STATIC_MU * normal,
    kinetic = SLIDING_MU * normal;
  for (let i = 1; i <= steps; i++) {
    s.handle = start + ((target - start) * i) / steps;
    s.tension = SPRING_K * Math.max(0, s.handle - s.x);
    s.peak = Math.max(s.peak, s.tension);
    if (s.v === 0 && s.tension <= limit) {
      s.friction = -s.tension;
      continue;
    }
    if (!s.slipped) {
      // 记录这一积分步内跨过静摩擦极限的时刻（相对本次 pullTo 的起点）。
      const threshold = s.x + limit / SPRING_K;
      s.onsetTime = Math.max(0, Math.min(dt, dt * (threshold - start) / (target - start)));
      s.onsetForce = limit;
      s.slipped = true;
    }
    s.friction = -kinetic;
    const a = (s.tension - kinetic) / s.mass;
    // 单向拉力。若在这一小步内停住，静摩擦接手；不能让动摩擦把木块向后推出去。
    const t = a < 0 ? Math.min(h, -s.v / a) : h;
    s.x += s.v * t + 0.5 * a * t * t;
    s.v = Math.max(0, s.v + a * t);
  }
  s.tension = SPRING_K * Math.max(0, s.handle - s.x);
  if (s.v === 0 && s.tension <= limit) s.friction = -s.tension;
}
