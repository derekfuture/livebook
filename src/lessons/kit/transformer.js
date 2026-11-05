// 可拆教学变压器。正弦稳态的有效值，暂态不在此模型内。
// 输入端 3 V，输出电压来自线圈互感；移动电表会改变测量支路。
export const TAP_TURNS = [0, 100, 200, 400];
export const SUPPLY_RMS = 3;
const sourceResistance = 0.45;
const resistancePerTurn = 0.012;

// 电阻 r 与电抗 x 表示同一个复阻抗的实、虚部。
export function transformerReadings({
  primary,
  secondary,
  coreClosed,
  energized,
  frequency = 50,
  meterSide = null,
  range = 50,
}) {
  if (!energized || !primary) return { primaryV: 0, secondaryV: 0, sourceCurrent: 0 };
  const omega = 2 * Math.PI * frequency;
  const permeance = coreClosed ? 6e-6 : 0.12e-6;
  const coupling = coreClosed ? 0.985 : 0.32;
  const mutualX = omega * coupling * permeance * primary * secondary;
  const secondaryX = omega * permeance * secondary ** 2;
  const meterR = range * 20e3; // 模型表的交流电压挡内阻。
  const loaded = meterSide === 'secondary';
  const loadR = resistancePerTurn * secondary + meterR;
  const loadZ2 = loadR ** 2 + secondaryX ** 2;
  const reflected = loaded ? mutualX ** 2 / loadZ2 : 0;
  const r = resistancePerTurn * primary + reflected * loadR;
  const x = omega * permeance * primary ** 2 - reflected * secondaryX;
  const z2 = r * r + x * x;
  const conductance = r / z2 + (meterSide === 'primary' ? 1 / meterR : 0);
  const susceptance = -x / z2;
  const primaryV = SUPPLY_RMS / Math.hypot(1 + sourceResistance * conductance, sourceResistance * susceptance);
  const inducedV = (mutualX * primaryV) / Math.sqrt(z2);
  return {
    primaryV,
    secondaryV: loaded ? (inducedV * meterR) / Math.sqrt(loadZ2) : inducedV,
    sourceCurrent: primaryV * Math.hypot(conductance, susceptance),
  };
}
