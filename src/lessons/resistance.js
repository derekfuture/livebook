// 图16.3-4 影响导体电阻大小的因素。电源、开关、电流表已经串好，留出两个接头；把示教板上的一根电阻丝接进去，看电流表的示数。
// 示教板上四根电阻丝（课本演示的两组对比 + 材料对比）：
//   ① 镍铬 1.0 m 0.1 mm²   ② 镍铬 0.5 m 0.1 mm²   ③ 镍铬 1.0 m 0.2 mm²   ④ 锰铜 1.0 m 0.1 mm²
// 电阻 R = ρl/S（ρ 镍铬 1.1、锰铜 0.44 μΩ·m）。学生也可以把两根串起来（相当于变长）或并起来（相当于变粗）。
import * as THREE from 'three';
import { seg, buttons, goals, note, table } from './kit/ui.js';
import { Circuit, battery, switchPart, meterPart, wirePart } from './kit/circuit.js';
import { Bench } from './kit/bench.js';
import { canvasTex } from './kit/props.js';
import { paint, inked } from '../live/ink.js';

const WIRES = [
  { k: '①', mat: '镍铬', l: 1.0, s: 0.1, rho: 1.1 },
  { k: '②', mat: '镍铬', l: 0.5, s: 0.1, rho: 1.1 },
  { k: '③', mat: '镍铬', l: 1.0, s: 0.2, rho: 1.1 },
  { k: '④', mat: '锰铜', l: 1.0, s: 0.1, rho: 0.44 },
].map((w) => ({ ...w, R: (w.rho * w.l) / w.s }));
const BOARD = { x: 0.085, z: -0.05, w: 0.2, d: 0.15 };
const ROWZ = [-0.098, -0.066, -0.034, -0.002];
const FULL = 0.15;     // 1.0 m 的电阻丝在板上画成 15 cm（课本的示教板也是缩小画的）

export default {
  id: 'resistance',
  fig: '图16.3-4',
  title: '影响导体电阻大小的因素',
  stampText: '探究',
  predict: {
    q: '横截面积相同、长度不同的两根镍铬合金丝，分别接入同一个电路（图16.3-4）。<br>电流表的示数——',
    hint: '课本第 78 页「演示」',
    options: ['接长的那根时大', '接短的那根时大', '一样大'],
    answer: 1,
  },
  conclusion: {
    crops: [{ page: 85, rect: [62, 314, 360, 400] }, { page: 85, rect: [62, 546, 360, 590] }],   // 课本第 79 页
    quote: '横截面积相同时，较长的镍铬合金丝中电流较小；长度相同时，横截面积较小的镍铬合金丝中电流较小。导体的电阻是导体本身的一种性质，它的大小取决于导体的材料、长度和横截面积等因素。',
    why: '电源电压不变，接入的导体电阻越大，电路中的电流就越小——所以可以用电流表示数的大小来比较电阻的大小。每次只改变一个因素（长度、横截面积或材料），其他因素保持相同，这叫<b>控制变量</b>。导体越长、越细，电阻越大；长度、粗细相同时，镍铬合金丝的电阻比锰铜丝大。把两根相同的丝串起来相当于变长，并起来相当于变粗。',
    src: '课本第 78–79 页 · 第十六章 第3节 电阻',
  },

  create({ tag, look, back }) {
    const group = new THREE.Group();
    const C = new Circuit();
    // 课本图16.3-4 的摆法：电池左上，示教板右上，电流表左下，开关右下
    C.add(battery('E', { cells: 2, r: 0.15 }), [-0.1, -0.1]);
    const sw = C.add(switchPart('S', { closed: true }), [0.12, 0.085]);
    const A = C.add(meterPart('A', { type: 'A' }), [-0.07, 0.065]);
    // 示教板：浅蓝色的板子，上面写着每根丝的材料、长度、横截面积
    const boardTex = canvasTex(1024, 768, (g, W, H) => {
      g.fillStyle = '#dfe9f6'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#2c3a55'; g.font = 'bold 34px PingFang SC, sans-serif'; g.textAlign = 'left';
      WIRES.forEach((w, i) => {
        // 字写在电阻丝的前面（靠近看的人），不会被接线柱挡住
        const y = ((ROWZ[i] + 0.008 + 0.009 - (BOARD.z - BOARD.d / 2)) / BOARD.d) * H + 10;
        g.fillText(`${w.k} ${w.mat}${w.mat === '镍铬' ? '合金' : ''}丝  ${w.l.toFixed(1)} m  ${w.s} mm²`, 150, y);
      });
    });
    const board = inked(new THREE.Mesh(new THREE.BoxGeometry(BOARD.w, 0.008, BOARD.d), [paint(0xc9d6e8), paint(0xc9d6e8), new THREE.MeshLambertMaterial({ map: boardTex }), paint(0xc9d6e8), paint(0xc9d6e8), paint(0xc9d6e8)]), { width: 1.2 });
    board.position.set(BOARD.x, 0.004, BOARD.z);
    group.add(board);
    const parts = WIRES.map((w, i) => {
      const len = FULL * w.l;
      const p = C.add(wirePart(`W${i + 1}`, { length: len, R: w.R, color: w.mat === '锰铜' ? 0xc0814f : 0x8e97a6, thick: w.s > 0.15 ? 0.0018 : 0.0011 }), [BOARD.x - FULL / 2 + len / 2, ROWZ[i] + 0.008]);
      p.group.position.y = 0.008;
      return p;
    });
    group.add(C.group);
    C.wire('S.a', 'A.0.6').wire('A.-', 'E.-');
    for (const [txt, x, z] of [['电源', -0.1, -0.135], ['开关', 0.12, 0.112], ['电流表', -0.07, 0.115]]) tag(txt, 'pill').loc(group, x, 0.005, z);

    let W = null;
    const S = { rows: new Map() };
    // 哪根丝接在电路里：有电流通过、并且电流就是整个电路的电流
    const inCircuit = () => parts.filter((p) => Math.abs(p.I || 0) > 0.005);
    const judge = (circuit, ev = {}) => {
      if (!W) return;
      if (ev.msg) return W.status(ev.msg);
      const on = inCircuit(), i = Math.abs(A.value || 0);
      if (!on.length) return W.status(!sw.closed ? '开关断开了。' : '把电源的 “+” 接线柱和开关的另一个接线柱，分别接到示教板上<b>同一根</b>电阻丝的两端。');
      if (A.reverse) return W.status('电流表指针反偏了：电流要从 “0.6” 或 “3” 接线柱流进，从 “−” 流出。');
      if (A.over) return W.status(`电流超过了 0.6 A，指针打到了头——换接电流表的 “3” 接线柱再读。`);
      const div = A.range > 1 ? 0.1 : 0.02;
      const v = Math.round(i / div) * div;
      if (on.length > 1) {
        const ser = on.every((p) => Math.abs(Math.abs(p.I) - i) < 0.005);
        return W.status(`现在 ${on.map((p) => WIRES[parts.indexOf(p)].k).join('')} 两根丝${ser ? '<b>串联</b>着接在电路里，相当于把导线接长了' : '<b>并联</b>着接在电路里，相当于把导线变粗了'}：电流 ${v.toFixed(2)} A。`);
      }
      const w = WIRES[parts.indexOf(on[0])];
      W.status(`接入 ${w.k} ${w.mat} ${w.l.toFixed(1)} m ${w.s} mm²：电流表示数 ${v.toFixed(2)} A。点“记下这一根”。`);
    };
    const bench = new Bench(C, group, { onChange: judge, maxWires: 8 });

    const use = (k) => {
      C.clearWires().wire('S.a', 'A.0.6').wire('A.-', 'E.-').wire('E.+', `W${k + 1}.a`).wire(`W${k + 1}.b`, 'S.b');
      sw.closed = true; C.solve(); judge(C);
    };
    let near = false;

    return {
      group,
      size: { w: 0.4, d: 0.29, h: 0.09 },
      view: { elev: 48, azim: 0, lookY: 0.25, margin: 1.0 },
      pointer: bench.pointer(),
      mount(ui) {
        const pick = seg('把哪根电阻丝接进电路', WIRES.map((w) => w.k), (_, k) => use(k), { value: -1 });
        const tb = table(['电阻丝', '材料', '长度/m', '横截面积/mm²', '电流/A']);
        const rec = buttons([{ text: '记下这一根', onClick: () => {
          const on = inCircuit();
          if (on.length !== 1 || A.reverse || A.over) return ui.status('先只把<b>一根</b>电阻丝接进电路，让电流表正常偏转。');
          const k = parts.indexOf(on[0]), w = WIRES[k];
          const div = A.range > 1 ? 0.1 : 0.02, v = +(Math.round(Math.abs(A.value) / div) * div).toFixed(2);
          if (S.rows.has(k)) return ui.status(`${w.k} 已经记过了，换一根。`);
          S.rows.set(k, v);
          tb.add([w.k, w.mat, w.l.toFixed(1), w.s, v.toFixed(2)]);
          pick.tick(k);
          const has = (a, b) => S.rows.has(a) && S.rows.has(b);
          if (has(0, 1)) W.goal.done('length');
          if (has(0, 2)) W.goal.done('area');
          if (has(0, 3)) W.goal.done('material');
          const tip = has(0, 1) && !W.said1 ? (W.said1 = '①和②只有长度不同：长的那根电流小，电阻大。') : has(0, 2) && !W.said2 ? (W.said2 = '①和③只有粗细不同：细的那根电流小，电阻大。') : has(0, 3) && !W.said3 ? (W.said3 = '①和④只有材料不同：镍铬丝中电流小，电阻比锰铜大。') : '';
          ui.status(`记下了 ${w.k}：${v.toFixed(2)} A。${tip || '再换一根，和 ① 比一比（每次只让一个因素不同）。'}`);
        } }]);
        const close = buttons([{ text: '凑近看电流表', ghost: true, onClick: () => {
          near = !near;
          if (near) { look([-0.07, 0.056, 0.085], [0.25, 0.45, 0.86], 0.15, () => { near = false; close.btns[0].textContent = '凑近看电流表'; back(); }); close.btns[0].textContent = '↩ 回到整个电路'; }
          else { back(); close.btns[0].textContent = '凑近看电流表'; }
        } }]);
        ui.controls.append(pick.el, rec.el, close.el, note('也可以自己连：从电源 “+” 接线柱拖到电阻丝一端，再从电阻丝另一端拖到开关。试试把两根丝<b>串起来</b>或<b>并起来</b>接入。'));
        ui.data.append(tb.el);
        W = { status: (m) => ui.status(m), goal: goals(ui, [['length', '比较 ① 和 ②（只有长度不同）'], ['area', '比较 ① 和 ③（只有横截面积不同）'], ['material', '比较 ① 和 ④（只有材料不同）']]) };
        judge(C);
      },
      update(dt) { C.update(dt); bench.update(dt); },
      debug: { use, C },
    };
  },
};
