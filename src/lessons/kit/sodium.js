// 高中化学的新器材与钠-水教学模型。只供 nawater 使用，不改初中活页的公共件。
import * as THREE from 'three';
import { paint, inked, glassEdge } from '../../live/ink.js';
import { glass2, water2, flame2, smoke2 } from './chemfx.js';
import { textSprite } from './microworld.js';
import { spread, homeTo } from './microlayout.js';
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

// 钠与水（nawater）：水面上两组，每组 2 个钠原子（Nam：和 Na⁺ 同一个球，只是还没交出电子）+ 2 个水分子。
// 一组反应：两个钠原子各把最外层的 1 个电子（小深色点）交给一个水分子里的一个氢 → 2Na⁺ + 2OH⁻，两个得到电子的氢结合成 H₂ 冒走。
// 电子飞向的正是之后组成 H₂ 的那两个氢（和 rx.map 对上）。
// 跟着实验走：st.x = 已经反应掉的钠 ÷ 投进去的钠。钠一放进水里演第一组，反应过半演第二组；
// 打开时从刚放进水里那一刻演起，最多演到现在的进度（反应完以后再打开，就是从头重看一遍）。
export function sodiumScene() {
  const GX = [-2.6, 2.6], DX = 1.3, YNA = 3.6, YW = 1.2;
  const rxOf = (g) => {
    const cx = GX[g];
    return { in: ['Nam', 'Nam', 'H2O', 'H2O'], out: ['Na+', 'Na+', 'OH-', 'OH-', 'H2'], host: -1, approach: 0.6, dur: 3,
      atAbs: () => c0.V([cx, 2.4, 0]), nearAbs: () => null,
      placeAbs: () => [c0.V([cx - DX - 0.2, 2.6, 0]), c0.V([cx + DX + 0.2, 2.6, 0]), c0.V([cx - DX - 0.3, 0.6, 0]), c0.V([cx + DX - 0.3, 0.6, 0]), c0.V([cx, 4.4, 0])],          // Na⁺ 进到水里（液层 0~3），OH⁻ 在下面
      // H₂ 的两个氢：第一个水分子右边的 H、第二个水分子左边的 H（电子飞去的就是这两个）
      map: [[0, 0], [1, 0], [2, 0], [2, 1], [3, 0], [3, 2], [2, 2], [3, 1]],
      after: [{ fixed: true }, { fixed: true }, { fixed: true }, { fixed: true }, { gas: true, leave: true, v: [0, 2, 0] }] };
  };
  const HIDX = [2, 1];          // 每组第 i 个水分子里接电子的那个氢
  let c0 = null, groups = [], made = 0, played = 0, cur = null;
  const dots = [];
  const clearDots = () => { for (const d of dots) { d.parent?.remove(d); d.geometry.dispose(); d.material.dispose(); } dots.length = 0; };
  const wantOf = (st) => (!st?.reacted ? 0 : st.x < 0.5 ? 1 : 2);
  return {
    dim: 0.8,
    labels: (k, m) => !!m.rep, labelOnly: (k, m) => !!m.rep,          // 只标一组代表：一个 Na、一个 H₂O；反应后一个 Na⁺、一个 OH⁻ 和冒走的 H₂
    init(c) {
      c0 = c; made = 0; played = 0; cur = null; clearDots(); groups = [];
      c.view.film = 3; c.view.liquid = 0xb9dfe9;
      GX.forEach((cx, g) => {
        const na = [-1, 1].map((s) => { const m = c.add('Nam', c.V([cx + s * DX, YNA, 0]), { fixed: true }); m.g.rotation.set(0, 0, 0); return m; });
        const w = [-1, 1].map((s) => { const m = c.add('H2O', c.V([cx + s * DX, YW, 0]), { fixed: true }); m.g.rotation.set(0, 0, 0); return m; });
        if (g === 0) { na[0].rep = true; w[0].rep = true; }
        groups.push({ na, w });
      });
    },
    step(c, st, dt) {
      c.view.liquid = made && st?.ph ? 0xe75a91 : 0xb9dfe9;          // 没滴酚酞就看不出颜色
      if (!cur && made < Math.min(groups.length, wantOf(st))) {
        const G = groups[made], slow = played === 0;          // 打开后的第一组慢一点，看清电子；从头重看时后面的快一点
        const from = G.na.map((m) => m.g.position.clone().add(c.V([0, 0.62, 0])));
        const to = G.w.map((w, i) => c.layer.worldToLocal(w.atoms[HIDX[i]].getWorldPosition(new THREE.Vector3())));
        for (let i = 0; i < 2; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ color: 0x2a2f38 })); d.position.copy(from[i]); c.layer.add(d); dots.push(d); }
        cur = { G, from, to, t: 0, T: slow ? 2.4 : 1.3, phase: 'e', idx: made };
      }
      if (cur?.phase === 'e') {
        cur.t += dt; const u = Math.min(1, cur.t / cur.T), q = u * u * (3 - 2 * u);
        dots.forEach((d, i) => d.position.copy(cur.from[i]).lerp(cur.to[i], q));
        if (u >= 1) {
          clearDots(); cur.phase = 'rx';
          const g = cur.idx, rx = rxOf(g);
          if (played > 0) { rx.dur = 2; rx.approach = 0.3; }
          c.start(rx, [...cur.G.na, ...cur.G.w], { then: (ps) => { if (g === 0) [ps[0], ps[3], ps[4]].forEach((m) => { m.rep = true; });          // 标左边的 Na⁺、右边的 OH⁻（标签不叠在一起）
           made++; played++; cur = null; } });
        }
      }
    },
    text(c, st) {
      const eq = '2Na + 2H<sub>2</sub>O → 2Na<sup>+</sup> + 2OH<sup>−</sup> + H<sub>2</sub>↑';
      if (!st?.reacted) return { eq: '', on: false, cap: '水里还没有钠：水面上是钠原子，下面是水分子。先把钠放进水里，再钻进去看。' };
      const tail = '<b>慢放示意：分步看电子转移与原子重排，不表示真实的反应步骤；粒子个数是示意。</b>';
      if (cur?.phase === 'e') return { eq, on: true, cap: `${cur.idx ? '第二组：' : ''}两个钠原子各交出最外层的 <b>1 个电子</b>（小深色点），交给水分子里的一个氢。<b>Na：0 → +1；H：+1 → 0</b>。${cur.idx ? '' : tail}` };
      if (cur?.phase === 'rx') return { eq, on: true, cap: '钠变成 <b>Na⁺</b> 进入水中；得到电子的两个氢<b>结合成 H₂</b> 冒走，水分子留下 <b>OH⁻</b>。原子的种类、个数都没变。' };
      if (made < groups.length) return { eq, on: true, cap: made ? `左边一组已经变成 Na⁺、OH⁻ 和 H₂；钠还在水面上反应，右边一组还没轮到。${tail}` : `钠放进水里了。${tail}` };
      return { eq, on: true, cap: `H₂ 冒走；Na⁺、OH⁻ 留在水中。${st.ph ? 'OH⁻ 增多，酚酞变红。' : 'OH⁻ 增多，溶液显碱性（没滴酚酞，所以看不出颜色）。'}${tail}` };
    },
  };
}

// ================= 碱金属投进滴了酚酞的水里：一个烧杯一套（钠、钾共用，常数不同）=================
// 常数：钠见 NA；钾（课本第 101 页表 4-2：密度 0.86 g/cm³、熔点 63.65 ℃）。反应热 2K + 2H₂O → 2KOH + H₂ 约 −196 kJ/mol K（钠约 −184）。
// 钾的表面退缩速度按钠的 3 倍取（教学近似：钾比钠剧烈得多，绿豆大的一块一两秒内就着火）。
export const KM = Object.freeze({ molar: 39.10, density: 860, melt: 63.65, mass: 0.035, heat: 196500 / 39.10, cp: 0.757, fusion: 59.6, recession: 0.000315, retain: 0.2, cooling: 0.000030, ignite: 420 });
export const NAM = Object.freeze({ ...NA, mass: 0.04, ignite: 560 });
const rOf = (M, g) => Math.cbrt(Math.max(0, g) / 1000 / M.density * 3 / (4 * Math.PI));
// 浮在水面：露出水面的高度占半高的几分之几。方块（棱柱）露出的高度比例 = 1 − ρ金属/ρ水；球冠体积 πh²(3r−h)/3 占球的 1 − ρ 时解出 h/r。
// 熔化中按形状在两者之间过渡（画面的钠球就是从方块变圆的）。
export function floatOut(rho, melt) {
  const v = Math.max(0, 1 - rho / 1000);
  let lo = 0, hi = 2; for (let i = 0; i < 30; i++) { const h = (lo + hi) / 2; if (h * h * (3 - h) / 4 < v) lo = h; else hi = h; }
  return (2 * v) * (1 - melt) + lo * melt;
}
const thermalOf = (M, q, g) => { const sensible = g * M.cp * (M.melt - 22), latent = g * M.fusion; return { temp: q < sensible ? 22 + q / (g * M.cp) : q < sensible + latent ? M.melt : M.melt + (q - sensible - latent) / (g * M.cp), melt: THREE.MathUtils.clamp((q - sensible) / latent, 0, 1) }; };
/**
 * metalWater(group, { at, metal: NAM | KM, flame: { core, mid, edge, w, h }, R, H, level })
 *   .drop(g, x, z, fall)：投进 g 克（从水面上方 fall 米处落下，落到水面才开始反应）；.step(dt, t)：每帧；
 *   .s：状态（left、total、seen{float,melt,move,hiss,red,fire}、temp、burning、flux…）；.reset()
 *   .onSee(key)：第一次看到某个现象时回调（课程写观察表）。嘶嘶声：画面上有“嘶 嘶 嘶”字牌，声音由课程按 s.flux 放。
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
  const hissMark = textPlate('嘶 嘶 嘶 〰', { w: 0.034, h: 0.0095, color: '#536471', bg: 'rgba(255,253,245,.85)' }); hissMark.renderOrder = 14; hissMark.visible = false; g.add(hissMark);
  const EXAG = 3;          // 钠（钾）的直径放大 3 倍（示意）
  const RED_G = 0.002, HISS_ML = 0.15;          // 反应掉 2 mg 以后红色看得出来、产气 0.15 mL 以后听得到嘶嘶声：画面和观察记录用同一个门槛
  const fresh = () => ({ fall: 0, vy: 0, left: 0, total: 0, clock: 0, reaction: false, energy: 0, temp: 22, melt: 0, gas: 0, flux: 0, x: -0.01, z: 0.006, vx: 0.01, vz: 0.008, path: 0, bubAcc: 0, srcAcc: 0, sources: [], seen: {}, burning: 0, finished: false });
  let s = fresh();
  const see = (k) => { if (s.seen[k]) return; s.seen[k] = true; onSee(k); };
  const api = {
    get s() { return s; }, set s(v) { s = v; }, LEVEL, R, H, group: g, fresh,
    reset() { s = fresh(); api.clearFx(); field.visible = false; ball.visible = false; fl.setOn(false); },
    clearFx() { bubs.clear(); sm.clear(); },          // 只清掉飘着的气泡和烟（状态不动）：演示结束换回学生的状态时用
    drop(mass, x = -0.01, z = 0.006, fall = 0) { s.left = s.total = mass; s.clock = 0; s.x = x; s.z = z; s.fall = fall; s.vy = 0; s.reaction = fall <= 0; if (s.reaction) see('float'); },
    step(dt, t) {
      const M = metal, n = Math.max(1, Math.ceil(dt / 0.012));
      for (let i = 0; i < n; i++) {
        const h = dt / n;
        if (s.total > 0) s.clock += h;
        if (s.fall > 0) { s.vy += 9.8 * h; s.fall = Math.max(0, s.fall - s.vy * h); if (s.fall === 0) { s.reaction = true; see('float'); } continue; }          // 从镊尖落下：碰到水面才开始反应
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
        if (s.melt > 0.9) see('melt'); if (s.path > 0.012) see('move'); if (s.gas > HISS_ML) see('hiss'); if (ph && s.total - s.left >= RED_G) see('red');
        if (s.temp >= M.ignite && s.left > 0) { s.burning = Math.min(1, s.burning + h * 4); see('fire'); } else s.burning = Math.max(0, s.burning - h * 2);
        if (s.left < 0.00001) { s.left = 0; s.reaction = false; s.finished = true; s.flux = 0; see('done'); }
      }
      const eff = rOf(metal, s.left) * EXAG, half = eff * (0.72 + s.melt * 0.28) * (0.82 + 0.18 * s.melt);          // 半高：方块的顶点在 0.82，球在 1
      ball.visible = s.left > 0; ball.position.set(s.x, LEVEL - half * (1 - floatOut(metal.density, s.melt)) + s.fall, s.z);          // 按密度浮着：顶面露出水面
      ball.scale.set(eff * (1.2 - s.melt * 0.2), eff * (0.72 + s.melt * 0.28), eff); ball.morphTargetInfluences[0] = s.melt;
      hissMark.visible = s.reaction && s.gas > HISS_ML; hissMark.position.set(s.x, LEVEL + 0.026, s.z);
      fl.position.copy(ball.position).add(new THREE.Vector3(0, eff, 0)); fl.setOn(s.burning > 0.05); fl.setSize(Math.max(0.3, s.burning)); fl.update(t);
      for (const [i, u] of field.material.uniforms.uSrc.value.entries()) u.set(...(s.sources[i] || [0, 0, -100, 0]));
      field.material.uniforms.uTime.value = s.clock; field.visible = ph && s.total - s.left >= RED_G;
      bubs.update(dt, (p, d) => { p.p.addScaledVector(p.v, d); return p.p.y < LEVEL + 0.02; });
      sm.update(dt, { rate: s.burning > 0.05 ? 26 * s.burning : 0, origin: fl.position.clone().add(new THREE.Vector3(0, (fc.h ?? 0.06) * 0.7 * Math.max(0.3, s.burning), 0)), spread: 0.006, up: 0.04, size: 0.013, life: 2.6 });
    },
    dispose() { bubs.dispose(); sm.dispose(); field.material.dispose(); },
  };
  return api;
}

// ================= 钻进去看：钠、钾原子的结构（课本第 99 页的表）=================
// 钠 +11（2 8 1），原子半径 0.186 nm；钾 +19（2 8 8 1），0.227 nm。画成原子结构示意图那样：电子层是圆，电子是小点；
// 最外层的圆按原子半径等比例画（1 nm 画成 6.5 Å 长），里面几层等间距。最外层那 1 个电子是金色。
// 每一边（左钠、右钾）画两个同种原子、两个水分子，正好是 2M + 2H₂O → 2M⁺ + 2OH⁻ + H₂（电子、原子都守恒）：
// 投进水里以后（st.na / st.k：这种金属已经投进去了），两个水分子从下面靠过来，每个原子把最外层电子交给一个水分子里朝着它的那个氢，
// 原子变成离子（+1 价）；两个得到电子的氢连成 H₂ 冒走，水分子留下 OH⁻。
// 钾的那个电子离核更远、受的引力更弱，交得更快（慢放示意，快慢只表示难易，不是真实时间）。
export function alkaliScene() {
  const NM = 6.5, Y = 4.0;
  const AT = [
    { key: 'na', sym: 'Na', ion: 'Na⁺', z: 11, shells: [2, 8, 1], r: 0.186, cx: -3.5, dx: 1.5, t: [2.6, 1.0] },          // t：水分子靠近用几秒、电子跳过去用几秒
    { key: 'k', sym: 'K', ion: 'K⁺', z: 19, shells: [2, 8, 8, 1], r: 0.227, cx: 3.4, dx: 1.7, t: [0.9, 0.55] },
  ];
  // 两个水分子 → 2 OH⁻ + H₂：H₂ 的两个氢是左边水分子右边的 H、右边水分子左边的 H（电子飞去的就是这两个）
  const HIDX = [2, 1];
  const rxOf = (P, wy) => ({ in: ['H2O', 'H2O'], out: ['OH-', 'OH-', 'H2'], host: -1, approach: 0, dur: 1.4,
    atAbs: () => new THREE.Vector3(P.cx, wy + 0.6, 0.3), nearAbs: () => null,
    placeAbs: () => [new THREE.Vector3(P.cx - P.dx - 0.35, wy - 0.15, 0.3), new THREE.Vector3(P.cx + P.dx - 0.35, wy - 0.15, 0.3), new THREE.Vector3(P.cx, wy + 0.75, 0.3)],
    map: [[0, 0], [0, 1], [1, 0], [1, 2], [0, 2], [1, 1]],
    after: [{ fixed: true }, { fixed: true }, { gas: true, leave: true, v: [0, 0.4, 1.6] }] });          // H₂ 往前上方冒走（不穿过原子）
  let A = [];
  const ringMat = () => new THREE.MeshBasicMaterial({ color: 0x3d79c4, transparent: true, opacity: 0.9, depthWrite: false });
  const INK = '#4a3a8c', HALO = 'rgba(255,255,255,0.95)';          // 全息里的字：深色字、白边（和分子标签一样）
  const atom = (c, a, x, first) => {
    const g = new THREE.Group(); g.position.set(x, Y, 0); c.layer.add(g);
    const R = a.r * NM, n = a.shells.length;
    const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), new THREE.MeshStandardMaterial({ color: 0xd8574b, roughness: 0.4, emissive: 0x5a1a14, emissiveIntensity: 0.4 })); g.add(nuc);
    const zLab = textSprite(`+${a.z}`, '#ffffff', 'rgba(60,10,10,0.9)'); zLab.scale.set(1.1, 0.41, 1); zLab.position.set(0, 0, 0.4); g.add(zLab);
    const rings = [], els = [];
    a.shells.forEach((cnt, i) => {
      const ri = R * (i + 1) / n;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(ri, 0.032, 6, 100), ringMat()); g.add(ring); rings.push(ring);
      for (let j = 0; j < cnt; j++) {
        const outer = i === n - 1;
        const e = new THREE.Mesh(new THREE.SphereGeometry(outer ? 0.16 : 0.095, 12, 9), new THREE.MeshBasicMaterial({ color: outer ? 0xf0a500 : 0x2f3a48 }));
        e.userData = { ri, a0: (j / cnt) * Math.PI * 2 + i * 0.5, w: 0.5 / (i + 1), outer }; g.add(e); els.push(e);
      }
    });
    const sym = textSprite(a.sym, INK, HALO); sym.scale.set(1.6, 0.6, 1); sym.position.set(0, R + 0.55, 0); g.add(sym);
    let size = null;
    if (first) { size = textSprite(`${a.r.toFixed(3)} nm`, '#2f4f6f', HALO); size.scale.set(2.2, 0.83, 1); size.position.set(0, R + 1.25, 0); g.add(size); }          // 原子半径（只标一个）：变成离子以后撤掉（那不是离子半径）
    return { g, R, rings, els, outerE: els.find((e) => e.userData.outer), sym, size };
  };
  const setSym = (X, text) => { const s = textSprite(text, INK, HALO); s.scale.copy(X.sym.scale); s.position.copy(X.sym.position); X.g.remove(X.sym); X.sym.material.map.dispose(); X.sym.material.dispose(); X.g.add(s); X.sym = s; };
  return {
    labels: (k, m) => !!m.rep || k === 'H2', labelOnly: (k, m) => !!m.rep || k === 'H2', dim: 1, solid: true,          // 只标每边一个 OH⁻ 和冒走的 H₂
    init(c) {
      c.view.film = 0.02; c.view.paper = null;
      A = AT.map((a) => ({ a, atoms: [-1, 1].map((s, i) => atom(c, a, a.cx + s * a.dx, i === 0)), water: null, k: 0, phase: 'atom' }));
    },
    step(c, st, dt) {
      c.view.film = 0.02; c.view.paper = null;
      for (const X of A) {
        const on = !!st?.[X.a.key];
        for (const T of X.atoms) for (const e of T.els) {
          const u = e.userData;
          if (u.outer && X.phase !== 'atom') continue;          // 正在跳过去，或者已经交出去了
          if (u.outer && on) { const d = Math.atan2(Math.sin(-Math.PI / 2 - u.a0), Math.cos(-Math.PI / 2 - u.a0)); u.a0 += d * Math.min(1, dt * 3); }          // 被水分子“拉”住：转到靠近水分子的下面
          else u.a0 += u.w * dt;
          e.position.set(Math.cos(u.a0) * u.ri, Math.sin(u.a0) * u.ri, 0);
        }
        if (!on) continue;
        // 投进水里了：两个水分子从下面靠过来 → 每个原子的最外层电子跳到一个水分子的氢上 → 原子变成离子，两个氢连成 H₂ 冒走
        const [tIn, tHop] = X.a.t, R = X.atoms[1].R, wy = Y - R - 1.5;          // 水分子停在原子下面，OH⁻ 的标签不压到原子上
        const wpos = (i, k) => new THREE.Vector3(X.a.cx + (i ? 1 : -1) * (X.a.dx + 1.4 * (1 - k)), wy - 0.8 * (1 - k), 0.3 + 1.2 * (1 - k));
        if (!X.water) { X.water = [0, 1].map((i) => { const w = c.add('H2O', wpos(i, 0), { fixed: true }); w.g.rotation.set(0, 0, 0); return w; }); X.k = 0; }          // 水分子不标（标签会压到原子上；字幕里说了是水分子）
        X.k += dt;
        if (X.phase === 'atom') {
          const k = Math.min(1, X.k / tIn), q = k * k * (3 - 2 * k);
          X.water.forEach((w, i) => w.g.position.copy(wpos(i, q)));
          if (X.k >= tIn) { X.phase = 'hop'; X.k0 = X.k; X.from = X.atoms.map((T) => T.outerE.position.clone()); }
        }
        if (X.phase === 'hop') {
          const q = Math.min(1, (X.k - X.k0) / tHop);
          X.atoms.forEach((T, i) => { const to = c.layer.worldToLocal(X.water[i].atoms[HIDX[i]].getWorldPosition(new THREE.Vector3())).sub(T.g.position); T.outerE.position.copy(X.from[i]).lerp(to, q * q * (3 - 2 * q)); });
          if (q >= 1) {
            X.phase = 'ion';
            for (const T of X.atoms) { T.outerE.visible = false; if (T.size) T.size.visible = false; setSym(T, X.a.ion); }
            c.start(rxOf(X.a, wy), X.water, { then: (ps) => { ps[0].rep = true; X.phase = 'done'; } });          // 电子到了两个氢上：2H₂O → 2OH⁻ + H₂
          }
        }
        if (X.phase === 'ion' || X.phase === 'done') for (const T of X.atoms) { const ring = T.rings[T.rings.length - 1]; ring.material.opacity += (0.12 - ring.material.opacity) * Math.min(1, dt * 2); }
      }
    },
    text(c, st) {
      const eq = 'Na：<b>+11</b>　2 8 1　　　K：<b>+19</b>　2 8 8 1';
      const na = A[0]?.phase, k = A[1]?.phase, any = st?.na || st?.k, fin = (p) => p === 'done';
      const tail = '<b>慢放示意：每边两个原子、两个水分子，表示电子和原子守恒；快慢只表示难易。</b>';
      if (!any) return { eq, on: true, cap: '钠、钾原子的最外层都只有 <b>1 个电子</b>（金色）。钾比钠多一个电子层，原子半径更大：0.227 nm 对 0.186 nm（课本第 99 页的表）。把它们投进水里，再来看最外层的电子。' };
      const water = '得到电子的两个氢结合成 H<sub>2</sub> 逸出，水分子留下 OH<sup>−</sup>。';
      if (fin(na) && fin(k)) return { eq, on: true, cap: `两种原子都交出了最外层的 1 个电子，变成 Na⁺、K⁺：<b>产物中钠、钾元素均为 +1 价</b>；${water}从钠到钾，电子层增多、原子半径增大，失去电子的能力增强。${tail}` };
      if (st.na && !st.k && fin(na)) return { eq, on: true, cap: `两个钠原子各交出最外层的 1 个电子，变成 Na⁺；${water}再把钾投进水里比一比。${tail}` };
      if (st.k && !st.na && fin(k)) return { eq, on: true, cap: `两个钾原子各交出最外层的 1 个电子，变成 K⁺；${water}再把钠投进水里比一比。${tail}` };
      return { eq, on: true, cap: `水分子靠过来，每个原子把最外层那 1 个电子交给水分子里的一个氢。钾的最外层电子<b>离核更远</b>，原子核对它的<b>引力更弱</b>，更容易失去。${tail}` };
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
// 打开时从还没反应的钠演起，最多演到现在的进度（烧完以后再打开，就是从头重看一遍电子怎么转移）：打开后第一组慢，后面追进度的快一点。
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
  let made = 0, played = 0, ev = null;
  const dots = [];
  const clearDots = () => { for (const d of dots) { d.parent?.remove(d); d.geometry.dispose(); d.material.dispose(); } dots.length = 0; };
  const markRep = (c, ps) => { if (!c.mols.some((m) => m.rep && m.kind === 'O2 2-')) ps.forEach((m) => { m.rep = true; }); };
  return {
    solid: true, still: true,
    labels: (k, m) => k === 'O2' || !!m.rep, labelOnly: (k, m) => k === 'O2' || !!m.rep,          // 只标空气里的 O₂、一个钠原子、第一组 Na⁺ 和 O₂²⁻
    init(c, st) {
      made = 0; played = 0; ev = null; clearDots();
      c.view.film = 0; c.view.paper = null;
      for (const s of sites) c.add('Nam', s.p.clone(), { fixed: true });
      for (let i = 0; i < NO2; i++) c.add('O2', c.inGas(), { gas: true });
      for (let i = 0; i < NN2; i++) c.add('N2', c.inGas(), { gas: true });
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
          const { mid, out } = spots(P), fast = played > 0 && made + 1 < Math.max(want, 1);          // 追进度：落后两组以上的时候快一点
          const e = c.start({ in: ['Nam', 'Nam', 'O2'], out: ['Na+', 'Na+', 'O2 2-'], host: -1, approach: fast ? 1.3 : 2.2, dur: fast ? 1.2 : 1.8, burst: [0xffd27a],
            atAbs: () => mid.clone().add(c.V([0, 0.85, 0])), nearAbs: (ms, i) => (i === 2 ? mid.clone().add(c.V([0, 1.9, 0])) : null),
            placeAbs: () => out, after: [{ fixed: true }, { fixed: true }, { fixed: true }] }, [a, b, o2],
          { then: (ps) => { made++; played++; ev = null; clearDots(); markRep(c, ps); c.burst(out[2].clone(), 0xfff0b0); } });
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
      const e = ev?.e, k = e ? e.t / e.A : 0, want = Math.round((st?.x || 0) * NEV), slow = '<b>慢放示意，不表示真实的反应步骤。</b>';
      const cap = e && k < 0.45 ? `一个 O₂ 落向钠的表面……${played ? '' : slow}`
        : e && k < 1 ? '两个钠原子各交出<b>最外层的 1 个电子</b>（小深色点），交给这个 O₂。<b>Na：0 → +1</b>，被氧化。'
          : e ? '钠原子成了 <b>Na⁺</b>，O₂ 得到 2 个电子成了<b>过氧根 O₂²⁻</b>（两个氧还连着，氧是 −1 价）——正负电荷相吸，<b>三个离子靠拢、结合在一起</b>。'
            : !made && !st?.burning && !want ? (st?.melt >= 1 ? `钠熔化了：钠原子抖得厉害，但还没烧起来。上面是空气——O₂ 和 N₂。${slow}` : `坩埚里是金属钠：一个个<b>钠原子</b>紧挨着。上面是空气——O₂ 和 N₂。钠燃烧以后，看氧分子落下来会怎样。${slow}`)
              : !made ? `钠燃烧时，空气里的 O₂ 一个个落到钠的表面。${slow}`
                : made >= NEV || (!st?.burning && made >= want) ? `钠表面已经有 <b>${made}</b> 组 Na⁺ 和 O₂²⁻ 按 2∶1 结合在一起——这就是坩埚里的<b>淡黄色固体 Na₂O₂</b>。（常温下钠表面生成的是 Na₂O，里面是 O²⁻。）${slow}`
                  : `已经有 <b>${made}</b> 组 Na⁺ 和 O₂²⁻ 结合在一起（左边），右边还是钠原子。`;
      return { eq, on: !!(st?.burning || made || want), cap };
    },
  };
}

// ================= 钻进去看：过氧化钠与水（课本第 37 页）2Na₂O₂ + 2H₂O ══ 4NaOH + O₂↑ =================
// 照钠燃烧（sodiumBurnScene）的样子：试管底的过氧化钠画成六小块，三列两排分开摆，每块是两个 Na⁺ 夹着一个过氧根 O₂²⁻（两个氧还连着）——
// 和钠燃烧里生成的那一块一模一样。加了水：水分子落到一列的两块上，两个 O₂²⁻ 和两个 H₂O 反应，生成 4 个 OH⁻ 和 1 个 O₂（冒出去）；
// 过氧根里的 4 个氧：2 个连成 O₂（−1 → 0，各失 1 个电子），2 个进了 OH⁻（−1 → −2，各得 1 个电子）；水里的 2 个氧也进了 OH⁻（还是 −2）。
// 电子账画成每个 O₂²⁻ 里一个小深色点从要进 O₂ 的氧挪到要进 OH⁻ 的氧（只是记账，不是真实路径）。这一列的 4 个 Na⁺ 离开固体、进到溶液里，Na⁺ 本身不变。
// 反应从左往右一列一列推进，几组跟着这一课算出来的进度（st.x = 已经反应掉的 Na₂O₂ ÷ 原来的）走：还剩一成以上的过氧化钠，就至少留一列不反应。
// 水不够（st.dry：水用完了、还剩过氧化钠）：不再有水分子游过来；演完以后剩下的 H₂O 淡出，生成的 Na⁺、OH⁻ 留在反应过的地方（没有水溶解它们），右边还是过氧化钠。
// 打开时从刚加水那一刻演起，最多演到现在的进度；st.resume = n：老师演示完回来，前 n 列已经看过，直接摆成反应过的样子接着演。
// 同一种原子到哪儿都是一个颜色、一个大小；淡黄色只写在字幕里。总反应的粒子重排示意，不表示真实的反应步骤（实际要经过 H₂O₂）。
// st：{ water: 加水了没有, x: 反应进度（0~1）, dry: 水用完了、还剩过氧化钠, resume: 已经看过几列 }
export function peroxideScene() {
  const FILM = 6.2, Y0 = 0.6, DX = 4.3, DZ = 3.4, NW = 3, NEV = 3;
  const cols = [-1, 0, 1].map((q) => ({ x: q * DX, rows: [-DZ / 2, DZ / 2] }));
  const HOME = { 'Na+': new THREE.Vector3(-3.6, 4.9, -1.6), 'OH-': new THREE.Vector3(3.6, 4.9, -1.6), H2O: new THREE.Vector3(0.4, 5.1, -2.4) };
  const TAG = '<b>总反应的粒子重排示意</b>，不表示真实的反应步骤。';
  let wet = false, made = 0, wait = 0, thin = 0, busy = false, dryT = 0, settled = false, ev = null;
  const dots = [];
  const clearDots = () => { for (const d of dots) { d.parent?.remove(d); d.geometry.dispose(); d.material.dispose(); } dots.length = 0; };
  const block = (c, x, z) => {
    const a = c.add('Na+', c.V([x - 1.25, Y0 + 0.15, z]), { fixed: true, solid: true }), b = c.add('Na+', c.V([x + 1.25, Y0 + 0.15, z]), { fixed: true, solid: true });
    const o = c.add('O2 2-', c.V([x, Y0 + 0.85, z]), { fixed: true, solid: true }); [a, b, o].forEach((m) => m.g.rotation.set(0, 0, 0));
    return [a, b, o];
  };
  const inCol = (c, col, kind) => c.mols.filter((m) => m.solid && m.kind === kind && !m.busy && Math.abs(m.g.position.x - col.x) < 2);
  const repSolid = (c) => {          // 固体里标一个 Na⁺、一个 O₂²⁻：最右边一列后面那一块（最后才反应；从斜上方看，标签往后排的空处伸，不压前排）
    if (c.mols.some((m) => m.rep === 'solid' && m.solid)) return;
    const right = cols.slice().reverse().find((col) => inCol(c, col, 'O2 2-').length); if (!right) return;
    const z = Math.min(...right.rows), o = inCol(c, right, 'O2 2-').find((m) => Math.abs(m.g.position.z - z) < 0.5), na = inCol(c, right, 'Na+').filter((m) => Math.abs(m.g.position.z - z) < 0.5).sort((p, q) => q.g.position.x - p.g.position.x)[0];
    if (o) o.rep = 'solid'; if (na) na.rep = 'solid';
  };
  const repSol = (c, kind) => { if (c.mols.some((m) => m.kind === kind && m.rep === 'sol')) return; const m = c.free(kind).filter((q) => !q.solid)[0]; if (m) m.rep = 'sol'; };
  const water = (c) => c.free('H2O').filter((m) => m.rep !== 'sol' && !m.fadeIn);
  const target = (st) => {          // 该反应几列：跟着进度；还剩一成以上就至少留一列
    const x = st?.x || 0; let n = Math.min(NEV, Math.ceil(x * NEV - 1e-6));
    if (1 - x > 0.1) n = Math.min(n, NEV - 1);
    return n;
  };
  const products = (c) => c.mols.filter((m) => !m.busy && !m.leaving && !m.fadeOut && !m.solid && (m.kind === 'Na+' || m.kind === 'OH-'));
  // 水用完了：生成的 Na⁺、OH⁻ 留在反应过的那几列的位置上（固体，没有水溶解它们）
  const settle = (c) => {
    settled = true;
    const empty = cols.filter((col) => !inCol(c, col, 'O2 2-').length && !inCol(c, col, 'Na+').length);
    const spots = empty.flatMap((col) => col.rows.flatMap((z) => [[col.x - 1.1, z, 'Na+'], [col.x + 1.1, z, 'OH-']]));
    const na = products(c).filter((m) => m.kind === 'Na+'), oh = products(c).filter((m) => m.kind === 'OH-');
    for (const [x, z, k] of spots) { const m = (k === 'Na+' ? na : oh).shift(); if (m) { m.fixed = true; m.dryTo = c.V([x, Y0 + 0.4, z]); m.pull = null; } }
    const n = Math.min(na.length, oh.length); for (let i = 0; i < n; i++) { na[i].fadeOut = true; oh[i].fadeOut = true; }          // 摆不下的成对淡出
    for (const m of c.free('H2O')) m.fadeOut = true;          // 水用完了
  };
  const unsettle = (c) => { settled = false; for (const m of c.mols) if (m.dryTo) { m.fixed = false; m.dryTo = null; m.v.set(c.rnd(-0.4, 0.4), 1.2, c.rnd(-0.4, 0.4)); } };
  const api = {
    dim: 0.5,
    get made() { return made; },
    labels: (k, m) => !!m.rep || k === 'O2' || !!m.lab, labelOnly: (k, m) => (!!m.rep && !(busy && m.rep === 'sol' && k === 'H2O')) || k === 'O2' || (!!m.lab && m.busy),          // 只标代表：固体里一组 Na⁺、O₂²⁻，溶液里一个 Na⁺、OH⁻、H₂O，冒出去的 O₂；反应时只标落到后排的那个 H₂O
    init(c, st) {
      wet = !!st?.water; wait = 0.6; thin = 0; busy = false; dryT = 0; settled = false; ev = null; clearDots();
      made = wet ? Math.min(st?.resume || 0, target(st)) : 0;
      c.view.film = wet ? FILM : 0.02; c.view.paper = null; c.view.liquid = 0xb9dfe9;
      cols.forEach((col, i) => { if (i >= made) for (const z of col.rows) block(c, col.x, z); });
      repSolid(c);
      if (wet) {
        for (let i = 0; i < Math.min(2, made * 4); i++) { c.add('Na+', c.V([c.rnd(-4, 4), c.rnd(2.2, 4.5), c.rnd(-1.5, 1.5)])); c.add('OH-', c.V([c.rnd(-4, 4), c.rnd(2.2, 4.5), c.rnd(-1.5, 1.5)])); }          // 已经看过的几列：生成的 Na⁺、OH⁻ 在溶液里（这一小块里留 2 对）
        for (let i = 0; i < NW; i++) c.add('H2O', c.V([-3.6 + i * 2.4 + c.rnd(-0.4, 0.4), c.rnd(3.4, 5), c.rnd(-1.5, 1.5)]));
        repSol(c, 'H2O'); repSol(c, 'Na+'); repSol(c, 'OH-');
      }
    },
    step(c, st, dt) {
      if (!wet) return;
      c.view.paper = null;
      busy = c.events.length > 0;          // 反应的时候水的代表先不标（参加反应的那个水分子标着）
      wait -= dt;
      const want = target(st);
      dryT = st?.dry ? dryT + dt : 0;
      if (made < want && !c.events.length && wait <= 0) {
        if (settled) unsettle(c);
        const col = cols.find((q) => inCol(c, q, 'O2 2-').length >= 2), ws = water(c);
        if (col && ws.length < 2) for (let i = ws.length; i < 2; i++) ws.push(c.add('H2O', c.V([c.rnd(-4, 4), FILM - 0.8, c.rnd(-2, 1)]), { fadeIn: false }));          // 还要反应，就有水游过来
        if (col && ws.length >= 2) {
          const [pF, pB] = inCol(c, col, 'O2 2-').sort((p, q) => q.g.position.z - p.g.position.z);
          const [w1, w2] = ws.sort((p, q) => p.g.position.distanceTo(pF.g.position) - q.g.position.distanceTo(pF.g.position));
          w2.lab = true;          // 只标落到后排那块上的水分子：从斜上方看，它的标签在最上面，不压别的；O₂²⁻ 看固体里那个代表
          const F = pF.g.position.clone(), B = pB.g.position.clone(), mid = F.clone().lerp(B, 0.5);
          const e = c.start({ in: ['O2 2-', 'O2 2-', 'H2O', 'H2O'], out: ['OH-', 'OH-', 'OH-', 'OH-', 'O2'], host: -1, approach: 2.4, dur: 1.9, burst: [0x9fd0ff, 0xffffff],
            atAbs: () => mid.clone().add(c.V([0, 1.2, 0])), nearAbs: (ms, i) => (i === 2 ? F.clone().add(c.V([0.3, 1.6, 0.2])) : i === 3 ? B.clone().add(c.V([0.3, 1.6, -0.2])) : null),
            placeAbs: () => [F.clone().add(c.V([-1.4, 1.6, 0.5])), F.clone().add(c.V([1.4, 1.9, 0.6])), B.clone().add(c.V([-1.4, 1.6, -0.5])), B.clone().add(c.V([1.4, 1.9, -0.6])), mid.clone().add(c.V([0, 2.6, 0]))],
            map: [[0, 0], [2, 1], [2, 0], [2, 2], [1, 0], [3, 1], [3, 0], [3, 2], [0, 1], [1, 1]],          // 每个 O₂²⁻ 的第 2 个氧进 O₂，第 1 个氧进 OH⁻
            after: [{}, {}, {}, {}, { gas: true, leave: true, v: [0, 2.4, 0] }] }, [pF, pB, w1, w2],
          { then: (ps) => {
            made++; wait = 0.6; thin = 2.5; ev = null; clearDots();
            for (const p of ps) if (p.kind === 'OH-') { p.labelK = 0; p.labelT = null; }
            for (const m of inCol(c, col, 'Na+')) { m.fixed = false; m.solid = false; if (m.rep === 'solid') m.rep = false; m.v.set(c.rnd(-0.6, 0.6), 1.4, c.rnd(-0.6, 0.6)); }          // 这一列的 Na⁺ 离开固体，进到溶液里
            repSolid(c); repSol(c, 'Na+'); repSol(c, 'OH-');
            if (!st?.dry || made < target(st)) for (let i = 0; i < 2; i++) c.add('H2O', c.V([c.rnd(-4, 4), FILM - 0.8, c.rnd(-2, 1)]), { fadeIn: true, dimK: 0 });          // 水有多的：远处的水游过来，这一小块里的水分子个数不变
          } });
          if (e) {
            ev = { e, ps: [pF, pB] };
            for (let i = 0; i < 2; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshBasicMaterial({ color: 0x2a2f38 })); d.visible = false; c.layer.add(d); dots.push(d); }
          }
        }
      }
      // 电子账：水分子落下来的后半段，每个 O₂²⁻ 里一个小深色点从要连成 O₂ 的氧（第 2 个）挪到要进 OH⁻ 的氧（第 1 个）
      if (ev && dots.length) {
        const { e, ps } = ev, k = e.t / e.A;
        dots.forEach((d, i) => {
          const m = ps[i], a1 = m.g.position.clone().add(m.atoms[1].position).add(c.V([0, 0.55, 0])), a0 = m.g.position.clone().add(m.atoms[0].position).add(c.V([0, 0.55, 0]));
          const u = Math.min(1, Math.max(0, (k - 0.4) / 0.45)); d.visible = k > 0.4 && k < 1; d.position.copy(a1).lerp(a0, u * u * (3 - 2 * u));
        });
      }
      // 水用完了、演完了：剩下的水淡出，生成的 Na⁺、OH⁻ 留在原地
      const dryEnd = dryT > 1.5 && made >= want && !c.events.length;
      if (dryEnd && !settled) settle(c);
      if (!st?.dry && settled) unsettle(c);
      c.view.film = settled ? 0.02 : FILM;
      for (const m of c.mols) if (m.dryTo) m.g.position.lerp(m.dryTo, Math.min(1, dt * 2.5));
      // 溶液很大，生成的 Na⁺、OH⁻ 会慢慢游到别处去：这一小块里最多留 2 对，多的一对一对淡出（先走早来的，代表不走）
      thin -= dt;
      if (thin <= 0 && !settled) {
        const out = (k) => c.free(k).filter((m) => !m.solid && !m.rep)[0];
        if (c.free('Na+').filter((m) => !m.solid).length > 2 && c.free('OH-').length > 2) { const a = out('Na+'), b = out('OH-'); if (a && b) { a.fadeOut = b.fadeOut = true; thin = 0.5; } }
      }
      for (const m of c.mols) if (m.kind === 'O2' && m.leaving) { m.v.y = Math.min(m.v.y, 1.8); if (m.g.position.y > FILM + 0.4) m.fadeOut = true; }          // O₂ 冒出液面就淡出（不飞到字幕上去）
      // 溶液里的粒子：不叠在一起；待在固体上面；代表各待一块（标签不互相压着）
      const free = c.mols.filter((m) => !m.busy && !m.fixed && !m.leaving);
      spread(free, 2.5, dt);
      for (const m of free) {
        if (m.rep === 'sol' && HOME[m.kind]) homeTo(m, HOME[m.kind]);
        else m.pull = m.g.position.y < 3 ? c.V([0, (3 - m.g.position.y) * 2.5, 0]) : null;
      }
    },
    text(c, st) {
      const eq = '2Na<sub>2</sub>O<sub>2</sub> + 2H<sub>2</sub>O ══ 4NaOH + O<sub>2</sub>↑';
      if (!wet) return { eq: '', on: false, cap: '还没加水：试管底的过氧化钠是<b>淡黄色固体</b>，由 Na⁺ 和过氧根 O₂²⁻（两个氧原子还连着）按 2∶1 构成——每一小块是两个 Na⁺ 夹着一个 O₂²⁻。' };
      const e = c.events[0];
      if (e) {
        const k = e.t / e.A;
        if (k < 0.4) return { eq, on: true, cap: `两个水分子落到一列过氧化钠的两个 O₂²⁻ 上。${TAG}` };
        if (k < 1) return { eq, on: true, cap: `电子账：每个 O₂²⁻ 里，一个氧<b>失去 1 个电子</b>（−1 → 0），另一个氧<b>得到 1 个电子</b>（−1 → −2）。${TAG}` };
        return { eq, on: true, cap: `失去电子的两个氧<b>连成 O₂</b> 冒出去（气泡）；得到电子的两个氧和水里的两个氧都进了 <b>OH⁻</b>（共 4 个）；这一列的 Na⁺ 离开固体。${TAG}` };
      }
      if (settled) return { eq, on: true, cap: `<b>水用完了</b>，右边还剩过氧化钠。生成的 Na⁺ 和 OH⁻ 留在反应过的地方，没有水溶解它们。${TAG}` };
      if (made >= NEV) return { eq, on: true, cap: `过氧化钠反应完了：溶液里是 Na⁺ 和 OH⁻——<b>NaOH 溶液，显碱性</b>；O₂ 冒出去了（能使带火星的木条复燃）。Na⁺ 一直没变。粒子个数是示意。${TAG}` };
      if (made) return { eq, on: true, cap: `已经反应了 <b>${made}</b> 列（左边）：生成的 OH⁻ 和 Na⁺ 在溶液里，右边还是过氧化钠。${TAG}` };
      return { eq, on: true, cap: '加了水：水分子就要落到过氧化钠上反应了。' };
    },
  };
  return api;
}
