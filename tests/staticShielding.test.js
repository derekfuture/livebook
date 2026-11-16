import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COULOMB,
  ShieldingElectrostatics,
  wireElement,
  wirePotential,
  wireField,
  wireCoefficient,
  shieldingCage,
} from '../src/lessons/kit/staticShielding.js';
const close = (a, b, tolerance) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b} (±${tolerance})`);
const norm = (a) => Math.hypot(...a);
const model = new ShieldingElectrostatics();
const enclosed = { cageOffset: [0, 0, 0], angles: [0.15, 0.15] };

test('有限线径势核与独立积分相符，电场是势的负梯度；自能不是任意对角常数', () => {
  const e = wireElement([-0.02, 0.03, -0.01], [0.04, 0.06, 0.02]),
    p = [0.06, 0.02, 0.07],
    radius = 0.001;
  let potential = 0;
  const field = [0, 0, 0],
    n = 20000;
  for (let k = 0; k < n; k++) {
    const at = e.a.map((v, i) => v + ((e.b[i] - v) * (k + 0.5)) / n),
      r = p.map((v, i) => v - at[i]),
      d = Math.sqrt(r.reduce((s, v) => s + v * v, 0) + radius ** 2);
    potential += 1 / d / n;
    for (let i = 0; i < 3; i++) field[i] += r[i] / d ** 3 / n;
  }
  close(wirePotential(e, p, radius), potential, 1e-8);
  const actual = wireField(e, p, radius);
  for (let i = 0; i < 3; i++) {
    close(actual[i], field[i], 1e-6);
    const a = [...p],
      b = [...p],
      h = 1e-6;
    a[i] -= h;
    b[i] += h;
    close(actual[i], -(wirePotential(e, b, radius) - wirePotential(e, a, radius)) / (2 * h), 1e-6);
  }
  const l = e.length,
    self = (2 * (l * Math.asinh(l / radius) - Math.sqrt(l * l + radius * radius) + radius)) / (l * l);
  close(wireCoefficient(e, e, radius), self, self * 1e-4);
});

test('孤立网罩与验电器分别净电荷守恒、平均等势；网罩内电势无需为零', () => {
  for (const cageOffset of [
    [0, 0, 0],
    [0, 0.08, 0],
    [-0.32, 0, 0],
  ]) {
    const s = model.solve({ ...enclosed, cageOffset, cageCharge: 2e-9, scopeCharge: -0.4e-9 }),
      r = model.residual(s);
    assert.ok(r.cage < 1e-7 && r.scope < 1e-7);
    assert.ok(Math.abs(r.cageCharge) < 1e-20 && Math.abs(r.scopeCharge) < 1e-20);
  }
  const neutral = model.solve(enclosed);
  assert.ok(Math.abs(neutral.scopePotential) > 1000);
  assert.ok(neutral.scopeCharges[0] < 0 && neutral.scopeCharges.at(-1) > 0);
});

test('同一外球位置，实网罩降低原箔片受力但不强制归零；抬起留下开口会减弱屏蔽', () => {
  const covered = model.solve(enclosed),
    open = model.solve({ ...enclosed, cageOffset: [0, 0.08, 0] }),
    away = model.solve({ ...enclosed, cageOffset: [-0.32, 0, 0] });
  const a = model.leafTorque(covered, 0),
    b = model.leafTorque(open, 0),
    c = model.leafTorque(away, 0);
  assert.ok(a > 0 && a < c * 0.15);
  assert.ok(b > a * 3 && b < c);
  const field = norm(model.fieldAt([0, 0.2, 0], covered)),
    bare = norm(model.fieldAt([0, 0.2, 0], away));
  assert.ok(field > 1 && field < bare * 0.4);
  // Never hide the effect by discharging a previously charged electroscope.
  const charged = model.solve({ ...enclosed, sourceCharge: 0, scopeCharge: 1e-9 });
  assert.ok(charged.scopeCharges.at(-1) > 0);
  assert.ok(model.leafTorque(charged, 0) > 0);
});

test('电荷反号改变感应电荷符号，箔片力矩不变；加倍外球电荷使力矩按平方变化', () => {
  const a = model.solve(enclosed),
    b = model.solve({ ...enclosed, sourceCharge: -60e-9 }),
    c = model.solve({ ...enclosed, sourceCharge: 120e-9 });
  for (let i = 0; i < a.scopeCharges.length; i++) {
    close(a.scopeCharges[i], -b.scopeCharges[i], 1e-22);
    close(c.scopeCharges[i], 2 * a.scopeCharges[i], 1e-22);
  }
  for (let i = 0; i < 2; i++) {
    close(model.leafTorque(a, i), model.leafTorque(b, i), 1e-20);
    close(model.leafTorque(c, i), 4 * model.leafTorque(a, i), 1e-20);
  }
});

test('箔片力矩独立符合静电能量的虚功导数，不只按箔片电荷套经验张角', () => {
  for (const cageOffset of [
    [0, 0, 0],
    [-0.32, 0, 0],
  ]) {
    const pose = { cageOffset, angles: [0.13, 0.19] },
      s = model.solve(pose),
      h = 1e-5;
    for (let i = 0; i < 2; i++) {
      const a = [...pose.angles],
        b = [...pose.angles];
      a[i] -= h;
      b[i] += h;
      const derivative =
        -(model.solve({ ...pose, angles: b }).energy - model.solve({ ...pose, angles: a }).energy) / (2 * h);
      close(model.leafTorque(s, i), derivative, Math.abs(derivative) * 2e-4);
    }
  }
});

test('左右镜像交换两片箔的响应，斜放外球可以产生不对称而不是强制两片同角', () => {
  const a = model.solve({ cageOffset: [-0.24, 0.05, 0], source: [0.025, 0.18, 0.16], angles: [0.12, 0.24] });
  const b = model.solve({ cageOffset: [0.24, 0.05, 0], source: [-0.025, 0.18, 0.16], angles: [0.24, 0.12] });
  close(a.energy, b.energy, 1e-15);
  close(a.leafCharges[1], b.leafCharges[0], 1e-21);
  close(a.leafCharges[0], b.leafCharges[1], 1e-21);
  close(model.leafTorque(a, 0), model.leafTorque(b, 1), 1e-17);
  assert.ok(Math.abs(model.leafTorque(a, 0) - model.leafTorque(a, 1)) > 1e-10);
});

test('移动网罩连续改变同一求解；无外球且无净电荷才是静电零状态', () => {
  const a = model.solve({ ...enclosed, cageOffset: [0, 0.05, 0] }),
    b = model.solve({ ...enclosed, cageOffset: [0, 0.05001, 0] });
  close(a.scopeCharges.at(-1), b.scopeCharges.at(-1), Math.abs(a.scopeCharges.at(-1)) * 0.001);
  const zero = model.solve({ ...enclosed, sourceCharge: 0 });
  assert.ok(zero.cageCharges.every((q) => q === 0) && zero.scopeCharges.every((q) => q === 0));
  assert.equal(model.leafTorque(zero, 0), 0);
  assert.equal(zero.energy, 0);
  const far = model.solve({ ...enclosed, source: [0, 0.17, 1e6] });
  assert.ok(Math.max(...far.scopeCharges.map(Math.abs)) < 1e-20);
});

test('同一实网格只细分数值线段，感应电荷与力矩收敛；实际增大网孔则泄漏更多', () => {
  const fine = new ShieldingElectrostatics({ cage: { subdivisions: 2 } }),
    s = model.solve(enclosed),
    f = fine.solve(enclosed);
  close(f.scopeCharges.at(-1), s.scopeCharges.at(-1), Math.abs(f.scopeCharges.at(-1)) * 0.02);
  close(fine.leafTorque(f, 0), model.leafTorque(s, 0), Math.abs(fine.leafTorque(f, 0)) * 0.03);
  const wide = new ShieldingElectrostatics({ cage: { nx: 3, ny: 3, nz: 2 } }),
    w = wide.solve(enclosed);
  assert.ok(norm(wide.fieldAt([0, 0.2, 0], w)) > norm(model.fieldAt([0, 0.2, 0], s)) * 1.6);
});

test('独立导体不因外球接近就重设电荷；拒绝非法参数和球接触线段中部', () => {
  assert.throws(() => new ShieldingElectrostatics({ wireRadius: 0 }), RangeError);
  assert.throws(() => shieldingCage({ nx: 0 }), RangeError);
  assert.throws(() => wireElement([0, 0, 0], [0, 0, 0]), RangeError);
  assert.throws(() => model.solve({ angles: [-0.1, 0] }), RangeError);
  assert.throws(() => model.solve({ sourceCharge: NaN }), RangeError);
  assert.throws(() => model.solve({ ...enclosed, source: [0.1, 0.11, 0] }), /接触/);
  assert.throws(() => model.solve({ ...enclosed, source: [0, 0.17, 0.025] }), /接触/);
  const previous = model.solve({ ...enclosed, cageCharge: 1e-9, scopeCharge: -1e-9 });
  const next = model.solve({ ...enclosed, cageCharge: 1e-9, scopeCharge: -1e-9, source: [0, 0.17, 0.3] });
  close(
    previous.scopeCharges.reduce((a, b) => a + b),
    next.scopeCharges.reduce((a, b) => a + b),
    1e-21,
  );
  assert.ok(next.energy + (COULOMB * next.sourceCharge ** 2) / (2 * 0.02) > 0);
});

test('两片原箔按电力矩、重力、惯性和阻尼连续响应，罩网不直接改写张角', async () => {
  const { ShieldingExperiment } = await import('../src/lessons/kit/staticShielding.js');
  const m = new ShieldingExperiment({ electrostatics: model });
  m.advance(0.5);
  const initial = [...m.angles],
    time = m.time;
  m.setSource([0, 0.17, 0.15]);
  assert.deepEqual(m.angles, initial);
  assert.equal(m.time, time);
  m.advance(1.5);
  assert.ok(Math.min(...m.angles) > 0.15 && Math.max(...m.angles) < 0.3);
  const open = [...m.angles];
  m.setCage([0, 0, 0]);
  assert.deepEqual(m.angles, open);
  m.advance(1.5);
  assert.ok(Math.max(...m.angles) < Math.min(...open) * 0.4 && Math.min(...m.angles) > 0.01);
  m.setSource([0, 0.17, 0.46]);
  m.advance(1.5);
  assert.ok(Math.max(...m.angles) < 0.002);
  assert.ok(m.heat > 0);
  close(m.energy() + m.heat, m.initialEnergy + m.work, m.heat * 0.03);
  const snapshot = { angles: [...m.angles], source: [...m.source] };
  assert.throws(() => m.setSource([0, 0.17, 0.025]), /接触/);
  assert.deepEqual(m.angles, snapshot.angles);
  assert.deepEqual(m.source, snapshot.source);
  m.reset();
  assert.deepEqual(m.angles, [0, 0]);
  assert.deepEqual(m.velocities, [0, 0]);
  assert.equal(m.time, 0);
  assert.equal(m.heat, 0);
  assert.equal(m.work, 0);
});

test('60与120帧输入推进同一运动；自适应结果与细步长参考收敛', async () => {
  const { ShieldingExperiment } = await import('../src/lessons/kit/staticShielding.js');
  const a = new ShieldingExperiment({ electrostatics: model }),
    b = new ShieldingExperiment({ electrostatics: model }),
    fine = new ShieldingExperiment({ electrostatics: model, step: 1 / 480 });
  for (const m of [a, b, fine]) m.setSource([0, 0.17, 0.15]);
  for (let i = 0; i < 60; i++) a.advance(1 / 60);
  for (let i = 0; i < 120; i++) b.advance(1 / 120);
  fine.advance(1);
  assert.deepEqual(a.angles, b.angles);
  assert.deepEqual(a.velocities, b.velocities);
  for (let i = 0; i < 2; i++) close(a.angles[i], fine.angles[i], 0.0001);
  const coarseError = Math.abs(a.energy() + a.heat - a.initialEnergy - a.work),
    fineError = Math.abs(fine.energy() + fine.heat - fine.initialEnergy - fine.work);
  assert.ok(coarseError < a.heat * 0.002);
  assert.ok(fineError < coarseError * 0.4, `${fineError} vs ${coarseError}`);
  assert.throws(() => a.advance(-1), RangeError);
  assert.throws(() => a.advance(Infinity), RangeError);
});

test('箔片沿长度的电荷分布必须解析：四段与八段的总电荷、力矩均收敛', () => {
  const fine = new ShieldingElectrostatics({ leafSegments: 8 });
  for (const cageOffset of [
    [0, 0, 0],
    [-0.32, 0, 0],
  ]) {
    const a = model.solve({ ...enclosed, cageOffset }),
      b = fine.solve({ ...enclosed, cageOffset });
    for (let i = 0; i < 2; i++) {
      close(a.leafCharges[i], b.leafCharges[i], Math.abs(b.leafCharges[i]) * 0.02);
      close(model.leafTorque(a, i), fine.leafTorque(b, i), Math.abs(fine.leafTorque(b, i)) * 0.03);
    }
  }
});

test('同一网罩绕绝缘后轴连续翻开；全行程避开原金属且盖回恢复同一电荷解', () => {
  const args = { ...enclosed, cageOffset: [0, 0, 0] };
  const first = model.solve(args);
  for (let k = 0; k <= 90; k++) {
    const s = model.solve({ ...args, cageAngle: (k * Math.PI) / 180 });
    close(
      s.cageCharges.reduce((v, q) => v + q, 0),
      0,
      1e-20,
    );
    assert.ok(model.residual(s).cage < 1e-7);
    assert.ok(Math.min(...s.cage.flatMap((e) => [e.a[1], e.b[1]])) >= 0.01 - 1e-12);
    // Independent slab intersection against the insulating glass envelope,
    // enlarged by 5 mm (1 mm wire radius plus > 0.4 m * sin(0.5 deg)).
    const lo = [-0.07, 0.02, -0.03],
      hi = [0.07, 0.155, 0.03];
    for (const wire of s.cage) {
      let enter = 0,
        exit = 1;
      for (let axis = 0; axis < 3; axis++) {
        const delta = wire.b[axis] - wire.a[axis];
        if (Math.abs(delta) < 1e-12) {
          if (wire.a[axis] < lo[axis] || wire.a[axis] > hi[axis]) enter = 2;
        } else {
          const a = (lo[axis] - wire.a[axis]) / delta,
            b = (hi[axis] - wire.a[axis]) / delta;
          enter = Math.max(enter, Math.min(a, b));
          exit = Math.min(exit, Math.max(a, b));
        }
      }
      assert.ok(enter > exit, `cage hits glass at ${k} degrees`);
    }
  }
  const open = model.solve({ ...args, cageAngle: Math.PI / 2 });
  assert.ok(model.leafTorque(open, 0) > model.leafTorque(first, 0) * 8);
  const last = model.solve(args);
  assert.deepEqual(last.scopeCharges, first.scopeCharges);
  assert.throws(() => model.solve({ ...args, cageAngle: Math.PI }), RangeError);
  assert.throws(() => model.solve({ ...args, cageOffset: [0.1, 0, 0] }), /网罩不能接触/);
});

test('没有空气阻尼时仍保留箔片惯性；止挡损失单独记热而非伪造电荷归零', async () => {
  const { ShieldingExperiment } = await import('../src/lessons/kit/staticShielding.js');
  const m = new ShieldingExperiment({ electrostatics: model, damping: 0 });
  m.setSource([0, 0.17, 0.15]);
  m.advance(0.3);
  assert.ok(Math.max(...m.velocities.map(Math.abs)) > 0.1);
  assert.ok(m.angles.every((a) => a >= 0 && a <= 1.1));
  close(m.energy() + m.heat, m.initialEnergy + m.work, 1e-10);
});

test('连续靠近原球、翻回原网罩再移远，全程由同一电荷解驱动且外力功记账闭合', async () => {
  const { ShieldingExperiment } = await import('../src/lessons/kit/staticShielding.js');
  const m = new ShieldingExperiment({ electrostatics: model });
  m.setCageAngle(Math.PI / 2);
  m.setCage([0, 0, 0]);
  for (let k = 1; k <= 60; k++) {
    m.setSource([0, 0.17, 0.46 - (0.31 * k) / 60]);
    m.advance(1 / 60);
  }
  m.advance(1);
  const open = [...m.angles];
  for (let k = 1; k <= 60; k++) {
    const before = [...m.angles];
    m.setCageAngle((Math.PI / 2) * (1 - k / 60));
    assert.deepEqual(m.angles, before);
    m.advance(1 / 60);
  }
  m.advance(1);
  assert.ok(Math.min(...open) > 0.15);
  assert.ok(Math.max(...m.angles) < Math.min(...open) * 0.4);
  assert.ok(Math.min(...m.angles) > 0.01);
  for (let k = 1; k <= 60; k++) {
    m.setSource([0, 0.17, 0.15 + (0.31 * k) / 60]);
    m.advance(1 / 60);
  }
  m.advance(1);
  assert.ok(Math.max(...m.angles) < 0.002);
  close(m.energy() + m.heat, m.initialEnergy + m.work, m.heat * 0.005);
  close(m.time + m.remainder, 6, 1e-12);
});
