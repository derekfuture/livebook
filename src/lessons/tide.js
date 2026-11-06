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
import { h } from '../ui/Panel.js';
import { SYN, level, range, lunarName, phaseName } from './kit/tide.js';

const XL = -0.16, XR = 0.16, ZD = 0.06, MSL = 0.03, KY = 0.004, SHIP_BED = 0.01 - (0.11 - 0.08) * 0.08, SHIP_DRAFT = 0.015;          // 码头边的海底高度、大船要的水深          // 平均海面高度；1 米水位在画面上是 4 毫米（示意，竖直方向夸大）
const ACTS = { gan: { name: '赶海', need: '低潮', ok: (v) => v < -1.4, why: '要等潮水退下去，潮间带露出来' }, ship: { name: '大船进港', need: '水够深的时候', ok: (v) => MSL + v * KY - SHIP_BED > SHIP_DRAFT, why: '港口航道要水深，低潮时大船会搁浅' }, see: { name: '观潮', need: '大潮的涨潮', ok: (v, D, rising) => rising && v > 0 && range(D).r > 3.6, why: '要挑初一、十五前后、正在涨潮的时候（像钱塘江大潮那样壮观，还要靠喇叭口一样外宽内窄的河口）' } };
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
    why: '月球和太阳的引潮作用，让地球朝着月亮和背着月亮的两边海水鼓起来；地球一天自转一圈，一个地方每天就经过两次“鼓起来”的地方，所以一天涨落两次。初一（新月）、十五（满月）时，太阳、地球、月亮差不多在一条直线上，两份引潮作用叠在一起，潮水涨得最高、落得最低；上弦、下弦时两者错开，互相抵消一部分，潮差就小。',
    src: '课本第 59–60 页 · 第三章 第三节 海水的运动',
  },

  create({ tag }) {
    const group = new THREE.Group();
    const S = { D: 0, h: 6, play: false, drag: null, act: null, pick: null, seen: new Set(), did: {}, guess: null };
    let W = null;
    const block = new THREE.Group(); block.position.x = 0.075; group.add(block);
    const grain = canvasTex(256, 256, (g, w) => { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, w); for (let i = 0; i < 2200; i++) { const v = 150 + Math.random() * 90; g.fillStyle = `rgba(${v},${v},${v},${0.2 + Math.random() * 0.3})`; g.fillRect(Math.random() * w, Math.random() * w, 1.6, 1.6); } }); grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(4, 2);

    // ---- 海岸：左边是陆地，往右是一段缓缓的潮间带滩涂，再往右是海底 ----
    const shore = (x) => (x < -0.06 ? 0.05 : x < 0.08 ? 0.05 - ((x + 0.06) / 0.14) * 0.04 : 0.01 - (x - 0.08) * 0.08);          // 高潮线大约在 x = -0.06，低潮线大约在 x = 0.08
    const NX = 120, geo = new THREE.PlaneGeometry(XR - XL, ZD * 2, NX, 1); geo.rotateX(-Math.PI / 2);
    const col = new Float32Array(geo.attributes.position.count * 3); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    { const p = geo.attributes.position, c = new THREE.Color(); for (let k = 0; k < p.count; k++) { const x = p.getX(k); p.setY(k, shore(x)); c.set(x < -0.065 ? 0x9cbf6e : x < 0.085 ? 0x9d8e70 : 0xb9a57a); col.set([c.r, c.g, c.b], k * 3); } geo.computeVertexNormals(); }          // 岸上是草地，潮间带是灰褐的泥滩
    const land = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, map: grain })); block.add(land);
    const sideCv = document.createElement('canvas'); sideCv.width = 512; sideCv.height = 128;
    { const g = sideCv.getContext('2d'); for (let i = 0; i < 512; i++) { const x = XL + (XR - XL) * (i / 511), ty = (1 - shore(x) / 0.07) * 128; g.fillStyle = '#9a7650'; g.fillRect(i, ty, 1, 6); g.fillStyle = '#c4a272'; g.fillRect(i, ty + 6, 1, 128); } }
    const sideTex = new THREE.CanvasTexture(sideCv); sideTex.colorSpace = THREE.SRGBColorSpace;
    const sideM = new THREE.Mesh(new THREE.PlaneGeometry(XR - XL, 0.07), new THREE.MeshBasicMaterial({ map: sideTex, transparent: true, alphaTest: 0.1 })); sideM.position.set(0, 0.035, ZD); block.add(sideM);
    const water = new THREE.Mesh(new THREE.BoxGeometry(XR - XL, 1, ZD * 2), new THREE.MeshLambertMaterial({ color: 0x4f8fc4, transparent: true, opacity: 0.72, depthWrite: false })); water.renderOrder = 4; block.add(water);
    const lineM = new THREE.LineDashedMaterial({ color: 0x2a3140, dashSize: 0.003, gapSize: 0.002, transparent: true, opacity: 0.55 });
    const mark = (y, t) => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(XL, y, ZD + 0.001), new THREE.Vector3(XR, y, ZD + 0.001)]), lineM); l.computeLineDistances(); block.add(l); const tg = tag(t, 'pill'); tg.loc(block, XL + 0.02, y, ZD + 0.002); return tg; };

    // ---- 潮间带上的紫菜网帘：一排排竹竿挂着网 ----
    const bamboo = new THREE.MeshLambertMaterial({ color: 0xc8a96a }), netM = new THREE.MeshLambertMaterial({ color: 0x3a4a32, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
    for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) { const x = -0.02 + r * 0.022, z = -ZD + 0.012 + k * 0.02, y0 = shore(x); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.0005, 0.0005, 0.016, 5), bamboo); pole.position.set(x, y0 + 0.008, z); block.add(pole); if (k < 5) { const net = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.003), netM); net.position.set(x, y0 + 0.008, z + 0.01); net.rotation.y = Math.PI / 2; block.add(net); } }
    const tNori = tag('紫菜网帘', 'pill');
    // ---- 港口：码头和一条船 ----
    const pier = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.004, 0.014), new THREE.MeshLambertMaterial({ color: 0x8a8f96 })); pier.position.set(0.11, 0.05, -0.03); block.add(pier);
    const pierLegs = []; for (const x of [0.085, 0.105, 0.125]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.05, 0.002), pier.material); l.position.set(x, 0.025, -0.03); block.add(l); pierLegs.push(l); }
    const ship = new THREE.Group(); block.add(ship);
    { const hull = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.007, 0.012), new THREE.MeshLambertMaterial({ color: 0xb8442e })); hull.position.y = 0.0015; ship.add(hull); const cab = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.007, 0.009), new THREE.MeshLambertMaterial({ color: 0xf2efe6 })); cab.position.set(-0.008, 0.008, 0); ship.add(cab); }
    const tShip = tag('', 'pill'), tHint = tag('', 'pill'), tScale = tag('教学示意 · 潮位竖直方向夸大了 · 数值是示意', 'pill');
    const people = new THREE.Group(); block.add(people);
    for (let k = 0; k < 5; k++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0014, 0.006, 6), new THREE.MeshLambertMaterial({ color: [0xd8553a, 0x3a6fb0, 0xe0b040][k % 3] })); const x = 0.02 + k * 0.012, z = 0.02 - (k % 2) * 0.02; p.position.set(x, shore(x) + 0.003, z); people.add(p); }          // 赶海的人

    // ---- 太阳—地球—月亮小盘（在海岸左边的书页上）：拖月亮绕地球走 ----
    const orr = new THREE.Group(); orr.position.set(-0.155, 0.004, 0.035); group.add(orr);          // 小盘放在海岸左前方的书页上
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.05, 64), new THREE.MeshBasicMaterial({ color: 0x1f2735 })); disc.rotation.x = -Math.PI / 2; orr.add(disc);
    const earth = new THREE.Mesh(new THREE.SphereGeometry(0.009, 24, 16), new THREE.MeshLambertMaterial({ color: 0x4f8fc4, emissive: 0x10243a })); earth.position.y = 0.01; orr.add(earth);
    const bulge = new THREE.Mesh(new THREE.SphereGeometry(0.0105, 32, 16), new THREE.MeshBasicMaterial({ color: 0x8fc6ea, transparent: true, opacity: 0.55, depthWrite: false })); bulge.position.y = 0.01; orr.add(bulge);          // 鼓起来的海水（夸大）
    const moon = new THREE.Mesh(new THREE.SphereGeometry(0.004, 16, 12), new THREE.MeshLambertMaterial({ color: 0xd8d4c8, emissive: 0x333333 })); orr.add(moon);
    const moonPick = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); moonPick.userData.pick = true; moon.add(moonPick);
    const sunDir = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.014, 12), new THREE.MeshBasicMaterial({ color: 0xffc04a })); sunDir.rotation.z = -Math.PI / 2; sunDir.position.set(-0.044, 0.006, 0); orr.add(sunDir);          // 尖朝地球：太阳光从左边照过来
    const port = new THREE.Mesh(new THREE.SphereGeometry(0.0018, 8, 6), new THREE.MeshBasicMaterial({ color: 0xd8392b })); orr.add(port);
    const moonOrbit = new THREE.Mesh(new THREE.RingGeometry(0.034, 0.0352, 72), new THREE.MeshBasicMaterial({ color: 0x9aa4b4, side: THREE.DoubleSide })); moonOrbit.rotation.x = -Math.PI / 2; moonOrbit.position.y = 0.0005; orr.add(moonOrbit);
    const tSun = tag('太阳光 →', 'pill'), tMoon = tag('', 'pill'), tPort = tag('港口', 'pill');
    const placeOrr = () => {
      const a = Math.PI + (2 * Math.PI * S.D) / SYN;          // 新月：月亮在地球和太阳中间（太阳在左边）
      moon.position.set(Math.cos(a) * 0.035, 0.01, -Math.sin(a) * 0.035);
      const pr = 1 + 0.55 * 1 + 0.25 * Math.cos(2 * (2 * Math.PI * S.D / SYN)) * 1;          // 叠加时鼓得多，错开时鼓得少（示意）
      bulge.scale.set(1.45 * pr / 1.8, 0.9, 0.85); bulge.rotation.y = a;
      const rot = (2 * Math.PI * S.h) / 24;          // 地球自转：0 点时港口在背着太阳的那一边（夜里，太阳在左边）
      port.position.set(Math.cos(rot) * 0.0105, 0.01, -Math.sin(rot) * 0.0105);
      tSun.loc(orr, -0.04, 0.02, -0.02); tMoon.loc(orr, moon.position.x, 0.03, moon.position.z).text(`${phaseName(S.D)} · 农历${lunarName(S.D)}`); tPort.loc(orr, port.position.x * 1.6, 0.03, port.position.z * 1.6).show(false);          // 港口就是地球上的红点，不再挂牌子（太挤）
    };

    const layout = () => {
      const v = level(S.D, S.h), y = MSL + v * KY;
      let x0 = XL; for (let x = XL; x < XR; x += 0.001) if (shore(x) < y) { x0 = x; break; }          // 海水只从水边往海里画，不罩在岸上
      water.scale.set((XR - x0) / (XR - XL), Math.max(0.001, y), 1); water.position.set((x0 + XR) / 2, y / 2, 0);
      const bed = SHIP_BED, deep = y - bed, afloat = deep > SHIP_DRAFT;          // 港口航道（码头边）的水深：太浅船就搁浅
      ship.position.set(0.11, afloat ? y - 0.002 : bed + 0.0003, 0.0); ship.rotation.z = afloat ? 0 : 0.18;          // 搁浅时船底就落在海底上
      tShip.loc(block, 0.11, Math.max(bed, y) + 0.016, 0).text(afloat ? '船浮着，能进出港' : '水太浅，船搁浅了');
      people.children.forEach((pp) => (pp.visible = shore(pp.position.x) > y + 0.001)); people.visible = true;          // 赶海的人只站在露出水面的滩涂上
      const rows = [0, 1, 2, 3].map((r) => shore(-0.02 + r * 0.022) + 0.008), out = rows.filter((ny) => ny > y).length;
      tNori.loc(block, 0.01, Math.max(y, 0.035) + 0.022, -ZD + 0.02).text(out === 4 ? '紫菜网帘全露出水面：晒太阳、光合作用' : out === 0 ? '紫菜网帘全浸在海水里：吸收养分' : `${out} 排网帘露出水面，${4 - out} 排浸在水里`);          // 按每一排网帘的高度算
      tHint.loc(block, -0.03, 0.08, 0).text('拨时间、拖月亮，看潮水涨落').show(!S.seen.size);
      tScale.loc(block, XL + 0.06, -0.004, ZD + 0.01);
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
      if (S.act) { const A = ACTS[S.act]; g.fillStyle = 'rgba(80,160,90,0.15)'; for (let t = 0; t < 24; t += 0.1) if (A.ok(level(S.D, t), S.D, level(S.D, t + 0.1) > level(S.D, t))) g.fillRect(PX(t), T, PX(0.1) - PX(0) + 0.5, B - T); }          // 挑过一件事以后，合适的时段淡淡涂绿
      const v = level(S.D, S.h); g.fillStyle = '#c4462e'; g.beginPath(); g.arc(PX(S.h), PY(v), 4, 0, 7); g.fill();
      const rg = range(S.D), dv = level(S.D, S.h + 0.1) - v;
      W.read.innerHTML = `现在 <b>${Math.floor(S.h)} 时 ${String(Math.round((S.h % 1) * 60)).padStart(2, '0')} 分</b>：水位 ${v >= 0 ? '+' : ''}${v.toFixed(1)} 米，正在<b>${dv > 0 ? '涨潮' : '落潮'}</b>　这一天的潮差 <b>${rg.r.toFixed(1)} 米</b>${S.pick ? `<br>${ACTS[S.pick.k].name}挑在 ${Math.floor(S.pick.h)} 时：<b>${S.pick.ok ? '合适' : '不合适'}</b>（${ACTS[S.pick.k].why}）` : ''}<br><small>潮位是示意；实际各地每天的潮时、潮高可以查潮汐表</small>`;
    };
    const drawLog = () => {
      if (!W) return;
      const rows = [], r = (b, t) => rows.push(h('div', { class: 'tl-row' }, h('b', {}, b), h('span', {}, t)));
      if (S.seen.has('day')) r('一天里：', '海水通常涨两次、落两次');
      for (const [k, n] of [['spring', '新月、满月（初一、十五前后）'], ['neap', '上弦、下弦']]) if (S.did[k]) r(`${n}：`, `潮差约 ${S.did[k].toFixed(1)} 米`);
      for (const k in ACTS) if (S.did[k] != null) r(`${ACTS[k].name}：`, S.did[k] ? `挑在${ACTS[k].need}，合适` : `没挑在${ACTS[k].need}，不合适`);
      if (S.guess != null && S.did.spring && S.did.neap) rows.push(h('div', { class: 'tl-row' }, h('small', {}, `你猜：${ASK[1][S.guess]}　实际：初一、十五前后`)));
      W.log.replaceChildren(...rows);
      if (S.seen.has('day') && S.did.spring && S.did.neap && Object.keys(ACTS).some((k) => S.did[k])) W.ui.unlock();
    };
    const noteState = () => {
      const f = ((S.D % SYN) + SYN) % SYN / SYN;
      if (f < 0.04 || f > 0.96 || Math.abs(f - 0.5) < 0.04) { if (!S.did.spring) { S.did.spring = range(S.D).r; S.cmp = S.cmp ?? S.D; drawLog(); } }
      if (Math.abs(f - 0.25) < 0.04 || Math.abs(f - 0.75) < 0.04) { if (!S.did.neap) { S.did.neap = range(S.D).r; S.cmp = S.cmp ?? S.D; drawLog(); } }
    };

    // ---- 指针：拖月亮；在曲线上挑时刻（在侧栏里，见 mount） ----
    const plane = new THREE.Plane(), hit = new THREE.Vector3();
    const pointer = {
      down(rc) { if (!rc.intersectObject(moonPick, false).length) return false; S.drag = true; document.getElementById('c').style.cursor = 'grabbing'; return true; },
      move(rc) {
        const c = document.getElementById('c');
        if (!S.drag) { if (c) c.style.cursor = rc.intersectObject(moonPick, false).length ? 'grab' : ''; return false; }
        orr.updateMatrixWorld(); plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), orr.localToWorld(new THREE.Vector3(0, 0.01, 0))); if (!rc.ray.intersectPlane(plane, hit)) return true;
        const l = orr.worldToLocal(hit.clone()), a = Math.atan2(-l.z, l.x), prevD = S.D; S.D = ((((a - Math.PI) / (2 * Math.PI)) * SYN) % SYN + SYN) % SYN;
        if (Math.abs(S.D - prevD) > 0.5) S.pick = null; if (Math.abs(S.D - prevD) > 3) S.cmp = prevD;          // 换到差得远的日子：原来那天的曲线留成虚线比一比
        S.seen.add('moon'); noteState(); W?.day.set(Math.round(S.D)); layout(); return true;
      },
      up() { if (!S.drag) return false; S.drag = false; document.getElementById('c').style.cursor = ''; return true; },
    };

    layout();

    return {
      group,
      card: false,
      emerge: 'flat',          // 课本的图平放在书页上，模型从它上面长出来、它慢慢淡掉
      size: { w: 0.42, d: 0.16, h: 0.09 },
      view: { elev: 22, azim: 12, lookY: 0.4, frameMargin: 1.08 },
      pointer,
      mount(ui) {
        const time = slider('一天里的时刻（地方时）', { min: 0, max: 24, step: 0.1, value: S.h, fmt: (v) => `${Math.floor(v)} 时`, onInput: (v) => { S.h = v; S.play = false; acts.btns[0].textContent = '让一天走'; S.seen.add('day'); layout(); drawLog(); } });
        const day = slider('农历的日子（也可以拖月亮）', { min: 0, max: 29, step: 1, value: 0, fmt: (v) => lunarName(v), onInput: (v) => { const p = S.D; S.D = v; S.pick = null; if (Math.abs(v - p) > 3) S.cmp = p; noteState(); layout(); } });          // 换了日子：之前挑的时刻作废
        const actSeg = seg('选一件事，再在曲线上点一个时刻', Object.keys(ACTS).map((k) => ACTS[k].name), (_, i) => { S.act = Object.keys(ACTS)[i]; S.pick = null; layout(); ui.status(`${ACTS[S.act].name}：在上面的潮位曲线上<b>点一个时刻</b>，看看这时候行不行。`); }, { value: -1 });
        const guess = seg(...ASK, (_, i) => { S.guess = i; drawLog(); }, { value: -1 });
        const acts = buttons([
          { text: '让一天走', onClick: () => { S.play = !S.play; acts.btns[0].textContent = S.play ? '停一下' : '让一天走'; } },
          { text: '重来', ghost: true, onClick: () => { ui.relock?.(); Object.assign(S, { D: 0, h: 6, play: false, act: null, pick: null, seen: new Set(), did: {}, guess: null, cmp: null }); time.set(6); day.set(0); actSeg.set(-1); guess.set(-1); acts.btns[0].textContent = '让一天走'; layout(); drawLog(); } },
        ]);
        const chart = h('canvas', { class: 'wx-map', width: 320, height: 140, style: 'cursor: pointer' }), read = h('div', { class: 'read-out' }), log = h('div', { class: 'timeline' });
        chart.onclick = (e) => { const r = chart.getBoundingClientRect(), t = (((e.clientX - r.left) / r.width) * 320 - 30) / (320 - 38) * 24; if (t < 0 || t > 24) return; S.h = t; time.set(t); S.seen.add('day'); S.play = false; acts.btns[0].textContent = '让一天走';          // 挑时刻时先停下
          if (S.act) { const ok = ACTS[S.act].ok(level(S.D, t), S.D, level(S.D, t + 0.1) > level(S.D, t)); S.pick = { k: S.act, h: t, ok }; S.did[S.act] = ok; } layout(); drawLog(); };          // 点曲线：挑一个时刻
        ui.controls.append(h('div', { class: 'bar-title' }, '港口的潮位（点曲线可以挑时刻）'), chart, read, time.el, acts.el, day.el, actSeg.el, guess.el, note('海岸左边的小盘：太阳光从左边来，中间是地球（红点是港口），可以拖月亮。'));
        ui.data.append(h('div', { class: 'bar-title' }, '你看到了什么'), log);
        W = { ui, chart, read, log, day, time };
        ui.status('这是一段海岸：岸上有港口，滩涂上养着紫菜。先<b>拨时间</b>（或让一天走），看海水一天里怎么涨落。');
        layout(); drawLog();
      },
      update(dt) {
        if (S.play) { S.h = (S.h + dt * 2) % 24; if (!S.seen.has('day')) { S.seen.add('day'); drawLog(); } W?.time.set(S.h); layout(); }
      },
    };
  },
};
