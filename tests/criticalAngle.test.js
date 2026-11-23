import assert from 'node:assert/strict';
import test from 'node:test';
import { CRITICAL_DEGREES, flatFace } from '../src/lessons/kit/criticalAngle.js';

test('玻璃到空气，正入射时反射 4%，斜入射时折射角比入射角大', () => {
  assert.ok(Math.abs(flatFace(0).reflectance - 0.04) < 1e-10);
  assert.ok(flatFace(30).refracted > Math.PI / 6);
  assert.ok(Math.abs(Math.sin(flatFace(30).refracted) - 0.75) < 1e-12);
});
test('临界角两侧明确区分近切向折射与全反射', () => {
  assert.ok(Math.abs(CRITICAL_DEGREES - 41.8103) < 0.0001);
  const almost = flatFace(CRITICAL_DEGREES - 0.00001);
  assert.ok(almost.refracted > (89 * Math.PI) / 180 && almost.transmittance > 0);
  for (const angle of [CRITICAL_DEGREES, 42, 80]) {
    assert.deepEqual(flatFace(angle), { refracted: null, reflectance: 1, transmittance: 0 });
  }
});
