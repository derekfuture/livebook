// 图10.2-2 探究浮力的大小与排开液体所受重力的关系（溢水杯 + 弹簧测力计）。
// 物理：浸入深度 d → V排 = A物·d，F浮 = ρ液·g·V排；测力计示数 F = G物 − F浮，弹簧伸长 = F·k；
// 杯中水面高出溢水口的部分流进小桶。浸入深度和弹簧伸长相互影响，用不动点迭代求解。
import { h } from '../ui/Panel.js';

const G = 9.8;
const CUP_R = 0.075, CUP_H = 0.2, SPOUT_Y = 0.165;
const A_CUP = Math.PI * (CUP_R - 0.003) ** 2;
const BLK_R = 0.03, BLK_H = 0.06, A_BLK = Math.PI * BLK_R ** 2, V_BLK = A_BLK * BLK_H;
const RHO_BLK = 2.7e3;                         // 铝
const G_BLK = RHO_BLK * G * V_BLK;            // ≈ 4.49 N
const G_BUCKET = 0.4;                          // 空小桶重 (N)
const BUCKET_R = 0.032, A_BUCKET = Math.PI * (BUCKET_R - 0.002) ** 2, BUCKET_X = CUP_R + 0.09;
const K_SPRING = 0.012;                        // 每牛伸长 (m/N)
const TUBE = 0.16;
const STR = 0.08;                              // 测力计挂钩到铝块之间的细线
const ARM_HI = 0.645, ARM_LO = 0.405;
const LIQUIDS = [{ id: 'water', name: '水', rho: 1.0e3, color: 0x8fd0ef }, { id: 'brine', name: '盐水', rho: 1.2e3, color: 0x9fd9d0 }];

export default {
  id: 'archimedes',
  fig: '图10.2-2',
  title: '浮力的大小与排开液体所受重力的关系',
  predict: {
    q: '把铝块慢慢浸入装满水的溢水杯，溢出的水流进小桶。<br>铝块受到的浮力 <i>F</i><sub>浮</sub>，和它排开的水所受的重力 <i>G</i><sub>排</sub> 比，哪个大？',
    hint: '课本第 68 页「问题」：浮力的大小跟它们有什么定量的关系呢？',
    options: ['浮力 F浮 更大', '两者一样大', '排开的水 G排 更重'],
    answer: 1,
  },
  need: '记录 3 组数据（浸入深度不同，或换一种液体）',
  conclusion: {
    quote: '浸在液体中的物体受到向上的浮力，浮力的大小等于它排开的液体所受的重力。',
    formula: '<i>F</i><sub>浮</sub> = <i>G</i><sub>排</sub>',
    why: '这就是著名的<b>阿基米德原理</b>。不管铝块浸入多深、浸在水里还是盐水里，测力计示数减小的量（<i>F</i><sub>浮</sub> = <i>G</i><sub>物</sub> − <i>F</i><sub>拉</sub>）总等于小桶里多出来的水重。<br>做这个实验时，溢水杯一定要先装满水；如果没装满，物体先要把水面“顶”到溢水口，排开的水有一部分留在杯里，测出的 <i>G</i><sub>排</sub> 就偏小了。',
    src: '课本第 68–70 页 · 第十章 第2节 阿基米德原理',
  },

  create({ THREE, ink, tag }) {
    const { paint, inked, hull, polyline } = ink;
    const group = new THREE.Group();

    // ---- 溢水杯 ----
    const glass = paint(0xdff1f8, { transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(CUP_R, CUP_R, CUP_H, 48, 1, true), glass);
    cup.position.y = CUP_H / 2;
    inked(cup, { width: 1.6 });
    cup.renderOrder = 5;
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(CUP_R, CUP_R, 0.008, 48), paint(0xdff1f8, { transparent: true, opacity: 0.5 }));
    floor.position.y = 0.004;
    group.add(cup, floor);
    for (const sx of [-1, 1]) group.add(polyline([new THREE.Vector3(sx * CUP_R, 0, 0), new THREE.Vector3(sx * CUP_R, CUP_H, 0)], { width: 1.6 }));
    // 溢水口
    const spout = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.065, 14, 1, true), paint(0xdff1f8, { transparent: true, opacity: 0.5, side: THREE.DoubleSide })), 0.002);
    spout.rotation.z = Math.PI / 2 + 0.28;
    spout.position.set(CUP_R + 0.028, SPOUT_Y - 0.008, 0);
    group.add(spout);
    const OUTLET = new THREE.Vector3(CUP_R + 0.06, SPOUT_Y - 0.02, 0);

    // 水
    const liquidMat = paint(0x8fd0ef, { unique: true, transparent: true, opacity: 0.55, depthWrite: false });
    const water = new THREE.Mesh(new THREE.CylinderGeometry(CUP_R - 0.003, CUP_R - 0.003, 1, 48), liquidMat);
    water.geometry.translate(0, 0.5, 0);
    water.position.y = 0.008;
    water.renderOrder = 4;
    const surface = new THREE.Mesh(new THREE.RingGeometry(0, CUP_R - 0.003, 48), new THREE.MeshBasicMaterial({ color: 0x5fb4dd, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
    surface.rotation.x = -Math.PI / 2;
    group.add(water, surface);

    // ---- 小桶 ----
    const bucket = new THREE.Group();
    const pail = new THREE.Mesh(new THREE.CylinderGeometry(BUCKET_R, BUCKET_R * 0.9, 0.065, 32, 1, true), paint(0xe8eef3, { transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
    pail.position.y = 0.0325;
    inked(pail, { width: 1.4 });
    const pailFloor = new THREE.Mesh(new THREE.CylinderGeometry(BUCKET_R * 0.9, BUCKET_R * 0.9, 0.004, 32), paint(0xcfd8e0));
    pailFloor.position.y = 0.002;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(BUCKET_R, 0.0015, 6, 32, Math.PI), paint(0x5b6272));
    handle.position.y = 0.065;
    const bucketWater = new THREE.Mesh(new THREE.CylinderGeometry(BUCKET_R - 0.002, BUCKET_R * 0.9 - 0.002, 1, 32), liquidMat);
    bucketWater.geometry.translate(0, 0.5, 0);
    bucketWater.position.y = 0.004;
    bucket.add(pail, pailFloor, handle, bucketWater);
    bucket.position.set(BUCKET_X, 0, 0);
    for (const sx of [-1, 1]) bucket.add(polyline([new THREE.Vector3(sx * BUCKET_R * 0.9, 0, 0), new THREE.Vector3(sx * BUCKET_R, 0.065, 0)], { width: 1.4 }));
    group.add(bucket);

    // ---- 铁架台 + 弹簧测力计 + 铝块 ----
    const metal = paint(0x8f99a8);
    const standX = -0.2;
    const sBase = inked(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.2), paint(0x4d5668)));
    sBase.position.set(standX - 0.02, 0.01, -0.05);
    const rod = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.72, 12), metal), 0.0025);
    rod.position.set(standX, 0.36, -0.05);
    group.add(sBase, rod);

    const rig = new THREE.Group();            // 随“横杆”一起上下移动
    group.add(rig);
    const arm = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, Math.abs(standX) + 0.02, 10), metal), 0.002);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(standX / 2, 0, -0.05);
    const clamp = inked(new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.026, 0.026), paint(0x5b6272)));
    clamp.position.set(standX, 0, -0.05);
    const hook0 = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.05, 6), paint(0x3b4150));
    hook0.rotation.x = Math.PI / 2;
    hook0.position.set(0, 0, -0.025);
    rig.add(arm, clamp, hook0);

    // 测力计外壳 + 刻度板
    const tube = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, TUBE, 20), paint(0xc4ccd6)), 0.0025);
    tube.position.set(0, -0.015 - TUBE / 2, 0);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.002, 6, 16), paint(0x3b4150));
    ring.position.set(0, -0.008, 0);
    const plate = (() => {
      const c = document.createElement('canvas');
      c.width = 128; c.height = 768;
      const g = c.getContext('2d');
      g.fillStyle = '#f7f4ea'; g.fillRect(0, 0, 128, 768);
      const pxPerM = 768 / 0.13, y0 = 0.02 * pxPerM;
      g.strokeStyle = '#23293a'; g.fillStyle = '#23293a'; g.font = 'bold 34px PingFang SC, sans-serif'; g.textAlign = 'right';
      for (let f = 0; f <= 5.001; f += 0.1) {
        const y = y0 + f * K_SPRING * pxPerM, major = Math.abs(f - Math.round(f)) < 1e-6, half = Math.abs(f * 2 - Math.round(f * 2)) < 1e-6;
        g.lineWidth = major ? 4 : 2;
        g.beginPath(); g.moveTo(0, y); g.lineTo(major ? 60 : half ? 44 : 28, y); g.stroke();
        if (major) g.fillText(String(Math.round(f)), 120, y + 12);
      }
      g.fillText('N', 120, 760);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.13), new THREE.MeshBasicMaterial({ map: t }));
      m.position.set(0, -0.015 - 0.13 / 2 - 0.005, 0.0145);
      return m;
    })();
    const pointer = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.003, 0.004), new THREE.MeshBasicMaterial({ color: 0xd4006c }));
    pointer.position.z = 0.016;
    const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 1, 8), paint(0x3b4150));
    spring.geometry.translate(0, -0.5, 0);
    rig.add(tube, ring, plate, pointer, spring);

    const block = new THREE.Group();
    const blk = hull(new THREE.Mesh(new THREE.CylinderGeometry(BLK_R, BLK_R, BLK_H, 32), paint(0xc7cdd6)), 0.003);
    blk.position.y = -BLK_H / 2;
    const blkHook = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0015, 6, 14), paint(0x3b4150));
    blkHook.position.y = 0.006;
    block.add(blk, blkHook);
    group.add(block);

    // ---- 水流（小水珠） ----
    const DROPS = 90;
    const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0042, 8, 6), new THREE.MeshBasicMaterial({ color: 0x5fb4dd, transparent: true, opacity: 0.85 }), DROPS);
    drops.frustumCulled = false;     // 实例位置会变，包围球不准
    drops.count = 0;
    group.add(drops);
    const flying = [];   // { p, v, vol }

    // ---- 箭头与标签 ----
    const upArrow = ink.arrow(0x2f7fd8, 0.004);
    group.add(upArrow);
    const fTag = tag('', 'mag big'); fTag.el.style.color = '#2f7fd8';
    const scaleTag = tag('', 'pill');
    const bucketTag = tag('', 'pill');

    // ---- 状态 ----
    const S = {
      liquid: LIQUIDS[0], arm: 0, Vw: A_CUP * SPOUT_Y, Vb: 0, full: true,
      dsub: 0, level: SPOUT_Y, F: G_BLK, ext: G_BLK * K_SPRING, flow: 0, rows: [], blockY: 0, dragging: false,
    };
    const listeners = {};

    const refill = (full = true) => {
      S.Vw = A_CUP * (full ? SPOUT_Y : SPOUT_Y - 0.012);
      S.Vb = 0; S.full = full; flying.length = 0; S.maxSub = 0; S.maxArm = 0; S.lifted = false;
      listeners.state?.();
    };

    const solve = () => {
      const armY = ARM_HI + (ARM_LO - ARM_HI) * S.arm;
      // 不动点迭代：伸长 ↔ 浸入深度
      let ext = S.ext, dsub = 0, level = S.Vw / A_CUP, bottom = 0;
      for (let i = 0; i < 8; i++) {
        bottom = armY - 0.207 - STR - ext - BLK_H;
        // 水面：先假设部分浸入，再检查
        if (bottom >= S.Vw / A_CUP) { dsub = 0; level = S.Vw / A_CUP; }
        else {
          level = (S.Vw - A_BLK * bottom) / (A_CUP - A_BLK);
          dsub = level - bottom;
          if (dsub >= BLK_H) { dsub = BLK_H; level = (S.Vw + V_BLK) / A_CUP; }
        }
        const F = G_BLK - S.liquid.rho * G * A_BLK * dsub;
        ext = Math.max(0, F) * K_SPRING;
      }
      S.ext = ext; S.dsub = dsub; S.level = level; S.blockBottom = bottom; S.armY = armY;
      // 记下这次装满以来横杆放得最低的位置：一旦把铝块往上提，小桶里的水就不再等于“现在”排开的水
      S.maxArm = Math.max(S.maxArm || 0, S.arm);
      if (S.arm < S.maxArm - 0.01 && dsub < S.maxSub - 0.001) S.lifted = true;
      S.maxSub = Math.max(S.maxSub || 0, S.arm >= S.maxArm - 1e-9 ? dsub : 0);
      S.Fb = S.liquid.rho * G * A_BLK * dsub;
      S.F = G_BLK - S.Fb;
    };

    const tmp = new THREE.Matrix4();
    const step = (dt) => {
      solve();
      // 溢出
      const excess = (S.level - SPOUT_Y) * A_CUP;
      if (excess > 0 && excess < 3e-8) { S.Vw -= excess; S.Vb += excess; S.flow = 0; }   // 最后一点点直接滴进去
      else if (excess > 0) {
        const out = excess * (1 - Math.exp(-dt * 7));
        S.Vw -= out;
        S.flow = out / dt;
        // 拆成小水珠飞到小桶里
        const n = Math.min(4, Math.ceil(out / 4e-7));
        for (let i = 0; i < n; i++) {
          if (flying.length >= DROPS) { S.Vb += out / n; continue; }   // 水珠不够用时直接算进小桶
          flying.push({ p: OUTLET.clone().add(new THREE.Vector3(0, (Math.random() - 0.5) * 0.004, (Math.random() - 0.5) * 0.004)), v: new THREE.Vector3(0.22 + Math.random() * 0.05, -0.05, 0), vol: out / n });
        }
      } else S.flow = 0;
      const surfaceY = 0.004 + S.Vb / A_BUCKET;
      for (let i = flying.length - 1; i >= 0; i--) {
        const d = flying[i];
        d.v.y -= G * dt * 0.6;
        d.p.addScaledVector(d.v, dt);
        if (d.p.y <= surfaceY + 0.002 && Math.abs(d.p.x - BUCKET_X) < BUCKET_R) { S.Vb += d.vol; flying.splice(i, 1); }
        else if (d.p.y < 0) { S.Vb += d.vol; flying.splice(i, 1); }
      }
      drops.count = flying.length;
      flying.forEach((d, i) => { tmp.makeTranslation(d.p.x, d.p.y, d.p.z); drops.setMatrixAt(i, tmp); });
      drops.instanceMatrix.needsUpdate = true;
    };

    // 测力计各部分在 rig 里的位置（rig 原点 = 横杆）：
    //   外壳 −0.015 ~ −0.175；刻度 0 N 在 −0.04；指针 = −0.04 − 伸长；挂钩下端 = −0.195 − 伸长；铝块顶面再往下 0.012。
    const pose = () => {
      rig.position.set(0, S.armY, 0);
      pointer.position.y = -0.04 - S.ext;
      const rodBottom = -0.195 - S.ext;
      spring.position.y = -0.025;
      spring.scale.y = -0.025 - rodBottom + STR;
      block.position.set(0, S.armY + rodBottom - 0.012 - STR, 0);
      // 水
      water.scale.y = Math.max(0.001, Math.min(S.level, CUP_H) - 0.008);
      surface.position.y = Math.min(S.level, CUP_H);
      bucketWater.scale.y = Math.max(0.0005, S.Vb / A_BUCKET);
      bucketWater.visible = S.Vb > 1e-7;
      // 浮力箭头
      const fb = S.Fb;
      upArrow.set(new THREE.Vector3(0.0, S.blockBottom - 0.005, BLK_R + 0.012), new THREE.Vector3(0, fb * 0.035, 0));
      upArrow.visible = fb > 0.02;
      fTag.show(upArrow.visible).text(`<i>F</i><sub>浮</sub>`).at(group.localToWorld(new THREE.Vector3(0.028, S.blockBottom + fb * 0.035 + 0.01, BLK_R + 0.012)));
      scaleTag.text(`${S.F.toFixed(2)} N`).at(group.localToWorld(new THREE.Vector3(0.062, S.armY - 0.06 - S.ext, 0)));
      const gex = S.liquid.rho * G * S.Vb;
      bucketTag.text(`桶里的水 ${gex.toFixed(2)} N`).show(S.Vb > 1e-7).at(group.localToWorld(new THREE.Vector3(BUCKET_X, 0.1, 0)));
    };

    solve(); pose();

    return {
      group,
      size: { w: 0.62, d: 0.32, h: 0.74 },
      view: { elev: 15, azim: -14, lookY: 0.5, margin: 1.26 },

      mount(ui) {
        const slider = h('input', { type: 'range', min: 0, max: 1, step: 0.001, value: 0 });
        slider.oninput = () => { S.arm = Number(slider.value); };
        this._slider = slider;
        const liqBtns = LIQUIDS.map((l) => h('button', { onclick: () => setLiquid(l) }, l.name));
        const setLiquid = (l) => {
          S.liquid = l;
          liquidMat.color.setHex(l.color);
          liqBtns.forEach((b, i) => b.classList.toggle('on', LIQUIDS[i] === l));
          S.arm = 0; slider.value = 0;
          refill(true);
        };
        const out = { gb: h('b'), f: h('b'), fb: h('b'), ge: h('b') };
        const recBtn = h('button', { class: 'go', onclick: () => record() }, '记录这一组数据');
        const refillBtn = h('button', { class: 'go ghost', onclick: () => { S.arm = 0; slider.value = 0; refill(true); ui.status('溢水杯重新装满了水，小桶也倒空了。'); } }, '↺ 重新装满');
        const tryBtn = h('button', { class: 'go ghost', style: 'margin-top:8px', onclick: () => { S.arm = 0; slider.value = 0; refill(false); ui.status('现在溢水杯<b>没有装满</b>。把铝块浸进去，看看 <i>G</i><sub>排</sub> 和 <i>F</i><sub>浮</sub> 还相等吗？'); } }, '试试看：如果溢水杯没装满……');
        ui.controls.append(
          h('div', { class: 'ctl' }, h('div', { class: 'ctl-label' }, '液体'), h('div', { class: 'seg' }, liqBtns)),
          h('div', { class: 'ctl' }, h('div', { class: 'ctl-label' }, '把铝块慢慢放下去（也可以直接拖铝块）'), slider),
          h('div', { class: 'readout' },
            h('div', {}, h('span', {}, '铝块在空气中重 G物'), out.gb),
            h('div', {}, h('span', {}, '测力计示数 F拉'), out.f),
            h('div', {}, h('span', {}, '浮力 F浮 = G物 − F拉'), out.fb),
            h('div', {}, h('span', {}, '排开的液体重 G排'), out.ge)),
          h('div', { class: 'btn-row' }, recBtn, refillBtn), tryBtn);

        const tbody = h('tbody');
        ui.data.append(h('table', { class: 'data' },
          h('thead', {}, h('tr', {}, ...['序号', '小桶重<br><i>G</i><sub>桶</sub>/N', '物体重<br><i>G</i><sub>物</sub>/N', '水中示数<br><i>F</i><sub>拉</sub>/N', '桶+水<br><i>G</i><sub>总</sub>/N', '浮力<br><i>F</i><sub>浮</sub>/N', '排开液体重<br><i>G</i><sub>排</sub>/N'].map((t) => h('th', { html: t })))), tbody),
          h('p', { class: 'note' }, '表格和课本第 70 页的一样：G排 = G总 − G桶。'));
        this._ui = { out };

        const record = () => {
          if (S.dsub <= 0.001) return ui.status('先把铝块浸到液体里，再记录。');
          if (S.lifted) return ui.status('铝块被往上提过：小桶里的水是刚才浸得更深时排开的，比现在排开的多，不能拿来比较。点“↺ 重新装满”（同时倒空小桶），再慢慢往下放。');
          if (S.flow > 1e-7 || flying.length) return ui.status('等水流完、读数稳定了再记录。');
          const gex = S.liquid.rho * G * S.Vb;
          const row = { gb: G_BUCKET, gw: G_BLK, f: S.F, gt: G_BUCKET + gex, fb: S.Fb, ge: gex, full: S.full, liq: S.liquid.name, d: S.dsub };
          if (S.rows.some((r) => Math.abs(r.f - row.f) < 0.02 && r.liq === row.liq && r.full === row.full)) return ui.status('这组和已经记的一样。换个浸入深度，或换一种液体吧。');
          S.rows.push(row);
          tbody.append(h('tr', { class: 'new' }, h('td', {}, String(S.rows.length) + (row.liq !== '水' ? `（${row.liq}）` : '')), ...[row.gb, row.gw, row.f, row.gt, row.fb, row.ge].map((x) => h('td', {}, x.toFixed(2)))));
          const diff = row.fb - row.ge;
          if (!row.full) ui.status(`这次 <i>G</i><sub>排</sub> 比 <i>F</i><sub>浮</sub> 小了 ${diff.toFixed(2)} N——因为溢水杯没装满，有一部分被排开的水留在杯里了。`);
          else ui.status(`<i>F</i><sub>浮</sub> = ${row.fb.toFixed(2)} N，<i>G</i><sub>排</sub> = ${row.ge.toFixed(2)} N。${Math.abs(diff) < 0.03 ? '两者相等！' : ''}`);
          const good = S.rows.filter((r) => r.full).length;
          if (good >= 3) ui.unlock();
          else ui.need(`还需要再记录 ${3 - good} 组（溢水杯装满时）`);
        };
        setLiquid(LIQUIDS[0]);
        ui.status('拖动滑块（或直接拖铝块）把铝块放进水里，看测力计和小桶。');
      },

      update(dt) {
        if (this._slider && !S.dragging) this._slider.value = S.arm;
        step(dt);
        pose();
        const U = this._ui;
        if (U) {
          U.out.gb.innerHTML = `${G_BLK.toFixed(2)}<i>N</i>`;
          U.out.f.innerHTML = `${S.F.toFixed(2)}<i>N</i>`;
          U.out.fb.innerHTML = `${S.Fb.toFixed(2)}<i>N</i>`;
          // 提起过：桶里的水已经不等于现在排开的水，读数立刻标成无效
          U.out.ge.innerHTML = S.lifted ? `<s>${(S.liquid.rho * G * S.Vb).toFixed(2)}</s><i>N 本组无效（提起过，请重新装满）</i>` : `${(S.liquid.rho * G * S.Vb).toFixed(2)}<i>N</i>`;
        }
      },

      pointer: {
        down(ray) {
          if (!ray.intersectObject(block, true).length) return false;
          S.dragging = true;
          return true;
        },
        move(ray) {
          if (!S.dragging) return false;
          const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0).applyMatrix4(group.matrixWorld);
          const hit = new THREE.Vector3();
          if (ray.ray.intersectPlane(plane, hit)) {
            group.worldToLocal(hit);
            // 让铝块中心跟着鼠标走：反推横杆高度
            const armY = hit.y + BLK_H / 2 + 0.207 + STR + S.ext;
            S.arm = Math.min(1, Math.max(0, (armY - ARM_HI) / (ARM_LO - ARM_HI)));
          }
          return true;
        },
        up() { if (!S.dragging) return false; S.dragging = false; return true; },
      },
    };
  },
};
