import test from 'node:test';
import assert from 'node:assert/strict';
import {
  THIN_FILM,
  filmReflectance,
  filmThickness,
  flameShape,
  reflectedFlame,
  ThinFilmInterference,
} from '../src/lessons/kit/thinFilmInterference.js';
const close = (a, b, t = 1e-10) => assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
test('单次相位反转：零厚度与半波厚度暗，四分之一波厚度亮', () => {
  const { wavelength: l, index: n } = THIN_FILM;
  close(filmReflectance(0), 0);
  close(filmReflectance(l / (2 * n)), 0);
  const r = ((n - 1) / (n + 1)) ** 2;
  close(filmReflectance(l / (4 * n)), (4 * r) / (1 + r) ** 2);
});
test('斜入射使用膜内角，反射率保持物理边界', () => {
  for (const c of [0.01, 0.25, 0.6, 1])
    for (const h of [0, 50e-9, 0.2e-6, 1e-6, 2e-6]) {
      const R = filmReflectance(h, c);
      assert.ok(R >= 0 && R <= 1);
    }
  const c = 0.6,
    n = THIN_FILM.index,
    ct = Math.sqrt(1 - (1 - c * c) / n ** 2);
  close(filmReflectance(THIN_FILM.wavelength / (2 * n * ct), c), 0);
});
test('光色、位置和排液改变光程，不是预置条纹图', () => {
  assert.ok(filmThickness(-0.045, 0) > filmThickness(0.045, 0));
  assert.ok(filmThickness(0, 10) < filmThickness(0, 0));
  assert.notEqual(filmReflectance(filmThickness(0, 0)), filmReflectance(filmThickness(0, 10)));
  assert.notEqual(filmReflectance(0.3e-6, 1, 589.3e-9), filmReflectance(0.3e-6, 1, 650e-9));
});
test('原环完整蘸入再提出才成膜，浅蘸无膜、重蘸才更新厚度', () => {
  const m = new ThinFilmInterference();
  m.setHeight(0.15);
  m.setHeight(0.245);
  assert.equal(m.film, false);
  m.setHeight(0.065);
  m.setHeight(0.245);
  assert.equal(m.film, true);
  m.advance(10);
  m.setHeight(0.2);
  close(m.age, 10);
  m.setHeight(0.065);
  assert.equal(m.film, false);
  m.setHeight(0.245);
  close(m.age, 0);
  assert.equal(m.draws, 2);
});
test('名义排液质量去向守恒，帧率一致，完全重做清除状态', () => {
  const a = new ThinFilmInterference(),
    b = new ThinFilmInterference();
  for (const m of [a, b]) {
    m.setHeight(0.065);
    m.setHeight(0.245);
  }
  const volume = a.volume;
  for (let k = 0; k < 600; k++) a.advance(1 / 60);
  b.advance(10);
  close(a.volume, b.volume);
  close(a.volume + a.drained, volume);
  assert.ok(a.drained > 0);
  a.reset();
  assert.equal(a.wet, false);
  assert.equal(a.film, false);
  assert.equal(a.lit, false);
});
test('反射像依视线与有限膜边界，背后及错位不出现灯焰像', () => {
  const shape = flameShape(0),
    point = [-0.08, 0.245, 0],
    eye = [-0.24, 0.253, 0.288];
  assert.ok(reflectedFlame(point, eye, shape));
  assert.equal(reflectedFlame(point, [-0.24, 0.253, -0.288], shape), false);
  assert.equal(reflectedFlame([0.1, 0.245, 0], eye, shape), false);
  assert.equal(reflectedFlame(point, [0.4, 0.25, 0.3], shape), false);
});
