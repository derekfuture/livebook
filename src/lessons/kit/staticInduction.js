// 必修三 p.3 图9.1-3：准静态、绝缘支柱上的两导体。
// 轴向离散电势系数模型，有限半径核避免点电荷奇点；不是三维表面电荷精确解。
// 接触时共用等势约束及总电荷；分开后分别等势，各自净电荷守恒。
// 每节点加入有限局部自电势，抑制轴向采样的交错伪电荷；只展示净电荷与端部趋势，不作表面密度图。
// 电荷、电势使用归一单位，不冒充库仑/伏特或单个电子。
function solve(matrix, rhs) {
  const a = matrix.map((r, i) => [...r, rhs[i]]),
    n = rhs.length;
  for (let c = 0; c < n; c++) {
    let pivot = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[pivot][c])) pivot = r;
    if (Math.abs(a[pivot][c]) < 1e-12) throw new Error('Singular electrostatic constraints');
    [a[c], a[pivot]] = [a[pivot], a[c]];
    const scale = a[c][c];
    for (let j = c; j <= n; j++) a[c][j] /= scale;
    for (let r = 0; r < n; r++)
      if (r !== c) {
        const k = a[r][c];
        for (let j = c; j <= n; j++) a[r][j] -= k * a[c][j];
      }
  }
  return a.map((r) => r[n]);
}
export class StaticInduction {
  constructor({ nodes = 8 } = {}) {
    this.nodes = nodes;
    this.reset();
  }
  reset() {
    this.centers = [-0.055, 0.055];
    this.source = [-0.3, 0.12]; // x,z；导体轴在 z=0，带电体与轴等高。
    this.sourceCharge = 1;
    this.connected = true;
    this.net = [0, 0];
    this.recompute();
  }
  positions() {
    return this.centers.flatMap((c) =>
      Array.from({ length: this.nodes }, (_, i) => c - 0.047 + (i * 0.094) / (this.nodes - 1)),
    );
  }
  setSource(x, z) {
    this.source = [x, z];
    return this.recompute();
  }
  // UI 先在旧接触位置断开，再移动绝缘柱，避免在新位置重新分配净电荷。
  separate() {
    this.connected = false;
    return this.recompute();
  }
  move(index, x) {
    if (this.connected) throw new Error('Separate conductors before moving one');
    const next = [...this.centers];
    next[index] = x;
    if (next[1] - next[0] < 0.11 - 1e-9) throw new RangeError('Conductors overlap');
    this.centers = next;
    return this.recompute();
  }
  join() {
    if (Math.abs(this.centers[1] - this.centers[0] - 0.11) > 1e-6) return false;
    this.connected = true;
    this.recompute();
    return true;
  }
  recompute() {
    const positions = this.positions(),
      n = positions.length,
      groups = this.connected ? 1 : 2;
    const matrix = Array.from({ length: n + groups }, () => Array(n + groups).fill(0));
    const rhs = Array(n + groups).fill(0);
    const external = positions.map((x) => this.sourceCharge / Math.hypot(x - this.source[0], this.source[1], 0.012));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++)
        matrix[i][j] = (i === j ? 1 / 0.012 : 0) + 1 / Math.hypot(positions[i] - positions[j], 0.012);
      const g = this.connected ? 0 : Math.floor(i / this.nodes);
      matrix[i][n + g] = -1;
      matrix[n + g][i] = 1;
      rhs[i] = -external[i];
    }
    if (this.connected) rhs[n] = this.net[0] + this.net[1];
    else {
      rhs[n] = this.net[0];
      rhs[n + 1] = this.net[1];
    }
    const result = solve(matrix, rhs),
      charges = result.slice(0, n);
    const sums = [charges.slice(0, this.nodes), charges.slice(this.nodes)].map((a) => a.reduce((s, q) => s + q, 0));
    // 只在导通时允许两导体之间转移电子；断开后不累积求解舍入误差。
    if (this.connected) this.net = sums;
    this.state = { positions, charges, net: [...this.net], potentials: result.slice(n), external };
    return this.state;
  }
}
