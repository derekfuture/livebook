// 图8.1-2 阻力对物体运动的影响：小车从同一斜面顶端由静止滑下，在不同表面上滑行。
// 物理：斜面上 a = g(sinα − μ₀cosα)，水平面上 a = −μg，逐步积分；时间放慢一半便于观察。
import { h } from '../ui/Panel.js';

const G = 9.8;
const ALPHA = (22 * Math.PI) / 180;
const LR = 0.5;            // 斜面长 (m)
const LB = 1.7;            // 水平木板长 (m)
const MU_RAMP = 0.03;      // 斜面（木板）上的阻力系数
const Y0 = 0.02;           // 木板上表面离纸面的高度
const SLOW = 0.5;          // 慢放

const SURFACES = [
  { id: 'towel', name: '毛巾（选做）', mu: 0.5, force: '最大', color: 0x5b8fd6 },
  { id: 'cotton', name: '棉布', mu: 0.25, force: '较大', color: 0xd29a3a },
  { id: 'wood', name: '木板', mu: 0.12, force: '较小', color: 0x8d6a3d },
  { id: 'ideal', name: '理想·光滑', mu: 0, force: '为零', color: 0x2aa58c, imagined: true },
];

function canvasTex(THREE, w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  return t;
}

function surfaceTextures(THREE) {
  const rnd = (a, b) => a + Math.random() * (b - a);
  return {
    wood: canvasTex(THREE, 1024, 128, (g, w, h) => {
      g.fillStyle = '#e6cda6'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) {
        g.strokeStyle = `rgba(150,105,60,${rnd(0.08, 0.22)})`; g.lineWidth = rnd(0.5, 2);
        const y = rnd(0, h); g.beginPath(); g.moveTo(0, y);
        for (let x = 0; x <= w; x += 64) g.lineTo(x, y + Math.sin(x * 0.01 + i) * rnd(1, 4));
        g.stroke();
      }
    }),
    towel: canvasTex(THREE, 512, 128, (g, w, h) => {
      g.fillStyle = '#f5f3ee'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(110,160,220,.55)';
      for (let x = 0; x < w; x += 128) g.fillRect(x + 80, 0, 22, h);
      for (let i = 0; i < 2600; i++) {
        g.strokeStyle = `rgba(120,120,140,${rnd(0.12, 0.3)})`; g.lineWidth = 1;
        g.beginPath(); g.arc(rnd(0, w), rnd(0, h), rnd(1.2, 2.6), 0, Math.PI * 2); g.stroke();
      }
    }, [3.4, 1]),
    cotton: canvasTex(THREE, 256, 64, (g, w, h) => {
      g.fillStyle = '#ecdfc3'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(160,130,80,.28)'; g.lineWidth = 1;
      for (let x = 0; x < w; x += 4) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      g.strokeStyle = 'rgba(160,130,80,.18)';
      for (let y = 0; y < h; y += 4) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    }, [6.8, 1]),
    ideal: canvasTex(THREE, 512, 64, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, '#d7f1f7'); gr.addColorStop(1, '#bfe6f1');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3;
      for (let x = -60; x < w; x += 90) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 40, 0); g.stroke(); }
    }, [3.4, 1]),
  };
}

export default {
  id: 'newton',
  fig: '图8.1-2',
  title: '阻力对物体运动的影响',
  predict: {
    q: '玩滑板车时，不再蹬地，滑板车运动一段时间后就会停下来。<br>你认为运动需要力来维持吗？',
    hint: '课本第 19 页「问题」',
    options: ['需要——没有力推着，物体就会停下来', '不需要——物体停下来，是因为受到了阻力', '说不准，要看物体有多重'],
    answer: 1,
  },
  need: '在棉布、木板上各让小车滑一次（毛巾可以多试）',
  stampText: '推理',
  conclusion: {
    page: 24, rect: [160, 262, 462, 452],     // 课本第 20 页：牛顿第一定律原文 + “通过进一步的推理而概括出来的”
    quote: '一切物体总保持匀速直线运动状态或静止状态，除非作用在它上面的力迫使它改变这种状态。',
    why: '去掉棉布，小车受到的阻力减小，滑行的距离变大。伽利略推测：如果运动的物体受到的阻力为 0，速度就不会减小，物体将以恒定不变的速度永远运动下去。<b>物体的运动并不需要力来维持，运动的物体之所以会停下来，是因为受到了阻力。</b>阻力为 0 的表面现实中做不到——牛顿第一定律是在实验的基础上通过推理得出的。（模型中各表面的阻力系数为示意值。）',
    src: '课本第 19–20 页 · 第八章 第1节 牛顿第一定律',
  },


  create({ THREE, ink, tag }) {
    const { paint, inked, hull, arrow, polyline } = ink;
    const group = new THREE.Group();
    const world = new THREE.Group();
    group.add(world);
    const tex = surfaceTextures(THREE);

    // ---- 斜面、木板、垫块 ----
    const topPt = new THREE.Vector2(-LR * Math.cos(ALPHA), Y0 + LR * Math.sin(ALPHA));
    const dirDown = new THREE.Vector2(Math.cos(ALPHA), -Math.sin(ALPHA));
    const woodMat = new THREE.MeshToonMaterial({ map: tex.wood, gradientMap: paint(0xffffff).gradientMap });
    const board = inked(new THREE.Mesh(new THREE.BoxGeometry(LB, 0.02, 0.18), [woodMat, woodMat, woodMat, woodMat, woodMat, woodMat]), { opacity: 0.8 });
    board.position.set(LB / 2, Y0 - 0.01, 0);
    world.add(board);
    const ramp = inked(new THREE.Mesh(new THREE.BoxGeometry(LR + 0.012, 0.015, 0.18), woodMat), { opacity: 0.8 });
    const mid = topPt.clone().addScaledVector(dirDown, LR / 2);
    const nrm = new THREE.Vector2(Math.sin(ALPHA), Math.cos(ALPHA));
    ramp.position.set(mid.x - nrm.x * 0.0075, mid.y - nrm.y * 0.0075, 0);
    ramp.rotation.z = -ALPHA;
    world.add(ramp);
    const blockH = topPt.y - 0.02;
    const block = inked(new THREE.Mesh(new THREE.BoxGeometry(0.06, blockH, 0.16), paint(0xc99a64)), { opacity: 0.8 });
    block.position.set(topPt.x + 0.045, blockH / 2, 0);
    world.add(block);
    const stopper = inked(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, 0.18), paint(0xb98a55)));
    stopper.position.set(topPt.x - 0.01, topPt.y + 0.012, 0);
    world.add(stopper);

    // 想象中的延长木板（只在“理想”时出现）
    const ghost = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.18),
        paint(0xbfe6f1, { unique: true, transparent: true, opacity: 0.5 - i * 0.11, depthWrite: false }));
      seg.position.set(LB + 0.1 + i * 0.2, Y0 - 0.01, 0);
      ghost.add(seg);
    }
    ghost.add(polyline([new THREE.Vector3(LB, Y0 + 0.001, 0.09), new THREE.Vector3(LB + 0.8, Y0 + 0.001, 0.09)], { dashed: true, dash: 0.03, gap: 0.02, color: 0x2aa58c }));
    ghost.add(polyline([new THREE.Vector3(LB, Y0 + 0.001, -0.09), new THREE.Vector3(LB + 0.8, Y0 + 0.001, -0.09)], { dashed: true, dash: 0.03, gap: 0.02, color: 0x2aa58c }));
    ghost.visible = false;
    world.add(ghost);

    // 铺在木板上的表面（毛巾/棉布/理想），切换时从斜面底端“铺开”
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.172), new THREE.MeshToonMaterial({ gradientMap: paint(0xffffff).gradientMap }));
    cloth.geometry.translate(0.5, 0, 0);
    cloth.rotation.x = -Math.PI / 2;
    cloth.position.set(0.004, Y0 + 0.0018, 0);
    cloth.receiveShadow = true;
    world.add(cloth);
    let clothRoll = 1;

    // ---- 小车 ----
    const cart = new THREE.Group();
    const cartMats = [];
    const cm = (c) => { const m = paint(c, { unique: true, transparent: true }); cartMats.push(m); return m; };
    const body = inked(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.028, 0.055), cm(0xe8704a)));
    body.position.y = 0.026;
    const top = inked(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.04), cm(0xf3a27f)));
    top.position.set(-0.008, 0.046, 0);
    cart.add(body, top);
    const wheels = [];
    const wg = new THREE.CylinderGeometry(0.012, 0.012, 0.01, 18);
    wg.rotateX(Math.PI / 2);
    for (const [x, z] of [[-0.026, 0.031], [0.026, 0.031], [-0.026, -0.031], [0.026, -0.031]]) {
      const w = hull(new THREE.Mesh(wg, cm(0x3b4150)), 0.002);
      w.position.set(x, 0.012, z);
      cart.add(w); wheels.push(w);
    }
    cart.scale.setScalar(1.5);           // 玩具车比例放大一点，看得清
    world.add(cart);

    const vArrow = arrow(0x2f7fd8, 0.0045);
    const fArrow = arrow(ink.MAGENTA, 0.0045);
    world.add(vArrow, fArrow);
    const vTag = tag('<i>v</i>', 'mag big'); vTag.el.style.color = '#2f7fd8';
    const fTag = tag('<i>f</i>', 'mag big');
    const endTag = tag('如果没有阻力……它将一直运动下去 →', 'pill');
    endTag.show(false);

    // ---- 标记旗 ----
    const flags = new Map();
    const placeFlag = (sf, x) => {
      let f = flags.get(sf.id);
      if (!f) {
        const g = new THREE.Group();
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.14, 6), paint(0x3b4150));
        pole.position.y = 0.07;
        const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.055, -0.016), new THREE.Vector2(0, -0.032)]);
        const flag = inked(new THREE.Mesh(new THREE.ShapeGeometry(shape), paint(sf.color, { side: THREE.DoubleSide })), { width: 1 });
        flag.position.y = 0.14;
        g.add(pole, flag);
        world.add(g);
        f = { g, label: tag('', 'pill') };
        flags.set(sf.id, f);
      }
      f.g.position.set(x, Y0, -0.1);
      f.x = x;
      f.label.text(`${sf.name} ${x.toFixed(2)} m`);
    };

    // 把整个场景挪到中心
    world.position.x = -((topPt.x + LB) / 2) + 0.05;

    // ---- 状态 ----
    const S = { surface: SURFACES[0], phase: 'ready', s: 0, v: 0, vBottom: null, fade: 1, goneT: 0, runs: {}, wheelAngle: 0 };
    const listeners = {};

    const setSurface = (sf) => {
      S.surface = sf;
      if (sf.id === 'wood') cloth.visible = false;
      else {
        cloth.visible = true;
        cloth.material.map = tex[sf.id];
        cloth.material.needsUpdate = true;
        clothRoll = 0;
      }
      ghost.visible = sf.id === 'ideal';
      reset();
      listeners.surface?.();
    };
    const reset = () => {
      Object.assign(S, { phase: 'ready', s: 0, v: 0, fade: 1, goneT: 0 });
      endTag.show(false);
      listeners.state?.();
    };
    const release = () => {
      if (S.phase !== 'ready') reset();
      S.phase = 'run';
      listeners.state?.();
    };

    const v3 = new THREE.Vector3();
    const toWorld = (x, y, z) => world.localToWorld(v3.set(x, y, z)).clone();

    const step = (dt) => {
      const sf = S.surface;
      if (S.phase !== 'run') return;
      const n = 8, h = dt / n;
      for (let i = 0; i < n; i++) {
        if (S.s < LR) {
          S.v += G * (Math.sin(ALPHA) - MU_RAMP * Math.cos(ALPHA)) * h;
          S.s += S.v * h;
          if (S.s >= LR) S.vBottom = S.v;
        } else {
          S.v -= sf.mu * G * h;
          if (S.v <= 0) { S.v = 0; S.phase = 'stopped'; break; }
          S.s += S.v * h;
          if (sf.mu === 0 && S.s - LR > LB + 0.45) { S.phase = 'gone'; break; }
        }
      }
      if (S.phase === 'stopped') {
        const d = S.s - LR;
        S.runs[sf.id] = d;
        placeFlag(sf, d);
        listeners.run?.(sf, d);
        listeners.state?.();
      }
      if (S.phase === 'gone') {
        S.runs[sf.id] = Infinity;
        endTag.show(true);
        listeners.run?.(sf, Infinity);
        listeners.state?.();
      }
    };

    const pose = () => {
      let x, y, rot;
      if (S.s < LR) {
        const p = topPt.clone().addScaledVector(dirDown, S.s);
        x = p.x; y = p.y; rot = -ALPHA;
        const k = Math.max(0, (S.s - (LR - 0.04)) / 0.04);
        rot *= 1 - k * 0.5;
      } else {
        x = S.s - LR; y = Y0;
        rot = -ALPHA * 0.5 * Math.max(0, 1 - (S.s - LR) / 0.04);
      }
      cart.position.set(x, y, 0);
      cart.rotation.z = rot;
      S.wheelAngle = -S.s / 0.018;
      for (const w of wheels) w.rotation.z = S.wheelAngle;

      // 在理想表面上冲出木板后慢慢淡出
      const over = Math.max(0, x - LB);
      S.fade = Math.max(0, 1 - over / 0.45);
      for (const m of cartMats) m.opacity = S.fade;

      const moving = S.phase === 'run' && S.v > 0.01;
      const dir = new THREE.Vector3(Math.cos(rot), Math.sin(rot), 0);
      const front = new THREE.Vector3(x, y + 0.045, 0).addScaledVector(dir, 0.065);
      vArrow.set(front, dir.clone().multiplyScalar(moving ? S.v * 0.05 : 0));
      vArrow.visible = !!(moving && S.fade > 0.3);
      vTag.show(vArrow.visible).at(toWorld(...front.clone().addScaledVector(dir, S.v * 0.05 + 0.02).toArray()));
      const onBoard = S.s >= LR && S.surface.mu > 0;
      const back = new THREE.Vector3(x - 0.065, y + 0.008, 0);
      fArrow.set(back, new THREE.Vector3(-1, 0, 0).multiplyScalar(moving && onBoard ? 0.03 + S.surface.mu * 0.12 : 0));
      fArrow.visible = !!(moving && onBoard);
      fTag.show(fArrow.visible).at(toWorld(back.x - 0.05 - S.surface.mu * 0.12, back.y + 0.02, 0));
      for (const f of flags.values()) f.label.at(toWorld(f.x + 0.03, Y0 + 0.175, -0.1));
      endTag.at(toWorld(LB + 0.42, Y0 + 0.12, 0));
    };

    setSurface(SURFACES[1]);   // 课本：先铺棉布
    clothRoll = 1;
    pose();

    return {
      group,
      size: { w: (LB - topPt.x) + 0.15, d: 0.36, h: 0.26 },
      scale: 1.25,
      view: { elev: 24, azim: 0, lookY: 0.3, margin: 1.0 },

      mount(ui) {
        const segBtns = SURFACES.map((sf) => h('button', { onclick: () => setSurface(sf) }, sf.name));
        const relBtn = h('button', { class: 'go', onclick: () => release() }, '▶ 松手，让小车滑下');
        const resetBtn = h('button', { class: 'go ghost', onclick: () => reset() }, '↺ 放回顶端');
        const out = { v: h('b'), s: h('b'), vb: h('b') };
        const quiz = h('div', { class: 'btn-row', hidden: true, style: 'margin-bottom:12px' });
        ui.controls.append(
          quiz,
          h('div', { class: 'ctl' }, h('div', { class: 'ctl-label' }, '水平面上铺什么'), h('div', { class: 'seg' }, segBtns)),
          h('div', { class: 'btn-row' }, relBtn, resetBtn),
          h('p', { class: 'note' }, '小车每次都从斜面顶端由静止滑下（画面慢放 ×0.5）。也可以直接点小车。'),
          h('div', { class: 'readout', style: 'margin-top:12px' },
            h('div', {}, h('span', {}, '速度 v'), out.v),
            h('div', {}, h('span', {}, '在水平面上滑行'), out.s),
            h('div', { style: 'grid-column: span 2' }, h('span', {}, '到达斜面底端时的速度（每次都一样）'), out.vb)));

        const tbody = h('tbody');
        ui.data.append(
          h('table', { class: 'data' }, h('thead', {}, h('tr', {}, h('th', {}, '表面'), h('th', {}, '阻力'), h('th', {}, '滑行距离'))), tbody));
        const chart = h('canvas', { class: 'chart', width: 680, height: 300 });
        ui.data.append(chart);

        const drawChart = () => {
          const g = chart.getContext('2d'), W = chart.width, H = chart.height;
          g.clearRect(0, 0, W, H);
          const base = H - 46, left = 50, bw = 90, gap = (W - left - 30 - bw * 4) / 3, maxD = 1.8;
          g.strokeStyle = '#cfc6b5'; g.lineWidth = 2;
          g.beginPath(); g.moveTo(left, 16); g.lineTo(left, base); g.lineTo(W - 16, base); g.stroke();
          g.fillStyle = '#8b8170'; g.font = '22px PingFang SC, sans-serif';
          g.fillText('距离', 4, 30);
          const tops = [];
          SURFACES.forEach((sf, i) => {
            const x = left + 16 + i * (bw + gap), d = S.runs[sf.id];
            g.fillStyle = '#5e5648'; g.textAlign = 'center';
            g.fillText(sf.name.replace('理想·', ''), x + bw / 2, base + 30);
            if (d == null) return;
            const hgt = d === Infinity ? base - 14 : (d / maxD) * (base - 24);
            g.fillStyle = '#' + sf.color.toString(16).padStart(6, '0');
            g.globalAlpha = d === Infinity ? 0.45 : 0.85;
            g.fillRect(x, base - hgt, bw, hgt);
            g.globalAlpha = 1;
            g.fillStyle = '#23293a';
            g.fillText(d === Infinity ? '∞' : `${d.toFixed(2)}m`, x + bw / 2, base - hgt - 8);
            if (d !== Infinity) tops.push([x + bw / 2, base - hgt]);
          });
          g.textAlign = 'left';
          // 推理：沿着趋势延长到“阻力为零”
          if (S.reasoned && ['cotton', 'wood'].every((k) => S.runs[k] != null)) {
            g.setLineDash([8, 7]); g.strokeStyle = '#2aa58c'; g.lineWidth = 3;
            g.beginPath(); g.moveTo(...tops[0]);
            for (const p of tops.slice(1)) g.lineTo(...p);
            const last = tops[tops.length - 1];
            g.lineTo(last[0] + bw + gap, 10); g.stroke(); g.setLineDash([]);
            g.fillStyle = '#2aa58c'; g.fillText('推理：阻力为零 → 一直运动', W - 300, 34);
          }
        };

        const refreshTable = () => {
          tbody.innerHTML = '';
          for (const sf of SURFACES) {
            const d = S.runs[sf.id];
            if (d == null) continue;
            tbody.append(h('tr', { class: sf === S.surface ? 'new' : '' }, h('td', {}, sf.name), h('td', {}, sf.force), h('td', {}, d === Infinity ? '一直运动' : `${d.toFixed(2)} m`)));
          }
          drawChart();
        };

        listeners.surface = () => segBtns.forEach((b, i) => {
          b.classList.toggle('on', SURFACES[i] === S.surface);
          b.innerHTML = SURFACES[i].name + (S.runs[SURFACES[i].id] != null ? '<span class="tick">✓</span>' : '');
        });
        listeners.state = () => {
          relBtn.textContent = S.phase === 'run' ? '滑行中…' : S.phase === 'ready' ? '▶ 松手，让小车滑下' : '▶ 再滑一次';
          relBtn.disabled = S.phase === 'run';
        };
        listeners.run = (sf, d) => {
          refreshTable();
          listeners.surface();
          const left = ['cotton', 'wood'].filter((k) => S.runs[k] == null).map((k) => SURFACES.find((x) => x.id === k).name);
          if (d === Infinity) ui.status('在想象中的光滑表面上，小车的速度一点也没有减小，冲出木板后还会一直运动下去。');
          else if (left.length) ui.status(`在<b>${sf.name}</b>上滑行了 <b>${d.toFixed(2)} m</b>。换一种表面再试试？`);
          if (left.length) { ui.need(`还需要在：${left.join('、')} 上各滑一次`); return; }
          if (S.reasoned || S.asking) return;
          // 两种真实表面都做了：先让学生比较，再推理阻力为零时会怎样
          S.asking = true;
          const ask = (q, opts, hint, ok) => {
            quiz.innerHTML = ''; quiz.hidden = false;
            [0, 1, 2].sort(() => Math.random() - 0.5).forEach((k) => quiz.append(h('button', { class: 'go ghost', html: opts[k], onclick: () => { if (k) return ui.status(hint); ok(); } })));
            ui.status(q); ui.need('还需要：比较两次的结果，推理阻力为零时会怎样');
          };
          ask(`看表格：小车在棉布上滑了 ${S.runs.cotton.toFixed(2)} m，在木板上滑了 ${S.runs.wood.toFixed(2)} m。表面越光滑（阻力越小），小车——`, ['滑得越远，速度减小得越慢', '滑得越近', '滑得一样远'], '比一比表格里两种表面的距离。', () =>
            ask('如果表面绝对光滑，小车<b>一点阻力也不受</b>，它会——', ['一直以同样的速度运动下去', '慢慢停下来', '立刻停下来'], '阻力越小，速度减小得越慢；阻力为零，速度还会减小吗？', () => {
              quiz.hidden = true; S.reasoned = true; S.asking = false; drawChart(); ui.unlock();
              ui.status('对：<b>阻力越小，小车滑得越远；如果不受阻力，它将以恒定的速度永远运动下去。</b>这是推理出来的，现实中做不到——可以选“理想·光滑”看一看想象的情形。');
            }));
        };
        this._out = out;
        listeners.surface(); listeners.state(); drawChart();
        ui.status('选一种表面，然后松手。');
      },

      update(dt) {
        step(dt * SLOW);
        clothRoll = Math.min(1, clothRoll + dt * 2.2);
        cloth.scale.x = LB * (1 - Math.pow(1 - clothRoll, 3)) - 0.008;
        pose();
        if (this._out) {
          this._out.v.innerHTML = `${S.v.toFixed(2)}<i>m/s</i>`;
          const d = Math.max(0, S.s - LR);
          this._out.s.innerHTML = S.phase === 'gone' ? '∞' : `${d.toFixed(2)}<i>m</i>`;
          this._out.vb.innerHTML = S.vBottom ? `${S.vBottom.toFixed(2)}<i>m/s</i>` : '—';
        }
      },

      pointer: {
        down(ray) {
          if (ray.intersectObject(cart, true).length) { release(); return true; }
          return false;
        },
      },
    };
  },
};
