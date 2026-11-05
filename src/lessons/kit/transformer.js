// 可拆教学变压器。正弦稳态的有效值，暂态不在此模型内。
// 输入端 3 V，输出电压来自线圈互感；移动电表会改变测量支路。
export const TAP_TURNS = [0, 100, 200, 400];
export const SUPPLY_RMS = 3;
const sourceResistance = 0.45;
const resistancePerTurn = 0.012;

// 用有效值相量解电源和电表两条回路；同一绕组上两对抽头可以只重叠一部分。
export function transformerReadings({
  primary,
  secondary,
  coreClosed,
  energized,
  frequency = 50,
  meterSide = null,
  range = 50,
  meterTurns = meterSide === 'primary' ? primary : secondary,
  overlapTurns = Math.min(primary, meterTurns),
}) {
  if (!energized || !primary) return { primaryV: 0, secondaryV: 0, meterV: 0, sourceCurrent: 0 };
  const omega = 2 * Math.PI * frequency;
  const permeance = coreClosed ? 6e-6 : 0.12e-6,
    coupling = coreClosed ? 0.985 : 0.32;
  const xPerTurnSquared = omega * permeance;
  const meterR = range * 20e3;
  const same = meterSide === 'primary';
  const commonR = same ? resistancePerTurn * overlapTurns : 0;
  const mutualX = xPerTurnSquared * primary * meterTurns * (same ? 1 : coupling);
  const loadR = resistancePerTurn * meterTurns + meterR,
    loadX = xPerTurnSquared * meterTurns ** 2;
  const loadZ2 = loadR ** 2 + loadX ** 2;
  // ratio 是电表回路电流与电源回路电流的复数比值。
  const ratioR = meterSide ? -(commonR * loadR + mutualX * loadX) / loadZ2 : 0;
  const ratioX = meterSide ? -(mutualX * loadR - commonR * loadX) / loadZ2 : 0;
  const r = resistancePerTurn * primary + commonR * ratioR - mutualX * ratioX;
  const x = xPerTurnSquared * primary ** 2 + commonR * ratioX + mutualX * ratioR;
  const sourceCurrent = SUPPLY_RMS / Math.hypot(sourceResistance + r, x);
  const primaryV = sourceCurrent * Math.hypot(r, x);
  const meterV = meterR * sourceCurrent * Math.hypot(ratioR, ratioX);
  const secondaryV =
    meterSide === 'secondary'
      ? meterV
      : xPerTurnSquared *
        coupling *
        secondary *
        sourceCurrent *
        Math.hypot(primary + meterTurns * ratioR, meterTurns * ratioX);
  return { primaryV, secondaryV, meterV, sourceCurrent };
}
