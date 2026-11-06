import assert from 'node:assert/strict';
import test from 'node:test';
import { ampereForce, swingRod } from '../src/lessons/kit/ampereRod.js';
test('单独对调电流或磁极时力反向，两者同时对调时力恢复', () => {
  const f = ampereForce(2.5, 1);
  assert.ok(f > 0);
  assert.equal(ampereForce(-2.5, 1), -f);
  assert.equal(ampereForce(2.5, -1), -f);
  assert.equal(ampereForce(-2.5, -1), f);
});
test('通电稳定偏角满足受力平衡，切断电路后连续摆回竖直', () => {
  const s = { angle: 0, speed: 0 },
    f = ampereForce(2.5, 1);
  swingRod(s, 6, f);
  assert.ok(Math.abs(Math.tan(s.angle) - f / (0.016 * 9.8)) < 0.0001);
  const before = s.angle;
  swingRod(s, 0.01, 0);
  assert.ok(s.angle > 0 && s.angle < before && s.speed < 0);
  swingRod(s, 6, 0);
  assert.ok(Math.abs(s.angle) < 0.0001);
});
