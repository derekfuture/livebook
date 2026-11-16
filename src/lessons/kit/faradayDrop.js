// 选必二 p.30 图2.2-1：磁体沿绝缘玻璃管落下，线圈接高输入电阻电压传感器。
// 有限长度磁体用轴向磁极对近似；对线圈厚度取平均。模型尺度不是教材给定磁场。
export const DROP_TOP = 0.6,
  MAGNET_LENGTH = 0.04,
  COIL_THICKNESS = 0.012,
  COIL_RADIUS = 0.025;
const fluxScale = 4e-6;
export function dropFlux(z, { turns = 300, strength = 1, polarity = 1 } = {}) {
  let flux = 0,
    gradient = 0;
  const n = 24,
    r2 = COIL_RADIUS ** 2;
  for (let j = 0; j < n; j++) {
    const x = z - COIL_THICKNESS * ((j + 0.5) / n - 0.5),
      a = x + MAGNET_LENGTH / 2,
      b = x - MAGNET_LENGTH / 2;
    flux += a / Math.hypot(COIL_RADIUS, a) - b / Math.hypot(COIL_RADIUS, b);
    gradient += r2 / (r2 + a * a) ** 1.5 - r2 / (r2 + b * b) ** 1.5;
  }
  const scale = (turns * strength * polarity * fluxScale) / n;
  return { linkage: flux * scale, gradient: gradient * scale };
}
export class FaradayDrop {
  constructor({ distance = 0.2, turns = 300, strength = 1, polarity = 1, inputResistance = 1e6, mass = 0.02 } = {}) {
    Object.assign(this, { distance, turns, strength, polarity, inputResistance, mass });
    this.reset();
  }
  reset() {
    this.y = DROP_TOP;
    this.v = 0;
    this.time = 0;
    this.running = false;
    this.finished = false;
    this.peak = 0;
    this.positivePeak = 0;
    this.negativePeak = 0;
    this.joule = 0;
    this.impactEnergy = 0;
    this.samples = [];
    this.accumulator = 0;
    this.ticks = 0;
  }
  get coilY() {
    return DROP_TOP - this.distance;
  }
  get coilResistance() {
    return 0.08 * this.turns;
  }
  observe(y = this.y, v = this.v) {
    const field = dropFlux(y - this.coilY, this),
      emf = -field.gradient * v;
    const current = emf / (this.inputResistance + this.coilResistance),
      voltage = current * this.inputResistance;
    const force = current * field.gradient;
    return { ...field, emf, current, voltage, force, acceleration: -9.8 + force / this.mass };
  }
  release() {
    if (this.running || this.finished) return false;
    this.running = true;
    return true;
  }
  integrate(h) {
    const y = this.y,
      v = this.v;
    const a = this.observe(y, v),
      vb = v + (a.acceleration * h) / 2,
      b = this.observe(y + (v * h) / 2, vb),
      vc = v + (b.acceleration * h) / 2,
      c = this.observe(y + (vb * h) / 2, vc),
      vd = v + c.acceleration * h,
      d = this.observe(y + vc * h, vd);
    const power = (s) => s.current ** 2 * (this.inputResistance + this.coilResistance);
    return {
      y: y + (h * (v + 2 * vb + 2 * vc + vd)) / 6,
      v: v + (h * (a.acceleration + 2 * b.acceleration + 2 * c.acceleration + d.acceleration)) / 6,
      joule: (h * (power(a) + 2 * power(b) + 2 * power(c) + power(d))) / 6,
    };
  }
  // 固定 0.1 ms 物理步长捕获峰值，与渲染帧率无关。电压传感器为高阻、无额外滤波的近似。
  advance(dt) {
    if (!this.running || !(dt > 0)) return this.observe();
    this.accumulator += dt;
    const h = 0.0001;
    while (this.accumulator >= h && this.running) {
      this.accumulator -= h;
      // Locate contact within this step, rather than clamping an overshot position.
      // Otherwise the extra fall manufactures impact energy.
      const floor = 0.015 + MAGNET_LENGTH / 2;
      let duration = h,
        next = this.integrate(h);
      const hit = next.y <= floor;
      if (hit) {
        let lo = 0,
          hi = h;
        for (let j = 0; j < 32; j++) {
          const mid = (lo + hi) / 2;
          if (this.integrate(mid).y > floor) lo = mid;
          else hi = mid;
        }
        duration = (lo + hi) / 2;
        next = this.integrate(duration);
      }
      this.y = next.y;
      this.v = next.v;
      this.joule += next.joule;
      this.time += duration;
      this.ticks++;
      const s = this.observe();
      this.peak = Math.max(this.peak, Math.abs(s.voltage));
      this.positivePeak = Math.max(this.positivePeak, s.voltage);
      this.negativePeak = Math.min(this.negativePeak, s.voltage);
      if (this.ticks % 10 === 0) this.samples.push([this.time, s.voltage]);
      if (hit) {
        this.impactEnergy = 0.5 * this.mass * this.v * this.v;
        this.y = floor;
        this.v = 0;
        this.running = false;
        this.finished = true;
        this.samples.push([this.time, 0]);
      }
    }
    return this.observe();
  }
}
