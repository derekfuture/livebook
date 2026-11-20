import * as THREE from 'three';
import { chemBeaker, chemLamp, glassMat, glassTube, rubberTube, stopper, testTube, tubeClamp, tubeRack } from './chem.js';
import { water2, tubeLiquid, bubble2 } from './chemfx.js';
import { groundLabel, faceLabel, textTex } from './labels.js';
import { dropBottle, lampCap } from './labops.js';
import { textSprite } from './microworld.js';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const BASE = V(-0.08, 0.083),
  ANGLE = -0.91,
  LENGTH = 0.119;
export const MOUTH = BASE.clone().add(V(-Math.sin(ANGLE) * LENGTH, Math.cos(ANGLE) * LENGTH));
export const TIP = V(0.084, 0.084),
  REST = V(0.143, 0.009),
  DOCK = V(TIP.x, TIP.y - 0.035 - 0.005);
export const SOURCE = V(-0.149, 0.01),
  SITES = [-0.08, -0.034, 0.012],
  BATH = 0.101;
const BORE = 0.012, DROP_RADIUS = 0.0018;
export const visibleLayer = (thickness) => thickness > 0.00045;
const ink = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.52 });
function part(parent, geo, material, pos = V()) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.copy(pos);
  parent.add(mesh);
  return mesh;
}
const cylinder = (parent, radius, height, pos, material) => part(parent, new THREE.CylinderGeometry(radius, radius, height, 32), material, pos);
const node = (parent) => {
  const group = new THREE.Group();
  parent.add(group);
  return group;
};
function pick(parent, size, pos) {
  const mesh = part(parent, new THREE.BoxGeometry(...size), new THREE.MeshBasicMaterial({ visible: false }), pos);
  mesh.userData.pick = mesh.userData.track = true;
  parent.pick = mesh;
  return mesh;
}
function rack(parent, x, height = 0.039) {
  const stand = tubeRack({ h: height, r: 0.014, w: 0.039, d: 0.04 });
  stand.position.x = x;
  parent.add(stand);
}
function porcelain(parent) {
  const chips = node(parent),
    material = ink(0xe9e4d8);
  [
    [-0.004, 0.003, 0.001],
    [0.004, 0.003, -0.001],
    [0, 0.005, 0.004],
  ].forEach(([x, y, z], i) => {
    const shard = part(chips, new THREE.DodecahedronGeometry(0.0042), material, V(x, y, z));
    shard.scale.set(1.1, 0.48, 0.75);
    shard.rotation.y = i;
  });
  return chips;
}
function sample(parent, length) {
  const tube = testTube({ r: BORE, len: length });
  tube.entryHeight = (tip) => {
    const angle = tube.rotation.z, cos = Math.cos(angle);
    const dx = tip.x - (tube.position.x - length * Math.sin(angle));
    if (Math.hypot(dx / cos, tip.z - tube.position.z) > BORE - DROP_RADIUS / cos) return null;
    const height = tube.position.y + length * cos + dx * Math.tan(angle);
    return tip.y >= height && tip.y - height <= 0.021 ? height : null;
  };
  parent.add(tube);
  const fill = tubeLiquid({ R: 0.0118, yc: 0.013, top: length, color: 0xcbdde0, specks: 24 });
  tube.add(fill);
  const oil = cylinder(tube, 0.01175, 1, V(), water2({ color: 0xf7f3e8, base: 0.4 }));
  oil.renderOrder = 10;
  const edge = part(tube, new THREE.TorusGeometry(0.0115, 0.00055, 8, 40), ink(0xb5a78d));
  edge.rotation.x = Math.PI / 2;
  edge.renderOrder = 11;
  tube.layersAt = (level, thickness, milk = 0) => {
    const neat = level < 0.004 && thickness > 0;
    fill.setLevel(neat ? 0.002 + thickness * 1.5 : level).setMilk(milk);
    oil.visible = edge.visible = !neat && visibleLayer(thickness);
    oil.scale.y = Math.max(0.0001, thickness);
    oil.position.y = level + thickness / 2;
    edge.position.y = level;
  };
  tube.layersAt(0, 0);
  pick(tube, [0.026, length, 0.026], V(0, length / 2));
  return tube;
}

export function bench(group) {
  const prep = node(group),
    hydro = node(group);
  const reactor = sample(prep, LENGTH);
  reactor.position.copy(BASE);
  reactor.rotation.z = ANGLE;
  const filled = reactor.children.find((child) => child.setLevel);
  const liquidGeometry = filled.children[0];
  let lastHeight = -1;
  function reactorLevel(height) {
    if (Math.abs(lastHeight - height) < 0.0002) return;
    lastHeight = height;
    filled.setLevel(height);
    if (!height) return;
    const coords = liquidGeometry.geometry.attributes.position;
    for (let i = 0; i < coords.count; i++)
      if (Math.abs(coords.getY(i) - height) < 0.00001) coords.setY(i, height - Math.tan(ANGLE) * coords.getX(i));
    coords.needsUpdate = true;
    liquidGeometry.geometry.computeVertexNormals();
  }
  const bits = porcelain(reactor);
  bits.position.y = 0.007;
  const beads = Array.from({ length: 6 }, () =>
    part(reactor, new THREE.SphereGeometry(0.0013, 10, 8), bubble2({ color: 0x85989b, white: 0.42 })),
  );
  beads.forEach((bead) => {
    bead.visible = false;
    bead.renderOrder = 12;
  });
  const support = node(prep),
    metal = ink(0x646e75);
  part(support, new THREE.BoxGeometry(0.068, 0.006, 0.046), metal, V(-0.033, 0.003, -0.025));
  cylinder(support, 0.0026, 0.157, V(-0.027, 0.08, -0.029), metal);
  const grip = tubeClamp(0.013);
  grip.position.set(0, 0.067, 0);
  reactor.add(grip);
  const arm = cylinder(support, 0.002, 0.031, V(-0.027, 0.124, -0.016), metal);
  arm.rotation.x = Math.PI / 2;
  const lamp = chemLamp();
  lamp.scale.setScalar(0.72);
  lamp.position.x = BASE.x;
  prep.add(lamp);
  pick(lamp, [0.053, 0.068, 0.05], V(0, 0.035));
  lamp.pick.name = '酒精灯';
  const cap = lampCap(prep, lamp, { off: V(-0.1, 0, 0.029) });
  const receiver = sample(prep, 0.072);
  rack(prep, REST.x);
  receiver.position.copy(REST);
  const plug = node(prep);
  const cork = stopper({ r1: 0.011, r2: 0.013, h: 0.011 });
  cork.rotation.z = ANGLE;
  plug.add(cork);
  const end = TIP.clone().sub(MOUTH),
    path = [V(0.005, 0.004), V(0.023, 0.018), V(0.033, 0.021), V(end.x - 0.005, 0.021), V(end.x, 0.017), end];
  const pipe = glassTube(path);
  plug.add(pipe, rubberTube([V(0.036, 0.021), V(0.048, 0.021)]));
  pick(plug, [0.028, 0.023, 0.025], V(0.005, 0.004));
  const reflux = part(plug, new THREE.TubeGeometry(pipe.curve, 80, 0.0015, 10, false), ink(0x74b4c7));
  reflux.renderOrder = 12;
  const drop = part(prep, new THREE.SphereGeometry(0.0023, 12, 8), water2({ color: 0xd1dce0, base: 0.7 }));
  drop.renderOrder = 12;
  const bottle = dropBottle(group, V(SOURCE.x, 0), { r: 0.015, h: 0.041 });
  const title = faceLabel(group, '乙醇', { x: SOURCE.x, y: 0.032, z: 0.017, h: 0.008, color: '#25384a', stroke: '#fff' });
  title.renderOrder = 14;
  title.setText = (text) => {
    const label = textTex(text, { color: '#25384a', stroke: '#fff' });
    title.material.map = label.tex;
    title.geometry.dispose();
    title.geometry = new THREE.PlaneGeometry(0.008 * label.aspect, 0.008);
  };
  const pip = node(group);
  cylinder(pip, 0.002, 0.05, V(0, 0.025), glassMat({ opacity: 0.6 }));
  const bulb = part(pip, new THREE.SphereGeometry(0.006, 18, 14), ink(0x935548), V(0, 0.056));
  bulb.scale.y = 1.45;
  const core = cylinder(pip, 0.0012, 0.033, V(0, 0.02), ink(0xc2d6da));
  pick(pip, [0.021, 0.045, 0.021], V(0, 0.048));
  pip.userData.ringY = 0.054;
  const drip = part(group, new THREE.SphereGeometry(DROP_RADIUS, 12, 8), ink(0xb7cdd1));
  drip.renderOrder = 12;
  const chips = porcelain(prep);
  chips.position.set(-0.143, 0.002, 0);
  pick(chips, [0.026, 0.02, 0.022], V(0, 0.006));
  const label = groundLabel(prep, '接收试管', { x: REST.x, z: 0.033, h: 0.009 });
  const tubes = SITES.map((x, i) => {
    const tube = sample(hydro, 0.087);
    rack(hydro, x);
    tube.position.set(x, 0.009, 0);
    faceLabel(tube, 'ABC'[i], { y: 0.067, z: 0.013, h: 0.009, color: '#344957', stroke: '#fff' });
    return tube;
  });
  const bath = chemBeaker({ r: 0.052, h: 0.062, level: 0.046, color: 0xc5dbe0 });
  bath.position.x = BATH;
  hydro.add(bath);
  groundLabel(hydro, '70～80 ℃ 水浴', { x: BATH, z: 0.067, h: 0.009 });
  return {
    prep,
    hydro,
    reactor,
    reactorLevel,
    cork,
    bits,
    beads,
    receiver,
    plug,
    pipe,
    reflux,
    lamp,
    cap,
    bottle,
    title,
    pip,
    core,
    drip,
    drop,
    chips,
    label,
    tubes,
  };
}

export function atomScene() {
  const acid = [
    [-3.5, 2, 0],
    [-2.15, 2.5, 0],
    [-2.0, 3.78, 0],
    [-1.15, 1.58, 0],
    [-0.43, 1.91, 0],
    [-4.13, 2.6, 0.46],
    [-3.69, 1.14, 0.4],
    [-3.6, 2.06, -0.96],
  ];
  const alcohol = [
    [1.55, 2, 0],
    [0.9, 2.5, 0],
    [2.64, 2.75, 0],
    [3.9, 1.99, 0],
    [2.52, 3.33, 0.77],
    [2.69, 3.38, -0.76],
    [4.63, 2.56, 0.32],
    [3.93, 1.24, 0.63],
    [4.06, 1.6, -0.86],
  ];
  const before = acid.concat(alcohol).map((p) => V(...p)),
    after = before.map((p) => p.clone());
  after[3].set(0.12, 0.38, 1.15);
  after[4].set(0.86, 0.81, 1.15);
  after[9].set(-0.54, 0.91, 1.15);
  [8, 10, 11, 12, 13, 14, 15, 16].forEach((index) => after[index].add(V(-2.52, -0.28, 0)));
  const elements = ['C', 'C', 'O', 'O', 'H', 'H', 'H', 'H', 'O', 'H', 'C', 'C', 'H', 'H', 'H', 'H', 'H'];
  const styles = { C: [0x3d4350, 0.4], O: [0xe0483a, 0.36], H: [0xf2f1ec, 0.24] };
  const pairs = [
    [0, 1],
    [1, 2],
    [1, 2],
    [3, 4],
    [0, 5],
    [0, 6],
    [0, 7],
    [8, 10],
    [10, 11],
    [10, 12],
    [10, 13],
    [11, 14],
    [11, 15],
    [11, 16],
    [1, 3],
    [8, 9],
    [1, 8],
    [3, 9],
  ];
  let balls,
    rods,
    paths,
    marker,
    clock = 0,
    progress = 0;
  return {
    holoBase: false,
    init(ctx) {
      clock = 0;
      progress = 0;
      ctx.view.film = 0;
      balls = elements.map((symbol) => part(ctx.layer, new THREE.SphereGeometry(styles[symbol][1], 24, 16), ink(styles[symbol][0])));
      rods = pairs.map(() => cylinder(ctx.layer, 0.065, 1, V(), ink(0x9aa7b1)));
      paths = [3, 8, 9].map((index) => {
        const path = new THREE.Line(new THREE.BufferGeometry().setFromPoints([before[index], after[index]]),
          new THREE.LineDashedMaterial({ color: 0x755337, dashSize: 0.14, gapSize: 0.09 }));
        path.computeLineDistances();
        ctx.layer.add(path);
        return path;
      });
      marker = textSprite('O*', '#582d12', '#ffffff');
      marker.scale.set(2.0, 0.76, 1);
      ctx.layer.add(marker);
    },
    step(ctx, state, dt) {
      if (state.react && !state.paused) clock = Math.min(7, clock + dt);
      const t = Math.max(0, Math.min(1, (clock - 1.4) / 3.7));
      progress = state.reverse ? 1 - t : t;
      const smooth = progress * progress * (3 - 2 * progress);
      paths.forEach((path) => { path.visible = progress > 0.05 && progress < 0.95; });
      balls.forEach((ball, i) => ball.position.lerpVectors(before[i], after[i], smooth));
      marker.position.copy(balls[8].position).add(V(0, 0.72));
      pairs.forEach(([first, second], i) => {
        const mesh = rods[i],
          a = balls[first].position,
          b = balls[second].position;
        mesh.visible = i < 14 || (i < 16 ? progress < 0.15 : progress > 0.85);
        mesh.position.copy(a).lerp(b, 0.5);
        if (i === 1 || i === 2) mesh.position.x += (i === 1 ? -1 : 1) * 0.105;
        mesh.scale.y = a.distanceTo(b);
        mesh.quaternion.setFromUnitVectors(V(0, 1), b.clone().sub(a).normalize());
      });
    },
    text(ctx, state) {
      const acid = 'CH<sub>3</sub>COOH',
        alcohol = 'C<sub>2</sub>H<sub>5</sub>OH',
        ester = 'CH<sub>3</sub>COOC<sub>2</sub>H<sub>5</sub>',
        water = 'H<sub>2</sub>O';
      return {
        on: true,
        eq: (state.reverse ? `${ester} + ${water} ⇌ ${acid} + ${alcohol}` : `${acid} + ${alcohol} ⇌ ${ester} + ${water}`) +
          `<small class="ester-key">${state.reverse ? 'B 管 · 酸性水解；C 管生成乙酸盐和乙醇。<br>' : ''}只示意净键变，虚线追踪原子去向，不表示反应机理。</small>`,
        cap: state.reverse
          ? progress > 0.85
            ? '从乙酸乙酯和水开始。找找带星号的氧。'
            : progress > 0.15
              ? '酰基碳与带星号的氧分开；这个氧仍连着乙基。'
              : '带星号的氧回到乙醇中。另一份产物是乙酸。'
          : progress < 0.15
            ? '星号标出乙醇的氧。它最后会进水，还是进酯？'
            : progress < 0.85
              ? '跟住星号：乙基和这个氧一起靠近乙酸的羰基碳。'
              : '带星号的氧留在乙酸乙酯中。另一份产物是水。',
      };
    },
    snapshot: () => clock,
    resume(value) {
      clock = value;
    },
  };
}
