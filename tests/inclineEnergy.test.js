import test from 'node:test';
import assert from 'node:assert/strict';
import { inclineRun, measuredEnergy, energyIntervals, GRAVITY, RIGHT_STOP } from '../src/lessons/kit/inclineEnergy.js';
import { GATES, FLAG_WIDTH } from '../src/lessons/kit/momentum.js';

test('加速中的滑块依次遮住和离开两束光，计时器按毫秒读出完整遮光时间', () => {
  const run = inclineRun({ start: -0.46, slope: 0.05, air: true });
  for (const [i, p] of run.gates.entries()) {
    assert.ok(Math.abs(run.position(p.enter) - (GATES[i] - FLAG_WIDTH / 2)) < 1e-10);
    assert.ok(Math.abs(run.position(p.exit) - (GATES[i] + FLAG_WIDTH / 2)) < 1e-10);
    assert.equal(p.milliseconds, Math.round((p.exit - p.enter) * 1000));
  }
  assert.ok(run.gates[1].milliseconds < run.gates[0].milliseconds);
  assert.ok(Math.abs(run.position(run.end + 3) - RIGHT_STOP) < 1e-10);
  const height = (GATES[1] - GATES[0]) * Math.sin(run.theta);
  const speedAt = (x) => Math.sqrt(2 * run.acceleration * (x + 0.46));
  const gain = (0.2 * (speedAt(GATES[1]) ** 2 - speedAt(GATES[0]) ** 2)) / 2;
  assert.ok(Math.abs(gain - 0.2 * GRAVITY * height) < 1e-12);
  const record = measuredEnergy({
    massGrams: 200,
    heightMm: Math.round(height * 1000),
    flagMm: 10,
    timesMs: run.gates.map((g) => g.milliseconds),
  });
  assert.ok(Math.abs(record.gain - record.loss) / record.loss < 0.12);
  const bounds = energyIntervals({
    massGrams: 200,
    heightMm: Math.round(height * 1000),
    flagMm: 10,
    timesMs: run.gates.map((g) => g.milliseconds),
  });
  for (const range of [bounds.potential, bounds.kinetic]) assert.ok(range[0] <= gain && gain <= range[1]);
});

test('断气或水平放手时不自行加速；从第一道门内释放不能补造它的完整读数', () => {
  assert.equal(inclineRun({ start: -0.46, slope: 0.05, air: false }), null);
  assert.equal(inclineRun({ start: -0.46, slope: 0, air: true }), null);
  const run = inclineRun({ start: GATES[0], slope: 0.05, air: true });
  assert.equal(run.gates[0], null);
  assert.ok(run.gates[1]);
});
