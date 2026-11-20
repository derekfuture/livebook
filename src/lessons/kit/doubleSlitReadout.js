// 测量头正视特写。图内长度用 mm，圆周刻度与三维手轮共用螺距和分度。
import * as THREE from 'three';
import { canvasTex } from './props.js';
import { SCREW_PITCH, THIMBLE_DIVISIONS } from './micrometer.js';
import { SCALE_ZERO } from './micrometerTool.js';

export function screwElevation(frame) {
  const width = 50, height = 14, left = -3;
  const texture = canvasTex(3200, 896, () => {});
  const face = new THREE.Mesh(new THREE.PlaneGeometry(width / 1000, height / 1000),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
  face.position.x = SCALE_ZERO + (left + width / 2) / 1000;
  face.visible = false;
  frame.add(face);
  const g = texture.canvas.getContext('2d');
  g.scale(texture.canvas.width / width, texture.canvas.height / height);
  g.translate(-left, height / 2);
  function metal(radius, top, middle, bottom) {
    const gradient = g.createLinearGradient(0, -radius, 0, radius);
    gradient.addColorStop(0, top);
    gradient.addColorStop(0.42, middle);
    gradient.addColorStop(1, bottom);
    return gradient;
  }
  function draw(mm) {
    g.clearRect(left, -height / 2, width, height);
    g.fillStyle = metal(4.4, '#acb5b4', '#e0e3db', '#b1bab5');
    g.fillRect(left, -4.4, mm - left, 8.8);
    const ink = '#263b44';
    g.fillStyle = ink;
    g.fillRect(left, -0.035, mm - left, 0.07);
    g.textAlign = 'center';
    g.font = '0.76px sans-serif';
    // 整条刻线只在筒缘到达时露出。在恰好进位的位置也要与手轮的底色分得清。
    for (let tick = 0; tick <= mm; tick += 0.5) {
      const whole = Number.isInteger(tick);
      g.fillRect(tick - 0.055, whole ? -1.85 : 0, 0.055, whole ? 1.85 : 1.55);
      if (whole && tick % 5 === 0) {
        g.save();
        g.beginPath(); g.rect(left, -4.4, mm - left, 8.8); g.clip();
        g.fillText(String(tick), tick, -2.22);
        g.restore();
      }
    }
    g.fillStyle = metal(6.7, '#a2aeaf', '#d7e0dd', '#95a4a5');
    g.beginPath(); g.moveTo(mm, -4.55); g.lineTo(mm + 6, -6.7);
    g.lineTo(mm + 6, 6.7); g.lineTo(mm, 4.55); g.closePath(); g.fill();
    g.strokeStyle = g.fillStyle = ink;
    g.lineWidth = 0.052;
    g.textAlign = 'left'; g.textBaseline = 'middle';
    const division = (mm % SCREW_PITCH) / SCREW_PITCH * THIMBLE_DIVISIONS;
    for (let i = Math.ceil(division - 12); i <= division + 12; i++) {
      const sin = Math.sin((division - i) * 2 * Math.PI / THIMBLE_DIVISIONS);
      const len = i % 5 === 0 ? 2.55 : 1.4;
      g.beginPath(); g.moveTo(mm, 4.55 * sin);
      g.lineTo(mm + len, (4.55 + len * (6.7 - 4.55) / 6) * sin); g.stroke();
      if (i % 5 === 0 && Math.abs(sin) < 0.9) {
        g.fillText(String((i + THIMBLE_DIVISIONS) % THIMBLE_DIVISIONS), mm + 2.8, 5.55 * sin);
      }
    }
    g.textBaseline = 'alphabetic';
    g.fillStyle = metal(6.7, '#75583c', '#c39e72', '#705338');
    g.fillRect(mm + 6, -6.7, 19, 13.4);
    g.strokeStyle = '#82684e';
    for (let i = -11; i <= 11; i++) {
      const y = 6.7 * Math.sin(i * Math.PI / 24);
      g.beginPath(); g.moveTo(mm + 6.5, y); g.lineTo(mm + 24.5, y); g.stroke();
    }
    g.fillStyle = metal(3.5, '#8c9b9c', '#d2d9d5', '#829092');
    g.fillRect(mm + 25, -3.5, 5, 7);
    texture.needsUpdate = true;
  }
  return { face, draw, dispose: () => texture.dispose() };
}
