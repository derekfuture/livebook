import test from 'node:test';
import assert from 'node:assert/strict';
import { CapacitorSharing, SHARING_DEFAULTS } from '../src/lessons/kit/capacitorSharing.js';
const close = (a, b, tol = 1e-11) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b} (tolerance ${tol})`);
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
function balance(m, tol = 1e-10) {
  const q = m.charges,
    t = m.transferred;
  close(q[0] - m.initialCharges[0], t.source - t.sharing - t.meter, tol);
  close(q[1] - m.initialCharges[1], t.sharing - t.discharge, tol);
  close(m.energy() + sum(m.heat), m.initialEnergy + m.sourceWork, tol);
  for (const value of Object.values(m.heat)) assert.ok(value >= 0);
}

test('原图接线：S1接1只充A，断开保留状态；有限表内阻会缓慢放掉A', () => {
  const m = new CapacitorSharing(),
    p = m.parameters;
  m.setContact(1);
  m.advance(p.chargeOhms * p.capacitanceA);
  const target = (p.sourceVolts * p.meterOhms) / (p.chargeOhms + p.meterOhms),
    tau = p.capacitanceA / (1 / p.chargeOhms + 1 / p.meterOhms);
  close(m.voltages[0], target * (1 - Math.exp((-p.chargeOhms * p.capacitanceA) / tau)));
  assert.equal(m.voltages[1], 0);
  const before = [...m.voltages];
  m.setContact(0);
  assert.deepEqual(m.voltages, before);
  m.advance(p.meterOhms * p.capacitanceA);
  close(m.voltages[0], before[0] / Math.E);
  assert.equal(m.voltages[1], 0);
  balance(m);
});

test('相同电容的电荷均分由连续RC演化得到；一半初始能量转为等效电阻热', () => {
  const m = new CapacitorSharing({ meterOhms: Infinity });
  m.reset({ voltageA: 6 });
  m.setContact(2);
  const tau = (m.parameters.shareOhms * m.parameters.capacitanceA) / 2;
  m.advance(tau);
  close(m.voltages[0], 3 + 3 / Math.E);
  close(m.voltages[1], 3 - 3 / Math.E);
  balance(m);
  m.advance(1);
  close(m.voltages[0], 3);
  close(m.voltages[1], 3);
  close(m.heat.sharing, m.initialEnergy / 2);
  balance(m);
});

test('未放空B再次并联不再减半；单独放空B后才会再次均分', () => {
  const m = new CapacitorSharing({ meterOhms: Infinity });
  m.reset({ voltageA: 6 });
  m.setContact(2);
  m.advance(0.2);
  m.setContact(0);
  m.advance(2);
  m.setContact(2);
  m.advance(0.2);
  close(m.voltages[0], 3);
  close(m.voltages[1], 3);
  m.setContact(0);
  m.setDischarge(true);
  m.advance(0.2);
  close(m.voltages[0], 3);
  close(m.voltages[1], 0);
  m.setDischarge(false);
  m.setContact(2);
  m.advance(0.2);
  close(m.voltages[0], 1.5);
  close(m.voltages[1], 1.5);
  balance(m);
});

test('只放掉B的一部分，结果是实际剩余电荷的加权均值', () => {
  const m = new CapacitorSharing({ meterOhms: Infinity });
  m.reset({ voltageA: 3, voltageB: 3 });
  m.setDischarge(true);
  m.advance(m.parameters.dischargeOhms * m.parameters.capacitanceB * Math.log(2));
  close(m.voltages[0], 3);
  close(m.voltages[1], 1.5);
  m.setDischarge(false);
  m.setContact(2);
  m.advance(1);
  close(m.voltages[0], 2.25);
  close(m.voltages[1], 2.25);
  balance(m);
});

test('S1仍接2就闭合S2会把A和B都放电；接1时S2仍只作用于B', () => {
  const m = new CapacitorSharing({ meterOhms: Infinity });
  m.reset({ voltageA: 3, voltageB: 3 });
  m.setContact(2);
  m.setDischarge(true);
  m.advance(1);
  close(m.voltages[0], 0);
  close(m.voltages[1], 0);
  balance(m);
  m.setContact(1);
  m.advance(0.2);
  close(m.voltages[0], 6);
  close(m.voltages[1], 0);
  balance(m);
});

test('不同电容与不同初始电压按电荷守恒得到终值，不硬编码取一半', () => {
  const m = new CapacitorSharing({ capacitanceA: 0.001, capacitanceB: 0.003, meterOhms: Infinity });
  m.reset({ voltageA: 6, voltageB: 2 });
  m.setContact(2);
  m.advance(1);
  close(m.voltages[0], 3);
  close(m.voltages[1], 3);
  balance(m);
  const mirror = new CapacitorSharing({ capacitanceA: 0.003, capacitanceB: 0.001, meterOhms: Infinity });
  mirror.reset({ voltageA: 2, voltageB: 6 });
  mirror.setContact(2);
  mirror.advance(1);
  close(mirror.voltages[0], m.voltages[1]);
  close(mirror.transferred.sharing, -m.transferred.sharing);
  balance(mirror);
});

test('真实有限表负载使A/B在断开后不同；再接通可让B向A补电', () => {
  const m = new CapacitorSharing();
  m.reset({ voltageA: 3, voltageB: 3 });
  m.advance(60);
  assert.ok(m.voltages[0] < m.voltages[1]);
  const before = m.voltages[0];
  m.setContact(2);
  assert.ok(m.currents().sharing < 0);
  m.advance(0.1);
  assert.ok(m.voltages[0] > before);
  assert.ok(m.voltages[0] > 2.99);
  balance(m);
});

test('毫秒RC过程在24/60/120帧输入与一次推进下保持同一状态和电荷/能量账本', () => {
  const run = (hz) => {
    const m = new CapacitorSharing({ meterOhms: 10000 });
    for (const [contact, drain, duration] of [
      [1, false, 0.7],
      [0, false, 0.2],
      [2, false, 0.6],
      [0, true, 0.4],
      [0, false, 0.3],
      [2, false, 0.8],
      [2, true, 0.5],
    ]) {
      m.setContact(contact);
      m.setDischarge(drain);
      if (hz === 0) m.advance(duration);
      else {
        const n = Math.ceil(hz * duration);
        for (let i = 0; i < n; i++) m.advance(duration / n);
      }
    }
    balance(m);
    return m;
  };
  const exact = run(0);
  for (const hz of [24, 60, 120]) {
    const m = run(hz);
    for (let i = 0; i < 2; i++) close(m.voltages[i], exact.voltages[i]);
    for (const key of Object.keys(m.heat)) {
      close(m.heat[key], exact.heat[key]);
      close(m.transferred[key], exact.transferred[key]);
    }
    close(m.sourceWork, exact.sourceWork);
    close(m.time, exact.time);
  }
});

test('极短间隔符合节点电流方程，极长接电不遗漏稳态电表耗能', () => {
  const m = new CapacitorSharing();
  m.reset({ voltageA: 1, voltageB: 2 });
  m.setContact(2);
  m.setDischarge(true);
  const derivative = m.derivatives(),
    before = [...m.voltages],
    dt = 1e-10;
  m.advance(dt);
  for (let i = 0; i < 2; i++) close((m.voltages[i] - before[i]) / dt, derivative[i], 0.0001);
  balance(m, 1e-12);
  const long = new CapacitorSharing();
  long.setContact(1);
  long.advance(100000);
  balance(long, 2e-9);
  const p = long.parameters;
  close(long.voltages[0], (p.sourceVolts * p.meterOhms) / (p.meterOhms + p.chargeOhms));
  assert.ok(long.heat.meter > 0.3);
});

test('所有六种开关组合、正负初值都符合节点电荷守恒与源功/电场能/电阻热关系', () => {
  for (const contact of [0, 1, 2])
    for (const drain of [false, true]) {
      const m = new CapacitorSharing({ capacitanceA: 0.0013, capacitanceB: 0.0027, meterOhms: 5000 });
      m.reset({ voltageA: -1.2, voltageB: 4.5 });
      m.setContact(contact);
      m.setDischarge(drain);
      m.advance(0.035);
      balance(m);
    }
});

test('边界参数和操作被检查；重做才清除两只电容及独立账本', () => {
  for (const parameters of [
    { capacitanceA: 0 },
    { capacitanceB: NaN },
    { chargeOhms: 0 },
    { shareOhms: Infinity },
    { dischargeOhms: -1 },
    { meterOhms: 0 },
    { sourceVolts: NaN },
  ])
    assert.throws(() => new CapacitorSharing(parameters), RangeError);
  const m = new CapacitorSharing();
  for (const contact of [-1, 3, '1']) assert.throws(() => m.setContact(contact), RangeError);
  assert.throws(() => m.setDischarge(1), RangeError);
  assert.throws(() => m.advance(-1), RangeError);
  assert.throws(() => m.advance(Infinity), RangeError);
  m.setContact(1);
  m.advance(1);
  const before = [...m.voltages];
  m.advance(0);
  assert.deepEqual(m.voltages, before);
  assert.throws(() => m.reset({ voltageA: NaN }), RangeError);
  assert.deepEqual(m.voltages, before);
  m.reset();
  assert.deepEqual(m.voltages, [0, 0]);
  assert.equal(m.contact, 0);
  assert.equal(m.discharging, false);
  assert.equal(m.time, 0);
  assert.equal(sum(m.heat), 0);
  assert.equal(sum(m.transferred), 0);
  assert.equal(m.sourceWork, 0);
  assert.equal(m.parameters.capacitanceA, SHARING_DEFAULTS.capacitanceA);
});
