// 物质的导电性（课本必修第一册第 14 页【实验1-2】、图1-9）用到的器材和“钻进去看”的场景。
//   powerSupply()   学生电源（直流 6 V）：点一下接通 / 断开；顶上一红一黑两个接线柱
//   bulbHolder()    小灯泡（2.5 V 0.3 A）和灯座：set(b) 亮度 = 实际功率 ÷ 额定功率；纸面上加法混合看不见，光晕用普通混合，外面再画几道光芒
//   electrodes()    两根石墨电极，装在一根塑料横杆上（横杆搭在烧杯口上）；原点在横杆底面中心
//   wire(color)     导线：两头一头接在接线柱上，一头跟着电极走（每帧 update(a, b)）
//   saltHeap()      一堆白色晶体（干燥的固体 / 加进水里还没溶解的）
//   spoon()、glassRod()  药匙、玻璃棒
//   dianzhiScene()  钻进去看：干燥固体里离子紧密排列；溶液里水合离子自由移动，通电后阳离子、阴离子朝相反方向移动
import * as THREE from 'three';
import { paint, inked, hull, polyline } from '../../live/ink.js';
import { glowTexture, textPlate } from './props.js';
import { glass2 } from './chemfx.js';
import { f, textSprite } from './microworld.js';

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const pickBox = (w, h, d, at) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false })); m.position.copy(at); m.userData.pick = true; return m; };
// 贴在器材上的字牌：字号按牌子大小定（textPlate 的画布总是 512 宽）
export const plate = (text, w, h, { color = '#23293a', bg = '#fffaf0' } = {}) => textPlate(text, { w, h, color, bg, font: `bold ${Math.floor(Math.min(0.78 * 512 * h / w, 0.86 * 512 / Math.max(2, [...text].length)))}px "Songti SC", serif` });

/** 学生电源：原点在底面中心，正面朝 +z。.pick；.setOn(on)；.term.pos / .term.neg：接线柱顶（局部坐标） */
export function powerSupply() {
  const g = new THREE.Group(), W = 0.1, H = 0.046, D = 0.056;
  const body = inked(new THREE.Mesh(new THREE.BoxGeometry(W, H, D), paint(0xe6e1d4)), { width: 0.9 }); body.position.y = H / 2; g.add(body);
  const face = inked(new THREE.Mesh(new THREE.BoxGeometry(W - 0.008, H - 0.01, 0.002), paint(0xd2d7dc, { keep: true })), { width: 0.6 }); face.position.set(0, H / 2, D / 2 + 0.001); g.add(face);
  const name = plate('学生电源', 0.044, 0.01, { bg: '#d2d7dc' }); name.position.set(-0.016, H * 0.66, D / 2 + 0.0023); g.add(name);
  const volt = plate('直流 6 V', 0.03, 0.008, { bg: '#d2d7dc', color: '#7a2a20' }); volt.position.set(-0.023, H * 0.34, D / 2 + 0.0023); g.add(volt);
  // 开关（翘板）和指示灯
  const sw = inked(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.016, 0.006), paint(0x3b3f46, { keep: true })), { width: 0.5 }); sw.position.set(0.026, H / 2, D / 2 + 0.004); g.add(sw);
  const pilotMat = new THREE.MeshBasicMaterial({ color: 0x7a3a33 });
  const pilot = hull(new THREE.Mesh(new THREE.SphereGeometry(0.0026, 12, 8), pilotMat), 0.0006); pilot.position.set(0.026, H * 0.82, D / 2 + 0.002); g.add(pilot);
  const pilotGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff5a3a, transparent: true, opacity: 0, depthWrite: false })); pilotGlow.scale.setScalar(0.014); pilotGlow.position.copy(pilot.position).add(V(0, 0, 0.002)); pilotGlow.raycast = () => {}; g.add(pilotGlow);
  // 接线柱：红（+）、黑（−），在顶面靠前
  const term = { pos: V(-0.03, H + 0.011, 0.016), neg: V(-0.01, H + 0.011, 0.016) };
  for (const [k, col] of [['pos', 0xc23a2e], ['neg', 0x2b2f36]]) {
    const p = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.0032, 0.0036, 0.011, 14), paint(col, { keep: true })), 0.0006); p.position.copy(term[k]).setY(H + 0.0055); g.add(p);
    const lab = plate(k === 'pos' ? '+' : '−', 0.008, 0.008, { bg: '#e6e1d4', color: k === 'pos' ? '#b0281e' : '#23293a' }); lab.rotation.x = -Math.PI / 2; lab.position.copy(term[k]).setY(H + 0.0004).add(V(0, 0, -0.01)); g.add(lab);
  }
  const pick = pickBox(W + 0.004, H * 0.8, D + 0.004, V(0, H * 0.62, 0)); g.add(pick);
  let on = false;
  return Object.assign(g, {
    pick, term, H,
    setOn(v) { on = v; sw.rotation.x = on ? 0.35 : -0.35; pilotMat.color.setHex(on ? 0xff4a2a : 0x7a3a33); pilotGlow.material.opacity = on ? 0.75 : 0; },
    get on() { return on; },
  });
}

/** 小灯泡和灯座：原点在底面中心。.set(b)：b = 实际功率 ÷ 额定功率。.term.a / .term.b：两个接线柱顶 */
export function bulbHolder() {
  const g = new THREE.Group();
  const base = inked(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.009, 0.03), paint(0x2f343c, { keep: true })), { width: 0.6 }); base.position.y = 0.0045; g.add(base);
  const socket = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0085, 0.012, 16), paint(0xb7bcc4, { keep: true })), 0.0006); socket.position.y = 0.015; g.add(socket);
  const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.006, 14), paint(0xc9a347, { keep: true })); thread.position.y = 0.024; g.add(thread);
  const BY = 0.036;          // 玻璃泡中心
  const glassM = new THREE.MeshBasicMaterial({ color: 0xf4f6f8, transparent: true, opacity: 0.55, depthWrite: false });
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.0115, 24, 16), glassM); glass.position.y = BY; glass.renderOrder = 9; g.add(glass);
  const rim = new THREE.Mesh(new THREE.SphereGeometry(0.0115, 24, 16), new THREE.MeshBasicMaterial({ color: 0x6b7f8c, side: THREE.BackSide, transparent: true, opacity: 0.55, depthWrite: false })); rim.scale.setScalar(1.07); rim.position.y = BY; rim.renderOrder = 8; g.add(rim);
  const filM = new THREE.MeshBasicMaterial({ color: 0x4a3d33 });
  const fil = new THREE.Mesh(new THREE.TorusGeometry(0.0032, 0.0005, 4, 14, Math.PI), filM); fil.position.y = BY - 0.001; fil.renderOrder = 10; g.add(fil);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.0003, 0.0003, 0.008, 4), filM); w.position.set(s * 0.0032, BY - 0.005, 0); w.renderOrder = 10; g.add(w); }
  const coreM = new THREE.MeshBasicMaterial({ color: 0xfff3c0, transparent: true, opacity: 0, depthWrite: false });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.0105, 20, 14), coreM); core.position.y = BY; core.renderOrder = 10; g.add(core);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffb627, transparent: true, opacity: 0, depthWrite: false })); halo.position.y = BY; halo.renderOrder = 11; halo.raycast = () => {}; g.add(halo);
  // 光芒：纸面上画几道短线（像画在本子上的“亮了”）
  const rays = new THREE.Group(); rays.position.y = BY; g.add(rays);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + 0.3; const l = polyline([V(Math.cos(a), Math.sin(a), 0), V(Math.cos(a) * 1.6, Math.sin(a) * 1.6, 0)], { width: 2.2, color: 0xe39a1c }); l.renderOrder = 12; rays.add(l); }
  const term = { a: V(-0.018, 0.013, 0.008), b: V(0.018, 0.013, 0.008) };
  for (const k of ['a', 'b']) { const p = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.0026, 0.003, 0.006, 12), paint(0xc9a347, { keep: true })), 0.0005); p.position.copy(term[k]).setY(0.012); g.add(p); }
  const OFF = new THREE.Color(0xf4f6f8), ON = new THREE.Color(0xffe27a), FIL0 = new THREE.Color(0x4a3d33), FIL1 = new THREE.Color(0xfff7d8);
  return Object.assign(g, {
    term, BY,
    set(b) {
      const v = Math.sqrt(Math.min(1.5, Math.max(0, b)));          // 人眼对亮度的感觉大致按开方
      glassM.color.copy(OFF).lerp(ON, Math.min(1, v * 1.3)); glassM.opacity = 0.55 + 0.4 * Math.min(1, v);
      coreM.opacity = Math.min(0.95, v * 1.1); coreM.color.setRGB(1, 0.8 + 0.2 * Math.min(1, v), 0.45 + 0.45 * Math.min(1, v));
      filM.color.copy(FIL0).lerp(FIL1, Math.min(1, v * 2));
      halo.material.opacity = Math.min(0.75, v * 0.8); halo.scale.setScalar(0.03 + 0.05 * Math.min(1.2, v));
      rays.visible = v > 0.22; rays.scale.setScalar(0.0135 * (0.85 + 0.9 * Math.min(1.2, v)));
    },
  });
}

/** 两根石墨电极，装在塑料横杆上：原点在横杆底面中心，电极往下伸 0.058 m。.pick；.post.l / .post.r：接线的地方（局部坐标） */
export function electrodes() {
  const g = new THREE.Group(), BAR = 0.062, LEN = 0.064, GAP = 0.02;
  const bar = inked(new THREE.Mesh(new THREE.BoxGeometry(BAR, 0.007, 0.014), paint(0xeeeae0)), { width: 0.7 }); bar.position.y = 0.0035; g.add(bar);
  const gr = paint(0x3a3e45, { keep: true });
  for (const s of [-1, 1]) {
    const rod = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, LEN, 14), gr), 0.0005); rod.position.set(s * GAP / 2, 0.006 - LEN / 2, 0); g.add(rod);
    const cap = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.004, 12), paint(0xc9a347, { keep: true })), 0.0005); cap.position.set(s * GAP / 2, 0.009, 0); g.add(cap);
  }
  const pick = pickBox(BAR + 0.006, 0.075, 0.024, V(0, -0.026, 0)); g.add(pick);
  return Object.assign(g, { pick, post: { l: V(-GAP / 2, 0.011, 0), r: V(GAP / 2, 0.011, 0) }, LEN: 0.058, GAP });
}

/** 导线：a → b 一条下垂的弧（局部坐标）。update(a, b) 只在两头挪动时重建 */
export function wire(group, color) {
  const mat = paint(color, { keep: true });
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat); mesh.raycast = () => {}; group.add(mesh);
  let A = null, B = null;
  return {
    mesh,
    update(a, b, lift = 0.04) {
      if (A && B && A.distanceTo(a) < 0.0003 && B.distanceTo(b) < 0.0003) return;
      A = a.clone(); B = b.clone();
      const top = Math.max(a.y, b.y) + lift, mid = a.clone().lerp(b, 0.5).setY(top);
      const pts = [a, a.clone().add(V(0, 0.016, 0)), a.clone().lerp(mid, 0.5).setY(top - 0.006), mid, b.clone().lerp(mid, 0.5).setY(top - 0.006), b.clone().add(V(0, 0.014, 0)), b];
      mesh.geometry.dispose(); mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.0013, 6);
    },
    dispose() { mesh.geometry.dispose(); },
  };
}

/** 一堆白色晶体：原点在底面中心；r 底半径，h 高。cubes：表面的小晶粒（NaCl 立方、KNO₃ 细长）。.setSize(r, h) */
export function saltHeap({ r = 0.022, h = 0.018, needle = false, n = 60 } = {}) {
  const g = new THREE.Group();
  const prof = []; for (let i = 0; i <= 10; i++) { const u = i / 10; prof.push(new THREE.Vector2(Math.max(0.0003, u), (1 - Math.pow(u, 2.2)) * 0.55 + 0.45 * (u < 0.92 ? 1 : (1 - u) / 0.08))); }
  prof.push(new THREE.Vector2(1, 0), new THREE.Vector2(0.0003, 0));
  const mound = hull(new THREE.Mesh(new THREE.LatheGeometry(prof.slice().reverse(), 36), paint(0xf6f5ef, { keep: true })), 0.025); g.add(mound);
  const gem = new THREE.InstancedMesh(needle ? new THREE.BoxGeometry(0.0008, 0.0008, 0.0034) : new THREE.BoxGeometry(0.0016, 0.0016, 0.0016), paint(0xffffff, { keep: true }), n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), seeds = [];
  for (let i = 0; i < n; i++) seeds.push([Math.sqrt(Math.random()) * 0.9, Math.random() * Math.PI * 2, Math.random() * 3, Math.random() * 3, Math.random() * 3]);
  g.add(gem); gem.raycast = () => {};
  const setSize = (R, H) => {
    g.visible = R > 0.0008; mound.scale.set(R, H, R);
    seeds.forEach(([u, a, x, y, z], i) => { const yy = ((1 - Math.pow(u, 2.2)) * 0.55 + 0.45) * H; e.set(x, y, z); q.setFromEuler(e); const s = Math.min(1, R / 0.008); m4.compose(V(Math.cos(a) * u * R, yy, Math.sin(a) * u * R), q, V(s, s, s)); gem.setMatrixAt(i, m4); });
    gem.instanceMatrix.needsUpdate = true;
  };
  setSize(r, h);
  return Object.assign(g, { setSize });
}

/** 药匙：原点在匙的中心，柄朝 +x。.pick；.load(k)：匙里的固体（0 空 … 1 一勺） */
export function spoon() {
  const g = new THREE.Group();
  const handle = inked(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.0018, 0.0052), paint(0xd9dde3)), { width: 0.5 }); handle.position.set(0.04, 0.0012, 0); g.add(handle);
  const bowl = inked(new THREE.Mesh(new THREE.SphereGeometry(0.0062, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xd9dde3)), { width: 0.4 }); bowl.rotation.x = Math.PI; bowl.scale.y = 0.42; bowl.position.y = 0.0026; g.add(bowl);
  const load = new THREE.Mesh(new THREE.SphereGeometry(0.0052, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xf8f7f2, { keep: true })); load.scale.y = 0.55; load.position.y = 0.0022; g.add(load);
  const pick = pickBox(0.085, 0.016, 0.018, V(0.035, 0.002, 0)); g.add(pick);
  return Object.assign(g, { pick, load(k) { load.visible = k > 0.02; load.scale.set(Math.cbrt(k), 0.55 * Math.cbrt(k), Math.cbrt(k)); } });
}

/** 玻璃棒：原点在上端，往下（−y）长 len。.pick */
export function glassRod(len = 0.1) {
  const g = new THREE.Group();
  const rod = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0021, 0.0021, len, 10), glass2({ base: 0.35, rim: 0.7, band: 0.4 })), { width: 0.5, opacity: 0.7 }); rod.position.y = -len / 2; rod.renderOrder = 10; g.add(rod);
  const pick = pickBox(0.014, len, 0.014, V(0, -len / 2, 0)); g.add(pick);
  return Object.assign(g, { pick, len });
}

// ================= 钻进去看 =================
// st：{ elec: 电极在这一杯里, on: 接通了电源, glow: 小灯泡的实际亮度（实际功率 ÷ 额定功率）, water: 有水, solid: 'NaCl' | 'KNO3' | null（干燥的固体是哪种）,
//       pairs: { NaCl, KNO3 }（溶液里画几对水合离子）, undis: { NaCl, KNO3 }（还没溶解的固体画几对离子）, name }
// 一对离子代表很多个；溶解得越多，画的离子越多。通电后带正电荷的水合离子向与电源负极相连的电极（右边）移动，
// 带负电荷的水合离子向与电源正极相连的电极（左边）移动（课本第 16 页、图1-12）。画面只是两个电极之间的一小块溶液：
// 从一边走出去的离子，另一边就有新的进来（溶液很大）。干燥的固体：离子按一定规则紧密排列，只在原地振动（图1-10）。
export function dianzhiScene() {
  const FILM = 9, XL = 4.3, NW = 4, YLO = 3.2, YHI = FILM - 3.1, DRIFT = 2.6;
  const ION = { NaCl: ['Na+', 'Cl-'], KNO3: ['K+', 'NO3-'] }, AQ = { NaCl: ['Na+aq', 'Cl-aq'], KNO3: ['K+aq', 'NO3-aq'] };
  const CAT = new Set(['Na+aq', 'K+aq']), ANY = new Set(['Na+aq', 'K+aq', 'Cl-aq', 'NO3-aq']);
  const SP = { NaCl: 1.4, KNO3: 2.3 };
  const NAME = { NaCl: 'NaCl', KNO3: 'KNO₃' };
  // 晶格：两种离子交替排（示意）。small：加进水里的一小块（2 × 2 × 2 里按相邻的一对一对取）
  const grid = (salt, nx, nz, ny, y0, x0 = 0) => { const s = SP[salt], out = []; for (let y = 0; y < ny; y++) for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) out.push([V(x0 + (i - (nx - 1) / 2) * s, y0 + y * s, (j - (nz - 1) / 2) * s), ION[salt][(i + j + y) % 2]]); return out; };
  const big = (salt) => (salt === 'KNO3' ? grid(salt, 4, 3, 2, 1.1) : grid(salt, 5, 4, 3, 0.8));
  const addIon = (c, k, p, extra = {}) => { const m = c.add(k, p, { fixed: true, home: p.clone(), ...extra }); if (k === 'NO3-') m.g.rotation.set(Math.PI / 2, 0, 0.3); else m.g.rotation.set(0, 0, 0); return m; };
  const crystal = (c, salt) => c.mols.filter((m) => m.fixed && m.salt === salt);
  const aqs = (c, k) => c.mols.filter((m) => m.kind === k && !m.fadeOut);
  const liquidAt = (c) => { const p = c.inLiquid(); p.y = c.rnd(YLO, YHI); p.x = c.rnd(-XL + 0.6, XL - 0.6); return p; };
  const addAq = (c, k, p, extra = {}) => { const m = c.add(k, p, extra); m.wander = V(c.rnd(-1, 1), c.rnd(-0.3, 0.3), c.rnd(-1, 1)); return m; };
  let gap = 0;
  const plates = (c, st) => {
    const H = st.water ? FILM : 4, mat = new THREE.MeshStandardMaterial({ color: 0x3f444c, roughness: 0.8, transparent: true, opacity: 0.55, depthWrite: false });
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, H, 5.5), mat); p.position.set(s * 7.4, H / 2, 0); c.layer.add(p);
      const t = textSprite(s < 0 ? '+' : '−', s < 0 ? '#c0392b' : '#2f5fa8', 'rgba(255,255,255,0.95)'); t.scale.set(8, 3, 1); t.position.set(s * 7.4, H + 1.6, 0); c.layer.add(t);
    }
  };
  return {
    labels: (k, m) => ANY.has(k) || !!m?.rep, dim: 1, solid: true, still: true,
    init(c, st) {
      gap = 0; c.view.paper = null; c.view.film = st.water ? FILM : 0; c.view.liquid = 0xb4e0f2;
      if (st.elec) plates(c, st);
      if (!st.water) {
        if (!st.solid) return;
        const sites = big(st.solid);
        sites.forEach(([p, k]) => addIon(c, k, p, { salt: st.solid }));
        // 认一认：前面上层各标一个
        ION[st.solid].forEach((k, j) => { const m = c.mols.filter((x) => x.kind === k).sort((a, b) => (b.g.position.y - a.g.position.y) || (b.g.position.z - a.g.position.z) || (j ? b.g.position.x - a.g.position.x : a.g.position.x - b.g.position.x))[0]; if (m) m.rep = true; });          // 一左一右，标签不叠在一起
        return;
      }
      for (let i = 0; i < NW; i++) c.add('H2O', c.inLiquid());
      const both = st.undis.NaCl > 0 && st.undis.KNO3 > 0;
      for (const salt of ['NaCl', 'KNO3']) {
        const n = Math.min(4, st.undis[salt]); if (!n) continue;
        grid(salt, 2, 2, 2, 0.75, both ? (salt === 'NaCl' ? -2.6 : 2.6) : 0).slice(0, 2 * n).forEach(([p, k]) => addIon(c, k, p, { salt }));
      }
      for (const salt of ['NaCl', 'KNO3']) for (let i = 0; i < st.pairs[salt]; i++) for (const k of AQ[salt]) addAq(c, k, liquidAt(c));
    },
    step(c, st, dt) {
      c.view.film = st.water ? FILM : 0; c.view.paper = null; c.view.liquid = 0xb4e0f2;
      // 晶格里的离子：只在原地振动
      for (const m of c.mols) if (m.rep) m.label.scale.set(6.5, 2.45, 1);
      for (const m of c.mols) if (m.fixed && m.home) m.g.position.copy(m.home).add(V(c.rnd(-0.05, 0.05), c.rnd(-0.05, 0.05), c.rnd(-0.05, 0.05)));
      if (!st.water) return;
      if (c.free('H2O').length < NW && Math.random() < dt * 3) c.add('H2O', c.inLiquid(), { fadeIn: true, dimK: 0 });
      // 溶解：水分子把固体表面的一对离子拉进水里，成了水合离子（个数跟着真实溶解的量走）
      gap -= dt;
      for (const salt of ['NaCl', 'KNO3']) {
        const [ck, ak] = AQ[salt], have = Math.min(aqs(c, ck).length, aqs(c, ak).length), want = st.pairs[salt];
        if (have < want && gap <= 0) {
          gap = 0.5;
          const cr = crystal(c, salt).sort((a, b) => b.g.position.y - a.g.position.y);
          const a = cr.find((m) => m.kind === ION[salt][0]), b = a && cr.filter((m) => m.kind === ION[salt][1]).sort((x, y) => x.g.position.distanceTo(a.g.position) - y.g.position.distanceTo(a.g.position))[0];
          if (a && b) for (const [m, k] of [[a, ck], [b, ak]]) { const p = m.g.position.clone(); c.remove(m); const n = addAq(c, k, p.add(V(0, 0.6, 0))); n.v.set(p.x * 0.3, 2.5, p.z * 0.3); n.labelK = 1; n.labelT = 2; }
          else for (const k of [ck, ak]) addAq(c, k, liquidAt(c), { fadeIn: true, dimK: 0 });
        } else if (have > want) { aqs(c, ck)[0].fadeOut = true; aqs(c, ak)[0].fadeOut = true; }
        // 没有溶解的固体比该有的多（换了一杯以后 init 已经摆好；这里只防万一）
      }
      // 水合离子：在水里自由移动（方向是乱的）；通电后阳离子往右（负极）、阴离子往左（正极）
      for (const m of [...c.mols]) {
        if (!ANY.has(m.kind) || m.fadeOut || m.busy) continue;
        m.wander.lerp(V(c.rnd(-1, 1), c.rnd(-0.4, 0.4), c.rnd(-1, 1)).multiplyScalar(1.6), Math.min(1, dt * 0.6));
        const pull = m.wander.clone().multiplyScalar(st.on ? 0.45 : 1); if (st.on) pull.x += CAT.has(m.kind) ? DRIFT : -DRIFT;
        const y = m.g.position.y; if (y < YLO) pull.y += (YLO - y) * 6; if (y > YHI) pull.y -= (y - YHI) * 6;
        if (!st.on && Math.abs(m.g.position.x) > XL) pull.x -= Math.sign(m.g.position.x) * (Math.abs(m.g.position.x) - XL) * 6;
        m.pull = pull; m.label.scale.set(5, 1.9, 1);
        if (st.on && (CAT.has(m.kind) ? m.g.position.x > XL : m.g.position.x < -XL)) {
          m.fadeOut = true;
          const p = m.g.position.clone(); p.x = CAT.has(m.kind) ? -XL : XL;
          addAq(c, m.kind, p, { fadeIn: true, dimK: 0 }).v.set(CAT.has(m.kind) ? 2 : -2, 0, 0);
        }
      }
    },
    text(c, st) {
      const nm = st.name || '';
      const eq = `<span style="font-size:0.8em">${nm}${st.elec ? (st.on ? '　· 接通了电源' : '　· 没有接通电源') : ''}</span>`;
      if (!st.water) {
        if (!st.solid) return { eq, cap: '烧杯是空的', on: true };
        const [a, b] = ION[st.solid];
        return { eq, on: true, cap: st.on
          ? `接通了电源，可是 ${f(a)}、${f(b)} 仍然紧密地排列着，<b>不能自由移动</b>，只在原地振动——没有电流，小灯泡不亮`
          : `干燥的 ${NAME[st.solid]} 固体里有带正电荷的 ${f(a)} 和带负电荷的 ${f(b)}，它们按一定规则<b>紧密地排列</b>着，只在原地振动` };
      }
      const pr = st.pairs.NaCl + st.pairs.KNO3, un = st.undis.NaCl + st.undis.KNO3;
      const ions = ['NaCl', 'KNO3'].filter((s) => st.pairs[s]).map((s) => `${f(AQ[s][0])}、${f(AQ[s][1])}`).join('、');
      if (!pr && !un) return { eq, on: true, cap: `蒸馏水里几乎只有水分子，<b>几乎没有能自由移动的、带电荷的粒子</b>${st.on ? '：接通电源，小灯泡也不亮' : ''}（严格地说，蒸馏水也能导电，只是导电能力非常弱，这个装置测不出）` };
      if (!pr) return { eq, on: true, cap: '固体刚加进水里：水分子撞着固体表面，正要把离子拉进水里' };
      const more = un ? `还有固体没有溶解：溶解得越多，能自由移动的离子越多，${st.on ? '电流越大，小灯泡越亮' : '导电能力越强'}。` : '';
      const g = st.glow || 0, lamp = g >= 0.25 ? '形成电流，小灯泡亮' : g >= 0.03 ? '形成电流，小灯泡微微发亮' : '离子定向移动形成电流（电流很小，灯泡不亮）';          // 和桌上小灯泡的实际亮度一致
      return { eq, on: true, cap: st.on
        ? `接通电源：带正电荷的水合离子<b>向与电源负极相连的电极</b>（右）移动，带负电荷的水合离子<b>向与电源正极相连的电极</b>（左）移动——${lamp}。${more}`
        : `水分子把离子从固体表面拉进水里，形成<b>能够自由移动的</b>水合离子（${ions}，每个离子周围围着水分子），方向是乱的。${more}` };
    },
  };
}
