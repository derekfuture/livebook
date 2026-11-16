import { DAYLIGHT_LUX, STRAY_LUX, photoResistance } from './lightSwitch.js';

// 手掌与手指的投影几何，供遮挡计算和器材造型共用。单位m，掌心为原点。
export const SHADE_PALM = Object.freeze({ rx: 0.034, rz: 0.032 });
export const SHADE_FINGERS = Object.freeze([
  Object.freeze({ x1: -0.025, z1: -0.018, x2: -0.027, z2: -0.053, r: 0.007 }),
  Object.freeze({ x1: -0.009, z1: -0.021, x2: -0.01, z2: -0.064, r: 0.007 }),
  Object.freeze({ x1: 0.008, z1: -0.021, x2: 0.009, z2: -0.061, r: 0.007 }),
  Object.freeze({ x1: 0.024, z1: -0.018, x2: 0.028, z2: -0.048, r: 0.006 }),
  Object.freeze({ x1: 0.025, z1: 0.009, x2: 0.047, z2: -0.006, r: 0.009 }),
]);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const finitePoint = (p) => p && [p.x, p.y, p.z].every(Number.isFinite);
export function handCoverage(x, z) {
  let inside = (1 - Math.hypot(x / SHADE_PALM.rx, z / SHADE_PALM.rz)) * Math.min(SHADE_PALM.rx, SHADE_PALM.rz);
  for (const f of SHADE_FINGERS) {
    const dx = f.x2 - f.x1,
      dz = f.z2 - f.z1;
    const t = clamp(((x - f.x1) * dx + (z - f.z1) * dz) / (dx * dx + dz * dz), 0, 1);
    inside = Math.max(inside, f.r - Math.hypot(x - f.x1 - t * dx, z - f.z1 - t * dz));
  }
  // 亚毫米边界用于面积采样抗锯齿，不把手掌当作半透明材料。
  return clamp(0.5 + inside / 0.0007, 0, 1);
}
function transmission(from, to, shade) {
  if (!shade || shade.y <= from.y || shade.y >= to.y) return 1;
  const t = (shade.y - from.y) / (to.y - from.y);
  return 1 - handCoverage(from.x + (to.x - from.x) * t - shade.x, from.z + (to.z - from.z) * t - shade.z);
}
const sensorSamples = Array.from({ length: 48 }, (_, i) => {
  const ring = Math.floor(i / 12),
    a = (((i % 12) + 0.5 * (ring % 2)) * Math.PI) / 6;
  const r = 0.01 * Math.sqrt((ring + 0.5) / 4);
  return { x: r * Math.cos(a), z: r * Math.sin(a) };
});

// 室内漫射照明作角度采样；附加强光源朝竖直下方，采用cos^4发光分布。
// 未模拟光谱、热效应和真实照度标定。手的位置改变遮光程度，不能切换预置读数。
export function photoIlluminance({ sensor = { x: 0, y: 0.02, z: 0 }, shade = null, lamp = null } = {}) {
  if (
    !finitePoint(sensor) ||
    (shade && !finitePoint(shade)) ||
    (lamp && (!finitePoint(lamp) || lamp.y <= sensor.y || !Number.isFinite(lamp.intensity) || lamp.intensity < 0))
  )
    throw new RangeError('光源、遮光手和元件坐标须有效');
  let room = 0,
    direct = 0;
  for (const offset of sensorSamples) {
    const p = { x: sensor.x + offset.x, y: sensor.y, z: sensor.z + offset.z };
    for (const x of [-0.07, 0, 0.07])
      for (const z of [-0.07, 0, 0.07])
        room += transmission(p, { x: sensor.x + x, y: sensor.y + 0.28, z: sensor.z + z }, shade) / 9;
    if (lamp) {
      const dy = lamp.y - p.y,
        r = Math.hypot(lamp.x - p.x, dy, lamp.z - p.z),
        cosine = dy / r;
      direct += ((lamp.intensity * cosine ** 5) / (r * r)) * transmission(p, lamp, shade);
    }
  }
  return STRAY_LUX + ((DAYLIGHT_LUX - STRAY_LUX) * room) / sensorSamples.length + direct / sensorSamples.length;
}

// 与已有光控开关使用同一名义光敏电阻曲线。电导的一阶响应仅作定性近似；
// 不声称匹配某一具体型号的响应时间、暗恢复记忆、温度系数或光谱。
export function photoresistorState({ initialLux = DAYLIGHT_LUX, regularResistance = 2000 } = {}) {
  if (!Number.isFinite(initialLux) || initialLux < 0 || !Number.isFinite(regularResistance) || regularResistance <= 0)
    throw new RangeError('初始光照非负，普通电阻阻值为正');
  let conductance = 1 / photoResistance(initialLux);
  return {
    get resistance() {
      return 1 / conductance;
    },
    regularResistance,
    step(dt, lux) {
      if (!Number.isFinite(dt) || dt < 0 || !Number.isFinite(lux) || lux < 0)
        throw new RangeError('时间和照度须为非负有限数');
      const target = 1 / photoResistance(lux),
        tau = target > conductance ? 0.06 : 0.12;
      conductance = target + (conductance - target) * Math.exp(-dt / tau);
      return 1 / conductance;
    },
  };
}
