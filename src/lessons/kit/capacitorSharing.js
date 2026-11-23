// 必修三 p.40 图10.4-4。A、B 的负极共接电源负极；S1 公共端接
// A 正极，1 接电源正极，2 接 B 正极。S2 跨接 B 的两极。
// Linear lumped RC model: finite lead/contact paths, finite meter input
// across A. Capacitors are ideal: no ESR, dielectric absorption, extra
// insulation leakage or inductance. Shared capacitor ESR is not counted again
// in multiple branches when S1=2 and S2 closes simultaneously.
// The source is an ideal fixed emf behind a finite series resistance.
export const SHARING_DEFAULTS = Object.freeze({
  capacitanceA: 2200e-6,
  capacitanceB: 2200e-6,
  sourceVolts: 6,
  chargeOhms: 1,
  shareOhms: 2,
  dischargeOhms: 2,
  meterOhms: 10e6,
});
const X = [
  -0.9602898564975363, -0.7966664774136267, -0.525532409916329, -0.1834346424956498, 0.1834346424956498,
  0.525532409916329, 0.7966664774136267, 0.9602898564975363,
];
const W = [
  0.1012285362903763, 0.2223810344533745, 0.3137066458778873, 0.362683783378362, 0.362683783378362, 0.3137066458778873,
  0.2223810344533745, 0.1012285362903763,
];
const finite = Number.isFinite;

export class CapacitorSharing {
  constructor(parameters = {}) {
    this.parameters = Object.freeze({ ...SHARING_DEFAULTS, ...parameters });
    const p = this.parameters;
    if (
      ![p.capacitanceA, p.capacitanceB, p.chargeOhms, p.shareOhms, p.dischargeOhms].every((x) => finite(x) && x > 0) ||
      !(p.meterOhms > 0 && (finite(p.meterOhms) || p.meterOhms === Infinity)) ||
      !finite(p.sourceVolts)
    )
      throw new RangeError('电容、电阻和电源参数必须有效');
    this.reset();
  }
  reset({ voltageA = 0, voltageB = 0 } = {}) {
    if (![voltageA, voltageB].every(finite)) throw new RangeError('初始电压必须有限');
    this.voltages = [voltageA, voltageB];
    this.contact = 0;
    this.discharging = false;
    this.time = 0;
    this.transferred = { source: 0, sharing: 0, discharge: 0, meter: 0 };
    this.heat = { source: 0, sharing: 0, discharge: 0, meter: 0 };
    this.sourceWork = 0;
    this.initialEnergy = this.energy();
    this.initialCharges = this.charges;
  }
  setContact(contact) {
    if (![0, 1, 2].includes(contact)) throw new RangeError('S1只能断开、接1或接2');
    this.contact = contact;
  }
  setDischarge(closed) {
    if (typeof closed !== 'boolean') throw new RangeError('S2状态必须为布尔值');
    this.discharging = closed;
  }
  get charges() {
    return [this.parameters.capacitanceA * this.voltages[0], this.parameters.capacitanceB * this.voltages[1]];
  }
  energy() {
    return this.voltages.reduce(
      (e, v, i) => e + 0.5 * v * v * (i ? this.parameters.capacitanceB : this.parameters.capacitanceA),
      0,
    );
  }
  conductances() {
    const p = this.parameters;
    return {
      source: this.contact === 1 ? 1 / p.chargeOhms : 0,
      sharing: this.contact === 2 ? 1 / p.shareOhms : 0,
      discharge: this.discharging ? 1 / p.dischargeOhms : 0,
      meter: 1 / p.meterOhms,
    };
  }
  currents(voltages = this.voltages) {
    const [a, b] = voltages,
      g = this.conductances();
    return {
      source: g.source * (this.parameters.sourceVolts - a),
      sharing: g.sharing * (a - b),
      discharge: g.discharge * b,
      meter: g.meter * a,
    };
  }
  derivatives() {
    const i = this.currents(),
      p = this.parameters;
    return [(i.source - i.sharing - i.meter) / p.capacitanceA, (i.sharing - i.discharge) / p.capacitanceB];
  }
  // Symmetrise C dV/dt = -G V + I using x=sqrt(C) V. The two modes
  // integrate exactly between switch events, including the zero-rate mode
  // when an ideal meter and disconnected supply leave total charge fixed.
  trajectory() {
    const p = this.parameters,
      g = this.conductances(),
      root = [Math.sqrt(p.capacitanceA), Math.sqrt(p.capacitanceB)],
      a = (g.source + g.sharing + g.meter) / p.capacitanceA,
      d = (g.sharing + g.discharge) / p.capacitanceB,
      b = -g.sharing / (root[0] * root[1]);
    let rates, axes;
    if (b === 0) {
      rates = [a, d];
      axes = [
        [1, 0],
        [0, 1],
      ];
    } else {
      const spread = Math.hypot(a - d, 2 * b),
        fast = (a + d + spread) / 2;
      // Expand the determinant into positive conductance products, avoiding
      // cancellation between g_share^2 terms when the meter is very weak.
      const determinant =
        ((g.source + g.meter) * (g.discharge + g.sharing) + g.sharing * g.discharge) /
        (p.capacitanceA * p.capacitanceB);
      const theta = 0.5 * Math.atan2(2 * b, a - d),
        c = Math.cos(theta),
        s = Math.sin(theta);
      rates = [fast, determinant / fast];
      axes = [
        [c, s],
        [-s, c],
      ];
    }
    const initial = [...this.voltages],
      x = initial.map((v, i) => root[i] * v),
      forcing = [(g.source * p.sourceVolts) / root[0], 0];
    const modes = axes.map((axis, i) => {
      const u = axis[0] * x[0] + axis[1] * x[1],
        f = axis[0] * forcing[0] + axis[1] * forcing[1];
      return { axis, rate: rates[i], initial: u, target: rates[i] > 0 ? f / rates[i] : u };
    });
    const at = (t) => {
      const change = [0, 0];
      for (const mode of modes) {
        const delta = (mode.target - mode.initial) * -Math.expm1(-mode.rate * t);
        for (let i = 0; i < 2; i++) change[i] += mode.axis[i] * delta;
      }
      return initial.map((v, i) => v + change[i] / root[i]);
    };
    return { at, rates, conductance: g };
  }
  advance(dt) {
    if (!finite(dt) || dt < 0) throw new RangeError('时间增量必须有限且非负');
    if (dt === 0) return;
    const { at, rates, conductance: g } = this.trajectory(),
      p = this.parameters;
    // Independent quadrature of branch currents and I²R, not heat assigned as
    // an energy remainder. Split at modal time scales so millisecond charging
    // and hour-scale meter loading remain resolved even in one large advance.
    const breaks = [0, dt];
    for (const rate of rates)
      if (rate > 0)
        for (const n of [1, 2, 4, 8, 16, 32, 64]) {
          const t = n / rate;
          if (t < dt) breaks.push(t);
        }
    breaks.sort((a, b) => a - b);
    const charge = { source: 0, sharing: 0, discharge: 0, meter: 0 },
      heat = { ...charge };
    for (let j = 1; j < breaks.length; j++) {
      const half = (breaks[j] - breaks[j - 1]) / 2,
        mid = (breaks[j] + breaks[j - 1]) / 2;
      for (let k = 0; k < X.length; k++) {
        const [a, b] = at(mid + half * X[k]),
          weight = half * W[k];
        const drops = { source: p.sourceVolts - a, sharing: a - b, discharge: b, meter: a };
        for (const name of Object.keys(drops)) {
          const current = g[name] * drops[name];
          charge[name] += weight * current;
          heat[name] += weight * current * drops[name];
        }
      }
    }
    this.voltages = at(dt);
    this.time += dt;
    for (const name of Object.keys(charge)) {
      this.transferred[name] += charge[name];
      this.heat[name] += heat[name];
    }
    this.sourceWork += p.sourceVolts * charge.source;
  }
}
