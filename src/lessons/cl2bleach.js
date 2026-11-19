// 人教版高中化学必修第一册第 46 页【实验2-8】（图2-14 干燥的氯气使有色鲜花变色）：
//   （1）取干燥的和湿润的有色纸条（或布条）各一条，分别放入两个盛有干燥氯气的集气瓶中，盖上玻璃片，观察现象。
//   （2）将有色鲜花放入盛有干燥氯气的集气瓶中，盖上玻璃片，观察现象。（课本图标：护目镜、排风、洗手；氯气是有毒气体）
// 课本：溶于水中的部分氯气与水发生反应 Cl₂ + H₂O ⇌ HCl + HClO（第 46 页）；次氯酸的强氧化性还能使某些染料和有机色素褪色（第 47 页）。
// 模型（示意，界面上写明）：
//   三个集气瓶里都是干燥的氯气（浓度记 1，黄绿色深浅跟着浓度走）。玻璃片推开时氯气从瓶口漫出来：浓度按时间常数 60 s 减小（氯气比空气重，敞口时慢慢漫出来；示意）；盖上就不再变。
//   东西含水量 w：干燥纸条 0（理想化），湿润纸条 1，鲜花 0.6（鲜花含水分，示意）。
//   东西上的次氯酸 h：向“周围氯气浓度 c × 含水量 w”靠拢（可逆反应；时间常数 2 s，示意），离开氯气又会回去。
//   褪色：色素剩下的比例 d，d' = −k·h·d（不可逆，k = 0.25 /s，示意：真实的快慢和氯气浓度、含水量有关）。
//   瓶里的氯气很多，被反应掉的忽略；紫色小点表示 HClO（这套书里紫 = 次氯酸），黄绿色表示氯气。
import * as THREE from 'three';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs, mountXuean, moreBox } from './kit/chemlesson.js';
import { draggable, clamp } from './kit/interact.js';
import { gasJar } from './kit/chem.js';
import { smoke2 } from './kit/chemfx.js';
import { micro } from './kit/microworld.js';
import { chlorineScene } from './kit/cl2bleach-parts.js';
import { textPlate } from './kit/props.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const JR = 0.021, JH = 0.08, JX = [-0.078, 0, 0.078], HOME_Z = 0.05, LY = 0.0035, LEN = 0.06;
const KB = 0.5, KD = 0.25, TAU = 60, CY = JH + LEN + 0.008;          // 次氯酸靠拢（1/s）；褪色（1/s）；漏气时间常数（s）；拿着走时手里那一端的高度（垂下来的纸条、花高过瓶口）
const ITEMS = [
  { key: 'dry', name: '干燥的有色纸条', w: 0, color: 0xd93a45, fade: 0xf6f1e4, kind: 'strip' },
  { key: 'wet', name: '湿润的有色纸条', w: 1, color: 0xc92f3d, fade: 0xf6f1e4, kind: 'strip' },
  { key: 'flower', name: '有色鲜花', w: 0.6, color: 0xc23f9e, fade: 0xf0cf6e, kind: 'flower' },
];
const CL2 = 0xc9d64a, HCLO = 0x8a4fd0;
const home = (i) => V(JX[i], LY, HOME_Z), hang = (k) => V(JX[k], JH, 0);
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export default {
  id: 'cl2bleach',
  fig: '图2-14',
  title: '干燥的氯气使有色鲜花变色',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '氯气是黄绿色的有毒气体。把干燥的和湿润的有色纸条，分别放进盛有干燥氯气的集气瓶里，会怎样？',
    hint: '课本第 46 页【实验2-8】。先猜，再动手；氯气有毒，放进去以后别忘了盖上玻璃片。',
    options: ['湿润的褪色，干燥的不褪色', '两条都褪色', '两条都不褪色'],
    answer: 0,
  },
  need: '取干燥的和湿润的有色纸条各一条，分别放入两个盛有干燥氯气的集气瓶中，盖上玻璃片，观察现象；再将有色鲜花放入盛有干燥氯气的集气瓶中，盖上玻璃片，观察现象',
  conclusion: {
    page: 51, rect: [64, 56, 382, 99],
    quote: '次氯酸的强氧化性还能使某些染料和有机色素褪色，因此，次氯酸可用作棉、麻和纸张的漂白剂。',
    formula: 'Cl₂ + H₂O ⇌ HCl + HClO',
    why: '干燥的有色纸条放进干燥的氯气里<b>没有明显变化</b>；湿润的有色纸条、含有水分的有色鲜花都<b>褪色</b>了——在本实验条件下，褪色主要来自氯气与水反应生成的次氯酸。<br>溶于水中的部分氯气与水发生反应：Cl₂ + H₂O ⇌ HCl + HClO（课本第 46 页；“⇌”表示可逆反应，只有一部分氯气发生反应）。生成的次氯酸（HClO）有强氧化性，能使某些染料和有机色素褪色（课本第 47 页）——<b>起漂白作用的是 HClO</b>，不是 Cl₂ 本身。氯气有毒，实验时要戴护目镜、保持通风、实验后洗手。',
    src: '课本第 46–47 页 · 第二章 第二节 氯及其化合物',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (key, row) => { if (S.said[key]) return; S.said[key] = true; if (!S.demo) W?.tbl.add(row); };
    paperSheet(group, { w: 0.34, d: 0.2, x: 0, z: 0.035 });
    const plate = (text, w, hh) => textPlate(text, { w, h: hh, color: '#23293a', bg: '#fffaf0', font: `bold ${Math.floor(Math.min(0.8 * 512 * hh / w, 0.82 * 512 / text.length))}px "Songti SC", serif` });

    // ================= 三个集气瓶（干燥的氯气）：瓶口的玻璃片、黄绿色的氯气、漏出来的氯气 =================
    const jars = JX.map((x) => { const j = gasJar({ r: JR, h: JH }); j.position.set(x, 0, 0); group.add(j); j.setWater(0); return j; });
    const JNECK = JR * 0.72;
    const profile = [[0.0003, 0.0015], [JR - 0.0004, 0.0015], [JR - 0.0004, JH * 0.78], [JNECK - 0.0004, JH * 0.9], [JNECK - 0.0004, JH - 0.001], [0.0003, JH - 0.001]];
    const gasMats = jars.map(() => new THREE.MeshBasicMaterial({ color: CL2, transparent: true, opacity: 0.4, depthWrite: false }));
    jars.forEach((j, k) => { const g = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 36), gasMats[k]); g.renderOrder = 8; g.raycast = () => {}; j.add(g); });
    const platePicks = jars.map((j, k) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.05), new THREE.MeshBasicMaterial({ visible: false })); p.userData.pick = true; p.userData.track = true; j.plate.add(p); return p; });
    jars.forEach((j, k) => { const l = plate('Cl₂', 0.016, 0.0074); l.position.set(0, 0.0105, JR + 0.0016); j.add(l); });
    ITEMS.forEach((sp, i) => { const l = plate(sp.name, 0.058, 0.0085); l.rotation.x = -Math.PI / 2; l.position.set(JX[i], 0.0012, 0.126); group.add(l); });
    const smokes = jars.map(() => { const s = smoke2({ max: 50, color: CL2, opacity: 0.5 }); s.mesh.renderOrder = 13; group.add(s.mesh); return s; });
    const warning = tag('', 'pill');
    const cards = JX.map(() => tag('', 'cond'));

    // ================= 纸条、鲜花：原点在拿着的那一端（挂在瓶口），身子朝下；平放时朝自己这边 =================
    const colTmp = new THREE.Color(), colA = new THREE.Color(), colB = new THREE.Color();
    const G = [], mats = [], dots = [], picks = [];
    const dotPos = ITEMS.map((sp) => Array.from({ length: 28 }, () => {
      if (sp.kind === 'strip') return V((Math.random() - 0.5) * 0.007, -0.004 - Math.random() * (LEN - 0.008), 0.0012);
      const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * 0.0135; return V(Math.cos(a) * r, -0.047 + Math.sin(a) * r, 0.0035);
    }));
    ITEMS.forEach((sp, i) => {
      const g = new THREE.Group(); G.push(g); group.add(g);
      const mat = paint(sp.color, { keep: true, unique: true, transparent: true, opacity: 1 }); mats.push(mat);          // 放进透明队列、画在瓶里的黄绿色气体之后：瓶里的纸条看得出自己本来的颜色
      let pickBox;
      if (sp.kind === 'strip') {
        const body = inked(new THREE.Mesh(new THREE.BoxGeometry(0.01, LEN, 0.0005), mat), { width: 0.6 }); body.position.y = -LEN / 2; g.add(body);
        if (sp.w > 0) for (let n = 0; n < 9; n++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.0008, 8, 6), paint(0xe2f1f8, { keep: true, transparent: true, opacity: 0.85 })); d.position.set((Math.random() - 0.5) * 0.007, -0.006 - Math.random() * (LEN - 0.012), 0.0007); d.scale.z = 0.6; g.add(d); }
        pickBox = new THREE.BoxGeometry(0.018, LEN + 0.006, 0.016); pickBox.translate(0, -LEN / 2, 0);
      } else {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0004, 0.0004, 0.042, 6), paint(0x4f8a3a, { keep: true })); stem.position.y = -0.021; g.add(stem);
        const head = new THREE.Group(); head.position.set(0, -0.047, 0); g.add(head);
        const PG = new THREE.SphereGeometry(1, 10, 6);
        for (let ring = 0; ring < 2; ring++) {
          const n = ring ? 10 : 15, rad = ring ? 0.005 : 0.0085;
          for (let j = 0; j < n; j++) {
            const a = (j / n) * Math.PI * 2 + ring * Math.PI / n, p = new THREE.Mesh(PG, mat);
            p.scale.set(ring ? 0.0019 : 0.0024, ring ? 0.0058 : 0.0073, 0.0007);
            p.position.set(Math.cos(a) * rad, Math.sin(a) * rad, ring ? 0.0007 : -0.0006); p.rotation.z = a - Math.PI / 2; head.add(p);
          }
        }
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0034, 14, 10), paint(0xe8c22a, { keep: true })); eye.scale.z = 0.5; eye.position.z = 0.0016; head.add(eye);
        pickBox = new THREE.BoxGeometry(0.036, 0.064, 0.03); pickBox.translate(0, -0.032, 0);
      }
      g.traverse((o) => { if (o.isMesh && o.material?.transparent) o.renderOrder = 8.5; });
      const pk = new THREE.Mesh(pickBox, new THREE.MeshBasicMaterial({ visible: false })); pk.userData.pick = true; g.add(pk); picks.push(pk);
      const dm = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: HCLO, transparent: true, opacity: 0.92 }), 28);
      dm.count = 0; dm.frustumCulled = false; dm.renderOrder = 12; dm.raycast = () => {}; g.add(dm); dots.push(dm);
    });
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3();
    // 手：拿着时在拖动平面上（纸条、花提起来垂在它上方）；没拿着时就在东西手里那一端（拖动时“抓的地方”按它记）
    const hands = ITEMS.map(() => { const o = new THREE.Object3D(); group.add(o); return o; });

    // ================= 状态 =================
    const fresh = () => ({
      demo: false, near: false, said: {}, msub: null, last: 1, leak: 0, t: 0,
      jar: JX.map(() => ({ c: 1, open: false, po: 0, item: -1, openT: 0 })),
      it: ITEMS.map((sp, i) => ({ pos: home(i).toArray(), drag: false, hand: null, up: false, xz: false, corr: null, from: -1, go: null, jar: -1, was: false, lie: 1, h: 0, d: 1, tIn: 0 })),
    });
    S = fresh();
    const inMotion = () => S.it.some((it) => it.go);

    // ---- 动作：手提起来、拿着走；在推开了玻璃片的瓶口上方松手 → 竖直放进去；别处松手 → 很快放回桌上 ----
    const goHome = (i) => { const it = S.it[i]; it.drag = false; it.go = { home: true, k: -1 }; };
    const MOUTH_R = JR * 0.72 + 0.002;          // 瓶口内半径 + 一点余量：纸条、花茎真的在瓶口里才算
    const release = (i) => {
      const it = S.it[i], c = it.hand, up = it.up; it.drag = false; it.hand = null; it.up = false; it.xz = false; it.corr = null;
      if (!c || !up) return goHome(i);
      const k = JX.findIndex((x) => Math.hypot(c[0] - x, c[2]) < MOUTH_R);
      if (k < 0) return goHome(i);
      if (S.jar[k].item >= 0 || S.it.some((o) => o.go?.k === k)) { status('这个瓶里已经有东西了。换一个空的集气瓶。'); return goHome(i); }
      if (!S.jar[k].open) { status('瓶口盖着玻璃片，放不进去：先点一下<b>玻璃片</b>推开，再把它放进去。'); return goHome(i); }
      it.go = { k };
    };
    const A = {
      tapPlate(k) {
        const J = S.jar[k];
        if (J.open) {
          if (S.it.some((o) => o.go?.k === k)) return;
          J.open = false;
          const i = J.item;
          if (i >= 0) { status(i === 0 ? '盖上玻璃片了。看看干燥的纸条会不会褪色。' : i === 1 ? '盖上玻璃片了。看看湿润的纸条的颜色。' : '盖上玻璃片了。看看花的颜色。'); }
          else status('盖上了。氯气有毒：空瓶也别开着。');
        } else { J.open = true; J.openT = 0; status(J.item >= 0 ? '推开了玻璃片：氯气会从瓶口漫出来（有毒），要看的话盖上，不要开着。' : '推开了玻璃片。把纸条或鲜花提起来，拖到瓶口上方松手放进去，放好马上盖上。'); }
      },
      reset() {
        if (bar.playing) bar.stop(); viewGen++; S = fresh(); sync(); mic.close();
        W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; W.ui.relock(); }
        bar.undo('strips', 'seeStrips', 'flower', 'seeFlower', 'why'); status('三个瓶里又是满满的干燥氯气了，纸条和鲜花都放回桌上。');
      },
    };
    const sync = () => { hands.forEach((o, i) => o.position.fromArray(S.it[i].pos)); smokes.forEach((s) => s.clear()); S.jar.forEach((J, k) => { J.po = J.open ? 1 : 0; poseJar(k, 0); }); ITEMS.forEach((sp, i) => { G[i].position.fromArray(S.it[i].pos); G[i].rotation.x = -Math.PI / 2 * S.it[i].lie; }); };
    const poseJar = (k, dt) => { const J = S.jar[k]; J.po = clamp(J.po + (J.open ? 1 : -1) * dt * 3.5, 0, 1); const e = ease(J.po); jars[k].plate.position.set(0, JH + 0.0009 + 0.003 * e, -0.046 * e); };

    // ---- 拖放 ----
    // 两段：先在竖着的平面里（穿过手里那一端）往上提——手提多高，东西就提多高（纸条、花从平放变成垂下来；从瓶里拿出来时只能竖直往上）；
    //   提到瓶口上方的高度 CY 以后，换成这个高度的水平面，跟着手平移。都保留抓的地方（不跳到手下）。
    const itemDrag = (i) => ({
      obj: picks[i],
      get plane() { const it = S.it[i]; if (it.drag && it.up) { it.xz = true; return 'xz'; } return 'xy'; },
      get offset() { const it = S.it[i]; return it.drag && it.up ? CY : it.drag && it.hand ? it.hand[2] : it.pos[2]; },
      keepOffset: true, anchor: hands[i],
      enabled: () => !(S.it[i].go?.k >= 0) && !(S.it[i].jar >= 0 && !S.jar[S.it[i].jar].open),
      hint: () => (S.it[i].jar >= 0 ? `${ITEMS[i].name}：往上提出来，放回桌上` : `${ITEMS[i].name}：提起来，拖到推开了玻璃片的瓶口上方，松手放进去`),
      onStart: () => { const it = S.it[i]; it.go = null; it.from = it.jar; if (it.jar >= 0) { S.jar[it.jar].item = -1; it.jar = -1; } it.drag = true; it.up = it.pos[1] >= CY - 0.001; it.xz = false; it.corr = null; it.hand = [...it.pos]; },
      onDrag: (p) => {
        if (!p) return; const it = S.it[i];
        if (!it.up) {
          const fromJar = it.from >= 0;
          const y = Math.min(CY, Math.max(fromJar ? JH : LY, p.y));
          it.hand = fromJar ? [JX[it.from], y, 0] : [clamp(p.x, -0.2, 0.2), y, clamp(p.z, -0.12, 0.16)];
          if (y >= CY) it.up = true;
        } else {
          // 换成水平面的第一下：记下手和东西的差（真鼠标换平面时光标下的点会变）；演示、质检直接给的就是位置
          if (!it.corr) it.corr = it.xz ? [it.hand[0] - p.x, it.hand[2] - p.z] : [0, 0];
          it.hand = [clamp(p.x + it.corr[0], -0.2, 0.2), CY, clamp(p.z + it.corr[1], -0.12, 0.16)];
        }
      },
      onEnd: () => release(i),
    });
    const drag = draggable(group, [...ITEMS.map((_, i) => itemDrag(i))], {
      tip: tag('', 'pill'),
      taps: platePicks.map((p, k) => ({ obj: p, hint: () => (S.jar[k].open ? '玻璃片：点一下，盖上' : '玻璃片：点一下，推开'), onTap: () => A.tapPlate(k) })),
    });
    const act = demoActs(drag, group);

    // ---- 钻进去看：东西表面上，氯气分子和水 ----
    const sub = () => S.msub ?? S.last;
    const subAt = () => { const it = S.it[sub()]; return it.jar >= 0 ? V(JX[it.jar], 0.04, 0) : V(JX[sub()], 0.02, HOME_Z + 0.04); };
    const mic = micro({ tag, look, back, group, scene: chlorineScene(), at: subAt, btnAt: () => subAt().add(V(0.03, 0.045, 0)), label: '钻进去看',
      state: () => { const i = sub(), it = S.it[i]; return { wet: ITEMS[i].w > 0, c: it.jar >= 0 ? S.jar[it.jar].c : 0, hn: it.h, inJar: it.jar >= 0, was: it.was }; },
      key: () => `${sub()}|${S.it[sub()].jar >= 0}`, bar: () => bar, scale: 0.0068, lookD: [0.03, 0.55, 1], dist: 0.26 });          // 从斜上方看：水里的、上面飞的分得开

    const jarK = (i) => S.it[i].jar;
    let viewGen = 0;          // 演示中途点了“全部重来”：演示退出后不再恢复演示前开着的“钻进去看”
    // 演示：先竖直提起来，再平移到瓶口上方，松手（和学生拖的两段一样）
    const path = (i, to, t0, t1) => act.path(picks[i], [() => V(...S.it[i].pos), () => V(S.it[i].pos[0], CY, S.it[i].pos[2]), ...to], { t0, t1, release: t1 + 0.02 });
    const over = (k) => () => V(JX[k], CY, 0);
    const CAM = (y = 0.05, d = 0.44) => [[0, y, 0.01], [0.03, 0.25, 1], d];
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'strips', title: '放入纸条', todo: '<b>点玻璃片</b>推开，把<b>干燥的</b>和<b>湿润的</b>有色纸条分别放进两个集气瓶；<b>每放好一条，马上点玻璃片盖上</b>（氯气有毒）。',
          target: () => nextFor([0, 1]) },
        { id: 'seeStrips', title: '观察纸条', todo: '观察：两条纸条的颜色，哪一条变了？', target: () => null },
        { id: 'flower', title: '放入鲜花', todo: '<b>点玻璃片</b>推开第三个集气瓶，把<b>有色鲜花</b>放进去，<b>马上点玻璃片盖上</b>。',
          target: () => nextFor([2]) },
        { id: 'seeFlower', title: '观察鲜花', todo: '观察：花瓣的颜色有什么变化？', target: () => null },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { sync(); mic.close(); }, view: { save: () => (mic.isOpen ? { gen: viewGen } : null), restore: (v) => { if (v.gen === viewGen) mic.open(); } } }),
          shots: [
            { cap: '取干燥的有色纸条，推开玻璃片，放入盛有干燥氯气的集气瓶中，马上盖上玻璃片（氯气有毒）。', dur: 7, cam: CAM(0.05, 0.42),
              during: act.seq(act.tap(platePicks[0], 0.04), path(0, [over(0)], 0.12, 0.58), act.tap(platePicks[0], 0.86)) },
            { cap: '再取湿润的有色纸条，放入另一个盛有干燥氯气的集气瓶中，盖上玻璃片。', dur: 7, cam: CAM(0.05, 0.42),
              during: act.seq(act.tap(platePicks[1], 0.04), path(1, [over(1)], 0.12, 0.58), act.tap(platePicks[1], 0.86)) },
            { cap: '观察：干燥的纸条没有变化；湿润的纸条慢慢褪色。', dur: 6, speed: 2, cam: CAM(0.05, 0.4) },
            { cap: '将有色鲜花放入盛有干燥氯气的集气瓶中，盖上玻璃片。', dur: 8, cam: CAM(0.05, 0.42),
              during: act.seq(act.tap(platePicks[2], 0.04), path(2, [over(2)], 0.12, 0.55), act.tap(platePicks[2], 0.85)) },
            { cap: '观察：花瓣原来的紫红色慢慢褪去，呈浅黄色（和课本图2-14 一样）。', dur: 7, speed: 2, cam: CAM(0.05, 0.4) },
            { cap: '钻进去看：干燥的纸条表面没有水，氯气分子在上面飞，不发生变化。', dur: 6, cam: [[JX[0], 0.09, 0], [0.03, 0.55, 1], 0.26], enter: () => { S.msub = 0; mic.open(true); }, during: act.at(0.98, () => mic.close()) },
            { cap: '湿润的纸条上有水：氯气和水反应，生成 HClO 和 HCl——使纸条褪色的是次氯酸。演示完了，换你自己做。', dur: 8, cam: [[JX[1], 0.09, 0], [0.03, 0.55, 1], 0.26], enter: () => { S.msub = 1; mic.open(true); }, during: act.at(0.98, () => mic.close()) },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);
    // 步骤栏光圈：开着、里面已经放了东西的瓶 → 它的玻璃片（马上盖上）；还没放的东西 → 有推开了的空瓶就是这件东西，没有就是一块空瓶的玻璃片
    const nextFor = (list) => {
      if (inMotion() || S.it.some((o) => o.drag)) return null;
      const openWith = S.jar.findIndex((J) => J.open && J.item >= 0); if (openWith >= 0) return jars[openWith].plate;
      const i = list.find((n) => S.it[n].jar < 0); if (i == null) return null;
      if (S.jar.some((J) => J.open && J.item < 0)) return G[i];
      const k = [i, 0, 1, 2].find((n) => S.jar[n].item < 0); return k != null ? jars[k].plate : null;
    };

    const step = (dt, t) => {
      S.t += dt;
      // ---- 玻璃片、瓶里的氯气 ----
      S.jar.forEach((J, k) => {
        poseJar(k, dt);
        if (J.open) { J.openT += dt; const lost = J.c * (1 - Math.exp(-dt / TAU)); J.c -= lost; S.leak += lost; }
        gasMats[k].opacity = 0.5 * J.c;
        smokes[k].update(dt, { rate: J.open && J.c > 0.05 && J.po > 0.2 ? 16 * J.c : 0, origin: V(JX[k], JH - 0.003, JR * 0.82), spread: 0.012, up: -0.03, size: 0.011, life: 2.2 });
      });
      const leaking = S.it.some((o) => o.drag || o.go) ? -1 : S.jar.findIndex((J) => J.open && J.openT > 2.2 && J.c > 0.08);          // 正拿着东西往瓶里放的时候不催
      warning.text('氯气有毒！盖上玻璃片').loc(group, JX[Math.max(0, leaking)], JH + 0.032, 0).show(leaking >= 0 && !bar.playing);
      if (S.jar.some((J) => J.c < 0.8) && !S.said.leak && S.jar.every((J) => !J.open)) { log('leak', ['玻璃片开着，没有及时盖上', '瓶里的<b>黄绿色变淡</b>了，氯气漫了出来', '氯气有毒；而且瓶里氯气少了，褪色会变慢']); status('瓶里的氯气跑出去不少（黄绿色变淡了）：氯气有毒，要及时盖上玻璃片，要在通风处做。氯气少了，褪色也会变慢。想重来点“全部重来”。'); }
      // ---- 纸条、鲜花：拿着走、挂进瓶里、HClO、褪色 ----
      ITEMS.forEach((sp, i) => {
        const it = S.it[i], g = G[i];
        // 拿着：先竖直提到 CY（纸条、花从平放转成垂下来），再跟着手；放进瓶里：平移到瓶口上方，等玻璃片推开，竖直放下去；放回：平移到原处上方，边放低边放平
        const p = V(...it.pos), hm = home(i);
        if (it.drag) {
          const h = it.hand || it.pos;
          p.lerp(V(h[0], h[1], h[2]), 1 - Math.exp(-dt * 26));
        } else if (it.go) {
          // 放回：先平移到原处上方，再放下；放进瓶里：在瓶口上方对正，竖直放下去
          const k = it.go.k, dest = k >= 0 ? hang(k) : hm, far = Math.hypot(p.x - dest.x, p.z - dest.z) > 0.003;
          const goal = far ? V(dest.x, Math.max(p.y, dest.y), dest.z) : k >= 0 && S.jar[k].po < 0.85 ? null : dest;
          if (goal) p.lerp(goal, 1 - Math.exp(-dt * 18));
          if (!far && p.distanceTo(dest) < 0.0006) {
            p.copy(dest); it.go = null;
            if (k >= 0) {
              it.jar = k; S.jar[k].item = i; S.jar[k].openT = 0; it.tIn = 0; it.was = true; S.last = i;
              status(i === 0 ? '放进去了：干燥的纸条。点一下<b>玻璃片</b>盖上。' : i === 1 ? '放进去了：湿润的纸条。点一下<b>玻璃片</b>盖上。' : '放进去了：有色鲜花。点一下<b>玻璃片</b>盖上。');
            }
          }
        } else if (it.jar >= 0) p.copy(hang(it.jar));
        it.pos = p.toArray();
        // 平放 ↔ 垂下来：在原处上方时跟着高度走（提起来就垂下来，放低就放平，不戳进桌面），别处都垂着
        const free = it.jar < 0 && !(it.go?.k >= 0);          // 不在瓶里：放得低就平放在桌上，提起来就垂下来（不戳进桌面）
        it.lie = free ? Math.acos(clamp((p.y - LY) / LEN, 0, 1)) / (Math.PI / 2) : 0;
        g.position.fromArray(it.pos); g.rotation.x = -Math.PI / 2 * it.lie;
        if (it.drag && it.hand) hands[i].position.set(...it.hand); else hands[i].position.copy(p);
        // 次氯酸、褪色
        const c = it.jar >= 0 ? S.jar[it.jar].c : 0;
        it.h += (c * sp.w - it.h) * (1 - Math.exp(-KB * dt));
        it.d *= Math.exp(-KD * it.h * dt);
        if (it.jar >= 0 && !S.jar[it.jar].open) it.tIn += dt;
        colA.set(sp.color); colB.set(sp.fade); mats[i].color.copy(colTmp.copy(colA).lerp(colB, 1 - it.d));
        const n = Math.round(28 * clamp(it.h, 0, 1));
        for (let j = 0; j < n; j++) { const q = dotPos[i][j]; s4.setScalar(0.0011 * (1 + 0.15 * Math.sin(t * 3 + j))); m4.compose(q, q4, s4); dots[i].setMatrixAt(j, m4); }
        dots[i].count = n; dots[i].instanceMatrix.needsUpdate = true;
      });
      // ---- 现象、步骤 ----
      const closedIn = (i) => S.it[i].jar >= 0 && !S.jar[S.it[i].jar].open;
      if (!S.demo) {
        if (closedIn(0) && closedIn(1) && !inMotion()) done('strips');
        if (closedIn(2) && !inMotion()) done('flower');
      }
      // 干燥纸条这一组对照要瓶里有足量的氯气（课本：盛有干燥氯气的集气瓶）：漏掉大半的瓶只记现象，说清后果和怎么办
      if (closedIn(0) && S.it[0].tIn > 8 && S.it[0].d > 0.95) {
        const c0 = S.jar[S.it[0].jar].c;
        if (c0 >= 0.5) log('dry', ['把干燥的有色纸条放进干燥的氯气，盖上玻璃片', '纸条<b>没有明显变化</b>', '在干燥的氯气里，这条纸条没有褪色']);
        else if (!S.said.dryLow) { log('dryLow', ['把干燥的有色纸条放进漏掉大半氯气的瓶里，盖上玻璃片', '纸条没有明显变化', `瓶里的氯气只剩开始的约 ${Math.round(c0 * 100)}%：氯气太少，比不出来`]); status(`这个瓶里的氯气只剩开始的约 ${Math.round(c0 * 100)}%，太少了，比不出干燥的氯气能不能使纸条褪色。把干燥的纸条换到氯气满的瓶里，或者点“全部重来”。`); }
      }
      if (closedIn(1) && S.it[1].d < 0.3) log('wet', ['把湿润的有色纸条放进干燥的氯气，盖上玻璃片', '纸条<b>褪色</b>了', '纸条上有水：氯气与水反应生成次氯酸，次氯酸使它褪色']);
      if (closedIn(2) && S.it[2].d < 0.3) log('flower', ['把有色鲜花放进干燥的氯气，盖上玻璃片', '花瓣原来的紫红色<b>褪去</b>，呈浅黄色', '鲜花含有水分：同样是次氯酸在起作用']);
      if (S.said.dry && S.said.wet && !S.said.strips2) { S.said.strips2 = true; done('seeStrips'); if (!S.demo) { W?.t1.open(); status('干燥的纸条没变，湿润的褪色了。在左边作答，也可以继续做鲜花。'); } }
      if (S.said.flower && !S.said.flower2) { S.said.flower2 = true; done('seeFlower'); if (!S.demo) { W?.t2.open(); status('鲜花也褪色了。在左边作答。'); } }
      // 观察卡：瓶里有东西时，在瓶前显示这一组实际的褪色和氯气浓度（示意值）
      S.jar.forEach((J, k) => {
        const i = J.item, ok = i >= 0 && !S.it[i].go;
        if (!ok) return cards[k].show(false);
        const it = S.it[i], fade = Math.round((1 - it.d) * 100), cl = Math.round(J.c * 100);
        // 照初中的卡片：名字 + 现象词，一行数字，图例
        const st = ITEMS[i].w === 0 ? '不变' : fade < 5 ? '还没褪色' : fade < 85 ? '褪色中' : '已褪色';
        cards[k].text(`<div class="cc"><div class="cc-t"><span class="cc-name">${ITEMS[i].name}</span><span class="cc-res">${st}</span></div><div class="cc-more"><div class="cc-obs"><small>模型褪色约</small><b>${fade}</b><small>%</small></div><div class="cc-obs"><small>氯气浓度约为初始的</small><b>${cl}</b><small>%</small></div>${ITEMS[i].w > 0 ? '<div class="cc-note">紫点 = HClO（示意）</div>' : ''}</div></div>`)
          .loc(group, JX[k], 0.0, 0.07).show(!bar.playing && !mic.isOpen);
      });
      mic.update?.(dt);
    };

    return {
      group: root, pointer, card: false, toggles: ['cards', 'steps'],
      size: { w: 0.28, d: 0.15, h: 0.12 },
      view: { elev: 24, azim: -6, lookY: 0.42, frameMargin: 1.08 },
      mount(ui) {
        const t2 = think({ q: '鲜花也褪色了。是什么使有色鲜花褪色的？', options: ['鲜花里有水，氯气与水反应生成的次氯酸', '干燥的氯气本身', '氯气把花烧焦了'], wrong: ['干燥的纸条在同样的氯气里没有明显变化：这个实验里，褪色离不开水。', '花瓣只是变淡了，没有烧焦：是色素被氧化褪色。'], ok: '对：Cl₂ + H₂O ⇌ HCl + HClO（课本第 46 页）。次氯酸的强氧化性使色素褪色（第 47 页）。', status: (m) => W?.status(m), onOk: () => { done('why'); if (W) W.next.hidden = false; } });
        const t1 = think({ q: '干燥的纸条没有褪色，湿润的纸条褪色了。这说明什么？', options: ['有水才能褪色：氯气和水反应生成的物质使它褪色', '干燥的氯气也能漂白，只是比较慢', '水能使有色纸条褪色'], wrong: ['干燥的纸条在氯气里放了这么久，一点也没变。', '纸条本来就是湿的，在没有氯气的地方不会褪色。'], ok: '对：氯气溶于水，一部分与水反应生成次氯酸（HClO），是它使色素褪色。', status: (m) => W?.status(m) });
        const more = moreBox([['钻进去看：干燥的纸条', () => { S.msub = 0; mic.open(); }], ['钻进去看：湿润的纸条', () => { S.msub = 1; mic.open(); }], ['钻进去看：有色鲜花', () => { S.msub = 2; mic.open(); }]], () => A.reset());
        const note = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'), h('p', { class: 'fineprint', html: '三个瓶里是干燥的氯气（浓度记 1，黄绿色深浅跟着浓度走；卡片上的“氯气浓度约为初始的 …%”是相对这个开始浓度的百分数，“模型褪色约 …%”是模型里色素减少的比例，不是实测），氯气有毒（课本第 46 页；实验图标：护目镜、排风、洗手）。玻璃片推开时氯气从瓶口漫出来：浓度按时间常数 60 s 减小（氯气比空气重，敞口时慢慢漫出来；示意）；盖上以后不再变。<br>含水量（示意）：干燥纸条按不含水，湿润纸条 1，鲜花 0.6（鲜花含水分）。溶于水的氯气一部分与水反应 Cl₂ + H₂O ⇌ HCl + HClO（课本第 46 页，“⇌”是可逆反应）：纸条上次氯酸的量向“氯气浓度 × 含水量”靠拢（时间常数约 2 s），离开氯气又回去。<br>次氯酸的强氧化性使色素褪色（课本第 47 页），褪色不可逆：褪色的快慢和次氯酸的量、剩下的色素成正比。<b>画面里的快慢是示意</b>，真实的快慢和氯气浓度、含水量有关。瓶里的氯气很多，被反应掉的忽略。紫色小点表示 HClO，黄绿色表示氯气。' }));
        const base = mountXuean(ui, { controls: [more, note], headers: ['做了什么', '现象', '说明'], intro: '三个集气瓶里是黄绿色的干燥氯气——氯气有毒（课本图标：戴护目镜、开排风、实验后洗手）。先取干燥的和湿润的有色纸条各一条，分别放进瓶里。' });
        ui.data.append(t1.el, t2.el, base.next);
        W = { ...base, ui, t1, t2, status: ui.status }; bar.attach(ui);
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { bar.dispose(); drag.dispose(); mic.dispose?.(); smokes.forEach((s) => s.dispose()); },
      debug: {
        get S() { return S; }, bar, A,
        picks: { dry: picks[0], wet: picks[1], flower: picks[2] },
        qa: qaFlow(drag, [
          { name: '推开第一块玻璃片', tap: platePicks[0], wait: 0.6, scale: 1 },
          { name: '放入干燥纸条', drag: picks[0], to: () => V(JX[0], CY, 0), wait: 1.8, scale: 1 },
          { name: '盖上第一块玻璃片', tap: platePicks[0], wait: 0.5, scale: 1 },
          { name: '推开第二块玻璃片', tap: platePicks[1], wait: 0.6, scale: 1 },
          { name: '放入湿润纸条', drag: picks[1], to: () => V(JX[1], CY, 0), wait: 1.8, scale: 1 },
          { name: '盖上第二块玻璃片', tap: platePicks[1], wait: 12, scale: 1 },
          { name: '推开第三块玻璃片', tap: platePicks[2], wait: 0.6, scale: 1 },
          { name: '放入鲜花', drag: picks[2], to: () => V(JX[2], CY, 0), wait: 2.5, scale: 1 },
          { name: '盖上第三块玻璃片', tap: platePicks[2], wait: 18, scale: 1 },
          { name: '钻进去看', run: () => { S.msub = 1; mic.open(); }, wait: 4 },
          { name: '合上', run: () => mic.close(), wait: 1 },
          { name: '核对', run: () => { if (!(S.said.dry && S.said.wet && S.said.flower && S.it[0].d > 0.95 && S.it[1].d < 0.3 && S.it[2].d < 0.3)) throw new Error(JSON.stringify({ said: S.said, d: S.it.map((x) => x.d), h: S.it.map((x) => x.h), c: S.jar.map((x) => x.c) })); }, wait: 1 },
          { name: '想一想 1', run: () => W.t1.el.querySelector('button').click() },
          { name: '想一想 2', run: () => W.t2.el.querySelector('button').click() },
        ]),
      },
    };
  },
};
