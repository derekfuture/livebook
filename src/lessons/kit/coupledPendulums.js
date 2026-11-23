// 选必一 p.55–56 图2.6-3：重摆 D 经可微动横梁传递能量。
// 横梁位移 x，各摆角 θ 相对竖直线；用完整几何的拉格朗日方程，非预设正弦动画。
export const RESONANCE_PENDULUMS = [
  { name: 'A', length: 0.22, mass: 0.005, beta: 0.08 },
  { name: 'B', length: 0.29, mass: 0.005, beta: 0.08 },
  { name: 'C', length: 0.36, mass: 0.005, beta: 0.08 },
  { name: 'D', length: 0.22, mass: 0.15, beta: 0.015 },
  { name: 'E', length: 0.14, mass: 0.005, beta: 0.08 },
  { name: 'F', length: 0.18, mass: 0.005, beta: 0.08 },
  { name: 'G', length: 0.22, mass: 0.005, beta: 0.08 },
];
export class CoupledPendulums {
  constructor({
    pendulums = RESONANCE_PENDULUMS,
    beamMass = 0.1,
    stiffness = 100,
    damping = 0.4,
    fixedBeam = false,
  } = {}) {
    this.pendulums = pendulums.map((p) => ({ ...p }));
    Object.assign(this, { beamMass, stiffness, damping, fixedBeam });
    this.reset();
  }
  reset() {
    this.state = [0, 0, ...this.pendulums.flatMap(() => [0, 0])];
    this.time = 0;
    this.accumulator = 0;
    this.heat = 0;
    this.handWork = 0;
    this.held = null;
  }
  observe(s = this.state) {
    const x = s[0],
      v = s[1];
    let energy = 0.5 * this.beamMass * v * v + 0.5 * this.stiffness * x * x;
    let heatRate = this.damping * v * v;
    const bobs = this.pendulums.map((p, i) => {
      const angle = s[2 + 2 * i],
        omega = s[3 + 2 * i];
      const horizontal = x + p.length * Math.sin(angle),
        vertical = -p.length * Math.cos(angle);
      const vx = v + p.length * omega * Math.cos(angle),
        vy = p.length * omega * Math.sin(angle);
      energy += 0.5 * p.mass * (vx * vx + vy * vy) + p.mass * 9.8 * p.length * (1 - Math.cos(angle));
      heatRate += 2 * p.mass * p.length ** 2 * p.beta * omega * omega;
      return {
        angle,
        omega,
        horizontal,
        vertical,
        vx,
        vy,
        naturalFrequency: Math.sqrt(9.8 / p.length) / (2 * Math.PI),
      };
    });
    return { x, v, bobs, energy, heatRate };
  }
  hold(index) {
    if (!Number.isInteger(index) || !this.pendulums[index]) throw new RangeError('unknown pendulum');
    const before = this.observe().energy;
    this.held = index;
    this.state[3 + 2 * index] = 0;
    this.handWork += this.observe().energy - before;
  }
  moveHeld(angle) {
    if (this.held === null) return false;
    if (!Number.isFinite(angle)) throw new RangeError('angle must be finite');
    const before = this.observe().energy;
    this.state[2 + 2 * this.held] = angle;
    this.state[3 + 2 * this.held] = 0;
    this.handWork += this.observe().energy - before;
    return true;
  }
  release() {
    this.held = null;
  }
  derivative(s) {
    let denominator = this.beamMass,
      rhs = -this.stiffness * s[0] - this.damping * s[1];
    this.pendulums.forEach((p, i) => {
      const a = s[2 + 2 * i],
        w = s[3 + 2 * i],
        sin = Math.sin(a),
        cos = Math.cos(a);
      if (i === this.held) denominator += p.mass;
      else {
        denominator += p.mass * sin * sin;
        rhs += p.mass * (9.8 * sin * cos + 2 * p.length * p.beta * w * cos + p.length * sin * w * w);
      }
    });
    const acceleration = this.fixedBeam ? 0 : rhs / denominator;
    return [
      this.fixedBeam ? 0 : s[1],
      acceleration,
      ...this.pendulums.flatMap((p, i) => {
        if (i === this.held) return [0, 0];
        const a = s[2 + 2 * i],
          w = s[3 + 2 * i];
        return [w, -(9.8 * Math.sin(a) + acceleration * Math.cos(a)) / p.length - 2 * p.beta * w];
      }),
    ];
  }
  advance(dt) {
    if (!(dt > 0)) return this.observe();
    this.accumulator += dt;
    const h = 0.001;
    while (this.accumulator + 1e-12 >= h) {
      this.accumulator -= h;
      const s = this.state,
        mix = (d, f) => s.map((v, i) => v + h * f * d[i]);
      const a = this.derivative(s),
        sb = mix(a, 0.5),
        b = this.derivative(sb),
        sc = mix(b, 0.5),
        c = this.derivative(sc),
        sd = mix(c, 1),
        d = this.derivative(sd);
      this.heat +=
        (h / 6) *
        (this.observe(s).heatRate +
          2 * this.observe(sb).heatRate +
          2 * this.observe(sc).heatRate +
          this.observe(sd).heatRate);
      this.state = s.map((v, i) => v + (h * (a[i] + 2 * b[i] + 2 * c[i] + d[i])) / 6);
      this.time += h;
    }
    return this.observe();
  }
}
