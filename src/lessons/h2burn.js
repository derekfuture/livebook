// 课题2 水的组成 · 检验氢气的纯度（课本上册第 91 页图 4-15）、实验 4-4 氢气在空气里燃烧（图 4-16）。
//
// 锥形瓶里锌粒和稀硫酸不断放出氢气，经尖嘴导管出来。装置里原来有空气：氢气一点点把空气赶出去。
// 验纯：用试管在尖嘴口收集一试管气体，拇指堵住管口，靠近酒精灯火焰，移开拇指——尖锐爆鸣声：不纯；声音很小：较纯。
// 较纯以后才点燃尖嘴口的氢气（淡蓝色火焰），在火焰上方罩一个干燥的小烧杯，烧杯内壁出现水雾——氢气燃烧生成水。
// 模型：装置里的气体约 120 mL，氢气约 6 mL/s（画面时间）放出；出来的气体里氢气的比例 p = 1 − e^(−放出量/120)。
//   一试管气体点燃时的响度按氢气和氧气（空气里的 21%）配比算：越接近 2:1 越响；氢气在 4%–75% 之间都能爆炸（爆炸极限），
//   p 在 90% 以上只是“噗”一小声。没验纯就点燃尖嘴：装置里的混合气体被引爆（这里可以安全地试一次）。
import * as THREE from 'three';
import { buttons, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { textPlate } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { testTube, glassTube, chemLamp, chemBeaker, stopper, glassMat, CHEM } from './kit/chem.js';
import { water2, bubble2, flame2, glass2 } from './kit/chemfx.js';
import { micro, h2Scene } from './kit/microworld.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const V_APP = 120, RATE = 6;
const FL = new THREE.Vector3(-0.08, 0, 0), JET = new THREE.Vector3(-0.02, 0.15, 0);
const LAMP = new THREE.Vector3(0.08, 0, 0.0), FLAME_TOP = new THREE.Vector3(0.08, 0.105, 0);
const TT_HOME = new THREE.Vector3(0.02, 0.0095, 0.07), BK_HOME = new THREE.Vector3(0.14, 0, 0.06);

export default {
  id: 'h2burn',
  fig: '图4-15',
  title: '检验氢气的纯度　氢气燃烧',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '点燃氢气前为什么一定要检验它的纯度？',
    hint: '课本第 91 页：混有一定量空气或氧气的氢气遇明火会怎样？',
    options: ['混有空气的氢气遇明火会爆炸', '不纯的氢气点不着', '为了让火焰更好看'],
    answer: 0,
  },
  need: '收集一试管氢气检验纯度，直到声音很小；点燃纯净的氢气，在火焰上方罩一个干燥的小烧杯，观察烧杯壁',
  conclusion: {
    crops: [{ page: 97, rect: [300, 250, 480, 430] }],
    quote: '混有一定量空气或氧气的氢气遇明火会发生爆炸，因此点燃氢气前一定要检验其纯度。……点燃氢气时，发出尖锐爆鸣声表明气体不纯，声音很小则表示气体较纯。研究表明，氢气在空气或氧气里燃烧生成水。',
    formula: '2H₂ + O₂ ══(点燃) 2H₂O',
    why: '氢气在空气中燃烧，产生<b>淡蓝色火焰</b>；罩在火焰上方的干燥烧杯内壁出现<b>水雾</b>——氢气燃烧生成<b>水</b>，说明水里含有氢元素。<br>氢气和空气混合，氢气占 4%~75% 时遇明火都会爆炸（爆炸极限）。刚开始放出的气体里混有装置里原来的空气，所以要<b>先验纯</b>：发出尖锐爆鸣声表明不纯，要继续收集再验；声音很小表示较纯，才可以点燃。',
    src: '课本上册第 91 页 · 第四单元 课题2 水的组成（图 4-15、实验 4-4）；氢气爆炸极限约 4%~75%',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); else bar.caption(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };

    paperSheet(group, { w: 0.32, d: 0.18, x: 0.02, z: 0.02 });

    // ================= 发生装置：锥形瓶（锌粒 + 稀硫酸）、单孔塞、尖嘴导管 =================
    const flask = new THREE.Group(); flask.position.copy(FL); group.add(flask);
    { const pts = [[0.0003, 0], [0.034, 0], [0.036, 0.004], [0.014, 0.07], [0.012, 0.075], [0.012, 0.09]].map(([r, y]) => new THREE.Vector2(r, y));
      const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 36), glassMat({ opacity: 0.18 })); body.renderOrder = 9; flask.add(body);
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.033, 0.02, 32), water2({ color: 0xe4eef2, base: 0.35 })); liq.position.y = 0.0112; liq.renderOrder = 7; flask.add(liq);
      for (let i = 0; i < 10; i++) { const z = inked(new THREE.Mesh(new THREE.DodecahedronGeometry(0.0035, 0), paint(0xa9aeb6)), { width: 0.4 }); z.position.set((Math.random() - 0.5) * 0.04, 0.004, (Math.random() - 0.5) * 0.04); flask.add(z); }
      const plug = stopper({ r1: 0.0115, r2: 0.0135, h: 0.016 }); plug.position.y = 0.082; flask.add(plug);
      const lab = textPlate('锌粒 + 稀硫酸', { w: 0.034, h: 0.0075, color: '#23293a', bg: '#fffaf0', font: 'bold 76px "Songti SC", serif' }); lab.position.set(0, 0.03, 0.026); lab.rotation.x = -0.35; flask.add(lab); }
    const tube = glassTube([FL.clone().add(new THREE.Vector3(0, 0.09, 0)), FL.clone().add(new THREE.Vector3(0, 0.115, 0)), FL.clone().add(new THREE.Vector3(0.012, 0.125, 0)), new THREE.Vector3(JET.x - 0.012, 0.125, 0), new THREE.Vector3(JET.x, 0.132, 0), JET.clone()], { r: 0.002 }); group.add(tube);
    const jetPick = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshBasicMaterial({ visible: false })); jetPick.position.copy(JET); jetPick.userData.pick = true; group.add(jetPick);
    const jetFlame = flame2({ w: 0.007, h: 0.022, core: 0xeaf4ff, mid: 0x9cc4ff, edge: 0x5b8cff, blue: 0.95, glowK: 0.4, alpha: 0.75 }); jetFlame.position.copy(JET).add(new THREE.Vector3(0, 0.001, 0)); jetFlame.setOn(false); group.add(jetFlame);
    const bubs = new Particles({ max: 60, geometry: new THREE.SphereGeometry(1, 8, 6), material: bubble2({ color: 0x6f8797, white: 0.2 }) }); bubs.mesh.renderOrder = 9.8; group.add(bubs.mesh);
    // ================= 酒精灯、验纯用的试管、干燥的小烧杯 =================
    const lamp = chemLamp(); lamp.position.copy(LAMP); lamp.scale.setScalar(0.8); group.add(lamp);
    const tt = testTube({ r: 0.008, len: 0.1 }); group.add(tt);
    const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 14, 10), paint(0xf1c9a5, { keep: true })); thumb.scale.y = 0.55; thumb.position.y = 0.1; thumb.visible = false; tt.add(thumb);
    const ttPick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 8), new THREE.MeshBasicMaterial({ visible: false })); ttPick.position.y = 0.05; ttPick.userData.pick = true; tt.add(ttPick);
    tt.position.copy(TT_HOME); tt.rotation.z = -Math.PI / 2;        // 平放，管口朝右（不伸到锥形瓶前面）
    const bkPiv = new THREE.Group(); group.add(bkPiv);
    const bk = chemBeaker({ r: 0.022, h: 0.045, level: 0, marks: false }); bk.position.y = -0.0225; bkPiv.add(bk);
    const mist = new THREE.Mesh(new THREE.CylinderGeometry(0.0212, 0.0212, 0.044, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); mist.position.y = 0.022; mist.renderOrder = 9.7; bk.add(mist);
    const bkPick = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.045, 10), new THREE.MeshBasicMaterial({ visible: false })); bkPick.position.y = 0.0225; bkPick.userData.pick = true; bk.add(bkPick);
    const BK_PIV = BK_HOME.clone().add(new THREE.Vector3(0, 0.0225, 0)); bkPiv.position.copy(BK_PIV);
    const flash = new THREE.PointLight(0xffd27a, 0, 0.4); group.add(flash);
    const sparks = new Particles({ max: 80, sprite: true, color: 0xffd27a, size: 0.006, opacity: 0.9 }); group.add(sparks.mesh);
    const cards = { tt: tag('', 'cond'), jet: tag('', 'cond') }; cards.tt.px = [60, -60]; cards.jet.px = [-120, -60];

    // ================= 状态 =================
    const fresh = () => ({ demo: false, out: 0, ttCarry: null, ttFill: 0, ttGas: null, ttAt: '', lit: false, bang: 0, bkCarry: null, mist: 0, tests: 0, quiet: false, said: {} });
    S = fresh();
    const purity = () => 1 - Math.exp(-S.out / V_APP);
    // 响度：氢气在爆炸极限（约 4%–75%）以内都是尖锐爆鸣，最响在约 30%（和空气里的氧气配比 2:1）；75%–90% 还有爆鸣；90% 以上只是“噗”一小声
    const loud = (p) => (p < 0.04 ? 0 : p <= 0.75 ? Math.max(0.5, 1 - Math.abs(p - 0.3) / 0.9) : p < 0.9 ? 0.35 : 0.12);

    // ================= 操作 =================
    // 微观次元：钻进尖嘴口的火焰里看，氢分子和氧分子拆成原子、组合成水分子
    const mic = micro({ tag, look, back, group, scene: h2Scene(), at: () => JET.clone().add(new THREE.Vector3(0, 0.008, 0)), label: '钻进火焰里看', state: () => ({ lit: S.lit }), show: () => S.lit, bar: () => bar, btnAt: () => JET.clone().add(new THREE.Vector3(-0.03, 0, 0)) });
    const A = {
      ttDrag(p) { if (!p) return; S.ttCarry = p.clone(); },
      ttDrop() { S.ttCarry = null; },
      testAtFlame() {
        const p = S.ttGas; S.ttGas = null; S.ttFill = 0; S.tests++;
        const L = loud(p);
        flash.position.copy(FLAME_TOP).add(new THREE.Vector3(0, 0.04, 0)); flash.intensity = 4 * L + 0.4;
        sfx.clink({ freq: L > 0.3 ? 380 : 900, gain: 0.04 + L * 0.2 });
        if (L > 0.3) { log([`第 ${S.tests} 次验纯（试管里氢气约 ${Math.round(p * 100)}%）`, '发出<b>尖锐爆鸣声</b>', '气体<b>不纯</b>：混有空气']); status(`<b>尖锐的爆鸣声！</b>——气体不纯（混着装置里原来的空气）。再收集一试管验一次。`); }
        else { S.quiet = true; done('pure'); log([`第 ${S.tests} 次验纯（试管里氢气约 ${Math.round(p * 100)}%）`, '<b>声音很小</b>', '气体<b>较纯</b>，可以点燃了']); status('“噗”的一声，<b>声音很小</b>——氢气已经较纯了。现在可以点燃尖嘴口的氢气。'); }
      },
      lightJet() {
        if (S.lit || S.bang > 0) return;
        const p = purity();
        if (!S.quiet && p < 0.9) { S.bang = 1; flash.position.copy(FL).add(new THREE.Vector3(0, 0.08, 0)); flash.intensity = 8; sfx.clink({ freq: 200, gain: 0.3 }); for (let i = 0; i < 60; i++) sparks.spawn({ p: FL.clone().add(new THREE.Vector3(0, 0.07, 0)), v: new THREE.Vector3((Math.random() - 0.5) * 0.5, Math.random() * 0.4, (Math.random() - 0.5) * 0.5), size: 0.006, alpha: 0.9, life: 0.6 }); log(['没验纯就点燃尖嘴口的氢气（危险！）', '装置里的混合气体<b>爆炸</b>', `那时氢气只有约 ${Math.round(p * 100)}%，混着空气`]); status(`<b>爆炸了！</b>装置里的氢气还混着空气（氢气约 ${Math.round(p * 100)}%），火焰一路烧进发生装置，引爆了混合气体。真实实验里这会炸裂锥形瓶伤人——<b>点燃前一定要验纯</b>。（几秒后装置恢复，可以接着验纯。）`); return; }
        S.lit = true; done('light'); sfx.whoosh?.({ freq: 600, gain: 0.08, dur: 0.4 }); status('点燃了：氢气安静地燃烧，产生<b>淡蓝色</b>火焰。在火焰上方罩一个<b>干燥的小烧杯</b>。');
      },
      bkDrag(p) { if (!p) return; S.bkCarry = p.clone(); },
      bkDrop() { S.bkCarry = null; },
      reset() { S = fresh(); bubs.clear(); sparks.clear(); mic.close(); W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; } bar.undo('collect', 'pure', 'light', 'cover', 'why'); status('全部重新摆好了，记录也清空了。'); },
    };
    const drag = draggable(group, [
      { obj: ttPick, plane: 'xy', offset: 0, hint: () => (S.ttGas != null ? '拇指堵住管口：拖到酒精灯火焰旁' : '试管：管口朝下，罩到尖嘴口上收集一试管气体'), onStart: (p) => A.ttDrag(p), onDrag: (p) => A.ttDrag(p), onEnd: () => A.ttDrop() },
      { obj: bkPick, plane: 'xy', offset: 0, hint: '干燥的小烧杯：倒扣着罩到火焰上方', onStart: (p) => A.bkDrag(p), onDrag: (p) => A.bkDrag(p), onEnd: () => A.bkDrop() },
    ], { taps: [{ obj: jetPick, hint: () => (S.lit ? '' : '点一下：用火柴点燃尖嘴口的氢气'), onTap: () => A.lightJet() }], tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const overJet = () => JET.clone().add(new THREE.Vector3(0, 0.05 + 0.005, 0));        // 手抓在试管中间：管口在手下面 5 cm，罩住尖嘴
    const toFlame = () => FLAME_TOP.clone().add(new THREE.Vector3(-0.02, 0.08, 0));
    const bkOver = () => JET.clone().add(new THREE.Vector3(0, 0.05, 0));

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'collect', title: '收集一试管气体', todo: '把<b>试管</b>管口朝下，罩到尖嘴口上，按住一会儿，收集一试管气体。', target: () => (S.ttCarry ? null : tt) },
        { id: 'pure', title: '验纯', todo: '拇指堵住管口，把试管拖到<b>酒精灯火焰</b>旁（移开拇指）：听声音。尖锐爆鸣声就再收集、再验，直到声音很小。', target: () => (S.ttCarry ? null : tt) },
        { id: 'light', title: '点燃氢气', todo: '点一下<b>尖嘴口</b>，点燃纯净的氢气。', target: () => jetPick },
        { id: 'cover', title: '罩干燥的小烧杯', todo: '把<b>干燥的小烧杯</b>倒扣着罩在火焰上方，过一会儿看烧杯内壁。', target: () => (S.bkCarry ? null : bkPiv) },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { bubs.clear(); sparks.clear(); mic.close(); } }),
          shots: [
            { cap: '刚放出的氢气混着装置里的空气。用试管收集一试管，拇指堵住管口，靠近火焰——尖锐的爆鸣声：不纯。', dur: 8, cam: [[0.03, 0.13, 0], [0.05, 0.2, 1], 0.36],
              during: act.seq(act.drag(ttPick, overJet, { t0: 0.03, t1: 0.2, release: 0.45 }), act.drag(ttPick, toFlame, { t0: 0.5, t1: 0.75, release: 0.8 })) },
            { cap: '过一会儿再收集、再验：声音很小，氢气较纯了。', dur: 9, speed: 3, cam: [[0.03, 0.13, 0], [0.05, 0.2, 1], 0.36], enter: () => { S.out = Math.max(S.out, 320); },
              during: act.seq(act.drag(ttPick, overJet, { t0: 0.03, t1: 0.2, release: 0.45 }), act.drag(ttPick, toFlame, { t0: 0.5, t1: 0.75, release: 0.8 })) },
            { cap: '点燃尖嘴口的氢气：淡蓝色火焰。在火焰上方罩一个干燥的小烧杯——内壁出现水雾：氢气燃烧生成了水。', dur: 10, speed: 2, cam: [[JET.x, 0.17, 0], [0.05, 0.2, 1], 0.24],
              during: act.seq(act.tap(jetPick, 0.08), act.drag(bkPick, bkOver, { t0: 0.2, t1: 0.4, release: 0.97 })) },
            { cap: '钻进火焰里看：两个氢分子和一个氧分子拆成原子，重新组合成两个水分子——氢气燃烧只生成水。', dur: 11, cam: [[JET.x, JET.y + 0.058, 0], [0.05, 0.22, 1], 0.3], during: act.at(0.02, () => mic.open(true)) },
            { cap: '演示完了，下面换你自己做。', enter: () => mic.close(), dur: 3 },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ================= 每帧 =================
    const step = (h, t) => {
      S.out += RATE * h;
      if (Math.random() < h * 25) bubs.spawn({ p: FL.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.04, 0.004, (Math.random() - 0.5) * 0.04)), v: new THREE.Vector3(0, 0.03, 0), size: 0.0008 + Math.random() * 0.0006, life: 1 });
      bubs.update(h, (p, d) => { p.p.addScaledVector(p.v, d); return p.p.y < 0.021; });
      // 试管：管口朝下罩在尖嘴上——收集；带着气体拿到火焰旁——验纯
      if (S.ttCarry) {
        const mouth = S.ttCarry.clone().add(new THREE.Vector3(0, -0.05, 0));
        const atJet = Math.abs(mouth.x - JET.x) < 0.015 && mouth.y > JET.y - 0.01 && mouth.y < JET.y + 0.03;
        const atFlame = S.ttGas != null && Math.abs(mouth.x - FLAME_TOP.x) < 0.03 && mouth.y < FLAME_TOP.y + 0.04 && mouth.y > FLAME_TOP.y - 0.03;
        tt.position.lerp(atJet ? JET.clone().add(new THREE.Vector3(0, 0.1 - 0.012, 0)) : S.ttCarry.clone().add(new THREE.Vector3(0, 0.05, 0)), 0.4);
        tt.rotation.z += ((atFlame ? -Math.PI + 0.5 : -Math.PI) - tt.rotation.z) * 0.3;        // 管口朝下；验纯时稍倾斜对着火焰
        if (atJet && !S.lit) { S.ttFill = Math.min(1, S.ttFill + h / 1.5); if (S.ttFill >= 1 && S.ttGas == null) { S.ttGas = purity(); thumb.visible = true; sfx.clink({ freq: 1400, gain: 0.02 }); done('collect'); status('收集了一试管气体，用拇指堵住管口。拿到<b>酒精灯火焰</b>旁。'); } }
        if (atFlame) { thumb.visible = false; A.testAtFlame(); S.ttCarry = null; }
      } else { tt.position.lerp(TT_HOME, 0.2); tt.rotation.z += (-Math.PI / 2 - tt.rotation.z) * 0.2; if (S.ttGas == null) thumb.visible = false; }
      lamp.flame.setOn(true); lamp.flame.update(t);
      // 尖嘴的火焰
      jetFlame.setOn(S.lit); jetFlame.update(t);
      if (S.bang > 0) { S.bang = Math.max(0, S.bang - h / 4); if (S.bang <= 0) { S.out = 0; status('装置恢复了（重新放出的氢气又混着空气）。先<b>验纯</b>。'); } }
      sparks.update(h, (p, d) => { p.v.y -= 0.6 * d; p.p.addScaledVector(p.v, d); p.alpha = 0.9 * (1 - p.age / p.life); });
      flash.intensity *= Math.pow(0.002, h);
      // 小烧杯：倒扣着罩在火焰上方，内壁慢慢出现水雾
      if (S.bkCarry) {
        const at = Math.abs(S.bkCarry.x - JET.x) < 0.02 && S.bkCarry.y > JET.y + 0.02 && S.bkCarry.y < JET.y + 0.09;
        bkPiv.position.lerp(at ? JET.clone().add(new THREE.Vector3(0, 0.05, 0)) : S.bkCarry.clone(), 0.35);
        bkPiv.rotation.z += (Math.PI - bkPiv.rotation.z) * 0.25;
        if (at && !S.said.near && !S.demo) { S.said.near = true; look([JET.x, JET.y + 0.04, 0], [0.05, 0.15, 1], 0.2); }
        if (at && S.lit) { S.mist = Math.min(1, S.mist + h * 0.25); if (S.mist > 0.4 && !S.said.mist) { S.said.mist = true; done('cover'); log(['点燃纯净的氢气，罩干燥的小烧杯', '淡蓝色火焰；烧杯内壁出现<b>水雾</b>', '氢气燃烧生成<b>水</b>']); status('烧杯内壁出现了<b>水雾</b>：氢气燃烧生成了水。'); W?.t1.open(); } }
      } else { bkPiv.position.lerp(BK_PIV, 0.25); bkPiv.rotation.z += (0 - bkPiv.rotation.z) * 0.25; S.mist = Math.max(0, S.mist - h * 0.01); }
      mist.material.opacity = S.mist * 0.55;
      // 卡片
      const p = purity();
      cards.jet.text(`<div class="cc"><div class="cc-t"><span class="cc-name">尖嘴放出的气体</span>${S.lit ? '<span class="cc-res">燃烧中</span>' : ''}</div><div class="cc-more"><div class="cc-obs"><span class="o2-read"><i style="width:${Math.round(p * 100)}%;background:#7aa7d8"></i></span><b>${Math.round(p * 100)}%</b><small>氢气（其余是空气）</small></div></div></div>`).loc(group, JET.x, JET.y, 0).show(true);
      cards.tt.text(`<div class="cc"><div class="cc-t"><span class="cc-name">试管里</span></div><div class="cc-more"><div class="cc-obs"><small>${S.ttGas != null ? `一试管气体：氢气约 ${Math.round(S.ttGas * 100)}%` : S.ttFill > 0 ? '正在收集…' : '空的'}</small></div></div></div>`).loc(tt, 0, 0.1, 0).show(S.ttCarry != null || S.ttGas != null);
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.33, d: 0.14, h: 0.24 },
      view: { elev: 14, azim: -4, lookY: 0.52, frameMargin: 1.06 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = () => [...W.tbl.el.querySelectorAll('tbody tr')].map((tr) => `<div>${tr.children[0].innerHTML}：${tr.children[1].innerHTML}</div>`).join('');
        const t2 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '刚开始放出的气体为什么不纯？',
          options: ['装置里原来有空气，刚放出的氢气混着这些空气', '刚开始锌粒放出的是氧气', '稀硫酸会挥发出来'],
          wrong: ['锌和稀硫酸反应放出的气体只有氢气。', '看卡片：尖嘴放出的气体里，其余的是什么？'],
          ok: '对：氢气要把装置里的空气赶干净才纯。所以要<b>验纯</b>，而且可能要验好几次。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); } });
        const t1 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '罩在火焰上方的干燥烧杯内壁出现水雾，说明了什么？',
          options: ['氢气燃烧生成了水，水由氢、氧两种元素组成', '烧杯本来就是湿的', '空气里的水蒸气凝结了'],
          wrong: ['烧杯是干燥的。', '火焰上方很热，空气里的水蒸气不会在这里凝结出这么多。'],
          ok: '对：2H₂ + O₂ ══ 2H₂O。这是人们认识水的组成的开始。',
          onOk: () => t2.open() });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['做了什么', '现象', '说明']);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：装置里的气体按约 120 mL、放出氢气按约 6 mL/s 计（画面时间）；验纯时的响度按氢气和空气的配比估计。<b>真实实验里点燃不纯的氢气会爆炸伤人</b>，这里只是模拟后果。' });
        ui.controls.append(t1.el, t2.el, next, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, t1, t2, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('锥形瓶里锌粒和稀硫酸正在放出氢气，从尖嘴导管出来；右边一盏点着的酒精灯，前面一支试管、一个干燥的小烧杯。点燃之前，先<b>验纯</b>（图 4-15）。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); mic.update(dt, k); },
      dispose() { mic.dispose(); bar.dispose(); bubs.dispose(); sparks.dispose(); },
      debug: { get S() { return S; }, A, bar, picks: { tt: ttPick, bk: bkPick, jet: jetPick },
        qa: qaFlow(drag, [
          { name: '拿起试管', hold: ttPick },
          { name: '罩到尖嘴', run: () => A.ttDrag(overJet()), wait: 2 },
          { name: '拿到火焰', run: () => A.ttDrag(toFlame()), wait: 1 },
          { name: '放下试管', release: ttPick, wait: 40 },
          { name: '再拿起试管', hold: ttPick },
          { name: '再罩到尖嘴', run: () => A.ttDrag(overJet()), wait: 2 },
          { name: '再拿到火焰', run: () => A.ttDrag(toFlame()), wait: 1 },
          { name: '再放下', release: ttPick, wait: 0.5 },
          { name: '点燃', tap: jetPick, wait: 1 },
          { name: '拿起烧杯', hold: bkPick },
          { name: '罩到火焰上', run: () => A.bkDrag(bkOver()), wait: 3 },
          { name: '放下烧杯', release: bkPick, wait: 0.5 },
          { name: '答第一题', run: () => W.t1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.t2.el.querySelector('button').click() },
        ]) },
    };
  },
};
