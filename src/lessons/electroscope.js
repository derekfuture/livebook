// 图15.1-2 带电玻璃棒间的相互作用 / 图15.1-3 验电器。
// 两个场景（同一张桌子，切换）：① 用丝线吊起一根丝绸摩擦过的玻璃棒（带正电），能绕吊线转动；② 验电器（金属球、金属杆、两片金属箔）。
// 手里横握着一根棒（玻璃棒或橡胶棒），棒在你面前的竖直平面里跟着鼠标移动——屏幕上看起来碰到了，就是真的碰到了。
//   · 摩擦：把棒拖到桌上的丝绸 / 毛皮上来回蹭，蹭得越多带电越多（有噼啪声）；
//   · 靠近吊着的玻璃棒：它被推开或吸过来；
//   · 棒尖碰验电器的金属球：一部分电荷转移到验电器上，金属箔张开；靠近但不碰，箔片因静电感应也微微张开，拿开就合拢；
//   · 点一下金属球 = 用手摸它：电荷导入大地，箔片合拢。
// 模型：电荷以“份”为单位（示意，不是库仑）；吊棒受的力 ∝ q₁q₂/r²；接触时按 6 : 4 重新分配。
import * as THREE from 'three';
import { seg, buttons, goals, note, readout } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { canvasTex, stand, glowTexture } from './kit/props.js';
import { audio } from './kit/audio.js';
import { paint, inked, hull, glassEdge } from '../live/ink.js';

const H = 0.12;                  // 吊棒、金属球的高度
const ROD = 0.13, QMAX = 3;
// 桌上同时摆着两套：左边吊着的玻璃棒，中间验电器，右边丝绸、毛皮。手里的棒在 z = 0 的竖直平面里移动；
// 吊棒的转轴放在后面一点，让它朝外的那一端正好在这个平面附近（这样棒尖能“对准”它）。
const PH = new THREE.Vector3(-0.17, H, -0.044), PE = new THREE.Vector3(-0.01, H, 0);
const CLOTH_Y = 0.014;

let _sign = {};
const signTex = (s) => (_sign[s] ||= canvasTex(64, 64, (g) => { g.fillStyle = s > 0 ? '#d23b2b' : '#2a62c9'; g.font = 'bold 56px sans-serif'; g.textAlign = 'center'; g.fillText(s > 0 ? '+' : '−', 32, 50); }));
// 一组电荷记号（+ 或 −），沿一条线段排开
function marks(n = 9, size = 0.009) {
  const g = new THREE.Group();
  const list = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: signTex(1), depthTest: false, transparent: true }));
    m.scale.setScalar(size); m.renderOrder = 40; m.visible = false;
    g.add(m); list.push(m);
  }
  g.show = (q, a, b, off = new THREE.Vector3(0, 0.007, 0)) => {
    const k = g.visible ? Math.min(list.length, Math.round(Math.abs(q) * 3)) : 0;
    list.forEach((m, i) => {
      m.visible = i < k;
      if (!m.visible) return;
      m.material.map = signTex(Math.sign(q));
      m.position.lerpVectors(a, b, k === 1 ? 0.5 : i / (k - 1)).add(off);
    });
  };
  return g;
}
// 摩擦的噼啪声、接触的“嗒”一声：很短的噪声脉冲
function crackle(gain = 0.05, dur = 0.03) {
  const a = audio(), n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
  const src = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
  f.type = 'highpass'; f.frequency.value = 2500; g.gain.value = gain;
  src.buffer = buf; src.connect(f).connect(g).connect(a.destination); src.start();
}

export default {
  id: 'electroscope',
  fig: '图15.1-3',
  title: '两种电荷 · 验电器',
  stampText: '观察',
  predict: {
    q: '用丝绸摩擦过的玻璃棒，接触验电器的金属球。<br>验电器下面的两片金属箔会——',
    hint: '课本第 41 页',
    options: ['张开', '合得更紧', '没有变化'],
    answer: 0,
  },
  conclusion: {
    crops: [{ page: 47, rect: [62, 116, 362, 262] }, { page: 47, rect: [62, 344, 362, 430] }],   // 课本第 41 页
    quote: '自然界只有两种电荷。人们把用丝绸摩擦过的玻璃棒带的电荷叫作正电荷，把用毛皮摩擦过的橡胶棒带的电荷叫作负电荷。同种电荷互相排斥，异种电荷互相吸引。……用带电体接触验电器的金属球，就有一部分电荷转移到验电器的两片金属箔上，这两片金属箔带同种电荷，由于互相排斥而张开。',
    why: '两根丝绸摩擦过的玻璃棒带同种电荷，靠近时吊着的那根被推开；毛皮摩擦过的橡胶棒带另一种电荷，靠近时把玻璃棒吸过来。验电器的金属球、金属杆、金属箔都是导体，带电体一接触金属球，电荷就传到两片金属箔上，同种电荷相互排斥，箔片张开；带的电荷越多，张角越大。如果再用带异种电荷的棒接触，两种电荷相互抵消，箔片先合拢。用手摸金属球，电荷经人体导入大地，箔片合拢。（画面里的“+”“−”是帮助理解的示意，实际电荷看不见。）',
    src: '课本第 40–41 页 · 第十五章 第1节 两种电荷',
  },

  create({ tag }) {
    const group = new THREE.Group();
    const glassMat = () => new THREE.MeshPhysicalMaterial({ color: 0xbfe3f2, transparent: true, opacity: 0.8, roughness: 0.1 });

    // ================= 场景①：吊着的玻璃棒 =================
    const rodsG = new THREE.Group();
    const st = stand({ height: 0.25, baseW: 0.09, baseD: 0.07 });
    st.position.set(PH.x - 0.09 - st.rodX, 0, PH.z - 0.03);
    const arm = st.clamp(0.24, 0.1);
    arm.rotation.y = -Math.atan2(0.03, 0.09);
    const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.0004, 0.0004, 0.24 - H - 0.006, 4), new THREE.MeshBasicMaterial({ color: 0x555555 }));
    thread.position.set(PH.x, (0.24 + H + 0.006) / 2, PH.z);
    const hang = new THREE.Group();
    hang.position.copy(PH);
    const hr = glassEdge(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, ROD, 14), glassMat()));
    hr.rotation.z = Math.PI / 2;
    const stir = inked(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.009, 0.009), paint(0xc8cdd4)), { width: 1 });
    stir.position.y = 0.004;
    hang.add(hr, stir);
    rodsG.add(st, thread, hang);
    group.add(rodsG);
    const hangMarks = marks(); group.add(hangMarks);

    // ================= 场景②：验电器 =================
    const scope = new THREE.Group();
    scope.position.set(PE.x, 0, PE.z);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.075, 0.032), new THREE.MeshLambertMaterial({ color: 0x9fd0ea, transparent: true, opacity: 0.22, depthWrite: false }));
    box.position.y = 0.0425;
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), new THREE.LineBasicMaterial({ color: 0x4f9ccc }));
    frame.position.copy(box.position);
    const foot = inked(new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.005, 0.04), paint(0x5aa9d6)));
    foot.position.y = 0.0025;
    const pad = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.006, 14), paint(0xf2f2f2)));
    pad.position.y = 0.083;
    const metal = paint(0xc9ccd2);
    const srod = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, H - 0.045, 10), metal);
    srod.position.y = 0.045 + (H - 0.045) / 2 - 0.004;
    const ball = hull(new THREE.Mesh(new THREE.SphereGeometry(0.008, 20, 14), metal), 0.001);
    ball.position.y = H - 0.002;
    const leafGeo = new THREE.PlaneGeometry(0.009, 0.03); leafGeo.translate(0, -0.015, 0);
    const leafMat = new THREE.MeshLambertMaterial({ color: 0xe8c96a, side: THREE.DoubleSide, emissive: 0x3a2a00 });
    const leaves = [-1, 1].map((sx) => { const l = new THREE.Mesh(leafGeo, leafMat); l.position.y = 0.047; l.userData.s = sx; return l; });
    scope.add(box, frame, foot, pad, srod, ball, ...leaves);
    group.add(scope);
    const ballMarks = marks(4), leafMarks = [marks(3), marks(3)];
    group.add(ballMarks, ...leafMarks);
    // 接触时的小火花
    const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xbfe0ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    spark.scale.setScalar(0.03); group.add(spark);
    // 来摸金属球的手指
    const finger = hull(new THREE.Mesh(new THREE.CapsuleGeometry(0.0065, 0.03, 6, 12), paint(0xf1c7a2)), 0.001);
    finger.visible = false; group.add(finger);

    // ================= 手里的棒、丝绸、毛皮 =================
    const held = new THREE.Group();
    const mk = (type) => {
      const m = type === 'glass' ? glassEdge(new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, ROD, 14), glassMat())) : hull(new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, ROD, 14), paint(0x2b2b30)), 0.001);
      m.rotation.z = Math.PI / 2; m.position.x = ROD / 2;          // 棒尖在 held 的原点，手握在 +x 那一端
      return m;
    };
    const rods = { glass: mk('glass'), rubber: mk('rubber') };
    const hand = hull(new THREE.Mesh(new THREE.SphereGeometry(0.012, 14, 10), paint(0xf1c7a2)), 0.0012);
    hand.scale.set(1.5, 1, 1); hand.position.set(ROD - 0.006, 0, 0);
    const pick = new THREE.Mesh(new THREE.BoxGeometry(ROD + 0.03, 0.04, 0.04), new THREE.MeshBasicMaterial({ visible: false }));
    pick.position.x = ROD / 2; pick.userData.pick = true;
    held.add(rods.glass, rods.rubber, hand, pick);
    group.add(held);
    const heldMarks = marks(9);
    group.add(heldMarks);
    // 桌上一个小托盘：丝绸、毛皮
    const tray = inked(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.006, 0.05), paint(0xdcd2bd)), { width: 1 });
    const fuzz = canvasTex(128, 64, (g, w, h) => { g.fillStyle = '#8a6a48'; g.fillRect(0, 0, w, h); for (let i = 0; i < 500; i++) { g.strokeStyle = `rgba(${50 + Math.random() * 70},${35 + Math.random() * 35},20,.7)`; const x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2, y + 6); g.stroke(); } });
    const silk = inked(new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.008, 0.04), new THREE.MeshLambertMaterial({ color: 0xf6f1e6 })), { width: 1 });
    const fur = inked(new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.012, 0.04), new THREE.MeshLambertMaterial({ map: fuzz })), { width: 1 });
    const cloths = { glass: silk, rubber: fur };
    // 托盘前沿放着另一根棒：点它就换着拿
    const spare = { glass: mk('glass'), rubber: mk('rubber') };
    for (const m of Object.values(spare)) { m.position.set(0.1, 0.011, 0.034); group.add(m); }
    group.add(tray, silk, fur);
    const clothMarks = { glass: marks(6, 0.007), rubber: marks(6, 0.007) };
    group.add(clothMarks.glass, clothMarks.rubber);
    const tSilk = tag('丝绸', 'pill'), tFur = tag('毛皮', 'pill'), tHint = tag('', 'pill');

    const S = { type: 'glass', q: 0, cq: { glass: 0, rubber: 0 }, hangQ: 2, Qe: 0, ang: -0.75, av: 0, touching: false, rubbing: 0, grabOff: 0.06, lastX: null, spark: 0, finger: 0, seen: new Set(), show: true, wrongT: 0, rubDrag: { glass: 0, rubber: 0 } };
    let W = null;
    const zPlane = () => 0;
    const clothX = { glass: 0.13, rubber: 0.2 };
    const layoutCloths = () => {
      const z = zPlane();
      tray.position.set(0.165, 0.003, z);
      silk.position.set(clothX.glass + S.rubDrag.glass, 0.006 + 0.004, z);
      fur.position.set(clothX.rubber + S.rubDrag.rubber, 0.006 + 0.006, z);
      tSilk.loc(group, clothX.glass, 0.004, z + 0.04); tFur.loc(group, clothX.rubber, 0.004, z + 0.04);
    };
    const setType = (t) => { S.type = t; S.q = 0; rods.glass.visible = t === 'glass'; rods.rubber.visible = t === 'rubber'; spare.glass.visible = t !== 'glass'; spare.rubber.visible = t !== 'rubber'; };
    const resetHeld = () => { held.position.set(0.08, H + 0.04, 0); S.touching = false; };
    const status = (m) => W?.status(m);
    const hint = (t, x, y, z) => (t ? tHint.loc(group, x, y, z).text(t) : tHint.loc(group, 0, -9, 0));
    const tip = () => held.position;
    const ballPos = () => new THREE.Vector3(PE.x, H - 0.002, PE.z);
    const qText = () => (Math.abs(S.q) < 0.15 ? '不带电' : `带${S.q > 0 ? '正' : '负'}电荷（${'●'.repeat(Math.max(1, Math.round(Math.abs(S.q))))}）`);
    // 拖动：棒在面前的竖直平面里移动；碰到金属球就停在球面上；不会穿进桌面和托盘
    const drag = { obj: pick, anchor: held, plane: 'xy', offset: 0, keepOffset: true, onDrag: (p) => {
      const x = clamp(p.x, -0.2, 0.2), y = clamp(p.y, CLOTH_Y + 0.0045 + 0.004, 0.22);
      const dx = S.lastX == null ? 0 : x - S.lastX;
      S.lastX = x;
      held.position.set(x, y, zPlane());
      {
        const b = ballPos(), d = held.position.clone().sub(b);
        if (d.length() < 0.0125) held.position.copy(b).add(d.setLength(0.0125));
      }
      // 是否压在某块布上：棒身和布在 x 方向有重叠，并且贴着布面
      // 蹭的是哪块布：看手按着棒的那一点（鼠标）在哪块布的上方
      const onCloth = y < CLOTH_Y + 0.016 ? Object.keys(cloths).find((k) => Math.abs(p.x + S.grabOff - clothX[k]) < 0.035) : null;
      if (onCloth && Math.abs(dx) > 1e-5) {
        S.rubDrag[onCloth] = clamp(S.rubDrag[onCloth] + dx * 0.25, -0.006, 0.006);        // 布被带着动一点
        if (onCloth === S.type) {
          const before = Math.abs(S.q);
          S.q = clamp(S.q + (S.type === 'glass' ? 1 : -1) * Math.abs(dx) * 7, -QMAX, QMAX);
          S.cq[onCloth] = -S.q;                                                          // 布带上等量的异种电荷
          if (Math.random() < Math.min(0.9, Math.abs(dx) * 60)) crackle(0.03 + Math.random() * 0.03);
          if (Math.floor(Math.abs(S.q) * 2) > Math.floor(before * 2)) W?.out.set('q', qText());
          S.rubbing = 0.4;
        } else if (S.wrongT <= 0) { S.wrongT = 2; status(S.type === 'glass' ? '课本上是用<b>丝绸</b>摩擦玻璃棒。把它拖到丝绸上蹭。' : '课本上是用<b>毛皮</b>摩擦橡胶棒。把它拖到毛皮上蹭。'); }
      }
    }, onStart: (p0) => { S.lastX = held.position.x; S.grabOff = p0 ? p0.x - held.position.x : 0.06; }, onEnd: () => { S.lastX = null; } };
    const touchBall = () => {
      S.finger = 1; S.askAway = false; W?.hideAsk?.();
      const had = Math.abs(S.Qe) > 0.05;
      setTimeout(() => { S.Qe = 0; crackle(0.06, 0.02); if (had) { W?.goal.done('ground'); status('用手摸金属球：电荷经过人体导入大地，验电器不带电了，金属箔<b>合拢</b>。'); } else status('验电器本来就不带电，金属箔没有变化。'); }, 250);
    };
    drag.hint = () => (Math.abs(S.q) < 0.3 ? `按住，拖到${S.type === 'glass' ? '丝绸' : '毛皮'}上来回蹭` : '拖过去：靠近吊着的玻璃棒，或碰验电器的金属球');
    const pointer = draggable(group, [drag], {
      tip: tag('', 'pill'),
      taps: [{ obj: ball, hint: '点一下＝用手摸金属球', onTap: () => touchBall() },
        ...['glass', 'rubber'].map((k) => ({ obj: spare[k], hint: k === 'glass' ? '点一下：换成玻璃棒' : '点一下：换成橡胶棒', onTap: () => { setType(k); S.typeSeg?.set(k === 'glass' ? 0 : 1); resetHeld(); W?.out.set('q', qText()); status(k === 'rubber' ? '换成了橡胶棒。把它拖到<b>毛皮</b>上来回蹭几下。' : '换成了玻璃棒。把它拖到<b>丝绸</b>上来回蹭几下。'); } }))],
    });
    setType('glass');

    return {
      group,
      size: { w: 0.52, d: 0.14, h: 0.25 },
      view: { elev: 28, azim: 0, lookY: 0.42, margin: 1.15 },
      pointer,
      mount(ui) {
        const out = readout([{ key: 'q', label: '手里的棒', span: true }, { key: 'e', label: '验电器的金属箔', span: true }]);
        const type = seg('手里拿', ['玻璃棒', '橡胶棒'], (_, k) => { setType(k ? 'rubber' : 'glass'); resetHeld(); W.out.set('q', qText()); status(k ? '换成了橡胶棒。把它拖到<b>毛皮</b>上来回蹭几下。' : '换成了玻璃棒。把它拖到<b>丝绸</b>上来回蹭几下。'); });
        S.typeSeg = type;
        const showQ = seg('电荷（示意）', ['显示', '不显示'], (_, k) => { S.show = !k; });
        ui.controls.append(note('桌上左边是吊着的玻璃棒，中间是验电器，右边是丝绸和毛皮，托盘前面放着另一根棒（点它换着拿）。<b>按住手里的棒拖动</b>，先在布上来回蹭，再拖过去试。<b>点一下金属球</b>＝用手摸它。'), type.el, out.el, showQ.el, buttons([{ text: '摩擦一下', ghost: true, onClick: () => { S.q = clamp(S.q + (S.type === 'glass' ? 1 : -1), -QMAX, QMAX); S.cq[S.type] = -S.q; crackle(0.05); W.out.set('q', qText()); status(S.type === 'glass' ? '玻璃棒带上了<b>正</b>电荷（丝绸带上等量的负电荷）。拖着它去靠近吊着的玻璃棒，或者碰验电器的金属球。' : '橡胶棒带上了<b>负</b>电荷（毛皮带上等量的正电荷）。拖着它去试试。'); } }, { text: '用手摸金属球', ghost: true, onClick: () => touchBall() }]).el, buttons([{ text: '换一根不带电的棒', ghost: true, onClick: () => { setType(S.type); resetHeld(); W.out.set('q', qText()); } }]).el);
        const away = buttons(['金属箔仍然张开', '金属箔合拢了', '张得比碰着时更大'].map((t, j) => ({ text: t, ghost: true, onClick: () => {
          if (j !== 0) return status('再看看验电器下面的两片金属箔。');
          away.el.hidden = true; S.hideLeaf = false; W.goal.done('open'); S.seen.add('open');
          status(`对：棒拿开以后，箔片<b>仍然张开</b>——碰的时候电荷从棒转移到了验电器上，两片金属箔带上<b>同种</b>电荷，互相排斥。${S.sawNear ? '（刚才只靠近、没碰时箔片也张开一点，棒一拿开就合拢——那是电荷在验电器里被吸引、排斥而重新分布，并没有转移过来。）' : ''}现在点金属球，用手摸一下。`);
        } })));
        away.el.hidden = true;
        ui.controls.append(away.el);
        W = { hideAsk: () => { away.el.hidden = true; S.hideLeaf = false; }, ask: () => { away.el.hidden = false; S.hideLeaf = true; status('棒拿开了。金属箔现在怎样？'); }, out, status: (m) => ui.status(m), goal: goals(ui, [['repel', '用丝绸摩擦过的玻璃棒靠近吊着的玻璃棒'], ['attract', '用毛皮摩擦过的橡胶棒靠近吊着的玻璃棒'], ['open', '让验电器的金属箔张开'], ['ground', '用手摸金属球，让金属箔合拢']]) };
        W.out.set('q', qText()); W.out.set('e', '合拢');
        resetHeld(); layoutCloths();
        status('你手里拿着一根玻璃棒。<b>按住它，拖到右下角的丝绸上，左右来回蹭几下</b>，让它带电。');
      },
      update(dt) {
        S.wrongT -= dt;
        for (const k of Object.keys(S.rubDrag)) S.rubDrag[k] *= 1 - Math.min(1, dt * 6);
        layoutCloths();
        if (S.rubbing > 0) { S.rubbing -= dt; if (S.rubbing <= 0 && Math.abs(S.q) > 0.5 && held.position.y < 0.05) status(`${S.type === 'glass' ? '玻璃棒带上了<b>正</b>电荷，丝绸带上了等量的负电荷' : '橡胶棒带上了<b>负</b>电荷，毛皮带上了等量的正电荷'}。现在拖着棒过去：靠近左边<b>吊着的玻璃棒</b>的一端，或者碰一下<b>验电器</b>顶上的金属球。`); }
        const T = tip();
        // ---- 吊棒的转动：两端各带一半电荷，受手中棒尖附近电荷的力 ----
        {
          // 手中棒上的电荷：摩擦过的那一段（棒尖起 8 cm），分成 4 个点
          const srcs = [0.006, 0.026, 0.046, 0.066].map((d) => T.clone().add(new THREE.Vector3(d, 0, 0)));
          const dirOf = (a) => new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
          let torque = 0;
          const dir = dirOf(S.ang);
          for (const sgn of [1, -1]) {
            const r = dir.clone().multiplyScalar(((sgn * ROD) / 2) * 0.85);
            const e = PH.clone().add(r);
            for (const src of srcs) {
              const d = e.clone().sub(src), dist = Math.max(0.012, d.length());
              const F = d.normalize().multiplyScalar(((S.q / 4) * (S.hangQ / 2) * 1.4e-4) / (dist * dist));
              torque += r.z * F.x - r.x * F.z;
            }
          }
          const prev = S.ang;
          S.av += (torque * 900 - S.av * 0.9) * dt;      // 阻尼小一些：吊棒会晃一晃再停
          S.ang += S.av * dt;
          // 两根棒不能互相穿过：吊棒碰到手中的棒就停在那里（被吸过来时会贴住）
          const gap = (a) => {
            const dd = dirOf(a); let m = 9;
            for (let i = -5; i <= 5; i++) {
              const q = PH.clone().add(dd.clone().multiplyScalar((i / 5) * (ROD / 2)));
              const px = clamp(q.x, T.x, T.x + ROD);
              m = Math.min(m, Math.hypot(q.x - px, q.y - T.y, q.z - T.z));
            }
            return m;
          };
          if (gap(S.ang) < 0.0085 && gap(S.ang) < gap(prev)) {
            S.ang = gap(prev) >= 0.0085 ? prev : [prev + 0.03, prev - 0.03].sort((x, y) => gap(y) - gap(x))[0];
            S.av = 0;
            if (Math.abs(S.q) > 0.4 && S.q * S.hangQ < 0 && !S.seen.has('attract')) { S.seen.add('attract'); W?.goal.done('attract'); status('吊着的玻璃棒被<b>吸过来</b>，贴到了手里的橡胶棒上：它们带<b>异种</b>电荷，互相吸引。'); }
          }
          const src = srcs[0];
          hang.rotation.y = S.ang;
          const near = Math.min(...[1, -1].map((sg) => PH.clone().add(dir.clone().multiplyScalar((sg * ROD) / 2)).distanceTo(src)));
          if (near < 0.06 && Math.abs(S.av) > 0.25 && Math.abs(S.q) > 0.4) {
            const rep = S.q * S.hangQ > 0, key = rep ? 'repel' : 'attract';
            if (!S.seen.has(key)) { S.seen.add(key); W?.goal.done(key); status(rep ? '吊着的玻璃棒被<b>推开</b>了：两根用丝绸摩擦过的玻璃棒带<b>同种</b>电荷，互相排斥。再换橡胶棒（用毛皮摩擦）试试。' : '吊着的玻璃棒被<b>吸过来</b>了：毛皮摩擦过的橡胶棒和丝绸摩擦过的玻璃棒带<b>异种</b>电荷，互相吸引。'); }
          }
          const [e1, e2] = [1, -1].map((sg) => PH.clone().add(dir.clone().multiplyScalar(((sg * ROD) / 2) * 0.9)));
          hangMarks.visible = S.show; hangMarks.show(S.hangQ, e1, e2);
          S.nearH = near;
        }
        // ---- 验电器：接触转移电荷；靠近感应 ----
        {
          const db = T.distanceTo(ballPos());
          const touch = db < 0.0135;
          if (touch && !S.touching) {
            const tot = S.q + S.Qe, before = S.Qe;
            S.Qe = tot * 0.4; S.q = tot * 0.6;
            if (Math.abs(tot) > 0.1) { crackle(0.08, 0.02); S.spark = 1; }
            W?.out.set('q', qText());
            if (Math.abs(S.Qe) > 0.2) { if (!S.seen.has('open')) { S.askAway = true; S.hideLeaf = true; } status(Math.abs(before) > 0.2 && Math.sign(before) !== Math.sign(tot) ? '验电器原来带的电荷和棒上的异种电荷相互抵消了一部分，箔片先合拢，又张开了。' : '棒碰到了金属球，金属箔张开了。现在<b>把棒拿开</b>，看着金属箔。'); }
            else if (Math.abs(before) > 0.2) status('两种电荷相互抵消，金属箔合拢了。');
            else if (Math.abs(tot) <= 0.1) status('这根棒不带电，验电器的金属箔不动。先去摩擦一下。');
          }
          S.touching = touch;
          const ind = touch ? 0 : S.q * Math.min(0.25, Math.pow(0.02 / Math.max(0.014, db), 3)) * 0.4;     // 感应：比接触后小得多
          const leafQ = S.Qe + ind;
          const target = Math.min(0.85, 0.5 * Math.sqrt(Math.max(0, Math.abs(leafQ) - 0.02)));
          for (const l of leaves) l.rotation.z += (l.userData.s * target - l.rotation.z) * Math.min(1, dt * 6);
          W?.out.set('e', S.hideLeaf ? '看验电器下面的金属箔' : target < 0.05 ? '合拢' : `张开（约 ${Math.round((target * 2 * 180) / Math.PI)}°）`);
          if (Math.abs(S.Qe) < 0.05 && target > 0.08 && !touch) S.sawNear = true;         // 只靠近、没碰：也会张开一点（感应）
          // 碰过球、把棒拿开以后，让学生自己说箔片怎样
          if (S.askAway && db > 0.05 && Math.abs(S.Qe) > 0.2) { S.askAway = false; W?.ask(); }
          const bp = ballPos(), lb = new THREE.Vector3(PE.x, 0.047, PE.z);
          ballMarks.visible = S.show; leafMarks.forEach((m) => (m.visible = S.show));
          ballMarks.show(touch ? 0 : -ind * 0.8 + S.Qe * 0.3, bp.clone().add(new THREE.Vector3(-0.006, 0.006, 0)), bp.clone().add(new THREE.Vector3(0.006, 0.006, 0)), new THREE.Vector3(0, 0.004, 0.006));
          leaves.forEach((l, i) => { const a = l.rotation.z; leafMarks[i].show(leafQ * 0.5, lb.clone().add(new THREE.Vector3(Math.sin(a) * 0.01, -Math.cos(a) * 0.01, 0.004)), lb.clone().add(new THREE.Vector3(Math.sin(a) * 0.024, -Math.cos(a) * 0.024, 0.004)), new THREE.Vector3(l.userData.s * 0.004, 0, 0)); });
          // 提示：带了电、棒尖离哪个近就提示哪个
          if (Math.abs(S.q) > 0.4 && db < 0.09 && db > 0.03 && db < S.nearH) hint('碰这里（金属球）', PE.x, H + 0.03, 0);
          else if (Math.abs(S.q) > 0.4 && S.nearH < 0.1 && S.nearH > 0.05) hint('棒尖靠近这一端', PH.x + 0.05, H + 0.03, 0);
          else hint('');
        }
        // 火花、手指
        S.spark = Math.max(0, S.spark - dt * 4);
        spark.position.copy(ballPos()); spark.material.opacity = S.spark;
        S.finger = Math.max(0, S.finger - dt * 1.6);
        finger.visible = S.finger > 0;
        if (finger.visible) { const k = Math.sin(S.finger * Math.PI); finger.position.set(PE.x - 0.006, H + 0.008 + 0.03 * (1 - k), 0.004); finger.rotation.z = 0.5; }
        // 电荷记号：棒上（摩擦过的那一段）、布上
        heldMarks.visible = S.show;
        heldMarks.show(S.q, held.position.clone().add(new THREE.Vector3(0.006, 0, 0)), held.position.clone().add(new THREE.Vector3(ROD * 0.65, 0, 0)));
        for (const k of Object.keys(cloths)) { clothMarks[k].visible = S.show; const c = cloths[k].position; clothMarks[k].show(S.cq[k] * 0.6, c.clone().add(new THREE.Vector3(-0.02, 0, 0)), c.clone().add(new THREE.Vector3(0.02, 0, 0)), new THREE.Vector3(0, 0.01, 0)); }
      },
      debug: { S, held },
    };
  },
};
