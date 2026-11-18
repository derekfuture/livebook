// 硝酸与铜（cuhno3 一课用）的“钻进去看”：铜丝螺旋的表面浸在浓硝酸 / 稀硝酸里。
//   课本第 15 页：4HNO₃(浓) + Cu ══ Cu(NO₃)₂ + 2NO₂↑ + 2H₂O；8HNO₃(稀) + 3Cu ══ 3Cu(NO₃)₂ + 2NO↑ + 4H₂O。
//   画法（慢放示意，不表示真实的反应步骤）：硝酸画成溶液里的 H⁺ 和 NO₃⁻（和离子方程式一致；浓硝酸里其实还有不少 HNO₃ 分子）。
//   浓：Cu + 4H⁺ + 2NO₃⁻ → Cu²⁺ + 2NO₂ + 2H₂O——一个铜原子交出 2 个电子，两个 NO₃⁻ 里的氮各得 1 个（+5 → +4）。
//   稀：3Cu + 8H⁺ + 2NO₃⁻ → 3Cu²⁺ + 2NO + 4H₂O——三个铜原子交出 6 个电子，两个 NO₃⁻ 里的氮各得 3 个（+5 → +2）。
//   没得电子的 NO₃⁻ 留在溶液里，和 Cu²⁺ 在一起就是 Cu(NO₃)₂（浓：2 个，稀：6 个）。
//   原子守恒：浓 Cu N₂ O₆ H₄ = Cu + N₂O₄ + O₂H₄ ✓；稀 Cu₃ N₂ O₆ H₈ = Cu₃ + N₂O₂ + O₄H₈ ✓。电荷：浓 0 + 4 − 2 = +2 ✓；稀 0 + 8 − 2 = +6 = 3 × (+2) ✓。
// st：{ conc: 浓硝酸那支, contact: 铜丝浸在酸里, hot: 正在反应（宏观的速率够大）, made: 已经生成过 Cu²⁺ }
import * as THREE from 'three';
import { f, textSprite } from './microworld.js';

const ARR = '<span class="arr">══</span>';
const EQ_C = `4HNO<sub>3</sub>(浓) + Cu ${ARR} Cu(NO<sub>3</sub>)<sub>2</sub> + 2${f('NO2')}↑ + 2H<sub>2</sub>O`;
const EQ_D = `8HNO<sub>3</sub>(稀) + 3Cu ${ARR} 3Cu(NO<sub>3</sub>)<sub>2</sub> + 2${f('NO')}↑ + 4H<sub>2</sub>O`;

// 生成物的每个原子来自哪里 [第几个反应物, 第几个原子]。NO₃⁻ 的原子顺序：N、O、O、O；H₂O：O、H、H
// 浓：反应物 0 = Cu，1、2 = NO₃⁻，3~6 = H⁺；生成物 Cu²⁺、NO₂、NO₂、H₂O、H₂O
const MAP_C = [[0, 0], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2], [1, 3], [3, 0], [4, 0], [2, 3], [5, 0], [6, 0]];
// 稀：反应物 0~2 = Cu，3、4 = NO₃⁻，5~12 = H⁺；生成物 3 个 Cu²⁺、NO、NO、4 个 H₂O
const MAP_D = [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [4, 0], [4, 1], [3, 2], [5, 0], [6, 0], [3, 3], [7, 0], [8, 0], [4, 2], [9, 0], [10, 0], [4, 3], [11, 0], [12, 0]];

export function nitricScene() {
  const FILM = 6.4, SP = 1.36, Y0 = 0.75;
  const sites = [];
  for (let r = -4; r <= 4; r++) for (let q = -4; q <= 4; q++) { const x = (q + (r % 2 ? 0.5 : 0)) * SP, z = r * SP * 0.866; if (Math.hypot(x, z) < 4.4) sites.push(new THREE.Vector3(x, Y0, z)); }
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  let phase = null, made = 0, wait = 1.2, refill = [], conc = true;
  let P = null;          // 正在进行的这一次：{ cus, ns, hs, t, el: [电子], tags, to: Map(分子 → 位置) }
  const front = (p) => Math.abs(p.x) + Math.abs(p.z - 1.4);
  const surf = (c) => c.mols.filter((m) => m.kind === 'Cu' && m.fixed && !m.busy && !m.hold);
  const NP = () => (conc ? 6 : 3), NW = () => (conc ? 3 : 9);          // 浓：H⁺、NO₃⁻ 多，水少；稀：水多（个数示意）
  const disposeO = (c, o) => { c.layer.remove(o); o.geometry?.dispose(); o.material.map?.dispose(); o.material.dispose(); };
  const dropP = (c) => { if (!P) return; for (const o of [...P.el, ...P.tags]) disposeO(c, o); for (const m of [...P.cus, ...P.ns, ...P.hs]) if (m) m.hold = false; P = null; phase = null; };
  const atomAt = (c, m, i) => c.layer.worldToLocal(m.atoms[i].getWorldPosition(new THREE.Vector3()));
  const tag = (c, text, color) => { const s = textSprite(text, color, 'rgba(255,255,255,0.95)'); s.scale.set(3.4, 1.27, 1); s.material.opacity = 0; c.layer.add(s); return s; };
  const freeHeld = (c, k) => c.free(k).filter((m) => !m.hold);
  return {
    labels: (k) => k === 'NO2' || k === 'NO' || k === 'Cu2+', dim: 0.55,          // H⁺、NO₃⁻ 很多：只在参与反应时标
    labelOnly: (k) => k !== 'H+' && k !== 'H2O' && k !== 'Cu',          // 一次反应里 H⁺ 有 4~8 个：不给它们标字，免得叠在一起（说明里写着）
    init(c, st) {
      conc = !!st.conc;
      c.view.film = FILM; c.view.paper = null; c.view.liquid = conc ? 0xe8ecd8 : 0xdde9ef;
      P = null; phase = null; made = 0; wait = 1.2; refill = [];
      if (st.contact) for (const p of sites) c.add('Cu', p.clone(), { fixed: true });
      for (let i = 0; i < NP(); i++) { c.add('H+', c.inLiquid()); c.add('NO3-', c.inLiquid()); }
      for (let i = 0; i < NW(); i++) c.add('H2O', c.inLiquid());
      if (st.made) { c.add('Cu2+', c.inLiquid()); c.add('NO3-', c.inLiquid()); c.add('NO3-', c.inLiquid()); }
    },
    step(c, st, dt) {
      c.view.film = FILM; c.view.paper = null; c.view.liquid = conc ? 0xe8ecd8 : 0xdde9ef;
      c.view.speed = st.hot ? 1.5 : 1;
      // 酸用掉了，远处的 H⁺、NO₃⁻ 成对补过来（电荷平衡）；水用不完
      if (!P && c.count('H+') < NP() && Math.random() < dt * 1.2) c.pairIn('H+', 'NO3-');
      if (c.free('H2O').length > NW() + 3 && Math.random() < dt) c.free('H2O')[0].fadeOut = true;
      // 生成的 Cu²⁺ 带着两个 NO₃⁻ 走远了（成对淡出）
      if (!P && c.count('Cu2+') > 3 && Math.random() < dt) c.pairOut('Cu2+', 'NO3-');
      for (const r of [...refill]) { r.t -= dt; if (r.t <= 0 && st.contact) { c.add('Cu', r.p.clone(), { fixed: true, fadeIn: true, dimK: 0 }); refill.splice(refill.indexOf(r), 1); } }
      if (!st.contact) { if (P) dropP(c); for (const m of c.mols.filter((x) => x.kind === 'Cu' && x.fixed && !x.busy)) m.fadeOut = true; return; }
      if (!P && st.hot && !c.events.length) {
        wait -= dt;
        if (wait <= 0) {
          const nCu = conc ? 1 : 3, nH = conc ? 4 : 8;
          // 稀硝酸：一次要 8 个 H⁺，旁边不够就从远处成对补过来
          if (freeHeld(c, 'H+').length < nH) { c.pairIn('H+', 'NO3-'); wait = 0.25; return; }
          const s = surf(c).sort((x, y) => front(x.g.position) - front(y.g.position));
          const c0 = s[Math.floor(Math.random() * 3)];
          if (!c0) return;
          const cus = [c0, ...s.filter((m) => m !== c0).sort((x, y) => x.g.position.distanceTo(c0.g.position) - y.g.position.distanceTo(c0.g.position)).slice(0, nCu - 1)];
          const ctr = cus.reduce((a, m) => a.add(m.g.position), V(0, 0, 0)).multiplyScalar(1 / cus.length);
          const byD = (k) => freeHeld(c, k).sort((x, y) => x.g.position.distanceTo(ctr) - y.g.position.distanceTo(ctr));
          const ns = byD('NO3-').slice(0, 2), hs = byD('H+').slice(0, nH);
          if (cus.length < nCu || ns.length < 2 || hs.length < nH) return;
          P = { cus, ns, hs, t: 0, el: [], tags: [], ctr, to: new Map() }; phase = 'come';
          for (const m of [...cus, ...ns, ...hs]) m.hold = true;
          // 两个 NO₃⁻ 停在铜的表面上方左右两边，H⁺ 围在它们旁边
          const dx = conc ? 1.7 : 2.0;
          ns.forEach((m, j) => {
            const np = ctr.clone().add(V(j ? dx : -dx, 1.8, 0.35)); P.to.set(m, np);
            const per = nH / 2;
            for (let i = 0; i < per; i++) { const a = (i / per) * Math.PI * 2 + (j ? 0.4 : 0); P.to.set(hs[j * per + i], np.clone().add(V(Math.cos(a) * 1.25, 0.5 + (i % 2) * 0.35, Math.sin(a) * 1.0))); }
          });
        }
      }
      if (!P) return;
      P.t += dt;
      if (phase === 'come' || phase === 'e') for (const [m, to] of P.to) { m.v.set(0, 0, 0); m.g.position.lerp(to, Math.min(1, dt * 2.4)); }
      if (phase === 'come' && P.t > 1.4) {
        phase = 'e'; P.t = 0;
        // 电子（小深色点）：每个铜原子 2 个。浓：两个电子分给两个氮，各 1 个；稀：6 个电子，每个氮 3 个
        const plan = conc ? [[0, 0], [0, 1]] : [[0, 0], [0, 0], [1, 0], [1, 1], [2, 1], [2, 1]];
        plan.forEach(([ci, ni], i) => {
          const e = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), new THREE.MeshBasicMaterial({ color: 0x2b3240 }));
          e.position.copy(P.cus[ci].g.position).add(V((i % 2 ? 0.32 : -0.32), 0.7, 0.45));
          e.userData = { from: e.position.clone(), ni, slot: plan.slice(0, i).filter((q) => q[1] === ni).length };
          c.layer.add(e); P.el.push(e);
        });
        P.tags.push(tag(c, 'Cu  0 → +2', '#a24f22'), tag(c, conc ? 'N  +5 → +4' : 'N  +5 → +2', '#3a5bb0'));
      }
      if (phase === 'e') {
        const k = Math.min(1, P.t / 1.7), u = k * k * (3 - 2 * k);
        const nAt = P.ns.map((m) => atomAt(c, m, 0));
        P.el.forEach((e) => { const s = e.userData.slot, to = nAt[e.userData.ni].clone().add(V((s - 1) * 0.36, 0.4, 0.32)); e.position.copy(e.userData.from).lerp(to, u); e.position.y += Math.sin(Math.PI * u) * 1.2; });
        P.tags[0].position.copy(P.ctr).add(V(-3.6, 3.4, 1.6)); P.tags[1].position.copy(P.ctr).add(V(3.6, 4.4, 0.6));          // 化合价牌放在两边，不压住原子
        for (const s of P.tags) s.material.opacity = Math.min(0.95, P.t * 2);
        if (P.t > 2.0) {
          phase = 'rx'; P.t = 0;
          for (const e of P.el) disposeO(c, e); P.el = [];
          const sitesUsed = P.cus.map((m) => m.g.position.clone()), nP = P.ns.map((m) => m.g.position.clone()), ctr = P.ctr.clone();
          for (const m of [...P.cus, ...P.ns, ...P.hs]) m.hold = false;
          const mols = [...P.cus, ...P.ns, ...P.hs];
          const rx = conc
            ? { in: ['Cu', 'NO3-', 'NO3-', 'H+', 'H+', 'H+', 'H+'], out: ['Cu2+', 'NO2', 'NO2', 'H2O', 'H2O'], map: MAP_C,
              placeAbs: () => [sitesUsed[0].clone().add(V(0.2, 1.9, 0.2)), nP[0].clone().add(V(-0.2, 1.2, 0)), nP[1].clone().add(V(0.2, 1.2, 0)), nP[0].clone().add(V(-0.6, -0.5, 0.8)), nP[1].clone().add(V(0.6, -0.5, -0.7))],
              after: [{ v: [0.3, 1.2, 0] }, { leave: true, gas: true, v: [-0.3, 2.2, 0] }, { leave: true, gas: true, v: [0.3, 2.2, 0] }, {}, {}] }
            : { in: ['Cu', 'Cu', 'Cu', 'NO3-', 'NO3-', 'H+', 'H+', 'H+', 'H+', 'H+', 'H+', 'H+', 'H+'], out: ['Cu2+', 'Cu2+', 'Cu2+', 'NO', 'NO', 'H2O', 'H2O', 'H2O', 'H2O'], map: MAP_D,
              placeAbs: () => [...sitesUsed.map((p) => p.clone().add(V(0, 1.9, 0.3))), nP[0].clone().add(V(0, 1.3, 0)), nP[1].clone().add(V(0, 1.3, 0)),
                nP[0].clone().add(V(-1.2, -0.4, 0.8)), nP[0].clone().add(V(-0.4, -0.6, -1.0)), nP[1].clone().add(V(1.2, -0.4, 0.8)), nP[1].clone().add(V(0.4, -0.6, -1.0))],
              after: [{ v: [-0.6, 1.2, 0] }, { v: [0, 1.2, 0.4] }, { v: [0.6, 1.2, 0] }, { leave: true, gas: true, v: [-0.3, 2.0, 0] }, { leave: true, gas: true, v: [0.3, 2.0, 0] }, {}, {}, {}, {}] };
          const ev = c.start({ ...rx, host: 0, approach: 0, dur: conc ? 2.6 : 3.0, burst: [0xffe2a0, conc ? 0xd9a07a : 0xd8dde8], atAbs: () => ctr.clone().add(V(0, 1.3, 0)) }, mols,
            { then: () => { made++; for (const p of sitesUsed) refill.push({ p, t: 2.5 }); } });
          if (!ev) dropP(c);
        }
      }
      if (phase === 'rx') {
        if (P.t > 4.4) for (const s of P.tags) s.material.opacity = Math.max(0, s.material.opacity - dt * 1.5);
        if (P.t > 5.2) { dropP(c); wait = conc ? 1.6 : 2.6; }
      }
    },
    text(c, st) {
      const EQ = conc ? EQ_C : EQ_D;
      const acid = conc ? '浓硝酸' : '稀硝酸';
      if (!st.contact) return { eq: EQ, on: false, cap: `铜丝已经拉上去，离开了${acid}：这里只有 ${f('H+')}、${f('NO3-')} 和水，没有铜可以反应——<b>反应停止</b>。` };
      if (phase === 'come') return { eq: EQ, on: true, cap: conc ? `两个 ${f('NO3-')} 和四个 ${f('H+')} 来到铜的表面。（硝酸在溶液里画成 ${f('H+')} 和 ${f('NO3-')}）` : `两个 ${f('NO3-')}、八个 ${f('H+')} 来到<b>三个</b>铜原子旁边。稀硝酸里水多，${f('H+')}、${f('NO3-')} 少。` };
      if (phase === 'e') return { eq: EQ, on: true, cap: conc
        ? `一个铜原子交出 <b>2 个电子</b>（小深色点）：<b>Cu 0 → +2</b>，被氧化；两个 ${f('NO3-')} 里的氮<b>各得 1 个</b>：<b>N +5 → +4</b>，被还原。`
        : `三个铜原子一共交出 <b>6 个电子</b>：<b>Cu 0 → +2</b>，被氧化；两个 ${f('NO3-')} 里的氮<b>各得 3 个</b>：<b>N +5 → +2</b>，被还原。` };
      if (phase === 'rx') return { eq: EQ, on: true, cap: conc
        ? `得到电子的 ${f('NO3-')} 和 ${f('H+')} 变成 ${f('NO2')}（红棕色，冒出去）和水；溶液里另外两个 ${f('NO3-')} 没得电子，和 ${f('Cu2+')} 在一起就是 Cu(NO₃)₂。原子的种类、个数都没变。`
        : `得到电子的 ${f('NO3-')} 和 ${f('H+')} 变成 ${f('NO')}（无色，冒出去）和水；另外六个 ${f('NO3-')} 没得电子，和三个 ${f('Cu2+')} 在一起就是 3Cu(NO₃)₂。原子的种类、个数都没变。` };
      if (st.hot) return { eq: EQ, on: true, cap: `${acid}里，铜不断失去电子变成 ${f('Cu2+')}；氮得到电子，变成 ${conc ? f('NO2') : f('NO')}。<b>慢放示意，不表示真实的反应步骤。</b>` };
      if (made) return { eq: EQ, on: false, cap: `铜失去的电子数 = 氮得到的电子数（浓：1 个 Cu 对 2 个 ${f('NO2')}；稀：3 个 Cu 对 2 个 ${f('NO')}）。硝酸是<b>氧化剂</b>，铜是<b>还原剂</b>。` };
      return { eq: EQ, on: false, cap: `铜的表面浸在${acid}里。` };
    },
  };
}
