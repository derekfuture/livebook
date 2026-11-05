// 课题2 碳的氧化物 · 实验 6-5 二氧化碳与水反应（课本第 137 页图 6-12）。
//
// 三朵用石蕊溶液染成紫色的干燥纸花：I 喷水；II 放进盛满二氧化碳的集气瓶；III 喷上水后再放进盛满二氧化碳的集气瓶（变红）。
// 将第三朵纸花取出，小心地用吹风机吹干（又变成紫色）。
// 看不见的东西：二氧化碳 = 深灰点（集气瓶里；吹干时从纸花上跑掉）；吹风机的热风 = 橙色。
// 模型（示意，界面上写明）：湿的纸花在二氧化碳里，二氧化碳和水生成碳酸，石蕊几秒内变红；干纸花、只喷水的纸花都不变。
//   吹干时碳酸受热分解，二氧化碳跑掉，又变回紫色。变色、吹干的快慢是示意。
import * as THREE from 'three';
import { buttons, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { canvasTex } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { gasJar } from './kit/chem.js';
import { lessonBar } from './kit/lessonbar.js';
import { microWorld } from './kit/microworld.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const DARK = 0x3d4350, HEAT = 0xff9a3c;
const PURPLE = new THREE.Color(0x8b5fb0), RED = new THREE.Color(0xd9455f), WETK = new THREE.Color(0x4f3570);
const TRAY = new THREE.Vector3(0, 0, 0.05);
const SLOTS = [new THREE.Vector3(-0.037, 0.004, 0.052), new THREE.Vector3(0, 0.004, 0.052), new THREE.Vector3(0.037, 0.004, 0.052)];
const JARS = [new THREE.Vector3(-0.03, 0, -0.035), new THREE.Vector3(0.03, 0, -0.035)], CJ_R = 0.024, CJ_H = 0.075;
const SPRAY_HOME = new THREE.Vector3(-0.088, 0, 0.055), DRYER_HOME = new THREE.Vector3(0.092, 0, 0.045);
const ROMAN = ['I', 'II', 'III'];
const SPRAY_OFF = new THREE.Vector3(0, 0, 0.034), DRY_OFF = new THREE.Vector3(-0.05, 0, 0);        // 工具相对纸花站在哪：喷壶在花后面朝前喷，吹风机在右边
const SPRAY_POSE = new THREE.Vector3(-0.03, 0.016, -0.024);       // 喷水时喷壶举到纸花的左后上方（相对纸花）
// 纸花放进 / 拿出集气瓶：从瓶口进出（课本图 6-12：放着纸花的集气瓶盖着玻璃片）
const FLOWER_R = 0.018;                          // 纸花半径（约 1.8 cm）
const NECK_R = CJ_R * 0.72;                      // 集气瓶口的半径
const RIM = CJ_H + 0.0058;                       // 瓶口加玻璃片的高度：纸花要高过它，才能越过瓶口
const LIFT_Y = CJ_H + 0.014;                     // 拿着纸花越过瓶口的高度
const KEEP_R = CJ_R + 0.0012 + FLOWER_R + 0.002; // 纸花中心离瓶轴比这近、又低于瓶口，就碰到瓶壁了
const PLATE_OPEN = 0.044, PLATE_DIR = [-1, 1];   // 放纸花时玻璃片推开多少（推到瓶口外面）；两个瓶的玻璃片各往外侧推
const sm = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

/** 纸花：两圈花瓣 + 花心。.mat 是这朵花自己的材质（颜色会变） */
function paperFlower() {
  const g = new THREE.Group();
  const mat = paint(0x8b5fb0, { keep: true, unique: true });
  const pet = new THREE.SphereGeometry(1, 12, 6);
  for (const [n, rr, sx, sz, tilt, y] of [[7, 0.0068, 0.0062, 0.0042, 0.25, 0.001], [5, 0.0036, 0.0046, 0.0032, 0.55, 0.0028]]) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (n === 5 ? 0.3 : 0);
      const p = inked(new THREE.Mesh(pet, mat), { width: 0.35, color: 0x4a3558, opacity: 0.6 });
      p.scale.set(sx, 0.0013, sz); p.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr); p.rotation.set(0, -a, tilt);
      g.add(p);
    }
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.0026, 10, 8), mat); core.position.y = 0.0038; core.scale.y = 0.7; g.add(core);
  const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.014, 10), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 0.005; pick.userData.pick = true; g.add(pick);
  // 喷湿以后挂在花瓣上的小水珠（个数跟着湿的程度）
  const beads = new THREE.Group(); g.add(beads);
  const beadMat = new THREE.MeshPhysicalMaterial({ color: 0xcfe6f2, transparent: true, opacity: 0.6, roughness: 0, clearcoat: 1 });
  for (let i = 0; i < 16; i++) { const a = Math.random() * 6.28, r = 0.002 + Math.random() * 0.007; const b = new THREE.Mesh(new THREE.SphereGeometry(0.0004 + Math.random() * 0.0004, 8, 6), beadMat); b.position.set(Math.cos(a) * r, 0.0035 + Math.random() * 0.0015, Math.sin(a) * r); b.userData.k = Math.random(); beads.add(b); }
  g.mat = mat; g.pick = pick; g.beads = beads;
  g.scale.setScalar(1.4);                  // 直径约 4 cm，和集气瓶口差不多
  return g;
}

export default {
  id: 'co2litmus',
  fig: '图6-12',
  title: '二氧化碳与水反应',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '三朵紫色的石蕊纸花：I 喷水；II 直接放进二氧化碳；III 喷水后再放进二氧化碳——哪朵会变红？',
    hint: '课本第 137 页实验 6-5。石蕊遇酸变红。',
    options: ['只有 III', 'II 和 III', '三朵都变红', '都不变红'],
    answer: 0,
  },
  need: '三朵石蕊纸花：I 喷水；II 干燥的放进二氧化碳；III 喷水后放进二氧化碳；再把 III 取出吹干',
  conclusion: {
    crops: [{ page: 143, rect: [90, 561, 427, 597] }, { page: 144, rect: [68, 55, 455, 153] }],
    quote: '二氧化碳与水反应生成碳酸，碳酸能使紫色石蕊溶液变成红色。碳酸很不稳定，容易分解生成二氧化碳和水。当吹干纸花时，碳酸分解，二氧化碳从溶液里逸出，所以纸花的颜色又变成紫色。',
    formula: 'CO₂ + H₂O ══ H₂CO₃　　H₂CO₃ ══ CO₂↑ + H₂O',
    why: '只喷水的纸花不变色——<b>水</b>不能使石蕊变红；干燥的纸花放进二氧化碳不变色——<b>二氧化碳</b>本身也不能；喷了水再放进二氧化碳才变红——是二氧化碳和水<b>反应</b>生成的<b>碳酸</b>使石蕊变红（二氧化碳溶于水时发生了化学变化）。<br>吹干后又变紫：碳酸<b>不稳定</b>，受热分解成二氧化碳和水，二氧化碳跑掉了。',
    src: '课本第 137–138 页 · 第六单元 课题2 碳的氧化物（实验 6-5）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) { W?.tbl.add(row); S.rows.push(row); } };

    paperSheet(group, { w: 0.28, d: 0.17, x: 0, z: 0.01 });

    // ================= 托盘上的三朵纸花、两瓶二氧化碳、喷壶、吹风机 =================
    const tray = inked(new THREE.Mesh(new THREE.BoxGeometry(0.121, 0.003, 0.045), paint(0xf2eee4)), { width: 0.5 }); tray.position.copy(TRAY).add(new THREE.Vector3(0, 0.0015, 0)); group.add(tray);
    const flowers = [0, 1, 2].map((i) => { const f = paperFlower(); f.position.copy(SLOTS[i]); group.add(f); return f; });
    const fLabels = flowers.map((_, i) => tag(ROMAN[i], 'pill'));
    const cjars = JARS.map((p) => { const j = gasJar({ r: CJ_R, h: CJ_H }); j.position.copy(p); j.setWater(0); group.add(j); return j; });
    const spray = new THREE.Group(); group.add(spray);
    {
      const body = inked(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.045, 0.013), paint(0xf08a3c, { keep: true })), { width: 0.6 }); body.position.y = 0.0225;
      const label = new THREE.Mesh(new THREE.PlaneGeometry(0.013, 0.024), paint(0xf3efc8, { keep: true })); label.position.set(0, 0.022, 0.0066);
      const neck = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.005, 0.008, 12), paint(0xf4f4f2)), { width: 0.5 }); neck.position.y = 0.049;
      const head = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0048, 0.014, 14), paint(0xe8eaec)), { width: 0.5 }); head.rotation.z = Math.PI / 2 + 0.12; head.position.set(-0.004, 0.057, 0);
      const noz = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.002, 0.006, 10), paint(0x9aa3ad)), { width: 0.4 }); noz.rotation.z = Math.PI / 2; noz.position.set(-0.013, 0.058, 0);
      const trig = inked(new THREE.Mesh(new THREE.BoxGeometry(0.0025, 0.011, 0.005), paint(0xe8eaec)), { width: 0.4 }); trig.position.set(-0.008, 0.047, 0); trig.rotation.z = 0.35; spray.trig = trig;
      spray.add(body, label, neck, head, noz, trig);
    }
    const sprayPick = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.066, 0.024), new THREE.MeshBasicMaterial({ visible: false })); sprayPick.position.y = 0.032; sprayPick.userData.pick = true; spray.add(sprayPick);
    spray.position.copy(SPRAY_HOME);
    const NOZ = new THREE.Vector3(-0.016, 0.057, 0);
    const dryer = new THREE.Group(); group.add(dryer);
    {
      const tiltG = new THREE.Group(); tiltG.position.set(0, 0.03, 0); tiltG.rotation.z = 0.45; dryer.add(tiltG); dryer.tiltG = tiltG;        // 枪身往下倾，风口对着桌上的纸花
      const barrel = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.011, 0.055, 20), paint(0x9aaabb)), { width: 0.6 }); barrel.rotation.z = Math.PI / 2; barrel.position.set(0, 0.015, 0);
      const mouth = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0105, 0.01, 18), paint(0x6f7f90)), { width: 0.5 }); mouth.rotation.z = Math.PI / 2; mouth.position.set(-0.031, 0.015, 0);
      const handle = inked(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.036, 0.014), paint(0x9aaabb)), { width: 0.6 }); handle.position.set(0.012, 0.019, 0); handle.rotation.z = -0.18;
      tiltG.add(barrel, mouth); handle.position.y = 0.019; dryer.add(handle);
    }
    const dryerPick = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.06, 0.028), new THREE.MeshBasicMaterial({ visible: false })); dryerPick.position.y = 0.032; dryerPick.userData.pick = true; dryer.add(dryerPick);
    dryer.position.copy(DRYER_HOME);
    const DRY_MOUTH = new THREE.Vector3(-0.036, 0.015, 0);
    // 一股看得见的热风：从风口张开到纸花的半透明橙色锥
    const windMat = new THREE.MeshBasicMaterial({ color: HEAT, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const wind = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.006, 1, 24, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2), windMat);
    wind.renderOrder = 9.7; wind.raycast = () => {}; group.add(wind);       // 在 tiltG 里的坐标

    // ================= 二氧化碳小点、水雾、热风 =================
    const dotTex = canvasTex(64, 64, (g, Wd) => { const gr = g.createRadialGradient(Wd / 2, Wd / 2, 0, Wd / 2, Wd / 2, Wd / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,1)'); gr.addColorStop(0.75, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, Wd, Wd); });
    const darkP = new Particles({ max: 120, sprite: true, color: DARK }), heatP = new Particles({ max: 260, sprite: true, color: HEAT }), mistP = new Particles({ max: 400, sprite: true, color: 0x4f9fd6 });
    for (const p of [darkP, heatP, mistP]) { p.mat.uniforms.map.value = dotTex; p.mesh.renderOrder = 10; group.add(p.mesh); }
    const rnd = (a, b) => a + Math.random() * (b - a);
    const cjDots = cjars.map(() => Array.from({ length: 18 }, () => ({ u: Math.sqrt(Math.random()) * 0.8, th: Math.random() * Math.PI * 2, y: rnd(0.06, 0.9), ph: Math.random() * 6, p: new THREE.Vector3(), size: 0.0032, alpha: 0.85 })));
    const leaving = [];
    // 微观次元：钻进最近动过的那朵纸花，看纸面上的分子怎么反应（CO₂ + H₂O ⇌ H₂CO₃）
    // 全息：分子世界浮在这朵纸花上方（底座直径约 10 cm，1 Å ≈ 0.78 mm），和桌上的东西用同一个镜头
    const mw = microWorld({ mode: 'holo', place: () => {
      const f = flowers[Math.max(0, rxFor)], ws = group.getWorldScale(new THREE.Vector3()).x;
      return { pos: f.localToWorld(new THREE.Vector3(0, 0.004, 0)), scale: 0.0078 * ws, cam: window.__lb.stage.camera };
    } });
    const goBtn = tag('钻进纸花里看 ⊙', 'pill mw-go', () => openMicro());
    let rxFor = -1;
    const flowerState = (i) => { const f = S.fl[i]; return { gas: f.at !== 'tray' && !f.carry ? 'CO2' : 'air', wet: f.wet, acid: f.acid, paper: '#' + flowers[i].mat.color.getHexString() }; };
    const openMicro = (demo = false) => {
      if (S.focus < 0) return;
      const p = flowers[S.focus].position;
      if (!demo) look([p.x, p.y + 0.05, p.z], [0.04, 0.42, 1], 0.32);        // 演示里镜头由演示管        // 纸花和它上方浮起来的分子都在画面里
      // 纸花在屏幕上的位置：用舞台的镜头直接算（凑近看时标签会被藏起来，不能拿标签的位置）
      const r = () => { const cam = window.__lb?.stage?.camera; if (!cam) return [innerWidth / 2, innerHeight * 0.8]; const v = flowers[rxFor].getWorldPosition(new THREE.Vector3()); v.y += 0.002; v.project(cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; };
      rxFor = S.focus; mw.open(r, flowerState(S.focus));
    };
    mw.onClose = () => { if (!bar.playing) back(); };

    // ================= 状态 =================
    const fresh = () => ({
      demo: false, rows: [],
      fl: [0, 1, 2].map((i) => ({ at: 'tray', slot: i, wet: 0, acid: 0, peak: 0, outT: 0, inT: 0, carry: null })),
      sprayAt: null, sprayHold: null, sprayT: 0, sprayFlower: -1, dryerAt: null, logged: {}, focus: -1,
    });
    S = fresh();
    const flowerPos = (f) => (f.carry ? f.carry : f.at === 'tray' ? SLOTS[f.slot] : JARS[f.at === 'jar0' ? 0 : 1].clone().add(new THREE.Vector3(0, 0.006, 0)));
    const freeSlot = (i) => { const used = S.fl.filter((f, j) => j !== i && f.at === 'tray').map((f) => f.slot); return used.includes(S.fl[i].slot) ? [0, 1, 2].find((k) => !used.includes(k)) : S.fl[i].slot; };
    const nearestFlower = (p, r) => { let best = -1, bd = r; S.fl.forEach((f, i) => { if (f.at !== 'tray' || f.carry) return; const q = SLOTS[f.slot], d = Math.hypot(q.x - p.x, q.z - p.z); if (d < bd) { bd = d; best = i; } }); return best; };
    const aimed = (tool, off) => (tool ? nearestFlower(tool.clone().add(off), 0.04) : -1);

    // ================= 操作 =================
    const A = {
      flowerDrag(i, p) { if (!p) return; S.fl[i].carry = new THREE.Vector3(p.x, 0.035, p.z); },
      flowerDrop(i) {
        const f = S.fl[i], p = f.carry; f.carry = null; if (!p) return;
        const j = JARS.findIndex((q) => Math.hypot(q.x - p.x, q.z - p.z) < 0.03);
        if (j >= 0 && !S.fl.some((g, k) => k !== i && g.at === 'jar' + j)) {
          f.at = 'jar' + j; f.inT = 0; S.focus = i; sfx.clink({ freq: 1800, gain: 0.03 });
          status(f.wet > 0.3 ? `把喷过水的纸花 ${ROMAN[i]} 放进了盛满二氧化碳的集气瓶。看它的颜色。` : `把干燥的纸花 ${ROMAN[i]} 放进了盛满二氧化碳的集气瓶。看它的颜色。`);
        } else { f.at = 'tray'; f.slot = freeSlot(i); f.outT = 0; }
      },
      sprayAt(p) { if (!p) return; S.sprayAt = new THREE.Vector3(p.x, 0, p.z); },
      sprayDrop() {
        const p = S.sprayAt; S.sprayAt = null; if (!p) return;
        const i = aimed(p, SPRAY_OFF); if (i < 0) return;
        S.sprayHold = p; A.wet(i);
      },
      wet(i) {
        const f = S.fl[i]; if (f.at !== 'tray') return;
        f.wet = 1; f.outT = 0; S.sprayT = 1.1; S.sprayFlower = i; S.focus = i; sfx.clink({ freq: 3000, gain: 0.02 });
        status(`给纸花 ${ROMAN[i]} 喷了水。看它变不变色。`);
      },
      dryerAt(p) { if (!p) return; S.dryerAt = new THREE.Vector3(p.x, 0, p.z); },
      dryerDrop() { S.dryerAt = null; },
      reset() {
        S = fresh(); leaving.length = 0; rxFor = -1; W?.tbl.clear();
        if (W) { W.t1.close(); W.next.hidden = true; }
        bar.undo('f1', 'f2', 'f3', 'dry', 'why');
        status('全部重新摆好了，记录也清空了。');
      },
    };

    const drag = draggable(group, [
      ...flowers.map((f, i) => ({ obj: f.pick, plane: 'xz', offset: 0.035, hint: () => (S.fl[i].at === 'tray' ? `纸花 ${ROMAN[i]}：拖进集气瓶` : `纸花 ${ROMAN[i]}：拖回托盘`),
        onStart: (p) => A.flowerDrag(i, p), onDrag: (p) => A.flowerDrag(i, p), onEnd: () => A.flowerDrop(i) })),
      { obj: sprayPick, plane: 'xz', offset: 0, hint: '拖到一朵纸花后面：喷水', onStart: (p) => A.sprayAt(p), onDrag: (p) => A.sprayAt(p), onEnd: () => A.sprayDrop() },
      { obj: dryerPick, plane: 'xz', offset: 0, hint: '拖到纸花右边，按住：吹干', onStart: (p) => A.dryerAt(p), onDrag: (p) => A.dryerAt(p), onEnd: () => A.dryerDrop() },
    ], { tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const sprayTo = (i) => () => SLOTS[i].clone().sub(SPRAY_OFF).setY(0);
    const dryerTo = (i) => () => SLOTS[i].clone().sub(DRY_OFF).setY(0);
    const intoJar = (j) => () => new THREE.Vector3(JARS[j].x, 0.035, JARS[j].z);
    const toSlot = (i) => () => new THREE.Vector3(SLOTS[i].x, 0.035, SLOTS[i].z);
    const flowerFor = (want) => S.fl.findIndex(want);
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'f1', title: '纸花 I：喷水', todo: '把<b>喷壶</b>拖到一朵纸花后面，给它喷水。看它变不变色。', target: () => spray },
        { id: 'f2', title: '纸花 II：放进二氧化碳', todo: '把一朵<b>干燥的</b>纸花拖进集气瓶（瓶里是二氧化碳）。', target: () => { const i = flowerFor((f) => f.at === 'tray' && f.wet < 0.1); return i >= 0 ? flowers[i] : null; } },
        { id: 'f3', title: '纸花 III：喷水后放进二氧化碳', todo: '给另一朵纸花<b>喷上水</b>，再把它拖进另一个集气瓶。', target: () => { const i = flowerFor((f, j) => f.at === 'tray' && f.wet > 0.5 && j !== S.logged.wetOnly - 1); return i >= 0 ? flowers[i] : spray; } },
        { id: 'dry', title: '吹干', todo: '把变红的纸花<b>拿出来</b>放回托盘，用<b>吹风机</b>对着它吹。', target: () => { const i = flowerFor((f) => f.acid > 0.5); if (i < 0) return null; return S.fl[i].at === 'tray' ? dryer : flowers[i]; } },
        { id: 'why', title: '想一想', todo: '纸花为什么变红、又为什么变回紫色？在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { leaving.length = 0; rxFor = -1; mw.close(); } }),
          shots: [
            { cap: '拿起喷壶，给纸花 I 喷水：还是紫色——水不能使石蕊变红。', dur: 5, cam: [[-0.02, 0.03, 0.03], [0.05, 0.55, 1], 0.3], during: act.drag(sprayPick, sprayTo(0), { t0: 0.04, t1: 0.35, release: 0.45 }) },
            { cap: '把干燥的纸花 II 放进盛满二氧化碳的集气瓶：还是紫色——二氧化碳本身也不能使石蕊变红。', dur: 5.5, cam: [[-0.02, 0.03, 0.01], [0.05, 0.5, 1], 0.3], during: act.drag(flowers[1].pick, intoJar(0), { t0: 0.04, t1: 0.4, release: 0.45 }) },
            { cap: '给纸花 III 喷上水，再放进另一个集气瓶：变成了红色。', dur: 9, speed: 1.3, cam: [[0.03, 0.03, 0.01], [0.05, 0.5, 1], 0.3],
              during: act.seq(act.drag(sprayPick, sprayTo(2), { t0: 0.03, t1: 0.2, release: 0.25 }), act.drag(flowers[2].pick, intoJar(1), { t0: 0.42, t1: 0.6, release: 0.64 }), act.at(0.7, () => openMicro(true))) },
            { cap: '钻进纸花表面看：二氧化碳分子撞上水分子，原子重新连接，变成碳酸分子——碳酸使石蕊变红。', dur: 9, cam: [[0.03, 0.08, -0.035], [0.04, 0.42, 1], 0.32] },
            { cap: '把纸花 III 取出来，用吹风机吹干：又变回了紫色。', dur: 9, speed: 1.5, cam: [[0.05, 0.03, 0.03], [0.05, 0.5, 1], 0.3],
              enter: () => mw.close(),
              during: act.seq(act.drag(flowers[2].pick, toSlot(2), { t0: 0.03, t1: 0.2, release: 0.24 }), act.drag(dryerPick, dryerTo(2), { t0: 0.3, t1: 0.45, release: 0.97 })) },
            { cap: '二氧化碳和水反应生成碳酸，碳酸使石蕊变红；碳酸不稳定，受热分解了。演示完了，下面换你自己做。', dur: 4, cam: [[0, 0.03, 0.01], [0.05, 0.45, 1], 0.38] },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ================= 每帧 =================
    // 纸花挪到该去的地方（每帧滑过去）。放进集气瓶：先抬到瓶口以上，挪到瓶口正上方，等玻璃片推开，再从瓶口放下去；
    // 拿出来：先竖直提出瓶口，再挪开。低于瓶口时不从瓶壁穿过去。
    const hyp = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    const plateOpen = (k) => Math.abs(cjars[k].plate.position.x) > PLATE_OPEN - 0.0008;
    const moveFlower = (i) => {
      const f = S.fl[i], P = flowers[i].position, tgt = flowerPos(f).clone();
      const inside = JARS.findIndex((q) => P.y < RIM && hyp(P, q) < NECK_R);
      let next;
      if (f.carry) {
        // 拿着走：靠近集气瓶就抬高，越过瓶口；在瓶里时先竖直提出瓶口（玻璃片推开以前，先提到瓶口下面等着）
        const near = Math.max(...JARS.map((q) => sm((0.075 - hyp(f.carry, q)) / 0.025)), ...JARS.map((q) => sm((KEEP_R + 0.02 - hyp(P, q)) / 0.02)));
        if (inside >= 0) next = P.clone().lerp(new THREE.Vector3(P.x, plateOpen(inside) ? LIFT_Y : CJ_H - 0.012, P.z), 0.15);
        else { tgt.y = 0.035 + (LIFT_Y - 0.035) * near; next = P.clone().lerp(tgt, 0.5); }
      } else {
        // 放下：在瓶里、瓶口上方，或者要放进瓶里——先抬到瓶口以上，横着挪过去，再（等玻璃片推开）从瓶口慢慢放下去
        const d = hyp(P, tgt), top = inside >= 0 || P.y > RIM - 0.002 || f.at !== 'tray' ? LIFT_Y : P.y, k = JARS.findIndex((q) => hyp(P, q) < NECK_R);
        if (d > 0.004 && P.y < top - 0.003) next = P.clone().lerp(new THREE.Vector3(P.x, inside >= 0 && !plateOpen(inside) ? CJ_H - 0.012 : top, P.z), inside >= 0 ? 0.15 : 0.3);
        else if (d > 0.004) next = P.clone().lerp(new THREE.Vector3(tgt.x, Math.max(P.y, tgt.y), tgt.z), 0.3);
        else next = P.clone().lerp(k >= 0 && !plateOpen(k) && P.y > RIM - 0.001 ? new THREE.Vector3(tgt.x, Math.max(P.y, RIM + 0.002), tgt.z) : tgt, k >= 0 ? 0.15 : 0.3);
      }
      JARS.forEach((q, k) => {
        const d0 = hyp(P, q), d1 = hyp(next, q);
        if (P.y < RIM && d0 < NECK_R) { if (d1 > d0) { next.x = P.x; next.z = P.z; } }                      // 在瓶里：先竖直提出瓶口
        else if (P.y < RIM) { if (d1 < KEEP_R && d1 < d0) { next.x = P.x; next.z = P.z; } }                  // 在瓶外、低于瓶口：不往瓶壁里挪
        else if (d1 < KEEP_R && next.y < RIM && !(d0 < 0.004 && plateOpen(k))) next.y = RIM;                  // 在瓶口上方：对准瓶口、玻璃片推开了才放下去
        if (d1 < NECK_R + 0.002 && !plateOpen(k)) { if (P.y >= RIM - 1e-4 && next.y < RIM) next.y = RIM; if (P.y <= CJ_H - 0.008 && next.y > CJ_H - 0.008) next.y = CJ_H - 0.008; }      // 玻璃片还没推开：等一等
      });
      P.copy(next);
    };
    // 玻璃片：纸花正从这个瓶口进出时推开（推到瓶口外面）；纸花落到瓶底、或者没有纸花时盖好（课本图 6-12）
    const wantsOpen = (k) => S.fl.some((f, i) => {
      const P = flowers[i].position;
      if (f.carry && hyp(f.carry, JARS[k]) < 0.05 && hyp(f.carry, JARS[k]) <= hyp(f.carry, JARS[1 - k])) return true;
      return hyp(P, JARS[k]) < KEEP_R && P.y < LIFT_Y + 0.01 && P.distanceTo(flowerPos(f)) > 0.002 && (P.y > 0.012 || f.at !== 'jar' + k);
    });
    const step = (h, t) => {
      // 喷壶、吹风机：对着最近的那朵纸花
      // 松手后喷壶举到花的左后上方、喷头斜朝下对着花喷，侧面看得见水雾
      const spraying = !S.sprayAt && S.sprayT > 0, sp = S.sprayAt || (spraying && SLOTS[S.fl[S.sprayFlower].slot].clone().add(SPRAY_POSE));
      spray.position.lerp(sp || SPRAY_HOME, S.sprayAt ? 1 : 0.25);
      spray.rotation.z += ((spraying ? 0.2 : 0) - spray.rotation.z) * 0.25;
      const fi = spraying ? S.sprayFlower : aimed(sp, SPRAY_OFF);
      spray.rotation.y = fi >= 0 ? Math.atan2(SLOTS[S.fl[fi].slot].z - spray.position.z, -(SLOTS[S.fl[fi].slot].x - spray.position.x)) : 0;
      dryer.position.lerp(S.dryerAt || DRYER_HOME, S.dryerAt ? 1 : 0.25);
      const di = aimed(S.dryerAt, DRY_OFF);
      dryer.rotation.y = di >= 0 ? Math.atan2(SLOTS[S.fl[di].slot].z - dryer.position.z, -(SLOTS[S.fl[di].slot].x - dryer.position.x)) : 0;
      if (S.sprayT > 0) {
        S.sprayT -= h;
        const f = S.fl[S.sprayFlower], dst = flowerPos(f);
        spray.updateMatrix(); const noz = NOZ.clone().applyMatrix4(spray.matrix);
        for (let n = Math.floor(h * 320 + Math.random()); n > 0; n--) { const v = dst.clone().add(new THREE.Vector3(rnd(-0.008, 0.008), 0.004, rnd(-0.008, 0.008))).sub(noz).multiplyScalar(2.4 + Math.random()); mistP.spawn({ p: noz.clone(), v, life: 0.4 + Math.random() * 0.2, size: 0.004 + Math.random() * 0.004, alpha: 0.75 }); }
        spray.trig.rotation.z = 0.35 - 0.5 * (Math.sin(S.sprayT * 18) > 0 ? 1 : 0.3);
      }
      if (S.sprayT <= 0) spray.trig.rotation.z = 0.35;
      windMat.opacity += ((di >= 0 ? 0.16 + 0.05 * Math.sin(t * 30) : 0) - windMat.opacity) * 0.3; wind.visible = windMat.opacity > 0.01;
      mistP.update(h, (p, d) => { p.p.addScaledVector(p.v, d); p.v.multiplyScalar(1 - d * 1.5); p.size += d * 0.006; p.alpha = 0.9 * (1 - p.age / p.life); });
      if (di >= 0) {
        const f = S.fl[di]; S.focus = di; dryer.updateMatrixWorld(true); const m = group.worldToLocal(dryer.tiltG.localToWorld(DRY_MOUTH.clone()));
        for (let n = Math.floor(h * 90 + Math.random()); n > 0; n--) heatP.spawn({ p: m.clone(), v: flowerPos(f).clone().add(new THREE.Vector3(rnd(-0.006, 0.006), 0.004, rnd(-0.006, 0.006))).sub(m).multiplyScalar(2.6), life: 0.4 + Math.random() * 0.15, size: 0.008, alpha: 0.7 });
        const to = flowerPos(f).clone().add(new THREE.Vector3(0, 0.004, 0)); wind.position.copy(m); wind.lookAt(group.localToWorld(to.clone())); wind.scale.set(1, 1, m.distanceTo(to));
        f.wet = Math.max(0, f.wet - h * 0.2);
        const lost = Math.max(Math.min(f.acid, h * 0.22), f.acid - f.wet); f.acid -= lost;                // 受热，碳酸分解，二氧化碳跑掉（碳酸在水里：水干了，碳酸也就分解完了）
        if (lost > 0 && Math.random() < lost * 60) leaving.push({ p: flowerPos(f).clone().add(new THREE.Vector3(rnd(-0.008, 0.008), 0.006, rnd(-0.008, 0.008))), size: 0.0032, alpha: 0.9, age: 0 });
      }
      heatP.update(h, (p, d) => { p.p.addScaledVector(p.v, d); p.v.y += 0.02 * d; p.size += d * 0.025; p.alpha = 0.7 * (1 - p.age / p.life); });
      S.fl.forEach((f, i) => {
        const inJar = f.at !== 'tray' && !f.carry;
        if (inJar) { f.inT += h; if (f.wet > 0.3) f.acid += (f.wet - f.acid) * Math.min(1, h * 0.3); }         // CO₂ + H₂O → H₂CO₃（几秒内变红；和特写里分子一个个连上的快慢一致）
        else { f.outT += h; if (f.wet > 0) f.wet = Math.max(0, f.wet - h * 0.004); }                          // 放着慢慢变干（很慢）
        f.peak = Math.max(f.peak, f.acid);
        const fl = flowers[i];
        moveFlower(i);        // 拿起来时也是滑上去的，不是一下跳到手里
        fl.mat.color.copy(PURPLE).lerp(RED, clamp(f.acid * 1.15, 0, 1)).lerp(WETK, f.wet * 0.38);        // 湿了颜色明显深一些
        fl.beads.children.forEach((b) => { b.visible = b.userData.k < f.wet; });
        fLabels[i].loc(group, fl.position.x, fl.position.y + 0.016, fl.position.z).show(f.at === 'tray' || !!f.carry);
        const L = S.logged;
        if (!inJar && f.wet > 0.6 && f.acid < 0.05 && f.outT > 2 && !L.wetOnly) { L.wetOnly = i + 1; log([`纸花 ${ROMAN[i]}：喷水`, '不变色（还是紫色）', '水不能使石蕊变红']); done('f1'); status(`纸花 ${ROMAN[i]} 喷了水，还是<b>紫色</b>。接着把一朵<b>干燥的</b>纸花放进集气瓶。`); }
        if (inJar && f.wet < 0.1 && f.inT > 3 && !L.dryIn) { L.dryIn = 1; log([`纸花 ${ROMAN[i]}：干燥的，放进二氧化碳`, '不变色（还是紫色）', '二氧化碳不能使石蕊变红']); done('f2'); status(`干燥的纸花 ${ROMAN[i]} 在二氧化碳里，还是<b>紫色</b>。再给另一朵纸花<b>喷上水</b>，放进另一个集气瓶。`); }
        if (inJar && f.acid > 0.6 && !L.red) { L.red = 1; log([`纸花 ${ROMAN[i]}：喷水后放进二氧化碳`, '<b>变红</b>', '二氧化碳和水<b>反应</b>，生成了能使石蕊变红的物质']); done('f3'); status(`喷过水的纸花 ${ROMAN[i]} 在二氧化碳里<b>变红</b>了。把它拿出来放回托盘，用<b>吹风机</b>吹干。`); }
        if (f.peak > 0.6 && f.acid < 0.08 && !inJar && !L.back) { L.back = 1; log([`纸花 ${ROMAN[i]}：取出吹干`, '又变成<b>紫色</b>', '生成的物质（碳酸）不稳定，受热分解了']); done('dry'); status(`吹干以后，纸花 ${ROMAN[i]} 又变回了<b>紫色</b>。看看左边的问题。`); if (W && !S.demo) W.t1.open(); }
      });
      // 集气瓶的玻璃片：纸花从瓶口进出时推开，放好以后盖上
      cjars.forEach((j, k) => { j.plate.position.x += ((wantsOpen(k) ? PLATE_DIR[k] * PLATE_OPEN : 0) - j.plate.position.x) * 0.2; });
      for (let i = leaving.length - 1; i >= 0; i--) { const d = leaving[i]; d.age += h; d.p.y += h * 0.03; d.alpha = Math.max(0, 0.9 - d.age * 0.6); if (d.age > 1.5) leaving.splice(i, 1); }
      const dark = [];
      cjars.forEach((j, k) => { for (const d of cjDots[k]) { const th = d.th + Math.sin(t * 0.4 + d.ph) * 0.15, rr = (CJ_R - 0.004) * d.u; d.p.set(j.position.x + Math.cos(th) * rr, CJ_H * d.y, j.position.z + Math.sin(th) * rr); dark.push(d); } });
      for (const d of leaving) dark.push(d);
      // 反应特写
      if (S.focus >= 0) {
        const f = S.fl[S.focus], st = flowerState(S.focus);
        if (mw.isOpen && rxFor !== S.focus) { rxFor = S.focus; mw.reset(st); } else mw.set(st);
        const fp = flowers[S.focus].position;
        goBtn.loc(group, fp.x, fp.y + 0.03, fp.z).show(!f.carry && !mw.isOpen && !bar.playing);
      } else goBtn.show(false);
      mw.update(h);
      darkP.list = dark; darkP.update(0, () => true);
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.22, d: 0.14, h: 0.1 },
      view: { elev: 30, azim: -4, lookY: 0.3, frameMargin: 1.1 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const t1 = think({
          title: '想一想',
          ctx: () => S.rows.map((r) => `<div>${r[0]}：${r[1]}</div>`).join(''),
          q: '喷过水的纸花放进二氧化碳才变红，吹干以后又变回紫色——为什么？',
          options: ['二氧化碳和水反应生成了碳酸，碳酸使石蕊变红；碳酸不稳定，吹干时分解了', '二氧化碳本身使石蕊变红', '水使石蕊变红'],
          wrong: ['看你的记录：干燥的纸花放进二氧化碳，变红了吗？', '看你的记录：只喷水的纸花，变红了吗？'],
          ok: '对：CO₂ + H₂O ══ H₂CO₃，碳酸使紫色石蕊变红；碳酸很不稳定，H₂CO₃ ══ CO₂↑ + H₂O，二氧化碳跑掉，纸花又变紫。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); },
          status: (m) => ui.status(m),
        });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['做了什么', '现象', '说明']);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'),
          buttons([0, 1, 2].map((i) => ({ text: `给纸花 ${ROMAN[i]} 喷水`, ghost: true, onClick: () => A.wet(i) }))).el,
          buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：两个集气瓶里都盛满了二氧化碳（深灰点）。纸花变色、吹干的快慢是示意。' });
        ui.controls.append(t1.el, next, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, t1, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('图 6-12：托盘上三朵用石蕊溶液染成紫色的干燥纸花，后面两个集气瓶里盛满了二氧化碳，左边喷壶、右边吹风机。可以先看<b>老师演示</b>，也可以直接动手。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { mw.dispose(); bar.dispose(); darkP.dispose(); heatP.dispose(); mistP.dispose(); },
      debug: { get S() { return S; }, A, bar, picks: { spray: sprayPick, dryer: dryerPick, f1: flowers[0].pick, f2: flowers[1].pick, f3: flowers[2].pick },
        qa: qaFlow(drag, [
          { name: '给 I 喷水', drag: sprayPick, to: sprayTo(0), wait: 3 },
          { name: '干的 II 放进瓶 1', drag: flowers[1].pick, to: intoJar(0), wait: 4 },
          { name: '给 III 喷水', drag: sprayPick, to: sprayTo(2), wait: 1 },
          { name: 'III 放进瓶 2', drag: flowers[2].pick, to: intoJar(1), wait: 6 },
          { name: 'III 拿回托盘', drag: flowers[2].pick, to: toSlot(2), wait: 1 },
          { name: '吹风机对着 III', hold: dryerPick },
          { name: '吹', run: () => A.dryerAt(dryerTo(2)()), wait: 5 },
          { name: '放下吹风机', release: dryerPick, wait: 1 },
          { name: '答想一想', run: () => W.t1.el.querySelector('button').click(), wait: 1 },
        ]) },
    };
  },
};
