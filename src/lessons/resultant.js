// 图8.4-2 / 8.4-3 研究同一直线上二力的合成。橡皮筋一端固定，另一端连着小圆环。
//   同向：两个弹簧测力计都向右拉，把小圆环拉到 O 点，标记 O，记下 F₁、F₂；再只用一个测力计把小圆环拉到 O 点，记下 F合。
//   反向：一个向右、一个向左拉，标记 O′；再用一个测力计拉到 O′。
// 直接操作：拖测力计的圆环（手拉的那一端）左右拉；点小圆环标记它的位置。面板也有按钮。读数由学生自己读。
// 物理：橡皮筋的伸长 ∝ 拉力（劲度系数固定），测力计的伸长 ∝ 拉力；用二分法求出小圆环的平衡位置。
import * as THREE from 'three';
import { seg, buttons, goals, note, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { forceMeter, FM } from './kit/forcemeter.js';
import { paint, inked, polyline } from '../live/ink.js';

const WALL = -0.24, X0 = -0.1, KB = 30, KS = 1 / FM.PER_N, HOOK = FM.L + 0.03, Y = 0.03;

export default {
  id: 'resultant',
  fig: '图8.4-2',
  title: '研究同一直线上二力的合成',
  stampText: '探究',
  predict: {
    q: '两个测力计同时向右拉，示数分别是 1.2 N 和 1.8 N。<br>只用一个测力计把小圆环拉到同一位置，示数是——',
    hint: '课本第 34 页「演示」',
    options: ['1.8 N', '3.0 N', '0.6 N'],
    answer: 1,
  },
  conclusion: {
    page: 39, rect: [62, 120, 362, 200],
    quote: '同一直线上的两个力，如果方向相同，合力的大小等于这两个力的大小之和，合力的方向与这两个力的方向相同；如果方向相反，合力的大小等于这两个力的大小之差，合力的方向与较大的力方向一致。',
    formula: '同向 <i>F</i> = <i>F</i><sub>1</sub> + <i>F</i><sub>2</sub>　　反向 <i>F</i> = <i>F</i><sub>1</sub> − <i>F</i><sub>2</sub>',
    why: '两次都把小圆环拉到同一位置 O，橡皮筋伸长得一样多——一个力产生的效果和两个力共同产生的效果相同，这个力就叫那两个力的合力（等效替代）。同向时，一个测力计的示数等于两个示数之和；反向时，等于两个示数之差，方向和较大的那个力相同。',
    src: '课本第 33–35 页 · 第八章 第4节 同一直线上二力的合成',
  },

  create({ tag, look, back }) {
    const group = new THREE.Group();
    const wall = inked(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.06, 0.06), paint(0x8f99a8)), { width: 1.2 }); wall.position.set(WALL, Y, 0);
    const deck = inked(new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.006, 0.16), paint(0xe9dcc0)), { width: 1.2 }); deck.position.set(0.05, 0.003, 0);
    group.add(wall, deck);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 1, 8), paint(0x8a5a40)); band.rotation.z = Math.PI / 2; group.add(band);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.005, 0.0012, 8, 16), paint(0x5b6272)); ring.rotation.x = Math.PI / 2; group.add(ring);
    const ringPick = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); group.add(ringPick);
    const meters = [0, 1].map(() => { const m = forceMeter(); group.add(m); return m; });
    const picks = [0, 1].map(() => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.045), new THREE.MeshBasicMaterial({ visible: false })); group.add(p); return p; });
    const ropes = [0, 1].map(() => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.0006, 0.0006, 1, 4), new THREE.MeshBasicMaterial({ color: 0x3a3f4e })); l.rotation.z = Math.PI / 2; group.add(l); return l; });
    const mark = polyline([new THREE.Vector3(0, 0.006, -0.05), new THREE.Vector3(0, 0.006, 0.05)], { dashed: true, width: 1.5, color: 0xd9483b, dash: 0.006, gap: 0.004 });
    mark.visible = false; group.add(mark);
    const mTag = tag('', 'mag big'), fTags = [tag('', 'pill'), tag('', 'pill')];

    // mode：same 同向两个 | opp 反向两个 | one 一个
    const S = { mode: 'same', h: [0.3, 0.33], O: null, x: X0, F: [0, 0], rows: [], pend: null, seen: new Set(), lastTwo: null };
    let W = null;
    const status = (m) => W?.status(m);
    const dirs = () => (S.mode === 'same' ? [1, 1] : S.mode === 'opp' ? [1, -1] : [1, 0]);
    // 测力计 i 的拉力（向右为正）：右拉时 = KS·(h − x − HOOK)，左拉时 = −KS·(x − h − HOOK)
    const pull = (i, x) => { const d = dirs()[i]; if (!d) return 0; return d > 0 ? Math.max(0, KS * (S.h[i] - x - HOOK)) : -Math.max(0, KS * (x - S.h[i] - HOOK)); };
    const solve = () => {
      let lo = WALL + 0.02, hi = 0.3;
      for (let k = 0; k < 40; k++) { const x = (lo + hi) / 2; const net = pull(0, x) + pull(1, x) - KB * (x - X0); if (net > 0) lo = x; else hi = x; }
      S.x = (lo + hi) / 2; S.F = [pull(0, S.x), pull(1, S.x)];
    };
    const layout = () => {
      solve();
      const x = S.x, zs = S.mode === 'one' ? [0, 0] : S.mode === 'opp' ? [-0.03, 0.058] : [-0.03, 0.03];     // 反向时向左拉的那个放在铁架外侧，不和它重叠
      band.scale.y = x - WALL; band.position.set((x + WALL) / 2, Y, 0);
      ring.position.set(x, Y, 0); ringPick.position.set(x, Y, 0);
      meters.forEach((m, i) => {
        const d = dirs()[i];
        m.visible = !!d; picks[i].visible = !!d; ropes[i].visible = !!d;
        if (!d) { picks[i].position.set(0, -1, 0); return; }
        const F = Math.abs(S.F[i]), ext = F * FM.PER_N;
        m.set(F);
        m.rotation.set(-Math.PI / 2, 0, d > 0 ? -Math.PI / 2 : Math.PI / 2);     // 躺在桌面上，刻度朝上
        m.position.set(S.h[i], Y, zs[i]);
        picks[i].position.set(S.h[i] - d * 0.09, Y, zs[i]);
        const hookX = S.h[i] - d * (HOOK - 0.03 + ext + 0.03);
        ropes[i].scale.y = Math.max(0.001, Math.abs(hookX - x)); ropes[i].position.set((hookX + x) / 2, Y, zs[i] / 2); ropes[i].rotation.set(0, Math.atan2(zs[i], Math.abs(hookX - x)) * Math.sign(hookX - x || 1) * -1, Math.PI / 2);
        fTags[i].loc(group, S.h[i] - d * 0.2, Y + 0.012, zs[i] * 1.9).text(S.mode === 'one' ? 'F合' : d > 0 ? (S.mode === 'opp' ? 'F₁′' : i ? 'F₂' : 'F₁') : 'F₂′');
      });
      if (!dirs()[1]) fTags[1].loc(group, 0, -9, 0);
      if (S.O != null) { mark.visible = true; mark.position.x = S.O; mTag.loc(group, S.O, 0.012, 0.06).text(S.mode === 'same' || S.Okind === 'same' ? 'O' : 'O′'); } else { mark.visible = false; mTag.loc(group, 0, -9, 0); }
    };
    layout();

    const markO = () => {
      if (S.mode === 'one') return status('先用两个测力计把小圆环拉到某个位置，再标记它。');
      if (Math.abs(S.F[0]) < 0.2 || Math.abs(S.F[1]) < 0.2) return status('两个测力计都要拉紧（都有示数）。');
      if (S.F.some((f) => Math.abs(f) > FM.MAX)) return status('有一个测力计<b>超过了量程</b>（指针顶到了 5 N 还在往外拉）——这样会拉坏弹簧，也读不出数。把它往回松一点。');
      S.O = S.x; S.Okind = S.mode; S.pend = { kind: S.mode, F: [...S.F] }; layout();
      W?.askRead(0);
    };
    const pointer = draggable(group, picks.map((p, i) => ({ obj: p, plane: 'xz', offset: Y, keepOffset: true, hint: '左右拉测力计', onDrag: (q) => { S.h[i] = dirs()[i] > 0 ? clamp(q.x + 0.09, -0.1, 0.42) : clamp(q.x - 0.09, -0.45, -0.1); W?.drop?.(); } })), { tip: tag('', 'pill'), taps: [{ obj: ringPick, hint: '点一下：标记小圆环现在的位置', onTap: markO }] });

    return {
      group,
      size: { w: 0.62, d: 0.12, h: 0.06 },
      view: { elev: 50, azim: 0, lookY: 0.3, margin: 1.02 },
      pointer,
      mount(ui) {
        const tb = table(['', 'F₁/N', 'F₂/N', 'F合/N']);
        const pick = buttons([0, 1, 2].map(() => ({ text: '', ghost: true, onClick: () => {} })));
        pick.el.hidden = true;
        W = { status: (m) => ui.status(m), drop: () => { if (!pick.el.hidden) { pick.el.hidden = true; back(); } } };
        // 读哪个测力计，就凑近看哪个（读完回到原来的机位）
        const near = (i) => { const w = new THREE.Box3().setFromObject(meters[i]).getCenter(new THREE.Vector3()); look(group.worldToLocal(w).toArray(), [0, 1, 0.3], 0.3, () => back()); };
        const ask = (q, val, ok, i = 0) => {
          near(i);
          const v = Math.round(Math.abs(val) * 10) / 10;
          const opts = [...new Set([v, +(v + 0.2).toFixed(1), +Math.max(0.1, v - 0.2).toFixed(1)])].sort(() => Math.random() - 0.5);
          pick.btns.forEach((b, j) => { b.hidden = j >= opts.length; if (b.hidden) return; b.textContent = `${opts[j].toFixed(1)} N`; b.onclick = () => { if (opts[j] !== v) return ui.status('再看看指针（每小格 0.2 N）。'); pick.el.hidden = true; back(); ok(v); }; });
          pick.el.hidden = false; ui.status(q);
        };
        W.askRead = (k) => {
          const P = S.pend;
          if (k === 0) return ask(`标记了 ${P.kind === 'same' ? 'O' : 'O′'} 点。读<b>向右拉</b>的测力计：${P.kind === 'same' ? 'F₁' : 'F₁′'} = ?`, P.F[0], (v) => { P.r = [v]; W.askRead(1); }, 0);
          ask(`再读另一个测力计：${P.kind === 'same' ? 'F₂' : 'F₂′'} = ?`, P.F[1], (v) => { P.r.push(v); S.lastTwo = P; ui.status(`记下了 ${P.r[0]} N 和 ${P.r[1]} N。现在换成<b>一个测力计</b>，把小圆环拉到 ${P.kind === 'same' ? 'O' : 'O′'} 点（红色虚线），读它的示数。`); modeSel.set(2, true); }, 1);
        };
        const readOne = () => {
          if (S.mode !== 'one') return ui.status('先换成“一个测力计”。');
          if (S.O == null || !S.lastTwo) return ui.status('先用两个测力计拉，标记位置。');
          if (Math.abs(S.F[0]) > FM.MAX) return ui.status('测力计<b>超过了量程</b>，读不出数。');
          if (Math.abs(S.x - S.O) > 0.003) return ui.status(`小圆环还没到红线：${S.x < S.O ? '再往右拉一点' : '拉过了，往回松一点'}。`);
          const P = S.lastTwo;
          ask('小圆环到了红线。读这个测力计：F合 = ?', S.F[0], (v) => {
            tb.add([P.kind === 'same' ? '同向' : '反向', P.r[0].toFixed(1), P.r[1].toFixed(1), v.toFixed(1)]);
            S.lastTwo = null; S.O = null; layout();
            // 学生自己从这一行数据里找关系（反向时还要说出合力的方向）
            const sum = (P.r[0] + P.r[1]).toFixed(1), dif = (P.r[0] - P.r[1]).toFixed(1);
            const opts = P.kind === 'same'
              ? [['F合 = F₁ + F₂，方向和两个力相同', 1], ['F合 = F₁ − F₂', 0], ['F合 比 F₁、F₂ 都小', 0]]
              : [['F合′ = F₁′ − F₂′，方向向右（和较大的力相同）', 1], ['F合′ = F₁′ + F₂′', 0], ['F合′ = F₁′ − F₂′，方向向左', 0]];
            const sh = opts.sort(() => Math.random() - 0.5);
            pick.btns.forEach((b, j) => { b.hidden = false; b.textContent = sh[j][0]; b.onclick = () => {
              if (!sh[j][1]) return ui.status(P.kind === 'same' ? `用表格这一行算一算：${P.r[0]} + ${P.r[1]} = ?  ${P.r[0]} − ${P.r[1]} = ?  哪个和 F合 = ${v} N 一样？` : `用表格这一行算一算，再看一个测力计时是往哪边拉的。`);
              pick.el.hidden = true; W.goal.done(P.kind);
              ui.status(P.kind === 'same' ? `对：${P.r[0]} N + ${P.r[1]} N = ${sum} N，和 F合 = ${v} N 相等。` : `对：${P.r[0]} N − ${P.r[1]} N = ${dif} N，和 F合′ = ${v} N 相等；一个测力计是向右拉的，和较大的 F₁′ 方向相同。`);
            }; });
            pick.el.hidden = false;
            ui.status('看表格里这一行：F合 和 F₁、F₂ 有什么关系？');
          });
        };
        const modeSel = seg('用', ['两个测力计，同向', '两个测力计，反向', '一个测力计'], (_, k) => {
          S.mode = ['same', 'opp', 'one'][k];
          S.h = S.mode === 'same' ? [0.3, 0.33] : S.mode === 'opp' ? [0.283, -0.302] : [0.3, 0];     // 反向时默认约 3.6 N 和 1.6 N，都在 5 N 量程以内
          pick.el.hidden = true; layout();
        });
        ui.controls.append(note('<b>拖测力计</b>左右拉；拉好以后<b>点小圆环</b>标记它的位置（红色虚线）。'), modeSel.el, buttons([{ text: '标记小圆环的位置', ghost: true, onClick: markO }, { text: '只用一个测力计时：读示数…', onClick: readOne }]).el, pick.el);
        ui.data.append(tb.el);
        W.goal = goals(ui, [['same', '方向相同的两个力：F₁、F₂ 和 F合'], ['opp', '方向相反的两个力：F₁′、F₂′ 和 F合′']]);
        ui.status('两个测力计都向右拉橡皮筋。<b>拖测力计</b>把小圆环拉到某个位置，然后<b>点小圆环</b>标记。');
      },
      update() { layout(); },
      debug: { S },
    };
  },
};
