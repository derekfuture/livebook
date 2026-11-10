// 锋面天气与快速拖动的阶段核对，数值为教学示意。
import assert from 'node:assert/strict';
import { stationAt, weatherAt, frontPath } from '../../src/lessons/kit/front.js';
for (const kind of ['cold', 'warm']) {
  const stages = (from, to) => frontPath(kind, from, to).map((d) => weatherAt(kind, d).k).filter((k, i, all) => !i || k !== all[i - 1]);
  assert.deepEqual(stages(0.2, -0.1), ['w0', 'w1', 'w2', 'w3']);
  assert.deepEqual(stages(-0.1, 0.2), ['w3', 'w2', 'w1', 'w0']);
  assert.deepEqual(stages(0, 0), ['w2']);
}
assert(stationAt('cold', 0.01).T < stationAt('cold', 0.12).T);
assert(stationAt('cold', 0.001).T < stationAt('cold', 0.01).T);
assert(stationAt('warm', 0.001).T > stationAt('warm', 0.1).T);
assert.equal(weatherAt('still', 0.05).text, '晴，较暖');
assert.equal(weatherAt('still', -0.05).text, '阴雨连绵');
assert.equal(weatherAt('still', -0.12).text, '阴，较冷');
console.log('✓ 冷暖锋快拖、回拖、连续温度变化和准静止锋可移动城市天气全部通过');

// 从活页提取纯函数，保持只修改获授权的文件（kit/front.js 不在本轮范围）。
const source = (await import('node:fs')).readFileSync(new URL('../../src/lessons/front.js', import.meta.url), 'utf8');
const get = (name) => source.match(new RegExp(`export function ${name}\\([^]*?\\n}`))[0].replace('export ', '');
const plain = source.match(/const plainAt =[^]*?;\n/)[0];
const { formedPath, observedWeather, observedPass } = new Function('frontPath', 'weatherAt', `${plain}; ${get('observedWeather')}; ${get('formedPath')}; ${get('observedPass')}; return { formedPath, observedWeather, observedPass };`)(frontPath, weatherAt);
assert(!formedPath('warm', 0.03, -0.03, 0, -0.12, -0.15).some((w) => w.k === 'w2'));
assert(formedPath('warm', 0.03, 0.02, 0, -0.12, -0.15).every((w) => w.k === 'w0'));
for (const [kind, start] of [['cold', -0.07], ['warm', -0.15]]) for (const steps of [1, 240]) {
  const log = []; let from = 0.05 - start, form = 0;
  for (let j = 0; j <= steps; j++) {
    const xf = start + (0.165 - start) * j / steps, to = 0.05 - xf;
    for (const w of formedPath(kind, from, to, form, 0.05, start)) if (!log.length || log.at(-1).k !== w.k) log.push(w);
    from = to; form = Math.max(form, (xf - start) / 0.06);
  }
  assert.deepEqual(log.map((w) => w.k), ['w0', 'w1', 'w2', 'w3']); assert(observedPass(log));
}
assert(!observedPass([{ k: 'w0' }, { k: 'w3' }]));
assert(observedPass([{ k: 'w1' }, { k: 'w2' }, { k: 'w3' }]));
assert.equal(observedWeather('warm', 0.02, 0.6).k, 'w1');
assert.equal(observedWeather('still', -0.109266, 1).k, 'w2');
assert.notEqual(observedWeather('still', -0.110005, 1).k, 'w2');
const auto = source.slice(source.indexOf("if (S.kind === 'still' && (S.stuck"));
assert(auto.indexOf('layout();') < auto.indexOf('if (Math.floor(S.days) !== d0)'));
assert(source.includes('drawSky(); drawMap(); placeExtras(); drawStation();'));
assert(!source.includes("? '连着下好几天：")); assert(source.includes('锋已停留'));
console.log('✓ 初态晴天、冷暖锋慢拖与快拖四阶段、形成前不误记降雨、有效过境及摆动每帧同步通过');
