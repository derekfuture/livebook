// 选必一 p.62 图3.1-1。固定张力、均匀线密度的小斜率绳波，右端固定。
// y 是相对静态下垂形状的横向位移；材料点的沿绳坐标不随波峰平移。
// 参数为演示设值。实际波速较快，界面慢放必须单独标注，不改变物理单位。
export class RopeWave {
  constructor({ length = 4, density = 0.04, tension = 16, segments = 160, damping = 0.25, gravity = 9.8 } = {}) {
    Object.assign(this, { length, density, tension, segments, damping, gravity });
    this.dx = length / segments;
    this.mass = density * this.dx;
    this.spring = tension / this.dx;
    this.speed = Math.sqrt(tension / density);
    this.step = Math.min(0.000125, (0.1 * this.dx) / this.speed);
    this.reset();
  }
  reset() {
    this.y = new Float64Array(this.segments + 1);
    this.v = new Float64Array(this.segments + 1);
    this.target = 0;
    this.time = 0;
    this.accumulator = 0;
    this.handWork = 0;
    this.heat = 0;
  }
  setHand(y) {
    if (!Number.isFinite(y)) throw new RangeError('hand position must be finite');
    this.target = Math.max(-0.18, Math.min(0.18, y));
  }
  baseline(x) {
    return ((this.density * this.gravity) / (2 * this.tension)) * x * (x - this.length);
  }
  handVelocity(y = this.y[0]) {
    const maxSpeed = this.speed * 0.25;
    return Math.max(-maxSpeed, Math.min(maxSpeed, (this.target - y) / 0.006));
  }
  observe() {
    return {
      time: this.time,
      speed: this.speed,
      hand: this.y[0],
      points: Array.from(this.y, (q, i) => ({
        x: i * this.dx,
        y: this.baseline(i * this.dx) + q,
        displacement: q,
        velocity: i === 0 ? this.handVelocity() : this.v[i],
      })),
    };
  }
  // Relative total mechanical energy includes the static upward force on the driven end.
  energy(y = this.y, v = this.v) {
    let e = -this.spring * this.baseline(this.dx) * y[0];
    for (let i = 1; i < this.segments; i++) e += 0.5 * this.mass * v[i] * v[i];
    for (let i = 0; i < this.segments; i++) e += 0.5 * this.spring * (y[i + 1] - y[i]) ** 2;
    return e;
  }
  rates(y, v) {
    const dy = new Float64Array(y.length),
      dv = new Float64Array(y.length);
    dy[0] = this.handVelocity(y[0]);
    let heat = 0;
    for (let i = 1; i < this.segments; i++) {
      dy[i] = v[i];
      dv[i] = (this.speed ** 2 / this.dx ** 2) * (y[i - 1] - 2 * y[i] + y[i + 1]) - 2 * this.damping * v[i];
      heat += 2 * this.damping * this.mass * v[i] * v[i];
    }
    const work = this.spring * (y[0] - y[1] - this.baseline(this.dx)) * dy[0];
    return { dy, dv, heat, work };
  }
  advance(dt) {
    if (!(dt > 0)) return;
    this.accumulator += dt;
    const h = this.step;
    while (this.accumulator + 1e-12 >= h) {
      this.accumulator -= h;
      const y = this.y,
        v = this.v;
      const stage = (r, f) =>
        this.rates(
          y.map((q, i) => q + h * f * r.dy[i]),
          v.map((q, i) => q + h * f * r.dv[i]),
        );
      const a = this.rates(y, v),
        b = stage(a, 0.5),
        c = stage(b, 0.5),
        d = stage(c, 1);
      for (let i = 0; i < y.length; i++) {
        y[i] += (h / 6) * (a.dy[i] + 2 * b.dy[i] + 2 * c.dy[i] + d.dy[i]);
        v[i] += (h / 6) * (a.dv[i] + 2 * b.dv[i] + 2 * c.dv[i] + d.dv[i]);
      }
      this.heat += (h / 6) * (a.heat + 2 * b.heat + 2 * c.heat + d.heat);
      this.handWork += (h / 6) * (a.work + 2 * b.work + 2 * c.work + d.work);
      this.time += h;
    }
  }
}
