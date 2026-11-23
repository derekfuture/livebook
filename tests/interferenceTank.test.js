import test from 'node:test';
import assert from 'node:assert/strict';
import { InterferenceTank } from '../src/lessons/kit/interferenceTank.js';
import { DT } from '../src/lessons/kit/rippleTank.js';
test('同相双源满足线性叠加，不用预画的强弱条纹替代实际波场', () => {
  const a = new InterferenceTank([true, false]),
    b = new InterferenceTank([false, true]),
    both = new InterferenceTank();
  for (let i = 0; i < 400; i++) {
    a.step(true);
    b.step(true);
    both.step(true);
  }
  let max = 0,
    error = 0;
  for (let i = 0; i < both.surface.length; i++) {
    max = Math.max(max, Math.abs(both.surface[i]));
    error = Math.max(error, Math.abs(both.surface[i] - a.surface[i] - b.surface[i]));
  }
  assert.ok(max > 0.001);
  assert.ok(error / max < 0.0001, `${error / max}`);
});
test('中垂线上振动增强，邻近相消带在多个周期内持续较弱', () => {
  const both = new InterferenceTank(),
    single = new InterferenceTank([true, false]);
  const power = [0, 0, 0, 0];
  for (let i = 0; i < 650; i++) {
    both.step(true);
    single.step(true);
    if (i >= 450) {
      for (const [k, x] of [0, 0.025].entries()) {
        power[k] += both.sample(x, 0.065) ** 2;
        power[k + 2] += single.sample(x, 0.065) ** 2;
      }
    }
  }
  assert.ok(power[0] / power[2] > 3.8, JSON.stringify(power));
  assert.ok(power[1] / power[0] < 0.08, JSON.stringify(power));
});
test('抬起一根杆时波场不会瞬间消失，继续传播后才趋向单源', () => {
  const tank = new InterferenceTank();
  tank.advance(3, true);
  const before = tank.surface.slice();
  tank.active[1] = false;
  assert.deepEqual(tank.surface, before);
  tank.advance(DT, true);
  assert.ok(tank.surface.some((x) => Math.abs(x) > 0.001));
  const a = new InterferenceTank(),
    b = new InterferenceTank();
  for (let i = 0; i < 120; i++) a.advance(1 / 60, true);
  for (let i = 0; i < 30; i++) b.advance(1 / 15, true);
  for (let i = 0; i < a.surface.length; i++) assert.ok(Math.abs(a.surface[i] - b.surface[i]) < 1e-6);
});
