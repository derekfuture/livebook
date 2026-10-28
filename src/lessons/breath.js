// 图17.2-3 呼气式酒精测试仪（科学世界）。测试仪里：电源、气敏电阻 R₁（酒精传感器）、定值电阻 R₀ 串联，测出 R₀ 两端的电压就能换算出酒精浓度。
// 桌上把测试仪“拆开”：外壳立在后面（吹嘴、显示屏），里面的电路摊在前面，另外接了电流表和电压表。
// 气敏电阻：R₁ = 25 Ω / (1 + 25·c)（c 为呼气中酒精浓度，mg/L）——浓度越大电阻越小。显示屏按 R₀ 两端的电压反算浓度。
import * as THREE from 'three';
import { seg, buttons, goals, note, table, readout } from './kit/ui.js';
import { Circuit, battery, meterPart, resistorPart } from './kit/circuit.js';
import { Bench, nets } from './kit/bench.js';
import { Particles } from './kit/fx.js';
import { canvasTex } from './kit/props.js';
import { paint, inked, hull } from '../live/ink.js';

const E0 = 3, R0 = 5, RG0 = 25, K = 25;
const PEOPLE = [{ label: '没有饮酒', c: 0 }, { label: '饮了少量酒', c: 0.12 }, { label: '饮了较多酒', c: 0.4 }];
const rg = (c) => RG0 / (1 + K * c);
const HOUSE = { x: -0.15, z: -0.07 };

export default {
  id: 'breath',
  fig: '图17.2-3',
  title: '呼气式酒精测试仪',
  stampText: '推理',
  predict: {
    q: '测试仪里的气敏电阻，阻值随酒精气体浓度增大而<b>减小</b>。它和定值电阻 R₀ 串联。<br>呼出的酒精浓度越大，R₀ 两端的电压——',
    hint: '课本第 99 页「科学世界」',
    options: ['越大', '越小', '不变'],
    answer: 0,
  },
  conclusion: {
    crops: [{ page: 104, rect: [160, 304, 456, 348] }, { page: 105, rect: [78, 510, 312, 602] }],   // 课本第 98、99 页
    quote: '导体中的电流，跟导体两端的电压成正比，跟导体的电阻成反比。……酒精气体传感器是一种气敏电阻，它的阻值随酒精气体浓度的变化而变化，从而引起电路中电流和电压的变化。',
    formula: '<i>I</i> = <i>U</i> / <i>R</i>　　<i>I</i> = <i>U</i> / (<i>R</i><sub>1</sub> + <i>R</i><sub>0</sub>)　　<i>U</i><sub>0</sub> = <i>I R</i><sub>0</sub>',
    why: '电源电压不变。酒精浓度越大，气敏电阻 R₁ 越小，串联电路的总电阻越小，由欧姆定律，电流 I 越大；R₀ 是定值电阻，它两端的电压 U₀ = IR₀ 也越大，而气敏电阻两端的电压 U₁ = U − U₀ 变小。测试仪测的就是 U₀，再把它换算成酒精浓度显示出来。用电压表、电流表测出 R₁ 两端的电压和通过它的电流，由 R = U/I 就能算出它此时的电阻。',
    src: '课本第 98–99 页 · 第十七章 第2节 欧姆定律',
  },

  create({ tag }) {
    const group = new THREE.Group();
    let C, bench, A, V, G, Rz;
    const S = { who: 0, at: 'R0', c: 0, target: 0, t: 99, rows: [] };
    let W = null;
    const tags = [];

    // ---- 测试仪外壳：黑色机身、显示屏、吹嘴 ----
    const house = new THREE.Group();
    house.position.set(HOUSE.x, 0, HOUSE.z);
    const body = inked(new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.12, 0.026), paint(0x2b2f3a)), { width: 1.3 });
    body.position.y = 0.06;
    const lcd = canvasTex(320, 160, () => {});
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.046, 0.023), new THREE.MeshBasicMaterial({ map: lcd }));
    screen.position.set(0, 0.085, 0.0131);
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.003, 18), paint(0x3d4352));
    btn.rotation.x = Math.PI / 2; btn.position.set(0, 0.055, 0.0135);
    const mouth = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.03, 14), paint(0xdfe5ea)), 0.0012);
    mouth.rotation.z = Math.PI / 2; mouth.position.set(-0.04, 0.108, 0);
    house.add(body, screen, btn, mouth);
    group.add(house);
    let lastShown = '';
    const drawLcd = (txt, warn) => {
      if (txt === lastShown) return;
      lastShown = txt;
      const g = lcd.image.getContext('2d'), w = 320, h = 160;
      g.fillStyle = warn ? '#e9b2a8' : '#9cc3e6'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#16233a'; g.font = 'bold 86px "DIN Alternate", "Menlo", monospace'; g.textAlign = 'right';
      g.fillText(txt, 262, 112); g.font = '22px sans-serif'; g.fillText('mg/L', 312, 112);
      lcd.needsUpdate = true;
    };
    drawLcd('0.000');
    // 呼出的气：从吹嘴进去，沿气路到传感器
    const puff = new Particles({ max: 160, sprite: true, color: 0xd8e6f2 });
    group.add(puff.mesh);

    const build = () => {
      if (C) { group.remove(C.group); C.dispose(); }
      for (const t of tags.splice(0)) t.remove();
      C = new Circuit();
      C.add(battery('E', { cells: 2, r: 0.05 }), [0.0, -0.1]);
      A = C.add(meterPart('A', { type: 'A' }), [0.16, -0.07]);
      V = C.add(meterPart('V', { type: 'V' }), [0.03, 0.005]);
      A.group.scale.setScalar(0.8); V.group.scale.setScalar(0.8);
      G = C.add(resistorPart('G', { R: rg(S.c) }), [-0.12, 0.08]);
      Rz = C.add(resistorPart('R0', { R: R0 }), [0.1, 0.09]);
      // 气敏电阻上罩一个带网孔的小帽子
      const cap = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.014, 18), paint(0xb0b7c3)), 0.0012);
      cap.position.set(0, 0.018, -0.004);
      G.group.add(cap);
      group.add(C.group);
      C.wire('E.+', 'A.0.6').wire('A.-', 'R0.b').wire('R0.a', 'G.b').wire('G.a', 'E.-');
      if (S.at === 'R0') C.wire('V.3', 'R0.b').wire('V.-', 'R0.a'); else C.wire('V.3', 'G.b').wire('V.-', 'G.a');
      C.solve();
      bench = new Bench(C, group, { onChange: () => judge(), unscrew: false });
      for (const [txt, x, z] of [['气敏电阻 R₁', -0.12, 0.118], ['定值电阻 R₀ = 5 Ω', 0.1, 0.125], ['电源', 0, -0.13]]) tags.push(tag(txt, 'pill').loc(group, x, 0.005, z));
      judge();
    };

    const reading = () => ({ i: Math.round(Math.abs(A.value || 0) / 0.02) * 0.02, u: Math.round(Math.abs(V.value || 0) * 10) / 10 });
    const judge = () => {
      if (!W || !A) return;
      const { i, u } = reading();
      W.out.set('i', i, 2); W.out.set('u', u, 1);
      const blowing = S.t < 4.2;
      if (!blowing) return W.status(`选一个被测的人，点“对着吹嘴吹气”。电压表现在接在${S.at === 'R0' ? '定值电阻 R₀' : '气敏电阻 R₁'}两端。`);
      W.status(`${S.t < 1 ? '正在吹气……' : '示数稳定了。'}电流 ${i.toFixed(2)} A，${S.at === 'R0' ? 'R₀' : 'R₁'} 两端电压 ${u.toFixed(1)} V。${S.t >= 1 ? '点“记下这一次”。' : ''}`);
    };

    return {
      group,
      size: { w: 0.42, d: 0.27, h: 0.12 },
      view: { elev: 44, azim: 0, lookY: 0.3, margin: 1.0 },
      pointer: { down: (r, e) => bench.pointer().down(r, e), move: (r, e) => bench.pointer().move(r, e), up: (r, e) => bench.pointer().up(r, e) },
      mount(ui) {
        const out = readout([{ key: 'i', label: '电流表', unit: 'A', secret: '看电流表读' }, { key: 'u', label: '电压表', unit: 'V', secret: '看电压表读' }]);
        const who = seg('被测的人', PEOPLE.map((p) => p.label), (_, k) => { S.who = k; });
        const at = seg('电压表接在', ['R₀ 两端', '气敏电阻 R₁ 两端'], (_, k) => { S.at = k ? 'G' : 'R0'; S.freeze = false; W.hideQ(); build(); });
        const blow = buttons([{ text: '对着吹嘴吹气', onClick: () => { S.target = PEOPLE[S.who].c; S.t = 0; S.blowWho = S.who; S.freeze = false; W.hideQ?.(); } }]);
        const tb = table(['被测的人', 'I/A', '电压表接在', 'U/V', '显示 mg/L', 'R₁=U₁/I'], { note: '电压表接在 R₁ 两端时，可以用 R = U/I 算出气敏电阻此时的电阻。' });
        const rec = buttons([{ text: '记下这一次', onClick: () => {
          if (S.t < 1 || S.t > 4.2) return ui.status(S.t > 4.2 ? '先吹一口气，等示数稳定再记。' : '示数还在变，等它稳定了再记。');
          const { i, u } = reading();
          const k = S.blowWho;
          // 核对电路：电流表有示数、电压表真的并在选定的元件两端
          const f = nets(C), el = S.at === 'R0' ? 'R0' : 'G';
          const on = (t) => C.wires.some((w) => w.a === t || w.b === t);
          if (i < 0.01) return ui.status('<b>这次不能记：</b>电流表没有示数——电路断开了。先把电路接好。');
          if (!(on('V.3') && on('V.-') && [f('V.3'), f('V.-')].sort().join() === [f(`${el}.a`), f(`${el}.b`)].sort().join())) return ui.status(`<b>这次不能记：</b>电压表没有并联在${S.at === 'R0' ? '定值电阻 R₀' : '气敏电阻 R₁'}两端。`);
          if (S.rows.some((r) => r.k === k && r.at === S.at)) return ui.status('这一种情况已经记过了。换一个人，或者把电压表换个位置。');
          const r1 = S.at === 'G' && i > 0 ? u / i : null;
          // 学生自己读两个电表；电压表接在 R₁ 两端时再自己算 R₁
          S.freeze = true;     // 读表、计算的时候示数先别变（相当于按下仪器的“保持”键）
          const f2 = (x, d) => x.toFixed(d);
          const three = (v, d, unit) => [...new Set([v, v + (d === 2 ? 0.02 : 0.1), Math.max(0, v - (d === 2 ? 0.02 : 0.1))].map((x) => f2(x, d)))].map((x) => `${x} ${unit}`);
          W.ask('读<b>电流表</b>：<i>I</i> = ?', three(i, 2, 'A'), `${f2(i, 2)} A`, '再看看电流表的指针。', () =>
            W.ask(`再读<b>电压表</b>（接在${S.at === 'R0' ? 'R₀' : 'R₁'}两端）：<i>U</i> = ?`, three(u, 1, 'V'), `${f2(u, 1)} V`, '再看看电压表的指针。', () => {
              if (!r1) return save();
              const rs = [r1, u * i, i / u].map((x) => `${x.toFixed(x < 1 ? 2 : 1)} Ω`);
              W.ask(`<i>U</i>₁ = ${f2(u, 1)} V，<i>I</i> = ${f2(i, 2)} A。气敏电阻此时的电阻 <i>R</i>₁ = ?`, rs, rs[0], '用欧姆定律：R = U ÷ I。', save);
            }));
          const save = () => {
          S.freeze = false;
          out.reveal('i'); out.reveal('u');
          S.rows.push({ k, at: S.at, i, u, r1 });
          tb.add([PEOPLE[k].label, i.toFixed(2), S.at === 'R0' ? 'R₀ 两端' : 'R₁ 两端', u.toFixed(1), lastShown, r1 ? `${r1.toFixed(1)} Ω` : '—']);
          const has = (f) => S.rows.some(f);
          if (has((r) => r.k === 0)) W.goal.done('clean');
          if (has((r) => r.k > 0 && r.at === 'R0')) W.goal.done('alc');
          if (S.rows.filter((r) => r.r1).map((r) => r.k).filter((x, j, a) => a.indexOf(x) === j).length >= 2) W.goal.done('r1');
          const ups = S.rows.filter((r) => r.at === S.at).sort((a, b) => PEOPLE[a.k].c - PEOPLE[b.k].c);
          const trend = ups.length >= 2 ? (ups[ups.length - 1].u > ups[0].u ? '酒精浓度越大，这个电压越<b>大</b>。' : '酒精浓度越大，这个电压越<b>小</b>。') : '';
          ui.status(`记下了。${trend}${r1 ? `此时气敏电阻 R₁ = ${u.toFixed(1)} V ÷ ${i.toFixed(2)} A ≈ ${r1.toFixed(1)} Ω。` : ''}`);
          };
        } }]);
        const qb = buttons([0, 1, 2].map(() => ({ text: '', ghost: true, onClick: () => {} })));
        qb.el.hidden = true;
        ui.controls.append(who.el, blow.el, at.el, out.el, rec.el, qb.el, note('测试仪外壳里的电路摊在桌上：电源、气敏电阻 R₁、定值电阻 R₀ 串联，另外接了一个电流表和一个电压表。显示屏上的 mg/L 是按一条示意的“气敏电阻—酒精浓度”曲线换算的，真实仪器要先标定。'));
        ui.data.append(tb.el);
        W = { hideQ: () => { qb.el.hidden = true; }, ask: (q, opts, right, hint, ok) => {
          const sh = [...new Set(opts)].sort(() => Math.random() - 0.5);
          qb.btns.forEach((b, j) => { b.hidden = j >= sh.length; if (b.hidden) return; b.innerHTML = sh[j]; b.onclick = () => { if (sh[j] !== right) return ui.status(hint); qb.el.hidden = true; ok(); }; });
          qb.el.hidden = false; ui.status(q);
        }, out, status: (m) => ui.status(m), goal: goals(ui, [['clean', '测一个没有饮酒的人'], ['alc', '测饮过酒的人，看 R₀ 两端的电压怎样变'], ['r1', '把电压表接到 R₁ 两端，算出两种情况下 R₁ 的电阻']]) };
        build();
      },
      update(dt) {
        // 吹气：1 s 内浓度升到目标值，保持约 3 s，之后传感器慢慢恢复
        if (!S.freeze) S.t += dt;
        const c = S.t < 1 ? S.target * (S.t / 1) : S.t < 4.2 ? S.target : S.target * Math.exp(-(S.t - 4.2) * 0.9);
        if (Math.abs(c - S.c) > 1e-4 || (S.t > 4.2 && S.c > 1e-4)) { S.c = c; if (G) { G.R = rg(c); C.solve(); judge(); } }
        // 显示屏：按 R₀ 两端的电压反算浓度（测试仪内部的测量，和你接的电压表无关）
        if (C) {
          const u0 = Math.abs(C.voltage('R0.b', 'R0.a'));
          const r1 = u0 > 1e-4 ? (E0 * R0) / u0 - R0 - 0.12 : RG0;     // 0.12 Ω：电池内阻和电流表的电阻（测试仪出厂时校准过）
          const cc = Math.max(0, (RG0 / Math.max(0.5, r1) - 1) / K);
          drawLcd((cc < 0.003 ? 0 : cc).toFixed(3), cc >= 0.09);   // 0.09 mg/L 以上屏幕变红
        }
        // 气
        if (S.t < 1.6) for (let k = 0; k < 3; k++) puff.spawn({ p: new THREE.Vector3(HOUSE.x - 0.06, 0.108, HOUSE.z), v: new THREE.Vector3(0.05 + Math.random() * 0.02, (Math.random() - 0.5) * 0.01, (Math.random() - 0.5) * 0.01), size: 0.012, life: 0.9, alpha: 0.5 });
        puff.update(dt, (p, d) => { p.p.addScaledVector(p.v, d); p.v.multiplyScalar(1 - d * 2.5); p.alpha = 0.5 * (1 - p.age / p.life); p.size = 0.012 + p.age * 0.02; });
        C?.update(dt); bench?.update(dt);
      },
      dispose() { puff.dispose?.(); },
      debug: { get C() { return C; }, blow: (k) => { S.who = k; S.target = PEOPLE[k].c; S.t = 0; S.blowWho = k; } },
    };
  },
};
