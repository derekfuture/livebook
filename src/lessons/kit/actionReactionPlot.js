// 一次采样同时记录两个受力物体的轴向分量。无操作时保留最后一幅图，下一次接着真实时间采样。
import { LinearFilter } from 'three';
import { canvasTex } from './props.js';

const WINDOW = 6, W = 1120, H = 420;
export function forcePlot() {
  const texture = canvasTex(W, H, () => {});
  texture.generateMipmaps = false;
  texture.minFilter = LinearFilter;
  const g = texture.canvas.getContext('2d');
  const left = 69, right = W - 40, top = 111, bottom = H - 67, mid = (top + bottom) / 2;
  const samples = [];
  let origin = null, dirty = true, compact = false;
  function sample(time, state) {
    if (origin === null) origin = time;
    const t = (time - origin) / 1000;
    const last = samples[samples.length - 1];
    // 等力段只保留起点与末点；保留每个实际的拉力转折，包括两帧间很快的一拉。
    const prev = samples[samples.length - 2];
    if (prev && prev.b === last.b && last.b === state.onLeft.x) last.t = t;
    else samples.push({ t, b: state.onLeft.x, a: state.onRight.x });
    while (samples.length > 2 && samples[1].t < t - WINDOW) samples.shift();
    dirty = true;
  }
  function draw() {
    if (!dirty) return;
    dirty = false;
    const elapsed = samples.length ? samples[samples.length - 1].t : 0;
    const start = Math.max(0, elapsed - WINDOW);
    const X = (t) => left + (right - left) * (t - start) / WINDOW;
    const Y = (f) => mid - f * (bottom - top) / 10;
    const line = (x, y, xx, yy) => { g.beginPath(); g.moveTo(x, y); g.lineTo(xx, yy); g.stroke(); };
    const label = (s, x, y, size, color, align = 'left', bold = false) => {
      g.font = (bold ? '600 ' : '') + (compact ? Math.round(size * 1.30) : size) + 'px "PingFang SC", Arial, sans-serif';
      g.fillStyle = color; g.textAlign = align; g.fillText(s, x, y);
    };
    const bg = '#f6f5e9', ink = '#263f3d', blue = '#18685f', copper = '#984820';
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    label('拉力随时间的变化', 38, 53, 35, ink, 'left', true);
    label('轻质测力计示意 · 向右为正', right, 53, 28, ink, 'right');
    label('B 受 A 的拉力 F', left + 126, 94, 29, blue, 'left', true);
    label('A 受 B 的拉力 F′', W * 0.54 + 35, 94, 29, copper, 'left', true);
    g.lineWidth = 5; g.strokeStyle = blue; line(left + 91, 84, left + 117, 84);
    g.strokeStyle = copper; line(W * 0.54, 84, W * 0.54 + 26, 84);
    for (let n = -5; n <= 5; n++) {
      g.lineWidth = n === 0 ? 2.4 : 1;
      g.strokeStyle = n === 0 ? '#8b9b90' : '#c7d0c1';
      line(left, Y(n), right, Y(n));
      if (n % 5 === 0) label(n > 0 ? '+5' : String(n).replace('-', '−'), left - 12, Y(n) + 9, 28, ink, 'right');
    }
    for (let t = Math.ceil(start); t <= start + WINDOW; t++) {
      const x = X(t); g.strokeStyle = '#bbc7ba'; g.lineWidth = 1;
      line(x, top, x, bottom);
      if (t % 2 === 0) label(String(t), x, bottom + 32, 27, ink, 'center');
    }
    label('拉力 / N', 12, 95, 26, ink);
    label('时间 / s', right, H - 10, 27, ink, 'right');
    g.save(); g.beginPath(); g.rect(left - 3, top - 5, right - left + 6, bottom - top + 10); g.clip();
    for (const [key, color] of [['b', blue], ['a', copper]]) {
      g.strokeStyle = color; g.lineWidth = 5; g.lineJoin = g.lineCap = 'round'; g.beginPath();
      samples.forEach((s, i) => { if (i === 0) g.moveTo(X(s.t), Y(s[key])); else g.lineTo(X(s.t), Y(s[key])); });
      g.stroke();
      if (samples.length) {
        const s = samples[samples.length - 1]; g.fillStyle = color; g.beginPath();
        g.arc(X(s.t), Y(s[key]), 5, 0, Math.PI * 2); g.fill();
      }
    }
    g.restore();
    texture.needsUpdate = true;
  }
  function reset() { samples.length = 0; origin = null; dirty = true; draw(); }
  reset();
  return { texture, sample, samples, draw, reset, setCompact(on) { compact = on; dirty = true; draw(); } };
}
