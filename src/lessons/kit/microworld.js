// 微观次元：外面的世界褪成淡灰，器材上方浮起一个 3D 的分子世界，反应就在里面发生。
// 引擎只管“分子怎么画、怎么动、反应时原子怎么挪”；每个实验的内容写成一个场景（scene），见文件末尾的 litmusScene 等。
//
//   const mw = microWorld({ mode: 'holo', place, scene: litmusScene() });
//   mw.open(anchor, st)    anchor() → [x, y]：器材在屏幕上的位置（每帧取）；st：实验的状态（场景自己解释）
//   mw.close()；mw.isOpen；mw.onClose = () => {}
//   每帧 mw.set(st); mw.update(dt)；换了一件器材看：mw.reset(st)
// 尺寸按真实比例：C=O 1.16 Å、O–H 0.96 Å、H–O–H 104.5°；一个单位 = 1 Å。每个分子代表很多个。
//
// 场景：{ labels: 'react' | 'always', init(ctx, st), step(ctx, st, dt), text(ctx, st) → { eq, cap } }
//   ctx.add(kind, pos, extra) / ctx.remove(m) / ctx.count(kind) / ctx.free(kind) / ctx.mols
//   ctx.start(rx, mols, { then }) 开始一个反应：rx = { in: [...], out: [...], host, near, place, map, split, after, dur, eq, burst }
//   ctx.view.paper（底座颜色，null = 透明的液体底）、ctx.view.film（液体层厚度，Å）
import * as THREE from 'three';
import { h } from '../../ui/Panel.js';

// 元素：颜色、画出来的半径（Å，大致按共价 / 离子半径缩小）
const EL = {
  Hg: [0xb7bfca, 0.62],
  C: [0x3d4350, 0.4], O: [0xe0483a, 0.36], H: [0xf2f1ec, 0.24], N: [0x4a78d8, 0.36],
  Na: [0x9b6fe0, 0.52], Cl: [0x4cbf63, 0.6], S: [0xe8c23c, 0.44],
  Al: [0xaab6c4, 0.66], Cu: [0xbf5a36, 0.62], Ag: [0xe9ecf1, 0.66],
  Ca: [0x7cc98a, 0.62], Mg: [0xdde2e8, 0.68], Zn: [0x9eaabb, 0.64], Fe: [0x767c86, 0.64], P: [0xa8402f, 0.6], Mn: [0x6e5d84, 0.6],
};
const TET = 1.49 / Math.sqrt(3), TRI = 1.25;
// 离子的电荷：成对进出、算电荷平衡用
const ZION = { 'H+': 1, 'Na+': 1, 'Ag+': 1, 'Cu2+': 2, 'Mg2+': 2, 'Zn2+': 2, 'Fe2+': 2, 'Fe3+': 3, 'Al3+': 3, 'Ca2+': 2, 'Mg2+i': 2, 'Cl-': 1, 'NO3-': 1, 'OH-': 1, 'HCO3-': 1, 'SO4 2-': 2, 'CO3 2-': 2 };
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const pairOf = (cat, an) => { const z = ZION[cat], a = ZION[an], g = gcd(z, a); return [a / g, z / g]; };
// 分子：原子 [元素, x, y, z]、键 [i, j, 几重键]、化学式、标签颜色（全息里用深色字）
const MOL = {
  Hg: { atoms: [['Hg', 0, 0, 0]], bonds: [], label: 'Hg', ink: '#657080' },
  HgO: { atoms: [['Hg', 0, 0, 0], ['O', 0, 1.5, 0]], bonds: [[0, 1, 1]], labelY: 2.5, label: 'HgO', ink: '#b84933' },
  CO2: { atoms: [['C', 0, 0, 0], ['O', -1.16, 0, 0], ['O', 1.16, 0, 0]], bonds: [[0, 1, 2], [0, 2, 2]], label: 'CO₂', ink: '#23293a' },
  H2O: { atoms: [['O', 0, 0, 0], ['H', -0.76, 0.59, 0], ['H', 0.76, 0.59, 0]], bonds: [[0, 1, 1], [0, 2, 1]], label: 'H₂O', ink: '#1f6fa8' },
  H2CO3: { atoms: [['C', 0, 0, 0], ['O', 0, 1.21, 0], ['O', -1.17, -0.68, 0], ['O', 1.17, -0.68, 0], ['H', -1.95, -0.16, 0], ['H', 1.95, -0.16, 0]], bonds: [[0, 1, 2], [0, 2, 1], [0, 3, 1], [2, 4, 1], [3, 5, 1]], label: 'H₂CO₃', ink: '#b8233f', glow: 0xff5a78, glowBase: 0.18 },
  N2: { atoms: [['N', -0.55, 0, 0], ['N', 0.55, 0, 0]], bonds: [[0, 1, 3]], label: 'N₂', ink: '#3a5bb0' },
  O2: { atoms: [['O', -0.6, 0, 0], ['O', 0.6, 0, 0]], bonds: [[0, 1, 2]], label: 'O₂', ink: '#c0392b' },
  H2: { atoms: [['H', -0.37, 0, 0], ['H', 0.37, 0, 0]], bonds: [[0, 1, 1]], label: 'H₂', ink: '#4a5262' },
  'H+': { atoms: [['H', 0, 0, 0]], bonds: [], label: 'H⁺', ink: '#c23a52', glow: 0xff6a6a, glowBase: 0.35, glowSize: 2.2 },
  'OH-': { atoms: [['O', 0, 0, 0], ['H', 0.96, 0, 0]], bonds: [[0, 1, 1]], label: 'OH⁻', ink: '#2f6fb8', glow: 0x6aa8ff, glowBase: 0.3, glowSize: 3 },
  'Na+': { atoms: [['Na', 0, 0, 0]], bonds: [], label: 'Na⁺', ink: '#6d45b8' },
  'Cl-': { atoms: [['Cl', 0, 0, 0]], bonds: [], label: 'Cl⁻', ink: '#2e8a45' },
  // 金属原子（排在金属表面上，不动）和溶液里的离子：同一种原子，变成离子以后带电、到溶液里去
  Al: { atoms: [['Al', 0, 0, 0]], bonds: [], label: 'Al', ink: '#5b6676' },
  Cu: { atoms: [['Cu', 0, 0, 0]], bonds: [], label: 'Cu', ink: '#a24f22' },
  Ag: { atoms: [['Ag', 0, 0, 0]], bonds: [], label: 'Ag', ink: '#6b7280' },
  'Al3+': { atoms: [['Al', 0, 0, 0]], bonds: [], label: 'Al³⁺', ink: '#5b6676', glow: 0xd8e4f0, glowBase: 0.35, glowSize: 2.6 },
  'Cu2+': { atoms: [['Cu', 0, 0, 0]], bonds: [], label: 'Cu²⁺', ink: '#2f7fc0', glow: 0x3f9cff, glowBase: 0.55, glowSize: 3 },
  'Ag+': { atoms: [['Ag', 0, 0, 0]], bonds: [], label: 'Ag⁺', ink: '#6b7280', glow: 0xffffff, glowBase: 0.3, glowSize: 2.6 },
  'SO4 2-': { atoms: [['S', 0, 0, 0], ['O', TET, TET, TET], ['O', -TET, -TET, TET], ['O', -TET, TET, -TET], ['O', TET, -TET, -TET]], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]], label: 'SO₄²⁻', ink: '#9a7a12' },
  'NO3-': { atoms: [['N', 0, 0, 0], ['O', TRI, 0, 0], ['O', -TRI / 2, TRI * 0.866, 0], ['O', -TRI / 2, -TRI * 0.866, 0]], bonds: [[0, 1, 2], [0, 2, 1], [0, 3, 1]], label: 'NO₃⁻', ink: '#3a5bb0' },
  CuO: { atoms: [['Cu', 0, 0, 0], ['O', 1.5, 0, 0]], bonds: [[0, 1, 1]], labelY: 2.0, label: 'CuO', ink: '#3d2a22' },        // 氧化铜的一小块：一个铜原子连着一个氧原子。铜、氧和别处长得一样（同一种原子到哪儿都是一个颜色、一个大小）
  Cub: { atoms: [['Cu', 0, 0, 0]], bonds: [], labelY: 1.3, label: 'Cu', ink: '#a24f22' },      // 木炭还原氧化铜里露出来的铜原子：就是氧化铜里原来那个铜原子，一模一样——只是身边的氧被拉走了
  Ofilm: { atoms: [['O', 0, 0, 0]], bonds: [], label: 'O', ink: '#c0392b' },          // 铝表面的氧化铝薄膜里的氧
  Os: { atoms: [['O', 0, 0, 0]], bonds: [], label: 'O', ink: '#c0392b' },             // 落在固体表面上的氧原子
  Mg: { atoms: [['Mg', 0, 0, 0]], bonds: [], label: 'Mg', ink: '#5b6676' },
  Zn: { atoms: [['Zn', 0, 0, 0]], bonds: [], label: 'Zn', ink: '#4f5a6a' },
  Fe: { atoms: [['Fe', 0, 0, 0]], bonds: [], label: 'Fe', ink: '#4a4f58' },
  P: { atoms: [['P', 0, 0, 0]], bonds: [], label: 'P', ink: '#8a2f22' },
  'Mg2+': { atoms: [['Mg', 0, 0, 0]], bonds: [], label: 'Mg²⁺', ink: '#5b6676', glow: 0xeef2f6, glowBase: 0.35, glowSize: 2.6 },
  'Zn2+': { atoms: [['Zn', 0, 0, 0]], bonds: [], label: 'Zn²⁺', ink: '#4f5a6a', glow: 0xdfe6f0, glowBase: 0.35, glowSize: 2.6 },
  'Fe2+': { atoms: [['Fe', 0, 0, 0]], bonds: [], label: 'Fe²⁺', ink: '#3f8a4a', glow: 0x8fe39a, glowBase: 0.5, glowSize: 2.8 },
  CH4: { atoms: [['C', 0, 0, 0], ['H', 0.63, 0.63, 0.63], ['H', -0.63, -0.63, 0.63], ['H', -0.63, 0.63, -0.63], ['H', 0.63, -0.63, -0.63]], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]], label: 'CH₄', ink: '#23293a' },
  H2O2: { atoms: [['O', -0.73, 0, 0], ['O', 0.73, 0, 0], ['H', -1.0, 0.9, 0], ['H', 1.0, -0.3, 0.85]], bonds: [[0, 1, 1], [0, 2, 1], [1, 3, 1]], label: 'H₂O₂', ink: '#7a3fb0' },
  P2O5: { atoms: [['P', -1.1, 0, 0], ['P', 1.1, 0, 0], ['O', 0, 0.75, 0], ['O', -1.8, 0.9, 0], ['O', -1.7, -0.95, 0], ['O', 1.8, 0.9, 0], ['O', 1.7, -0.95, 0]], bonds: [[0, 2, 1], [1, 2, 1], [0, 3, 2], [0, 4, 1], [1, 5, 2], [1, 6, 1]], label: 'P₂O₅', ink: '#6b4a3a', glow: 0xffffff, glowBase: 0.25, glowSize: 5 },
  MnO2: { atoms: [['Mn', 0, 0, 0], ['O', 0.75, 0.55, 0], ['O', -0.75, 0.55, 0]], bonds: [[0, 1, 1], [0, 2, 1]], label: 'MnO₂', ink: '#4a3d5c' },
  'CO3 2-': { atoms: [['C', 0, 0, 0], ['O', 1.29, 0, 0], ['O', -0.645, 1.117, 0], ['O', -0.645, -1.117, 0]], bonds: [[0, 1, 2], [0, 2, 1], [0, 3, 1]], label: 'CO₃²⁻', ink: '#3d4350' },
  'HCO3-': { atoms: [['C', 0, 0, 0], ['O', 1.25, 0, 0], ['O', -0.65, 1.12, 0], ['O', -0.66, -1.15, 0], ['H', -1.6, -1.15, 0]], bonds: [[0, 1, 2], [0, 2, 1], [0, 3, 1], [3, 4, 1]], label: 'HCO₃⁻', ink: '#3d4350' },
  'Ca2+': { atoms: [['Ca', 0, 0, 0]], bonds: [], label: 'Ca²⁺', ink: '#b8641c', glow: 0xffa040, glowBase: 0.45, glowSize: 2.8 },
  'Mg2+i': { atoms: [['Mg', 0, 0, 0]], bonds: [], label: 'Mg²⁺', ink: '#b8641c', glow: 0xffa040, glowBase: 0.45, glowSize: 2.8 },      // 自来水里的杂质（和蒸馏那课的橙点一个颜色）
  'Fe3+': { atoms: [['Fe', 0, 0, 0]], bonds: [], label: 'Fe³⁺', ink: '#a87400', glow: 0xffc840, glowBase: 0.55, glowSize: 3 },
  FeR: { atoms: [['Fe', 0, 0, 0]], bonds: [], label: 'Fe', ink: '#7a3a1a' },         // 铁锈（Fe₂O₃）里的铁
  Or: { atoms: [['O', 0, 0, 0]], bonds: [], label: 'O', ink: '#c0392b' },             // 铁锈里的氧
  Cs: { atoms: [['C', 0, 0, 0]], bonds: [], label: 'C', ink: '#23293a' },             // 木炭粉里的碳原子：和 CO₂ 里的碳一个颜色
  Dye: (() => {
    // 品红（碱性品红）：中间一个碳，连着三个苯环，环上各一个氨基。画成示意（不细究双键位置）
    const atoms = [['C', 0, 0, 0]], bonds = [];
    for (let k = 0; k < 3; k++) {
      const a = (k * 2 * Math.PI) / 3, dx = Math.cos(a), dy = Math.sin(a), cx = dx * 2.9, cy = dy * 2.9, b0 = atoms.length;
      for (let j = 0; j < 6; j++) { const t = a + Math.PI + (j * Math.PI) / 3; atoms.push(['C', cx + Math.cos(t) * 1.4, cy + Math.sin(t) * 1.4, 0]); bonds.push([b0 + j, b0 + ((j + 1) % 6), j % 2 ? 1 : 2]); }
      bonds.push([0, b0, 1]);
      atoms.push(['N', dx * 5.7, dy * 5.7, 0]); bonds.push([b0 + 3, atoms.length - 1, 1]);
    }
    return { atoms, bonds, label: '品红', ink: '#c2185b', glow: 0xff2a8a, glowBase: 0.45, glowSize: 9 };
  })(),
};
const BOX = { x: 7.5, z: 3.6, top: 9 };          // 底座在 y = 0；液体 0~film；上面是气体

const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const rnd = (a, b) => a + Math.random() * (b - a);
const V = (a) => new THREE.Vector3(...a);

function textSprite(text, color = '#ffffff', shadow = 'rgba(0,0,0,0.6)') {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96;
  const g = c.getContext('2d'); g.textBaseline = 'alphabetic'; g.shadowColor = shadow; g.shadowBlur = 8; g.fillStyle = color;
  // 化学式：字母正常大小，数字画成下标、电荷画成上标（不用 Unicode 上下标字符直接排：宋体里它们的间距很怪）
  const big = '600 54px "Times New Roman", "Songti SC", serif', small = '600 32px "Times New Roman", "Songti SC", serif';
  const SUB = '₀₁₂₃₄₅₆₇₈₉', SUP = { '⁺': '+', '⁻': '−', '²': '2', '³': '3' };
  const parts = [...text].map((ch) => { const sb = SUB.indexOf(ch), sp = SUP[ch]; const d = sb >= 0 ? String(sb) : sp || ch, kind = sb >= 0 ? 'sub' : sp ? 'sup' : ''; g.font = kind ? small : big; return [d, kind, g.measureText(d).width]; });
  let x = 128 - parts.reduce((a, q) => a + q[2], 0) / 2;
  for (const [d, kind, w] of parts) { g.font = kind ? small : big; g.fillText(d, x, kind === 'sub' ? 70 : kind === 'sup' ? 36 : 62); x += w; }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  s.scale.set(2.2, 0.82, 1); s.renderOrder = 20;
  return s;
}
function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); return t;
}
function ringTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.strokeStyle = 'rgba(255,255,255,1)'; g.lineWidth = 6; g.shadowColor = '#fff'; g.shadowBlur = 10; g.beginPath(); g.arc(64, 64, 50, 0, Math.PI * 2); g.stroke();
  return new THREE.CanvasTexture(c);
}
/** 化学式写进 HTML：数字变下标，颜色跟分子的标签一样。 */
export function f(kind, n = '') {
  const M = MOL[kind]; const t = (M ? M.label : kind).replace(/[₀-₉]/g, (d) => `<sub>${'₀₁₂₃₄₅₆₇₈₉'.indexOf(d)}</sub>`).replace(/[⁺⁻²³]+/g, (s) => `<sup>${s.replace('⁺', '+').replace('⁻', '−').replace('²', '2').replace('³', '3')}</sup>`);
  return `<span style="color:${M ? M.ink : 'inherit'}">${n}${t}</span>`;
}

/**
 * opts.mode：'port' = 圆形视窗；'holo'（默认）= 全息：分子直接浮在器材上方（和桌上的东西同一个镜头、同样的远近）。
 * holo 时 opts.place() → { pos: 世界坐标里底座的中心, scale: 1 Å 在世界里多长, cam: 舞台的镜头 }（每帧取）
 */
export function microWorld({ mode = 'holo', place = null, scene = litmusScene() } = {}) {
  mode = window.__lbMicroMode || mode;        // 录素材、试另一种样子时用：页面打开前设 window.__lbMicroMode = 'port' 就全部换成圆窗
  const HOLO = mode === 'holo';
  // ================= 视窗和外面的一层 =================
  const dim = h('div', { class: 'mw-dim' });
  const beam = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); beam.setAttribute('class', 'mw-beam');
  beam.innerHTML = '<defs><linearGradient id="mwg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffe6b0" stop-opacity="0.85"/><stop offset="1" stop-color="#9fc4ff" stop-opacity="0.15"/></linearGradient></defs><path fill="url(#mwg)"/>';
  const eq = h('div', { class: 'mw-eq' }), cap = h('div', { class: 'mw-cap' });
  const closeB = h('button', { class: 'mw-close', onclick: () => api.close() }, '回到桌上 ×');
  const scale = h('div', { class: 'mw-scale' }, '微观示意 · 粒子数量与尺度经过简化');
  const port = h('div', { class: 'mw-port' });
  const hud = h('div', { class: 'mw-hud' }, eq, cap);
  const root = h('div', { class: 'mw', hidden: true }, dim, beam, port, hud, closeB, scale);
  document.body.append(root);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: HOLO }); if (HOLO) renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  if (HOLO) { root.classList.add('holo'); root.insertBefore(renderer.domElement, hud); renderer.domElement.className = 'mw-holo'; } else port.append(renderer.domElement);

  // ================= 3D 的分子世界 =================
  const sc = new THREE.Scene();
  if (!HOLO) { sc.background = new THREE.Color(0x0d1524); sc.fog = new THREE.Fog(0x0d1524, 14, 30); }
  const W0 = new THREE.Group(); sc.add(W0);          // 分子世界的全部东西（全息时整体挪到器材上方、整体缩放）
  const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const hemi = new THREE.HemisphereLight(0xc6d8ff, 0x2a2238, 1.1); W0.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(4, 9, 7); W0.add(key);
  const rim = new THREE.DirectionalLight(0x8fb6ff, 1.2); rim.position.set(-6, 3, -8); W0.add(rim);
  const flashLight = new THREE.PointLight(0xff7a8a, 0, 8); W0.add(flashLight);
  const spot = new THREE.PointLight(0xfff1d6, 0, 9, 1.4); W0.add(spot);        // 反应的时候：周围暗下来，只有反应的地方亮着
  // 底座（纸 / 液体底）和上面的一层液体
  const fib = document.createElement('canvas'); fib.width = 512; fib.height = 256;
  { const g = fib.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 512, 256); g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = 3; for (let i = 0; i < 46; i++) { g.beginPath(); const y = Math.random() * 256; g.moveTo(-20, y); g.bezierCurveTo(150, y + rnd(-60, 60), 350, y + rnd(-60, 60), 540, y + rnd(-40, 40)); g.stroke(); } }
  const fibTex = new THREE.CanvasTexture(fib); fibTex.wrapS = fibTex.wrapT = THREE.RepeatWrapping;
  const paperMat = new THREE.MeshStandardMaterial({ color: 0x8b5fb0, map: fibTex, roughness: 0.9, emissive: 0x8b5fb0, emissiveIntensity: 0.18 });
  const HR = 6.8;                     // 全息底座的半径（Å）：分子只在这个圆里活动
  if (HOLO) { paperMat.transparent = true; paperMat.opacity = 0.38; paperMat.emissiveIntensity = 0.5; paperMat.depthWrite = false; }
  const paper = new THREE.Mesh(HOLO ? new THREE.CylinderGeometry(HR, HR, 0.5, 64) : new THREE.BoxGeometry(BOX.x * 2 + 6, 1.4, BOX.z * 2 + 6), paperMat); paper.position.y = HOLO ? -0.4 : -0.7; W0.add(paper);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x5cc2f0, transparent: true, opacity: 0.13, roughness: 0.15, depthWrite: false, emissive: 0x1d5f80, emissiveIntensity: 0.3 });
  const water = new THREE.Mesh(HOLO ? new THREE.CylinderGeometry(HR - 0.05, HR - 0.05, 1, 64) : new THREE.BoxGeometry(BOX.x * 2 + 6, 1, BOX.z * 2 + 6), waterMat); water.renderOrder = 5; W0.add(water);
  const surfMat = new THREE.MeshBasicMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide });
  const surf = new THREE.Mesh(HOLO ? new THREE.CircleGeometry(HR - 0.05, 64) : new THREE.PlaneGeometry(BOX.x * 2 + 6, BOX.z * 2 + 6), surfMat); surf.rotation.x = -Math.PI / 2; surf.renderOrder = 6; W0.add(surf);
  // 微微飘着的尘点（远处的分子）：有纵深感
  const dustG = new THREE.BufferGeometry(), dustP = new Float32Array(240 * 3);
  for (let i = 0; i < 240; i++) dustP.set([rnd(-16, 16), rnd(-1, 14), rnd(-18, -4)], i * 3);
  dustG.setAttribute('position', new THREE.BufferAttribute(dustP, 3));
  const dust = new THREE.Points(dustG, new THREE.PointsMaterial({ color: 0x9fb8e8, size: 0.09, transparent: true, opacity: 0.55, depthWrite: false })); W0.add(dust);
  const GLOW = glowTex(), RING = ringTex();
  // 全息：方向光的“目标”跟着分子世界走（不然整体挪走、缩小以后光的方向会乱）；点光源不随距离衰减
  W0.add(key.target, rim.target);
  if (HOLO) { dust.visible = false; for (const L of [flashLight, spot]) { L.decay = 0; L.distance = 0; } }
  // 全息的底座：一圈光 + 从器材往上的光柱
  let baseRing = null, column = null;
  if (HOLO) {
    baseRing = new THREE.Mesh(new THREE.TorusGeometry(HR + 0.05, 0.07, 8, 96), new THREE.MeshBasicMaterial({ color: 0x9fdcff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    baseRing.rotation.x = Math.PI / 2; baseRing.position.y = 0.02; W0.add(baseRing);
    const cg = document.createElement('canvas'); cg.width = 4; cg.height = 128; const gg = cg.getContext('2d');
    const gr = gg.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(170,220,255,0.55)'); gr.addColorStop(1, 'rgba(255,230,180,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, 4, 128);
    column = new THREE.Mesh(new THREE.CylinderGeometry(HR, 2.6, 1, 64, 1, true), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cg), transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    W0.add(column);
  }

  const atomGeo = new THREE.SphereGeometry(1, 28, 20), bondGeo = new THREE.CylinderGeometry(1, 1, 1, 12);
  const atomMat = {}; for (const [e, [c]] of Object.entries(EL)) atomMat[e] = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.28, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.25 });
  const bondMat = new THREE.MeshStandardMaterial({ color: 0xd8dde8, roughness: 0.4, transparent: true });

  const linkMat = new THREE.MeshStandardMaterial({ color: 0xc9d1de, roughness: 0.45 }), linkPool = [];      // 晶格连线（scene.links）
  // 一个分子：group 里放原子和键；反应的时候原子被借走，单独插值
  const molecules = [];
  // 每个分子用自己的材质：反应的时候，不参与的分子可以单独变淡
  const makeAtom = (e, own = true, k = 1) => { const mat = own ? atomMat[e].clone() : atomMat[e]; if (own) mat.transparent = true; const m = new THREE.Mesh(atomGeo, mat); m.scale.setScalar(EL[e][1] * k); m.userData.el = e; return m; };       // k：这个原子画多大（MOL 里原子的第 5 个数，默认 1）
  const makeBond = () => new THREE.Mesh(bondGeo, bondMat.clone());
  const setBond = (b, p1, p2, order, k, alpha = 1) => {
    // order 重键：画成几根细一点的平行棍
    const d = p2.clone().sub(p1), L = d.length();
    b.visible = L > 0.01 && alpha > 0.02;
    if (!b.visible) return;
    b.position.copy(p1).add(p2).multiplyScalar(0.5);
    const off = new THREE.Vector3(0, 0, 1).cross(d).normalize().multiplyScalar(order === 1 ? 0 : (k - (order - 1) / 2) * 0.17);
    if (off.lengthSq() < 1e-6 && order > 1) off.set(0, 0.17 * (k - (order - 1) / 2), 0);
    b.position.add(off);
    b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    const r = order === 1 ? 0.085 : 0.055;
    b.scale.set(r, L, r); b.material.opacity = alpha;
  };
  const addMol = (kind, pos, extra = {}) => {
    const M = MOL[kind];
    const g = new THREE.Group(); g.position.copy(pos); g.rotation.set(rnd(0, 6), rnd(0, 6), rnd(0, 6));
    const atoms = M.atoms.map(([e, x, y, z, k], i) => { const a = makeAtom(e, true, k ?? 1); if (M.tint?.[i] != null) a.material.color.setHex(M.tint[i]); a.position.set(x, y, z); g.add(a); return a; });
    const bonds = []; for (const [i, j, n] of M.bonds) for (let k = 0; k < n; k++) { const b = makeBond(); g.add(b); bonds.push([b, i, j, n, k]); }
    for (const [b, i, j, n, k] of bonds) setBond(b, atoms[i].position, atoms[j].position, n, k);
    let glowS = null;
    if (M.glow) { glowS = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: M.glow, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); glowS.scale.setScalar(M.glowSize || 5); g.add(glowS); }
    const label = HOLO ? textSprite(M.label, M.ink, 'rgba(255,255,255,0.95)') : textSprite(M.label, '#e8ecf5');
    if (HOLO) label.scale.set(3.2, 1.2, 1);
    label.material.opacity = 0;
    W0.add(g, label);
    const m = { kind, g, atoms, bonds, label, v: new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(0.6), w: new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)), busy: false, leaving: false, gas: false, glow: 0, glowS, labelK: 0, dimK: 1, ...extra };
    molecules.push(m); return m;
  };
  const removeMol = (m) => { m.glowS?.material.dispose(); m.atoms.forEach((a) => a.material.dispose()); W0.remove(m.g, m.label); m.label.material.map.dispose(); m.label.material.dispose(); m.bonds.forEach(([b]) => b.material.dispose()); const i = molecules.indexOf(m); if (i >= 0) molecules.splice(i, 1); };
  const atomWorld = (m) => m.atoms.map((a) => W0.worldToLocal(a.getWorldPosition(new THREE.Vector3())));       // 分子世界自己的坐标

  // ================= 反应 =================
  let events = [];
  const fx = [];             // 碰撞的光圈、光点
  const burst = (p, color) => {
    const r = new THREE.Sprite(new THREE.SpriteMaterial({ map: RING, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); r.position.copy(p); r.renderOrder = 15; W0.add(r);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); gl.position.copy(p); gl.renderOrder = 15; W0.add(gl);
    fx.push({ r, gl, t: 0 });
    flashLight.position.copy(p); flashLight.color.set(color); flashLight.intensity = 30;
  };
  const cleanTemp = (e) => { e.temp.forEach((a) => { W0.remove(a); if (a.userData.own) a.material.dispose(); }); e.tb.forEach(([b]) => { W0.remove(b); b.material.dispose(); }); };
  /**
   * 开始一个反应。rx：
   *   in / out：反应物、生成物的种类；host：第几个反应物不动（别的飞过来找它；默认最后一个）
   *   near：[每个反应物飞到 host 旁边的哪里（Å，null = 不动）]；at：反应的地方相对 host 偏多少
   *   place：[每个生成物放在反应处的哪里]；map：[每个生成物原子来自 [第几个反应物, 第几个原子]]（不写就按元素就近配）
   *   split：先拆成一个个原子，再重新组合（课本上画分解反应常这样画）
   *   after：[每个生成物之后怎样：{ leave: true, v: [x,y,z], gas: true }]；dur：原子挪过去要几秒；approach：飞过去要几秒
   *   burst：[开始、结束时的闪光颜色]；eq：反应进行时上方显示的式子
   */
  const start = (rx, mols, { then } = {}) => {
    if (mols.some((m) => !m || m.busy)) return null;
    mols.forEach((m) => { m.busy = true; m.labelK = 1; });
    const host = rx.host ?? mols.length - 1;
    const at = rx.atAbs ? rx.atAbs(mols) : mols[host].g.position.clone().add(V(rx.at || [0, 0, 0]));
    const e = { rx, mols, host, at, t: 0, then, A: rx.approach ?? (mols.length > 1 ? 2 : 0) };
    events.push(e); return e;
  };
  const stepEvent = (e, dt) => {
    const { rx, mols, at } = e;
    e.t += dt;
    if (e.t < e.A) {
      mols.forEach((m, i) => {
        if (i === e.host || m.fixed) return;
        const to = rx.nearAbs ? rx.nearAbs(mols, i, e) : at.clone().add(V(rx.near?.[i] || [0.6 + i * 0.4, 1.3, 0]));
        if (to) m.g.position.lerp(to, Math.min(1, dt * 1.8 + e.t * 0.015));
      });
      return;
    }
    if (!e.temp) {
      // 借出原子：按生成物的原子编号排好，算出每个原子从哪来、到哪去
      const src = mols.map(atomWorld), srcFlat = [], srcIdx = new Map();
      mols.forEach((m, i) => m.atoms.forEach((a, j) => { srcIdx.set(i + ':' + j, srcFlat.length); srcFlat.push({ el: a.userData.el, p: src[i][j], used: false, k: a.scale.x / EL[a.userData.el][1], color: a.material.color.clone() }); }));
      e.pos = rx.out.map((k, pi) => (rx.placeAbs ? rx.placeAbs(mols, e)[pi] : at.clone().add(V(rx.place?.[pi] || [0, 0, 0]))));
      const outAtoms = []; rx.out.forEach((k, pi) => MOL[k].atoms.forEach(([el, x, y, z]) => outAtoms.push({ el, p: e.pos[pi].clone().add(V([x, y, z])), pi })));
      const order = outAtoms.map((o, n) => {
        if (rx.map) { const [mi, ai] = rx.map[n]; const s = srcIdx.get(mi + ':' + ai); srcFlat[s].used = true; return s; }
        let best = -1, bd = 1e9; srcFlat.forEach((s, k) => { if (s.used || s.el !== o.el) return; const d = s.p.distanceTo(o.p); if (d < bd) { bd = d; best = k; } });
        srcFlat[best].used = true; return best;
      });
      // temp[k] 对应 srcFlat[k]；dst[k] 是它要去的地方
      e.src = srcFlat.map((s) => s.p.clone()); e.dst = new Array(srcFlat.length);
      order.forEach((s, n) => { e.dst[s] = outAtoms[n].p; });
      if (rx.split) { const c = e.src.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / e.src.length); e.mid = e.src.map((p, k) => p.clone().sub(c).multiplyScalar(rx.spread ?? 1.9).add(c).add(V([rnd(-0.3, 0.3), rnd(-0.3, 0.3), rnd(-0.3, 0.3)]))); }
      e.temp = srcFlat.map((s) => { const a = makeAtom(s.el, true, s.k); a.material.color.copy(s.color); a.material.transparent = false; a.userData.own = true; W0.add(a); return a; });      // 借出来的原子：颜色、大小和原来一样（氧化铜里的铜还是深色，反应完才露出铜色）
      const oldB = mols.flatMap((m, i) => MOL[m.kind].bonds.map(([a, b, n]) => [srcIdx.get(i + ':' + a), srcIdx.get(i + ':' + b), n, 'old']));
      let base = 0; const newB = [];
      rx.out.forEach((k) => { for (const [a, b, n] of MOL[k].bonds) newB.push([order[base + a], order[base + b], n, 'new']); base += MOL[k].atoms.length; });
      e.tb = [...oldB, ...newB].flatMap(([i, j, n, w]) => Array.from({ length: n }, (_, k) => [makeBond(), i, j, n, k, w]));
      e.tb.forEach(([b]) => W0.add(b));
      mols.forEach((m) => { m.g.visible = false; });
      burst(rx.split ? at.clone() : e.src[0].clone().lerp(at, 0.5), rx.burst?.[0] ?? 0xffd27a);
    }
    const D = rx.dur ?? 2, u = ease((e.t - e.A) / D); e.u = (e.t - e.A) / D;
    let P;
    if (rx.split) {
      // 先：键断开，原子散开；停一下（看清楚是一个个原子）；再：原子重新连上
      const q = e.u;
      P = q < 0.4 ? e.src.map((p, k) => p.clone().lerp(e.mid[k], ease(q / 0.4))) : q < 0.6 ? e.mid.map((p) => p.clone()) : e.mid.map((p, k) => p.clone().lerp(e.dst[k], ease((q - 0.6) / 0.4)));
      for (const [b, i, j, n, k, w] of e.tb) setBond(b, P[i], P[j], n, k, w === 'old' ? 1 - ease(q / 0.3) : ease((q - 0.75) / 0.25));
    } else {
      P = e.src.map((p, k) => { const q = p.clone().lerp(e.dst[k], u); q.y += Math.sin(Math.PI * u) * 0.35 * (k % 2 ? 1 : -1); return q; });       // 原子沿着一点弧线挪过去
      for (const [b, i, j, n, k, w] of e.tb) setBond(b, P[i], P[j], n, k, w === 'old' ? 1 - ease(u * 1.6) : ease(u * 1.6 - 0.6));
    }
    e.temp.forEach((a, k) => a.position.copy(P[k]));
    if (e.t >= e.A + D) {
      cleanTemp(e); mols.forEach(removeMol);
      const made = rx.out.map((k, pi) => {
        const a = rx.after?.[pi] || {};
        const p = addMol(k, e.pos[pi].clone(), { gas: !!a.gas, leaving: !!a.leave, fixed: !!a.fixed });
        p.g.rotation.set(0, 0, 0); p.labelK = 1; p.labelT = 3; if (rx.glow) p.glow = 1;
        if (a.v) p.v.set(...a.v);
        return p;
      });
      if (rx.burst?.[1] != null) burst(at, rx.burst[1]);
      events.splice(events.indexOf(e), 1);
      e.then?.(made);
    }
  };

  // ================= 给场景用的 =================
  const view = { paper: null, film: 0, liquid: 0x5cc2f0, speed: 1 };
  // 在底座的圆里均匀撒（视窗模式：在长方形里）
  const inDisc = (y) => { if (!HOLO) return new THREE.Vector3(rnd(-BOX.x, BOX.x), y, rnd(-BOX.z, BOX.z)); const r = Math.sqrt(Math.random()) * (HR - 1.4), a = rnd(0, Math.PI * 2); return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r); };
  const ctx = {
    BOX, HR, rnd, V, events, view,
    get mols() { return molecules; },
    add: addMol, remove: removeMol, start, burst,
    count: (k, fn = (m) => !m.leaving) => molecules.filter((m) => m.kind === k && fn(m)).length,
    free: (k) => molecules.filter((m) => m.kind === k && !m.busy && !m.leaving && !m.fadeOut),
    /** 离子成对地进出这一小块溶液（保持电荷平衡）：pairIn('H+', 'Cl-') 慢慢出现，pairOut('Mg2+', 'Cl-') 慢慢淡出 */
    pairIn(cat, an) { const [nc, na] = pairOf(cat, an); for (let i = 0; i < nc; i++) addMol(cat, ctx.inLiquid(), { fadeIn: true, dimK: 0 }); for (let i = 0; i < na; i++) addMol(an, ctx.inLiquid(), { fadeIn: true, dimK: 0 }); },
    pairOut(cat, an) {
      const [nc, na] = pairOf(cat, an), cs = ctx.free(cat).slice(0, nc), as = ctx.free(an).slice(0, na);
      if (cs.length < nc || as.length < na) return false;
      for (const m of [...cs, ...as]) m.fadeOut = true;
      return true;
    },
    nearest: (list, p) => list.reduce((b, m) => (!b || m.g.position.distanceTo(p) < b.g.position.distanceTo(p) ? m : b), null),
    inLiquid: () => inDisc(rnd(0.55, Math.max(0.6, view.film - 0.55))),
    inGas: () => inDisc(rnd(view.film + 1.2, BOX.top)),
  };

  // ================= 状态 =================
  let st = {}, openK = 0, opening = false, anchor = null, lastEq = '';
  let yaw = 0.25, pitch = 0.32, dist = 15.5, dragging = null;
  const look = new THREE.Vector3(0, 2.4, 0), focusAt = new THREE.Vector3(0, 2.4, 0); let zoom = 0;
  const reset = () => {
    events.forEach((e) => e.temp && cleanTemp(e)); events.length = 0;
    while (molecules.length) removeMol(molecules[0]);
    scene.init(ctx, st);
  };

  const step = (dt) => {
    scene.step(ctx, st, dt);
    for (const e of [...events]) stepEvent(e, dt);
    // 乱动：气体里飞得快、液体里挤着晃
    const film = view.film;
    for (const m of molecules) {
      if (m.busy || m.fixed) continue;
      const gas = m.gas || m.leaving, p = m.g.position;
      m.v.addScaledVector(new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)), (gas ? 9 : 3) * dt * view.speed * (m.heavy ? 0.45 : 1));
      if (m.leaving) m.v.y += 3 * dt;
      if (m.pull) m.v.addScaledVector(m.pull, dt);
      m.v.multiplyScalar(Math.pow(gas ? 0.6 : 0.3, dt));
      p.addScaledVector(m.v, dt);
      m.g.rotation.x += m.w.x * dt * 0.8 * view.speed; m.g.rotation.y += m.w.y * dt * 0.8 * view.speed;
      if (HOLO) { const rr = Math.hypot(p.x, p.z), lim = HR - 1; if (rr > lim) { p.x *= lim / rr; p.z *= lim / rr; m.v.x *= -0.5; m.v.z *= -0.5; } }
      else { p.x = Math.max(-BOX.x, Math.min(BOX.x, p.x)); p.z = Math.max(-BOX.z, Math.min(BOX.z, p.z)); }
      if (!m.leaving) {
        const lo = gas ? (film > 0.05 ? film + 0.9 : 0.9) : 0.5, hi = gas ? BOX.top : Math.max(0.5, film - 0.5);
        if (p.y < lo) { p.y = lo; m.v.y = Math.abs(m.v.y) * 0.6; } if (p.y > hi) { p.y = hi; m.v.y = -Math.abs(m.v.y) * 0.6; }
      }
      if (m.glowS) { const M = MOL[m.kind]; m.glow = Math.max(0, m.glow - dt * 0.45); m.glowS.material.opacity = (M.glowBase || 0) + 0.6 * m.glow; }
      if (m.labelT != null) { m.labelT -= dt; if (m.labelT <= 0) { m.labelK = 0; m.labelT = null; } }
    }
    for (const m of [...molecules]) if (m.leaving && m.g.position.y > BOX.top + 5) removeMol(m);
    // 反应的时候：不参与的分子变淡、从反应的地方退开一点，只有那几个是实的
    const parts = new Set(events.flatMap((e) => e.mols));
    const ctr = events[0] ? events[0].at : null;
    for (const m of molecules) {
      const want = m.fadeOut ? 0 : scene.solid || !ctr || parts.has(m) || m.glow > 0.5 ? 1 : HOLO ? scene.dim ?? 0.5 : 0.22;      // scene.solid：一粒固体，旁边的原子不变淡
      m.dimK += (want - m.dimK) * Math.min(1, dt * (m.fadeOut || m.fadeIn ? 1.6 : 3));
      if (m.fadeIn && m.dimK > 0.9) m.fadeIn = false;
      for (const a of m.atoms) a.material.opacity = m.dimK;
      for (const [b] of m.bonds) b.material.opacity = m.dimK;
      if (ctr && !parts.has(m) && !m.busy && !m.fixed) { const d = m.g.position.clone().sub(ctr); const L = d.length(); if (L < 3.6) m.g.position.addScaledVector(d.normalize(), (3.6 - L) * dt * 1.5); }
    }
    for (const m of [...molecules]) if (m.fadeOut && m.dimK < 0.04) removeMol(m);          // 慢慢淡出：离开这一小块（溶液很大，离子在里面走来走去）
    // 晶格的连线（scene.links：[[点1, 点2], …]，分子世界自己的坐标）：画成细棍；原子被拉走，连线自然就断了
    const LK = scene.links ? scene.links(ctx) : [];
    while (linkPool.length < LK.length) { const b = new THREE.Mesh(bondGeo, linkMat); W0.add(b); linkPool.push(b); }
    linkPool.forEach((b, i) => { if (i < LK.length) { setBond(b, LK[i][0], LK[i][1], 1, 0, 1); b.scale.x = b.scale.z = 0.06; } else b.visible = false; });
    // 化学式标签：只在参与反应的分子上亮（离子的场景：一直亮，参与反应的更亮）
    const always = typeof scene.labels === 'function' ? scene.labels : scene.labels === 'always' ? () => true : () => false;
    for (const m of molecules) {
      const want = m.fadeOut || (scene.labelOnly && !scene.labelOnly(m.kind, m)) ? 0 : m.busy || m.labelK ? 0.95 : always(m.kind, m) ? 0.75 * m.dimK : 0;      // scene.labelOnly：只给这些分子标
      m.label.material.opacity += (want - m.label.material.opacity) * Math.min(1, dt * 5);
      m.label.position.copy(m.g.position).add(new THREE.Vector3(0, MOL[m.kind].labelY ?? (m.kind === 'H2CO3' ? 2.1 : MOL[m.kind].atoms.length === 1 ? 1.1 : 1.5), 0));      // MOL.labelY：标签抬多高
      if (!m.g.visible) m.label.material.opacity *= 0.85;
    }
    for (const f of [...fx]) {
      f.t += dt; const k = f.t / 0.9;
      f.r.scale.setScalar(0.5 + k * 5); f.r.material.opacity = Math.max(0, 0.9 * (1 - k)); f.gl.scale.setScalar(3.2 * (1 - k * 0.6)); f.gl.material.opacity = Math.max(0, 0.8 * (1 - k));
      if (k >= 1) { W0.remove(f.r, f.gl); f.r.material.dispose(); f.gl.material.dispose(); fx.splice(fx.indexOf(f), 1); }
    }
    flashLight.intensity *= Math.pow(0.02, dt);
    // 底座的颜色、液体层厚度
    paper.visible = view.paper != null;
    if (view.paper != null) { paperMat.color.set(view.paper); paperMat.emissive.set(view.paper); }
    waterMat.color.set(view.liquid); surfMat.color.set(view.liquid).lerp(new THREE.Color(0xffffff), 0.6);
    water.scale.y += (Math.max(0.02, film) - water.scale.y) * Math.min(1, dt * 3); water.position.y = water.scale.y / 2; surf.position.y = water.scale.y + 0.01; surf.visible = water.scale.y > 0.1;
    dust.rotation.y += dt * 0.01;
    // 化学式、说明
    const T = scene.text(ctx, st);
    if (T.eq !== lastEq) { eq.innerHTML = T.eq; lastEq = T.eq; }
    eq.classList.toggle('on', events.length > 0 || !!T.on);
    cap.innerHTML = T.cap;
  };

  // ================= 视窗的位置、打开 / 关上的动画 =================
  const layout = () => {
    // 视窗放在器材上方（左边是面板，不压住它），器材留在下面，中间一道光连着
    const [fxp0, fyp0] = anchor ? anchor() : [innerWidth / 2, innerHeight * 0.8];
    if (HOLO) {
      const k = ease(openK);
      dim.style.opacity = k.toFixed(3); dim.style.setProperty('--fx', fxp0 + 'px'); dim.style.setProperty('--fy', fyp0 + 'px');
      const mid = 430 + (innerWidth - 430) / 2;
      hud.style.cssText = `left:${mid - 300}px;top:72px;width:600px;opacity:${k}`;
      closeB.style.cssText = `left:${innerWidth - 150}px;top:64px;opacity:${k}`;
      scale.style.cssText = `left:${mid - 300}px;top:40px;width:600px;opacity:${k}`;
      if (renderer.domElement.width !== Math.round(innerWidth * Math.min(devicePixelRatio, 2))) renderer.setSize(innerWidth, innerHeight);
      return;
    }
    const D = Math.round(Math.min(540, innerHeight * 0.6, innerWidth * 0.46)), [fxp, fyp] = [fxp0, fyp0];
    const cx = Math.max(D / 2 + 430, Math.min(innerWidth - D / 2 - 70, fxp)), cy = Math.max(D / 2 + 46, Math.min(fyp - D / 2 - 40, innerHeight * 0.4));
    const k = ease(openK), r = (D / 2) * (0.15 + 0.85 * k);
    port.style.cssText = `left:${cx - D / 2}px;top:${cy - D / 2}px;width:${D}px;height:${D}px;clip-path:circle(${r}px at 50% 50%);opacity:${Math.min(1, k * 1.5)}`;
    hud.style.cssText = `left:${cx - D * 0.36}px;top:${cy + D / 2 - 128}px;width:${D * 0.72}px;opacity:${k}`;
    closeB.style.cssText = `left:${cx + D * 0.3}px;top:${cy - D / 2 + 6}px;opacity:${k}`;
    scale.style.cssText = `left:${cx - D / 2}px;top:${cy - D / 2 - 26}px;width:${D}px;opacity:${k}`;
    dim.style.opacity = k.toFixed(3);
    dim.style.setProperty('--fx', fxp + 'px'); dim.style.setProperty('--fy', fyp + 'px');
    // 一道光：从器材连到视窗（两条切线围成的一块）
    const dx = cx - fxp, dy = cy - fyp, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, w0 = 16;
    beam.setAttribute('width', innerWidth); beam.setAttribute('height', innerHeight);
    beam.querySelector('path').setAttribute('d', `M${fxp + nx * w0},${fyp + ny * w0} L${cx + nx * r * 0.9},${cy + ny * r * 0.9} L${cx - nx * r * 0.9},${cy - ny * r * 0.9} L${fxp - nx * w0},${fyp - ny * w0} Z`);
    beam.style.opacity = (k * 0.8).toFixed(3);
    const px = D * Math.min(devicePixelRatio, 2);
    if (renderer.domElement.width !== px) { renderer.setSize(D, D, false); renderer.domElement.style.cssText = `width:${D}px;height:${D}px`; cam.aspect = 1; cam.updateProjectionMatrix(); }
  };
  // 拖动转视角（视窗模式）
  port.addEventListener('pointerdown', (e) => { dragging = [e.clientX, e.clientY, yaw, pitch]; port.setPointerCapture(e.pointerId); e.stopPropagation(); });
  port.addEventListener('pointermove', (e) => { if (!dragging) return; yaw = dragging[2] - (e.clientX - dragging[0]) * 0.008; pitch = Math.max(0.02, Math.min(1.2, dragging[3] + (e.clientY - dragging[1]) * 0.006)); });
  port.addEventListener('pointerup', () => { dragging = null; });
  port.addEventListener('wheel', (e) => { dist = Math.max(8, Math.min(24, dist + e.deltaY * 0.01)); e.preventDefault(); }, { passive: false });
  dim.addEventListener('pointerdown', (e) => { e.stopPropagation(); api.close(); });
  const onKey = (e) => { if (api.isOpen && e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); api.close(); } };
  addEventListener('keydown', onKey, true);

  const api = {
    get isOpen() { return opening; },
    onClose: null,
    ctx,
    open(anchorFn, s) {
      anchor = anchorFn; if (s) st = { ...st, ...s };
      if (!opening) { opening = true; reset(); }
      root.hidden = false;
    },
    close() { if (!opening) return; opening = false; api.onClose?.(); },
    set(s) { st = { ...st, ...s }; },
    reset(s) { if (s) st = { ...st, ...s }; reset(); },
    /** 圆窗里的视角（和拖动、滚轮一样）：view({ yaw, pitch, dist }) 设定，view() 读出（录素材时用来定机位） */
    view(v) { if (v) { if (v.yaw != null) yaw = v.yaw; if (v.pitch != null) pitch = v.pitch; if (v.dist != null) dist = v.dist; } return { yaw, pitch, dist }; },
    update(dt) {
      openK = Math.max(0, Math.min(1, openK + (opening ? dt / 0.9 : -dt / 0.5)));
      if (openK <= 0 && !opening) { root.hidden = true; return; }
      root.classList.toggle('live', opening);
      step(Math.min(dt, 1 / 30));
      layout();
      if (HOLO) {
        // 全息：分子世界放到器材上方（从器材上长出来、慢慢升起），镜头和舞台的镜头完全一样
        const P = place(), k = ease(openK), lift = 3.2 * k;
        W0.position.copy(P.pos).addScaledVector(new THREE.Vector3(0, 1, 0), P.scale * lift);
        W0.scale.setScalar(P.scale * (0.15 + 0.85 * k));
        column.scale.set(1, lift + 0.8, 1); column.position.y = -0.8 - (lift + 0.8) / 2; column.material.opacity = k;
        baseRing.material.opacity = 0.85 * k;
        const C = P.cam; C.updateMatrixWorld();
        cam.matrixAutoUpdate = false; cam.matrixWorldAutoUpdate = false;
        cam.matrixWorld.copy(C.matrixWorld); cam.matrixWorldInverse.copy(C.matrixWorldInverse);
        cam.projectionMatrix.copy(C.projectionMatrix); cam.projectionMatrixInverse.copy(C.projectionMatrixInverse);
        spot.intensity = 0; flashLight.intensity = Math.min(flashLight.intensity, 6);
        const ev = events[0]; zoom += ((ev ? 1 : 0) - zoom) * Math.min(1, dt * 1.5);
        hemi.intensity = 1.1 - 0.5 * zoom; key.intensity = 2.2 - 0.9 * zoom;
        renderer.render(sc, cam);
        return;
      }
      if (!dragging) yaw += dt * 0.05;          // 慢慢转一点：看得出是立体的
      // 有反应的时候：镜头推向那几个分子，周围的光暗下来
      const ev = events[0];
      if (ev && !scene.still) focusAt.copy(ev.at).add(new THREE.Vector3(0, 0.6, 0)); else focusAt.set(0, 2.4, 0);
      zoom += ((ev ? 1 : 0) - zoom) * Math.min(1, dt * 1.5);
      look.lerp(focusAt, Math.min(1, dt * 1.8));
      const dd = dist * (1 - (scene.still ? 0 : 0.28) * zoom);                // scene.still：镜头不推近
      cam.position.set(look.x + Math.sin(yaw) * Math.cos(pitch) * dd, look.y + Math.sin(pitch) * dd, look.z + Math.cos(yaw) * Math.cos(pitch) * dd);
      cam.lookAt(look);
      hemi.intensity = 1.1 - 0.7 * zoom; key.intensity = 2.2 - 1.3 * zoom; rim.intensity = 1.2 - 0.6 * zoom;
      spot.position.copy(look).add(new THREE.Vector3(1.2, 2.2, 2.5)); spot.intensity = 60 * zoom;
      renderer.render(sc, cam);
    },
    dispose() { removeEventListener('keydown', onKey, true); while (molecules.length) removeMol(molecules[0]); renderer.dispose(); root.remove(); },
  };
  return api;
}

const ARR = '<span class="arr">══</span>';

// ================= 场景：石蕊纸花上 CO₂ + H₂O ⇌ H₂CO₃ =================
// st：{ gas: 'CO2' | 'air', wet, acid, paper: '#8b5fb0' }。碳酸分子的个数跟着 acid 走。
export function litmusScene() {
  const FILM = 2.4, MAX_ACID = 6, MAX_WATER = 9, N_CO2 = 7;
  // H₂CO₃ 的每个原子来自哪里：水的氧连到碳上（带着一个氢），水的另一个氢转到二氧化碳的一个氧上
  const FORM = { in: ['CO2', 'H2O'], out: ['H2CO3'], host: 1, at: [0, 0.2, 0], near: [[0, 1.3, 0], null], map: [[0, 0], [0, 1], [1, 0], [0, 2], [1, 1], [1, 2]], glow: true, burst: [0xffd27a, 0xff6f86], dur: 2 };
  const BREAK = { in: ['H2CO3'], out: ['CO2', 'H2O'], place: [[0, 1.4, 0], [0, -0.2, 0]], map: [[0, 0], [0, 1], [0, 3], [0, 2], [0, 4], [0, 5]], after: [{ gas: true, leave: true, v: [0, 2.6, 0] }, {}], burst: [0x9fd0ff], dur: 2.2, approach: 0 };
  let dir = 1, eqT = 0.6;
  const fillGas = (c, st) => {
    const wantC = st.gas === 'CO2' ? N_CO2 : 0, wantAir = st.gas === 'CO2' ? 0 : 4;
    while (c.count('CO2', (m) => !m.leaving && m.gas) < wantC) c.add('CO2', c.V([c.rnd(-c.BOX.x, c.BOX.x), c.BOX.top + c.rnd(0, 3), c.rnd(-c.BOX.z, c.BOX.z)]), { gas: true });
    while (c.count('N2') < wantAir) c.add('N2', c.inGas(), { gas: true });
    while (c.count('O2') < (wantAir ? 1 : 0)) c.add('O2', c.inGas(), { gas: true });
    for (const m of c.mols) if (m.gas && !m.busy && !m.leaving && ((m.kind === 'CO2' && !wantC) || ((m.kind === 'N2' || m.kind === 'O2') && !wantAir))) m.leaving = true;
  };
  const nForming = (c) => c.events.filter((e) => e.rx === FORM).length;
  return {
    labels: 'react',
    init(c, st) {
      dir = 1; eqT = 0.6;
      c.view.film = st.wet > 0.05 || st.acid > 0.05 ? FILM : 0.02;
      const nA = Math.round(st.acid * MAX_ACID), nW = Math.max(0, Math.round(st.wet * MAX_WATER) - nA);
      for (let i = 0; i < nA; i++) c.add('H2CO3', c.inLiquid());
      for (let i = 0; i < nW; i++) c.add('H2O', c.inLiquid());
      for (let i = 0; i < (st.gas === 'CO2' ? N_CO2 : 0); i++) c.add('CO2', c.inGas(), { gas: true });
      fillGas(c, st);
    },
    step(c, st, dt) {
      c.view.paper = st.paper; c.view.liquid = 0x5cc2f0;
      c.view.film = st.wet > 0.05 || c.count('H2CO3') ? FILM : 0.02;
      fillGas(c, st);
      // 水：喷上水 / 干掉（多出来的水分子飞走 = 蒸发）
      const nA = c.count('H2CO3') + nForming(c);
      const wantW = Math.max(0, Math.round(st.wet * MAX_WATER) - nA);
      const freeW = c.free('H2O');
      if (freeW.length < wantW && st.wet > 0.05) c.add('H2O', c.V([c.rnd(-c.BOX.x, c.BOX.x), FILM - 0.4, c.rnd(-c.BOX.z, c.BOX.z)]));
      if (freeW.length > wantW) { freeW[0].leaving = true; freeW[0].gas = true; }
      // 反应：碳酸分子的个数跟着 acid 走
      const wantA = Math.round(st.acid * MAX_ACID);
      if (c.events.length < 2) {
        const co2 = c.mols.filter((m) => m.kind === 'CO2' && m.gas && !m.busy && !m.leaving && m.g.position.y < c.BOX.top).sort((a, b) => a.g.position.y - b.g.position.y)[0];
        const w = c.free('H2O')[0];
        eqT -= dt;
        if (nA < wantA && co2 && w) { c.start(FORM, [co2, w]); dir = 1; }
        else if (c.count('H2CO3') > wantA && !c.events.some((e) => e.rx === BREAK)) { const a = c.free('H2CO3')[0]; if (a) { c.start(BREAK, [a]); dir = -1; } }
        // 平衡：在二氧化碳里、纸是湿的，碳酸分子够数了也一直有生成、有分解（总数不变）
        else if (!c.events.length && eqT <= 0 && co2 && w && st.gas === 'CO2' && st.wet > 0.3 && nA >= wantA && wantA > 0) {
          eqT = 7; dir = 1;
          c.start(FORM, [co2, w], { then: ([p]) => { const a = c.free('H2CO3').find((m) => m !== p); if (a) { c.start(BREAK, [a]); dir = -1; } } });
        }
      }
      // 二氧化碳往水膜上飘
      for (const m of c.mols) m.pull = m.kind === 'CO2' && m.gas && !m.leaving && st.wet > 0.05 ? c.V([0, -0.9, 0]) : null;
    },
    text(c, st) {
      const eq = dir > 0 ? `${f('CO2')} + ${f('H2O')} ${ARR} ${f('H2CO3')}` : `${f('H2CO3')} ${ARR} ${f('CO2')}↑ + ${f('H2O')}`;
      const nAc = c.count('H2CO3');
      const cap = c.events.length
        ? (dir > 0 ? '二氧化碳分子撞上水分子：原子重新连接，<b>变成碳酸分子</b>　C 1 · O 3 · H 2，一个不多、一个不少' : '碳酸分子不稳定，<b>拆开了</b>：二氧化碳飞走，水留下')
        : st.wet < 0.05 && st.gas === 'CO2' ? '纸是干的：二氧化碳碰上去，<b>没有水，不反应</b>'
        : st.wet >= 0.05 && st.gas !== 'CO2' && nAc === 0 ? '纸上有水，可是<b>没有二氧化碳</b>：不反应'
        : nAc ? `纸上的水里有 <b>${nAc}</b> 个碳酸分子——石蕊遇酸变红` : '纸是干的，周围是空气';
      return { eq, cap };
    },
  };
}

// ================= 场景：电解水 2H₂O ══ 2H₂↑ + O₂↑ =================
// st：{ on: 通电没有, salt: 加了硫酸钠没有 }。通电时每隔一会儿有两个水分子分解；数着生成了几个氢分子、几个氧分子。
export function electrolysisScene() {
  const FILM = 5.6, N_W = 11;
  const SPLIT = { in: ['H2O', 'H2O'], out: ['H2', 'H2', 'O2'], host: 0, near: [null, [2.2, 0.2, 0]], at: [1.1, 0.4, 0], place: [[-1.5, 1, 0], [-1.5, -1, 0], [1.7, 0, 0]], split: true, dur: 4.6,
    after: [{ leave: true, gas: true, v: [0, 0.6, 0] }, { leave: true, gas: true, v: [0, 0.6, 0] }, { leave: true, gas: true, v: [0, 0.6, 0] }], burst: [0xbfe4ff, 0xfff1c0] };
  let made = { H2: 0, O2: 0 }, wait = 0.8;
  return {
    labels: 'react', dim: 0.3,
    init(c) {
      made = { H2: 0, O2: 0 }; wait = 0.8;
      c.view.film = FILM; c.view.paper = null;
      for (let i = 0; i < N_W; i++) c.add('H2O', c.inLiquid());
    },
    step(c, st, dt) {
      c.view.film = FILM; c.view.paper = null; c.view.liquid = 0x6cc6ee;
      if (c.count('H2O') < N_W && Math.random() < dt * 2) c.add('H2O', c.V([c.rnd(-c.BOX.x, c.BOX.x), 0.8, c.rnd(-c.BOX.z, c.BOX.z)]));       // 周围的水补过来（水多得很）
      // 生成的氢气、氧气：慢慢往上浮出水面（在管里聚成气泡）
      for (const m of c.mols) if ((m.kind === 'H2' || m.kind === 'O2') && m.leaving) m.v.y = Math.min(m.v.y, 1.6);
      if (!st.on) return;
      wait -= dt * (st.salt ? 1 : 0.05);          // 纯水几乎不导电：不加硫酸钠，反应慢得几乎看不到
      if (wait > 0 || c.events.length) return;
      const score = (m) => { const p = m.g.position; return Math.abs(p.x + 1) + Math.abs(p.z - 2) + Math.abs(p.y - 2.6); };        // 挑靠前、靠中间的水分子来分解：看得清
      const ws = c.free('H2O').sort((a, b) => score(a) - score(b));
      const a = ws[0], b = a && c.nearest(ws.filter((m) => m !== a), a.g.position);
      if (a && b && c.start(SPLIT, [a, b], { then: () => { made.H2 += 2; made.O2 += 1; } })) wait = 2.2;
    },
    text(c, st) {
      const eq = `${f('H2O', '2')} <span class="arr" style="position:relative">══<span style="position:absolute;left:0;right:0;top:-0.75em;font-size:0.45em;letter-spacing:0;text-align:center">通电</span></span> ${f('H2', '2')}↑ + ${f('O2')}↑`;
      const tally = made.H2 ? `　已经生成 <b>${made.H2}</b> 个 ${f('H2')}、<b>${made.O2}</b> 个 ${f('O2')}——总是 <b>2∶1</b>` : '';
      const e = c.events[0];
      const cap = e ? (e.u == null || e.u < 0.6 ? '通电时，两个水分子<b>拆开</b>，成了 4 个氢原子、2 个氧原子' : `原子重新组合：<b>每两个氢原子连成一个氢分子，两个氧原子连成一个氧分子</b>${tally}`)
        : !st.on ? (made.H2 ? `断电了，水分子不再分解。${tally}` : '还没通电：水分子只是挤来挤去，<b>不会分开</b>')
        : !st.salt ? '纯水几乎不导电：水分子很难分解（加少量硫酸钠增强导电性）'
        : `通着电，水分子一个个被分解${tally}`;
      return { eq, cap };
    },
  };
}

// ================= 场景：中和反应 H⁺ + OH⁻ ══ H₂O =================
// st：{ base: OH⁻ 原来有多少份（1 = 课本的 5 mL）, acid: 加进去的 H⁺ 相当于多少份（1 = 恰好中和）, color: 溶液颜色 }
export function neutralScene() {
  const FILM = 6.2, N = 5, N_W = 3;
  const RX = { in: ['H+', 'OH-'], out: ['H2O'], host: 1, near: [[1.1, 0.5, 0], null], map: [[1, 0], [1, 1], [0, 0]], dur: 1.6, approach: 1.4, burst: [0xffd27a, 0x9fe0ff] };
  let fed = 0, react = 0;
  const top = (c) => c.V([c.rnd(-1.2, 1.2), FILM - 0.6, c.rnd(-1, 1)]);
  // 加进来的盐酸画成几个 H⁺：没到恰好中和时往少里算，最后一个 OH⁻ 正好在恰好中和那一滴被带走（和酚酞变色对得上）；过量了往多里算，多一点也看得见
  // （以前四舍五入：滴到九成，分子画面里 OH⁻ 就没了、说“酚酞变无色”，烧杯里却还是红的）
  const units = (a) => (a <= 1 ? Math.floor(N * a + 1e-6) : N + Math.ceil(N * (a - 1) - 1e-6));
  return {
    labels: (k) => k !== 'H2O', dim: 0.6,        // 离子一直标着；水分子只在刚生成时标
    init(c, st) {
      c.view.film = FILM; c.view.paper = null;
      const nOH = N - Math.min(N, units(st.acid)), nCl = Math.min(2 * N, units(st.acid)), nH = Math.max(0, nCl - N);      // 电荷平衡：Na⁺ + H⁺ = OH⁻ + Cl⁻
      fed = nCl; react = N - nOH;
      for (let i = 0; i < N; i++) c.add('Na+', c.inLiquid());
      for (let i = 0; i < nOH; i++) c.add('OH-', c.inLiquid());
      for (let i = 0; i < nCl; i++) c.add('Cl-', c.inLiquid());
      for (let i = 0; i < nH; i++) c.add('H+', c.inLiquid());
      for (let i = 0; i < N_W + react; i++) c.add('H2O', c.inLiquid());
    },
    step(c, st, dt) {
      c.view.film = FILM; c.view.paper = null; c.view.liquid = st.color ?? 0x8fd0f0;
      // 滴进来的盐酸：H⁺ 和 Cl⁻ 一起从上面落进来
      const want = Math.min(2 * N, units(st.acid));
      if (fed < want) { fed++; const p = top(c); const h = c.add('H+', p); h.v.set(c.rnd(-1, 1), -1.6, c.rnd(-1, 1)); const cl = c.add('Cl-', p.clone().add(c.V([1.2, 0, 0.4]))); cl.v.set(c.rnd(-2.5, 2.5), -1.2, c.rnd(-2.5, 2.5)); }
      // H⁺ 碰上 OH⁻：结合成水（离得近的先反应——不搅拌时上面那层先褪色）
      if (c.events.length < 2) {
        const h = c.free('H+')[0], oh = h && c.nearest(c.free('OH-'), h.g.position);
        if (h && oh) c.start(RX, [h, oh], { then: () => { react++; } });
      }
      // 水分子太多就悄悄少画几个（每个分子本来就代表很多个）
      const ws = c.free('H2O').filter((m) => !m.labelK); if (ws.length > 7) c.remove(ws[0]);
    },
    text(c) {
      const eq = `${f('H+')} + ${f('OH-')} ${ARR} ${f('H2O')}`;
      const nOH = c.count('OH-'), nH = c.count('H+') - c.events.length;
      const cap = c.events.length ? `${f('H+')} 碰上 ${f('OH-')}，<b>结合成水分子</b>；${f('Na+')} 和 ${f('Cl-')} 没有参加反应，还在溶液里`
        : nOH && !fed ? `氢氧化钠溶液里是 ${f('Na+')} 和 ${f('OH-')}：有 ${f('OH-')}，溶液显碱性，酚酞变红`
        : nOH ? `还剩 <b>${nOH}</b> 个 ${f('OH-')}：溶液还显碱性，酚酞还是红的`
        : nH > 0 ? `盐酸加多了：多出来的 ${f('H+')} 找不到 ${f('OH-')}，溶液显酸性（酚酞在酸性溶液里也是无色的）`
        : `${f('OH-')} 正好被 ${f('H+')} 用完，都变成了水；溶液里剩下 ${f('Na+')} 和 ${f('Cl-')}（就是氯化钠）——酚酞变无色`;
      return { eq, cap };
    },
  };
}

// ================= 场景：金属和盐溶液（金属活动性） =================
// st：{ metal: 'Al' | 'Cu', sol: 0 硫酸铜 / 1 硝酸银 / 2 硫酸铝, dep: 表面长出来的东西（0~1）, film: 铝表面还有没有氧化铝薄膜 }
// 金属表面是一层排好的金属原子；溶液里是离子。活泼的金属原子变成离子跑进溶液，溶液里不活泼金属的离子落到表面、变成原子。
export function metalScene() {
  const FILM = 6, NEV = 5, SP = 1.36, Y0 = 0.75;
  const ION = { 0: ['Cu2+', 'SO4 2-'], 1: ['Ag+', 'NO3-'], 2: ['Al3+', 'SO4 2-'], HCl: ['H+', 'Cl-'], H2SO4: ['H+', 'SO4 2-'] };
  const ACID = (st) => st.sol === 'HCl' || st.sol === 'H2SO4';
  const RUSTU = 4;          // 铁锈：最多画 4 个 Fe₂O₃
  const rustWant = (st) => (st.rust ? Math.round(st.rust * RUSTU) : 0);
  let made = 0, tryT = 1.5, bounce = null, key = '';
  const sites = [];
  for (let r = -4; r <= 4; r++) for (let q = -4; q <= 4; q++) { const x = (q + (r % 2 ? 0.5 : 0)) * SP, z = r * SP * 0.866; if (Math.hypot(x, z) < 4.5) sites.push(new THREE.Vector3(x, Y0, z)); }
  const surf = (c, k) => c.mols.filter((m) => m.kind === k && m.fixed && !m.busy);
  const front = (p) => Math.abs(p.x) + Math.abs(p.z - 1.2);            // 靠前、靠中间：看得清
  const rx = (st) => {
    if (ACID(st)) return st.metal === 'Cu' ? null : { in: [st.metal, 'H+', 'H+'], out: [st.metal + '2+', 'H2'], gain: 'H2', acid: true };
    if (st.metal === 'Al' && st.sol === 0) return { in: ['Al', 'Al', 'Cu2+', 'Cu2+', 'Cu2+'], out: ['Al3+', 'Al3+', 'Cu', 'Cu', 'Cu'], gain: 'Cu' };
    if (st.metal === 'Al' && st.sol === 1) return { in: ['Al', 'Ag+', 'Ag+', 'Ag+'], out: ['Al3+', 'Ag', 'Ag', 'Ag'], gain: 'Ag' };
    if (st.metal === 'Cu' && st.sol === 1) return { in: ['Cu', 'Ag+', 'Ag+'], out: ['Cu2+', 'Ag', 'Ag'], gain: 'Ag' };
    return null;
  };
  // 新长出来的原子放哪：先填空出来的位置，多的叠在上面（银长成枝杈）
  const slots = (c, metals, nNew) => {
    const at = metals.map((m) => m.g.position.clone());
    const out = at.slice(0, Math.min(nNew, at.length));
    while (out.length < nNew) {
      const base = at[out.length % at.length], col = c.mols.filter((m) => m.fixed && (m.kind === 'Ag' || m.kind === 'Cu') && Math.hypot(m.g.position.x - base.x, m.g.position.z - base.z) < 0.9);
      const topY = Math.max(base.y, ...col.map((m) => m.g.position.y), ...out.filter((p) => Math.hypot(p.x - base.x, p.z - base.z) < 0.9).map((p) => p.y));
      out.push(new THREE.Vector3(base.x + c.rnd(-0.35, 0.35), topY + SP * 0.92, base.z + c.rnd(-0.35, 0.35)));
    }
    return out;
  };
  const pick = (c, R) => {
    const nM = R.in.filter((k) => k === R.in[0]).length, ion = R.in[nM];
    const pool = surf(c, R.in[0]);
    // 优先挑挨着已经长出东西的地方（银的枝杈接着长），否则挑靠前的
    const grown = c.mols.filter((m) => m.fixed && m.kind === R.gain);
    const score = (m) => front(m.g.position) * 0.4 + (grown.length ? Math.min(...grown.map((g) => g.g.position.distanceTo(m.g.position))) : 0);
    const first = pool.sort((a, b) => score(a) - score(b))[0]; if (!first) return null;
    const metals = [first, ...pool.filter((m) => m !== first).sort((a, b) => a.g.position.distanceTo(first.g.position) - b.g.position.distanceTo(first.g.position)).slice(0, nM - 1)];
    const ions = c.free(ion).sort((a, b) => a.g.position.distanceTo(first.g.position) - b.g.position.distanceTo(first.g.position)).slice(0, R.in.length - nM);
    if (metals.length < nM || ions.length < R.in.length - nM) return null;
    return { mols: [...metals, ...ions], nM };
  };
  const reaction = (c, R, nM, metals) => {
    const nNew = R.out.length - nM, dst = R.acid ? [] : slots(c, metals, nNew);
    return { in: R.in, out: R.out, host: 0, approach: 2.2, dur: 2.2, burst: [0xffe2a0, 0xbfe4ff],
      atAbs: () => metals.reduce((a, m) => a.add(m.g.position), new THREE.Vector3()).multiplyScalar(1 / metals.length).add(c.V([0, 0.8, 0])),
      nearAbs: (mols, i) => (i < nM ? null : R.acid ? metals[0].g.position.clone().add(c.V([i === nM ? 1.6 : -1.6, 1.3, 0])) : dst[i - nM].clone().add(c.V([0, 1.5, 0]))),
      placeAbs: () => [...metals.map((m) => m.g.position.clone().add(c.V([c.rnd(-0.6, 0.6), 3.2, c.rnd(-0.6, 0.6)]))), ...(R.acid ? [metals[0].g.position.clone().add(c.V([1.3, 1.6, 0]))] : dst)],
      after: R.out.map((k, i) => (i < nM ? { v: [0, 1.4, 0] } : R.acid ? { leave: true, gas: true, v: [0, 1.2, 0] } : { fixed: true })) };
  };
  const build = (c, st) => {
    const film = st.metal === 'Al' && st.film;
    for (const p of sites) c.add(st.metal, p.clone(), { fixed: true });
    if (film) for (const p of sites) c.add('Ofilm', p.clone().add(c.V([SP / 2, 0.75, SP * 0.29])), { fixed: true });
    // 铁锈：铁表面上一块块的 Fe₂O₃（两个铁原子、三个氧原子）
    const fr = [...sites].sort((a, b) => front(a) - front(b));
    for (let u = 0; u < rustWant(st); u++) {
      const a = fr[u * 3], b = fr[u * 3 + 1], up = c.V([0, 1.25, 0]);
      const pa = a.clone().add(up), pb = b.clone().add(up), mid = pa.clone().lerp(pb, 0.5);
      c.add('FeR', pa, { fixed: true, unit: u }); c.add('FeR', pb, { fixed: true, unit: u });
      [mid.clone().add(c.V([0, 0.9, 0])), pa.clone().add(c.V([0, 0.75, 0.55])), pb.clone().add(c.V([0, 0.75, -0.55]))].forEach((p) => c.add('Or', p, { fixed: true, unit: u }));
    }
    const [cat, an] = ION[st.sol];
    for (let i = 0; i < (cat === 'Al3+' ? 4 : 6); i++) c.add(cat, c.inLiquid());
    for (let i = 0; i < (an === 'SO4 2-' && cat === 'H+' ? 3 : 6); i++) c.add(an, c.inLiquid());
    for (let i = 0; i < 3; i++) c.add('H2O', c.inLiquid());
    // 已经反应过的：直接换好（不放动画）
    const R = rx(st), n = R && !R.acid ? Math.round(st.dep * NEV) : 0;
    for (let k = 0; k < n; k++) {
      const pk = pick(c, R); if (!pk) break;
      const metals = pk.mols.slice(0, pk.nM), dst = slots(c, metals, R.out.length - pk.nM);
      pk.mols.forEach((m) => c.remove(m));
      R.out.forEach((kind, i) => { if (i < pk.nM) c.add(kind, c.inLiquid()); else c.add(kind, dst[i - pk.nM], { fixed: true }); });
    }
    made = n;
  };
  return {
    labels: (k) => ['Al3+', 'Cu2+', 'Ag+', 'Mg2+', 'Zn2+', 'Fe2+', 'Fe3+', 'H+'].includes(k), dim: 0.55,        // 只标金属离子（酸根离子不参加反应，标了反而乱）
    init(c, st) { key = `${st.metal}|${st.sol}|${!!st.film}`; c.view.film = FILM; c.view.paper = null; bounce = null; tryT = 1.5; build(c, st); },
    step(c, st, dt) {
      c.view.film = FILM; c.view.paper = null;
      c.view.liquid = st.rust != null ? new THREE.Color(0xc4e6f2).lerp(new THREE.Color(0xf2d264), Math.min(0.75, (st.yel ?? 0) * 0.75)).getHex() : st.sol === 'HCl' || st.sol === 'H2SO4' ? (st.metal === 'Fe' ? new THREE.Color(0xc4e6f2).lerp(new THREE.Color(0x9fe0a8), Math.min(1, made / 12)).getHex() : 0xc4e6f2) : st.sol === 0 ? new THREE.Color(0x8fd0f0).lerp(new THREE.Color(0x3f8fe0), 0.6 * (1 - 0.6 * st.dep)).getHex() : st.sol === 1 && st.metal === 'Cu' ? new THREE.Color(0xa9d8ef).lerp(new THREE.Color(0x3f8fe0), 0.5 * st.dep).getHex() : 0xa9d8ef;
      const [cat] = ION[st.sol], R = st.film && st.metal === 'Al' ? null : rx(st);
      // 溶液里的离子：远处的溶液会补过来（不会一下用光，但越来越少——蓝色变浅）
      const an = ION[st.sol][1];
      if (R && !R.acid && c.count(cat) < Math.max(3, Math.round(6 * (1 - 0.5 * st.dep))) && Math.random() < dt) c.pairIn(cat, an);      // 远处的溶液补过来（离子成对，电荷平衡）
      if (R && !R.acid && c.count(R.out[0]) > 5 && Math.random() < dt) c.pairOut(R.out[0], an);                                         // 生成的离子走远了
      // 铁锈先和酸反应：Fe₂O₃ + 6H⁺ ══ 2Fe³⁺ + 3H₂O
      const units = [...new Set(c.mols.filter((m) => m.kind === 'FeR' && !m.busy).map((m) => m.unit))];
      if (R?.acid && units.length) {
        if (c.count('H+') < 9 && Math.random() < dt * 3) c.pairIn('H+', ION[st.sol][1]);
        if (units.length > rustWant(st) && !c.events.length) {
          const u = units[0], part = c.mols.filter((m) => m.unit === u && (m.kind === 'FeR' || m.kind === 'Or'));
          const mid = part.reduce((a, m) => a.add(m.g.position), new THREE.Vector3()).multiplyScalar(1 / part.length);
          const hs = c.free('H+').sort((a, b) => a.g.position.distanceTo(mid) - b.g.position.distanceTo(mid)).slice(0, 6);
          if (hs.length === 6) {
            const fe = part.filter((m) => m.kind === 'FeR'), os = part.filter((m) => m.kind === 'Or');
            c.start({ in: ['FeR', 'FeR', 'Or', 'Or', 'Or', ...hs.map(() => 'H+')], out: ['Fe3+', 'Fe3+', 'H2O', 'H2O', 'H2O'], host: -1, approach: 2, dur: 2.2, burst: [0xffd27a, 0xffc840],
              atAbs: () => mid.clone(), nearAbs: (m, i) => (i < 5 ? null : os[Math.floor((i - 5) / 2)].g.position.clone().add(c.V([(i % 2 ? 1 : -1) * 0.9, 0.7, 0]))),
              placeAbs: () => [fe[0].g.position.clone().add(c.V([-0.8, 2.4, 0])), fe[1].g.position.clone().add(c.V([0.8, 2.6, 0])), ...os.map((o, k) => o.g.position.clone().add(c.V([(k - 1) * 1.4, 1.6, 0.4])))],
              after: [{ v: [-0.4, 1.2, 0] }, { v: [0.4, 1.2, 0] }, {}, {}, {}] }, [...fe, ...os, ...hs]);
          }
        }
        if (c.count('Fe3+') > 6 && Math.random() < dt) c.pairOut('Fe3+', ION[st.sol][1]);
        return;
      }
      if (R?.acid) {
        // 酸：一直在反应（镁快、锌慢一些、铁更慢），快慢跟着放出氢气的速率；酸是过量的，H⁺ 一直补得上
        if (c.count('H+') < 6 && Math.random() < dt * 2) c.pairIn('H+', ION[st.sol][1]);          // 酸是过量的：H⁺ 一直补得上（带着酸根）
        if (c.count(st.metal + '2+') > 5 && Math.random() < dt) c.pairOut(st.metal + '2+', ION[st.sol][1]);
        tryT -= dt;
        if (st.rate > 0 && tryT <= 0 && c.events.length < 2) { const pk = pick(c, R); if (pk) { made++; c.start(reaction(c, R, pk.nM, pk.mols.slice(0, pk.nM)), pk.mols); } tryT = 1.5 * Math.pow(2.6 / Math.max(0.02, st.rate), 0.45); }
        return;
      }
      const want = R ? Math.round(st.dep * NEV) : 0;
      if (R && made < want && !c.events.length) {
        const pk = pick(c, R);
        if (pk) { made++; c.start(reaction(c, R, pk.nM, pk.mols.slice(0, pk.nM)), pk.mols); }
      }
      // 不反应的：溶液里的金属离子撞到表面，又弹开了
      tryT -= dt;
      if (!R && !c.events.length && tryT <= 0 && !bounce) {
        const ion = c.free(cat).sort((a, b) => a.g.position.y - b.g.position.y)[0], m = surf(c, st.film && st.metal === 'Al' ? 'Ofilm' : st.metal).sort((a, b) => front(a.g.position) - front(b.g.position))[0];
        if (ion && m) { bounce = { ion, to: m.g.position.clone().add(c.V([0, 1.4, 0])), t: 0 }; ion.busy = true; ion.labelK = 1; }
      }
      if (bounce) {
        const b = bounce; b.t += dt;
        if (b.t < 1.6) b.ion.g.position.lerp(b.to, Math.min(1, dt * 2.2));
        else if (!b.hit) { b.hit = true; c.burst(b.to.clone().add(c.V([0, -0.6, 0])), 0xc8cdd6); b.ion.busy = false; b.ion.v.set(c.rnd(-1, 1), 3.2, c.rnd(-1, 1)); b.ion.labelT = 2; }
        else if (b.t > 3) { bounce = null; tryT = 3.5; }
      }
    },
    text(c, st) {
      const R = rx(st), e = c.events[0];
      if (ACID(st) && st.rust != null) {
        const anion = st.sol === 'HCl' ? 'Cl-' : 'SO4 2-', rusty = c.mols.some((m) => m.kind === 'FeR');
        const both = `（稀盐酸里是 ${f('H+')} 和 ${f('Cl-')}，稀硫酸里是 ${f('H+')} 和 ${f('SO4 2-')}：<b>都有 ${f('H+')}</b>，所以化学性质相似）`;
        if (rusty || e?.rx.out[0] === 'Fe3+') return { eq: `Fe<sub>2</sub>O<sub>3</sub> + ${f('H+', '6')} ${ARR} ${f('Fe3+', '2')} + ${f('H2O', '3')}`,
          cap: e ? `铁锈（Fe<sub>2</sub>O<sub>3</sub>）里的<b>氧原子和 ${f('H+')} 结合成水</b>，铁变成 ${f('Fe3+')} 进入溶液——溶液变黄` : `铁钉表面盖着铁锈（红褐色的 Fe<sub>2</sub>O<sub>3</sub>）。溶液里有 ${f('H+')} 和 ${f(anion)}${both}` };
        return { eq: `${f('Fe')} + ${f('H+', '2')} ${ARR} ${f('Fe2+')} + ${f('H2')}↑`,
          cap: e ? `铁锈溶完了，露出的铁接着和 ${f('H+')} 反应，<b>放出氢气</b>——所以铁制品不能在酸里泡太久` : `铁锈溶完了，铁钉表面露出来了${st.rate > 0 ? '；铁慢慢和酸反应，偶尔冒出一个氢气泡' : ''}` };
      }
      if (ACID(st)) {
        const NAME = { Mg: '镁', Zn: '锌', Fe: '铁', Cu: '铜' }[st.metal], M = st.metal;
        const eq = R ? `${f(M)} + ${f('H+', '2')} ${ARR} ${f(M + '2+')} + ${f('H2')}↑` : `${f('Cu')} + ${f('H+')}　<span style="opacity:.7">不反应</span>`;
        const cap = !R ? `${f('H+')} 撞到铜的表面，<b>又弹开了</b>：铜排在氢后面，不能把酸里的氢换出来`
          : e ? `${NAME}原子<b>变成 ${f(M + '2+')} 进入溶液</b>；两个 ${f('H+')} 在表面<b>结合成一个氢分子</b>，冒出去——这就是气泡`
          : `${NAME}的表面浸在酸里：${st.rate > 1 ? '反应很快，一个接一个' : st.rate > 0.2 ? '隔一会儿就有一个' : st.rate > 0 ? '很久才有一个（铁比锌、镁慢）' : '已经反应完了'}`;
        return { eq, cap };
      }
      const film = st.metal === 'Al' && st.film;
      const name = st.metal === 'Al' ? '铝' : '铜', ion = ION[st.sol][0];
      const eq = R ? (st.metal === 'Al' && st.sol === 0 ? `${f('Al', '2')} + ${f('Cu2+', '3')} ${ARR} ${f('Al3+', '2')} + ${f('Cu', '3')}` : st.metal === 'Al' ? `${f('Al')} + ${f('Ag+', '3')} ${ARR} ${f('Al3+')} + ${f('Ag', '3')}` : `${f('Cu')} + ${f('Ag+', '2')} ${ARR} ${f('Cu2+')} + ${f('Ag', '2')}`)
        : `${f(st.metal)} + ${f(ion)}　<span style="opacity:.7">不反应</span>`;
      const cap = film ? `铝没打磨：表面盖着一层致密的<b>氧化铝薄膜</b>（红色的氧原子），${f(ion)} 碰不到里面的铝原子`
        : !R ? `${f(ion)} 撞到${name}的表面，<b>又弹开了</b>：${name}不如铝活泼，不能把铝换出来`
        : e ? `${name}原子<b>变成 ${f(R.out[0])} 跑进溶液</b>；溶液里的 ${f(R.in[R.in.length - 1])} <b>落到表面，变成 ${f(R.gain)} 原子</b>——原子还是那些原子，只是换了位置、带不带电`
        : made ? `表面已经长出 <b>${c.mols.filter((m) => m.fixed && m.kind === R.gain).length}</b> 个 ${f(R.gain)} 原子，溶液里多了 ${f(R.out[0])}` : `${name}的表面浸在溶液里，等一等`;
      return { eq, cap };
    },
  };
}

// ================= 场景：红磷燃烧，测空气里氧气的含量 =================
// st：{ xO: 瓶里气体中氧气的体积分数, burning: 红磷在燃烧 }。画 25 个分子：开始约 5 个 O₂、20 个 N₂。
export function airScene() {
  const N_N2 = 20, SP = 1.36, Y0 = 0.75;
  let bounce = null, tryT = 2;
  const sites = [];
  for (let r = -4; r <= 4; r++) for (let q = -4; q <= 4; q++) { const x = (q + (r % 2 ? 0.5 : 0)) * SP, z = r * SP * 0.866; if (Math.hypot(x, z) < 4.3) sites.push(new THREE.Vector3(x, Y0, z)); }
  const wantO = (st) => Math.round((5 * st.xO) / 0.21);
  const Ps = (c) => c.mols.filter((m) => m.kind === 'P' && !m.busy);
  const Os = (c) => c.mols.filter((m) => m.kind === 'Os' && !m.busy);
  const front = (p) => Math.abs(p.x) + Math.abs(p.z - 1.2);
  const hasO = (c, P) => Os(c).some((o) => Math.hypot(o.g.position.x - P.g.position.x, o.g.position.z - P.g.position.z) < 0.5);
  return {
    labels: (k) => k === 'O2' || k === 'P2O5', dim: 0.5,
    init(c, st) {
      c.view.film = 0; c.view.paper = null; bounce = null;
      for (const p of sites) c.add('P', p.clone(), { fixed: true });
      for (let i = 0; i < N_N2; i++) c.add('N2', c.inGas(), { gas: true });
      for (let i = 0; i < wantO(st); i++) c.add('O2', c.inGas(), { gas: true });
    },
    step(c, st, dt) {
      c.view.film = 0; c.view.paper = null;
      const busyO = c.events.reduce((a, e) => a + e.mols.filter((m) => m.kind === 'O2').length, 0);
      const freeO = c.free('O2'), want = wantO(st);
      // 塞子没塞紧、瓶口敞着：外面的空气进来（O₂ 变多）
      if (freeO.length + busyO < want && Math.random() < dt) c.add('O2', c.V([c.rnd(-3, 3), c.BOX.top, c.rnd(-3, 3)]), { gas: true });
      // 燃烧：O₂ 落到红磷表面，拆成两个氧原子和磷原子连上
      if (freeO.length + busyO > want && !c.events.some((e) => e.dock)) {        // 瓶里的氧气只会被红磷用掉：少了就是烧掉了
        const o2 = freeO.sort((a, b) => a.g.position.y - b.g.position.y)[0];
        const ps = Ps(c).filter((P) => !hasO(c, P)).sort((a, b) => front(a.g.position) - front(b.g.position));
        const a = ps[0], b = a && ps.slice(1).sort((x, y) => x.g.position.distanceTo(a.g.position) - y.g.position.distanceTo(a.g.position))[0];
        if (o2 && a && b) {
          const d = [a.g.position.clone().add(c.V([0, 0.95, 0])), b.g.position.clone().add(c.V([0, 0.95, 0]))];
          const e = c.start({ in: ['O2'], out: ['Os', 'Os'], host: -1, approach: 1.6, dur: 1.2, burst: [0xffb060],
            atAbs: () => d[0].clone().lerp(d[1], 0.5), nearAbs: () => d[0].clone().lerp(d[1], 0.5).add(c.V([0, 1.3, 0])), placeAbs: () => d, after: [{ fixed: true }, { fixed: true }] }, [o2]);
          if (e) e.dock = true;
        }
      }
      // 攒够 5 个氧原子：两个磷原子带着它们离开表面——一个 P₂O₅ 分子（白烟）
      if (Os(c).length >= 5 && !c.events.some((e) => e.leave)) {
        const withO = Ps(c).filter((P) => hasO(c, P)).sort((a, b) => front(a.g.position) - front(b.g.position));
        const a = withO[0], b = a && withO.slice(1).sort((x, y) => x.g.position.distanceTo(a.g.position) - y.g.position.distanceTo(a.g.position))[0];
        if (a && b) {
          const mid = a.g.position.clone().lerp(b.g.position, 0.5);
          const os = Os(c).sort((x, y) => x.g.position.distanceTo(mid) - y.g.position.distanceTo(mid)).slice(0, 5);
          const e = c.start({ in: ['P', 'P', 'Os', 'Os', 'Os', 'Os', 'Os'], out: ['P2O5'], host: -1, approach: 0, dur: 1.6, burst: [0xffffff],
            atAbs: () => mid.clone().add(c.V([0, 2.2, 0])), after: [{ leave: true, v: [0, 1.0, 0] }] }, [a, b, ...os]);
          if (e) e.leave = true;
        }
      }
      for (const m of c.mols) if (m.kind === 'P2O5' && m.leaving) m.v.y = Math.min(m.v.y, 1.2);
      // N₂ 撞上红磷：不反应，弹开
      tryT -= dt;
      if (st.burning && tryT <= 0 && !bounce) {
        const n2 = c.free('N2').sort((a, b) => a.g.position.y - b.g.position.y)[0], P = Ps(c).sort((a, b) => front(a.g.position) - front(b.g.position))[3];
        if (n2 && P) { bounce = { m: n2, to: P.g.position.clone().add(c.V([0, 1.5, 0])), t: 0 }; n2.busy = true; n2.labelK = 1; }
      }
      if (bounce) {
        const b = bounce; b.t += dt;
        if (b.t < 1.4) b.m.g.position.lerp(b.to, Math.min(1, dt * 2.4));
        else if (!b.hit) { b.hit = true; c.burst(b.to.clone().add(c.V([0, -0.6, 0])), 0xc8cdd6); b.m.busy = false; b.m.v.set(c.rnd(-1, 1), 5, c.rnd(-1, 1)); b.m.labelT = 1.6; }
        else if (b.t > 2.6) { bounce = null; tryT = 4; }
      }
    },
    text(c, st) {
      const eq = `${f('P', '4')} + ${f('O2', '5')} <span class="arr" style="position:relative">══<span style="position:absolute;left:0;right:0;top:-0.75em;font-size:0.45em;letter-spacing:0;text-align:center">点燃</span></span> ${f('P2O5', '2')}`;
      const nO = c.count('O2'), e = c.events[0];
      const cap = e?.dock ? `${f('O2')} 撞上红磷：拆成两个氧原子，<b>和磷原子连上</b>`
        : e?.leave ? `磷原子带着氧原子离开表面：<b>一个 ${f('P2O5')} 分子</b>（白烟），最后溶进瓶底的水里`
        : bounce ? `${f('N2')} 撞上红磷，<b>不反应</b>，又弹开了——氮气留在瓶里`
        : `瓶里还有 <b>${nO}</b> 个 ${f('O2')}、<b>${c.count('N2')}</b> 个 ${f('N2')}${nO < 5 ? `——少掉的 ${5 - nO} 个 ${f('O2')}，就是被红磷用掉的氧气` : '：大约每 5 个分子里 1 个是氧气'}`;
      return { eq, cap };
    },
  };
}

// ================= 场景：二氧化锰催化过氧化氢分解 =================
// st：{ cat: 有没有二氧化锰, h2o2: 还剩多少过氧化氢（1 = 刚加进去的 5 mL 5%） }
export function mno2Scene() {
  const FILM = 6, NW = 5, NH = 7, SP = 1.9, Y0 = 0.7;
  let wait = 0.6, made = 0;
  const sites = [];
  for (let r = -1; r <= 1; r++) for (let q = -2; q <= 2; q++) { const x = (q + (r % 2 ? 0.5 : 0)) * SP, z = r * SP * 0.866 + 0.6; if (Math.hypot(x, z - 0.6) < 3.2) sites.push(new THREE.Vector3(x, Y0, z)); }        // 一小粒二氧化锰
  const front = (p) => Math.abs(p.x) + Math.abs(p.z - 1.2);
  return {
    labels: (k) => k === 'H2O2', dim: 0.45,
    init(c, st) {
      c.view.film = FILM; c.view.paper = null; wait = 0.6; made = 0;
      if (st.cat) for (const p of sites) { const u = c.add('MnO2', p.clone(), { fixed: true }); u.g.rotation.set(0, c.rnd(0, 6), 0); }
      for (let i = 0; i < Math.round(st.h2o2 * NH); i++) c.add('H2O2', c.inLiquid());
      for (let i = 0; i < NW; i++) c.add('H2O', c.inLiquid());
    },
    step(c, st, dt) {
      c.view.film = FILM; c.view.paper = null; c.view.liquid = st.cat ? 0xa9c4d2 : 0x8fd0f0;
      const want = Math.round(st.h2o2 * NH), busy = c.events.length * 2, have = c.free('H2O2').length + busy;
      if (have < want && Math.random() < dt * 3) { const m = c.add('H2O2', c.V([c.rnd(-2, 2), FILM - 0.6, c.rnd(-2, 2)])); m.v.set(0, -1.2, 0); }       // 重新加了过氧化氢溶液
      const ws = c.free('H2O').filter((m) => !m.labelK); if (ws.length > 9) c.remove(ws[0]);
      wait -= dt;
      if (st.cat && have > want && wait <= 0 && c.events.length < 2) {
        const units = c.mols.filter((m) => m.kind === 'MnO2').sort((a, b) => front(a.g.position) - front(b.g.position));
        const u = units[(made * 3) % Math.min(7, units.length)]; const at = u.g.position.clone().add(c.V([0, 1.5, 0]));
        const hs = c.free('H2O2').sort((a, b) => a.g.position.distanceTo(at) - b.g.position.distanceTo(at)).slice(0, 2);
        if (hs.length === 2 && c.start({ in: ['H2O2', 'H2O2'], out: ['H2O', 'H2O', 'O2'], host: -1, split: true, approach: 1.3, dur: 3, burst: [0xd6c8ff, 0xbfe4ff],
          atAbs: () => at, nearAbs: (m, i) => at.clone().add(c.V([i ? 1.1 : -1.1, 0.2, 0])), place: [[-1.6, 0, 0.4], [1.6, 0, -0.4], [0, 1.6, 0]],
          after: [{}, {}, { leave: true, gas: true, v: [0, 1.4, 0] }] }, hs, { then: () => { c.burst(u.g.position.clone(), 0xb9a6e8); } })) { made++; wait = 0.5; }
      }
      for (const m of c.mols) if (m.kind === 'O2' && m.leaving) m.v.y = Math.min(m.v.y, 1.6);
    },
    text(c, st) {
      const eq = `${f('H2O2', '2')} <span class="arr" style="position:relative">══<span style="position:absolute;left:0;right:0;top:-0.75em;font-size:0.45em;letter-spacing:0;text-align:center">MnO₂</span></span> ${f('H2O', '2')} + ${f('O2')}↑`;
      const e = c.events[0], nU = c.count('MnO2'), nH = c.count('H2O2');
      const cap = !st.cat ? (nH ? `没有二氧化锰：${f('H2O2')} 分子在水里挤来挤去，<b>常温下几乎不分解</b>` : '试管里只有水')
        : e ? (e.u == null || e.u < 0.6 ? `两个 ${f('H2O2')} 分子在二氧化锰表面<b>拆开</b>` : `重新组合成 2 个 ${f('H2O')} 和 1 个 ${f('O2')}；<b>二氧化锰的原子一个没少</b>（${nU} 个 ${f('MnO2')}，一直是这些）`)
        : nH ? `二氧化锰表面：${f('H2O2')} 碰上来就分解。${f('MnO2')} 一直是 ${nU} 个——<b>反应前后不变</b>`
        : `过氧化氢分解完了，不再冒气泡；${f('MnO2')} 还是 ${nU} 个。重新加过氧化氢溶液，它又能接着用`;
      return { eq, cap };
    },
  };
}

// ================= 场景：品红在水中扩散 =================
// st：{ hot: 热水吗, added: 加了品红没有, mix: 散开了多少（0 = 刚沉到杯底，1 = 均匀） }
export function diffuseScene() {
  const FILM = 7.4, NW = 22, ND = 4;
  let hot = false;
  return {
    labels: (k) => k === 'Dye', dim: 1,
    init(c, st) {
      hot = !!st.hot; c.view.film = FILM; c.view.paper = null; c.view.speed = hot ? 2.6 : 1;
      for (let i = 0; i < NW; i++) c.add('H2O', c.inLiquid());
      if (st.added) for (let i = 0; i < ND; i++) {
        const s = Math.min(1, st.mix ?? 0), r = (0.6 + s * 4.2) * Math.sqrt(Math.random()), a = c.rnd(0, 6.3);
        const m = c.add('Dye', c.V([Math.cos(a) * r, 0.8 + s * c.rnd(0, FILM - 1.6), Math.sin(a) * r]), { heavy: true }); m.g.scale.setScalar(0.42);
      }
    },
    step(c, st, dt) {
      c.view.film = FILM; c.view.paper = null; c.view.liquid = new THREE.Color(0xa9dcf2).lerp(new THREE.Color(0xff7ab0), st.added ? 0.35 * Math.min(1, st.mix ?? 0) : 0).getHex();
      c.view.speed = st.hot ? 2.6 : 1;
      if (st.added && !c.count('Dye')) for (let i = 0; i < ND; i++) { const m = c.add('Dye', c.V([c.rnd(-0.8, 0.8), 0.9, c.rnd(-0.8, 0.8)]), { heavy: true }); m.g.scale.setScalar(0.42); }        // 品红颗粒沉到杯底，开始溶解
    },
    text(c, st) {
      const eq = `<span style="font-size:0.8em">${st.hot ? '热水 80 ℃' : '冷水 20 ℃'}：分子在<b>不停地运动</b></span>`, on = true;
      const cap = !st.added ? `水分子一刻不停地动。${st.hot ? '温度高，<b>动得快</b>' : '温度低，动得慢一些'}`
        : `没有人搅拌，${f('Dye')}分子自己钻到水分子之间去了——${st.hot ? '热水里分子能量大，<b>运动快</b>，品红散得快' : '冷水里分子运动慢一些，品红散得慢'}`;
      return { eq, cap, on };
    },
  };
}

// ================= 场景：甲烷燃烧 =================
// st：{ lit: 点着了没有 }。火焰里：CH₄ 和 O₂ 拆成原子，再组合成 CO₂ 和 H₂O。
export function methaneScene() {
  const NO2 = 6, NN2 = 8;
  let gap = 0.5, made = 0;
  return {
    labels: (k) => k === 'CH4', dim: 0.4,
    init(c) { c.view.film = 0; c.view.paper = null; gap = 0.5; made = 0; for (let i = 0; i < NO2; i++) c.add('O2', c.inGas(), { gas: true }); for (let i = 0; i < NN2; i++) c.add('N2', c.inGas(), { gas: true }); },
    step(c, st, dt) {
      c.view.film = 0; c.view.paper = null;
      // 空气从旁边补进来
      if (c.count('O2') < NO2 && Math.random() < dt * 1.5) { const a = c.rnd(0, 6.3); c.add('O2', c.V([Math.cos(a) * 5, c.rnd(1, 4), Math.sin(a) * 5]), { gas: true }); }
      for (const m of c.mols) if ((m.kind === 'CO2' || m.kind === 'H2O') && m.leaving) m.v.y = Math.min(m.v.y, 2);
      if (!st.lit) { for (const m of c.free('CH4')) m.leaving = true; return; }
      // 导管口不断出来甲烷
      gap -= dt;
      if (gap <= 0 && c.free('CH4').length < 2) { const m = c.add('CH4', c.V([c.rnd(-0.5, 0.5), 0.9, c.rnd(-0.5, 0.5)]), { gas: true }); m.v.set(0, 1.2, 0); gap = 2.2; }
      if (!c.events.length) {
        const ch = c.free('CH4').find((m) => m.g.position.y > 1.6);
        const os = ch && c.free('O2').sort((a, b) => a.g.position.distanceTo(ch.g.position) - b.g.position.distanceTo(ch.g.position)).slice(0, 2);
        if (ch && os.length === 2 && c.start({ in: ['CH4', 'O2', 'O2'], out: ['CO2', 'H2O', 'H2O'], host: 0, at: [0, 0.6, 0], near: [null, [-1.7, 0.5, 0.3], [1.7, 0.5, -0.3]], split: true, spread: 1.45, approach: 1.8, dur: 4.4,
          place: [[0, 1.6, 0], [-2, -0.2, 0.3], [2, -0.2, -0.3]], burst: [0xffb347, 0xffe6a0], after: [{ leave: true, gas: true, v: [0, 1.4, 0] }, { leave: true, gas: true, v: [-0.3, 1.4, 0] }, { leave: true, gas: true, v: [0.3, 1.4, 0] }] }, [ch, ...os])) made++;
      }
    },
    text(c, st) {
      const eq = `${f('CH4')} + ${f('O2', '2')} <span class="arr" style="position:relative">══<span style="position:absolute;left:0;right:0;top:-0.75em;font-size:0.45em;letter-spacing:0;text-align:center">点燃</span></span> ${f('CO2')} + ${f('H2O', '2')}`;
      const e = c.events[0];
      const cap = !st.lit ? '还没点燃：甲烷从导管口出来，和空气混着，<b>不反应</b>'
        : e ? (e.u == null || e.u < 0.6 ? `火焰里：一个 ${f('CH4')} 和两个 ${f('O2')} <b>拆成原子</b>——1 个碳、4 个氢、4 个氧` : `<b>碳原子进了 ${f('CO2')}，氢原子进了 ${f('H2O')}</b>——所以甲烷里有碳元素和氢元素`)
        : '甲烷从导管口出来，在火焰里和氧气反应';
      return { eq, cap };
    },
  };
}

// 小工具：反应式里带条件的等号（点燃 / 通电 / 高温）
const ARRC = (t) => `<span class="arr" style="position:relative">══<span style="position:absolute;left:0;right:0;top:-0.75em;font-size:0.45em;letter-spacing:0;text-align:center">${t}</span></span>`;

// ================= 场景：氢气在空气里燃烧 2H₂ + O₂ ══ 2H₂O =================
// st：{ lit: 尖嘴口的氢气点着了没有 }
export function h2Scene() {
  const NO2 = 5, NN2 = 8;
  let gap = 0.3;
  return {
    labels: (k) => k === 'H2', dim: 0.4,
    init(c) { c.view.film = 0; c.view.paper = null; gap = 0.3; for (let i = 0; i < NO2; i++) c.add('O2', c.inGas(), { gas: true }); for (let i = 0; i < NN2; i++) c.add('N2', c.inGas(), { gas: true }); },
    step(c, st, dt) {
      c.view.film = 0; c.view.paper = null;
      if (c.count('O2') < NO2 && Math.random() < dt * 1.5) { const a = c.rnd(0, 6.3); c.add('O2', c.V([Math.cos(a) * 5, c.rnd(1, 4), Math.sin(a) * 5]), { gas: true }); }
      for (const m of c.mols) if (m.kind === 'H2O' && m.leaving) m.v.y = Math.min(m.v.y, 2);
      if (!st.lit) { for (const m of c.free('H2')) m.leaving = true; return; }
      gap -= dt;
      if (gap <= 0 && c.free('H2').length < 3) { const m = c.add('H2', c.V([c.rnd(-0.5, 0.5), 0.9, c.rnd(-0.5, 0.5)]), { gas: true }); m.v.set(0, 1.2, 0); gap = 1.1; }
      if (!c.events.length) {
        const hs = c.free('H2').filter((m) => m.g.position.y > 1.4).slice(0, 2);
        const o2 = hs.length === 2 && c.nearest(c.free('O2'), hs[0].g.position);
        if (o2 && c.start({ in: ['H2', 'H2', 'O2'], out: ['H2O', 'H2O'], host: 0, at: [0.6, 0.6, 0], near: [null, [1.4, 0, 0.2], [0.7, 1.6, -0.2]], split: true, spread: 1.5, approach: 1.6, dur: 4,
          place: [[-0.9, 0.2, 0.3], [1.1, 0.2, -0.3]], burst: [0x9fd8ff, 0xd8f0ff], after: [{ leave: true, gas: true, v: [-0.2, 1.4, 0] }, { leave: true, gas: true, v: [0.2, 1.4, 0] }] }, [...hs, o2])) { /* 开始了 */ }
      }
    },
    text(c, st) {
      const eq = `${f('H2', '2')} + ${f('O2')} ${ARRC('点燃')} ${f('H2O', '2')}`, e = c.events[0];
      const cap = !st.lit ? '还没点燃：氢气从尖嘴出来，和空气混着，<b>不反应</b>'
        : e ? (e.u == null || e.u < 0.6 ? `两个 ${f('H2')} 和一个 ${f('O2')} <b>拆成原子</b>：4 个氢、2 个氧` : `重新组合成 <b>两个水分子</b>——氢气燃烧只生成水（正好是电解水反过来）`)
        : '氢气从尖嘴出来，在火焰里和空气中的氧气反应';
      return { eq, cap };
    },
  };
}

// ================= 场景：碳酸钠 / 碳酸氢钠和稀盐酸 =================
// st：{ salt: 'na2co3' | 'nahco3', added: 加了盐酸没有, acid: 剩下的 H⁺（1 = 刚加进去的 2 mL） }
export function carbonateScene() {
  const FILM = 6, NH = 6;
  let salt = '';
  return {
    labels: (k) => k !== 'H2O' && k !== 'CO2', dim: 0.5,
    init(c, st) {
      salt = st.salt; c.view.film = FILM; c.view.paper = null;
      // 固体过量：碳酸钠画 4 个 CO₃²⁻（8 个 Na⁺），碳酸氢钠画 7 个 HCO₃⁻（7 个 Na⁺）——盐酸用完还有剩
      const an = st.salt === 'nahco3' ? 'HCO3-' : 'CO3 2-', nAn = st.salt === 'nahco3' ? 7 : 4;
      for (let i = 0; i < nAn * (st.salt === 'nahco3' ? 1 : 2); i++) c.add('Na+', c.inLiquid());
      for (let i = 0; i < nAn; i++) c.add(an, c.inLiquid());
      if (st.added) { for (let i = 0; i < NH; i++) c.add('Cl-', c.inLiquid()); for (let i = 0; i < Math.round(NH * st.acid); i++) c.add('H+', c.inLiquid()); }
      for (let i = 0; i < 4; i++) c.add('H2O', c.inLiquid());
    },
    step(c, st, dt) {
      c.view.film = FILM; c.view.paper = null; c.view.liquid = 0xb8dff0;
      const an = st.salt === 'nahco3' ? 'HCO3-' : 'CO3 2-';
      if (st.added && !c.count('Cl-')) for (let i = 0; i < NH; i++) { const p = c.V([c.rnd(-2, 2), FILM - 0.6, c.rnd(-2, 2)]); c.add('Cl-', p).v.set(c.rnd(-2, 2), -1.5, c.rnd(-2, 2)); c.add('H+', p.clone().add(c.V([0.8, 0, 0]))).v.set(c.rnd(-2, 2), -1.5, c.rnd(-2, 2)); }
      const need = st.salt === 'nahco3' ? 1 : 2, busy = c.events.length * need, have = c.free('H+').length + busy, want = Math.round(NH * st.acid);
      if (st.added && have > want && c.events.length < 2) {
        const h0 = c.free('H+')[0], carb = h0 && c.nearest(c.free(an), h0.g.position);
        const hs = carb && c.free('H+').sort((a, b) => a.g.position.distanceTo(carb.g.position) - b.g.position.distanceTo(carb.g.position)).slice(0, need);
        if (carb && hs.length === need) c.start({ in: [an, ...hs.map(() => 'H+')], out: ['CO2', 'H2O'], host: 0, near: [null, [1.4, 0.4, 0], [-1.4, 0.4, 0]], approach: 1.6, dur: 2.2,
          place: [[0, 1.4, 0], [0, -0.6, 0.3]], burst: [0xffe2a0, 0xd8f0ff], after: [{ leave: true, gas: true, v: [0, 1.6, 0] }, {}] }, [carb, ...hs]);
      }
      for (const m of c.mols) if (m.kind === 'CO2' && m.leaving) m.v.y = Math.min(m.v.y, 1.8);
      const ws = c.free('H2O').filter((m) => !m.labelK); if (ws.length > 8) c.remove(ws[0]);
    },
    text(c, st) {
      const nah = st.salt === 'nahco3', an = nah ? 'HCO3-' : 'CO3 2-';
      const eq = nah ? `${f('HCO3-')} + ${f('H+')} ${ARR} ${f('H2O')} + ${f('CO2')}↑` : `${f('CO3 2-')} + ${f('H+', '2')} ${ARR} ${f('H2O')} + ${f('CO2')}↑`;
      const e = c.events[0], nH = c.count('H+');
      const cap = !st.added ? `试管里：${nah ? '碳酸氢钠' : '碳酸钠'}溶在少量水里，是 ${f('Na+')} 和 ${f(an)}。还没加盐酸`
        : e ? (nah ? `${f('HCO3-')} 碰上<b>一个</b> ${f('H+')} 就变成 ${f('H2O')} 和 ${f('CO2')}，${f('CO2')} 冒出去——比碳酸钠反应得快` : `${f('CO3 2-')} 碰上<b>两个</b> ${f('H+')}，变成 ${f('H2O')} 和 ${f('CO2')}；${f('CO2')} 冒出去，通进石灰水`)
        : nH ? `盐酸里的 ${f('H+')} 还剩 <b>${nH}</b> 个；${f('Na+')} 和 ${f('Cl-')} 不参加反应` : `${f('H+')} 用完了，不再冒气泡；溶液里剩下 ${f('Na+')} 和 ${f('Cl-')}（氯化钠）`;
      return { eq, cap };
    },
  };
}

// ================= 场景：蒸馏 =================
// st：{ T: 烧瓶里水的温度, lit: 在加热 }。水分子从液面飞出去成了水蒸气；钙、镁离子跑不出去。
export function distillScene() {
  const FILM = 5, NW = 16;
  let gone = 0, gap = 0.6;
  return {
    labels: (k) => k === 'Ca2+' || k === 'Mg2+i', dim: 1,
    init(c) {
      c.view.film = FILM; c.view.paper = null; gone = 0; gap = 0.6;
      for (let i = 0; i < NW; i++) c.add('H2O', c.inLiquid());
      for (let i = 0; i < 2; i++) c.add('Ca2+', c.inLiquid());
      c.add('Mg2+i', c.inLiquid());
      for (let i = 0; i < 6; i++) c.add('Cl-', c.inLiquid());         // 2 个 Ca²⁺、1 个 Mg²⁺ 配 6 个 Cl⁻（电荷平衡）
    },
    step(c, st, dt) {
      c.view.film = FILM; c.view.paper = null; c.view.liquid = 0xb4e0f2;
      c.view.speed = 1 + Math.max(0, st.T - 20) / 80 * 1.6;
      // 沸腾：液面上的水分子一个个飞出去；不到沸点也会偶尔蒸发一个
      const rate = st.T >= 99 && st.lit ? 2.2 : st.T > 60 ? 0.25 : 0.05;
      gap -= dt * rate;
      if (gap <= 0) {
        gap = 1;
        const w = c.free('H2O').filter((m) => !m.gas).sort((a, b) => b.g.position.y - a.g.position.y)[0];
        if (w) { w.gas = true; w.leaving = true; w.labelK = 1; w.labelT = 1.5; w.v.set(c.rnd(-0.5, 0.5), 3.5, c.rnd(-0.5, 0.5)); gone++; }
      }
      if (c.free('H2O').filter((m) => !m.gas).length < NW && Math.random() < dt * 1.2) c.add('H2O', c.V([c.rnd(-3, 3), 0.7, c.rnd(-3, 3)]));         // 烧瓶里还有很多水
    },
    text(c, st) {
      const boil = st.T >= 99 && st.lit;
      const eq = `<span style="font-size:0.8em">${boil ? '沸腾' : st.lit ? '加热中' : '没加热'}：${Math.round(st.T)} ℃</span>`;
      const cap = boil ? `液面上的 ${f('H2O')} 分子<b>一个个飞出去，成了水蒸气</b>（分子本身没变，是物理变化）；${f('Ca2+')}、${f('Mg2+i')} <b>一个也跑不出去</b>，留在烧瓶里${gone > 2 ? `——已经飞走 ${gone} 个水分子` : ''}`
        : st.T > 40 ? '水热起来了：分子动得越来越快，偶尔有一个从液面飞出去' : `自来水里除了 ${f('H2O')} 分子，还溶着钙、镁的化合物（${f('Ca2+')}、${f('Mg2+i')} 等）`;
      return { eq, cap, on: true };
    },
  };
}

// ================= 场景：氯化钠溶解 =================
// st：{ salt: 烧杯里有氯化钠没有, water: 加了水没有, dis: 溶解了多少（0~1）, stir: 在搅拌（0~1） }
export function dissolveScene() {
  const FILM = 6.2, NW = 14;
  const sites = [];
  for (let y = 0; y < 2; y++) for (let i = -2; i <= 1; i++) for (let j = -2; j <= 1; j++) sites.push([new THREE.Vector3((i + 0.5) * 1.25, 0.7 + y * 1.25, (j + 0.5) * 1.25), (i + j + y) % 2 ? 'Cl-' : 'Na+']);
  const crystal = (c) => c.mols.filter((m) => m.fixed);
  let gap = 0;
  return {
    labels: (k, m) => (k === 'Na+' || k === 'Cl-') && !m?.fixed, dim: 1,
    init(c, st) {
      c.view.film = st.water ? FILM : 0; c.view.paper = null;
      if (st.salt) for (const [p, k] of sites) c.add(k, p.clone(), { fixed: true });
      const n = st.salt && st.water ? Math.round(st.dis * sites.length) : 0;
      for (let i = 0; i < n; i++) { const m = crystal(c).sort((a, b) => b.g.position.y - a.g.position.y || Math.hypot(b.g.position.x, b.g.position.z) - Math.hypot(a.g.position.x, a.g.position.z))[0]; if (!m) break; m.fixed = false; m.g.position.copy(c.inLiquid()); }
      if (st.water) for (let i = 0; i < NW; i++) c.add('H2O', c.inLiquid());
    },
    step(c, st, dt) {
      c.view.film = st.water ? FILM : 0; c.view.paper = null; c.view.liquid = 0xb4e0f2;
      c.view.speed = 1 + 1.6 * (st.stir || 0);
      if (st.water && c.count('H2O') < NW && Math.random() < dt * 4) c.add('H2O', c.V([c.rnd(-3, 3), FILM - 0.6, c.rnd(-3, 3)]));
      if (st.salt && !crystal(c).length && !c.count('Na+')) for (const [p, k] of sites) c.add(k, p.clone(), { fixed: true });
      // 溶解：水分子把晶体表面的离子一个个拉进水里（外面、上面的先走）
      const want = st.salt && st.water ? Math.round(st.dis * sites.length) : 0, out = sites.length - crystal(c).length;
      gap -= dt;
      if (out < want && gap <= 0) {
        gap = (st.stir || 0) > 0.2 ? 0.16 : 0.45;        // 一个一个地离开晶体（画面上不一下全散掉）
        const m = crystal(c).sort((a, b) => b.g.position.y - a.g.position.y || Math.hypot(b.g.position.x, b.g.position.z) - Math.hypot(a.g.position.x, a.g.position.z))[0];
        if (m) {
          m.fixed = false; m.labelK = 1; m.labelT = 2; const d = m.g.position.clone().setY(0); if (d.lengthSq() < 0.01) d.set(1, 0, 0);
          m.v.copy(d.normalize().multiplyScalar(2)).add(c.V([0, 2, 0]));
          const w = c.nearest(c.free('H2O'), m.g.position); if (w) { w.v.add(m.g.position.clone().sub(w.g.position).normalize().multiplyScalar(-2)); }
        }
      }
    },
    text(c, st) {
      const left = crystal(c).length, tot = sites.length;
      const eq = `<span style="font-size:0.8em">氯化钠溶解：${f('Na+')} 和 ${f('Cl-')} 分散到水分子中间</span>`;
      const cap = !st.salt ? '烧杯里还没有氯化钠' : !st.water ? `氯化钠晶体：${f('Na+')}、${f('Cl-')} 一个挨一个排得整整齐齐。还没加水`
        : left === tot ? '水倒进去了：水分子撞着晶体表面'
        : left ? `水分子把晶体表面的离子<b>一个个拉进水里</b>——已经溶解 ${tot - left} 个，还剩 ${left} 个${st.stir > 0.2 ? '；搅拌让水分子动得更快，溶解得更快' : '；用玻璃棒搅拌会快一些'}`
        : `晶体全部溶解了：${f('Na+')}、${f('Cl-')} <b>均匀地分散在水里</b>，看不见了——这就是溶液`;
      return { eq, cap, on: true };
    },
  };
}

// ================= 场景：木炭还原氧化铜 2CuO + C ══ 2Cu + CO₂↑ =================
// st：{ T: 粉末最热处的温度（℃）, x: 反应了多少（0~1）, ox: 生成的铜里又被氧化回去的比例, r: 木炭够不够（1 = 正好够） }
// 几小块氧化铜（每块一个铜原子连着一个氧原子），两排三列分开摆；木炭粉的碳原子在同一列两块之间的上方。
// 碳原子把两边的氧拉走，连成 CO₂ 飘走；两个铜原子留在原地——从左往右，一列列只剩下铜。
// 同一种原子前后长得一样（颜色、大小都不变）：黑色变红色是宏观上粉末的颜色，不是原子变了色，字幕里这样说。
export function cuoScene() {
  // 六小块氧化铜，两排三列、一块一块分开摆（2026-11-03 作者：原来一整片格子挤在一起，哪个氧是哪个铜的看不出来）：
  // 每块是一个铜原子连着一个氧原子（MOL.CuO 那根棍）。同一列两块之间、两个氧的正上方有一个碳原子：
  // 反应时它把这两个氧拉走、连成 CO₂ 飘走，两个铜原子留在原地、亮一下。反应从左往右一列列推进。
  const DX = 3.6, DZ = 3.0, Y0 = 0.62, HC = 1.1, BOND = 1.5;
  let made = 0, reox = 0;
  const units = [];
  for (let r = 0; r < 2; r++) for (let q = 0; q < 3; q++) units.push({ q, r, p: new THREE.Vector3((q - 1) * DX - BOND / 2, Y0, (r - 0.5) * DZ) });
  const at = (q, r) => units.find((u) => u.q === q && u.r === r);
  const pairs = [];
  for (let q = 0; q < 3; q++) { const A = at(q, 0), B = at(q, 1); pairs.push({ A, B, c: new THREE.Vector3(A.p.x + BOND, Y0 + HC, 0) }); }
  const NEV = pairs.length;
  const front = (p) => p.x * 10 - p.z;                                           // 从左往右推进（同一列先前面）
  pairs.sort((a, b) => front(a.c) - front(b.c));
  const near = (c, p, k) => c.mols.find((m) => m.kind === k && !m.busy && (m.home || m.g.position).distanceTo(p) < 0.05);
  const pick = (c) => {
    for (const P of pairs) {
      const C = near(c, P.c, 'Cs'), a = near(c, P.A.p, 'CuO'), b = near(c, P.B.p, 'CuO');
      if (C && a && b) return [a, b, C];
    }
    return null;
  };
  const RX = (mols) => ({ in: ['CuO', 'CuO', 'Cs'], out: ['Cub', 'Cub', 'CO2'], host: -1, approach: 0, dur: 2.6, burst: [0xffe6a0],
    atAbs: () => mols[2].g.position.clone().add(new THREE.Vector3(0, 1.3, 0)),
    placeAbs: () => [mols[0].g.position.clone(), mols[1].g.position.clone(), mols[2].g.position.clone().add(new THREE.Vector3(0, 2.4, 0))],
    after: [{ fixed: true }, { fixed: true }, { leave: true, gas: true, v: [0, 1.5, 0] }] });
  // 氧被拉走的那一下：两个铜原子身上各亮一下（原子本身不变）；第一个只剩铜的标上“Cu”
  const reveal = (c, mols) => (ps) => { ps.slice(0, 2).forEach((m, i) => { m.q = mols[i].q; m.r = mols[i].r; c.burst(m.g.position.clone(), 0xffb347); }); if (!c.mols.some((m) => m.rep && m.kind === 'Cub')) ps[0].rep = true; };
  return {
    solid: true, still: true,                                                       // 一块固体：不让旁边的原子变透明（叠在一起很乱）；圆窗里镜头不追着反应跑，整块一直在画面里
    labels: (k, m) => k === 'CO2' || !!m.rep, labelOnly: (k, m) => k === 'CO2' || !!m.rep,     // 只标飘走的 CO₂ 和各一个代表（CuO、Cu、C）
    init(c, st) {
      c.view.film = 0; c.view.paper = null; made = 0; reox = 0;
      for (const u of units) c.add('CuO', u.p.clone(), { fixed: true, q: u.q, r: u.r }).g.rotation.set(0, 0, 0);
      // 木炭粉的多少：够用时每一对氧化铜都配一个碳，再多一个（课本取碳稍过量）；不够时少几个
      const nC = Math.max(1, Math.min(NEV + 1, Math.round(NEV * Math.min(2, st.r ?? 1.3) / 1.3 + 1)));
      pairs.slice(0, Math.min(NEV, nC)).forEach((P) => c.add('Cs', P.c.clone(), { fixed: true }));
      // 木炭稍过量（课本取碳稍多）：多出来的碳不画——放在哪儿都挨着别的原子，看着像连在一起
      const n = Math.round(st.x * NEV);
      for (let k = 0; k < n; k++) { const mols = pick(c); if (!mols) break; const qs = mols.slice(0, 2).map((m) => [m.g.position.clone(), m.q, m.r]); mols.forEach((m) => c.remove(m)); qs.forEach(([p, q, r]) => c.add('Cub', p, { fixed: true, q, r })); }
      made = n;
      // 给初学的人认：后面一个氧化铜标“CuO”，已经露出来的铜里标一个“Cu”
      const rep = (k, at) => c.mols.filter((m) => m.kind === k).sort((a, b) => a.g.position.distanceTo(at) - b.g.position.distanceTo(at))[0];
      const o = rep('CuO', c.V([DX, Y0, -DZ / 2])); if (o) o.rep = true;          // 标在右边靠近镜头的那块氧化铜上（最后才反应；“CuO”不压着后面那个碳）
      const u = rep('Cub', c.V([-DX, Y0, -DZ / 2])); if (u) u.rep = true;
      const cc = rep('Cs', c.V([BOND / 2, Y0 + HC, 0])); if (cc) cc.rep = true;   // 碳也标一个“C”（中间那个：不和右边的“CuO”挤在一起）
    },
    step(c, st, dt) {
      c.view.film = 0; c.view.paper = null;
      c.view.speed = 1 + Math.min(2, Math.max(0, st.T - 20) / 350);
      // 高温下原子在原地抖得厉害
      const jig = Math.min(0.025, Math.max(0, st.T - 200) / 16000);
      for (const m of c.mols) if (m.fixed && !m.busy) { m.home = m.home || m.g.position.clone(); m.g.position.copy(m.home).add(c.V([c.rnd(-jig, jig), c.rnd(-jig, jig), c.rnd(-jig, jig)])); }
      const want = Math.round(st.x * NEV);
      if (made < want && !c.events.length) { const mols = pick(c); if (mols) { mols.forEach((m) => { if (m.home) m.g.position.copy(m.home); }); made++; c.start(RX(mols), mols, { then: reveal(c, mols) }); } }
      // 冷却时进了空气：热的铜又和氧气反应，变回黑色的氧化铜（2Cu + O₂ ══ 2CuO）；氧原子回到原来的位置
      const reoxWant = Math.round((made * 2 * (st.ox || 0)) / 2);
      if (reox < reoxWant && !c.events.length) {
        if (!c.free('O2').length) c.add('O2', c.V([c.rnd(-2, 2), c.BOX.top, c.rnd(-2, 2)]), { gas: true });
        const cus = c.mols.filter((m) => m.kind === 'Cub' && !m.busy).sort((a, b) => front(a.g.position) - front(b.g.position));
        const a = cus[0], b = a && cus.slice(1).sort((x, y) => x.g.position.distanceTo(a.g.position) - y.g.position.distanceTo(a.g.position))[0], o2 = c.free('O2')[0];
        if (a && b && o2) {
          [a, b].forEach((m) => { if (m.home) m.g.position.copy(m.home); });
          const mid = a.g.position.clone().lerp(b.g.position, 0.5);
          if (c.start({ in: ['Cub', 'Cub', 'O2'], out: ['CuO', 'CuO'], host: -1, approach: 2, dur: 1.8, burst: [0x9fb8ff], atAbs: () => mid.clone().add(c.V([0, 1, 0])), nearAbs: (m, i) => (i === 2 ? mid.clone().add(c.V([0, 1.6, 0])) : null),
            placeAbs: () => [a.g.position.clone(), b.g.position.clone()], after: [{ fixed: true }, { fixed: true }] }, [a, b, o2], { then: (ps) => ps.forEach((m, i) => { m.q = [a, b][i].q; m.r = [a, b][i].r; }) })) reox++;
        }
      }
      for (const m of c.mols) if (m.kind === 'CO2' && m.leaving) { m.v.y = Math.min(m.v.y, 1.8); if (m.g.position.y > Y0 + 6.5) m.fadeOut = true; }
    },
    text(c, st) {
      const eq = `${f('CuO', '2')} + C ${ARRC('高温')} ${f('Cu', '2')} + ${f('CO2')}↑`, e = c.events[0], nCu = c.count('Cub');
      const cap = e?.rx.in[2] === 'O2' ? `冷却时进了空气：${f('O2')} 又和热的铜原子结合，<b>变回氧化铜</b>——粉末的颜色又从红变回黑`
        : e ? `碳原子把两个氧化铜里的<b>氧原子拉走</b>，生成 ${f('CO2')} 跑出去；<b>铜原子留在原地</b>——粉末也就从黑色的氧化铜变成了红色的铜`
        : st.T < 450 ? `氧化铜：每个铜原子（大球）连着一个氧原子（红色小球）；两块中间上方深灰的是木炭粉里的碳原子。温度${st.T > 100 ? '还不够高' : '还低'}，原子只在原地抖动`
        : nCu ? `已经有 <b>${nCu}</b> 个铜原子身边的氧被碳拉走了（成了 ${f('CO2')}）——只剩铜原子的地方，就是红色的铜` : '温度上来了，原子抖得厉害——快要反应了';
      return { eq, cap };
    },
  };
}

/**
 * 一课里接上微观次元：一个“钻进去看 ⊙”按钮 + 全息分子世界。
 *   const mic = micro({ tag, look, back, group, scene: h2Scene(), at: () => 局部坐标, label: '钻进火焰里看', state: () => ({ lit: S.lit }), show: () => S.lit, bar: () => bar })
 *   update 里：mic.update(dt, k)；演示里：act.at(0.02, () => mic.open(true))，下一个镜头 enter: () => mic.close()；dispose 里 mic.dispose()
 *   key()：返回的字符串变了就把分子世界重新摆一遍（比如换了一种盐）
 */
export function micro({ tag, look, back, group, scene, at, label, state, show = () => true, bar, key = () => '', scale = 0.0062, lookD = [0.05, 0.22, 1], dist = 0.3, btnAt = null }) {
  const mw = microWorld({ mode: 'holo', scene, place: () => ({ pos: group.localToWorld(at()), scale: scale * group.getWorldScale(new THREE.Vector3()).x, cam: window.__lb.stage.camera }) });
  const btn = tag(`${label} ⊙`, 'pill mw-go', () => api.open());
  let k0 = '', looked = false;
  const anchor = () => { const cam = window.__lb?.stage?.camera; if (!cam) return [innerWidth / 2, innerHeight * 0.8]; const v = group.localToWorld(at()).project(cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; };
  mw.onClose = () => { if (looked && !bar().playing) back(); looked = false; };
  const api = {
    mw,
    get isOpen() { return mw.isOpen; },
    open(demo = false) {
      const p = at();
      if (!demo) { look([p.x, p.y + 0.05, p.z], lookD, dist); looked = true; }
      const st = state(); k0 = key(); const was = mw.isOpen; mw.open(anchor, st); if (was) mw.reset(st);
    },
    close() { mw.close(); },
    update(dt, k = 1) {
      if (mw.isOpen) { const st = state(), kk = key(); if (kk !== k0) { k0 = kk; mw.reset(st); } else mw.set(st); }
      mw.update(Math.min(dt, 1 / 30) * Math.min(k, 1.5));
      const p = btnAt ? btnAt() : at().add(new THREE.Vector3(0, 0.02, 0));
      btn.loc(group, p.x, p.y, p.z).show(show() && !mw.isOpen && !bar().playing);
    },
    dispose() { mw.dispose(); },
  };
  return api;
}

// ================= 场景：氢氧化钠溶液吸收二氧化碳 CO₂ + 2OH⁻ ══ CO₃²⁻ + H₂O =================
// st：{ liquid: 瓶里倒进氢氧化钠溶液了没有, gas: 瓶里还剩的二氧化碳（0~1）, abs: 被反应掉的（0~1）, capOn: 瓶盖旋紧了没有 }
// 画 3 个 CO₂、8 个 Na⁺ 和 8 个 OH⁻（电荷平衡）：二氧化碳全被吸收也只用掉 6 个 OH⁻（氢氧化钠是过量的）。
export function naohScene() {
  const FILM = 5, NNA = 8, NOH = 8, NGAS = 3;
  let made = 0;
  const RX = {
    in: ['CO2', 'OH-', 'OH-'], out: ['CO3 2-', 'H2O'], host: 1, at: [0.5, 0.4, 0],
    nearAbs: (m, i) => (i === 0 ? m[1].g.position.clone().add(V([0.3, 1.4, 0])) : i === 2 ? m[1].g.position.clone().add(V([1.7, 0, 0.2])) : null),
    place: [[-0.3, 0.3, 0], [2, -0.3, 0.2]],
    // CO₃²⁻ 的 C、O、O 来自 CO₂，第 4 个 O 来自第一个 OH⁻；它的 H 转给第二个 OH⁻，成了水
    map: [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0], [1, 1], [2, 1]],
    approach: 1.8, dur: 2.2, burst: [0xffe2a0, 0x9fd8ff],
  };
  return {
    labels: (k) => ['Na+', 'OH-', 'CO3 2-'].includes(k), dim: 0.55,
    init(c, st) {
      c.view.paper = null; c.view.film = st.liquid ? FILM : 0;
      made = st.liquid ? Math.round(st.abs * NGAS) : 0;
      if (st.liquid) {
        for (let i = 0; i < NNA; i++) c.add('Na+', c.inLiquid());
        for (let i = 0; i < NOH - 2 * made; i++) c.add('OH-', c.inLiquid());
        for (let i = 0; i < made; i++) c.add('CO3 2-', c.inLiquid());
        for (let i = 0; i < 3 + made; i++) c.add('H2O', c.inLiquid());
      }
      for (let i = 0; i < Math.round(st.gas * NGAS); i++) c.add('CO2', c.inGas(), { gas: true });
    },
    step(c, st, dt) {
      c.view.paper = null; c.view.film = st.liquid ? FILM : 0; c.view.liquid = 0xb4dcef;
      const want = st.liquid ? Math.round(st.abs * NGAS) : 0;
      if (made < want && !c.events.length) {
        const co2 = c.free('CO2').sort((a, b) => a.g.position.y - b.g.position.y)[0];
        const oh1 = co2 && c.nearest(c.free('OH-'), co2.g.position);
        const oh2 = oh1 && c.nearest(c.free('OH-').filter((m) => m !== oh1), oh1.g.position);
        if (co2 && oh1 && oh2 && c.start(RX, [co2, oh1, oh2])) made++;
      }
      // 瓶里的二氧化碳：个数跟着还剩多少走（被反应掉的在上面的事件里消失）
      const gasNow = c.mols.filter((m) => m.kind === 'CO2' && m.gas && !m.leaving).length, gasWant = Math.round(st.gas * NGAS);
      if (gasNow < gasWant) c.add('CO2', c.V([c.rnd(-3, 3), c.BOX.top, c.rnd(-3, 3)]), { gas: true });
      for (const m of c.mols) m.pull = m.kind === 'CO2' && m.gas && !m.leaving && st.liquid ? c.V([0, -0.6, 0]) : null;      // 振荡时二氧化碳不停地碰到液面
      const ws = c.free('H2O').filter((m) => !m.labelK); if (ws.length > 8) c.remove(ws[0]);
    },
    text(c, st) {
      const eq = `${f('CO2')} + ${f('OH-', '2')} ${ARR} ${f('CO3 2-')} + ${f('H2O')}`, e = c.events[0];
      const nGas = c.count('CO2');
      const cap = !st.liquid ? `瓶里是 ${f('CO2')}。还没倒进氢氧化钠溶液`
        : e ? `${f('CO2')} 碰上两个 ${f('OH-')}：变成 ${f('CO3 2-')} 和 ${f('H2O')}——生成了<b>碳酸钠</b>（${f('Na+')} 一直在溶液里，没参加反应）`
        : made && !nGas ? `瓶里的二氧化碳几乎都被反应掉了，成了溶液里的 ${f('CO3 2-')}。瓶里没剩多少气体，外面的大气压把软瓶压瘪`
        : made ? `已经有 ${made} 个 ${f('CO2')} 变成了 ${f('CO3 2-')}；${st.capOn ? '多振荡几下，碰得更快' : '瓶盖还没旋紧，外面的空气会补进来'}`
        : `氢氧化钠溶液里是 ${f('Na+')} 和 ${f('OH-')}（课本图 10-14）。${st.capOn ? '振荡瓶子，二氧化碳不停地碰到溶液' : '旋紧瓶盖，振荡'}`;
      return { eq, cap };
    },
  };
}
