import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CapillaryTube,
  CAPILLARY_SPECS,
  CAPILLARY_WATER,
  capillaryHeight,
  meniscusMean,
  meniscusProfile,
} from '../src/lessons/kit/capillary.js';
const close = (a, b, t = 1e-8) => assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
test('毛细升降由接触角决定，同材料高度与内半径成反比', () => {
  for (const offset of [0, 3]) {
    const h = CAPILLARY_SPECS.slice(offset, offset + 3).map((s) => capillaryHeight(s.radius, s.angle));
    close(h[0] / h[1], 2);
    close(h[0] / h[2], 3);
    assert.ok(offset ? h.every((v) => v < 0) : h.every((v) => v > 0));
  }
  close(capillaryHeight(0.001, Math.PI / 2), 0);
});
test('逐步插入后连续进水，稳定高度不依赖浸入深度，有限开口不凭空出现水柱', () => {
  for (const spec of CAPILLARY_SPECS) {
    const a = new CapillaryTube(spec),
      b = new CapillaryTube(spec);
    a.advance(1);
    assert.equal(a.filled, 0);
    a.setBottom(0.012);
    const old = a.filled;
    a.advance(0.001);
    assert.ok(a.filled > old && a.filled < a.equilibrium);
    a.advance(4);
    b.setBottom(0.025);
    b.advance(4);
    close(a.bottom + a.filled, b.bottom + b.filled, 0.00001);
    assert.ok(a.settled && b.settled);
  }
});
test('塑料浅浸时入口压力不足保持干燥，浸深后液面低于外水面', () => {
  const t = new CapillaryTube(CAPILLARY_SPECS[3]);
  t.setBottom(0.044);
  t.advance(2);
  assert.equal(t.filled, 0);
  t.setBottom(0.02);
  t.advance(2);
  assert.ok(t.center < 0.045 && t.center > 0.02);
});
test('拔出保留原残液，超过下口钉扎承载上限才连续排出，重新插入可恢复', () => {
  const t = new CapillaryTube(CAPILLARY_SPECS[0]);
  t.setBottom(0.012);
  t.advance(4);
  const old = t.filled;
  t.setBottom(0.09);
  assert.equal(t.filled, old);
  t.advance(1);
  assert.ok(t.filled > 0 && t.filled <= old);
  t.setBottom(0.02);
  t.advance(4);
  assert.ok(t.settled);
  const deep = new CapillaryTube(CAPILLARY_SPECS[2]);
  deep.setBottom(-0.05);
  deep.advance(2);
  const filled = deep.filled;
  deep.setBottom(0.1);
  deep.advance(0.001);
  assert.ok(deep.filled < filled && deep.filled > deep.retention);
  deep.advance(3);
  close(deep.filled, deep.retention, 0.00001);
});
test('凹凸弯月面与体积平均高度一致，径向放大不改写竖直读数', () => {
  for (const s of CAPILLARY_SPECS) {
    let area = 0;
    for (let i = 0; i < 20000; i++) {
      const f = (i + 0.5) / 20000;
      area += (meniscusProfile(s.radius, s.angle, f) * 2 * f) / 20000;
    }
    close(area, meniscusMean(s.radius, s.angle), 1e-9);
    const t = new CapillaryTube(s);
    t.setBottom(0.012);
    t.advance(3);
    close(t.center + meniscusMean(s.radius, s.angle), 0.045 + capillaryHeight(s.radius, s.angle), 0.00001);
  }
});
test('24/60/120帧结果一致，短管满管边界和非法输入可检查', () => {
  const values = [24, 60, 120].map((fps) => {
    const t = new CapillaryTube(CAPILLARY_SPECS[0]);
    t.setBottom(0.012);
    for (let i = 0; i < fps; i++) t.advance(1 / fps);
    return t.filled;
  });
  close(values[0], values[1], 0.000001);
  close(values[1], values[2], 0.000001);
  const t = new CapillaryTube(CAPILLARY_SPECS[0], { length: 0.02, bottom: 0.012 });
  t.advance(2);
  assert.equal(t.filled, 0.02);
  assert.ok(t.overflow);
  assert.throws(() => t.advance(-1));
  assert.throws(() => t.setBottom(NaN));
  t.reset();
  assert.equal(t.filled, 0);
});
