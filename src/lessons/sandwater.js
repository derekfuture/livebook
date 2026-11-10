// 第四章 第二节 气温的变化与分布 · 活动：用模拟实验解释海洋和陆地气温变化的差异（课本七年级上册第 78 页图 4.16）。
//
// 课本的三步：
//   (1) 用相同的烧杯分别取相同质量的水和沙（电子秤上各称 200 g），在室内阴凉处放置一段时间；
//   (2) 分别测量并记录水和沙的温度（两支温度计用夹子夹在杯口，插入的深度相同），然后把杯子放到阳光下；
//   (3) 2 小时后再分别测量、记录。
// 再算变化幅度，用水、沙类比海洋、陆地，解释 1 月、7 月同纬度海陆气温的差异；最后对照真实数据：同在北纬 49.9° 的
// 温尼伯（加拿大，大陆内部）和锡利群岛（英国，大西洋中的小岛），1991—2020 年平均。
// 模型（近似，面板说明里写明）：每杯 dT/dt = (吸收的阳光 − K·(T − 气温)) / (m·c)。
//   水 c = 4.2 J/(g·℃)，干沙 c ≈ 0.84 J/(g·℃)；晴天正午阳光约 700 W/m²，杯口约 36 cm²；沙吸收约 65%，水约 36%（大部分阳光透过水）；
//   K：沙 0.11 W/℃，水 0.2 W/℃（多了蒸发）；屋里 21 ℃，阳光下的空气 24 ℃。→ 2 小时后沙升高约 17 ℃，水约 6 ℃。
import * as THREE from 'three';
import { table, buttons } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { textPlate, thermometer, canvasTex, glowTexture } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { chemBeaker, CHEM } from './kit/chem.js';
import { water2 } from './kit/chemfx.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked, hull } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const ROOM = 21, AIR_SUN = 24, M = 200;                     // ℃、℃、g
const MAT = {
  water: { c: 4.2, Psun: 0.9, Kshade: 0.46, Ksun: 0.2, start: 19.5, rho: 1.0 },
  sand: { c: 0.84, Psun: 1.6, Kshade: 0.11, Ksun: 0.11, start: 22.5, rho: 1.55 },
};
const BR = 0.035, BH = 0.085;                                // 烧杯（250 mL）
const LV = (k, m) => (m / MAT[k].rho) * 1e-6 / (Math.PI * (BR - 0.0012) ** 2);       // 装了 m 克，有多高
const SHADE_X = -0.105, SUN_X = 0.135, TRAY_Z = -0.035;      // 托盘在阴凉处 / 阳光下的位置；往后放一点：一只烧杯放到前面的电子秤上时，不挡住托盘上的另一只
const SLOT = { water: new THREE.Vector3(-0.042, 0, 0), sand: new THREE.Vector3(0.042, 0, 0) };      // 托盘上两个杯子的位置（相对托盘）
const SCALE_P = new THREE.Vector3(-0.115, 0, 0.115), JUG_HOME = new THREE.Vector3(-0.2, 0, 0.12), BOX_HOME = new THREE.Vector3(-0.03, 0, 0.13);
const TH_HOME = [new THREE.Vector3(0.235, 0.0066, 0.1), new THREE.Vector3(0.235, 0.0066, 0.12)];          // 平放在右前方（玻璃泡朝右）
const CLOCK_P = new THREE.Vector3(-0.215, 0, -0.04);
const DEPTH = 0.022;                                          // 温度计的玻璃泡插到面下 2.2 厘米（两杯一样）
const read05 = (t) => (Math.round(t * 2) / 2).toFixed(1);    // 温度计读到 0.5 ℃

// 真实数据：同在北纬 49.9°
const REAL = [
  { name: '温尼伯（加拿大，大陆内部）', short: '温尼伯（大陆内部）', lat: '49.9°N', jan: -16.3, jul: 19.5, hot: 19.5, cold: -16.3, src: '加拿大环境与气候变化部，1991—2020 年气候标准值（温尼伯理查森机场）' },
  { name: '锡利群岛（英国，大西洋中的小岛）', short: '锡利群岛（大西洋中的小岛）', lat: '49.9°N', jan: 8.2, jul: 16.6, hot: 17.0, cold: 8.125, src: '英国气象局，1991—2020 年平均（圣玛丽机场，按月平均最高、最低气温的平均算：最热为 8 月，约 17.0 ℃；最冷为 2 月，约 8.1 ℃；气温年较差约 8.9 ℃）' },
];

export default {
  id: 'sandwater',
  fig: '图4.16',
  title: '水和沙的温度变化实验',
  stampText: '活动',
  style: 'real',
  flow: 'explore',
  ask: '相同质量的水和沙，一起放在阳光下晒 2 小时——哪个温度升得多？',
  guess: { options: ['沙', '水', '差不多'], answer: 0 },          // 动手看里的“先猜一下（可以不猜）”
  need: '用相同的烧杯取相同质量的水和沙，在室内阴凉处放置一段时间；测量并记录温度，放到阳光下；2 小时后再测量、记录，比较变化幅度，解释 1 月、7 月同纬度海陆气温的差异',
  conclusion: {
    crops: [{ page: 82, rect: [60, 80, 440, 152] }, { page: 77, rect: [300, 270, 470, 362] }],
    quote: '海洋和陆地升温或降温的快慢不同。可以用模拟实验解释海洋和陆地的温度变化差异，并以此原理解释1月和7月同纬度海洋和陆地气温的差异。',
    why: '同样晒 2 小时，沙的温度变化比水大得多：水升温慢、降温也慢；沙升温快、降温也快。<br>把水、沙类比海洋、陆地：<b>7 月</b>（北半球夏季）太阳光热多，陆地升温快，同纬度的陆地气温比海洋<b>高</b>；<b>1 月</b>（冬季）太阳光热少，陆地降温快，同纬度的陆地气温比海洋<b>低</b>。所以陆地上气温的年变化大，海洋上小；北半球一年中通常陆地上 7 月最高、1 月最低，海洋上 8 月最高、2 月最低。',
    src: '课本七年级上册第 73、78 页 · 第四章 第二节 气温的变化与分布（活动：用模拟实验解释海洋和陆地气温变化的差异）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); else bar.caption(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };

    paperSheet(group, { w: 0.52, d: 0.32, x: 0, z: 0.04 });

    // ================= 阴凉处 / 阳光下 =================
    const patch = (x, w, d, inner, outer) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: canvasTex(256, 160, (g, Wc, Hc) => { const gr = g.createRadialGradient(Wc / 2, Hc / 2, 10, Wc / 2, Hc / 2, Wc * 0.55); gr.addColorStop(0, inner); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, Wc, Hc); }), transparent: true, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0.0006, 0); m.renderOrder = 2; m.raycast = () => {}; group.add(m); return m;
    };
    patch(SHADE_X - 0.02, 0.27, 0.22, 'rgba(120,140,170,0.22)', 'rgba(120,140,170,0)');
    const sunPatch = patch(SUN_X, 0.22, 0.2, 'rgba(255,214,110,0.55)', 'rgba(255,214,110,0)');
    for (const [t, x] of [['室内阴凉处', SHADE_X - 0.03], ['阳光下', SUN_X]]) { const l = textPlate(t, { w: 0.05, h: 0.012, color: '#5a6070', font: 'bold 80px "Songti SC", serif' }); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.0008, -0.085); group.add(l); }
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(256, 256, (g, Wc) => {
      const c = Wc / 2; g.strokeStyle = '#f0a020'; g.lineWidth = 9; g.lineCap = 'round';
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.beginPath(); g.moveTo(c + Math.cos(a) * 62, c + Math.sin(a) * 62); g.lineTo(c + Math.cos(a) * 98, c + Math.sin(a) * 98); g.stroke(); }
      g.fillStyle = '#ffd04a'; g.beginPath(); g.arc(c, c, 48, 0, 7); g.fill(); g.strokeStyle = '#e09a20'; g.lineWidth = 5; g.stroke();
    }), transparent: true, depthWrite: false })); sun.scale.setScalar(0.06); sun.position.set(SUN_X + 0.06, 0.2, -0.06); group.add(sun);

    // ================= 托盘、两只烧杯（水 / 沙） =================
    const tray = new THREE.Group(); tray.position.set(SHADE_X, 0, TRAY_Z); group.add(tray);
    const trayB = inked(new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.005, 0.09), paint(0xd9b07a)), { width: 0.7 }); trayB.position.y = 0.0025; tray.add(trayB);
    for (const s of [-1, 1]) { const rim = inked(new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.008, 0.004), paint(0xc99c62)), { width: 0.5 }); rim.position.set(0, 0.006, s * 0.043); tray.add(rim); }
    for (const s of [-1, 1]) { const hd = inked(new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.007, 0.05), paint(0xc99c62)), { width: 0.5 }); hd.position.set(s * 0.093, 0.0045, 0); tray.add(hd); }      // 两头的把手
    const trayPick = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.016, 0.07), new THREE.MeshBasicMaterial({ visible: false })); trayPick.position.set(0.094, 0.006, 0); trayPick.userData.pick = true; tray.add(trayPick);       // 端托盘：抓右边的把手
    const cups = {};
    for (const k of ['water', 'sand']) {
      const b = chemBeaker({ r: BR, h: BH, level: 0, color: CHEM.water }); group.add(b);
      if (k === 'sand') {
        const sandM = new THREE.Mesh(new THREE.CylinderGeometry(BR - 0.0013, BR - 0.0013, 1, 40), paint(0xcdb68a, { keep: true })); sandM.geometry.translate(0, 0.5, 0); sandM.position.y = 0.0012; sandM.renderOrder = 7; b.add(sandM); b.sand = sandM; b.setLevel(0);
      }
      const lab = textPlate(k === 'water' ? '烧杯 A · 水' : '烧杯 B · 沙', { w: 0.04, h: 0.01, color: '#23293a', bg: 'rgba(253,251,245,0.92)', font: 'bold 70px "Songti SC", serif' }); lab.position.set(0, 0.012, BR + 0.0015); b.add(lab);
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(BR + 0.004, BR + 0.004, BH, 12), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = BH / 2; pick.userData.pick = true; b.add(pick);
      // 杯口的温度计夹（图 4.16）
      const clip = inked(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.016, 0.006), paint(0xc8cdd4)), { width: 0.5 }); clip.position.set(BR - 0.006, BH - 0.002, 0); clip.visible = false; b.add(clip);
      cups[k] = Object.assign(b, { k, pick, clip });
    }
    // ================= 电子秤 =================
    const scale = new THREE.Group(); scale.position.copy(SCALE_P); group.add(scale);
    const sBody = inked(new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.014, 0.075), paint(0xe9edf0)), { width: 0.7 }); sBody.position.y = 0.007; scale.add(sBody);
    const sPlate = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.003, 32), paint(0xcfd6dc)), { width: 0.5 }); sPlate.position.set(0, 0.0155, -0.006); scale.add(sPlate);
    const dispC = document.createElement('canvas'); dispC.width = 256; dispC.height = 80; const dispT = new THREE.CanvasTexture(dispC); dispT.colorSpace = THREE.SRGBColorSpace;
    const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.0125), new THREE.MeshBasicMaterial({ map: dispT })); disp.position.set(0, 0.0105, 0.0378); scale.add(disp);
    let dispShown = '';
    const showMass = (txt) => { if (txt === dispShown) return; dispShown = txt; const g = dispC.getContext('2d'); g.fillStyle = '#2c3a2f'; g.fillRect(0, 0, 256, 80); g.fillStyle = '#9ff0a8'; g.font = 'bold 56px "Menlo", monospace'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(txt, 236, 42); dispT.needsUpdate = true; };
    const SCALE_TOP = new THREE.Vector3(SCALE_P.x, 0.017, SCALE_P.z - 0.006);
    // ================= 一杯水（倒水用）、一盒干沙（倒沙用） =================
    const jug = chemBeaker({ r: 0.028, h: 0.075, level: 0.055, color: CHEM.water }); jug.position.copy(JUG_HOME); group.add(jug);
    { const l = textPlate('水', { w: 0.014, h: 0.01, color: '#23293a', bg: 'rgba(253,251,245,0.92)', font: 'bold 80px "Songti SC", serif' }); l.position.set(0, 0.03, 0.0295); jug.add(l); }
    const jugPick = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.075, 10), new THREE.MeshBasicMaterial({ visible: false })); jugPick.position.y = 0.0375; jugPick.userData.pick = true; jug.add(jugPick);
    const box = new THREE.Group(); box.position.copy(BOX_HOME); group.add(box);
    const boxB = inked(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.035, 0.045), paint(0xb98f5a, { side: THREE.DoubleSide })), { width: 0.7 }); boxB.position.y = 0.0175; box.add(boxB);
    const boxSand = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.002, 0.041), paint(0xcdb68a, { keep: true })); boxSand.position.y = 0.033; box.add(boxSand);
    { const l = textPlate('干沙', { w: 0.024, h: 0.01, color: '#23293a', bg: 'rgba(253,251,245,0.92)', font: 'bold 80px "Songti SC", serif' }); l.position.set(0, 0.018, 0.0232); box.add(l); }
    const boxPick = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.04, 0.05), new THREE.MeshBasicMaterial({ visible: false })); boxPick.position.y = 0.02; boxPick.userData.pick = true; box.add(boxPick);
    const stream = new Particles({ max: 120, geometry: new THREE.SphereGeometry(1, 6, 5), material: water2({ color: 0xbfe0f0, base: 0.5 }) }); group.add(stream.mesh);
    const grains = new Particles({ max: 160, geometry: new THREE.DodecahedronGeometry(1, 0), material: paint(0xc2a874, { keep: true }) }); group.add(grains.mesh);
    // ================= 两支温度计 =================
    const ths = [0, 1].map((i) => {
      const t = thermometer({ min: -10, max: 60, length: 0.12 }); t.position.copy(TH_HOME[i]); t.rotation.z = Math.PI / 2; group.add(t);
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 8), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 0.06; pick.userData.pick = true; t.add(pick);
      return Object.assign(t, { pick });
    });
    // ================= 钟（放置一段时间、2 小时） =================
    const clock = new THREE.Group(); clock.position.copy(CLOCK_P); group.add(clock);
    const clockC = document.createElement('canvas'); clockC.width = clockC.height = 256; const clockT = new THREE.CanvasTexture(clockC); clockT.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.026, 40), new THREE.MeshBasicMaterial({ map: clockT })); face.position.set(0, 0.034, 0.0062); clock.add(face);
    const rimC = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.029, 0.012, 40), paint(0x8a6a4a)), { width: 0.6 }); rimC.rotation.x = Math.PI / 2; rimC.position.y = 0.034; clock.add(rimC);
    const leg = inked(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.02), paint(0x8a6a4a)), { width: 0.5 }); leg.position.y = 0.003; clock.add(leg);
    const clockPick = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.068, 0.02), new THREE.MeshBasicMaterial({ visible: false })); clockPick.position.y = 0.034; clockPick.userData.pick = true; clock.add(clockPick);
    let clockShown = '';
    const drawClock = (minutes, note) => {
      const key = `${Math.round(minutes)}|${note}`; if (key === clockShown) return; clockShown = key;
      const g = clockC.getContext('2d'), c = 128; g.fillStyle = '#fdfbf4'; g.beginPath(); g.arc(c, c, 124, 0, 7); g.fill();
      g.strokeStyle = '#23293a'; g.lineWidth = 5; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.beginPath(); g.moveTo(c + Math.sin(a) * 100, c - Math.cos(a) * 100); g.lineTo(c + Math.sin(a) * 114, c - Math.cos(a) * 114); g.stroke(); }
      const hh = ((10 + minutes / 60) % 12) / 12 * Math.PI * 2, mm = ((minutes % 60) / 60) * Math.PI * 2;      // 从上午 10 点起
      g.lineCap = 'round'; g.lineWidth = 10; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.sin(hh) * 58, c - Math.cos(hh) * 58); g.stroke();
      g.lineWidth = 6; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.sin(mm) * 92, c - Math.cos(mm) * 92); g.stroke();
      if (note) { g.fillStyle = '#c2452d'; g.font = 'bold 30px "Songti SC", serif'; g.textAlign = 'center'; g.fillText(note, c, c + 62); }
      clockT.needsUpdate = true;
    };
    const cards = { water: tag('', 'cond'), sand: tag('', 'cond') }; cards.water.px = [0, -64]; cards.sand.px = [0, -64];

    // ================= 状态 =================
    const fresh = () => ({
      demo: false, at: { water: 'tray', sand: 'tray' }, m: { water: 0, sand: 0 }, T: { water: MAT.water.start, sand: MAT.sand.start },
      carry: null, carryP: null, pour: null, thIn: [null, null], thCarry: [null, null], trayAt: 'shade', trayCarry: null,
      lapse: null, clockMin: 0, rested: false, rec0: null, rec1: null, said: {},
    });
    S = fresh();
    const inSun = () => S.trayAt === 'sun';
    const cupWorld = (k) => (S.at[k] === 'scale' ? SCALE_TOP.clone() : S.at[k] === 'carry' ? S.carryP.clone() : tray.position.clone().add(SLOT[k]).setY(0.005));
    const thOf = (k) => S.thIn.indexOf(k);

    const A = {
      cupDrag(k, p) { if (!p || S.lapse) return; S.carry = k; S.at[k] = 'carry'; S.carryP = p.clone().setY(Math.max(0.005, p.y)); },
      cupDrop(k) {
        if (S.at[k] !== 'carry') return;
        const p = S.carryP; S.carry = null;
        const onScale = Math.hypot(p.x - SCALE_TOP.x, p.z - SCALE_TOP.z) < 0.05 && !Object.values(S.at).includes('scale');
        S.at[k] = onScale ? 'scale' : 'tray';
        if (onScale) status(`把${k === 'water' ? '烧杯 A' : '烧杯 B'}放到了电子秤上。再把${k === 'water' ? '<b>水</b>' : '<b>干沙</b>'}倒进去，倒到 <b>200 g</b>。`);
      },
      pourDrag(what, p) {
        if (!p || S.lapse) return;
        S.pour = { what, p: p.clone(), on: false };
        const k = what === 'jug' ? 'water' : 'sand';
        if (S.at[k] === 'scale' && Math.hypot(p.x - SCALE_TOP.x, p.z - SCALE_TOP.z) < 0.06 && p.y > BH - 0.01) S.pour.on = true;
      },
      pourDrop() { S.pour = null; },
      thDrag(i, p) { if (!p || S.lapse) return; S.thCarry[i] = p.clone(); S.thIn[i] = null; },
      thDrop(i) {
        const p = S.thCarry[i]; S.thCarry[i] = null; if (!p) return;
        const k = ['water', 'sand'].find((kk) => S.at[kk] === 'tray' && !S.thIn.includes(kk) && S.m[kk] > 150 && Math.hypot(p.x - cupWorld(kk).x, p.z - cupWorld(kk).z) < 0.05 && p.y > BH - 0.02);
        S.thIn[i] = k || null;
        if (k) { sfx.clink?.({ freq: 1600, gain: 0.02 }); status(`温度计插进了${k === 'water' ? '水' : '沙'}里，用夹子夹在杯口：玻璃泡在${k === 'water' ? '水' : '沙'}面下 2.2 厘米。`); }
      },
      trayDrag(p) { if (!p || S.lapse) return; S.trayCarry = p.clone(); },
      trayDrop() {
        const p = S.trayCarry; S.trayCarry = null; if (!p) return;
        const to = p.x > (SHADE_X + SUN_X) / 2 ? 'sun' : 'shade';
        if (to !== S.trayAt) { S.trayAt = to; status(to === 'sun' ? '托盘端到了<b>阳光下</b>。点一下<b>钟</b>，过 2 小时。' : '托盘端回了室内阴凉处。'); }
      },
      clockTap() {
        if (S.lapse) return;
        if (!inSun()) { S.lapse = { kind: 'rest', left: 60 }; status('放在室内阴凉处……'); }
        else { S.lapse = { kind: 'sun', left: 120 }; status('晒太阳……'); }
      },
      reset() { W?.ui?.relock?.(); S = fresh(); stream.clear(); grains.clear(); W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.t3.close(); W.real.hidden = true; W.next.hidden = true; } bar.undo('water', 'sand', 'rest', 'th', 'sun', 'wait', 'why'); status('全部重新摆好了，记录也清空了。'); },
    };

    const drag = draggable(group, [
      ...['water', 'sand'].map((k) => ({ obj: cups[k].pick, anchor: cups[k], keepOffset: true, plane: 'xz', offset: 0, hint: () => (S.at[k] === 'scale' ? '拖回托盘' : '拖到电子秤上称'), onStart: (p) => A.cupDrag(k, p), onDrag: (p) => A.cupDrag(k, p), onEnd: () => A.cupDrop(k) })),
      { obj: jugPick, plane: 'xy', offset: 0.115, hint: '拖到电子秤上的烧杯 A 上方：倒水', onStart: (p) => A.pourDrag('jug', p), onDrag: (p) => A.pourDrag('jug', p), onEnd: () => A.pourDrop() },
      { obj: boxPick, plane: 'xy', offset: 0.115, hint: '拖到电子秤上的烧杯 B 上方：倒沙', onStart: (p) => A.pourDrag('box', p), onDrag: (p) => A.pourDrag('box', p), onEnd: () => A.pourDrop() },
      ...[0, 1].map((i) => ({ obj: ths[i].pick, plane: 'xy', offset: 0, hint: '温度计：插进一只烧杯，夹在杯口', onStart: (p) => A.thDrag(i, p), onDrag: (p) => A.thDrag(i, p), onEnd: () => A.thDrop(i) })),
      { obj: trayPick, anchor: tray, keepOffset: true, plane: 'xz', offset: 0, hint: '托盘：端到阳光下（或端回阴凉处）', onStart: (p) => A.trayDrag(p), onDrag: (p) => A.trayDrag(p), onEnd: () => A.trayDrop() },
    ], { taps: [{ obj: clockPick, hint: () => (inSun() ? '点一下：过 2 小时' : '点一下：放置一段时间'), onTap: () => A.clockTap() }], tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const above = (k) => () => SCALE_TOP.clone().add(new THREE.Vector3(0.012, BH + 0.03, 0));
    const intoCup = (k) => () => { const c = cupWorld(k); return new THREE.Vector3(c.x - 0.002, BH + 0.01, c.z); };

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'water', title: '称 200 g 水', todo: '把<b>烧杯 A</b> 拖到电子秤上，再把<b>水</b>倒进去，倒到 <b>200 g</b>；称好拖回托盘。', target: () => (S.m.water >= M - 0.05 ? (S.at.water === 'scale' ? cups.water : null) : S.at.water === 'scale' ? jugPick : cups.water) },
        { id: 'sand', title: '称 200 g 沙', todo: '把<b>烧杯 B</b> 拖到电子秤上，再把<b>干沙</b>倒进去，也倒到 <b>200 g</b>；称好拖回托盘。', target: () => (S.m.sand >= M - 0.05 ? (S.at.sand === 'scale' ? cups.sand : null) : S.at.sand === 'scale' ? boxPick : cups.sand) },
        { id: 'rest', title: '阴凉处放置', todo: '两杯都放在托盘上，留在<b>室内阴凉处</b>：点一下<b>钟</b>，放置一段时间。', target: () => clockPick },
        { id: 'th', title: '测温度', todo: '把两支<b>温度计</b>分别插进水和沙里（插入的深度相同），读出温度，记下来。', target: () => (S.thIn[0] ? (S.thIn[1] ? null : ths[1].pick) : ths[0].pick) },
        { id: 'sun', title: '放到阳光下', todo: '把<b>托盘</b>端到<b>阳光下</b>。', target: () => (S.trayCarry ? null : tray) },
        { id: 'wait', title: '2 小时后再测', todo: '点一下<b>钟</b>，过 2 小时，再读两支温度计。', target: () => clockPick },
        { id: 'why', title: '想一想', todo: '算出水和沙的温度变化，在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { stream.clear(); grains.clear(); } }),
          shots: [
            { cap: '用相同的烧杯分别取相同质量的水和沙：先把烧杯 A 放到电子秤上，倒水到 200 g。', dur: 9, speed: 1.6, cam: [[SCALE_P.x, 0.05, SCALE_P.z], [0.1, 0.45, 1], 0.32],
              during: act.seq(act.drag(cups.water.pick, () => SCALE_TOP.clone(), { t0: 0.03, t1: 0.15, release: 0.17 }), act.drag(jugPick, above('water'), { t0: 0.22, t1: 0.36, release: 0.86, until: () => S.m.water >= M - 0.05 }), act.drag(cups.water.pick, () => tray.position.clone().add(SLOT.water), { t0: 0.9, t1: 0.98, release: 0.99 })) },
            { cap: '再把烧杯 B 放上去，倒干沙，也倒到 200 g：同样重，沙的体积比水小。', dur: 9, speed: 1.6, cam: [[SCALE_P.x, 0.05, SCALE_P.z], [0.1, 0.45, 1], 0.32],
              during: act.seq(act.drag(cups.sand.pick, () => SCALE_TOP.clone(), { t0: 0.03, t1: 0.15, release: 0.17 }), act.drag(boxPick, above('sand'), { t0: 0.22, t1: 0.36, release: 0.86, until: () => S.m.sand >= M - 0.05 }), act.drag(cups.sand.pick, () => tray.position.clone().add(SLOT.sand), { t0: 0.9, t1: 0.98, release: 0.99 })) },
            { cap: '两杯放在室内阴凉处，放置一段时间，让水和沙的温度都和屋里一样。', dur: 6, cam: [[SHADE_X - 0.04, 0.04, 0], [0.05, 0.4, 1], 0.36], during: act.tap(clockPick, 0.05) },
            { cap: '两支温度计插入的深度相同，用夹子夹在杯口。分别测量并记录水和沙的温度。', dur: 7, cam: [[SHADE_X, 0.06, 0], [0.05, 0.3, 1], 0.28],
              during: act.seq(act.path(ths[0].pick, [null, new THREE.Vector3(TH_HOME[0].x, 0.2, 0.06), intoCup('water')()], { t0: 0.03, t1: 0.4, release: 0.42 }), act.path(ths[1].pick, [null, new THREE.Vector3(TH_HOME[1].x, 0.2, 0.06), intoCup('sand')()], { t0: 0.5, t1: 0.88, release: 0.9 })) },
            { cap: '把装有水和沙的托盘放到阳光下。', dur: 4.5, cam: [[0.01, 0.05, 0], [0.05, 0.4, 1], 0.42], during: act.drag(trayPick, () => new THREE.Vector3(SUN_X, 0, 0), { t0: 0.05, t1: 0.7, release: 0.75 }) },
            { cap: '2 小时后，再分别测量水和沙的温度：沙升高了十几摄氏度，水只升高了几摄氏度。', dur: 14, cam: [[SUN_X, 0.06, 0], [0.05, 0.32, 1], 0.3], during: act.tap(clockPick, 0.04) },
            { cap: '沙的温度变化幅度比水大得多。把水、沙类比海洋、陆地：陆地升温快、降温也快。演示完了，下面换你自己做。', dur: 6, cam: [[0.01, 0.05, 0], [0.05, 0.4, 1], 0.42] },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ================= 每帧 =================
    const step = (h) => {
      // 时间：平时 1 秒就是 1 秒；点了钟，一下子过 1 小时（阴凉处）或 2 小时（阳光下）
      let dtm = h;
      if (S.lapse) {
        const rate = S.lapse.kind === 'rest' ? 600 : 650, dm = Math.min(S.lapse.left, (h * rate) / 60);
        S.lapse.left -= dm; S.clockMin += dm; dtm = dm * 60;
        if (S.lapse.left <= 1e-6) {
          const kind = S.lapse.kind; S.lapse = null;
          if (kind === 'rest') { S.rested = true; done('rest'); status('放置了约 1 小时：水和沙的温度都和屋里差不多了。现在插温度计，读数。'); }
          else if (S.rec0 && !S.rec1) {
            S.rec1 = { water: S.T.water, sand: S.T.sand }; done('wait');
            const dW = +read05(S.rec1.water) - +read05(S.rec0.water), dS = +read05(S.rec1.sand) - +read05(S.rec0.sand);
            log(['2 小时后（阳光下）', `${read05(S.rec1.water)} ℃`, `${read05(S.rec1.sand)} ℃`]);
            log(['温度变化', `升高 <b>${dW.toFixed(1)} ℃</b>`, `升高 <b>${dS.toFixed(1)} ℃</b>`]);
            status(`2 小时后：水 <b>${read05(S.rec1.water)} ℃</b>，沙 <b>${read05(S.rec1.sand)} ℃</b>。算一算：水升高 ${dW.toFixed(1)} ℃，沙升高 ${dS.toFixed(1)} ℃。`);
            W?.t1.open();
          }
        }
      }
      // 温度：每杯按吸收的阳光和散热算
      for (const k of ['water', 'sand']) {
        if (S.m[k] < 1) continue;
        const mat = MAT[k], mc = (S.m[k] * mat.c), sunny = inSun() && S.at[k] === 'tray';
        const P = sunny ? mat.Psun : 0, K = sunny ? mat.Ksun : mat.Kshade, air = sunny ? AIR_SUN : ROOM;
        const n = Math.max(1, Math.ceil(dtm / 30));
        for (let i = 0; i < n; i++) S.T[k] += ((P - K * (S.T[k] - air)) * (dtm / n)) / mc;
      }
      // 记录放到阳光下之前的温度：静置过、两支温度计都插好
      if (S.rested && S.thIn[0] && S.thIn[1] && !S.rec0 && !inSun()) {
        S.rec0 = { water: S.T.water, sand: S.T.sand }; done('th');
        log(['放到阳光下之前（室内阴凉处）', `${read05(S.rec0.water)} ℃`, `${read05(S.rec0.sand)} ℃`]);
        status(`两支温度计都插好了：水 <b>${read05(S.rec0.water)} ℃</b>，沙 <b>${read05(S.rec0.sand)} ℃</b>。现在把托盘端到<b>阳光下</b>。`);
      }
      if (inSun() && S.rec0) done('sun');
      // 倒水 / 倒沙
      const pourK = S.pour?.what === 'jug' ? 'water' : S.pour?.what === 'box' ? 'sand' : null;
      if (S.pour) {
        const p = S.pour.p, obj = S.pour.what === 'jug' ? jug : box;
        obj.position.lerp(S.pour.on ? SCALE_TOP.clone().add(new THREE.Vector3(0.03, BH + 0.004, 0)) : new THREE.Vector3(p.x, Math.max(0, p.y - 0.03), p.z), 0.35);
        obj.rotation.z += ((S.pour.on ? 1.9 : 0) - obj.rotation.z) * 0.2;
        if (S.pour.on && obj.rotation.z > 1.4 && S.m[pourK] < M) {
          const rate = Math.max(2, Math.min(45, (M - S.m[pourK]) * 2.5));                // 快到 200 g 时倒慢一点
          S.m[pourK] = Math.min(M, S.m[pourK] + rate * h);
          const mouth = SCALE_TOP.clone().add(new THREE.Vector3(0.004, BH + 0.006, 0));
          if (Math.random() < h * 40) (pourK === 'water' ? stream : grains).spawn({ p: mouth.clone(), v: new THREE.Vector3(0, -0.12, 0), size: pourK === 'water' ? 0.0016 : 0.0013, life: 0.5 });
          if (S.m[pourK] >= M - 0.05 && !S.said[pourK]) { S.said[pourK] = true; status(`电子秤显示 <b>200.0 g</b>：${pourK === 'water' ? '水' : '沙'}称好了。把${pourK === 'water' ? '烧杯 A' : '烧杯 B'}拖回托盘。`); }
        }
      } else {
        for (const [obj, home] of [[jug, JUG_HOME], [box, BOX_HOME]]) { obj.position.lerp(home, 0.25); obj.rotation.z *= 0.8; }
      }
      for (const k of ['water', 'sand']) if (S.m[k] >= M - 0.05 && S.at[k] === 'tray' && !bar.has(k)) done(k);
      stream.update(h, (q, d) => { q.v.y -= 0.6 * d; q.p.addScaledVector(q.v, d); return q.p.y > SCALE_TOP.y + LV('water', S.m.water); });
      grains.update(h, (q, d) => { q.v.y -= 0.6 * d; q.p.addScaledVector(q.v, d); return q.p.y > SCALE_TOP.y + LV('sand', S.m.sand); });
      // 托盘、烧杯、温度计的位置
      const trayTo = S.trayCarry ? new THREE.Vector3(clamp(S.trayCarry.x, -0.17, 0.2), 0, clamp(S.trayCarry.z, -0.085, 0.015)) : new THREE.Vector3(S.trayAt === 'sun' ? SUN_X : SHADE_X, 0, TRAY_Z);
      tray.position.lerp(trayTo, S.trayCarry ? 0.5 : 0.25);
      for (const k of ['water', 'sand']) {
        const b = cups[k], want = cupWorld(k);
        b.position.lerp(want, S.at[k] === 'carry' ? 0.5 : 0.3);
        const lv = LV(k, S.m[k]); if (k === 'water') b.setLevel(lv); else { b.sand.visible = lv > 0.001; b.sand.scale.y = Math.max(0.001, lv); }
        b.clip.visible = S.thIn.includes(k);
      }
      ths.forEach((t, i) => {
        const k = S.thIn[i];
        if (S.thCarry[i]) { t.position.lerp(S.thCarry[i].clone().add(new THREE.Vector3(0, -0.06, 0)), 0.45); t.rotation.z += (0 - t.rotation.z) * 0.3; }
        else if (k) { const c = cups[k].position, lv = LV(k, S.m[k]); t.position.lerp(new THREE.Vector3(c.x + BR - 0.009, c.y + lv - DEPTH - 0.0095, c.z), 0.35); t.rotation.z += (0 - t.rotation.z) * 0.3; }
        else { t.position.lerp(TH_HOME[i], 0.2); t.rotation.z += (Math.PI / 2 - t.rotation.z) * 0.2; }
        t.setTemp(k ? S.T[k] : inSun() ? AIR_SUN : ROOM);
      });
      showMass(Object.values(S.at).includes('scale') ? `${(S.m[Object.keys(S.at).find((k) => S.at[k] === 'scale')]).toFixed(1)} g` : '0.0 g');
      drawClock(S.clockMin, S.lapse ? (S.lapse.kind === 'rest' ? '放置中' : '晒太阳') : S.rec1 ? '过了 2 小时' : '');
      sunPatch.material.opacity = 1;
      for (const k of ['water', 'sand']) {
        const i = thOf(k), b = cups[k];
        cards[k].text(`<div class="cc"><div class="cc-t"><span class="cc-name">${k === 'water' ? '水' : '沙'} ${S.m[k].toFixed(0)} g</span></div><div class="cc-more"><div class="cc-obs"><b>${i >= 0 ? read05(S.T[k]) + ' ℃' : '—'}</b><small>${i >= 0 ? (inSun() && S.at[k] === 'tray' ? '　在阳光下' : '　在阴凉处') : '　还没插温度计'}</small></div></div></div>`)
          .loc(group, b.position.x, BH + 0.01, b.position.z).show(S.m[k] > 1 && S.at[k] === 'tray');
      }
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.48, d: 0.28, h: 0.2 },
      view: { elev: 31, azim: -4, lookY: 0.3, frameMargin: 1.04 },          // 高一点往下看：电子秤上的烧杯不挡住后面托盘上的那只
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = () => [...W.tbl.el.querySelectorAll('tbody tr')].map((tr) => `<div>${tr.children[0].innerHTML}：水 ${tr.children[1].innerHTML}，沙 ${tr.children[2].innerHTML}</div>`).join('');
        const rt = table(['同在北纬 49.9°', '1 月', '7 月', '年较差']);
        for (const r of REAL) rt.add([r.short, `${r.jan.toFixed(1)} ℃`, `${r.jul.toFixed(1)} ℃`, `<b>${(r.hot - r.cold).toFixed(1)} ℃</b>`]);
        const realTbl = h('div', { class: 'think', hidden: true }, h('div', { class: 'think-t' }, '真实的数（1991—2020 年平均）'), rt.el,
          h('p', { class: 'fineprint', html: '温尼伯在加拿大，北美大陆的内部，像沙：冬天冷得多，夏天热一些，一年里变化大；锡利群岛是英国西南面大西洋里的小岛，像水：冬暖夏凉，一年里变化小（最热在 8 月）。<br>数据：' + REAL.map((r) => r.src).join('；') + '。' }));
        const t3 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '7 月，北半球同纬度的陆地气温比海洋<b>高</b>。用水和沙的实验解释：',
          options: ['夏季太阳光热多，陆地像沙，升温快、升得多；海洋像水，升温慢', '陆地离太阳近', '海洋把热都反射走了'],
          wrong: ['陆地和海洋离太阳一样远。', '海洋吸收的太阳光热并不少，只是升温慢。'],
          ok: '对：夏季陆地升温快，同纬度的陆地气温比海洋高。看看左边真实的数。',
          onOk: () => { realTbl.hidden = false; next.hidden = false; done('why'); } });
        const t2 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '1 月，北半球同纬度的陆地气温比海洋<b>低</b>。用水和沙的实验解释：',
          options: ['冬季太阳光热少，陆地像沙，降温快、降得多；海洋像水，降温慢', '陆地上风大', '海洋里的水会结冰放热'],
          wrong: ['风不是主要原因：同样放出热量，沙的温度变得比水快。', '冬季大部分海面并不结冰。'],
          ok: '对：沙升温快，降温也快。冬季陆地降温快，同纬度的陆地气温比海洋低。',
          onOk: () => t3.open() });
        const t1 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '分别计算水和沙的温度变化：哪个温度变化的幅度大？',
          options: ['沙', '水', '一样大'],
          wrong: ['看记录：哪个升高的度数多？', '算一算 2 小时前后的差。'],
          ok: '对：同样晒 2 小时，沙的温度变化幅度比水大得多——相同质量的水，升高 1 ℃ 要吸收的热量大约是沙的 5 倍。',
          onOk: () => t2.open() });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '对照课本原文 →');
        const tbl = table(['', '水', '沙']);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：温度是算出来的（近似）：晴天正午阳光约 700 W/m²；水的比热容 4.2 J/(g·℃)，干沙约 0.84 J/(g·℃)；沙吸收约 65% 的阳光，水约 36%（大部分透过水）；水还会蒸发散热；屋里 21 ℃，阳光下的空气 24 ℃。实际结果随天气变化。' });
        ui.controls.append(t1.el, t2.el, t3.el, realTbl, next, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { ui, tbl, t1, t2, t3, real: realTbl, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('图 4.16：桌上两只一样的烧杯、一台电子秤、一杯水、一盒干沙、两支温度计；左边是室内阴凉处，右边是阳光下。可以先看<b>老师演示</b>，也可以直接动手。');
      },
      update(dt) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k); },
      dispose() { bar.dispose(); stream.dispose?.(); grains.dispose?.(); },
      debug: { get S() { return S; }, A, bar, picks: { water: cups.water.pick, sand: cups.sand.pick, jug: jugPick, box: boxPick, th0: ths[0].pick, th1: ths[1].pick, tray: trayPick, clock: clockPick },
        qa: qaFlow(drag, [
          { name: '烧杯 A 上秤', drag: cups.water.pick, to: () => SCALE_TOP.clone() },
          { name: '倒水', hold: jugPick },
          { name: '倒水中', run: () => A.pourDrag('jug', above('water')()), wait: 9 },
          { name: '倒好水', release: jugPick },
          { name: '烧杯 A 回托盘', drag: cups.water.pick, to: () => tray.position.clone().add(SLOT.water) },
          { name: '烧杯 B 上秤', drag: cups.sand.pick, to: () => SCALE_TOP.clone() },
          { name: '倒沙', hold: boxPick },
          { name: '倒沙中', run: () => A.pourDrag('box', above('sand')()), wait: 9 },
          { name: '倒好沙', release: boxPick },
          { name: '烧杯 B 回托盘', drag: cups.sand.pick, to: () => tray.position.clone().add(SLOT.sand) },
          { name: '放置一段时间', tap: clockPick, wait: 8 },
          { name: '插温度计 1', drag: ths[0].pick, to: intoCup('water') },
          { name: '插温度计 2', drag: ths[1].pick, to: intoCup('sand'), wait: 1 },
          { name: '端到阳光下', drag: trayPick, to: () => new THREE.Vector3(SUN_X, 0, 0) },
          { name: '过 2 小时', tap: clockPick, wait: 14 },
          { name: '答第一题', run: () => W.t1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.t2.el.querySelector('button').click() },
          { name: '答第三题', run: () => W.t3.el.querySelector('button').click() },
        ]) },
    };
  },
};
