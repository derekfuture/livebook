// 两个投影用同一比例。手图取仪器正面，只判断电子刚出枪口时的受力。
import { h } from './ui.js';
import { BULB_RADIUS } from './electronBeam.js';

function figure(title, width, height) {
  return h('canvas', { width, height, role: 'img', 'aria-label': title,
    style: 'display:block;width:100%;height:auto;background:#fbf8ec;border:1px solid #cec7af;border-radius:5px;box-sizing:border-box' });
}
const ink = '#263f43', fieldInk = '#285d82', beamInk = '#157866', forceInk = '#a54829';
function label(g, text, x, y, color = ink, size = 14) {
  g.font = '600 ' + size + 'px sans-serif'; g.fillStyle = color; g.fillText(text, x, y);
}
function arrow(g, x, y, dx, dy, color) {
  const length = Math.hypot(dx, dy), ux = dx / length, uy = dy / length;
  g.strokeStyle = g.fillStyle = color; g.lineWidth = 2.3;
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx, y + dy); g.stroke();
  g.beginPath(); g.moveTo(x + dx, y + dy);
  g.lineTo(x + dx - 8 * ux + 4 * uy, y + dy - 8 * uy - 4 * ux);
  g.lineTo(x + dx - 8 * ux - 4 * uy, y + dy - 8 * uy + 4 * ux); g.fill();
}

// 四指向右。磁场向里时看掌心；左手绕四指的方向翻面后，看手背、拇指向下。
const outline = new Path2D('M 20 52 L 46 50 Q 54 47 61 35 L 67 16 Q 69 10 74 12 Q 80 14 78 21 L 75 39 Q 74 43 82 43 L 124 40 Q 133 39 133 45 Q 133 49 126 50 L 97 53 L 143 50 Q 151 50 151 55 Q 151 60 144 61 L 98 64 L 138 62 Q 146 61 146 67 Q 146 71 140 72 L 97 75 L 125 74 Q 133 73 133 79 Q 133 83 126 84 L 90 88 Q 71 92 55 84 L 20 87 Z');
export function beamDiagrams() {
  const hand = figure('枪口处的左手定则（示意）', 320, 152);
  const plots = figure('电子束正面和侧面投影（示意）', 320, 108);
  function drawHand({ field, emitted, angle }) {
    const g = hand.getContext('2d'), into = field < 0;
    const active = emitted && field !== 0 && angle !== 90;
    const height = active ? 152 : 72;
    if (hand.height !== height) hand.height = height;
    g.clearRect(0, 0, 320, height);
    label(g, '枪口处的左手定则（示意）', 12, 22);
    if (!active) {
      const explanation = !emitted ? '电子枪还没有射出电子束。' : !field ? '没有磁场，电子不受洛伦兹力。' : '电子沿磁场方向或反方向运动，洛伦兹力为零。';
      label(g, explanation, 12, 54, ink, 13);
      return;
    }
    g.save(); g.translate(-1, into ? 25 : 138); g.scale(1, into ? 1 : -1);
    g.fillStyle = '#ebd8b6'; g.strokeStyle = '#715e49'; g.lineWidth = 1.5;
    g.fill(outline); g.stroke(outline);
    g.beginPath();
    if (into) {
      g.moveTo(54, 53); g.quadraticCurveTo(69, 59, 62, 76);
      g.moveTo(78, 50); g.quadraticCurveTo(86, 63, 77, 72);
    } else {
      for (const [x,y] of [[126,45],[143,55],[138,67],[126,79]]) {
        g.moveTo(x-4,y-2); g.lineTo(x+2,y-2); g.quadraticCurveTo(x+7,y,x+1,y+2); g.lineTo(x-4,y+2);
      }
    }
    g.stroke(); g.restore();
    arrow(g, 59, into ? 65 : 95, 0, into ? -25 : 25, forceInk);
    label(g, into ? '⊗ 磁场向里' : '⊙ 磁场向外', 169, 52, fieldInk);
    label(g, into ? '磁场穿入掌心' : '翻手，让磁场穿入掌心', 169, 72, fieldInk, 12);
    label(g, '电子带负电，四指向右', 169, 94);
    label(g, into ? '拇指向上，电子受力向上' : '拇指向下，电子受力向下', 169, 115, forceInk, 12);
    arrow(g, 52, 136, -29, 0, beamInk);
    label(g, angle ? '电子速度向左的分量' : '电子速度向左', 66, 141, beamInk, 13);
  }
  function drawPlots(current, previous) {
    const g = plots.getContext('2d');
    g.clearRect(0, 0, 320, 108);
    for (const [i, axis] of ['x', 'z'].entries()) {
      const cx = 60 + i * 159, cy = 55, radius = 45, scale = radius / BULB_RADIUS;
      g.strokeStyle = '#c5c2b1'; g.lineWidth = 1;
      g.beginPath(); g.arc(cx, cy, radius, 0, Math.PI * 2); g.stroke();
      for (const [trace, old] of [[previous, true], [current, false]]) {
        if (!trace) continue;
        g.beginPath();
        trace.points.forEach((p,j) => {
          const x = cx + p[axis] * scale, y = cy - p.y * scale;
          if (j) g.lineTo(x, y); else g.moveTo(x, y);
        });
        g.strokeStyle = old ? '#857767' : beamInk; g.lineWidth = old ? 1.8 : 2.8;
        g.setLineDash(old ? [3, 3] : []); g.stroke(); g.setLineDash([]);
        // 沿束轴观察直线束时，投影退化为枪口处的一个点。
        g.fillStyle = g.strokeStyle;
        const start = trace.points[0];
        g.beginPath(); g.arc(cx + start[axis] * scale, cy - start.y * scale, old ? 1.3 : 1.8, 0, Math.PI * 2); g.fill();
      }
      label(g, i ? '侧面' : '正面', cx + 39, 20, ink, 12);
    }
  }
  return { hand, plots, drawHand, drawPlots };
}
