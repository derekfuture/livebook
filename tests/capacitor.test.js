import test from 'node:test';
import assert from 'node:assert/strict';
import { CAPACITANCE, SERIES_OHMS, SOURCE_VOLTS, observeCapacitor } from '../src/lessons/kit/capacitor.js';

test('充电一时间常数与分帧累积的电压、电荷相符', () => {
  const tau = SERIES_OHMS * CAPACITANCE;
  const one = observeCapacitor(0, 1, tau);
  assert.ok(Math.abs(one.voltage - SOURCE_VOLTS * (1 - Math.exp(-1))) < 1e-12);
  let v = 0,
    q = 0;
  for (let i = 0; i < 60; i++) {
    const sample = observeCapacitor(v, 1, tau / 60);
    v = sample.voltage;
    q += sample.transferred;
  }
  assert.ok(Math.abs(v - one.voltage) < 1e-12);
  assert.ok(Math.abs(q - one.charge) < 1e-12);
});
test('中途断开保持电压，转入放电时电压连续、电流反向', () => {
  const charged = observeCapacitor(0, 1, 0.7);
  const open = observeCapacitor(charged.voltage, 0, 50);
  assert.equal(open.voltage, charged.voltage);
  assert.equal(open.current, 0);
  const start = observeCapacitor(open.voltage, 2, 0);
  assert.equal(start.voltage, open.voltage);
  assert.equal(start.current, -open.voltage / SERIES_OHMS);
  const end = observeCapacitor(start.voltage, 2, 100);
  assert.ok(Math.abs(end.transferred + charged.charge) < 1e-12);
});
