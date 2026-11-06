// 选必一 p.72 图3.3-2。线性长重力波：eta_t = -div(Q), Q_t = -g*h*grad(eta)。
// eta 是水面相对静水面的高度，Q 是单位宽度体积流量。深度在通量面上参与计算；
// 不能只把 c²*laplacian(eta) 中的 c 换掉，那会丢掉深度梯度与正确的通量连续性。
// 忽略表面张力、非线性、垂向色散；只用于小振幅、波长大于水深的定性折射观察。
export const REFRACTION_TANK = Object.freeze({
  nx: 145,
  nz: 109,
  spacing: 0.005,
  deep: 0.006,
  shallow: 0.002,
  boundaryAngle: Math.PI / 6,
  gravity: 9.8,
  density: 1000,
  frequency: 2,
  sourceX: 0,
  sourceZ: -0.12,
  sourceLength: 0.32,
  sourceWidth: 0.008,
  sourceStroke: 0.00025,
  sourceAngle: 0,
  response: 0.12,
  damping: 0.08,
  spongeWidth: 0.06,
  spongeRate: 25,
});

export class RefractionTank {
  constructor(options = {}) {
    const p = (this.parameters = { ...REFRACTION_TANK, ...options });
    if (
      !Object.values(p).every(Number.isFinite) ||
      !Number.isInteger(p.nx) ||
      !Number.isInteger(p.nz) ||
      p.nx < 20 ||
      p.nz < 20 ||
      p.nx > 401 ||
      p.nz > 401 ||
      p.spacing <= 0 ||
      p.deep <= 0 ||
      p.shallow <= 0 ||
      p.gravity <= 0 ||
      p.density <= 0 ||
      p.frequency <= 0 ||
      p.sourceLength <= 0 ||
      p.sourceWidth <= 0 ||
      p.sourceStroke <= 0 ||
      p.sourceStroke > Math.min(p.deep, p.shallow) / 4 ||
      p.response <= 0 ||
      p.damping < 0 ||
      p.spongeWidth <= 0 ||
      p.spongeRate < 0
    )
      throw new RangeError('水槽网格、深度、振源及阻尼参数必须有限且有效');
    this.nx = p.nx;
    this.nz = p.nz;
    this.spacing = p.spacing;
    this.width = (p.nx - 1) * p.spacing;
    this.length = (p.nz - 1) * p.spacing;
    this.stepSize = Math.min(
      0.004,
      (0.3 * p.spacing) / Math.sqrt(p.gravity * Math.max(p.deep, p.shallow)),
      1 / (100 * p.frequency),
      p.response / 20,
      1 / (p.damping + p.spongeRate),
    );
    const n = p.nx * p.nz;
    this.depth = new Float64Array(n);
    this.depthX = new Float64Array(n);
    this.depthZ = new Float64Array(n);
    this.sponge = new Float64Array(n);
    this.dragX = new Float64Array(n);
    this.dragZ = new Float64Array(n);
    this.sourceMask = new Float64Array(n);
    const state = () => ({ surface: new Float64Array(n), fluxX: new Float64Array(n), fluxZ: new Float64Array(n) });
    this._stages = Array.from({ length: 4 }, state);
    this._temp = state();
    for (let j = 0; j < p.nz; j++)
      for (let i = 0; i < p.nx; i++) {
        const k = j * p.nx + i,
          x = i * p.spacing - this.width / 2,
          z = j * p.spacing - this.length / 2;
        this.depth[k] = this.depthAt(x, z);
        this.depthX[k] = this.faceDepth(x, z, x + p.spacing, z);
        this.depthZ[k] = this.faceDepth(x, z, x, z + p.spacing);
        const edge = Math.min(i, j, p.nx - 1 - i, p.nz - 1 - j) * p.spacing;
        this.sponge[k] = p.spongeRate * Math.max(0, 1 - edge / p.spongeWidth) ** 2;
      }
    for (let k = 0; k < n; k++) {
      this.dragX[k] = p.damping + (this.sponge[k] + this.sponge[Math.min(k + 1, n - 1)]) / 2;
      this.dragZ[k] = p.damping + (this.sponge[k] + this.sponge[Math.min(k + p.nx, n - 1)]) / 2;
    }
    this.reset();
  }

  signedDistance(x, z) {
    return -x * Math.sin(this.parameters.boundaryAngle) + z * Math.cos(this.parameters.boundaryAngle);
  }

  depthAt(x, z) {
    return this.signedDistance(x, z) >= 0 ? this.parameters.shallow : this.parameters.deep;
  }

  // Integrate 1/h along a crossing edge, instead of treating an oblique depth
  // boundary as an arbitrary fixed wall or taking a non-conservative local speed.
  faceDepth(x0, z0, x1, z1) {
    const a = this.signedDistance(x0, z0),
      b = this.signedDistance(x1, z1);
    const h0 = this.depthAt(x0, z0),
      h1 = this.depthAt(x1, z1);
    if (h0 === h1) return h0;
    const fraction = a / (a - b);
    return 1 / (fraction / h0 + (1 - fraction) / h1);
  }

  reset() {
    const n = this.nx * this.nz;
    this.surface = new Float64Array(n);
    this.fluxX = new Float64Array(n);
    this.fluxZ = new Float64Array(n);
    this.time = this.remainder = this.envelope = 0;
    this.powered = false;
    this.work = this.heat = this.injectedVolume = this.absorbedVolume = 0;
    this.setSourceAngle(this.parameters.sourceAngle);
  }

  setPower(powered) {
    this.powered = !!powered;
  }

  canTurn() {
    return !this.powered && this.envelope < 0.002;
  }

  setSourceAngle(angle) {
    if (!Number.isFinite(angle)) throw new RangeError('振片角度必须有限');
    if (!this.canTurn()) return false;
    this.angle = angle;
    const p = this.parameters,
      c = Math.cos(angle),
      s = Math.sin(angle);
    const sigma = Math.max(p.spacing * 0.7, p.sourceWidth / Math.sqrt(12));
    const taper = Math.min(p.sourceLength / 4, 3 * p.spacing);
    for (let j = 0; j < p.nz; j++)
      for (let i = 0; i < p.nx; i++) {
        const x = i * p.spacing - this.width / 2 - p.sourceX;
        const z = j * p.spacing - this.length / 2 - p.sourceZ;
        const along = Math.abs(x * c + z * s),
          normal = -x * s + z * c;
        const window =
          along >= p.sourceLength / 2
            ? 0
            : along <= p.sourceLength / 2 - taper
              ? 1
              : 0.5 * (1 + Math.cos((Math.PI * (along - p.sourceLength / 2 + taper)) / taper));
        this.sourceMask[j * p.nx + i] =
          (window * Math.exp(-(normal ** 2) / (2 * sigma ** 2))) / (Math.sqrt(2 * Math.PI) * sigma);
      }
    return true;
  }

  sourceAt(offset = 0) {
    // Positive displacement/velocity is downward immersion of the dipper.
    // Its added submerged volume enters the water continuity equation as +S.
    const p = this.parameters,
      target = this.powered ? 1 : 0;
    const envelope = target + (this.envelope - target) * Math.exp(-offset / p.response);
    const rate = (target - envelope) / p.response;
    const phase = 2 * Math.PI * p.frequency * (this.time + offset);
    return {
      envelope,
      displacement: p.sourceStroke * envelope * Math.sin(phase),
      velocity: p.sourceStroke * (rate * Math.sin(phase) + envelope * 2 * Math.PI * p.frequency * Math.cos(phase)),
    };
  }

  rates(state, offset, out) {
    const p = this.parameters,
      { surface: u, fluxX: x, fluxZ: z } = state;
    const { surface: du, fluxX: dx, fluxZ: dz } = out;
    const source = p.sourceWidth * this.sourceAt(offset).velocity;
    let work = 0,
      heat = 0,
      injection = 0,
      absorption = 0;
    for (let j = 0; j < this.nz; j++)
      for (let i = 0; i < this.nx; i++) {
        const k = j * this.nx + i,
          force = source * this.sourceMask[k];
        const outX = i + 1 < this.nx ? x[k] : 0,
          inX = i > 0 ? x[k - 1] : 0;
        const outZ = j + 1 < this.nz ? z[k] : 0,
          inZ = j > 0 ? z[k - this.nx] : 0;
        du[k] = -(outX - inX + outZ - inZ) / p.spacing - this.sponge[k] * u[k] + force;
        dx[k] =
          i + 1 < this.nx ? (-p.gravity * this.depthX[k] * (u[k + 1] - u[k])) / p.spacing - this.dragX[k] * x[k] : 0;
        dz[k] =
          j + 1 < this.nz
            ? (-p.gravity * this.depthZ[k] * (u[k + this.nx] - u[k])) / p.spacing - this.dragZ[k] * z[k]
            : 0;
        work += p.gravity * u[k] * force;
        heat +=
          this.sponge[k] * p.gravity * u[k] ** 2 +
          (this.dragX[k] * outX ** 2) / this.depthX[k] +
          (this.dragZ[k] * outZ ** 2) / this.depthZ[k];
        injection += force;
        absorption += this.sponge[k] * u[k];
      }
    out.work = work * p.density * p.spacing ** 2;
    out.heat = heat * p.density * p.spacing ** 2;
    out.injection = injection * p.spacing ** 2;
    out.absorption = absorption * p.spacing ** 2;
  }

  energy() {
    const p = this.parameters;
    let sum = 0;
    for (let j = 0; j < this.nz; j++)
      for (let i = 0; i < this.nx; i++) {
        const k = j * this.nx + i;
        sum += p.gravity * this.surface[k] ** 2;
        if (i + 1 < this.nx) sum += this.fluxX[k] ** 2 / this.depthX[k];
        if (j + 1 < this.nz) sum += this.fluxZ[k] ** 2 / this.depthZ[k];
      }
    return (sum * p.density * p.spacing ** 2) / 2;
  }

  volume() {
    return this.surface.reduce((sum, y) => sum + y, 0) * this.spacing ** 2;
  }

  sample(x, z) {
    const a = Math.max(0, Math.min(this.nx - 1, (x + this.width / 2) / this.spacing));
    const b = Math.max(0, Math.min(this.nz - 1, (z + this.length / 2) / this.spacing));
    const i = Math.min(this.nx - 2, Math.floor(a)),
      j = Math.min(this.nz - 2, Math.floor(b));
    const u = a - i,
      v = b - j,
      k = j * this.nx + i,
      field = this.surface;
    return (
      (1 - v) * (field[k] * (1 - u) + field[k + 1] * u) +
      v * (field[k + this.nx] * (1 - u) + field[k + this.nx + 1] * u)
    );
  }

  advance(dt) {
    if (!Number.isFinite(dt) || dt < 0) throw new RangeError('时间步长必须有限且非负');
    this.remainder += dt;
    const h = this.stepSize,
      stages = this._stages,
      fields = ['surface', 'fluxX', 'fluxZ'];
    while (this.remainder + 1e-12 >= h) {
      this.remainder -= h;
      this.rates(this, 0, stages[0]);
      for (let stage = 1; stage < 4; stage++) {
        const f = stage === 3 ? h : h / 2,
          before = stages[stage - 1];
        for (const field of fields) {
          const current = this[field],
            temp = this._temp[field],
            rate = before[field];
          for (let k = 0; k < current.length; k++) temp[k] = current[k] + f * rate[k];
        }
        this.rates(this._temp, f, stages[stage]);
      }
      const [a, b, c, d] = stages;
      for (const field of fields) {
        const current = this[field],
          ar = a[field],
          br = b[field],
          cr = c[field],
          dr = d[field];
        for (let k = 0; k < current.length; k++) current[k] += (h / 6) * (ar[k] + 2 * br[k] + 2 * cr[k] + dr[k]);
      }
      this.work += (h / 6) * (a.work + 2 * b.work + 2 * c.work + d.work);
      this.heat += (h / 6) * (a.heat + 2 * b.heat + 2 * c.heat + d.heat);
      this.injectedVolume += (h / 6) * (a.injection + 2 * b.injection + 2 * c.injection + d.injection);
      this.absorbedVolume += (h / 6) * (a.absorption + 2 * b.absorption + 2 * c.absorption + d.absorption);
      this.envelope = this.sourceAt(h).envelope;
      this.time += h;
    }
  }
}
