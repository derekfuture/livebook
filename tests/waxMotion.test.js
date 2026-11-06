import test from 'node:test';
import assert from 'node:assert/strict';
import { waxMotion } from '../src/lessons/kit/waxMotion.js';
const close = (a, b, tol = 1e-7) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);

test('蜡块开始加速，阻力增长后趋于浮重平衡，不从起点直接匀速', () => {
  const m = waxMotion({ initialPosition: -0.45 });
  close(m.snapshot().velocity, 0);
  close(m.acceleration(-0.45, 0), (20 * 9.81) / 980);
  const early = m.step(0.1),
    late = m.step(3);
  assert.ok(early.velocity > 0 && early.velocity < 0.03);
  close(late.velocity, 0.08, 2e-5);
  close(m.acceleration(late.s, late.velocity), 0, 1e-4);
});

test('同一蜡块连续随管翻转，随后从原位置向另一端浮升', () => {
  const m = waxMotion();
  const pose = (t) => ({ angle: Math.PI * Math.min(t / 4, 1), omega: t < 4 ? Math.PI / 4 : 0 });
  let previous = m.snapshot(pose(0));
  for (let i = 0; i < 960; i++) {
    const p = m.step(1 / 240, pose);
    assert.ok(Math.hypot(p.x - previous.x, p.y - previous.y) < 0.003);
    assert.ok(Math.abs(p.s - previous.s) < 0.001);
    previous = p;
  }
  assert.ok(previous.s > 0 && previous.velocity < 0);
  assert.ok(m.step(5, pose).s < previous.s - 0.3);
});

test('均匀横移只增加水平分运动，固定背景留迹符合速度合成', () => {
  const still = waxMotion({ initialPosition: -0.45 });
  const moving = waxMotion({ initialPosition: -0.45 });
  for (let i = 0; i < 300; i++) {
    const a = still.step(0.01),
      b = moving.step(0.01, (t) => ({ x: 0.05 * t, vx: 0.05 }));
    close(a.s, b.s);
    close(a.velocity, b.velocity);
    close(b.x, 0.05 * b.time);
    close(b.y, a.y);
    close(b.vx, 0.05);
    close(b.vy, a.velocity);
  }
  const a = moving.snapshot({ x: 0.15, vx: 0.05 });
  const b = moving.step(1, (t) => ({ x: 0.05 * t, vx: 0.05 }));
  close((b.y - a.y) / (b.x - a.x), 0.08 / 0.05, 0.001);
});

test('变速、停顿、反向横移保留真实背景坐标，不强制斜直线', () => {
  const m = waxMotion({ initialPosition: -0.45 });
  for (let i = 0; i < 200; i++) {
    const p = m.step(0.01, (t) => ({ x: 0.1 * Math.sin(t), vx: 0.1 * Math.cos(t), ax: -0.1 * Math.sin(t) }));
    close(p.x, 0.1 * Math.sin(p.time));
    close(p.vx, 0.1 * Math.cos(p.time));
  }
  const a = m.snapshot({ x: 0.08 }),
    b = m.step(0.5, { x: 0.08 });
  close(a.x, b.x);
  assert.ok(b.y > a.y);
});

test('管端不穿透，翻转后能脱离端部；水平静管无轴向浮升', () => {
  const m = waxMotion();
  close(m.step(4).s, m.limit);
  close(m.snapshot().velocity, 0);
  assert.ok(m.step(1, { angle: Math.PI }).s < m.limit);
  close(m.step(30, { angle: Math.PI }).s, -m.limit);
  assert.ok(m.step(1).s > -m.limit);
  const horizontal = waxMotion({ initialPosition: 0.1 });
  close(horizontal.step(10, { angle: Math.PI / 2 }).s, 0.1);
});

test('不同密度与有效重力改变浮升方向；中性浮力不自行运动', () => {
  const neutral = waxMotion({ initialPosition: 0, waxDensity: 1000 });
  close(neutral.step(4).s, 0);
  const heavy = waxMotion({ initialPosition: 0, waxDensity: 1020 });
  assert.ok(heavy.step(1).s < 0);
  const fallingTube = waxMotion({ initialPosition: 0 });
  close(fallingTube.step(1, { ay: -9.81 }).s, 0);
});

test('旋转和横移速度是同一管内位置的世界坐标导数', () => {
  const m = waxMotion({ initialPosition: 0.15 });
  const theta = 0.7,
    omega = 0.2,
    h = 1e-6;
  const p = m.snapshot({ x: 0.1, angle: theta, vx: 0.04, omega });
  const q = m.snapshot({ x: 0.1 + 0.04 * h, angle: theta + omega * h });
  close((q.x - p.x) / h, p.vx);
  close((q.y - p.y) / h, p.vy);
});

test('积分在常见显示帧率下收敛，非法参数不能悄悄生成轨迹', () => {
  const run = (fps) => {
    const m = waxMotion({ initialPosition: -0.45 });
    for (let i = 0; i < fps * 3; i++) m.step(1 / fps);
    return m.snapshot();
  };
  const a = run(30),
    b = run(144);
  close(a.s, b.s, 1e-8);
  close(a.velocity, b.velocity, 1e-8);
  assert.throws(() => waxMotion({ length: 0 }));
  assert.throws(() => waxMotion({ initialPosition: 1 }));
  assert.throws(() => waxMotion().step(-1));
  assert.throws(() => waxMotion().step(0.1, { angle: NaN }));
});

test('阻力总是耗散相对运动，旋转水体压力项使轻蜡块趋向转轴', () => {
  const m = waxMotion({ initialPosition: 0 });
  for (const velocity of [-0.2, -0.01, 0.01, 0.2]) {
    const a = m.acceleration(0, velocity, { angle: Math.PI / 2 });
    assert.ok(a * velocity < 0);
  }
  assert.ok(m.acceleration(0.3, 0, { angle: Math.PI / 2, omega: 1 }) < 0);
  assert.ok(m.acceleration(-0.3, 0, { angle: Math.PI / 2, omega: 1 }) > 0);
});
