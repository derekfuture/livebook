// 选必二 p.71 图4.1-1。单刀双掷开关：电容充电 / 接入线圈 / 中间断开。
// 线圈的等效小电容承接断路暂态，不强行清空电感电流；不预测电弧和击穿。
// x = [sqrt(C) Vc, sqrt(Cp) Vl, sqrt(L) I, 1]，前三项平方和的一半是储能。
const identity = (n) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => +(i === j)));
const multiply = (a, b) => a.map((row) => b[0].map((_, j) => row.reduce((s, v, k) => s + v * b[k][j], 0)));
function exponential(matrix, dt) {
  const n = matrix.length,
    norm = Math.max(...matrix.map((row) => row.reduce((s, v) => s + Math.abs(v), 0))) * dt;
  const power = Math.max(0, Math.ceil(Math.log2(Math.max(1, norm / 0.25))));
  const a = matrix.map((row) => row.map((v) => (v * dt) / 2 ** power));
  let result = identity(n),
    term = identity(n);
  for (let k = 1; k <= 18; k++) {
    term = multiply(term, a).map((row) => row.map((v) => v / k));
    result = result.map((row, i) => row.map((v, j) => v + term[i][j]));
  }
  for (let k = 0; k < power; k++) result = multiply(result, result);
  return result;
}
const pairs = [];
for (let i = 0; i < 4; i++) for (let j = i; j < 4; j++) pairs.push([i, j]);
const index = (i, j) => pairs.findIndex(([a, b]) => a === Math.min(i, j) && b === Math.max(i, j));
export class LCOscillation {
  constructor({
    C = 47e-6,
    L = 0.5,
    coilR = 8,
    source = 6,
    chargeR = 10000,
    contactR = 0.5,
    openR = 1e9,
    sensorR = 1e6,
    strayC = 2e-9,
    strayR = 1e5,
    timeStep = 0.0001,
  } = {}) {
    if (
      ![C, L, chargeR, contactR, openR, sensorR, strayC, strayR, timeStep].every((x) => Number.isFinite(x) && x > 0) ||
      !Number.isFinite(coilR) ||
      coilR < 0 ||
      !Number.isFinite(source)
    )
      throw new RangeError('Finite passive circuit parameters required');
    Object.assign(this, { C, L, coilR, source, chargeR, contactR, openR, sensorR, strayC, strayR });
    this.step = timeStep;
    this.transitions = new Map();
    this.reset();
  }
  reset() {
    this.voltage = this.coilVoltage = this.current = this.time = this.remainder = 0;
    this.sourceWork = this.chargeHeat = this.contactHeat = this.coilHeat = this.leakHeat = 0;
    this.contact = 'open';
  }
  setSwitch(contact) {
    if (!['open', 'charge', 'oscillate'].includes(contact)) throw new RangeError('Unknown switch contact');
    this.contact = contact;
  }
  energy() {
    return 0.5 * (this.C * this.voltage ** 2 + this.strayC * this.coilVoltage ** 2 + this.L * this.current ** 2);
  }
  get dissipated() {
    return this.chargeHeat + this.contactHeat + this.coilHeat + this.leakHeat;
  }
  observe() {
    return {
      time: this.time,
      voltage: this.voltage,
      current: this.current,
      coilVoltage: this.coilVoltage,
      charge: this.C * this.voltage,
      energy: this.energy(),
    };
  }
  // Integrate quadratic resistor powers alongside the state, rather than defining loss
  // as whatever is needed to close the energy balance. Ten products x_i*x_j close linearly.
  transition() {
    if (this.transitions.has(this.contact)) return this.transitions.get(this.contact);
    const C = this.C,
      P = this.strayC,
      L = this.L,
      g = this.contact === 'oscillate' ? 1 / this.contactR : 1 / this.openR;
    const q = this.contact === 'charge' ? 1 / this.chargeR : 0,
      s = 1 / this.sensorR,
      p = 1 / this.strayR,
      E = this.source;
    const a = [
      [-(q + s + g) / C, g / Math.sqrt(C * P), 0, (q * E) / Math.sqrt(C)],
      [g / Math.sqrt(C * P), -(g + p) / P, -1 / Math.sqrt(L * P), 0],
      [0, 1 / Math.sqrt(L * P), -this.coilR / L, 0],
      [0, 0, 0, 0],
    ];
    const m = Array.from({ length: 15 }, () => Array(15).fill(0));
    pairs.forEach(([i, j], row) => {
      for (let k = 0; k < 4; k++) {
        m[row][index(k, j)] += a[i][k];
        m[row][index(i, k)] += a[j][k];
      }
    });
    // source work, charging resistor, contact, winding, and sensor/dielectric losses
    m[10][index(3, 3)] = q * E * E;
    m[10][index(0, 3)] = (-q * E) / Math.sqrt(C);
    m[11][index(3, 3)] = q * E * E;
    m[11][index(0, 3)] = (-2 * q * E) / Math.sqrt(C);
    m[11][index(0, 0)] = q / C;
    m[12][index(0, 0)] = g / C;
    m[12][index(1, 1)] = g / P;
    m[12][index(0, 1)] = (-2 * g) / Math.sqrt(C * P);
    m[13][index(2, 2)] = this.coilR / L;
    m[14][index(0, 0)] = s / C;
    m[14][index(1, 1)] = p / P;
    const transition = exponential(m, this.step);
    this.transitions.set(this.contact, transition);
    return transition;
  }
  advance(dt) {
    if (!(dt > 0) || !Number.isFinite(dt)) return;
    this.remainder += dt;
    const t = this.transition();
    while (this.remainder + 1e-12 >= this.step) {
      this.remainder -= this.step;
      const x = [
        Math.sqrt(this.C) * this.voltage,
        Math.sqrt(this.strayC) * this.coilVoltage,
        Math.sqrt(this.L) * this.current,
        1,
      ];
      const z = [...pairs.map(([i, j]) => x[i] * x[j]), 0, 0, 0, 0, 0];
      const next = t.map((row) => row.reduce((sum, v, k) => sum + v * z[k], 0));
      this.voltage = next[index(0, 3)] / Math.sqrt(this.C);
      this.coilVoltage = next[index(1, 3)] / Math.sqrt(this.strayC);
      this.current = next[index(2, 3)] / Math.sqrt(this.L);
      this.sourceWork += next[10];
      this.chargeHeat += next[11];
      this.contactHeat += next[12];
      this.coilHeat += next[13];
      this.leakHeat += next[14];
      this.time += this.step;
      this.onStep?.(this.observe());
    }
  }
}
