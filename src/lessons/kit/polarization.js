// Paraxial, collimated, initially unpolarized light. Linear absorbing films;
// no retardance, interference, edge diffraction or oblique-incidence coating model.
// Real symmetric transverse coherency [<Ex²>, <ExEy>, <Ey²>] suffices here.
export function polarize(state, angle, parallel = 1, perpendicular = 0) {
  if (![parallel, perpendicular].every((t) => Number.isFinite(t) && t >= 0 && t <= 1))
    throw new RangeError('Intensity transmissions must lie in [0, 1]');
  const c = Math.cos(angle),
    s = Math.sin(angle),
    a = Math.sqrt(parallel),
    b = Math.sqrt(perpendicular);
  const j00 = a * c * c + b * s * s,
    j01 = (a - b) * c * s,
    j11 = a * s * s + b * c * c;
  const [xx, xy, yy] = state;
  return [
    j00 * j00 * xx + 2 * j00 * j01 * xy + j01 * j01 * yy,
    j00 * j01 * xx + (j00 * j11 + j01 * j01) * xy + j01 * j11 * yy,
    j01 * j01 * xx + 2 * j01 * j11 * xy + j11 * j11 * yy,
  ];
}

export const POLAR = { beamRadius: 0.03, filmRadius: 0.044, frameRadius: 0.054, height: 0.13, park: 0.16 };

// A single ray through finite disks, ordered along propagation. Opaque rims are
// genuine obstructions, not treated as a third polarizing film.
export function transmitPolarizers(x, y, filters, incident = 1) {
  let state = [incident / 2, 0, incident / 2];
  const losses = [];
  for (const f of filters) {
    const r = Math.hypot(x - f.x, y - f.y),
      before = state[0] + state[2];
    if (r <= f.radius) state = polarize(state, f.angle, f.parallel ?? 1, f.perpendicular ?? 0);
    else if (r <= (f.outerRadius ?? f.radius)) state = [0, 0, 0];
    losses.push(before - state[0] - state[2]);
  }
  return { state, intensity: state[0] + state[2], losses };
}

export class PolarizationBench {
  constructor() {
    this.reset();
  }
  reset() {
    this.p = 0;
    this.q = 0;
    this.qx = POLAR.park;
  }
  setAngle(which, angle) {
    if (which !== 'p' && which !== 'q') throw new RangeError('Unknown filter');
    if (!Number.isFinite(angle)) throw new RangeError('Finite angle required');
    this[which] = angle;
  }
  moveQ(x) {
    this.qx = Math.max(0, Math.min(POLAR.park, x));
  }
  filters() {
    const common = { y: POLAR.height, radius: POLAR.filmRadius, outerRadius: POLAR.frameRadius };
    return [
      { ...common, x: 0, angle: this.p },
      { ...common, x: this.qx, angle: this.q },
    ];
  }
  at(x, y) {
    const incident = Math.hypot(x, y - POLAR.height) <= POLAR.beamRadius ? 1 : 0;
    return transmitPolarizers(x, y, this.filters(), incident);
  }
  // Equal-area samples over the incident circular beam, for observation checks.
  // Screen rendering also uses at(), retaining the spatial effect of a moving rim.
  mean(samples = 800) {
    let sum = 0;
    const turn = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < samples; i++) {
      const r = POLAR.beamRadius * Math.sqrt((i + 0.5) / samples),
        a = i * turn;
      sum += this.at(r * Math.cos(a), POLAR.height + r * Math.sin(a)).intensity;
    }
    return sum / samples;
  }
}
