import test from 'node:test';
import assert from 'node:assert/strict';
import { advancePendulum, pendulumEstimate, timingMark, pendulumSeries } from '../src/lessons/kit/gravityPendulum.js';
test('同向过中线才是一次全振动，短摆角下多周期计时可复算 g', () => {
  const length = 0.64,
    sample = advancePendulum(0.045, 0, length, 20);
  const positive = sample.crossings.filter((e) => e.direction === 1);
  const { gravity } = pendulumEstimate(length, positive.at(-1).offset - positive[0].offset, positive.length - 1);
  assert.ok(Math.abs(gravity - 9.8) < 0.004);
  assert.ok(sample.crossings.every((e, i, all) => !i || e.direction !== all[i - 1].direction));
});
test('从大角释放的摆周期变长，不能用小角度公式制造无误差的测量', () => {
  const interval = (angle) => {
    const hits = advancePendulum(angle, 0, 0.64, 6).crossings;
    return hits[2].offset - hits[0].offset;
  };
  assert.ok(interval(0.5) > 1.014 * interval(0.02));
  assert.equal(advancePendulum(0, 0, 0.64, 5).crossings.length, 0);
});

test('提前或稍后按表指向同一次过线，反向过线不计作一个完整周期', () => {
  for (const dir of [-1, 1]) {
    const before = timingMark(-dir * 0.001, dir, 0.07, { [dir]: 0 });
    const after = timingMark(dir * 0.001, dir, 0.07, { [dir]: 1 });
    const end = timingMark(dir * 0.001, dir, 0.07, { [dir]: 21 });
    assert.deepEqual(before, after);
    assert.equal(end.ordinal - before.ordinal, 20);
    assert.notEqual(timingMark(0, -dir, 0.07, { 1: 1, '-1': 1 }).dir, before.dir);
  }
  assert.equal(timingMark(0.06, 0.1, 0.07, { 1: 2 }).atCenter, false);
});

test('多组周期来自原计时，T²-l拟合恢复斜率和g，不把T-l当作正比', () => {
  const samples = [0.46, 0.55, 0.64, 0.83].map((l) => ({ l, n: 20, t: 20 * 2 * Math.PI * Math.sqrt(l / 9.8) }));
  const data = pendulumSeries(samples);
  assert.equal(data.sufficient, true);
  assert.ok(Math.abs(data.squaredFit.slope - (4 * Math.PI ** 2) / 9.8) < 1e-12);
  assert.ok(Math.abs(data.squaredFit.intercept) < 1e-12);
  assert.ok(Math.abs(data.slopeGravity - 9.8) < 1e-12);
  assert.ok(data.periodFit.intercept > 0.7);
  assert.ok(data.periodFit.rms > 0.003);
  assert.ok(data.squaredFit.rms < 1e-12);
});

test('原读数顺序保留，改一个计时会改变两图点与拟合，不回填理论值', () => {
  const samples = [0.64, 0.46, 0.83, 0.55].map((l) => ({
    l,
    n: 20,
    t: +(20 * 2 * Math.PI * Math.sqrt(l / 9.8)).toFixed(2),
  }));
  const a = pendulumSeries(samples);
  assert.deepEqual(
    a.rows.map((r) => r.l),
    samples.map((s) => s.l),
  );
  for (let i = 0; i < 4; i++) assert.equal(a.rows[i].period, samples[i].t / 20);
  const changed = samples.map((s) => ({ ...s }));
  changed[1].t += 0.4;
  const b = pendulumSeries(changed);
  assert.equal(b.rows[1].period, changed[1].t / 20);
  assert.notEqual(a.squaredFit.slope, b.squaredFit.slope);
  assert.notEqual(a.squaredFit.intercept, b.squaredFit.intercept);
  assert.equal(samples[1].t, a.rows[1].t);
});

test('拟合不强迫过原点，固定长度偏差会留在截距而不是被藏掉', () => {
  const samples = [0.46, 0.55, 0.64, 0.83].map((l) => ({
    l: l + 0.02,
    n: 20,
    t: 20 * 2 * Math.PI * Math.sqrt(l / 9.8),
  }));
  const r = pendulumSeries(samples);
  assert.ok(Math.abs(r.squaredFit.intercept + (0.02 * 4 * Math.PI ** 2) / 9.8) < 1e-12);
  assert.ok(Math.abs(r.slopeGravity - 9.8) < 1e-12);
  assert.ok(r.rows.every((p) => p.gravity > 9.8));
});

test('重复摆长或过窄范围不冒充四组充分取样，无效时间不生成结论', () => {
  const at = (lengths) => lengths.map((l) => ({ l, n: 20, t: 32 }));
  assert.equal(pendulumSeries(at([0.5, 0.55, 0.6, 0.65])).sufficient, false);
  assert.equal(pendulumSeries(at([0.46, 0.46, 0.64, 0.83])).sufficient, false);
  assert.equal(pendulumSeries(at([0.46, 0.55, 0.64])).sufficient, false);
  assert.equal(pendulumSeries(at([0.46, 0.55, 0.64, 0.83])).sufficient, true);
  assert.throws(() => pendulumSeries(at([0.6, 0.6, 0.6])));
  assert.throws(() => pendulumSeries([{ l: 0.5, n: 20, t: -3 }, ...at([0.6, 0.7])]));
  const decreasing = pendulumSeries([0.46, 0.55, 0.64, 0.83].map((l) => ({ l, n: 20, t: 50 - 20 * l })));
  assert.equal(decreasing.slopeGravity, null);
});
