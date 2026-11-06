import test from 'node:test';
import assert from 'node:assert/strict';
import { ACGenerator, generatorState, GENERATOR } from '../src/lessons/kit/acGenerator.js';
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const total = (m) => m.energy() + m.frictionHeat + m.coilHeat + m.resistorHeat + m.ledEnergy;
function crank(m, speed, duration) {
  const target = m.target;
  for (let i = 1; i <= Math.round(duration / 0.001); i++) {
    m.setHand(target + speed * i * 0.001);
    m.advance(0.001);
  }
}

test('感应电动势等于磁链对时间的负导数，磁通最大处电动势为零', () => {
  for (const theta of [0, 0.3, Math.PI / 2, Math.PI, 4.1])
    for (const omega of [-8, 0, 5]) {
      const h = 1e-6,
        next = generatorState(theta + omega * h, omega, false),
        prev = generatorState(theta - omega * h, omega, false);
      const s = generatorState(theta, omega, false);
      close(s.emf, -(next.linkage - prev.linkage) / (2 * h), 1e-8);
    }
  close(generatorState(0, 8, true).emf, 0);
  close(generatorState(Math.PI / 2, 8, true).emf, GENERATOR.turns * GENERATOR.field * GENERATOR.area * 8);
});

test('反向并联的两灯按电流方向交替导通，低于门槛不亮而非强制切换', () => {
  for (const theta of [0.5, 1, 2]) {
    const a = generatorState(theta, 6, true),
      b = generatorState(theta + Math.PI, 6, true);
    assert.ok(a.redCurrent > 0);
    assert.equal(a.yellowCurrent, 0);
    assert.ok(b.yellowCurrent > 0);
    assert.equal(b.redCurrent, 0);
  }
  const slow = generatorState(Math.PI / 2, 0.5, true);
  assert.ok(slow.emf > 0);
  assert.equal(slow.current, 0);
  const stationary = generatorState(1, 0, true);
  assert.equal(stationary.current, 0);
});

test('同一位置反向转动或反转磁场，改变导通的那只 LED', () => {
  const forward = generatorState(1, 6, true),
    reverse = generatorState(1, -6, true);
  assert.ok(forward.redCurrent > 0 && reverse.yellowCurrent > 0);
  close(forward.emf, -reverse.emf);
  const flipped = generatorState(1, 6, true, { field: -GENERATOR.field });
  close(flipped.emf, reverse.emf);
  close(flipped.current, reverse.current);
});

test('开路仍有感应电动势，但不发光且无负载反扭矩', () => {
  const open = generatorState(1, 6, false),
    closed = generatorState(1, 6, true);
  close(open.emf, closed.emf);
  assert.ok(open.emf > 0);
  assert.equal(open.current, 0);
  close(open.torque, 0);
  for (const speed of [-6, 6]) {
    const e = generatorState(1, speed, true);
    assert.ok(e.torque * speed < 0);
    close(-e.torque * speed, e.coilPower + e.resistorPower + e.ledPower);
  }
});

test('手摇完整一圈出现两种方向的电流，不需要自动转动或预置灯序', () => {
  const m = new ACGenerator();
  m.connect(true);
  const signs = [];
  for (let i = 1; i <= 1500; i++) {
    m.setHand((2 * Math.PI * i) / 1000);
    m.advance(0.001);
    const e = m.observe(),
      sign = e.redCurrent > 0.001 ? 1 : e.yellowCurrent > 0.001 ? -1 : 0;
    if (sign && sign !== signs.at(-1)) signs.push(sign);
  }
  assert.ok(m.theta > 2 * Math.PI);
  assert.deepEqual(signs.slice(0, 3), [1, -1, 1]);
  close(m.handWork, total(m), 2e-6);
});

test('释放握柄后保留转子惯性，接负载比开路更快减速，能量不凭空增加', () => {
  const loaded = new ACGenerator(),
    open = new ACGenerator();
  for (const m of [loaded, open]) {
    m.connect(true);
    crank(m, 6, 1);
    m.release();
  }
  open.connect(false);
  const start = loaded.omega,
    theta = loaded.theta;
  loaded.advance(0.01);
  open.advance(0.01);
  assert.ok(loaded.theta > theta && loaded.omega > 0 && loaded.omega < start);
  loaded.advance(0.09);
  open.advance(0.09);
  assert.ok(loaded.omega < open.omega);
  for (const m of [loaded, open]) close(m.handWork, total(m), 2e-6);
  loaded.advance(4);
  assert.ok(Math.abs(loaded.omega) < 0.001);
  close(loaded.handWork, total(loaded), 2e-6);
});

test('握柄停在一个位置时转子停下，固定步长不依赖画面帧率，重做清空能量', () => {
  const a = new ACGenerator(),
    b = new ACGenerator();
  for (const m of [a, b]) {
    m.connect(true);
    m.setHand(2);
  }
  for (let i = 0; i < 60; i++) a.advance(1 / 60);
  for (let i = 0; i < 100; i++) b.advance(0.01);
  close(a.theta, b.theta, 1e-12);
  close(a.omega, b.omega, 1e-12);
  close(a.theta, 2, 1e-6);
  assert.ok(Math.abs(a.omega) < 1e-5);
  close(a.observe().current, 0);
  close(a.handWork, total(a), 2e-6);
  a.reset();
  assert.equal(a.theta, 0);
  assert.equal(a.omega, 0);
  assert.equal(a.handWork, 0);
  assert.equal(total(a), 0);
  assert.equal(a.connected, false);
});

test('交换外接线只反转灯板极性，不改变原线圈磁链和电磁制动方向', () => {
  const normal = generatorState(1, 6, true),
    swapped = generatorState(1, 6, true, { polarity: -1 });
  close(normal.emf, swapped.emf);
  close(normal.linkage, swapped.linkage);
  assert.ok(normal.redCurrent > 0 && swapped.yellowCurrent > 0);
  assert.equal(swapped.redCurrent, 0);
  assert.ok(swapped.torque < 0);
  close(-swapped.torque * 6, swapped.coilPower + swapped.resistorPower + swapped.ledPower);
  const m = new ACGenerator();
  m.theta = 1;
  m.omega = 6;
  m.connect(true, -1);
  assert.ok(m.observe().yellowCurrent > 0);
  close(m.theta, 1);
  close(m.omega, 6);
});
