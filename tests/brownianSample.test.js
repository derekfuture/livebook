import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceParticle, diffusivity, meanSquareStep } from '../src/lessons/kit/brownianSample.js';
test('温度改变和水黏度变化共同影响扩散系数，同温时较大颗粒扩散较慢', () => {
  const cold = diffusivity(0.6, 20),
    warm = diffusivity(0.6, 40);
  assert.ok(cold > 0.35 && cold < 0.37);
  assert.ok(warm / cold > 1.63 && warm / cold < 1.65);
  assert.equal(diffusivity(1.2, 20), cold / 2);
});
test('二维等时记录的均方步长接近 4DΔt，两个方向没有系统性漂移', () => {
  let seed = 19;
  const random = () => (seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32;
  const p = { x: 0, y: 0, radius: 0.6 },
    points = [{ ...p }];
  for (let i = 0; i < 20000; i++) {
    advanceParticle(p, 20, 1, random);
    points.push({ ...p });
  }
  assert.ok(Math.abs(meanSquareStep(points) / (4 * diffusivity(0.6, 20)) - 1) < 0.035);
  assert.ok(Math.abs(p.x / 20000) < 0.02 && Math.abs(p.y / 20000) < 0.02);
});
