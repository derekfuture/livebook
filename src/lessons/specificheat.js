// 图13.1-2 / 13.1-3 用相同的电加热器加热质量相等的水和食用油。两只烧杯各 200 g，初温相同，各插一支温度计和一个电加热器。
// 加热器相同：每秒放出的热量相同，液体每秒吸收的热量也相同——所以“加热时间”就代表“吸收的热量”。
// 做法：给两杯同时（或分别）通电加热，各自升到 50 ℃ 时断电；比较两杯用的加热时间（吸收的热量）。
// 直接操作：点每个加热器的插头通电 / 断电；点温度计凑近读数。面板也能做。
// 物理：Δt = Pt/(cm)，c水 = 4.2×10³、c油 ≈ 2.1×10³ J/(kg·℃)，加热器 100 W，略去散热；时间按 15 倍加快。
import * as THREE from 'three';
import { buttons, goals, note, table, readout, chart } from './kit/ui.js';
import { draggable } from './kit/interact.js';
import { beaker, thermometer, glowTexture } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { paint, inked, hull } from '../live/ink.js';

const M = 0.2, P = 100, T0 = 20, TGT = 50, FAST = 15;
const LIQ = [{ name: '水', c: 4200, color: 0xcfe6f3 }, { name: '食用油', c: 2100, color: 0xe9c95a }];

export default {
  id: 'specificheat',
  fig: '图13.1-2',
  title: '比较不同物质吸热的情况',
  stampText: '探究',
  predict: {
    q: '用相同的电加热器，把质量相等的水和食用油从 20 ℃ 加热到 50 ℃。<br>哪一杯需要加热的时间长（吸收的热量多）？',
    hint: '课本第 3 页',
    options: ['水', '食用油', '一样长'],
    answer: 0,
  },
  conclusion: {
    crops: [{ page: 9, rect: [62, 308, 362, 352] }, { page: 9, rect: [62, 413, 362, 540] }],
    quote: '实验表明：质量相等的水和食用油，升高的温度相同时，水吸收的热量比食用油多。……大量实验表明：不同物质，在质量相等、升高的温度相同时，吸收的热量一般不同。……一定质量的某种物质，在温度升高时吸收的热量与它的质量和升高的温度乘积之比，叫作这种物质的比热容。',
    formula: '<i>c</i> = <i>Q</i> / (<i>m</i>Δ<i>t</i>)　　<i>Q</i> = <i>cm</i>Δ<i>t</i>',
    why: '两个加热器相同，相同时间里两杯液体吸收的热量相同，所以加热时间的长短就表示吸收热量的多少（转换法）。实验中控制质量相同、升高的温度相同，只让物质的种类不同（控制变量法）。水升高 30 ℃ 用的时间约是食用油的 2 倍，吸收的热量也约是 2 倍——水的比热容约是食用油的 2 倍。反过来看：吸收同样多的热量，水的温度升高得少。',
    src: '课本第 2–3 页 · 第十三章 第1节 热量 比热容',
  },

  create({ tag, look, back }) {
    const group = new THREE.Group();
    const cups = LIQ.map((L, i) => {
      const x = i ? 0.075 : -0.075;
      const bk = beaker({ r: 0.035, h: 0.09, level: 0.06, color: L.color, opacity: i ? 0.75 : 0.5 });
      bk.position.set(x, 0, 0);
      group.add(bk);
      const th = thermometer({ min: 0, max: 100, length: 0.18 });
      th.position.set(x - 0.012, 0.012, 0.005);
      group.add(th);
      // 电加热器：一根弯成螺旋的金属管 + 木柄 + 电线插头
      const heater = new THREE.Group();
      const pts = [];
      for (let k = 0; k <= 80; k++) { const a = (k / 80) * Math.PI * 4; pts.push(new THREE.Vector3(Math.cos(a) * 0.018, 0.012 + (k / 80) * 0.004, Math.sin(a) * 0.018)); }
      pts.push(new THREE.Vector3(0.02, 0.05, 0), new THREE.Vector3(0.03, 0.1, 0), new THREE.Vector3(0.045, 0.105, 0));
      const coilMat = paint(0x7d8593, { unique: true });
      const coil = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.0025, 6, false), coilMat);
      const handle = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.007, 0.03, 12), paint(0xc8955a)), 0.001);
      handle.rotation.z = Math.PI / 2; handle.position.set(0.06, 0.106, 0);
      heater.add(coil, handle);
      // 通电后电热丝发红发光，周围的液体受热上升（看得见的“热流”）
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff5a2a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.scale.set(0.06, 0.03, 1); glow.position.y = 0.014; heater.add(glow);
      const shimmer = new Particles({ max: 60, sprite: true, color: i ? 0xffd36a : 0xffffff });
      shimmer.mesh.position.set(x, 0, 0); group.add(shimmer.mesh);
      heater.position.set(x, 0, 0);
      group.add(heater);
      const plug = inked(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.014), paint(0xf0f0f0)), { width: 1 });
      plug.position.set(x + 0.06, 0.006, 0.07);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 10, 8), new THREE.MeshBasicMaterial({ color: 0x553333 }));
      lamp.position.set(x + 0.06, 0.014, 0.07);
      const cord = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(x + 0.075, 0.106, 0), new THREE.Vector3(x + 0.1, 0.06, 0.03), new THREE.Vector3(x + 0.07, 0.008, 0.07)]), 20, 0.0012, 5, false), paint(0x2b2f3a));
      group.add(plug, lamp, cord);
      tag(`${L.name} 200 g`, 'pill').loc(group, x, 0.005, 0.05);
      return { L, bk, th, coilMat, plug, lamp, glow, shimmer, T: T0, on: false, t: 0, done: null, x, bubbles: 0, pts: [] };
    });
    const S = { rows: [], seen: new Set() };
    let W = null;
    const status = (m) => W?.status(m);
    const toggle = (c) => {
      if (c.done != null && !c.on) return status(`${c.L.name}已经测完了（加热 ${c.done.toFixed(0)} s）。点“重新开始”可以再做一次。`);
      if (c.stop && !c.on) return status(`先读出${c.L.name}断电时温度计的示数（下面选一个）。`);
      c.on = !c.on;
      if (c.on) status(`${c.L.name}的加热器通电了，开始计时。眼睛盯住温度计，升到 ${TGT} ℃ 就断电。`);
      else askStop(c);
    };
    let askStop = () => {};
    const pointer = draggable(group, [], { tip: tag('', 'pill'), taps: [
      ...cups.map((c) => ({ obj: c.plug, hint: () => (c.on ? '点一下：断电（停止计时）' : '点一下：给加热器通电'), onTap: () => toggle(c) })),
      ...cups.map((c) => ({ obj: c.th, hint: '点一下：凑近看温度计', onTap: () => look([c.x - 0.012, 0.012 + c.th.yOf(c.T), 0.005], [0, 0.1, 1], 0.12, () => back()) })),
    ] });

    return {
      group,
      size: { w: 0.3, d: 0.16, h: 0.2 },
      view: { elev: 14, azim: 0, lookY: 0.45, margin: 1.1 },
      pointer,
      mount(ui) {
        const out = readout([{ key: 'a', label: '水的加热时间', unit: 's' }, { key: 'b', label: '油的加热时间', unit: 's' }, { key: 'ta', label: '水温', unit: '℃', secret: true }, { key: 'tb', label: '油温', unit: '℃', secret: true }]);
        const tb = table(['物质', '质量 m/g', '初温/℃', '末温/℃', '加热时间/s']);
        const choices = buttons([0, 1, 2].map(() => ({ text: '', ghost: true, onClick: () => {} })));
        choices.el.hidden = true;
        // 每杯断电时把“加热时间、温度”拍成快照排队等学生读数；两杯的问题互不覆盖，重新开始会全部作废
        const queue = [];
        const ask = () => {
          const c = queue[0];
          if (!c) { choices.el.hidden = true; return; }
          const { T, t } = c.stop;
          const opts = [...new Set([T, T + 3, T - 3])].sort(() => Math.random() - 0.5);
          choices.btns.forEach((b, j) => { b.hidden = j >= opts.length; b.textContent = `${c.L.name} ${opts[j]} ℃`; b.onclick = () => {
            if (c.stop?.T !== T || queue[0] !== c) return;
            if (opts[j] !== T) return status(`再看看${c.L.name}的温度计（每小格 1 ℃）。点温度计可以凑近看。`);
            queue.shift(); c.stop = null;
            if (Math.abs(T - TGT) > 2) { c.t = 0; c.T = T0; c.done = null; status(`${c.L.name}断电时是 ${T} ℃——要升到 ${TGT} ℃ 才断电（升高的温度要相同，才能比较）。这杯液体放凉了，重新加热。`); return ask(); }
            c.done = t;
            S.chart.series[cups.indexOf(c)].points = c.pts.filter((q) => q[0] <= t).concat([[t, T]]); S.chart.x.max = Math.max(300, Math.ceil(Math.max(...cups.map((x) => x.done || 0)) / 50) * 50); S.chart.draw();
            tb.add([c.L.name, String(M * 1000), String(T0), String(T), t.toFixed(0)]);
            out.reveal(c === cups[0] ? 'ta' : 'tb');
            const other = cups.find((x) => x !== c);
            const [w, o] = cups.map((x) => x.done);
            if (w > 0 && o > 0 && Number.isFinite(w / o)) { W.goal.done('both'); status(`水用了 ${w.toFixed(0)} s，食用油用了 ${o.toFixed(0)} s。升高相同的温度，水用的时间是油的约 ${(w / o).toFixed(1)} 倍——<b>水吸收的热量多</b>。`); }
            else status(`${c.L.name}：升到 ${T} ℃ 用了 ${t.toFixed(0)} s。${other.stop ? `再读${other.L.name}的温度计。` : other.on ? '另一杯还在加热。' : `再给${other.L.name}加热到 ${TGT} ℃。`}`);
            ask();
          }; });
          choices.el.hidden = false;
        };
        askStop = (c) => {
          if (c.t < 1) { c.t = 0; c.T = T0; return status(`${c.L.name}刚通电就断开了，还没开始加热。`); }
          c.stop = { T: Math.round(c.T), t: c.t };
          queue.push(c);
          if (queue[0] === c) { ask(); status(`${c.L.name}断电了（加热 ${c.t.toFixed(0)} s）。读温度计：现在是多少 ℃？`); }
          else status(`${c.L.name}也断电了。先读完${queue[0].L.name}的温度，再读${c.L.name}的。`);
        };
        const reset = () => {
          queue.length = 0; choices.el.hidden = true; tb.clear(); W.goal.undo('both');
          cups.forEach((c, i) => { c.on = false; c.T = T0; c.t = 0; c.done = null; c.stop = null; c.pts = []; S.chart.series[i].points = []; }); S.chart.x.max = 300; S.chart.draw();
          status('重新开始：两杯都放凉到 20 ℃，表格清空。');
        };
        const btns = buttons([
          { text: '水 通/断电', ghost: true, onClick: () => toggle(cups[0]) },
          { text: '油 通/断电', ghost: true, onClick: () => toggle(cups[1]) },
          { text: '同时通电', ghost: true, onClick: () => cups.forEach((c) => { if (!c.on && c.done == null && !c.stop) toggle(c); }) },
          { text: '重新开始', ghost: true, onClick: reset },
        ]);
        ui.controls.append(note(`两杯液体的质量都是 200 g，初温都是 ${T0} ℃，加热器相同。<b>点加热器的插头</b>通电，升到 ${TGT} ℃ 时再点一下断电（手有快慢，断电时在 ${TGT - 2}–${TGT + 2} ℃ 之间都算升到了）。<b>点温度计</b>凑近读数。（时间加快了 ${FAST} 倍）`), btns.el, choices.el, out.el);
        // 温度—时间图像：两杯一起画，一眼看出哪杯升温快
        const ch = chart({ x: { label: '加热时间 t/s', min: 0, max: 300 }, y: { label: '温度 / ℃', min: 20, max: 60 }, series: [{ color: '#2f7fd8', points: [], line: true }, { color: '#d9a21c', points: [], line: true }], legend: '<span style="color:#2f7fd8">━</span> 水　<span style="color:#d9a21c">━</span> 食用油　（虚线是 50 ℃；读完温度计、记下数以后才画出来）', height: 150 });
        ch.extra = (g, X, Y) => { g.save(); g.setLineDash([8, 6]); g.strokeStyle = '#c0392b'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(0), Y(TGT)); g.lineTo(X(300), Y(TGT)); g.stroke(); g.restore(); };
        S.chart = ch;
        ui.data.append(tb.el, ch.el);
        ch.draw();
        W = { out, status: (m) => ui.status(m), goal: goals(ui, [['both', `把水和食用油都从 ${T0} ℃ 加热到 ${TGT} ℃，比较加热时间`]]) };
        ui.status('点两杯中间的“两杯同时通电”，或者分别点加热器的插头。');
      },
      update(dt) {
        for (const [i, c] of cups.entries()) {
          if (c.on) { c.t += dt * FAST; c.T += (P * dt * FAST) / (c.L.c * M); }
          c.T = Math.min(98, c.T);
          c.th.setTemp(c.T);
          c.lamp.material.color.setHex(c.on ? 0xff3b2f : 0x553333);
          c.coilMat.color.setHex(c.on ? 0xc8442a : 0x7d8593);
          c.glow.material.opacity += ((c.on ? 0.55 : 0) - c.glow.material.opacity) * Math.min(1, dt * 4);
          if (c.on && Math.random() < dt * 25) { const a = Math.random() * Math.PI * 2, r = Math.random() * 0.018; c.shimmer.spawn({ p: new THREE.Vector3(Math.cos(a) * r, 0.016, Math.sin(a) * r), v: new THREE.Vector3(0, 0.02 + Math.random() * 0.015, 0), size: 0.008, life: 1.8, alpha: 0 }); }
          c.shimmer.update(dt, (p, d) => { p.p.addScaledVector(p.v, d); p.p.x += Math.sin(p.age * 6 + p.size * 999) * 0.0002; const k = p.age / p.life; p.alpha = Math.sin(Math.PI * k) * 0.35; return p.p.y < 0.058; });
          if (c.on && (!c.pts.length || c.t - c.pts[c.pts.length - 1][0] > 3)) c.pts.push([c.t, c.T]);     // 先记着，读完数才画出来（不然看图就知道温度了）
          W?.out.set(i ? 'b' : 'a', c.t, 0); W?.out.set(i ? 'tb' : 'ta', c.T, 1);
          if (c.on && c.T > TGT + 6 && !c.warned) { c.warned = true; status(`${c.L.name}已经超过 ${TGT} ℃ 了，赶快断电。`); }
          if (!c.on) c.warned = false;
        }
      },
      debug: { cups },
    };
  },
};
