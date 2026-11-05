// 水平纸面中的坐标以米计，z 轴垂直于玻璃砖的两条平行长边。
export const SLAB_THICKNESS = 0.06,
  SLAB_WIDTH = 0.19,
  GLASS_INDEX = 1.52;
const front = -SLAB_THICKNESS / 2,
  back = SLAB_THICKNESS / 2;
const inside = (x) => Math.abs(x) <= SLAB_WIDTH / 2;

function intersectFace(p, q, z) {
  if (Math.abs(q.z - p.z) < 1e-9) return null;
  return p.x + ((z - p.z) * (q.x - p.x)) / (q.z - p.z);
}
export function tracePins(a, b) {
  if (!(a.z < b.z && b.z < front)) return null;
  const entry = intersectFace(a, b, front);
  const slope = (b.x - a.x) / (b.z - a.z),
    sinI = slope / Math.hypot(1, slope),
    sinR = sinI / GLASS_INDEX;
  const exit = entry + (SLAB_THICKNESS * sinR) / Math.sqrt(1 - sinR * sinR);
  if (!inside(entry) || !inside(exit)) return null;
  return { entry, exit, slope };
}
// 给定眼位，从一根远侧针到眼睛的实际光路由两段空气和一段玻璃共同确定。
// 使用平行板横向平移量的单调性反求 sin(i)，不预设眼睛已经与 A、B 对齐。
export function sightPin(pin, eye) {
  if (!(pin.z < front && eye.z > back)) return null;
  const air = eye.z - pin.z - SLAB_THICKNESS;
  let lo = -1,
    hi = 1;
  for (let i = 0; i < 50; i++) {
    const s = (lo + hi) / 2,
      r = s / GLASS_INDEX;
    const offset = (air * s) / Math.sqrt(1 - s * s) + (SLAB_THICKNESS * r) / Math.sqrt(1 - r * r);
    if (offset < eye.x - pin.x) lo = s;
    else hi = s;
  }
  const s = (lo + hi) / 2,
    slope = s / Math.sqrt(1 - s * s);
  const entry = pin.x + (front - pin.z) * slope,
    exit = eye.x - (eye.z - back) * slope;
  if (!inside(entry) || !inside(exit)) return null;
  return { entry, exit, slope, apparentX: eye.x - (eye.z - pin.z) * slope };
}
// 完全由学生的四个针孔重建入射线和玻璃内光线。
export function indexFromPins(a, b, c, d) {
  if (!(a.z < b.z && b.z < front && c.z > back && d.z > c.z)) return null;
  const entry = intersectFace(a, b, front),
    exit = intersectFace(c, d, back);
  if (!inside(entry) || !inside(exit)) return null;
  const incident = Math.atan2(b.x - a.x, b.z - a.z),
    refracted = Math.atan2(exit - entry, SLAB_THICKNESS);
  if (Math.abs(refracted) < 1e-7 || Math.sign(incident) !== Math.sign(refracted)) return null;
  return { entry, exit, incident, refracted, index: Math.sin(incident) / Math.sin(refracted) };
}

// 在眼睛的水平截面上求针头两边缘的出射方向。前针的角范围应覆盖后针。
export function headSpan(pin, eye, radius, throughGlass) {
  let low = Infinity,
    high = -Infinity;
  for (let j = 0; j < 20; j++) {
    const angle = (2 * Math.PI * j) / 20;
    const edge = { x: pin.x + radius * Math.cos(angle), z: pin.z + radius * Math.sin(angle) };
    const slope = throughGlass ? sightPin(edge, eye)?.slope : (eye.x - edge.x) / (eye.z - edge.z);
    if (slope === undefined || eye.z <= edge.z) return null;
    const direction = Math.atan(slope);
    low = Math.min(low, direction);
    high = Math.max(high, direction);
  }
  return { low, high };
}
export function hides(frontHead, farHead) {
  const tolerance = 0.0006;
  return !!(
    frontHead &&
    farHead &&
    frontHead.low <= farHead.low + tolerance &&
    frontHead.high >= farHead.high - tolerance
  );
}
