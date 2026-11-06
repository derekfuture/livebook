// Scalar paraxial Fresnel propagation of a uniformly illuminated rectangular aperture.
// Fresnel-integral convention: NIST DLMF 7.2(iii); large-argument expansion 7.12(ii).
export const SLIT_WAVELENGTH = 650e-9,
  SLIT_DISTANCE = 0.55,
  SLIT_HEIGHT = 0.018;
const STEP = 0.001,
  LIMIT = 12,
  C = new Float64Array(LIMIT / STEP + 1),
  S = new Float64Array(C.length);
for (let i = 1; i < C.length; i++) {
  const a = (i - 1) * STEP,
    b = i * STEP,
    m = (a + b) / 2,
    k = Math.PI / 2;
  C[i] = C[i - 1] + (STEP / 6) * (Math.cos(k * a * a) + 4 * Math.cos(k * m * m) + Math.cos(k * b * b));
  S[i] = S[i - 1] + (STEP / 6) * (Math.sin(k * a * a) + 4 * Math.sin(k * m * m) + Math.sin(k * b * b));
}
export function fresnel(value) {
  if (!Number.isFinite(value)) throw new RangeError('Fresnel argument');
  const sign = value < 0 ? -1 : 1,
    x = Math.abs(value);
  if (x < LIMIT) {
    const q = x / STEP,
      i = Math.floor(q),
      f = q - i;
    return [sign * (C[i] + f * (C[i + 1] - C[i])), sign * (S[i] + f * (S[i + 1] - S[i]))];
  }
  const p = (Math.PI * x * x) / 2,
    t = 1 / (Math.PI * Math.PI * x ** 4),
    f = (1 - 3 * t + 105 * t * t - 10395 * t ** 3) / (Math.PI * x),
    g = (1 - 15 * t + 945 * t * t - 135135 * t ** 3) / (Math.PI * Math.PI * x ** 3);
  return [sign * (0.5 + f * Math.sin(p) - g * Math.cos(p)), sign * (0.5 - f * Math.cos(p) - g * Math.sin(p))];
}
export function slitIntensity(x, width, distance = SLIT_DISTANCE, wavelength = SLIT_WAVELENGTH) {
  if (![x, width, distance, wavelength].every(Number.isFinite) || width < 0 || distance <= 0 || wavelength <= 0)
    throw new RangeError('Invalid aperture');
  if (!width) return 0;
  const k = Math.sqrt(2 / (wavelength * distance)),
    a = fresnel(k * (x - width / 2)),
    b = fresnel(k * (x + width / 2));
  return 0.5 * ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2);
}
export function farFieldWidth(width, distance = SLIT_DISTANCE, wavelength = SLIT_WAVELENGTH) {
  return width > 0 ? (2 * wavelength * distance) / width : Infinity;
}
export function firstMinimum(width) {
  // Only used in the narrow-aperture validation, never as a substitute for the field image.
  const guess = (SLIT_WAVELENGTH * SLIT_DISTANCE) / width;
  let best = guess,
    low = Infinity;
  for (let i = 0; i <= 200; i++) {
    const x = guess * (0.75 + i * 0.0025),
      v = slitIntensity(x, width);
    if (v < low) {
      low = v;
      best = x;
    }
  }
  return best;
}
export function slitPixels(width, lit, { columns = 1024, rows = 256, fieldWidth = 0.04, fieldHeight = 0.045 } = {}) {
  const out = new Uint8ClampedArray(columns * rows * 4),
    vx = Array.from({ length: columns }, (_, i) =>
      slitIntensity(((i + 0.5) / columns - 0.5) * fieldWidth - width / 2, width),
    ),
    vy = Array.from({ length: rows }, (_, j) => slitIntensity(((j + 0.5) / rows - 0.5) * fieldHeight, SLIT_HEIGHT));
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < columns; i++) {
      const power = lit ? vx[i] * vy[j] : 0,
        tone = 1 - Math.exp(-8 * power),
        srgb = (v) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055),
        k = (j * columns + i) * 4;
      out[k] = srgb(0.002 + tone * 0.96);
      out[k + 1] = srgb(0.002 + tone * 0.006);
      out[k + 2] = srgb(0.002 + tone * 0.002);
      out[k + 3] = 255;
    }
  return out;
}
