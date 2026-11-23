import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DRAG,
  TUBE_DROP,
  AIR_PRESSURE,
  dropDistance,
  landingTime,
  tubePressure,
} from '../src/lessons/kit/newtonTube.js';
test('同一高度，常压差异明显，低压时落地时差缩小，理想真空时相等', () => {
  for (const p of [0, 1e-9, 0.5, 20, AIR_PRESSURE]) {
    for (const k of Object.values(DRAG)) assert.ok(Math.abs(dropDistance(landingTime(p, k), p, k) - TUBE_DROP) < 1e-12);
  }
  const delta = (p) => landingTime(p, DRAG.feather) - landingTime(p, DRAG.iron);
  assert.ok(delta(AIR_PRESSURE) > 0.25);
  assert.ok(delta(0.5) > 0 && delta(0.5) < 0.003);
  assert.equal(delta(0), 0);
});
test('封闭阀隔离抽气与放气，进空气后恢复第一次对照的条件', () => {
  let p = tubePressure(AIR_PRESSURE, 8, 'pump', true);
  assert.ok(p >= 0.35 && p < 0.4);
  assert.equal(tubePressure(p, 5, 'closed', true), p);
  assert.equal(tubePressure(p, 5, 'pump', false), p);
  assert.ok(tubePressure(p, 4, 'vent', false) > 101.2);
});
