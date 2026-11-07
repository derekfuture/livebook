// 核对气压带和风带：node tools/geo/belts_check.mjs（选必1 第 48–50 页）
import { windAt, relWind, beltNear, sailing, tackLegs } from '../../src/lessons/kit/belts.js';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
const eq = (a, b, m) => ok(a === b, `${m}：${a}${a === b ? '' : `（应为 ${b}）`}`);
eq(windAt(15).dir, '东北风', '北纬 15°（东北信风）'); eq(windAt(45).dir, '西南风', '北纬 45°（盛行西风）'); eq(windAt(75).dir, '东北风', '北纬 75°（极地东风）');
eq(windAt(-15).dir, '东南风', '南纬 15°（东南信风）'); eq(windAt(-45).dir, '西北风', '南纬 45°'); eq(windAt(-75).dir, '东南风', '南纬 75°');
eq(beltNear(30).name, '北半球副热带高压带', '北纬 30°'); eq(beltNear(-60).name, '南半球副极地低压带', '南纬 60°');
for (const lat of [0, 30, -30, 60, -60, 90, -90]) ok(!windAt(lat).known && !relWind(lat, 270).rel.includes('无风'), `${lat}° 气压带不以升降气流推导无风`);
// 麦哲伦：南美南端海峡（约 52°S）往西走 → 逆风；30°S 附近 → 平静；之后往西北走、受东南信风 → 顺风
eq(relWind(-48, 270).rel, '逆风', '南纬 48° 往西走（盛行西风）'); eq(relWind(-30, 315).rel, '不判定顺逆风', '南纬 30° 附近'); eq(relWind(-15, 315).rel, '顺风', '南纬 15° 往西北走（东南信风）');
ok(beltNear(35, 5).name === '北半球副热带高压带' && beltNear(30, 5)?.lat === 30, '7 月（偏北 5°）：北纬 35° 附近是副热带高压带');
eq(windAt(30, 0, false).dir, '北风', '假如地球不自转：北半球近地面吹北风（不偏转）');
eq(windAt(60).dir, '近地面辐合', '60°N 水平辐合');
eq(windAt(-60).dir, '近地面辐合', '60°S 水平辐合');
for (const [lat, sh] of [[2, 5], [-2, -5]]) { eq(windAt(lat, sh).dir, '跨赤道转向未模拟', `${lat}° 季节移动不沿用原半球信风`); ok(!windAt(lat, sh).known, '跨赤道不画确定风向'); }
eq(windAt(2, 5, false).dir, '北风', '无偏转模型固定直射赤道，忽略季节参数');
// 开船（航向 330°，北偏西 30°）：西风带逆风 → 30°S 风弱几乎不动 → 东南信风顺风 → 赤道无风带；船速只是示意
for (const [lat, k] of [[-50, 'head'], [-30, 'calm'], [-15, 'tail'], [0, 'doldrums'], [-60, 'storm']]) eq(sailing(lat, 330).k, k, `开船 ${lat}°`);
ok(sailing(-15, 330).rate > sailing(-50, 330).rate && sailing(-50, 330).rate > sailing(-30, 330).rate, '顺风比逆风快，逆风比副高里快');
eq(sailing(2.5, 330, 5).k, 'unknown', '7 月 2.5°N 跨赤道区：航况不判定（不当成侧风）'); eq(sailing(-50, 330, 0, false).k, 'tail', '无偏转模型 50°S 往北：南风顺风（不沿用西风带）');
for (const lat of [-55, -50, -45, -40, -35]) { const t = tackLegs(lat, 330), ang = (h) => Math.abs(((h - t.from + 540) % 360) - 180), d = (h) => [Math.sin(h * Math.PI / 180), Math.cos(h * Math.PI / 180)], x = t.a * d(t.h1)[0] + t.b * d(t.h2)[0], y = t.a * d(t.h1)[1] + t.b * d(t.h2)[1];
  ok(t && ang(t.h1) >= 44.9 && ang(t.h2) >= 44.9 && t.a > 0 && t.b > 0 && Math.abs(Math.atan2(x, y) * 180 / Math.PI + 30) < 0.01, `${lat}° 迎风换舷：两舷都离来风 ≥45°、平均航向 330°（来风 ${t.from.toFixed(1)}°，换舷 ${t.h1.toFixed(1)}° / ${t.h2.toFixed(1)}°）`); }
ok(tackLegs(-15, 330) === null, '信风带顺风不用换舷');
ok(sailing(-30, 330).text.includes('麦哲伦') && !sailing(30, 330).text.includes('麦哲伦'), '只有 30°S 引麦哲伦');
process.exit(bad ? 1 : 0);
