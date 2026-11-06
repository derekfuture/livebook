// 必修二图 5.2-1，SI 单位。s 沿管轴、原点在管中心；angle 从竖直向右转。
// 低速充满水的窄管一维近似：水随管运动，蜡块受轴向浮重合力及等效阻力。
// 不模拟涡流、侧壁摩擦、附加质量和快速摇晃；阻力系数不是实物标定值。
// 管的姿态由实际手势给出；模型从不重设蜡块位置来完成翻转。
const finite = (value) => Number.isFinite(value);
export function waxMotion({
  length = 1,
  waxLength = 0.025,
  waxDensity = 980,
  waterDensity = 1000,
  gravity = 9.81,
  linearDrag = 980,
  quadraticDrag = 18406.25,
  initialPosition,
} = {}) {
  if (
    ![length, waxLength, waxDensity, waterDensity, gravity].every((v) => finite(v) && v > 0) ||
    waxLength >= length ||
    ![linearDrag, quadraticDrag].every((v) => finite(v) && v >= 0)
  )
    throw new RangeError('管长、密度、重力须为正数，阻力非负，蜡块短于管长');
  const limit = (length - waxLength) / 2;
  let s = initialPosition ?? limit,
    v = 0,
    time = 0;
  if (!finite(s) || Math.abs(s) > limit) throw new RangeError('蜡块须在管内');
  function poseAt(pose = {}) {
    const p = { x: 0, y: 0, angle: 0, vx: 0, vy: 0, omega: 0, ax: 0, ay: 0, ...pose };
    if (!Object.values(p).every(finite)) throw new RangeError('姿态和运动量须为有限数');
    return p;
  }
  function acceleration(position, velocity, pose) {
    const p = poseAt(pose),
      ex = Math.sin(p.angle),
      ey = Math.cos(p.angle);
    // 水的随管压力梯度及管坐标惯性项合并：
    // (rhoWater-rhoWax) * (g*cos(angle)+aOrigin·e-omega²*s)。
    const drive = (waterDensity - waxDensity) * (gravity * ey + p.ax * ex + p.ay * ey - p.omega ** 2 * position);
    return (drive - linearDrag * velocity - quadraticDrag * velocity * Math.abs(velocity)) / waxDensity;
  }
  function snapshot(pose = {}) {
    const p = poseAt(pose),
      ex = Math.sin(p.angle),
      ey = Math.cos(p.angle);
    return {
      time,
      s,
      velocity: v,
      x: p.x + s * ex,
      y: p.y + s * ey,
      vx: p.vx + v * ex + s * p.omega * ey,
      vy: p.vy + v * ey - s * p.omega * ex,
      atEnd: Math.abs(s) >= limit,
    };
  }
  function step(dt, pose = {}) {
    if (!finite(dt) || dt < 0) throw new RangeError('时间增量须为非负有限数');
    const getPose = typeof pose === 'function' ? pose : () => pose;
    // 分步 RK4；控制函数按仿真绝对时间取值，不能把终点姿态用于整个翻转过程。
    const n = Math.max(1, Math.ceil(dt * 240)),
      h = dt / n;
    for (let i = 0; i < n; i++) {
      const p0 = getPose(time),
        pm = getPose(time + h / 2),
        p1 = getPose(time + h);
      const a = acceleration(s, v, p0);
      const vb = v + (a * h) / 2,
        b = acceleration(s + (v * h) / 2, vb, pm);
      const vc = v + (b * h) / 2,
        c = acceleration(s + (vb * h) / 2, vc, pm);
      const vd = v + c * h,
        d = acceleration(s + vc * h, vd, p1);
      s += (h * (v + 2 * vb + 2 * vc + vd)) / 6;
      v += (h * (a + 2 * b + 2 * c + d)) / 6;
      // 管端接触为非弹性；只消除朝管外的速度，反向浮升可立即离开。
      if (s >= limit) {
        s = limit;
        v = Math.min(v, 0);
      }
      if (s <= -limit) {
        s = -limit;
        v = Math.max(v, 0);
      }
      time += h;
    }
    return snapshot(getPose(time));
  }
  return { step, snapshot, acceleration, limit };
}
