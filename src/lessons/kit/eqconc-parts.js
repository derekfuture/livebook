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

// 液面与重力垂直。沿试管内壁取切面，积分求给定体积的液位，再裁出液体的侧面和自由液面。
function tiltingLiquid() {
  const material = water2({ color: 0xe6eef2, base: 0.69 });
  const geo = new THREE.BufferGeometry();
  const mesh = new THREE.Mesh(geo, material);
  mesh.renderOrder = 9.5; mesh.frustumCulled = false; mesh.raycast = () => {};
  const N = 24, bottom = 0.0093 - R_IN, top = T_LEN - 0.001;
  const radius = (y) => y >= 0.0093 ? R_IN : Math.sqrt(Math.max(0, R_IN ** 2 - (0.0093 - y) ** 2));
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
      const dy = (top - bottom) / 64;
      const slices = Array.from({ length: 64 }, (_, i) => { const y = bottom + (i + 0.5) * dy; return [y * b, radius(y)]; });
      let lo = -T_LEN, hi = T_LEN;
      for (let i = 0; i < 18; i++) {
        const h = (lo + hi) / 2;
        let sum = 0;
        for (const [y, r] of slices) {
          const u = A < 1e-6 ? (h >= y ? 1 : -1) : clamp((h - y) / (r * A), -1, 1);
          sum += r ** 2 * (Math.PI / 2 + Math.asin(u) + u * Math.sqrt(1 - u * u));
        }
        if (sum * dy * 1e6 < vol) lo = h;
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

const GRIP = 0.076;
export function pouringTube(group, home, name, getSample, tilt = -1.82) {
  const grip = new THREE.Group();
  grip.position.copy(home); grip.name = name; group.add(grip);
  grip.userData.ringY = 0.068;          // 光圈画在试管架顶上（画在桌面会被架子挡住）
  const tube = testTube({ len: T_LEN });
  tube.position.y = -GRIP; grip.add(tube);
  const upright = tubeLiquid({ R: R_IN, yc: 0.0093, top: T_LEN - 0.012, base: 0.68, specks: 0 });
  const tilted = tiltingLiquid(); tilted.userData.noFrame = true;
  tube.add(upright, tilted);
  const pick = pickBox(grip, 0.026, 0.062, 0.023, 0, -0.018);
  const vertical = V(0, 0, 1), rim = V(-Math.sign(tilt) * R_IN, T_LEN - GRIP);
  const lip = rim.clone().applyAxisAngle(vertical, tilt);
  const dock = (x, y, z = 0) => V(x - lip.x, y + 0.009 - lip.y, z);
  const outlet = () => rim.clone().applyAxisAngle(vertical, grip.rotation.z).add(grip.position);
  const draw = () => {
    const s = getSample(), color = liquorColor(s), a = grip.rotation.z;
    upright.visible = Math.abs(a) < 0.06;
    tilted.visible = false;
    if (upright.visible) upright.setLevel(levelY(s.vol)).setColor(color);
    else tilted.fill(s.vol, a, color);
  };
  return { grip, pick, home, dock, outlet, draw, tilt, dispose() { upright.dispose(); tilted.geometry.dispose(); tilted.material.dispose(); } };
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
const angles = [Math.PI / 6, 5 * Math.PI / 6, 3 * Math.PI / 2].map((a) => a + 0.32);
const smooth = (x) => { const u = clamp(x, 0, 1); return u * u * (3 - 2 * u); };
const radial = (a, r, y = 1.7) => V(Math.cos(a) * r, y, Math.sin(a) * r);

export function equilibriumScene() {
  let current, finish, index, event, clock, direction, runs, credit, particles, dots, changed, metal, landed, saved;
  const put = (c, kind, p, rep = true) => {
    const m = c.add(kind, p, { fixed: true, rep });
    m.g.rotation.set(0, 0, 0);
    if (kind === 'Fe3+' && p.x === 0) m.label.center.x = 0.73;
    if (kind === 'Fe(SCN)3') m.label.center.x = 0.67;
    if (kind === 'Fe3+' || kind === 'Fe2+') m.glowS.visible = false;
    return m;
  };
  const clear = (c) => { particles.forEach(c.remove); particles = []; dots.forEach((dot) => { dot.visible = false; }); };
  const complex = (c) => { particles = [put(c, 'Fe(SCN)3', V(0, 1.7))]; };
  const loose = (c, r) => {
    particles = [put(c, 'Fe3+', V(0, 1.7)), ...angles.map((a, i) => {
      const m = put(c, 'SCN-', radial(a, r), i === 0);
      m.g.rotation.y = -a; return m;
    })];
  };
  const begin = (c, next) => {
    if (direction !== next) { clear(c); if (next > 0) loose(c, 4.45); else complex(c); }
    direction = next;
    event = next > 0 ? 'join' : 'split'; clock = 0;
  };
  const perturb = (c, dose) => {
    clear(c);
    event = dose.type; clock = 0; landed = 0; changed = dose;
    current = { ...dose.before };
    if (event === 'iron') {
      metal = [[-1.08, 0.41, -0.52], [1.08, 0.41, -0.52], [0, 0.41, -1.1]].map(([x, y, z]) => put(c, 'Fe', V(x, y, z), false));
      particles = [put(c, 'Fe', V(0, 0.7)), put(c, 'Fe3+', V(-2.5, 1.8, 0.5)), put(c, 'Fe3+', V(2.5, 1.8, 0.5), false)];
    } else {
      complex(c);
      const salt = put(c, 'SCN-', V(-4.7, 4.1, -2.7));
      salt.g.rotation.y = -Math.PI / 2; particles.push(salt);
    }
  };
  const balanced = () => {
    const [forward, reverse] = rates(current);
    return Math.abs(forward - reverse) < 0.025 * Math.max(forward, reverse);
  };
  const rateLine = () => {
    const [forward, reverse] = rates(current), high = Math.max(forward, reverse, 0.0001);
    const bar = (name, value) => `<span style="display:inline-block;white-space:nowrap;margin:0 8px">${name} <span style="display:inline-block;width:58px;height:5px;background:#ded9d0;vertical-align:middle"><i style="display:block;width:${Math.max(value > 0 ? 3 : 0, Math.round(100 * value / high))}%;height:100%;background:#566383"></i></span></span>`;
    return `<div>${bar('正反应', forward)}${bar('逆反应', reverse)}</div>`;
  };

  const pack = ({ kind, rep, g }) => ({ kind, rep, p: g.position.clone(), rotation: g.rotation.clone(), visible: g.visible });
  const unpack = (c, { kind, rep, p, rotation, visible }) => {
    const m = put(c, kind, p.clone(), rep);
    m.g.rotation.copy(rotation); m.g.visible = visible;
    return m;
  };
  return {
    snapshot() {
      return {
        current: { ...current }, finish, index, event, clock, direction, runs, credit, changed, landed,
        particles: particles.map(pack), metal: event === 'iron' ? metal.map(pack) : [],
      };
    },
    resume(snapshot) { saved = snapshot; },
    still: true,
    labels: (kind, m) => m.rep,
    labelOnly: (kind, m) => m.rep,
    init(c, st) {
      c.view.paper = null; c.view.film = 2.7; c.view.liquid = 0xd8dedb;
      if (saved) {
        ({ current, finish, index, event, clock, direction, runs, credit, changed, landed } = saved);
        particles = saved.particles.map((p) => unpack(c, p));
        metal = saved.metal.map((p) => unpack(c, p)); saved = null;
      } else {
        current = { ...st.base }; finish = equilibrium(current);
        index = 0; event = 'rest'; clock = 0.65; direction = 1; runs = 0; credit = 0; changed = null;
        loose(c, 4.45);
      }
      dots = [0, 1].map(() => {
        const e = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), new THREE.MeshBasicMaterial({ color: 0x30384c }));
        e.visible = false; c.layer.add(e); return e;
      });
    },
    links() {
      if (event !== 'join' && event !== 'split') return [];
      const ligand = particles[1];
      if (!ligand || Math.hypot(ligand.g.position.x, ligand.g.position.z) > 3.58) return [];
      return particles.slice(1).map((m) => [particles[0].g.position, m.g.position.clone().add(V(-1.35, 0).applyEuler(m.g.rotation))]);
    },
    step(c, st, dt) {
      clock += dt;
      if (event === 'iron' || event === 'salt') {
        let doneAt = 2.35;
        if (event === 'iron') {
          const start = particles[0].g.position;
          dots.forEach((d, i) => {
            const u = (clock - 0.55) / 0.85;
            d.visible = u > 0 && u < 1;
            d.position.copy(start).lerp(particles[i + 1].g.position, smooth(u));
            d.position.y += 0.33 + Math.sin(Math.PI * smooth(u)) * 0.67;
          });
          if (clock >= 1.4 && particles[0].kind === 'Fe') {
            const places = particles.map((m) => m.g.position.clone());
            clear(c); particles = places.map((p, i) => put(c, 'Fe2+', p, i === 1));
            current = { ...changed.after };
          }
          if (clock >= 1.4) particles[0].g.position.y = 0.7 + 1.18 * smooth((clock - 1.4) / 0.65);
        } else {
          const pulses = changed.pulses, salt = particles[1];
          const flight = Math.max(0, clock - 0.18) / 0.61;
          const index = Math.floor(flight), phase = flight - index;
          salt.g.visible = index < pulses.length;
          salt.g.position.y = 4.1 - 2.4 * smooth(phase / 0.86);
          if (index + (phase >= 0.86 ? 1 : 0) > landed && landed < pulses.length) current = { ...pulses[landed++] };
          doneAt = 0.18 + 0.61 * pulses.length + 0.75;
        }
        if (clock >= doneAt) {
          if (event === 'iron') metal.forEach(c.remove);
          finish = equilibrium(current);
          direction = 0; runs = 0; credit = 0;
          begin(c, event === 'iron' ? -1 : 1);
        }
        return;
      }
      if (changed) relax(current, finish, dt * 0.56);
      if (event === 'rest') {
        if (clock < 0.55) return;
        const nextDose = st.doses[index];
        // 先看一结合、一分开。扰动后至少演四组，直到趋向新平衡，再接下一支试管。
        if (nextDose && runs >= 2 && (!changed || (runs >= 4 && balanced()))) { index++; perturb(c, nextDose); return; }
        const [forward, reverse] = rates(current);
        const p = forward + reverse ? forward / (forward + reverse) : 0.5;
        credit += p;
        if (runs === 0 && !changed) { begin(c, 1); credit = -0.5; }
        else if (credit >= 0.5) { begin(c, 1); credit--; }
        else begin(c, -1);
        return;
      }
      const u = smooth(clock / 1.2);
      if (event === 'split' && particles.length === 1) { clear(c); loose(c, 3.33); }
      const r = event === 'join' ? 4.45 + (3.33 - 4.45) * u : 3.33 + (4.45 - 3.33) * u;
      particles.slice(1).forEach((m, i) => m.g.position.copy(radial(angles[i], r)));
      if (clock >= 1.2) {
        if (event === 'join') { clear(c); complex(c); direction = -1; }
        else direction = 1;
        event = 'rest'; clock = 0; runs++;
      }
    },
    text() {
      const eq = event === 'iron' ? REDOX : BALANCE;
      const tube = changed ? `试管 ${changed.tube} · ` : '分装后的溶液 · ';
      if (event === 'iron') return { eq, on: true, cap: `试管 ${changed.tube} · ${clock < 1.4 ? '铁粉里的 Fe 交出两个电子，各给一个 Fe³⁺。' : '生成 Fe²⁺，正反应一时变慢，逆反应占优。'}${rateLine()}` };
      if (event === 'salt') return { eq, on: true, cap: `试管 ${changed.tube} · ${landed ? 'SCN⁻ 增多，正反应一时变快。' : '滴入 KSCN，带来更多 SCN⁻。'}${rateLine()}` };
      const [forward, reverse] = rates(current);
      const close = balanced();
      const summary = close ? (changed ? '新平衡：两边速率又相等。' : '两边速率相等。') : forward > reverse ? '正反应较快。' : '逆反应较快。';
      const action = event === 'join' ? 'Fe³⁺ 与三个 SCN⁻ 靠拢、结合。' : event === 'split' ? 'Fe(SCN)₃ 分开，释放 Fe³⁺ 和 SCN⁻。' : close ? '结合与分开仍在发生。' : '两边的速率逐渐接近。';
      return { eq, on: true, cap: `${tube}${action} ${summary}${rateLine()}` };
    },
  };
}
