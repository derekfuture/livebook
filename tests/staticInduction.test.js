import test from 'node:test';
import assert from 'node:assert/strict';
import { StaticInduction } from '../src/lessons/kit/staticInduction.js';
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const sum = (a) => a.reduce((s, v) => s + v, 0);

test('正带电体靠近时近端负、远端正，总电荷仍为零且全导体等势', () => {
  const m = new StaticInduction();
  m.setSource(-0.15, 0);
  assert.ok(m.net[0] < 0 && m.net[1] > 0);
  near(sum(m.net), 0);
  const s = m.state;
  s.positions.forEach((x, i) => {
    const potential =
      s.external[i] +
      sum(s.charges.map((q, j) => q * ((i === j ? 1 / 0.012 : 0) + 1 / Math.hypot(x - s.positions[j], 0.012))));
    near(potential, s.potentials[0]);
  });
});
test('先分开再移走带电体保留异号电荷，再接触恢复中性', () => {
  const m = new StaticInduction();
  m.setSource(-0.15, 0);
  const original = [...m.net];
  m.separate();
  m.move(1, 0.18);
  m.setSource(-1e6, 0);
  near(m.net[0], original[0]);
  near(m.net[1], original[1]);
  assert.equal(m.join(), false);
  m.move(1, 0.055);
  assert.equal(m.join(), true);
  near(m.net[0], 0, 1e-10);
  near(m.net[1], 0, 1e-10);
});
test('先移走带电体再分开不留下净电荷；分开的中性导体仍可极化', () => {
  const m = new StaticInduction();
  m.setSource(-0.15, 0);
  m.setSource(-1e6, 0);
  m.separate();
  m.move(1, 0.18);
  near(m.net[0], 0, 1e-10);
  near(m.net[1], 0, 1e-10);
  m.setSource(-0.15, 0);
  near(sum(m.state.charges.slice(0, m.nodes)), 0, 1e-10);
  assert.ok(Math.max(...m.state.charges.slice(0, m.nodes)) > 0);
  assert.ok(Math.min(...m.state.charges.slice(0, m.nodes)) < 0);
});
test('带电体换号只改变电荷符号，不改变分离电荷绝对值', () => {
  const a = new StaticInduction(),
    b = new StaticInduction();
  b.sourceCharge = -1;
  a.setSource(-0.15, 0);
  b.setSource(-0.15, 0);
  a.state.charges.forEach((q, i) => near(q, -b.state.charges[i]));
});
test('反复移动分离导体不改变净电荷，接触且带电体仍在时不会误判中性', () => {
  const m = new StaticInduction();
  m.setSource(-0.15, 0);
  m.separate();
  const q = [...m.net];
  for (let i = 0; i < 100; i++) {
    m.move(1, 0.055 + 0.15 * Math.abs(Math.sin(i)));
    m.setSource(-0.15, 0.01 * Math.sin(i));
  }
  near(m.net[0], q[0]);
  near(m.net[1], q[1]);
  m.move(1, 0.055);
  m.join();
  assert.ok(m.net[0] < 0 && m.net[1] > 0);
  assert.throws(() => m.move(0, 0), /Separate/);
});
