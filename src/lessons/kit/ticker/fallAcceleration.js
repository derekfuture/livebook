// 50 Hz 纸带上每三个实际打点间隔取一个位置。四个位置给出两个相邻等时段的加速度估计。
import { PERIOD } from './motion.js';

export const STRIDE = 3;
export function fallQuartets(marks) {
  const starts = [];
  for (let i = 0; i + 3 * STRIDE < marks.length; i++) {
    const end = i + 3 * STRIDE;
    if (marks[i].segment === marks[end].segment && Math.abs(marks[end].t - marks[i].t - 3 * STRIDE * PERIOD) < 1e-7)
      starts.push(i);
  }
  return starts;
}
export function compareIntervals(positions) {
  const steps = positions.slice(1).map((p, i) => p - positions[i]); // 尺的读数为毫米
  const estimates = steps.slice(1).map((d, i) => (d - steps[i]) / (1000 * (STRIDE * PERIOD) ** 2));
  return { steps, estimates };
}
