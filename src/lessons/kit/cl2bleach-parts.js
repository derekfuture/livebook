// 氯气漂白活页（cl2bleach）的微观场景：纸条 / 花瓣表面上，氯气分子和水发生什么。
// st：{ wet: 这件东西含水吗, c: 它周围氯气的浓度（0~1）, hn: 它上面的次氯酸（0~1，宏观里算出来的） }
//   干燥：表面没有水，氯气分子在上面飞来飞去，什么也不发生。
//   有水：氯气溶进水里，一部分与水反应 Cl₂ + H₂O ⇌ H⁺ + Cl⁻ + HClO（课本写成 HCl + HClO；HCl 在水里是 H⁺ 和 Cl⁻）。
//   Cl₂ 的两个 Cl 一个进了 HClO，一个成了 Cl⁻；水的 O、一个 H 进了 HClO，另一个 H 成了 H⁺。原子守恒、电荷守恒（0 = 0 + 1 − 1）。
//   慢放示意，不表示真实的反应步骤；这是可逆反应，能同时向两个方向进行（课本第 46 页脚注）。
// 照初中的做法：分子少（上面最多 3 个 Cl₂，水里 3 个 H₂O，最多 2 组生成物），一次只演一个反应；只给代表标化学式，代表各待一块。
// HClO 的组数跟着 hn 走；够数了、周围还有氯气时，一会儿生成一组、一会儿又有一组变回去（可逆，总数不变），画面里一直有反应。
import * as THREE from 'three';
import { f } from './microworld.js';
import { spread, homeTo } from './microlayout.js';

export function chlorineScene() {
  const FILM = 4, NH2O = 3, NCL = 3, MAXMADE = 2;
  const HOME = { HClO: new THREE.Vector3(-3.4, 2.1, 1.2), 'H+': new THREE.Vector3(0.2, 2.1, 2.6), 'Cl-': new THREE.Vector3(3.4, 2.1, 1.2), H2O: new THREE.Vector3(0.2, 2.1, -2.8) };
  let wet = false, mode = '', pause = 0, labKinds = new Set();
  const rx = {
    in: ['Cl2', 'H2O'], out: ['HClO', 'H+', 'Cl-'], host: 1, at: [0.2, 0.2, 0],
    near: [[1.5, 0.9, 0], null], place: [[-1.4, 0.3, 0.6], [1.6, -0.1, 1.0], [1.3, 0.5, -1.4]],
    // HClO 的 O、H、Cl：水里的 O 和一个 H、Cl₂ 的第一个 Cl；H⁺：水的另一个 H；Cl⁻：Cl₂ 的第二个 Cl
    map: [[1, 0], [1, 1], [0, 0], [1, 2], [0, 1]],
    approach: 1.6, dur: 2.2, burst: [0xe8f08a, 0xc9a8f5],
  };
  // 逆过来：HClO + H⁺ + Cl⁻ → Cl₂ + H₂O，原子、电荷守恒；Cl₂ 回到气体里
  const back = {
    in: ['HClO', 'H+', 'Cl-'], out: ['Cl2', 'H2O'], host: 0, at: [0, 0.3, 0],
    near: [null, [1.2, 0.3, 0.4], [-1.2, 0.3, -0.4]], place: [[0, 1.8, 0], [0, -0.3, 0]],
    map: [[0, 2], [2, 0], [0, 0], [0, 1], [1, 0]],          // Cl₂：HClO 的 Cl、Cl⁻；H₂O：HClO 的 O、H，H⁺
    after: [{ gas: true }, {}], approach: 1.4, dur: 2.0,
  };
  const markRep = (c, kind) => { if (c.mols.some((m) => m.kind === kind && m.rep)) return; const m = c.free(kind).filter((q) => kind !== 'Cl2' || q.gas)[0]; if (m) m.rep = true; };
  const reps = (c) => { markRep(c, 'Cl2'); if (wet) for (const k of ['H2O', 'HClO', 'H+', 'Cl-']) markRep(c, k); };
  const goForward = (c) => {
    const cl = c.free('Cl2').filter((m) => m.gas).sort((a, b) => (a.rep ? 1 : 0) - (b.rep ? 1 : 0) || a.g.position.y - b.g.position.y)[0];
    const w = cl && c.free('H2O').filter((m) => !m.rep && !m.fadeIn).sort((a, b) => a.g.position.distanceTo(cl.g.position) - b.g.position.distanceTo(cl.g.position))[0];
    if (!cl || !w) return false;
    cl.lab = w.lab = true;
    return !!c.start(rx, [cl, w], { then: (ms) => { ms.forEach((m) => { m.gas = false; m.labelK = 0; m.labelT = null; }); pause = mode === 'eq' ? 1.6 : 1.2; reps(c); } });
  };
  const goBack = (c) => {
    const a = c.free('HClO').sort((p, q) => (p.rep ? 1 : 0) - (q.rep ? 1 : 0))[0];
    const pick = (k) => a && c.free(k).sort((p, q) => (p.rep ? 1 : 0) - (q.rep ? 1 : 0) || p.g.position.distanceTo(a.g.position) - q.g.position.distanceTo(a.g.position))[0];
    const hp = pick('H+'), cm = pick('Cl-');
    if (!a || !hp || !cm) return false;
    a.lab = true;
    return !!c.start(back, [a, hp, cm], { then: (ms) => { ms.forEach((m) => { m.labelK = 0; m.labelT = null; }); mode = ''; pause = 3; reps(c); } });
  };
  return {
    dim: 0.5,
    labels: (k, m) => !!m.rep, labelOnly: (k, m) => (!!m.rep && !m.busy && !labKinds.has(k)) || (!!m.lab && m.busy),          // 只标代表；反应时只标参加的 Cl₂、H₂O（逆反应只标 HClO），同一种的代表先不标
    init(c, st) {
      wet = !!st.wet; mode = ''; pause = 0.8;
      c.view.film = wet ? FILM : 0.02; c.view.paper = wet ? null : 0xf1dcd8; c.view.liquid = 0xcfe6ee;
      const n = Math.round(NCL * st.c);
      for (let i = 0; i < n; i++) c.add('Cl2', c.V([-3 + i * 3 + c.rnd(-0.5, 0.5), c.rnd(FILM + 1.6, 8), c.rnd(-2, 1)]), { gas: true });
      if (wet) {
        const made = Math.min(MAXMADE, Math.round(st.hn * MAXMADE));
        for (let i = 0; i < NH2O; i++) c.add('H2O', c.V([-2.4 + i * 2.4, c.rnd(1.4, 2.8), c.rnd(-2.4, -0.4)]));
        for (let i = 0; i < made; i++) for (const k of ['HClO', 'H+', 'Cl-']) c.add(k, HOME[k].clone().add(c.V([c.rnd(-1, 1) - i * 0.4, c.rnd(-0.4, 0.4), c.rnd(-1, 1) - i * 1.2])));
      }
      reps(c);
    },
    step(c, st, dt) {
      c.view.film = wet ? FILM : 0.02; c.view.paper = wet ? null : 0xf1dcd8;
      labKinds = new Set(c.events.flatMap((e) => e.mols.filter((m) => m.lab).map((m) => m.kind)));
      // 瓶里的氯气源源不断：被用掉的从上面补上，浓度低了就少几个
      const want = Math.round(NCL * st.c), gas = c.mols.filter((m) => m.kind === 'Cl2' && m.gas && !m.busy && !m.leaving && !m.fadeOut);
      if (gas.length < want && !c.events.length && Math.random() < dt * 2) c.add('Cl2', c.V([c.rnd(-3, 3), c.BOX.top, c.rnd(-2, 1)]), { gas: true });
      if (gas.length > want) { const m = gas.find((q) => !q.rep) || gas[0]; m.fadeOut = true; }
      if (wet) {
        // HClO 的组数跟着 hn 走；够数了、周围还有氯气时：先生成一组，再让另一组变回去（可逆反应两个方向都在进行，HClO 的个数不变）
        const goal = Math.min(MAXMADE, Math.round(st.hn * MAXMADE)), nH = c.count('HClO');
        pause -= dt;
        if (!c.events.length && pause <= 0) {
          if (nH < goal) { if (goForward(c)) mode = 'fwd'; }
          else if (nH > goal) { const eqBack = mode === 'eq'; if (goBack(c)) mode = eqBack ? 'eqback' : 'back'; }
          else if (goal > 0 && st.c > 0.3) { if (goForward(c)) mode = 'eq'; }
        }
        // 水是过量的：这一小块里一直有 3 个水分子（远处的水游过来）；多了就游走
        const ws = c.free('H2O');
        if (ws.length < NH2O && !c.events.length) c.add('H2O', c.V([c.rnd(-3, 3), FILM - 0.8, c.rnd(-2.6, -1)]), { fadeIn: true, dimK: 0 });
        if (ws.length > NH2O + 1) { const m = ws.find((q) => !q.rep); if (m) m.fadeOut = true; }
      }
      // 气体里的 Cl₂ 往水面飘（溶进去）；粒子不叠在一起；代表各待一块
      for (const m of c.mols) if (m.kind === 'Cl2') m.pull = m.gas && !m.busy && wet ? c.V([0, -0.8, 0]) : null;
      const liq = c.mols.filter((m) => !m.busy && !m.fixed && !m.leaving && !m.gas), air = c.mols.filter((m) => !m.busy && m.gas && !m.leaving);
      spread(liq, 2.7, dt); spread(air, 4.6, dt);
      for (const m of liq) if (m.rep && HOME[m.kind]) homeTo(m, HOME[m.kind]);
    },
    text(c, st) {
      const eq = `${f('Cl2')} + ${f('H2O')} ⇌ ${f('H+')} + ${f('Cl-')} + ${f('HClO')}`, e = c.events[0];
      const nH = c.count('HClO');
      if (!wet) return { eq: '', on: false, cap: `表面是干的：${f('Cl2')} 在上面飞来飞去，<b>没有水可以反应</b>，纸条的颜色不会变。${st.c < 0.05 ? '（周围也没有氯气了）' : ''}` };
      if (e && e.rx === back && mode !== 'eqback') return { eq, on: true, cap: `周围的氯气少了：${f('HClO')} 和 ${f('H+')}、${f('Cl-')} 又结合回 ${f('Cl2')} 和 ${f('H2O')}（可逆反应），${f('Cl2')} 跑回气体里。` };
      if (e && e.rx === back) return { eq, on: true, cap: `反过来的反应也在进行：一个 ${f('HClO')} 和 ${f('H+')}、${f('Cl-')} 又结合回 ${f('Cl2')} 和 ${f('H2O')}——可逆反应能同时向两个方向进行（课本第 46 页脚注），${f('HClO')} 的个数不变。` };
      if (st.c < 0.05 && !nH) return { eq, on: false, cap: `周围没有氯气了，水里的 ${f('HClO')}、${f('H+')}、${f('Cl-')} 已经变回 ${f('Cl2')} 和 ${f('H2O')}：离开氯气，反应往回走，稳定下来的是没有 ${f('HClO')} 的状态。` };
      if (e) return { eq, on: true, cap: `一个 ${f('Cl2')} 溶进水里，和一个 ${f('H2O')} 反应：一个 Cl 成了 ${f('Cl-')}，另一个和水里的 O、H 一起成了 ${f('HClO')}，水的另一个 H 成了 ${f('H+')}（${f('H+')} 和 ${f('Cl-')} 就是课本里的 HCl）。` };
      if (nH) return { eq, on: true, cap: `水里有 ${f('HClO')}（<b>次氯酸</b>，有强氧化性）。它能使色素褪色——起漂白作用的是 ${f('HClO')}，不是 ${f('Cl2')}。<b>慢放示意，不表示真实的反应步骤。</b>` };
      return { eq, on: true, cap: `表面有水：${f('Cl2')} 溶进水里，就要和水分子反应。` };
    },
  };
}
