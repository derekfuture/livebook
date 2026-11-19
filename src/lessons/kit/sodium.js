// 高中化学的新器材与钠-水教学模型。只供 nawater 使用，不改初中活页的公共件。
import * as THREE from 'three';
import { paint, inked, glassEdge } from '../../live/ink.js';
import { glass2, water2, flame2, smoke2 } from './chemfx.js';
import { textSprite } from './microworld.js';
import { Particles } from './fx.js';
import { canvasTex, textPlate } from './props.js';

export const NA = Object.freeze({ molar: 22.99, density: 970, melt: 97.79, mass: 0.04, stock: 0.30,
  // g, J/g/K, J/g。速率、局部有效热容、散热系数是教学近似，不是实测拟合。
  heat: 184000 / 22.99, cp: 1.23, fusion: 113, recession: 0.000105, retain: 0.15, cooling: 0.000030 });
export const radius = (g) => Math.cbrt(Math.max(0, g) / 1000 / NA.density * 3 / (4 * Math.PI));
export function sodiumRate(g, temp = 22) {
  const r = radius(g);
  return 1000 * NA.density * 4 * Math.PI * r * r * NA.recession * (1 + Math.min(0.5, Math.max(0, temp - 98) / 500));
}
// 焓状态：先升温，到熔点消耗熔化潜热，再继续升温。所有能量按初始钠质量计。
export function sodiumThermal(q, g) {
  const sensible = g * NA.cp * (NA.melt - 22), latent = g * NA.fusion;
  return { temp: q < sensible ? 22 + q / (g * NA.cp) : q < sensible + latent ? NA.melt : NA.melt + (q - sensible - latent) / (g * NA.cp), melt: THREE.MathUtils.clamp((q - sensible) / latent, 0, 1) };
}
export function pickBox(g, w, h, d, x = 0, y = 0, z = 0) {
  const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
  p.position.set(x, y, z); p.userData.pick = true; g.add(p); return p;
}
export function tweezers() {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const b = inked(new THREE.Mesh(new THREE.BoxGeometry(0.071, 0.0014, 0.002), paint(0x9aa1ab)), { width: 0.7 });
    b.position.set(0.035, 0, s * 0.003); b.rotation.y = s * 0.06; g.add(b);
    const tip = inked(new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.0015, 0.002), paint(0xaab1bb)), { width: 0.5 });
    tip.position.set(-0.004, 0, s * 0.0014); g.add(tip);
  }
  g.pick = pickBox(g, 0.082, 0.018, 0.023, 0.03); return g;
}

/**
 * 跟手（钠与水、钾与水、钠燃烧三课的镊子、小刀、瓶子共用）：器材落在光标射线碰到的第一个面上——桌面、杯口、瓶口、侧面，
 * 所以它总在光标底下，碰到哪儿就在哪儿；不自己沿路线走。
 *   const R = reach(group);
 *   R.hit(R.ray(p), solids, { floor, clr })  → { p, s, top } 第一个碰到的面（已经让开 clr）；solids：[{ c: 底面中心, r, h, id }] 竖直圆柱
 *   R.move(o, T, a, cups)   每帧跟过去：往上时先抬、往下时先平移；cups 里的容器 [{ c, r, h }]：在里面要先竖直提出来，进去要先到口上方
 *   R.aim(T, y, grab)       给 qa 的真鼠标算落点：光标该指的平面点（器材平面 y），让器材尖正好落在 T
 */
export function reach(group) {
  const V3 = THREE.Vector3;
  const cam = () => { const c = window.__lb?.stage?.camera; if (!c) return null; group.updateMatrixWorld(true); return group.worldToLocal(c.position.clone()); };
  const ray = (p) => { const o = cam() || p.clone().add(new V3(0, 0.4, 0.8)); return { o, d: p.clone().sub(o).normalize() }; };
  const xz = (a, c) => Math.hypot(a.x - c.x, a.z - c.z);
  function hit(r, solids = [], { floor = 0, clr = 0 } = {}) {
    let best = null;
    const take = (t, s, top) => { if (t > 1e-4 && (!best || t < best.t)) best = { t, s, top, p: r.o.clone().addScaledVector(r.d, t) }; };
    if (r.d.y < -1e-6) take((floor + clr - r.o.y) / r.d.y, null, true);
    for (const s of solids) {
      const R = s.r + clr, top = s.c.y + s.h + clr;
      if (r.d.y < -1e-6) { const t = (top - r.o.y) / r.d.y, x = r.o.x + r.d.x * t - s.c.x, z = r.o.z + r.d.z * t - s.c.z; if (x * x + z * z <= R * R) take(t, s, true); }
      const ox = r.o.x - s.c.x, oz = r.o.z - s.c.z, a = r.d.x * r.d.x + r.d.z * r.d.z, b = ox * r.d.x + oz * r.d.z, c = ox * ox + oz * oz - R * R, D = b * b - a * c;
      if (a > 1e-9 && D > 0) { const t = (-b - Math.sqrt(D)) / a, y = r.o.y + r.d.y * t; if (y >= s.c.y && y <= top) take(t, s, false); }
    }
    return best;
  }
  const inside = (o, k) => xz(o, k.c) < k.r && o.y < k.c.y + k.h;
  function move(o, T, a, cups = []) {
    const p = o.position;
    let goal = T;
    for (const k of cups) {
      const top = k.c.y + k.h + 0.006;
      if (inside(p, k) && xz(T, k.c) > k.r * 0.8 && p.y < top - 0.001) { goal = new V3(p.x, top, p.z); break; }          // 在容器里：先竖直提出来
      if (inside(T, k) && xz(p, k.c) > k.r * 0.8) { goal = new V3(T.x, Math.max(p.y, top), T.z); break; }          // 要伸进去：先到口上方
    }
    const up = goal.y > p.y + 0.002, b = a * 0.55;
    p.x += (goal.x - p.x) * (up ? b : a); p.z += (goal.z - p.z) * (up ? b : a); p.y += (goal.y - p.y) * (up ? a : b);
  }
  function aim(T, y, grab = new V3()) {
    const o = cam(); if (!o) return T.clone().sub(grab);
    const d = T.clone().sub(o), t = (y - o.y) / d.y;
    return o.clone().addScaledVector(d, t).sub(grab);
  }
  return { ray, hit, move, aim, inside, xz };
}
export function sodiumKnife() {
  const g = new THREE.Group();
  const blade = inked(new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.001, 0.012), paint(0xbfc7cf)), { width: 0.7 }); blade.position.x = -0.016;
  const grip = inked(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.006, 0.009), paint(0x626773)), { width: 0.7 }); grip.position.x = 0.02;
  g.add(blade, grip); g.pick = pickBox(g, 0.075, 0.02, 0.025); return g;
}
export function storageBottle({ label = '煤油 · 钠', oil = true, r = 0.023, h = 0.069 } = {}) {
  const g = new THREE.Group();
  const pts = [[0.0001, 0.001], [r, 0.001], [r, h * 0.72], [r * 0.67, h * 0.85], [r * 0.67, h]].map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 36), glass2({ base: 0.06, rim: 0.3 })); body.renderOrder = 9; glassEdge(body, 0.0005); g.add(body);
  const liq = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, h * 0.53, 28), oil ? paint(0xe7cf83, { keep: true, transparent: true, opacity: 0.3, depthWrite: false }) : water2({ color: 0xd7e8ef }));
  liq.position.y = h * 0.27 + 0.001; liq.renderOrder = 7; g.add(liq);
  const lab = textPlate(label, { w: r * 1.9, h: 0.012, bg: '#fffcf2', font: 'bold 100px "Songti SC", serif' }); lab.position.set(0, h * 0.3, r + 0.001); g.add(lab);
  const cap = inked(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.74, r * 0.74, 0.008, 24), paint(0xe5e0d3)), { width: 0.6 }); cap.position.y = h + 0.004; g.add(cap);
  g.cap = cap; g.liq = liq; g.pick = pickBox(g, r * 2.1, h, r * 2.1, 0, h / 2); return g;
}

// 现有微观引擎只登记了 Na⁺：借它的球（颜色 #9b6fe0、半径 0.52 Å），
// 中性钠只更换文字标签，绝不换原子颜色和大小。生成物仍使用原有 Na⁺ / OH⁻ / H₂。
export function sodiumScene() {
  const rx = { in: ['Na+', 'Na+', 'H2O', 'H2O'], out: ['Na+', 'Na+', 'OH-', 'OH-', 'H2'], host: 0,
    near: [null, [2, 0, 0], [0, 1.8, 0], [2, 1.8, 0]],
    place: [[-2, -1, 0], [2, -1, 0], [-2, 0.8, 0], [2, 0.8, 0], [0, 3, 0]],
    map: [[0, 0], [1, 0], [2, 0], [2, 1], [3, 0], [3, 1], [2, 2], [3, 2]],
    after: [{}, {}, {}, {}, { gas: true, leave: true, v: [0, 2, 0] }], approach: 1, dur: 3.5 };
  let age = 0, reactants = [], electrons = [], started = false, finished = false;
  return {
    labels: 'always', dim: 0.8,
    init(c) {
      age = 0; started = false; finished = false; reactants = []; electrons = [];
      c.view.film = 3; c.view.liquid = 0xb9dfe9;
      for (const x of [-2.4, 2.4]) {
        const m = c.add('Na+', c.V([x, 3.5, 0]), { fixed: true, sodiumMetal: true });
        m.label.material.map.dispose(); m.label.material.map = canvasTex(256, 96, (g) => { g.fillStyle = '#6d45b8'; g.font = '600 54px Times New Roman'; g.textAlign = 'center'; g.fillText('Na', 128, 62); });
        const e = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ color: 0x46505a })); e.position.set(0, 0.9, 0); m.g.add(e); electrons.push(e); reactants.push(m);
      }
      for (const x of [-2.4, 2.4]) { const w = c.add('H2O', c.V([x, 1.1, 0]), { fixed: true }); w.g.rotation.set(0, 0, 0); reactants.push(w); }
    },
    step(c, st, dt) {
      if (!st?.reacted) { c.view.liquid = 0xb9dfe9; return; }          // 钠还没放进水里：不演反应
      age += dt;
      if (!started) {
        electrons.forEach((e, i) => { e.position.copy(c.V([0, 0.9, 0]).lerp(reactants[i + 2].g.position.clone().sub(reactants[i].g.position), Math.min(1, age / 2.5))); });
        if (age > 2.5) {
          started = true;
          for (const e of electrons) { e.parent.remove(e); e.geometry.dispose(); e.material.dispose(); }
          c.start(rx, reactants, { then: () => { finished = true; } });
        }
      }
      c.view.liquid = finished && st.ph ? 0xe75a91 : 0xb9dfe9;          // 没滴酚酞就看不出颜色
    },
    text(c, st) {
      if (!st?.reacted) return { eq: '', on: false, cap: '水里还没有钠。先把钠放进水里，再钻进去看。' };
      return { eq: '2Na + 2H₂O → 2Na⁺ + 2OH⁻ + H₂↑', on: true,
        cap: !started ? '每个钠原子交出最外层的 1 个电子 → 水中的氢得到电子。<b>Na：0 → +1；H：+1 → 0</b>。小深色点表示电子。'
          : !finished ? '钠变成 Na⁺ 进入水中；水分子的 O–H 键重排，留下 OH⁻，两个氢结合成 H₂。<b>原子的种类、个数都没变</b>。'
            : `H₂ 冒走；Na⁺、OH⁻ 留在水中。${st.ph ? 'OH⁻ 增多，酚酞变红。' : 'OH⁻ 增多，溶液显碱性（没滴酚酞，所以看不出颜色）。'}<b>慢放示意：分步看电子转移与原子重排，不表示基元反应机理。</b>` };
    },
  };
}

// ================= 碱金属投进滴了酚酞的水里：一个烧杯一套（钠、钾共用，常数不同）=================
// 常数：钠见 NA；钾（课本第 101 页表 4-2：密度 0.86 g/cm³、熔点 63.65 ℃）。反应热 2K + 2H₂O → 2KOH + H₂ 约 −196 kJ/mol K（钠约 −184）。
// 钾的表面退缩速度按钠的 3 倍取（教学近似：钾比钠剧烈得多，绿豆大的一块一两秒内就着火）。
export const KM = Object.freeze({ molar: 39.10, density: 860, melt: 63.65, mass: 0.035, heat: 196500 / 39.10, cp: 0.757, fusion: 59.6, recession: 0.000315, retain: 0.2, cooling: 0.000030, ignite: 420 });
export const NAM = Object.freeze({ ...NA, mass: 0.04, ignite: 560 });
const rOf = (M, g) => Math.cbrt(Math.max(0, g) / 1000 / M.density * 3 / (4 * Math.PI));
const thermalOf = (M, q, g) => { const sensible = g * M.cp * (M.melt - 22), latent = g * M.fusion; return { temp: q < sensible ? 22 + q / (g * M.cp) : q < sensible + latent ? M.melt : M.melt + (q - sensible - latent) / (g * M.cp), melt: THREE.MathUtils.clamp((q - sensible) / latent, 0, 1) }; };
/**
 * metalWater(group, { at, metal: NAM | KM, flame: { core, mid, edge, w, h }, R, H, level })
 *   .drop(g)：投进 g 克；.step(dt, t)：每帧；.s：状态（left、total、seen{float,melt,move,hiss,red,fire}、temp、burning…）；.reset()
 *   .onSee(key)：第一次看到某个现象时回调（课程写观察表）
 */
export function metalWater(group, { at, metal, flame: fc = {}, R = 0.032, H = 0.085, VOL = 150, ph = true, onSee = () => {} }) {
  const LEVEL = VOL * 1e-6 / (Math.PI * (R - 0.0012) ** 2);
  const g = new THREE.Group(); g.position.copy(at); group.add(g);
  const pts = [new THREE.Vector2(0.0003, 0), new THREE.Vector2(R - 0.002, 0), new THREE.Vector2(R, 0.003), new THREE.Vector2(R, H - 0.002), new THREE.Vector2(R + 0.0018, H)];
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), glass2({ base: 0.05, rim: 0.42, band: 0.55 })); body.renderOrder = 9; g.add(body);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.0012, R - 0.0012, LEVEL, 40), water2({ color: 0xc3dce4 })); water.position.y = LEVEL / 2 + 0.0006; water.renderOrder = 7; g.add(water);
  // 酚酞遇 OH⁻ 变红：从钠（钾）经过的地方往下、往四周散（和钠与水那课同样的着色层）
  const field = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.0015, R - 0.0015, LEVEL - 0.002, 48, 32), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uSrc: { value: Array.from({ length: 40 }, () => new THREE.Vector4(0, 0, -100, 0)) }, uTime: { value: 0 }, uPh: { value: ph ? 1 : 0 } },
    vertexShader: 'varying vec3 p; void main(){p=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec3 p; uniform vec4 uSrc[40]; uniform float uTime,uPh;
      void main(){float c=0.; for(int i=0;i<40;i++){vec4 s=uSrc[i];float a=uTime-s.z;
        if(s.w>0. && a>0.) {float spread=0.000008 + a*0.000018;
          vec3 d=vec3(p.x-s.x,p.y-(0.5*${LEVEL.toFixed(6)}-0.001)+min(a*0.003,${(LEVEL * 0.75).toFixed(6)}),p.z-s.y);
          c+=s.w*(exp(-dot(d,d)/(2.*spread))/pow(1.+a*0.2,0.65) + 0.24*(1.-exp(-a/15.)));}}
        float k=(1.-exp(-c*5.))*uPh;gl_FragColor=vec4(0.91,0.08,0.37,clamp(k*0.77,0.,0.77)); }`,
  })); field.position.y = LEVEL / 2 + 0.001; field.renderOrder = 10; field.visible = false; g.add(field);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), new THREE.MeshStandardMaterial({ color: 0xe3eaf4, metalness: 0.68, roughness: 0.16, emissive: 0x9fa9b9, emissiveIntensity: 0.12 })); ball.renderOrder = 11; ball.visible = false; g.add(ball);
  const sph = ball.geometry.attributes.position.clone(), cub = ball.geometry.attributes.position;
  for (let i = 0; i < cub.count; i++) { const p = new THREE.Vector3(cub.getX(i), cub.getY(i), cub.getZ(i)); p.multiplyScalar(0.82 / Math.max(Math.abs(p.x), Math.abs(p.y), Math.abs(p.z))); cub.setXYZ(i, p.x, p.y, p.z); }
  ball.geometry.morphAttributes.position = [sph]; ball.updateMorphTargets();
  const fl = flame2({ w: fc.w ?? 0.024, h: fc.h ?? 0.06, core: fc.core ?? 0xfff8cc, mid: fc.mid ?? 0xffd43b, edge: fc.edge ?? 0xff8b23, glowK: 0.32 }); fl.setOn(false); g.add(fl);
  const bubs = new Particles({ max: 140, geometry: new THREE.SphereGeometry(1, 8, 6), material: glass2({ base: 0.04, rim: 0.9, band: 0 }) }); bubs.mesh.renderOrder = 12; g.add(bubs.mesh);
  const sm = smoke2({ max: 90, opacity: 0.5 }); sm.mesh.renderOrder = 13; g.add(sm.mesh);          // 着火时冒的白烟（课本图 4-9）
  const EXAG = 3;          // 钠（钾）的直径放大 3 倍（示意）
  const fresh = () => ({ left: 0, total: 0, clock: 0, reaction: false, energy: 0, temp: 22, melt: 0, gas: 0, flux: 0, x: -0.01, z: 0.006, vx: 0.01, vz: 0.008, path: 0, bubAcc: 0, srcAcc: 0, sources: [], seen: {}, burning: 0, finished: false });
  let s = fresh();
  const see = (k) => { if (s.seen[k]) return; s.seen[k] = true; onSee(k); };
  const api = {
    get s() { return s; }, set s(v) { s = v; }, LEVEL, R, H, group: g, fresh,
    reset() { s = fresh(); api.clearFx(); field.visible = false; ball.visible = false; fl.setOn(false); },
    clearFx() { bubs.clear(); sm.clear(); },          // 只清掉飘着的气泡和烟（状态不动）：演示结束换回学生的状态时用
    drop(mass, x = -0.01, z = 0.006) { s.left = s.total = mass; s.reaction = true; s.clock = 0; s.x = x; s.z = z; see('float'); },
    step(dt, t) {
      const M = metal, n = Math.max(1, Math.ceil(dt / 0.012));
      for (let i = 0; i < n; i++) {
        const h = dt / n;
        if (s.total > 0) s.clock += h;
        if (!s.reaction) continue;
        const r = rOf(M, s.left);
        let dm = Math.min(s.left, 1000 * M.density * 4 * Math.PI * r * r * M.recession * (1 + Math.min(0.5, Math.max(0, s.temp - M.melt) / 500)) * h);
        if (s.left - dm < 0.00001) dm = s.left;
        s.flux = dm / h; s.left = Math.max(0, s.left - dm); s.gas += dm / M.molar / 2 * 24500;
        s.energy = Math.max(0, s.energy + dm * M.heat * M.retain - M.cooling / Math.max(r, 0.0005) * (s.temp - 22) * h);
        const th = thermalOf(M, s.energy, s.total); s.temp = th.temp; s.melt = Math.max(s.melt, th.melt);
        const h2 = s.flux / M.molar / 2 * 24500, force = h2 * 0.03, a = Math.sin(s.clock * 2.3) * 2.3 + s.clock * 0.75;
        s.vx += (Math.cos(a) * force - s.vx * 1.6) * h; s.vz += (Math.sin(a) * force - s.vz * 1.6) * h;
        s.x += s.vx * h; s.z += s.vz * h; s.path += Math.hypot(s.vx, s.vz) * h;
        const lim = R - Math.max(0.004, rOf(M, s.left) * EXAG) - 0.002, rr = Math.hypot(s.x, s.z);
        if (rr > lim) { const nx = s.x / rr, nz = s.z / rr, dot = s.vx * nx + s.vz * nz; s.x = nx * lim; s.z = nz * lim; s.vx -= 1.8 * dot * nx; s.vz -= 1.8 * dot * nz; }
        s.srcAcc += dm;
        if (s.srcAcc > 0.001 || s.left === 0) { s.sources.push([s.x, s.z, s.clock, s.srcAcc / 0.04]); s.srcAcc = 0; if (s.sources.length > 40) { const o = s.sources.shift(); s.sources[0][3] += o[3]; } }
        s.bubAcc += h2 * h * 7;
        while (s.bubAcc > 1) { s.bubAcc--; bubs.spawn({ p: new THREE.Vector3(s.x + (Math.random() - 0.5) * 0.008, LEVEL + 0.0008, s.z), v: new THREE.Vector3(-s.vx * 0.4, 0.025 + h2 * 0.001, -s.vz * 0.4), size: 0.0006 + Math.min(0.0015, h2 * 0.00015), life: 0.6 }); }
        if (s.melt > 0.9) see('melt'); if (s.path > 0.012) see('move'); if (s.gas > 0.15) see('hiss'); if (ph && s.sources.length > 1 && s.clock > 1.2) see('red');
        if (s.temp >= M.ignite && s.left > 0) { s.burning = Math.min(1, s.burning + h * 4); see('fire'); } else s.burning = Math.max(0, s.burning - h * 2);
        if (s.left < 0.00001) { s.left = 0; s.reaction = false; s.finished = true; s.flux = 0; see('done'); }
      }
      const eff = rOf(metal, s.left) * EXAG;
      ball.visible = s.left > 0; ball.position.set(s.x, LEVEL - eff * 0.78, s.z);
      ball.scale.set(eff * (1.2 - s.melt * 0.2), eff * (0.72 + s.melt * 0.28), eff); ball.morphTargetInfluences[0] = s.melt;
      fl.position.copy(ball.position).add(new THREE.Vector3(0, eff, 0)); fl.setOn(s.burning > 0.05); fl.setSize(Math.max(0.3, s.burning)); fl.update(t);
      for (const [i, u] of field.material.uniforms.uSrc.value.entries()) u.set(...(s.sources[i] || [0, 0, -100, 0]));
      field.material.uniforms.uTime.value = s.clock; field.visible = s.sources.length > 0;
      bubs.update(dt, (p, d) => { p.p.addScaledVector(p.v, d); return p.p.y < LEVEL + 0.02; });
      sm.update(dt, { rate: s.burning > 0.05 ? 26 * s.burning : 0, origin: fl.position.clone().add(new THREE.Vector3(0, (fc.h ?? 0.06) * 0.7 * Math.max(0.3, s.burning), 0)), spread: 0.006, up: 0.04, size: 0.013, life: 2.6 });
    },
    dispose() { bubs.dispose(); sm.dispose(); field.material.dispose(); },
  };
  return api;
}

// ================= 钻进去看：钠、钾原子的结构（课本第 99 页的表）=================
// 钠 +11（2 8 1），原子半径 0.186 nm；钾 +19（2 8 8 1），0.227 nm。画成原子结构示意图那样：电子层是圆，电子是小点；
// 最外层的圆按原子半径等比例画（1 nm 画成 12 Å 长），里面几层等间距。最外层那 1 个电子是金色。
// 投进水里以后（st.na / st.k：这种金属已经投进去了），水分子靠过来，最外层电子交给水里的氢，原子变成离子（+1 价）；
// 得到电子的水分子变成 OH⁻ 和一个 H，H 往上走（两个 H 结合成 H₂ 逸出）——每一边电荷都守恒：M → M⁺，H₂O + e⁻ → OH⁻ + H。
// 钾的那个电子离核更远、受的引力更弱，交得更快（慢放示意，快慢只表示难易，不是真实时间）。
export function alkaliScene() {
  const AT = [
    { key: 'na', sym: 'Na', ion: 'Na⁺', z: 11, shells: [2, 8, 1], r: 0.186, x: -3.1, t: [2.6, 1.0] },          // t：水分子靠近用几秒、电子跳过去用几秒
    { key: 'k', sym: 'K', ion: 'K⁺', z: 19, shells: [2, 8, 8, 1], r: 0.227, x: 2.9, t: [0.9, 0.55] },
  ];
  const Y = 3.4, NM = 12, ANG = -0.7;
  const RXW = { in: ['H2O'], out: ['OH-', 'H'], host: 0, place: [[0, 0, 0], [0.5, 1.1, 0]], map: [[0, 0], [0, 1], [0, 2]], after: [{ fixed: true }, { gas: true, leave: true, v: [0, 1.4, 0] }], approach: 0, dur: 1.2 };
  let A = [];
  const ringMat = () => new THREE.MeshBasicMaterial({ color: 0x3d79c4, transparent: true, opacity: 0.9, depthWrite: false });
  const INK = '#4a3a8c', HALO = 'rgba(255,255,255,0.95)';          // 全息里的字：深色字、白边（和分子标签一样）
  const build = (c, a) => {
    const g = new THREE.Group(); g.position.set(a.x, Y, 0); c.layer.add(g);
    const R = a.r * NM, n = a.shells.length;
    const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), new THREE.MeshStandardMaterial({ color: 0xd8574b, roughness: 0.4, emissive: 0x5a1a14, emissiveIntensity: 0.4 })); g.add(nuc);
    const zLab = textSprite(`+${a.z}`, '#ffffff', 'rgba(60,10,10,0.9)'); zLab.scale.set(1.7, 0.64, 1); zLab.position.set(0, 0, 0.6); g.add(zLab);
    const rings = [], els = [];
    a.shells.forEach((cnt, i) => {
      const ri = R * (i + 1) / n;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(ri, 0.045, 6, 120), ringMat()); g.add(ring); rings.push(ring);
      for (let j = 0; j < cnt; j++) {
        const outer = i === n - 1;
        const e = new THREE.Mesh(new THREE.SphereGeometry(outer ? 0.21 : 0.14, 14, 10), new THREE.MeshBasicMaterial({ color: outer ? 0xf0a500 : 0x2f3a48 }));
        e.userData = { ri, a0: (j / cnt) * Math.PI * 2 + i * 0.5, w: 0.5 / (i + 1), outer }; g.add(e); els.push(e);
      }
    });
    const sym = textSprite(a.sym, INK, HALO); sym.scale.set(2.2, 0.82, 1); sym.position.set(0, R + 0.8, 0); g.add(sym);
    const size = textSprite(`${a.r.toFixed(3)} nm`, '#2f4f6f', HALO); size.scale.set(2.6, 0.98, 1); size.position.set(0, -R - 0.8, 0); g.add(size);          // 原子半径：变成离子以后撤掉（那不是离子半径）
    const outerE = els.find((e) => e.userData.outer);
    return { a, g, R, rings, els, outerE, sym, size, water: null, k: 0, phase: 'atom' };
  };
  const setSym = (A1, text) => { const s = textSprite(text, INK, HALO); s.scale.copy(A1.sym.scale); s.position.copy(A1.sym.position); A1.g.remove(A1.sym); A1.sym.material.map.dispose(); A1.sym.material.dispose(); A1.g.add(s); A1.sym = s; };
  return {
    labels: 'always', dim: 1, solid: true,
    init(c, st) {
      c.view.film = 0.02; c.view.paper = null;
      A = AT.map((a) => build(c, a));
    },
    step(c, st, dt) {
      c.view.film = 0.02; c.view.paper = null;
      for (const X of A) {
        const on = !!st?.[X.a.key];
        for (const e of X.els) {
          const u = e.userData;
          if (u.outer && X.phase !== 'atom') continue;          // 正在跳过去，或者已经交出去了
          if (u.outer && on) { const d = Math.atan2(Math.sin(ANG - u.a0), Math.cos(ANG - u.a0)); u.a0 += d * Math.min(1, dt * 3); }          // 被水分子“拉”住：转到靠近水分子的那一边
          else u.a0 += u.w * dt;
          e.position.set(Math.cos(u.a0) * u.ri, Math.sin(u.a0) * u.ri, 0);
        }
        if (!on) continue;
        // 投进水里了：水分子从外面靠过来 → 最外层电子跳到水分子上 → 原子变成离子
        const [tIn, tHop] = X.a.t, far = X.R + 2.4, near = X.R + 0.75;
        const wpos = (d) => c.V([X.a.x + Math.cos(ANG) * d, Y + Math.sin(ANG) * d, 0.3]);
        if (!X.water) { X.water = c.add('H2O', wpos(far), { fixed: true }); X.water.g.rotation.set(0, 0, 0.6); X.k = 0; }
        X.k += dt;
        if (X.phase === 'atom') {
          X.water.g.position.copy(wpos(far + (near - far) * Math.min(1, X.k / tIn)));
          if (X.k >= tIn) { X.phase = 'hop'; X.k0 = X.k; X.from = X.outerE.position.clone(); }
        }
        if (X.phase === 'hop') {
          const q = Math.min(1, (X.k - X.k0) / tHop), to = X.water.g.position.clone().sub(X.g.position);
          X.outerE.position.copy(X.from).lerp(to, q * q * (3 - 2 * q));
          if (q >= 1) { X.phase = 'ion'; X.outerE.visible = false; X.size.visible = false; setSym(X, X.a.ion); c.start(RXW, [X.water]); }          // 电子到了水分子上：水分子变成 OH⁻ + H
        }
        if (X.phase === 'ion') { const ring = X.rings[X.rings.length - 1]; ring.material.opacity += (0.12 - ring.material.opacity) * Math.min(1, dt * 2); }
      }
    },
    text(c, st) {
      const eq = 'Na：<b>+11</b>　2 8 1　　　K：<b>+19</b>　2 8 8 1';
      const na = A[0]?.phase, k = A[1]?.phase, any = st?.na || st?.k;
      if (!any) return { eq, on: true, cap: '钠、钾原子的最外层都只有 <b>1 个电子</b>（金色）。钾比钠多一个电子层，原子半径更大：0.227 nm 对 0.186 nm（课本第 99 页的表）。把它们投进水里，再来看最外层的电子。' };
      const water = '电子交给水里的氢：H<sub>2</sub>O + e<sup>−</sup> → OH<sup>−</sup> + H，两个 H 结合成 H<sub>2</sub> 逸出。';
      if (na === 'ion' && k === 'ion') return { eq, on: true, cap: `两种原子都交出了最外层的 1 个电子，变成 Na⁺、K⁺：产物里都是 <b>+1 价</b>；${water}从钠到钾，电子层增多、原子半径增大，失去电子的能力增强。<b>慢放示意，快慢只表示难易。</b>` };
      if (st.na && !st.k && na === 'ion') return { eq, on: true, cap: `钠交出最外层的 1 个电子，变成 Na⁺；${water}再把钾投进水里比一比。` };
      if (st.k && !st.na && k === 'ion') return { eq, on: true, cap: `钾交出最外层的 1 个电子，变成 K⁺；${water}再把钠投进水里比一比。` };
      return { eq, on: true, cap: '水分子靠过来，最外层那 1 个电子交给水里的氢。钾的最外层电子<b>离核更远</b>，原子核对它的<b>引力更弱</b>，更容易失去。<b>慢放示意，快慢只表示难易。</b>' };
    },
  };
}

// ================= 钻进去看：钠在空气中燃烧（课本第 35 页）2Na + O₂ △══ Na₂O₂ =================
// 两个钠原子各交出最外层的 1 个电子给一个 O₂ 分子 → 2 个 Na⁺ 和 1 个过氧根 O₂²⁻（两个氧原子还连着，氧是 −1 价）——淡黄色的 Na₂O₂。
// 借 Na⁺ 的球画中性的钠（和 sodiumScene 一样只换标签）。st.burning：坩埚里的钠烧起来了没有。
export function sodiumBurnScene() {
  // 照初中红磷燃烧（airScene）、木炭还原氧化铜（cuoScene）的做法：
  // 坩埚里熔化的钠是金属——一个个钠原子紧挨着（4 × 2）；上面是空气（O₂、N₂）。燃烧时 O₂ 一个接一个落到钠表面：
  // 两个钠原子各交出 1 个电子（小深色点飞向 O₂）→ 钠原子变成 Na⁺、O₂ 变成过氧根 O₂²⁻（两个氧还连着）→ 三个离子靠拢、吸在一起，
  // 留在原地。反应几组跟着这一课算出来的燃烧进度走，从左往右推进：左边成了 Na₂O₂、右边还是钠，一眼看得出变化。
  // 同一种原子到哪儿都是一个颜色、一个大小（Na 和 Na⁺ 只是标签不同）；宏观的淡黄色只写在字幕里。
  const SP = 1.9, DZ = 3.2, Y0 = 0.6, NO2 = 3, NN2 = 5;
  const sites = [];
  for (let r = 0; r < 2; r++) for (let q = 0; q < 4; q++) sites.push({ q, r, p: new THREE.Vector3((q - 1.5) * SP, Y0, (r - 0.5) * DZ) });
  const pairs = [];
  for (let r = 0; r < 2; r++) for (const q of [0, 2]) pairs.push({ A: sites.find((s) => s.q === q && s.r === r), B: sites.find((s) => s.q === q + 1 && s.r === r) });
  pairs.sort((u, v) => (u.A.p.x * 10 - u.A.p.z) - (v.A.p.x * 10 - v.A.p.z));          // 从左往右（同一列先前面）
  const NEV = pairs.length;
  const spots = (P) => { const mid = P.A.p.clone().lerp(P.B.p, 0.5); return { mid, out: [P.A.p.clone().add(new THREE.Vector3(-0.3, 0.15, 0)), P.B.p.clone().add(new THREE.Vector3(0.3, 0.15, 0)), mid.clone().add(new THREE.Vector3(0, 0.85, 0))] }; };
  const atSite = (c, p) => c.mols.find((m) => m.kind === 'Nam' && !m.busy && (m.home || m.g.position).distanceTo(p) < 0.05);
  let made = 0, ev = null;
  const dots = [];
  const clearDots = () => { for (const d of dots) { d.parent?.remove(d); d.geometry.dispose(); d.material.dispose(); } dots.length = 0; };
  const convert = (c, P) => {          // 打开时已经烧了一部分：直接摆好生成的离子
    const { out } = spots(P), a = atSite(c, P.A.p), b = atSite(c, P.B.p); if (!a || !b) return null;
    c.remove(a); c.remove(b);
    return [c.add('Na+', out[0], { fixed: true }), c.add('Na+', out[1], { fixed: true }), c.add('O2 2-', out[2], { fixed: true })];
  };
  const markRep = (c, ps) => { if (!c.mols.some((m) => m.rep && m.kind === 'O2 2-')) ps.forEach((m) => { m.rep = true; }); };
  return {
    solid: true, still: true,
    labels: (k, m) => k === 'O2' || !!m.rep, labelOnly: (k, m) => k === 'O2' || !!m.rep,          // 只标空气里的 O₂、一个钠原子、第一组 Na⁺ 和 O₂²⁻
    init(c, st) {
      made = 0; ev = null; clearDots();
      c.view.film = 0; c.view.paper = null;
      for (const s of sites) c.add('Nam', s.p.clone(), { fixed: true });
      for (let i = 0; i < NO2; i++) c.add('O2', c.inGas(), { gas: true });
      for (let i = 0; i < NN2; i++) c.add('N2', c.inGas(), { gas: true });
      const n = Math.round((st?.x || 0) * NEV);
      for (let k = 0; k < n; k++) { const ps = convert(c, pairs[k]); if (ps) { made++; markRep(c, ps); } }
      const rep = c.mols.filter((m) => m.kind === 'Nam').sort((u, v) => (v.g.position.x - v.g.position.z) - (u.g.position.x - u.g.position.z))[0]; if (rep) rep.rep = true;          // 右前方那个钠原子标“Na”（最后才反应）
    },
    step(c, st, dt) {
      c.view.film = 0; c.view.paper = null;
      // 熔化、燃烧时钠原子在原地抖得厉害
      const jig = st?.burning ? 0.06 : st?.melt >= 1 ? 0.035 : 0.008;
      for (const m of c.mols) if (m.fixed && !m.busy && m.kind === 'Nam') { m.home = m.home || m.g.position.clone(); m.g.position.copy(m.home).add(c.V([c.rnd(-jig, jig), c.rnd(-jig, jig), c.rnd(-jig, jig)])); }
      // 空气从旁边补进来
      if (c.count('O2') < NO2 && Math.random() < dt * 1.5) { const a = c.rnd(0, 6.3); c.add('O2', c.V([Math.cos(a) * 5, c.rnd(2.5, 4.5), Math.sin(a) * 5]), { gas: true }); }
      const want = Math.round((st?.x || 0) * NEV);
      if (!ev && made < Math.max(want, st?.burning ? Math.min(NEV, made + 1) : 0)) {
        const P = pairs.find((Q) => atSite(c, Q.A.p) && atSite(c, Q.B.p));
        const o2 = P && c.free('O2').sort((u, v) => u.g.position.y - v.g.position.y)[0];
        if (P && o2) {
          const a = atSite(c, P.A.p), b = atSite(c, P.B.p); [a, b].forEach((m) => { if (m.home) m.g.position.copy(m.home); });
          const { mid, out } = spots(P);
          const e = c.start({ in: ['Nam', 'Nam', 'O2'], out: ['Na+', 'Na+', 'O2 2-'], host: -1, approach: 2.2, dur: 1.8, burst: [0xffd27a],
            atAbs: () => mid.clone().add(c.V([0, 0.85, 0])), nearAbs: (ms, i) => (i === 2 ? mid.clone().add(c.V([0, 1.9, 0])) : null),
            placeAbs: () => out, after: [{ fixed: true }, { fixed: true }, { fixed: true }] }, [a, b, o2],
          { then: (ps) => { made++; ev = null; clearDots(); markRep(c, ps); c.burst(out[2].clone(), 0xfff0b0); } });
          if (e) {
            ev = { e, from: [a.g.position.clone().add(c.V([0, 0.5, 0])), b.g.position.clone().add(c.V([0, 0.5, 0]))], o2 };
            for (let i = 0; i < 2; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshBasicMaterial({ color: 0x2a2f38 })); d.visible = false; c.layer.add(d); dots.push(d); }
          }
        }
      }
      // 电子：O₂ 快落到钠表面时，两个钠原子各交出 1 个电子，飞到 O₂ 上
      if (ev && dots.length) {
        const { e, from, o2 } = ev, k = e.t / e.A;
        dots.forEach((d, i) => { d.visible = k > 0.45 && k < 1; const u = Math.min(1, Math.max(0, (k - 0.45) / 0.5)); d.position.copy(from[i]).lerp(o2.g.position.clone().add(c.V([i ? 0.5 : -0.5, 0, 0])), u * u * (3 - 2 * u)); });
      }
    },
    text(c, st) {
      const eq = '2Na + O<sub>2</sub> <span class="arr" style="position:relative">══<span style="position:absolute;left:0;right:0;top:-0.75em;font-size:0.45em;text-align:center">△</span></span> Na<sub>2</sub>O<sub>2</sub>';
      const e = ev?.e, k = e ? e.t / e.A : 0;
      const cap = !st?.burning && !made ? (st?.melt >= 1 ? '钠熔化了：钠原子抖得厉害，但还没烧起来。上面是空气——O₂ 和 N₂。' : '坩埚里是金属钠：一个个<b>钠原子</b>紧挨着。上面是空气——O₂ 和 N₂。钠燃烧以后，看氧分子落下来会怎样。')
        : e && k < 0.45 ? '一个 O₂ 落向钠的表面……'
          : e && k < 1 ? '两个钠原子各交出<b>最外层的 1 个电子</b>（小深色点），交给这个 O₂。<b>Na：0 → +1</b>，被氧化。'
            : e ? '钠原子成了 <b>Na⁺</b>，O₂ 得到 2 个电子成了<b>过氧根 O₂²⁻</b>（两个氧还连着，氧是 −1 价）——正负电荷相吸，<b>三个离子靠拢、结合在一起</b>。'
              : made >= NEV || (!st?.burning && made) ? `钠表面已经有 <b>${made}</b> 组 Na⁺ 和 O₂²⁻ 按 2∶1 结合在一起——这就是坩埚里的<b>淡黄色固体 Na₂O₂</b>。（常温下钠表面生成的是 Na₂O，里面是 O²⁻。）<b>慢放示意，不表示真实的反应步骤。</b>`
                : `已经有 <b>${made}</b> 组 Na⁺ 和 O₂²⁻ 结合在一起（左边），右边还是钠原子。`;
      return { eq, on: !!(st?.burning || made), cap };
    },
  };
}

// ================= 钻进去看：过氧化钠与水（课本第 37 页）2Na₂O₂ + 2H₂O ══ 4NaOH + O₂↑ =================
// 还没加水（st.water 为假）：只有 Na⁺ 和过氧根 O₂²⁻（固体，没有液体层）。加了水：两个 O₂²⁻ 和两个 H₂O 一起反应，
// 生成 4 个 OH⁻（溶液显碱性）和 1 个 O₂（冒出去）。过氧根里的 4 个氧：2 个进了 O₂，2 个进了 OH⁻；水里的 2 个氧也进了 OH⁻。Na⁺ 不变。
// 加了水就演一遍（反应完了再打开也演一遍：看发生了什么）。慢放示意，不表示真实的反应步骤（实际要经过 H₂O₂）。
export function peroxideScene() {
  const FILM = 6.2;
  const rx = { in: ['O2 2-', 'O2 2-', 'H2O', 'H2O'], out: ['OH-', 'OH-', 'OH-', 'OH-', 'O2'], host: 0,
    near: [null, [2.4, 0, 0], [-0.3, 1.5, 0.4], [2.7, 1.5, -0.4]], place: [[-1.4, -0.5, 0.5], [-0.4, 0.6, -0.6], [2.6, -0.5, 0.5], [3.4, 0.6, -0.6], [1.2, 2.2, 0]],
    map: [[0, 0], [2, 1], [2, 0], [2, 2], [1, 0], [3, 1], [3, 0], [3, 2], [0, 1], [1, 1]],
    after: [{}, {}, {}, {}, { gas: true, leave: true, v: [0, 2.2, 0] }], approach: 1.2, dur: 2.4, burst: [0x9fd0ff, 0xffffff] };
  let wet = false, made = 0;
  return {
    labels: (k) => k !== 'H2O', dim: 0.6,
    init(c, st) {
      wet = !!st?.water; made = 0;
      c.view.film = wet ? FILM : 0.02; c.view.paper = wet ? null : 0xf2e2a2; c.view.liquid = 0xb9dfe9;
      for (let i = 0; i < 4; i++) c.add('Na+', wet ? c.inLiquid() : c.V([-2.4 + i * 1.6, 1.2, i % 2 ? 0.8 : -0.8]), { fixed: !wet });
      for (let i = 0; i < 2; i++) { const m = c.add('O2 2-', wet ? c.inLiquid() : c.V([-1.6 + i * 3.2, 1.4, 0]), { fixed: !wet }); if (!wet) m.g.rotation.set(0, i, 0); }
      if (wet) for (let i = 0; i < 5; i++) c.add('H2O', c.inLiquid());
    },
    step(c, st) {
      if (!wet) return;
      c.view.film = FILM; c.view.paper = null;
      if (!c.events.length && c.free('O2 2-').length >= 2 && c.free('H2O').length >= 2) {
        const [a, b] = c.free('O2 2-'), w = c.free('H2O').sort((p, q) => p.g.position.distanceTo(a.g.position) - q.g.position.distanceTo(a.g.position));
        c.start(rx, [a, b, w[0], w[1]], { then: () => { made++; } });
      }
    },
    text(c, st) {
      const eq = '2O<sub>2</sub><sup>2−</sup> + 2H<sub>2</sub>O ══ 4OH<sup>−</sup> + O<sub>2</sub>↑';
      if (!wet) return { eq: '', on: false, cap: '还没加水：过氧化钠是淡黄色固体，由 Na⁺ 和过氧根 O₂²⁻（两个氧原子连在一起）构成。' };
      if (c.events.length) return { eq, on: true, cap: '过氧根和水分子反应：过氧根里的氧，一部分变成 <b>O₂</b> 冒出去（气泡），一部分和水里的氢、氧一起变成 <b>OH⁻</b>。' };
      if (made) return { eq, on: true, cap: '生成了 OH⁻（溶液显碱性）和 O₂（能使带火星的木条复燃）；Na⁺ 一直没变。<b>慢放示意，不表示真实的反应步骤。</b>' };
      return { eq, on: true, cap: '水来了：过氧根就要和水分子反应。' };
    },
  };
}
