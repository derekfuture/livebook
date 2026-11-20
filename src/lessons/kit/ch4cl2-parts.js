// 图 7-8。器材尺寸、颜色深浅和运动时间均为教学示意。
import * as THREE from 'three';
import { chemBeaker, testTube, tubeClamp } from './chem.js';
import { faceLabel } from './labels.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { bubble2 } from './chemfx.js';
import { f, textSprite } from './microworld.js';

export const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const unit = x => Math.min(1, Math.max(0, x));
const ease = x => { const u = unit(x); return u * u * (3 - 2 * u); };
const mat = color => new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.25 });
function mesh(parent, geometry, material, x, y, z) {
  const obj = new THREE.Mesh(geometry, material);
  obj.position.set(x, y, z); parent.add(obj);
  return obj;
}
function hit(parent, width, height, depth, y) {
  const box = mesh(parent, new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshBasicMaterial({ visible: false }), 0, y, 0);
  box.userData.pick = true;
  return box;
}
const R = 0.012, TOP = 0.149, MOUTH = 0.025, WATER = 0.047;
export const LEFT = -0.053, START = 0.023, LIGHT = 0.087, SUN = 0.151;
export const WRAPPED = V(LEFT, (TOP + WATER) / 2, 0.001);
export const LOOSE = V(-0.119, (TOP - WATER) / 2 + 0.005, 0.001);

export function apparatus(parent, x, side) {
  const rig = new THREE.Group(); parent.add(rig); rig.position.x = x;
  const base = mesh(rig, new RoundedBoxGeometry(0.073, 0.007, 0.064, 2, 0.0024), mat(0x595d60), 0, 0.005, -0.003);
  const metal = mat(0x8b9090);
  const postX = side * 0.026;
  mesh(rig, new THREE.CylinderGeometry(0.0017, 0.002, 0.141, 16), metal, postX, 0.079, -0.018);
  const support = mesh(rig, new THREE.CylinderGeometry(0.002, 0.002, 0.033, 14), metal, postX / 2, 0.056, -0.009);
  support.quaternion.setFromUnitVectors(V(0, 1), V(postX, 0, -0.018).normalize());
  mesh(rig, new THREE.BoxGeometry(0.009, 0.010, 0.009), metal, postX, 0.056, -0.018);
  const clamp = tubeClamp(R + 0.0007); clamp.position.y = 0.056; rig.add(clamp);
  const bath = chemBeaker({ r: 0.026, h: 0.042, level: WATER - 0.009, color: 0xb3d3d9, marks: false });
  bath.position.y = 0.009; rig.add(bath);
  const tube = testTube({ r: R, len: TOP - MOUTH }); tube.rotation.z = Math.PI; tube.position.y = TOP; rig.add(tube);
  const gasMat = new THREE.MeshBasicMaterial({ color: 0xb2b943, transparent: true, opacity: 0.73, depthWrite: false });
  const gas = mesh(rig, new THREE.CylinderGeometry(R, R, 1, 40), gasMat, 0, 0, 0);
  const dome = mesh(rig, new THREE.SphereGeometry(R, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), gasMat, 0, TOP - R - 0.0008, 0);
  const brineMat = new THREE.MeshBasicMaterial({ color: 0x9bc3ca, transparent: true, opacity: 0.63, depthWrite: false });
  const brine = mesh(rig, new THREE.CylinderGeometry(R, R, 1, 40), brineMat, 0, 0, 0);
  const meniscus = mesh(rig, new THREE.TorusGeometry(R * 0.97, 0.0006, 8, 40), mat(0x739d9e), 0, WATER, 0);
  meniscus.rotation.x = Math.PI / 2;
  gas.renderOrder = dome.renderOrder = 6;
  brine.renderOrder = 8;
  const oil = bubble2({ color: 0x68736c, white: 0.43 });
  const drops = Array.from({ length: 11 }, (_, i) => {
    const angle = -1.1 + ((i * 7) % 11) * 0.21;
    const d = mesh(rig, new THREE.SphereGeometry(1, 16, 12), oil,
      Math.sin(angle) * (R - 0.001), 0.103 + ((i * 5) % 11) * 0.0033, Math.cos(angle) * (R - 0.001));
    d.rotation.y = angle; d.renderOrder = 9.4;
    return d;
  });
  return { rig, base, tube, pick: hit(rig, 0.073, 0.023, 0.065, 0.013),
    draw(p) {
      const level = WATER + p * 0.044;
      gas.scale.y = dome.position.y - level; gas.position.y = (dome.position.y + level) / 2;
      gasMat.opacity = 0.73 * (1 - p * 0.97);
      brine.scale.y = level - MOUTH; brine.position.y = (level + MOUTH) / 2; meniscus.position.y = level;
      drops.forEach((d, i) => {
        const k = ease((p - 0.29 - i * 0.042) / 0.22) * (0.00175 + i % 3 * 0.00046);
        d.visible = k > 0.00015; d.scale.set(k, k * 1.34, k * 0.57);
      });
    } };
}

// 一张预先折过的铝箔从正面贴到管壁，两边合拢；遮住管内气柱，夹爪在箔内。
export function foilSheet(parent) {
  const foil = new THREE.Group(); parent.add(foil);
  const cols = 24, rows = 15, geo = new THREE.PlaneGeometry(1, 1, cols, rows);
  // A strip of reflected window light makes the folds readable even on an unlit book page.
  const reflection = document.createElement('canvas'); reflection.width = 256; reflection.height = 64;
  const ctx = reflection.getContext('2d'), light = ctx.createLinearGradient(0, 0, 256, 48);
  for (const [at, color] of [[0, '#526173'], [0.16, '#cfdae1'], [0.23, '#ffffff'], [0.3, '#68717b'],
    [0.47, '#cad5dc'], [0.62, '#66727c'], [0.71, '#f9fbff'], [0.85, '#bec6cf'], [1, '#526173']]) light.addColorStop(at, color);
  ctx.fillStyle = light; ctx.fillRect(0, 0, 256, 64);
  const env = new THREE.CanvasTexture(reflection); env.mapping = THREE.EquirectangularReflectionMapping; env.colorSpace = THREE.SRGBColorSpace;
  const surface = mesh(foil, geo, new THREE.MeshStandardMaterial({ color: 0xf1f3f4, envMap: env, envMapIntensity: 1.4, metalness: 0.84,
    roughness: 0.24, side: THREE.DoubleSide }), 0, 0, 0);
  const lid = mesh(foil, new THREE.CylinderGeometry(0.0157, 0.0167, 0.0025, 24), surface.material, 0, 0.052, 0);
  let last = -1;
  const draw = k => {
    if (k === last) return;
    last = k;
    const pos = geo.attributes.position;
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
      const u = 2 * i / cols - 1, v = j / rows, a = u * (0.87 + k * 2.26);
      const ridge = Math.sin(0.76 * i + 0.24 * j + Math.sin(j * 0.63)) * Math.cos(0.29 * j - i * 0.11);
      const wrinkle = 0.00155 * ridge + 0.00062 * Math.sin(j * 1.33 + i * 0.34 + Math.cos(i * 0.51));
      const radius = 0.0168 + wrinkle;
      pos.setXYZ(j * (cols + 1) + i, (1 - k) * u * 0.014 + radius * Math.sin(a),
        (0.5 - v) * 0.104 + wrinkle * 0.8, radius * Math.cos(a));
    }
    pos.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere(); geo.computeBoundingBox();
    lid.visible = k > 0.96;
  };
  draw(0);
  return { foil, pick: hit(foil, 0.034, 0.10, 0.030, 0), draw, dispose: () => env.dispose() };
}

export function lightAreas(group) {
  const patch = (x, w, color, opacity) => {
    const obj = mesh(group, new THREE.PlaneGeometry(w, 0.083),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }), x, 0.0013, -0.002);
    obj.rotation.x = -Math.PI / 2; obj.renderOrder = 2;
  };
  patch(LIGHT, 0.070, 0xece1af, 0.72);
  patch(SUN, 0.055, 0xe7be75, 0.86);
  for (let j = 0; j < 3; j++) patch(SUN - 0.018 + j * 0.017, 0.0022, 0xfff2cf, 0.9);
  faceLabel(group, '光亮处', { x: LIGHT, y: 0.007, z: 0.059, h: 0.011, color: '#51452d', stroke: '#fff9e7', opacity: 1 });
  faceLabel(group, '日光直射', { x: SUN, y: 0.007, z: 0.059, h: 0.011, color: '#805930', stroke: '#fff2d7', opacity: 1 });
}

const ORGANIC = ['CH₄', 'CH₃Cl', 'CH₂Cl₂', 'CHCl₃', 'CCl₄'];
const PERIOD = 4.5, WATER_START = PERIOD * 4;
export const MICRO_END = WATER_START + 6;
const atomStyle = { C: [0x3d4350, 0.4], O: [0xe0483a, 0.36], H: [0xf2f1ec, 0.24], Cl: [0x4cbf63, 0.60] };

export function substitutionScene() {
  const time = { t: 0, paused: false };
  let draw;
  return {
    holoBase: false, still: true, time,
    init(c) {
      time.t = 0; time.paused = false; c.view.film = 0; c.view.paper = null;
      const sphere = new THREE.SphereGeometry(1, 28, 20), rod = new THREE.CylinderGeometry(0.084, 0.084, 1, 12);
      const bondMat = mat(0xaeb6b8), up = V(0, 1);
      const materials = Object.fromEntries(Object.entries(atomStyle).map(([el, [color]]) =>
        [el, new THREE.MeshStandardMaterial({ color, roughness: 0.30 })]));
      function atom(parent, el, pos) {
        const a = mesh(parent, sphere, materials[el], pos.x, pos.y, pos.z);
        a.scale.setScalar(atomStyle[el][1]); return a;
      }
      function align(b, p, q) {
        const d = q.clone().sub(p);
        b.position.copy(p).lerp(q, 0.5); b.scale.y = d.length();
        b.quaternion.setFromUnitVectors(up, d.normalize());
      }
      function bond(parent, a, b) {
        const stick = mesh(parent, rod, bondMat, 0, 0, 0);
        align(stick, a.position, b.position); return stick;
      }
      function label(parent, text, x, y) {
        const tag = textSprite(text, '#30424a', '#fff');
        tag.scale.set(3.7, 1.35, 1); tag.position.set(x, y, 0); parent.add(tag); return tag;
      }
      const dirs = [V(1, 1, 1), V(-1, -1, 1), V(-1, 1, -1), V(1, -1, -1)].map(v => v.normalize()
        .applyAxisAngle(V(1, 0), -0.27));
      function organic(parent, n, x) {
        const carbon = atom(parent, 'C', V(x, 2.65));
        dirs.forEach((d, i) => {
          const el = i < n ? 'Cl' : 'H';
          bond(parent, carbon, atom(parent, el, carbon.position.clone().addScaledVector(d, i < n ? 1.77 : 1.09)));
        });
        label(parent, ORGANIC[n], x, 5);
      }
      // 同一视角的两份结构快照。两列之间没有碰撞、断键或成键动画。
      const pairs = ORGANIC.slice(0, 4).map((_, n) => {
        const pair = new THREE.Group(); c.layer.add(pair);
        organic(pair, n, -3.35); organic(pair, n + 1, 3.35);
        bond(pair, atom(pair, 'Cl', V(-4.35, -0.85)), atom(pair, 'Cl', V(-2.35, -0.85)));
        bond(pair, atom(pair, 'H', V(2.71, -0.85)), atom(pair, 'Cl', V(3.99, -0.85)));
        label(pair, 'Cl₂', -3.35, -2.17); label(pair, 'HCl', 3.35, -2.17);
        label(pair, '→', 0, 1.25);
        return pair;
      });
      const water = new THREE.Group(); c.layer.add(water);
      const film = mesh(water, new THREE.BoxGeometry(12, 3.45, 3.4),
        new THREE.MeshBasicMaterial({ color: 0x88bdc8, transparent: true, opacity: 0.25, depthWrite: false }), 0, -2, 0);
      film.renderOrder = -1;
      const o = atom(water, 'O', V(0, -1.68)), h = atom(water, 'H', V(-0.20, 2.65)), cl = atom(water, 'Cl', V(1.08, 2.65));
      for (const side of [-1, 1]) bond(water, o, atom(water, 'H', V(side * 0.76, -2.27, 0)));
      const hcl = bond(water, h, cl), oh = bond(water, o, h);
      const hclLabel = label(water, 'HCl', 0.44, 4), waterLabel = label(water, 'H₂O', -2.0, -2.65);
      const ionLabel = label(water, 'H₃O⁺', -2.05, -2.65), clLabel = label(water, 'Cl⁻', 2.85, -2.4);
      draw = t => {
        const n = Math.floor(t / PERIOD);
        pairs.forEach((g, i) => { g.visible = i === n; });
        water.visible = t >= WATER_START;
        if (!water.visible) return;
        const u = t - WATER_START, enter = ease((u - 0.8) / 2), transfer = ease((u - 2.8) / 1.2);
        h.position.set(-0.20 * (1 - enter), 2.65 - 3.08 * enter - 0.70 * transfer, -0.80 * transfer);
        cl.position.set(h.position.x + 1.28 + 1.54 * transfer, 2.65 - 3.08 * enter - 0.78 * transfer, 0);
        align(hcl, h.position, cl.position); align(oh, o.position, h.position);
        hcl.visible = transfer < 0.5; oh.visible = transfer >= 0.5;
        hclLabel.position.y = cl.position.y + 1.15;
        hclLabel.visible = waterLabel.visible = transfer === 0;
        ionLabel.visible = clLabel.visible = transfer === 1;
      };
      draw(0);
    },
    step(c, s, dt) {
      if (!time.paused) time.t = Math.min(time.t + dt, MICRO_END);
      draw(time.t);
    },
    text() {
      if (time.t >= WATER_START) {
        const cap = time.t - WATER_START < 2.8 ? '再看生成的 HCl，它很容易溶于水。' : 'HCl 把氢转移给水分子，形成 H₃O⁺ 和 Cl⁻。';
        return { eq: f('HCl') + ' + ' + f('H2O') + ' → ' + f('H₃O⁺') + ' + ' + f('Cl-'), cap, on: true };
      }
      const n = Math.floor(time.t / PERIOD);
      const eq = f(ORGANIC[n]) + ' + ' + f('Cl2') + '　<span style="font-size:0.68em">光</span>⟶　' + f(ORGANIC[n + 1]) + ' + ' + f('HCl');
      return { eq, cap: '左边是反应前，右边是反应后。找一找被替下的氢和两个氯各在哪里。', on: true };
    },
  };
}
