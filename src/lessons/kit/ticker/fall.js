import { PERIOD } from './motion.js';

export const GRAVITY = 9.8;
// 一条纸带只对应一次释放。打点由交流电源的时钟决定，下落运动独立于该时钟。
export function fallingTape(mass, dragForce, distance) {
  const a = GRAVITY - dragForce / mass,
    end = Math.sqrt((2 * distance) / a),
    marks = [];
  let on = false,
    segment = 0,
    next = 0;
  const position = (t) => 0.5 * a * Math.min(end, Math.max(0, t)) ** 2;
  function advance(t) {
    if (!on) return;
    while (next <= Math.min(end, t) + 1e-9) {
      marks.push({ t: next, x: position(next), segment });
      next += PERIOD;
    }
  }
  function power(enabled, t) {
    advance(t);
    on = enabled;
    if (on) {
      segment++;
      next = t < 0 ? t + Math.ceil(-t / PERIOD - 1e-9) * PERIOD : t;
      next = Math.max(0, next);
      advance(t);
    }
  }
  return { marks, position, advance, power, end };
}
export function energyPoints(marks) {
  const centers = [];
  for (let i = 1; i + 1 < marks.length; i++) {
    if (marks[i - 1].segment === marks[i + 1].segment && marks[i].x - marks[i - 1].x >= 0.002) centers.push(i);
  }
  return centers;
}
