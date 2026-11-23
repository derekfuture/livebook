import test from 'node:test';
import assert from 'node:assert/strict';
import { METER_STOPS, meterBranch, meterFraction, ohmScaleValue } from '../src/lessons/kit/multimeter.js';

test('短接满偏、开路无偏转、中值半偏，欧姆刻度与倍率独立', () => {
  for (const stop of METER_STOPS.filter((s) => s.mode === 'ohm')) {
    const { R, E } = meterBranch(stop, 0);
    for (const resistance of [0, 20 * stop.multiplier, 180, Infinity]) {
      const fraction = meterFraction(stop, { I: E / (R + resistance) });
      if (resistance === Infinity) assert.equal(ohmScaleValue(fraction), Infinity);
      else assert.ok(Math.abs(ohmScaleValue(fraction) * stop.multiplier - resistance) < 1e-8);
      if (resistance === 20 * stop.multiplier) assert.equal(fraction, 0.5);
    }
    const untrimmed = meterBranch(stop, 0.1);
    assert.ok(meterFraction(stop, { I: E / untrimmed.R }) < 1);
  }
});
test('直流挡红进黑出偏转为正，反接偏转为负，OFF 断开', () => {
  const v = METER_STOPS.find((s) => s.mode === 'volt'),
    a = METER_STOPS.find((s) => s.mode === 'amp');
  assert.equal(meterFraction(v, { U: 1.25 }), 0.5);
  assert.equal(meterFraction(a, { I: -0.025 }), -0.5);
  assert.equal(meterBranch(METER_STOPS[0], 0).R, Infinity);
});
