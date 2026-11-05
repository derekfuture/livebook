// 课题2 化学实验与科学探究 · 探究：观察与描述蜡烛及其燃烧（课本上册第 21–22 页图 1-27、1-28）。
//
// (1) 用小刀切下一块石蜡放进水里：浮在水面上——石蜡软（能切），密度比水小。
// (2) 点燃蜡烛：火焰分三层（外焰、内焰、焰心）。把一根火柴梗平放进火焰里约 1 秒取出：外焰那两段最黑——外焰温度最高。
//     分别罩一个干燥的烧杯、一个用澄清石灰水润湿内壁的烧杯：干燥烧杯内壁出现水雾；石灰水变浑浊——蜡烛燃烧生成水和二氧化碳。
// (3) 熄灭蜡烛：冒出一缕白烟。用燃着的火柴去点白烟：蜡烛重新燃烧——白烟是石蜡蒸气凝成的固体小颗粒，能燃烧。
// 模型：火柴梗上每一段的烤焦程度 = 在火焰里的时间 × 那一段所在位置的温度（外焰约 1、内焰约 0.6、焰心约 0.3，相对值，示意）。
import * as THREE from 'three';
import { buttons, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { textPlate } from './kit/props.js';
import { chemCandle, chemBeaker, splint, CHEM } from './kit/chem.js';
import { smoke2, flame2 } from './kit/chemfx.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const C = new THREE.Vector3(0, 0, 0), CH = 0.07, CR = 0.01;
const FY = CH + 0.016, FR = 0.0055;              // 火焰的中心高度、半宽
const WB = new THREE.Vector3(-0.1, 0, 0.03), KNIFE = new THREE.Vector3(-0.07, 0.003, 0.08);
const STICK_HOME = new THREE.Vector3(0.05, 0.003, 0.085), MATCH_HOME = new THREE.Vector3(0.09, 0.006, 0.06);
const B_HOME = [new THREE.Vector3(0.12, 0, -0.02), new THREE.Vector3(0.17, 0, -0.02)];
const NSEG = 14, SLEN = 0.04;

export default {
  id: 'candle',
  fig: '图1-27',
  title: '观察与描述蜡烛及其燃烧',
  stampText: '探究',
  style: 'paper',
  predict: {
    q: '把一根火柴梗平放进蜡烛火焰里约 1 秒后取出，火柴梗哪一部分最先变黑？',
    hint: '课本第 21 页探究：火焰的分层情况。',
    options: ['接触外焰的两端', '接触焰心的中间', '各部分一样黑'],
    answer: 0,
  },
  need: '观察石蜡（切一块放进水里）；点燃蜡烛，观察火焰分层（火柴梗），罩干燥的烧杯和润湿了澄清石灰水的烧杯；熄灭蜡烛，点燃白烟',
  conclusion: {
    crops: [{ page: 28, rect: [95, 75, 375, 258] }],
    quote: '对蜡烛及其燃烧的探究活动，体现了化学学习的以下特点：关注物质的性质……关注物质的变化，例如，石蜡受热时熔化等物理变化，燃烧时生成二氧化碳和水等化学变化。',
    why: '石蜡：白色固体，质软，密度比水小（浮在水面）。<br>火焰分三层，<b>外焰温度最高</b>（火柴梗接触外焰的部分最先变黑）。干燥烧杯内壁出现<b>水雾</b>，石灰水<b>变浑浊</b>——蜡烛燃烧生成了<b>水</b>和<b>二氧化碳</b>（化学变化）。<br>熄灭时冒出的<b>白烟</b>是石蜡蒸气凝成的石蜡固体小颗粒，能被点燃，所以蜡烛能重新燃烧。石蜡受热熔化是物理变化。',
    src: '课本上册第 21–22 页 · 第一单元 课题2 化学实验与科学探究（探究：观察与描述蜡烛及其燃烧）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); else bar.caption(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };
    let nearK = '';
    const near = (k, c, d, dist) => { if (S.demo || nearK === k) return; nearK = k; look(c, d, dist, () => { nearK = ''; }); };
    const far = () => { if (nearK) { nearK = ''; back(); } };

    paperSheet(group, { w: 0.34, d: 0.18, x: 0.02, z: 0.03 });

    // ================= 蜡烛、火焰、白烟 =================
    const candle = chemCandle({ height: CH, r: CR }); candle.position.copy(C); group.add(candle);
    candle.flame.position.y = CH + 0.002;
    const candlePick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, CH, 10), new THREE.MeshBasicMaterial({ visible: false })); candlePick.position.y = CH / 2; candlePick.userData.pick = true; candle.add(candlePick);
    const smoke = smoke2({ max: 80, color: 0xf2f2ee, opacity: 0.7 }); group.add(smoke.mesh);
    const labels = ['外焰', '内焰', '焰心'].map((t) => tag(t, 'pill'));
    // ================= 一杯水、小刀、一块石蜡 =================
    const wb = chemBeaker({ r: 0.024, h: 0.05, level: 0.035, color: CHEM.water, marks: false }); wb.position.copy(WB); group.add(wb);
    const knife = new THREE.Group(); group.add(knife);
    { const blade = inked(new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.0012, 0.009), paint(0xd9dde3)), { width: 0.4 }); blade.position.x = -0.0175; knife.add(blade);
      const handle = inked(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.004, 0.009), paint(0x8a5a3a, { keep: true })), { width: 0.5 }); handle.position.x = 0.015; knife.add(handle); }
    knife.position.copy(KNIFE);
    const knifePick = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.014, 0.018), new THREE.MeshBasicMaterial({ visible: false })); knifePick.userData.pick = true; knife.add(knifePick);
    const wax = inked(new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.005, 0.008), paint(0xf6ecd6)), { width: 0.4 }); wax.visible = false; group.add(wax);
    const waxPick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.02), new THREE.MeshBasicMaterial({ visible: false })); waxPick.userData.pick = true; wax.add(waxPick);
    // ================= 火柴梗（看火焰分层）、燃着的火柴 =================
    const stick = new THREE.Group(); group.add(stick);
    const segs = Array.from({ length: NSEG }, (_, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(SLEN / NSEG, 0.0022, 0.0022), paint(0xe2c69a, { keep: true, unique: true })); m.position.x = (i + 0.5) * SLEN / NSEG - SLEN / 2; stick.add(m); return m; });
    const stickPick = new THREE.Mesh(new THREE.BoxGeometry(SLEN + 0.01, 0.012, 0.012), new THREE.MeshBasicMaterial({ visible: false })); stickPick.userData.pick = true; stick.add(stickPick);
    stick.position.copy(STICK_HOME);
    const match = splint({ len: 0.06 }); group.add(match);
    const matchPick = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.065, 0.014), new THREE.MeshBasicMaterial({ visible: false })); matchPick.position.y = 0.03; matchPick.userData.pick = true; match.add(matchPick);
    match.position.copy(MATCH_HOME); match.rotation.z = -Math.PI / 2;
    // ================= 两个烧杯：干燥的、润湿了澄清石灰水的 =================
    const bks = B_HOME.map((p, k) => {
      const piv = new THREE.Group(); group.add(piv);
      const b = chemBeaker({ r: 0.02, h: 0.045, level: 0, marks: false }); b.position.y = -0.0225; piv.add(b);
      const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.0192, 0.0192, 0.044, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); coat.position.y = 0.022; coat.renderOrder = 9.7; b.add(coat);
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.045, 10), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 0.0225; pick.userData.pick = true; b.add(pick);
      const lab = textPlate(k ? '内壁润湿了澄清石灰水' : '干燥的烧杯', { w: k ? 0.05 : 0.026, h: 0.0072, color: '#23293a', bg: 'rgba(0,0,0,0)', font: 'bold 64px "Songti SC", serif' }); lab.rotation.x = -Math.PI / 2; lab.position.set(p.x, 0.0005, p.z + 0.03); group.add(lab);
      const HOME = p.clone().add(new THREE.Vector3(0, 0.0225, 0)); piv.position.copy(HOME);
      return Object.assign(piv, { coat, pick, HOME });
    });
    const cards = { c: tag('', 'cond') }; cards.c.px = [-120, -60];

    // ================= 状态 =================
    const fresh = () => ({ demo: false, cut: false, waxAt: 'table', waxCarry: null, lit: false, stickCarry: null, char: new Array(NSEG).fill(0), inT: 0, knifeCarry: null, bCarry: [null, null], mist: 0, milk: 0, out: false, smokeT: 0, matchCarry: null, relit: false, logged: {} });
    S = fresh();
    const fT = (dx, dy) => { const r = Math.hypot(dx / FR, dy / 0.016); if (r > 1) return 0; return r > 0.6 ? 1 : r > 0.3 ? 0.6 : 0.3; };       // 火焰里某点的相对温度：外焰 > 内焰 > 焰心

    // ================= 操作 =================
    const A = {
      knifeDrag(p) { if (!p) return; S.knifeCarry = p.clone(); if (Math.hypot(p.x - C.x, p.z - C.z) < 0.02 && p.y < CH && !S.cut) { S.cut = true; sfx.clink({ freq: 1800, gain: 0.02 }); status('用小刀轻轻一切，就切下了一块石蜡——石蜡<b>很软</b>。把它放进水里。'); } },
      knifeDrop() { S.knifeCarry = null; },
      waxDrag(p) { if (!p) return; S.waxCarry = p.clone(); },
      waxDrop() { const p = S.waxCarry; S.waxCarry = null; if (!p) return; if (Math.hypot(p.x - WB.x, p.z - WB.z) < 0.024) { S.waxAt = 'water'; sfx.clink({ freq: 1200, gain: 0.02 }); done('wax'); log(['(1) 观察石蜡，切一块放进水里', '白色固体；用小刀能切下（质软）；<b>浮在水面上</b>', '石蜡密度比水小']); status('石蜡<b>浮在水面上</b>：石蜡的密度比水小。接着点燃蜡烛。'); } },
      candleTap() {
        if (!S.lit && !S.out) { S.lit = true; done('light'); sfx.whoosh?.({ freq: 500, gain: 0.06, dur: 0.3 }); status('点燃了蜡烛。看火焰：分成三层。把<b>火柴梗</b>平放进火焰里，约 1 秒后取出。'); return; }
        if (S.lit) { if (!S.demo && !bar.has('cover')) return status('先做完火柴梗、两个烧杯的观察，再熄灭蜡烛。'); S.lit = false; S.out = true; S.smokeT = 10; done("blow"); status('熄灭蜡烛：烛芯上冒出一缕<b>白烟</b>。快！把<b>燃着的火柴</b>凑到白烟上。'); }
      },
      stickDrag(p) { if (!p) return; S.stickCarry = p.clone(); },
      stickDrop() {
        S.stickCarry = null;
        if (S.inT > 0.6 && !S.logged.char) { S.logged.char = true; const outer = Math.max(...S.char), mid = Math.min(S.char[Math.floor(NSEG / 2)], S.char[Math.floor(NSEG / 2) - 1]); /* 最黑的一段 vs 正中间（焰心） */ done('layers'); log(['(2) 火柴梗平放进火焰约 1 秒', `接触<b>外焰</b>的部分最先变黑${outer > mid * 1.3 ? '' : '（放的位置偏了，再试一次）'}`, '外焰温度最高']); status('取出火柴梗：两端（接触<b>外焰</b>的部分）最黑，中间（焰心）几乎没变——<b>外焰温度最高</b>。接着罩上两个烧杯。'); far(); }
      },
      bDrag(k, p) { if (!p) return; S.bCarry[k] = p.clone(); },
      bDrop(k) { S.bCarry[k] = null; far(); },
      matchDrag(p) { if (!p) return; S.matchCarry = p.clone(); },
      matchDrop() { S.matchCarry = null; },
      reset() { S = fresh(); smoke.clear(); segs.forEach((m) => m.material.color.set(0xe2c69a)); W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; } bar.undo('wax', 'light', 'layers', 'cover', 'blow', 'relight', 'why'); status('全部重新摆好了，记录也清空了。'); },
    };
    const drag = draggable(group, [
      { obj: knifePick, plane: 'xz', offset: CH - 0.01, hint: '小刀：拖到蜡烛上，切下一小块石蜡', onStart: (p) => A.knifeDrag(p), onDrag: (p) => A.knifeDrag(p), onEnd: () => A.knifeDrop() },
      { obj: waxPick, plane: 'xz', offset: 0.05, hint: '这块石蜡：放进那杯水里', onStart: (p) => A.waxDrag(p), onDrag: (p) => A.waxDrag(p), onEnd: () => A.waxDrop() },
      { obj: stickPick, plane: 'xy', offset: 0, hint: '火柴梗：平放进火焰里，约 1 秒后取出', onStart: (p) => A.stickDrag(p), onDrag: (p) => A.stickDrag(p), onEnd: () => A.stickDrop() },
      ...[0, 1].map((k) => ({ obj: bks[k].pick, plane: 'xy', offset: 0, hint: k ? '润湿了澄清石灰水的烧杯：倒扣着罩在火焰上方' : '干燥的烧杯：倒扣着罩在火焰上方', onStart: (p) => A.bDrag(k, p), onDrag: (p) => A.bDrag(k, p), onEnd: () => A.bDrop(k) })),
      { obj: matchPick, plane: 'xy', offset: 0, hint: '燃着的火柴：凑到刚熄灭时冒出的白烟上', onStart: (p) => A.matchDrag(p), onDrag: (p) => A.matchDrag(p), onEnd: () => A.matchDrop() },
    ], { taps: [{ obj: candlePick, hint: () => (S.lit ? '点一下：熄灭蜡烛' : S.out ? '' : '点一下：点燃蜡烛'), onTap: () => A.candleTap() }], tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const inFlame = () => new THREE.Vector3(C.x, FY, 0);
    const over = () => new THREE.Vector3(C.x, FY + 0.04, 0);
    const toSmoke = () => new THREE.Vector3(C.x + 0.004, CH + 0.03, 0);

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'wax', title: '(1) 观察石蜡', todo: '把<b>小刀</b>拖到蜡烛上切下一小块石蜡，再把石蜡放进<b>那杯水</b>里。', target: () => (S.cut ? (S.waxCarry ? null : wax) : S.knifeCarry ? null : knife) },
        { id: 'light', title: '(2) 点燃蜡烛', todo: '点一下<b>蜡烛</b>，点燃它。', target: () => candle },
        { id: 'layers', title: '看火焰分层', todo: '把<b>火柴梗</b>平放进火焰里，约 1 秒后取出，看哪一部分最黑。', target: () => (S.stickCarry ? null : stick) },
        { id: 'cover', title: '罩两个烧杯', todo: '先罩<b>干燥的烧杯</b>，再罩<b>润湿了澄清石灰水的烧杯</b>，看烧杯里的现象。', target: () => (S.bCarry[0] || S.bCarry[1] ? null : S.mist < 0.4 ? bks[0] : bks[1]) },
        { id: 'blow', title: '(3) 熄灭蜡烛', todo: '点一下<b>蜡烛</b>熄灭它，看烛芯上冒出的白烟。', target: () => candle },
        { id: 'relight', title: '点燃白烟', todo: '趁白烟还在，把<b>燃着的火柴</b>凑到白烟上。', target: () => (S.matchCarry ? null : match) },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { smoke.clear(); segs.forEach((m) => m.material.color.set(0xe2c69a)); } }),
          shots: [
            { cap: '(1) 用小刀切下一小块石蜡放进水里：石蜡软，浮在水面上（密度比水小）。', dur: 7, cam: [[-0.05, 0.05, 0.03], [0.04, 0.35, 1], 0.3],
              during: act.seq(act.path(knifePick, [null, new THREE.Vector3(KNIFE.x, CH - 0.01, KNIFE.z), new THREE.Vector3(C.x, CH - 0.01, C.z), new THREE.Vector3(KNIFE.x, CH - 0.01, KNIFE.z), KNIFE.clone()], { t0: 0.03, t1: 0.4, release: 0.42 }), act.drag(waxPick, () => new THREE.Vector3(WB.x, 0.05, WB.z), { t0: 0.5, t1: 0.8, release: 0.82 })) },
            { cap: '(2) 点燃蜡烛，火焰分三层。火柴梗平放进火焰约 1 秒取出：外焰那部分最黑——外焰温度最高。', dur: 8, cam: [[C.x, FY, 0], [0.04, 0.15, 1], 0.18],
              during: act.seq(act.tap(candlePick, 0.05), act.drag(stickPick, inFlame, { t0: 0.2, t1: 0.35, release: 0.6 })) },
            { cap: '罩上干燥的烧杯：内壁出现水雾；罩上润湿了澄清石灰水的烧杯：石灰水变浑浊——蜡烛燃烧生成了水和二氧化碳。', dur: 10, speed: 1.5, cam: [[C.x, FY + 0.03, 0], [0.04, 0.15, 1], 0.24],
              during: act.seq(act.drag(bks[0].pick, over, { t0: 0.03, t1: 0.15, release: 0.45 }), act.drag(bks[1].pick, over, { t0: 0.5, t1: 0.62, release: 0.95 })) },
            { cap: '(3) 熄灭蜡烛，冒出白烟。用燃着的火柴去点白烟：蜡烛重新燃烧了。演示完了，下面换你自己做。', dur: 7, cam: [[C.x, CH + 0.02, 0], [0.04, 0.15, 1], 0.2],
              during: act.seq(act.tap(candlePick, 0.05), act.drag(matchPick, toSmoke, { t0: 0.2, t1: 0.4, release: 0.7 })) },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ================= 每帧 =================
    const step = (h, t) => {
      // 小刀、石蜡
      knife.position.lerp(S.knifeCarry ? S.knifeCarry.clone() : KNIFE, S.knifeCarry ? 0.45 : 0.2);
      wax.visible = S.cut;
      if (S.waxCarry) wax.position.lerp(S.waxCarry, 0.45);
      else if (S.waxAt === 'water') wax.position.lerp(new THREE.Vector3(WB.x, 0.035 + 0.0015 + Math.sin(t * 2) * 0.0004, WB.z), 0.2);          // 浮在水面上
      else wax.position.lerp(new THREE.Vector3(C.x - 0.03, 0.0025, 0.03), 0.3);
      // 蜡烛火焰
      candle.flame.setOn(S.lit); candle.flame.update(t);
      labels.forEach((l, i) => l.loc(group, C.x + [FR * 0.95, FR * 0.5, 0.0005][i] + 0.006, FY + [0.008, 0.0, -0.006][i], 0).show(S.lit && (S.stickCarry != null || nearK === 'flame')));
      // 火柴梗
      if (S.stickCarry) {
        stick.position.lerp(S.stickCarry, 0.5); stick.rotation.z *= 0.8;
        if (S.lit) {
          let any = false;
          segs.forEach((m, i) => { const x = stick.position.x + m.position.x - C.x, y = stick.position.y - FY, T = fT(x, y); if (T > 0) { any = true; S.char[i] = Math.min(1, S.char[i] + T * h * 0.9); } });
          if (any) { S.inT += h; if (!S.logged.char) near('flame', [C.x, FY, 0], [0.04, 0.12, 1], 0.14); }
        }
      } else stick.position.lerp(STICK_HOME, 0.2);
      segs.forEach((m, i) => m.material.color.set(0xe2c69a).lerp(new THREE.Color(0x2a1c14), S.char[i]));
      // 两个烧杯
      bks.forEach((b, k) => {
        if (S.bCarry[k]) {
          const at = Math.abs(S.bCarry[k].x - C.x) < 0.015 && S.bCarry[k].y > FY + 0.015 && S.bCarry[k].y < FY + 0.07;
          b.position.lerp(at ? over() : S.bCarry[k].clone(), 0.35); b.rotation.z += (Math.PI - b.rotation.z) * 0.25;
          if (at && S.lit) {
            if (k === 0) { S.mist = Math.min(1, S.mist + h * 0.3); if (S.mist > 0.4 && !S.logged.mist) { S.logged.mist = true; log(['(2) 罩一个干燥的烧杯', '烧杯内壁出现<b>水雾</b>', '蜡烛燃烧生成了<b>水</b>']); status('干燥的烧杯内壁出现了<b>水雾</b>：蜡烛燃烧生成了水。再罩<b>润湿了澄清石灰水</b>的烧杯。'); } }
            else { S.milk = Math.min(1, S.milk + h * 0.3); if (S.milk > 0.4 && !S.logged.milk) { S.logged.milk = true; done('cover'); log(['(2) 罩一个润湿了澄清石灰水的烧杯', '石灰水<b>变浑浊</b>', '蜡烛燃烧生成了<b>二氧化碳</b>']); status('石灰水<b>变浑浊</b>了：蜡烛燃烧生成了二氧化碳。' + (S.demo ? '' : '最后，点一下蜡烛<b>熄灭</b>它。')); far(); } }
            if (!S.logged.milk) near('cover', [C.x, FY + 0.03, 0], [0.04, 0.12, 1], 0.2);
          }
        } else { b.position.lerp(b.HOME, 0.25); b.rotation.z += (0 - b.rotation.z) * 0.25; }
        b.coat.material.opacity = (k ? S.milk : S.mist * 0.8) * 0.55;
        if (!k && !S.bCarry[0]) S.mist = Math.max(0, S.mist - h * 0.005);
      });
      // 熄灭后的白烟；火柴凑上去点燃
      if (S.smokeT > 0) S.smokeT -= h;
      smoke.update(h, { rate: S.smokeT > 0 ? 14 : 0, origin: S.smokeT > 0 ? new THREE.Vector3(C.x, CH + 0.004, 0) : null, spread: 0.002, up: 0.02, size: 0.005, life: 2 });
      match.setState(S.matchCarry || S.out ? 'flame' : 'none', 0.8); match.update(t);
      if (S.matchCarry) {
        match.position.lerp(S.matchCarry, 0.45); match.rotation.z += (-0.3 - match.rotation.z) * 0.3;
        const tip = match.position.clone();
        if (S.out && !S.relit && S.smokeT > 0 && Math.abs(tip.x - C.x) < 0.01 && tip.y > CH + 0.008 && tip.y < CH + 0.06) {
          S.relit = true; S.lit = true; S.out = false; S.smokeT = 0; done('relight'); sfx.whoosh?.({ freq: 600, gain: 0.07, dur: 0.3 });
          log(['(3) 熄灭蜡烛，用燃着的火柴去点白烟', '火焰顺着白烟<b>跳下去</b>，蜡烛重新燃烧', '白烟是石蜡固体小颗粒，<b>能燃烧</b>']);
          status('火焰顺着白烟“跳”了下去，蜡烛<b>重新燃烧</b>了：白烟是石蜡蒸气凝成的石蜡固体小颗粒，能燃烧。'); W?.t1.open();
        }
      } else { match.position.lerp(MATCH_HOME, 0.2); match.rotation.z += (-Math.PI / 2 - match.rotation.z) * 0.2; }
      cards.c.text(`<div class="cc"><div class="cc-t"><span class="cc-name">蜡烛</span>${S.lit ? '<span class="cc-res burn">燃烧</span>' : S.smokeT > 0 ? '<span class="cc-res">白烟</span>' : ''}</div></div>`).loc(group, C.x, CH, 0).show(S.lit || S.smokeT > 0);
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.39, d: 0.14, h: 0.14 },
      view: { elev: 16, azim: -4, lookY: 0.45, frameMargin: 1.06 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = () => [...W.tbl.el.querySelectorAll('tbody tr')].map((tr) => `<div>${tr.children[0].innerHTML}：${tr.children[1].innerHTML}</div>`).join('');
        const t2 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '蜡烛燃烧时，哪些是物理变化、哪些是化学变化？',
          options: ['石蜡受热熔化是物理变化；燃烧生成水和二氧化碳是化学变化', '都是物理变化', '都是化学变化'],
          wrong: ['燃烧生成了水和二氧化碳——生成了新物质。', '石蜡熔化只是从固体变成液体，没有生成新物质。'],
          ok: '对：有没有生成新物质，是区别物理变化和化学变化的依据。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); } });
        const t1 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '加热一样东西（比如试管），应该用火焰的哪一层？',
          options: ['外焰：温度最高', '焰心', '内焰'],
          wrong: ['看你的火柴梗：中间（焰心）几乎没变。', '内焰的那部分不如外焰黑。'],
          ok: '对：<b>外焰</b>温度最高，加热时要用外焰。',
          onOk: () => t2.open() });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['实验步骤', '对现象的描述', '说明']);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：火柴梗变黑的快慢按火焰三层的相对温度估计（外焰最高）；水雾、浑浊出现的快慢是示意。' });
        ui.controls.append(t1.el, t2.el, next, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, t1, t2, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('桌上一支蜡烛，左边一杯水和一把小刀，前面一根火柴梗、一根燃着的火柴，右边两个烧杯（一个干燥的，一个内壁润湿了澄清石灰水）。按（1）（2）（3）观察。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { bar.dispose(); smoke.dispose(); },
      debug: { get S() { return S; }, A, bar, picks: { knife: knifePick, wax: waxPick, stick: stickPick, b0: bks[0].pick, b1: bks[1].pick, match: matchPick, candle: candlePick },
        qa: qaFlow(drag, [
          { name: '切石蜡', drag: knifePick, to: () => new THREE.Vector3(C.x, CH - 0.01, C.z), wait: 0.5 },
          { name: '放进水里', drag: waxPick, to: () => new THREE.Vector3(WB.x, 0.05, WB.z), wait: 0.5 },
          { name: '点燃', tap: candlePick, wait: 0.5 },
          { name: '拿起火柴梗', hold: stickPick },
          { name: '放进火焰', run: () => A.stickDrag(inFlame()), wait: 1.2 },
          { name: '取出', release: stickPick, wait: 0.5 },
          { name: '拿起干燥烧杯', hold: bks[0].pick },
          { name: '罩上', run: () => A.bDrag(0, over()), wait: 2 },
          { name: '放下', release: bks[0].pick, wait: 0.3 },
          { name: '拿起石灰水烧杯', hold: bks[1].pick },
          { name: '罩上 2', run: () => A.bDrag(1, over()), wait: 2 },
          { name: '放下 2', release: bks[1].pick, wait: 0.3 },
          { name: '熄灭', tap: candlePick, wait: 0.3, scale: 1 },      // 白烟只冒几秒：这几步按真实速度走
          { name: '拿起火柴', hold: matchPick, scale: 1 },
          { name: '凑到白烟', run: () => A.matchDrag(toSmoke()), wait: 0.5, scale: 1 },
          { name: '放下火柴', release: matchPick, wait: 0.5 },
          { name: '答第一题', run: () => W.t1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.t2.el.querySelector('button').click() },
        ]) },
    };
  },
};
