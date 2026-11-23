import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fresnel,
  slitIntensity,
  firstMinimum,
  farFieldWidth,
  SLIT_WAVELENGTH,
  SLIT_DISTANCE,
} from '../src/lessons/kit/singleSlit.js';
const close = (a, b, t) => assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
test('Fresnel标准值、奇对称与数值/渐近拼接', () => {
  const [c, s] = fresnel(1);
  close(c, 0.7798934003768228, 1e-8);
  close(s, 0.4382591473903548, 1e-8);
  for (const x of [0.12, 2.68, 12, 40]) {
    const a = fresnel(x),
      b = fresnel(-x);
    close(a[0], -b[0], 1e-12);
    close(a[1], -b[1], 1e-12);
  }
  const a = fresnel(12 - 1e-8),
    b = fresnel(12 + 1e-8);
  close(a[0], b[0], 1e-6);
  close(a[1], b[1], 1e-6);
});
test('窄缝远场中央亮纹展宽、峰强下降，使用同一照度而非逐幅归一化', () => {
  const a = 0.2e-3,
    b = 0.1e-3;
  close(firstMinimum(a) * 2, farFieldWidth(a), farFieldWidth(a) * 0.01);
  close(firstMinimum(b) / firstMinimum(a), 2, 0.02);
  assert.ok(slitIntensity(0, b) < slitIntensity(0, a) * 0.28);
  close(slitIntensity(0, b), (b * b) / (SLIT_WAVELENGTH * SLIT_DISTANCE), 0.00002);
});
test('宽缝保留几何亮区和边缘衍射，不把宽缝硬套远场sinc', () => {
  const a = 0.003;
  assert.ok(slitIntensity(0.0008, a) > 0.65);
  assert.ok(slitIntensity(0.006, a) < 0.002);
  const edge = slitIntensity(a / 2, a);
  assert.ok(edge > 0.18 && edge < 0.33);
});
test('跨屏积分通量近似缝宽，变窄减少透光；左右场对称', () => {
  for (const width of [0.0001, 0.0002, 0.0016]) {
    const n = 40000,
      dx = 0.12 / n;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += slitIntensity(-0.06 + (i + 0.5) * dx, width) * dx;
    close(sum, width, width * 0.01);
    for (const x of [0, 0.0002, 0.003, 0.012]) close(slitIntensity(x, width), slitIntensity(-x, width), 1e-12);
  }
});
test('闭缝为暗场，有限输入边界', () => {
  assert.equal(slitIntensity(0.01, 0), 0);
  assert.throws(() => slitIntensity(0, -1));
  assert.throws(() => slitIntensity(0, 0.001, 0));
  assert.throws(() => fresnel(NaN));
});
