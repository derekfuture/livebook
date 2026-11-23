import test from 'node:test';
import assert from 'node:assert/strict';
import { GLASS_INDEX, SLAB_THICKNESS, tracePins, sightPin, indexFromPins, headSpan, hides } from '../src/lessons/kit/glassSlab.js';
test('从眼位追迹和从入射针顺向追迹相符，四个实际针孔独立还原折射率', () => {
  for (const sign of [-1, 1]) {
    const a = { x: -sign * 0.058, z: -0.15 },
      b = { x: -sign * 0.016, z: -0.08 };
    const path = tracePins(a, b),
      project = (z) => ({ x: path.exit + (z - SLAB_THICKNESS / 2) * path.slope, z });
    const eye = project(0.21),
      c = project(0.072),
      d = project(0.13);
    for (const pin of [a, b]) {
      const sight = sightPin(pin, eye);
      assert.ok(Math.abs(sight.slope - path.slope) < 1e-10);
      assert.ok(Math.abs(sight.exit - path.exit) < 1e-10);
    }
    assert.ok(Math.abs(indexFromPins(a, b, c, d).index - GLASS_INDEX) < 1e-10);
    assert.ok(Math.abs(indexFromPins(a, b, c, { ...d, x: d.x + 0.002 }).index - GLASS_INDEX) > 0.005);
  }
});
test('正入射不提供折射率比值，射线超出侧边时不能当成穿过两条长边', () => {
  const a = { x: 0, z: -0.14 },
    b = { x: 0, z: -0.07 },
    c = { x: 0, z: 0.07 },
    d = { x: 0, z: 0.13 };
  assert.equal(tracePins(a, b).slope, 0);
  assert.equal(indexFromPins(a, b, c, d), null);
  assert.equal(tracePins({ ...a, x: 0.2 }, { ...b, x: 0.2 }), null);
  assert.equal(sightPin({ ...a, x: 0.2 }, { x: 0.2, z: 0.2 }), null);
});

test('对齐时 B 针遮住 A，横移眼位后两针分离', () => {
  const a = { x: -0.053, z: -0.14 }, b = { x: -0.023, z: -0.08 };
  const path = tracePins(a, b);
  const eye = { x: path.exit + (0.22 - SLAB_THICKNESS / 2) * path.slope, z: 0.22 };
  for (const dx of [0, -0.018, 0.018]) {
    const observer = { ...eye, x: eye.x + dx };
    assert.equal(hides(headSpan(b, observer, 0.0021, true), headSpan(a, observer, 0.0021, true)), dx === 0);
  }
});
