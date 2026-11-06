// 核对洋流：node tools/geo/current_check.mjs（选必1 第 68–71 页）
import { windStep, driftInfo, vel, kindOf, coastEffect, advance, psi, isLand, nOf, XW, XE } from '../../src/lessons/kit/current.js';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
const V = (x, lat) => vel(x, nOf(lat));
ok(V(0, 10)[0] < 0 && V(0, -10)[0] < 0, '赤道南北两侧：海水由东向西流（信风驱动）');
ok(V(0, 40)[0] > 0, '北半球中纬度：海水向东流（盛行西风）');
ok(V(XW + 0.01, 25)[1] > 0 && V(XE - 0.01, 25)[1] < 0, '北半球中低纬环流顺时针：西岸往北、东岸往南');
ok(V(XW + 0.01, -25)[1] < 0 && V(XE - 0.01, -25)[1] > 0, '南半球中低纬环流逆时针：西岸往南、东岸往北');
ok(V(XW + 0.01, 56)[1] < 0 && V(XE - 0.01, 56)[1] > 0, '北半球中高纬环流逆时针：西岸往南、东岸往北');
ok(V(0, -55)[0] > 0, '南纬 45° 以南：西风漂流向东');
ok(kindOf(XW + 0.01, nOf(25)) === '暖流' && kindOf(XE - 0.01, nOf(25)) === '寒流', '中低纬：大洋西岸暖流、东岸寒流');
ok(kindOf(XE - 0.01, nOf(56)) === '暖流' && kindOf(XW + 0.01, nOf(56)) === '寒流', '北半球中高纬：大洋东岸暖流（像北大西洋暖流）、西岸寒流');
ok(coastEffect(60, 'east') === '偏暖' && coastEffect(60, 'west') === '偏冷' && coastEffect(60, 'west', false) === null, '沿岸影响仅定性，无大陆无两岸数据');
ok(Math.abs(V(XW + 0.01, 25)[1]) > 3 * Math.abs(V(XE - 0.01, 25)[1]), '大洋西岸的洋流比东岸快（示意的西部强化）');
for (const [x, lat] of [[0, 20], [XW + 0.001, 25], [XE - 0.001, 56], [0, -25]]) {
  const tracks = [];
  for (const dt of [1 / 60, 0.05, 1 / 30, 1 / 144]) {
    const o = { x, n: nOf(lat) }, start = psi(o.x, o.n); let drift = 0, onSea = true;
    for (let i = 0; i < Math.round(10 / dt); i++) { advance(o, dt); drift = Math.max(drift, Math.abs(psi(o.x, o.n) - start)); onSea &&= !isLand(o.x, o.n); }
    ok(drift < 1e-6 && onSea, `${lat}°起点、dt=${dt.toFixed(4)}：10秒流函数漂移${drift.toExponential(2)}，不登陆`); tracks.push(o);
  }
  ok(tracks.every((p) => Math.hypot(p.x - tracks[0].x, p.n - tracks[0].n) < 1e-8), '不同显示帧率终点一致');
}
const open = { x: 0.16, n: nOf(-55) }; advance(open, 10, 1, false); ok(open.x >= -0.167 && open.x < 0.167 && open.n === nOf(-55), '开阔海域共用周期边界');

ok(driftInfo(0, nOf(69)).motion.includes('静止'), '69°N零向量记录静止');
ok(driftInfo(0, nOf(25)).motion.includes('东') && !driftInfo(0, nOf(25)).target, '25°N向东且不套用20°N信风反馈');
ok(driftInfo(0, nOf(20)).motion.includes('西') && driftInfo(0, nOf(20)).target && !driftInfo(XW + 0.01, nOf(20)).target, '题设限于中央20°N，记录包含南北方向');
const tracks = [];
for (const dt of [1 / 20, 1 / 60, 1 / 144]) {
  const o = { x: 0, n: nOf(20) }; let w = 0, area = 0;
  for (const [blow, duration] of [[true, 3], [false, 0.7], [true, 1.1], [false, 4], [true, 0.8]]) {
    for (let t = 0; t < duration - 1e-10;) { const d = Math.min(dt, duration - t), wind = windStep(w, blow, d); w = wind.w; area += wind.integral; advance(o, d, wind.integral / d); t += d; }
    if (duration === 3) ok(Math.abs(area - 1.5) < 1e-10, `${1 / dt}fps起风3秒风速积分为1.5`);
  }
  tracks.push(o);
}
ok(tracks.every((p) => Math.hypot(p.x - tracks[0].x, p.n - tracks[0].n) < 1e-8), '20/60/144fps反复启停、跨越0和1截断后轨迹一致');
ok(Math.abs(windStep(0.9, true, 1).integral - 0.985) < 1e-12 && Math.abs(windStep(0.1, false, 1).integral - 0.015) < 1e-12, '达到风速上下限的帧分段精确积分');
process.exit(bad ? 1 : 0);
