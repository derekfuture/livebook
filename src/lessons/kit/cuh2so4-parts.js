// 浓硫酸与铜（cuh2so4 一课用）的“钻进去看”：铜丝表面浸在浓硫酸里。
//   课本第 5 页：2H₂SO₄(浓) + Cu △══ CuSO₄ + SO₂↑ + 2H₂O；浓硫酸氧化了铜，自身被还原成二氧化硫。浓硫酸是氧化剂，铜是还原剂。
//   画法（慢放示意，不表示真实的反应步骤）：一个铜原子交出 2 个电子（小深色点），Cu：0 → +2；电子给了一个 H₂SO₄ 里的硫，S：+6 → +4，
//   这个 H₂SO₄ 变成 SO₂（冒出去）和水；另一个 H₂SO₄ 提供 SO₄²⁻（硫的化合价不变），和 Cu²⁺ 组成 CuSO₄。
//   物态：浓硫酸里水很少，生成的 CuSO₄ 不溶解，Cu²⁺ 和 SO₄²⁻ 挨在一起落到旁边成为固体（不画成在溶液里分开游走；固体里的 Cu²⁺ 不画蓝色光晕）。
//   原子守恒：Cu + 2H₂SO₄ = Cu S₂ O₈ H₄；Cu²⁺ + SO₄²⁻ + SO₂ + 2H₂O = Cu S₂ O₈ H₄。电荷：0 = (+2) + (−2)。得失电子：铜失 2 个 = 硫得 2 个。
// st：{ cu: 'above' 铜丝还没碰到浓硫酸 | 'in' 浸在浓硫酸里 | 'out' 碰过、已经拉出来, hot: 正在反应（宏观的反应速率够大）, cold: 温度低, made: 已经生成过 CuSO₄ }
import * as THREE from 'three';
import { f, textSprite } from './microworld.js';

const ARRH = '<span class="arr" style="position:relative">══<span style="position:absolute;left:0;right:0;top:-0.75em;font-size:0.45em;letter-spacing:0;text-align:center">△</span></span>';
const EQ = `2H<sub>2</sub>SO<sub>4</sub>(浓) + Cu ${ARRH} CuSO<sub>4</sub> + SO<sub>2</sub>↑ + 2H<sub>2</sub>O`;

export function cuAcidScene() {
  const FILM = 6.4, N_ACID = 5, SP = 1.36, Y0 = 0.75;
  const sites = [];
  for (let r = -4; r <= 4; r++) for (let q = -4; q <= 4; q++) { const x = (q + (r % 2 ? 0.5 : 0)) * SP, z = r * SP * 0.866; if (Math.hypot(x, z) < 3.8) sites.push(new THREE.Vector3(x, Y0, z)); }
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // 生成物的每个原子来自哪里 [第几个反应物, 第几个原子]：反应物 0 = Cu，1 = 提供 SO₄²⁻ 的 H₂SO₄，2 = 被还原的 H₂SO₄
  //   Cu²⁺ ← Cu；SO₄²⁻ ← 第 1 个的 S 和四个 O；SO₂ ← 第 2 个的 S 和两个 S=O 的 O；两个 H₂O ← 第 2 个的两个 OH 里的 O，各配一个第 2 个的 H、一个第 1 个的 H
  const MAP = [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [2, 0], [2, 1], [2, 2], [2, 3], [2, 5], [1, 5], [2, 4], [2, 6], [1, 6]];
  let phase = null, made = 0, wait = 1.2, refill = [];
  let P = null;          // 正在进行的这一次：{ cu, a, b, t, el: [电子], tags: [化合价牌] }
  const front = (p) => Math.abs(p.x) + Math.abs(p.z - 1.4);
  const surf = (c) => c.mols.filter((m) => m.kind === 'Cu' && m.fixed && !m.busy && !m.hold);
  const dropP = (c) => { if (!P) return; for (const o of [...P.el, ...P.tags]) { c.layer.remove(o); o.geometry?.dispose(); o.material.map?.dispose(); o.material.dispose(); } for (const m of [P.a, P.b, P.cu]) if (m) { m.hold = false; m.labelK = 0; } P = null; phase = null; };
  const atomAt = (c, m, i) => c.layer.worldToLocal(m.atoms[i].getWorldPosition(new THREE.Vector3()));
  // 生成的 CuSO₄ 固体堆在底座边上（几个位置轮流用）
  const PILE = [[-5.0, 1.6], [-4.4, 2.8], [-5.4, 0.2], [-3.8, 3.8]].map(([x, z]) => V(x, 1.0, z));
  let pileN = 0;
  const settle = (c, cat, an) => {
    const p = PILE[pileN++ % PILE.length];
    for (const m of c.mols.filter((x) => x.solid && x.slot === p)) m.fadeOut = true;          // 位置满了：旧的那一对走远（示意：固体越积越多）
    cat.settle = p.clone(); an.settle = p.clone().add(V(1.15, 0.2, 0.3)); cat.solid = an.solid = true; cat.slot = an.slot = p;
    if (cat.glowS) cat.glowS.visible = false;
  };
  const tag = (c, text, color) => { const s = textSprite(text, color, 'rgba(255,255,255,0.95)'); s.scale.set(3.4, 1.27, 1); s.material.opacity = 0; c.layer.add(s); return s; };
  return {
    labels: () => false, dim: 0.55,          // 只标正在反应的和刚生成的（引擎自己标 3 秒）
    init(c, st) {
      c.view.film = FILM; c.view.paper = null; c.view.liquid = 0xdde6ea;
      P = null; phase = null; made = 0; wait = 1.2; refill = [];
      pileN = 0;
      if (st.cu === 'in') for (const p of sites) c.add('Cu', p.clone(), { fixed: true });
      for (let i = 0; i < N_ACID; i++) c.add('H2SO4', c.inLiquid());
      if (st.made) { const a = c.add('Cu2+', c.inLiquid()), b = c.add('SO4 2-', c.inLiquid()); settle(c, a, b); a.g.position.copy(a.settle); b.g.position.copy(b.settle); a.fixed = b.fixed = true; c.add('H2O', c.inLiquid()); }
    },
    step(c, st, dt) {
      c.view.film = FILM; c.view.paper = null; c.view.liquid = 0xdde6ea;
      c.view.speed = st.hot ? 1.6 : st.cold ? 0.8 : 1.2;
      // 溶液里的分子不钻进铜里（铜原子占到 y ≈ 1.4）
      for (const m of c.mols) if (!m.fixed && !m.busy && !m.hold && !m.gas && !m.leaving && !m.settle && m.g.position.y < 2.3) { m.g.position.y = 2.3; m.v.y = Math.abs(m.v.y); }
      // 生成的 CuSO₄ 落到旁边的固体堆里
      for (const m of c.mols) if (m.settle && !m.fixed && !m.busy) { m.v.set(0, 0, 0); m.g.position.lerp(m.settle, Math.min(1, dt * 1.5)); if (m.g.position.distanceTo(m.settle) < 0.05) m.fixed = true; }
      // 浓硫酸很多：附近的 H₂SO₄ 用掉了，远处的补过来
      if (c.count('H2SO4') < N_ACID && Math.random() < dt * 1.5) c.add('H2SO4', c.inLiquid(), { fadeIn: true, dimK: 0 });
      const ws = c.free('H2O'); if (ws.length > 4 && Math.random() < dt) ws[0].fadeOut = true;
      // 被拿走的铜原子：下面一层的铜露出来（补上空位）
      for (const r of [...refill]) { r.t -= dt; if (r.t <= 0 && st.cu === 'in') { c.add('Cu', r.p.clone(), { fixed: true, fadeIn: true, dimK: 0 }); refill.splice(refill.indexOf(r), 1); } }
      if (st.cu !== 'in') { if (P) dropP(c); for (const m of c.mols.filter((x) => x.kind === 'Cu' && x.fixed && !x.busy)) m.fadeOut = true; return; }
      if (!P && st.hot && !c.events.length) {
        wait -= dt;
        if (wait <= 0) {
          const cu = surf(c).sort((x, y) => front(x.g.position) - front(y.g.position))[Math.floor(Math.random() * 3)];
          const acids = cu ? c.free('H2SO4').filter((m) => !m.hold).sort((x, y) => x.g.position.distanceTo(cu.g.position) - y.g.position.distanceTo(cu.g.position)) : [];
          if (cu && acids.length >= 2) {
            P = { cu, a: acids[1], b: acids[0], t: 0, el: [], tags: [] }; phase = 'come';
            P.a.hold = true; P.b.hold = true; cu.hold = true; P.a.labelK = 1; P.b.labelK = 1;
            const p0 = cu.g.position;
            P.toA = p0.clone().add(V(1.9, 1.5, 0.3)); P.toB = p0.clone().add(V(-1.7, 1.6, 0.4));
          }
        }
      }
      if (!P) return;
      P.t += dt;
      const { cu, a, b } = P;
      if (phase === 'come' || phase === 'e') {
        for (const [m, to] of [[a, P.toA], [b, P.toB]]) { m.v.set(0, 0, 0); m.g.position.lerp(to, Math.min(1, dt * 2.4)); }
      }
      if (phase === 'come' && P.t > 1.3) {
        phase = 'e'; P.t = 0;
        const base = cu.g.position.clone();
        for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), new THREE.MeshBasicMaterial({ color: 0x2b3240 })); e.position.copy(base).add(V(s * 0.35, 0.75, 0.45)); e.userData.from = e.position.clone(); c.layer.add(e); P.el.push(e); }
        P.tags.push(tag(c, 'Cu  0 → +2', '#a24f22'), tag(c, 'S  +6 → +4', '#8a6d10'));
      }
      if (phase === 'e') {
        const k = Math.min(1, P.t / 1.6), u = k * k * (3 - 2 * k), sAt = atomAt(c, b, 0);
        P.el.forEach((e, i) => { const to = sAt.clone().add(V(i ? 0.32 : -0.32, 0.35, 0.3)); e.position.copy(e.userData.from).lerp(to, u); e.position.y += Math.sin(Math.PI * u) * 1.2; });
        P.tags[0].position.copy(cu.g.position).add(V(0.6, 0.2, 2.6)); P.tags[1].position.copy(sAt).add(V(-0.4, 2.2, 0.4));
        for (const s of P.tags) s.material.opacity = Math.min(0.95, P.t * 2);
        if (P.t > 1.9) {
          phase = 'rx'; P.t = 0;
          for (const e of P.el) { c.layer.remove(e); e.geometry.dispose(); e.material.dispose(); } P.el = [];
          const at = cu.g.position.clone(), aP = a.g.position.clone(), bP = b.g.position.clone(), site = cu.g.position.clone();
          a.hold = b.hold = false; cu.hold = false;
          const ev = c.start({ in: ['Cu', 'H2SO4', 'H2SO4'], out: ['Cu2+', 'SO4 2-', 'SO2', 'H2O', 'H2O'], host: 0, approach: 0, dur: 2.6, map: MAP, burst: [0xffe2a0, 0xbfe4ff],
            atAbs: () => at.clone().add(V(0, 1.3, 0)),
            placeAbs: () => [at.clone().add(V(0.2, 1.9, 0.2)), aP.clone().add(V(0.6, 0.6, 0)), bP.clone().add(V(-0.3, 1.6, 0)), bP.clone().add(V(-1.4, -0.2, 0.6)), bP.clone().add(V(0.6, -0.4, -0.7))],
            after: [{ v: [0.3, 1.2, 0] }, { v: [0.6, 0.4, 0] }, { leave: true, gas: true, v: [0, 2.2, 0] }, {}, {}] }, [cu, a, b], { then: (out) => { made++; refill.push({ p: site, t: 2.5 }); settle(c, out[0], out[1]); } });
          if (!ev) dropP(c);
        }
      }
      if (phase === 'rx') {
        for (const s of P.tags) s.material.opacity = Math.max(0, s.material.opacity - dt * 1.6);          // 生成物自己带标签：化合价牌淡出
        if (P.t > 5) { dropP(c); wait = 2.2; }
      }
    },
    text(c, st) {
      if (st.cu === 'above') return { eq: EQ, on: false, cap: `铜丝还在液面上方，没有碰到浓硫酸：这里只有 ${f('H2SO4')}（浓硫酸里水很少）。先把铜丝往里推。` };
      if (st.cu === 'out') return { eq: EQ, on: false, cap: `铜丝已经拉出来，离开了浓硫酸：没有铜可以反应——<b>反应停止</b>。${st.made ? `前面生成的 CuSO₄ 还在（没有溶解的固体，画成挨在一起的 ${f('Cu2+')} 和 ${f('SO4 2-')}），${f('SO2')} 已经冒出去了。` : ''}` };
      if (phase === 'come') return { eq: EQ, on: true, cap: `两个 ${f('H2SO4')} 来到铜的表面。` };
      if (phase === 'e') return { eq: EQ, on: true, cap: `铜原子交出 <b>2 个电子</b>（小深色点）：<b>Cu 0 → +2</b>，被氧化；电子给了其中一个 ${f('H2SO4')} 里的硫：<b>S +6 → +4</b>，被还原。` };
      if (phase === 'rx') return { eq: EQ, on: true, cap: `得到电子的那个 ${f('H2SO4')} 变成 ${f('SO2')}（冒出去）和水；另一个只提供 ${f('SO4 2-')}（硫的化合价没变），和 ${f('Cu2+')} 组成 CuSO₄——浓硫酸里水很少，它不溶解，挨在一起落到旁边成为固体。原子的种类、个数都没变。` };
      if (st.hot) return { eq: EQ, on: true, cap: `热的浓硫酸里，${f('H2SO4')} 不断在铜的表面反应。<b>慢放示意，不表示真实的反应步骤。</b>` };
      if (made) return { eq: EQ, on: true, cap: `铜失去的电子数 = 硫得到的电子数（每生成 1 个 ${f('SO2')}，都是 2 个）。浓硫酸是<b>氧化剂</b>，铜是<b>还原剂</b>。浓硫酸里水很少，生成的 CuSO₄ 没有溶解，是固体。` };
      return { eq: EQ, on: false, cap: `铜的表面浸在浓硫酸里，${st.cold ? '可是<b>没有加热</b>：看不出反应（课本：在加热的条件下，浓硫酸与铜反应）' : '温度还不够高，反应还很慢'}。` };
    },
  };
}
