import test from 'node:test';
import assert from 'node:assert/strict';
import { thermistorMove, THERMISTOR_HOME, THERMISTOR_CLEARANCE } from '../src/lessons/kit/thermistorMotion.js';
import { THERMISTOR_WATER as W, thermistorExposure } from '../src/lessons/kit/thermistor.js';
const at = (x, y) => ({ x, y, z: W.z });
const close = (a, b, tol = 0.0006) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);

test('大位移横拖不能穿杯壁；先提过原杯沿再下降能浸入', () => {
  const blocked = thermistorMove(at(0.08, 0.025), at(0.16, 0.025));
  assert.equal(blocked.blocked, true);
  assert.ok(blocked.x < 0.12);
  close(blocked.y, 0.025);
  const raised = thermistorMove(blocked, at(blocked.x, 0.12)),
    across = thermistorMove(raised, at(0.16, 0.12)),
    down = thermistorMove(across, at(0.16, 0.025));
  close(down.x, 0.16);
  close(down.y, 0.025);
  assert.equal(down.blocked, false);
  close(thermistorExposure(down).immersion, 1);
});
test('杯内横拖同样受阻，不能穿杯底；提到杯沿上方才可取出', () => {
  const floor = thermistorMove(at(0.16, 0.025), at(0.16, -0.05));
  assert.equal(floor.blocked, true);
  assert.ok(floor.y >= 0.009);
  const blocked = thermistorMove(floor, at(0.08, 0.025));
  assert.equal(blocked.blocked, true);
  assert.ok(blocked.x > 0.125);
  const raised = thermistorMove(blocked, at(blocked.x, THERMISTOR_CLEARANCE + 0.003));
  const out = thermistorMove(raised, at(0.08, raised.y));
  close(out.x, 0.08);
  assert.equal(out.blocked, false);
  close(thermistorExposure(out).immersion, 0);
});
test('沿杯壁向上拖可以滑到杯沿，低于杯沿的径直横移始终受阻', () => {
  for (const y of [0.02, 0.055, THERMISTOR_CLEARANCE - 0.001]) {
    const p = thermistorMove(at(0.08, y), at(0.21, y));
    assert.equal(p.blocked, true);
    assert.ok(p.x < 0.12);
  }
  const p = thermistorMove(at(0.08, 0.025), at(0.16, 0.12));
  assert.ok(p.y > 0.119);
  assert.ok(p.x > 0.12);
  assert.ok(p.x <= 0.16001);
  assert.equal(thermistorMove(THERMISTOR_HOME, at(0.16, 0.125)).blocked, false);
  assert.throws(() => thermistorMove(THERMISTOR_HOME, { ...THERMISTOR_HOME, z: 0.08 }));
});
