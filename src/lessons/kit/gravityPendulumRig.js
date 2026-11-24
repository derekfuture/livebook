// 图 2.5-1。悬点伸出桌沿，球心、厘米尺与停表各自位于实物上。
import * as THREE from 'three';
import { inked, paint } from '../../live/ink.js';
import { canvasTex } from './props.js';

export const SUSPEND = { x: -0.17, y: 0.96, z: 0.025 },
  RADIUS = 0.021,
  RULER_SPAN = 0.9;
export function gravityPendulumRig() {
  const group = new THREE.Group(),
    textures = [];
  function block(parent, w, h, d, x, y, z, color) {
    const o = inked(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint(color)), { width: 0.7 });
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }
  function cyl(parent, r, h, x, y, z, color) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 28), paint(color));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  function plate(parent, w, h, x, y, z, tex) {
    const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
    o.position.set(x, y, z);
    textures.push(tex);
    parent.add(o);
    return o;
  }
  block(group, 0.32, 0.024, 0.25, 0.185, 0.305, 0, 0xbda276);
  for (const x of [0.045, 0.325])
    for (const z of [-0.10, 0.10]) block(group, 0.023, 0.294, 0.023, x, 0.147, z, 0xb49a72);
  block(group, 0.15, 0.024, 0.105, 0.19, 0.329, 0, 0x586866);
  cyl(group, 0.009, 0.666, 0.19, 0.674, 0, 0x939f9d);
  const arm = cyl(group, 0.006, 0.38, 0.01, 0.978, SUSPEND.z, 0x939f9d);
  arm.rotation.z = Math.PI / 2;
  block(group, 0.034, 0.026, 0.059, 0.19, 0.978, 0.013, 0x5c6968);
  const clamp = block(group, 0.037, 0.027, 0.027, SUSPEND.x, 0.9735, SUSPEND.z, 0x697b79);
  // 夹子外留一段自由线端。把这一端向下抽，另一端的摆线等量缩短。
  const tailX = SUSPEND.x + 0.055;
  const bridge = cyl(group, 0.0015, tailX - SUSPEND.x, (SUSPEND.x + tailX) / 2, 0.978, 0.039, 0x594e40);
  bridge.rotation.z = Math.PI / 2;
  const tail = cyl(group, 0.0015, 1, tailX, 0, 0.039, 0x594e40);
  const grip = cyl(group, 0.010, 0.028, tailX, 0, 0.039, 0x9d683c);
  const pivot = new THREE.Group();
  pivot.position.set(SUSPEND.x, SUSPEND.y, SUSPEND.z);
  group.add(pivot);
  const cord = cyl(pivot, 0.0013, 1, 0, 0, 0, 0x594e40);
  const ball = inked(new THREE.Mesh(new THREE.SphereGeometry(RADIUS, 32, 24), new THREE.MeshStandardMaterial({ color: 0xb29559, metalness: 0.25, roughness: 0.36 })), { width: 0.65 });
  pivot.add(ball);
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.0038, 12, 8), paint(0x634d34));
  pivot.add(knot);

  const ruler = new THREE.Group();
  group.add(ruler);
  const rw = 0.048;
  block(ruler, 0.073, 0.012, 0.056, 0, -0.989, -0.01, 0x687875);
  cyl(ruler, 0.005, 0.094, 0, -0.946, -0.008, 0x788b88);
  block(ruler, rw, RULER_SPAN + 0.01, 0.004, 0, -RULER_SPAN / 2, -0.002, 0xd3bea1);
  const scale = plate(
    ruler,
    rw,
    RULER_SPAN,
    0,
    -RULER_SPAN / 2,
    0.0002,
    canvasTex(256, 4500, (c, w, h) => {
      c.fillStyle = '#f2e3c3';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#303b3c';
      c.textAlign = 'right';
      c.textBaseline = 'middle';
      c.font = 'bold 32px sans-serif';
      for (let mm = 0; mm <= 900; mm++) {
        const y = (mm * h) / 900,
          len = mm % 10 === 0 ? 0.32 : mm % 5 === 0 ? 0.22 : 0.12;
        c.fillRect(w * (1 - len), Math.max(0, y - 1), w * len, 2);
        if (mm > 0 && mm % 10 === 0 && mm < 900) c.fillText(String(mm / 10), w * 0.59, y);
      }
      c.textAlign = 'left'; c.font = '24px sans-serif'; c.fillText('cm', 6, 31);
    }),
  );
  // 图 2.5-3 的直角边。贴近摆球正面，与球心等高的一边一直延伸到毫米刻线。
  const triangle = new THREE.Shape();
  triangle.moveTo(0, 0); triangle.lineTo(0.086, 0); triangle.lineTo(0, -0.032); triangle.closePath();
  const straightedge = new THREE.Mesh(new THREE.ShapeGeometry(triangle), new THREE.MeshBasicMaterial({
    color: 0x85b6b4, transparent: true, opacity: 0.33, depthWrite: false, side: THREE.DoubleSide,
  }));
  straightedge.position.set(SUSPEND.x - 0.046, 0, SUSPEND.z + RADIUS + 0.001);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(straightedge.geometry),
    new THREE.LineBasicMaterial({ color: 0x526e6c }));
  straightedge.add(edge);
  straightedge.visible = false;
  group.add(straightedge);
  // 指针从球的下方对准平衡位置，与摆球在同一竖直平面，避免斜视时产生视差。
  block(group, 0.05, 0.012, 0.04, SUSPEND.x + 0.073, 0.006, -0.046, 0x687875);
  cyl(group, 0.003, 0.59, SUSPEND.x + 0.073, 0.3, -0.046, 0x879592);
  const guide = block(group, 0.073, 0.002, 0.003, SUSPEND.x + 0.0365, 0.18, -0.046, 0x8e7163);
  const bracket = block(group, 0.003, 0.003, 0.071, SUSPEND.x, 0.18, -0.0105, 0x8e7163);
  const midline = block(group, 0.0025, 0.025, 0.0025, SUSPEND.x, 0.18, SUSPEND.z, 0x8b4033);
  const watch = new THREE.Group();
  group.add(watch);
  watch.position.set(0.091, 0.317, 0.074);
  block(watch, 0.119, 0.012, 0.065, 0, 0.006, 0, 0x53645e);
  const caseFace = block(watch, 0.13, 0.078, 0.036, 0, 0.048, 0, 0x405752);
  const watchTex = canvasTex(640, 320, () => {});
  const screen = plate(watch, 0.111, 0.059, 0, 0.049, 0.0184, watchTex);
  const key = block(watch, 0.045, 0.010, 0.022, 0.031, 0.092, 0.001, 0x976539);
  caseFace.attach(screen); caseFace.attach(key);
  const restY = key.position.y;
  let digits;
  function display(seconds, status) {
    const val = seconds.toFixed(2);
    if (val + status === digits) return;
    digits = val + status;
    const c = watchTex.canvas.getContext('2d');
    c.fillStyle = '#dbe2c9'; c.fillRect(0, 0, 640, 320);
    c.fillStyle = '#273e37'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'bold 108px monospace'; c.fillText(val + ' s', 320, 201);
    c.font = '54px sans-serif'; c.fillText(status, 320, 70);
    key.position.y = status === '计时中' ? restY - 0.004 : restY;
    watchTex.needsUpdate = true;
  }
  function pose(length, angle) {
    const slack = 0.92 - length;
    tail.scale.y = slack;
    tail.position.y = 0.978 - slack / 2;
    grip.position.y = 0.978 - slack;
    pivot.rotation.z = angle;
    cord.scale.y = length - RADIUS;
    cord.position.y = -(length - RADIUS) / 2;
    ball.position.y = -length;
    knot.position.y = -length - RADIUS;
    straightedge.position.y = SUSPEND.y - length;
    midline.position.y = SUSPEND.y - length - RADIUS - 0.021;
    bracket.position.y = guide.position.y = midline.position.y - 0.0125;
  }
  return {
    group,
    ruler, straightedge,
    scale,
    ball,
    grip,
    caseFace,
    clamp,
    key,
    watch,
    screen,
    display,
    pose,
    dispose() {
      textures.forEach((t) => t.dispose());
    },
  };
}
