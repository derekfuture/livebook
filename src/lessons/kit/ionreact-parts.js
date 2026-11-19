// 离子反应活页（ionreact）的“钻进去看”：Na₂SO₄ 溶液里滴 BaCl₂，Ba²⁺ + SO₄²⁻ ══ BaSO₄↓。
// 照初中红磷燃烧、木炭还原氧化铜的做法（只给这一课用，microworld.js 里的 precipScene 不动）：
//   粒子少——2 个 SO₄²⁻、4 个 Na⁺（Na₂SO₄ 是 2∶1）；滴进来的每一份是 1 个 Ba²⁺ 和 2 个 Cl⁻。
//   一次只演一个反应：一份 BaCl₂ 落进溶液，Ba²⁺ 游到一个 SO₄²⁻ 旁边、贴上去，成了一小块 BaSO₄，慢慢沉到底下；
//   沉淀一块一块分开摆在前面的底上。Na⁺、Cl⁻ 一直在溶液里游（只给一个代表标化学式）。
//   打开时从原来的 Na₂SO₄ 溶液开始，把已经滴进去的一份一份落下来、反应（最多到这一课算出来的量，不超前）。
// st：{ ratio: 加进来的 BaCl₂ ÷ 恰好完全反应要的量, left: 剩下的 SO₄²⁻, excess: 多出来的 Ba²⁺ }（字幕按真实的量判断）
import * as THREE from 'three';
import { f } from './microworld.js';
import { spread, homeTo } from './microlayout.js';

const ARR = '<span class="arr">══</span>';

export function ionScene({ words }) {
  const FILM = 6.2, N = 2, XMAX = 2;          // 恰好完全反应 = 2 份；过量最多多画 2 份
  // 不足、恰好、过量的区别不能丢：不足时画 1 份，恰好画 2 份，过量至少多画 1 份
  const units = (a) => (a <= 1e-9 ? 0 : a < 1 - 1e-6 ? Math.min(N - 1, Math.max(1, Math.floor(N * a + 1e-6))) : a <= 1 + 1e-6 ? N : N + Math.min(XMAX, Math.max(1, Math.ceil(N * (a - 1) - 1e-6))));
  // 沉淀落到前面的底上，一块一块分开摆（BaSO₄ 这一块的中心比钡原子、硫原子的中点偏左 0.75 Å）
  const SINK = [-2.9, 2.9].map((x) => new THREE.Vector3(x + 0.75, 0.95, 1.7));
  const HOME = { 'Na+': new THREE.Vector3(-3.4, 4.7, -1.2), 'Cl-': new THREE.Vector3(3.4, 4.7, -1.2), 'SO4 2-': new THREE.Vector3(2.4, 3.3, -0.2) };
  const SO4_L = new THREE.Vector3(-1.8, 3.3, -0.2);          // 先反应的那个 SO₄²⁻ 待在左边、代表待在右边：两块沉淀各落在自己下面，不从对方头上过
  const RX = { in: ['Ba2+', 'SO4 2-'], out: ['BaSO4'], host: 1, near: [[-2.7, 0, 0], null], map: [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3], [1, 4]],
    approach: 1.5, dur: 1.2, burst: [0xffffff, 0xd8e4ee], after: [{ fixed: true }] };
  let fed = 0, made = 0, wait = 0;
  const say = (w, c, st) => (typeof w === 'function' ? w(c, st) : w);
  const falling = (c) => c.mols.some((m) => m.kind === 'Ba2+' && m.age != null && m.age < 0.9);
  const markRep = (c, kind) => { if (c.mols.some((m) => m.kind === kind && m.rep)) return; const m = c.free(kind).sort((a, b) => a.g.position.distanceTo(HOME[kind] || a.g.position) - b.g.position.distanceTo(HOME[kind] || b.g.position))[0]; if (m) m.rep = true; };
  return {
    dim: 0.45,
    labels: (k, m) => !!m.rep || k === 'Ba2+', labelOnly: (k, m) => !!m.rep || k === 'Ba2+' || m.busy || !!m.labelK,          // 只标代表；Ba²⁺ 一直标（多出来的 Ba²⁺ 就是要看的）
    init(c, st) {
      c.view.film = FILM; c.view.paper = null; fed = 0; made = 0; wait = 0.5;
      for (let i = 0; i < 4; i++) c.add('Na+', c.V([-3 + (i % 2) * 2.4 + c.rnd(-0.4, 0.4), c.rnd(2.8, 5), (i < 2 ? -1.6 : 0.8) + c.rnd(-0.4, 0.4)]));
      for (let i = 0; i < N; i++) c.add('SO4 2-', c.V([-1.8 + i * 4.2, c.rnd(3, 3.6), c.rnd(-0.5, 0.1)]));
      markRep(c, 'Na+'); markRep(c, 'SO4 2-');
    },
    step(c, st, dt) {
      c.view.film = FILM; c.view.paper = null; c.view.liquid = st.color ?? 0xb9dfe9;
      for (const m of c.mols) if (m.age != null) m.age += dt;
      // 一份一份落进来：上一份反应完、停一下，再落下一份
      wait -= dt;
      if (fed < units(st.ratio || 0) && !c.events.length && !falling(c) && wait <= 0 && !(c.free('Ba2+').length && c.free('SO4 2-').length)) {          // 上一个 Ba²⁺ 还没反应就不落下一份
        fed++; wait = 0.8;
        const x0 = c.rnd(-0.8, 0.8), b = c.add('Ba2+', c.V([x0, FILM - 0.5, c.rnd(-0.4, 0.4)]), { age: 0 }); b.v.set(c.rnd(-0.3, 0.3), -2.2, c.rnd(-0.3, 0.3)); b.labelK = 1; b.labelT = 2;
        for (const s of [-1, 1]) { const m = c.add('Cl-', c.V([x0 + s * 1.6, FILM - 0.6, c.rnd(-0.5, 0.5)]), { age: 0 }); m.v.set(s * 1.6, -1.2, c.rnd(-0.6, 0.6)); }
        markRep(c, 'Cl-');
      }
      // Ba²⁺ 落进来以后游向最近的 SO₄²⁻（先不是代表的那个），贴上去；生成的 BaSO₄ 落在自己下面那一格
      if (!c.events.length) {
        const b = c.free('Ba2+').find((m) => (m.age ?? 9) > 0.9), so = c.free('SO4 2-').sort((p, q) => (p.rep ? 1 : 0) - (q.rep ? 1 : 0) || p.g.position.distanceTo(b?.g.position || p.g.position) - q.g.position.distanceTo(b?.g.position || q.g.position))[0];
        if (b && so) {
          const was = so.rep;
          c.start(RX, [b, so], { then: ([p]) => { const side = p.g.position.x < 0.75 ? 0 : 1, taken = (i) => c.mols.some((o) => o !== p && o.sink && o.sink.equals(SINK[i])); p.sink = SINK[taken(side) ? 1 - side : side].clone(); if (!made) p.rep = true; made++; wait = 0.8; if (was) markRep(c, 'SO4 2-'); } });
        }
      }
      for (const m of c.mols) if (m.sink) { m.g.position.lerp(m.sink, Math.min(1, dt * 1.3)); }          // 沉淀慢慢落到底下
      // 溶液里的离子：不叠在一起；不往下钻进沉淀那一层；代表各待一块（标签不互相压着）
      const free = c.mols.filter((m) => !m.busy && !m.fixed && !m.leaving);
      spread(free, 2.6, dt);
      for (const m of free) {
        if (m.rep && HOME[m.kind]) homeTo(m, HOME[m.kind]);
        else if (m.kind === 'SO4 2-') homeTo(m, SO4_L);
        else { const p = m.g.position; m.pull = (m.age ?? 9) > 0.9 ? c.V([0, Math.max(0, 2.8 - p.y) * 3, -Math.max(0, p.z - 0.3) * 3]) : null; }          // 前面底下是沉淀那一排：溶液里的离子待在它上面、后面
      }
    },
    text(c, st) {
      const eq = `${f('Ba2+')} + ${f('SO4 2-')} ${ARR} ${f('BaSO4')}↓`;
      const cap = c.events.length ? say(words.react, c, st)
        : fed > N ? say(words.excess, c, st)
          : fed < units(st?.ratio || 0) || falling(c) ? say(fed ? words.fall : words.start, c, st)
            : !fed ? say(words.start, c, st)
              : st.excess > 1e-9 ? say(words.excess, c, st) : st.left > 1e-9 ? say(words.partial, c, st) : say(words.done, c, st);
      return { eq, cap };
    },
  };
}
