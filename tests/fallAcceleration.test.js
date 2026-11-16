import test from 'node:test';
import assert from 'node:assert/strict';
import { fallingTape } from '../src/lessons/kit/ticker/fall.js';
import { fallQuartets, compareIntervals, STRIDE } from '../src/lessons/kit/ticker/fallAcceleration.js';
test('异步启动计时器仍可从同一纸带上比较三段位移，尺零点不影响实测加速度', () => {
  for (const m of [0.15, 0.25]) {
    const a = 9.8 - 0.015 / m,
      run = fallingTape(m, 0.015, 0.255);
    run.power(true, -0.093);
    run.advance(run.end);
    const starts = fallQuartets(run.marks);
    assert.ok(starts.length >= 2);
    for (const start of starts) {
      const positions = Array.from({ length: 4 }, (_, i) => 47 + run.marks[start + i * STRIDE].x * 1000);
      const { steps, estimates } = compareIntervals(positions);
      assert.ok(steps.every((d, i) => !i || d > steps[i - 1]));
      assert.ok(estimates.every((v) => Math.abs(v - a) < 1e-8));
    }
  }
});
test('中途断电的两段记录不能跨越缺点测加速度', () => {
  const run = fallingTape(0.25, 0, 0.255);
  run.power(true, 0);
  run.power(false, 0.08);
  run.power(true, 0.11);
  run.advance(run.end);
  assert.deepEqual(fallQuartets(run.marks), []);
});
