// 太阳在天上的位置（不计大气折射，和课本一致；时刻都是地方时）。高中地理“地球运动的地理意义”用，tools/geo/sun_check.mjs 自动核对。
//   太阳直射点纬度 δ = asin(sin ε · sin λ)，ε = 23°26′，λ 是太阳黄经（春分 0°、夏至 90°……）；
//   太阳高度 sin h = sin φ sin δ + cos φ cos δ cos t（t 是时角：正午 0，每小时 15°）；正午太阳高度 a = 90° − |φ − δ|；
//   昼长：cos t₀ = −tan φ · tan δ，昼长 = 2t₀ / 15°。坐标：东 +x，北 −z，上 +y。
import * as THREE from 'three';

export const D2R = Math.PI / 180, R2D = 180 / Math.PI;
export const EPS = (23 + 26 / 60) * D2R;                       // 黄赤交角 23°26′（课本）
export const decOf = (lam) => Math.asin(Math.sin(EPS) * Math.sin(lam * D2R));
/** 角度写成 度°分′：73°26′ */
export const dm = (r) => { const d = Math.abs(r * R2D); let a = Math.floor(d + 1e-9), m = Math.round((d - a) * 60); if (m === 60) { a++; m = 0; } return `${a}°${m ? String(m).padStart(2, '0') + '′' : ''}`; };
/** 时刻 h（小时）写成 7:25 */
export const hm = (h) => { h = ((h % 24) + 24) % 24; let H = Math.floor(h), M = Math.round((h - H) * 60); if (M === 60) { H++; M = 0; } return `${H}:${String(M).padStart(2, '0')}`; };
/** 方位（从正北顺时针，弧度）→ 正北 / 东北 / 正东 …… */
export const dirName = (az) => { const a = ((az * R2D) % 360 + 360) % 360, near = (x) => Math.abs(((a - x + 540) % 360) - 180) < 0.5; return near(0) ? '正北' : near(90) ? '正东' : near(180) ? '正南' : near(270) ? '正西' : a < 90 ? '东北' : a < 180 ? '东南' : a < 270 ? '西南' : '西北'; };
/** 太阳：纬度 lat、直射点纬度 dec、时角 t（弧度）→ 高度、方位（从正北顺时针）、方向 */
export function sunAt(lat, dec, t) {
  const sh = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(t), alt = Math.asin(Math.max(-1, Math.min(1, sh)));
  const az = Math.atan2(-Math.sin(t) * Math.cos(dec), Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(t));
  return { alt, az, dir: new THREE.Vector3(Math.sin(az) * Math.cos(alt), Math.sin(alt), -Math.cos(az) * Math.cos(alt)) };
}
/** 半昼弧 t₀（弧度）：极昼 π，极夜 0 */
export const halfDay = (lat, dec) => { const c = -Math.tan(lat) * Math.tan(dec); return c <= -1 ? Math.PI : c >= 1 ? 0 : Math.acos(c); };
/** 正午太阳高度 a = 90° − |φ − δ| */
export const noonAlt = (lat, dec) => Math.PI / 2 - Math.abs(lat - dec);
