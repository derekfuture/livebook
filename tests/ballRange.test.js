import test from 'node:test';
import assert from 'node:assert/strict';
import { BALL_MASSES, BALL_RADIUS, LIP_HEIGHT, rangeShot } from '../src/lessons/kit/ballRange.js';

test('槽口碰撞时两球相切，重球稍后离开同一槽口；各自的飞行时间相同', () => {
  const s = rangeShot(0.06, true),
    [heavy, light] = s.flights;
  assert.ok(Math.abs(s.position(0, 0).x + 2 * BALL_RADIUS) < 1e-12);
  assert.equal(s.position(1, 0).x, 0);
  assert.ok(heavy.offset > light.offset);
  for (const [i, f] of s.flights.entries()) {
    assert.equal(s.position(i, f.offset).x, 0);
    assert.ok(Math.abs(s.position(i, f.land).drop - LIP_HEIGHT) < 1e-12);
    assert.equal(s.position(i, f.land).x, f.range);
  }
});

test('同一高度的基准落点能验证动量；把第二次释放点降低会产生方向确定的偏差', () => {
  const before = rangeShot(0.06, false).flights[0].range * BALL_MASSES[0];
  function after(h) {
    return rangeShot(h, true).flights.reduce((sum, f, i) => sum + BALL_MASSES[i] * f.range, 0);
  }
  assert.ok(Math.abs(before - after(0.06)) < 1e-12);
  assert.ok(after(0.04) < before);
});
