// 必修三 p.20 图9.4-5：有限线径网罩和绝缘验电器的准静态近似。
// Each wire segment carries a uniform line-charge basis. Minimise electrostatic
// energy subject to one net-charge constraint per connected conductor. All wire
// coefficients use the same finite-radius Coulomb kernel; Galerkin averages are
// symmetric. This is NOT an exact surface-charge BEM or a perfect closed shell.
// The removable cage has an open bottom, no hidden ground or metal floor.
// The external charged sphere is represented by its monopole, neglecting its
// own polarisation; the intended source path remains well outside every wire.
export const COULOMB = 8.9875517923e9;
export const SHIELDING_SOURCE_RADIUS = 0.02;
const GX = [
  -0.9894009349916499, -0.9445750230732326, -0.8656312023878318, -0.755404408355003, -0.6178762444026438,
  -0.4580167776572274, -0.2816035507792589, -0.09501250983763744, 0.09501250983763744, 0.2816035507792589,
  0.4580167776572274, 0.6178762444026438, 0.755404408355003, 0.8656312023878318, 0.9445750230732326, 0.9894009349916499,
];
const GW = [
  0.027152459411754095, 0.06225352393864789, 0.09515851168249278, 0.12462897125553387, 0.14959598881657673,
  0.16915651939500254, 0.1826034150449236, 0.1894506104550685, 0.1894506104550685, 0.1826034150449236,
  0.16915651939500254, 0.14959598881657673, 0.12462897125553387, 0.09515851168249278, 0.06225352393864789,
  0.027152459411754095,
];
const dot = (a, b) => {
  let value = 0;
  for (let i = 0; i < a.length; i++) value += a[i] * b[i];
  return value;
};
const sum = (a) => a.reduce((s, v) => s + v, 0);
const finiteVector = (p) => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);
const FX = [-0.8611363115940526, -0.3399810435848563, 0.3399810435848563, 0.8611363115940526];
const FW = [0.3478548451374538, 0.6521451548625461, 0.6521451548625461, 0.3478548451374538];
function farPair(a, b) {
  return (
    Math.hypot(a.center[0] - b.center[0], a.center[1] - b.center[1], a.center[2] - b.center[2]) >
    1.5 * ((a.length || 2 * a.radius) + (b.length || 2 * b.radius))
  );
}

export function wireElement(a, b) {
  if (!finiteVector(a) || !finiteVector(b)) throw new RangeError('导线端点必须是有限三维坐标');
  const length = Math.hypot(...a.map((v, i) => b[i] - v));
  if (length < 1e-8) throw new RangeError('导线段必须有长度');
  const direction = a.map((v, i) => (b[i] - v) / length);
  return {
    a: [...a],
    b: [...b],
    length,
    direction,
    center: a.map((v, i) => (v + b[i]) / 2),
    farNodes: FX.map((v, k) => ({
      point: a.map((v0, i) => v0 + (direction[i] * length * (v + 1)) / 2),
      weight: FW[k] / 2,
      fraction: (v + 1) / 2,
    })),
    nodes: GX.map((v, k) => ({
      point: a.map((v0, i) => v0 + (direction[i] * length * (v + 1)) / 2),
      weight: GW[k] / 2,
      fraction: (v + 1) / 2,
    })),
  };
}
function sphereElement(center, radius) {
  const nodes = [{ point: [...center], weight: 1, fraction: 0 }];
  return { a: [...center], center: [...center], radius, nodes, farNodes: nodes };
}
// The optional rear hinge rotates the same five connected faces. Its support
// is insulating: rotating the lid does not add a grounded conductor or floor.
export const SHIELDING_HINGE = Object.freeze([0, 0.01, -0.24]);
export function shieldingCagePoint(point, offset = [0, 0, 0], angle = 0) {
  const dy = point[1] - SHIELDING_HINGE[1],
    dz = point[2] - SHIELDING_HINGE[2];
  return [
    point[0] + offset[0],
    SHIELDING_HINGE[1] + dy * Math.cos(angle) + dz * Math.sin(angle) + offset[1],
    SHIELDING_HINGE[2] - dy * Math.sin(angle) + dz * Math.cos(angle) + offset[2],
  ];
}
function positioned(e, offset, angle) {
  return wireElement(shieldingCagePoint(e.a, offset, angle), shieldingCagePoint(e.b, offset, angle));
}

// Potential of a unit total segment charge, divided by Coulomb's constant.
export function wirePotential(e, point, radius) {
  const x = point[0] - e.a[0],
    y = point[1] - e.a[1],
    z = point[2] - e.a[2];
  const r2 = x * x + y * y + z * z;
  if (e.radius) return 1 / Math.sqrt(r2 + radius * radius);
  const ex = x - e.length * e.direction[0],
    ey = y - e.length * e.direction[1],
    ez = z - e.length * e.direction[2];
  // Equivalent closed integral, with one logarithm and no subtraction of two
  // almost equal inverse hyperbolic sines for well-separated elements.
  return (
    (2 *
      Math.atanh(
        e.length / (Math.sqrt(r2 + radius * radius) + Math.sqrt(ex * ex + ey * ey + ez * ez + radius * radius)),
      )) /
    e.length
  );
}
export function wireField(e, point, radius) {
  const x = point[0] - e.a[0],
    y = point[1] - e.a[1],
    z = point[2] - e.a[2];
  if (e.radius) {
    const cube = (x * x + y * y + z * z + radius * radius) ** 1.5;
    return [x / cube, y / cube, z / cube];
  }
  const u = e.direction,
    s = x * u[0] + y * u[1] + z * u[2],
    vx = x - s * u[0],
    vy = y - s * u[1],
    vz = z - s * u[2],
    d2 = vx * vx + vy * vy + vz * vz + radius * radius;
  const end = s - e.length,
    rs = Math.sqrt(d2 + s * s),
    re = Math.sqrt(d2 + end * end);
  const perpendicular = (s / rs - end / re) / d2,
    parallel = 1 / re - 1 / rs;
  return [
    (vx * perpendicular + u[0] * parallel) / e.length,
    (vy * perpendicular + u[1] * parallel) / e.length,
    (vz * perpendicular + u[2] * parallel) / e.length,
  ];
}
export function wireCoefficient(a, b, radius) {
  if (a === b && a.radius) return 1 / a.radius; // isolated spherical terminal self-capacitance
  // Separated pairs are smooth; near-wire/self interactions retain 16 points.
  const far = farPair(a, b);
  const average = (a, b) =>
    (far ? a.farNodes : a.nodes).reduce((s, n) => s + n.weight * wirePotential(b, n.point, radius), 0);
  return 0.5 * (average(a, b) + average(b, a));
}
function cholesky(matrix) {
  const n = matrix.length,
    L = matrix.map((r) => Float64Array.from(r));
  for (let i = 0; i < n; i++)
    for (let j = 0; j <= i; j++) {
      let s = L[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      if (i === j) {
        if (s <= 0 || !Number.isFinite(s)) throw new Error('静电能量矩阵不是正定的');
        L[i][j] = Math.sqrt(s);
      } else L[i][j] = s / L[j][j];
    }
  // Store the transpose in the unused upper triangle so both substitutions
  // read one contiguous typed-array row, including the reused cage factor.
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) L[i][j] = L[j][i];
  return L;
}
function solve(L, rhs) {
  const n = L.length,
    x = Float64Array.from(rhs);
  for (let i = 0; i < n; i++) {
    const row = L[i];
    let value = x[i];
    for (let j = 0; j < i; j++) value -= row[j] * x[j];
    x[i] = value / row[i];
  }
  for (let i = n - 1; i >= 0; i--) {
    const row = L[i];
    let value = x[i];
    for (let j = i + 1; j < n; j++) value -= row[j] * x[j];
    x[i] = value / row[i];
  }
  return x;
}

// Five connected mesh faces, open underneath. Shared edges are counted once.
export function shieldingCage({
  nx = 5,
  ny = 6,
  nz = 4,
  width = 0.2,
  height = 0.24,
  depth = 0.16,
  baseY = 0.01,
  subdivisions = 1,
} = {}) {
  if (
    ![nx, ny, nz, subdivisions].every((v) => Number.isInteger(v) && v > 0 && v <= 30) ||
    ![width, height, depth, baseY].every(Number.isFinite) ||
    Math.min(width, height, depth) <= 0
  )
    throw new RangeError('网罩尺寸和网格必须有效');
  const wires = [],
    seen = new Set();
  function add(a, b) {
    const key = [a, b]
      .map((p) => p.map((v) => v.toFixed(10)).join(','))
      .sort()
      .join('|');
    if (seen.has(key)) return;
    seen.add(key);
    for (let k = 0; k < subdivisions; k++)
      wires.push(
        wireElement(
          a.map((v, i) => v + ((b[i] - v) * k) / subdivisions),
          a.map((v, i) => v + ((b[i] - v) * (k + 1)) / subdivisions),
        ),
      );
  }
  const xs = Array.from({ length: nx + 1 }, (_, i) => -width / 2 + (i * width) / nx),
    ys = Array.from({ length: ny + 1 }, (_, i) => baseY + (i * height) / ny),
    zs = Array.from({ length: nz + 1 }, (_, i) => -depth / 2 + (i * depth) / nz);
  for (const z of [zs[0], zs.at(-1)]) {
    for (const x of xs) for (let j = 1; j < ys.length; j++) add([x, ys[j - 1], z], [x, ys[j], z]);
    for (const y of ys) for (let i = 1; i < xs.length; i++) add([xs[i - 1], y, z], [xs[i], y, z]);
  }
  for (const x of [xs[0], xs.at(-1)]) {
    for (const z of zs) for (let j = 1; j < ys.length; j++) add([x, ys[j - 1], z], [x, ys[j], z]);
    for (const y of ys) for (let k = 1; k < zs.length; k++) add([x, y, zs[k - 1]], [x, y, zs[k]]);
  }
  const y = ys.at(-1);
  for (const x of xs) for (let k = 1; k < zs.length; k++) add([x, y, zs[k - 1]], [x, y, zs[k]]);
  for (const z of zs) for (let i = 1; i < xs.length; i++) add([xs[i - 1], y, z], [xs[i], y, z]);
  return wires;
}
export function shieldingScope(angles = [0.01, 0.01], leafSegments = 4) {
  if (!Number.isInteger(leafSegments) || leafSegments < 1 || leafSegments > 8)
    throw new RangeError('箔片数值分段必须在1至8之间');
  if (
    !Array.isArray(angles) ||
    angles.length !== 2 ||
    !angles.every((a) => Number.isFinite(a) && a >= 0 && a <= Math.PI / 2)
  )
    throw new RangeError('两片箔的角度必须处于0至90度');
  const elements = [sphereElement([0, 0.17, 0], 0.009)];
  for (let j = 0; j < 4; j++)
    elements.push(wireElement([0, 0.161 - j * 0.01525, 0], [0, 0.161 - (j + 1) * 0.01525, 0]));
  for (const [i, side] of [
    [0, -1],
    [1, 1],
  ]) {
    const a = [side * 0.0006, 0.1, 0];
    const point = (t) => [a[0] + side * 0.035 * t * Math.sin(angles[i]), 0.1 - 0.035 * t * Math.cos(angles[i]), 0];
    for (let k = 0; k < leafSegments; k++) {
      const element = wireElement(point(k / leafSegments), point((k + 1) / leafSegments));
      element.leaf = i;
      element.startDistance = (0.035 * k) / leafSegments;
      elements.push(element);
    }
  }
  return elements;
}

function segmentDistance(a, b) {
  const distanceTo = (point, wire) => {
    const r = point.map((v, i) => v - wire.a[i]);
    const t = wire.radius ? 0 : Math.max(0, Math.min(wire.length, dot(r, wire.direction)));
    return Math.hypot(...r.map((v, i) => v - (wire.radius ? 0 : t * wire.direction[i])));
  };
  if (b.radius) return distanceTo(b.center, a);
  let minimum = Math.min(distanceTo(a.a, b), distanceTo(a.b, b), distanceTo(b.a, a), distanceTo(b.b, a));
  const r = a.a.map((v, i) => v - b.a[i]),
    uv = dot(a.direction, b.direction),
    denominator = 1 - uv * uv;
  if (denominator > 1e-12) {
    const ur = dot(a.direction, r),
      vr = dot(b.direction, r);
    const t = (uv * vr - ur) / denominator,
      u = (vr - uv * ur) / denominator;
    if (t >= 0 && t <= a.length && u >= 0 && u <= b.length)
      minimum = Math.min(minimum, Math.hypot(...r.map((v, i) => v + t * a.direction[i] - u * b.direction[i])));
  }
  return minimum;
}
function conductorsTouch(a, b, radius) {
  // Cheap bounding spheres discard almost every pair before narrow phase.
  const separation = Math.hypot(...a.center.map((v, i) => v - b.center[i]));
  const margin = radius + (b.radius || radius);
  return separation <= a.length / 2 + (b.length / 2 || 0) + margin && segmentDistance(a, b) < margin;
}

export class ShieldingElectrostatics {
  constructor({ wireRadius = 0.001, cage = {}, leafSegments = 4 } = {}) {
    if (!Number.isFinite(wireRadius) || wireRadius <= 0 || wireRadius > 0.006) throw new RangeError('网线半径必须有效');
    this.wireRadius = wireRadius;
    shieldingScope([0, 0], leafSegments);
    this.leafSegments = leafSegments;
    this.cage = shieldingCage(cage);
    const n = this.cage.length;
    this.matrix = this.cage.map(() => new Float64Array(n));
    for (let i = 0; i < n; i++)
      for (let j = 0; j <= i; j++)
        this.matrix[i][j] = this.matrix[j][i] = wireCoefficient(this.cage[i], this.cage[j], wireRadius);
    this.factor = cholesky(this.matrix);
    this.ones = solve(this.factor, Array(n).fill(1));
    this.capacitance = sum(this.ones); // physical capacitance is this / COULOMB
  }
  project(rhs) {
    const result = solve(this.factor, rhs),
      common = sum(result) / this.capacitance;
    return result.map((v, i) => v - this.ones[i] * common);
  }
  solve({
    cageOffset = [-0.32, 0, 0],
    cageAngle = 0,
    source = [0, 0.17, 0.15],
    sourceCharge = 60e-9,
    cageCharge = 0,
    scopeCharge = 0,
    angles = [0.01, 0.01],
  } = {}) {
    if (
      !finiteVector(cageOffset) ||
      !finiteVector(source) ||
      ![sourceCharge, cageCharge, scopeCharge, cageAngle].every(Number.isFinite) ||
      cageAngle < 0 ||
      cageAngle > Math.PI / 2
    )
      throw new RangeError('位置和电荷必须有限');
    const radius = this.wireRadius,
      E = shieldingScope(angles, this.leafSegments),
      m = E.length;
    const key = [...cageOffset, cageAngle].join(',');
    if (this._pose?.key !== key) {
      const C = this.cage.map((e) => positioned(e, cageOffset, cageAngle));
      const B = E.filter((e) => e.leaf === undefined).map((e) => C.map((c) => wireCoefficient(c, e, radius)));
      this._pose = { key, C, B, PB: B.map((b) => this.project(b)) };
    }
    const cache = this._pose,
      C = cache.C;
    for (const e of E)
      for (const c of C) if (conductorsTouch(c, e, radius)) throw new RangeError('网罩不能接触或穿过验电器金属');
    for (const element of [...C, ...E]) {
      const delta = source.map((v, i) => v - element.a[i]);
      const along = element.radius ? 0 : Math.max(0, Math.min(element.length, dot(delta, element.direction)));
      const distance = Math.hypot(...delta.map((v, i) => v - (element.radius ? 0 : along * element.direction[i])));
      if (distance < SHIELDING_SOURCE_RADIUS + (element.radius || radius))
        throw new RangeError('外部球不能接触或进入导体');
    }
    const external = (e) =>
      e.nodes.reduce((s, n) => {
        const d = Math.hypot(...n.point.map((v, i) => v - source[i]));
        if (d < 0.02) throw new RangeError('外部球不能接触或进入导体');
        return s + (n.weight * sourceCharge) / d;
      }, 0);
    const sourceKey = [...source, sourceCharge].join(',');
    if (cache.sourceKey !== sourceKey) {
      cache.bc = C.map(external);
      cache.Pbc = this.project(cache.bc);
      cache.sourceKey = sourceKey;
    }
    // Only the leaves move within the isolated instrument. Reuse the exact
    // fixed-body elimination, not a table of preset shielding percentages.
    const bc = cache.bc,
      be = E.map(external),
      movingB = E.filter((e) => e.leaf !== undefined).map((e) => C.map((c) => wireCoefficient(c, e, radius))),
      B = [...cache.B, ...movingB],
      PB = [...cache.PB, ...movingB.map((b) => this.project(b))],
      Pbc = cache.Pbc;
    const S = E.map((e, i) => Float64Array.from(E.map((f, j) => wireCoefficient(e, f, radius) - dot(B[i], PB[j]))));
    const constant = this.ones.map((v, i) => (v * cageCharge) / this.capacitance - Pbc[i]);
    const rhs = be.map((v, i) => -v - dot(B[i], constant)),
      factor = cholesky(S),
      u = solve(factor, Array(m).fill(1));
    const qe = solve(factor, rhs),
      scopePotential = (scopeCharge - sum(qe)) / sum(u);
    for (let i = 0; i < m; i++) qe[i] += scopePotential * u[i];
    const qc = constant.map((v, k) => v - PB.reduce((s, column, j) => s + column[k] * qe[j], 0));
    const cagePotential =
      (cageCharge + dot(this.ones, bc) + B.reduce((s, column, j) => s + dot(this.ones, column) * qe[j], 0)) /
      this.capacitance;
    // Charges and potentials come from the constrained energy minimum. No
    // condition on cage height switches either leaf off or changes its charge.
    const energy =
      COULOMB * (0.5 * (cageCharge * cagePotential + scopeCharge * scopePotential) + 0.5 * (dot(qc, bc) + dot(qe, be)));
    return {
      cage: C,
      scope: E,
      source: [...source],
      angles: [...angles],
      cageCharges: qc,
      scopeCharges: qe,
      leafCharges: [0, 1].map((index) => E.reduce((q, e, i) => q + (e.leaf === index ? qe[i] : 0), 0)),
      cagePotential: COULOMB * cagePotential,
      scopePotential: COULOMB * scopePotential,
      sourceCharge,
      cageCharge,
      scopeCharge,
      energy,
      // Interaction + induced-conductor self energy; source self energy is a
      // position-independent constant omitted here, so this quantity can be negative.
      coefficients: B,
      externalCage: bc,
      externalScope: be,
    };
  }
  fieldAt(point, state, { skipScope = -1 } = {}) {
    if (!finiteVector(point)) throw new RangeError('场点必须是有限坐标');
    const r = point.map((v, i) => v - state.source[i]),
      distance = Math.hypot(...r);
    if (distance < 1e-9) throw new RangeError('不能在外部点源上取场');
    const field = r.map((v) => (state.sourceCharge * v) / distance ** 3);
    for (const [elements, charges] of [
      [state.cage, state.cageCharges],
      [state.scope, state.scopeCharges],
    ]) {
      for (let j = 0; j < elements.length; j++) {
        if (elements === state.scope && j === skipScope) continue;
        const contribution = wireField(elements[j], point, this.wireRadius);
        for (let axis = 0; axis < 3; axis++) field[axis] += charges[j] * contribution[axis];
      }
    }
    return field.map((v) => v * COULOMB);
  }
  leafTorque(state, index) {
    if (index !== 0 && index !== 1) throw new RangeError('只存在左右两片箔');
    const side = index ? 1 : -1,
      angle = state.angles[index],
      source = { center: state.source, radius: SHIELDING_SOURCE_RADIUS };
    return state.scope.reduce((total, e, i) => {
      if (e.leaf !== index) return total;
      const integrate = (other, q, external = false) =>
        (farPair(e, other) ? e.farNodes : e.nodes).reduce((value, n) => {
          let field;
          if (external) {
            const r = n.point.map((v, j) => v - state.source[j]),
              cube = Math.hypot(...r) ** 3;
            field = r.map((v) => v / cube);
          } else field = wireField(other, n.point, this.wireRadius);
          const distance = e.startDistance + n.fraction * e.length;
          return value + n.weight * q * distance * (side * Math.cos(angle) * field[0] + Math.sin(angle) * field[1]);
        }, 0);
      let value = integrate(source, state.sourceCharge, true);
      for (let j = 0; j < state.cage.length; j++) value += integrate(state.cage[j], state.cageCharges[j]);
      for (let j = 0; j < state.scope.length; j++)
        if (j !== i) value += integrate(state.scope[j], state.scopeCharges[j]);
      return total + COULOMB * state.scopeCharges[i] * value;
    }, 0);
  }
  residual(state) {
    const vC = state.cagePotential / COULOMB,
      vE = state.scopePotential / COULOMB;
    let cage = 0,
      scope = 0;
    for (let i = 0; i < state.cage.length; i++) {
      const v =
        dot(this.matrix[i], state.cageCharges) +
        state.externalCage[i] +
        state.coefficients.reduce((s, col, j) => s + col[i] * state.scopeCharges[j], 0);
      cage = Math.max(cage, Math.abs(v - vC) * COULOMB);
    }
    for (let i = 0; i < state.scope.length; i++) {
      let v = state.externalScope[i] + dot(state.coefficients[i], state.cageCharges);
      for (let j = 0; j < state.scope.length; j++)
        v += wireCoefficient(state.scope[i], state.scope[j], this.wireRadius) * state.scopeCharges[j];
      scope = Math.max(scope, Math.abs(v - vE) * COULOMB);
    }
    return {
      cage,
      scope,
      cageCharge: sum(state.cageCharges) - state.cageCharge,
      scopeCharge: sum(state.scopeCharges) - state.scopeCharge,
    };
  }
}

export const SHIELDING_LEAF = Object.freeze({
  length: 0.035,
  width: 0.005,
  thickness: 1e-7,
  density: 19300,
  gravity: 9.8,
  damping: 1.5e-8,
  stopAngle: 1.1,
});

// Two independent gold-leaf rotations. Electrical equilibrium is recalculated
// at the actual angles at each Runge–Kutta stage; gravity, inertia and air damping
// determine motion. The cage does not directly assign a target leaf angle.
export class ShieldingExperiment {
  constructor({
    electrostatics = new ShieldingElectrostatics(),
    step = 1 / 60,
    damping = SHIELDING_LEAF.damping,
  } = {}) {
    if (!Number.isFinite(step) || step <= 0 || step > 1 / 60 || !Number.isFinite(damping) || damping < 0)
      throw new RangeError('时间步和箔片阻尼必须有效');
    this.electrostatics = electrostatics;
    this.step = step;
    this.damping = damping;
    const p = SHIELDING_LEAF;
    this.mass = p.length * p.width * p.thickness * p.density;
    this.inertia = (this.mass * p.length ** 2) / 3;
    this.reset();
  }
  reset() {
    this.cageOffset = [-0.32, 0, 0];
    this.cageAngle = 0;
    this.source = [0, 0.17, 0.46];
    this.sourceCharge = 60e-9;
    this.cageCharge = this.scopeCharge = 0;
    this.angles = [0, 0];
    this.velocities = [0, 0];
    this.time = this.remainder = this.heat = this.work = 0;
    this.nextStep = this.step;
    this._electrical = null;
    this.initialEnergy = this.energy();
  }
  at(angles = this.angles) {
    return this.electrostatics.solve({
      cageOffset: this.cageOffset,
      cageAngle: this.cageAngle,
      source: this.source,
      sourceCharge: this.sourceCharge,
      cageCharge: this.cageCharge,
      scopeCharge: this.scopeCharge,
      angles,
    });
  }
  get electrical() {
    return (this._electrical ||= this.at());
  }
  setSource(position) {
    return this.move('source', position);
  }
  setCage(position) {
    return this.move('cageOffset', position);
  }
  setCageAngle(angle) {
    return this.move('cageAngle', angle);
  }
  move(key, position) {
    if (key === 'cageAngle' ? !Number.isFinite(position) : !finiteVector(position))
      throw new RangeError('移动目标必须是有限三维坐标');
    const old = this.electrical;
    const next = this.electrostatics.solve({
      cageOffset: this.cageOffset,
      cageAngle: this.cageAngle,
      source: this.source,
      sourceCharge: this.sourceCharge,
      cageCharge: this.cageCharge,
      scopeCharge: this.scopeCharge,
      angles: this.angles,
      [key]: position,
    });
    this.work += next.energy - old.energy;
    this[key] = key === 'cageAngle' ? position : [...position];
    this._electrical = next;
    return next;
  }
  energy(angles = this.angles, velocities = this.velocities, state = this.electrical) {
    const p = SHIELDING_LEAF;
    return (
      state.energy +
      angles.reduce(
        (s, a, i) =>
          s + ((this.mass * p.gravity * p.length) / 2) * (1 - Math.cos(a)) + 0.5 * this.inertia * velocities[i] ** 2,
        0,
      )
    );
  }
  accelerations(angles, velocities, state) {
    const p = SHIELDING_LEAF;
    return angles.map(
      (a, i) =>
        (this.electrostatics.leafTorque(state, i) -
          ((this.mass * p.gravity * p.length) / 2) * Math.sin(a) -
          this.damping * velocities[i]) /
        this.inertia,
    );
  }
  advance(dt) {
    if (!Number.isFinite(dt) || dt < 0) throw new RangeError('时间增量必须有限且非负');
    this.remainder += dt;
    const p = SHIELDING_LEAF;
    // At fixed source/cage positions, electrical + gravitational + kinetic
    // energy can change only through damping or an inelastic angular stop.
    // Use that independent balance to resolve fast near-closed transients.
    // Powers-of-two steps depend on physical state, never render-frame length.
    while (this.remainder + 1e-12 >= this.nextStep) {
      const h = this.nextStep,
        before = this.energy();
      const evaluate = (angles, velocities, state) => {
        const constrained = angles.map((a) => Math.max(0, Math.min(p.stopAngle, a)));
        const acceleration = this.accelerations(constrained, velocities, state || this.at(constrained));
        const speed = [...velocities];
        for (let i = 0; i < 2; i++) {
          if (
            (angles[i] <= 0 && velocities[i] <= 0 && acceleration[i] < 0) ||
            (angles[i] >= p.stopAngle && velocities[i] >= 0 && acceleration[i] > 0)
          ) {
            speed[i] = acceleration[i] = 0;
          }
        }
        return {
          angles: speed,
          velocity: acceleration,
          heat: this.damping * speed.reduce((sum, v) => sum + v * v, 0),
        };
      };
      const stage = (previous, fraction) =>
        evaluate(
          this.angles.map((v, i) => v + h * fraction * previous.angles[i]),
          this.velocities.map((v, i) => v + h * fraction * previous.velocity[i]),
        );
      const a = evaluate(this.angles, this.velocities, this.electrical),
        b = stage(a, 0.5),
        c = stage(b, 0.5),
        d = stage(c, 1);
      let heat = (h * (a.heat + 2 * b.heat + 2 * c.heat + d.heat)) / 6;
      const angles = this.angles.map(
        (v, i) => v + (h * (a.angles[i] + 2 * b.angles[i] + 2 * c.angles[i] + d.angles[i])) / 6,
      );
      const velocities = this.velocities.map(
        (v, i) => v + (h * (a.velocity[i] + 2 * b.velocity[i] + 2 * c.velocity[i] + d.velocity[i])) / 6,
      );
      for (let i = 0; i < 2; i++) {
        if (angles[i] < 0 || angles[i] > p.stopAngle) {
          angles[i] = Math.max(0, Math.min(p.stopAngle, angles[i]));
          heat += 0.5 * this.inertia * velocities[i] ** 2;
          velocities[i] = 0;
        }
      }
      const electrical = this.at(angles);
      const error = Math.abs(this.energy(angles, velocities, electrical) + heat - before);
      const tolerance = 1e-14 + 0.002 * heat;
      if (error > tolerance) {
        if (h < this.step / 4096) throw new Error('箔片积分未收敛');
        this.nextStep = h / 2;
        continue;
      }
      this.angles = angles;
      this.velocities = velocities;
      this.heat += heat;
      this._electrical = electrical;
      this.remainder -= h;
      this.time += h;
      if (error < tolerance / 16) this.nextStep = Math.min(this.step, 2 * h);
    }
  }
}
