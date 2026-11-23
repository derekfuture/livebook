// Planar, overdamped cotton thread with inextensible segments. The two faces
// of the surviving soap film contribute E = 2 gamma A. Constraint forces do
// no work; viscous loss is integrated independently from zeta |v|².
// This resolves the thread's relaxation, not the fast rupture rim or drainage.
export class SoapFilm {
  constructor({ loop = false, segments = 48, radius = 0.07, gamma = 0.03, drag = 0.004, step = 0.0005 } = {}) {
    Object.assign(this, { loop, segments, radius, gamma, drag, step });
    this.reset();
  }
  reset() {
    const n = this.segments,
      r = this.radius;
    this.points = Array.from({ length: this.loop ? n : n + 1 }, (_, i) => {
      const t = i / n;
      if (this.loop) {
        const a = 2 * Math.PI * t;
        return [0.013 * Math.sin(a) * (1 + 0.15 * Math.sin(a)), 0.03 - 0.026 * (1 - Math.cos(a))];
      }
      return [0.009 * Math.sin(Math.PI * t) + 0.007 * Math.sin(3 * Math.PI * t), r * (1 - 2 * t)];
    });
    // Both paths run clockwise / from the upper pin to the lower pin.
    this.rest = Array.from({ length: n }, (_, i) => {
      const a = this.points[i],
        b = this.points[(i + 1) % this.points.length];
      return Math.hypot(b[0] - a[0], b[1] - a[1]);
    });
    this.restAngles = this.points.map((_, i) => this.turn(this.points, i));
    this.a = true;
    this.b = true;
    this.time = 0;
    this.remainder = 0;
    this.heat = 0;
    this.removedEnergy = 0;
  }
  fixed(i) {
    return i === 0 || (!this.loop && i === this.segments);
  }
  signedArea(points = this.points) {
    let a = 0;
    for (let i = 0; i < points.length; i++) {
      const p = points[i],
        q = points[(i + 1) % points.length];
      a += (p[0] * q[1] - q[0] * p[1]) / 2;
    }
    return a;
  }
  areas(points = this.points) {
    const disk = Math.PI * this.radius ** 2,
      a = this.signedArea(points);
    return this.loop ? [-a, disk + a] : [disk / 2 - a, disk / 2 + a];
  }
  energy(points = this.points) {
    const [a, b] = this.areas(points);
    return (
      2 * this.gamma * ((this.a ? a : 0) + (this.b ? b : 0)) +
      this.contacts(points).energy +
      this.bending(points).energy
    );
  }
  turn(points, i) {
    const n = points.length,
      a = points[(i + n - 1) % n],
      b = points[i],
      c = points[(i + 1) % n];
    return Math.atan2(
      (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]),
      (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]),
    );
  }
  bending(points, forces = null) {
    let energy = 0;
    if (!this.loop) return { energy };
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const prev = (i + n - 1) % n,
        next = (i + 1) % n,
        a = points[prev],
        b = points[i],
        c = points[next];
      const turn = this.turn(points, i) - this.restAngles[i],
        d = Math.atan2(Math.sin(turn), Math.cos(turn));
      const k = 1e-9 / ((this.rest[prev] + this.rest[i]) / 2);
      energy += 0.5 * k * d * d;
      if (forces) {
        const u = [b[0] - a[0], b[1] - a[1]],
          v = [c[0] - b[0], c[1] - b[1]],
          u2 = u[0] ** 2 + u[1] ** 2,
          v2 = v[0] ** 2 + v[1] ** 2;
        const ga = [-u[1] / u2, u[0] / u2],
          gc = [-v[1] / v2, v[0] / v2];
        for (let j = 0; j < 2; j++) {
          forces[prev][j] -= k * d * ga[j];
          forces[next][j] -= k * d * gc[j];
          forces[i][j] += k * d * (ga[j] + gc[j]);
        }
      }
    }
    return { energy };
  }
  contacts(points, forces = null) {
    let energy = 0;
    if (!this.loop) return { energy };
    // Smooth finite-thickness contact regularization, integrated with material
    // node weights. It prevents a collapsing loop from passing through itself.
    const width = 0.0015,
      strength = 2,
      n = points.length;
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const separation = Math.min(j - i, n - j + i);
        if (separation <= 3) continue;
        const dx = points[i][0] - points[j][0],
          dy = points[i][1] - points[j][1],
          r2 = dx * dx + dy * dy;
        if (r2 >= 16 * width * width) continue;
        const wi = (this.rest[(i + n - 1) % n] + this.rest[i]) / 2,
          wj = (this.rest[(j + n - 1) % n] + this.rest[j]) / 2;
        const u = r2 / (2 * width * width),
          cut = Math.exp(-8),
          weight = strength * wi * wj;
        const e = weight * (Math.exp(-u) - cut * (9 - u));
        energy += e;
        if (forces) {
          const f = (weight * (Math.exp(-u) - cut)) / (width * width);
          forces[i][0] += f * dx;
          forces[i][1] += f * dy;
          forces[j][0] -= f * dx;
          forces[j][1] -= f * dy;
        }
      }
    return { energy };
  }
  // a: left side of spanning thread / inside loop; b: right side / outside.
  puncture(region) {
    if (region !== 'a' && region !== 'b') throw new RangeError('Unknown film region');
    if (!this[region]) return false;
    const e = this.energy();
    this[region] = false;
    this.removedEnergy += e - this.energy();
    return true;
  }
  regionAt(x, y) {
    if (Math.hypot(x, y) >= this.radius - 0.001) return null;
    for (let i = 0; i < this.segments; i++) {
      const a = this.points[i],
        b = this.points[(i + 1) % this.points.length],
        dx = b[0] - a[0],
        dy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
      if (Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy) < 0.001) return 'thread';
    }
    const polygon = this.loop
      ? this.points
      : [
          ...this.points,
          ...Array.from({ length: 63 }, (_, i) => {
            const a = -Math.PI / 2 + (Math.PI * (i + 1)) / 64;
            return [this.radius * Math.cos(a), this.radius * Math.sin(a)];
          }),
        ];
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i],
        b = polygon[j];
      if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return this.loop ? (inside ? 'a' : 'b') : inside ? 'b' : 'a';
  }
  forces(points = this.points) {
    const count = points.length,
      f = points.map(() => [0, 0]),
      coefficient = 2 * this.gamma * ((this.a ? 1 : 0) - (this.b ? 1 : 0));
    for (let i = 0; i < count; i++) {
      const prev = points[(i + count - 1) % count],
        next = points[(i + 1) % count];
      f[i][0] = (coefficient * (next[1] - prev[1])) / 2;
      f[i][1] = (coefficient * (prev[0] - next[0])) / 2;
    }
    this.contacts(points, f);
    this.bending(points, f);
    return f;
  }
  rates(points) {
    const n = this.segments,
      count = points.length,
      f = this.forces(points),
      v = f.map((p, i) => (this.fixed(i) ? [0, 0] : [p[0] / this.drag, p[1] / this.drag]));
    const tangent = [],
      diag = [],
      off = [],
      rhs = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % count,
        dx = points[j][0] - points[i][0],
        dy = points[j][1] - points[i][1],
        len = Math.hypot(dx, dy);
      const t = [dx / len, dy / len];
      tangent.push(t);
      diag[i] = (this.fixed(i) ? 0 : 1) + (this.fixed(j) ? 0 : 1);
      rhs[i] = -((v[j][0] - v[i][0]) * t[0] + (v[j][1] - v[i][1]) * t[1]);
      if (i > 0) off[i - 1] = -(t[0] * tangent[i - 1][0] + t[1] * tangent[i - 1][1]);
    }
    // Fixing the upper pin breaks the cyclic coupling, leaving a tridiagonal system.
    for (let i = 1; i < n; i++) {
      const w = off[i - 1] / diag[i - 1];
      diag[i] -= w * off[i - 1];
      rhs[i] -= w * rhs[i - 1];
    }
    const lambda = Array(n);
    lambda[n - 1] = rhs[n - 1] / diag[n - 1];
    for (let i = n - 2; i >= 0; i--) lambda[i] = (rhs[i] - off[i] * lambda[i + 1]) / diag[i];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % count,
        t = tangent[i];
      if (!this.fixed(i)) {
        v[i][0] -= lambda[i] * t[0];
        v[i][1] -= lambda[i] * t[1];
      }
      if (!this.fixed(j)) {
        v[j][0] += lambda[i] * t[0];
        v[j][1] += lambda[i] * t[1];
      }
    }
    return { v, power: this.drag * v.reduce((sum, p) => sum + p[0] ** 2 + p[1] ** 2, 0) };
  }
  advance(dt) {
    this.remainder += dt;
    const h = this.step,
      shift = (p, k, s) => p.map((v, i) => [v[0] + s * k.v[i][0], v[1] + s * k.v[i][1]]);
    while (this.remainder >= h - 1e-12) {
      const p = this.points,
        k1 = this.rates(p),
        k2 = this.rates(shift(p, k1, h / 2)),
        k3 = this.rates(shift(p, k2, h / 2)),
        k4 = this.rates(shift(p, k3, h));
      this.points = p.map((v, i) =>
        v.map((x, j) => x + (h * (k1.v[i][j] + 2 * k2.v[i][j] + 2 * k3.v[i][j] + k4.v[i][j])) / 6),
      );
      this.heat += (h * (k1.power + 2 * k2.power + 2 * k3.power + k4.power)) / 6;
      this.time += h;
      this.remainder -= h;
    }
  }
  length() {
    return this.points.reduce(
      (sum, p, i) =>
        i < this.segments
          ? sum +
            Math.hypot(
              this.points[(i + 1) % this.points.length][0] - p[0],
              this.points[(i + 1) % this.points.length][1] - p[1],
            )
          : sum,
      0,
    );
  }
}
