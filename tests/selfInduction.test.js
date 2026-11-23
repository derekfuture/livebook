import assert from 'node:assert/strict';
import test from 'node:test';
import { SelfInductionCircuit } from '../src/lessons/kit/selfInduction.js';

const close = (a, b, eps = 1e-10) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('通电先等亮再调正常亮度；重接时电感支路延迟，稳态恢复相同电流', () => {
  const c = new SelfInductionCircuit({ balanceResistance: 100, sourceResistance: 50 });
  c.switch(true);
  c.advance(2);
  assert.ok(c.observe().lampPowers[0] > c.observe().lampPowers[1]);
  c.balanceResistance = c.coilResistance;
  c.advance(2);
  close(c.observe().lampPowers[0], c.observe().lampPowers[1]);
  c.sourceResistance = 25;
  c.advance(2);
  c.observe().lampPowers.forEach((p) => close(p, 0.16));
  c.switch(false);
  c.advance(2);
  c.switch(true);
  close(c.current, 0);
  assert.ok(c.observe().otherCurrent > 0.04);
  assert.ok(c.observe().inducedEmf < 0);
  c.advance(0.02);
  assert.ok(c.lampResponse[0] < c.lampResponse[1]);
  c.advance(2);
  c.observe().lampCurrents.forEach((i) => close(i, 0.04));
});

test('通电实验断电后两灯串在原回路，电感电流连续，另一支路反向且等大', () => {
  const c = new SelfInductionCircuit();
  c.switch(true);
  c.advance(1);
  const i = c.current,
    response = [...c.lampResponse];
  c.switch(false);
  close(c.current, i);
  assert.deepEqual(c.lampResponse, response);
  const s = c.observe();
  close(s.sourceCurrent, 0);
  close(s.lampCurrents[0], -s.lampCurrents[1]);
  assert.ok(s.inducedEmf > 0);
  c.advance(0.01);
  assert.ok(c.current > 0 && c.current < i);
  close(...c.observe().lampPowers);
});

test('断电灯泡反向；低阻线圈且充分通电才可能闪亮，不能一断电就播放闪光', () => {
  for (const [coilResistance, duration, flashes] of [
    [50, 2, true],
    [150, 2, false],
    [50, 0.001, false],
  ]) {
    const c = new SelfInductionCircuit({ kind: 'turnOff', coilResistance });
    c.switch(true);
    c.advance(duration);
    const before = c.observe();
    c.switch(false);
    const after = c.observe();
    close(before.coilCurrent, after.coilCurrent);
    assert.ok(before.otherCurrent > 0 && after.otherCurrent < 0);
    assert.equal(after.lampPowers[0] > before.lampPowers[0], flashes);
    if (duration === 2) {
      const light = c.lampResponse[0];
      c.advance(0.015);
      assert.equal(c.lampResponse[0] > light, flashes);
    }
  }
});

test('每种拓扑开合时均满足节点电流、回路电压和瞬时能量守恒', () => {
  for (const kind of ['turnOn', 'turnOff']) {
    const c = new SelfInductionCircuit({ kind });
    for (const closed of [true, false, true]) {
      c.switch(closed);
      for (let n = 0; n < 20; n++) {
        const s = c.advance(0.007);
        close(s.sourceCurrent, s.coilCurrent + s.otherCurrent);
        const resistance = c.coilResistance + (kind === 'turnOn' ? c.lampResistance : 0);
        close(s.busVoltage, resistance * s.coilCurrent + c.inductance * s.derivative);
        close(c.voltage * s.sourceCurrent, s.dissipation + c.inductance * s.coilCurrent * s.derivative);
      }
    }
  }
});

test('电流和发光惯性在不同帧率下相同，快速重合闸保留已有磁能', () => {
  const run = (fps) => {
    const c = new SelfInductionCircuit();
    for (const closed of [true, false, true]) {
      c.switch(closed);
      for (let n = 0; n < fps; n++) c.advance(0.1 / fps);
    }
    return c;
  };
  const a = run(15),
    b = run(120);
  close(a.current, b.current);
  a.lampResponse.forEach((x, i) => close(x, b.lampResponse[i]));
  assert.ok(a.current > 0);
  const i = a.current;
  a.switch(false);
  a.advance(0.001);
  const remaining = a.current;
  assert.ok(remaining > 0 && remaining < i);
  a.switch(true);
  close(a.current, remaining);
});

test('发光响应的指数同率极限仍为有限正值，重置清除磁能和余热', () => {
  for (const responseTime of [8 / (150 + (25 * 150) / 175), 4 / (150 + (25 * 150) / 175)]) {
    const c = new SelfInductionCircuit({ responseTime });
    c.switch(true);
    c.advance(0.1);
    c.lampResponse.forEach((x) => assert.ok(Number.isFinite(x) && x > 0));
    c.reset();
    close(c.current, 0);
    assert.deepEqual(c.lampResponse, [0, 0]);
  }
});

test('拆下无储能线圈后灯支路仍可导通，禁止凭空删掉带电线圈的磁能', () => {
  const c = new SelfInductionCircuit({ kind: 'turnOff' });
  assert.equal(c.setCoilConnected(false), true);
  c.switch(true);
  c.advance(1);
  close(c.current, 0);
  close(c.observe().otherCurrent, 4 / 102);
  close(c.observe().sourceCurrent, 4 / 102);
  close(c.observe().inducedEmf, 0);
  c.setCoilConnected(true);
  c.advance(1);
  const energy = c.observe().energy;
  assert.equal(c.setCoilConnected(false), false);
  close(c.observe().energy, energy);
  c.switch(false);
  c.advance(2);
  assert.equal(c.setCoilConnected(false), true);
  close(c.observe().energy, 0);
});
