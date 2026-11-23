import test from 'node:test';
import assert from 'node:assert/strict';
import { LCOscillation } from '../src/lessons/kit/lcOscillation.js';
const close = (a, b, eps = 1e-7) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
function charged(options) {
  const m = new LCOscillation(options);
  m.setSwitch('charge');
  m.advance(2);
  return m;
}
function positivePeaks(m, duration = 0.4) {
  const peaks = [];
  let previous = m.voltage,
    direction = -1;
  const start = m.time;
  for (let i = 0; i < duration / m.step; i++) {
    m.advance(m.step);
    const next = Math.sign(m.voltage - previous);
    if (direction > 0 && next < 0) peaks.push([m.time - start, previous]);
    direction = next;
    previous = m.voltage;
  }
  return peaks;
}

test('充电符合带传感器负载的 RC 过程，未充电直接拨入线圈不会自发振荡', () => {
  const m = new LCOscillation();
  m.setSwitch('oscillate');
  m.advance(0.2);
  assert.equal(m.voltage, 0);
  assert.equal(m.current, 0);
  assert.equal(m.energy(), 0);
  m.setSwitch('charge');
  m.advance(0.5);
  const g = 1 / m.chargeR + 1 / m.sensorR + 1 / m.openR,
    steady = m.source / m.chargeR / g;
  close(m.voltage, steady * (1 - Math.exp((-g * 0.5) / m.C)), 1e-6);
  assert.ok(Math.abs(m.current) < 1e-7);
  close(m.sourceWork, m.energy() + m.dissipated, 1e-9);
});

test('拨入线圈不重置电容电压或电感电流，随后电压过零并反向', () => {
  const m = charged(),
    before = m.observe();
  m.setSwitch('oscillate');
  assert.deepEqual(m.observe(), before);
  m.advance(0.006);
  assert.ok(m.current > 0.04);
  assert.ok(m.voltage > 0 && m.voltage < before.voltage);
  m.advance(0.01);
  assert.ok(m.voltage < -4);
  assert.ok(m.energy() < before.energy);
});

test('实测峰间周期与 RLC 理论相符，包络按损耗衰减', () => {
  const m = charged();
  m.setSwitch('oscillate');
  const peaks = positivePeaks(m);
  assert.ok(peaks.length >= 10);
  const alpha = ((m.coilR + m.contactR) / m.L + (1 / m.sensorR + 1 / m.strayR) / m.C) / 2;
  const period = (2 * Math.PI) / Math.sqrt(1 / (m.L * m.C) - alpha ** 2);
  close(peaks[2][0] - peaks[0][0], 2 * period, 0.0002);
  const measured = Math.log(peaks[0][1] / peaks[2][1]) / (peaks[2][0] - peaks[0][0]);
  close(measured, alpha, 0.04);
  assert.ok(peaks.every((p, i) => i === 0 || p[1] < peaks[i - 1][1]));
});

test('电感或电容增至四倍时，振荡周期约为原来两倍', () => {
  const periods = [{}, { L: 2 }, { C: 188e-6 }].map((options) => {
    const m = charged(options);
    m.setSwitch('oscillate');
    const p = positivePeaks(m, 0.3);
    return (p[3][0] - p[0][0]) / 3;
  });
  close(periods[1] / periods[0], 2, 0.012);
  close(periods[2] / periods[0], 2, 0.012);
});

test('电源做功等于两电容与电感储能加各电阻独立积分的损耗', () => {
  const m = charged();
  m.setSwitch('oscillate');
  m.advance(0.2);
  assert.ok(m.coilHeat > 0 && m.chargeHeat > 0 && m.contactHeat > 0 && m.leakHeat > 0);
  close(m.sourceWork, m.energy() + m.dissipated, 3e-9);
  m.setSwitch('charge');
  m.advance(0.3);
  close(m.sourceWork, m.energy() + m.dissipated, 3e-9);
});

test('带电流断开时等效小电容承接暂态，主电容保留电压而非全场清空', () => {
  const m = charged({ timeStep: 0.00001 });
  m.setSwitch('oscillate');
  m.advance(0.006);
  const before = m.observe();
  assert.ok(before.current > 0.04);
  m.setSwitch('open');
  assert.deepEqual(m.observe(), before);
  let peak = 0;
  for (let i = 0; i < 30; i++) {
    m.advance(0.00001);
    peak = Math.max(peak, Math.abs(m.coilVoltage));
  }
  assert.ok(peak > 100, '断路电感的能量必须有可检查的承接状态');
  close(m.voltage, before.voltage, 0.001);
  m.advance(0.03);
  assert.ok(Math.abs(m.current) < 1e-6);
  assert.ok(m.energy() > 0);
  close(m.sourceWork, m.energy() + m.dissipated, 3e-9);
});

test('渲染帧长不改变轨迹，重新充电和重做的状态彼此区分', () => {
  const a = charged(),
    b = charged();
  for (const m of [a, b]) m.setSwitch('oscillate');
  for (let i = 0; i < 12; i++) a.advance(1 / 60);
  for (let i = 0; i < 20; i++) b.advance(0.01);
  close(a.voltage, b.voltage, 1e-12);
  close(a.current, b.current, 1e-12);
  close(a.coilHeat, b.coilHeat, 1e-12);
  const before = a.observe();
  a.setSwitch('charge');
  assert.deepEqual(a.observe(), before);
  a.advance(0.3);
  assert.ok(a.voltage > 1);
  a.reset();
  assert.equal(a.contact, 'open');
  assert.equal(a.energy(), 0);
  assert.equal(a.sourceWork, 0);
  assert.equal(a.dissipated, 0);
  assert.equal(a.time, 0);
});
