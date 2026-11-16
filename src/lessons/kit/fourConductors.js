// 必修三 p.58 图11.2-2，材料电阻率取本书 p.59 的 20℃ 表。
// 尺寸、3V电源、20Ω变阻器和1MΩ电压表是本活页的名义配置。
// 固定温度的欧姆导体近似；用于短时通电比较，不模拟自热。
export const FOUR_SAMPLES = Object.freeze(
  [
    { id: 'a', length: 0.24, area: Math.PI * 1e-8, rho: 1e-6, material: '镍铬', label: 'a  镍铬 · l · S' },
    { id: 'b', length: 0.48, area: Math.PI * 1e-8, rho: 1e-6, material: '镍铬', label: 'b  镍铬 · 2l · S' },
    { id: 'c', length: 0.24, area: Math.PI * 2e-8, rho: 1e-6, material: '镍铬', label: 'c  镍铬 · l · 2S' },
    { id: 'd', length: 0.24, area: Math.PI * 1e-8, rho: 4.4e-7, material: '锰铜', label: 'd  锰铜 · l · S' },
  ].map(Object.freeze),
);
export const FOUR_SOURCE = Object.freeze({ cells: 2, emf: 1.5, r: 0.15 });
export const FOUR_RMAX = 20;
export const FOUR_METER_OHMS = 1e6;
export const FOUR_WIRING = Object.freeze(
  [
    ['E.+', 'S.a'],
    ['S.b', 'P.A'],
    ['P.C', 'a.a'],
    ['a.b', 'b.a'],
    ['b.b', 'c.a'],
    ['c.b', 'd.a'],
    ['d.b', 'E.-'],
  ].map(Object.freeze),
);
export function sampleResistance({ rho, length, area }) {
  if (![rho, length, area].every((v) => Number.isFinite(v) && v > 0)) throw new RangeError('导体参数必须为正有限数');
  return (rho * length) / area;
}
export function sampleContact(red, black) {
  return (
    FOUR_SAMPLES.find(
      (s) => (red === s.id + '.a' && black === s.id + '.b') || (red === s.id + '.b' && black === s.id + '.a'),
    )?.id || null
  );
}
