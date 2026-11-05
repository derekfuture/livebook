import test from 'node:test';
import assert from 'node:assert/strict';
import { advancePendulum, pendulumEstimate, timingMark } from '../src/lessons/kit/gravityPendulum.js';
test('同向过中线才是一次全振动，短摆角下多周期计时可复算 g', () => {
  const length = 0.64,
    sample = advancePendulum(0.045, 0, length, 20);
  const positive = sample.crossings.filter((e) => e.direction === 1);
  const { gravity } = pendulumEstimate(length, positive.at(-1).offset - positive[0].offset, positive.length - 1);
  assert.ok(Math.abs(gravity - 9.8) < 0.004);
  assert.ok(sample.crossings.every((e, i, all) => !i || e.direction !== all[i - 1].direction));
});
test('从大角释放的摆周期变长，不能用小角度公式制造无误差的测量', () => {
  const interval = (angle) => {
    const hits = advancePendulum(angle, 0, 0.64, 6).crossings;
    return hits[2].offset - hits[0].offset;
  };
  assert.ok(interval(0.5) > 1.014 * interval(0.02));
  assert.equal(advancePendulum(0, 0, 0.64, 5).crossings.length, 0);
});

test('提前或稍后按表指向同一次过线，反向过线不计作一个完整周期', () => {
  for (const dir of [-1, 1]) {
    const before = timingMark(-dir * 0.001, dir, 0.07, { [dir]: 0 });
    const after = timingMark(dir * 0.001, dir, 0.07, { [dir]: 1 });
    const end = timingMark(dir * 0.001, dir, 0.07, { [dir]: 21 });
    assert.deepEqual(before, after);
    assert.equal(end.ordinal - before.ordinal, 20);
    assert.notEqual(timingMark(0, -dir, 0.07, { 1: 1, '-1': 1 }).dir, before.dir);
  }
  assert.equal(timingMark(0.06, 0.1, 0.07, { 1: 2 }).atCenter, false);
});
