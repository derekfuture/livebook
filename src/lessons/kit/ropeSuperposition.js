import { RopeWave } from './ropeWave.js';

// 选必一 p.74 图3.4-1：同一根小斜率绳，两端各自由手驱动。
// 沿用绳波方程；相遇时不交换波包，也不人为改变传播方向。
export class RopeSuperposition extends RopeWave {
  constructor(options = {}) {
    super(options);
    // Resolve the short waves from abrupt changes at either hand, including their energy.
    this.step *= 0.5;
  }
  reset() {
    super.reset();
    this.rightTarget = 0;
  }
  setRightHand(y) {
    if (!Number.isFinite(y)) throw new RangeError('hand position must be finite');
    this.rightTarget = Math.max(-0.18, Math.min(0.18, y));
  }
  rightHandVelocity(y = this.y[this.segments]) {
    const maxSpeed = this.speed * 0.25;
    return Math.max(-maxSpeed, Math.min(maxSpeed, (this.rightTarget - y) / 0.006));
  }
  rates(y, v) {
    const r = super.rates(y, v),
      n = this.segments;
    r.dy[n] = this.rightHandVelocity(y[n]);
    r.work += this.spring * (y[n] - y[n - 1] - this.baseline(this.length - this.dx)) * r.dy[n];
    return r;
  }
  energy(y = this.y, v = this.v) {
    return super.energy(y, v) - this.spring * this.baseline(this.length - this.dx) * y[this.segments];
  }
  observe() {
    const state = super.observe();
    state.rightHand = this.y[this.segments];
    state.points[this.segments].velocity = this.rightHandVelocity();
    return state;
  }
}
