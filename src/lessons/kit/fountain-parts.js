// 氨溶于水的喷泉实验（fountain）的微观场景：烧瓶里的氨分子溶进水里。
// st：{ water: 瓶里有水了没有, gas: 瓶里还剩的氨（相对一开始，0~1）, dis: 已经溶进水里的氨（0~1）, air: 瓶里的空气（相对烧瓶容积，0~1）, red: 溶液里有酚酞、显碱性 }
// 课本第 14 页：氨溶于水时，会与水结合成一水合氨（NH₃·H₂O），一水合氨中有一小部分电离形成 NH₄⁺ 和 OH⁻。
//   NH₃ + H₂O ⇌ NH₃·H₂O ⇌ NH₄⁺ + OH⁻
// 画 6 个 NH₃：瓶里的氨少一份，就有一个 NH₃ 落到液面、和一个水分子结合成 NH₃·H₂O；溶进去两个以后，其中一个电离（“一小部分”）。
// 原子守恒：NH₃·H₂O 的 N、3 个 H 来自 NH₃，O、2 个 H 来自 H₂O；电离时水那一边的一个 H 交给 N（NH₄⁺），剩下 O、H 是 OH⁻。电荷 0 = +1 − 1。
// 个数、快慢只是示意（实际 1 体积水能溶解约 700 体积氨）。
import { f } from './microworld.js';

export function fountainScene() {
  const FILM = 4.6, NG = 6, NW = 6;
  const DIS = { in: ['NH3', 'H2O'], out: ['NH3H2O'], host: 1, at: [0, 0.3, 0], near: [[0, 2.4, 0], null], place: [[0, -0.6, 0]],
    map: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [1, 1], [1, 2]], after: [{}], approach: 1.2, dur: 1.8, burst: [0x9fe0c0, 0xbfe6ff] };
  const ION = { in: ['NH3H2O'], out: ['NH4+', 'OH-'], host: 0, place: [[-0.9, 0, 0], [1.9, 0.5, 0]],
    map: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 5], [0, 4], [0, 6]], after: [{}, {}], approach: 0, dur: 2.2, burst: [0xffb0d0, 0x9fc8ff] };
  const want = (st) => (st.water ? Math.min(NG, Math.round(NG * Math.max(0, Math.min(1, st.dis)))) : 0);
  const nEv = (c, rx) => c.events.filter((e) => e.rx === rx).length;
  const dissolved = (c) => c.count('NH3H2O') + c.count('NH4+') + nEv(c, DIS) - nEv(c, ION);
  const airWant = (st) => Math.min(5, Math.round(6 * Math.max(0, st.air || 0)));
  const addAir = (c, k) => c.add(k % 5 === 4 ? 'O2' : 'N2', c.inGas(), { gas: true });
  return {
    labels: (k, m) => k === 'NH4+' || k === 'OH-' || (k === 'NH3' && m.gas), dim: 0.6,
    init(c, st) {
      c.view.film = st.water ? FILM : 0; c.view.paper = null; c.view.liquid = st.red ? 0xf0a0c4 : 0xb4dcef;
      const m = want(st);
      for (let i = 0; i < Math.round(NG * Math.max(0, Math.min(1, st.gas))); i++) c.add('NH3', c.inGas(), { gas: true });
      for (let i = 0; i < airWant(st); i++) addAir(c, i);
      if (!st.water) return;
      for (let i = 0; i < NW; i++) c.add('H2O', c.inLiquid());
      const ion = m >= 2 ? 1 : 0;
      for (let i = 0; i < m - ion; i++) c.add('NH3H2O', c.inLiquid());
      if (ion) { c.add('NH4+', c.inLiquid()); c.add('OH-', c.inLiquid()); }
    },
    step(c, st, dt) {
      c.view.paper = null; c.view.film = st.water ? FILM : 0;
      c.view.liquid = st.red ? 0xf0a0c4 : 0xb4dcef;
      // 瓶里的气体：氨分子、空气分子的个数跟着宏观的量走
      const gasN = c.mols.filter((m) => m.kind === 'NH3' && m.gas && !m.busy).length, gasW = Math.round(NG * Math.max(0, Math.min(1, st.gas)));
      const made = dissolved(c), goal = want(st);
      if (gasN + made < gasW + goal && gasN < gasW) c.add('NH3', c.V([c.rnd(-3, 3), c.BOX.top, c.rnd(-3, 3)]), { gas: true });
      const airN = c.mols.filter((m) => (m.kind === 'N2' || m.kind === 'O2') && !m.fadeOut).length, aw = airWant(st);
      if (airN < aw) { const m = addAir(c, airN); m.g.position.y = c.BOX.top; m.v.set(0, -2, 0); }
      else if (airN > aw) { const m = c.mols.find((x) => (x.kind === 'N2' || x.kind === 'O2') && !x.fadeOut); if (m) m.fadeOut = true; }
      if (!st.water) return;
      // 溶进去：瓶里的氨少一份，就有一个 NH₃ 落到液面、和水分子结合
      for (const m of c.mols) m.pull = m.kind === 'NH3' && m.gas && !m.busy && made < goal ? c.V([0, -1.4, 0]) : null;
      if (made < goal && c.events.length < 2) {
        const a = c.free('NH3').filter((m) => m.gas).sort((p, q) => p.g.position.y - q.g.position.y)[0], w = a && c.nearest(c.free('H2O'), a.g.position);
        if (a && w) c.start(DIS, [a, w], { then: (ms) => ms.forEach((m) => { m.gas = false; }) });
      }
      // 一小部分电离：溶进去两个以后，其中一个变成 NH₄⁺ 和 OH⁻
      if (c.count('NH3H2O') >= 2 && !c.count('NH4+') && !nEv(c, ION) && !c.events.length) { const m = c.free('NH3H2O')[0]; if (m) c.start(ION, [m]); }
      // 溶液里水很多：用掉的水分子慢慢补上
      if (c.free('H2O').length < NW - 1 && Math.random() < dt * 1.5) c.add('H2O', c.inLiquid(), { fadeIn: true, dimK: 0 });
    },
    text(c, st) {
      const eq = `${f('NH3')} + ${f('H2O')} ⇌ ${f('NH3H2O')} ⇌ ${f('NH4+')} + ${f('OH-')}`;
      const e = c.events[0], made = dissolved(c), left = c.mols.filter((m) => m.kind === 'NH3' && m.gas).length;
      const airTxt = airWant(st) ? '（灰色的是空气里的 N₂、O₂：在水里溶解度很小，这里不画它们溶解）' : '';
      if (!st.water) return { eq, on: false, cap: `烧瓶里是 ${f('NH3')} 分子${airTxt}。还没有水。<b>示意</b>` };
      if (e?.rx === DIS) return { eq, on: true, cap: `${f('NH3')} 碰到水就溶进去，和水分子结合成一水合氨 ${f('NH3H2O')}。氨<b>极易溶于水</b>。<b>示意</b>` };
      if (e?.rx === ION) return { eq, on: true, cap: `一水合氨中有<b>一小部分</b>电离：水那一边的一个 H 交给 N，生成 ${f('NH4+')} 和 ${f('OH-')}。<b>示意</b>` };
      if (made && !left) return { eq, on: true, cap: `瓶里的氨几乎都溶进了水里${airTxt}：气体少了，<b>瓶内压强骤减</b>，外面的大气压把烧杯里的水压进烧瓶。溶液里有 ${f('OH-')}，显弱碱性${st.red ? '，酚酞变红' : ''}。个数只是示意。` };
      if (made) return { eq, on: true, cap: `已经有 ${made} 个 ${f('NH3')} 溶进了水里，瓶里的氨越来越少。个数只是示意（1 体积水约溶解 700 体积氨）。` };
      return { eq, on: true, cap: `水进了烧瓶：${f('NH3')} 就要溶进水里。<b>示意</b>` };
    },
  };
}
