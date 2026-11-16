// 导体棒沿 x，磁场沿 y，悬线摆向 z。方向均相对器材，转动观察镜头不改变方向。
export const SUSPENSION = 0.12;
const MASS = 0.016,
  FIELD = 0.35,
  ACTIVE_LENGTH = 0.035;
export function ampereForce(current, fieldDirection) {
  return current * ACTIVE_LENGTH * FIELD * fieldDirection;
}
export function swingRod(state, dt, force) {
  if (!(dt > 0)) return;
  const steps = Math.ceil(dt * 240),
    h = dt / steps;
  for (let i = 0; i < steps; i++) {
    // 水平安培力和竖直重力在悬线切向的分量；断电后仍按原速度摆动、逐渐衰减。
    // 磁极沿 z 从 -55 到 +37 mm。靠近两端的边缘场按 16 mm 范围线性过渡。
    const z = SUSPENSION * Math.sin(state.angle);
    const fieldFraction = Math.max(0, Math.min(1, (0.045 - z) / 0.016, (z + 0.063) / 0.016));
    const acceleration =
      (((force * fieldFraction) / MASS) * Math.cos(state.angle) - 9.8 * Math.sin(state.angle)) / SUSPENSION -
      4 * state.speed;
    state.speed += acceleration * h;
    state.angle += state.speed * h;
  }
}
