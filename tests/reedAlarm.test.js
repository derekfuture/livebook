import assert from 'node:assert/strict';
import test from 'node:test';
import { axialField, reedClosed, alarmState, stepAlarm } from '../src/lessons/kit/reedAlarm.js';

const h = { x: 1, y: 0, z: 0 },
  reed = { x: 0, y: 0.009, z: 0 };
const field = (z, axis = h) => axialField({ x: 0, y: 0, z }, axis, reed, h);
const leads = { power: true, coilWire: true, commonWire: true, ledWire: 'a', buzzerWire: 'b' };
function hold(start, inputs) {
  let s = start;
  for (let i = 0; i < 60; i++) s = stepAlarm(s, 1 / 120, { ...leads, ...inputs });
  return s;
}
test('磁体靠近或反转磁极都能吸合，远离或转到垂直方向可释放', () => {
  assert.ok(reedClosed(field(0), false));
  assert.ok(reedClosed(field(0, { x: -1, y: 0, z: 0 }), false));
  assert.equal(reedClosed(field(0.055), true), false);
  assert.equal(reedClosed(field(0, { x: 0, y: 0, z: 1 }), true), false);
  assert.equal(reedClosed(0.001, true), true);
  assert.equal(reedClosed(0.001, false), false);
});
test('门关时吸合接常开灯支路；打开释放接常闭蜂鸣器，切断电源后两者均关', () => {
  const shut = hold(alarmState(), { field: field(0) });
  assert.equal(shut.contact, 'a');
  assert.ok(shut.ledCurrent > 0.011);
  assert.equal(shut.buzzing, false);
  const open = hold(shut, { field: field(0.06) });
  assert.equal(open.contact, 'b');
  assert.equal(open.ledCurrent, 0);
  assert.equal(open.buzzing, true);
  const off = hold(open, { field: 0, power: false });
  assert.equal(off.buzzing, false);
  assert.equal(off.ledCurrent, 0);
});
test('实际接线决定输出，线圈断线和负载公共端断线的现象不同', () => {
  const closed = { field: field(0) };
  assert.equal(hold(alarmState(), { ...closed, ledWire: 'b', buzzerWire: 'a' }).buzzing, true);
  assert.equal(hold(alarmState(), { ...closed, coilWire: false }).buzzing, true);
  const commonOpen = hold(alarmState(), { ...closed, commonWire: false });
  assert.equal(commonOpen.contact, 'a');
  assert.equal(commonOpen.buzzing, false);
  assert.equal(commonOpen.ledCurrent, 0);
});
