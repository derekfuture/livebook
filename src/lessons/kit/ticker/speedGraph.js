// 用学生读出的速度描点，每条纸带单独拟合直线。坐标换算同时用于作图和拾取。
import { seriesColors } from './speedTape.js';
export function speedGraph(onPoint) {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 672;
  canvas.style.cssText = 'display:block;width:100%;cursor:crosshair;touch-action:manipulation';
  canvas.setAttribute('aria-label', '小车的速度—时间图');
  const g = canvas.getContext('2d');
  let rows = [],
    placed = 0,
    top = 0.4;
  const X = (t) => 125 + (760 * t) / 0.4,
    Y = (v) => 550 - (446 * v) / top;
  function draw() {
    g.fillStyle = '#fffaf0';
    g.fillRect(0, 0, 960, 672);
    g.font = '35px sans-serif';
    function line(x, y, x1, y1, color, width = 2) {
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x1, y1);
      g.strokeStyle = color;
      g.lineWidth = width;
      g.stroke();
    }
    for (let i = 0; i <= 8; i++) {
      const t = i * 0.05;
      line(X(t), Y(0), X(t), Y(top), '#d7ded6');
      if (i % 2 === 0) {
        g.fillStyle = '#514f48';
        g.textAlign = 'center';
        g.fillText(t.toFixed(1), X(t), 597);
      }
    }
    for (let i = 0; i <= Math.round(top / 0.05); i++) {
      const v = i * 0.05;
      line(X(0), Y(v), X(0.4), Y(v), '#d7ded6');
      if (i % 2 === 0) {
        g.fillStyle = '#514f48';
        g.textAlign = 'right';
        g.fillText(v.toFixed(1), 105, Y(v) + 12);
      }
    }
    line(X(0), Y(0), X(0.4), Y(0), '#514f48', 4);
    line(X(0), Y(0), X(0), Y(top), '#514f48', 4);
    g.fillStyle = '#373c39';
    g.textAlign = 'left';
    g.fillText('v / (m/s)', 83, 71);
    g.fillText('t / s', 845, 648);
    for (let n = 0; n < 3; n++) {
      const data = rows.slice(0, placed).filter((r) => r.index === n);
      const color = seriesColors[n];
      if (data.length === 3) {
        const [a, b, c] = data,
          mean = (a.v + b.v + c.v) / 3,
          half = (c.v - a.v) / 2;
        line(X(a.t), Y(mean - half), X(c.t), Y(mean + half), color, 5);
      }
      for (const r of data) {
        g.beginPath();
        g.arc(X(r.t), Y(r.v), 10, 0, Math.PI * 2);
        g.fillStyle = color;
        g.fill();
      }
    }
  }
  function mark(x, y) {
    const r = rows[placed];
    if (!r) return;
    const ok = Math.abs(x - X(r.t)) <= 22 && Math.abs(y - Y(r.v)) <= 16;
    if (ok) {
      placed++;
      draw();
    }
    onPoint(ok, placed);
  }
  canvas.onclick = (e) => {
    const rect = canvas.getBoundingClientRect();
    mark(((e.clientX - rect.left) / rect.width) * 960, ((e.clientY - rect.top) / rect.height) * 672);
  };
  return {
    canvas,
    set(data) {
      rows = data;
      placed = 0;
      top = Math.max(0.2, Math.ceil((Math.max(0, ...rows.map((r) => r.v)) + 0.015) * 10) / 10);
      draw();
    },
    point(r) {
      return [X(r.t), Y(r.v)];
    },
    mark,
  };
}
