import test from 'node:test';
import assert from 'node:assert/strict';
import { polarize, transmitPolarizers, PolarizationBench, POLAR } from '../src/lessons/kit/polarization.js';
const near = (a, b, tolerance = 1e-11) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
const intensity = (s) => s[0] + s[2];

test('natural light loses half through one ideal film at every orientation', () => {
  for (let a = -7; a <= 7; a += 0.037) near(intensity(polarize([0.5, 0, 0.5], a)), 0.5);
});
test('two films obey relative-angle Malus law, including dark and half-turn recurrence', () => {
  for (const a of [-2.3, 0, 0.37, 4])
    for (let d = 0; d < 7; d += 0.031) {
      const first = polarize([0.5, 0, 0.5], a);
      near(intensity(polarize(first, a + d)), 0.5 * Math.cos(d) ** 2);
    }
  near(intensity(polarize(polarize([0.5, 0, 0.5], 0), Math.PI / 2)), 0);
});
test('films change polarization state; intermediate 45 degree film restores transmission', () => {
  const first = polarize([0.5, 0, 0.5], 0);
  near(intensity(polarize(polarize(first, Math.PI / 4), Math.PI / 2)), 0.125);
  near(intensity(polarize(first, Math.PI / 2)), 0);
});
test('passive finite-extinction films preserve positive states and account for absorption', () => {
  for (let a = 0; a < 3; a += 0.03) {
    const filters = [a, a + 0.7, a - 0.3].map((angle) => ({
      x: 0,
      y: 0,
      radius: 1,
      angle,
      parallel: 0.87,
      perpendicular: 0.02,
    }));
    const r = transmitPolarizers(0, 0, filters);
    near(r.intensity + r.losses.reduce((a, b) => a + b, 0), 1);
    assert.ok(r.losses.every((v) => v >= -1e-12));
    const [xx, xy, yy] = r.state;
    assert.ok(xx >= 0 && yy >= 0 && xx * yy - xy * xy >= -1e-12);
  }
  assert.throws(() => polarize([0.5, 0, 0.5], 0, 1.1), RangeError);
});
test('finite film, opaque frame and outside path are distinct', () => {
  const f = [{ x: 0, y: 0, radius: 0.04, outerRadius: 0.05, angle: 0.4 }];
  near(transmitPolarizers(0, 0, f).intensity, 0.5);
  near(transmitPolarizers(0.045, 0, f).intensity, 0);
  near(transmitPolarizers(0.06, 0, f).intensity, 1);
});
test('same beam, lateral insertion and removal retain film angles and spatial coverage', () => {
  const m = new PolarizationBench();
  m.setAngle('p', 0.3);
  m.setAngle('q', 0.3 + Math.PI / 2);
  near(m.mean(), 0.5);
  m.moveQ(0);
  near(m.mean(), 0);
  m.moveQ(0.06);
  const partial = m.mean();
  assert.ok(partial > 0 && partial < 0.5);
  // The near side is covered, the far side misses Q; a global opacity would fail.
  near(m.at(0.025, POLAR.height).intensity, 0);
  near(m.at(-0.025, POLAR.height).intensity, 0.5);
  m.moveQ(POLAR.park);
  near(m.mean(), 0.5);
  near(m.q, 0.3 + Math.PI / 2);
  near(m.at(0.1, POLAR.height).intensity, 0);
});
test('bench rotations are relative and reset restores original objects and positions', () => {
  const m = new PolarizationBench();
  m.moveQ(0);
  m.setAngle('p', 0.9);
  m.setAngle('q', 0.9 + Math.PI / 3);
  near(m.mean(), 0.125);
  m.setAngle('p', 0.9 + Math.PI / 3);
  near(m.mean(), 0.5);
  m.reset();
  near(m.p, 0);
  near(m.q, 0);
  near(m.qx, POLAR.park);
  near(m.mean(), 0.5);
});
