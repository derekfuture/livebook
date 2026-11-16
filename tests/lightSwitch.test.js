import assert from 'node:assert/strict';
import test from 'node:test';
import {
  sensorLux,
  photoResistance,
  lightSwitchReadings,
  DAYLIGHT_LUX,
  STRAY_LUX,
} from '../src/lessons/kit/lightSwitch.js';
const read = (resistance, lux, options = {}) =>
  lightSwitchReadings({ power: true, resistance, lux, r1Rail: '+', photoRail: '−', collectorWire: true, ...options });
test('同一遮光片从移开到全遮连续降低照度；光敏电阻在强光时小于 3 kΩ，在近暗处超过 1 MΩ', () => {
  assert.equal(sensorLux(0.1, 0), DAYLIGHT_LUX);
  assert.equal(sensorLux(0, 0), STRAY_LUX);
  assert.ok(sensorLux(0.026, 0) > STRAY_LUX && sensorLux(0.026, 0) < DAYLIGHT_LUX);
  assert.equal(sensorLux(0.026, 0.1), DAYLIGHT_LUX);
  assert.ok(photoResistance(DAYLIGHT_LUX) < 3000);
  assert.ok(photoResistance(0.01) > 1e6);
});
test('强光下调至熄灭，遮光能亮；增大上臂 R1 后需要遮去更多光', () => {
  assert.ok(read(8000, DAYLIGHT_LUX).collector > 0);
  assert.equal(read(18000, DAYLIGHT_LUX).collector, 0);
  const middle = sensorLux(0.026, 0);
  assert.ok(read(18000, middle).collector > 0);
  assert.equal(read(45000, middle).collector, 0);
  assert.ok(read(45000, STRAY_LUX).collector > 0.008);
});
test('上下臂接反会使响应反向；断开的集电极和断电均不能点亮 LED', () => {
  const swapped = { r1Rail: '−', photoRail: '+' };
  // 调到低阻时，使较暗条件下基极电流被旁路，强光下导通。
  assert.equal(read(1200, STRAY_LUX, swapped).collector, 0);
  assert.ok(read(1200, DAYLIGHT_LUX, swapped).collector > 0.01);
  assert.equal(read(18000, STRAY_LUX, { collectorWire: false }).collector, 0);
  assert.equal(read(18000, STRAY_LUX, { power: false }).collector, 0);
});
