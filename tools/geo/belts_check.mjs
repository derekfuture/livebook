// 核对气压带和风带：node tools/geo/belts_check.mjs（选必1 第 48–50 页）
import { windAt, relWind, beltNear } from '../../src/lessons/kit/belts.js';
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
process.exit(bad ? 1 : 0);
