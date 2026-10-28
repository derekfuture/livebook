// 图3.5-2 煮饺子：厨房里的物态变化。水沸腾后温度稳定在 100 ℃；打开锅盖出现大量“白雾”——水蒸气遇冷液化成小水滴；
// 锅盖内侧有水珠。水沸腾后大火改小火，温度不变、更省燃料。
import * as THREE from 'three';
import { seg, buttons, readout, goals, note } from './kit/ui.js';
import { steam, bubbles } from './kit/fx.js';
import { paint, inked, hull } from '../live/ink.js';

export default {
  id: 'kitchen',
  fig: '图3.5-2',
  title: '跨学科实践：厨房中的物态变化',
  predict: {
    q: '煮饺子时，水已经沸腾了。<br>把大火改成小火（仍保持沸腾），饺子熟得会慢很多吗？',
    hint: '课本第 82–83 页',
    options: ['会，火小了水温就低了', '不会，水沸腾时温度保持不变', '会更快'],
    answer: 1,
  },
  conclusion: {
    quote: '水沸腾后打开锅盖，会出现大量“白雾”；水蒸气接触周围的冷空气或低温物品，会液化成小水滴。',
    why: '“白雾”不是水蒸气（水蒸气是看不见的），而是水蒸气遇冷<b>液化</b>成的小水滴。锅盖内侧的水珠也是液化形成的。水在沸腾后温度保持不变，继续使用大火只会加速水的汽化，浪费水和燃料——所以水沸腾后，应将大火改为小火。',
    src: '课本第 81–83 页 · 第三章 第5节 跨学科实践：探索厨房中的物态变化问题',
  },

  create({ tag }) {
    const group = new THREE.Group();
    // 灶台 + 锅
    const stove = inked(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.16), paint(0x3b4150)));
    stove.position.y = 0.015;
    group.add(stove);
    const fire = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.014, 8), new THREE.MeshBasicMaterial({ color: 0x4aa8ff, transparent: true, opacity: 0.85 }));
      f.position.set(Math.cos(a) * 0.035, 0.036, Math.sin(a) * 0.035);
      group.add(f);
      fire.push(f);
    }
    const potPts = [new THREE.Vector2(0, 0), new THREE.Vector2(0.06, 0), new THREE.Vector2(0.066, 0.006), new THREE.Vector2(0.066, 0.07), new THREE.Vector2(0.069, 0.072)];
    const pot = new THREE.Mesh(new THREE.LatheGeometry(potPts, 40), paint(0x9aa3b2, { side: THREE.DoubleSide }));
    pot.position.y = 0.045;
    hull(pot, 0.0015);
    group.add(pot);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.06, 0.05, 40), paint(0x9fd2ea, { transparent: true, opacity: 0.7 }));
    water.position.y = 0.045 + 0.025;
    group.add(water);
    const dumplings = [];
    for (let i = 0; i < 7; i++) {
      const d = hull(new THREE.Mesh(new THREE.SphereGeometry(0.012, 14, 10), paint(0xf7f1e1)), 0.0012);
      d.scale.set(1.4, 0.6, 0.9);
      const a = (i / 7) * Math.PI * 2;
      d.position.set(Math.cos(a) * 0.035, 0.09, Math.sin(a) * 0.035);
      d.userData.a = a;
      group.add(d);
      dumplings.push(d);
    }
    const lid = new THREE.Group();
    const lidM = hull(new THREE.Mesh(new THREE.SphereGeometry(0.072, 32, 12, 0, Math.PI * 2, 0, 0.5), paint(0xb8c2cf, { transparent: true, opacity: 0.85 })), 0.0015);
    lidM.scale.y = 0.6;
    const knob = hull(new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 10), paint(0x23262e)), 0.001);
    knob.position.y = 0.032;
    lid.add(lidM, knob);
    lid.position.y = 0.112 - 0.038;
    group.add(lid);
    const drops = [];
    for (let i = 0; i < 40; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.0022, 8, 6), paint(0xcfe8f5, { transparent: true, opacity: 0.9 }));
      const a = Math.random() * Math.PI * 2, r = 0.02 + Math.random() * 0.045;
      d.position.set(Math.cos(a) * r, 0.03 - (r / 0.072) ** 2 * 0.02, Math.sin(a) * r);
      d.scale.y = 1.3;
      d.visible = false;
      lid.add(d);
      drops.push(d);
    }
    const bub = bubbles({ r: 0.055, max: 200 });
    bub.mesh.position.y = 0.046;
    group.add(bub.mesh);
    const fog = steam({ max: 260 });
    group.add(fog.mesh);
    const tT = tag('', 'pill big'), tFog = tag('“白雾”＝小水滴（液化）', 'pill');

    const S = { fire: 0, lid: true, T: 30, gas: 0, wet: 0, boilBig: 0, boilSmall: 0, saw: new Set() };
    let G = null;

    return {
      group,
      size: { w: 0.22, d: 0.18, h: 0.2 },
      view: { elev: 24, azim: -14, lookY: 0.45, margin: 1.15 },
      mount(ui) {
        const out = readout([{ key: 'T', label: '水温', unit: '℃' }, { key: 'g', label: '已用燃气（相对）' }]);
        const fire = seg('火力', ['关火', '小火', '大火'], (_, k) => { S.fire = k; });
        const lidSel = seg('锅盖', ['盖上', '打开'], (_, k) => { S.lid = k === 0; if (!S.lid && S.T > 98) { S.saw.add('fog'); G.goal.done('fog'); ui.status('打开锅盖，冒出大量“白雾”：水蒸气遇到冷空气，<b>液化</b>成了小水滴。'); } if (!S.lid && S.wet > 0.3) { S.saw.add('drop'); G.goal.done('drop'); } });
        ui.controls.append(fire.el, lidSel.el, out.el, note('时间加快了。注意看锅盖内侧和打开锅盖时冒出的“白雾”。'));
        G = { out, ui, goal: goals(ui, [['boil', '把水烧开'], ['small', '水开后改小火，看水温变不变'], ['fog', '水开后打开锅盖'], ['drop', '看看锅盖内侧']]) };
        this._G = G;
        ui.status('开大火，把水烧开。');
      },
      update(dt, t) {
        const P = [0, 1.6, 4.2][S.fire];
        S.gas += P * dt * 0.05;
        const loss = (S.T - 25) * (S.lid ? 0.02 : 0.05);
        S.T = Math.min(100, S.T + (P - loss) * dt * 1.2);
        const boiling = S.T >= 99.95 && P > loss + 0.01;
        if (boiling && S.fire === 2) S.boilBig += dt;
        if (boiling && S.fire === 1) S.boilSmall += dt;
        const vaporRate = boiling ? (S.fire === 2 ? 60 : 20) : S.T > 70 ? (S.T - 70) * 0.4 : 0;
        if (S.lid) S.wet = Math.min(1, S.wet + vaporRate * dt * 0.004);
        drops.forEach((d, i) => { d.visible = i / drops.length < S.wet; });
        lid.visible = S.lid;
        fire.forEach((f, i) => { f.visible = S.fire > 0; f.scale.setScalar(S.fire === 2 ? 1.5 : 0.8); f.scale.y *= 1 + 0.2 * Math.sin(t * 20 + i); });
        bub.update(dt, { level: 0.05, rate: boiling ? (S.fire === 2 ? 90 : 35) : S.T > 85 ? 6 : 0, grow: boiling });
        fog.update(dt, { rate: !S.lid && S.T > 90 ? vaporRate * 0.8 : S.lid && S.T > 95 ? 4 : 0, origin: new THREE.Vector3(0, S.lid ? 0.13 : 0.1, 0), spread: S.lid ? 0.01 : 0.11, up: 0.06, size: 0.03 });
        for (const d of dumplings) { d.userData.a += dt * (boiling ? (S.fire === 2 ? 1.4 : 0.6) : 0.05); d.position.x = Math.cos(d.userData.a) * 0.035; d.position.z = Math.sin(d.userData.a) * 0.035; d.position.y = 0.09 + (boiling ? Math.sin(t * 6 + d.userData.a * 3) * 0.003 : 0); }
        tT.loc(group, 0.09, 0.14, 0).text(`${S.T.toFixed(0)} ℃`);
        tFog.loc(group, -0.04, 0.2, 0).show(!S.lid && S.T > 95);
        const G = this._G;
        if (!G) return;
        G.out.set('T', S.T, 1); G.out.set('g', S.gas, 1);
        if (S.boilBig > 1.5) G.goal.done('boil');
        if (S.boilBig > 1.5 && S.boilSmall > 3 && !G._small) { G._small = true; G.goal.done('small'); G.ui.status('改成小火后水仍在沸腾，水温还是 100 ℃——饺子照样熟，燃气却用得少多了。'); }
      },
      dispose() { bub.dispose(); fog.dispose(); },
    };
  },
};
