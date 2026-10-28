// 图16.5-1 简易调光台灯（跨学科实践）。用图16.4-1 的办法——夹子在铅笔芯上移动——做变阻器。
// 底座上：电池盒、开关、一根铅笔芯（一端的夹子固定，另一端的夹子可以滑动）、一根透明塑料管，管顶是小灯泡和灯罩，
// 连小灯泡的两根导线从管中穿下来。学生自己把电路连好，选电源和小灯泡的规格（要匹配），移动夹子调亮度，加上灯罩比较桌面的亮度。
import * as THREE from 'three';
import { seg, buttons, goals, note, readout } from './kit/ui.js';
import { Circuit, battery, switchPart, lampPart } from './kit/circuit.js';
import { Bench } from './kit/bench.js';
import { canvasTex } from './kit/props.js';
import { paint, inked, hull } from '../live/ink.js';

const LEAD = 0.1;          // 铅笔芯长 10 cm
const R_PER_CM = 2.5;      // 自动铅笔芯（0.5 mm）每厘米约几欧姆，这里取 2.5 Ω
const TUBE = { x: 0.11, z: -0.045, h: 0.15 };
const SUPPLY = [{ label: '2 节干电池 3 V', cells: 2 }, { label: '3 节 4.5 V', cells: 3 }, { label: '4 节 6 V', cells: 4 }];
const LAMPS = [{ label: '2.5 V 小灯泡', R0: 4, Rhot: 10, rated: 2.5 }, { label: '3.8 V 小灯泡', R0: 6, Rhot: 15, rated: 3.8 }];

const post = (color = 0xc0392b) => {
  const g = new THREE.Group();
  const p = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.01, 12), paint(color)), 0.0012);
  p.position.y = 0.005;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.003, 12), paint(color));
  cap.position.y = 0.011;
  g.add(p, cap);
  return g;
};
// 鳄鱼夹
const clip = (color) => {
  const g = new THREE.Group();
  const jaw = inked(new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.006, 0.02), paint(color)), { width: 1.1 });
  jaw.position.set(0, 0.016, 0.008);
  jaw.rotation.x = -0.25;
  const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.002, 0.004), paint(0xb0b7c3));
  tooth.position.set(0, 0.013, -0.001);
  g.add(jaw, tooth);
  return g;
};

/** 铅笔芯变阻器：A 端夹子固定，P 是滑动的夹子（借用滑动变阻器的拖动方式）。A–P 间的铅笔芯接入电路。 */
function leadPart(name) {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) {
    const s = inked(new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.01, 0.014), paint(0xe8d6b0)), { width: 1.1 });
    s.position.set(sx * (LEAD / 2 - 0.002), 0.005, 0);
    g.add(s);
  }
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.0013, 0.0013, LEAD, 10), paint(0x3a3d44));
  rod.rotation.z = Math.PI / 2;
  rod.position.y = 0.012;
  const fixed = clip(0xd9483b);
  fixed.position.x = -LEAD / 2 + 0.006;
  const slider = clip(0x2b2f3a);
  const pa = post(0x8f99a8);
  pa.position.set(-LEAD / 2 - 0.012, 0, 0.012);
  g.add(rod, fixed, slider, pa);
  const part = {
    name, group: g, kind: 'rheostat', clickable: true, slider, pos: 0.8, dragY: 0.014,
    terminals: { A: [-LEAD / 2 - 0.012, 0.012, 0.012], P: [0, 0.022, 0.016] },
    shorted: [],
    // A 端的接线柱通过固定夹子接到铅笔芯 x = -LEAD/2 + 0.006 处；P 夹子在 pos 处
    get length() { return Math.max(0.002, this.pos * (LEAD - 0.012)); },
    branches() { return [{ a: 'A', b: 'P', R: (this.length * 100) * R_PER_CM }]; },
    read(bs) { this.I = bs[0].I; },
    setPos(p) {
      this.pos = Math.min(1, Math.max(0.03, p));
      const x = -LEAD / 2 + 0.006 + this.pos * (LEAD - 0.012);
      slider.position.x = x;
      this.terminals.P = [x, 0.022, 0.016];
      if (this.circuit) { this.circuit._dirty = true; this.circuit.solve(); }
    },
    posFromLocalX(x) { return (x + LEAD / 2 - 0.006) / (LEAD - 0.012); },
  };
  part.setPos(part.pos);
  return part;
}

/** 塑料管脚下的接线块：两个接线柱，各通过一根穿管导线接到管顶的小灯泡 */
function blockPart(name) {
  const g = new THREE.Group();
  const b = inked(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.016), paint(0x4d5668)), { width: 1.1 });
  b.position.y = 0.003;
  const pa = post(0xd9483b), pb = post(0xf2f2f2);
  pa.position.set(-0.009, 0.004, 0.012); pb.position.set(0.009, 0.004, 0.012);
  g.add(b, pa, pb);
  return {
    name, group: g, kind: 'block',
    terminals: { a: [-0.009, 0.016, 0.012], b: [0.009, 0.016, 0.012], ia: [-0.007, 0.006, 0.002], ib: [0.007, 0.006, 0.002] },
    shorted: [['a', 'ia'], ['b', 'ib']],
    branches() { return []; },
  };
}

export default {
  id: 'dimmer',
  fig: '图16.5-1',
  title: '制作简易调光台灯',
  stampText: '探究',
  predict: {
    q: '用铅笔芯做调光台灯的变阻器（图16.4-1 的办法）。<br>想让台灯更亮，活动的夹子应该——',
    hint: '课本第 82 页「问题」、第 87–88 页',
    options: ['向固定的夹子靠近', '离固定的夹子远一些', '放在哪里都一样'],
    answer: 0,
  },
  conclusion: {
    crops: [{ page: 88, rect: [140, 300, 456, 360] }],    // 课本第 82 页：接入电路中的铅笔芯越短，电阻越小，小灯泡越亮
    quote: '随着夹子在铅笔芯上移动，小灯泡的亮度会发生变化。接入电路中的铅笔芯越短，电阻越小，小灯泡越亮。',
    why: '调光台灯是一个串联电路：电源、开关、变阻器、小灯泡依次连接。改变接入电路的铅笔芯长度就改变了电阻，从而改变灯泡两端的电压和通过它的电流，灯的亮度就变了。电源电压和小灯泡的规格要<b>匹配</b>：电源电压比灯的额定电压高太多，夹子一靠近，灯两端电压过高就会烧坏；太低，夹子靠到头灯也不够亮。灯罩内壁反光，把向上、向四周的光反射到桌面上。',
    src: '课本第 82、87–88 页 · 第十六章 第4节 变阻器 / 第5节 跨学科实践：制作简易调光台灯',
  },

  create({ tag }) {
    const group = new THREE.Group();
    // 底座：一排冰棒棍拼成的木板
    const woodTex = canvasTex(512, 256, (g, W, H) => {
      for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#d8b98a' : '#dfc396'; g.fillRect(0, (i * H) / 8, W, H / 8); g.fillStyle = 'rgba(120,80,40,.25)'; g.fillRect(0, ((i + 1) * H) / 8 - 2, W, 2); }
    });
    const board = inked(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.008, 0.2), [paint(0xcfae7c), paint(0xcfae7c), new THREE.MeshLambertMaterial({ map: woodTex }), paint(0xcfae7c), paint(0xcfae7c), paint(0xcfae7c)]), { width: 1.2 });
    board.position.y = -0.004;
    group.add(board);

    let C, bench, E, sw, L, N, T, spot;
    const S = { supply: 1, lamp: 0, shade: true, bMin: 9, bMax: 0, matched: false, burnt: 0 };
    let W = null;
    const tags = [];
    // 管、灯罩
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, TUBE.h, 18, 1, true), new THREE.MeshLambertMaterial({ color: 0xdfe8f0, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
    tube.position.set(TUBE.x, TUBE.h / 2, TUBE.z);
    group.add(tube);
    const shadeTex = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#f3e6a2'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(200,170,80,.6)'; for (let y = 10; y < h; y += 26) for (let x = (y / 26) % 2 ? 14 : 0; x < w; x += 28) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); } });
    const shade = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.045, 0.045, 28, 1, true), new THREE.MeshLambertMaterial({ map: shadeTex, side: THREE.DoubleSide, emissive: 0xffe9a0, emissiveIntensity: 0 })), 0.0012);
    shade.position.set(TUBE.x, TUBE.h + 0.012, TUBE.z);
    group.add(shade);
    // 桌面上的一圈光：有灯罩时光被反射到下面，集中而亮；没有灯罩时散开
    const poolTex = canvasTex(256, 256, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,236,170,1)'); gr.addColorStop(1, 'rgba(255,236,170,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(0.1, 40), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(TUBE.x + 0.04, 0.0015, TUBE.z + 0.02);
    group.add(pool);

    const build = () => {
      const keep = C ? C.wires.filter((w) => !w.locked).map((w) => [w.a, w.b]) : null;
      if (C) { group.remove(C.group); C.dispose(); }
      for (const t of tags.splice(0)) t.remove();
      C = new Circuit();
      // 底座上的摆法：塑料管和灯在后面右侧，开关在后面左侧，电池盒、铅笔芯在前面
      E = C.add(battery('E', { cells: SUPPLY[S.supply].cells, r: 0.15 }), [-0.05 - (SUPPLY[S.supply].cells - 2) * 0.025, 0.06]);
      sw = C.add(switchPart('S'), [-0.1, -0.05]);
      N = C.add(leadPart('N'), [0.075, 0.065]);
      T = C.add(blockPart('T'), [TUBE.x, TUBE.z]);
      L = C.add(lampPart('L', LAMPS[S.lamp]), [TUBE.x, TUBE.z - 0.004]);
      L.group.position.y = TUBE.h;
      L.group.scale.setScalar(0.4);
      group.add(C.group);
      // 穿过塑料管的两根导线（固定），活动夹子接到接线块
      C.wire('L.a', 'T.ia', { lift: 0.0005, color: 0xd9483b, locked: true }).wire('L.b', 'T.ib', { lift: 0.0005, color: 0xf2f2f2, locked: true }).wire('N.P', 'T.b', { locked: true });
      for (const [a, b] of keep || []) C.wire(a, b);
      C.solve();
      bench = new Bench(C, group, { onChange: judge, unscrew: false, locked: [['L.a', 'T.ia'], ['L.b', 'T.ib'], ['N.P', 'T.b']] });
      for (const [txt, x, y, z] of [['电池盒', -0.05, 0.005, 0.092], ['开关', -0.1, 0.005, -0.08], ['铅笔芯', 0.075, 0.005, 0.092]]) tags.push(tag(txt, 'pill').loc(group, x, y, z));
      judge(C);
    };

    const judge = (circuit, ev = {}) => {
      if (!W || !L) return;
      if (ev.msg) return W.status(ev.msg);
      const b = L.broken ? 0 : L.brightness || 0;
      W.out.set('len', N.length * 100, 1);
      W.out.set('l', L.broken ? '烧坏了' : b < 0.03 ? '不亮' : b > 1.25 ? '过亮（超过额定电压）' : b > 0.75 ? '正常发光' : b > 0.25 ? '较暗' : '很暗');
      if (L.broken) {
        S.burnt++;
        W.goal.done('burn');
        return W.status(`<b>小灯泡烧坏了！</b>${SUPPLY[S.supply].label.replace(/.*?(\d(\.\d)? V)/, '$1')} 的电源配 ${LAMPS[S.lamp].rated} V 的灯，电压太高：夹子一靠近，灯两端的电压就超过了它能承受的范围。换一个小灯泡，再换一个合适的电源。`);
      }
      if (b < 0.03) {
        if (!circuit.wires.some((w) => !w.locked)) return W.status('先连电路：电池盒的 “+” → 铅笔芯一端的接线柱；塑料管脚下接线块的另一个接线柱 → 开关 → 电池盒的 “−”。连好后闭合开关。');
        return W.status(sw.closed ? '灯不亮：检查电路是不是从电池正极出发，经过开关、铅笔芯、小灯泡回到负极。' : '开关是断开的，点一下开关。');
      }
      W.goal.done('wire');
      S.bMin = Math.min(S.bMin, b); S.bMax = Math.max(S.bMax, b);
      if (S.bMax - S.bMin > 0.4) W.goal.done('dim');
      // 匹配：夹子靠得最近时灯接近正常发光（不过亮），离得最远时明显变暗
      // （试算两种极端位置，不改变真实状态：试算时不能把灯“烧坏”）
      const old = N.pos;
      N.pos = 0.03; C.solve(); const bHi = L.brightness;
      N.pos = 1; C.solve(); const bLo = L.brightness;
      N.pos = old; L.broken = false; C.solve();
      const ok = bHi > 0.75 && bHi < 1.6 && bLo < 0.6;
      if (ok) W.goal.done('match');
      W.status(ok
        ? `这样搭配合适：夹子靠近时灯正常发光，离远时变暗。夹子离固定夹子 ${(N.length * 100).toFixed(1)} cm。${S.shade ? '' : '加上灯罩，看看桌面上的光有什么不同。'}`
        : bHi >= 1.6 ? '夹子靠近时灯会<b>过亮</b>——电源电压对这个灯太高了，小心烧坏。换一个合适的电源。' : bHi <= 0.75 ? '夹子靠到头，灯也达不到正常亮度——电源电压对这个灯太低了。' : `移动夹子：接入的铅笔芯 ${(N.length * 100).toFixed(1)} cm。`);
    };

    return {
      group,
      size: { w: 0.32, d: 0.2, h: 0.2 },
      card: false,          // 自己有木底座
      view: { elev: 36, azim: 0, lookY: 0.42, margin: 1.3 },
      pointer: { down: (r, e) => bench.pointer().down(r, e), move: (r, e) => bench.pointer().move(r, e), up: (r, e) => bench.pointer().up(r, e) },
      mount(ui) {
        const out = readout([{ key: 'len', label: '接入的铅笔芯', unit: 'cm' }, { key: 'l', label: '小灯泡' }]);
        const sup = seg('电源', SUPPLY.map((x) => x.label), (_, k) => { S.supply = k; build(); }, { value: 1 });
        const lamp = seg('小灯泡', LAMPS.map((x) => x.label), (_, k) => { S.lamp = k; build(); });
        const sh = seg('灯罩', ['加灯罩', '不加'], (_, k) => { S.shade = !k; shade.visible = S.shade; if (!k) W.goal.done('shade'); judge(C); });
        const demo = () => { C.clearWires(); build(); C.wire('E.+', 'N.A').wire('T.a', 'S.b').wire('S.a', 'E.-'); sw.closed = true; C.solve(); judge(C); };
        ui.controls.append(note('<b>连导线</b>：按住接线柱拖到另一个接线柱。<b>拖动黑色的夹子</b>在铅笔芯上滑动。点开关闭合/断开。'), sup.el, lamp.el, sh.el, out.el,
          buttons([{ text: '示范接法', ghost: true, onClick: demo }, { text: '换一个新灯泡', ghost: true, onClick: () => { L.broken = false; C.solve(); judge(C); } }]).el);
        W = { out, status: (m) => ui.status(m), goal: goals(ui, [['wire', '连好电路，让小灯泡亮起来'], ['dim', '移动夹子，让灯由暗变亮'], ['match', '选一组匹配的电源和小灯泡'], ['shade', '比较加灯罩和不加灯罩时桌面的亮度']]) };
        build();
      },
      update(dt) {
        C?.update(dt); bench?.update(dt);
        const b = L && !L.broken ? Math.min(1.5, L.brightness || 0) : 0;
        pool.material.opacity = S.shade ? b * 0.7 : b * 0.28;
        pool.scale.setScalar(S.shade ? 0.75 : 1.4);
        shade.material.emissiveIntensity = S.shade ? b * 0.5 : 0;
      },
      debug: { get C() { return C; }, get N() { return N; }, get L() { return L; }, set: (s, l) => { S.supply = s; S.lamp = l; build(); } },
    };
  },
};
