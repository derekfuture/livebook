// 大气受热过程和保温作用的教学模型（纯计算，活页 heat.js 和核对脚本共用）。课本必修1 第 34–35 页，图 2.9 大气的受热过程、图 2.10 地球和月球表面辐射过程。
// 同样的阳光照着月球和地球（大气上界每平方米接收的太阳辐射一样）；一天按 24 小时算（月球真正的一昼夜约等于地球上的一个月，这里画成一样长）。
// 月球：没有大气，表面直接吸收太阳辐射、直接向宇宙空间辐射。
// 地球：太阳辐射一小部分被大气（和云）反射、吸收，大部分到达地面；地面辐射的长波辐射绝大部分（课本：75%—95%）被大气吸收；
//       大气辐射一部分向上射向宇宙空间，大部分向下射向地面（大气逆辐射）。有云（浓密的低云）时，反射多、逆辐射更强。
// 数值都是示意（量级合理，只用来比较）：月球赤道附近白天约 120 ℃、夜里约 −130 ℃（NASA 的量级）；地球是一块地面加上面一层空气的小模型。
export const SIGMA = 5.67e-8, S0 = 1361, K0 = 273.15;
export const SKY = {
  clear: { name: '晴天', reflect: 0.1, absorb: 0.16, eps: 0.78, low: 8 },
  cloud: { name: '有云（浓密的低云）', reflect: 0.45, absorb: 0.2, eps: 0.98, low: 14 },          // 大气辐射向下的来自暖的低层（low：比整层空气暖多少；浓密的低云更暖），向上的来自冷的高层（比整层冷 12 度）：大部分向下
};
const MOON_A = 0.07, MOON_C = 22500, GROUND_A = 0.18, CG = 0.8e6, CA = 4.2e6, KH = 8;          // 反照率、热容量（焦/平方米·开）、地面和空气的热交换
/** 大气上界的太阳辐射（瓦/平方米）：6 时日出，18 时日落 */
export const toa = (t) => S0 * Math.max(0, Math.sin((Math.PI * (((t % 24) + 24) % 24 - 6)) / 12));
/** 这一刻的各种辐射（瓦/平方米） */
export function fluxes(st, t, sky) {
  const F = toa(t), P = SKY[sky], moonUp = SIGMA * st.m ** 4;
  const refl = F * P.reflect, atmAbsS = F * P.absorb, reach = F - refl - atmAbsS, groundRefl = reach * GROUND_A, groundUp = SIGMA * st.g ** 4, atmEmit = P.eps * SIGMA * (st.a - 12) ** 4, atmBack = P.eps * SIGMA * (st.a + P.low) ** 4;
  return { sun: F, moon: { sunIn: F, reflect: F * MOON_A, up: moonUp }, earth: { refl, atmAbsS, reach, groundRefl, groundUp, lwAbsorbed: groundUp * P.eps, lwEscape: groundUp * (1 - P.eps), back: atmBack, space: atmEmit } };
}
/** 往前走 dt 小时 */
export function step(st, t, dt, sky) {
  const n = Math.max(1, Math.ceil(dt / 0.05)), h = dt / n;
  for (let i = 0; i < n; i++) {
    const tt = t + i * h, f = fluxes(st, tt, sky), s = h * 3600, E = f.earth, sens = KH * (st.g - st.a);
    st.m += ((f.moon.sunIn - f.moon.reflect - f.moon.up) / MOON_C) * s;
    st.g += ((E.reach - E.groundRefl + E.back - E.groundUp - sens) / CG) * s;
    st.a += ((E.atmAbsS + E.lwAbsorbed - E.back - E.space + sens) / CA) * s;
    st.m = Math.max(40, st.m);
  }
  return st;
}
/** 一直这样的天气，过了很多天以后，午夜 0 时的样子 */
export function steady(sky) { const st = { m: 250, g: 290, a: 270 }; for (let d = 0; d < 40; d++) for (let t = 0; t < 24; t += 0.25) step(st, t, 0.25, sky); return st; }
/** 一天里每小时的温度（℃） */
export function day(sky) { const st = steady(sky), out = []; for (let t = 0; t <= 24; t += 0.25) { out.push({ t, moon: st.m - K0, ground: st.g - K0, air: st.a - K0 }); step(st, t, 0.25, sky); } return out; }
export const range = (arr, k) => { const v = arr.map((p) => p[k]); return { max: Math.max(...v), min: Math.min(...v), d: Math.max(...v) - Math.min(...v) }; };
