import assert from 'node:assert/strict';
import test from 'node:test';
import { advance, power, TRAVEL } from '../src/lessons/kit/ticker/motion.js';
import { tractionRun, GRAVITY } from '../src/lessons/kit/ticker/traction.js';

function record(options, fps) {
  const run = tractionRun({ mode: 'force', lift: 15, cartIndex: 0, hangerIndex: 0, balanced: true, ...options });
  power(run, true);
  while (run.t < run.end) advance(run, 1 / fps);
  return run;
}

test('无牵引轻推，补偿不足时停止，过度时加速，补偿合适时等时点距相等', () => {
  const low = record({ mode: 'balance', lift: 0 }, 30);
  assert.ok(low.x < TRAVEL && low.a < 0);
  assert.ok(Math.abs(low.v0 + low.a * low.t) < 1e-12);
  const level = record({ mode: 'balance' }, 30);
  assert.ok(Math.abs(level.marks[15].x - level.marks[10].x - 0.015) < 1e-10);
  assert.ok(record({ mode: 'balance', lift: 30 }, 30).a > 0);
});

test('补偿后小车受绳张力，悬挂物受重力减张力；纸带独立于帧率', () => {
  for (const cartIndex of [0, 1, 2])
    for (const hangerIndex of [0, 1, 2, 3]) {
      const r = record({ cartIndex, hangerIndex }, 15);
      const tension = r.load * (GRAVITY - r.a);
      assert.ok(Math.abs(r.mass * r.a - tension) < 1e-10);
      assert.ok(Math.abs(r.x - TRAVEL) < 1e-10);
      assert.deepEqual(r.marks, record({ cartIndex, hangerIndex }, 120).marks);
    }
  const stuck = record({ lift: 0 }, 30);
  assert.equal(stuck.x, 0);
});

test('手推试滑从松手位置开始，纸带记录离手后的位移', () => {
  const run = tractionRun({
    mode: 'balance',
    lift: 15,
    cartIndex: 0,
    hangerIndex: 0,
    pushSpeed: 0.2,
    startOffset: 0.04,
  });
  power(run, true);
  advance(run, 0.3);
  assert.ok(Math.abs(run.marks[15].x - 0.06) < 1e-10);
  advance(run, run.end);
  assert.ok(Math.abs(run.startOffset + run.x - TRAVEL) < 1e-10);
});
