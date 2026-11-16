// 水果电池的教学模型。长度用 mm。标称电动势与电阻系数是模拟设值，不是梨的材料常数。
export const FRUIT_EMF = 0.84;

export function fruitResistance(spacing, depths, polarization = 0) {
  const [cu, zn] = depths;
  if (cu <= 0 || zn <= 0) return Infinity;
  const surface = 300 * (18 / cu + 18 / zn);
  const juice = 600 * (spacing / 10) * (18 / Math.min(cu, zn));
  return surface + juice + 1800 * polarization;
}

// 通电时极化逐渐增加，断电后逐渐恢复；反应速率不作为教材给出的实测数据。
export function polarize(p, amps, dt) {
  const load = Math.abs(amps) / 0.0003;
  const target = load / (1 + load);
  return target + (p - target) * Math.exp(-dt / (load > 0.01 ? 65 : 32));
}

export function fitFruit(samples) {
  if (samples.length < 2) return null;
  const xy = samples.map(({ ohms, volts }) => [(1000 * volts) / ohms, volts]);
  const n = xy.length,
    x = xy.reduce((s, p) => s + p[0], 0) / n,
    y = xy.reduce((s, p) => s + p[1], 0) / n;
  const xx = xy.reduce((sum, p) => sum + (p[0] - x) ** 2, 0);
  if (xx < 1e-10) return null;
  const r = -xy.reduce((sum, p) => sum + (p[0] - x) * (p[1] - y), 0) / xx;
  return { emf: y + r * x, kOhm: r };
}
