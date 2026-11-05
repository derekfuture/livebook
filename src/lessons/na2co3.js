// 课题3 常见的盐 · 实验 10-11 碳酸钠与稀盐酸反应（课本下册第 80 页图 10-19）。
//
// 向盛有 0.5 g 碳酸钠的试管中加入 2 mL 稀盐酸，迅速用带导管的橡胶塞塞紧试管口，导管另一端插入盛有澄清石灰水的试管中。
// 再用碳酸氢钠代替碳酸钠做一遍。
// 模型：稀盐酸按约 1 mol/L 计，2 mL 含 2 mmol HCl。Na₂CO₃ + 2HCl ══ 2NaCl + CO₂↑ + H₂O：0.5 g（4.7 mmol）过量，放出 1 mmol CO₂（约 24 mL）；
//   NaHCO₃ + HCl ══ NaCl + CO₂↑ + H₂O：0.5 g（6 mmol）过量，放出 2 mmol（约 48 mL），而且反应更快、更剧烈。
//   塞子塞得慢，开始的二氧化碳从试管口跑掉；澄清石灰水约 4.5 mL 二氧化碳就明显变浑浊。
import * as THREE from 'three';
import { buttons, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { stand, textPlate } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { testTube, stopper, glassTube, tubeClamp, glassMat, CHEM } from './kit/chem.js';
import { water2, bubble2, milky } from './kit/chemfx.js';
import { micro, carbonateScene } from './kit/microworld.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const TUBE = new THREE.Vector3(-0.06, 0.03, 0), T_R = 0.009, T_LEN = 0.12;
const LIME = new THREE.Vector3(0.06, 0.012, 0.0), L_R = 0.008, L_LEN = 0.11;
const PLUG_HOME = new THREE.Vector3(-0.06, 0.178, 0), CYL_HOME = new THREE.Vector3(-0.1, 0, 0.07);
const SALT = { na2co3: { name: '碳酸钠', f: 'Na₂CO₃', co2: 24, k: 0.1, eq: 'Na₂CO₃ + 2HCl ══ 2NaCl + CO₂↑ + H₂O' }, nahco3: { name: '碳酸氢钠', f: 'NaHCO₃', co2: 48, k: 0.2, eq: 'NaHCO₃ + HCl ══ NaCl + CO₂↑ + H₂O' } };
const LIME_CO2 = 4.5;

export default {
  id: 'na2co3',
  fig: '图10-19',
  title: '碳酸钠与稀盐酸反应',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '碳酸钠和稀盐酸反应，生成的气体通入澄清石灰水，会怎样？',
    hint: '课本第 80 页：碳酸钙和稀盐酸反应生成二氧化碳。碳酸钠也含有“碳酸根”。',
    options: ['产生大量气泡，石灰水变浑浊', '没有现象', '石灰水变红'],
    answer: 0,
  },
  need: '向 0.5 g 碳酸钠中加入 2 mL 稀盐酸，迅速塞紧带导管的橡胶塞，导管插入澄清石灰水；再用碳酸氢钠做一遍',
  conclusion: {
    crops: [{ page: 84, rect: [42, 226, 169, 355] }],
    quote: '上述反应可以用化学方程式表示如下：Na₂CO₃ + 2HCl ══ 2NaCl + CO₂↑ + H₂O　NaHCO₃ + HCl ══ NaCl + CO₂↑ + H₂O',
    formula: 'Na₂CO₃ + 2HCl ══ 2NaCl + CO₂↑ + H₂O',
    why: '碳酸钠、碳酸氢钠都能和稀盐酸反应，<b>产生大量气泡</b>，生成的气体使澄清石灰水<b>变浑浊</b>——是<b>二氧化碳</b>。碳酸氢钠反应得更剧烈。<br>含有碳酸根（CO₃²⁻）或碳酸氢根（HCO₃⁻）的盐都能和稀盐酸反应放出二氧化碳——这是检验碳酸盐的方法：取样，加稀盐酸，把生成的气体通入澄清石灰水。',
    src: '课本下册第 80 页 · 第十单元 课题3 常见的盐（实验 10-11）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); else bar.caption(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };

    paperSheet(group, { w: 0.28, d: 0.16, x: 0, z: 0.02 });
    const st = stand({ height: 0.24, baseW: 0.1, baseD: 0.07 }); st.position.set(TUBE.x - 0.055, 0, -0.025); group.add(st);
    st.clamp(TUBE.y + 0.08, 0.055);
    const tube = testTube({ r: T_R, len: T_LEN }); tube.position.copy(TUBE); group.add(tube);
    const jaw = tubeClamp(T_R + 0.001); jaw.position.y = 0.08; tube.add(jaw);
    const solid = new THREE.Mesh(new THREE.CylinderGeometry(T_R - 0.001, T_R - 0.001, 0.006, 18), paint(0xf6f6f2)); solid.position.y = 0.004; tube.add(solid);
    const liq = new THREE.Mesh(new THREE.CylinderGeometry(T_R - 0.0008, T_R - 0.0008, 1, 18), water2({ color: 0xe4eef2, base: 0.35 })); liq.geometry.translate(0, 0.5, 0); liq.position.y = 0.0012; liq.scale.y = 0.0001; liq.renderOrder = 7; tube.add(liq);
    const tlab = textPlate('碳酸钠 0.5 g', { w: 0.028, h: 0.0072, color: '#23293a', bg: '#fffaf0', font: 'bold 70px "Songti SC", serif' }); tlab.position.set(TUBE.x, 0.004, 0.03); tlab.rotation.x = -Math.PI / 2; group.add(tlab);
    const MOUTH = TUBE.clone().add(new THREE.Vector3(0, T_LEN, 0));
    const plug = stopper({ r1: T_R - 0.0004, r2: T_R + 0.0016, h: 0.016 }); group.add(plug);
    const plugTube = glassTube([new THREE.Vector3(0, 0.006, 0), new THREE.Vector3(0, 0.04, 0), new THREE.Vector3(0.012, 0.05, 0), new THREE.Vector3(LIME.x - MOUTH.x - 0.012, 0.05, 0), new THREE.Vector3(LIME.x - MOUTH.x, 0.04, 0), new THREE.Vector3(LIME.x - MOUTH.x, LIME.y + 0.012 - MOUTH.y + 0.01, 0)], { r: 0.0018 }); plug.add(plugTube);
    const plugPick = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.03, 10), new THREE.MeshBasicMaterial({ visible: false })); plugPick.position.y = 0.01; plugPick.userData.pick = true; plug.add(plugPick);
    // 石灰水试管（在试管架上）
    const lime = testTube({ r: L_R, len: L_LEN }); lime.position.copy(LIME); group.add(lime);
    const limeLiq = new THREE.Mesh(new THREE.CylinderGeometry(L_R - 0.0008, L_R - 0.0008, 0.045, 18), water2({ color: 0xe6f0f2, base: 0.35 })); limeLiq.position.y = 0.024; limeLiq.renderOrder = 7; lime.add(limeLiq);
    const milk = milky(limeLiq);
    const rack = inked(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.026), paint(0xd9c9a6)), { width: 0.5 }); rack.position.set(LIME.x, 0.003, 0); group.add(rack);
    for (const sx of [-1, 1]) { const p = inked(new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.06, 0.022), paint(0xd9c9a6)), { width: 0.4 }); p.position.set(LIME.x + sx * 0.0135, 0.03, 0); group.add(p); }
    const ll = textPlate('澄清石灰水', { w: 0.026, h: 0.0072, color: '#23293a', bg: 'rgba(0,0,0,0)', font: 'bold 70px "Songti SC", serif' }); ll.rotation.x = -Math.PI / 2; ll.position.set(LIME.x, 0.0005, 0.024); group.add(ll);
    // 量筒（2 mL 稀盐酸）
    const cylPiv = new THREE.Group(); group.add(cylPiv);
    const cyl = new THREE.Group(); cyl.position.set(0.009, -0.06, 0); cylPiv.add(cyl);
    { const foot = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.013, 0.004, 18), paint(0xe9edf0)), { width: 0.6 }); foot.position.y = 0.002; cyl.add(foot);
      const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.058, 16, 1, true), glassMat({ opacity: 0.28 })); gl.position.y = 0.032; gl.renderOrder = 9; cyl.add(gl);
      const lab = textPlate('稀盐酸 2 mL', { w: 0.026, h: 0.0072, color: '#23293a', bg: 'rgba(0,0,0,0)', font: 'bold 70px "Songti SC", serif' }); lab.rotation.x = -Math.PI / 2; lab.position.set(0, 0.0005, 0.022); cyl.add(lab); }
    const cylLiq = new THREE.Mesh(new THREE.CylinderGeometry(0.0058, 0.0058, 1, 14), water2({ color: 0xe4eef2 })); cylLiq.geometry.translate(0, 0.5, 0); cylLiq.position.y = 0.004; cylLiq.scale.y = 0.016; cylLiq.renderOrder = 7; cyl.add(cylLiq);
    const cylPick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.06, 8), new THREE.MeshBasicMaterial({ visible: false })); cylPick.position.y = 0.03; cylPick.userData.pick = true; cyl.add(cylPick);
    const CYL_PIV = CYL_HOME.clone().add(new THREE.Vector3(-0.009, 0.06, 0)); cylPiv.position.copy(CYL_PIV);
    const bubs = new Particles({ max: 200, geometry: new THREE.SphereGeometry(1, 8, 6), material: bubble2({ color: 0x6f8797, white: 0.2 }) }); bubs.mesh.renderOrder = 9.8; group.add(bubs.mesh);
    const drops = new Particles({ max: 30, geometry: new THREE.SphereGeometry(1, 6, 5), material: water2({ color: 0xe4eef2, base: 0.5 }) }); group.add(drops.mesh);
    const cards = { t: tag('', 'cond'), l: tag('', 'cond') }; cards.t.px = [-110, -40]; cards.l.px = [70, -50];

    const fresh = () => ({ demo: false, salt: 'na2co3', acid: 0, cylV: 2, rx: 0, plug: false, openT: 0, lost: 0, lime: 0, carry: null, tilt: 0, logged: {}, round: 1 });
    S = fresh();

    // 微观次元：钻进试管里看，CO₃²⁻（或 HCO₃⁻）碰上 H⁺，变成水和二氧化碳
    const mic = micro({ tag, look, back, group, scene: carbonateScene(), at: () => TUBE.clone().add(new THREE.Vector3(0, 0.008, 0)), label: '钻进试管里看', state: () => ({ salt: S.salt, added: S.acid > 0.2, acid: Math.max(0, 1 - S.rx) }), key: () => S.salt + S.round, bar: () => bar, btnAt: () => TUBE.clone().add(new THREE.Vector3(-0.026, 0.03, 0.012)) });
    const A = {
      cylDrag(p) { if (!p) return; S.carry = p.clone(); },
      cylDrop() { S.carry = null; },
      plugTap() {
        if (S.plug) return;
        if (S.acid < 1.5) return status('先加入 2 mL 稀盐酸，再<b>迅速</b>塞紧。');
        S.plug = true; sfx.clink({ freq: 1400, gain: 0.04 }); done('plug');
        status(S.openT > 3 ? `塞紧了——不过加了盐酸以后过了 ${S.openT.toFixed(0)} 秒才塞，跑掉了不少二氧化碳。` : '<b>迅速</b>塞紧了橡胶塞，气体沿导管通进澄清石灰水。');
      },
      switchSalt() {
        S = { ...fresh(), salt: 'nahco3', round: 2, logged: S.logged }; bubs.clear(); milk.set(0);
        tlab.visible = false; status('换了一套新的：试管里是 0.5 g <b>碳酸氢钠</b>，石灰水也换了新的。照样做一遍。');
      },
      reset() { S = fresh(); mic.close(); tlab.visible = true; bubs.clear(); drops.clear(); W?.tbl.clear(); if (W) { W.t1.close(); W.again.hidden = true; W.next.hidden = true; } bar.undo('acid', 'plug', 'lime', 'again', 'why'); status('全部重新摆好了，记录也清空了。'); },
    };
    const drag = draggable(group, [
      { obj: cylPick, plane: 'xy', offset: 0, hint: () => (S.cylV > 0.05 ? '稀盐酸：拖到试管口倒进去' : ''), onStart: (p) => A.cylDrag(p), onDrag: (p) => A.cylDrag(p), onEnd: () => A.cylDrop() },
    ], { taps: [{ obj: plugPick, hint: () => (S.plug ? '' : '点一下：迅速塞紧带导管的橡胶塞'), onTap: () => A.plugTap() }], tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const pourAt = () => MOUTH.clone().add(new THREE.Vector3(0.004, -0.03 + 0.004, 0));

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'acid', title: '加入稀盐酸', todo: '把<b>量筒</b>里的 2 mL 稀盐酸倒进试管。', target: () => (S.carry ? null : cylPiv) },
        { id: 'plug', title: '迅速塞紧', todo: '<b>迅速</b>点一下<b>橡胶塞</b>，塞紧试管口，导管插进澄清石灰水。', target: () => plug },
        { id: 'lime', title: '观察石灰水', todo: '看试管里的气泡和石灰水的变化。', target: () => null },
        { id: 'again', title: '换碳酸氢钠', todo: '在左边点“换碳酸氢钠再做一遍”，照样加稀盐酸、迅速塞紧，看石灰水。比比哪个反应更剧烈。', target: () => null },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { bubs.clear(); drops.clear(); milk.set(0); tlab.visible = true; mic.close(); } }),
          shots: [
            { cap: '向盛有 0.5 g 碳酸钠的试管中加入 2 mL 稀盐酸，迅速塞紧带导管的橡胶塞。', dur: 6, cam: [[0, 0.1, 0], [0.05, 0.2, 1], 0.36], during: act.seq(act.drag(cylPick, pourAt, { t0: 0.04, t1: 0.3, release: 0.6 }), act.tap(plugPick, 0.75)) },
            { cap: '钻进试管里看：CO₃²⁻ 碰上两个 H⁺，变成水和二氧化碳，二氧化碳冒出去；Na⁺、Cl⁻ 不参加反应。', dur: 10, cam: [[TUBE.x, TUBE.y + 0.058, 0], [0.05, 0.22, 1], 0.3], during: act.at(0.02, () => mic.open(true)) },
            { cap: '产生大量气泡；气体通入澄清石灰水，石灰水变浑浊——生成了二氧化碳。演示完了，下面换你自己做。', enter: () => mic.close(), dur: 9, speed: 1.5, cam: [[0.03, 0.08, 0], [0.05, 0.2, 1], 0.32] },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    const step = (h) => {
      if (S.carry) {
        const mouth = S.carry.clone().add(new THREE.Vector3(0, 0.03, 0)), at = !S.plug && Math.hypot(mouth.x - MOUTH.x, mouth.y - MOUTH.y) < 0.03;
        cylPiv.position.lerp(at ? MOUTH.clone().add(new THREE.Vector3(0.004, 0.004, 0)) : mouth, 0.3);
        S.tilt += ((at ? 1.8 : 0) - S.tilt) * Math.min(1, h * 4); cylPiv.rotation.z = S.tilt;
        if (at && S.tilt > 1.4 && S.cylV > 0) { const dv = Math.min(S.cylV, 2.5 * h); S.cylV -= dv; S.acid += dv; if (Math.random() < h * 25) drops.spawn({ p: MOUTH.clone().add(new THREE.Vector3(0.002, 0, 0)), v: new THREE.Vector3(0, -0.05, 0), size: 0.0012, life: 1 }); if (S.cylV <= 0.01 && !bar.has('acid')) { done('acid'); status('加入了 2 mL 稀盐酸：试管里<b>产生大量气泡</b>！<b>迅速</b>塞紧橡胶塞。'); } }
      } else { cylPiv.position.lerp(CYL_PIV, 0.25); S.tilt *= 0.8; cylPiv.rotation.z = S.tilt; }
      cylLiq.visible = S.cylV > 0.02; cylLiq.scale.y = Math.max(0.0001, 0.016 * S.cylV / 2);
      drops.update(h, (p, d) => { p.v.y -= 0.5 * d; p.p.addScaledVector(p.v, d); return p.p.y > TUBE.y + 0.008; });
      plug.position.lerp(S.plug ? MOUTH.clone().add(new THREE.Vector3(0, -0.01, 0)) : PLUG_HOME, S.plug ? 0.25 : 0.2);
      plug.rotation.y = 0;        // 没塞时：手拿着带导管的塞子停在管口上方，随时塞紧
      const salt = SALT[S.salt];
      if (S.acid > 0.2 && S.rx < 1) {
        const d = Math.min(1 - S.rx, salt.k * (S.acid / 2) * (1 - S.rx) * h + 0.002 * h); S.rx += d;
        const v = salt.co2 * d;
        if (!S.plug) { S.openT += h; S.lost += v; } else { S.lime += v; }
        if (Math.random() < h * 60 * (1 - S.rx) * salt.k * 3) bubs.spawn({ p: TUBE.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.008, 0.004 + Math.random() * 0.006, (Math.random() - 0.5) * 0.006)), v: new THREE.Vector3(0, 0.03, 0), size: 0.0006 + Math.random() * 0.0008, life: 1, tube: true });
        if (S.plug && Math.random() < h * 25 * (1 - S.rx) * salt.k * 3) bubs.spawn({ p: LIME.clone().add(new THREE.Vector3(0, 0.012, 0)), v: new THREE.Vector3(0, 0.03, 0), size: 0.0015, life: 1.2 });
      }
      bubs.update(h, (p, d) => { p.v.y += 0.15 * d; p.p.addScaledVector(p.v, d); return p.tube ? p.p.y < TUBE.y + 0.0012 + S.acid * 0.0039 : p.p.y < LIME.y + 0.046; });
      liq.scale.y = Math.max(0.0001, S.acid * 0.0039);
      solid.scale.y = Math.max(0.15, 1 - S.rx * 0.4);
      milk.set(clamp(S.lime / LIME_CO2, 0, 1)); milk.update(performance.now() / 1000);
      if (S.lime > LIME_CO2 * 0.6 && !S.logged[S.salt]) {
        S.logged[S.salt] = true; done(S.round === 1 ? 'lime' : 'again');
        log([`${salt.name} + 稀盐酸`, `产生大量气泡${S.salt === 'nahco3' ? '（比碳酸钠更剧烈）' : ''}；澄清石灰水<b>变浑浊</b>`, `生成了二氧化碳：${salt.eq}`]);
        status(`澄清石灰水<b>变浑浊</b>了：${salt.name}和稀盐酸反应生成了二氧化碳。${S.round === 1 ? '在左边点“换碳酸氢钠再做一遍”。' : ''}`);
        if (W) { if (S.round === 1) W.again.hidden = false; else W.t1.open(); }
      }
      cards.t.text(`<div class="cc"><div class="cc-t"><span class="cc-name">${salt.name} + 稀盐酸</span>${S.rx > 0.02 && S.rx < 0.95 ? '<span class="cc-res">冒气泡</span>' : ''}</div><div class="cc-more"><div class="cc-obs"><small>放出二氧化碳约 ${(salt.co2 * S.rx).toFixed(0)} mL${S.lost > 1 ? `，从管口跑掉 ${S.lost.toFixed(0)} mL` : ''}</small></div></div></div>`).loc(group, TUBE.x, TUBE.y + T_LEN, 0).show(S.acid > 0.2);
      cards.l.text(`<div class="cc"><div class="cc-t"><span class="cc-name">澄清石灰水</span>${S.lime > LIME_CO2 * 0.6 ? '<span class="cc-res">变浑浊</span>' : ''}</div></div>`).loc(group, LIME.x, LIME.y + L_LEN, 0).show(S.lime > 0.2);
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.24, d: 0.12, h: 0.2 },
      view: { elev: 14, azim: -4, lookY: 0.5, frameMargin: 1.08 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = () => [...W.tbl.el.querySelectorAll('tbody tr')].map((tr) => `<div>${tr.children[0].innerHTML}：${tr.children[1].innerHTML}</div>`).join('');
        const t1 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '怎样检验一种白色固体里含有碳酸盐（或碳酸氢盐）？',
          options: ['取样，加稀盐酸，把生成的气体通入澄清石灰水，看是否变浑浊', '加水看能不能溶解', '闻一闻气味'],
          wrong: ['很多物质都能溶于水，说明不了什么。', '碳酸盐没有特别的气味。'],
          ok: '对：含有 CO₃²⁻ 或 HCO₃⁻ 的盐和稀盐酸反应放出二氧化碳。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); } });
        const again = h('button', { class: 'go', hidden: true, onclick: () => { again.hidden = true; A.switchSalt(); } }, '换碳酸氢钠再做一遍 →');
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['实验内容', '现象', '分析']);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：稀盐酸按约 1 mol/L 计（2 mL 含 2 mmol HCl）；0.5 g 碳酸钠放出约 24 mL、碳酸氢钠约 48 mL 二氧化碳；反应快慢是示意。' });
        ui.controls.append(again, t1.el, next, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, t1, again, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('图 10-19：铁架台上的试管里有 0.5 g 碳酸钠；桌上一个带导管的橡胶塞、一量筒 2 mL 稀盐酸；右边试管里是澄清石灰水。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); mic.update(dt, k); },
      dispose() { mic.dispose(); bar.dispose(); bubs.dispose(); drops.dispose(); },
      debug: { get S() { return S; }, A, bar, picks: { cyl: cylPick, plug: plugPick },
        qa: qaFlow(drag, [
          { name: '拿起量筒', hold: cylPick }, { name: '倒盐酸', run: () => A.cylDrag(pourAt()), wait: 1.2 }, { name: '放下量筒', release: cylPick, wait: 0.2 },
          { name: '塞紧', tap: plugPick, wait: 16 },
          { name: '换碳酸氢钠', run: () => W.again.click(), wait: 0.5 },
          { name: '拿起量筒 2', hold: cylPick }, { name: '倒盐酸 2', run: () => A.cylDrag(pourAt()), wait: 1.2 }, { name: '放下量筒 2', release: cylPick, wait: 0.2 },
          { name: '塞紧 2', tap: plugPick, wait: 12 },
          { name: '答', run: () => W.t1.el.querySelector('button').click() },
        ]) },
    };
  },
};
