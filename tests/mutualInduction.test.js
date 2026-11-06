import test from 'node:test';
import assert from 'node:assert/strict';
import { MutualInduction } from '../src/lessons/kit/mutualInduction.js';
const close = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);
function peak(m, t = 0.5) {
  let lo = 0,
    hi = 0;
  for (let j = 0; j < t / 0.002; j++) {
    const q = m.advance(0.002).meter;
    lo = Math.min(lo, q);
    hi = Math.max(hi, q);
  }
  return { lo, hi };
}
test('合闸与断开引起相反摆针，稳恒电流不会持续产生次级电流', () => {
  const m = new MutualInduction();
  m.switch(true);
  const on = peak(m);
  assert.ok(on.lo < -1e-5);
  m.advance(2);
  close(m.observe().i1, 6 / 40);
  close(m.observe().i2, 0);
  close(m.observe().meter, 0, 1e-10);
  const before = m.observe();
  m.switch(false);
  close(m.observe().i1, before.i1);
  close(m.observe().i2, before.i2);
  const off = peak(m);
  assert.ok(off.hi > 1e-5);
  m.advance(2);
  close(m.observe().i1, 0);
  close(m.observe().i2, 0);
  close(m.observe().capacitorV, 6, 1e-7);
});
test('滑片改变电流时有暂态，正反移动反向；停下后归零', () => {
  const m = new MutualInduction();
  m.switch(true);
  m.advance(2);
  m.setResistance(68);
  const up = peak(m);
  assert.ok(up.hi > 1e-5);
  m.advance(2);
  close(m.observe().i1, 6 / 80);
  m.setResistance(28);
  const down = peak(m);
  assert.ok(down.lo < -1e-5);
  m.advance(2);
  close(m.observe().i2, 0);
});
test('没有互感时次级不响应，反接绕组使响应反向', () => {
  const a = new MutualInduction({ coupling: 0 }),
    b = new MutualInduction({ coupling: 0.75 }),
    c = new MutualInduction({ coupling: -0.75 });
  for (const m of [a, b, c]) m.switch(true);
  for (let j = 0; j < 150; j++) {
    a.advance(0.002);
    b.advance(0.002);
    c.advance(0.002);
    close(a.observe().i2, 0);
    close(a.observe().meter, 0);
    close(b.observe().meter, -c.observe().meter);
  }
});
test('同一事件序列改变渲染帧长不改变电流和指针响应', () => {
  const a = new MutualInduction(),
    b = new MutualInduction();
  for (const closed of [true, false, true]) {
    a.switch(closed);
    b.switch(closed);
    a.advance(0.2);
    for (let j = 0; j < 200; j++) b.advance(0.001);
    for (const k of ['i1', 'i2', 'meter', 'meterSpeed', 'capacitorV']) close(a.observe()[k], b.observe()[k], 1e-7);
  }
});
test('开断不删除磁能，固定耦合下电路能量变化等于电源功率减电阻热耗', () => {
  const m = new MutualInduction();
  m.switch(true);
  m.advance(0.01);
  const before = m.observe();
  m.switch(false);
  close(m.observe().magneticEnergy, before.magneticEnergy);
  m.advance(5e-6);
  const old = m.observe(),
    dt = 1e-10,
    next = m.advance(dt);
  close((next.energy - old.energy) / dt, old.sourcePower - old.dissipation, 1e-3);
  m.advance(0.5);
  const energy = m.observe().energy,
    loss = m.contactLoss;
  m.switch(true);
  close(m.contactLoss - loss, energy, 1e-10);
});
test('移动耦合保持磁链连续，其储能变化记入机械做功', () => {
  const m = new MutualInduction();
  m.switch(true);
  m.advance(2);
  const before = m.observe();
  m.setCoupling(0.3);
  const after = m.observe();
  close(after.flux1, before.flux1);
  close(after.flux2, before.flux2);
  close(after.magneticEnergy - before.magneticEnergy, m.mechanicalWork);
  assert.ok(Math.abs(after.i2) > 0);
  m.advance(2);
  close(m.observe().i2, 0);
});

test('同一滑片行程，快移比慢移产生更明显偏转；停止后均归零', () => {
  function run(duration) {
    const m = new MutualInduction();
    m.switch(true);
    m.advance(2);
    let peak = 0;
    const n = Math.round(duration / 0.002);
    for (let j = 1; j <= n; j++) {
      m.setResistance(28 + (40 * j) / n);
      peak = Math.max(peak, Math.abs(m.advance(0.002).meter));
    }
    for (let j = 0; j < 500; j++) peak = Math.max(peak, Math.abs(m.advance(0.002).meter));
    close(m.observe().i2, 0);
    return peak;
  }
  assert.ok(run(0.04) > run(1) * 3);
});
