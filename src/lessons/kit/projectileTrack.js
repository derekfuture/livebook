// 图 5.3-3。槽口水平，坐标原点取离槽时的球心，落差向下为正，长度均为 m。
export const TRACK_G = 9.8;
export const TIME_STEP = 0.05;
export function rollingExitSpeed(height) {
  // 实心球从静止无滑动滚下，势能同时转化为平动和转动动能。
  return Math.sqrt((10 / 7) * TRACK_G * height);
}
export function fallDistance(t) {
  return 0.5 * TRACK_G * t * t;
}
export function printAtDrop(height, drop) {
  if (!(height > 0 && drop > 0)) return null;
  const t = Math.sqrt((2 * drop) / TRACK_G);
  return { x: rollingExitSpeed(height) * t, drop, t };
}
// 在学生描出的线段内插读数，不能把没有画到的地方外推成理论轨迹。
export function tracedX(points, drop) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    if (b.drop > a.drop && a.drop <= drop && drop <= b.drop) {
      return a.x + ((b.x - a.x) * (drop - a.drop)) / (b.drop - a.drop);
    }
  }
  return null;
}
