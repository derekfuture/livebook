import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceWinding, windingEdges, WIRE_MM } from '../src/lessons/kit/wireWinding.js';

test('同一根丝紧密绕 16 圈宽 10 mm；每圈留缝只增加 15 个圈间距', () => {
  const parts = [];
  advanceWinding(parts, 16, WIRE_MM);
  const tight = windingEdges(parts);
  assert.equal(tight.count, 16);
  assert.equal(tight.right - tight.left, 10);
  advanceWinding(parts, -16, WIRE_MM);
  advanceWinding(parts, 16, WIRE_MM + 0.4);
  assert.ok(Math.abs(windingEdges(parts).gap - 15 * 0.4) < 1e-10);
});

test('倒转再紧绕只改变退过的那一段，半圈不能算成整圈', () => {
  const parts = [];
  advanceWinding(parts, 6, WIRE_MM);
  advanceWinding(parts, 3.5, WIRE_MM + 0.5);
  assert.equal(windingEdges(parts), null);
  advanceWinding(parts, -3.5, WIRE_MM);
  advanceWinding(parts, 10, WIRE_MM);
  assert.equal(windingEdges(parts).gap, 0);
});

test('即使只有一个明显的圈间空隙也不能当成紧绕', () => {
  const parts = [];
  advanceWinding(parts, 10, WIRE_MM);
  advanceWinding(parts, 1, WIRE_MM + 1);
  advanceWinding(parts, 20, WIRE_MM);
  const e = windingEdges(parts);
  assert.ok(e.gap / e.count < 0.04);
  assert.ok(e.widestGap > 0.7);
});
