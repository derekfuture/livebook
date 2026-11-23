import * as THREE from 'three';
import { inked, paint } from '../../live/ink.js';
import { block, wire } from './electronicsBench.js';
import { canvasTex, textPlate } from './props.js';
import { FREE_SPRING_RADIUS } from './freeSpringRig.js';
export const PHASE_TOP = 0.5,
  PHASE_BALL_X = [-0.11, 0.11],
  PHASE_BALL_Z = 0.015;

// 可见持球夹为鼠标操作辅助：闭合时静止握持，张开后退出原球的竖直运动通道。
export function springPhaseRig(model) {
  const group = new THREE.Group(),
    textures = [];
  const p = model.bodies[0].parameters;
  const referenceLength = p.naturalLength + (p.mass * p.gravity) / p.stiffness;
  const equilibriumY = PHASE_TOP - referenceLength - 0.017;
  const cylinder = (parent, radius, length, x, y, z, color) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 28), paint(color));
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  function label(parent, text, x, y, z, w, h, bg = '#eee3c8', color = '#3c4744') {
    const mesh = textPlate(text, {
      w,
      h,
      bg,
      color,
      font: `bold ${Math.min(380 / [...text].length, (370 * h) / w)}px sans-serif`,
    });
    mesh.position.set(x, y, z);
    parent.add(mesh);
    textures.push(mesh.material.map);
    return mesh;
  }
  block(group, 0.6, 0.012, 0.24, 0, 0.006, 0, 0xc9b58f);
  for (const x of [-0.25, 0.25]) {
    block(group, 0.065, 0.018, 0.12, x, 0.021, -0.04, 0x637371);
    cylinder(group, 0.005, 0.49, x, 0.275, -0.045, 0x8e999a);
  }
  block(group, 0.52, 0.014, 0.022, 0, 0.512, -0.045, 0x778b87);
  for (const x of PHASE_BALL_X) {
    const arm = cylinder(group, 0.0035, 0.06, x, 0.512, -0.015, 0x8e999a);
    arm.rotation.x = Math.PI / 2;
    cylinder(group, 0.002, 0.012, x, 0.506, PHASE_BALL_Z, 0x8e999a);
  }
  // Fixed grid is behind both ball paths, supported from the original frame.
  const board = block(group, 0.45, 0.158, 0.005, 0, equilibriumY, -0.081, 0xc2cbb9);
  for (const x of [-0.237, 0.237]) block(group, 0.025, 0.014, 0.04, x, equilibriumY, -0.061, 0x778b87);
  const gridTex = canvasTex(1800, 632, (c, w, h) => {
    c.fillStyle = '#e4e5d1';
    c.fillRect(0, 0, w, h);
    c.font = 'bold 38px sans-serif';
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    // This is a qualitative equilibrium reference, not a displaced ruler.
    // Near view must look straight at the equilibrium height to avoid parallax.
    c.strokeStyle = '#9c6953';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(130, h / 2);
    c.lineTo(w - 25, h / 2);
    c.stroke();
    c.fillStyle = '#49584e';
    c.fillText('O', 28, h / 2);
  });
  textures.push(gridTex);
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.158), new THREE.MeshBasicMaterial({ map: gridTex }));
  grid.position.set(0, equilibriumY, -0.0783);
  group.add(grid);
  const helix = Array.from({ length: 321 }, (_, i) => {
    const t = i / 320,
      a = t * 16 * 2 * Math.PI,
      r = 0.006 * Math.min(1, t * 36, (1 - t) * 36);
    return new THREE.Vector3(r * Math.cos(a), t * referenceLength, r * Math.sin(a));
  });
  const springGeometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), 320, 0.00065, 6, false);
  const balls = [],
    springs = [];
  for (const x of PHASE_BALL_X) {
    const spring = new THREE.Mesh(springGeometry, paint(0x8f999c));
    group.add(spring);
    springs.push(spring);
    const ball = inked(new THREE.Mesh(new THREE.SphereGeometry(FREE_SPRING_RADIUS, 32, 24), paint(0xa3a9aa)), {
      width: 0.65,
    });
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.003, 0.0007, 8, 24), paint(0x7b888b));
    hook.position.y = 0.015;
    ball.add(hook);
    group.add(ball);
    balls.push(ball);
  }
  const carriage = new THREE.Group();
  group.add(carriage);
  block(carriage, 0.51, 0.012, 0.014, 0, 0, -0.045, 0x718881);
  for (const x of [-0.25, 0.25]) block(carriage, 0.017, 0.026, 0.022, x, 0, -0.045, 0x536b64);
  const clamps = [],
    jaws = [],
    buttons = [],
    links = [];
  PHASE_BALL_X.forEach((x, i) => {
    const clamp = new THREE.Group();
    clamp.position.set(x, 0, PHASE_BALL_Z);
    carriage.add(clamp);
    clamps.push(clamp);
    const pair = [],
      pairLinks = [];
    for (const sign of [-1, 1]) {
      // Side arms leave the entire centreline clear, including above/below the release height.
      block(clamp, 0.006, 0.008, 0.067, sign * 0.037, 0, -0.03, 0x718881);
      const jaw = new THREE.Group();
      clamp.add(jaw);
      pair.push(jaw);
      block(jaw, 0.004, 0.016, 0.02, 0, 0, 0, 0x5e716b);
      block(jaw, 0.002, 0.012, 0.016, -sign * 0.0025, 0, 0.0005, 0x3f4945);
      const slider = block(clamp, 0.032, 0.005, 0.007, sign * 0.025, -0.008, -0.003, 0x9da49a);
      pairLinks.push(slider);
    }
    jaws.push(pair);
    links.push(pairLinks);
    const outside = i === 0 ? -1 : 1;
    block(clamp, 0.009, 0.012, 0.054, outside * 0.06, 0, 0.018, 0x718881);
    block(clamp, 0.022, 0.012, 0.009, outside * 0.05, 0, -0.005, 0x718881);
    const button = cylinder(clamp, 0.009, 0.007, outside * 0.06, 0, 0.047, 0xa6694e);
    button.rotation.x = Math.PI / 2;
    buttons.push(button);
    label(clamp, i ? 'B' : 'A', outside * 0.06, 0, 0.051, 0.012, 0.012, '#a6694e', '#fff3d4');
  });
  // The central knob drives the two release latches through the visible paired cables.
  block(carriage, 0.014, 0.014, 0.11, 0, -0.026, 0.01, 0x718881);
  const handle = cylinder(carriage, 0.009, 0.063, 0, -0.026, 0.07, 0xb08a51);
  handle.rotation.z = Math.PI / 2;
  block(carriage, 0.012, 0.09, 0.012, 0, 0.008, 0.07, 0x718881);
  const releaseBoth = cylinder(carriage, 0.011, 0.009, 0, 0.022, 0.08, 0x527f88);
  releaseBoth.rotation.x = Math.PI / 2;
  block(carriage, 0.094, 0.02, 0.003, 0, 0.046, 0.08, 0xd5d3bb);
  label(carriage, '同时放开', 0, 0.046, 0.082, 0.09, 0.018);
  for (const x of PHASE_BALL_X)
    wire(
      carriage,
      [
        [0, 0.022, 0.072],
        [x * 0.5, 0.02, -0.015],
        [x, 0, -0.045],
        [x + (x < 0 ? -0.06 : 0.06), 0, 0.037],
      ],
      0x4a5551,
      0.001,
    );
  const handleLabel = label(group, '共同握柄：上下拖动', 0, 0.013, 0.105, 0.16, 0.017);
  handleLabel.rotation.x = -Math.PI / 2;
  function pose() {
    carriage.position.y = equilibriumY - model.carriage;
    model.bodies.forEach((b, i) => {
      const s = b.observe();
      balls[i].position.set(PHASE_BALL_X[i], equilibriumY - s.q, PHASE_BALL_Z);
      springs[i].position.set(PHASE_BALL_X[i], PHASE_TOP - s.length, PHASE_BALL_Z);
      springs[i].scale.y = s.length / referenceLength;
      jaws[i].forEach((jaw, j) => {
        const distance = model.clamped[i] ? 0.0155 : 0.03;
        jaw.position.x = (j === 0 ? -1 : 1) * distance;
        links[i][j].position.x = ((j === 0 ? -1 : 1) * (0.037 + distance)) / 2;
        links[i][j].scale.x = (0.037 - distance) / 0.032;
      });
      buttons[i].position.z = model.clamped[i] ? 0.047 : 0.044;
    });
  }
  pose();
  return {
    group,
    balls,
    springs,
    carriage,
    clamps,
    jaws,
    buttons,
    handle,
    releaseBoth,
    board,
    grid,
    equilibriumY,
    pose,
    dispose() {
      textures.forEach((t) => t.dispose());
    },
  };
}
