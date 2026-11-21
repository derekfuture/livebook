// 实验 3-4。坐标以滴管尖和试管底为原点，拖动、滴落和归位共用这些位置。
import * as THREE from 'three';
import { glassMat, testTube, tubeRack } from './chem.js';
import { tubeLiquid } from './chemfx.js';
import { dropBottle } from './labops.js';
import { textSprite } from './microworld.js';
import { clamp } from './interact.js';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const TX = -0.067, BASE = 0.009, LENGTH = 0.092, RADIUS = 0.0088, RACK = 0.038;
export const NAMES = ['AgNO₃', 'KI', 'Na₂S'], DOSE = [2, 4, 8];
export const DROP_ML = 0.05;
const FORMULAS = ['Ag<sup>+</sup> + Cl<sup>−</sup> ⇌ AgCl(s)', 'AgCl(s) + I<sup>−</sup> ⇌ AgI(s) + Cl<sup>−</sup>',
  '2AgI(s) + S<sup>2−</sup> ⇌ Ag<sub>2</sub>S(s) + 2I<sup>−</sup>'];
const XS = [-0.01, 0.035, 0.08];
const pick = (w, h, y) => {
  const obj = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), new THREE.MeshBasicMaterial({ visible: false }));
  obj.position.y = y;
  obj.userData.pick = true;
  return obj;
};
export const limit = (n) => clamp(n, 0, 1);
export const smooth = (n) => { const u = limit(n); return u * u * (3 - 2 * u); };

export function apparatus(group, tag) {
  const rack = tubeRack({ h: RACK, r: RADIUS + 0.0022, w: 0.051, d: 0.039 });
  rack.position.x = TX;
  group.add(rack);
  const tube = testTube({ r: RADIUS, len: LENGTH });
  tube.position.set(TX, BASE, 0);
  tube.userData.ringY = RACK + 0.008;
  const tubePick = pick(0.019, LENGTH * 0.86, LENGTH * 0.55);
  tube.add(tubePick);
  group.add(tube);
  const plates = [];
  const plate = (obj, kind, contents, y, z) => {
    const text = contents ? `<small>${kind}</small> ${contents}` : kind;
    plates.push(tag(text, 'pptconvert-plate').loc(obj, 0, y, z));
  };
  plate(rack, '试管架', '', 0.004, 0.020);
  plate(tube, '试管', '初装 NaCl 溶液', 0.060, RADIUS + 0.001);
  const liquid = tubeLiquid({ R: RADIUS - 0.00035, yc: RADIUS + 0.0008, top: LENGTH, color: 0xdde8ec, base: 0.22, specks: 0 });
  tube.add(liquid);
  liquid.milk.scale.setScalar(0.995);
  // 只调整液面那一圈和顶盖。下方的液体仍贴合圆底，管壁两侧的高度差抵消倾角。
  let surface, surfaceIndices, lastTilt;
  const levelSurface = (top, tilt) => {
    liquid.setLevel(top);
    const geo = liquid.milk.geometry, pos = geo.attributes.position;
    if (surface !== geo) {
      surface = geo; surfaceIndices = [];
      for (let i = 0; i < pos.count; i++) {
        if (Math.abs(pos.getY(i) - liquid.level) < 0.000001) surfaceIndices.push(i);
      }
      lastTilt = null;
    }
    if (tilt === lastTilt) return;
    lastTilt = tilt;
    const slope = Math.tan(tilt);
    for (const i of surfaceIndices) pos.setY(i, liquid.level - pos.getX(i) * slope);
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  };
  // 同一簇颗粒由白变黄再变黑。振荡时从底部扬起，静置时沉回清液下方。
  const flocs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0),
    new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.97 }), 96);
  flocs.renderOrder = 9.8; flocs.frustumCulled = false; flocs.count = 0;
  tube.add(flocs);
  const dummy = new THREE.Object3D(), tint = new THREE.Color();
  const grains = Array.from({ length: 96 }, (_, i) => {
    const u = (i * 0.618034) % 1, v = (i * 0.414214) % 1, angle = i * 2.39996;
    const r = (RADIUS - 0.0017) * Math.sqrt(v);
    return { u, v, angle, x: r * Math.cos(angle), z: r * Math.sin(angle), rank: 0 };
  });
  let lastContact;
  const drawFlocs = (counts, swirl, top, time, contactX) => {
    const [ag, iodide, sulfide] = counts;
    // 按颗粒到首次接触处的距离着色，静置后仍能认出同一片沉淀。
    if (sulfide && lastContact !== contactX) {
      lastContact = contactX;
      const distance = (g) => (g.x - contactX) ** 2 + g.z ** 2 + ((1 - g.u) * 0.007) ** 2;
      grains.slice().sort((a, b) => distance(a) - distance(b)).forEach((g, rank) => { g.rank = rank; });
    }
    flocs.count = ag * 48;
    for (let i = 0; i < flocs.count; i++) {
      const { u, v, angle, rank } = grains[i];
      const y = 0.0021 + u * 0.0049 + swirl * v * (top - 0.008);
      const r = RADIUS - 0.0017, depth = Math.max(0, RADIUS + 0.0008 - y);
      const radius = Math.sqrt(Math.max(0, r * r - depth * depth)) * Math.sqrt(v);
      const a = angle + swirl * Math.sin(time * 2 + i) * 0.5;
      dummy.position.set(radius * Math.cos(a), y, radius * Math.sin(a));
      const size = 0.0007 + 0.00065 * (1 - v);
      dummy.scale.set(size * 1.45, size * 0.7, size);
      dummy.rotation.set(u, a, v);
      dummy.updateMatrix(); flocs.setMatrixAt(i, dummy.matrix);
      const black = rank < flocs.count * sulfide / DOSE[2];
      tint.setHex(black ? 0x222025 : i < 48 * iodide ? 0xeac04a : 0xfffdf1);
      flocs.setColorAt(i, tint);
    }
    flocs.instanceMatrix.needsUpdate = true;
    if (flocs.instanceColor) flocs.instanceColor.needsUpdate = true;
  };
  const droppers = XS.map((x, i) => {
    const bottle = dropBottle(group, V(x), { brown: i === 0, r: 0.015, h: 0.038 });
    plate(bottle, '滴瓶', NAMES[i] + ' 溶液', 0.021, 0.015);
    const body = new THREE.Group();
    plate(body, '滴管', NAMES[i], 0.068, 0);
    const glass = glassMat({ opacity: 0.31 });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.00225, 0.00225, 0.039, 20), glass);
    stem.position.y = 0.0235;
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.00225, 0.0008, 0.004, 20), glass);
    tip.position.y = 0.002;
    const bore = 0.0019;
    const column = new THREE.Mesh(new THREE.CylinderGeometry(bore, bore, 1, 20), new THREE.MeshLambertMaterial({ color: 0xa8c5cc }));
    const fill = (drops) => {
      const height = drops * DROP_ML * 1e-6 / (Math.PI * bore * bore);
      column.visible = drops > 0;
      column.scale.y = height;
      column.position.y = 0.004 + height / 2;
    };
    fill(DOSE[i]);
    const rubber = new THREE.MeshStandardMaterial({ color: 0x953f37, roughness: 0.76 });
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.0058, 0.0063, 0.005, 20), rubber);
    collar.position.y = 0.041;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.0053, 20, 14), rubber);
    bulb.scale.y = 1.7;
    bulb.position.y = 0.051;
    const grip = pick(0.015, 0.056, 0.035);
    body.add(tip, stem, column, collar, bulb, grip);
    body.position.copy(bottle.tipHome);
    body.userData.ringY = bottle.mouthY + 0.0075;
    group.add(body);
    return { body, pick: grip, home: bottle.tipHome, fill };
  });
  const falling = new THREE.Mesh(new THREE.SphereGeometry(0.0017, 12, 10), new THREE.MeshPhongMaterial({ color: 0xbad8df }));
  falling.scale.y = 1.3;
  falling.visible = false;
  group.add(falling);
  // 给取景器计入提起后的胶头高度。
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.001, 0.001, 0.001), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  frame.position.set(TX, BASE + LENGTH + 0.083, 0);
  frame.raycast = () => {};
  group.add(frame);
  return { tube, tubePick, liquid, droppers, falling, drawFlocs, levelSurface, plates };
}

export const observed = ([ag, iodide, sulfide]) => sulfide === DOSE[2] ? '黑色沉淀' : sulfide ? '局部变黑（示意）'
  : iodide >= ag && ag ? '黄色沉淀' : iodide ? '白色中出现黄色' : ag ? '白色沉淀' : '澄清';

// 每条轨迹始终对应同一个离子。三块晶格只画局部排列，不表示晶胞。
const TYPES = { Ag: [0xe9ecf1, 0.66], Cl: [0x4cbf63, 0.6], I: [0x885ba8, 0.72], S: [0xe8c23c, 0.44] };
const KI = 7, NA2S = 20, END = 34;
const phaseAt = (time) => time <= KI ? 0 : time <= NA2S ? 1 : 2;
const introduced = { Ag: 0, Cl: 0, I: 1, S: 2 };
export const microSpan = [KI, END];
const endTime = ([ag, iodide, sulfide]) => sulfide ? (sulfide < DOSE[2] ? 27.8 : END)
  : iodide ? (iodide === 1 ? 14 : NA2S) : ag === 1 ? 4 : KI;

function ionTracks() {
  const tracks = [];
  function ion(type, start, pos, id) {
    const path = [[start, pos]];
    const track = { type, path, id, until: Infinity };
    tracks.push(track);
    return {
      move(a, b, dest) { path.push([a, path[path.length - 1][1]], [b, dest]); },
      leave(a, b, dest) { this.move(a, b, dest); track.until = b; },
    };
  }
  // 溶液里还留有过量反应物的阴离子。只标一个代表。
  ion('Cl', 0, [-5.8, 3.6, -1], 'freeCl').leave(KI, KI + 2, [-7, 3.8, -2]);
  ion('I', 17.8, [6.2, 4.2, -1], 'freeI').leave(NA2S, NA2S + 2, [7, 4.4, -2]);
  // 每列有两层，每层前后各一个异号离子。旧晶格从露出的右边逐列溶解。
  function salt(x, col, row, anion) {
    const pitch = x < 0 ? 1.22 : 1.32;
    const depth = ((col + row + anion) % 2 - 0.5) * pitch;
    // 晶格相对镜头转过约 30°，让后排也露出来。
    return [x + 0.866 * col * pitch + 0.5 * depth, 0.72 + row * pitch, 0.866 * depth - 0.5 * col * pitch];
  }
  const silver = [];
  for (let col = 0; col < 4; col++) {
    silver[col] = [];
    for (let row = 0; row < 2; row++) {
      const start = col * 1.3;
      const free = [-1.1 + row * 2.7, 4.7 - row * 1.2, -0.6 + row];
      const ag = ion('Ag', start, col === 3 ? free : [-2.8 + row * 1.8, 5.1 - row, 0], `ag${col}-${row}`);
      silver[col].push(ag);
      if (col === 3) continue;
      const cl = ion('Cl', start, [-5.8 + row * 0.7, 3.7 - row * 1.5, 0.7], `cl${col}-${row}`);
      ag.move(start + 0.45, start + 2, salt(-4.5, col, row, 0));
      cl.move(start + 0.45, start + 2, salt(-4.5, col, row, 1));
      const detach = [17.8, 14.5, 11][col];
      ag.move(detach, detach + 1.6, free);
      if (col === 2 && row === 0) cl.move(detach, detach + 2.2, [-5.9, 3.6, -1]);
      else cl.leave(detach, detach + 2.2, [-6 - row, 3.6 - row * 1.5, -1]);
    }
  }
  // 先取溶液中的两粒 Ag⁺；每一列 AgI 长好后才从 AgCl 表面补充下一批。
  for (let col = 0; col < 3; col++) {
    const start = [KI, 12.7, 16.1][col], end = [10.5, 14.4, 17.7][col];
    for (let row = 0; row < 2; row++) {
      const ag = silver[3 - col][row];
      const i = ion('I', start, [5.4 + row, 5.5 - row * 2.1, 0.8], `i${col}-${row}`);
      ag.move(start + 0.45, end, salt(2.3, col, row, 0));
      i.move(start + 0.45, end, salt(2.3, col, row, 1));
      const detach = [30.9, 27.9, 23.6][col];
      ag.move(detach, detach + 1.4, [-0.3 + row * 2.2, 4.4 - row, 0.2]);
      if (col === 2 && row === 0) i.move(detach, detach + 2.2, [5.6, 3.5, -1]);
      else i.leave(detach, detach + 2.2, [6.2 + row, 4.1 - row * 2, -1]);
    }
  }
  // 每个 S²⁻ 配两个 Ag⁺，相邻的位点拼成连续的 Ag₂S 片段。
  for (let n = 0; n < 4; n++) {
    const start = [NA2S, 25.1, 29.4, 32.4][n], end = [23.2, 27.6, 30.8, 33.8][n];
    const x = -4.2 + (n % 2) * 2.04, y = 0.66 + Math.floor(n / 2) * 2.04;
    const s = ion('S', start, [-4.7, 5.1, -0.5], `s${n}`);
    s.move(start + 0.35, end, [x, y, 0.35]);
    silver[n][0].move(start + 0.35, end, [x + 1.02, y, -0.05]);
    silver[n][1].move(start + 0.35, end, [x, y + 1.02, -0.05]);
  }
  return tracks;
}
const tracks = ionTracks();
const target = V();
const captions = [
  [5, 'Ag⁺ 与 Cl⁻ 聚集，形成白色 AgCl 沉淀。'],
  [KI, 'AgCl 固体与溶液中的少量 Ag⁺ 共存。'],
  [11, '加入 KI，I⁻ 先与溶液中已有的 Ag⁺ 形成黄色 AgI 沉淀。'],
  [14.4, '溶液中的 Ag⁺ 减少，AgCl 继续溶解，补充 Ag⁺。'],
  [17.8, '更多 Ag⁺ 进入 AgI 晶格，Cl⁻ 留在溶液中。'],
  [NA2S, '形成 AgI 后，溶液中仍有少量 Ag⁺。'],
  [23.6, '加入 Na₂S，S²⁻ 先与溶液中已有的 Ag⁺ 形成黑色 Ag₂S 沉淀。'],
  [27.8, '溶液中的 Ag⁺ 减少，AgI 继续溶解，I⁻ 进入溶液。'],
  [END, 'AgI 继续转化，更多 Ag⁺ 进入 Ag₂S 晶格。'],
];
export function conversionScene() {
  let t = 0, paused = false, stop = 0, resume, balls, labels;
  return {
    still: true,
    get time() { return t; }, get paused() { return paused; }, get ended() { return t >= stop; },
    save() { return { t, paused }; }, restore(v) { resume = v; },
    toggle() { paused = !paused; }, replay() { t = 0; paused = false; },
    init(c) {
      t = resume?.t ?? 0; paused = resume?.paused ?? false; resume = null;
      c.view.film = 0; c.view.paper = null;
      balls = tracks.map(({ type }) => {
        const [color, radius] = TYPES[type];
        const b = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 18), new THREE.MeshPhongMaterial({ color, shininess: 38 }));
        c.layer.add(b); return b;
      });
      labels = [
        ['AgCl', -3.3, 0, 2.9, 2, 19], ['AgI', 3.6, 0, 2.9, 10.4, 32.2], ['Ag₂S', -3.0, 0, 3, 23.1, END],
        ['Cl⁻', -0.2, 1.2, 0, 4.9, KI, 'freeCl'], ['I⁻', 0.1, 1.2, 0, 19.3, NA2S, 'freeI'],
        ['Ag⁺', -0.6, 1.15, 0, 5, 8.8, 'ag3-0'], ['I⁻', 0.5, 1.15, 0, KI + 0.01, 8.7, 'i0-0'],
        ['Ag⁺', 0.4, 1.15, 0, 12, 13.5, 'ag2-0'], ['Cl⁻', -0.4, 1.2, 0, 12.8, NA2S, 'cl2-0'],
        ['Ag⁺', 0.5, 1.15, 0, 19.3, 21.5, 'ag0-0'], ['S²⁻', -0.5, 1.15, 0, NA2S + 0.01, 21.5, 's0'],
        ['Ag⁺', -0.5, 1.15, 0, 24.8, 26.1, 'ag1-0'], ['I⁻', 0.3, 1.2, 0, 25.6, END, 'i2-0'],
      ].map(([text, x, y, z, from, to, id]) => {
        const label = textSprite(text, '#27364c', '#ffffff');
        const offset = V(x, y, z);
        label.scale.set(3.7, 1.39, 1); label.position.copy(offset); c.layer.add(label);
        return { label, from, to, offset, ball: id && balls[tracks.findIndex((track) => track.id === id)] };
      });
    },
    step(c, st, dt) {
      stop = endTime(st.counts);
      t = Math.min(stop, st.microTime ?? t + (paused ? 0 : dt));
      const phase = phaseAt(t);
      tracks.forEach(({ type, path, until }, i) => {
        const ball = balls[i];
        ball.visible = introduced[type] <= phase && t >= path[0][0] && t < until;
        if (!ball.visible) return;
        let j = 1;
        while (j < path.length && path[j][0] <= t) j++;
        const [a, p] = path[j - 1];
        ball.position.fromArray(p);
        if (j < path.length) {
          const [b, q] = path[j];
          ball.position.lerpVectors(ball.position, target.fromArray(q), smooth((t - a) / (b - a)));
        }
      });
      labels.forEach(({ label, from, to, offset, ball }) => {
        label.visible = t >= from && t <= to && (!ball || ball.visible);
        if (label.visible && ball) label.position.copy(ball.position).add(offset);
      });
    },
    text() {
      return { eq: FORMULAS[phaseAt(t)], on: true, cap: captions.find(([end]) => t <= end)[1] };
    },
  };
}
