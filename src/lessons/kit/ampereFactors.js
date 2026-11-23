// 图13.2-1：四个固定引线点之间通电；三块磁体始终并排、磁场方向向上。
// 匀强场和轻软悬线近似，忽略窄缝/边缘场、电感及电阻温升。
export const AMPERE_TAPS = Object.freeze([-0.06, -0.02, 0.02, 0.06]);
export const AMPERE_DEFAULTS = Object.freeze({
  mass: 0.016,
  suspension: 0.14,
  field: 0.35,
  gravity: 9.8,
  damping: 10,
  emf: 3,
  sourceOhms: 0.1,
  ballastOhms: 1.5,
  meterOhms: 0.004,
  leadOhms: 0.04,
  rodOhmsPerMetre: 0.004,
  rheostatOhms: 5,
});
export class AmpereFactors {
  constructor(parameters = {}) {
    this.p = Object.freeze({ ...AMPERE_DEFAULTS, ...parameters });
    if (
      !Object.values(this.p).every((x) => Number.isFinite(x) && x >= 0) ||
      !(
        this.p.mass > 0 &&
        this.p.suspension > 0 &&
        this.p.gravity > 0 &&
        this.p.sourceOhms + this.p.ballastOhms + this.p.meterOhms + this.p.leadOhms > 0
      )
    )
      throw new RangeError('装置参数无效');
    this.reset();
  }
  reset() {
    this.angle = this.speed = this.time = this.sourceWork = this.heat = this.dampingHeat = 0;
    this.closed = false;
    this.position = 0.5;
    this.connections = [1, 2];
  }
  setPosition(v) {
    if (!Number.isFinite(v)) throw new RangeError('滑片位置无效');
    this.position = Math.max(0, Math.min(1, v));
  }
  setClosed(v) {
    if (typeof v !== 'boolean') throw new RangeError('开关状态无效');
    this.closed = v;
  }
  connect(red, black) {
    if (![red, black].every((i) => i === null || (Number.isInteger(i) && i >= 0 && i < 4)))
      throw new RangeError('接线点无效');
    this.connections = [red, black];
  }
  get signedLength() {
    return this.connections.includes(null) ? 0 : AMPERE_TAPS[this.connections[1]] - AMPERE_TAPS[this.connections[0]];
  }
  get resistance() {
    const p = this.p;
    return (
      p.sourceOhms +
      p.ballastOhms +
      p.meterOhms +
      p.leadOhms +
      p.rodOhmsPerMetre * Math.abs(this.signedLength) +
      p.rheostatOhms * this.position
    );
  }
  electrical(angle = this.angle, speed = this.speed) {
    const p = this.p,
      k = p.field * this.signedLength,
      velocity = p.suspension * Math.cos(angle) * speed;
    // The rod's motional emf opposes mechanical power delivered by the field.
    const current = this.closed && !this.connections.includes(null) ? (p.emf - k * velocity) / this.resistance : 0;
    return { current, force: k * current, emf: k * velocity, velocity };
  }
  energy(angle = this.angle, speed = this.speed) {
    const p = this.p;
    return 0.5 * p.mass * (p.suspension * speed) ** 2 + p.mass * p.gravity * p.suspension * (1 - Math.cos(angle));
  }
  derivative(state) {
    const [a, w] = state,
      p = this.p,
      e = this.electrical(a, w);
    return [
      w,
      (e.force * Math.cos(a) - p.mass * p.gravity * Math.sin(a)) / (p.mass * p.suspension) - p.damping * w,
      p.emf * e.current,
      e.current ** 2 * this.resistance,
      p.damping * p.mass * p.suspension ** 2 * w * w,
    ];
  }
  advance(dt) {
    if (!(Number.isFinite(dt) && dt >= 0)) throw new RangeError('时间步无效');
    if (!dt) return;
    const n = Math.ceil(dt * 480),
      h = dt / n;
    let y = [this.angle, this.speed, this.sourceWork, this.heat, this.dampingHeat];
    for (let j = 0; j < n; j++) {
      const k1 = this.derivative(y),
        k2 = this.derivative(y.map((v, i) => v + (h * k1[i]) / 2)),
        k3 = this.derivative(y.map((v, i) => v + (h * k2[i]) / 2)),
        k4 = this.derivative(y.map((v, i) => v + h * k3[i]));
      y = y.map((v, i) => v + (h * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])) / 6);
    }
    [this.angle, this.speed, this.sourceWork, this.heat, this.dampingHeat] = y;
    this.time += dt;
  }
  get settled() {
    const p = this.p,
      { force } = this.electrical();
    return (
      Math.abs(this.speed) < 0.0015 &&
      Math.abs(force * Math.cos(this.angle) - p.mass * p.gravity * Math.sin(this.angle)) < 0.00025
    );
  }
}
