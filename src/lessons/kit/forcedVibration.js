// 选必一 p.55 图2.6-2。偏心轮上下移动弹簧上端，两钩码独立响应。
// q 从各自静态平衡位置向上计，空气阻尼相对实验室：
// m q'' = -k(q-b) - 2mβ q'，b = A sinφ。
// 尺寸、质量、刚度和电机响应均为教学模型设值，非教材器材标定。
export const FORCED_SYSTEMS = [
  { mass: 0.05, stiffness: 8, beta: 0.65 },
  { mass: 0.05, stiffness: 4.5, beta: 0.65 },
];
export class ForcedVibration {
  constructor({ systems = FORCED_SYSTEMS, amplitude = 0.003, frequency = 1, motorTime = 0.35 } = {}) {
    this.systems = systems.map((s) => ({ ...s }));
    this.amplitude = amplitude;
    this.frequency = frequency;
    this.motorTime = motorTime;
    this.reset();
  }
  reset() {
    this.state = [0, 0, ...this.systems.flatMap(() => [0, 0])]; // phase, angular speed, q1, v1, ...
    this.time = 0;
    this.accumulator = 0;
    this.powered = false;
    this.work = 0;
    this.heat = 0;
    this.lastChange = 0;
    this.clearReadings();
  }
  clearReadings() {
    this.crossings = Array.from({ length: this.systems.length + 1 }, () => []);
  }
  setFrequency(f) {
    if (!(f > 0) || !Number.isFinite(f)) throw new RangeError('frequency must be positive');
    if (this.frequency === f) return;
    this.frequency = f;
    this.lastChange = this.time;
    this.clearReadings();
  }
  switch(on) {
    if (this.powered === !!on) return;
    this.powered = !!on;
    this.lastChange = this.time;
    this.clearReadings();
  }
  observe(s = this.state) {
    const base = this.amplitude * Math.sin(s[0]),
      baseVelocity = this.amplitude * Math.cos(s[0]) * s[1];
    const bodies = this.systems.map((p, i) => {
      const q = s[2 + 2 * i],
        v = s[3 + 2 * i],
        relative = q - base;
      return {
        q,
        v,
        acceleration: (-p.stiffness / p.mass) * relative - 2 * p.beta * v,
        // 弹性势能 + 重力势能相对初始平衡态的变化，保留静载随支点移动的功。
        energy: 0.5 * p.mass * v * v + 0.5 * p.stiffness * relative * relative + p.mass * 9.8 * base,
        heatRate: 2 * p.mass * p.beta * v * v,
        workRate: (p.mass * 9.8 - p.stiffness * relative) * baseVelocity,
        naturalFrequency: Math.sqrt(p.stiffness / p.mass) / (2 * Math.PI),
      };
    });
    return {
      phase: s[0],
      frequency: s[1] / (2 * Math.PI),
      base,
      baseVelocity,
      bodies,
      energy: bodies.reduce((sum, b) => sum + b.energy, 0),
      heatRate: bodies.reduce((sum, b) => sum + b.heatRate, 0),
      workRate: bodies.reduce((sum, b) => sum + b.workRate, 0),
    };
  }
  settled() {
    if (!this.powered) return false;
    const o = this.observe(),
      w = 2 * Math.PI * this.frequency;
    if (Math.abs(o.frequency - this.frequency) > 0.005 * this.frequency) return false;
    return o.bodies.every((b, i) => {
      const p = this.systems[i],
        w0sq = p.stiffness / p.mass;
      const amplitude = (this.amplitude * w0sq) / Math.hypot(w0sq - w * w, 2 * p.beta * w);
      const angle = o.phase - Math.atan2(2 * p.beta * w, w0sq - w * w);
      // Residual transient in displacement/velocity, relative to the steady response.
      return Math.hypot(b.q - amplitude * Math.sin(angle), b.v / w - amplitude * Math.cos(angle)) < 0.03 * amplitude;
    });
  }
  derivative(s) {
    const o = this.observe(s);
    return [
      s[1],
      ((this.powered ? this.frequency * 2 * Math.PI : 0) - s[1]) / this.motorTime,
      ...o.bodies.flatMap((b) => [b.v, b.acceleration]),
    ];
  }
  // Read period from successive actual upward equilibrium crossings (motor: full rotations).
  reading(index, intervals = 3) {
    const times = this.crossings[index];
    if (times.length < intervals + 1) return null;
    const t = times.slice(-intervals - 1),
      periods = t.slice(1).map((v, i) => v - t[i]);
    const period = (t.at(-1) - t[0]) / intervals;
    return {
      frequency: 1 / period,
      period,
      start: t[0],
      end: t.at(-1),
      intervals,
      spread: (Math.max(...periods) - Math.min(...periods)) / period,
    };
  }
  advance(dt) {
    if (!(dt > 0)) return this.observe();
    this.accumulator += dt;
    const h = 0.001;
    while (this.accumulator + 1e-12 >= h) {
      this.accumulator -= h;
      const before = this.state,
        mix = (d, f) => before.map((v, i) => v + h * f * d[i]);
      const a = this.derivative(before),
        sb = mix(a, 0.5),
        b = this.derivative(sb),
        sc = mix(b, 0.5),
        c = this.derivative(sc),
        sd = mix(c, 1),
        d = this.derivative(sd);
      const states = [before, sb, sc, sd].map((s) => this.observe(s)),
        weights = [1, 2, 2, 1];
      this.work += (h / 6) * states.reduce((sum, o, i) => sum + weights[i] * o.workRate, 0);
      this.heat += (h / 6) * states.reduce((sum, o, i) => sum + weights[i] * o.heatRate, 0);
      this.state = before.map((v, i) => v + (h * (a[i] + 2 * b[i] + 2 * c[i] + d[i])) / 6);
      const tau = 2 * Math.PI,
        turn = Math.floor(before[0] / tau) + 1;
      if (this.state[0] >= turn * tau)
        this.crossings[0].push(this.time + (h * (turn * tau - before[0])) / (this.state[0] - before[0]));
      this.systems.forEach((_, i) => {
        const j = 2 + 2 * i;
        if (before[j] < 0 && this.state[j] >= 0 && this.state[j + 1] > 0)
          this.crossings[i + 1].push(this.time + (h * -before[j]) / (this.state[j] - before[j]));
      });
      this.crossings.forEach((a) => {
        if (a.length > 20) a.shift();
      });
      this.time += h;
    }
    return this.observe();
  }
}
