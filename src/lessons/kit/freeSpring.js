// 选必一 p.34、37：同一竖直轻弹簧与钢球，q 从静态平衡位置向下计。
// 轻弹簧质量忽略，线性弹性范围内 m q'' = -k q - 2mβq'。
// 教学名义参数，不是教材器材的标定。小阻尼保留真实的逐渐衰减。
export const FREE_SPRING = Object.freeze({
  mass: 0.08,
  stiffness: 5,
  gravity: 9.8,
  naturalLength: 0.12,
  beta: 0.006,
  maxDisplacement: 0.055,
});

const finite = (...values) => values.every(Number.isFinite);

export class FreeSpring {
  constructor(options = {}) {
    this.parameters = { ...FREE_SPRING, ...options };
    const p = this.parameters;
    if (
      !finite(...Object.values(p)) ||
      p.mass <= 0 ||
      p.stiffness <= 0 ||
      p.gravity <= 0 ||
      p.naturalLength <= 0 ||
      p.beta < 0 ||
      p.beta >= Math.sqrt(p.stiffness / p.mass) ||
      p.maxDisplacement <= 0 ||
      p.maxDisplacement >= (p.mass * p.gravity) / p.stiffness
    )
      throw new RangeError('需要正质量、刚度及原长；限定欠阻尼和始终拉伸的操作范围');
    this.reset();
  }

  reset() {
    this.q = 0;
    this.v = 0;
    this.time = 0;
    this.accumulator = 0;
    this.held = false;
    this.heat = 0;
    this.handWork = 0;
    this.turns = { '-1': 0, 1: 0 };
    this.crossings = [];
    this.recording = null;
    this.samples = [];
  }

  observe() {
    const p = this.parameters;
    const extension = (p.mass * p.gravity) / p.stiffness + this.q;
    return {
      time: this.time,
      q: this.q,
      v: this.v,
      held: this.held,
      extension,
      length: p.naturalLength + extension,
      springForce: p.stiffness * extension,
      gravityForce: p.mass * p.gravity,
      dampingForce: -2 * p.mass * p.beta * this.v,
      // Acceleration if the hand were removed; while held the hand balances it.
      freeAcceleration: (-p.stiffness / p.mass) * this.q - 2 * p.beta * this.v,
      energy: 0.5 * p.mass * this.v ** 2 + 0.5 * p.stiffness * this.q ** 2,
    };
  }

  // Grabbing dissipates the current kinetic energy into the hand. It does not
  // teleport the ball to equilibrium, delete previous data, or reset the clock.
  grab() {
    this.handWork -= 0.5 * this.parameters.mass * this.v ** 2;
    this.v = 0;
    this.held = true;
  }

  move(q) {
    if (!this.held) throw new Error('先抓住原钢球，再移动');
    if (!finite(q)) throw new RangeError('位移必须有限');
    const limit = this.parameters.maxDisplacement;
    const next = Math.max(-limit, Math.min(limit, q));
    this.handWork += 0.5 * this.parameters.stiffness * (next ** 2 - this.q ** 2);
    this.q = next;
    return this.q;
  }

  release() {
    // A held ball is released from rest. Throwing/flicking is outside this task.
    this.held = false;
    return this.observe();
  }

  // Exact advance of this state, not a preselected phase/amplitude animation.
  evolve(q, v, dt) {
    const p = this.parameters;
    const w0sq = p.stiffness / p.mass;
    const w = Math.sqrt(w0sq - p.beta ** 2);
    const e = Math.exp(-p.beta * dt),
      c = Math.cos(w * dt),
      s = Math.sin(w * dt);
    return {
      q: e * (q * c + ((v + p.beta * q) * s) / w),
      v: e * (v * c - ((w0sq * q + p.beta * v) * s) / w),
    };
  }

  startRecording({ interval = 0.04, duration = 4 } = {}) {
    if (!finite(interval, duration) || interval < 0.001 || duration < interval || duration > 60)
      throw new RangeError('采样间隔至少1ms，记录时长不超过60s');
    if (this.recording?.active) throw new Error('本次位置记录尚未结束');
    this.recording = { start: this.time, interval, duration, active: true };
    this.samples = [{ t: 0, q: this.q, held: this.held }];
  }

  stopRecording() {
    if (this.recording) this.recording.active = false;
  }

  advance(dt) {
    if (!finite(dt) || dt < 0) throw new RangeError('时间增量必须有限且非负');
    this.accumulator += dt;
    const h = 0.001;
    while (this.accumulator + 1e-12 >= h) {
      this.accumulator -= h;
      const q0 = this.q,
        v0 = this.v,
        before = this.observe().energy;
      if (!this.held) {
        const next = this.evolve(q0, v0, h);
        this.q = next.q;
        this.v = next.v;
        this.heat += Math.max(0, before - this.observe().energy);
        if ((q0 < 0 && this.q >= 0) || (q0 > 0 && this.q <= 0)) {
          const direction = Math.sign(this.v);
          const time = this.time + (h * q0) / (q0 - this.q);
          this.turns[direction]++;
          this.crossings.push({ time, direction, ordinal: this.turns[direction] });
          if (this.crossings.length > 100) this.crossings.shift();
        }
      }
      const r = this.recording;
      if (r?.active) {
        const t = this.samples.length * r.interval;
        const sampleTime = r.start + t;
        if (sampleTime <= this.time + h + 1e-10 && t <= r.duration + 1e-10) {
          const q = this.held ? this.q : this.evolve(q0, v0, Math.max(0, sampleTime - this.time)).q;
          this.samples.push({ t, q, held: this.held });
        }
        if (this.time + h >= r.start + r.duration - 1e-10) r.active = false;
      }
      this.time += h;
    }
    return this.observe();
  }
}

// Time remains the student's actual stopwatch reading. This only checks that
// start/stop are near equilibrium with the same direction and counts full cycles.
export function springTimingMark(model) {
  const { q, v, held } = model.observe();
  const w0sq = model.parameters.stiffness / model.parameters.mass;
  const amplitude = Math.hypot(q, v / Math.sqrt(w0sq));
  const direction = Math.sign(v);
  return {
    time: model.time,
    direction,
    atCenter: !held && amplitude > 0.003 && direction !== 0 && Math.abs(q) < 0.35 * amplitude,
    ordinal: direction ? model.turns[direction] + Number(q * direction < 0) : null,
  };
}
