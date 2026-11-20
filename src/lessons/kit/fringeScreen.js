// 测量头的毛玻璃和可平移分划板。条纹固定在毛玻璃上，手轮只移动十字刻线。
import * as THREE from 'three';
import { canvasTex } from './props.js';
import { stripeIntensity, FILTER_WAVELENGTH } from './doubleSlit.js';

export const FIELD_WIDTH = 0.016;
const bands = [
  [430, 0.14, 0, 0.5], [460, 0.04, 0.08, 1], [490, 0, 0.48, 0.54],
  [520, 0.04, 0.8, 0.12], [550, 0.38, 0.84, 0.02], [580, 0.9, 0.58, 0],
  [610, 1, 0.19, 0], [650, 0.8, 0.025, 0], [680, 0.34, 0, 0],
];
const weights = [0, 1, 2].map((c) => bands.reduce((sum, band) => sum + band[c + 1], 0));
const srgb = (v) => Math.round(255 * (v <= 0.00313 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055));

export function fringeScreen() {
  const group = new THREE.Group();
  const tex = canvasTex(1024, 512, () => {});
  const screen = new THREE.Mesh(new THREE.CircleGeometry(FIELD_WIDTH / 2, 96), new THREE.MeshBasicMaterial({ map: tex }));
  group.add(screen);
  const ink = new THREE.MeshBasicMaterial({ color: 0x262726 });
  const cross = new THREE.Group();
  for (const vertical of [true, false]) {
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(vertical ? 0.000085 : FIELD_WIDTH * 2, vertical ? FIELD_WIDTH * 2 : 0.000085), ink);
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(vertical ? 0.000033 : FIELD_WIDTH * 2, vertical ? FIELD_WIDTH * 2 : 0.000033), new THREE.MeshBasicMaterial({ color: 0xffeed0 }));
    edge.position.z = 0.000004;
    mark.add(edge);
    cross.add(mark);
  }
  cross.position.z = 0.00002;
  group.add(cross);
  // 在圆场内裁刻线，避免分划板从目镜黑边外露出。
  function move(readingMM) {
    cross.position.x = (readingMM - FIELD_WIDTH * 500) / 1000;
    const height = 2 * Math.sqrt(Math.max(0, (FIELD_WIDTH / 2) ** 2 - cross.position.x ** 2));
    cross.children[0].scale.y = height / (2 * FIELD_WIDTH);
    cross.children[1].scale.x = 0.5;
    cross.children[1].position.x = -cross.position.x;
  }
  function expose({ lit, single, double, separation, filter, length, offset = 0, height = 0, marks = [] }) {
    // offset 是未调正时光束中心在毛玻璃上的横向错位（m）。
    const g = tex.canvas.getContext('2d'), w = tex.canvas.width;
    if (!single && !double && !filter) {
      // 未插片时用毛玻璃上的二维光斑校轴。光斑随灯的横移越过十字线。
      const h = tex.canvas.height;
      g.save();
      g.scale(w, h);
      const center = 0.5 + offset / FIELD_WIDTH;
      const cy = 0.5 - height / FIELD_WIDTH;
      const spot = g.createRadialGradient(center, cy, 0.025, center, cy, 0.34);
      spot.addColorStop(0, '#fff9d7'); spot.addColorStop(0.45, '#ffdd85'); spot.addColorStop(1, '#514d43');
      g.fillStyle = lit ? spot : '#17171a';
      g.fillRect(0, 0, 1, 1);
      g.restore();
      tex.needsUpdate = true;
      return;
    }
    for (let i = 0; i < w; i++) {
      const x = ((i + 0.5) / w - 0.5) * FIELD_WIDTH - offset;
      const light = lit ? 0.96 * Math.exp(-((x / (FIELD_WIDTH * 0.6)) ** 2)) : 0;
      const intensity = (wavelength) => single && double ? stripeIntensity(x, length, separation, wavelength) : 1;
      let rgb;
      if (filter) {
        const value = light * intensity(FILTER_WAVELENGTH[filter]);
        rgb = (filter === 'red' ? [1, 0.026, 0.004] : [0.035, 0.14, 1]).map((v) => value * v);
      } else {
        rgb = [0, 0, 0];
        for (const [nm, r, green, b] of bands) {
          const v = light * intensity(nm * 1e-9);
          rgb[0] += r * v; rgb[1] += green * v; rgb[2] += b * v;
        }
        rgb = rgb.map((v, c) => v / weights[c]);
      }
      g.fillStyle = 'rgb(' + rgb.map((v) => srgb(Math.min(1, 0.008 + v))).join(',') + ')';
      g.fillRect(i, 0, 1, tex.canvas.height);
    }
    if (marks.length === 2) {
      // 取两次锁定的分划线位置。引线上下分开，倒着选或选相邻亮纹都能数。
      g.save();
      g.scale(w / 512, tex.canvas.height / 512);
      g.font = 'bold 16px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      marks.forEach(({ position }, index) => {
        const x = position / (1000 * FIELD_WIDTH) * 512;
        const labelX = Math.max(92, Math.min(420, x));
        const side = index === 0 ? -1 : 1;
        g.strokeStyle = g.fillStyle = '#fff2ce'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(x, 256 + side * 6); g.lineTo(x, 256 + side * 24);
        g.lineTo(labelX, 256 + side * 83); g.stroke();
        const labelY = 256 + side * 94;
        g.fillStyle = '#30373b'; g.fillRect(labelX - 30, labelY - 12, 60, 24);
        g.fillStyle = '#fff2ce'; g.fillText(index === 0 ? '第一条' : '第二条', labelX, labelY);
      });
      g.restore();
    }
    tex.needsUpdate = true;
  }
  move(FIELD_WIDTH * 500);
  return { group, screen, cross, expose, move };
}
