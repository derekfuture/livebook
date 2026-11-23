import assert from 'node:assert/strict';
import test from 'node:test';
import { ReflectionTank } from '../src/lessons/kit/reflectionTank.js';
import { RippleTank, NX, NZ, SPEED, WAVELENGTH } from '../src/lessons/kit/rippleTank.js';

// Infer direction from the computed scattered field, not a ray imposed on the solver.
function reflectedDirection(angle) {
  const tank = new ReflectionTank({ angle: (angle * Math.PI) / 180 });
  const incident = new ReflectionTank({ present: false });
  const points = [];
  for (let j = 0; j < 19; j++)
    for (let i = 0; i < 19; i++) points.push({ x: -0.005 + i * 0.0025, z: -0.055 + j * 0.0025, re: 0, im: 0 });
  for (let n = 0; n < 600; n++) {
    tank.step(true);
    incident.step(true);
    if (n < 400) continue;
    const phase = ((2 * Math.PI * SPEED) / WAVELENGTH) * tank.time;
    for (const p of points) {
      const u = tank.sample(p.x, p.z) - incident.sample(p.x, p.z);
      p.re += u * Math.cos(phase);
      p.im -= u * Math.sin(phase);
    }
  }
  let best = { power: 0, degrees: NaN };
  for (let degrees = 20; degrees <= 160; degrees += 0.25) {
    const phi = (degrees * Math.PI) / 180;
    const kx = ((2 * Math.PI) / WAVELENGTH) * Math.sin(phi),
      kz = ((2 * Math.PI) / WAVELENGTH) * Math.cos(phi);
    let re = 0,
      im = 0;
    for (const p of points) {
      const ph = kx * p.x + kz * p.z,
        c = Math.cos(ph),
        s = Math.sin(ph);
      re += p.re * c - p.im * s;
      im += p.re * s + p.im * c;
    }
    const power = re * re + im * im;
    if (power > best.power) best = { power, degrees };
  }
  return best;
}

test('斜挡板的实际散射波场符合反射方向，包含有限板边缘衍射误差', () => {
  for (const angle of [30, 45, 60]) {
    const measured = reflectedDirection(angle);
    assert.ok(measured.power > 1e5, '需要存在可辨识的反射波');
    assert.ok(Math.abs(measured.degrees - (180 - 2 * angle)) < 5, `${angle}° 挡板：波场方向 ${measured.degrees}°`);
  }
});

test('移去挡板等价于原水波槽无障碍物，镜像挡板产生镜像波场', () => {
  const open = new ReflectionTank({ present: false }),
    base = new RippleTank();
  base.wall.fill(0);
  const left = new ReflectionTank({ angle: -Math.PI / 6 }),
    right = new ReflectionTank({ angle: Math.PI / 6 });
  for (let n = 0; n < 240; n++) {
    open.step(true);
    base.step(true);
    left.step(true);
    right.step(true);
  }
  assert.deepEqual(open.surface, base.surface);
  let error = 0;
  for (let j = 0; j < NZ; j++)
    for (let i = 0; i < NX; i++)
      error = Math.max(error, Math.abs(left.surface[j * NX + i] - right.surface[j * NX + NX - 1 - i]));
  assert.ok(error < 1e-5, `镜像误差 ${error}`);
});

test('调整或移走挡板保留已有远场、物理时间和振源相位', () => {
  const tank = new ReflectionTank();
  tank.advance(2, true);
  const before = tank.surface.slice(),
    time = tank.time,
    phase = tank.phase;
  tank.setBoard(Math.PI / 6);
  for (let k = 0; k < before.length; k++) {
    if (!tank.wall[k]) assert.equal(tank.surface[k], before[k]);
    else assert.equal(tank.surface[k], 0);
  }
  const changed = tank.surface.slice();
  tank.setBoard(Math.PI / 6, false);
  assert.deepEqual(tank.surface, changed);
  assert.equal(tank.time, time);
  assert.equal(tank.phase, phase);
});

test('关闭振源后波继续传播再耗散，固定步长不依赖渲染帧率', () => {
  const a = new ReflectionTank(),
    b = new ReflectionTank();
  a.advance(2.7, true);
  for (let n = 0; n < 90; n++) b.advance(0.03, true);
  assert.deepEqual(a.surface, b.surface);
  const power = () => a.surface.reduce((sum, h) => sum + h * h, 0);
  const before = power();
  a.advance(0.09, false);
  assert.ok(power() > before * 0.1, '停机不应瞬间清空水波');
  a.advance(18, false);
  assert.ok(power() < before * 0.01, '消波边缘和阻尼应使余波衰减');
});
