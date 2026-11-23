// H₂ 在 Cl₂ 中燃烧（h2cl2）的“钻进去看”：尖嘴口的火焰里发生什么。
// st：{ mode: 'jar' | 'air'（尖嘴在集气瓶里 / 在空气中）, lit: 火焰燃着没有, comp: 尖嘴附近那一层的组成 { h2, cl, hcl, air }（占比，宏观里算出来的）, out: 在瓶里熄灭了 }
//   背景分子按 comp 的占比画（模型里没有 HCl 就不画 HCl）。
//   瓶里、点着：H₂ 从尖嘴出来，和 Cl₂ 反应：H₂ + Cl₂ → 2HCl。HCl 的 H、Cl 分别来自 H₂ 和 Cl₂（map 写死），原子种类、个数守恒。
//     共用电子对（课本第 24 页）：H₂、Cl₂ 里的电子对在两个原子正中间；HCl 里偏向氯原子——H 0 → +1 被氧化，Cl 0 → −1 被还原。小深色点表示电子。
//   瓶里、没点着：H₂ 和 Cl₂ 混在一起，不反应。
//   空气中、点着：2H₂ + O₂ → 2H₂O（淡蓝色火焰）。
//   慢放示意，不表示真实的反应步骤（实际是链式反应）；分子个数只是示意。
// 画法照初中：一次只演一组，就在尖嘴口前上方的同一处（H₂ 从尖嘴升上来，一个 Cl₂ 迎上去）；电子（小深色点）跟着原子走：
//   两对共用电子对拆开、各跟着自己的原子，再在 H 和 Cl 之间重新配成对（偏向 Cl）。背景分子少、待在后面、不挡反应；每种只标一个代表。
import * as THREE from 'three';
import { f } from './microworld.js';

const ARRC = (t) => `<span class="arr" style="position:relative">══<span style="position:absolute;left:0;right:0;top:-0.75em;font-size:0.45em;letter-spacing:0;text-align:center">${t}</span></span>`;
const eGeo = new THREE.SphereGeometry(0.13, 10, 8), eMat = new THREE.MeshBasicMaterial({ color: 0x46505a });
// 共用电子对画在键的上方（不藏进原子球里）：H₂、Cl₂ 在正中间，HCl 偏向氯（Cl 在 +x）
const PAIR = { H2: [0, 0.42], Cl2: [0, 0.68], HCl: [0.3, 0.6] };
function addPair(m) {
  const p = PAIR[m.kind]; if (!p) return;
  for (const s of [-1, 1]) { const e = new THREE.Mesh(eGeo, eMat); e.position.set(p[0] + s * 0.12, p[1], 0); m.g.add(e); }
}

export function h2cl2Scene() {
  const NG = 5, NO2 = 3, NN2 = 4;          // 瓶里画 5 个“背景”分子，按火焰附近那一层的组成分给 Cl₂、HCl、H₂、空气（N₂ / O₂ 按 4 : 1）
  const AT = new THREE.Vector3(0.4, 3.3, 0.7);          // 反应的地方：尖嘴口前上方（每一组都在这里，看得清）
  const BGY = 5.6;          // 背景分子待在这个高度以上
  let gap = 0.3, made = 0, mode = 'jar';
  const RX_CL = { in: ['H2', 'Cl2'], out: ['HCl', 'HCl'], host: -1, atAbs: () => AT.clone(), nearAbs: (ms, i) => AT.clone().add(new THREE.Vector3(i ? 1.45 : -1.45, i ? 0.15 : -0.1, 0)),
    placeAbs: () => [AT.clone().add(new THREE.Vector3(-1.2, 0.9, 0.3)), AT.clone().add(new THREE.Vector3(1.3, -0.6, -0.3))], map: [[0, 0], [1, 0], [0, 1], [1, 1]], approach: 1.5, dur: 2.6, burst: [0xf2f4ea, 0xffffff],
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
  // 每种分子只标一个代表：背景里各一个、尖嘴口刚出来的那个 H₂（反应的那一组和刚生成的引擎自己标）
  const reps = (c) => {
    for (const m of c.mols) m.rep = false;
    for (const k of ['Cl2', 'HCl', 'H2', 'N2', 'O2']) { const m = c.mols.filter((x) => x.kind === k && x.bg && !x.busy && !x.fadeOut && !x.leaving).sort((a, b) => b.g.position.x - a.g.position.x)[0]; if (m) m.rep = true; }
    if (mode === 'air') for (const k of ['O2', 'N2']) { const m = c.free(k)[0]; if (m) m.rep = true; }
    const h = c.free('H2').filter((m) => !m.bg).sort((a, b) => a.g.position.y - b.g.position.y)[0]; if (h && !c.events.length) h.rep = true;
  };
  // 反应时的电子（小深色点，场景自己画）：两对共用电子对拆开、各跟着自己的原子走，再在 H 和 Cl 之间重新配成对（偏向 Cl）
  const dots = [];
  const clearDots = () => { for (const d of dots) d.parent?.remove(d); dots.length = 0; };
  let repT = 0;
  return {
    get solid() { return mode === 'jar'; }, dim: 0.45, still: true,          // 瓶里分子少：旁边的不变淡；空气里分子多，反应时旁边的变淡。镜头不追着反应跑
    labels: (k, m) => !!m.rep,
    labelOnly: (k, m) => !(m.busy && !m.g.visible) && (!!m.rep || m.busy || !!m.labelK),          // 原子被借去重新组合时，旧分子的标签马上收起
    init(c, st) {
      c.view.film = 0; c.view.paper = null; gap = 0.3; made = 0; repT = 0; mode = st.mode === 'air' ? 'air' : 'jar'; clearDots();
      if (mode === 'air') { for (let i = 0; i < NO2; i++) c.add('O2', c.inGas(), { gas: true }); for (let i = 0; i < NN2; i++) c.add('N2', c.inGas(), { gas: true }); return; }
      const w = want(st);
      for (const [k, n] of Object.entries(w)) for (let i = 0; i < n; i++) add(c, k, c.inGas().setY(c.rnd(BGY, 8.4)), { gas: true, bg: true });
      reps(c);
    },
    step(c, st, dt) {
      c.view.film = 0; c.view.paper = null;
      for (const m of c.mols) if ((m.kind === 'HCl' || m.kind === 'H2O') && m.leaving) m.v.y = Math.min(m.v.y, 1.8);
      // 背景分子待在上面一层（反应那一组的上方），不挡尖嘴口前上方那一组
      for (const m of c.mols) if (m.bg && !m.busy) { const p = m.g.position; if (p.y < BGY) { p.y += Math.min(BGY - p.y, dt * 3); m.v.y = Math.abs(m.v.y); } }
      // 背景分子互相让开一点（不叠成一团）：按画面上的左右、上下算（前后叠着，从正面看也是一团）
      const bgs = c.mols.filter((m) => m.bg && !m.busy);
      for (let i = 0; i < bgs.length; i++) for (let j = i + 1; j < bgs.length; j++) { const d = bgs[j].g.position.clone().sub(bgs[i].g.position).setZ(0), L = d.length(); if (L < 3 && L > 1e-3) { d.multiplyScalar(((3 - L) / L) * Math.min(1, dt * 2) * 0.5); bgs[j].g.position.add(d); bgs[i].g.position.sub(d); } }
      if ((repT -= dt) <= 0) { repT = 0.5; reps(c); }
      // 电子跟着原子：前 35% 拆开、各回到自己的原子上，停一下，最后 40% 在 H 和 Cl 之间重新配成对
      const ev = c.events[0];
      if (ev && ev.temp && ev.rx === RX_CL) {
        if (!dots.length) for (let i = 0; i < 4; i++) { const d = new THREE.Mesh(eGeo, eMat); c.layer.add(d); dots.push(d); }
        const T = ev.temp.map((a) => a.position), Y = (y) => new THREE.Vector3(0, y, 0), q = Math.min(1, Math.max(0, ev.u ?? 0)), sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
        const own = [0, 1, 2, 3].map((i) => T[i].clone().add(Y(i < 2 ? 0.45 : 0.8)));
        const start = [0, 1, 2, 3].map((i) => { const a = i < 2 ? T[0].clone().lerp(T[1], 0.5) : T[2].clone().lerp(T[3], 0.5), dir = (i < 2 ? T[1].clone().sub(T[0]) : T[3].clone().sub(T[2])).normalize(); return a.add(Y(i < 2 ? PAIR.H2[1] : PAIR.Cl2[1])).addScaledVector(dir, i % 2 ? 0.12 : -0.12); });
        const pairOf = [[0, 2], [1, 3], [0, 2], [1, 3]];          // 电子 i 最后在哪个 HCl 里（H 的下标、Cl 的下标）
        const end = [0, 1, 2, 3].map((i) => { const [hI, cI] = pairOf[i], dir = T[cI].clone().sub(T[hI]).normalize(); return T[hI].clone().lerp(T[cI], 0.73).add(Y(PAIR.HCl[1])).addScaledVector(dir, i < 2 ? -0.12 : 0.12); });          // 和生成的 HCl 上那一对的位置一样（偏向 Cl）
        dots.forEach((d, i) => { d.position.copy(q < 0.35 ? start[i].lerp(own[i], sm(q / 0.35)) : q < 0.6 ? own[i] : own[i].lerp(end[i], sm((q - 0.6) / 0.4))); });
      } else if (dots.length) clearDots();
      if (mode === 'air') { if (c.count('O2') < NO2 && Math.random() < dt * 1.5) { const a = c.rnd(0, 6.3); c.add('O2', c.V([Math.cos(a) * 5, c.rnd(1, 4), Math.sin(a) * 5]), { gas: true }); } }
      else {
        // 背景分子的个数跟着宏观的组成走：少了从旁边补进来，多了慢慢淡出（反应里正在用的 Cl₂ 也算在内）
        const w = want(st);
        for (const [k, n] of Object.entries(w)) {
          const busy = k === 'Cl2' ? c.events.length : 0, have = bg(c, k).length + busy;
          if (have < n && Math.random() < dt * 1.5) { const a = c.rnd(0, 6.3); add(c, k, c.V([Math.cos(a) * 5, c.rnd(BGY, 8.4), Math.sin(a) * 5]), { gas: true, bg: true, fadeIn: true, dimK: 0 }); }
          if (have > n) { const m = bg(c, k).find((x) => !x.busy); if (m) m.fadeOut = true; }
        }
      }
      // 尖嘴口不断出来氢气（熄灭了也照样出来）
      gap -= dt;
      // 瓶里点着时一次只出来一个、正在反应时先不出来（不挤在反应的地方）；空气里一次要两个 H₂
      if (gap <= 0 && !(st.lit && mode === 'jar' && c.events.length) && c.free('H2').filter((m) => !m.bg).length < (st.lit ? (mode === 'jar' ? 1 : 2) : 3)) { const m = add(c, 'H2', c.V([c.rnd(-0.4, 0.4), 0.9, c.rnd(-0.4, 0.4)]), { gas: true }); m.v.set(0, 1.1, 0); gap = st.lit ? 1.3 : 1.0; }
      if (!st.lit) { for (const m of c.free('H2')) if (!m.bg && m.g.position.y > 6) m.leaving = true; return; }
      if (c.events.length) return;
      if (mode === 'air') {
        const hs = c.free('H2').filter((m) => m.g.position.y > 1.4).slice(0, 2), o2 = hs.length === 2 && c.nearest(c.free('O2'), hs[0].g.position);
        if (o2) c.start(RX_O2, [...hs, o2]);
        return;
      }
      const h2 = c.free('H2').find((m) => !m.bg && m.g.position.y > 1.5), cl = h2 && c.nearest(c.free('Cl2').filter((m) => !m.fadeIn), AT);
      if (h2 && cl && c.start(RX_CL, [h2, cl], { then: (ms) => { ms.forEach(addPair); clearDots(); } })) { made++; h2.rep = cl.rep = false; }
    },
    text(c, st) {
      const e = c.events[0], early = e && (e.u == null || e.u < 0.5);
      if (mode === 'air') {
        const eq = `${f('H2', '2')} + ${f('O2')} ${ARRC('点燃')} ${f('H2O', '2')}`;
        if (!st.lit) return { eq, on: false, cap: '还没点燃：氢气从尖嘴出来，和空气混着，<b>不反应</b>。' };
        return { eq, on: true, cap: e ? (early ? `两个 ${f('H2')} 和一个 ${f('O2')} <b>拆成原子</b>：4 个氢、2 个氧` : '重新组合成<b>两个水分子</b>。这是在空气里：氢气和氧气反应，淡蓝色火焰。') : '在空气里：氢气和空气中的<b>氧气</b>反应。把导管伸进氯气里，看看换成氯气还能不能燃烧。' };
      }
      const eq = `${f('H2')} + ${f('Cl2')} ${ARRC('点燃')} ${f('HCl', '2')}`, pct = Math.round(((st.comp && st.comp.cl) || 0) * 100);
      const SHOW = `<b>慢放示意</b>：只表示总反应里原子怎样重新组合，不表示真实的反应步骤（实际是链式反应）；分子个数也是示意。`;
      if (st.out) {          // 熄火时火焰附近是什么，按宏观算出来的同一份组成说（画面里的背景分子也按它画）
        const p = st.comp || {}, NAME = { hcl: f('HCl'), air: `空气（${f('N2')}、${f('O2')}）`, h2: f('H2') }, main = ['hcl', 'air', 'h2'].filter((k) => (p[k] || 0) > 0.05).sort((a, b) => p[b] - p[a]).map((k) => NAME[k]);
        return { eq, on: false, cap: `火焰附近<b>氯气不足</b>：${f('Cl2')} 已低于 10%${main.length ? `，其余主要是${main.join('和')}` : ''}。低于模型设定的熄火条件，氢气在这里燃烧不起来，火焰熄灭。` };
      }
      if (!st.lit) return { eq, on: false, cap: `没有点燃：${f('H2')} 流进来，和瓶里的气体混在一起，在本模型里<b>看不到反应</b>（H₂ 和 Cl₂ 在光照或点燃时会反应，课本第 103 页）。` };
      if (e) return { eq, on: true, cap: (early ? `${f('H2')} 和 ${f('Cl2')} 在火焰里相遇：两个分子的化学键断开……` : `重新组合成 <b>2 个 ${f('HCl')}</b>：H 和 Cl 各出 1 个电子组成<b>共用电子对</b>（小深色点），氯原子吸引得稍强，电子对<b>偏向 Cl</b>——H 0 → +1，被氧化；Cl 0 → −1，被还原。`) + SHOW };
      return { eq, on: true, cap: (made ? `1 个 ${f('H2')} + 1 个 ${f('Cl2')} → 2 个 ${f('HCl')}：<b>原子的种类、个数都没变</b>。这条反应只有 H₂ 和 Cl₂ 参加，氧气无须参与：氯气就能支持氢气燃烧——<b>燃烧不一定要有氧气参加</b>。` : `火焰附近：${f('Cl2')} 约占 ${pct}%（黄绿色）。看 ${f('H2')} 和 ${f('Cl2')} 里的共用电子对（小深色点）：都在<b>正中间</b>。`) + SHOW };
    },
  };
}
