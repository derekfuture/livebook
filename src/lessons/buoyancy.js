// 图10.1-5 探究浮力的大小与哪些因素有关。弹簧测力计下挂一个圆柱体（侧面画着刻线），先在空气中测出重力 G，
// 再把它逐渐浸入液体中，读测力计的示数 F，浮力 F浮 = G − F。
//   1 逐渐增大浸在液体中的体积  2 浸没后改变深度（检验“与深度有关”的猜想）  3 浸没在不同的液体中
// 物理：F浮 = ρ液 g V排；液面会随圆柱体浸入而升高（按烧杯截面积算）。圆柱体 G = 3.0 N，体积 100 cm³，高 8 cm。
import * as THREE from 'three';
import { seg, buttons, goals, note, table, guard } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { beaker, stand, canvasTex } from './kit/props.js';
import { forceMeter } from './kit/forcemeter.js';
import { paint, hull } from '../live/ink.js';

const G0 = 3.0, V = 100e-6, CH = 0.08, CR = Math.sqrt(V / CH / Math.PI);   // 圆柱体
const LIQ = [{ label: '水', rho: 1000, color: 0x9fd3ec }, { label: '酒精', rho: 800, color: 0xd8ecf2 }, { label: '盐水', rho: 1200, color: 0x8cc6e0 }];
const BR = 0.045, BH = 0.21, L0 = 0.15, BX = 0;      // 杯子够深：圆柱体浸没以后还能再往下放约 6 cm
const AB = Math.PI * (BR * 0.95) ** 2, AC = Math.PI * CR * CR;

export default {
  id: 'buoyancy',
  fig: '图10.1-5',
  title: '探究浮力的大小与哪些因素有关',
  stampText: '探究',
  predict: {
    q: '圆柱体已经<b>浸没</b>在水中。再把它往下放得更深一些（不碰杯底），<br>测力计的示数会——',
    hint: '课本第 66 页「实验」',
    options: ['变小（浮力变大）', '变大（浮力变小）', '不变'],
    answer: 2,
  },
  conclusion: {
    page: 70, rect: [160, 482, 456, 576],      // 课本第 66 页
    quote: '实验结果表明：物体在液体中所受浮力的大小，与它浸在液体中的体积有关，与液体的密度有关；物体浸在液体中的体积越大，液体的密度越大，所受的浮力就越大。',
    formula: '<i>F</i><sub>浮</sub> = <i>G</i> − <i>F</i>',
    why: '圆柱体浸入得越多，测力计的示数越小，说明浮力越大。浸没以后再往下放，浸在液体中的体积不再变化，示数也不变——浮力和浸没的深度无关（有人以为“越深浮力越大”，是因为没浸没之前，越往下浸入的体积越大）。浸没在盐水中示数最小、酒精中最大：液体的密度越大，浮力越大。',
    src: '课本第 65–66 页 · 第十章 第1节 浮力',
  },

  create({ tag, look, back }) {
    const group = new THREE.Group();
    const st = stand({ height: 0.72, baseW: 0.12, baseD: 0.09 });
    st.position.set(-0.12 - st.rodX, 0, -0.03);
    const arm = st.clamp(0.7, 0.12);      // 铁夹跟着测力计上下移动（相当于调节铁夹的高度）
    group.add(st);
    const bk = beaker({ r: BR, h: BH, level: L0, spout: false });
    bk.position.set(BX, 0, 0);
    group.add(bk);
    const sc = forceMeter();
    group.add(sc);
    // 圆柱体：侧面每 2 cm 一条刻线
    const sideTex = canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#e8dcc0'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#6b5a3a'; c.lineWidth = 4;
      for (let i = 1; i < 4; i++) { const y = (i / 4) * h; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    });
    const cyl = hull(new THREE.Mesh(new THREE.CylinderGeometry(CR, CR, CH, 28), [new THREE.MeshLambertMaterial({ map: sideTex }), paint(0xd9cba8), paint(0xd9cba8)]), 0.0012);
    cyl.geometry.translate(0, -CH / 2, 0);
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.004, 0.001, 6, 12), paint(0x8f99a8));
    loop.position.y = 0.004;
    const body = new THREE.Group();
    body.add(cyl, loop);
    group.add(body);
    const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.0005, 0.0005, 1, 4), new THREE.MeshBasicMaterial({ color: 0x444444 }));
    thread.geometry.translate(0, -0.5, 0);
    group.add(thread);
    const tSub = tag('', 'pill');

    const S = { liq: 0, top: 0.66, G: null, rows: [], F: G0, sub: 0, level: L0 };
    let W = null, ask = () => {};
    // 由测力计圆环的高度算出：圆柱体底面高度、浸入深度、液面高度、测力计示数（互相有关，迭代两次就够）
    const solve = () => {
      let F = S.F;
      for (let k = 0; k < 3; k++) {
        sc.set(F);
        const hookY = S.top + sc.hookEnd;
        const yb = Math.max(0.006, hookY - 0.012 - CH);      // 圆柱体底面（不会穿过杯底）
        S.rest = yb <= 0.006;
        const sub = clamp((L0 - yb) / (1 - AC / AB), 0, CH);
        const level = L0 + (sub * AC) / AB;
        const fb = LIQ[S.liq].rho * 9.8 * AC * Math.min(CH, Math.max(0, level - yb));
        F = Math.max(0, G0 - fb - (S.rest ? 0.3 : 0));          // 碰到杯底：杯底也托着它
        Object.assign(S, { yb, sub: Math.min(CH, Math.max(0, level - yb)), level, fb });
      }
      S.F += (F - S.F) * 0.5;
    };
    const pick = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.04), new THREE.MeshBasicMaterial({ visible: false }));
    pick.userData.pick = true;
    group.add(pick);
    const pointer = draggable(group, [{ obj: pick, plane: 'xy', offset: 0, keepOffset: true, onDrag: (p) => { S.top = clamp(p.y + 0.13, 0.4, 0.68); } }]);
    const layout = () => {
      sc.position.set(BX, S.top, 0);
      arm.position.y = S.top + 0.006;
      const hookY = S.top + sc.hookEnd;
      body.position.set(BX, S.yb + CH, 0);
      thread.position.set(BX, hookY, 0); thread.scale.y = Math.max(0.001, hookY - (S.yb + CH));
      bk.setLevel(S.level);
      pick.position.set(BX, S.top - 0.13, 0);
      tSub.loc(group, BX + BR + 0.035, S.yb + CH / 2, 0).text(S.sub < 0.001 ? '在空气中' : S.sub >= CH - 0.0005 ? `浸没，下表面深 ${((S.level - S.yb) * 100).toFixed(1)} cm` : `浸入 ${(S.sub * 100).toFixed(1)} cm（${Math.round((S.sub / CH) * 100)}%）`);
    };
    solve(); layout();

    return {
      group,
      size: { w: 0.3, d: 0.12, h: 0.72 },
      view: { elev: 8, azim: 0, lookY: 0.52, margin: 1.08 },
      pointer,
      mount(ui) {
        const liq = seg('烧杯里的液体', LIQ.map((l) => l.label), (_, k) => { S.liq = k; bk.setColor(LIQ[k].color, k === 1 ? 0.4 : 0.55); });
        const choices = buttons([0, 1, 2].map((j) => ({ text: '', ghost: true, onClick: () => answer(j) })));
        choices.el.hidden = true;
        S.guard = guard(choices.el, () => `${S.liq}|${Math.round(S.F * 10)}`, () => { cur = null; back(); ui.status("圆柱体的位置或液体变了，示数也变了——刚才那道读数题作废。重新点读数。"); });     // 条件变了，待答的题作废
        const tb = table(['液体', '浸入情况', '示数 F/N', '浮力 F浮/N']);
        let cur = null;
        const nearBtn = () => [...ui.controls.querySelectorAll('button')].find((b) => /凑近看测力计|回到整个实验/.test(b.textContent));
        const nearMeter = () => { const c = sc.pointer.getWorldPosition(new THREE.Vector3()); look(group.worldToLocal(c).toArray(), [0, 0.1, 1], 0.16, () => back()); S.near = true; const b = nearBtn(); if (b) b.textContent = '↩ 回到整个实验'; };
        const back0 = back; back = () => { back0(); S.near = false; const b = nearBtn(); if (b) b.textContent = '凑近看测力计'; };
        ask = () => {
          if (S.rest) return ui.status('圆柱体碰到杯底了，杯底也在托着它，这时的示数不能用。往上提一点。');
          const r = Math.round(S.F * 10) / 10;
          const opts = [...new Set([r, +(r + 0.2).toFixed(1), +(Math.max(0, r - 0.2)).toFixed(1)])].sort(() => Math.random() - 0.5);
          cur = { r, opts, sub: S.sub, depth: S.level - S.yb, liq: S.liq };
          choices.btns.forEach((b, j) => { b.hidden = j >= opts.length; b.textContent = `${opts[j]?.toFixed(1)} N`; });
          choices.el.hidden = false; S.guard?.arm();
          nearMeter();      // 凑近看测力计的指针（手机上尤其需要）
          ui.status('测力计的示数是多少？（每小格 0.2 N）');
        };
        const answer = (j) => {
          if (!cur) return;
          if (cur.opts[j] !== cur.r) return ui.status('再看一看指针的位置。');
          choices.el.hidden = true; back();
          const c = cur; cur = null;
          if (c.sub < 0.001) { S.G = c.r; W.goal.done('g'); tb.add(['（空气中）', '—', c.r.toFixed(1), '0']); return ui.status(`圆柱体的重力 G = ${c.r.toFixed(1)} N。现在把它慢慢浸入水中。`); }
          if (S.G == null) return ui.status('先在空气中测出圆柱体的重力 G。');
          const full = c.sub >= CH - 0.0005;
          const fb = +(S.G - c.r).toFixed(1);
          S.rows.push({ liq: c.liq, full, frac: Math.round((c.sub / CH) * 4) / 4, depth: Math.round(c.depth * 200) / 2, fb });
          tb.add([LIQ[c.liq].label, full ? `浸没，深 ${(c.depth * 100).toFixed(1)} cm` : `浸入 ${Math.round((c.sub / CH) * 100)}%`, c.r.toFixed(1), fb.toFixed(1)]);
          const R = S.rows;
          ui.status(`浮力 F浮 = G − F = ${S.G.toFixed(1)} N − ${c.r.toFixed(1)} N = ${fb.toFixed(1)} N。`);
          // 某一组对照的数据够了：让学生自己从表里说出关系，答对才算完成这个目标
          const ready = {
            vol: new Set(R.filter((x) => x.liq === 0 && !x.full).map((x) => x.frac)).size >= 2 && R.some((x) => x.liq === 0 && x.full),
            depth: new Set(R.filter((x) => x.liq === 0 && x.full).map((x) => x.depth)).size >= 2,
            rho: new Set(R.filter((x) => x.full).map((x) => x.liq)).size >= 2,
          };
          const id = ['vol', 'depth', 'rho'].find((k) => ready[k] && !W.goal.has(k));
          if (id) W.law(id);
        };
        ui.controls.append(liq.el, buttons([{ text: '读数并记录…', onClick: () => ask() }, { text: '凑近看测力计', ghost: true, onClick: () => (S.near ? back() : nearMeter()) }]).el, choices.el, note('<b>上下拖动测力计</b>（铁夹跟着升降），让圆柱体慢慢浸入液体。圆柱体侧面每 2 cm 有一条刻线，高 8 cm，体积 100 cm³。'));
        ui.data.append(tb.el);
        const lq = buttons([0, 1, 2].map(() => ({ text: '', ghost: true, onClick: () => {} })));
        lq.el.hidden = true;
        ui.controls.prepend(lq.el);
        const LAW = {
          vol: { q: '看表里水中的几行：圆柱体<b>浸入水中的体积</b>越大，浮力——', opts: ['越大', '越小', '不变'], ok: '对：在同种液体中，物体<b>排开液体的体积越大</b>，受到的浮力越大。' },
          depth: { q: '看表里浸没在水中、深度不同的几行：浸没以后，深度变大，浮力——', opts: ['不变', '越大', '越小'], ok: '对：浸没以后，浮力和浸没的<b>深度无关</b>（排开液体的体积不变）。' },
          rho: { q: '看表里浸没在不同液体中的几行：液体的密度越大，浮力——', opts: ['越大', '越小', '不变'], ok: '对：排开液体的体积相同时，<b>液体的密度越大</b>，浮力越大。' },
        };
        const law = (id) => {
          const c = LAW[id], sh = [0, 1, 2].sort(() => Math.random() - 0.5);
          lq.btns.forEach((b, j) => { b.textContent = c.opts[sh[j]]; b.onclick = () => { if (sh[j]) return ui.status('对照表格里的那几行，看最后一列“浮力”。'); lq.el.hidden = true; W.goal.done(id); ui.status(c.ok); }; });
          lq.el.hidden = false; ui.status(c.q);
        };
        W = { law, status: (m) => ui.status(m), goal: goals(ui, [['g', '在空气中测出圆柱体的重力 G'], ['vol', '在水中，浸入不同的体积（含浸没）各测一次'], ['depth', '浸没后，改变深度再测'], ['rho', '浸没在不同的液体中']]) };
        ui.status('先在空气中读出测力计的示数——这就是圆柱体的重力 G。');
      },
      update() { S.guard?.check(); solve(); layout(); },
      debug: { S },
    };
  },
};
