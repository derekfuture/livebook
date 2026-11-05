// 水平气垫导轨；单位 m、s、kg。滑块质心沿 x 轴运动，遮光片固定在各自质心上方。
export const FLAG_WIDTH = 0.01;
export const GLIDER_LENGTH = 0.11;
export const GATES = [-0.27, 0.27];
const LIMIT = 0.56; // 滑块质心到达端部缓冲器时的边界
export function impactSpeeds(m1, m2, u1, u2, restitution) {
  const center = (m1 * u1 + m2 * u2) / (m1 + m2);
  const separating = restitution * (u1 - u2);
  return [center - (m2 * separating) / (m1 + m2), center + (m1 * separating) / (m1 + m2)];
}

// 光束被整个遮光片遮住的时间。记录必须完整地落在这一段匀速行程内。
function passage(segment, gate) {
  const { start, end, x, v } = segment;
  if (Math.abs(v) < 1e-9) return null;
  const middle = start + (gate - x) / v,
    half = FLAG_WIDTH / (2 * Math.abs(v));
  if (middle - half < start - 1e-9 || middle + half > end + 1e-9) return null;
  return { enter: middle - half, exit: middle + half, direction: Math.sign(v) };
}

export function gliderTrial({ m1, m2, launch, restitution, x1 = -0.46, x2 = 0 }) {
  if (
    !(
      m1 > 0 &&
      m2 > 0 &&
      launch > 0 &&
      x2 - x1 > GLIDER_LENGTH &&
      x2 < LIMIT &&
      x1 > -LIMIT &&
      restitution >= 0 &&
      restitution <= 1
    )
  )
    throw new RangeError('滑块应在导轨上分开，左块向右接近右块。');
  const collision = (x2 - x1 - GLIDER_LENGTH) / launch;
  const after = impactSpeeds(m1, m2, launch, 0, restitution);
  const starts = [x1, x2],
    before = [launch, 0],
    atImpact = [x2 - GLIDER_LENGTH, x2];
  const stops = after.map((v, i) =>
    Math.abs(v) < 1e-9 ? Infinity : collision + ((v > 0 ? LIMIT : -LIMIT) - atImpact[i]) / v,
  );
  if (restitution === 0) stops.fill(Math.min(...stops));
  // 领先块碰上挡块后，若后车追上它，后续属于第二次碰撞，不再计入本轮。
  let end = Math.max(...stops.filter(Number.isFinite));
  if (restitution > 0 && after[0] > 1e-9 && stops[1] < stops[0])
    end = Math.min(end, collision + (LIMIT - GLIDER_LENGTH - atImpact[0]) / after[0]);
  const legs = starts.map((x, i) => [
    { start: 0, end: collision, x, v: before[i] },
    { start: collision, end: Math.min(stops[i], end), x: atImpact[i], v: after[i] },
  ]);
  const events = [];
  legs.forEach((paths, glider) =>
    paths.forEach((segment, stage) =>
      GATES.forEach((x, gate) => {
        const crossing = passage(segment, x);
        if (crossing) events.push({ ...crossing, glider, gate, stage });
      }),
    ),
  );
  events.sort((a, b) => a.exit - b.exit);
  function positions(time) {
    const t = Math.max(0, Math.min(time, end));
    return legs.map((paths, i) => {
      const leg = paths[Number(t >= collision)];
      return leg.x + leg.v * (Math.min(t, leg.end) - leg.start);
    });
  }
  return { collision, end, events, positions };
}
