import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ELECTRON_MASS as M,
  CHARGE as E,
  coilField,
  speedFromVoltage,
  beamOrbit,
  traceBeam,
  BULB_RADIUS,
} from '../src/lessons/kit/electronBeam.js';
const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);
test('加速电压给动能，串联线圈中心磁场与电流成正比', () => {
  close((0.5 * M * speedFromVoltage(200) ** 2) / (E * 200), 1);
  close(coilField(4) / coilField(2), 2);
  assert.ok(coilField(5) > 0.0037 && coilField(5) < 0.0038);
});
test('负电子在向纸内的磁场中从左射出时向上弯；反向磁场改变弯曲方向', () => {
  for (const field of [-0.0015, 0.0015]) {
    const o = beamOrbit({ field }),
      t = o.period / 1000,
      dt = t / 100;
    const v = o.velocity(t),
      a = o.velocity(t + dt).map((u, i) => (u - v[i]) / dt);
    assert.equal(Math.sign(o.sample(t).y + 0.055), -Math.sign(field));
    // F=q(v×B)，用有限差分核对两个垂直分量。
    close(a[0] / ((-E / M) * v[1] * field), 1, 0.006);
    close(a[1] / ((E / M) * v[0] * field), 1, 0.001);
    close(Math.hypot(...v) / o.speed, 1);
  }
});
test('同速度磁场加倍半径减半；同磁场电压四倍半径加倍；一周返回原点', () => {
  const a = beamOrbit({ voltage: 50, field: -0.0015 }),
    b = beamOrbit({ voltage: 200, field: -0.0015 }),
    c = beamOrbit({ voltage: 50, field: -0.003 });
  close(b.radius / a.radius, 2);
  close(c.radius / a.radius, 0.5);
  const end = a.sample(a.period);
  close(end.x, 0);
  close(end.y, -0.055);
  close(end.z, 0);
});
test('无场为直线；斜射为螺旋；平行磁场不偏转，所有径迹在球壁处停止', () => {
  for (const opts of [{ field: 0 }, { field: -0.0015, angle: 30 }, { field: -0.0015, angle: 90 }, { field: -0.0001 }]) {
    const t = traceBeam(opts);
    assert.ok(t.hitWall);
    for (const p of t.points) assert.ok(Math.hypot(p.x, p.y, p.z) <= BULB_RADIUS + 1e-10);
    close(Math.hypot(t.points.at(-1).x, t.points.at(-1).y, t.points.at(-1).z), BULB_RADIUS);
    for (const p of t.points) close(Math.hypot(...t.velocity(p.t)) / t.speed, 1);
  }
  assert.equal(traceBeam({ field: 0 }).kind, 'line');
  assert.equal(traceBeam({ angle: 30 }).kind, 'helix');
  assert.equal(traceBeam({ angle: 90 }).kind, 'line');
  const circle = traceBeam({ field: -0.0015 });
  assert.equal(circle.hitWall, false);
  assert.equal(circle.kind, 'circle');
});

test('极小非零倾角限制绘制长度，不能伪称在管壁终止', () => {
  const trace = traceBeam({ angle: 0.00001 });
  assert.ok(trace.truncated);
  assert.equal(trace.hitWall, false);
  assert.ok(trace.points.length < 10000);
});
