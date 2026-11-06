import test from 'node:test';
import assert from 'node:assert/strict';
import { FaradayDrop, dropFlux, DROP_TOP } from '../src/lessons/kit/faradayDrop.js';
const close = (a, b, e = 1e-8) => assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);
const run = (options, dt = 0.016) => {
  const m = new FaradayDrop(options);
  m.release();
  while (m.running) m.advance(dt);
  return m;
};
test('解析磁链梯度符合差分，静止磁体虽有磁通却没有感应电压', () => {
  for (const z of [-0.06, -0.02, 0, 0.02, 0.06]) {
    const h = 1e-6,
      s = dropFlux(z);
    close(s.gradient, (dropFlux(z + h).linkage - dropFlux(z - h).linkage) / (2 * h), 1e-8);
  }
  const m = new FaradayDrop();
  m.y = m.coilY;
  assert.ok(m.observe().linkage > 0);
  close(m.observe().voltage, 0);
});
test('固定匝数与磁体，20、30、40、50 cm 处的绝对电压峰值依次增大', () => {
  const peaks = [0.2, 0.3, 0.4, 0.5].map((distance) => run({ distance }).peak);
  peaks.slice(1).forEach((p, i) => assert.ok(p > peaks[i]));
  const m = run({ distance: 0.3 });
  assert.ok(m.positivePeak > 0 && m.negativePeak < 0);
  close(m.observe().voltage, 0);
});
test('高阻测压下增大匝数或磁体强度近似等比例增大电压，不把电流当电压', () => {
  const a = run({ turns: 300 }),
    b = run({ turns: 600 }),
    c = run({ turns: 300, strength: 2 });
  close(b.peak / a.peak, 2, 1e-4);
  close(c.peak / a.peak, 2, 1e-4);
  const m = new FaradayDrop();
  m.v = -2;
  const s = m.observe();
  close(s.voltage, s.current * m.inputResistance);
  assert.ok(Math.abs(s.voltage) < Math.abs(s.emf));
});
test('翻转磁极反转整个波形但不改变绝对峰值；磁体穿过后仍保留原记录', () => {
  const a = run({ polarity: 1 }),
    b = run({ polarity: -1 });
  close(a.peak, b.peak);
  a.samples.forEach((s, i) => {
    close(s[0], b.samples[i][0]);
    close(s[1], -b.samples[i][1]);
  });
  const before = a.samples.length;
  a.advance(1);
  assert.equal(a.samples.length, before);
  assert.equal(a.release(), false);
});
test('逐帧推进和大帧推进捕获相同峰值，重做清除旧波形', () => {
  const a = run({ distance: 0.4 }, 1 / 60),
    b = run({ distance: 0.4 }, 0.037);
  close(a.peak, b.peak);
  close(a.time, b.time);
  assert.deepEqual(a.samples, b.samples);
  a.reset();
  close(a.y, DROP_TOP);
  close(a.v, 0);
  close(a.peak, 0);
  assert.equal(a.samples.length, 0);
  assert.equal(a.finished, false);
});
test('传感器负载产生阻碍运动的力，机械能损失与焦耳热对应', () => {
  const m = new FaradayDrop({ distance: 0.3, inputResistance: 1000 });
  m.release();
  m.advance(0.25);
  const initial = m.mass * 9.8 * DROP_TOP,
    now = 0.5 * m.mass * m.v * m.v + m.mass * 9.8 * m.y;
  close(initial - now, m.joule, 1e-9);
  assert.ok(m.joule > 0);
  const s = m.observe(m.coilY + 0.02, -2);
  assert.ok(s.force > 0);
  close(s.force * -2, -s.current * s.current * (m.inputResistance + m.coilResistance));
});

test('落底时按接触时刻结算，初始势能等于剩余势能、热量和碰撞耗散', () => {
  for (const inputResistance of [1000, 1e6]) {
    const m = run({ distance: 0.5, inputResistance });
    close(m.mass * 9.8 * DROP_TOP, m.mass * 9.8 * m.y + m.joule + m.impactEnergy, 1e-10);
    close(m.y, 0.035);
    close(m.v, 0);
    assert.ok(m.impactEnergy > 0);
    assert.deepEqual(m.samples.at(-1), [m.time, 0]);
  }
});
