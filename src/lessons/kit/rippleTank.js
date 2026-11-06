// 线性浅水波。扰动沿 +z 传播，挡板面法向流速为零。外缘的渐增阻尼代表消波材料。
export const DX = 0.0025,
  NX = 145,
  NZ = 109,
  BARRIER = 42,
  WAVELENGTH = 0.032;
const SPEED = 0.16,
  DT = 0.009,
  C2 = ((SPEED * DT) / DX) ** 2;
export class RippleTank {
  constructor() {
    this.surface = new Float32Array(NX * NZ);
    this.previous = new Float32Array(NX * NZ);
    this.next = new Float32Array(NX * NZ);
    this.drag = new Float32Array(NX * NZ);
    this.wall = new Uint8Array(NX * NZ);
    for (let z = 0; z < NZ; z++)
      for (let x = 0; x < NX; x++) {
        const edge = Math.min(x, NX - 1 - x, NZ - 1 - z);
        this.drag[z * NX + x] = (DT * (0.6 + 22 * Math.max(0, 1 - edge / 10) ** 2)) / 2;
      }
    this.setGap(-0.064, 0.064);
    this.clear();
  }
  setGap(left, right) {
    this.left = left;
    this.right = right;
    for (let z = BARRIER; z < BARRIER + 2; z++)
      for (let x = 0; x < NX; x++) {
        const k = z * NX + x,
          m = (x - (NX - 1) / 2) * DX;
        this.wall[k] = m <= left || m >= right;
        if (this.wall[k]) this.surface[k] = this.previous[k] = 0;
      }
  }
  clear() {
    this.surface.fill(0);
    this.previous.fill(0);
    this.next.fill(0);
    this.time = this.phase = this.remainder = 0;
  }
  advance(dt, powered) {
    this.remainder += dt;
    while (this.remainder >= DT) {
      this.step(powered);
      this.remainder -= DT;
    }
  }
  step(powered) {
    this.time += DT;
    if (powered) this.phase += (2 * Math.PI * SPEED * DT) / WAVELENGTH;
    const drive = powered ? Math.sin(this.phase) : 0;
    const u = this.surface,
      prev = this.previous,
      next = this.next,
      wall = this.wall;
    for (let x = 0; x < NX; x++) next[x] = drive;
    for (let z = 1; z < NZ; z++)
      for (let x = 0; x < NX; x++) {
        const k = z * NX + x;
        if (wall[k]) {
          next[k] = 0;
          continue;
        }
        const center = u[k],
          w = x > 0 && !wall[k - 1] ? u[k - 1] : center,
          e = x < NX - 1 && !wall[k + 1] ? u[k + 1] : center;
        const n = !wall[k - NX] ? u[k - NX] : center,
          s = z < NZ - 1 && !wall[k + NX] ? u[k + NX] : center;
        const d = this.drag[k];
        next[k] = (2 * center - (1 - d) * prev[k] + C2 * (w + e + n + s - 4 * center)) / (1 + d);
      }
    this.previous = u;
    this.surface = next;
    this.next = prev;
  }
}
