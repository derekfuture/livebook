// 干簧管感应轴向磁场。小条形磁体用两磁极近似，尺寸以 m、磁感应强度以 T 表示。
const halfLength = 0.006,
  poleStrength = 0.65e-6;
export function axialField(magnet, axis, reed, reedAxis) {
  let field = 0;
  for (const sign of [-1, 1]) {
    const dx = reed.x - magnet.x - sign * halfLength * axis.x;
    const dy = reed.y - magnet.y - sign * halfLength * axis.y;
    const dz = reed.z - magnet.z - sign * halfLength * axis.z;
    const r2 = dx * dx + dy * dy + dz * dz + 0.002 ** 2;
    field += (sign * poleStrength * (dx * reedAxis.x + dy * reedAxis.y + dz * reedAxis.z)) / (r2 * Math.sqrt(r2));
  }
  return field;
}
export function reedClosed(field, wasClosed) {
  // 吸合所需的磁场比保持吸合所需的磁场强；这些阈值是这只模拟干簧管的参数。
  return Math.abs(field) >= (wasClosed ? 0.00085 : 0.0015);
}
export function alarmState() {
  return { reed: false, current: 0, pulled: false, travel: 0, contact: 'b', ledCurrent: 0, buzzing: false };
}
export function stepAlarm(state, dt, { field, power, coilWire, commonWire, ledWire, buzzerWire }) {
  const reed = reedClosed(field, state.reed);
  const target = power && reed && coilWire ? 6 / 120 : 0;
  const current = state.current + (target - state.current) * -Math.expm1(-dt / 0.008);
  const pulled = current >= (state.pulled ? 0.012 : 0.03);
  const travel = state.travel + ((pulled ? 1 : 0) - state.travel) * -Math.expm1(-dt / 0.012);
  const contact = travel < 0.08 ? 'b' : travel > 0.92 ? 'a' : null;
  const supply = power && commonWire && contact !== null;
  return {
    reed,
    current,
    pulled,
    travel,
    contact,
    ledCurrent: supply && contact === ledWire ? (6 - 2.1) / 330 : 0,
    buzzing: !!(supply && contact === buzzerWire),
  };
}
