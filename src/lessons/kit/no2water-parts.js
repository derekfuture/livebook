// 二氧化氮溶于水（no2water，必修第二册【实验5-5】）用的器材和“钻进去看”。
//   syringe50()：50 mL 注射器（横放，管口朝左）+ 乳胶管 + 弹簧夹；里面的水、气体颜色、概念色的点。
//   no2Scene()：微观——注射器里一小块：NO、O₂、N₂、NO₂ 和水。2NO + O₂ → 2NO₂；3NO₂ + H₂O → 2HNO₃ + NO（硝酸在水里电离成 H⁺、NO₃⁻）。
// 注射器的局部坐标：x 轴是注射器的轴，原点在针筒里面那头（管口那头）的内壁中心，+x 朝活塞；活塞面在 x = L。
import * as THREE from 'three';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import { paint, inked, hull, glassEdge } from '../../live/ink.js';
import { glass2, water2 } from './chemfx.js';
import { canvasTex } from './props.js';
import { f } from './microworld.js';

export const RI = 0.0145, RO = 0.0158;                 // 针筒内径 29 mm（50 mL 注射器）
export const ML_PER_M = Math.PI * 1.45 * 1.45 * 100;    // 每米长多少 mL（约 660.5）：50 mL 刻度在 7.57 cm
export const BARREL = 0.084;                            // 针筒内长（到开口那头）
export const LAT_S = 0.028, LAT_ARC = 0.05;             // 乳胶管：直的一段到 x = −LAT_S（弹簧夹在这段上），后面 5 cm 是软的，提起来时垂下去
export const CLIP_X = -0.024;                           // 弹簧夹的位置
export const REST_Y = 0.0166;                           // 横放在桌上时轴的高度（卡口的短半轴略大于针筒外径）
export const ROD = 0.098;                               // 活塞面到推柄外沿
const V2 = (x, y) => new THREE.Vector2(x, y);

/** 50 mL 注射器。返回 group：.plunger（活塞，x = L）、.clip（弹簧夹，.setOpen(k)）、.barrelPick / .plungerPick / .clipPick、.setL(L)、.contents */
export function syringe50() {
  const g = new THREE.Group();
  // 针筒：沿 y 车出来再转到 x
  const prof = [V2(0.0011, -0.0135), V2(0.0021, -0.0135), V2(0.0026, -0.0045), V2(0.0062, -0.0031), V2(RO, -0.0024), V2(RO, BARREL), V2(RO + 0.0006, BARREL + 0.0008),
    V2(RI, BARREL + 0.0008), V2(RI, 0), V2(0.0026, 0), V2(0.0011, -0.0012)];
  const barrel = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), glass2({ base: 0.05, rim: 0.4, band: 0.5 }));
  barrel.rotation.z = -Math.PI / 2; barrel.renderOrder = 9; glassEdge(barrel, 0.0005); g.add(barrel);
  // 卡口（手指卡住的那片）：椭圆，长轴横着
  const fs = new THREE.Shape(); fs.absellipse(0, 0, 0.026, 0.0168, 0, Math.PI * 2);
  const hole = new THREE.Path(); hole.absarc(0, 0, RO, 0, Math.PI * 2, true); fs.holes.push(hole);
  const flange = new THREE.Mesh(new THREE.ExtrudeGeometry(fs, { depth: 0.0024, bevelEnabled: false, curveSegments: 40 }), glass2({ base: 0.12, rim: 0.45, band: 0.4 }));
  flange.rotation.y = Math.PI / 2; flange.position.x = BARREL - 0.0016; flange.renderOrder = 9; glassEdge(flange, 0.0004); g.add(flange);
  // 刻度：印在针筒朝前上方的一条（0 在管口那头，课本图里 10 20 30 40 50 mL）
  const LEN = 0.081, A0 = 0.62, SPAN = 0.42;
  const scaleTex = canvasTex(1024, 160, (c, W, H) => {
    c.clearRect(0, 0, W, H); c.strokeStyle = '#2f3644'; c.fillStyle = '#2f3644'; c.lineCap = 'round';
    for (let ml = 0; ml <= 50; ml++) {
      const x = (ml / ML_PER_M / LEN) * W, long = ml % 10 === 0, mid = ml % 5 === 0;
      c.lineWidth = long ? 4 : 2.6; c.beginPath(); c.moveTo(x, 6); c.lineTo(x, long ? 62 : mid ? 44 : 28); c.stroke();
      if (long && ml) { c.font = 'bold 64px "Times New Roman", serif'; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillText(String(ml), x, 132); }
    }
    c.font = 'bold 52px "Times New Roman", serif'; c.textAlign = 'left'; c.fillText('mL', (53 / ML_PER_M / LEN) * W, 132);
  });
  const sg = new THREE.PlaneGeometry(LEN, 1, 48, 8), sp = sg.attributes.position;
  for (let i = 0; i < sp.count; i++) { const x = sp.getX(i) + LEN / 2, a = A0 + sp.getY(i) * SPAN * 2, r = RO + 0.00025; sp.setXYZ(i, x, Math.sin(a) * r, Math.cos(a) * r); }
  sg.computeVertexNormals();
  const scale = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ map: scaleTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  scale.renderOrder = 10; scale.raycast = () => {}; g.add(scale);

  // 活塞：橡胶头 + 十字形推杆 + 推柄（活塞面在 plunger 的 x = 0）
  const plunger = new THREE.Group(); g.add(plunger);
  const rubber = paint(0x3d4149, { keep: true });          // 橡胶活塞头保留深色：读刻度就看它
  const head = inked(new THREE.Mesh(new THREE.CylinderGeometry(RI - 0.0002, RI - 0.0002, 0.008, 36), rubber), { width: 0.6 }); head.rotation.z = Math.PI / 2; head.position.x = 0.004; plunger.add(head);
  for (const x of [0.0012, 0.0068]) { const rib = new THREE.Mesh(new THREE.TorusGeometry(RI - 0.0004, 0.0006, 6, 36), rubber); rib.rotation.y = Math.PI / 2; rib.position.x = x; plunger.add(rib); }
  const rodMat = paint(0xe9ecef);
  for (const [w, h] of [[0.0018, 0.02], [0.02, 0.0018]]) { const b = inked(new THREE.Mesh(new THREE.BoxGeometry(ROD - 0.011, w, h), rodMat), { width: 0.5 }); b.position.x = 0.008 + (ROD - 0.011) / 2; plunger.add(b); }
  const thumb = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.0026, 36), rodMat), { width: 0.6 }); thumb.rotation.z = Math.PI / 2; thumb.position.x = ROD - 0.0013; plunger.add(thumb);
  const plungerPick = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.028, 0.028), new THREE.MeshBasicMaterial({ visible: false })); plungerPick.position.x = ROD - 0.016; plungerPick.userData.pick = true; plunger.add(plungerPick);

  // 乳胶管（套在管口上，三段：中间一段被弹簧夹夹扁）
  const latMat = paint(0xc98a4a);
  const latSeg = (x0, x1) => { const m = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0034, 0.0034, x1 - x0, 18), latMat), { width: 0.5 }); m.rotation.z = Math.PI / 2; m.position.x = (x0 + x1) / 2; g.add(m); return m; };
  latSeg(-0.0112, CLIP_X + 0.0022); const pinch = latSeg(CLIP_X - 0.0022, CLIP_X + 0.0022); latSeg(-LAT_S, CLIP_X - 0.0022);
  const soft = hull(new THREE.Mesh(new THREE.BufferGeometry(), latMat), 0.0006); g.add(soft);
  const latEnd = new THREE.Mesh(new THREE.CircleGeometry(0.0024, 16), paint(0x6b4426)); g.add(latEnd);
  let latKey = '';
  const setLatex = (bend, tilt) => {
    const key = `${bend.toFixed(3)}|${tilt.toFixed(3)}`; if (key === latKey) return; latKey = key;
    const pts = latexCurve(bend, tilt).map(([x, y]) => new THREE.Vector3(x, y, 0));
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 32, 0.0034, 12, false);
    soft.geometry.dispose(); soft.geometry = geo; for (const c of soft.children) c.geometry = geo;
    const a = pts[pts.length - 1], b = pts[pts.length - 2], dir = a.clone().sub(b).normalize();
    latEnd.position.copy(a).addScaledVector(dir, 0.0001); latEnd.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
  };
  setLatex(0, 0);

  // 弹簧夹：两片夹嘴上下夹住乳胶管；两根钢丝在乳胶管前后往上，顶上一片按手（捏住按手 = 打开）；下面一个小圈是弹簧
  const clip = new THREE.Group(); clip.position.x = CLIP_X; g.add(clip);
  const steel = paint(0x8d949e), pad = paint(0xd6dade);
  const jawU = inked(new THREE.Mesh(new THREE.BoxGeometry(0.0034, 0.0012, 0.0118), steel), { width: 0.5 }), jawD = jawU.clone(); clip.add(jawU, jawD);
  const wires = [];
  for (const z of [-0.0062, 0.0062]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.0006, 0.0006, 1, 8), steel); w.position.z = z; clip.add(w); wires.push(w); }
  const padM = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.0014, 24), pad), { width: 0.5 }); padM.scale.set(1, 1, 1.5); clip.add(padM);
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.0026, 0.0007, 8, 20), steel); clip.add(coil);
  const clipPick = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.034, 0.016), new THREE.MeshBasicMaterial({ visible: false })); clipPick.position.y = 0.006; clipPick.userData.pick = true; clip.add(clipPick);
  clip.setOpen = (k) => {          // k = 0 夹上（乳胶管夹扁），1 打开
    const gap = 0.0016 + k * 0.0056;
    jawU.position.y = gap / 2 + 0.0006; jawD.position.y = -gap / 2 - 0.0006;
    pinch.scale.set(0.3 + 0.7 * k, 1, 1);          // 圆柱转到 x 轴后，局部 x 是竖直方向：压扁竖直方向
    const top = 0.0185 - k * 0.003; padM.position.y = top;
    for (const w of wires) { const y0 = -0.0085, y1 = top; w.scale.y = y1 - y0; w.position.y = (y0 + y1) / 2; }
    coil.position.y = -0.0085; coil.rotation.y = Math.PI / 2;
  };
  clip.setOpen(0);

  const barrelPick = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.035, 0.035), new THREE.MeshBasicMaterial({ visible: false })); barrelPick.position.x = 0.04; barrelPick.userData.pick = true; g.add(barrelPick);

  const contents = syringeContents(g);
  Object.assign(g, { plunger, clip, barrelPick, plungerPick, clipPick, contents, barrel, setLatex,
    setL(L) { plunger.position.x = L; } });
  return g;
}

/** 乳胶管软的那一段（注射器局部坐标）：bend 0 = 平放在桌上（直的）；1 = 提在空中，末端垂直朝下（弯过的角度跟着注射器的倾斜） */
export function latexCurve(bend, tilt, N = 16) {
  const phi = bend * Math.max(0, Math.PI / 2 - tilt), pts = [[-LAT_S, 0]]; let x = -LAT_S, y = 0;
  for (let i = 0; i < N; i++) { const a = Math.PI + phi * (i + 0.5) / N, ds = LAT_ARC / N; x += Math.cos(a) * ds; y += Math.sin(a) * ds; pts.push([x, y]); }
  return pts;
}
export const latexEnd = (bend, tilt) => { const p = latexCurve(bend, tilt); return p[p.length - 1]; };

// ---------------- 针筒里的东西：水（水面始终水平）、红棕色的 NO₂、概念色的点 ----------------
const segBelow = (c) => {          // 半径 RI 的圆里 y ≤ c 的面积
  if (c >= RI) return Math.PI * RI * RI; if (c <= -RI) return 0;
  return Math.PI * RI * RI - (RI * RI * Math.acos(c / RI) - c * Math.sqrt(RI * RI - c * c));
};
/** 倾斜 th（管口朝下为正）、长 L 的一段针筒里，高度（相对轴原点）低于 h 的体积（m³） */
function volBelow(h, L, th) {
  const N = 40, s = Math.sin(th), co = Math.cos(th); let v = 0;
  for (let i = 0; i < N; i++) { const x = ((i + 0.5) / N) * L; v += segBelow((h - x * s) / co); }
  return (v * L) / N;
}
/** 水面高度（相对轴原点，沿世界竖直方向） */
export function waterLevel(wml, L, th) {
  const target = wml * 1e-6, s = Math.sin(th), co = Math.cos(th);
  let lo = -RI * co, hi = L * s + RI * co;
  if (target <= 0) return lo; if (target >= Math.PI * RI * RI * L) return hi;
  for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (volBelow(m, L, th) < target) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

const DOT = { no: { color: 0x8a84a6, r: 0.0007, max: 70, op: 0.85 }, o2: { color: 0x2f7fe0, r: 0.00085, max: 40, op: 0.95 }, n2: { color: 0xa9aba2, r: 0.0006, max: 90, op: 0.7 } };
export const ML_PER_DOT = 0.5;

function syringeContents(syr) {
  const R = RI * 0.985;
  // 水：凸包（针筒这一段 ∩ 水面以下），每次水量 / 长度 / 倾斜变了才重建
  const wMat = water2({ color: 0x9fd2ea, base: 0.42, rim: 0.3 });
  const water = new THREE.Mesh(new THREE.BufferGeometry(), wMat); water.renderOrder = 7.5; water.raycast = () => {}; syr.add(water);
  let wKey = '';
  // 气体：沿轴的圆柱，按位置给不透明度（红棕色从进气的一头往里散开）；水面以下用世界里的水平裁切面去掉
  const gGeo = new THREE.CylinderGeometry(R * 0.995, R * 0.995, 1, 32, 24, false); gGeo.rotateZ(-Math.PI / 2); gGeo.translate(0.5, 0, 0);
  const gCol = new Float32Array(gGeo.attributes.position.count * 4); gGeo.setAttribute('color', new THREE.BufferAttribute(gCol, 4));
  const cut = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const gMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, clippingPlanes: [cut] });
  const gas = new THREE.Mesh(gGeo, gMat); gas.renderOrder = 8; gas.raycast = () => {}; syr.add(gas);
  const BROWN = new THREE.Color(0xa4461c), LAM = 0.22, NORM = LAM * (1 - Math.exp(-1 / LAM));
  // 概念色的点
  const pools = {}, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pp = new THREE.Vector3();
  for (const [k, d] of Object.entries(DOT)) {
    const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: d.op, depthWrite: false }), d.max);
    mesh.count = 0; mesh.renderOrder = 8.6; mesh.frustumCulled = false; mesh.raycast = () => {}; syr.add(mesh);
    pools[k] = { mesh, d, list: [] };
  }
  let h = -1, L = 0.03, th = 0, wml = 0;
  const above = (x, y) => x * Math.sin(th) + y * Math.cos(th) > h + 0.0009;
  const randIn = (u0, u1) => {
    for (let k = 0; k < 30; k++) { const r = Math.sqrt(Math.random()) * R * 0.86, a = Math.random() * 6.283, x = (u0 + Math.random() * (u1 - u0)) * L, y = Math.cos(a) * r, z = Math.sin(a) * r; if (wml < 0.05 || above(x, y)) return { u: x / L, y, z }; }
    return { u: u0 + Math.random() * (u1 - u0), y: R * 0.6, z: 0 };
  };
  const api = {
    water, gas,
    /** 每帧：w 水（mL）、Lm 活塞面位置、tilt 倾斜、sp 各种气体 { no, o2, n2, no2 }（mL）、mix 0…1（红棕色散开的程度）、slosh 振荡时水面晃动 */
    update({ w, Lm, tilt, sp, mix, slosh = 0, dt, spawn = {} }) {
      const gasMl = sp.no + sp.o2 + sp.n2 + sp.no2, no2 = sp.no2;
      wml = w; L = Math.max(0.002, Lm); th = tilt;
      h = waterLevel(w, L, th);
      // 水
      const key = `${w.toFixed(2)}|${(L * 1000).toFixed(1)}|${th.toFixed(3)}|${slosh.toFixed(2)}`;
      if (key !== wKey) {
        wKey = key; water.visible = w > 0.04;
        if (water.visible) {
          const s = Math.sin(th), co = Math.cos(th), pts = [], N = 40, hh = h;
          const tiltS = slosh * 0.5;          // 振荡时水面歪一点（示意）
          const lev = (x) => hh + (x / L - 0.5) * tiltS * RI;
          for (let i = 0; i < N; i++) {
            const a = (i / N) * Math.PI * 2, y = Math.cos(a) * R, z = Math.sin(a) * R;
            let xe = L;
            if (s > 1e-5) xe = Math.min(L, (hh - y * co) / s);
            else if (y * co > lev(0) && y * co > lev(L)) xe = -1;
            if (xe > 0.0002) { pts.push(new THREE.Vector3(0.0003, y, z), new THREE.Vector3(xe, y, z)); }
          }
          for (const x of [0.0003, L]) { const c = (lev(x) - x * s) / co; if (Math.abs(c) < R) { const zz = Math.sqrt(R * R - c * c); pts.push(new THREE.Vector3(x, c, zz), new THREE.Vector3(x, c, -zz)); } }
          if (pts.length >= 6) { water.geometry.dispose(); try { water.geometry = new ConvexGeometry(pts); } catch (e) { water.visible = false; } }
          else water.visible = false;
        }
      }
      // 气体的裁切面：水面（世界坐标）
      syr.updateMatrixWorld(true);
      if (w > 0.04) { const co = Math.cos(th); const p = syr.localToWorld(new THREE.Vector3(0, h / co, 0)); cut.constant = -p.y; }
      else cut.constant = 1e3;
      gas.scale.x = L;
      // 红棕色：总量按 NO₂ 占气体的比例；从管口那头往里散开（mix 0 → 1 变均匀）
      const vg = Math.max(0.01, gasMl), c0 = no2 / vg, pos = gGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i), prof = (1 - mix) * Math.exp(-u / LAM) / NORM + mix;          // 沿轴的平均值为 1
        const c = c0 * prof, a = 0.86 * (1 - Math.exp(-c / 0.07));
        gCol.set([BROWN.r, BROWN.g, BROWN.b, a], i * 4);
      }
      gGeo.attributes.color.needsUpdate = true; gas.visible = no2 > 0.005;
      // 点：个数 = 体积 / 0.5 mL；新来的从 spawn 指定的地方出来（'tip' 管口、'surf' 水面）
      for (const [k, P] of Object.entries(pools)) {
        const want = Math.min(P.d.max, Math.round(sp[k] / ML_PER_DOT));
        while (P.list.length < want) {
          const from = spawn[k] || 'any';
          const d = from === 'tip' ? randIn(0.0, 0.08) : randIn(0.02, 0.98);
          if (from === 'surf' && wml > 0.05) { const x = (0.1 + Math.random() * 0.85) * L, co = Math.cos(th), c = (h - x * Math.sin(th)) / co + 0.0012; if (Math.abs(c) < R * 0.9) { d.u = x / L; d.y = c; d.z = (Math.random() - 0.5) * 2 * Math.sqrt(R * R * 0.8 - c * c); } }
          P.list.push({ ...d, vu: 0, vy: 0, vz: 0 });
        }
        while (P.list.length > want) {
          // 去掉的：漏出去时是管口那头的，反应掉的随便哪个
          let j = Math.floor(Math.random() * P.list.length);
          if (spawn[k + 'Out'] === 'tip') { j = 0; for (let i = 1; i < P.list.length; i++) if (P.list[i].u < P.list[j].u) j = i; }
          P.list.splice(j, 1);
        }
        const jig = 1 + slosh * 4;
        P.list.forEach((d, i) => {
          d.vu += (Math.random() - 0.5) * dt * 0.6 * jig; d.vy += (Math.random() - 0.5) * dt * 0.02 * jig; d.vz += (Math.random() - 0.5) * dt * 0.02 * jig;
          d.vu *= Math.pow(0.2, dt); d.vy *= Math.pow(0.2, dt); d.vz *= Math.pow(0.2, dt);
          d.u = Math.min(0.97, Math.max(0.02, d.u + d.vu * dt)); d.y += d.vy * dt; d.z += d.vz * dt;
          const rr = Math.hypot(d.y, d.z), lim = R * 0.86; if (rr > lim) { d.y *= lim / rr; d.z *= lim / rr; d.vy *= -0.5; d.vz *= -0.5; }
          if (wml > 0.05 && !above(d.u * L, d.y)) { d.y += 0.0012; d.vy = Math.abs(d.vy); }
          pp.set(d.u * L, d.y, d.z); sc.setScalar(P.d.r); m4.compose(pp, q, sc); P.mesh.setMatrixAt(i, m4);
        });
        P.mesh.count = P.list.length; P.mesh.instanceMatrix.needsUpdate = true;
      }
    },
    clear() { for (const P of Object.values(pools)) P.list.length = 0; wKey = ''; },
    setDots(on) { for (const P of Object.values(pools)) P.mesh.visible = on; },
  };
  return api;
}

// ================= 微观：注射器里的一小块 =================
// st：{ water: 有水没有, no, o2, n2, no2: 各种气体（mL）, o2In / n2In: 吸进来的空气里的 O₂ / N₂ 累计（mL）, hno3: 生成的 HNO₃（按 mL 气体当量，= 被吸收的 NO₂ × 2/3）, shaking: 正在振荡, leak: 正在把气体推出去 }
// 分子个数 = 体积 ÷ 2.1 mL（按真实体积比画：10 mL 空气里正好 1 个 O₂、约 4 个 N₂，20 mL NO 约 10 个）。
// 这一小块和针筒里别的地方是通着的：个数对不上（比如只有 2 个 NO₂、要 3 个才反应）时，旁边飘进来一个 / 飘走一个。
// 2NO + O₂ → 2NO₂：一个 O₂ 带走两个 NO，变成两个 NO₂（3 个分子变 2 个：气体少了）。
// 3NO₂ + H₂O → 2HNO₃ + NO：在水面上，三个 NO₂ 和一个 H₂O 变成两个 HNO₃（在水里电离成 2 个 H⁺、2 个 NO₃⁻）和一个 NO（回到气体里）。原子种类、个数守恒。
const ARR = '<span class="arr">══</span>';
export const MICRO_ML = 2.1;
export function no2Scene() {
  const FILM = 2.6, NW = 3, U = MICRO_ML;
  const RX1 = { in: ['NO', 'NO', 'O2'], out: ['NO2', 'NO2'], host: 2, at: [0, 0, 0], near: [[-1.9, 0.2, 0.3], [1.9, -0.2, -0.3], null],
    place: [[-1.3, 0, 0.2], [1.3, 0, -0.2]], map: [[0, 0], [0, 1], [2, 0], [1, 0], [1, 1], [2, 1]], approach: 1.4, dur: 2.2, burst: [0xffe2a0, 0xd9a07a],
    after: [{ gas: true, v: [-0.6, 0.3, 0] }, { gas: true, v: [0.6, 0.3, 0] }] };
  // 生成物：H⁺、H⁺、NO₃⁻、NO₃⁻、NO。原子来源：NO₃⁻ 的 N、O、O 来自一个 NO₂，第三个 O 来自 H₂O（示意：只表示原子守恒，不表示真实的反应步骤）
  //   第一个 NO₃⁻ ← NO₂#0 的 N、O、O + H₂O 的 O；第二个 NO₃⁻ ← NO₂#1 的 N、O、O + NO₂#2 的一个 O；NO ← NO₂#2 的 N、另一个 O；H⁺ ← H₂O 的两个 H
  const RX2 = { in: ['NO2', 'NO2', 'NO2', 'H2O'], out: ['H+', 'H+', 'NO3-', 'NO3-', 'NO'], host: 3, at: [0, 0.3, 0],
    nearAbs: (m, i) => (i === 3 ? null : m[3].g.position.clone().add(new THREE.Vector3([-1.9, 0, 1.9][i], 1.6, [0.5, -0.6, 0.2][i]))),
    place: [[-2.2, -0.6, 0.6], [2.2, -0.6, -0.6], [-1.0, -0.4, -0.2], [1.2, -0.3, 0.4], [0, 2.4, 0]],
    map: [[3, 1], [3, 2], [0, 0], [0, 1], [0, 2], [3, 0], [1, 0], [1, 1], [1, 2], [2, 1], [2, 0], [2, 2]],
    approach: 1.6, dur: 2.6, burst: [0xd9a07a, 0x9fd8ff],
    after: [{}, {}, {}, {}, { gas: true, v: [0, 1.6, 0] }] };
  const want = (st) => ({ NO: Math.round(st.no / U), O2: Math.round(st.o2 / U), N2: Math.round(st.n2 / U), NO2: Math.round(st.no2 / U), HNO3: Math.round(st.hno3 / U) });
  const nEv = (c, rx) => c.events.filter((e) => e.rx === rx).length;
  const gasCount = (c, k) => c.mols.filter((m) => m.kind === k && !m.leaving && !m.fadeOut).length;
  let acc = 0, last = '', addO2 = 0, addN2 = 0;
  return {
    labels: (k) => k === 'NO2' || k === 'O2' || k === 'H+' || k === 'NO3-', dim: 0.5,
    init(c, st) {
      c.view.paper = null; c.view.film = st.water ? FILM : 0; acc = 0; last = '';
      const W = want(st); addO2 = Math.round(st.o2In / U); addN2 = Math.round(st.n2In / U);
      for (const [k, n] of [['NO', W.NO], ['O2', W.O2], ['N2', W.N2], ['NO2', W.NO2]]) for (let i = 0; i < Math.min(n, 40); i++) c.add(k, c.inGas(), { gas: true });
      if (st.water) {
        for (let i = 0; i < NW; i++) c.add('H2O', c.inLiquid());
        const nAcid = Math.min(6, Math.round(W.HNO3 / 2) * 2); for (let i = 0; i < nAcid; i++) { c.add('H+', c.inLiquid()); c.add('NO3-', c.inLiquid()); }
      }
    },
    step(c, st, dt) {
      c.view.paper = null; c.view.film = st.water ? FILM : 0; c.view.liquid = 0x9fd2ea; c.view.speed = st.shaking ? 1.8 : 1;
      const W = want(st), n1 = nEv(c, RX1), n2 = nEv(c, RX2);
      // 现在有几个（算上正在进行的反应：反应完以后会变成多少）
      const eff = { NO: gasCount(c, 'NO') - 2 * n1 + n2, O2: gasCount(c, 'O2') - n1, NO2: gasCount(c, 'NO2') + 2 * n1 - 3 * n2, N2: gasCount(c, 'N2') };
      acc += dt;
      // 1. 空气从管口进来（从底座左边飘进来）：按吸进来的空气累计（宏观里 O₂ 一进来就反应掉了，这里慢放重演）
      const inO2 = Math.round(st.o2In / U), inN2 = Math.round(st.n2In / U);
      if (acc > 0.18 && (addO2 < inO2 || addN2 < inN2)) {
        acc = 0; const k = addO2 < inO2 && (addO2 / Math.max(1, inO2) <= addN2 / Math.max(1, inN2) || addN2 >= inN2) ? 'O2' : 'N2';
        if (k === 'O2') addO2++; else addN2++;
        const a = c.rnd(2.7, 3.5), m = c.add(k, c.V([Math.cos(a) * 5.2, c.rnd(FILM + 2, 7), Math.sin(a) * 2]), { gas: true, fadeIn: true, dimK: 0 }); m.v.set(1.6, 0, 0);
      }
      // 还要吸收的 NO₂：差 2 个以上，或者宏观里已经吸收完、这里还剩一两个（凑够 3 个再反应）
      const absorb = st.water && (eff.NO2 - W.NO2 >= 2 || (W.NO2 === 0 && eff.NO2 > 0));
      // 2. 2NO + O₂ → 2NO₂
      if (eff.O2 > W.O2 && c.events.length < 2) {
        const o = c.free('O2')[0], nos = o && c.free('NO').sort((a, b) => a.g.position.distanceTo(o.g.position) - b.g.position.distanceTo(o.g.position)).slice(0, 2);
        if (o && nos.length === 2) c.start(RX1, [nos[0], nos[1], o]);
      }
      // 3. 振荡：3NO₂ + H₂O → 2H⁺ + 2NO₃⁻ + NO（在水面上）
      else if (absorb && c.events.length < 2) {
        const w = c.free('H2O').sort((a, b) => b.g.position.y - a.g.position.y)[0];
        const ns = w && c.free('NO2').sort((a, b) => a.g.position.y - b.g.position.y).slice(0, 3);
        if (w && ns.length === 3) c.start(RX2, [...ns, w]);
      }
      // 要吸收、可这一小块里不够 3 个 NO₂：旁边飘进来一个
      if (absorb && c.free('NO2').length < 3 && !c.events.length && acc > 0.4) { acc = 0; const m = c.add('NO2', c.V([c.rnd(-4, 4), c.rnd(FILM + 2.5, 7), -3.2]), { gas: true, fadeIn: true, dimK: 0 }); m.v.set(0, -0.6, 1.2); }
      // 推出去（漏掉）的：从上面飞走；没有反应等着做时，多了的飘走、少了的飘进来（这一小块和别处通着）
      const pending = eff.O2 > W.O2 || (st.water && eff.NO2 > W.NO2) || addO2 < inO2 || addN2 < inN2;
      if (!c.events.length && !pending && acc > 0.4) for (const k of ['NO', 'O2', 'N2', 'NO2']) {
        if (eff[k] > W[k] + 0.5) { const m = c.free(k)[0]; if (m) { acc = 0; if (st.leak) { m.leaving = true; m.gas = true; m.v.y = 2; } else m.fadeOut = true; } break; }
        if (eff[k] < W[k] - 0.5 && !st.leak) { acc = 0; c.add(k, c.inGas(), { gas: true, fadeIn: true, dimK: 0 }); break; }
      }
      // 水分子：反应用掉的从旁边补进来（水很多）
      if (st.water && c.free('H2O').length + c.events.filter((e) => e.rx === RX2).length < NW && Math.random() < dt * 2) c.add('H2O', c.inLiquid(), { fadeIn: true, dimK: 0 });
      // 液体里的离子：太多了就淡出一对（这一小块溶液在大的溶液里，离子走来走去）
      if (c.free('H+').length > 6 && c.free('NO3-').length > 6) c.pairOut('H+', 'NO3-');
      for (const m of c.mols) {
        if ((m.kind === 'H+' || m.kind === 'NO3-') && m.gas) m.gas = false;
        if (m.kind === 'NO' && m.leaving) m.v.y = Math.min(Math.max(m.v.y, 1), 2.2);
      }
      last = n1 ? 'rx1' : n2 ? 'rx2' : last;
    },
    text(c, st) {
      // 方程式按正在看的那个反应选：正在水面上反应 / 还有 NO₂（宏观或这一小块里）→ 吸收；正在氧化 / 还有 O₂ 要进来、要反应 → 氧化
      const e = c.events[0], nNO2 = gasCount(c, 'NO2'), nO2 = gasCount(c, 'O2'), o2Coming = addO2 < Math.round(st.o2In / U);
      const absorbing = e?.rx === RX2 || ((nNO2 > 0 || st.no2 > 0.05) && !(e?.rx === RX1) && !o2Coming && !(nO2 > 0 && st.o2 > 0.05));
      const done2 = !e && !nNO2 && st.no2 <= 0.05 && st.hno3 > 0 && !o2Coming && !nO2;          // 宏观、这一小块里都没有 NO₂ 了，也没有反应在放
      const eq = absorbing || done2 ? `${f('NO2', '3')} + ${f('H2O')} ${ARR} 2HNO<sub>3</sub> + ${f('NO')}` : `${f('NO', '2')} + ${f('O2')} ${ARR} ${f('NO2', '2')}`;
      const cap = e?.rx === RX1 ? `一个 ${f('O2')} 碰上两个 ${f('NO')}：变成<b>两个 ${f('NO2')}</b>（3 个分子变成 2 个，气体变少了）`
        : e?.rx === RX2 ? `水面上：三个 ${f('NO2')} 和一个 ${f('H2O')} 变成两个 HNO<sub>3</sub>（在水里成了 ${f('H+')} 和 ${f('NO3-')}）和<b>一个 ${f('NO')}</b>——三个气体分子只回来一个`
        : o2Coming || nO2 ? `空气从管口进来：${f('O2')} 一碰上 ${f('NO')} 就反应`
        : (nNO2 || st.no2 > 0.05) && !st.water ? `${f('NO2')} 有了，可针筒里还没有水`
        : (nNO2 || st.no2 > 0.05) && st.shaking ? `振荡：${f('NO2')} 不停地碰到水面，一个个溶进去`
        : nNO2 || st.no2 > 0.05 ? `${f('NO2')} 只有碰到水面才溶进去：<b>振荡</b>让它们不停地碰到水（静置时很慢）`
        : done2 ? `${f('NO2')} 基本都溶进水里了：剩下的气体是 ${f('NO')}${st.n2 > 0.1 ? ` 和空气带进来的 ${f('N2')} 等` : ''}；水里是硝酸（${f('H+')}、${f('NO3-')}）`
        : `针筒里是 ${f('NO')}（无色）。${st.water ? '它<b>不易溶于水</b>：振荡也没有明显变化' : '还没有吸水'}`;
      return { eq, cap };
    },
  };
}
