// 图11.3-2 研究物体的动能跟哪些因素有关。钢球从斜槽上高为 h 处由静止滚下，在水平面上撞击木块，木块被撞出的距离为 s。
// 拖着钢球沿斜槽往上放到某个高度，松手它就滚下来。换大小（质量）不同的钢球。
// 物理：斜槽光滑，钢球滚动 v = √(10gh/7)；与木块碰撞（恢复系数 0.3，动量守恒）；木块在水平面上滑动，μ = 0.4，s = v木²/(2μg)。
import * as THREE from 'three';
import { seg, buttons, goals, note, table, guard } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { woodBlock, rulerMesh } from './kit/props.js';
import { paint, inked, hull, polyline } from '../live/ink.js';

const ANG = (40 * Math.PI) / 180, HMAX = 0.32, BX = 0.1, MB = 0.1, MU = 0.4, E = 0.3, G = 9.8;
const BALLS = [{ label: '小钢球（50 g）', m: 0.05, r: 0.0115 }, { label: '大钢球（100 g）', m: 0.1, r: 0.0145 }];
const RL = HMAX / Math.sin(ANG);         // 斜槽长度
const BS = 0.04;                          // 木块边长

export default {
  id: 'kinetic',
  fig: '图11.3-2',
  title: '研究物体的动能跟哪些因素有关',
  stampText: '探究',
  predict: {
    q: '同一个钢球，分别从斜槽上 10 cm 和 30 cm 高处由静止滚下，撞击同一个木块。<br>哪一次木块被撞得远？',
    hint: '课本第 92 页「演示」',
    options: ['从 10 cm 高处滚下的', '从 30 cm 高处滚下的', '一样远'],
    answer: 1,
  },
  conclusion: {
    page: 96, rect: [160, 556, 462, 628],       // 课本第 92 页
    quote: '大量实验表明：质量相同的物体，运动的速度越大，它的动能越大；运动速度相同的物体，质量越大，它的动能也越大。',
    why: '木块被撞得越远，说明钢球对木块做的功越多，钢球的动能越大——这是用木块移动的距离来反映动能大小（转换法）。钢球从越高处滚下，到达水平面时速度越大；从同一高度滚下的钢球，到达水平面时的速度相同，这样就能单独比较质量的影响（控制变量法）。',
    src: '课本第 92 页 · 第十一章 第3节 动能和势能',
  },

  create({ tag }) {
    // 斜槽底端在原点，整套器材从 x = −0.43 到 0.6：放进一个整体左移的组里，让它在画面中间
    const outer = new THREE.Group(), group = new THREE.Group();
    outer.add(group); group.position.x = -0.11;
    // 斜槽：底端在 x = 0，向左上方升起；水平面向右
    const rampG = new THREE.Group();
    const plank = inked(new THREE.Mesh(new THREE.BoxGeometry(RL + 0.02, 0.008, 0.05), paint(0xcfd5dd)), { width: 1.2 });
    plank.position.set(-Math.cos(ANG) * RL / 2, Math.sin(ANG) * RL / 2 - 0.004, 0);
    plank.rotation.z = -ANG;
    const rail = [-1, 1].map((s) => { const r = new THREE.Mesh(new THREE.BoxGeometry(RL + 0.02, 0.008, 0.004), paint(0x9aa3b2)); r.position.copy(plank.position).add(new THREE.Vector3(0, 0.006, s * 0.012)); r.rotation.z = -ANG; return r; });
    const post = inked(new THREE.Mesh(new THREE.BoxGeometry(0.012, HMAX, 0.04), paint(0x9aa3b2)), { width: 1.1 });
    post.position.set(-Math.cos(ANG) * RL + 0.006, HMAX / 2, 0);
    rampG.add(plank, ...rail, post);
    group.add(rampG);
    // 水平面顶面和实验台板顶面同高：画的时候略微靠前，免得两者重合闪烁
    const floor = inked(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.006, 0.08), paint(0xe9dcc0, { unique: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 })), { width: 1.2 });
    floor.position.set(0.3, -0.003, 0);
    group.add(floor);
    const ruler = rulerMesh({ length: 0.5, width: 0.026, divisions: 500, every: 10, labelEvery: 50 });
    ruler.position.set(BX - BS / 2 + 0.25, 0.0015, 0.05);     // 0 刻度对着木块原来的左边
    group.add(ruler);
    // 高度标尺（竖直立在斜槽后面，0 在水平面）
    const hRuler = rulerMesh({ length: 0.34, width: 0.024, divisions: 340, every: 10, labelEvery: 50 });
    hRuler.rotation.x = Math.PI / 2;
    const hR = new THREE.Group();
    hR.add(hRuler); hR.rotation.z = Math.PI / 2;
    hR.position.set(-Math.cos(ANG) * RL - 0.03, 0.17, -0.03);
    group.add(hR);
    const block = woodBlock(BS, BS, BS);
    block.position.y = BS / 2;
    group.add(block);
    const ghost = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(BS, BS, BS)), new THREE.LineDashedMaterial({ color: 0x8a6d3b, dashSize: 0.004, gapSize: 0.003 }));
    ghost.computeLineDistances();
    ghost.position.set(BX, BS / 2, 0);
    group.add(ghost);
    const ball = hull(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ color: 0x8ec9ef, metalness: 0.3, roughness: 0.25 })), 0.06);
    group.add(ball);
    const hLine = polyline([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)], { dashed: true, width: 1.2 });
    group.add(hLine);
    const tH = tag('', 'pill'), tS = tag('', 'pill');

    const S = { b: 0, h: 0.1, mode: 'hold', u: 0, x: 0, v: 0, bx: BX, bv: 0, done: false, rows: [], s: 0 };
    let W = null;
    const r = () => BALLS[S.b].r;
    // 钢球中心的位置：u < 0 在斜槽上（沿槽离底端的距离），u ≥ 0 在水平面上（x）
    const place = () => {
      const R = r();
      ball.scale.setScalar(R);
      if (S.mode === 'hold' || S.mode === 'ramp') {
        const d = S.u;     // 离底端沿斜槽的距离
        ball.position.set(-Math.cos(ANG) * d + Math.sin(ANG) * R, Math.sin(ANG) * d + Math.cos(ANG) * R, 0);
      } else ball.position.set(S.x, R, 0);
      block.position.set(S.bx, BS / 2, 0);
      const hy = S.mode === 'hold' ? Math.sin(ANG) * S.u : S.h;
      hLine.geometry.setPositions([-Math.cos(ANG) * RL - 0.02, hy, -0.03, -Math.cos(ANG) * (hy / Math.sin(ANG)), hy, -0.03]);
      tH.loc(group, -Math.cos(ANG) * RL - 0.05, hy, 0).text(`h = ${(hy * 100).toFixed(0)} cm`);
      const s = S.bx - BX;
      tS.loc(group, (BX + S.bx) / 2, 0.055, 0).text(S.mode === 'done' && s > 0.01 ? 's' : '');
    };
    S.u = S.h / Math.sin(ANG);
    place();

    const pick = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
    pick.userData.pick = true;
    group.add(pick);
    const pointer = draggable(group, [{ obj: pick, plane: 'xy', offset: 0,
      onStart: () => { S.mode = 'hold'; S.bx = BX; S.bv = 0; choices.el.hidden = true; },
      onDrag: (p) => { const d = clamp(-p.x * Math.cos(ANG) + p.y * Math.sin(ANG), 0.03, RL); S.u = Math.round(d * Math.sin(ANG) * 100) / 100 / Math.sin(ANG); S.h = S.u * Math.sin(ANG); },
      onEnd: () => { if (S.h >= 0.03) release(); },
    }]);
    let choices = { el: {} };
    const release = () => { S.mode = 'ramp'; S.v = 0; S.bx = BX; S.bv = 0; S.hit = false; W?.status(`钢球从 ${(S.h * 100).toFixed(0)} cm 高处由静止滚下……`); };

    return {
      group: outer,
      size: { w: 1.0, d: 0.12, h: 0.34 },
      view: { elev: 16, azim: 0, lookY: 0.35, margin: 1.2 },
      pointer,
      mount(ui) {
        const bsel = seg('钢球', BALLS.map((b) => b.label), (_, k) => { S.b = k; S.mode = 'hold'; S.bx = BX; place(); });
        choices = buttons([0, 1, 2].map((j) => ({ text: '', ghost: true, onClick: () => answer(j) })));
        choices.el.hidden = true;
        S.guard = guard(choices.el, () => `${S.mode}|${S.bx}|${S.b}|${S.h}`, () => { cur = null; ui.status("钢球又放了一次（或换了条件），刚才那道读数题作废。"); });     // 条件变了，待答的题作废
        const tb = table(['钢球', '高度 h/cm', '木块移动的距离 s/cm']);
        let cur = null;
        const ask = () => {
          if (S.mode !== 'done') return ui.status('等木块停下来再读。');
          const s = Math.round((S.bx - BX) * 200) / 2;
          const opts = [...new Set([s, +(s + 2).toFixed(1), +(Math.max(0.5, s - 2)).toFixed(1)])].sort(() => Math.random() - 0.5);
          cur = { s, opts };
          choices.btns.forEach((b, j) => { b.hidden = j >= opts.length; b.textContent = `${opts[j]} cm`; });
          choices.el.hidden = false; S.guard?.arm();
          ui.status('看水平面上的刻度尺：木块从原来的位置（虚线框）移动了多少？读到 0.5 cm。');
        };
        const answer = (j) => {
          if (!cur) return;
          if (cur.opts[j] !== cur.s) return ui.status('比较木块现在的左边和虚线框的左边，看刻度尺上差了多少。');
          choices.el.hidden = true;
          S.rows.push({ b: S.b, h: Math.round(S.h * 100), s: cur.s });
          tb.add([BALLS[S.b].label.replace(/（.*/, ''), String(Math.round(S.h * 100)), cur.s.toFixed(1)]);
          const R = S.rows;
          if ([0, 1].some((b) => new Set(R.filter((x) => x.b === b).map((x) => x.h)).size >= 2)) W.goal.done('speed');
          if (R.some((x) => R.some((y) => y.b !== x.b && y.h === x.h))) W.goal.done('mass');
          ui.status(`记下了：s = ${cur.s.toFixed(1)} cm。`);
          cur = null;
        };
        ui.controls.append(note('<b>拖着钢球沿斜槽往上放</b>，松手它就滚下来。左边的竖尺量高度 h。'), bsel.el, buttons([{ text: '读 s 并记录…', onClick: ask }, { text: '从刚才的高度再放一次', ghost: true, onClick: () => { S.u = S.h / Math.sin(ANG); release(); } }]).el, choices.el);
        ui.data.append(tb.el);
        W = { status: (m) => ui.status(m), goal: goals(ui, [['speed', '同一个钢球，从不同的高度滚下'], ['mass', '质量不同的钢球，从同一高度滚下']]) };
        ui.status('拖着钢球放到斜槽上某个高度，松手。');
      },
      update(dt) { S.guard?.check();
        const h = Math.min(dt, 1 / 30) * 0.6;    // 慢放
        const m = BALLS[S.b].m, R = r();
        if (S.mode === 'ramp') {
          S.u -= Math.sqrt((10 / 7) * G * Math.max(0, S.h - S.u * Math.sin(ANG))) * h + 1e-4;
          if (S.u <= 0) { S.mode = 'flat'; S.x = 0; S.v = Math.sqrt((10 / 7) * G * S.h); }
        } else if (S.mode === 'flat') {
          S.x += S.v * h; S.v = Math.max(0, S.v - 0.15 * h);
          if (!S.hit && S.x + R >= S.bx - BS / 2) {
            S.hit = true;
            const v = S.v;
            S.bv = (m * (1 + E) * v) / (m + MB);
            S.v = ((m - E * MB) * v) / (m + MB);
            S.x = S.bx - BS / 2 - R;
          }
          if (S.hit) {
            S.bx += S.bv * h; S.bv = Math.max(0, S.bv - MU * G * h);
            if (S.x + R > S.bx - BS / 2) { S.x = S.bx - BS / 2 - R; S.v = Math.min(S.v, S.bv); }
            if (S.bv === 0 && S.v < 0.02) { S.mode = 'done'; W?.status('木块停下了。看刻度尺，点“读 s 并记录…”。'); }
          }
        }
        place();
        pick.position.copy(ball.position);
      },
      debug: { S, release },
    };
  },
};
