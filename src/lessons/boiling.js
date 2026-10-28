// 图3.3-2 观察水沸腾的实验装置：水温接近 90 ℃ 时开始计时，每隔 0.5 min 读数一次，直到沸腾 4~5 min。
// 沸腾前：气泡在上升过程中变小（底部的气泡遇冷液化）；沸腾时：气泡在上升过程中变大，到水面破裂。
// 撤去酒精灯，水停止沸腾 → 沸腾要持续吸热。加盖可以减少热量散失（时间更短）。
import * as THREE from 'three';
import { draggable } from './kit/interact.js';
import { seg, buttons, readout, chart, table, goals, note } from './kit/ui.js';
import { beaker, alcoholLamp, thermometer, stand } from './kit/props.js';
import { bubbles, steam } from './kit/fx.js';
import { paint, inked } from '../live/ink.js';

const BP = 99;   // 实验室里常见的沸点（课本：不同地方气压不同，可能不是 100 ℃）

export default {
  id: 'boiling',
  fig: '图3.3-2',
  title: '探究水在沸腾前后温度变化的特点',
  predict: {
    q: '水沸腾以后继续用酒精灯加热，<br>水的温度会怎样？',
    hint: '课本第 71 页「实验」',
    options: ['继续升高', '保持不变', '开始下降'],
    answer: 1,
  },
  stampText: '探究',
  conclusion: {
    page: 78, rect: [160, 156, 460, 386],      // 课本第 72 页：“实验表明……液体在沸腾的过程中不断吸热。”
    quote: '实验表明，水在沸腾前，温度不断升高；水在沸腾后，温度保持不变。',
    why: '在沸腾的过程中，虽然水的温度保持不变，但要用酒精灯持续加热——<b>液体在沸腾的过程中不断吸热</b>。撤去酒精灯，水很快就停止沸腾。各种液体沸腾时都有确定的温度，这个温度叫作<b>沸点</b>。沸腾是液体内部和表面同时发生的剧烈汽化现象：沸腾时，大量气泡在上升过程中变大，到水面破裂开来。',
    src: '课本第 71–72 页 · 第三章 第3节 汽化和液化',
  },

  create({ tag, look, back }) {
    const group = new THREE.Group();
    const st = stand({ height: 0.34 });
    st.position.set(-0.08, 0, 0);
    group.add(st);
    st.clamp(0.06, 0.08, { ring: true, r: 0.045 });
    const gauze = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.002, 32), paint(0xc8ccd2));
    gauze.position.set(0, 0.064, 0);
    group.add(gauze);
    const cup = beaker({ r: 0.045, h: 0.1, level: 0.065 });
    cup.position.set(0, 0.065, 0);
    group.add(cup);
    const lid = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.003, 32), paint(0xd8b07a)));
    lid.position.set(0, 0.167, 0);
    group.add(lid);
    const th = thermometer({ min: 0, max: 110, length: 0.22 });
    th.position.set(0.012, 0.08, 0);
    th.scale.setScalar(0.9);
    group.add(th);
    st.clamp(0.29, 0.09);
    const lamp = alcoholLamp();
    lamp.position.y = -0.012;
    lamp.scale.setScalar(0.85);
    group.add(lamp);
    const bub = bubbles({ r: 0.04 });
    bub.mesh.position.set(0, 0.067, 0);
    group.add(bub.mesh);
    const vap = steam({ max: 160 });
    group.add(vap.mesh);
    const tT = tag('', 'pill big');

    const S = { heat: false, lid: false, T: 86, t: 0, rec: false, next: 0, boilT: 0, offAfterBoil: false, lidTried: { on: null, off: null } };
    let G = null;

    // 直接点酒精灯：没点着就点火，点着了就熄灭（和纸卡上的按钮做同一件事）
    let lampTap = null;
    const tLamp = tag('点酒精灯点火', 'pill');
    const pointer = draggable(group, [{ obj: lamp, onTap: () => lampTap?.() }], { taps: [{ obj: th, onTap: () => lookTh() }] });
    // 凑近看温度计：对准液柱顶端（温度计可能挂在别的组里，换算到实验的坐标）
    const lookTh = () => { group.updateMatrixWorld(true); const l = group.worldToLocal(th.localToWorld(new THREE.Vector3(0.006, th.yOf(S.T), 0))); look([l.x, l.y, l.z], [0.15, 0.05, 1], 0.09, () => back()); };

    let G_ask = null;
    return {
      group,
      pointer,
      size: { w: 0.26, d: 0.12, h: 0.36 },
      view: { elev: 12, azim: -12, lookY: 0.42, margin: 1.2 },
      mount(ui) {
        const out = readout([{ key: 'T', label: '水温', unit: '℃', secret: true }, { key: 't', label: '计时', unit: 'min' }]);
        const lidSel = seg('烧杯上', ['不加盖', '加纸盖（留一个小孔）'], (_, k) => { S.lid = k === 1; lid.visible = S.lid; });
        const btn = buttons([{ text: '🔥 点燃酒精灯', onClick: () => { S.heat = true; if (!S.rec) { S.rec = true; S.t = 0; S.next = 0; S.T = 86; G.reset(); } } }, { text: '撤去酒精灯', ghost: true, onClick: () => { S.heat = false; if (S.T >= BP - 0.05) { S.offAfterBoil = true; } } }]);
        lampTap = () => (S.heat ? btn.btns[1] : btn.btns[0]).click();
        const ch = chart({ x: { label: '时间/min', min: 0, max: 8 }, y: { label: '温度/℃', min: 85, max: 102 }, series: [{ color: '#d9483b', points: [], dots: true }], fit: true });
        const tb = table(['时间/min', '温度/℃', '是否沸腾']);
        // 每到记录时刻，计时暂停：学生读温度计、判断水是否沸腾（看气泡）
        const pick = buttons([0, 1, 2].map(() => ({ text: '', ghost: true, onClick: () => {} })));
        const lookBtn = buttons([{ text: '凑近看温度计', ghost: true, onClick: () => lookTh() }]);
        pick.el.hidden = true;
        const ask = (q, opts, right, hint, ok) => { pick.btns.forEach((b, j) => { b.hidden = j >= opts.length; if (b.hidden) return; b.textContent = opts[j]; b.onclick = () => { if (opts[j] !== right) return ui.status(hint); pick.el.hidden = true; ok(); }; }); pick.el.hidden = false; ui.status(q); };
        G_ask = (tm, T, boiling) => {
          const Tr = Math.round(T);
          const ts = [...new Set([Tr, Tr + 1, Tr - 2])].map((x) => `${x} ℃`).sort(() => Math.random() - 0.5);
          ask(`<b>${tm.toFixed(0)} min</b>（计时暂停）：读温度计，水温是多少？`, ts, `${Tr} ℃`, '再看看液柱顶端对着哪一格（每小格 1 ℃）。点温度计可以凑近看。', () => {
            const done = () => { G.ch.series[0].points.push([tm, Tr]); G.ch.draw(); G.tb.add([tm.toFixed(0), String(Tr), boiling ? '是' : '否']); out.reveal('T'); S.paused = false; ui.status('记下了，继续加热……'); };
            if (S.askedBoil && boiling === S.lastBoil) return done();
            S.askedBoil = true; S.lastBoil = boiling;
            ask('看烧杯里的气泡：水<b>沸腾</b>了吗？', ['沸腾了', '还没沸腾'], boiling ? '沸腾了' : '还没沸腾', '沸腾时，大量气泡在水中上升、<b>变大</b>，到水面破裂；沸腾前气泡少，上升时<b>变小</b>。', done);
          });
        };
        ui.controls.append(lidSel.el, btn.el, pick.el, lookBtn.el, out.el, note('时间加快了：1 min 用 2 s 演示。从 86 ℃ 开始计时，每隔 1 min 计时会停一下，你读温度计、看气泡，记一行。本实验设定的沸点是 99 ℃（实验室里常见：气压略低于标准大气压时，水的沸点低于 100 ℃）。'));
        ui.data.append(ch.el, tb.el);
        G = {
          out, ch, tb, ui,
          goal: goals(ui, [['boil', '加热到水沸腾，并继续加热 3 min 以上'], ['off', '水沸腾后撤去酒精灯，观察'], ['bubble', '对比沸腾前和沸腾时的气泡']]),
          reset: () => { ch.series[0].points = []; ch.draw(); tb.clear(); },
        };
        lid.visible = false;
        this._G = G;
        ui.status('点燃酒精灯。注意观察水中气泡的变化。');
      },
      update(dt, t) {
        lamp.flame.setOn(S.heat);
        tLamp.loc(group, lamp.position.x + 0.05, 0.03, 0.03).text(S.heat ? '点一下熄灭' : '点酒精灯点火');
        lamp.flame.update(t);
        const SPEED = 0.5;    // 2 s = 1 min
        const boiling = S.T >= BP - 0.05 && S.heat;
        if (S.rec && !S.paused) S.t += dt * SPEED;
        // 加热功率 vs 散热：加盖散热少
        const loss = S.rec ? (S.T - 25) * (S.lid ? 0.01 : 0.022) : 0;   // 还没开始时水温保持 86 ℃
        const gain = S.heat ? 4.6 : 0;
        const run = S.paused ? 0 : 1;      // 读数时计时暂停（气泡照样冒，方便看）
        S.T = Math.min(BP, S.T + (gain - loss) * dt * SPEED * run);
        if (boiling) S.boilT += dt * SPEED * run;
        th.setTemp(S.T);
        // 气泡：沸腾前少、上升变小；沸腾时多、上升变大
        const pre = S.heat && S.T > 90 && !boiling;
        bub.update(dt, { level: cup.level - 0.002, rate: boiling ? 70 : pre ? 10 + (S.T - 90) * 3 : 0, grow: boiling });
        vap.update(dt, { rate: boiling ? (S.lid ? 10 : 26) : S.T > 92 ? 3 : 0, origin: new THREE.Vector3(0, S.lid ? 0.17 : 0.13, 0), spread: S.lid ? 0.006 : 0.06, up: 0.05, size: 0.025 });
        tT.loc(group, 0.06, 0.32, 0).text('');
        const G = this._G;
        if (!G) return;
        G.out.set('T', S.T, 1);
        G.out.set('t', S.t, 1);
        if (pre) G._pre = true;
        if (boiling && G._pre) G.goal.done('bubble');
        if (S.rec && !S.paused && S.t >= S.next) {
          S.paused = true;
          G_ask?.(S.next, S.T, boiling);
          S.next += 1;
          if (S.boilT >= 3) { G.goal.done('boil'); if (!G._said) { G._said = true; G.ui.status(`水在 ${BP} ℃ 沸腾后，继续加热，温度<b>保持不变</b>。现在撤去酒精灯试试。`); } }
          if (S.next > 12) S.rec = false;
        }
        if (S.offAfterBoil && !S.heat && S.T < BP - 0.3) { S.offAfterBoil = false; G.goal.done('off'); G.ui.status('撤去酒精灯后，水很快停止了沸腾：水沸腾时要<b>持续吸热</b>。'); }
      },
      dispose() { bub.dispose(); vap.dispose(); },
    };
  },
};
