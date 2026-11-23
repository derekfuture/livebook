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
  block(group, 0.41, 0.024, 0.3, 0.135, 0.305, 0, 0xbda276);
  for (const x of [-0.045, 0.315])
    for (const z of [-0.116, 0.116]) block(group, 0.023, 0.294, 0.023, x, 0.147, z, 0xb49a72);
  block(group, 0.15, 0.024, 0.105, 0.19, 0.329, 0, 0x586866);
  cyl(group, 0.009, 0.666, 0.19, 0.674, 0, 0x939f9d);
  const arm = cyl(group, 0.006, 0.38, 0.01, 0.978, SUSPEND.z, 0x939f9d);
  arm.rotation.z = Math.PI / 2;
  block(group, 0.034, 0.026, 0.059, 0.19, 0.978, 0.013, 0x5c6968);
  const clamp = block(group, 0.037, 0.027, 0.027, SUSPEND.x, 0.9735, SUSPEND.z, 0x697b79);
  const spool = cyl(group, 0.014, 0.017, SUSPEND.x + 0.025, 0.975, SUSPEND.z, 0xa4855e);
  spool.rotation.x = Math.PI / 2;
  const pivot = new THREE.Group();
  pivot.position.set(SUSPEND.x, SUSPEND.y, SUSPEND.z);
  group.add(pivot);
  const cord = cyl(pivot, 0.0013, 1, 0, 0, 0, 0x594e40);
  const ball = inked(new THREE.Mesh(new THREE.SphereGeometry(RADIUS, 32, 24), paint(0xb69c63)), { width: 0.65 });
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
      c.font = 'bold 35px sans-serif';
      for (let mm = 0; mm <= 900; mm++) {
        const y = (mm * h) / 900,
          len = mm % 10 === 0 ? 0.32 : mm % 5 === 0 ? 0.22 : 0.12;
        c.fillRect(w * (1 - len), Math.max(0, y - 1), w * len, 2);
        if (mm > 0 && mm % 20 === 0 && mm < 900) c.fillText(String(mm / 10), w * 0.59, y);
      }
      c.fillText('cm', w * 0.59, 42);
    }),
  );
  // 摆球后方的细指针给出平衡位置；支架可随球心高度调整。
  block(group, 0.05, 0.012, 0.04, SUSPEND.x + 0.073, 0.006, -0.046, 0x687875);
  cyl(group, 0.003, 0.59, SUSPEND.x + 0.073, 0.3, -0.046, 0x879592);
  const guide = block(group, 0.073, 0.002, 0.003, SUSPEND.x + 0.0365, 0.18, -0.046, 0x8e7163);
  const watch = new THREE.Group();
  group.add(watch);
  watch.position.set(0.015, 0.333, 0.071);
  watch.rotation.x = 0.5;
  block(group, 0.095, 0.014, 0.055, 0.015, 0.324, 0.068, 0x59665f);
  block(watch, 0.112, 0.043, 0.062, 0, 0.0215, 0, 0x536761);
  const watchTex = canvasTex(640, 230, () => {});
  const screen = plate(watch, 0.082, 0.029, 0, 0.0434, -0.003, watchTex);
  screen.rotation.x = -Math.PI / 2;
  const key = block(watch, 0.026, 0.009, 0.016, 0, 0.045, 0.021, 0xa66c43);
  let digits;
  function display(seconds) {
    const val = seconds.toFixed(2);
    if (val === digits) return;
    digits = val;
    const c = watchTex.canvas.getContext('2d');
    c.fillStyle = '#ccdabd';
    c.fillRect(0, 0, 640, 230);
    c.fillStyle = '#283d34';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = 'bold 120px monospace';
    c.fillText(val + ' s', 320, 120);
    watchTex.needsUpdate = true;
  }
  function pose(length, angle) {
    pivot.rotation.z = angle;
    cord.scale.y = length - RADIUS;
    cord.position.y = -(length - RADIUS) / 2;
    ball.position.y = -length;
    knot.position.y = -length - RADIUS;
    guide.position.y = SUSPEND.y - length;
  }
  return {
    group,
    ruler,
    scale,
    ball,
    spool,
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
