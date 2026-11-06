import test from 'node:test';
import assert from 'node:assert/strict';
import { RopeSuperposition } from '../src/lessons/kit/ropeSuperposition.js';
const close = (a, b, eps = 1e-8) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const hand = (t, amplitude, delay = 0) =>
  t < delay || t > delay + 0.04 ? 0 : amplitude * Math.sin((Math.PI * (t - delay)) / 0.04) ** 2;
function drive(model, left, right, end, delay = 0) {
  while (model.time < end - 1e-9) {
    model.setHand(hand(model.time, left));
    model.setRightHand(hand(model.time, right, delay));
    model.advance(0.00025);
  }
}

test('左右端独立驱动且镜像对称，材料点横坐标保持不变', () => {
  const left = new RopeSuperposition(),
    right = new RopeSuperposition();
  drive(left, 0.12, 0, 0.09);
  drive(right, 0, 0.12, 0.09);
  for (let i = 0; i <= left.segments; i++) {
    close(left.y[i], right.y[left.segments - i]);
    close(left.v[i], right.v[left.segments - i]);
  }
  const sample = right.observe();
  close(sample.points[80].x, 2);
  close(sample.points[160].velocity, right.rightHandVelocity());
  close(sample.rightHand, right.y[160]);
});

test('相遇全过程满足位移与速度叠加，支持不同振幅和不同出发时刻', () => {
  const a = new RopeSuperposition(),
    b = new RopeSuperposition(),
    both = new RopeSuperposition();
  let overlap = false;
  for (let i = 0; i < 800; i++) {
    const t = i * 0.00025,
      l = hand(t, 0.12),
      r = hand(t, 0.06, 0.012);
    a.setHand(l);
    b.setRightHand(r);
    both.setHand(l);
    both.setRightHand(r);
    for (const m of [a, b, both]) m.advance(0.00025);
    for (let j = 0; j <= a.segments; j++) {
      close(both.y[j], a.y[j] + b.y[j], 1e-12);
      close(both.v[j], a.v[j] + b.v[j], 1e-10);
      if (a.y[j] > 0.03 && b.y[j] > 0.02) overlap = true;
    }
  }
  assert.ok(overlap, '校验窗口必须实际包含两个脉冲重叠');
});

test('不同高度的脉冲相遇后穿过，各自的幅度和传播方向保持', () => {
  const m = new RopeSuperposition({ damping: 0 });
  drive(m, 0.12, 0.06, 0.075);
  const leftBefore = Math.max(...m.y.slice(1, 80)),
    rightBefore = Math.max(...m.y.slice(81, 160));
  assert.ok(leftBefore > rightBefore * 1.7);
  drive(m, 0.12, 0.06, 0.175);
  const leftAfter = Math.max(...m.y.slice(1, 80)),
    rightAfter = Math.max(...m.y.slice(81, 160));
  close(leftAfter, rightBefore, 0.003);
  close(rightAfter, leftBefore, 0.003);
  assert.ok(rightAfter > leftAfter * 1.7, '较高的左发脉冲应穿到右侧，而非像球一样弹回');
});

test('同向脉冲中点增强，反向脉冲中点抵消时能量仍以运动形式存在', () => {
  const same = new RopeSuperposition({ damping: 0 }),
    opposite = new RopeSuperposition({ damping: 0 });
  drive(same, 0.12, 0.12, 0.125);
  drive(opposite, 0.12, -0.12, 0.125);
  assert.ok(same.y[80] > 0.18);
  close(opposite.y[80], 0, 1e-12);
  const kinetic = opposite.v.reduce((sum, v) => sum + 0.5 * opposite.mass * v * v, 0);
  assert.ok(kinetic / opposite.energy() > 0.9, '位移抵消不意味着能量消失');
  close(same.energy(), opposite.energy(), 1e-6);
  drive(opposite, 0.12, -0.12, 0.175);
  assert.ok(Math.min(...opposite.y.slice(1, 80)) < -0.08);
  assert.ok(Math.max(...opposite.y.slice(81, 160)) > 0.08);
});

test('两端做功共同补偿机械能变化和阻尼耗散，含静态支承力做功', () => {
  const m = new RopeSuperposition();
  drive(m, 0.12, -0.09, 0.06, 0.01);
  m.setHand(0.03);
  m.setRightHand(0.05);
  m.advance(0.04);
  assert.ok(m.y[0] > 0.029 && m.y[160] > 0.049);
  close(m.handWork, m.energy() + m.heat, 2e-6);
  m.setHand(0);
  m.setRightHand(0);
  m.advance(0.5);
  close(m.handWork, m.energy() + m.heat, 2e-6);
  assert.ok(m.heat > 0);
});

test('固定步长结果不依赖渲染帧率，重做同时清除两端状态', () => {
  const a = new RopeSuperposition(),
    b = new RopeSuperposition();
  for (const m of [a, b]) {
    m.setHand(0.12);
    m.setRightHand(-0.06);
  }
  for (let n = 0; n < 30; n++) a.advance(1 / 600);
  for (let n = 0; n < 10; n++) b.advance(0.005);
  assert.deepEqual(a.y, b.y);
  assert.deepEqual(a.v, b.v);
  a.reset();
  assert.equal(a.target, 0);
  assert.equal(a.rightTarget, 0);
  assert.ok(a.y.every((y) => y === 0));
  assert.ok(a.v.every((v) => v === 0));
  assert.equal(a.handWork, 0);
  assert.equal(a.heat, 0);
  assert.equal(a.time, 0);
});

test('两米实操绳保持相同传播时长，两个驱动的能量平衡仍成立', () => {
  const m = new RopeSuperposition({ length: 2, tension: 4 });
  close(m.speed, 10);
  close(m.length / m.speed, 0.2);
  close(m.baseline(1), -0.049);
  drive(m, 0.12, 0.06, 0.175);
  assert.ok(Math.max(...m.y.slice(1, 80)) > 0.035);
  assert.ok(Math.max(...m.y.slice(81, 160)) > 0.05);
  close(m.handWork, m.energy() + m.heat, 2e-6);
});
