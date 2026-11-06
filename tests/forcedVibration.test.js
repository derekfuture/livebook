import test from 'node:test';
import assert from 'node:assert/strict';
import { ForcedVibration } from '../src/lessons/kit/forcedVibration.js';
const close = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
test('两种固有频率不同，稳定后实际过零周期都与驱动频率一致', () => {
  for (const f of [0.8, 1.3, 2.4]) {
    const m = new ForcedVibration({ frequency: f });
    m.switch(true);
    m.advance(25);
    assert.ok(Math.abs(m.observe().bodies[0].naturalFrequency - m.observe().bodies[1].naturalFrequency) > 0.4);
    for (let i = 0; i < 3; i++) {
      close(m.reading(i).frequency, f, 1e-5);
      assert.ok(m.reading(i).spread < 1e-4);
    }
  }
});
test('稳态振幅符合移动支点驱动的解析响应，而不是给两钩码播放相同位移', () => {
  const m = new ForcedVibration({ frequency: 1.4 });
  m.switch(true);
  m.advance(28);
  const peaks = [0, 0];
  for (let i = 0; i < 3000; i++) {
    m.advance(0.001);
    m.observe().bodies.forEach((b, j) => (peaks[j] = Math.max(peaks[j], Math.abs(b.q))));
  }
  m.systems.forEach((p, i) => {
    const w = 2 * Math.PI * m.frequency,
      w0sq = p.stiffness / p.mass;
    const expected = (m.amplitude * w0sq) / Math.hypot(w0sq - w * w, 2 * p.beta * w);
    close(peaks[i], expected, 2e-7);
  });
  assert.ok(Math.abs(peaks[0] - peaks[1]) > 0.001);
});
test('改变转速和断电不跳变相位、速度或钩码位置，断电后电机滑行再停', () => {
  const m = new ForcedVibration();
  m.switch(true);
  m.advance(8);
  const before = [...m.state];
  m.setFrequency(2.2);
  assert.deepEqual(m.state, before);
  m.advance(0.2);
  assert.ok(m.observe().frequency > 1 && m.observe().frequency < 2.2);
  const coast = [...m.state];
  m.switch(false);
  assert.deepEqual(m.state, coast);
  m.advance(0.1);
  assert.ok(m.state[0] > coast[0]);
  assert.ok(m.state[1] > 0 && m.state[1] < coast[1]);
  m.advance(25);
  assert.ok(m.observe().frequency < 1e-10);
  for (const b of m.observe().bodies) {
    close(b.q, m.observe().base, 1e-8);
    close(b.v, 0, 1e-8);
  }
});
test('启动、变速、断电全程：驱动对钩码系统的功等于储能变化加阻尼热', () => {
  const m = new ForcedVibration();
  m.switch(true);
  m.advance(4);
  m.setFrequency(1.8);
  m.advance(7);
  m.switch(false);
  m.advance(5);
  close(m.work, m.observe().energy + m.heat, 1e-9);
  assert.ok(m.heat > 0);
});
test('没有驱动时自由振动衰减，重做清除记录，调速只清观测不删除物理状态', () => {
  const m = new ForcedVibration();
  m.state[2] = 0.02;
  const initial = m.observe().energy;
  m.advance(8);
  assert.ok(m.observe().energy < initial * 1e-4);
  close(initial, m.observe().energy + m.heat, 1e-10);
  assert.ok(m.reading(1));
  m.setFrequency(1.2);
  assert.equal(m.reading(1), null);
  m.reset();
  assert.equal(m.time, 0);
  assert.equal(m.heat, 0);
  assert.equal(m.work, 0);
  assert.equal(m.reading(1), null);
});
test('固定物理步长与帧长无关，周期由运动事件而非设置值生成', () => {
  const a = new ForcedVibration(),
    b = new ForcedVibration();
  a.switch(true);
  b.switch(true);
  for (let i = 0; i < 600; i++) a.advance(1 / 60);
  for (let i = 0; i < 250; i++) b.advance(0.04);
  assert.deepEqual(a.state, b.state);
  assert.deepEqual(a.crossings, b.crossings);
  assert.ok(a.reading(0).start > 0);
  assert.equal(a.reading(0).intervals, 3);
});

test('过渡结束按位移与速度残差判断，不能把电机已到设定转速当钩码已经稳定', () => {
  const m = new ForcedVibration();
  m.switch(true);
  m.advance(0.2);
  assert.equal(m.settled(), false);
  m.advance(25);
  assert.equal(m.settled(), true);
  m.setFrequency(2);
  assert.equal(m.settled(), false);
  m.advance(25);
  assert.equal(m.settled(), true);
  m.switch(false);
  assert.equal(m.settled(), false);
});
