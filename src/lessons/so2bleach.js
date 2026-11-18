// 人教版高中化学必修第二册第 4 页【实验5-2】：用试管取 2 mL 在实验5-1 中得到的溶液（SO₂ 的水溶液），向其中滴入 1~2 滴品红溶液，振荡，观察溶液的颜色变化。
//   然后加热试管，注意通风，再观察溶液的变化。（图5-3：红色的品红滴进去，变成无色。）
// 课本结论：二氧化硫具有漂白作用……它能与某些有色物质生成不稳定的无色物质。这些无色物质容易分解而使有色物质恢复原来的颜色。
// 加热：试管夹夹住试管中上部，试管和桌面约成 45°，用酒精灯外焰加热，管口不对着人（初中“给物质加热”；kit/tubeheat.js）。
// 注意通风：课本实验图标里的“排风”——背景里一台排风扇，加热时转起来，把管口逸出的 SO₂ 抽走（不是要操作的器材）。
// 模型（示意，界面上写明）：
//   · 溶液：实验5-1 的试管充满 SO₂、水充满试管，约 1 体积气体溶在 1 体积水里 → 0.04 mol/L；2 mL 里 SO₂ 约 0.08 mmol。
//   · 品红：一滴 0.05 mL，量极少（约 10⁻⁷ mol）——远少于 SO₂。红色的品红 + SO₂ ⇌ 无色物质：平衡时还是红色的占 1/(1 + K·c)，
//     K 随温度升高变小（按放热算，示意值 K₀ = 5000 L/mol，ΔH = −60 kJ/mol，只保证趋势：冷时褪色，热时红色回来）。
//   · SO₂ 受热从溶液里逸出：冷时很慢，越热越快（示意）。SO₂ 是无色、有刺激性气味的有毒气体（课本第 2 页）。
//   · 红色深浅 = 还没变成无色物质的那部分品红（滴得多，褪不干净）；颜色变化的快慢示意：不振荡时品红还是一缕缕的，变得慢。
//   · 酒精灯加热 2 mL 水约 30 秒到 100 ℃（示意），画面里时间加快 2 倍；撤火后慢慢冷却，SO₂ 还在的话，无色物质又会生成，红色又褪去。
//   · 逸出的 SO₂ 画成青色小点（示意色：SO₂ 无色；青色不和蓝 = 氧气、橙 = 热、黄绿 = 氯气、绿 = 氨、紫 = 次氯酸、深灰 = 二氧化碳冲突）。
import * as THREE from 'three';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs, mountXuean, moreBox, varyBox } from './kit/chemlesson.js';
import { draggable } from './kit/interact.js';
import { tubeBench } from './kit/tubebench.js';
import { tubeHeat } from './kit/tubeheat.js';
import { chemLamp } from './kit/chem.js';
import { lampCap } from './kit/labops.js';
import { micro, so2bleachScene } from './kit/microworld.js';
import { Particles } from './kit/fx.js';
import { sfx } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const DROP = 0.05, SO2_0 = 0.08, K0 = 5000, DH_R = 7217;          // mL；mmol；L/mol；60 kJ/mol ÷ R
const SPEED = 2;                                                     // 时间加快 2 倍（化学、温度、SO₂ 逸出）
const X0 = -0.05, XL = 0.045, BOT = V(-0.105, 0, 0.012);
const FLAME = V(XL, 0.076, 0);                                       // 试管最低点放在这里：酒精灯火焰的上部（外焰）
const FAN = V(0.172, 0, -0.062), FAN_C = FAN.clone().setY(0.052);   // 排风扇（背景）和它的进风口中心
const SO2C = 0x1597a8;                                               // 逸出的 SO₂：青色（示意色）
const CLEAR = new THREE.Color(0xe6eef2), PINK = new THREE.Color(0xd9367e);

export default {
  id: 'so2bleach',
  fig: '图5-3',
  title: '二氧化硫的漂白作用',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '向 SO₂ 的水溶液里滴入品红溶液，红色的品红会怎样？再加热试管呢？',
    hint: '课本第 4 页【实验5-2】。先猜，再动手。',
    options: ['红色褪去；加热后红色又出现', '红色褪去；加热后一直无色', '一直是红色'],
    answer: 0,
  },
  need: '用试管取 2 mL SO₂ 的水溶液，滴入 1~2 滴品红溶液，振荡，观察颜色；然后加热试管（注意通风），再观察',
  conclusion: {
    crops: [{ page: 8, rect: [220, 158, 530, 244] }],
    quote: '二氧化硫具有漂白作用，工业上常用二氧化硫来漂白纸浆、毛、丝等。二氧化硫的漂白作用是由于它能与某些有色物质生成不稳定的无色物质。这些无色物质容易分解而使有色物质恢复原来的颜色。',
    formula: '品红（红色）＋ SO₂ → 不稳定的无色物质　　无色物质 ——受热分解→ 品红（红色）',
    why: '品红溶液滴进 SO₂ 的水溶液，<b>红色褪去</b>：SO₂ 与品红这样的有色物质生成了<b>不稳定的无色物质</b>。加热试管，无色物质<b>分解</b>，品红<b>恢复原来的红色</b>。<br>所以 SO₂ 的漂白作用和“把颜色变没了”不同：它是可以“还回来”的。加热时 SO₂ 还会从溶液里跑出来，它<b>有毒</b>，要通风。',
    src: '课本第 4 页 · 第五章 第一节 硫及其化合物',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };
    paperSheet(group, { w: 0.33, d: 0.15, x: 0.035, z: 0.0 });

    const B = tubeBench(group, {
      tag, look, back, rate: 3, getS: () => S.bench,
      tubes: [{ x: X0, label: 'SO₂ 水溶液', vol: 2, color: 0xe6eef2 }],
      reagents: [{ key: 'dye', name: '品红溶液', at: BOT, inside: 0xd9367e }],
      onDrop: (k, key) => {
        if (key !== 'dye') return;
        if (H.k > 0.3) return status('试管不在试管架上。先点一下<b>试管夹</b>，把试管放回去。');
        S.f = (S.f * S.D + 1) / (S.D + 1); S.D++; S.vol += DROP; S.streak = 1;
        if (S.D === 1) { S.so2AtDrip = S.so2; S.dyeT = S.clock; log(['滴入品红溶液', '品红一缕缕散开，溶液带红色', '品红是有色物质']); }
        done('drip');
      },
    });
    B.drops.mesh.material = new THREE.MeshBasicMaterial({ color: 0xd9367e });
    const tube = B.tubes[0], holder = tube.holder;
    // 橙色的热：试管热了，管壁外一层淡橙
    const halo = new THREE.Mesh(new THREE.CylinderGeometry(0.0103, 0.0103, 0.034, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    halo.position.y = 0.022; halo.renderOrder = 10.2; tube.add(halo);

    // ---- 酒精灯（不动）、灯帽 ----
    const lamp = chemLamp(); lamp.scale.setScalar(0.68); lamp.position.set(XL, 0, 0); group.add(lamp);
    const lampPick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 10), new THREE.MeshBasicMaterial({ visible: false })); lampPick.position.set(0, 0.035, 0); lampPick.userData.pick = true; lamp.add(lampPick);
    const capper = lampCap(group, lamp, { off: V(XL - 0.042, 0, 0.045) });
    let flameOn = false;
    // ---- 试管夹：夹住试管中上部，斜着放到外焰上 ----
    const H = tubeHeat(group, { tube, holder, getS: () => S.heat, flameAt: FLAME, rest: { pos: V(0.088, 0, 0.042), yaw: 0.35 }, liftTo: 0.072, spin: 1.1 });
    // ---- 排风扇（背景，课本实验图标里的“排风”）----
    const fan = new THREE.Group(); fan.position.copy(FAN); fan.rotation.y = -0.45; group.add(fan);
    const fm = paint(0xc3ccd5), dark = paint(0x7d8a97);
    const FS = 0.05, FT = 0.004;
    for (const [w, hh, x, y] of [[FS, FT, 0, FS - FT / 2], [FS, FT, 0, FT / 2], [FT, FS, -FS / 2 + FT / 2, FS / 2], [FT, FS, FS / 2 - FT / 2, FS / 2]]) {
      const b = inked(new THREE.Mesh(new THREE.BoxGeometry(w, hh, 0.012), fm), { width: 0.6 }); b.position.set(x, y + 0.006, 0); fan.add(b);
    }
    const shroud = inked(new THREE.Mesh(new THREE.TorusGeometry(FS / 2 - FT - 0.0015, 0.0012, 6, 32), fm), { width: 0.4 }); shroud.position.set(0, FS / 2 + 0.006, 0.004); fan.add(shroud);
    const foot = inked(new THREE.Mesh(new THREE.BoxGeometry(FS * 0.9, 0.006, 0.024), fm), { width: 0.6 }); foot.position.y = 0.003; fan.add(foot);
    const blades = new THREE.Group(); blades.position.set(0, FS / 2 + 0.006, 0.002); fan.add(blades);
    const hub = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.004, 14), dark), { width: 0.4 }); hub.rotation.x = Math.PI / 2; blades.add(hub);
    for (let i = 0; i < 3; i++) {
      const bl = new THREE.Mesh(new THREE.CircleGeometry(0.0085, 16), paint(0x8f9eae, { unique: true })); bl.scale.set(0.55, 1, 1); bl.position.y = 0.0105;
      const arm = new THREE.Group(); arm.rotation.z = (i * Math.PI * 2) / 3; arm.add(bl); blades.add(arm);
    }
    // ---- 逸出的 SO₂（示意色：青色小点；实际无色）----
    const gas = new Particles({ max: 160, geometry: new THREE.SphereGeometry(1, 8, 6), material: new THREE.MeshBasicMaterial({ color: SO2C, transparent: true, opacity: 0.8, depthWrite: false }) }); gas.mesh.renderOrder = 12; group.add(gas.mesh);

    const fresh = () => ({ demo: false, near: false, lookH: false, bench: B.fresh(), heat: H.fresh(), clock: 0, D: 0, vol: 2, f: 1, so2: SO2_0, so2AtDrip: SO2_0, dyeT: 0, heated: false, T: 22, streak: 0, lit: false, spawn: 0, said: {} });
    S = fresh();
    const kOf = (T) => K0 * Math.exp(DH_R * (1 / (273.15 + T) - 1 / 298.15));
    const feqOf = () => 1 / (1 + kOf(S.T) * (S.so2 / S.vol));
    const pink = () => 1 - Math.exp(-3 * S.D * S.f / S.vol);
    const kescOf = () => 2e-4 * Math.exp((S.T - 25) / 14.3);

    const A = {
      tapLamp() {
        if (!S.lit) { S.lit = true; sfx.whoosh?.({ freq: 500, gain: 0.06, dur: 0.3 }); status(S.heat.goal ? '点燃了酒精灯：试管在外焰上加热。<b>注意通风</b>。' : '点燃了酒精灯。再点一下<b>试管夹</b>：夹住试管，斜着放到外焰上加热（注意通风）。'); return; }
        S.lit = false; status('用灯帽盖灭了酒精灯。');
      },
      tapClamp() {
        const g = H.toggle();
        if (g) status(S.lit ? '试管夹夹住试管的中上部，斜着放到外焰上加热：试管和桌面约成 45°，管口不对着人。<b>注意通风</b>。' : '试管夹夹起了试管。酒精灯还没点燃：点一下<b>酒精灯</b>。');
        else status('试管放回试管架，试管夹放回桌上。试管还是热的：看冷下来以后颜色会不会变。');
      },
      reset() { if (bar.playing) bar.stop(); S = fresh(); sync(); mic.close(); back(); W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; W.ui.relock(); } bar.undo('drip', 'shake', 'heat', 'why'); status('器材重新摆好了：试管里又是新的 SO₂ 水溶液。'); },
    };
    const sync = () => { gas.clear(); B.drops.clear(); capper.snap(S.lit); H.snap(); };
    const drag = draggable(group, [...B.items], { tip: tag('', 'pill'), highlight: true, taps: [
      { obj: lampPick, hint: () => (S.lit ? '酒精灯：点一下，用灯帽盖灭' : '酒精灯：点一下，取下灯帽点燃'), onTap: () => A.tapLamp() },
      { obj: H.pick, hint: () => (S.heat.goal ? '试管夹：点一下，把试管放回试管架' : '试管夹：点一下，夹住试管，斜着放到外焰上加热'), onTap: () => A.tapClamp() },
    ] });
    const act = demoActs(drag, group);
    const off = () => H.k > 0.3;
    const mic = micro({ tag, look, back, group, scene: so2bleachScene(), at: () => (off() ? H.liquidCenter() : holder.position.clone().add(V(0, 0.03, 0))),
      btnAt: () => (H.k > 0.6 ? H.liquidCenter().add(V(-0.045, 0.014, 0)) : holder.position.clone().add(V(0.027, 0.088, 0))), label: '钻进去看',
      state: () => ({ nd: S.D, f: S.f, so2: S.so2 / SO2_0, T: S.T, liquid: 0xcfe3ec }), key: () => String(S.D > 0), show: () => true, bar: () => bar, scale: 0.0042 });

    const NEAR = [[XL + 0.035, 0.102, 0], [0.04, 0.22, 1], 0.33];
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'drip', title: '滴入品红溶液', todo: '把<b>品红溶液</b>的滴管拖到试管口上方，按住滴 1~2 滴；再按住<b>试管</b>左右拖，振荡。', target: () => (S.bench.carry[0] ? null : B.droppers[0]) },
        { id: 'shake', title: '看颜色', todo: '振荡，看溶液的颜色怎么变。', target: () => (S.D > 0 ? tube : null) },
        { id: 'heat', title: '加热试管', todo: '点一下<b>酒精灯</b>点燃，再点一下<b>试管夹</b>：夹住试管，斜着放到外焰上加热。<b>注意通风</b>。再看颜色。', target: () => (!S.lit ? lamp : S.heat.goal ? null : H.clamp) },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { sync(); mic.close(); } }),
          shots: [
            { cap: '试管里是 2 mL SO₂ 的水溶液。滴入 1~2 滴品红溶液：红色一缕缕散开。', dur: 5, speed: 1.4, cam: [[X0, 0.07, 0.01], [0.04, 0.22, 1], 0.26],
              during: B.dripSeq(drag, 0, [[0, () => S.D >= 2]], 0.04, 0.97) },
            { cap: '振荡：红色褪去，溶液变成无色。', dur: 6, speed: 1.5, cam: [[X0, 0.07, 0.01], [0.04, 0.22, 1], 0.26], during: B.wiggle(act, 0, 0.05, 0.6, 6) },
            { cap: '加热试管，注意通风。点燃酒精灯；用试管夹夹住试管的中上部，斜着放到外焰上——试管和桌面约成 45°，管口不对着人。', dur: 7.5, cam: [[0.03, 0.085, 0], [0.04, 0.22, 1], 0.4],
              during: act.seq(act.tap(lampPick, 0.04), act.tap(H.pick, 0.16)) },
            { cap: '接着加热（时间加快）：红色又回来了。管口逸出的 SO₂（青色小点，示意）被排风扇抽走。', dur: 9, speed: 2, cam: NEAR },
            { cap: '钻进去看（示意）：红色的品红分子碰上 SO₂，生成无色物质；加热，无色物质分解，品红恢复。演示完了，换你自己做。', dur: 9, cam: [[XL + 0.02, 0.09, 0], [0.05, 0.22, 1], 0.32],
              enter: () => mic.open(true), during: act.at(0.98, () => mic.close()) },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);
    const col = new THREE.Color();

    const step = (dt, t, rdt) => {
      S.clock += dt;
      B.update(dt, t);
      // ---- 试管夹和试管的姿势（动作按真实速度，不随演示的时间加快）----
      const sf = Math.min(1, S.streak), p0 = pink(), pm = p0 * (1 - 0.7 * sf);
      col.copy(CLEAR).lerp(PINK, pm);
      const boil = clamp((S.T - 98.5) / 1.5);
      H.update(rdt, t, { vol: S.vol, color: col.getHex(), boil });
      if (S.heat.goal === 1 && H.k > 0.85 && !S.demo && !S.lookH) { S.lookH = true; S.near = true; look(...NEAR, () => { S.near = false; }); }
      if (S.heat.goal === 0 && H.k < 0.5 && S.lookH) { S.lookH = false; if (!S.demo && !mic.isOpen) back(); }
      // ---- 热 ----
      const heated = flameOn && H.atFlame();
      if (heated) S.heated = true;
      const cdt = dt * SPEED;                                          // 化学和温度按时间加快算
      S.T = Math.min(100, S.T + ((heated ? 3.0 : 0) - (S.T - 22) / 80) * cdt);
      // ---- 化学：红色 ⇄ 无色物质，SO₂ 逸出 ----
      S.streak = Math.max(0, S.streak - (0.08 + B.shakeE(0) * 1.4) * dt);
      const mixK = 0.3 + 0.7 * (1 - Math.min(1, S.streak)), kobs = 1.0 * mixK * Math.exp((S.T - 25) / 30);
      S.f += (feqOf() - S.f) * (1 - Math.exp(-kobs * cdt));
      const kesc = kescOf(); S.so2 = Math.max(0, S.so2 - S.so2 * kesc * cdt);
      const p = pink();
      if (S.D > 0 && !S.said.bleach && p < 0.08 && S.f < 0.05) { S.said.bleach = true; done('shake'); log(['振荡，等一会儿', '红色褪去，溶液变成<b>无色</b>', 'SO₂ 和品红（有色物质）生成了不稳定的无色物质']); status(S.D > 2 && p > 0.05 ? '褪成无色了（滴得多，可以看出还剩一点淡红）。接着加热试管：先点燃<b>酒精灯</b>。' : '红色褪去了。接着加热试管：先点燃<b>酒精灯</b>。'); }
      if (S.said.bleach && !S.said.faint && S.D > 2 && p > 0.05 && p < 0.9 && S.T < 30) { S.said.faint = true; log(['滴了较多品红溶液', '褪色以后还剩一点<b>淡红色</b>', '品红多了，没变成无色物质的那部分还在']); }
      if (S.said.bleach && !S.said.back && S.T > 40 && p > 0.3) { S.said.back = true; done('heat'); log(['加热试管', '红色<b>又出现了</b>，管口有 SO₂ 逸出', '无色物质受热分解，品红恢复红色；SO₂ 从溶液里逸出']); status('加热后红色又出现了。再点一下<b>试管夹</b>，把试管放回试管架，看冷下来以后会不会再变。'); if (!S.demo) W?.t1.open(); }
      if (S.said.back && !S.said.refade && S.heat.goal === 0 && S.T < 70 && p < 0.12 && S.so2 > 0.08 * SO2_0) { S.said.refade = true; log(['撤火，冷却', '红色又慢慢<b>褪去</b>', '溶液里的 SO₂ 还够，冷了无色物质又生成']); status('冷下来，红色又褪了：溶液里的 SO₂ 还没跑光。'); }
      if (S.said.back && S.so2 < 0.06 * SO2_0 && !S.said.gone) { S.said.gone = true; log(['加热较久', 'SO₂ 差不多逸出完了，红色一直保持', '没有 SO₂ 了，冷了也不会再褪']); status('SO₂ 差不多都跑光了：冷下来红色也不会再褪。要重做请点“全部重来”。'); }
      if (!S.said.late && S.D > 0 && !S.said.bleach && S.so2AtDrip < 0.5 * SO2_0 && S.T < 45 && S.clock - S.dyeT > 8 && S.streak < 0.2 && p > 0.12) { S.said.late = true; log(['先加热、再滴品红', '红色<b>褪不干净</b>，还是红的', '加热时 SO₂ 从溶液里逸出了，剩下的 SO₂ 不够']); status('先加热过的溶液里 SO₂ 少了，品红褪不干净。要重做请点“全部重来”。'); }
      // ---- 逸出的 SO₂：从管口出来，被排风扇抽走 ----
      const mouth = H.mouth();
      const rate = S.so2 > 0.01 * SO2_0 && S.T > 32 ? clamp((kesc * S.so2 / SO2_0) * 300, 0, 14) : 0;
      S.spawn += rate * dt;
      const R = () => Math.random() - 0.5;
      while (S.spawn >= 1) { S.spawn -= 1; gas.spawn({ p: mouth.clone().add(V(R() * 0.007, 0.002, R() * 0.007)), v: V(R() * 0.012, 0.01 + Math.random() * 0.01, R() * 0.012), aim: FAN_C.clone().add(V(R() * 0.03, R() * 0.03, 0.004)), pull: 0.5 + Math.random() * 0.6, size: 0.001, life: 9 }); }
      const vent = S.lit || S.T > 35;
      gas.update(dt, (q, d) => {
        let near = 1;
        if (vent) { const to = q.aim.clone().sub(q.p), L = to.length(); if (L < 0.006) return false; near = Math.min(1, L / 0.02); q.v.lerp(to.multiplyScalar(0.03 / L), Math.min(1, d * 1.6 * q.pull * Math.min(1, q.age / 1.5))); }
        q.v.add(V(R() * 0.03 * d, R() * 0.02 * d, R() * 0.03 * d));
        q.p.addScaledVector(q.v, d); q.size = (0.0009 + 0.0006 * Math.min(1, q.age / 2.5)) * Math.min(1, q.age / 0.4, (q.life - q.age) / 1.5, near); return true;      // 粒子没有透明度：出管口时由小变大，被抽进排风扇时变小
      });
      blades.rotation.z -= dt * (vent ? 16 : 0);
      // ---- 画面 ----
      B.setTube(0, { vol: S.vol, color: col.getHex(), milk: Math.min(0.9, sf * p0 * 1.1), milkColor: 0xd9367e, speckColor: 0xb02a66, gas: off() ? 0 : boil * 0.5 });
      halo.material.opacity = 0.2 * clamp((S.T - 30) / 60);
      flameOn = capper.update(dt, S.lit); lamp.flame.setOn(flameOn); lamp.flame.update(t);
      bar.near(S.near);
      mic.update?.(dt);
    };

    return {
      group: root, pointer, card: false, toggles: ['cards', 'steps'],
      size: { w: 0.32, d: 0.12, h: 0.15 },
      view: { elev: 20, azim: -6, lookY: 0.5, frameMargin: 1.18 },
      mount(ui) {
        const seen = () => (S.said.back ? (S.said.gone ? '红色 → 无色 → 加热后红色回来，一直保持' : S.said.refade ? '红色 → 无色 → 加热后红色回来 → 冷了又褪' : '红色 → 无色 → 加热后红色回来') : S.said.bleach ? '红色 → 无色' : S.D ? '红色' : '还没滴');
        const ctx = () => `<div>品红溶液滴了 ${S.D} 滴；颜色：${seen()}</div>`;
        const t2 = think({ q: '加热这支试管时，为什么要注意通风？', ctx, options: ['SO₂ 有毒，加热时会从溶液里逸出', '怕酒精灯火焰被吹灭', '品红受热会变成有毒气体'], wrong: ['通风不是为了酒精灯。看管口冒出来的青色小点：那是什么？', '品红受热只是颜色变回红色；管口冒出来的是 SO₂。'], ok: '对：SO₂ 是有刺激性气味的有毒气体（课本第 2 页），受热会从溶液里逸出，所以实验5-2 要“注意通风”（课本第 4 页）。', status: (m) => W?.status(m), onOk: () => { done('why'); if (W) W.next.hidden = false; } });
        const t1 = think({ q: '加热以后，红色为什么又出现了？', ctx, options: ['无色物质不稳定，受热分解，品红恢复原来的红色', '加热让溶液里生成了新的红色物质', '品红被 SO₂ 氧化成了红色'], wrong: ['红色是原来那种品红；加热不会生成别的红色物质。', '课本说的是：不稳定的无色物质容易分解，有色物质恢复原来的颜色。'], ok: '对：SO₂ 与品红生成不稳定的无色物质，受热分解，品红恢复原来的颜色（课本第 4 页）。', status: (m) => W?.status(m), onOk: () => t2.open() });
        const vary = varyBox('多滴几滴品红溶液试试（课本说 1~2 滴）：还能褪干净吗？也可以先加热试管、再滴品红：SO₂ 还在吗？');
        const more = moreBox([['钻进去看', () => mic.open()]], () => A.reset());
        const note = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'), h('p', { class: 'fineprint', html: 'SO₂ 水溶液按 0.04 mol/L 计（实验5-1：试管充满 SO₂ 倒立水中，约 1 体积 SO₂ 溶在 1 体积水里），2 mL 里约 0.08 mmol；品红一滴 0.05 mL，量极少。<br>“红色的品红 + SO₂ ⇌ 无色物质”按平衡算：温度高，平衡向红色一边移；SO₂ 受热逸出，溶液里 SO₂ 变少。K、ΔH 和逸出的快慢是<b>示意值</b>，只保证趋势：冷时褪色，热时红色回来；加热太久 SO₂ 跑光，冷了也不再褪色；先加热再滴品红，SO₂ 已经少了，褪不掉。红色深浅 = 没变成无色物质的那部分品红，滴得多就褪不干净。时间加快 2 倍：酒精灯约半分钟把试管里的液体烧到 100 ℃，画面里约 15 秒。<br>加热：试管夹夹在试管中上部，试管和桌面约成 45°，先在火焰上来回移动几下预热，再用外焰加热，管口不对着人（初中化学“给物质加热”）。倾斜的试管里液面保持水平。<br><span style="color:#1597a8">青色小点</span>是逸出的 SO₂：SO₂ 是无色气体（课本第 2 页），青色只是示意色（不和蓝 = 氧气、橙 = 热、黄绿 = 氯气冲突）；橙色是热。“注意通风”画成背景里的排风扇（课本实验图标里的“排风”），加热时转起来，把 SO₂ 抽走。<br>“钻进去看”是示意：课本只说生成不稳定的无色物质，没有写分子怎么连；个数不代表实际比例。' }));
        const base = mountXuean(ui, { controls: [vary, more, note], headers: ['做了什么', '现象', '说明'], intro: '试管里是 2 mL SO₂ 的水溶液。把品红溶液的滴管拖到试管口上方，按住滴加 1~2 滴。' });
        ui.data.append(t1.el, t2.el, base.next);
        W = { ...base, ui, t1, t2, status: ui.status }; bar.attach(ui);
      },
      update(dt, t) { const k = bar.update(dt), d = Math.min(dt, 1 / 30); step(d * k, t, d); },
      dispose() { bar.dispose(); drag.dispose(); mic.dispose?.(); gas.dispose?.(); B.dispose(); H.dispose(); },
      debug: {
        get S() { return S; }, bar, A, pink, H,
        picks: { dropper: B.droppers[0].pick, tube: tube.pick, lamp: lampPick, clamp: H.pick },
        qa: qaFlow(drag, [
          { name: '滴品红', run: () => B.qaDrip(drag, 0, 0, () => S.D >= 2), wait: 3 },
          { name: '振荡', run: () => B.qaShake(drag, 0), wait: 3 },
          { name: '等褪色', run: () => {}, wait: 5 },
          { name: '点燃酒精灯', tap: lampPick, wait: 2 },
          { name: '加热', tap: H.pick, wait: 26 },
          { name: '放回', tap: H.pick, wait: 24 },
          { name: '等冷却', run: () => {}, wait: 16 },
          { name: '钻进去看', run: () => mic.open(), wait: 3 },
          { name: '合上', run: () => mic.close(), wait: 1 },
          { name: '盖灭', tap: lampPick, wait: 2 },
          { name: '核对', run: () => { if (!(S.said.bleach && S.said.back && S.said.refade && S.heat.p === 0)) throw new Error(JSON.stringify({ said: S.said, f: S.f, so2: S.so2, T: S.T, D: S.D, heat: S.heat })); }, wait: 1 },
          { name: '想一想 1', run: () => W.t1.el.querySelector('button').click() },
          { name: '想一想 2', run: () => W.t2.el.querySelector('button').click() },
        ]),
      },
    };
  },
};
