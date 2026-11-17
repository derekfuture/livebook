// 数学 七年级上册 2.2.1 有理数的乘法 · “思考”。课本第 39 页。试做：先一页，再一沓。
//
// 课本这一页：(−3)×3＝−9，(−3)×2＝−6，(−3)×1＝−3，“随着后一乘数逐次递减 1，积逐次增加 3。
// 按照上述规律，下面的空格应各填什么数？(−3)×0，(−3)×(−1)，(−3)×(−2)，(−3)×(−3)”。
//
// 第一幕（一页）：这一列算式立成一页纸。水面当 0，积是正的就立在水面上，负的就垂在水面下，纸的边连着七个积。
//   前三个是已知的；后面四个空是四颗黄珠子，学生自己拖着填。纸照他填的数搭出来，脚边的小纸签写着每退一格积变了多少：
//   填成 0、−3、−6、−9，就是 +3、+3、+3、−3、−3、−3，纸在水面那里折下去。只有每一步都是 +3，纸的边才是直的。
// 第二幕（一沓）：填直以后，前一个乘数是 −2、−1、0、1、2、3 的那几页也一页页立起来（按乘法算），
//   每一页都是直的，换个方向连起来也是直的：整张乘法表成了一张面。
// 压回去，就是填满的表。
//
// 说法上的分寸：这是“要让规律在负数里继续成立，就只能这样定”，不是证明；纸直不直只是这条要求看得见的样子。
import * as THREE from 'three';
import { sheet, piece, text, tweens, clamp, grain, SERIF } from './kit/sheet.js';
import { draggable } from './kit/interact.js';
import { sfx } from './kit/audio.js';

const W = 0.3, D = 0.27;                        // 纸的大小（米）
const G = 0.03, N = 3;                          // 表格一格多大；乘数从 3 到 −3
const SH = 0.0064, H0 = 9 * SH + 0.006;         // 积每多 1 立高多少；水面（0）离纸面多高
const O = [0, 0.006];                           // 表格中心（0×0）在纸上的位置
const POOL = N * G + 0.016;                     // 水槽内壁到表格中心的距离
const RIM = 0.006;                              // 玻璃比水面高出多少
const SLOT = 0.017;                             // 第一幕的水槽只有最前面一条：前后各这么宽
const INK = '#27324a', GOLD = '#e9a520', PAPER = '#fdfaf1';
const num = (x) => (x < 0 ? `−${-x}` : `${x}`);
const signed = (d) => (d > 0 ? `+${d}` : d < 0 ? `−${-d}` : '0');
const back = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const smooth = (t) => t * t * (3 - 2 * t);
const dirOf = (elev, azim) => { const e = (elev * Math.PI) / 180, a = (azim * Math.PI) / 180; return [Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)]; };
const VIEW1 = { elev: 24, azim: -17 }, VIEW2 = { elev: 32, azim: -36 };        // 第一幕贴近看最前面那一页；第二幕退开看整张面

export default {
  id: 'saddle',
  fig: '思考',
  title: '负数乘负数',
  flow: 'explore',
  ask: '(−3)×3＝−9，(−3)×2＝−6，(−3)×1＝−3：后一个乘数每减 1，积就增加 3。<br>按照这个规律，后面四个空各填什么数？<b>水面当 0</b>，把这一列算式立起来，四个空你来填。',
  need: '把四颗黄珠子拖到纸不用折，再看整张表',
  conclusion: {
    quote: '两数相乘，同号得正，异号得负，且积的绝对值等于乘数的绝对值的积。任何数与0相乘，都得0。',
    why: '课本是这样得到的：(−3)×3＝−9，(−3)×2＝−6，(−3)×1＝−3，随着后一乘数逐次递减 1，积逐次增加 3。<b>按照上述规律</b>，(−3)×0＝0，(−3)×(−1)＝3，(−3)×(−2)＝6，(−3)×(−3)＝9。<br><br>这不是证明出来的，是定出来的：前面学过的规律（每退一格，积的变化都一样）要在负数里继续成立，负数乘负数就只剩这一种定法。立起来的那页纸直不直，就是这条要求看得见的样子。',
    src: '课本第 38–39 页 · 第二章 2.2.1 有理数的乘法',
  },

  create(ctx) {
    const group = new THREE.Group();
    const tw = tweens();
    // rise：最前面那一页立起来多少；stack：其余六页立起来多少；g：学生给 (−3)×0、(−3)×(−1)、(−3)×(−2)、(−3)×(−3) 填的数（null = 还没填）
    const S = { rise: 0, stack: 0, flat: true, g: [null, null, null, null], lock: false, glow: 0, held: null, clock: 0, done: false, nudge: 0, auto: false };
    let ui = null, dead = false;
    const at = (a, b) => [O[0] - b * G, O[1] + a * G];                     // 照课本算式的顺序：后一个乘数从左到右是 3、2、1、0、−1、−2、−3；前一个乘数是 −3 的那一行在最前面
    const front = (b) => (b > 0 ? -N * b : S.g[-b]);                       // 最前面那一页：前三个已知，后四个是学生填的
    const val = (a, b) => (a === -N ? front(b) : a * b);

    // ---- 纸：印着课本的那一列算式；压回去以后是整张表 ----
    const paper = sheet({ w: W, d: D, draw: (g, px) => {
      const X = (u) => (u + W / 2) * px, Y = (v) => (D / 2 - v) * px, all = S.stack > 0.5;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.strokeStyle = 'rgba(60,66,84,0.3)'; g.lineWidth = Math.max(1, px * 0.00022);
      const top = all ? N + 0.5 : -N + 0.5;          // 第一幕只印最前面那一行的格子
      for (let i = -N; i <= N + 1; i++) { g.beginPath(); g.moveTo(X(O[0] + (i - 0.5) * G), Y(O[1] + top * G)); g.lineTo(X(O[0] + (i - 0.5) * G), Y(O[1] - (N + 0.5) * G)); g.stroke(); }
      for (let i = -N; i <= (all ? N + 1 : -N + 1); i++) { g.beginPath(); g.moveTo(X(O[0] - (N + 0.5) * G), Y(O[1] + (i - 0.5) * G)); g.lineTo(X(O[0] + (N + 0.5) * G), Y(O[1] + (i - 0.5) * G)); g.stroke(); }
      if (S.flat) for (let a = -N; a <= (all ? N : -N); a++) for (let b = -N; b <= N; b++) {
        const p = val(a, b), [u, v] = at(a, b);
        g.font = `${p == null ? 400 : 600} ${px * 0.011}px ${SERIF}`; g.fillStyle = p == null ? 'rgba(120,116,102,0.6)' : INK;
        g.fillText(p == null ? '?' : num(p), X(u), Y(v));
      }
      // 脚边：课本上的那七个算式；两侧：前一个乘数
      const e = POOL + 0.011;
      g.fillStyle = '#2f3950';
      for (let b = -N; b <= N; b++) { g.font = `600 ${px * (b < 0 ? 0.0066 : 0.0074)}px ${SERIF}`; g.fillText(`(−3)×${b < 0 ? `(${num(b)})` : b}`, X(O[0] - b * G), Y(O[1] - e)); }
      if (all) { g.font = `600 ${px * 0.0086}px ${SERIF}`; for (let a = -N; a <= N; a++) for (const s of [-1, 1]) g.fillText(num(a), X(O[0] + s * (e + 0.001)), Y(O[1] + a * G)); for (let b = -N; b <= N; b++) g.fillText(num(b), X(O[0] - b * G), Y(O[1] + e)); }
    } });
    group.add(paper.group);
    const root = paper.group;
    root.traverse((o) => { o.userData.noFrame = true; });
    // 取景只看这个看不见的盒子：第一幕框住最前面那一页，第二幕框住整个水槽
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false }));
    frame.raycast = () => {}; root.add(frame);
    const setFrame = (two) => { const v0 = O[1] - POOL - 0.03, v1 = two ? O[1] + POOL + 0.012 : O[1] - N * G + 0.03, h = H0 + 9 * SH + 0.02; frame.scale.set(2 * POOL + 0.03, h, v1 - v0); frame.position.set(O[0], h / 2, -(v0 + v1) / 2); };
    setFrame(false);

    // ---- 水：水面以下的东西稍微往水色里沉一点 ----
    const water = { y: { value: -1 }, fade: { value: 0.05 }, s: { value: 1 }, t: { value: 0 }, deep: { value: new THREE.Color('#5fb0c6') }, fill: { value: 0 } };
    const sink = (mat) => {
      mat.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, { uWaterY: water.y, uFade: water.fade, uDeep: water.deep });
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSinkW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvSinkW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vSinkW;\nuniform float uWaterY, uFade;\nuniform vec3 uDeep;')
          .replace('#include <fog_fragment>', '#include <fog_fragment>\n{ float dpt = uWaterY - vSinkW.y; if (dpt > 0.0) gl_FragColor.rgb = mix(gl_FragColor.rgb, uDeep, 0.05 + 0.2 * clamp(dpt / uFade, 0.0, 1.0)); }');
      };
      mat.customProgramCacheKey = () => 'saddle-sink';
      return mat;
    };
    const VERT = 'varying vec3 vW; varying vec2 vL; void main() { vL = vec2(position.x, -position.z); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
    const pool = new THREE.Group(); pool.position.set(O[0], 0, -O[1]); root.add(pool);
    // 水底：给纸面罩一层很淡的水色
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(2 * POOL, 2 * POOL).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uK: water.fill }, vertexShader: VERT,
      fragmentShader: 'uniform float uK; varying vec3 vW; varying vec2 vL; void main() { gl_FragColor = vec4(0.3, 0.62, 0.74, 0.3 * uK); }' }));
    floor.position.y = 0.0007; floor.renderOrder = 1;
    // 水面：很平，只有一点反光；表格的格线浮在上面
    const surf = new THREE.Mesh(new THREE.PlaneGeometry(2 * POOL, 2 * POOL).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uT: water.t, uS: water.s, uSun: { value: new THREE.Vector3(-0.3, 0.87, 0.4).normalize() }, uG: { value: G }, uN: { value: N + 0.5 }, uZ: { value: new THREE.Vector2(1, 0) } }, vertexShader: VERT,
      fragmentShader: `uniform float uT, uS, uG, uN; uniform vec2 uZ; uniform vec3 uSun; varying vec3 vW; varying vec2 vL;
        void main() {
          vec3 V = normalize(cameraPosition - vW); vec2 p = vW.xz / uS * 90.0;
          vec3 n = normalize(vec3(0.02 * cos(p.x + uT * 0.9) + 0.014 * cos((p.x + p.y) * 0.63 - uT * 0.6), 1.0, 0.02 * cos(p.y * 1.13 - uT * 0.8) + 0.014 * sin((p.x - p.y) * 0.57 + uT * 0.5)));
          float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0), spec = pow(max(dot(n, normalize(uSun + V)), 0.0), 300.0);
          vec3 col = mix(vec3(0.66, 0.86, 0.9), vec3(0.95, 0.98, 1.0), fres) + spec * 0.7; float a = 0.16 + 0.45 * fres + spec * 0.6;
          vec2 c = vec2(vL.x, vL.y * uZ.x + uZ.y) / uG + uN; vec2 d = abs(fract(c + 0.5) - 0.5) / max(fwidth(c), vec2(1e-4));
          float line = (1.0 - min(min(d.x, d.y), 1.0)) * step(-0.02, c.x) * step(c.x, 2.0 * uN + 0.02) * step(-0.02, c.y) * step(c.y, 2.0 * uN + 0.02);
          col = mix(col, vec3(0.2, 0.26, 0.38), line * 0.45); a = max(a, line * 0.4);
          gl_FragColor = vec4(col, a);
        }` }));
    surf.renderOrder = 3;
    // 玻璃槽：四面薄玻璃
    const glassMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uWaterY: water.y }, vertexShader: VERT,
      fragmentShader: 'uniform float uWaterY; varying vec3 vW; varying vec2 vL; void main() { float under = step(vW.y, uWaterY); gl_FragColor = vec4(mix(vec3(0.97, 0.99, 1.0), vec3(0.6, 0.83, 0.88), under), mix(0.05, 0.13, under)); }' });
    const glass = new THREE.Group();
    for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * POOL, 1).translate(0, 0.5, 0), glassMat); m.rotation.y = (i * Math.PI) / 2; m.position.set(Math.sin((i * Math.PI) / 2) * POOL, 0, Math.cos((i * Math.PI) / 2) * POOL); m.renderOrder = 2; glass.add(m); }
    const rimPts = []; for (let i = 0; i < 4; i++) { const c = [[-1, -1], [1, -1], [1, 1], [-1, 1]], p = c[i], q = c[(i + 1) % 4]; rimPts.push(p[0] * POOL, 1, p[1] * POOL, q[0] * POOL, 1, q[1] * POOL, p[0] * POOL, 0, p[1] * POOL, p[0] * POOL, 1, p[1] * POOL); }
    const rim = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(rimPts, 3)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
    rim.renderOrder = 4; glass.add(rim);
    pool.add(floor, surf, glass);
    for (const o of [floor, surf, rim, ...glass.children]) { o.raycast = () => {}; o.userData.noFrame = true; o.frustumCulled = false; }

    // ---- 立着的纸：横线本的纸，一格是 1，粗线是 3 ----
    const ruledTex = (() => {
      const c = document.createElement('canvas'); c.width = 128; c.height = 384; const g = c.getContext('2d');
      g.fillStyle = PAPER; g.fillRect(0, 0, 128, 384); g.globalAlpha = 0.5; g.fillStyle = g.createPattern(grain().image, 'repeat'); g.fillRect(0, 0, 128, 384); g.globalAlpha = 1;
      for (let k = 0; k < 3; k++) { g.strokeStyle = k ? 'rgba(52,96,150,0.3)' : 'rgba(52,96,150,0.58)'; g.lineWidth = k ? 2 : 3; g.beginPath(); g.moveTo(0, 384 - k * 128 - 2); g.lineTo(128, 384 - k * 128 - 2); g.stroke(); }
      g.strokeStyle = 'rgba(52,96,150,0.16)'; g.lineWidth = 2; g.beginPath(); g.moveTo(1, 0); g.lineTo(1, 384); g.stroke();
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
    })();
    const strip = (mat, max, shadow) => {
      const pos = new Float32Array(max * 18), nor = new Float32Array(max * 18), col = new Float32Array(max * 18), uv = new Float32Array(max * 12);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.raycast = () => {}; mesh.userData.noFrame = true; mesh.castShadow = mesh.receiveShadow = !!shadow; root.add(mesh);
      let n = 0;
      return { mesh,
        begin() { n = 0; },
        /** 从 (u0, v0) 到 (u1, v1) 竖着的一块：两头各从 lo 到 hi；(nx, nz) 是法线；c 是颜色；s0、s1 是沿着纸走的格数，base 是 0 那条线的高度（贴横线用） */
        quad(u0, v0, u1, v1, lo0, hi0, lo1, hi1, nx, nz, c, s0 = 0, s1 = 1, base = 0) {
          if (n >= max) return;
          const P = [[u0, lo0, v0, s0], [u1, lo1, v1, s1], [u1, hi1, v1, s1], [u0, lo0, v0, s0], [u1, hi1, v1, s1], [u0, hi0, v0, s0]];
          for (let i = 0; i < 6; i++) { const k = n * 18 + i * 3, p = P[i]; pos[k] = p[0]; pos[k + 1] = p[1]; pos[k + 2] = -p[2]; nor[k] = nx; nor[k + 1] = 0; nor[k + 2] = nz; col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b; uv[n * 12 + i * 2] = p[3]; uv[n * 12 + i * 2 + 1] = (p[1] - base) / (3 * SH); }
          n++;
        },
        end() { geo.setDrawRange(0, n * 6); for (const k of ['position', 'normal', 'color', 'uv']) geo.attributes[k].needsUpdate = true; mesh.visible = n > 0; } };
    };
    const leafMat = sink(new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, map: ruledTex, roughness: 0.96, metalness: 0, side: THREE.DoubleSide, emissive: 0xfff6e6, emissiveIntensity: 0.16 }));
    const keelMat = sink(new THREE.MeshBasicMaterial({ color: 0xf6f4ec, vertexColors: true, map: ruledTex, side: THREE.DoubleSide }));          // 水下的那半页不吃灯光
    const inkMat = sink(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    const leaves = [], keels = [], edges = [], tapes = [];        // 下标 a + N：前一个乘数是 a 的那一页（leaves 是露出水面的部分，keels 是水下的部分，edges 是它的边）；tapes[b + N]：后一个乘数是 b 的那一列连成的线
    for (let k = -N; k <= N; k++) { leaves.push(strip(leafMat, 2 * N, true)); keels.push(strip(keelMat, 2 * N, false)); edges.push(strip(inkMat, 4 * N + 2, false)); tapes.push(strip(inkMat, 2 * N, false)); }
    const C = { warm: new THREE.Color('#fbd9cb'), cool: new THREE.Color('#c2d5f4'), white: new THREE.Color(0xffffff), ink: new THREE.Color(INK), soft: new THREE.Color('#5d6880'), crease: new THREE.Color('#b8ad98'), gold: new THREE.Color(GOLD), tmp: new THREE.Color() };
    const BH = 0.0017, TH = 0.0011;        // 纸边、连线各有多宽

    // ---- 小纸签：数、步子 ----
    const tagTex = new Map();
    const tagMap = (s, mine, step) => {
      const key = s + (mine ? 'm' : 'k') + (step ? 's' : ''); if (tagTex.has(key)) return tagTex.get(key);
      const c = document.createElement('canvas'); c.width = 192; c.height = 112; const g = c.getContext('2d');
      const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
      if (step) { rr(6, 14, 180, 84, 42); g.fillStyle = mine ? GOLD : INK; g.fill(); }
      else { rr(4, 4, 184, 104, 22); g.fillStyle = mine ? '#fff0c2' : '#fbf7ea'; g.fill(); rr(8, 8, 176, 96, 18); g.strokeStyle = mine ? GOLD : 'rgba(39,50,74,0.5)'; g.lineWidth = mine ? 8 : 4; g.stroke(); }
      g.font = `700 ${step ? 60 : s.length > 2 ? 62 : 72}px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = step && !mine ? '#ffffff' : '#1f2940'; g.fillText(s, 96, step ? 58 : 60);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; tagTex.set(key, t); return t;
    };
    const mkTag = () => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagMap('0', false), alphaTest: 0.5, transparent: false })); sp.raycast = () => {}; sp.userData.noFrame = true; sp.visible = false; root.add(sp); return { sp, key: null }; };
    const setTag = (t, s, mine, size, u, y, v, lift = 0.004, step = false) => { const key = s + mine + step; if (t.key !== key) { t.key = key; t.sp.material.map = tagMap(s, mine, step); t.sp.material.needsUpdate = true; } t.sp.visible = size > 0.0005; t.sp.scale.set(size, size * (112 / 192), 1); t.sp.position.set(u + toCam.x * lift, y + toCam.y * lift, -v + toCam.z * lift); };
    const tags = []; for (let a = -N; a <= N; a++) for (let b = -N; b <= N; b++) tags.push({ a, b, ...mkTag() });
    const steps = []; for (let i = 0; i < 2 * N; i++) steps.push(mkTag());

    // ---- 四颗黄珠子：课本的四个空 ----
    const [, vF] = at(-N, 0);
    const beads = [0, 1, 2, 3].map((i) => {
      const [u] = at(-N, -i);
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 26, 18), new THREE.MeshStandardMaterial({ color: 0xe9a520, roughness: 0.32, metalness: 0.15 }));
      m.castShadow = true; m.userData.noFrame = true; root.add(m);
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.00045, 0.00045, 1, 8).translate(0, 0.5, 0), sink(new THREE.MeshLambertMaterial({ color: 0xa79a80 })));
      wire.raycast = () => {}; wire.userData.noFrame = true; wire.position.set(u, 0.001, -vF); wire.scale.y = H0 + 9 * SH + 0.006; root.add(wire);
      return { i, u, m, wire };
    });

    // ---- 整张面上，整数之间的那些数（细线；第二幕才出现） ----
    const finePos = [];
    const seg = (a0, b0, a1, b1) => { for (const [a, b] of [[a0, b0], [a1, b1]]) finePos.push(O[0] - b * G, H0 + SH * a * b, -(O[1] + a * G)); };
    for (let i = 1; i < 2 * N * 3; i++) { if (i % 3 === 0) continue; const t = -N + i / 3; seg(t, -N, t, N); seg(-N, t, N, t); }
    const fine = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(finePos, 3)), sink(new THREE.LineBasicMaterial({ color: 0x4a5a78, transparent: true, opacity: 0, depthWrite: false })));
    fine.raycast = () => {}; fine.userData.noFrame = true; fine.frustumCulled = false; fine.visible = false; root.add(fine);

    // ---- 纸条和字 ----
    const tabAt = [W / 2 - 0.036, -D / 2 + 0.0125];
    const tab = piece(root, [[-0.03, -0.008], [0.03, -0.008], [0.03, 0.008], [-0.03, 0.008]].map((p) => [p[0] + tabAt[0], p[1] + tabAt[1]]), { color: '#f1e3c4', pivot: tabAt, y: 0.0007 });
    const tabText = text(root, '立起来', { h: 0.0072, color: '#3a3324', weight: 600, y: 0.0012 }).at(tabAt[0], tabAt[1]);
    const note = text(root, '', { hand: true, h: 0.0062, color: '#4a5165' });
    const zero = mkTag();

    // ---- 摆放 ----
    const v3 = new THREE.Vector3(), toCam = new THREE.Vector3(-0.3, 0.45, 0.84).normalize();
    const level = () => H0 * smooth(clamp(S.rise * 1.6, 0, 1));
    const liftOf = (a) => (a === -N ? back(clamp(S.rise * 1.5 - 0.5, 0, 1)) : back(clamp(S.stack * 1.7 - (0.7 * (a + N - 1)) / (2 * N - 1), 0, 1)));          // 最前面那页先起；其余六页从近到远一页页起
    const layout = () => {
      const wl = level(), up = S.rise > 0.03, ready = S.rise > 0.97;
      const Y = (a, b) => { const p = val(a, b); return p == null ? null : Math.max(0.0009, wl + liftOf(a) * SH * p); };
      for (let a = -N; a <= N; a++) {
        const L = leaves[a + N], K = keels[a + N], E = edges[a + N], main = a === -N, shown = up && (main || S.stack > 0.02); L.begin(); K.begin(); E.begin();
        if (shown) for (let i = 0; i < 2 * N; i++) {
          const b0 = N - i, b1 = b0 - 1, p0 = val(a, b0), p1 = val(a, b1); if (p0 == null || p1 == null) continue;
          const [u0, v0] = at(a, b0), [u1] = at(a, b1), y0 = Y(a, b0), y1 = Y(a, b1);
          // 这一段可能一头在水上、一头在水下：在水面那里切开，水上的半块吃灯光，水下的不吃
          const cut = (p0 > 0 && p1 < 0) || (p0 < 0 && p1 > 0) ? p0 / (p0 - p1) : null, parts = cut == null ? [[0, 1]] : [[0, cut], [cut, 1]];
          for (const [t0, t1] of parts) {
            const ua = u0 + (u1 - u0) * t0, ub = u0 + (u1 - u0) * t1, ya = y0 + (y1 - y0) * t0, yb = y0 + (y1 - y0) * t1, mid = (ya + yb) / 2 - wl;
            if (Math.abs(mid) > 1e-6) (mid > 0 ? L : K).quad(ua, v0, ub, v0, wl, ya, wl, yb, 0, 1, mid > 0 ? C.warm : C.cool, i + t0, i + t1, wl);
          }
          const ink = C.tmp.copy(main ? C.ink : C.soft).lerp(C.gold, S.glow), w = main ? BH : BH * 0.7;
          E.quad(u0, v0, u1, v0, y0 - w / 2, y0 + w / 2, y1 - w / 2, y1 + w / 2, 0, 1, ink);
          // 折痕：这一格前后的步子不一样，纸就在这里折了一下
          const p2 = b1 > -N ? val(a, b1 - 1) : null;
          if (main && p2 != null && p0 - p1 !== p1 - p2 && Math.abs(y1 - wl) > 0.001) E.quad(u1 - 0.0005, v0, u1 + 0.0005, v0, Math.min(wl, y1), Math.max(wl, y1), Math.min(wl, y1), Math.max(wl, y1), 0, 1, C.crease);
        }
        L.end(); K.end(); E.end();
      }
      // 换个方向：每一列连起来的线（第二幕）
      for (let b = -N; b <= N; b++) {
        const T = tapes[b + N]; T.begin();
        if (up && S.stack > 0.02) for (let i = 0; i < 2 * N; i++) {
          const a0 = -N + i, a1 = a0 + 1, [u0, v0] = at(a0, b), [, v1] = at(a1, b), y0 = Y(a0, b), y1 = Y(a1, b); if (y0 == null || y1 == null) continue;
          T.quad(u0, v0, u0, v1, y0 - TH / 2, y0 + TH / 2, y1 - TH / 2, y1 + TH / 2, 1, 0, C.tmp.copy(C.soft).lerp(C.gold, S.glow));
        }
        T.end();
      }
      // 每个积旁边的小纸签
      for (const t of tags) {
        const main = t.a === -N, p = val(t.a, t.b), y = p == null ? null : Y(t.a, t.b), k = main ? clamp(S.rise * 5 - 3.6, 0, 1) : clamp(S.stack * 4 - 2.4 - 0.1 * (t.a + N), 0, 1);
        const [u, v] = at(t.a, t.b), mine = main && t.b <= 0;
        if (mine && p == null && ready && S.stack < 0.5) { setTag(t, '?', true, 0.0172, u, wl + 0.0118, v, 0.007); continue; }          // 还没填的空
        if (!up || y == null || k <= 0 || (!main && (S.stack < 0.02 || t.a !== N))) { t.sp.visible = false; continue; }
        setTag(t, num(p), mine, (main ? 0.0172 : 0.0098) * k, u, y + (mine ? 0.0118 : p > 0 ? 0.0078 : main ? 0.0052 : 0.0046), v, mine ? 0.007 : 0.004);
      }
      // 脚边的步子：每退一格，积变了多少（只标最前面那一页）
      for (let i = 0; i < 2 * N; i++) {
        const b = N - i, p1 = front(b), p0 = front(b - 1), t = steps[i];
        if (!ready || p0 == null || p1 == null) { t.sp.visible = false; continue; }
        const [u, v] = at(-N, b - 0.5);
        setTag(t, signed(p0 - p1), b <= 0, 0.0158, u, wl + 0.0062, v - 0.0125, 0, true);
      }
      // 黄珠子
      for (const bd of beads) {
        const g = S.g[bd.i], y = wl + SH * (g == null ? 0 : g) + (g == null ? 0.001 * Math.sin(S.clock * 2.2 + bd.i) : 0);
        bd.m.visible = bd.wire.visible = ready && S.stack < 0.5; bd.m.position.set(bd.u, y, -vF); bd.m.scale.setScalar(1 + (g == null ? 0.2 * S.nudge : 0));
      }
      // 水、玻璃、0
      const fill = clamp(S.rise * 4, 0, 1);
      pool.visible = up; water.fill.value = fill; surf.position.y = Math.max(0.001, wl - 0.0004); glass.scale.y = Math.max(0.001, wl + RIM * fill);
      const grow = smooth(clamp(S.stack * 2.2, 0, 1)), half = SLOT + (POOL - SLOT) * grow, mid = O[1] - POOL + half;          // 前壁不动，后壁往后退
      pool.position.z = -mid; pool.scale.z = half / POOL; surf.material.uniforms.uZ.value.set(half / POOL, mid - O[1]);
      if (ready) setTag(zero, '0', false, 0.0128, O[0] - N * G - 0.0155, wl + 0.0044, O[1] - N * G, 0); else zero.sp.visible = false;
      fine.visible = S.stack > 0.9 && S.rise > 0.99; fine.material.opacity = 0.34 * clamp(S.stack * 10 - 9, 0, 1);
      const tabOn = !tw.busy && (S.rise < 0.5 ? S.auto : S.lock);          // 第一幕没填直以前，没有纸条可点
      tab.show(tabOn); tabText.fade(tabOn ? 1 : 0); tabText.say(S.rise < 0.5 ? '立起来' : S.stack < 0.5 ? '整张表' : '压回去');
    };
    const say = (s, html = s) => { note.say(s).at(-W / 2 + 0.018 + note.scale.x / 2, -D / 2 + 0.0125); ui?.status(html); };
    const hint = () => {
      if (S.rise < 0.5) return S.stack > 0.5 ? say('压回纸面，就是填满的乘法表', '压回纸面，就是填满的乘法表：课本上那几列算式，都在里面。') : say('课本“思考”里的那一列算式', '这是课本“思考”里的那一列算式。');
      if (S.stack > 0.5) return say('每一页都是直的；换个方向连起来，也是直的', '前一个乘数换成 −2、−1、0、1、2、3，每一页也都是<b>直的</b>；换个方向把它们连起来，还是直的。<br>整张乘法表，就是这一张面。点纸条，把它压回纸面。');
      const set = S.g.filter((x) => x != null).length;
      if (!set) return say('前三个已经立好：每退一格 +3。后面四个空，拖黄珠子来填', '水面是 0，负的积垂在水面下。前三个已经立好：后一个乘数每减 1，积<b>增加 3</b>。<br>后面四个空，拖<b>黄珠子</b>来填（点一下就是填 0）。');
      if (S.lock) return say('每一步都是 +3，纸一直是直的：(−3)×(−3)＝9', '每一步都是 <b>+3</b>，纸一直是直的：(−3)×0＝0，(−3)×(−1)＝3，(−3)×(−2)＝6，(−3)×(−3)＝9。<br>要让规律在负数里继续成立，只有这一种填法。点纸条，看<b>整张表</b>。');
      const seq = [-9, -6, -3, ...S.g]; let bad = null;
      for (let i = 1; i < seq.length; i++) if (seq[i] != null && seq[i - 1] != null && seq[i] - seq[i - 1] !== 3 && bad == null) bad = seq[i] - seq[i - 1];
      if (bad != null) return say(`照你填的：前面每退一格 +3，这里成了 ${signed(bad)}，纸折了`, `照你填的搭出来了：前面每退一格积 <b>+3</b>，到这里成了 <b>${signed(bad)}</b>，纸折了一下，规律断了。<br>再拖拖看，怎么填，纸才一直是直的。`);
      return say('接着填后面的空', '到这里还是每退一格 <b>+3</b>。接着填后面的空。');
    };
    const check = () => {
      const was = S.lock; S.lock = S.g[0] === 0 && S.g[1] === 3 && S.g[2] === 6 && S.g[3] === 9;
      if (S.lock && !was) { sfx.clink({ freq: 1500, gain: 0.05 }); sfx.ding(880, { gain: 0.05 }); tw.to(1.1, (k) => { S.glow = Math.sin(Math.PI * k); }, () => { S.glow = 0; }); }
      hint();
    };
    const setG = (i, v) => { if (S.g[i] === v) return; S.g[i] = v; sfx.clink({ freq: 700 + 40 * v, gain: 0.025 }); check(); };
    const go = (what, to, dur, done) => { const from = S[what]; tw.to(dur, (k) => { S[what] = from + (to - from) * (to ? k : smooth(k)); }, () => { S[what] = to; done?.(); hint(); }); sfx.clink({ freq: to ? 900 : 600, gain: 0.04 }); };
    const press = () => {
      if (tw.busy) return;
      if (S.rise < 0.5) { S.flat = false; paper.repaint(); setFrame(false); ctx?.aim?.(dirOf(VIEW1.elev, VIEW1.azim)); return go('rise', 1, 1.3); }
      if (S.lock && S.stack < 0.5) { setFrame(true); ctx?.aim?.(dirOf(VIEW2.elev, VIEW2.azim)); if (!S.done) { S.done = true; ui?.unlock(); } return go('stack', 1, 1.9); }
      // 压回去：全躺平；立过整张表的话，印出来的就是整张表
      go('rise', 0, 0.9, () => { S.flat = true; paper.repaint(); if (S.stack > 0.5) setTimeout(() => { if (!dead) { ui?.go?.(1); ui?.fold?.(false); } }, 900); });
    };

    // ---- 拖动 ----
    const drags = beads.map((bd) => ({
      obj: bd.m, plane: 'xy', offset: -vF, enabled: () => S.rise > 0.97 && S.stack < 0.5,
      hint: () => '上下拖：这个空填几',
      onStart: () => { S.held = bd.i; if (S.g[bd.i] == null) setG(bd.i, 0); },
      onDrag: (p) => setG(bd.i, clamp(Math.round((p.y - H0) / SH), -9, 9)),
      onEnd: () => { S.held = null; },
    }));
    const pointer = draggable(group, drags, { taps: [{ obj: tab.fill, hint: () => (S.rise < 0.5 ? '点一下：立起来' : S.stack < 0.5 ? '点一下：看整张表' : '点一下：压回纸面'), onTap: () => { if (S.rise < 0.5 || S.lock) press(); } }] });

    root.traverse((o) => { if (o !== frame) o.userData.noFrame = true; });          // 取景只认那个盒子
    layout(); hint();

    return {
      group,
      card: false,
      panel: 'folded',
      place: 'spread',
      scale: 0.8,
      size: { w: W, d: D, h: 0.12 },
      view: { ...VIEW1, lookY: 0.4, frameMargin: 1.0 },
      pointer,
      mount(u) { ui = u; hint(); },
      dispose() { dead = true; },
      update(dt) {
        tw.update(dt);
        const idle = S.held == null && !tw.busy; S.clock += dt;
        if (!S.auto && S.clock > 0.8) { S.auto = true; if (S.rise < 0.5) press(); }          // 翻开以后，这一列算式自己立起来
        const ph = (S.clock % 2.8) / 0.9; S.nudge = idle && S.rise > 0.97 && ph < 1 ? Math.sin(Math.PI * ph) ** 2 : 0;
        tab.pose({ lift: idle && (S.rise < 0.5 || (S.lock && S.stack < 0.5)) && ph < 1 ? 0.004 * Math.sin(Math.PI * ph) ** 2 : 0 });
        // 水面在世界里的高度（给“水下变色”用），镜头在哪边（让小纸签不被纸挡住）
        root.updateWorldMatrix(true, false); const sc = root.getWorldScale(v3).y, wl = level();
        water.s.value = sc; water.fade.value = 9 * SH * sc; water.t.value = S.clock; water.y.value = root.localToWorld(v3.set(0, wl - 0.0004, 0)).y - (S.rise > 0.03 ? 0 : 1);
        const cam = globalThis.__lb?.stage?.camera; if (cam) { root.worldToLocal(toCam.copy(cam.position)); toCam.sub(v3.set(O[0], H0, -O[1])).normalize(); }
        layout();
      },
      test: { S, at, H0, SH, G, N, press, setG, tabAt, beadAt: (i) => [beads[i].u, vF] },
    };
  },
};
