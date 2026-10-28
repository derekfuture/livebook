// 图9.3-3 托里拆利实验（课本是录像演示）。长约 1 m、一端封闭的玻璃管灌满水银，堵住管口倒插在水银槽中，放开手指，
// 管内水银面下降到一定高度就不再下降：管内外水银面的高度差约 760 mm；管内水银面上方是真空。
// 可以做：倾斜玻璃管（竖直高度差不变，水银柱变长）；把管往下按 / 往上提（高度差不变）；到高山上去（大气压变小，高度差变小）；
// 管顶破一个小孔（空气进去，水银柱落回槽中）；换成水（要 10 m 多高，1 m 的管子装不下——管里一直是满的）。
// 场景按 1 m = 0.3 单位缩小；刻度尺按真实毫米标注。大气压 p = p₀·e^(−海拔/8400 m)。
import * as THREE from 'three';
import { seg, slider, buttons, goals, note, readout } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { draggable, clamp } from './kit/interact.js';
import { paint, inked, hull } from '../live/ink.js';

const K = 0.3, TL = 1.0;                 // 场景缩放、玻璃管长（m）
const TX = 0, TROUGH = 0.03;             // 管的位置、槽内水银面高度（场景单位）
const DIP = 0.04;                        // 管口插入水银面以下的深度（m）
const ALT = [{ label: '海平面附近', h: 0 }, { label: '山上（海拔 1000 m）', h: 1000 }, { label: '高原（海拔 3000 m）', h: 3000 }];

export default {
  id: 'torricelli',
  fig: '图9.3-3',
  title: '托里拆利实验',
  stampText: '观察',
  predict: {
    q: '管内外水银面的高度差约 760 mm。<br>把玻璃管<b>倾斜</b>，管内外水银面的高度差会——',
    hint: '课本第 53 页「演示」',
    options: ['变大', '变小', '不变'],
    answer: 2,
  },
  conclusion: {
    crops: [{ page: 57, rect: [62, 578, 360, 664] }, { page: 58, rect: [160, 50, 456, 160] }],
    quote: '实验中玻璃管内水银面的上方是真空，管外水银面的上方是空气，因此，是大气压支持管内这段水银柱不会落下，大气压的数值等于这段水银柱产生的压强。……通常把这样大小的大气压叫作标准大气压。',
    formula: '<i>p</i><sub>0</sub> = <i>ρ</i><sub>水银</sub><i>gh</i> ≈ 13.6×10³ kg/m³ × 9.8 N/kg × 0.76 m ≈ 1.013×10⁵ Pa',
    why: '水银柱产生的压强只跟它的竖直高度有关（p = ρgh），所以倾斜玻璃管、把管往下按或往上提、换粗一些的管，只要外面的大气压不变，竖直高度差都是 760 mm；倾斜时水银柱沿管子变长了，管内真空部分变短。到了高山上，大气压变小，能支持的水银柱也变低。如果管顶破了，空气进入管内，管内外都受大气压，水银柱就落下来和槽中液面相平。水的密度只有水银的 1/13.6，大气压能支持约 10 m 高的水柱，所以用水做要 10 多米长的管子。',
    src: '课本第 53–54 页 · 第九章 第3节 大气压强',
  },

  create({ tag }) {
    const group = new THREE.Group();
    // 水银槽
    const trough = new THREE.Group();
    const tw = 0.12, td = 0.07;
    const tray = inked(new THREE.Mesh(new THREE.BoxGeometry(tw, 0.04, td), [paint(0xb8bec8), paint(0xb8bec8), new THREE.MeshBasicMaterial({ visible: false }), paint(0xb8bec8), paint(0xb8bec8), paint(0xb8bec8)]), { width: 1.2 });
    tray.position.y = 0.02;
    const hg = new THREE.Mesh(new THREE.BoxGeometry(tw - 0.006, TROUGH - 0.004, td - 0.006), paint(0xc3c8d0, { unique: true }));
    hg.position.y = 0.002 + (TROUGH - 0.004) / 2;
    trough.add(tray, hg);
    group.add(trough);
    // 玻璃管（可以绕管口所在的点倾斜）
    const pivot = new THREE.Group();
    pivot.position.set(TX, TROUGH - DIP * K, 0);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, TL * K, 16, 1, true), paint(0xd6ecf5, { unique: true, transparent: true, opacity: 0.35, depthWrite: false }));
    glass.position.y = (TL * K) / 2;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), glass.material);
    cap.position.y = TL * K;
    const merc = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 1, 14), paint(0xc3c8d0, { unique: true }));
    merc.geometry.translate(0, 0.5, 0);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 1, 14), paint(0x9fd3ec, { unique: true, transparent: true, opacity: 0.7 }));
    water.geometry.translate(0, 0.5, 0);
    pivot.add(glass, cap, merc, water);
    const finger = hull(new THREE.Mesh(new THREE.SphereGeometry(0.008, 14, 10), paint(0xf1c7a2)), 0.0012);
    group.add(pivot, finger);
    // 刻度尺：0 在槽内水银面，向上到 1000 mm
    const rulerTex = canvasTex(160, 1600, (c, w, h) => {
      c.fillStyle = '#f5f1e2'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#23293a'; c.fillStyle = '#23293a'; c.font = 'bold 30px sans-serif'; c.textAlign = 'left';
      for (let mm = 0; mm <= 1000; mm += 10) {
        const y = h - (mm / 1000) * (h - 20) - 10, major = mm % 100 === 0, mid = mm % 50 === 0;
        c.lineWidth = major ? 3 : 1.5;
        c.beginPath(); c.moveTo(0, y); c.lineTo(major ? 50 : mid ? 36 : 22, y); c.stroke();
        if (major) c.fillText(String(mm), 58, y + 10);
      }
      c.fillText('mm', 58, 34);
    });
    const ruler = inked(new THREE.Mesh(new THREE.BoxGeometry(0.03, TL * K + 0.006, 0.004), [paint(0xe8e2cf), paint(0xe8e2cf), paint(0xe8e2cf), paint(0xe8e2cf), new THREE.MeshBasicMaterial({ map: rulerTex }), paint(0xe8e2cf)]), { width: 1 });
    ruler.position.set(TX - 0.028, TROUGH + (TL * K) / 2, -0.004);
    group.add(ruler);
    const vTag = tag('', 'pill'), hTag = tag('', 'pill');
    const level = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineDashedMaterial({ color: 0x2a3040, dashSize: 0.005, gapSize: 0.004 }));
    group.add(level);

    // step: full（灌满、手指堵住、竖直朝上）→ inverted（倒插、手指还堵着）→ open（放开手指）
    const S = { step: 'inverted', tilt: 0, lift: 0, alt: 0, hole: false, liquid: 'hg', col: TL, seen: new Set(), readOK: false };
    let W = null, ask = () => {};
    const p = () => Math.exp(-ALT[S.alt].h / 8400);                       // 大气压 / 标准大气压
    const hTarget = () => (S.hole ? 0 : (S.liquid === 'hg' ? 0.76 : 10.3) * p());   // 能支持的竖直高度（m）
    const layout = () => {
      const th = (S.tilt * Math.PI) / 180;
      const dip = DIP - S.lift;                                         // 管口在槽内液面下的深度（m）
      pivot.position.set(TX + 0, TROUGH - dip * K, 0);
      pivot.rotation.z = -th;
      // 水银柱：沿管的长度 = (竖直高度 + 插入深度) / cosθ，最多到管顶
      const along = Math.min(TL, (S.col + dip) / Math.cos(th));
      const m = S.liquid === 'hg' ? merc : water;
      merc.visible = S.liquid === 'hg'; water.visible = S.liquid === 'water';
      m.scale.y = Math.max(0.001, along * K);
      const vert = along * Math.cos(th) - dip;                          // 管内液面比槽内液面高多少（m）
      S.vert = vert;
      const topLocal = new THREE.Vector3(0, along * K, 0).applyEuler(pivot.rotation).add(pivot.position);
      level.geometry.setFromPoints([topLocal, new THREE.Vector3(TX - 0.028, topLocal.y, 0)]);
      level.computeLineDistances();
      level.visible = S.step === 'open';
      finger.visible = S.step !== 'open';
      finger.position.copy(pivot.position).add(new THREE.Vector3(0, -0.004, 0.006));
      vTag.loc(group, TX + 0.03, TROUGH + TL * K * 0.92, 0).text(S.step === 'open' && !S.hole && along < TL - 0.002 ? '真空' : '');
      hTag.loc(group, TX + 0.07, TROUGH + 0.01, 0.03).text(S.liquid === 'hg' ? '水银槽' : '水槽');
    };
    layout();

    // 直接抓住玻璃管：左右拖让它倾斜，上下拖把它提起 / 按下（管口不离开液面）
    const tubePick = new THREE.Mesh(new THREE.BoxGeometry(0.03, TL * K, 0.03), new THREE.MeshBasicMaterial({ visible: false }));
    tubePick.position.y = (TL * K) / 2; pivot.add(tubePick);
    let g0 = null;
    const pointer = draggable(group, [{ obj: tubePick, plane: 'xy', offset: 0, hint: '左右拖：倾斜玻璃管；上下拖：提起 / 按下',
      onStart: (p) => { g0 = p ? { p: p.clone(), tilt: S.tilt, lift: S.lift } : null; S.drop?.(); },
      onDrag: (p) => {
        if (!g0) return;
        S.tilt = Math.round(clamp(g0.tilt + (p.x - g0.p.x) * 400, 0, 60));
        S.lift = Math.round(clamp(g0.lift + (p.y - g0.p.y) / K, -0.02, 0.03) * 100) / 100;
        S.sliders?.tilt.set(S.tilt); S.sliders?.lift.set(Math.round(S.lift * 100));
        if (S.step === 'open') { if (S.tilt > 20) S.seen.add('tilt'); if (Math.abs(S.lift) > 0.005) S.seen.add('lift'); }
      } }], { tip: tag('', 'pill') });

    return {
      group,
      pointer,
      size: { w: 0.24, d: 0.1, h: 0.34 },
      view: { elev: 8, azim: 0, lookY: 0.5, margin: 1.1 },
      mount(ui) {
        const tilt = slider('倾斜玻璃管', { min: 0, max: 60, value: 0, fmt: (v) => (v ? `${v}°` : '竖直'), onInput: (v) => { S.tilt = v; S.drop?.(); if (v > 20 && S.step === 'open') S.seen.add('tilt'); } });
        const lift = slider('把玻璃管往上提 / 往下按（管口不离开液面）', { min: -2, max: 3, value: 0, fmt: (v) => (v === 0 ? '原位' : v > 0 ? `提起 ${v} cm` : `按下 ${-v} cm`), onInput: (v) => { S.lift = v / 100; S.drop?.(); if (v && S.step === 'open') S.seen.add('lift'); } });
        const alt = seg('在哪里做', ALT.map((a) => a.label), (_, k) => { S.alt = k; S.drop?.(); if (k && S.step === 'open') S.seen.add('alt'); });
        const choices = buttons([0, 1, 2].map((j) => ({ text: '', ghost: true, onClick: () => answer(j) })));
        choices.el.hidden = true;
        const out = readout([{ key: 'p', label: '外面的大气压', span: true }]);
        let cur = null;
        S.drop = () => { if (cur) { cur = null; choices.el.hidden = true; ui.status('条件变了，刚才的读数题作废。等液面稳定后，再点“读高度差…”。'); } };
        S.sliders = { tilt, lift };
        ask = () => {
          if (S.step !== 'open' || S.liquid !== 'hg' || S.hole) return ui.status('先放开手指，等水银柱稳定下来。');
          if (!S.stable) return ui.status('水银柱还在动，等它<b>稳定</b>了再读。');
          const v = Math.round((S.vert * 1000) / 10) * 10;
          const len = Math.round((S.vert + DIP - S.lift) / Math.cos((S.tilt * Math.PI) / 180) * 100) * 10;   // 沿管子量的长度（常见的错）
          const opts = [...new Set([v, S.tilt > 10 ? len : v + 50, v - 100])].slice(0, 3).sort(() => Math.random() - 0.5);
          cur = { v, opts };
          choices.btns.forEach((b, j) => { b.hidden = j >= opts.length; b.textContent = `${opts[j]} mm`; });
          choices.el.hidden = false;
          ui.status('看刻度尺：<b>管内外水银面的高度差</b>是多少？（量竖直的高度——从槽内水银面到管内水银面那条虚线）');
        };
        const answer = (j) => {
          if (!cur) return;
          if (cur.opts[j] !== cur.v) return ui.status(S.tilt ? '高度差要量<b>竖直</b>的高度，不是沿着倾斜的管子量的长度。看虚线对着刻度尺的哪里。' : '再看一看：虚线对着刻度尺的哪一格？');
          choices.el.hidden = true;
          W.goal.done(S.tilt > 10 ? 'readTilt' : 'read');
          ui.status(`对，高度差约 ${cur.v} mm。${S.tilt > 10 ? '倾斜后，水银柱沿管子变长了，竖直高度却不变。' : ''}`);
          cur = null;
        };
        const steps = buttons([
          { text: '放开手指', onClick: () => { if (S.step === 'open') return; S.step = 'open'; ui.status('放开手指：管内水银面下降……'); } },
          { text: '重做（灌满水银、堵住、倒插）', ghost: true, onClick: () => { S.step = 'inverted'; S.col = TL; S.hole = false; ui.status('玻璃管灌满了水银，手指堵住管口，倒插在槽中。'); } },
          { text: '读高度差…', onClick: () => ask() },
        ]);
        const what = buttons([
          { text: '管顶破一个小孔', ghost: true, onClick: () => { if (S.step !== 'open') return ui.status('先放开手指。'); S.hole = true; W.goal.done('hole'); } },
          { text: '换成水来做', ghost: true, onClick: () => { S.liquid = S.liquid === 'hg' ? 'water' : 'hg'; S.step = 'inverted'; S.col = TL; S.hole = false; what.btns[1].textContent = S.liquid === 'hg' ? '换成水来做' : '换回水银'; hg.material.color.setHex(S.liquid === 'hg' ? 0xc9ced6 : 0x9fd3ec); ui.status(S.liquid === 'hg' ? '换回了水银。' : '玻璃管里灌满水，倒插在水槽中。放开手指看看。'); } },
        ]);
        ui.controls.append(steps.el, choices.el, tilt.el, lift.el, alt.el, what.el, out.el, note('刻度尺的 0 对着槽内的水银面。场景是按比例缩小的，刻度按真实的毫米标。'));
        W = { out, status: (m) => ui.status(m), goal: goals(ui, [['release', '放开手指，看管内水银面降到多高'], ['read', '读出管内外水银面的高度差'], ['readTilt', '把玻璃管倾斜，再读一次高度差'], ['lift', '把玻璃管往上提或往下按'], ['alt', '到高山上去做'], ['hole', '想一想：管顶破一个小孔会怎样']]) };
        ui.status('长约 1 m 的玻璃管里灌满了水银，手指堵住管口，倒插在水银槽中。点“放开手指”。');
      },
      update(dt) {
        if (S.step === 'open') {
          const t = hTarget(), dip = DIP - S.lift, maxCol = TL * Math.cos((S.tilt * Math.PI) / 180) - dip;
          const goal = Math.min(t, maxCol);
          S.col += (goal - S.col) * Math.min(1, dt * 3);
          S.stable = Math.abs(S.col - goal) < 0.002;
          if (Math.abs(S.col - goal) < 0.002 && W) {
            if (!S.seen.has('release') && S.liquid === 'hg' && !S.hole) { S.seen.add('release'); W.goal.done('release'); W.status('管内水银面下降到一定高度就不再下降了。管内水银面上方是<b>真空</b>，是外面的大气压托住了这段水银柱。读一读高度差。'); }
            if (S.seen.has('tilt') && !S.saidTilt) { S.saidTilt = true; W.status(maxCol < t ? '管子倾斜得太厉害，管顶的竖直高度已经不到 760 mm，水银就充满了整根管子。' : '倾斜后，管内水银柱变长了，但<b>竖直高度差</b>没有变。读一读。'); }
            if (S.seen.has('lift') && !S.saidLift) { S.saidLift = true; W.goal.done('lift'); W.status('把管子往上提或往下按：管子动了，可管内水银面到槽里水银面的竖直高度没有变——<b>高度差不变</b>（变的只是管内水银面上方真空部分的长短）。'); }
            if (S.seen.has('alt') && !S.saidAlt) { S.saidAlt = true; W.goal.done('alt'); W.status(`海拔 ${ALT[S.alt].h} m：大气压变小了，高度差约 ${Math.round(S.vert * 1000)} mm。海拔越高，大气压越低。`); }
            if (S.hole && !S.saidHole) { S.saidHole = true; W.status('管顶破了，空气进入管内，管内外的水银面都受到大气压——水银柱落下来，和槽中的水银面<b>相平</b>。'); }
            if (S.liquid === 'water' && !S.saidWater) { S.saidWater = true; W.status('换成水：放开手指，水一点也不下降，管里一直是满的。大气压能托住约 10 m 高的水柱，1 m 的管子太短了。'); }
          }
        } else S.col = TL;
        layout();
        W?.out.set('p', `${(1.013 * p()).toFixed(2)}×10⁵ Pa${S.alt ? '（比海平面低）' : '（约 1 个标准大气压）'}`);
      },
      debug: { S },
    };
  },
};
