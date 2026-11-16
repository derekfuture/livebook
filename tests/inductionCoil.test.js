import assert from 'node:assert/strict';
import test from 'node:test';
import { fluxLinkage, inductionStep } from '../src/lessons/kit/inductionCoil.js';

test('N 或 S 极朝下，插入和抽出产生相反方向的电流；俯视逆时针为正', () => {
  for (const north of [true, false]) {
    const high = fluxLinkage(0.11, north),
      low = fluxLinkage(0.014, north);
    const down = inductionStep(high, low, 0.28, true);
    const up = inductionStep(low, high, 0.28, true);
    assert.equal(Math.sign(down.current), north ? 1 : -1);
    assert.equal(up.current, -down.current);
    assert.ok(Math.abs(inductionStep(high, low, 0.14, true).current / down.current - 2) < 1e-7);
    assert.ok(Math.abs(inductionStep(low, low, 0.08, true, down.current).current) < 1e-12);
    const open = inductionStep(high, low, 0.28, false);
    assert.equal(open.emf, down.emf);
    assert.equal(open.current, 0);
  }
});
test('停在不同深度时电流归零，闭合回路往返一周总感应电动势的时间积分为零', () => {
  const positions = [0.12, 0.09, 0.042, 0.022, 0.022, 0.045, 0.12];
  let area = 0;
  for (let j = 1; j < positions.length; j++) {
    const a = fluxLinkage(positions[j - 1], true),
      b = fluxLinkage(positions[j], true);
    const dt = 0.01 + j * 0.015;
    const { emf } = inductionStep(a, b, dt, true);
    area += emf * dt;
  }
  assert.ok(Math.abs(area) < 1e-15);
});
