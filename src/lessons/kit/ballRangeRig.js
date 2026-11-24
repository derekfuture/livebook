import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { block } from './electronicsBench.js';
import { canvasTex, textPlate } from './props.js';
import { BALL_RADIUS as R, LIP_HEIGHT } from './ballRange.js';

export const LIP = 0.09,
  PAPER_Y = 0.008,
  CY = PAPER_Y + LIP_HEIGHT + R;
export const PAN_X = 0.19,
  PAN_Y = 0.039,
  FLAT = 0.03,
  LENGTH = 0.14;
export const RELEASE_X = [0.204, 0.246];
export const BOB_Z = 0.026, TRIAL_SLOPE = 0.34;
const GRIP_D = 0.028, LEVEL_Y = CY - R - 0.004;
// 槽口位置固定，调节末段的内端。固定夹以后的轨道和释放点保持原高度。
function tiltOffset(x, slope) {
  const d = Math.max(0, x - LIP);
  const t = Math.min(1, Math.max(0, (d - FLAT) / 0.03));
  return -slope * d * (1 - t * t * (3 - 2 * t));
}
export function trackHeight(x, slope = 0) {
  return 0.075 * (Math.max(0, x - LIP - FLAT) / LENGTH) ** 2 + tiltOffset(x, slope);
}
const LEFT = LIP - 0.41,
  WIDTH = 0.44,
  DEPTH = 0.108,
  SPAN = 0.4;
export function ballRangeRig() {
  const group = new THREE.Group();
  const tube = (points, r, color) => {
    const curve = new THREE.CatmullRomCurve3(points);
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(16, points.length), r, 10, false), paint(color));
    group.add(m);
    return m;
  };
  block(group, 0.133, 0.011, 0.1, LIP + 0.095, 0.0055, -0.024, 0x706c61);
  block(group, 0.009, CY, 0.009, LIP + 0.072, CY / 2, -0.035, 0x737c79);
  const clampX = LIP + 0.072;
  const clamp = block(group, 0.023, 0.012, 0.055, clampX, CY - R + trackHeight(clampX) - 0.006, -0.021, 0x615f58);
  clamp.rotation.z = Math.atan((2 * 0.075 * (clampX - LIP - FLAT)) / LENGTH ** 2);
  const pts = Array.from({ length: 65 }, (_, i) => {
    const x = LIP + ((FLAT + LENGTH) * i) / 64;
    return new THREE.Vector3(x, CY - R + trackHeight(x), 0);
  });
  const verts = [],
    indices = [];
  for (const p of pts) for (const z of [-0.012, 0.012]) verts.push(p.x, p.y, z);
  for (let j = 1; j < pts.length; j++) {
    let i = 2 * j;
    indices.push(i - 2, i - 1, i, i, i - 1, i + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  group.add(new THREE.Mesh(geo, paint(0x989994, { side: THREE.DoubleSide })));
  const sides = [-0.012, 0.012].map(z => tube(
      pts.map((p) => new THREE.Vector3(p.x, p.y + 0.001, z)),
      0.0016,
      0x848d8c,
    ));
  const grip = block(group, 0.014, 0.008, 0.012, LIP + GRIP_D, LEVEL_Y, 0.015, 0xa97846);
  // 横线固定在支架侧面，对准调节柄的中线时，末段水平。
  block(group, 0.047, 0.001, 0.002, LIP + 0.026, LEVEL_Y, 0.022, 0x504c43);
  block(grip, 0.012, 0.001, 0.0005, 0, 0, 0.0062, 0xf8e5bd);
  const sections = [geo, ...sides.map(m => m.geometry)].map(g => ({
    g, base: g.attributes.position.array.slice(),
  }));
  function setSlope(slope) {
    grip.position.y = LEVEL_Y - GRIP_D * slope;
    for (const { g, base } of sections) {
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setY(i, base[i * 3 + 1] + tiltOffset(base[i * 3], slope));
      pos.needsUpdate = true;
      g.computeVertexNormals();
      g.computeBoundingSphere();
      g.computeBoundingBox();
    }
  }
  const slopeAtGrip = y => Math.max(0, Math.min(TRIAL_SLOPE, (LEVEL_Y - y) / GRIP_D));
  const trace = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({
    color: 0x73665a, dashSize: 0.004, gapSize: 0.003,
  }));
  trace.visible = false;
  group.add(trace);
  function trialPath(physics) {
    trace.visible = !!physics;
    if (!physics) return;
    const points = Array.from({ length: 81 }, (_, j) => {
      const { x, drop } = physics.position(0, physics.airTime * j / 80);
      return new THREE.Vector3(LIP - x, CY - drop, 0);
    });
    trace.geometry.setFromPoints(points);
    trace.computeLineDistances();
    trace.geometry.computeBoundingSphere();
  }
  // 侧面的字牌指着球心所在的横截面，轨道上没有挡住滚动的凸块。
  RELEASE_X.forEach((x, i) => {
    const y = CY + trackHeight(x) - R;
    const tag = textPlate(i ? 'B' : 'A', { w: 0.019, h: 0.016, bg: '#e9dfc7', color: '#534633', font: 'bold 320px sans-serif' });
    tag.position.set(x, y - 0.008, 0.014);
    group.add(tag);
  });
  block(group, 0.004, 0.003, 0.036, LIP, CY - R - 0.002, 0.011, 0x676a65);
  tube([new THREE.Vector3(LIP, CY - R, BOB_Z), new THREE.Vector3(LIP, PAPER_Y + 0.017, BOB_Z)], 0.00048, 0x74624c);
  const bob = new THREE.Mesh(new THREE.ConeGeometry(0.0035, 0.012, 20), paint(0xa07a4a));
  bob.rotation.z = Math.PI;
  bob.position.set(LIP, PAPER_Y + 0.01, BOB_Z);
  group.add(bob);
  block(group, WIDTH, 0.0075, DEPTH + 0.029, LEFT + WIDTH / 2, PAPER_Y - 0.004, 0.0145, 0x96826b);
  block(group, 0.086, 0.008, 0.032, 0.117, 0.004, 0.111, 0xb49c75);
  block(group, 0.005, 0.02, DEPTH, LEFT + 0.0025, PAPER_Y + 0.01, 0, 0xa18f74);
  const tex = canvasTex(2640, 648, () => {});
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH, DEPTH), new THREE.MeshBasicMaterial({ map: tex }));
  paper.rotation.x = -Math.PI / 2;
  paper.position.set(LEFT + WIDTH / 2, PAPER_Y, 0);
  group.add(paper);
  const scale = block(group, SPAN + 0.012, 0.002, 0.022, LIP - SPAN / 2, PAPER_Y + 0.001, 0.068, 0xcdba93);
  const ticks = canvasTex(2460, 132, (c, w, h) => {
    c.fillStyle = '#e6d4ae';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#4f493f';
    c.font = 'bold 37px sans-serif';
    c.textAlign = 'center';
    for (let mm = 0; mm <= 400; mm++) {
      const x = w * (1 - (mm / 1000 + 0.006) / (SPAN + 0.012));
      c.fillRect(x, 0, 2, mm % 10 === 0 ? 48 : mm % 5 === 0 ? 32 : 17);
      if (mm % 10 === 0) c.fillText(String(mm / 10), x, 99);
    }
    c.font = '25px sans-serif';
    c.fillText('cm', w - 72, 128);
  });
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(SPAN + 0.012, 0.022),
    new THREE.MeshBasicMaterial({ map: ticks }),
  );
  face.rotation.x = -Math.PI / 2;
  face.position.y = 0.0011;
  scale.add(face);
  // 尺面的一小条零刻线也是步骤提示圈的定位点。
  const zero = new THREE.Mesh(new THREE.PlaneGeometry(0.0004, 0.0075), new THREE.MeshBasicMaterial({color: 0x514737}));
  zero.rotation.x = -Math.PI / 2;
  zero.position.set(SPAN / 2, 0.00115, -0.0072);
  scale.add(zero);
  const balls = [0x616e7e, 0xc7a674].map((c) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(R, 36, 24), paint(c));
    const pick = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.5, 12, 8),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    pick.userData.pick = true;
    b.add(pick);
    group.add(b);
    return b;
  });
  block(group, 0.079, 0.019, 0.066, PAN_X, 0.0095, 0.063, 0x7b8986);
  block(group, 0.036, 0.015, 0.027, PAN_X, 0.0265, 0.052, 0x969994);
  block(group, 0.065, 0.005, 0.044, PAN_X, PAN_Y - 0.0025, 0.052, 0xb3b5ad);
  const display = canvasTex(420, 125, () => {});
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.045, 0.015), new THREE.MeshBasicMaterial({ map: display }));
  screen.rotation.x = -Math.PI / 2;
  screen.position.set(PAN_X, 0.0192, 0.084);
  group.add(screen);
  function weigh(g) {
    const c = display.canvas.getContext('2d');
    c.fillStyle = '#364342';
    c.fillRect(0, 0, 420, 125);
    c.fillStyle = '#e8edc9';
    c.font = 'bold 82px sans-serif';
    c.textAlign = 'center';
    c.fillText(g + ' g', 210, 91);
    display.needsUpdate = true;
  }
  function ink(origin, marks, findingOrigin) {
    const c = tex.canvas.getContext('2d'),
      px = (x) => (x - LEFT) * 6000,
      py = (z) => (z + DEPTH / 2) * 6000;
    c.fillStyle = '#f3eddb';
    c.fillRect(0, 0, 2640, 648);
    const line = (x, z1, z2, color) => {
      c.strokeStyle = color;
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(x, py(z1));
      c.lineTo(x, py(z2));
      c.stroke();
    };
    c.font = 'bold 52px sans-serif';
    c.textAlign = 'center';
    if (findingOrigin || origin) {
      c.strokeStyle = '#81694c';
      c.lineWidth = 4;
      c.beginPath();
      c.arc(px(LIP), py(BOB_Z), 22, 0, 2 * Math.PI);
      c.stroke();
    }
    if (origin) {
      c.strokeStyle = '#ac9d86';
      c.lineWidth = 3;
      c.setLineDash([22, 15]);
      c.beginPath();
      c.moveTo(px(LIP), py(0));
      c.lineTo(px(LEFT + 0.006), py(0));
      c.stroke();
      c.setLineDash([]);
      line(px(LIP), -0.012, 0.034, '#81694c');
      c.fillStyle = '#645642';
      c.beginPath();
      c.arc(px(LIP), py(0), 9, 0, 2 * Math.PI);
      c.fill();
      c.fillText('O', px(LIP + 0.005), py(-0.004));
    }
    for (const m of marks) {
      const x = px(LIP - m.range);
      line(x, 0, 0.012, '#9a907e');
      c.fillStyle = m.excluded ? '#826f63' : '#333439';
      c.beginPath();
      c.ellipse(x, py(0), 7, 6, -0.25, 0, 2 * Math.PI);
      c.fill();
      c.fillText(m.excluded ? '×' : m.label, x, py(-0.004));
    }
    tex.needsUpdate = true;
  }
  return { group, paper, scale, balls, screen, bob, zero, weigh, ink, grip, setSlope, slopeAtGrip, levelY: LEVEL_Y, trialPath };
}
