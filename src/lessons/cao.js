// 课题1 燃料的燃烧 · 实验 7-1 生石灰与水反应（课本上册第 166 页）。
//
// 一支试管里加少量生石灰（CaO），再加入 2 mL 水，插入温度计：生石灰块裂开、变成白色粉末，冒出白气，温度猛升。CaO + H₂O ══ Ca(OH)₂，放出热量。
// 对照（换个条件再试）：另一支试管装同样多的细沙，加同样多的水——温度不变。说明放热来自化学反应。
// 模型：生石灰按约 1 g（17.8 mmol）计，反应放热约 65 kJ/mol → 约 1.16 kJ；2 g 水 + 1 g 固体 + 试管下部 约 13 J/℃ →
//   能升高约 90 ℃——升到 100 ℃ 时水沸腾，多余的热把一部分水变成水蒸气（白气）。反应约半分钟（画面时间）。
import * as THREE from 'three';
import { buttons, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { textPlate, thermometer, canvasTex } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { testTube, glassMat, CHEM } from './kit/chem.js';
import { water2, glass2 } from './kit/chemfx.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const ROOM = 20, Q = 1160, CAP = 13, LH_EVAP = 2260;            // J、J/℃、J/g
const XS = [-0.025, 0.025], T_R = 0.009, T_LEN = 0.12, T_Y = 0.012;
const CYL_HOME = new THREE.Vector3(0.09, 0, 0.04), TH_HOME = new THREE.Vector3(0.07, 0.006, 0.07);

export default {
  id: 'cao',
  fig: '实验7-1',
  title: '生石灰与水反应',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '往一小块生石灰上加 2 mL 水，插入温度计——温度会怎样？',
    hint: '课本第 166 页实验 7-1。',
    options: ['迅速升高，甚至使水沸腾', '降低', '几乎不变'],
    answer: 0,
  },
  need: '在试管中加入少量生石灰，再加入 2 mL 水，插入温度计，观察现象，记录温度变化',
  conclusion: {
    crops: [{ page: 172, rect: [180, 52, 478, 170] }],
    quote: '上述实验中，氧化钙与水反应生成氢氧化钙，并放出热量。……化学反应在生成新物质的同时，还伴随着能量的变化。化学反应中能量的变化通常表现为热量的变化。',
    formula: 'CaO + H₂O ══ Ca(OH)₂',
    why: '生石灰（氧化钙）与水反应生成氢氧化钙，<b>放出大量的热</b>，温度迅速升高，水甚至沸腾、冒出白气；块状的生石灰裂开，变成白色粉末。<br>化学反应在生成新物质的同时，还伴随着能量的变化：有些反应放出热量（如氧化钙与水），有些反应吸收热量（如碳与二氧化碳）。生石灰有腐蚀性，切勿用手拿取。',
    src: '课本上册第 166 页 · 第七单元 课题1 燃料的燃烧（实验 7-1）；反应热约 −65 kJ/mol',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); else bar.caption(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };

    paperSheet(group, { w: 0.26, d: 0.16, x: 0, z: 0.02 });

    // ================= 试管架、两支试管（生石灰 / 细沙） =================
    const rackM = paint(0xd9c9a6);
    const base = inked(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.008, 0.032), rackM), { width: 0.6 }); base.position.y = 0.004; group.add(base);
    for (const sx of [-1, 1]) { const p = inked(new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.065, 0.028), rackM), { width: 0.5 }); p.position.set(sx * 0.043, 0.04, 0); group.add(p); }
    const top = inked(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.004, 0.022), rackM), { width: 0.5 }); top.position.set(0, 0.07, -0.008); group.add(top);
    const tubes = XS.map((x, k) => {
      const t = testTube({ r: T_R, len: T_LEN }); t.position.set(x, T_Y, 0); group.add(t);
      const solid = new THREE.Group(); t.add(solid);
      const lumps = [], powder = new THREE.Mesh(new THREE.CylinderGeometry(T_R - 0.001, T_R - 0.001, 0.008, 18), paint(k ? 0xd8c49a : 0xf6f6f2, { keep: true })); powder.position.y = 0.005; powder.visible = !!k; solid.add(powder);
      if (!k) for (let i = 0; i < 5; i++) { const l = inked(new THREE.Mesh(new THREE.DodecahedronGeometry(0.0034, 0), paint(0xe8e4da)), { width: 0.4 }); l.position.set((Math.random() - 0.5) * 0.008, 0.004 + i * 0.002, (Math.random() - 0.5) * 0.006); l.rotation.set(i, i * 2, i); solid.add(l); lumps.push(l); }
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(T_R - 0.0008, T_R - 0.0008, 1, 18), water2({ color: CHEM.water, base: 0.35 })); liq.geometry.translate(0, 0.5, 0); liq.position.y = 0.002; liq.scale.y = 0.0001; liq.renderOrder = 7; t.add(liq);
      const lab = textPlate(k ? '细沙' : '生石灰', { w: 0.018, h: 0.0075, color: '#23293a', bg: '#fffaf0', font: 'bold 86px "Songti SC", serif' }); lab.position.set(x, 0.004, 0.0172); group.add(lab);
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, T_LEN, 8), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = T_LEN / 2; pick.userData.pick = true; t.add(pick);
      return Object.assign(t, { lumps, powder, liq, pick });
    });
    tubes[1].visible = false;           // 细沙那支是“换个条件再试”里的对照
    const MOUTH = (k) => new THREE.Vector3(XS[k], T_Y + T_LEN, 0);
    // ================= 量筒（2 mL 水）、温度计 =================
    const cylPiv = new THREE.Group(); group.add(cylPiv);
    const cyl = new THREE.Group(); cyl.position.set(0.009, -0.06, 0); cylPiv.add(cyl);
    { const foot = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.013, 0.004, 18), paint(0xe9edf0)), { width: 0.6 }); foot.position.y = 0.002; cyl.add(foot);
      const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.058, 16, 1, true), glassMat({ opacity: 0.28 })); gl.position.y = 0.032; gl.renderOrder = 9; cyl.add(gl); }
    const cylLiq = new THREE.Mesh(new THREE.CylinderGeometry(0.0058, 0.0058, 1, 14), water2({ color: CHEM.water })); cylLiq.geometry.translate(0, 0.5, 0); cylLiq.position.y = 0.004; cylLiq.scale.y = 0.016; cylLiq.renderOrder = 7; cyl.add(cylLiq);
    const cylPick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.06, 8), new THREE.MeshBasicMaterial({ visible: false })); cylPick.position.y = 0.03; cylPick.userData.pick = true; cyl.add(cylPick);
    const CYL_PIV = CYL_HOME.clone().add(new THREE.Vector3(-0.009, 0.06, 0)); cylPiv.position.copy(CYL_PIV);
    const th = thermometer({ min: 0, max: 110, length: 0.15 }); group.add(th);
    th.children[1].scale.set(0.84, 0.8, 0.84);   // 小玻璃泡能浸进 2 mL 水里，又避开圆底。
    th.children[1].material = paint(0xd8342a, { keep: true }); th.children[0].material = glass2({ base: 0.06, rim: 0.5, band: 0.5 }); th.children[0].renderOrder = 9;
    const thPick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.15, 8), new THREE.MeshBasicMaterial({ visible: false })); thPick.position.y = 0.075; thPick.userData.pick = true; th.add(thPick);
    th.position.copy(TH_HOME); th.rotation.z = Math.PI / 2;
    const drops = new Particles({ max: 40, geometry: new THREE.SphereGeometry(1, 6, 5), material: water2({ color: CHEM.water, base: 0.5 }) }); group.add(drops.mesh);
    const steam = new Particles({ max: 80, sprite: true, color: 0xeef2f6, size: 0.01, opacity: 0.6 }); group.add(steam.mesh);
    const heatRing = new THREE.Mesh(new THREE.TorusGeometry(T_R + 0.006, 0.004, 8, 32), new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0, depthWrite: false })); heatRing.rotation.x = Math.PI / 2; heatRing.position.set(XS[0], T_Y + 0.01, 0); group.add(heatRing);
    const cards = XS.map(() => { const c = tag('', 'cond'); c.px = [0, -70]; return c; });

    // ================= 状态 =================
    const freshT = () => ({ water: 0, T: ROOM, rx: 0, steam: 0, logged: false });
    const fresh = () => ({ demo: false, t: XS.map(freshT), cylCarry: null, cylV: 2, cylFor: 0, tilt: 0, thCarry: null, thIn: -1, sand: false, peak: ROOM, said: {} });
    S = fresh();

    const A = {
      cylDrag(p) { if (!p) return; S.cylCarry = p.clone(); },
      cylDrop() { S.cylCarry = null; },
      thDrag(p) { if (!p) return; S.thCarry = p.clone(); },
      thDrop() {
        const p = S.thCarry; S.thCarry = null; if (!p) return;
        const k = XS.findIndex((x, kk) => Math.abs(p.x - x) < 0.014 && p.y < T_Y + T_LEN + 0.03 && tubes[kk].visible);
        S.thIn = k; if (k >= 0) { sfx.clink({ freq: 1500, gain: 0.02 }); done('th'); status(`温度计插进了${k ? '细沙' : '生石灰'}的试管。看温度。`); }
      },
      showSand() { S.sand = true; tubes[1].visible = true; S.cylV = 2; status('右边加了一支装着<b>细沙</b>的试管（对照）。量筒里又装好了 2 mL 水：倒进细沙里，再把温度计插进去看看。'); },
      reset() { const sand = S.sand; S = fresh(); if (sand) { S.sand = true; } tubes[1].visible = S.sand; steam.clear(); drops.clear(); W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; } bar.undo('water', 'th', 'watch', 'why'); status('全部重新摆好了，记录也清空了。'); },
    };
    const drag = draggable(group, [
      { obj: cylPick, plane: 'xy', offset: 0, hint: () => (S.cylV > 0.05 ? '量筒（2 mL 水）：拖到试管口倒进去' : ''), onStart: (p) => A.cylDrag(p), onDrag: (p) => A.cylDrag(p), onEnd: () => A.cylDrop() },
      { obj: thPick, plane: 'xy', offset: 0, hint: '温度计：插进试管里', onStart: (p) => A.thDrag(p), onDrag: (p) => A.thDrag(p), onEnd: () => A.thDrop() },
    ], { tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const pourAt = (k) => () => MOUTH(k).add(new THREE.Vector3(0.004, -0.03 + 0.004, 0));
    const thIn = (k) => () => new THREE.Vector3(XS[k], T_Y + 0.07, 0);

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'water', title: '加 2 mL 水', todo: '把<b>量筒</b>里的 2 mL 水倒进装生石灰的试管。', target: () => (S.cylCarry ? null : cylPiv) },
        { id: 'th', title: '插入温度计', todo: '把<b>温度计</b>插进试管里。', target: () => (S.thCarry ? null : th) },
        { id: 'watch', title: '观察，记录温度', todo: '观察试管里的变化，看温度计的示数。', target: () => null },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { steam.clear(); drops.clear(); } }),
          shots: [
            { cap: '试管里加少量生石灰，再加入 2 mL 水，插入温度计。', dur: 7, cam: [[XS[0], 0.08, 0], [0.05, 0.22, 1], 0.28],
              during: act.seq(act.drag(cylPick, pourAt(0), { t0: 0.04, t1: 0.25, release: 0.5 }), act.path(thPick, [null, new THREE.Vector3(TH_HOME.x, 0.2, 0), new THREE.Vector3(XS[0], 0.2, 0), thIn(0)()], { t0: 0.55, t1: 0.9, release: 0.92 })) },
            { cap: '生石灰块裂开，变成白色粉末，冒出白气；温度迅速升高，水甚至沸腾——氧化钙与水反应放出大量的热。演示完了，下面换你自己做。', dur: 12, speed: 1.5, cam: [[XS[0], 0.08, 0], [0.05, 0.22, 1], 0.26] },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ================= 每帧 =================
    const step = (h, t) => {
      // 量筒倒水
      if (S.cylCarry) {
        const mouth = S.cylCarry.clone().add(new THREE.Vector3(0, 0.03, 0));
        const k = XS.findIndex((x, kk) => Math.abs(mouth.x - x) < 0.02 && Math.abs(mouth.y - (T_Y + T_LEN)) < 0.03 && tubes[kk].visible);
        cylPiv.position.lerp(k >= 0 ? MOUTH(k).add(new THREE.Vector3(0.004, 0.004, 0)) : mouth, 0.3);
        S.tilt += ((k >= 0 ? 1.8 : 0) - S.tilt) * Math.min(1, h * 4); cylPiv.rotation.z = S.tilt;
        if (k >= 0 && S.tilt > 1.4 && S.cylV > 0) { const dv = Math.min(S.cylV, 2 * h); S.cylV -= dv; S.t[k].water += dv; if (Math.random() < h * 25) drops.spawn({ p: MOUTH(k).add(new THREE.Vector3(0.002, 0, 0)), v: new THREE.Vector3(0, -0.05, 0), size: 0.0012, life: 1 }); if (S.cylV <= 0.01 && k === 0) { done('water'); status('加入了 2 mL 水。把<b>温度计</b>插进去。'); } }
      } else { cylPiv.position.lerp(CYL_PIV, 0.25); S.tilt *= 0.8; cylPiv.rotation.z = S.tilt; }
      cylLiq.visible = S.cylV > 0.02; cylLiq.scale.y = Math.max(0.0001, 0.016 * S.cylV / 2);
      drops.update(h, (p, d) => { p.v.y -= 0.5 * d; p.p.addScaledVector(p.v, d); return p.p.y > T_Y + 0.012; });
      // 反应、温度
      S.t.forEach((T, k) => {
        const tb = tubes[k];
        if (!k && T.water > 0.2 && T.rx < 1) {
          const d = Math.min(1 - T.rx, h / 25 * (T.rx < 0.05 ? 0.5 : 1.3));           // 刚加水时慢一点，热起来以后更快
          T.rx += d; let q = Q * d;
          const toBoil = Math.max(0, (100 - T.T) * CAP);
          if (q <= toBoil) T.T += q / CAP; else { T.T = 100; q -= toBoil; const ev = q / LH_EVAP; T.water = Math.max(0.3, T.water - ev); T.steam += ev; }
          if (T.rx > 0.15 && !S.said.crumble && !S.demo) { S.said.crumble = true; status('生石灰块<b>裂开</b>，变成白色粉末，试管里冒出<b>白气</b>——放出了大量的热。'); }
        }
        T.T = Math.max(ROOM, T.T - (T.T - ROOM) * 0.004 * h);
        if (!k) S.peak = Math.max(S.peak, T.T);
        if (!k) { tb.lumps.forEach((l, i) => { l.visible = T.rx < 0.3 + i * 0.12; l.scale.setScalar(Math.max(0.3, 1 - T.rx * 1.2)); }); tb.powder.visible = T.rx > 0.1; tb.powder.scale.y = Math.min(1.6, 0.3 + T.rx * 1.3); tb.powder.position.y = 0.002 + 0.004 * tb.powder.scale.y; }
        tb.liq.scale.y = Math.max(0.0001, (T.water * 1e-6) / (Math.PI * (T_R - 0.0008) ** 2) + (k ? 0.006 : 0.008 * Math.min(1, T.rx * 2)));
        tb.liq.material.color.set(!k && T.rx > 0.2 ? 0xf0f0ea : CHEM.water);
        if (!k && T.T > 60 && Math.random() < h * (T.T >= 99 ? 30 : 6)) steam.spawn({ p: MOUTH(0).add(new THREE.Vector3((Math.random() - 0.5) * 0.006, -0.004, 0)), v: new THREE.Vector3((Math.random() - 0.5) * 0.01, 0.03, 0), size: 0.01, alpha: 0.6, life: 1.4 });
        // 记录：温度计插着、温度变化完了
        if (S.thIn === k && T.water > 0.2 && !T.logged && (k ? T.T >= ROOM && (T.seen = (T.seen || 0) + h) > 3 : T.rx >= 1)) {
          T.logged = true;
          if (!k) { log(['生石灰 + 2 mL 水，插入温度计', `生石灰块裂开成白色粉末，冒白气；温度从 20 ℃ 升到约 <b>${Math.round(S.peak)} ℃</b>${S.peak >= 99.5 ? '（水沸腾了）' : ''}`, 'CaO + H₂O ══ Ca(OH)₂，<b>放出热量</b>']); done('watch'); W?.t1.open(); }
          else { log(['（对照）细沙 + 2 mL 水，插入温度计', '温度<b>不变</b>（20 ℃）', '没有发生化学反应，不放热']); status('细沙里加水，温度<b>不变</b>——生石灰那支的热来自化学反应。'); }
        }
      });
      steam.update(h, (p, d) => { p.p.addScaledVector(p.v, d); p.size += d * 0.006; p.alpha = 0.6 * (1 - p.age / p.life); });
      heatRing.material.opacity = clamp((S.t[0].T - 30) / 70, 0, 0.6);
      // 温度计
      if (S.thCarry) { th.position.lerp(S.thCarry.clone().add(new THREE.Vector3(0, -0.06, 0)), 0.45); th.rotation.z += (0 - th.rotation.z) * 0.3; }
      else if (S.thIn >= 0) { th.position.lerp(new THREE.Vector3(XS[S.thIn], T_Y + 0.007, 0), 0.3); th.rotation.z += (0.03 - th.rotation.z) * 0.3; }
      else { th.position.lerp(TH_HOME, 0.2); th.rotation.z += (Math.PI / 2 - th.rotation.z) * 0.2; }
      th.setTemp(S.thIn >= 0 && !S.thCarry ? S.t[S.thIn].T : ROOM);
      S.t.forEach((T, k) => cards[k].text(`<div class="cc"><div class="cc-t"><span class="cc-name">${k ? '细沙' : '生石灰'}</span>${!k && T.T >= 99.5 ? '<span class="cc-res burn">沸腾</span>' : ''}</div><div class="cc-more"><div class="cc-obs"><b style="font-size:1.15em">${S.thIn === k ? T.T.toFixed(0) + ' ℃' : '—'}</b><small>${T.water > 0.05 ? `加了 ${Math.min(2, T.water + T.steam).toFixed(1)} mL 水` : '还没加水'}</small></div></div></div>`).loc(group, XS[k], T_Y + T_LEN, 0).show(tubes[k].visible));
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.22, d: 0.12, h: 0.14 },
      view: { elev: 16, azim: -4, lookY: 0.45, frameMargin: 1.1 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = () => [...W.tbl.el.querySelectorAll('tbody tr')].map((tr) => `<div>${tr.children[0].innerHTML}：${tr.children[1].innerHTML}</div>`).join('');
        const t2 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '生活中“自热米饭”“自热火锅”的发热包里常有生石灰。它是怎样发热的？',
          options: ['加水后，生石灰与水发生化学反应，放出热量', '生石灰本来就是热的', '水和生石灰摩擦生热'],
          wrong: ['加水之前，生石灰是凉的。', '不是摩擦：是化学反应放出的热。'],
          ok: '对：CaO + H₂O ══ Ca(OH)₂，放出热量。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); } });
        const t1 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '这个实验说明了什么？',
          options: ['化学反应在生成新物质的同时，还伴随着能量（热量）的变化', '水加到任何固体上都会变热', '温度计坏了'],
          wrong: ['可以在“换个条件再试”里，往细沙里加水试试。', '温度计没坏：它插在水里是 20 ℃。'],
          ok: '对：有的反应放热，有的反应吸热。',
          onOk: () => t2.open() });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['做了什么', '现象', '说明']);
        const vary = h('details', { class: 'more' }, h('summary', {}, '换个条件再试'), h('p', { class: 'fineprint', html: '加一支装着<b>细沙</b>的试管做对照：加同样多的水，插温度计。' }), buttons([{ text: '加一支细沙的试管（对照）', ghost: true, onClick: () => A.showSand() }]).el);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：生石灰按约 1 g、反应热按约 65 kJ/mol 计（约 1.2 kJ），只够加热 2 mL 水和试管——会升到 100 ℃ 使水沸腾；不计散热。<b>生石灰有腐蚀性，切勿用手拿取</b>。' });
        ui.controls.append(t1.el, t2.el, next, vary, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, t1, t2, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('实验 7-1：试管里放着一小块生石灰（CaO）；右边量筒里有 2 mL 水，左边一支温度计。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { bar.dispose(); drops.dispose(); steam.dispose(); },
      debug: { get S() { return S; }, A, bar, picks: { cyl: cylPick, th: thPick },
        qa: qaFlow(drag, [
          { name: '拿起量筒', hold: cylPick },
          { name: '倒水', run: () => A.cylDrag(pourAt(0)()), wait: 2 },
          { name: '放下量筒', release: cylPick, wait: 0.3 },
          { name: '插温度计', drag: thPick, to: thIn(0), wait: 30 },
          { name: '答第一题', run: () => W.t1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.t2.el.querySelector('button').click() },
        ]) },
    };
  },
};
