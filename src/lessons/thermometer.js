// 图3.1-4 温度计的使用和读数方法：玻璃泡全部浸入、不碰杯底杯壁、等示数稳定再读、视线与液面相平。
import * as THREE from 'three';
import { seg, readout, buttons, table, goals, note, guard } from './kit/ui.js';
import { beaker, thermometer } from './kit/props.js';
import { draggable, clamp } from './kit/interact.js';
import { paint, polyline } from '../live/ink.js';

const WATERS = [{ name: '冷水', T: 12 }, { name: '温水', T: 41 }, { name: '热水', T: 76 }];
const ROOM = 24;

export default {
  id: 'thermometer',
  fig: '图3.1-4',
  title: '用温度计测量水的温度',
  predict: {
    q: '把温度计插进热水里，马上读数。<br>读出的温度会怎样？',
    hint: '课本第 60 页「实验」',
    options: ['正好是热水的温度', '比热水的实际温度低', '比热水的实际温度高'],
    answer: 1,
  },
  conclusion: {
    quote: '温度计的玻璃泡应该全部浸入被测的液体中，不要碰到容器底或容器壁。',
    why: '玻璃泡浸入被测液体后要<b>稍微等一会儿</b>，待温度计的示数稳定后再读数；读数时玻璃泡要继续留在液体中，<b>视线要与温度计中的液面相平</b>——俯视读数偏大，仰视读数偏小。常用的液体温度计是根据液体热胀冷缩的规律制成的。',
    src: '课本第 59–61 页 · 第三章 第1节 温度',
  },

  create({ tag, look, back }) {
    const group = new THREE.Group();
    const cups = WATERS.map((w, i) => {
      const b = beaker({ r: 0.035, h: 0.09, level: 0.065, color: i === 0 ? 0xa8dcf2 : i === 1 ? 0x9fd2ea : 0x8fc7e6 });
      b.position.set((i - 1) * 0.1, 0, 0);
      group.add(b);
      const t = tag(w.name, 'pill'); t.loc(group, (i - 1) * 0.1, -0.012, 0.04);
      return b;
    });
    const th = thermometer({ min: -20, max: 110, length: 0.22 });
    const holder = new THREE.Group();
    holder.add(th);
    group.add(holder);
    const eye = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.007, 16, 12), paint(0xffffff));
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 12, 8), paint(0x22252e));
    pupil.position.z = -0.006;
    eye.add(ball, pupil);
    eye.rotation.y = Math.PI;
    group.add(eye);
    const sight = new THREE.Group();
    group.add(sight);
    const tState = tag('', 'pill');

    const S = { cup: -1, x: 0.17, y: 0.1, T: ROOM, eye: 0, tried: new Set(), rows: [] };
    let G = null;

    const placement = () => {
      if (S.cup < 0) return 'out';
      const c = cups[S.cup];
      const bulbBottom = S.y - 0.009;
      const dx = Math.abs(S.x - c.position.x);
      if (bulbBottom < 0.006) return 'bottom';
      if (dx > 0.026) return 'wall';
      if (S.y > c.level - 0.004) return 'shallow';
      return 'ok';
    };

    const layout = () => {
      holder.position.set(S.x, S.y, 0);
      const pl = placement();
      tState.loc(group, S.x + 0.03, S.y + 0.24, 0).text({ out: '在空气中', bottom: '玻璃泡碰到了杯底 ✗', wall: '玻璃泡碰到了杯壁 ✗', shallow: '玻璃泡没有全部浸入 ✗', ok: '玻璃泡全部浸入 ✓' }[pl]);
      tState.el.style.color = pl === 'ok' ? '#2f8a4c' : pl === 'out' ? '' : '#c0392b';
      // 眼睛位置：在液柱顶端的高度，或高/低
      const top = S.y + th.yOf(S.T);
      eye.position.set(S.x + 0.09, top + S.eye * 0.05, 0.04);
      sight.clear();
      sight.add(polyline([eye.position.clone(), new THREE.Vector3(S.x + 0.01, top, 0.004)], { dashed: true, color: 0x2f7fd8, width: 1.4, dash: 0.006, gap: 0.004 }));
    };

    // 读数：视线不平时，因为刻度在玻璃管前面一点，读数偏差
    const reading = () => S.T + S.eye * 3;

    const pointer = draggable(group, [{ obj: holder, plane: 'xy', onStart: (p) => { S._g = [S.x - p.x, S.y - p.y]; }, onDrag: (p) => {
      S.x = clamp(p.x + S._g[0], -0.15, 0.2); S.y = clamp(p.y + S._g[1], 0.0, 0.16);
      // 落到哪个杯子里
      S.cup = -1;
      cups.forEach((c, i) => { if (Math.abs(S.x - c.position.x) < 0.04 && S.y < 0.085) S.cup = i; });
      if (S.cup >= 0 && S.y - 0.009 < 0.004) S.y = 0.013;   // 不能穿过杯底
      S.since = 0;
      layout();
    } }]);
    layout();

    return {
      group,
      size: { w: 0.42, d: 0.12, h: 0.36 },
      view: { elev: 12, azim: -6, lookY: 0.5, margin: 1.22 },
      pointer,
      mount(ui) {
        const out = readout([{ key: 't', label: '温度计示数', unit: '℃', secret: true }, { key: 'st', label: '示数' }]);
        const eyeSel = seg('读数时，眼睛', ['仰视（偏低）', '与液面相平', '俯视（偏高）'], (_, k) => { S.eye = k - 1; layout(); if (S.eye) G.goal.done('eye'); }, { value: 1 });
        const tb = table(['杯子', '温度/℃', '说明']);
        const rec = buttons([{ text: '读数并记录', onClick: () => {
          const pl = placement();
          if (pl === 'out') return ui.status('先把温度计放进一杯水里（拖动温度计）。');
          if (pl !== 'ok') return ui.status(`不对：${{ bottom: '玻璃泡碰到了杯底，测到的不只是水温。', wall: '玻璃泡碰到了杯壁。', shallow: '玻璃泡要全部浸入被测的液体中。' }[pl]}`);
          if (!S.stable) { G.goal.done('early'); return ui.status('示数还在变化，要等示数<b>稳定</b>后再读数。'); }
          if (S.eye) return ui.status(`视线没有与液面相平：读出 ${reading().toFixed(0)} ℃，${S.eye > 0 ? '偏高' : '偏低'}了。`);
          const w = WATERS[S.cup];
          if (S.tried.has(S.cup)) return ui.status('这杯已经测过了，测另一杯。');
          const T = Math.round(S.T), opts = [...new Set([T, T + 2, T - 2])].sort(() => Math.random() - 0.5);
          pick.btns.forEach((b, j) => { b.hidden = j >= opts.length; b.textContent = `${opts[j]} ℃`; b.onclick = () => {
            if (opts[j] !== T) return ui.status('再看看液柱的顶端对着哪条刻度（每小格 1 ℃）。凑近一点，视线和液柱顶端相平。');
            pick.el.hidden = true; back();
            S.tried.add(S.cup);
            tb.add([w.name, T, '正确读数']);
            out.reveal('t');
            if (S.tried.size >= 3) G.goal.done('three');
            ui.status(`${w.name}的温度是 <b>${T} ℃</b>。${S.tried.size < 3 ? '再测另一杯。' : ''}`);
          }; });
          pick.el.hidden = false; S.guard?.arm();
          if (innerWidth < 760) nearTh();
          ui.status('视线与液柱顶端相平，读出温度计的示数（可以点“凑近看温度计”）：');
        } }]);
        const pick = buttons([0, 1, 2].map(() => ({ text: '', ghost: true, onClick: () => {} })));
        pick.el.hidden = true;
        S.guard = guard(pick.el, () => `${S.cup}|${S.eye}|${placement()}`, () => { back(); ui.status("温度计的位置或读数时的视线变了，刚才那道读数题作废。"); });     // 条件变了，待答的题作废
        // 凑近看液柱顶端：视线和液柱顶端相平（手机上画面小，答题时自动凑近）
        const nearTh = () => { const p = holder.position.clone().add(th.position); look([p.x, p.y + th.yOf(S.T), p.z], [0, 0, 1], 0.09, () => back()); };
        const near = buttons([{ text: '凑近看温度计', ghost: true, onClick: nearTh }]);
        ui.controls.append(note('拖动温度计，把它放进一杯水里。'), out.el, eyeSel.el, rec.el, pick.el, near.el);
        ui.data.append(tb.el);
        G = { out, goal: goals(ui, [['three', '正确测出冷水、温水、热水的温度'], ['early', '试试示数还没稳定时就读'], ['eye', '试试仰视或俯视读数']]) };
        this._G = G;
        ui.status('分度值是 1 ℃，量程是 −20 ℃ ~ 110 ℃。');
      },
      update(dt) { S.guard?.check();
        const pl = placement();
        const env = pl === 'out' ? ROOM : pl === 'shallow' ? (WATERS[S.cup].T + ROOM) / 2 : pl === 'bottom' || pl === 'wall' ? WATERS[S.cup].T * 0.85 + ROOM * 0.15 : WATERS[S.cup].T;
        const prev = S.T;
        S.T += (env - S.T) * (1 - Math.exp(-dt * 0.9));
        S.stable = Math.abs(S.T - env) < 0.3;
        th.setTemp(S.T);
        layout();
        const G = this._G;
        if (G) { G.out.set('t', reading(), 1); G.out.set('st', S.stable ? '稳定了' : Math.abs(S.T - prev) > 1e-3 ? (S.T < env ? '正在上升…' : '正在下降…') : '—'); }
      },
    };
  },
};
