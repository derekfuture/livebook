// 线圈轴竖直，正磁通向上。从上方看，逆时针电流为正。
// 条形磁体近似为轴线上的一列磁偶极子，各圆形匝所链磁通按高度平均。
export const COIL_RADIUS = 0.026;
export const COIL_HEIGHT = 0.045;
export const MAGNET_LENGTH = 0.1;
export const COIL_TURNS = 160;
const resistance = 85,
  inductance = 0.003;
const poleFlux = 0.000035; // 一匝的磁通尺度，Wb；用于本模型的磁体。

export function fluxLinkage(bottom, northDown) {
  let total = 0;
  const sample = 12;
  const axial = (z) => z / Math.hypot(COIL_RADIUS, z);
  for (let k = 0; k < sample; k++) {
    const near = bottom - (COIL_HEIGHT * (k + 0.5)) / sample;
    total += axial(near + MAGNET_LENGTH) - axial(near);
  }
  return ((northDown ? -1 : 1) * COIL_TURNS * poleFlux * total) / sample;
}

// 每段拖动取真实的磁通变化。在线性磁通变化近似下精确推进 RL 回路，开路只有感应电动势。
export function inductionStep(previousFlux, flux, dt, closed, current = 0) {
  if (!(dt > 0)) return { emf: 0, current: closed ? current : 0 };
  const emf = (previousFlux - flux) / dt;
  const steady = emf / resistance;
  const fraction = -Math.expm1((-dt * resistance) / inductance);
  return { emf, current: closed ? current + (steady - current) * fraction : 0 };
}
