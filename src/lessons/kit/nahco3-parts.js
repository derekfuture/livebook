// 碳酸钠、碳酸氢钠受热（nahco3 一课用）的“钻进去看”：晶体里的离子。
//   碳酸氢钠：Na⁺ 和 HCO₃⁻ 排成一小块晶体（4 个 Na⁺、4 个 HCO₃⁻，电荷平衡）。受热分解时，两个 HCO₃⁻ 一组：
//     2HCO₃⁻ ══ CO₃²⁻ + H₂O + CO₂↑ （一个 HCO₃⁻ 的 H 交给另一个，一个成了 CO₃²⁻ 留在晶体里，另一个成了 H₂O 和 CO₂ 跑出去；Na⁺ 不参加）。
//     原子、电荷都守恒：2 个 HCO₃⁻ = C₂H₂O₆，电荷 −2；CO₃²⁻ + H₂O + CO₂ = C₂H₂O₆，电荷 −2。慢放示意，不表示真实的反应步骤。
//   碳酸钠：4 个 Na⁺、2 个 CO₃²⁻。受热只是在原地抖得厉害，CO₃²⁻ 不变。
//   打开时：已经分解的几组里，最后一组先摆回 HCO₃⁻，打开后马上重放一遍它的原子迁移（晚打开也看得到一次变化）；前面的摆成 CO₃²⁻。
//   st.resume ≥ 0：老师演示完回来，学生原来已经看过几组，那几组直接摆成 CO₃²⁻，接着演。
// st：{ kind: 'nahco3' | 'na2co3' | null, x: 已分解的比例 0~1, T: 受热最强处的温度 ℃, resume }
import * as THREE from 'three';
import { f } from './microworld.js';

const DX = 3.5, DZ = 3.2;
const ARRH = '<span class="arr" style="position:relative">══<span style="position:absolute;left:0;right:0;top:-0.75em;font-size:0.45em;letter-spacing:0;text-align:center">△</span></span>';

export function bicarbScene() {
  let kind = null, made = 0, replay = false;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const Y0 = 0.7;
  const pos = (i, j) => V((i - 1.5) * DX, Y0, (j - 0.5) * DZ);
  // 碳酸氢钠：4 列 × 2 行，棋盘式排开；相邻（斜对角）的两个 HCO₃⁻ 成一组
  const PAIRS = [[[1, 0], [0, 1]], [[3, 0], [2, 1]]];
  const find = (c, p, k) => c.mols.find((m) => m.kind === k && !m.busy && m.home && m.home.distanceTo(p) < 0.05);
  const rxOf = (c, a, b) => {
    const mid = a.g.position.clone().lerp(b.g.position, 0.5);
    return { in: ['HCO3-', 'HCO3-'], out: ['CO3 2-', 'H2O', 'CO2'], host: 0, approach: 0, dur: 2.8, burst: [0xffd27a],
      atAbs: () => mid.clone().add(V(0, 1.3, 0)),
      placeAbs: () => [a.g.position.clone(), mid.clone().add(V(0, 2.0, 0)), mid.clone().add(V(0, 3.6, 0))],
      // 生成物的每个原子从哪来 [第几个反应物, 第几个原子]：CO₃²⁻ = 第 1 个 HCO₃⁻ 的 C、三个 O；H₂O = 第 2 个的 OH 里的 O + 两个 HCO₃⁻ 的 H；CO₂ = 第 2 个的 C 和另外两个 O
      map: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [0, 4], [1, 4], [1, 0], [1, 1], [1, 2]],
      after: [{ fixed: true }, { leave: true, gas: true, v: [0, 2.0, 0] }, { leave: true, gas: true, v: [0, 2.0, 0] }] };
  };
  return {
    solid: true, still: true,
    get made() { return made; },
    labels: (k, m) => !!m.rep || k === 'CO2' || k === 'H2O' || k === 'CO3 2-', labelOnly: (k, m) => !!m.rep || k === 'CO2' || k === 'H2O' || k === 'CO3 2-',
    init(c, st) {
      kind = st?.kind || null; made = 0; replay = false;
      c.view.film = 0; c.view.paper = null;
      if (kind === 'nahco3') {
        for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
          const na = (i + j) % 2 === 0, m = c.add(na ? 'Na+' : 'HCO3-', pos(i, j), { fixed: true }); m.g.rotation.set(0, 0, 0); m.home = m.g.position.clone();
        }
        const done = (st.x || 0) > 0.02 ? Math.min(2, Math.max(1, Math.round((st.x || 0) * 2))) : 0;
        const n = st.resume >= 0 ? Math.min(done, st.resume) : Math.max(0, done - 1);          // 正常打开：最后一组留着重放
        replay = st.resume < 0 && done > 0;
        for (let k = 0; k < n; k++) {
          const [[ai, aj], [bi, bj]] = PAIRS[k];
          for (const [i, j] of [[ai, aj], [bi, bj]]) { const m = find(c, pos(i, j), 'HCO3-'); if (m) c.remove(m); }
          const m = c.add('CO3 2-', pos(ai, aj), { fixed: true }); m.g.rotation.set(0, 0, 0); m.home = m.g.position.clone();
        }
        made = n;
        const na = c.mols.find((m) => m.kind === 'Na+'), hc = c.mols.find((m) => m.kind === 'HCO3-'); if (na) na.rep = true; if (hc) hc.rep = true;
      } else if (kind === 'na2co3') {
        // 碳酸钠：3 列 × 2 行，中间一列是 CO₃²⁻，两边是 Na⁺
        for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
          const m = c.add(i === 1 ? 'CO3 2-' : 'Na+', V((i - 1) * DX, Y0, (j - 0.5) * DZ), { fixed: true }); m.g.rotation.set(0, 0, 0); m.home = m.g.position.clone();
        }
        const na = c.mols.find((m) => m.kind === 'Na+'), co = c.mols.find((m) => m.kind === 'CO3 2-'); if (na) na.rep = true; if (co) co.rep = true;
      }
    },
    step(c, st, dt) {
      c.view.film = 0; c.view.paper = null;
      c.view.speed = 1 + Math.min(2, Math.max(0, (st.T || 25) - 20) / 120);
      // 温度越高，离子在原位抖得越厉害（固体里离子不会走开）
      const jig = Math.min(0.03, Math.max(0, (st.T || 25) - 60) / 6000);
      for (const m of c.mols) if (m.fixed && !m.busy && m.home) m.g.position.copy(m.home).add(V(c.rnd(-jig, jig), c.rnd(-jig, jig), c.rnd(-jig, jig)));
      if (kind !== 'nahco3') return;
      const want = (st.x || 0) > 0.02 ? Math.min(2, Math.max(1, Math.round((st.x || 0) * 2))) : 0;
      if (made < want && !c.events.length) {
        const [[ai, aj], [bi, bj]] = PAIRS[made];
        const a = find(c, pos(ai, aj), 'HCO3-'), b = find(c, pos(bi, bj), 'HCO3-');
        if (a && b) { a.g.position.copy(a.home); b.g.position.copy(b.home); made++; c.start(rxOf(c, a, b), [a, b], { then: (ps) => { ps[0].home = ps[0].g.position.clone(); if (made >= want) replay = false; } }); }
      }
      for (const m of c.mols) if ((m.kind === 'CO2' || m.kind === 'H2O') && m.leaving) { m.v.y = Math.min(m.v.y, 2.0); if (m.g.position.y > Y0 + 6.5) m.fadeOut = true; }
    },
    text(c, st) {
      if (!kind) return { eq: '', on: false, cap: '试管里还没有固体。装进碳酸钠或碳酸氢钠，再钻进去看。' };
      if (kind === 'na2co3') {
        return { eq: `${f('Na+', '2')} + ${f('CO3 2-')} （Na₂CO₃）`, on: true,
          cap: `碳酸钠由 ${f('Na+')} 和 ${f('CO3 2-')} 构成。加热时离子只是在原位<b>抖得更厉害</b>，没有变化：碳酸钠很稳定，受热不易分解。` };
      }
      const eq = `${f('HCO3-', '2')} ${ARRH} ${f('CO3 2-')} + ${f('H2O')} + ${f('CO2')}↑`, e = c.events[0], nC = c.count('CO3 2-');
      const cap = e ? `${replay ? '重放一组：' : ''}两个 ${f('HCO3-')} 一组：一个把 <b>H</b> 交给另一个——这个成了 ${f('CO3 2-')} 留在晶体里；另一个成了 ${f('H2O')} 和 ${f('CO2')}，<b>跑出去</b>。${f('Na+')} 没有参加。<b>慢放示意，不表示真实的反应步骤。</b>`
        : nC ? `晶体里已经有 <b>${nC}</b> 个 ${f('CO3 2-')}（Na₂CO₃ 的成分；粒子个数和组数是示意）；跑出去的 ${f('CO2')} 和 ${f('H2O')} 就是石灰水变浑浊、试管口出现水珠的来源。`
          : (st.T || 25) < 100 ? `碳酸氢钠由 ${f('Na+')} 和 ${f('HCO3-')} 构成（每个 ${f('HCO3-')} 里有一个 H）。温度还不够高，离子只在原位抖动。` : '温度上来了，离子抖得厉害——碳酸氢钠快要分解了。';
      return { eq, on: true, cap };
    },
  };
}
