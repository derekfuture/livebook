import * as THREE from 'three';
import { inked, paint } from '../../live/ink.js';
import { block } from './electronicsBench.js';
import { canvasTex, textPlate } from './props.js';

export const FREE_SPRING_TOP = { x: -0.1, y: 0.5, z: 0.015 };
export const FREE_SPRING_RADIUS = 0.013;
const ATTACHMENT = 0.017;

export function freeSpringRig(model) {
  const group = new THREE.Group(),
    textures = [];
  const p = model.parameters;
  const equilibriumY = FREE_SPRING_TOP.y - p.naturalLength - (p.mass * p.gravity) / p.stiffness - ATTACHMENT;
  const cylinder = (parent, radius, length, x, y, z, color) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 28), paint(color));
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  function label(parent, text, x, y, z, w, h) {
    const mesh = textPlate(text, {
      w,
      h,
      bg: '#eee3c8',
      color: '#3c4744',
      font: `bold ${Math.min(380 / [...text].length, (370 * h) / w)}px sans-serif`,
    });
    mesh.position.set(x, y, z);
    parent.add(mesh);
    textures.push(mesh.material.map);
    return mesh;
  }
  block(group, 0.46, 0.012, 0.24, 0, 0.006, 0, 0xc9b58f);
  block(group, 0.12, 0.018, 0.12, -0.17, 0.021, -0.025, 0x637371);
  cylinder(group, 0.005, 0.49, -0.21, 0.275, -0.045, 0x8e999a);
  const arm = cylinder(group, 0.004, 0.115, -0.155, 0.512, -0.045, 0x8e999a);
  arm.rotation.z = Math.PI / 2;
  block(group, 0.022, 0.022, 0.025, -0.21, 0.512, -0.045, 0x637371);
  const forward = cylinder(group, 0.004, 0.06, -0.1, 0.512, -0.015, 0x8e999a);
  forward.rotation.x = Math.PI / 2;
  cylinder(group, 0.002, 0.012, -0.1, 0.506, 0.015, 0x8e999a);

  const referenceLength = p.naturalLength + (p.mass * p.gravity) / p.stiffness;
  const points = Array.from({ length: 321 }, (_, i) => {
    const t = i / 320,
      angle = t * 16 * 2 * Math.PI;
    const r = 0.006 * Math.min(1, t * 36, (1 - t) * 36);
    return new THREE.Vector3(r * Math.cos(angle), t * referenceLength, r * Math.sin(angle));
  });
  // Reuse the same helix geometry. Scaling changes axial pitch, not radial size.
  const spring = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 320, 0.00065, 6, false),
    paint(0x8f999c),
  );
  group.add(spring);
  const ball = inked(new THREE.Mesh(new THREE.SphereGeometry(FREE_SPRING_RADIUS, 32, 24), paint(0xa3a9aa)), {
    width: 0.65,
  });
  group.add(ball);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.003, 0.0007, 8, 24), paint(0x7b888b));
  hook.position.y = 0.015;
  ball.add(hook);

  // The fixed scale and equilibrium reference share the ball-centre plane.
  const ruler = new THREE.Group();
  ruler.position.set(-0.054, equilibriumY, FREE_SPRING_TOP.z);
  group.add(ruler);
  block(group, 0.05, 0.012, 0.045, -0.054, 0.018, 0.01, 0x687875);
  cylinder(group, 0.003, equilibriumY - 0.074, -0.054, (equilibriumY - 0.074) / 2 + 0.024, 0.01, 0x879592);
  block(ruler, 0.033, 0.14, 0.004, 0, 0, -0.002, 0xd4c39c);
  const rulerTex = canvasTex(300, 1400, (c, w, h) => {
    c.fillStyle = '#efe2c0';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#374440';
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.font = 'bold 68px sans-serif';
    for (let mm = -60; mm <= 60; mm++) {
      const y = h / 2 + mm * 10;
      const width = mm % 10 === 0 ? 90 : mm % 5 === 0 ? 65 : 38;
      c.fillRect(0, y - 1.5, width, 3);
      if (mm % 10 === 0) c.fillText(String(mm / 10), 105, y);
    }
    c.font = 'bold 55px sans-serif';
    c.fillText('cm ↓', 90, 45);
  });
  textures.push(rulerTex);
  const scale = new THREE.Mesh(new THREE.PlaneGeometry(0.033, 0.14), new THREE.MeshBasicMaterial({ map: rulerTex }));
  scale.position.z = 0.0002;
  ruler.add(scale);
  // Reference tip ends short of the ball; there is no rod through the moving sphere.
  const zero = block(ruler, 0.011, 0.0013, 0.002, -0.022, 0, 0, 0x8b5845);

  // Same tabletop stopwatch presentation as the existing pendulum experiment.
  const watch = new THREE.Group();
  watch.position.set(0.08, 0.028, 0.062);
  watch.rotation.x = 0.5;
  group.add(watch);
  block(group, 0.095, 0.014, 0.055, 0.08, 0.019, 0.06, 0x59665f);
  block(watch, 0.112, 0.043, 0.062, 0, 0.0215, 0, 0x536761);
  const watchTex = canvasTex(640, 230, () => {});
  textures.push(watchTex);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.082, 0.029), new THREE.MeshBasicMaterial({ map: watchTex }));
  screen.position.set(0, 0.0434, -0.003);
  screen.rotation.x = -Math.PI / 2;
  watch.add(screen);
  const key = block(watch, 0.026, 0.009, 0.016, 0, 0.045, 0.021, 0xa66c43);
  const name = label(group, '停表', 0.08, 0.013, 0.107, 0.04, 0.014);
  name.rotation.x = -Math.PI / 2;
  let digits;
  function display(seconds) {
    const value = seconds.toFixed(2);
    if (value === digits) return;
    digits = value;
    const c = watchTex.canvas.getContext('2d');
    c.fillStyle = '#ccdabd';
    c.fillRect(0, 0, 640, 230);
    c.fillStyle = '#283d34';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = 'bold 120px monospace';
    c.fillText(value + ' s', 320, 120);
    watchTex.needsUpdate = true;
  }
  function pose() {
    const state = model.observe();
    ball.position.set(FREE_SPRING_TOP.x, equilibriumY - state.q, FREE_SPRING_TOP.z);
    spring.position.set(FREE_SPRING_TOP.x, FREE_SPRING_TOP.y - state.length, FREE_SPRING_TOP.z);
    spring.scale.y = state.length / referenceLength;
  }
  pose();
  display(0);
  return {
    group,
    ball,
    spring,
    ruler,
    scale,
    zero,
    watch,
    screen,
    key,
    equilibriumY,
    pose,
    display,
    dispose() {
      textures.forEach((t) => t.dispose());
    },
  };
}
