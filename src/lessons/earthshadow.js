// 数学 七年级下册 7.2.3 平行线的性质 · 图7.2-9（课本第 15–17 页）。情境：埃拉托色尼用影子量地球。
// 克莱奥梅德斯记下了他的办法，关键一句就是课本这一条：“直线落在平行直线上，内错角相等。”
//
// 一个石台立在课本上，台上先后是两样东西：一瓣地球（先是一根平平的石柱，顶上是从亚历山大城到西埃涅的那一条埃及），
// 和亚历山大城图书馆的大厅（屋顶两个小孔漏下两束平行的阳光）。
// 主线：开头的问题 → 进图书馆：两束平行光、一根长杆（截线）——同位角滑过去盖住（性质 1），滑过去再转半圈盖住内错角
//   （性质 2，带着做），同旁内角拼成平角（性质 3，学生自己）→ 回到大地：平的大地两根木杆平行，影子应当一样；
//   把大地弯过来对上影子，两根木杆交于地心 → 影子的角顺着木杆滑到地心（内错角）→ 50 瓣拼满地球 → 答开头的问题。
// 场景只给数学让路：石头、沙、地层都是压低了的颜色；画面里最亮、最饱和的是阳光（平行线）和角片。
// 所有角度、长度按真几何算：两城在地心张开一整圈的 1/50（7.2°），地球半径是两城距离的 50/2π 倍。
import * as THREE from 'three';
import { add, sub, mul, unit, ang, dist, wrap, clamp, lerp, easeOut } from './kit/sheet.js';
import { draggable } from './kit/interact.js';
import { sfx, audio } from './kit/audio.js';

const TAU = Math.PI * 2, DEG = 180 / Math.PI;
const FL = 0.04, PW = 0.36, PD = 0.18;                       // 石台：顶面高（大厅地面）、宽、深
const HX = 0.165, HZ = 0.075, HY = FL + 0.18;                // 大厅：内墙左右、后墙、天花板底面
const BETA = 24 / DEG, DIR = [Math.sin(BETA), -Math.cos(BETA)];   // 正午的阳光偏离竖直 24°；光往下走的方向
const HOLES = [[0.015, HY], [-0.085, HY]];                    // a（右）、b（左）两个小孔
const PIV = [-0.004, FL + 0.088];                            // 长杆转动的中心（两束光之间）
const RA = 0.026;                                            // 大厅里角片的半径
const THETA = TAU / 50;                                      // 两城在地心张开一整圈的 1/50
const R = 0.27, L = R * THETA, XS = 0.017, T = 0.03;          // 一瓣地球：半径、两城间的弧长、西埃涅的 x、厚度
const S0 = -0.12, S1 = 1.07;                                 // 那一条埃及：亚历山大城 s = 0（北边一点海），西埃涅 s = 1（南边一点沙漠）
const HS = 0.012, RE = 0.032, ZM = T / 2 + 0.002;              // 木杆高；地球上角片的半径；地球上数学那一层（切面前面一点）
const FRONT = [0, Math.sin(0.2), Math.cos(0.2)];             // 正面稍高一点看：比角时镜头放正
const LOW = [0, Math.sin(0.17), Math.cos(0.17)];             // 看那一瓣地球：低一点平视，石台只露一条边

export default {
  id: 'earthshadow',
  fig: '图7.2-9',
  title: '平行线的性质',
  flow: 'explore',
  ask: '两千多年前，有人没离开埃及，只靠一根木杆的影子，就量出了地球有多大。<br>他是怎么量的？',
  need: '先研究两束平行的阳光：一根长杆横过去，角之间有什么关系？',
  conclusion: {
    page: 22, rect: [40, 250, 460, 668],
    quote: '两条平行直线被第三条直线所截，同位角相等；内错角相等；同旁内角互补。简单说成：两直线平行，同位角相等；两直线平行，内错角相等；两直线平行，同旁内角互补。',
    why: '一根长杆横过两束平行的阳光：一个交点上的四个角，顺着长杆滑到另一个交点，正好盖住——同位角相等。同位角滑过去，再绕交点转半圈（对顶角），盖住内错角——内错角相等。同旁内角的一块滑过去，和另一块拼成一个平角——同旁内角互补。<br><br>埃拉托色尼的办法：太阳很远，照到西埃涅和亚历山大城的光是平行线；两根木杆都指向地心。亚历山大城的木杆延长到地心，截这两条平行线：木杆顶上影子的角，和两城在地心张开的角是内错角，所以相等，都是一整圈的 1/50。两城相距 5000 斯塔德，地球一圈就是 25 万斯塔德（斯塔德有几种长度，大约 4 万千米）。',
    src: '课本第 15–17 页 · 7.2.3 平行线的性质；埃拉托色尼的办法见克莱奥梅德斯的记载',
  },

  create({ aim, camera }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    let ui = null, dead = false;
    const T0 = performance.now(), now = () => (performance.now() - T0) / 1000;
    const later = (ms, f) => setTimeout(() => { if (!dead) f(); }, ms);
    const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    const basic = (o) => new THREE.MeshBasicMaterial(o);
    const lit = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o });
    const quiet = (m) => { m.raycast = () => {}; m.userData.noFrame = true; return m; };
    const solid = (m) => { m.castShadow = true; m.receiveShadow = true; m.raycast = () => {}; m.userData.noFrame = true; return m; };
    const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    const neg = (v) => [-v[0], -v[1]];
    const rotv = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
    const sector = (r1, r2) => { const a1 = ang(r1), a2 = ang(r2), d = wrap(a2 - a1); return d > 0 ? [a1, d] : [a2, -d]; };          // 两条射线夹的那个角：起始方向、张角
    const cross = (p, d, q, e) => { const den = d[0] * e[1] - d[1] * e[0]; return add(p, mul(d, ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / den)); };          // 直线 p + s·d 和 q + r·e 的交点

    // ================= 颜色：场景压低，数学最亮 =================
    const GOLD = 0xf29a16, PA = 0xd6457a, PB = 0x1f9e93, BLUE = 0x2f86e8, INKC = 0x2b3542;          // 阳光（平行线）；两族角；地心的槽；截线
    // 取景：只认这几个看不见的框，按阶段换
    const proxyMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const proxy = () => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), proxyMat); m.raycast = () => {}; m.visible = false; group.add(m); return m; };
    const PX = { hall: proxy(), earth: proxy(), top: proxy(), aspot: proxy(), disc: proxy() };
    const setBox = (m, x0, y0, z0, x1, y1, z1) => { m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.scale.set(Math.max(1e-4, x1 - x0), Math.max(1e-4, y1 - y0), Math.max(1e-4, z1 - z0)); };
    setBox(PX.hall, -PW / 2, 0, -PD / 2, PW / 2, HY + 0.012, PD / 2);
    setBox(PX.earth, -PW / 2, 0, PD / 2 - 0.01, PW / 2, FL + R + 0.022, PD / 2);
    let framed = '';
    const frameOn = (k, dir = k === 'hall' ? FRONT : LOW) => { framed = k; for (const n in PX) PX[n].visible = n === k; aim?.(dir); };

    // ================= 石台：两样东西都立在它上面；正面印着图下面那一句 =================
    const plinth = solid(new THREE.Mesh(new THREE.BoxGeometry(PW, FL, PD), lit({ color: 0xe8e0d1, roughness: 0.92 })));
    plinth.position.set(0, FL / 2, 0); plinth.userData.qaSupport = true; group.add(plinth);
    const CAP_W = PW - 0.02, CAP_PX = [2048, 228], CAP_H = (CAP_W * CAP_PX[1]) / CAP_PX[0];
    const capMesh = quiet(new THREE.Mesh(new THREE.PlaneGeometry(CAP_W, CAP_H), basic({ transparent: true, depthWrite: false, opacity: 0 })));
    capMesh.position.set(0, FL / 2, PD / 2 + 0.0004); capMesh.renderOrder = 6; capMesh.visible = false; group.add(capMesh);
    const cap = { key: '', born: -9, out: 1e9, next: null };
    let capNow = ['', ''];
    const ASK = '#26231f', GOLDTXT = '#a4520a', BLUETXT = '#1c5aa3';
    const capTex = (big, small, col) => tex(CAP_PX[0], CAP_PX[1], (g, W) => {
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      const fit = (txt, px, weight, maxW) => { for (let f = px; f >= 26; f -= 4) { g.font = `${weight} ${f}px "Songti SC","STSong","Times New Roman",serif`; if (g.measureText(txt).width <= maxW) return; } };
      const inked = (txt, y, fill, halo) => { g.shadowColor = 'rgba(250,247,240,0.9)'; g.shadowBlur = halo; g.lineWidth = halo * 0.7; g.strokeStyle = 'rgba(250,247,240,0.5)'; g.strokeText(txt, W / 2, y); g.shadowBlur = 0; g.fillStyle = fill; g.fillText(txt, W / 2, y); };
      fit(big, 96, 600, W - 80); inked(big, small ? 74 : 114, col, 12);
      if (small) { fit(small, 54, 500, W - 120); inked(small, 172, '#4a4741', 9); }
    });
    function lightText(big, small = '', col = ASK) {
      const key = `${big}|${small}|${col}`; if (key === cap.key) return; cap.key = key;
      capNow = [big, small]; if (ui?.status) ui.status(small ? `${big}　${small}` : big);
      const show = () => { capMesh.material.map?.dispose?.(); capMesh.material.map = capTex(big, small, col); capMesh.material.needsUpdate = true; capMesh.visible = true; cap.born = now(); cap.out = 1e9; };
      if (capMesh.visible && now() - cap.born > 0.2) { cap.out = now(); cap.next = show; } else show();
    }

    // ================= 板书：左边纸面板，做出一样写一行；课讲完点一行，场景摆回那一刻 =================
    const css = document.createElement('style');
    css.textContent = `
.es-board{margin:4px 0 6px;display:flex;flex-direction:column;gap:8px;font:15px/1.7 "Kaiti SC","STKaiti","Songti SC",serif;color:#2b2722}
.es-board .ib-row{opacity:0;transform:translateY(5px);transition:opacity .5s,transform .5s,background-color 2.4s;padding:3px 8px 3px 6px;border-radius:5px;border-left:3px solid transparent}
.es-board .ib-row.in{opacity:1;transform:none}
.es-board .ib-row.fresh{background:rgba(255,206,110,.34);border-left-color:#d98a2b}
.es-board .n{display:inline-block;min-width:1.25em;color:#b0532a;font-weight:700}
.es-board b{color:#8a2f1d}
.es-board i{font-family:"Times New Roman",serif;font-style:italic;letter-spacing:.02em}
.es-board .pa{color:#c23a6c;font-weight:600}.es-board .pb{color:#17877d;font-weight:600}.es-board .gd{color:#b8650c;font-weight:600}
.es-board .ib-h{font:600 12px/1.3 "PingFang SC","Hiragino Sans GB",sans-serif;color:#a07a45;letter-spacing:.3em;margin:6px 0 -4px;opacity:0;transition:opacity .4s}
.es-board .ib-h.in{opacity:1}
.es-board.review .ib-row[data-k]{cursor:pointer}.es-board.review .ib-row[data-k]:hover{background:rgba(255,206,110,.16)}
.es-board .ib-row.sel{background:rgba(255,206,110,.34);border-left-color:#d98a2b}`;
    document.head.append(css);
    let boardEl = null, lastH = ''; const boardRows = [];
    const reveal = (r) => { const body = boardEl?.closest('.p-body'); if (!body) return; setTimeout(() => { const rb = r.getBoundingClientRect(), bb = body.getBoundingClientRect(); if (rb.bottom > bb.bottom - 14) body.scrollBy({ top: rb.bottom - bb.bottom + 28, behavior: 'smooth' }); }, 80); };
    const board = (html, key = '', hold = false) => {
      const r = document.createElement('div'); r.className = 'ib-row'; r.innerHTML = html; r.dataset.k = key; boardRows.push(r);
      for (const o of boardRows) if (o !== r) o.classList.remove('fresh');
      if (boardEl) { boardEl.append(r); if (!hold) requestAnimationFrame(() => { r.classList.add('in', 'fresh'); reveal(r); }); }
      return r;
    };
    board.h = (title) => { if (title === lastH) return; lastH = title; const r = document.createElement('div'); r.className = 'ib-h'; r.textContent = title; boardRows.push(r); if (boardEl) { boardEl.append(r); requestAnimationFrame(() => { r.classList.add('in'); reveal(r); }); } };

    // ================= 画数学：线、角片、字母（都在一个竖直的面上） =================
    const beamTex = tex(64, 4, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); for (const [o, a] of [[0, 0], [0.18, 0.18], [0.36, 0.78], [0.5, 1], [0.64, 0.78], [0.82, 0.18], [1, 0]]) gr.addColorStop(o, `rgba(255,255,255,${a})`); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    beamTex.colorSpace = THREE.NoColorSpace;
    const line = (par, color, w, z, o = 1, dash = 0) => { const m = quiet(new THREE.Mesh(new THREE.BufferGeometry(), basic({ color, map: beamTex, transparent: true, opacity: o, depthWrite: false, side: THREE.DoubleSide }))); m.position.z = z; m.renderOrder = 5; m.userData.w = w * 2.4; m.userData.dash = dash; par.add(m); m.visible = false; return m; };
    const setLine = (m, pts) => {
      if (!pts || pts.length < 2) { m.visible = false; return; }
      const hw = m.userData.w / 2, dash = m.userData.dash, out = [], uvs = []; let acc = 0;
      const push = (p, q, n) => { out.push(p[0] + n[0], p[1] + n[1], 0, p[0] - n[0], p[1] - n[1], 0, q[0] + n[0], q[1] + n[1], 0, q[0] + n[0], q[1] + n[1], 0, p[0] - n[0], p[1] - n[1], 0, q[0] - n[0], q[1] - n[1], 0); uvs.push(0, 0.5, 1, 0.5, 0, 0.5, 0, 0.5, 1, 0.5, 1, 0.5); };
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], d = sub(b, a), l = Math.hypot(...d); if (l < 1e-7) continue;
        const n = [(-d[1] / l) * hw, (d[0] / l) * hw];
        if (!dash) push(a, b, n);
        else { let t = 0; while (t < l - 1e-9) { const ph = (acc + t) % (dash * 2), on = ph < dash, step = Math.max(1e-6, Math.min(l - t, on ? dash - ph : dash * 2 - ph)); if (on) push(add(a, mul(d, t / l)), add(a, mul(d, (t + step) / l)), n); t += step; } acc += l; }
      }
      m.geometry.dispose(); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); m.geometry = g; m.visible = out.length > 0;
    };
    // 角片：一块有亮边的彩色片（拿起来像实物），以顶点为原点
    const fan = (par, color, opacity, z) => {
      const m = new THREE.Mesh(new THREE.BufferGeometry(), basic({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
      m.position.z = z; m.renderOrder = 7; m.userData.noFrame = true; m.visible = false;
      const rim = new THREE.Mesh(new THREE.BufferGeometry(), basic({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide })); rim.position.z = 0.0002; rim.renderOrder = 8; rim.raycast = () => {}; rim.userData.noFrame = true; m.add(rim); m.userData.rim = rim;
      par.add(m); return m;
    };
    const setFan = (m, apex, a0, w, r) => {
      const n = Math.max(6, Math.ceil(Math.abs(w) / 0.04)), pos = [], rim = [], hw = 0.0004, pts = [[0, 0]];
      for (let i = 0; i < n; i++) { const t0 = a0 + (w * i) / n, t1 = a0 + (w * (i + 1)) / n; pos.push(0, 0, 0, Math.cos(t0) * r, Math.sin(t0) * r, 0, Math.cos(t1) * r, Math.sin(t1) * r, 0); }
      for (let i = 0; i <= n; i++) { const t = a0 + (w * i) / n; pts.push([Math.cos(t) * r, Math.sin(t) * r]); }
      pts.push([0, 0]);
      for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], d = sub(b, a), l = Math.hypot(...d); if (l < 1e-8) continue; const nx = (-d[1] / l) * hw, ny = (d[0] / l) * hw; rim.push(a[0] + nx, a[1] + ny, 0, a[0] - nx, a[1] - ny, 0, b[0] + nx, b[1] + ny, 0, b[0] + nx, b[1] + ny, 0, a[0] - nx, a[1] - ny, 0, b[0] - nx, b[1] - ny, 0); }
      m.geometry.dispose(); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); m.geometry = g;
      const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rim, 3)); m.userData.rim.geometry.dispose(); m.userData.rim.geometry = rg;
      m.position.x = apex[0]; m.position.y = apex[1]; m.visible = true;
    };
    // 字母和数：课本插图那样（斜体字母、宋体的数），白边垫底
    const measure = (font, txt) => { const g = document.createElement('canvas').getContext('2d'); g.font = font; return g.measureText(txt).width; };
    const labTex = (txt, col, px = 64) => { const f = /^[A-Z]$/.test(txt) ? `italic 500 ${px * 1.08}px "Times New Roman",serif` : `600 ${px}px "Times New Roman","Songti SC","STSong",serif`; return tex(Math.ceil(measure(f, txt)) + 40, Math.round(px * 1.5), (g, w, h) => { g.font = f; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = px * 0.12; g.strokeStyle = 'rgba(255,253,248,0.85)'; g.strokeText(txt, w / 2, h / 2 + 2); g.fillStyle = col; g.fillText(txt, w / 2, h / 2 + 2); }); };
    const label = (par, hgt) => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }))); sp.renderOrder = 20; sp.userData.h = hgt; sp.userData.k = ''; par.add(sp); sp.visible = false; return sp; };
    const setLabel = (sp, txt, col, p, z) => { if (!txt) { sp.visible = false; return; } const k = txt + col; if (sp.userData.k !== k) { sp.userData.k = k; const t = labTex(txt, col); sp.material.map?.dispose?.(); sp.material.map = t; sp.material.needsUpdate = true; sp.scale.set((sp.userData.h * t.image.width) / t.image.height, sp.userData.h, 1); } sp.position.set(p[0], p[1], z); sp.visible = true; };
    // 重拍：就地荡开一圈光、响一声
    const ripples = [];
    const ring = (par, p, z, col, delay = 0, grow = 0.03, peak = 0.75, life = 1.3) => { const m = quiet(new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 64), basic({ color: col, transparent: true, opacity: 0, depthWrite: false }))); m.position.set(p[0], p[1], z); m.scale.setScalar(0.006); m.visible = delay <= 0; Object.assign(m.userData, { born: now() + delay, grow, peak, life }); m.renderOrder = 9; par.add(m); ripples.push(m); };          // 一开始就是小圈（竖着的圈按 1 米大会一闪）
    const punch = (par, p, z, row) => { sfx.ding(1320, { gain: 0.07 }); ring(par, p, z, GOLD); ring(par, p, z, PA, 0.25); later(600, () => { if (row) { row.classList.add('in', 'fresh'); reveal(row); } }); };
    // 叫你动手的那一圈光
    const callRing = quiet(new THREE.Mesh(new THREE.RingGeometry(0.0085, 0.0105, 48), basic({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })));
    callRing.renderOrder = 9; group.add(callRing);
    let callAt = null;          // [父物体, 点, z]

    // ================= 状态 =================
    const fresh = () => ({ phase: 'earth', beat: '', call: '', phi: 16 / DEG, sp: 0, fits: [], held: '', p2: 0, p3: '', t: 0, snapped: false, strata: 0, q: 0, slid: false, disc: 0, dealt: 0, spinSign: 0, spinAcc: 0, spinLast: null, done: false, idleAt: 0, hint: 0 });
    let S = fresh();
    let runId = 0, speed = 1;

    // ================= 一、图书馆大厅 =================
    const hall = new THREE.Group(); hall.visible = false; group.add(hall);
    const wallMat = lit({ color: 0xc8b697, roughness: 0.93 }), backMat = lit({ color: 0xb4a284, roughness: 0.95 }), colMat = lit({ color: 0xd2c2a4, roughness: 0.9 }), floorMat = lit({ color: 0xd3c4a6, roughness: 0.95 });
    const box = (par, w, h, d, x, y, z, mat) => { const m = solid(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)); m.position.set(x, y, z); par.add(m); return m; };
    box(hall, 2 * HX + 0.024, HY - FL + 0.012, 0.012, 0, (HY + FL) / 2 + 0.006, -HZ - 0.006, backMat);          // 后墙
    for (const sx of [-1, 1]) box(hall, 0.012, HY - FL + 0.012, 2 * HZ + 0.012, sx * (HX + 0.006), (HY + FL) / 2 + 0.006, 0, wallMat);          // 两边的墙
    box(hall, 2 * HX, 0.0016, 2 * HZ, 0, FL + 0.0008, 0, floorMat);          // 地面
    { // 天花板：两个小孔，正午的阳光从这里进来
      const sh = new THREE.Shape(), x0 = -HX - 0.012, x1 = HX + 0.012, z1 = HZ + 0.012;
      sh.moveTo(x0, -z1); sh.lineTo(x1, -z1); sh.lineTo(x1, z1); sh.lineTo(x0, z1); sh.closePath();
      for (const h of HOLES) { const hp = new THREE.Path(); hp.absarc(h[0], 0, 0.0075, 0, TAU, true); sh.holes.push(hp); }
      const m = solid(new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false, curveSegments: 28 }).rotateX(-Math.PI / 2), wallMat)); m.position.y = HY; hall.add(m);
    }
    for (const cx of [-0.128, 0.128]) {          // 两根柱子，靠着两边的墙（不站在光的后面）
      const c = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0069, HY - FL - 0.012, 20), colMat)); c.position.set(cx, (HY + FL) / 2, -HZ + 0.013); hall.add(c);
      box(hall, 0.019, 0.006, 0.019, cx, HY - 0.003, -HZ + 0.013, colMat); box(hall, 0.019, 0.006, 0.019, cx, FL + 0.003, -HZ + 0.013, colMat);
    }
    { // 两边墙上的书架：一卷卷纸莎草（颜色压低，只在边上）
      const shelf = lit({ color: 0x9c8a6d, roughness: 0.95 }), scrollGeo = new THREE.CylinderGeometry(0.0021, 0.0021, 0.022, 10).rotateX(Math.PI / 2);
      const scrolls = new THREE.InstancedMesh(scrollGeo, lit({ color: 0xe2d3b1, roughness: 0.8 }), 40); scrolls.castShadow = true; scrolls.raycast = () => {}; scrolls.userData.noFrame = true;
      let k = 0; const mtx = new THREE.Matrix4();
      for (const sx of [-1, 1]) {
        const nx = sx * 0.152;
        box(hall, 0.02, 0.13, 0.002, nx, FL + 0.08, -HZ + 0.001, shelf);
        for (let r2 = 0; r2 < 4; r2++) for (let c2 = 0; c2 < 5 && k < 40; c2++) { mtx.makeTranslation(nx - 0.0072 + c2 * 0.0036, FL + 0.03 + r2 * 0.028 + (c2 % 2) * 0.0035, -HZ + 0.012); scrolls.setMatrixAt(k++, mtx); }
      }
      scrolls.count = k; hall.add(scrolls);
    }
    // 两束阳光：柔和的光柱（就是光）+ 正中一条金线（这就是数学里的平行线）+ 地上一块亮斑 + 光里的浮尘
    const dotTex = tex(32, 32, (g) => { const r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 32, 32); });
    const BEAM_LEN = (HY - FL) / Math.cos(BETA);
    const beams = HOLES.map((h) => {
      const midp = add(h, mul(DIR, BEAM_LEN / 2)), land = add(h, mul(DIR, BEAM_LEN));
      const shaft = quiet(new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0062, BEAM_LEN, 20, 1, true), basic({ color: 0xffdfa3, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })));
      shaft.position.set(midp[0], midp[1], 0); shaft.rotation.z = ang(DIR) - Math.PI / 2; shaft.renderOrder = 2; hall.add(shaft);
      const glow = quiet(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, BEAM_LEN, 20, 1, true), basic({ color: 0xffd28a, transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })));
      glow.position.copy(shaft.position); glow.rotation.z = shaft.rotation.z; glow.renderOrder = 2; hall.add(glow);
      const spot = quiet(new THREE.Mesh(new THREE.CircleGeometry(0.0072, 32).rotateX(-Math.PI / 2), basic({ color: 0xffe2a6, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })));
      spot.scale.set(1 / Math.cos(BETA), 1, 1); spot.position.set(land[0], FL + 0.0018, 0); spot.renderOrder = 3; hall.add(spot);
      const core = line(hall, GOLD, 0.0011, 0.0005, 1); setLine(core, [h, land]);
      const N = 110, pos = new Float32Array(N * 3), seed = Array.from({ length: N }, () => [Math.random(), (Math.random() - 0.5) * 0.011, (Math.random() - 0.5) * 0.011, Math.random() * TAU]);
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const dust = quiet(new THREE.Points(geo, new THREE.PointsMaterial({ map: dotTex, color: 0xfff1d6, size: 0.005, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true })));
      dust.renderOrder = 3; hall.add(dust);
      return { h, land, dust, seed };
    });
    // 长杆（截线）：木头做的，最精致的那样东西；整根都能抓
    const staff = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0019, 0.0019, 1, 14), lit({ color: 0x8b5b33, roughness: 0.5 }))); staff.position.z = 0.009; hall.add(staff);
    const staffPick = new THREE.Mesh(new THREE.BoxGeometry(1, 0.007, 0.005), basic({ visible: false })); staffPick.userData.pick = true; staffPick.userData.noFrame = true; staffPick.position.z = 0.009; hall.add(staffPick);          // 在角片后面：按在角片上拿角片，按在杆上转杆
    // 八个角：1–4 在 a 上的交点，5–8 在 b 上的交点；1、3、5、7 一族（玫红），2、4、6、8 一族（青）
    const pieces = Array.from({ length: 8 }, (_, i) => fan(hall, i % 2 === 0 ? PA : PB, 0.82, 0.0125 + i * 0.0001));
    const nums = Array.from({ length: 8 }, () => label(hall, 0.0115));
    const LBH = { a: label(hall, 0.013), b: label(hall, 0.013), c: label(hall, 0.013) };
    const semi = line(hall, INKC, 0.0007, 0.0125, 0.7, 0.0018);          // 平角：拼成一条直线时的半圆虚线
    const H = { d: [1, 0], E0: [0, 0], E1: [0, 0], Xa: [0, 0], Xb: [0, 0], w: [1, 0] };
    const angAt = (k) => { const u = DIR, w = H.w, P = [[u, w], [w, neg(u)], [neg(u), neg(w)], [neg(w), u]]; return sector(...P[k % 4]); };          // 课本的 1–4：（右，上）（上，左）（左，下）（下，右），这里“右”是顺着光往下，“上”是顺着长杆从 b 到 a
    const apexOf = (i) => (i < 4 ? H.Xa : H.Xb);
    const clipLen = (p, d) => { let tm = 1; for (const [lo, hi, i] of [[-HX + 0.004, HX - 0.004, 0], [FL + 0.004, HY - 0.004, 1]]) { if (d[i] > 1e-9) tm = Math.min(tm, (hi - p[i]) / d[i]); else if (d[i] < -1e-9) tm = Math.min(tm, (lo - p[i]) / d[i]); } return tm; };
    const busy = new Set();          // 正在动画的角片：layout 不去动它
    function layoutHall() {
      const d = [Math.cos(S.phi), Math.sin(S.phi)]; H.d = d;
      H.E0 = add(PIV, mul(d, -clipLen(PIV, neg(d)))); H.E1 = add(PIV, mul(d, clipLen(PIV, d)));
      const mid2 = mul(add(H.E0, H.E1), 0.5), len = dist(H.E0, H.E1), rz = S.phi - Math.PI / 2;
      staff.position.x = mid2[0]; staff.position.y = mid2[1]; staff.scale.set(1, len, 1); staff.rotation.z = rz;
      staffPick.position.x = mid2[0]; staffPick.position.y = mid2[1]; staffPick.scale.set(len, 1, 1); staffPick.rotation.z = S.phi;
      H.Xa = cross(PIV, d, HOLES[0], DIR); H.Xb = cross(PIV, d, HOLES[1], DIR); H.w = unit(sub(H.Xa, H.Xb));
      for (let i = 0; i < 8; i++) {
        if (busy.has(i)) continue;
        const [a0, w] = angAt(i), X = apexOf(i), p = pieces[i];
        p.rotation.z = 0; setFan(p, X, a0, w, RA); p.visible = S.phase === 'hall' && shownPiece(i);
        const bis = a0 + w / 2; setLabel(nums[i], String(i + 1), '#2b2620', add(X, [Math.cos(bis) * (RA + 0.0075), Math.sin(bis) * (RA + 0.0075)]), 0.013); nums[i].visible = p.visible;
      }
      setLabel(LBH.a, 'a', '#1f2a3a', add(HOLES[0], mul(DIR, 0.024)), 0.013); setLabel(LBH.b, 'b', '#1f2a3a', add(HOLES[1], mul(DIR, 0.024)), 0.013); setLabel(LBH.c, 'c', '#1f2a3a', add(H.E1, mul(d, -0.012)), 0.013);
      for (const k in LBH) LBH[k].position.add(new THREE.Vector3(0.008, 0.004, 0));
    }
    const semiPts = (X) => { const a0 = ang(neg(H.w)), sg = wrap(ang(DIR) - a0) > 0 ? 1 : -1, pts = []; for (let k = 0; k <= 40; k++) { const a = a0 + (sg * Math.PI * k) / 40; pts.push(add(X, [Math.cos(a) * (RA + 0.004), Math.sin(a) * (RA + 0.004)])); } return pts; };          // 平角：从 −w 经过 +u（光往下）到 +w
    const shownPiece = (i) => {
      if (S.beat === 'p2') return [2, 4, 6].includes(i) || (S.p2 > 0 && i === 2);
      if (S.beat === 'p3') return i === 3 || i === 4;
      return true;
    };

    // ================= 二、一瓣地球 =================
    const earth = new THREE.Group(); group.add(earth);
    const NS = 30, NF = 22, NZ = 6;
    const grid = (nu, nv) => { const g = new THREE.BufferGeometry(), n = (nu + 1) * (nv + 1); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); const idx = []; for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, e = c + 1; idx.push(a, b, e, a, e, c); } g.setIndex(idx); g.userData = { nu, nv }; return g; };
    const fillGrid = (g, fn) => { const { nu, nv } = g.userData, P = g.attributes.position.array, Cc = g.attributes.color.array, col = new THREE.Color(); let k = 0; for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const r = fn(i / nu, j / nv, col); P[k] = r[0]; P[k + 1] = r[1]; P[k + 2] = r[2]; Cc[k] = col.r; Cc[k + 1] = col.g; Cc[k + 2] = col.b; k += 3; } g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere(); g.computeBoundingBox(); };
    const lift = (m, k) => { m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += diffuseColor.rgb * ${k.toFixed(2)};`); }; m.customProgramCacheKey = () => 'lift' + k; return m; };
    const earthMat = lift(lit({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide }), 0.42);
    const parts = { front: grid(NS, NF), back: grid(NS, NF), top: grid(NS, NZ), left: grid(NF, NZ), right: grid(NF, NZ), bottom: grid(NS, NZ) };
    const partMeshes = Object.values(parts).map((g) => { const m = solid(new THREE.Mesh(g, earthMat)); earth.add(m); return m; });
    // 颜色都压低：石膏白、沙、尼罗河的绿、海；地层按真实比例（地壳很薄，地幔到 45% 深，外核到 81%，再往里是内核）
    const C = { plaster: new THREE.Color(0xf6f2ea), crust: new THREE.Color(0xf4ecdc), mantle: new THREE.Color(0xecd2c0), outer: new THREE.Color(0xf2d9ac), inner: new THREE.Color(0xf8e8c4), sand: new THREE.Color(0xe7d6ae), field: new THREE.Color(0xa9bf8c), river: new THREE.Color(0x86b1bd), sea: new THREE.Color(0x92b9c6), base: new THREE.Color(0xc9bfae) };
    const strataCol = (frac, col) => { const c = frac < 0.012 ? C.crust : frac < 0.45 ? C.mantle : frac < 0.81 ? C.outer : C.inner; col.copy(c).multiplyScalar(1 + 0.035 * Math.sin(frac * 140)); return col; };
    const nileZ = (s) => 0.0034 * Math.sin(s * 8.5 + 0.6) - 0.002;
    const PHAROS = [-0.08, 0.004];
    const terrain = (s, zz, col) => {          // 高出地面多少；颜色
      const isl = Math.hypot((s - PHAROS[0]) * L, zz - PHAROS[1]) < 0.0032;
      if (s < -0.035 && !isl) { col.copy(C.sea); return -0.0006; }
      const dn = Math.abs(zz - nileZ(s));
      if (s > -0.02 && dn < 0.001) { col.copy(C.river); return -0.0003; }
      if (s > -0.02 && dn < 0.0042) { col.copy(C.field); return 0.0001; }
      col.copy(C.sand).multiplyScalar(1 + 0.03 * Math.sin(s * 41 + zz * 300)); return 0.0004 + 0.0003 * Math.sin(s * 37 + zz * 400) * Math.sin(zz * 230);
    };
    // 弯的程度 t（两城在地心张开的角）→ 这一瓣的样子：西埃涅一头不动，亚历山大城那头往下弯；t ≤ 1/50 圈时底下截在石台上
    let EF = null;
    function earthFrame(t, s0 = S0, s1 = S1) {
      const tt = Math.max(t, 1e-7), rho = L / tt, ytop = FL + Math.min(R, rho), Cc = [XS, ytop - rho];
      const g = (s) => (1 - s) * tt;
      const pt = (s) => [Cc[0] - rho * Math.sin(g(s)), Cc[1] + rho * Math.cos(g(s))];
      const nin = (s) => [Math.sin(g(s)), -Math.cos(g(s))];
      const D = (s) => { const p = pt(s), n = nin(s); return Math.min(rho, (p[1] - FL) / Math.max(1e-6, -n[1])); };
      return { t: tt, rho, ytop, C: Cc, pt, nin, D, s0, s1 };
    }
    function buildEarth() {
      const F = (EF = earthFrame(S.t, S.disc > 0 ? 0 : S0, S.disc > 0 ? 1 : S1)), k = S.strata, s = (u) => F.s0 + (F.s1 - F.s0) * u;
      const body = (u, v, col, zz) => { const ss = s(u), p = F.pt(ss), n = F.nin(ss), dd = v * F.D(ss); strataCol((dd / R), col).lerp(C.plaster, 1 - k); return [p[0] + n[0] * dd, p[1] + n[1] * dd, zz]; };
      fillGrid(parts.front, (u, v, col) => body(u, v, col, T / 2));
      fillGrid(parts.back, (u, v, col) => body(u, v, col, -T / 2));
      fillGrid(parts.top, (u, v, col) => { const ss = s(u), zz = -T / 2 + v * T, h = terrain(ss, zz, col), p = F.pt(ss), n = F.nin(ss); return [p[0] - n[0] * h, p[1] - n[1] * h, zz]; });
      fillGrid(parts.left, (u, v, col) => body(0, u, col, -T / 2 + v * T));
      fillGrid(parts.right, (u, v, col) => body(1, u, col, -T / 2 + v * T));
      fillGrid(parts.bottom, (u, v, col) => { const r = body(u, 1, col, -T / 2 + v * T); col.copy(C.base); return r; });
    }
    // 地面上一点（s，深度方向 zz）的位置和“朝上”的方向
    const onGround = (s, lift = 0) => { const p = EF.pt(s), n = EF.nin(s); return add(p, mul(n, -lift)); };
    const upAt = (s) => neg(EF.nin(s));
    const place = (o, s, zz, lift = 0) => { const p = onGround(s, lift), u = upAt(s); o.position.set(p[0], p[1], zz); o.rotation.z = ang(u) - Math.PI / 2; };
    // 亚历山大城：灯塔（法罗斯）、几排房子、一根木杆；西埃涅：一口井、几间房子、一根木杆
    const plaster = lit({ color: 0xf3eee4, roughness: 0.6 });
    const pharos = new THREE.Group();
    { const b = solid(new THREE.Mesh(new THREE.BoxGeometry(0.0034, 0.0016, 0.0034), plaster)); b.position.y = 0.0008; const tw = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0008, 0.0012, 0.0062, 12), plaster)); tw.position.y = 0.0047; const lamp = solid(new THREE.Mesh(new THREE.SphereGeometry(0.0007, 10, 8), lit({ color: 0xffe2a0, emissive: 0xffb84a, emissiveIntensity: 1.6 }))); lamp.position.y = 0.0083; pharos.add(b, tw, lamp); }
    earth.add(pharos);
    const houses = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), plaster, 30); houses.castShadow = true; houses.receiveShadow = true; houses.raycast = () => {}; houses.userData.noFrame = true; earth.add(houses);
    const HOUSE = []; { let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 18; i++) HOUSE.push([-0.03 + rnd() * 0.16, -0.013 + rnd() * 0.02, 0.0012 + rnd() * 0.0012, 0.0011 + rnd() * 0.0015]);
      for (let i = 0; i < 8; i++) HOUSE.push([0.9 + rnd() * 0.12, -0.012 + rnd() * 0.013, 0.0011 + rnd() * 0.0009, 0.0009 + rnd() * 0.0008]); }
    const stickMat = lit({ color: 0x3e3226, roughness: 0.6 });
    const stickA = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.00048, 0.00055, HS, 8), stickMat)); earth.add(stickA);
    const stickS = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.00048, 0.00055, HS, 8), stickMat)); earth.add(stickS);
    const well = new THREE.Group();
    { const ringG = solid(new THREE.Mesh(new THREE.TorusGeometry(0.0019, 0.0006, 8, 20).rotateX(Math.PI / 2), lit({ color: 0xcfc2a8 }))); ringG.position.y = 0.0004; const hole = quiet(new THREE.Mesh(new THREE.CircleGeometry(0.0016, 20).rotateX(-Math.PI / 2), basic({ color: 0xfff0c8 }))); hole.position.y = 0.0002; well.add(ringG, hole); well.userData.hole = hole; }
    earth.add(well);
    // 地球上的数学：竖直的平行阳光（金）、木杆的延长线（截线，墨色虚线）、影子、角片、地心的槽
    const rays = Array.from({ length: 5 }, () => line(earth, GOLD, 0.0006, ZM, 0.95));
    const rayA2 = line(earth, GOLD, 0.0006, ZM, 0.65, 0.002), rayS2 = line(earth, GOLD, 0.0006, ZM, 0.95);          // a 光往地里延长（虚）；西埃涅那条光一直到地心
    const transA = line(earth, INKC, 0.0007, ZM + 0.0003, 0.85, 0.0022);          // 亚历山大城木杆往下延长
    const shadowA = line(earth, 0x4a4036, 0.0009, ZM, 0.8);
    const ghost = line(earth, INKC, 0.0006, ZM + 0.0004, 0.8, 0.0012);          // 记录里的那个角（虚线）
    const shadowPiece = fan(earth, PA, 0.85, ZM + 0.0006);          // 影子的角（拿起来滑到地心）
    const slot = fan(earth, BLUE, 0.16, ZM - 0.0003); slot.userData.rim.material.color.setHex(BLUE); slot.userData.rim.material.opacity = 0.95;          // 地心的那个角：一个槽
    const LBE = { A: label(earth, 0.0072), S: label(earth, 0.0072), O: label(earth, 0.009), rec: label(earth, 0.0062), n50: label(group, 0.016) };
    const aPick = new THREE.Mesh(new THREE.CircleGeometry(0.013, 20), basic({ visible: false })); aPick.userData.pick = true; aPick.userData.noFrame = true; earth.add(aPick);
    // 50 瓣：一瓣一瓣绕地心转（只有原来那一瓣上有埃及）
    const sliceGeo = (() => {
      const g = new THREE.BufferGeometry(), pos = [], col = [], c = new THREE.Color(), N = 6, M = 10;
      const P = (a, r, z) => [Math.cos(a) * r, Math.sin(a) * r, z];
      const push = (p, cc) => { pos.push(...p); col.push(cc.r, cc.g, cc.b); };
      for (const z of [T / 2, -T / 2]) for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) {          // 两个切面：按深度上色
        const a0 = Math.PI / 2 + (THETA * i) / N, a1 = Math.PI / 2 + (THETA * (i + 1)) / N, r0 = R * (1 - j / M), r1 = R * (1 - (j + 1) / M);
        const q = [[a0, r0], [a1, r0], [a1, r1], [a0, r0], [a1, r1], [a0, r1]];
        for (const [a, r] of q) push(P(a, r, z), strataCol(1 - r / R, c));
      }
      for (let i = 0; i < N; i++) { const a0 = Math.PI / 2 + (THETA * i) / N, a1 = Math.PI / 2 + (THETA * (i + 1)) / N; for (const [a, z] of [[a0, T / 2], [a1, T / 2], [a1, -T / 2], [a0, T / 2], [a1, -T / 2], [a0, -T / 2]]) push(P(a, R, z), C.sand); }          // 外面：沙
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
    })();
    const slices = new THREE.InstancedMesh(sliceGeo, lift(lit({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide }), 0.42), 49); { const cc = new THREE.Color(); for (let i = 0; i < 49; i++) slices.setColorAt(i, cc.setScalar(i % 2 ? 1 : 0.9)); }          // 相邻两瓣一深一浅，数得出 50 瓣
    slices.count = 0; slices.frustumCulled = false; slices.castShadow = true; slices.receiveShadow = true; slices.raycast = () => {}; slices.userData.noFrame = true; earth.add(slices);
    const spinPick = new THREE.Mesh(new THREE.CircleGeometry(R * 1.1, 48), basic({ visible: false })); spinPick.userData.pick = true; spinPick.userData.noFrame = true; spinPick.position.z = ZM; spinPick.visible = false; earth.add(spinPick);

    const aTop = () => add(onGround(0), mul(upAt(0), HS));          // 亚历山大城木杆的顶 T
    const sTop = () => add(onGround(1), mul(upAt(1), HS));
    function layoutEarth() {
      buildEarth();
      const F = EF, k = S.disc > 0;
      place(pharos, PHAROS[0], PHAROS[1], 0.0002); pharos.visible = !k;
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), sc = new THREE.Vector3();
      HOUSE.forEach(([s, zz, w, h], i) => { const p = onGround(s, h / 2), u = upAt(s); e.set(0, 0, ang(u) - Math.PI / 2); q.setFromEuler(e); v3.set(p[0], p[1], zz); sc.set(w, h, w * 0.9); m4.compose(v3, q, sc); houses.setMatrixAt(i, m4); });
      houses.count = k ? 0 : HOUSE.length; houses.instanceMatrix.needsUpdate = true;
      place(stickA, 0, T / 2 - 0.001, HS / 2); place(stickS, 1, T / 2 - 0.001, HS / 2); place(well, 0.955, T / 2 - 0.0035);
      stickA.visible = stickS.visible = well.visible = !k;
      const Ttop = aTop(), Stop = sTop(), top = F.ytop + 0.075, Cc = F.C;
      const ground = (x) => { const g = Math.asin(clamp((Cc[0] - x) / F.rho, -1, 1)); return [x, Cc[1] + F.rho * Math.cos(g)]; };
      const xs = [Ttop[0], XS, Ttop[0] - 0.002, Ttop[0] + 0.011, Ttop[0] + 0.023];
      xs.forEach((x, i) => setLine(rays[i], k ? null : [[x, top], i === 1 ? Stop : ground(x)]));
      const bottomY = Math.max(FL, Cc[1]);
      setLine(rayS2, k || S.beat === 'open' ? null : [Stop, [XS, bottomY]]);
      setLine(rayA2, k || !S.snapped ? null : [ground(Ttop[0]), [Ttop[0], FL]]);
      const toC = unit(sub(Cc, Ttop)), endA = Cc[1] >= FL - 1e-6 ? Cc : add(Ttop, mul(toC, (Ttop[1] - FL) / Math.max(1e-6, -toC[1])));
      setLine(transA, k || S.beat === 'open' ? null : [Ttop, endA]);
      setLine(shadowA, k ? null : [onGround(0, -0.0002), ground(Ttop[0])]);
      // 影子的角（木杆往下、光往下）和记录里的 1/50 圈
      const stickDown = EF.nin(0), lightDown = [0, -1];
      if (!S.slid && !k && S.beat !== 'open') { if (!busyE.has('piece')) { const [a0, w] = sector(stickDown, lightDown); shadowPiece.rotation.z = 0; if (w > 0.002) setFan(shadowPiece, Ttop, a0, w, RE); else shadowPiece.visible = false; } }
      else if (!S.slid) shadowPiece.visible = false;
      const showGhost = !k && !S.snapped && ['open', 'flat', 'bend'].includes(S.beat);
      if (showGhost) { const a1 = ang(stickDown), a0 = a1 - THETA, pts = [Ttop]; for (let i = 0; i <= 16; i++) { const a = a0 + (THETA * i) / 16; pts.push(add(Ttop, [Math.cos(a) * RE, Math.sin(a) * RE])); } pts.push(Ttop); setLine(ghost, pts); setLabel(LBE.rec, '1/50', '#5b4a3a', add(Ttop, [Math.cos(a0 + THETA / 2) * (RE + 0.006), Math.sin(a0 + THETA / 2) * (RE + 0.006)]), ZM + 0.001); }
      else { setLine(ghost, null); LBE.rec.visible = false; }
      if (S.snapped && !k) { setFan(slot, Cc, Math.PI / 2, THETA, RE); slot.visible = true; } else slot.visible = false;
      setLabel(LBE.A, k ? '' : 'A', '#1f2a3a', add(Ttop, [-0.007, 0.004]), ZM + 0.001);
      setLabel(LBE.S, k ? '' : 'S', '#1f2a3a', add(Stop, [0.007, 0.004]), ZM + 0.001);
      setLabel(LBE.O, S.snapped && !k ? 'O' : '', '#1f2a3a', add(Cc, [0.008, 0.006]), ZM + 0.001);
      const ap = onGround(0, 0.006); aPick.position.set(ap[0], ap[1], ZM);
      // 取景框：顶上那一段（弯大地时看清楚）
      const xa = Math.min(Ttop[0], onGround(S0)[0]) - 0.012, ya = Math.min(onGround(S0)[1], onGround(1)[1]) - RE - 0.004;          // 顶上那一段：连木杆顶下那个角一起看全
      setBox(PX.top, xa, ya, -T / 2, XS + 0.03, F.ytop + 0.03, T / 2);
      setBox(PX.aspot, Ttop[0] - 0.016, Ttop[1] - 0.014, -0.012, Ttop[0] + 0.016, Ttop[1] + 0.014, 0.012);
    }
    const busyE = new Set();

    // ================= 动画：补间（只滑、只转），一段一段 =================
    const tweens = [];
    const tween = (m, to, dur, done) => { for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].m === m) tweens.splice(i, 1); tweens.push({ m, from: { x: m.position.x, y: m.position.y, rz: m.rotation.z, s: m.scale.x }, to, t0: now(), dur: Math.max(0.01, dur / speed), done }); };
    const wait = (ms, id) => new Promise((r) => setTimeout(() => r(!dead && id === runId), ms / speed));
    const until = async (cond, id) => { while (!dead && id === runId && !cond()) await new Promise((r) => setTimeout(r, 100)); return !dead && id === runId; };
    const run = (ms, f, id) => new Promise((res) => { const t0 = now(); const step = () => { if (dead || id !== runId) return res(false); const k = Math.min(1, ((now() - t0) * 1000 * speed) / ms); f(k); if (k < 1) requestAnimationFrame(step); else res(true); }; step(); });
    const ease2 = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
    // 立起来 / 落回去：以石台顶面为底，竖着伸缩
    const pop = (obj, up, ms, id) => { obj.visible = true; const setY = (sy) => { obj.scale.set(1, Math.max(0.01, sy), 1); obj.position.y = FL * (1 - Math.max(0.01, sy)); };
      setY(up ? 0.01 : 1); return run(ms, (k) => setY(up ? easeOut(k) : 1 - ease2(k)), id).then((go) => { if (!up) { obj.visible = false; setY(1); } return go; }); };

    // ================= 动手 =================
    // 性质 1：a 上交点的四个角，一起顺着长杆滑到 b 上的交点
    function set1Move(sp) { S.sp = clamp(sp, 0, 1); const off = mul(sub(H.Xb, H.Xa), S.sp); for (let i = 0; i < 4; i++) { const X = add(H.Xa, off); pieces[i].position.x = X[0]; pieces[i].position.y = X[1]; pieces[i].position.z = 0.0135 + i * 0.0001; const [a0, w] = angAt(i), bis = a0 + w / 2; nums[i].position.set(X[0] + Math.cos(bis) * (RA + 0.0075), X[1] + Math.sin(bis) * (RA + 0.0075), 0.013); } }
    const projSp = (p) => { const v = sub(H.Xb, H.Xa), l2 = v[0] * v[0] + v[1] * v[1]; return ((p[0] - H.Xa[0]) * v[0] + (p[1] - H.Xa[1]) * v[1]) / l2; };
    let grabOff = 0;
    function set1Down(p) { if (S.call !== 'slide1' && S.call !== 'rotate') return false; for (let i = 0; i < 4; i++) busy.add(i); S.held = 'set1'; grabOff = projSp(p) - S.sp; sfx.whoosh({ dur: 0.18, freq: 2400, gain: 0.04 }); return true; }
    function set1Drag(p) { if (S.held !== 'set1') return; set1Move(projSp(p) - grabOff); S.idleAt = now(); }
    function set1Up() {
      if (S.held !== 'set1') return; S.held = '';
      const ok = S.sp > 0.72, t0 = now(), from = S.sp;
      run(260, (k) => set1Move(lerp(from, ok ? 1 : 0, easeOut(k))), runId).then(() => {
        if (!ok) { for (let i = 0; i < 4; i++) busy.delete(i); layoutHall(); return; }
        sfx.clink({ freq: 1600, gain: 0.05 }); ring(hall, H.Xb, 0.014, PA); ring(hall, H.Xb, 0.014, PB, 0.2);
        S.fits.push(S.phi); void t0;
        later(1300, () => { run(400, (k) => set1Move(1 - easeOut(k)), runId).then(() => { for (let i = 0; i < 4; i++) busy.delete(i); S.sp = 0; layoutHall(); }); });
      });
    }
    // 转长杆：绕中间那一点转
    function staffDown() { if (S.call !== 'rotate' && S.call !== 'slide1') return false; if (busy.size) return false; S.held = 'staff'; return true; }
    function staffDrag(p) { if (S.held !== 'staff') return; const v = sub(p, PIV); if (Math.hypot(...v) < 0.012) return; let a = Math.atan2(v[1], v[0]); if (a > Math.PI / 2) a -= Math.PI; if (a < -Math.PI / 2) a += Math.PI; S.phi = clamp(a, -34 / DEG, 52 / DEG); S.idleAt = now(); layoutHall(); }
    function staffUp() { if (S.held === 'staff') S.held = ''; }
    // 性质 2（带着做）：点 ∠3——它顺着长杆滑到 ∠7（同位角），再绕交点转半圈落到 ∠5（对顶角）
    function tap3() {
      if (S.call !== 'tap3' || S.p2) return; S.p2 = 1; S.call = ''; busy.add(2); const p = pieces[2], from = [...H.Xa], to = [...H.Xb];
      nums[2].visible = false; sfx.whoosh({ dur: 0.3, freq: 1800, gain: 0.04 });
      run(900, (k) => { const X = add(from, mul(sub(to, from), ease2(k))); p.position.x = X[0]; p.position.y = X[1]; p.position.z = 0.0135; }, runId).then((go) => {
        if (!go) return; S.p2 = 2; sfx.clink({ freq: 1500, gain: 0.04 }); setLabel(nums[2], '同位角', '#7a2a50', add(to, [0, -RA - 0.012]), 0.014);
        later(900, () => run(900, (k) => { p.rotation.z = Math.PI * ease2(k); }, runId).then((go2) => { if (!go2) return; S.p2 = 3; setLabel(nums[2], '对顶角', '#7a2a50', add(to, [0, -RA - 0.012]), 0.014); sfx.clink({ freq: 1700, gain: 0.05 }); }));
      });
    }
    // 性质 3（学生自己）：∠4、∠5 都能顺着长杆滑；滑到另一个交点，看能不能拼成一个平角
    function p3Down(i, p) { if (S.call !== 'p3' || S.p3) return false; S.held = 'p' + i; busy.add(i); grabOff = projSp(p) - (i === 3 ? 0 : 1); return true; }
    function p3Drag(p) {
      if (!S.held.startsWith('p')) return; const i = Number(S.held.slice(1)), sp = clamp(projSp(p) - grabOff, 0, 1), X = add(H.Xa, mul(sub(H.Xb, H.Xa), sp));
      pieces[i].position.x = X[0]; pieces[i].position.y = X[1]; pieces[i].position.z = 0.0135; pieces[i].userData.sp = sp; nums[i].visible = false; S.idleAt = now();
    }
    function p3Up() {
      if (!S.held.startsWith('p')) return; const i = Number(S.held.slice(1)); S.held = '';
      const sp = pieces[i].userData.sp ?? (i === 3 ? 0 : 1), goal = i === 3 ? 1 : 0, ok = Math.abs(sp - goal) < 0.28, from = sp;
      run(240, (k) => { const s2 = lerp(from, ok ? goal : 1 - goal, easeOut(k)), X = add(H.Xa, mul(sub(H.Xb, H.Xa), s2)); pieces[i].position.x = X[0]; pieces[i].position.y = X[1]; }, runId).then(() => {
        if (!ok) { busy.delete(i); layoutHall(); return; }
        S.p3 = i === 3 ? '4to8' : '5to1'; sfx.clink({ freq: 1600, gain: 0.05 });
        setLine(semi, semiPts(i === 3 ? H.Xb : H.Xa));
      });
    }
    // 回到大地：把亚历山大城那头往下弯（西埃涅一头不动）
    function bendDown() { if (S.call !== 'bend') return false; S.held = 'bend'; userTouched++; return true; }
    function bendDrag(p) {
      if (S.held !== 'bend') return; const Sx = [XS, FL + R], v = sub(Sx, p);          // 西埃涅到手指那条弦往下斜几度，弧就弯两倍那么多
      let t = 2 * Math.atan2(Math.max(0, Sx[1] - p[1]), Math.max(0.004, v[0])); t = clamp(t, 0, THETA * 1.6);
      if (Math.abs(t - THETA) < 0.009) t = THETA;          // 差半度以内就吸到 1/50 圈
      if (t === THETA && S.t !== THETA) sfx.clink({ freq: 1500, gain: 0.04 });
      S.t = t; S.idleAt = now(); layoutEarth();
    }
    function bendUp() { if (S.held !== 'bend') return; S.held = ''; if (S.t === THETA) { S.snapped = true; S.call = ''; layoutEarth(); } }
    // 影子的角：顺着木杆滑到地心，转半圈落进槽里
    let userTouched = 0;
    const projQ = (p) => { const Tt = aTop(), v = sub(EF.C, Tt), l2 = v[0] * v[0] + v[1] * v[1]; return ((p[0] - Tt[0]) * v[0] + (p[1] - Tt[1]) * v[1]) / l2; };
    function slideDown(p) { if (S.call !== 'slide') return false; S.held = 'slide'; busyE.add('piece'); grabOff = projQ(p) - S.q; return true; }
    function slideDrag(p) { if (S.held !== 'slide') return; S.q = clamp(projQ(p) - grabOff, 0, 1); const Tt = aTop(), X = add(Tt, mul(sub(EF.C, Tt), S.q)); shadowPiece.position.x = X[0]; shadowPiece.position.y = X[1]; shadowPiece.position.z = ZM + 0.002; S.idleAt = now(); }
    function slideUp() {
      if (S.held !== 'slide') return; S.held = ''; const ok = S.q > 0.7, from = S.q, Tt = aTop();
      run(300, (k) => { S.q = lerp(from, ok ? 1 : 0, easeOut(k)); const X = add(Tt, mul(sub(EF.C, Tt), S.q)); shadowPiece.position.x = X[0]; shadowPiece.position.y = X[1]; }, runId).then(() => {
        if (!ok) { busyE.delete('piece'); layoutEarth(); return; }
        sfx.whoosh({ dur: 0.4, freq: 1500, gain: 0.04 });
        run(800, (k) => { shadowPiece.rotation.z = Math.PI * ease2(k); }, runId).then(() => { S.slid = true; sfx.clink({ freq: 1700, gain: 0.05 }); });
      });
    }
    // 50 瓣：按住绕地心转，每转 1/50 圈多一瓣
    const toEarth = (p) => { earth.updateMatrix(); const v = new THREE.Vector3(p[0], p[1], 0).applyMatrix4(earth.matrix.clone().invert()); return [v.x, v.y]; };
    function spinDown(p) { if (S.call !== 'spin') return false; S.held = 'spin'; const q = toEarth(p); S.spinLast = Math.atan2(q[1] - EF.C[1], q[0] - EF.C[0]); return true; }
    function spinDrag(p) {
      if (S.held !== 'spin') return; const q = toEarth(p), a = Math.atan2(q[1] - EF.C[1], q[0] - EF.C[0]), da = wrap(a - S.spinLast); S.spinLast = a;
      if (!S.spinSign && Math.abs(da) > 0.02) S.spinSign = Math.sign(da);
      if (S.spinSign) { S.spinAcc = Math.max(0, S.spinAcc + da * S.spinSign); setDealt(Math.floor(S.spinAcc / THETA)); }
      S.idleAt = now();
    }
    function spinUp() { if (S.held !== 'spin') return; S.held = ''; if (S.dealt >= 5 && S.dealt < 49) autoDeal(); }
    function setDealt(n) {
      n = clamp(n, 0, 49); if (n === S.dealt) return; const m4 = new THREE.Matrix4(), sign = S.spinSign || 1;
      for (let i = S.dealt; i < n; i++) { m4.makeRotationZ(sign * (i + 1) * THETA); m4.setPosition(EF.C[0], EF.C[1], 0); slices.setMatrixAt(i, m4); if (i % 3 === 0) sfx.clink({ freq: 1100 + i * 12, gain: 0.02 }); }
      S.dealt = n; slices.count = n; slices.instanceMatrix.needsUpdate = true; if (slices.instanceColor) slices.instanceColor.needsUpdate = true;
    }
    function autoDeal() { const id = runId, from = S.dealt; run(1600, (k) => setDealt(Math.round(lerp(from, 49, ease2(k)))), id); }
    const grow = (key, dur) => run(dur * 1000, (k) => { S[key] = k; layoutEarth(); }, runId);

    // ================= 主线：场景带着走——先演、停在问题上、把关键那一下交给你 =================
    async function mainLine() {
      const id = ++runId;
      // 一、开场：一根石柱，顶上是从亚历山大城到西埃涅的那一条埃及；正午的阳光竖直照下来
      S.phase = 'earth'; S.beat = 'open'; hall.visible = false; earth.visible = true; layoutEarth(); frameOn('top');
      lightText('两千多年前，有人没离开埃及，只靠一根木杆的影子，就量出了地球有多大', '他是怎么量的？');
      if (!(await wait(700, id))) return; frameOn('top');
      if (!(await wait(3600, id))) return;
      lightText('夏至正午，西埃涅（S）的井底被太阳照亮，木杆没有影子', '同一时刻，亚历山大城（A）的木杆有影子：记录下来是一整圈的 1/50');
      if (!(await wait(5200, id))) return;
      lightText('同一个太阳、同一时刻，为什么一处有影子、一处没有？', '先去亚历山大城的图书馆，研究两束平行的阳光');
      if (!(await wait(4200, id))) return;
      // 二、钻进亚历山大城：图书馆的大厅
      if (!(await pop(earth, false, 600, id))) return;
      S.phase = 'hall'; S.beat = 'p1'; layoutHall(); frameOn('hall');
      if (!(await pop(hall, true, 900, id))) return;
      lightText('太阳离我们很远，照进来的两束光 a、b 可以看成平行线', '长杆 c 横过两束光，两个交点上各有四个角');
      if (!(await wait(4200, id))) return;
      lightText('a 上交点的四个角，和 b 上交点的四个角有什么关系？', '按住 a 上交点的角，顺着长杆滑到 b 上的交点'); S.call = 'slide1'; S.idleAt = now();
      if (!(await until(() => S.fits.length >= 1 && !busy.size, id))) return;
      board.h('探究'); const r1 = board('<span class="n">1</span>两条平行线被第三条直线所截，一个交点上的四个角滑到另一个交点，正好盖住：<span class="pa"><i>∠1</i> = <i>∠5</i></span>，<span class="pb"><i>∠2</i> = <i>∠6</i></span>，<span class="pa"><i>∠3</i> = <i>∠7</i></span>，<span class="pb"><i>∠4</i> = <i>∠8</i></span>（同位角）', 'p1', true); punch(hall, H.Xb, 0.015, r1);
      lightText('四块都正好盖住：同位角的度数相等', '改变截线 c 的位置，还成立吗？转一转长杆，再滑一次'); S.call = 'rotate'; S.idleAt = now();
      if (!(await until(() => S.fits.length >= 2 && Math.abs(S.fits[S.fits.length - 1] - S.fits[0]) > 12 / DEG && !busy.size, id))) return;
      S.call = '';
      board.h('性质'); const r2 = board('<span class="n">2</span><b>性质 1</b>　两条平行直线被第三条直线所截，同位角相等。（两直线平行，同位角相等）', 'p1', true); punch(hall, H.Xb, 0.015, r2);
      lightText('两条平行直线被第三条直线所截，同位角相等', '简单说成：两直线平行，同位角相等', GOLDTXT);
      if (!(await wait(5000, id))) return;
      // 三、性质 2（带着做）
      S.beat = 'p2'; layoutHall();
      lightText('埃拉托色尼要用的是内错角：∠3 和 ∠5 相等吗？', '点一下 ∠3，看它怎么走'); S.call = 'tap3'; S.idleAt = now();
      if (!(await until(() => S.p2 === 3, id))) return;
      const r3 = board('<span class="n">3</span><b>性质 2</b>　两条平行直线被第三条直线所截，内错角相等。（<span class="pa"><i>∠3</i> = <i>∠7</i></span>，同位角；<span class="pa"><i>∠7</i> = <i>∠5</i></span>，对顶角；所以 <span class="pa"><i>∠3</i> = <i>∠5</i></span>）', 'p2', true); punch(hall, H.Xb, 0.015, r3);
      lightText('两条平行直线被第三条直线所截，内错角相等', '∠3 滑过去是 ∠7（同位角），再转半圈是 ∠5（对顶角）：两直线平行，内错角相等', GOLDTXT);
      if (!(await wait(5600, id))) return;
      busy.delete(2); S.p2 = 0;
      // 四、性质 3（学生自己）
      S.beat = 'p3'; layoutHall();
      lightText('同旁内角 ∠4 和 ∠5 有什么关系？', '这一次请你自己推出来'); S.call = 'p3'; S.idleAt = now(); S.hint = 0;
      if (!(await until(() => S.p3, id))) return;
      S.call = '';
      const r4 = board(S.p3 === '4to8'
        ? '<span class="n">4</span><b>性质 3</b>　两条平行直线被第三条直线所截，同旁内角互补。（<span class="pb"><i>∠4</i> = <i>∠8</i></span>，同位角；<i>∠8</i> + <i>∠5</i> = 180°，邻补角；所以 <i>∠4</i> + <i>∠5</i> = 180°）'
        : '<span class="n">4</span><b>性质 3</b>　两条平行直线被第三条直线所截，同旁内角互补。（<span class="pa"><i>∠5</i> = <i>∠1</i></span>，同位角；<i>∠1</i> + <i>∠4</i> = 180°，邻补角；所以 <i>∠4</i> + <i>∠5</i> = 180°）', 'p3', true);
      punch(hall, S.p3 === '4to8' ? H.Xb : H.Xa, 0.015, r4);
      lightText('拼成一个平角：∠4 + ∠5 = 180°', '两条平行直线被第三条直线所截，同旁内角互补（两直线平行，同旁内角互补）', GOLDTXT);
      if (!(await wait(5600, id))) return;
      // 五、回到大地：平的大地上两根木杆平行；把大地弯过来
      setLine(semi, null); busy.clear(); S.p3 = '';
      lightText('回到埃拉托色尼的问题', '');
      if (!(await pop(hall, false, 600, id))) return;
      S.phase = 'earth'; S.beat = 'flat'; layoutEarth(); frameOn('top');
      if (!(await pop(earth, true, 900, id))) return;
      lightText('如果大地是平的：两根木杆都垂直于地面，它们互相平行', '平行的阳光照下来，木杆和阳光的夹角是同位角——两处应当一样，都没有影子');
      if (!(await wait(5600, id))) return;
      S.beat = 'bend'; layoutEarth();
      lightText('可亚历山大城的影子是一整圈的 1/50：大地不是平的', '按住亚历山大城那一头往下弯，直到它的影子和记录一样'); S.call = 'bend'; S.idleAt = now();
      if (!(await until(() => S.snapped, id))) return;
      frameOn('earth');
      board.h('量地球'); const r5 = board('<span class="n">5</span>大地若是平的，两根木杆平行，影子应当一样（同位角相等）；影子不一样，大地是弯的：两根木杆的延长线交于地心 <i>O</i>', 'bend', true); punch(earth, EF.C, ZM + 0.002, r5);
      if (!(await grow('strata', 1.2))) return;
      lightText('两根木杆的延长线交在一点：地心 O', '地心谁也去不了——那里的角有多大？');
      if (!(await wait(4400, id))) return;
      // 六、影子的角滑到地心
      S.beat = 'slide'; layoutEarth();
      lightText('a 光和 S 光平行，亚历山大城的木杆是截线', '按住影子的角，顺着木杆滑到地心'); S.call = 'slide'; S.idleAt = now();
      if (!(await until(() => S.slid, id))) return;
      S.call = '';
      const r6 = board('<span class="n">6</span>地心的角 = 影子的角 = 一整圈的 1/50（两直线平行，<span class="pa">内错角相等</span>）', 'slide', true); punch(earth, EF.C, ZM + 0.002, r6);
      lightText('地心的角 = 影子的角 = 一整圈的 1/50', '两直线平行，内错角相等：两千多年前，埃拉托色尼用的就是这一句', GOLDTXT);
      if (!(await wait(5600, id))) return;
      // 七、50 瓣拼成地球
      lightText('两城之间这一段，是地球一整圈的 1/50', '一整圈有多长？按住这一瓣，绕着地心转一圈');
      S.beat = 'disc'; S.disc = 1; shadowPiece.visible = false; layoutEarth();
      const kk = 0.45, tgt = [0, FL + R * kk + 0.006], C0 = [...EF.C];
      if (!(await run(1300, (k) => { const e = ease2(k), sc = 1 - (1 - kk) * e; earth.scale.setScalar(sc); earth.position.set(lerp(0, tgt[0] - sc * C0[0], e), lerp(0, tgt[1] - sc * C0[1], e), 0); }, id))) return;
      setBox(PX.disc, tgt[0] - R * kk - 0.01, FL, -0.02, tgt[0] + R * kk + 0.01, tgt[1] + R * kk + 0.012, 0.02); frameOn('disc');
      spinPick.position.set(C0[0], C0[1], ZM); spinPick.visible = true; S.call = 'spin'; S.idleAt = now();
      if (!(await until(() => S.dealt >= 49, id))) return;
      S.call = ''; spinPick.visible = false;
      const r7 = board('<span class="n">7</span>正好 50 瓣：地球一圈 = 50 × 5000 斯塔德 = 25 万斯塔德（约 4 万千米）', 'disc', true); punch(group, tgt, 0.03, r7);
      lightText('正好 50 瓣：地球一圈 = 50 × 5000 = 25 万斯塔德', '斯塔德有几种长度，折成今天的单位大约 4 万千米', GOLDTXT);
      if (!(await wait(5600, id))) return;
      // 八、答开头的问题
      board.h('应用'); board('<b>答</b>：亚历山大城木杆影子的角是一整圈的 1/50，它等于两城在地心张开的角（两直线平行，内错角相等）；两城相距 5000 斯塔德，地球一圈就是 25 万斯塔德。', 'ans');
      lightText('答：影子的角等于两城在地心张开的角，是一整圈的 1/50', '两城相距 5000 斯塔德，所以地球一圈约 25 万斯塔德', GOLDTXT);
      if (!(await wait(6000, id))) return;
      lightText('一根木杆的影子，一句“两直线平行，内错角相等”', '量出了整个地球', GOLDTXT);
      S.done = true; S.beat = 'end'; boardEl?.classList.add('review');
      if (!(await wait(4000, id))) return;
      ui?.go?.(2); ui?.fold?.(false);
    }

    // ================= 课讲完：点板书摆回那一刻 =================
    function pose(k) {
      if (!S.done || !k) return;
      runId++; tweens.length = 0; busy.clear(); busyE.clear(); setLine(semi, null);
      const hallK = ['p1', 'p2', 'p3'].includes(k);
      Object.assign(S, { phase: hallK ? 'hall' : 'earth', beat: hallK ? k : k === 'ans' ? 'disc' : k, call: '', p2: 0, p3: '', sp: 0, held: '' });
      hall.visible = hallK; earth.visible = !hallK; hall.scale.setScalar(1); hall.position.set(0, 0, 0);
      if (hallK) { S.phi = 16 / DEG; layoutHall(); if (k === 'p2') { busy.add(2); pieces[2].position.set(H.Xb[0], H.Xb[1], 0.0135); pieces[2].rotation.z = Math.PI; nums[2].visible = false; } frameOn('hall'); }
      else {
        S.t = THETA; S.snapped = true; S.strata = 1; S.slid = k !== 'bend'; S.disc = k === 'disc' || k === 'ans' ? 1 : 0;
        earth.scale.setScalar(1); earth.position.set(0, 0, 0); layoutEarth();
        if (S.slid && !S.disc) { busyE.add('piece'); const [a0, w] = sector(EF.nin(0), [0, -1]); setFan(shadowPiece, EF.C, a0, w, RE); shadowPiece.rotation.z = Math.PI; }
        if (S.disc) { const kk = 0.45, tgt = [0, FL + R * kk + 0.006], C0 = [...EF.C]; earth.scale.setScalar(kk); earth.position.set(tgt[0] - kk * C0[0], tgt[1] - kk * C0[1], 0); S.spinSign = 1; S.dealt = 0; setDealt(49); setBox(PX.disc, tgt[0] - R * kk - 0.01, FL, -0.02, tgt[0] + R * kk + 0.01, tgt[1] + R * kk + 0.012, 0.02); frameOn('disc'); }
        else frameOn('earth');
      }
      const caps = { p1: ['两条平行直线被第三条直线所截，同位角相等', '两直线平行，同位角相等'], p2: ['两条平行直线被第三条直线所截，内错角相等', '∠3 = ∠7（同位角），∠7 = ∠5（对顶角）'], p3: ['两条平行直线被第三条直线所截，同旁内角互补', '∠4 + ∠5 = 180°'], bend: ['大地是弯的：两根木杆的延长线交于地心 O', '大地若是平的，两处影子应当一样'], slide: ['地心的角 = 影子的角 = 一整圈的 1/50', '两直线平行，内错角相等'], disc: ['正好 50 瓣：地球一圈 = 50 × 5000 = 25 万斯塔德', '约 4 万千米'], ans: ['答：影子的角等于两城在地心张开的角，是一整圈的 1/50', '地球一圈约 25 万斯塔德'] };
      const c = caps[k]; if (c) lightText(c[0], c[1], GOLDTXT);
    }

    // ================= 拖动、点 =================
    const XY = (p) => [p.x, p.y];
    const can = (c) => () => S.call === c;
    const drags = [
      ...[0, 1, 2, 3, 4].map((i) => ({ obj: pieces[i], plane: 'xy', offset: 0.0135,
        hint: () => (S.call === 'tap3' && i === 2 ? '点一下' : S.call === 'p3' ? '顺着长杆滑' : (S.call === 'slide1' || S.call === 'rotate') && i < 4 ? '顺着长杆滑到另一个交点' : ''),
        enabled: () => S.phase === 'hall' && (((S.call === 'slide1' || S.call === 'rotate') && i < 4 && !busy.size) || (S.call === 'tap3' && i === 2) || (S.call === 'p3' && (i === 3 || i === 4) && !S.p3)),
        onStart: (p) => { if (S.call === 'p3') p3Down(i, XY(p)); else if (S.call !== 'tap3') set1Down(XY(p)); },
        onDrag: (p) => { if (S.held === 'set1') set1Drag(XY(p)); else if (S.held.startsWith('p')) p3Drag(XY(p)); },
        onEnd: () => { if (S.held === 'set1') set1Up(); else if (S.held.startsWith('p')) p3Up(); },
        onTap: () => { if (S.call === 'tap3' && i === 2) tap3(); } })),
      { obj: staffPick, plane: 'xy', offset: 0.009, hint: () => (S.call === 'rotate' || S.call === 'slide1' ? '转一转长杆' : ''), enabled: () => (S.call === 'rotate' || S.call === 'slide1') && !busy.size && S.phase === 'hall', onStart: () => staffDown(), onDrag: (p) => staffDrag(XY(p)), onEnd: () => staffUp() },
      { obj: aPick, plane: 'xy', offset: ZM, hint: () => (S.call === 'bend' ? '按住往下弯' : ''), enabled: can('bend'), onStart: () => bendDown(), onDrag: (p) => bendDrag(XY(p)), onEnd: () => bendUp() },
      { obj: shadowPiece, plane: 'xy', offset: ZM, hint: () => (S.call === 'slide' ? '顺着木杆滑到地心' : ''), enabled: can('slide'), onStart: (p) => slideDown(XY(p)), onDrag: (p) => slideDrag(XY(p)), onEnd: () => slideUp() },
      { obj: spinPick, plane: 'xy', offset: 0.0, hint: () => (S.call === 'spin' ? '按住绕地心转' : ''), enabled: can('spin'), onStart: (p) => spinDown(XY(p)), onDrag: (p) => spinDrag(XY(p)), onEnd: () => spinUp() },
    ];
    const dragApi = draggable(group, drags, { onClick: () => false });
    let heard = false;
    const pointer = { down: (r, e) => { if (!heard) { heard = true; audio(); } return dragApi.down(r, e); }, move: (r, e) => dragApi.move(r, e), up: (r, e) => dragApi.up(r, e), items: dragApi.items };

    // 清场重来（给老师）——键盘 R
    function reset() {
      runId++; tweens.length = 0; busy.clear(); busyE.clear(); boardRows.length = 0; if (boardEl) { boardEl.innerHTML = ''; boardEl.classList.remove('review'); } lastH = '';
      S = fresh(); cap.key = ''; capMesh.visible = false; setLine(semi, null); slices.count = 0; earth.scale.setScalar(1); earth.position.set(0, 0, 0); hall.scale.setScalar(1); hall.position.set(0, 0, 0); shadowPiece.rotation.z = 0;
      mainLine();
    }
    const onKey = (e) => { if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !e.target?.closest?.('input,textarea')) reset(); };
    addEventListener('keydown', onKey);

    layoutEarth();
    return {
      group: root, card: false, place: 'spread', scale: 0.95,
      size: { w: 0.36, d: 0.2, h: 0.32 },
      view: { elev: 12, azim: 0, lookY: 0.45, frameMargin: 1.04 },
      pointer,
      mount(u) {
        ui = u; boardEl = document.createElement('div'); boardEl.className = 'es-board' + (S.done ? ' review' : ''); u.controls?.append(boardEl);
        boardEl.addEventListener('click', (e) => { const r = e.target.closest?.('.ib-row'); if (!S.done || !r?.dataset.k) return; for (const o of boardRows) o.classList.remove('sel', 'fresh'); r.classList.add('sel'); sfx.clink({ freq: 1200, gain: 0.03 }); pose(r.dataset.k); });
        for (const r of boardRows) { boardEl.append(r); r.classList.add('in'); }
        ui.go?.(1); if (!runId) mainLine(); else if (cap.key) ui.status?.(capNow.filter(Boolean).join('　'));
      },
      dispose() { dead = true; runId++; removeEventListener('keydown', onKey); css.remove(); },
      update() {
        const t = now();
        // 图下面那一句：淡进淡出
        if (cap.out < 1e9) { const k = clamp(1 - (t - cap.out) / 0.35, 0, 1); capMesh.material.opacity = k; if (k <= 0) { cap.out = 1e9; const n = cap.next; cap.next = null; n?.(); } } else capMesh.material.opacity = clamp((t - cap.born) / 0.5, 0, 1);
        for (let i = tweens.length - 1; i >= 0; i--) { const w = tweens[i], k = clamp((t - w.t0) / w.dur, 0, 1), e = easeOut(k), f = w.from, o = w.to; w.m.position.x = lerp(f.x, o.x ?? f.x, e); w.m.position.y = lerp(f.y, o.y ?? f.y, e); w.m.rotation.z = lerp(f.rz, o.rz ?? f.rz, e); if (k >= 1) { tweens.splice(i, 1); w.done?.(); } }
        for (let i = ripples.length - 1; i >= 0; i--) { const m = ripples[i], u = m.userData, a = t - u.born; if (a < 0) continue; m.visible = true; if (a > u.life) { m.parent?.remove(m); m.geometry.dispose(); m.material.dispose(); ripples.splice(i, 1); continue; } m.scale.setScalar(0.006 + a * u.grow); m.material.opacity = u.peak * (1 - a / u.life); }
        // 光里的浮尘：慢慢往下飘
        if (hall.visible) for (const b of beams) { const p = b.dust.geometry.attributes.position.array, perp = [-DIR[1], DIR[0]]; b.seed.forEach(([s0, o1, o2, ph], i) => { const s = (s0 + t * 0.006) % 1, wob = 0.0012 * Math.sin(t * 0.7 + ph), q = add(add(b.h, mul(DIR, s * BEAM_LEN)), mul(perp, o1 + wob)); p[i * 3] = q[0]; p[i * 3 + 1] = q[1]; p[i * 3 + 2] = o2 + 0.0008 * Math.cos(t * 0.5 + ph); }); b.dust.geometry.attributes.position.needsUpdate = true; }
        // 该动手的东西一闪一闪；叫你动手的那一圈光
        const pulse = 0.55 + 0.35 * Math.sin(t * 3.2) ** 2;
        for (let i = 0; i < 8; i++) pieces[i].material.opacity = ((S.call === 'slide1' && i < 4) || (S.call === 'tap3' && i === 2) || (S.call === 'p3' && (i === 3 || i === 4) && !S.p3)) && !busy.has(i) ? pulse : 0.82;
        shadowPiece.material.opacity = S.call === 'slide' && !busyE.has('piece') ? pulse : 0.85;
        callAt = null;
        if (S.call === 'rotate' && hall.visible) callAt = [hall, add(H.E1, mul(H.d, -0.02)), 0.012];
        else if (S.call === 'bend' && earth.visible) callAt = [earth, onGround(0, 0.006), ZM + 0.001];
        else if (S.call === 'spin' && earth.visible) callAt = [earth, add(EF.C, [Math.cos(Math.PI / 2 + THETA / 2) * R * 0.75, Math.sin(Math.PI / 2 + THETA / 2) * R * 0.75]), ZM + 0.002];
        callRing.visible = !!callAt;
        if (callAt) { const [par, p, z] = callAt; if (callRing.parent !== par) par.add(callRing); const k = Math.sin(t * 3.2) ** 2; callRing.position.set(p[0], p[1], z); callRing.scale.setScalar((par === earth ? (S.call === 'spin' ? 2.2 : 0.55) : 1) * (1 + 0.25 * k)); callRing.material.opacity = 0.35 + 0.5 * k; }
        // 数到第几瓣
        if (S.call === 'spin' || (S.beat === 'disc' && S.dealt > 0)) { earth.updateMatrix(); const v = new THREE.Vector3(EF.C[0], EF.C[1] + R * 1.08, ZM).applyMatrix4(earth.matrix); setLabel(LBE.n50, `${S.dealt + 1}`, '#a4520a', [v.x, v.y], v.z + 0.01); } else LBE.n50.visible = false;
        // 卡住很久才一级一级给提示（真实时间，停手 3 秒以上才出）
        const idle = t - S.idleAt;
        if (S.call === 'p3' && !S.held) {
          const lv = idle > 26 ? 2 : idle > 13 ? 1 : 0;
          if (lv > S.hint) { S.hint = lv; if (lv === 1) lightText('同旁内角 ∠4 和 ∠5 有什么关系？', '把其中一块顺着长杆滑到另一个交点'); else { lightText('同旁内角 ∠4 和 ∠5 有什么关系？', '滑过去以后，它和另一块能不能拼成一个平角？'); setLine(semi, semiPts(H.Xb)); } }
        }
        if (S.call === 'bend' && !S.held && idle > 15 && S.hint < 5) { S.hint = 5; lightText('可亚历山大城的影子是一整圈的 1/50：大地不是平的', '按住 A 那一头往下拉，看它的影子跟着变长'); }
        if (S.call === 'slide' && !S.held && idle > 14 && S.hint < 6) { S.hint = 6; lightText('地心的角，和木杆顶上影子的角是什么关系？', '把影子的角顺着木杆一直滑到地心 O'); }
      },
      debug: {
        get S() { return S; }, board: boardRows, cap: () => capNow, H, get EF() { return EF; }, THETA, pieces, pose, reset,
        fast: (k) => { speed = k; }, group, hall, earth,
        set1: () => { if (S.call !== 'slide1' && S.call !== 'rotate') return; S.call = 'slide1'; set1Down(H.Xa); set1Drag(H.Xb); set1Up(); },
        rotate: (deg) => { S.phi = deg / DEG; layoutHall(); },
        tap3, p3: (i = 3) => { const from = i === 3 ? H.Xa : H.Xb, to = i === 3 ? H.Xb : H.Xa; if (!p3Down(i, from)) return; p3Drag(to); p3Up(); },
        bend: () => { if (!bendDown()) return; const Sx = [XS, FL + R], a = THETA / 2, p = [Sx[0] - Math.cos(a) * 0.03, Sx[1] - Math.sin(a) * 0.03]; bendDrag(p); bendUp(); },
        slide: () => { if (!slideDown(aTop())) return; slideDrag(EF.C); slideUp(); },
        spin: () => { if (S.call !== 'spin') return; S.spinSign = 1; setDealt(49); },
        qa: [
          { name: '快放：开场', run: () => { speed = 30; }, wait: 1 },
          { name: '性质1：四个角滑到另一个交点', run: () => { if (S.call !== 'slide1' && S.call !== 'rotate') return; S.call = 'slide1'; set1Down(H.Xa); set1Drag(H.Xb); set1Up(); }, wait: 3 },
          { name: '转长杆，再滑一次', run: () => { S.phi = 40 / DEG; layoutHall(); S.call = 'slide1'; set1Down(H.Xa); set1Drag(H.Xb); set1Up(); }, wait: 3 },
          { name: '性质2：点 ∠3', run: () => tap3(), wait: 3 },
          { name: '性质3：把 ∠4 滑到另一个交点', run: () => { if (!p3Down(3, H.Xa)) return; p3Drag(H.Xb); p3Up(); }, wait: 3 },
          { name: '把大地弯过来', run: () => { if (!bendDown()) return; const Sx = [XS, FL + R], a = THETA / 2; bendDrag([Sx[0] - Math.cos(a) * 0.03, Sx[1] - Math.sin(a) * 0.03]); bendUp(); }, wait: 3 },
          { name: '影子的角滑到地心', run: () => { if (!slideDown(aTop())) return; slideDrag(EF.C); slideUp(); }, wait: 3 },
          { name: '转一圈：50 瓣', run: () => { if (S.call !== 'spin') return; S.spinSign = 1; setDealt(49); }, wait: 3 },
        ],
      },
    };
  },
};
