import * as THREE from 'three';
import { paint, inked } from '../../live/ink.js';
import { block } from './electronicsBench.js';
import { textPlate } from './props.js';

export const REFRACTION_SCALE = 0.65;
const FLOOR = 0.009;

export function refractionRig(tank) {
  const group = new THREE.Group(),
    textures = [];
  const p = tank.parameters,
    scale = REFRACTION_SCALE;
  const width = tank.width * scale,
    length = tank.length * scale;
  const waterY = FLOOR + p.deep * scale;
  block(group, width + 0.072, FLOOR, length + 0.1, 0, FLOOR / 2, 0, 0xcbc4af);
  const glass = paint(0xc7e1dc, { transparent: true, opacity: 0.24, depthWrite: false });
  for (const s of [-1, 1]) {
    for (const [w, d, x, z] of [
      [0.003, length + 0.006, (s * (width + 0.003)) / 2, 0],
      [width, 0.003, 0, (s * (length + 0.003)) / 2],
    ]) {
      const wall = inked(new THREE.Mesh(new THREE.BoxGeometry(w, 0.022, d), glass), { width: 0.65 });
      wall.position.set(x, FLOOR + 0.011, z);
      wall.renderOrder = 4;
      group.add(wall);
    }
    block(group, 0.006, 0.003, length + 0.006, (s * (width + 0.003)) / 2, FLOOR + 0.022, 0, 0x7a8788);
    block(group, width, 0.003, 0.006, 0, FLOOR + 0.022, (s * (length + 0.003)) / 2, 0x7a8788);
  }

  // The raised floor fills the shallow half of this same tank. It is fixed, so
  // changing the source direction never silently adds/removes water or a plate.
  const corners = [
    [-tank.width / 2, -tank.length / 2],
    [tank.width / 2, -tank.length / 2],
    [tank.width / 2, tank.length / 2],
    [-tank.width / 2, tank.length / 2],
  ];
  const polygon = [],
    boundary = [];
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i],
      b = corners[(i + 1) % corners.length];
    const da = tank.signedDistance(...a),
      db = tank.signedDistance(...b);
    if (da >= 0) polygon.push(a);
    if (da < 0 !== db < 0) {
      const t = da / (da - db),
        point = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
      polygon.push(point);
      boundary.push(point);
    }
  }
  const shape = new THREE.Shape(polygon.map(([x, z]) => new THREE.Vector2(x * scale, z * scale)));
  const bed = inked(
    new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: (p.deep - p.shallow) * scale, bevelEnabled: false }),
      paint(0xc6ccb4),
    ),
    { width: 0.6 },
  );
  bed.rotation.x = Math.PI / 2;
  bed.position.y = waterY - p.shallow * scale;
  group.add(bed);
  function label(text, x, z, w) {
    const tag = textPlate(text, {
      w,
      h: 0.016,
      font: `bold ${Math.round(5.6 / w)}px sans-serif`,
      color: '#4c5e5b',
      bg: '#dfd7bc',
    });
    tag.rotation.x = -Math.PI / 2;
    tag.position.set(x, FLOOR + 0.0002, z);
    textures.push(tag.material.map);
    group.add(tag);
    return tag;
  }
  label(`较深处 ${p.deep * 1000} mm`, -0.13, -length / 2 - 0.024, 0.11);
  label(`较浅处 ${p.shallow * 1000} mm`, 0.1, length / 2 + 0.026, 0.11);
  label('起伏竖向放大4倍', -0.12, length / 2 + 0.026, 0.17);

  const canvas = document.createElement('canvas');
  canvas.width = tank.nx;
  canvas.height = tank.nz;
  const context = canvas.getContext('2d'),
    pixels = context.createImageData(tank.nx, tank.nz);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  const geometry = new THREE.PlaneGeometry(width, length, tank.nx - 1, tank.nz - 1);
  geometry.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  water.position.y = waterY;
  water.renderOrder = 2;
  group.add(water);

  // Porous strips at the edge explain the absorbing boundary used by the model.
  // They float at the same surface level on both sides of the fixed depth step.
  const foamWidth = p.spongeWidth * scale;
  const foam = new THREE.Group();
  for (const s of [-1, 1]) {
    block(foam, width, 0.0012, foamWidth, 0, waterY - 0.0003, (s * (length - foamWidth)) / 2, 0x69756a);
    block(foam, foamWidth, 0.0012, length - 2 * foamWidth, (s * (width - foamWidth)) / 2, waterY - 0.0003, 0, 0x69756a);
  }
  group.add(foam);

  const sourceX = p.sourceX * scale,
    sourceZ = p.sourceZ * scale;
  const motorZ = -length / 2 - 0.028;
  const drive = block(group, 0.062, 0.027, 0.038, sourceX, FLOOR + 0.0135, motorZ, 0x6e7c80);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.009, 0.007, 20), paint(0xb95640));
  knob.position.set(sourceX + 0.018, FLOOR + 0.031, motorZ);
  group.add(knob);
  const armY = waterY + 0.038;
  block(group, 0.009, armY - FLOOR, 0.009, sourceX, (armY + FLOOR) / 2, motorZ, 0x939c99);
  block(group, 0.009, 0.006, sourceZ - motorZ, sourceX, armY, (sourceZ + motorZ) / 2, 0x939c99);
  const head = new THREE.Group();
  head.position.set(sourceX, waterY + 0.002, sourceZ);
  group.add(head);
  const paddle = block(head, p.sourceLength * scale, 0.008, p.sourceWidth * scale, 0, 0, 0, 0xb5a891);
  const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.033, 16), paint(0x8e9994));
  spindle.position.y = 0.0205;
  head.add(spindle);
  const grips = [-1, 1].map((s) => {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.008, 20), paint(0xd9b37f));
    grip.position.set(s * p.sourceLength * scale * 0.44, 0.008, 0);
    head.add(grip);
    return grip;
  });
  const normalPoints = [-1, 1].map(
    (s) =>
      new THREE.Vector3(-s * 0.075 * Math.sin(p.boundaryAngle), waterY + 0.0005, s * 0.075 * Math.cos(p.boundaryAngle)),
  );
  const normal = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(normalPoints),
    new THREE.LineDashedMaterial({ color: 0x55534d, dashSize: 0.004, gapSize: 0.003 }),
  );
  normal.computeLineDistances();
  normal.visible = false;
  normal.raycast = () => {};
  normal.renderOrder = 3;
  group.add(normal);
  const nominalAmplitude =
    (p.sourceWidth * p.sourceStroke * 2 * Math.PI * p.frequency) / (2 * Math.sqrt(p.gravity * p.deep));

  function pose() {
    head.rotation.y = -tank.angle;
    // Same fourfold vertical visibility gain for water and dipper, clearly a
    // display aid; dimensions/depths and physical time in the solver are unchanged.
    // Positive source displacement means deeper immersion, displacing water up.
    head.position.y = waterY + 0.002 - 4 * scale * tank.sourceAt().displacement;
    knob.rotation.y = tank.powered ? Math.PI / 5 : 0;
  }
  function paintWave() {
    const vertices = geometry.attributes.position;
    for (let k = 0; k < tank.surface.length; k++) {
      const y = tank.surface[k],
        shade = Math.tanh((1.45 * y) / nominalAmplitude);
      const shallow = tank.depth[k] < p.deep,
        at = k * 4;
      pixels.data[at] = (shallow ? 158 : 145) + shade * 85;
      pixels.data[at + 1] = (shallow ? 194 : 184) + shade * 60;
      pixels.data[at + 2] = (shallow ? 181 : 183) + shade * 50;
      pixels.data[at + 3] = 255;
      vertices.setY(k, 4 * scale * y);
    }
    vertices.needsUpdate = true;
    context.putImageData(pixels, 0, 0);
    texture.needsUpdate = true;
    pose();
  }
  function snapshot() {
    const record = document.createElement('canvas');
    record.width = tank.nx * 3;
    record.height = tank.nz * 3;
    record.style.cssText = 'width:100%;height:auto';
    const c = record.getContext('2d'),
      project = ([x, z]) => [(x / tank.width + 0.5) * record.width, (z / tank.length + 0.5) * record.height];
    c.drawImage(canvas, 0, 0, record.width, record.height);
    c.fillStyle = '#69756a';
    const fx = (p.spongeWidth / tank.width) * record.width,
      fz = (p.spongeWidth / tank.length) * record.height;
    c.fillRect(0, 0, record.width, fz);
    c.fillRect(0, record.height - fz, record.width, fz);
    c.fillRect(0, fz, fx, record.height - 2 * fz);
    c.fillRect(record.width - fx, fz, fx, record.height - 2 * fz);
    c.strokeStyle = '#677567';
    c.lineWidth = 2;
    c.beginPath();
    boundary.forEach((point, i) => c[i ? 'lineTo' : 'moveTo'](...project(point)));
    c.stroke();
    c.strokeStyle = '#8c775a';
    c.lineWidth = 5;
    c.beginPath();
    [-1, 1].forEach((s, i) =>
      c[i ? 'lineTo' : 'moveTo'](
        ...project([
          p.sourceX + ((s * p.sourceLength) / 2) * Math.cos(tank.angle),
          p.sourceZ + ((s * p.sourceLength) / 2) * Math.sin(tank.angle),
        ]),
      ),
    );
    c.stroke();
    return record;
  }
  pose();
  paintWave();
  return {
    group,
    water,
    foam,
    bed,
    paddle,
    head,
    grips,
    drive,
    knob,
    normal,
    waterY,
    boundary,
    pose,
    paintWave,
    snapshot,
    dispose() {
      texture.dispose();
      textures.forEach((t) => t.dispose());
    },
  };
}
