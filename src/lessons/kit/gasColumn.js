// 图 2.2-1，空气柱的长度用 m，压力表读绝对压强 Pa。忽略接管死体积和摩擦生热。
export const ROOM_T = 293.15,
  ATM = 101325,
  AREA = 1e-4; // 等截面 1.00 cm²。
const GAS_R = 8.314462618,
  GAMMA = 1.4,
  RELAXATION = 2.0;
export const MIN_LENGTH = 0.016,
  MAX_LENGTH = 0.042;
export function openAir(length) {
  return { length, temperature: ROOM_T, moles: (ATM * AREA * length) / (GAS_R * ROOM_T), pressure: ATM };
}
export function movePiston(state, length, dt, sealed) {
  if (!sealed) return openAir(length);
  // n Cᵥ dT = −p dV − n Cᵥ (T−T室) dt/τ。
  // 在一小段运动内取 d ln V /dt 为常量；即使快速拖动也保留压缩功和随后回温的过程。
  const exponent = -(GAMMA - 1) * Math.log(length / state.length) - dt / RELAXATION;
  const average = Math.abs(exponent) < 1e-7 ? 1 + exponent / 2 : Math.expm1(exponent) / exponent;
  const temperature = state.temperature * Math.exp(exponent) + ((ROOM_T * dt) / RELAXATION) * average;
  const pressure = (state.moles * GAS_R * temperature) / (AREA * length);
  return { length, temperature, moles: state.moles, pressure };
}
