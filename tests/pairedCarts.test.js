import test from 'node:test';
import assert from 'node:assert/strict';
import { pairedRun, liftBrake, movePair, pressBrake } from '../src/lessons/kit/ticker/pairedCarts.js';

const setup = () =>
  pairedRun([
    { lift: 15, cartIndex: 0, hangerIndex: 1 },
    { lift: 15, cartIndex: 2, hangerIndex: 1 },
  ]);

test('黑板擦同时放开、压停两条绳；等时位移比与加速度比相等', () => {
  const pair = setup();
  movePair(pair, 0.5);
  assert.deepEqual(
    pair.carts.map((c) => c.x),
    [0, 0],
  );
  liftBrake(pair);
  movePair(pair, 0.3);
  movePair(pair, 0.2);
  pressBrake(pair);
  const [light, heavy] = pair.carts;
  assert.equal(light.t, heavy.t);
  assert.equal(light.t, 0.5);
  assert.ok(Math.abs(light.x / heavy.x - 1.02 / 0.52) < 1e-10);
  liftBrake(pair);
  movePair(pair, 1);
  assert.equal(light.t, 0.5);
});

test('快车到达端部后，慢车继续走，直到黑板擦压住尾绳', () => {
  const pair = setup();
  liftBrake(pair);
  movePair(pair, pair.end);
  assert.equal(pair.state, 'atEnd');
  const [fast, slow] = pair.carts;
  const oldX = slow.x;
  movePair(pair, 0.05);
  assert.equal(fast.t, fast.end);
  assert.ok(slow.x > oldX);
  pressBrake(pair);
  assert.equal(pair.state, 'missed');
  const stoppedX = slow.x;
  movePair(pair, 1);
  assert.equal(slow.x, stoppedX);
});
