// 人教版高中化学必修第二册第 4 页【实验5-2】：用试管取 2 mL 在实验5-1 中得到的溶液（SO₂ 的水溶液），向其中滴入 1~2 滴品红溶液，振荡，观察溶液的颜色变化。
//   然后加热试管，注意通风，再观察溶液的变化。（图5-3：红色的品红滴进去，变成无色。）
// 课本结论：二氧化硫具有漂白作用……它能与某些有色物质生成不稳定的无色物质。这些无色物质容易分解而使有色物质恢复原来的颜色。
// 加热：试管夹夹住试管中上部，试管和桌面约成 45°，用酒精灯外焰加热，管口不对着人（初中“给物质加热”；kit/tubeheat.js）。
// 注意通风：课本实验图标里的“排风”——实验室的万向排风罩（罩口对着试管口，管道接到屋里的排风系统）。点一下罩子开 / 关排风：
//   开着，管口逸出的 SO₂ 被抽进罩口；没开，SO₂ 留在试管口和桌面上方（SO₂ 密度比空气大，课本第 2 页：慢慢往下沉、散开），打开以后被抽走。不编别的后果。
// 模型（示意，界面上写明）：
//   · 溶液：实验5-1 的试管充满 SO₂、水充满试管，约 1 体积气体溶在 1 体积水里 → 0.04 mol/L；2 mL 里 SO₂ 约 0.08 mmol。
//   · 品红：一滴 0.05 mL，量极少（约 10⁻⁷ mol）——远少于 SO₂。红色的品红 + SO₂ ⇌ 无色物质：平衡时还是红色的占 1/(1 + K·c)，
//     K 随温度升高变小（按放热算，示意值 K₀ = 5000 L/mol，ΔH = −60 kJ/mol，只保证趋势：冷时褪色，热时红色回来）。
//   · SO₂ 受热从溶液里逸出：冷时很慢，越热越快（示意）。SO₂ 是无色、有刺激性气味的有毒气体（课本第 2 页）。
//   · 红色深浅 = 还没变成无色物质的那部分品红（滴得多，褪不干净）；颜色变化的快慢示意：不振荡时品红还是一缕缕的，变得慢。
//   · 酒精灯加热 2 mL 水约 30 秒到 100 ℃（示意），画面里时间加快 2 倍；撤火后冷却（示意，比实际快），SO₂ 还够的话，无色物质又会生成，红色又褪去。
//   · 观察记录等颜色稳定（和当时温度下的平衡差不多）以后才按算出来的颜色写：褪尽 / 变浅 / 基本不褪。
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
const HOOD = V(0.152, 0.12, -0.045);                                // 万向排风罩的罩口中心（对着加热时的试管口）
const SO2C = 0x1597a8;                                               // 逸出的 SO₂：青色（示意色）
const CLEAR = new THREE.Color(0xe6eef2), PINK = new THREE.Color(0xd9367e);
// 颜色怎么叫：观察卡、观察记录、步骤推进、“钻进去看”的字幕都用这一个判定（红色指数 = 画出来的红色深浅）
const shade = (x) => (x < 0.05 ? '无色' : x < 0.3 ? '淡红' : '红色');

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
    crops: [{ page: 8, rect: [220, 158, 530, 264] }],
    quote: '二氧化硫具有漂白作用，工业上常用二氧化硫来漂白纸浆、毛、丝等。二氧化硫的漂白作用是由于它能与某些有色物质生成不稳定的无色物质。这些无色物质容易分解而使有色物质恢复原来的颜色。',
    formula: '红色的品红　遇 SO₂ →　不稳定的无色物质（褪色）　受热分解 →　品红恢复红色，SO₂ 放出',
    why: '品红溶液滴进 SO₂ 的水溶液，<b>红色褪去</b>：SO₂ 与品红这样的有色物质生成了<b>不稳定的无色物质</b>。加热试管，无色物质<b>分解</b>，品红<b>恢复原来的红色</b>，SO₂ 又放出来。<br>在这个实验里，加热后颜色又“还回来”了：品红和 SO₂ 生成的无色物质不稳定。加热时 SO₂ 还会从溶液里跑出来，它<b>有毒</b>，要通风。',
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
        if (H.k > 0) return status('试管不在试管架上。先点一下<b>试管夹</b>，把试管放回去。');
        S.f = (S.f * S.D + 1) / (S.D + 1); S.D++; S.vol += DROP; S.streak = 1;
        if (S.D === 1) { S.so2AtDrip = S.so2; S.preHeated = S.heated; S.dyeT = S.clock; log(['滴入品红溶液', '品红一缕缕散开，溶液带红色', '品红是有色物质']); }
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
    const H = tubeHeat(group, { tube, holder, getS: () => S.heat, flameAt: FLAME, rest: { pos: V(0.088, 0, 0.042), yaw: 0.35 }, liftTo: 0.08, spin: 1.1, lit: () => flameOn });
    // ---- 万向排风罩（实验室排风：罩口对着试管口，管道往上接到屋里的排风系统）----
    const hood = new THREE.Group(); hood.position.copy(HOOD); group.add(hood);
    const hm = paint(0xd5dbe1), hdark = paint(0x8d99a6);
    const cone = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.021, 0.026, 28, 1, true), new THREE.MeshLambertMaterial({ color: 0xd5dbe1, side: THREE.DoubleSide })), { width: 0.6 });
    const rim = inked(new THREE.Mesh(new THREE.TorusGeometry(0.021, 0.0012, 6, 32), hdark), { width: 0.4 }); rim.rotation.x = Math.PI / 2; rim.position.y = -0.013;
    const neck = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.012, 16), hdark), { width: 0.4 }); neck.position.y = 0.019;
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.0016, 10, 8), new THREE.MeshBasicMaterial({ color: 0x9aa3ad })); led.position.set(0, 0.012, 0.0125);
    const bell = new THREE.Group(); bell.add(cone, rim, neck, led);
    const toTube = new THREE.Vector3(-0.038, 0.016, 0.03).normalize();          // 罩口朝向加热时的试管口
    bell.quaternion.setFromUnitVectors(V(0, -1, 0), toTube); bell.scale.setScalar(0.8); hood.add(bell);
    const neckTop = V(0, 0.025 * 0.8, 0).applyQuaternion(bell.quaternion);
    const armPts = [neckTop, neckTop.clone().add(V(0.02, 0.03, -0.01)), neckTop.clone().add(V(0.03, 0.09, -0.03)), neckTop.clone().add(V(0.03, 0.3, -0.06))];
    for (let i = 0; i < armPts.length - 1; i++) {
      const a = armPts[i], b = armPts[i + 1], L = a.distanceTo(b);
      const seg = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, L, 14), hm), { width: 0.5 }); seg.position.copy(a).lerp(b, 0.5); seg.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); seg.traverse((o) => { o.userData.noFrame = true; }); hood.add(seg);
      if (i < armPts.length - 2) { const j = inked(new THREE.Mesh(new THREE.SphereGeometry(0.006, 14, 10), hdark), { width: 0.4 }); j.position.copy(b); j.traverse((o) => { o.userData.noFrame = true; }); hood.add(j); }
    }
    const hoodPick = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), new THREE.MeshBasicMaterial({ visible: false })); hoodPick.userData.pick = true; hood.add(hoodPick);
    const MOUTH_HOOD = V(0, -0.013 * 0.8, 0).applyQuaternion(bell.quaternion).add(HOOD);          // 罩口中心（group 坐标）
    // ---- 逸出的 SO₂（示意色：青色小点；实际无色）----
    const gas = new Particles({ max: 200, geometry: new THREE.SphereGeometry(1, 8, 6), material: new THREE.MeshBasicMaterial({ color: SO2C, transparent: true, opacity: 0.8, depthWrite: false }) }); gas.mesh.renderOrder = 12; group.add(gas.mesh);
    // ---- 观察卡：试管里看得到的颜色、温度（约）、溶液里还剩多少 SO₂（模型，示意）----
    const tubeCard = tag('', 'cond');

    const fresh = () => ({ demo: false, near: false, lookH: false, bench: B.fresh(), heat: H.fresh(), clock: 0, D: 0, vol: 2, f: 1, so2: SO2_0, so2AtDrip: SO2_0, preHeated: false, dyeT: 0, heated: false, T: 22, streak: 0, lit: false, fan: false, shook: false, colorKey: '', pBase: 0, pm: 0, pHot: 0, cyc: 0, coolLog: 0, coolRes: '', colorD: 0, spawn: 0, said: {} });
    S = fresh();
    const kOf = (T) => K0 * Math.exp(DH_R * (1 / (273.15 + T) - 1 / 298.15));
    const feqOf = () => 1 / (1 + kOf(S.T) * (S.so2 / S.vol));
    const pink = () => 1 - Math.exp(-3 * S.D * S.f / S.vol);
    const kescOf = () => 2e-4 * Math.exp((S.T - 25) / 14.3);

    const A = {
      tapLamp() {
        if (!S.lit) { S.lit = true; sfx.whoosh?.({ freq: 500, gain: 0.06, dur: 0.3 }); status(S.heat.goal ? '点燃了酒精灯：试管先在火焰上来回移动预热，再用外焰固定加热。<b>注意通风</b>。' : `点燃了酒精灯。再点一下<b>试管夹</b>：夹住试管，斜着放到外焰上加热。${S.fan ? '' : '注意通风：先点一下<b>排风罩</b>打开排风。'}`); return; }
        S.lit = false; status(S.heat.goal ? '用灯帽盖灭了酒精灯。试管还夹在灯上：点一下<b>试管夹</b>放回试管架。' : '用灯帽盖灭了酒精灯。看试管冷下来以后颜色会不会变。');
      },
      tapHood() {
        S.fan = !S.fan;
        if (S.fan) { status(gas.list.length > 8 && !S.demo ? '排风开了：留在桌面上方的 SO₂ 被抽进排风罩。' : '打开了排风：排风罩把试管口附近的气体抽走（注意通风）。'); if (S.said.linger && !S.said.rescue) { S.said.rescue = true; log(['打开排风', '留在桌面上方的 SO₂ 被抽进排风罩', '通风：把逸出的有毒气体排走']); } }
        else status('关上了排风。');
      },
      tapClamp() {
        const g = H.toggle();
        if (g && S.D > 0 && S.colorKey !== `${S.D}|${S.shook}`) { const sh = shade(S.pm); S.colorKey = `${S.D}|${S.shook}`; log([`共滴了 ${S.D} 滴品红溶液，${S.shook ? '振荡' : '没振荡'}，还没等颜色稳定就加热`, `当时溶液是<b>${sh}</b>`, '颜色还在变：要先振荡、看清颜色再加热']); }
        if (g) status(S.lit ? `试管提出试管架，试管夹从试管底部套上、夹住中上部，斜着放到外焰上：试管和桌面约成 45°，管口不对着人；先来回移动预热，再固定加热。${S.fan ? '' : '<b>排风还没开</b>：点一下排风罩。'}` : '试管夹夹起了试管。酒精灯还没点燃：点一下<b>酒精灯</b>。');
        else status(S.lit ? '试管放回试管架，试管夹放回桌上。再点一下<b>酒精灯</b>，用灯帽盖灭。' : '试管放回试管架，试管夹放回桌上。试管还是热的：看冷下来以后颜色会不会变。');
      },
      reset() { if (bar.playing) bar.stop(); S = fresh(); sync(); mic.close(); back(); W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; W.ui.relock(); } bar.undo('drip', 'shake', 'heat', 'off', 'why'); status('器材重新摆好了：试管里又是新的 SO₂ 水溶液。'); },
    };
    const sync = () => { gas.clear(); B.drops.clear(); capper.snap(S.lit); H.snap(); };
    const drag = draggable(group, [...B.items], { tip: tag('', 'pill'), taps: [
      { obj: lampPick, hint: () => (S.lit ? '酒精灯：点一下，用灯帽盖灭' : '酒精灯：点一下，取下灯帽点燃'), onTap: () => A.tapLamp() },
      { obj: hoodPick, hint: () => (S.fan ? '排风罩：点一下，关上排风' : '排风罩（实验室排风）：点一下，打开排风'), onTap: () => A.tapHood() },
      { obj: H.pick, hint: () => (S.heat.goal ? '试管夹：点一下，把试管放回试管架' : '试管夹：点一下，夹住试管，斜着放到外焰上加热'), onTap: () => A.tapClamp() },
    ] });
    const act = demoActs(drag, group);
    const off = () => H.k > 0;
    const mic = micro({ tag, look, back, group, scene: so2bleachScene(), at: () => (off() ? H.liquidCenter() : holder.position.clone().add(V(0, 0.03, 0))),
      btnAt: () => (H.k > 0.6 ? H.liquidCenter().add(V(-0.045, -0.004, 0)) : holder.position.clone().add(V(0.027, 0.088, 0))), label: '钻进去看',
      state: () => ({ nd: S.D, f: S.f, so2: S.so2 / SO2_0, T: S.T, liquid: 0xcfe3ec, shade: S.D ? shade(pink() * (1 - 0.7 * Math.min(1, S.streak))) : '' }), key: () => String(S.D > 0), show: () => true, bar: () => bar, scale: 0.0042 });

    const NEAR = [[XL + 0.035, 0.102, 0], [0.04, 0.22, 1], 0.33];
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'drip', title: '滴入品红溶液', todo: '试管里已经取好实验5-1 得到的溶液 2 mL。把<b>品红溶液</b>的滴管拖到试管口上方，按住滴 1~2 滴。', target: () => (S.bench.carry[0] ? null : B.droppers[0]) },
        { id: 'shake', title: '振荡，看颜色', todo: '按住<b>试管</b>左右来回拖，振荡；看溶液的颜色怎么变。', target: () => (S.D > 0 ? tube : null) },
        { id: 'heat', title: '加热试管', todo: '注意通风：点一下<b>排风罩</b>打开排风；点燃<b>酒精灯</b>，再点<b>试管夹</b>：夹住试管，斜着放到外焰上，先预热再加热。看颜色。', target: () => (!S.fan ? hood : !S.lit ? lamp : S.heat.goal ? null : H.clamp) },
        { id: 'off', title: '撤火、盖灭', todo: '点一下<b>试管夹</b>，把试管放回试管架；再点<b>酒精灯</b>，用灯帽盖灭。看冷下来以后颜色怎么变。', target: () => (S.heat.goal ? H.clamp : S.lit ? lamp : null) },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { sync(); mic.close(); },
            view: { save: () => (mic.isOpen ? 'mic' : S.lookH ? 'near' : null), restore: (v) => { if (v === 'mic') mic.open(); else if (v === 'near' && S.lookH) { S.near = true; look(...NEAR, () => { S.near = false; }); } } } }),
          shots: [
            { cap: '试管里已经取好实验5-1 得到的溶液 2 mL（SO₂ 的水溶液）。滴入 1~2 滴品红溶液：红色一缕缕散开。', dur: 5, speed: 1.4, cam: [[X0, 0.07, 0.01], [0.04, 0.22, 1], 0.26],
              during: B.dripSeq(drag, 0, [[0, () => S.D >= 2]], 0.04, 0.97) },
            { cap: '振荡：红色褪去，溶液变成无色。', dur: 6, speed: 1.5, cam: [[X0, 0.07, 0.01], [0.04, 0.22, 1], 0.26], during: B.wiggle(act, 0, 0.05, 0.6, 6) },
            { cap: '加热试管，注意通风：打开排风罩；点燃酒精灯；把试管提出来，试管夹从试管底部套上、夹住中上部，斜着放到外焰上——试管和桌面约成 45°，管口不对着人；先来回移动预热。', dur: 9.5, cam: [[0.04, 0.09, 0], [0.04, 0.22, 1], 0.42],
              during: act.seq(act.tap(hoodPick, 0.03), act.tap(lampPick, 0.1), act.tap(H.pick, 0.18)) },
            { cap: '接着加热（时间加快）：红色又回来了。管口逸出的 SO₂（青色小点，示意）被抽进排风罩。', dur: 7, speed: 1.5, cam: NEAR },
            { cap: '钻进去看（符号示意）：品红和 SO₂ 生成的无色物质受热分解，品红恢复红色，SO₂ 放出、从液面跑出去。', dur: 7, cam: [[XL + 0.02, 0.09, 0], [0.05, 0.22, 1], 0.32],
              enter: () => mic.open(true), during: act.at(0.98, () => mic.close()) },
            { cap: '撤火：把试管移回试管架上方，试管夹从试管底部取下，试管放回架上；再用灯帽盖灭酒精灯。', dur: 6.5, cam: [[0.02, 0.075, 0], [0.04, 0.22, 1], 0.44],
              during: act.seq(act.tap(H.pick, 0.04), act.tap(lampPick, 0.72)) },
            { cap: '冷下来（时间加快）：溶液里的 SO₂ 还够，红色又褪去。演示完了，换你自己做。', dur: 9, speed: 5, cam: [[X0, 0.07, 0.01], [0.04, 0.22, 1], 0.28] },
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
      S.T = Math.min(100, S.T + ((heated ? 4.0 : 0) - (S.T - 22) / 30) * cdt);          // 示意：约半分钟烧到 100 ℃；冷却也加快了
      // ---- 化学：红色 ⇄ 无色物质，SO₂ 逸出 ----
      S.streak = Math.max(0, S.streak - (0.08 + B.shakeE(0) * 1.4) * dt);
      const mixK = 0.3 + 0.7 * (1 - Math.min(1, S.streak)), kobs = 1.0 * mixK * Math.exp((S.T - 25) / 30);
      S.f += (feqOf() - S.f) * (1 - Math.exp(-kobs * cdt));
      const kesc = kescOf(); S.so2 = Math.max(0, S.so2 - S.so2 * kesc * cdt);
      const p = pink();
      S.pm = pm;
      if (S.D > 0 && B.shakeE(0) > 0.3 && !S.shook) S.shook = true;
      // 是不是稳定了：颜色和当时温度下的平衡差不多、品红已经散开
      const feq = feqOf(), pEq = 1 - Math.exp(-3 * S.D * feq / S.vol), settled = Math.abs(p - pEq) < 0.006 && S.streak < 0.15;
      // 滴品红以后的颜色：稳定了才记（多滴、振荡以后各记一行），按算出来的颜色写；振荡以后记下的那一行才推进到加热
      const key = `${S.D}|${S.shook}`;
      if (S.D > 0 && key !== S.colorKey && settled && S.heat.goal === 0 && H.k === 0 && S.T < 35 && S.clock - S.dyeT > 2) {
        S.colorKey = key; const sh = shade(pm), how = S.shook ? '振荡' : '没振荡，静置';
        const what = sh === '无色' ? '红色褪去，溶液变成<b>无色</b>' : sh === '淡红' ? '红色变浅，还剩一点<b>淡红色</b>，没褪尽' : '还是<b>红色</b>，褪不下去';
        const why = S.preHeated
          ? (sh === '无色' ? '先加热过，SO₂ 逸出了一部分；剩下的还够，照样褪色' : '先加热过，SO₂ 逸出了不少；剩下的不够，褪不尽')
          : sh === '无色' ? 'SO₂ 和品红（有色物质）生成了不稳定的无色物质' : '品红多了，没变成无色物质的那部分还在';
        log([`共滴了 ${S.D} 滴品红溶液，${how}`, what, why]);
        if (S.shook) { S.said.bleach = sh === '无色'; S.said.color = true; S.pBase = pm; done('shake'); }
        if (!S.shook) status(sh === '无色' ? '没振荡，红色也慢慢褪去了（品红一缕缕散开得慢）。课本要求振荡：按住<b>试管</b>左右来回拖。' : '没振荡，颜色还没褪尽。课本要求振荡：按住<b>试管</b>左右来回拖。');
        else if (sh === '无色') status('红色褪去了。接着加热试管：注意通风，先点一下<b>排风罩</b>打开排风。');
        else status(S.preHeated ? '先加热过的溶液里 SO₂ 少了，品红褪不尽。可以接着加热看看，或者点“更多 → 全部重来”。' : '品红滴多了，褪不尽（课本说滴 1~2 滴）。可以接着加热看看，或者点“更多 → 全部重来”。');
      }
      // 加热：红色回来
      if (heated) S.pHot = Math.max(S.pHot, p);
      if (S.said.color && !S.said.back && S.T > 40 && pm > 0.3 && pm > (S.pBase || 0) + 0.15) { S.said.back = true; S.cyc++; done('heat'); log([S.fan ? '加热试管（开着排风）' : '加热试管', '红色<b>又出现了</b>，管口有 SO₂ 逸出', '无色物质受热分解，品红恢复红色，SO₂ 放出']); status('加热后红色又出现了。撤火：点一下<b>试管夹</b>把试管放回试管架，再盖灭<b>酒精灯</b>。'); }
      if (S.said.back && heated && p > 0.3 && S.coolLog === S.cyc) S.cyc++;          // 冷却后又加热：新的一轮
      // 撤火、盖灭
      if (S.said.back && S.heat.goal === 0 && H.k === 0 && !S.lit && !S.said.off) { S.said.off = true; done('off'); status('撤火了，酒精灯也盖灭了。等试管冷下来（时间加快，约半分钟），看颜色会不会再变；左边可以先想一想。'); if (!S.demo) W?.t1.open(); }
      // 撤火后冷却：颜色稳定了才记，区分褪尽、变浅、基本不褪
      const pRoom = 1 - Math.exp(-3 * S.D / (1 + kOf(22) * (S.so2 / S.vol)) / S.vol), coolCat = (x) => (x < 0.05 ? 0 : x < 0.75 * Math.max(S.pHot, 0.3) ? 1 : 2);          // 冷到室温时会是什么颜色：和现在同一类才记
      if (S.said.back && S.coolLog < S.cyc && S.heat.goal === 0 && H.k === 0 && S.T < 30 && settled && coolCat(p) === coolCat(pRoom)) {
        S.coolLog = S.cyc; S.said.cool = true;
        const Tn = Math.round(S.T / 5) * 5, ph = Math.max(S.pHot, 0.3);
        const [what, why] = p < 0.05 ? ['红色又<b>褪尽</b>，变回无色', '溶液里的 SO₂ 还够：冷了，品红又和 SO₂ 生成无色物质']
          : p < 0.75 * ph ? ['红色<b>变浅</b>了，但没有褪尽', '加热时 SO₂ 逸出了一部分：冷了只有一部分品红又变成无色物质']
          : ['红色<b>基本不褪</b>', '加热较久，SO₂ 差不多都逸出了'];
        S.coolRes = p < 0.05 ? '冷了又褪尽' : p < 0.75 * ph ? '冷了变浅、没褪尽' : '冷了基本不褪';
        log([`撤火，冷到约 ${Tn} ℃`, what, why]); status(`冷到约 ${Tn} ℃：${what.replace(/<\/?b>/g, '')}。`);
        S.pHot = 0;
      }
      // ---- 逸出的 SO₂：开着排风，被抽进排风罩；没开，留在试管口和桌面上方，慢慢往下沉、散开（SO₂ 比空气重）----
      const mouth = H.mouth();
      const rate = S.so2 > 0.01 * SO2_0 && S.T > 32 ? clamp((kesc * S.so2 / SO2_0) * 300, 0, 14) : 0;
      S.spawn += rate * dt;
      const R = () => Math.random() - 0.5;
      while (S.spawn >= 1) { S.spawn -= 1; gas.spawn({ p: mouth.clone().add(V(R() * 0.007, 0.002, R() * 0.007)), v: V(R() * 0.012, 0.01 + Math.random() * 0.01, R() * 0.012), aim: MOUTH_HOOD.clone().add(V(R() * 0.016, R() * 0.016, R() * 0.016)), pull: 0.5 + Math.random() * 0.6, size: 0.001, life: 9, still: 0 }); }
      let linger = 0;
      gas.update(dt, (q, d) => {
        let near = 1;
        if (S.fan) { const to = q.aim.clone().sub(q.p), L = to.length(); if (L < 0.005) return false; near = Math.min(1, L / 0.02); q.v.lerp(to.multiplyScalar(0.035 / L), Math.min(1, d * 1.8 * q.pull * Math.min(1, (q.age - q.still) / 1.2))); q.life = Math.max(q.life, q.age + 3); }
        else { q.still = q.age; q.v.multiplyScalar(Math.pow(0.5, d)); q.v.y -= 0.002 * d; if (q.p.y < 0.012) { q.p.y = 0.012; q.v.y = 0; } q.life = Math.max(q.life, Math.min(q.age + 0.1, 22)); if (q.age > 1) linger++; }
        q.v.add(V(R() * 0.02 * d, R() * 0.012 * d, R() * 0.02 * d));
        q.p.addScaledVector(q.v, d); q.size = (0.0009 + 0.0006 * Math.min(1, q.age / 2.5)) * Math.min(1, q.age / 0.4, (q.life - q.age) / 1.5, near); return true;      // 粒子没有透明度：出管口时由小变大，被抽进排风罩时变小
      });
      if (!S.fan && linger > 25 && !S.said.linger) { S.said.linger = true; log(['加热时没开排风', '逸出的 SO₂（青色小点）留在试管口和桌面上方，没有被排走', 'SO₂ 有毒，加热时要注意通风']); status('排风没开：逸出的 SO₂（青色小点，示意）留在试管口和桌面上方，没有被排走。点一下<b>排风罩</b>打开排风。'); }
      led.material.color.setHex(S.fan ? 0x35c46a : 0x9aa3ad);
      // ---- 画面 ----
      B.setTube(0, { vol: S.vol, color: col.getHex(), milk: Math.min(0.9, sf * p0 * 1.1), milkColor: 0xd9367e, speckColor: 0xb02a66, gas: off() ? 0 : boil * 0.5 });
      halo.material.opacity = 0.2 * clamp((S.T - 30) / 60);
      flameOn = capper.update(dt, S.lit); lamp.flame.setOn(flameOn); lamp.flame.update(t);
      // 观察卡
      const sh = S.D ? shade(pm) : '无色', shCls = sh === '无色' ? '' : ' burn';
      // 照初中的卡片：名字 + 颜色，一行数字，图例；“溶解态 S(IV)、以 SO₂ 计”写在面板里
      const legend = gas.list.length ? `<div class="cc-note">青点 = SO₂（示意）${S.fan ? '' : ' · 排风没开'}</div>` : '';
      tubeCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">试管里</span><span class="cc-res${shCls}">${sh}</span></div><div class="cc-more"><div class="cc-obs"><span class="cc-th"><i style="height:${clamp(S.T, 4, 100).toFixed(0)}%"></i></span><b>${Math.round(S.T)}</b><small>℃</small><b>${(S.so2 * 1000 / S.vol).toFixed(0)}</b><small>mmol/L SO₂（约）</small></div>${legend}</div></div>`)
        .loc(group, ...(H.k > 0.6 ? H.liquidCenter().add(V(-0.085, 0.045, 0)).toArray() : [X0 - 0.06, 0.135, 0])).show(!bar.playing && !mic.isOpen && H.k < 0.05 || (!bar.playing && !mic.isOpen && H.k > 0.6));
      bar.near(S.near);
      mic.update?.(dt);
    };

    return {
      group: root, pointer, card: false, toggles: ['cards', 'steps'],
      size: { w: 0.32, d: 0.12, h: 0.15 },
      view: { elev: 20, azim: -6, lookY: 0.5, frameMargin: 1.18 },
      mount(ui) {
        const seen = () => (S.said.back ? `红色 → ${S.said.bleach ? '无色' : '淡红（没褪尽）'} → 加热后红色回来${S.coolRes ? ' → ' + S.coolRes : ''}` : S.said.bleach ? '红色 → 无色' : S.said.color ? '红色 → 淡红（没褪尽）' : S.D ? '红色' : '还没滴');
        const ctx = () => `<div>品红溶液滴了 ${S.D} 滴；颜色：${seen()}</div>`;
        const t2 = think({ q: '加热这支试管时，为什么要注意通风？', ctx, options: ['SO₂ 有毒，加热时会从溶液里逸出', '怕酒精灯火焰被吹灭', '品红受热会变成有毒气体'], wrong: ['通风不是为了酒精灯。看管口冒出来的青色小点（示意色）：那是什么？', '品红受热只是颜色变回红色；管口冒出来的是 SO₂。'], ok: '对：SO₂ 是有刺激性气味的有毒气体（课本第 2 页），受热会从溶液里逸出，所以实验5-2 要“注意通风”（课本第 4 页）。', status: (m) => W?.status(m), onOk: () => { done('why'); if (W) W.next.hidden = false; } });
        const t1 = think({ q: '加热以后，红色为什么又出现了？', ctx, options: ['无色物质不稳定，受热分解，品红恢复原来的红色', '加热让溶液里生成了新的红色物质', '品红被 SO₂ 氧化成了红色'], wrong: ['红色是原来那种品红；加热不会生成别的红色物质。', '课本说的是：不稳定的无色物质容易分解，有色物质恢复原来的颜色。'], ok: '对：SO₂ 与品红生成不稳定的无色物质，受热分解，品红恢复原来的颜色（课本第 4 页）。', status: (m) => W?.status(m), onOk: () => t2.open() });
        const vary = varyBox('多滴几滴品红溶液试试（课本说 1~2 滴）：还能褪干净吗？也可以先加热试管、再滴品红：加热多久以后就褪不尽了？加热时也可以不开排风，看看逸出的 SO₂ 去了哪里。<br>（滴几滴、热多久会褪不尽，分界取决于模型里的示意参数，只用来比较这套模型，不是实测的界限。）');
        const more = moreBox([['钻进去看', () => mic.open()]], () => A.reset());
        const note = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'), h('p', { class: 'fineprint', html: 'SO₂ 水溶液按 0.04 mol/L 计（实验5-1：试管充满 SO₂ 倒立水中，约 1 体积 SO₂ 溶在 1 体积水里），2 mL 里约 0.08 mmol；品红一滴 0.05 mL，量极少。卡片上的 SO₂ 浓度指溶液里溶解态的 S(IV)，以 SO₂ 计（模型估算）。<br>“红色的品红 + SO₂ ⇌ 无色物质”按平衡算：温度高，平衡向红色一边移；SO₂ 受热逸出，溶液里 SO₂ 变少。K、ΔH 和逸出的快慢是<b>示意值</b>，只保证趋势：冷时褪色，热时红色回来；加热越久 SO₂ 跑得越多，冷了可能褪尽、变浅或基本不褪——记录里按算出来的颜色写，等颜色稳定了才记；先加热再滴品红，褪不褪得尽看加热了多久。红色深浅 = 没变成无色物质的那部分品红，滴得多就褪不尽。时间加快 2 倍：酒精灯约半分钟把试管里的液体烧到 100 ℃，画面里约 15 秒；冷却也加快了（示意，实际要几分钟）。<br>加热：试管夹夹在试管中上部，试管和桌面约成 45°，有火以后先在火焰上来回移动几下预热，再用外焰固定加热，管口不对着人（初中化学“给物质加热”）。倾斜的试管里液面保持水平。<br><span style="color:#1597a8">青色小点</span>是逸出的 SO₂：SO₂ 是无色、有刺激性气味的有毒气体，密度比空气大（课本第 2 页），青色只是示意色（不和蓝 = 氧气、橙 = 热、黄绿 = 氯气冲突）；橙色是热。“注意通风”画成实验室的万向排风罩（课本实验图标里的“排风”）：开着，SO₂ 被抽进罩口；没开，SO₂ 留在试管口和桌面上方，慢慢往下沉、散开。<br>“钻进去看”是符号示意：粉红色大球代表品红（不是它的结构），课本只说生成不稳定的无色物质，没有写它们怎么连，所以不画两者之间的键；个数不代表实际比例。' }));
        const base = mountXuean(ui, { controls: [vary, more, note], headers: ['做了什么', '现象', '说明'], intro: '已经替你用试管取好了实验5-1 中得到的溶液 2 mL（SO₂ 的水溶液）。把品红溶液的滴管拖到试管口上方，按住滴加 1~2 滴，再振荡。' });
        ui.data.append(t1.el, t2.el, base.next);
        W = { ...base, ui, t1, t2, status: ui.status }; bar.attach(ui);
      },
      update(dt, t) { const k = bar.update(dt), d = Math.min(dt, 1 / 30); step(d * k, t, d); },
      dispose() { bar.dispose(); drag.dispose(); mic.dispose?.(); gas.dispose?.(); B.dispose(); H.dispose(); },
      debug: {
        get S() { return S; }, bar, A, pink, H,
        picks: { dropper: B.droppers[0].pick, tube: tube.pick, lamp: lampPick, clamp: H.pick, hood: hoodPick },
        qa: qaFlow(drag, [
          { name: '滴品红', run: () => B.qaDrip(drag, 0, 0, () => S.D >= 2), wait: 3 },
          { name: '振荡', run: () => B.qaShake(drag, 0), wait: 3 },
          { name: '等褪色', run: () => {}, wait: 8 },
          { name: '开排风', tap: hoodPick, wait: 1 },
          { name: '点燃酒精灯', tap: lampPick, wait: 2 },
          { name: '加热', tap: H.pick, wait: 26 },
          { name: '钻进去看', run: () => mic.open(), wait: 3 },
          { name: '合上', run: () => mic.close(), wait: 1 },
          { name: '放回', tap: H.pick, wait: 6 },
          { name: '盖灭', tap: lampPick, wait: 2 },
          { name: '等冷却', run: () => {}, wait: 30 },
          { name: '核对', run: () => { if (!(S.said.bleach && S.shook && S.said.back && S.said.off && S.said.cool && S.heat.p === 0 && !S.lit)) throw new Error(JSON.stringify({ said: S.said, f: S.f, so2: S.so2, T: S.T, D: S.D, heat: S.heat })); }, wait: 1 },
          { name: '想一想 1', run: () => W.t1.el.querySelector('button').click() },
          { name: '想一想 2', run: () => W.t2.el.querySelector('button').click() },
        ]),
      },
    };
  },
};
