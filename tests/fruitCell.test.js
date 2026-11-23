import test from 'node:test';
import assert from 'node:assert/strict';
import { fruitResistance, FRUIT_EMF, polarize, fitFruit } from '../src/lessons/kit/fruitCell.js';

test('两片都要接触果汁；同深度时片距较小内阻较小，加深插入也降低内阻', () => {
  assert.equal(fruitResistance(10, [0, 18]), Infinity);
  assert.equal(fruitResistance(10, [18, 18]), 1200);
  assert.ok(fruitResistance(7, [18, 18]) < 1200);
  assert.ok(fruitResistance(10, [23, 18]) < 1200);
});

test('由外电阻和路端电压反推电源参数，久通电后同一负载下端电压下降，开路恢复', () => {
  const r = fruitResistance(10, [18, 18]),
    samples = [600, 1200, 2400, 5000].map((ohms) => ({ ohms, volts: (FRUIT_EMF * ohms) / (r + ohms) }));
  const fit = fitFruit(samples);
  assert.ok(Math.abs(fit.emf - FRUIT_EMF) < 1e-10 && Math.abs(fit.kOhm - r / 1000) < 1e-10);
  const p = polarize(0, 0.0003, 60);
  assert.ok(fruitResistance(10, [18, 18], p) > r);
  assert.ok(polarize(p, 0, 60) < p);
  assert.equal(fitFruit([samples[0], samples[0]]), null);
});
