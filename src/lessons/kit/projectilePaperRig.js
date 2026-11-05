// 图 5.3-3。纸面沿 xy，正 z 朝学生，挡板横向保持水平，横截面向背板倾斜。
import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { block } from './electronicsBench.js';
import { canvasTex } from './props.js';
export const EXIT_X = -0.074,
  EXIT_Y = 0.226,
  BALL_R = 0.006,
  PAPER_Z = 0.002;
export const PAPER_W = 0.248,
  PAPER_H = 0.225,
  PAPER_LEFT = EXIT_X - 0.019,
  PAPER_TOP = EXIT_Y + 0.01;
export const RAMP_LENGTH = 0.139,
  RAMP_RISE = 0.065;
export const rampY = (x) => EXIT_Y + RAMP_RISE * ((EXIT_X - x) / RAMP_LENGTH) ** 2;
const BOTTOM = PAPER_TOP - PAPER_H;
const angle = Math.PI / 7;
function rod(group, x, y, z, r, h, color) {
  const obj = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 32), paint(color));
  obj.position.set(x, y, z);
  group.add(obj);
  return obj;
}
function tube(group, points, r, color) {
  const path = new THREE.CatmullRomCurve3(points);
  const obj = new THREE.Mesh(new THREE.TubeGeometry(path, Math.max(32, points.length), r, 6, false), paint(color));
  group.add(obj);
  return obj;
}
export function projectilePaperRig() {
  const group = new THREE.Group(),
    cx = PAPER_LEFT + PAPER_W / 2,
    cy = PAPER_TOP - PAPER_H / 2;
  block(group, 0.397, 0.009, 0.1, -0.024, 0.0045, 0, 0x606969);
  for (const x of [PAPER_LEFT + 0.004, PAPER_LEFT + PAPER_W - 0.004]) {
    rod(group, x, PAPER_TOP / 2, -0.008, 0.003, PAPER_TOP, 0x8c9694);
    rod(group, x, (BOTTOM + EXIT_Y) / 2, 0.034, 0.0018, EXIT_Y - BOTTOM, 0x878f8a);
  }
  block(group, PAPER_W + 0.005, PAPER_H + 0.004, 0.005, cx, cy, -0.001, 0xa98c60);
  const tex = canvasTex(1240, 1125, () => {}),
    paper = new THREE.Mesh(new THREE.PlaneGeometry(PAPER_W, PAPER_H), new THREE.MeshBasicMaterial({ map: tex }));
  paper.position.set(cx, cy, PAPER_Z);
  group.add(paper);
  const carbon = new THREE.Mesh(
    new THREE.PlaneGeometry(PAPER_W - 0.002, PAPER_H),
    new THREE.MeshBasicMaterial({ color: 0x465767, side: THREE.DoubleSide }),
  );
  const handle = block(group, PAPER_W, 0.0035, 0.003, cx, BOTTOM, 0.0035, 0x986b47);
  block(handle, 0.022, 0.009, 0.009, PAPER_W / 2 + 0.008, 0, 0, 0x986b47);
  carbon.position.z = PAPER_Z + 0.00035;
  carbon.position.x = cx;
  group.add(carbon);
  const roller = rod(group, cx, PAPER_TOP + 0.0035, PAPER_Z, 0.004, PAPER_W + 0.009, 0x755c48);
  roller.rotation.z = Math.PI / 2;
  function setCarbon(fraction) {
    const h = Math.max(0.0003, PAPER_H * fraction);
    carbon.scale.y = h / PAPER_H;
    carbon.position.y = PAPER_TOP - h / 2;
    carbon.visible = fraction > 0.002;
    handle.position.y = PAPER_TOP - h;
  }
  const px = (x) => ((x + EXIT_X - PAPER_LEFT) / PAPER_W) * 1240,
    py = (drop) => ((PAPER_TOP - EXIT_Y + drop) / PAPER_H) * 1125;
  function ink(origin, marks, trace, readings) {
    const g = tex.canvas.getContext('2d');
    g.fillStyle = '#f3ecd7';
    g.fillRect(0, 0, 1240, 1125);
    for (let i = -5; i <= 50; i++) {
      g.lineWidth = i % 2 ? 1 : 1.7;
      g.strokeStyle = i % 2 ? '#dcdac9' : '#c4c9b8';
      g.beginPath();
      g.moveTo(px(i * 0.005), 0);
      g.lineTo(px(i * 0.005), 1125);
      g.moveTo(0, py(i * 0.005));
      g.lineTo(1240, py(i * 0.005));
      g.stroke();
    }
    if (origin) {
      g.strokeStyle = '#785c47';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(px(0), py(0));
      g.lineTo(px(0.225), py(0));
      g.moveTo(px(0), py(0));
      g.lineTo(px(0), py(0.21));
      for (let mm = 1; mm <= 210; mm++) {
        const y = py(mm / 1000);
        g.moveTo(px(0), y);
        g.lineTo(px(mm % 10 === 0 ? -0.003 : mm % 5 === 0 ? -0.002 : -0.001), y);
      }
      g.stroke();
      g.fillStyle = '#554737';
      g.font = '22px sans-serif';
      g.textAlign = 'center';
      g.fillText('O', px(-0.005), py(0) - 3);
      for (let n = 2; n <= 20; n += 2) {
        g.fillText(String(n), px(n / 100), py(0) - 6);
        g.fillText(String(n), px(-0.009), py(n / 100) + 6);
      }
      g.fillText('cm', px(0.221), py(0) - 6);
    }
    for (const m of marks) {
      g.fillStyle = '#383c43';
      g.beginPath();
      g.ellipse(px(m.x), py(m.drop), 4.4, 3.6, -0.24, 0, 2 * Math.PI);
      g.fill();
      if (!m.valid) {
        g.fillStyle = '#9e6552';
        g.fillText('×', px(m.x) + 9, py(m.drop) - 5);
      }
    }
    if (trace.length) {
      g.strokeStyle = '#99614a';
      g.lineWidth = 3.2;
      g.lineJoin = 'round';
      g.beginPath();
      trace.forEach((p, i) => (i ? g.lineTo(px(p.x), py(p.drop)) : g.moveTo(px(p.x), py(p.drop))));
      g.stroke();
    }
    for (const r of readings) {
      g.strokeStyle = '#577a78';
      g.lineWidth = 2;
      g.setLineDash([5, 3]);
      g.beginPath();
      g.moveTo(px(0), py(r.drop));
      g.lineTo(px(r.x), py(r.drop));
      g.lineTo(px(r.x), py(0));
      g.stroke();
      g.setLineDash([]);
    }
    tex.needsUpdate = true;
  }
  // 槽面由相同的曲线生成，最右端切线水平。
  const pts = [];
  for (let k = 0; k <= 80; k++) {
    const x = EXIT_X - RAMP_LENGTH + (RAMP_LENGTH * k) / 80;
    pts.push(new THREE.Vector3(x, rampY(x) - BALL_R, PAPER_Z + BALL_R));
  }
  const vertices = [],
    idx = [];
  for (const p of pts) {
    for (const z of [-0.008, 0.008]) vertices.push(p.x, p.y, p.z + z);
  }
  for (let k = 1; k < pts.length; k++) {
    const i = k * 2;
    idx.push(i - 2, i - 1, i, i, i - 1, i + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  group.add(new THREE.Mesh(geo, paint(0x818d8d, { side: THREE.DoubleSide })));
  for (const z of [-0.009, 0.009])
    tube(
      group,
      pts.map((p) => new THREE.Vector3(p.x, p.y + 0.001, p.z + z)),
      0.0015,
      0x798583,
    );
  for (const x of [EXIT_X - RAMP_LENGTH + 0.012, EXIT_X - 0.015]) {
    const h = rampY(x) - BALL_R - 0.002;
    rod(group, x, h / 2, PAPER_Z + BALL_R, 0.003, h, 0x929995);
  }
  const ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 36, 24), paint(0x657483));
  group.add(ball);
  const releaseMark = block(group, 0.002, 0.006, 0.022, 0, 0, 0, 0xb3794e);
  releaseMark.visible = false;
  const baffle = new THREE.Group();
  group.add(baffle);
  const heightScale = canvasTex(88, 900, (g, w, h) => {
    g.fillStyle = '#ead9b9';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#514b42';
    g.font = '24px sans-serif';
    for (let cm = 0; cm <= 20; cm++) {
      const y = ((PAPER_TOP - EXIT_Y + cm / 100) / PAPER_H) * h;
      g.fillRect(0, y, cm % 2 === 0 ? 27 : 15, 2);
      if (cm % 2 === 0) g.fillText(String(cm), 31, y + 8);
    }
  });
  const scale = new THREE.Mesh(new THREE.PlaneGeometry(0.012, PAPER_H),
    new THREE.MeshBasicMaterial({ map: heightScale }));
  scale.position.set(PAPER_LEFT + PAPER_W + 0.006, cy, 0.032);
  group.add(scale);
  const width = PAPER_W - 0.022,
    z = 0.018;
  const deck = block(baffle, width, 0.003, 0.037, cx, 0, z, 0xc59d66);
  deck.rotation.x = -angle;
  deck.position.y = (z - BALL_R - PAPER_Z) * Math.tan(angle) - BALL_R / Math.cos(angle) - 0.0015 / Math.cos(angle);
  for (const x of [PAPER_LEFT + 0.004, PAPER_LEFT + PAPER_W - 0.004]) {
    block(baffle, 0.013, 0.009, 0.016, x, 0, 0.034, 0x736e62);
    const screw = rod(baffle, x, 0, 0.045, 0.006, 0.01, 0x765e47);
    screw.rotation.x = Math.PI / 2;
  }
  block(baffle, 0.003, 0.018, 0.037, cx + width / 2, 0.007, z, 0x856a49);
  const ruler = block(group, 0.011, 0.008, 0.012, PAPER_LEFT + 0.004, 0, 0.016, 0x627c78);
  const rulerHeight = 0.009;
  const ticks = canvasTex(1984, 72, (g, w, h) => {
    g.fillStyle = '#e0cd9f';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#494f4c';
    g.textAlign = 'center';
    g.font = '30px sans-serif';
    for (let mm = 0; mm <= 220; mm++) {
      const x = ((EXIT_X + mm / 1000 - PAPER_LEFT) / PAPER_W) * w;
      g.fillRect(x, 0, 1.6, mm % 10 === 0 ? 28 : mm % 5 === 0 ? 19 : 10);
      if (mm % 10 === 0) g.fillText(String(mm / 10), x, 60);
    }
    g.fillText('cm', 55, 60);
  });
  const ruleBar = new THREE.Mesh(new THREE.PlaneGeometry(PAPER_W, rulerHeight),
    new THREE.MeshBasicMaterial({ map: ticks }));
  ruleBar.position.set(cx, 0, PAPER_Z + 0.0018);
  group.add(ruleBar);
  ruler.visible = ruleBar.visible = false;
  function setReader(drop, visible) {
    ruler.position.y = EXIT_Y - drop;
    ruleBar.position.y = ruler.position.y - rulerHeight / 2;
    ruler.visible = ruleBar.visible = visible;
  }
  function setDrop(drop) {
    baffle.position.y = EXIT_Y - drop;
  }
  function placeBall(x, y) {
    ball.position.set(x, y, PAPER_Z + BALL_R + 0.00035);
  }
  setCarbon(0);
  setDrop(0.04);
  placeBall(EXIT_X, EXIT_Y);
  ink(false, [], [], []);
  return {
    group,
    paper,
    carbon,
    handle,
    ball,
    baffle,
    releaseMark,
    ruler,
    ruleBar,
    setReader,
    setDrop,
    placeBall,
    setCarbon,
    ink,
  };
}
