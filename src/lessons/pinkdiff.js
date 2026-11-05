// 课题1 分子和原子 · 实验 3-1 品红在水中扩散（课本上册第 56 页图 3-1；对照：第 57 页“受热的情况下，分子能量增大，运动加快”）。
//
// 两杯水：冷水（20 ℃）、热水（80 ℃）。用药匙往水里加少量品红，静置观察：品红先沉下去，再从杯底慢慢往上散开，最后整杯变红。热水里快得多。
// 模型：液体按高度分 24 层，每层记品红的浓度，按扩散方程逐层交换；有效扩散系数冷水 D、热水约 2.5 D（分子运动加快；外加一点对流）。
//   品红颗粒先沉到杯底（落下时拖出一道红线）再溶解。时间加快约 60 倍（真实里冷水要一两个小时才变得均匀）。
import * as THREE from 'three';
import { buttons, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { textPlate, thermometer } from './kit/props.js';
import { chemBeaker, CHEM } from './kit/chem.js';
import { water2, glass2 } from './kit/chemfx.js';
import { microWorld, diffuseScene } from './kit/microworld.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { bottleCap } from './kit/labops.js';
import { sfx } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const NL = 24, BR = 0.032, BH = 0.08, LV = 0.06, SPEED = 60;
const BKS = [{ x: -0.05, name: '冷水', T: 20, D: 0.0055 }, { x: 0.05, name: '热水', T: 80, D: 0.014 }];       // D：按整杯高度归一化（1/s，画面时间）；冷水约 50 秒、热水约 20 秒散匀
const SPOON_HOME = new THREE.Vector3(0, 0.006, 0.07), JAR = new THREE.Vector3(0, 0, -0.04);
const WATER = new THREE.Color(0xe4eef2), PINK = new THREE.Color(0xd8326e);

export default {
  id: 'pinkdiff',
  fig: '图3-1',
  title: '品红在水中扩散',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '向一杯静置的水里加入少量品红，不搅拌——过一段时间会怎样？',
    hint: '课本第 56 页实验 3-1。',
    options: ['品红慢慢散开，整杯水都变红', '品红一直沉在杯底，水不变色', '品红浮在水面上'],
    answer: 0,
  },
  need: '向冷水、热水里分别加入少量品红，静置观察，比较扩散的快慢',
  conclusion: {
    crops: [{ page: 62, rect: [40, 370, 165, 660] }],
    quote: '实验表明，品红在静置的水中会扩散。……物质是由分子、原子等微观粒子构成的。',
    why: '没有搅拌，品红也会慢慢散开、使整杯水变红——构成品红的微观粒子在<b>不停地运动</b>，跑到了水分子之间。热水里散得快：温度升高，分子的能量增大，<b>运动加快</b>（课本第 57 页）。',
    src: '课本上册第 56–57 页 · 第三单元 课题1 分子和原子（实验 3-1）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); else bar.caption(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };

    paperSheet(group, { w: 0.26, d: 0.18, x: 0, z: 0.02 });

    // ================= 两杯水：每层一片薄薄的液体（颜色各自变） =================
    const beakers = BKS.map((B, k) => {
      const bk = chemBeaker({ r: BR, h: BH, level: 0, color: CHEM.water, marks: true }); bk.position.set(B.x, 0, 0); group.add(bk);
      const layers = [];
      for (let i = 0; i < NL; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(BR - 0.0013, BR - 0.0013, LV / NL, 32, 1, true), water2({ color: 0xe4eef2, base: 0.5, rim: 0.2 })); m.position.set(B.x, 0.0012 + (i + 0.5) * LV / NL, 0); m.renderOrder = 7; group.add(m); layers.push(m); }
      const bottom = new THREE.Mesh(new THREE.CircleGeometry(BR - 0.0013, 32), water2({ color: 0xe4eef2, base: 0.3 })); bottom.rotation.x = -Math.PI / 2; bottom.position.set(B.x, 0.0014, 0); group.add(bottom);
      const surf = new THREE.Mesh(new THREE.CircleGeometry(BR - 0.0013, 32), water2({ color: 0xe4eef2, base: 0.2 })); surf.rotation.x = -Math.PI / 2; surf.position.set(B.x, 0.0012 + LV, 0); surf.renderOrder = 7.5; group.add(surf);
      const streak = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0006, 1, 8), paint(0xd8326e, { keep: true, transparent: true, opacity: 0.9 })); streak.geometry.translate(0, -0.5, 0); streak.visible = false; streak.renderOrder = 8; group.add(streak);
      const th = thermometer({ min: 0, max: 100, length: 0.13 }); th.position.set(B.x + 0.02, 0.0125, -0.014); th.rotation.z = 0.12; group.add(th);
      th.children[1].material = paint(0xd8342a, { keep: true }); th.children[0].material = glass2({ base: 0.06, rim: 0.5, band: 0.5 }); th.children[0].renderOrder = 9; th.setTemp(B.T);
      const lab = textPlate(`${B.name}（${B.T} ℃）`, { w: 0.03, h: 0.0075, color: '#23293a', bg: '#fffaf0', font: 'bold 76px "Songti SC", serif' }); lab.position.set(B.x, 0.01, BR + 0.0015); group.add(lab);
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(BR + 0.004, BR + 0.004, BH, 12), new THREE.MeshBasicMaterial({ visible: false })); pick.position.set(B.x, BH / 2, 0); pick.userData.pick = true; group.add(pick);
      return { layers, bottom, surf, streak, pick };
    });
    // 品红（广口瓶）和药匙。瓶口敞着（瓶盖盖上时盖住），瓶里是品红；取用时瓶盖拿下来倒放在桌上，取完盖好（课本上册第 16–17 页）
    const jar = new THREE.Group(); jar.position.copy(JAR); group.add(jar);
    const jarCap = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.007, 18), paint(0x3d4352)), { width: 0.5 }); jarCap.position.y = 0.034;
    { const body = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 20, 1, true), paint(0xeceef0, { side: THREE.DoubleSide })), { width: 0.6 }); body.position.y = 0.015; jar.add(body);
      const shoulder = inked(new THREE.Mesh(new THREE.RingGeometry(0.0105, 0.014, 24), paint(0xeceef0, { side: THREE.DoubleSide })), { width: 0.5 }); shoulder.rotation.x = -Math.PI / 2; shoulder.position.y = 0.03; jar.add(shoulder);
      const dye = new THREE.Mesh(new THREE.CircleGeometry(0.0136, 24), paint(0x7a1a3a, { keep: true })); dye.rotation.x = -Math.PI / 2; dye.position.y = 0.021; jar.add(dye);
      jar.add(jarCap);
      const lab = textPlate('品红', { w: 0.014, h: 0.008, color: '#c2205a', bg: '#fffaf0', font: 'bold 96px "Songti SC", serif' }); lab.position.set(0, 0.016, 0.0142); jar.add(lab); }
    const jarLid = bottleCap(group, jar, jarCap, { rest: new THREE.Vector3(JAR.x, 0, JAR.z + 0.028) });      // 瓶盖倒放在瓶前（两杯水中间）
    const spoon = new THREE.Group(); group.add(spoon);
    { const handle = inked(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.002, 0.004), paint(0xd9dde3)), { width: 0.5 }); handle.position.x = 0.03; spoon.add(handle);
      const bowl = inked(new THREE.Mesh(new THREE.SphereGeometry(0.005, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xd9dde3)), { width: 0.4 }); bowl.rotation.x = Math.PI; bowl.scale.y = 0.4; spoon.add(bowl);
      const load = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 10, 6), paint(0x7a1a3a, { keep: true })); load.scale.y = 0.45; load.position.y = 0.0008; load.name = 'load'; spoon.add(load); }
    const spoonPick = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.02, 0.02), new THREE.MeshBasicMaterial({ visible: false })); spoonPick.position.x = 0.03; spoonPick.userData.pick = true; spoon.add(spoonPick);
    spoon.position.copy(SPOON_HOME);
    const cards = BKS.map(() => { const c = tag('', 'cond'); c.px = [0, -70]; return c; });

    // ================= 状态 =================
    // sp：药匙在做什么。ph = home 放在桌上 / take 去瓶里取品红 / carry 跟着手 / go 松手后去烧杯上方 / back 放回原处；i 是路线上的第几个点
    const fresh = () => ({ demo: false, b: BKS.map(() => ({ added: false, t: 0, fall: 0, c: new Array(NL).fill(0), undis: 0, logged: {} })), spoonCarry: null, firstDone: -1, sp: { ph: 'home', i: 0, t: 0, load: false, go: -1, from: null } });
    S = fresh();
    // 微观次元：钻进冷水 / 热水里，看品红分子在水分子之间运动
    let mwFor = 0;
    const mwAt = (k = mwFor) => new THREE.Vector3(BKS[k].x, 0.008, 0);
    const mwState = (k = mwFor) => { const b = S.b[k], mx = Math.max(...b.c); return { hot: k === 1, added: b.added && b.fall >= 1, mix: mx > 0 ? Math.min(...b.c) / mx : 0 }; };
    const mw = microWorld({ mode: 'holo', scene: diffuseScene(), place: () => ({ pos: group.localToWorld(mwAt()), scale: 0.0068 * group.getWorldScale(new THREE.Vector3()).x, cam: window.__lb.stage.camera }) });
    const goBtns = BKS.map((B, k) => tag(`钻进${B.name}里看 ⊙`, 'pill mw-go', () => openMicro(k)));
    const openMicro = (k, demo = false) => {
      mwFor = k; const p = mwAt();
      if (!demo) look([p.x, p.y + 0.06, p.z], [0.04, 0.22, 1], 0.3);
      const r = () => { const cam = window.__lb?.stage?.camera; if (!cam) return [innerWidth / 2, innerHeight * 0.8]; const v = group.localToWorld(mwAt()).project(cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; };
      const was = mw.isOpen; mw.open(r, mwState()); if (was) mw.reset(mwState());
    };
    mw.onClose = () => { if (!bar.playing) back(); };

    const A = {
      spoonDrag(p) {
        if (!p) return; S.spoonCarry = p.clone();
        const sp = S.sp;
        if (sp.ph === 'take' || sp.ph === 'go') return;           // 正在取 / 正往烧杯里加：做完再说
        if (!sp.load) { sp.ph = 'take'; sp.i = 0; sp.t = 0; sp.go = -1; sp.from = spoon.position.toArray(); }      // 拿起空药匙：先去瓶里取品红
        else { sp.ph = 'carry'; sp.go = -1; }
      },
      spoonDrop() {
        const p = S.spoonCarry; S.spoonCarry = null; if (!p) return;
        const sp = S.sp, k = BKS.findIndex((B) => Math.abs(p.x - B.x) < BR && p.y > BH - 0.02);
        if (k >= 0 && S.b[k].added) { status(`${BKS[k].name}里已经加过品红了。`); if (sp.ph === 'carry') { sp.ph = 'back'; sp.i = 0; sp.from = spoon.position.toArray(); } return; }
        sp.go = k;                                    // 正在取品红的话，取完再去这杯；拿在手里的话，现在就去
        if (sp.ph === 'carry') { if (k >= 0) sp.ph = 'go'; else { sp.ph = 'back'; sp.i = 0; sp.from = spoon.position.toArray(); } }
      },
      // 药匙到了烧杯上方：把品红加进去
      addTo(k) {
        const Bs = S.b[k]; S.sp.load = false;
        Bs.added = true; Bs.fall = 0; Bs.undis = 1; sfx.clink({ freq: 2400, gain: 0.02 });
        status(`往${BKS[k].name}里加了少量品红。不要搅拌，<b>静置</b>观察。`);
        done(k === 0 ? 'cold' : 'hot');
      },
      reset() { S = fresh(); mw.close(); W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; } bar.undo('cold', 'hot', 'watch', 'why'); status('全部重新摆好了，记录也清空了。'); },
    };
    const drag = draggable(group, [
      { obj: spoonPick, plane: 'xy', offset: 0, hint: '药匙：取少量品红，拖到一杯水的上方松手', onStart: (p) => A.spoonDrag(p), onDrag: (p) => A.spoonDrag(p), onEnd: () => A.spoonDrop() },
    ], { tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const over = (k) => () => new THREE.Vector3(BKS[k].x, BH + 0.015, 0);

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'cold', title: '冷水里加品红', todo: '用<b>药匙</b>取少量品红，拖到<b>冷水</b>上方松手。', target: () => (S.spoonCarry ? null : spoon) },
        { id: 'hot', title: '热水里加品红', todo: '再取少量品红，加进<b>热水</b>里。', target: () => (S.spoonCarry ? null : spoon) },
        { id: 'watch', title: '静置观察', todo: '不要搅拌，静置观察：哪杯先变得均匀？', target: () => null },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => mw.close() }),
          shots: [
            // 药匙拿起来先去瓶里取品红（瓶盖倒放在桌上，取完盖好），再拿到烧杯上方加进去
            { cap: '向冷水、热水里分别加入少量品红，静置，不搅拌。', dur: 9, cam: [[0, 0.06, 0], [0.04, 0.25, 1], 0.32],
              during: act.seq(act.path(spoonPick, [null, new THREE.Vector3(SPOON_HOME.x, 0.13, 0), over(0)()], { t0: 0.03, t1: 0.3, release: 0.33 }), act.path(spoonPick, [null, new THREE.Vector3(SPOON_HOME.x, 0.13, 0), over(1)()], { t0: 0.52, t1: 0.8, release: 0.83 })) },
            { cap: '品红先沉到杯底，再慢慢往上散开——热水里散得快得多。', dur: 14, speed: 1, cam: [[0, 0.05, 0], [0.04, 0.2, 1], 0.3] },
            { cap: '钻进冷水里看：没有人搅拌，品红分子自己在水分子之间钻来钻去。', dur: 7, cam: [[BKS[0].x, 0.065, 0], [0.04, 0.22, 1], 0.3], during: act.at(0.02, () => openMicro(0, true)) },
            { cap: '再钻进热水里看：水分子、品红分子都动得快多了——温度越高，分子运动越快。', dur: 7, cam: [[BKS[1].x, 0.065, 0], [0.04, 0.22, 1], 0.3], during: act.at(0.02, () => openMicro(1, true)) },
            { cap: '没有搅拌，品红也散到了整杯水里：分子在不停地运动；温度越高，运动越快。演示完了，下面换你自己做。', enter: () => mw.close(), dur: 5, cam: [[0, 0.05, 0], [0.04, 0.2, 1], 0.34] },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ================= 每帧 =================
    // 药匙沿路线走：匀速，快到了放慢（不跳）。到了返回 true
    const moveTo = (o, p, v, h) => {
      const d = p.clone().sub(o.position), L = d.length(), s = Math.min(L, Math.max(0.0003, v * h * Math.min(1, L / (2.5 * v * h))));
      if (L < 0.0004) { o.position.copy(p); return true; }
      o.position.addScaledVector(d, s / L); return false;
    };
    // 取品红的路线：升高到 HIGH（高过烧杯口；勺柄斜着翘起，绕开热水里的温度计）→ 瓶口正上方 →（瓶盖拿开了）伸进瓶里 → 取一点 → 升起来（瓶盖盖回去）→ 回到身前
    const HIGH = 0.1, DIP = JAR.clone().setY(0.024), TILT_IN = 0.8, V_SP = 0.45;
    const takePath = (from) => [new THREE.Vector3(from[0], HIGH, from[2]), JAR.clone().setY(HIGH), DIP, JAR.clone().setY(HIGH), new THREE.Vector3(JAR.x, HIGH, 0)];
    const lidClear = () => jarCap.parent === group && Math.hypot(jarCap.position.x - JAR.x, jarCap.position.z - JAR.z) > 0.016;
    const stepSpoon = (h) => {
      const sp = S.sp, P = sp.from ? new THREE.Vector3(...sp.from) : SPOON_HOME;
      let tilt = 0;
      if (sp.ph === 'take') {
        tilt = TILT_IN;
        const path = takePath(sp.from || SPOON_HOME.toArray());
        if (sp.i === 2 && !lidClear()) { /* 瓶盖还没拿开：在瓶口上方等一下 */ }
        else if (moveTo(spoon, path[sp.i], V_SP, h)) {
          if (sp.i === 2) { sp.t += h; if (sp.t > 0.3) { sp.load = true; sp.i++; } }     // 伸进瓶里，取一点
          else if (sp.i < path.length - 1) sp.i++;
          else { sp.ph = S.spoonCarry ? 'carry' : sp.go >= 0 ? 'go' : 'back'; sp.i = 0; sp.from = spoon.position.toArray(); }
        }
      } else if (sp.ph === 'carry') { if (S.spoonCarry) spoon.position.lerp(S.spoonCarry.clone().add(new THREE.Vector3(-0.01, 0, 0)), 0.45); else { sp.ph = 'back'; sp.i = 0; sp.from = spoon.position.toArray(); } }
      else if (sp.ph === 'go') { if (moveTo(spoon, over(sp.go)().add(new THREE.Vector3(-0.01, 0, 0)), V_SP, h)) { A.addTo(sp.go); sp.go = -1; sp.ph = 'back'; sp.i = 0; sp.from = spoon.position.toArray(); } }
      else if (sp.ph === 'back') {
        // 放回原处：先升到烧杯口以上，挪到原处上方，再放下去
        const path = [new THREE.Vector3(P.x, Math.max(P.y, 0.1), P.z), SPOON_HOME.clone().setY(0.1), SPOON_HOME];
        if (moveTo(spoon, path[sp.i], V_SP, h)) { if (sp.i < path.length - 1) sp.i++; else { sp.ph = 'home'; sp.from = null; } }
      } else spoon.position.lerp(SPOON_HOME, 0.2);
      spoon.rotation.z += (tilt - spoon.rotation.z) * Math.min(1, h * 8);
      spoon.getObjectByName('load').visible = sp.load;
      // 瓶盖：去取品红时拿下来倒放在桌上；取完、药匙从瓶里出来以后盖好
      jarLid.update(1 - Math.exp(-h * 10), sp.ph === 'take' && sp.i <= 3);
    };
    const step = (h) => {
      stepSpoon(h);
      S.b.forEach((Bs, k) => {
        const B = BKS[k], view = beakers[k];
        if (Bs.added) {
          Bs.t += h * SPEED;
          // 落下：约 1.5 秒沉到底，拖出一道红线
          if (Bs.fall < 1) { Bs.fall = Math.min(1, Bs.fall + h / 1.5); view.streak.visible = true; view.streak.position.set(B.x, 0.0012 + LV, 0); view.streak.scale.y = Math.max(0.001, LV * Bs.fall); }
          else { view.streak.scale.y = Math.max(0.001, view.streak.scale.y * (1 - h * (k ? 0.8 : 0.3))); if (view.streak.scale.y < 0.002) view.streak.visible = false; }
          // 落到底以后溶解，加进最下面一层
          if (Bs.fall >= 1 && Bs.undis > 0) { const d = Math.min(Bs.undis, h * (k ? 0.6 : 0.3)); Bs.undis -= d; Bs.c[0] += d * NL; }
          // 扩散（显式差分，分几小步算，保证稳定）
          const n = 4, Dk = B.D * h / n * NL * NL;
          for (let s = 0; s < n; s++) { const c = Bs.c, nx = c.slice(); for (let i = 0; i < NL; i++) { const a = c[Math.max(0, i - 1)], b2 = c[Math.min(NL - 1, i + 1)]; nx[i] = c[i] + Math.min(0.24, Dk) * (a + b2 - 2 * c[i]); } Bs.c = nx; }
          // 热水：轻微对流（下面的热、往上翻），把一部分往上带
          if (k) for (let i = NL - 1; i > 0; i--) { const m = (Bs.c[i - 1] - Bs.c[i]) * 0.15 * h; Bs.c[i] += m; Bs.c[i - 1] -= m; }
          const mean = Bs.c.reduce((a, b2) => a + b2, 0) / NL, top = Bs.c[NL - 1];
          if (mean > 0.5 && top / mean > 0.85 && !Bs.logged.even) { Bs.logged.even = true; log([`${B.name}（${B.T} ℃）里加少量品红，静置`, `约 <b>${Math.round(Bs.t / 60)} 分钟</b>后整杯红得均匀（模型）`, k ? '温度高，扩散快' : '']); if (S.firstDone < 0) { S.firstDone = k; if (!S.demo) status(`${B.name}先变得均匀了。`); } if (S.b.every((x) => x.logged.even)) { done('watch'); W?.t1.open(); } }
        }
        view.layers.forEach((m, i) => m.material.color.copy(WATER).lerp(PINK, clamp(Bs.c[i] * 0.9, 0, 1)));
        view.bottom.material.color.copy(WATER).lerp(PINK, clamp(Bs.c[0] * 1.2, 0, 1));
        view.surf.material.color.copy(WATER).lerp(PINK, clamp(Bs.c[NL - 1] * 0.9, 0, 1));
        const mean = Bs.c.reduce((a, b2) => a + b2, 0) / NL;
        cards[k].text(`<div class="cc"><div class="cc-t"><span class="cc-name">${B.name} ${B.T} ℃</span></div><div class="cc-more"><div class="cc-obs"><small>${Bs.added ? `过了约 ${Math.round(Bs.t / 60)} 分钟 · 上面 ${Math.round(clamp(Bs.c[NL - 1] / Math.max(0.01, mean), 0, 1) * 100)}% 那么红` : '还没加品红'}</small></div></div></div>`)
          .loc(group, B.x, BH, 0).show(true);
      });
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.2, d: 0.12, h: 0.12 },
      view: { elev: 14, azim: -4, lookY: 0.44, frameMargin: 1.1 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = () => [...W.tbl.el.querySelectorAll('tbody tr')].map((tr) => `<div>${tr.children[0].innerHTML}：${tr.children[1].innerHTML}</div>`).join('');
        const t2 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '为什么热水里扩散得快？',
          options: ['温度升高，分子的能量增大，运动加快', '热水里的品红更多', '热水的颜色本来就深'],
          wrong: ['两杯加的品红一样多。', '两杯水本来都是无色的。'],
          ok: '对：受热时分子的能量增大，<b>运动加快</b>。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); } });
        const t1 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '没有搅拌，品红为什么会散到整杯水里？',
          options: ['构成品红的微观粒子在不停地运动', '水在流动', '品红是液体'],
          wrong: ['水是静置的，没有流动。', '品红是固体颗粒。'],
          ok: '对：物质由不停运动的微观粒子构成。',
          onOk: () => t2.open() });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['做了什么', '现象', '说明']);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：时间加快约 60 倍（卡片上的“分钟”是模型时间）；扩散快慢按热水约为冷水的 2.5 倍估计。' });
        ui.controls.append(t1.el, t2.el, next, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, t1, t2, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('图 3-1：两杯水，左边冷水（20 ℃），右边热水（80 ℃）；后面一瓶品红，前面一把药匙。');
      },
      update(dt, t) {
        const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t);
        mw.set(mwState()); mw.update(Math.min(dt, 1 / 30) * Math.min(k, 1.5));
        goBtns.forEach((g, i) => g.loc(group, BKS[i].x, BH + 0.012, 0).show(!mw.isOpen && !bar.playing));
      },
      dispose() { mw.dispose(); bar.dispose(); },
      debug: { get S() { return S; }, A, bar, picks: { spoon: spoonPick }, lid: jarCap,
        qa: qaFlow(drag, [
          { name: '冷水里加品红', drag: spoonPick, to: over(0), wait: 1 },
          { name: '热水里加品红', drag: spoonPick, to: over(1), wait: 30 },
          { name: '再等', run: () => {}, wait: 30 },
          { name: '答第一题', run: () => W.t1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.t2.el.querySelector('button').click() },
        ]) },
    };
  },
};
