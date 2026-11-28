// 配制好的油酸酒精溶液：取 1.00 mL 纯油酸，加酒精至总体积 500 mL。
export const OIL_FRACTION = 1 / 500;
export const GRID = 0.01; // 玻璃板每格边长 1 cm。
export const DROP_ML = 0.020;
export const MODEL_THICKNESS_NM = 2.0; // 生成油膜轮廓用的示意膜厚。
export function pureOilPerDrop(startMl, endMl, count, fraction = OIL_FRACTION) {
  if (!(startMl > endMl && endMl >= 0 && count > 0 && Number.isInteger(count) && fraction > 0 && fraction <= 1))
    return null;
  return ((startMl - endMl) * fraction) / count;
}
export function molecularSizeNm(pureMl, squareCount) {
  if (!(pureMl > 0 && squareCount > 0)) return null;
  return ((pureMl * 1e-6) / (squareCount * GRID ** 2)) * 1e9;
}
export function polygonArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    sum += a.x * b.z - b.x * a.z;
  }
  return Math.abs(sum) / 2;
}
export function filmOutline(x, z, pureMl, phase = 0) {
  const points = [];
  for (let i = 0; i < 144; i++) {
    const theta = (i / 144) * 2 * Math.PI;
    const radius =
      1 + 0.13 * Math.cos(3 * theta + phase) + 0.075 * Math.sin(5 * theta - 0.4) + 0.028 * Math.cos(8 * theta);
    points.push({ x: 1.09 * radius * Math.cos(theta), z: 0.93 * radius * Math.sin(theta) });
  }
  const scale = Math.sqrt((pureMl * 1e-6) / (MODEL_THICKNESS_NM * 1e-9 * polygonArea(points)));
  return points.map((p) => ({ x: x + p.x * scale, z: z + p.z * scale }));
}
function clip(points, axis, edge, sign) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length],
      insideA = (a[axis] - edge) * sign >= 0,
      insideB = (b[axis] - edge) * sign >= 0;
    if (insideA) out.push(a);
    if (insideA !== insideB) {
      const t = (edge - a[axis]) / (b[axis] - a[axis]);
      out.push({ x: a.x + t * (b.x - a.x), z: a.z + t * (b.z - a.z) });
    }
  }
  return out;
}
export function countFilmSquares(points) {
  if (points.length < 3) return 0;
  const xs = points.map((p) => p.x),
    zs = points.map((p) => p.z);
  let count = 0;
  for (let j = Math.floor(Math.min(...zs) / GRID); j < Math.ceil(Math.max(...zs) / GRID); j++) {
    const row = clip(clip(points, 'z', j * GRID, 1), 'z', (j + 1) * GRID, -1);
    for (let i = Math.floor(Math.min(...xs) / GRID); i < Math.ceil(Math.max(...xs) / GRID); i++) {
      const cell = clip(clip(row, 'x', i * GRID, 1), 'x', (i + 1) * GRID, -1);
      if (polygonArea(cell) >= GRID ** 2 * 0.5 - 1e-12) count++;
    }
  }
  return count;
}
