// 核对气压带和风带：node tools/geo/belts_check.mjs（选必1 第 48–50 页）
import { windAt, relWind, beltNear } from '../../src/lessons/kit/belts.js';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
const eq = (a, b, m) => ok(a === b, `${m}：${a}${a === b ? '' : `（应为 ${b}）`}`);
eq(windAt(15).dir, '东北风', '北纬 15°（东北信风）'); eq(windAt(45).dir, '西南风', '北纬 45°（盛行西风）'); eq(windAt(75).dir, '东北风', '北纬 75°（极地东风）');
eq(windAt(-15).dir, '东南风', '南纬 15°（东南信风）'); eq(windAt(-45).dir, '西北风', '南纬 45°'); eq(windAt(-75).dir, '东南风', '南纬 75°');
eq(beltNear(30).name, '北半球副热带高压带', '北纬 30°'); eq(beltNear(-60).name, '南半球副极地低压带', '南纬 60°');
ok(windAt(0).speed < 0.2 && windAt(-30).speed < 0.2, '赤道、南纬 30° 附近风很小（课本：风平浪静、平静无风）');
// 麦哲伦：南美南端海峡（约 52°S）往西走 → 逆风；30°S 附近 → 平静；之后往西北走、受东南信风 → 顺风
eq(relWind(-48, 270).rel, '逆风', '南纬 48° 往西走（盛行西风）'); eq(relWind(-30, 315).rel, '平静无风', '南纬 30° 附近'); eq(relWind(-15, 315).rel, '顺风', '南纬 15° 往西北走（东南信风）');
ok(beltNear(35, 5).name === '北半球副热带高压带' && beltNear(30, 5)?.lat === 30, '7 月（偏北 5°）：北纬 35° 附近是副热带高压带');
eq(windAt(30, 0, false).dir, '北风', '假如地球不自转：北半球近地面吹北风（不偏转）');
process.exit(bad ? 1 : 0);
