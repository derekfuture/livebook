// 数学 九年级上册 29.2.3 圆周角 · 图29.2-5（课本第 127–128 页）。情境用第 133 页 习题29.2 第 14 题：夜里的海港、两座灯塔、浅滩、危险角。
//
// 一个夜色的纸剧场盒子放在课本上。没有步骤栏、没有演示：学生（或在投影上讲课的老师）自己开船。
// 每做出一样东西，天幕上就在那一刻说出课本上对应的那句话（课本第 127–128 页的顺序），场景里标上和课本一样的字母：
//   开头的问题（第 14 题）：夜里看不见浅滩，只看得见两盏灯，船怎么知道自己进没进浅滩？
//   开船：船上看两盏灯正好 40° 时放一盏河灯，河灯连成过两座灯塔的圆＝浅滩的边；沿圆开处处 40°：圆周角的定义，都对着同一条弧 BC。
//   点浮标：圆心角 ∠BOC＝80°；剪两块光扇拼满：圆周角是圆心角的一半（看出来的）。
//   一束光照过浮标：情况（1）OA＝OC ⇒ ∠A＝∠C，外角 ⇒ ∠BOC＝2∠A；点浮标过船作直径 AD：情况（2）相加、（3）相减 → 圆周角定理、同弧所对的圆周角相等。
//   开进、开出浅滩：∠BPC 比 40° 大 / 小（延长交圆于 Q，三角形的外角）→ 正面回答开头的问题。
//   点海面：等角线，每个角度一段过两座灯塔的圆弧；90° 那圈以 BC 为直径（推论）。
// 两个视角：海图（和课本的图一样）、站到船头（点小船；右下角那卷海图点一下回来）。键盘 R：清场重来（给老师）。
// 所有角度、圆、等角线都按真实几何算出来。
import * as THREE from 'three';
import { arcPts, add, sub, mul, unit, ang, mid, dist, wrap, clamp, lerp, easeOut } from './kit/sheet.js';
import { draggable } from './kit/interact.js';
import { sfx, audio } from './kit/audio.js';

// ---- 几何（纸面坐标 u 向右、v 向里；三维里是 (u, y, −v)） ----
const B0 = [-0.06, 0.05], C0 = [0.06, 0.05];                 // 两座灯塔
const DANGER = (40 * Math.PI) / 180;                          // 危险角
const O = [0, 0.05 - 0.06 / Math.tan(DANGER)], R = 0.06 / Math.sin(DANGER);   // 过两座灯塔、圆周角是 40° 的圆：圆心（浮标）、半径
const SEA = { u0: -0.172, u1: 0.172, v0: -0.172, v1: 0.05 };  // 海（岸在 v = 0.05）；圆下面留一条水写字
const H = 0.024, LAND_V = 0.046, LAND_H = 0.003, BACK_V = 0.135;          // 海面离书页多高；岸线；岸比海面高多少；模型最里边
const INK_Y = LAND_H + 0.0003;          // 数学那一层比水面高这么多
const CAP_TOP = SEA.v0 + 0.05;          // 圆下面写字那条水的上沿
const TAU = Math.PI * 2, DEG = 180 / Math.PI;
const P3 = (p, y = 0) => new THREE.Vector3(p[0], y, -p[1]);
const angAt = (V, P, Q) => Math.abs(wrap(ang(sub(Q, V)) - ang(sub(P, V))));
const ccwStart = (V, P, Q) => { const a = ang(sub(P, V)), b = ang(sub(Q, V)); return wrap(b - a) > 0 ? a : b; };
const fmt = (r) => `${Math.round(r * DEG)}°`;
const onCirc = (t) => [O[0] + R * Math.cos(t), O[1] + R * Math.sin(t)];
const dirO = (p) => Math.atan2(p[1] - O[1], p[0] - O[0]);
const AB = dirO(B0), AC = dirO(C0) + TAU;                     // 圆在海里的那段弧：从 B 逆时针经过最下面到 C
const inSea = (p) => p[0] > SEA.u0 + 0.008 && p[0] < SEA.u1 - 0.008 && p[1] > SEA.v0 + 0.008 && p[1] < SEA.v1 - 0.012;
const central = () => angAt(O, B0, C0);

export default {
  id: 'inscribed',
  fig: '图29.2-5',
  title: '圆周角',
  flow: 'explore',
  ask: '浅滩在水下，船上看不见，只看得见岸上两座灯塔。<br>船怎么知道自己进没进浅滩？',
  need: '开船找一找：小旗连成了什么？从浮标看又是多少度？',
  conclusion: {
    page: 134, rect: [40, 548, 368, 690],
    quote: '一条弧所对的圆周角等于它所对的圆心角的一半。同弧或等弧所对的圆周角相等。半圆（或直径）所对的圆周角是直角，90°的圆周角所对的弦是直径。',
    why: '船在浅滩边那道弧上走，两座灯塔不动，从浮标（圆心）看两座灯塔的角就不变；船上的角是它的一半，所以也不变——同弧所对的圆周角相等。<br><br>为什么是一半：一束光正好照过浮标时，浮标到船、到另一座灯塔的两根绳子一样长（都是半径），两个底角相等；浮标那里的角是这个三角形的外角，等于两个底角的和，正好两倍。光从浮标旁边擦过时，过船拉一根穿过浮标的直径，把角拆成两块相加或相减，每块都是一半，合起来还是一半。<br><br>两座灯塔正好是直径两端的那一圈，处处都是 90°：半圆所对的圆周角是直角。<br><br>开进圈里，船上的角是圆上的角再加一块（三角形的外角），比危险角大；开到圈外，是圆上的角减去一块，比危险角小——所以只要量出的角小于危险角，船就在浅滩外面（课本第 133 页第 14 题）。',
    src: '课本第 127–128 页 · 第二十九章 29.2.3 圆周角；第 133 页 习题 29.2 第 14 题',
  },

  create({ look, back, camera, aim }) {
    const group = new THREE.Group();
    let ui = null, dead = false;
    const T0 = performance.now();
    const now = () => (performance.now() - T0) / 1000;
    const later = (ms, f) => setTimeout(() => { if (!dead) f(); }, ms);

    // ================= 白天：一整块海港模型立在课本上，和系列一样受桌上的光 =================
    // 从书页往上：海底、海水（前面和两边的切面看得见水和海底）、岸。数学（圆、角、线、字母）画在水面那一层（group）里
    const root = new THREE.Group(); root.add(group); group.position.y = H;
    const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    const basic = (o) => new THREE.MeshBasicMaterial(o);
    const quiet = (m) => { m.raycast = () => {}; m.userData.noFrame = true; return m; };
    const lit = (o) => new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0, ...o });
    const solid = (m) => { m.castShadow = true; m.receiveShadow = true; m.raycast = () => {}; m.userData.noFrame = true; return m; };
    const glowTex = tex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,232,170,1)'); r.addColorStop(0.28, 'rgba(255,196,110,0.5)'); r.addColorStop(1, 'rgba(255,170,80,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
    const halo = (s, o = 1) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: o })); sp.scale.set(s, s, 1); return quiet(sp); };
    const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    // 水深（示意）：外海深；浅滩那一圈里慢慢浅上来（一片水下沙洲，边缘正好在圆附近）；靠岸变浅
    const depth = (u, v) => { const r = Math.hypot(u - O[0], v - O[1]), shoal = 1 - smooth(R - 0.03, R + 0.004, r); return (0.0165 - 0.0118 * shoal) * (0.42 + 0.58 * smooth(LAND_V + 0.002, LAND_V - 0.03, v)); };
    const seaW = SEA.u1 - SEA.u0, seaD = LAND_V - SEA.v0, uc = (SEA.u0 + SEA.u1) / 2, vc = (SEA.v0 + LAND_V) / 2;
    { // 海底：沙洲那里浅、颜色亮（透过水是一片青绿），外海深、颜色暗
      const g = new THREE.PlaneGeometry(seaW, seaD, 150, 72), p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), SAND = new THREE.Color(0xeee9df), DEEP = new THREE.Color(0x8fa8b3);          // 素模：浅处是石膏白，深处透一点水色
      for (let i = 0; i < p.count; i++) { const u = p.getX(i) + uc, v = p.getY(i) + vc, d = depth(u, v); p.setXYZ(i, u, H - d, -v); c.copy(DEEP).lerp(SAND, clamp(1 - (d - 0.0045) / 0.0112, 0, 1)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
      const bed = quiet(new THREE.Mesh(g, lit({ vertexColors: true, roughness: 0.95 }))); bed.receiveShadow = true; bed.userData.qaSupport = true; root.add(bed);
    }
    // 切面：上面是水（海里那段）或岸，下面是一层层的沙、泥、岩石
    const YM = H + LAND_H;
    const faceTex = (sample) => tex(1024, 160, (g, w, hp) => {
      const Y = (y) => hp * (1 - y / YM);
      for (let i = 0; i < w; i++) {
        const s = sample((i + 0.5) / w), top = s.land ? YM : s.bed;
        for (const [a, b, c] of [[0, 0.42, '#d6d0c4'], [0.42, 0.74, '#e2dcd0'], [0.74, 1, s.land ? '#ebe6dc' : '#efeae0']]) { g.fillStyle = c; g.fillRect(i, Y(top * b), 1, Y(top * a) - Y(top * b) + 1); }
        for (let k = 0; k < 3; k++) { g.fillStyle = `rgba(90,80,66,${0.03 + Math.random() * 0.06})`; g.fillRect(i, Y(Math.random() * top), 1, 2); }
        if (s.land) { g.fillStyle = '#f6f3ed'; g.fillRect(i, Y(YM), 1, 3); }
        else { const gr = g.createLinearGradient(0, Y(H), 0, Y(s.bed)); gr.addColorStop(0, 'rgba(188,214,224,0.97)'); gr.addColorStop(1, 'rgba(138,170,184,0.97)'); g.fillStyle = gr; g.fillRect(i, Y(H), 1, Y(s.bed) - Y(H) + 1); g.fillStyle = 'rgba(236,247,252,0.95)'; g.fillRect(i, Y(H), 1, 2); }
      }
    });
    const face = (w, sample, x, z, ry) => { const m = quiet(new THREE.Mesh(new THREE.PlaneGeometry(w, YM), lit({ map: faceTex(sample), transparent: true, alphaTest: 0.5, roughness: 0.9 }))); m.position.set(x, YM / 2, z); m.rotation.y = ry; m.receiveShadow = true; m.userData.qaSupport = true; root.add(m); };
    const sideAt = (u, front) => (t) => { const v = front ? SEA.v0 + t * (BACK_V - SEA.v0) : BACK_V - t * (BACK_V - SEA.v0); return v >= LAND_V ? { land: true } : { bed: H - depth(u, v) }; };
    face(seaW, (t) => ({ bed: H - depth(SEA.u0 + t * seaW, SEA.v0) }), uc, -SEA.v0, 0);
    face(BACK_V - SEA.v0, sideAt(SEA.u0, false), SEA.u0, -(SEA.v0 + BACK_V) / 2, -Math.PI / 2);
    face(BACK_V - SEA.v0, sideAt(SEA.u1, true), SEA.u1, -(SEA.v0 + BACK_V) / 2, Math.PI / 2);
    face(seaW, () => ({ land: true }), uc, -BACK_V, Math.PI);
    { // 岸：一条矮矮的沙滩、后面是草地；岸线那一面是沙和石头
      const top = tex(1024, 256, (g, w, h) => {
        const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#f1ece2'); gr.addColorStop(0.2, '#f4f0e8'); gr.addColorStop(1, '#f6f3ed'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        for (let k = 0; k < 2600; k++) { g.fillStyle = `rgba(120,110,95,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      });
      const t = quiet(new THREE.Mesh(new THREE.PlaneGeometry(seaW, BACK_V - LAND_V).rotateX(-Math.PI / 2), lit({ map: top, roughness: 0.95 }))); t.position.set(uc, YM, -(LAND_V + BACK_V) / 2); t.receiveShadow = true; root.add(t);
      const edge = quiet(new THREE.Mesh(new THREE.PlaneGeometry(seaW, YM - (H - 0.009)), lit({ color: 0xe8e2d6, roughness: 0.95 }))); edge.position.set(uc, (YM + H - 0.009) / 2, -LAND_V); edge.receiveShadow = true; root.add(edge);
    }
    // 水面：半透明，透得出下面的沙洲；一层细细的波纹慢慢走
    const waves = tex(256, 256, (g, w, h) => {
      const img = g.createImageData(w, h), K = (2 * Math.PI) / 256, W = [[3, 1, 0.6, 0], [-2, 4, 0.5, 1.3], [5, -3, 0.32, 2.1], [1, 6, 0.25, 0.7]];
      const hh = (x, y) => W.reduce((s, [a, b, A, ph]) => s + A * Math.sin(K * (a * x + b * y) + ph), 0);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = hh(x + 1, y) - hh(x - 1, y), dy = hh(x, y + 1) - hh(x, y - 1), l = Math.hypot(dx, dy, 2), k = (y * w + x) * 4; img.data[k] = (-dx / l * 0.5 + 0.5) * 255; img.data[k + 1] = (-dy / l * 0.5 + 0.5) * 255; img.data[k + 2] = (2 / l * 0.5 + 0.5) * 255; img.data[k + 3] = 255; }
      g.putImageData(img, 0, 0);
    });
    waves.colorSpace = THREE.NoColorSpace; waves.wrapS = waves.wrapT = THREE.RepeatWrapping; waves.repeat.set(7, 4);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(seaW, seaD).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x9fbcc8, transparent: true, opacity: 0.5, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, normalMap: waves, normalScale: new THREE.Vector2(0.1, 0.1), depthWrite: false }));
    sea.position.set(uc, 0.0004, -vc); sea.receiveShadow = true; sea.renderOrder = -1; group.add(sea);          // 水面先画：上面的线、角不被水染成别的颜色
    // 数学那一层：比岸顶高一点点，线一直画到灯塔脚下也不会钻进岸里
    const ink = new THREE.Group(); ink.position.y = LAND_H + 0.0003; group.add(ink);

    // ================= 字：板书（左边纸面板）、重拍（场景里一闪）、提示（面板上一行） =================
    const caption = new THREE.Object3D();          // 以前天幕上的字幕：不要了（留个空壳，船头视角那几处还会设它的 visible）
    let capNow = ['', ''];
    const subEl = document.createElement('div');
    subEl.style.cssText = 'position:fixed;left:50%;bottom:44px;transform:translateX(-50%);max-width:min(860px,86vw);text-align:center;pointer-events:none;font:600 22px/1.45 "Kaiti SC","STKaiti",serif;color:#fbf1dc;text-shadow:0 1px 8px rgba(0,0,0,.85),0 0 2px rgba(0,0,0,.9);opacity:0;transition:opacity .4s;z-index:20';
    document.body.append(subEl);
    const subtitle = () => {
      if (!S || S.mode !== 'deck') { subEl.style.opacity = 0; return; }
      const th = theta(), z = zone(), col = z === 'in' ? '#ff9d86' : z === 'out' ? '#b4f0c4' : '#ffe39a';
      subEl.innerHTML = `<div style="font-size:30px;color:${col}">两座灯塔之间 ${fmt(th)}<span style="font-size:18px;color:#efe1c2;margin-left:14px">危险角 ${fmt(DANGER)}</span></div><div style="font-weight:400;font-size:17px;opacity:.88">按住往上拖，往前开；往两边拖，往旁边开</div>`;
      subEl.style.opacity = 1;
    };
    const css = document.createElement('style');
    css.textContent = `
.ins-board{margin:4px 0 6px;display:flex;flex-direction:column;gap:8px;font:15px/1.7 "Kaiti SC","STKaiti","Songti SC",serif;color:#2b2722}
.ins-board .ib-row{opacity:0;transform:translateY(5px);transition:opacity .5s,transform .5s,background-color 2.4s;padding:3px 8px 3px 6px;border-radius:5px;border-left:3px solid transparent}
.ins-board .ib-row.in{opacity:1;transform:none}
.ins-board .ib-row.fresh{background:rgba(255,206,110,.34);border-left-color:#d98a2b}
.ins-board .n{display:inline-block;min-width:1.25em;color:#b0532a;font-weight:700}
.ins-board b{color:#8a2f1d}
.ins-board i{font-family:"Times New Roman",serif;font-style:italic;letter-spacing:.02em}
.ins-board .ia{color:#cc6418;font-weight:600}.ins-board .ca{color:#2c6aa8;font-weight:600}
.ins-board .ib-h{font:600 12px/1.3 "PingFang SC","Hiragino Sans GB",sans-serif;color:#a07a45;letter-spacing:.3em;margin:6px 0 -4px;opacity:0;transition:opacity .4s}
.ins-board .ib-h.in{opacity:1}`;
    document.head.append(css);
    // 板书：学生做出一样，就用课本的话写一行；只写已经发现的，不预先列出后面要做什么
    let boardEl = null, lastH = ''; const boardRows = [];
    const board = (html, hold = false) => {
      const r = document.createElement('div'); r.className = 'ib-row'; r.innerHTML = html; boardRows.push(r);
      for (const o of boardRows) if (o !== r) o.classList.remove('fresh');
      if (boardEl) { boardEl.append(r); if (!hold) requestAnimationFrame(() => r.classList.add('in', 'fresh')); }
      return r;
    };
    board.h = (title) => { if (title === lastH) return; lastH = title; const r = document.createElement('div'); r.className = 'ib-h'; r.textContent = title; boardRows.push(r); if (boardEl) { boardEl.append(r); requestAnimationFrame(() => r.classList.add('in')); } };
    // 重拍：发现的那一下长在图形上——那块光亮一下、鼓一下，从那一点荡开两圈光；板书上同时长出那一行（不压暗屏幕，不飞大字）
    const ripples = []; let flashAt = -9;
    function punch(p, html, row) {
      void html; flashAt = now(); sfx.ding(1320, { gain: 0.07 });
      for (const [k, col] of [[0, GOLD], [0.28, BLUE]]) { const m = quiet(new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 72).rotateX(-Math.PI / 2), basic({ color: col, transparent: true, opacity: 0, depthWrite: false }))); m.position.set(p[0], 0.0006, -p[1]); m.userData.born = now() + k; ink.add(m); ripples.push(m); }
      later(650, () => row?.classList.add('in', 'fresh'));
    }
    const promptNow = () => {
      const n = lanterns.length;
      if (!S.circle) return n === 0 ? '拖着小船开一开：船上看两座灯塔，夹角是多少？' : n < 5 || arcSpread() < 1.0 ? '正好 40° 的地方，船会放下一面小旗。多开几个地方' : '点一下海面：这些小旗连起来是什么？';
      if (S.circle < 1) return '';
      if (!S.walked) return '把船开到圆上（靠近会吸住），沿着圆开一开';
      if (!S.buoy) return '点浮标：从圆心看，弧 BC 是多少度？';
      if (S.cut.length < 2) return '按住船边那个角，剪下来拖到浮标那里（剪两块）';
      if (S.proof && !S.proofDone) return '把这两个相等的底角拖到浮标那里';
      if (!S.proofDone) return '为什么是一半？开到让一座灯塔的视线正好穿过浮标的地方';
      if (!S.theorem) return S.caseMode ? '沿着圆开：圆心在角里面、在角外面，各看一次' : '沿着圆开到别处，点浮标：过船作一条直径';
      if (!S.answered) return '开进浅滩、开出浅滩，看船上的角怎么变';
      if (!S.family) return '点一下海面：别的角度都在哪儿？';
      return '';
    };
    let promptKey = '';
    const say = (txt, sub2 = '') => { capNow = [txt, sub2]; subtitle(); const pm = promptNow(); if (pm !== promptKey && ui?.status) { promptKey = pm; ui.status(pm); } };

    // ---- 灯塔：白身红箍，站在岸上 ----
    const tower = (P) => {
      const g = new THREE.Group(); g.position.copy(P3(P, LAND_H));
      const porcelain = lit({ color: 0xf7f4ee, roughness: 0.32 });
      const foot = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0046, 0.0052, 0.0028, 28), lit({ color: 0xe6e1d7, roughness: 0.9 }))); foot.position.y = 0.0014;
      const body = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0026, 0.0037, 0.034, 32), porcelain)); body.position.y = 0.0028 + 0.017;
      const gal = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0041, 0.0041, 0.0008, 28), lit({ color: 0xdcd7cd, roughness: 0.4 }))); gal.position.y = 0.0372;
      const lamp = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.0038, 20), lit({ color: 0xffe2a6, emissive: 0xffb340, emissiveIntensity: 2.2, roughness: 0.25 }))); lamp.position.y = 0.0395;
      const roof = solid(new THREE.Mesh(new THREE.ConeGeometry(0.0031, 0.0040, 28), porcelain)); roof.position.y = 0.0434;
      const tip = solid(new THREE.Mesh(new THREE.SphereGeometry(0.0006, 10, 8), porcelain)); tip.position.y = 0.0459;
      g.add(foot, body, gal, lamp, roof, tip); group.add(g); return g;
    };
    const LH = [tower(B0), tower(C0)];
    // ---- 浮标（圆心）：红色的罐形浮标；该点它的时候，水面上一圈橙色的环一闪一闪 ----
    const buoy = new THREE.Group();
    { const body = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0026, 0.0034, 0.006, 22), lit({ color: 0xf5f2ec, roughness: 0.35 }))); body.position.y = 0.0012;
      const band = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.00266, 0.00276, 0.0011, 22), lit({ color: 0xdcd7cd, roughness: 0.6 }))); band.position.y = 0.0026;
      const top = solid(new THREE.Mesh(new THREE.SphereGeometry(0.0017, 18, 12), lit({ color: 0xcfe9ff, emissive: 0x3d9cff, emissiveIntensity: 1.1, roughness: 0.2 }))); top.position.y = 0.0058;
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.0074, 0.0092, 48).rotateX(-Math.PI / 2), basic({ color: 0x3d9cff, transparent: true, opacity: 0, depthWrite: false })); ring.position.y = 0.0007; ring.raycast = () => {}; ring.userData.noFrame = true;
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.012, 16), basic({ transparent: true, opacity: 0, depthWrite: false })); pick.position.y = 0.006; pick.userData.noFrame = true;
      buoy.add(body, band, top, ring, pick); buoy.userData.halo = ring; }
    buoy.position.copy(P3(O)); group.add(buoy);
    // ---- 小船 ----
    const boat = new THREE.Group();
    { const Lh = 0.0125, Wd = 0.0056, Hh = 0.004, geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([-Lh, Hh, 0, Lh, Hh, 0, -Lh * 0.55, 0, Wd * 0.5, Lh * 0.55, 0, Wd * 0.5, -Lh * 0.55, 0, -Wd * 0.5, Lh * 0.55, 0, -Wd * 0.5], 3));
      geo.setIndex([0, 2, 3, 0, 3, 1, 0, 1, 5, 0, 5, 4, 2, 4, 5, 2, 5, 3]); geo.computeVertexNormals();
      const hull = solid(new THREE.Mesh(geo, lit({ color: 0xfbf9f4, roughness: 0.4, side: THREE.DoubleSide })));
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute([-Lh * 0.5, Hh, 0, Lh * 0.5, Hh, 0, 0.0008, Hh + 0.0112, 0], 3)); sg.computeVertexNormals();
      const sail = solid(new THREE.Mesh(sg, lit({ color: 0xfffdf8, roughness: 0.6, side: THREE.DoubleSide })));
      boat.add(hull, sail); }
    group.add(boat);

    // ================= 光、线、角、字 =================
    // 光带的样子：中间实、两边柔和地淡掉，像投在白模上的光
    const beamTex = tex(64, 4, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); for (const [o, a] of [[0, 0], [0.18, 0.18], [0.36, 0.75], [0.5, 1], [0.64, 0.75], [0.82, 0.18], [1, 0]]) gr.addColorStop(o, `rgba(255,255,255,${a})`); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    beamTex.colorSpace = THREE.NoColorSpace;
    const GOLD = 0xffa526, BLUE = 0x3d9cff;          // 两种光：圆周角那一族是金色，圆心角那一族是蓝色（场景、板书、刻度一致）
    // 视线：从船到两座灯塔的两条光（角的两边）
    const band = () => { const m = quiet(new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), basic({ color: GOLD, map: beamTex, transparent: true, depthWrite: false, opacity: 1, blending: THREE.AdditiveBlending }))); m.position.y = 0.0012; ink.add(m); return m; };
    const setBand = (m, P, Q, w) => { const d = sub(Q, P), l = Math.hypot(...d); m.position.x = (P[0] + Q[0]) / 2; m.position.z = -(P[1] + Q[1]) / 2; m.rotation.set(0, Math.atan2(d[1], d[0]) - Math.PI / 2, 0); m.scale.set(w, 1, Math.max(1e-4, l)); };
    const BAND = [band(), band()];
    // 细线（绳子、虚线、圆）：贴在水面上的细带子
    const line = (color, w, y, o = 1, dash = 0) => { const m = quiet(new THREE.Mesh(new THREE.BufferGeometry(), basic({ color, map: beamTex, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending }))); m.position.y = y; m.userData.w = w * 2.4; m.userData.dash = dash; ink.add(m); return m; };
    const setLine = (m, pts, closed = false) => {
      if (!pts || pts.length < 2) { m.visible = false; return; }
      const w = m.userData.w / 2, dash = m.userData.dash, out = [], uvs = [], P = closed ? [...pts, pts[0]] : pts;
      let acc = 0;
      const push = (p, q, n) => { out.push(p[0] + n[0], 0, -(p[1] + n[1]), p[0] - n[0], 0, -(p[1] - n[1]), q[0] + n[0], 0, -(q[1] + n[1]), q[0] + n[0], 0, -(q[1] + n[1]), p[0] - n[0], 0, -(p[1] - n[1]), q[0] - n[0], 0, -(q[1] - n[1])); uvs.push(0, 0.5, 1, 0.5, 0, 0.5, 0, 0.5, 1, 0.5, 1, 0.5); };
      for (let i = 0; i < P.length - 1; i++) {
        const a = P[i], b = P[i + 1], d = sub(b, a), l = Math.hypot(...d); if (l < 1e-7) continue;
        const n = [(-d[1] / l) * w, (d[0] / l) * w];
        if (!dash) push(a, b, n);
        else { let t = 0; while (t < l - 1e-9) { const ph = (acc + t) % (dash * 2), on = ph < dash, step = Math.max(1e-6, Math.min(l - t, on ? dash - ph : dash * 2 - ph)); if (on) push(add(a, mul(d, t / l)), add(a, mul(d, (t + step) / l)), n); t += step; } acc += l; }
      }
      m.geometry.dispose(); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); m.geometry = g; m.visible = out.length > 0;
    };
    const L = {
      circle: line(GOLD, 0.001, 0.0016, 0.95, 0.003), OB: line(BLUE, 0.0009, 0.0015, 1), OC: line(BLUE, 0.0009, 0.0015, 1),
      rope1: line(0xa67bff, 0.0012, 0.0019), rope2: line(0xa67bff, 0.0012, 0.0019), tick1: line(0xa67bff, 0.0012, 0.002), tick2: line(0xa67bff, 0.0012, 0.002),
      diam: line(0x8d93a0, 0.0009, 0.0021, 0.95, 0.0025), ext: line(GOLD, 0.001, 0.0018, 1, 0.0028), ext2: line(GOLD, 0.001, 0.0018, 1),
      arcBC: line(BLUE, 0.0014, 0.0017, 1),          // 两座灯塔之间那段弧（在岸上）：圆周角、圆心角对着的就是它
    };
    // 扇形（一块光）
    const fanM = (color, opacity, y, blend = THREE.NormalBlending) => { const m = new THREE.Mesh(new THREE.BufferGeometry(), basic({ color, transparent: true, opacity, depthWrite: false, blending: blend, side: THREE.DoubleSide })); m.position.y = y; m.userData.noFrame = true; ink.add(m); m.visible = false; return m; };
    const setFan = (m, apex, a0, w, r) => { const n = Math.max(6, Math.ceil(Math.abs(w) / 0.05)), pos = []; for (let i = 0; i < n; i++) { const t0 = a0 + (w * i) / n, t1 = a0 + (w * (i + 1)) / n; pos.push(0, 0, 0, Math.cos(t0) * r, 0, -Math.sin(t0) * r, Math.cos(t1) * r, 0, -Math.sin(t1) * r); } m.geometry.dispose(); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); m.geometry = g; m.position.x = apex[0]; m.position.z = -apex[1]; m.visible = true; };
    const F = { ship: fanM(GOLD, 0.38, 0.0013, THREE.AdditiveBlending), buoy: fanM(BLUE, 0.34, 0.0012, THREE.AdditiveBlending), sub1: fanM(0xffd08a, 0.55, 0.0017), sub2: fanM(0x9fd0ff, 0.55, 0.0016), q: fanM(GOLD, 0.34, 0.0013), x: fanM(0xff8a3d, 0.5, 0.0017) };
    for (const k in F) F[k].raycast = () => {};
    // 能拿起来拖的光扇（剪下来的、证明里的两个底角）
    const chips = [0xff9a1a, 0xffc35c].map((c) => fanM(c, 0.92, 0.0024));
    // 字：朝着镜头的牌子（先量字宽再画）
    const measure = (font, txt) => { const g = document.createElement('canvas').getContext('2d'); g.font = font; return g.measureText(txt).width; };
    // 字：和课本插图一样——字母用斜体，度数、名称用宋体；白色描边垫底，压在水面、线上也认得出
    const labTex = (txt, col, px = 64) => { const f = /^[A-Z]$/.test(txt) ? `italic 500 ${px * 1.08}px "Times New Roman",serif` : `600 ${px}px "Times New Roman","Songti SC","STSong",serif`; return tex(Math.ceil(measure(f, txt)) + 40, Math.round(px * 1.5), (g, w, h) => { g.font = f; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = px * 0.1; g.strokeStyle = 'rgba(255,253,248,0.8)'; g.strokeText(txt, w / 2, h / 2 + 2); g.fillStyle = col; g.fillText(txt, w / 2, h / 2 + 2); }); };
    const label = (hgt) => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }))); sp.renderOrder = 20; sp.userData.h = hgt; sp.userData.k = ''; ink.add(sp); sp.visible = false; return sp; };
    const setLabel = (sp, txt, col, p, y = 0.008) => { if (!txt) { sp.visible = false; return; } const k = txt + col; if (sp.userData.k !== k) { sp.userData.k = k; const t = labTex(txt, col); sp.material.map?.dispose?.(); sp.material.map = t; sp.material.needsUpdate = true; sp.scale.set((sp.userData.h * t.image.width) / t.image.height, sp.userData.h, 1); } sp.position.set(p[0], y, -p[1]); sp.visible = true; };
    const LB = { ship: label(0.013), buoy: label(0.011), q: label(0.009), a: label(0.0095), o: label(0.0095), b: label(0.0095), c: label(0.0095), d: label(0.0095), arc: label(0.0082), w0: label(0.0105), w1: label(0.0105) };
    // 海面上的批注（船长在海图上写的）：躺在水面上的手写字
    const NF = '600 46px "Kaiti SC","STKaiti",serif';
    const noteTex = (txt) => tex(Math.ceil(measure(NF, txt)) + 48, 76, (g, w, h) => { g.font = NF; g.textBaseline = 'middle'; g.shadowColor = 'rgba(4,14,28,0.95)'; g.shadowBlur = 12; g.fillStyle = 'rgba(248,236,206,0.96)'; g.fillText(txt, 24, h / 2 + 2); g.shadowBlur = 4; g.fillText(txt, 24, h / 2 + 2); });
    const notes = []; let dblNote = null;
    const note = () => ({ userData: {} });          // 以前写在水面上的批注：都改写进板书了
    const noteOld = (txt, p) => { const t = noteTex(txt), hgt = 0.0084; const m = quiet(new THREE.Mesh(new THREE.PlaneGeometry((hgt * t.image.width) / t.image.height, hgt).rotateX(-Math.PI / 2), basic({ map: t, transparent: true, depthWrite: false, opacity: 0 }))); m.position.set(p[0], 0.0021, -p[1]); m.userData.born = now(); m.userData.txt = txt; group.add(m); notes.push(m); return m; };
    // 河灯
    const lanterns = [];
    const flagMat = lit({ color: 0xffb13d, emissive: 0xff9a1f, emissiveIntensity: 0.35, roughness: 0.5, side: THREE.DoubleSide }), poleMat = lit({ color: 0xd8d2c6, roughness: 0.6 }), floatMat = lit({ color: 0xf7f4ee, roughness: 0.4 });
    const flagGeo = new THREE.BufferGeometry(); flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.0013, 0, 0, -0.0013, 0, 0.0034, 0, 0], 3)); flagGeo.computeVertexNormals();
    const dropLantern = (p) => {
      if (lanterns.some((l) => dist(l.p, p) < 0.011)) return;
      const g = new THREE.Group(), body = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0018, 0.0022, 14), floatMat)); body.position.y = 0.0006;
      const pole = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0002, 0.0002, 0.0072, 6), poleMat)); pole.position.y = 0.0044;
      const flag = solid(new THREE.Mesh(flagGeo, flagMat)); flag.position.set(0.0002, 0.0068, 0); flag.rotation.y = Math.atan2(p[1] - O[1], p[0] - O[0]);
      g.add(body, pole, flag); g.position.copy(P3(p)); g.userData.born = now(); group.add(g); lanterns.push({ p, g, body });
      sfx.ding(1180 + Math.random() * 160, { gain: 0.035, decay: 0.6 });
    };
    // 整片海的等角线（点海面才出来）：着色器算每一点“看两座灯塔是多少度”，每 10° 一条
    const contour = quiet(new THREE.Mesh(new THREE.PlaneGeometry(seaW, seaD).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { B: { value: new THREE.Vector2(B0[0], -B0[1]) }, C: { value: new THREE.Vector2(C0[0], -C0[1]) }, th0: { value: DANGER * DEG }, k: { value: 0 }, capTop: { value: CAP_TOP }, inv: { value: new THREE.Matrix4() } },
      vertexShader: 'uniform mat4 inv; varying vec2 w; void main(){ vec4 p = modelMatrix * vec4(position, 1.); w = (inv * p).xz; gl_Position = projectionMatrix * viewMatrix * p; }',
      fragmentShader: `uniform vec2 B; uniform vec2 C; uniform float th0; uniform float k; uniform float capTop; varying vec2 w;
        void main(){
          vec2 a = normalize(B - w), b = normalize(C - w);
          float d = degrees(acos(clamp(dot(a, b), -1., 1.)));
          float fw = fwidth(d) + 1e-4;
          float f = abs(fract(d / 10. + .5) - .5) * 10.;
          float ln = 1. - smoothstep(0., fw * 1.3, f);
          float dg = 1. - smoothstep(0., fw * 2.2, abs(d - th0));
          float rt = 1. - smoothstep(0., fw * 2.2, abs(d - 90.));
          vec3 col = vec3(1., .7, .28) * (ln * .5 + dg * 1.1) + vec3(.35, .65, 1.) * rt * 1.3;
          gl_FragColor = vec4(col, k * smoothstep(capTop - .01, capTop + .004, -w.y));
        }` })));
    contour.position.copy(sea.position).setY(0.0003); contour.visible = false; ink.add(contour);
    const conLabs = [20, 30, 60, 90].map(() => label(0.0085)), conDanger = label(0.0095);
    // 等角线上放度数的地方：那一圈在海里、偏左下的一点
    const conAt = (d) => { const t = (d * Math.PI) / 180, r = 0.06 / Math.sin(t), c = [0, 0.05 - 0.06 / Math.tan(t)]; for (const a of [-1.7, -2.0, -2.3, -2.6, -2.9]) { const p = [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]; if (inSea(p) && p[1] > CAP_TOP + 0.006) return p; } return null; };

    // ================= 状态 =================
    const fresh = () => ({ ship: [0.13, -0.112], head: Math.PI * 0.8, mode: 'chart', beat: '', call: '', circle: 0, reveal: 0, walked: false, buoy: 0, cut: [], proof: 0, proofDone: false, cs: null, caseDone: '', theorem: false, io: {}, ioNow: '', ioAt: 0, movedAt: 0, answered: false, family: 0, done: false, ghosts: [], panelLater: false });
    let S = fresh();
    const theta = (p = S.ship) => angAt(p, B0, C0);
    const zone = () => { const r = dist(S.ship, O); return r < R - 0.0012 ? 'in' : r > R + 0.0012 ? 'out' : 'on'; };
    const tOn = (p) => { let t = dirO(p); while (t < AB - 1e-9) t += TAU; while (t > AB + TAU) t -= TAU; return t; };          // 船在圆上走到哪儿（从灯塔 B 那头量起）
    const nm = (P) => (P === B0 ? 'B' : 'C');
    const diamEnd = () => sub(mul(O, 2), S.ship);          // 过船的直径的另一头 D
    const arcSpread = () => { const ts = lanterns.map((l) => dirO(l.p)).sort((a, b) => a - b); let gap = 0; for (let i = 0; i < ts.length; i++) gap = Math.max(gap, (ts[(i + 1) % ts.length] - ts[i] + TAU) % TAU); return ts.length < 2 ? 0 : TAU - gap; };

    // ================= 光写的字：写在图形下面那一条水上，像投影打在模型上 =================
    const CAP_V = SEA.v0 + 0.0255, CAP_W = 0.31;          // CAP_TOP 在文件开头
    // 字是印在模型上的墨色（不是发光的）：白模上亮字一叠加就发白刺眼；墨色字底下垫一圈很淡的亮边，压在波纹上也清楚
    const capMesh = quiet(new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), basic({ transparent: true, depthWrite: false, opacity: 0 })));
    capMesh.position.set(0, 0.0009, -CAP_V); capMesh.renderOrder = 6; capMesh.visible = false; ink.add(capMesh);
    const cap = { key: '', born: -9, out: 1e9, next: null };
    const ASK = '#26231f', GOLDTXT = '#a4520a', BLUETXT = '#1c5aa3';
    const capTex2 = (big, small, col) => tex(2048, 300, (g, W) => {
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      const fitF = (txt, px, weight, maxW) => { for (let f = px; f >= 28; f -= 4) { g.font = `${weight} ${f}px "Songti SC","STSong","Times New Roman",serif`; if (g.measureText(txt).width <= maxW) return; } };
      const inked = (txt, y, fill, halo) => { g.shadowColor = 'rgba(246,250,252,0.9)'; g.shadowBlur = halo; g.lineWidth = halo * 0.7; g.strokeStyle = 'rgba(246,250,252,0.42)'; g.strokeText(txt, W / 2, y); g.shadowBlur = 0; g.fillStyle = fill; g.fillText(txt, W / 2, y); };
      fitF(big, 112, 700, W - 90); inked(big, 108, col, 16);
      if (small) { fitF(small, 60, 500, W - 140); inked(small, 226, '#3b3934', 11); }
    });
    // 换一句：旧的先淡出，再写新的
    function lightText(big, small = '', col = ASK) {
      const key = `${big}|${small}|${col}`; if (key === cap.key) return; cap.key = key;
      capNow = [big, small]; if (ui?.status) ui.status(small ? `${big}　${small}` : big);
      const show = () => { capMesh.material.map?.dispose?.(); capMesh.material.map = capTex2(big, small, col); capMesh.material.needsUpdate = true; capMesh.scale.set(CAP_W, 1, (CAP_W * 300) / 2048); capMesh.visible = true; cap.born = now(); cap.out = 1e9; };
      if (capMesh.visible && now() - cap.born > 0.2) { cap.out = now(); cap.next = show; } else show();
      subtitle();
    }

    // ================= 画 =================
    const bis = (p, q0, q1, r) => { const u0 = unit(sub(q0, p)), u1 = unit(sub(q1, p)), s2 = add(u0, u1); return add(p, mul(Math.hypot(...s2) < 1e-3 ? [-u0[1], u0[0]] : unit(s2), r)); };
    // 一路留下的“同一个角”：船沿弧开过的地方，各留一块一样大的金色光扇
    const ghostFans = Array.from({ length: 9 }, () => fanM(GOLD, 0.0, 0.0011, THREE.AdditiveBlending));
    // 拆成两块的光扇（情况（2）（3））：在船那里，拖到圆心变成两倍
    const subs = [fanM(0xff9a1a, 0.92, 0.0026), fanM(0xffd27a, 0.92, 0.0026)];
    // 90° 那一圈上的一点：两条光连到两座灯塔，带一个直角记号
    const R90 = { a: line(BLUE, 0.0009, 0.0018, 1), b: line(BLUE, 0.0009, 0.0018, 1), m: line(BLUE, 0.0008, 0.0019, 1) };
    // 叫你动手的那一圈光
    const callRing = quiet(new THREE.Mesh(new THREE.RingGeometry(0.0082, 0.0102, 48).rotateX(-Math.PI / 2), basic({ color: 0xfff1c8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })));
    callRing.position.y = 0.0016; ink.add(callRing);
    // 浅滩一开始藏在水下看不见：一层和深水一样颜色的“水色”盖着，揭开时淡掉
    const murk = quiet(new THREE.Mesh(new THREE.PlaneGeometry(seaW, seaD).rotateX(-Math.PI / 2), basic({ color: 0x8fa8b3, transparent: true, opacity: 0.92, depthWrite: false })));
    murk.position.set(uc, -0.0006, -vc); murk.renderOrder = -2; group.add(murk);

    function layout() {
      const A = S.ship, th = theta(), z = zone(), lt = '#1f2a3a';
      boat.position.copy(P3(A)); boat.rotation.y = S.head;
      setBand(BAND[0], B0, A, 0.0034); setBand(BAND[1], C0, A, 0.0034);
      setFan(F.ship, A, ccwStart(A, B0, C0), th, 0.018);
      setLabel(LB.ship, fmt(th), z === 'in' && S.circle >= 1 ? '#c2352a' : z === 'out' && S.circle >= 1 ? '#2e7d4f' : '#c27412', bis(A, B0, C0, 0.03), 0.01);
      setLine(L.circle, S.circle > 0 ? arcPts(O, R, AB, AB + (AC - AB) * easeOut(S.circle), 160) : null);
      const bk = S.buoy;
      setLine(L.OB, bk ? [O, B0] : null); setLine(L.OC, bk ? [O, C0] : null);
      if (bk) { setFan(F.buoy, O, ccwStart(O, B0, C0), central(), 0.028); setLabel(LB.buoy, fmt(central()), '#2470c2', bis(O, B0, C0, 0.036), 0.01); } else { F.buoy.visible = false; LB.buoy.visible = false; }
      const pf = S.proof;
      if (pf) {
        setLine(L.rope1, [O, A]); setLine(L.rope2, [O, pf.other]);
        const tick = (p, q) => { const m = mid(p, q), n = mul(unit([-(q[1] - p[1]), q[0] - p[0]]), 0.003); return [sub(m, n), add(m, n)]; };
        setLine(L.tick1, tick(O, A)); setLine(L.tick2, tick(O, pf.other));
      } else { for (const k of ['rope1', 'rope2', 'tick1', 'tick2']) setLine(L[k], null); }
      if (S.walked) { setLabel(LB.b, 'B', lt, add(B0, [-0.011, -0.006]), 0.007); setLabel(LB.c, 'C', lt, add(C0, [0.011, -0.006]), 0.007); setLine(L.arcBC, arcPts(O, R, dirO(C0), dirO(B0), 48)); setLabel(LB.arc, S.cs ? '' : '弧 BC', '#2470c2', [0, O[1] + R + 0.0075], 0.007); }
      else { LB.b.visible = LB.c.visible = LB.arc.visible = false; setLine(L.arcBC, null); }
      setLabel(LB.a, S.walked && z === 'on' ? 'A' : S.beat === 'inout' && z !== 'on' ? 'P' : '', lt, add(A, mul(unit(sub(A, O)), 0.013)), 0.006);
      setLabel(LB.o, S.buoy ? 'O' : '', lt, add(O, [0.007, -0.008]), 0.006);
      // 情况（2）（3）：过船的直径 AD
      if (S.cs) { const D = S.cs.D; setLine(L.diam, [S.cs.A, D]); setLabel(LB.d, 'D', lt, add(D, mul(unit(sub(D, O)), 0.011)), 0.006); }
      else { setLine(L.diam, null); LB.d.visible = false; }
      // 第 14 题：圈里 / 圈外——延长一座灯塔到船的线，交圆于 Q
      const sh = (S.beat === 'inout' || S.answered) && z !== 'on' ? shoalFig() : null;
      if (sh) {
        setLine(L.ext, [sh.P, sh.far]); setLine(L.ext2, [sh.Q, sh.R2]);
        setFan(F.q, sh.Q, ccwStart(sh.Q, sh.P, sh.R2), angAt(sh.Q, sh.P, sh.R2), 0.012); setFan(F.x, sh.R2, ccwStart(sh.R2, sh.Q, A), angAt(sh.R2, sh.Q, A), 0.013);
        setLabel(LB.q, `Q ${fmt(DANGER)}`, '#c27412', add(sh.Q, mul(unit(sub(sh.Q, O)), 0.013)), 0.006);
      } else { setLine(L.ext, null); setLine(L.ext2, null); F.q.visible = F.x.visible = false; LB.q.visible = false; }
      // 等角线
      contour.visible = S.family > 0; contour.material.uniforms.k.value = easeOut(S.family);
      [20, 30, 60, 90].forEach((d, i) => { const p = S.family > 0.5 ? conAt(d) : null; if (p) setLabel(conLabs[i], `${d}°`, d === 90 ? '#2470c2' : '#b0690f', p, 0.006); else conLabs[i].visible = false; });
      if (S.family > 0.5) setLabel(conDanger, `危险角 ${fmt(DANGER)}`, '#b0690f', [O[0] - R - 0.024, O[1] - 0.01], 0.006); else conDanger.visible = false;
      if (S.family >= 1) {          // 90° 那一圈上的一点 P90：连到 B、C，直角
        const P90 = [0.06 * Math.cos(-Math.PI / 2 - 0.55), 0.05 + 0.06 * Math.sin(-Math.PI / 2 - 0.55)], u1 = unit(sub(B0, P90)), u2 = unit(sub(C0, P90)), s = 0.0055;
        setLine(R90.a, [P90, B0]); setLine(R90.b, [P90, C0]); setLine(R90.m, [add(P90, mul(u1, s)), add(P90, add(mul(u1, s), mul(u2, s))), add(P90, mul(u2, s))]);
      } else { setLine(R90.a, null); setLine(R90.b, null); setLine(R90.m, null); }
      chips.forEach((c, i) => { const u = c.userData, on = c.visible && u?.pa0 != null && S.cut.length === 2 && !S.proof && held < 0; if (on) setLabel(LB['w' + i], fmt(u.w), '#c27412', add(O, mul([Math.cos(u.pa0 + u.w / 2), Math.sin(u.pa0 + u.w / 2)], 0.019)), 0.006); else LB['w' + i].visible = false; });
      K.ship.position.copy(P3(A, 0.004)); K.cut.position.copy(P3(bis(A, B0, C0, 0.012), 0.0042));
      SK.forEach((k, i) => { const p = S.cs?.pieces[i]; if (p && !S.cs.placed.includes(i)) { const a = p.a0 + p.w / 2, r = S.cs.kind === 'out' ? (p.w > S.cs.pieces[1 - i].w ? 0.0135 : 0.0058) : 0.01; k.position.copy(P3(add(S.cs.A, mul([Math.cos(a), Math.sin(a)], r)), 0.0045)); } else k.position.set(0, -1, 0); });
      if (S.mode === 'deck') {
        for (const sp of [...Object.values(LB), ...conLabs, conDanger]) sp.visible = false;
        for (const m of [F.ship, F.buoy, F.sub1, F.sub2, F.q, F.x, L.OB, L.OC, L.rope1, L.rope2, L.tick1, L.tick2, L.diam, L.ext, L.ext2, L.arcBC, ...chips, ...subs, ...ghostFans, capMesh]) m.visible = false;
      }
    }
    function shoalFig() {          // 延长 P（一座灯塔）到船的线，和圆的另一个交点 Q；R2 是另一座灯塔
      const A = S.ship, inside = dist(A, O) < R;
      for (const [P, R2] of [[B0, C0], [C0, B0]]) {
        const dir = unit(sub(A, P)), t = -2 * ((P[0] - O[0]) * dir[0] + (P[1] - O[1]) * dir[1]);
        if (t < 0.004) continue;
        if (!inside && t > dist(A, P) - 0.002) continue;
        const Q = add(P, mul(dir, t)); if (Q[1] > SEA.v1 - 0.006) continue;
        return { P, R2, Q, far: inside ? Q : A, inside };
      }
      return null;
    }
    const placeGhost = (t) => { const A = onCirc(t); S.ghosts.push({ A, born: now() }); const i = S.ghosts.length - 1; if (i < ghostFans.length) setFan(ghostFans[i], A, ccwStart(A, B0, C0), theta(A), 0.012); };
    const clearGhosts = () => { S.ghosts = []; ghostFans.forEach((m) => (m.visible = false)); };

    // ================= 动手 =================
    const K = { ship: new THREE.Mesh(new THREE.CircleGeometry(0.011, 20).rotateX(-Math.PI / 2), basic({ visible: false })), cut: new THREE.Mesh(new THREE.CircleGeometry(0.0085, 16).rotateX(-Math.PI / 2), basic({ visible: false })) };
    for (const k in K) { K[k].userData.pick = true; K[k].userData.noFrame = true; group.add(K[k]); }
    const SK = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.0055, 16).rotateX(-Math.PI / 2), basic({ visible: false })); m.userData.pick = true; m.userData.noFrame = true; group.add(m); return m; });
    const uv = (p) => [p.x, -p.z];
    let userTouched = 0;
    function moveShip(q) {
      if (!inSea(q)) q = [clamp(q[0], SEA.u0 + 0.009, SEA.u1 - 0.009), clamp(q[1], SEA.v0 + 0.009, SEA.v1 - 0.013)];
      q = [q[0], Math.max(q[1], CAP_TOP)];          // 字写在圆下面那条水上，船不开进去
      if (S.circle >= 1 && S.beat !== 'inout' && Math.abs(dist(q, O) - R) < 0.005) q = onCirc(dirO(q));          // 圆画出来以后：靠近了就吸在圆上（开进开出浅滩那一步不吸，好开进去）
      const prev = S.ship, mv = sub(q, prev);
      if (Math.hypot(...mv) > 1e-5) S.head = lerp(S.head, S.head + wrap(Math.atan2(mv[1], mv[0]) - S.head), 0.3);
      S.ship = q; S.movedAt = now();
      // 每次正好等于危险角（两次位置之间跨过去的那一点），船就放下一面小旗：二分找到那一点，它一定落在圆上
      const s0 = theta(prev) - DANGER, s1 = theta() - DANGER;
      if (!S.circle && s0 * s1 <= 0 && Math.abs(s0 - s1) > 1e-7) { let a = prev, b = q; for (let i = 0; i < 26; i++) { const m = mid(a, b); if ((theta(m) - DANGER) * s0 <= 0) b = m; else a = m; } const p = mid(a, b); if (p[1] < SEA.v1 - 0.004) dropLantern(p); }
      if (S.beat === 'inout') { const z = zone(); if (z !== 'on') { if (z !== S.ioNow) { S.ioNow = z; S.ioAt = now(); } S.io[z] = true; } inoutText(); }
      layout(); subtitle();
    }
    // 开进开出浅滩：写下这时候的道理（延长交圆于 Q，三角形的外角）
    function inoutText() {
      if (S.answered) return;
      const z = zone(), d = fmt(DANGER), sh = z !== 'on' ? shoalFig() : null;
      if (z === 'on') return lightText(`在浅滩边上：正好 ${d}`, '开进浅滩、再开出来看看');
      if (z === 'in') return lightText(`开进浅滩：∠P 比 ${d} 大`, sh ? `延长 ${nm(sh.P)}P 交圆于 Q：∠P 是三角形的外角，比圆上的 ∠Q = ${d} 大` : `比圆上的 ${d} 大`);
      lightText(`在浅滩外：∠P 比 ${d} 小`, sh ? `圆上的 ∠Q = ${d} 是三角形的外角，比 ∠P 大` : `比圆上的 ${d} 小`);
    }
    // 剪光扇、拖底角：放到圆心附近就拼进圆心角
    let held = -1, heldSub = -1;
    function cutDown() {
      if (S.call !== 'cut' || S.cut.length >= 2 || held >= 0 || zone() !== 'on') return false;
      const i = S.cut.length, A = S.ship, w = theta();
      setFan(chips[i], A, ccwStart(A, B0, C0), w, 0.018); chips[i].userData = { home: A, a0: ccwStart(A, B0, C0), w, kind: 'cut' }; chips[i].position.y = 0.006; chips[i].scale.setScalar(1);
      held = i; sfx.whoosh({ dur: 0.18, freq: 2600, gain: 0.05 }); return true;
    }
    function chipDown(i) { if (S.call === 'base' && S.proof && !S.proofDone && chips[i].visible && !S.proof.placed.includes(i)) { held = i; return true; } return false; }
    function chipMove(q) { if (held < 0) return; const c = chips[held]; c.position.x = q[0]; c.position.z = -q[1]; c.position.y = 0.006; }
    function chipUp() {
      if (held < 0) return; const i = held, c = chips[i], u = c.userData, q = [c.position.x, -c.position.z]; held = -1;
      if (dist(q, O) > 0.03) { c.position.set(u.home[0], 0.0024, -u.home[1]); if (u.kind === 'cut') c.visible = false; return; }
      const list = u.kind === 'cut' ? S.cut : S.proof.placed, prev = list.reduce((s2, k) => s2 + chips[k].userData.w, 0);
      setFan(c, O, ccwStart(O, B0, C0) + prev, u.w, 0.028); c.position.y = 0.0026; u.pa0 = ccwStart(O, B0, C0) + prev;
      list.push(i); sfx.clink({ freq: 1600, gain: 0.05 });
      if (list.length === 2) {
        if (u.kind === 'cut') { board.h('探究'); const row = board(`<span class="n">4</span>发现：两个圆周角正好拼满圆心角，<i>∠BAC</i> = ½<i>∠BOC</i>（<span class="ia">${fmt(DANGER)}</span> + <span class="ia">${fmt(DANGER)}</span> = <span class="ca">${fmt(central())}</span>）`, true); punch(O, '', row); }
        else { S.proofDone = true; board.h('证明'); const x = nm(S.proof.other), row = board(`<span class="n">5</span>（1）圆心在边上：<i>OA</i> = <i>O${x}</i> ⇒ <i>∠A</i> = <i>∠${x}</i>；<i>∠BOC</i> = <i>∠A</i> + <i>∠${x}</i> = 2<i>∠A</i>`, true); punch(O, '', row); }
      }
      layout();
    }
    // 情况（2）（3）：拆开的两块，拖到圆心就“张开成两倍”
    function setupCase(kind) {
      const A = S.ship, D = diamEnd();
      const pieces = kind === 'in'
        ? [{ P: B0, nm: 'BAD' }, { P: C0, nm: 'DAC' }]
        : (() => { const big = angAt(A, D, C0) > angAt(A, D, B0) ? C0 : B0, small = big === C0 ? B0 : C0; return [{ P: big, nm: `DA${nm(big)}` }, { P: small, nm: `DA${nm(small)}` }]; })();
      for (const p of pieces) { p.a0 = ccwStart(A, p.P, D); p.w = angAt(A, p.P, D); p.ta0 = ccwStart(O, p.P, D); p.tw = angAt(O, p.P, D); }
      S.cs = { kind, A, D, pieces, placed: [], anim: [] };
      pieces.forEach((p, i) => { setFan(subs[i], A, p.a0, p.w, 0.016); subs[i].position.y = 0.0026; subs[i].userData = { home: A, i }; subs[i].scale.setScalar(1); subs[i].material.opacity = 0.92; });
      layout();
    }
    function subDown(i) { if (S.call === 'sub' && S.cs && !S.cs.placed.includes(i) && heldSub < 0) { heldSub = i; return true; } return false; }
    function subMove(q) { if (heldSub < 0) return; const c = subs[heldSub]; c.position.x = q[0]; c.position.z = -q[1]; c.position.y = 0.006; }
    function subUp() {
      if (heldSub < 0) return; const i = heldSub, c = subs[i], p = S.cs.pieces[i], q = [c.position.x, -c.position.z]; heldSub = -1;
      if (dist(q, O) > 0.03) { c.position.set(S.cs.A[0], 0.0026, -S.cs.A[1]); return; }
      c.position.set(O[0], 0.0026 + 0.0002 * i, -O[1]); S.cs.placed.push(i); S.cs.anim.push({ i, t0: now() }); sfx.clink({ freq: 1400 + 200 * i, gain: 0.05 });
      if (S.cs.placed.length === 2) later(900, () => {
        if (!S.cs) return;
        if (S.cs.kind === 'out') { const big = subs[0]; setFan(big, O, ccwStart(O, B0, C0), central(), 0.026); S.cs.cancel = now(); }          // 大的减去小的：重叠的那块消掉，剩下的正好是 ∠BOC
        const k = S.cs.kind, [p0, p1] = S.cs.pieces;
        const row = board(k === 'in' ? `<span class="n">6</span>（2）圆心在内部：作直径 <i>AD</i>，<i>∠BAC</i> = <i>∠${p0.nm}</i> + <i>∠${p1.nm}</i> = ½<i>∠BOC</i>` : `<span class="n">7</span>（3）圆心在外部：作直径 <i>AD</i>，<i>∠BAC</i> = <i>∠${p0.nm}</i> − <i>∠${p1.nm}</i> = ½<i>∠BOC</i>`, true);
        punch(O, '', row); S.caseDone = k;
      });
    }
    // 点：海面（小旗连成什么）、浮标（不动的那一点）
    const grow = (key, dur, done) => { const t0 = now(); const tick = () => { if (dead) return; S[key] = Math.min(1, (now() - t0) / dur); layout(); if (S[key] < 1) requestAnimationFrame(tick); else done?.(); }; tick(); };
    function tapSea() { if (S.call !== 'sea' || S.circle) return; S.call = ''; sfx.whoosh({ dur: 0.6, freq: 900, gain: 0.04 }); grow('circle', 1.6); }
    function tapBuoy() { if (S.call !== 'buoy' || S.buoy) return; S.call = ''; S.buoy = 1; sfx.clink({ freq: 1300, gain: 0.05 }); board.h('概念'); board(`<span class="n">3</span><b>圆心角</b>：<i>∠BOC</i> = <span class="ca">${fmt(central())}</span>，和圆周角 <i>∠BAC</i> 对着同一条弧 <i>BC</i>`); punch(O, '', null); layout(); }
    const openPanel = () => { ui?.go?.(2); ui?.fold?.(false); };
    const panelBack = () => { if (S.panelLater) { S.panelLater = false; later(700, openPanel); } };

    // ================= 主线：场景带着走——先演给你看，停在一个问题上，再把关键那一下交给你 =================
    let runId = 0, speed = 1;
    const wait = (ms, id) => new Promise((r) => setTimeout(() => r(!dead && id === runId), ms / speed));
    const until = async (cond, id) => { while (!dead && id === runId && !cond()) await new Promise((r) => setTimeout(r, 100)); return !dead && id === runId; };
    const along = (pts, k) => { let L2 = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = dist(pts[i - 1], pts[i]); seg.push(l); L2 += l; } let s = k * L2; for (let i = 0; i < seg.length; i++) { if (s <= seg[i] || i === seg.length - 1) return add(pts[i], mul(sub(pts[i + 1], pts[i]), seg[i] ? Math.min(1, s / seg[i]) : 1)); s -= seg[i]; } return pts[pts.length - 1]; };
    const ease2 = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
    // 船自己开（演给你看）；学生一拿船就停下来
    const sail = (pts, ms, id, each) => new Promise((res) => { const t0 = now(), touch0 = userTouched; const step = () => { if (dead || id !== runId || userTouched !== touch0) return res(); const k = Math.min(1, ((now() - t0) * 1000 * speed) / ms); moveShip(along(pts, ease2(k))); each?.(k); if (k < 1) requestAnimationFrame(step); else res(); }; step(); });
    const arcPath = (t0, t1, n = 40) => Array.from({ length: n + 1 }, (_, i) => onCirc(t0 + ((t1 - t0) * i) / n));
    const d40 = fmt(DANGER), d80 = () => fmt(central());
    async function mainLine() {
      const id = ++runId;
      // 一、开场：船自己开一段，两道光跟着转，夹角在变；正好 40° 的地方放下一面小旗
      S.beat = 'open'; S.call = '';
      lightText('船怎么知道自己进没进浅滩？', '浅滩在水下，船上看不见，只看得见岸上的两座灯塔');
      if (!(await wait(1600, id))) return;
      await sail([[0.13, -0.112], [0.085, -0.122], [0.03, -0.1], [0.01, -0.07]], 5200, id);
      if (!(await wait(500, id))) return;
      lightText('拖着小船开一开', `船上看两座灯塔正好 ${d40} 的地方，会放下一面小旗`); S.call = 'ship';
      if (!(await until(() => lanterns.length >= 5 && arcSpread() >= 1.0, id))) return;
      // 二、小旗连成什么：揭开水面，量出来的弧正好是浅滩的边
      S.beat = 'arc'; S.call = 'sea';
      lightText('这些小旗连起来是什么？', '点一下海面');
      if (!(await until(() => S.circle > 0, id))) return;
      if (!(await wait(1800, id))) return;
      grow('reveal', 1.4); sfx.whoosh({ dur: 1.0, freq: 500, gain: 0.04 });
      if (!(await wait(1500, id))) return;
      punch(onCirc(-2.35), '', null);
      board.h('探究'); board(`<span class="n">1</span>船上看两座灯塔正好 ${d40} 的点，连成一段过两座灯塔的圆弧——正好是浅滩的边`);
      lightText(`${d40} 的点，连成一段过两座灯塔的圆弧`, '它正好是浅滩的边：船上看两座灯塔正好 40°，就在浅滩边上', GOLDTXT);
      if (!(await wait(5200, id))) return;
      // 三、沿着这段弧开：角度不变（圆周角）
      S.beat = 'walk'; S.walked = true; layout();
      lightText('沿着这段弧开，船上看到的角会变吗？');
      const ts = tOn(S.ship), tStart = Math.abs(tOn(onCirc(-2.5)) - ts) < Math.abs(tOn(onCirc(-0.65)) - ts) ? -2.5 : -0.65;
      await sail([S.ship, onCirc(tStart)], 1400, id);
      { let next = 0; const ta = tStart, tb = tStart < -1.5 ? -0.65 : -2.5; await sail(arcPath(ta, tb), 6200, id, (k) => { if (k >= next) { placeGhost(ta + (tb - ta) * k); next += 0.16; } }); }
      if (!(await wait(600, id))) return;
      punch(S.ship, '', null);
      board.h('概念'); board(`<span class="n">2</span><b>圆周角</b>：顶点在圆上，并且两边都与圆相交的角。船在这段弧上，<i>∠BAC</i> 处处是 ${d40}`);
      lightText('顶点在圆上、两边都和圆相交的角，叫圆周角', `船在这段弧上，圆周角 ∠BAC 处处是 ${d40}，都对着同一条弧 BC`, GOLDTXT);
      if (!(await wait(5200, id))) return;
      clearGhosts();
      lightText('为什么船在动，这个角却不变？', '找一样不动的东西：点一下浅滩中间的浮标'); S.call = 'buoy';
      if (!(await until(() => S.buoy, id))) return;
      // 四、圆心角
      S.beat = 'center';
      lightText(`顶点在圆心的角，叫圆心角：∠BOC = ${d80()}`, '它和船上的圆周角 ∠BAC 对着同一条弧 BC', BLUETXT);
      if (!(await wait(4800, id))) return;
      if (zone() !== 'on') await sail([S.ship, onCirc(-1.15)], 1200, id);
      lightText(`船上的 ${d40} 和圆心的 ${d80()}，是什么关系？`, '从船上把这个角剪下来，拖到圆心比一比（剪两块）'); S.call = 'cut';
      if (!(await until(() => S.cut.length >= 2, id))) return;
      S.call = '';
      lightText('圆周角 ＝ ½ 圆心角', `两个 ${d40} 正好拼满 ${d80()}——这是看出来的，能证明吗？`, GOLDTXT);
      if (!(await wait(5200, id))) return;
      chips.forEach((x) => (x.visible = false)); layout();
      // 五、证明情况（1）：最简单的位置
      S.beat = 'proof1'; aim?.([0, 1, 0.36]);
      lightText('先看最简单的位置', '视线 AB 正好穿过圆心');
      const anti = sub(mul(O, 2), B0);
      await sail([S.ship, ...arcPath(tOn(S.ship) - TAU, tOn(anti) - TAU, 20), anti], 2600, id);
      moveShip(anti);
      { const A = S.ship, X = C0; S.proof = { P: B0, other: X, placed: [], base: [{ at: A, a0: ccwStart(A, O, X), w: angAt(A, O, X) }, { at: X, a0: ccwStart(X, O, A), w: angAt(X, O, A) }] };
        S.proof.base.forEach((b, i) => { setFan(chips[i], b.at, b.a0, b.w, 0.016); chips[i].userData = { home: b.at, a0: b.a0, w: b.w, kind: 'base' }; chips[i].position.y = 0.0024; chips[i].scale.setScalar(1); }); }
      sfx.clink({ freq: 1500, gain: 0.05 }); layout();
      if (!(await wait(700, id))) return;
      lightText('OA = OC，都是半径：△AOC 是等腰三角形', '等腰三角形的两个底角相等——把这两个底角拖到圆心'); S.call = 'base';
      if (!(await until(() => S.proofDone, id))) return;
      S.call = '';
      lightText('∠BOC = ∠A + ∠C = 2∠A', '∠BOC 是 △AOC 的外角，等于两个底角的和：情况（1）证完', GOLDTXT);
      if (!(await wait(5200, id))) return;
      S.proof = 0; chips.forEach((x) => (x.visible = false)); layout();
      // 六、情况（2）：圆心在角里面
      S.beat = 'case2';
      lightText('圆心在圆周角里面呢？');
      await sail([S.ship, ...arcPath(tOn(S.ship) - TAU, -Math.PI / 2, 20)], 2400, id);
      setupCase('in');
      lightText('过 A 作直径 AD，把角拆成两块', '每一块都是“圆心在边上”——把它们拖到圆心，各张开成两倍'); S.call = 'sub';
      if (!(await until(() => S.caseDone === 'in', id))) return;
      S.call = '';
      lightText('∠BAC = ∠BAD + ∠DAC = ½∠BOC', '情况（2）：两块各自的两倍，合起来正好是 ∠BOC', GOLDTXT);
      if (!(await wait(5000, id))) return;
      S.cs = null; subs.forEach((x) => (x.visible = false)); layout();
      // 七、情况（3）：圆心在角外面
      S.beat = 'case3';
      lightText('圆心在圆周角外面呢？');
      await sail([S.ship, ...arcPath(-Math.PI / 2, -0.32, 20)], 2400, id);
      setupCase('out');
      { const [p0, p1] = S.cs.pieces; lightText('还是过 A 作直径 AD', `大的 ∠${p0.nm}、小的 ∠${p1.nm} 都拖到圆心：大的减去小的`); } S.call = 'sub';
      if (!(await until(() => S.caseDone === 'out', id))) return;
      S.call = '';
      { const [p0, p1] = S.cs.pieces; lightText(`∠BAC = ∠${p0.nm} − ∠${p1.nm} = ½∠BOC`, '情况（3）：减下来，还是 ∠BOC 的一半', GOLDTXT); }
      if (!(await wait(5000, id))) return;
      S.cs = null; subs.forEach((x) => (x.visible = false)); aim?.([0, Math.sin(0.82), Math.cos(0.82)]); layout();
      // 八、定理：同一条弧上，处处都是一半
      S.beat = 'theorem'; S.theorem = true; ui?.unlock?.();
      for (let k = 0; k <= 8; k++) placeGhost(-2.75 + (2.75 - 0.4) * (k / 8));
      punch(O, '', null);
      board.h('定理'); board('<span class="n">8</span><b>圆周角定理</b>：一条弧所对的圆周角等于它所对的圆心角的一半。');
      board.h('推论'); board('<span class="n">9</span>同弧或等弧所对的圆周角相等。');
      lightText('圆周角定理：一条弧所对的圆周角，等于它所对的圆心角的一半', `所以同一条弧上的圆周角都相等——船在浅滩边上，处处是 ${d40}`, GOLDTXT);
      if (!(await wait(6500, id))) return;
      clearGhosts();
      // 九、开进浅滩、开出浅滩：回答开头的问题
      S.beat = 'inout'; S.io = {}; layout();
      lightText('那开进浅滩、开出浅滩呢？', '拖着船开进去，再开出来，看船上的角'); S.call = 'ship';
      if (!(await until(() => S.io.in && S.io.out && now() - S.ioAt > 3 && now() - S.movedAt > 1.5, id))) return;
      S.call = ''; S.answered = true; layout();
      punch(onCirc(-2.35), '', null);
      board.h('应用'); board(`<b>答</b>：船上看两座灯塔的角小于 ${d40}，就没进浅滩；等于 ${d40} 在浅滩边上，大于 ${d40} 就进去了。`);
      lightText(`答：船上看两座灯塔的角小于 ${d40}，就没进浅滩`, `正好 ${d40} 在浅滩边上，大于 ${d40} 就进去了——这就是课本第 14 题的道理`, GOLDTXT);
      if (!(await wait(6000, id))) return;
      // 十、等角线：每个角度都是一段弧；90° 那段以 BC 为直径——变中有不变
      S.beat = 'family'; sfx.whoosh({ dur: 1.2, freq: 600, gain: 0.05 });
      grow('family', 2.4);
      if (!(await wait(2600, id))) return;
      board.h('推论'); board('<span class="n">10</span>半圆（或直径）所对的圆周角是直角；90° 的圆周角所对的弦是直径。');
      lightText('每个角度，都是一段过两座灯塔的圆弧', '标着 90° 的那段以 BC 为直径：直径所对的圆周角是直角', BLUETXT);
      if (!(await wait(6000, id))) return;
      lightText('变中有不变', '船一直在动，圆周角不变——找到不变的东西，就看懂了变化', GOLDTXT);
      S.done = true; S.beat = 'end';
      if (!(await wait(5000, id))) return;
      if (S.mode === 'deck') S.panelLater = true; else openPanel();
    }

    // 站到船头：镜头钻进盒子，从船上看两座灯塔；船头手边那卷海图点一下回来
    const chartRoll = new THREE.Group();
    const rollMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.014, 14).rotateZ(Math.PI / 2), basic({ color: 0xe9dcc0, depthTest: false, transparent: true }));
    rollMesh.renderOrder = 40;
    { const band2 = new THREE.Mesh(new THREE.CylinderGeometry(0.00232, 0.00232, 0.0016, 14).rotateZ(Math.PI / 2), basic({ color: 0x9b3b2c, depthTest: false, transparent: true })); band2.renderOrder = 41; band2.raycast = () => {};
      const t = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ map: labTex('回到海图', '#f6e8c8', 54), transparent: true, depthTest: false }))); t.scale.set(0.0105, 0.0036, 1); t.position.y = 0.0052; t.renderOrder = 41;
      chartRoll.add(rollMesh, band2, t); chartRoll.visible = false; group.add(chartRoll); }
    const rollAt = (() => { const a = new THREE.Vector3(), b = new THREE.Vector3(); return (cam) => {          // 屏幕右下角往里一点、镜头前 0.15（课本单位）的地方
      cam.updateMatrixWorld(); a.set(0.6, -0.8, -1).unproject(cam); b.set(0.6, -0.8, 1).unproject(cam); b.sub(a).normalize();
      group.updateMatrixWorld(); const s1 = group.matrixWorld.getMaxScaleOnAxis();
      a.copy(cam.position).addScaledVector(b, 0.15 * s1); group.worldToLocal(a); chartRoll.position.copy(a);
      const f = new THREE.Vector3(); cam.getWorldDirection(f); chartRoll.rotation.set(0, Math.atan2(-f.x, -f.z), 0); chartRoll.rotation.z = 0.12;
    }; })();
    const eye = () => { const toward = unit(sub(mid(B0, C0), S.ship)); return { E: add(S.ship, mul(toward, -0.004)), dir: toward }; };
    function deckLook() {
      const { E, dir } = eye(), tgt = add(E, mul(dir, 0.16)), Ey = H + 0.011, Ty = H + 0.027;
      const d3 = new THREE.Vector3(E[0] - tgt[0], Ey - Ty, -(E[1] - tgt[1])), dd = d3.length();
      look([tgt[0], Ty, -tgt[1]], d3.normalize().toArray(), dd, () => { S.mode = 'chart'; chartRoll.visible = false; layout(); subtitle(); panelBack(); }, { minEl: 0, minZoom: 0.6 });
    }
    let deckT0 = 0;
    function toDeck() { S.mode = 'deck'; deckT0 = now(); chartRoll.visible = true; deckLook(); layout(); subtitle(); sfx.whoosh({ dur: 0.5, freq: 700, gain: 0.04 }); }
    function toChart() { S.mode = 'chart'; chartRoll.visible = false; layout(); subtitle(); back(); panelBack(); }
    let deckDrag = null;
    const deckPointer = {
      down: (r, e) => { if (S.mode !== 'deck') return false; if (r.intersectObject(rollMesh, false).length) { toChart(); return true; } deckDrag = { x: e?.clientX ?? 0, y: e?.clientY ?? 0, raw: S.ship.slice() }; userTouched++; return true; },
      move: (r, e) => { if (S.mode !== 'deck') return false; if (!deckDrag || !e) return true; const dx = e.clientX - deckDrag.x, dy = e.clientY - deckDrag.y; const raw = add(deckDrag.raw, add(mul(eye().dir, -dy * 0.00022), mul([eye().dir[1], -eye().dir[0]], dx * 0.00022)));
        deckDrag = { x: e.clientX, y: e.clientY, raw: [clamp(raw[0], SEA.u0 + 0.009, SEA.u1 - 0.009), clamp(raw[1], SEA.v0 + 0.009, SEA.v1 - 0.013)] }; moveShip(deckDrag.raw); deckLook(); return true; },
      up: () => { if (S.mode !== 'deck') return false; deckDrag = null; return true; },
    };
    // 什么时候能动什么：跟着主线走（演示的时候、讲证明的时候船不乱跑）
    const canShip = () => S.mode === 'chart' && ['open', 'arc', 'inout', 'end'].includes(S.beat);
    const canCut = () => S.mode === 'chart' && S.call === 'cut' && S.cut.length < 2 && zone() === 'on';
    const canBase = (i) => S.mode === 'chart' && S.call === 'base' && !!S.proof && chips[i].visible && !S.proof.placed.includes(i);
    const canSub = (i) => S.mode === 'chart' && S.call === 'sub' && !!S.cs && !S.cs.placed.includes(i);
    const canSea = () => S.mode === 'chart' && S.call === 'sea';
    const canBuoy = () => S.mode === 'chart' && S.call === 'buoy';
    const drags = [
      { obj: K.cut, plane: 'xz', offset: 0.006 + INK_Y, hint: () => (canCut() ? '按住拖出来：剪下这个角' : ''), enabled: () => canCut(), onStart: () => cutDown(), onDrag: (p) => chipMove(uv(p)), onEnd: () => chipUp() },
      ...chips.map((c, i) => ({ obj: c, plane: 'xz', offset: 0.006 + INK_Y, hint: () => (canBase(i) ? '拖到圆心' : ''), enabled: () => canBase(i), onStart: () => chipDown(i), onDrag: (p) => chipMove(uv(p)), onEnd: () => chipUp() })),
      ...subs.map((c, i) => ({ obj: SK[i], plane: 'xz', offset: 0.006 + INK_Y, hint: () => (canSub(i) ? '拖到圆心' : ''), enabled: () => canSub(i), onStart: () => subDown(i), onDrag: (p) => subMove(uv(p)), onEnd: () => subUp() })),
      { obj: K.ship, plane: 'xz', offset: 0.004, keepOffset: false, hint: () => (canShip() ? '拖着小船开；点一下站到船头' : ''), enabled: () => canShip(), onStart: () => { userTouched++; }, onDrag: (p) => moveShip(uv(p)), onTap: () => toDeck() },
    ];
    const taps = [
      { obj: buoy, hint: () => (canBuoy() ? '点浮标' : ''), enabled: () => canBuoy(), onTap: () => tapBuoy() },
      { obj: sea, hint: () => (canSea() ? '点一下海面' : ''), enabled: () => canSea(), onTap: () => tapSea() },
    ];
    const dragApi = draggable(group, drags, { taps, onClick: () => false });
    let heard = false;
    const pointer = { down: (r, e) => { if (!heard) { heard = true; audio(); } return deckPointer.down(r, e) || dragApi.down(r, e); }, move: (r, e) => deckPointer.move(r, e) || dragApi.move(r, e), up: (r, e) => deckPointer.up(r, e) || dragApi.up(r, e), items: dragApi.items };

    // 清场重来（给老师：换一批学生，或者想重新讲一遍）——键盘 R
    function reset() {
      runId++; for (const l of lanterns) group.remove(l.g); lanterns.length = 0; boardRows.length = 0; if (boardEl) boardEl.innerHTML = ''; chips.forEach((c) => (c.visible = false)); subs.forEach((c) => (c.visible = false)); clearGhosts(); held = heldSub = -1;
      const wasDeck = S.mode === 'deck'; S = fresh(); cap.key = ''; capMesh.visible = false; if (wasDeck) toChart(); aim?.([0, Math.sin(0.82), Math.cos(0.82)]); layout(); mainLine();
    }
    const onKey = (e) => { if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !e.target?.closest?.('input,textarea')) reset(); };
    addEventListener('keydown', onKey);

    layout();
    return {
      group: root, card: false, place: 'spread', scale: 0.95,
      size: { w: 0.36, d: 0.31, h: 0.075 },
      view: { elev: 47, azim: 0, lookY: 0.03, frameMargin: 1.02 },
      pointer,
      mount(u) { ui = u; boardEl = document.createElement('div'); boardEl.className = 'ins-board'; u.controls?.append(boardEl); for (const r of boardRows) { boardEl.append(r); r.classList.add('in'); } ui.go?.(1); if (!runId) mainLine(); else if (cap.key) ui.status?.(capNow.filter(Boolean).join('　')); },
      dispose() { dead = true; runId++; removeEventListener('keydown', onKey); subEl.remove(); css.remove(); },
      update() {
        const t = now();
        // 光写的字：淡进淡出
        { if (cap.out < 1e9) { const k = clamp(1 - (t - cap.out) / 0.35, 0, 1); capMesh.material.opacity = k; if (k <= 0) { cap.out = 1e9; const n = cap.next; cap.next = null; n?.(); } } else capMesh.material.opacity = clamp((t - cap.born) / 0.5, 0, 1); }
        for (let i = ripples.length - 1; i >= 0; i--) { const m = ripples[i], a = t - m.userData.born; if (a < 0) continue; if (a > 1.4) { ink.remove(m); m.geometry.dispose(); ripples.splice(i, 1); continue; } m.scale.setScalar(0.006 + a * 0.05); m.material.opacity = 0.85 * (1 - a / 1.4); }
        { const a = t - flashAt, k = a >= 0 && a < 0.9 ? Math.sin((Math.PI * a) / 0.9) : 0; chips.forEach((c) => { if (c.visible && held < 0 && c.userData?.pa0 != null) c.scale.setScalar(1 + 0.16 * k); else if (held < 0) c.scale.setScalar(1); }); }
        // 浅滩揭开：盖着的水色淡掉
        murk.material.opacity = 0.92 * (1 - easeOut(S.reveal)); murk.visible = S.reveal < 1;
        // 一路留下的同一个角
        S.ghosts.forEach((g, i) => { const m = ghostFans[i]; if (!m || S.mode === 'deck') return; m.visible = true; m.material.opacity = 0.32 * clamp((t - g.born) / 0.4, 0, 1); });
        // 拖到圆心的那块：张开成两倍；情况（3）重叠的那块消掉
        if (S.cs) for (const a of S.cs.anim) { const p = S.cs.pieces[a.i], k = easeOut(clamp((t - a.t0) / 0.6, 0, 1)); if (S.cs.cancel && a.i === 0) continue; setFan(subs[a.i], O, p.ta0, p.tw * (0.5 + 0.5 * k), 0.026); subs[a.i].position.set(O[0], 0.0026 + 0.0002 * a.i, -O[1]); }
        if (S.cs?.cancel) { const k = clamp((t - S.cs.cancel) / 0.8, 0, 1); subs[1].material.opacity = 0.92 * (1 - k); }
        // 叫你动手的地方：一圈光一呼一吸
        { const k = Math.sin(t * 3.2) ** 2; let at = null;
          if (S.call === 'ship' && S.mode === 'chart') at = S.ship; else if (S.call === 'cut') at = bis(S.ship, B0, C0, 0.012); else if (S.call === 'sea') at = onCirc(-Math.PI / 2);
          callRing.visible = !!at && S.mode === 'chart'; if (at) { callRing.position.x = at[0]; callRing.position.z = -at[1]; callRing.scale.setScalar(1 + 0.25 * k); callRing.material.opacity = 0.35 + 0.5 * k; } }
        if (S.mode === 'deck' && chartRoll.visible) { rollAt(camera); const k = clamp((t - deckT0 - 0.6) / 0.5, 0, 1); chartRoll.traverse((o) => { if (o.material) o.material.opacity = k; }); }
        waves.offset.x = (t * 0.004) % 1; waves.offset.y = Math.sin(t * 0.3) * 0.004;
        void LH;
        boat.position.y = 0.0003 + 0.0004 * Math.sin(t * 2.1); boat.rotation.z = 0.04 * Math.sin(t * 1.7);
        for (const l of lanterns) { l.g.scale.setScalar(Math.min(1, (t - l.g.userData.born) / 0.6)); l.g.position.y = 0.0004 * Math.sin(t * 2 + l.p[0] * 90); }
        { const ring = buoy.userData.halo, k = Math.sin(t * 3) ** 2, on = S.call === 'buoy'; ring.material.opacity = on ? 0.3 + 0.55 * k : 0; ring.scale.setScalar(on ? 1 + 0.18 * k : 1); }
        if (S.call === 'base') chips.forEach((c, i) => { if (!S.proof?.placed.includes(i) && held !== i) c.material.opacity = 0.6 + 0.35 * Math.sin(t * 3.2 + i) ** 2; else c.material.opacity = 0.9; });          // 两个底角一闪一闪：能拿起来
        if (S.call === 'sub' && S.cs) subs.forEach((c, i) => { if (!S.cs.placed.includes(i) && heldSub !== i) c.material.opacity = 0.6 + 0.35 * Math.sin(t * 3.2 + i) ** 2; });
        if (S.family > 0) { group.updateMatrixWorld(); contour.material.uniforms.inv.value.copy(group.matrixWorld).invert(); }
      },
      debug: {
        get S() { return S; },
        lanterns, notes, board: boardRows, H, punch, labels: () => [...Object.values(LB), ...conLabs, conDanger], cap: () => capNow, theta, central, moveShip, tapSea, tapBuoy, cutDown, chipDown, chipMove, chipUp, subDown, subMove, subUp, toDeck, toChart, reset, onCirc, O, B0, C0,
        fast: (k) => { speed = k; }, wg: group, SK, bis,
        qa: [
          { name: '快放：开场演示', run: () => { speed = 30; }, wait: 1 },
          { name: '在海上来回开，放小旗', run: () => { for (let k = 0; k <= 320; k++) { const t = (k / 320) * TAU * 2; moveShip([0.12 * Math.cos(t * 1.3), -0.04 + 0.08 * Math.sin(t)]); } }, wait: 1 },
          { name: '点海面：小旗连成圆弧，揭开浅滩', run: () => tapSea(), wait: 2 },
          { name: '沿弧开（演示）之后点浮标', run: () => tapBuoy(), wait: 2 },
          { name: '剪两块拼到圆心', run: () => { for (let i = 0; i < 2; i++) { cutDown(); chipMove(O); chipUp(); } }, wait: 2 },
          { name: '情况（1）：两个底角拖到圆心', run: () => { for (let i = 0; i < 2; i++) { chipDown(i); chipMove(O); chipUp(); } }, wait: 2 },
          { name: '情况（2）：两块拖到圆心', run: () => { for (let i = 0; i < 2; i++) { subDown(i); subMove(O); subUp(); } }, wait: 2 },
          { name: '情况（3）：两块拖到圆心', run: () => { for (let i = 0; i < 2; i++) { subDown(i); subMove(O); subUp(); } }, wait: 2 },
          { name: '开进浅滩、开出浅滩', run: () => { moveShip([0.0, -0.045]); moveShip([0.13, -0.15]); }, wait: 4 },
        ],
      },
    };
  },
};
