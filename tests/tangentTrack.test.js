import test from 'node:test';
import assert from 'node:assert/strict';
import { tangentPath, tangentTrial, TANGENT_SEGMENTS } from '../src/lessons/kit/tangentTrack.js';
const close = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

test('两弯接合和拆段出口的位置、切向连续，离轨曲率为零', () => {
  for (const count of [1, 2, 3]) {
    const path = tangentPath(count),
      e = path.exit,
      h = 1e-6;
    const a = path.at(path.length - h),
      b = path.at(path.length + h);
    close((b.x - a.x) / (2 * h), Math.cos(e.heading), 1e-5);
    close((b.z - a.z) / (2 * h), Math.sin(e.heading), 1e-5);
    close(b.heading, e.heading);
    const far = path.at(path.length + 0.15);
    close((far.x - e.x) * Math.sin(e.heading) - (far.z - e.z) * Math.cos(e.heading), 0);
  }
  const full = tangentPath(),
    h = 1e-6;
  for (const s of [0.13, 0.24]) {
    const a = full.at(s - h),
      b = full.at(s + h);
    assert.ok(Math.hypot(b.x - a.x, b.z - a.z) < 2.01 * h);
    assert.ok(Math.abs(a.heading - b.heading) < 25 * h);
  }
});

test('拆出口段保留 C 至 B 的原轨道，B 与 A 留迹方向不同', () => {
  const full = tangentPath(3),
    short = tangentPath(2);
  for (let s = 0; s < short.length; s += 0.01) assert.deepEqual(full.at(s), short.at(s));
  close(full.exit.heading - short.exit.heading, TANGENT_SEGMENTS[2].length * TANGENT_SEGMENTS[2].curvature);
  assert.ok(Math.abs(Math.sin(full.exit.heading - short.exit.heading)) > 0.9);
});

test('出口两侧速度连续，离轨后仍减速但方向保持切向', () => {
  const trial = tangentTrial(),
    h = 1e-7;
  const a = trial.at(trial.exitTime - h),
    b = trial.at(trial.exitTime + h);
  close(a.vx, b.vx, 1e-6);
  close(a.vz, b.vz, 1e-6);
  close(Math.hypot(b.vx, b.vz), trial.exitSpeed, 1e-7);
  const later = trial.at(trial.exitTime + 0.3);
  close(later.heading, b.heading);
  assert.ok(later.speed < b.speed);
});

test('过慢推球会停在弯道内，无速度不能伪造出轨', () => {
  const slow = tangentTrial({ speed: 0.1, resistance: 0.08 });
  assert.equal(slow.exitTime, null);
  assert.equal(slow.reachesExit, false);
  const p = slow.at(10);
  assert.equal(p.stopped, true);
  assert.equal(p.onTrack, true);
  close(p.speed, 0);
  close(p.distance, 0.1 ** 2 / (2 * 0.08));
  assert.deepEqual(slow.at(10), slow.at(20));
  const still = tangentTrial({ speed: 0, resistance: 0 });
  assert.equal(still.reachesExit, false);
  close(still.at(100).distance, 0);
});

test('数值差分给出沿程减速与曲率所需的法向加速度', () => {
  const trial = tangentTrial({ speed: 0.36, resistance: 0.08 });
  for (const t of [0.1, 0.6, 1.5]) {
    const h = 1e-5,
      a = trial.at(t - h),
      p = trial.at(t),
      b = trial.at(t + h);
    const ax = (b.vx - a.vx) / (2 * h),
      az = (b.vz - a.vz) / (2 * h);
    close(ax * Math.cos(p.heading) + az * Math.sin(p.heading), -0.08, 1e-6);
    const curvature = p.distance < 0.13 ? 12 : p.distance < trial.path.length ? -12 : 0;
    close(-ax * Math.sin(p.heading) + az * Math.cos(p.heading), p.speed ** 2 * curvature, 1e-6);
    close((b.x - a.x) / (2 * h), p.vx, 1e-7);
  }
});

test('留痕只包含已走路程，与取样调用频率无关，出口处不跨接弦', () => {
  const trial = tangentTrial();
  for (let t = 0; t < 2; t += 1 / 30) trial.trace(t);
  const trace = trial.trace(2),
    p = trial.at(2);
  assert.deepEqual(trace, tangentTrial().trace(2));
  close(trace.at(-1).x, p.x);
  close(trace.at(-1).z, p.z);
  assert.ok(trace.some((p) => Math.abs(p.distance - trial.path.length) < 1e-12));
  assert.ok(trace.every((point) => point.distance <= p.distance));
  for (let i = 1; i < trace.length; i++) assert.ok(trace[i].distance > trace[i - 1].distance);
});

test('无阻力和无轨道是连续极限，非法输入不能产生 NaN 轨迹', () => {
  const trial = tangentTrial({ count: 0, speed: 0.3, resistance: 0 });
  close(trial.exitTime, 0);
  close(trial.at(2).distance, 0.6);
  close(trial.at(2).speed, 0.3);
  assert.equal(trial.at(2).onTrack, false);
  for (const count of [-1, 4, 1.5, NaN]) assert.throws(() => tangentPath(count), RangeError);
  for (const speed of [-1, Infinity, NaN]) assert.throws(() => tangentTrial({ speed }), RangeError);
  assert.throws(() => trial.trace(1, 0), RangeError);
  assert.throws(() => trial.at(-1), RangeError);
});
