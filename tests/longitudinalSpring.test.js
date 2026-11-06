import test from 'node:test';
import assert from 'node:assert/strict';
import { LongitudinalSpring } from '../src/lessons/kit/longitudinalSpring.js';

const close = (a, b, eps = 1e-7) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b} (±${eps})`);
function run(m, duration, hand, visit = () => {}) {
  for (let i = 0; i < Math.round(duration * 1000); i++) {
    m.setHand(hand(i / 1000));
    m.advance(0.001);
    visit(m);
  }
}
const pulse = (t, amplitude = 0.03) => (t < 0.4 ? amplitude * Math.sin((Math.PI * t) / 0.4) ** 2 : 0);

test('原长状态不自发运动；整根刚度和质量决定长波速度，离散不改变它', () => {
  const m = new LongitudinalSpring();
  m.advance(0.1);
  assert.ok(m.q.every((q) => q === 0));
  close(m.energy(), 0);
  close(
    m.observe().gaps.reduce((a, b) => a + b),
    m.parameters.length,
  );
  close(new LongitudinalSpring({ stiffness: 0.3 }).speed, 2 * m.speed);
  close(new LongitudinalSpring({ mass: 0.48 }).speed, m.speed / 2);
  close(new LongitudinalSpring({ segments: 40 }).speed, m.speed);
  close(m.linkStiffness / m.parameters.segments, m.parameters.stiffness);
  close(m.nodeMass * m.parameters.segments, m.parameters.mass);
});

test('默认线径、圈径、圈数与质量和轴向刚度处于同一种软金属弹簧的量级', () => {
  const { parameters: p } = new LongitudinalSpring();
  const diameter = 2 * p.coilRadius;
  const wireLength = p.segments * Math.hypot(Math.PI * diameter, p.length / p.segments);
  const volume = (wireLength * Math.PI * p.wireDiameter ** 2) / 4;
  const inferredDensity = p.mass / volume;
  // Independent helical-spring estimate k = G*d^4/(8*D^3*N), not the wave solver.
  const inferredShearModulus = (p.stiffness * 8 * diameter ** 3 * p.segments) / p.wireDiameter ** 4;
  assert.ok(inferredDensity > 7000 && inferredDensity < 9000);
  assert.ok(inferredShearModulus > 70e9 && inferredShearModulus < 85e9);
});

test('实际推回产生先密后疏，近圈先动远圈后动；同一材料圈往复而不是跟着波走', () => {
  const m = new LongitudinalSpring({ beta: 0 }),
    arrivals = [null, null];
  let compressed = false,
    sparse = false;
  run(
    m,
    1.25,
    (t) => pulse(t),
    () => {
      [20, 50].forEach((j, k) => {
        if (arrivals[k] === null && m.q[j] > 0.005) arrivals[k] = m.time;
      });
      const gap = m.pitch + m.q[21] - m.q[20];
      compressed ||= gap < m.pitch * 0.9;
      sparse ||= gap > m.pitch * 1.1;
    },
  );
  assert.ok(arrivals.every((t) => t !== null));
  close(arrivals[1] - arrivals[0], (30 * m.pitch) / m.speed, 0.004);
  assert.ok(compressed && sparse);
  const point = m.observe().points[20];
  close(point.materialX, 20 * m.pitch);
  close(point.x, point.materialX + point.displacement);
  assert.ok(Math.abs(point.displacement) < 0.001);
  assert.ok(m.q[80] < 0.005, '波还未到远端，不能同时启动整根弹簧');
});

test('接触前推和拉互为反向位移；同一自由末端真实反射，位移不反相且应变反相', () => {
  const push = new LongitudinalSpring({ beta: 0 }),
    pull = new LongitudinalSpring({ beta: 0 });
  run(push, 1.1, (t) => pulse(t));
  run(pull, 1.1, (t) => -pulse(t));
  push.q.forEach((q, i) => close(q, -pull.q[i], 1e-10));
  let endMax = 0,
    returnedMax = 0,
    returnRarefaction = false;
  run(
    push,
    1.1,
    () => 0,
    () => {
      endMax = Math.max(endMax, push.q[80]);
      if (push.time > 1.75) {
        returnedMax = Math.max(returnedMax, push.q[50]);
        // Returning pulse's leading edge has positive strain (rarefaction).
        returnRarefaction ||= push.q[51] - push.q[50] > 0.001;
      }
    },
  );
  assert.ok(endMax > 0.055 && endMax < 0.065);
  assert.ok(returnedMax > 0.025 && returnRarefaction);
});

test('固定左端自由右端的离散本征频率符合独立解析解，不套横波张力公式', () => {
  const m = new LongitudinalSpring({ beta: 0 });
  const waveNumber = Math.PI / (2 * m.parameters.segments + 1);
  const omega = 2 * Math.sqrt(m.linkStiffness / m.nodeMass) * Math.sin(waveNumber / 2);
  for (let i = 1; i < m.q.length; i++) m.q[i] = 0.002 * Math.sin(waveNumber * i);
  const initial = [...m.q],
    energy = m.energy();
  m.advance(Math.PI / (2 * omega));
  m.q.forEach((q) => close(q, 0, 5e-8));
  m.v.forEach((v, i) => close(v, -omega * initial[i], 1e-8));
  close(m.energy(), energy, 1e-10);
});

test('相邻段轴向力等于势能负梯度，圈接触的弹性能也入账，末端没有隐形夹具', () => {
  const m = new LongitudinalSpring({ beta: 0 });
  m.q[31] = -(m.pitch - m.parameters.wireDiameter + 0.00004);
  const rates = m.rates(m.q, m.v, m._stages[0]);
  for (const i of [30, 31, 32, 80]) {
    const old = m.q[i],
      h = 1e-9;
    m.q[i] = old + h;
    const hi = m.energy();
    m.q[i] = old - h;
    const lo = m.energy();
    m.q[i] = old;
    close(rates.dv[i] * m.nodeMass, -(hi - lo) / (2 * h), 1e-6);
  }
  m.q[80] = 0.01;
  const r = m.rates(m.q, m.v, m._stages[0]);
  close(r.dv[80] * m.nodeMass, -m.linkStiffness * 0.01);
});

test('快速反复推拉和低频驱动不使各圈穿过，接触不会凭空销毁已有运动', () => {
  const m = new LongitudinalSpring();
  let minimum = Infinity,
    contact = false,
    maximumEnergy = 0;
  run(
    m,
    10,
    (t) => (t < 2 ? (Math.floor(t / 0.125) % 2 ? -0.08 : 0.08) : 0.08 * Math.sin(2 * Math.PI * 0.2 * t)),
    () => {
      // Compliant contact permits tiny elastic compression; no ordering inversion.
      const gaps = m.observe().gaps;
      minimum = Math.min(minimum, ...gaps);
      contact ||= gaps.some((gap) => gap < m.parameters.wireDiameter);
      maximumEnergy = Math.max(maximumEnergy, m.energy());
    },
  );
  assert.ok(contact, '必须实际覆盖圈接触，而不只是稀疏的小振幅');
  assert.ok(minimum > 0.9 * m.parameters.wireDiameter, `最小圈距 ${minimum}`);
  assert.ok(maximumEnergy > 0.001 && m.heat > 0);
  close(m.energy() + m.heat, m.handWork, 2e-5);
});

test('手做功转为机械能和连续阻尼热；独立积分阻尼功而非倒推能量误差', () => {
  const m = new LongitudinalSpring();
  let heat = 0,
    previousPower = 0;
  run(
    m,
    1.2,
    (t) => pulse(t),
    () => {
      const power = [...m.v].slice(1).reduce((sum, v) => sum + 2 * m.parameters.beta * m.nodeMass * v * v, 0);
      heat += (power + previousPower) * 0.0005;
      previousPower = power;
    },
  );
  close(m.heat, heat, 2e-8);
  close(m.energy() + m.heat, m.handWork, 1e-9);
  const before = m.energy();
  m.advance(0.1);
  assert.ok(m.energy() < before && m.energy() > 0);
});

test('拖动目标不瞬移任何圈；同时间不同显示帧长给出同一状态，回中不抹掉返波', () => {
  const a = new LongitudinalSpring(),
    b = new LongitudinalSpring();
  a.setHand(0.06);
  b.setHand(0.06);
  assert.ok(a.q.every((q) => q === 0));
  for (let i = 0; i < 12; i++) a.advance(1 / 60);
  for (let i = 0; i < 24; i++) b.advance(1 / 120);
  assert.deepEqual(a.q, b.q);
  assert.deepEqual(a.v, b.v);
  assert.ok(a.q[0] > 0.05 && Math.abs(a.q[60]) < 1e-12);
  a.setHand(0);
  assert.ok(a.energy() > 0 && a.q[0] > 0);
  a.reset();
  assert.equal(a.time, 0);
  assert.equal(a.heat, 0);
  assert.equal(a.handWork, 0);
  assert.ok(a.q.every((q) => q === 0) && a.v.every((v) => v === 0));
});

test('边界参数和非法输入拒绝；手的行程与速度有限', () => {
  for (const options of [
    { mass: 0 },
    { segments: 3 },
    { segments: 30.5 },
    { beta: -1 },
    { stiffness: NaN },
    { wireDiameter: 0.5 },
    { maxHandSpeed: 0 },
    { handResponse: 0 },
  ])
    assert.throws(() => new LongitudinalSpring(options), RangeError);
  const m = new LongitudinalSpring();
  assert.throws(() => m.setHand(Infinity), RangeError);
  assert.throws(() => m.advance(NaN), RangeError);
  assert.throws(() => m.advance(-1), RangeError);
  m.setHand(1);
  close(m.target, m.parameters.maxDisplacement);
  close(m.handVelocity(), m.parameters.maxHandSpeed);
  m.advance(0.01);
  assert.ok(m.q[0] <= m.parameters.maxHandSpeed * 0.01);
});
