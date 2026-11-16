import test from 'node:test';
import assert from 'node:assert/strict';
import { photoIlluminance, photoresistorState, handCoverage } from '../src/lessons/kit/photoresistor.js';
import { photoResistance, DAYLIGHT_LUX, STRAY_LUX } from '../src/lessons/kit/lightSwitch.js';
import { meterBranch, meterFraction, ohmScaleValue, METER_STOPS } from '../src/lessons/kit/multimeter.js';
const close = (a, b, tol = 1e-7) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);
const lamp = { x: 0, y: 0.16, z: 0, intensity: 160 };

test('自然光、手掌遮光和强光由同一几何产生，离开元件上方后恢复自然光', () => {
  close(photoIlluminance(), DAYLIGHT_LUX);
  close(photoIlluminance({ shade: { x: 0.2, y: 0.07, z: 0 } }), DAYLIGHT_LUX);
  const dark = photoIlluminance({ shade: { x: 0, y: 0.07, z: 0 } });
  close(dark, STRAY_LUX);
  assert.ok(photoIlluminance({ lamp }) > 5000);
  close(photoIlluminance({ lamp, shade: { x: 0, y: 0.07, z: 0 } }), STRAY_LUX);
  assert.ok(photoResistance(dark) > 20000);
});

test('半遮与偏离光束保留中间照度，遮光物放在元件下方不算遮光', () => {
  const partial = photoIlluminance({ shade: { x: 0.033, y: 0.07, z: 0 } });
  assert.ok(partial > STRAY_LUX && partial < DAYLIGHT_LUX);
  close(photoIlluminance({ shade: { x: 0, y: 0, z: 0 } }), DAYLIGHT_LUX);
  assert.ok(photoIlluminance({ lamp: { ...lamp, x: 0.2 } }) < photoIlluminance({ lamp }));
  assert.ok(photoIlluminance({ lamp: { ...lamp, y: 0.3 } }) < photoIlluminance({ lamp }));
  assert.equal(handCoverage(0, 0), 1);
  assert.equal(handCoverage(0.2, 0), 0);
});

test('移动元件、手和灯的整体位置不改变相对遮光和照度', () => {
  const original = { sensor: { x: 0, y: 0.02, z: 0 }, shade: { x: 0.03, y: 0.07, z: 0 }, lamp };
  const moved = Object.fromEntries(
    Object.entries(original).map(([key, p]) => [key, { ...p, x: p.x + 0.2, y: p.y + 0.1, z: p.z - 0.3 }]),
  );
  close(photoIlluminance(original), photoIlluminance(moved));
});

test('光敏电阻保留有限响应和恢复，普通电阻在同样光照下不变', () => {
  const model = photoresistorState(),
    start = model.resistance;
  close(model.step(0, 10000), start);
  const first = model.step(0.01, 10000),
    settled = model.step(2, 10000);
  assert.ok(first < start && first > settled);
  close(settled, photoResistance(10000));
  const dark = model.step(0.01, STRAY_LUX);
  assert.ok(dark > settled);
  close(model.step(6, STRAY_LUX), photoResistance(STRAY_LUX));
  close(model.step(6, DAYLIGHT_LUX), start);
  assert.equal(model.regularResistance, 2000);
});

test('同一欧姆挡越亮越向零欧姆偏转，倍率和未调零误差仍有效', () => {
  const stop = METER_STOPS.find((s) => s.multiplier === 100);
  const read = (R, trim = 0) => {
    const branch = meterBranch(stop, trim);
    return meterFraction(stop, { I: branch.E / (branch.R + R) });
  };
  const normal = photoResistance(DAYLIGHT_LUX),
    bright = photoResistance(photoIlluminance({ lamp }));
  assert.ok(read(bright) > read(normal));
  assert.ok(read(normal) > read(photoResistance(STRAY_LUX)));
  close(ohmScaleValue(read(normal)) * 100, normal);
  close(read(0), 1);
  close(read(Infinity), 0);
  assert.notEqual(read(0, 0.2), 1);
  close(ohmScaleValue(read(2000)) * 100, 2000);
});

test('恒定光照响应不依赖显示帧率，非法输入不能生成读数', () => {
  const run = (n) => {
    const m = photoresistorState();
    for (let i = 0; i < n; i++) m.step(0.3 / n, 30);
    return m.resistance;
  };
  close(run(9), run(43));
  assert.throws(() => photoIlluminance({ lamp: { ...lamp, y: 0 } }));
  assert.throws(() => photoresistorState({ initialLux: -1 }));
  assert.throws(() => photoresistorState().step(-1, 500));
});
