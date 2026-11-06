// 长度单位 μm。稀悬浮液中等效球形颗粒横向的两个投影分量，各有方差 2DΔt。
export function diffusivity(radius, temperature) {
  // 20–40 °C 水的动力黏度；在实验范围内对 log(η) 插值。
  const fraction = (temperature - 20) / 20,
    viscosity = 0.001002 * (0.653 / 1.002) ** fraction;
  return ((1.380649e-23 * (temperature + 273.15)) / (6 * Math.PI * viscosity * radius * 1e-6)) * 1e12;
}
function gaussianPair(random) {
  const r = Math.sqrt(-2 * Math.log(1 - random())),
    angle = 2 * Math.PI * random();
  return [r * Math.cos(angle), r * Math.sin(angle)];
}
export function advanceParticle(p, temperature, dt, random = Math.random) {
  const [x, y] = gaussianPair(random),
    sigma = Math.sqrt(2 * diffusivity(p.radius, temperature) * dt);
  p.x += sigma * x;
  p.y += sigma * y;
}
export function makeParticles(random = Math.random) {
  // 观测窗外仍有颗粒；切换倍率只是重新取景。
  return Array.from({ length: 160 }, (_, i) => ({
    id: i,
    x: i ? (random() - 0.5) * 94 : 0,
    y: i ? (random() - 0.5) * 94 : 0,
    radius: 0.48 + random() * 0.36,
  }));
}
export const meanSquareStep = (points) =>
  points.slice(1).reduce((sum, p, i) => sum + (p.x - points[i].x) ** 2 + (p.y - points[i].y) ** 2, 0) /
  (points.length - 1);
