// 核对洋流：node tools/geo/current_check.mjs（选必1 第 68–71 页）
import { vel, kindOf, coastTemp, nOf, XW, XE } from '../../src/lessons/kit/current.js';
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
const dT = coastTemp(60, 'east') - coastTemp(60, 'west'); ok(dT > 12, `北纬 60°：大洋东岸比西岸暖 ${dT.toFixed(0)}℃（课本：最冷月高 16—20℃）`);
ok(Math.abs(V(XW + 0.01, 25)[1]) > 3 * Math.abs(V(XE - 0.01, 25)[1]), '大洋西岸的洋流比东岸快（示意的西部强化）');
process.exit(bad ? 1 : 0);
