import test from 'node:test';
import assert from 'node:assert/strict';
import { RopeWave } from '../src/lessons/kit/ropeWave.js';
const close = (a, b, e = 1e-7) => assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);
function pulse(m, sign = 1) {
  // Smooth hand-made displacement history, fed through the same finite-speed hand response.
  for (let i = 0; i < 160; i++) {
    m.setHand(sign * 0.12 * Math.sin((Math.PI * i) / 160) ** 2);
    m.advance(0.00025);
  }
  m.setHand(0);
}
test('绳的静态下垂平衡不会自发产生波，波速由张力和线密度决定', () => {
  const m = new RopeWave();
  m.advance(0.3);
  assert.ok(m.y.every((v) => v === 0));
  close(m.baseline(2), -0.049);
  close(m.speed, 20);
  close(new RopeWave({ tension: 64 }).speed, 40);
  close(new RopeWave({ density: 0.16 }).speed, 10);
});
test('上抖产生的脉冲先后经过标记点，材料点不随波向前移动', () => {
  const m = new RopeWave({ damping: 0 });
  pulse(m);
  const first = [null, null],
    peak = [0, 0];
  for (let i = 0; i < 650; i++) {
    m.advance(0.00025);
    [40, 100].forEach((j, k) => {
      if (m.y[j] > 0.015 && first[k] === null) first[k] = m.time;
      if (m.y[j] > peak[k]) peak[k] = m.y[j];
    });
  }
  assert.ok(first.every((v) => v !== null));
  assert.ok(first[1] > first[0]);
  close(first[1] - first[0], 1.5 / m.speed, 0.002);
  assert.ok(peak.every((v) => v > 0.09));
  const marker = m.observe().points[40];
  close(marker.x, 1);
  assert.ok(Math.abs(marker.displacement) < 0.005);
});
test('反向抖动反转传播中的位移，但不改变传播速度或材料点坐标', () => {
  const a = new RopeWave(),
    b = new RopeWave();
  pulse(a, 1);
  pulse(b, -1);
  a.advance(0.13);
  b.advance(0.13);
  a.y.forEach((v, i) => close(v, -b.y[i], 1e-12));
  a.v.forEach((v, i) => close(v, -b.v[i], 1e-10));
});
test('固定远端保持零位移，返回脉冲发生反相，不在到达端点时凭空消失', () => {
  const m = new RopeWave({ damping: 0 });
  pulse(m);
  let positive = 0,
    negative = 0;
  for (let i = 0; i < 1400; i++) {
    m.advance(0.00025);
    positive = Math.max(positive, m.y[120]);
    negative = Math.min(negative, m.y[120]);
    close(m.y[160], 0, 1e-12);
  }
  assert.ok(positive > 0.08);
  assert.ok(negative < -0.08);
});
test('手做功等于机械能变化与耗散，停止抖动后仍有波继续传播', () => {
  const m = new RopeWave();
  pulse(m);
  m.advance(0.06);
  const before = m.energy();
  assert.ok(before > 0);
  m.advance(0.5);
  close(m.handWork, m.energy() + m.heat, 2e-6);
  assert.ok(m.heat > 0);
});
test('不依赖渲染帧长，目标位置不会让整根绳瞬间换形；重做清除运动', () => {
  const a = new RopeWave(),
    b = new RopeWave();
  a.setHand(0.12);
  b.setHand(0.12);
  assert.ok(a.y.every((v) => v === 0));
  for (let i = 0; i < 30; i++) a.advance(1 / 600);
  for (let i = 0; i < 10; i++) b.advance(0.005);
  assert.deepEqual(a.y, b.y);
  assert.deepEqual(a.v, b.v);
  assert.ok(a.y[0] > 0.11);
  assert.ok(Math.abs(a.y[150]) < 1e-12);
  a.reset();
  assert.ok(a.y.every((v) => v === 0));
  assert.equal(a.handWork, 0);
  assert.equal(a.time, 0);
});

test('连续上下抖动产生凹凸相间的波列，同一红点先后向上下运动', () => {
  const m = new RopeWave({ damping: 0 }),
    positions = [];
  for (let i = 0; i < 720; i++) {
    m.setHand(0.1 * Math.sin(2 * Math.PI * 12.5 * m.time));
    m.advance(0.00025);
    positions.push(m.y[40]);
  }
  assert.ok(Math.max(...positions) > 0.06);
  assert.ok(Math.min(...positions) < -0.06);
  let signs = 0;
  for (let i = 1; i < 150; i++) if (m.y[i] * m.y[i + 1] < 0) signs++;
  assert.ok(signs >= 3);
  close(m.observe().points[40].x, 1);
});
