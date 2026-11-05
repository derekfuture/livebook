import test from 'node:test';
import assert from 'node:assert/strict';
import { balanceRing, FIXED, RUBBER_LENGTH, RUBBER_K } from '../src/lessons/kit/ringforces.js';

const rest = 0.294,
  perN = 0.024;
const close = (actual, want) => assert.ok(Math.abs(actual - want) < 1e-5, actual + ' != ' + want);
test('两表斜拉与单表复现同一位置，合力的两个分量都相等', () => {
  const pulls = [
    { f: 1.8, a: -0.6 },
    { f: 1.4, a: 0.8 },
  ];
  const sum = pulls.reduce((v, p) => ({ x: v.x + p.f * Math.cos(p.a), z: v.z + p.f * Math.sin(p.a) }), { x: 0, z: 0 }),
    net = Math.hypot(sum.x, sum.z);
  const o = {
    x: FIXED.x + ((RUBBER_LENGTH + net / RUBBER_K) * sum.x) / net,
    z: FIXED.z + ((RUBBER_LENGTH + net / RUBBER_K) * sum.z) / net,
  };
  const handles = pulls.map((p) => ({
    x: o.x + (rest + p.f * perN) * Math.cos(p.a),
    z: o.z + (rest + p.f * perN) * Math.sin(p.a),
  }));
  const pair = balanceRing({ x: -0.14, z: 0 }, handles, rest, perN);
  close(pair.point.x, o.x);
  close(pair.point.z, o.z);
  pair.readings.forEach((r, i) => {
    close(r.fx, pulls[i].f * Math.cos(pulls[i].a));
    close(r.fz, pulls[i].f * Math.sin(pulls[i].a));
  });
  const one = balanceRing(
    pair.point,
    [{ x: o.x + ((rest + net * perN) * sum.x) / net, z: o.z + ((rest + net * perN) * sum.z) / net }],
    rest,
    perN,
  );
  close(one.point.x, o.x);
  close(one.point.z, o.z);
  close(one.readings[0].force, net);
  assert.ok(net < pulls[0].f + pulls[1].f);
});
test('松弛的绳不代替压力，等伸长而方向不同不能复现 O', () => {
  const first = balanceRing(
    { x: -0.14, z: 0 },
    [
      { x: 0.27, z: 0 },
      { x: 0.1, z: 0.04 },
    ],
    rest,
    perN,
  );
  close(first.readings[1].force, 0);
  const a = 0.3,
    L = 0.57;
  const rotated = balanceRing(first.point, [{ x: FIXED.x + L * Math.cos(a), z: L * Math.sin(a) }], rest, perN);
  close(rotated.rubber.force, first.rubber.force);
  assert.ok(Math.abs(rotated.point.z - first.point.z) > 0.05);
  const slack = balanceRing({ x: -0.14, z: 0 }, [{ x: 0.12, z: 0 }], rest, perN);
  close(slack.readings[0].force, 0);
});
