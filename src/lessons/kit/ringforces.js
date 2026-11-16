// 水平纸板上，橡皮条和两只测力计只能拉，不能推。长度单位 m。
export const FIXED = { x: -0.3, z: 0 };
export const RUBBER_LENGTH = 0.16;
export const RUBBER_K = 20;
export const CORD_LENGTH = 0.055;

function tension(point, anchor, rest, stiffness) {
  const dx = anchor.x - point.x,
    dz = anchor.z - point.z,
    length = Math.hypot(dx, dz);
  const force = Math.max(0, length - rest) * stiffness;
  return { fx: length ? (force * dx) / length : 0, fz: length ? (force * dz) / length : 0, force };
}

// 轻质环逐次移向合力方向，直到净力可忽略，相当于求各弹性势能之和的极小值。
export function balanceRing(start, handles, meterRest, perNewton) {
  // 只有一条细绳绷紧时，橡皮条、环和该表共线。两段伸长之和给出共同的张力。
  for (const h of handles) {
    const dx = h.x - FIXED.x,
      dz = h.z - FIXED.z,
      distance = Math.hypot(dx, dz);
    const force = (distance - RUBBER_LENGTH - meterRest) / (1 / RUBBER_K + perNewton);
    if (force <= 0) continue;
    const fraction = (RUBBER_LENGTH + force / RUBBER_K) / distance;
    const point = { x: FIXED.x + dx * fraction, z: FIXED.z + dz * fraction };
    if (handles.some((other) => other !== h && Math.hypot(other.x - point.x, other.z - point.z) > meterRest)) continue;
    return {
      point,
      rubber: tension(point, FIXED, RUBBER_LENGTH, RUBBER_K),
      readings: handles.map((anchor) => tension(point, anchor, meterRest, 1 / perNewton)),
    };
  }
  const point = { ...start },
    step = 1 / (RUBBER_K + handles.length / perNewton);
  for (let i = 0; i < 300; i++) {
    const rubber = tension(point, FIXED, RUBBER_LENGTH, RUBBER_K);
    const readings = handles.map((h) => tension(point, h, meterRest, 1 / perNewton));
    const fx = readings.reduce((sum, f) => sum + f.fx, rubber.fx),
      fz = readings.reduce((sum, f) => sum + f.fz, rubber.fz);
    if (Math.hypot(fx, fz) < 1e-7 || i === 299) return { point, readings, rubber };
    point.x += fx * step;
    point.z += fz * step;
  }
}
