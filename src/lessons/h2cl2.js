// 人教版高中化学必修第一册第 45 页【实验2-7】（图2-12 H₂ 在 Cl₂ 中燃烧）：在空气中点燃氢气，然后把导管缓慢伸入盛满氯气的集气瓶中，观察现象。
// 课本：可以看到，纯净的 H₂ 在 Cl₂ 中安静地燃烧，发出苍白色火焰。反应生成的气体是 HCl，它在空气中与水蒸气结合，呈现雾状。H₂ + Cl₂ 点燃══ 2HCl
//   注意：氯气有毒（同页“注意”框）；实验图标：护目镜、明火、排风、洗手。
// 模型（示意，界面上写明）：
//   集气瓶约 250 mL，盛满 Cl₂（黄绿色）。纯净的 H₂ 从导管尖嘴出来，流量按 3 mL/s，画面时间加快 2 倍（6 mL/s）。
//   瓶里的气体分两层（火灾里常用的“两区模型”）：火焰以上被火焰搅动、受热的一层（混在一起），火焰以下没动过的冷的一层。
//     导管往下伸，火焰经过的冷气体并进上层；燃烧按 H₂ + Cl₂ ══ 2HCl 消耗上层的 Cl₂（体积 1 : 1 : 2）。
//     上层被加热，温度向高出室温约 60 K 趋近（时间常数 2 s，示意）；多出来的气体（受热膨胀 + 每燃烧 1 体积 H₂ 多出 1 体积）从瓶口出去：
//     热的生成物 HCl 先升到瓶口（先出去的是 HCl，在空气中与水蒸气结合成白雾），不够时才挤出没反应的 Cl₂。
//   做错的后果（都按这个模型算）：导管伸得太快 → 一下子并进一大块冷的 Cl₂，受热膨胀挤出黄绿色的氯气；
//     停在瓶的上部 → 上层的 Cl₂ 烧完（Cl₂ 少于 10% 时火焰熄灭，示意），瓶下部还是黄绿色；
//     没点燃就伸进去 → 没有火焰，氢气流进瓶里和氯气混着（不反应）；混进的 H₂ 超过约 4% 再伸进火焰，瓶里闪一下（混合气体遇火剧烈反应）；
//     玻璃片推开、迟迟不伸进去 → 氯气从瓶口慢慢扩散出去（时间常数 150 s，示意）。
//   氢气在空气中燃烧：淡蓝色火焰（初中化学，人教版九年级上册）；在 Cl₂ 中：苍白色（课本）。
//   钻进去看（kit/h2cl2-parts.js）：H₂ + Cl₂ → 2HCl，原子守恒；共用电子对偏向氯原子（课本第 24 页）。
import * as THREE from 'three';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs, mountXuean, moreBox } from './kit/chemlesson.js';
import { draggable, clamp } from './kit/interact.js';
import { gasJar, glassTube, rubberTube, chemLamp } from './kit/chem.js';
import { lampCap } from './kit/labops.js';
import { flame2, smoke2 } from './kit/chemfx.js';
import { micro } from './kit/microworld.js';
import { h2cl2Scene } from './kit/h2cl2-parts.js';
import { textPlate } from './kit/props.js';
import { sfx } from './kit/audio.js';
import { h } from '../ui/Panel.js';

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const JX = 0.012, JR = 0.032, JH = 0.085, AX = JX - 0.005;          // 集气瓶：中心、半径、高；导管尖嘴伸进瓶里时的 x（贴着瓶口左半边）
const LX = 0.1, LS = 0.75;          // 酒精灯（在集气瓶右边：导管的水平段朝左，乳胶管从左后方来）
const ARM = 0.07, UW = 0.012, UD = 0.0165, HL = 0.045;          // 导管：长臂（尖嘴以上）、U 形弯的宽、弯底在尖嘴以下多少、水平段长
const TIP_LAMP = V(LX + 0.002, 0.083), TIP_MOUTH = V(AX, JH + UD + 0.006), TIP_HOME = V(-0.035, 0.055), TIP_MIN = 0.03, MIX = 0.02, CLEAR_Y = JH + UD + 0.005;          // CLEAR_Y：尖嘴在这个高度以上，整段导管（连 U 形弯）都在瓶口以上          // MIX：火焰下面也被搅动的一段（示意）
const LEAK_BAD = 60, V_OK = 0.6, V_MAX = 0.75, V_SEEN = 1.0, CL_SEEN = 3;          // 玻璃片敞着漏掉这么多 Cl₂（mL，室温折算）就要换瓶；瓶口出气里 Cl₂ 超过 CL_SEEN mL/s 时画面里看得见黄绿色（和卡片、警示用同一个口径）
// 下插节奏（cm/s）：用这套模型从瓶口恒速伸入复算（/tmp 里的脚本照搬了下面的模型）——0.75 以内不挤出氯气；0.8 挤出约 0.7 mL、0.9 约 2.6 mL、1.0 约 4.6 mL，出气里的 Cl₂ 不超过约 2.7 mL/s，瓶口看不出黄绿色；
//   1.1 起超过 3 mL/s、看得见黄绿色的氯气冲出来（1.1 约 6.8 mL，1.3 约 9.7 mL）。所以建议每秒约半厘米（≤ 0.6），超过 0.75 提示会挤出少量氯气，超过 1.0 提示会冲出。老师演示也按这个节奏匀速伸入。
const V0 = 250, T0 = 293, DT_HOT = 60, TAU = 2, Q = 6, CL_MIN = 0.1, LEAK_TAU = 150, H2_FLASH = 0.04;
const INTRO = '开始前：戴好护目镜，开启排风；要用明火，束好长发、系紧宽松衣物（课本实验图标，第 9 页）。集气瓶里盛满了黄绿色的氯气（有毒），盖着玻璃片；导管里通着纯净的氢气（已经验纯：点燃氢气前一定要检验其纯度），酒精灯已经点燃。先抓住导管上面的横段，在空气中点燃氢气。';
const CL2 = 0xc9d64a;          // 氯气：黄绿色（和氯气漂白那课一样）
const PLATE_OPEN = 0.001 + (JR * 0.72 * 2 + 0.016) / 2;          // 玻璃片推开：左边缘停在瓶口中心右边 1 mm（像课本图里那样，导管从左半边伸进去）

export default {
  id: 'h2cl2',
  fig: '图2-12',
  title: 'H₂在Cl₂中燃烧',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '氢气在空气里燃烧，发出淡蓝色火焰。把燃着的氢气伸进盛满氯气的集气瓶里，会怎样？',
    hint: '课本第 45 页【实验2-7】。先猜，再动手。',
    options: ['继续燃烧，火焰颜色变了', '立刻熄灭：没有氧气不能燃烧', '照样燃烧，和在空气里一模一样'],
    answer: 0,
  },
  need: '在空气中点燃氢气，然后把导管缓慢伸入盛满氯气的集气瓶中，观察现象（氯气有毒）',
  conclusion: {
    page: 49, rect: [64, 433, 378, 498],
    quote: '可以看到，纯净的H2在Cl2中安静地燃烧，发出苍白色火焰。反应生成的气体是HCl，它在空气中与水蒸气结合，呈现雾状。',
    formula: 'H₂ + Cl₂ 点燃══ 2HCl',
    why: '燃着的氢气伸进氯气里，<b>照样燃烧</b>：安静地燃烧，火焰从空气里的淡蓝色变成<b>苍白色</b>。瓶里的黄绿色越来越浅——氯气被消耗了；生成的 HCl 从瓶口出来，和空气里的水蒸气结合成<b>白雾</b>。<br>氯气就能支持氢气燃烧，氧气无须参与这条反应：<b>燃烧不一定要有氧气参加</b>。H 和 Cl 组成共用电子对，电子对偏向氯原子——氢元素 0 → +1，被氧化；氯元素 0 → −1，被还原（课本第 24 页）。燃烧的本质是氧化还原反应。',
    src: '课本第 45 页 · 第二章 第二节 氯及其化合物',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (key, row) => { if (S.said[key]) return; S.said[key] = true; if (!S.demo) W?.tbl.add(row); };
    paperSheet(group, { w: 0.3, d: 0.17, x: 0, z: 0 });
    const plate = (text, w, hh) => textPlate(text, { w, h: hh, color: '#23293a', bg: '#fffaf0', font: `bold ${Math.floor(Math.min(0.8 * 512 * hh / w, 0.82 * 512 / text.length))}px "Songti SC", serif` });

    // ================= 集气瓶（盛满氯气）、玻璃片、瓶里的黄绿色（分成一片片，按高度显示浓度）=================
    const jar = gasJar({ r: JR, h: JH }); jar.position.set(JX, 0, 0); group.add(jar); jar.setWater(0);
    const NECK = JR * 0.72, rAt = (y) => (y < JH * 0.78 ? JR : y < JH * 0.9 ? JR + (NECK - JR) * (y - JH * 0.78) / (JH * 0.12) : NECK) - 0.0004;
    const NS = 20, Y0 = 0.0015, Y1 = JH - 0.001, slices = [];
    for (let i = 0; i < NS; i++) {
      const a = Y0 + (Y1 - Y0) * i / NS, b = Y0 + (Y1 - Y0) * (i + 1) / NS;
      const g = new THREE.LatheGeometry([new THREE.Vector2(0.0002, a), new THREE.Vector2(rAt(a), a), new THREE.Vector2(rAt(b), b), new THREE.Vector2(0.0002, b)], 32);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: CL2, transparent: true, opacity: 0.42, depthWrite: false })); m.renderOrder = 8; m.raycast = () => {}; m.userData.yc = (a + b) / 2; jar.add(m); slices.push(m);
    }
    const jarLab = plate('Cl₂', 0.016, 0.0074); jarLab.position.set(0, 0.012, JR + 0.0016); jar.add(jarLab);
    const platePick = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.008, 0.062), new THREE.MeshBasicMaterial({ visible: false })); platePick.userData.pick = true; jar.plate.add(platePick);
    const frameBox = new THREE.Mesh(new THREE.BoxGeometry(0.235, 0.17, 0.02), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })); frameBox.position.set(0.01, 0.085, 0); frameBox.raycast = () => {}; group.add(frameBox);          // 取景用：导管点火、伸进瓶口时会升高、玻璃片会推到右边，都要在画面里
    const jarPick = new THREE.Mesh(new THREE.CylinderGeometry(JR + 0.004, JR + 0.004, JH * 0.66, 12), new THREE.MeshBasicMaterial({ visible: false })); jarPick.position.y = JH * 0.33; jarPick.userData.pick = true; jar.add(jarPick);          // 点瓶身换一瓶（不盖住瓶口的玻璃片）
    const flashBall = new THREE.Mesh(new THREE.SphereGeometry(0.024, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff6d8, transparent: true, opacity: 0, depthWrite: false })); flashBall.position.set(0, JH * 0.55, 0); flashBall.renderOrder = 12; flashBall.raycast = () => {}; jar.add(flashBall);

    // ================= 酒精灯（已经点燃，灯帽放在旁边）=================
    const lamp = chemLamp(); lamp.scale.setScalar(LS); lamp.position.set(LX, 0, 0); group.add(lamp);
    const capper = lampCap(group, lamp, { off: V(LX + 0.012, 0, -0.05) }); capper.snap(true); lamp.flame.setOn(true);

    // ================= 导管（原点在尖嘴，尖嘴朝上；U 形弯、长臂、水平段）+ 乳胶管通到 H₂ =================
    const tube = new THREE.Group(); group.add(tube);
    const pts = [V(0, 0), V(0, -0.008)];
    for (let i = 1; i <= 8; i++) { const a = (i / 8) * Math.PI; pts.push(V(-UW / 2 + (UW / 2) * Math.cos(a), -0.008 - (UW / 2) * Math.sin(a))); }
    pts.push(V(-UW, ARM * 0.5), V(-UW, ARM - 0.008));
    for (let i = 1; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); pts.push(V(-UW - 0.008 + 0.008 * Math.cos(a), ARM - 0.008 + 0.008 * Math.sin(a))); }
    pts.push(V(-UW - HL * 0.5, ARM), V(-UW - HL, ARM));
    const glass = glassTube(pts, { r: 0.0025 }); tube.add(glass);
    const tubePick = new THREE.Mesh(new THREE.BoxGeometry(HL + 0.012, 0.036, 0.016), new THREE.MeshBasicMaterial({ visible: false })); tubePick.position.set(-UW - HL / 2 + 0.002, ARM - 0.012, 0); tubePick.userData.pick = true; tube.add(tubePick);          // 拿导管：抓水平段和长臂上端
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, HL, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })); handle.rotation.z = Math.PI / 2; handle.position.set(-UW - HL / 2 - 0.004, ARM, 0); handle.raycast = () => {}; tube.add(handle);          // 步骤栏的提示光圈套在抓的那段横管上
    const fireAir = flame2({ w: 0.009, h: 0.032, core: 0xf1f6ff, mid: 0xa9c4ff, edge: 0x7ea4f4, blue: 0.7, blueColor: 0x5b8cff, alpha: 0.6, glowK: 0.2 }); fireAir.position.y = 0.0015; fireAir.setOn(false); tube.add(fireAir);          // 空气中：淡蓝色
    const fireCl = flame2({ w: 0.011, h: 0.036, core: 0xffffff, mid: 0xf7f7f1, edge: 0xcfd3c4, alpha: 0.95, glowK: 0.25 }); fireCl.position.y = 0.0015; fireCl.setOn(false); tube.add(fireCl);          // 氯气中：苍白色
    let hose = null, hoseAt = null;
    const HOSE_END = V(-0.1, 0.0035, -0.07);          // 乳胶管从导管的水平段往左后方垂到桌上
    const buildHose = () => {
      const A = tube.position.clone().add(V(-UW - HL + 0.008, ARM));
      if (hoseAt && hoseAt.distanceTo(A) < 0.0008) return; hoseAt = A.clone();
      if (hose) { group.remove(hose); hose.geometry.dispose(); }
      hose = rubberTube([A, A.clone().add(V(-0.012, 0, -0.006)), A.clone().add(V(-0.016, -0.012, -0.03)), V((A.x + HOSE_END.x) / 2, Math.max(0.03, A.y * 0.35), -0.08), HOSE_END.clone().add(V(0, 0.004, 0)), HOSE_END.clone().add(V(0, 0, -0.012))], { r: 0.0024 }); group.add(hose);
    };
    const hoseLab = plate('纯净的 H₂ →', 0.036, 0.008); hoseLab.rotation.x = -Math.PI / 2; hoseLab.position.set(-0.088, 0.0012, -0.042); group.add(hoseLab);

    // ================= 瓶口出来的东西：白雾（HCl + 水蒸气）、黄绿色的氯气 =================
    const mist = smoke2({ max: 160, color: 0xeef1f2, opacity: 0.85 }); mist.mesh.renderOrder = 13; group.add(mist.mesh);
    const clOut = smoke2({ max: 200, color: 0xbccb2c, opacity: 1 }); clOut.mesh.renderOrder = 13; group.add(clOut.mesh);
    const MOUTH_OUT = V(JX - 0.011, JH + 0.004, 0);
    const warning = tag('', 'pill');
    const pace = tag('', 'pill');
    const card = tag('', 'cond'); card.px = [70, -20];
    const aim = new THREE.Mesh(new THREE.RingGeometry(0.0062, 0.0078, 32), new THREE.MeshBasicMaterial({ color: 0xff6a3d, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide })); aim.rotation.x = -Math.PI / 2; aim.position.set(AX, JH + 0.0035, 0); aim.renderOrder = 12; aim.raycast = () => {}; aim.visible = false; group.add(aim);          // 瓶口左半边：导管从这里伸进去

    // ================= 状态 =================
    // 瓶里的气体分三层，每层分别记 H₂、Cl₂、HCl、空气（mL，折算到室温）：
    //   T 顶上的热烟气层（火焰生成的 HCl 先升到这里）、Fr 火焰周围的热区（导管伸下去时并进来的气体，还没被烟气占到）、L 火焰下面没动过的冷气体。
    //   层内是混合的：出气、扩散都按这一层的组成按比例扣量；燃烧、闪燃按火焰附近那一层的组成判断。
    const gas = (cl = 0) => ({ h2: 0, cl, hcl: 0, air: 0 });
    const fresh = () => ({ demo: false, near: false, said: {}, clock: 0, tip: TIP_HOME.toArray(), drag: false, motion: null, lit: false, po: 0, open: false,
      zone: 0, T: gas(), Fr: gas(), L: gas(V0), Tu: T0, burned: 0, burnT: 0, out: { h2: 0, cl: 0, hcl: 0 }, burnCl: 0, burnClAt: 0, leakCl: 0, rCl: 0, rHcl: 0,
      outBy: '', seenCl: false, flashed: false, mixed: false, rnd: { cl2: false, mist: false, fade: false }, flash: 0, openT: 0, inT: 0, vIn: 0, vT: 0, lastY: TIP_HOME.y });
    S = fresh();
    const sum = (g) => g.h2 + g.cl + g.hcl + g.air;
    const frac = (g, k) => g[k] / Math.max(1e-6, sum(g));
    const take = (g, v) => { const s = sum(g), o = gas(); if (s <= 1e-9 || v <= 0) return o; const k = Math.min(1, v / s); for (const c of ['h2', 'cl', 'hcl', 'air']) { o[c] = g[c] * k; g[c] -= o[c]; } return o; };
    const addTo = (g, o) => { for (const c of ['h2', 'cl', 'hcl', 'air']) g[c] += o[c]; };
    const tipIn = () => S.tip[1] < JH - 0.003 && Math.abs(S.tip[0] - AX) < 0.002;
    const inMouth = () => Math.abs(S.tip[0] - AX) < 0.002 && S.tip[1] < CLEAR_Y - 0.001;          // 导管还有一段在瓶口里（U 形弯也算）：盖玻璃片、换瓶都要先提出来
    const inFlame = (p) => Math.abs(p.x - LX) < 0.0055 && p.y > 0.058 && p.y < 0.09;          // 尖嘴在酒精灯看得见的火焰里（火焰约 3 mm 宽，加上导管口的半径）
    const nearFlame = () => (S.zone > 0.005 ? (sum(S.Fr) > 1 ? S.Fr : S.T) : S.L);          // 火焰附近那一层
    const total = (k) => S.T[k] + S.Fr[k] + S.L[k];
    const badRound = () => S.outBy === 'high' || S.seenCl || S.leakCl > LEAK_BAD || S.flashed || S.mixed;          // 这一轮做坏了：不能当正常实验完成，要换瓶重做
    const spoiled = () => badRound() || S.outBy === 'used' || total('h2') > 2;          // 可以点集气瓶换一瓶（做坏了 / 用完了）

    // ---- 拖导管：尖嘴跟着走；不能穿过瓶壁、玻璃片、酒精灯 ----
    const overJar = (x) => x + 0.0025 > JX - JR - 0.003 && x - UW - 0.0025 < JX + JR + 0.003;
    const overLamp = (x) => x + 0.0025 > LX - 0.03 && x - UW - 0.0025 < LX + 0.03;
    const constrain = (p) => {
      let x = clamp(p.x, -0.13, 0.16), y = clamp(p.y, UD + 0.003, 0.2);
      const above = JH + UD + 0.005, inside = S.tip[1] < above - 0.001 && Math.abs(S.tip[0] - AX) < 0.001;
      if (inside && y < above) x = AX;          // 在瓶里：只能上下（先提出来才能横着挪）
      else if (S.open && Math.abs(x - AX) < 0.014 && (inside || S.tip[1] >= above - 0.001)) x = AX;          // 对准瓶口左半边：吸过去
      if (overJar(x)) y = Math.max(y, x === AX && S.open ? TIP_MIN : S.open ? above : JH + 0.0028 + UD + 0.002);
      if (overLamp(x)) y = Math.max(y, 0.0585 + UD + 0.003);
      return V(x, y, 0);
    };
    const A = {
      tapPlate() {
        if (S.open) {
          if (inMouth()) { status('导管还在瓶口里，玻璃片推不回来。先把导管整段提出瓶口。'); return; }
          S.open = false; if (!bar.has('insert') && !S.demo) bar.undo('plate');
          status(bar.has('insert') ? '盖上了玻璃片。' : '盖上了玻璃片。要伸入导管，先点一下<b>玻璃片</b>推到一边。'); return;
        }
        S.open = true; S.openT = 0; done('plate'); sfx.clink?.({ freq: 1600, gain: 0.015 });
        status(S.lit ? '玻璃片推到一边了。把燃着的导管对准瓶口<b>左半边</b>（橙色圈），<b>缓慢</b>伸进去。' : '玻璃片推到一边了。氯气有毒，别让它一直敞着：先把<b>导管</b>拖到酒精灯火焰上，点燃氢气。');
      },
      // 回头路：这瓶做坏了（火焰停在上部熄灭、氯气冲出去或漏掉太多、混进了氢气 / 闪燃过），点集气瓶换一瓶新的满瓶氯气。观察记录保留
      swapJar() {
        if (!spoiled()) return;
        if (inMouth()) { status('导管还在瓶口里：先抓住导管上面的横段，把整段导管提出瓶口，再点集气瓶换一瓶。'); return; }
        const bad = badRound(), f = fresh();
        if (!S.demo && bad) W?.tbl.add(['点集气瓶，换了一瓶新的氯气', '上一瓶不再用', '重新做一遍：缓慢伸入，再观察']);
        for (const k of ['zone', 'T', 'Fr', 'L', 'Tu', 'burned', 'burnT', 'out', 'burnCl', 'burnClAt', 'leakCl', 'rCl', 'rHcl', 'outBy', 'flashed', 'mixed', 'rnd', 'flash', 'openT', 'inT', 'open', 'po', 'vIn', 'vT', 'seenCl']) S[k] = f[k];          // 导管已经整段提出瓶口了，留在手放的地方
        for (const k of ['fastMsg', 'leakMsg', 'unlitMsg', 'insertMsg', 'spoilMsg', 'obsDone', 'slowMsg', 'little']) delete S.said[k];
        mist.clear(); clOut.clear(); jar.plate.position.x = 0; sfx.clink?.({ freq: 1300, gain: 0.02 });
        if (bad && !S.demo) bar.undo('plate', 'insert', ...(S.said.obsDone ? [] : ['observe']));
        if (!S.lit && !S.demo) bar.undo('light');
        status(`换了一瓶新的满瓶氯气（盖着玻璃片），观察记录还在。${S.lit ? '导管还燃着：' : '先抓住导管上面的横段，把尖嘴拖到酒精灯火焰上点燃，再'}推开玻璃片，把导管<b>缓慢</b>伸到瓶的下部。`);
      },
      reset() { if (bar.playing) bar.stop(); S = fresh(); sync(); mic.close(); back(); W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; W.ui.relock(); } bar.undo('light', 'plate', 'insert', 'observe'); fixSaid = null; bar.say(null); status(INTRO); },
    };
    const sync = () => { mist.clear(); clOut.clear(); tube.position.fromArray(S.tip); jar.plate.position.x = S.po * PLATE_OPEN; fireAir.setOn(false); fireCl.setOn(false); hoseAt = null; buildHose(); };
    sync();
    const drag = draggable(group, [
      { obj: tubePick, plane: 'xy', offset: 0, keepOffset: true, anchor: tube,
        hint: () => (!S.lit ? '导管：抓住这段横管，把尖嘴拖到酒精灯火焰上点燃氢气' : tipIn() ? '导管：慢慢往下伸（每秒约半厘米）/ 往上提' : '导管：拖到瓶口左半边，再缓慢往下伸'),
        onStart: () => { S.drag = true; S.motion = null; },
        onDrag: (p) => { S.tip = constrain(p).toArray(); },
        onEnd: () => { S.drag = false; const p = V(...S.tip); if (!(inFlame(p) || (Math.abs(p.x - AX) < 0.0005 && (S.open || p.y < CLEAR_Y)))) goHome(p); } },          // 松手：在火焰里、对准 / 伸在瓶口里就留在那儿；别的地方很快放回原处
    ], { tip: tag('', 'pill'), taps: [{ obj: jarPick, enabled: () => spoiled() && !bar.playing, hint: () => (badRound() ? '集气瓶：这瓶不能再用了，点一下换一瓶新的氯气' : '集气瓶：点一下换一瓶新的氯气，再做一遍'), onTap: () => A.swapJar() }, { obj: platePick, hint: () => (S.open ? '玻璃片：点一下盖回去' : '玻璃片：点一下推到一边'), onTap: () => A.tapPlate() }] });
    // 放回原处：先抬到够高（越过集气瓶、酒精灯火焰），平移到原处上方，再放下；约 0.45 秒走完
    const goHome = (p) => {
      const span = (a, b) => Math.max(p.x, TIP_HOME.x) + 0.0025 > a && Math.min(p.x, TIP_HOME.x) - UW - 0.0025 < b;
      let y = Math.max(p.y, TIP_HOME.y);
      if (span(JX - JR - 0.003, JX + JR + 0.003)) y = Math.max(y, CLEAR_Y + 0.001);
      if (span(LX - 0.03, LX + 0.03)) y = Math.max(y, 0.095);
      const way = [V(p.x, y), V(TIP_HOME.x, y), TIP_HOME.clone()];
      let len = 0, q = p; for (const w of way) { len += q.distanceTo(w); q = w; }
      S.motion = { way: way.map((w) => w.toArray()), v: Math.max(0.15, len / 0.45) };
    };
    const act = demoActs(drag, group);
    const compOf = (g) => { const s = Math.max(1e-6, sum(g)); return { h2: g.h2 / s, cl: g.cl / s, hcl: g.hcl / s, air: g.air / s }; };
    const mic = micro({ tag, look, back, group, scene: h2cl2Scene(), at: () => V(JX, JH + 0.025, 0), btnAt: () => V(JX + 0.048, 0.035, 0), label: '钻进去看',
      state: () => { const g = tipIn() ? (S.lit || S.outBy ? nearFlame() : (S.zone > 0.005 ? S.T : S.L)) : null; return { mode: tipIn() ? 'jar' : 'air', lit: S.lit, comp: g ? compOf(g) : null, out: !!S.outBy && tipIn() }; },
      key: () => `${tipIn()}|${S.lit}|${!!S.outBy}`, bar: () => bar, scale: 0.0068, lookD: [0.04, 0.36, 1], dist: 0.27 });

    // 老师演示里匀速往下伸（和学生拖导管走同一套处理函数）：从 k = t0 到 t1，尖嘴从现在的位置匀速降到 y1
    const tubeDown = (y1, t0, t1) => { let st = null; return (k) => {
      if (k < t0) { st = null; return; } if (st?.ended) return;
      const d = drag.items().find((x) => x.obj === tubePick);
      if (!st) { st = { y0: S.tip[1] }; d.onStart(V(...S.tip)); }
      const u = Math.min(1, (k - t0) / (t1 - t0)); d.onDrag(V(AX, st.y0 + (y1 - st.y0) * u, 0));
      if (u >= 1) { st.ended = true; d.onEnd(true); } }; };
    const tubePath = (ptsFn, t0, t1) => act.path(tubePick, [() => V(...S.tip), ...ptsFn], { t0, t1, release: t1 + 0.02 });          // 从尖嘴现在的位置出发（拖动给的是尖嘴的位置，不是拾取盒的中心）
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'light', title: '在空气中点燃氢气', todo: '抓住<b>导管上面的横段</b>，把尖嘴拖进酒精灯的火焰里，在空气中点燃氢气。看火焰的颜色。', target: () => (spoiled() && !inMouth() ? jar : handle) },
        { id: 'plate', title: '推开玻璃片', todo: '点一下集气瓶上的<b>玻璃片</b>，推到一边。氯气有毒，要在排风下做！', target: () => jar.plate },
        { id: 'insert', title: '缓慢伸入', todo: '把燃着的导管对准瓶口<b>左半边</b>，<b>缓慢</b>伸入盛满氯气的集气瓶中，一直伸到下部（本活页的模型里：每秒约半厘米，十几秒伸到下部）。', target: () => (spoiled() ? (inMouth() ? handle : jar) : tipIn() ? null : handle) },
        { id: 'observe', title: '观察', todo: '看：火焰什么颜色？瓶口有什么？瓶里的黄绿色怎样变？也可以<b>钻进去看</b>。', target: () => (spoiled() ? (inMouth() ? handle : jar) : null) },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { sync(); mic.close(); },
            view: { save: () => (mic.isOpen ? { mic: true } : null), restore: (v) => { if (v?.mic) mic.open(); } } }),
          shots: [
            { cap: '戴好护目镜，开启排风。在空气中点燃氢气：尖嘴口是淡蓝色的火焰。', dur: 6, cam: [[0.03, 0.1, 0], [0.04, 0.3, 1], 0.46], during: tubePath([() => V(TIP_HOME.x, 0.11), () => V(TIP_LAMP.x, 0.11), () => TIP_LAMP.clone()], 0.05, 0.5) },
            { cap: '推开集气瓶上的玻璃片（氯气有毒，在排风下做）。', dur: 3, cam: [[JX, 0.09, 0], [0.04, 0.35, 1], 0.34], during: act.tap(platePick, 0.3) },
            { cap: '把燃着的导管移到瓶口左半边。', dur: 4, cam: [[JX + 0.01, 0.1, 0], [0.04, 0.25, 1], 0.44], during: tubePath([() => V(TIP_LAMP.x, 0.11), () => V(AX, 0.11), () => TIP_MOUTH.clone()], 0.05, 0.85) },
            { cap: '缓慢伸入盛满氯气的集气瓶中：每秒约半厘米，匀速往下（时间加快）。', dur: 10, speed: 2, cam: [[JX + 0.01, 0.08, 0], [0.04, 0.25, 1], 0.42], during: tubeDown(0.03, 0.04, 0.96) },
            { cap: '纯净的 H₂ 在 Cl₂ 中安静地燃烧，发出苍白色火焰；瓶口出现白雾——生成的 HCl 在空气中与水蒸气结合。', dur: 8, cam: [[JX, 0.08, 0], [0.04, 0.2, 1], 0.28] },
            { cap: '钻进去看：H₂ + Cl₂ → 2HCl，共用电子对偏向氯原子。氧气无须参与这条反应：氯气就能支持氢气燃烧。', dur: 10, cam: [[JX, JH + 0.075, 0], [0.04, 0.36, 1], 0.27], enter: () => mic.open(true), during: act.at(0.98, () => mic.close()) },
            { cap: '继续燃烧：瓶里的黄绿色越来越浅——氯气被消耗了；氯气快用完时火焰熄灭（时间加快）。演示完了，换你自己做。', dur: 9, speed: 3, cam: [[JX, 0.06, 0], [0.04, 0.25, 1], 0.32] },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ---- 出气：从顶上一层一层往外出，每层按自己的组成按比例扣量 ----
    let dCl = 0, dHcl = 0, fixSaid = null;
    const outflow = (v, hot) => {
      let rem = v;
      for (const g of S.zone > 0.005 ? [S.T, S.Fr] : [S.L]) {
        if (rem <= 1e-9) break;
        const o = take(g, rem); rem -= sum(o);
        S.out.h2 += o.h2; S.out.cl += o.cl; S.out.hcl += o.hcl; dCl += o.cl; dHcl += o.hcl;
        if (hot && o.cl > 1e-6) { S.burnCl += o.cl; S.burnClAt = S.clock; }
      }
    };

    const step = (dt, t) => {
      S.clock += dt;
      // 导管：松手后放回原处；画面上的导管跟着尖嘴的位置
      if (S.motion) { let go = S.motion.v * dt; const p = V(...S.tip); while (go > 0 && S.motion.way.length) { const g = V(...S.motion.way[0]), L = p.distanceTo(g); if (L <= go) { p.copy(g); go -= L; S.motion.way.shift(); } else { p.lerp(g, go / L); go = 0; } } S.tip = p.toArray(); if (!S.motion.way.length) S.motion = null; }
      tube.position.lerp(V(...S.tip), 1 - Math.exp(-dt * 26)); buildHose();
      S.po += ((S.open ? 1 : 0) - S.po) * Math.min(1, dt * 6); jar.plate.position.x = S.po * PLATE_OPEN;
      lamp.flame.update(t);
      // 点燃：尖嘴碰到酒精灯的火焰
      const tip = V(...S.tip), inJar = tipIn();
      if (!S.lit && inFlame(tip)) {
        S.lit = true; S.outBy = ''; done('light'); sfx.whoosh?.({ freq: 700, gain: 0.05, dur: 0.4 });
        log('air', ['在空气中点燃氢气', '安静地燃烧，<b>淡蓝色</b>火焰', '氢气和空气中的氧气反应（生成水）']);
        status(S.open ? '氢气点燃了：<b>淡蓝色</b>火焰。把导管对准瓶口<b>左半边</b>，<b>缓慢</b>伸进去。' : '氢气点燃了：<b>淡蓝色</b>火焰。点一下<b>玻璃片</b>推到一边，再把导管从瓶口<b>缓慢</b>伸进去。');
      }
      // 下插速度（cm/s，给即时反馈）
      const vNow = Math.max(0, (S.lastY - tip.y) / Math.max(dt, 1e-4) * 100); S.lastY = tip.y;
      if (inJar && S.lit) { S.vIn += (vNow - S.vIn) * Math.min(1, dt * 3); if (vNow > 0.05) S.vT = 1.2; } else S.vIn = 0;
      S.vT = Math.max(0, S.vT - dt);
      // ---- 瓶里的模型 ----
      dCl = 0; dHcl = 0;
      let burning = false;
      if (S.lit && inJar) {
        // 火焰往下走：经过的冷气体并进火焰周围的热区（火焰下面也被搅动一段，燃烧几秒后才到 MIX）
        const z = clamp((JH - tip.y + MIX * clamp(S.burnT / 4, 0, 1)) / (JH - Y0), 0, 1);
        if (z > S.zone) { addTo(S.Fr, take(S.L, (z - S.zone) * V0)); S.zone = z; }
        // 火焰附近混着氢气（先前没点燃时流进来的）：按局部组成判断，够多就一下子反应（闪一下）
        const g0 = nearFlame();
        if (g0.h2 > 0.05) {
          const fh = frac(g0, 'h2'), big = fh >= H2_FLASH && frac(g0, 'cl') >= H2_FLASH, r = Math.min(g0.h2, g0.cl); g0.h2 -= r; g0.cl -= r; g0.hcl += 2 * r; S.burned += r;          // 预混的氢气一下子反应：计入反应量
          if (big) S.Tu = Math.max(S.Tu, T0 + 1.5 * DT_HOT);          // 一下子放热：气体受热膨胀，从瓶口冲出去一股（示意）
          if (big && !S.flashed) { S.flashed = true; S.flash = 1; sfx.whoosh?.({ freq: 260, gain: 0.12, dur: 0.35 }); log('flash', ['先让没点燃的氢气流进瓶里，再伸进火焰', '瓶里<b>猛地闪了一下</b>', '火焰附近氢气和氯气混在一起，遇火剧烈反应，很危险：要先在空气中点燃，再伸入']); status(`瓶里猛地闪了一下：火焰附近的气体里混着约 ${Math.round(fh * 100)}% 的氢气（模型估算），遇火剧烈反应——很危险。<b>先把导管提出来，点一下集气瓶换一瓶新的氯气</b>，按课本先在空气中点燃再伸入。`); }
        }
        const g = nearFlame();
        if (frac(g, 'cl') < CL_MIN) {
          S.lit = false; S.outBy = S.L.cl > 0.25 * V0 ? 'high' : 'used';
          if (S.outBy === 'high') { log('high', ['导管停在瓶的上部', '火焰<b>熄灭</b>了，瓶下部还是黄绿色', '火焰附近氯气不足：Cl₂ 已低于 10%（模型设定的熄火条件）。要一直伸到下部']); status('火焰熄灭了：火焰附近氯气不足（Cl₂ 已低于 10%，模型设定的熄火条件），瓶下部的氯气还没用上。<b>先把导管整段提出瓶口，点一下集气瓶，换一瓶新的氯气</b>，这次一直伸到瓶的下部。'); }
          else { log('used', [`燃烧了：画面约 ${Math.round(S.burnT)} 秒（2 倍速，实际约 ${Math.round(S.burnT * 2)} 秒）`, '火焰附近氯气不足，火焰<b>熄灭</b>', '火焰附近 Cl₂ 已低于 10%（模型设定的熄火条件）：氢气不能再在瓶里燃烧']); if (!badRound() && S.rnd.cl2 && !S.said.obsDone) { S.said.obsDone = true; done('insert'); done('observe'); finish(); } }
        } else {
          const r = Math.min(Q * dt, g.cl); g.cl -= r; S.T.hcl += 2 * r; S.T.h2 += Q * dt - r; S.burned += r; S.burnT += dt; burning = true;          // 生成的 HCl 是热的，先升到顶上
        }
      } else if (inJar) {          // 没点燃就伸进去：氢气流进瓶里（轻，往上走），把瓶里的气体挤出去一些
        const v = Q * dt; S.inT += dt;
        (S.zone > 0.005 ? S.T : S.L).h2 += v; outflow(v, false); if (!S.burnT && !S.outBy && S.inT > 0.3) S.mixed = true;
        if (S.inT > 0.6 && !S.burnT) { log('unlit', ['没点燃就把导管伸进瓶里', '没有火焰，在本模型里<b>看不到反应</b>', '氢气流进瓶里和氯气混在一起（H₂ 和 Cl₂ 在光照或点燃时会反应，课本第 103 页）']); }
        if (S.inT > 0.6 && !S.burnT && !S.said.unlitMsg) { S.said.unlitMsg = true; status('没点燃：氢气流进瓶里，和瓶里的气体混在一起，在本模型里看不到反应（H₂ 和 Cl₂ 在光照或点燃时会反应，课本第 103 页）。瓶里已经混进了氢气，遇火危险——<b>先把导管提出来，点一下集气瓶换一瓶新的氯气</b>。'); }
      }
      S.Tu += ((T0 + (burning ? DT_HOT : 0)) - S.Tu) * Math.min(1, dt / TAU);
      if (S.zone > 0.005) {
        const ex = sum(S.T) + sum(S.Fr) - S.zone * V0 * T0 / S.Tu;
        if (ex > 0) outflow(ex, burning || S.Tu > T0 + 5); else S.T.air -= ex;          // 变凉了：空气从瓶口进来
      }
      // 玻璃片开着、导管不在瓶里：最上面一层的气体慢慢扩散出去，空气进来
      if (S.po > 0.5 && !inJar) {
        S.openT += dt;
        const top = S.zone > 0.005 ? (sum(S.T) > 0.5 ? S.T : S.Fr) : S.L, k = dt / LEAK_TAU;
        for (const c of ['h2', 'cl', 'hcl']) { const d = top[c] * k; top[c] -= d; top.air += d; S.out[c] += d; if (c === 'cl') { S.leakCl += d; dCl += d; } if (c === 'hcl') dHcl += d; }
        if (!S.lit && S.openT > 10 && !S.said.leakMsg) { S.said.leakMsg = true; status('玻璃片一直敞着：氯气会从瓶口慢慢扩散出来——氯气有毒。点燃氢气后尽快伸进去，或者点玻璃片先盖上。'); }
      }
      S.rCl += (dCl / Math.max(dt, 1e-4) - S.rCl) * Math.min(1, dt * 8); S.rHcl += (dHcl / Math.max(dt, 1e-4) - S.rHcl) * Math.min(1, dt * 8);
      // 记录
      if (burning) {
        if (S.burnT > 0.8) S.rnd.cl2 = true;
        if (S.burnT > 0.8) log('cl2', ['把燃着的导管伸入盛满氯气的集气瓶', '照样燃烧：安静地燃烧，火焰变成<b>苍白色</b>', 'H₂ 在 Cl₂ 中燃烧，生成 HCl']);
        if (S.zone > 0.5 && !badRound()) { if (!bar.has('insert') && !S.demo && !S.said.insertMsg) { S.said.insertMsg = true; status('伸到下部了，伸得够慢：瓶口出来的主要是 HCl（白雾）。看火焰的颜色，看瓶口，也看瓶里的颜色。白雾是盐酸小液滴，有刺激性和腐蚀性，不要凑近。'); } done('insert'); }
      }
      if (S.out.hcl > 3 && S.burnT > 1.2) { S.rnd.mist = true; log('mist', ['（看瓶口）', '出现<b>白雾</b>', '生成的 HCl 在空气中与水蒸气结合，呈现雾状（盐酸小液滴，有刺激性、腐蚀性，不要凑近）']); }
      if (S.lit && S.rCl > CL_SEEN && S.burnCl > 1) S.seenCl = true;          // 出气里的氯气多到画面里看得见黄绿色（冲出来）
      if (S.seenCl && S.clock - S.burnClAt > 1 && !S.said.fast) log('fast', ['导管伸得太快', `瓶口冲出<b>黄绿色</b>的氯气（模型估算约 ${Math.round(S.burnCl)} mL）`, '一下子并进一大块冷的氯气，受热膨胀，氯气来不及反应就被挤了出去。氯气有毒：要缓慢伸入（每秒约半厘米）']);
      if (S.seenCl && !S.said.fastMsg) { S.said.fastMsg = true; status('瓶口冲出了<b>黄绿色</b>的氯气！导管伸得太快：瓶里的冷气体一下子受热膨胀，把还没反应的氯气挤了出去——氯气有毒。<b>先把导管整段提出瓶口，点一下集气瓶，换一瓶新的氯气</b>，再每秒约半厘米地伸入。'); if (!S.demo && !S.said.obsDone) bar.undo('insert'); }
      if (!S.seenCl && S.burnCl > 0.3 && S.clock - S.burnClAt > 1.5 && !S.said.little) log('little', ['导管伸得稍快', '瓶口看不出黄绿色', `模型估算约 ${S.burnCl < 1 ? S.burnCl.toFixed(1) : Math.round(S.burnCl)} mL 氯气被挤出瓶口（量少）：再慢一点就不会挤出`]);
      if (S.leakCl > LEAK_BAD && !S.said.spoilMsg) { S.said.spoilMsg = true; status(`玻璃片敞得太久，瓶里的氯气跑掉了约 ${Math.round(S.leakCl)} mL（模型估算，氯气有毒）。<b>这瓶不能再用了：点一下集气瓶，换一瓶新的氯气</b>，推开玻璃片后尽快伸入。`); }
      if (total('cl') < 0.5 * V0 && S.burned > 20) S.rnd.fade = true;
      if (total('cl') < 0.5 * V0 && S.burned > 20) log('fade', ['继续燃烧', '瓶里的<b>黄绿色越来越浅</b>', '氯气不断被消耗']);
      if (S.rnd.cl2 && S.rnd.fade && S.rnd.mist && !badRound() && !S.said.obsDone) { S.said.obsDone = true; done('insert'); done('observe'); finish(); }
      // 要换瓶时，底栏先说提导管、再说点瓶（和光圈一致）
      if (!S.demo) {
        const fx = spoiled() && ['light', 'insert', 'observe'].includes(bar.current) ? (inMouth() ? '先抓住<b>导管上面的横段</b>，把整段导管<b>提出瓶口</b>（U 形弯也要出来）。' : '点一下<b>集气瓶</b>，换一瓶新的氯气。') : null;
        if (fx !== fixSaid) { fixSaid = fx; bar.say(fx); }
      }
      // ---- 画面 ----
      fireAir.setOn(S.lit && !inJar); fireCl.setOn(S.lit && inJar);
      fireCl.setSize(0.75 + 0.25 * clamp((frac(nearFlame(), 'cl') - CL_MIN) / 0.3, 0, 1)); fireAir.update(t); fireCl.update(t);
      // 瓶里的黄绿色：下面冷的一层、火焰周围的热区、顶上的烟气层，各按自己的 Cl₂ 占比
      const yB = JH - S.zone * (JH - Y0), up = sum(S.T) + sum(S.Fr), yT = JH - (JH - yB) * (up > 0.5 ? sum(S.T) / up : 0);
      const cL = frac(S.L, 'cl'), cF = sum(S.Fr) > 0.5 ? frac(S.Fr, 'cl') : frac(S.T, 'cl'), cT = frac(S.T, 'cl');
      for (const m of slices) {
        const y = m.userData.yc;
        const c = S.zone < 0.005 || y < yB ? cL : y < yT ? cF : cT, band = clamp((y - yT) / 0.006 + 0.5, 0, 1);
        m.material.opacity = 0.42 * clamp(S.zone >= 0.005 && y >= yB ? cF + (cT - cF) * band : c, 0, 1);
      }
      S.flash = Math.max(0, S.flash - dt * 2.5); flashBall.material.opacity = 0.85 * S.flash; flashBall.scale.setScalar(0.6 + 0.6 * (1 - S.flash));
      mist.update(dt, { rate: Math.min(36, S.rHcl * 2.6), origin: MOUTH_OUT, spread: 0.008, up: 0.022, size: 0.014, life: 2.8 });
      clOut.update(dt, { rate: Math.min(70, Math.max(0, S.rCl - 1.5) * 4),          // 玻璃片敞着时慢慢扩散出去的那点氯气很淡，看不出来；冲出来的才看得见
        origin: MOUTH_OUT, spread: 0.012, up: 0.003, size: 0.02, life: 2.6 });          // 氯气比空气重：冒出来以后不大往上飘
      warning.text('注意　氯气有毒！').loc(group, JX - 0.03, JH + 0.035, 0).show(S.rCl > 3 && !bar.playing);
      // 下插节奏：拖着往下伸的时候，在导管旁边说快慢
      const vv = S.vIn.toFixed(1);
      pace.text(S.vIn <= V_OK ? `下插约 ${vv} cm/s · 缓慢` : S.vIn <= V_MAX ? `下插约 ${vv} cm/s · 快到上限了，再慢一点` : S.vIn <= V_SEEN ? `下插约 ${vv} cm/s · 偏快：会挤出少量氯气` : `下插约 ${vv} cm/s · 太快：氯气会冲出瓶口`).loc(group, AX - 0.055, tip.y + 0.012, 0).show(inJar && S.lit && S.vT > 0 && S.zone < 0.95 && !bar.playing && !mic.isOpen);
      // 瓶口左半边的对准圈：该伸入了、导管还没进瓶
      aim.visible = S.open && S.lit && !inJar && !bar.has('insert') && !bar.playing;
      if (aim.visible) aim.material.opacity = 0.55 + 0.25 * Math.sin(t * 4);
      // 观察卡：集气瓶里看得到的现象
      // 观察卡：颜色按画面里分层的浓度说（上半瓶、下半瓶各取平均）
      const clLeft = total('cl');
      let cu = 0, cd = 0, nu = 0, nd = 0; for (const m of slices) { const c = m.material.opacity / 0.42; if (m.userData.yc > JH / 2) { cu += c; nu++; } else { cd += c; nd++; } }
      cu /= nu || 1; cd /= nd || 1;
      const word = (c) => (c > 0.7 ? '黄绿色' : c > 0.3 ? '浅黄绿色' : c > 0.08 ? '很淡的黄绿色' : '几乎无色');
      const look2 = word(cu) === word(cd) ? `整瓶${word(cu)}` : `上部${word(cu)}，下部${word(cd)}`;
      // 照初中的卡片：名字 + 现象词，一行数字（瓶里剩的 Cl₂、瓶口），一行瓶里的颜色；折算方法、倍速写在面板里
      const mouth = S.rCl > 3 ? '冲出黄绿色氯气' : S.rHcl > 1 ? '瓶口白雾' : '';
      const res = (w, burn) => `<span class="cc-res${burn ? ' burn' : ''}">${w}</span>`;
      const stamp = S.flash > 0.1 ? res('闪了一下', true) : S.seenCl ? res('冲出氯气', true) : S.outBy === 'high' ? res('熄火', true) : S.leakCl > LEAK_BAD ? res('漏出氯气', true) : S.flashed ? res('闪燃过', true) : S.mixed ? res('混进氢气', true) : S.lit && inJar ? res('苍白色火焰', true) : S.outBy === 'used' ? res('熄火') : !S.lit && inJar ? res('没点燃') : '';
      card.text(`<div class="cc"><div class="cc-t"><span class="cc-name">集气瓶里</span>${stamp}</div><div class="cc-more"><div class="cc-obs"><b>${Math.max(0, Math.round(clLeft))}</b><small>mL Cl₂（约）</small>${mouth ? `<small>${mouth}</small>` : ''}</div><div class="cc-note">${look2}</div></div></div>`)
        .loc(group, JX + 0.02, JH + 0.07, 0).show(!bar.playing && !mic.isOpen);
      bar.near(S.near); mic.update?.(dt);
    };
    function finish() { if (S.demo || !W) return; W.t1.open(); W.next.hidden = false; status(`${S.outBy === 'used' ? '火焰附近氯气不足，火焰熄灭了。' : '火焰是苍白色，瓶口有白雾，瓶里的黄绿色变浅了。'}可以掀开课本上的结论，也可以先想一想。离开前用肥皂洗手（课本实验图标）。`); }

    return {
      group: root, pointer, card: false, toggles: ['cards', 'steps'],
      size: { w: 0.3, d: 0.11, h: 0.19 },
      view: { elev: 16, azim: -6, lookY: 0.45, frameMargin: 1.06 },
      mount(ui) {
        const ctx = () => `<div>在空气中：${S.said.air ? '淡蓝色火焰' : '还没点燃'}</div><div>在氯气中：${S.said.cl2 ? '照样燃烧，苍白色火焰；瓶口白雾' : '还没伸进去'}</div>`;
        const t2 = think({ title: '想一想（选做）', q: '以前学过的燃烧，都是物质在氧气中的燃烧。通过 H₂ 在 Cl₂ 中的燃烧，你对燃烧有什么新的认识？', ctx, options: ['燃烧不一定要有氧气参加；燃烧的本质是氧化还原反应', '燃烧一定要有氧气，瓶里一定混进了空气', '这不是燃烧，只是发光'], wrong: ['瓶里盛满的是氯气，燃烧的是 H₂ 和 Cl₂，生成 HCl；氧气无须参与这条反应。', '它发光、放热，生成了新物质 HCl，是燃烧。'], ok: '对：燃烧不一定要有氧气参加。H₂ 在 Cl₂ 中燃烧，氢元素 0 → +1，被氧化；氯元素 0 → −1，被还原（课本第 24 页：共用电子对偏向氯原子）——燃烧是发光、放热的氧化还原反应。', status: (m) => W?.status(m) });
        const t1 = think({ title: '想一想（选做）', q: 'H₂ 在 Cl₂ 中燃烧，火焰是什么颜色？瓶口的白雾是怎么来的？', ctx, options: ['苍白色；生成的 HCl 在空气中与水蒸气结合，呈现雾状', '淡蓝色；白雾是生成的水蒸气', '黄色；白雾是跑出来的氯气'], wrong: ['淡蓝色是在空气里；这条反应是 H₂ 和 Cl₂ 反应，生成的是 HCl，不是水。', '氯气是黄绿色的，不是白雾；火焰也不是黄色。'], ok: '对：H₂ + Cl₂ 点燃══ 2HCl（课本第 45 页）。HCl 气体溶于水，就成为我们常用的盐酸。', status: (m) => W?.status(m), onOk: () => t2.open() });
        const more = moreBox([['钻进去看', () => mic.open()]], () => A.reset());
        const note = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'), h('p', { class: 'fineprint', html: '集气瓶约 250 mL，盛满氯气（黄绿色深浅跟着 Cl₂ 的占比走）；氯气有毒（课本第 45 页“注意”），实验图标要求戴护目镜、开排风。纯净的 H₂（已验纯：点燃氢气前一定要检验其纯度，人教版九年级上册第 91 页）流量按 3 mL/s，<b>画面时间加快 2 倍</b>（记录里的“画面秒数”乘 2 是实际时间）。<br>瓶里的气体分三层算（示意）：顶上的热烟气层、火焰周围的热区、火焰下面没动过的冷气体，每层分别记 H₂、Cl₂、HCl、空气，层内是混合的。导管往下伸，火焰经过的冷气体并进热区；燃烧按 H₂ + Cl₂ ══ 2HCl 消耗火焰附近的 Cl₂（体积 1 : 1 : 2），生成的热 HCl 先升到顶上。热区比室温高约 60 K（时间常数 2 s，示意）；受热膨胀和多出来的气体从瓶口出去，从最上面一层开始、按这一层的组成出去：所以伸得慢时出去的主要是 HCl（遇水蒸气成白雾）。<br>按这个模型从瓶口匀速伸入估算：每秒不超过约 0.75 cm，HCl 生成得比挤出去的快，不挤出氯气；0.8–1 cm/s 会挤出少量氯气（不到 5 mL），瓶口看不出黄绿色；再快，一下子并进的冷氯气受热膨胀，看得见黄绿色的氯气冲出瓶口，要换一瓶重做（显示的毫升数是模型估算）。这些速度只是本活页模型里的操作提示，不是实验室的规定数值。卡片上瓶里剩下的 Cl₂ 毫升数按室温折算。火焰附近 Cl₂ 低于 10% 时熄火（示意）。没点燃就伸进去，氢气只和瓶里的气体混着，在本模型里不反应（实际上 H₂ 和 Cl₂ 在光照或点燃时会反应，课本第 103 页表 4-4）；火焰附近 H₂、Cl₂ 都超过约 4% 时遇火会闪一下（氢气和氯气的混合气体遇火剧烈反应）。玻璃片敞着、导管不在瓶里时，最上面一层按时间常数 150 s 慢慢扩散出去（示意）。<br>氢气在空气中燃烧是淡蓝色火焰（初中化学）；在氯气中是苍白色（课本）。共用电子对偏向氯原子见课本第 24 页。' }));
        const base = mountXuean(ui, { controls: [more, note], headers: ['做了什么', '现象', '说明'], intro: INTRO });
        ui.data.append(t1.el, t2.el, base.next);
        W = { ...base, ui, t1, t2, status: ui.status }; bar.attach(ui);
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { bar.dispose(); drag.dispose(); mic.dispose?.(); mist.dispose(); clOut.dispose(); },
      debug: {
        get S() { return S; }, bar, A, jar, tube,
        picks: { tube: tubePick, plate: platePick },
        qa: qaFlow(drag, [
          { name: '点燃氢气', drag: tubePick, to: () => TIP_LAMP.clone(), wait: 1.5 },
          { name: '推开玻璃片', tap: platePick, wait: 0.3, scale: 1 },
          { name: '（做错）先到瓶口', drag: tubePick, to: () => TIP_MOUTH.clone(), wait: 0.5, scale: 1 },
          { name: '（做错）一下子伸到底', drag: tubePick, to: () => V(AX, 0.03), wait: 3, scale: 1 },
          { name: '核对冲出氯气', run: () => { if (!(S.seenCl && S.said.fastMsg && badRound() && !bar.has('insert'))) throw new Error(JSON.stringify({ burnCl: S.burnCl, said: S.said })); }, wait: 0.2 },
          { name: '提出导管', drag: tubePick, to: () => V(AX, TIP_MOUTH.y), wait: 0.5, scale: 1 },
          { name: '换一瓶氯气', tap: jarPick, wait: 1 },
          { name: '核对换瓶', run: () => { if (!(S.L.cl === V0 && !S.open && !spoiled() && !bar.has('plate') && W.tbl.el.querySelectorAll('tr').length > 2)) throw new Error(JSON.stringify({ low: S.L.cl, open: S.open, plate: bar.has('plate') })); }, wait: 0.2 },
          { name: '再推开玻璃片', tap: platePick, wait: 1 },
          { name: '移到瓶口', drag: tubePick, to: () => TIP_MOUTH.clone(), wait: 0.5, scale: 1 },
          ...Array.from({ length: 16 }, (_, i) => ({ name: `缓慢伸入 ${i + 1}`, drag: tubePick, to: () => V(AX, TIP_MOUTH.y - (TIP_MOUTH.y - 0.03) * (i + 1) / 16), wait: 0.1, scale: 1 })),          // 每步约 0.5 cm、加上脚本自己的间隔约 1 秒：约 0.5 cm/s
          { name: '看现象', run: () => {}, wait: 3, scale: 1 },
          { name: '钻进去看', run: () => mic.open(), wait: 3, scale: 1 },
          { name: '合上', run: () => mic.close(), wait: 1 },
          { name: '等烧完', run: () => {}, wait: 12 },
          { name: '核对', run: () => { if (!(S.said.air && S.said.cl2 && S.said.mist && S.said.fade && !S.seenCl && bar.has('observe'))) throw new Error(JSON.stringify({ said: S.said, burnCl: S.burnCl, T: S.T, Fr: S.Fr, L: S.L, zone: S.zone, lit: S.lit })); }, wait: 1 },
          { name: '想一想 1', run: () => W.t1.el.querySelector('button').click() },
          { name: '想一想 2', run: () => W.t2.el.querySelector('button').click() },
        ]),
      },
    };
  },
};
