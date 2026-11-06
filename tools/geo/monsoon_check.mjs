// 核对海陆分布对气压带的影响和东亚季风：node tools/geo/monsoon_check.mjs（选必1 第 50–53 页，图 3.14、图 3.15）
import { pressure, wind, windName, windFrom, cityWeather, CITY, shift } from '../../src/lessons/kit/monsoon.js';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
const dang = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const at = (x, lat, m) => pressure(x, lat, m), mean = (lat, m) => { let s = 0; for (let x = 0.62; x < 1; x += 0.02) s += pressure(x, lat, m); return s / 19; };
ok(at(0.32, 49, 1) > mean(49, 1) + 1, '冬季（1 月）陆地降温比海洋快，大陆上出现冷高压');
ok(at(0.32, 35, 7) < mean(35, 7) - 1, '夏季（7 月）陆地增温比海洋快，大陆上出现热低压');
let zonal = true; for (const lat of [10, 30, 50]) { let a = Infinity, b = -Infinity; for (let x = 0; x <= 1; x += 0.05) { const p = pressure(x, lat, 1, false); a = Math.min(a, p); b = Math.max(b, p); } if (b - a > 1e-9) zonal = false; } ok(zonal, '假如全是海洋：同一纬度气压一样，气压带呈带状分布');
let split = false; { let a = Infinity, b = -Infinity; for (let x = 0; x <= 1; x += 0.02) { const p = pressure(x, 60, 1); a = Math.min(a, p); b = Math.max(b, p); } split = b - a > 1; } ok(split, '有了大陆：冬季北纬 60° 一带的副极地低压被大陆上的冷高压切断，只留在海洋上（课本第 51 页）');
ok(shift(7) > 0 && shift(1) < 0, '气压带、风带的位置夏季偏北、冬季偏南');
const w1 = cityWeather(1), w7 = cityWeather(7);
ok(dang(windFrom(w1.w), 315) <= 30 && !w1.fromSea, `大陆东岸（约北纬 ${CITY.lat}°）冬季吹${w1.name}，从大陆吹来，干燥寒冷（冬季风）`);
ok(dang(windFrom(w7.w), 135) <= 30 && w7.fromSea, `夏季吹${w7.name}，从海上吹来，暖湿（东亚的东南季风）`);
ok(dang(windFrom(w1.w), windFrom(w7.w)) > 120, '一年中盛行风向随季节有规律地变换：季风');
const s1 = windFrom(wind(CITY.x, CITY.lat, 1, false)), s7 = windFrom(wind(CITY.x, CITY.lat, 7, false));
ok(dang(s1, s7) < 90, `假如全是海洋：这里冬季吹${windName(wind(CITY.x, CITY.lat, 1, false))}，夏季吹${windName(wind(CITY.x, CITY.lat, 7, false))}，没有冬夏相反的季风`);
ok(cityWeather(7, false).calm && cityWeather(7, false).name === '静风', '全海洋 7 月城市为静风，不定义方向');
ok(cityWeather(4.4).name === windName(wind(CITY.x, CITY.lat, 4.4)), '连续月份模型的城市和风场同源；界面统一吸附后再调用');
process.exit(bad ? 1 : 0);
