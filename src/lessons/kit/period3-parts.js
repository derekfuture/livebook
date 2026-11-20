// 必修第一册第 108 页表 4-5、第 109 页探究。试管坐标以管口为原点。
import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { beaker, canvasTex } from './props.js';
import { chemLamp, glassMat, testTube, tubeRack } from './chem.js';
import { tubeLiquid, bubble2 } from './chemfx.js';
import { dropBottle } from './labops.js';
import { faceLabel, groundLabel } from './labels.js';
import { textSprite } from './microworld.js';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const LEN = 0.084, RIM = LEN + 0.010, X = [-0.064, -0.024, 0.020, 0.060];
export const HOT = 0.068, PAD = -0.068;
const CLEAR = 0xcbdfe4, WALL = 0.008;
export const salts = ['AlCl₃', 'MgCl₂'];
export const solids = ['Al(OH)₃', 'Mg(OH)₂'];
export const liquidY = (v) => v > 0 ? Math.min(LEN - 0.004, 0.004 + 0.0055 * v) : 0;

function node(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  parent.add(g);
  g.position.set(x, y, z);
  return g;
}
function mesh(parent, geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  parent.add(m);
  m.position.set(x, y, z);
  return m;
}
function box(g, dims, mat, ...pos) { return mesh(g, new THREE.BoxGeometry(...dims), mat, ...pos); }
function tool(g, name, dims, y = 0) {
  const pick = box(g, dims, new THREE.MeshBasicMaterial({ visible: false }), 0, y);
  pick.userData.pick = true;
  pick.name = name;
  pick.userData.track = true;
  return { g, pick, home: g.position.clone() };
}

// 斜管中各横截面被水平液面截成圆弓，按体积找水面高度。
function tiltedLiquid(parent, radius, height, rounded) {
  const rows = 28, sides = 22, stride = sides + 2, dy = height / rows;
  const geometry = new THREE.BufferGeometry();
  const pos = new THREE.Float32BufferAttribute(new Float32Array((rows + 1) * stride * 3), 3);
  geometry.setAttribute('position', pos);
  const index = [];
  for (let j = 0; j < rows; j++) for (let k = 0; k <= sides; k++) {
    const a = j * stride + k, b = a + stride;
    index.push(a, b, a + 1, a + 1, b, b + 1);
  }
  for (const row of [0, rows]) for (let k = 1; k < sides; k++) {
    const a = row * stride; index.push(a, a + k, a + k + 1);
  }
  geometry.setIndex(index);
  const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false });
  const fluid = mesh(parent, geometry, mat);
  fluid.renderOrder = 9.7; fluid.visible = false; fluid.frustumCulled = false; fluid.raycast = () => {};
  const rAt = (y) => rounded && y < radius ? Math.sqrt(Math.max(0, radius ** 2 - (y - radius) ** 2)) : radius;
  return (angle, vol, color) => {
    fluid.visible = Math.abs(angle) > 0.10 && vol > 0.005;
    if (!fluid.visible) return false;
    mat.color.set(color);
    const sin = Math.abs(Math.sin(angle)), cos = Math.cos(angle);
    const cut = (h, y, r) => Math.max(-r, Math.min(r, (cos * y - h) / sin));
    let lo = -height - radius, hi = height + radius;
    for (let n = 0; n < 14; n++) {
      const h = (lo + hi) / 2;
      let capacity = 0;
      for (let j = 0; j < rows; j++) {
        const y = (j + 0.5) * dy, r = rAt(y), x = cut(h, y, r);
        capacity += (r * r * Math.acos(x / r) - x * Math.sqrt(Math.max(0, r * r - x * x))) * dy;
      }
      if (capacity * 1e6 < vol) lo = h; else hi = h;
    }
    for (let j = 0; j <= rows; j++) {
      const y = j * dy, r = rAt(y), half = r ? Math.acos(cut(hi, y, r) / r) : 0;
      for (let k = 0; k < stride; k++) {
        const a = k > sides ? -half : -half + 2 * half * k / sides;
        pos.setXYZ(j * stride + k, -Math.sign(angle) * r * Math.cos(a), y, r * Math.sin(a));
      }
    }
    pos.needsUpdate = true;
    return true;
  };
}

function tube(parent, x, name, heating) {
  const rack = tubeRack({ h: 0.038, r: 0.010, w: 0.036, d: 0.037 });
  parent.add(rack);
  rack.position.x = x;
  const g = node(parent, x, RIM), body = testTube({ r: WALL, len: LEN });
  body.position.y = -LEN;
  g.add(body);
  const liq = tubeLiquid({ R: WALL - 0.0006, yc: WALL + 0.0005, top: LEN - 0.004, color: CLEAR, specks: 32 });
  body.add(liq);
  g.userData.ringY = 0.042;
  if (heating) {
    // 木试管夹夹在靠管口的一端，长柄在右边。
    const wood = paint(0xc6a16b);
    for (const z of [-0.010, 0.010]) {
      const jaw = box(g, [0.048, 0.005, 0.004], wood, 0.015, -0.024, z);
      jaw.rotation.y = Math.sign(z) * 0.20;
    }
    box(g, [0.005, 0.006, 0.016], paint(0x69717a), 0.021, -0.024);
  }
  const grip = tool(g, name, [0.021, LEN, 0.019], -LEN / 2);
  if (heating) {
    const handle = box(grip.pick, [0.047, 0.013, 0.022], grip.pick.material, 0.017, LEN / 2 - 0.024);
    handle.userData.pick = true;
  }
  return { ...grip, body, liq, tilted: tiltedLiquid(body, WALL - 0.0006, LEN, true) };
}

function pipette(parent, x, name) {
  const bottle = dropBottle(parent, V(x), { r: 0.015, h: 0.032 });
  faceLabel(bottle, name, { y: 0.015, z: 0.016, h: 0.008, opacity: 1, color: '#283d4a', stroke: '#fff' });
  const g = node(parent, x, bottle.tipHome.y);
  mesh(g, new THREE.CylinderGeometry(0.0025, 0.0008, 0.041, 16), glassMat({ opacity: 0.44 }), 0, 0.0205);
  mesh(g, new THREE.CylinderGeometry(0.0012, 0.0005, 0.022, 12), paint(0xc1d5da), 0, 0.011);
  const rubber = paint(0x953e37);
  mesh(g, new THREE.CylinderGeometry(0.006, 0.006, 0.004, 18), rubber, 0, 0.040);
  const bulb = mesh(g, new THREE.SphereGeometry(0.0055, 18, 12), rubber, 0, 0.049);
  bulb.scale.y = 1.55;
  g.userData.ringY = 0.041;
  return { ...tool(g, name, [0.020, 0.056, 0.019], 0.031), bottle };
}

function measure(parent, x, name) {
  const h = 0.057, r = 0.0068, g = node(parent, x, h + 0.002);
  const cup = beaker({ r, h, spout: false, level: 0.021, color: CLEAR, scale: { height: 0.042, max: 5, divisions: 25, every: 5 } });
  g.add(cup);
  cup.position.set(-r, -h, 0);
  mesh(cup, new THREE.CylinderGeometry(0.012, 0.013, 0.003, 6), paint(0xb6c5c5), 0, 0.001);
  const lab = groundLabel(parent, name, { x: x - r, z: 0.021, h: 0.009, opacity: 1 });
  return { ...tool(g, name, [0.024, h, 0.021], -h / 2), cup, lab, tilted: tiltedLiquid(cup, r * 0.94, h, false) };
}

export function apparatus(group) {
  const wet = node(group), compare = node(group);
  const mg = tube(wet, -0.002, '镁条试管', true);
  const lamp = chemLamp();
  wet.add(lamp);
  lamp.scale.setScalar(0.67);
  lamp.position.x = HOT;
  const capBody = node(wet, HOT + 0.035, 0.0105);
  mesh(capBody, new THREE.CylinderGeometry(0.009, 0.011, 0.020, 24), paint(0xaab8bb));
  const cap = tool(capBody, '灯帽', [0.022, 0.021, 0.022]);
  const sand = box(wet, [0.074, 0.002, 0.041], new THREE.MeshStandardMaterial({
    map: canvasTex(192, 100, (c) => {
      c.fillStyle = '#ad896b'; c.fillRect(0, 0, 192, 100);
      for (let i = 0; i < 4800; i++) {
        c.fillStyle = i % 2 ? '#775d4d' : '#c4a98c';
        c.fillRect((i * 137 % 193), (i * 281 % 103), 1, 1);
      }
    }), roughness: 1,
  }), PAD, 0.0015);
  groundLabel(wet, '砂纸', { x: PAD, z: 0.029, h: 0.010 });
  const strip = node(wet, PAD, 0.0035);
  strip.userData.ringY = 0.005;
  const stripMat = new THREE.MeshStandardMaterial({ color: 0x8f9293, roughness: 0.5, metalness: 0.38 });
  box(strip, [0.024, 0.0014, 0.005], stripMat);
  const seated = box(mg.body, [0.0038, 0.021, 0.0012], stripMat, 0, 0.015);
  seated.rotation.z = -0.27;
  const bubbles = Array.from({ length: 22 }, () => mesh(mg.body, new THREE.SphereGeometry(0.001, 10, 8), bubble2({ color: 0x627f8d, white: 0.48 })));
  bubbles.forEach((b) => { b.renderOrder = 11; });

  const cold = measure(wet, -0.135, '水');
  const ind = pipette(wet, 0.128, '酚酞');
  const tubes = X.map((x, j) => tube(compare, x, solids[Math.floor(j / 2)], false));
  const measures = salts.map((s) => measure(group, -0.149, s));
  const nh = pipette(compare, -0.112, '氨水');
  const acid = pipette(compare, 0.107, '盐酸');
  const base = pipette(compare, 0.143, 'NaOH');
  const labs = X.map((x, i) => groundLabel(compare, i % 2 ? 'Ⅱ' : 'Ⅰ', { x, z: 0.024, h: 0.008, opacity: 1 }));
  solids.forEach((s, i) => groundLabel(compare, s, { x: (X[i * 2] + X[i * 2 + 1]) / 2, z: 0.040, h: 0.011, opacity: 1 }));
  const dropMat = paint(0xb0cbd4, { keep: true });
  const drops = Array.from({ length: 12 }, () => mesh(group, new THREE.SphereGeometry(0.0015, 10, 8), dropMat));
  const stream = mesh(group, new THREE.CylinderGeometry(0.0011, 0.0009, 1, 10), dropMat);
  stream.renderOrder = 10;
  const stripTool = tool(strip, '镁条', [0.030, 0.008, 0.015]);

  return { wet, compare, mg, sand, strip: stripTool, stripMat, seated, lamp, cap, bubbles, cold, ind, tubes, measures, nh, acid, base, labs, drops, stream };
}

// 电子层用圆表示，电子按层计数。最外圈按表 4-5 的半径使用同一比例。
export function shellScene() {
  const atoms = [['Na', 11, 0.186], ['Mg', 12, 0.160], ['Al', 13, 0.143]];
  let elapsed = 0, models = [];
  return {
    holoBase: false, still: true,
    init(c) {
      c.view.film = 0;
      elapsed = 0;
      models = atoms.map(([symbol, charge, radius], i) => {
        const atom = node(c.layer, (i - 1) * 6.6, 2.0);
        const outer = radius / 0.186 * 2.7;
        const nucleus = textSprite('+' + charge, '#fff2cf');
        nucleus.scale.set(1.48, 0.555, 1); atom.add(nucleus);
        mesh(atom, new THREE.SphereGeometry(0.44, 24, 16), paint(0xaa664b));
        [2, 8, i + 1].forEach((n, k) => {
          const r = outer * [0.30, 0.63, 1][k];
          const ring = mesh(atom, new THREE.TorusGeometry(r, 0.026, 8, 80), new THREE.MeshBasicMaterial({ color: k === 2 ? 0x965a2d : 0x637982 }));
          for (let j = 0; j < n; j++) {
            const a = Math.PI / 2 + j * Math.PI * 2 / n + k * 0.21;
            mesh(ring, new THREE.SphereGeometry(k === 2 ? 0.155 : 0.11, 16, 12),
              new THREE.MeshBasicMaterial({ color: k === 2 ? 0xad612a : 0x405c69 }), r * Math.cos(a), r * Math.sin(a), 0.03);
          }
        });
        const caption = textSprite(symbol + '  ' + radius.toFixed(3), '#293944', 'rgba(255,255,255,.8)');
        caption.scale.set(4.6, 1.73, 1); atom.add(caption); caption.position.y = -3.55;
        return atom;
      });
    },
    step(c, st, dt) {
      elapsed += dt;
      models.forEach((m, i) => { m.visible = elapsed > i * 0.8; });
    },
    text() {
      return { eq: 'Na　→　Mg　→　Al', on: true,
        cap: elapsed < 1.6 ? '数一数电子层，再比较各原子的最外层电子数。' :
          '核外都有三层电子。核电荷增加，原子半径减小（单位 nm），原子核对最外层电子的吸引总体增强。' };
    },
    time(v) { if (v !== undefined) elapsed = v; return elapsed; },
  };
}
