import test from 'node:test';
import assert from 'node:assert/strict';
import { fallDistance, printAtDrop, rollingExitSpeed, tracedX, TIME_STEP } from '../src/lessons/kit/projectileTrack.js';
test('同一放球高度，三段等时的水平位移相同；落差比为 1:4:9', () => {
  const h = 0.046,
    marks = [1, 2, 3].map((k) => printAtDrop(h, fallDistance(TIME_STEP * k)));
  let prev = 0;
  for (const m of marks) {
    assert.ok(Math.abs(m.x - prev - rollingExitSpeed(h) * TIME_STEP) < 1e-12);
    prev = m.x;
  }
  assert.ok(Math.abs(marks[2].drop / marks[0].drop - 9) < 1e-10);
  assert.ok(Math.abs(printAtDrop(h * 4, marks[0].drop).x / marks[0].x - 2) < 1e-12);
});
test('读的是手描轨迹，离开已描范围无读数', () => {
  const p = [
    { x: 0, drop: 0 },
    { x: 0.05, drop: 0.018 },
    { x: 0.094, drop: 0.072 },
  ];
  assert.ok(Math.abs(tracedX(p, 0.045) - 0.072) < 1e-12);
  assert.equal(tracedX(p, 0.1), null);
});
