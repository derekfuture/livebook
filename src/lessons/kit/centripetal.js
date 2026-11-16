// 右轴与摇柄同轴。皮带不打滑，两轮边缘的线速度相同。
export const GROOVES = [
  [0.049, 0.049],
  [0.032, 0.064],
];
export const FORCE_DIV = 0.02;
export function compareRotors(leftMass, leftRadius, groove, rightOmega) {
  const [leftPulley, rightPulley] = GROOVES[groove],
    leftOmega = (rightOmega * rightPulley) / leftPulley;
  return [
    { omega: leftOmega, force: leftMass * leftOmega ** 2 * leftRadius },
    { omega: rightOmega, force: 0.05 * rightOmega ** 2 * 0.06 },
  ];
}
export function isolatedFactor(mass, radius, groove) {
  if (mass <= 0) return null;
  const changed = [mass !== 0.05, radius !== 0.06, groove !== 0];
  return changed.filter(Boolean).length === 1 ? ['mass', 'radius', 'omega'][changed.indexOf(true)] : null;
}
