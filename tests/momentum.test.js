import test from 'node:test';
import assert from 'node:assert/strict';
import { FLAG_WIDTH, gliderTrial, impactSpeeds, collisionMeasurements } from '../src/lessons/kit/momentum.js';
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

test('同一轮实测计时的反向速度带负号，动能各项仍为正', () => {
  const r = collisionMeasurements([0.2, 0.3], [20, 25, 100], [1, 1, -1]);
  assert.deepEqual(r.velocities, [0.5, 0.4, -0.1]);
  close(r.kinetic[0], 0.025);
  close(r.kinetic[1], 0.025);
  close(r.momentum[0], 0.1);
  close(r.momentum[1], 0.1);
  assert.equal(r.relation, 'equal');
  const reverse = collisionMeasurements([0.2, 0.3], [20, 25, 100], [-1, -1, 1]);
  assert.deepEqual(reverse.kinetic, r.kinetic);
  close(reverse.momentum[1], -r.momentum[1]);
});

test('0.1ms末位舍入的弹性碰撞不误判损失，粘连仍识别动能减少', () => {
  for (const masses of [
    [0.2, 0.3],
    [0.3, 0.2],
  ])
    for (const launch of [0.17, 0.33, 0.57, 0.79]) {
      for (const restitution of [0, 1]) {
        const run = gliderTrial({ m1: masses[0], m2: masses[1], launch, restitution });
        const selected = [
          [0, 0],
          [1, 1],
          [0, 1],
        ].map(([glider, stage]) => run.events.find((e) => e.glider === glider && e.stage === stage));
        const times = selected.map((e) => +((e.exit - e.enter) * 1000).toFixed(1));
        const result = collisionMeasurements(
          masses,
          times,
          selected.map((e) => e.direction),
        );
        assert.equal(result.relation, restitution ? 'equal' : 'decrease');
        const exactV = [launch, ...impactSpeeds(...masses, launch, 0, restitution).reverse()];
        const exactEnergy = [
          0.5 * masses[0] * launch ** 2,
          0.5 * masses[0] * exactV[2] ** 2 + 0.5 * masses[1] * exactV[1] ** 2,
        ];
        for (let i = 0; i < 2; i++)
          assert.ok(
            result.energyBounds[0][i] <= exactEnergy[i] + 1e-12 && exactEnergy[i] <= result.energyBounds[1][i] + 1e-12,
          );
      }
    }
});

test('动能比较来自数据而非端面标签，非法读数不可生成结论', () => {
  assert.equal(collisionMeasurements([0.2, 0.3], [100, 20, 20], [1, 1, 1]).relation, 'increase');
  assert.throws(() => collisionMeasurements([0.2, 0.3], [0, 20, 20], [1, 1, 1]));
  assert.throws(() => collisionMeasurements([0.2, 0.3], [20, 20, 20], [1, 0, 1]));
});
