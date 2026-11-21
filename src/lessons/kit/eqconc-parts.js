import * as THREE from 'three';
import { testTube, spatula } from './chem.js';
import { tubeLiquid, water2 } from './chemfx.js';
import { levelY, R_IN, T_LEN } from './tubebench.js';
import { clamp } from './interact.js';
import { Particles } from './fx.js';

export const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
export const FEED = 0.005, LIGAND = 0.015, STRONG = 1;
const REF = FEED / 2, K = 2;
export const PORTION = 10 / 3;
export const IRON = (FEED * PORTION / 2) * 0.315; // mmol Fe，示意。可消耗原来 Fe(III) 总量的 63%
export const sample = (vol = 0, fe = 0) => ({ vol, fe, scn: 0, red: 0, ferrous: 0, drops: 0, iron: 0 });

export function rates({ vol, fe, scn, red }) {
  if (!vol) return [0, 0];
  return [(fe - red) / (vol * REF) * ((scn - 3 * red) / (3 * vol * REF)) ** 3, red / (vol * REF * K)];
}

export function equilibrium(s) {
  let lo = 0, hi = Math.min(s.fe, s.scn / 3);
  const c = s.vol * REF;
  for (let i = 0; i < 28; i++) {
    const m = (lo + hi) / 2;
    if (K * (s.fe - m) * (s.scn - 3 * m) ** 3 > m * 27 * c ** 3) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

export function relax(s, target, dt) {
  const delta = target - s.red;
  s.red = Math.abs(delta) < 1e-8 ? target : s.red + delta * (1 - Math.exp(-2.3 * dt));
}

export function liquorColor(s) {
  const vol = s.vol || 1;
  const red = Math.min(1, s.red / (vol * REF));
  if (red < 1e-6) return s.fe ? 0xffde80 : 0xe4eff1;
  const k = Math.min(1, red ** 0.57 * 1.04);
  const rgb = (a, b) => Math.round(a + (b - a) * k);
  return (rgb(255, 175) << 16) | (rgb(218, 0) << 8) | rgb(182, 43);
}

function pickBox(parent, w, h, d, x = 0, y = 0) {
  const pick = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
  pick.position.set(x, y, 0); pick.userData.pick = true;
  parent.add(pick);
  return pick;
}

// 水平液面和管口下沿用同一套圆底试管截面换算体积（mL）。
const bottom = 0.0093 - R_IN, top = T_LEN - 0.001, dy = (top - bottom) / 80;
const radius = (y) => Math.sqrt(Math.max(0, R_IN ** 2 - Math.max(0, 0.0093 - y) ** 2));
const slices = Array.from({ length: 80 }, (_, i) => {
  const y = bottom + (i + 0.5) * dy;
  return [y, radius(y)];
});
function volumeBelow(h, sin, cos) {
  let sum = 0;
  for (const [y, r] of slices) {
    const u = sin < 1e-6 ? (h >= y * cos ? 1 : -1) : clamp((h - y * cos) / (r * sin), -1, 1);
    sum += r * r * (Math.PI / 2 + Math.asin(u) + u * Math.sqrt(1 - u * u));
  }
  return sum * dy * 1e6;
}

// 液面与重力垂直。沿试管内壁取切面，积分求给定体积的液位，再裁出液体的侧面和自由液面。
function tiltingLiquid() {
  const material = water2({ color: 0xe6eef2, base: 0.69 });
  const geo = new THREE.BufferGeometry();
  const mesh = new THREE.Mesh(geo, material);
  mesh.renderOrder = 9.5; mesh.frustumCulled = false; mesh.raycast = () => {};
  const N = 24;
  const section = (y, r) => Array.from({ length: N }, (_, k) => V(r * Math.cos(2 * Math.PI * k / N), y, r * Math.sin(2 * Math.PI * k / N)));
  const rings = Array.from({ length: 7 }, (_, i) => section(bottom + R_IN * i / 6, radius(bottom + R_IN * i / 6)));
  rings.push(section(top, R_IN));
  const faces = [];
  for (let j = 1; j < rings.length; j++) {
    for (let k = 0; k < N; k++) faces.push([rings[j - 1][k], rings[j][k], rings[j][(k + 1) % N], rings[j - 1][(k + 1) % N]]);
  }
  faces.push(rings[rings.length - 1].slice().reverse());
  const vertices = new Float32Array(1800 * 3);
  const buffer = new THREE.BufferAttribute(vertices, 3); geo.setAttribute('position', buffer);
  const dot = (p, a, b) => p.x * a + p.y * b;
  let lastA = NaN, lastV = NaN;
  return Object.assign(mesh, {
    fill(vol, angle, color) {
      mesh.visible = vol > 0.001;
      if (!mesh.visible) return;
      material.color.set(color);
      if (Math.abs(vol - lastV) < 0.012 && Math.abs(angle - lastA) < 0.005) return;
      lastV = vol; lastA = angle;
      const a = Math.sin(angle), b = Math.cos(angle), A = Math.abs(a);
      let lo = -T_LEN, hi = T_LEN;
      for (let i = 0; i < 18; i++) {
        const h = (lo + hi) / 2;
        if (volumeBelow(h, A, b) < vol) lo = h;
        else hi = h;
      }
      const surface = [], h = (lo + hi) / 2;
      let n = 0;
      const tri = (p, q, r) => { for (const t of [p, q, r]) { t.toArray(vertices, n * 3); n++; } };
      for (const face of faces) {
        const clipped = [];
        for (let k = 0; k < face.length; k++) {
          const p = face[k], q = face[(k + 1) % face.length], u = h - dot(p, a, b), v = h - dot(q, a, b);
          if (u >= 0) clipped.push(p);
          if ((u >= 0) !== (v >= 0)) { const cross = p.clone().lerp(q, u / (u - v)); clipped.push(cross); surface.push(cross); }
        }
        for (let k = 2; k < clipped.length; k++) tri(clipped[0], clipped[k - 1], clipped[k]);
      }
      if (surface.length > 2) {
        const center = surface.reduce((p, q) => p.add(q), V(0, 0)).divideScalar(surface.length);
        const az = (p) => Math.atan2(p.z - center.z, (p.x - center.x) * b - (p.y - center.y) * a);
        surface.sort((p, q) => az(q) - az(p));
        for (let k = 2; k < surface.length; k++) tri(surface[0], surface[k - 1], surface[k]);
      }
      geo.setDrawRange(0, n); buffer.needsUpdate = true; geo.computeVertexNormals();
    },
  });
}

// 给定倾角时，管口下沿以下还能容纳多少液体（mL）。按圆底和圆筒的水平截面求积。
const rimCapacity = Array.from({ length: 91 }, (_, deg) => {
  if (deg >= 90) return 0;
  const angle = deg * Math.PI / 180, sin = Math.sin(angle), cos = Math.cos(angle);
  return volumeBelow(top * cos - R_IN * sin, sin, cos);
});
export function retained(angle) {
  const deg = Math.min(90, Math.abs(angle) * 180 / Math.PI);
  const i = Math.min(89, Math.floor(deg));
  return rimCapacity[i] + (rimCapacity[i + 1] - rimCapacity[i]) * (deg - i);
}
export function pourAngle(left) {
  if (left <= 0.00001) return Math.PI / 2 + 0.10;
  const i = rimCapacity.findIndex((vol) => vol <= left);
  return (i - 1 + (rimCapacity[i - 1] - left) / (rimCapacity[i - 1] - rimCapacity[i])) * Math.PI / 180;
}

const GRIP = 0.076, READY = 0.95;
export function pouringTube(group, home, name, getSample, yaw = 0) {
  const grip = new THREE.Group();
  grip.position.copy(home); grip.name = name; group.add(grip);
  grip.userData.ringY = 0.068;          // 光圈画在试管架顶上（画在桌面会被架子挡住）
  const tube = testTube({ len: T_LEN });
  tube.position.y = -GRIP; grip.add(tube);
  const upright = tubeLiquid({ R: R_IN, yc: 0.0093, top: T_LEN - 0.012, base: 0.68, specks: 0 });
  const tilted = tiltingLiquid(); tilted.userData.noFrame = true;
  tube.add(upright, tilted);
  const pick = pickBox(grip, 0.026, T_LEN, 0.023, 0, T_LEN / 2 - GRIP);
  const rim = V(R_IN, T_LEN - GRIP);
  const lip = new THREE.Object3D(); lip.position.copy(rim); grip.add(lip);
  // 先倾斜再绕竖轴转向：分装时管底朝架前伸出，重力和管唇仍按同一姿态计算。
  const tilt = (angle, approach = 1) => grip.rotation.set(0, yaw * approach, -angle, 'YXZ');
  const rimOffset = () => rim.clone().applyEuler(grip.rotation);
  const dock = (x, y) => V(x, y + 0.009).sub(rimOffset());
  const outlet = () => rimOffset().add(grip.position);
  const draw = () => {
    const s = getSample(), color = liquorColor(s), a = grip.rotation.z;
    upright.visible = s.vol > 0.001 && Math.abs(a) < 0.001;
    tilted.visible = false;
    if (upright.visible) upright.setLevel(levelY(s.vol)).setColor(color);
    else tilted.fill(s.vol, a, color);
  };
  return { grip, lip, pick, home, tilt, dock, outlet, draw, ready: READY, dispose() { upright.dispose(); tilted.geometry.dispose(); tilted.material.dispose(); } };
}

export function ironSpoon(group, home) {
  const tool = spatula({ color: 0x50505a });
  tool.name = '铁粉药匙'; tool.scale.setScalar(0.72); group.add(tool);
  const pick = pickBox(tool, 0.105, 0.026, 0.028, 0.048);
  const dust = new Particles({ max: 36, geometry: new THREE.IcosahedronGeometry(1, 0), material: new THREE.MeshStandardMaterial({ color: 0x54545b }) });
  dust.mesh.renderOrder = 9.6; group.add(dust.mesh);
  tool.position.copy(home);
  return { tool, pick, dust, home };
}

export const BALANCE = 'Fe³⁺ + 3SCN⁻ ⇌ Fe(SCN)₃';
export const REDOX = 'Fe + 2Fe³⁺ → 3Fe²⁺';
const angles = [Math.PI / 6, 5 * Math.PI / 6, 3 * Math.PI / 2].map((angle) => angle + 0.32);
const smooth = (value) => { const u = clamp(value, 0, 1); return u * u * (3 - 2 * u); };
const SITES = [V(-6.15, 1.65, -5.45), V(6.15, 1.65, -5.45), V(-6.15, 1.65, 5.45), V(6.15, 1.65, 5.45)];
const IRON_SITE = V(0, 1.65, 0.75);
const SALT_SITES = [V(-1.15, 1.65, 0.95), V(2.45, 1.65, 1.65)];
const BOUND = 3.33, FREE = 4.18, JOIN_TIME = 1.65;

export function equilibriumScene() {
  const freeAngles = angles.map((angle, arm) => arm === 1 ? angle + 0.65 : angle);
  const arms = SITES.map((_, slot) => angles.map((_, arm) => slot * 3 + arm));
  const sitesAt = (site, directions, radius) => directions.map((angle) =>
    site.clone().add(V(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)));
  const homes = [...SITES.flatMap((site) => sitesAt(site, freeAngles, FREE)), ...SALT_SITES];
  const tips = SITES.map((site) => sitesAt(site, angles, BOUND));
  const firstAdded = arms.length * 3;
  let run, saved, centers, ligands, metal, electrons;
  const initial = () => ({ bound: [true, false, false, true], arms: arms.map((ids) => ids.slice()), reduced: [], enriched: false, target: 2 });
  const data = () => run.tube ? run.tubes[run.tube] : run.base;
  const count = () => data().bound.filter(Boolean).length;
  const put = (c, kind, pos) => {
    const molecule = c.add(kind, pos, { fixed: true, rep: false });
    molecule.g.rotation.set(0, 0, 0);
    molecule.label.userData.baseScale = molecule.label.scale.clone();
    if (kind === 'Fe(SCN)3') molecule.label.center.set(0.86, -1.4);
    if (kind === 'SCN-') molecule.label.center.set(0.5, 0.17);
    return molecule;
  };
  const particle = (c, old, kind, pos) => {
    if (old?.kind === kind) return old;
    if (old) c.remove(old);
    return kind ? put(c, kind, pos) : null;
  };
  const phase = (mode) => { run.mode = mode; run.clock = 0; };
  const drawing = (c) => {
    const sample = data(), motion = run.motion, reps = new Set();
    const boundIds = new Set();
    centers = centers.map((center, slot) => {
      const bonded = sample.bound[slot] && motion?.slot !== slot;
      if (bonded) sample.arms[slot].forEach((id) => boundIds.add(id));
      const kind = sample.reduced.includes(slot) ? 'Fe2+' : bonded ? 'Fe(SCN)3' : 'Fe3+';
      center = particle(c, center, kind, SITES[slot]);
      center.rep = !reps.has(kind) || (run.mode === 'iron' && run.recipients.includes(slot));
      reps.add(kind);
      return center;
    });

    const adding = run.mode === 'salt', u = smooth((motion?.clock ?? 0) / JOIN_TIME);
    const movingArms = motion ? sample.arms[motion.slot] : [];
    ligands = ligands.map((ligand, id) => {
      const fresh = id >= firstAdded, present = !fresh || adding || sample.enriched;
      ligand = particle(c, ligand, present && !boundIds.has(id) ? 'SCN-' : null, homes[id]);
      if (!ligand) return null;
      const pos = ligand.g.position, arm = movingArms.indexOf(id);
      const rotation = fresh ? 0.95 + (id - firstAdded) * 0.35 : -freeAngles[id % 3];
      pos.copy(homes[id]); ligand.g.rotation.y = rotation;
      if (arm >= 0) {
        const weight = motion.joining ? u : 1 - u;
        pos.lerp(tips[motion.slot][arm], weight);
        const delta = -angles[arm] - rotation;
        ligand.g.rotation.y += Math.atan2(Math.sin(delta), Math.cos(delta)) * weight;
      } else if (fresh && adding && !sample.enriched) {
        pos.y += 1.8 * (1 - smooth((run.clock - 0.18 - (id - firstAdded) * 0.25) / 1.0));
      }
      ligand.rep = false;
      return ligand;
    });
    const freeRep = ligands[firstAdded] || ligands[1] || ligands[7] || ligands.find(Boolean);
    if (freeRep) freeRep.rep = true;
    const addingIron = run.mode === 'iron';
    const metalKind = sample.reduced.length ? 'Fe2+' : addingIron ? 'Fe' : null;
    metal = particle(c, metal, metalKind, IRON_SITE);
    if (metal) {
      metal.rep = addingIron;
      if (metal.kind === 'Fe') metal.g.position.y = 1.65 + 1.4 * (1 - smooth(run.clock / 0.55));
    }
    for (const molecule of [...centers, ...ligands, metal]) {
      if (!molecule) continue;
      molecule.label.visible = molecule.rep;
      if (molecule.rep) {
        molecule.label.material.opacity = 0.88;
        molecule.label.scale.copy(molecule.label.userData.baseScale).multiplyScalar(clamp(900 / innerWidth, 1, 2));
      }
    }
    electrons.forEach((dot, index) => {
      const u = (run.clock - 0.8) / 2.15;
      dot.visible = addingIron && u > 0 && u < 1;
      if (dot.visible) {
        dot.position.copy(IRON_SITE).lerp(SITES[run.recipients[index]], smooth(u));
        dot.position.y += 0.3 + 0.75 * Math.sin(Math.PI * u);
      }
    });
  };
  const animate = (joining) => {
    const sample = data();
    const choices = sample.bound.flatMap((bound, slot) => !sample.reduced.includes(slot) && bound !== joining ? [slot] : []);
    const slot = choices.find((candidate) => candidate !== run.lastSlot) ?? choices[0];
    if (slot == null) return;
    if (joining) {
      // 游离的 SCN⁻ 共用一池。优先追踪刚滴入的代表离子，让它占离自己最近的配位位置。
      const free = ligands.map((m, id) => m ? id : -1).filter((id) => id >= 0);
      const order = [0, 1, 2];
      if (sample.enriched && free.includes(firstAdded)) {
        order.sort((a, b) => homes[firstAdded].distanceToSquared(tips[slot][a]) - homes[firstAdded].distanceToSquared(tips[slot][b]));
      }
      order.forEach((arm, n) => {
        const tip = tips[slot][arm];
        free.sort((a, b) => homes[a].distanceToSquared(tip) - homes[b].distanceToSquared(tip));
        const take = n === 0 && free.includes(firstAdded) ? free.indexOf(firstAdded) : 0;
        sample.arms[slot][arm] = free.splice(take, 1)[0];
      });
    } else sample.bound[slot] = false;
    run.motion = { slot, joining, clock: 0 };
    run.lastSlot = slot;
  };
  const startDose = (dose) => {
    run.dose = dose;
    run.steady = 0;
    if (run.tube === dose.tube) { phase('prepare'); return; }
    run.tube = dose.tube;
    run.tubes[dose.tube] ??= initial();
    phase('switch');
  };
  const settle = (st) => {
    const dose = run.dose, sample = data();
    const after = dose.pulses[dose.pulses.length - 1] ?? dose.after;
    const fraction = equilibrium(after) / st.base.fe;
    sample.target = clamp(Math.round(SITES.length * fraction ** 0.75), 0, Math.min(SITES.length - 1, SITES.length - sample.reduced.length));
    phase('relax');
  };

  return {
    snapshot() { return JSON.parse(JSON.stringify(run)); },
    resume(snapshot) { saved = snapshot; },
    get paused() { return !!run?.paused; },
    togglePause() { run.paused = !run.paused; },
    still: true,
    holoBase: false,
    labels: (kind, molecule) => molecule.rep,
    labelOnly: (kind, molecule) => molecule.rep,
    init(c, st) {
      c.view.paper = null; c.view.film = 0;
      run = saved ?? { base: initial(), tubes: st.tube ? { [st.tube]: initial() } : {}, tube: st.tube, index: 0, dose: null, mode: 'equilibrium', clock: 0, steady: 0, motion: null, lastSlot: -1 };
      saved = null;
      centers = SITES.map(() => null); ligands = homes.map(() => null); metal = null;
      electrons = [0, 1].map(() => {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), new THREE.MeshBasicMaterial({ color: 0x30384c }));
        dot.visible = false; c.layer.add(dot); return dot;
      });
      drawing(c);
    },
    links() {
      const motion = run.motion;
      if (!motion || !motion.joining || motion.clock < 1.25) return [];
      return data().arms[motion.slot].map((id) => {
        const ligand = ligands[id];
        return [centers[motion.slot].g.position, ligand.g.position.clone().add(V(-1.35, 0).applyEuler(ligand.g.rotation))];
      });
    },
    step(c, st, dt) {
      if (run.paused) return;
      const sample = data();
      const motion = run.motion;
      if (motion) {
        motion.clock += dt;
        if (motion.clock >= JOIN_TIME) {
          sample.bound[motion.slot] = motion.joining;
          run.motion = null;
          if (run.mode === 'equilibrium') run.steady++;
          run.clock = 0;
        }
      } else {
        run.clock += dt;
        if (run.mode === 'switch' && run.clock >= 1.25) phase('prepare');
        if (run.mode === 'prepare') {
          if (run.dose.type === 'iron') {
            const free = sample.bound.flatMap((bound, slot) => !bound && !sample.reduced.includes(slot) ? [slot] : []);
            if (free.length < 2) animate(false);
            else { run.recipients = free.slice(0, 2); phase('iron'); }
          } else phase('salt');
        } else if (run.mode === 'iron') {
          if (run.clock >= 2.95) sample.reduced = run.recipients;
          if (run.clock >= 5.3) settle(st);
        } else if (run.mode === 'salt') {
          if (run.clock >= 1.43) sample.enriched = true;
          if (run.clock >= 2.25) settle(st);
        } else if (run.mode === 'relax' && run.clock >= 0.45) {
          if (count() === sample.target) phase('equilibrium');
          else animate(count() < sample.target);
        } else if (run.mode === 'equilibrium' && run.clock >= (count() === sample.target ? 1.1 : 0.55)) {
          const next = st.doses[run.index];
          if (count() === sample.target && run.steady >= 2 && next) {
            run.index++;
            startDose(next);
          } else animate(count() < sample.target || (sample.target === 0 && count() === 0));
        }
      }
      drawing(c);
    },
    text() {
      const sample = data();
      const tube = run.tube ? `试管 ${run.tube}` : '分装后的溶液';
      const total = `<div class="eqconc-count">画面中的 Fe(SCN)₃：${count()} 组</div>`;
      let detail;
      if (run.mode === 'switch') detail = '换一支试管：先看加入试剂前的平衡。';
      else if (run.mode === 'iron') detail = sample.reduced.length ? '一个 Fe 失去两个电子，两个 Fe³⁺ 各得到一个电子，形成三个 Fe²⁺。' : '铁粉里的 Fe 放出两个电子，分别给两个 Fe³⁺。';
      else if (run.mode === 'salt') detail = '滴入 KSCN，溶液里的 SCN⁻ 增多。';
      else if (run.mode === 'relax' && run.motion?.joining && sample.arms[run.motion.slot].includes(firstAdded)) detail = '跟着刚滴入的 SCN⁻ 看：它和另外两个 SCN⁻ 一起与 Fe³⁺ 结合。';
      else if (run.mode === 'relax') detail = run.dose.type === 'iron' ? '分开暂时比结合快，Fe(SCN)₃ 变少。' : '结合暂时比分开快，Fe(SCN)₃ 变多。';
      else if (run.motion) detail = run.motion.joining ? 'Fe³⁺ 和三个 SCN⁻ 靠拢、结合。' : '一组 Fe(SCN)₃ 分开，释放 Fe³⁺ 和 SCN⁻。';
      else detail = `${run.index ? '新平衡' : '动态平衡'}：结合和分开仍在发生，两边速率相等。`;
      return { eq: run.mode === 'iron' ? REDOX : BALANCE, on: true, cap: `${total}<div>${tube} · ${detail}</div>` };
    },
  };
}
