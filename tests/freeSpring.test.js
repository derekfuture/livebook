import test from 'node:test';
import assert from 'node:assert/strict';
import { FreeSpring, springTimingMark } from '../src/lessons/kit/freeSpring.js';
const close = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
const release = (model, q) => {
  model.grab();
  model.move(q);
  model.release();
};

test('竖直弹簧平衡时弹力抵消重力；位移相对平衡位置而非原长', () => {
  const m = new FreeSpring();
  const p = m.parameters;
  close(m.observe().extension, (p.mass * p.gravity) / p.stiffness);
  close(m.observe().springForce, m.observe().gravityForce);
  m.advance(10);
  close(m.q, 0);
  for (const q of [-0.05, 0.05]) {
    release(m, q);
    const o = m.observe();
    close((o.gravityForce - o.springForce + o.dampingForce) / p.mass, o.freeAcceleration);
    assert.ok(o.length > p.naturalLength);
    assert.equal(Math.sign(o.freeAcceleration), -Math.sign(q));
  }
});

test('不计阻尼时运动符合牛顿方程解析解，周期由质量与刚度决定', () => {
  for (const [mass, stiffness] of [
    [0.08, 5],
    [0.16, 5],
    [0.08, 10],
  ]) {
    const m = new FreeSpring({ mass, stiffness, beta: 0 });
    release(m, 0.04);
    const w = Math.sqrt(stiffness / mass);
    for (let i = 1; i <= 200; i++) {
      m.advance(0.017);
      close(m.q, 0.04 * Math.cos(w * i * 0.017));
      close(m.v, -0.04 * w * Math.sin(w * i * 0.017));
    }
    const times = m.crossings.filter((c) => c.direction === 1).map((c) => c.time);
    close(times[1] - times[0], (2 * Math.PI) / w, 1e-8);
    close(m.observe().energy, 0.5 * stiffness * 0.04 ** 2);
  }
});

test('原振幅与半振幅由原球释放，过线测得周期一致；小阻尼只逐渐衰减', () => {
  const periods = [];
  const m = new FreeSpring();
  for (const amplitude of [0.05, 0.025]) {
    const start = m.time;
    release(m, amplitude);
    m.advance(9);
    const times = m.crossings.filter((c) => c.direction === -1 && c.time > start).map((c) => c.time);
    periods.push((times.at(-1) - times[0]) / (times.length - 1));
    assert.ok(m.observe().energy < 0.5 * m.parameters.stiffness * amplitude ** 2);
    assert.ok(m.observe().energy > 0.85 * 0.5 * m.parameters.stiffness * amplitude ** 2);
  }
  close(periods[0], periods[1]);
  close(periods[0], (2 * Math.PI) / Math.sqrt(5 / 0.08 - 0.006 ** 2), 1e-8);
});

test('抓住保留位置、时间与记录，手移做功和抓球损失不混入空气阻尼热', () => {
  const m = new FreeSpring();
  release(m, 0.05);
  m.startRecording();
  m.advance(0.2);
  const q = m.q,
    t = m.time,
    v = m.v,
    work = m.handWork,
    heat = m.heat;
  m.grab();
  assert.equal(m.q, q);
  assert.equal(m.time, t);
  assert.equal(m.v, 0);
  close(m.handWork - work, -0.5 * m.parameters.mass * v ** 2);
  assert.equal(m.heat, heat);
  const old = m.samples.map((s) => ({ ...s }));
  m.move(-0.025);
  m.advance(0.2);
  close(m.q, -0.025);
  assert.deepEqual(m.samples.slice(0, old.length), old);
  assert.ok(m.samples.at(-1).held);
  close(m.handWork, m.observe().energy + m.heat);
  m.release();
  m.advance(1);
  close(m.handWork, m.observe().energy + m.heat);
});

test('空气耗散与独立积分阻力功一致；无时间切换产生的额外能量', () => {
  const m = new FreeSpring({ beta: 0.2 });
  release(m, 0.05);
  let heat = 0;
  for (let i = 0; i < 3000; i++) {
    const before = m.v;
    m.advance(0.001);
    heat += ((2 * m.parameters.mass * m.parameters.beta * (before ** 2 + m.v ** 2)) / 2) * 0.001;
  }
  close(heat, m.heat, 1e-8);
  close(m.handWork, m.observe().energy + m.heat);
});

test('每0.04s位置记录来自当前真实状态；晚开记录不重置相位，停录保留原数据', () => {
  const m = new FreeSpring({ beta: 0 });
  release(m, -0.04);
  m.advance(0.137);
  m.startRecording({ duration: 1 });
  m.advance(1.013);
  assert.equal(m.samples.length, 26);
  assert.equal(m.recording.active, false);
  m.samples.forEach((s, i) => {
    close(s.t, i * 0.04);
    close(s.q, -0.04 * Math.cos(Math.sqrt(5 / 0.08) * (0.137 + s.t)));
  });
  const copy = structuredClone(m.samples);
  m.advance(0.4);
  assert.deepEqual(m.samples, copy);
  m.startRecording();
  m.advance(0.1);
  m.stopRecording();
  const count = m.samples.length;
  m.advance(0.3);
  assert.equal(m.samples.length, count);
});

test('同向过平衡位置才是全振动；原始点击时刻不改为理论周期', () => {
  const m = new FreeSpring({ beta: 0 });
  release(m, 0.04);
  assert.equal(springTimingMark(m).atCenter, false);
  m.advance(0.19);
  const start = springTimingMark(m);
  assert.ok(start.atCenter);
  assert.equal(start.direction, -1);
  m.advance(0.4);
  const opposite = springTimingMark(m);
  assert.ok(opposite.atCenter);
  assert.equal(opposite.direction, 1);
  m.advance(0.41);
  const end = springTimingMark(m);
  assert.ok(end.atCenter);
  assert.equal(end.direction, start.direction);
  assert.equal(end.ordinal - start.ordinal, 1);
  close(end.time - start.time, 0.81);
  assert.ok(Math.abs(end.time - start.time - (2 * Math.PI) / Math.sqrt(5 / 0.08)) > 0.01);
  m.grab();
  assert.equal(springTimingMark(m).atCenter, false);
});

test('不同显示帧率给出同一轨迹、事件及等时记录；移动边界防止弹簧松弛', () => {
  const a = new FreeSpring(),
    b = new FreeSpring();
  for (const m of [a, b]) {
    release(m, 0.04);
    m.startRecording();
  }
  for (let i = 0; i < 360; i++) a.advance(1 / 60);
  for (let i = 0; i < 150; i++) b.advance(0.04);
  assert.deepEqual(a.observe(), b.observe());
  assert.deepEqual(a.crossings, b.crossings);
  assert.deepEqual(a.samples, b.samples);
  a.grab();
  a.move(-1);
  assert.equal(a.q, -a.parameters.maxDisplacement);
  assert.ok(a.observe().extension > 0);
  a.move(1);
  assert.equal(a.q, a.parameters.maxDisplacement);
  a.reset();
  assert.equal(a.time, 0);
  assert.deepEqual(a.samples, []);
  assert.deepEqual(a.turns, { '-1': 0, 1: 0 });
});

test('非法参数与未抓住的移动不能污染运动状态', () => {
  for (const options of [{ mass: 0 }, { stiffness: -1 }, { beta: 8 }, { maxDisplacement: 0.2 }, { gravity: NaN }])
    assert.throws(() => new FreeSpring(options));
  const m = new FreeSpring();
  assert.throws(() => m.move(0.01));
  assert.throws(() => m.advance(Infinity));
  assert.throws(() => m.advance(-1));
  assert.throws(() => m.startRecording({ interval: 0 }));
  m.startRecording();
  assert.throws(() => m.startRecording());
  m.grab();
  assert.throws(() => m.move(NaN));
  assert.ok(Number.isFinite(m.q));
});
