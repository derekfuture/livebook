// 两杆由同一振动片驱动。波高归一化；同一线性浅水波方程，局部周期力产生两列圆形波。
import { RippleTank, DX, NX, NZ, SPEED, DT, WAVELENGTH } from './rippleTank.js';
export const SOURCES = [
  [-0.045, -0.06],
  [0.045, -0.06],
];
export class InterferenceTank extends RippleTank {
  constructor(active = [true, true]) {
    super();
    this.wall.fill(0); // 干涉水槽不放衍射挡板。
    this.active = [...active];
  }
  step(powered) {
    // 消波边界和已有波场继续演化；切换入水杆不清空旧波。
    super.step(false);
    if (powered) this.phase += (2 * Math.PI * SPEED * DT) / WAVELENGTH;
    const drive = powered ? 0.15 * Math.sin(this.phase) : 0,
      kernel = [1, 2, 1];
    for (let i = 0; i < SOURCES.length; i++) {
      if (!this.active[i]) continue;
      const [x, z] = SOURCES[i],
        col = Math.round(x / DX + (NX - 1) / 2),
        row = Math.round(z / DX + (NZ - 1) / 2);
      for (let dz = -1; dz <= 1; dz++)
        for (let dx = -1; dx <= 1; dx++) {
          this.surface[(row + dz) * NX + col + dx] += (drive * kernel[dx + 1] * kernel[dz + 1]) / 16;
        }
    }
  }
  sample(x, z) {
    const a = Math.max(0, Math.min(NX - 1, x / DX + (NX - 1) / 2)),
      b = Math.max(0, Math.min(NZ - 1, z / DX + (NZ - 1) / 2));
    const i = Math.min(NX - 2, Math.floor(a)),
      j = Math.min(NZ - 2, Math.floor(b)),
      u = a - i,
      v = b - j,
      k = j * NX + i,
      s = this.surface;
    return (1 - v) * (s[k] * (1 - u) + s[k + 1] * u) + v * (s[k + NX] * (1 - u) + s[k + NX + 1] * u);
  }
}
