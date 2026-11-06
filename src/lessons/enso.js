// 高中地理 选择性必修1 第四章第三节 海—气相互作用 · 厄尔尼诺和拉尼娜（课本第 74–75 页，图 4.17、图 4.18 正常年份热带太平洋上空的大气热力环流模式）。
//
// 一个问题（课本开头）：秘鲁沿海常年受寒流影响，气候干旱；可 2016 年底起海水变暖、暴雨成灾。为什么会出现这种气候异常？
// 课本的图就是模型：图 4.18 那样一个沿赤道切开的太平洋剖面——西边是印度尼西亚一带的群岛，东边是秘鲁沿海和安第斯山；
// 海面下是一层暖水，暖水下面是冷水；海面上空是一圈热力环流（西边上升、东边下沉）。
// 学生亲手做的：按住海里那团暖水往东推（厄尔尼诺），或往西推（拉尼娜）。中东部海温跟着变，东西温差变小或变大，
// 上空的环流、云雨跟着挪；西边由多雨变干旱（森林起火），东边由干旱变多雨（洪涝）；秘鲁沿岸的冷水上涌变弱，鱼少了。
// 教学示意：海温、环流的位置都是示意；厄尔尼诺的成因科学家还在探索（课本自学窗），这里只演示它发生后的样子和影响。
import * as THREE from 'three';
import { seg, buttons, note } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { h } from '../ui/Panel.js';
import { sst, west, east, diff, riseX, sinkX, rainAmt, weather, upwell, stateName } from './kit/enso.js';

const XL = -0.17, XR = 0.17, ZD = 0.05, SEA = 0.03, AIR = 0.085;
const X = (u) => XL + (XR - XL) * (u + 1) / 2, U = (x) => ((x - XL) / (XR - XL)) * 2 - 1;          // 模型 x（−1…1）↔ 画面 x
const ASK = ['先猜一下（可以不猜）：在这个情境里，太平洋中东部海水变暖以后，秘鲁沿海会——', ['更干旱', '变得多雨', '没变化']];
const rnd = (() => { let s = 31; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export default {
  id: 'enso',
  fig: '图4.18',
  title: '厄尔尼诺和拉尼娜',
  flow: 'explore',
  ask: '秘鲁沿海常年受寒流影响，气候干旱；可 2016 年底，那里的海水变暖，暴雨引发洪灾。为什么会出现这种气候异常？',
  need: '把暖水往东推，看东西两岸的天气怎么变；再往西推比一比',
  conclusion: {
    page: 78,
    quote: '正常年份，赤道附近太平洋中东部的表层海水温度较低，大气较稳定，气流下沉；西部海水温度较高，气流上升。有些年份，赤道附近太平洋中东部表层海水温度异常升高，这种现象被称为厄尔尼诺现象。厄尔尼诺现象发生后，赤道附近太平洋地区东、西部海面的温度差异减小。赤道附近的太平洋东部，如秘鲁和智利沿海，下沉气流减弱或消失，甚至出现上升气流，气候由原来的干燥少雨变为多雨，引发洪涝灾害。同时，赤道附近的太平洋西部，上升气流减弱或消失，气候由温润多雨转变为干燥少雨，带来旱灾或森林大火。……与厄尔尼诺现象相反，拉尼娜现象是指赤道附近太平洋中东部的表层海水温度异常降低的现象。',
    why: '海面温度的分布影响上空的空气是升还是沉：相对暖的海面上空气容易受热上升、成云下雨，相对冷的海面上空气下沉、干燥。正常年份暖水堆在西边，西边上升多雨、东边下沉干燥，上空连成一圈热力环流。厄尔尼诺时暖水到了中东部，上升的地方跟着东移：东边下起大雨，西边反而干旱。海温变一变，大气环流、各地的降水都跟着变——这就是海—气相互作用。',
    src: '课本第 74–75 页 · 第四章 第三节 海—气相互作用',
  },

  create({ tag }) {
    const group = new THREE.Group();
    const S = { a: 0, drag: false, seen: new Set(), guess: null, t: 0 };
    let W = null;
    const block = new THREE.Group(); group.add(block);

    // ---- 海洋剖面：表层暖水、下面冷水（颜色按海温画），温跃层是暖水和冷水的分界 ----
    const SW = 512, SH = 128, cv = document.createElement('canvas'); cv.width = SW; cv.height = SH; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const col = (T) => { const t = Math.max(0, Math.min(1, (T - 16) / 14)); const r = Math.round(40 + 200 * t), g = Math.round(90 + 60 * t - 40 * t * t), b = Math.round(190 - 150 * t); return `rgb(${r},${g},${b})`; };
    const thermo = (x, a) => 0.55 - 0.42 * (x + 1) / 2 * (1 - 0.75 * Math.max(0, a)) * (1 + 0.3 * Math.max(0, -a));          // 温跃层（暖水层的底）：西边深、东边浅；厄尔尼诺时变平
    const paintSea = () => {
      const g = cv.getContext('2d');
      for (let i = 0; i < SW; i++) { const u = (i / (SW - 1)) * 2 - 1, d = thermo(u, S.a) * SH, T = sst(u, S.a); const gr = g.createLinearGradient(0, 0, 0, SH); gr.addColorStop(0, col(T)); gr.addColorStop(Math.min(0.98, d / SH), col(T - 1.5)); gr.addColorStop(Math.min(0.99, d / SH + 0.05), col(14)); gr.addColorStop(1, col(12)); g.fillStyle = gr; g.fillRect(i, 0, 1, SH); }
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.setLineDash([6, 5]); g.lineWidth = 2; g.beginPath(); for (let i = 0; i < SW; i += 4) { const u = (i / (SW - 1)) * 2 - 1, y = thermo(u, S.a) * SH; if (i) g.lineTo(i, y); else g.moveTo(i, y); } g.stroke(); g.setLineDash([]);
      tex.needsUpdate = true;
    };
    const front = new THREE.Mesh(new THREE.PlaneGeometry(XR - XL, SEA), new THREE.MeshBasicMaterial({ map: tex })); front.position.set(0, SEA / 2, ZD); block.add(front);
    const back = new THREE.Mesh(new THREE.BoxGeometry(XR - XL, SEA, ZD * 2 - 0.002), new THREE.MeshBasicMaterial({ color: 0x2a5a8a })); back.position.y = SEA / 2; block.add(back);
    const seaCv = document.createElement('canvas'); seaCv.width = 512; seaCv.height = 16; const seaTex = new THREE.CanvasTexture(seaCv); seaTex.colorSpace = THREE.SRGBColorSpace;
    const seaTop = new THREE.Mesh(new THREE.PlaneGeometry(XR - XL, ZD * 2), new THREE.MeshBasicMaterial({ map: seaTex })); seaTop.rotation.x = -Math.PI / 2; seaTop.position.y = SEA + 0.0003; block.add(seaTop);
    const paintTop = () => { const g = seaCv.getContext('2d'); for (let i = 0; i < 512; i++) { const u = (i / 511) * 2 - 1; g.fillStyle = col(sst(u, S.a)); g.fillRect(i, 0, 1, 16); } seaTex.needsUpdate = true; };          // 海面按表层水温着色：越红越暖
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(XR - XL, SEA, ZD * 2)), new THREE.LineBasicMaterial({ color: 0x1f3550, transparent: true, opacity: 0.5 })); frame.position.y = SEA / 2; block.add(frame);

    // ---- 两岸：西边一串小岛（雨林、村子），东边秘鲁沿海（干的海岸、安第斯山） ----
    const lit = (c) => new THREE.MeshLambertMaterial({ color: c });
    const islands = new THREE.Group(); block.add(islands);
    for (const [x, z, r] of [[XL + 0.012, -0.02, 0.012], [XL + 0.03, 0.015, 0.01], [XL + 0.008, 0.03, 0.008]]) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), lit(0x5f9a48)); m.scale.y = 0.6; m.position.set(x, SEA, z); islands.add(m); }
    const forest = new THREE.InstancedMesh(new THREE.ConeGeometry(0.002, 0.006, 6).translate(0, 0.003, 0), lit(0x2f6a30), 30); forest.raycast = () => {}; block.add(forest);
    { const m4 = new THREE.Matrix4(); for (let k = 0; k < 30; k++) { const a = rnd() * 6.28, r = rnd() * 0.008, cx = [XL + 0.012, XL + 0.03, XL + 0.008][k % 3], cz = [-0.02, 0.015, 0.03][k % 3]; m4.makeTranslation(cx + Math.cos(a) * r, SEA + 0.004, cz + Math.sin(a) * r); forest.setMatrixAt(k, m4); } }
    const fire = new THREE.Group(); block.add(fire);
    const fireTex = canvasTex(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w * 0.7, 0, w / 2, w * 0.6, w / 2); gr.addColorStop(0, 'rgba(255,230,120,1)'); gr.addColorStop(0.4, 'rgba(255,120,40,0.9)'); gr.addColorStop(1, 'rgba(200,40,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    for (let k = 0; k < 6; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireTex, transparent: true, depthWrite: false })); s.position.set(XL + 0.008 + k * 0.005, SEA + 0.008, -0.02 + (k % 3) * 0.02); s.scale.set(0.008, 0.012, 1); s.raycast = () => {}; fire.add(s); }
    const smokeTex = canvasTex(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(110,105,100,0.7)'); gr.addColorStop(1, 'rgba(110,105,100,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const smoke = Array.from({ length: 8 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false })); s.raycast = () => {}; fire.add(s); return s; });
    const coast = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, ZD * 2), lit(0xd8c08a)); coast.position.set(XR + 0.015, SEA - 0.006 + 0.006, 0); block.add(coast);          // 秘鲁的干旱海岸
    const andesShape = new THREE.Shape(); andesShape.moveTo(0, 0); andesShape.lineTo(0.012, 0.03); andesShape.lineTo(0.02, 0.022); andesShape.lineTo(0.03, 0.036); andesShape.lineTo(0.04, 0); andesShape.closePath();
    const andesGeo = new THREE.ExtrudeGeometry(andesShape, { depth: ZD * 2, bevelEnabled: false }); andesGeo.translate(0, 0, -ZD);
    const andes = new THREE.Mesh(andesGeo, lit(0x9a7a58)); andes.position.set(XR + 0.012, SEA + 0.006, 0); block.add(andes);
    const town = new THREE.Group(); block.add(town); for (const [dx, dz] of [[0, 0], [0.005, 0.008], [-0.004, -0.008]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, 0.004), lit(0xf3ede1)); b.position.set(XR + 0.006 + dx, SEA + 0.008, dz); town.add(b); }
    const flood = new THREE.Mesh(new THREE.PlaneGeometry(0.03, ZD * 2), new THREE.MeshBasicMaterial({ color: 0x6f6a4a, transparent: true, opacity: 0 })); flood.rotation.x = -Math.PI / 2; flood.position.set(XR + 0.015, SEA + 0.0062, 0); flood.raycast = () => {}; block.add(flood);          // 洪水：岸上积起一片浑水
    const boats = new THREE.Group(); block.add(boats);
    for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.002, 0.003), lit(0xb8442e)); b.position.set(XR - 0.012 - (k % 2) * 0.01, SEA + 0.001, -0.03 + k * 0.02); boats.add(b); }
    const fish = Array.from({ length: 10 }, () => { const f = new THREE.Mesh(new THREE.ConeGeometry(0.0012, 0.004, 6), lit(0xcfd8e0)); f.rotation.z = Math.PI / 2; f.position.set(XR - 0.01 - rnd() * 0.03, SEA * (0.4 + rnd() * 0.5), ZD + 0.0015); f.raycast = () => {}; block.add(f); return f; });          // 秘鲁沿岸的鱼（画在剖面上）
    const upArrows = [0, 1, 2].map((k) => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.002, 0.007, 8), new THREE.MeshBasicMaterial({ color: 0x9ad0ff, transparent: true })); m.position.set(XR - 0.012 - k * 0.008, SEA * 0.4, ZD + 0.002); m.raycast = () => {}; block.add(m); return m; });          // 冷水上涌

    // ---- 上空的热力环流：一圈带箭头的环（上升的一侧有云、下雨） ----
    const loopMat = new THREE.MeshBasicMaterial({ color: 0x2a5a9a, transparent: true, opacity: 0.85 });
    loopMat.userData.see = true;          // 箭头本来就套在环上
    const loops = new THREE.Group(); block.add(loops);
    const buildLoop = () => {
      for (const o of [...loops.children]) { loops.remove(o); o.geometry.dispose(); }
      const xr = X(riseX(S.a)), xs = X(sinkX(S.a)), str = Math.max(0.25, diff(S.a) / 9.9), top = SEA + 0.015 + 0.04 * str, low = SEA + 0.006, z = ZD * 0.2;
      const P = []; for (let i = 0; i <= 12; i++) P.push(new THREE.Vector3(xs + (xr - xs) * (i / 12), low, z)); for (let i = 1; i <= 4; i++) P.push(new THREE.Vector3(xr, low + (top - low) * (i / 4), z)); for (let i = 1; i <= 12; i++) P.push(new THREE.Vector3(xr + (xs - xr) * (i / 12), top, z)); for (let i = 1; i < 4; i++) P.push(new THREE.Vector3(xs, top - (top - low) * (i / 4), z));
      const c = new THREE.CatmullRomCurve3(P, true, 'catmullrom', 0.2), tube = new THREE.Mesh(new THREE.TubeGeometry(c, 90, 0.0009 + 0.0007 * str, 6, true), loopMat); tube.raycast = () => {}; loops.add(tube);
      for (const u of [0.15, 0.42, 0.62, 0.9]) { const hd = new THREE.Mesh(new THREE.ConeGeometry(0.0028, 0.008, 10), loopMat); hd.position.copy(c.getPointAt(u)); hd.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.getTangentAt(u)); hd.raycast = () => {}; loops.add(hd); }
      tUp.loc(block, xr, top + 0.01, z).text('上升'); tDown.loc(block, xs, top + 0.01, z).text('下沉');
    };
    const tUp = tag('上升', 'pill'), tDown = tag('下沉', 'pill');
    const cloudTex = canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const cloud = new THREE.Group(); block.add(cloud);
    for (let k = 0; k < 12; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, color: new THREE.Color(0.78, 0.8, 0.86), transparent: true, depthWrite: false })); s.position.set((rnd() - 0.5) * 0.04, (rnd() - 0.3) * 0.012, (rnd() - 0.5) * 0.06); const r = 0.014 + rnd() * 0.01; s.scale.set(r, r * 0.8, 1); s.raycast = () => {}; cloud.add(s); }
    const rain = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x5f86b8, transparent: true, opacity: 0.7 })); rain.raycast = () => {}; block.add(rain);
    const NR = 140, rp = new Float32Array(NR * 6), rs = Array.from({ length: NR }, () => [rnd(), rnd(), rnd()]); rain.geometry.setAttribute('position', new THREE.BufferAttribute(rp, 3));

    // ---- 暖水：海面下那团可以推的“暖水”（一个半透明的红色把手） ----
    const handle = new THREE.Mesh(new THREE.SphereGeometry(0.009, 20, 14), new THREE.MeshStandardMaterial({ color: 0xe0583a, transparent: true, opacity: 0.85, emissive: 0x5a1a10, emissiveIntensity: 0.4 })); block.add(handle);
    const handlePick = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); handlePick.userData.pick = true; handle.add(handlePick);
    const tHint = tag('按住这团暖水，往东（右）推、往西（左）推', 'pill'), tScale = tag('教学示意 · 竖直方向夸大了 · 海温和环流的位置是示意 · 拖动只是切换状态，不是在模拟成因', 'pill');
    const tW = tag('', 'pill'), tE = tag('', 'pill'), tState = tag('', 'pill callout');
    tag('西太平洋（印度尼西亚一带）', 'pill').loc(block, XL + 0.02, -0.004, ZD + 0.01); tag('东太平洋（秘鲁沿海）', 'pill').loc(block, XR - 0.02, -0.004, ZD + 0.01);
    const callout = tag('', 'pill callout'); callout.show(false); let calloutT = 0;

    const layout = () => {
      const wx = weather(S.a), hx = X(-0.2 + 0.7 * S.a);          // 暖水把手只在看得见的海面里走
      handle.position.set(hx, SEA - 0.006, ZD + 0.004);
      paintSea(); paintTop(); buildLoop();
      const xr = X(riseX(S.a)); cloud.position.set(xr, AIR - 0.01, 0); cloud.scale.setScalar(0.8 + 0.4 * Math.max(0.3, diff(S.a) / 9.9));
      fire.visible = !wx.west.rain; flood.material.opacity = wx.east.rain ? 0.7 : 0; boats.visible = true;
      const up = upwell(S.a); upArrows.forEach((m) => { m.material.opacity = up; m.visible = up > 0.05; }); fish.forEach((f, i) => (f.visible = i < Math.round(up * 10 + 1)));          // 冷水上涌少了，营养物质少，鱼也少了
      tW.loc(block, XL + 0.02, SEA + 0.03, -ZD).text(`<b>西部</b> ${west(S.a).toFixed(0)}℃ · ${wx.west.t}`); tE.loc(block, XR - 0.01, SEA + 0.04, -ZD).text(`<b>东部</b> ${east(S.a).toFixed(0)}℃ · ${wx.east.t}`);
      tState.loc(block, 0, AIR + 0.025, 0).text(stateName(S.a));
      tHint.loc(block, hx, SEA + 0.02, ZD).show(!S.seen.size);
      tScale.loc(block, 0, -0.004, ZD + 0.01);
      drawChart();
    };

    // ---- 侧栏：沿赤道的表层海温（虚线是正常年份） ----
    const drawChart = () => {
      if (!W) return;
      const c = W.chart, g = c.getContext('2d'), w = c.width, hh = c.height, L = 34, R = w - 10, T = 22, B = hh - 24, PX = (u) => L + ((u + 1) / 2) * (R - L), PY = (t) => B - ((t - 16) / 15) * (B - T);
      g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, hh); g.font = '600 12px "PingFang SC", sans-serif'; g.fillStyle = '#3a3226'; g.textBaseline = 'middle'; g.textAlign = 'left';
      g.fillText('赤道附近太平洋的表层海温（℃，示意）', 6, 10);
      g.strokeStyle = 'rgba(60,50,40,0.15)'; for (const t of [18, 22, 26, 30]) { g.beginPath(); g.moveTo(L, PY(t)); g.lineTo(R, PY(t)); g.stroke(); g.fillText(t, 8, PY(t)); }
      g.textAlign = 'left'; g.fillText('西', L, hh - 10); g.textAlign = 'right'; g.fillText('东', R, hh - 10);
      const line = (a, dash, cl, wd) => { g.save(); g.setLineDash(dash); g.strokeStyle = cl; g.lineWidth = wd; g.beginPath(); for (let i = 0; i <= 60; i++) { const u = -1 + (2 * i) / 60, x = PX(u), y = PY(sst(u, a)); if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); g.restore(); };
      line(0, [4, 3], 'rgba(60,60,60,0.5)', 1.5); line(S.a, [], '#c4462e', 2.4);
      W.read.innerHTML = `<b>${stateName(S.a)}</b>：西部 ${west(S.a).toFixed(1)}℃，中东部 ${east(S.a).toFixed(1)}℃，东西温差 <b>${diff(S.a).toFixed(1)}℃</b>（正常年份约 ${diff(0).toFixed(1)}℃）<br><small>海温是示意；厄尔尼诺的成因科学家还在探索</small>`;
    };
    const drawLog = () => {
      if (!W) return;
      const rows = [], r = (b, t) => rows.push(h('div', { class: 'tl-row' }, h('b', {}, b), h('span', {}, t)));
      if (S.seen.has('el')) r('厄尔尼诺：', '中东部海温升高，东西温差变小；上升气流东移：东边多雨、洪涝，西边干旱、森林起火；秘鲁沿岸冷水上涌变弱，鱼少了');
      if (S.seen.has('la')) r('拉尼娜：', '中东部海温降低，东西温差变大；东边下沉气流更强、更干，西边雨更多');
      if (S.guess != null && S.seen.has('el')) rows.push(h('div', { class: 'tl-row' }, h('small', {}, `你猜：${ASK[1][S.guess]}　实际：变得多雨（甚至洪涝）`)));
      W.log.replaceChildren(...rows);
      if (S.seen.has('el') && S.seen.has('la')) W.ui.unlock();
    };
    const events = () => {
      const k = S.a > 0.6 ? 'el' : S.a < -0.6 ? 'la' : null, st = k || (Math.abs(S.a) < 0.3 ? 'normal' : S.lastSt);
      if (st !== S.lastSt) { S.lastSt = st; W?.stSeg.set(st === 'la' ? 0 : st === 'el' ? 2 : st === 'normal' ? 1 : -1); if (st === 'normal' && S.seen.size) W?.ui.status('回到正常年份：暖水堆在西边，西边上升多雨，东边下沉干燥。'); else if (k && S.seen.has(k)) W?.ui.status(k === 'el' ? '又是<b>厄尔尼诺</b>：上升气流到了中东部，秘鲁沿海多雨，西边干旱。' : '又是<b>拉尼娜</b>：东西温差更大，原来的环流更强。'); }          // 状态变了：按钮、提示一起跟着变
      if (k && !S.seen.has(k)) { S.seen.add(k); callout.loc(block, k === 'el' ? XR - 0.03 : XL + 0.04, AIR + 0.02, 0).text(k === 'el' ? '东边下起大雨，西边干旱' : '东西温差更大了').show(true); calloutT = 4; drawLog(); W?.ui.status(k === 'el' ? '这就是<b>厄尔尼诺</b>：赤道附近太平洋中东部海水异常变暖。上升气流东移到了中东部：秘鲁沿海下起大雨，西边的岛上却干旱起火。再往西推试试。' : '这是<b>拉尼娜</b>：中东部海水异常变冷，东西温差更大，原来的环流更强了。'); }
    };

    // ---- 拖暖水 ----
    const plane = new THREE.Plane(), hit = new THREE.Vector3(), wq = new THREE.Vector3(); let dx0 = 0;
    const onFront = (ray) => { block.updateMatrixWorld(); block.localToWorld(wq.set(0, 0, ZD)); plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1).applyQuaternion(block.getWorldQuaternion(new THREE.Quaternion())), wq); if (!ray.intersectPlane(plane, hit)) return null; return block.worldToLocal(hit.clone()); };
    const pointer = {
      down(rc) { if (!rc.intersectObject(handlePick, false).length) return false; const p = onFront(rc.ray); dx0 = p ? p.x - handle.position.x : 0; S.drag = true; document.getElementById('c').style.cursor = 'grabbing'; return true; },
      move(rc) {
        const c = document.getElementById('c');
        if (!S.drag) { if (c) c.style.cursor = rc.intersectObject(handlePick, false).length ? 'grab' : ''; return false; }
        const p = onFront(rc.ray); if (!p) return true; const u = U(p.x - dx0); S.a = Math.max(-1, Math.min(1, (u + 0.2) / 0.7)); events(); layout(); return true;
      },
      up() { if (!S.drag) return false; S.drag = false; document.getElementById('c').style.cursor = ''; return true; },
    };

    layout();

    return {
      group,
      card: false,
      emerge: 'flat',          // 课本的图平放在书页上，模型从它上面长出来、它慢慢淡掉
      size: { w: 0.42, d: 0.12, h: 0.11 },
      view: { elev: 14, azim: 10, lookY: 0.5, frameMargin: 1.08 },
      pointer,
      mount(ui) {
        const stSeg = seg('直接选', ['拉尼娜', '正常年份', '厄尔尼诺'], (_, i) => { S.a = i - 1; events(); layout(); }, { value: 1 });
        const guess = seg(...ASK, (_, i) => { S.guess = i; drawLog(); }, { value: -1 });
        const acts = buttons([{ text: '重来', ghost: true, onClick: () => { ui.relock?.(); S.a = 0; S.seen.clear(); S.guess = null; stSeg.set(1); guess.set(-1); callout.show(false); layout(); drawLog(); ui.status('这是正常年份的赤道太平洋：暖水堆在西边。按住那团<b>暖水</b>往东推。'); } }]);
        const chart = h('canvas', { class: 'wx-map', width: 320, height: 130 }), read = h('div', { class: 'read-out' }), log = h('div', { class: 'timeline' });
        ui.controls.append(h('div', { class: 'bar-title' }, '表层海温（西 → 东）'), chart, read, guess.el, stSeg.el, acts.el, note('剖面上：红是暖水，蓝是冷水，白虚线是暖水层的底；上空的环：西边上升、东边下沉。'));
        ui.data.append(h('div', { class: 'bar-title' }, '你看到了什么'), log);
        W = { ui, chart, read, log, stSeg };
        ui.status('这是正常年份的赤道太平洋：暖水堆在西边，西边上升多雨、东边下沉干燥。按住那团<b>暖水</b>往东推。');
        layout(); drawLog();
      },
      update(dt) {
        S.t += dt; if (calloutT > 0) { calloutT -= dt; if (calloutT <= 0) callout.show(false); }
        const xr = X(riseX(S.a)), b = AIR - 0.016;
        const ra = rainAmt(S.a), nOn = Math.round(NR * ra);          // 雨多雨少跟着状态变
        for (let i = 0; i < NR; i++) { if (i >= nOn) { rp.set([0, -1, 0, 0, -1, 0], i * 6); continue; } const [a, z, c] = rs[i], x = xr + (a - 0.5) * 0.04 * (0.7 + 0.6 * ra), y = b - ((c + S.t * 1.2) % 1) * (b - SEA); rp.set([x, y, (z - 0.5) * ZD * 1.6, x - 0.0006, Math.max(SEA, y - 0.006), (z - 0.5) * ZD * 1.6], i * 6); }
        rain.geometry.attributes.position.needsUpdate = true;
        smoke.forEach((s, i) => { const t = (S.t * 0.3 + i / smoke.length) % 1; s.position.set(XL + 0.012 + t * 0.01, SEA + 0.01 + t * 0.03, -0.01 + (i % 3) * 0.012); s.scale.setScalar(0.008 + t * 0.016); s.material.opacity = (1 - t) * 0.8; });
        fish.forEach((f, i) => { f.position.x += Math.sin(S.t * 2 + i) * 0.00003; });
      },
    };
  },
};
