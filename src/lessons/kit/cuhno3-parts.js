// 硝酸与铜（cuhno3 一课用）的“钻进去看”：铜丝螺旋的表面浸在浓硝酸 / 稀硝酸里。
//   课本第 15 页：4HNO₃(浓) + Cu ══ Cu(NO₃)₂ + 2NO₂↑ + 2H₂O；8HNO₃(稀) + 3Cu ══ 3Cu(NO₃)₂ + 2NO↑ + 4H₂O。
//   画法（慢放示意，不表示真实的反应步骤）：硝酸画成溶液里的 H⁺ 和 NO₃⁻（和离子方程式一致；浓硝酸里其实还有不少 HNO₃ 分子）。
//   浓：Cu + 4H⁺ + 2NO₃⁻ → Cu²⁺ + 2NO₂ + 2H₂O——一个铜原子交出 2 个电子，两个 NO₃⁻ 里的氮各得 1 个（+5 → +4）。
//   稀：3Cu + 8H⁺ + 2NO₃⁻ → 3Cu²⁺ + 2NO + 4H₂O——三个铜原子交出 6 个电子，两个 NO₃⁻ 里的氮各得 3 个（+5 → +2）。
//   没得电子的 NO₃⁻ 留在溶液里，和 Cu²⁺ 在一起就是 Cu(NO₃)₂（浓：2 个，稀：6 个）。
//   原子守恒：浓 Cu N₂ O₆ H₄ = Cu + N₂O₄ + O₂H₄ ✓；稀 Cu₃ N₂ O₆ H₈ = Cu₃ + N₂O₂ + O₄H₈ ✓。电荷：浓 0 + 4 − 2 = +2 ✓；稀 0 + 8 − 2 = +6 = 3 × (+2) ✓。
// st：{ conc: 浓硝酸那支（粒子多、水少）, x: 按浓的方程式反应的铜占几成（0~1，和宏观同一个产物状态；浓硝酸用稀了以后变小）, c: 现在的浓度 mol/L,
//       contact: 铜丝浸在酸里, hot: 正在反应（宏观的速率够大）, rate: 反应速率 mmol Cu/s, made: 已经生成过 Cu²⁺ }
// 画法照初中金属与酸、钠燃烧：铜丝表面画成一排分开摆的 5 个铜原子；一次只演一组。两个 NO₃⁻ 停在铜原子的左上、右上，H⁺ 围在它们旁边；
//   电子（小深色点）从铜原子飞到 NO₃⁻ 的氮上；然后 NO₃⁻ 和 H⁺ 变成 NO₂ / NO（冒走）和水，铜原子成了 Cu²⁺（MOL 里的光晕）、离开表面进到溶液里，
//   表面留下空位（看得出铜被消耗）；空位不够下一组用了，下面一层的铜露出来补上。快慢跟着这一课算出来的反应速率。
//   等着的离子、水待在后上方，不挡反应；只给代表标化学式（一个 Cu、一个 H⁺、反应的两个 NO₃⁻、第一个 Cu²⁺、冒走的气体）。
import * as THREE from 'three';
import { f } from './microworld.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { paint, inked } from '../../live/ink.js';
import { CHEM } from './chem.js';

/**
 * 侧面带凹槽的橡胶塞（课本：在橡胶塞侧面挖一个凹槽，嵌入铜丝）。小头朝 −y、原点在小头；凹槽朝 +z，槽底离轴 rs、张角 2a。
 * 铜丝直的那一段贴着槽底（离轴 wz）上下滑，不穿过实心的塞子。
 */
export function groovedStopper({ r1 = 0.0084, r2 = 0.0102, h = 0.018, rs = 0.0062, a = 0.13 } = {}) {
  const V2 = (x, y) => new THREE.Vector2(x, y);
  // 主体：去掉凹槽那一块的车削体（含上下底）
  const body = new THREE.LatheGeometry([V2(0.00001, 0), V2(r1, 0), V2(r2, h), V2(0.00001, h)], 40, a, Math.PI * 2 - 2 * a);
  // 凹槽那一块：槽底以内的楔形（槽底面 + 上下底）
  const core = new THREE.LatheGeometry([V2(0.00001, 0), V2(rs, 0), V2(rs, h), V2(0.00001, h)], 4, -a, 2 * a);
  // 槽的两个侧壁（φ = ±a 处的竖直面，从槽底到外表面）
  const wall = (phi, flip) => {
    const sx = Math.sin(phi), cz = Math.cos(phi), P = [[rs, 0], [r1, 0], [r2, h], [rs, h]].map(([r, y]) => [sx * r, y, cz * r]);
    const tri = flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(tri.flatMap((i) => P[i]), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(tri.flatMap(() => [0, 0]), 2));
    g.computeVertexNormals(); return g;
  };
  const parts = [body.toNonIndexed(), core.toNonIndexed(), wall(a, false), wall(-a, true)];
  for (const g of parts) { if (!g.attributes.normal) g.computeVertexNormals(); }
  const geo = mergeGeometries(parts.map((g) => { const n = new THREE.BufferGeometry(); for (const k of ['position', 'normal', 'uv']) n.setAttribute(k, g.attributes[k]); return n; }));
  const m = inked(new THREE.Mesh(geo, paint(CHEM.rubber, { side: THREE.DoubleSide })), { width: 1 });
  return m;
}

const ARR = '<span class="arr">══</span>';
const EQ_C = `4HNO<sub>3</sub>(浓) + Cu ${ARR} Cu(NO<sub>3</sub>)<sub>2</sub> + 2${f('NO2')}↑ + 2H<sub>2</sub>O`;
const EQ_D = `8HNO<sub>3</sub>(稀) + 3Cu ${ARR} 3Cu(NO<sub>3</sub>)<sub>2</sub> + 2${f('NO')}↑ + 4H<sub>2</sub>O`;

// 生成物的每个原子来自哪里 [第几个反应物, 第几个原子]。NO₃⁻ 的原子顺序：N、O、O、O；H₂O：O、H、H
// 浓：反应物 0 = Cu，1、2 = NO₃⁻，3~6 = H⁺；生成物 Cu²⁺、NO₂、NO₂、H₂O、H₂O
const MAP_C = [[0, 0], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2], [1, 3], [3, 0], [4, 0], [2, 3], [5, 0], [6, 0]];
// 稀：反应物 0~2 = Cu，3、4 = NO₃⁻，5~12 = H⁺；生成物 3 个 Cu²⁺、NO、NO、4 个 H₂O
const MAP_D = [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [4, 0], [4, 1], [3, 2], [5, 0], [6, 0], [3, 3], [7, 0], [8, 0], [4, 2], [9, 0], [10, 0], [4, 3], [11, 0], [12, 0]];

export function nitricScene() {
  const FILM = 7.4, DX = 2.2, Y0 = 0.75, AY = 5.3, BZ = -1.6, NY = Y0 + 2.5;          // AY、BZ：等着的离子、水待在后面最上面一层；NY：反应时 NO₃⁻ 停的高度
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const sites = [0, 1, 2, 3, 4].map((q) => V((q - 2) * DX, Y0, 0));
  let ev = null, made = 0, wait = 0.6, conc = true, toNO2 = true, cNow = 0, xNow = 1, mixed = false, fillT = 0;
  const dots = [];
  const clearDots = () => { for (const d of dots) { d.parent?.remove(d); d.geometry.dispose(); d.material.dispose(); } dots.length = 0; };
  const NP = () => (conc ? 2 : 1), NW = () => (conc ? 1 : 3);          // 等着的：浓硝酸里 H⁺、NO₃⁻ 多、水少；稀硝酸里水多（个数示意）
  const back = (c) => { const a = c.rnd(-2.4, -0.7); return V(Math.cos(a) * c.rnd(2.4, 4.6), c.rnd(AY + 0.3, FILM - 0.6), Math.sin(a) * 4.4 + 0.4); };          // 后上方随便一处
  const cuAt = (c, p) => c.mols.find((m) => m.kind === 'Cu' && !m.busy && !m.fadeOut && m.g.position.distanceTo(p) < 0.05);
  const atomAt = (c, m, i) => c.layer.worldToLocal(m.atoms[i].getWorldPosition(new THREE.Vector3()));
  const waiting = (c, k) => c.free(k).filter((m) => !m.fadeIn);
  const repCu = (c) => { for (const m of c.mols) if (m.kind === 'Cu') m.rep = false; const cu = c.mols.filter((m) => m.kind === 'Cu' && !m.fadeOut && !m.busy).sort((a, b) => b.g.position.x - a.g.position.x)[0]; if (cu) cu.rep = true; };
  const repWait = (c) => { for (const k of ['H+', 'NO3-']) { const ms = c.free(k); ms.forEach((m, i) => { m.rep = !ev && i === 0; }); } };
  // 挑这一组用的铜原子：浓 1 个，稀 3 个挨着的（从左往右找第一处够用的）
  const pickCu = (c, n) => { for (let q = 0; q + n <= sites.length; q++) { const ms = sites.slice(q, q + n).map((p) => cuAt(c, p)); if (ms.every(Boolean)) return ms; } return null; };
  return {
    solid: true, still: true,
    labels: (k, m) => k === 'NO2' || k === 'NO' || !!m.rep,
    labelOnly: (k, m) => !(m.busy && !m.g.visible) && (k === 'NO2' || k === 'NO' || !!m.rep || (k === 'NO3-' && m.busy)),          // H⁺ 一次有 4~8 个、水也多：只标一个代表
    init(c, st) {
      conc = !!st.conc; xNow = st.x ?? (conc ? 1 : 0); toNO2 = xNow >= 0.5; mixed = xNow > 0.02 && xNow < 0.98; cNow = st.c || 0;
      c.view.film = FILM; c.view.paper = null; c.view.liquid = conc ? 0xe8ecd8 : 0xdde9ef;
      ev = null; made = 0; wait = 0.6; fillT = 0; clearDots();
      if (st.contact) for (const p of sites) c.add('Cu', p.clone(), { fixed: true });
      for (let i = 0; i < NP(); i++) { c.add('H+', back(c)); c.add('NO3-', back(c)); }
      for (let i = 0; i < NW(); i++) c.add('H2O', back(c));
      if (st.made) { const m = c.add('Cu2+', back(c)); m.rep = true; m.age = 2; }
      repCu(c); repWait(c);
    },
    step(c, st, dt) {
      c.view.film = FILM; c.view.paper = null; c.view.liquid = conc ? 0xe8ecd8 : 0xdde9ef;
      c.view.speed = st.hot ? 1.3 : 1; cNow = st.c || cNow; xNow = st.x ?? xNow; mixed = xNow > 0.02 && xNow < 0.98;
      if (!ev) toNO2 = xNow >= 0.5;
      // 等着的离子、水待在后上方（不挡铜表面和正在反应的那一组）
      for (const m of c.mols) if ((m.kind === 'H+' || m.kind === 'NO3-' || (m.kind === 'H2O' && !m.made)) && !m.busy) { const p = m.g.position; if (p.y < AY) { p.y = AY; m.v.y = Math.abs(m.v.y); } if (p.z > BZ) { p.z = BZ; m.v.z = -Math.abs(m.v.z); } }
      // 用掉了，远处的补过来（成对，电荷平衡）；生成的水、Cu²⁺ 过一会儿走远
      if (!ev && c.count('H+') < NP() && Math.random() < dt * 1.2) { c.add('H+', back(c), { fadeIn: true, dimK: 0 }); c.add('NO3-', back(c), { fadeIn: true, dimK: 0 }); repWait(c); }
      for (const m of c.mols) if ((m.kind === 'H2O' && m.made) || m.kind === 'Cu2+') { m.age = (m.age || 0) + dt; if (m.age > (m.kind === 'Cu2+' ? 5 : 3.5) && !m.fadeOut) { m.fadeOut = true; if (m.rep) m.rep = false; } }
      for (const m of c.mols) if ((m.kind === 'NO2' || m.kind === 'NO') && m.leaving) { m.v.y = Math.min(m.v.y, 1.8); if (m.g.position.y > FILM + 1.6) m.fadeOut = true; }          // 冒出液面就淡出（不飘到式子上去）
      if (!st.contact) { if (ev) { ev = null; clearDots(); } for (const m of c.mols.filter((x) => x.kind === 'Cu' && !x.busy)) m.fadeOut = true; return; }
      if (fillT > 0) fillT -= dt;
      if (!ev && st.hot && !c.events.length) {
        wait -= dt;
        if (wait <= 0) {
          // 混合区（浓硝酸用稀了一部分）：每一次按铜走两条路径的比例随机挑一条来演示
          toNO2 = mixed ? Math.random() < xNow : xNow >= 0.5;
          const nCu = toNO2 ? 1 : 3, nH = toNO2 ? 4 : 8;
          const cus = pickCu(c, nCu);
          if (!cus) {          // 表面露着的铜不够这一组用了：下面一层的铜露出来
            for (const p of sites) if (!cuAt(c, p) && !c.mols.some((m) => m.kind === 'Cu' && m.g.position.distanceTo(p) < 0.05)) c.add('Cu', p.clone(), { fixed: true, fadeIn: true, dimK: 0 });
            repCu(c); fillT = 1.6; wait = 1.2; return;
          }
          const ctr = cus.reduce((a, m) => a.add(m.g.position), V(0, 0, 0)).multiplyScalar(1 / nCu);
          // 两个 NO₃⁻ 停在左上、右上（靠边时往里挪，不出底座）；H⁺ 围在它们外侧
          const half = toNO2 ? 1.8 : 2.1, ax = Math.max(-4.4, Math.min(4.4 - 2 * half, ctr.x - half));
          const nSpot = [V(ax, NY, 0.5), V(ax + 2 * half, NY, 0.5)];
          const take = (k, n) => { const have = waiting(c, k).sort((a, b) => a.g.position.distanceTo(ctr) - b.g.position.distanceTo(ctr)).slice(0, n); while (have.length < n) have.push(c.add(k, back(c), { fadeIn: true, dimK: 0.25 })); return have; };
          const ns = take('NO3-', 2).sort((a, b) => a.g.position.x - b.g.position.x), hs = take('H+', nH);
          const per = nH / 2, hSpot = [];
          nSpot.forEach((np, j) => { const out = j ? 1 : -1; for (let i = 0; i < per; i++) { const a = (per === 2 ? [0.3, 1.2] : [-0.1, 0.45, 1.0, 1.55])[i]; hSpot.push(np.clone().add(V(out * Math.cos(a) * 2.0, Math.sin(a) * 1.8, 0.3))); } });          // H⁺ 排成一道弧，在 NO₃⁻ 外侧、靠前（不藏在后面）
          const mols = [...cus, ...ns, ...hs];
          for (const m of c.mols) if (m.kind === 'H+' || m.kind === 'NO3-') m.rep = false;
          hs[per - 1].rep = true;          // 只标一个 H⁺
          const n0 = nCu, h0 = nCu + 2;
          const rx = toNO2
            ? { in: ['Cu', 'NO3-', 'NO3-', 'H+', 'H+', 'H+', 'H+'], out: ['Cu2+', 'NO2', 'NO2', 'H2O', 'H2O'], map: MAP_C,
              placeAbs: () => [cus[0].g.position.clone().add(V(0, 1.6, 0.4)), nSpot[0].clone().add(V(-0.3, 1.1, 0)), nSpot[1].clone().add(V(0.3, 1.1, 0)), nSpot[0].clone().add(V(-1.4, -0.6, 0.6)), nSpot[1].clone().add(V(1.4, -0.6, 0.6))],
              after: [{ v: [0, 0.6, 0.2] }, { leave: true, gas: true, v: [-0.2, 1.8, 0] }, { leave: true, gas: true, v: [0.2, 1.8, 0] }, { v: [-0.5, 0.2, 0.2] }, { v: [0.5, 0.2, 0.2] }] }
            : { in: ['Cu', 'Cu', 'Cu', 'NO3-', 'NO3-', 'H+', 'H+', 'H+', 'H+', 'H+', 'H+', 'H+', 'H+'], out: ['Cu2+', 'Cu2+', 'Cu2+', 'NO', 'NO', 'H2O', 'H2O', 'H2O', 'H2O'], map: MAP_D,
              placeAbs: () => [...cus.map((m) => m.g.position.clone().add(V(0, 1.6, 0.4))), nSpot[0].clone().add(V(0, 1.2, 0)), nSpot[1].clone().add(V(0, 1.2, 0)),
                nSpot[0].clone().add(V(-1.5, -0.3, 0.7)), nSpot[0].clone().add(V(-1.1, 0.9, -0.6)), nSpot[1].clone().add(V(1.5, -0.3, 0.7)), nSpot[1].clone().add(V(1.1, 0.9, -0.6))],
              after: [{ v: [-0.3, 0.6, 0.2] }, { v: [0, 0.6, 0.3] }, { v: [0.3, 0.6, 0.2] }, { leave: true, gas: true, v: [-0.2, 1.7, 0] }, { leave: true, gas: true, v: [0.2, 1.7, 0] }, { v: [-0.5, 0.2, 0.2] }, { v: [-0.3, 0.3, -0.2] }, { v: [0.5, 0.2, 0.2] }, { v: [0.3, 0.3, -0.2] }] };
          const e = c.start({ ...rx, host: -1, approach: 3.6, dur: toNO2 ? 2.6 : 3.0, burst: [0xffe2a0, toNO2 ? 0xd9a07a : 0xd8dde8],
            atAbs: () => ctr.clone().add(V(0, 1.6, 0)),
            nearAbs: (ms, i) => (i < n0 ? null : i < h0 ? nSpot[i - n0] : hSpot[i - h0]) },
          mols, { then: (out) => {
            made++; ev = null; clearDots();
            out.forEach((m) => { if (m.kind === 'H2O') { m.made = true; m.pull = V(0, 0.3, -0.8); } if (m.kind === 'Cu2+') { m.glow = 1; m.pull = V(0, 0.5, -0.7); } });          // 生成的 Cu²⁺、水往后上方走远，给下一组让地方
            for (const m of c.mols) if (m.kind === 'Cu2+') m.rep = false; out[0].rep = true;          // 只标刚生成的那一个 Cu²⁺
            repCu(c); repWait(c);
            wait = Math.max(0.8, Math.min(5, 0.012 / Math.max(1e-4, st.rate || 0.008)));
          } });
          if (e) {
            // 电子：每个铜原子 2 个。浓：两个电子分给两个氮，各 1 个；稀：6 个电子，每个氮 3 个
            const plan = toNO2 ? [[0, 0], [0, 1]] : [[0, 0], [0, 0], [1, 0], [1, 1], [2, 1], [2, 1]];
            ev = { e, ns, plan: plan.map(([ci, ni], i) => ({ from: cus[ci].g.position.clone().add(V(i % 2 ? 0.3 : -0.3, 0.7, 0.45)), ni, slot: plan.slice(0, i).filter((q) => q[1] === ni).length })) };
            for (let i = 0; i < plan.length; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), new THREE.MeshBasicMaterial({ color: 0x2a2f38 })); d.visible = false; c.layer.add(d); dots.push(d); }
          }
        }
      }
      // 电子：离子都到了以后，铜原子交出电子，飞到 NO₃⁻ 的氮上
      if (ev && dots.length) {
        const { e, ns, plan } = ev, k = e.t / e.A;
        if (k < 1) {
          const u0 = Math.min(1, Math.max(0, (k - 0.5) / 0.42)), u = u0 * u0 * (3 - 2 * u0), nAt = ns.map((m) => atomAt(c, m, 0));
          dots.forEach((d, i) => { const P = plan[i]; d.visible = k > 0.5; d.position.copy(P.from).lerp(nAt[P.ni].clone().add(V((P.slot - 1) * 0.34, 0.45, 0.35)), u); d.position.y += Math.sin(Math.PI * u) * 0.9; });
        } else clearDots();
      }
    },
    text(c, st) {
      const EQ = toNO2 ? EQ_C : EQ_D;
      const acid = conc ? '浓硝酸' : '稀硝酸';
      const e = ev?.e, k = e ? e.t / e.A : 0;
      const gNO2 = Math.round((2 * xNow) / (2 * xNow + (2 / 3) * (1 - xNow)) * 100);
      const thin = conc && mixed ? `这支浓硝酸已经用稀了一些（约 ${cNow} mol/L）：两种反应都在进行，新生成的气体里约 ${gNO2}% 是 ${f('NO2')}。${e ? `<b>这一次演示的是生成 ${toNO2 ? f('NO2') : f('NO')} 的那条路径：</b>` : ''}`
        : conc && !toNO2 ? `这支浓硝酸已经用稀了（约 ${cNow} mol/L），现在按稀硝酸的方程式反应：` : '';
      if (!st.contact && !st.made) return { eq: EQ, on: false, cap: `铜丝还在液面上方，没有碰到${acid}：这里只有 ${f('H+')}、${f('NO3-')} 和水，<b>还没有反应</b>。把铜丝推下去再看。` };
      if (!st.contact) return { eq: EQ, on: false, cap: `铜丝已经提起来，离开了液面：没有铜可以反应——<b>反应停止</b>。已经生成的 ${f('Cu2+')} 还留在溶液里（溶液的颜色不会退）。` };
      if (e && k < 0.5) return { eq: EQ, on: true, cap: thin + (toNO2 ? `两个 ${f('NO3-')} 和四个 ${f('H+')} 来到<b>一个</b>铜原子旁边。（硝酸在溶液里画成 ${f('H+')} 和 ${f('NO3-')}）` : `两个 ${f('NO3-')}、八个 ${f('H+')} 来到<b>三个</b>铜原子旁边。${conc ? '' : `稀硝酸里水多，${f('H+')}、${f('NO3-')} 少。`}`) };
      if (e && k < 1) return { eq: EQ, on: true, cap: thin + (toNO2
        ? `铜原子交出 <b>2 个电子</b>（小深色点）：<b>Cu 0 → +2</b>，被氧化；两个 ${f('NO3-')} 里的氮<b>各得 1 个</b>：<b>N +5 → +4</b>，被还原。`
        : `三个铜原子一共交出 <b>6 个电子</b>（小深色点）：<b>Cu 0 → +2</b>，被氧化；两个 ${f('NO3-')} 里的氮<b>各得 3 个</b>：<b>N +5 → +2</b>，被还原。`) };
      const pathNote = conc && mixed ? `（两种反应都在进行，这一次演示的是生成 ${toNO2 ? f('NO2') : f('NO')} 的那条路径）` : '';
      if (e) return { eq: EQ, on: true, cap: pathNote + (toNO2
        ? `得到电子的 ${f('NO3-')} 和 ${f('H+')} 变成 ${f('NO2')}（红棕色，冒出去）和水；铜原子成了 ${f('Cu2+')}，<b>离开铜丝表面，进到溶液里</b>。溶液里另外两个 ${f('NO3-')} 没得电子（氮还是 +5 价），和 ${f('Cu2+')} 在一起就是 Cu(NO₃)₂。原子的种类、个数都没变。`
        : `得到电子的 ${f('NO3-')} 和 ${f('H+')} 变成 ${f('NO')}（无色，冒出去）和水；三个铜原子成了 ${f('Cu2+')}，<b>离开铜丝表面，进到溶液里</b>。另外六个 ${f('NO3-')} 没得电子（氮还是 +5 价），和三个 ${f('Cu2+')} 在一起就是 3Cu(NO₃)₂。原子的种类、个数都没变。`) };
      if (fillT > 0) return { eq: EQ, on: true, cap: `表面的铜原子走了不少，留下空位——<b>下面一层的铜露出来</b>，接着反应。` };
      if (st.hot) return { eq: EQ, on: true, cap: made ? `${thin || acid + '里，'}已经有 <b>${made}</b> 组反应：铜丝表面的空位，就是变成 ${f('Cu2+')} 走掉的铜原子；被还原的氮变成 ${toNO2 ? f('NO2') : f('NO')} 冒出去。<b>慢放示意，不表示真实的反应步骤。</b>` : `${thin || acid + '里，'}${f('H+')}、${f('NO3-')} 就要在铜的表面反应了。` };
      if (made) return { eq: EQ, on: false, cap: `铜失去的电子数 = 氮得到的电子数（浓：1 个 Cu 对 2 个 ${f('NO2')}；稀：3 个 Cu 对 2 个 ${f('NO')}）。硝酸是<b>氧化剂</b>，铜是<b>还原剂</b>。` };
      return { eq: EQ, on: false, cap: `铜的表面浸在${acid}里。` };
    },
  };
}
