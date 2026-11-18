// 人教版高中化学必修第二册第 13 页【实验5-5】（图5-10 二氧化氮溶于水的实验）：在一支 50 mL 的注射器里充入 20 mL NO，然后吸入 5 mL 水，
//   用乳胶管和弹簧夹封住管口，振荡注射器，观察现象。打开弹簧夹，快速吸入 10 mL 空气后夹上弹簧夹，观察现象。振荡注射器，再观察现象。
//   安全标志：护目镜、排风、洗手（NO、NO₂ 都有毒）。
// 课本（同页）：NO 无色、有毒，不易溶于水，常温下很容易与氧气化合生成 NO₂：2NO + O₂ ══ 2NO₂；NO₂ 红棕色、有毒、易溶于水，
//   溶于水时生成硝酸和一氧化氮：3NO₂ + H₂O ══ 2HNO₃ + NO。
// 模型（界面上写明）：
//   气体都按同温同压下的体积（mL）算，体积比 = 物质的量之比；活塞摩擦不计：夹上弹簧夹时，里面的气体和外面的大气压相等，活塞停在“水 + 气体”的总体积处（刻度读数）。
//   空气按 O₂ 21%、其余 79%（主要是 N₂）算。2NO + O₂ → 2NO₂：几乎立刻（τ ≈ 0.35 s，示意）；NO 过量时 O₂ 用完为止。
//   NO₂ 溶于水：只在有水时；振荡时快（几秒），静置时很慢（示意）。每 3 mL NO₂ 生成 2 mL 当量的 HNO₃ 和 1 mL NO。
//   NO 在水里溶得很少（20 ℃ 约 0.05 体积 / 体积水），不计；2NO₂ ⇌ N₂O₄ 不计（计入的话体积还会再小一点）。
//   弹簧夹开着时：活塞拉出 → 从管口进空气（管口在水里则进水）；活塞推进 → 气体从管口出去（有毒）；里面的气体变少 → 外面的空气从管口补进来，活塞不动。
//   弹簧夹夹着时：活塞拉不动、推不动（手上只能挪一点，松手弹回）。
//   红棕色的深浅按 NO₂ 占气体的比例（示意）；空气刚进来时红棕色先出现在管口那头，再散开。点：每 0.5 mL 一个——淡紫灰 = NO（无色，示意）、蓝 = O₂、灰 = N₂ 等。
import * as THREE from 'three';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs, mountXuean, moreBox, varyBox } from './kit/chemlesson.js';
import { draggable, clamp } from './kit/interact.js';
import { chemBeaker, CHEM } from './kit/chem.js';
import { smoke2, bubble2 } from './kit/chemfx.js';
import { micro } from './kit/microworld.js';
import { textPlate } from './kit/props.js';
import { syringe50, no2Scene, latexEnd, ML_PER_M, REST_Y, ROD } from './kit/no2water-parts.js';
import { h } from '../ui/Panel.js';

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const BX = -0.118, BR = 0.024, BH = 0.042, BEAK_ML_PER_M = Math.PI * 2.28 * 2.28 * 100, BEAK0 = 45;          // 烧杯（内半径 2.28 cm）：45 mL 水
const HOME = { x: 0.006, y: REST_Y, tilt: 0 };
const bendAt = (y) => clamp((y - 0.022) / 0.025, 0, 1);          // 乳胶管软的一段：注射器提起来就垂下去，放在桌上是直的
// 吸水的姿势：注射器管口略朝下（10°），乳胶管垂进烧杯，末端在水面下约 1.5 cm
const TH_DIP = 10 * Math.PI / 180, DIP = (() => { const [ex, ey] = latexEnd(1, TH_DIP), c = Math.cos(TH_DIP), s = Math.sin(TH_DIP); return { x: BX - (ex * c - ey * s), y: 0.0135 - (ex * s + ey * c), tilt: TH_DIP }; })();
const UP = 0.115, PICK_C = 0.04, PICK_OFF = ROD - 0.016;          // 搬动时抬到的高度；针筒拾取盒中心、活塞拾取盒中心（局部 x）
const L_MAX = 50 / ML_PER_M, AIR_O2 = 0.21;
const plate = (text, w, hh) => textPlate(text, { w, h: hh, color: '#23293a', bg: '#fffaf0', font: `bold ${Math.floor(Math.min(0.8 * 512 * hh / w, 0.82 * 512 / text.length))}px "Songti SC", serif` });
const r1 = (x) => (Math.round(x * 10) / 10).toFixed(1);

export default {
  id: 'no2water',
  fig: '图5-10',
  title: '二氧化氮溶于水的实验',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '注射器里是无色的 NO，还吸了 5 mL 水。快速吸入 10 mL 空气后夹上弹簧夹，再振荡——会看到什么？',
    hint: '课本第 13 页【实验5-5】。先猜，再动手。',
    options: ['吸入空气后变红棕色，振荡后红棕色褪去，还剩一些无色气体', '吸入空气后没有变化', '振荡后针筒里的气体全部溶进水里'],
    answer: 0,
  },
  need: '注射器里的 20 mL NO 吸入 5 mL 水，封住管口振荡；再快速吸入 10 mL 空气后夹上弹簧夹，观察；再振荡，观察',
  conclusion: {
    page: 17, rect: [64, 120, 378, 264],
    quote: '一氧化氮是无色的有毒气体，不易溶于水，在常温下很容易与氧气化合，生成二氧化氮。……二氧化氮是红棕色、有刺激性气味的有毒气体，密度比空气的大，易液化，易溶于水。二氧化氮溶于水时生成硝酸和一氧化氮，工业上利用这一原理生产硝酸。',
    formula: '2NO + O₂ ══ 2NO₂　　3NO₂ + H₂O ══ 2HNO₃ + NO',
    why: '吸水、封口、振荡：没有变化——NO <b>不易溶于水</b>。吸入空气：无色气体立刻变成<b>红棕色</b>，活塞往里缩——NO 和空气里的 O₂ 化合成 NO₂（2 体积 NO + 1 体积 O₂ → 2 体积 NO₂，气体变少）。再振荡：红棕色<b>褪去</b>，活塞继续往里走——NO₂ <b>易溶于水</b>，生成硝酸和 NO；每 3 体积 NO₂ 只回来 1 体积 NO，所以气体没有全部消失。<br>要让 NO 充分转化，就再吸入空气（氧气）、再振荡……反复进行；工业上生产硝酸，吸收 NO₂ 时也要通入足量空气，让生成的 NO 再被氧化、再被吸收。',
    src: '课本第 13 页 · 第五章 第二节 氮及其化合物',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (key, row) => { if (S.said[key]) return; S.said[key] = true; if (!S.demo) W?.tbl.add(row); };
    const once = (key, m) => { if (S.said[key]) return; S.said[key] = true; status(m); };
    paperSheet(group, { w: 0.3, d: 0.11, x: 0.008, z: 0.01 });

    // ---- 烧杯（水）、注射器 ----
    const beaker = chemBeaker({ r: BR, h: BH, level: BEAK0 / BEAK_ML_PER_M, color: CHEM.water, marks: false }); beaker.position.set(BX, 0, 0); group.add(beaker);
    { const lab = plate('水', 0.012, 0.009); lab.rotation.x = -Math.PI / 2; lab.position.set(BX, 0.0012, BR + 0.012); group.add(lab); }
    const syr = syringe50(); group.add(syr);
    const C = syr.contents;
    const smoke = smoke2({ max: 200, color: 0x9c4a22, opacity: 0.8 }); smoke.mesh.renderOrder = 13; group.add(smoke.mesh);
    const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), bubble2({ color: 0x6f8797, white: 0.4 }), 40); bubbles.count = 0; bubbles.renderOrder = 8.5; bubbles.frustumCulled = false; bubbles.raycast = () => {}; group.add(bubbles);
    const BUB = [];
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3();

    const fresh = () => ({ demo: false, near: false, gen: Math.random(), said: {},
      syr: { pos: [HOME.x, HOME.y], tilt: 0, at: 'home', carry: false, last: null, motion: null },
      L: 20 / ML_PER_M, Loff: 0, held: false, closed: true, clipK: 0,
      w: 0, beak: BEAK0, no: 20, o2: 0, n2: 0, no2: 0, hno3: 0, o2In: 0, n2In: 0,
      lost: 0, lostNO: 0, leakT: 0, openT: 0, shakeE: 0, shook: 0, mix: 1,
      cycle: 0, inCycle: false, airCycle: 0, peak: 0, airLogged: false, marks: [], autoHome: 0 });
    S = fresh();
    const gasV = () => S.no + S.o2 + S.n2 + S.no2;
    const Leq = () => Math.min(L_MAX + 0.004, (S.w + gasV()) / ML_PER_M);
    const origin = () => V(S.syr.pos[0], S.syr.pos[1], 0);
    const axis = () => V(Math.cos(S.syr.tilt), Math.sin(S.syr.tilt), 0);
    const local = (x, y = 0) => origin().add(V(x * Math.cos(S.syr.tilt) - y * Math.sin(S.syr.tilt), x * Math.sin(S.syr.tilt) + y * Math.cos(S.syr.tilt), 0));
    const tipPos = () => { const [ex, ey] = latexEnd(bendAt(S.syr.pos[1]), S.syr.tilt); return local(ex, ey); };
    const beakLevel = () => S.beak / BEAK_ML_PER_M;
    const inWater = () => { const t = tipPos(); return Math.abs(t.x - BX) < BR - 0.003 && t.y < beakLevel() - 0.001; };
    const inBeaker = () => { const t = tipPos(); return Math.abs(t.x - BX) < BR + 0.004 && t.y < BH + 0.004; };          // 乳胶管末端还在杯口下面（只能竖直提出来）
    const mark = () => (S.L + S.Loff) * ML_PER_M;          // 活塞停在多少 mL 刻度（水 + 气体）
    const spawn = {};

    // ---- 吸进 / 推出 ----
    const intake = (d) => {
      if (inWater()) { const dw = Math.min(d, S.beak); S.w += dw; S.beak -= dw; return; }
      if (!S.inCycle && S.no > 0.3) { S.inCycle = true; S.cycle++; S.airCycle = 0; S.peak = 0; S.airLogged = false; S.shook = 0; }
      S.o2 += AIR_O2 * d; S.n2 += (1 - AIR_O2) * d; S.o2In += AIR_O2 * d; S.n2In += (1 - AIR_O2) * d; S.airCycle += d;
      if (S.no > 0.3) S.mix = Math.max(0, S.mix - (d / Math.max(1, gasV())) * 4);
      spawn.o2 = spawn.n2 = 'tip';
    };
    const expel = (d) => {
      if (inWater() && S.syr.tilt > 0.5 && S.w > 0) { const dw = Math.min(S.w, d); S.w -= dw; S.beak += dw; d -= dw; }
      const v = gasV(); if (d <= 1e-6 || v <= 1e-6) return;
      const k = Math.min(1, d / v);
      S.lostNO += (S.no + S.no2) * k; S.lost += d;
      S.no *= 1 - k; S.o2 *= 1 - k; S.n2 *= 1 - k; S.no2 *= 1 - k;
      S.leakT = 1.2; spawn.noOut = spawn.o2Out = spawn.n2Out = 'tip';
      if (inWater()) for (let i = 0; i < Math.min(12, d * 3); i++) BUB.push({ p: tipPos().add(V((Math.random() - 0.5) * 0.004, 0, (Math.random() - 0.5) * 0.004)), v: 0.05 + Math.random() * 0.03, r: 0.0012 + Math.random() * 0.0012 });
      if (S.lost > 0.4) {
        log('leak', ['弹簧夹开着，推了活塞', `气体从管口出来，${inWater() ? '从水里冒出去，' : ''}遇到空气变成<b>红棕色</b>`, 'NO 有毒，遇空气生成的 NO₂ 也有毒：不能把气体推出来；实验要在通风处做（课本的排风标志）']);
        status(`推活塞时弹簧夹开着：约 ${r1(S.lost)} mL 气体（其中 NO、NO₂ 约 ${r1(S.lostNO)} mL）从管口跑了出来，遇到空气变成红棕色——<b>有毒</b>。可以“全部重来”。`);
      }
    };

    // ---- 注射器搬动：抬起来 → 平移 → 放下（倾斜跟着走）----
    const travel = (pts, at) => { const s = S.syr; s.carry = false; s.at = 'moving'; s.motion = { points: pts.map((p) => [...p]), from: [s.pos[0], s.pos[1], s.tilt], at }; };
    const goDip = () => travel([[S.syr.pos[0], Math.max(UP, S.syr.pos[1]), 0], [DIP.x, UP, DIP.tilt], [DIP.x, DIP.y, DIP.tilt]], 'dip');
    const goHome = () => (S.syr.pos[1] < 0.05 && !inBeaker() && Math.abs(S.syr.tilt) < 0.05 ? travel([[HOME.x, HOME.y, 0]], 'home') : travel([[S.syr.pos[0], Math.max(UP, S.syr.pos[1]), S.syr.tilt], [HOME.x, UP, 0], [HOME.x, HOME.y, 0]], 'home'));
    const release = () => {
      const t = tipPos();
      if (t.x < BX + 0.022 && t.x > BX - 0.07) return goDip();
      goHome();
    };
    const A = {
      tapClip() {
        S.closed = !S.closed; S.shook = 0;
        if (S.closed) {
          if (S.syr.at === 'dip' && S.w > 0.5) { status(`夹上了弹簧夹，封住了管口：针筒里有 ${r1(S.w)} mL 水${S.w > 7 ? '（课本是 5 mL，多了）' : ''}。把注射器提出来放好，再<b>振荡</b>。`); S.autoHome = 0.4; }
          else if (S.inCycle && S.airCycle > 0.5) status(`夹上了。吸进去约 ${Math.round(S.airCycle)} mL 空气：看针筒里的颜色和活塞。`);
          else status('夹上了弹簧夹：管口封住了。');
        } else {
          S.openT = 0;
          status(S.syr.at === 'dip' ? '弹簧夹打开了：管口在水里。拉<b>活塞</b>吸水，到 25 mL 刻度就是 5 mL 水。' : S.w > 0.5 ? '弹簧夹打开了：管口通着空气。<b>快速</b>拉活塞吸入空气，再点弹簧夹夹上。' : '弹簧夹打开了：管口通着空气。');
        }
      },
      reset() { if (bar.playing) bar.stop(); S = fresh(); sync(); mic.close(); back(); W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.t3.close(); W.next.hidden = true; W.ui.relock(); } bar.undo('water', 'seal', 'shake1', 'air', 'shake2', 'why'); status('注射器里又是 20 mL NO 了，弹簧夹夹着。'); },
    };
    const sync = () => { C.clear(); smoke.clear(); BUB.length = 0; syr.position.set(S.syr.pos[0], S.syr.pos[1], 0); syr.rotation.z = S.syr.tilt; syr.setLatex(bendAt(S.syr.pos[1]), S.syr.tilt); syr.setL(S.L + S.Loff); syr.clip.setOpen(S.closed ? 0 : 1); S.clipK = S.closed ? 0 : 1; };
    sync();

    const drag = draggable(group, [
      { obj: syr.barrelPick, plane: 'xy', offset: 0, keepOffset: true, anchor: syr.barrelPick,
        hint: () => (S.syr.at === 'dip' ? '注射器：拖开就提出来，放回桌上' : S.w < 1 ? '注射器：拖到烧杯上方松手，管口伸进水里' : '注射器：按住左右来回拖，振荡'),
        onStart: (p) => { const s = S.syr; s.motion = null; s.carry = true; s.last = p ? p.clone() : null; if (s.at !== 'dip') s.at = 'carry'; },
        onDrag: (p) => {
          if (!p) return; const s = S.syr;
          if (s.last) S.shakeE = Math.min(1, S.shakeE + (Math.abs(p.x - s.last.x) + 0.5 * Math.abs(p.y - s.last.y)) * 22);
          s.last = p.clone();
          let o = p.clone().sub(axis().multiplyScalar(PICK_C));
          if (inBeaker()) { o.x = s.pos[0]; o.y = clamp(o.y, DIP.y, 0.2); }          // 乳胶管还在杯里：只能竖直提出来
          else {
            o.x = clamp(o.x, -0.15, 0.06); o.y = clamp(o.y, REST_Y, 0.2);
            // 别从杯壁穿过去：乳胶管末端、针筒靠近烧杯时要高过杯口（连续地抬高，不跳）
            const bx = o.x - 0.0135 - (BX + BR);
            o.y = Math.max(o.y, REST_Y + (BH + 0.022 - REST_Y) * clamp((0.004 - bx) / 0.01, 0, 1));
            for (let k = 0; k < 6; k++) {          // 垂下来的乳胶管末端也要高过杯口（提得越高垂得越多，迭代几次）
              const [ex, ey] = latexEnd(bendAt(o.y), s.tilt), r = clamp((0.008 - (o.x + ex - (BX + BR))) / 0.012, 0, 1);
              const need = (REST_Y - 0.012) * (1 - r) + (BH + 0.008) * r - (o.y + ey);
              if (need <= 1e-5) break; o.y += need;
            }
          }
          s.pos = [o.x, o.y]; if (s.at === 'dip' && o.y > DIP.y + 0.004) s.at = 'carry';
        },
        onEnd: () => { S.syr.carry = false; S.syr.last = null; release(); } },
      { obj: syr.plungerPick, plane: 'xy', offset: 0, keepOffset: true, anchor: syr.plungerPick,
        hint: () => (S.closed ? '活塞：弹簧夹夹着，拉不动' : S.syr.at === 'dip' ? '活塞：往外拉吸水（到 25 mL 刻度）' : '活塞：往外拉吸入空气，往里推会把气体推出去'),
        onStart: () => { S.held = true; },
        onDrag: (p) => {
          if (!p || S.syr.motion) return;
          const Lw = p.clone().sub(origin()).dot(axis()) - PICK_OFF;
          if (S.closed) { S.Loff = clamp(Lw - S.L, -0.004, 0.004); if (Math.abs(Lw - S.L) > 0.004) once('pullShut', '弹簧夹夹着，管口封住了：活塞<b>拉不动、推不动</b>（一松手就弹回去）。要吸入东西，先点<b>弹簧夹</b>打开。'); }
          else S.L = clamp(Lw, 0.001, L_MAX);
        },
        onEnd: () => { S.held = false; } },
    ], { tip: tag('', 'pill'), highlight: true, taps: [{ obj: syr.clipPick, hint: () => (S.closed ? '弹簧夹：点一下打开' : '弹簧夹：点一下夹上'), onTap: () => A.tapClip() }] });
    const act = demoActs(drag, group);
    const mic = micro({ tag, look, back, group, scene: no2Scene(), at: () => V(HOME.x + 0.045, 0.045, 0), btnAt: () => V(HOME.x + 0.1, 0.05, 0), label: '钻进去看',
      state: () => ({ water: S.w > 0.2, no: S.no, o2: S.o2, n2: S.n2, no2: S.no2, hno3: S.hno3, o2In: S.o2In, n2In: S.n2In, shaking: S.shakeE > 0.15, leak: S.leakT > 0 }),
      key: () => String(S.gen), show: () => S.syr.at === 'home', bar: () => bar, scale: 0.0068, lookD: [0.04, 0.3, 1], dist: 0.26 });

    // 演示：活塞拉到某个刻度（拾取盒中心的位置）；注射器拿到烧杯上方
    const plungerTo = (ml) => () => local(ml / ML_PER_M + PICK_OFF);
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'water', title: '吸入 5 mL 水', todo: '把<b>注射器</b>拖到烧杯上方松手，管口伸进水里；点<b>弹簧夹</b>打开，拉<b>活塞</b>吸入 5 mL 水（到 25 mL 刻度）。', target: () => (S.syr.at !== 'dip' ? syr : S.closed ? syr.clip : syr.plunger) },
        { id: 'seal', title: '封住管口', todo: '点<b>弹簧夹</b>夹上，用乳胶管和弹簧夹封住管口。', target: () => syr.clip },
        { id: 'shake1', title: '振荡', todo: '按住<b>注射器</b>左右来回拖几下（振荡），观察现象。', target: () => (S.syr.at === 'dip' ? null : syr) },
        { id: 'air', title: '吸入 10 mL 空气', todo: '点<b>弹簧夹</b>打开，<b>快速</b>拉<b>活塞</b>吸入 10 mL 空气，再点弹簧夹夹上，观察现象。', target: () => (S.o2In < 1.5 ? (S.closed ? syr.clip : syr.plunger) : !S.closed ? syr.clip : null) },
        { id: 'shake2', title: '再振荡', todo: '再<b>振荡</b>注射器，观察现象。', target: () => syr },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { sync(); mic.close(); } }),
          shots: [
            { cap: '注射器里充入了 20 mL NO（无色）。把注射器口伸进水里，打开弹簧夹，吸入 5 mL 水。', dur: 10, cam: [[-0.07, 0.07, 0], [0.04, 0.3, 1], 0.33],
              during: act.seq(act.drag(syr.barrelPick, () => V(DIP.x + PICK_C, 0.105, 0), { t0: 0.03, t1: 0.2, release: 0.22 }), act.tap(syr.clipPick, 0.48), act.drag(syr.plungerPick, plungerTo(25), { t0: 0.56, t1: 0.82, release: 0.86 })) },
            { cap: '用乳胶管和弹簧夹封住管口，振荡注射器：气体还是无色，没有明显变化——NO 不易溶于水。', dur: 8, cam: [[0.03, 0.04, 0], [0.04, 0.3, 1], 0.3],
              during: act.seq(act.tap(syr.clipPick, 0.04), act.wiggle(syr.barrelPick, { t0: 0.36, t1: 0.9, amp: 0.014, hz: 2.2, dur: 8 })) },
            { cap: '打开弹簧夹，快速吸入 10 mL 空气后夹上：无色气体变成红棕色，活塞往里缩了一点。', dur: 8, cam: [[0.03, 0.04, 0], [0.04, 0.3, 1], 0.28],
              during: act.seq(act.tap(syr.clipPick, 0.05), act.drag(syr.plungerPick, plungerTo(35), { t0: 0.12, t1: 0.3, release: 0.32 }), act.tap(syr.clipPick, 0.38)) },
            { cap: '钻进去看，再振荡：三个 NO₂ 和一个 H₂O 变成两个 HNO₃ 和一个 NO——红棕色褪去，活塞继续往里走，剩下无色的 NO（和空气带进来的 N₂）。演示完了，换你自己做。', dur: 14, cam: [[0.04, 0.07, 0], [0.04, 0.3, 1], 0.32],
              enter: () => mic.open(true), during: act.seq(act.wiggle(syr.barrelPick, { t0: 0.08, t1: 0.7, amp: 0.012, hz: 2, dur: 14 }), act.at(0.98, () => mic.close())) },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    const step = (dt, t) => {
      for (const k in spawn) delete spawn[k];
      const s = S.syr;
      // 注射器搬动
      if (s.motion) {
        const M = s.motion, goal = M.points[0], p = V(s.pos[0], s.pos[1]), g = V(goal[0], goal[1]), d = g.clone().sub(p), seg = V(M.from[0], M.from[1]).distanceTo(g);
        p.addScaledVector(d, Math.min(1, dt * 0.26 / Math.max(1e-5, d.length()))); s.pos = [p.x, p.y];
        const fr = seg > 1e-5 ? 1 - p.distanceTo(g) / seg : 1; s.tilt = M.from[2] + (goal[2] - M.from[2]) * clamp(fr, 0, 1);
        if (p.distanceTo(g) < 0.0004) { s.tilt = goal[2]; M.from = [g.x, g.y, goal[2]]; M.points.shift(); if (!M.points.length) { s.motion = null; s.at = M.at; if (M.at === 'dip') status(S.closed ? '管口伸进水里了。点<b>弹簧夹</b>打开，再拉<b>活塞</b>吸水。' : '管口伸进水里了。拉<b>活塞</b>吸水（到 25 mL 刻度）。'); } }
      } else if (s.carry && !inBeaker()) s.tilt += (0 - s.tilt) * Math.min(1, dt * 8);
      if (S.autoHome > 0) { S.autoHome -= dt; if (S.autoHome <= 0 && S.syr.at === 'dip' && S.closed) goHome(); }          // 在水里夹上以后：提出来放回桌上
      // 弹簧夹
      S.clipK += ((S.closed ? 0 : 1) - S.clipK) * Math.min(1, dt * 12);
      // 活塞：夹着 → 停在“水 + 气体”处（手上只能挪一点，松手弹回）；开着 → 停在哪儿就是哪儿，少了的从管口补进来
      if (!S.held) S.Loff += (0 - S.Loff) * Math.min(1, dt * 10);
      if (S.closed) S.L += (Leq() - S.L) * Math.min(1, dt / 0.25);
      else if (!s.motion) {
        const def = S.L * ML_PER_M - S.w - gasV();
        if (def > 0.002) intake(def); else if (def < -0.002) expel(-def);
      }
      // 反应：2NO + O₂ → 2NO₂（几乎立刻）
      const d1 = Math.min(S.o2, S.no / 2) * (1 - Math.exp(-dt / 0.35));
      S.no -= 2 * d1; S.o2 -= d1; S.no2 += 2 * d1;
      // NO₂ 溶于水：3NO₂ + H₂O → 2HNO₃ + NO（振荡时快）
      if (S.w > 0.3 && S.no2 > 0) { const d2 = S.no2 * (1 - Math.exp(-(0.006 + 1.2 * S.shakeE) * dt)); S.no2 -= d2; S.no += d2 / 3; S.hno3 += (2 * d2) / 3; if (d2 > 1e-4) spawn.no = 'surf'; }
      S.peak = Math.max(S.peak, S.no2);
      S.mix = Math.min(1, S.mix + dt * (0.3 + 3 * S.shakeE));
      S.shook += S.shakeE * dt; S.shakeE = Math.max(0, S.shakeE - dt * 0.6);
      S.leakT = Math.max(0, S.leakT - dt);
      if (!S.closed && !inWater()) S.openT += dt;

      // ---- 观察、步骤 ----
      if (S.w >= 4.5 - 1e-6 && !S.held && !S.said.water) { S.said.water = true; done('water'); if (S.syr.at === 'dip') status(`吸进了 ${r1(S.w)} mL 水。点<b>弹簧夹</b>夹上，封住管口。`); }
      if (S.w > 8 && !S.said.much) once('much', `吸进去 ${r1(S.w)} mL 水了：课本是 5 mL。`);
      if (S.closed && S.w >= 1 && bar.has('water')) done('seal');
      if (S.closed && S.w >= 1 && S.o2In < 0.05 && S.shook > 1.0 && !S.said.shake1) {
        log('shake1', ['吸入 5 mL 水，封住管口，振荡', '没有明显变化：气体还是<b>无色</b>，活塞不动', 'NO <b>不易溶于水</b>，也不与水反应']);
        done('shake1'); status('没有明显变化：NO 不易溶于水。现在点<b>弹簧夹</b>打开，<b>快速</b>吸入 10 mL 空气，再夹上。');
      }
      if (!S.closed && S.shakeE > 0.3 && S.w > 0.3 && S.o2In < 0.05) once('openShake0', '弹簧夹还开着：先点<b>弹簧夹</b>夹上，封住管口再振荡。');
      if (S.inCycle && !S.airLogged && S.closed && S.airCycle > 0.5 && S.o2 < 0.02 && Math.abs(S.L - Leq()) < 0.0002) {
        S.airLogged = true; S.marks.push(mark());
        const n = S.cycle, x = Math.round(S.airCycle), m = Math.round(mark());
        log('air' + n, [n === 1 ? `打开弹簧夹，快速吸入约 ${x} mL 空气后夹上` : `第 ${n} 次吸入约 ${x} mL 空气、夹上`, `无色气体变成<b>红棕色</b>${n > 1 ? '' : ''}；活塞往里缩了一点（停在约 ${m} mL 刻度）`, 'NO 与空气里的 O₂ 化合成红棕色的 NO₂：2NO + O₂ ══ 2NO₂（3 体积变 2 体积）']);
        if (n === 1) { done('air'); status(`变成<b>红棕色</b>了，活塞也往里缩了一点（约 ${m} mL 刻度）。再<b>振荡</b>注射器。${x > 12 ? '（吸进去的空气比 10 mL 多：O₂ 多，生成的 NO₂ 也多，颜色更深。）' : ''}`); }
        else status(`又变成红棕色了（停在约 ${m} mL 刻度）。再振荡。`);
      }
      if (S.inCycle && S.airLogged && S.closed && S.peak > 0.3 && S.no2 < 0.05 * S.peak && Math.abs(S.L - Leq()) < 0.0002) {
        S.inCycle = false; const n = S.cycle, m = Math.round(mark()), left = gasV();
        log('abs' + n, [n === 1 ? '振荡注射器' : `第 ${n} 次振荡`, `红棕色<b>褪去</b>；活塞继续往里走（停在约 ${m} mL 刻度），还剩约 ${Math.round(left)} mL 无色气体`, `NO₂ 溶于水，生成硝酸和 NO：3NO₂ + H₂O ══ 2HNO₃ + NO。剩下的是 NO（约 ${r1(S.no)} mL）${S.n2 > 0.5 ? `和空气带进来的 N₂ 等（约 ${r1(S.n2)} mL）` : ''}`]);
        if (n === 1) { done('shake2'); if (!S.demo) { W?.t1.open(); status('红棕色褪去了，活塞又往里走了一段，可针筒里还剩着无色的气体。在左边作答。'); } }
        else status(`红棕色又褪去了：NO 还剩约 ${r1(S.no)} mL${S.n2 > 30 ? '——针筒里越来越多的是空气带进来的 N₂，快装不下了' : ''}。`);
      }
      if (!S.closed && S.shakeE > 0.3 && S.peak > 0.3 && S.w > 0.3 && S.inCycle) {
        log('openShake', ['弹簧夹开着就振荡', '红棕色褪不干净，活塞也不往里走', '管口通着空气：溶掉的气体由外面的空气补上（看蓝点），O₂ 又把 NO 变成 NO₂。要先夹上弹簧夹']);
        once('openShakeS', '弹簧夹还开着：溶掉的气体由管口进来的空气补上，活塞不往里走，红棕色也褪不干净。先点<b>弹簧夹</b>夹上再振荡。');
      }
      if (S.openT > 5 && S.no2 > 0.3 && S.shakeE < 0.1) once('slow', '弹簧夹开着太久了：有毒的 NO₂ 会从管口慢慢跑出来（示意）。吸完空气要<b>立即</b>夹上。');
      if (L_MAX - S.L < 0.0004 && !S.closed && S.o2In > 0.05) once('full', '活塞到 50 mL 刻度了：针筒装满了。');

      // ---- 画面 ----
      syr.position.set(s.pos[0], s.pos[1], 0); syr.rotation.z = s.tilt; syr.setLatex(bendAt(s.pos[1]), s.tilt);
      syr.setL(S.L + S.Loff); syr.clip.setOpen(S.clipK);
      C.update({ w: S.w, Lm: S.L + S.Loff, tilt: s.tilt, sp: { no: S.no, o2: S.o2, n2: S.n2, no2: S.no2 }, mix: S.mix, slosh: S.shakeE, dt, spawn });
      beaker.setLevel(beakLevel());
      // 管口冒出来的气体（推出来的 / 开着时慢慢跑出来的，示意）：NO 一遇空气就变红棕色
      const tp = tipPos(), out = S.leakT > 0 ? 40 : !S.closed && !inWater() && S.no + S.no2 > 0.5 && S.openT > 1.5 ? 1.2 : 0;
      smoke.update(dt, { rate: out, origin: inWater() ? V(BX, beakLevel() + 0.003, 0) : tp.clone().add(V(-0.003, 0.001, 0)), spread: 0.005, up: 0.022, size: out > 5 ? 0.011 : 0.007, life: 2.4 });
      for (let i = BUB.length - 1; i >= 0; i--) { const b = BUB[i]; b.p.y += b.v * dt; b.p.x += (BX - b.p.x) * dt * 0.5; if (b.p.y > beakLevel() - 0.001) BUB.splice(i, 1); }
      BUB.forEach((b, i) => { s4.setScalar(b.r); m4.compose(b.p, q4, s4); bubbles.setMatrixAt(i, m4); }); bubbles.count = BUB.length; bubbles.instanceMatrix.needsUpdate = true;
      bar.near(S.near); mic.update?.(dt);
    };

    return {
      group: root, pointer, card: false, toggles: ['steps'],
      size: { w: 0.31, d: 0.12, h: 0.12 },
      view: { elev: 30, azim: -4, lookY: 0.42, frameMargin: 1.0 },
      mount(ui) {
        const ctx = () => `<div>${S.marks.length ? `吸入空气、夹上后：活塞停在约 ${Math.round(S.marks[0])} mL 刻度；振荡后：气体剩约 ${Math.round(gasV())} mL（NO 约 ${r1(S.no)} mL${S.n2 > 0.5 ? `、N₂ 等约 ${r1(S.n2)} mL` : ''}）` : '还没做完'}</div>`;
        const t3 = think({ q: '上述实验对工业上生产硝酸有什么启示？', options: ['用水吸收 NO₂ 时同时通入足量空气，让生成的 NO 再被氧化成 NO₂、再被吸收，原料利用得更充分', '只要用大量的水吸收 NO₂，就能全部变成硝酸', '应该先把 NO₂ 变回 NO 再吸收'], wrong: ['每 3 份 NO₂ 溶于水总要放出 1 份 NO：水再多，NO 也不会被吸收。', 'NO 不易溶于水：要变成 NO₂ 才能被水吸收。'], ok: '对：工业上就是利用 NO₂ 溶于水生成硝酸的原理，并通入空气使 NO 循环氧化、吸收（课本第 13 页）。', status: (m) => W?.status(m), onOk: () => { done('why'); if (W) W.next.hidden = false; } });
        const t2 = think({ q: '如果要将注射器中的 NO 充分转化，可以采取什么措施？', ctx, options: ['再吸入适量空气（或氧气），夹上后振荡；反复几次', '多振荡一会儿', '多吸一些水'], wrong: ['振荡只能让 NO₂ 溶进水里；没有 O₂，NO 就不再变化。', 'NO 不易溶于水：水多了也不会转化。'], ok: '对：每吸入一次空气，O₂ 把一部分 NO 变成 NO₂，振荡后 NO₂ 溶于水，又放出少量 NO……反复进行，NO 越来越少。可以在“换个条件再试”里自己试几次。', status: (m) => W?.status(m), onOk: () => t3.open() });
        const t1 = think({ q: '实验5-5 中发生了哪些化学反应？', ctx, options: ['2NO + O₂ ══ 2NO₂；3NO₂ + H₂O ══ 2HNO₃ + NO', '2NO + O₂ ══ 2NO₂；NO₂ 全部溶于水，没有气体放出', 'NO 溶于水；NO₂ 不溶于水'], wrong: ['看看记录：振荡后还剩着无色气体——NO₂ 溶于水时放出了 NO。', '吸水、封口振荡时没有变化：NO 不易溶于水；红棕色是振荡后才褪去的。'], ok: '对：NO 与 O₂ 化合成红棕色的 NO₂；NO₂ 溶于水生成硝酸和 NO（课本第 13 页）。', status: (m) => W?.status(m), onOk: () => t2.open() });
        const vary = varyBox('课本问：如果要将注射器中的 NO 充分转化，可以采取什么措施？振荡完以后，再点弹簧夹打开、吸入 10 mL 空气、夹上、振荡……反复几次，看 NO 还剩多少、针筒里越来越多的是什么。也可以吸进多一点或少一点空气，比比颜色深浅。');
        const more = moreBox([['钻进去看', () => mic.open()]], () => A.reset());
        const note = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'), h('p', { class: 'fineprint', html: '注射器 50 mL（内径约 2.9 cm）；刻度读数 = 水 + 气体的体积。气体按同温同压下的体积算（体积比 = 物质的量之比），活塞摩擦不计：夹上弹簧夹时活塞停在里外压强相等的地方。<br>空气按 O₂ 21%、其余 79%（主要是 N₂）算。2NO + O₂ ══ 2NO₂ 几乎立刻完成（示意）；10 mL 空气带进约 2.1 mL O₂，生成约 4.2 mL NO₂，气体少约 2.1 mL。振荡时 NO₂ 几秒内溶完（静置时很慢，示意），每 3 mL NO₂ 放出 1 mL NO：4.2 mL NO₂ → 1.4 mL NO，生成的硝酸约 0.11 mmol（5 mL 水里约 0.02 mol/L）。<br>NO 在水里溶得很少（20 ℃ 约 0.05 体积/体积），不计；2NO₂ ⇌ N₂O₄ 不计（计入的话体积还会小一点）。弹簧夹开着时，气体从管口慢慢跑出来只画示意，量不计。<br>红棕色的深浅按 NO₂ 占气体的比例（示意）。点：每 0.5 mL 一个——淡紫灰 = NO（无色，示意）、蓝 = O₂、灰 = N₂ 等。钻进去看：分子个数按体积比，每 2.1 mL 一个（10 mL 空气里正好 1 个 O₂）；这一小块和针筒别处通着，个数对不上时旁边飘进来、飘走一个；慢放示意，不表示真实的反应步骤。<br>NO、NO₂ 都有毒：课本标了护目镜、排风、洗手。' }));
        const base = mountXuean(ui, { controls: [vary, more, note], headers: ['做了什么', '现象', '说明'], intro: '50 mL 注射器里已经充入 20 mL NO（无色、有毒；淡紫灰的点示意），管口套着乳胶管，用弹簧夹夹着。先把注射器口伸进烧杯的水里，吸入 5 mL 水。' });
        ui.data.append(t1.el, t2.el, t3.el, base.next);
        W = { ...base, ui, t1, t2, t3, status: ui.status }; bar.attach(ui);
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { bar.dispose(); drag.dispose(); mic.dispose?.(); smoke.dispose(); },
      debug: {
        get S() { return S; }, bar, A, syr,
        picks: { syringe: syr.barrelPick, plunger: syr.plungerPick, clip: syr.clipPick },
        qa: qaFlow(drag, [
          { name: '拿到烧杯上', drag: syr.barrelPick, to: () => V(DIP.x + PICK_C, 0.105, 0), wait: 2.5 },
          { name: '打开弹簧夹', tap: syr.clipPick, wait: 0.5 },
          { name: '吸水', drag: syr.plungerPick, to: plungerTo(25), wait: 1 },
          { name: '夹上', tap: syr.clipPick, wait: 3 },
          { name: '振荡 1', run: () => wig(), wait: 1.2 },
          { name: '振荡 1b', run: () => wig(), wait: 1.2 },
          { name: '打开', tap: syr.clipPick, wait: 0.3 },
          { name: '吸空气', drag: syr.plungerPick, to: plungerTo(35), wait: 0.3, scale: 1 },
          { name: '夹上 2', tap: syr.clipPick, wait: 2.5, scale: 1 },
          { name: '钻进去看', run: () => mic.open(), wait: 3 },
          ...[1, 2, 3, 4, 5].map((i) => ({ name: `振荡 2-${i}`, run: () => wig(), wait: 1.2 })),
          { name: '合上', run: () => mic.close(), wait: 2 },
          // 化学计量：O₂ 全部用掉时，吸空气夹上后 = 水 + 20 + N₂；振荡后 = 水 + 20 − 4/3·O₂ + N₂（标准做法 10 mL 空气：32.9 → 30.1 mL 刻度）
          { name: '核对', run: () => { const ok = S.said.shake1 && S.said.air1 && S.said.abs1 && Math.abs(S.marks[0] - (S.w + 20 + S.n2In)) < 0.15 && Math.abs(gasV() - (20 - (4 / 3) * S.o2In + S.n2In)) < 0.15 && S.airCycle > 8 && S.airCycle < 16 && S.lost < 0.01; if (!ok) throw new Error(JSON.stringify({ said: S.said, marks: S.marks, gas: gasV(), w: S.w, no: S.no, no2: S.no2, n2: S.n2, lost: S.lost })); }, wait: 1 },
          { name: '想一想 1', run: () => W.t1.el.querySelector('button').click() },
          { name: '想一想 2', run: () => W.t2.el.querySelector('button').click() },
          { name: '想一想 3', run: () => W.t3.el.querySelector('button').click() },
        ]),
      },
    };
    function wig() { const d = drag.items().find((x) => x.obj === syr.barrelPick), c = local(PICK_C); d.onStart(c.clone()); for (let j = 0; j < 8; j++) d.onDrag(c.clone().add(V(j % 2 ? 0.015 : -0.015, 0, 0))); d.onDrag(c.clone()); d.onEnd(true); }
  },
};
