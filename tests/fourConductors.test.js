import test from 'node:test';
import assert from 'node:assert/strict';
import { Group } from 'three';
// Circuit's rendering module reads the URL style, even though these tests only solve nodes.
globalThis.location = { search: '' };
const { Circuit } = await import('../src/lessons/kit/circuit.js');
import {
  FOUR_SAMPLES,
  FOUR_SOURCE,
  FOUR_RMAX,
  FOUR_METER_OHMS,
  FOUR_WIRING,
  sampleResistance,
  sampleContact,
} from '../src/lessons/kit/fourConductors.js';
const near = (x, y, t = 2e-5) => assert.ok(Math.abs(x - y) < t, `${x} != ${y}`);
// Use the same nodal Circuit solver and branch definitions as the visible bench.
function bench(pos = 0.5) {
  const c = new Circuit();
  function add(name, terminals, branches, extra = {}) {
    return c.add({
      name,
      group: new Group(),
      terminals: Object.fromEntries(terminals.map((t) => [t, [0, 0, 0]])),
      branches,
      ...extra,
    });
  }
  add('E', ['-', '+'], () => [
    { a: '-', b: '+', R: FOUR_SOURCE.cells * FOUR_SOURCE.r, E: FOUR_SOURCE.cells * FOUR_SOURCE.emf },
  ]);
  const sw = add(
    'S',
    ['a', 'b'],
    function () {
      return [{ a: 'a', b: 'b', R: this.closed ? 1e-4 : Infinity }];
    },
    { closed: true },
  );
  const p = add(
    'P',
    ['A', 'B', 'C', 'D', 'P'],
    function () {
      return [
        { a: 'A', b: 'P', R: Math.max(1e-3, this.pos * FOUR_RMAX) },
        { a: 'P', b: 'B', R: Math.max(1e-3, (1 - this.pos) * FOUR_RMAX) },
      ];
    },
    {
      pos,
      shorted: [
        ['C', 'P'],
        ['D', 'P'],
      ],
    },
  );
  for (const s of FOUR_SAMPLES) add(s.id, ['a', 'b'], () => [{ a: 'a', b: 'b', R: sampleResistance(s) }]);
  add('M', ['red', 'black'], () => [{ a: 'red', b: 'black', R: FOUR_METER_OHMS }]);
  for (const [a, b] of FOUR_WIRING) c.wire(a, b);
  function probe(red, black) {
    c.wires = c.wires.filter((w) => !w.a.startsWith('M.'));
    if (red) c.wire('M.red', red);
    if (black) c.wire('M.black', black);
    c.solve();
    return c.voltage('M.red', 'M.black');
  }
  return { c, sw, p, probe };
}
test('b/c/d 分别只改变长度、横截面积、材料，直径不能误作面积', () => {
  const [a, b, c, d] = FOUR_SAMPLES;
  assert.equal(b.length / a.length, 2);
  assert.equal(b.area, a.area);
  assert.equal(b.rho, a.rho);
  assert.equal(c.length, a.length);
  assert.equal(c.area / a.area, 2);
  assert.equal(c.rho, a.rho);
  assert.equal(d.length, a.length);
  assert.equal(d.area, a.area);
  assert.notEqual(d.rho, a.rho);
  near(Math.sqrt(c.area / a.area), Math.SQRT2, 1e-12);
  near(sampleResistance(b) / sampleResistance(a), 2);
  near(sampleResistance(c) / sampleResistance(a), 0.5);
  near(sampleResistance(d) / sampleResistance(a), 0.44);
  assert.throws(() => sampleResistance({ ...a, area: 0 }), RangeError);
});
test('有限电压表跨接的实际解符合分流公式，换三档电流而比值近似不变', () => {
  const total = FOUR_SAMPLES.reduce((sum, s) => sum + sampleResistance(s), 0);
  for (const pos of [0, 0.45, 1]) {
    const { c, probe } = bench(pos),
      v = [];
    for (const s of FOUR_SAMPLES) {
      const R = sampleResistance(s),
        parallel = (R * FOUR_METER_OHMS) / (R + FOUR_METER_OHMS),
        rest = total - R + FOUR_SOURCE.cells * FOUR_SOURCE.r + Math.max(1e-3, pos * FOUR_RMAX) + 9e-4;
      const measured = probe(s.id + '.a', s.id + '.b');
      near(measured, (3 * parallel) / (rest + parallel));
      // Meter diverts a small, nonzero current; loaded conductor is not strictly equal to its neighbour.
      near(c.current('M'), measured / FOUR_METER_OHMS, 1e-10);
      v.push(measured);
    }
    near(v[1] / v[0], 2, 6e-5);
    near(v[2] / v[0], 0.5, 1e-5);
    near(v[3] / v[0], 0.44, 1e-5);
    assert.ok(v.every((x) => x > 0.1 && x < 1.6));
  }
});
test('反接显示负值，同点为零，跨多段为实际总压，不当作单段证据', () => {
  const { probe, c } = bench();
  const v = probe('a.a', 'a.b');
  near(probe('a.b', 'a.a'), -v);
  near(probe('a.a', 'a.a'), 0, 1e-7);
  const span = probe('a.a', 'c.b');
  near(span, c.voltage('a.a', 'c.b'), 1e-7);
  assert.ok(span > v * 3);
  assert.equal(sampleContact('a.a', 'a.b'), 'a');
  assert.equal(sampleContact('a.b', 'a.a'), 'a');
  assert.equal(sampleContact('a.a', 'b.b'), null);
  assert.equal(sampleContact('a.a', 'a.a'), null);
  assert.equal(sampleContact(null, 'a.a'), null);
});
test('关闸与移开表笔不生成有效电压，回接同一器材恢复原值', () => {
  const { probe, sw } = bench();
  const v = probe('d.a', 'd.b');
  sw.closed = false;
  near(probe('d.a', 'd.b'), 0, 1e-6);
  sw.closed = true;
  near(probe('d.a', 'd.b'), v);
  for (const terminals of [
    [null, null],
    ['a.a', null],
    [null, 'a.a'],
  ])
    assert.equal(Math.abs(Number(probe(...terminals).toFixed(2))), 0);
  near(probe('d.a', 'd.b'), v);
});
test('滑片改变实际各段电压，电源功与导体/滑片/表的耗散相符', () => {
  const { c, p, probe } = bench(1),
    low = probe('b.a', 'b.b');
  p.pos = 0.1;
  const high = probe('b.a', 'b.b');
  assert.ok(high > low * 1.4);
  const heat =
    c.branches.reduce((sum, b) => sum + (Number.isFinite(b.R) ? b.I * b.I * b.R : 0), 0) +
    c.wireCurrents.reduce((sum, i) => sum + i * i * 1e-4, 0);
  near(3 * c.current('E'), heat, 2e-6);
});
