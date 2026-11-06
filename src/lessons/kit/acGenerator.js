// 选必二 p.50 图3.1-2。匀强磁场中的转动线圈，经两个滑环接反向并联 LED。
// theta 为线圈正法线与磁场正方向的夹角。所有参数为演示装置设值。
export const GENERATOR = {
  turns: 400,
  field: 0.35,
  area: 0.0064,
  coilResistance: 60,
  seriesResistance: 180,
  diodeResistance: 10,
  redDrop: 1.8,
  yellowDrop: 2.0,
  inertia: 0.0015,
  friction: 0.004,
};

// 手摇低频下，忽略绕组 L/R 远小于一圈时间的电流暂态。
// 分段线性 LED 只描述导通及功率，不把发光亮度当作精密电流计。
export function generatorState(theta, omega, connected, parameters = GENERATOR) {
  const p = { ...GENERATOR, ...parameters },
    k = p.turns * p.field * p.area;
  const linkage = k * Math.cos(theta),
    gradient = -k * Math.sin(theta),
    emf = -gradient * omega;
  const drop = emf >= 0 ? p.redDrop : p.yellowDrop;
  const resistance = p.coilResistance + p.seriesResistance + p.diodeResistance;
  const current = connected ? (Math.sign(emf) * Math.max(0, Math.abs(emf) - drop)) / resistance : 0;
  const redCurrent = Math.max(0, current),
    yellowCurrent = Math.max(0, -current);
  const coilPower = current * current * p.coilResistance;
  const resistorPower = current * current * p.seriesResistance;
  const ledPower = Math.abs(current) * drop + current * current * p.diodeResistance;
  return {
    linkage,
    gradient,
    emf,
    current,
    redCurrent,
    yellowCurrent,
    torque: gradient * current,
    coilPower,
    resistorPower,
    ledPower,
  };
}

export class ACGenerator {
  constructor(parameters = {}) {
    this.parameters = { ...GENERATOR, ...parameters };
    this.step = 0.0005;
    this.reset();
  }
  reset() {
    this.theta = this.omega = this.time = this.accumulator = 0;
    this.target = 0;
    this.held = false;
    this.connected = false;
    this.handWork = this.frictionHeat = this.coilHeat = this.resistorHeat = this.ledEnergy = 0;
  }
  setHand(theta) {
    if (!Number.isFinite(theta)) throw new RangeError('crank angle must be finite');
    this.target = theta;
    this.held = true;
  }
  release() {
    this.held = false;
  }
  connect(connected) {
    this.connected = !!connected;
  }
  observe(theta = this.theta, omega = this.omega) {
    return generatorState(theta, omega, this.connected, this.parameters);
  }
  energy() {
    return 0.5 * this.parameters.inertia * this.omega * this.omega;
  }
  rates(theta, omega) {
    const p = this.parameters,
      e = this.observe(theta, omega);
    // 有限扭矩的手与握柄耦合；握住不动不是电机继续给定转速。
    const handTorque = this.held ? Math.max(-0.8, Math.min(0.8, 2 * (this.target - theta) - 0.08 * omega)) : 0;
    return {
      dtheta: omega,
      domega: (handTorque + e.torque - p.friction * omega) / p.inertia,
      work: handTorque * omega,
      heat: p.friction * omega * omega,
      coil: e.coilPower,
      resistor: e.resistorPower,
      led: e.ledPower,
    };
  }
  advance(dt) {
    if (!(dt > 0) || !Number.isFinite(dt)) return;
    this.accumulator += dt;
    const h = this.step;
    while (this.accumulator + 1e-12 >= h) {
      this.accumulator -= h;
      const a = this.rates(this.theta, this.omega);
      const b = this.rates(this.theta + (a.dtheta * h) / 2, this.omega + (a.domega * h) / 2);
      const c = this.rates(this.theta + (b.dtheta * h) / 2, this.omega + (b.domega * h) / 2);
      const d = this.rates(this.theta + c.dtheta * h, this.omega + c.domega * h);
      const sum = (key) => (h * (a[key] + 2 * b[key] + 2 * c[key] + d[key])) / 6;
      this.theta += sum('dtheta');
      this.omega += sum('domega');
      this.handWork += sum('work');
      this.frictionHeat += sum('heat');
      this.coilHeat += sum('coil');
      this.resistorHeat += sum('resistor');
      this.ledEnergy += sum('led');
      this.time += h;
    }
  }
}
