// 图2-7。距离用米，热力学用 K、bar、mol/L。
import * as THREE from 'three';
import { paint, inked } from '../../live/ink.js';
import { glass2, water2 } from './chemfx.js';
import { beaker } from './props.js';
import { clamp } from './interact.js';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const BATH_X = [-0.070, 0.070];
export const BATH_T = [333.15, 273.15];
export const ROOM = 295.15;
export const RADIUS = 0.029, RIM = 0.084, WATER = 0.072;
export const LOW = 0.038, HIGH = 0.127, CLEAR = RIM + RADIUS + 0.002;
export const BATH_NAMES = ['热水', '冰水'];
export const FLASK_NAMES = ['烧瓶 A', '烧瓶 B'];
export const FORMULA = '2NO<sub>2</sub>(g) ⇌ N<sub>2</sub>O<sub>4</sub>(g)　ΔH = −56.9 kJ/mol';

// NIST-JANAF 在 298.15 K、1 bar 的气相标准生成焓和熵。
export const NIST = ['https://webbook.nist.gov/cgi/cbook.cgi?ID=C10102440&Mask=1',
  'https://webbook.nist.gov/cgi/cbook.cgi?ID=C10544726&Mask=1'];
const H = (9.08 - 2 * 33.10) * 1000, S = 304.38 - 2 * 240.04;
const TOTAL = 0.012;
export function equilibrium(T) {
  const kp = Math.exp((S - H / T) / 8.314462618);
  const a = kp * 0.08314462618 * T; // c(N₂O₄) = Kp·RT/p°·c(NO₂)², p° = 1 bar
  return 2 * TOTAL / (1 + Math.sqrt(1 + 8 * a * TOTAL));
}
export const ROOM_C = equilibrium(ROOM);

function pick(parent, name, size, at = V()) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshBasicMaterial({ visible: false }));
  mesh.userData.pick = true;
  mesh.name = name;
  mesh.position.copy(at);
  parent.add(mesh);
  return mesh;
}

function part(parent, geo, mat, pos, order = 0) {
  const mesh = new THREE.Mesh(geo, mat);
  if (pos) mesh.position.copy(pos);
  mesh.renderOrder = order;
  parent.add(mesh);
  return mesh;
}

function glass(parent, geo, pos, order, options) {
  return part(parent, geo, glass2(options), pos, order);
}

function box(parent, size, pos, color, outline = false) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), paint(color));
  parent.add(outline ? inked(mesh, { width: 0.65 }) : mesh);
  mesh.position.copy(pos);
  return mesh;
}

function rod(parent, a, b, radius, mat) {
  const d = b.clone().sub(a);
  const mesh = part(parent, new THREE.CylinderGeometry(radius, radius, d.length(), 14), mat, a.clone().lerp(b, 0.5));
  mesh.quaternion.setFromUnitVectors(V(0, 1), d.normalize());
  return mesh;
}

const CUP_RADIUS = 0.052;
// WATER 是浸没后的液面。按浸入水中的球冠体积计算排水量。
const WATER_RADIUS = CUP_RADIUS * 0.95;
export function bathLevel(centerY) {
  const empty = WATER - 4 * RADIUS ** 3 / (3 * WATER_RADIUS ** 2);
  let level = empty;
  for (let i = 0; i < 6; i++) {
    const h = clamp(level - centerY + RADIUS, 0, 2 * RADIUS);
    level = empty + h * h * (RADIUS - h / 3) / WATER_RADIUS ** 2;
  }
  return level;
}

export function bath(parent, side) {
  const hot = side === 0, r = CUP_RADIUS;
  const cup = beaker({ r, h: RIM, level: WATER, spout: false });
  cup.position.set(BATH_X[side], 0, 0);
  const floor = cup.children.find((o) => o.geometry?.type === 'CylinderGeometry' && o !== cup.glass && o !== cup.liquid);
  floor.material = floor.material.clone();
  floor.material.depthWrite = false;
  floor.renderOrder = 4;
  cup.glass.material.dispose();
  cup.glass.material = glass2({ base: 0.055, rim: 0.58, band: 0.37 });
  cup.glass.renderOrder = 12;
  cup.liquid.material.dispose();
  cup.liquid.material = water2({ color: hot ? 0xc8dae0 : 0xa2c2d2, base: 0.24, rim: 0.20 });
  cup.surface.material.color.set(hot ? 0xd9e9eb : 0xc5deea);
  cup.surface.material.opacity = 0.40;
  cup.surface.material.depthWrite = false;
  cup.surface.renderOrder = 6;
  // Water and ice share the same depth ordering. Ice sits away from the flask path.
  const icePieces = [];
  if (!hot) {
    const iceMat = new THREE.MeshPhysicalMaterial({ color: 0xe4f3fc, roughness: 0.32, transparent: true, opacity: 0.82 });
    for (const [x, z, a] of [[-0.023, -0.036, 0.1], [0, -0.043, 0.5], [0.023, -0.036, 0.8]]) {
      const ice = part(cup, new THREE.DodecahedronGeometry(0.0071), iceMat, V(x, WATER - 0.003, z), 7);
      icePieces.push(ice);
      ice.rotation.set(0.28, a, 0.18);
      ice.scale.set(1, 0.83, 0.96);
    }
  }
  parent.add(cup);
  return (level) => {
    cup.setLevel(level);
    icePieces.forEach((ice) => { ice.position.y = level - 0.003; });
  };
}

function tintedGas(parent) {
  // Thickness of the spherical gas column is proportional to the view-normal dot product.
  // The absorption coefficient and display hue are illustrative, not spectroscopic data.
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { concentration: { value: ROOM_C } },
    vertexShader: `
      varying vec3 vNormalEq;
      varying vec3 vToCamera;
      void main() {
        vec4 p = modelViewMatrix * vec4(position, 1.0);
        vNormalEq = normalize(normalMatrix * normal);
        vToCamera = -p.xyz;
        gl_Position = projectionMatrix * p;
      }`,
    fragmentShader: `
      uniform float concentration;
      varying vec3 vNormalEq;
      varying vec3 vToCamera;
      void main() {
        float chord = max(0.0, dot(normalize(vNormalEq), normalize(vToCamera)));
        float density = concentration * chord;
        float opacity = 1.0 - exp(-180.0 * density);
        vec3 gas = mix(vec3(0.64, 0.23, 0.092), vec3(0.26, 0.040, 0.015), clamp(120.0 * density, 0.0, 1.0));
        gl_FragColor = vec4(gas, opacity);
        #include <colorspace_fragment>
      }`,
  });
  material.userData.see = 'gas';
  part(parent, new THREE.SphereGeometry(RADIUS - 0.0009, 44, 32), material, undefined, 9);
  return (concentration) => { material.uniforms.concentration.value = concentration; };
}

const NECK_TOP = 0.054, MANIFOLD = 0.071;
export function apparatus(parent, nameplate) {
  const rig = new THREE.Group();
  parent.add(rig);
  const glassTube = glass2({ tint: 0xe0f1ec, base: 0.26, rim: 0.45, band: 0.35 });
  const latex = paint(0xcabb83, { unique: true });
  latex.userData.see = 'tube';
  const flasks = BATH_X.map((x, id) => {
    const body = new THREE.Group();
    body.position.x = x;
    rig.add(body);
    const profile = Array.from({ length: 37 }, (_, i) => {
      const a = Math.PI - i * (Math.PI - 0.32) / 36;
      return new THREE.Vector2(RADIUS * Math.sin(a), RADIUS * Math.cos(a));
    });
    profile.push(new THREE.Vector2(0.0084, 0.031), new THREE.Vector2(0.0084, NECK_TOP));
    glass(body, new THREE.LatheGeometry(profile, 56), undefined, 11, { base: 0.035, rim: 0.64, band: 0.42 });
    nameplate(body, `${FLASK_NAMES[id]} · NO₂、N₂O₄`, 0, 0.043, 0.012);
    const tint = tintedGas(body);
    const lip = part(body, new THREE.TorusGeometry(0.0084, 0.00105, 8, 36), paint(0xb2c6c6), V(0, NECK_TOP));
    lip.rotation.x = -Math.PI / 2;
    const stopper = part(body, new THREE.CylinderGeometry(0.0077, 0.0064, 0.010, 24), paint(0x393a38), V(0, NECK_TOP + 0.002));
    stopper.userData.qaSupport = true;
    const path = new THREE.CatmullRomCurve3([V(0, NECK_TOP + 0.006), V(0, MANIFOLD - 0.003),
      V(-Math.sign(x) * 0.006, MANIFOLD), V(-Math.sign(x) * 0.030, MANIFOLD)]);
    part(body, new THREE.TubeGeometry(path, 24, 0.0018, 10), glassTube, undefined, 10);
    return { body, tint, pick: pick(body, FLASK_NAMES[id], [0.050, 0.053, 0.053]) };
  });

  rod(rig, V(-0.044, MANIFOLD), V(0.044, MANIFOLD), 0.0025, latex);
  const clip = new THREE.Group();
  clip.position.y = MANIFOLD;
  rig.add(clip);
  const jaws = [-1, 1].map((side) => {
    const jaw = new THREE.Group();
    const face = box(jaw, [0.015, 0.003, 0.027], V(0, 0, -0.003), 0x59676a, true);
    face.rotateY(0.08 * side);
    box(jaw, [0.017, 0.0035, 0.010], V(0, 0, 0.010), 0xc4a76b, true);
    clip.add(jaw);
    return jaw;
  });
  const spring = part(clip, new THREE.TorusGeometry(0.0038, 0.0008, 8, 25), paint(0x556264), V(0, 0, 0.006));
  spring.rotation.y = Math.PI / 2;
  clip.userData.ringY = HIGH + MANIFOLD + 0.010;
  nameplate(clip, '弹簧夹', 0, 0.019);
  nameplate(rig, '乳胶管', -0.029, MANIFOLD + 0.004);
  const clipPick = pick(clip, '弹簧夹', [0.035, 0.026, 0.032]);
  return {
    rig, flasks, clip, clipPick,
    draw(pose, pinched, concentrations) {
      rig.position.set(pose.x, pose.y, 0);
      rig.rotation.y = pose.angle;
      jaws.forEach((jaw, k) => {
        const sign = k ? 1 : -1;
        jaw.position.y = sign * (0.002 + (1 - pinched) * 0.0045);
        jaw.rotation.x = sign * pinched * 0.12;
      });
      flasks.forEach((f, i) => f.tint(concentrations[i]));
    },
  };
}

export function supports(parent, nameplate) {
  const collarY = NECK_TOP - 0.002;
  const steel = paint(0x657579);
  return BATH_X.map((x) => {
    const sign = Math.sign(x), post = x + sign * 0.079;
    nameplate(parent, '铁架台', post - sign * 0.024, 0.003, 0.024);
    box(parent, [0.040, 0.006, 0.053], V(post, 0.003, -0.024), 0x435055, true);
    rod(parent, V(post, 0.006, -0.024), V(post, HIGH + collarY + 0.008, -0.024), 0.0033, steel);
    const bracket = new THREE.Group();
    bracket.position.set(post, HIGH + collarY, -0.024);
    parent.add(bracket);
    box(bracket, [0.013, 0.012, 0.014], V(), 0x536163, true);
    rod(bracket, V(), V(x - post + sign * 0.0096, 0, 0.024), 0.0028, steel);
    const collar = part(bracket, new THREE.TorusGeometry(0.0097, 0.00125, 8, 28), steel, V(x - post, 0, 0.024));
    collar.rotation.x = -Math.PI / 2;
    return (y, release) => {
      bracket.position.y = Math.min(y + collarY, HIGH + collarY + 0.004);
      bracket.rotation.y = -sign * 0.54 * release;
    };
  });
}

const SAMPLE = 10, PAIRS = SAMPLE / 2;
export const dimerCount = (c) => clamp(Math.round((1 - c / TOTAL) * PAIRS), 0, PAIRS);
const smooth = (u) => { const t = clamp(u, 0, 1); return t * t * (3 - 2 * t); };
const SITES = [
  [-2.65, 2.0, -4.6], [2.65, 2.0, -4.6], [-2.65, 2.0, 0.05], [2.65, 2.0, 0.05], [0, 2.0, 4.7],
];
const rot = [1, -1].map((sign) => new THREE.Quaternion()
  .setFromAxisAngle(V(1), -Math.PI / 2)
  .multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), -sign * Math.PI / 2)));

export function temperatureScene() {
  let slots, motion, clock, turn, cycling, saved, halo, balanced;
  const site = (side, i) => V(...SITES[i]).add(V(BATH_X[side] * 105));
  const spacing = () => {
    const progress = smooth(motion.t / 1.12);
    return motion.join ? 1 - progress : progress;
  };
  const bonded = (slot) => motion?.slot === slot ? spacing() <= 0.14 : slot.joined;
  const showSlot = (c, slot, joined = slot.joined) => {
    slot.mols?.forEach(c.remove);
    slot.mols = joined ? [c.add('N2O4', slot.p.clone(), { fixed: true })] :
      [0, 1].map(() => c.add('NO2', slot.p.clone(), { fixed: true }));
  };
  const count = (side) => slots[side].filter(bonded).length;
  return {
    holoBase: false,
    paused: false,
    labels: (_, m) => m.rep,
    labelOnly: (_, m) => m.rep,
    snapshot() {
      return { counts: [0, 1].map((side) => slots[side].map((slot) => slot.joined)), clock, turn, balanced, paused: this.paused,
        motion: motion && { side: motion.side, i: slots[motion.side].indexOf(motion.slot), t: motion.t, join: motion.join }, cycling };
    },
    resume(snapshot) { saved = snapshot; },
    init(c, st) {
      slots = [0, 1].map((side) => SITES.map((_, i) => {
        const slot = { p: site(side, i), joined: saved ? saved.counts[side][i] : i < dimerCount(st.start[side]) };
        showSlot(c, slot, saved?.motion?.side === side && saved.motion.i === i ? false : slot.joined);
        return slot;
      }));
      clock = saved?.clock ?? -0.7;
      turn = saved?.turn ?? 0;
      cycling = saved?.cycling ?? null;
      balanced = saved?.balanced ?? false;
      this.paused = saved?.paused ?? false;
      motion = saved?.motion ? { ...saved.motion, slot: slots[saved.motion.side][saved.motion.i] } : null;
      saved = null;
      halo = part(c.layer, new THREE.RingGeometry(2.68, 2.78, 44), new THREE.MeshBasicMaterial({
        color: 0xb39058, opacity: 0.48, transparent: true, side: THREE.DoubleSide, depthWrite: false,
      }));
      halo.rotation.x = -Math.PI / 2;
      this.draw();
    },
    draw() {
      halo.visible = Boolean(motion);
      if (motion) halo.position.copy(motion.slot.p).add(V(0, -0.28));
      for (const side of [0, 1]) {
        // 热侧的 NO₂ 标在前排下方，冰侧的 N₂O₄ 标在后排上方。
        const kind = side === 0 ? 'NO2' : 'N2O4';
        const candidates = side === 0 ? [...slots[side]].reverse() : slots[side];
        const rep = candidates.find((slot) => slot !== motion?.slot && slot.mols[0].kind === kind);
        slots[side].forEach((slot, i) => {
          const active = motion?.slot === slot;
          const gap = active ? spacing() * 0.64 : 0.64;
          const drift = active ? 0 : Math.sin(clock * 1.5 + i * 1.8 + side) * 0.075;
          if (slot.mols.length === 1) {
            slot.mols[0].g.position.copy(slot.p).add(V(0, drift));
            slot.mols[0].g.rotation.set(0, 0, 0);
          } else {
            slot.mols.forEach((m, j) => {
              m.g.position.copy(slot.p).add(V((j ? 1 : -1) * (1.12 + gap), drift, 0));
              m.g.quaternion.copy(rot[j]);
            });
          }
          slot.mols.forEach((m, j) => {
            m.rep = slot === rep && j === 0;
            if (m.rep && side === 0) m.label.center.y = 2.75;
          });
        });
      }
    },
    links() {
      if (!motion || !bonded(motion.slot)) return [];
      return [[motion.slot.mols[0].g.position.clone().add(V(0.23)), motion.slot.mols[1].g.position.clone().add(V(-0.23))]];
    },
    step(c, st, dt) {
      if (this.paused) return;
      if (motion) {
        motion.t += dt;
        if (motion.t >= 1.12) {
          motion.slot.joined = motion.join;
          showSlot(c, motion.slot);
          motion = null;
          clock = 0;
        }
      } else {
        clock += dt;
        if (clock >= 0.48) {
          const mismatch = [0, 1].filter((side) => count(side) !== dimerCount(st.current[side]));
          if (!mismatch.length && st.settled) balanced = true;
          const side = cycling?.side ?? (mismatch.includes(turn) ? turn : mismatch[0]) ?? turn;
          const join = cycling?.join ?? (mismatch.length ? count(side) < dimerCount(st.current[side]) : count(side) < PAIRS);
          const slot = slots[side].find((slot) => slot.joined !== join);
          if (slot) {
            const atBalance = mismatch.length === 0;
            cycling = cycling ? null : atBalance && st.settled ? { side, join: !join } : null;
            if (!atBalance || cycling || st.settled) {
              motion = { slot, side, join, t: 0 };
              if (!join) showSlot(c, slot, false);
              turn = 1 - side;
            }
          }
        }
      }
      this.draw();
    },
    text(_, st) {
      const lines = [0, 1].map((i) => {
        const dimers = count(i);
        return `<span><b>${BATH_NAMES[i]} · ${FLASK_NAMES[st.ids[i]]}</b><br>NO₂ ${SAMPLE - 2 * dimers} 个　N₂O₄ ${dimers} 个</span>`;
      });
      let words = balanced ? '' : clock < 0 ? '先看两只烧瓶浸泡前的分子数。' : '比较两只烧瓶里两种分子各有几个。';
      if (motion) words = `${BATH_NAMES[motion.side]}一侧：${motion.join ? '两个 NO₂ 靠拢，结合成一个 N₂O₄。' : '一个 N₂O₄ 的 N—N 键断开，分成两个 NO₂。'}`;
      const status = balanced ? '<div><b>已达新平衡</b>：正、逆反应速率相等。</div>' : '';
      return { eq: FORMULA, on: true, cap: `<div class="eqtemp-counts">${lines.join('')}</div>${status}<div style="min-height:1.5em">${words}</div>` };
    },
  };
}
