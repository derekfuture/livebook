// 图12.1-3 探究杠杆的平衡条件：在支点两侧挂钩码，让杠杆在水平位置平衡。
// 物理：转动方程 I·φ'' = −Σ Fᵢ·xᵢ·cosφ − M·g·d·sinφ − c·φ'（d：杠杆重心略低于支点，平衡时自己回到水平）。
import { h } from '../ui/Panel.js';

const G = 9.8;
const F_HOOK = 0.5;                      // 每个钩码 0.5 N
const M_HOOK = F_HOOK / G;
const GRID = 0.02;                       // 每格 2 cm
const HOLES = 10;                        // 每侧 10 个挂点
const BAR_L = 0.52, BAR_H = 0.03, BAR_T = 0.012;
const PIV_Y = 0.42;
const M_BAR = 0.12, D_COM = 0.01, DAMP = 0.012, LIMIT = 0.3;
const I_BAR = (M_BAR * BAR_L * BAR_L) / 12;
const MAX_STACK = 6;

export default {
  id: 'lever',
  fig: '图12.1-3',
  title: '探究杠杆的平衡条件',
  predict: {
    q: '在杠杆左侧距支点 3 格处挂 2 个钩码。<br>要在右侧距支点 2 格处挂几个钩码，杠杆才能在水平位置平衡？',
    hint: '课本第 105 页「实验」：每个钩码重 0.5 N，每格 2 cm',
    options: ['2 个', '3 个', '4 个'],
    answer: 1,
  },
  need: '让杠杆平衡 3 次，每次换不同的挂法，并记录数据',
  conclusion: {
    quote: '要使杠杆平衡，需要满足以下条件：动力 × 动力臂 = 阻力 × 阻力臂',
    formula: '<i>F</i><sub>1</sub><i>l</i><sub>1</sub> = <i>F</i><sub>2</sub><i>l</i><sub>2</sub>',
    why: '左侧 2 个钩码挂在 3 格处：1 N × 0.06 m = 0.06 N·m；右侧 3 个钩码挂在 2 格处：1.5 N × 0.04 m = 0.06 N·m，两边相等，杠杆就平衡了。力大的一侧，力臂要短；力小的一侧，力臂要长。<br>这个平衡条件就是<b>阿基米德发现的杠杆原理</b>。',
    src: '课本第 105–106 页 · 第十二章 第1节 杠杆',
  },

  create({ THREE, ink, tag }) {
    const { paint, inked, hull, polyline, arrow } = ink;
    const group = new THREE.Group();

    // ---- 支架 ----
    const dark = paint(0x55607a);
    const base = inked(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.016, 0.13), dark));
    base.position.set(0, 0.008, -0.02);
    const pole = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, PIV_Y + 0.03, 14), paint(0xaab3bf)), 0.0025);
    pole.position.set(0, (PIV_Y + 0.03) / 2, -0.03);
    const axle = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.05, 12), paint(0x3b4150)), 0.002);
    axle.rotation.x = Math.PI / 2;
    axle.position.set(0, PIV_Y, -0.008);
    group.add(base, pole, axle);

    // ---- 杠杆（带刻度） ----
    const pivot = new THREE.Group();
    pivot.position.set(0, PIV_Y, 0);
    group.add(pivot);
    const scaleTex = (() => {
      const W = 2600, H = 150, c = document.createElement('canvas');
      c.width = W; c.height = H;
      const g = c.getContext('2d');
      g.fillStyle = '#eef1f4'; g.fillRect(0, 0, W, H);
      const pxPerM = W / BAR_L, cx = W / 2;
      g.strokeStyle = '#2a3040'; g.fillStyle = '#2a3040';
      for (let cm = -25; cm <= 25; cm++) {
        const x = cx + cm * 0.01 * pxPerM, major = cm % 5 === 0;
        g.lineWidth = major ? 4 : 2;
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, major ? 46 : 26); g.stroke();
        if (major && Math.abs(cm) <= 20) { g.font = 'bold 40px PingFang SC, sans-serif'; g.textAlign = 'center'; g.fillText(String(Math.abs(cm)), x, 92); }
      }
      // 挂点小孔
      for (let k = -HOLES; k <= HOLES; k++) {
        if (!k) continue;
        g.beginPath(); g.arc(cx + k * GRID * pxPerM, 126, 9, 0, Math.PI * 2); g.fillStyle = '#5b6272'; g.fill();
      }
      g.fillStyle = '#2a3040'; g.beginPath(); g.arc(cx, 116, 14, 0, Math.PI * 2); g.fill();
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    })();
    const metal = paint(0xdfe3e8);
    const front = new THREE.MeshToonMaterial({ map: scaleTex, gradientMap: metal.gradientMap });
    const bar = inked(new THREE.Mesh(new THREE.BoxGeometry(BAR_L, BAR_H, BAR_T), [metal, metal, metal, metal, front, metal]));
    pivot.add(bar);
    for (const sx of [-1, 1]) {
      const nut = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.014, 6), paint(0xc9a347)), 0.002);
      nut.rotation.z = Math.PI / 2;
      nut.position.set(sx * (BAR_L / 2 + 0.01), 0, 0);
      const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.03, 8), paint(0x8f99a8));
      thread.rotation.z = Math.PI / 2;
      thread.position.set(sx * (BAR_L / 2 + 0.012), 0, 0);
      pivot.add(thread, nut);
    }

    // 挂点（看不见的拾取块，跟杠杆一起转）
    const holeHits = [];
    for (let k = -HOLES; k <= HOLES; k++) {
      if (!k) continue;
      const m = new THREE.Mesh(new THREE.BoxGeometry(GRID * 0.95, 0.12, 0.05), new THREE.MeshBasicMaterial({ visible: false }));
      m.position.set(k * GRID, -0.04, 0);
      m.userData.hole = k;
      pivot.add(m);
      holeHits.push(m);
    }
    const hoverRing = new THREE.Mesh(new THREE.RingGeometry(0.006, 0.0095, 20), new THREE.MeshBasicMaterial({ color: 0xff6a3d, transparent: true, opacity: 0.9 }));
    hoverRing.position.z = BAR_T / 2 + 0.001;
    hoverRing.visible = false;
    pivot.add(hoverRing);

    // ---- 钩码 ----
    const hookGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.02, 24);
    const weightMat = paint(0x6a7385);
    const ghostMat = paint(0xff6a3d, { unique: true, transparent: true, opacity: 0.35, depthWrite: false });
    const makeWeight = (mat = weightMat) => {
      const g = new THREE.Group();
      const body = hull(new THREE.Mesh(hookGeo, mat), 0.002);
      body.position.y = -0.016;
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0115, 0.003, 24), paint(0xc9a347));
      rim.position.y = -0.0075;
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.004, 0.0012, 6, 12), paint(0x3b4150));
      loop.position.y = -0.002;
      g.add(body, rim, loop);
      return g;
    };
    const pool = { '-1': [], '1': [] };
    const ghost = makeWeight(ghostMat);
    ghost.visible = false;
    group.add(ghost);

    // 力的箭头、力臂标注
    const arrows = { '-1': arrow(ink.MAGENTA, 0.0028), '1': arrow(ink.MAGENTA, 0.0028) };
    group.add(arrows['-1'], arrows['1']);
    const fTags = { '-1': tag('', 'mag big'), '1': tag('', 'mag big') };
    const lTags = { '-1': tag('', 'mag'), '1': tag('', 'mag') };
    for (const t of Object.values(lTags)) t.el.style.color = '#2a3040';
    const dims = new THREE.Group();
    pivot.add(dims);
    const okTag = tag('✓ 平衡', 'pill big');
    okTag.el.style.color = '#2f8a4c';

    // ---- 状态 ----
    // stacks[side] = { pos: 第几格(1..10), n: 钩码数 }；side = -1 左（阻力 F2），1 右（动力 F1）
    const S = { stacks: { '-1': { pos: 3, n: 2 }, '1': { pos: 2, n: 0 } }, phi: 0, w: 0, rows: [], hover: null, balancedT: 0 };
    const listeners = {};

    const torque = () => {
      let t = 0;
      for (const side of [-1, 1]) { const st = S.stacks[side]; t += -st.n * F_HOOK * side * st.pos * GRID; }
      return t;
    };
    const inertia = () => {
      let I = I_BAR;
      for (const side of [-1, 1]) { const st = S.stacks[side]; I += st.n * M_HOOK * (st.pos * GRID) ** 2; }
      return I;
    };

    const rebuildDims = () => {
      dims.traverse((o) => o.geometry?.dispose());
      dims.clear();
      for (const side of [-1, 1]) {
        const st = S.stacks[side];
        if (!st.n) continue;
        const x = side * st.pos * GRID, y = BAR_H / 2 + 0.03;
        dims.add(polyline([new THREE.Vector3(0, y, 0.008), new THREE.Vector3(x, y, 0.008)], { color: 0x2a3040, width: 1.3 }));
        dims.add(polyline([new THREE.Vector3(0, y - 0.008, 0.008), new THREE.Vector3(0, y + 0.008, 0.008)], { color: 0x2a3040, width: 1.3 }));
        dims.add(polyline([new THREE.Vector3(x, y - 0.008, 0.008), new THREE.Vector3(x, y + 0.008, 0.008)], { color: 0x2a3040, width: 1.3 }));
      }
    };

    const changed = () => {
      rebuildDims();
      S.balancedT = 0;
      listeners.change?.();
    };

    const clickHole = (k) => {
      const side = Math.sign(k), pos = Math.abs(k), st = S.stacks[side];
      if (st.n && st.pos === pos) st.n = Math.min(MAX_STACK, st.n + 1);
      else if (st.n) st.pos = pos;
      else { st.pos = pos; st.n = 1; }
      changed();
    };

    const step = (dt) => {
      const n = 6, hdt = dt / n;
      for (let i = 0; i < n; i++) {
        const I = inertia();
        const tau = torque() * Math.cos(S.phi) - M_BAR * G * D_COM * Math.sin(S.phi) - DAMP * S.w;
        S.w += (tau / I) * hdt;
        S.phi += S.w * hdt;
        if (S.phi > LIMIT) { S.phi = LIMIT; S.w = Math.min(0, S.w) * -0.2; }
        if (S.phi < -LIMIT) { S.phi = -LIMIT; S.w = Math.max(0, S.w) * -0.2; }
      }
      const level = Math.abs(S.phi) < 0.012 && Math.abs(S.w) < 0.03 && Math.abs(torque()) < 1e-9;
      const hasBoth = S.stacks[-1].n > 0 && S.stacks[1].n > 0;
      S.balancedT = level && hasBoth ? S.balancedT + dt : 0;
    };

    const tmp = new THREE.Vector3();
    const holeWorld = (side, pos) => {
      const x = side * pos * GRID;
      return new THREE.Vector3(x * Math.cos(S.phi), PIV_Y + x * Math.sin(S.phi) - BAR_H / 2 * Math.cos(S.phi), 0);
    };

    const pose = () => {
      pivot.rotation.z = S.phi;
      for (const side of [-1, 1]) {
        const st = S.stacks[side], arr = pool[side];
        while (arr.length < st.n) { const w = makeWeight(); group.add(w); arr.push(w); }
        const top = holeWorld(side, st.pos);
        arr.forEach((w, i) => {
          w.visible = i < st.n;
          w.position.set(top.x, top.y - 0.006 - i * 0.024, BAR_T / 2 + 0.006);
        });
        const F = st.n * F_HOOK;
        const from = new THREE.Vector3(top.x + side * 0.019, top.y - 0.004, BAR_T / 2 + 0.012);
        arrows[side].set(from, new THREE.Vector3(0, -F * 0.06, 0));
        arrows[side].visible = st.n > 0;
        const name = side > 0 ? '1' : '2';
        fTags[side].text(`<i>F</i><sub>${name}</sub>`).show(st.n > 0).at(group.localToWorld(tmp.set(from.x + side * 0.014, from.y - F * 0.06 - 0.004, from.z)));
        const lx = side * st.pos * GRID / 2;
        const ly = BAR_H / 2 + 0.045;
        lTags[side].text(`<i>l</i><sub>${name}</sub>`).show(st.n > 0).at(pivot.localToWorld(tmp.set(lx, ly, 0.008)));
      }
      okTag.show(S.balancedT > 0.25).at(group.localToWorld(tmp.set(0, PIV_Y + 0.1, 0)));
      // 悬停预览
      if (S.hover) {
        const side = Math.sign(S.hover), pos = Math.abs(S.hover), st = S.stacks[side];
        const p = holeWorld(side, pos);
        const below = st.n && st.pos === pos ? st.n : 0;
        ghost.visible = true;
        ghost.position.set(p.x, p.y - 0.006 - below * 0.024, BAR_T / 2 + 0.006);
        hoverRing.visible = true;
        hoverRing.position.set(S.hover * GRID, -BAR_H / 2 + 0.0035 + 0.0, BAR_T / 2 + 0.001);
      } else { ghost.visible = false; hoverRing.visible = false; }
    };

    rebuildDims();
    pose();

    return {
      group,
      size: { w: 0.62, d: 0.2, h: 0.52 },
      view: { elev: 10, azim: 0, lookY: 0.56, margin: 1.32 },

      mount(ui) {
        const stepper = (side, key, label) => {
          const out = h('output');
          const minus = h('button', { onclick: () => { const st = S.stacks[side]; st[key] = Math.max(key === 'pos' ? 1 : 0, st[key] - 1); changed(); } }, '−');
          const plus = h('button', { onclick: () => { const st = S.stacks[side]; st[key] = Math.min(key === 'pos' ? HOLES : MAX_STACK, st[key] + 1); changed(); } }, '+');
          return { el: h('div', { class: 'seg', style: 'align-items:center' }, h('span', { style: 'flex:0 0 72px;font-size:13px;color:var(--ink2)' }, label), minus, out, plus), out };
        };
        const L = { n: stepper(-1, 'n', '钩码数'), pos: stepper(-1, 'pos', '离支点') };
        const R = { n: stepper(1, 'n', '钩码数'), pos: stepper(1, 'pos', '离支点') };
        for (const s of [L.n, L.pos, R.n, R.pos]) { s.out.style.cssText = 'flex:0 0 64px;text-align:center;font:600 15px/1 var(--sans)'; }
        const balance = { a: h('div', { class: 'fill', style: 'background:#d4006c' }), b: h('div', { class: 'fill', style: 'background:#3d7fd8' }), ao: h('output'), bo: h('output') };
        const recBtn = h('button', { class: 'go', onclick: () => record() }, '记录这一组数据');
        // F×l 的比较条：学生自己从表格里找出规律以前不显示（不然盯着两个数配平就行了）
        let barsBox = null;
        const law = h('div', { class: 'btn-row', hidden: true, style: 'margin-bottom:12px' });
        const LAW = ['<i>F</i>₁ × <i>l</i>₁ = <i>F</i>₂ × <i>l</i>₂', '<i>F</i>₁ + <i>l</i>₁ = <i>F</i>₂ + <i>l</i>₂', '<i>F</i>₁ ÷ <i>l</i>₁ = <i>F</i>₂ ÷ <i>l</i>₂'];
        const askLaw = () => {
          law.innerHTML = '';
          [0, 1, 2].sort(() => Math.random() - 0.5).forEach((k) => law.append(h('button', { class: 'go ghost', html: LAW[k], onclick: () => {
            if (k) return ui.status('用表格里的数算一算：每一行，左右两边的哪种算法得数相等？');
            law.hidden = true; barsBox.hidden = false; ui.unlock();
            ui.status('对：杠杆平衡时，<b>动力 × 动力臂 = 阻力 × 阻力臂</b>。下面的两条色条显示了两边的乘积，再换几种挂法看看是不是总相等。');
          } })));
          law.hidden = false; ui.need('还需要：从表格里找出杠杆的平衡条件');
          ui.status('记了 3 组。看看表格：杠杆平衡时，动力、动力臂、阻力、阻力臂之间有什么关系？');
        };
        const clearBtn = h('button', { class: 'go ghost', onclick: () => { S.stacks[-1].n = 0; S.stacks[1].n = 0; changed(); } }, '清空钩码');
        ui.controls.append(
          h('p', { class: 'note', style: 'margin:0 0 10px' }, '点杠杆上的小孔挂钩码（再点同一个孔加一个），点钩码取下一个。也可以用下面的按钮。'),
          h('div', { class: 'ctl' }, h('div', { class: 'ctl-label' }, '左侧：阻力 F₂'), L.n.el, h('div', { style: 'height:6px' }), L.pos.el),
          h('div', { class: 'ctl' }, h('div', { class: 'ctl-label' }, '右侧：动力 F₁'), R.n.el, h('div', { style: 'height:6px' }), R.pos.el),
          (barsBox = h('div', { style: 'margin:4px 0 12px', hidden: true },
            h('div', { class: 'ebar', style: 'grid-template-columns:76px 1fr 80px' }, h('span', { html: '<i>F</i>₂ × <i>l</i>₂' }), h('div', { class: 'track' }, balance.b), balance.bo),
            h('div', { class: 'ebar', style: 'grid-template-columns:76px 1fr 80px' }, h('span', { html: '<i>F</i>₁ × <i>l</i>₁' }), h('div', { class: 'track' }, balance.a), balance.ao))),
          h('div', { class: 'btn-row' }, recBtn, clearBtn), law);
        const tbody = h('tbody');
        ui.data.append(h('table', { class: 'data' },
          h('thead', {}, h('tr', {}, ...['序号', '动力<br><i>F</i><sub>1</sub>/N', '动力臂<br><i>l</i><sub>1</sub>/m', '阻力<br><i>F</i><sub>2</sub>/N', '阻力臂<br><i>l</i><sub>2</sub>/m'].map((t) => h('th', { html: t })))), tbody),
          h('p', { class: 'note' }, '表格和课本第 106 页的一样。'));

        const record = () => {
          if (S.balancedT < 0.25) return ui.status('杠杆还没有在水平位置静止平衡，先调好钩码。');
          const r = S.stacks[1], l = S.stacks[-1];
          const row = { F1: r.n * F_HOOK, l1: r.pos * GRID, F2: l.n * F_HOOK, l2: l.pos * GRID };
          if (S.rows.some((x) => x.F1 === row.F1 && x.l1 === row.l1 && x.F2 === row.F2 && x.l2 === row.l2)) return ui.status('这组已经记过了，换一种挂法再试。');
          S.rows.push(row);
          tbody.append(h('tr', { class: 'new' }, h('td', {}, String(S.rows.length)), h('td', {}, row.F1.toFixed(1)), h('td', {}, row.l1.toFixed(2)), h('td', {}, row.F2.toFixed(1)), h('td', {}, row.l2.toFixed(2))));
          if (S.rows.length >= 3 && barsBox.hidden) return askLaw();
          ui.status(`记下了第 ${S.rows.length} 组。${S.rows.length < 3 ? '换一种挂法（改变钩码数或位置），再让杠杆平衡。' : ''}`);
          if (S.rows.length < 3) ui.need(`还需要再平衡并记录 ${3 - S.rows.length} 组，并找出平衡条件`);
        };

        let wasBalanced = false;
        listeners.change = () => {
          const l = S.stacks[-1], r = S.stacks[1];
          L.n.out.textContent = `${l.n} 个`; L.pos.out.textContent = `${l.pos} 格`;
          R.n.out.textContent = `${r.n} 个`; R.pos.out.textContent = `${r.pos} 格`;
          const a = r.n * F_HOOK * r.pos * GRID, b = l.n * F_HOOK * l.pos * GRID, max = 0.3;
          balance.a.style.width = `${(a / max) * 100}%`; balance.b.style.width = `${(b / max) * 100}%`;
          balance.ao.textContent = `${a.toFixed(2)} N·m`; balance.bo.textContent = `${b.toFixed(2)} N·m`;
          wasBalanced = false;
        };
        this._tick = () => {
          const now = S.balancedT > 0.25;
          if (now && !wasBalanced) ui.status('✓ 杠杆在水平位置平衡了！可以记录数据。');
          if (!now && wasBalanced) ui.status('');
          recBtn.disabled = !now;
          wasBalanced = now;
        };
        listeners.change();
        ui.status('左边已经挂好了 2 个钩码（3 格处）。在右边挂钩码，让杠杆水平平衡。');
      },

      update(dt) {
        step(dt);
        pose();
        this._tick?.();
      },

      pointer: {
        down(ray) {
          // 点钩码：取下一个
          for (const side of [-1, 1]) {
            const st = S.stacks[side];
            if (st.n && ray.intersectObjects(pool[side].slice(0, st.n), true).length) { st.n--; changed(); return true; }
          }
          const hit = ray.intersectObjects(holeHits, false)[0];
          if (hit) { clickHole(hit.object.userData.hole); return true; }
          return false;
        },
        move(ray) {
          const hit = ray.intersectObjects(holeHits, false)[0];
          S.hover = hit ? hit.object.userData.hole : null;
          document.getElementById('c').style.cursor = hit ? 'pointer' : '';
          return !!hit;
        },
      },

      dispose() { document.getElementById('c').style.cursor = ''; },
    };
  },
};
