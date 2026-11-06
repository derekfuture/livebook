// 核对大气受热过程和保温作用：node tools/geo/heat_check.mjs（必修1 第 34–35 页，图 2.9、图 2.10）
import { steady, step, day, range, fluxes, SKY } from '../../src/lessons/kit/heat.js';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
const d = day('clear'), m = range(d, 'moon'), g = range(d, 'ground');
ok(m.max > 90 && m.max < 130 && m.min < -110 && m.min > -170, `月球表面：白天约 ${m.max.toFixed(0)} ℃，夜里约 ${m.min.toFixed(0)} ℃（NASA 的量级：赤道附近约 120 ℃、−130 ℃）`);
ok(m.d > 8 * g.d, `月球表面昼夜温差（约 ${m.d.toFixed(0)} ℃）比地球表面（约 ${g.d.toFixed(0)} ℃）大得多（活动问题 3）`);
ok(g.max < 40 && g.min > -5, `地球表面（晴天）：约 ${g.min.toFixed(0)}–${g.max.toFixed(0)} ℃`);
const st = steady('clear'), f = fluxes(st, 12, 'clear').earth, F = fluxes(st, 12, 'clear').sun;
ok(f.reach > 0.5 * F && f.refl + f.atmAbsS < 0.5 * F, '太阳辐射小部分被大气吸收或反射，大部分到达地面（课本第 34 页）');
ok(SKY.clear.eps >= 0.75 && SKY.clear.eps <= 0.95, `地面长波辐射被大气吸收的比例 ${SKY.clear.eps * 100}%，在课本说的 75%—95% 里`);
ok(f.back > f.space * 1.3, `大气辐射大部分向下射向地面（大气逆辐射 ${f.back.toFixed(0)} 瓦/平方米），一小部分向上射向宇宙空间（${f.space.toFixed(0)}）（课本第 35 页）`);
const night = (sky) => { const s = { ...st }; for (let t = 0; t < 18; t += 0.25) step(s, t, 0.25, 'clear'); let mn = 1e9; for (let t = 18; t < 30; t += 0.25) { step(s, t, 0.25, sky); mn = Math.min(mn, s.g - 273.15); } return mn; };
const daym = (sky) => { const s = { ...st }; for (let t = 0; t < 6; t += 0.25) step(s, t, 0.25, 'clear'); let mx = -1e9; for (let t = 6; t < 18; t += 0.25) { step(s, t, 0.25, sky); mx = Math.max(mx, s.g - 273.15); } return mx; };
const nc = night('clear'), nk = night('cloud'), dc = daym('clear'), dk = daym('cloud');
ok(nk > nc + 3, `有云（浓密的低云）的夜里最低约 ${nk.toFixed(1)} ℃，晴夜约 ${nc.toFixed(1)} ℃：大气逆辐射更强，保温作用更强（课本第 35 页）`);
ok(dk < dc - 3, `有云的白天最高约 ${dk.toFixed(1)} ℃，晴天约 ${dc.toFixed(1)} ℃：云把更多太阳辐射反射回去`);
process.exit(bad ? 1 : 0);
