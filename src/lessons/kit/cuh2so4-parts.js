// 浓硫酸与铜（cuh2so4 一课用）的“钻进去看”：铜丝表面浸在浓硫酸里。
//   课本第 5 页：2H₂SO₄(浓) + Cu △══ CuSO₄ + SO₂↑ + 2H₂O；浓硫酸氧化了铜，自身被还原成二氧化硫。浓硫酸是氧化剂，铜是还原剂。
//   画法（慢放示意，不表示真实的反应步骤）：一个铜原子交出 2 个电子（小深色点），Cu：0 → +2；电子给了一个 H₂SO₄ 里的硫，S：+6 → +4，
//   这个 H₂SO₄ 的硫和两个氧变成 SO₂（冒出去），它的另外两个氧和两个 H₂SO₄ 一起提供的 4 个氢生成 2 个水；另一个 H₂SO₄ 提供 SO₄²⁻（硫的化合价不变），和 Cu²⁺ 组成 CuSO₄。
//   只画硫酸分子：98% 硫酸里少量的水省略不画；粒子个数是示意。
//   物态：浓硫酸里水很少，生成的 CuSO₄ 难以溶解：Cu²⁺ 和 SO₄²⁻ 贴在一起，留在铜的表面（模型近似，不画成在溶液里分开游走）。
//   原子守恒：Cu + 2H₂SO₄ = Cu S₂ O₈ H₄；Cu²⁺ + SO₄²⁻ + SO₂ + 2H₂O = Cu S₂ O₈ H₄。电荷：0 = (+2) + (−2)。得失电子：铜失 2 个 = 硫得 2 个。
// st：{ cu: 'above' 铜丝还没碰到浓硫酸 | 'in' 浸在浓硫酸里 | 'out' 碰过、已经拉出来, hot: 正在反应（宏观的反应速率够大）, rate: 反应速率 mmol/s,
//       cold: 温度低, made: 已经生成过 CuSO₄, n: 已经生成的 CuSO₄ 折成画面里的几组（示意，0~3） }
// 画法照初中木炭还原氧化铜、钠燃烧：铜丝表面画成一排分开摆的 4 个铜原子；一次只演一组：两个 H₂SO₄ 来到一个铜原子两边，
//   电子从铜原子飞到右边那个 H₂SO₄ 的硫上，然后右边那个的硫变成 SO₂（冒走），两边的氢和右边剩下的两个氧生成两个水，左边那个交出 SO₄²⁻，贴到 Cu²⁺ 上面、留在原地。
//   从左往右推进：左边成了 CuSO₄、右边还是铜。一排都反应完了还在加热：最早的那组 CuSO₄ 掉下去，下面一层的铜露出来接着反应。
//   同一种原子到哪儿都是一个颜色、一个大小；Cu²⁺ 用 MOL 里的光晕表示它是离子；宏观颜色不画到原子上。
import * as THREE from 'three';
import { f } from './microworld.js';

const ARRH = '<span class="arr" style="position:relative">══<span style="position:absolute;left:0;right:0;top:-0.75em;font-size:0.45em;letter-spacing:0;text-align:center">△</span></span>';
const EQ = `2H<sub>2</sub>SO<sub>4</sub>(浓) + Cu ${ARRH} CuSO<sub>4</sub> + SO<sub>2</sub>↑ + 2H<sub>2</sub>O`;

export function cuAcidScene() {
  const FILM = 6.4, N_ACID = 2, DX = 3.2, Y0 = 0.75, AY = 4.0, BZ = -2.4;          // AY、BZ：等着的 H₂SO₄ 待在后上方（不挡铜表面、生成的 CuSO₄ 和正在反应的那两个）
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const SO4AT = V(0, 0.45, -1.7);          // SO₄²⁻ 贴在 Cu²⁺ 的后面（从前面看就在它头上、挨着）
  const sites = [0, 1, 2, 3].map((q) => V((q - 1.5) * DX, Y0, 0));          // 从左往右
  // 生成物的每个原子来自哪里 [第几个反应物, 第几个原子]：反应物 0 = Cu，1 = 提供 SO₄²⁻ 的 H₂SO₄，2 = 被还原的 H₂SO₄
  //   Cu²⁺ ← Cu；SO₄²⁻ ← 第 1 个的 S 和四个 O；SO₂ ← 第 2 个的 S 和两个 S=O 的 O；两个 H₂O ← 第 2 个的两个 OH 里的 O，各配一个第 2 个的 H、一个第 1 个的 H
  const MAP = [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [2, 0], [2, 1], [2, 2], [2, 3], [2, 5], [1, 5], [2, 4], [2, 6], [1, 6]];
  let ev = null, made = 0, wait = 0.6, units = [], swap = null;
  const dots = [];
  const clearDots = () => { for (const d of dots) { d.parent?.remove(d); d.geometry.dispose(); d.material.dispose(); } dots.length = 0; };
  let side = 0;
  const back = (c) => { side ^= 1; const a = side ? c.rnd(-2.4, -1.7) : c.rnd(-1.4, -0.7);          // 左右轮流：两个等着的不叠在一起
    return V(Math.cos(a) * c.rnd(2.6, 4.6), c.rnd(AY + 0.3, FILM - 0.6), Math.sin(a) * 4.6 + 0.6); };          // 后上方随便一处
  const cuAt = (c, p) => c.mols.find((m) => m.kind === 'Cu' && !m.busy && !m.fadeOut && m.g.position.distanceTo(p) < 0.05);
  const atomAt = (c, m, i) => c.layer.worldToLocal(m.atoms[i].getWorldPosition(new THREE.Vector3()));
  const rep = (c) => {          // 只给代表标：最右边（最后才反应）的铜原子、第一组 Cu²⁺ 和 SO₄²⁻、一个溶液里的 H₂SO₄
    for (const m of c.mols) if (m.kind === 'Cu' || m.kind === 'H2SO4') m.rep = false;
    const cu = [...c.mols].filter((m) => m.kind === 'Cu' && !m.fadeOut).sort((a, b) => b.g.position.x - a.g.position.x)[0]; if (cu) cu.rep = true;
    const a = c.free('H2SO4')[0]; if (a && !ev) a.rep = true;
  };
  const unitAt = (c, site, cat, an) => { cat.g.rotation.set(0, 0, 0); an.g.rotation.set(0, 0, 0); units.push({ site, cat, an }); if (!c.mols.some((m) => m.rep && m.kind === 'Cu2+s')) { cat.rep = an.rep = true; } };
  return {
    solid: true, still: true,          // 粒子少：旁边的不变淡；镜头不追着反应跑
    labels: (k, m) => k === 'SO2' || !!m.rep,
    labelOnly: (k, m) => !(m.busy && !m.g.visible) && (k === 'SO2' || !!m.rep || (k === 'H2SO4' && m.busy)),          // 反应的两个 H₂SO₄ 在反应时标；水、其余的不标
    init(c, st) {
      c.view.film = FILM; c.view.paper = null; c.view.liquid = 0xdde6ea;
      ev = null; made = 0; wait = 0.6; units = []; swap = null; clearDots();
      const n0 = st.made ? Math.max(1, Math.min(3, st.n || 1)) : 0;
      sites.forEach((p, q) => {
        if (q < n0) { const lo = st.cu === 'in' ? 0 : -0.1, a = c.add('Cu2+s', p.clone().setY(Y0 + lo), { fixed: true }), b = c.add('SO4 2-', p.clone().setY(Y0 + lo).add(SO4AT), { fixed: true }); unitAt(c, p, a, b); made++; }
        else if (st.cu === 'in') c.add('Cu', p.clone(), { fixed: true });
      });
      for (let i = 0; i < N_ACID; i++) c.add('H2SO4', back(c));
      rep(c);
    },
    step(c, st, dt) {
      c.view.film = FILM; c.view.paper = null; c.view.liquid = 0xdde6ea;
      c.view.speed = st.hot ? 1.4 : st.cold ? 0.7 : 1;
      // 等着的 H₂SO₄ 待在后上方（不挡铜表面、生成的 CuSO₄ 和正在反应的那两个）
      for (const m of c.mols) if (m.kind === 'H2SO4' && !m.busy) { const p = m.g.position; if (p.y < AY) { p.y = AY; m.v.y = Math.abs(m.v.y); } if (p.z > BZ) { p.z = BZ; m.v.z = -Math.abs(m.v.z); } }
      // 浓硫酸很多：用掉了，远处的补过来
      if (!ev && c.count('H2SO4') < N_ACID && Math.random() < dt * 1.2) c.add('H2SO4', back(c), { fadeIn: true, dimK: 0 });
      // 生成的水散开、走远
      for (const m of c.mols) if (m.kind === 'H2O' && !m.fadeOut) { m.age = (m.age || 0) + dt; if (m.age > 3.5) m.fadeOut = true; }
      for (const m of c.mols) if (m.kind === 'SO2' && m.leaving) { m.v.y = Math.min(m.v.y, 1.8); if (m.g.position.y > FILM + 1.6) m.fadeOut = true; }          // 冒出液面就淡出（不飘到式子上去）
      if (st.cu !== 'in') { if (ev) { ev = null; clearDots(); } for (const m of c.mols.filter((x) => x.kind === 'Cu' && !x.busy)) m.fadeOut = true; return; }
      // 一排都成了 CuSO₄、还在反应：最早的那组掉下去，下面一层的铜露出来
      if (swap) {
        swap.t += dt;
        for (const m of [swap.u.cat, swap.u.an]) m.g.position.y -= dt * 0.9;
        if (swap.t > 1.2 && !swap.cu) { swap.cu = c.add('Cu', swap.u.site.clone(), { fixed: true, fadeIn: true, dimK: 0 }); rep(c); }
        if (swap.t > 2) swap = null;
      }
      if (!ev && !swap && st.hot && !c.events.length) {
        wait -= dt;
        const free = sites.find((p) => cuAt(c, p));
        if (wait <= 0 && !free && units.length) {          // 没有铜原子露着了：最早的那组 CuSO₄ 掉下去
          const u = units.shift(); u.cat.fadeOut = u.an.fadeOut = true; u.cat.rep = u.an.rep = false; swap = { u, t: 0 }; wait = 0.4;
        } else if (wait <= 0 && free) {
          const cu = cuAt(c, free);
          const acids = c.free('H2SO4').filter((m) => !m.fadeIn).sort((a, b) => a.g.position.distanceTo(free) - b.g.position.distanceTo(free));
          if (acids.length >= 2) {
            const [A, B] = acids[0].g.position.x < acids[1].g.position.x ? [acids[0], acids[1]] : [acids[1], acids[0]];          // 左边的交出 SO₄²⁻，右边的被还原
            const site = free.clone();
            const ax = Math.max(-4.6, Math.min(1.0, site.x - 1.8));          // 两个 H₂SO₄ 在铜原子左上、右上（靠边的铜原子：两个都往里挪，不出底座）
            const spotA = V(ax, Y0 + 3.3, 0.6), spotB = V(ax + 3.6, Y0 + 3.3, 0.6);
            const e = c.start({ in: ['Cu', 'H2SO4', 'H2SO4'], out: ['Cu2+s', 'SO4 2-', 'SO2', 'H2O', 'H2O'], host: -1, approach: 3.4, dur: 2.6, map: MAP, burst: [0xffe2a0, 0xbfe4ff],
              atAbs: () => site.clone().add(V(0, 1.6, 0)),
              nearAbs: (ms, i) => (i === 1 ? spotA : i === 2 ? spotB : null),
              placeAbs: () => [site.clone(), site.clone().add(SO4AT), spotB.clone().add(V(0.3, 1.3, -0.2)), spotB.clone().add(V(1.3, -0.4, 0.4)), spotA.clone().add(V(-1.0, 0.4, -0.6))],
              after: [{ fixed: true }, { fixed: true }, { leave: true, gas: true, v: [0.2, 1.6, 0] }, { v: [0.6, 0.2, 0.2] }, { v: [-0.6, 0.3, -0.2] }] }, [cu, A, B],
            { then: (out) => { made++; ev = null; clearDots(); unitAt(c, site, out[0], out[1]); out[1].g.position.copy(site).add(SO4AT); out[0].glow = 1; c.burst(site.clone().add(V(0, 1, 0)), 0xbfe4ff); rep(c); wait = Math.max(0.8, Math.min(5, 0.012 / Math.max(1e-4, st.rate || 0.006))); } });
            if (e) {
              for (const m of c.mols) if (m.kind === 'H2SO4') m.rep = false;
              ev = { e, from: [-1, 1].map((s) => site.clone().add(V(s * 0.35, 0.75, 0.5))), B };
              for (let i = 0; i < 2; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), new THREE.MeshBasicMaterial({ color: 0x2a2f38 })); d.visible = false; c.layer.add(d); dots.push(d); }
            }
          }
        }
      }
      // 电子：两个 H₂SO₄ 到了铜原子两边以后，铜原子交出 2 个电子，飞到右边那个 H₂SO₄ 的硫上
      if (ev && dots.length) {
        const { e, from, B } = ev, k = e.t / e.A;
        if (k < 1) {
          const sAt = atomAt(c, B, 0), u0 = Math.min(1, Math.max(0, (k - 0.5) / 0.42)), u = u0 * u0 * (3 - 2 * u0);
          dots.forEach((d, i) => { d.visible = k > 0.5; d.position.copy(from[i]).lerp(sAt.clone().add(V(i ? 0.3 : -0.3, 0.5, 0.35)), u); d.position.y += Math.sin(Math.PI * u) * 0.9; });
        } else clearDots();
      }
    },
    text(c, st) {
      if (st.cu === 'above') return { eq: EQ, on: false, cap: `铜丝还在液面上方，没有碰到浓硫酸。这里只画了 ${f('H2SO4')} 分子（浓硫酸里少量的水省略不画，粒子个数是示意）。先把铜丝往里推。` };
      if (st.cu === 'out') return { eq: EQ, on: false, cap: `铜丝已经拉出来，离开了浓硫酸：没有铜可以反应——<b>反应停止</b>。${st.made ? `前面生成的 CuSO₄ 还在（没有溶解：${f('Cu2+')} 和 ${f('SO4 2-')} 贴在一起），${f('SO2')} 已经冒出去了。` : ''}` };
      const e = ev?.e, k = e ? e.t / e.A : 0;
      if (e && k < 0.5) return { eq: EQ, on: true, cap: `两个 ${f('H2SO4')} 来到一个铜原子的两边。` };
      if (e && k < 1) return { eq: EQ, on: true, cap: `铜原子交出 <b>2 个电子</b>（小深色点），给了右边那个 ${f('H2SO4')} 里的硫：<b>Cu 0 → +2</b>，被氧化；<b>S +6 → +4</b>，被还原。` };
      if (e) return { eq: EQ, on: true, cap: `右边那个的硫生成 ${f('SO2')}（冒出去）；两个 ${f('H2SO4')} 提供的氢一起生成两分子水。左边那个交出 ${f('SO4 2-')}（硫还是 +6 价），<b>贴到 ${f('Cu2+')} 上</b>：浓硫酸里水很少，CuSO₄ 没有溶解，留在铜的表面。原子的种类、个数都没变。` };
      if (swap) return { eq: EQ, on: true, cap: `这一排铜原子都反应完了：最早生成的 CuSO₄ 从铜丝表面掉下去，<b>下面一层的铜露出来</b>，接着反应。` };
      const anyCu = c.mols.some((m) => m.kind === 'Cu' && !m.fadeOut);
      if (st.hot) return { eq: EQ, on: true, cap: made ? `已经有 <b>${units.length}</b> 组 ${f('Cu2+')} 和 ${f('SO4 2-')} 贴在一起（没有溶解的 CuSO₄）${anyCu ? '，在左边；右边还是铜原子' : '：这一排铜原子都反应了'}。热的浓硫酸不断在铜的表面反应。<b>慢放示意，不表示真实的反应步骤。</b>` : `热的浓硫酸里，${f('H2SO4')} 就要在铜的表面反应了。` };
      if (made) return { eq: EQ, on: false, cap: `铜失去的电子数 = 硫得到的电子数（每生成 1 个 ${f('SO2')}，都是 2 个）。浓硫酸是<b>氧化剂</b>，铜是<b>还原剂</b>。浓硫酸里水很少，生成的 CuSO₄ 没有溶解。` };
      return { eq: EQ, on: false, cap: `铜的表面浸在浓硫酸里，${st.cold ? '可是<b>没有加热</b>：看不出反应（课本：在加热的条件下，浓硫酸与铜反应）' : '温度还不够高，反应还很慢'}。` };
    },
  };
}
