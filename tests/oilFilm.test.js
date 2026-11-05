import assert from 'node:assert/strict';
import test from 'node:test';
import {
  pureOilPerDrop,
  molecularSizeNm,
  filmOutline,
  polygonArea,
  countFilmSquares,
  GRID,
} from '../src/lessons/kit/oilFilm.js';
test('同一管的读数差除以滴数，再用溶液体积分数折算纯油酸', () => {
  const v = pureOilPerDrop(0.56, 0.2, 20);
  assert.ok(Math.abs(v - 0.000036) < 1e-15);
  assert.equal(pureOilPerDrop(0.2, 0.56, 20), null);
  assert.equal(pureOilPerDrop(0.56, 0.2, 0), null);
  assert.equal(molecularSizeNm(v, 0), null);
});
test('模型单层按油酸体积守恒，不同轮廓和落点按方格估测分子尺度', () => {
  const v = 0.018 / 500;
  for (const phase of [-1, 0, 1]) {
    const p = filmOutline(0.003, -0.008, v, phase),
      n = countFilmSquares(p);
    assert.ok(Math.abs(polygonArea(p) * 2e-9 - v * 1e-6) < 1e-19);
    assert.ok(Math.abs(molecularSizeNm(v, n) - 2) < 0.08);
    assert.equal(countFilmSquares([...p].reverse()), n);
  }
});
test('不足半格舍去、超过半格算一；描线后估算的格数与解析面积可以不同', () => {
  const rectangle = (width) => [
    { x: 0, z: 0 },
    { x: width, z: 0 },
    { x: width, z: GRID },
    { x: 0, z: GRID },
  ];
  assert.equal(countFilmSquares(rectangle(GRID * 2.4)), 2);
  assert.equal(countFilmSquares(rectangle(GRID * 2.6)), 3);
});
