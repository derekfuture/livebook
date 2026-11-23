// 人教版高中化学必修第一册第 35 页【实验2-2】（图2-3 钠在空气中燃烧）：将一个干燥的坩埚加热，同时切取一块绿豆大的钠，迅速投到热坩埚中。
//   继续加热坩埚片刻，待钠熔化后立即撤掉酒精灯，观察现象。注意：不要近距离俯视坩埚！
// 课本：钠受热后先熔化，然后与氧气剧烈反应，发出黄色火焰，生成一种淡黄色固体——过氧化钠（Na₂O₂）。2Na + O₂ △══ Na₂O₂
// 模型（示意，界面上写明）：
//   坩埚：酒精灯加热，温度向约 520 ℃ 趋近（时间加快：十几秒热起来，实际要一两分钟）；撤掉灯后慢慢变凉。
//   酒精灯：拖开 = 撤灯，拖回坩埚下面接着加热；点一下 = 点燃 / 盖灭（点不替人搬运）。
//   钠（课本第 34 页数据：熔点 97.79 ℃、密度 0.97 g/cm³）：从坩埚吸热，先升温、再熔化（吸收熔化热），熔化后升到约 125 ℃ 着火（示意）。
//   燃烧：消耗速度和表面积成正比，绿豆大（约 40 mg）烧六七秒；生成 Na₂O₂ 的质量按 2Na ~ Na₂O₂ 算。
//   没撤酒精灯一直加热、或者钠块太大：反应更剧烈，熔化的钠溅出（定性）。切下的钠放在空气里，切面很快变暗（实验2-1，生成 Na₂O）。
//   钠块、钠球按长度放大 2 倍画；切的钠条截面约 3.5 mm 见方，切下多长就是多少毫克。
import * as THREE from 'three';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs, mountXuean, moreBox } from './kit/chemlesson.js';
import { draggable, clamp } from './kit/interact.js';
import { tweezers, sodiumKnife, sodiumBurnScene, NA, reach } from './kit/sodium.js';
import { chemLamp } from './kit/chem.js';
import { lampCap, homeLift } from './kit/labops.js';
import { flame2, smoke2, Sparks } from './kit/chemfx.js';
import { micro } from './kit/microworld.js';
import { stand, textPlate } from './kit/props.js';
import { paint, inked } from '../live/ink.js';
import { sfx } from './kit/audio.js';
import { h } from '../ui/Panel.js';

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const EX = 2, A_REAL = 0.0035, A = A_REAL * EX;          // 放大倍数；钠条截面边长（真实 / 画出来）
const mmOf = (g) => (g / 1000 / (NA.density * A_REAL * A_REAL)) * EX;          // 切下 g 克，画出来多长（m）
const ST = V(-0.075, 0, -0.045), RING_Y = 0.106;          // 铁架台转过来：铁杆在后面，铁圈朝前伸
const PAPER = V(0.07, 0.002, -0.006), BAR_LEN = 0.05, BAR_LEFT = PAPER.x - BAR_LEN / 2;
const STOCK = BAR_LEN / EX * A_REAL * A_REAL * NA.density * 1000;          // 整根钠条多少克（约 0.3 g）
const KN = V(0.072, 0.003, 0.038), TW = V(0.004, 0.003, 0.058);
const QK0 = new THREE.Quaternion(), QK1 = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(0, 0, 1), V(1, 0, 0), V(0, 1, 0)));          // 小刀：平放 / 竖起来切（刀身横过钠条）
const IGNITE = 125, T_LAMP = 520;
const DEMO_T = { melt: 3.8, burn: 7 };          // 老师演示：熔化撤灯、燃烧两个镜头的长度（按模型量过：撤灯在着火之前，燃烧镜头结束时火刚灭）

export default {
  id: 'naburn',
  fig: '图2-3',
  title: '钠在空气中燃烧',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '常温下，钠的切面在空气里很快变暗（生成氧化钠）。把钠放到热坩埚里加热，会怎样？',
    hint: '课本第 35 页【实验2-2】。先猜，再动手。',
    options: ['先熔化，然后燃烧，发出黄色火焰', '只是慢慢变暗，和常温一样', '不熔化，直接变成白色粉末'],
    answer: 0,
  },
  need: '加热干燥的坩埚，切绿豆大的钠迅速投进去；继续加热，钠熔化后立即撤掉酒精灯，观察现象',
  conclusion: {
    page: 39, rect: [64, 606, 376, 668],
    quote: '可以看到，钠受热后先熔化，然后与氧气剧烈反应，发出黄色火焰，生成一种淡黄色固体。这种淡黄色固体是过氧化钠（Na2O2）。',
    formula: '2Na + O₂ △══ Na₂O₂',
    why: '钠的熔点低（97.79 ℃），在热坩埚里先<b>熔化</b>成闪亮的小球；温度再升高一点就和氧气<b>剧烈反应</b>，发出<b>黄色火焰</b>，放出大量的热——撤掉酒精灯它照样烧下去。燃烧后留下<b>淡黄色固体</b>：过氧化钠 Na₂O₂。<br>同样是钠和氧气：常温下生成白色的 Na₂O（4Na + O₂ ══ 2Na₂O），加热时生成淡黄色的 Na₂O₂——条件不同，产物不同。钠的化合价都是 0 → +1，被氧化。',
    src: '课本第 34–35 页 · 第二章 第一节 钠及其化合物',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (key, row) => { if (S.said[key]) return; S.said[key] = true; if (!S.demo) W?.tbl.add(row); };
    paperSheet(group, { w: 0.3, d: 0.19, x: -0.005, z: 0.02 });

    // ---- 铁架台、铁圈、泥三角、坩埚 ----
    const st = stand({ height: 0.16, baseW: 0.12, baseD: 0.07 }); st.position.copy(ST); st.rotation.y = -Math.PI / 2; group.add(st);
    st.clamp(RING_Y, 0.065, { ring: true, r: 0.026 });
    const CX = ST.x, CZ = ST.z + st.rodX + 0.065, CRU = V(CX, RING_Y + 0.0055 - 0.0102, CZ);          // 坩埚底（外面）的位置
    const tri = new THREE.Group(); tri.position.set(CX, RING_Y + 0.0055, CZ); group.add(tri);
    // 泥三角：三根瓷管沿内切圆（半径 1.45 cm）的切线放，管子和坩埚壁相切；两根管子之间用铁丝连到三角形的角上，角搭在铁圈上
    const seg = (p1, p2, r, mat) => { const d = p2.clone().sub(p1), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 8), mat); m.position.copy(p1).add(p2).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return m; };
    const RHO = 0.0145, wireMat = paint(0x5c6470), clayMat = paint(0xc8774a);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 6, rad = V(Math.cos(a), 0, -Math.sin(a)), tan = V(Math.sin(a), 0, Math.cos(a)), mid = rad.clone().multiplyScalar(RHO);
      tri.add(inked(seg(mid.clone().addScaledVector(tan, -0.015), mid.clone().addScaledVector(tan, 0.015), 0.0026, clayMat), { width: 0.5 }));
      for (const sgn of [-1, 1]) tri.add(seg(mid.clone().addScaledVector(tan, sgn * 0.015), mid.clone().addScaledVector(tan, sgn * Math.sqrt(3) * RHO), 0.0005, wireMat));          // 管子两头到角上的铁丝
    }
    const PROF = [[0.0003, 0], [0.008, 0], [0.0095, 0.002], [0.0125, 0.012], [0.0155, 0.022], [0.0163, 0.0225]];
    const cru = inked(new THREE.Mesh(new THREE.LatheGeometry(PROF.map(([r, y]) => new THREE.Vector2(r, y)), 40), paint(0xf4f2ec, { side: THREE.DoubleSide })), { width: 0.6 }); cru.position.copy(CRU); group.add(cru);
    const BOT = CRU.clone().setY(CRU.y + 0.0016);          // 坩埚里面的底
    const crust = new THREE.Mesh(new THREE.CircleGeometry(0.0082, 32), paint(0xf2e2a2, { keep: true, transparent: true, opacity: 0 })); crust.rotation.x = -Math.PI / 2; crust.position.copy(BOT).setY(BOT.y + 0.0004); crust.renderOrder = 3; group.add(crust);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), new THREE.MeshStandardMaterial({ color: 0xeef3fa, metalness: 0.5, roughness: 0.2, emissive: 0xb8c2d0, emissiveIntensity: 0.3 })); ball.visible = false; group.add(ball);
    { const sph = ball.geometry.attributes.position.clone(), cub = ball.geometry.attributes.position;
      for (let i = 0; i < cub.count; i++) { const p = V(cub.getX(i), cub.getY(i), cub.getZ(i)); p.multiplyScalar(0.82 / Math.max(Math.abs(p.x), Math.abs(p.y), Math.abs(p.z))); cub.setXYZ(i, p.x, p.y, p.z); }
      ball.geometry.morphAttributes.position = [sph]; ball.updateMorphTargets(); }
    const fire = flame2({ w: 0.02, h: 0.045, core: 0xfffbe0, mid: 0xffd23f, edge: 0xffa82a, glowK: 0.4 }); fire.setOn(false); group.add(fire);          // 钠的火焰：黄色
    const smoke = smoke2({ max: 120, color: 0xf6f2e6, opacity: 0.55 }); smoke.mesh.renderOrder = 13; group.add(smoke.mesh);
    const sparks = new Sparks({ max: 200, color: 0xffd36a, tail: 0.01 }); group.add(sparks.mesh);
    const warning = tag('', 'pill', () => { back(); window.__lb?.stage?.resetView?.(); });          // 点一下：退回全景（离开坩埚正上方）
    const card = tag('', 'cond'); card.px = [-130, 0];          // 观察卡：坩埚左边

    // ---- 酒精灯（在坩埚下面；撤掉 = 拖开，拖回去接着加热；点一下点燃 / 盖灭）----
    const lamp = chemLamp(); lamp.scale.setScalar(0.68); group.add(lamp);
    const LAMP_IN = V(CX, 0.016, CZ), LAMP_OUT = V(CX, 0, CZ + 0.072);          // 撤掉：朝自己这边拉出来（演示、qa 拖到这里）
    lamp.position.copy(LAMP_IN);
    const lampPick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 10), new THREE.MeshBasicMaterial({ visible: false })); lampPick.position.set(0, 0.035, 0); lampPick.userData.pick = true; lamp.add(lampPick);
    const CAP_OFF = V(CX - 0.05, 0, CZ + 0.07), capper = lampCap(group, lamp, { off: CAP_OFF });
    let flameOn = false;

    // ---- 滤纸上的钠条（已吸干煤油）、小刀、镊子 ----
    const glass = inked(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.0018, 0.05), paint(0xd5e2e5, { transparent: true, opacity: 0.3, depthWrite: false })), { width: 0.6 }); glass.position.copy(PAPER).setY(0.0012); group.add(glass);
    const paper = inked(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.0007, 0.042), paint(0xfffced)), { width: 0.6 }); paper.position.copy(PAPER).setY(0.0026); group.add(paper);
    const naMat = paint(0xdce2e8, { keep: true }), pieceMat = paint(0xdce2e8, { keep: true });
    const bar0 = inked(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), naMat), { width: 0.6 }); group.add(bar0);
    const piece = inked(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), pieceMat), { width: 0.5 }); group.add(piece);
    const cutMark = new THREE.Mesh(new THREE.BoxGeometry(0.0005, 0.0003, A + 0.004), paint(0x4f5966)); cutMark.renderOrder = 4; group.add(cutMark);
    const knife = sodiumKnife(); group.add(knife);
    const tw = tweezers(); group.add(tw);
    const held = inked(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), pieceMat), { width: 0.5 }); held.position.x = -0.006; tw.add(held);
    const massCard = tag('', 'pill');
    const plate = (text, w, hh) => textPlate(text, { w, h: hh, color: '#23293a', bg: '#fffaf0', font: `bold ${Math.floor(Math.min(0.8 * 512 * hh / w, 0.82 * 512 / text.length))}px "Songti SC", serif` });
    const lab = plate('钠（已吸干煤油）', 0.042, 0.007); lab.rotation.x = -Math.PI / 2; lab.position.set(PAPER.x, 0.0012, PAPER.z + 0.031); group.add(lab);

    const fresh = () => ({ demo: false, near: false, lit: false, lampXZ: [LAMP_IN.x, LAMP_IN.z], lampY: LAMP_IN.y, lampDrag: false, lampMoved: false, lampHand: null, lampGrab: [0, 0], away: false, tc: 22, chosen: 0.04, cut: false, mass: 0, tarnish: 0, inCru: false, held: false, q: 0, tn: 22, melt: 0, burning: 0, left: 0, burned: 0, spat: 0, spilled: 0, lampBurn: 0, clock: 0, meltAt: null, melted: 0, qUp: true, lampOffAt: null, finished: false, said: {},
      tools: { knife: { drag: false, hand: null, grab: [0, 0, 0], turn: 0, side: 0, press: 0 }, tw: { drag: false, hand: null, grab: [0, 0, 0] } } });
    S = fresh();
    const lampD = () => Math.hypot(lamp.position.x - LAMP_IN.x, lamp.position.z - LAMP_IN.z);
    const lampHeat = () => (flameOn ? clamp(1 - lampD() / 0.02, 0, 1) : 0);          // 灯在坩埚正下方才加热；拖开一点点就差很多
    const lampOn = () => lampHeat() > 0.5;

    // ---- 小刀、镊子跟手：器材落在光标射线碰到的第一个面上（桌面、钠条、坩埚口、铁圈……），总在手底下；动作发生在手放到的地方 ----
    const HOME = { knife: KN, tw: TW }, CLR = { knife: KN.y, tw: 0.008 }, GRAB = { knife: V(0, 0, 0), tw: V(-0.03, 0, 0) };          // GRAB：qa 真鼠标按在拾取盒中间时，手和器材原点之差
    const BAR_TOP = 0.003 + A;
    const cutX = () => BAR_LEFT + mmOf(S.chosen);
    const pieceAt = () => V(BAR_LEFT + mmOf(S.mass) / 2 - 0.003, 0.003 + A / 2, PAPER.z);          // 切下的那一块
    const RH = reach(group);
    const solids = () => {
      const cutW = mmOf(S.cut ? S.mass : 0), L = [
        { id: 'cru', c: CRU, r: 0.0165, h: 0.0225 }, { id: 'ring', c: V(CX, RING_Y - 0.004, CZ), r: 0.029, h: 0.0145 },
        { id: 'rod', c: V(ST.x, 0, ST.z + st.rodX), r: 0.0065, h: 0.16 }, { id: 'lamp', c: lamp.position.clone().setY(lamp.position.y > 0.008 ? 0.016 : 0), r: 0.025, h: 0.055 },
        ...[-0.035, 0, 0.035].map((dz) => ({ id: 'base', c: V(ST.x, 0, ST.z + dz), r: 0.036, h: 0.016 })),
      ];
      for (let x = BAR_LEFT + cutW + 0.006; x < BAR_LEFT + BAR_LEN; x += 0.008) L.push({ id: 'bar', c: V(x, 0.003, PAPER.z), r: 0.0045, h: A });          // 钠条（一串小圆柱近似）
      return L;
    };
    const CUPS = [{ c: CRU.clone().setY(BOT.y), r: 0.012, h: CRU.y + 0.0225 - BOT.y }];          // 坩埚里：伸进去先到口上方，拿出来先竖直提出来
    const blocked = (p) => solids().some((s) => p.y < s.c.y + s.h + 0.003 && Math.hypot(clamp(s.c.x, p.x - 0.011, p.x + 0.075) - s.c.x, p.z - s.c.z) < s.r + 0.004);          // 平放的镊子身子会不会碰到东西
    const sideOf = (z) => (z > PAPER.z + 0.004 ? 1 : z < PAPER.z - 0.004 ? -1 : 0);
    function aimTool(key) {
      const t = S.tools[key], q = V(...t.hand).add(V(...t.grab)), r = RH.ray(q);
      if (key === 'knife') {
        const bp = r.o.clone().addScaledVector(r.d, (BAR_TOP - r.o.y) / r.d.y);          // 手在钠条顶面那么高的地方
        if ((!S.cut || t.press > 0) && bp.x > BAR_LEFT - 0.004 && bp.x < BAR_LEFT + BAR_LEN + 0.004 && Math.abs(bp.z - PAPER.z) < 0.025) {
          const x = t.press > 0 ? cutX() : clamp(bp.x, BAR_LEFT + mmOf(0.01), BAR_LEFT + mmOf(0.2)), zc = clamp(bp.z, PAPER.z - 0.008, PAPER.z + 0.008);
          // 刀立起来横过钠条，刀口搁在钠条上；切的那一下压到底
          return { zone: 'bar', T: V(x, BAR_TOP + 0.006 - 0.0065 * (t.press > 0 ? Math.sin(Math.PI * (1 - t.press)) : 0), zc + 0.016), rot: 1, x, side: sideOf(bp.z) };
        }
        const h = RH.hit(r, solids(), { clr: CLR.knife });
        return { zone: '', T: h ? h.p : KN.clone(), rot: 0 };
      }
      const h = RH.hit(r, solids(), { clr: CLR.tw });
      if (!h) return { zone: '', T: TW.clone(), rot: 0 };
      const p = h.p, id = h.s?.id;
      if (id === 'cru' && h.top) return { zone: 'cru', T: S.held ? V(CX + 0.002 + clamp(p.x - CX - 0.002, -0.004, 0.004), BOT.y + 0.014, CZ + clamp(p.z - CZ, -0.004, 0.004)) : p, rot: 1 };          // 夹着钠：伸进坩埚
      if (S.cut && !S.inCru && RH.xz(p, pieceAt()) < (S.held ? 0.024 : 0.012)) return { zone: 'piece', T: pieceAt().add(V(0, 0.006, 0)), rot: 1 };          // 镊尖碰到切下的钠
      return { zone: '', T: p, rot: id === 'ring' || id === 'lamp' || (h.s && !h.top) || blocked(p) ? 1 : 0 };          // 碰着侧面：竖着拿
    }
    const cutNow = () => { if (S.cut) return; events.cut(); S.tools.knife.press = 1; };
    let frame = 0;
    const release = (key) => {
      const t = S.tools[key]; if (!t.hand) { t.drag = false; return; }
          // 同一帧里按下又松开（qa 不用真鼠标时的拖放，人手做不到）：当作镊子已经拿到手指的地方
      if (key === 'tw' && t.f0 === frame) tw.position.copy(aimTool(key).T);
      const a = aimTool(key), z = a.zone, there = tw.position.distanceTo(a.T) < 0.012; t.drag = false; t.hand = null; t.side = 0;          // there：镊尖真的到了（不是手指过去、镊子还在半路）
      if (key === 'knife') { if (z === 'bar') cutNow(); return; }
      if (z === 'piece' && there) events.take();
      else if (z === 'cru' && there) events.put();
    };
    // 放回原处：在坩埚里先竖直提出来；回去的直线会穿过别的器材就先抬过它
    const homeTo = (key, obj, a) => {
      const o = obj.position, k = CUPS.find((c) => RH.inside(o, c));
      if (k) return RH.move(obj, V(o.x, k.c.y + k.h + 0.008, o.z), a, CUPS);
      const H0 = HOME[key], dx = H0.x - o.x, dz = H0.z - o.z, L2 = dx * dx + dz * dz || 1e-9;
      let lift = 0;
      for (const s of solids()) { if (s.id === 'bar' && key === 'knife') continue; const u = clamp(((s.c.x - o.x) * dx + (s.c.z - o.z) * dz) / L2, 0, 1); if (Math.hypot(o.x + dx * u - s.c.x, o.z + dz * u - s.c.z) < s.r + 0.012 && o.y < s.c.y + s.h + 0.01) lift = Math.max(lift, s.c.y + s.h + 0.015 - H0.y); }
      homeLift(obj, H0, a, lift);
    };
    const DOCK = { piece: () => pieceAt().add(V(0, 0.006, 0)), cru: () => V(CX + 0.002, CRU.y + 0.0225 + CLR.tw, CZ) };          // 演示、qa 用：镊尖该到的面上的点
    const events = {
      cut: () => { if (S.cut) return; S.cut = true; S.mass = S.chosen; S.tarnish = 0; done('cut'); sfx.clink({ freq: 1200, gain: 0.02 });
        status(`切下约 ${(S.mass * 1000).toFixed(0)} mg${S.mass > 0.1 ? '——<b>比绿豆大得多</b>，留意后果' : ''}。用<b>镊子</b>夹起来，迅速投进${S.tc > 150 ? '热' : ''}坩埚。`); },
      take: () => { if (!S.cut || S.inCru || S.held) return; S.held = true; status('夹起来了。拖到坩埚上方，松手投进去。'); },
      put: () => { if (!S.held) return; S.held = false; S.inCru = true; S.left = S.mass; S.q = 0; S.tn = 22; done('put'); sfx.clink({ freq: 1500, gain: 0.02 });
        if (!S.demo) { S.near = true; look([CX, BOT.y + 0.004, CZ], [0.15, 1.2, 1], 0.25, () => { S.near = false; }); }
        if (S.tarnish > 0.5) log('tarnish', ['切下的钠在空气里放了一会儿', '切面<b>变暗</b>了', '钠和氧气反应生成了 Na₂O（实验2-1）']);
        status(lampOn() ? '投进去了。<b>继续加热</b>，看钠的变化；熔化后立即把<b>酒精灯</b>拖开。' : '投进去了，可是坩埚下面没有火。点燃<b>酒精灯</b>，放在坩埚下面加热。'); },
    };
    const A_ = {
      // 点一下酒精灯：点燃 / 盖灭（撤灯是把它拖开）
      tapLamp() {
        if (!S.lit) { S.lit = true; done('heat'); sfx.whoosh?.({ freq: 500, gain: 0.06, dur: 0.3 }); status(!S.away ? (S.inCru ? '点燃了酒精灯，加热坩埚。' : '取下灯帽，点燃酒精灯，加热坩埚。<b>同时</b>用小刀切一块绿豆大的钠。') : '点燃了酒精灯。拖回坩埚下面才加热。'); return; }
        S.lit = false;
        if (S.inCru && !S.finished && !S.away) { S.lampOffAt = S.clock; if (S.melt >= 1 || S.burning > 0) done('remove'); }          // 在坩埚下面盖灭：也不再加热了
        status(S.burning > 0 && !S.away ? '盖灭了酒精灯。看：钠<b>还在燃烧</b>。' : '盖上灯帽，酒精灯灭了。');
      },
      reset() { if (bar.playing) bar.stop(); S = fresh(); sync(); mic.close(); back(); W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; W.ui.relock(); } bar.undo('heat', 'cut', 'put', 'remove', 'observe', 'why'); status('器材重新摆好了：先点燃酒精灯，加热坩埚。'); },
    };
    // 酒精灯拖开（撤灯）、拖回来：只在点着的时候才算撤灯
    const lampMoved = (away) => {
      if (!S.lit) return;
      if (!away) { status('酒精灯放回坩埚下面，接着加热。'); return; }
      S.lampOffAt = S.clock;
      if (S.melt >= 1 || S.burning > 0) { done('remove'); status(S.burning > 0 ? '撤掉了酒精灯。看：钠<b>还在燃烧</b>。' : '钠熔化了，撤掉了酒精灯。看它接下来怎样。'); }
      else status(S.inCru ? '钠还没熔化就撤掉了酒精灯：坩埚会慢慢变凉。可以把<b>酒精灯</b>拖回坩埚下面接着加热。' : '撤掉了酒精灯。');
    };
    const sync = () => { smoke.clear(); sparks.clear(); capper.snap(S.lit); flameOn = S.lit; knife.position.copy(KN); knife.quaternion.copy(QK0); tw.position.copy(TW); tw.rotation.set(0, 0, 0); lamp.position.set(S.lampXZ[0], S.lampY, S.lampXZ[1]); };
    sync();
    const GMAX = { knife: 0.04, tw: 0.075 };
    const toolItem = (key, obj, hint) => ({ obj: obj.pick, plane: 'xz', offset: HOME[key].y, hint,          // 拖动平面在器材原处的高度
      // 按住哪里就从哪里拿：镊尖拿起来要离开桌面（CLR），所以抓取偏移按“镊尖正好落在原处上方”来算，按住不动时器材不会自己挪
      onStart: (p) => { if (!p) return; const t = S.tools[key], g = obj.position.clone().sub(p).setY(0); t.drag = true; t.moved = false; t.f0 = frame; t.side = 0; t.hand = p.toArray(); t.grab = (g.length() < GMAX[key] ? RH.aim(V(obj.position.x, CLR[key], obj.position.z), HOME[key].y).sub(p).setY(0) : GRAB[key]).toArray(); },
      onDrag: (p) => { if (p) { S.tools[key].hand = p.toArray(); S.tools[key].moved = true; } },
      onEnd: () => release(key), onTap: () => { const m = hint(); if (m) status(m); } });
    const lampItem = { obj: lampPick, plane: 'xz', offset: 0,
      hint: () => (!S.lit ? '酒精灯：点一下，取下灯帽点燃' : S.away ? '酒精灯：拖回坩埚下面接着加热；点一下盖灭' : '酒精灯：拖开就是撤灯；点一下盖灭'),
      onStart: (p) => { if (!p) return; S.lampDrag = true; S.lampMoved = false; S.lampHand = [p.x, p.z]; S.lampGrab = [lamp.position.x - p.x, lamp.position.z - p.z]; },
      onDrag: (p) => { if (!p) return; S.lampHand = [p.x, p.z]; S.lampMoved = true; },
      onEnd: () => { S.lampDrag = false; S.lampMoved = false; S.lampHand = null; },
      onTap: () => A_.tapLamp() };
    const drag = draggable(group, [
      toolItem('knife', knife, () => (S.cut ? '' : '小刀：拖到钠条上，越往右切下的越多；松手或拖过钠条就切下')),
      toolItem('tw', tw, () => (S.held ? '镊子：拖到坩埚上方，松手投进去' : '镊子：镊尖碰到切下的钠就夹起（不要用手直接接触）')),
      lampItem,
    ], { tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const mic = micro({ tag, look, back, group, scene: sodiumBurnScene(), at: () => V(CX, RING_Y + 0.03, CZ), btnAt: () => V(CX + 0.042, RING_Y + 0.03, CZ), label: '钻进去看',
      state: () => ({ burning: S.burning > 0, melt: S.melt, x: S.burned + S.left > 0 ? S.burned / (S.burned + S.left) : 0 }), key: () => '', show: () => S.inCru, bar: () => bar, scale: 0.0075, lookD: [0.02, 0.62, 1], dist: 0.24 });          // 从斜上方往下看钠的表面：前后两排分得开

    // 条件到了才开始的动作：fn 收到的进度从条件满足那一刻起算，span 是这一镜头的几分之几
    const whenAct = (cond, fn, span) => { let k0 = null; return (k) => { if (k < 0.02) { k0 = null; fn(0); return; } if (k0 == null && cond()) k0 = k; if (k0 != null) fn(Math.min(1, (k - k0) / span)); }; };
    const lampOut = act.path(lampPick, [() => lamp.position.clone().setY(0), LAMP_OUT], { t0: 0.001, t1: 0.7, release: 0.8 });          // 撤灯：拿着酒精灯往自己这边拖开
    const lampTapAct = (when) => { let fired = false; return (k) => { if (k < 0.03) { fired = false; return; } if (!fired && when(k)) { fired = true; drag.items().find((d) => d.obj === lampPick)?.onTap?.(); } }; };
    // 演示：手拿着器材拖过去（学生拖动的同一套处理）；点是器材该到的面上的点
    const toolPath = (obj, pts, o) => act.path(obj.pick, [() => obj.position.clone(), ...pts], o);
    const CUT_DEMO = BAR_LEFT + mmOf(0.04);
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'heat', title: '加热坩埚', todo: '点一下<b>酒精灯</b>：取下灯帽点燃，加热干燥的坩埚。', target: () => lamp },
        { id: 'cut', title: '切绿豆大的钠', todo: '<b>同时</b>把<b>小刀</b>拖到钠条上，切下绿豆大的一块（约 40 mg）。', target: () => knife },
        { id: 'put', title: '迅速投入坩埚', todo: '用<b>镊子</b>夹起切下的钠，<b>迅速</b>投到热坩埚中。', target: () => tw },
        { id: 'remove', title: '熔化后撤灯', todo: '继续加热，看钠<b>熔化</b>；熔化后<b>立即</b>把<b>酒精灯</b>拖开（撤灯）。不要近距离俯视坩埚！', target: () => (S.melt >= 1 ? lamp : null) },
        { id: 'observe', title: '看燃烧', todo: '看坩埚里：火焰什么颜色？烧完留下什么？', target: () => null },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { sync(); mic.close(); },
            view: { save: () => (mic.isOpen ? 'micro' : S.near ? 'near' : null), restore: (v) => { if (v === 'micro') mic.open(); else if (v === 'near' && S.inCru) { S.near = true; look([CX, BOT.y + 0.004, CZ], [0.15, 1.2, 1], 0.25, () => { S.near = false; }); } } } }),          // 演示完回到学生原来看的地方
          shots: [
            { cap: '取下灯帽，点燃酒精灯，加热干燥的坩埚；同时切取一块绿豆大的钠。', dur: 7, speed: 1.5, cam: [[0.0, 0.06, 0.0], [0.05, 0.42, 1], 0.36],
              during: act.seq(lampTapAct((k) => k > 0.06), toolPath(knife, [V(CUT_DEMO, BAR_TOP, PAPER.z + 0.02), V(CUT_DEMO, BAR_TOP, PAPER.z - 0.02)], { t0: 0.25, t1: 0.7, release: 0.8 })) },
            { cap: '用镊子夹取，迅速投到热坩埚中。', dur: 6, cam: [[-0.02, 0.07, 0.0], [0.05, 0.42, 1], 0.34], during: toolPath(tw, [[DOCK.piece, 0.09], DOCK.cru], { t0: 0.03, t1: 0.66, release: 0.8 }) },
            { cap: '继续加热片刻：钠先熔化成闪亮的小球。熔化后立即撤掉酒精灯。', dur: DEMO_T.melt, speed: 0.5, cam: [[CX, 0.075, CZ + 0.03], [0.1, 0.8, 1], 0.32], during: whenAct(() => S.melt >= 0.9, lampOut, 0.9 / DEMO_T.melt) },          // 侧面看：坩埚里的钠和底下的酒精灯都在画面里，看得见灯被拖开
            { cap: '钠与氧气剧烈反应，发出黄色火焰；撤掉酒精灯也照样燃烧。不要近距离俯视坩埚！', dur: DEMO_T.burn, cam: [[CX, 0.115, CZ], [0.06, 0.7, 1], 0.27] },
            { cap: '燃烧后，坩埚里留下淡黄色固体——过氧化钠（烧完了才凑近看）。', dur: 4, cam: [[CX, 0.103, CZ], [0.12, 1.6, 1], 0.2] },
            { cap: '钻进去看（从头慢放）：钠原子把电子交给氧分子，生成 Na⁺ 和过氧根 O₂²⁻——淡黄色的过氧化钠。演示完了，换你自己做。', dur: 13, cam: [[CX, 0.14, CZ], [0.05, 0.3, 1], 0.32], enter: () => mic.open(true), during: act.at(0.98, () => mic.close()) },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    const col = new THREE.Color(), SILVER = new THREE.Color(0xdce2e8), DULL = new THREE.Color(0xaeb1ad), up = V(0, 1, 0);
    const step = (dt, t) => {
      frame++;
      S.clock += dt;
      // 小刀、镊子：拿着就跟手（指数约 25/s），松手很快放回原处；镊尖碰到切下的钠就夹起，按着拖过钠条就切下
      const aF = 1 - Math.exp(-dt * 25), aH = 1 - Math.exp(-dt * 22), aR = 1 - Math.exp(-dt * 18);
      for (const key of ['knife', 'tw']) {
        const T = S.tools[key], obj = key === 'knife' ? knife : tw;
        let rot = 0;
        if (T.drag && T.hand && !T.moved) rot = key === 'knife' ? T.turn : tw.rotation.z / (Math.PI / 2);          // 按住还没动：器材不动
        else if (T.drag && T.hand) {
          const a = aimTool(key); rot = a.rot; RH.move(obj, a.T, aF, CUPS);
          if (key === 'tw' && a.zone === 'piece' && obj.position.distanceTo(a.T) < 0.005) events.take();
          if (key === 'knife') { if (a.zone === 'bar' && !S.cut) { S.chosen = clamp((a.x - BAR_LEFT) / mmOf(1), 0.01, 0.2); if (T.side && a.side && a.side !== T.side) cutNow(); if (a.side) T.side = a.side; } else T.side = 0; }
        } else if (key === 'knife' && T.press > 0 && RH.xz(obj.position, V(cutX(), 0, PAPER.z + 0.016)) < 0.03) {          // 在钠条上松手：就在那里压下去切
          RH.move(obj, V(cutX(), BAR_TOP + 0.006 - 0.0065 * Math.sin(Math.PI * (1 - T.press)), obj.position.z), aF); rot = 1;
        } else homeTo(key, obj, aH);
        if (key === 'knife') { T.press = Math.max(0, T.press - dt / 0.25); T.turn += (rot - T.turn) * aR; }
        else tw.rotation.z += (rot * Math.PI / 2 - tw.rotation.z) * aR;
      }
      knife.quaternion.slerpQuaternions(QK0, QK1, S.tools.knife.turn);
      // 钠条、切下的一块
      const cutW = mmOf(S.cut ? S.mass : 0), restL = BAR_LEN - cutW;
      bar0.scale.set(restL, A, A); bar0.position.set(BAR_LEFT + cutW + restL / 2 + (S.cut ? 0.002 : 0), 0.003 + A / 2, PAPER.z);
      cutMark.visible = !S.cut && S.tools.knife.drag; cutMark.position.set(cutX(), 0.003 + A + 0.0002, PAPER.z);
      if (S.cut && !S.inCru && !S.held) S.tarnish = Math.min(1, S.tarnish + dt / 25);          // 切面在空气里变暗
      pieceMat.color.copy(SILVER).lerp(DULL, S.tarnish);
      piece.visible = S.cut && !S.inCru && !S.held; piece.scale.set(cutW, A, A); piece.position.set(BAR_LEFT + cutW / 2 - 0.003, 0.003 + A / 2, PAPER.z);
      held.visible = S.held; held.scale.set(Math.min(cutW, 0.012), A, A);
      // 酒精灯：按住拖着走（提起一点），松手就放在那里；离坩埚正下方不到 3 cm 松手就放回正下方
      {
        let [x, z] = S.lampXZ;
        if (S.lampDrag && S.lampMoved && S.lampHand) {
          let gx = S.lampHand[0] + S.lampGrab[0], gz = S.lampHand[1] + S.lampGrab[1];
          gx = clamp(gx, CX - 0.065, CX + 0.06); gz = clamp(gz, CZ - 0.012, CZ + 0.09);
          for (const [c, r] of [[V(ST.x, 0, ST.z + st.rodX), 0.034], ...(capper.k > 0.5 ? [[CAP_OFF, 0.032]] : [])]) { const dx = gx - c.x, dz = gz - c.z, d = Math.hypot(dx, dz); if (d < r && d > 1e-6) { gx = c.x + dx / d * r; gz = c.z + dz / d * r; } }          // 不挤进铁杆、灯帽
          x += (gx - x) * aF; z += (gz - z) * aF;
        } else if (Math.hypot(x - LAMP_IN.x, z - LAMP_IN.z) < 0.03) { x += (LAMP_IN.x - x) * aH; z += (LAMP_IN.z - z) * aH; }
        S.lampXZ = [x, z];
        const onBase = [-0.035, 0, 0.035].some((dz) => Math.hypot(x - ST.x, z - ST.z - dz) < 0.036);          // 铁架台底座上（灯原来就垫在底座上）
        S.lampY += ((onBase ? LAMP_IN.y : 0) + (S.lampDrag && S.lampMoved ? 0.008 : 0) - S.lampY) * aF;
        lamp.position.set(x, S.lampY, z);
        const away = Math.hypot(x - LAMP_IN.x, z - LAMP_IN.z) > 0.03;
        if (away !== S.away) { S.away = away; lampMoved(away); }
      }
      flameOn = capper.update(dt, S.lit); lamp.flame.setOn(flameOn); lamp.flame.update(t);
      // 坩埚温度（时间加快）
      { const k = lampHeat(); S.tc += ((22 + (T_LAMP - 22) * k) - S.tc) * Math.min(1, dt / (k > 0.5 ? 14 : 45)); }
      if (S.tc > 200 && !S.said.hot) { S.said.hot = true; if (!S.inCru) status(S.cut ? '坩埚热了。用<b>镊子</b>把切下的钠迅速投进去。' : '坩埚热了。用<b>小刀</b>切一块绿豆大的钠。'); }
      // 坩埚里的钠：吸热 → 熔化 → 着火 → 燃烧
      let rate = 0;
      if (S.inCru && S.left > 0) {
        const m0 = S.mass, G = 0.012 * Math.pow(m0 / 0.04, 2 / 3);
        const sens = m0 * NA.cp * (NA.melt - 22), lat = m0 * NA.fusion;
        const q0 = S.q;
        S.q = Math.max(0, S.q + G * (S.tc - S.tn) * dt);
        S.tn = S.q < sens ? 22 + S.q / (m0 * NA.cp) : S.q < sens + lat ? NA.melt : NA.melt + (S.q - sens - lat) / (m0 * NA.cp);
        S.melt = clamp((S.q - sens) / lat, 0, 1); S.qUp = S.q >= q0; S.melted = Math.max(S.melted, S.melt);          // melt：现在熔了多少（凉下来会凝固）；melted：熔过多少（凝固后形状还是圆的）
        if (S.melt >= 1 && S.meltAt == null) { S.meltAt = S.clock; log('melt', ['继续加热', '钠<b>熔化</b>成闪亮的小球', '钠的熔点低（97.79 ℃）']); status('钠<b>熔化</b>了！立即点一下<b>酒精灯</b>撤掉它。'); }
        if (S.melt >= 1 && S.tn >= IGNITE && !S.burning) { S.burning = 0.01; log('fire', ['（熔化以后）', '钠剧烈燃烧，发出<b>黄色火焰</b>，冒白烟', '钠和氧气剧烈反应，放出大量的热']); }
        if (S.burning > 0) {
          S.burning = Math.min(1, S.burning + dt * 3);
          if (lampOn()) S.lampBurn += dt;          // 着火了还在加热：一两秒来不及撤不算，一直不撤就越来越猛
          // 一直不撤灯（着火后还一直加热）或钠块太大：反应更剧烈，烧得更快，熔化的钠按比例溅出去（溅出去的不在坩埚里生成产物）
          const hotK = lampOn() ? clamp((S.lampBurn - 1.5) / 2, 0, 1) : 0, bigK = clamp((S.mass - 0.08) / 0.12, 0, 1);
          const hot = hotK > 0, boost = (1 + 0.6 * hotK) * (1 + 0.3 * bigK);
          rate = Math.min(S.left, 0.12 * Math.pow(S.left, 2 / 3) * boost * dt);
          S.left -= rate; S.burned += rate;
          const spill = Math.min(S.left, (0.06 * hotK + 0.03 * bigK) * Math.pow(S.left, 2 / 3) * dt); S.left -= spill; S.spilled += spill;          // 溅出去的钠（示意模型）
          S.q += rate * 6000;          // 燃烧放热（大部分散到空气里）：钠保持在高温
          if (spill > 0) { S.spat += dt; for (let i = 0; i < spill * 1e5; i++) sparks.spawn(BOT.clone().add(V((Math.random() - 0.5) * 0.008, 0.008, (Math.random() - 0.5) * 0.008)), V((Math.random() - 0.5) * 0.25, 0.25 + Math.random() * 0.25, (Math.random() - 0.5) * 0.25), 0.6); if (S.spilled > 0.001) log('spat', [hot ? '没有撤掉酒精灯，一直加热' : '钠块太大', '火焰更大，熔化的钠<b>溅了出来</b>（溅出去的钠不在坩埚里生成产物）', '反应过于剧烈：钠熔化后要立即撤灯；钠要取绿豆大']); }
          if (!S.said.self && S.lampOffAt != null && lampHeat() === 0) log('self', ['撤掉酒精灯', '钠<b>照样燃烧</b>', '反应放出的热足以让它烧下去']);
          if (S.left < 0.0004) { S.burned += S.left; S.left = 0; S.burning = 0; S.finished = true; done('observe'); log('done', ['燃烧结束', '坩埚里留下<b>淡黄色固体</b>', '过氧化钠 Na₂O₂']);
            if (!S.demo) { W?.t1.open(); if (W) W.next.hidden = false; status(`烧完了：坩埚里是<b>淡黄色固体</b>${S.spilled > 0.002 ? `（模型估计溅出约 ${Math.round(S.spilled * 1000)} mg 钠，坩埚里的产物少了）` : ''}。可以掀开课本上的结论，也可以先想一想。`); if (!mic.isOpen) { S.near = true; look([CX, BOT.y, CZ], [0.12, 1.6, 1], 0.2, () => { S.near = false; }); } } }
        }
      }
      // 画面：钠球、火焰、烟、产物
      const r = Math.cbrt(Math.max(0, S.left) / 1000 / NA.density * 3 / (4 * Math.PI)) * EX;
      ball.visible = S.inCru && S.left > 0;
      const mk = S.melted;          // 形状按熔过多少：熔圆了的钠凝固以后还是圆的
      ball.position.copy(BOT).setY(BOT.y + r * (0.9 - mk * 0.25)); ball.scale.set(r * (1 + mk * 0.15), r * (1 - mk * 0.2), r); ball.morphTargetInfluences[0] = mk;
      ball.material.color.copy(SILVER).lerp(DULL, S.melt > 0.5 ? 0 : S.tarnish);
      const fs = S.burning > 0 ? (0.6 + 0.4 * Math.cbrt(S.left / S.mass)) * Math.min(1.6, Math.cbrt(S.mass / 0.04)) * (S.lampBurn > 1.5 && lampOn() ? 1.25 : 1) : 0;          // 火焰一直挺大，快烧完才小一些
      fire.setOn(S.burning > 0.02); fire.setSize(Math.min(1.8, fs)); fire.position.copy(BOT).setY(BOT.y + Math.max(0.002, r)); fire.update(t);
      smoke.update(dt, { rate: S.burning > 0.02 ? 22 * S.burning : 0, origin: BOT.clone().setY(BOT.y + 0.03 * Math.max(0.6, fs)), spread: 0.01, up: 0.035, size: 0.012, life: 2.4 });
      sparks.update(dt, 0.9);
      const prod = S.burned / 22.99 / 2 * 77.98;          // 生成的 Na₂O₂（g）
      crust.material.opacity = Math.min(0.95, prod / 0.05); crust.scale.setScalar(0.55 + 0.45 * Math.min(1, prod / 0.06));
      // 不要近距离俯视坩埚
      const cam = window.__lb?.stage?.camera; let danger = false;
      if (cam && S.inCru && !S.finished) {
        const p = group.worldToLocal(cam.position.clone()).sub(BOT); danger = p.length() < 0.2 && p.y / p.length() > 0.8;
        // 俯视着正在烧的钠：熔化的钠溅起来，正好朝镜头（脸）这边飞（示意）
        if (danger && S.burning > 0.3 && Math.random() < dt * 10) { const d = p.clone().normalize(); sparks.spawn(BOT.clone().add(V((Math.random() - 0.5) * 0.006, 0.006, (Math.random() - 0.5) * 0.006)), d.multiplyScalar(0.45 + Math.random() * 0.2).add(V((Math.random() - 0.5) * 0.08, 0, (Math.random() - 0.5) * 0.08)), 0.7); }
      }
      {
        // 照初中的卡片：名字 + 一个现象词，最多一行关键数字（数字大、单位小），说明不写进卡片
        const stamp = !S.inCru ? '' : S.finished ? '<span class="cc-res">淡黄色固体</span>' : S.burning > 0 ? '<span class="cc-res burn">燃烧</span>' : S.melt >= 1 ? '<span class="cc-res">熔成小球</span>' : S.melt > 0 ? `<span class="cc-res">${S.qUp ? '熔化中' : '凝固中'}</span>` : S.melted > 0 ? '<span class="cc-res">凝固了</span>' : '';
        const obs = !S.inCru ? (S.cut ? `<div class="cc-obs"><b>${Math.round(S.mass * 1000)}</b><small> mg 钠，还没投进去</small></div>` : '')
          : S.burned > 0 ? `<div class="cc-obs"><b>${Math.round(prod * 1000)}</b><small> mg Na₂O₂（理论）</small></div>`
            : `<div class="cc-obs"><b>${Math.round(S.tn)}</b><small> ℃（模型）</small></div>`;
        const spill = S.spilled > 0.001 ? `<div class="cc-note">溅出约 ${Math.round(S.spilled * 1000)} mg 钠（模型）</div>` : '';
        card.text(`<div class="cc"><div class="cc-t"><span class="cc-name">坩埚里的钠</span>${stamp}</div>${obs || spill ? `<div class="cc-more">${obs}${spill}</div>` : ''}</div>`)
          .loc(group, CX, RING_Y + 0.02, CZ).show(!bar.playing && !mic.isOpen && (S.lit || S.inCru || S.cut));
      }
      warning.text('注意　不要近距离俯视坩埚！　点这里退远 ⟲').loc(group, CX, RING_Y + 0.07, CZ).show(danger && !bar.playing);
      massCard.text(`切下约 ${(S.chosen * 1000).toFixed(0)} mg${S.chosen <= 0.06 && S.chosen >= 0.025 ? ' · 绿豆大' : S.chosen > 0.1 ? ' · 太大了' : ''}`).loc(group, PAPER.x, 0.035, PAPER.z).show(S.tools.knife.drag && !S.cut && !bar.playing);
      bar.near(S.near); mic.update?.(dt);
    };

    return {
      group: root, pointer, card: false, toggles: ['cards', 'steps'],
      size: { w: 0.27, d: 0.17, h: 0.16 },
      view: { elev: 36, azim: -6, lookY: 0.4, frameMargin: 1.1 },
      mount(ui) {
        // 结论在烧完时就能掀开；想一想是选做的。“撤灯以后还在烧”只在这一轮真的撤了灯、看到钠自己烧下去时才问
        const t2 = think({ q: '撤掉酒精灯以后，钠还在燃烧。这说明什么？', options: ['钠和氧气的反应放出大量的热，自己就能烧下去', '坩埚里还有酒精', '钠和坩埚发生了反应'], wrong: ['坩埚里没有酒精：酒精灯已经撤掉了。', '坩埚是瓷的，不和钠反应。'], ok: '对：钠与氧气剧烈反应，放出大量的热。所以钠熔化后就撤掉酒精灯，也不要近距离俯视坩埚。', status: (m) => W?.status(m) });
        const t1 = think({ q: '钠燃烧后留下的淡黄色固体是什么？', options: ['过氧化钠 Na₂O₂', '氧化钠 Na₂O', '氢氧化钠 NaOH'], wrong: ['氧化钠是白色的：常温下切开的钠表面生成的是它。', '这里没有水，不会生成氢氧化钠。'], ok: '对：2Na + O₂ △══ Na₂O₂（课本第 35 页）。常温下生成 Na₂O，加热时生成 Na₂O₂——条件不同，产物不同。', status: (m) => W?.status(m),
          onOk: () => { done('why'); if (S.said.self) t2.open(); else W?.status('对：2Na + O₂ △══ Na₂O₂。这一轮酒精灯一直没撤，看不出钠离开火还能不能烧下去：全部重来，钠熔化后立即把酒精灯拖开，再看一次。'); } });
        const more = moreBox([['钻进去看', () => (S.inCru ? mic.open() : W?.status('坩埚里还没有钠。先把钠投进坩埚，再钻进去看。'))]], () => A_.reset());
        const note = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'), h('p', { class: 'fineprint', html: '坩埚用酒精灯加热，温度向约 520 ℃ 趋近（<b>时间加快</b>：十几秒热起来，实际要一两分钟；升温快慢是教学设定）。卡片上的温度是模型算的钠的温度，不是测出来的。<br>钠的熔点、密度按课本第 34 页；熔化以后升到 125 ℃ 画成着火——这是动画的触发设定，真实的着火条件随钠块大小、表面暴露多少而变（<a href="https://cameochemicals.noaa.gov/chemical/7794" target="_blank" rel="noreferrer">NOAA 钠的反应性资料</a>）。绿豆大（约 40 mg）烧六七秒（教学设定）；卡片上的 Na₂O₂ 是按 2Na ~ Na₂O₂ 算的理论产量。<br>没撤酒精灯（着火后还一直加热）或钠块太大时，烧得更快、按比例溅出熔化的钠：溅出量是表示风险的示意模型，溅出去的不在坩埚里生成产物。俯视正在烧的钠时，画面里朝镜头飞的火星表示熔化的钠可能溅到脸上（示意）。钠条截面约 3.5 mm 见方；钠按长度放大 2 倍画。' }));
        const base = mountXuean(ui, { controls: [more, note], headers: ['做了什么', '现象', '说明'], intro: '钠已经从煤油里取出，用滤纸吸干了煤油。先点燃酒精灯加热坩埚，同时切一块绿豆大的钠。' });
        ui.data.append(base.next, t1.el, t2.el);
        W = { ...base, ui, t1, t2, status: ui.status }; bar.attach(ui);
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { bar.dispose(); drag.dispose(); mic.dispose?.(); smoke.dispose(); },
      debug: {
        get S() { return S; }, bar, A: A_, cru, fire,
        picks: { knife: knife.pick, tw: tw.pick, lamp: lampPick },
        qa: qaFlow(drag, [
          { name: '点燃酒精灯', tap: lampPick, wait: 2 },
          // 真鼠标：按在拾取盒中间（镊子：手在镊尖右边 3 cm），让器材尖落到钠条上、切下的钠上、坩埚口上
          { name: '切钠', drag: knife.pick, to: () => RH.aim(V(CUT_DEMO, BAR_TOP, PAPER.z), KN.y, GRAB.knife), wait: 3 },
          { name: '夹起', drag: tw.pick, to: () => RH.aim(DOCK.piece(), TW.y, GRAB.tw), wait: 3 },
          { name: '投进坩埚', drag: tw.pick, to: () => RH.aim(DOCK.cru(), TW.y, GRAB.tw), wait: 0.2, scale: 1 },
          // 看着钠：一熔化就把酒精灯拖开（按住灯、拖到自己这边、松手）
          { name: '熔化后立即撤灯', run: () => { const me = S, go = () => { if (S !== me || S.away) return; if (S.melt >= 1) { const d = drag.items().find((x) => x.obj === lampPick), p0 = lamp.position.clone().setY(0); d.onStart(p0); d.onDrag(LAMP_OUT.clone().lerp(p0, 0.5)); requestAnimationFrame(() => { d.onDrag(LAMP_OUT.clone()); setTimeout(() => d.onEnd(true), 400); }); } else requestAnimationFrame(go); }; go(); }, wait: 3, scale: 1 },
          { name: '钻进去看', run: () => mic.open(), wait: 4 },
          { name: '合上', run: () => mic.close(), wait: 1 },
          { name: '等烧完', run: () => {}, wait: 10 },
          { name: '核对', run: () => { if (!(S.finished && S.said.melt && S.said.fire && S.said.self && !S.said.spat && Math.abs(S.mass - 0.04) < 0.003)) throw new Error(JSON.stringify({ fin: S.finished, said: S.said, mass: S.mass, melt: S.melt, tc: S.tc })); }, wait: 1 },
          { name: '想一想 1', run: () => W.t1.el.querySelector('button').click() },
          { name: '想一想 2', run: () => W.t2.el.querySelector('button').click() },
        ]),
      },
    };
  },
};
