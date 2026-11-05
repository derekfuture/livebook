// 实验活动7 粗盐中难溶性杂质的去除（课本下册第 56–57 页图 9-18、9-19）。
//
// 1 溶解：称取 5.0 g 粗盐，用药匙逐渐加入盛有 10 mL 水的烧杯，边加边用玻璃棒搅拌，一直加到粗盐不再溶解为止；称量剩下的粗盐。
// 2 过滤（图 9-18）：玻璃棒引流，把浑浊的液体倒进漏斗；看滤纸上的剩余物、滤液的颜色。
// 3 蒸发（图 9-19）：滤液倒进蒸发皿，酒精灯加热，玻璃棒不断搅拌；出现较多固体时停止加热，用余热蒸干。
// 4 计算产率：精盐质量 ÷ 加到水中的粗盐质量。
// 过滤的“三靠”（图 9-18）：烧杯口紧靠玻璃棒，玻璃棒斜靠在三层滤纸一边，漏斗下端管口紧靠接滤液的烧杯内壁（这只烧杯放在铁架台底座上）。
//   漏斗的管口伸在烧杯里：拿走这只烧杯时先把漏斗提起来一点，烧杯从漏斗下面挪出来再拿高。
// 酒精灯有灯帽（kit/labops.js 的 lampCap）：点燃前取下放在桌上，用完用灯帽盖灭，再轻提一下、重新盖好。
// 模型：粗盐按 88% 氯化钠 + 12% 泥沙等难溶物计；20 ℃ 时 10 mL 水最多溶解 3.6 g 氯化钠（溶解度 36 g）→ 约加进 4.1 g 粗盐就不再溶解。
//   过滤：滤纸湿着会留下约 0.5 mL 溶液（带走约 5% 的盐）；液面高于滤纸边缘 → 有浑浊液从滤纸和漏斗之间流下去，滤液仍浑浊。
//   蒸发：不搅拌时局部过热，液滴飞溅（按“不搅拌加热的时间”算损失）；一直加热到蒸干，最后的固体也会飞溅。精盐里仍有可溶性杂质（这一步去不掉）。
import * as THREE from 'three';
import { buttons, seg, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { stand, textPlate } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { chemBeaker, chemLamp, glassMat, CHEM } from './kit/chem.js';
import { water2, milky } from './kit/chemfx.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { lampCap, homeLift } from './kit/labops.js';
import { sfx } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const PURE = 0.88, SOLUB = 0.36;                 // 粗盐里氯化钠的比例；每 mL 水最多溶 0.36 g
const BK1 = new THREE.Vector3(-0.13, 0, 0.04), BR = 0.024, BH = 0.05;               // 溶解用的烧杯（10 mL 水）
const PAPER = new THREE.Vector3(-0.2, 0, 0.06), SPOON_HOME = new THREE.Vector3(-0.21, 0.006, 0.1);
const ST1 = new THREE.Vector3(0.0, 0, 0), FUN_Y = 0.13, BK2 = new THREE.Vector3(0.02, 0, 0);          // 过滤：铁架台、漏斗、接滤液的烧杯
const ST2 = new THREE.Vector3(0.15, 0, 0), DISH_Y = 0.105, LAMP = new THREE.Vector3(0.17, 0, 0);     // 蒸发：铁架台、蒸发皿、酒精灯
const ROD_HOME = new THREE.Vector3(-0.11, 0.004, 0.125);
const ROD_LEAN = 0.32;                            // 玻璃棒斜靠在漏斗里的角度（再斜，上端就碰到铁架台的铁杆了）
const FUN_LIFT = 0.018;                           // 拿走接滤液的烧杯时，漏斗提起来多高（管口伸进烧杯约 1.4 cm）
const BK2_YAW = -2.805, BK2_TILT = 1.05;         // 接滤液的烧杯：杯嘴朝右后方（朝蒸发皿那边）；倒进蒸发皿时倾斜的角度
const BK1_TILT = 1.0;                             // 倒进漏斗时烧杯倾斜的角度
const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));

export default {
  id: 'crudesalt',
  fig: '图9-18',
  title: '粗盐中难溶性杂质的去除',
  stampText: '实验活动',
  style: 'paper',
  predict: {
    q: '粗盐里混着泥沙。溶解、过滤以后，滤纸上和滤液里分别是什么？',
    hint: '课本第 56 页实验活动 7。泥沙溶不溶于水？',
    options: ['滤纸上是泥沙，滤液是澄清的食盐水', '滤纸上是食盐，滤液是泥水', '都留在滤纸上'],
    answer: 0,
  },
  need: '溶解粗盐（加到不再溶解为止）、过滤（玻璃棒引流）、蒸发（不断搅拌，出现较多固体时停止加热），称量精盐、计算产率',
  conclusion: {
    crops: [{ page: 61, rect: [169, 51, 372, 233] }],
    quote: '在加热过程中，用玻璃棒不断搅拌滤液，防止因局部温度过高，造成液滴飞溅。当蒸发皿中出现较多固体时，停止加热。利用蒸发皿的余热使滤液蒸干。',
    why: '溶解：泥沙等难溶性杂质不溶于水，液体浑浊；过滤：泥沙留在滤纸上，滤液澄清（如果滤液仍浑浊，应再过滤一次）；蒸发：水蒸发掉，得到白色的精盐。<br>过滤要“一贴二低三靠”：滤纸紧贴漏斗内壁；滤纸边缘低于漏斗边缘，液面低于滤纸边缘；烧杯紧靠玻璃棒，玻璃棒靠在三层滤纸一边，漏斗下端紧靠烧杯内壁。<br>氯化钠的溶解度受温度影响很小，所以用<b>蒸发</b>而不是降温来得到它。这样得到的精盐仍含有可溶性杂质（氯化镁、氯化钙等），<b>不是纯净物</b>。',
    src: '课本下册第 56–57 页 · 实验活动7 粗盐中难溶性杂质的去除',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); };      // 演示的字幕只写画面上正在发生的事（写在镜头里），不换成给学生的提示
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };

    paperSheet(group, { w: 0.48, d: 0.2, x: -0.02, z: 0.03 });

    // ================= 溶解：烧杯、粗盐、药匙 =================
    const bk1 = chemBeaker({ r: BR, h: BH, level: 0.0055, color: CHEM.water, marks: false }); bk1.position.copy(BK1); group.add(bk1);
    const murk = milky(bk1.liq, { n: 30, color: 0xb8a58a });        // 泥沙：浑浊（黄褐）
    const sediment = new THREE.Mesh(new THREE.CylinderGeometry(BR - 0.003, BR - 0.002, 0.0015, 24), paint(0x9a8466, { keep: true })); sediment.position.set(BK1.x, 0.0018, BK1.z); sediment.visible = false; group.add(sediment);
    const undisHeap = new THREE.Mesh(new THREE.SphereGeometry(0.008, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xe8e0cf)); undisHeap.scale.y = 0.4; undisHeap.position.set(BK1.x, 0.002, BK1.z); undisHeap.visible = false; group.add(undisHeap);
    const wpaper = inked(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.0008, 0.04), paint(0xfdfdfa)), { width: 0.4 }); wpaper.position.copy(PAPER).add(new THREE.Vector3(0, 0.0004, 0)); wpaper.rotation.y = 0.3; group.add(wpaper);
    const crude = new THREE.Mesh(new THREE.SphereGeometry(0.013, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xd9cdb6, { keep: true })); crude.scale.y = 0.42; crude.position.copy(PAPER).add(new THREE.Vector3(0, 0.0008, 0)); group.add(crude);
    const paperPick = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.014, 0.044), new THREE.MeshBasicMaterial({ visible: false })); paperPick.position.set(0, 0.006, 0); paperPick.userData.pick = true; wpaper.add(paperPick);
    const paperLab = textPlate('粗盐 5.0 g', { w: 0.028, h: 0.007, color: '#23293a', bg: 'rgba(0,0,0,0)', font: 'bold 88px "Songti SC", serif' }); paperLab.rotation.x = -Math.PI / 2; paperLab.position.copy(PAPER).add(new THREE.Vector3(0, 0.001, 0.027)); group.add(paperLab);
    const spoon = new THREE.Group(); group.add(spoon);
    { const handle = inked(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.002, 0.005), paint(0xd9dde3)), { width: 0.5 }); handle.position.x = 0.035; spoon.add(handle);
      const bowl = inked(new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xd9dde3)), { width: 0.4 }); bowl.rotation.x = Math.PI; bowl.scale.y = 0.4; spoon.add(bowl); }
    const spoonPick = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), new THREE.MeshBasicMaterial({ visible: false })); spoonPick.position.x = 0.035; spoonPick.userData.pick = true; spoon.add(spoonPick);
    spoon.position.copy(SPOON_HOME);

    // ================= 过滤：铁架台、漏斗、烧杯 =================
    const st1 = stand({ height: 0.22, baseW: 0.1, baseD: 0.07 }); st1.position.copy(ST1); group.add(st1);
    st1.clamp(FUN_Y, 0.05, { ring: true, r: 0.022 });
    const FUN_X = ST1.x + st1.rodX + 0.05;
    // 漏斗（连滤纸、滤纸上的泥沙、漏斗里的液体）是一件：拿走接滤液的烧杯时一起提起来一点
    const funG = new THREE.Group(); group.add(funG);
    const STEM_TIP = FUN_Y - 0.068;                 // 漏斗下端管口：伸进烧杯约 1.4 cm（烧杯口在 0.076）
    const funnel = new THREE.Mesh(new THREE.LatheGeometry([[0.002, STEM_TIP - FUN_Y], [0.0025, STEM_TIP - FUN_Y], [0.0025, -0.02], [0.004, -0.017], [0.026, 0.008], [0.027, 0.01]].map(([r, y]) => new THREE.Vector2(r, y)), 32), glassMat({ opacity: 0.3 })); funnel.position.set(FUN_X, FUN_Y, 0); funnel.renderOrder = 9; funG.add(funnel);
    const fpaper = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.026, 28, 1, true), paint(0xfdfdfa, { side: THREE.DoubleSide, transparent: true, opacity: 0.9 })); fpaper.rotation.x = Math.PI; fpaper.position.set(FUN_X, FUN_Y - 0.006, 0); funG.add(fpaper);
    const residue = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.01, 20), paint(0x9a8466, { keep: true })); residue.rotation.x = Math.PI; residue.position.set(FUN_X, FUN_Y - 0.014, 0); residue.visible = false; funG.add(residue);
    const fLiq = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.018, 24), water2({ color: 0xb8a58a, base: 0.5 })); fLiq.rotation.x = Math.PI; fLiq.position.set(FUN_X, FUN_Y - 0.01, 0); fLiq.visible = false; fLiq.renderOrder = 7; funG.add(fLiq);
    // 接滤液的烧杯：放在铁架台底座上（底座顶面 y = 0.016），漏斗管口紧靠它的内壁（管口在烧杯左边的内壁上）
    BK2.set(FUN_X + 0.022 - 0.0025 - 0.0002, 0.016, 0);      // 烧杯左内壁离管口外壁 0.2 mm
    const BK2_REST = new THREE.Vector3(0.075, 0, 0.02);       // 滤液倒完以后，空烧杯放在两个铁架台之间的桌上
    const bk2 = chemBeaker({ r: 0.022, h: 0.06, level: 0, color: CHEM.water, marks: false }); bk2.position.copy(BK2); bk2.rotation.set(0, BK2_YAW, 0); group.add(bk2);
    const murk2 = milky(bk2.liq, { n: 20, color: 0xb8a58a });
    const bk2Pick = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.06, 10), new THREE.MeshBasicMaterial({ visible: false })); bk2Pick.position.y = 0.03; bk2Pick.userData.pick = true; bk2.add(bk2Pick);
    const fDrops = new Particles({ max: 40, geometry: new THREE.SphereGeometry(1, 6, 5), material: water2({ color: CHEM.water, base: 0.5 }) }); group.add(fDrops.mesh);

    // ================= 蒸发：铁架台、蒸发皿、酒精灯 =================
    const st2 = stand({ height: 0.22, baseW: 0.1, baseD: 0.07 }); st2.position.copy(ST2); group.add(st2);
    st2.clamp(DISH_Y, 0.05, { ring: true, r: 0.026 });
    const DISH_X = ST2.x + st2.rodX + 0.05; LAMP.x = DISH_X;
    const dish = inked(new THREE.Mesh(new THREE.LatheGeometry([[0.0003, 0], [0.012, 0.0005], [0.024, 0.008], [0.031, 0.016], [0.032, 0.017]].map(([r, y]) => new THREE.Vector2(r, y)), 32), paint(0xf1efea, { side: THREE.DoubleSide })), { width: 0.6 }); dish.position.set(DISH_X, DISH_Y - 0.006, 0); group.add(dish);
    const dLiq = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.012, 1, 28), water2({ color: CHEM.water })); dLiq.geometry.translate(0, 0.5, 0); dLiq.position.set(DISH_X, DISH_Y - 0.0055, 0); dLiq.visible = false; dLiq.renderOrder = 7; group.add(dLiq);
    const crys = new THREE.Group(); crys.position.set(DISH_X, DISH_Y - 0.005, 0); group.add(crys);
    for (let i = 0; i < 90; i++) { const r = Math.sqrt(Math.random()) * 0.022, a = Math.random() * 6.28; const c = new THREE.Mesh(new THREE.BoxGeometry(0.0016, 0.0016, 0.0016), paint(0xffffff)); c.position.set(Math.cos(a) * r, 0.0006 + (r / 0.022) ** 2 * 0.008, Math.sin(a) * r); c.rotation.set(Math.random() * 3, Math.random() * 3, 0); c.userData.k = Math.random(); crys.add(c); }
    const dishPick = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.02, 12), new THREE.MeshBasicMaterial({ visible: false })); dishPick.position.set(0, 0.006, 0); dishPick.userData.pick = true; dish.add(dishPick);
    const lamp = chemLamp(); lamp.position.copy(LAMP); lamp.scale.setScalar(0.85); group.add(lamp);
    const lampPick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 10), new THREE.MeshBasicMaterial({ visible: false })); lampPick.position.set(0, 0.035, 0); lampPick.userData.pick = true; lamp.add(lampPick);
    // 灯帽（课本第 18 页）：点燃前取下，放在灯的前方桌上（铁架台底座外面）；熄灭时用灯帽盖灭，再轻提一下、重新盖好
    const capper = lampCap(group, lamp, { off: new THREE.Vector3(LAMP.x - 0.015, 0, 0.06) });
    let flameOn = false;                    // 火焰真的亮着：灯帽拿开了才亮，盖上了才灭
    const splash = new Particles({ max: 80, geometry: new THREE.SphereGeometry(1, 6, 5), material: paint(0xffffff) }); group.add(splash.mesh);
    const steam = new Particles({ max: 60, sprite: true, color: 0xd6dde6, size: 0.008, opacity: 0.4 }); group.add(steam.mesh);

    // ================= 玻璃棒 =================
    const rodGeo = new THREE.CylinderGeometry(0.0016, 0.0016, 0.1, 10); rodGeo.translate(0, 0.05, 0);       // 先挪好再描边：描的线和棒子对齐（原点在下端）
    const rod = inked(new THREE.Mesh(rodGeo, paint(0xe8f2f6, { transparent: true, opacity: 0.85 })), { width: 0.5 }); group.add(rod);
    const rodPick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 8), new THREE.MeshBasicMaterial({ visible: false })); rodPick.position.y = 0.05; rodPick.userData.pick = true; rod.add(rodPick);
    const ROD_REST = ROD_HOME.clone().add(new THREE.Vector3(-0.05, 0, 0));
    rod.position.copy(ROD_REST); rod.rotation.z = Math.PI / 2;
    const cards = { a: tag('', 'cond'), b: tag('', 'cond'), c: tag('', 'cond') }; cards.a.px = [-30, -80]; cards.b.px = [70, -50]; cards.c.px = [70, -50];

    // ================= 状态 =================
    const fresh = () => ({
      demo: false, added: 0, nacl: 0, sand: 0, undis: 0, pouring: false, spoonAt: false, stir: 0, rodAt: null, rodCarry: null, lastRod: null,
      bk2Carry: null, fun: 0, filtrate: 0, fNaCl: 0, fSand: 0, filtered: false, overfill: false, funLift: 0, bk2Out: false,      // funLift：漏斗提起来的程度；bk2Out：接滤液的烧杯已经从漏斗下面挪出来了
      inDish: 0, dNaCl: 0, dSand: 0, lit: false, temp: 20, splashLoss: 0, unstirT: 0, solid: false, offAt: null, dry: false, weighed: false, high: S ? S.high : false, said: {},
    });
    S = null; S = fresh();

    // ================= 姿势：倒进漏斗、倒进蒸发皿、玻璃棒靠在漏斗里 =================
    const ROD_FUN = new THREE.Vector3(FUN_X - 0.006, FUN_Y - 0.012, 0);      // 玻璃棒下端：斜靠在三层滤纸那一边
    // 倒进漏斗：烧杯在漏斗右上方倾斜，杯嘴紧靠玻璃棒（离下端 6 cm 处），杯底高过漏斗口
    const SPOUT1 = ROD_FUN.clone().addScaledVector(new THREE.Vector3(-Math.sin(ROD_LEAN), Math.cos(ROD_LEAN), 0), 0.06).add(new THREE.Vector3(0.0028, 0, 0));
    const POUR1 = SPOUT1.clone().sub(new THREE.Vector3(-(BR + 0.003), BH - 0.001, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), BK1_TILT));
    // 倒进蒸发皿：烧杯在蒸发皿左前方（铁杆前面）倾斜，杯嘴伸到蒸发皿上方
    const SPOUT2 = new THREE.Vector3(DISH_X - 0.01, DISH_Y + 0.02, 0.015);
    const POUR2 = SPOUT2.clone().sub(new THREE.Vector3(-0.025, 0.059, 0).applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, BK2_YAW, BK2_TILT))));
    // 玻璃棒放回桌上：在烧杯、蒸发皿、漏斗里的先竖直提出来；再往前挪（不碰铁架台的铁杆）；最后放平、放回原处
    const rodHome = () => {
      const p = rod.position;
      const top = Math.hypot(p.x - BK1.x, p.z - BK1.z) < BR && p.y < BH + 0.004 ? BH + 0.014
        : Math.abs(p.x - DISH_X) < 0.034 && Math.abs(p.z) < 0.034 && p.y < DISH_Y + 0.014 ? DISH_Y + 0.022
          : Math.abs(p.x - FUN_X) < 0.028 && Math.abs(p.z) < 0.028 && p.y < FUN_Y + 0.014 && p.y > STEM_TIP ? FUN_Y + 0.024 : 0;
      if (top) p.lerp(new THREE.Vector3(p.x, top, p.z), 0.3);
      else if (p.z < 0.038) p.lerp(new THREE.Vector3(p.x, p.y, 0.04), 0.3);
      else { homeLift(rod, ROD_REST, 0.2, 0.06); rod.rotation.z += (Math.PI / 2 - rod.rotation.z) * 0.2; }
    };
    const bk2Ready = () => S.filtered && S.fun < 0.05 && S.rodAt !== 'funnel';      // 滤完了、玻璃棒拿开了，才拿接滤液的烧杯
    // 换一套器材（演示开始、结束，全部重来）时直接摆好
    const snapAll = () => {
      bk1.position.copy(BK1); bk1.rotation.z = 0;
      bk2.position.copy(S.bk2Out ? BK2_REST : BK2); bk2.rotation.set(0, BK2_YAW, 0);
      funG.position.y = FUN_LIFT * ease(S.funLift);
      if (S.rodAt === 'funnel') { rod.position.copy(ROD_FUN); rod.rotation.z = ROD_LEAN; } else { rod.position.copy(ROD_REST); rod.rotation.z = Math.PI / 2; }
      spoon.position.copy(SPOON_HOME); spoon.rotation.z = 0;
      capper.snap(S.lit); flameOn = S.lit;
    };

    // ================= 操作 =================
    const A = {
      spoonStart() { S.spoonAt = true; S.pouring = true; },
      spoonEnd() { S.pouring = false; S.spoonAt = false; },
      weighLeft() {
        if (S.added < 1) return status('先用药匙把粗盐逐渐加入烧杯，加到不再溶解为止。');
        if (S.undis < 0.05) return status('烧杯里的粗盐还能再溶——继续加，加到<b>不再溶解</b>为止。');
        const left = 5 - S.added;
        log(['称取粗盐 5.0 g', `剩余 ${left.toFixed(1)} g`, `加到水中 <b>${S.added.toFixed(1)} g</b>`]); done('dissolve');
        status(`称量剩下的粗盐：${left.toFixed(1)} g，加到 10 mL 水中的粗盐 <b>${S.added.toFixed(1)} g</b>。液体是浑浊的。接下来<b>过滤</b>：把玻璃棒靠在漏斗里的滤纸上，再拿烧杯沿玻璃棒倒。`);
      },
      rodDrag(p) {
        if (!p) return; const last = S.lastRod; S.lastRod = p.clone(); S.rodCarry = p.clone();
        S.rodAt = Math.abs(p.x - BK1.x) < BR - 0.004 && p.y < 0.07 ? 'bk1' : Math.abs(p.x - FUN_X) < 0.012 && p.y > FUN_Y + 0.005 ? 'funnel' : Math.abs(p.x - DISH_X) < 0.026 && p.y > DISH_Y - 0.02 && p.y < DISH_Y + 0.05 ? 'dish' : null;        // 在竖直面上拖：烧杯、漏斗、蒸发皿高低不同，看着在哪儿就在哪儿（漏斗：从漏斗口上方放进去）
        if (S.rodAt && S.rodAt !== 'funnel' && last) S.stir = Math.min(1, S.stir + (Math.abs(p.x - last.x) + Math.abs(p.z - last.z)) * 40);
      },
      rodDrop() { S.rodCarry = null; S.lastRod = null; if (S.rodAt !== 'funnel') S.rodAt = null; else status('玻璃棒斜靠在三层滤纸那一边（引流）。拿起<b>浑浊的液体</b>，沿玻璃棒倒进漏斗。'); },
      bk1Drag(p) { if (!p) return; S.bk1Carry = p.clone(); },
      bk1Drop() { S.bk1Carry = null; },
      bk2Drag(p) { if (!p || !bk2Ready()) return; S.bk2Carry = p.clone(); },
      bk2Drop() { S.bk2Carry = null; },
      lampTap() {
        if (!S.lit) { if (S.inDish < 0.5) return status('先把滤液倒进蒸发皿。'); S.lit = true; sfx.whoosh?.({ freq: 500, gain: 0.08, dur: 0.4 }); status('取下灯帽，点燃酒精灯，加热蒸发皿。用<b>玻璃棒</b>不断搅拌！'); }
        else { S.lit = false; S.offAt = S.inDish; status(S.solid ? '出现较多固体时停止了加热（用灯帽盖灭酒精灯）——用<b>余热</b>把剩下的水蒸干。' : '用灯帽盖灭了酒精灯（水还很多，停得太早了：要等出现较多固体时再停）。'); if (S.solid) done('evap'); }
      },
      dishTap() {
        if (!S.dry) return status(S.inDish > 0 ? '还没蒸干。' : '蒸发皿里还没有东西。');
        if (S.weighed) return;
        S.weighed = true;
        const salt = Math.max(0, S.dNaCl - S.splashLoss), y = salt / S.added * 100;
        log(['把精盐转移到称量纸上称量', `精盐 <b>${salt.toFixed(2)} g</b>`, `产率 = ${salt.toFixed(2)} ÷ ${S.added.toFixed(1)} = <b>${y.toFixed(0)}%</b>`]);
        done('yield'); status(`精盐 ${salt.toFixed(2)} g，产率 <b>${y.toFixed(0)}%</b>。${S.splashLoss > 0.1 ? '（加热时液滴飞溅，损失了一些。）' : ''}看看左边的问题。`);
        if (!S.demo) W?.t1.open();
      },
      reset() { const hi = S.high; S = fresh(); S.high = hi; snapAll(); fDrops.clear(); splash.clear(); steam.clear(); W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; } bar.undo('dissolve', 'rod', 'filter', 'pour2', 'evap', 'yield', 'why'); status('全部重新摆好了，记录也清空了。'); },
    };

    const drag = draggable(group, [
      { obj: spoonPick, plane: 'xy', offset: 0.06, hint: '按住不放：把粗盐逐渐加入烧杯（松手停）', onStart: () => A.spoonStart(), onDrag: () => {}, onEnd: () => A.spoonEnd() },
      { obj: rodPick, plane: 'xy', offset: 0.02, hint: '玻璃棒：在烧杯 / 蒸发皿里来回拖着搅拌；或者靠到漏斗里引流', onStart: (p) => A.rodDrag(p), onDrag: (p) => A.rodDrag(p), onEnd: () => A.rodDrop() },
      { obj: bk1.body, plane: 'xy', offset: BK1.z, hint: () => (bar.has('dissolve') && !S.filtered ? '拖到漏斗上方：沿玻璃棒倒进去' : ''), onStart: (p) => A.bk1Drag(p), onDrag: (p) => A.bk1Drag(p), onEnd: () => A.bk1Drop() },
      { obj: bk2Pick, plane: 'xy', offset: POUR2.z, hint: () => (bk2Ready() && S.filtrate > 0.5 ? '滤液：拖到蒸发皿上方倒进去' : ''), onStart: (p) => A.bk2Drag(p), onDrag: (p) => A.bk2Drag(p), onEnd: () => A.bk2Drop() },
    ], { taps: [
      { obj: paperPick, hint: '点一下：称量剩下的粗盐', onTap: () => A.weighLeft() },
      { obj: lampPick, hint: () => (S.lit ? '点一下：停止加热（盖上灯帽）' : '点一下：点燃酒精灯'), onTap: () => A.lampTap() },
      { obj: dishPick, hint: () => (S.dry ? '点一下：把精盐转移出来称量' : ''), onTap: () => A.dishTap() },
    ], tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const rodToFunnel = () => new THREE.Vector3(FUN_X - 0.006, FUN_Y + 0.01, 0.0);
    const bk1PourHand = () => new THREE.Vector3(FUN_X + 0.03, FUN_Y + 0.04, BK1.z);          // 手拿到这里：烧杯就靠到玻璃棒上倒
    const bk2PourHand = () => new THREE.Vector3(DISH_X - 0.07, DISH_Y + 0.045, POUR2.z);     // 手拿到这里：烧杯就伸到蒸发皿上方倒
    // 演示：等到条件成立再做（加到不再溶解、倒完、出现较多固体……），都走学生拖放的同一套处理函数
    const item = (obj) => drag.items().find((x) => x.obj === obj);
    const holdUntil = (obj, t0, until, tmax = 0.98) => { let st = 0, lastK = 1; return (k) => { if (k < lastK) st = 0; lastK = k; if (k < t0 || st === 2) return; const d = item(obj); if (st === 0) { st = 1; d.onStart?.(); } if (until() || k >= tmax) { st = 2; d.onEnd?.(false); } }; };
    const moveTo = (obj, pts, o) => { const P = act.path(obj, pts, { ...o, release: 9 }); return (k) => { if (k <= o.t1) P(k); }; };      // 拿过去，拿着不放（接着搅拌）
    const carryUntil = (obj, pts, { t0, t1, until, tmax = 0.98 }) => { const P = act.path(obj, pts, { t0, t1, release: 9 }); let ended = false, lastK = 1; return (k) => { if (k < lastK) ended = false; lastK = k; if (ended) return; P(k); if (k > t1 && (until() || k >= tmax)) { ended = true; item(obj).onEnd?.(true); } }; };
    const stirAct = (c, y, { t0, dur, amp = 0.01, hz = 2.5, until, tmax = 0.97 }) => {      // 拿着玻璃棒在 c 处来回搅拌（每秒 hz 个来回，按画面时间）
      let st = 0, lastK = 1;
      return (k) => {
        if (k < lastK) st = 0; lastK = k;
        if (k < t0 || st === 2) return;
        const d = item(rodPick); st = 1;
        d.onDrag?.(new THREE.Vector3(c.x + Math.sin((k - t0) * dur * hz * Math.PI * 2) * amp, y, 0.02));
        if (until() || k >= tmax) { st = 2; d.onEnd?.(true); }
      };
    };
    const tapWhen = (obj, cond, cap) => { let did = false, lastK = 1; return (k) => { if (k < lastK) did = false; lastK = k; if (did || !cond()) return; did = true; item(obj).onTap?.(); if (cap) bar.caption(cap); }; };
    const sayWhen = (cond, cap) => { let did = false, lastK = 1; return (k) => { if (k < lastK) did = false; lastK = k; if (did || !cond()) return; did = true; bar.caption(typeof cap === 'function' ? cap() : cap); }; };
    const after = (cond, sec) => { let t1 = null; return () => { if (!cond()) { t1 = null; return false; } t1 ??= performance.now(); return performance.now() - t1 > sec * 1000; }; };      // cond() 成立以后再过 sec 秒
    // 质检流程用：拿着玻璃棒在 c 处一直来回搅拌（每 40 ms 拖一下），cond() 成立时做 then()，再搅一会儿松手
    const qaStir = (c, y, amp, cond, then) => {
      const d = item(rodPick); let i = 0, doneAt = 0;
      const iv = setInterval(() => {
        d.onDrag(new THREE.Vector3(c.x + (i++ % 2 ? amp : -amp), y, 0.02));
        if (!doneAt && cond()) { doneAt = performance.now(); then?.(); }
        if (doneAt && performance.now() - doneAt > 300) { clearInterval(iv); d.onEnd(true); window.__qaHeld = false; }
      }, 40);
    };

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'dissolve', title: '溶解', todo: '按住<b>药匙</b>把粗盐逐渐加入烧杯，同时用<b>玻璃棒</b>搅拌，加到不再溶解为止；然后点<b>称量纸</b>，称剩下的粗盐。', target: () => (S.undis < 0.05 ? spoon : wpaper) },
        { id: 'rod', title: '玻璃棒引流', todo: '把<b>玻璃棒</b>斜靠到漏斗里的三层滤纸那一边。', target: () => (S.rodCarry ? null : rod) },
        { id: 'filter', title: '过滤', todo: '拿起<b>浑浊的液体</b>，沿玻璃棒倒进漏斗。看滤纸上的剩余物和滤液。', target: () => (S.bk1Carry ? null : bk1) },
        { id: 'pour2', title: '滤液倒进蒸发皿', todo: '把<b>滤液</b>倒进蒸发皿，点燃<b>酒精灯</b>加热。', target: () => (S.inDish > 0.5 ? lamp : S.bk2Carry ? null : bk2) },
        { id: 'evap', title: '蒸发', todo: '加热时用<b>玻璃棒</b>不断搅拌；出现较多固体时点酒精灯<b>停止加热</b>，用余热蒸干。', target: () => (S.solid ? lamp : S.rodCarry ? null : rod) },
        { id: 'yield', title: '计算产率', todo: '点一下<b>蒸发皿</b>，把精盐转移出来称量，计算产率。', target: () => (S.dry ? dish : null) },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh: () => Object.assign(fresh(), { high: false }), bar: () => bar, apply: () => { snapAll(); fDrops.clear(); splash.clear(); steam.clear(); } }),
          // 照课本一步步做成：加到不再溶解 → 称剩下的粗盐 → 玻璃棒引流、倒完、滤完 → 滤液倒进蒸发皿 → 点燃酒精灯、不断搅拌 → 出现较多固体时停止加热 → 余热蒸干
          // 等待的时间用 speed 压缩；“等到……”的动作（松开药匙、倒完松手、停止加热）看着状态做
          shots: [
            { cap: '溶解：用药匙把粗盐逐渐加入 10 mL 水中，边加边用玻璃棒搅拌，一直加到粗盐不再溶解为止。', dur: 10, get speed() { return S.undis > 0.05 ? 1 : 2.5; }, cam: [[BK1.x - 0.02, 0.05, BK1.z], [0.04, 0.3, 1], 0.28],
              during: act.seq(
                moveTo(rodPick, [null, new THREE.Vector3(BK1.x, 0.12, 0.02), new THREE.Vector3(BK1.x, 0.02, 0.02)], { t0: 0.02, t1: 0.1 }),
                stirAct(BK1, 0.02, { t0: 0.1, dur: 10, amp: 0.008, hz: 2, until: after(() => S.undis > 0.05 && !S.pouring, 0.8), tmax: 0.9 }),
                holdUntil(spoonPick, 0.12, () => S.undis > 0.05, 0.85),
                sayWhen(() => S.undis > 0.05 && !S.pouring, '杯底有粗盐不再溶解了：停止加粗盐。液体是浑浊的。')) },
            { cap: '称量剩下的粗盐，算出加到 10 mL 水中的粗盐质量。', dur: 3.2, cam: [[(BK1.x + PAPER.x) / 2, 0.03, 0.05], [0.04, 0.35, 1], 0.3],
              during: act.seq(act.tap(paperPick, 0.1), act.at(0.14, () => bar.caption(`称量剩下的粗盐：${(5 - S.added).toFixed(1)} g；加到 10 mL 水中的粗盐：${S.added.toFixed(1)} g。`))) },
            { cap: '过滤：玻璃棒斜靠在三层滤纸一边；烧杯口紧靠玻璃棒，把浑浊的液体沿玻璃棒慢慢倒进漏斗。', dur: 10, get speed() { return S.bk1Carry && bk1.rotation.z > BK1_TILT - 0.15 && !S.filtered ? 2.5 : 1; }, cam: [[FUN_X + 0.01, 0.12, 0], [0.04, 0.2, 1], 0.34],
              during: act.seq(
                act.path(rodPick, [null, new THREE.Vector3(ROD_REST.x - 0.05, 0.2, 0.06), new THREE.Vector3(FUN_X, 0.2, 0.02), rodToFunnel()], { t0: 0.02, t1: 0.2, release: 0.22 }),
                carryUntil(bk1.body, [null, new THREE.Vector3(BK1.x, 0.2, BK1.z), new THREE.Vector3(FUN_X + 0.035, 0.2, BK1.z), bk1PourHand()], { t0: 0.27, t1: 0.45, until: () => S.filtered, tmax: 0.95 })) },
            { cap: '泥沙等难溶物留在滤纸上，滤液是澄清的。', dur: 3.6, get speed() { return S.fun > 0.05 ? 2 : 1; }, cam: [[FUN_X + 0.01, 0.09, 0], [0.04, 0.2, 1], 0.3] },
            { cap: '蒸发：把澄清的滤液倒进蒸发皿（漏斗稍稍提起，烧杯从漏斗下面挪出来）。', dur: 6, speed: 1.5, cam: [[0.085, 0.09, 0.01], [0.04, 0.25, 1], 0.38],
              during: carryUntil(bk2Pick, [null, new THREE.Vector3(BK2.x + 0.002, BK2.y + 0.03, POUR2.z), new THREE.Vector3(0.08, 0.17, POUR2.z), new THREE.Vector3(DISH_X - 0.07, 0.165, POUR2.z), bk2PourHand()], { t0: 0.05, t1: 0.5, until: () => S.filtrate < 0.05, tmax: 0.95 }) },
            { cap: '点燃酒精灯加热，用玻璃棒不断搅拌滤液，防止因局部温度过高，造成液滴飞溅。', dur: 10, get speed() { return flameOn && capper.k >= 1 && !S.solid ? 3 : 1; }, cam: [[DISH_X, 0.09, 0], [0.04, 0.25, 1], 0.3],
              during: act.seq(
                moveTo(rodPick, [null, new THREE.Vector3(ROD_REST.x - 0.05, 0.2, 0.06), new THREE.Vector3(DISH_X, 0.2, 0.04), new THREE.Vector3(DISH_X, DISH_Y + 0.01, 0.02)], { t0: 0.02, t1: 0.12 }),
                stirAct(new THREE.Vector3(DISH_X, 0, 0), DISH_Y + 0.01, { t0: 0.12, dur: 10, amp: 0.012, hz: 2.5, until: after(() => S.solid && !S.lit, 0.6), tmax: 0.95 }),
                act.tap(lampPick, 0.16),
                tapWhen(lampPick, () => S.solid && S.lit, '蒸发皿中出现较多固体，停止加热：用灯帽盖灭酒精灯，再轻提一下灯帽，重新盖好。')) },
            { cap: '利用蒸发皿的余热使滤液蒸干……', dur: 6, get speed() { return S.dry ? 1 : 4; }, cam: [[DISH_X, 0.1, 0], [0.04, 0.3, 1], 0.26],
              during: sayWhen(() => S.dry, '蒸干了：蒸发皿里是白色的精盐。演示完了，下面换你自己做。') },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ================= 每帧 =================
    const step = (h) => {
      // 溶解
      spoon.position.lerp(S.spoonAt ? BK1.clone().add(new THREE.Vector3(-0.004, BH + 0.012, 0)) : SPOON_HOME, 0.2);
      spoon.rotation.z += ((S.spoonAt ? -0.35 + Math.sin(performance.now() / 70) * 0.06 : 0) - spoon.rotation.z) * 0.4;
      if (S.pouring && S.spoonAt && S.added < 5) { const d = Math.min(5 - S.added, 0.35 * h); S.added += d; S.nacl += d * PURE; S.sand += d * (1 - PURE); }
      crude.scale.setScalar(Math.max(0.05, Math.cbrt((5 - S.added) / 5))); crude.scale.y *= 0.42;
      S.stir = Math.max(0, S.stir - h * 1.2);
      const cap = 10 * SOLUB, dissolved = Math.min(S.nacl, cap);
      S.undis += ((S.nacl - dissolved) - S.undis) * Math.min(1, h * (0.5 + 2 * S.stir));
      undisHeap.visible = S.undis > 0.03; undisHeap.scale.setScalar(Math.max(0.3, Math.cbrt(S.undis / 0.5))); undisHeap.scale.y *= 0.4;
      murk.set(S.filtered ? 0 : clamp(S.sand / 0.4, 0, 0.9)); murk.update(performance.now() / 1000);
      sediment.visible = !S.filtered && S.sand > 0.05;
      if (S.undis > 0.05 && !S.said.sat && !S.demo) { S.said.sat = true; status('杯底有粗盐<b>不再溶解</b>了。松开药匙，点<b>称量纸</b>称剩下的粗盐。'); }
      // 玻璃棒：在蒸发皿里搅拌时下端不碰到皿壁（离中心 1.2 cm 以内）
      if (S.rodCarry) { const c = S.rodCarry; rod.position.lerp(S.rodAt === 'bk1' ? new THREE.Vector3(c.x, 0.003, BK1.z) : S.rodAt === 'dish' ? new THREE.Vector3(clamp(c.x, DISH_X - 0.012, DISH_X + 0.012), DISH_Y - 0.004, 0) : S.rodAt === 'funnel' ? ROD_FUN : new THREE.Vector3(c.x, Math.max(0.02, c.y), c.z), 0.5); rod.rotation.z += ((S.rodAt === 'funnel' ? ROD_LEAN : 0.25) - rod.rotation.z) * 0.3; }
      else if (S.rodAt === 'funnel' && !(S.filtered && S.fun < 0.05)) { rod.position.lerp(ROD_FUN, 0.3); rod.rotation.z += (ROD_LEAN - rod.rotation.z) * 0.3; if (!bar.has('rod')) done('rod'); }      // 斜靠在漏斗里，等液体滤完
      else { if (S.rodAt === 'funnel') S.rodAt = null; rodHome(); }
      // 过滤：烧杯口紧靠玻璃棒，沿玻璃棒倒进漏斗；拿着走的时候靠近漏斗、铁架台就拿高（不从它们上面穿过去）
      if (S.bk1Carry) {
        const c = S.bk1Carry, at = Math.abs(c.x - (FUN_X + 0.03)) < 0.03 && c.y > FUN_Y - 0.03;
        const tgt = at ? POUR1.clone() : c.clone().add(new THREE.Vector3(0, -0.025, 0)).setZ(BK1.z);
        if (!at) tgt.y = Math.max(tgt.y, 0.15 * ease((0.1 - Math.abs(tgt.x - FUN_X)) / 0.025));
        bk1.position.lerp(tgt, 0.3);
        bk1.rotation.z += ((at ? BK1_TILT : 0) - bk1.rotation.z) * Math.min(1, h * 3);
        if (at && bk1.rotation.z > BK1_TILT - 0.15 && !S.filtered) {
          const rate = S.high ? 6 : S.fun < 1.6 ? 4 : 0.6;       // 液面别高过滤纸边缘：倒得慢一点
          const dv = Math.min(10 - S.poured || 10, rate * h); S.poured = (S.poured || 0) + dv; S.fun += dv;
          if (S.fun > 2.4) S.overfill = true;
          if (S.poured >= 9.9) { S.filtered = true; status(S.rodAt === 'funnel' ? '倒完了。看滤纸上剩下的东西，和下面烧杯里滤液的颜色。' : '倒完了（没有用玻璃棒引流，液体容易溅出来）。'); }
        }
      } else {      // 放回原处：先在高处往前挪出来，再挪到原处上方，放下去
        bk1.rotation.z *= 0.8;
        if (Math.abs(bk1.position.z - BK1.z) > 0.002) bk1.position.lerp(new THREE.Vector3(bk1.position.x, Math.max(bk1.position.y, 0.16), BK1.z), 0.3);
        else homeLift(bk1, BK1, 0.25);
      }
      if (bk1.liq) bk1.setLevel(Math.max(0.0001, 0.0055 * (1 - (S.poured || 0) / 10)));
      // 漏斗里的液体慢慢滤下去（约 1 mL/s），滤纸湿着留下约 0.5 mL；从紧靠烧杯内壁的管口流下去
      const flow = Math.min(S.fun, 1.0 * h); S.fun -= flow;
      if (flow > 0) { const k = S.overfill ? 0.35 : 0; S.filtrate += flow; S.fNaCl += flow * (dissolved / 10) * (S.filtrate > 0.5 ? 1 : 0); S.fSand += flow * k * (S.sand / 10); if (Math.random() < h * 12) fDrops.spawn({ p: new THREE.Vector3(FUN_X, STEM_TIP - 0.001, 0), v: new THREE.Vector3(0, -0.04, 0), size: 0.0011, life: 1 }); }
      fDrops.update(h, (p, d) => { p.v.y -= 0.5 * d; p.p.addScaledVector(p.v, d); return p.p.y > BK2.y + 0.002 + S.filtrate * 0.00066; });
      fLiq.visible = S.fun > 0.05; fLiq.scale.setScalar(Math.min(1.25, 0.4 + S.fun / 2));
      residue.visible = (S.poured || 0) > 1; residue.scale.setScalar(Math.min(1, 0.3 + (S.poured || 0) / 10 * 0.7));
      bk2.setLevel(S.filtrate * 0.00066); murk2.set(clamp(S.fSand / 0.05, 0, 0.8)); murk2.update(performance.now() / 1000);
      if (S.filtered && S.fun < 0.05 && !bar.has('filter') && !S.demo) {
        done('filter');
        log(['过滤', '滤纸上留下<b>泥沙</b>', S.overfill ? '滤液<b>仍浑浊</b>（液面高过了滤纸边缘）——应再过滤一次' : '滤液<b>澄清</b>']);
        status(S.overfill ? '滤液<b>仍浑浊</b>：倒得太急，液面高过了滤纸边缘，浑浊液从滤纸和漏斗之间流了下去。（可以“全部重来”。）把滤液倒进蒸发皿。' : '泥沙留在滤纸上，滤液是<b>澄清</b>的。把滤液倒进蒸发皿。');
      }
      // 接滤液的烧杯：漏斗管口伸在它里面——拿的时候漏斗先提起来一点，烧杯贴着底座从漏斗下面挪出来，再拿高、倒进蒸发皿
      const under = Math.hypot(bk2.position.x - FUN_X, bk2.position.z) < 0.0285, seated = bk2.position.distanceTo(BK2) < 0.0006;
      S.funLift += clamp((under && (!seated || S.bk2Carry) ? 1 : 0) - S.funLift, -h * 3, h * 3);
      funG.position.y = FUN_LIFT * ease(S.funLift);
      if (!under) S.bk2Out = true;
      let at2 = false;
      if (S.bk2Carry) {
        if (!under || S.funLift > 0.95) {
          const c = S.bk2Carry; at2 = Math.abs(c.x - (DISH_X - 0.07)) < 0.03 && c.y > DISH_Y - 0.02;
          const tgt = at2 ? POUR2.clone() : new THREE.Vector3(clamp(c.x, 0.07, DISH_X - 0.04), Math.max(0.017, c.y - 0.03), POUR2.z);
          if (under) tgt.y = BK2.y;
          bk2.position.lerp(tgt, 0.3);
        }
      } else if (S.bk2Out) homeLift(bk2, BK2_REST, 0.25);       // 倒完的空烧杯放在两个铁架台之间
      else bk2.position.lerp(BK2, 0.25);
      { const z = bk2.rotation.z; bk2.rotation.set(0, BK2_YAW, z + ((at2 ? BK2_TILT : 0) - z) * Math.min(1, h * 3)); }
      if (at2 && bk2.rotation.z > BK2_TILT - 0.15 && S.filtrate > 0) { const dv = Math.min(S.filtrate, 4 * h), f = dv / S.filtrate; S.inDish += dv; S.dNaCl += S.fNaCl * f; S.dSand += S.fSand * f; S.fNaCl -= S.fNaCl * f; S.fSand -= S.fSand * f; S.filtrate -= dv; if (S.filtrate < 0.05 && !bar.has('pour2')) { status('滤液倒进了蒸发皿。点燃<b>酒精灯</b>加热。'); } }
      // 蒸发：火焰真的亮着才加热（灯帽拿开了才有火）；加热时水按约 0.4 mL/s（时间加快）蒸发；快沸腾时不搅拌就飞溅
      flameOn = capper.update(h, S.lit);        // 灯帽：点燃前取下放到桌上；熄灭时盖上，再轻提一下、重新盖好
      lamp.flame.setOn(flameOn); lamp.flame.update(performance.now() / 1000);
      if (flameOn) { S.temp = Math.min(100, S.temp + h * 30); if (!bar.has('pour2')) done('pour2'); }
      else S.temp = Math.max(20, S.temp - h * (S.inDish > 0.05 ? 3 : 8));
      // 余热：停火以后蒸发皿还很烫，剩下的一点水接着蒸干（较多固体时停火，剩的水正好够余热蒸干）
      if (!flameOn && S.temp > 50 && S.inDish > 0) S.inDish = Math.max(0, S.inDish - S.inDish * 0.25 * h - 0.01 * h);
      const water = S.inDish;
      if (water > 0 && S.temp > 90) {
        const ev = (flameOn ? 0.4 : 0) * h; S.inDish = Math.max(0, S.inDish - ev);
        if (Math.random() < h * 10) steam.spawn({ p: new THREE.Vector3(DISH_X + (Math.random() - 0.5) * 0.02, DISH_Y + 0.006, (Math.random() - 0.5) * 0.02), v: new THREE.Vector3(0, 0.03, 0), size: 0.008, alpha: 0.4, life: 1.5 });
      }
      const stirring = S.rodCarry && S.rodAt === 'dish' && S.stir > 0.3;
      const dryish = S.inDish < 1.2;          // 快蒸干时最容易溅
      if (flameOn && S.temp > 90 && S.inDish > 0.01 && !stirring) { S.unstirT += h; const p = (dryish ? 0.05 : 0.012) * h * Math.min(1, S.unstirT / 3); S.splashLoss = Math.min(S.dNaCl * 0.5, S.splashLoss + p); if (Math.random() < h * (dryish ? 14 : 5)) splash.spawn({ p: new THREE.Vector3(DISH_X + (Math.random() - 0.5) * 0.02, DISH_Y + 0.004, (Math.random() - 0.5) * 0.02), v: new THREE.Vector3((Math.random() - 0.5) * 0.12, 0.08 + Math.random() * 0.06, (Math.random() - 0.5) * 0.12), size: 0.0009, life: 1 }); if (!S.said.splash && !S.demo && S.unstirT > 2) { S.said.splash = true; status('液滴<b>飞溅</b>了！加热时要用玻璃棒<b>不断搅拌</b>，防止局部温度过高。'); } }
      if (flameOn && S.inDish <= 0.01) { S.splashLoss = Math.min(S.dNaCl * 0.5, S.splashLoss + 0.05 * h); if (Math.random() < h * 16) splash.spawn({ p: new THREE.Vector3(DISH_X + (Math.random() - 0.5) * 0.02, DISH_Y + 0.004, (Math.random() - 0.5) * 0.02), v: new THREE.Vector3((Math.random() - 0.5) * 0.12, 0.1, (Math.random() - 0.5) * 0.12), size: 0.0009, life: 1 }); if (!S.said.dryheat && !S.demo) { S.said.dryheat = true; status('已经蒸干了还在加热：固体在<b>飞溅</b>！课本说：出现较多固体时就停止加热，用余热蒸干。'); } }
      splash.update(h, (p, d) => { p.v.y -= 0.6 * d; p.p.addScaledVector(p.v, d); return p.p.y > 0.002; });
      steam.update(h, (p, d) => { p.p.addScaledVector(p.v, d); p.alpha = 0.4 * (1 - p.age / p.life); });
      // 固体：水越少，析出的越多（饱和以后才析出）
      const total = S.dNaCl, satW = total / SOLUB, solidK = S.inDish < satW && total > 0 ? clamp(1 - S.inDish / satW, 0, 1) : 0;
      if (solidK > 0.5 && !S.solid) { S.solid = true; if (!S.demo) status(S.lit ? '蒸发皿里出现了<b>较多固体</b>——现在点酒精灯<b>停止加热</b>，用余热蒸干。' : '出现了较多固体。'); }
      if (S.solid && S.inDish <= 0.06 && !flameOn && S.temp < 60 && !S.dry) { S.dry = true; if (!bar.has('evap')) done('evap'); if (!S.demo) status('蒸干了：蒸发皿里是<b>白色的精盐</b>。点一下蒸发皿，转移出来称量。'); }
      dLiq.visible = S.inDish > 0.02; dLiq.scale.y = Math.max(0.0001, Math.cbrt(S.inDish / 10) * 0.012);
      crys.children.forEach((c) => { c.visible = c.userData.k < solidK * (1 - S.splashLoss / Math.max(0.1, total)) * 0.95; });
      // 卡片
      cards.a.text(`<div class="cc"><div class="cc-t"><span class="cc-name">10 mL 水</span>${S.undis > 0.05 ? '<span class="cc-res">不再溶解</span>' : ''}</div><div class="cc-more"><div class="cc-obs"><small>加了 ${S.added.toFixed(1)} g 粗盐 · ${S.sand > 0.05 ? '浑浊（泥沙）' : '澄清'}</small></div></div></div>`).loc(group, BK1.x, BH, BK1.z).show(S.added > 0.05 && !S.filtered);
      cards.b.text(`<div class="cc"><div class="cc-t"><span class="cc-name">滤液</span>${S.filtrate > 0.3 ? `<span class="cc-res">${S.fSand > 0.004 ? '仍浑浊' : '澄清'}</span>` : ''}</div></div>`).loc(group, bk2.position.x, bk2.position.y + 0.05, bk2.position.z).show(S.filtrate > 0.3);
      cards.c.text(`<div class="cc"><div class="cc-t"><span class="cc-name">蒸发皿 ${Math.round(S.temp)} ℃</span>${S.solid ? '<span class="cc-res">较多固体</span>' : ''}</div><div class="cc-more"><div class="cc-obs"><small>水 ${S.inDish.toFixed(1)} mL${S.splashLoss > 0.02 ? ` · 飞溅损失约 ${S.splashLoss.toFixed(2)} g` : ''}</small></div></div></div>`).loc(group, DISH_X, DISH_Y + 0.02, 0).show(S.inDish > 0.02 || S.solid);
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.44, d: 0.16, h: 0.22 },
      view: { elev: 16, azim: -4, lookY: 0.45, frameMargin: 1.04 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = () => [...W.tbl.el.querySelectorAll('tbody tr')].map((tr) => `<div>${[...tr.children].map((td) => td.innerHTML).join('：')}</div>`).join('');
        const t2 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '这样提纯得到的精盐，是纯净物吗？',
          options: ['不是：只去掉了难溶性的泥沙，可溶性杂质（氯化镁、氯化钙等）还在', '是：已经很白了', '是：过滤了两次'],
          wrong: ['白不等于纯。粗盐里还溶着别的盐，过滤滤不掉，蒸发时一起留下了。', '过滤只能去掉不溶的东西。'],
          ok: '对：这个方法只除去了<b>难溶性</b>杂质。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); } });
        const t1 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '晒盐、煮盐都是蒸发水分。能不能用降低温度的方法得到食盐？',
          options: ['不能：氯化钠的溶解度受温度影响很小，降温析出得很少', '能：降温时溶解度变小，食盐就析出来了', '能，和硝酸钾一样'],
          wrong: ['看溶解度曲线：氯化钠从 100 ℃ 到 0 ℃，只从 39.8 g 降到 35.7 g。', '硝酸钾的曲线很陡，氯化钠的几乎是平的。'],
          ok: '对：氯化钠的溶解度曲线几乎是平的，只能靠<b>蒸发</b>溶剂让它结晶。',
          onOk: () => t2.open() });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['做了什么', '结果', '说明']);
        const highSeg = seg('倒进漏斗时', ['慢慢倒（液面低于滤纸边缘）', '一下子倒满'], (_, k) => { S.high = !!k; });
        const vary = h('details', { class: 'more' }, h('summary', {}, '换个条件再试'), h('p', { class: 'fineprint', html: '过滤时一下子倒满（液面高过滤纸边缘），滤液会怎样？蒸发时不搅拌、或者一直加热到蒸干，产率会怎样？（先选好，再“全部重来”。）' }), highSeg.el);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：粗盐按 88% 氯化钠、12% 泥沙计；10 mL 水最多溶解 3.6 g 氯化钠（20 ℃）；滤纸约留下 0.5 mL 溶液；蒸发、飞溅的快慢是示意（加快了）。' });
        ui.controls.append(t1.el, t2.el, next, vary, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, t1, t2, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('桌上从左到右：称好的 5.0 g 粗盐和药匙、盛 10 mL 水的烧杯，过滤装置（图 9-18），蒸发装置（图 9-19）。先溶解。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { bar.dispose(); fDrops.dispose(); splash.dispose(); steam.dispose(); },
      debug: { get S() { return S; }, A, bar, picks: { spoon: spoonPick, rod: rodPick, bk1: bk1.body, bk2: bk2Pick, lamp: lampPick, dish: dishPick, paper: paperPick },
        // 和学生一样一步步做：边加边搅拌、加到不再溶解就松开药匙；倒完、滤完；倒进蒸发皿；点灯以后一直搅拌，出现较多固体时停止加热；用余热蒸干
        qa: qaFlow(drag, [
          { name: '按住药匙', hold: spoonPick },
          { name: '拿起玻璃棒', hold: rodPick },
          { name: '边加边搅拌，加到不再溶解为止', run: () => qaStir(BK1, 0.02, 0.008, () => S.undis > 0.05, () => item(spoonPick).onEnd()), wait: 16 },
          { name: '称剩下的粗盐', tap: paperPick, wait: 1 },
          { name: '玻璃棒靠到漏斗', drag: rodPick, to: rodToFunnel, wait: 0.5 },
          { name: '拿起浑浊液', hold: bk1.body },
          { name: '倒进漏斗', run: () => A.bk1Drag(bk1PourHand()), wait: 14 },
          { name: '放下烧杯', release: bk1.body, wait: 5 },
          { name: '拿起滤液', hold: bk2Pick },
          { name: '倒进蒸发皿', run: () => A.bk2Drag(bk2PourHand()), wait: 6 },
          { name: '放下滤液', release: bk2Pick, wait: 2 },
          { name: '点燃酒精灯', tap: lampPick, wait: 0.5 },
          { name: '拿起玻璃棒', hold: rodPick },
          { name: '不断搅拌，出现较多固体时停止加热', run: () => qaStir(new THREE.Vector3(DISH_X, 0, 0), DISH_Y + 0.01, 0.012, () => S.solid, () => { if (S.lit) item(lampPick).onTap(); }), wait: 14 },
          { name: '用余热蒸干', run: () => {}, wait: 18 },
          { name: '称精盐', tap: dishPick, wait: 0.5 },
          { name: '答第一题', run: () => W.t1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.t2.el.querySelector('button').click() },
        ]) },
    };
  },
};
