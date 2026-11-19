// 人教版高中化学必修第一册第 17 页【实验1-3】：向盛有 2 mL Na₂SO₄ 稀溶液的试管中加入 2 mL BaCl₂ 稀溶液（二者恰好完全反应），观察现象并分析。
// 第 18 页的分析：Na⁺、Cl⁻ 都没有发生化学反应；SO₄²⁻ 与 Ba²⁺ 反应，生成难溶的 BaSO₄ 白色沉淀——离子反应，Ba²⁺ + SO₄²⁻ ══ BaSO₄↓。
// 模型（示意，界面上写明）：两种溶液都按 0.10 mol/L 算，2 mL 里各 0.20 mmol（课本说“恰好完全反应”）；一滴 0.05 mL，含 Ba²⁺ 0.005 mmol、Cl⁻ 0.010 mmol。
//   BaSO₄ 难溶（20 ℃ 溶解度约 2.4 × 10⁻⁴ g/100 g 水），生成多少沉淀多少；不振荡时沉淀慢慢沉到管底。滴多了（超过 2 mL）：SO₄²⁻ 用完了，不再生成沉淀，多出来的 Ba²⁺ 留在溶液里。
import * as THREE from 'three';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs, mountXuean, moreBox, varyBox } from './kit/chemlesson.js';
import { draggable } from './kit/interact.js';
import { tubeBench, T_Y, T_LEN } from './kit/tubebench.js';
import { micro, f } from './kit/microworld.js';
import { ionScene } from './kit/ionreact-parts.js';
import { h } from '../ui/Panel.js';

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const C = 0.1, DROP = 0.05, SO4_0 = 0.2;          // mol/L；一滴 mL；试管里 SO₄²⁻ 的 mmol
const TX = -0.03, BOT = V(0.05, 0, 0.035);
const mm = (x) => x.toFixed(x < 0.0995 ? 3 : 2);

export default {
  id: 'ionreact',
  fig: '实验1-3',
  title: '离子反应',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: 'Na₂SO₄ 溶液里有 Na⁺ 和 SO₄²⁻，BaCl₂ 溶液里有 Ba²⁺ 和 Cl⁻。两种溶液混合，哪些离子会发生反应？',
    hint: '课本第 17 页【实验1-3】。先猜，再看沉淀、钻进去看离子。',
    options: ['Ba²⁺ 和 SO₄²⁻', 'Na⁺ 和 Cl⁻', '四种离子都反应', '都不反应'],
    answer: 0,
  },
  need: '向盛有 2 mL Na₂SO₄ 稀溶液的试管中滴加 2 mL BaCl₂ 稀溶液，观察现象；分析混合前后溶液中的离子',
  conclusion: {
    crops: [{ page: 22, rect: [218, 209, 531, 293] }, { page: 22, rect: [218, 384, 531, 425] }],
    quote: '通过上述现象和分析，我们可以得出这样的结论：当Na2SO4稀溶液与BaCl2稀溶液混合时，Na+、Cl-都没有发生化学反应；而SO42-与Ba2+发生了化学反应，生成难溶的BaSO4白色沉淀。……电解质在溶液中的反应实质上是离子之间的反应，这样的反应属于离子反应。',
    formula: 'Na₂SO₄ + BaCl₂ ══ 2NaCl + BaSO₄↓　　离子方程式：Ba²⁺ + SO₄²⁻ ══ BaSO₄↓',
    why: 'Na₂SO₄ ══ 2Na⁺ + SO₄²⁻，BaCl₂ ══ Ba²⁺ + 2Cl⁻：混合前两种溶液里是 Na⁺、SO₄²⁻ 和 Ba²⁺、Cl⁻。混合后 Ba²⁺ 和 SO₄²⁻ 结合成难溶的 BaSO₄，从溶液里“出来”了（白色沉淀）；<b>Na⁺ 和 Cl⁻ 一个都没少</b>，还在溶液里。<br>所以离子方程式只写真正参加反应的离子：Ba²⁺ + SO₄²⁻ ══ BaSO₄↓。两边原子个数、电荷总数都相等。',
    src: '课本第 17–18 页 · 第一章 第二节 离子反应',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };
    paperSheet(group, { w: 0.2, d: 0.13, x: 0.01, z: 0.01 });

    const ions = () => {          // 试管里的离子（mmol）
      const ba = S.ba, react = Math.min(ba, SO4_0);
      return { na: 2 * SO4_0, so4: SO4_0 - react, ba: ba - react, cl: 2 * ba, ppt: react };
    };
    const B = tubeBench(group, {
      tag, look, back, rate: 5, getS: () => S.bench,
      tubes: [{ x: TX, label: 'Na₂SO₄ 稀溶液', vol: 2, color: 0xe6eef2 }],
      reagents: [{ key: 'bacl2', name: 'BaCl₂ 稀溶液', at: BOT, inside: 0xeef2f4 }],
      onDrop: (k, key) => {
        if (key !== 'bacl2') return;
        S.ba += C * DROP; S.vol += DROP; S.settle = 0; S.drops++;
        if (S.drops === 1) log(['滴入 BaCl₂ 稀溶液', '一滴下去，立刻出现<b>白色沉淀</b>', '生成了难溶的物质']);
        if (Math.abs(S.ba - SO4_0) < 1e-9) { done('drip'); log(['加到 2 mL', '白色沉淀越来越多', '两种溶液恰好完全反应']); status('BaCl₂ 溶液加到 <b>2 mL</b> 了（恰好完全反应）。按住试管左右拖，振荡；再放着不动，看沉淀。'); }
        if (S.ba > SO4_0 + 1e-9 && !S.said.over) { S.said.over = true; log(['再多滴几滴', '<b>不再出现新的沉淀</b>', 'SO₄²⁻ 已经用完了，多出来的 Ba²⁺ 留在溶液里']); status('超过 2 mL 了：再滴下去<b>不再生成沉淀</b>——试管里的 SO₄²⁻ 已经用完了。可以“钻进去看”多出来的 Ba²⁺。'); }
      },
    });

    const fresh = () => ({ demo: false, bench: B.fresh(), ba: 0, vol: 2, settle: 0, drops: 0, shaken: false, said: {} });
    S = fresh();
    const mic = micro({ tag, look, back, group, scene: ionScene({
      words: {
        start: `Na₂SO₄ 溶液里是 ${f('Na+')} 和 ${f('SO4 2-')}（2∶1），它们在水里自由移动。`,
        fall: `滴进来的 BaCl₂ 溶液：${f('Ba2+')} 和 ${f('Cl-')}（1∶2）进了试管里的溶液`,
        react: `${f('Ba2+')} 碰上 ${f('SO4 2-')}，<b>结合成 ${f('BaSO4')}</b>，沉下去；${f('Na+')}、${f('Cl-')} 不参加反应，还在溶液里`,
        partial: `还有 ${f('SO4 2-')} 没反应：再滴 BaCl₂ 还会生成沉淀。${f('Na+')}、${f('Cl-')} 一直在溶液里`,
        done: `${f('SO4 2-')} 恰好都变成了 ${f('BaSO4')} 沉淀（白色）；溶液里剩下 ${f('Na+')} 和 ${f('Cl-')}（就是 NaCl）`,
        excess: `${f('SO4 2-')} 用完了：再滴进来的 ${f('Ba2+')} 找不到 ${f('SO4 2-')}，和 ${f('Cl-')} 一起留在溶液里；溶液里是 ${f('Na+')}、${f('Ba2+')}、${f('Cl-')}`,
      },
    }), at: () => V(TX, T_Y + 0.03, 0), btnAt: () => V(TX + 0.03, T_Y + T_LEN * 0.55, 0.01), label: '钻进去看离子', state: () => { const I = ions(); return { ratio: S.ba / SO4_0, left: I.so4, excess: I.ba, color: 0xb9dfe9 }; }, show: () => S.drops > 0, bar: () => bar, scale: 0.0072, lookD: [0.03, 0.7, 1], dist: 0.26 });          // 从斜上方看：前后分得开
    const card = tag('', 'cond');

    const A = {
      reset() { if (bar.playing) bar.stop(); S = fresh(); mic.close(); W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; W.ui.relock(); } bar.undo('drip', 'shake', 'why'); status('试管里又是 2 mL Na₂SO₄ 稀溶液了。'); },
    };
    const drag = draggable(group, [...B.items], { tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'drip', title: '滴加 BaCl₂ 溶液', todo: '把 <b>BaCl₂ 稀溶液</b>的滴管拖到试管口上方，按住，一滴一滴地加，加到 2 mL（约 40 滴）。', target: () => (S.bench.carry[0] ? null : B.droppers[0]) },
        { id: 'shake', title: '振荡、静置', todo: '按住<b>试管</b>左右拖，振荡；再放着不动，看沉淀。', target: () => B.tubes[0] },
        { id: 'why', title: '想一想', todo: '在左边作答：混合前后，溶液里的离子有什么变化？' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { B.drops.clear(); mic.close(); } }),
          shots: [
            { cap: '试管里是 2 mL Na₂SO₄ 稀溶液。滴入 BaCl₂ 稀溶液——一滴下去就出现白色沉淀。', dur: 9, speed: 1.4, cam: [[TX + 0.01, 0.085, 0.01], [0.04, 0.22, 1], 0.26],
              during: B.dripSeq(drag, 0, [[0, () => S.ba >= SO4_0 - 1e-9]], 0.04, 0.97) },
            { cap: '加到 2 mL，振荡：白色沉淀分散在溶液里。静置，沉淀慢慢沉到试管底部。', dur: 7, speed: 2, cam: [[TX, 0.07, 0.01], [0.04, 0.22, 1], 0.22], during: B.wiggle(act, 0, 0.05, 0.35, 7) },
            { cap: '钻进去看：Ba²⁺ 和 SO₄²⁻ 结合成 BaSO₄ 沉下去；Na⁺ 和 Cl⁻ 一个都没少——离子反应。演示完了，换你自己做。', dur: 11, cam: [[TX, T_Y + 0.08, 0], [0.03, 0.7, 1], 0.26],
              enter: () => mic.open(true), during: act.at(0.98, () => mic.close()) },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    const step = (dt, t) => {
      B.update(dt, t);
      const I = ions(), e = B.shakeE(0);
      if (e > 0.6 && S.ba > 0.05 && !S.shaken) { S.shaken = true; log(['振荡', '白色沉淀分散在整支试管里', '沉淀是生成的 BaSO₄']); status('振荡好了。现在<b>放着不动</b>（静置），看沉淀。'); }
      // 沉淀：刚生成时悬浮（浑浊），不振荡就慢慢沉到管底
      S.settle = Math.min(1, e > 0.1 ? Math.max(0, S.settle - dt * 2) : S.settle + dt / 18);
      if (S.shaken && S.settle > 0.9 && !S.said.settled) { S.said.settled = true; done('shake'); log(['静置', '白色沉淀沉到试管底部，上面的液体又澄清了', 'BaSO₄ 难溶于水']); if (!S.demo) { W?.t1.open(); status('沉淀沉到管底了。在左边作答：混合前后，溶液里的离子有什么变化？'); } }
      const k = Math.min(1, I.ppt / SO4_0);
      B.setTube(0, { vol: S.vol, color: 0xe6eef2, milk: k * (1 - S.settle) * 0.95, milkColor: 0xfbfbf7, speckColor: 0xffffff, sediment: k * S.settle, sedColor: 0xfbfbf8 });
      // 照初中的卡片：名字 + 现象词，下面两行是这一课要看的离子（Na₂SO₄ 的一对、BaCl₂ 的一对）
      const ion = (n, x) => `<b>${mm(x)}</b><small>${n}</small>`;
      card.text(`<div class="cc"><div class="cc-t"><span class="cc-name">试管里的离子</span>${I.ppt > 1e-4 ? '<span class="cc-res">白色沉淀</span>' : ''}</div><div class="cc-more"><div class="cc-obs">${ion('Na⁺', I.na)}${ion('SO₄²⁻', I.so4)}</div><div class="cc-obs">${ion('Ba²⁺', I.ba)}${ion('Cl⁻', I.cl)}<small>（mmol，约）</small></div></div></div>`).loc(group, TX, T_Y + T_LEN + 0.02, 0).show(!bar.playing && S.drops > 0 && !mic.isOpen);
      mic.update?.(dt);
    };

    return {
      group: root, pointer, card: false, toggles: ['cards', 'steps'],
      size: { w: 0.17, d: 0.1, h: 0.13 },
      view: { elev: 20, azim: -6, lookY: 0.45, frameMargin: 1.05 },
      mount(ui) {
        const ctx = () => { const I = ions(); return `<div>混合前：Na⁺ 0.40、SO₄²⁻ 0.20；Ba²⁺ ${mm(S.ba)}、Cl⁻ ${mm(2 * S.ba)}（加进来的）</div><div>混合后：Na⁺ ${mm(I.na)}、SO₄²⁻ ${mm(I.so4)}、Ba²⁺ ${mm(I.ba)}、Cl⁻ ${mm(I.cl)}　（mmol，示意）</div>`; };
        const t2 = think({ q: '写离子方程式 Ba²⁺ + SO₄²⁻ ══ BaSO₄↓ 时，为什么不写 Na⁺ 和 Cl⁻？', ctx, options: ['它们没有参加反应，混合前后一个没少', '它们太小了，写不写都一样', '它们变成了 NaCl 沉淀'], wrong: ['和大小无关：看你的离子卡片，Na⁺、Cl⁻ 前后各是多少？', 'NaCl 易溶于水，不会沉淀；Na⁺、Cl⁻ 还在溶液里。'], ok: '对：用实际参加反应的离子的符号来表示反应的式子叫做离子方程式（课本第 18 页）；不参加反应的离子删去。', status: (m) => W?.status(m), onOk: () => { done('why'); if (W) W.next.hidden = false; } });
        const t1 = think({ q: '混合以后，溶液里哪些离子变少了？', ctx, options: ['Ba²⁺ 和 SO₄²⁻', 'Na⁺ 和 Cl⁻', '四种都变少了'], wrong: ['看看卡片：Na⁺ 一直是 0.40，Cl⁻ 是加进来多少就有多少。', 'Na⁺、Cl⁻ 一个也没少。'], ok: '对：Ba²⁺ 和 SO₄²⁻ 结合成了 BaSO₄ 沉淀，从溶液里“出来”了；Na⁺、Cl⁻ 都还在。', status: (m) => W?.status(m), onOk: () => t2.open() });
        const vary = varyBox('课本说两种溶液“恰好完全反应”（各 2 mL）。多滴几滴试试：还会生成沉淀吗？钻进去看看多出来的离子。');
        const more = moreBox([['钻进去看离子', () => mic.open()]], () => A.reset());
        const note = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'), h('p', { class: 'fineprint', html: '两种溶液都按 0.10 mol/L 计（示意值；课本只说“稀溶液”“恰好完全反应”），2 mL 里各 0.20 mmol；一滴约 0.05 mL。<br>BaSO₄ 难溶，按生成多少沉淀多少计；不振荡时约 20 秒沉到管底（示意）。离子卡片上的数是按滴数算出来的。<br>“钻进去看”里一个离子代表很多个，个数比按 Na₂SO₄、BaCl₂ 的组成画。' }));
        const base = mountXuean(ui, { controls: [vary, more, note], headers: ['做了什么', '现象', '说明'], intro: '试管里是 2 mL Na₂SO₄ 稀溶液。把 BaCl₂ 稀溶液的滴管拖到试管口上方，按住滴加。' });
        ui.data.append(t1.el, t2.el, base.next);
        W = { ...base, ui, t1, t2, status: ui.status }; bar.attach(ui);
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { bar.dispose(); drag.dispose(); mic.dispose?.(); B.dispose(); },
      debug: {
        get S() { return S; }, bar, A, ions,
        picks: { dropper: B.droppers[0].pick, tube: B.tubes[0].pick },
        qa: qaFlow(drag, [
          { name: '滴加 BaCl₂', run: () => B.qaDrip(drag, 0, 0, () => S.ba >= SO4_0 - 1e-9), wait: 12 },
          { name: '振荡', run: () => B.qaShake(drag, 0), wait: 2 },
          { name: '静置', run: () => {}, wait: 24 },
          { name: '钻进去看', run: () => mic.open(), wait: 4 },
          { name: '合上', run: () => mic.close(), wait: 1 },
          { name: '核对', run: () => { const I = ions(); if (!(Math.abs(I.ppt - SO4_0) < 1e-9 && I.so4 < 1e-9 && Math.abs(I.na - 0.4) < 1e-9 && S.shaken && S.settle > 0.9)) throw new Error(JSON.stringify(I)); }, wait: 1 },
          { name: '想一想 1', run: () => W.t1.el.querySelector('button').click() },
          { name: '想一想 2', run: () => W.t2.el.querySelector('button').click() },
        ]),
      },
    };
  },
};
