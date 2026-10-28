// 图3.4-1 观察碘的物态变化：封闭的玻璃容器（碘锤）中有少量碘颗粒。浇热水 → 紫色碘蒸气（升华，吸热）；
// 浇冷水 → 容器壁上出现碘的固体颗粒（凝华，放热）。热水的温度（约 80 ℃）低于碘的熔点（约 114 ℃），所以碘不会先熔化。
import * as THREE from 'three';
import { buttons, readout, goals, note } from './kit/ui.js';
import { Particles } from './kit/fx.js';
import { paint, hull, glassEdge } from '../live/ink.js';

export default {
  id: 'iodine',
  fig: '图3.4-1',
  title: '观察碘的物态变化',
  predict: {
    q: '给装有碘颗粒的封闭玻璃容器浇热水（约 80 ℃）。<br>碘会怎样变化？（碘的熔点约 114 ℃）',
    hint: '课本第 77 页「问题」',
    options: ['先熔化成液体，再变成气体', '直接变成紫色的碘蒸气', '没有任何变化'],
    answer: 1,
  },
  conclusion: {
    quote: '物理学中将物质从固态直接变成气态的过程叫作升华，从气态直接变成固态的过程叫作凝华。',
    why: '热水的温度低于碘的熔点，碘不会熔化，却变成了紫色的碘蒸气——这是<b>升华</b>；浇冷水后，碘蒸气在容器壁上直接变成了固态的碘——这是<b>凝华</b>。像熔化和汽化一样，升华也要吸热；像凝固和液化一样，凝华也会放热。衣柜里的樟脑片变小、冬天结冰的衣服变干，是升华；霜、雾凇、窗上的冰花，是凝华。',
    src: '课本第 77–78 页 · 第三章 第4节 升华和凝华',
  },

  create({ tag }) {
    const group = new THREE.Group();
    // 碘锤：两头鼓起的玻璃管，横着放
    const pts = [];
    // 沿 y 方向的旋转体轮廓：两端是半径 0.028 的球泡，中间是半径 0.012 的管
    for (let i = 0; i <= 80; i++) {
      const y = -0.08 + (i / 80) * 0.16;
      const end = 0.08 - 0.028;
      let r = 0.012;
      if (Math.abs(y) > end - 0.02) { const d = Math.abs(y) - end; r = Math.max(0.012, Math.sqrt(Math.max(0, 0.028 * 0.028 - d * d))); }
      if (Math.abs(y) > 0.0795) r = 0.001;
      pts.push(new THREE.Vector2(r, y));
    }
    const geo = new THREE.LatheGeometry(pts, 40);
    const glass = new THREE.Mesh(geo, paint(0xdff1f8, { unique: true, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
    glass.rotation.z = Math.PI / 2;
    glass.position.y = 0.06;
    glass.renderOrder = 8;
    glassEdge(glass, 0.0008);
    group.add(glass);
    // 支架
    for (const x of [-0.052, 0.052]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.03, 8), paint(0x9aa3b2));
      p.position.set(x, 0.015, 0);
      group.add(p);
    }
    // 碘颗粒（底部的固体）
    const grains = [];
    for (let i = 0; i < 30; i++) {
      const g = new THREE.Mesh(new THREE.OctahedronGeometry(0.0022), paint(0x3a2a4a));
      const side = i % 2 ? 1 : -1;     // 碘颗粒在两端的球泡底部
      g.position.set(side * (0.052 + (Math.random() - 0.5) * 0.02), 0.06 - 0.022 + Math.random() * 0.004, (Math.random() - 0.5) * 0.02);
      g.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      group.add(g);
      grains.push(g);
    }
    // 壁上的凝华颗粒
    const deposits = new Particles({ max: 200, geometry: new THREE.OctahedronGeometry(1), material: new THREE.MeshBasicMaterial({ color: 0x4a3060 }) });
    group.add(deposits.mesh);
    // 紫色蒸气
    const vapor = new Particles({ max: 320, sprite: true, color: 0x9a3ff0 });
    group.add(vapor.mesh);
    // 浇水的效果：水流
    const pour = new Particles({ max: 120, geometry: new THREE.SphereGeometry(1, 6, 4), material: new THREE.MeshBasicMaterial({ color: 0x8fd0ef, transparent: true, opacity: 0.7 }) });
    group.add(pour.mesh);
    const tT = tag('', 'pill');

    const S = { solid: 1, vapor: 0, T: 22, mode: null, pourT: 0, deposited: 0, sublimated: false, depositedSeen: false };
    let G = null;
    const tmp = new THREE.Vector3();

    return {
      group,
      size: { w: 0.2, d: 0.1, h: 0.12 },
      view: { elev: 18, azim: -10, lookY: 0.5, margin: 1.1 },
      mount(ui) {
        const out = readout([{ key: 'T', label: '容器的温度', unit: '℃' }, { key: 's', label: '碘的状态' }]);
        const btn = buttons([{ text: '浇热水（约 80 ℃）', onClick: () => { S.mode = 'hot'; S.pourT = 2.5; } }, { text: '浇冷水', ghost: true, onClick: () => { S.mode = 'cold'; S.pourT = 2.5; } }]);
        ui.controls.append(btn.el, out.el, note('碘的熔点约 114 ℃，沸点约 184 ℃。'));
        G = { out, ui, goal: goals(ui, [['sub', '浇热水，观察升华'], ['dep', '再浇冷水，观察凝华']]) };
        this._G = G;
        ui.status('容器底部有少量紫黑色的碘颗粒。');
      },
      update(dt) {
        // 浇水：改变环境温度
        if (S.pourT > 0) {
          S.pourT -= dt;
          for (let i = 0; i < 3; i++) pour.spawn({ p: new THREE.Vector3(-0.06 + Math.random() * 0.12, 0.12, (Math.random() - 0.5) * 0.02), v: new THREE.Vector3(0, -0.2, 0), size: 0.0018, life: 0.5 });
        }
        pour.update(dt, (p, d) => { p.v.y -= 0.6 * d; p.p.addScaledVector(p.v, d); return p.p.y > 0.03; });
        const env = S.mode === 'hot' && S.pourT > -6 ? 80 : S.mode === 'cold' && S.pourT > -6 ? 8 : 22;
        S.T += (env - S.T) * (1 - Math.exp(-dt * 0.8));
        // 升华速率随温度；凝华在冷的时候发生
        if (S.T > 45 && S.solid > 0) { const r = Math.min(S.solid, dt * 0.06 * (S.T - 45) / 35); S.solid -= r; S.vapor += r; }
        if (S.T < 30 && S.vapor > 0) { const r = Math.min(S.vapor, dt * 0.12 * (30 - S.T) / 22); S.vapor -= r; S.deposited += r; for (let k = 0; k < r * 400; k++) {
          const a = Math.random() * Math.PI * 2, x = -0.075 + Math.random() * 0.15;
          const ax = Math.abs(x), rr = ax > 0.03 ? Math.sqrt(Math.max(0, 0.027 ** 2 - (ax - 0.052) ** 2)) : 0.0115;
          deposits.spawn({ p: new THREE.Vector3(x, 0.06 + Math.cos(a) * rr, Math.sin(a) * rr), v: new THREE.Vector3(), size: 0.0008 + Math.random() * 0.0008, life: 1e9, rot: new THREE.Quaternion().random() });
        } }
        deposits.update(dt, () => true);
        grains.forEach((g, i) => { g.visible = i / grains.length < S.solid; });
        // 蒸气粒子：数量 ∝ 蒸气量
        const want = Math.round(S.vapor * 240);
        while (vapor.list.length < want) { const sd = Math.random() < 0.5 ? -1 : 1; vapor.spawn({ p: new THREE.Vector3(sd * 0.052, 0.06 + (Math.random() - 0.5) * 0.03, (Math.random() - 0.5) * 0.03), v: new THREE.Vector3().randomDirection().multiplyScalar(0.012), size: 0.03, life: 1e9, alpha: 0.6 }); }
        while (vapor.list.length > want) vapor.list.pop();
        vapor.update(dt, (p, d) => {
          p.p.addScaledVector(p.v, d);
          // 在碘锤内部来回运动：中间管半径 0.011，两端球泡半径 0.026
          const ax = Math.abs(p.p.x), R = ax > 0.03 ? 0.025 : 0.01;
          tmp.set(ax > 0.03 ? p.p.x - Math.sign(p.p.x) * 0.052 : 0, p.p.y - 0.06, p.p.z);
          if (ax <= 0.03) tmp.x = 0;
          if (tmp.length() > R) { p.v.reflect(tmp.normalize()); p.p.addScaledVector(tmp, -0.002); }
          if (ax > 0.076) p.v.x = -Math.sign(p.p.x) * Math.abs(p.v.x);
          return true;
        });
        // 碘蒸气多了，整个容器里都是紫色
        glass.material.color.setRGB(0.87 - S.vapor * 0.35, 0.94 - S.vapor * 0.7, 0.97 - S.vapor * 0.1);
        glass.material.opacity = 0.22 + S.vapor * 0.35;
        tT.loc(group, 0, 0.1, 0).text(`${S.T.toFixed(0)} ℃`);
        const G = this._G;
        if (!G) return;
        G.out.set('T', S.T, 0);
        G.out.set('s', S.vapor > 0.05 && S.T > 40 ? '固态 → 气态（升华）' : S.deposited > 0.05 && S.T < 30 ? '气态 → 固态（凝华）' : S.solid > 0.99 ? '固态' : '');
        if (S.vapor > 0.3 && !S.sublimated) { S.sublimated = true; G.goal.done('sub'); G.ui.status('碘没有熔化，直接变成了紫色的碘蒸气——<b>升华</b>。'); }
        if (S.sublimated && S.deposited > 0.25 && !S.depositedSeen) { S.depositedSeen = true; G.goal.done('dep'); G.ui.status('碘蒸气在冷的容器壁上直接变成了固态的碘——<b>凝华</b>。'); }
      },
      dispose() { deposits.dispose(); vapor.dispose(); pour.dispose(); },
    };
  },
};
