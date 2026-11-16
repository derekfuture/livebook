// 图 10.4-1 的串联 RC 支路，取充电方向为电流正方向。数字电压表视为理想表。
export const CAPACITANCE = 2200e-6;
export const SERIES_OHMS = 1000;
export const SOURCE_VOLTS = 6;

// 单刀双掷开关 1 接电源，2 接放电回路；中位断开时电容仍保留原来的电压。
export function observeCapacitor(voltage, contact, dt) {
  const target = contact === 1 ? SOURCE_VOLTS : 0;
  const delta = contact === 0 ? 0 : (target - voltage) * -Math.expm1(-dt / (SERIES_OHMS * CAPACITANCE));
  const next = voltage + delta;
  return {
    voltage: next,
    current: contact === 0 ? 0 : (target - next) / SERIES_OHMS,
    charge: CAPACITANCE * next,
    transferred: CAPACITANCE * delta,
  };
}
