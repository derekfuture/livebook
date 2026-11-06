// 高中地理 必修第一册 第三章第三节 海水的运动 · 潮汐（课本第 59–60 页，图 3.22 紫菜养殖、活动“讨论海水运动对人类活动的影响”）。
//
// 一个问题：赶海、游泳、观潮、船进出港，各该挑什么时候？为什么初一、十五前后潮水涨得最高、落得最低？
// 课本的图就是模型：一段海岸——岸上的小港口、停着一条船，潮间带上一排排养紫菜的竹竿网帘；旁边一个小小的“太阳—地球—月亮”盘。
// 学生亲手做的：
//   1. 拨时间（一天）：海水一天里涨两次、落两次；落潮时潮间带露出来，紫菜网帘露出水面晒太阳；涨潮时又被淹没。
//   2. 拖月亮绕地球走（换农历的日子）：新月、满月时月亮和太阳的引潮作用叠在一起，潮差最大；上弦、下弦时互相抵消，潮差小。
//   3. 选一件事（赶海、船进港、观潮），在侧栏的潮位曲线上点一个时刻，看这时候做这件事行不行。
// 教学示意：潮位的数值、引潮力的样子都是示意；时间是地方时。
import * as THREE from 'three';
import { seg, slider, buttons, note } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { airLabel, noteBadge } from './kit/labels.js';
import { h } from '../ui/Panel.js';
import { SYN, level, range, lunarName, phaseName, bulgeRadius, tideTrend, angles, MSL, KY, SHIP_DRAFT, SHIP_BED, HULL_BOTTOM, shore, shipState, intertidal, playHour, setDate, timeText, NET_WIDTH, NET_TILT, netRow, netState, nearLow } from './kit/tide.js';

const XL = -0.16, XR = 0.16, ZD = 0.06;

const ACTS = { gan: { name: '赶海', need: '低潮附近', ok: (v, D, rising, h) => nearLow(D, h), why: '本页以低潮前后半小时为练习窗口，潮间带部分出露；实际赶海须查看当地潮汐及安全条件' }, ship: { name: '大船进港', need: '水够深的时候', ok: (v) => shipState(v).afloat, why: '水深不足时可能搁浅；本页只比较水深与吃水判断浮起，实际通航还须预留富余水深' }, see: { name: '观潮', need: '大潮的涨潮', ok: (v, D, rising) => rising && v > 0 && range(D).r > 3.6, why: '要挑初一、十五前后、正在涨潮的时候（像钱塘江大潮那样壮观，还要靠喇叭口一样外宽内窄的河口）' } };
const ASK = ['先猜一下（可以不猜）：在这个情境里，一个月里潮水涨得最高的是——', ['初一、十五前后', '初八、廿三前后', '每天都一样']];

export default {
  id: 'tide',
  fig: '图3.22',
  title: '潮汐',
  flow: 'explore',
  ask: '赶海、游泳、观潮、船舶进出港，各该挑什么时候？为什么农历初一、十五前后，潮水涨得最高、落得最低？',
  need: '拨时间看一天里的两次涨落；拖月亮到新月、上弦、满月比一比潮差；选一件事，在潮位曲线上挑个合适的时刻',
  conclusion: {
    page: 63,
    quote: '潮汐是海水的一种周期性涨落现象，它的成因与月球和太阳对地球的引力有关。一天中，通常可以观察到两次海水涨落。古人将白天的海水涨落称为潮，夜晚的海水涨落称为汐，合称潮汐。农历每月的初一和十五前后，潮汐现象最为明显，潮水涨得最高，落得最低。沿海各地，每日潮涨潮落的时间准确、可查。人们在海边的许多活动，如潮间带采集和养殖、沿海港口建设和航运、潮汐发电等，都需要充分认识并利用潮汐规律。',
    why: '月球分潮使朝月和背月两侧的海水隆起，太阳分潮叠加后会改变合成隆起的大小与方向；月球也在公转，一个地方追上月球约需24小时50分，理想半日潮的月球分潮周期约12小时25分，所以一天通常两次涨落。本页是理想化半日潮模型；真实港口还受海盆、海岸和水深影响。初一（新月）、十五（满月）时，太阳、地球、月亮差不多在一条直线上，两份引潮作用叠在一起，潮水涨得最高、落得最低；上弦、下弦时两者错开，互相抵消一部分，潮差就小。',
    src: '课本第 59–60 页 · 第三章 第三节 海水的运动（教材摘录，省略图号及脚注标记）',
  },

  create({ tag }) {
    const group = new THREE.Group();
    const S = { D: 0, h: 6, play: false, drag: null, act: null, pick: null, seen: new Set(), did: {}, guess: null };
    let W = null;
    const block = new THREE.Group(); block.position.x = 0.075; group.add(block);
    const grain = canvasTex(256, 256, (g, w) => { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, w); for (let i = 0; i < 2200; i++) { const v = 150 + Math.random() * 90; g.fillStyle = `rgba(${v},${v},${v},${0.2 + Math.random() * 0.3})`; g.fillRect(Math.random() * w, Math.random() * w, 1.6, 1.6); } }); grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(4, 2);

    // ---- 海岸：左边是陆地，往右是一段缓缓的潮间带滩涂，再往右是海底 ----

    const NX = 120, geo = new THREE.PlaneGeometry(XR - XL, ZD * 2, NX, 1); geo.rotateX(-Math.PI / 2);
    const col = new Float32Array(geo.attributes.position.count * 3); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    { const p = geo.attributes.position, c = new THREE.Color(); for (let k = 0; k < p.count; k++) { const x = p.getX(k); p.setY(k, shore(x)); c.set(x < intertidal.hi ? 0x9cbf6e : x < intertidal.lo ? 0x9d8e70 : 0xb9a57a); col.set([c.r, c.g, c.b], k * 3); } geo.computeVertexNormals(); }          // 岸上是草地，潮间带是灰褐的泥滩
    const land = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, map: grain })); block.add(land);
    const sideCv = document.createElement('canvas'); sideCv.width = 512; sideCv.height = 128;
    { const g = sideCv.getContext('2d'); for (let i = 0; i < 512; i++) { const x = XL + (XR - XL) * (i / 511), ty = (1 - shore(x) / 0.07) * 128; g.fillStyle = '#9a7650'; g.fillRect(i, ty, 1, 6); g.fillStyle = '#c4a272'; g.fillRect(i, ty + 6, 1, 128); } }
    const sideTex = new THREE.CanvasTexture(sideCv); sideTex.colorSpace = THREE.SRGBColorSpace;
    const sideM = new THREE.Mesh(new THREE.PlaneGeometry(XR - XL, 0.07), new THREE.MeshBasicMaterial({ map: sideTex, transparent: true, alphaTest: 0.1 })); sideM.position.set(0, 0.035, ZD); block.add(sideM);
    const water = new THREE.Mesh(new THREE.BoxGeometry(XR - XL, 1, ZD * 2 - 0.0006), new THREE.MeshLambertMaterial({ color: 0x4f8fc4, transparent: true, opacity: 0.72, depthWrite: false })); water.renderOrder = 4; block.add(water);
    const lineM = new THREE.LineDashedMaterial({ color: 0x2a3140, dashSize: 0.003, gapSize: 0.002, transparent: true, opacity: 0.55 });

    // ---- 潮间带上的紫菜网帘：一排排竹竿挂着网 ----
    const bamboo = new THREE.MeshLambertMaterial({ color: 0xc8a96a }), WET = new THREE.Color(0x26351f), DRY = new THREE.Color(0x7d8a52);          // 浸在水里的网帘颜色深，露出水面晒着的变浅
    const netTex = canvasTex(64, 64, (g, w) => { g.strokeStyle = '#ffffff'; g.lineWidth = 3; for (let k = 0; k <= w; k += 8) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, w); g.moveTo(0, k); g.lineTo(w, k); g.stroke(); } }, { repeat: [2, 3] });          // 网眼；网帘平着张在竹竿之间，顺着滩涂的坡
    const netMs = [0, 1, 2, 3].map(() => new THREE.MeshLambertMaterial({ color: WET.clone(), map: netTex, alphaMap: netTex, transparent: true, side: THREE.DoubleSide, depthWrite: false })), nets = [];
    for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) { const { x, y } = netRow(r), z = -ZD + 0.012 + k * 0.02, y0 = shore(x); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.0005, 0.0005, 0.016, 5), bamboo); pole.position.set(x, y0 + 0.008, z); block.add(pole); if (k < 5) { const net = new THREE.Mesh(new THREE.PlaneGeometry(NET_WIDTH, 0.019), netMs[r]); net.position.set(x, y, z + 0.01); net.rotation.set(-Math.PI / 2, 0, -NET_TILT, 'ZYX'); net.userData.row = r; block.add(net); nets.push(net); } }
    // ---- 港口：码头和一条船 ----
    const pier = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.004, 0.014), new THREE.MeshLambertMaterial({ color: 0x8a8f96 })); pier.position.set(0.11, 0.05, -0.03); block.add(pier);
    const pierLegs = []; for (const x of [0.085, 0.105, 0.125]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.05, 0.002), pier.material); l.position.set(x, 0.025, -0.03); block.add(l); pierLegs.push(l); }
    // 码头边立着一根潮位尺（水尺）：一米一格红白相间，海水淹到哪就是现在的潮位；旁边写着读数和涨、落
    const STAFF_X = 0.14, STAFF_Z = 0.035, STAFF_LO = MSL - 3 * KY, STAFF_HI = MSL + 3 * KY;
    const staffTex = canvasTex(32, 384, (g, w) => { for (let m = 0; m < 6; m++) { g.fillStyle = m % 2 ? '#f4f1ea' : '#c8382a'; g.fillRect(0, m * 64, w, 64); } g.fillStyle = '#20242c'; for (let k = 0; k <= 60; k++) g.fillRect(k % 5 ? w * 0.6 : w * 0.25, k * 6.4 - 0.5, w, k % 5 ? 1 : 2); });
    const staff = new THREE.Mesh(new THREE.BoxGeometry(0.005, STAFF_HI - STAFF_LO, 0.0012), [0, 0, 0, 0, 1, 0].map((i) => new THREE.MeshLambertMaterial(i ? { map: staffTex } : { color: 0xe8e4da }))); staff.position.set(STAFF_X, (STAFF_LO + STAFF_HI) / 2, STAFF_Z); block.add(staff);
    const staffPost = new THREE.Mesh(new THREE.BoxGeometry(0.0016, STAFF_LO - shore(STAFF_X), 0.0016), new THREE.MeshLambertMaterial({ color: 0x6b6f76 })); staffPost.position.set(STAFF_X, (STAFF_LO + shore(STAFF_X)) / 2, STAFF_Z - 0.001); block.add(staffPost);
    const aLevel = airLabel(block, '', { h: 0.011, color: '#1d3f70', icon: 'flow' }), aGround = airLabel(block, '搁浅', { h: 0.013, color: '#b03a2a', dim: 0 }), aHover = airLabel(block, '', { h: 0.011, color: '#3a3226', dim: 0 });
    const ship = new THREE.Group(); block.add(ship);
    { const hull = new THREE.Mesh(new THREE.BoxGeometry(0.034, SHIP_DRAFT + 0.005, 0.012), new THREE.MeshLambertMaterial({ color: 0xb8442e })); hull.position.y = HULL_BOTTOM + (SHIP_DRAFT + 0.005) / 2; ship.add(hull); const cab = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.007, 0.009), new THREE.MeshLambertMaterial({ color: 0xf2efe6 })); cab.position.set(-0.008, HULL_BOTTOM + SHIP_DRAFT + 0.0085, 0); ship.add(cab); }
    const tHint = tag('<span>拨时间、拖月亮</span><small>看潮水一天里怎么涨落</small>', 'hint');          // 开场的提示：不用白底牌子
    noteBadge(tag, '教学示意：潮位竖直方向夸大了，数值是示意').loc(block, XL + 0.012, -0.004, ZD + 0.01);
    const people = new THREE.Group(); block.add(people);
    for (let k = 0; k < 5; k++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0014, 0.006, 6), new THREE.MeshLambertMaterial({ color: [0xd8553a, 0x3a6fb0, 0xe0b040][k % 3] })); const x = 0.02 + k * 0.012, z = 0.02 - (k % 2) * 0.02; p.position.set(x, shore(x) + 0.003, z); people.add(p); }          // 赶海的人

    // ---- 太阳—地球—月亮小盘（在海岸左边的书页上）：拖月亮绕地球走 ----
    const orr = new THREE.Group(); orr.position.set(-0.2, 0.004, 0.03); orr.scale.setScalar(1.75); group.add(orr);          // 小盘放在海岸左前方的书页上，放大到和海岸差不多分量：月亮好按、好拖
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.05, 64), new THREE.MeshBasicMaterial({ color: 0x1f2735 })); disc.rotation.x = -Math.PI / 2; orr.add(disc);
    const earth = new THREE.Mesh(new THREE.SphereGeometry(0.009, 24, 16), new THREE.MeshLambertMaterial({ color: 0x4f8fc4, emissive: 0x10243a })); earth.position.y = 0.01; orr.add(earth);
    const bulge = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 24), new THREE.MeshBasicMaterial({ color: 0x8fc6ea, transparent: true, opacity: 0.55, depthWrite: false })); bulge.position.y = 0.01; orr.add(bulge);          // 鼓起来的海水（夸大）
    const bulgeBase = bulge.geometry.attributes.position.array.slice();
    const moon = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 20, 14), new THREE.MeshLambertMaterial({ color: 0xd8d4c8, emissive: 0x333333 })); orr.add(moon);
    const moonPick = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); moonPick.userData.pick = true; moon.add(moonPick);
    const sunDir = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.014, 12), new THREE.MeshBasicMaterial({ color: 0xffc04a })); sunDir.rotation.z = -Math.PI / 2; sunDir.position.set(-0.044, 0.006, 0); orr.add(sunDir);          // 尖朝地球：太阳光从左边照过来
    const port = new THREE.Mesh(new THREE.SphereGeometry(0.0018, 8, 6), new THREE.MeshBasicMaterial({ color: 0xd8392b })); orr.add(port);
    const moonOrbit = new THREE.Mesh(new THREE.RingGeometry(0.034, 0.0352, 72), new THREE.MeshBasicMaterial({ color: 0x9aa4b4, side: THREE.DoubleSide })); moonOrbit.rotation.x = -Math.PI / 2; moonOrbit.position.y = 0.0005; orr.add(moonOrbit);
    const aSun = airLabel(orr, '太阳光 →', { x: -0.06, y: 0.012, z: 0.028, h: 0.0065, color: '#9a6410', icon: 'sun' }), aMoon = airLabel(orr, '', { h: 0.0065, color: '#2b3346', icon: 'moon' });
    const labels = [aLevel, aGround, aHover, aSun, aMoon];
    const placeOrr = () => {
      const { moon: a, port: rot } = angles(S.D, S.h);          // 新月：月亮在地球和太阳中间（太阳在左边）
      moon.position.set(Math.cos(a) * 0.035, 0.01, -Math.sin(a) * 0.035);
      const p = bulge.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = bulgeBase[i * 3], y = bulgeBase[i * 3 + 1], z = bulgeBase[i * 3 + 2], r = bulgeRadius(S.D, S.h, Math.atan2(-z, x)); p.setXYZ(i, x * r, y * 0.0095, z * r); }
      p.needsUpdate = true; bulge.geometry.computeBoundingSphere();          // 各方位按日月合成式变形，不把长轴固定朝月
      // 地球自转：0 点时港口在背着太阳的那一边（夜里，太阳在左边）
      port.position.set(Math.cos(rot) * 0.0105, 0.01, -Math.sin(rot) * 0.0105);
      aMoon.setText(`${phaseName(S.D + S.h / 24)} · ${lunarName(S.D)}`); aMoon.position.set(moon.position.x, 0.026, moon.position.z);          // 港口就是地球上的红点，不挂牌子
    };

    const layout = () => {
      const v = level(S.D, S.h), y = MSL + v * KY;
      let x0 = XL; for (let x = XL; x < XR; x += 0.001) if (shore(x) < y) { x0 = x; break; }          // 海水只从水边往海里画，不罩在岸上
      water.scale.set((XR - x0) / (XR - XL), Math.max(0.001, y), 1); water.position.set((x0 + XR) / 2, y / 2, 0);
      const bed = SHIP_BED, { afloat, y: shipY } = shipState(v);          // 港口航道（码头边）的水深：太浅船就搁浅
      ship.position.set(0.11, shipY, 0.0); ship.rotation.z = 0;          // 搁浅时船底就落在海底上
      aGround.position.set(0.1, bed + 0.024, 0); aGround.setOn(!afloat);          // 船浮着就不写字；搁浅了才写
      const trend = tideTrend(S.D, S.h); aLevel.setText(`${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)} 米 ${trend.label}`); aLevel.position.set(STAFF_X - 0.005 - aLevel.scale.x / 2, y + 0.003, STAFF_Z + 0.004);          // 读数跟着水面，挂在潮位尺旁边
      people.children.forEach((pp) => (pp.visible = shore(pp.position.x) > y + 0.001)); people.visible = true;          // 赶海的人只站在露出水面的滩涂上
      S.netStates = [0, 1, 2, 3].map((r) => netState(r, y));          // 按网面最低与最高边缘区分全干、部分浸水、全湿
      tHint.loc(block, -0.03, 0.11, 0).show(!S.seen.size);
      placeOrr(); drawChart();
    };

    // ---- 侧栏：这一天的潮位曲线（点曲线就是挑时刻）；看过的另一天画成虚线比 ----
    const drawChart = () => {
      if (!W) return;
      const c = W.chart, g = c.getContext('2d'), w = c.width, hh = c.height, L = 30, R = w - 8, T = 20, B = hh - 22, PX = (t) => L + (t / 24) * (R - L), PY = (v) => (T + B) / 2 - (v / 2.6) * ((B - T) / 2);
      g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, hh); g.font = '600 12px "PingFang SC", sans-serif'; g.fillStyle = '#3a3226'; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText(`农历${lunarName(S.D)}的潮位（米，示意）`, 6, 9);
      g.strokeStyle = 'rgba(60,50,40,0.15)'; for (const v of [-2, 0, 2]) { g.beginPath(); g.moveTo(L, PY(v)); g.lineTo(R, PY(v)); g.stroke(); g.fillText(v > 0 ? `+${v}` : v, 4, PY(v)); }
      g.textAlign = 'center'; for (const t of [0, 6, 12, 18, 24]) g.fillText(`${t}时`, PX(t), hh - 9);
      const curve = (D, dash, cl, wd) => { g.save(); g.setLineDash(dash); g.strokeStyle = cl; g.lineWidth = wd; g.beginPath(); for (let t = 0; t <= 24; t += 0.1) { const x = PX(t), y = PY(level(D, t)); if (t) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); g.restore(); };
      if (S.cmp != null && Math.abs(S.cmp - S.D) > 3) curve(S.cmp, [4, 3], 'rgba(60,90,140,0.45)', 1.5);
      curve(S.D, [], '#2f62b0', 2.2);
      if (S.act) { const A = ACTS[S.act]; g.fillStyle = 'rgba(80,160,90,0.15)'; for (let t = 0; t < 24; t += 0.1) if (A.ok(level(S.D, t), S.D, tideTrend(S.D, t).rising, t)) g.fillRect(PX(t), T, PX(0.1) - PX(0) + 0.5, B - T); }          // 挑过一件事以后，合适的时段淡淡涂绿
      const v = level(S.D, S.h); g.fillStyle = '#c4462e'; g.beginPath(); g.arc(PX(S.h), PY(v), 4, 0, 7); g.fill();
      const rg = range(S.D);
      W.read.innerHTML = `现在 <b>${timeText(S.h)}</b>　这一天的潮差 <b>${rg.r.toFixed(1)} 米</b>${S.pick ? `<br>${ACTS[S.pick.k].name}挑在 ${timeText(S.pick.h)}：<b>${S.pick.ok ? '合适' : '不合适'}</b>（${ACTS[S.pick.k].why}）` : ''}<br><small>潮位是示意；实际各地每天的潮时、潮高可以查潮汐表</small>`;
    };
    const drawLog = () => {
      if (!W) return;
      const rows = [], r = (b, t) => rows.push(h('div', { class: 'tl-row' }, h('b', {}, b), h('span', {}, t)));
      if (S.seen.has('day')) r('一天里：', '海水通常涨两次、落两次');
      for (const [k, n] of [['spring', '新月、满月（初一、十五前后）'], ['neap', '上弦、下弦']]) if (S.did[k]) r(`${n}：`, `潮差约 ${S.did[k].toFixed(1)} 米`);
      for (const k in ACTS) if (S.did[k] != null) r(`曾尝试${ACTS[k].name}：`, `${lunarName(S.did[k].D)} ${timeText(S.did[k].h)}：${S.did[k].ok ? '挑在' : '没挑在'}${ACTS[k].need}，${S.did[k].ok ? '合适' : '不合适'}`);
      if (S.guess != null && S.did.spring && S.did.neap) rows.push(h('div', { class: 'tl-row' }, h('small', {}, `你猜：${ASK[1][S.guess]}　实际：初一、十五前后`)));
      W.log.replaceChildren(...rows);
      if (S.seen.has('day') && S.did.spring && S.did.neap && Object.keys(ACTS).some((k) => S.did[k]?.ok)) W.ui.unlock();
    };
    const noteState = () => {
      const f = ((S.D % SYN) + SYN) % SYN / SYN;
      if (f < 0.04 || f > 0.96 || Math.abs(f - 0.5) < 0.04) { if (!S.did.spring) { S.did.spring = range(S.D).r; S.cmp = S.cmp ?? S.D; drawLog(); } }
      if (Math.abs(f - 0.25) < 0.04 || Math.abs(f - 0.75) < 0.04) { if (!S.did.neap) { S.did.neap = range(S.D).r; S.cmp = S.cmp ?? S.D; drawLog(); } }
    };

    // ---- 鼠标移上去才浮出名字（平时不写，免得满屏都是字） ----
    const hover = (rc) => {
      const ht = rc.intersectObjects([...nets, staff, pier, ...ship.children, land], false)[0], o = ht?.object;
      if (!o) { aHover.userData.want = 0; return; }
      const l = block.worldToLocal(ht.point.clone()), nm = o.userData.row != null ? `紫菜网帘：${S.netStates[o.userData.row]}` : o === staff ? '潮位尺' : o === pier ? '码头' : o.parent === ship ? '船' : l.x < intertidal.hi ? '岸上' : l.x < intertidal.lo ? '潮间带（滩涂）' : '海底';
      aHover.setText(nm); aHover.position.set(l.x, Math.max(l.y, MSL) + 0.014, l.z); aHover.userData.want = 1;
    };
    // ---- 指针：拖月亮；在曲线上挑时刻（在侧栏里，见 mount） ----
    const plane = new THREE.Plane(), hit = new THREE.Vector3();
    const pointer = {
      down(rc) { if (!rc.intersectObject(moonPick, false).length) return false; S.drag = true; document.getElementById('c').style.cursor = 'grabbing'; return true; },
      move(rc) {
        const c = document.getElementById('c');
        if (!S.drag) { if (c) c.style.cursor = rc.intersectObject(moonPick, false).length ? 'grab' : ''; hover(rc); return false; }
        orr.updateMatrixWorld(); plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), orr.localToWorld(new THREE.Vector3(0, 0.01, 0))); if (!rc.ray.intersectPlane(plane, hit)) return true;
        const l = orr.worldToLocal(hit.clone()), a = Math.atan2(-l.z, l.x), nextD = (((a - Math.PI) / (2 * Math.PI) * SYN - S.h / 24) % SYN + SYN) % SYN; setDate(S, nextD);
        S.seen.add('moon'); noteState(); W?.day.set(Math.round(S.D)); layout(); return true;
      },
      up() { if (!S.drag) return false; S.drag = false; document.getElementById('c').style.cursor = ''; return true; },
    };

    layout();

    return {
      group,
      card: false,
      emerge: 'flat',          // 课本的图平放在书页上，模型从它上面长出来、它慢慢淡掉
      size: { w: 0.5, d: 0.18, h: 0.09 },
      view: { elev: 22, azim: 12, lookY: 0.4, frameMargin: 1.08 },
      pointer,
      mount(ui) {
        const time = slider('一天里的时刻（地方时）', { min: 0, max: 24, step: 1 / 60, value: S.h, fmt: timeText, onInput: (v) => { S.h = v; S.play = false; acts.btns[0].textContent = '让一天走'; S.seen.add('day'); layout(); drawLog(); } });
        const day = slider('农历的日子（拖月亮吸附整日）', { min: 0, max: 29, step: 1, value: 0, fmt: (v) => lunarName(v), onInput: (v) => { setDate(S, v); noteState(); layout(); } });          // 换了日子：之前挑的时刻作废
        const actSeg = seg('选一件事，再在曲线上点一个时刻', Object.keys(ACTS).map((k) => ACTS[k].name), (_, i) => { S.act = Object.keys(ACTS)[i]; S.pick = null; layout(); ui.status(`${ACTS[S.act].name}：在上面的潮位曲线上<b>点一个时刻</b>，看看这时候行不行。`); }, { value: -1 });
        const guess = seg(...ASK, (_, i) => { S.guess = i; drawLog(); }, { value: -1 });
        const acts = buttons([
          { text: '让一天走', onClick: () => { if (S.h >= 24) S.h = 0; S.play = !S.play; acts.btns[0].textContent = S.play ? '停一下' : '让一天走'; } },
          { text: '重来', ghost: true, onClick: () => { ui.relock?.(); Object.assign(S, { D: 0, h: 6, play: false, act: null, pick: null, seen: new Set(), did: {}, guess: null, cmp: null }); time.set(6); day.set(0); actSeg.set(-1); guess.set(-1); acts.btns[0].textContent = '让一天走'; layout(); drawLog(); } },
        ]);
        const chart = h('canvas', { class: 'wx-map', width: 320, height: 140, style: 'cursor: pointer' }), read = h('div', { class: 'read-out' }), log = h('div', { class: 'timeline' });
        chart.onclick = (e) => { const r = chart.getBoundingClientRect(), t = (((e.clientX - r.left) / r.width) * 320 - 30) / (320 - 38) * 24; if (t < 0 || t > 24) return; S.h = t; time.set(t); S.seen.add('day'); S.play = false; acts.btns[0].textContent = '让一天走';          // 挑时刻时先停下
          if (S.act) { const ok = ACTS[S.act].ok(level(S.D, t), S.D, tideTrend(S.D, t).rising, t); S.pick = { k: S.act, h: t, ok }; S.did[S.act] = { D: S.D, h: t, ok }; } layout(); drawLog(); };          // 点曲线：挑一个时刻
        ui.controls.append(h('div', { class: 'bar-title' }, '港口的潮位（点曲线可以挑时刻）'), chart, read, time.el, acts.el, day.el, actSeg.el, guess.el, note('海岸左边的小盘：太阳光从左边来，中间是地球（红点是港口），可以拖月亮。浅蓝水面按日月分潮合成，径向变形夸大。'));
        ui.data.append(h('div', { class: 'bar-title' }, '你看到了什么'), log);
        W = { ui, chart, read, log, day, time, acts };
        ui.status('这是一段海岸：岸上有港口，滩涂上养着紫菜。先<b>拨时间</b>（或让一天走），看海水一天里怎么涨落。');
        layout(); drawLog();
      },
      update(dt) {
        netMs.forEach((m, r) => m.color.lerp(S.netStates[r] === '全部出露' ? DRY : S.netStates[r] === '全部浸水' ? WET : WET.clone().lerp(DRY, 0.5), Math.min(1, dt * 1.5))); labels.forEach((l) => l.tick(dt));          // 网帘露出来慢慢晒干、变浅
        if (S.play) { S.h = playHour(S.h, dt); if (S.h >= 24) { S.play = false; if (W) W.acts.btns[0].textContent = '重新播放当天'; } if (!S.seen.has('day')) { S.seen.add('day'); drawLog(); } W?.time.set(S.h); layout(); }
      },
    };
  },
};
