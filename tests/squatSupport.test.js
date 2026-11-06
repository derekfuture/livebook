import test from 'node:test';
import assert from 'node:assert/strict';
import { SquatSupport, SQUAT_BODY, SQUAT_HEIGHT, squatPose, squatAngle } from '../src/lessons/kit/squatSupport.js';
const close = (a, b, t = 1e-7) => assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
test('关节几何与质心一致，双脚不动，重心投影始终落在足底支承范围', () => {
  close(SQUAT_BODY.footMass + SQUAT_BODY.shinMass + SQUAT_BODY.thighMass + SQUAT_BODY.torsoMass, 1);
  for (let q = 0.07; q <= 1.05; q += 0.01) {
    const p = squatPose(q);
    close(Math.hypot(p.knee.y - SQUAT_BODY.ankle, p.knee.z), 0.43);
    close(Math.hypot(p.hip.y - p.knee.y, p.hip.z - p.knee.z), 0.43);
    close(squatAngle(p.comY), q);
    assert.ok(p.comZ > -0.08 && p.comZ < 0.2);
    assert.ok(Math.atan2(p.knee.z, p.knee.y - 0.09) < 0.39);
    assert.ok(p.hip.z < p.knee.z);
  }
});
test('静止和蹲住时压力都等于重力，不把姿态当成变轻', () => {
  const m = new SquatSupport();
  close(m.force, 539);
  m.setTarget(SQUAT_HEIGHT.low);
  m.advance(5);
  close(m.force, 539, 0.001);
  assert.ok(m.settled);
  close(m.height, SQUAT_HEIGHT.low, 1e-7);
});
test('下蹲先失重后超重，站起先超重后失重，方向由加速度而非速度决定', () => {
  const m = new SquatSupport();
  m.setTarget(SQUAT_HEIGHT.low);
  assert.ok(m.force < m.weight);
  m.advance(0.55);
  assert.ok(m.velocity < 0 && m.acceleration > 0 && m.force > m.weight);
  m.advance(4);
  m.setTarget(SQUAT_HEIGHT.high);
  assert.ok(m.force > m.weight);
  m.advance(0.55);
  assert.ok(m.velocity > 0 && m.acceleration < 0 && m.force < m.weight);
});
test('换目标和松手不跳位；快速往返也保持接触，力冲量与动量变化相符', () => {
  const m = new SquatSupport();
  let impulse = 0,
    previous = m.force - m.weight;
  for (let i = 0; i < 12000; i++) {
    if (i % 271 === 0) {
      const h = m.height,
        v = m.velocity;
      m.setTarget(i % 542 ? SQUAT_HEIGHT.high : SQUAT_HEIGHT.low);
      close(m.height, h);
      close(m.velocity, v);
      previous = m.force - m.weight;
    }
    m.advance(0.001);
    impulse += (previous + m.force - m.weight) * 0.0005;
    previous = m.force - m.weight;
    assert.ok(m.force > 0);
    assert.ok(m.height >= SQUAT_HEIGHT.low - 1e-8 && m.height <= SQUAT_HEIGHT.high + 1e-8);
  }
  close(impulse, m.mass * m.velocity, 0.01);
});
test('采集来自本次运动，停止保留原记录，50 Hz采样及不同帧率一致', () => {
  function run(fps) {
    const m = new SquatSupport();
    m.start();
    for (let i = 0; i < fps * 4; i++) {
      if (i === fps) m.setTarget(SQUAT_HEIGHT.low);
      if (i === fps * 3) m.setTarget(SQUAT_HEIGHT.high);
      m.advance(1 / fps);
    }
    return m;
  }
  const a = run(24),
    b = run(60),
    c = run(120);
  close(a.height, b.height);
  close(b.height, c.height);
  assert.equal(a.samples.length, 201);
  assert.equal(b.samples.length, 201);
  for (let i = 0; i < a.samples.length; i++) {
    close(a.samples[i].t, b.samples[i].t);
    close(a.samples[i].force, b.samples[i].force, 0.3);
  }
  const old = JSON.stringify(a.samples);
  a.stop();
  a.advance(2);
  assert.equal(JSON.stringify(a.samples), old);
  a.resume();
  a.advance(0.04);
  assert.equal(JSON.stringify(a.samples.slice(0, 201)), old);
  assert.ok(a.samples[201].t - a.samples[200].t > 1.9);
  a.start();
  assert.equal(a.samples.length, 0);
  a.advance(0.1);
  assert.equal(a.samples.length, 6);
});
test('输入约束、有限采集及完全重做', () => {
  const m = new SquatSupport();
  assert.throws(() => m.setTarget(NaN));
  assert.throws(() => m.advance(-1));
  assert.throws(() => new SquatSupport({ response: 8 }));
  assert.throws(() => new SquatSupport({ gravity: 1 }));
  m.setTarget(-100);
  close(m.target, SQUAT_HEIGHT.low);
  m.setTarget(100);
  close(m.target, SQUAT_HEIGHT.high);
  m.start();
  m.advance(62);
  assert.equal(m.samples.length, 3001);
  assert.equal(m.recording, false);
  m.reset();
  assert.equal(m.samples.length, 0);
  close(m.force, m.weight);
  close(m.height, SQUAT_HEIGHT.high);
});
