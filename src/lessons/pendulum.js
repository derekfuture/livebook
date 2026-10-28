// 图11.4-1 / 图11.4-3乙：单摆（铁锁）的动能和势能的转化。
// 物理：θ'' = −(g/L)·sinθ − b·θ'，RK4 积分；b = 0 时机械能守恒，b > 0 时一部分机械能变成内能。
import { h } from '../ui/Panel.js';

const G = 9.8, L = 0.75, M = 0.2, R = 0.04;
const PIVOT = { x: 0, y: 0.98 };
const AIR = 0.32;                    // 打开空气阻力时的阻尼（夸大了，方便看出来）
const deg = Math.PI / 180;

export default {
  id: 'pendulum',
  fig: '图11.4-1 · 图11.4-3',
  title: '动能和势能的转化',
  predict: {
    q: '把一个铁锁用绳子悬挂起来，将铁锁拉到自己的鼻子附近，稳定后松手（不要推）。<br>铁锁摆回来时，会打到你的鼻子吗？',
    hint: '课本第 96 页「问题」，图11.4-1',
    options: ['会打到鼻子', '不会打到鼻子', '摆回来时会比出发点更高'],
    answer: 1,
  },
  need: '让小球摆一个来回；再打开“空气阻力”放一次',
  conclusion: {
    quote: '如果只有动能和势能相互转化，尽管动能、势能的大小会变化，但动能和势能的总和不变，或者说，机械能是守恒的。',
    formula: '动能 ⇄ 重力势能',
    why: '小球从 <i>A</i> 点下落到 <i>B</i> 点，重力势能逐渐转化成动能，到最低点 <i>B</i> 时动能最大；之后从 <i>B</i> 点上升到 <i>C</i> 点，动能逐渐转化成重力势能。<br>松手时铁锁没有速度，所以它最多只能回到出发的高度——刚好停在鼻尖前，打不到鼻子。实际上还有空气阻力，一部分机械能转化为内能，铁锁回来时连出发点都到不了。',
    src: '课本第 96–97 页 · 第十一章 第4节 机械能及其转化',
  },

  create({ THREE, ink, tag }) {
    const { paint, inked, hull, polyline } = ink;
    const group = new THREE.Group();
    const P = new THREE.Vector3(PIVOT.x, PIVOT.y, 0);

    // ---- 铁架台 ----
    const metal = paint(0x8f99a8);
    const RX = 0.66;     // 立杆在右边，横杆伸到悬点上方
    const base = inked(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.025, 0.3), paint(0x4d5668)));
    base.position.set(RX, 0.0125, -0.04);
    const rod = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, PIVOT.y + 0.06, 14), metal), 0.003);
    rod.position.set(RX, (PIVOT.y + 0.06) / 2, -0.04);
    const arm = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, RX + 0.1, 12), metal), 0.003);
    arm.rotation.z = Math.PI / 2;
    arm.position.set((RX - 0.1) / 2, PIVOT.y + 0.03, -0.04);
    const clamp = inked(new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.035), paint(0x5b6272)));
    clamp.position.set(RX, PIVOT.y + 0.03, -0.04);
    const bar = inked(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.018, 0.1), paint(0xc99a64)));
    bar.position.set(0, PIVOT.y + 0.009, -0.02);
    group.add(base, rod, arm, clamp, bar);

    // ---- 摆 ----
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 1, 6), paint(0x2a3040));
    string.geometry.translate(0, -0.5, 0);
    string.position.copy(P);
    const ball = hull(new THREE.Mesh(new THREE.SphereGeometry(R, 32, 20), paint(0x9aa3b2)), 0.004);
    group.add(string, ball);

    // A / B / C 的虚影（像课本里的虚线小球）
    const ghost = (label) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(R, 24, 16), paint(0xc8ced8, { unique: true, transparent: true, opacity: 0.35, depthWrite: false }));
      group.add(m);
      const t = tag(`<i>${label}</i>`, 'mag big');
      t.el.style.color = '#2a3040';
      return { m, t };
    };
    const gA = ghost('A'), gB = ghost('B'), gC = ghost('C');
    let guides = new THREE.Group();
    group.add(guides);

    // 一条装着点点的轨迹
    const TRAIL = 48;
    const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.006, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff6a3d, transparent: true, opacity: 0.8 }), TRAIL);
    dots.frustumCulled = false;     // 实例位置会变，包围球不准
    dots.count = 0;
    group.add(dots);
    const trail = [];
    let trailClock = 0;

    // ---- 小人（鼻子在 A 点旁边） ----
    const person = new THREE.Group();
    const skin = paint(0xf3c9a5);
    const head = hull(new THREE.Mesh(new THREE.SphereGeometry(0.085, 28, 20), skin), 0.004);
    const nose = hull(new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.04, 14), skin), 0.003);
    nose.rotation.z = -Math.PI / 2;
    nose.position.set(0.095, -0.005, 0);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.089, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.42), paint(0x2c2a33));
    hair.rotation.z = 0.5;
    hair.position.set(-0.01, 0.005, 0);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), paint(0x1d1f26));
    eye.position.set(0.062, 0.022, 0.05);
    const ear = hull(new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 10), skin), 0.003);
    ear.position.set(-0.015, -0.005, 0.08);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.06, 14), skin);
    neck.position.set(-0.02, -0.1, 0);
    const torso = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.085, 1, 20), paint(0xf2cf4a)), 0.004);
    torso.geometry.translate(0, -0.5, 0);
    torso.position.set(-0.025, -0.12, 0);
    head.add(nose, hair, eye, ear);
    person.add(head, neck, torso);
    group.add(person);
    const NOSE_TIP = 0.115;   // 鼻尖离头中心的距离

    // ---- 状态 ----
    const S = { th0: -40 * deg, th: -40 * deg, w: 0, phase: 'hold', air: false, E0: 0, Q: 0, swings: 0, lastSign: 0, ran: { off: false, on: false }, history: [], t: 0, gap: null, dragging: false };
    const listeners = {};
    const posOf = (th, out = new THREE.Vector3()) => out.set(P.x + L * Math.sin(th), P.y - L * Math.cos(th), 0);
    const Ep = (th) => M * G * L * (1 - Math.cos(th));
    const Ek = (w) => 0.5 * M * (L * w) ** 2;

    const layoutGuides = () => {
      group.remove(guides);
      guides.traverse((o) => o.geometry?.dispose());
      guides = new THREE.Group();
      const a = posOf(S.th0), c = posOf(-S.th0), b = posOf(0);
      guides.add(polyline([P, a], { dashed: true, color: 0x6b7280, width: 1.2 }));
      guides.add(polyline([P, c], { dashed: true, color: 0x6b7280, width: 1.2 }));
      guides.add(polyline([P, b], { dashed: true, color: 0x6b7280, width: 1.2 }));
      guides.add(polyline([a.clone().setX(a.x - Math.sign(S.th0) * 0.0), c], { dashed: true, color: 0xff6a3d, width: 1.6, dash: 0.02, gap: 0.015 }));
      group.add(guides);
      gA.m.position.copy(a); gB.m.position.copy(b); gC.m.position.copy(c);
      // 小人站在 A 点外侧，鼻尖贴着小球
      const side = Math.sign(S.th0) || -1;
      person.scale.x = -side;
      const headC = a.clone().add(new THREE.Vector3(side * (R + NOSE_TIP + 0.004), 0.005, 0));
      person.position.copy(headC);
      torso.scale.y = Math.max(0.05, headC.y - 0.12);
    };

    const reset = (th0 = S.th0) => {
      Object.assign(S, { th0, th: th0, w: 0, phase: 'hold', Q: 0, swings: 0, lastSign: 0, gap: null });
      S.E0 = Ep(th0);
      trail.length = 0;
      layoutGuides();
      listeners.state?.();
    };

    const release = () => {
      if (S.phase === 'swing') reset();
      S.phase = 'swing';
      S.E0 = Ep(S.th);
      S.ran[S.air ? 'on' : 'off'] = S.ran[S.air ? 'on' : 'off'] || 'started';
      listeners.state?.();
    };

    const deriv = (th, w) => [w, -(G / L) * Math.sin(th) - (S.air ? AIR : 0) * w];
    const rk4 = (dt) => {
      const [a1, b1] = deriv(S.th, S.w);
      const [a2, b2] = deriv(S.th + a1 * dt / 2, S.w + b1 * dt / 2);
      const [a3, b3] = deriv(S.th + a2 * dt / 2, S.w + b2 * dt / 2);
      const [a4, b4] = deriv(S.th + a3 * dt, S.w + b3 * dt);
      S.th += (dt / 6) * (a1 + 2 * a2 + 2 * a3 + a4);
      S.w += (dt / 6) * (b1 + 2 * b2 + 2 * b3 + b4);
    };

    const step = (dt) => {
      if (S.phase !== 'swing') return;
      const n = 6, hdt = dt / n;
      for (let i = 0; i < n; i++) {
        const prevW = S.w;
        rk4(hdt);
        // 在出发的那一侧掉头 = 摆回来了
        if (Math.sign(prevW) !== Math.sign(S.w) && prevW !== 0 && Math.sign(S.th) === Math.sign(S.th0)) {
          S.swings++;
          S.gap = L * (Math.abs(S.th0) - Math.abs(S.th));
          const key = S.air ? 'on' : 'off';
          S.ran[key] = true;
          listeners.swing?.();
        }
      }
      S.Q = Math.max(0, S.E0 - Ep(S.th) - Ek(S.w));
    };

    const v = new THREE.Vector3(), q = new THREE.Quaternion(), down = new THREE.Vector3(0, -1, 0);
    const pose = (dt) => {
      posOf(S.th, v);
      ball.position.copy(v);
      const d = v.clone().sub(P);
      string.scale.y = d.length() - R * 0.9;
      q.setFromUnitVectors(down, d.normalize());
      string.quaternion.copy(q);
      // 轨迹
      trailClock += dt;
      if (S.phase === 'swing' && trailClock > 0.03) {
        trailClock = 0;
        trail.push(v.clone());
        if (trail.length > TRAIL) trail.shift();
      }
      const mtx = new THREE.Matrix4();
      dots.count = trail.length;
      trail.forEach((p, i) => { mtx.makeScale(0.4 + (i / TRAIL) * 0.8, 0.4 + (i / TRAIL) * 0.8, 0.4 + (i / TRAIL) * 0.8).setPosition(p); dots.setMatrixAt(i, mtx); });
      dots.instanceMatrix.needsUpdate = true;
      for (const g of [gA, gB, gC]) g.t.at(group.localToWorld(g.m.position.clone().add(new THREE.Vector3(0, -0.075, 0))));
    };

    reset(-40 * deg);

    return {
      group,
      size: { w: 1.65, d: 0.5, h: 1.05 },
      view: { elev: 16, azim: -10, lookY: 0.5, margin: 1.15 },

      mount(ui) {
        const out = { ek: h('output'), ep: h('output'), q: h('output'), e: h('output') };
        const fill = { ek: h('div', { class: 'fill', style: 'background:#ff8a3d' }), ep: h('div', { class: 'fill', style: 'background:#3d7fd8' }), q: h('div', { class: 'fill', style: 'background:#b0571b' }), e: h('div', { class: 'fill', style: 'background:#2a3040' }) };
        const bar = (k, name) => h('div', { class: 'ebar' }, h('span', {}, name), h('div', { class: 'track' }, fill[k]), out[k]);
        const angleOut = h('output');
        const slider = h('input', { type: 'range', min: 15, max: 60, step: 1, value: 40 });
        slider.oninput = () => { reset(-Number(slider.value) * deg); };
        const relBtn = h('button', { class: 'go', onclick: () => release() }, '▶ 松手');
        const resetBtn = h('button', { class: 'go ghost', onclick: () => reset() }, '↺ 拉回 A 点');
        const airBtns = [h('button', { onclick: () => setAir(false) }, '没有空气阻力'), h('button', { onclick: () => setAir(true) }, '有空气阻力')];
        const setAir = (on) => { S.air = on; airBtns.forEach((b, i) => b.classList.toggle('on', i === (on ? 1 : 0))); reset(); };
        ui.controls.append(
          h('div', { class: 'ctl' }, h('div', { class: 'ctl-label' }, '出发点 A 的摆角', angleOut), slider),
          h('div', { class: 'ctl' }, h('div', { class: 'seg' }, airBtns)),
          h('div', { class: 'btn-row' }, relBtn, resetBtn),
          h('p', { class: 'note' }, '也可以直接用鼠标拖动小球，松开就摆。'),
          h('div', { style: 'margin-top:12px' }, bar('ek', '动能'), bar('ep', '重力势能'), bar('e', '机械能'), bar('q', '内能 ↑')));
        const quiz = h('div', { class: 'btn-row', hidden: true, style: 'margin:8px 0 12px' });
        ui.controls.append(quiz);
        const chart = h('canvas', { class: 'chart', width: 680, height: 280 });
        ui.data.append(chart, h('p', { class: 'note' }, '橙色：动能　蓝色：重力势能　黑色：两者之和（机械能）'));
        setAir(false);

        this._ui = { out, fill, chart, angleOut, relBtn };
        listeners.state = () => {
          relBtn.textContent = S.phase === 'swing' ? '摆动中…（点这里重新开始）' : '▶ 松手';
          angleOut.textContent = `${Math.round(Math.abs(S.th0) / deg)}°`;
          slider.value = Math.round(Math.abs(S.th0) / deg);
        };
        listeners.swing = () => {
          const cm = (S.gap * 100);
          if (!quiz.hidden) return;     // 正在答题：别用新的摆动说明盖掉题目
          if (!S.air) ui.status(`摆回来了！离鼻尖还有 <b>${Math.max(0, cm).toFixed(1)} cm</b>——回到和 A 点同样的高度，速度变成零，碰不到鼻子。`);
          else ui.status(`有空气阻力：这一次回到离出发点还差 <b>${cm.toFixed(1)} cm</b>，机械能在一点点减少。`);
          const need = [];
          if (S.ran.off !== true) need.push('没有空气阻力时摆一个来回');
          if (S.ran.on !== true) need.push('打开“有空气阻力”再放一次');
          if (need.length) return ui.need('还需要：' + need.join('；'));
          if (S.reasoned || !quiz.hidden) return;
          // 两种情况都摆过了：学生看能量条说出转化关系
          ui.need('还需要：说一说小球摆动时能量怎样转化');
          quiz.innerHTML = ''; quiz.hidden = false;
          const opts = ['往下摆：重力势能转化为动能；往上摆：动能转化为重力势能', '往下摆：动能转化为重力势能；往上摆：重力势能转化为动能', '摆动时动能和重力势能都不变'];
          [0, 1, 2].sort(() => Math.random() - 0.5).forEach((k) => quiz.append(h('button', { class: 'go ghost', html: opts[k], onclick: () => {
            if (k) return ui.status('再看一次摆动时的能量条：小球往下摆时，橙色（动能）和蓝色（重力势能）谁变大、谁变小？');
            quiz.hidden = true; S.reasoned = true; ui.unlock();
            ui.status('对：<b>动能和重力势能可以相互转化</b>；没有空气阻力时机械能保持不变，所以小球回到原来的高度，碰不到鼻子。有空气阻力时，一部分机械能转化为内能，越摆越低。');
          } })));
          ui.status('两种情况都试过了。看能量条：小球从 A 点往下摆、再往上摆的过程中，能量怎样转化？');
        };
        listeners.state();
        ui.status('把小球拉到 A 点（鼻尖旁边），然后松手。');
      },

      update(dt) {
        step(dt);
        pose(dt);
        S.t += dt;
        const ek = Ek(S.w), ep = Ep(S.th), E0 = Math.max(1e-6, S.E0);
        if (S.phase === 'swing') {
          S.history.push([S.t, ek, ep]);
          while (S.history.length && S.history[0][0] < S.t - 7) S.history.shift();
        }
        const U = this._ui;
        if (!U) return;
        const set = (k, val) => { U.fill[k].style.width = `${Math.min(100, (val / E0) * 100)}%`; U.out[k].textContent = `${val.toFixed(2)} J`; };
        set('ek', ek); set('ep', ep); set('e', ek + ep); set('q', S.phase === 'swing' ? S.Q : 0);
        // 能量随时间的曲线
        const g = U.chart.getContext('2d'), W = U.chart.width, H = U.chart.height;
        g.clearRect(0, 0, W, H);
        g.strokeStyle = '#e3dccd'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(40, 14); g.lineTo(40, H - 30); g.lineTo(W - 10, H - 30); g.stroke();
        g.fillStyle = '#8b8170'; g.font = '20px PingFang SC, sans-serif';
        g.fillText('能量', 2, 28); g.fillText('时间 →', W - 80, H - 6);
        const hist = S.history;
        if (hist.length > 1) {
          const t0 = S.t - 7, x = (t) => 40 + ((t - t0) / 7) * (W - 50), y = (e) => H - 30 - (e / (E0 * 1.12)) * (H - 54);
          for (const [idx, col, w] of [[1, '#ff8a3d', 3], [2, '#3d7fd8', 3], [3, '#2a3040', 2.5]]) {
            g.strokeStyle = col; g.lineWidth = w; g.beginPath();
            hist.forEach((p, i) => { const e = idx === 3 ? p[1] + p[2] : p[idx]; i ? g.lineTo(x(p[0]), y(e)) : g.moveTo(x(p[0]), y(e)); });
            g.stroke();
          }
        }
      },

      pointer: {
        down(ray) {
          if (!ray.intersectObject(ball, false).length) return false;
          S.dragging = true;
          S.phase = 'hold'; S.w = 0;
          return true;
        },
        move(ray) {
          if (!S.dragging) return false;
          const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0).applyMatrix4(group.matrixWorld);
          const hit = new THREE.Vector3();
          if (!ray.ray.intersectPlane(plane, hit)) return true;
          group.worldToLocal(hit);
          let th = Math.atan2(hit.x - P.x, -(hit.y - P.y));
          const sgn = Math.sign(th) || -1;
          th = sgn * Math.min(60 * deg, Math.max(12 * deg, Math.abs(th)));
          reset(th);
          return true;
        },
        up() {
          if (!S.dragging) return false;
          S.dragging = false;
          release();
          return true;
        },
      },
    };
  },
};
