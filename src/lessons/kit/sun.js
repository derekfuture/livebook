// 太阳在天上的位置（不计大气折射，和课本一致；时刻都是地方时）。高中地理“地球运动的地理意义”用，tools/geo/sun_check.mjs 自动核对。
//   太阳直射点纬度 δ = asin(sin ε · sin λ)，ε = 23°26′，λ 是太阳黄经（春分 0°、夏至 90°……）；
//   太阳高度 sin h = sin φ sin δ + cos φ cos δ cos t（t 是时角：正午 0，每小时 15°）；正午太阳高度 a = 90° − |φ − δ|；
//   昼长：cos t₀ = −tan φ · tan δ，昼长 = 2t₀ / 15°。坐标：东 +x，北 −z，上 +y。
import * as THREE from 'three';

export const D2R = Math.PI / 180, R2D = 180 / Math.PI;
export const EPS = (23 + 26 / 60) * D2R;          // 黄赤交角 23°26′（课本）
export const decOf = (lam) => Math.asin(Math.sin(EPS) * Math.sin(lam * D2R));
/** 角度写成 度°分′：73°26′ */
export const dm = (r) => { const d = Math.abs(r * R2D); let a = Math.floor(d + 1e-9), m = Math.round((d - a) * 60); if (m === 60) { a++; m = 0; } return `${a}°${m ? String(m).padStart(2, '0') + '′' : ''}`; };
/** 时刻 h（小时）写成 7:25 */
export const hm = (h) => { h = ((h % 24) + 24) % 24; let H = Math.floor(h), M = Math.round((h - H) * 60); if (M === 60) { H++; M = 0; } return `${H}:${String(M).padStart(2, '0')}`; };
/** 时长（小时）：不取模——24 小时就是 24 小时（极昼），0 就是极夜 */
export const dur = (h) => { const mins = Math.round(h * 60); return h >= 24 - 1e-6 ? '24 小时（极昼）' : h <= 1e-6 ? '0（极夜）' : `${Math.floor(mins / 60)} 小时 ${String(mins % 60).padStart(2, '0')} 分`; };
/** 太阳高度（弧度）：负的说成“在地平线下” */
export const altText = (r) => (r >= 0 ? dm(r) : `地平线下 ${dm(-r)}`);
/** 方位（从正北顺时针，弧度）→ 正北 / 东北 / 正东 …… */
export const dirName = (az) => { const a = ((az * R2D) % 360 + 360) % 360, near = (x) => Math.abs(((a - x + 540) % 360) - 180) < 0.5; return near(0) ? '正北' : near(90) ? '正东' : near(180) ? '正南' : near(270) ? '正西' : a < 90 ? '东北' : a < 180 ? '东南' : a < 270 ? '西南' : '西北'; };
/** 太阳：纬度 lat、直射点纬度 dec、时角 t（弧度）→ 高度、方位（从正北顺时针）、方向 */
export function sunAt(lat, dec, t) {
  const sh = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(t), alt = Math.asin(Math.max(-1, Math.min(1, sh)));
  const east = -Math.sin(t) * Math.cos(dec), north = Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(t);
  const az = Math.hypot(east, north) < 1e-12 ? null : Math.atan2(east, north);          // 天顶和天底方位未定义，不能把 atan2(0, 0) 当北方
  return { alt, az, dir: new THREE.Vector3(east, sh, -north) };
}
/** 半昼弧 t₀（弧度）：极昼 π，极夜 0 */
export const halfDay = (lat, dec) => { const c = -Math.tan(lat) * Math.tan(dec); return c <= -1 ? Math.PI : c >= 1 ? 0 : Math.acos(c); };
/** 正午太阳高度 a = 90° − |φ − δ| */
export const noonAlt = (lat, dec) => Math.PI / 2 - Math.abs(lat - dec);

/** 拖动进入节气附近时吸附，画面与记录共用准确黄经。 */
export const snapSeason = (lam) => { const a = ((lam % 360) + 360) % 360, k = (Math.round(a / 90) * 90) % 360; return Math.abs(((a - k + 540) % 360) - 180) < 4 ? k : a; };
/** 天顶无南北方位，几何地平线与地平线下分开。 */
export const noonText = (lat, dec) => { const a = noonAlt(lat, dec); return Math.abs(lat - dec) < 1e-9 ? '正午太阳高度 90°（在头顶）' : Math.abs(a) < 1e-9 ? '正午太阳高度 0°（在地平线上）' : a < 0 ? '正午太阳也在地平线下' : `正午太阳高度 ${dm(a)}（在${lat > dec ? '南' : '北'}边）`; };
/** 平面天空图的方位接缝不能连线。 */
export const skyJoin = (x, prev, width) => Math.abs(x - prev) <= width / 2;

/** 天空示意投影：地平方位从左向右递增，高度越高横向越收束，天顶为唯一点；不是等距照片。 */
export const skyX = (az, alt, south, width) => az === null ? width / 2 : width / 2 + ((((az * R2D - (south ? 180 : 0) + 540) % 360) - 180) / 180) * width / 2 * Math.cos(alt);
// 方位定义和天顶退化参见 NOAA：https://gml.noaa.gov/grad/solcalc/solareqns.PDF
