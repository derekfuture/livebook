// 数学 八年级下册 20.1 勾股定理及其应用（课本 PDF 第 30–32 页，图 20.1-1 至 20.1-5）。
// 情境：《九章算术》里的“引葭赴岸”（课本习题里就有）：一个一丈见方的水池，芦苇长在正中央，出水一尺；
// 把芦苇拉到岸边，顶端正好到岸边的水面。水多深？芦苇多长？——水是浑的，看不见底。
// 一块院子立在书上：铺着一尺见方的青砖（正好当方格纸），右前方是水池，切开的一面看得见池水的剖面。
// 一个画面里讲完，每一步都由学生的那一下做出来：
//   拉芦苇到岸边：芦苇、水深、半个池宽围成直角三角形（勾 5，股 x，弦 x + 1）→ 直角三角形的三条边有什么关系？
//   院子里拉一个勾三股四的绳三角形，点三条边，各长出一个正方形：9、16，斜着的那个用“外面的大正方形减去 4 个三角形”数出 25（重拍 1：两矩共长二十有五）
//   拖木桩换几个直角三角形，每次都是 a² + b² = c²（重拍 2：猜想）
//   为什么？赵爽弦图：两个小正方形拼在一起，切成四个红色三角形和一个黄色正方形，把两块三角形转上去，正好是斜边上的正方形（重拍 3：出入相补，勾股定理）
//   回到水池：x² + 5² = (x + 1)²，x = 12；池水变清，看见池底（重拍 4）→ 答开头的问题。
import * as THREE from 'three';
import { clamp, lerp, easeOut } from './kit/sheet.js';
import { mathActionCue } from './kit/mathActionCue.js';
import { draggable } from './kit/interact.js';
import { sfx, audio } from './kit/audio.js';

const U = 0.0125;                                   // 1 尺 = 0.0125（活页的单位）；下面的数都以尺计
const TOP = 13;                                     // 地面高 13（池底以下还有 1 尺泥）
// 园子的轮廓（x 向右，w 向里）：从切口右端绕到切口左端；切口（w = 0）只在穿过水池的那一段，左前方往外鼓
const CTRL = [[12.6, 0], [13.3, 2.5], [13.1, 7], [13.6, 11.5], [12.4, 15.2], [8.5, 15.8], [4, 15.3], [-0.5, 15.9], [-5.5, 15.4], [-10, 15.8], [-13.6, 14.4], [-14.8, 10.5], [-14.2, 6], [-14.7, 2], [-13.4, -1.4], [-9.5, -2.2], [-5.5, -1.8], [-2.8, -1.3], [-1.4, 0]];
const PB = { x0: -14.8, x1: 13.6, w0: -2.2, w1: 15.9 };          // 园子的外框（取景用）
const PAVE = { x0: -12.6, x1: 0.2, w0: 0, w1: 12.6 };            // 青砖地：数方砖的那一片
const PX = 6, PH = 5, DEPTH = 12, REED = 13;        // 水池：中心 x = 6，半宽 5；水深 12，芦苇 13（学生先不知道）
const ROOT_Y = TOP - DEPTH;                         // 芦苇根（池底正中）
const TB = Math.asin(PH / REED);                    // 芦苇拉到岸边时偏离竖直的角
const P0 = [-8, 4];                                 // 方砖地上直角顶点（u 向右，w 向里）
const BLUE = 0x58c4dd, GREEN = 0x83c167, GOLD = 0xffc83d, RED = 0xfc6255, YEL = 0xfff0a0, WHITE = 0xf6f3ea;
const A_MIN = 2, A_MAX = 4, B_MAX = 4;          // 方砖上数：勾、股都取整数，勾至少 2（太细的三角形看不清）

export default {
  id: 'gougu',
  fig: '图20.1-3',
  title: '勾股定理',
  flow: 'explore',
  ask: '《九章算术》古题（现代转述）：正方形水池边长 1 丈（1 丈 = 10 尺）。池中央的芦苇露出水面 1 尺，拉向一边的中点时，顶端恰好碰到水面。<br>水有多深？芦苇有多长？',
  need: '先把芦苇拉到岸边中点。',
  conclusion: {
    page: 30, rect: [42, 40, 464, 675],
    quote: '如果直角三角形的两条直角边长分别为 a，b，斜边长为 c，那么 a² + b² = c²。',
    why: '在方砖地上数面积：以两条直角边为边的正方形面积相加，正好等于以斜边为边的正方形面积（斜着的正方形，用外面的大正方形减去 4 个直角三角形来数）。赵爽弦图说明了为什么：边长为 a，b 的两个正方形连在一起，面积是 a² + b²；切出的四个红色直角三角形全等。两条直角边不等长时，还有一个边长为 b − a 的黄色正方形；等长时，四个三角形恰好拼满。把左、右两个三角形移上去，就拼成以 c 为边长的正方形，面积是 c²。所以 a² + b² = c²，这就是勾股定理。<br><br>水池：半个池宽 5 尺、水深 x 尺、芦苇 x + 1 尺围成直角三角形，x² + 5² = (x + 1)²，x = 12。水深 12 尺，芦苇长 13 尺。',
    src: '课本 · 20.1 勾股定理及其应用（赵爽弦图）；水池的题出自《九章算术》，见本节习题',
  },

  create({ aim, tag, camera }) {
    const root = new THREE.Group(), world = new THREE.Group(); root.add(world);
    world.scale.setScalar(U); world.position.set(-((PB.x0 + PB.x1) / 2) * U, 0, ((PB.w0 + PB.w1) / 2) * U);
    let ui = null, dead = false;
    const T0 = performance.now(), now = () => (performance.now() - T0) / 1000;
    const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    const lit = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o });
    const quiet = (m) => { m.raycast = () => {}; m.userData.noFrame = true; return m; };
    const solid = (m) => { m.castShadow = true; m.receiveShadow = true; m.raycast = () => {}; m.userData.noFrame = true; return m; };
    const T = (u, w, l = 0.05) => new THREE.Vector3(u, TOP + l, -w);          // 方砖地上的点（u 向右，w 向里）
    const F = (x, y, l = 0.16) => new THREE.Vector3(x, y, l);                  // 正面切开的那一面上的点（在切面前面一点）
    const NT = new THREE.Vector3(0, 1, 0), NF = new THREE.Vector3(0, 0, 1);
    const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

    // ================= 园子：一块不规则的地，只在穿过水池的地方笔直切开；中间一片青砖地（数方砖用），四周是草 =================
    const outline = (() => { const c = new THREE.CatmullRomCurve3(CTRL.map(([x, w]) => new THREE.Vector3(x, w, 0)), false, 'centripetal'); return c.getPoints(220).map((p) => [p.x, p.y]); })();          // 从切口右端绕一圈到切口左端
    const plotPoly = [...outline, [1, 0], [1, 5], [11, 5], [11, 0]];          // 切口这一段笔直，水池那一块挖空
    const inPoly = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
    const grassTex = tex(1024, 1024, (g, w, h) => { g.fillStyle = '#9fb46a'; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 80; k++) { const x = Math.random() * w, y = Math.random() * h, r = 50 + Math.random() * 130, gr = g.createRadialGradient(x, y, 0, x, y, r), dry = Math.random() < 0.4; gr.addColorStop(0, dry ? 'rgba(190,186,120,0.22)' : 'rgba(118,146,76,0.2)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
      for (let k = 0; k < 9000; k++) { g.fillStyle = `rgba(${70 + Math.random() * 60},${100 + Math.random() * 50},${40 + Math.random() * 30},${Math.random() * 0.14})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 2 + Math.random() * 5); } });
    grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping; grassTex.repeat.set(1 / 13, 1 / 13);
    const BT = 0.1;          // 边上倒一点圆角
    const soilTex = tex(512, 1664, (g, w, h) => { const k = h / TOP;
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#4a3a26'); gr.addColorStop(0.035, '#3f3020'); gr.addColorStop(0.1, '#5c4530'); gr.addColorStop(0.14, '#8f6c48'); gr.addColorStop(0.5, '#a07d55'); gr.addColorStop(0.75, '#93714d'); gr.addColorStop(1, '#7d5f40'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let n = 0; n < 700; n++) { g.strokeStyle = `rgba(52,38,22,${0.3 + Math.random() * 0.4})`; g.lineWidth = 1 + Math.random(); const x = Math.random() * w; g.beginPath(); g.moveTo(x, 0.25 * k); g.lineTo(x + (Math.random() - 0.5) * 8, (0.35 + Math.random() * 0.8) * k); g.stroke(); }          // 草根
      for (let n = 0; n < 900; n++) { const y = 1.2 * k + Math.random() * (h - 1.2 * k); g.fillStyle = `rgba(${Math.random() < 0.5 ? '70,52,34' : '206,186,150'},${0.2 + Math.random() * 0.35})`; g.beginPath(); g.arc(Math.random() * w, y, 1 + Math.random() * 3.5, 0, 6.3); g.fill(); }
      for (const yy of [3.6, 6.8, 9.9]) { g.strokeStyle = 'rgba(90,66,42,0.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, h - yy * k); for (let x = 0; x <= w; x += 32) g.lineTo(x, h - yy * k + Math.sin(x * 0.05 + yy) * 6); g.stroke(); } });
    soilTex.wrapS = soilTex.wrapT = THREE.RepeatWrapping; soilTex.flipY = false; soilTex.repeat.set(1 / 4, 1 / TOP); soilTex.offset.y = -(((1 - TOP + BT) / TOP) % 1);          // 侧面的 uv.y = 1 − 高度：一整张贴图从地面铺到底
    { const g = new THREE.ExtrudeGeometry(new THREE.Shape(plotPoly.map(([x, w]) => new THREE.Vector2(x, w))), { depth: TOP - 2 * BT, bevelEnabled: true, bevelThickness: BT, bevelSize: BT, bevelSegments: 2, steps: 1 });
      g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, [lit({ map: grassTex, roughness: 0.95 }), lit({ map: soilTex, roughness: 0.95 })]); m.position.y = BT; m.receiveShadow = true; m.raycast = () => {}; m.userData.qaSupport = true; world.add(m); }
    // 青砖地：一块一块颜色略有深浅，白灰勾缝
    const brickTex = tex(512, 512, (g, w) => { const n = 4, s = w / n; g.fillStyle = '#c9c3b4'; g.fillRect(0, 0, w, w);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const v = 118 + ((Math.random() * 24) | 0), warm = 4 + Math.random() * 9; g.fillStyle = `rgb(${v + warm},${v + 3},${v + 4 - warm * 0.4})`; g.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
        for (let k = 0; k < 120; k++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '60,64,66' : '190,192,186'},${Math.random() * 0.13})`; g.fillRect(i * s + 3 + Math.random() * (s - 8), j * s + 3 + Math.random() * (s - 8), 2 + Math.random() * 3, 2 + Math.random() * 2); }
        const sh = g.createLinearGradient(i * s, j * s, i * s + s, j * s + s); sh.addColorStop(0, 'rgba(255,255,255,0.06)'); sh.addColorStop(1, 'rgba(0,0,0,0.08)'); g.fillStyle = sh; g.fillRect(i * s + 3, j * s + 3, s - 6, s - 6); } });
    brickTex.wrapS = brickTex.wrapT = THREE.RepeatWrapping;
    { const { x0, x1, w0, w1 } = PAVE, y = TOP + 0.008, g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([x0, y, -w0, x1, y, -w0, x1, y, -w1, x0, y, -w0, x1, y, -w1, x0, y, -w1], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([x0 / 4, w0 / 4, x1 / 4, w0 / 4, x1 / 4, w1 / 4, x0 / 4, w0 / 4, x1 / 4, w1 / 4, x0 / 4, w1 / 4], 2)); g.computeVertexNormals();
      const m = new THREE.Mesh(g, lit({ map: brickTex, roughness: 0.9 })); m.receiveShadow = true; m.raycast = () => {}; m.userData.qaSupport = true; world.add(m);
      const edge = lit({ color: 0xb8b2a2, roughness: 0.85 });          // 一圈压边的条石
      for (const [cx, cw, sx, sw] of [[(x0 + x1) / 2, w1 + 0.16, x1 - x0 + 0.64, 0.32], [(x0 + x1) / 2, w0 - 0.16, x1 - x0 + 0.64, 0.32], [x0 - 0.16, (w0 + w1) / 2, 0.32, w1 - w0], [x1 + 0.16, (w0 + w1) / 2, 0.32, w1 - w0]]) { if (cw < 0.05 && cw > -0.5) continue; const b = solid(new THREE.Mesh(new THREE.BoxGeometry(sx, 0.12, sw), edge)); b.position.set(cx, TOP + 0.05, -cw); world.add(b); } }
    { const mud = new THREE.Mesh(new THREE.BoxGeometry(10, 1, 0.1), lit({ color: 0x3e3326, roughness: 1 })); mud.position.set(PX, 0.5, 0.06); mud.raycast = () => {}; world.add(mud); }
    // 水池：石砌的池壁、池底，池水的剖面（越往下越浑）
    const stoneTex = tex(256, 256, (g, w, h) => { g.fillStyle = '#7d8079'; g.fillRect(0, 0, w, h); for (let k = 0; k < 600; k++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '50,54,50' : '170,172,160'},${Math.random() * 0.2})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); } g.strokeStyle = 'rgba(40,42,40,0.6)'; g.lineWidth = 3; for (let y = 0; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = (y / 64) % 2 ? 0 : 64; x < w; x += 128) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 64); g.stroke(); } } });
    stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping; stoneTex.repeat.set(3, 3);
    const stone = lit({ map: stoneTex, roughness: 0.9 });
    { const back = new THREE.Mesh(new THREE.PlaneGeometry(10, DEPTH), stone); back.position.set(PX, ROOT_Y + DEPTH / 2, -5 + BT + 0.02); back.raycast = () => {}; back.receiveShadow = true; world.add(back);
      for (const x of [1, 11]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(5, DEPTH), stone); m.rotation.y = x === 1 ? Math.PI / 2 : -Math.PI / 2; m.position.set(x === 1 ? 1 + BT + 0.02 : 11 - BT - 0.02, ROOT_Y + DEPTH / 2, -2.5); m.raycast = () => {}; world.add(m); }
      const bed = new THREE.Mesh(new THREE.PlaneGeometry(10, 5).rotateX(-Math.PI / 2), lit({ color: 0x4a4031, roughness: 1 })); bed.position.set(PX, ROOT_Y + 0.01, -2.5); bed.raycast = () => {}; world.add(bed); }
    const waterTop = new THREE.Mesh(new THREE.PlaneGeometry(10, 5).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x5f8f86, roughness: 0.12, clearcoat: 1, transparent: true, opacity: 0.86 }));
    waterTop.position.set(PX, TOP - 0.06, -2.5); waterTop.raycast = () => {}; world.add(waterTop);
    const waterSec = quiet(new THREE.Mesh(new THREE.PlaneGeometry(10, DEPTH - 0.06), new THREE.MeshBasicMaterial({ color: 0x6aa59a, transparent: true, opacity: 0.38, depthWrite: false })));
    waterSec.position.set(PX, ROOT_Y + (DEPTH - 0.06) / 2, 0.03); waterSec.renderOrder = 2; world.add(waterSec);
    const murkTex = tex(32, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(70,96,74,0.25)'); gr.addColorStop(0.22, 'rgba(58,78,58,0.82)'); gr.addColorStop(0.45, 'rgba(44,56,40,0.97)'); gr.addColorStop(1, 'rgba(34,40,30,1)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const murk = quiet(new THREE.Mesh(new THREE.PlaneGeometry(10, DEPTH - 0.06), new THREE.MeshBasicMaterial({ map: murkTex, transparent: true, depthWrite: false })));
    murk.position.set(PX, ROOT_Y + (DEPTH - 0.06) / 2, 0.04); murk.renderOrder = 3; world.add(murk);
    // 荷叶几片、池边几块石头和草、池角一丛芦苇；后面一段矮墙
    const leafMat = lit({ color: 0x5c8a4a, roughness: 0.7, side: THREE.DoubleSide });
    for (const [x, z, r, a] of [[3.2, -3.4, 0.9, 0.6], [9.0, -2.2, 1.1, 2.4], [7.6, -4.1, 0.7, 4.1]]) { const lf = solid(new THREE.Mesh(new THREE.CircleGeometry(r, 24, 0.35, Math.PI * 2 - 0.7).rotateX(-Math.PI / 2), leafMat)); lf.position.set(x, TOP - 0.02, z); lf.rotation.y = a; lf.userData.bob = Math.random() * 6; world.add(lf); }
    const rockMat = lit({ color: 0x8d8a80, roughness: 0.85, flatShading: true });
    for (const [x, w, r, sy, a] of [[1.9, 5.7, 0.62, 0.55, 0.4], [4.6, 5.8, 0.48, 0.5, 1.9], [8.8, 5.75, 0.7, 0.5, 2.8], [10.7, 5.6, 0.5, 0.6, 0.9], [11.7, 2.4, 0.55, 0.55, 1.4], [11.95, 4.4, 0.45, 0.6, 2.2]]) { const rk = solid(new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rockMat)); rk.scale.set(1.3, sy, 1); rk.rotation.y = a; rk.position.set(x, TOP + r * sy * 0.55, -w); world.add(rk); }
    { const N = 260, tuft = new THREE.InstancedMesh(new THREE.ConeGeometry(0.07, 0.6, 4).translate(0, 0.3, 0), lit({ color: 0x6f8f4a, roughness: 1 }), N), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      let k = 0; for (let tries = 0; k < N && tries < 5000; tries++) { let x, w; const r = Math.random();
        if (r < 0.35) { x = 1 + Math.random() * 10; w = 5.2 + Math.random() * 0.7; } else if (r < 0.5) { x = 0.4 + Math.random() * 0.5; w = Math.random() * 5; } else if (r < 0.62) { x = 11.1 + Math.random() * 0.6; w = Math.random() * 5; } else { x = PB.x0 + Math.random() * (PB.x1 - PB.x0); w = PB.w0 + Math.random() * (PB.w1 - PB.w0); if (x > PAVE.x0 - 0.4 && x < PAVE.x1 + 0.4 && w > PAVE.w0 - 0.4 && w < PAVE.w1 + 0.4) continue; }
        if (!inPoly([x, w], plotPoly) || (x > 0.9 && x < 11.1 && w < 5.1)) continue;
        e.set((Math.random() - 0.5) * 0.5, Math.random() * 6, (Math.random() - 0.5) * 0.5); q.setFromEuler(e); const s = 0.6 + Math.random() * 0.8; m4.compose(new THREE.Vector3(x, TOP, -w), q, new THREE.Vector3(s, s, s)); tuft.setMatrixAt(k++, m4); }
      tuft.count = k; tuft.castShadow = true; tuft.raycast = () => {}; tuft.userData.noFrame = true; world.add(tuft); }
    { const stems = lit({ color: 0x8a9a5a, roughness: 0.8 });          // 池角一小丛芦苇（不在正中，不和那一根抢）
      for (let i = 0; i < 6; i++) { const h2 = 1.4 + Math.random() * 1.1, st = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, h2, 5).translate(0, h2 / 2, 0), stems)); st.position.set(1.6 + Math.random() * 0.8, TOP - 0.1, -(4.1 + Math.random() * 0.6)); st.rotation.z = (Math.random() - 0.5) * 0.3; st.rotation.x = (Math.random() - 0.5) * 0.3; world.add(st); } }
    { const wallG = new THREE.Group(), plaster = lit({ color: 0xebe6da, roughness: 0.9 }), tile = lit({ color: 0x4b4f55, roughness: 0.6 });          // 粉墙黛瓦的一段矮墙
      const framed = (m) => { m.castShadow = true; m.receiveShadow = true; m.raycast = () => {}; return m; };          // 墙算进取景，不被画面切掉
      const body = framed(new THREE.Mesh(new THREE.BoxGeometry(10.6, 1.45, 0.5), plaster)); body.position.y = 0.72;
      const base = framed(new THREE.Mesh(new THREE.BoxGeometry(10.7, 0.3, 0.56), lit({ color: 0x8f8b80, roughness: 0.9 }))); base.position.y = 0.15;
      const cap = framed(new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.24, 0.95), tile)); cap.position.y = 1.56;
      const ridge = framed(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 11.3, 8).rotateZ(Math.PI / 2), tile)); ridge.position.y = 1.75;
      wallG.add(body, base, cap, ridge); wallG.position.set(7, TOP, -14.2); world.add(wallG); }
    // 芦苇：根在池底正中，出水一尺；顶上一穗芦花
    const reed = new THREE.Group(); reed.position.set(PX, ROOT_Y, -0.18); world.add(reed);
    { const stem = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, REED, 8).translate(0, REED / 2, 0), lit({ color: 0x8c9a58, roughness: 0.7 })));
      const plume = solid(new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), lit({ color: 0xd8c7a0, roughness: 1 }))); plume.scale.set(0.7, 2.2, 0.7); plume.position.y = REED + 0.45;
      reed.add(stem, plume);
      for (const [y, a, l] of [[11.6, 0.6, 1.6], [12.2, -0.7, 1.3], [12.6, 0.4, 1.1], [7, -0.5, 2], [4, 0.6, 2]]) { const lf = solid(new THREE.Mesh(new THREE.PlaneGeometry(0.16, l).translate(0, l / 2, 0), lit({ color: 0x7f9450, side: THREE.DoubleSide }))); lf.position.y = y; lf.rotation.z = a; lf.rotation.y = 0.3; reed.add(lf); } }
    // 绳三角形的木桩
    const stake = () => { const stakeMat = lit({ color: 0x8a6440, roughness: 0.8 }); const g = new THREE.Group(), s = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.9, 8), stakeMat)); s.position.y = 0.45; const cap = solid(new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), stakeMat)); cap.position.y = 0.9; g.add(s, cap); g.visible = false; world.add(g); return g; };
    const ST = { P: stake(), A: stake(), B: stake() };

    // ================= 数学：发着光的线和面（亮芯 + 同色的光晕 + 底下一圈暗影，浅色地面上也压得住） =================
    const coreTex = tex(64, 4, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); for (const [o, a] of [[0, 0], [0.18, 0.6], [0.3, 1], [0.7, 1], [0.82, 0.6], [1, 0]]) gr.addColorStop(o, `rgba(255,255,255,${a})`); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const glowTex = tex(64, 4, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); for (let k = 0; k <= 10; k++) { const x = k / 10, d = (x - 0.5) / 0.22; gr.addColorStop(x, `rgba(255,255,255,${Math.exp(-d * d * 0.5).toFixed(3)})`); } g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    coreTex.colorSpace = glowTex.colorSpace = THREE.NoColorSpace;
    const ribbon = (pts, n, hw, dash = 0) => { const pos = [], uv = []; let acc = 0;
      const quad = (a, b, s) => { pos.push(a.x + s.x, a.y + s.y, a.z + s.z, a.x - s.x, a.y - s.y, a.z - s.z, b.x + s.x, b.y + s.y, b.z + s.z, b.x + s.x, b.y + s.y, b.z + s.z, a.x - s.x, a.y - s.y, a.z - s.z, b.x - s.x, b.y - s.y, b.z - s.z); uv.push(0, 0.5, 1, 0.5, 0, 0.5, 0, 0.5, 1, 0.5, 1, 0.5); };
      for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], d = b.clone().sub(a), L = d.length(); if (L < 1e-6) continue; const s = n.clone().cross(d).normalize().multiplyScalar(hw);
        const ea = a.clone().addScaledVector(d, -hw / L * 0.9), eb = b.clone().addScaledVector(d, hw / L * 0.9);          // 两头各伸出一点，折角处接得上
        if (!dash) quad(ea, eb, s); else { let t = 0; while (t < L - 1e-6) { const ph = (acc + t) % (2 * dash), on = ph < dash, st = Math.max(1e-4, Math.min(L - t, on ? dash - ph : 2 * dash - ph)); if (on) quad(a.clone().addScaledVector(d, t / L), a.clone().addScaledVector(d, (t + st) / L), s); t += st; } acc += L; } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return g; };
    const strokes = [];
    const stroke = (color, w, { glow = 0.42, shadow = 0.32, dash = 0, order = 12, n = NT } = {}) => {
      const mk = (map, col, op, ord) => { const m = quiet(new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: col, map, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide }))); m.renderOrder = ord; m.visible = false; world.add(m); return m; };
      const sh = shadow ? mk(glowTex, 0x0d1014, shadow, order - 2) : null, gl = glow ? mk(glowTex, color, glow, order - 1) : null, co = mk(coreTex, color, 1, order);
      const o = { core: co, pts: null, k: 1, drawing: null,
        set(pts, force) { if (this.drawing && !force) { this.drawing.pts = pts; return; } this.pts = pts; if (!pts || pts.length < 2) { for (const m of [co, gl, sh]) if (m) m.visible = false; return; }
          co.geometry.dispose(); co.geometry = ribbon(pts, n, w / 2, dash); co.visible = true;
          if (gl) { gl.geometry.dispose(); gl.geometry = ribbon(pts, n, w * 2.6); gl.visible = true; }
          if (sh) { sh.geometry.dispose(); const off = n.clone().multiplyScalar(-0.015); sh.geometry = ribbon(pts.map((p) => p.clone().add(off)), n, w * 1.7); sh.visible = true; } },
        fade(k) { this.k = k; co.material.opacity = k; if (gl) gl.material.opacity = glow * k; if (sh) sh.material.opacity = shadow * k; },
        dispose() { for (const m of [co, gl, sh]) if (m) { world.remove(m); m.geometry.dispose(); m.material.dispose(); } const i = strokes.indexOf(this); if (i >= 0) strokes.splice(i, 1); },
        color(c) { co.material.color.set(c); if (gl) gl.material.color.set(c); } };
      strokes.push(o); return o; };
    // 新的线“画出来”：从头到尾长出来
    const draws = [];
    const partial = (pts, k) => { const L = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const l = pts[i].distanceTo(pts[i - 1]); L.push(l); tot += l; } let left = k * tot; const out = [pts[0]]; for (let i = 1; i < pts.length; i++) { if (left >= L[i - 1]) { out.push(pts[i]); left -= L[i - 1]; } else { out.push(pts[i - 1].clone().lerp(pts[i], left / L[i - 1])); break; } } return out; };
    const drawOn = (s, pts, dur = 0.6, delay = 0) => { s.drawing = { pts, t0: now() + delay, dur }; s.set(null, true); if (!draws.includes(s)) draws.push(s); };
    // 面：半透明的色块
    const fill = (color, op = 0.42, order = 7, pick = false) => { const m = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide }));
      m.renderOrder = order; m.visible = false; m.userData.noFrame = true; if (pick) m.userData.pick = true; else m.raycast = () => {}; m.userData.op = op; world.add(m);
      m.set = (pts) => { if (!pts) { m.visible = false; return; } const pos = []; for (let k = 1; k < pts.length - 1; k++) pos.push(pts[0].x, pts[0].y, pts[0].z, pts[k].x, pts[k].y, pts[k].z, pts[k + 1].x, pts[k + 1].y, pts[k + 1].z); m.geometry.dispose(); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); m.geometry = g; m.visible = true; };
      return m; };
    // 字：斜体衬线，白字或概念色，压一圈暗边
    const measure = (font, txt) => { const g = document.createElement('canvas').getContext('2d'); g.font = font; return g.measureText(txt).width; };
    const labTex = (txt, col, px = 72) => { const it = /^[a-zA-Z]′?$|^[a-z] ?\+ ?1$/.test(txt), f = it ? `italic 500 ${px * 1.1}px "Times New Roman",serif` : `600 ${px}px "Times New Roman","Songti SC","STSong",serif`;
      return tex(Math.ceil(measure(f, txt)) + 48, Math.round(px * 1.55), (g, w, h) => { g.font = f; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = px * 0.2; g.strokeStyle = 'rgba(16,20,26,0.78)'; g.strokeText(txt, w / 2, h / 2 + 2); g.fillStyle = col; g.fillText(txt, w / 2, h / 2 + 2); }); };
    const label = (hgt) => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }))); sp.renderOrder = 30; sp.userData.h = hgt; sp.userData.k = ''; sp.visible = false; world.add(sp); return sp; };
    const setLabel = (sp, txt, col, p) => { if (!txt || !p) { sp.visible = false; return; } if (sp.userData.k !== txt + col) { sp.userData.k = txt + col; const t = labTex(txt, col); sp.material.map?.dispose?.(); sp.material.map = t; sp.material.needsUpdate = true; sp.scale.set((sp.userData.h * t.image.width) / t.image.height, sp.userData.h, 1); } sp.position.copy(p); sp.visible = true; };
    // 重拍：从那一点迸出一圈短光线
    const flashes = [];
    const flash = (p, n = NT, color = 0xffffff, r = 1.4) => { const ss = []; for (let k = 0; k < 10; k++) ss.push(stroke(color, 0.12, { glow: 0.35, shadow: 0, n, order: 20 })); flashes.push({ t0: now(), p: p.clone(), n, r, ss }); };
    const glowDot = (color) => { const g = new THREE.Group(), d1 = quiet(new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false }))), d2 = quiet(new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), new THREE.MeshBasicMaterial({ color, map: null, transparent: true, opacity: 0.45, depthWrite: false })));
      d1.renderOrder = 22; d2.renderOrder = 21; g.add(d2, d1); g.visible = false; world.add(g); return g; };

    // ================= 状态 =================
    const fresh = () => ({ beat: 'pond', th: 0, side: 1, banked: false, held: '', a: 3, b: 4, grow: { a: 0, b: 0, c: 0 }, growAt: { a: -9, b: -9, c: -9 }, count: -9, counted: false, pairs: [], free: false,
      merge: 0, mergeAt: -9, cut: false, rot: [0, 0], placed: [false, false], proved: false, applied: false, reveal: 0, revealAt: -9, done: false, cap: ['', ''], ask: '', beatAt: 0, hint: 0, triAt: -9, frameAt: -9, pose: '' });
    let S = fresh(), runId = 0, grab = null;
    const later = (ms, f) => { const id = runId; setTimeout(() => { if (!dead && id === runId) f(); }, ms); };

    // 水池里的三角形：勾（半个池宽）、股（水深）、弦（芦苇）
    const pondStroke = (color, width, opts) => stroke(color, width, { n: NF, ...opts });
    const PT = { gou: pondStroke(BLUE, 0.16), gu: pondStroke(GREEN, 0.16), guD: pondStroke(GREEN, 0.12, { dash: 0.35 }), xian: pondStroke(GOLD, 0.16), xianD: pondStroke(GOLD, 0.12, { dash: 0.35 }), sq: pondStroke(WHITE, 0.08, { glow: 0.2 }), one: stroke(WHITE, 0.08, { n: NF, glow: 0.2 }) };
    const PL = { gou: label(1.1), gu: label(1.1), xian: label(1.1), one: label(0.9), bank: label(0.95) };
    const traceDuration = 1.4;
    const pondEdges = () => { const surface = F(PX, TOP, 0.06), bank = F(PX + S.side * PH, TOP, 0.06), bottom = F(PX, ROOT_Y, 0.06); return [[surface, bank], [surface, bottom], [bank, bottom]]; };
    // 方砖地上的三角形和三个正方形
    const TR = { a: stroke(BLUE, 0.15), b: stroke(GREEN, 0.15), c: stroke(GOLD, 0.15) };
    const SQ = { a: { f: fill(BLUE, 0.36, 6, true), e: stroke(BLUE, 0.1, { glow: 0.3 }), n: label(1.3) }, b: { f: fill(GREEN, 0.36, 6, true), e: stroke(GREEN, 0.1, { glow: 0.3 }), n: label(1.3) }, c: { f: fill(GOLD, 0.34, 6), e: stroke(GOLD, 0.1, { glow: 0.3 }), n: label(1.3) } };
    const TL = { a: label(1.05), b: label(1.05), c: label(1.05) };
    const FR = { frame: stroke(WHITE, 0.09, { dash: 0.3, glow: 0.25 }), tri: [fill(RED, 0.45, 8), fill(RED, 0.45, 8), fill(RED, 0.45, 8), fill(RED, 0.45, 8)], eq: label(1.0) };
    // 赵爽弦图的五块：两块要转上去的三角形、两块不动的三角形、中间的黄方
    const PC = { t1: fill(RED, 0.62, 9, true), t2: fill(RED, 0.62, 9, true), r3: fill(RED, 0.62, 8), r4: fill(RED, 0.62, 8), y: fill(YEL, 0.7, 8) };
    const PE = { t1: stroke(0xffffff, 0.07, { glow: 0.15, shadow: 0.2 }), t2: stroke(0xffffff, 0.07, { glow: 0.15, shadow: 0.2 }), r3: stroke(0xffffff, 0.07, { glow: 0.15, shadow: 0.2 }), r4: stroke(0xffffff, 0.07, { glow: 0.15, shadow: 0.2 }), y: stroke(0xffffff, 0.07, { glow: 0.15, shadow: 0.2 }), cut: stroke(WHITE, 0.1, { glow: 0.3 }) };
    const PD = { root: glowDot(GREEN) };
    const bankMark = glowDot(BLUE);

    // ---- 几何：u, w 平面上的点 ----
    const tri = () => { const [pu, pw] = P0, a = S.a, b = S.b; return { P: [pu, pw], Qa: [pu + a, pw], Qb: [pu, pw + b], a, b, c: Math.hypot(a, b) }; };
    const sqPts = (k) => { const { P, Qa, Qb, a, b } = tri(); if (k === 'a') return [P, Qa, [Qa[0], Qa[1] - a], [P[0], P[1] - a]]; if (k === 'b') return [P, Qb, [Qb[0] - b, Qb[1]], [P[0] - b, P[1]]]; return [Qa, Qb, [Qb[0] + b, Qb[1] + a], [Qa[0] + b, Qa[1] + a]]; };
    const ctr = (ps) => [ps.reduce((s, p) => s + p[0], 0) / ps.length, ps.reduce((s, p) => s + p[1], 0) / ps.length];
    const lerp2 = (p, q, k) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];
    const rot2 = (p, c, a) => { const x = p[0] - c[0], y = p[1] - c[1], co = Math.cos(a), si = Math.sin(a); return [c[0] + x * co - y * si, c[1] + x * si + y * co]; };
    const toT = (ps, l) => ps.map((p) => T(p[0], p[1], l));
    const grownSq = (k, g) => { const ps = sqPts(k), { P, Qa, Qb } = tri(), base = k === 'a' ? [P, Qa] : k === 'b' ? [P, Qb] : [Qa, Qb]; return [ps[0], ps[1], lerp2(base[1], ps[2], g), lerp2(base[0], ps[3], g)]; };          // 从边上“扫”出正方形
    // 拼图用的五块（以 P 为原点：大正方形 b 在左、小正方形 a 在右）
    const pieces = () => { const { P, a, b } = tri(), L = (x, y) => [P[0] + x, P[1] + y];
      return { t1: [L(0, 0), L(a, 0), L(0, b)], t2: [L(a, 0), L(a + b, 0), L(a + b, a)], r3: [L(0, b), L(a, b), L(a, 0)], r4: [L(a, 0), L(a + b, a), L(a, a)], y: [L(a, a), L(b, a), L(b, b), L(a, b)], piv1: L(0, b), piv2: L(a + b, a) }; };
    const close = (ps) => [...ps, ps[0]];

    // ================= 布局 =================
    function layout() {
      const t = now();
      // 水池：芦苇和水里的三角形
      reed.rotation.z = -S.th;
      const banked = S.banked, s = S.side, surf = F(PX, TOP), bank = F(PX + s * PH, TOP), revK = S.reveal;
      const solving = S.pose ? S.pose === 'ans' : S.beat === 'apply' || S.beat === 'end';
      if (banked) {
        PT.sq.set([F(PX, TOP - 0.7), F(PX + s * 0.7, TOP - 0.7), F(PX + s * 0.7, TOP)]);
        PT.guD.fade(solving ? 0.55 : 1); PT.xianD.fade(solving ? 0.55 : 1);
        if (solving) { const [width, depth, hypotenuse] = pondEdges(); PT.gou.set(width); PT.gu.set(S.applied || revK >= 1 ? depth : null); PT.xian.set(S.applied || revK >= 1 ? hypotenuse : null); PT.guD.set(revK < 1 ? depth : null); PT.xianD.set(revK < 1 ? hypotenuse : null); }
        else { const k1 = 2.6, k2 = 5; PT.gou.set([surf, bank]); PT.gu.set([surf, F(PX, TOP - k1)]); PT.guD.set([F(PX, TOP - k1), F(PX, TOP - k2)]); const dir = [-s * PH / REED, -DEPTH / REED]; PT.xian.set([bank, F(PX + s * PH + dir[0] * k1 * 1.05, TOP + dir[1] * k1 * 1.05)]); PT.xianD.set([F(PX + s * PH + dir[0] * k1 * 1.05, TOP + dir[1] * k1 * 1.05), F(PX + s * PH + dir[0] * k2 * 1.08, TOP + dir[1] * k2 * 1.08)]); }
        setLabel(PL.gou, '5', '#9be3f5', F(PX + s * PH / 2, TOP + 0.9, 0.3));
        setLabel(PL.gu, revK >= 1 ? '12' : 'x', '#b6e39a', F(PX - s * 0.9, TOP - (solving ? 6 : 2.2), 0.3));
        setLabel(PL.xian, revK >= 1 ? '13' : 'x + 1', '#ffe08a', F(PX + s * (PH / 2 + 1.4), TOP - (solving ? 6 : 1.9), 0.3));
        PD.root.visible = revK >= 1; PD.root.position.copy(F(PX, ROOT_Y, 0.1));
      } else { for (const k of ['gou', 'gu', 'guD', 'xian', 'xianD', 'sq']) PT[k].set(null); for (const k of ['gou', 'gu', 'xian']) setLabel(PL[k], '', '', null); PD.root.visible = false; }
      const targetX = PX + (S.th < 0 ? -PH : PH);
      setLabel(PL.bank, banked ? '' : '岸边中点', '#9be3f5', F(targetX, TOP + 1.15));
      bankMark.visible = !banked;
      bankMark.position.copy(F(targetX, TOP));
      // 出水一尺：芦苇竖着时，水面以上那一截标一个 1
      if (!banked && S.th === 0 && S.beat === 'pond') { PT.one.set([F(PX + 0.5, TOP), F(PX + 0.5, TOP + 1)]); setLabel(PL.one, '1', '#ffffff', F(PX + 1.1, TOP + 0.5, 0.3)); } else { PT.one.set(null); setLabel(PL.one, '', '', null); }
      // 方砖地：绳三角形、三个正方形
      const showTri = S.beat !== 'pond' || !!S.pose;
      const { P, Qa, Qb, a, b, c } = tri();
      for (const st of Object.values(ST)) st.visible = showTri && S.merge < 1;
      ST.P.position.copy(T(P[0], P[1], 0)); ST.A.position.copy(T(Qa[0], Qa[1], 0)); ST.B.position.copy(T(Qb[0], Qb[1], 0));
      if (showTri) { const nC = [b / c, a / c];          // 斜边朝外的方向
        if (S.merge <= 0) { TR.a.set(toT([P, Qa], 0.08)); TR.b.set(toT([P, Qb], 0.08)); TR.c.set(toT([Qa, Qb], 0.08));
          setLabel(TL.a, 'a', '#9be3f5', T((P[0] + Qa[0]) / 2, P[1] + 0.55, 0.4)); setLabel(TL.b, 'b', '#b6e39a', T(P[0] + 0.55, P[1] + b * 0.62, 0.4)); setLabel(TL.c, 'c', '#ffe08a', T((Qa[0] + Qb[0]) / 2 + nC[0] * 0.7, (Qa[1] + Qb[1]) / 2 + nC[1] * 0.7, 0.4)); }
        else {          // 拼在一起以后：字标在两个正方形和拼成的大正方形的边上
          TR.a.set(null); TR.b.set(null); TR.c.set(null);
          const done = S.proved || (S.rot[0] >= 1 && S.rot[1] >= 1), far = [Qb[0] + b / 2 - (a / c) * 0.85, Qb[1] + a / 2 + (b / c) * 0.85];          // 拼成的大正方形左上那条边外面
          setLabel(TL.a, done ? '' : 'a', '#9be3f5', T(P[0] + b + a / 2, P[1] - 0.7, 0.4)); setLabel(TL.b, done ? '' : 'b', '#b6e39a', T(P[0] - 0.7, P[1] + b / 2, 0.4));
          setLabel(TL.c, 'c', '#ffe08a', done ? T(far[0], far[1], 0.4) : T((Qa[0] + Qb[0]) / 2 + nC[0] * 0.7, (Qa[1] + Qb[1]) / 2 + nC[1] * 0.7, 0.4)); } }
      else { for (const k of ['a', 'b', 'c']) { TR[k].set(null); setLabel(TL[k], '', '', null); } }
      // 正方形（拼图之前）
      const mg = easeOut(S.merge);
      for (const k of ['a', 'b', 'c']) { const g = S.grow[k], q = SQ[k];
        if (!showTri || g <= 0 || (S.cut && k !== 'c')) { q.f.set(null); q.e.set(null); setLabel(q.n, '', '', null); continue; }
        let ps = g < 1 ? grownSq(k, easeOut(g)) : sqPts(k);
        if (k !== 'c' && mg > 0) { const d = k === 'b' ? [b, 0] : [b, a]; ps = ps.map((p) => [p[0] + d[0] * mg, p[1] + d[1] * mg]); }          // 平移过去：大的在左、小的在右，连在一起
        const lift = k === 'c' ? 0.02 : 0.03 + mg * 0.02;
        q.f.set(toT(ps, lift)); q.f.material.opacity = k === 'c' && S.cut ? 0.12 : q.f.userData.op;
        q.e.set(toT(close(ps), lift + 0.01));
        const num = k === 'a' ? a * a : k === 'b' ? b * b : c * c, isInt = Math.abs(num - Math.round(num)) < 1e-6, txt = k === 'c' && !S.counted ? '?' : isInt ? String(Math.round(num)) : num.toFixed(1);
        setLabel(q.n, g >= 1 && !(k === 'c' && S.cut) ? txt : '', k === 'a' ? '#c8f1fb' : k === 'b' ? '#d4f0c0' : '#fff0b8', T(...ctr(ps), 0.5)); }
      // 数斜着的正方形：外面的大正方形减去 4 个三角形
      const fk = S.frameAt > 0 ? clamp((t - S.frameAt) / 2.6, 0, 1) : 1, frameOn = showTri && S.frameAt > 0 && fk < 1 && !S.cut;
      if (frameOn) { const L = (x, y) => [P[0] + x, P[1] + y], s2 = a + b;
        FR.frame.set(toT(close([L(0, 0), L(s2, 0), L(s2, s2), L(0, s2)]), 0.12));
        const tris = [[L(0, 0), L(a, 0), L(0, b)], [L(a, 0), L(s2, 0), L(s2, a)], [L(s2, a), L(s2, s2), L(b, s2)], [L(b, s2), L(0, s2), L(0, b)]];
        tris.forEach((tp, i) => { const on = fk > 0.15 + i * 0.07; FR.tri[i].set(on ? toT(tp, 0.1) : null); FR.tri[i].material.opacity = 0.5 * (1 - smooth(0.75, 1, fk)); });
        FR.frame.fade(1 - smooth(0.8, 1, fk));
        setLabel(FR.eq, `${Math.round(s2 * s2 * 100) / 100} − 4 × ${Math.round((a * b) / 2 * 100) / 100} = ${Math.round(c * c * 100) / 100}`, '#ffffff', T(P[0] + s2 / 2, P[1] + s2 + 1.1, 0.6)); }
      else { FR.frame.set(null); FR.tri.forEach((f) => f.set(null)); setLabel(FR.eq, '', '', null); }
      // 赵爽弦图：切开以后的五块
      if (S.cut) { const pc = pieces();
        const t1 = pc.t1.map((p) => rot2(p, pc.piv1, (S.rot[0] * Math.PI) / 2)), t2 = pc.t2.map((p) => rot2(p, pc.piv2, (-S.rot[1] * Math.PI) / 2));
        const lift1 = 0.06 + Math.sin(S.rot[0] * Math.PI) * 0.4, lift2 = 0.06 + Math.sin(S.rot[1] * Math.PI) * 0.4;
        PC.t1.set(toT(t1, lift1)); PC.t2.set(toT(t2, lift2)); PC.r3.set(toT(pc.r3, 0.05)); PC.r4.set(toT(pc.r4, 0.05)); PC.y.set(b > a ? toT(pc.y, 0.05) : null);
        PE.t1.set(toT(close(t1), lift1 + 0.01)); PE.t2.set(toT(close(t2), lift2 + 0.01)); PE.r3.set(toT(close(pc.r3), 0.06)); PE.r4.set(toT(close(pc.r4), 0.06)); PE.y.set(b > a ? toT(close(pc.y), 0.06) : null);
      }
      else { for (const k of ['t1', 't2', 'r3', 'r4', 'y']) { PC[k].set(null); PE[k].set(null); } }
    }
    function say(big, small = '') { caption(big, small); }

    // ================= 此刻那一句：印在园子左前方那一段土壁上（沿着轮廓），不挡数学 =================
    const capFront = outline.filter(([x, w]) => w < -0.25 && x > -13.8 && x < -2.2).sort((a, b) => a[0] - b[0]);
    const CY0 = 6.6, CY1 = 10.6, COFF = BT + 0.06;
    const capGeo = new THREE.BufferGeometry(); let capLen = 0;
    { const sp = capFront.map((p, i) => { const a = capFront[Math.max(0, i - 1)], b = capFront[Math.min(capFront.length - 1, i + 1)], dx = b[0] - a[0], dw = b[1] - a[1], L = Math.hypot(dx, dw) || 1; return [p[0] + (dw / L) * COFF, p[1] - (dx / L) * COFF]; });
      for (let i = 1; i < sp.length; i++) capLen += Math.hypot(sp[i][0] - sp[i - 1][0], sp[i][1] - sp[i - 1][1]);
      const pos = [], uvs = [], idx = []; let s2 = 0;
      sp.forEach((p, i) => { if (i) s2 += Math.hypot(p[0] - sp[i - 1][0], p[1] - sp[i - 1][1]); pos.push(p[0], CY0, -p[1], p[0], CY1, -p[1]); uvs.push(s2 / capLen, 0, s2 / capLen, 1); if (i) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); } });
      capGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); capGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); capGeo.setIndex(idx); }
    const CW = 2048, CH = Math.round((CW * (CY1 - CY0)) / capLen);
    const capMesh = quiet(new THREE.Mesh(capGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })));
    capMesh.renderOrder = 4; capMesh.visible = false; world.add(capMesh);
    const capTex = (big, small) => tex(CW, CH, (g, w, h) => {
      const fb = (f) => `600 ${Math.round(h * 0.4 * f)}px "Times New Roman","Songti SC","STSong",serif`, fs = (f) => `500 ${Math.round(h * 0.25 * f)}px "Times New Roman","Songti SC","STSong",serif`;
      let f = 1; for (; f > 0.45; f -= 0.04) { g.font = fb(f); const wb = g.measureText(big).width; g.font = fs(f); const ws = small ? g.measureText(small).width : 0; if (Math.max(wb, ws) < w - h * 0.6) break; }
      const band = g.createLinearGradient(0, 0, w, 0); band.addColorStop(0, 'rgba(28,20,12,0)'); band.addColorStop(0.06, 'rgba(28,20,12,0.5)'); band.addColorStop(0.94, 'rgba(28,20,12,0.5)'); band.addColorStop(1, 'rgba(28,20,12,0)'); g.fillStyle = band; g.fillRect(0, h * 0.04, w, h * 0.92);
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = fb(f); g.fillStyle = '#fbf2de'; g.fillText(big, w / 2, small ? h * 0.36 : h * 0.5); if (small) { g.font = fs(f); g.fillStyle = '#eadfc6'; g.fillText(small, w / 2, h * 0.74); } });
    const cap = { key: '', born: -9, out: 1e9, next: null };
    function caption(big, small = '') { const key = big + '|' + small; if (key === cap.key) return; cap.key = key; S.cap = [big, small];
      const show = () => { capMesh.material.map?.dispose?.(); capMesh.material.map = capTex(big, small); capMesh.material.needsUpdate = true; capMesh.visible = true; cap.born = now(); cap.out = 1e9; };
      if (capMesh.visible && now() - cap.born > 0.2) { cap.out = now(); cap.next = show; } else show(); }
    const prompt = (txt) => { S.ask = txt; if (ui?.status) ui.status(txt); };

    // ================= 板书 =================
    const css = document.createElement('style');
    css.textContent = `
.gg-board{margin:4px 0 6px;display:flex;flex-direction:column;gap:8px;font:15px/1.7 "Kaiti SC","STKaiti","Songti SC",serif;color:#2b2722}
.gg-board .gb-row{opacity:0;transform:translateY(5px);transition:opacity .5s,transform .5s,background-color 2.4s;padding:3px 8px 3px 6px;border-radius:5px;border-left:3px solid transparent}
.gg-board .gb-row.in{opacity:1;transform:none}
.gg-board .gb-row.fresh{background:rgba(255,206,110,.34);border-left-color:#d98a2b}
.gg-board .n{display:inline-block;min-width:1.25em;color:#b0532a;font-weight:700}
.gg-board b{color:#8a2f1d}
.gg-board i{font-family:"Times New Roman",serif;font-style:italic;letter-spacing:.02em}
.gg-board .qa{color:#1f8fb5;font-weight:600}.gg-board .qb{color:#4f9a2c;font-weight:600}.gg-board .qc{color:#c08a00;font-weight:600}.gg-board .zh{color:#d9422e;font-weight:600}.gg-board .hu{color:#b89a00;font-weight:600}
.gg-board .gb-h{font:600 12px/1.3 "PingFang SC","Hiragino Sans GB",sans-serif;color:#a07a45;letter-spacing:.3em;margin:6px 0 -4px;opacity:0;transition:opacity .4s}
.gg-board .gb-h.in{opacity:1}
.gg-board.review .gb-row[data-k]{cursor:pointer}.gg-board.review .gb-row[data-k]:hover{background:rgba(255,206,110,.16)}
.gg-board .gb-row.sel{background:rgba(255,206,110,.34);border-left-color:#d98a2b}`;
    document.head.append(css);
    let boardEl = null, lastH = ''; const rows = [];
    const reveal = (r) => { const body = boardEl?.closest('.p-body'); if (!body) return; setTimeout(() => { const rb = r.getBoundingClientRect(), bb = body.getBoundingClientRect(); if (rb.bottom > bb.bottom - 14) body.scrollBy({ top: rb.bottom - bb.bottom + 28, behavior: 'smooth' }); }, 80); };
    const board = (html, key = '') => { const r = document.createElement('div'); r.className = 'gb-row'; r.innerHTML = html; r.dataset.k = key; rows.push(r); for (const o of rows) o.classList?.remove('fresh'); if (boardEl) { boardEl.append(r); requestAnimationFrame(() => { r.classList.add('in', 'fresh'); reveal(r); }); } return r; };
    board.h = (title) => { if (title === lastH) return; lastH = title; const r = document.createElement('div'); r.className = 'gb-h'; r.textContent = title; rows.push(r); if (boardEl) { boardEl.append(r); requestAnimationFrame(() => { r.classList.add('in'); reveal(r); }); } };
    const it = (s) => `<i>${s}</i>`;
    const go = (beat, big, small, ask) => { S.beat = beat; S.beatAt = now(); S.hint = 0; if (big) say(big, small); if (ask !== undefined) prompt(ask); layout(); if (beat === 'apply') aim?.(POND_DIR); };

    // ================= 主线 =================
    function banked() {          // 芦苇拉到岸边：直角三角形出来
      S.banked = true; placePondPicks(); S.triAt = now(); sfx.ding(980, { gain: 0.05 });
      flash(F(PX + S.side * PH, TOP, 0.1), NF, 0xffffff, 1.1);
      say('芦苇、水深、半个池宽，围成一个直角三角形', '中心到岸边中点是 10 ÷ 2 = 5 尺，另两边是 x 尺和 x + 1 尺');
      board.h('问题'); board(`1 丈 = 10 尺，从池中心到岸边中点是 10 ÷ 2 = 5 尺。这 5 尺、水深 ${it('x')} 尺、芦苇 ${it('x')} + 1 尺，围成一个直角三角形`, 'pond');
      layout();
      later(2600, () => { go('gougu', '直角三角形的三条边，有什么关系？', '院子里的方砖每块一尺见方，正好当方格纸。先拉一个勾三、股四的三角形', '点三角形的一条边，看看会长出什么');
        drawOn(TR.a, toT([tri().P, tri().Qa], 0.08)); drawOn(TR.b, toT([tri().P, tri().Qb], 0.08), 0.6, 0.15); drawOn(TR.c, toT([tri().Qa, tri().Qb], 0.08), 0.7, 0.3); sfx.whoosh({ dur: 0.4, freq: 900, gain: 0.03 }); });
    }
    function growSq(k) {          // 点一条边：在它上面长出一个正方形
      if (S.grow[k] > 0) return; S.growAt[k] = now(); sfx.clink({ freq: k === 'a' ? 900 : k === 'b' ? 1100 : 1350, gain: 0.04 });
      if (k === 'c') later(1100, countC);
      later(800, () => { if (S.grow.a >= 1 && S.grow.b >= 1 && S.counted && !S.shang) shang(); });
    }
    function countC() {          // 斜着的正方形：外面的大正方形减去 4 个直角三角形
      S.frameAt = now(); sfx.whoosh({ dur: 0.5, freq: 700, gain: 0.03 });
      say('斜着的正方形怎么数？', '在外面套一个大正方形，减去 4 个直角三角形');
      later(2100, () => { S.counted = true; layout(); const pc = ctr(sqPts('c')); flash(T(pc[0], pc[1], 0.4), NT, GOLD, 1.6); sfx.clink({ freq: 1500, gain: 0.05 }); if (S.grow.a >= 1 && S.grow.b >= 1 && !S.shang) shang(); else say(`斜边上的正方形，面积是 ${Math.round(tri().c ** 2)}`, '再点另外两条边'); });
    }
    function shang() {          // 重拍 1：9 + 16 = 25
      S.shang = true; sfx.ding(1320, { gain: 0.07 }); const pc = ctr(sqPts('c')); flash(T(pc[0], pc[1], 0.5), NT, GOLD, 2.2);
      say('9 + 16 = 25', '“两矩共长二十有五”：两个小正方形面积之和，等于斜边上的正方形');
      board.h('探究'); board(`<span class="n">1</span>勾三股四弦五：<span class="qa">9</span> + <span class="qb">16</span> = <span class="qc">25</span>，以勾、股为边的正方形的面积之和，恰好等于以弦为边的正方形的面积`, 'shang');
      board(`<span class="n">2</span>以直角三角形斜边为边的正方形的面积，等于某个正方形的面积减去 4 个直角三角形的面积`, 'count');
      S.pairs = ['3,4'];
      later(2600, () => go('vary', '其他直角三角形也是这样吗？', '拖动木桩，换一个直角三角形；方砖还是一块一块地数', '拖动木桩，换几个直角三角形'));
    }
    function varied() {          // 换了一个三角形：再数一次
      S.frameAt = now(); const key = `${S.a},${S.b}`; if (!S.pairs.includes(key)) S.pairs.push(key);
      const { a, b } = tri(); say(`${a * a} + ${b * b} = ${a * a + b * b}`, `斜边上的正方形：${(a + b) ** 2} − 4 × ${(a * b) / 2} = ${a * a + b * b}`);
      if (S.pairs.length >= 3 && S.beat === 'vary') later(2800, conjecture);
    }
    function conjecture() {          // 重拍 2：猜想
      if (S.beat !== 'vary') return; S.beat = 'conj'; sfx.ding(1250, { gain: 0.06 });
      for (const k of ['a', 'b', 'c']) { const p = ctr(sqPts(k)); flash(T(p[0], p[1], 0.4), NT, k === 'a' ? BLUE : k === 'b' ? GREEN : GOLD, 1.3); }
      say('两条直角边的平方和，等于斜边的平方', '猜想：a² + b² = c²');
      board.h('猜想'); board(`<span class="n">3</span>如果直角三角形的两条直角边长分别为 ${it('a')}，${it('b')}，斜边长为 ${it('c')}，那么 <span class="qa">${it('a')}²</span> + <span class="qb">${it('b')}²</span> = <span class="qc">${it('c')}²</span>`, 'vary');
      later(2800, () => { S.free = true; go('proof', '所有的直角三角形都这样吗？为什么？', '赵爽（约 3 世纪）用一张弦图说明了原因。先把两个小正方形拼在一起', '点一下蓝色或绿色的正方形，把它们拼在一起'); });
    }
    function mergeSquares() {          // 两个小正方形拼在一起，切成四个三角形和一个黄方
      if (S.beat !== 'proof' || S.mergeAt > 0) return; S.mergeAt = now(); S.free = false; sfx.whoosh({ dur: 0.6, freq: 800, gain: 0.04 });
      const t0 = now(); const step = () => { if (dead) return; S.merge = clamp((now() - t0) / 0.9, 0, 1); layout(); if (S.merge < 1) requestAnimationFrame(step); else afterMerge(); }; step();
    }
    const pieceText = () => S.a === S.b ? '两条直角边等长，四个全等的红色直角三角形恰好拼满，中间不留空' : '四个全等的红色直角三角形之间，还有一个边长为 b − a 的黄色正方形';
    function afterMerge() {
      S.proofSides = [S.a, S.b];
      const pc = pieces(); drawOn(PE.cut, toT([pc.t2[0], pc.t2[2]], 0.12), 0.6);
      say('两个正方形连在一起，面积是 a² + b²', pieceText());
      later(800, () => { S.cut = true; PE.cut.set(null, true); PE.cut.drawing = null; layout(); sfx.clink({ freq: 1000, gain: 0.04 });
        later(900, () => { say('把左、右两个三角形移上去', '按住红色三角形，转上去'); prompt('按住红色三角形，转到上面去'); S.beatAt = now(); }); });
    }
    function placed(i) {
      S.placed[i] = true; sfx.clink({ freq: 1200 + i * 200, gain: 0.05 });
      if (S.placed[0] && S.placed[1]) proved();
    }
    function proved() {          // 重拍 3：拼成斜边上的正方形
      S.proved = true; sfx.ding(1480, { gain: 0.07 }); later(450, () => sfx.ding(1760, { gain: 0.05 }));
      const pc = ctr(sqPts('c')); flash(T(pc[0], pc[1], 0.6), NT, GOLD, 2.6);
      say('a² + b² = c²', pieceText());
      board.h('证明'); board(`<span class="n">4</span>赵爽弦图：把边长分别为 ${it('a')}，${it('b')} 的两个正方形连在一起，面积是 <span class="qa">${it('a')}²</span> + <span class="qb">${it('b')}²</span>。${pieceText()}。两块红片转上去后，四条外边都是斜边 c，每个角都由两个互余的锐角拼成，正好是 90°，所以外框是正方形。拼片的总面积仍是 <span class="qc">${it('c')}²</span>。所以 ${it('a')}² + ${it('b')}² = ${it('c')}²`, 'proof');
      board.h('定理'); board(`<span class="n">5</span><b>勾股定理</b>：直角三角形两条直角边长的平方和等于斜边长的平方。赵爽这种分割、拼接的方法，叫作“出入相补法”`, 'proof');
      later(3200, () => { say('勾股定理', '2002 年在北京召开的国际数学家大会，会标就以赵爽弦图为原型'); later(2600, () => go('apply', '回到水池：水有多深？', '勾 5，股 x，弦 x + 1', '点一下水池三角形的任意一条边')); });
    }
    function apply(side = 'x + 1') {          // 回到水池
      if (S.beat !== 'apply' || S.applied) return; S.applied = true; sfx.clink({ freq: 1100, gain: 0.05 });
      say('x² + 5² = (x + 1)²', side === 'x + 1' ? '点到的芦苇是斜边，长 x + 1 尺，它的平方写在等号右边' : `点到的直角边长 ${side} 尺，它的平方写在等号左边`);
      const [, depth, hypotenuse] = pondEdges();
      S.revealAt = now(); drawOn(PT.gu, depth, traceDuration); drawOn(PT.xian, hypotenuse, traceDuration); sfx.whoosh({ dur: traceDuration, freq: 500, gain: 0.05 });
    }
    function revealed() {          // 重拍 4：池水变清，看见池底
      if (S.done || S.pose) return; sfx.ding(1320, { gain: 0.07 });
      say('水深 12 尺，芦苇长 13 尺', '5² + 12² = 13²');
      later(2400, finish);
    }
    function finish() {
      if (S.done) return; S.beat = 'end'; S.done = true; boardEl?.classList.add('review');
      board.h('答'); board(`<b>答</b>：设水深 ${it('x')} 尺，芦苇长 ${it('x')} + 1 尺。${it('x')}² + 5² = (${it('x')} + 1)²，2${it('x')} + 1 = 25，${it('x')} = 12。水深 12 尺，芦苇长 13 尺。`, 'ans');
      say('答：水深 12 尺，芦苇长 13 尺', '直角三角形两条直角边长的平方和等于斜边长的平方'); prompt(''); ui?.unlock?.();
      later(2600, () => { ui?.go?.(2); ui?.fold?.(false); });          // 一课结束：翻到“对照课本原文”
    }
    // 讲完以后点板书：场景摆回那一刻
    function pose(k) {
      S.pose = k; S.frameAt = -9; S.revealAt = -9;
      const base = { banked: true, th: S.side * TB, reveal: 0, cut: false, merge: 0, rot: [0, 0], placed: [false, false], counted: true, grow: { a: 1, b: 1, c: 1 } };
      Object.assign(S, base);
      if (k === 'pond') { S.grow = { a: 0, b: 0, c: 0 }; say('芦苇、水深、半个池宽，围成一个直角三角形', '勾 5，股 x，弦 x + 1'); }
      if (k === 'shang' || k === 'count') { S.a = 3; S.b = 4; if (k === 'count') S.frameAt = now(); say('9 + 16 = 25', '两矩共长二十有五'); }
      if (k === 'vary') { S.a = 2; S.b = 3; S.frameAt = now(); say('4 + 9 = 13', '如果直角三角形的两条直角边长分别为 a，b，斜边长为 c，那么 a² + b² = c²'); }
      if (k === 'proof') { [S.a, S.b] = S.proofSides; S.merge = 1; S.cut = true; S.rot = [0, 0]; const t0 = now(); const step = () => { if (dead || S.pose !== 'proof') return; const q = clamp((now() - t0) / 1.6, 0, 1); S.rot = [easeOut(clamp(q * 2, 0, 1)), easeOut(clamp(q * 2 - 1, 0, 1))]; layout(); if (q < 1) requestAnimationFrame(step); }; step(); say('a² + b² = c²', pieceText()); }
      if (k === 'ans') { S.reveal = 1; say('答：水深 12 尺，芦苇长 13 尺', '5² + 12² = 13²'); }
      layout(); aim?.(k === 'ans' ? POND_DIR : DIR);
    }

    // ================= 动手 =================
    const reedPick = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 3.4, 10), new THREE.MeshBasicMaterial({ visible: false })); reedPick.userData.pick = true; reedPick.userData.noFrame = true; world.add(reedPick);
    const pickStake = (st) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.6, 10), new THREE.MeshBasicMaterial({ visible: false })); m.userData.pick = true; m.userData.noFrame = true; world.add(m); return m; };
    const pkA = pickStake(), pkB = pickStake();
    const sidePick = () => { const m = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })); m.userData.pick = true; m.userData.noFrame = true; world.add(m); return m; };
    const SP = { a: sidePick(), b: sidePick(), c: sidePick() };
    const pondPicks = ['5', 'x', 'x + 1'].map(side => ({ side, obj: sidePick() }));
    function placePondPicks() {
      const edges = pondEdges();
      pondPicks.forEach(({ obj }, i) => {
        obj.geometry.dispose();
        obj.geometry = ribbon(edges[i], NF, 0.65);
      });
    }
    function placePicks() {
      const tipTh = S.th, tip = [PX + Math.sin(tipTh) * (REED - 1.2), ROOT_Y + Math.cos(tipTh) * (REED - 1.2)]; reedPick.position.set(tip[0], tip[1], 0.2); reedPick.rotation.z = -tipTh;
      const { P, Qa, Qb } = tri(); pkA.position.copy(T(Qa[0], Qa[1], 0.6)); pkB.position.copy(T(Qb[0], Qb[1], 0.6));
      const band = (p, q) => { const pp = [T(p[0], p[1], 0.1), T(q[0], q[1], 0.1)]; return ribbon(pp, NT, 0.7); };
      for (const [k, pq] of [['a', [P, Qa]], ['b', [P, Qb]], ['c', [Qa, Qb]]]) { SP[k].geometry.dispose(); SP[k].geometry = band(...pq); }
    }
    const reedAng = (p) => clamp(Math.atan2(p.x - PX, p.y - ROOT_Y), -TB, TB);
    function reedMove(p) { if (S.held !== 'reed') return; const th = reedAng(p); S.th = th; if (Math.abs(th) >= TB - 0.004 && !S.banked && S.beat === 'pond') { S.th = Math.sign(th) * TB; S.side = Math.sign(th); S.held = ''; banked(); } layout(); placePicks(); }
    function reedUp() { if (S.held !== 'reed') return; S.held = ''; if (!S.banked) { const th0 = S.th, t0 = now(); const step = () => { if (dead || S.banked) return; const k = clamp((now() - t0) / 0.6, 0, 1); S.th = th0 * (1 - easeOut(k)) + Math.sin(k * Math.PI * 3) * 0.02 * (1 - k); layout(); placePicks(); if (k < 1) requestAnimationFrame(step); }; step(); } }
    function stakeMove(which, p) {
      if (S.held !== which) return; const u = p.x, w = -p.z; let a = S.a, b = S.b;
      if (which === 'A') a = clamp(u - P0[0], S.free ? 1.2 : A_MIN, A_MAX); else b = clamp(w - P0[1], S.free ? 1.2 : A_MIN, B_MAX);
      if (!S.free) { a = Math.round(a); b = Math.round(b); }
      if (which === 'A') a = Math.min(a, b); else b = Math.max(b, a);          // 勾是短的直角边，股是长的
      if (a !== S.a || b !== S.b) { S.a = a; S.b = b; if (S.beat === 'vary' && !S.free) varied(); else if (S.beat === 'vary' || S.beat === 'proof') S.frameAt = -9; sfx.clink({ freq: 700 + (a + b) * 60, gain: 0.02 }); layout(); placePicks(); }
    }
    function rotDown(i) { if (!S.cut || S.placed[i] || S.beat !== 'proof') return false; S.held = 't' + i; grab = null; return true; }
    function rotMove(i, p) {
      if (S.held !== 't' + i) return; const pc = pieces(), piv = i === 0 ? pc.piv1 : pc.piv2, ang = Math.atan2(-p.z - piv[1], p.x - piv[0]);
      if (!grab) grab = { a0: ang, r0: S.rot[i] };
      let d = ang - grab.a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      S.rot[i] = clamp(grab.r0 + (i === 0 ? d : -d) / (Math.PI / 2), 0, 1); layout();
    }
    function rotUp(i) { if (S.held !== 't' + i) return; S.held = ''; const from = S.rot[i], to = from > 0.55 ? 1 : 0, t0 = now();
      const step = () => { if (dead) return; const k = clamp((now() - t0) / 0.35, 0, 1); S.rot[i] = lerp(from, to, easeOut(k)); layout(); if (k < 1) requestAnimationFrame(step); else if (to === 1 && !S.placed[i]) placed(i); }; step(); }
    const tapSide = (k) => ({ obj: SP[k], cueTarget: TR[k].core, hint: () => '点一下：在这条边上长出正方形', enabled: () => S.beat === 'gougu' && S.grow[k] <= 0, onTap: () => growSq(k) });
    const drags = [
      { obj: reedPick, cueTarget: reed, plane: 'xy', offset: 0, hint: () => '按住芦苇，往岸边拉', enabled: () => S.beat === 'pond' && !S.banked, onStart: () => { S.held = 'reed'; }, onDrag: (p) => reedMove(p), onEnd: () => reedUp() },
      { obj: pkA, cueTarget: ST.A, plane: 'xz', offset: TOP, hint: () => '拖动木桩', enabled: () => (S.beat === 'vary' || (S.beat === 'proof' && S.mergeAt < 0)), onStart: () => { S.held = 'A'; }, onDrag: (p) => stakeMove('A', p), onEnd: () => { S.held = ''; } },
      { obj: pkB, plane: 'xz', offset: TOP, hint: () => '拖动木桩', enabled: () => (S.beat === 'vary' || (S.beat === 'proof' && S.mergeAt < 0)), onStart: () => { S.held = 'B'; }, onDrag: (p) => stakeMove('B', p), onEnd: () => { S.held = ''; } },
      { obj: PC.t1, plane: 'xz', offset: TOP, hint: () => '按住，转上去', enabled: () => S.cut && !S.placed[0], onStart: () => rotDown(0), onDrag: (p) => rotMove(0, p), onEnd: () => rotUp(0) },
      { obj: PC.t2, plane: 'xz', offset: TOP, hint: () => '按住，转上去', enabled: () => S.cut && !S.placed[1], onStart: () => rotDown(1), onDrag: (p) => rotMove(1, p), onEnd: () => rotUp(1) },
    ];
    const taps = [...pondPicks.map(({ obj, side }, i) => ({ obj, cueTarget: [PT.gou, PT.gu, PT.xian][i].core, cueText: '点一下水池三角形的任意一条边', hint: () => `这条边长 ${side} 尺`, enabled: () => S.beat === 'apply' && !S.applied, onTap: () => apply(side) })), tapSide('a'), tapSide('b'), tapSide('c'),
      { obj: SQ.a.f, hint: () => '点一下：拼在一起', enabled: () => S.beat === 'proof' && S.mergeAt < 0, onTap: () => mergeSquares() },
      { obj: SQ.b.f, hint: () => '点一下：拼在一起', enabled: () => S.beat === 'proof' && S.mergeAt < 0, onTap: () => mergeSquares() }];
    const tip0 = tag?.('', 'pill'), tip = tip0 && { loc(o, x, y, z) { tip0.show(y > -1); tip0.loc(o, x, y, z); return tip; }, text(s) { tip0.text(s); return tip; } };          // 藏签的位置（y = −9）在这么小的 world 里还在画面上：挪到那里就直接藏起来
    const dragApi = draggable(world, drags, { taps, onClick: () => false, tip });
    let heard = false;
    const pointer = { down: (r, e) => { if (!heard) { heard = true; audio(); } return dragApi.down(r, e); }, move: (r, e) => dragApi.move(r, e), up: (r, e) => dragApi.up(r, e), items: dragApi.items };
    function opening() { say('池宽 1 丈，1 丈 = 10 尺', '池中央的芦苇高出水面 1 尺，拉到岸边中点，顶端刚好碰到水面'); prompt('把芦苇拉到岸边中点，水有多深？芦苇有多长？'); }
    const cue = mathActionCue(camera, pointer, dragApi, () => {
      if (S.beat === 'pond' && !S.banked) return reedPick;
      if (S.beat === 'gougu') return Object.entries(SP).find(([k]) => S.growAt[k] < 0)?.[1];
      if (S.beat === 'vary' && S.pairs.length < 3) return pkA;
      if (S.beat === 'proof' && S.mergeAt < 0) return SQ.b.f;
      if (S.cut && !S.proved) return S.placed[0] ? PC.t2 : PC.t1;
      if (S.beat === 'apply' && !S.applied) return pondPicks[0].obj;
    });
    function reset() { cue.reset(); runId++; for (const s of strokes) { s.drawing = null; } draws.length = 0; S = fresh(); S.beatAt = now(); rows.length = 0; lastH = ''; if (boardEl) { boardEl.innerHTML = ''; boardEl.classList.remove('review'); } cap.key = ''; ui?.relock?.(); ui?.go?.(1); opening(); layout(); placePicks(); aim?.(DIR); }
    const onKey = (e) => { if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !e.target?.closest?.('input,textarea')) reset(); };
    addEventListener('keydown', onKey);

    layout(); placePicks();
    const EL = 0.9, AZ = -0.08, DIR = [Math.sin(AZ) * Math.cos(EL), Math.sin(EL), Math.cos(AZ) * Math.cos(EL)];
    const POND_DIR = [0.46, 0.57, 0.78];
    let last = now();
    return {
      group: root, card: false, place: 'spread', scale: 0.95,
      size: { w: (PB.x1 - PB.x0) * U, d: (PB.w1 - PB.w0) * U, h: TOP * U },
      view: { elev: 52, azim: -5, lookY: 0.45, frameMargin: 0.98 },
      pointer: cue.pointer,
      mount(u) { ui = u; boardEl = document.createElement('div'); boardEl.className = 'gg-board' + (S.done ? ' review' : ''); u.controls?.append(boardEl);
        boardEl.addEventListener('click', (e) => { const r = e.target.closest?.('.gb-row'); if (!S.done || !r?.dataset.k) return; for (const o of rows) o.classList?.remove('sel', 'fresh'); r.classList.add('sel'); sfx.clink({ freq: 1200, gain: 0.03 }); pose(r.dataset.k); });
        for (const r of rows) { boardEl.append(r); r.classList.add('in'); }
        ui.go?.(1); if (!cap.key) opening(); else if (S.ask) ui.status?.(S.ask);
        requestAnimationFrame(() => aim?.(DIR)); setTimeout(() => { if (!dead) aim?.(DIR); }, 700); },
      dispose() { cue.dispose(); dead = true; runId++; removeEventListener('keydown', onKey); css.remove(); },
      update() {
        const t = now(), dt = Math.min(0.05, t - last); last = t;
        // 正方形从边上扫出来
        let changed = false;
        for (const k of ['a', 'b', 'c']) if (S.growAt[k] > 0 && S.grow[k] < 1) { S.grow[k] = clamp((t - S.growAt[k]) / 0.7, 0, 1); changed = true; }
        if (S.frameAt > 0 && t - S.frameAt < 2.8) changed = true;
        // 池水变清
        if (S.revealAt > 0 && S.reveal < 1) { S.reveal = clamp((t - S.revealAt) / traceDuration, 0, 1); if (S.reveal >= 1) { changed = true; revealed(); } }
        murk.material.opacity = 1 - easeOut(S.reveal); waterSec.material.opacity = 0.38 - 0.18 * S.reveal;
        if (changed) layout();
        // 画线、迸光
        for (let n = draws.length - 1; n >= 0; n--) { const s = draws[n], d = s.drawing; if (!d) { draws.splice(n, 1); continue; } const k = clamp((t - d.t0) / d.dur, 0, 1); if (k <= 0) continue; const e = k * k * (3 - 2 * k); s.set(partial(d.pts, Math.max(0.001, e)), true); if (k >= 1) { s.drawing = null; s.set(d.pts, true); draws.splice(n, 1); } }
        for (let n = flashes.length - 1; n >= 0; n--) { const f = flashes[n], k = clamp((t - f.t0) / 0.6, 0, 1), e1 = f.n === NT ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(1, 0, 0), e2 = f.n === NT ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
          f.ss.forEach((s, i) => { const a = (i / f.ss.length) * Math.PI * 2 + 0.3, dir = e1.clone().multiplyScalar(Math.cos(a)).add(e2.clone().multiplyScalar(Math.sin(a))), r0 = f.r * (0.35 + 0.9 * easeOut(k)), r1 = f.r * (0.6 + 1.25 * easeOut(k)); s.set([f.p.clone().addScaledVector(dir, r0), f.p.clone().addScaledVector(dir, r1)], true); s.fade(1 - k); });
          if (k >= 1) { for (const s of f.ss) s.dispose(); flashes.splice(n, 1); } }
        // 院子活着：荷叶轻轻晃、芦苇顶在风里摆
        world.children.forEach((m) => { if (m.userData.bob != null) m.position.y = TOP - 0.02 + 0.03 * Math.sin(t * 1.3 + m.userData.bob); });
        if (!S.held && !S.banked) reed.rotation.z = -S.th + 0.012 * Math.sin(t * 1.1);
        // 卡住很久，才一级一级给提示
        if (!S.held && !S.done && S.hint < 1 && t - S.beatAt > 15) {
          const H1 = { pond: ['按住芦苇露出水面的那一截', '往岸边拉，拉到池边的中点'], gougu: ['点一下三角形的边', '在这条边上长出一个正方形，数数有几块方砖'], vary: ['拖动木桩', '换一个直角三角形，再数一次'], proof: S.cut ? ['按住红色三角形，转上去', '两块都转上去，拼成斜边上的正方形'] : ['点一下蓝色或绿色的正方形', '把两个小正方形拼在一起'], apply: ['点一下水池三角形的任意一条边', '勾 5，股 x，弦 x + 1'] }[S.beat];
          if (H1) { S.hint = 1; say(...H1); } }
        // 此刻那一句：淡进淡出
        if (cap.out < 1e9) { const k = clamp(1 - (t - cap.out) / 0.35, 0, 1); capMesh.material.opacity = k; if (k <= 0) { cap.out = 1e9; const nx = cap.next; cap.next = null; nx?.(); } } else capMesh.material.opacity = clamp((t - cap.born) / 0.5, 0, 1);
        void dt;
        cue.update();
      },
      debug: {
        get S() { return S; }, rows, pose, tri, pieces,
        cap: () => S.cap,
        labels: () => [...Object.values(PL), ...Object.values(TL), SQ.a.n, SQ.b.n, SQ.c.n, FR.eq],
        reedTo: (side = 1) => { S.held = 'reed'; reedMove({ x: PX + side * 20, y: ROOT_Y + 8 }); },
        tapSide: (k) => growSq(k), stakeTo: (which, v) => { S.held = which; stakeMove(which, which === 'A' ? { x: P0[0] + v, z: -P0[1] } : { x: P0[0], z: -(P0[1] + v) }); S.held = ''; },
        merge: () => mergeSquares(), rotate: (i) => { if (!rotDown(i)) return; S.rot[i] = 1; S.held = ''; layout(); placed(i); }, apply: () => apply(),
        qa: [
          { name: '把芦苇拉到岸边', run: () => { S.held = 'reed'; reedMove({ x: PX + 20, y: ROOT_Y + 8 }); }, wait: 3.2 },
          { name: '点三条边长出正方形', run: () => { growSq('a'); growSq('b'); growSq('c'); }, wait: 6.6 },
          { name: '换三个直角三角形', run: () => { S.held = 'A'; stakeMove('A', { x: P0[0] + 2, z: -P0[1] }); S.held = 'B'; stakeMove('B', { x: P0[0], z: -(P0[1] + 3) }); S.held = ''; }, wait: 6.4 },
          { name: '拼在一起', run: () => mergeSquares(), wait: 3.2 },
          { name: '两块三角形转上去', run: () => { for (const i of [0, 1]) { if (rotDown(i)) { S.rot[i] = 1; S.held = ''; layout(); placed(i); } } }, wait: 6.6 },
          { name: '回到水池', run: () => apply(), wait: 7 },
        ],
      },
    };
  },
};
