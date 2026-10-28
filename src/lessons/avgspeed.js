// 图1.4-2 测量小车运动的平均速度：斜面、小车、金属片、刻度尺、停表。
// 学生自己做：点小车释放它（停表同时开始走），听到小车撞上金属片“啪”的一声，自己按停表；读刻度尺上的路程，算平均速度。
// 直接操作：点小车释放 / 拖小车放到斜面顶端或中点；拖金属片到斜面底端或中点；点停表停止 / 清零。面板也有同样的按钮。
// 物理：小车沿斜面做加速运动 a = g(sinθ − μcosθ)。人按停表的反应时间是真实的——就是你自己的反应。
import * as THREE from 'three';
import { seg, buttons, readout, table, goals, note } from './kit/ui.js';
import { woodBlock, rulerMesh, canvasTex } from './kit/props.js';
import { draggable, clamp } from './kit/interact.js';
import { audio } from './kit/audio.js';
import { paint, inked, hull } from '../live/ink.js';

const G0 = 9.8, LEN = 0.8, TH = (4 * Math.PI) / 180, MU = 0.01;
const ACC = G0 * (Math.sin(TH) - MU * Math.cos(TH));
const SCALE = 0.5;   // 模型：1 m 斜面画成 0.5 m（刻度尺按真实厘米标）
const CAR = 0.04;    // 小车长（真实的 4 cm 画成 2 cm）
const BAD_LATE = 0.5; // 听到“啪”以后超过 0.5 s 才按停表，这次计时就算不准

function clack() {
  const a = audio(), n = Math.floor(a.sampleRate * 0.05), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4);
  const src = a.createBufferSource(), g = a.createGain(); g.gain.value = 0.25;
  src.buffer = buf; src.connect(g).connect(a.destination); src.start();
}

export default {
  id: 'avgspeed',
  fig: '图1.4-2',
  title: '测量小车运动的平均速度',
  stampText: '测量',
  predict: {
    q: '小车从斜面顶端由静止滑下。<br>它在上半段路程和下半段路程的平均速度，哪个大？',
    hint: '课本第 25–26 页「实验」',
    options: ['上半段大', '下半段大', '一样大'],
    answer: 1,
  },
  conclusion: {
    quote: '在变速直线运动中，常用平均速度 v = s/t 来粗略地描述运动的快慢。',
    why: '用刻度尺测路程 <i>s</i>、用停表测时间 <i>t</i>，由 <i>v</i> = <i>s</i>/<i>t</i> 算出平均速度。小车沿斜面下滑时越来越快：下半段的平均速度 <i>v</i><sub>3</sub> = (<i>s</i><sub>1</sub> − <i>s</i><sub>2</sub>)/(<i>t</i><sub>1</sub> − <i>t</i><sub>2</sub>) 大于上半段的 <i>v</i><sub>2</sub>。按停表总有反应时间，所以每次测得的时间略有不同，可以多测几次取平均；斜面坡度小一些，小车运动的时间长，时间测得更准。如果把小车从斜面中部释放，测出的就不是“下半段”的平均速度——那时小车在中点的速度是零。',
    src: '课本第 25–26 页 · 第一章 第4节 速度的测量',
  },

  create({ tag, look, back }) {
    const group = new THREE.Group();
    const L = LEN * SCALE;
    const VIS = TH * 3;                      // 画面里斜度放大一些，看得清
    const topY = Math.sin(VIS) * (L + 0.04);
    const incline = new THREE.Group();
    incline.rotation.z = -VIS;
    incline.position.set(-L / 2, topY + 0.008, 0);
    group.add(incline);
    const board = woodBlock(L + 0.04, 0.008, 0.07);
    board.position.set(L / 2, -0.004, 0);
    incline.add(board);
    // 刻度尺：0 刻度在斜面顶端（小车车头开始的位置），按真实厘米标到 80 cm
    const ruler = rulerMesh({ length: L, width: 0.016, thick: 0.002, divisions: 80, every: 10, labelEvery: 10 });
    ruler.position.set(L / 2, 0.0012, 0.03);
    incline.add(ruler);
    tag('cm', 'pill').loc(incline, L + 0.012, 0.004, 0.03);
    const block = woodBlock(0.04, topY, 0.07, { color: 0xc99a64 });
    block.position.set(-L / 2 + 0.01, topY / 2, 0);
    group.add(block);
    const plate = inked(new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.03, 0.06), paint(0xb0b7c3)));
    incline.add(plate);
    const cart = new THREE.Group();
    const cb = inked(new THREE.Mesh(new THREE.BoxGeometry(CAR * SCALE * 2, 0.012, 0.03), paint(0x2f7fd8)));
    cb.position.set(-CAR * SCALE, 0.012, 0);      // 车头在 cart 的原点
    cart.add(cb);
    for (const [x, z] of [[-0.033, 0.016], [-0.007, 0.016], [-0.033, -0.016], [-0.007, -0.016]]) {
      const w = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.004, 14), paint(0x23262e)), 0.001);
      w.rotation.x = Math.PI / 2; w.position.set(x, 0.005, z);
      cart.add(w);
    }
    incline.add(cart);
    // 停表（立在桌上）：表盘 + 数字，点它停止
    const watch = new THREE.Group();
    const wb = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 32), paint(0xe9edf2)), 0.0012);
    wb.rotation.x = Math.PI / 2;
    const face = canvasTex(256, 256, () => {});
    const disp = new THREE.Mesh(new THREE.CircleGeometry(0.026, 32), new THREE.MeshBasicMaterial({ map: face }));
    disp.position.z = 0.0055;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.01, 12), paint(0x5b6272)); crown.position.y = 0.035;
    watch.add(wb, disp, crown);
    watch.position.set(0.02, 0.035, 0.085);
    group.add(watch);
    let shownT = null;
    const drawWatch = (t, run) => {
      const key = `${t.toFixed(1)}${run}`; if (key === shownT) return; shownT = key;
      const g = face.image.getContext('2d');
      g.fillStyle = '#fbfbf7'; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = '#1d2433'; g.lineWidth = 4;
      for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2; const r0 = i % 5 ? 112 : 100; g.beginPath(); g.moveTo(128 + Math.sin(a) * r0, 128 - Math.cos(a) * r0); g.lineTo(128 + Math.sin(a) * 122, 128 - Math.cos(a) * 122); g.stroke(); }
      const a = ((t % 30) / 30) * Math.PI * 2;             // 秒针 30 s 一圈
      g.strokeStyle = '#d23b2b'; g.lineWidth = 5; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100); g.stroke();
      g.fillStyle = '#1d2433'; g.font = 'bold 44px Menlo, monospace'; g.textAlign = 'center'; g.fillText(t.toFixed(1), 128, 190);
      g.font = '22px sans-serif'; g.fillText(run ? '计时中…' : 's', 128, 222);
      face.needsUpdate = true;
    };
    drawWatch(0, false);
    tag('停表（点它）', 'pill').loc(group, 0.02, 0.0, 0.11);

    const S = { plate: 'end', start: 0, s: 0, v: 0, t: 0, moving: false, timing: false, watch: 0, data: {}, hit: false, rows: [] };
    let G = null;
    const plateS = () => (S.plate === 'end' ? LEN : LEN / 2);
    const layout = () => {
      plate.position.set(plateS() * SCALE + 0.002, 0.015, 0);
      cart.position.set(S.s * SCALE, 0, 0);
      drawWatch(S.watch, S.timing);
    };
    layout();
    const status = (m) => G?.ui.status(m);
    const release = () => {
      if (S.moving || S.timing) return;
      S.s = S.start; S.v = 0; S.t = 0; S.watch = 0; S.moving = true; S.timing = true; S.hit = false; G?.ask?.hide();
      status('小车下滑了，停表开始走……听到“啪”的一声（小车撞上金属片）就<b>点停表</b>。');
    };
    const stopWatch = () => {
      if (!S.timing) { if (!S.moving) { S.watch = 0; S.s = S.start; layout(); status('停表清零了，小车放回原处。'); } return; }
      S.timing = false;
      if (!S.hit) { status(`小车还没到金属片你就按了停表（${S.watch.toFixed(1)} s），这次不算。等它停下，点停表清零再来。`); return; }
      const late = S.watch - S.hitT;
      G?.record({ s: plateS() - S.start, t: +S.watch.toFixed(1), late });
    };
    const pointer = draggable(incline, [
      { obj: cb, plane: 'xy', offset: 0, hint: () => (S.moving ? '' : '点一下：释放小车；左右拖：放到顶端或中点'), keepOffset: false,
        onStart: (p) => { S.dragFrom = p?.x; S.dragged = false; },
        onDrag: (p) => { if (S.moving || S.timing) return; S.dragged = true; const x = clamp(p.x / SCALE, 0, LEN * 0.6); S.start = x > LEN / 4 ? LEN / 2 : 0; S.s = S.start; layout(); },
        onEnd: (moved) => { if (!moved || !S.dragged) release(); else status(S.start ? '小车放在了斜面<b>中点</b>（车头对着 40 cm）。' : '小车放在了斜面<b>顶端</b>（车头对着 0）。'); } },
      { obj: plate, plane: 'xy', offset: 0, hint: '左右拖：放到斜面底端或中点', onDrag: (p) => { if (S.moving) return; S.plate = p.x / SCALE < LEN * 0.75 ? 'mid' : 'end'; layout(); } },
    ], { tip: tag('', 'pill'), taps: [{ obj: ruler, hint: '点一下：凑近看刻度尺', onTap: () => { const x = plateS() * SCALE; const w = incline.localToWorld(new THREE.Vector3(x, 0, 0.03)); const l = group.worldToLocal(w); look([l.x - 0.03, l.y, l.z], [0, 0.6, 0.8], 0.16, () => back()); } }] });
    const watchPick = { down: (ray) => { if (ray.intersectObject(watch, true).length) { stopWatch(); return true; } return pointer.down(ray); }, move: (r) => pointer.move(r), up: (r) => pointer.up(r), items: pointer.items };

    return {
      group,
      size: { w: 0.56, d: 0.14, h: 0.12 },
      view: { elev: 14, azim: -6, lookY: 0.4, margin: 1.02 },
      pointer: watchPick,
      debug: { S },
      mount(ui) {
        const out = readout([{ key: 's', label: '路程（刻度尺）', unit: 'm' }, { key: 't', label: '时间（停表）', unit: 's' }, { key: 'v', label: '平均速度 <i>v</i> = <i>s</i>/<i>t</i>', unit: 'm/s', span: true }]);
        const pl = seg('金属片放在', ['斜面底端（测全程 s₁）', '斜面中点（测上半段 s₂）'], (_, k) => { S.plate = k ? 'mid' : 'end'; layout(); });
        const st = seg('小车从哪里释放', ['斜面顶端', '斜面中点'], (_, k) => { S.start = k ? LEN / 2 : 0; S.s = S.start; layout(); });
        const btn = buttons([{ text: '▶ 释放小车（停表开始走）', onClick: release }, { text: '⏱ 按停表', onClick: stopWatch }]);
        const tb = table(['', '路程 s/m', '时间 t/s', '平均速度 v/(m·s⁻¹)'], { note: '时间是你自己按停表测的；多做几次，每次会略有不同。' });
        const ask = buttons([0, 1, 2].map(() => ({ text: '', ghost: true, onClick: () => {} })));
        ask.el.hidden = true;
        const q = (text, right, wrongs, fmt, hint, ok) => {
          const opts = [...new Set([right, ...wrongs].map((x) => +x.toFixed(2)))].sort(() => Math.random() - 0.5);
          ask.btns.forEach((b, j) => { b.hidden = j >= opts.length; if (b.hidden) return; b.textContent = fmt(opts[j]); b.onclick = () => { if (opts[j] !== +right.toFixed(2)) return ui.status(hint); ask.el.hidden = true; ok(); }; });
          ask.el.hidden = false; ui.status(text);
        };
        G = {
          out, tb, ui, ask: { hide: () => (ask.el.hidden = true) },
          goal: goals(ui, [['full', '测出全程的平均速度 v₁'], ['half', '测出上半段的平均速度 v₂'], ['v3', '算出下半段的平均速度 v₃'], ['mid', '试试从斜面中点释放小车']]),
          record: ({ s, t, late }) => {
            const name = S.start > 0 ? '中点释放' : S.plate === 'end' ? '全程' : '上半段';
            const startCm = S.start * 100, endCm = plateS() * 100;
            // 先读路程：车头从哪个刻度出发、到金属片是哪个刻度
            q(`停表：${t.toFixed(1)} s（你的反应慢了约 ${late.toFixed(2)} s）。看刻度尺：小车车头从 ${startCm.toFixed(0)} cm 出发，金属片在哪个刻度？<b>路程 s = ?</b>`, s, [endCm / 100, s + CAR], (x) => `${x.toFixed(2)} m`,
              `路程是车头从出发到撞上金属片走过的距离：金属片的刻度减去出发时车头的刻度。`, () => {
                out.set('s', s, 2); out.set('t', t, 1);
                const v = s / t;
                q(`s = ${s.toFixed(2)} m，t = ${t.toFixed(1)} s。<b>平均速度 v = ?</b>`, v, [t / s, s * t], (x) => `${x.toFixed(2)} m/s`, 'v = s ÷ t（路程除以时间）。', () => {
                  out.set('v', v, 2);
                  // 停表按晚了很多：照样记下（这是真实的数据），但标出来，后面不能拿它证明规律
                  const bad = late > BAD_LATE;
                  tb.add([name + (bad ? `（停表晚了约 ${late.toFixed(1)} s）` : ''), s.toFixed(2), t.toFixed(1), v.toFixed(2)]);
                  const warn = bad ? `<br>这次你听到“啪”以后约 ${late.toFixed(1)} s 才按停表，<b>时间偏大很多，这组数据不准</b>——最好重测一次。` : '';
                  if (S.start > 0) {
                    const v3 = S.data.v3;
                    G.goal.done('mid');
                    ui.status(`从中点由静止释放：${v.toFixed(2)} m/s。${v3 != null ? `你算出的下半段 v₃ = ${v3.toFixed(2)} m/s。${v < v3 ? '比 v₃ 小：' : '没有比 v₃ 小，可能是计时误差——'}小车在中点是从<b>静止</b>开始的，而全程运动时它经过中点时已经有了速度，所以不能用这种方法测下半段的平均速度。` : '先算出下半段的 v₃，再比一比。'}${warn}`);
                  }
                  else if (S.plate === 'end') { S.data.full = { s, t, bad }; S.data.v3 = null; G.goal.done('full'); ui.status(`全程 v₁ = ${v.toFixed(2)} m/s。再把金属片<b>拖到中点</b>，测上半段。${warn}`); }
                  else { S.data.half = { s, t, bad }; S.data.v3 = null; G.goal.done('half'); ui.status(`上半段 v₂ = ${v.toFixed(2)} m/s。${S.data.full ? '现在可以算下半段了。' : '再测全程。'}${warn}`); }
                });
              });
          },
        };
        const calc = buttons([{ text: '算下半段的平均速度 v₃…', ghost: true, onClick: () => {
          const a = S.data.full, b = S.data.half;
          if (!a || !b) return ui.status('先分别测出全程和上半段。');
          const v3 = (a.s - b.s) / (a.t - b.t);
          if (!(a.t > b.t)) return ui.status('全程的时间应该比上半段长——重新测一次。');
          q(`下半段：s₃ = s₁ − s₂，t₃ = t₁ − t₂。<b>v₃ = ?</b>`, v3, [a.s / a.t, (a.s - b.s) / a.t], (x) => `${x.toFixed(2)} m/s`, '下半段的路程是 s₁ − s₂，时间是 t₁ − t₂。', () => {
            const v2 = b.s / b.t;
            tb.add(['下半段（算出来的）', (a.s - b.s).toFixed(2), (a.t - b.t).toFixed(1), v3.toFixed(2)]);
            S.data.v3 = v3;
            // 比较交给学生：按他自己的数据说话
            const right = v3 > v2 ? 0 : 1;
            q(`v₂（上半段）= ${v2.toFixed(2)} m/s，v₃（下半段）= ${v3.toFixed(2)} m/s。按你的数据——`, right, [1 - right, 2], (x) => ['下半段比上半段快', '下半段不比上半段快', '没法比'][x], '看看两个数哪个大。', () => {
              if (a.bad || b.bad) return ui.status(`可是你的${a.bad ? '全程' : '上半段'}那次停表晚了很多，时间不准，<b>这组数据不能用来下结论</b>。重新测一次${a.bad ? '全程' : '上半段'}（听到“啪”马上按停表），再算 v₃。`);
              if (right) return ui.status('两次计时都不算太离谱，结果却是下半段不比上半段快——可能是按停表时快时慢造成的。多测几次取平均，或者重测一次再算。');
              G.goal.done('v3');
              ui.status(`下半段 v₃ ≈ ${v3.toFixed(2)} m/s 比上半段 v₂ ≈ ${v2.toFixed(2)} m/s 大：小车沿斜面<b>越滑越快</b>，做变速运动。`);
            });
          });
        } }]);
        ui.controls.append(note('<b>点小车</b>释放它（停表同时开始走），听到“啪”就<b>点停表</b>。<b>拖金属片</b>换到中点；<b>拖小车</b>换出发点。面板按钮也可以。'), pl.el, st.el, btn.el, ask.el, out.el, calc.el);
        ui.data.append(tb.el);
        ui.status('金属片在斜面底端。<b>点小车</b>释放它，听到撞击声就<b>点停表</b>。');
      },
      update(dt) {
        if (S.moving) {
          const n = 10, h = dt / n;
          for (let i = 0; i < n && S.moving; i++) {
            S.v += ACC * h; S.s += S.v * h;
            if (S.s >= plateS()) { S.s = plateS(); S.v = 0; S.moving = false; S.hit = true; S.hitT = S.watch + (i + 1) * h; clack(); }
          }
        }
        if (S.timing) S.watch += dt;
        if (S.timing && S.watch > 12) { S.timing = false; status('停表走了好久——听到撞击声要及时按停表。点停表清零再来。'); }
        layout();
      },
    };
  },
};
