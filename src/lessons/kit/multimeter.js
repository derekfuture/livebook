// 练习用模拟表的电路参数。串联式欧姆挡已调零时，表盘半偏处刻 20 Ω，再乘倍率。
export const OHM_CENTER = 20;
const OHM_BATTERY = 1.5;
export const METER_STOPS = [
  { label: 'OFF', mode: 'off' },
  { label: '×1', mode: 'ohm', multiplier: 1 },
  { label: '×10', mode: 'ohm', multiplier: 10 },
  { label: '×100', mode: 'ohm', multiplier: 100 },
  { label: '2.5 V', mode: 'volt', range: 2.5 },
  { label: '10 V', mode: 'volt', range: 10 },
  { label: '50 mA', mode: 'amp', range: 0.05 },
  { label: '500 mA', mode: 'amp', range: 0.5 },
];

// 端子顺序为红、黑。欧姆挡的表内电源使黑表笔成为向外供电的一端。
export function meterBranch(stop, trim) {
  if (stop.mode === 'ohm') return { R: OHM_CENTER * stop.multiplier * (1 + trim), E: OHM_BATTERY };
  if (stop.mode === 'volt') return { R: stop.range / 50e-6 };
  if (stop.mode === 'amp') return { R: 0.1 / stop.range };
  return { R: Infinity };
}
export function meterFraction(stop, branch) {
  if (stop.mode === 'volt') return branch.U / stop.range;
  if (stop.mode === 'amp') return branch.I / stop.range;
  if (stop.mode === 'ohm') return branch.I / (OHM_BATTERY / (OHM_CENTER * stop.multiplier));
  return 0;
}
export function ohmScaleValue(fraction) {
  return fraction > 0 ? OHM_CENTER * (1 / fraction - 1) : Infinity;
}
