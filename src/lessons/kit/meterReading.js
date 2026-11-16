// 从实际表盘拾取点确定学生所指的刻度。两种量程都沿同一段 30 小格圆弧。
export function readMeterTick(meter, hit) {
  const local = meter.group.face.worldToLocal(hit.point.clone());
  const height = meter.dial.geometry.parameters.height;
  const y = local.y + 0.4 * height;
  const angle = Math.atan2(local.x, y);
  if (Math.hypot(local.x, y) < 0.5 * height || Math.abs(angle) > 0.64)
    return { error: '沿指针找到表盘上端的弧形刻度，点它所指的那一格。' };
  const tick = Math.max(0, Math.min(30, Math.round(((angle + 0.6) / 1.2) * 30)));
  const step = meter.range / 30;
  if (Math.abs(tick - meter.value / step) > 0.8)
    return {
      error:
        '再看指针方向。这块表每小格 ' +
        step.toFixed(meter.type === 'A' ? 2 : 1) +
        (meter.type === 'A' ? ' A。' : ' V。'),
    };
  return { value: +(tick * step).toFixed(2) };
}
