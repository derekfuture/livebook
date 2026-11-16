import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { block } from './electronicsBench.js';
import { textPlate } from './props.js';

// 物理模型以米计；器材统一缩小显示。固定尺的数值仍是原管的厘米。
export const WAX_SCALE = 0.4;
export const WAX_CENTER_Y = 0.245;
export const WAX_START_X = -0.17;
export function waxMotionRig() {
  const group = new THREE.Group();
  const board = block(group, 0.92, 0.5, 0.012, 0, 0.26, -0.055, 0x344c43);
  for (const x of [-0.43, 0.43]) {
    block(group, 0.018, 0.53, 0.022, x, 0.265, -0.064, 0x80633f);
    block(group, 0.065, 0.018, 0.16, x, 0.009, -0.025, 0x80633f);
  }
  function label(text, x, y, w, h, parent = group, z = -0.047) {
    const mesh = textPlate(text, {
      w,
      h,
      bg: '#344c43',
      color: '#f4edcf',
      font: `${Math.min(340, 430 / [...text].length, (h / w) * 400)}px sans-serif`,
    });
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  label('固定背景 · 辅助位置记录', 0.04, 0.485, 0.3, 0.024);
  // 背景格只用于观察分运动；尺读数标在固定尺上，不跟随管移动。
  const vertices = [];
  for (let x = -0.3; x <= 0.401; x += 0.04) vertices.push(x, 0.045, -0.048, x, 0.445, -0.048);
  for (let y = 0.045; y <= 0.446; y += 0.04) vertices.push(-0.3, y, -0.048, 0.4, y, -0.048);
  const grid = new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)),
    new THREE.LineBasicMaterial({ color: 0x7b9280, transparent: true, opacity: 0.32 }),
  );
  group.add(grid);
  block(group, 0.022, 0.412, 0.004, -0.345, WAX_CENTER_Y, -0.04, 0xe8d5a3);
  for (let cm = 0; cm <= 100; cm++) {
    const y = WAX_CENTER_Y - 0.2 + cm * 0.004;
    block(
      group,
      cm % 10 === 0 ? 0.012 : cm % 5 === 0 ? 0.009 : 0.005,
      0.0005,
      0.001,
      -0.334 - (cm % 10 === 0 ? 0.006 : cm % 5 === 0 ? 0.0045 : 0.0025),
      y,
      -0.0375,
      0x4c493b,
    );
    if (cm % 10 === 0) label(String(cm), -0.375, y, 0.029, 0.014);
  }
  label('cm', -0.367, 0.467, 0.032, 0.016);
  const tube = new THREE.Group();
  tube.position.set(WAX_START_X, WAX_CENTER_Y, 0);
  group.add(tube);
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xc2e6e1,
    transparent: true,
    opacity: 0.17,
    roughness: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 32, 1, true), glass);
  tube.add(shell);
  // 可见的水体和玻璃外壁分开，避免把蜡块放到管壁之外。
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0105, 0.0105, 0.397, 32),
    new THREE.MeshBasicMaterial({ color: 0x80c6d2, transparent: true, opacity: 0.1, depthWrite: false }),
  );
  tube.add(water);
  for (const y of [-0.2, 0.2]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.0115, 0.0008, 8, 32), paint(0x93b5b3));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = y;
    tube.add(rim);
  }
  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0115, 0.0015, 32), glass);
  bottom.position.y = -0.2;
  tube.add(bottom);
  const stopper = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.0105, 0.016, 32), paint(0x9c7153));
  stopper.position.y = 0.205;
  tube.add(stopper);
  const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.025 * WAX_SCALE, 24), paint(0xd95142));
  wax.position.y = ((1 - 0.025) / 2) * WAX_SCALE;
  tube.add(wax);
  const traces = new THREE.Group();
  group.add(traces);
  function makeTrace(color = 0xf1c979) {
    const geometry = new THREE.BufferGeometry();
    const trace = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color, side: THREE.FrontSide }));
    trace.raycast = () => {};
    traces.add(trace);
    return trace;
  }
  function drawTrace(trace, points) {
    // 点是教学位置记录，并非蜡块在黑板上留下的物理痕迹；不连接/拟合为预设直线。
    trace.geometry.dispose();
    const vertices = [],
      radius = 0.0018;
    for (const p of points) {
      const x = p.x * WAX_SCALE,
        y = WAX_CENTER_Y + p.y * WAX_SCALE,
        z = -0.046;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2,
          b = ((i + 1) / 12) * Math.PI * 2;
        vertices.push(
          x,
          y,
          z,
          x + radius * Math.cos(a),
          y + radius * Math.sin(a),
          z,
          x + radius * Math.cos(b),
          y + radius * Math.sin(b),
          z,
        );
      }
    }
    trace.geometry = new THREE.BufferGeometry();
    trace.geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  }
  function draw(state, pose) {
    tube.position.x = pose.x * WAX_SCALE;
    tube.position.y = WAX_CENTER_Y + (pose.y || 0) * WAX_SCALE;
    tube.rotation.z = -pose.angle;
    wax.position.y = state.s * WAX_SCALE;
  }
  function clearTraces() {
    for (const trace of [...traces.children]) {
      trace.geometry.dispose();
      trace.material.dispose();
      traces.remove(trace);
    }
  }
  function dispose() {
    const geometries = new Set(),
      materials = new Set(),
      maps = new Set();
    group.traverse((o) => {
      if (o.geometry) geometries.add(o.geometry);
      for (const m of o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []) {
        materials.add(m);
        if (m.map) maps.add(m.map);
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    maps.forEach((m) => m.dispose());
  }
  return { group, board, tube, shell, stopper, wax, draw, makeTrace, drawTrace, clearTraces, dispose };
}
