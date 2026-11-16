import test from 'node:test';
import assert from 'node:assert/strict';
import { stripeIntensity, measuredWavelength, FILTER_WAVELENGTH, SLIT_SEPARATIONS } from '../src/lessons/kit/doubleSlit.js';

test('红蓝滤光片、两种双缝均产生左右对称条纹，缝宽限制外侧亮度', () => {
  const length = 0.72;
  for (const wavelength of Object.values(FILTER_WAVELENGTH)) {
    for (const d of SLIT_SEPARATIONS) {
      const spacing = (length * wavelength) / d;
      const intensity = (x) => stripeIntensity(x, length, d, wavelength);
      assert.equal(intensity(0), 1);
      assert.ok(intensity(spacing / 2) < 1e-8);
      assert.ok(intensity(2 * spacing) < intensity(spacing));
      assert.ok(intensity(spacing) > 0.75);
      assert.ok(Math.abs(intensity(1.24 * spacing) - intensity(-1.24 * spacing)) < 1e-12);
    }
  }
});

test('跨五条红色亮纹是四个间隔，向任一方向移动都可测量', () => {
  for (const [a, b] of [[-0.0013, 0.0039], [0.0039, -0.0013]]) {
    assert.ok(Math.abs(measuredWavelength(a, b, 5, 0.72, 0.00036) - 650e-9) < 1e-15);
  }
  assert.equal(measuredWavelength(0, 0, 5, 0.72, 0.00036), null);
  assert.equal(measuredWavelength(0, 0.0013, 1, 0.72, 0.00036), null);
});
