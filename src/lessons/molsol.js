// 人教版高中化学必修第一册第 59 页【实验2-10】、第 65–66 页实验活动 1：配制 100 mL 1.00 mol/L NaCl 溶液（图2-25 向容量瓶中转移溶液）。
//
// 检漏 → 计算（n = c·V = 0.100 mol，m = n·M = 5.85 g）→ 电子天平称量（课本注①：本应用分析天平，学校可暂用托盘天平或普通电子天平；这里用 0.01 g 的电子天平）
// → 烧杯里加约 40 mL 蒸馏水、玻璃棒搅拌溶解 → 沿玻璃棒注入 100 mL 容量瓶 → 洗涤烧杯内壁和玻璃棒 2～3 次，洗涤液也注入 → 轻轻摇动
// → 加水到刻度线下 1～2 cm，改用胶头滴管滴到凹液面与刻度线相切 → 盖塞、颠倒摇匀 → 装瓶贴标签。
// 最后的浓度按 c = n/V 算：n 是真正进了容量瓶的 NaCl（洒出去的、没洗下来的都不算），V 是定容后瓶里实际的体积。
// 课本第 60 页“思考与讨论”的三问都能试出来：不洗涤、转移时洒到瓶外、仰视 / 俯视刻度线；加水超过刻度线只能重新配制。
import * as THREE from 'three';
import { draggable, clamp } from './kit/interact.js';
import { chemBeaker, glassMat, CHEM } from './kit/chem.js';
import { water2 } from './kit/chemfx.js';
import { Particles } from './kit/fx.js';
import { textPlate, canvasTex } from './kit/props.js';
import { lessonBar } from './kit/lessonbar.js';
import { sandbox, wrapPointer, qaFlow, demoActs, paperSheet, think, mountXuean, moreBox, varyBox } from './kit/chemlesson.js';
import { micro, dissolveScene } from './kit/microworld.js';
import { dropBottle } from './kit/labops.js';
import { volFlask } from './kit/volflask.js';
import { seg } from './kit/ui.js';
import { sfx } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const M = 58.5, TARGET = 5.85, PAPER_G = 0.32;          // M：课本用 58.5 g/mol；称量纸约 0.32 g
const BAL = V(-0.13, 0, 0), PAN_Y = 0.031, JAR = V(-0.19, 0, -0.045), SPOON_HOME = V(-0.205, 0.005, 0.045), PAPERS = V(-0.13, 0, 0.078);
const BK = V(-0.035, 0, 0.045), BR = 0.025, BH = 0.06, ROD_REST = V(-0.04, 0.003, 0.108);
const WB = V(0.025, 0, -0.06), FL = V(0.085, 0, -0.005), DROP_BOT = V(0.145, 0, 0.055), BOT = V(0.165, 0, -0.05);
const FILM = 0.6;
const WB_TILT = -0.55, WB_TIP = new THREE.Vector3(0.024, 0.0975, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), WB_TILT);          // 洗瓶倾斜时管口相对瓶底的位置
const BK_TILT = 1.25, BK_SPOUT = new THREE.Vector3(0.028 * Math.cos(BK_TILT) + 0.06 * Math.sin(BK_TILT), -0.028 * Math.sin(BK_TILT) + 0.06 * Math.cos(BK_TILT), 0);          // 烧杯（倾倒嘴朝右）倾斜时嘴相对杯底的位置          // 倒完以后烧杯内壁和玻璃棒上留下约 0.6 mL 溶液
const VIEWS = { flat: 0, down: 1, up: -1 }, VIEW_NAME = { flat: '平视', down: '俯视', up: '仰视' };
const PARALLAX = 0.0028;          // 视线偏离水平约 25°：从刻度线看过去，落到瓶颈中心的凹液面上，高低差约 6 mm × tan25° ≈ 2.8 mm

export default {
  id: 'molsol',
  fig: '图2-25',
  title: '配制一定物质的量浓度的溶液',
  stampText: '实验活动',
  style: 'paper',
  predict: {
    q: '配制 100 mL 1.00 mol/L NaCl 溶液，需要称量 NaCl 固体多少克？',
    hint: 'n = c·V，m = n·M（NaCl 的摩尔质量 58.5 g/mol）。',
    options: ['5.85 g', '58.5 g', '0.585 g', '11.7 g'],
    answer: 0,
  },
  need: '检漏；计算 5.85 g；称量；溶解；沿玻璃棒转移到 100 mL 容量瓶；洗涤 2～3 次；加水到刻度线下 1～2 cm，用胶头滴管定容；盖塞摇匀；装瓶贴标签',
  conclusion: {
    crops: [{ page: 61, rect: [64, 545, 385, 634] }, { page: 63, rect: [61, 197, 290, 305] }],
    quote: '物质的量浓度表示单位体积的溶液里所含溶质B的物质的量，也称为B的物质的量浓度，符号为cB。……容量瓶上标有温度（一般为20 ℃）和容积，表示在所指温度下，液体的凹液面与容量瓶颈部的刻度线相切时，溶液体积恰好与瓶上标注的容积相等。',
    formula: 'c(NaCl) = n(NaCl) ÷ V = (5.85 g ÷ 58.5 g/mol) ÷ 0.100 L = 1.00 mol/L',
    why: '浓度由两样东西决定：真正进了容量瓶的溶质（n），和定容后溶液的体积（V）。<br><b>n 少了，浓度偏小</b>：转移时洒到瓶外、烧杯和玻璃棒没洗（内壁上还沾着溶液）。<br><b>V 不准</b>：定容时<b>俯视</b>刻度线，以为到了、其实水加少了，V 偏小，浓度<b>偏大</b>；<b>仰视</b>相反，浓度<b>偏小</b>；加水超过刻度线，V 偏大，浓度偏小，只能重新配制（吸出一部分也不行，溶质也被吸走了）。',
    src: '课本第 57、59 页 · 第二章 第三节 物质的量',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    let W = null;
    paperSheet(group, { w: 0.44, d: 0.22, x: -0.02, z: 0.02 });

    // ================= 电子天平、称量纸、NaCl、药匙 =================
    const bal = new THREE.Group(); bal.position.copy(BAL); group.add(bal);
    { const body = inked(new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.022, 0.092), paint(0xdfe3dc)), { width: 0.7 }); body.position.y = 0.011; bal.add(body);
      const panel = inked(new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.012, 0.022), paint(0xcfd5cc)), { width: 0.5 }); panel.position.set(0, 0.016, 0.046); panel.rotation.x = -0.5; bal.add(panel);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.007, 10), paint(0xb9bec8)); stem.position.y = 0.0255; bal.add(stem); }
    const pan = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.0025, 32), paint(0xc4cad3)), { width: 0.5 }); pan.position.set(BAL.x, PAN_Y, BAL.z); group.add(pan);
    const dispTex = canvasTex(256, 72, () => {});
    const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.036, 0.0095), new THREE.MeshBasicMaterial({ map: dispTex })); disp.position.set(BAL.x - 0.012, 0.0205, BAL.z + 0.0545); disp.rotation.x = -0.5; group.add(disp);
    const tare = inked(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, 0.007), paint(0x3d4a5c, { keep: true })), { width: 0.4 }); tare.position.set(BAL.x + 0.022, 0.0215, BAL.z + 0.052); tare.rotation.x = -0.5; group.add(tare);
    const tareLab = textPlate('去皮', { w: 0.012, h: 0.005, color: '#23293a', bg: 'rgba(0,0,0,0)', font: 'bold 70px "Songti SC", serif' }); tareLab.position.set(BAL.x + 0.022, 0.026, BAL.z + 0.047); tareLab.rotation.x = -0.5; group.add(tareLab);
    const tarePick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.014, 0.016), new THREE.MeshBasicMaterial({ visible: false })); tarePick.userData.pick = true; tare.add(tarePick);
    const wPaper = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.0006, 0.034), paint(0xfdfdfa)); wPaper.rotation.y = 0.35; group.add(wPaper);
    const heap = new THREE.Mesh(new THREE.SphereGeometry(0.011, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xf6f6f2, { keep: true })); heap.scale.y = 0.45; group.add(heap);
    const papers = inked(new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.003, 0.034), paint(0xfdfdfa)), { width: 0.5 }); papers.position.copy(PAPERS).setY(0.0015); papers.rotation.y = 0.2; group.add(papers);
    const papersPick = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.014, 0.04), new THREE.MeshBasicMaterial({ visible: false })); papersPick.userData.pick = true; papers.add(papersPick);
    const jar = new THREE.Group(); jar.position.copy(JAR); group.add(jar);
    { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.045, 24), glassMat({ opacity: 0.3 })); b.position.y = 0.0225; b.renderOrder = 9; jar.add(b);
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.0185, 0.0185, 0.022, 20), paint(0xf6f6f2, { keep: true })); s.position.y = 0.012; jar.add(s);
      const lab = textPlate('NaCl', { w: 0.02, h: 0.009, color: '#c23a3a', bg: '#fffaf0', font: 'bold 92px "Times New Roman", serif' }); lab.position.set(0, 0.031, 0.0205); jar.add(lab); }
    const spoon = new THREE.Group(); group.add(spoon);
    { const handle = inked(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.002, 0.005), paint(0xd9dde3)), { width: 0.5 }); handle.position.x = 0.035; spoon.add(handle);
      const bowl = inked(new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xd9dde3)), { width: 0.4 }); bowl.rotation.x = Math.PI; bowl.scale.y = 0.4; spoon.add(bowl);
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 10, 6), paint(0xf6f6f2, { keep: true })); s.scale.y = 0.4; s.position.y = 0.001; spoon.add(s); }
    const spoonPick = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), new THREE.MeshBasicMaterial({ visible: false })); spoonPick.position.x = 0.035; spoonPick.userData.pick = true; spoon.add(spoonPick);
    spoon.position.copy(SPOON_HOME);

    // ================= 烧杯、玻璃棒、洗瓶 =================
    const bk = chemBeaker({ r: BR, h: BH, level: 0, color: CHEM.water, marks: true }); bk.position.copy(BK); bk.rotation.y = Math.PI; group.add(bk);          // 倾倒嘴朝右（朝容量瓶）
    const bkPick = new THREE.Mesh(new THREE.CylinderGeometry(BR + 0.006, BR + 0.006, BH, 10), new THREE.MeshBasicMaterial({ visible: false })); bkPick.position.y = BH / 2; bkPick.userData.pick = true; bk.add(bkPick);
    const crystals = new THREE.Mesh(new THREE.SphereGeometry(0.011, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xf6f6f2, { keep: true })); crystals.scale.y = 0.4; crystals.position.y = 0.0014; bk.add(crystals);
    const rod = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0017, 0.0017, 0.13, 10), paint(0xe8f2f6, { transparent: true, opacity: 0.85 })), { width: 0.5 });
    rod.geometry.translate(0, 0.065, 0); group.add(rod);
    const rodPick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.13, 8), new THREE.MeshBasicMaterial({ visible: false })); rodPick.position.y = 0.065; rodPick.userData.pick = true; rod.add(rodPick);
    // 洗瓶（塑料，挤一下水从弯管里出来）：原点在瓶底
    const wb = new THREE.Group(); group.add(wb);
    { const body = inked(new THREE.Mesh(new THREE.LatheGeometry([[0.0003, 0], [0.019, 0], [0.021, 0.004], [0.021, 0.055], [0.016, 0.066], [0.008, 0.07]].map(([r, y]) => new THREE.Vector2(r, y)), 28), paint(0xf2f4f1, { transparent: true, opacity: 0.88 })), { width: 0.6 }); wb.add(body);
      const cap = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.009, 16), paint(0xd9584a, { keep: true })), { width: 0.4 }); cap.position.y = 0.0735; wb.add(cap);
      const nozzle = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 0.004, 0), V(0, 0.022, 0), V(0.012, 0.03, 0), V(0.024, 0.024, 0)]), 16, 0.0016, 8), paint(0xe9edf0)); cap.add(nozzle);
      const lab = textPlate('蒸馏水', { w: 0.026, h: 0.009, color: '#23293a', bg: '#fffaf0', font: 'bold 84px "Songti SC", serif' }); lab.position.set(0, 0.03, 0.0212); wb.add(lab);
      wb.tip = V(0.024, 0.0975, 0); }
    const wbPick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.08, 10), new THREE.MeshBasicMaterial({ visible: false })); wbPick.position.y = 0.04; wbPick.userData.pick = true; wb.add(wbPick);

    // ================= 容量瓶、胶头滴管、试剂瓶 =================
    const fl = volFlask(); fl.group.position.copy(FL); group.add(fl.group);
    const flStop = fl.stopper; fl.group.remove(flStop); group.add(flStop);          // 瓶塞单独摆：不用时放在瓶子旁边
    const STOP_REST = FL.clone().add(V(0.034, 0.0089, 0.03));
    const dBot = dropBottle(group, DROP_BOT, { label: '蒸馏水' });
    const dropper = new THREE.Group(); group.add(dropper);
    { const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0028, 0.045, 10), glassMat({ opacity: 0.35 })); tube.position.y = 0.0225; tube.renderOrder = 9; dropper.add(tube);
      const bulb = inked(new THREE.Mesh(new THREE.SphereGeometry(0.0055, 12, 8), paint(0xc23a3a, { keep: true })), { width: 0.4 }); bulb.scale.y = 1.6; bulb.position.y = 0.05; dropper.add(bulb); }
    const dropPick = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.065, 8), new THREE.MeshBasicMaterial({ visible: false })); dropPick.position.y = 0.032; dropPick.userData.pick = true; dropper.add(dropPick);
    dropper.position.copy(dBot.tipHome);
    const bottle = new THREE.Group(); bottle.position.copy(BOT); group.add(bottle);
    { const b = new THREE.Mesh(new THREE.LatheGeometry([[0.0003, 0], [0.019, 0], [0.02, 0.003], [0.02, 0.05], [0.011, 0.062], [0.007, 0.066], [0.007, 0.074]].map(([r, y]) => new THREE.Vector2(r, y)), 28), glassMat({ opacity: 0.3 })); b.renderOrder = 9; bottle.add(b); }
    const botLiq = new THREE.Mesh(new THREE.CylinderGeometry(0.0185, 0.0185, 1, 20), water2({ color: CHEM.water })); botLiq.geometry.translate(0, 0.5, 0); botLiq.position.y = 0.0015; botLiq.scale.y = 0.0001; botLiq.renderOrder = 7; bottle.add(botLiq);
    const labTex = canvasTex(256, 160, () => {});
    const botLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.028, 0.0175), new THREE.MeshBasicMaterial({ map: labTex, transparent: true })); botLabel.position.set(0, 0.027, 0.0203); botLabel.visible = false; bottle.add(botLabel);
    const botPick = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.075, 10), new THREE.MeshBasicMaterial({ visible: false })); botPick.position.y = 0.037; botPick.userData.pick = true; bottle.add(botPick);
    // 定容时的视线（俯视 / 仰视时画出来：从眼睛经过刻度线，落到瓶颈中心的凹液面上）
    const sight = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(0, 0, 0)]), new THREE.LineDashedMaterial({ color: 0xc23a3a, dashSize: 0.003, gapSize: 0.002, transparent: true, opacity: 0.9 }));
    sight.renderOrder = 12; group.add(sight);
    const salts = new Particles({ max: 140, geometry: new THREE.DodecahedronGeometry(1, 0), material: paint(0xf6f6f2, { keep: true }) }); group.add(salts.mesh);
    const drops = new Particles({ max: 120, geometry: new THREE.SphereGeometry(1, 6, 5), material: water2({ color: CHEM.water, base: 0.5 }) }); drops.mesh.renderOrder = 8; group.add(drops.mesh);
    const balCard = tag('', 'cond'), flCard = tag('', 'cond'), bkCard = tag('', 'cond'), botCard = tag('', 'cond');

    // ================= 状态 =================
    const fresh = () => ({ demo: false, near: false, checked: false, checkT: 0, paperOn: false, tareG: 0, panSalt: 0, spoonAt: false, paperFly: 0,
      bkSalt: 0, bkWater: 0, dis: 0, stir: 0, flSalt: 0, flVol: 0, spilled: 0, pours: 0, washes: 0, rinsing: false, rinseVol: 0, swirled: false, swirlT: 0,
      rod: 'rest', rodP: ROD_REST.clone(), wbP: WB.clone(), bkP: BK.clone(), carry: null, carryP: null, dropT: 0, drops: 0, nearMark: false, atMark: false, over: false,
      stopper: false, shakeT: 0, shaken: false, bottled: false, pourT: 0, dropPark: false, dropHold: false, dropDone: false, pourOn: false, view: S ? S.view : 'flat', said: {}, lastRodX: null });
    let S = null; S = fresh();
    const status = (m) => { if (!S.demo) W?.status(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };
    const display = () => (S.paperOn ? PAPER_G : 0) + S.panSalt - S.tareG;
    const conc = () => (S.flSalt / M) / (S.flVol / 1000);
    const L = () => fl.levelOf(S.flVol);
    const apparentGap = () => (fl.markY - L()) - VIEWS[S.view] * PARALLAX;          // 从学生的视线看，凹液面最低处离刻度线还有多远（俯视觉得更近）
    let nearK = '';
    const near = (k, c, d, dist, opts) => { if (S.demo || nearK === k) return; nearK = k; look(c, d, dist, () => { nearK = ''; }, opts); };
    const far = () => { if (nearK) { nearK = ''; back(); } };

    const A = {
      check() {          // 检漏：加少量水、塞紧、倒立，看瓶口有没有水渗出；正立后瓶塞转 180° 再倒立一次
        if (S.checked || S.checkT) return;
        S.checkT = 0.0001; status('检漏：往容量瓶里加少量水，塞紧瓶塞，倒立过来看瓶口有没有水渗出；正过来把瓶塞转 180°，再倒立一次。');
      },
      papers() { if (S.paperOn) return status('天平上已经放了一张称量纸。'); S.paperOn = true; sfx.clink({ freq: 2000, gain: 0.02 }); status(`放了一张称量纸，显示 <b>${display().toFixed(2)} g</b>（是纸的质量）。按<b>去皮</b>，让显示回到 0.00 g。`); },
      tare() { S.tareG = (S.paperOn ? PAPER_G : 0) + S.panSalt; sfx.clink({ freq: 2600, gain: 0.02 }); if (S.paperOn && S.panSalt === 0) { done('paper'); status('去皮了，显示 <b>0.00 g</b>。按住<b>药匙</b>在称量纸上方轻轻抖出 NaCl，称到 5.85 g。'); } else status(`去皮了，显示 ${display().toFixed(2)} g。`); },
      spoonOn() { if (!S.paperOn) return status('先在天平上放一张<b>称量纸</b>，再加 NaCl（药品不直接放在托盘上）。'); S.spoonAt = true; },
      spoonOff() { if (!S.spoonAt) return; S.spoonAt = false; const d = display(); if (S.panSalt > 0) status(`显示 <b>${d.toFixed(2)} g</b>${Math.abs(d - TARGET) < 0.025 ? '：就是 5.85 g。点一下<b>称量纸</b>，把 NaCl 倒进烧杯。' : d < TARGET ? '：还差一点，再按住药匙轻轻加。' : '：多了。点一下<b>称量纸</b>上的 NaCl，用药匙取出一点。'}`); },
      panTap() {
        if (S.panSalt <= 0.01) return;
        const d = display();
        if (d > TARGET + 0.025 && !S.said.over) { S.panSalt = Math.max(0, S.panSalt - 0.08); return status(`用药匙从纸上取出一点，显示 ${display().toFixed(2)} g。`); }
        if (Math.abs(d - TARGET) >= 0.025 && !S.demo) status(`称了 ${d.toFixed(2)} g，不是 5.85 g……也倒进去吧——看看最后浓度会怎样。`);
        S.bkSalt += S.panSalt; S.panSalt = 0; S.paperFly = 0.0001; done('weigh'); sfx.clink({ freq: 2400, gain: 0.03 });
        log(['称量', `电子天平显示 ${d.toFixed(2)} g`, S.tareG >= PAPER_G - 1e-6 ? '称量纸已去皮，就是 NaCl 的质量' : `没有去皮：其中 ${PAPER_G.toFixed(2)} g 是纸，NaCl 只有 ${S.bkSalt.toFixed(2)} g`]);
        status(`NaCl（${S.bkSalt.toFixed(2)} g）倒进了烧杯。把<b>洗瓶</b>拖到烧杯口，加约 40 mL 蒸馏水。`);
      },
      tapDropper() {
        if (S.dropT > 0) return;
        if (S.flVol < 1) return status('容量瓶里还没有溶液。胶头滴管是最后定容时用的。');
        if (S.stopper) return status('瓶塞已经塞上了。');
        S.dropT = 0.0001; S.dropDone = false;
      },
      tapFlask() {
        if (!S.checked) return A.check();
        if (S.stopper) return status(S.shaken ? '已经摇匀了。点一下<b>试剂瓶</b>，装瓶贴标签。' : '正在摇匀……');
        if (S.rod === 'fl') return status('先把<b>玻璃棒</b>从容量瓶口拿开（拖回桌上），再摇动、盖塞。');
        if (S.atMark || S.over) { S.stopper = true; S.shakeT = 0.0001; return status('盖好瓶塞，一手按住瓶塞、一手托住瓶底，反复上下颠倒，摇匀。'); }
        if (S.flVol > 1 && !S.swirled) { if (S.bkWater > FILM + 0.5) return status('烧杯里还有洗涤液没倒完。'); S.swirlT = 0.0001; S.swirled = true; done('swirl'); return status('轻轻摇动容量瓶，使溶液混合均匀。然后用<b>洗瓶</b>往容量瓶里加水，加到刻度线下 1～2 cm。'); }
        if (S.flVol > 1) { S.swirlT = 0.0001; return status(L() < fl.markY - 0.02 ? '摇匀了一下。接着加水，到刻度线下 1～2 cm 时改用<b>胶头滴管</b>。' : '还没到刻度线：用<b>胶头滴管</b>一滴一滴地加，直到凹液面与刻度线相切。'); }
        status('容量瓶里还没有溶液。先在烧杯里把 NaCl 溶解。');
      },
      bottleTap() {
        if (S.bottled) return;
        if (!S.shaken) return status(S.atMark || S.over ? '先盖好瓶塞摇匀（点一下<b>容量瓶</b>），再装瓶。' : '溶液还没配好：定容、摇匀以后再装瓶。');
        S.bottled = true; done('bottle'); drawLabel(); sfx.clink({ freq: 1600, gain: 0.03 });
        const c = conc(), dev = (c - 1) * 100;
        log(['装瓶，贴标签', '标签：NaCl 溶液 1.00 mol/L（要配的浓度）', `实际配成：<b>${c.toFixed(3)} mol/L</b>${Math.abs(dev) < 0.15 ? '（就是 1.00 mol/L）' : dev > 0 ? '（<b>偏大</b>，这次没配准）' : '（<b>偏小</b>，这次没配准）'}`]);
        S.pourT = 0.0001;
        status(`装进试剂瓶，贴好了标签。进了容量瓶的 NaCl ${S.flSalt.toFixed(3)} g（${(S.flSalt / M).toFixed(4)} mol），溶液 ${S.flVol.toFixed(2)} mL，浓度 <b>${c.toFixed(3)} mol/L</b>。`);
        if (W && !S.demo) W.t1.open(); far();
      },
      reset() { if (bar.playing) bar.stop(); S = fresh(); S.view = 'flat'; W?.viewSeg?.set(0); far(); syncScene(); mic.close(); salts.clear(); drops.clear(); W?.tbl.clear(); far(); botLabel.visible = false; botLiq.scale.y = 0.0001; if (W) { W.t1.close(); W.t2.close(); W.t3.close(); W.next.hidden = true; W.ui.relock(); } bar.undo('check', 'paper', 'weigh', 'dissolve', 'transfer', 'wash', 'swirl', 'settle', 'shake', 'bottle'); status('器材重新摆好了。先点一下<b>容量瓶</b>检漏。'); },
    };
    // 演示开始 / 结束：画面上的东西按（换回来的）状态重新摆好——演示里正转着、抬着的容量瓶，放回原处
    const syncScene = () => {
      salts.clear(); drops.clear(); mic.close();
      fl.group.position.copy(FL); fl.group.rotation.set(0, 0, 0); S.checkT = S.checkT > 0 ? 0.0001 : 0; S.shakeT = S.shakeT > 0 ? 0.0001 : 0; S.swirlT = 0;
      if (S.bottled) drawLabel(); else botLabel.visible = false;
      botLiq.scale.y = S.bottled ? 0.05 : 0.0001; S.pourT = 0;
    };
    const drawLabel = () => { const cv = labTex.image, g = cv.getContext('2d'); g.fillStyle = '#fffaf0'; g.fillRect(0, 0, 256, 160); g.strokeStyle = '#c23a3a'; g.lineWidth = 6; g.strokeRect(6, 6, 244, 148); g.fillStyle = '#23293a'; g.font = 'bold 40px "Songti SC", serif'; g.textAlign = 'center'; g.fillText('NaCl 溶液', 128, 62); g.font = 'bold 40px "Times New Roman", serif'; g.fillText('1.00 mol/L', 128, 118); labTex.needsUpdate = true; botLabel.visible = true; };

    // ================= 拿着走的器材：药匙、洗瓶、烧杯、玻璃棒 =================
    // 拖动时跟着手走；靠近“落点”时自己对准过去（药匙到称量纸上方，洗瓶到烧杯口 / 容量瓶口，烧杯到玻璃棒上端，玻璃棒到烧杯里 / 容量瓶口）
    const docks = {
      spoon: [{ k: 'pan', at: () => V(BAL.x - 0.004, PAN_Y + 0.03, BAL.z) }],
      wb: [{ k: 'bk', at: () => S.bkP.clone().add(V(-0.006, BH + 0.03, 0)).sub(WB_TIP) }, { k: 'fl', at: () => FL.clone().add(V(0, fl.neckTop + 0.02, 0)).sub(WB_TIP) }],
      bk: [{ k: 'fl', at: () => FL.clone().add(V(-0.004, fl.neckTop + 0.012, 0)).sub(BK_SPOUT) }],
      rod: [{ k: 'bk', at: () => S.bkP.clone().add(V(0, 0.003, 0)) }, { k: 'fl', at: () => FL.clone().add(V(0, fl.markY - 0.028, 0)) }],
    };
    const homeOf = { spoon: SPOON_HOME, wb: WB, bk: BK, rod: ROD_REST };
    const dockNear = (key, p) => { for (const d of docks[key]) { const a = d.at(); if (Math.abs(p.x - a.x) < 0.04 && Math.abs(p.y - a.y) < 0.07) return d; } return null; };
    const carryStart = (key, p) => { S.carry = key; S.carryP = p ? p.clone() : null; if (key === 'bk') S.pourOn = false; if (key === 'spoon') A.spoonOn(); if (key === 'rod' && S.rod === 'fl') S.rod = 'rest'; };
    const carryMove = (key, p) => {
      if (!p) return; S.carryP = p.clone();
      if (key === 'rod') { const d = dockNear('rod', p); if (d?.k === 'bk' && S.bkWater > 2) { if (S.lastRodX != null) S.stir = Math.min(1, S.stir + Math.abs(p.x - S.lastRodX) * 30); S.lastRodX = p.x; } else S.lastRodX = null; }
    };
    const carryEnd = (key) => {
      const dk = S.carryP && dockNear(key, S.carryP);
      if (key === 'spoon') A.spoonOff();
      if (key === 'rod') S.rod = dk?.k === 'fl' && !S.stopper ? 'fl' : 'rest';
      if (key === 'rod' && S.rod === 'fl') status('玻璃棒插进容量瓶口，下端靠在刻度线以下的瓶颈内壁上。现在把<b>烧杯</b>拖过来，让溶液沿玻璃棒流进去。');
      if (key === 'wb' && S.rinsing) endRinse();
      if (key === 'bk' && S.pours && S.bkWater <= FILM + 0.01 && bar.has('transfer') && S.washes < 3 && !S.said['wash' + S.washes]) { S.said['wash' + S.washes] = true; status(S.washes ? `洗涤了 ${S.washes} 次。课本要求 2～3 次：再用洗瓶冲洗一次烧杯内壁和玻璃棒，洗涤液也注入容量瓶。` : '倒完了。烧杯内壁和玻璃棒上还沾着一层溶液：用<b>洗瓶</b>挤少量蒸馏水冲洗烧杯内壁（约 10 mL），再沿玻璃棒倒进容量瓶。'); }
      S.carry = null; S.carryP = null; S.lastRodX = null;
    };
    const endRinse = () => { S.rinsing = false; if (S.rinseVol > 2) status(`冲洗了烧杯内壁（约 ${S.rinseVol.toFixed(0)} mL）。把<b>烧杯</b>拖到玻璃棒上端，把洗涤液也倒进容量瓶。`); S.rinseVol = 0; };
    const carried = (key) => S.carry === key;
    const dockedAt = (key, k, pos) => { if (!carried(key) || !S.carryP) return false; const d = dockNear(key, S.carryP); return d?.k === k && pos.distanceTo(d.at()) < 0.003; };

    const drag = draggable(group, [
      { obj: spoonPick, plane: 'xy', offset: 0.0, hint: '药匙：按住拖到称量纸上方，抖出 NaCl；松手就停', onStart: (p) => carryStart('spoon', p), onDrag: (p) => carryMove('spoon', p), onEnd: () => carryEnd('spoon') },
      { obj: wbPick, plane: 'xy', offset: 0.0, hint: () => (S.flVol > 1 ? '洗瓶：拖到容量瓶口加水 / 拖到烧杯口冲洗；按住就挤，松手就停' : '洗瓶：拖到烧杯口加蒸馏水；按住就挤，松手就停'), onStart: (p) => carryStart('wb', p), onDrag: (p) => carryMove('wb', p), onEnd: () => carryEnd('wb') },
      { obj: bkPick, plane: 'xy', offset: 0.0, hint: () => (S.bkWater > 1 ? '烧杯：拖到容量瓶口，沿玻璃棒把溶液倒进去' : ''), onStart: (p) => carryStart('bk', p), onDrag: (p) => carryMove('bk', p), onEnd: () => carryEnd('bk') },
      { obj: dropPick, plane: 'xy', offset: 0.0, hint: '胶头滴管：点一下滴一滴；按住不放一滴接一滴，松手就停', onStart: () => { S.dropHold = true; A.tapDropper(); }, onDrag: () => {}, onEnd: () => { S.dropHold = false; }, onTap: () => {} },
      { obj: rodPick, plane: 'xy', offset: 0.0, hint: () => (S.rod === 'fl' ? '玻璃棒：插在容量瓶口引流' : S.dis < 0.98 && S.bkSalt > 0 && S.bkWater > 5 ? '玻璃棒：拖进烧杯里左右搅拌' : '玻璃棒：拖到容量瓶口，用来引流'), onStart: (p) => carryStart('rod', p), onDrag: (p) => carryMove('rod', p), onEnd: () => carryEnd('rod') },
    ], { taps: [
      { obj: fl.pick, hint: () => (!S.checked ? '容量瓶：点一下检漏' : S.atMark || S.over ? '容量瓶：盖塞，反复颠倒摇匀' : S.flVol > 1 ? '容量瓶：轻轻摇动' : ''), onTap: () => A.tapFlask() },
      { obj: papersPick, hint: '称量纸：点一下放到天平上', onTap: () => A.papers() },
      { obj: tarePick, hint: '去皮：显示归零', onTap: () => A.tare() },
      { obj: botPick, hint: '试剂瓶：装瓶，贴上标签', onTap: () => A.bottleTap() },
      { obj: pan, hint: () => (S.panSalt > 0.01 ? (display() > TARGET + 0.025 ? '称多了：点一下用药匙取出一点' : '点一下：把 NaCl 倒进烧杯') : ''), onTap: () => A.panTap() },
    ], tip: tag('', 'pill'), highlight: true });
    const act = demoActs(drag, group);
    const mic = micro({ tag, look, back, group, scene: dissolveScene(), at: () => S.bkP.clone().add(V(0, 0.006, 0)), label: '钻进烧杯里看', state: () => ({ salt: S.bkSalt > 0.1, water: S.bkWater > 5, dis: S.dis, stir: S.stir }), show: () => S.bkSalt > 0.1 && S.bkWater > 5 && S.dis < 1 && !S.pours, bar: () => bar });
    const holdUntil = (obj, p, cond) => {          // 质检：拿到某处按住，条件成立再松手（像学生看着读数松手）
      const me = S, d = drag.items().find((x) => x.obj === obj); d.onStart?.(p.clone()); d.onDrag?.(p.clone(), p.clone());
      const go = () => { if (S !== me) return; if (cond()) { d.onEnd?.(true); return; } requestAnimationFrame(go); }; requestAnimationFrame(go);
    };
    const stirPath = (n = 12) => [null, BK.clone().add(V(0, 0.09, 0)), ...Array.from({ length: n }, (_, j) => BK.clone().add(V(j % 2 ? 0.01 : -0.01, 0.02, 0)))];
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'check', title: '检漏', todo: '点一下<b>容量瓶</b>：加少量水、塞紧、倒立，检查瓶口是否漏水。', target: () => fl.group },
        { id: 'paper', title: '放纸去皮', todo: '点<b>称量纸</b>放到天平上，再按<b>去皮</b>，显示回到 0.00 g。', target: () => (S.paperOn ? tare : papers) },
        { id: 'weigh', title: '称 5.85 g', todo: '计算：n = 1.00 mol/L × 0.100 L = 0.100 mol，m = 0.100 mol × 58.5 g/mol = 5.85 g。按住<b>药匙</b>在纸上方抖出 NaCl，到 5.85 g 松手；再点<b>称量纸</b>倒进烧杯。', target: () => (S.panSalt > 0.01 && Math.abs(display() - TARGET) < 0.025 ? pan : spoon) },
        { id: 'dissolve', title: '溶解', todo: '把<b>洗瓶</b>拖到烧杯口加约 40 mL 蒸馏水，再用<b>玻璃棒</b>搅拌，使 NaCl 全部溶解。', target: () => (S.bkWater < 30 ? wb : rod) },
        { id: 'transfer', title: '沿玻璃棒转移', todo: '把<b>玻璃棒</b>插进容量瓶口（下端靠在刻度线以下），再把<b>烧杯</b>拖过去，让溶液沿玻璃棒流进容量瓶。', target: () => (S.rod === 'fl' ? bk : rod) },
        { id: 'wash', title: '洗涤 2～3 次', todo: '用<b>洗瓶</b>冲洗烧杯内壁和玻璃棒（每次约 10 mL），洗涤液也沿玻璃棒倒进容量瓶。洗 2～3 次。', target: () => (S.bkWater > FILM + 2 ? bk : wb) },
        { id: 'swirl', title: '轻轻摇动', todo: '点一下<b>容量瓶</b>，轻轻摇动，使溶液混合均匀。', target: () => fl.group },
        { id: 'settle', title: '定容', todo: '用<b>洗瓶</b>往容量瓶里加水到刻度线下 1～2 cm，再点<b>胶头滴管</b>一滴一滴地加，直到凹液面与刻度线相切。', target: () => (fl.markY - L() > 0.02 ? wb : dropper) },
        { id: 'shake', title: '盖塞摇匀', todo: '点一下<b>容量瓶</b>：盖好瓶塞，反复上下颠倒，摇匀。', target: () => fl.group },
        { id: 'bottle', title: '装瓶贴签', todo: '点一下<b>试剂瓶</b>：把配好的溶液倒进去，贴上标签。', target: () => bottle },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => syncScene() }),
          shots: [
            { cap: '使用前先检漏：加少量水、塞紧、倒立，瓶口不漏水；瓶塞转 180° 再试一次。', dur: 5, speed: 1.3, cam: [[FL.x, 0.09, FL.z], [0.05, 0.25, 1], 0.4], during: act.tap(fl.pick, 0.05) },
            { cap: '计算：0.100 L × 1.00 mol/L = 0.100 mol，× 58.5 g/mol = 5.85 g。天平上放称量纸，去皮。', dur: 4, cam: [[BAL.x, 0.04, BAL.z + 0.02], [0.04, 0.45, 1], 0.24], during: act.seq(act.tap(papersPick, 0.15), act.tap(tarePick, 0.6)) },
            { cap: '药匙在纸上方轻轻抖，加到 5.85 g 就停；倒进烧杯。', dur: 6, speed: 2, cam: [[BAL.x, 0.04, BAL.z + 0.02], [0.04, 0.45, 1], 0.24],
              during: act.seq(act.drag(spoonPick, () => docks.spoon[0].at(), { t0: 0.04, t1: 0.2, release: 0.97, until: () => display() >= TARGET - 0.004 }), act.tap(pan, 0.93)) },
            { cap: '加约 40 mL 蒸馏水，用玻璃棒搅拌，使 NaCl 全部溶解。', dur: 7, speed: 1.8, cam: [[BK.x, 0.05, BK.z], [0.04, 0.3, 1], 0.28],
              during: act.seq(act.drag(wbPick, () => docks.wb[0].at(), { t0: 0.03, t1: 0.15, release: 0.97, until: () => S.bkWater >= 40 }),
                act.path(rodPick, stirPath(14), { t0: 0.45, t1: 0.92, release: 0.95 })) },
            { cap: '玻璃棒插进容量瓶口，下端靠在刻度线以下；溶液沿玻璃棒注入 100 mL 容量瓶。', dur: 6, speed: 1.6, cam: [[FL.x - 0.035, 0.15, 0], [0.04, 0.2, 1], 0.38],
              during: act.seq(act.drag(rodPick, () => docks.rod[1].at(), { t0: 0.03, t1: 0.2, release: 0.24 }),
                act.drag(bkPick, () => docks.bk[0].at(), { t0: 0.3, t1: 0.45, release: 0.98, until: () => S.bkWater <= FILM + 0.01 })) },
            { cap: '用少量蒸馏水洗涤烧杯内壁和玻璃棒 2～3 次，洗涤液也都注入容量瓶。', dur: 9, speed: 2.2, cam: [[(BK.x + FL.x) / 2, 0.12, 0], [0.04, 0.2, 1], 0.42],
              during: act.seq(
                act.drag(wbPick, () => docks.wb[0].at(), { t0: 0.02, t1: 0.1, release: 0.25, until: () => S.bkWater >= 10 }),
                act.drag(bkPick, () => docks.bk[0].at(), { t0: 0.27, t1: 0.35, release: 0.5, until: () => S.bkWater <= FILM + 0.01 }),
                act.drag(wbPick, () => docks.wb[0].at(), { t0: 0.52, t1: 0.6, release: 0.74, until: () => S.bkWater >= 10 }),
                act.drag(bkPick, () => docks.bk[0].at(), { t0: 0.76, t1: 0.84, release: 0.98, until: () => S.bkWater <= FILM + 0.01 })) },
            { cap: '拿开玻璃棒，轻轻摇动容量瓶，使溶液混合均匀。', dur: 4, cam: [[FL.x, 0.09, FL.z], [0.05, 0.25, 1], 0.4], during: act.seq(act.drag(rodPick, () => ROD_REST.clone().setY(0.09), { t0: 0.02, t1: 0.3, release: 0.35 }), act.tap(fl.pick, 0.55)) },
            { cap: '加水到刻度线下 1～2 cm，改用胶头滴管滴加，到凹液面与刻度线相切（视线平视）。', dur: 9, speed: 2.4, cam: [[FL.x, 0.12, FL.z], [0.0, 0.0, 1], 0.2],
              during: act.seq(act.drag(wbPick, () => docks.wb[1].at(), { t0: 0.03, t1: 0.12, release: 0.6, until: () => L() >= fl.markY - 0.012 }),
                act.drag(dropPick, () => dBot.tipHome.clone(), { t0: 0.62, t1: 0.63, release: 0.99, until: () => S.atMark || S.over })) },
            { cap: '盖好瓶塞，反复上下颠倒，摇匀。装进试剂瓶，贴上标签。演示完了，换你自己做。', dur: 6, speed: 1.4, cam: [[(FL.x + BOT.x) / 2, 0.08, 0], [0.04, 0.25, 1], 0.36], during: act.seq(act.tap(fl.pick, 0.05), act.tap(botPick, 0.75)) },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ================= 每帧 =================
    const FLIP_C = 0.085;          // 倒立时绕瓶子中部转（瓶身中心约 8.5 cm 高），再抬起一点
    const flipAt = (rz, lift) => { fl.group.position.set(FL.x + FLIP_C * Math.sin(rz), FL.y + FLIP_C * (1 - Math.cos(rz)) + lift, FL.z); };
    const step = (dt) => {
      // 检漏动画：加水 → 塞上 → 倒立 → 正过来转塞 → 再倒立 → 倒掉
      if (S.checkT > 0) {
        S.checkT += dt / 6; const k = S.checkT;
        fl.group.rotation.z = Math.PI * (k < 0.2 ? 0 : k < 0.35 ? (k - 0.2) / 0.15 : k < 0.45 ? 1 : k < 0.55 ? 1 - (k - 0.45) / 0.1 : k < 0.7 ? (k - 0.55) / 0.15 : k < 0.8 ? 1 : 1 - (k - 0.8) / 0.12);
        fl.group.rotation.z = Math.max(0, Math.min(Math.PI, fl.group.rotation.z)); flipAt(fl.group.rotation.z, 0.03 * Math.sin(Math.min(1, k / 0.2, (1 - k) / 0.12) * Math.PI / 2));
        if (k >= 1) { S.checkT = 0; S.checked = true; fl.group.rotation.z = 0; fl.group.position.copy(FL); done('check'); log(['检漏', '倒立两次（第二次瓶塞转 180°），瓶口没有水渗出', '不漏水，可以用']); status('不漏水。接下来称量：点<b>称量纸</b>放到天平上。'); }
      }
      // 药匙
      const spDock = S.carry === 'spoon' && S.carryP && dockNear('spoon', S.carryP);
      const spGoal = S.carry === 'spoon' ? (spDock ? spDock.at() : S.carryP?.clone().setY(Math.max(0.05, S.carryP.y)) ?? SPOON_HOME) : SPOON_HOME;
      spoon.position.lerp(spGoal, 0.25);
      spoon.rotation.z += ((spDock ? -0.3 + Math.sin(performance.now() / 60) * 0.06 : 0) - spoon.rotation.z) * 0.4;
      if (S.spoonAt && spDock && spoon.position.distanceTo(spDock.at()) < 0.004) {
        const d = display(), rate = d < TARGET - 0.4 ? 0.9 : 0.12;          // 快到了就轻轻抖（每秒约 0.12 g）
        S.panSalt += rate * dt;
        if (Math.random() < dt * 30) salts.spawn({ p: spoon.position.clone().add(V(0.003, -0.004, 0)), v: V((Math.random() - 0.5) * 0.01, -0.03, (Math.random() - 0.5) * 0.01), size: 0.0008, life: 0.8, floor: PAN_Y + 0.002 });
      }
      wPaper.visible = S.paperOn && S.paperFly === 0; wPaper.position.set(BAL.x, PAN_Y + 0.0016, BAL.z);
      heap.visible = S.panSalt > 0.02; heap.position.set(BAL.x, PAN_Y + 0.002, BAL.z); heap.scale.set(1, 0.45, 1).multiplyScalar(Math.cbrt(S.panSalt / TARGET) || 0.01);
      if (S.paperFly > 0) {          // 称量纸拿到烧杯口上方，倾斜，NaCl 滑进烧杯
        S.paperFly += dt / 1.6; const k = Math.min(1, S.paperFly);
        wPaper.visible = k < 1; wPaper.position.lerpVectors(V(BAL.x, PAN_Y + 0.002, BAL.z), S.bkP.clone().add(V(0, BH + 0.02, 0)), Math.sin(Math.min(1, k * 1.4) * Math.PI / 2)); wPaper.rotation.z = -Math.max(0, k - 0.5) * 1.2;
        if (k > 0.55 && k < 0.85 && Math.random() < dt * 40) salts.spawn({ p: wPaper.position.clone(), v: V((Math.random() - 0.5) * 0.01, -0.02, (Math.random() - 0.5) * 0.01), size: 0.001, life: 1.5, floor: 0.003 });
        if (k >= 1) { S.paperFly = 0; S.paperOn = false; S.tareG = 0; }
      }
      // 洗瓶：到了烧杯口 / 容量瓶口，按住就往里挤水
      const wDock = S.carry === 'wb' && S.carryP && dockNear('wb', S.carryP);
      const wGoal = S.carry === 'wb' ? (wDock ? wDock.at() : S.carryP?.clone().setY(Math.max(0.07, S.carryP.y - 0.04)) ?? WB) : WB;
      wb.position.lerp(wGoal, 0.22); wb.rotation.z += ((wDock ? WB_TILT : 0) - wb.rotation.z) * 0.25;
      const wTip = wb.position.clone().add(V(0.024, 0.0975, 0).applyAxisAngle(V(0, 0, 1), wb.rotation.z));
      if (wDock && wb.position.distanceTo(wDock.at()) < 0.004) {
        if (wDock.k === 'bk' && S.bkWater < BH * 0.85 * Math.PI * BR * BR * 1e6) {
          const add = (S.pours ? 6 : 12) * dt;          // 冲洗时挤得少一点
          if (S.pours) { S.rinsing = true; S.rinseVol += add; }
          S.bkWater += add;
          if (Math.random() < dt * 25) drops.spawn({ p: wTip.clone(), v: V(0.01, -0.03, 0), size: 0.0011, life: 1.2, floor: 0.0012 + S.bkWater * 1e-6 / (Math.PI * BR * BR) });
        } else if (wDock.k === 'fl' && !S.stopper) {
          const add = 6 * dt; S.flVol += add;
          if (Math.random() < dt * 25) drops.spawn({ p: wTip.clone(), v: V(0.004, -0.05, 0), size: 0.0011, life: 1.4, floor: L() });
          if (!S.nearMark && fl.markY - L() < 0.02 && fl.markY - L() > 0.009) { S.nearMark = true; status('液面离刻度线 1～2 cm 了：<b>松开洗瓶</b>，改用胶头滴管滴加。'); }
        }
      }
      wb.position.y = Math.max(0, wb.position.y);
      // 玻璃棒：在烧杯里搅拌；插在容量瓶口引流；不用时平放在桌上
      const rDock = S.carry === 'rod' && S.carryP && dockNear('rod', S.carryP);
      let rGoal = ROD_REST, rTilt = Math.PI / 2;
      if (S.carry === 'rod') {
        if (rDock?.k === 'bk') { rGoal = rDock.at().add(V(clamp(S.carryP.x - rDock.at().x, -0.012, 0.012), 0, 0)); rTilt = 0.12;
}
        else if (rDock?.k === 'fl') { rGoal = rDock.at(); rTilt = 0.05; }
        else { rGoal = S.carryP ? S.carryP.clone().setY(Math.max(0.08, S.carryP.y)) : ROD_REST; rTilt = 0.3; }
      } else if (S.rod === 'fl') { rGoal = docks.rod[1].at(); rTilt = 0.05; }
      S.rodP.lerp(rGoal, 0.25); rod.position.copy(S.rodP); rod.rotation.z += (rTilt - rod.rotation.z) * 0.3;
      // 溶解：搅拌加快（不搅也会慢慢溶）
      if (S.bkSalt > 1e-6 && S.bkWater > 2 && S.dis < 1) {
        const room = Math.min(1, S.bkWater * 0.36 / Math.max(0.01, S.bkSalt * 1));          // 20 ℃ 溶解度约 36 g/100 g 水
        S.dis = Math.min(room, S.dis + dt * (0.03 + S.stir * 0.5)); S.stir = Math.max(0, S.stir - dt * 0.25);          // 时间压缩：搅拌几秒就溶完（示意）
        if (S.dis >= 0.98 && !S.said.dis) { S.said.dis = true; S.dis = 1; done('dissolve'); log(['溶解', `加水约 ${S.bkWater.toFixed(0)} mL，玻璃棒搅拌`, 'NaCl 全部溶解，溶液无色透明']); status('全部溶解了。把<b>玻璃棒</b>插进容量瓶口，准备转移。'); }
      }
      crystals.visible = S.bkSalt * (1 - S.dis) > 0.02;
      crystals.scale.set(1, 0.4, 1).multiplyScalar(Math.cbrt(Math.max(0.0001, S.bkSalt * (1 - S.dis)) / TARGET) || 0.01);
      // 烧杯：拿到玻璃棒上端，倾斜，溶液沿玻璃棒流进容量瓶（没有玻璃棒引流：从杯口直接倒，约一成洒到外面）
      const bDock = S.carry === 'bk' && S.carryP && dockNear('bk', S.carryP);
      const bGoal = S.carry === 'bk' ? (bDock ? bDock.at() : S.carryP?.clone().setY(Math.max(0.0, S.carryP.y - 0.05)) ?? BK) : BK;
      S.bkP.lerp(bGoal, 0.22); bk.position.copy(S.bkP);
      const pour = bDock && S.bkP.distanceTo(bDock.at()) < 0.004 && S.bkWater > FILM && !S.stopper;
      bk.rotation.z += ((bDock ? BK_TILT : 0) - bk.rotation.z) * 0.18;
      if (pour && bk.rotation.z > BK_TILT - 0.15) {
        const dv = Math.min(14 * dt, S.bkWater - FILM), sol = S.bkSalt * S.dis, ds = sol * dv / S.bkWater, spill = S.rod === 'fl' ? 0 : 0.12;
        S.bkWater -= dv; S.bkSalt -= ds; S.dis = S.bkSalt > 1e-9 ? Math.max(0, sol - ds) / S.bkSalt : 1; S.flVol += dv * (1 - spill); S.flSalt += ds * (1 - spill); S.spilled += ds * spill;
        if (!S.pourOn) { S.pourOn = true; S.pours += 1;
          if (S.pours === 1 && S.dis < 0.98 && !S.demo) status('NaCl 还没全部溶解就开始转移了……没溶解的固体留在烧杯里。'); }
        if (spill > 0 && !S.said['spill' + S.pours]) { S.said['spill' + S.pours] = true; status('没有用玻璃棒引流：溶液从杯口直接往瓶口倒，<b>有一部分洒到了瓶外</b>。'); }
        if (Math.random() < dt * (spill ? 30 : 18)) drops.spawn({ p: FL.clone().add(V(spill && Math.random() < spill * 3 ? 0.012 : 0, fl.neckTop + 0.01, 0)), v: V(0, -0.07, 0), size: 0.0012, life: 1.5, floor: spill && Math.random() < 0.3 ? 0.002 : L() });
        if (S.bkWater <= FILM + 0.01) {
          if (S.pours === 1 && !S.said.transferred) { S.said.transferred = true; done('transfer'); log(['转移', S.rod === 'fl' ? '沿玻璃棒注入容量瓶' : '<b>没有用玻璃棒引流</b>', S.spilled > 0 ? `约 ${S.spilled.toFixed(2)} g NaCl 随溶液洒到瓶外` : '烧杯内壁和玻璃棒上还沾着约 0.6 mL 溶液']); }
          else if (S.pours > 1 && !S.said['washed' + S.pours]) { S.said['washed' + S.pours] = true; S.washes += 1; log([`洗涤第 ${S.washes} 次`, '冲洗烧杯内壁和玻璃棒，洗涤液注入容量瓶', `烧杯里还剩 NaCl 约 ${(S.bkSalt * 1000).toFixed(S.bkSalt < 0.001 ? 2 : 1)} mg`]); if (S.washes >= 2) done('wash'); }
        }
      }
      // 胶头滴管：点一下，拿到容量瓶口上方滴一滴（0.05 mL），再回到滴瓶
      if (S.dropT > 0) {
        S.dropT += dt / (S.dropHold ? 0.25 : 0.9); const k = S.dropT, above = FL.clone().add(V(0, fl.neckTop + 0.012, 0));
        S.dropPark = !S.atMark && !S.over; dropper.position.lerp(above, 0.3);
        if (k > 0.4 && !S.dropDone) { S.dropDone = true; S.drops += 1; S.flVol += 0.05; drops.spawn({ p: above.clone(), v: V(0, -0.05, 0), size: 0.0012, life: 1.2, floor: L() }); sfx.clink({ freq: 2600, gain: 0.012 }); afterDrop(); }
        if (k >= 1) { S.dropT = 0; if (S.dropHold && !S.atMark && !S.over && !S.stopper) A.tapDropper(); }
      } else { if (S.atMark || S.over || S.stopper) S.dropPark = false; dropper.position.lerp(S.dropPark ? FL.clone().add(V(0, fl.neckTop + 0.012, 0)) : dBot.tipHome, 0.3); }          // 定容时滴管停在瓶口上方，接着点
      // 定容到刻度线
      const lv = L();
      if (!S.over && !S.atMark && apparentGap() < -0.0004 && S.flVol > 50 && !S.said.over) {
        S.over = true; S.said.over = true; status('<b>加水超过了刻度线！</b>溶液体积比 100 mL 多，浓度偏小。只能重新配制（“更多”里全部重来）——你也可以接着做完，看看浓度差多少。');
        log(['定容', '<b>加水超过了刻度线</b>', `实际约 ${S.flVol.toFixed(1)} mL`]); done('settle');
      }
      const ck = S.checkT, bot = S.bottled ? Math.min(1, Math.max(0, (botLiq.scale.y - 0.0001) / 0.0499)) : 0;
      fl.setVolume(ck > 0 ? (ck < 0.08 ? ck / 0.08 * 20 : ck < 0.94 ? 20 : 20 * (1 - (ck - 0.94) / 0.06)) : S.flVol * (1 - bot));
      // 轻轻摇动 / 颠倒摇匀
      if (S.swirlT > 0) { S.swirlT += dt / 1.6; fl.group.rotation.x = Math.sin(S.swirlT * Math.PI * 4) * 0.08 * (1 - S.swirlT); if (S.swirlT >= 1) { S.swirlT = 0; fl.group.rotation.x = 0; } }
      if (S.shakeT > 0) {
        S.shakeT += dt / 5; const k = S.shakeT, flips = 3, ph = k * flips;
        fl.group.rotation.z = Math.PI * Math.abs(Math.sin(ph * Math.PI)) * (k < 1 ? 1 : 0); flipAt(fl.group.rotation.z, 0.03 * Math.sin(Math.min(1, k / 0.12, Math.max(0, 1 - k) / 0.12) * Math.PI / 2));
        if (k >= 1) { S.shakeT = 0; S.shaken = true; fl.group.rotation.z = 0; fl.group.position.copy(FL); done('shake'); log(['摇匀', '盖好瓶塞，反复上下颠倒', '溶液混合均匀']); status('摇匀了。点一下<b>试剂瓶</b>，装瓶贴标签。'); }
      }
      // 瓶塞：盖上时在瓶口（随瓶子一起转）；不用时放在瓶子旁边
      if (S.stopper || (S.checkT > 0.1 && S.checkT < 0.92)) { flStop.position.copy(fl.group.position).add(V(0, fl.neckTop + 0.004, 0).applyEuler(fl.group.rotation)); flStop.rotation.copy(fl.group.rotation); }
      else { flStop.position.copy(STOP_REST); flStop.rotation.set(Math.PI / 2, 0, 0.3); }
      // 装瓶
      if (S.pourT > 0) {          // 装瓶：拔下瓶塞放在桌上，拿起容量瓶移到试剂瓶口上方、倾斜，溶液倒进去，再放回原处
        S.pourT = Math.min(1, S.pourT + dt / 3.4); const k = S.pourT, ease = (u) => u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);
        S.stopper = false;
        const go = ease((k - 0.08) / 0.22), back2 = ease((k - 0.86) / 0.14), tilt = ease((k - 0.25) / 0.15) * (1 - back2);
        const at = FL.clone().lerp(BOT.clone().add(V(-0.07, 0.11, 0)), go * (1 - back2));
        fl.group.position.copy(at); fl.group.rotation.z = -tilt * 1.95;
        const pourK = Math.max(0, Math.min(1, (k - 0.4) / 0.42));
        botLiq.scale.y = 0.0001 + 0.0499 * pourK;
        if (pourK > 0 && pourK < 1 && Math.random() < dt * 30) drops.spawn({ p: BOT.clone().add(V(0, 0.08, 0)), v: V(0, -0.06, 0), size: 0.0014, life: 1.2, floor: 0.002 + botLiq.scale.y });
        if (k >= 1) { S.pourT = 0; fl.group.position.copy(FL); fl.group.rotation.set(0, 0, 0); }
      }
      bk.setLevel(S.bkWater > 0.05 ? 0.0012 + S.bkWater * 1e-6 / (Math.PI * BR * BR) : 0);
      salts.update(dt, (p, d) => { p.v.y -= 0.4 * d; p.p.addScaledVector(p.v, d); return p.p.y > (p.floor ?? 0.003); });
      drops.update(dt, (p, d) => { p.v.y -= 0.6 * d; p.p.addScaledVector(p.v, d); return p.p.y > (p.floor ?? 0.002); });
      // 视线：俯视 / 仰视时，从眼睛经过刻度线落到瓶颈中心
      const showSight = S.view !== 'flat' && bar.current === 'settle' && fl.markY - lv < 0.025 && !S.demo;
      sight.visible = showSight;
      if (showSight) { const s = VIEWS[S.view], mk = FL.clone().add(V(0, fl.markY, fl.neckR + 0.0011)), eye = mk.clone().add(V(0, s * 0.03 * Math.tan(25 * Math.PI / 180), 0.03)), hit = mk.clone().add(mk.clone().sub(eye).multiplyScalar((fl.neckR + 0.0011) / 0.03)); sight.geometry.setFromPoints([eye, hit]); sight.computeLineDistances(); }
      // 近看：称量看显示屏；定容看刻度线（按选的视线）
      if (!S.demo) {
        if (bar.current === 'weigh' && S.paperOn && !S.paperFly) near('bal', [BAL.x, 0.03, BAL.z + 0.02], [0.03, 0.5, 1], 0.2);
        else if (bar.current === 'settle' && (S.dropPark || S.dropT > 0) && !S.carry) near('mark' + S.view, [FL.x, (fl.markY + fl.neckTop + 0.012) / 2, FL.z], [0.0, VIEWS[S.view] * 0.47, 1], 0.17, { minEl: -0.6 });          // 刻度线和停在瓶口上方的滴管都在画面里
        else if (nearK && !(bar.current === 'weigh' || bar.current === 'settle')) far();
      }
      bar.near?.(!!nearK);
      if (S.bottled && !S.pourT) { const c = conc(), dev = (c - 1) * 100; botCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">实际配成</span></div><div class="cc-more"><b>${c.toFixed(3)} mol/L</b>${Math.abs(dev) < 0.15 ? '' : dev > 0 ? '（偏大）' : '（偏小）'}<br><small>标签上是要配的 1.00 mol/L</small></div></div>`).loc(group, BOT.x, 0.1, BOT.z).show(!bar.playing); } else botCard.show(false);
      // 卡片
      balCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">电子天平</span></div><div class="cc-more"><div class="cc-obs"><b style="font-size:1.2em">${display().toFixed(2)} g</b><small>${S.paperOn && S.tareG < PAPER_G - 1e-6 ? '没有去皮：含称量纸' : '0.01 g 的普通电子天平'}</small></div></div></div>`).loc(group, BAL.x, 0.06, BAL.z).show(S.paperOn && !bar.playing);
      const g = apparentGap();
      flCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">容量瓶 100 mL</span></div><div class="cc-more">${S.flVol > 0.5 ? `${fl.markY - lv > 0.003 ? `液面在刻度线下 ${((fl.markY - lv) * 1000).toFixed(0)} mm` : S.over ? '<b>超过了刻度线</b>' : `${VIEW_NAME[S.view]}：${Math.abs(g) < 0.0003 ? '<b>凹液面与刻度线相切</b>' : g > 0 ? `还差约 ${(g * 1000).toFixed(1)} mm` : '凹液面在刻度线上方'}`}` : '空瓶'}</div></div>`).loc(group, FL.x, fl.neckTop + 0.02, FL.z).show(S.checked && S.flVol > 0.5 && !bar.playing && !S.bottled);
      bkCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">烧杯</span></div><div class="cc-more">${S.bkWater > 1 ? `约 ${S.bkWater.toFixed(0)} mL${S.bkSalt > 0.01 && !S.pours ? ` · NaCl ${S.dis < 0.98 ? '溶解中' : '全部溶解'}` : ''}` : S.pours ? '内壁上沾着一层溶液' : ''}</div></div>`).loc(group, S.bkP.x, BH + 0.015, S.bkP.z).show((S.bkWater > 1 || S.pours) && !bar.playing && !S.bottled);
      wb.visible = true; mic.update?.(dt);
    };
    function afterDrop() {
      const g = apparentGap();
      if (S.over) return;
      if (Math.abs(g) < 0.0003) {
        S.atMark = true; S.dropHold = false; done('settle');
        const V0 = S.flVol;
        log(['定容', `${VIEW_NAME[S.view]}刻度线，滴到凹液面与刻度线相切`, S.view === 'flat' ? `溶液 ${V0.toFixed(2)} mL` : `<b>实际 ${V0.toFixed(2)} mL</b>（${S.view === 'down' ? '俯视：以为到了，其实水加少了' : '仰视：以为刚到，其实水加多了'}）`]);
        status(`${S.view === 'flat' ? '平视' : VIEW_NAME[S.view]}看过去，凹液面与刻度线相切了。点一下<b>容量瓶</b>，盖好瓶塞，颠倒摇匀。`);
      } else if (g > 0) status(`还差约 ${(g * 1000).toFixed(1)} mm（${VIEW_NAME[S.view]}看）。再滴一滴。`);
    }

    return {
      group: root, pointer, card: false, toggles: ['cards', 'steps'],
      size: { w: 0.42, d: 0.22, h: 0.18 },
      view: { elev: 22, azim: -4, lookY: 0.4, frameMargin: 1.02 },
      mount(ui) {
        const ctx = () => `<div>称了 ${(S.flSalt + S.spilled + S.bkSalt).toFixed(2)} g NaCl；进了容量瓶 ${S.flSalt.toFixed(3)} g${S.spilled > 0 ? `，洒到瓶外 ${S.spilled.toFixed(2)} g` : ''}；洗涤 ${S.washes} 次；定容时${VIEW_NAME[S.view]}${S.over ? '，加水超过了刻度线' : ''}</div><div>算出来：<b>${S.flVol > 0 ? conc().toFixed(3) : '—'} mol/L</b></div>`;
        const t3 = think({ q: '如果定容时<b>俯视</b>刻度线，配成的溶液浓度比要求的大了还是小了？', ctx, options: ['偏大：俯视觉得到了，其实水加少了', '偏小', '不变'], wrong: ['俯视时，视线经过刻度线落在凹液面以上的地方——你以为到了，液面其实还在刻度线下面，水加少了，V 偏小。', '体积变了，浓度就变了。'], ok: '对：俯视，V 偏小，浓度偏大；仰视相反，V 偏大，浓度偏小（课本第 60 页“思考与讨论”（3））。', status: (m) => W?.status(m), onOk: () => { done('why'); if (W) W.next.hidden = false; } });
        const t2 = think({ q: '转移时不慎把溶液洒到容量瓶外，最后配成的溶液浓度比要求的大了还是小了？', ctx, options: ['偏小：溶质少了，体积还是 100 mL', '偏大', '不变：后面加水补上了'], wrong: ['洒出去的是溶液，里面有溶质。', '后面加的是水，补不回溶质。'], ok: '对：洒出去的溶液带走了溶质，n 偏小，浓度偏小（课本第 60 页“思考与讨论”（2））。', status: (m) => W?.status(m), onOk: () => t3.open() });
        const t1 = think({ q: '为什么要用蒸馏水洗涤烧杯内壁和玻璃棒 2～3 次，并把洗涤液也注入容量瓶？', ctx, options: ['烧杯内壁和玻璃棒上沾着溶液，洗下来溶质才全部进容量瓶', '为了把烧杯洗干净，下次好用', '让溶液快点冷却'], wrong: ['洗涤液是倒进容量瓶的——要的是里面的溶质。', '和温度无关。看看你的记录：没洗的时候烧杯里还剩多少 NaCl？'], ok: '对：倒完后烧杯内壁、玻璃棒上还沾着约 0.6 mL 溶液，里面有约 2% 的 NaCl；洗 2 次以后几乎全部进了容量瓶（课本第 60 页“思考与讨论”（1））。', status: (m) => W?.status(m), onOk: () => t2.open() });
        const viewSeg = seg('', ['平视', '俯视', '仰视'], (_, k) => { S.view = ['flat', 'down', 'up'][k]; nearK = ''; W?.status(`定容时改成<b>${['平视', '俯视', '仰视'][k]}</b>刻度线。`); });
        const vary = varyBox('定容时的视线（课本第 60 页“思考与讨论”（3））：俯视、仰视刻度线，看看浓度会怎样。也可以试试不用玻璃棒引流、不洗涤，或者加水超过刻度线。', h('div', { class: 'row' }, h('span', {}, '定容时的视线 '), viewSeg.el));
        const more = moreBox([['检漏', () => A.check()], ['放称量纸', () => A.papers()], ['去皮', () => A.tare()], ['滴一滴', () => A.tapDropper()], ['摇动 / 摇匀容量瓶', () => A.tapFlask()], ['装瓶贴签', () => A.bottleTap()], ['钻进烧杯里看', () => mic.open()]], () => A.reset());
        const note = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'), h('p', { class: 'fineprint', html: 'NaCl 的摩尔质量按课本取 58.5 g/mol；称量纸约 0.32 g；电子天平显示到 0.01 g（课本注①：本应用分析天平，学校可暂用托盘天平或普通电子天平）。<br>倒完后烧杯内壁和玻璃棒上约留 0.6 mL 溶液（示意值）；每次洗涤用水约 10 mL。没有玻璃棒引流时约一成溶液洒到瓶外（示意值）。<br>容量瓶瓶颈内径约 12 mm，一滴约 0.05 mL，液面升高约 0.4 mm；俯视 / 仰视按视线偏离水平约 25° 算，凹液面和刻度线错开约 2.8 mm（约 0.3 mL）。溶解速度为示意（20 ℃ 时 NaCl 溶解度约 36 g/100 g 水）。' }));
        const base = mountXuean(ui, { controls: [vary, more, note], headers: ['做了什么', '现象', '说明'], intro: '配制 100 mL 1.00 mol/L NaCl 溶液。先点一下容量瓶检漏；也可以先看老师演示。' });
        ui.data.append(t1.el, t2.el, t3.el, base.next);
        W = { ...base, ui, t1, t2, t3, viewSeg, status: ui.status }; bar.attach(ui);
      },
      update(dt) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k); },
      dispose() { bar.dispose(); drag.dispose(); mic.dispose?.(); salts.dispose(); drops.dispose(); },
      debug: {
        get S() { return S; }, bar, A, fl, conc,
        picks: { spoon: spoonPick, wb: wbPick, bk: bkPick, rod: rodPick, flask: fl.pick, papers: papersPick, tare: tarePick, dropper: dropPick, bottle: botPick, pan },
        qa: qaFlow(drag, [
          { name: '检漏', tap: fl.pick, wait: 7 },
          { name: '放称量纸', tap: papersPick, wait: 1 },
          { name: '去皮', tap: tarePick, wait: 1 },
          { name: '称 5.85 g', run: () => holdUntil(spoonPick, docks.spoon[0].at(), () => display() >= TARGET - 0.004), wait: 14, scale: 1 },
          { name: '倒入烧杯', tap: pan, wait: 2 },
          { name: '加水', run: () => holdUntil(wbPick, docks.wb[0].at(), () => S.bkWater >= 40), wait: 5 },
          { name: '搅拌', run: () => { const d = drag.items().find((x) => x.obj === rodPick); const p = docks.rod[0].at(); d.onStart(p.clone()); for (let i = 0; i < 40; i++) d.onDrag(p.clone().add(V(i % 2 ? 0.01 : -0.01, 0, 0))); }, wait: 6 },
          { name: '停止搅拌', run: () => drag.items().find((x) => x.obj === rodPick).onEnd(true), wait: 1 },
          { name: '玻璃棒引流', drag: rodPick, to: () => docks.rod[1].at(), wait: 1 },
          { name: '转移', run: () => holdUntil(bkPick, docks.bk[0].at(), () => S.bkWater <= FILM + 0.01), wait: 6 },
          { name: '冲洗 1', run: () => holdUntil(wbPick, docks.wb[0].at(), () => S.bkWater >= 10), wait: 4 },
          { name: '洗涤液转移 1', run: () => holdUntil(bkPick, docks.bk[0].at(), () => S.bkWater <= FILM + 0.01), wait: 4 },
          { name: '冲洗 2', run: () => holdUntil(wbPick, docks.wb[0].at(), () => S.bkWater >= 10), wait: 4 },
          { name: '洗涤液转移 2', run: () => holdUntil(bkPick, docks.bk[0].at(), () => S.bkWater <= FILM + 0.01), wait: 4 },
          { name: '拿开玻璃棒', drag: rodPick, to: () => ROD_REST.clone().setY(0.09), wait: 2 },
          { name: '轻轻摇动', tap: fl.pick, wait: 2 },
          { name: '加水到刻度线下', run: () => holdUntil(wbPick, docks.wb[1].at(), () => L() >= fl.markY - 0.012), wait: 8 },
          { name: '滴加到刻度线', run: () => holdUntil(dropPick, dBot.tipHome.clone(), () => S.atMark || S.over), wait: 14 },
          { name: '盖塞摇匀', tap: fl.pick, wait: 6 },
          { name: '装瓶', tap: botPick, wait: 2 },
          { name: '核对浓度', run: () => { const c = conc(); if (!(S.washes >= 2 && Math.abs(c - 1) < 0.005)) throw new Error(`浓度 ${c.toFixed(4)}，洗涤 ${S.washes} 次`); }, wait: 1 },
        ]),
      },
    };
  },
};
