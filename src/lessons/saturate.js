// 课题2 溶解度 · 实验 9-5、9-6 饱和溶液与结晶（课本下册第 37–38 页图 9-8、9-9、9-10）。
//
// 实验 9-5：在室温下，10 mL 水 + 2 g 氯化钠，搅拌（全溶）；待溶解后，再加 2 g，搅拌（有剩余：饱和）；再加 10 mL 水，搅拌（又全溶：不饱和）。
// 实验 9-6：10 mL 水 + 3 g 硝酸钾，搅拌（全溶）；待溶解后，再加 3 g，搅拌（有剩余）；加热烧杯一段时间（剩余的溶解）；再加 3 g，搅拌（也溶解）；
//   静置冷却（析出针状晶体：结晶）。
// 操作照实：
//   每份固体是事先称好、放在称量纸上的：点一下称量纸，拿起来，在烧杯口上方倾斜，固体倒进去，空纸放回原处。
//   “再加入 10 mL 水”：点一下量筒，拿起来斜着，水倒进烧杯。
//   搅拌：点一下烧杯（或里面的玻璃棒），玻璃棒在杯里转几圈。不搅拌溶得很慢；记录里写“搅拌”的，都是真搅过的。
//   硝酸钾那杯架在三脚架的陶土网上，酒精灯在网下，外焰顶到网的下面；点燃前取下灯帽，停止加热时用灯帽盖灭（kit/labops.js 的 lampCap）。
//   温度计的玻璃泡浸在溶液里（不碰杯底、杯壁）：用小烧杯（10 mL 水深约 1.2 cm）。
// 数据：课本表 9-1 的溶解度（每 100 g 水），按温度插值；10 mL 水按 10 g 计。20 ℃：氯化钠最多溶 3.6 g、硝酸钾 3.16 g；60 ℃ 硝酸钾 11 g。
import * as THREE from 'three';
import { buttons, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { textPlate, thermometer, canvasTex } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { chemBeaker, chemLamp, glassMat, CHEM } from './kit/chem.js';
import { glass2, water2 } from './kit/chemfx.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { lampCap } from './kit/labops.js';
import { sfx } from './kit/audio.js';
import { paint, inked, hull, glassEdge } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const SOL = { NaCl: [35.7, 35.8, 36.0, 36.3, 36.6, 37.0, 37.3, 37.8, 38.4, 39.0, 39.8], KNO3: [13.3, 20.9, 31.6, 45.8, 63.9, 85.5, 110, 138, 169, 202, 246] };
const sol = (k, T) => { const v = SOL[k], x = clamp(T, 0, 100) / 10, i = Math.min(9, Math.floor(x)); return v[i] + (v[i + 1] - v[i]) * (x - i); };
const ROOM = 20, BR = 0.018, BH = 0.05, RI = BR - 0.0012;              // 小烧杯：10 mL 水深约 1.2 cm
const LAMP_S = 0.55, NET_Y = 0.066, FLAME_K = 0.95;                    // 酒精灯缩小到 0.55；陶土网的高度：火焰的外焰刚好顶到网的下面，灯帽取下时也碰不到网
const B = { NaCl: new THREE.Vector3(-0.08, 0, 0), KNO3: new THREE.Vector3(0.05, NET_Y + 0.001, 0) };
const NAME = { NaCl: '氯化钠', KNO3: '硝酸钾' }, ADD = { NaCl: 2, KNO3: 3 };
const PAPER_HOME = {                                                    // 事先称好的药品：每张称量纸上一份（氯化钠 2 份、硝酸钾 3 份）
  NaCl: [new THREE.Vector3(-0.097, 0, 0.052), new THREE.Vector3(-0.067, 0, 0.056)],
  KNO3: [new THREE.Vector3(0.022, 0, 0.062), new THREE.Vector3(0.05, 0, 0.066), new THREE.Vector3(0.078, 0, 0.062)],
};
const CYL = new THREE.Vector3(-0.155, 0, -0.01), CYL_RI = 0.0068, CYL_Y0 = 0.0048, CYL_Y1 = 0.094, CYL_TILT = 2.0;   // 10 mL 量筒（底在原点）；倒水时斜到约 115°
const CAP_OFF = new THREE.Vector3(B.KNO3.x + 0.052, 0, -0.032);       // 灯帽取下后放在三脚架右后方的桌上（从两条腿中间拿出来）
const STIR_T = 2.4, ROD_L = 0.1;                                        // 点一下搅拌多久（秒）；玻璃棒长
const levelOf = (mL) => (mL * 1e-6) / (Math.PI * RI ** 2) * 1.05;
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

export default {
  id: 'saturate',
  fig: '图9-10',
  title: '饱和溶液与结晶',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '在室温下，10 mL 水里能不能无限地溶解氯化钠？',
    hint: '课本第 37 页实验 9-5。',
    options: ['不能，溶到一定量就溶不了了；再加水又能溶', '能，加多少溶多少', '一点也不能溶'],
    answer: 0,
  },
  need: '实验 9-5：10 mL 水里先后加 2 g、2 g 氯化钠，再加 10 mL 水；实验 9-6：10 mL 水里先后加 3 g、3 g 硝酸钾，加热，再加 3 g，冷却',
  conclusion: {
    crops: [{ page: 42, rect: [44, 370, 152, 574] }],
    quote: '在一定温度下，向一定量溶剂里加入某种溶质，当溶质不能继续溶解时，所得到的溶液叫作这种溶质的饱和溶液；还能继续溶解溶质的溶液，叫作这种溶质的不饱和溶液。……过多的硝酸钾会从饱和溶液中以晶体的形式析出，这一过程叫作结晶。',
    why: '溶质不能继续溶解的溶液是<b>饱和溶液</b>，还能继续溶解的是<b>不饱和溶液</b>。<b>增加溶剂</b>或<b>升高温度</b>（对硝酸钾），饱和溶液可以变成不饱和溶液——所以只有指明“在一定量溶剂里”和“在一定温度下”，饱和、不饱和才有确定的意义。<br>热的硝酸钾溶液冷却，溶解度变小，过多的硝酸钾以晶体的形式析出——<b>结晶</b>。',
    src: '课本下册第 37–38 页 · 第九单元 课题2 溶解度（实验 9-5、9-6）；溶解度数据：表 9-1',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); else bar.caption(m); };     // 现象（演示里当字幕）
    const tell = (m) => { if (!S.demo) W?.status(m); };                              // 下一步做什么（只给学生）
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };

    paperSheet(group, { w: 0.34, d: 0.2, x: -0.03, z: 0.02 });

    // ================= 三脚架 + 陶土网（硝酸钾那杯），网下的酒精灯 =================
    const tri = new THREE.Group(); tri.position.set(B.KNO3.x, 0, B.KNO3.z); group.add(tri);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.5; const leg = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, NET_Y, 8), paint(0x5f6773)), 0.0005); leg.position.set(Math.cos(a) * 0.03, NET_Y / 2, Math.sin(a) * 0.03); tri.add(leg); }
    const ring = hull(new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0018, 6, 30), paint(0x5f6773)), 0.0005); ring.rotation.x = Math.PI / 2; ring.position.y = NET_Y - 0.002; tri.add(ring);
    const net = inked(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.002, 0.07), paint(0xd8d4cc)), { width: 0.5 }); net.position.y = NET_Y; tri.add(net);
    const lamp = chemLamp(); lamp.scale.setScalar(LAMP_S); lamp.position.set(B.KNO3.x, 0, B.KNO3.z); group.add(lamp);
    const lampPick = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), new THREE.MeshBasicMaterial({ visible: false })); lampPick.position.y = 0.04; lampPick.userData.pick = true; lamp.add(lampPick);
    const capper = lampCap(group, lamp, { off: CAP_OFF }); lamp.flame.setSize(FLAME_K);

    // ================= 两个烧杯（各 10 mL 水）、温度计、玻璃棒 =================
    const parts = {};
    for (const k of ['NaCl', 'KNO3']) {
      const bk = chemBeaker({ r: BR, h: BH, level: 0, color: CHEM.water, marks: true }); bk.position.copy(B[k]); group.add(bk);
      const heap = inked(new THREE.Mesh(new THREE.SphereGeometry(0.012, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xf6f6f2)), { width: 0.4 }); heap.scale.y = 0.35; heap.position.copy(B[k]).add(V3(-0.003, 0.0015, 0.003)); heap.visible = false; group.add(heap);
      const needles = new THREE.Group(); needles.position.copy(B[k]).add(V3(0, 0.0015, 0)); group.add(needles);
      if (k === 'KNO3') for (let i = 0; i < 60; i++) { const L = 0.004 + Math.random() * 0.008; const n = new THREE.Mesh(new THREE.BoxGeometry(0.001, L, 0.001), paint(0xf6f6f2)); n.geometry.translate(0, L / 2, 0); const r = Math.sqrt(Math.random()) * 0.0125, a = Math.random() * 6.28; n.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); n.rotation.set((Math.random() - 0.5) * 1.4, Math.random() * 6, (Math.random() - 0.5) * 1.4); n.userData.k = Math.random(); needles.add(n); }
      const lab = textPlate(`${NAME[k]}（实验 ${k === 'NaCl' ? '9-5' : '9-6'}）`, { w: 0.033, h: 0.0062, color: '#23293a', bg: '#fffaf0', font: 'bold 70px "Songti SC", serif' }); lab.position.set(B[k].x, B[k].y + 0.038, BR + 0.0015); group.add(lab);
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(BR + 0.003, BR + 0.003, BH, 12), new THREE.MeshBasicMaterial({ visible: false })); pick.position.set(0, BH / 2, 0); pick.userData.pick = true; bk.add(pick);
      // 温度计：玻璃泡浸在溶液里（离杯底约 0.7 mm、液面下约 1 mm），管子斜靠在右边的杯口上
      const th = thermometer({ min: 0, max: 100, length: 0.24 }); th.scale.setScalar(0.45); th.position.copy(B[k]).add(V3(0.006, 0.0063, -0.006)); th.rotation.z = -0.224; group.add(th);
      th.children[1].material = paint(0xd8342a, { keep: true }); th.children[0].material = glass2({ base: 0.06, rim: 0.5, band: 0.5 }); th.children[0].renderOrder = 9;
      // 玻璃棒（原点在下端）：平时斜靠在左后方的杯口上；搅拌时竖起来一点，下端在杯底转圈（不碰温度计）
      const rod = new THREE.Group(); group.add(rod);
      const rodM = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, ROD_L, 10), paint(0xe8f2f6, { transparent: true, opacity: 0.85 })), { width: 0.5 }); rodM.geometry.translate(0, ROD_L / 2, 0); rod.add(rodM);
      const rodPick = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, ROD_L, 8), new THREE.MeshBasicMaterial({ visible: false })); rodPick.position.y = ROD_L / 2; rodPick.userData.pick = true; rod.add(rodPick);
      parts[k] = { bk, heap, needles, pick, th, rod, rodPick, card: tag('', 'cond') };
      parts[k].card.px = [0, -80];
    }
    const LEAN = new THREE.Vector2(-0.35, -0.94).normalize(), UP = V3(0, 1, 0);
    // 搅拌：手捏着上端，下端在杯底转圈（上端几乎不动）
    const ROD_C = V3(-0.002, 0.0024, 0.003), ROD_TOP = ROD_C.clone().add(V3(LEAN.x * Math.sin(0.15), Math.cos(0.15), LEAN.y * Math.sin(0.15)).multiplyScalar(ROD_L));
    const poseRod = (k) => {
      const Bk = S.b[k], u = ease(Bk.u), pt = parts[k];
      const rest = V3(0.003, 0.0018, 0.004), stir = ROD_C.clone().add(V3(Math.cos(Bk.ph) * 0.004, 0, Math.sin(Bk.ph) * 0.004));
      const dRest = V3(LEAN.x * Math.sin(0.412), Math.cos(0.412), LEAN.y * Math.sin(0.412)), dStir = ROD_TOP.clone().sub(stir).normalize();      // 斜靠在杯口上 0.41 rad
      pt.rod.position.copy(B[k]).add(rest.lerp(stir, u));
      pt.rod.quaternion.setFromUnitVectors(UP, dRest.lerp(dStir, u).normalize());
    };

    // ================= 称量纸（每张一份事先称好的药品）、药品标签 =================
    const papers = { NaCl: [], KNO3: [] };
    for (const k of ['NaCl', 'KNO3']) {
      PAPER_HOME[k].forEach((home) => {
        const g = new THREE.Group(); g.position.copy(home); group.add(g);
        const sheet = inked(new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.0005, 0.024), paint(0xfdfdfa)), { width: 0.4 }); sheet.position.y = 0.00025; g.add(sheet);
        const hp = inked(new THREE.Mesh(new THREE.SphereGeometry(k === 'NaCl' ? 0.0062 : 0.007, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xf1f0ea)), { width: 0.4 }); hp.scale.y = 0.45; hp.position.y = 0.0005; g.add(hp);
        const pick = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.014, 0.028), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 0.006; pick.userData.pick = true; g.add(pick);
        papers[k].push({ g, hp, pick, home: home.clone() });
      });
      const c = PAPER_HOME[k].reduce((s, p) => s.add(p), V3(0, 0, 0)).multiplyScalar(1 / PAPER_HOME[k].length);
      const lab = textPlate(`${NAME[k]}（每份 ${ADD[k]} g）`, { w: 0.036, h: 0.0068, color: '#23293a', bg: '#fffaf0', font: 'bold 66px "Songti SC", serif' }); lab.position.set(c.x, 0.004, c.z + 0.024); lab.rotation.x = -0.5; group.add(lab);
    }

    // ================= 10 mL 量筒（盛着 10 mL 水，实验 9-5 用） =================
    const cyl = new THREE.Group(); cyl.position.copy(CYL); group.add(cyl);
    const ML = (v) => CYL_Y0 + (v * 1e-6) / (Math.PI * CYL_RI ** 2);
    { const foot = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.013, 0.004, 22), paint(0xe9edf0)), { width: 0.6 }); foot.position.y = 0.002; cyl.add(foot);
      const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, CYL_Y1 - 0.004, 22, 1, true), glassMat({ opacity: 0.25 })); gl.position.y = 0.004 + (CYL_Y1 - 0.004) / 2; gl.renderOrder = 9; glassEdge(gl, 0.0006); cyl.add(gl);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.0078, 0.0006, 6, 24), glassMat({ opacity: 0.35 })); lip.rotation.x = Math.PI / 2; lip.position.y = CYL_Y1; cyl.add(lip);
      const H = CYL_Y1 - 0.004;
      const mk = canvasTex(64, 1024, (g, Wc, Hc) => { g.strokeStyle = '#23293a'; g.fillStyle = '#23293a'; g.font = 'bold 34px sans-serif'; for (let v = 0; v <= 11; v++) { const y = Hc - ((ML(v) - 0.004) / H) * Hc; g.lineWidth = v % 5 ? 2.5 : 4; g.beginPath(); g.moveTo(0, y); g.lineTo(v % 5 ? 16 : 28, y); g.stroke(); if (v === 5 || v === 10) g.fillText(String(v), 30, y + 12); } });
      const ticks = new THREE.Mesh(new THREE.PlaneGeometry(0.006, H), new THREE.MeshBasicMaterial({ map: mk, transparent: true, depthWrite: false })); ticks.position.set(0.0012, 0.004 + H / 2, 0.0077); ticks.renderOrder = 10; cyl.add(ticks); }
    const cut = new THREE.Plane(V3(0, -1, 0), 0);                          // 世界坐标里的水面：量筒斜过来时水还在下面
    const cWm = water2({ color: CHEM.water }); cWm.clippingPlanes = [cut];
    const cLiq = new THREE.Mesh(new THREE.CylinderGeometry(CYL_RI - 0.0003, CYL_RI - 0.0003, CYL_Y1 - CYL_Y0 - 0.001, 18), cWm); cLiq.position.y = (CYL_Y0 + CYL_Y1 - 0.001) / 2; cLiq.renderOrder = 7; cyl.add(cLiq);
    const cylPick = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, CYL_Y1, 10), new THREE.MeshBasicMaterial({ visible: false })); cylPick.position.y = CYL_Y1 / 2; cylPick.userData.pick = true; cyl.add(cylPick);
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0011, 1, 8), water2({ color: CHEM.water, base: 0.5 })); stream.geometry.translate(0, -0.5, 0); stream.renderOrder = 8; stream.visible = false; group.add(stream);
    const grains = new Particles({ max: 160, geometry: new THREE.DodecahedronGeometry(1, 0), material: paint(0xdedcd4) }); group.add(grains.mesh);      // 倒下去的固体颗粒（比纸稍灰一点，看得出来）

    // ================= 状态 =================
    const freshB = () => ({ water: 10, added: 0, dis: 0, T: ROOM, stirT: 0, u: 0, ph: 0, stirred: false, pend: null });
    const fresh = () => ({ demo: false, b: { NaCl: freshB(), KNO3: freshB() }, used: { NaCl: [false, false], KNO3: [false, false, false] }, anim: null, cylWater: 10, cylUsed: false, lit: false, nStage: 0, kStage: 0, cooling: false, cooled: false });
    S = fresh();
    const cap = (k) => sol(k, S.b[k].T) * S.b[k].water / 100;
    const nextPaper = (k) => S.used[k].indexOf(false);
    // 课本的顺序：待溶解后再加下一份；硝酸钾第三份在加热以后。还没轮到的称量纸点不动
    const avail = (k, i) => !S.anim && nextPaper(k) === i && (i === 0 || (k === 'NaCl' ? S.nStage >= 1 : i === 1 ? S.kStage >= 1 : S.kStage >= 3));
    const cylAvail = () => !S.anim && !S.cylUsed && S.nStage >= 2;

    const A = {
      paper(k, i) { if (!avail(k, i)) return; S.used[k][i] = true; S.anim = { kind: 'paper', k, i, t: 0, added: false }; sfx.clink({ freq: 2000, gain: 0.02 }); },
      water() { if (!cylAvail()) return; S.cylUsed = true; S.anim = { kind: 'cyl', k: 'NaCl', t: 0, added: false, emptyT: null }; sfx.clink({ freq: 1200, gain: 0.03 }); },
      stir(k) { if (S.anim?.kind === 'cyl' && k === 'NaCl') return; const Bk = S.b[k]; Bk.stirT = Math.max(Bk.stirT, STIR_T); sfx.clink({ freq: 1600, gain: 0.015 }); },
      lamp() {
        if (!S.lit) {
          if (S.kStage < 2) return status('先加两次 3 g 硝酸钾，等有剩余固体不再溶解时再加热。');
          S.lit = true; if (S.kStage === 2) S.b.KNO3.pend = '加热烧杯';
          status('点燃酒精灯，加热烧杯一段时间。看剩下的硝酸钾。');
        } else {
          S.lit = false;
          if (S.kStage >= 4) { S.cooling = true; status('停止加热：用灯帽盖灭酒精灯。<b>静置</b>，等溶液冷却……'); } else status('用灯帽盖灭了酒精灯。');
        }
      },
      reset() { S = fresh(); grains.clear(); capper.snap(false); stream.visible = false; W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; } bar.undo('n1', 'n2', 'n3', 'k1', 'k2', 'k3', 'k4', 'k5', 'why'); status('全部重新摆好了，记录也清空了。'); },
    };
    // 固体倒进烧杯以后（称量纸倒完那一下）
    const addSolid = (k) => {
      const Bk = S.b[k], n = S.used[k].filter(Boolean).length;
      Bk.added += ADD[k]; Bk.stirred = false; Bk.pend = n === 1 ? `加入 ${ADD[k]} g ${NAME[k]}，搅拌` : `再加入 ${ADD[k]} g ${NAME[k]}，搅拌`;
      tell(`加入了 ${ADD[k]} g ${NAME[k]}。点一下烧杯：用<b>玻璃棒</b>搅拌。`);
    };

    const drag = draggable(group, [], { taps: [
      ...['NaCl', 'KNO3'].flatMap((k) => [
        ...papers[k].map((p, i) => ({ obj: p.pick, enabled: () => avail(k, i), hint: () => (avail(k, i) ? `点一下：把称量纸上的 ${ADD[k]} g ${NAME[k]}倒进烧杯` : ''), onTap: () => A.paper(k, i) })),
        { obj: parts[k].pick, hint: '点一下：用玻璃棒搅拌', onTap: () => A.stir(k) },
        { obj: parts[k].rodPick, hint: '点一下：用玻璃棒搅拌', onTap: () => A.stir(k) },
      ]),
      { obj: cylPick, enabled: () => cylAvail(), hint: () => (cylAvail() ? '点一下：用量筒往氯化钠那杯里加 10 mL 水' : ''), onTap: () => A.water() },
      { obj: lampPick, hint: () => (S.lit ? '点一下：盖上灯帽，停止加热' : '点一下：取下灯帽，点燃酒精灯，加热硝酸钾那杯'), onTap: () => A.lamp() },
    ], tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const P = (k) => parts[k];
    const paperOf = (k, i) => papers[k][i].pick;

    // ================= 拿起称量纸倒进烧杯、拿起量筒倒水（按时间走的一套动作，演示里也一样） =================
    const tmpV = V3(0, 0, 0);
    const animStep = (h) => {
      const a = S.anim;
      for (const k of ['NaCl', 'KNO3']) papers[k].forEach((p, i) => {
        if (a && a.kind === 'paper' && a.k === k && a.i === i) return;
        p.g.position.copy(p.home); p.g.rotation.set(0, 0, 0); p.hp.visible = !S.used[k][i]; p.hp.scale.set(1, 0.45, 1); p.hp.position.set(0, 0.0005, 0);
      });
      if (!a || a.kind !== 'cyl') { cyl.position.copy(CYL); cyl.rotation.set(0, 0, 0); stream.visible = false; }
      if (!a) return;
      a.t += h;
      const t = a.t, seg = (t0, t1) => ease((t - t0) / (t1 - t0));
      if (a.kind === 'paper') {
        // 抬起来 → 平移到烧杯左边的上方 → 移到杯口左上方、慢慢倾斜（靠烧杯的那条边朝下）→ 固体滑进烧杯 → 放平 → 原路放回原处
        // （从侧面倒：前面看得见纸面上的固体滑下去；玻璃棒靠在左后方、温度计靠在右边，都让得开）
        const p = papers[a.k][a.i], b = B[a.k], rim = b.y + BH;
        const PL = p.home.clone().setY(rim + 0.024), PA = V3(b.x - 0.024, rim + 0.024, b.z), PC = V3(b.x - 0.013, rim + 0.016, b.z);
        let pos, tilt = 0;
        if (t < 0.4) pos = p.home.clone().lerp(PL, seg(0, 0.4));
        else if (t < 0.9) pos = PL.clone().lerp(PA, seg(0.4, 0.9));
        else if (t < 1.2) { pos = PA.clone().lerp(PC, seg(0.9, 1.2)); tilt = 0.45 * seg(0.9, 1.2); }
        else if (t < 1.9) { pos = PC.clone(); tilt = 0.45 + 0.5 * seg(1.2, 1.6); }
        else if (t < 2.2) { pos = PC.clone().lerp(PA, seg(1.9, 2.2)); tilt = 0.95 * (1 - seg(1.9, 2.2)); }
        else if (t < 2.7) pos = PA.clone().lerp(PL, seg(2.2, 2.7));
        else pos = PL.clone().lerp(p.home, seg(2.7, 3.0));
        p.g.position.copy(pos); p.g.rotation.set(0, 0, -tilt);
        const f = 1 - seg(1.2, 1.55);
        p.hp.visible = f > 0.03; p.hp.scale.set(Math.max(0.01, f), 0.45 * Math.max(0.01, f), Math.max(0.01, f)); p.hp.position.set(0.007 * (1 - f), 0.0005, 0);
        if (t > 1.22 && t < 1.62) for (let j = 0; j < 3; j++) if (Math.random() < h * 90) {
          p.g.updateMatrixWorld(true);
          const e = group.worldToLocal(p.g.localToWorld(tmpV.set(0.012, 0.001, (Math.random() - 0.5) * 0.012)));
          grains.spawn({ p: e.clone(), v: V3(0.006, -0.01, (Math.random() - 0.5) * 0.004), size: 0.0012 + Math.random() * 0.0007, life: 1.2, yk: b.y + 0.003 });
        }
        if (!a.added && t >= 1.5) { a.added = true; addSolid(a.k); }
        if (t >= 3.0) S.anim = null;
      } else {
        // 量筒：竖着抬起来，挪到烧杯左边（杯口在烧杯口左上方）→ 绕杯口斜过来，杯口挨着烧杯口，水倒进去 → 倒完放回原处
        const Hm = CYL_Y1, b = B.NaCl;
        const M0 = V3(b.x - BR - 0.012, BH + 0.07, b.z), M1 = V3(b.x - BR + 0.006, BH + 0.012, b.z);
        const BA = M0.clone().setY(M0.y - Hm), LIFT = CYL.clone().setY(BA.y);
        const dir = (th) => V3(Math.sin(th), Math.cos(th), 0);
        if (S.cylWater <= 0.01 && a.emptyT == null) a.emptyT = t;
        const tHold = a.emptyT == null ? Infinity : Math.max(2.1, a.emptyT + 0.3);
        let base, th = 0;
        if (t < 0.35) base = CYL.clone().lerp(LIFT, seg(0, 0.35));
        else if (t < 0.9) base = LIFT.clone().lerp(BA, seg(0.35, 0.9));
        else if (t < 1.7) { const s = seg(0.9, 1.7); th = CYL_TILT * s; base = M0.clone().lerp(M1, ease(s)).sub(dir(th).multiplyScalar(Hm)); }
        else if (t < tHold) { th = CYL_TILT; base = M1.clone().sub(dir(th).multiplyScalar(Hm)); }
        else if (t < tHold + 0.8) { const s = 1 - ((t - tHold) / 0.8); const e = ease(s); th = CYL_TILT * e; base = M0.clone().lerp(M1, ease(e)).sub(dir(th).multiplyScalar(Hm)); }
        else if (t < tHold + 1.35) base = BA.clone().lerp(LIFT, seg(tHold + 0.8, tHold + 1.35));
        else base = LIFT.clone().lerp(CYL, seg(tHold + 1.35, tHold + 1.7));
        cyl.position.copy(base); cyl.rotation.set(0, 0, -th);
        // 倾斜到水面碰到杯口才往外倒
        const L = (S.cylWater * 1e-6) / (Math.PI * CYL_RI ** 2), spill = Math.atan2(CYL_Y1 - CYL_Y0 - L, CYL_RI);
        const flowing = th > spill && S.cylWater > 0.01;
        if (flowing) { const dv = Math.min(S.cylWater, 9 * h); S.cylWater -= dv; S.b.NaCl.water += dv; }
        if (S.cylWater <= 0.01 && !a.added) { a.added = true; S.cylWater = 0; const Bk = S.b.NaCl; Bk.water = 20; Bk.stirred = false; Bk.pend = '再加入 10 mL 水，搅拌'; tell('加入了 10 mL 水。点一下烧杯：用<b>玻璃棒</b>搅拌。'); }
        stream.visible = flowing;
        if (flowing) { cyl.updateMatrixWorld(true); const lip = group.worldToLocal(cyl.localToWorld(tmpV.set(CYL_RI + 0.0006, CYL_Y1, 0))); stream.position.copy(lip); stream.scale.y = Math.max(0.001, lip.y - (b.y + levelOf(S.b.NaCl.water))); }
        if (t >= tHold + 1.7) S.anim = null;
      }
    };
    // 量筒里的水面（世界坐标里的水平面）：没倒的时候水在下面；倒的时候水面在杯口
    const cylWater = () => {
      cLiq.visible = S.cylWater > 0.05;
      if (!cLiq.visible) return;
      cyl.updateMatrixWorld(true);
      const th = -cyl.rotation.z, L = (S.cylWater * 1e-6) / (Math.PI * CYL_RI ** 2), spill = Math.atan2(CYL_Y1 - CYL_Y0 - L, CYL_RI);
      cut.constant = cyl.localToWorld(th < spill ? tmpV.set(0, CYL_Y0 + L, 0) : tmpV.set(CYL_RI, CYL_Y1, 0)).y;
    };

    const camN = [[B.NaCl.x - 0.01, 0.04, 0.012], [0.05, 0.3, 1], 0.27], camK = [[B.KNO3.x, 0.072, 0.02], [0.05, 0.3, 1], 0.4];      // 镜头里有烧杯、网下的酒精灯和前面的称量纸
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'n1', title: '9-5：加 2 g 氯化钠', todo: '点一下<b>称量纸</b>，把称好的 2 g 氯化钠倒进左边的烧杯；再点烧杯，用<b>玻璃棒</b>搅拌。', target: () => (S.used.NaCl[0] ? P('NaCl').bk : papers.NaCl[0].g) },
        { id: 'n2', title: '再加 2 g', todo: '待溶解后，再倒入第二份 2 g 氯化钠，搅拌，看有没有剩余。', target: () => (S.used.NaCl[1] ? P('NaCl').bk : papers.NaCl[1].g) },
        { id: 'n3', title: '再加 10 mL 水', todo: '点一下<b>量筒</b>，再加入 10 mL 水，搅拌。', target: () => (S.cylUsed ? P('NaCl').bk : cyl) },
        { id: 'k1', title: '9-6：加 3 g 硝酸钾', todo: '把称好的 3 g <b>硝酸钾</b>倒进右边的烧杯，搅拌。', target: () => (S.used.KNO3[0] ? P('KNO3').bk : papers.KNO3[0].g) },
        { id: 'k2', title: '再加 3 g', todo: '待溶解后，再倒入 3 g 硝酸钾，搅拌。', target: () => (S.used.KNO3[1] ? P('KNO3').bk : papers.KNO3[1].g) },
        { id: 'k3', title: '加热', todo: '有剩余固体不再溶解时，点<b>酒精灯</b>：取下灯帽，点燃，加热烧杯一段时间。', target: () => (S.lit ? null : lamp) },
        { id: 'k4', title: '再加 3 g', todo: '再倒入 3 g 硝酸钾，搅拌。', target: () => (S.used.KNO3[2] ? P('KNO3').bk : papers.KNO3[2].g) },
        { id: 'k5', title: '静置冷却', todo: '点酒精灯，盖上灯帽，<b>停止加热</b>；静置，等溶液冷却。', target: () => (S.lit ? lamp : null) },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { grains.clear(); capper.snap(S.lit); stream.visible = false; } }),
          // 每个动作都真的做：称量纸拿起来倒、玻璃棒在杯里搅、量筒倒水、取下灯帽点燃、盖灭（拿、倒、搅的那一会儿按真实速度放）
          shots: [
            { cap: '实验 9-5：在室温下，向盛有 10 mL 水的烧杯中加入 2 g 氯化钠（事先称好，放在称量纸上），用玻璃棒搅拌。', dur: 6.5, cam: camN, get speed() { return S.anim ? 1 : 1.5; },
              during: act.seq(act.tap(paperOf('NaCl', 0), 0.04), act.tap(P('NaCl').pick, 0.42)) },
            { cap: '待溶解后，再加入 2 g 氯化钠，搅拌。', dur: 6.5, cam: camN, get speed() { return S.anim ? 1 : 1.5; },
              during: act.seq(act.tap(paperOf('NaCl', 1), 0.04), act.tap(P('NaCl').pick, 0.42)) },
            { cap: '然后再加入 10 mL 水，搅拌，观察现象。', dur: 8.5, cam: [[B.NaCl.x - 0.035, 0.05, 0.005], [0.05, 0.28, 1], 0.32], get speed() { return S.anim ? 1 : 1.5; },
              during: act.seq(act.tap(cylPick, 0.03), act.tap(P('NaCl').pick, 0.6)) },
            { cap: '实验 9-6：在室温下，向盛有 10 mL 水的烧杯中加入 3 g 硝酸钾，搅拌；待溶解后，再加入 3 g，搅拌。', dur: 11, cam: camK, get speed() { return S.anim ? 1 : 1.5; },
              during: act.seq(act.tap(paperOf('KNO3', 0), 0.03), act.tap(P('KNO3').pick, 0.23), act.tap(paperOf('KNO3', 1), 0.5), act.tap(P('KNO3').pick, 0.7)) },
            { cap: '有剩余固体不再溶解时，点燃酒精灯，加热烧杯一段时间。然后再加入 3 g 硝酸钾，搅拌。', dur: 10, cam: camK, get speed() { return S.anim || capper.k < 1 ? 1 : 3; },
              during: act.seq(act.tap(lampPick, 0.03), act.tap(paperOf('KNO3', 2), 0.42), act.tap(P('KNO3').pick, 0.66)) },
            { cap: '停止加热，静置冷却：烧杯底部析出了针状的硝酸钾晶体——结晶。演示完了，下面换你自己做。', dur: 8, cam: camK, get speed() { return kNow > 0.2 ? 4 : 1; },
              during: (k) => { kNow = k; offLamp(k); } },
          ],
        },
      },
    });
    let kNow = 0; const offLamp = act.tap(lampPick, 0.03);
    const pointer = wrapPointer(drag, bar);

    const step = (h) => {
      // 酒精灯：灯帽取下了火才亮，盖上了火才灭；硝酸钾那杯的温度
      const flameOn = capper.update(h, S.lit); lamp.flame.setOn(flameOn); lamp.flame.update(performance.now() / 1000);
      const K = S.b.KNO3; K.T += ((flameOn ? 70 : ROOM) - K.T) * Math.min(1, h * (flameOn ? 0.25 : 0.12));
      animStep(h); cylWater();
      grains.update(h, (p, d) => { p.v.y -= 0.5 * d; p.p.addScaledVector(p.v, d); return p.p.y > p.yk; });
      for (const k of ['NaCl', 'KNO3']) {
        const Bk = S.b[k], pt = parts[k];
        // 玻璃棒：点一下搅 STIR_T 秒
        Bk.stirT = Math.max(0, Bk.stirT - h);
        Bk.u = clamp(Bk.u + (Bk.stirT > 0 ? h / 0.25 : -h / 0.3), 0, 1);
        if (Bk.u > 0) Bk.ph += h * Math.PI * 2 * 1.4;
        poseRod(k);
        const stirring = Bk.stirT > 0 && Bk.u > 0.6, adding = S.anim && S.anim.k === k && !S.anim.added;
        if (stirring && !adding) Bk.stirred = true;       // 加进去以后真的搅过
        // 溶解 / 析出：搅拌时快；不搅拌很慢（加热时有对流，快一些）
        const c = cap(k), target = Math.min(Bk.added, c);
        const conv = k === 'KNO3' && flameOn && Bk.T > ROOM + 8;
        const rate = target > Bk.dis ? (stirring ? 2.8 : conv ? 0.8 : 0.025) : (stirring ? 0.6 : 0.25);
        Bk.dis += (target - Bk.dis) * Math.min(1, h * rate);
        const left = Bk.added - Bk.dis;
        pt.bk.setLevel(levelOf(Bk.water));
        pt.th.setTemp(Bk.T);
        const crys = k === 'KNO3' && S.cooling;
        pt.heap.visible = left > 0.08 && !crys; pt.heap.scale.setScalar(Math.max(0.3, Math.cbrt(left / 2))); pt.heap.scale.y *= 0.35;
        pt.needles.children.forEach((n) => { n.visible = crys && n.userData.k < left / 6; });
        // 记录：搅拌完（加热的那一步：热了一段时间）、溶解停下来以后记一行
        if (Bk.pend && Math.abs(Bk.dis - target) < 0.03 && (Bk.pend === '加热烧杯' ? Bk.T > 55 : Bk.stirred && Bk.stirT === 0)) {
          const all = left < 0.08, txt = Bk.pend, heat = txt === '加热烧杯'; Bk.pend = null;
          log([txt, all ? (heat ? '剩余的硝酸钾<b>全部溶解</b>了' : '<b>全部溶解</b>') : '有固体<b>剩余</b>，不再溶解', all ? '不饱和溶液（还能再溶）' : '<b>饱和溶液</b>']);
          status(heat ? '加热一段时间以后，剩余的硝酸钾<b>全部溶解</b>了。' : `${NAME[k]}：${all ? '全部溶解了' : '有剩余，不再溶解——<b>饱和</b>了'}。`);
          const id = k === 'NaCl' ? ['n1', 'n2', 'n3'][S.nStage++] : ['k1', 'k2', 'k3', 'k4'][S.kStage++];
          if (id) done(id);
        }
        if (crys && Bk.T < 25 && !S.cooled) { S.cooled = true; done('k5'); log(['静置，冷却', `烧杯底部析出<b>针状晶体</b>（约 ${left.toFixed(1)} g）`, '温度降低，溶解度变小：<b>结晶</b>']); status('冷却后，烧杯底部析出了针状的硝酸钾晶体——<b>结晶</b>。'); W?.t1.open(); }
        pt.card.text(`<div class="cc"><div class="cc-t"><span class="cc-name">${NAME[k]} · ${Math.round(Bk.water)} mL 水 · ${Bk.T.toFixed(0)} ℃</span>${Bk.added && left > 0.08 && Bk.dis > c - 0.05 ? '<span class="cc-res">饱和</span>' : ''}</div><div class="cc-more"><div class="cc-obs"><small>加了 ${Bk.added} g，最多能溶 ${c.toFixed(1)} g</small></div></div></div>`).loc(group, B[k].x, B[k].y + BH, 0).show(true);
      }
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.3, d: 0.16, h: 0.18 },
      view: { elev: 20, azim: -4, lookY: 0.4, frameMargin: 1.08 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = () => [...W.tbl.el.querySelectorAll('tbody tr')].map((tr) => `<div>${tr.children[0].innerHTML}：${tr.children[1].innerHTML}</div>`).join('');
        const t2 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '热的硝酸钾溶液冷却后为什么会析出晶体？',
          options: ['温度降低，硝酸钾的溶解度变小，溶不下的硝酸钾以晶体析出', '水蒸发掉了', '加热时生成了新物质'],
          wrong: ['静置这一会儿，水几乎没少。', '硝酸钾溶解、析出都是物理变化。'],
          ok: '对：这一过程叫<b>结晶</b>。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); } });
        const t1 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '怎样能使饱和溶液变成不饱和溶液？',
          options: ['增加溶剂，或升高温度（对硝酸钾）', '再加溶质', '用玻璃棒多搅拌'],
          wrong: ['饱和溶液里再加溶质，溶不了。', '搅拌只能让它溶得快，不能溶得多。'],
          ok: '对：所以说“饱和”“不饱和”要指明<b>一定量溶剂</b>和<b>一定温度</b>。',
          onOk: () => t2.open() });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['实验内容', '现象', '分析']);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：溶解度用课本表 9-1 的数据；10 mL 水按 10 g 计；加热、冷却的快慢是示意。' });
        ui.controls.append(t1.el, t2.el, next, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, t1, t2, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('左边的烧杯（10 mL 水）做实验 9-5（氯化钠）；右边架在三脚架陶土网上的烧杯（10 mL 水）做实验 9-6（硝酸钾）。烧杯前面的称量纸上是事先称好的药品，一张一份。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { bar.dispose(); grains.dispose(); },
      debug: { get S() { return S; }, A, bar, picks: { n0: paperOf('NaCl', 0), n1: paperOf('NaCl', 1), k0: paperOf('KNO3', 0), k1: paperOf('KNO3', 1), k2: paperOf('KNO3', 2), cyl: cylPick, lamp: lampPick, bkN: P('NaCl').pick, bkK: P('KNO3').pick, rodN: P('NaCl').rodPick, rodK: P('KNO3').rodPick },
        qa: qaFlow(drag, [
          { name: '倒入 2 g 氯化钠', tap: paperOf('NaCl', 0), wait: 3 }, { name: '搅拌 1', tap: P('NaCl').pick, wait: 3 },
          { name: '再倒入 2 g', tap: paperOf('NaCl', 1), wait: 3 }, { name: '搅拌 2', tap: P('NaCl').pick, wait: 3 },
          { name: '量筒加水', tap: cylPick, wait: 5 }, { name: '搅拌 3', tap: P('NaCl').pick, wait: 3 },
          { name: '倒入 3 g 硝酸钾', tap: paperOf('KNO3', 0), wait: 3 }, { name: '搅拌 4', tap: P('KNO3').pick, wait: 3 },
          { name: '再倒入 3 g', tap: paperOf('KNO3', 1), wait: 3 }, { name: '搅拌 5', tap: P('KNO3').pick, wait: 3 },
          { name: '点燃酒精灯，加热', tap: lampPick, wait: 14 },
          { name: '再倒入 3 g（热）', tap: paperOf('KNO3', 2), wait: 3 }, { name: '搅拌 6', tap: P('KNO3').pick, wait: 3 },
          { name: '盖灭酒精灯，静置冷却', tap: lampPick, wait: 30 },
          { name: '答第一题', run: () => W.t1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.t2.el.querySelector('button').click() },
        ]) },
    };
  },
};
