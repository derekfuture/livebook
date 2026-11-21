import * as THREE from 'three';
import { chemBeaker, chemLamp, glassMat, glassTube, rubberTube, stopper, testTube, tubeClamp, tubeRack } from './chem.js';
import { water2, tubeLiquid, bubble2 } from './chemfx.js';
import { faceLabel, textTex } from './labels.js';
import { dropBottle, lampCap } from './labops.js';
import { beaker } from './props.js';
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
  BATH = 0.101, BATH_WATER_Y = 0.046;
export const bathSite = (i) => V(BATH + (i - 1) * 0.033, 0.078);
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
const plateStyle = { color: '#243b44', stroke: '#fff', opacity: 1 };
function plate(parent, text, x, y, z, h = 0.008) {
  const label = faceLabel(parent, text, { ...plateStyle, x, y, z, h });
  let current = text;
  label.setText = (value) => {
    if (value === current) return;
    current = value;
    const { tex, aspect } = textTex(value, { ...plateStyle, strokeW: 8 });
    label.material.map = tex;
    label.geometry.dispose();
    label.geometry = new THREE.PlaneGeometry(h * aspect, h);
  };
  return label;
}

// 用内腔的圆截面求水平液位。圆底试管和量筒共享同一条自由液面。
function levelLiquid(parent, radius, bottom, top, round = false) {
  const center = bottom + radius;
  const radiusAt = (y) => Math.sqrt(Math.max(0, radius ** 2 - (round ? Math.max(0, center - y) ** 2 : 0)));
  const profile = [];
  for (let i = 0; i <= 12; i++) {
    const y = bottom + (round ? radius : 0) * i / 12;
    profile.push(new THREE.Vector2(radiusAt(y), y));
    if (!round) break;
  }
  profile.push(new THREE.Vector2(radius, top));
  const cut = new THREE.Plane(V(0, -1, 0), 0);
  const mat = water2({ color: 0xb9d1d7, base: 0.57 });
  mat.clippingPlanes = [cut];
  const wall = part(parent, new THREE.LatheGeometry(profile, 40), mat);
  wall.renderOrder = 8;
  const floor = part(parent, new THREE.CircleGeometry(radius, 40), mat, V(0, bottom));
  floor.rotation.x = -Math.PI / 2;
  const count = 64, geo = new THREE.PlaneGeometry(1, 1, 1, count);
  const surface = part(parent, geo, water2({ color: 0xb6cdd3, base: 0.66 }));
  surface.frustumCulled = false;
  surface.renderOrder = 9;
  const bowl = Array.from({ length: 16 }, (_, i) => {
    const u = i / 15;
    return new THREE.Vector2(radius * u, 0.0007 * u ** 5);
  });
  bowl.push(new THREE.Vector2(radius, 0));
  const meniscus = part(parent, new THREE.LatheGeometry(bowl, 48), surface.material);
  meniscus.renderOrder = 9;
  const dy = (top - bottom) / count;
  const slices = Array.from({ length: count }, (_, i) => {
    const y = bottom + (i + 0.5) * dy;
    return { y, r: radiusAt(y) };
  });
  let lastAngle, lastVolume, level = bottom;
  return (volume, angle) => {
    const tilted = Math.abs(angle) > 0.002;
    wall.visible = volume > 0.001;
    floor.visible = !round && wall.visible;
    surface.visible = tilted && wall.visible;
    meniscus.visible = !tilted && wall.visible;
    if (!wall.visible) return bottom;
    const sin = Math.sin(angle), cos = Math.cos(angle);
    if (angle !== lastAngle || volume !== lastVolume) {
      lastAngle = angle;
      lastVolume = volume;
      if (!tilted) level = bottom + volume * 1e-6 / (Math.PI * radius ** 2);
      else {
        let low = bottom * cos - radius, high = top * cos + radius;
        for (let i = 0; i < 17; i++) {
          const mid = (low + high) / 2;
          let area = 0;
          for (const { y, r } of slices) {
            const u = Math.min(1, Math.max(-1, (mid - y * cos) / (r * Math.abs(sin))));
            area += r * r * (Math.acos(-u) + u * Math.sqrt(1 - u * u));
          }
          if (area * dy * 1e6 < volume) low = mid;
          else high = mid;
        }
        level = (low + high) / 2;
        const lo = Math.max(bottom, (level - radius * Math.abs(sin)) / cos);
        const hi = Math.min(top, (level + radius * Math.abs(sin)) / cos);
        const coords = geo.attributes.position;
        for (let j = 0; j <= count; j++) {
          const y = lo + (hi - lo) * j / count;
          const x = (level - y * cos) / sin;
          const z = Math.sqrt(Math.max(0, radiusAt(y) ** 2 - x ** 2));
          coords.setXYZ(2 * j, x, y, -z);
          coords.setXYZ(2 * j + 1, x, y, z);
        }
        coords.needsUpdate = true;
        geo.computeVertexNormals();
      }
      meniscus.position.y = level;
    }
    cut.constant = parent.localToWorld(V(level * sin, level * cos)).y;
    return level;
  };
}

const MEASURE_H = 0.091, MEASURE_R = 0.0063;
export const CUP_HOME = V(SOURCE.x + MEASURE_R, MEASURE_H + 0.003);
function measure(parent) {
  const lip = node(parent), bottom = 0.004;
  const step = 1e-6 / (Math.PI * MEASURE_R ** 2);
  const cup = beaker({ r: MEASURE_R + 0.0005, h: MEASURE_H, spout: false });
  const ticks = [], z = MEASURE_R + 0.0013;
  for (let i = 0; i <= 100; i++) {
    const y = bottom + step * i / 10;
    const major = i % 10 === 0;
    ticks.push(V(-0.005, y, z), V(major ? 0.0008 : i % 5 === 0 ? -0.0008 : -0.0022, y, z));
    if (major) plate(cup, String(i / 10), 0.0032, y, z, 0.003);
  }
  const scale = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ticks), new THREE.LineBasicMaterial({ color: 0x304756 }));
  scale.renderOrder = 14;
  cup.add(scale);
  cup.liquid.visible = cup.surface.visible = false;
  cup.position.set(-MEASURE_R, -MEASURE_H, 0);
  lip.add(cup);
  cylinder(cup, 0.0105, 0.003, V(0, 0.0015), ink(0xc4d3d4));
  plate(cup, 'mL', 0, 0.087, MEASURE_R, 0.0045);
  const liquid = node(cup);
  const fill = levelLiquid(liquid, MEASURE_R, bottom, MEASURE_H);
  // 平视时显示液体中央的纵切面，避免前后筒壁的反光盖住凹底。
  const section = node(cup);
  const sectionMat = new THREE.MeshBasicMaterial({ color: 0xadcad2, transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide });
  const body = part(section, new THREE.PlaneGeometry(MEASURE_R * 2, 1), sectionMat);
  const curve = Array.from({ length: 33 }, (_, i) => {
    const u = (i - 16) / 16;
    return V(MEASURE_R * u, 0.00095 * u ** 4);
  });
  const bowl = new THREE.Shape(curve.map(({ x, y }) => new THREE.Vector2(x, y)));
  bowl.lineTo(MEASURE_R, 0);
  bowl.lineTo(-MEASURE_R, 0);
  const crest = part(section, new THREE.ShapeGeometry(bowl), sectionMat);
  const edge = part(crest, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve), 36, 0.00009, 6, false),
    new THREE.MeshBasicMaterial({ color: 0x305661 }));
  edge.renderOrder = 13;
  const unit = plate(section, 'mL', 0.0032, 0, z, 0.0031);
  pick(lip, [0.021, MEASURE_H, 0.022], V(-MEASURE_R, -MEASURE_H / 2));
  lip.position.copy(CUP_HOME);
  lip.draw = (ml, angle, reading) => {
    lip.rotation.z = angle;
    liquid.visible = !reading;
    section.visible = reading;
    if (!reading) { fill(ml, angle); return; }
    const depth = ml * step;
    body.scale.y = depth;
    body.position.y = bottom + depth / 2;
    crest.position.y = bottom + depth;
    // 单位贴在相邻两条整毫升线之间，不盖住数字。
    unit.position.y = bottom + (Math.floor(ml) + 1.5) * step;
  };
  // 管口下沿恰好接触液面的倾角。按截弦面积积分求此时能留下的体积。
  lip.pourAngle = (ml) => {
    const depth = MEASURE_H - bottom;
    let low = 0, high = Math.PI / 2 - 0.0001;
    for (let j = 0; j < 14; j++) {
      const mid = (low + high) / 2;
      let area = 0;
      for (let i = 0; i < 32; i++) {
        const x = MEASURE_R * ((i + 0.5) / 16 - 1);
        area += 2 * Math.sqrt(MEASURE_R ** 2 - x * x) * Math.max(0, depth - (MEASURE_R - x) * Math.tan(mid));
      }
      if (area * MEASURE_R / 16 * 1e6 > ml) low = mid;
      else high = mid;
    }
    return -(low + high) / 2;
  };
  lip.readY = (ml) => CUP_HOME.y - MEASURE_H + bottom + ml * step;
  return lip;
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
  const fillReactor = levelLiquid(reactor, 0.0116, 0.0014, LENGTH, true);
  const reactorLevel = (ml) => BASE.y + fillReactor(ml, reactor.rotation.z);
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
  const wisps = node(plug);
  const wave = new THREE.CatmullRomCurve3([V(-0.004, 0), V(-0.002, 0.00075), V(0.002, -0.00075), V(0.004, 0)]);
  const trail = new THREE.TubeGeometry(wave, 16, 0.00048, 6, false);
  const vapor = [0, 1, 2].map(() => {
    const wisp = part(wisps, trail, new THREE.MeshBasicMaterial({ color: 0xf0f7fa, transparent: true, depthWrite: false }));
    wisp.renderOrder = 12;
    return wisp;
  });
  plate(wisps, '蒸气（示意）', 0.015, 0.034, 0.006);
  const drop = part(plug, new THREE.SphereGeometry(0.0018, 16, 12), ink(0x8bb5c1));
  drop.renderOrder = 12;
  function drawDistillate(on, phase, surfaceY) {
    wisps.visible = drop.visible = on;
    if (!on) return;
    vapor.forEach((wisp, i) => {
      const t = (phase + i / vapor.length) % 1, along = 0.03 + 0.74 * t;
      pipe.curve.getPoint(along, wisp.position);
      const dir = pipe.curve.getTangent(along);
      wisp.rotation.z = Math.atan2(dir.y, dir.x);
      wisp.material.opacity = Math.sin(Math.PI * t);
    });
    const grow = Math.min(1, phase / 0.32);
    drop.scale.set(grow, grow * 1.25, grow);
    const travel = Math.max(0, Math.min(1, (phase - 0.32) / 0.5));
    pipe.curve.getPoint(0.8 + 0.2 * travel, drop.position);
    if (phase > 0.82) drop.position.y += (surfaceY - TIP.y) * ((phase - 0.82) / 0.18) ** 2;
  }
  const bottle = dropBottle(group, V(SOURCE.x, 0), { r: 0.015, h: 0.041 });
  plate(bottle, '滴瓶 · 乙酸乙酯', 0, 0.025, 0.017);
  const cup = measure(group);
  const stream = [0, 1].map(() => {
    const jet = cylinder(group, 0.001, 1, V(), water2({ color: 0xaac9d1, base: 0.72 }));
    jet.renderOrder = 12;
    return jet;
  });
  function drawStream(from, contact, surface) {
    const points = [from, contact, surface];
    stream.forEach((jet, i) => {
      const a = points[i], b = points[i + 1];
      jet.visible = !!a && !!b;
      if (!jet.visible) return;
      const axis = b.clone().sub(a);
      jet.position.copy(a).lerp(b, 0.5);
      jet.scale.y = axis.length();
      jet.quaternion.setFromUnitVectors(V(0, 1), axis.normalize());
    });
  }
  const pip = node(group);
  cylinder(pip, 0.002, 0.05, V(0, 0.025), glassMat({ opacity: 0.6 }));
  const bulb = part(pip, new THREE.SphereGeometry(0.006, 18, 14), ink(0x935548), V(0, 0.056));
  bulb.scale.y = 1.45;
  const core = cylinder(pip, 0.0012, 0.033, V(0, 0.02), ink(0xc2d6da));
  pick(pip, [0.021, 0.045, 0.021], V(0, 0.048));
  plate(pip, '滴管 · 乙酸乙酯', 0, 0.068, 0.008);
  pip.userData.ringY = 0.054;
  const drip = part(group, new THREE.SphereGeometry(DROP_RADIUS, 12, 8), ink(0xb7cdd1));
  drip.renderOrder = 12;
  const chips = porcelain(prep);
  chips.position.set(-0.143, 0.002, 0);
  pick(chips, [0.026, 0.02, 0.022], V(0, 0.006));
  plate(chips, '碎瓷片', 0, 0.014, 0.01);
  plate(lamp, '酒精灯', 0, 0.021, 0.034, 0.012);
  plate(support, '试管夹', -0.038, 0.137, 0.016);
  plate(support, '铁架台', -0.031, 0.010, -0.004);
  plate(plug, '橡胶塞 · 导管', 0.04, 0.028, 0.008);
  const reactorName = plate(prep, '', BASE.x - 0.031, BASE.y + 0.015, 0.014);
  const receiverName = plate(receiver, '', 0, 0.006, 0.015);
  plate(prep, '试管架', REST.x, 0.004, 0.025);
  const holder = node(hydro);
  holder.position.x = BATH;
  const postX = 0.06, railZ = -0.034;
  part(hydro, new THREE.BoxGeometry(0.028, 0.004, 0.037), metal, V(BATH + postX, 0.002, railZ));
  cylinder(hydro, 0.0022, 0.151, V(BATH + postX, 0.077, railZ), metal);
  part(holder, new THREE.BoxGeometry(0.097, 0.003, 0.004), metal, V(0.014, 0, railZ));
  const paper = new THREE.MeshBasicMaterial({ color: 0xfff9e9, side: THREE.DoubleSide });
  const tubes = SITES.map((x, i) => {
    const dx = bathSite(i).x - BATH;
    const stem = cylinder(holder, 0.0014, 0.023, V(dx, 0, -0.023), metal);
    stem.rotation.x = Math.PI / 2;
    const jaw = part(holder, new THREE.TorusGeometry(0.0133, 0.0013, 8, 28, Math.PI * 1.45), metal, V(dx, 0));
    jaw.rotation.set(Math.PI / 2, 0, Math.PI * 0.78);
    const tube = sample(hydro, 0.087);
    rack(hydro, x);
    tube.position.set(x, 0.009, 0);
    const badge = part(tube, new THREE.PlaneGeometry(0.030, 0.027), paper, V(0, 0.073, 0.0148));
    badge.userData.qaSupport = true;
    plate(tube, 'ABC'[i] + ' 管', 0, 0.082, 0.015);
    tube.contents = plate(tube, '', 0, 0.073, 0.015, 0.008);
    tube.medium = plate(tube, '', 0, 0.064, 0.015, 0.008);
    plate(hydro, '试管架', x, 0.004, 0.025);
    return tube;
  });
  const bath = chemBeaker({ r: 0.052, h: 0.062, level: BATH_WATER_Y, color: 0xc5dbe0 });
  bath.position.x = BATH;
  hydro.add(bath);
  plate(bath, '烧杯 · 70～80 ℃ 热水', 0, 0.018, 0.053);
  return {
    prep,
    hydro,
    holder,
    reactor,
    reactorLevel,
    cork,
    bits,
    beads,
    receiver,
    plug,
    drawDistillate,
    reflux,
    lamp,
    cap,
    bottle,
    cup,
    drawStream,
    reactorName,
    receiverName,
    pip,
    core,
    drip,
    chips,
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
