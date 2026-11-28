// Both strokes share axes. Keep the earlier trace visible while the new one is being drawn.
export function faradayDropPlot() {
  const el = document.createElement('canvas');
  el.width = 720; el.height = 290;
  el.style.cssText = 'display:block;width:100%;height:auto;background:#fffaf0;border:1px solid #c8beaa;border-radius:3px';
  const g = el.getContext('2d');
  function draw(drop, trace, prior) {
    const unit = drop ? 'U / V' : 'I / μA';
    el.setAttribute('aria-label', drop ? '电压随下落时间的变化' : '电流随时间的变化');
    const peak = Math.max(trace?.peak || 0, prior?.peak || 0);
    const step = drop ? 0.1 : 5, range = Math.max(step, Math.ceil(peak / step) * step);
    const tMax = drop ? 0.36 : Math.max(1, Math.ceil(Math.max(trace?.time || 0, prior?.time || 0)));
    const l = 78, r = 693, top = 50, bottom = 224, mid = (top + bottom) / 2;
    const X = t => l + (r - l) * t / tMax, Y = v => mid - v / range * (mid - top);
    const line = (x0, y0, x1, y1) => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
    g.clearRect(0, 0, el.width, el.height);
    g.font = '24px sans-serif'; g.fillStyle = '#3b5350';
    g.textAlign = 'left'; g.fillText(unit, 12, 31);
    g.textAlign = 'right'; g.fillText('t / s', r, 281);
    for (const v of [-range, 0, range]) {
      g.strokeStyle = v ? '#dfdbcc' : '#748b84'; g.lineWidth = v ? 1 : 2; line(l, Y(v), r, Y(v));
      g.fillText(String(+v.toFixed(2)), l - 10, Y(v) + 7);
    }
    const ticks = drop ? 3 : 4;
    for (let i = 0; i <= ticks; i++) {
      const t = tMax * i / ticks;
      g.strokeStyle = i ? '#dfdbcc' : '#748b84'; line(X(t), top, X(t), bottom);
      g.textAlign = 'center'; g.fillText(String(+t.toFixed(2)), X(t), bottom + 30);
    }
    for (const data of [prior, trace]) {
      if (!data) continue;
      g.beginPath(); g.lineWidth = data === trace ? 4.5 : 3.5;
      g.strokeStyle = data === trace ? '#126969' : '#a96732';
      g.setLineDash(data === trace ? [] : [11, 7]);
      data.samples.forEach(([t, v], i) => { if (i) g.lineTo(X(t), Y(v)); else g.moveTo(X(t), Y(v)); });
      g.stroke();
    }
    g.setLineDash([]);
  }
  return { el, draw };
}
