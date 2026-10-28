// 第十九章 第2节 家庭电路的基本组成。三个小实验放在一张桌上，切换：
//   ① 图19.2-1 金属丝会熔断吗：铅锑合金丝 AB、导线 BC、铜丝 CD 串联在电路里，拖滑动变阻器的滑片使电流增大——铅锑合金丝发红、熔断，铜丝没事。
//   ② 图19.2-5 用测电笔辨别相线和中性线：拿着测电笔，笔尖碰插座的两个孔；手指要抵住笔尾的金属帽，接触相线时氖管才发光。
//   ③ 图19.2-6 电灯和开关怎样接入家庭电路：开关接在相线上还是中性线上？断开开关后去摸灯座的金属部分，看安不安全。
// 物理：① 电流 I = U/(R变 + R丝)，电阻丝温度跟 I² 成正比地升高，铅锑合金熔点低（约 200 ℃）、电阻大，铜熔点高、电阻小。示意数值。
import * as THREE from 'three';
import { seg, buttons, goals, note } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { glowTexture, canvasTex } from './kit/props.js';
import { paint, inked, hull } from '../live/ink.js';

export default {
  id: 'homecircuit',
  fig: '图19.2-1',
  title: '家庭电路：保险丝、测电笔、开关的接法',
  stampText: '探究',
  predict: {
    q: '铅锑合金丝和铜丝串联在电路里（电流相同），逐渐增大电流——',
    hint: '课本第 134 页「演示」',
    options: ['铜丝先熔断', '铅锑合金丝先熔断', '同时熔断'],
    answer: 1,
  },
  conclusion: {
    crops: [{ page: 140, rect: [158, 580, 460, 656] }, { page: 141, rect: [60, 44, 360, 98] }, { page: 142, rect: [158, 530, 460, 656] }, { page: 143, rect: [60, 44, 360, 70] }],
    quote: '长度、横截面积相同的铅锑合金丝的电阻比铜丝大得多，熔点比铜丝低得多。当电流过大时，铅锑合金丝由于温度升高而熔断，切断电路，起到保护电路的作用。……从安全角度考虑，控制电灯的开关要连接在相线和电灯之间。',
    why: '串联时电流相同，由 Q = I²Rt，电阻大的铅锑合金丝产生的热量多，而它的熔点又低，所以先熔断，切断电路——这就是熔断器（保险丝）的作用。不能用铜丝、铁丝代替保险丝。测电笔的笔尖接触相线，电流经过测电笔、人体流入大地，氖管发光；接触中性线氖管不发光。测电笔里有一个很大的电阻，电流很小，人没有危险；但手不能碰笔尖的金属。开关接在相线上，断开开关后灯座就和相线断开了，修灯时才安全。',
    src: '课本第 134–137 页 · 第十九章 第2节 家庭电路的基本组成',
  },

  create({ tag, reframe }) {
    const group = new THREE.Group();
    const S = { scene: 'fuse', pos: 1, fuseT: 25, cuT: 25, blown: false, held: false, cap: true, pen: new THREE.Vector3(0.0, 0.075, -0.016), swOn: true, swLive: true, seen: new Set(), shockT: 0 };
    let W = null;
    const status = (m) => W?.status(m);

    // ================= ① 熔丝 =================
    const fuseG = new THREE.Group();
    const board = inked(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.008, 0.06), paint(0xdfe9f4)), { width: 1.2 }); board.position.set(0, 0.03, -0.02);
    const legs = [-1, 1].map((s) => { const l = inked(new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.03, 0.05), paint(0xb8bec8)), { width: 1 }); l.position.set(s * 0.09, 0.015, -0.02); return l; });
    fuseG.add(board, ...legs);
    const PX = [-0.08, -0.025, 0.025, 0.08];
    PX.forEach((x, i) => { const p = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.008, 12), paint(0xc0392b)), 0.0008); p.position.set(x, 0.038, -0.02); fuseG.add(p); tag('ABCD'[i], 'mag').loc(fuseG, x, 0.04, 0.0); });
    const mkWire = (x0, x1, col, r) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, x1 - x0, 8), new THREE.MeshBasicMaterial({ color: col })); m.rotation.z = Math.PI / 2; m.position.set((x0 + x1) / 2, 0.042, -0.02); fuseG.add(m); return m; };
    const fuseL = mkWire(PX[0], PX[1], 0x8a8f99, 0.0009), fuseR = null;
    const lead = mkWire(PX[1], PX[2], 0xe08a3c, 0.0012);
    const cu = mkWire(PX[2], PX[3], 0xc8743a, 0.0009);
    const glowF = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff6a2a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); glowF.position.set((PX[0] + PX[1]) / 2, 0.045, -0.02); glowF.scale.set(0.06, 0.02, 1); fuseG.add(glowF);
    const drops = [0, 1].map((s) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.002, 8, 6), paint(0x8a8f99)); d.visible = false; fuseG.add(d); return d; });
    for (const [t, x] of [['铅锑合金丝', -0.052], ['导线', 0], ['铜丝', 0.052]]) tag(t, 'pill').loc(fuseG, x, 0.06, -0.02);
    void fuseR;
    const rh = new THREE.Group(); rh.position.set(0, 0, 0.06);
    const rc = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.12, 20), paint(0x8a5a34)), 0.001); rc.rotation.z = Math.PI / 2; rc.position.y = 0.014;
    const slider = inked(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.016), paint(0x3b4150)), { width: 1 }); slider.position.y = 0.028;
    rh.add(rc, slider); fuseG.add(rh);
    tag('滑动变阻器（接电源）', 'pill').loc(fuseG, 0, 0.0, 0.09);
    for (const pts of [[[PX[0], 0.038, -0.02], [-0.1, 0.03, 0.02], [-0.06, 0.015, 0.06]], [[PX[3], 0.038, -0.02], [0.1, 0.03, 0.02], [0.06, 0.015, 0.06]]]) fuseG.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q))), 20, 0.0012, 5, false), paint(0xe08a3c)));
    group.add(fuseG);
    const tI = tag('', 'pill');

    // ================= ② 测电笔 =================
    const penG = new THREE.Group();
    const socket = inked(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.012), paint(0xf4f4f0)), { width: 1.2 }); socket.position.set(0, 0.04, -0.04);
    const holes = [-1, 1].map((s) => { const h = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.012, 0.004), new THREE.MeshBasicMaterial({ color: 0x222222 })); h.position.set(s * 0.016, 0.04, -0.0335); penG.add(h); return h; });
    // 墙里的两根线看不出哪根是相线，要用测电笔找
    const backWires = [[0x6b6f78, -0.016], [0x6b6f78, 0.016]].map(([c, x]) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.08, 6), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, 0.08, -0.047); penG.add(m); return m; });
    void backWires;
    penG.add(socket);
    tag('左孔', 'pill').loc(penG, -0.03, 0.075, -0.035); tag('右孔', 'pill').loc(penG, 0.03, 0.075, -0.035);
    const pen = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.07, 12), paint(0x9fd0ea, { unique: true, transparent: true, opacity: 0.7 })); body.position.y = 0.035;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0025, 0.012, 8), paint(0xc8cdd4)); tip.rotation.x = Math.PI; tip.position.y = -0.006;
    const neon = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.012, 8), new THREE.MeshBasicMaterial({ color: 0x553333 })); neon.position.y = 0.05;
    const neonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff5a2a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); neonGlow.scale.setScalar(0.04); neonGlow.position.y = 0.05;
    const capM = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.006, 12), paint(0xc8cdd4)); capM.position.y = 0.073;
    const finger = hull(new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.02, 6, 10), paint(0xf1c7a2)), 0.001); finger.position.y = 0.088;
    pen.add(body, tip, neon, neonGlow, capM, finger);
    pen.rotation.set(0.75, 0, -0.55);          // 笔从右前上方斜着插向插座面板（笔尾朝右上、朝你）
    const TIP = new THREE.Vector3(0, -0.012, 0).applyEuler(pen.rotation);     // 笔尖相对笔的原点
    const PZ = -0.0335 - TIP.z;                                                // 笔尖刚好在面板上时，笔原点的 z
    S.pen.z = PZ;
    penG.add(pen);
    group.add(penG);

    // ================= ③ 电灯和开关 =================
    const lampG = new THREE.Group();
    const lines = [[0xd9483b, 0.05, '相线（火线）'], [0x2f6fd0, 0.02, '中性线（零线）']].map(([c, z, t]) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 0.26, 8), new THREE.MeshBasicMaterial({ color: c })); m.rotation.z = Math.PI / 2; m.position.set(0, 0.004, -z); lampG.add(m); tag(t, 'pill').loc(lampG, -0.15, 0.004, -z); return m; });
    void lines;
    const lampHolder = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.014, 16), paint(0xc8cdd4)), 0.001); lampHolder.position.set(0.04, 0.03, 0.03);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.014, 16, 12), new THREE.MeshBasicMaterial({ color: 0xf2f2f2, transparent: true, opacity: 0.8 })); bulb.position.set(0.04, 0.05, 0.03);
    const bulbGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffd98a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); bulbGlow.scale.setScalar(0.08); bulbGlow.position.copy(bulb.position);
    const swBase = inked(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.03), paint(0xf4f4f0)), { width: 1 }); swBase.position.set(-0.04, 0.005, 0.03);
    const swKey = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.006, 0.02), paint(0xe0e0e0)); swKey.position.set(-0.04, 0.012, 0.03);
    const hand = hull(new THREE.Mesh(new THREE.CapsuleGeometry(0.007, 0.03, 6, 10), paint(0xf1c7a2)), 0.001); hand.rotation.z = Math.PI / 2; hand.position.set(0.1, 0.03, 0.03);
    lampG.add(lampHolder, bulb, bulbGlow, swBase, swKey, hand);
    tag('灯座（金属部分）', 'pill').loc(lampG, 0.04, 0.012, 0.06); tag('开关', 'pill').loc(lampG, -0.04, 0.0, 0.06); tag('手', 'pill').loc(lampG, 0.13, 0.03, 0.03);
    const lwires = [];
    const buildLamp = () => {
      lwires.forEach((m) => { lampG.remove(m); m.geometry.dispose(); }); lwires.length = 0;
      const w = (pts, col = 0xe08a3c) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q))), 20, 0.0012, 5, false), paint(col)); lampG.add(m); lwires.push(m); };
      const live = -0.05, neu = -0.02;
      if (S.swLive) { w([[-0.06, 0.004, live], [-0.055, 0.01, 0.0], [-0.05, 0.01, 0.03]]); w([[-0.03, 0.01, 0.03], [0.0, 0.02, 0.03], [0.032, 0.03, 0.03]]); w([[0.048, 0.03, 0.03], [0.06, 0.015, 0.0], [0.065, 0.004, neu]]); }
      else { w([[0.06, 0.004, live], [0.06, 0.015, 0.0], [0.048, 0.03, 0.03]]); w([[0.032, 0.03, 0.03], [0.0, 0.02, 0.03], [-0.03, 0.01, 0.03]]); w([[-0.05, 0.01, 0.03], [-0.055, 0.01, 0.0], [-0.06, 0.004, neu]]); }
    };
    buildLamp();
    group.add(lampG);

    const setScene = (k) => { if (S.scene !== k) reframe?.(); S.scene = k; fuseG.visible = k === 'fuse'; penG.visible = k === 'pen'; lampG.visible = k === 'lamp'; };
    setScene('fuse');
    const I = () => (S.blown ? 0 : 0.5 + (1 - S.pos) * 3.5);     // A（示意）
    const holeLive = (h) => h === holes[1];          // 两孔插座：左零右火
    const pointer = draggable(group, [
      { obj: slider, plane: 'xz', offset: 0.028, hint: '左右拖滑片：改变电流', onDrag: (p) => { S.pos = clamp((p.x + 0.06) / 0.12, 0, 1); } },
      { obj: body, anchor: pen, plane: 'xy', offset: PZ, keepOffset: true, hint: '拖测电笔：把笔尖插进插座的孔', onDrag: (p) => { S.pen.set(clamp(p.x, -0.06, 0.06), clamp(p.y, 0.025, 0.11), PZ); } },
      { obj: hand, plane: 'xy', offset: 0.03, hint: '拖手去摸灯座的金属部分', onDrag: (p) => { hand.position.set(clamp(p.x, 0.04, 0.12), clamp(p.y, 0.02, 0.05), 0.03); } },
    ], { tip: tag('', 'pill'), taps: [
      { obj: swKey, hint: () => (S.swOn ? '点一下：断开开关' : '点一下：闭合开关'), onTap: () => { S.swOn = !S.swOn; status(S.swOn ? '开关闭合，灯亮了。' : '开关断开，灯灭了。现在<b>拖手去摸灯座</b>（比如要换灯泡）。'); } },
      { obj: capM, hint: () => (S.cap ? '点一下：手指离开笔尾金属帽' : '点一下：手指抵住笔尾金属帽'), onTap: () => { S.cap = !S.cap; } },
      { obj: board, hint: '点一下：换一根新的铅锑合金丝', onTap: () => { if (S.blown) { S.blown = false; S.fuseT = 25; S.pos = 1; status('换上了新的铅锑合金丝，滑片放回电阻最大处。'); } } },
    ] });

    return {
      group,
      size: { w: 0.3, d: 0.16, h: 0.12 },
      view: { elev: 26, azim: 0, lookY: 0.4, margin: 1.1 },
      pointer,
      mount(ui) {
        const sc = seg('做哪个', ['① 金属丝会熔断吗', '② 测电笔', '③ 开关接在哪根线上'], (_, k) => { setScene(['fuse', 'pen', 'lamp'][k]); status(['拖滑动变阻器的滑片，让电流慢慢增大，看两种金属丝。', '<b>拖测电笔</b>，让笔尖分别碰插座的左孔和右孔，看氖管亮不亮。点笔尾的金属帽可以让手指离开 / 抵住它。', '电灯和开关已经接好。<b>点开关</b>断开，再<b>拖手去摸灯座的金属部分</b>。然后换一种接法再试。'][k]); });
        const wiring = seg('③ 开关接在', ['相线和电灯之间', '中性线和电灯之间'], (_, k) => { S.swLive = !k; buildLamp(); S.shockT = 0; hand.position.set(0.1, 0.03, 0.03); S.lastTouch = null; ui.status(k ? '开关改接在<b>中性线</b>和电灯之间。断开开关，再摸灯座。' : '开关改接在<b>相线</b>和电灯之间。断开开关，再摸灯座。'); });
        const btns = buttons([{ text: '换新的铅锑合金丝', ghost: true, onClick: () => { S.blown = false; S.fuseT = 25; S.pos = 1; } }, { text: '手指抵住 / 离开金属帽', ghost: true, onClick: () => { S.cap = !S.cap; } }, { text: '开关 通 / 断', ghost: true, onClick: () => { S.swOn = !S.swOn; } }]);
        ui.controls.append(sc.el, note('<b>拖滑片</b>、<b>拖测电笔</b>、<b>拖手</b>，<b>点开关、点金属帽</b>都可以直接在桌上做。'), btns.el, wiring.el);
        const lq = buttons(['左孔接的是相线', '右孔接的是相线'].map((t, j) => ({ text: t, ghost: true, onClick: () => {
          if (!j) return ui.status('再想想：手指抵住金属帽时，插进哪个孔氖管才发光？');
          lq.el.hidden = true; S.liveKnown = true; W.goal.done('live');
          ui.status('对：插进右孔时氖管发光，右孔接的是<b>相线</b>（火线）——家里的两孔插座是“左零右火”。电流经测电笔、人体流入大地，笔里有很大的电阻，电流很小，人没有危险。现在<b>点笔尾的金属帽</b>让手指离开，再插右孔试试。');
        } })));
        lq.el.hidden = true;
        ui.controls.append(lq.el);
        const hq = buttons([0, 1, 2].map(() => ({ text: '', ghost: true, onClick: () => {} })));
        hq.el.hidden = true;
        const askQ = (text, opts, hint, ok) => {
          const sh = [0, 1, 2].sort(() => Math.random() - 0.5);
          hq.btns.forEach((b, j) => { b.textContent = opts[sh[j]]; b.onclick = () => { if (sh[j]) return ui.status(hint); hq.el.hidden = true; ok(); }; });
          hq.el.hidden = false; ui.status(text);
        };
        ui.controls.append(hq.el);
        W = { askFuse: () => askQ('<b>铅锑合金丝熔断了</b>，铜丝还好好的。两根丝串联，电流相同。为什么是铅锑合金丝先断？', ['它的电阻大、产生的热量多，熔点又低', '通过它的电流比铜丝大', '它比铜丝粗'], '两根丝串联，电流一样大。想想 Q = I²Rt：谁的电阻大？谁的熔点低？', () => { W.goal.done('fuse'); ui.status('对：串联时电流相同，铅锑合金丝<b>电阻大</b>、产生的热量多，<b>熔点又低</b>，所以先熔断、切断电路——这就是保险丝。不能用铜丝代替保险丝。'); }),
          askSwitch: () => askQ('两种接法都摸过了。控制电灯的开关应该接在——', ['接在相线上（相线和电灯之间）', '接在中性线上（中性线和电灯之间）', '接在哪根线上都一样'], '回想一下：开关接在哪根线上时，断开开关后摸灯座触电了？', () => { W.goal.done('where'); ui.status('对：开关要接在<b>相线和电灯之间</b>。这样断开开关，灯座就和相线断开了；接在中性线上，断开后灯座仍然带电，换灯泡时会触电。'); }),
          askLive: () => { lq.el.hidden = false; ui.status('两个孔都试过了。哪个孔接的是相线（火线）？'); }, status: (m) => ui.status(m), goal: goals(ui, [['fuse', '① 增大电流，看哪根金属丝熔断'], ['live', '② 用测电笔找出相线'], ['cap', '② 手指离开金属帽再试'], ['safe', '③ 开关接在相线上，断开后摸灯座'], ['danger', '③ 开关接在中性线上，断开后摸灯座'], ['where', '③ 说出开关应该接在哪根线上']]) };
        ui.status('① 金属丝会熔断吗：<b>拖滑动变阻器的滑片</b>，让电流慢慢增大。');
      },
      update(dt) {
        // ① 温度：趋向 25 + k·I²·R（铅锑电阻大）
        slider.position.x = -0.06 + S.pos * 0.12;
        const i = I();
        S.fuseT += ((25 + i * i * 24) - S.fuseT) * Math.min(1, dt * 1.5);
        S.cuT += ((25 + i * i * 2.4) - S.cuT) * Math.min(1, dt * 1.5);
        if (!S.blown && S.fuseT > 200) { S.blown = true; drops.forEach((d, k) => { d.visible = true; d.position.set(-0.052 + (k - 0.5) * 0.01, 0.042, -0.02); }); S.seen.add('fuse'); W?.askFuse(); }
        fuseL.visible = !S.blown;
        fuseL.material.color.setRGB(0.54 + Math.min(0.46, (S.fuseT - 25) / 300), 0.56 - Math.min(0.3, (S.fuseT - 25) / 500), 0.6 - Math.min(0.5, (S.fuseT - 25) / 300));
        glowF.material.opacity = S.blown ? 0 : Math.max(0, (S.fuseT - 120) / 100);
        drops.forEach((d) => { if (d.visible && d.position.y > 0.035) d.position.y -= dt * 0.05; });
        if (S.scene === 'fuse') tI.loc(group, 0.07, 0.0, 0.09).text(S.blown ? '电流 0' : `电流约 ${i.toFixed(1)} A`); else tI.loc(group, 0, -9, 0);
        // ② 测电笔
        pen.position.copy(S.pen);
        finger.visible = S.cap;
        const touching = holes.find((h) => Math.abs(h.position.x - S.pen.x - TIP.x) < 0.006 && Math.abs(S.pen.y + TIP.y - h.position.y) < 0.007);     // 笔尖在孔里
        const glow = touching && holeLive(touching) && S.cap;
        neon.material.color.setHex(glow ? 0xff6a3a : 0x553333); neonGlow.material.opacity = glow ? 0.9 : 0;
        if (touching && S.scene === 'pen') {
          const key = `${holeLive(touching)}|${S.cap}`;
          if (key !== S.penKey) {
            S.penKey = key;
            const side = touching === holes[0] ? '左孔' : '右孔';
            if (S.cap) {
              (S.tried ||= {})[side] = !!glow;
              if (S.liveKnown) status(glow ? '氖管发光：这是相线。' : '氖管不亮：这是中性线。');
              else if (S.tried['左孔'] != null && S.tried['右孔'] != null) W?.askLive();
              else status(`笔尖插进${side}：氖管${glow ? '<b>发光</b>了' : '<b>不亮</b>'}。再试试另一个孔。`);
            } else if (holeLive(touching) && S.liveKnown) { W?.goal.done('cap'); status('手指没有抵住笔尾的金属帽：电流没有通路，氖管<b>不亮</b>——这样会把相线误认成中性线！'); }
            else status(`笔尖插进${side}：氖管不亮。（手指没有抵住笔尾的金属帽）`);
          }
        } else S.penKey = null;
        // ③ 电灯
        swKey.rotation.x = S.swOn ? 0.25 : -0.25;
        bulbGlow.material.opacity = S.swOn ? 0.8 : 0; bulb.material.color.setHex(S.swOn ? 0xfff2c0 : 0xf2f2f2);
        const touch = hand.position.x < 0.055;
        if (touch && S.scene === 'lamp' && !S.swOn) {
          const key = `${S.swLive}`;
          if (S.touchKey !== key) {
            S.touchKey = key;
            if (S.swLive) { W?.goal.done('safe'); status('开关接在<b>相线</b>上：断开开关后，手摸灯座<b>没有触电</b>。'); }
            else { W?.goal.done('danger'); S.shockT = 1; status('<b>触电了！</b>开关接在中性线上：开关断开了，灯也灭了，手一碰灯座还是触电。'); }
            if (W?.goal.has('safe') && W?.goal.has('danger')) W?.askSwitch();
          }
        } else if (!touch) S.touchKey = null;
        S.shockT = Math.max(0, S.shockT - dt);
        hand.position.y += S.shockT > 0 ? Math.sin(S.shockT * 60) * 0.0006 : 0;
        hand.material.color.setHex(S.shockT > 0 ? 0xff9a7a : 0xf1c7a2);
      },
      debug: { S, setScene },
    };
  },
};
