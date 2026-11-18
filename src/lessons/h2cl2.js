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
const TIP_LAMP = V(LX + 0.002, 0.083), TIP_MOUTH = V(AX, JH + UD + 0.006), TIP_HOME = V(-0.035, 0.055), TIP_MIN = 0.03, MIX = 0.02;          // MIX：火焰下面也被搅动的一段（示意）
const LEAK_BAD = 60;          // 玻璃片敞着漏掉这么多（mL）就算这瓶做坏了
const V0 = 250, T0 = 293, DT_HOT = 60, TAU = 2, Q = 6, CL_MIN = 0.1, LEAK_TAU = 150, H2_FLASH = 0.04;
const CL2 = 0xc9d64a;          // 氯气：黄绿色（和氯气漂白那课一样）
const PLATE_OPEN = 0.001 + (JR * 0.72 * 2 + 0.016) / 2;          // 玻璃片推开：左边缘停在瓶口中心右边 1 mm（像课本图里那样，导管从左半边伸进去）

export default {
  id: 'h2cl2',
  fig: '图2-12',
  title: 'H₂在Cl₂中燃烧',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '氢气在空气里燃烧，发出淡蓝色火焰。把燃着的氢气伸进盛满氯气（没有氧气）的集气瓶里，会怎样？',
    hint: '课本第 45 页【实验2-7】。先猜，再动手。',
    options: ['继续燃烧，火焰颜色变了', '立刻熄灭：没有氧气不能燃烧', '照样燃烧，和在空气里一模一样'],
    answer: 0,
  },
  need: '在空气中点燃氢气，然后把导管缓慢伸入盛满氯气的集气瓶中，观察现象（氯气有毒）',
  conclusion: {
    page: 49, rect: [64, 433, 378, 498],
    quote: '可以看到，纯净的H2在Cl2中安静地燃烧，发出苍白色火焰。反应生成的气体是HCl，它在空气中与水蒸气结合，呈现雾状。',
    formula: 'H₂ + Cl₂ 点燃══ 2HCl',
    why: '燃着的氢气伸进氯气里，<b>照样燃烧</b>：安静地燃烧，火焰从空气里的淡蓝色变成<b>苍白色</b>。瓶里的黄绿色越来越浅——氯气被消耗了；生成的 HCl 从瓶口出来，和空气里的水蒸气结合成<b>白雾</b>。<br>这里没有氧气：<b>燃烧不一定要有氧气参加</b>。H 和 Cl 组成共用电子对，电子对偏向氯原子——氢元素 0 → +1，被氧化；氯元素 0 → −1，被还原（课本第 24 页）。燃烧的本质是氧化还原反应。',
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

    // ================= 状态 =================
    const fresh = () => ({ demo: false, near: false, said: {}, clock: 0, tip: TIP_HOME.toArray(), drag: false, motion: null, lit: false, po: 0, open: false,
      zone: 0, F: 0, P: 0, Pa: 0, lowCl: V0, lowAir: 0, Tu: T0, h2in: 0, burned: 0, burnT: 0, clOut: 0, burnCl: 0, leakCl: 0, hclOut: 0, rCl: 0, rHcl: 0, outBy: '', flash: 0, burnClAt: 0, openT: 0, inT: 0 });
    S = fresh();
    const tipIn = () => S.tip[1] < JH - 0.003 && Math.abs(S.tip[0] - AX) < 0.002;
    const clf = () => { const z = S.F + S.P + S.Pa; return z > 0.5 ? S.F / z : S.lowCl / Math.max(1e-6, S.lowCl + S.lowAir); };
    const clLeft = () => S.F + S.lowCl;
    const spoiled = () => S.outBy !== '' || S.burnCl > 4 || S.leakCl > LEAK_BAD;          // 这瓶做坏了 / 用完了：可以点集气瓶换一瓶

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
          if (tipIn() || (Math.abs(S.tip[0] - AX) < 0.001 && S.tip[1] < JH + UD + 0.004)) { status('导管还在瓶口里，玻璃片推不回来。先把导管提出来。'); return; }
          S.open = false; status('盖上了玻璃片。'); return;
        }
        S.open = true; S.openT = 0; done('plate'); sfx.clink?.({ freq: 1600, gain: 0.015 });
        status(S.lit ? '玻璃片推到一边了。氯气有毒——把燃着的<b>导管</b>从瓶口<b>缓慢</b>伸进去。' : '玻璃片推到一边了。氯气有毒，别让它一直敞着：先把<b>导管</b>拖到酒精灯火焰上，点燃氢气。');
      },
      // 回头路：这瓶做坏了（火焰停在上部熄灭、氯气冲出去或漏掉太多），点集气瓶换一瓶新的满瓶氯气。观察记录保留，步骤回到“推开玻璃片”
      swapJar() {
        if (!spoiled()) return;
        const bad = S.outBy !== 'used', f = fresh();
        for (const k of ['zone', 'F', 'P', 'Pa', 'lowCl', 'lowAir', 'Tu', 'h2in', 'burned', 'burnT', 'clOut', 'burnCl', 'leakCl', 'hclOut', 'rCl', 'rHcl', 'outBy', 'flash', 'openT', 'inT', 'open', 'po', 'burnClAt', 'motion', 'drag']) S[k] = f[k];
        if (tipIn() || S.tip[1] < JH + UD + 0.005 && Math.abs(S.tip[0] - JX) < JR + 0.02) S.tip = TIP_HOME.toArray();          // 导管先从瓶里提出来，放回原处（燃着的照样燃着）
        for (const k of ['fastMsg', 'leakMsg', 'unlitMsg', 'insertMsg', 'spoilMsg', 'obsDone']) delete S.said[k];
        mist.clear(); clOut.clear(); jar.plate.position.x = 0; sfx.clink?.({ freq: 1300, gain: 0.02 });
        if (bad && !S.demo) bar.undo('plate', 'insert', ...(bar.has('observe') ? [] : ['observe']));
        if (!S.lit && !S.demo) bar.undo('light');
        status(`换了一瓶新的满瓶氯气（盖着玻璃片），观察记录还在。${S.lit ? '导管还燃着：' : '先把导管拖到酒精灯火焰上点燃，再'}推开玻璃片，把导管<b>缓慢</b>伸到瓶的下部。`);
      },
      reset() { if (bar.playing) bar.stop(); S = fresh(); sync(); mic.close(); back(); W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; W.ui.relock(); } bar.undo('light', 'plate', 'insert', 'observe', 'why'); status('换了一瓶新的氯气，导管也放回去了。先在空气中点燃氢气。'); },
    };
    const sync = () => { mist.clear(); clOut.clear(); tube.position.fromArray(S.tip); jar.plate.position.x = S.po * PLATE_OPEN; fireAir.setOn(false); fireCl.setOn(false); hoseAt = null; buildHose(); };
    sync();
    const drag = draggable(group, [
      { obj: tubePick, plane: 'xy', offset: 0, keepOffset: true, anchor: tube,
        hint: () => (!S.lit ? '导管：拖到酒精灯火焰上，点燃氢气' : tipIn() ? '导管：慢慢往下伸 / 往上提' : '导管：拖到瓶口，再缓慢往下伸'),
        onStart: () => { S.drag = true; S.motion = null; },
        onDrag: (p) => { S.tip = constrain(p).toArray(); },
        onEnd: () => { S.drag = false; const p = V(...S.tip); if (p.distanceTo(TIP_LAMP) < 0.02) S.motion = TIP_LAMP.toArray(); } },
    ], { tip: tag('', 'pill'), highlight: true, taps: [{ obj: jarPick, enabled: () => spoiled() && !bar.playing, hint: () => '集气瓶：这瓶不能再用了，点一下换一瓶新的氯气', onTap: () => A.swapJar() }, { obj: platePick, hint: () => (S.open ? '玻璃片：点一下盖回去' : '玻璃片：点一下推到一边'), onTap: () => A.tapPlate() }] });
    const act = demoActs(drag, group);
    const mic = micro({ tag, look, back, group, scene: h2cl2Scene(), at: () => V(JX, JH + 0.025, 0), btnAt: () => V(JX + 0.048, 0.035, 0), label: '钻进去看',
      state: () => ({ mode: tipIn() ? 'jar' : 'air', lit: S.lit, cl: tipIn() ? clf() : 1, out: !!S.outBy && tipIn() }), key: () => `${tipIn()}|${S.lit}|${!!S.outBy}`, bar: () => bar, scale: 0.0068, lookD: [0.04, 0.25, 1], dist: 0.3 });

    const tubePath = (ptsFn, t0, t1) => act.path(tubePick, [() => V(...S.tip), ...ptsFn], { t0, t1, release: t1 + 0.02 });          // 从尖嘴现在的位置出发（拖动给的是尖嘴的位置，不是拾取盒的中心）
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'light', title: '在空气中点燃氢气', todo: '把<b>导管</b>的尖嘴拖到酒精灯火焰上，在空气中点燃氢气。看火焰的颜色。', target: () => tube },
        { id: 'plate', title: '推开玻璃片', todo: '点一下集气瓶上的<b>玻璃片</b>，推到一边。氯气有毒！', target: () => jar.plate },
        { id: 'insert', title: '缓慢伸入', todo: '把燃着的<b>导管</b>从瓶口<b>缓慢</b>伸入盛满氯气的集气瓶中，一直伸到下部。', target: () => (spoiled() ? jar : tube) },
        { id: 'observe', title: '观察', todo: '看：火焰什么颜色？瓶口有什么？瓶里的黄绿色怎样变？也可以<b>钻进去看</b>。', target: () => (spoiled() && S.outBy !== 'used' ? jar : null) },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { sync(); mic.close(); } }),
          shots: [
            { cap: '在空气中点燃氢气：尖嘴口是淡蓝色的火焰。', dur: 6, cam: [[0.03, 0.1, 0], [0.04, 0.3, 1], 0.46], during: tubePath([() => V(TIP_HOME.x, 0.11), () => V(TIP_LAMP.x, 0.11), () => TIP_LAMP.clone()], 0.05, 0.5) },
            { cap: '推开集气瓶上的玻璃片（氯气有毒，在通风处做）。', dur: 3, cam: [[JX, 0.09, 0], [0.04, 0.35, 1], 0.34], during: act.tap(platePick, 0.3) },
            { cap: '把导管缓慢伸入盛满氯气的集气瓶中。', dur: 14, cam: [[JX + 0.01, 0.1, 0], [0.04, 0.25, 1], 0.44],
              during: act.seq(tubePath([() => V(TIP_LAMP.x, 0.11), () => V(AX, 0.11), () => TIP_MOUTH.clone()], 0.03, 0.22), tubePath([() => V(AX, 0.03)], 0.3, 0.92)) },
            { cap: '纯净的 H₂ 在 Cl₂ 中安静地燃烧，发出苍白色火焰；瓶口出现白雾——生成的 HCl 在空气中与水蒸气结合。', dur: 8, cam: [[JX, 0.08, 0], [0.04, 0.2, 1], 0.28] },
            { cap: '钻进去看：H₂ + Cl₂ → 2HCl，共用电子对偏向氯原子。这里没有氧气，照样燃烧。', dur: 10, cam: [[JX, 0.11, 0], [0.04, 0.25, 1], 0.34], enter: () => mic.open(true), during: act.at(0.98, () => mic.close()) },
            { cap: '继续燃烧：瓶里的黄绿色越来越浅——氯气被消耗了；氯气快用完时火焰熄灭（时间加快）。演示完了，换你自己做。', dur: 9, speed: 3, cam: [[JX, 0.06, 0], [0.04, 0.25, 1], 0.32] },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ---- 瓶里的气体：从上层推出去（先 HCl，再空气，最后才是 Cl₂）----
    const pushZone = (ex, burning) => {
      const a = Math.min(ex, S.P); S.P -= a; S.hclOut += a; ex -= a;
      const b = Math.min(ex, S.Pa); S.Pa -= b; ex -= b;
      const c = Math.min(ex, S.F); S.F -= c; S.clOut += c; if (burning && c > 0) { S.burnCl += c; S.burnClAt = S.clock; }
      return [c, a];
    };
    const pushLow = (ex) => { const tot = S.lowCl + S.lowAir; if (tot <= 0) return [0, 0]; const c = ex * S.lowCl / tot; S.lowCl -= c; S.lowAir -= ex - c; S.clOut += c; return [c, 0]; };

    const step = (dt, t) => {
      S.clock += dt;
      // 导管：吸到点火的位置；画面上的导管跟着尖嘴的位置
      if (S.motion) { const p = V(...S.tip), g = V(...S.motion), d = g.clone().sub(p); p.addScaledVector(d, Math.min(1, dt * 0.25 / Math.max(1e-5, d.length()))); S.tip = p.toArray(); if (p.distanceTo(g) < 0.0003) S.motion = null; }
      tube.position.lerp(V(...S.tip), 1 - Math.exp(-dt * 26)); buildHose();
      S.po += ((S.open ? 1 : 0) - S.po) * Math.min(1, dt * 6); jar.plate.position.x = S.po * PLATE_OPEN;
      lamp.flame.update(t);
      // 点燃：尖嘴碰到酒精灯的火焰
      const tip = V(...S.tip), inJar = tipIn();
      if (!S.lit && Math.abs(tip.x - LX) < 0.008 && tip.y > 0.055 && tip.y < 0.094) {
        S.lit = true; S.outBy = ''; done('light'); sfx.whoosh?.({ freq: 700, gain: 0.05, dur: 0.4 });
        log('air', ['在空气中点燃氢气', '安静地燃烧，<b>淡蓝色</b>火焰', '氢气和空气中的氧气反应（生成水）']);
        status(S.open ? '氢气点燃了：<b>淡蓝色</b>火焰。把导管从瓶口<b>缓慢</b>伸进去。' : '氢气点燃了：<b>淡蓝色</b>火焰。点一下<b>玻璃片</b>推到一边，再把导管从瓶口<b>缓慢</b>伸进去。');
      }
      // ---- 瓶里的模型 ----
      let dCl = 0, dHcl = 0, burning = false;
      if (S.lit && inJar) {
        const z = clamp((JH - tip.y + MIX) / (JH - Y0), 0, 1);
        if (z > S.zone) { const dv = (z - S.zone) * V0, tot = S.lowCl + S.lowAir, k = tot > 0 ? Math.min(1, dv / tot) : 0; S.F += S.lowCl * k; S.Pa += S.lowAir * k; S.lowCl -= S.lowCl * k; S.lowAir -= S.lowAir * k; S.zone = z; }
        if (S.h2in > 0) {          // 先前没点燃时流进来的氢气：遇到火焰一下子反应掉
          const r = Math.min(S.h2in, S.F), big = r / V0 >= H2_FLASH; S.F -= r; S.P += 2 * r; S.h2in = 0;
          if (big) { S.flash = 1; sfx.whoosh?.({ freq: 260, gain: 0.12, dur: 0.35 }); log('flash', ['先让没点燃的氢气流进瓶里，再伸进火焰', '瓶里<b>猛地闪了一下</b>', '氢气和氯气的混合气体遇火剧烈反应，很危险：要先在空气中点燃，再伸入']); status('瓶里猛地闪了一下：先前流进去的氢气和氯气混在一起，遇火剧烈反应——很危险。课本的顺序是先在空气中点燃，再伸入。'); }
        }
        if (clf() < CL_MIN) {
          S.lit = false; S.outBy = S.lowCl > 0.25 * V0 ? 'high' : 'used';
          if (S.outBy === 'high') { log('high', ['导管停在瓶的上部', `火焰<b>熄灭</b>了，瓶下部还是黄绿色`, '火焰周围已经是 HCl，没有氯气就不能燃烧（要一直伸到下部）']); status('火焰熄灭了：火焰周围已经都是 HCl，瓶下部的氯气还没用上。上部是 HCl，再点燃伸进去也会熄灭。<b>这瓶不能再用了：点一下集气瓶，换一瓶新的氯气。</b>'); }
          else { log('used', [`燃烧了约 ${Math.round(S.burnT)} 秒`, '瓶里的氯气快用完了，火焰<b>熄灭</b>', '没有氯气，氢气就不能在瓶里燃烧']); done('observe'); finish(); }
        } else {
          const r = Math.min(Q * dt, S.F); S.F -= r; S.P += 2 * r; S.burned += r; S.burnT += dt; burning = true;
        }
      } else if (inJar) {          // 没点燃就伸进去：氢气流进瓶里，把瓶里的气体挤出去一些
        const v = Q * dt; S.h2in += v; S.inT += dt;
        const [c, hh] = S.zone > 0.02 ? pushZone(v, false) : pushLow(v); dCl += c; dHcl += hh;
        if (S.inT > 0.6 && !S.burnT) { log('unlit', ['没点燃就把导管伸进瓶里', '没有火焰，<b>看不到反应</b>', '氢气流进瓶里，和氯气混在一起']); if (!S.said.unlitMsg) { S.said.unlitMsg = true; status('没点燃：氢气只是流进瓶里，和氯气混在一起，看不到反应。课本是先<b>在空气中点燃</b>，再伸入。'); } }
      }
      S.Tu += ((T0 + (burning ? DT_HOT : 0)) - S.Tu) * Math.min(1, dt / TAU);
      if (S.zone > 0) {
        const ex = S.F + S.P + S.Pa - S.zone * V0 * T0 / S.Tu;
        if (ex > 0) { const [c, hh] = pushZone(ex, burning || S.Tu > T0 + 5); dCl += c; dHcl += hh; } else S.Pa -= ex;          // 变凉了：空气从瓶口进来
      }
      // 玻璃片开着：氯气、氯化氢从瓶口慢慢扩散出去，空气进来
      if (S.po > 0.5 && !inJar) {          // 导管伸在瓶里时，瓶口一直往外出气，扩散出去的可以不计
        S.openT += dt;
        const k = dt / LEAK_TAU;
        if (S.zone > 0.02) { const a = S.F * k, b = S.P * k; S.F -= a; S.P -= b; S.Pa += a + b; S.leakCl += a; S.clOut += a; S.hclOut += b; dCl += a; dHcl += b; }
        else { const a = S.lowCl * k; S.lowCl -= a; S.lowAir += a; S.leakCl += a; S.clOut += a; dCl += a; }
        if (!S.lit && !inJar && S.openT > 10 && !S.said.leakMsg) { S.said.leakMsg = true; status('玻璃片一直敞着：氯气会从瓶口慢慢扩散出来——氯气有毒。点燃氢气后尽快伸进去，或者点玻璃片先盖上。'); }
      }
      S.rCl += (dCl / Math.max(dt, 1e-4) - S.rCl) * Math.min(1, dt * 8); S.rHcl += (dHcl / Math.max(dt, 1e-4) - S.rHcl) * Math.min(1, dt * 8);
      // 记录
      if (burning) {
        if (S.burnT > 0.8) log('cl2', ['把燃着的导管伸入盛满氯气的集气瓶', '照样燃烧：安静地燃烧，火焰变成<b>苍白色</b>', 'H₂ 在 Cl₂ 中燃烧，生成 HCl']);
        if (S.zone > 0.5) { if (!bar.has('insert') && !S.demo && !S.said.insertMsg) { S.said.insertMsg = true; status('伸到下部了。看火焰的颜色，看瓶口，也看瓶里的颜色。'); } done('insert'); }
      }
      if (S.hclOut > 3 && S.burnT > 1.2) log('mist', ['（看瓶口）', '出现<b>白雾</b>', '生成的 HCl 在空气中与水蒸气结合，呈现雾状']);
      if (S.burnCl > 4 && S.clock - S.burnClAt > 1 && !S.said.fast) log('fast', ['导管伸得太快', `瓶口冲出<b>黄绿色</b>的氯气（约 ${Math.round(S.burnCl)} mL）`, '一下子伸进去，瓶里的冷气体突然受热膨胀，氯气来不及反应就被挤了出去。氯气有毒：要缓慢伸入']);
      if (S.burnCl > 4 && !S.said.fastMsg) { S.said.fastMsg = true; status('瓶口冲出了<b>黄绿色</b>的氯气！导管伸得太快：瓶里的气体突然受热膨胀，把还没反应的氯气挤了出去——氯气有毒。<b>这瓶不能再用了：点一下集气瓶，换一瓶新的氯气</b>，再缓慢伸入。'); }
      if (S.leakCl > LEAK_BAD && !S.said.spoilMsg) { S.said.spoilMsg = true; status(`玻璃片敞得太久，瓶里的氯气跑掉了约 ${Math.round(S.leakCl)} mL（氯气有毒）。<b>这瓶不能再用了：点一下集气瓶，换一瓶新的氯气</b>，推开玻璃片后尽快伸入。`); }
      if (clLeft() < 0.5 * V0 && S.burned > 20) log('fade', ['继续燃烧', '瓶里的<b>黄绿色越来越浅</b>', '氯气不断被消耗']);
      if (S.said.fade && S.said.mist && !bar.has('observe') && !S.said.obsDone) { S.said.obsDone = true; done('observe'); finish(); }
      // ---- 画面 ----
      fireAir.setOn(S.lit && !inJar); fireCl.setOn(S.lit && inJar);
      fireCl.setSize(0.75 + 0.25 * clamp((clf() - CL_MIN) / 0.3, 0, 1)); fireAir.update(t); fireCl.update(t);
      const yB = JH - S.zone * (JH - Y0), cLow = S.lowCl / Math.max(1e-6, S.lowCl + S.lowAir), cz = S.F / Math.max(1e-6, S.F + S.P + S.Pa);
      for (const m of slices) {
        const y = m.userData.yc; let c;
        if (S.zone < 0.01 || y < yB) c = cLow * (S.lowCl + S.lowAir > 0.5 ? 1 : 0);
        else c = Math.min(cLow > 0.01 ? Math.max(cLow, cz) : cz, cz * (1.5 - (y - yB) / Math.max(1e-4, JH - yB)));
        m.material.opacity = 0.42 * clamp(c, 0, 1);
      }
      S.flash = Math.max(0, S.flash - dt * 2.5); flashBall.material.opacity = 0.85 * S.flash; flashBall.scale.setScalar(0.6 + 0.6 * (1 - S.flash));
      mist.update(dt, { rate: Math.min(36, S.rHcl * 2.6), origin: MOUTH_OUT, spread: 0.008, up: 0.022, size: 0.014, life: 2.8 });
      clOut.update(dt, { rate: Math.min(70, Math.max(0, S.rCl - 1.5) * 4),          // 玻璃片敞着时慢慢扩散出去的那点氯气很淡，看不出来；冲出来的才看得见
         origin: MOUTH_OUT, spread: 0.012, up: 0.003, size: 0.02, life: 2.6 });          // 氯气比空气重：冒出来以后不大往上飘
      warning.text('注意　氯气有毒！').loc(group, JX - 0.03, JH + 0.035, 0).show(S.rCl > 3 && !bar.playing);
      bar.near(S.near); mic.update?.(dt);
    };
    function finish() { if (S.demo) return; W?.t1.open(); status(S.outBy === 'used' ? '瓶里的氯气快用完，火焰熄灭了。在左边作答。' : '火焰是苍白色，瓶口有白雾，瓶里的黄绿色变浅了。在左边作答。'); }

    return {
      group: root, pointer, card: false, toggles: ['steps'],
      size: { w: 0.3, d: 0.11, h: 0.19 },
      view: { elev: 16, azim: -6, lookY: 0.45, frameMargin: 1.06 },
      mount(ui) {
        const ctx = () => `<div>在空气中：${S.said.air ? '淡蓝色火焰' : '还没点燃'}</div><div>在氯气中：${S.said.cl2 ? '照样燃烧，苍白色火焰；瓶口白雾' : '还没伸进去'}</div>`;
        const t2 = think({ q: '以前学过的燃烧，都是物质在氧气中的燃烧。通过 H₂ 在 Cl₂ 中的燃烧，你对燃烧有什么新的认识？', ctx, options: ['燃烧不一定要有氧气参加；燃烧的本质是氧化还原反应', '燃烧一定要有氧气，瓶里一定混进了空气', '这不是燃烧，只是发光'], wrong: ['瓶里盛满的是氯气，生成的只有 HCl；氢气照样燃烧。', '它发光、放热，生成了新物质 HCl，是燃烧。'], ok: '对：燃烧不一定要有氧气参加。H₂ 在 Cl₂ 中燃烧，氢元素 0 → +1，被氧化；氯元素 0 → −1，被还原（课本第 24 页：共用电子对偏向氯原子）——燃烧是发光、放热的氧化还原反应。', status: (m) => W?.status(m), onOk: () => { done('why'); if (W) W.next.hidden = false; } });
        const t1 = think({ q: 'H₂ 在 Cl₂ 中燃烧，火焰是什么颜色？瓶口的白雾是怎么来的？', ctx, options: ['苍白色；生成的 HCl 在空气中与水蒸气结合，呈现雾状', '淡蓝色；白雾是生成的水蒸气', '黄色；白雾是跑出来的氯气'], wrong: ['淡蓝色是在空气里；而且这里没有氧气，不生成水。', '氯气是黄绿色的，不是白雾；火焰也不是黄色。'], ok: '对：H₂ + Cl₂ 点燃══ 2HCl（课本第 45 页）。HCl 气体溶于水，就成为我们常用的盐酸。', status: (m) => W?.status(m), onOk: () => t2.open() });
        const more = moreBox([['钻进去看', () => mic.open()]], () => A.reset());
        const note = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'), h('p', { class: 'fineprint', html: '集气瓶约 250 mL，盛满氯气（黄绿色深浅跟着 Cl₂ 的多少走）；氯气有毒（课本第 45 页“注意”）。纯净的 H₂ 流量按 3 mL/s，<b>时间加快 2 倍</b>。<br>瓶里的气体按“两区”算（示意）：火焰以上被搅动、受热的一层和火焰以下没动过的冷的一层。导管往下伸，火焰经过的冷气体并进上层；燃烧按 H₂ + Cl₂ ══ 2HCl 消耗上层的 Cl₂（体积 1 : 1 : 2）。上层比室温高约 60 K（时间常数 2 s，示意）；受热膨胀和多出来的气体从瓶口出去，热的 HCl 先出去（在空气中与水蒸气结合成白雾），不够时才挤出没反应的 Cl₂。<br>按这个模型：导管伸得太快，一下子并进一大块冷的氯气，受热膨胀把氯气挤出瓶口；停在上部，上层 Cl₂ 少于约 10% 时火焰熄灭（示意）；没点燃就伸进去，氢气只和氯气混着；混进的 H₂ 超过约 4% 再遇火，瓶里会闪一下（氢气和氯气的混合气体遇火剧烈反应）。玻璃片敞着，氯气按时间常数 150 s 慢慢扩散出去（示意）。<br>氢气在空气中燃烧是淡蓝色火焰（初中化学）；在氯气中是苍白色（课本）。共用电子对偏向氯原子见课本第 24 页。' }));
        const base = mountXuean(ui, { controls: [more, note], headers: ['做了什么', '现象', '说明'], intro: '集气瓶里盛满了黄绿色的氯气（有毒），盖着玻璃片；导管里通着纯净的氢气，酒精灯已经点燃。先在空气中点燃氢气。' });
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
          { name: '核对冲出氯气', run: () => { if (!(S.burnCl > 4 && S.said.fast && spoiled())) throw new Error(JSON.stringify({ burnCl: S.burnCl, said: S.said })); }, wait: 0.2 },
          { name: '提出导管', drag: tubePick, to: () => V(AX, TIP_MOUTH.y), wait: 0.5, scale: 1 },
          { name: '换一瓶氯气', tap: jarPick, wait: 1 },
          { name: '核对换瓶', run: () => { if (!(S.lowCl === V0 && !S.open && !spoiled() && !bar.has('plate') && W.tbl.el.querySelectorAll('tr').length > 2)) throw new Error(JSON.stringify({ low: S.lowCl, open: S.open, plate: bar.has('plate') })); }, wait: 0.2 },
          { name: '再推开玻璃片', tap: platePick, wait: 1 },
          { name: '移到瓶口', drag: tubePick, to: () => TIP_MOUTH.clone(), wait: 0.5, scale: 1 },
          ...Array.from({ length: 8 }, (_, i) => ({ name: `缓慢伸入 ${i + 1}`, drag: tubePick, to: () => V(AX, TIP_MOUTH.y - (TIP_MOUTH.y - 0.03) * (i + 1) / 8), wait: 1, scale: 1 })),
          { name: '看现象', run: () => {}, wait: 3, scale: 1 },
          { name: '钻进去看', run: () => mic.open(), wait: 3, scale: 1 },
          { name: '合上', run: () => mic.close(), wait: 1 },
          { name: '等烧完', run: () => {}, wait: 12 },
          { name: '核对', run: () => { if (!(S.said.air && S.said.cl2 && S.said.mist && S.said.fade && S.burnCl < 1 && bar.has('observe'))) throw new Error(JSON.stringify({ said: S.said, burnCl: S.burnCl, F: S.F, P: S.P, low: S.lowCl, zone: S.zone, lit: S.lit })); }, wait: 1 },
          { name: '想一想 1', run: () => W.t1.el.querySelector('button').click() },
          { name: '想一想 2', run: () => W.t2.el.querySelector('button').click() },
        ]),
      },
    };
  },
};
