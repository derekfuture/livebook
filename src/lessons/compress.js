// 图13.3-5 做功改变内能。
//   甲：厚玻璃筒里放一小团脱脂棉，把活塞迅速压下去——空气被压缩，内能增加、温度升高，达到脱脂棉的燃点，棉花燃烧。慢慢压就不行（热量散走了）。
//   乙：烧瓶里有少量水，盖紧瓶塞，用打气筒往瓶里打气；瓶塞跳起时，瓶内出现白雾（气体膨胀对外做功，内能减少，温度降低，水蒸气液化）。
// 直接操作：甲 按住活塞往下拖（拖得快慢由你决定）；乙 上下拖打气筒的手柄打气。面板也能做。
// 物理：甲 绝热压缩 T₂ = T₁(V₁/V₂)^(γ−1)，γ = 1.4，同时按 (T − T₀) 向外散热；乙 每打一次气压强增大，压强差超过瓶塞的摩擦就跳起，气体绝热膨胀降温。示意数值。
import * as THREE from 'three';
import { seg, buttons, goals, note } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { glowTexture } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { paint, inked, hull } from '../live/ink.js';

const T0 = 20, IGN = 180, TH = 0.16, TB = 0.02;     // 室温、脱脂棉燃点（示意）、筒顶、筒底（活塞最低处离底 TB）

export default {
  id: 'compress',
  fig: '图13.3-5',
  title: '做功改变物体的内能',
  stampText: '观察',
  predict: {
    q: '厚玻璃筒里放一小团脱脂棉，把活塞<b>迅速</b>压下去。<br>会发生什么？',
    hint: '课本第 16 页「演示」',
    options: ['什么也不会发生', '脱脂棉燃烧起来', '玻璃筒变冷'],
    answer: 1,
  },
  conclusion: {
    page: 22, rect: [160, 440, 460, 656],
    quote: '在图13.3-5甲所示的实验中，脱脂棉燃烧起来，是因为活塞压缩气体做功，使空气的内能增加，温度升高，达到脱脂棉的燃点。……当瓶塞跳起时，可以看到瓶内出现白雾……在这个过程中，气体膨胀对外做功，内能减少，温度降低。……做功也可以改变物体的内能。',
    why: '对物体做功，物体的内能增加；物体对外做功，它的内能减少。压活塞时，人对筒内空气做功，空气的内能增加、温度升高；压得快，热量来不及散失，温度能升到脱脂棉的燃点；压得慢，热一边产生一边散走，棉花就点不着。打气后瓶塞跳起，是瓶内气体推动瓶塞做功，气体内能减少、温度降低，瓶内的水蒸气遇冷液化成小水滴——白雾。',
    src: '课本第 15–16 页 · 第十三章 第2节 内能',
  },

  create({ tag, reframe }) {
    const group = new THREE.Group();
    const S = { scene: 'tube', py: TH, T: T0, burnt: false, fire: 0, lastY: TH, vel: 0, seen: new Set(), maxT: T0, pressT: 0,
      p: 1, pump: 0, pumpLast: 0, popped: false, fog: 0, flaskT: T0, stopY: 0 };
    let W = null;
    const status = (m) => W?.status(m);

    // ================= 甲：压缩引火 =================
    const tubeG = new THREE.Group();
    const base = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, 0.012, 24), paint(0x2b2f3a)), 0.001); base.position.y = 0.006;
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, TH - 0.012, 24, 1, true), paint(0xd6ecf5, { unique: true, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
    glass.position.y = 0.012 + (TH - 0.012) / 2;
    const cap = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.01, 20), paint(0x2f6fd0)), 0.001); cap.position.y = TH + 0.005;
    const piston = new THREE.Group();
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.008, 20), paint(0x3b4150));
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.15, 10), paint(0x5b6272)); rod.position.y = 0.075;
    const handle = inked(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.012), paint(0xd9483b)), { width: 1 }); handle.position.y = 0.15;
    piston.add(head, rod, handle);
    const cotton = new THREE.Mesh(new THREE.IcosahedronGeometry(0.006, 1), new THREE.MeshLambertMaterial({ color: 0xf8f8f2 })); cotton.position.y = 0.017; cotton.scale.set(1, 0.6, 1);
    const fireS = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff8a2a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); fireS.position.y = 0.022; fireS.scale.setScalar(0.05);
    const air = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0115, 1, 20), new THREE.MeshBasicMaterial({ color: 0xff7a3a, transparent: true, opacity: 0, depthWrite: false })); air.geometry.translate(0, 0.5, 0); air.position.y = 0.012;
    tubeG.add(base, glass, cap, piston, cotton, fireS, air);
    tag('脱脂棉', 'pill').loc(tubeG, 0.04, 0.017, 0);
    group.add(tubeG);
    const tT = tag('', 'pill');

    // ================= 乙：打气，瓶塞跳起 =================
    const flaskG = new THREE.Group();
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 24, 18), paint(0xd6ecf5, { unique: true, transparent: true, opacity: 0.3, depthWrite: false }));
    bulb.position.y = 0.035;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 16, 1, true), paint(0xd6ecf5, { unique: true, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide })); neck.position.y = 0.09;
    const water = new THREE.Mesh(new THREE.SphereGeometry(0.033, 24, 10, 0, Math.PI * 2, Math.PI * 0.78, Math.PI * 0.22), new THREE.MeshBasicMaterial({ color: 0x8fcdea, transparent: true, opacity: 0.7, side: THREE.DoubleSide })); water.position.y = 0.035;
    const stopper = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.007, 0.016, 14), paint(0xd9b98a)), 0.001); stopper.position.y = 0.118;
    const fogM = new THREE.Mesh(new THREE.SphereGeometry(0.033, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); fogM.position.y = 0.035;
    flaskG.add(bulb, neck, water, stopper, fogM);
    // 打气筒
    const pumpG = new THREE.Group(); pumpG.position.set(0.09, 0, 0);
    const barrel = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.09, 16), paint(0x2f6fd0)), 0.001); barrel.position.y = 0.055;
    const pfoot = inked(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.006, 0.02), paint(0x3b4150)), { width: 1 }); pfoot.position.y = 0.003;
    const prod = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.05, 8), paint(0x8f99a8));
    const ph = inked(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.008, 0.01), paint(0x2b2f3a)), { width: 1 });
    const pumpTop = new THREE.Group(); pumpTop.add(prod, ph); prod.position.y = -0.025;
    pumpG.add(barrel, pfoot, pumpTop);
    const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.09, 0.01, 0.012), new THREE.Vector3(0.06, 0.005, 0.04), new THREE.Vector3(0.012, 0.15, 0.02), new THREE.Vector3(0, 0.125, 0.0)]), 30, 0.0018, 6, false), paint(0xeeeeee));
    flaskG.add(pumpG, hose);
    tag('打气筒（上下拖手柄）', 'pill').loc(flaskG, 0.09, 0.0, 0.03);
    group.add(flaskG);
    const mist = new Particles({ max: 120, sprite: true, color: 0xffffff }); flaskG.add(mist.mesh);

    const setScene = (k) => { if (S.scene !== k) reframe?.(); S.scene = k; tubeG.visible = k === 'tube'; flaskG.visible = k === 'flask'; };
    setScene('tube');
    const pump = () => { if (S.popped) return; S.p += 0.12; S.flaskT += 1.5; };
    const resetFlask = () => { S.p = 1; S.popped = false; S.fog = 0; S.flaskT = T0; S.stopY = 0; };
    const pointer = draggable(group, [
      { obj: handle, anchor: piston, plane: 'xy', offset: 0, keepOffset: true, hint: '按住往下压（快压、慢压都试试）', onStart: () => { S.lastY = S.py; S.lastT = performance.now(); }, onDrag: (p) => { S.py = clamp(p.y, TB, TH - 0.008); } },
      { obj: ph, anchor: pumpTop, plane: 'xy', offset: 0, keepOffset: true, hint: '上下拖：打气', onDrag: (p) => { const y = clamp(p.y - 0.12, 0, 0.04); if (y > 0.014) S.armed = true; if (S.armed && y < 0.006) { S.armed = false; pump(); } S.pumpLast = y; S.pump = y; } },
    ], { tip: tag('', 'pill') });

    return {
      group,
      size: { w: 0.16, d: 0.08, h: 0.3 },
      view: { elev: 10, azim: 0, lookY: 0.5, margin: 1.1 },
      pointer,
      mount(ui) {
        const sc = seg('做哪个', ['甲 压缩空气', '乙 打气，瓶塞跳起'], (_, k) => { setScene(k ? 'flask' : 'tube'); status(k ? '烧瓶里有少量水，盖紧了瓶塞。<b>上下拖打气筒的手柄</b>往瓶里打气，看瓶塞跳起时瓶里有什么变化。' : '按住活塞的红色手柄<b>往下压</b>。'); });
        const btns = buttons([
          { text: '快压', ghost: true, onClick: () => { S.auto = { to: TB, v: 1.2 }; } },
          { text: '慢压', ghost: true, onClick: () => { S.auto = { to: TB, v: 0.03 }; } },
          { text: '拉起、换棉花', ghost: true, onClick: () => { S.py = TH - 0.008; S.T = T0; S.burnt = false; S.fire = 0; S.maxT = T0; } },
          { text: '打气', ghost: true, onClick: pump },
          { text: '塞好瓶塞', ghost: true, onClick: resetFlask },
        ]);
        // 学生自己解释看到的现象
        const q = buttons([0, 1, 2].map(() => ({ text: '', ghost: true, onClick: () => {} })));
        q.el.hidden = true;
        const ask = (text, opts, hint, ok) => {
          const sh = [0, 1, 2].sort(() => Math.random() - 0.5);
          q.btns.forEach((b, j) => { b.textContent = opts[sh[j]]; b.onclick = () => { if (sh[j]) return ui.status(hint); q.el.hidden = true; ok(); }; });
          q.el.hidden = false; ui.status(text);
        };
        ui.controls.append(q.el, sc.el, note('<b>甲</b>：按住红色手柄往下拖，拖得快慢由你。<b>乙</b>：上下拖打气筒的手柄。面板按钮也可以。'), btns.el);
        W = { askTube: () => {
          if (!S.seen.has('fast') || !S.seen.has('slow') || S.seen.has('tubeQ')) return;
          S.seen.add('tubeQ');
          ask('快压点着了，慢压没点着。为什么？', ['快压时活塞对空气做功，空气内能增加、温度升得很高；慢压时热量边压边散失了', '快压时活塞和筒壁摩擦生热，点着了棉花', '慢压时空气没有被压缩'], '想一想：被压缩的是筒里的什么？是谁对谁做了功？慢压时温度为什么升不上去？', () => { W.goal.done('why'); ui.status('对：<b>对物体做功，物体的内能增加</b>（机械能转化为内能）。压得快，热量来不及散失，空气温度达到了棉花的燃点。'); });
        }, askFog: () => ask('瓶塞跳起来了，瓶里出现了<b>白雾</b>。这是因为——', ['瓶内气体推动瓶塞做功，内能减少、温度降低，水蒸气液化成小水滴', '打进去的空气太多，挤出了白烟', '瓶塞跳起时瓶内温度升高，水沸腾了'], '想一想：瓶塞被推出去，是谁对谁做了功？做功以后瓶里的气体温度升高还是降低？', () => { W.goal.done('pop'); ui.status('对：<b>物体对外做功，内能减少</b>，温度降低，水蒸气遇冷<b>液化</b>成小水滴——这就是白雾。'); }),
          status: (m) => ui.status(m), goal: goals(ui, [['fast', '甲：迅速压下活塞'], ['slow', '甲：慢慢压下活塞，比较'], ['why', '甲：说说为什么快压能点着'], ['pop', '乙：打气直到瓶塞跳起，观察瓶内']]) };
        ui.status('甲：厚玻璃筒底部放了一小团脱脂棉。按住活塞的红色手柄<b>往下压</b>。');
      },
      update(dt) {
        const h = Math.min(dt, 1 / 30);
        if (S.auto) { S.py = Math.max(S.auto.to, S.py - S.auto.v * h); if (S.py <= S.auto.to + 1e-4) S.auto = null; }
        // ---- 甲 ----
        const V = (y) => y - 0.012;
        const dy = S.lastPy == null ? 0 : S.py - S.lastPy;
        S.lastPy = S.py;
        const TK = S.T + 273;
        const TK2 = dy !== 0 ? TK * Math.pow(V(S.py - dy) / V(S.py), 0.4) : TK;     // 绝热：体积变小温度升高；拉起时降温
        S.T = TK2 - 273;
        S.T -= (S.T - T0) * h * 6;                                                // 向外散热
        S.maxT = Math.max(S.maxT, S.T);
        if (dy < 0) S.pressT += h;
        piston.position.y = S.py;
        air.scale.y = Math.max(0.001, S.py - 0.016); air.material.opacity = Math.min(0.5, Math.max(0, (S.T - 40) / 400));
        if (!S.burnt && S.T > IGN) { S.burnt = true; S.fire = 1; S.seen.add('fast'); W?.goal.done('fast'); if (S.scene === 'tube') status(S.seen.has('slow') ? '脱脂棉<b>燃烧起来了</b>！' : '脱脂棉<b>燃烧起来了</b>！拉起活塞、换一团棉花，再<b>慢慢</b>压下去试试。'); W?.askTube?.(); }
        if (S.fire > 0) { S.fire -= h * 0.5; fireS.material.opacity = Math.max(0, S.fire) * (0.7 + 0.3 * Math.sin(performance.now() / 40)); cotton.material.color.setRGB(0.3 + S.fire * 0.5, 0.25, 0.2); } else fireS.material.opacity = 0;
        if (S.burnt && S.fire <= 0) cotton.visible = false; else cotton.visible = true;
        if (!S.burnt && S.py <= TB + 0.002 && S.pressT > 1.2 && !S.seen.has('slow')) { S.seen.add('slow'); W?.goal.done('slow'); if (S.scene === 'tube') status(`慢慢压下去，筒里的空气最高只到约 ${Math.round(S.maxT)} ℃，脱脂棉没有点着。`); W?.askTube?.(); }
        if (S.py > TH - 0.02) { S.pressT = 0; S.maxT = S.T; }
        if (S.scene === 'tube') tT.loc(group, 0.05, 0.08, 0).text(dy === 0 && S.maxT > T0 + 5 ? `筒内空气约 ${Math.round(S.T)} ℃，刚才最高约 ${Math.round(S.maxT)} ℃（示意）` : `筒内空气约 ${Math.round(S.T)} ℃（示意）`); else tT.loc(group, 0, -9, 0);
        // ---- 乙 ----
        pumpTop.position.y = 0.1 + S.pump + 0.02;
        if (!S.popped && S.p > 2.2) { S.popped = true; S.flaskT -= 25; S.fog = 1; S.seen.add('pop'); W?.askFog?.(); for (let k = 0; k < 60; k++) mist.spawn({ p: new THREE.Vector3((Math.random() - 0.5) * 0.04, 0.03 + Math.random() * 0.04, (Math.random() - 0.5) * 0.04), v: new THREE.Vector3(0, 0.01, 0), size: 0.02, life: 4, alpha: 0.6 }); }
        if (S.popped) { S.stopY += h * 0.25; stopper.position.set(S.stopY * 0.4, 0.118 + Math.min(0.06, S.stopY), 0); stopper.rotation.z = S.stopY * 6; } else stopper.position.set(0, 0.118, 0);
        S.fog = Math.max(0, S.fog - h * 0.15); fogM.material.opacity = S.fog * 0.5;
        mist.update(h, (p, d) => { p.p.addScaledVector(p.v, d); p.alpha = 0.6 * (1 - p.age / p.life); });
        if (S.scene === 'flask' && !S.popped) tT.loc(group, -0.06, 0.1, 0).text(`瓶内气压约 ${S.p.toFixed(1)} 个大气压（示意）`);
      },
      dispose() { mist.dispose?.(); },
      debug: { S },
    };
  },
};
