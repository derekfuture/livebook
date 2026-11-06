import { RippleTank, DX, NX, NZ } from './rippleTank.js';
export const REFLECTOR_LENGTH = 0.24,
  REFLECTOR_THICKNESS = 0.005;
// Same shallow-water solver and no-normal-flow boundary as the diffraction tank.
// Board angle is measured from +x toward +z; incoming waves travel along +z.
export class ReflectionTank extends RippleTank {
  constructor({ angle = Math.PI / 4, present = true } = {}) {
    super();
    this.setBoard(angle, present);
  }
  setBoard(angle, present = true) {
    if (!Number.isFinite(angle)) throw new RangeError('board angle must be finite');
    this.angle = angle;
    this.present = present;
    const c = Math.cos(angle),
      s = Math.sin(angle);
    for (let j = 0; j < NZ; j++)
      for (let i = 0; i < NX; i++) {
        const k = j * NX + i,
          x = (i - (NX - 1) / 2) * DX,
          z = (j - (NZ - 1) / 2) * DX;
        const along = x * c + z * s,
          normal = -x * s + z * c;
        const solid =
          present && Math.abs(along) <= REFLECTOR_LENGTH / 2 && Math.abs(normal) <= REFLECTOR_THICKNESS / 2 + DX * 0.35;
        this.wall[k] = solid ? 1 : 0;
        // Only cells newly covered by the board are displaced. Existing distant waves survive.
        if (solid) this.surface[k] = this.previous[k] = this.next[k] = 0;
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
