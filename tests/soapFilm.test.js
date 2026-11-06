import test from 'node:test';
import assert from 'node:assert/strict';
import { SoapFilm } from '../src/lessons/kit/soapFilm.js';
const near = (a, b, t = 1e-9) => assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
const lengths = (m) =>
  m.points
    .slice(0, m.segments)
    .map((p, i) =>
      Math.hypot(p[0] - m.points[(i + 1) % m.points.length][0], p[1] - m.points[(i + 1) % m.points.length][1]),
    );
test('equal films on both sides leave the original slack thread unchanged', () => {
  for (const loop of [false, true]) {
    const m = new SoapFilm({ loop }),
      p = structuredClone(m.points);
    m.advance(1);
    assert.deepEqual(m.points, p);
    near(m.heat, 0);
  }
});
test('remaining film pulls the spanning thread toward that side, without stretching or moving pins', () => {
  for (const region of ['a', 'b']) {
    const m = new SoapFilm(),
      p = structuredClone(m.points),
      initial = m.rest.slice();
    m.puncture(region);
    m.advance(4);
    assert.deepEqual(m.points[0], p[0]);
    assert.deepEqual(m.points.at(-1), p.at(-1));
    const sign = region === 'a' ? 1 : -1;
    assert.ok(m.points[Math.floor(m.segments / 2)][0] * sign > 0.02);
    lengths(m).forEach((l, i) => near(l, initial[i], 1e-8));
  }
});
test('inner puncture expands the same closed loop toward a circle of its original perimeter', () => {
  const m = new SoapFilm({ loop: true }),
    area = m.areas()[0],
    l = m.length(),
    pin = m.points[0].slice();
  m.puncture('a');
  m.advance(6);
  assert.ok(m.areas()[0] > area * 1.15);
  assert.ok((4 * Math.PI * m.areas()[0]) / l ** 2 > 0.99);
  near(m.length(), l, 1e-8);
  assert.deepEqual(m.points[0], pin);
});
test('wrong outer puncture contracts the loop without self crossing or negative film area', () => {
  const m = new SoapFilm({ loop: true }),
    a = m.areas()[0],
    l = m.length();
  m.puncture('b');
  m.advance(3);
  assert.ok(m.areas()[0] > 0 && m.areas()[0] < a / 2);
  near(m.length(), l, 1e-8);
  const orient = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const p = m.points,
    n = p.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const a = p[i],
        b = p[(i + 1) % n],
        c = p[j],
        d = p[(j + 1) % n];
      assert.ok(!(orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0));
    }
});
test('surface and contact forces are negative energy gradients; each film has two faces', () => {
  for (const loop of [false, true]) {
    const m = new SoapFilm({ loop });
    m.puncture('b');
    if (loop) m.advance(0.5);
    const f = m.forces();
    for (let i = 1; i < m.points.length - 1; i++)
      for (let j = 0; j < 2; j++) {
        const x = m.points[i][j],
          h = 1e-8;
        m.points[i][j] = x + h;
        const ep = m.energy();
        m.points[i][j] = x - h;
        const em = m.energy();
        m.points[i][j] = x;
        near(f[i][j], -(ep - em) / (2 * h), 1e-8);
      }
  }
  const m = new SoapFilm();
  near(m.energy(), 2 * m.gamma * Math.PI * m.radius ** 2);
});
test('independent viscous dissipation balances energy, including the wrong-side contact path', () => {
  for (const loop of [false, true])
    for (const region of ['a', 'b']) {
      const m = new SoapFilm({ loop }),
        before = m.energy();
      m.puncture(region);
      const start = m.energy();
      m.advance(2);
      near(before - m.removedEnergy, start);
      near(start - m.energy(), m.heat, 1e-10);
      assert.ok(m.heat > 0);
    }
});
test('puncture selection distinguishes film, thread, frame and already missing regions', () => {
  const m = new SoapFilm();
  assert.equal(m.regionAt(-0.04, 0), 'a');
  assert.equal(m.regionAt(0.04, 0), 'b');
  assert.equal(m.regionAt(0.08, 0), null);
  const p = m.points[24];
  assert.equal(m.regionAt(...p), 'thread');
  assert.equal(m.puncture('a'), true);
  assert.equal(m.puncture('a'), false);
  const loop = new SoapFilm({ loop: true });
  assert.equal(loop.regionAt(0, 0), 'a');
  assert.equal(loop.regionAt(0.04, 0), 'b');
});
test('frame chunking and reset preserve the same physical evolution', () => {
  const a = new SoapFilm(),
    b = new SoapFilm();
  a.puncture('a');
  b.puncture('a');
  for (let i = 0; i < 60; i++) a.advance(1 / 60);
  for (let i = 0; i < 25; i++) b.advance(0.04);
  assert.deepEqual(a.points, b.points);
  near(a.heat, b.heat);
  a.reset();
  assert.deepEqual(a.points, new SoapFilm().points);
  assert.equal(a.a, true);
  assert.equal(a.b, true);
  near(a.heat, 0);
});
