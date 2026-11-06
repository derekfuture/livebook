// 必修二图 5.1-1：水平纸面上的分段弯道。SI 单位，坐标为桌面 x、z。
// 窄导槽约束球心；忽略侧壁间隙、碰撞和打滑。轨道只改变速度方向。
// resistance 是沿程的等效减速度，不是钢球/印泥的标定摩擦系数。
export const TANGENT_START = Object.freeze({ x: 0.17, z: 0.08, heading: Math.PI });
export const TANGENT_SEGMENTS = Object.freeze([
  Object.freeze({ length: 0.13, curvature: 12 }),
  Object.freeze({ length: 0.11, curvature: -12 }),
  Object.freeze({ length: 0.11, curvature: -12 }),
]);

function advance(p, length, curvature) {
  const heading = p.heading + curvature * length;
  if (Math.abs(curvature) < 1e-12)
    return { x: p.x + length * Math.cos(p.heading), z: p.z + length * Math.sin(p.heading), heading };
  return {
    x: p.x + (Math.sin(heading) - Math.sin(p.heading)) / curvature,
    z: p.z + (Math.cos(p.heading) - Math.cos(heading)) / curvature,
    heading,
  };
}

// 只装连续的入口侧轨段；拆去出口末段后，B 成为新出口。
// 轨道模型和渲染器必须共用此几何，不能另给一套“正确出口方向”。
export function tangentPath(count = 3) {
  if (!Number.isInteger(count) || count < 0 || count > TANGENT_SEGMENTS.length)
    throw new RangeError('轨段数量应为 0 到 3 的整数');
  const segments = TANGENT_SEGMENTS.slice(0, count);
  const length = segments.reduce((sum, s) => sum + s.length, 0);
  function at(distance) {
    if (!Number.isFinite(distance) || distance < 0) throw new RangeError('路程须为非负有限数');
    let p = { ...TANGENT_START },
      remaining = distance;
    for (const segment of segments) {
      const step = Math.min(remaining, segment.length);
      p = advance(p, step, segment.curvature);
      remaining = Math.max(0, remaining - step);
      if (remaining === 0) return { ...p, onTrack: distance < length };
    }
    return { ...advance(p, remaining, 0), onTrack: false };
  }
  return { count, length, at, exit: at(length) };
}

export function tangentTrial({ count = 3, speed = 0.36, resistance = 0.08, startDistance = 0 } = {}) {
  if (!(Number.isFinite(speed) && speed >= 0 && Number.isFinite(resistance) && resistance >= 0))
    throw new RangeError('速度和等效减速度须为非负有限数');
  const path = tangentPath(count);
  if (!Number.isFinite(startDistance) || startDistance < 0 || startDistance > path.length)
    throw new RangeError('释放位置须在已安装轨道内');
  const stopTime = speed === 0 ? 0 : resistance > 0 ? speed / resistance : Infinity;
  const stopDistance =
    startDistance + (resistance > 0 ? (speed * speed) / (2 * resistance) : speed === 0 ? 0 : Infinity);
  const reachesExit = speed > 0 && stopDistance > path.length;
  const exitSpeed = reachesExit
    ? Math.sqrt(Math.max(0, speed * speed - 2 * resistance * (path.length - startDistance)))
    : 0;
  const exitTime = reachesExit ? (2 * (path.length - startDistance)) / (speed + exitSpeed) : null;
  function at(time) {
    if (!(Number.isFinite(time) && time >= 0)) throw new RangeError('时间须为非负有限数');
    const t = Math.min(time, stopTime);
    const distance = startDistance + speed * t - 0.5 * resistance * t * t;
    const velocity = Math.max(0, speed - resistance * t);
    const p = path.at(Math.min(distance, stopDistance));
    return {
      ...p,
      distance,
      speed: velocity,
      vx: velocity * Math.cos(p.heading),
      vz: velocity * Math.sin(p.heading),
      stopped: time >= stopTime,
    };
  }
  // 留痕按等路程采样，不随显示帧率改变；只包含已经走过的纸面轨迹。
  // 最后一点始终是当前球心投影。出口恰好纳入，避免跨出口画直弦。
  function trace(time, spacing = 0.0015) {
    if (!(Number.isFinite(spacing) && spacing > 0)) throw new RangeError('采样间距须为正有限数');
    const end = at(time).distance;
    const distances = [startDistance];
    for (let s = startDistance + spacing; s < end; s += spacing) distances.push(s);
    let edge = 0;
    for (const segment of TANGENT_SEGMENTS.slice(0, count)) {
      edge += segment.length;
      if (edge > startDistance && edge < end) distances.push(edge);
    }
    if (end > startDistance) distances.push(end);
    return distances
      .sort((a, b) => a - b)
      .filter((s, i, all) => i === 0 || s - all[i - 1] > 1e-12)
      .map((s) => ({ ...path.at(s), distance: s }));
  }
  return { path, stopTime, stopDistance, reachesExit, exitTime, exitSpeed, at, trace };
}
