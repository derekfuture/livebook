import test from 'node:test';
import assert from 'node:assert/strict';
import { GRAVITY, fallingTape, energyPoints } from '../src/lessons/kit/ticker/fall.js';
import { PERIOD } from '../src/lessons/kit/ticker/motion.js';

function drop(resistance, fps) {
  const run = fallingTape(0.2, resistance, 0.255);
  run.power(true, -0.373);
  for (let frame = 1; frame / fps < run.end; frame++) run.advance(frame / fps);
  run.advance(run.end + 0.1);
  return run;
}
test('重力独自做功时两项变化相等；有阻力时差额等于克服阻力的功', () => {
  for (const drag of [0, 0.1]) {
    const run = drop(drag, 30),
      ids = energyPoints(run.marks),
      a = ids[0],
      b = ids.at(-1),
      dh = run.marks[b].x - run.marks[a].x;
    const v = (i) => (run.marks[i + 1].x - run.marks[i - 1].x) / (2 * PERIOD);
    assert.ok(v(a) > 0);
    assert.ok(Math.abs(0.2 * GRAVITY * dh - 0.1 * (v(b) ** 2 - v(a) ** 2) - drag * dh) < 1e-10);
    assert.deepEqual(run.marks, drop(drag, 120).marks);
    assert.ok(run.marks.at(-1).t <= run.end);
  }
});
test('晚通电缺少早段，断电间隙不参与中点测速', () => {
  const run = fallingTape(0.2, 0.1, 0.255);
  run.power(true, 0.034);
  run.power(false, 0.091);
  run.power(true, 0.152);
  run.advance(1);
  assert.equal(run.marks[0].t, 0.034);
  const ids = energyPoints(run.marks);
  assert.ok(ids.length);
  for (const i of ids) assert.ok(Math.abs(run.marks[i + 1].t - run.marks[i - 1].t - 2 * PERIOD) < 1e-9);
  assert.ok(run.marks.every((m) => m.t <= 0.091 || m.t >= 0.152));
});
