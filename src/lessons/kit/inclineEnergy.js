// 图 8.5-4；沿轨道向右下为正，位置是沿轨长度，落差为竖直长度。
import { FLAG_WIDTH, GATES } from './momentum.js';

export const GRAVITY = 9.8,
  RIGHT_STOP = 0.62 - 0.005 - 0.044; // 挡块内侧到滑块中心的接触位置

export function inclineRun({ start, slope, air }) {
  const theta = Math.atan(slope);
  // 在本装置的小倾角范围，断气后静摩擦能让从静止释放的滑块停住。
  const acceleration = air ? GRAVITY * Math.sin(theta) : 0;
  if (acceleration <= 0 || RIGHT_STOP - start <= 1e-7) return null;
  const arrival = (x) => Math.sqrt((2 * (x - start)) / acceleration);
  const gates = GATES.map((x) => {
    if (x - FLAG_WIDTH / 2 < start || x + FLAG_WIDTH / 2 > RIGHT_STOP) return null;
    // 遮光片前沿进入至后沿离开期间仍在加速，不能拿门中心的瞬时速度直接换计时。
    const enter = arrival(x - FLAG_WIDTH / 2),
      exit = arrival(x + FLAG_WIDTH / 2);
    return { enter, exit, milliseconds: Math.round((exit - enter) * 1000) };
  });
  const end = arrival(RIGHT_STOP);
  function position(t) {
    return start + 0.5 * acceleration * Math.min(end, Math.max(0, t)) ** 2;
  }
  return { theta, acceleration, end, position, gates };
}

export function measuredEnergy({ massGrams, heightMm, timesMs, flagMm }) {
  const mass = massGrams / 1000,
    [v1, v2] = timesMs.map((ms) => flagMm / ms);
  return { v1, v2, loss: (mass * GRAVITY * heightMm) / 1000, gain: (mass * (v2 * v2 - v1 * v1)) / 2 };
}

// 高度差来自两次毫米尺读数（各半格）；两次遮光时间各按 1 ms 的分度读出。
export function energyIntervals(data) {
  const [a, b] = data.timesMs;
  const low = measuredEnergy({ ...data, heightMm: data.heightMm - 1, timesMs: [a - 0.5, b + 0.5] });
  const high = measuredEnergy({ ...data, heightMm: data.heightMm + 1, timesMs: [a + 0.5, b - 0.5] });
  return { potential: [low.loss, high.loss], kinetic: [low.gain, high.gain] };
}
