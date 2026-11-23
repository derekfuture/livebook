import assert from 'node:assert/strict';
import test from 'node:test';
import { handTrace, comparison } from '../src/lessons/kit/ticker/handtrace.js';

test('同一匀速手势按 50 Hz 打点，输入事件频率不改变位移', () => {
  for (const hz of [24, 60, 120]) {
    const trace = handTrace(3, 0.01);
    for (let j = 1; j <= hz; j++) trace.sample(3 + j / hz, 0.01 + (0.2 * j) / hz);
    assert.equal(trace.marks.length, 51);
    for (const { tick, x } of trace.marks) assert.ok(Math.abs(x - (0.01 + 0.004 * tick)) < 1e-10);
    const points = comparison(trace.marks, 0.051);
    assert.equal(points[0].tick, 10);
    for (const j of [3, 5]) assert.ok(Math.abs((points[j].x - points[0].x) / (j * 0.02) - 0.2) < 1e-10);
  }
});
test('停顿的重合点保留时间，不能跨停顿拼出五个间隔', () => {
  const trace = handTrace(0, 0);
  trace.sample(0.06, 0.018);
  trace.sample(120, 0.018);
  trace.sample(120.06, 0.036);
  assert.equal(comparison(trace.marks), null);
  assert.ok(trace.marks.length < 12);
  trace.sample(120.2, 0.092);
  const segment = comparison(trace.marks);
  assert.ok(segment[0].tick >= 6000);
  assert.equal(segment[5].tick - segment[0].tick, 5);
});
