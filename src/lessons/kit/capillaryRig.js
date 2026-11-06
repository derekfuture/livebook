import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { canvasTex, textPlate } from './props.js';
import { block } from './electronicsBench.js';
import { CAPILLARY_SPECS, CAPILLARY_WATER, meniscusProfile, meniscusMean } from './capillary.js';
export const CAPILLARY_X = [-0.135, -0.095, -0.055, 0.035, 0.075, 0.115];
export const CAPILLARY_RULERS = [-0.018, 0.152];
export const CAPILLARY_GROUP_X = [-0.095, 0.075];
export function capillaryRig() {
  const group = new THREE.Group(),
    assemblies = [],
    tubes = [],
    rulers = [],
    textures = [],
    waterMeshes = [];
  let lastBottom = '';
  function label(text, x, y, z, w = 0.08, h = 0.013) {
    const t = textPlate(text, {
      w,
      h,
      bg: '#e4d9bd',
      color: '#383b3b',
      font: `${Math.min(64, Math.floor(((512 * h) / w) * 0.7))}px sans-serif`,
    });
    t.position.set(x, y, z);
    group.add(t);
    return t;
  }
  // A single open rectangular water trough. Its water mesh has real holes around immersed tubes.
  const glass = paint(0xd6e5e5, { unique: true, transparent: true, opacity: 0.16, depthWrite: false });
  for (const [w, h, d, x, y, z] of [
    [0.35, 0.003, 0.095, 0, 0.0015, 0],
    [0.35, 0.08, 0.002, 0, 0.04, -0.0475],
    [0.35, 0.08, 0.002, 0, 0.04, 0.0475],
    [0.002, 0.08, 0.095, -0.175, 0.04, 0],
    [0.002, 0.08, 0.095, 0.175, 0.04, 0],
  ]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glass);
    m.position.set(x, y, z);
    m.renderOrder = 4;
    group.add(m);
  }
  for (const z of [-0.0475, 0.0475]) block(group, 0.352, 0.0018, 0.0018, 0, 0.08, z, 0x9cb7b7);
  for (const x of [-0.175, 0.175]) block(group, 0.0018, 0.0018, 0.095, x, 0.08, 0, 0x9cb7b7);
  for (let k = 0; k < 2; k++) {
    const x = CAPILLARY_GROUP_X[k];
    block(group, 0.085, 0.009, 0.065, x, 0.0045, -0.094, 0x656b70);
    block(group, 0.006, 0.247, 0.006, x, 0.13, -0.078, 0x8e999d);
    const assembly = new THREE.Group();
    assembly.position.y = 0.09;
    group.add(assembly);
    block(assembly, 0.115, 0.006, 0.006, x, 0.102, -0.017, 0x8d999d);
    block(assembly, 0.007, 0.007, 0.061, x, 0.102, -0.047, 0x8d999d);
    const grip = block(assembly, 0.024, 0.022, 0.022, x, 0.102, -0.078, k ? 0x5c7764 : 0x5b6b7a);
    grip.name = k ? 'plastic-grip' : 'glass-grip';
    assemblies.push({ group: assembly, grip });
    const tag = label(k ? 'PP笔芯' : '洁净玻璃', x, 0.262, -0.078, 0.1, 0.016);
    tag.material.depthTest = true;
    const tex = canvasTex(160, 960, (c, W, H) => {
      c.fillStyle = '#eee9d6';
      c.fillRect(0, 0, W, H);
      c.strokeStyle = c.fillStyle = '#4a514d';
      c.lineWidth = 2;
      c.font = '25px sans-serif';
      c.textBaseline = 'middle';
      for (let mm = -30; mm <= 50; mm++) {
        const y = ((50 - mm) / 80) * H;
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(mm % 10 === 0 ? 75 : mm % 5 === 0 ? 53 : 30, y);
        c.stroke();
        if (mm % 10 === 0) c.fillText(String(mm), 83, Math.max(14, Math.min(H - 14, y)));
      }
      c.font = '22px sans-serif';
      c.fillText('mm', 91, 35);
    });
    textures.push(tex);
    const ruler = new THREE.Mesh(
      new THREE.PlaneGeometry(0.016, 0.08),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
    );
    ruler.position.set(CAPILLARY_RULERS[k], 0.055, -0.007);
    ruler.name = k ? 'plastic-ruler' : 'glass-ruler';
    group.add(ruler);
    rulers.push(ruler);
  }
  for (const [i, s] of CAPILLARY_SPECS.entries()) {
    const tube = new THREE.Group();
    tube.position.x = CAPILLARY_X[i];
    assemblies[i < 3 ? 0 : 1].group.add(tube);
    tube.name = 'capillary-' + s.id;
    const r = s.radius * 4,
      outer = r + 0.00065;
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(outer, outer, 0.12, 32, 1, true),
      paint(i < 3 ? 0xb6d4dd : 0xc0d8c6, {
        unique: true,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    wall.position.y = 0.06;
    wall.renderOrder = 6;
    tube.add(wall);
    for (const y of [0, 0.12]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r, outer, 32), paint(0x9bb4b9, { side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = y;
      tube.add(ring);
    }
    for (const x of [-outer, outer]) {
      const edge = new THREE.Mesh(new THREE.CylinderGeometry(0.00012, 0.00012, 0.12, 6), paint(0x73888c));
      edge.position.set(x, 0.06, 0);
      tube.add(edge);
    }
    const collar = new THREE.Mesh(new THREE.TorusGeometry(outer + 0.001, 0.001, 8, 24), paint(0xb6ab88));
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.102;
    tube.add(collar);
    block(tube, 0.003, 0.003, 0.012, 0, 0.102, -0.012, 0xb6ab88);
    const tag = textPlate(s.id + ' / ' + (s.radius * 2000).toFixed(1), {
      w: 0.036,
      h: 0.01,
      color: '#364b4c',
      bg: '#efe9d6',
      font: '46px sans-serif',
    });
    tag.position.set(0, 0.13, 0.002);
    tube.add(tag);
    const liquid = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, 1, 32, 1, true),
      paint(0x63a9c1, { transparent: true, opacity: 0.82 }),
    );
    liquid.renderOrder = 2;
    tube.add(liquid);
    const surface = new THREE.Mesh(new THREE.BufferGeometry(), paint(0x77bed0, { side: THREE.DoubleSide }));
    surface.renderOrder = 3;
    tube.add(surface);
    const hit = new THREE.Mesh(
      new THREE.CylinderGeometry(Math.max(outer, 0.004), Math.max(outer, 0.004), 0.12, 12),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    hit.userData.pick = true;
    hit.position.y = 0.06;
    tube.add(hit);
    tubes.push({ group: tube, liquid, surface, r });
  }
  const info = label('管径径向放大4倍；高度不放大', 0, 0.0005, 0.115, 0.29, 0.016);
  info.rotation.x = -Math.PI / 2;
  const diam = label('编号后为内径 / mm', 0, 0.0005, 0.14, 0.19, 0.014);
  diam.rotation.x = -Math.PI / 2;
  function water(models) {
    const key = models.map((m) => m.bottom.toFixed(5)).join();
    if (key === lastBottom) return;
    lastBottom = key;
    waterMeshes.forEach((m) => {
      group.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    });
    waterMeshes.length = 0;
    const level = CAPILLARY_WATER.level,
      levels = [
        0.003,
        ...new Set(models.filter((m) => m.bottom > 0.003 && m.bottom < level).map((m) => m.bottom)),
        level,
      ].sort((a, b) => a - b);
    for (let j = 0; j < levels.length - 1; j++) {
      const lo = levels[j],
        hi = levels[j + 1];
      if (hi - lo < 1e-6) continue;
      const shape = new THREE.Shape();
      shape.moveTo(-0.174, -0.046);
      shape.lineTo(0.174, -0.046);
      shape.lineTo(0.174, 0.046);
      shape.lineTo(-0.174, 0.046);
      shape.closePath();
      models.forEach((m, i) => {
        if (m.bottom <= lo + 1e-6) {
          const hole = new THREE.Path();
          hole.absarc(CAPILLARY_X[i], 0, tubes[i].r + 0.00065, 0, Math.PI * 2, true);
          shape.holes.push(hole);
        }
      });
      const g = new THREE.ExtrudeGeometry(shape, { depth: hi - lo, bevelEnabled: false, curveSegments: 24 });
      g.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(
        g,
        paint(0x8ec8d5, { unique: true, transparent: true, opacity: 0.28, depthWrite: false }),
      );
      mesh.position.y = lo;
      mesh.renderOrder = 1;
      group.add(mesh);
      waterMeshes.push(mesh);
    }
  }
  function update(models) {
    for (let k = 0; k < 2; k++) assemblies[k].group.position.y = models[k * 3].bottom;
    models.forEach((m, i) => {
      const t = tubes[i],
        r = t.r,
        amount = Math.min(1, m.filled / (2 * m.spec.radius)),
        center = Math.max(0, m.filled - amount * meniscusMean(m.spec.radius, m.spec.angle));
      t.liquid.visible = t.surface.visible = m.filled > 1e-6;
      const edgeHeight = center + amount * meniscusProfile(m.spec.radius, m.spec.angle, 1);
      t.liquid.scale.y = Math.max(0.000001, edgeHeight);
      t.liquid.position.y = edgeHeight / 2;
      const positions = [],
        indices = [],
        N = 32,
        R = 8;
      for (let j = 0; j <= R; j++)
        for (let k = 0; k <= N; k++) {
          const f = j / R,
            a = (k / N) * Math.PI * 2;
          positions.push(
            r * f * Math.cos(a),
            center + amount * meniscusProfile(m.spec.radius, m.spec.angle, f),
            r * f * Math.sin(a),
          );
        }
      for (let j = 0; j < R; j++)
        for (let k = 0; k < N; k++) {
          const a = j * (N + 1) + k,
            b = a + N + 1;
          indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
      t.surface.geometry.dispose();
      t.surface.geometry = new THREE.BufferGeometry();
      t.surface.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      t.surface.geometry.setIndex(indices);
      t.surface.geometry.computeVertexNormals();
    });
    water(models);
  }
  return {
    group,
    assemblies,
    tubes,
    rulers,
    update,
    dispose() {
      textures.forEach((t) => t.dispose());
      waterMeshes.forEach((m) => {
        m.geometry.dispose();
        m.material.dispose();
      });
    },
  };
}
