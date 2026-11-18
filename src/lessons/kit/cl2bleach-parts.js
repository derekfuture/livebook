// 氯气漂白活页（cl2bleach）的微观场景：纸条 / 花瓣表面上，氯气分子和水发生什么。
// st：{ wet: 这件东西含水吗, c: 它周围氯气的浓度（0~1）, hn: 它上面的次氯酸（0~1，宏观里算出来的） }
//   干燥：表面没有水，氯气分子在上面飞来飞去，什么也不发生。
//   有水：氯气溶进水里，一部分与水反应 Cl₂ + H₂O ⇌ H⁺ + Cl⁻ + HClO（课本写成 HCl + HClO；HCl 在水里是 H⁺ 和 Cl⁻）。
//   Cl₂ 的两个 Cl 一个进了 HClO，一个成了 Cl⁻；水的 O、一个 H 进了 HClO，另一个 H 成了 H⁺。原子守恒、电荷守恒（0 = 0 + 1 − 1）。
//   慢放示意，不表示真实的反应步骤；只有一部分氯气发生反应（可逆）。
import { f } from './microworld.js';

export function chlorineScene() {
  const FILM = 5, NH2O = 7, NCL = 6, MAXMADE = 3;
  let wet = false, made = 0;
  const rx = {
    in: ['Cl2', 'H2O'], out: ['HClO', 'H+', 'Cl-'], host: 1, at: [0.2, 0.2, 0],
    near: [[1.5, 0.9, 0], null], place: [[-0.9, 0.5, 0], [1.3, -0.2, 0.4], [0.7, 1.2, -0.4]],
    // HClO 的 O、H、Cl：水里的 O 和一个 H、Cl₂ 的第一个 Cl；H⁺：水的另一个 H；Cl⁻：Cl₂ 的第二个 Cl
    map: [[1, 0], [1, 1], [0, 0], [1, 2], [0, 1]],
    approach: 1.6, dur: 2.4, burst: [0xe8f08a, 0xc9a8f5],
  };
  // 逆过来（离开了氯气，宏观里次氯酸变少）：HClO + H⁺ + Cl⁻ → Cl₂ + H₂O，原子、电荷守恒；Cl₂ 回到气体里
  const back = {
    in: ['HClO', 'H+', 'Cl-'], out: ['Cl2', 'H2O'], host: 0, at: [0, 0.3, 0],
    near: [null, [1.2, 0.3, 0], [-1.2, 0.3, 0]], place: [[0, 1.6, 0], [0, -0.3, 0]],
    map: [[0, 2], [2, 0], [0, 0], [0, 1], [1, 0]],          // Cl₂：HClO 的 Cl、Cl⁻；H₂O：HClO 的 O、H，H⁺
    after: [{ gas: true }, {}], approach: 1.4, dur: 2.2,
  };
  let undoing = false;
  return {
    labels: (k) => k === 'Cl2' || k === 'HClO' || k === 'H+' || k === 'Cl-', dim: 0.6,
    init(c, st) {
      wet = !!st.wet; made = 0; undoing = false;
      c.view.film = wet ? FILM : 0.02; c.view.paper = wet ? null : 0xf1dcd8; c.view.liquid = 0xcfe6ee;
      const n = Math.round(NCL * st.c);
      for (let i = 0; i < n; i++) c.add('Cl2', c.inGas(), { gas: true });
      if (wet) {
        made = Math.min(MAXMADE, Math.round(st.hn * MAXMADE));
        for (let i = 0; i < NH2O - made; i++) c.add('H2O', c.inLiquid());
        for (let i = 0; i < made; i++) { c.add('HClO', c.inLiquid()); c.add('H+', c.inLiquid()); c.add('Cl-', c.inLiquid()); }
      }
    },
    step(c, st, dt) {
      c.view.film = wet ? FILM : 0.02; c.view.paper = wet ? null : 0xf1dcd8;
      // 瓶里的氯气源源不断：被用掉的从上面补上，浓度低了就少几个
      const want = Math.round(NCL * st.c), have = c.mols.filter((m) => m.kind === 'Cl2' && !m.busy && !m.leaving).length;
      if (have < want && !c.events.length ? Math.random() < dt * 2 : false) c.add('Cl2', c.V([c.rnd(-3, 3), c.BOX.top, c.rnd(-3, 3)]), { gas: true });
      if (have > want) { const m = c.free('Cl2')[0]; if (m) m.fadeOut = true; }
      if (!wet) return;
      const goal = Math.min(MAXMADE, Math.round(st.hn * MAXMADE));
      for (const m of c.mols) m.pull = m.kind === 'Cl2' && m.gas && !m.busy ? c.V([0, -1.2, 0]) : null;      // 氯气不停地碰到水面、溶进去
      if (made < goal && !c.events.length) {
        const cl = c.free('Cl2').sort((a, b) => a.g.position.y - b.g.position.y)[0], w = cl && c.nearest(c.free('H2O'), cl.g.position);
        if (cl && w && c.start(rx, [cl, w], { then: (ms) => { ms.forEach((m) => { m.gas = false; }); } })) made++;
      }
      if (made > goal && !c.events.length) {          // 宏观里次氯酸少了：成组地变回 Cl₂ 和 H₂O
        const a = c.free('HClO')[0], hp = a && c.nearest(c.free('H+'), a.g.position), cm = a && c.nearest(c.free('Cl-'), a.g.position);
        if (a && hp && cm && c.start(back, [a, hp, cm], { then: () => { undoing = false; } })) { made--; undoing = true; }
      }
    },
    text(c, st) {
      const eq = `${f('Cl2')} + ${f('H2O')} ⇌ ${f('H+')} + ${f('Cl-')} + ${f('HClO')}`, e = c.events[0];
      if (!wet) return { eq: '', on: false, cap: `表面是干的：${f('Cl2')} 在上面飞来飞去，<b>没有水可以反应</b>，纸条的颜色不会变。${st.c < 0.05 ? '（周围也没有氯气了）' : ''}` };
      if (st.c < 0.05 && !made) return { eq, on: false, cap: '周围没有氯气：什么也不会生成。' };
      if (e && undoing) return { eq, on: true, cap: `周围的氯气没有了：${f('HClO')} 和 ${f('H+')}、${f('Cl-')} 又结合回 ${f('Cl2')} 和 ${f('H2O')}（可逆反应），${f('Cl2')} 跑回气体里。` };
      if (e) return { eq, on: true, cap: `溶在水里的 ${f('Cl2')} 和 ${f('H2O')} 反应：一个 Cl 成了 ${f('Cl-')}，另一个和水里的 O、H 一起成了 ${f('HClO')}，水的另一个 H 成了 ${f('H+')}（${f('H+')} 和 ${f('Cl-')} 就是课本里的 HCl）。` };
      if (made) return { eq, on: true, cap: `生成了 ${f('HClO', made)}（<b>次氯酸</b>，有强氧化性）。它能使色素褪色——起漂白作用的是 ${f('HClO')}，不是 ${f('Cl2')}。只有一部分氯气发生反应，所以用 ⇌。<b>慢放示意，不表示真实的反应步骤。</b>` };
      return { eq, on: true, cap: `表面有水：${f('Cl2')} 溶进水里，就要和水分子反应。` };
    },
  };
}
