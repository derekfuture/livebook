// 必修三 p.115 图13.3-3：互感两回路，磁链为状态，故移动线圈改变 M 时也保留磁链连续。
// 开关断开由等效小电容承接暂态；闭合时电容短路的能量记入接点损耗。
// 此线性模型不预测电弧、击穿或真实开关峰值电压。参数是教学模型设值。
const identity = (n) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => +(i === j)));
const mul = (a, b) => a.map((row) => b[0].map((_, j) => row.reduce((s, v, k) => s + v * b[k][j], 0)));
// 缩放、Taylor 级数、平方恢复。磁链/电容电压使用平衡量纲以避免极端刚性矩阵失准。
function exponential(matrix, dt) {
  const n = matrix.length,
    norm = Math.max(...matrix.map((r) => r.reduce((s, v) => s + Math.abs(v), 0))) * dt;
  const power = Math.max(0, Math.ceil(Math.log2(Math.max(1, norm / 0.25))));
  const a = matrix.map((r) => r.map((v) => (v * dt) / 2 ** power));
  let result = identity(n),
    term = identity(n);
  for (let k = 1; k <= 18; k++) {
    term = mul(term, a).map((r) => r.map((v) => v / k));
    result = result.map((r, i) => r.map((v, j) => v + term[i][j]));
  }
  for (let k = 0; k < power; k++) result = mul(result, result);
  return result;
}
export class MutualInduction {
  constructor({
    L1 = 0.003,
    L2 = 0.012,
    coupling = 0.75,
    voltage = 6,
    primaryR = 12,
    secondaryR = 100,
    capacitance = 1e-9,
    meterOmega = 18,
    meterDamping = 0.8,
  } = {}) {
    if (!(L1 > 0 && L2 > 0 && capacitance > 0 && primaryR > 0 && secondaryR > 0 && Math.abs(coupling) < 1))
      throw new RangeError('Passive coupled circuit required');
    Object.assign(this, { L1, L2, voltage, primaryR, secondaryR, capacitance, meterOmega, meterDamping });
    this.initialCoupling = coupling;
    this.impedance = Math.sqrt(L1 / capacitance);
    this.reset();
  }
  reset() {
    this.closed = false;
    this.resistance = 28;
    this.M = this.initialCoupling * Math.sqrt(this.L1 * this.L2);
    this.x = [0, 0, this.voltage / this.impedance, 0, 0, 1];
    this.contactLoss = 0;
    this.mechanicalWork = 0;
    this.time = 0;
    this.cache = null;
  }
  switch(closed) {
    if (closed && !this.closed) {
      this.contactLoss += 0.5 * this.capacitance * (this.x[2] * this.impedance) ** 2;
      this.x[2] = 0;
    }
    this.closed = !!closed;
  }
  setResistance(value) {
    if (!(value >= 0 && Number.isFinite(value))) throw new RangeError('Nonnegative resistance required');
    this.resistance = value;
  }
  setCoupling(k) {
    if (!Number.isFinite(k) || Math.abs(k) >= 1) throw new RangeError('Coupling magnitude must be below one');
    const before = this.observe().magneticEnergy;
    this.M = k * Math.sqrt(this.L1 * this.L2);
    this.mechanicalWork += this.observe().magneticEnergy - before;
  }
  observe() {
    const a = this.M / this.L1,
      b = this.M / this.L2,
      d = 1 - a * b;
    const i1 = (this.x[0] - a * this.x[1]) / d,
      i2 = (this.x[1] - b * this.x[0]) / d;
    const magneticEnergy = 0.5 * (this.L1 * this.x[0] * i1 + this.L2 * this.x[1] * i2);
    const capacitorV = this.x[2] * this.impedance;
    return {
      i1,
      i2,
      flux1: this.x[0] * this.L1,
      flux2: this.x[1] * this.L2,
      meter: this.x[3],
      meterSpeed: this.x[4] * this.meterOmega,
      capacitorV,
      magneticEnergy,
      energy: magneticEnergy + 0.5 * this.capacitance * capacitorV ** 2,
      dissipation: (this.primaryR + this.resistance) * i1 * i1 + this.secondaryR * i2 * i2,
      sourcePower: this.voltage * i1,
    };
  }
  matrix() {
    const a = this.M / this.L1,
      b = this.M / this.L2,
      d = 1 - a * b,
      r = this.primaryR + this.resistance,
      w = this.meterOmega;
    const m = Array.from({ length: 6 }, () => Array(6).fill(0));
    m[0][0] = -r / (this.L1 * d);
    m[0][1] = (r * a) / (this.L1 * d);
    m[0][2] = this.closed ? 0 : -this.impedance / this.L1;
    m[0][5] = this.voltage / this.L1;
    m[1][0] = (this.secondaryR * b) / (this.L2 * d);
    m[1][1] = -this.secondaryR / (this.L2 * d);
    if (!this.closed) {
      m[2][0] = 1 / (this.capacitance * this.impedance * d);
      m[2][1] = -a / (this.capacitance * this.impedance * d);
    }
    m[3][4] = w;
    m[4][0] = (-w * b) / d;
    m[4][1] = w / d;
    m[4][3] = -w;
    m[4][4] = -2 * this.meterDamping * w;
    return m;
  }
  advance(dt) {
    if (!(dt > 0 && Number.isFinite(dt))) return this.observe();
    const key = [dt, this.closed, this.resistance, this.M].join(':');
    if (this.cache?.key !== key) this.cache = { key, transition: exponential(this.matrix(), dt) };
    this.x = this.cache.transition.map((r) => r.reduce((s, v, j) => s + v * this.x[j], 0));
    this.x[5] = 1;
    this.time += dt;
    return this.observe();
  }
}

// 有限长内线圈轴上场沿外线圈高度取平均，再归一到完全插入时的耦合。
// 忽略离轴场与绕组厚度，不作为实物互感标定；外观匝数仅作示意。
export function couplingAtHeight(bottom) {
  const average = (lower) => {
    let sum = 0;
    for (let i = 0; i < 24; i++) {
      const y = 0.01 + (0.06 * (i + 0.5)) / 24;
      const a = y - lower,
        b = y - lower - 0.075;
      sum += a / Math.hypot(0.021, a) - b / Math.hypot(0.021, b);
    }
    return sum / 24;
  };
  return 0.75 * Math.min(1, average(bottom) / average(0.01));
}
