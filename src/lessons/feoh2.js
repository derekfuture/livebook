// 人教版高中化学必修第一册第 71 页【实验3-1】：在两支试管中分别加入少量的 FeCl₃ 溶液和 FeSO₄ 溶液，然后各滴入 NaOH 溶液（图3-8）。
// 第 72 页：FeCl₃ 溶液生成红褐色的 Fe(OH)₃ 沉淀；FeSO₄ 溶液生成白色絮状沉淀，迅速变成灰绿色，过一段时间后还会有红褐色物质生成——
//   白色的 Fe(OH)₂ 被溶解在溶液中的氧气氧化成了红褐色的 Fe(OH)₃（4Fe(OH)₂ + O₂ + 2H₂O ══ 4Fe(OH)₃）。“那么，在实验室里，如何得到 Fe(OH)₂ 呢？”
// 模型（示意，界面上写明）：两种溶液各 2 mL、0.05 mol/L（Fe 0.10 mmol）；NaOH 溶液 0.5 mol/L，一滴 0.05 mL（OH⁻ 0.025 mmol）——FeCl₃ 要约 12 滴、FeSO₄ 要约 8 滴沉淀完全。
//   氧化（示意）：速率 ∝ 剩下的 Fe(OH)₂ × 溶解的氧气；溶解的氧气（20 ℃ 约 9 mg/L）用掉以后，空气里的氧气从液面慢慢溶进来。
//   颜色按被氧化的比例 r 画：白 → 灰绿（絮体整体变色）→ 灰绿里出现一粒粒红褐色絮体（数目跟着 r 和沉淀量走）。
//   颜色分界是示意（课本没有给颜色对应的氧化比例），时间加快，只排出先后顺序；观察卡、记录和画面用同一套判断。
//   每滴没除氧的 NaOH 溶液也带进一点溶解的氧气（按同样的 9 mg/L 算）。
//   “换个条件”：FeSO₄、NaOH 两种溶液都先煮沸除去溶解的氧气、冷却，FeSO₄ 液面上加一层植物油隔绝空气——白色沉淀能保持很久（常用的做法，课本这一页没写）。
//   煮沸后还残留一点氧气、油层也挡不住全部空气：按很少的量算，颜色看不出变化。
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
const K_OX = 0.02, R_GREEN = 0.015, NFLOC = 40;          // 氧化速率常数（1/s，示意）；看得出灰绿的 r（示意）；红褐色絮体最多几粒
const flocN = (r, k2) => Math.round(NFLOC * Math.min(1, Math.max(0, (r - 0.06) / 0.5)) * Math.sqrt(Math.max(0, k2)));          // 画面里红褐色絮体的粒数
let seen = null;          // 结论页“实验里看到的”：按这一轮的条件和观察（除氧组一直是白色）
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
    get answer() { return seen ? seen() : 0; },
  },
  need: '两支试管分别加入少量 FeCl₃ 溶液和 FeSO₄ 溶液，各滴入 NaOH 溶液；观察沉淀的颜色，等一会儿再看',
  conclusion: {
    crops: [{ page: 76, rect: [219, 56, 537, 213] }],
    quote: '为什么在FeSO4溶液中加入NaOH溶液时，生成的白色絮状沉淀迅速变成灰绿色，过一段时间后还会有红褐色物质生成呢？这是因为白色的氢氧化亚铁［Fe(OH)2］被溶解在溶液中的氧气氧化成了红褐色的氢氧化铁［Fe(OH)3］，反应的化学方程式分别为：FeSO4 + 2NaOH = Fe(OH)2↓ + Na2SO4 4Fe(OH)2 + O2 + 2H2O = 4Fe(OH)3',
    formula: 'FeCl₃ + 3NaOH ══ Fe(OH)₃↓ + 3NaCl　　FeSO₄ + 2NaOH ══ Fe(OH)₂↓ + Na₂SO₄　　4Fe(OH)₂ + O₂ + 2H₂O ══ 4Fe(OH)₃',
    why: 'FeCl₃ 溶液里是 Fe³⁺，滴入 NaOH 立刻生成<b>红褐色</b>的 Fe(OH)₃。FeSO₄ 溶液里是 Fe²⁺，生成<b>白色絮状</b>的 Fe(OH)₂；它很容易被氧化：沉淀<b>迅速变成灰绿色</b>，<b>过一段时间后还会有红褐色物质生成</b>——白色的 Fe(OH)₂ 被溶解在溶液中的氧气氧化成了红褐色的 Fe(OH)₃（4Fe(OH)₂ + O₂ + 2H₂O ══ 4Fe(OH)₃，课本第 72 页）。<br>要让白色的 Fe(OH)₂ 保持得久一些，就得把氧气挡在外面：溶液煮沸除去溶解的氧气，液面上加一层油隔绝空气。',
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
      tag, look, back, rate: 3, exact: true, getS: () => S.bench,
      tubes: [{ x: X3, label: 'FeCl₃ 溶液', vol: 2, color: FECL3 }, { x: X2, label: 'FeSO₄ 溶液', vol: 2, color: FESO4 }],
      reagents: [{ key: 'naoh', name: 'NaOH 溶液', at: BOT, inside: 0xeef2f4 }],
      onDrop: (k, key) => {          // 液滴落到液面时才算加进去
        if (key !== 'naoh') return;
        const T = S.t[k]; T.oh += OH_DROP; T.vol += DROP; T.drops++;
        if (k === 1 && !S.sealed) T.o2 += DROP / 2;          // 没除氧的 NaOH 溶液：一滴带进的溶解氧（按 2 mL 饱和量的份数算）
        if (k === 0 && T.drops === 1) log(['FeCl₃ 溶液里滴入 NaOH 溶液', '立刻出现<b>红褐色</b>沉淀', '生成 Fe(OH)₃']);
        if (k === 1 && T.drops === 1) { log(['FeSO₄ 溶液里滴入 NaOH 溶液', '出现<b>白色絮状</b>沉淀', '生成 Fe(OH)₂']); S.t1At = S.clock; }
        if (k === 0 && T.oh >= 3 * FE0 - 1e-9 && !S.said.d0) { S.said.d0 = true; done('fecl3'); status('FeCl₃ 溶液里的 Fe³⁺ 沉淀完了（红褐色）。再把滴管拖到 <b>FeSO₄ 溶液</b>口上方滴加。'); }
        if (k === 1 && T.oh >= 2 * FE0 - 1e-9 && !S.said.d1) { S.said.d1 = true; done('feso4'); status('FeSO₄ 溶液里的 Fe²⁺ 沉淀完了。<b>别动它，等一会儿</b>，看沉淀的颜色怎么变。'); if (S.said.red || S.said.white) seenDone(); }
      },
    });
    // FeSO₄ 那支试管里：溶解的氧气（蓝点，这套书里蓝 = 氧气）和液面上的一层植物油
    const ox = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: 0x2f7fe0, transparent: true, opacity: 0.85 }), 40);
    ox.count = 0; ox.renderOrder = 9.95; ox.frustumCulled = false; B.tubes[1].add(ox);
    const OXP = Array.from({ length: 40 }, () => ({ u: Math.sqrt(Math.random()), a: Math.random() * 6.28, y: Math.random(), ph: Math.random() * 6 }));
    const oil = new THREE.Mesh(new THREE.CylinderGeometry(R_IN, R_IN, 0.004, 18), paint(0xe8c86a, { keep: true, transparent: true, opacity: 0.75 })); oil.renderOrder = 9.92; oil.visible = false; B.tubes[1].add(oil);
    // 后来出现的红褐色絮体（Fe(OH)₃）：和灰绿色的絮状沉淀分开画，一粒粒混在里面
    const floc = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), paint(RED.getHex(), { keep: true, transparent: true, opacity: 0.97 }), NFLOC);          // 透明队列里画在液体之后，不被浑浊盖住
    floc.count = 0; floc.renderOrder = 9.96; floc.frustumCulled = false; floc.raycast = () => {}; B.tubes[1].add(floc);
    const FLP = Array.from({ length: NFLOC }, () => ({ u: Math.sqrt(Math.random()), a: Math.random() * 6.28, y: Math.random(), s: 0.7 + Math.random() * 0.6, ph: Math.random() * 6 }));
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3(), p4 = new THREE.Vector3();
    const cards = [tag('', 'cond'), tag('', 'cond')]; cards[0].px = [-110, -30]; cards[1].px = [110, -30];          // 观察卡：两支试管外侧

    const SEALED_O2 = 0.03;          // 煮沸、冷却后残留的一点溶解氧（相对饱和，示意）
    const fresh = () => ({ demo: false, bench: B.fresh(), clock: 0, t1At: null, sealed: false, t: [{ oh: 0, vol: 2, drops: 0 }, { oh: 0, vol: 2, drops: 0, ox: 0, o2: 1 }], said: {} });          // 刚打开、全部重来、老师演示：都是普通条件
    S = fresh();
    seen = () => (S.sealed && S.said.white && !S.said.red ? 1 : 0);
    // “等一会儿”这一步：FeSO₄ 那支滴够了、颜色的结果也看到了才算完成
    const seenDone = () => { if (S.said.d1 && (S.said.red || S.said.white) && !S.said.waitDone) { S.said.waitDone = true; done('wait'); if (!S.demo) (S.said.red ? W?.t1 : W?.t1s)?.open(); } };
    const ppt = (k) => Math.min(FE0, S.t[k].oh / (k ? 2 : 3));          // 生成了多少沉淀（mmol）
    const A = {
      seal(on) { if (S.t[1].drops) return status('FeSO₄ 那支已经滴过 NaOH 了。先“全部重来”，再换条件。'); S.sealed = on; S.t[1].o2 = on ? SEALED_O2 : 1; status(on ? '换成：FeSO₄ 溶液和 NaOH 溶液<b>都先煮沸、冷却</b>（除去溶解的氧气），FeSO₄ 液面上<b>加一层植物油</b>（隔绝空气）。现在滴 NaOH 试试。' : '换回普通的溶液（溶有少量氧气，液面通着空气）。'); },
      reset() { if (bar.playing) bar.stop(); S = fresh(); W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.t1s.close(); W.next.hidden = true; W.ui.relock(); } bar.undo('fecl3', 'feso4', 'wait', 'why'); status('两支试管又是新的了（普通的溶液）。'); },
    };
    const drag = draggable(group, [...B.items], { tip: tag('', 'pill') });
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
              during: B.dripSeq(drag, 0, [[0, () => S.t[0].drops + B.inflight(0) >= 12]], 0.04, 0.97) },
            { cap: 'FeSO₄ 溶液里滴入 NaOH 溶液：生成白色絮状沉淀，很快变成灰绿色。', dur: 6, speed: 1.4, cam: [[X2, 0.08, 0.01], [0.04, 0.22, 1], 0.24],
              during: B.dripSeq(drag, 0, [[1, () => S.t[1].drops + B.inflight(1) >= 8]], 0.04, 0.97) },
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
      const CAP = 0.022 * FE0;          // 2 mL 溶液里溶解饱和的那点氧气能氧化的 Fe(OH)₂（mmol）
      if (fe2 > 0 && T.o2 > 0) { const d = Math.min(fe2, T.o2 * CAP, dt * K_OX * fe2 * T.o2); T.ox += d; T.o2 -= d / CAP; }          // 速率 ∝ Fe(OH)₂ × 溶解的氧气（示意）
      T.o2 += (1 - T.o2) * Math.min(1, dt * (S.sealed ? 0.0005 : 0.45));          // 空气里的氧气从液面溶进来（时间加快）；油层挡住了绝大部分
      const k3 = ppt(0) / FE0, k2 = ppt(1) / FE0, r = ppt(1) > 0 ? T.ox / ppt(1) : 0, nRed = flocN(r, k2);
      // 观察记录、观察卡和画面用同一套判断（看得出灰绿 / 画面里出现红褐色絮体）；“等一会儿”这一步另外判断
      if (ppt(1) > 0 && r > R_GREEN && !S.said.green) { S.said.green = true; log(['（很快）', '白色沉淀<b>变成灰绿色</b>', 'Fe(OH)₂ 开始被溶液里溶解的氧气氧化']); }
      if (nRed >= 2 && !S.said.red) { S.said.red = true; log(['过一段时间', '灰绿色里出现<b>红褐色</b>，越来越多', '空气里的氧气溶进来，Fe(OH)₂ 继续被氧化成 Fe(OH)₃']); status('过一段时间，出现了红褐色——和 FeCl₃ 那支的红褐色一样，是 Fe(OH)₃。'); seenDone(); }
      if (S.sealed && ppt(1) > 0 && S.t1At != null && S.clock - S.t1At > 25 && !S.said.red && !S.said.white) { S.said.white = true; log(['煮沸除氧、液面加油，等了一会儿', '沉淀<b>还是白色</b>', '氧气供应减少，观察期间 Fe(OH)₂ 没有明显被氧化']); status('除去了溶解的氧气、液面加了油：观察期间，白色的 Fe(OH)₂ 没有变色。'); seenDone(); }
      // 絮状沉淀整体的颜色：白 → 灰绿；氧化多了略微发暗。红褐色的 Fe(OH)₃ 另画成一粒粒絮体
      col.copy(WHITE).lerp(GREEN, Math.min(1, r / (2 * R_GREEN))).lerp(RED, 0.45 * Math.max(0, Math.min(1, (r - 0.3) / 0.7)));
      B.setTube(0, { vol: S.t[0].vol, color: new THREE.Color(FECL3).lerp(new THREE.Color(0xe9e2d6), k3).getHex(), milk: k3 * 0.95, milkColor: RED.getHex(), speckColor: 0x7a2f15 });
      B.setTube(1, { vol: T.vol, color: new THREE.Color(FESO4).lerp(new THREE.Color(0xe9ece8), k2).getHex(), milk: k2 * 0.95, milkColor: col.getHex(), speckColor: col.clone().multiplyScalar(0.85).getHex() });
      // 溶解的氧气（蓝点）
      const y0 = T_Y * 0 + 0.002, top = levelY(T.vol), n = Math.round(40 * Math.min(1, T.o2));
      for (let i = 0; i < n; i++) { const d = OXP[i], yy = y0 + (top - y0 - 0.002) * d.y, rr = R_IN * 0.8 * d.u; p4.set(Math.cos(d.a + t * 0.2) * rr, yy, Math.sin(d.a + t * 0.2) * rr); s4.setScalar(0.00045); m4.compose(p4, q4, s4); ox.setMatrixAt(i, m4); }
      ox.count = n; ox.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < nRed; i++) { const d = FLP[i], yy = y0 + 0.001 + (top - y0 - 0.004) * d.y, rr = R_IN * 0.75 * d.u, a = d.a + t * 0.05; p4.set(Math.cos(a) * rr, yy + Math.sin(t * 0.6 + d.ph) * 0.0005, Math.sin(a) * rr); s4.set(0.0014 * d.s, 0.0009 * d.s, 0.0014 * d.s); m4.compose(p4, q4, s4); floc.setMatrixAt(i, m4); }
      floc.count = nRed; floc.instanceMatrix.needsUpdate = true;
      oil.visible = S.sealed; oil.position.y = top + 0.002;
      // 观察卡：看到的颜色（不写氧化百分比——那只是示意模型）
      const c3 = S.t[0].drops ? (k3 >= 0.999 ? '红褐色沉淀（Fe³⁺ 沉淀完了）' : '红褐色沉淀') : '还没滴 NaOH';
      const c2 = !T.drops ? '还没滴 NaOH' : nRed >= 2 ? '灰绿色里出现红褐色' : r > R_GREEN ? '灰绿色沉淀' : '白色絮状沉淀';
      cards[0].text(`<div class="cc"><div class="cc-t"><span class="cc-name">FeCl₃ 溶液</span></div><div class="cc-more"><div class="cc-obs"><small>${S.t[0].drops} 滴 · ${c3}</small></div></div></div>`).loc(group, X3, T_Y + 0.06, 0).show(!bar.playing);
      cards[1].text(`<div class="cc"><div class="cc-t"><span class="cc-name">FeSO₄ 溶液</span></div><div class="cc-more"><div class="cc-obs"><small>${T.drops} 滴 · ${c2}</small></div><div class="cc-note">蓝点 = 溶解的氧气（示意）${S.sealed ? '；煮沸除氧、液面加油' : ''}</div></div></div>`).loc(group, X2, T_Y + 0.06, 0).show(!bar.playing);
    };

    return {
      group: root, pointer, card: false, toggles: ['cards', 'steps'],
      size: { w: 0.19, d: 0.1, h: 0.13 },
      view: { elev: 20, azim: -6, lookY: 0.45, frameMargin: 1.05 },
      mount(ui) {
        const seenTxt = () => (S.said.red ? '白色 → 灰绿色 → 出现红褐色' : S.said.white ? '观察期间一直是白色' : S.said.green ? '白色 → 灰绿色' : '白色');
        const ctx = () => `<div>FeCl₃ 那支：${S.t[0].drops} 滴，${ppt(0) > 0 ? '红褐色沉淀' : '还没滴'}；FeSO₄ 那支：${S.t[1].drops} 滴，${ppt(1) > 0 ? seenTxt() : '还没滴'}${S.sealed ? '（两种溶液都煮沸除氧，液面加了油）' : ''}</div>`;
        const t2 = think({ q: '在实验室里，怎样才能看到白色的 Fe(OH)₂ 保持较长时间？', ctx, options: ['把氧气挡在外面：溶液煮沸除氧，液面加油隔绝空气', '多滴一些 NaOH 溶液', '把试管加热'], wrong: ['多加 NaOH 只是多生成沉淀，氧气还在。', '加热不能把空气挡在外面：试管敞着口，Fe(OH)₂ 照样会被氧化。'], ok: '对：让 Fe(OH)₂ 不接触氧气（课本第 72 页的“思考与讨论”）。可以在“换个条件再试”里试一试。', status: (m) => W?.status(m), onOk: () => { done('why'); if (W) W.next.hidden = false; } });
        const t1 = think({ q: '白色的 Fe(OH)₂ 为什么很快变成灰绿色，过一段时间后又出现红褐色？', ctx, options: ['被溶液里溶解的氧气（和空气里的氧气）氧化成了 Fe(OH)₃', '和多加的 NaOH 继续反应', '见光分解了'], wrong: ['松手停滴以后，沉淀的颜色还在变：变色和 NaOH 无关。', '它在暗处也会变；蓝点（氧气）少了，颜色才变。'], ok: '对：4Fe(OH)₂ + O₂ + 2H₂O ══ 4Fe(OH)₃（课本第 72 页）。', status: (m) => W?.status(m), onOk: () => t2.open() });
        const t1s = think({ q: '这一次，白色的 Fe(OH)₂ 为什么在观察期间一直没变色？', ctx, options: ['溶解的氧气被煮沸除去了，液面的油又挡住了空气，Fe(OH)₂ 几乎碰不到氧气', '油和 Fe(OH)₂ 反应，把它保护起来了', '煮沸以后 NaOH 不一样了'], wrong: ['油不和 Fe(OH)₂ 反应，它只是把空气隔开。', 'NaOH 还是 NaOH：生成的同样是 Fe(OH)₂。'], ok: '对：普通条件下，正是溶液里溶解的氧气（和空气里的氧气）把 Fe(OH)₂ 氧化成了红褐色的 Fe(OH)₃（课本第 72 页）。', status: (m) => W?.status(m), onOk: () => { done('why'); if (W) W.next.hidden = false; } });
        const vary = varyBox('课本问：在实验室里，如何得到 Fe(OH)₂ 呢？常用的做法：FeSO₄ 溶液和 NaOH 溶液<b>都先煮沸</b>（除去溶解的氧气）、冷却，在 FeSO₄ 溶液液面上加一层<b>植物油</b>（隔绝空气），再滴入 NaOH 溶液（更严格的做法是把吸了 NaOH 溶液的长滴管伸到液面下再挤出）。', buttons([{ text: '煮沸除氧、液面加油', ghost: true, onClick: () => A.seal(true) }, { text: '普通的溶液', ghost: true, onClick: () => A.seal(false) }]));
        const more = moreBox([], () => A.reset());
        const note = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'), h('p', { class: 'fineprint', html: 'FeCl₃、FeSO₄ 溶液各 2 mL、0.05 mol/L（示意值，课本只说“少量”）；NaOH 溶液 0.5 mol/L，一滴约 0.05 mL，液滴落到液面才算加进去。<br>氧化（示意模型）：溶液里溶解的氧气（20 ℃ 时约 9 mg/L）先氧化一部分 Fe(OH)₂，用掉以后，空气里的氧气从液面慢慢溶进来，继续氧化；没除氧的 NaOH 溶液每滴也带进一点氧气。画面里白 → 灰绿 → 出现红褐色絮体的<b>颜色分界是示意</b>（课本没有给出颜色对应的氧化程度）；<b>时间加快</b>，只排出先后顺序，不是实测或预测。课本用 4Fe(OH)₂ + O₂ + 2H₂O ══ 4Fe(OH)₃ 解释（第 72 页）。<br>蓝点是溶解的氧气（示意，这套书里蓝 = 氧气）。煮沸、加油的做法是常用的方法，课本这一页没有写；煮沸后残留的一点氧气按很少的量算。' }));
        const base = mountXuean(ui, { controls: [vary, more, note], headers: ['做了什么', '现象', '说明'], intro: '两支试管分别装着 FeCl₃ 溶液和 FeSO₄ 溶液。把 NaOH 溶液的滴管拖到试管口上方，按住滴加。' });
        ui.data.append(t1.el, t2.el, t1s.el, base.next);
        W = { ...base, ui, t1, t2, t1s, status: ui.status }; bar.attach(ui);
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { bar.dispose(); drag.dispose(); B.dispose(); seen = null; },
      debug: {
        get S() { return S; }, bar, A, ppt,
        picks: { dropper: B.droppers[0].pick, fecl3: B.tubes[0].pick, feso4: B.tubes[1].pick },
        qa: qaFlow(drag, [
          { name: 'FeCl₃ 滴 NaOH', run: () => B.qaDrip(drag, 0, 0, () => S.t[0].drops + B.inflight(0) >= 12), wait: 8 },
          { name: 'FeSO₄ 滴 NaOH', run: () => B.qaDrip(drag, 0, 1, () => S.t[1].drops + B.inflight(1) >= 8), wait: 7 },
          { name: '等一会儿', run: () => {}, wait: 40 },
          { name: '核对', run: () => { if (!(S.said.green && S.said.red && S.t[0].drops === 12 && S.t[1].drops === 8 && bar.has('wait'))) throw new Error('颜色没有变：' + JSON.stringify(S.t[1])); }, wait: 1 },
          { name: '想一想 1', run: () => W.t1.el.querySelector('button').click() },
          { name: '想一想 2', run: () => W.t2.el.querySelector('button').click() },
        ]),
      },
    };
  },
};
