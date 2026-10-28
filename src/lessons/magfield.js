// 图20.1-6 条形磁体磁场的分布 · 实验“研究磁体周围磁场的方向”。
// 甲：在磁体周围放几个小磁针，看 N 极的指向；乙：在磁体上面放一块玻璃板，撒一层铁屑，轻轻敲打玻璃板，铁屑排列起来。
// 直接操作：拖小磁针到任意位置（它会转向）；拖、转磁体（拖两端可以转）；点铁屑瓶撒铁屑；点玻璃板＝轻轻敲一下。
// 面板也能做同样的事，另外可以画出磁感线、换成蹄形磁体。磁场用“磁荷”模型（kit/magnet.js），小磁针还受一点地磁场。
import * as THREE from 'three';
import { seg, buttons, goals, note } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { barMagnet, horseshoe, compass, filings, fieldAt, fieldLines } from './kit/magnet.js';
import { paint, inked, hull } from '../live/ink.js';

const PW = 0.34, PD = 0.22, PY = 0.016;      // 玻璃板
const EARTH = [0, -40];                      // 地磁场（指向 −z，画面里的“北”朝后）

export default {
  id: 'magfield',
  fig: '图20.1-6',
  title: '研究磁体周围磁场的方向',
  stampText: '观察',
  predict: {
    q: '把一个小磁针放在条形磁体 <b>N 极</b>的正前方（沿磁体的轴线）。<br>小磁针的 N 极会指向——',
    hint: '课本第 149 页「实验」',
    options: ['指向磁体（朝着 N 极）', '背离磁体（顺着轴线往外）', '和磁体垂直'],
    answer: 1,
  },
  conclusion: {
    crops: [{ page: 154, rect: [160, 580, 460, 662] }, { page: 155, rect: [62, 408, 362, 580] }],
    quote: '物理学中，把放在磁场中的小磁针静止时北极所指的方向规定为该点磁场的方向。……小磁针（或被磁化后的铁屑）在磁体周围磁场的作用下，有规则地排列起来。……用磁感线描述磁场时，磁体外部的磁感线都是从磁体的 N 极出发，回到 S 极的。',
    why: '磁场看不见、摸不着，但它对放入其中的磁针有力的作用，所以可以用小磁针来“探测”它：不同位置的小磁针指向不同，说明各点磁场的方向不同。铁屑被磁化后就像许多小磁针，敲一敲玻璃板，铁屑能转动，就沿着磁场排成一条条曲线——两极附近铁屑最密，说明那里磁场最强。磁感线是为了描述磁场画出来的线，并不真实存在。',
    src: '课本第 148–149 页 · 第二十章 第1节 磁现象 磁场',
  },

  create({ tag }) {
    const group = new THREE.Group();
    // 玻璃板（架在四个小木块上，比磁体高一点）
    const plate = new THREE.Mesh(new THREE.BoxGeometry(PW, 0.003, PD), paint(0xe6f1f7, { unique: true, transparent: true, opacity: 0.5, depthWrite: false }));
    plate.position.y = PY;
    group.add(plate);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const b = inked(new THREE.Mesh(new THREE.BoxGeometry(0.016, PY - 0.0015, 0.016), paint(0xd9b98a)), { width: 1 }); b.position.set(sx * (PW / 2 - 0.01), (PY - 0.0015) / 2, sz * (PD / 2 - 0.01)); group.add(b); }
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(plate.geometry), new THREE.LineBasicMaterial({ color: 0x8fb6cc }));
    edge.position.copy(plate.position); group.add(edge);
    // 磁体（在玻璃板下面）
    const mags = { bar: barMagnet({ L: 0.1, w: 0.022, h: 0.012 }), shoe: horseshoe({ L: 0.08, gap: 0.04 }) };
    for (const m of Object.values(mags)) { m.position.y = 0.001; group.add(m); }
    let M = mags.bar; mags.shoe.visible = false;
    // 小磁针（在玻璃板上面）
    const ring = [];
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + Math.PI / 8; ring.push([Math.cos(a) * 0.085, Math.sin(a) * 0.06]); }
    const cps = ring.map(([x, z]) => { const c = compass({ r: 0.0105 }); c.position.set(x, PY + 0.0015, z); group.add(c); return c; });
    // 铁屑瓶
    const shaker = new THREE.Group();
    const jar = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 18), paint(0x9aa3b2)), 0.001);
    jar.position.y = 0.02;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.006, 18), paint(0x5b6272)); cap.position.y = 0.043;
    shaker.add(jar, cap);
    shaker.position.set(PW / 2 + 0.04, 0, 0.06);
    group.add(shaker);
    tag('铁屑', 'pill').loc(group, shaker.position.x, 0.005, shaker.position.z + 0.025);
    const fl = filings({ w: PW - 0.01, d: PD - 0.01, n: 2600, y: PY + 0.0018 });
    group.add(fl.mesh);
    let lines = null;
    const S = { lines: false, shaken: false, tapped: 0, seen: new Set(), shakeT: 0, tapT: 0, moved: false };
    let W = null;

    const poles = () => M.poles();
    const inside = (x, z) => M.inside(x, z, 0.003);
    const redrawLines = () => { if (lines) { group.remove(lines); lines = null; } if (S.lines) { lines = fieldLines(poles(), { n: 16, bounds: [-PW / 2, PW / 2, -PD / 2, PD / 2], y: PY + 0.003, inside }); group.add(lines); } };
    const sprinkle = () => { fl.sprinkle(2600); S.shaken = true; S.shakeT = 1; S.tapped = 0; W?.status('撒了一层铁屑，它们乱七八糟地躺着。<b>点一下玻璃板</b>（轻轻敲打），看看会怎样。'); };
    const tap = () => {
      if (!S.shaken) return W?.status('玻璃板上还没有铁屑。先点一下铁屑瓶，撒一层铁屑。');
      fl.tap(poles(), inside); S.tapped++; S.tapT = 1;
      if (S.tapped >= 2) { W?.goal.done('filings'); W?.status('铁屑被磁化，变成一枚枚“小磁针”，敲一敲它们就转起来，沿着磁场排成一条条从一极到另一极的曲线。两极附近最密——那里磁场最强。'); }
      else W?.status('敲了一下：铁屑动了一动。再敲几下。');
    };
    const changed = () => { S.moved = true; S.dropQ?.(); if (S.lines) redrawLines(); if (S.shaken) { fl.sprinkle(fl.shown); S.tapped = 0; } };

    // ---- 直接操作 ----
    const drags = cps.map((c) => ({ obj: c, plane: 'xz', offset: PY, keepOffset: true, hint: '拖到别的位置', onStart: () => S.dropQ?.(), onDrag: (p) => { c.position.set(clamp(p.x, -PW / 2 + 0.012, PW / 2 - 0.012), PY + 0.0015, clamp(p.z, -PD / 2 + 0.012, PD / 2 - 0.012)); S.cpMoved = true; }, onEnd: (moved) => { if (moved) S.later = { c, t: 1.3 }; } }));
    // 这枚小磁针的 N 极（=这一点的磁场方向）是：背离磁体、指向磁体，还是和磁体平行？按真实的磁场方向判
    const kindAt = (c) => {
      const P = poles(), n = P.filter((q) => q.q > 0), sp = P.filter((q) => q.q < 0);
      const avg = (a) => new THREE.Vector2(a.reduce((t, q) => t + q.x, 0) / a.length, a.reduce((t, q) => t + q.z, 0) / a.length);
      const N = avg(n), Sp = avg(sp), ctr = N.clone().add(Sp).multiplyScalar(0.5);
      const [bx, bz] = fieldAt(P, c.position.x, c.position.z);
      const f = new THREE.Vector2(bx, bz).normalize(), r = new THREE.Vector2(c.position.x, c.position.z).sub(ctr).normalize();
      const d = f.dot(r);
      return d > 0.62 ? 'out' : d < -0.62 ? 'in' : Math.abs(d) < 0.3 ? 'par' : null;
    };
    let grab = null;
    for (const m of Object.values(mags)) drags.push({ obj: m, plane: 'xz', offset: 0.006, keepOffset: true, hint: '拖中间：移动；拖一端：转动',
      onDrag: (p) => {
        if (!grab) return;
        if (grab.rot) { const c = M.position; M.rotation.y = -Math.atan2(p.z - c.z, p.x - c.x) + (grab.end || 0); }
        else M.position.set(clamp(p.x, -0.1, 0.1), 0.001, clamp(p.z, -0.06, 0.06));
        changed();
      } });
    const pointer = draggable(group, drags, { tip: tag('', 'pill'), taps: [{ obj: shaker, hint: '点一下：在玻璃板上撒铁屑', onTap: sprinkle }, { obj: plate, hint: () => (S.shaken ? '点一下：轻轻敲打玻璃板' : '玻璃板（先撒铁屑）'), onTap: tap }] });
    // 拖磁体时：抓中间是移动，抓一端是转动（记住抓的是哪一端，转动时那一端跟着鼠标）
    for (const d of drags.slice(cps.length)) d.onStart = (p) => {
      if (!p) return; const l = M.worldToLocal(group.localToWorld(p.clone()));
      grab = { rot: Math.abs(l.x) > 0.028, end: l.x < 0 ? Math.PI : 0 };
    };

    return {
      group,
      size: { w: 0.42, d: 0.24, h: 0.06 },
      view: { elev: 62, azim: 0, lookY: 0.2, margin: 1.05 },
      pointer,
      mount(ui) {
        const kind = seg('磁体', ['条形磁体', '蹄形磁体'], (_, k) => { M.visible = false; M = k ? mags.shoe : mags.bar; M.visible = true; M.position.set(0, 0.001, 0); M.rotation.y = 0; changed(); if (k) W.goal.done('shoe'); });
        const ln = seg('磁感线', ['不画', '画出来'], (_, k) => { S.lines = !!k; redrawLines(); if (k) W.goal.done('lines'); });
        const btns = buttons([
          { text: '撒铁屑', ghost: true, onClick: sprinkle },
          { text: '轻敲玻璃板', ghost: true, onClick: tap },
          { text: '扫掉铁屑', ghost: true, onClick: () => { fl.clear(); S.shaken = false; } },
          { text: '小磁针放回一圈', ghost: true, onClick: () => cps.forEach((c, k) => c.position.set(ring[k][0], PY + 0.0015, ring[k][1])) },
        ]);
        ui.controls.append(note('<b>拖小磁针</b>放到磁体周围不同的地方；<b>拖磁体</b>移动它（拖一端可以转）。<b>点铁屑瓶</b>撒铁屑，<b>点玻璃板</b>轻轻敲一敲。面板按钮也能做这些。'), kind.el, btns.el, ln.el);
        const KIND = { out: '背离磁体（指向外面）', in: '指向磁体', par: '大致和磁体平行' };
        const cpQ = buttons(['out', 'in', 'par'].map((k) => ({ text: `N 极${KIND[k]}`, ghost: true, onClick: () => {
          const q = S.q; if (!q) return;
          if (k !== q.right) return ui.status('再看看这枚小磁针<b>红色</b>的一端（N 极）指向哪里。');
          cpQ.el.hidden = true; S.q = null; S.kinds.add(q.right);
          if (S.kinds.size >= 3 && !S.seen.has('compass')) { S.seen.add('compass'); W.goal.done('compass'); ui.status('三种情况你都认出来了：小磁针在不同位置，N 极指向不同——靠近 N 极的地方背离磁体，靠近 S 极的地方指向磁体，在磁体旁边中间的地方和磁体平行（从 N 端指向 S 端）。小磁针静止时 N 极所指的方向，就是那一点<b>磁场的方向</b>。'); }
          else ui.status(`对。已经认出 ${S.kinds.size} 种情况。${S.kinds.size < 3 ? '再把小磁针拖到别的地方（' + ['out', 'in', 'par'].filter((x) => !S.kinds.has(x)).map((x) => KIND[x]).join('、') + '的地方还没找到）。' : ''}`);
        } })));
        cpQ.el.hidden = true;
        ui.controls.prepend(cpQ.el);
        S.kinds = new Set();
        S.dropQ = () => { if (S.q) { S.q = null; cpQ.el.hidden = true; } };
        W = { askCp: (c) => {
          if (M !== mags.bar || S.seen.has('compass')) return;
          const k = kindAt(c);
          if (!k) return ui.status('这个位置的指向不太好判断，再换个地方放（比如靠近一端，或者磁体正侧面）。');
          S.q = { right: k }; cpQ.el.hidden = false;
          ui.status('等小磁针停稳。它的 <b>N 极（红色）</b>指向哪里？');
        }, status: (m) => ui.status(m), goal: goals(ui, [['compass', '把小磁针挪到不同位置，认出 N 极的三种指向'], ['filings', '撒铁屑，轻敲玻璃板'], ['lines', '画出磁感线，和铁屑、小磁针对照'], ['shoe', '换成蹄形磁体再看看']]) };
        ui.status('条形磁体周围放了一圈小磁针。红色一端是 N 极。<b>拖动小磁针</b>到别处，看它的 N 极指向哪里。');
      },
      update(dt) {
        const P = poles();
        for (const c of cps) {
          const [bx, bz] = fieldAt(P, c.position.x, c.position.z);
          c.update([bx * 1, bz * 1], dt, EARTH);
        }
        if (S.later) { S.later.t -= dt; if (S.later.t <= 0) { const c = S.later.c; S.later = null; W?.askCp(c); } }
        fl.update(dt);
        // 敲击时玻璃板抖一下
        S.tapT = Math.max(0, S.tapT - dt * 5);
        plate.position.y = PY + Math.sin(S.tapT * 30) * 0.0008 * S.tapT;
        S.shakeT = Math.max(0, S.shakeT - dt * 3);
        shaker.rotation.z = Math.sin(S.shakeT * 20) * 0.4 * S.shakeT + (S.shakeT > 0 ? 1.2 : 0);
        shaker.position.y = S.shakeT > 0 ? 0.05 : 0;
      },
      debug: { S, sprinkle, tap, cps },
    };
  },
};
