// Thin-sheet enthalpy finite-volume model. Mica cleavage-plane anisotropy follows
// Jannettaz (1873), pp. 13–14, 53: one specimen had thermal-ellipse axis ratio 1.08.
// kx/ky = 1.08²; the absolute 2.4 W/(m K) scale is nominal, not that measurement.
export const THERMAL_SAMPLES = Object.freeze([
  Object.freeze({ id: 'glass', name: '玻璃片', kx: 1.2, ky: 1.2, thickness: 0.00045, rho: 2500, cp: 800 }),
  Object.freeze({
    id: 'mica',
    name: '云母解理片（指定晶向样片）',
    kx: 2.4 * 1.08 ** 2,
    ky: 2.4,
    thickness: 0.0003,
    rho: 2800,
    cp: 800,
  }),
]);
export const THERMAL_CONFIG = Object.freeze({
  side: 0.07,
  n: 97,
  ambient: 20,
  waxMassArea: 0.0108,
  waxCp: 2000,
  latent: 180000,
  meltLow: 54,
  meltHigh: 58,
  surfaceLoss: 14,
  ironCapacity: 0.35,
  power: 20,
  ironLoss: 0.08,
  contactG: 0.012,
  contactRadius: 0.0015,
});
export function meltFraction(t, p = THERMAL_CONFIG) {
  return Math.max(0, Math.min(1, (t - p.meltLow) / (p.meltHigh - p.meltLow)));
}
export class ThermalAnisotropy {
  constructor(options = {}) {
    this.p = Object.freeze({ ...THERMAL_CONFIG, ...options });
    const p = this.p;
    if (
      !Number.isInteger(p.n) ||
      p.n < 9 ||
      p.n > 129 ||
      !Object.values(p).every(Number.isFinite) ||
      p.side <= 0 ||
      p.ironCapacity <= 0 ||
      p.contactRadius <= 0 ||
      p.meltHigh <= p.meltLow ||
      p.meltLow <= p.ambient ||
      [p.waxMassArea, p.waxCp, p.latent, p.surfaceLoss, p.power, p.ironLoss, p.contactG].some((x) => x < 0)
    )
      throw new RangeError('传热参数无效');
    this.dx = p.side / p.n;
    this.area = this.dx ** 2;
    this.plates = THERMAL_SAMPLES.map((m) => ({
      ...m,
      C: m.rho * m.cp * m.thickness + p.waxMassArea * p.waxCp,
      E: new Float64Array(p.n * p.n),
      T: new Float64Array(p.n * p.n),
      delta: new Float64Array(p.n * p.n),
    }));
    this.reset();
  }
  reset() {
    this.time = this.work = this.loss = 0;
    this.on = false;
    this.iron = this.p.ambient;
    this.contact = null;
    this.weights = [];
    for (const s of this.plates) {
      s.E.fill(0);
      s.T.fill(this.p.ambient);
    }
  }
  setPower(on) {
    if (typeof on !== 'boolean') throw new RangeError('电源状态无效');
    this.on = on;
  }
  temperature(e, s) {
    const p = this.p,
      L = p.waxMassArea * p.latent,
      a = s.C * (p.meltLow - p.ambient),
      b = s.C * (p.meltHigh - p.ambient) + L;
    if (e < a) return p.ambient + e / s.C;
    if (e > b) return p.ambient + (e - L) / s.C;
    return p.meltLow + (e - a) / (s.C + L / (p.meltHigh - p.meltLow));
  }
  setContact(index = null, x = 0, y = 0) {
    if (
      index !== null &&
      (!Number.isInteger(index) ||
        index < 0 ||
        index >= this.plates.length ||
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        Math.abs(x) > this.p.side / 2 ||
        Math.abs(y) > this.p.side / 2)
    )
      throw new RangeError('接触位置无效');
    if (index === null) {
      this.contact = null;
      this.weights = [];
      return;
    }
    this.contact = { index, x, y };
    const p = this.p;
    this.weights = [];
    let sum = 0;
    for (let j = 0; j < p.n; j++)
      for (let i = 0; i < p.n; i++) {
        const px = (i + 0.5) * this.dx - p.side / 2,
          py = (j + 0.5) * this.dx - p.side / 2,
          r2 = (px - x) ** 2 + (py - y) ** 2;
        if (r2 < 9 * p.contactRadius ** 2) {
          const w = Math.exp(-r2 / (2 * p.contactRadius ** 2));
          this.weights.push([j * p.n + i, w]);
          sum += w;
        }
      }
    for (const pair of this.weights) pair[1] /= sum;
  }
  advance(dt) {
    if (!Number.isFinite(dt) || dt < 0) throw new RangeError('时间步无效');
    if (!dt) return;
    const p = this.p,
      n = p.n,
      limit = Math.min(0.015, ...this.plates.map((s) => (0.2 * s.C * this.dx ** 2) / ((s.kx + s.ky) * s.thickness)));
    const steps = Math.ceil(dt / limit),
      h = dt / steps;
    for (let k = 0; k < steps; k++) {
      let lost = p.ironLoss * (this.iron - p.ambient),
        contactPower = 0;
      if (this.contact) {
        const s = this.plates[this.contact.index];
        let temp = 0;
        for (const [i, w] of this.weights) temp += w * s.T[i];
        contactPower = p.contactG * (this.iron - temp);
      }
      for (let q = 0; q < this.plates.length; q++) {
        const s = this.plates[q],
          gx = (s.kx * s.thickness) / this.area,
          gy = (s.ky * s.thickness) / this.area;
        s.delta.fill(0);
        for (let j = 0; j < n; j++)
          for (let i = 0; i < n; i++) {
            const a = j * n + i;
            if (i < n - 1) {
              const flow = gx * (s.T[a + 1] - s.T[a]);
              s.delta[a] += flow;
              s.delta[a + 1] -= flow;
            }
            if (j < n - 1) {
              const flow = gy * (s.T[a + n] - s.T[a]);
              s.delta[a] += flow;
              s.delta[a + n] -= flow;
            }
            const air = p.surfaceLoss * (s.T[a] - p.ambient);
            s.delta[a] -= air;
            lost += air * this.area;
          }
        if (this.contact?.index === q) for (const [i, w] of this.weights) s.delta[i] += (contactPower * w) / this.area;
        for (let i = 0; i < s.E.length; i++) {
          s.E[i] += h * s.delta[i];
          s.T[i] = this.temperature(s.E[i], s);
        }
      }
      const input = this.on ? p.power : 0;
      this.iron += (h * (input - p.ironLoss * (this.iron - p.ambient) - contactPower)) / p.ironCapacity;
      this.work += input * h;
      this.loss += lost * h;
      this.time += h;
    }
  }
  get energy() {
    return (
      this.p.ironCapacity * (this.iron - this.p.ambient) +
      this.plates.reduce((sum, s) => sum + s.E.reduce((a, b) => a + b, 0) * this.area, 0)
    );
  }
  shape(index) {
    const s = this.plates[index],
      p = this.p;
    let weight = 0,
      x = 0,
      y = 0,
      count = 0,
      max = 0,
      xmin = Infinity,
      xmax = -Infinity,
      ymin = Infinity,
      ymax = -Infinity;
    const threshold = (p.meltLow + p.meltHigh) / 2;
    const extend = (u, v) => {
      xmin = Math.min(xmin, u);
      xmax = Math.max(xmax, u);
      ymin = Math.min(ymin, v);
      ymax = Math.max(ymax, v);
    };
    for (let j = 0; j < p.n; j++)
      for (let i = 0; i < p.n; i++) {
        const a = j * p.n + i,
          t = s.T[a],
          u = (i + 0.5) * this.dx - p.side / 2,
          v = (j + 0.5) * this.dx - p.side / 2;
        for (const [b, du, dv] of [
          [i + 1 < p.n ? a + 1 : a, this.dx, 0],
          [j + 1 < p.n ? a + p.n : a, 0, this.dx],
        ]) {
          const other = s.T[b];
          if (t < threshold !== other < threshold) {
            const f = (threshold - t) / (other - t);
            extend(u + f * du, v + f * dv);
          }
        }
        const f = meltFraction(t, p);
        max = Math.max(max, f);
        if (f < 0.5) continue;
        weight += f;
        x += u * f;
        y += v * f;
        count++;
      }
    if (!weight) return { count: 0, ratio: 1, x: 0, y: 0, max };
    x /= weight;
    y /= weight;
    return {
      count: count * (65 / p.n) ** 2,
      ratio: (xmax - xmin) / Math.max(1e-14, ymax - ymin),
      x,
      y,
      max,
    };
  }
}
