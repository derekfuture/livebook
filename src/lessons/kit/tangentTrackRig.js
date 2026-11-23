import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { block } from './electronicsBench.js';
import { textPlate } from './props.js';
import { tangentPath, TANGENT_SEGMENTS, TANGENT_START } from './tangentTrack.js';

export const PAPER_Y = 0.004,
  BALL_R = 0.008;
export const INK_HOME = [0.23, 0.013, -0.13];
export const BALL_HOME = [0.23, PAPER_Y + BALL_R, 0.13];
export const SEGMENT_RACK = [0.13, 0, -0.15];
export const PAPER_HALF = { x: 0.3, z: 0.24 };

function caption(parent, text, x, y, z, w, h) {
  const label = textPlate(text, {
    w,
    h,
    bg: '#eee4ce',
    font: `bold ${Math.min(350, 430 / [...text].length, (h / w) * 400)}px sans-serif`,
  });
  label.rotation.x = -Math.PI / 2;
  label.position.set(x, y, z);
  parent.add(label);
}

// Both walls use exactly the ball-centre path used by the motion model.
// Flat quad strips avoid Catmull-Rom overshoot near the ends of a removable piece.
function railGeometry(start, length, side) {
  const path = tangentPath(),
    n = Math.ceil(length / 0.002),
    positions = [];
  const cross = (s, lateral, y) => {
    const p = path.at(s);
    return [p.x - Math.sin(p.heading) * lateral, y, p.z + Math.cos(p.heading) * lateral];
  };
  const quad = (a, b, c, d) => positions.push(...a, ...b, ...c, ...a, ...c, ...d);
  const near = side * (BALL_R + 0.0005),
    far = side * (BALL_R + 0.0035);
  const bottom = PAPER_Y,
    top = PAPER_Y + 0.019;
  for (let i = 0; i < n; i++) {
    const s = start + (length * i) / n,
      t = start + (length * (i + 1)) / n;
    const a = cross(s, near, bottom),
      b = cross(t, near, bottom),
      c = cross(t, far, bottom),
      d = cross(s, far, bottom);
    const A = cross(s, near, top),
      B = cross(t, near, top),
      C = cross(t, far, top),
      D = cross(s, far, top);
    quad(a, b, B, A);
    quad(d, D, C, c);
    quad(A, B, C, D);
    quad(a, d, c, b);
    if (i === 0) quad(a, A, D, d);
    if (i === n - 1) quad(b, c, C, B);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function tangentTrackRig() {
  const group = new THREE.Group();
  const paper = block(group, 0.6, PAPER_Y, 0.48, 0, PAPER_Y / 2, 0, 0xfff8e6);
  const railMaterial = paint(0x71928d);
  railMaterial.side = THREE.DoubleSide;
  let start = 0;
  const segments = TANGENT_SEGMENTS.map((segment, i) => {
    const root = new THREE.Group();
    const mid = tangentPath().at(start + segment.length / 2);
    root.position.set(mid.x, 0, mid.z);
    for (const side of [-1, 1]) {
      const geometry = railGeometry(start + (i ? 0.00015 : 0), segment.length - (i ? 0.0003 : 0.00015), side);
      geometry.translate(-mid.x, 0, -mid.z);
      root.add(new THREE.Mesh(geometry, railMaterial));
    }
    // Rear-wall tab is the actual removable-piece grip, not an invisible floating control.
    const grip = block(root, 0.022, 0.008, 0.014, 0, PAPER_Y + 0.019, 0, 0x526d69);
    grip.position.set(-Math.sin(mid.heading) * 0.018, PAPER_Y + 0.02, Math.cos(mid.heading) * 0.018);
    grip.rotation.y = -mid.heading;
    if (i < 2) grip.visible = false;
    group.add(root);
    start += segment.length;
    return { root, grip, home: root.position.clone() };
  });
  const pad = new THREE.Group();
  pad.position.set(...INK_HOME);
  block(pad, 0.055, 0.009, 0.055, 0, -0.0045, 0, 0x80684b);
  const felt = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.003, 32), paint(0x9b3432));
  pad.add(felt);
  group.add(pad);
  caption(group, '红印泥', INK_HOME[0], PAPER_Y + 0.001, INK_HOME[2] + 0.041, 0.05, 0.013);
  caption(group, '拆下的末段放这里', SEGMENT_RACK[0], PAPER_Y + 0.001, -0.205, 0.115, 0.013);
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_R, 28, 18),
    new THREE.MeshStandardMaterial({ color: 0x9ca9af, metalness: 0.75, roughness: 0.22 }),
  );
  ball.position.set(...BALL_HOME);
  group.add(ball);
  // Pigment spots remain attached to the same rotating ball after contact with the pad.
  const ink = new THREE.Group();
  for (const d of [
    [0, -1, 0],
    [0.8, -0.4, 0.4],
    [-0.4, 0.3, 0.85],
  ]) {
    const spot = new THREE.Mesh(new THREE.SphereGeometry(0.0023, 10, 8), paint(0xa43d36));
    spot.position
      .fromArray(d)
      .normalize()
      .multiplyScalar(BALL_R - 0.0012);
    ink.add(spot);
  }
  ink.visible = false;
  ball.add(ink);
  const full = tangentPath(),
    short = tangentPath(2);
  for (const [name, p] of [
    ['C', TANGENT_START],
    ['B', short.exit],
    ['A', full.exit],
  ])
    caption(group, name, p.x + 0.015, PAPER_Y + 0.001, p.z + 0.023, 0.014, 0.014);
  const traces = new THREE.Group();
  group.add(traces);
  function makeTrace() {
    const line = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial({ color: 0xb84940, side: THREE.DoubleSide }),
    );
    line.raycast = () => {};
    traces.add(line);
    return line;
  }
  function drawTrace(line, points) {
    const vertices = [],
      width = 0.0008;
    const edge = (p, sign) => [
      p.x - Math.sin(p.heading) * width * sign,
      PAPER_Y + 0.0003,
      p.z + Math.cos(p.heading) * width * sign,
    ];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i];
      if ([a, b].some((p) => Math.abs(p.x) > PAPER_HALF.x || Math.abs(p.z) > PAPER_HALF.z)) continue;
      vertices.push(...edge(a, -1), ...edge(b, -1), ...edge(b, 1), ...edge(a, -1), ...edge(b, 1), ...edge(a, 1));
    }
    line.geometry.dispose();
    line.geometry = new THREE.BufferGeometry();
    line.geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    line.geometry.computeBoundingSphere();
  }
  function clearTraces() {
    for (const line of [...traces.children]) {
      line.geometry.dispose();
      line.material.dispose();
      traces.remove(line);
    }
  }
  return {
    group,
    paper,
    segments,
    pad,
    ball,
    ink,
    makeTrace,
    drawTrace,
    clearTraces,
    dispose() {
      clearTraces();
      const geometries = new Set(),
        materials = new Set();
      group.traverse((o) => {
        if (o.geometry) geometries.add(o.geometry);
        if (o.material) materials.add(o.material);
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
    },
  };
}
