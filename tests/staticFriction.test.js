import test from 'node:test';
import assert from 'node:assert/strict';
import { frictionTrial, pullTo, SPRING_K, STATIC_MU, SLIDING_MU } from '../src/lessons/kit/staticFriction.js';
test('起动之前两种不同拉力都由静摩擦平衡，回撤拉环可将摩擦减为零', () => {
  const s = frictionTrial();
  for (const f of [1, 2, 0]) {
    pullTo(s, f / SPRING_K, 0.4);
    assert.equal(s.x, 0);
    assert.equal(s.friction, -f);
  }
  assert.equal(s.slipped, false);
});
test('缓拉越过最大静摩擦后发生滑动，纸团保留真实峰值，不能拿加速时的示数直接当滑动摩擦力', () => {
  const s = frictionTrial();
  pullTo(s, 0.09, 3);
  assert.ok(s.slipped && s.x > 0);
  assert.ok(s.peak >= STATIC_MU * s.mass * 9.8);
  assert.ok(s.peak < STATIC_MU * s.mass * 9.8 + 0.12);
  assert.ok(s.peak > SLIDING_MU * s.mass * 9.8);
  const peak = s.peak;
  pullTo(s, 0, 1);
  assert.equal(s.v, 0);
  assert.equal(s.tension, 0);
  assert.equal(s.peak, peak);
});
test('快速猛拉产生惯性过冲，纸团读数会超过缓拉得到的峰值', () => {
  const slow = frictionTrial(),
    fast = frictionTrial();
  pullTo(slow, 0.13, 4);
  pullTo(fast, 0.13, 0.12);
  assert.ok(fast.peak > slow.peak + 0.3);
});
