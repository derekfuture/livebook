// 图 2.1-1 的放大纸带。纹理上的点、毫米尺和选点拾取共用一个坐标变换。
import * as THREE from 'three';
import { canvasTex } from '../props.js';
import { paint } from '../../../live/ink.js';

const WIDTH = 0.56,
  HEIGHT = 0.137,
  TILT = Math.PI / 5;
const W = 2240,
  H = 548,
  LEFT = 104,
  PX_MM = (W / WIDTH) * 0.004;
const Y_DOT = 226;
export const seriesColors = ['#206b72', '#a14d33', '#72518a'];
export function speedTape(base) {
  const front = 0.245,
    midX = 0.065;
  const side = new THREE.Shape();
  side.moveTo(0, 0);
  side.lineTo(HEIGHT * Math.cos(TILT), 0);
  side.lineTo(HEIGHT * Math.cos(TILT), HEIGHT * Math.sin(TILT));
  side.closePath();
  const foot = new THREE.ExtrudeGeometry(side, { depth: WIDTH, bevelEnabled: false });
  foot.rotateY(Math.PI / 2);
  foot.translate(midX - WIDTH / 2, 0, front);
  base.add(new THREE.Mesh(foot, paint(0xbf9e6f)));
  const texture = canvasTex(W, H, () => {});
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(WIDTH, HEIGHT),
    new THREE.MeshBasicMaterial({ map: texture }),
  );
  mesh.rotation.x = TILT - Math.PI / 2;
  mesh.position.set(midX, (HEIGHT * Math.sin(TILT)) / 2 + 0.001, front - (HEIGHT * Math.cos(TILT)) / 2);
  base.add(mesh);
  const g = texture.canvas.getContext('2d');
  function label(text, x, y, size, color, align = 'left') {
    g.fillStyle = color;
    g.font = '500 ' + size + 'px "PingFang SC", sans-serif';
    g.textAlign = align;
    g.fillText(text, x, y);
  }
  let marks = [],
    zero = 0;
  const px = (m) => LEFT + (m.x - zero) * 1000 * PX_MM;
  function draw(run, index, origin, count, reading, narrow) {
    marks = run.marks;
    const a = origin == null ? null : marks[origin + 5 * count];
    zero = a ? a.x : marks.length ? marks[0].x : 0;
    g.fillStyle = '#e9dbc1';
    g.fillRect(0, 0, W, H);
    const color = seriesColors[index];
    const rightLabel = narrow ? LEFT + 67 * PX_MM : W - 65;
    label('纸带 ' + (index + 1) + '　·　' + (index + 1) * 10 + ' g', 65, 83, 58, color);
    label('放大 4 倍', rightLabel, 80, 48, '#635d50', 'right');
    g.fillStyle = '#fff9ea';
    g.fillRect(30, 132, W - 60, 142);
    for (const m of marks) {
      const x = px(m);
      if (x < 44 || x > W - 44) continue;
      g.fillStyle = '#303639';
      g.beginPath();
      g.arc(x, Y_DOT, 6.2, 0, Math.PI * 2);
      g.fill();
    }
    for (let mm = 0; mm <= 128; mm++) {
      const x = LEFT + mm * PX_MM;
      g.fillStyle = '#615a4e';
      g.fillRect(x - 1.4, 277, 2.8, mm % 10 === 0 ? 47 : mm % 5 === 0 ? 34 : 20);
      if (mm % 10 === 0) label(String(mm), x, 370, 48, '#423e36', 'center');
    }
    label('mm', rightLabel, 421, 40, '#635d50', 'right');
    if (a) {
      for (let k = 0; k < 3; k++) {
        const x = px(marks[origin + 5 * (count + k)]);
        g.fillStyle = color;
        g.fillRect(x - 2, Y_DOT + 10, 4, 40);
        label(String(count + k), x, 195, 50, color, 'center');
      }
      label('第 ' + (count + 1) + ' 点　 t = ' + ((count + 1) / 10).toFixed(2) + ' s', 65, 480, 54, color);
      label('两端相隔 0.20 s', rightLabel, 480, 48, '#4c493f', 'right');
    } else label(reading ? '选计时起点' : '相邻打点相隔 0.02 s', 65, 480, 53, '#635d50');
    texture.needsUpdate = true;
  }
  function dotAt(x, y) {
    if (Math.abs(y - Y_DOT) > 65 || !marks.length) return -1;
    const i = marks.reduce((best, m, j) => (Math.abs(px(m) - x) < Math.abs(px(marks[best]) - x) ? j : best), 0);
    return Math.abs(px(marks[i]) - x) < 27 ? i : -1;
  }
  function localDot(i) {
    return mesh.localToWorld(new THREE.Vector3((px(marks[i]) / W - 0.5) * WIDTH, (0.5 - Y_DOT / H) * HEIGHT, 0));
  }
  return {
    mesh,
    draw,
    canvas: texture.canvas,
    dotAt,
    hit(ray) {
      const uv = ray.intersectObject(mesh)[0]?.uv;
      return uv ? dotAt(uv.x * W, (1 - uv.y) * H) : -1;
    },
    localDot,
    normal: [0, Math.cos(TILT), Math.sin(TILT)],
    dispose: () => texture.dispose(),
  };
}
