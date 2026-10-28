// 图3.2-2 观察熔化现象：试管中装海波（或石蜡），放在盛水的烧杯里用酒精灯加热（水浴法），每隔 1 min 记录温度。
// 能量模型：Q 均匀地流入试管物质。海波是晶体（熔点 48 ℃），熔化时吸热但温度不变；石蜡是非晶体，没有固定熔点。
import * as THREE from 'three';
import { draggable } from './kit/interact.js';
import { seg, buttons, readout, chart, table, goals, note } from './kit/ui.js';
import { beaker, alcoholLamp, thermometer, stand } from './kit/props.js';
import { paint, hull, glassEdge } from '../live/ink.js';

const START = 26;
const SUBS = {
  hypo: { name: '海波', mp: 48, cs: 1, cl: 1.4, L: 26, color: 0xf2f2ec, liquid: 0xe8f3f6 },
  wax: { name: '石蜡', cs: 1.2, color: 0xf6eecf, liquid: 0xf2e6b8 },
};

export default {
  id: 'melting',
  fig: '图3.2-2',
  title: '探究固体熔化时温度的变化规律',
  predict: {
    q: '用酒精灯持续加热海波。<br>海波熔化的过程中，它的温度会怎样？',
    hint: '课本第 64–65 页「实验」',
    options: ['一直升高', '保持不变', '先降低后升高'],
    answer: 1,
  },
  conclusion: {
    quote: '有些固体在熔化时尽管被不断加热，温度却保持不变，有固定的熔化温度，例如冰、海波、各种金属。这类固体叫作晶体。',
    why: '晶体熔化时的温度叫作<b>熔点</b>（海波约 48 ℃）。海波在熔化前温度不断升高，熔化时温度保持不变，熔化后温度继续升高，熔化过程中要不断吸热。石蜡在熔化时，只要不断地吸热，温度就不断上升，没有固定的熔化温度——这类固体叫作<b>非晶体</b>。同一种晶体的凝固点和它的熔点相同。',
    src: '课本第 64–66 页 · 第三章 第2节 熔化和凝固',
  },

  create({ tag, look, back }) {
    const group = new THREE.Group();
    const st = stand({ height: 0.32 });
    st.position.set(-0.08, 0, 0);
    group.add(st);
    st.clamp(0.06, 0.08, { ring: true, r: 0.04 });   // 石棉网架
    const gauze = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.002, 32), paint(0xc8ccd2));
    gauze.position.set(0, 0.064, 0);
    group.add(gauze);
    const cup = beaker({ r: 0.04, h: 0.09, level: 0.07 });
    cup.position.set(0, 0.065, 0);
    group.add(cup);
    // 试管
    const tube = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.12, 20, 1, true), paint(0xdff1f8, { transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }));
    glass.position.y = 0.06;
    glassEdge(glass, 0.0008);
    const bottom = new THREE.Mesh(new THREE.SphereGeometry(0.009, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), paint(0xdff1f8, { transparent: true, opacity: 0.4 }));
    tube.add(glass, bottom);
    // 试管里的物质：固体颗粒 + 液体
    const solid = new THREE.Group();
    const grains = [];
    for (let i = 0; i < 26; i++) {
      const g = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, 0.004), paint(0xf2f2ec, { unique: true }));
      g.position.set((Math.random() - 0.5) * 0.011, 0.002 + Math.random() * 0.038, (Math.random() - 0.5) * 0.011);
      g.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      solid.add(g);
      grains.push(g);
    }
    const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 1, 16), paint(0xe8f3f6, { unique: true, transparent: true, opacity: 0.8 }));
    liq.geometry.translate(0, 0.5, 0);
    tube.add(solid, liq);
    tube.position.set(-0.012, 0.08, 0);
    group.add(tube);
    const arm = st.clamp(0.24, 0.08);
    void arm;
    const th = thermometer({ min: 0, max: 100, length: 0.2 });
    th.position.set(-0.012, 0.088, 0.0);
    th.scale.setScalar(0.85);
    group.add(th);
    const lamp = alcoholLamp();
    lamp.position.set(0, -0.012, 0);
    lamp.scale.setScalar(0.85);
    group.add(lamp);
    const tT = tag('', 'pill');

    const S = { sub: 'hypo', heat: false, Q: 0, T: START, frac: 0, t: 0, nextRead: 0, done: new Set(), recording: false };
    let G = null;

    // 物质的温度与熔化比例由累计吸热 Q 决定
    const stateFromQ = (Q) => {
      const s = SUBS[S.sub];
      if (S.sub === 'wax') {
        // 非晶体：温度一直上升，但在 45~60 ℃ 之间变软变稀，上升略慢
        const T = START + Q / s.cs - Math.max(0, Math.min(Q / s.cs - 20, 15)) * 0.25;
        return { T, frac: Math.min(1, Math.max(0, (T - 44) / 18)) };
      }
      const q1 = (s.mp - START) * s.cs;
      if (Q < q1) return { T: START + Q / s.cs, frac: 0 };
      if (Q < q1 + s.L) return { T: s.mp, frac: (Q - q1) / s.L };
      return { T: s.mp + (Q - q1 - s.L) / s.cl, frac: 1 };
    };

    const reset = () => {
      S.Q = 0; S.t = 0; S.nextRead = 0; S.heat = false; S.recording = false; S.paused = false;
      Object.assign(S, stateFromQ(0));
      G?.reset();
    };

    // 直接点酒精灯：没点着就点火，点着了就熄灭（和纸卡上的按钮做同一件事）
    let lampTap = null, G_ask = null;
    const tLamp = tag('点酒精灯点火', 'pill');
    const pointer = draggable(group, [{ obj: lamp, onTap: () => lampTap?.() }], { taps: [{ obj: th, onTap: () => lookTh() }] });
    // 凑近看温度计：对准液柱顶端（温度计可能挂在别的组里，换算到实验的坐标）
    const lookTh = () => { group.updateMatrixWorld(true); const l = group.worldToLocal(th.localToWorld(new THREE.Vector3(0.006, th.yOf(S.T), 0))); look([l.x, l.y, l.z], [0.15, 0.05, 1], 0.09, () => back()); };

    return {
      group,
      pointer,
      size: { w: 0.24, d: 0.12, h: 0.3 },
      view: { elev: 12, azim: -24, lookY: 0.42, margin: 1.0 },
      mount(ui) {
        const out = readout([{ key: 'T', label: '温度', unit: '℃', secret: true }, { key: 't', label: '加热时间', unit: 'min' }]);
        const sub = seg('试管里装', ['海波（晶体）', '石蜡（非晶体）'], (_, k) => { S.sub = k ? 'wax' : 'hypo'; for (const g of grains) g.material.color.setHex(SUBS[S.sub].color); liq.material.color.setHex(SUBS[S.sub].liquid); reset(); });
        const btn = buttons([{ text: '🔥 点燃酒精灯，开始记录', onClick: () => { if (S.t > 0 && !S.heat) { reset(); } S.heat = true; S.recording = true; } }, { text: '熄灭', ghost: true, onClick: () => { S.heat = false; } }]);
        lampTap = () => (S.heat ? btn.btns[1] : btn.btns[0]).click();
        const ch = chart({ x: { label: '时间/min', min: 0, max: 15 }, y: { label: '温度/℃', min: 20, max: 80 }, series: [{ color: '#d9483b', points: [], dots: true }, { color: '#2f7fd8', points: [], dots: true }], fit: true, legend: '红：海波　蓝：石蜡（两条曲线都会留着，方便比较）' });
        const tb = table(['时间/min', '温度/℃', '状态']);
        // 每到整分钟，计时暂停，学生读温度计、看试管里的状态，记一行
        const ask = buttons([0, 1, 2].map(() => ({ text: '', ghost: true, onClick: () => {} })));
        ask.el.hidden = true;
        const q = (text, opts, right, hint, ok) => { ask.btns.forEach((b, j) => { b.hidden = j >= opts.length; if (b.hidden) return; b.textContent = opts[j]; b.onclick = () => { if (j !== right) return ui.status(hint); ask.el.hidden = true; ok(); }; }); ask.el.hidden = false; ui.status(text); };
        G_ask = (m, T, state) => {
          const Tr = Math.round(T);
          const ts = [...new Set([Tr, Tr + 2, Tr - 2])].sort(() => Math.random() - 0.5);
          q(`第 <b>${m} min</b>（计时暂停）：读温度计，现在是多少 ℃？`, ts.map((x) => `${x} ℃`), ts.indexOf(Tr), '再看看温度计液柱的顶端（每小格 1 ℃）。点温度计可以凑近看。', () => {
            const states = S.sub === 'wax' ? ['固态', '变软、变稀', '液态'] : ['固态', '固液共存', '液态'];
            const si = states.indexOf(state);
            const finish = () => {
              G.ch.series[S.sub === 'wax' ? 1 : 0].points.push([m, Tr]); G.ch.draw();
              G.tb.add([String(m), String(Tr), m % 2 ? '' : state]);
              out.reveal('T');
              S.paused = false;
              if (m >= 15) { S.recording = false; S.heat = false; G.goal.done(S.sub); ui.status(S.sub === 'hypo' ? '看你画的曲线：海波熔化时有一段<b>水平</b>的线——温度保持不变，但酒精灯一直在加热，它一直在吸热。' : '看你画的曲线：石蜡的温度<b>一直在升高</b>，没有固定的熔化温度。'); }
              else ui.status(`记下了第 ${m} min。继续加热……`);
            };
            if (m % 2) return finish();      // 状态每 2 min 看一次，温度每分钟都读
            q(`${Tr} ℃。再看试管里的${SUBS[S.sub].name}：它现在是什么状态？`, states, si, '凑近看看试管：还有没有固体颗粒？有没有液体？', finish);
          });
        };
        const lookBtn = buttons([{ text: '凑近看温度计', ghost: true, onClick: () => lookTh() }]);
        ui.controls.append(sub.el, btn.el, ask.el, lookBtn.el, out.el, note('时间加快了：1 min 用 1.5 s 演示。每到整分钟计时会停一下，你读温度计、看状态，记一行。用“水浴法”加热，物质受热均匀、温度上升较慢，便于观察。'));
        ui.data.append(ch.el, tb.el);
        G = {
          out, ch, tb, ui,
          goal: goals(ui, [['hypo', '加热海波，直到全部熔化'], ['wax', '加热石蜡，对比两条曲线']]),
          reset: () => { ch.series[S.sub === 'wax' ? 1 : 0].points = []; ch.draw(); tb.clear(); },
        };
        this._G = G;
        ui.status('点燃酒精灯（点灯或按钮）。每到整分钟，读一次温度计、看一次状态。');
      },
      update(dt, t) {
        lamp.flame.setOn(S.heat);
        tLamp.loc(group, lamp.position.x + 0.05, 0.03, 0.03).text(S.heat ? '点一下熄灭' : '点酒精灯点火');
        lamp.flame.update(t);
        if (S.heat && !S.paused) {
          const SPEED = 1 / 1.5;      // 1.5 s = 1 min
          S.t += dt * SPEED;
          S.Q += dt * SPEED * 4.2;    // 每分钟吸热（单位任意）
          Object.assign(S, stateFromQ(S.Q));
        }
        th.setTemp(S.T);
        // 固体颗粒随熔化比例消失；液面随之升高
        grains.forEach((g, i) => { g.visible = i / grains.length >= S.frac * 1.02; });
        liq.visible = S.frac > 0.01;
        liq.scale.y = 0.004 + S.frac * 0.03;
        liq.material.opacity = 0.5 + S.frac * 0.35;
        tT.loc(group, 0.05, 0.3, 0).text('');     // 温度要学生自己从温度计上读
        const G = this._G;
        if (!G) return;
        G.out.set('T', S.T, 1);
        G.out.set('t', S.t, 1);
        if (S.recording && !S.paused && S.t >= S.nextRead) {
          const m = Math.round(S.nextRead);
          S.t = S.nextRead; S.paused = true; S.nextRead += 1;
          const state = S.sub === 'wax' ? (S.frac < 0.05 ? '固态' : S.frac < 0.95 ? '变软、变稀' : '液态') : S.frac <= 0.001 ? '固态' : S.frac < 0.999 ? '固液共存' : '液态';
          G_ask?.(m, S.T, state);
        }
      },
    };
  },
};
