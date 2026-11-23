import test from 'node:test';
import assert from 'node:assert/strict';
import { AmpereFactors, AMPERE_TAPS } from '../src/lessons/kit/ampereFactors.js';
const close = (a, b, t = 1e-7) => assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
test('四引线点给出中段和三段长度；换端点不改变磁场、质量和原运动状态', () => {
  const m = new AmpereFactors();
  close(m.signedLength, 0.04);
  m.setClosed(true);
  m.advance(0.2);
  const state = [m.angle, m.speed, m.p.field, m.p.mass];
  m.connect(0, 3);
  close(m.signedLength, 0.12);
  assert.deepEqual([m.angle, m.speed, m.p.field, m.p.mass], state);
  m.connect(3, 0);
  close(m.signedLength, -0.12);
  m.connect(null, 0);
  assert.equal(m.electrical().current, 0);
  assert.equal(AMPERE_TAPS.length, 4);
  assert.throws(() => m.connect(0, 4));
});
test('同长度改变电流时F正比I，同电流换长度时F正比l；偏角本身不与F严格成正比', () => {
  const m = new AmpereFactors();
  m.setClosed(true);
  const first = m.electrical();
  m.setPosition(0.1);
  const second = m.electrical();
  close(second.force / first.force, second.current / first.current);
  m.connect(0, 3);
  const target = first.current;
  m.setPosition((m.p.emf / target - (m.resistance - m.p.rheostatOhms * m.position)) / m.p.rheostatOhms);
  close(m.electrical().current, target);
  close(m.electrical().force / first.force, 3);
  m.advance(5);
  close(Math.tan(m.angle), m.electrical().force / (m.p.mass * m.p.gravity), 1e-7);
  assert.notEqual(m.angle, Math.tan(m.angle));
  assert.ok(m.settled);
});
test('电路反接只反转力和偏转，未接或同点接线没有棒受力', () => {
  const a = new AmpereFactors(),
    b = new AmpereFactors();
  a.connect(0, 3);
  b.connect(3, 0);
  a.setClosed(true);
  b.setClosed(true);
  a.advance(3);
  b.advance(3);
  close(a.angle, -b.angle);
  close(a.electrical().force, -b.electrical().force);
  b.connect(2, 2);
  assert.equal(b.electrical().force, 0);
  assert.ok(b.electrical().current > 0);
  b.connect(null, 2);
  assert.equal(b.electrical().current, 0);
});
test('断电保持原偏角和速度，随后衰减回中；改变电阻不会重置悬棒', () => {
  const m = new AmpereFactors();
  m.setClosed(true);
  m.advance(4);
  const before = [m.angle, m.speed];
  m.setClosed(false);
  assert.deepEqual([m.angle, m.speed], before);
  m.advance(0.02);
  assert.ok(m.angle < before[0] && m.speed < 0);
  const moving = [m.angle, m.speed];
  m.setPosition(1);
  assert.deepEqual([m.angle, m.speed], moving);
  m.advance(4);
  close(m.angle, 0, 1e-7);
  assert.ok(m.settled);
});
test('包含动生电动势的电源功、焦耳热、阻尼热与机械能独立平衡', () => {
  const m = new AmpereFactors();
  m.setClosed(true);
  m.connect(0, 3);
  m.setPosition(0);
  m.advance(0.15);
  assert.ok(m.electrical().emf > 0);
  assert.ok(m.electrical().current < m.p.emf / m.resistance);
  m.advance(2);
  m.setClosed(false);
  m.advance(2);
  close(m.sourceWork - m.heat - m.dampingHeat, m.energy(), 2e-9);
});
test('24/60/120帧给出相同运动，最大正反换向均保留磁极间的几何间隙', () => {
  function run(fps) {
    const m = new AmpereFactors();
    m.setClosed(true);
    m.connect(0, 3);
    m.setPosition(0);
    let max = 0;
    for (let i = 0; i < fps * 6; i++) {
      if (i === fps * 3) m.connect(3, 0);
      m.advance(1 / fps);
      max = Math.max(max, Math.abs(m.angle));
    }
    return { m, max };
  }
  const a = run(24),
    b = run(60),
    c = run(120);
  close(a.m.angle, b.m.angle, 1e-7);
  close(a.m.angle, c.m.angle, 1e-7);
  for (const { m, max } of [a, b, c]) {
    const dz = m.p.suspension * Math.sin(max),
      rise = m.p.suspension * (1 - Math.cos(max));
    assert.ok(dz + 0.003 < 0.085);
    assert.ok(rise + 0.003 < 0.036);
    assert.ok(m.p.emf / m.resistance < 3);
  }
});
test('非法输入被拒绝，重做才复位状态与记录', () => {
  const m = new AmpereFactors();
  assert.throws(() => m.advance(-1));
  assert.throws(() => m.setPosition(NaN));
  assert.throws(() => m.setClosed(1));
  assert.throws(() => new AmpereFactors({ mass: 0 }));
  m.setClosed(true);
  m.advance(1);
  m.reset();
  assert.equal(m.energy(), 0);
  assert.equal(m.sourceWork, 0);
  assert.deepEqual(m.connections, [1, 2]);
  assert.equal(m.closed, false);
});
