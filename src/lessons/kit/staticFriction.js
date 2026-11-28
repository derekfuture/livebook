// 图 3.2-4。坐标沿拉动方向；handle 是从木块初始位置、弹簧恰好不伸长时算起的拉环位移。
export const STATIC_MU = 0.6,
  SLIDING_MU = 0.46,
  SPRING_K = 1 / 0.024;
const G = 9.8;

export function frictionTrial(mass = 0.5) {
  return { mass, x: 0, v: 0, handle: 0, tension: 0, friction: 0, peak: 0, slipped: false,
    onsetTime: 0, onsetForce: 0, slidingPeakTime: 0, slidingPeak: 0 };
}

export function pullTo(s, target, dt, startTime = 0) {
  if (!(dt > 0)) return;
  const start = s.handle, speed = (target - start) / dt;
  const steps = Math.ceil(dt * 480), h = dt / steps;
  const normal = s.mass * G, limit = STATIC_MU * normal, kinetic = SLIDING_MU * normal;
  for (let i = 1; i <= steps; i++) {
    const end = start + (target - start) * i / steps;
    const endTime = startTime + i * h;
    let slideTime = h;
    if (s.v === 0) {
      const staticForce = SPRING_K * Math.max(0, end - s.x);
      if (staticForce <= limit) {
        s.handle = end; s.tension = staticForce; s.friction = -staticForce;
        s.peak = Math.max(s.peak, staticForce);
        continue;
      }
      // 到达阈值以前木块不动，只有这一步剩下的时间参与滑动积分。
      if (s.tension <= limit && speed > 0) {
        s.handle = s.x + limit / SPRING_K;
        slideTime = Math.min(h, Math.max(0, (end - s.handle) / speed));
      }
      if (!s.slipped) {
        s.slipped = true; s.onsetTime = endTime - slideTime; s.onsetForce = limit;
        s.slidingPeakTime = s.onsetTime; s.slidingPeak = limit;
      }
    }
    const extension = s.handle - s.x;
    const a = (SPRING_K * Math.max(0, extension) - kinetic) / s.mass;
    const moving = a < 0 ? Math.min(slideTime, -s.v / a) : slideTime;
    // 拉环与木块等速时，弹簧伸长可能在小步内部达到峰值。
    if (a > 0 && speed > s.v) {
      const at = (speed - s.v) / a;
      if (at < moving) {
        const force = SPRING_K * (extension + (speed - s.v) * at - 0.5 * a * at * at);
        if (force > s.slidingPeak) {
          s.slidingPeak = force; s.slidingPeakTime = endTime - slideTime + at;
        }
      }
    }
    s.x += s.v * moving + 0.5 * a * moving * moving;
    s.v = Math.max(0, s.v + a * moving);
    s.handle = end;
    s.tension = SPRING_K * Math.max(0, end - s.x);
    s.friction = s.v === 0 && s.tension <= limit ? -s.tension : -kinetic;
    if (s.tension > s.slidingPeak) { s.slidingPeak = s.tension; s.slidingPeakTime = endTime; }
    s.peak = Math.max(s.peak, s.slidingPeak);
  }
}
