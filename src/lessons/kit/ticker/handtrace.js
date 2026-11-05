import { PERIOD } from './motion.js';

// 输入是纸带端部的实测位置；在相邻位置之间按打点时钟等间隔采样。
export function handTrace(startTime, startX) {
  const marks = [{ tick: 0, x: startX }];
  let previousTime = startTime,
    previousX = startX,
    next = 1;
  function sample(t, x) {
    if (t <= previousTime) return;
    const last = Math.floor((t - startTime) / PERIOD + 1e-8);
    if (x === previousX && last >= next) {
      // 停着时所有脉冲都落在同一点，只保留这一串的首尾及原始时标。
      if (marks.at(-1).x !== x) marks.push({ tick: next, x });
      if (last > marks.at(-1).tick) {
        if (marks.length > 1 && marks.at(-2).x === x) marks.pop();
        marks.push({ tick: last, x });
      }
      next = last + 1;
    } else {
      for (; next <= last; next++) {
        const u = Math.min(1, (startTime + next * PERIOD - previousTime) / (t - previousTime));
        marks.push({ tick: next, x: previousX + (x - previousX) * u });
      }
    }
    previousTime = t;
    previousX = x;
  }
  return { marks, sample };
}

// 取能看清六个连续打点的一段，D 后第 1、3、5 个间隔分别到 E、F、G。
export function comparison(marks, nearX) {
  let best = null,
    score = -Infinity;
  for (let d = 0; d + 5 < marks.length; d++) {
    const segment = marks.slice(d, d + 6);
    if (segment[5].tick - segment[0].tick !== 5) continue;
    const narrowest = Math.min(...segment.slice(1).map((m, i) => m.x - segment[i].x));
    const rank = nearX === undefined ? narrowest : -Math.abs(segment[0].x - nearX);
    if (narrowest >= 0.001 && rank > score) {
      best = segment;
      score = rank;
    }
  }
  return best;
}
