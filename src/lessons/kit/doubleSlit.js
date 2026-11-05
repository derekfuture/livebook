// 尺寸一律用 SI 单位。垂直狭缝，两个相干缝中心关于轴线对称，屏垂直于轴线。
export const FILTER_WAVELENGTH = { red: 650e-9, blue: 460e-9 };
export const SLIT_SEPARATIONS = [0.36e-3, 0.18e-3];
const slitWidth = 0.045e-3;

export function stripeIntensity(x, length, separation, wavelength) {
  const farther = Math.hypot(length, x + separation / 2);
  const nearer = Math.hypot(length, x - separation / 2);
  // 两路程作平方差，避免直接相减损失精度。
  const difference = (2 * x * separation) / (farther + nearer);
  const beta = (Math.PI * slitWidth * x) / (wavelength * Math.hypot(length, x));
  const envelope = Math.abs(beta) < 1e-8 ? 1 : (Math.sin(beta) / beta) ** 2;
  return envelope * Math.cos((Math.PI * difference) / wavelength) ** 2;
}

// 学生读出两端亮纹中心及包含两端的亮纹条数。教材采用小角近似。
export function measuredWavelength(first, last, stripes, length, separation) {
  if (![first, last, length, separation].every(Number.isFinite) || first === last ||
      length <= 0 || separation <= 0 || !Number.isInteger(stripes) || stripes < 2) return null;
  return (separation * Math.abs(last - first)) / ((stripes - 1) * length);
}
