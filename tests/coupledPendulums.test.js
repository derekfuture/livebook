import test from 'node:test';
import assert from 'node:assert/strict';
import { CoupledPendulums, RESONANCE_PENDULUMS } from '../src/lessons/kit/coupledPendulums.js';
const close = (a, b, e = 1e-8) => assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);
const start = (options, angle = 0.18) => {
  const m = new CoupledPendulums(options);
  m.hold(3);
  m.moveHeld(angle);
  m.release();
  return m;
};
function peaks(m, delay = 8, duration = 5) {
  m.advance(delay);
  const a = Array(7).fill(0);
  for (let t = 0; t < duration * 1000; t++) {
    const s = m.advance(0.001);
    s.bobs.forEach((b, i) => (a[i] = Math.max(a[i], Math.abs(b.horizontal - s.x))));
  }
  return a;
}
test('静止平衡不会自发振动；固定横梁后 D 无法带动其他摆', () => {
  const rest = new CoupledPendulums();
  rest.advance(3);
  assert.ok(rest.state.every((x) => x === 0));
  const fixed = start({ fixedBeam: true });
  fixed.advance(12);
  fixed.observe().bobs.forEach((b, i) => {
    if (i !== 3) {
      close(b.angle, 0);
      close(b.omega, 0);
    }
  });
  assert.ok(Math.abs(fixed.observe().bobs[3].angle) > 0.001);
});
test('重摆释放后经横梁传能：同长 A/G 响应较大，长短差较多的 C/E 较小', () => {
  const m = start(),
    a = peaks(m);
  close(a[0], a[6]);
  assert.ok(a[0] > 0.03);
  for (const i of [1, 2, 4, 5]) assert.ok(a[0] > a[i] * 2);
  assert.ok(a[2] < a[1] && a[2] < a[5]);
  assert.ok(a[4] < a[1] && a[4] < a[5]);
  const b = m.observe().bobs;
  close(b[0].naturalFrequency, b[3].naturalFrequency);
  close(b[0].naturalFrequency, b[6].naturalFrequency);
  assert.ok(m.pendulums[3].mass > m.pendulums[0].mass * 20);
});
test('含阻尼的总机械能与热量守恒，D 不是永不衰减的预设驱动', () => {
  const m = start(),
    initial = m.observe().energy;
  m.advance(35);
  close(m.observe().energy + m.heat, initial, 1e-9);
  assert.ok(m.heat > initial * 0.3);
  assert.ok(m.observe().energy < initial * 0.7);
});
test('去掉阻尼后完整几何方程保持能量，不凭空给小摆添加能量', () => {
  const m = start({ damping: 0, pendulums: RESONANCE_PENDULUMS.map((p) => ({ ...p, beta: 0 })) });
  const initial = m.observe().energy;
  m.advance(25);
  close(m.observe().energy, initial, 1e-9);
  close(m.heat, 0);
});
test('改变释放方向使所有位移反向，幅值和能量不变', () => {
  const a = start(),
    b = start(undefined, -0.18);
  a.advance(12);
  b.advance(12);
  a.state.forEach((v, i) => close(v, -b.state[i], 1e-10));
  close(a.heat, b.heat, 1e-12);
});
test('重新握住和拖动时记录手的功，其余摆不会被重置', () => {
  const m = start();
  m.advance(8);
  const other = m.state.slice(2, 8),
    before = m.observe().energy;
  m.hold(3);
  m.moveHeld(-0.12);
  assert.deepEqual(m.state.slice(2, 8), other);
  assert.notEqual(m.observe().energy, before);
  m.advance(2);
  m.release();
  m.advance(5);
  close(m.handWork, m.observe().energy + m.heat, 1e-9);
  m.reset();
  assert.equal(m.handWork, 0);
  assert.equal(m.held, null);
  assert.ok(m.state.every((v) => v === 0));
});
test('置换摆的顺序仍得到相同物理解，频率响应不靠 A/G 名称硬编码', () => {
  const a = start(),
    order = [3, 6, 1, 5, 0, 2, 4],
    b = new CoupledPendulums({ pendulums: order.map((i) => RESONANCE_PENDULUMS[i]) });
  b.hold(0);
  b.moveHeld(0.18);
  b.release();
  a.advance(10);
  b.advance(10);
  order.forEach((original, i) => {
    close(a.state[2 + 2 * original], b.state[2 + 2 * i]);
    close(a.state[3 + 2 * original], b.state[3 + 2 * i]);
  });
});
test('不同帧长不改变运动或耗散', () => {
  const a = start(),
    b = start();
  for (let i = 0; i < 600; i++) a.advance(1 / 60);
  for (let i = 0; i < 250; i++) b.advance(0.04);
  assert.deepEqual(a.state, b.state);
  assert.equal(a.heat, b.heat);
});
