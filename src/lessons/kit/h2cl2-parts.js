// H₂ 在 Cl₂ 中燃烧（h2cl2）的“钻进去看”：尖嘴口的火焰里发生什么。
// st：{ mode: 'jar' | 'air'（尖嘴在集气瓶里 / 在空气中）, lit: 火焰燃着没有, comp: 尖嘴附近那一层的组成 { h2, cl, hcl, air }（占比，宏观里算出来的）, out: 在瓶里熄灭了 }
//   背景分子按 comp 的占比画（模型里没有 HCl 就不画 HCl）。
//   瓶里、点着：H₂ 从尖嘴出来，和 Cl₂ 反应：H₂ + Cl₂ → 2HCl。HCl 的 H、Cl 分别来自 H₂ 和 Cl₂（map 写死），原子种类、个数守恒。
//     共用电子对（课本第 24 页）：H₂、Cl₂ 里的电子对在两个原子正中间；HCl 里偏向氯原子——H 0 → +1 被氧化，Cl 0 → −1 被还原。小深色点表示电子。
//   瓶里、没点着：H₂ 和 Cl₂ 混在一起，不反应。
//   空气中、点着：2H₂ + O₂ → 2H₂O（淡蓝色火焰）。
//   慢放示意，不表示真实的反应步骤（实际是链式反应）；分子个数只是示意。
import * as THREE from 'three';
import { f } from './microworld.js';

const ARRC = (t) => `<span class="arr" style="position:relative">══<span style="position:absolute;left:0;right:0;top:-0.75em;font-size:0.45em;letter-spacing:0;text-align:center">${t}</span></span>`;
const eGeo = new THREE.SphereGeometry(0.1, 10, 8), eMat = new THREE.MeshBasicMaterial({ color: 0x46505a });
// 共用电子对画在键的上方（不藏进原子球里）：H₂、Cl₂ 在正中间，HCl 偏向氯（Cl 在 +x）
const PAIR = { H2: [0, 0.42], Cl2: [0, 0.68], HCl: [0.3, 0.6] };
function addPair(m) {
  const p = PAIR[m.kind]; if (!p) return;
  for (const s of [-1, 1]) { const e = new THREE.Mesh(eGeo, eMat); e.position.set(p[0] + s * 0.12, p[1], 0); m.g.add(e); }
}

export function h2cl2Scene() {
  const NG = 8, NO2 = 5, NN2 = 7;          // 瓶里画 8 个“背景”分子，按火焰附近那一层的组成分给 Cl₂、HCl、H₂、空气（N₂ / O₂ 按 4 : 1）
  let gap = 0.3, made = 0, mode = 'jar';
  const RX_CL = { in: ['H2', 'Cl2'], out: ['HCl', 'HCl'], host: 1, at: [0, 0, 0], near: [[-1.7, 0.1, 0.2], null],
    place: [[-0.9, 0.8, 0.3], [1.0, -0.6, -0.3]], map: [[0, 0], [1, 0], [0, 1], [1, 1]], approach: 1.5, dur: 2.6, burst: [0xf2f4ea, 0xffffff],
    after: [{ leave: true, gas: true, v: [-0.2, 1.2, 0] }, { leave: true, gas: true, v: [0.2, 1.2, 0] }] };
  const RX_O2 = { in: ['H2', 'H2', 'O2'], out: ['H2O', 'H2O'], host: 0, at: [0.6, 0.6, 0], near: [null, [1.4, 0, 0.2], [0.7, 1.6, -0.2]], split: true, spread: 1.5, approach: 1.6, dur: 4,
    place: [[-0.9, 0.2, 0.3], [1.1, 0.2, -0.3]], burst: [0x9fd8ff, 0xd8f0ff], after: [{ leave: true, gas: true, v: [-0.2, 1.4, 0] }, { leave: true, gas: true, v: [0.2, 1.4, 0] }] };
  const add = (c, kind, pos, extra) => { const m = c.add(kind, pos, extra); if (mode === 'jar') addPair(m); return m; };
  // 各种背景分子该画几个（最大余数法凑满 NG；占比很小但不为 0 的至少画 1 个，看得出“还有一点”）
  const want = (st) => {
    const p = st.comp || { cl: 1, hcl: 0, h2: 0, air: 0 }, keys = ['cl', 'hcl', 'h2', 'air'], n = {};
    let left = NG; const rem = [];
    for (const k of keys) { const x = (p[k] || 0) * NG; n[k] = Math.floor(x); left -= n[k]; rem.push([x - n[k], k]); }
    rem.sort((a, b) => b[0] - a[0]); for (let i = 0; i < left; i++) n[rem[i][1]]++;
    for (const k of keys) if (!n[k] && (p[k] || 0) > 0.03) { const big = keys.reduce((a, b) => (n[a] >= n[b] ? a : b)); if (n[big] > 1) { n[big]--; n[k] = 1; } }
    return { Cl2: n.cl, HCl: n.hcl, H2: n.h2, N2: n.air - Math.floor(n.air / 5), O2: Math.floor(n.air / 5) };
  };
  const bg = (c, kind) => c.mols.filter((m) => m.kind === kind && m.bg && !m.leaving && !m.fadeOut);
  return {
    labels: (k) => k === 'H2' || k === 'Cl2' || k === 'HCl', dim: 0.45,
    init(c, st) {
      c.view.film = 0; c.view.paper = null; gap = 0.3; made = 0; mode = st.mode === 'air' ? 'air' : 'jar';
      if (mode === 'air') { for (let i = 0; i < NO2; i++) c.add('O2', c.inGas(), { gas: true }); for (let i = 0; i < NN2; i++) c.add('N2', c.inGas(), { gas: true }); return; }
      const w = want(st);
      for (const [k, n] of Object.entries(w)) for (let i = 0; i < n; i++) add(c, k, c.inGas(), { gas: true, bg: true });
    },
    step(c, st, dt) {
      c.view.film = 0; c.view.paper = null;
      for (const m of c.mols) if ((m.kind === 'HCl' || m.kind === 'H2O') && m.leaving) m.v.y = Math.min(m.v.y, 1.8);
      if (mode === 'air') { if (c.count('O2') < NO2 && Math.random() < dt * 1.5) { const a = c.rnd(0, 6.3); c.add('O2', c.V([Math.cos(a) * 5, c.rnd(1, 4), Math.sin(a) * 5]), { gas: true }); } }
      else {
        // 背景分子的个数跟着宏观的组成走：少了从旁边补进来，多了慢慢淡出（反应里正在用的 Cl₂ 也算在内）
        const w = want(st);
        for (const [k, n] of Object.entries(w)) {
          const busy = k === 'Cl2' ? c.events.length : 0, have = bg(c, k).length + busy;
          if (have < n && Math.random() < dt * 1.5) { const a = c.rnd(0, 6.3); add(c, k, c.V([Math.cos(a) * 5, c.rnd(1.5, 5), Math.sin(a) * 5]), { gas: true, bg: true, fadeIn: true, dimK: 0 }); }
          if (have > n) { const m = bg(c, k).find((x) => !x.busy); if (m) m.fadeOut = true; }
        }
      }
      // 尖嘴口不断出来氢气（熄灭了也照样出来）
      gap -= dt;
      if (gap <= 0 && c.free('H2').filter((m) => !m.bg).length < (st.lit ? 2 : 3)) { const m = add(c, 'H2', c.V([c.rnd(-0.4, 0.4), 0.9, c.rnd(-0.4, 0.4)]), { gas: true }); m.v.set(0, 1.1, 0); gap = st.lit ? 1.3 : 1.0; }
      if (!st.lit) { for (const m of c.free('H2')) if (!m.bg && m.g.position.y > 6) m.leaving = true; return; }
      if (c.events.length) return;
      if (mode === 'air') {
        const hs = c.free('H2').filter((m) => m.g.position.y > 1.4).slice(0, 2), o2 = hs.length === 2 && c.nearest(c.free('O2'), hs[0].g.position);
        if (o2) c.start(RX_O2, [...hs, o2]);
        return;
      }
      const h2 = c.free('H2').find((m) => !m.bg && m.g.position.y > 1.5), cl = h2 && c.nearest(c.free('Cl2'), h2.g.position);
      if (h2 && cl && c.start(RX_CL, [h2, cl], { then: (ms) => ms.forEach(addPair) })) made++;
    },
    text(c, st) {
      const e = c.events[0], early = e && (e.u == null || e.u < 0.5);
      if (mode === 'air') {
        const eq = `${f('H2', '2')} + ${f('O2')} ${ARRC('点燃')} ${f('H2O', '2')}`;
        if (!st.lit) return { eq, on: false, cap: '还没点燃：氢气从尖嘴出来，和空气混着，<b>不反应</b>。' };
        return { eq, on: true, cap: e ? (early ? `两个 ${f('H2')} 和一个 ${f('O2')} <b>拆成原子</b>：4 个氢、2 个氧` : '重新组合成<b>两个水分子</b>。这是在空气里：氢气和氧气反应，淡蓝色火焰。') : '在空气里：氢气和空气中的<b>氧气</b>反应。把导管伸进氯气里，看看没有氧气还能不能燃烧。' };
      }
      const eq = `${f('H2')} + ${f('Cl2')} ${ARRC('点燃')} ${f('HCl', '2')}`, pct = Math.round(((st.comp && st.comp.cl) || 0) * 100);
      if (st.out) return { eq, on: false, cap: `火焰附近的气体里 ${f('Cl2')} 只占约 ${pct}%，其余大多是 ${f('HCl')}：低于模型设定的熄火条件（约 10%），氢气在这里燃烧不起来，火焰熄灭。` };
      if (!st.lit) return { eq, on: false, cap: `没有点燃：${f('H2')} 流进来，和瓶里的气体混在一起，在本模型里<b>看不到反应</b>（H₂ 和 Cl₂ 在光照或点燃时会反应，课本第 103 页）。` };
      if (e) return { eq, on: true, cap: early ? `${f('H2')} 和 ${f('Cl2')} 在火焰里相遇：两个分子的化学键断开……` : `重新组合成 <b>2 个 ${f('HCl')}</b>：H 和 Cl 各出 1 个电子组成<b>共用电子对</b>（小深色点），氯原子吸引得稍强，电子对<b>偏向 Cl</b>——H 0 → +1，被氧化；Cl 0 → −1，被还原。` };
      return { eq, on: true, cap: made ? `1 个 ${f('H2')} + 1 个 ${f('Cl2')} → 2 个 ${f('HCl')}：<b>原子的种类、个数都没变</b>。这里一个氧分子也没有，照样燃烧——<b>燃烧不一定要有氧气参加</b>。<b>慢放示意，不表示真实的反应步骤。</b>` : `火焰附近：${f('Cl2')} 约占 ${pct}%（黄绿色）。看 ${f('H2')} 和 ${f('Cl2')} 里的共用电子对（小深色点）：都在<b>正中间</b>。` };
    },
  };
}
