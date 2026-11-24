import { FLAG_WIDTH, GATES } from './momentum.js';

const LIMIT = 0.56; // 与气垫导轨两端缓冲器的位置一致。

// 轻弹簧从压缩到原长，两块绕共同质心反向加速，脱离后各自匀速过门。
export function springRelease(masses, starts, compression) {
  const total = masses[0] + masses[1];
  const omega = Math.sqrt(12 * (1 / masses[0] + 1 / masses[1]));
  const duration = Math.PI / (2 * omega);
  const shifts = [-masses[1] / total, masses[0] / total].map((f) => f * compression);
  const legs = shifts.map((dx, i) => {
    const x = starts[i] + dx,
      v = dx * omega;
    return { start: duration, end: duration + (Math.sign(v) * LIMIT - x) / v, x, v };
  });
  const events = legs
    .map(({ start, x, v }, i) => {
      const middle = start + (GATES[i] - x) / v;
      const half = FLAG_WIDTH / (2 * Math.abs(v));
      return { enter: middle - half, exit: middle + half, direction: Math.sign(v), gate: i, glider: i, stage: 1 };
    })
    .sort((a, b) => a.exit - b.exit);
  return {
    events,
    duration,
    end: Math.max(...legs.map((leg) => leg.end)),
    positions(t) {
      if (t < duration) return starts.map((x, i) => x + shifts[i] * (1 - Math.cos(omega * t)));
      return legs.map((leg) => leg.x + leg.v * (Math.min(t, leg.end) - duration));
    },
  };
}
