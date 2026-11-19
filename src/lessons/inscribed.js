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
const SEA = { u0: -0.172, u1: 0.172, v0: -0.132, v1: 0.05 };  // 海（岸在 v = 0.05）
const H = 0.024, LAND_V = 0.046, LAND_H = 0.003, BACK_V = 0.135;          // 海面离书页多高；岸线；岸比海面高多少；模型最里边
const INK_Y = LAND_H + 0.0003;          // 数学那一层比水面高这么多
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

  create({ look, back, camera }) {
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
      const g = new THREE.PlaneGeometry(seaW, seaD, 150, 72), p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), SAND = new THREE.Color(0xe8d9b0), DEEP = new THREE.Color(0x46646e);
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
        for (const [a, b, c] of [[0, 0.42, '#7a6e62'], [0.42, 0.74, '#9a8a72'], [0.74, 1, s.land ? '#a08c68' : '#d2c197']]) { g.fillStyle = c; g.fillRect(i, Y(top * b), 1, Y(top * a) - Y(top * b) + 1); }
        for (let k = 0; k < 3; k++) { g.fillStyle = `rgba(40,30,20,${0.05 + Math.random() * 0.1})`; g.fillRect(i, Y(Math.random() * top), 1, 2); }
        if (s.land) { g.fillStyle = '#7f9a58'; g.fillRect(i, Y(YM), 1, 4); }
        else { const gr = g.createLinearGradient(0, Y(H), 0, Y(s.bed)); gr.addColorStop(0, 'rgba(92,170,205,0.96)'); gr.addColorStop(1, 'rgba(38,98,138,0.97)'); g.fillStyle = gr; g.fillRect(i, Y(H), 1, Y(s.bed) - Y(H) + 1); g.fillStyle = 'rgba(236,247,252,0.95)'; g.fillRect(i, Y(H), 1, 2); }
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
        const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#e3d2a6'); gr.addColorStop(0.16, '#d9c79a'); gr.addColorStop(0.24, '#9db06b'); gr.addColorStop(1, '#86a05c'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        for (let k = 0; k < 5000; k++) { const y = Math.random() * h; g.fillStyle = y > h * 0.8 ? `rgba(150,130,90,${Math.random() * 0.18})` : `rgba(${60 + Math.random() * 40},${90 + Math.random() * 40},40,${Math.random() * 0.22})`; g.fillRect(Math.random() * w, y, 2, 2); }
      });
      const t = quiet(new THREE.Mesh(new THREE.PlaneGeometry(seaW, BACK_V - LAND_V).rotateX(-Math.PI / 2), lit({ map: top, roughness: 0.95 }))); t.position.set(uc, YM, -(LAND_V + BACK_V) / 2); t.receiveShadow = true; root.add(t);
      const edge = quiet(new THREE.Mesh(new THREE.PlaneGeometry(seaW, YM - (H - 0.009)), lit({ color: 0xcdb98c, roughness: 0.95 }))); edge.position.set(uc, (YM + H - 0.009) / 2, -LAND_V); edge.receiveShadow = true; root.add(edge);
    }
    // 水面：半透明，透得出下面的沙洲；一层细细的波纹慢慢走
    const waves = tex(256, 256, (g, w, h) => {
      const img = g.createImageData(w, h), K = (2 * Math.PI) / 256, W = [[3, 1, 0.6, 0], [-2, 4, 0.5, 1.3], [5, -3, 0.32, 2.1], [1, 6, 0.25, 0.7]];
      const hh = (x, y) => W.reduce((s, [a, b, A, ph]) => s + A * Math.sin(K * (a * x + b * y) + ph), 0);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = hh(x + 1, y) - hh(x - 1, y), dy = hh(x, y + 1) - hh(x, y - 1), l = Math.hypot(dx, dy, 2), k = (y * w + x) * 4; img.data[k] = (-dx / l * 0.5 + 0.5) * 255; img.data[k + 1] = (-dy / l * 0.5 + 0.5) * 255; img.data[k + 2] = (2 / l * 0.5 + 0.5) * 255; img.data[k + 3] = 255; }
      g.putImageData(img, 0, 0);
    });
    waves.colorSpace = THREE.NoColorSpace; waves.wrapS = waves.wrapT = THREE.RepeatWrapping; waves.repeat.set(7, 4);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(seaW, seaD).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2c88b4, transparent: true, opacity: 0.5, roughness: 0.12, metalness: 0, normalMap: waves, normalScale: new THREE.Vector2(0.3, 0.3), depthWrite: false }));
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
.ins-punch{position:fixed;inset:0;pointer-events:none;z-index:14}
.ins-punch .spot{position:absolute;inset:0;opacity:0;transition:opacity .4s;background:radial-gradient(circle at var(--x) var(--y),rgba(30,24,18,0) 0,rgba(30,24,18,0) 110px,rgba(30,24,18,.42) 330px)}
.ins-punch.on .spot{opacity:1}
.ins-punch .eq{position:absolute;padding:10px 26px 12px;border-radius:40px;background:radial-gradient(closest-side,rgba(255,252,244,.92),rgba(255,252,244,.75) 60%,rgba(255,252,244,0));transform:translate(-50%,-100%) scale(.8);opacity:0;transition:opacity .28s,transform .4s cubic-bezier(.2,1.5,.4,1);font:600 48px/1.1 "Times New Roman","Songti SC",serif;color:#1d2533;white-space:nowrap;text-shadow:0 0 16px rgba(255,252,244,.98),0 0 5px rgba(255,252,244,.95)}
.ins-punch.on .eq{opacity:1;transform:translate(-50%,-100%) scale(1)}
.ins-punch .eq .ia{color:#cc6418}.ins-punch .eq .ca{color:#2c6aa8}`;
    document.head.append(css);
    // 板书：学生做出一样，就用课本的话写一行；只写已经发现的，不预先列出后面要做什么
    let boardEl = null; const boardRows = [];
    const board = (html, hold = false) => {
      const r = document.createElement('div'); r.className = 'ib-row'; r.innerHTML = html; boardRows.push(r);
      for (const o of boardRows) if (o !== r) o.classList.remove('fresh');
      if (boardEl) { boardEl.append(r); if (!hold) requestAnimationFrame(() => r.classList.add('in', 'fresh')); }
      return r;
    };
    // 重拍：发现的那一下，在发生的地方出一句式子，周围暗一下；一秒多以后式子飞进板书那一行
    const punchEl = document.createElement('div'); punchEl.className = 'ins-punch'; punchEl.innerHTML = '<div class="spot"></div><div class="eq"></div>'; document.body.append(punchEl);
    const spotEl = punchEl.firstChild, eqEl = punchEl.lastChild;
    let punching = false;
    function punch(p, html, row, hold = 1700) {
      const v = new THREE.Vector3(p[0], 0.006, -p[1]); group.updateMatrixWorld(); group.localToWorld(v); v.project(camera);
      const x = ((v.x + 1) / 2) * innerWidth, y = ((1 - v.y) / 2) * innerHeight;
      spotEl.style.setProperty('--x', `${x}px`); spotEl.style.setProperty('--y', `${y}px`);
      eqEl.style.transition = ''; eqEl.style.left = `${x}px`; eqEl.style.top = `${y + 128}px`; eqEl.style.opacity = ''; eqEl.style.transform = ''; eqEl.innerHTML = html;
      punchEl.classList.add('on'); sfx.ding(1320, { gain: 0.07 }); punching = true; layout();
      later(hold, () => {
        punching = false; layout();
        const r = row?.isConnected ? row.getBoundingClientRect() : null;
        punchEl.classList.remove('on');
        if (r && r.width) { eqEl.style.transition = 'left .6s cubic-bezier(.5,0,.25,1),top .6s cubic-bezier(.5,0,.25,1),transform .6s,opacity .6s'; eqEl.style.left = `${r.left + 70}px`; eqEl.style.top = `${r.top + r.height}px`; eqEl.style.transform = 'translate(-50%,-100%) scale(.32)'; eqEl.style.opacity = '0.15'; }
        later(560, () => { row?.classList.add('in', 'fresh'); eqEl.style.opacity = '0'; });
      });
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
    const stripe = tex(64, 256, (g, w, h) => { for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#b83a2f' : '#f3f0e8'; g.fillRect(0, (i * h) / 6, w, h / 6 + 1); } });
    const tower = (P) => {
      const g = new THREE.Group(); g.position.copy(P3(P, LAND_H));
      const foot = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0046, 0.0052, 0.0028, 28), lit({ color: 0x9c968b, roughness: 0.9 }))); foot.position.y = 0.0014;
      const body = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0026, 0.0037, 0.034, 32), lit({ map: stripe, roughness: 0.55 }))); body.position.y = 0.0028 + 0.017;
      const gal = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0041, 0.0041, 0.0008, 28), lit({ color: 0x2c3036, roughness: 0.45, metalness: 0.4 }))); gal.position.y = 0.0372;
      const lamp = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.0038, 20), lit({ color: 0xfff2c8, emissive: 0xffd36e, emissiveIntensity: 0.85, roughness: 0.25 }))); lamp.position.y = 0.0395;
      const roof = solid(new THREE.Mesh(new THREE.ConeGeometry(0.0031, 0.0040, 28), lit({ color: 0xa23128, roughness: 0.5 }))); roof.position.y = 0.0434;
      const tip = solid(new THREE.Mesh(new THREE.SphereGeometry(0.0006, 10, 8), lit({ color: 0x2c3036, metalness: 0.4 }))); tip.position.y = 0.0459;
      g.add(foot, body, gal, lamp, roof, tip); group.add(g); return g;
    };
    const LH = [tower(B0), tower(C0)];
    // ---- 浮标（圆心）：红色的罐形浮标；该点它的时候，水面上一圈橙色的环一闪一闪 ----
    const buoy = new THREE.Group();
    { const body = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0032, 0.0039, 0.006, 22), lit({ color: 0xc23a2e, roughness: 0.5 }))); body.position.y = 0.0012;
      const band = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.00326, 0.00334, 0.0011, 22), lit({ color: 0xf1ede2, roughness: 0.6 }))); band.position.y = 0.0026;
      const top = solid(new THREE.Mesh(new THREE.ConeGeometry(0.0021, 0.0034, 18), lit({ color: 0xc23a2e, roughness: 0.5 }))); top.position.y = 0.0059;
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.0074, 0.0092, 48).rotateX(-Math.PI / 2), basic({ color: 0xf08a24, transparent: true, opacity: 0, depthWrite: false })); ring.position.y = 0.0007; ring.raycast = () => {}; ring.userData.noFrame = true;
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.012, 16), basic({ transparent: true, opacity: 0, depthWrite: false })); pick.position.y = 0.006; pick.userData.noFrame = true;
      buoy.add(body, band, top, ring, pick); buoy.userData.halo = ring; }
    buoy.position.copy(P3(O)); group.add(buoy);
    // ---- 小船 ----
    const boat = new THREE.Group();
    { const Lh = 0.0125, Wd = 0.0056, Hh = 0.004, geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([-Lh, Hh, 0, Lh, Hh, 0, -Lh * 0.55, 0, Wd * 0.5, Lh * 0.55, 0, Wd * 0.5, -Lh * 0.55, 0, -Wd * 0.5, Lh * 0.55, 0, -Wd * 0.5], 3));
      geo.setIndex([0, 2, 3, 0, 3, 1, 0, 1, 5, 0, 5, 4, 2, 4, 5, 2, 5, 3]); geo.computeVertexNormals();
      const hull = solid(new THREE.Mesh(geo, lit({ color: 0xf6f3ec, roughness: 0.6, side: THREE.DoubleSide })));
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute([-Lh * 0.5, Hh, 0, Lh * 0.5, Hh, 0, 0.0008, Hh + 0.0112, 0], 3)); sg.computeVertexNormals();
      const sail = solid(new THREE.Mesh(sg, lit({ color: 0xf2e6cf, roughness: 0.7, side: THREE.DoubleSide })));
      boat.add(hull, sail); }
    group.add(boat);

    // ================= 光、线、角、字 =================
    // 视线：从船到两座灯塔的两条线（角的两边）
    const band = () => { const m = quiet(new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), basic({ color: 0xd8742a, transparent: true, depthWrite: false, opacity: 0.95 }))); m.position.y = 0.0012; ink.add(m); return m; };
    const setBand = (m, P, Q, w) => { const d = sub(Q, P), l = Math.hypot(...d); m.position.x = (P[0] + Q[0]) / 2; m.position.z = -(P[1] + Q[1]) / 2; m.rotation.set(0, Math.atan2(d[1], d[0]) - Math.PI / 2, 0); m.scale.set(w, 1, Math.max(1e-4, l)); };
    const BAND = [band(), band()];
    // 细线（绳子、虚线、圆）：贴在水面上的细带子
    const line = (color, w, y, o = 1, dash = 0) => { const m = quiet(new THREE.Mesh(new THREE.BufferGeometry(), basic({ color, transparent: true, opacity: o, depthWrite: false }))); m.position.y = y; m.userData.w = w; m.userData.dash = dash; ink.add(m); return m; };
    const setLine = (m, pts, closed = false) => {
      if (!pts || pts.length < 2) { m.visible = false; return; }
      const w = m.userData.w / 2, dash = m.userData.dash, out = [], P = closed ? [...pts, pts[0]] : pts;
      let acc = 0;
      const push = (p, q, n) => out.push(p[0] + n[0], 0, -(p[1] + n[1]), p[0] - n[0], 0, -(p[1] - n[1]), q[0] + n[0], 0, -(q[1] + n[1]), q[0] + n[0], 0, -(q[1] + n[1]), p[0] - n[0], 0, -(p[1] - n[1]), q[0] - n[0], 0, -(q[1] - n[1]));
      for (let i = 0; i < P.length - 1; i++) {
        const a = P[i], b = P[i + 1], d = sub(b, a), l = Math.hypot(...d); if (l < 1e-7) continue;
        const n = [(-d[1] / l) * w, (d[0] / l) * w];
        if (!dash) push(a, b, n);
        else { let t = 0; while (t < l - 1e-9) { const ph = (acc + t) % (dash * 2), on = ph < dash, step = Math.max(1e-6, Math.min(l - t, on ? dash - ph : dash * 2 - ph)); if (on) push(add(a, mul(d, t / l)), add(a, mul(d, (t + step) / l)), n); t += step; } acc += l; }
      }
      m.geometry.dispose(); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3)); m.geometry = g; m.visible = out.length > 0;
    };
    const L = {
      circle: line(0x24324a, 0.001, 0.0016, 0.85, 0.003), OB: line(0x2f6fb4, 0.0009, 0.0015, 0.95), OC: line(0x2f6fb4, 0.0009, 0.0015, 0.95),
      rope1: line(0x7a4a22, 0.0012, 0.0019), rope2: line(0x7a4a22, 0.0012, 0.0019), tick1: line(0x7a4a22, 0.0012, 0.002), tick2: line(0x7a4a22, 0.0012, 0.002),
      diam: line(0x4a3c30, 0.0009, 0.0021, 0.9, 0.0025), ext: line(0xcc6418, 0.001, 0.0018, 0.95, 0.0028), ext2: line(0xcc6418, 0.001, 0.0018, 0.95),
      arcBC: line(0x2f6fb4, 0.0014, 0.0017, 0.95),          // 两座灯塔之间那段弧（在岸上）：圆周角、圆心角对着的就是它
    };
    // 扇形（一块光）
    const fanM = (color, opacity, y, blend = THREE.NormalBlending) => { const m = new THREE.Mesh(new THREE.BufferGeometry(), basic({ color, transparent: true, opacity, depthWrite: false, blending: blend, side: THREE.DoubleSide })); m.position.y = y; m.userData.noFrame = true; ink.add(m); m.visible = false; return m; };
    const setFan = (m, apex, a0, w, r) => { const n = Math.max(6, Math.ceil(Math.abs(w) / 0.05)), pos = []; for (let i = 0; i < n; i++) { const t0 = a0 + (w * i) / n, t1 = a0 + (w * (i + 1)) / n; pos.push(0, 0, 0, Math.cos(t0) * r, 0, -Math.sin(t0) * r, Math.cos(t1) * r, 0, -Math.sin(t1) * r); } m.geometry.dispose(); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); m.geometry = g; m.position.x = apex[0]; m.position.z = -apex[1]; m.visible = true; };
    const F = { ship: fanM(0xf2a048, 0.42, 0.0013), buoy: fanM(0x5a97d8, 0.32, 0.0012), sub1: fanM(0xffe7b0, 0.5, 0.0017), sub2: fanM(0xbfeaff, 0.5, 0.0016), q: fanM(0xffcf7a, 0.42, 0.0013, THREE.AdditiveBlending), x: fanM(0xff9b4a, 0.6, 0.0017) };
    for (const k in F) F[k].raycast = () => {};
    // 能拿起来拖的光扇（剪下来的、证明里的两个底角）
    const chips = [0xec8a26, 0xf6b45e].map((c) => fanM(c, 0.9, 0.0024));
    // 字：朝着镜头的牌子（先量字宽再画）
    const measure = (font, txt) => { const g = document.createElement('canvas').getContext('2d'); g.font = font; return g.measureText(txt).width; };
    // 字：和课本插图一样——字母用斜体，度数、名称用宋体；白色描边垫底，压在水面、线上也认得出
    const labTex = (txt, col, px = 64) => { const f = /^[A-Z]$/.test(txt) ? `italic 500 ${px * 1.08}px "Times New Roman",serif` : `600 ${px}px "Times New Roman","Songti SC","STSong",serif`; return tex(Math.ceil(measure(f, txt)) + 40, Math.round(px * 1.5), (g, w, h) => { g.font = f; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = px * 0.22; g.strokeStyle = 'rgba(255,252,245,0.94)'; g.strokeText(txt, w / 2, h / 2 + 2); g.fillStyle = col; g.fillText(txt, w / 2, h / 2 + 2); }); };
    const label = (hgt) => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }))); sp.renderOrder = 20; sp.userData.h = hgt; sp.userData.k = ''; ink.add(sp); sp.visible = false; return sp; };
    const setLabel = (sp, txt, col, p, y = 0.008) => { if (!txt) { sp.visible = false; return; } const k = txt + col; if (sp.userData.k !== k) { sp.userData.k = k; const t = labTex(txt, col); sp.material.map?.dispose?.(); sp.material.map = t; sp.material.needsUpdate = true; sp.scale.set((sp.userData.h * t.image.width) / t.image.height, sp.userData.h, 1); } sp.position.set(p[0], y, -p[1]); sp.visible = true; };
    const LB = { ship: label(0.013), buoy: label(0.011), q: label(0.009), a: label(0.0095), o: label(0.0095), b: label(0.0095), c: label(0.0095), d: label(0.0095), arc: label(0.0082) };
    // 海面上的批注（船长在海图上写的）：躺在水面上的手写字
    const NF = '600 46px "Kaiti SC","STKaiti",serif';
    const noteTex = (txt) => tex(Math.ceil(measure(NF, txt)) + 48, 76, (g, w, h) => { g.font = NF; g.textBaseline = 'middle'; g.shadowColor = 'rgba(4,14,28,0.95)'; g.shadowBlur = 12; g.fillStyle = 'rgba(248,236,206,0.96)'; g.fillText(txt, 24, h / 2 + 2); g.shadowBlur = 4; g.fillText(txt, 24, h / 2 + 2); });
    const notes = []; let dblNote = null;
    const note = () => ({ userData: {} });          // 以前写在水面上的批注：都改写进板书了
    const noteOld = (txt, p) => { const t = noteTex(txt), hgt = 0.0084; const m = quiet(new THREE.Mesh(new THREE.PlaneGeometry((hgt * t.image.width) / t.image.height, hgt).rotateX(-Math.PI / 2), basic({ map: t, transparent: true, depthWrite: false, opacity: 0 }))); m.position.set(p[0], 0.0021, -p[1]); m.userData.born = now(); m.userData.txt = txt; group.add(m); notes.push(m); return m; };
    // 河灯
    const lanterns = [];
    const flagMat = lit({ color: 0xe8743b, roughness: 0.6, side: THREE.DoubleSide }), poleMat = lit({ color: 0x3b3833, roughness: 0.6 });
    const flagGeo = new THREE.BufferGeometry(); flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.0013, 0, 0, -0.0013, 0, 0.0034, 0, 0], 3)); flagGeo.computeVertexNormals();
    const dropLantern = (p) => {
      if (lanterns.some((l) => dist(l.p, p) < 0.011)) return;
      const g = new THREE.Group(), body = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0018, 0.0022, 14), flagMat)); body.position.y = 0.0006;
      const pole = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0002, 0.0002, 0.0072, 6), poleMat)); pole.position.y = 0.0044;
      const flag = solid(new THREE.Mesh(flagGeo, flagMat)); flag.position.set(0.0002, 0.0068, 0); flag.rotation.y = Math.atan2(p[1] - O[1], p[0] - O[0]);
      g.add(body, pole, flag); g.position.copy(P3(p)); g.userData.born = now(); group.add(g); lanterns.push({ p, g, body });
      sfx.ding(1180 + Math.random() * 160, { gain: 0.035, decay: 0.6 });
    };
    // 整片海的等角线（点海面才出来）：着色器算每一点“看两座灯塔是多少度”，每 10° 一条
    const contour = quiet(new THREE.Mesh(new THREE.PlaneGeometry(seaW, seaD).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { B: { value: new THREE.Vector2(B0[0], -B0[1]) }, C: { value: new THREE.Vector2(C0[0], -C0[1]) }, th0: { value: DANGER * DEG }, k: { value: 0 }, inv: { value: new THREE.Matrix4() } },
      vertexShader: 'uniform mat4 inv; varying vec2 w; void main(){ vec4 p = modelMatrix * vec4(position, 1.); w = (inv * p).xz; gl_Position = projectionMatrix * viewMatrix * p; }',
      fragmentShader: `uniform vec2 B; uniform vec2 C; uniform float th0; uniform float k; varying vec2 w;
        void main(){
          vec2 a = normalize(B - w), b = normalize(C - w);
          float d = degrees(acos(clamp(dot(a, b), -1., 1.)));
          float fw = fwidth(d) + 1e-4;
          float f = abs(fract(d / 10. + .5) - .5) * 10.;
          float ln = 1. - smoothstep(0., fw * 1.3, f);
          float dg = 1. - smoothstep(0., fw * 2.2, abs(d - th0));
          float rt = 1. - smoothstep(0., fw * 2.2, abs(d - 90.));
          gl_FragColor = vec4(vec3(.16, .22, .32) * ln + vec3(.8, .38, .1) * dg + vec3(.17, .42, .7) * rt, clamp(ln * .55 + dg * .9 + rt * .9, 0., 1.) * k);
        }` })));
    contour.position.copy(sea.position).setY(0.0003); contour.visible = false; ink.add(contour);
    const conLabs = [20, 30, 60, 90].map(() => label(0.0085)), conDanger = label(0.0095);
    // 等角线上放度数的地方：那一圈在海里、偏左下的一点
    const conAt = (d) => { const t = (d * Math.PI) / 180, r = 0.06 / Math.sin(t), c = [0, 0.05 - 0.06 / Math.tan(t)]; for (const a of [-1.7, -2.0, -2.3, -2.6, -2.9]) { const p = [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]; if (inSea(p)) return p; } return null; };

    // ================= 状态 =================
    const fresh = () => ({ ship: [0.11, -0.108], head: Math.PI * 0.75, mode: 'chart', circle: 0, walk: null, walked: false, buoy: 0, cut: [], proof: 0, proofDone: false, caseMode: false, cases: {}, caseNow: '', caseAt: 0, theorem: false, theoremAt: 0, io: {}, ioNow: '', ioAt: 0, movedAt: 0, answered: false, family: 0, done: false });
    let S = fresh();
    const theta = (p = S.ship) => angAt(p, B0, C0);
    const zone = () => { const r = dist(S.ship, O); return r < R - 0.0012 ? 'in' : r > R + 0.0012 ? 'out' : 'on'; };
    const tOn = (p) => { let t = dirO(p); while (t < AB - 1e-9) t += TAU; while (t > AB + TAU) t -= TAU; return t; };          // 船在圆上走到哪儿（从灯塔 B 那头量起）
    const nm = (P) => (P === B0 ? 'B' : 'C');
    const diamEnd = () => sub(mul(O, 2), S.ship);          // 过船的直径的另一头 D
    const caseOf = () => {          // 圆心和圆周角 ∠BAC 的位置：在一条边上 / 内部 / 外部
      const A = S.ship, aB = ang(sub(B0, A)), aC = ang(sub(C0, A)), aO = ang(sub(O, A));
      if (Math.abs(wrap(aO - aB)) < 0.012 || Math.abs(wrap(aO - aC)) < 0.012) return 'side';
      return Math.abs(wrap(aO - aB)) + Math.abs(wrap(aC - aO)) <= theta() + 1e-6 ? 'in' : 'out';
    };
    const outPair = () => { const A = S.ship, D = diamEnd(); return angAt(A, D, B0) > angAt(A, D, C0) ? ['B', 'C'] : ['C', 'B']; };          // 情况（3）：大的那块减小的那块
    const arcSpread = () => { const ts = lanterns.map((l) => dirO(l.p)).sort((a, b) => a - b); let gap = 0; for (let i = 0; i < ts.length; i++) gap = Math.max(gap, (ts[(i + 1) % ts.length] - ts[i] + TAU) % TAU); return ts.length < 2 ? 0 : TAU - gap; };

    // 天幕上的字：学生每做出一样东西，就在那一刻说出课本上对应的那句话；开头的问题在开进开出浅滩以后正面回答
    function story() {
      const n = lanterns.length, d = fmt(DANGER);
      if (!S.circle) {
        if (n === 0) return say('夜里看不见浅滩，只看得见岸上两盏灯。船怎么知道自己进没进浅滩？', `海图上标着：危险角 ${d}。拖着小船开一开，看船上看两盏灯分开多少度`);
        if (n < 5 || arcSpread() < 1.0) return say(`船上看两盏灯正好 ${d} 的地方，放下了一盏河灯`, '多开几个地方，看河灯都落在哪儿');
        return say('这些河灯连起来，是什么形状？', '点一盏河灯看看');
      }
      if (S.circle < 1) return;
      if (!S.walked) return say('河灯连成一个过两座灯塔的圆——正好是浅滩的边', '把船开到圆上（靠近会吸住），沿着圆开一开：船上看两盏灯，一直是多少度？');
      if (!S.buoy) return say('顶点在圆上、两边都和圆相交的角，叫圆周角', `船在圆上处处是 ${d}，都对着同一条弧 BC。浮标在圆心，从那儿看弧 BC 呢？点浮标`);
      if (S.cut.length < 2) return say(`顶点在圆心的角，叫圆心角：∠BOC = ${fmt(central())}`, '它和圆周角 ∠BAC 对着同一条弧 BC。按住船边那块光，剪下来拖到浮标那里比一比（剪两块）');
      if (S.proof && !S.proofDone) { const x = nm(S.proof.other); return say(`情况（1）：圆心 O 在圆周角的一条边 A${nm(S.proof.P)} 上`, `OA = O${x}（都是半径）⇒ ∠A = ∠${x}。把这两个角拖到浮标那里拼一拼`); }
      if (S.proof) { const x = nm(S.proof.other); return say(`∠BOC 是 △AO${x} 的外角：∠BOC = ∠A + ∠${x} = 2∠A`, '所以 ∠A 是 ∠BOC 的一半。圆心不在边上呢？'); }
      if (!S.proofDone) return say('两个圆周角正好拼满圆心角：圆周角是圆心角的一半', '能证明吗？先看最简单的位置：开到让一座灯塔的光正好照过浮标的地方');
      if (!S.theorem) {
        const c = S.caseMode && zone() === 'on' ? caseOf() : null;
        if (c === 'in') return say('情况（2）：圆心在圆周角的内部——过 A 作直径 AD', '∠BAC = ∠BAD + ∠DAC，两块都是情况（1）：合起来还是 ∠BOC 的一半');
        if (c === 'out') { const [g, k] = outPair(); return say('情况（3）：圆心在圆周角的外部——过 A 作直径 AD', `∠BAC = ∠DA${g} − ∠DA${k}，两块都是情况（1）：减下来还是 ∠BOC 的一半`); }
        if (c === 'side') return say('这里圆心正好在边上，就是情况（1）', '沿着圆再开一开，让圆心跑到圆周角里面、外面');
        return say('圆心不在圆周角的边上时，怎么证？', '把船沿着圆开到别处，点浮标：过船作一条直径');
      }
      const z = zone();
      if (!S.answered && (z === 'on' || now() - S.theoremAt < 5)) return say('圆周角定理：一条弧所对的圆周角等于它所对的圆心角的一半', `所以同弧所对的圆周角相等：浅滩边上处处是 ${d}。开进浅滩、开出浅滩，角会怎样？`);
      if (!S.answered) {
        const sh = shoalFig();
        if (z === 'in') return say(`船进了浅滩：∠BPC 比 ${d} 大`, sh ? `延长 ${nm(sh.P)}P 交圆于 Q：∠BPC 是 △PQ${nm(sh.R2)} 的外角，比圆周角 ∠BQC = ${d} 大` : `比圆周角 ${d} 大：进浅滩了`);
        return say(`船在浅滩外：∠BPC 比 ${d} 小`, sh ? `${nm(sh.P)}P 交圆于 Q：圆周角 ∠BQC = ${d} 是 △QP${nm(sh.R2)} 的外角，比 ∠BPC 大` : `比圆周角 ${d} 小：在浅滩外`);
      }
      if (!S.family) return say(`答案：船上看两盏灯的角小于 ${d}，就没进浅滩`, `正好 ${d} 在浅滩边上，大于 ${d} 就进去了（第 14 题）。点海面：别的角度在哪儿？`);
      return say('每个角度都是一段过两座灯塔的圆弧，一圈套一圈', '90° 那圈以 BC 为直径：直径所对的圆周角是直角，90° 的圆周角所对的弦是直径');
    }

    // ================= 画 =================
    const bis = (p, q0, q1, r) => { const u0 = unit(sub(q0, p)), u1 = unit(sub(q1, p)), s2 = add(u0, u1); return add(p, mul(Math.hypot(...s2) < 1e-3 ? [-u0[1], u0[0]] : unit(s2), r)); };
    function layout() {
      const A = S.ship, th = theta(), z = zone();
      boat.position.copy(P3(A)); boat.rotation.y = S.head;
      setBand(BAND[0], B0, A, 0.0013); setBand(BAND[1], C0, A, 0.0013);
      setFan(F.ship, A, ccwStart(A, B0, C0), th, 0.018);
      setLabel(LB.ship, S.walked && z === 'on' ? `圆周角 ${fmt(th)}` : fmt(th), z === 'in' ? '#c2352a' : z === 'out' ? '#2e7d4f' : '#c55f14', bis(A, B0, C0, 0.03), 0.01);
      // 圆（从 B 经过最下面画到 C）、浮标的角
      setLine(L.circle, S.circle > 0 ? arcPts(O, R, AB, AB + (AC - AB) * easeOut(S.circle), 160) : null);
      const bk = S.buoy;
      setLine(L.OB, bk ? [O, B0] : null); setLine(L.OC, bk ? [O, C0] : null);
      if (bk) { setFan(F.buoy, O, ccwStart(O, B0, C0), central(), 0.028); setLabel(LB.buoy, `圆心角 ${fmt(central())}`, '#2c64a4', bis(O, B0, C0, 0.041), 0.01); } else { F.buoy.visible = false; LB.buoy.visible = false; }
      // 证明：一束光照过浮标时——浮标到船、到另一座灯塔的两根绳子（都是半径）
      const pf = S.proof;
      if (pf) {
        setLine(L.rope1, [O, A]); setLine(L.rope2, [O, pf.other]);
        const tick = (p, q) => { const m = mid(p, q), n = mul(unit([-(q[1] - p[1]), q[0] - p[0]]), 0.003); return [sub(m, n), add(m, n)]; };
        setLine(L.tick1, tick(O, A)); setLine(L.tick2, tick(O, pf.other));
      } else { for (const k of ['rope1', 'rope2', 'tick1', 'tick2']) setLine(L[k], null); }
      // 字母和课本的图一样：两座灯塔 B、C，浮标 O；船在圆上是 A，开进开出浅滩时是 P
      const lt = '#1f2a3a';
      if (S.walked) { setLabel(LB.b, 'B', lt, add(B0, [-0.011, -0.006]), 0.007); setLabel(LB.c, 'C', lt, add(C0, [0.011, -0.006]), 0.007); setLine(L.arcBC, arcPts(O, R, dirO(C0), dirO(B0), 48)); setLabel(LB.arc, S.caseMode ? '' : '弧 BC', '#2c64a4', [0, O[1] + R + 0.0075], 0.007); }
      else { LB.b.visible = LB.c.visible = LB.arc.visible = false; setLine(L.arcBC, null); }
      setLabel(LB.a, S.walked && z === 'on' ? 'A' : S.theorem && z !== 'on' ? 'P' : '', lt, add(A, mul(unit(sub(A, O)), 0.013)), 0.006);
      setLabel(LB.o, S.buoy ? 'O' : '', lt, add(O, [0.007, -0.008]), 0.006);
      // 拆成两块：过船拉一根穿过浮标的直径 AD
      if (S.caseMode && z === 'on' && !S.proof) {
        const D = diamEnd(); setLine(L.diam, [A, D]);
        setFan(F.sub1, A, ang(sub(B0, A)), wrap(ang(sub(D, A)) - ang(sub(B0, A))), 0.012);
        setFan(F.sub2, O, ang(sub(B0, O)), wrap(ang(sub(D, O)) - ang(sub(B0, O))), 0.016);
        setLabel(LB.d, 'D', lt, add(D, mul(unit(sub(D, O)), 0.011)), 0.006);
      } else { setLine(L.diam, null); F.sub1.visible = F.sub2.visible = false; LB.d.visible = false; }
      // 第 14 题：圈里 / 圈外——延长一座灯塔到船的线，交圆于 Q
      const sh = S.theorem && z !== 'on' ? shoalFig() : null;          // 定理证完以后才拿来讲圈里圈外（天幕上那句也是这时候才请学生开进开出）
      if (sh) {
        setLine(L.ext, [sh.P, sh.far]); setLine(L.ext2, [sh.Q, sh.R2]);
        setFan(F.q, sh.Q, ccwStart(sh.Q, sh.P, sh.R2), angAt(sh.Q, sh.P, sh.R2), 0.012); setFan(F.x, sh.R2, ccwStart(sh.R2, sh.Q, A), angAt(sh.R2, sh.Q, A), 0.013);
        setLabel(LB.q, `Q ${fmt(DANGER)}`, '#c55f14', add(sh.Q, mul(unit(sub(sh.Q, O)), 0.013)), 0.006);
      } else { setLine(L.ext, null); setLine(L.ext2, null); F.q.visible = F.x.visible = false; LB.q.visible = false; }
      // 等角线
      contour.visible = S.family > 0; contour.material.uniforms.k.value = easeOut(S.family);
      [20, 30, 60, 90].forEach((d, i) => { const p = S.family > 0.5 ? conAt(d) : null; if (p) setLabel(conLabs[i], `${d}°`, d === 90 ? '#2c64a4' : '#5a4a3a', p, 0.006); else conLabs[i].visible = false; });
      if (S.family > 0.5) setLabel(conDanger, `危险角 ${fmt(DANGER)}`, '#c55f14', [O[0] - R - 0.024, O[1] - 0.01], 0.006); else conDanger.visible = false;
      if (punching) LB.ship.visible = LB.buoy.visible = false;
      K.ship.position.copy(P3(A, 0.004)); K.cut.position.copy(P3(bis(A, B0, C0, 0.012), 0.0042));
      if (S.mode === 'deck') {
        for (const sp of [...Object.values(LB), ...conLabs, conDanger]) sp.visible = false;
        for (const m of [F.ship, F.buoy, F.sub1, F.sub2, F.q, F.x, L.OB, L.OC, L.rope1, L.rope2, L.tick1, L.tick2, L.diam, L.ext, L.ext2, L.arcBC, ...chips]) m.visible = false;
      }
      for (const n of notes) n.visible = S.mode !== 'deck';
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

    // ================= 动手 =================
    const K = { ship: new THREE.Mesh(new THREE.CircleGeometry(0.011, 20).rotateX(-Math.PI / 2), basic({ visible: false })), cut: new THREE.Mesh(new THREE.CircleGeometry(0.0085, 16).rotateX(-Math.PI / 2), basic({ visible: false })) };
    for (const k in K) { K[k].userData.pick = true; K[k].userData.noFrame = true; group.add(K[k]); }
    const uv = (p) => [p.x, -p.z];
    function moveShip(q) {
      if (!inSea(q)) q = [clamp(q[0], SEA.u0 + 0.009, SEA.u1 - 0.009), clamp(q[1], SEA.v0 + 0.009, SEA.v1 - 0.013)];
      if (S.circle >= 1 && Math.abs(dist(q, O) - R) < 0.005) q = onCirc(dirO(q));          // 圆画出来以后：靠近了就吸在圆上
      if (S.buoy && !S.proofDone) for (const P of [B0, C0]) { const anti = sub(mul(O, 2), P); if (dist(q, anti) < 0.0065) q = anti; }      // 一束光正好照过浮标的那一点：吸过去
      const prev = S.ship, mv = sub(q, prev);
      if (S.proof && S.proofDone && dist(q, prev) > 1e-4) { S.proof = 0; chips.forEach((x) => (x.visible = false)); }          // 证完了，船一开走，证明用的绳子和角就收起来
      if (Math.hypot(...mv) > 1e-5) S.head = lerp(S.head, S.head + wrap(Math.atan2(mv[1], mv[0]) - S.head), 0.3);
      S.ship = q;
      // 每次正好等于危险角（两次位置之间跨过去的那一点），船就放下一盏河灯：二分找到那一点，它一定落在圆上
      const s0 = theta(prev) - DANGER, s1 = theta() - DANGER;
      if (s0 * s1 <= 0 && Math.abs(s0 - s1) > 1e-7) { let a = prev, b = q; for (let i = 0; i < 26; i++) { const m = mid(a, b); if ((theta(m) - DANGER) * s0 <= 0) b = m; else a = m; } const p = mid(a, b); if (p[1] < SEA.v1 - 0.004) dropLantern(p); }
      track();
      layout(); checkProof(); story(); subtitle();
    }
    // 学生做到了哪一步：沿着圆走过一段；作直径看过圆心在里面、外面；定理之后开进过、开出过浅滩
    function track() {
      const z = zone();
      if (S.circle >= 1 && !S.walked && z === 'on') {
        const t = tOn(S.ship); S.walk = S.walk ? [Math.min(S.walk[0], t), Math.max(S.walk[1], t)] : [t, t];
        if (S.walk[1] - S.walk[0] >= 0.5) { S.walked = true; sfx.ding(1040, { gain: 0.05 }); board(`<span class="n">2</span><b>圆周角</b>：顶点在圆上，并且两边都与圆相交的角。船在圆上处处 <i>∠BAC</i> = ${fmt(DANGER)}。`); }
      }
      S.movedAt = now();
      if (S.proofDone && !S.proof && !S.theorem && S.caseMode && z === 'on') {
        const c = caseOf(); if (c !== 'side') { if (c !== S.caseNow) { S.caseNow = c; S.caseAt = now(); } if (!S.cases[c]) { const [g, k] = outPair(); board(c === 'in' ? '（2）圆心在内部：作直径 <i>AD</i>，<i>∠BAC</i> = <i>∠BAD</i> + <i>∠DAC</i> = ½<i>∠BOC</i>' : `（3）圆心在外部：作直径 <i>AD</i>，<i>∠BAC</i> = <i>∠DA${g}</i> − <i>∠DA${k}</i> = ½<i>∠BOC</i>`); } S.cases[c] = true; }
      }
      if (S.theorem && z !== 'on') S.caseMode = false;
      if (S.theorem && !S.answered && z !== 'on' && now() - S.theoremAt >= 5) {
        if (z !== S.ioNow) { S.ioNow = z; S.ioAt = now(); }
        S.io[z] = true;
      }
    }
    // 每一帧看一眼：两种情况都看过、船停下来、这一句也看够了，才说出定理；开进开出都看过、停下来，才给出答案
    function settle() {
      const t = now();
      if (!S.theorem && S.cases.in && S.cases.out && t - S.caseAt >= 4.5 && t - S.movedAt >= 2.5) {
        S.theorem = true; S.theoremAt = t; ui?.unlock?.(); layout(); story();
        { const row = board('<span class="n">6</span><b>圆周角定理</b>：一条弧所对的圆周角等于它所对的圆心角的一半。<br>推论：同弧或等弧所对的圆周角相等。', true); punch(S.ship, '圆周角 = ½ 圆心角', row, 2200); } const S0 = S; later(5200, () => { if (S === S0) story(); });
      }
      if (S.theorem && !S.answered && S.io.in && S.io.out && t - S.ioAt >= 4.5 && t - S.movedAt >= 2.5) { S.answered = true; layout(); story(); const row = board(`<b>答</b>：船上看两座灯塔的角小于 ${fmt(DANGER)}，就没进浅滩；等于 ${fmt(DANGER)} 在浅滩边上，大于 ${fmt(DANGER)} 就进去了。`, true); punch(S.ship, `<span class="ia">∠P</span> &lt; ${fmt(DANGER)}：没进浅滩`, row, 2200); }
    }
    // 一束光正好照过浮标：开始讲为什么（课本情况（1））
    function checkProof() {
      if (!S.buoy || S.proofDone || S.proof || S.cut.length < 2) return;
      for (const [P, other] of [[B0, C0], [C0, B0]]) {
        if (dist(S.ship, sub(mul(O, 2), P)) > 1e-6) continue;
        const A = S.ship, X = other;
        S.proof = { P, other, placed: [], base: [{ at: A, a0: ccwStart(A, O, X), w: angAt(A, O, X) }, { at: X, a0: ccwStart(X, O, A), w: angAt(X, O, A) }] };
        S.proof.base.forEach((b, i) => { setFan(chips[i], b.at, b.a0, b.w, 0.016); chips[i].userData = { home: b.at, a0: b.a0, w: b.w, kind: 'base' }; chips[i].position.y = 0.0024; });
        sfx.clink({ freq: 1500, gain: 0.05 });
        if (dblNote) dblNote.userData.fade = now();
        layout(); return;
      }
    }
    // 剪光扇、拖底角：放到浮标附近就拼进浮标那里的角
    let held = -1;
    function cutDown() {
      if (!S.buoy || S.cut.length >= 2 || S.proof || held >= 0) return false;
      const i = S.cut.length, A = S.ship, w = theta();
      setFan(chips[i], A, ccwStart(A, B0, C0), w, 0.018); chips[i].userData = { home: A, a0: ccwStart(A, B0, C0), w, kind: 'cut' }; chips[i].position.y = 0.006;
      held = i; sfx.whoosh({ dur: 0.18, freq: 2600, gain: 0.05 }); return true;
    }
    function chipDown(i) { if (S.proof && !S.proofDone && chips[i].visible && !S.proof.placed.includes(i)) { held = i; return true; } return false; }
    function chipMove(q) { if (held < 0) return; const c = chips[held]; c.position.x = q[0]; c.position.z = -q[1]; c.position.y = 0.006; }
    function chipUp() {
      if (held < 0) return; const i = held, c = chips[i], u = c.userData, q = [c.position.x, -c.position.z]; held = -1;
      if (dist(q, O) > 0.03) { c.position.set(u.home[0], 0.0024, -u.home[1]); if (u.kind === 'cut') c.visible = false; return; }
      const list = u.kind === 'cut' ? S.cut : S.proof.placed, prev = list.reduce((s2, k) => s2 + chips[k].userData.w, 0);
      setFan(c, O, ccwStart(O, B0, C0) + prev, u.w, 0.028); c.position.y = 0.0026;
      list.push(i); sfx.clink({ freq: 1600, gain: 0.05 });
      if (list.length === 2) {
        const diff = chips[list[0]].userData.w + chips[list[1]].userData.w - central();
        if (u.kind === 'cut') {
          if (Math.abs(diff) < 0.01) { const row = board(`<span class="n">4</span>发现：<i>∠BAC</i> = ½<i>∠BOC</i>（<span class="ia">${fmt(DANGER)}</span> + <span class="ia">${fmt(DANGER)}</span> = <span class="ca">${fmt(central())}</span>）`, true); punch(O, `<span class="ia">${fmt(DANGER)}</span> + <span class="ia">${fmt(DANGER)}</span> = <span class="ca">${fmt(central())}</span>`, row); later(1800, () => { if (!S.proof) { chips.forEach((x) => (x.visible = false)); layout(); } }); }
          else { note(diff > 0 ? '拼多了：船不在圆上' : '没拼满：船不在圆上', add(O, [0.024, -0.0195])).userData.fade = now() + 1.4; later(2200, () => { S.cut = []; chips.forEach((x) => (x.visible = false)); layout(); story(); }); }
        } else {
          S.proofDone = true; { const x = nm(S.proof.other), row = board(`<span class="n">5</span>证明（1）圆心在边上：<i>OA</i> = <i>O${x}</i> ⇒ <i>∠A</i> = <i>∠${x}</i>；<i>∠BOC</i> = <i>∠A</i> + <i>∠${x}</i> = 2<i>∠A</i>`, true); punch(O, '<i>∠BOC</i> = 2<i>∠A</i>', row); }
          later(4500, () => { if (!S.proof) return; S.proof = 0; chips.forEach((x) => (x.visible = false)); layout(); story(); });
        }
      }
      layout(); story();
    }
    // 点：河灯（画出圆）、浮标（看两倍 / 拆成两块）、海面（等角线）
    const grow = (key, dur, done) => { const t0 = now(); const tick = () => { if (dead) return; S[key] = Math.min(1, (now() - t0) / dur); layout(); if (S[key] < 1) requestAnimationFrame(tick); else done?.(); }; tick(); };
    function tapLantern() { if (S.circle || lanterns.length < 5 || arcSpread() < 1.0) return; sfx.whoosh({ dur: 0.6, freq: 900, gain: 0.04 }); grow('circle', 1.6, () => { board(`<span class="n">1</span>船上看两座灯塔正好 ${fmt(DANGER)} 的点，连起来是一个过两座灯塔的圆，正好是浅滩的边。`); story(); }); }
    function tapBuoy() {
      if (S.circle < 1 || !S.walked) return;
      if (!S.buoy) { S.buoy = 1; sfx.clink({ freq: 1300, gain: 0.05 }); board(`<span class="n">3</span><b>圆心角</b>：<i>∠BOC</i> = <span class="ca">${fmt(central())}</span>，和 <i>∠BAC</i> 对着同一条弧 <i>BC</i>。`); layout(); story(); return; }
      if (S.proofDone && !S.proof && zone() === 'on') { S.caseMode = !S.caseMode; sfx.clink({ freq: 1500, gain: 0.04 }); track(); layout(); story(); }          // 过船作直径 AD：情况（2）（3）拆成情况（1）
    }
    const openPanel = () => { ui?.go?.(2); ui?.fold?.(false); };
    const panelBack = () => { if (S.panelLater) { S.panelLater = false; later(700, openPanel); } };
    function tapSea() {
      if (!S.answered || S.family) return;
      sfx.whoosh({ dur: 1.2, freq: 600, gain: 0.05 });
      const t0 = now(); for (const n of notes) n.userData.fade = t0;
      grow('family', 2.4, () => { S.done = true; story(); board('<span class="n">7</span>推论：半圆（或直径）所对的圆周角是直角；90° 的圆周角所对的弦是直径。'); later(7000, () => { if (S.mode === 'deck') S.panelLater = true; else openPanel(); }); });
    }
    // 站到船头：镜头钻进盒子，从船上看两座灯塔；船头手边那卷海图点一下回来
    const chartRoll = new THREE.Group();
    const rollMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.014, 14).rotateZ(Math.PI / 2), basic({ color: 0xe9dcc0, depthTest: false, transparent: true }));
    rollMesh.renderOrder = 40;
    { const band = new THREE.Mesh(new THREE.CylinderGeometry(0.00232, 0.00232, 0.0016, 14).rotateZ(Math.PI / 2), basic({ color: 0x9b3b2c, depthTest: false, transparent: true })); band.renderOrder = 41; band.raycast = () => {};
      const t = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ map: labTex('回到海图', '#f6e8c8', 54), transparent: true, depthTest: false }))); t.scale.set(0.0105, 0.0036, 1); t.position.y = 0.0052; t.renderOrder = 41;
      chartRoll.add(rollMesh, band, t); chartRoll.visible = false; group.add(chartRoll); }
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
      look([tgt[0], Ty, -tgt[1]], d3.normalize().toArray(), dd, () => { S.mode = 'chart'; chartRoll.visible = false; caption.visible = true; layout(); subtitle(); panelBack(); }, { minEl: 0, minZoom: 0.6 });
    }
    let deckT0 = 0;
    function toDeck() { S.mode = 'deck'; deckT0 = now(); chartRoll.visible = true; caption.visible = false; deckLook(); layout(); subtitle(); sfx.whoosh({ dur: 0.5, freq: 700, gain: 0.04 }); }
    function toChart() { S.mode = 'chart'; chartRoll.visible = false; caption.visible = true; layout(); subtitle(); back(); panelBack(); }
    // 船头视角里：按住拖——往上拖往前开（离灯塔近一点），左右拖往旁边开
    let deckDrag = null;
    const deckPointer = {
      down: (r, e) => { if (S.mode !== 'deck') return false; if (r.intersectObject(rollMesh, false).length) { toChart(); return true; } deckDrag = { x: e?.clientX ?? 0, y: e?.clientY ?? 0, raw: S.ship.slice() }; return true; },
      move: (r, e) => { if (S.mode !== 'deck') return false; if (!deckDrag || !e) return true; const dx = e.clientX - deckDrag.x, dy = e.clientY - deckDrag.y; const raw = add(deckDrag.raw, add(mul(eye().dir, -dy * 0.00022), mul([eye().dir[1], -eye().dir[0]], dx * 0.00022)));
        deckDrag = { x: e.clientX, y: e.clientY, raw: [clamp(raw[0], SEA.u0 + 0.009, SEA.u1 - 0.009), clamp(raw[1], SEA.v0 + 0.009, SEA.v1 - 0.013)] }; moveShip(deckDrag.raw); deckLook(); return true; },
      up: () => { if (S.mode !== 'deck') return false; deckDrag = null; return true; },
    };
    const canShip = () => S.mode === 'chart' && !(S.proof && !S.proofDone);          // 讲证明的时候船先停在那里（光正好照过浮标），好拖那两个底角
    const canCut = () => S.mode === 'chart' && !!S.buoy && S.cut.length < 2 && !S.proof && zone() === 'on';
    const canBase = (i) => S.mode === 'chart' && !!S.proof && chips[i].visible && !S.proof.placed.includes(i);
    const canSea = () => S.mode === 'chart' && ((!S.circle && lanterns.length >= 5 && arcSpread() >= 1.0) || (S.answered && !S.family));
    const canBuoy = () => S.mode === 'chart' && S.walked && (!S.buoy || (S.proofDone && !S.proof && zone() === 'on'));
    const drags = [
      { obj: K.cut, plane: 'xz', offset: 0.006 + INK_Y, hint: () => (canCut() ? '按住拖出来：剪下这块光' : ''), enabled: () => canCut(), onStart: () => cutDown(), onDrag: (p) => chipMove(uv(p)), onEnd: () => chipUp() },
      ...chips.map((c, i) => ({ obj: c, plane: 'xz', offset: 0.006 + INK_Y, hint: () => (canBase(i) ? '拖到浮标那里' : ''), enabled: () => canBase(i), onStart: () => chipDown(i), onDrag: (p) => chipMove(uv(p)), onEnd: () => chipUp() })),
      { obj: K.ship, plane: 'xz', offset: 0.004, keepOffset: false, hint: () => (canShip() ? '拖着小船开；点一下站到船头' : ''), enabled: () => canShip(), onDrag: (p) => moveShip(uv(p)), onTap: () => toDeck() },
    ];
    const taps = [
      { obj: buoy, hint: () => (!canBuoy() ? '' : !S.buoy ? '点浮标' : S.caseMode ? '点浮标：收起直径' : '点浮标：过船作直径'), enabled: () => canBuoy(), onTap: () => tapBuoy() },
      { obj: sea, hint: () => (!canSea() ? '' : S.circle ? '点海面：每个地方看两盏灯是多少度' : '点河灯'), enabled: () => canSea(), onTap: (ray) => { if (!S.circle) return tapLantern(); tapSea(); void ray; } },
    ];
    const dragApi = draggable(group, drags, { taps, onClick: () => false });
    let heard = false;
    const pointer = { down: (r, e) => { if (!heard) { heard = true; audio(); } return deckPointer.down(r, e) || dragApi.down(r, e); }, move: (r, e) => deckPointer.move(r, e) || dragApi.move(r, e), up: (r, e) => deckPointer.up(r, e) || dragApi.up(r, e), items: dragApi.items };

    // 清场重来（给老师：换一批学生，或者想重新讲一遍）——键盘 R
    function reset() { for (const l of lanterns) group.remove(l.g); lanterns.length = 0; for (const n of notes) group.remove(n); notes.length = 0; dblNote = null; boardRows.length = 0; if (boardEl) boardEl.innerHTML = ''; chips.forEach((c) => (c.visible = false)); held = -1; const wasDeck = S.mode === 'deck'; S = fresh(); if (wasDeck) toChart(); layout(); story(); }
    const onKey = (e) => { if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !e.target?.closest?.('input,textarea')) reset(); };
    addEventListener('keydown', onKey);

    layout(); story();
    return {
      group: root, card: false, place: 'spread', scale: 0.95,
      size: { w: 0.36, d: 0.27, h: 0.075 },
      view: { elev: 47, azim: 0, lookY: 0.03, frameMargin: 1.02 },
      pointer,
      mount(u) { ui = u; boardEl = document.createElement('div'); boardEl.className = 'ins-board'; u.controls?.append(boardEl); for (const r of boardRows) { boardEl.append(r); r.classList.add('in'); } promptKey = ''; say(...capNow); },
      dispose() { dead = true; removeEventListener('keydown', onKey); subEl.remove(); punchEl.remove(); css.remove(); },
      update() {
        const t = now();
        settle();
        if (S.mode === 'deck' && chartRoll.visible) { rollAt(camera); const k = clamp((t - deckT0 - 0.6) / 0.5, 0, 1); chartRoll.traverse((o) => { if (o.material) o.material.opacity = k; }); }
        waves.offset.x = (t * 0.004) % 1; waves.offset.y = Math.sin(t * 0.3) * 0.004;
        void LH;
        boat.position.y = 0.0003 + 0.0004 * Math.sin(t * 2.1); boat.rotation.z = 0.04 * Math.sin(t * 1.7);
        for (const l of lanterns) { l.g.scale.setScalar(Math.min(1, (t - l.g.userData.born) / 0.6)); l.g.position.y = 0.0004 * Math.sin(t * 2 + l.p[0] * 90); }
        for (const n of notes) n.material.opacity = Math.min(0.95, (t - n.userData.born) / 1.2) * (n.userData.fade ? clamp(1 - (t - n.userData.fade) / 0.8, 0, 1) : 1);
        const callBuoy = (S.walked && !S.buoy) || (S.proofDone && !S.proof && !S.theorem && !S.caseMode);          // 该点浮标的时候，浮标的灯一闪一闪
        { const ring = buoy.userData.halo, k = Math.sin(t * 3) ** 2; ring.material.opacity = callBuoy ? 0.3 + 0.55 * k : 0; ring.scale.setScalar(callBuoy ? 1 + 0.18 * k : 1); }
        if (S.proof && !S.proofDone) chips.forEach((c, i) => { if (!S.proof.placed.includes(i) && held !== i) c.material.opacity = 0.6 + 0.35 * Math.sin(t * 3.2 + i) ** 2; else c.material.opacity = 0.85; });          // 两个底角一闪一闪：能拿起来
        if (S.family > 0) { group.updateMatrixWorld(); contour.material.uniforms.inv.value.copy(group.matrixWorld).invert(); }
      },
      debug: {
        get S() { return S; },
        lanterns, notes, board: boardRows, H, punch, labels: () => [...Object.values(LB), ...conLabs, conDanger], cap: () => capNow, theta, central, moveShip, tapLantern, tapBuoy, tapSea, cutDown, chipDown, chipMove, chipUp, toDeck, toChart, reset, onCirc, O, B0, C0,
        qa: [
          { name: '在海上来回开，放河灯', run: () => { for (let k = 0; k <= 320; k++) { const t = (k / 320) * TAU * 2; moveShip([0.12 * Math.cos(t * 1.3), -0.04 + 0.08 * Math.sin(t)]); } }, wait: 1 },
          { name: '点一盏河灯：画出圆', run: () => tapLantern(), wait: 3 },
          { name: '沿着圆开一段', run: () => { for (let k = 0; k <= 40; k++) moveShip(onCirc(-1.0 - k * 0.02)); }, wait: 1 },
          { name: '点浮标', run: () => tapBuoy(), wait: 1 },
          { name: '剪两块拼到浮标', run: () => { moveShip(onCirc(-1.2)); for (let i = 0; i < 2; i++) { cutDown(); chipMove(O); chipUp(); } }, wait: 3 },
          { name: '开到一束光照过浮标的地方，拖两个底角', run: () => { moveShip(sub(mul(O, 2), B0)); for (let i = 0; i < 2; i++) { chipDown(i); chipMove(O); chipUp(); } }, wait: 2 },
          { name: '沿圆开到别处，点浮标作直径：圆心在里面、在外面', run: () => { moveShip(onCirc(-Math.PI / 2)); tapBuoy(); moveShip(onCirc(-0.3)); }, wait: 11 },
          { name: '开进浅滩、开出浅滩', run: () => { moveShip([0.0, -0.04]); moveShip([0.13, -0.12]); }, wait: 5 },
          { name: '点海面：等角线', run: () => tapSea(), wait: 4 },
        ],
      },
    };
  },
};
