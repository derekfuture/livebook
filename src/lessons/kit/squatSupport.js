// A one-degree-of-freedom articulated teaching mannequin, not a biomechanical predictor.
// Both feet stay on the platform. Shin tilt, hip flexion and torso lean share one
// continuous coordinate. The mass-weighted COM of that pose drives the force sensor.
export const SQUAT_BODY = Object.freeze({
  leg: 0.43,
  ankle: 0.09,
  footCom: 0.04,
  footComZ: 0.06,
  torsoCom: 0.32,
  footMass: 0.08,
  shinMass: 0.09,
  thighMass: 0.2,
  torsoMass: 0.63,
  standing: 0.07,
  crouching: 1.05,
});
export function squatPose(q, p = SQUAT_BODY) {
  const shin = 0.35 * q,
    thigh = 1.3 * q,
    lean = 0.75 * q;
  const knee = { y: p.ankle + p.leg * Math.cos(shin), z: p.leg * Math.sin(shin) };
  const hip = { y: knee.y + p.leg * Math.cos(thigh), z: knee.z - p.leg * Math.sin(thigh) };
  const comY =
    p.footMass * p.footCom +
    (p.shinMass * (p.ankle + knee.y)) / 2 +
    (p.thighMass * (knee.y + hip.y)) / 2 +
    p.torsoMass * (hip.y + p.torsoCom * Math.cos(lean));
  const comZ =
    p.footMass * p.footComZ +
    (p.shinMass * knee.z) / 2 +
    (p.thighMass * (knee.z + hip.z)) / 2 +
    p.torsoMass * (hip.z + p.torsoCom * Math.sin(lean));
  return { knee, hip, lean, comY, comZ, torsoHeight: hip.y + 0.27 * Math.cos(lean) };
}
export const SQUAT_HEIGHT = Object.freeze({
  low: squatPose(SQUAT_BODY.crouching).comY,
  high: squatPose(SQUAT_BODY.standing).comY,
});
function inversePose(height, key) {
  let a = SQUAT_BODY.standing,
    b = SQUAT_BODY.crouching;
  for (let i = 0; i < 44; i++) {
    const mid = (a + b) / 2;
    if (squatPose(mid)[key] > height) a = mid;
    else b = mid;
  }
  return (a + b) / 2;
}
export function squatAngle(height) {
  return inversePose(height, 'comY');
}
export function squatHeightFromTorso(height) {
  return squatPose(inversePose(height, 'torsoHeight')).comY;
}
export class SquatSupport {
  constructor({ mass = 55, gravity = 9.8, response = 4 } = {}) {
    if (
      ![mass, gravity, response].every((x) => Number.isFinite(x) && x > 0) ||
      response > 4 ||
      response ** 2 * (SQUAT_HEIGHT.high - SQUAT_HEIGHT.low) * (1 + Math.exp(-2)) >= gravity
    )
      throw new RangeError('蹲起模型参数无效');
    this.mass = mass;
    this.gravity = gravity;
    this.response = response;
    this.reset();
  }
  reset() {
    this.height = this.target = SQUAT_HEIGHT.high;
    this.velocity = this.time = 0;
    this.sensor = this.weight;
    this.samples = [];
    this.recording = false;
    this.sampleTime = this.recordStart = 0;
  }
  get weight() {
    return this.mass * this.gravity;
  }
  get acceleration() {
    return this.response ** 2 * (this.target - this.height) - 2 * this.response * this.velocity;
  }
  get force() {
    return this.mass * (this.gravity + this.acceleration);
  }
  get angle() {
    return squatAngle(this.height);
  }
  get settled() {
    return Math.abs(this.velocity) < 0.004 && Math.abs(this.acceleration) < 0.03;
  }
  setTarget(height) {
    if (!Number.isFinite(height)) throw new RangeError('目标高度无效');
    this.target = Math.max(SQUAT_HEIGHT.low, Math.min(SQUAT_HEIGHT.high, height));
  }
  start() {
    this.samples = [];
    this.recording = true;
    this.sampleTime = this.recordStart = this.time;
  }
  resume() {
    if (this.samples.length >= 3001) return false;
    this.recording = true;
    this.sampleTime = this.time;
    return true;
  }
  stop() {
    this.recording = false;
  }
  advance(dt) {
    if (!Number.isFinite(dt) || dt < 0) throw new RangeError('时间步无效');
    // Exact critically damped motion between hand updates. No teleporting on release.
    // The stable positive impulse response keeps COM between the two anatomical limits.
    let left = dt;
    while (left > 1e-10) {
      const untilSample = this.recording ? Math.max(1e-10, this.sampleTime - this.time) : Infinity;
      const h = Math.min(left, 0.002, untilSample),
        w = this.response;
      const a = this.height - this.target,
        b = this.velocity + w * a,
        e = Math.exp(-w * h);
      this.height = this.target + (a + b * h) * e;
      this.velocity = (b - w * (a + b * h)) * e;
      this.sensor += (this.force - this.sensor) * (1 - Math.exp(-h / 0.025));
      this.time += h;
      left -= h;
      if (this.recording && this.time >= this.sampleTime - 1e-9) {
        this.samples.push(
          Object.freeze({
            t: this.sampleTime - this.recordStart,
            force: this.sensor,
            height: this.height,
            velocity: this.velocity,
            acceleration: this.acceleration,
          }),
        );
        this.sampleTime += 0.02;
        // A finite acquisition preserves the trace instead of silently overwriting it.
        if (this.samples.length >= 3001) this.stop();
      }
    }
  }
}
