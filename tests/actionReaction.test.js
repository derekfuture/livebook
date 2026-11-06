import test from 'node:test';
import assert from 'node:assert/strict';
import { pairedMeters } from '../src/lessons/kit/actionReaction.js';
const close = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
test('串联两表按总伸长求共同拉力，两个挂钩实际相遇', () => {
  const h = [
      { x: -0.23, z: 0 },
      { x: 0.326, z: 0 },
    ],
    s = pairedMeters(h);
  close(s.force, 2);
  close(s.lengths[0], 0.278);
  close(s.lengths[1], 0.278);
  close(dist(h[0], s.joint), s.lengths[0]);
  close(dist(h[1], s.joint), s.lengths[1]);
  close(s.onLeft.x, 2);
  close(s.onRight.x, -2);
  close(s.onLeft.z, 0);
});
test('不同弹簧刚度使伸长不同，不能把等伸长当作等力依据', () => {
  const h = [
      { x: 0, z: 0 },
      { x: 0.6, z: 0 },
    ],
    s = pairedMeters(h, { rest: [0.2, 0.25], perN: [0.01, 0.02] });
  close(s.force, 5);
  close(s.lengths[0] - 0.2, 0.05);
  close(s.lengths[1] - 0.25, 0.1);
  close(dist(h[0], s.joint), 0.25);
  close(dist(h[1], s.joint), 0.35);
});
test('平移、转向以及换一端拉不改变同一相对伸长下的大小关系', () => {
  for (const angle of [0, 0.4, 1.8, Math.PI]) {
    const d = 0.604,
      u = { x: Math.cos(angle), z: Math.sin(angle) },
      h = [
        { x: 0.4, z: -0.2 },
        { x: 0.4 + d * u.x, z: -0.2 + d * u.z },
      ];
    const s = pairedMeters(h);
    close(s.force, 3);
    close(s.onLeft.x + s.onRight.x, 0);
    close(s.onLeft.z + s.onRight.z, 0);
    close(s.onLeft.x * u.z - s.onLeft.z * u.x, 0);
    const swapped = pairedMeters([h[1], h[0]]);
    close(swapped.force, s.force);
    close(swapped.onLeft.x, s.onRight.x);
  }
});
test('卸载后表回零，靠近时转开而不压短弹簧或产生负拉力', () => {
  for (const d of [0.46, 0.4, 0.2, 0]) {
    const h = [
        { x: 0, z: 0 },
        { x: d, z: 0 },
      ],
      s = pairedMeters(h);
    close(s.force, 0);
    close(s.energy, 0);
    close(dist(h[0], s.joint), 0.23);
    close(dist(h[1], s.joint), 0.23);
  }
});
test('慢拉所做的功与弹性势能一致，卸载路径不凭空保留力', () => {
  const left = { x: 0, z: 0 },
    epsilon = 1e-6;
  for (const d of [0.49, 0.55, 0.65]) {
    const a = pairedMeters([left, { x: d - epsilon, z: 0 }]),
      b = pairedMeters([left, { x: d + epsilon, z: 0 }]);
    close((b.energy - a.energy) / (2 * epsilon), pairedMeters([left, { x: d, z: 0 }]).force, 1e-7);
  }
  close(pairedMeters([left, { x: 0.46, z: 0 }]).force, 0);
});
