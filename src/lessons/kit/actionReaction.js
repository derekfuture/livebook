// 必修一 p.69 图3.3-3：两只相连的轻质弹簧测力计，慢拉时的准静态模型。
// 自由挂钩接点的净力为零，两根弹簧串联；不是快速甩动时含仪器质量的动力学模型。
// handles 是两只表的提环位置，rest 是提环到连接处的零载长度，perN 为 m/N。
export function pairedMeters(handles, { rest = [0.23, 0.23], perN = [0.024, 0.024] } = {}) {
  if (handles.length !== 2 || rest.some((v) => !(v > 0)) || perN.some((v) => !(v > 0)))
    throw new RangeError('Two meters with positive lengths and compliances required');
  const [left, right] = handles;
  const dx = right.x - left.x,
    dz = right.z - left.z,
    distance = Math.hypot(dx, dz);
  const direction = distance > 1e-12 ? { x: dx / distance, z: dz / distance } : { x: 1, z: 0 };
  const extension = Math.max(0, distance - rest[0] - rest[1]);
  const force = extension / (perN[0] + perN[1]);
  const lengths = rest.map((v, i) => v + force * perN[i]);
  let joint;
  if (force > 0) {
    joint = { x: left.x + direction.x * lengths[0], z: left.z + direction.z * lengths[0] };
  } else {
    // 无张力时两只表可绕挂钩连接处转开，各自弹簧保持零伸长，而非读出负拉力。
    // 两个固定零载长度无法形成三角形时交给 UI 限制碰撞，不能假装压短弹簧。
    if (distance < Math.abs(rest[0] - rest[1]) - 1e-10)
      throw new RangeError('Handles too close for unloaded rigid bodies');
    const along = distance > 1e-12 ? (distance * distance + rest[0] * rest[0] - rest[1] * rest[1]) / (2 * distance) : 0;
    const across = Math.sqrt(Math.max(0, rest[0] * rest[0] - along * along));
    joint = {
      x: left.x + direction.x * along - direction.z * across,
      z: left.z + direction.z * along + direction.x * across,
    };
  }
  return {
    distance,
    force,
    lengths,
    joint,
    extension,
    // 挂钩相互作用：B(左)受 A 向右的力，A(右)受 B 向左的力；分属两个物体。
    onLeft: { x: force * direction.x, z: force * direction.z },
    onRight: { x: -force * direction.x, z: -force * direction.z },
    energy: 0.5 * force * force * (perN[0] + perN[1]),
  };
}
