import assert from 'node:assert/strict';
import test from 'node:test';
import { openAir, movePiston, ROOM_T, ATM, AREA } from '../src/lessons/kit/gasColumn.js';
const initial = openAir(0.03);
test('开口时压强跟大气相同，封闭时气体物质的量保持，充分回温后 pV 为常量', () => {
  const open = movePiston(initial, 0.02, 0.5, false);
  assert.equal(open.pressure, ATM);
  assert.ok(open.moles < initial.moles);
  const fast = movePiston(initial, 0.02, 0.1, true);
  assert.ok(fast.temperature > ROOM_T + 40);
  assert.equal(fast.moles, initial.moles);
  const cooled = movePiston(fast, 0.02, 50, true);
  assert.ok(Math.abs(cooled.temperature - ROOM_T) < 1e-7);
  assert.ok(Math.abs(cooled.pressure * 0.02 * AREA - initial.pressure * 0.03 * AREA) < 1e-9);
});
test('同样压缩量，慢推温升小；快速膨胀会冷却，固定位置时压力回升', () => {
  const fast = movePiston(initial, 0.02, 0.1, true),
    slow = movePiston(initial, 0.02, 30, true);
  assert.ok(fast.pressure > slow.pressure);
  assert.ok(slow.temperature < ROOM_T + 4);
  const expanded = movePiston(initial, 0.04, 0.1, true);
  assert.ok(expanded.temperature < ROOM_T);
  assert.ok(movePiston(expanded, 0.04, 5, true).pressure > expanded.pressure);
});
test('相同的对数体积变化轨迹在不同帧率下保持一致；瞬时运动趋于绝热极限', () => {
  const fast = movePiston(initial, 0.02, 0, true);
  assert.ok(Math.abs(fast.temperature / ROOM_T - (0.03 / 0.02) ** 0.4) < 1e-12);
  for (const fps of [24, 60, 120]) {
    let s = initial;
    for (let i = 1; i <= fps; i++) s = movePiston(s, 0.03 * (0.02 / 0.03) ** (i / fps), 1 / fps, true);
    assert.ok(Math.abs(s.temperature - movePiston(initial, 0.02, 1, true).temperature) < 1e-9);
  }
});
