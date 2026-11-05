import test from 'node:test';
import assert from 'node:assert/strict';
import { FLAG_WIDTH, gliderTrial, impactSpeeds } from '../src/lessons/kit/momentum.js';
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} ≠ ${b}`);
test('不等质量弹性碰撞：光电门遮光时间给出反向速度，动量和动能均守恒', () => {
  const m1 = 0.2,
    m2 = 0.3,
    u = 0.6;
  const run = gliderTrial({ m1, m2, launch: u, restitution: 1 });
  const [a, b] = impactSpeeds(m1, m2, u, 0, 1);
  close(a, -0.12);
  close(b, 0.48);
  close(m1 * a + m2 * b, m1 * u);
  close(m1 * a * a + m2 * b * b, m1 * u * u);
  assert.deepEqual(
    run.events.map((p) => [p.glider, p.gate, p.stage]),
    [
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 1],
    ],
  );
  for (const p of run.events)
    close((p.direction * FLAG_WIDTH) / (p.exit - p.enter), p.stage === 0 ? u : [a, b][p.glider]);
});
test('完全非弹性碰撞的两个遮光片先后扫过同一门，滑块保持相连', () => {
  const run = gliderTrial({ m1: 0.2, m2: 0.3, launch: 0.6, restitution: 0 });
  const passages = run.events.filter((p) => p.stage === 1);
  assert.deepEqual(
    passages.map((p) => [p.glider, p.gate]),
    [
      [1, 1],
      [0, 1],
    ],
  );
  for (const p of passages) close(FLAG_WIDTH / (p.exit - p.enter), 0.24);
  const [a, b] = run.positions(run.end);
  close(b - a, 0.11);
});
test('等质量弹性碰撞中入射滑块停住，不会产生虚构的遮光记录', () => {
  const run = gliderTrial({ m1: 0.2, m2: 0.2, launch: 0.4, restitution: 1 });
  assert.equal(run.events.filter((p) => p.glider === 0 && p.stage === 1).length, 0);
  assert.ok(Number.isFinite(run.end));
  close(run.positions(run.end)[0], -0.11);
});

test('较重入射滑块弹开后仍向右，分别用同一道门的两次记录测速', () => {
  const run = gliderTrial({ m1: 0.3, m2: 0.2, launch: 0.6, restitution: 1 });
  const post = run.events.filter((e) => e.stage === 1);
  assert.deepEqual(
    post.map((e) => [e.gate, e.glider, e.direction]),
    [
      [1, 1, 1],
      [1, 0, 1],
    ],
  );
  const speeds = post.map((e) => FLAG_WIDTH / (e.exit - e.enter));
  close(0.3 * speeds[1] + 0.2 * speeds[0], 0.3 * 0.6);
  const [a, b] = run.positions(run.end);
  close(b - a, 0.11);
});
