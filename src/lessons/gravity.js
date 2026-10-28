// 图7.3-2 测量钩码所受的重力 · 探究重力的大小跟质量的关系。
// 弹簧测力计挂在铁架台上，一个个挂上 50 g 的钩码；钩码静止后读测力计的示数（学生自己读），记入表格，描 G–m 图像。
import * as THREE from 'three';
import { buttons, goals, note, table, chart, guard } from './kit/ui.js';
import { stand, hookWeight } from './kit/props.js';
import { draggable } from './kit/interact.js';
import { forceMeter } from './kit/forcemeter.js';

const G = 9.8, M1 = 0.05, TOPY = 0.5, MAXN = 6;

export default {
  id: 'gravity',
  fig: '图7.3-2',
  title: '重力的大小跟质量的关系',
  stampText: '探究',
  predict: {
    q: '弹簧测力计下挂 1 个钩码，示数约 0.5 N。<br>挂 4 个同样的钩码，示数约为——',
    hint: '课本第 12 页「实验」',
    options: ['1 N', '2 N', '4 N'],
    answer: 1,
  },
  conclusion: {
    page: 17, rect: [62, 50, 362, 262],          // 课本第 13 页
    quote: '精确的实验表明，物体所受的重力跟它的质量成正比。……地球附近的物体所受的重力跟它的质量之间的关系可以写成 g = G/m，即 G = mg。……g = 9.8 N/kg。在粗略计算时，g 可以取 10 N/kg。',
    formula: '<i>G</i> = <i>mg</i>　　<i>g</i> = 9.8 N/kg',
    why: '钩码静止时，测力计对它的拉力和它受到的重力平衡，所以测力计的示数等于钩码所受的重力。质量变成几倍，重力也变成几倍，G–m 图像是一条过原点的直线；每一组的 G/m 都约等于 9.8 N/kg。测力计分度值是 0.2 N，读数只能估读到 0.1 N，所以每组算出的比值略有不同。',
    src: '课本第 12–13 页 · 第七章 第3节 重力',
  },

  create({ tag, look, back }) {
    const group = new THREE.Group();
    const st = stand({ height: 0.53, baseW: 0.14, baseD: 0.1 });
    st.position.set(-0.11 - st.rodX, 0, 0);
    st.clamp(TOPY + 0.006, 0.12);
    group.add(st);
    const sc = forceMeter();
    sc.position.set(0, TOPY, 0);
    group.add(sc);
    // 桌上的一盒钩码
    const tray = new THREE.Group();
    tray.position.set(0.135, 0, 0);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.012, 0.05), new THREE.MeshLambertMaterial({ color: 0x6b4a2b }));
    box.position.y = 0.006;
    tray.add(box);
    group.add(tray);
    const weights = Array.from({ length: MAXN }, () => hookWeight());
    weights.forEach((w) => group.add(w));
    tag('钩码（每个 50 g）', 'pill').loc(group, 0.135, 0.005, 0.04);

    const S = { n: 0, settle: 0, rows: [], hung: [], drag: null, dragPos: new THREE.Vector3() };   // hung：挂着的钩码（从上到下）
    const layout = (dt = 0) => {
      // 测力计的伸长跟着挂的钩码数，短时间晃一下再停住
      S.settle = Math.max(0, S.settle - dt);
      const F = S.n * M1 * G * (1 + 0.06 * Math.sin(S.settle * 18) * S.settle);
      sc.set(F);
      let y = TOPY + sc.hookEnd + 0.004;
      S.n = S.hung.length;
      S.hung.forEach((w) => { w.position.set(0, y, 0); y -= w.height + 0.002; });
      S.bottomY = y;
      let k = 0;
      weights.forEach((w) => {
        if (w === S.drag) w.position.copy(S.dragPos);
        else if (!S.hung.includes(w)) { w.position.set(0.07 + k * 0.026, 0.012 + w.height, 0); k++; }    // 没挂的放在盒子里
      });
    };
    layout();
    let ask = () => {}, W = null;
    // 拖钩码：从盒子里拖到挂钩（或最下面那个钩码的钩子）下面松手就挂上；把最下面的那个拖开就取下
    const drags = weights.map((w) => ({
      obj: w, plane: 'xy', offset: 0, keepOffset: true,
      hint: () => (S.hung.includes(w) ? '拖开就取下来' : '拖到测力计的挂钩下面'),
      enabled: () => !S.hung.includes(w) || S.hung[S.hung.length - 1] === w,
      onStart: () => {
        if (S.hung.includes(w)) { if (S.hung[S.hung.length - 1] !== w) return; S.hung.pop(); S.settle = 0.6; }
        S.drag = w; S.dragPos.copy(w.position);
      },
      onDrag: (p) => { if (S.drag === w) S.dragPos.copy(p); },
      onEnd: () => {
        if (S.drag !== w) return;
        S.drag = null;
        const hookY = S.bottomY + 0.004;
        if (S.hung.length >= MAXN) { W?.status('再挂就超过测力计的最大测量值 5 N 了。'); return; }
        if (Math.abs(S.dragPos.x) < 0.035 && S.dragPos.y < hookY + 0.03 && S.dragPos.y > hookY - 0.08) { S.hung.push(w); S.settle = 0.9; W?.choices.el && (W.choices.el.hidden = true); W?.status(`挂了 ${S.hung.length} 个钩码（${S.hung.length * 50} g）。等它静止，再读测力计。`); }
        else W?.status(S.hung.length ? `挂着 ${S.hung.length} 个钩码。` : '把钩码拖到测力计的挂钩下面松手，就挂上了。');
      },
    }));
    const pointer = draggable(group, drags, { tip: tag('', 'pill') });
    const reading = () => Math.round(S.n * M1 * G * 10) / 10;

    return {
      group,
      size: { w: 0.36, d: 0.16, h: 0.53 },
      view: { elev: 12, azim: 0, lookY: 0.5, margin: 1.12 },
      pointer,
      mount(ui) {
        const tb = table(['序号', '质量 m/kg', '重力 G/N', 'G/m（N/kg）']);
        const ch = chart({ x: { label: 'm/kg', min: 0, max: 0.3 }, y: { label: 'G/N', min: 0, max: 3 }, series: [{ color: '#1f6fb8', points: [], dots: true }] });
        const choices = buttons([0, 1, 2].map((j) => ({ text: '', ghost: true, onClick: () => answer(j) })));
        choices.el.hidden = true;
        S.guard = guard(choices.el, () => `${S.n}|${reading()}`, () => { cur = null; ui.status("钩码变了，刚才那道读数题作废。等钩码静止后再读。"); });     // 条件变了，待答的题作废
        let cur = null;
        ask = () => {
          look([0, TOPY - 0.11, 0], [0, 0.1, 1], 0.32, () => back());
          if (S.settle > 0) return ui.status('钩码还在晃，等它<b>静止</b>后再读数。');
          if (S.n === 0) return ui.status('先挂上钩码。');
          if (S.rows.some((r) => r.n === S.n)) return ui.status('这么多钩码已经记过了，加一个或减一个再测。');
          const r = reading();
          const opts = [r, +(r + 0.2).toFixed(1), +(Math.max(0.1, r - 0.2)).toFixed(1)].sort(() => Math.random() - 0.5);
          cur = { r, opts };
          choices.btns.forEach((b, j) => (b.textContent = `${opts[j].toFixed(1)} N`));
          choices.el.hidden = false; S.guard?.arm();
          ui.status(`挂了 ${S.n} 个钩码（m = ${(S.n * M1).toFixed(2)} kg）。看指针：测力计的示数是多少？（分度值 0.2 N，估读到 0.1 N）`);
        };
        const answer = (j) => {
          if (!cur) return;
          if (cur.opts[j] !== cur.r) return ui.status('再看一看：指针在哪两条刻度线之间？每小格 0.2 N。');
          choices.el.hidden = true;
          const m = S.n * M1;
          S.rows.push({ n: S.n, m, g: cur.r });
          S.rows.sort((a, b) => a.m - b.m);
          tb.clear();
          S.rows.forEach((x, i) => tb.add([String(i + 1), x.m.toFixed(2), x.g.toFixed(1), (x.g / x.m).toFixed(1)], { highlight: false }));
          ch.series[0].points = S.rows.map((x) => [x.m, x.g]);
          ch.extra = S.rows.length >= 3 ? (g, X, Y) => { g.strokeStyle = '#d9483b'; g.setLineDash([8, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(0.3), Y(0.3 * 9.8)); g.stroke(); g.setLineDash([]); } : null;
          ch.draw();
          if (S.rows.length >= 5) W.goal.done('rows');
          ui.status(`记下了：m = ${m.toFixed(2)} kg，G = ${cur.r.toFixed(1)} N，G/m ≈ ${(cur.r / m).toFixed(1)} N/kg。${S.rows.length < 5 ? '换用数量不同的钩码，再测几组。' : '描出的点在一条过原点的直线上——重力跟质量成正比。'}`);
          cur = null;
        };
        const free = () => weights.filter((w) => !S.hung.includes(w));
        const btn = buttons([
          { text: '挂上一个钩码', ghost: true, onClick: () => { if (S.hung.length >= MAXN) return ui.status('再挂就超过测力计的最大测量值 5 N 了。'); S.hung.push(free()[0]); S.settle = 0.9; choices.el.hidden = true; ui.status(`挂了 ${S.hung.length} 个钩码。等它静止。`); } },
          { text: '取下一个', ghost: true, onClick: () => { if (S.hung.length) { S.hung.pop(); S.settle = 0.6; choices.el.hidden = true; } } },
          { text: '读数并记录…', onClick: () => ask() },
        ]);
        ui.controls.append(btn.el, choices.el, note('<b>把钩码从盒子里拖到测力计的挂钩下面</b>，一个挂在另一个下面；把最下面的拖开就取下。测力计已经调好零。'));
        ui.data.append(tb.el, ch.el);
        W = { choices, status: (m) => ui.status(m), goal: goals(ui, [['rows', '挂不同数量的钩码，测 5 组以上，描 G–m 图像']]) };
        ui.status('把盒子里的一个钩码<b>拖到测力计的挂钩下面</b>松手。');
      },
      update(dt) { S.guard?.check(); layout(dt); },
      debug: { S, weights },
    };
  },
};
