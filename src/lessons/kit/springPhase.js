// 选必一 p.38 图2.2-4：固定刚性支架上的两只相同自由弹簧振子。
// 持球夹仅提供静止约束；张开后没有横杆传力，也不会给另一只球重置相位。
import { FreeSpring } from './freeSpring.js';
export const PHASE_CLAMP_TOLERANCE = 0.002;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export class SpringPhase {
  constructor(options = {}) {
    this.bodies = [new FreeSpring(options), new FreeSpring(options)];
    this.reset();
  }
  get time() {
    return this.bodies[0].time;
  }
  body(index) {
    if (index !== 0 && index !== 1) throw new RangeError('只能操作A或B');
    return this.bodies[index];
  }
  reset() {
    this.bodies.forEach((b) => {
      b.reset();
      b.grab();
    });
    this.carriage = 0;
    this.clamped = [true, true];
    this.releases = [null, null];
  }
  moveCarriage(q) {
    if (!Number.isFinite(q)) throw new RangeError('夹具位移必须有限');
    const offsets = this.bodies.map((b) => b.q - this.carriage);
    const limit = Math.min(
      0.05,
      ...this.bodies.filter((_, i) => this.clamped[i]).map((b) => b.parameters.maxDisplacement - (b.q - this.carriage)),
    );
    const next = Math.max(0, Math.min(limit, q));
    this.bodies.forEach((b, i) => {
      if (this.clamped[i]) b.move(next + offsets[i]);
    });
    this.carriage = next;
    return true;
  }
  grab(index) {
    const b = this.body(index);
    b.grab();
    this.clamped[index] = false;
    this.releases[index] = null;
  }
  move(index, q) {
    return this.body(index).move(q);
  }
  drop(index) {
    const b = this.body(index);
    if (!b.held) return false;
    if (Math.abs(b.q - this.carriage) <= PHASE_CLAMP_TOLERANCE) {
      // Rubber jaws grip at the actual slightly offset position; no snapping.
      this.clamped[index] = true;
      this.releases[index] = null;
      return true;
    }
    this.open(index);
    return false;
  }
  open(index) {
    const b = this.body(index);
    if (!b.held) return false;
    this.clamped[index] = false;
    this.releases[index] = { time: this.time, q: b.q, v: b.v };
    b.release();
    return true;
  }
  openBoth() {
    const a = this.clamped[0] && this.open(0);
    const b = this.clamped[1] && this.open(1);
    return !!(a || b);
  }
  advance(dt) {
    this.bodies.forEach((b) => b.advance(dt));
    return this.observe();
  }
  observe() {
    return {
      time: this.time,
      carriage: this.carriage,
      clamped: [...this.clamped],
      bodies: this.bodies.map((b) => b.observe()),
      releases: this.releases.map((r) => r && { ...r }),
    };
  }
  // Phase from CURRENT displacement and velocity, not a phase selected by a button.
  // For q=e^-βt C cosθ, -(v+βq)/ωd=e^-βt C sinθ.
  comparison() {
    if (this.bodies.some((b) => b.held) || this.releases.some((r) => !r)) return null;
    const states = this.bodies.map((b) => {
      const { beta, stiffness, mass } = b.parameters;
      const wd = Math.sqrt(stiffness / mass - beta ** 2);
      const quadrature = -(b.v + beta * b.q) / wd;
      return { phase: Math.atan2(quadrature, b.q), envelope: Math.hypot(b.q, quadrature) };
    });
    if (states.some((s) => s.envelope < 0.003)) return null;
    return {
      difference: wrap(states[0].phase - states[1].phase),
      envelopes: states.map((s) => s.envelope),
      delay: this.releases[1].time - this.releases[0].time,
      releaseDifference: Math.abs(this.releases[0].q - this.releases[1].q),
    };
  }
  // Auxiliary observation from at least three actual full cycles since this release.
  period(index) {
    const b = this.body(index),
      release = this.releases[index];
    if (!release || b.held) return null;
    const times = b.crossings
      .filter((c) => c.direction === 1 && c.time > release.time)
      .slice(-4)
      .map((c) => c.time);
    if (times.length < 4) return null;
    return { period: (times.at(-1) - times[0]) / 3, start: times[0], end: times.at(-1), cycles: 3 };
  }
}
