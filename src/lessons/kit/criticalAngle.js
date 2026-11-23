// 非偏振单色光由玻璃射向空气。功率分数以平面界面处的入射光为基准。
export const GLASS_INDEX = 1.5;
export const CRITICAL_DEGREES = (Math.asin(1 / GLASS_INDEX) * 180) / Math.PI;

export function flatFace(angleDegrees) {
  const i = (angleDegrees * Math.PI) / 180;
  const sinR = GLASS_INDEX * Math.sin(i);
  if (sinR >= 1) return { refracted: null, reflectance: 1, transmittance: 0 };
  const cosI = Math.cos(i),
    cosR = Math.sqrt(1 - sinR * sinR);
  const rs = (GLASS_INDEX * cosI - cosR) / (GLASS_INDEX * cosI + cosR);
  const rp = (cosI - GLASS_INDEX * cosR) / (cosI + GLASS_INDEX * cosR);
  const reflectance = (rs * rs + rp * rp) / 2;
  return { refracted: Math.asin(sinR), reflectance, transmittance: 1 - reflectance };
}
