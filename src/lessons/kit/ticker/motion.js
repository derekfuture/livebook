// 水平木板、轻绳和理想滑轮。位置从释放点沿运动方向量，单位为 m、s、kg。
export const PERIOD = 1 / 50;
export const TRAVEL = 0.335;
export const CART_MASS = 0.45;
export const LOADS = [0.05, 0.075, 0.1];

export function makeRun(load) {
  const a = (load * 9.8) / (CART_MASS + load);
  return { load, a, end: Math.sqrt((2 * TRAVEL) / a), t: 0, x: 0, marks: [], next: 0, recording: false };
}

export function power(run, on) {
  run.recording = on;
  if (on) {
    const previous = run.marks.at(-1);
    run.next = previous ? Math.max(run.t, previous.t + PERIOD) : run.t;
    // 重新通电会开始一段新的等时记录，不能跨断电的间隙估速度。
    run.segment = (run.segment || 0) + 1;
    advance(run, 0);
  }
}

function position(run, t) {
  return (run.v0 || 0) * t + 0.5 * run.a * t ** 2;
}

export function advance(run, dt) {
  const t = Math.min(run.end, run.t + dt);
  if (run.recording) {
    while (run.next <= t + 1e-9) {
      run.marks.push({ t: run.next, x: position(run, run.next), segment: run.segment });
      run.next += PERIOD;
    }
  }
  run.t = t;
  run.x = position(run, t);
}

export function centers(marks, origin) {
  const out = [];
  for (let i = origin + 5; i + 5 < marks.length && marks[i + 5].segment === marks[origin].segment; i += 5) out.push(i);
  return out;
}
