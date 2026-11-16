import test from 'node:test';
import assert from 'node:assert/strict';
import { GROOVES, compareRotors, isolatedFactor } from '../src/lessons/kit/centripetal.js';

test('塔轮切向速度相同，质量、半径、角速度加倍的力比分别为 2、2、4', () => {
  for (const [m, r, level, expected] of [
    [0.1, 0.06, 0, 2],
    [0.05, 0.12, 0, 2],
    [0.05, 0.06, 1, 4],
  ]) {
    for (const speed of [-5.1, 3.7, 5.4]) {
      const [left, right] = compareRotors(m, r, level, speed);
      assert.ok(Math.abs(left.omega * GROOVES[level][0] - right.omega * GROOVES[level][1]) < 1e-10);
      assert.ok(Math.abs(left.force / right.force - expected) < 1e-10);
      assert.ok(Math.abs(left.force - (m * (r * left.omega) ** 2) / r) < 1e-10);
    }
  }
});
test('对照组、混合变量不能作为单因素证据，停车时径向力为零', () => {
  assert.equal(isolatedFactor(0, 0.06, 0), null);
  assert.equal(isolatedFactor(0.05, 0.06, 0), null);
  assert.equal(isolatedFactor(0.1, 0.12, 0), null);
  assert.equal(isolatedFactor(0.1, 0.06, 0), 'mass');
  assert.equal(isolatedFactor(0.05, 0.12, 0), 'radius');
  assert.equal(isolatedFactor(0.05, 0.06, 1), 'omega');
  assert.ok(compareRotors(0.1, 0.12, 1, 0).every((m) => m.force === 0));
});
