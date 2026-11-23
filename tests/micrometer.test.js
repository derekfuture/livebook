import test from 'node:test';
import assert from 'node:assert/strict';
import { micrometerReading, turnSpindle } from '../src/lessons/kit/micrometer.js';

test('教材图 11.3-5 包含露出的半毫米和微分筒的半格估读', () => {
  assert.deepEqual(micrometerReading(6.725), { sleeve: 6.5, division: 22.5 });
  assert.deepEqual(micrometerReading(0.5), { sleeve: 0.5, division: 0 });
  assert.deepEqual(micrometerReading(0.499), { sleeve: 0, division: 49.9 });
});

test('每圈推进一个螺距，接触后微调轮空转，重物和空测砧都不能被穿过', () => {
  assert.equal(turnSpindle(1, 1, 0).gap, 1.5);
  const wire = 0.625;
  assert.deepEqual(turnSpindle(1, -1, wire, true), { gap: wire, slipped: true });
  assert.deepEqual(turnSpindle(wire, -1, wire, false), { gap: wire, slipped: false });
  assert.deepEqual(turnSpindle(wire, 1, wire, true), { gap: 1.125, slipped: false });
  assert.deepEqual(turnSpindle(0, -0.1, 0, true), { gap: 0, slipped: true });
});
