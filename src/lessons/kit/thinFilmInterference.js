export const THIN_FILM = Object.freeze({
  radius: 0.045,
  waterLevel: 0.125,
  low: 0.065,
  high: 0.29,
  rest: 0.245,
  index: 1.333,
  wavelength: 589.3e-9,
  top: 0.2e-6,
  bottom: 1.8e-6,
  residual: 25e-9,
  drainTime: 45,
});
// Symmetric air/film/air: one pi reflection phase shift; sum all internal reflections.
export function filmReflectance(thickness, cosine = 1, wavelength = THIN_FILM.wavelength, index = THIN_FILM.index) {
  if (
    ![thickness, cosine, wavelength, index].every(Number.isFinite) ||
    thickness < 0 ||
    cosine < 0 ||
    cosine > 1 ||
    wavelength <= 0 ||
    index <= 1
  )
    throw new RangeError('薄膜光学参数无效');
  if (thickness === 0) return 0;
  const c = Math.max(1e-8, cosine),
    ct = Math.sqrt(1 - (1 - c * c) / (index * index)),
    s = Math.sin((2 * Math.PI * index * thickness * ct) / wavelength) ** 2;
  const rs = ((c - index * ct) / (c + index * ct)) ** 2,
    rp = ((index * c - ct) / (index * c + ct)) ** 2;
  const airy = (r) => (4 * r * s) / ((1 - r) ** 2 + 4 * r * s);
  return (airy(rs) + airy(rp)) / 2;
}
export function filmThickness(y, age) {
  const p = THIN_FILM,
    f = Math.max(0, Math.min(1, (p.radius - y) / (2 * p.radius)));
  return p.residual + (p.top + (p.bottom - p.top) * f - p.residual) * Math.exp(-Math.max(0, age) / p.drainTime);
}
export function flameShape(t, origin = [0.02, 0.15, 0.18]) {
  return {
    center: [origin[0] + Math.sin(t * 9) * 0.0012, origin[1] + 0.09, origin[2]],
    axes: [0.0096, 0.0288 * (1 + Math.sin(t * 23) * 0.06 + Math.sin(t * 37 + 1) * 0.04), 0.0096],
  };
}
export function rayEllipsoid(point, direction, center, axes) {
  let a = 0,
    b = 0,
    c = -1;
  for (let i = 0; i < 3; i++) {
    const o = (point[i] - center[i]) / axes[i],
      d = direction[i] / axes[i];
    a += d * d;
    b += 2 * o * d;
    c += o * o;
  }
  const disc = b * b - 4 * a * c;
  return disc >= 0 && (-b + Math.sqrt(disc)) / (2 * a) > 0;
}
export function reflectedFlame(point, eye, shape, ring = [-0.08, 0.245, 0]) {
  const dx = point[0] - ring[0],
    dy = point[1] - ring[1];
  if (dx * dx + dy * dy > THIN_FILM.radius ** 2 || eye[2] <= ring[2] || shape.center[2] <= ring[2]) return false;
  const v = eye.map((x, i) => x - point[i]),
    n = Math.hypot(...v),
    dir = [-v[0] / n, -v[1] / n, v[2] / n];
  return rayEllipsoid(point, dir, shape.center, shape.axes);
}
export class ThinFilmInterference {
  constructor() {
    this.reset();
  }
  reset() {
    this.height = THIN_FILM.rest;
    this.age = 0;
    this.wet = false;
    this.film = false;
    this.lit = false;
    this.draws = 0;
  }
  setHeight(y) {
    if (!Number.isFinite(y)) throw new RangeError('环高度无效');
    this.height = Math.max(THIN_FILM.low, Math.min(THIN_FILM.high, y));
    if (this.height + THIN_FILM.radius < THIN_FILM.waterLevel) {
      this.wet = true;
      this.film = false;
      this.age = 0;
    } else if (this.wet && !this.film && this.height - THIN_FILM.radius > THIN_FILM.waterLevel) {
      this.film = true;
      this.draws++;
    }
  }
  advance(dt) {
    if (!Number.isFinite(dt) || dt < 0) throw new RangeError('时间步无效');
    if (this.film) this.age += dt;
  }
  get volume() {
    return (
      Math.PI *
      THIN_FILM.radius ** 2 *
      (THIN_FILM.residual +
        ((THIN_FILM.top + THIN_FILM.bottom) / 2 - THIN_FILM.residual) * Math.exp(-this.age / THIN_FILM.drainTime))
    );
  }
  get drained() {
    return (Math.PI * THIN_FILM.radius ** 2 * (THIN_FILM.top + THIN_FILM.bottom)) / 2 - this.volume;
  }
}
