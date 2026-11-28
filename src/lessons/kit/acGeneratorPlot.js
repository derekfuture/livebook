// 四秒观察窗。空心点只记转动经过中性面的时刻，实心点跟随当前样本。
export function generatorPlot() {
  const canvas = document.createElement('canvas');
  canvas.width = 680;
  canvas.height = 420;
  canvas.style.cssText =
    'display:block;width:100%;height:auto;background:#fbf8ee;border:1px solid #c3c7b6;border-radius:4px;box-sizing:border-box';
  canvas.setAttribute('aria-label', '线圈端视图与电流随时间变化的图像（示意）');
  const g = canvas.getContext('2d'),
    samples = [];
  const left = 42,
    right = 317,
    top = 29,
    mid = 74,
    bottom = 119;
  function sample(t, amps, neutral = false) {
    samples.push({ t, ma: amps * 1000, neutral });
    while (samples.length > 1 && samples[0].t < t - 4) samples.shift();
  }
  function draw(theta = 0, amps = 0, circuit = '回路断开') {
    const last = samples[samples.length - 1],
      end = last ? last.t : 0;
    const start = Math.max(0, end - 4);
    let limit = 15;
    for (const s of samples) limit = Math.max(limit, Math.ceil(Math.abs(s.ma) / 15) * 15);
    const X = (t) => left + ((t - start) * (right - left)) / 4;
    const Y = (ma) => mid - (ma / limit) * (mid - top);
    g.setTransform(2, 0, 0, 2, 0, 0);
    g.clearRect(0, 0, 340, 210);
    // 从手柄端看，AB 边朝向观察者的电流对应 B → A。
    g.save();
    const cx = 58,
      cy = 36,
      dx = -25 * Math.sin(theta),
      dy = -25 * Math.cos(theta);
    g.strokeStyle = '#5a8074';
    g.setLineDash([3, 3]);
    g.beginPath();
    g.moveTo(cx, 3);
    g.lineTo(cx, 68);
    g.stroke();
    g.setLineDash([]);
    g.strokeStyle = '#a66532';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(cx - dx, cy - dy);
    g.lineTo(cx + dx, cy + dy);
    g.stroke();
    for (const side of [-1, 1]) {
      const px = cx + side * dx,
        py = cy + side * dy;
      g.beginPath();
      g.arc(px, py, 4, 0, 2 * Math.PI);
      g.fillStyle = side > 0 ? '#a66532' : '#fbf8ee';
      g.fill();
      g.lineWidth = 1.5;
      g.stroke();
    }
    g.font = '600 13px sans-serif';
    g.fillStyle = '#77502d';
    g.textAlign = dx < -1 ? 'right' : 'left';
    g.fillText('AB', cx + dx + (dx < -1 ? -7 : 7), cy + dy + 4);
    g.textAlign = 'left';
    g.fillStyle = '#334d47';
    g.fillText('从手柄端看（示意）', 112, 21);
    g.font = '13px sans-serif';
    g.fillText('虚线为中性面', 112, 41);
    g.fillStyle = '#465b51';
    g.textAlign = 'right';
    g.fillText(circuit, right, 21);
    g.textAlign = 'left';
    g.fillText(Math.abs(amps) < 1e-7 ? 'AB 边无电流' : amps > 0 ? 'AB 边电流：B → A' : 'AB 边电流：A → B', 112, 61);
    g.restore();
    g.translate(0, 70);
    g.font = '13px sans-serif';
    g.fillStyle = '#3b514d';
    g.fillText('电流 i / mA（模型估算）', 7, 16);
    g.textAlign = 'right';
    g.fillText('时间 t / s', right, 16);
    const line = (x, y, xx, yy, color) => {
      g.strokeStyle = color;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(xx, yy);
      g.stroke();
    };
    g.lineWidth = 0.8;
    for (let t = Math.ceil(start); t <= start + 4; t++) {
      const x = X(t);
      line(x, top, x, bottom, '#dadbca');
      g.fillStyle = '#485955';
      g.textAlign = 'center';
      g.fillText(String(t), x, bottom + 15);
    }
    for (const ma of [limit, 0, -limit]) {
      const y = Y(ma);
      line(left, y, right, y, ma ? '#d5d9cc' : '#748a7b');
      g.textAlign = 'right';
      g.fillText((ma > 0 ? '+' : '') + ma, left - 7, y + 4);
    }
    g.beginPath();
    g.strokeStyle = '#166c63';
    g.lineWidth = 2.4;
    g.lineJoin = 'round';
    samples.forEach((s, i) => {
      if (i) g.lineTo(X(s.t), Y(s.ma));
      else g.moveTo(X(s.t), Y(s.ma));
    });
    g.stroke();
    function point(s, r, fill) {
      g.beginPath();
      g.arc(X(s.t), Y(s.ma), r, 0, 2 * Math.PI);
      g.fillStyle = fill;
      g.fill();
      g.strokeStyle = '#155e57';
      g.lineWidth = 1.6;
      g.stroke();
    }
    for (const s of samples) if (s.neutral) point(s, 3, '#fbf8ee');
    if (last) point(last, 3.8, '#166c63');
    g.textAlign = 'left';
  }
  function reset() {
    samples.length = 0;
    draw();
  }
  reset();
  return { canvas, samples, sample, draw, reset };
}
