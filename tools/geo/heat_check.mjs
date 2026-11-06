// 核对大气受热过程和保温作用：node tools/geo/heat_check.mjs（必修1 第 34–35 页，图 2.9、图 2.10）
import { steady, step, day, range, fluxes, SKY, advanceComparison, surfaceShortwave } from '../../src/lessons/kit/heat.js';
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
for (const sky of ['clear', 'cloud']) {
  const f = fluxes(st, 12, sky), sw = surfaceShortwave(f);
  ok(Math.abs(sw.moonAbsorb + sw.moonReflect - f.sun) < 1e-9 && Math.abs(sw.groundAbsorb + sw.groundReflect + f.earth.refl + f.earth.atmAbsS - f.sun) < 1e-9, `${sky}：吸收和反射短波粒子守恒`);
  ok(Math.abs(sw.moonReflect / f.sun - 0.07) < 1e-9 && Math.abs(sw.groundReflect / f.earth.reach - 0.18) < 1e-9, `${sky}：月面反射 7%，地面反射到达短波的 18%`);
}
for (const increment of [0.25, 0.37, 20]) {
  const S = { t: 0, sky: 'clear', st: steady('clear'), seg: null }, records = [];
  while (S.t < 18 - 1e-9) advanceComparison(S, Math.min(increment, 18 - S.t), undefined, (r) => records.push(r));
  ok(S.t === 18 && S.st.g === S.seg.twin.g && S.seg.min === S.seg.tmin, `步长 ${increment}：18 时两组从完全相同状态起步`);
  const ref = { ...S.st }; let min = ref.g - 273.15;
  while (S.t < 30 - 1e-9) {
    const dt = Math.min(increment, 30 - S.t), t = S.t;
    advanceComparison(S, dt, undefined, (r) => records.push(r));
    let at = t; while (at < t + dt - 1e-10) { const h = Math.min(0.25, t + dt - at); step(ref, at, h, 'clear'); at += h; min = Math.min(min, ref.g - 273.15); }
  }
  const r = records.find((r) => r.key === 'n');
  ok(r && Math.abs(r.min - min) < 1e-8 && r.min <= S.st.g - 273.15 + 1e-9 && S.st.g === S.seg.twin.g, `步长 ${increment}：夜间极值包含次日 6 时端点，新白天无重复积分`);
}
const changed = { t: 6, sky: 'clear', st: steady('clear'), seg: null }; let completed = 0;
advanceComparison(changed, 2); changed.sky = 'cloud'; advanceComparison(changed, 10, undefined, () => completed++);
ok(completed === 0, '中途换天气不冒充完整同天气时段对照');
const boundarySwitch = { t: 6, sky: 'clear', st: steady('clear'), seg: null }; let switched = null;
advanceComparison(boundarySwitch, 12); boundarySwitch.sky = 'cloud'; advanceComparison(boundarySwitch, 12, undefined, (r) => { switched = r; });
ok(switched?.sky === 'cloud' && switched.whole, '恰在 18 时换天气，下一整夜仍是有效对照');
process.exit(bad ? 1 : 0);
