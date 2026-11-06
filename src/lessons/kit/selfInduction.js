// 选择性必修二图 2.4-1 / 2.4-3：两个独立拓扑，共用单电感状态。
// 两支路均从电源正端一侧向负端一侧定义正电流。
// 电阻取工作点等效值；lampResponse 仅为发光显示的热惯性近似，不是灯丝温度。
export class SelfInductionCircuit {
  constructor({
    kind = 'turnOn',
    voltage = kind === 'turnOn' ? 8 : 4,
    inductance = 8,
    coilResistance = 50,
    lampResistance = 100,
    balanceResistance = 50,
    sourceResistance = kind === 'turnOn' ? 25 : 2,
    ratedPower = 0.16,
    responseTime = 0.02,
  } = {}) {
    if (!['turnOn', 'turnOff'].includes(kind)) throw new RangeError('Unknown self-induction circuit');
    Object.assign(this, {
      kind,
      voltage,
      inductance,
      coilResistance,
      lampResistance,
      balanceResistance,
      sourceResistance,
      ratedPower,
      responseTime,
    });
    this.reset();
  }
  reset() {
    this.closed = false;
    this.coilConnected = true;
    this.current = 0;
    this.time = 0;
    this.lampResponse = this.kind === 'turnOn' ? [0, 0] : [0];
  }
  // 断开电源并不切断两支路组成的回路，也不重置电感电流或灯丝余热。
  switch(closed) {
    this.closed = !!closed;
  }
  setCoilConnected(connected) {
    // 拔下已储能线圈需要另建开路放电模型，不能把磁能凭空删掉。
    if (!connected && Math.abs(this.current) > 1e-6) return false;
    this.coilConnected = !!connected;
    if (!connected) this.current = 0;
    return true;
  }
  coefficients() {
    const a = this.coilResistance + (this.kind === 'turnOn' ? this.lampResistance : 0);
    const b = this.lampResistance + (this.kind === 'turnOn' ? this.balanceResistance : 0);
    const feed = this.sourceResistance;
    return {
      a,
      b,
      resistance: this.closed ? a + (feed * b) / (feed + b) : a + b,
      drive: this.closed && this.coilConnected ? (this.voltage * b) / (feed + b) : 0,
    };
  }
  observe() {
    const { a, b, resistance, drive } = this.coefficients();
    const i = this.current;
    const other = this.closed ? (this.voltage - this.sourceResistance * i) / (b + this.sourceResistance) : -i;
    const busVoltage = other * b;
    const derivative = (drive - resistance * i) / this.inductance;
    const lamps = this.kind === 'turnOn' ? [i, other] : [other];
    return {
      coilCurrent: i,
      otherCurrent: other,
      sourceCurrent: this.closed ? i + other : 0,
      busVoltage,
      derivative,
      inducedEmf: -this.inductance * derivative,
      energy: 0.5 * this.inductance * i * i,
      lampCurrents: lamps,
      lampPowers: lamps.map((j) => j * j * this.lampResistance),
      dissipation: i * i * a + other * other * b + (this.closed ? (i + other) ** 2 * this.sourceResistance : 0),
    };
  }
  advance(dt) {
    if (!(dt > 0)) return this.observe();
    const { resistance, drive, b } = this.coefficients();
    const k = resistance / this.inductance;
    const steady = drive / resistance;
    const delta = this.current - steady;
    // 两支路电流均写为 c + d exp(-kt)，用于精确积分同一段的发热响应。
    const otherSteady = this.closed
      ? (this.voltage - this.sourceResistance * steady) / (b + this.sourceResistance)
      : -steady;
    const otherDelta = this.closed ? (-this.sourceResistance * delta) / (b + this.sourceResistance) : -delta;
    const lamps =
      this.kind === 'turnOn'
        ? [
            [steady, delta],
            [otherSteady, otherDelta],
          ]
        : [[otherSteady, otherDelta]];
    const h = 1 / this.responseTime;
    const decay = Math.exp(-h * dt);
    // h ∫ exp[-h(dt-t)] exp(-rate*t) dt，含 rate = h 的可去奇点。
    const response = (rate) =>
      Math.abs(h - rate) < 1e-9 * h ? h * dt * decay : (h * (Math.exp(-rate * dt) - decay)) / (h - rate);
    const powerScale = this.lampResistance / this.ratedPower;
    this.lampResponse = lamps.map(([c, d], index) =>
      Math.max(
        0,
        this.lampResponse[index] * decay +
          powerScale * (c * c * -Math.expm1(-h * dt) + 2 * c * d * response(k) + d * d * response(2 * k)),
      ),
    );
    this.current += (steady - this.current) * -Math.expm1(-k * dt);
    this.time += dt;
    return this.observe();
  }
}
