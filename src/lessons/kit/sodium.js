// 高中化学的新器材与钠-水教学模型。只供 nawater 使用，不改初中活页的公共件。
import * as THREE from 'three';
import { paint, inked, glassEdge } from '../../live/ink.js';
import { glass2, water2 } from './chemfx.js';
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
      age += dt;
      if (!started) {
        electrons.forEach((e, i) => { e.position.copy(c.V([0, 0.9, 0]).lerp(reactants[i + 2].g.position.clone().sub(reactants[i].g.position), Math.min(1, age / 2.5))); });
        if (age > 2.5) {
          started = true;
          for (const e of electrons) { e.parent.remove(e); e.geometry.dispose(); e.material.dispose(); }
          c.start(rx, reactants, { then: () => { finished = true; } });
        }
      }
      c.view.liquid = finished ? 0xe75a91 : 0xb9dfe9;
    },
    text() {
      return { eq: '2Na + 2H₂O → 2Na⁺ + 2OH⁻ + H₂↑', on: true,
        cap: !started ? '每个钠原子交出最外层的 1 个电子 → 水中的氢得到电子。<b>Na：0 → +1；H：+1 → 0</b>。小深色点表示电子。'
          : !finished ? '钠变成 Na⁺ 进入水中；水分子的 O–H 键重排，留下 OH⁻，两个氢结合成 H₂。<b>原子的种类、个数都没变</b>。'
            : 'H₂ 冒走；Na⁺、OH⁻ 留在水中。OH⁻ 增多，酚酞变红。<b>慢放示意：分步看电子转移与原子重排，不表示基元反应机理。</b>' };
    },
  };
}
