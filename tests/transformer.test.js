import test from 'node:test';
import assert from 'node:assert/strict';
import { transformerReadings, SUPPLY_RMS } from '../src/lessons/kit/transformer.js';

const base = { primary: 200, secondary: 100, coreClosed: true, energized: true, meterSide: 'secondary', range: 10 };
const read = (overrides = {}) => transformerReadings({ ...base, ...overrides });

test('闭合铁芯低压交流，固定原匝数时副电压近似正比于副匝数，固定副匝数时反比于原匝数', () => {
  const u = read();
  assert.ok(u.primaryV < SUPPLY_RMS && u.primaryV > 2.98);
  assert.ok(u.secondaryV > 1.46 && u.secondaryV < 1.49);
  assert.ok(Math.abs(read({ secondary: 200 }).secondaryV / u.secondaryV - 2) < 0.002);
  assert.ok(Math.abs(read({ primary: 400 }).secondaryV / u.secondaryV - 0.5) < 0.003);
  assert.ok(read({ primary: 100, secondary: 400 }).secondaryV < 12);
});
test('断电和直流稳态副线圈均无电压；开铁芯漏磁增加并提高励磁电流', () => {
  assert.equal(read({ energized: false }).primaryV, 0);
  assert.ok(read({ secondary: 0 }).primaryV > 2.98);
  assert.equal(read({ secondary: 0 }).secondaryV, 0);
  assert.equal(read({ frequency: 0 }).secondaryV, 0);
  assert.ok(read({ coreClosed: false }).sourceCurrent > 10 * read().sourceCurrent);
  assert.ok(read({ coreClosed: false }).secondaryV < read().secondaryV);
});
test('电表接到副边时成为副线圈实际负载', () => {
  const open = read({ meterSide: null });
  assert.ok(read().secondaryV < open.secondaryV);
  assert.ok(read({ range: 2.5 }).secondaryV < read({ range: 50 }).secondaryV);
});

test('测量原边实际抽头，整段显示电源端电压，半段与未通电的延伸段也能读数', () => {
  const full = read({ meterSide: 'primary' });
  assert.ok(Math.abs(full.primaryV - full.meterV) < 1e-9);
  const half = read({ meterSide: 'primary', meterTurns: 100, overlapTurns: 100 });
  assert.ok(Math.abs(half.meterV - full.primaryV / 2) < 0.002);
  const extension = read({ meterSide: 'primary', meterTurns: 200, overlapTurns: 0 });
  assert.ok(extension.meterV > 2.9 && extension.meterV < full.primaryV);
});
