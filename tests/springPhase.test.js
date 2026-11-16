import test from 'node:test';
import assert from 'node:assert/strict';
import { SpringPhase } from '../src/lessons/kit/springPhase.js';
const close = (a, b, t = 1e-9) => assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
const period = (m) =>
  (2 * Math.PI) /
  Math.sqrt(m.bodies[0].parameters.stiffness / m.bodies[0].parameters.mass - m.bodies[0].parameters.beta ** 2);

test('同时释放不改变位置且以后同相；移动空夹具不拖走自由球', () => {
  const m = new SpringPhase();
  assert.equal(m.comparison(), null);
  m.moveCarriage(0.04);
  m.advance(0.5);
  const before = m.observe();
  assert.ok(before.bodies.every((b) => b.held && b.q === 0.04 && b.v === 0));
  assert.equal(m.openBoth(), true);
  assert.ok(m.observe().bodies.every((b) => b.q === 0.04 && b.v === 0 && !b.held));
  assert.equal(m.releases[0].time, m.releases[1].time);
  for (let i = 0; i < 300; i++) {
    m.advance(0.017);
    close(m.bodies[0].q, m.bodies[1].q);
    close(m.bodies[0].v, m.bodies[1].v);
    close(m.comparison().difference, 0);
  }
  close(m.period(0).period, period(m), 1e-8);
  assert.deepEqual(m.period(0), m.period(1));
  const freeStates = m.bodies.map((b) => b.observe());
  assert.equal(m.moveCarriage(0.02), true);
  assert.equal(m.carriage, 0.02);
  assert.deepEqual(
    m.bodies.map((b) => b.observe()),
    freeStates,
  );
});

test('先释放A再释放B时A不中断；实际延迟产生相位差而非预设播放', () => {
  const m = new SpringPhase();
  m.moveCarriage(0.04);
  m.open(0);
  m.advance(0.199);
  const before = { q: m.bodies[0].q, v: m.bodies[0].v, time: m.time };
  assert.ok(Math.abs(before.q) < 0.001);
  assert.ok(before.v < 0);
  assert.equal(m.bodies[1].q, 0.04);
  assert.ok(m.bodies[1].held);
  m.open(1);
  close(m.bodies[0].q, before.q);
  close(m.bodies[0].v, before.v);
  close(m.time, before.time);
  const expected = ((2 * Math.PI) / period(m)) * 0.199;
  for (let i = 0; i < 250; i++) {
    m.advance(0.021);
    close(m.comparison().difference, expected, 1e-9);
  }
  close(m.period(0).period, m.period(1).period, 1e-8);
  close(m.comparison().delay, 0.199);
  assert.ok(m.comparison().envelopes[0] < m.comparison().envelopes[1]); // A先衰减，不能强行写成相等
});

test('半周期延迟反相，整周期延迟重新同相；不能把所有先后释放都判为步调不同', () => {
  for (const fraction of [0.5, 1, 2]) {
    const m = new SpringPhase();
    m.moveCarriage(0.04);
    m.open(0);
    m.advance(period(m) * fraction);
    m.open(1);
    const phase = m.comparison().difference;
    if (fraction === 0.5) close(Math.abs(phase), Math.PI, 0.009);
    else close(phase, 0, 0.009);
    m.advance(2);
    close(m.comparison().difference, phase, 1e-9);
  }
});

test('先释放B时相位领先关系反转；松手高度不同时不冒称同振幅', () => {
  const m = new SpringPhase();
  m.moveCarriage(0.04);
  m.open(1);
  m.advance(0.15);
  m.open(0);
  m.advance(0.3);
  assert.ok(m.comparison().difference < 0);
  close(m.comparison().delay, -0.15);
  m.grab(0);
  m.move(0, 0.02);
  assert.equal(m.drop(0), false); // 没到原夹具就松手，自由运动
  assert.ok(m.comparison().releaseDifference > 0.019);
});

test('重新抓回原夹具不跳到夹具中心、不重置另一球或时钟；未对准就自然松手', () => {
  const m = new SpringPhase();
  m.moveCarriage(0.04);
  m.openBoth();
  m.advance(0.4);
  const other = m.bodies[1].observe(),
    time = m.time;
  m.grab(0);
  m.move(0, 0.041);
  assert.equal(m.drop(0), true);
  assert.equal(m.bodies[0].q, 0.041);
  assert.equal(m.bodies[0].v, 0);
  assert.ok(m.bodies[0].held);
  assert.equal(m.time, time);
  assert.deepEqual(m.bodies[1].observe(), other);
  assert.equal(m.period(0), null);
  assert.equal(m.comparison(), null);
  m.advance(0.25);
  assert.equal(m.bodies[0].q, 0.041);
  assert.notEqual(m.bodies[1].q, other.q);
  m.grab(1);
  m.move(1, 0.03);
  assert.equal(m.drop(1), false);
  assert.ok(!m.bodies[1].held);
  m.grab(1);
  m.move(1, 0.04);
  assert.equal(m.drop(1), true);
  m.moveCarriage(0.03);
  close(m.bodies[0].q, 0.031);
  close(m.bodies[1].q, 0.03);
  m.openBoth();
  close(m.comparison().releaseDifference, 0.001);
});

test('固定支架没有隐藏耦合；两球及持球夹的独立能量账本闭合', () => {
  const m = new SpringPhase();
  m.moveCarriage(0.04);
  m.open(0);
  m.advance(1.6);
  close(m.bodies[1].q, 0.04);
  close(m.bodies[1].v, 0);
  close(m.bodies[1].heat, 0);
  m.open(1);
  m.advance(2);
  m.grab(0);
  m.move(0, 0.04);
  m.drop(0);
  m.advance(0.8);
  for (const b of m.bodies) close(b.handWork, b.observe().energy + b.heat);
});

test('不同显示帧率不改变相位、原运动事件或共同时间；重做清除状态', () => {
  const a = new SpringPhase(),
    b = new SpringPhase();
  for (const m of [a, b]) {
    m.moveCarriage(0.04);
    m.open(0);
    m.advance(0.2);
    m.open(1);
  }
  for (let i = 0; i < 360; i++) a.advance(1 / 60);
  for (let i = 0; i < 150; i++) b.advance(0.04);
  assert.deepEqual(a.observe(), b.observe());
  assert.deepEqual(a.comparison(), b.comparison());
  assert.deepEqual(a.period(0), b.period(0));
  assert.deepEqual(a.period(1), b.period(1));
  a.reset();
  assert.equal(a.time, 0);
  assert.deepEqual(a.clamped, [true, true]);
  assert.equal(a.carriage, 0);
  assert.equal(a.comparison(), null);
});

test('越界和重复释放不产生假记录或篡改状态', () => {
  const m = new SpringPhase();
  assert.throws(() => m.grab(2));
  assert.throws(() => m.moveCarriage(NaN));
  m.moveCarriage(1);
  assert.equal(m.carriage, 0.05);
  m.openBoth();
  const old = structuredClone(m.releases);
  m.advance(0.2);
  assert.equal(m.open(0), false);
  assert.equal(m.openBoth(), false);
  assert.deepEqual(m.releases, old);
  assert.throws(() => m.advance(-1));
  assert.equal(m.period(0), null);
});

test('一球释放后移动握柄只带动仍夹住的球；共同按钮不会重放已经自由的球', () => {
  const m = new SpringPhase();
  m.moveCarriage(0.04);
  m.open(0);
  m.advance(0.17);
  const a = m.bodies[0].observe(),
    oldRelease = { ...m.releases[0] };
  m.moveCarriage(0.025);
  assert.deepEqual(m.bodies[0].observe(), a);
  close(m.bodies[1].q, 0.025);
  assert.equal(m.openBoth(), true);
  assert.deepEqual(m.releases[0], oldRelease);
  close(m.releases[1].time, 0.17);
  assert.ok(m.comparison().releaseDifference > 0.014);
  close(m.bodies[1].handWork, m.bodies[1].observe().energy + m.bodies[1].heat);
});
