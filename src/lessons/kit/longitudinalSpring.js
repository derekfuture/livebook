// 选必一 p.64 图3.1-4：光滑水平面上的软弹簧，左端沿轴线驱动，右端自由。
// 有质量弹簧离散为相邻的轴向弹性段。第 i 圈的实际位置为 i*pitch + q[i]，
// 不是把波形沿一条不动的弹簧平移。每段刚度 N*K，质量 M/N，长波波速 L*sqrt(K/M)。
// 教学名义参数；只取轴向模态，不模拟整体横向弯曲与端部转动。
// 近密接时用有限接触刚度保护圈序，非接触材料标定。
export const LONGITUDINAL_SPRING = Object.freeze({
  length: 0.96,
  mass: 0.12,
  stiffness: 0.075,
  segments: 80,
  beta: 0.08,
  wireDiameter: 0.0009,
  coilRadius: 0.05,
  contactStiffness: 400000,
  maxDisplacement: 0.08,
  maxHandSpeed: 0.4,
  handResponse: 0.02,
});

export class LongitudinalSpring {
  constructor(options = {}) {
    const p = (this.parameters = { ...LONGITUDINAL_SPRING, ...options });
    if (
      !Object.values(p).every(Number.isFinite) ||
      !Number.isInteger(p.segments) ||
      p.segments < 8 ||
      p.segments > 400 ||
      p.length <= 0 ||
      p.mass <= 0 ||
      p.stiffness <= 0 ||
      p.beta < 0 ||
      p.wireDiameter <= 0 ||
      p.wireDiameter >= p.length / p.segments ||
      p.coilRadius <= p.wireDiameter / 2 ||
      p.contactStiffness <= 0 ||
      p.maxDisplacement <= 0 ||
      p.maxDisplacement >= p.length / 4 ||
      p.maxHandSpeed <= 0 ||
      p.handResponse <= 0
    )
      throw new RangeError('需要有限、有效的弹簧尺寸、质量、刚度和驱动范围');
    this.pitch = p.length / p.segments;
    this.nodeMass = p.mass / p.segments;
    this.linkStiffness = p.stiffness * p.segments;
    this.speed = p.length * Math.sqrt(p.stiffness / p.mass);
    // Contact sets the fastest timescale. Fixed steps also make render rate irrelevant.
    this.step = Math.min(
      1 / 6000,
      0.05 * Math.sqrt(this.nodeMass / (this.linkStiffness + p.contactStiffness)),
      p.handResponse / 20,
    );
    const n = p.segments + 1;
    this._stages = Array.from({ length: 4 }, () => ({
      dq: new Float64Array(n),
      dv: new Float64Array(n),
      work: 0,
      heat: 0,
    }));
    this._q = new Float64Array(n);
    this._v = new Float64Array(n);
    this.reset();
  }

  reset() {
    this.q = new Float64Array(this.parameters.segments + 1);
    this.v = new Float64Array(this.q.length);
    this.target = 0;
    this.time = 0;
    this.accumulator = 0;
    this.handWork = 0;
    this.heat = 0;
  }

  setHand(q) {
    if (!Number.isFinite(q)) throw new RangeError('手的位置必须有限');
    const limit = this.parameters.maxDisplacement;
    this.target = Math.max(-limit, Math.min(limit, q));
  }

  handVelocity(q = this.q[0]) {
    const p = this.parameters;
    return Math.max(-p.maxHandSpeed, Math.min(p.maxHandSpeed, (this.target - q) / p.handResponse));
  }

  // Signed tension: negative means compression. A contact spring is active only
  // when neighboring wire surfaces meet; its energy is included below.
  tension(extension) {
    const overlap = Math.max(0, this.parameters.wireDiameter - this.pitch - extension);
    return this.linkStiffness * extension - this.parameters.contactStiffness * overlap;
  }

  energy(q = this.q, v = this.v) {
    let result = 0;
    for (let i = 1; i < q.length; i++) {
      const extension = q[i] - q[i - 1];
      const overlap = Math.max(0, this.parameters.wireDiameter - this.pitch - extension);
      result +=
        0.5 * this.nodeMass * v[i] ** 2 +
        0.5 * this.linkStiffness * extension ** 2 +
        0.5 * this.parameters.contactStiffness * overlap ** 2;
    }
    return result;
  }

  rates(q, v, result) {
    const { dq, dv } = result;
    dq[0] = this.handVelocity(q[0]);
    dv[0] = 0;
    let left = this.tension(q[1] - q[0]);
    result.work = -left * dq[0];
    result.heat = 0;
    for (let i = 1; i < q.length; i++) {
      // The last coil has no spring to a hidden fixed wall.
      const right = i + 1 < q.length ? this.tension(q[i + 1] - q[i]) : 0;
      dq[i] = v[i];
      dv[i] = (right - left) / this.nodeMass - 2 * this.parameters.beta * v[i];
      result.heat += 2 * this.parameters.beta * this.nodeMass * v[i] ** 2;
      left = right;
    }
    return result;
  }

  advance(dt) {
    if (!Number.isFinite(dt) || dt < 0) throw new RangeError('时间步长必须有限且非负');
    this.accumulator += dt;
    const h = this.step,
      q = this.q,
      v = this.v,
      stages = this._stages;
    while (this.accumulator + 1e-12 >= h) {
      this.accumulator -= h;
      this.rates(q, v, stages[0]);
      for (let stage = 1; stage < 4; stage++) {
        const before = stages[stage - 1],
          f = stage === 3 ? h : h / 2;
        for (let i = 0; i < q.length; i++) {
          this._q[i] = q[i] + f * before.dq[i];
          this._v[i] = v[i] + f * before.dv[i];
        }
        this.rates(this._q, this._v, stages[stage]);
      }
      const [a, b, c, d] = stages;
      for (let i = 0; i < q.length; i++) {
        q[i] += (h / 6) * (a.dq[i] + 2 * b.dq[i] + 2 * c.dq[i] + d.dq[i]);
        v[i] += (h / 6) * (a.dv[i] + 2 * b.dv[i] + 2 * c.dv[i] + d.dv[i]);
      }
      this.handWork += (h / 6) * (a.work + 2 * b.work + 2 * c.work + d.work);
      this.heat += (h / 6) * (a.heat + 2 * b.heat + 2 * c.heat + d.heat);
      this.time += h;
    }
  }

  observe() {
    return {
      time: this.time,
      hand: this.q[0],
      speed: this.speed,
      points: Array.from(this.q, (q, i) => ({
        materialX: i * this.pitch,
        x: i * this.pitch + q,
        displacement: q,
        velocity: i === 0 ? this.handVelocity() : this.v[i],
      })),
      gaps: Array.from(this.q.subarray(1), (q, i) => this.pitch + q - this.q[i]),
    };
  }
}
