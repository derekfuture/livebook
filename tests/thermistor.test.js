import test from 'node:test';
import assert from 'node:assert/strict';
import {
  thermistorResistance,
  thermistorState,
  thermistorExposure,
  THERMISTOR_HAND,
  THERMISTOR_WATER,
} from '../src/lessons/kit/thermistor.js';
import { meterBranch, meterFraction, ohmScaleValue, METER_STOPS } from '../src/lessons/kit/multimeter.js';
const close = (a, b, tol = 1e-8) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);

test('NTC的B近似使用开尔文温度，升温减阻，不冒充金属电阻', () => {
  close(thermistorResistance(25), 2200);
  close(thermistorResistance(50, { r25: 10000 }), 3588.182581929083, 0.00001);
  for (const T of [0, 10, 22, 33, 50]) {
    assert.ok(thermistorResistance(T + 1) < thermistorResistance(T));
    const derivative =
      (Math.log(thermistorResistance(T + 0.0001)) - Math.log(thermistorResistance(T - 0.0001))) / 0.0002;
    close(derivative, -3950 / (T + 273.15) ** 2, 1e-9);
  }
});

test('室温无外加热保持平衡，整只感温头接触手指后有限时间趋近热平衡', () => {
  const m = thermistorState();
  close(m.step(100).temperature, 22);
  const before = m.temperature;
  close(m.step(0, { contact: 1 }).temperature, before);
  const tau = 0.04 / 0.00825,
    equilibrium = (0.008 * 33 + 0.00025 * 22) / 0.00825;
  const a = m.step(tau, { contact: 1 });
  close((a.temperature - 22) / (equilibrium - 22), 1 - Math.exp(-1));
  assert.ok(a.temperature > 22 && a.temperature < equilibrium);
  close(m.step(30 * tau, { contact: 1 }).temperature, equilibrium, 1e-10);
});

test('从手中放入冷水不瞬间变温，拿出后仍保留冷却历史并逐渐回到室温', () => {
  const m = thermistorState();
  m.step(25, { contact: 1 });
  const warm = m.temperature;
  close(m.step(0, { immersion: 1 }).temperature, warm);
  const early = m.step(0.1, { immersion: 1 });
  assert.ok(early.temperature < warm && early.temperature > 20);
  const cold = m.step(12, { immersion: 1 });
  assert.ok(cold.temperature < 10.2);
  close(m.step(0).temperature, cold.temperature);
  const recovery = m.step(1);
  assert.ok(recovery.temperature > cold.temperature && recovery.temperature < 12);
  close(m.step(300).temperature, 22, 0.00001);
});

test('实际指间位置和球冠入水面积决定传热，放在杯外或水面以上不会自动降温', () => {
  const h = THERMISTOR_HAND,
    w = THERMISTOR_WATER;
  close(thermistorExposure(h).contact, 1);
  const partial = thermistorExposure({ ...h, x: h.x + 0.006 }).contact;
  assert.ok(partial > 0 && partial < 1);
  close(thermistorExposure({ ...h, y: h.y + 0.025 }).contact, 0);
  close(thermistorExposure({ x: w.x, z: w.z, y: w.surface + 0.006 }).immersion, 0);
  close(thermistorExposure({ x: w.x, z: w.z, y: w.surface }).immersion, 0.5);
  close(thermistorExposure({ x: w.x, z: w.z, y: w.surface - 0.006 }).immersion, 1);
  close(thermistorExposure({ x: w.x + w.radius + 0.01, z: w.z, y: w.surface - 0.01 }).immersion, 0);
  const a = thermistorState(),
    b = thermistorState();
  a.step(1, { immersion: 1 });
  b.step(1, { immersion: 0.5 });
  assert.ok(a.temperature < b.temperature);
});

test('手、元件和水杯整体平移不改变实际接触状态', () => {
  const shift = { x: 0.12, y: 0.08, z: -0.03 },
    move = (p) => ({ x: p.x + shift.x, y: p.y + shift.y, z: p.z + shift.z });
  const probe = { x: THERMISTOR_WATER.x, y: THERMISTOR_WATER.surface - 0.002, z: THERMISTOR_WATER.z };
  const w = {
    ...THERMISTOR_WATER,
    x: THERMISTOR_WATER.x + shift.x,
    z: THERMISTOR_WATER.z + shift.z,
    floor: THERMISTOR_WATER.floor + shift.y,
    surface: THERMISTOR_WATER.surface + shift.y,
    rim: THERMISTOR_WATER.rim + shift.y,
  };
  const a = thermistorExposure(probe),
    b = thermistorExposure(move(probe), { hand: move(THERMISTOR_HAND), water: w });
  close(a.immersion, b.immersion);
  close(a.contact, b.contact);
});

test('分阶段热量账本满足能量守恒，包括电阻测量的焦耳热', () => {
  const m = thermistorState();
  let input = 0;
  for (const [dt, env] of [
    [3, { contact: 1, power: 0.0002 }],
    [2, { contact: 0.4, power: 0.0003 }],
    [7, { immersion: 0.6, power: 0.0001 }],
    [13, { power: 0 }],
  ]) {
    const s = m.step(dt, env);
    input += dt * env.power;
    close(s.energy, s.heat.air + s.heat.hand + s.heat.water + s.heat.electric, 1e-12);
    close(s.heat.electric, input);
  }
  // 另用细步梯形积分观察所有热库净流量，核对整个过程的内能变化。
  const n = thermistorState(),
    dt = 0.001;
  let integrated = 0;
  for (let i = 0; i < 10000; i++) {
    const old = n.temperature;
    n.step(dt, { contact: 0.3, immersion: 0.2, power: 0.00027 });
    const mid = (old + n.temperature) / 2;
    integrated +=
      dt * ((0.00025 + 0.00175 * 0.5) * (22 - mid) + 0.008 * 0.3 * (33 - mid) + 0.024 * 0.2 * (10 - mid) + 0.00027);
  }
  close(n.snapshot().energy, integrated, 1e-8);
});

test('测量电流的自热有限且与功率成正比，断开表笔后热量不突然消失', () => {
  const a = thermistorState(),
    b = thermistorState();
  close(a.step(400, { power: 0.0002 }).temperature, 22.1, 1e-8);
  close(b.step(400, { power: 0.0004 }).temperature, 22.2, 1e-8);
  const hot = a.temperature;
  close(a.step(0).temperature, hot);
  assert.ok(a.step(5).temperature < hot);
});

test('原×100欧姆表的暖态偏转增大、冷态偏转减小，阻值与原刻度相符', () => {
  const branch = meterBranch(METER_STOPS[3], 0);
  const fraction = (T) => meterFraction(METER_STOPS[3], { I: branch.E / (branch.R + thermistorResistance(T)) });
  assert.ok(fraction(33) > fraction(22) && fraction(22) > fraction(10));
  for (const T of [10, 22, 33]) {
    const R = thermistorResistance(T);
    close(ohmScaleValue(fraction(T)) * 100, R);
    const power = (branch.E / (branch.R + R)) ** 2 * R;
    assert.ok(power > 0 && power < 0.000282); // 原表1.5V、2kΩ内阻的最大负载功率。
  }
});

test('热过程在不同显示帧率下保持一致，非法输入不能改变已有状态', () => {
  const run = (fps) => {
    const m = thermistorState();
    for (const env of [{ contact: 1 }, { immersion: 1 }, {}]) for (let i = 0; i < fps * 4; i++) m.step(1 / fps, env);
    return m.snapshot();
  };
  const a = run(30),
    b = run(144);
  close(a.temperature, b.temperature, 1e-10);
  close(a.resistance, b.resistance, 1e-7);
  const m = thermistorState(),
    old = m.snapshot();
  for (const env of [
    { contact: NaN },
    { immersion: 2 },
    { power: -0.1 },
    { air: -273.15 },
    { contact: 0.8, immersion: 0.5 },
  ])
    assert.throws(() => m.step(1, env));
  assert.throws(() => m.step(-1));
  assert.throws(() => thermistorState({ heatCapacity: 0 }));
  assert.throws(() => thermistorResistance(-274));
  assert.deepEqual(m.snapshot(), old);
});
