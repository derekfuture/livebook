// Long-time laminar capillary flow: capillary pressure + hydrostatic head versus Poiseuille resistance.
// The first inertial entry transient, evaporation and contact-angle hysteresis are not resolved.
export const CAPILLARY_WATER = Object.freeze({
  density: 998.2,
  viscosity: 0.001002,
  surfaceTension: 0.07274,
  gravity: 9.8,
  level: 0.045,
});
export const CAPILLARY_SPECS = Object.freeze([
  ...[0.0004, 0.0008, 0.0012].map((radius, i) => Object.freeze({ id: 'G' + (i + 1), kind: 'glass', radius, angle: 0 })),
  ...[0.0004, 0.0008, 0.0012].map((radius, i) =>
    Object.freeze({ id: 'P' + (i + 1), kind: 'plastic', radius, angle: (100 * Math.PI) / 180 }),
  ),
]);
export function capillaryHeight(radius, angle, p = CAPILLARY_WATER) {
  return (2 * p.surfaceTension * Math.cos(angle)) / (p.density * p.gravity * radius);
}
export function meniscusProfile(radius, angle, fraction) {
  const c = Math.cos(angle);
  if (Math.abs(c) < 1e-10) return 0;
  const R = radius / Math.abs(c),
    r = radius * Math.min(1, Math.max(0, fraction));
  return Math.sign(c) * (R - Math.sqrt(Math.max(0, R * R - r * r)));
}
export function meniscusMean(radius, angle) {
  const c = Math.cos(angle);
  if (Math.abs(c) < 1e-10) return 0;
  const R = radius / Math.abs(c);
  return Math.sign(c) * (R - (2 * (R ** 3 - Math.max(0, R * R - radius * radius) ** 1.5)) / (3 * radius * radius));
}
export class CapillaryTube {
  constructor(spec, { length = 0.12, bottom = 0.09, water = CAPILLARY_WATER } = {}) {
    if (
      !(
        spec.radius > 0 &&
        Number.isFinite(spec.radius) &&
        Number.isFinite(spec.angle) &&
        spec.angle >= 0 &&
        spec.angle <= Math.PI &&
        length > 0 &&
        Number.isFinite(length)
      )
    )
      throw new RangeError('毛细管参数无效');
    this.spec = spec;
    this.water = water;
    this.length = length;
    this.reset(bottom);
  }
  reset(bottom = 0.09) {
    this.bottom = bottom;
    this.filled = 0;
    this.rate = 0;
    this.time = 0;
    this.wet = false;
  }
  setBottom(v) {
    if (!Number.isFinite(v)) throw new RangeError('管口位置无效');
    this.bottom = v;
  }
  get connected() {
    return this.bottom < this.water.level;
  }
  get equilibrium() {
    return Math.max(
      0,
      Math.min(
        this.length,
        this.water.level - this.bottom + capillaryHeight(this.spec.radius, this.spec.angle, this.water),
      ),
    );
  }
  get retention() {
    const { surfaceTension: s, density: r, gravity: g } = this.water;
    return Math.max(0, (2 * s * (1 + Math.cos(this.spec.angle))) / (r * g * this.spec.radius));
  }
  get overflow() {
    return (
      this.connected &&
      this.water.level - this.bottom + capillaryHeight(this.spec.radius, this.spec.angle, this.water) > this.length
    );
  }
  get center() {
    const amount = Math.min(1, this.filled / (2 * this.spec.radius));
    return this.bottom + Math.max(0, this.filled - amount * meniscusMean(this.spec.radius, this.spec.angle));
  }
  get settled() {
    return (
      this.connected &&
      !this.overflow &&
      Math.abs(this.filled - this.equilibrium) < 0.00005 &&
      Math.abs(this.rate) < 0.00012
    );
  }
  advance(dt) {
    if (!(Number.isFinite(dt) && dt >= 0)) throw new RangeError('时间步无效');
    if (!dt) return;
    const p = this.water,
      r = this.spec.radius,
      k = (r * r) / (8 * p.viscosity),
      entry = 2 * r,
      n = Math.max(1, Math.ceil(dt * 1200)),
      h = dt / n;
    for (let i = 0; i < n; i++) {
      const old = this.filled;
      if (this.connected) {
        const pressure =
            (2 * p.surfaceTension * Math.cos(this.spec.angle)) / r + p.density * p.gravity * (p.level - this.bottom),
          b = entry - old + k * h * p.density * p.gravity,
          c = -entry * old - k * h * pressure;
        this.filled = Math.max(0, Math.min(this.length, (-b + Math.sqrt(Math.max(0, b * b - 4 * c))) / 2));
        if (this.filled > 1e-6) this.wet = true;
      } else if (this.filled > this.retention) {
        const excess = this.filled - this.retention;
        this.filled =
          this.retention + excess * Math.exp((-k * p.density * p.gravity * h) / Math.max(this.filled + entry, entry));
      }
      this.rate = (this.filled - old) / h;
      this.time += h;
    }
  }
}
