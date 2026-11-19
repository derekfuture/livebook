// 氨溶于水的喷泉实验（fountain）的微观场景：烧瓶里的氨分子溶进水里。
// st：{ water: 瓶里有水了没有, gas: 瓶里还剩的氨（相对一开始，0~1）, dis: 已经溶进水里的氨（0~1）, air: 瓶里的空气（相对烧瓶容积，0~1）, red: 溶液里有酚酞、显碱性 }
// 课本第 14 页：氨溶于水时，会与水结合成一水合氨（NH₃·H₂O），一水合氨中有一小部分电离形成 NH₄⁺ 和 OH⁻。
//   NH₃ + H₂O ⇌ NH₃·H₂O ⇌ NH₄⁺ + OH⁻
// 照初中红磷燃烧、高中钠燃烧的做法：分子少，一次演一个反应，只标代表，每种粒子各待各的位置。
// 画 3 个 NH₃（上面一排）。瓶里的氨溶进去一份，就有一个 NH₃ 落到水面正中、翻过来（孤电子对朝下），N 贴到一个水分子的 H 上——一水合氨；
//   随后它游到后面自己的位置上，把水面正中让给下一个。第二个溶进去的，当场电离（“一小部分”）：水那边的 H 移到 N 上成了 NH₄⁺，剩下的 O、H 是 OH⁻。
// 原子守恒：NH₃·H₂O 的 N、3 个 H 来自 NH₃，O、2 个 H 来自 H₂O；电离时那个 H 交给 N（NH₄⁺），剩下 OH⁻。电荷 0 = +1 − 1。
// 打开时如果水已经进来了：从水刚进来那一刻演起，一组接一组，最多演到现在的进度（宏观里几秒就溶完了，这里慢放）。
// 个数、快慢只是示意（实际 1 体积水能溶解约 700 体积氨，电离的只是一小部分）。
import * as THREE from 'three';
import { f } from './microworld.js';
import { spread, homeTo } from './microlayout.js';

export function fountainScene() {
  const FILM = 4.4, NG = 3, NW = 2, Y_GAS = 7.8;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const QI = new THREE.Quaternion(), QF = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0));          // 摆正；上下翻过来
  const S = V3(0, FILM, 1.4);          // 水面正中靠前：在这里溶进去
  const P = (x, y, z = 0) => S.clone().add(V3(x, y, z));
  // NH₃ 从上面落到水面，翻过来（三个 H 朝上、孤电子对朝下）；水分子在它正下方，一个 H 朝上对着 N
  const DIS = { k: 'dis', in: ['NH3', 'H2O'], out: ['NH3H2O'], host: -1, approach: 1.4, dur: 1.5, burst: [0x9fe0c0, 0xbfe6ff],
    atAbs: () => P(0, -1.4), nearAbs: (m, i) => (i === 0 ? P(0, 1.6) : P(0.38, -3.3)), placeAbs: () => [P(0, -0.6)],
    map: [[0, 0], [0, 1], [0, 3], [0, 2], [1, 0], [1, 1], [1, 2]], after: [{}], rot: [QF, QI] };          // 翻过来以后后两个 H 前后对调
  // 电离：水那边对着 N 的 H 移到 N 上（NH₄⁺），剩下的 O、H（OH⁻）离开一点
  const ION = { k: 'ion', in: ['NH3H2O'], out: ['NH4+', 'OH-'], host: 0, approach: 0.3, dur: 2.0, burst: [0xffb0d0, 0x9fc8ff], glow: true,
    placeAbs: (ms) => { const p = ms[0].g.position; return [p.clone(), p.clone().add(V3(-0.9, -3.0, 1.2))]; },
    map: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 5], [0, 4], [0, 6]], after: [{}, {}] };
  // 每种粒子各有各的位置（水面正中留给反应）；号数最小的位置上的那个是代表（标化学式）
  const ring = (y, pts) => pts.map(([x, z]) => V3(x, y, z));
  const SLOTS = {
    NH3: ring(Y_GAS, [[-3.2, -1.0], [0, -1.8], [3.2, -1.0]]),
    NH3H2O: ring(3.7, [[-1.6, -3.4], [1.8, -3.2], [4.2, -1.6]]),
    H2O: ring(1.4, [[-2.6, 1.4], [2.6, 1.4]]),
    'NH4+': ring(3.0, [[4.6, 1.6]]),
    'OH-': ring(1.6, [[-4.6, 1.2]]),
  };
  const seat = (list, k) => {
    const used = new Set(list.filter((m) => m.slot != null).map((m) => m.slot));
    for (const m of list) if (m.slot == null) {
      let best = -1, bd = 1e9; SLOTS[k].forEach((q, i) => { if (used.has(i)) return; const d = q.distanceTo(m.g.position); if (d < bd) { bd = d; best = i; } });
      if (best >= 0) { m.slot = best; used.add(best); }
    }
    const lo = Math.min(...list.map((m) => m.slot ?? 99));
    for (const m of list) m.rep = m.slot === lo;
  };
  const airWant = (st) => Math.min(3, Math.round(6 * Math.max(0, st.air || 0)));
  const addAir = (c, k) => c.add(k % 3 === 2 ? 'O2' : 'N2', c.inGas(), { gas: true });
  let made = 0, ionized = false, wait = 0, busyNow = false, dots = new Map();
  // 一水合氨里 N 和水分子的那个 H 靠在一起：画三个小点连着（点线，不是化学键）
  const dotGeo = new THREE.SphereGeometry(0.1, 8, 6);
  const hb = (c) => {
    for (const [m, ds] of dots) if (!c.mols.includes(m)) { ds.forEach((d) => { c.layer.remove(d); d.material.dispose(); }); dots.delete(m); }
    for (const m of c.mols) {
      if (m.kind !== 'NH3H2O') continue;
      if (!dots.has(m)) { const ds = [0, 1, 2].map(() => { const d = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: 0x8a93a3, transparent: true })); c.layer.add(d); return d; }); dots.set(m, ds); }
      const w = (a) => a.position.clone().applyQuaternion(m.g.quaternion).add(m.g.position), n = w(m.atoms[0]), h = w(m.atoms[5]);
      dots.get(m).forEach((d, i) => { d.position.copy(n).lerp(h, 0.28 + i * 0.22); d.visible = m.g.visible; d.material.opacity = m.dimK; });
    }
  };
  const goal = (st) => (st.water ? Math.min(NG, Math.round(NG * Math.max(0, Math.min(1, st.dis)))) : 0);
  const upright = (m) => { m.g.rotation.set(0, 0, 0); m.w.set(0, 0, 0); };          // 一水合氨、NH₄⁺ 不翻滚：看得清 N 和水分子的 H 贴在一起
  return {
    dim: 0.35,
    labels: (k, m) => !!m.rep || k === 'N2' || k === 'O2', labelOnly: (k, m) => (busyNow ? m.busy : !!m.rep || ((k === 'N2' || k === 'O2') && m === m.first)),
    init(c, st) {
      made = 0; ionized = false; wait = 0.8; busyNow = false; dots = new Map();          // 重来时引擎已经清掉了 layer
      c.view.film = st.water ? FILM : 0; c.view.paper = null; c.view.liquid = st.red ? 0xf0a0c4 : 0xb4dcef;
      // 水进来以后：从水刚进来那一刻演起（瓶里的氨还都在）
      const n0 = Math.round(NG * Math.max(0, Math.min(1, st.water ? st.gas + st.dis : st.gas)));
      for (let i = 0; i < n0; i++) { const m = c.add('NH3', SLOTS.NH3[i].clone().add(V3(c.rnd(-0.3, 0.3), c.rnd(-0.3, 0.3), 0)), { gas: true }); m.slot = i; }
      for (let i = 0; i < airWant(st); i++) addAir(c, i);
      if (st.water) for (let i = 0; i < NW; i++) { const m = c.add('H2O', SLOTS.H2O[i].clone()); m.slot = i; }
    },
    step(c, st, dt) {
      c.view.paper = null; c.view.film = st.water ? FILM : 0;
      c.view.liquid = st.red ? 0xf0a0c4 : 0xb4dcef;
      // 空气（塞子没塞紧时漏进来的）：个数跟着宏观的量走；N₂、O₂ 在水里溶解度很小，不画它们溶解
      const air = c.mols.filter((x) => (x.kind === 'N2' || x.kind === 'O2') && !x.fadeOut), aw = airWant(st);
      if (air.length < aw) { const m = addAir(c, air.length); m.g.position.y = c.BOX.top; m.v.set(0, -2, 0); }
      else if (air.length > aw) air[0].fadeOut = true;
      const a1 = c.mols.find((x) => (x.kind === 'N2' || x.kind === 'O2') && !x.fadeOut); for (const x of c.mols) x.first = a1;
      wait -= dt;
      if (st.water && !c.events.length && wait <= 0) {
        // 一小部分电离：第二个一水合氨刚生成，就在水面正中电离
        if (made >= 2 && !ionized && c.free('NH3H2O').some((m) => m.fresh)) {
          const m = c.free('NH3H2O').find((q) => q.fresh);
          c.start(ION, [m], { then: (ps) => { ionized = true; wait = 1.4; ps.forEach(upright); ps[0].g.rotation.set(0, 0, 0); } });
        }
        // 溶进去：宏观里溶进去一份，就有一个 NH₃ 落到水面正中，和水分子结合
        else if (made < goal(st)) {
          const a = c.free('NH3').filter((m) => m.gas).sort((p, q) => (p.rep ? 1 : 0) - (q.rep ? 1 : 0) || p.g.position.distanceTo(S) - q.g.position.distanceTo(S))[0];
          const w = c.nearest(c.free('H2O').filter((m) => !m.fadeIn), P(0, -3.3));
          if (a && w) c.start(DIS, [a, w], { then: (ps) => { made++; wait = made === 2 && !ionized ? 0.6 : 2.0; ps.forEach((m) => { upright(m); m.fresh = true; }); } });
        }
      }
      for (const m of c.mols) if (m.fresh && m.kind === 'NH3H2O' && (!st.water || made !== 2 || ionized) && wait < 1.4) m.fresh = false;          // 刚生成的先在正中停一下，再游开
      // 溶液里水很多：用掉的水分子从旁边补上
      if (st.water && c.free('H2O').length + c.events.filter((e) => e.rx === DIS).length < NW && Math.random() < dt * 1.5) c.add('H2O', V3(c.rnd(-3, 3), 1.4, -4.2), { fadeIn: true, dimK: 0 });
      // 反应的分子：转到要的方向（看得清哪个原子贴到哪儿）
      for (const e of c.events) e.mols.forEach((m, i) => { if (e.rx.rot?.[i] && !e.temp) m.g.quaternion.slerp(e.rx.rot[i], Math.min(1, dt * 3)); });
      busyNow = c.events.length > 0;
      hb(c);
      // 摆开：每个粒子往自己的位置上靠，不叠在一起；刚生成的一水合氨先在正中停一下
      const free = c.mols.filter((m) => !m.busy && !m.fixed && !m.leaving);
      spread(free.filter((m) => m.gas), 2.4, dt); spread(free.filter((m) => !m.gas && !m.fresh), 2.6, dt);
      for (const k of Object.keys(SLOTS)) seat(free.filter((m) => m.kind === k && !m.fadeOut && (k !== 'NH3' || m.gas)), k);
      for (const m of free) {
        if (m.fresh) { m.v.multiplyScalar(0.5); m.pull = null; continue; }
        m.pull = null;
        if (SLOTS[m.kind] && m.slot != null && !m.fadeOut) homeTo(m, SLOTS[m.kind][m.slot], 1.6);
        if (m.kind === 'NH3H2O' || m.kind === 'NH4+') m.v.multiplyScalar(Math.pow(0.3, dt));          // 一水合氨、NH₄⁺ 慢慢游，不乱晃
      }
    },
    text(c, st) {
      const eq = `${f('NH3')} + ${f('H2O')} ⇌ ${f('NH3H2O')} ⇌ ${f('NH4+')} + ${f('OH-')}`;
      const e = c.events[0], moving = e && e.t >= e.A, left = c.mols.filter((m) => m.kind === 'NH3' && m.gas).length;
      const airTxt = airWant(st) ? '（还有一点空气 N₂、O₂：在水里溶解度很小，不画它们溶解）' : '';
      const SHOW = '<b>慢放示意</b>，不表示真实的反应步骤；个数也是示意（1 体积水约溶解 700 体积氨，电离的只是一小部分）。';
      if (!st.water) return { eq, on: false, cap: `烧瓶里充满了 ${f('NH3')}${airTxt}。还没有水。` };
      if (e?.rx === DIS) return { eq, on: true, cap: moving ? `${f('NH3')} 的 N 贴到水分子的一个 H 上（点线：靠在一起，不是化学键）：结合成<b>一水合氨 ${f('NH3H2O')}</b>——这个 ${f('NH3')} 溶进了水里。` : `一个 ${f('NH3')} 落到水面上，翻过来，N 对着一个水分子……` };
      if (e?.rx === ION) return { eq, on: true, cap: `一水合氨中有<b>一小部分电离</b>：水那边的 H 移到 N 上，成了 ${f('NH4+')}；剩下的 O 和 H 是 ${f('OH-')}。` };
      if (!left && made) return { eq, on: true, cap: `瓶里的氨几乎都溶进了水里${airTxt}：气体少了，<b>瓶内压强骤减</b>，外面的大气压把烧杯里的水压进烧瓶。溶液里有 ${f('OH-')}，显弱碱性${st.red ? '，酚酞变红' : ''}。${SHOW}` };
      if (made) return { eq, on: true, cap: `瓶里还剩 <b>${left}</b> 个 ${f('NH3')}（原来 ${NG} 个）：氨溶进水里，瓶里的气体越来越少，<b>压强越来越小</b>。${SHOW}` };
      return { eq, on: true, cap: `水进了烧瓶：${f('NH3')} 就要溶进水里了。` };
    },
  };
}
