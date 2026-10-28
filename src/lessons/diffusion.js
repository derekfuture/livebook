// 图13.2-3 气体扩散实验装置 / 墨水扩散快慢与温度的关系。
//   ① 下面的瓶子装红棕色的二氧化氮（密度比空气大），上面倒扣一个装空气的瓶子，中间隔一块玻璃板。抽掉玻璃板，两种气体慢慢混合，颜色变均匀。
//      也可以把两个瓶子上下对调（二氧化氮在上）——那样即使混合了，也说明不了是分子在运动（可能是二氧化氮重、自己往下掉）。
//   ② 一杯热水、一杯冷水，各滴一滴墨水，比较扩散的快慢。
// 直接操作：拖玻璃板把它抽出来；点滴管滴墨水。面板也有。画面里的小点是“分子”的示意，实际看不见。
// 模型：每个“分子”做随机行走（布朗运动式），步长 ∝ √T；二氧化氮分子受一点重力偏移。墨水用粒子扩散，热水的扩散系数约是冷水的 3 倍（示意）。
import * as THREE from 'three';
import { seg, buttons, goals, note } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { paint, inked, hull } from '../live/ink.js';

const BR = 0.03, BH = 0.07, N = 700;

export default {
  id: 'diffusion',
  fig: '图13.2-3',
  title: '扩散现象',
  stampText: '观察',
  predict: {
    q: '二氧化氮的密度比空气大，装在<b>下面</b>的瓶子里。抽掉中间的玻璃板，上面的瓶子里——',
    hint: '课本第 9 页「演示」',
    options: ['一直是无色的（二氧化氮重，上不去）', '也慢慢变成红棕色', '上面的空气会全部沉到下面'],
    answer: 1,
  },
  conclusion: {
    page: 15, rect: [62, 282, 362, 346],
    quote: '由实验可以看到，两个瓶子内的气体会混合在一起，最后颜色变得均匀。像这样，不同的物质在互相接触时彼此进入对方的现象，叫作扩散。……扩散现象也可以发生在液体之间。',
    why: '二氧化氮比空气重，却能“跑”到上面的瓶子里，说明这不是重力造成的，而是分子在不停地做无规则运动，彼此进入了对方。把二氧化氮放在上面就不好：混合了也可能是它自己掉下去的，不能说明分子在运动。墨水在热水中扩散得快，说明温度越高，分子的无规则运动越剧烈——所以这种运动叫作分子的热运动。（画面里的小点只是示意，真实的分子小到看不见。）',
    src: '课本第 8–9 页 · 第十三章 第2节 分子动理论的初步知识',
  },

  create({ tag, reframe }) {
    const group = new THREE.Group();
    const S = { scene: 'gas', plate: 1, top: 'air', t: 0, seen: new Set(), inkHot: null, inkCold: null };
    let W = null;
    const status = (m) => W?.status(m);
    const glassMat = () => paint(0xd6ecf5, { unique: true, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });

    // ================= ① 气体扩散 =================
    const gasG = new THREE.Group();
    const Y0 = 0.01, YM = Y0 + BH, Y1 = YM + 0.004 + BH;      // 下瓶底、瓶口相接处、上瓶顶
    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(BR, BR, BH, 32, 1, true), glassMat()); b1.position.y = Y0 + BH / 2;
    const b2 = new THREE.Mesh(new THREE.CylinderGeometry(BR, BR, BH, 32, 1, true), glassMat()); b2.position.y = YM + 0.004 + BH / 2;
    const bot = new THREE.Mesh(new THREE.CircleGeometry(BR, 32), glassMat()); bot.rotation.x = -Math.PI / 2; bot.position.y = Y0;
    const topC = new THREE.Mesh(new THREE.CircleGeometry(BR, 32), glassMat()); topC.rotation.x = Math.PI / 2; topC.position.y = Y1;
    const fill = [0, 1].map((k) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(BR * 0.97, BR * 0.97, BH * 0.98, 32), new THREE.MeshBasicMaterial({ color: 0xa04a20, transparent: true, opacity: 0, depthWrite: false })); m.position.y = k ? YM + 0.004 + BH / 2 : Y0 + BH / 2; gasG.add(m); return m; });
    const plate = inked(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.003, 0.09), paint(0xcfe6f0, { unique: true, transparent: true, opacity: 0.7 })), { width: 1 });
    plate.position.y = YM + 0.002;
    gasG.add(b1, b2, bot, topC, plate);
    const mol = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0011, 5, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), N);
    mol.frustumCulled = false;     // 实例位置会变，包围球不准
    mol.raycast = () => {}; gasG.add(mol);
    const P = [];
    const resetGas = () => {
      P.length = 0;
      for (let i = 0; i < N; i++) {
        const no2 = i < N / 2;
        const inTop = S.top === 'no2' ? no2 : !no2;
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * BR * 0.92;
        P.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, y: inTop ? YM + 0.004 + Math.random() * BH : Y0 + Math.random() * BH, no2 });
      }
      S.plate = 1; S.t = 0;
      const c = new THREE.Color();
      P.forEach((p, i) => mol.setColorAt(i, c.setHex(p.no2 ? 0xb4501e : 0xc9d3dc)));
      mol.instanceColor.needsUpdate = true;
    };
    resetGas();
    const tTop = tag('', 'pill'), tBot = tag('', 'pill');
    group.add(gasG);

    // ================= ② 墨水 =================
    const inkG = new THREE.Group();
    const cups = [{ x: -0.05, hot: true, label: '热水' }, { x: 0.05, hot: false, label: '冷水' }].map((c) => {
      const g = new THREE.Group(); g.position.x = c.x;
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.028, 0.07, 32, 1, true), glassMat()); wall.position.y = 0.035;
      const water = new THREE.Mesh(new THREE.CylinderGeometry(0.0285, 0.027, 0.055, 32), new THREE.MeshBasicMaterial({ color: c.hot ? 0xe9f2f6 : 0xdcecf6, transparent: true, opacity: 0.4, depthWrite: false })); water.position.y = 0.0285;
      const cloud = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0009, 5, 4), new THREE.MeshBasicMaterial({ color: 0x1e3a8a, transparent: true, opacity: 0.35, depthWrite: false }), 1500);
      cloud.count = 0; cloud.raycast = () => {}; cloud.frustumCulled = false; cloud.renderOrder = 5;     // 实例是后来才加的，包围球不准，别让它被裁掉
      const dropper = new THREE.Group();
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0015, 0.04, 10), paint(0xd6ecf5, { unique: true, transparent: true, opacity: 0.6 })); tube.position.y = 0.02;
      const bulbD = hull(new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 10), paint(0x2b2f3a)), 0.001); bulbD.position.y = 0.044; bulbD.scale.y = 1.4;
      dropper.add(tube, bulbD); dropper.position.set(0, 0.075, 0);
      g.add(wall, water, cloud, dropper);
      if (c.hot) { for (let k = 0; k < 3; k++) { const st = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0008, 6, 16, Math.PI), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })); st.position.set(-0.012 + k * 0.012, 0.085, 0); st.rotation.y = Math.PI / 2; g.add(st); } }
      inkG.add(g);
      tag(`${c.label}（${c.hot ? 80 : 10} ℃）`, 'pill').loc(inkG, c.x, 0.0, 0.04);
      return { ...c, g, cloud, dropper, pts: [], dropped: false };
    });
    group.add(inkG);

    const setScene = (k) => { if (S.scene !== k) reframe?.(); S.scene = k; gasG.visible = k === 'gas'; inkG.visible = k === 'ink'; tTop.loc(group, 0, -9, 0); tBot.loc(group, 0, -9, 0); };
    setScene('gas');
    const pullPlate = () => { if (S.plate < 1) return; S.pulling = true; status('抽掉玻璃板……仔细看两个瓶子里的颜色。'); };
    const drop = (c) => { if (c.dropped) return; c.dropped = true; c.pts = Array.from({ length: 1500 }, () => ({ x: (Math.random() - 0.5) * 0.003, y: 0.052 + (Math.random() - 0.5) * 0.003, z: (Math.random() - 0.5) * 0.003, vy: -0.03 })); c.t = 0; };
    const pointer = draggable(group, [
      { obj: plate, plane: 'xz', offset: YM + 0.002, keepOffset: true, hint: '往外拖：抽掉玻璃板', onDrag: (p) => { if (S.plate < 1 && S.plate > 0) return; plate.position.x = clamp(p.x, 0, 0.12); if (plate.position.x > 0.06) { S.plate = 0; plate.visible = false; status('玻璃板抽掉了……仔细看两个瓶子里的颜色。'); } } },
    ], { tip: tag('', 'pill'), taps: cups.map((c) => ({ obj: c.dropper, hint: '点一下：滴一滴墨水', onTap: () => { drop(c); if (cups.every((x) => x.dropped)) status('两个烧杯里都滴了墨水。比比哪杯扩散得快。'); else status(`往${c.label}里滴了一滴墨水。再往另一杯里也滴一滴（越接近同时越好）。`); } })) });

    const m4 = new THREE.Matrix4();
    return {
      group,
      size: { w: 0.2, d: 0.1, h: 0.18 },
      view: { elev: 10, azim: 0, lookY: 0.5, margin: 1.15 },
      pointer,
      mount(ui) {
        const sc = seg('做哪个', ['① 气体的扩散', '② 墨水在热水、冷水中'], (_, k) => { setScene(k ? 'ink' : 'gas'); order.el.hidden = !!k; status(k ? '<b>点滴管</b>，往两个烧杯里各滴一滴墨水。' : '<b>把中间的玻璃板往外拖</b>，抽掉它。'); });
        const order = seg('二氧化氮装在', ['下面的瓶子', '上面的瓶子'], (_, k) => { S.top = k ? 'no2' : 'air'; plate.visible = true; plate.position.x = 0; resetGas(); wq.el.hidden = true; S.seen.delete('wrongAsk'); status(k ? '这回把二氧化氮装在<b>上面</b>的瓶子里。抽掉玻璃板看看。' : '二氧化氮在下面。'); });
        const wq = buttons(['不能：二氧化氮比空气重，它往下沉也会混合', '能：说明分子在不停地运动'].map((t, j) => ({ text: t, ghost: true, onClick: () => { if (j) return status('想一想：二氧化氮比空气重。就算分子不运动，它会不会自己沉到下面去？'); wq.el.hidden = true; W.goal.done('wrong'); status('对。二氧化氮在上面时，混合可能只是因为它重、往下沉，不能<b>单凭这个现象</b>证明分子在运动。所以课本把密度大的二氧化氮放在<b>下面</b>：它“往上跑”只能是分子运动造成的。'); } })));
        wq.el.hidden = true;
        const btns = buttons([{ text: '抽掉玻璃板', ghost: true, onClick: () => { S.plate = 0; plate.visible = false; status('玻璃板抽掉了……仔细看两个瓶子里的颜色。'); } }, { text: '重新放好', ghost: true, onClick: () => { plate.visible = true; plate.position.x = 0; resetGas(); } }, { text: '两杯同时滴墨水', ghost: true, onClick: () => cups.forEach(drop) }, { text: '换两杯清水', ghost: true, onClick: () => { cups.forEach((c) => { c.dropped = false; c.pts = []; c.cloud.count = 0; c.t = 0; }); S.seen.delete('inkAsk'); W.hideInk?.(); } }]);
        ui.controls.append(sc.el, note('直接动手：<b>拖玻璃板</b>把它抽出来；<b>点滴管</b>滴墨水。小点是“分子”的示意。'), order.el, btns.el, wq.el);
        const iq = buttons(['热水里的散得快', '冷水里的散得快', '差不多'].map((t, j) => ({ text: t, ghost: true, onClick: () => {
          if (j) return status('再看看两个烧杯：哪一杯里的墨水已经散开、颜色更均匀？');
          iq.el.hidden = true; W.goal.done('ink');
          status('对：热水里的墨水很快散开了，冷水里的还聚成一团。<b>温度越高，扩散越快</b>——分子的无规则运动越剧烈。');
        } })));
        iq.el.hidden = true;
        ui.controls.append(iq.el);
        W = { hideInk: () => { iq.el.hidden = true; }, askInk: () => { iq.el.hidden = false; status('两杯都滴了墨水。比一比：哪一杯里的墨水散得快？'); }, askWrong: () => { wq.el.hidden = false; status('两个瓶子也混合了。可是二氧化氮在上面——这样的混合，能说明分子在运动吗？'); }, status: (m) => ui.status(m), goal: goals(ui, [['gas', '① 抽掉玻璃板，看二氧化氮能不能进入上面的瓶子'], ['wrong', '① 想一想：为什么二氧化氮要放在下面'], ['ink', '② 比较墨水在热水和冷水中扩散的快慢']]) };
        ui.status('下面的瓶子里是红棕色的二氧化氮，上面是空气，中间隔着玻璃板。<b>把玻璃板往外拖</b>，抽掉它。');
      },
      update(dt) {
        const h = Math.min(dt, 1 / 30);
        // ---- ① ----
        if (S.scene === 'gas') {
          if (S.plate === 0) S.t += h;
          let topN = 0, botN = 0;
          const step = 0.009;
          P.forEach((p, i) => {
            const wasTop = p.y > YM + 0.002;          // 走这一步之前在哪个瓶子里（玻璃板挡着时不能跨过去）
            p.x += (Math.random() - 0.5) * step; p.z += (Math.random() - 0.5) * step; p.y += (Math.random() - 0.5) * step - (p.no2 ? 0.000006 : 0);
            const r = Math.hypot(p.x, p.z); if (r > BR * 0.95) { p.x *= (BR * 0.95) / r; p.z *= (BR * 0.95) / r; }
            const lo = S.plate === 1 ? (wasTop ? YM + 0.004 : Y0) : Y0, hi = S.plate === 1 ? (wasTop ? Y1 : YM) : Y1;
            p.y = clamp(p.y, lo + 0.001, hi - 0.001);
            if (p.no2) { if (p.y > YM + 0.002) topN++; else botN++; }
            m4.makeTranslation(p.x, p.y, p.z); mol.setMatrixAt(i, m4);
          });
          mol.instanceMatrix.needsUpdate = true;
          const tot = N / 2;
          fill[0].material.opacity = (botN / tot) * 0.55; fill[1].material.opacity = (topN / tot) * 0.55;
          const nTop = S.top === 'no2' ? botN : topN;      // 进入原来装空气的那个瓶子的二氧化氮
          tTop.loc(group, BR + 0.03, YM + BH / 2, 0).text(S.top === 'no2' ? '二氧化氮' : '空气'); tBot.loc(group, BR + 0.03, Y0 + BH / 2, 0).text(S.top === 'no2' ? '空气' : '二氧化氮');
          if (S.plate === 0 && S.top === 'no2' && nTop / tot > 0.25 && !S.seen.has('wrongAsk')) { S.seen.add('wrongAsk'); W?.askWrong(); }
          if (S.plate === 0 && S.top === 'air' && nTop / tot > 0.25 && !S.seen.has('gas')) { S.seen.add('gas'); W?.goal.done('gas'); status('上面的瓶子也变成了红棕色，两个瓶子的颜色越来越均匀——二氧化氮比空气重，却进入了上面的瓶子：这是<b>扩散</b>，说明分子在不停地运动。'); }
        }
        // ---- ② ----
        if (S.scene === 'ink') {
          for (const c of cups) {
            if (!c.dropped) continue;
            c.t = (c.t || 0) + h;
            const s = (c.hot ? 0.0016 : 0.0005);
            c.pts.forEach((p, i) => {
              if (p.vy) { p.y += p.vy * h; p.vy *= 0.9; if (Math.abs(p.vy) < 0.002) p.vy = 0; }
              p.x += (Math.random() - 0.5) * s; p.y += (Math.random() - 0.5) * s; p.z += (Math.random() - 0.5) * s;
              const r = Math.hypot(p.x, p.z); if (r > 0.026) { p.x *= 0.026 / r; p.z *= 0.026 / r; }
              p.y = clamp(p.y, 0.003, 0.055);
              m4.makeTranslation(p.x, p.y, p.z); c.cloud.setMatrixAt(i, m4);
            });
            c.cloud.count = c.pts.length; c.cloud.instanceMatrix.needsUpdate = true;
          }
          if (cups.every((c) => c.dropped && c.t > 5) && !S.seen.has('inkAsk')) { S.seen.add('inkAsk'); W?.askInk(); }
        }
      },
      debug: { S },
    };
  },
};
