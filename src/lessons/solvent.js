// 课题1 溶液及其应用 · 实验 9-2 碘和高锰酸钾的溶解性比较（课本下册第 31 页图 9-3）。
//
// 四支试管：两支各一小粒碘，两支各一小粒高锰酸钾。分别加入 5 mL 水和 5 mL 汽油，振荡，观察。
// 结果（照课本照片）：碘 + 水：几乎不溶，水几乎无色，碘粒还在；碘 + 汽油：溶解，溶液呈红色（紫红）；
//   高锰酸钾 + 水：溶解，紫色；高锰酸钾 + 汽油：几乎不溶，汽油无色，晶粒还在。
// 模型：每支试管的溶解快慢（振荡时快）× 能溶解的程度（易溶 1、几乎不溶 0.03）；颜色深浅跟着溶解的量。
import * as THREE from 'three';
import { buttons, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { textPlate } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { testTube, glassMat, CHEM } from './kit/chem.js';
import { water2 } from './kit/chemfx.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { bottleCap } from './kit/labops.js';
import { sfx } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const XS = [-0.066, -0.022, 0.022, 0.066], T_R = 0.0085, T_LEN = 0.11, T_Y = 0.012;
const SOLUTE = ['I', 'I', 'K', 'K'], SOLV = ['水', '汽油', '水', '汽油'];
const NAME = { I: '碘', K: '高锰酸钾' };
const SOLU = { 'I水': 0.03, 'I汽油': 1, 'K水': 1, 'K汽油': 0.03 };
const COLOR = { 'I水': 0xd9c48a, 'I汽油': 0xc4303a, 'K水': 0x5a1a6a, 'K汽油': 0xe8e4d8 };
const LIQ0 = { 水: 0xe4eef2, 汽油: 0xf0ecd8 };
const BOT = { 水: new THREE.Vector3(0.13, 0, 0.03), 汽油: new THREE.Vector3(0.175, 0, 0.03) };
const LIQ_H = (5e-6) / (Math.PI * (T_R - 0.0008) ** 2);

export default {
  id: 'solvent',
  fig: '图9-3',
  title: '碘和高锰酸钾的溶解性比较',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '碘和高锰酸钾分别放进水和汽油里，哪两个组合能溶解？',
    hint: '课本第 31 页实验 9-2。',
    options: ['碘溶于汽油，高锰酸钾溶于水', '碘溶于水，高锰酸钾溶于汽油', '都溶于水', '都溶于汽油'],
    answer: 0,
  },
  need: '两粒碘、两粒高锰酸钾，分别加入 5 mL 水和 5 mL 汽油，振荡，观察并记录',
  conclusion: {
    crops: [{ page: 35, rect: [63, 258, 382, 533] }],
    quote: '水是一种最常用的溶剂，能溶解很多种物质。汽油、酒精等也可以作溶剂，如汽油能溶解油脂，酒精能溶解碘，等等。',
    why: '碘几乎不溶于水，却能溶于汽油（溶液呈紫红色）；高锰酸钾易溶于水（紫色），却几乎不溶于汽油。<br>同一种物质在不同的溶剂里，溶解性不同；不同的物质在同一种溶剂里，溶解性也不同——物质的溶解性和<b>溶质</b>、<b>溶剂</b>的性质都有关。',
    src: '课本下册第 31 页 · 第九单元 课题1 溶液及其应用（实验 9-2）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); else bar.caption(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };

    paperSheet(group, { w: 0.34, d: 0.16, x: 0.04, z: 0.02 });

    const rackM = paint(0xd9c9a6);
    const base = inked(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.008, 0.034), rackM), { width: 0.7 }); base.position.y = 0.004; group.add(base);
    for (const sx of [-1, 1]) { const p = inked(new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.065, 0.028), rackM), { width: 0.6 }); p.position.set(sx * 0.087, 0.04, 0); group.add(p); }
    const top = inked(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.004, 0.022), rackM), { width: 0.6 }); top.position.set(0, 0.07, -0.008); group.add(top);
    const tubes = XS.map((x, k) => {
      const g = new THREE.Group(); g.position.set(x, T_Y, 0); group.add(g);
      const t = testTube({ r: T_R, len: T_LEN }); g.add(t);
      const grain = inked(new THREE.Mesh(new THREE.DodecahedronGeometry(0.0025, 0), paint(SOLUTE[k] === 'I' ? 0x3a3440 : 0x3a1640, { keep: true })), { width: 0.4 }); grain.position.y = 0.003; g.add(grain);
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(T_R - 0.0008, T_R - 0.0008, 1, 18), water2({ color: 0xe4eef2, base: 0.45 })); liq.geometry.translate(0, 0.5, 0); liq.position.y = 0.0012; liq.scale.y = 0.0001; liq.visible = false; liq.renderOrder = 9.6; g.add(liq);
      const lab = textPlate(`${NAME[SOLUTE[k]]}`, { w: 0.022, h: 0.0075, color: '#23293a', bg: '#fffaf0', font: 'bold 80px "Songti SC", serif' }); lab.position.set(x, 0.004 - T_Y + T_Y, 0.0182); group.add(lab);
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, T_LEN, 8), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = T_LEN / 2; pick.userData.pick = true; g.add(pick);
      return Object.assign(g, { grain, liq, pick });
    });
    const MOUTH = (k) => new THREE.Vector3(XS[k], T_Y + T_LEN, 0);
    // 两个细口瓶（水、汽油）——转轴在瓶口；瓶塞塞着，倒的时候拿下来倒放在瓶前的桌上，放回原处后再塞好（课本上册第 17 页）
    const BH = 0.06, bottles = {};
    for (const nm of ['水', '汽油']) {
      const piv = new THREE.Group(); group.add(piv);
      const b = new THREE.Group(); b.position.y = -BH; piv.add(b);
      const body = new THREE.Mesh(new THREE.LatheGeometry([[0.0003, 0], [0.015, 0], [0.016, 0.003], [0.016, 0.038], [0.008, 0.048], [0.0055, 0.052], [0.0055, BH]].map(([r, y]) => new THREE.Vector2(r, y)), 28), glassMat({ opacity: 0.3 })); body.renderOrder = 9; b.add(body);
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.0145, 0.0145, 0.028, 22), water2({ color: LIQ0[nm], base: 0.35 })); liq.position.y = 0.016; liq.renderOrder = 7; b.add(liq);
      const lab = textPlate(nm, { w: nm === '水' ? 0.01 : 0.016, h: 0.0085, color: '#23293a', bg: '#fffaf0', font: 'bold 96px "Songti SC", serif' }); lab.position.set(0, 0.024, 0.0163); b.add(lab);
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, BH, 10), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = BH / 2; pick.userData.pick = true; b.add(pick);
      const plug = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0055, 0.008, 16), paint(0xeef1f3)), { width: 0.5 }); plug.position.y = BH + 0.003; b.add(plug);
      piv.HOME = BOT[nm].clone().add(new THREE.Vector3(0, BH, 0)); piv.position.copy(piv.HOME); piv.pick = pick; piv.plug = plug;
      piv.cap = bottleCap(group, b, plug, { rest: BOT[nm].clone().add(new THREE.Vector3(0, 0, 0.036)) });
      bottles[nm] = piv;
    }
    // 瓶塞拔出来、挪开了（离瓶口 1.2 cm 以上）：瓶子这才跟着手走、才能倒
    const plugClear = (piv) => piv.plug.parent === group && Math.hypot(piv.plug.position.x - piv.position.x, piv.plug.position.z - piv.position.z) > 0.012;
    const drops = new Particles({ max: 60, geometry: new THREE.SphereGeometry(1, 6, 5), material: water2({ color: 0xe4eef2, base: 0.5 }) }); group.add(drops.mesh);
    const cards = XS.map(() => { const c = tag('', 'cond'); c.px = [0, -64]; return c; });
    // 倒错了溶剂：照样倒进去（做错有真实的后果），那支试管上出现“倒掉，重加”——像实验室里一样倒掉、换一粒新的再加（反馈 2026-11-14：操作错了没法后退）
    const dumps = XS.map((_, k) => tag('倒掉，重加', 'pill', () => A.dump(k)));
    const isWrong = (k) => !!S.t[k].solv && S.t[k].solv !== SOLV[k];
    const twinOf = (k) => SOLUTE.findIndex((s, j) => j !== k && s === SOLUTE[k]);          // 同一种溶质的另一支：本来要和它比
    const wrongPour = (k, nm) => status(`第 ${k + 1} 支该加<b>${SOLV[k]}</b>：${NAME[SOLUTE[k]]}加${nm}是第 ${twinOf(k) + 1} 支做的，这样比不出${NAME[SOLUTE[k]]}在${SOLV[k]}里怎样。点试管上的“倒掉，重加”。`);
    const rowOf = (k) => { const T = S.t[k], ok = SOLU[SOLUTE[k] + T.solv] >= 1; return [NAME[SOLUTE[k]], T.solv, ok ? `溶解，溶液呈<b>${SOLUTE[k] === 'I' ? '紫红色' : '紫色'}</b>` : `<b>几乎不溶</b>，${T.solv}几乎无色，固体还在`]; };

    const fresh = () => ({ demo: false, t: XS.map(() => ({ v: 0, solv: null, dis: 0, shake: 0, logged: false, seen: 0, drain: 0 })), logs: [], carry: null, carryN: null, tilt: 0 });
    S = fresh();

    const A = {
      bDrag(nm, p) { if (!p) return; S.carry = p.clone(); S.carryN = nm; },
      bDrop() { S.carry = null; },
      shakeTap(k) { const T = S.t[k]; if (T.drain) return; if (T.v < 2) return status('先往这支试管里加 5 mL 溶剂。'); T.shake = 1; sfx.clink({ freq: 1700, gain: 0.02 }); },
      dump(k) { const T = S.t[k]; if (!T.solv || T.drain) return; T.drain = 1e-4; },
      // 倒空以后：这支回到刚开始的样子（新的一粒溶质），记录里删掉它那一行
      emptied(k) {
        const T = S.t[k], was = T.logged;
        Object.assign(T, { v: 0, solv: null, dis: 0, shake: 0, seen: 0, logged: false, drain: 0 });
        if (was && !S.demo) { S.logs = S.logs.filter((j) => j !== k); W?.tbl.clear(); for (const j of S.logs) W?.tbl.add(rowOf(j), { highlight: false }); bar.undo('shake', 'why'); if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; } }
        status(`倒掉了，换了一粒新的${NAME[SOLUTE[k]]}。往第 ${k + 1} 支加 5 mL <b>${SOLV[k]}</b>。`);
      },
      reset() { S = fresh(); drops.clear(); W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; } bar.undo('add', 'shake', 'why'); status('全部重新摆好了，记录也清空了。'); },
    };
    const drag = draggable(group, ['水', '汽油'].map((nm) => ({ obj: bottles[nm].pick, plane: 'xy', offset: 0, hint: `${nm}：拖到试管口，倒 5 mL（第一、三支加水，第二、四支加汽油）`, onStart: (p) => A.bDrag(nm, p), onDrag: (p) => A.bDrag(nm, p), onEnd: () => A.bDrop() })),
      { taps: tubes.map((tb, k) => ({ obj: tb.pick, hint: () => (S.t[k].v >= 2 ? '点一下：振荡' : ''), onTap: () => A.shakeTap(k) })), tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const pourAt = (k) => () => MOUTH(k).add(new THREE.Vector3(0.004, -(BH - 0.03) + 0.004, 0));

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'add', title: '加入溶剂', todo: '把<b>水</b>倒进第 1、3 支试管，把<b>汽油</b>倒进第 2、4 支试管，各约 5 mL。', target: () => (S.carry ? null : bottles[S.t[0].v < 4.5 || S.t[2].v < 4.5 ? '水' : '汽油']) },
        { id: 'shake', title: '振荡', todo: '点一下每支试管：<b>振荡</b>。观察并记录。', target: () => tubes[S.t.findIndex((T) => !T.logged)] || null },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => drops.clear() }),
          shots: [
            { cap: '两支试管各加一小粒碘，两支各加一小粒高锰酸钾。往第 1、3 支加 5 mL 水。', dur: 7, cam: [[0.02, 0.08, 0], [0.05, 0.22, 1], 0.36],
              during: act.seq(act.drag(bottles['水'].pick, pourAt(0), { t0: 0.04, t1: 0.25, release: 0.48 }), act.drag(bottles['水'].pick, pourAt(2), { t0: 0.52, t1: 0.72, release: 0.96 })) },
            { cap: '往第 2、4 支加 5 mL 汽油。', dur: 7, cam: [[0.02, 0.08, 0], [0.05, 0.22, 1], 0.36],
              during: act.seq(act.drag(bottles['汽油'].pick, pourAt(1), { t0: 0.04, t1: 0.25, release: 0.48 }), act.drag(bottles['汽油'].pick, pourAt(3), { t0: 0.52, t1: 0.72, release: 0.96 })) },
            { cap: '振荡：碘溶于汽油（紫红色），几乎不溶于水；高锰酸钾溶于水（紫色），几乎不溶于汽油。演示完了，下面换你自己做。', dur: 8, cam: [[0, 0.06, 0], [0.05, 0.2, 1], 0.3], during: act.seq(...[0, 1, 2, 3].map((k) => act.tap(tubes[k].pick, 0.05 + k * 0.1))) },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    const step = (h, t) => {
      for (const nm of ['水', '汽油']) {
        const piv = bottles[nm];
        // 瓶塞：拿起瓶子时拔下来倒放在桌上；瓶子放回原处、摆正以后再塞好
        const held = S.carry && S.carryN === nm, atHome = !held && piv.position.distanceTo(piv.HOME) < 0.0015 && Math.abs(piv.rotation.z) < 0.02;
        piv.cap.update(1 - Math.exp(-h * 10), !atHome);
        if (held && !plugClear(piv)) { piv.position.lerp(piv.HOME, 0.25); piv.rotation.z *= 0.8; S.tilt *= 0.8; }          // 瓶塞还没拿开：瓶子先留在桌上
        else if (held) {
          const mouth = S.carry.clone().add(new THREE.Vector3(0, BH - 0.03, 0));
          const k = XS.findIndex((x) => Math.abs(mouth.x - x) < 0.02 && Math.abs(mouth.y - (T_Y + T_LEN)) < 0.03);
          const ok = k >= 0 && !S.t[k].drain && S.t[k].v < 5 && (!S.t[k].solv || S.t[k].solv === nm);
          piv.position.lerp(ok ? MOUTH(k).add(S.tilt > 1.3 ? new THREE.Vector3(0.005, 0.004, 0) : new THREE.Vector3(0.014, 0.035, 0)) : k >= 0 ? MOUTH(k).add(new THREE.Vector3(0.014, 0.07, 0)) : mouth, 0.3);
          S.tilt += ((ok ? 1.85 : 0) - S.tilt) * Math.min(1, h * 4); piv.rotation.z = S.tilt;
          // 瓶口真到了这支试管口才倒（拿着从别的试管上方经过时不倒）
          if (ok && S.tilt > 1.5 && piv.position.distanceTo(MOUTH(k).add(new THREE.Vector3(0.005, 0.004, 0))) < 0.005) { const T = S.t[k]; if (!T.solv && SOLV[k] !== nm) wrongPour(k, nm); T.solv = nm; T.v = Math.min(5, T.v + 4 * h); if (Math.random() < h * 25) drops.spawn({ p: MOUTH(k).add(new THREE.Vector3(0.003, 0, 0)), v: new THREE.Vector3(0, -0.05, 0), size: 0.0011, life: 0.8 }); if (S.t.every((x, j) => x.v >= 4.9 && x.solv === SOLV[j])) done('add'); }
        } else { piv.position.lerp(piv.HOME, 0.25); if (S.carryN !== nm || !S.carry) { piv.rotation.z *= 0.8; } }
      }
      if (!S.carry) S.tilt *= 0.8;
      drops.update(h, (p, d) => { p.v.y -= 0.5 * d; p.p.addScaledVector(p.v, d); return p.p.y > T_Y + 0.01; });
      S.t.forEach((T, k) => {
        const tb = tubes[k], key = SOLUTE[k] + (T.solv || ''), sol = T.solv ? SOLU[key] : 0;
        T.shake = Math.max(0, T.shake - h * 0.6);
        if (T.v > 2 && sol) T.dis += (sol - T.dis) * Math.min(1, (0.02 + 0.6 * T.shake) * h);
        tb.rotation.z = T.shake > 0 ? Math.sin(t * 30) * 0.12 * T.shake : 0;
        tb.liq.visible = T.v > 0.1; tb.liq.scale.y = Math.max(0.0001, LIQ_H * T.v / 5);
        if (T.solv) tb.liq.material.color.set(LIQ0[T.solv]).lerp(new THREE.Color(COLOR[key]), clamp(T.dis * 1.1, 0, 1));
        tb.liq.material.opacity = 0.5 + 0.45 * (sol >= 1 ? T.dis : 0); tb.liq.material.transparent = true;
        tb.grain.scale.setScalar(Math.max(0.05, 1 - (sol >= 1 ? T.dis : 0)));
        tb.grain.visible = !(sol >= 1 && T.dis > 0.95);
        tb.position.y = T_Y; tb.rotation.x = 0;
        if (T.drain) {
          // 倒掉：从架子上提起来，往后倒过来倒空，放回原处，再放一粒新的（1.4 秒）
          T.drain = Math.min(1, T.drain + h / 1.4);
          const u = T.drain, sm = THREE.MathUtils.smoothstep;
          const lift = sm(u, 0, 0.22) * (1 - sm(u, 0.8, 1)), tip = sm(u, 0.2, 0.42) * (1 - sm(u, 0.6, 0.8));
          tb.position.y = T_Y + lift * 0.095; tb.rotation.x = -tip * 2.3; tb.rotation.z = 0;
          if (tip > 0.75 && T.v > 0) {
            T.v = Math.max(0, T.v - h * 16);
            const a = tip * 2.3, mouth = new THREE.Vector3(XS[k], tb.position.y + T_LEN * Math.cos(a), -T_LEN * Math.sin(a));
            if (Math.random() < h * 50) drops.spawn({ p: mouth, v: new THREE.Vector3(0, -0.04, -0.02), size: 0.0012, life: 0.6 });
          }
          tb.grain.visible = u < 0.4 || u > 0.85; if (u > 0.85) tb.grain.scale.setScalar(Math.max(0.05, sm(u, 0.85, 1)));
          if (u >= 1) A.emptied(k);
        }
        if (T.v >= 4.9 && T.shake > 0) T.seen += h;          // 振荡的整段都算（以前到 0.05 就停，一次振荡只攒到 1.46 秒左右，帧率低时差一点到不了 1.5 秒，记不下来）
        if (T.seen > 1.5 && !T.logged) {
          T.logged = true;
          const ok = sol >= 1;
          if (!S.demo) S.logs.push(k);
          log(rowOf(k));
          status(`${NAME[SOLUTE[k]]} + ${T.solv}：${ok ? '溶解了' : '几乎不溶'}。`);
          // 四支都记下了：溶质、溶剂两两配齐，才能比——有一支加错了，就还比不出来
          if (S.t.every((x, j) => x.logged && x.solv === SOLV[j])) { done('shake'); W?.t1.open(); }
          else if (S.t.every((x) => x.logged)) { const j = S.t.findIndex((_, i) => isWrong(i)); status(`第 ${j + 1} 支加的是${S.t[j].solv}：${NAME[SOLUTE[j]]}在${SOLV[j]}里怎样还没做，比不出来。点它上面的“倒掉，重加”。`); }
        }
        const warn = isWrong(k) ? `<span class="cc-res" style="color:#b0391f">该加${SOLV[k]}</span>` : '';
        cards[k].text(`<div class="cc"><div class="cc-t"><span class="cc-name">${NAME[SOLUTE[k]]} + ${T.solv || '？'}</span>${T.logged ? `<span class="cc-res">${sol >= 1 ? '溶解' : '几乎不溶'}</span>` : ''}${warn}</div></div>`).loc(group, XS[k], T_Y + T_LEN, 0).show(T.v > 0.5);
        dumps[k].loc(group, XS[k], T_Y + T_LEN * 0.45, 0.014).show(!S.demo && isWrong(k) && !T.drain);
      });
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.39, d: 0.12, h: 0.15 },
      view: { elev: 16, azim: -4, lookY: 0.44, frameMargin: 1.06 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = () => [...W.tbl.el.querySelectorAll('tbody tr')].map((tr) => `<div>${tr.children[0].innerHTML} + ${tr.children[1].innerHTML}：${tr.children[2].innerHTML}</div>`).join('');
        const t2 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '衣服上沾了油污，用水洗不掉，可以用汽油洗掉。为什么？',
          options: ['油污能溶解在汽油里，不易溶于水', '汽油的温度比水高', '汽油把油污烧掉了'],
          wrong: ['和温度无关。', '洗的时候没有燃烧。'],
          ok: '对：溶解性和溶剂有关——油脂能溶于汽油。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); } });
        const t1 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '由这四支试管能得出什么结论？',
          options: ['物质的溶解性和溶质、溶剂的性质都有关', '水能溶解所有物质', '汽油不能作溶剂'],
          wrong: ['碘几乎不溶于水。', '碘能溶于汽油：汽油也能作溶剂。'],
          ok: '对：同一溶质在不同溶剂里、不同溶质在同一溶剂里，溶解性都不同。',
          onOk: () => t2.open() });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['溶质', '溶剂', '现象']);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：颜色照课本图 9-3；溶解的快慢是示意（振荡时快）。' });
        ui.controls.append(t1.el, t2.el, next, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, t1, t2, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('图 9-3：试管架上四支试管——前两支各一小粒碘，后两支各一小粒高锰酸钾；右边一瓶水、一瓶汽油。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { bar.dispose(); drops.dispose(); },
      debug: { get S() { return S; }, A, bar, picks: { w: bottles['水'].pick, g: bottles['汽油'].pick }, plugW: bottles['水'].plug, plugG: bottles['汽油'].plug,
        qa: qaFlow(drag, [
          ...[[0, '水'], [2, '水'], [1, '汽油'], [3, '汽油']].flatMap(([k, nm]) => [{ name: `拿${nm} ${k}`, hold: bottles[nm].pick }, { name: `倒 ${k}`, run: () => A.bDrag(nm, pourAt(k)()), wait: 2.2 }, { name: `放 ${k}`, release: bottles[nm].pick, wait: 0.4 }]),
          ...[0, 1, 2, 3].map((k) => ({ name: `振荡 ${k}`, tap: tubes[k].pick, wait: 0.3 })),
          { name: '等', run: () => {}, wait: 3 },
          { name: '答第一题', run: () => W.t1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.t2.el.querySelector('button').click() },
        ]) },
    };
  },
};
