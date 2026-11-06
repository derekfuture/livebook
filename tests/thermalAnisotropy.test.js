import test from 'node:test';
import assert from 'node:assert/strict';
import { ThermalAnisotropy, meltFraction } from '../src/lessons/kit/thermalAnisotropy.js';
const near = (a, b, e = 1e-7) => assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);
test('加热须有真实背面接触，断电仍保留烙铁和薄片余热', () => {
  const m = new ThermalAnisotropy();
  m.setPower(true);
  m.advance(6);
  assert.ok(m.iron > 180);
  assert.ok(m.plates.every((s) => s.T.every((t) => t === 20)));
  m.setContact(0);
  m.advance(10);
  assert.ok(m.shape(0).count > 20);
  const old = m.iron;
  m.setPower(false);
  near(m.iron, old);
  m.advance(0.1);
  assert.ok(m.iron < old);
  assert.ok(m.shape(0).count > 0);
});
test('圆斑和椭圆斑来自各向热流与熔化阈值，不是预设轮廓', () => {
  const shapes = [];
  for (const i of [0, 1]) {
    const m = new ThermalAnisotropy();
    m.setPower(true);
    m.advance(5);
    m.setContact(i);
    m.advance(15);
    shapes.push(m.shape(i));
  }
  near(shapes[0].ratio, 1, 1e-8);
  assert.ok(shapes[1].ratio > 1.2);
  assert.ok(shapes.every((s) => s.count > 25));
});
test('电源功减散热等于烙铁和材料显潜热总增量', () => {
  const m = new ThermalAnisotropy();
  m.setPower(true);
  m.advance(4);
  m.setContact(0);
  m.advance(8);
  m.setContact(1, 0.006, 0);
  m.advance(8);
  m.setPower(false);
  m.setContact(null);
  m.advance(5);
  near(m.work - m.loss, m.energy, 2e-8);
  assert.ok(m.plates.every((s) => s.T.every((t) => t >= 20 - 1e-9 && t < 300)));
});
test('移开后自然冷却凝固；移热点保留原温度场', () => {
  const m = new ThermalAnisotropy();
  m.setPower(true);
  m.advance(5);
  m.setContact(1);
  m.advance(12);
  const before = m.plates[1].E.slice();
  m.setContact(1, 0.015, 0);
  assert.deepEqual(m.plates[1].E, before);
  m.advance(8);
  assert.ok(m.shape(1).x > 0);
  m.setContact(null);
  m.setPower(false);
  m.advance(35);
  assert.equal(m.shape(1).count, 0);
});
test('不同帧率和网格下保持同一物理趋势', () => {
  function run(n, fps) {
    const m = new ThermalAnisotropy({ n });
    m.setPower(true);
    for (let j = 0; j < fps * 15; j++) {
      if (j === fps * 4) m.setContact(1);
      m.advance(1 / fps);
    }
    return m;
  }
  const a = run(49, 24),
    b = run(65, 60);
  assert.ok(a.shape(1).ratio > 1.2 && b.shape(1).ratio > 1.2);
  near(a.shape(1).ratio, b.shape(1).ratio, 0.15);
  near(a.iron, b.iron, 0.5);
});
test('石蜡熔化区间、非法输入与重做', () => {
  near(meltFraction(54), 0);
  near(meltFraction(56), 0.5);
  near(meltFraction(58), 1);
  const m = new ThermalAnisotropy();
  assert.throws(() => m.advance(-1));
  assert.throws(() => m.setContact(2));
  assert.throws(() => m.setContact(0, 1, 0));
  assert.throws(() => new ThermalAnisotropy({ n: 3 }));
  m.setPower(true);
  m.advance(1);
  m.reset();
  near(m.energy, 0);
  assert.equal(m.on, false);
  assert.equal(m.contact, null);
});
