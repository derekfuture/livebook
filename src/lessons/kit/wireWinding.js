// 圆柱横向放置。记录导丝环每一段实际进给的螺距；倒转时沿原路径退丝。
export const WIRE_MM = 0.625;
export const MAX_TURNS = 32;

export function advanceWinding(parts, turns, pitch) {
  const current = parts.at(-1)?.end || 0;
  const end = Math.max(0, Math.min(MAX_TURNS, current + turns));
  if (end < current) {
    while (parts.length && parts.at(-1).start >= end) parts.pop();
    if (parts.length) parts.at(-1).end = end;
  } else if (end > current) {
    if (parts.at(-1)?.pitch === pitch) parts.at(-1).end = end;
    else parts.push({ start: current, end, pitch });
  }
}

export function alongWire(parts, turn) {
  let x = 0;
  for (const p of parts) {
    x += Math.max(0, Math.min(turn, p.end) - p.start) * p.pitch;
    if (turn <= p.end) break;
  }
  return x;
}

// 同一条母线上读相邻完整线圈的两个外边缘，包含首末两根丝各半个直径。
export function windingEdges(parts) {
  const turns = parts.at(-1)?.end || 0;
  const count = Math.round(turns);
  if (count === 0 || Math.abs(turns - count) > 0.06) return null;
  const first = turns - count + 0.75;
  const left = alongWire(parts, first) - WIRE_MM / 2;
  const right = alongWire(parts, first + count - 1) + WIRE_MM / 2;
  let widestGap = 0;
  for (let k = 1; k < count; k++) {
    const spacing = alongWire(parts, first + k) - alongWire(parts, first + k - 1);
    widestGap = Math.max(widestGap, spacing - WIRE_MM);
  }
  return { count, left, right, gap: right - left - count * WIRE_MM, widestGap };
}
