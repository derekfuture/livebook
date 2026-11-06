// 两物体从同一高度静止释放。固定姿态，忽略浮力和壁面接触，阻力按当地气体密度和 v² 变化。
export const TUBE_DROP = 0.34,
  AIR_PRESSURE = 101.3;
const G = 9.8;
export const DRAG = { iron: 0.018, feather: 20 }; // 常压下的 ρ C_D A/(2m)，单位 m⁻¹，作为演示参数。
export function dropDistance(t, pressure, coefficient) {
  const k = (coefficient * pressure) / AIR_PRESSURE;
  if (k === 0) return 0.5 * G * t * t;
  // ln(cosh u) = ln(1+2 sinh²(u/2))，低压小时保留有效数字。
  const u = t * Math.sqrt(k * G);
  return Math.log1p(2 * Math.sinh(u / 2) ** 2) / k;
}
export function landingTime(pressure, coefficient) {
  const k = (coefficient * pressure) / AIR_PRESSURE;
  if (k === 0) return Math.sqrt((2 * TUBE_DROP) / G);
  // cosh(u)-1 = 2 sinh²(u/2)。
  return (2 * Math.asinh(Math.sqrt(Math.expm1(k * TUBE_DROP) / 2))) / Math.sqrt(k * G);
}
export function tubePressure(p, dt, port, pump) {
  // 抽速近似不变，有有限极限压强；阀关闭时封存当时的压强。
  if (port === 'vent') return AIR_PRESSURE + (p - AIR_PRESSURE) * Math.exp(-2.4 * dt);
  if (port === 'pump' && pump) return 0.35 + (p - 0.35) * Math.exp(-1.2 * dt);
  return p;
}
