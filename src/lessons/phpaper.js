// 课题1 溶液的酸碱性 · 实验 10-2 用 pH 试纸测定溶液的 pH（课本下册第 61 页图 10-2）。
//
// 白瓷板上放三小片 pH 试纸。用干燥、洁净的玻璃棒分别蘸取白醋、食盐水、肥皂水点到试纸上，把试纸显示的颜色与标准比色卡比较，读出 pH。
// 课本强调“干燥、洁净的玻璃棒”：蘸过一种溶液没擦干净就蘸下一种，玻璃棒上残留的上一种溶液会混进来，读数就不准了（这里按残留约 1/5 混合算 pH）。
// 模型：白醋 pH 约 3、食盐水 7、肥皂水约 10。比色卡颜色按课本图 10-2（1–14）。
import * as THREE from 'three';
import { buttons, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { textPlate, canvasTex } from './kit/props.js';
import { chemBeaker, CHEM } from './kit/chem.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

// 比色卡（pH 1–14），照课本图 10-2 的颜色：9 橄榄褐、10 深灰紫、11 近黑、12–14 紫色（从课本扫描图取色，饱和度比扫描略高一点，和 1–8 一样）
const CHART = ['#c22b3c', '#d8343a', '#e1503c', '#ea7040', '#f08b3a', '#f2a63a', '#d8b43a', '#a9a640', '#81783d', '#463951', '#342d34', '#60305c', '#5c2b54', '#572a51'];
const PAPER0 = '#f0c64a';
const SOLS = [{ name: '白醋', pH: 3, x: -0.06 }, { name: '食盐水', pH: 7, x: 0 }, { name: '肥皂水', pH: 10, x: 0.06 }];
const TILE = new THREE.Vector3(0, 0, 0.06), STRIP_X = [-0.035, 0, 0.035];
const ROD_HOME = new THREE.Vector3(0.175, 0.004, 0.105), WASH = new THREE.Vector3(0.12, 0, 0.02), CLOTH = new THREE.Vector3(0.12, 0, 0.065);
const mixPH = (a, b, fb) => { const hA = 10 ** -a, hB = 10 ** -b, ohA = 10 ** (a - 14), ohB = 10 ** (b - 14); const H = (1 - fb) * hA + fb * hB, OH = (1 - fb) * ohA + fb * ohB, d = H - OH; return d > 1e-7 ? -Math.log10(d) : d < -1e-7 ? 14 + Math.log10(-d) : 7; };

export default {
  id: 'phpaper',
  fig: '图10-2',
  title: '用 pH 试纸测定溶液的 pH',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '白醋、食盐水、肥皂水，哪一个的 pH 最大？',
    hint: '课本第 61 页：pH 的范围通常为 0~14。',
    options: ['肥皂水', '白醋', '食盐水', '一样大'],
    answer: 0,
  },
  need: '用干燥、洁净的玻璃棒分别蘸取白醋、食盐水、肥皂水点到 pH 试纸上，与标准比色卡比较，读出 pH',
  conclusion: {
    crops: [{ page: 65, rect: [86, 345, 330, 462] }],
    quote: '对于生产、生活和科学研究中的稀溶液，其酸碱度常用 pH 来表示，pH 的范围通常为 0~14。测定 pH 的简便方法是使用 pH 试纸。',
    why: '白醋 pH 约 3（<b>酸性</b>，pH < 7）；食盐水 pH = 7（<b>中性</b>）；肥皂水 pH 约 10（<b>碱性</b>，pH > 7）。pH 越小，酸性越强；pH 越大，碱性越强。<br>测定时要用<b>干燥、洁净</b>的玻璃棒蘸取溶液点到试纸上（不能把试纸直接伸进溶液里）；玻璃棒上残留别的溶液或水，读数就不准。',
    src: '课本下册第 61–62 页 · 第十单元 课题1 溶液的酸碱性（实验 10-2）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); else bar.caption(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };

    paperSheet(group, { w: 0.32, d: 0.18, x: 0.02, z: 0.03 });
    // 三杯溶液
    const cups = SOLS.map((s) => {
      const b = chemBeaker({ r: 0.016, h: 0.04, level: 0.025, color: s.name === '肥皂水' ? 0xeef0f2 : s.name === '白醋' ? 0xf2f0e6 : CHEM.water, marks: false }); b.position.set(s.x, 0, -0.02); group.add(b);
      const lab = textPlate(s.name, { w: 0.02, h: 0.0072, color: '#23293a', bg: '#fffaf0', font: 'bold 78px "Songti SC", serif' }); lab.position.set(s.x, 0.008, -0.02 + 0.0165); group.add(lab);
      return b;
    });
    // 白瓷板、三片 pH 试纸
    const tile = inked(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.004, 0.035), paint(0xfafaf8)), { width: 0.6 }); tile.position.copy(TILE).add(new THREE.Vector3(0, 0.002, 0)); group.add(tile);
    const strips = STRIP_X.map((dx, k) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.0006, 0.024), paint(PAPER0, { keep: true, unique: true })); m.position.copy(TILE).add(new THREE.Vector3(dx, 0.0043, 0)); group.add(m);
      const spot = new THREE.Mesh(new THREE.CircleGeometry(0.0045, 20), paint(PAPER0, { keep: true, unique: true })); spot.rotation.x = -Math.PI / 2; spot.position.copy(m.position).add(new THREE.Vector3(0, 0.0004, 0)); spot.visible = false; group.add(spot);
      const pick = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.01, 0.03), new THREE.MeshBasicMaterial({ visible: false })); pick.position.copy(m.position); pick.userData.pick = true; group.add(pick);
      return { m, spot, pick };
    });
    // 标准比色卡（立着）
    const chartTex = canvasTex(700, 120, (g, Wc, Hc) => { g.fillStyle = '#fffdf6'; g.fillRect(0, 0, Wc, Hc); CHART.forEach((c, i) => { g.fillStyle = c; g.fillRect(10 + i * 49, 10, 44, 70); g.fillStyle = '#23293a'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.fillText(String(i + 1), 32 + i * 49, 110); }); });
    const chart = new THREE.Mesh(new THREE.PlaneGeometry(0.105, 0.018), new THREE.MeshBasicMaterial({ map: chartTex })); chart.position.set(0, 0.006, 0.105); chart.rotation.x = -1.35; group.add(chart);        // 几乎平放在白瓷板前面，不挡住试纸
    const chartBack = inked(new THREE.Mesh(new THREE.BoxGeometry(0.108, 0.02, 0.002), paint(0xfffdf6)), { width: 0.5 }); chartBack.position.copy(chart.position).add(new THREE.Vector3(0, -0.0016, 0.0003)); chartBack.rotation.x = -1.35; group.add(chartBack);
    const chartPick = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.024, 0.01), new THREE.MeshBasicMaterial({ visible: false })); chartPick.userData.pick = true; chart.add(chartPick);
    // 洗玻璃棒的一杯蒸馏水、擦干用的纸
    const wash = chemBeaker({ r: 0.016, h: 0.04, level: 0.025, color: CHEM.water, marks: false }); wash.position.copy(WASH); group.add(wash);
    const wl = textPlate('蒸馏水', { w: 0.02, h: 0.0072, color: '#23293a', bg: '#fffaf0', font: 'bold 78px "Songti SC", serif' }); wl.position.set(WASH.x, 0.008, WASH.z + 0.0165); group.add(wl);
    const cloth = inked(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.002, 0.025), paint(0xfafaf4)), { width: 0.4 }); cloth.position.copy(CLOTH).add(new THREE.Vector3(0, 0.001, 0)); group.add(cloth);
    const cl = textPlate('滤纸（擦干）', { w: 0.028, h: 0.006, color: '#5a6070', bg: 'rgba(0,0,0,0)', font: 'bold 64px "Songti SC", serif' }); cl.rotation.x = -Math.PI / 2; cl.position.copy(CLOTH).add(new THREE.Vector3(0, 0.0025, 0.018)); group.add(cl);
    // 玻璃棒
    const rod = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.09, 10), paint(0xe8f2f6, { transparent: true, opacity: 0.85 })), { width: 0.5 }); rod.geometry.translate(0, 0.045, 0); group.add(rod);
    const rodPick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 8), new THREE.MeshBasicMaterial({ visible: false })); rodPick.position.y = 0.045; rodPick.userData.pick = true; rod.add(rodPick);
    const ROD_REST = ROD_HOME.clone().add(new THREE.Vector3(-0.045, 0, 0)); rod.position.copy(ROD_REST); rod.rotation.z = Math.PI / 2;
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.0018, 10, 8), paint(0xdfeef6, { keep: true, transparent: true, opacity: 0.8 })); drop.visible = false; rod.add(drop);
    const card = tag('', 'cond'); card.px = [0, -60];

    const fresh = () => ({ demo: false, rodCarry: null, rod: { sol: -1, resid: -1, wet: false }, strip: STRIP_X.map(() => null), read: STRIP_X.map(() => false), dirty: false, said: {} });
    S = fresh();

    const A = {
      rodDrag(p) {
        if (!p) return; S.rodCarry = p.clone();
        const R = S.rod, tip = p.clone();
        const c = SOLS.findIndex((s) => Math.hypot(tip.x - s.x, tip.z + 0.02) < 0.012 && tip.y < 0.05);
        if (c >= 0 && R.sol !== c) {
          if (R.sol >= 0 || R.resid >= 0) { R.mix = { from: R.sol >= 0 ? R.sol : R.resid, f: 0.2 }; if (!S.said.dirty && !S.demo) { S.said.dirty = true; status('玻璃棒上还沾着别的溶液就蘸了……读数会不准。每次用之前要在蒸馏水里<b>洗净</b>、用滤纸<b>擦干</b>。'); } } else R.mix = R.wet ? { water: true } : null;
          R.sol = c; R.resid = -1; R.wet = false; sfx.clink({ freq: 2200, gain: 0.015 });
        }
        if (Math.hypot(tip.x - WASH.x, tip.z - WASH.z) < 0.012 && tip.y < 0.05 && (R.sol >= 0 || R.resid >= 0)) { R.resid = -1; R.sol = -1; R.wet = true; R.mix = null; status('在蒸馏水里洗了洗玻璃棒。再用<b>滤纸</b>擦干。'); }
        if (Math.hypot(tip.x - CLOTH.x, tip.z - CLOTH.z) < 0.015 && tip.y < 0.02 && R.wet) { R.wet = false; status('用滤纸擦干了玻璃棒：干燥、洁净。'); }
        const k = STRIP_X.findIndex((dx) => Math.hypot(tip.x - (TILE.x + dx), tip.z - TILE.z) < 0.008 && tip.y < 0.015);
        if (k >= 0 && R.sol >= 0 && !S.strip[k]) {
          const s = SOLS[R.sol]; let pH = s.pH;
          if (R.mix?.from != null) pH = mixPH(s.pH, SOLS[R.mix.from].pH, R.mix.f);
          if (R.mix?.water) pH = s.pH + (7 - s.pH) * 0.15;          // 玻璃棒湿着：被水稀释了一点
          S.strip[k] = { sol: R.sol, pH, dirty: !!R.mix }; R.resid = R.sol; R.sol = -1;
          sfx.clink({ freq: 1900, gain: 0.015 });
          status(`把${s.name}点到了第 ${k + 1} 片 pH 试纸上。点一下<b>比色卡</b>，和试纸的颜色比较，读出 pH。`);
        }
      },
      rodDrop() { S.rodCarry = null; },
      readChart() {
        const k = S.strip.findIndex((x, j) => x && !S.read[j]); if (k < 0) return status('先把溶液点到 pH 试纸上。');
        S.read[k] = true; const x = S.strip[k], s = SOLS[x.sol], p = clamp(Math.round(x.pH), 1, 14);
        log([s.name, `${p}`, p < 7 ? '<b>酸性</b>' : p > 7 ? '<b>碱性</b>' : '<b>中性</b>']);
        status(`第 ${k + 1} 片试纸的颜色和比色卡上的 <b>${p}</b> 最接近：${s.name}的 pH 约为 ${p}${x.dirty ? `（玻璃棒没洗净，混进了别的溶液——真实值约 ${s.pH}）` : ''}。`);
        const doneSols = new Set(S.strip.filter((y, j) => y && S.read[j] && !y.dirty).map((y) => y.sol));
        if (doneSols.size === 3) { done('measure'); W?.t1.open(); }
      },
      reset() { S = fresh(); W?.tbl.clear(); if (W) { W.t1.close(); W.next.hidden = true; } bar.undo('measure', 'why'); status('全部重新摆好了，记录也清空了；换了三片新的 pH 试纸。'); },
    };
    const drag = draggable(group, [
      { obj: rodPick, plane: 'xz', offset: 0.012, hint: '玻璃棒：伸进一杯溶液蘸一下，再点到一片 pH 试纸上；换溶液前在蒸馏水里洗净、用滤纸擦干', onStart: (p) => A.rodDrag(p), onDrag: (p) => A.rodDrag(p), onEnd: () => A.rodDrop() },
    ], { taps: [{ obj: chartPick, hint: '点一下：把试纸的颜色和标准比色卡比较，读出 pH', onTap: () => A.readChart() }], tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const P = (x, y, z) => new THREE.Vector3(x, y, z);
    // 课本的顺序：蘸取 → 点到试纸上 → 立即和比色卡比较、读出 pH → 再在蒸馏水里洗净、用滤纸擦干，换下一种
    const dipRoute = (c, k) => [null, P(SOLS[c].x, 0.06, -0.02), P(SOLS[c].x, 0.01, -0.02), P(SOLS[c].x, 0.06, -0.02), P(TILE.x + STRIP_X[k], 0.03, TILE.z), P(TILE.x + STRIP_X[k], 0.006, TILE.z), P(TILE.x + STRIP_X[k], 0.03, TILE.z)];
    const washRoute = () => [() => (S.rodCarry ? S.rodCarry.clone() : rod.position.clone()), P(WASH.x, 0.06, WASH.z), P(WASH.x, 0.01, WASH.z), P(WASH.x, 0.06, WASH.z), P(CLOTH.x, 0.015, CLOTH.z), P(CLOTH.x, 0.005, CLOTH.z)];
    const upto = (f, t) => (k) => { if (k <= t) f(k); };          // 只做到 k = t：玻璃棒还拿在手里，接下来交给后面的动作

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'measure', title: '测三种溶液的 pH', todo: '用<b>玻璃棒</b>蘸取一种溶液，点到一片 pH 试纸上；点一下<b>比色卡</b>读出 pH。换下一种溶液前，在<b>蒸馏水</b>里洗净、用<b>滤纸</b>擦干。', target: () => (S.rodCarry ? null : S.strip.some((x, j) => x && !S.read[j]) ? chart : rod) },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar }),
          shots: SOLS.map((s, c) => ({ cap: c === 0 ? '用干燥、洁净的玻璃棒蘸取白醋，点到 pH 试纸上，和标准比色卡比较：pH 约为 3。洗净、擦干玻璃棒。' : c === 1 ? '同样测食盐水：pH 为 7。' : '再测肥皂水：pH 约为 10。演示完了，下面换你自己做。', dur: 9, cam: [[0.02, 0.03, 0.04], [0.04, 0.6, 1], 0.3],
            during: act.seq(upto(act.path(rodPick, dipRoute(c, c), { t0: 0.03, t1: 0.4, release: 2 }), 0.4), act.tap(chartPick, 0.45),
              act.path(rodPick, washRoute(), { t0: 0.52, t1: 0.92, release: 0.94, start: false })) })),
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    const step = () => {
      if (S.rodCarry) { rod.position.lerp(new THREE.Vector3(S.rodCarry.x, Math.max(0.003, S.rodCarry.y), S.rodCarry.z), 0.5); rod.rotation.z += (0.15 - rod.rotation.z) * 0.3; }
      else { rod.position.lerp(ROD_REST, 0.2); rod.rotation.z += (Math.PI / 2 - rod.rotation.z) * 0.2; }
      drop.visible = S.rod.sol >= 0 || S.rod.wet;
      strips.forEach((st, k) => {
        const x = S.strip[k];
        st.spot.visible = !!x;
        if (x) st.spot.material.color.set(CHART[clamp(Math.round(x.pH), 1, 14) - 1]);
      });
      const R = S.rod;
      card.text(`<div class="cc"><div class="cc-t"><span class="cc-name">玻璃棒</span></div><div class="cc-more"><div class="cc-obs"><small>${R.sol >= 0 ? `蘸着${SOLS[R.sol].name}` : R.resid >= 0 ? `还沾着${SOLS[R.resid].name}（要洗净）` : R.wet ? '湿的（要擦干）' : '干燥、洁净'}</small></div></div></div>`).loc(rod, 0, 0.09, 0).show(!!S.rodCarry);
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.28, d: 0.16, h: 0.08 },
      view: { elev: 32, azim: -4, lookY: 0.3, frameMargin: 1.06 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = () => [...W.tbl.el.querySelectorAll('tbody tr')].map((tr) => `<div>${tr.children[0].innerHTML}：pH ${tr.children[1].innerHTML}，${tr.children[2].innerHTML}</div>`).join('');
        const t1 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: 'pH 和溶液的酸碱性有什么关系？',
          options: ['pH < 7 酸性，pH = 7 中性，pH > 7 碱性', 'pH 越大酸性越强', 'pH 和酸碱性没有关系'],
          wrong: ['白醋 pH 约 3、显酸性；肥皂水 pH 约 10、显碱性。', '看你的记录。'],
          ok: '对：pH 越小酸性越强，pH 越大碱性越强。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); } });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['溶液', 'pH', '酸碱性']);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来（换新试纸、清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：白醋按 pH 约 3、肥皂水按约 10 计；比色卡颜色照课本图 10-2；玻璃棒没洗净时按残留约 1/5 的上一种溶液混合估算。' });
        ui.controls.append(t1.el, next, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '测得的 pH';
        W = { tbl, t1, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('后面三杯：白醋、食盐水、肥皂水；前面白瓷板上三小片 pH 试纸，最前面是标准比色卡；右边一杯蒸馏水、一张滤纸和一根玻璃棒。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { bar.dispose(); },
      debug: { get S() { return S; }, A, bar, picks: { rod: rodPick, chart: chartPick },
        qa: qaFlow(drag, [
          ...[0, 1, 2].flatMap((c) => [
            { name: `拿起玻璃棒 ${c}`, hold: rodPick }, ...dipRoute(c, c).slice(1).map((p, j) => ({ name: `蘸取、点试纸 ${c}-${j}`, run: () => A.rodDrag(p), wait: 0.15 })), { name: `放下 ${c}`, release: rodPick, wait: 0.3 },
            { name: `读 ${c}`, tap: chartPick, wait: 0.3 },
            { name: `再拿起玻璃棒 ${c}`, hold: rodPick }, ...washRoute().slice(1).map((p, j) => ({ name: `洗净、擦干 ${c}-${j}`, run: () => A.rodDrag(p), wait: 0.15 })), { name: `放下（洗净擦干）${c}`, release: rodPick, wait: 0.3 }]),
          { name: '答', run: () => W.t1.el.querySelector('button').click() },
        ]) },
    };
  },
};
