// 人教版高中化学必修第一册第 71 页【实验3-1】：在两支试管中分别加入少量的 FeCl₃ 溶液和 FeSO₄ 溶液，然后各滴入 NaOH 溶液（图3-8）。
// 第 72 页：FeCl₃ 溶液生成红褐色的 Fe(OH)₃ 沉淀；FeSO₄ 溶液生成白色絮状沉淀，迅速变成灰绿色，过一段时间后还会有红褐色物质生成——
//   白色的 Fe(OH)₂ 被溶解在溶液中的氧气氧化成了红褐色的 Fe(OH)₃（4Fe(OH)₂ + O₂ + 2H₂O ══ 4Fe(OH)₃）。“那么，在实验室里，如何得到 Fe(OH)₂ 呢？”
// 模型（示意，界面上写明）：两种溶液各 2 mL、0.05 mol/L（Fe 0.10 mmol）；NaOH 溶液 0.5 mol/L，一滴 0.05 mL（OH⁻ 0.025 mmol）——FeCl₃ 要约 12 滴、FeSO₄ 要约 8 滴沉淀完全。
//   2 mL 水里溶解的氧气（20 ℃ 约 9 mg/L）只够氧化约 2% 的 Fe(OH)₂——所以先“迅速”变灰绿（部分被氧化），之后靠空气里的氧气从液面慢慢溶进来，才越来越红褐。
//   时间加快（灰绿约 3 秒、红褐要二三十秒，实际是几分钟到十几分钟）。“换个条件”：溶液先煮沸除去溶解的氧气、冷却后液面上加一层植物油隔绝空气——白色沉淀能保持很久（常用的做法，课本这一页没写）。
import * as THREE from 'three';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs, mountXuean, moreBox, varyBox } from './kit/chemlesson.js';
import { draggable } from './kit/interact.js';
import { buttons } from './kit/ui.js';
import { tubeBench, T_Y, T_LEN, R_IN, levelY } from './kit/tubebench.js';
import { paint } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const FE0 = 0.1, OH_DROP = 0.025, DROP = 0.05;
const X3 = -0.05, X2 = -0.005, BOT = V(0.06, 0, 0.035);
const WHITE = new THREE.Color(0xf4f4ef), GREEN = new THREE.Color(0x7d8f6a), RED = new THREE.Color(0x8e3b1e);
const FECL3 = 0xd9a24a, FESO4 = 0xcfe3cc;

export default {
  id: 'feoh2',
  fig: '图3-8',
  title: '氢氧化铁和氢氧化亚铁的生成',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '向 FeSO₄ 溶液里滴入 NaOH 溶液，生成白色的 Fe(OH)₂。放一会儿，沉淀的颜色会变吗？',
    hint: '课本第 71 页【实验3-1】。',
    options: ['会，变成灰绿色，最后有红褐色', '不会，一直是白色', '会，变成蓝色'],
    answer: 0,
  },
  need: '两支试管分别加入少量 FeCl₃ 溶液和 FeSO₄ 溶液，各滴入 NaOH 溶液；观察沉淀的颜色，等一会儿再看',
  conclusion: {
    crops: [{ page: 76, rect: [219, 97, 537, 141] }, { page: 76, rect: [219, 282, 537, 323] }],
    quote: '这是因为白色的氢氧化亚铁［Fe(OH)2］被溶解在溶液中的氧气氧化成了红褐色的氢氧化铁［Fe(OH)3］……Fe(OH)2和Fe(OH)3都是难溶性碱，它们都能与酸发生反应。',
    formula: 'FeCl₃ + 3NaOH ══ Fe(OH)₃↓ + 3NaCl　　FeSO₄ + 2NaOH ══ Fe(OH)₂↓ + Na₂SO₄　　4Fe(OH)₂ + O₂ + 2H₂O ══ 4Fe(OH)₃',
    why: 'FeCl₃ 溶液里是 Fe³⁺，滴入 NaOH 立刻生成<b>红褐色</b>的 Fe(OH)₃。FeSO₄ 溶液里是 Fe²⁺，生成<b>白色絮状</b>的 Fe(OH)₂；它很容易被氧化：溶液里溶解的那一点氧气先把它的一部分氧化，颜色<b>迅速变成灰绿色</b>；空气里的氧气再从液面溶进来，<b>过一段时间后出现红褐色</b>（Fe(OH)₃）。<br>要看到白色的 Fe(OH)₂，就得把氧气挡在外面：溶液煮沸除去溶解的氧气，液面上加一层油隔绝空气。',
    src: '课本第 71–72 页 · 第三章 第一节 铁及其化合物',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };
    paperSheet(group, { w: 0.22, d: 0.13, x: 0.005, z: 0.01 });

    const B = tubeBench(group, {
      tag, look, back, rate: 3, getS: () => S.bench,
      tubes: [{ x: X3, label: 'FeCl₃ 溶液', vol: 2, color: FECL3 }, { x: X2, label: 'FeSO₄ 溶液', vol: 2, color: FESO4 }],
      reagents: [{ key: 'naoh', name: 'NaOH 溶液', at: BOT, inside: 0xeef2f4 }],
      onDrop: (k, key) => {
        if (key !== 'naoh') return;
        const T = S.t[k]; T.oh += OH_DROP; T.vol += DROP; T.drops++;
        if (k === 0 && T.drops === 1) log(['FeCl₃ 溶液里滴入 NaOH 溶液', '立刻出现<b>红褐色</b>沉淀', '生成 Fe(OH)₃']);
        if (k === 1 && T.drops === 1) { log(['FeSO₄ 溶液里滴入 NaOH 溶液', `出现<b>白色絮状</b>沉淀${S.sealed ? '' : '，很快带上灰绿色'}`, '生成 Fe(OH)₂']); S.t1At = S.clock; }
        if (k === 0 && T.oh >= 3 * FE0 - 1e-9 && !S.said.d0) { S.said.d0 = true; done('fecl3'); status('FeCl₃ 溶液里的 Fe³⁺ 沉淀完了（红褐色）。再把滴管拖到 <b>FeSO₄ 溶液</b>口上方滴加。'); }
        if (k === 1 && T.oh >= 2 * FE0 - 1e-9 && !S.said.d1) { S.said.d1 = true; done('feso4'); status('FeSO₄ 溶液里的 Fe²⁺ 沉淀完了。<b>别动它，等一会儿</b>，看沉淀的颜色怎么变。'); }
      },
    });
    // FeSO₄ 那支试管里：溶解的氧气（蓝点，这套书里蓝 = 氧气）和液面上的一层植物油
    const ox = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: 0x2f7fe0, transparent: true, opacity: 0.85 }), 40);
    ox.count = 0; ox.renderOrder = 9.95; ox.frustumCulled = false; B.tubes[1].add(ox);
    const OXP = Array.from({ length: 40 }, () => ({ u: Math.sqrt(Math.random()), a: Math.random() * 6.28, y: Math.random(), ph: Math.random() * 6 }));
    const oil = new THREE.Mesh(new THREE.CylinderGeometry(R_IN, R_IN, 0.004, 18), paint(0xe8c86a, { keep: true, transparent: true, opacity: 0.75 })); oil.renderOrder = 9.92; oil.visible = false; B.tubes[1].add(oil);
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3(), p4 = new THREE.Vector3();

    const fresh = () => ({ demo: false, bench: B.fresh(), clock: 0, t1At: null, sealed: S ? S.sealed : false, t: [{ oh: 0, vol: 2, drops: 0 }, { oh: 0, vol: 2, drops: 0, ox: 0, o2: 1 }], said: {} });
    S = fresh();
    const ppt = (k) => Math.min(FE0, S.t[k].oh / (k ? 2 : 3));          // 生成了多少沉淀（mmol）
    const A = {
      seal(on) { if (S.t[1].drops) return status('FeSO₄ 那支已经滴过 NaOH 了。先“全部重来”，再换条件。'); S.sealed = on; S.t[1].o2 = on ? 0 : 1; status(on ? '换成：FeSO₄ 溶液<b>先煮沸、冷却</b>（除去溶解的氧气），液面上<b>加一层植物油</b>（隔绝空气）。现在滴 NaOH 试试。' : '换回普通的 FeSO₄ 溶液（溶有少量氧气，液面通着空气）。'); },
      reset() { if (bar.playing) bar.stop(); const sealed = S.sealed; S = fresh(); S.sealed = sealed; S.t[1].o2 = sealed ? 0 : 1; W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; W.ui.relock(); } bar.undo('fecl3', 'feso4', 'wait', 'why'); status('两支试管又是新的了。'); },
    };
    const drag = draggable(group, [...B.items], { tip: tag('', 'pill'), highlight: true });
    const act = demoActs(drag, group);
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'fecl3', title: 'FeCl₃ 溶液滴 NaOH', todo: '把 <b>NaOH 溶液</b>的滴管拖到 <b>FeCl₃ 溶液</b>口上方，按住滴加（约 12 滴）。', target: () => (S.bench.carry[0] ? null : B.droppers[0]) },
        { id: 'feso4', title: 'FeSO₄ 溶液滴 NaOH', todo: '再把滴管拖到 <b>FeSO₄ 溶液</b>口上方，按住滴加（约 8 滴）。', target: () => (S.bench.carry[0] ? null : B.droppers[0]) },
        { id: 'wait', title: '等一会儿', todo: '别动 <b>FeSO₄ 那支试管</b>，等一会儿：白色沉淀的颜色怎么变？', target: () => B.tubes[1] },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { B.drops.clear(); } }),
          shots: [
            { cap: 'FeCl₃ 溶液里滴入 NaOH 溶液：立刻生成红褐色沉淀——Fe(OH)₃。', dur: 7, speed: 1.4, cam: [[X3, 0.08, 0.01], [0.04, 0.22, 1], 0.24],
              during: B.dripSeq(drag, 0, [[0, () => S.t[0].oh >= 3 * FE0 - 1e-9]], 0.04, 0.97) },
            { cap: 'FeSO₄ 溶液里滴入 NaOH 溶液：生成白色絮状沉淀，很快变成灰绿色。', dur: 6, speed: 1.4, cam: [[X2, 0.08, 0.01], [0.04, 0.22, 1], 0.24],
              during: B.dripSeq(drag, 0, [[1, () => S.t[1].oh >= 2 * FE0 - 1e-9]], 0.04, 0.97) },
            { cap: '过一段时间（时间加快）：灰绿色里出现了红褐色——Fe(OH)₂ 被溶解在溶液里的氧气氧化成了 Fe(OH)₃。演示完了，换你自己做。', dur: 9, speed: 3, cam: [[(X3 + X2) / 2, 0.07, 0.01], [0.04, 0.22, 1], 0.26] },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);
    const col = new THREE.Color();
    const step = (dt, t) => {
      S.clock += dt;
      B.update(dt, t);
      // FeSO₄ 那支：Fe(OH)₂ 被氧化。溶解的氧气（o2：1 = 刚开始溶着的那一点）先很快用掉；之后空气里的氧气从液面慢慢溶进来（加了油就没有）
      const T = S.t[1], fe2 = ppt(1) - T.ox;
      const CAP = 0.022 * FE0;          // 溶解饱和时那点氧气能氧化的 Fe(OH)₂（mmol）
      if (fe2 > 0 && T.o2 > 0) { const d = Math.min(fe2, T.o2 * CAP, dt * 3 * T.o2 * CAP); T.ox += d; T.o2 -= d / CAP; }
      if (!S.sealed) T.o2 += (1 - T.o2) * Math.min(1, dt * 0.45);          // 空气里的氧气从液面溶进来（时间加快）
      const k3 = ppt(0) / FE0, k2 = ppt(1) / FE0, r = ppt(1) > 0 ? T.ox / ppt(1) : 0;
      if (k2 > 0.5 && r > 0.015 && !S.said.green) { S.said.green = true; log(['（很快）', '白色沉淀<b>变成灰绿色</b>', '一部分 Fe(OH)₂ 被溶解的氧气氧化']); }
      if (k2 > 0.5 && r > 0.25 && !S.said.red) { S.said.red = true; done('wait'); log(['过一段时间', '灰绿色里出现<b>红褐色</b>，越来越多', '空气里的氧气溶进来，Fe(OH)₂ 继续被氧化成 Fe(OH)₃']); status('过一段时间，出现了红褐色——和 FeCl₃ 那支的红褐色一样，是 Fe(OH)₃。'); W?.t1.open(); }
      if (S.sealed && k2 > 0.5 && S.t1At != null && S.clock - S.t1At > 25 && !S.said.white) { S.said.white = true; done('wait'); log(['隔绝氧气，等了很久', '沉淀<b>还是白色</b>', '没有氧气，Fe(OH)₂ 不被氧化']); status('除去了溶解的氧气、液面加了油：白色的 Fe(OH)₂ 保持了很久。'); W?.t1.open(); }
      // 颜色：白 → 灰绿（氧化一点点）→ 红褐（氧化多了）
      col.copy(WHITE).lerp(GREEN, Math.min(1, r / 0.03)).lerp(RED, Math.max(0, Math.min(1, (r - 0.05) / 0.6)));
      B.setTube(0, { vol: S.t[0].vol, color: new THREE.Color(FECL3).lerp(new THREE.Color(0xe9e2d6), k3).getHex(), milk: k3 * 0.95, milkColor: RED.getHex(), speckColor: 0x7a2f15 });
      B.setTube(1, { vol: T.vol, color: new THREE.Color(FESO4).lerp(new THREE.Color(0xe9ece8), k2).getHex(), milk: k2 * 0.95, milkColor: col.getHex(), speckColor: col.clone().multiplyScalar(0.85).getHex() });
      // 溶解的氧气（蓝点）
      const y0 = T_Y * 0 + 0.002, top = levelY(T.vol), n = Math.round(40 * Math.min(1, T.o2));
      for (let i = 0; i < n; i++) { const d = OXP[i], yy = y0 + (top - y0 - 0.002) * d.y, rr = R_IN * 0.8 * d.u; p4.set(Math.cos(d.a + t * 0.2) * rr, yy, Math.sin(d.a + t * 0.2) * rr); s4.setScalar(0.00045); m4.compose(p4, q4, s4); ox.setMatrixAt(i, m4); }
      ox.count = n; ox.instanceMatrix.needsUpdate = true;
      oil.visible = S.sealed; oil.position.y = top + 0.002;
    };

    return {
      group: root, pointer, card: false, toggles: ['cards', 'steps'],
      size: { w: 0.19, d: 0.1, h: 0.13 },
      view: { elev: 20, azim: -6, lookY: 0.45, frameMargin: 1.05 },
      mount(ui) {
        const ctx = () => `<div>FeCl₃ 那支：${S.t[0].drops} 滴，${ppt(0) > 0 ? '红褐色沉淀' : '还没滴'}；FeSO₄ 那支：${S.t[1].drops} 滴，${ppt(1) > 0 ? `已经约 ${Math.round(Math.min(1, S.t[1].ox / Math.max(1e-9, ppt(1))) * 100)}% 被氧化` : '还没滴'}${S.sealed ? '（煮沸、加油隔绝了氧气）' : ''}</div>`;
        const t2 = think({ q: '在实验室里，怎样才能看到白色的 Fe(OH)₂ 保持较长时间？', ctx, options: ['把氧气挡在外面：溶液煮沸除氧，液面加油隔绝空气', '多滴一些 NaOH 溶液', '把试管加热'], wrong: ['多加 NaOH 只是多生成沉淀，氧气还在。', '加热只会让它更快被氧化（还会分解）。'], ok: '对：让 Fe(OH)₂ 不接触氧气（课本第 72 页的“思考与讨论”）。可以在“换个条件再试”里试一试。', status: (m) => W?.status(m), onOk: () => { done('why'); if (W) W.next.hidden = false; } });
        const t1 = think({ q: '白色的 Fe(OH)₂ 为什么很快变成灰绿色，过一段时间后又出现红褐色？', ctx, options: ['被溶液里溶解的氧气（和空气里的氧气）氧化成了 Fe(OH)₃', '和多加的 NaOH 继续反应', '见光分解了'], wrong: ['NaOH 早就过量了，沉淀颜色还在变。', '它在暗处也会变；蓝点（氧气）少了，颜色才变。'], ok: '对：4Fe(OH)₂ + O₂ + 2H₂O ══ 4Fe(OH)₃（课本第 72 页）。', status: (m) => W?.status(m), onOk: () => t2.open() });
        const vary = varyBox('课本问：在实验室里，如何得到 Fe(OH)₂ 呢？常用的做法：FeSO₄ 溶液先<b>煮沸</b>（除去溶解的氧气），冷却后在液面上加一层<b>植物油</b>（隔绝空气），再滴 NaOH 溶液。', buttons([{ text: '煮沸除氧、液面加油', ghost: true, onClick: () => A.seal(true) }, { text: '普通的 FeSO₄ 溶液', ghost: true, onClick: () => A.seal(false) }]));
        const more = moreBox([], () => A.reset());
        const note = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'), h('p', { class: 'fineprint', html: 'FeCl₃、FeSO₄ 溶液各 2 mL、0.05 mol/L（示意值，课本只说“少量”）；NaOH 溶液 0.5 mol/L，一滴约 0.05 mL。<br>20 ℃ 时水里溶解的氧气约 9 mg/L，2 mL 里只够氧化约 2% 的 Fe(OH)₂，所以先变灰绿；之后要靠空气里的氧气从液面溶进来。<b>时间加快</b>：灰绿约 3 秒、出现红褐约半分钟（实际要几分钟到十几分钟）。<br>蓝点是溶解的氧气（示意，这套书里蓝 = 氧气）。煮沸、加油的做法是常用的方法，课本这一页没有写。' }));
        const base = mountXuean(ui, { controls: [vary, more, note], headers: ['做了什么', '现象', '说明'], intro: '两支试管分别装着 FeCl₃ 溶液和 FeSO₄ 溶液。把 NaOH 溶液的滴管拖到试管口上方，按住滴加。' });
        ui.data.append(t1.el, t2.el, base.next);
        W = { ...base, ui, t1, t2, status: ui.status }; bar.attach(ui);
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { bar.dispose(); drag.dispose(); B.dispose(); },
      debug: {
        get S() { return S; }, bar, A, ppt,
        picks: { dropper: B.droppers[0].pick, fecl3: B.tubes[0].pick, feso4: B.tubes[1].pick },
        qa: qaFlow(drag, [
          { name: 'FeCl₃ 滴 NaOH', run: () => B.qaDrip(drag, 0, 0, () => S.t[0].oh >= 3 * FE0 - 1e-9), wait: 7 },
          { name: 'FeSO₄ 滴 NaOH', run: () => B.qaDrip(drag, 0, 1, () => S.t[1].oh >= 2 * FE0 - 1e-9), wait: 6 },
          { name: '等一会儿', run: () => {}, wait: 40 },
          { name: '核对', run: () => { if (!(S.said.green && S.said.red)) throw new Error('颜色没有变：' + JSON.stringify(S.t[1])); }, wait: 1 },
          { name: '想一想 1', run: () => W.t1.el.querySelector('button').click() },
          { name: '想一想 2', run: () => W.t2.el.querySelector('button').click() },
        ]),
      },
    };
  },
};
