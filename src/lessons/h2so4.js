// 课题2 常见的酸和碱 · 实验 10-6 稀释浓硫酸（课本下册第 67 页图 10-7、10-8；教师演示）。
//
// 正确操作（图 10-7）：把浓硫酸沿烧杯内壁缓慢地注入盛有水的烧杯，用玻璃棒不断搅拌，用温度计测量温度变化。
//   先把玻璃棒放进水里，一边缓慢注入一边搅拌。倾倒照上册第 17 页：瓶塞拿下来倒放在桌上，标签朝向手心（瓶子倾斜方向的另一侧），倒完盖好瓶塞、放回原处。
// 错误操作（图 10-8）：把水倒进浓硫酸——这里可以安全地看一次后果。
// 模型（近似，界面上写明）：10 mL 98% 浓硫酸（18.4 g，约 0.184 mol H₂SO₄）注入 50 mL 水，稀释放热约 75 kJ/mol → 约 13.8 kJ；
//   溶液约 68 g、比热约 3.6 J/(g·℃) → 温度升高约 56 ℃（不计散热，真实略低）。浓硫酸密度 1.84 g/cm³，比水重：
//   注入水中时沉下去、边沉边和水混合；不搅拌时热量集中在杯底，局部过热。
//   反过来把水倒进浓硫酸：水浮在上面，放出的热集中在薄薄一层水里，几滴水就超过 100 ℃——沸腾，带着酸液飞溅。
// 看不见的东西：热（橙色）。
import * as THREE from 'three';
import { buttons, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { textPlate, thermometer } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { chemBeaker, glassMat, CHEM } from './kit/chem.js';
import { water2, glass2 } from './kit/chemfx.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { bottleCap } from './kit/labops.js';
import { sfx } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const ROOM = 20, V_ACID = 10, DT_ALL = 56;
const BA = new THREE.Vector3(-0.07, 0, 0), BR = 0.03, BH = 0.075;           // 正确操作：盛 50 mL 水的烧杯
const BB = new THREE.Vector3(0.1, 0, 0), BBR = 0.022, BBH = 0.055;         // 错误操作：盛浓硫酸的烧杯
const BOT_HOME = new THREE.Vector3(0.0, 0, -0.04), CUP_HOME = new THREE.Vector3(0.16, 0, 0.05);
const ROD_HOME = new THREE.Vector3(-0.07, 0.004, 0.08);
const CAP_REST = new THREE.Vector3(0.035, 0, -0.045);        // 瓶塞倒放在桌上的位置（瓶子右边）
const LV = (mL, r) => (mL * 1e-6) / (Math.PI * (r - 0.0012) ** 2);

function acidBottle() {
  const g = new THREE.Group();
  const pts = [[0.0003, 0], [0.017, 0], [0.018, 0.003], [0.018, 0.045], [0.009, 0.055], [0.006, 0.059], [0.006, 0.067]].map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), glassMat({ opacity: 0.3 })); body.renderOrder = 9; g.add(body);
  const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.0165, 0.0165, 1, 24), water2({ color: 0xece6c8, base: 0.42 })); liq.geometry.translate(0, 0.5, 0); liq.position.y = 0.002; liq.scale.y = 0.03; liq.renderOrder = 7; g.add(liq);
  const lab = textPlate('浓硫酸', { w: 0.024, h: 0.009, color: '#c23a3a', bg: '#fffaf0', font: 'bold 90px "Songti SC", serif' }); lab.position.set(0, 0.026, 0.0183); g.add(lab);
  const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.07, 10), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 0.035; pick.userData.pick = true; g.add(pick);
  // 磨口玻璃瓶塞：下面一段塞进瓶颈，上面一个扁圆的塞头（原点在正中，倒放时塞头贴着桌面）
  const cap = new THREE.Group(), capM = paint(0xe3ecef, { transparent: true, opacity: 0.85 });
  const plug = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0058, 0.0047, 0.01, 16), capM), { width: 0.5 }); plug.position.y = -0.00175;
  const head = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.0035, 20), capM), { width: 0.5 }); head.position.y = 0.005;
  cap.add(plug, head); cap.position.y = 0.067 - 0.00325; g.add(cap);
  return Object.assign(g, { liq, pick, cap });
}

export default {
  id: 'h2so4',
  fig: '图10-7',
  title: '稀释浓硫酸',
  stampText: '演示',
  style: 'paper',
  predict: {
    q: '把浓硫酸沿烧杯内壁慢慢注入水中，溶液的温度会——',
    hint: '课本第 67 页实验 10-6。',
    options: ['明显升高（放出大量的热）', '降低', '几乎不变'],
    answer: 0,
  },
  need: '把浓硫酸沿烧杯内壁缓慢注入水中、用玻璃棒不断搅拌，测温度变化；再看看把水倒进浓硫酸会怎样',
  conclusion: {
    crops: [{ page: 71, rect: [60, 378, 342, 551] }],
    quote: '在稀释浓硫酸时，一定要将浓硫酸沿容器内壁慢慢注入水中，并不断搅拌。切不可将水倒入浓硫酸中。实验时戴好护目镜。',
    why: '浓硫酸溶于水时<b>放出大量的热</b>（50 mL 水里注入 10 mL 浓硫酸，温度能升高五十多摄氏度）。浓硫酸的密度（1.84 g/cm³）比水大：<br>把浓硫酸<b>慢慢注入水中</b>，它沉下去、和大量的水混合，放出的热被大量的水吸收、再靠搅拌散开，温度升高但不会沸腾；<br>把<b>水倒进浓硫酸</b>，水浮在浓硫酸上面，放出的热集中在这一薄层水里，水立刻沸腾，带着硫酸液滴向四周<b>飞溅</b>——非常危险。',
    src: '课本下册第 66–67 页 · 第十单元 课题2 常见的酸和碱（实验 10-6，教师演示）；稀释热：约 75 kJ/mol（98% → 约 20%，近似）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); else bar.caption(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };

    paperSheet(group, { w: 0.34, d: 0.18, x: 0.02, z: 0.02 });

    // ================= 正确操作：水、温度计、玻璃棒、浓硫酸 =================
    const ba = chemBeaker({ r: BR, h: BH, level: LV(50, BR), color: CHEM.water, marks: true }); ba.position.copy(BA); group.add(ba);
    const th = thermometer({ min: 0, max: 100, length: 0.16 }); th.position.set(BA.x + 0.016, 0.0125, -0.008); th.rotation.z = 0.12; group.add(th);
    th.children[1].material = paint(0xd8342a, { keep: true }); th.children[0].material = glass2({ base: 0.06, rim: 0.5, band: 0.5 }); th.children[0].renderOrder = 9;
    const heatA = new THREE.Mesh(new THREE.TorusGeometry(BR + 0.008, 0.006, 8, 48), new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0, depthWrite: false })); heatA.rotation.x = Math.PI / 2; heatA.position.set(BA.x, 0.012, 0); group.add(heatA);
    const labA = textPlate('水 50 mL', { w: 0.026, h: 0.008, color: '#23293a', bg: '#fffaf0', font: 'bold 84px "Songti SC", serif' }); labA.position.set(BA.x, 0.012, BR + 0.0015); group.add(labA);
    const sink = new Particles({ max: 120, sprite: true, color: 0xd9c98a, size: 0.004, opacity: 0.6 }); group.add(sink.mesh);        // 沉下去的浓硫酸（像一缕缕“油纹”）
    const bottle = acidBottle(); const BOT_PIV = BOT_HOME.clone().add(new THREE.Vector3(0, 0.067, 0));
    const botPiv = new THREE.Group(); bottle.position.y = -0.067; botPiv.add(bottle); botPiv.position.copy(BOT_PIV); group.add(botPiv);
    const capCtl = bottleCap(group, bottle, bottle.cap, { rest: CAP_REST });
    const CAP_ON = BOT_HOME.clone().setY(bottle.cap.position.y);       // 瓶塞盖着时的位置（瓶子在原处）
    // 瓶塞拿下来了（已经提起来、离开瓶口）：这时才拿起瓶子
    const capOff = () => !capCtl.on && (bottle.cap.position.y > CAP_ON.y + 0.008 || Math.hypot(bottle.cap.position.x - CAP_ON.x, bottle.cap.position.z - CAP_ON.z) > 0.004);
    const rod = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.11, 10), paint(0xe8f2f6, { transparent: true, opacity: 0.85 })), { width: 0.5 });
    rod.geometry.translate(0, 0.055, 0); group.add(rod);
    const rodPick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.11, 8), new THREE.MeshBasicMaterial({ visible: false })); rodPick.position.y = 0.055; rodPick.userData.pick = true; rod.add(rodPick);
    const ROD_REST = ROD_HOME.clone().add(new THREE.Vector3(-0.055, 0, 0)); rod.position.copy(ROD_REST); rod.rotation.z = Math.PI / 2;

    // ================= 错误操作：浓硫酸、一小杯水 =================
    const bb = chemBeaker({ r: BBR, h: BBH, level: LV(10, BBR), color: 0xece6c8, marks: false }); bb.position.copy(BB); group.add(bb);
    const labB = textPlate('浓硫酸 10 mL', { w: 0.032, h: 0.008, color: '#c23a3a', bg: '#fffaf0', font: 'bold 80px "Songti SC", serif' }); labB.position.set(BB.x, 0.012, BBR + 0.0015); group.add(labB);
    const xMark = textPlate('×', { w: 0.03, h: 0.03, color: '#d8342a', bg: 'rgba(0,0,0,0)', font: 'bold 220px sans-serif' }); xMark.position.set(BB.x, 0.035, BBR + 0.004); xMark.visible = false; group.add(xMark);
    const waterLayer = new THREE.Mesh(new THREE.CylinderGeometry(BBR - 0.0012, BBR - 0.0012, 1, 24), water2({ color: CHEM.water })); waterLayer.geometry.translate(0, 0.5, 0); waterLayer.position.set(BB.x, 0.0012 + LV(10, BBR), 0); waterLayer.scale.y = 0.0001; waterLayer.renderOrder = 7.5; group.add(waterLayer);
    const cupPiv = new THREE.Group(); group.add(cupPiv);
    const cup = chemBeaker({ r: 0.016, h: 0.04, level: 0.02, color: CHEM.water, marks: false }); cup.position.set(0.019, -0.04, 0); cupPiv.add(cup);
    const cupPick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.04, 10), new THREE.MeshBasicMaterial({ visible: false })); cupPick.position.y = 0.02; cupPick.userData.pick = true; cup.add(cupPick);
    const labC = textPlate('水', { w: 0.01, h: 0.008, color: '#23293a', bg: '#fffaf0', font: 'bold 96px "Songti SC", serif' }); labC.position.set(0, 0.012, 0.0165); cup.add(labC);
    const CUP_PIV = CUP_HOME.clone().add(new THREE.Vector3(-0.019, 0.04, 0)); cupPiv.position.copy(CUP_PIV);
    const spat = new Particles({ max: 200, geometry: new THREE.SphereGeometry(1, 6, 5), material: water2({ color: 0xe6e0c0, base: 0.6 }) }); group.add(spat.mesh);
    const steam = new Particles({ max: 80, sprite: true, color: 0xd6dde6, size: 0.012, opacity: 0.5 }); group.add(steam.mesh);
    const drops = new Particles({ max: 80, geometry: new THREE.SphereGeometry(1, 6, 5), material: water2({ color: 0xece6c8, base: 0.5 }) }); group.add(drops.mesh);
    const cardA = tag('', 'cond'); cardA.px = [-60, -70];
    const cardB = tag('', 'cond'); cardB.px = [40, -70];

    // ================= 状态 =================
    const fresh = () => ({ demo: false, poured: 0, T: ROOM, stir: 0, unstir: 0, botCarry: null, tilt: 0, rodCarry: null, lastRod: null, rodIn: false,
      cupCarry: null, ctilt: 0, wIn: 0, wT: ROOM, boil: 0, said: {}, read: false });
    S = fresh();

    // ================= 操作 =================
    const A = {
      botDrag(p) { if (!p) return; S.botCarry = p.clone(); },
      botDrop() { S.botCarry = null; },
      rodDrag(p) { if (!p) return; const last = S.lastRod; S.lastRod = p.clone(); S.rodCarry = p.clone(); S.rodIn = Math.hypot(p.x - BA.x, p.z - BA.z) < BR - 0.004 && p.y < 0.09; if (S.rodIn && last) S.stir = Math.min(1, S.stir + (Math.abs(p.x - last.x) + Math.abs(p.z - last.z)) * 40); },
      rodDrop() { S.rodCarry = null; S.lastRod = null; S.rodIn = false; },
      cupDrag(p) { if (!p) return; S.cupCarry = p.clone(); },
      cupDrop() { S.cupCarry = null; },
      reset() { S = fresh(); sink.clear(); spat.clear(); steam.clear(); drops.clear(); xMark.visible = false; W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; } bar.undo('pour', 'wrong', 'why'); status('全部重新摆好了，记录也清空了。'); },
    };
    const drag = draggable(group, [
      { obj: bottle.pick, plane: 'xy', offset: 0, hint: () => (S.poured >= V_ACID ? '' : '浓硫酸：拖到烧杯口，按住——沿内壁慢慢注入水中'), onStart: (p) => A.botDrag(p), onDrag: (p) => A.botDrag(p), onEnd: () => A.botDrop() },
      { obj: rodPick, plane: 'xz', offset: 0.03, hint: '玻璃棒：伸进烧杯里来回拖，不断搅拌', onStart: (p) => A.rodDrag(p), onDrag: (p) => A.rodDrag(p), onEnd: () => A.rodDrop() },
      { obj: cupPick, plane: 'xy', offset: 0, hint: () => (S.wIn > 0.5 ? '' : '错误操作：把水倒进浓硫酸（看看会怎样）'), onStart: (p) => A.cupDrag(p), onDrag: (p) => A.cupDrag(p), onEnd: () => A.cupDrop() },
    ], { tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const botToRim = () => BA.clone().add(new THREE.Vector3(BR + 0.004, BH - 0.032, 0));
    const cupToB = () => BB.clone().add(new THREE.Vector3(BBR + 0.004, BBH - 0.02, 0));
    const stirAt = (j) => new THREE.Vector3(BA.x - 0.008 + (j % 2 ? 0.01 : -0.01), 0.03, (j % 4 < 2 ? 0.01 : -0.01));
    const stirOn = (n) => [() => (S.rodCarry ? S.rodCarry.clone() : stirAt(0)), ...Array.from({ length: n }, (_, j) => stirAt(j + 1))];      // 接着手里的玻璃棒继续搅拌
    const upto = (f, t) => (k) => { if (k <= t) f(k); };          // 只做到 k = t：玻璃棒还拿在手里，接下来交给后面的动作
    // 质检用：一直搅拌到 done()（每几帧把玻璃棒在水里挪一下，像学生来回拖）；中途放演示时停下来等
    const stirUntil = (done) => { const me = S; let j = 0; const go = () => { if (S === me) { if (done()) return; if (me.rodCarry) A.rodDrag(stirAt(Math.floor(j++ / 6))); } requestAnimationFrame(go); }; requestAnimationFrame(go); };

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'pour', title: '浓硫酸注入水中', todo: '把<b>浓硫酸</b>拖到烧杯口，按住：沿内壁慢慢注入水中；同时用<b>玻璃棒</b>不断搅拌。看温度计。', target: () => (S.botCarry || S.rodCarry ? null : S.poured < 2 ? botPiv : rod) },
        { id: 'wrong', title: '错误操作会怎样', todo: '把右边那杯<b>水</b>倒进<b>浓硫酸</b>里，看看为什么“切不可将水倒入浓硫酸中”。', target: () => (S.cupCarry ? null : cupPiv) },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { sink.clear(); spat.clear(); steam.clear(); drops.clear(); xMark.visible = false; } }),
          shots: [
            // 玻璃棒先放进水里，一直搅拌；拿下瓶塞（倒放），拿起浓硫酸（标签朝向手心），沿内壁缓慢注入，倒满 10 mL；瓶子放回原处，盖好瓶塞
            { cap: '把浓硫酸沿烧杯内壁缓慢地注入盛有水的烧杯，用玻璃棒不断搅拌。', dur: 16, cam: [[BA.x + 0.035, 0.07, 0], [0.05, 0.25, 1], 0.34],
              during: act.seq(upto(act.path(rodPick, [null, new THREE.Vector3(BA.x - 0.01, 0.1, 0), stirAt(0)], { t0: 0.02, t1: 0.08, release: 2 }), 0.08),
                act.path(rodPick, stirOn(32), { t0: 0.08, t1: 0.98, release: 0.99, start: false }),
                act.drag(bottle.pick, botToRim, { t0: 0.13, t1: 0.25, release: 0.97, until: () => S.poured >= V_ACID })) },
            { cap: '温度计示数明显升高：浓硫酸溶于水时放出大量的热。', dur: 4, cam: [[BA.x, 0.07, 0], [0.05, 0.22, 1], 0.26] },
            { cap: '如果把水倒进浓硫酸里：水浮在浓硫酸上面，放出的热使水立刻沸腾，酸液飞溅——切不可这样做！演示完了，下面换你自己做。', dur: 7, cam: [[BB.x, 0.07, 0], [0.05, 0.25, 1], 0.34],
              during: act.drag(cupPick, cupToB, { t0: 0.04, t1: 0.25, release: 0.5 }) },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ================= 每帧 =================
    // 玻璃棒（原点在下端）：拿着时，在烧杯外举在杯口以上，到了杯口正上方再竖着放进去；往一边斜靠，但不穿过杯壁。
    //   松手：先竖着提出烧杯，再拿到原处上方，边放低边放倒，平放在桌上。（中和反应那一课是同样的做法——建议进 kit）
    const RIN = BR - 0.0012 - 0.0016 - 0.0004, ABOVE = BH + 0.006, LEAN = 0.25;          // RIN：玻璃棒中心离杯中心最远多少还碰不到杯壁
    const leanMax = (b) => { if (b.y >= BH) return LEAN; const bx = b.x - BA.x, r2 = RIN * RIN - (b.z - BA.z) ** 2; return r2 <= 0 ? 0 : clamp(Math.atan((bx + Math.sqrt(r2)) / (BH - b.y)), 0, LEAN); };
    const rodStep = () => {
      const b = rod.position, off = Math.hypot(b.x - BA.x, b.z - BA.z), inside = off < RIN + 0.001 && b.y < BH + 0.004;
      let to = null, lean = LEAN, a = 0.5;
      if (S.rodCarry) {
        const p = S.rodCarry;
        if (inside) to = S.rodIn ? new THREE.Vector3(p.x, 0.004, p.z) : new THREE.Vector3(b.x, ABOVE + 0.002, b.z);        // 在烧杯里搅拌；拿出来时先竖着提出来
        else if (b.y < ABOVE - 0.002) to = new THREE.Vector3(b.x, ABOVE, b.z);                                              // 先举起来，高过杯口
        else to = S.rodIn && off < RIN ? new THREE.Vector3(p.x, 0.004, p.z) : new THREE.Vector3(p.x, ABOVE, p.z);            // 到了杯口正上方才放下去
      } else {
        a = 0.2;
        if (inside) to = new THREE.Vector3(b.x, ABOVE + 0.004, b.z);
        else if (Math.hypot(b.x - ROD_REST.x, b.z - ROD_REST.z) > 0.003) to = new THREE.Vector3(ROD_REST.x, Math.max(b.y, ABOVE), ROD_REST.z);
        else { to = ROD_REST; a = 0.15; lean = Math.PI / 2 - (Math.PI / 2 - LEAN) * clamp((b.y - ROD_REST.y) / (ABOVE - ROD_REST.y), 0, 1); }      // 到了原处上方：边放低边放倒，平放在桌上
      }
      if (to) b.lerp(to, a);
      rod.rotation.z += (lean - rod.rotation.z) * 0.3;
      if (b.y < BH && Math.hypot(b.x - BA.x, b.z - BA.z) < RIN + 0.002) rod.rotation.z = Math.min(rod.rotation.z, leanMax(b));
    };
    const step = (h) => {
      // 浓硫酸注入水中：先拿下瓶塞（倒放在桌上），再拿起瓶子，转一下让标签朝向手心（倾斜时在上面）；瓶口靠在烧杯内壁，约 1 mL/s（慢慢倒）；
      //   放回原处以后盖好瓶塞
      const away = !!S.botCarry || botPiv.position.distanceTo(BOT_PIV) > 0.003 || S.tilt > 0.02;
      capCtl.update(0.3, away);
      const holding = !!S.botCarry && capOff();
      bottle.rotation.y += ((holding ? Math.PI / 2 : 0) - bottle.rotation.y) * 0.2;
      if (holding) {
        const mouth = S.botCarry.clone().add(new THREE.Vector3(0, 0.032, 0)), at = Math.hypot(mouth.x - (BA.x + BR), mouth.y - BH) < 0.035 && S.poured < V_ACID;
        botPiv.position.lerp(at ? BA.clone().add(new THREE.Vector3(BR + 0.002, BH + 0.002, 0)) : mouth, at ? 0.25 : 0.5);
        S.tilt += ((at ? 1.75 : 0) - S.tilt) * Math.min(1, h * 2.5); botPiv.rotation.z = S.tilt;
        if (at && S.tilt > 1.5) {
          const dv = Math.min(V_ACID - S.poured, 1.0 * h); S.poured += dv;
          S.T += DT_ALL * dv / V_ACID;          // 放出的热按倒进去的量算（溶液变多的影响已算在 56 ℃ 里）
          if (Math.random() < h * 25) drops.spawn({ p: BA.clone().add(new THREE.Vector3(BR - 0.003, BH - 0.004, 0)), v: new THREE.Vector3(0, -0.04, 0), size: 0.0009, life: 1.2 });
          if (Math.random() < h * 20) sink.spawn({ p: BA.clone().add(new THREE.Vector3(BR - 0.006 - Math.random() * 0.006, LV(50, BR), (Math.random() - 0.5) * 0.01)), v: new THREE.Vector3(-0.004, -0.012, 0), size: 0.004, alpha: 0.6, life: 3 });
          if (S.stir < 0.2) { S.unstir += h; if (S.unstir > 2 && !S.said.stir) { S.said.stir = true; status('浓硫酸比水重，沉到杯底，热都集中在那里——要用<b>玻璃棒不断搅拌</b>，把热散开。'); } } else S.unstir = 0;
          if (S.poured >= V_ACID && !S.said.full) { S.said.full = true; log([S.said.stir ? '浓硫酸沿内壁慢慢注入 50 mL 水中（中间有一段没有搅拌）' : '浓硫酸沿内壁慢慢注入 50 mL 水中，不断搅拌', `温度从 20 ℃ 升到约 <b>${Math.round(S.T)} ℃</b>`, '浓硫酸溶于水<b>放出大量的热</b>']); done('pour'); status(`10 mL 浓硫酸全部注入了：温度从 20 ℃ 升到了约 <b>${Math.round(S.T)} ℃</b>——浓硫酸溶于水放出大量的热。接着看看<b>错误操作</b>会怎样。`); }
        }
      } else if (!S.botCarry) { botPiv.position.lerp(BOT_PIV, 0.25); S.tilt *= 0.8; botPiv.rotation.z = S.tilt; }       // 拿着、瓶塞还没拿开：瓶子先不动
      botPiv.position.y = Math.max(botPiv.position.y, 0.067 * Math.cos(S.tilt) + 0.018 * Math.abs(Math.sin(S.tilt)));     // 瓶底不碰到桌面（放回去时边扶正边落下）
      bottle.liq.scale.y = Math.max(0.0005, 0.03 * (1 - S.poured / V_ACID));
      drops.update(h, (p, d) => { p.v.y -= 0.4 * d; p.p.addScaledVector(p.v, d); return p.p.y > LV(50, BR); });
      sink.update(h, (p, d) => { p.p.addScaledVector(p.v, d); p.v.x *= 0.98; p.alpha = 0.6 * (1 - p.age / p.life) * (S.stir > 0.3 ? 0.4 : 1); if (p.p.y < 0.004) p.v.y = 0; });
      S.T = Math.max(ROOM, S.T - (S.T - ROOM) * 0.0012 * h);
      ba.setLevel(LV(50 + S.poured * 0.95, BR));
      S.stir = Math.max(0, S.stir - h * 1.2);
      th.setTemp(S.T);
      heatA.material.opacity = clamp((S.T - 25) / 60, 0, 0.6); heatA.position.y = S.stir > 0.3 ? LV(30, BR) : 0.006;       // 不搅拌：热集中在杯底
      rodStep();
      // 错误操作：水倒进浓硫酸
      if (S.cupCarry) {
        const spout = S.cupCarry.clone().add(new THREE.Vector3(-0.019, 0.02, 0)), at = Math.hypot(spout.x - (BB.x + BBR), spout.y - BBH) < 0.035;
        cupPiv.position.lerp(at ? BB.clone().add(new THREE.Vector3(BBR + 0.002, BBH + 0.004, 0)) : spout, 0.3);
        S.ctilt += ((at ? 1.4 : 0) - S.ctilt) * Math.min(1, h * 3); cupPiv.rotation.z = S.ctilt;
        if (at && S.ctilt > 1.0 && S.wIn < 4) { S.wIn += 2 * h; if (Math.random() < h * 20) drops.spawn({ p: BB.clone().add(new THREE.Vector3(BBR - 0.003, BBH - 0.002, 0)), v: new THREE.Vector3(0, -0.04, 0), size: 0.0012, life: 1 }); }
      } else { cupPiv.position.lerp(CUP_PIV, 0.25); S.ctilt *= 0.8; cupPiv.rotation.z = S.ctilt; }
      if (S.wIn > 0) {
        // 水浮在浓硫酸上：放出的热都在这一薄层水里，一下子就过了 100 ℃
        S.wT = Math.min(140, S.wT + 260 * h * Math.min(1, S.wIn));
        waterLayer.scale.y = Math.max(0.0001, LV(S.wIn, BBR));
        if (S.wT >= 100) {
          S.boil = Math.min(1, S.boil + h * 2);
          if (Math.random() < h * 120 * S.boil) spat.spawn({ p: BB.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.03, LV(10 + S.wIn, BBR), (Math.random() - 0.5) * 0.03)), v: new THREE.Vector3((Math.random() - 0.5) * 0.25, 0.18 + Math.random() * 0.2, (Math.random() - 0.5) * 0.25), size: 0.0008 + Math.random() * 0.0012, life: 1.4 });
          if (Math.random() < h * 30) steam.spawn({ p: BB.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.02, BBH, (Math.random() - 0.5) * 0.02)), v: new THREE.Vector3(0, 0.05, 0), size: 0.012, alpha: 0.5, life: 1.2 });
          if (!S.said.boil) { S.said.boil = true; xMark.visible = true; sfx.clink({ freq: 300, gain: 0.14 }); log(['把水倒进浓硫酸（错误操作）', '水浮在上面，立刻<b>沸腾</b>，酸液向四周<b>飞溅</b>', '热集中在一薄层水里']); done('wrong'); status('水浮在浓硫酸上面，放出的热集中在这一薄层水里——水立刻<b>沸腾</b>，带着酸液<b>飞溅</b>！所以<b>切不可将水倒入浓硫酸中</b>。'); W?.t1.open(); }
        }
        if (!S.cupCarry && S.wIn > 0) S.wIn = Math.max(0, S.wIn - 0.3 * h);       // 沸腾、飞溅掉
        if (S.wIn <= 0) S.boil = Math.max(0, S.boil - h);
      }
      spat.update(h, (p, d) => { p.v.y -= 0.6 * d; p.p.addScaledVector(p.v, d); return p.p.y > 0.002; });
      steam.update(h, (p, d) => { p.p.addScaledVector(p.v, d); p.alpha = 0.5 * (1 - p.age / p.life); });
      cardA.text(`<div class="cc"><div class="cc-t"><span class="cc-name">${S.poured > 0 ? '稀硫酸' : '水'}</span>${S.T > 30 ? '<span class="cc-res burn">变热</span>' : ''}</div><div class="cc-more"><div class="cc-obs"><b style="font-size:1.15em">${S.T.toFixed(0)} ℃</b><small>注入浓硫酸 ${S.poured.toFixed(1)} / 10 mL${S.poured > 0 && S.poured < V_ACID && S.stir < 0.2 ? ' · 没搅拌，热在杯底' : ''}</small></div></div></div>`)
        .loc(group, BA.x, BH, 0).show(true);
      cardB.text(`<div class="cc"><div class="cc-t"><span class="cc-name">浓硫酸上的水层</span>${S.boil > 0.1 ? '<span class="cc-res burn">沸腾飞溅</span>' : ''}</div><div class="cc-more"><div class="cc-obs"><small>水层约 ${Math.round(S.wT)} ℃</small></div></div></div>`)
        .loc(group, BB.x, BBH, 0).show(S.wIn > 0.05 || S.boil > 0.05);
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.3, d: 0.15, h: 0.15 },
      view: { elev: 18, azim: -4, lookY: 0.42, frameMargin: 1.08 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = () => [...W.tbl.el.querySelectorAll('tbody tr')].map((tr) => `<div>${tr.children[0].innerHTML}：${tr.children[1].innerHTML}</div>`).join('') + '<div>浓硫酸密度 1.84 g/cm³，水 1.0 g/cm³</div>';
        const t2 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '稀释浓硫酸时，正确的操作是——',
          options: ['把浓硫酸沿器壁慢慢注入水中，并不断搅拌', '把水慢慢倒入浓硫酸中', '把浓硫酸和水同时倒进烧杯'],
          wrong: ['你刚才试过了：水浮在浓硫酸上，沸腾飞溅。', '两种一起倒，也会有水浮在浓硫酸上、局部沸腾。'],
          ok: '对：<b>酸入水</b>，沿器壁，慢慢倒，不断搅。实验时戴好护目镜。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); } });
        const t1 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '为什么把水倒进浓硫酸会沸腾飞溅，把浓硫酸注入水中却不会？',
          options: ['水比浓硫酸轻，浮在上面，热集中在一薄层水里；浓硫酸注入水中会沉下去，热被大量的水吸收', '浓硫酸倒进水里时不放热', '水倒进浓硫酸时放的热更多'],
          wrong: ['看左边的温度计：浓硫酸注入水中也放出了大量的热。', '放热多少差不多，区别在热“集中”在哪里。'],
          ok: '对：关键是<b>密度</b>和<b>热量集中在哪里</b>。',
          onOk: () => t2.open() });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['做了什么', '现象', '说明']);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：这是课本上的<b>教师演示</b>实验，真实实验要戴护目镜、由老师操作。温度由稀释热估算（约 75 kJ/mol），不计散热；水层沸腾、飞溅是示意。' });
        ui.controls.append(t1.el, t2.el, next, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, t1, t2, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('图 10-7：左边一个烧杯里是 50 mL 水（20 ℃），插着温度计；后面一瓶浓硫酸（98%）。右边一杯浓硫酸和一小杯水，用来看错误操作（图 10-8）的后果。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { bar.dispose(); sink.dispose(); spat.dispose(); steam.dispose(); drops.dispose(); },
      debug: { get S() { return S; }, A, bar, picks: { bottle: bottle.pick, rod: rodPick, cup: cupPick },
        qa: qaFlow(drag, [
          // 课本的做法：玻璃棒先放进水里；浓硫酸沿内壁缓慢注入，一边倒一边不断搅拌，倒满 10 mL；放回浓硫酸（盖好瓶塞），再拿出玻璃棒
          { name: '拿起玻璃棒', hold: rodPick },
          { name: '玻璃棒放进水里', run: () => A.rodDrag(stirAt(0)), wait: 0.6 },
          { name: '拿起浓硫酸', hold: bottle.pick },
          { name: '一边注入一边搅拌', run: () => { A.botDrag(botToRim()); stirUntil(() => S.poured >= V_ACID); }, wait: 11 },
          { name: '放下浓硫酸', release: bottle.pick, wait: 0.8 },
          { name: '放下玻璃棒', release: rodPick, wait: 0.5 },
          { name: '拿起水', hold: cupPick },
          { name: '倒进浓硫酸', run: () => A.cupDrag(cupToB()), wait: 1.5 },
          { name: '放下水', release: cupPick, wait: 1 },
          { name: '答第一题', run: () => W.t1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.t2.el.querySelector('button').click() },
        ]) },
    };
  },
};
