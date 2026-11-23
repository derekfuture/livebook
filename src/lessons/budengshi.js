// 数学 七年级下册 11.1.2 不等式的性质（课本 PDF 第 129–132 页；性质2、性质3 和例2 在第 131 页）。
// 一湖静水立在书上，四周是一座座石灰岩山峰（峰林），水里是一模一样的倒影。
// 水面就是 0：高出水面是正，倒影里是负——山高 h，它倒影的山尖就在 −h（倒影和山关于水面对称）。
// 一根竖着的数轴立在湖里，0 在水面上；它的负半边正好落在倒影里。山 A、山 B 的高度 a = 6、b = 2 标在数轴上。
// 一个画面里讲完，每一步都由学生的那一下做出来：
//   开头的问题（例2）：已知 a > b，−2a 与 −2b 谁大？
//   拖水面：水涨水落，每座山露出水面的高度都少（多）一样多，谁高谁低不变（性质1）；
//     水面在两个山尖之间时：A 还露着、B 没进水里，a − c > 0 > b − c（不等关系可以传递）；
//   拖金点（两边同时乘的数）：往上拉，两个点一起离开 0，金点还在上面（性质2）；拉到水面，两个点都到了 0（乘 0：0 = 0）；
//   再往下，两个点进了倒影，金点跑到了蓝点下面；停在 −1：正好落在 A、B 倒影的山尖上——乘 −1 就是照进湖里
//     （唯一的重拍：每一座山尖上的金点一起翻进湖里，落在自己的倒影上；越高的山，倒影越深）；
//   乘 −2：2a、2b 翻过 0（两道套在一起的弧，外面那道落得更低）→ 性质3；除以 −2 就是乘 −1/2，一样倒过来；
//   答：−2a < −2b（不等式的性质3）。
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { clamp, lerp, easeOut } from './kit/sheet.js';
import { draggable } from './kit/interact.js';
import { sfx, audio } from './kit/audio.js';

const U = 0.0075;                                  // 数轴上的 1 个单位长度
const W0 = 0.036, BEDD = 0.017;                    // 平时的水面（离书面的高度）、湖最深处在水面下多深
const ZM = -0.065, XL = -0.07;                     // 数学都在 z = ZM 这个竖直面上；数轴立在 x = XL
const NL = 13;                                     // 数轴画到 ±13
const D_MIN = -1.5, D_MAX = 2.5;                   // 水面能落 1.5、涨 2.5（单位长度）
const C_MIN = -2.3, C_MAX = 2.3;                   // 两边同时乘的数
const SNAPS = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2];
const VIEW_EL = 0.44;                              // 镜头的仰角（弧度）：从正前方稍高处看，倒影看得全
// 整块地的轮廓（x 向右，z 朝着人）；湖是一个歪一点的椭圆，往前伸出切口
const OUTLINE = [[0, 0.142], [0.1, 0.138], [0.17, 0.125], [0.205, 0.07], [0.212, -0.02], [0.2, -0.1], [0.16, -0.148], [0.08, -0.163], [0, -0.158], [-0.08, -0.165], [-0.16, -0.15], [-0.205, -0.1], [-0.214, -0.02], [-0.207, 0.07], [-0.17, 0.126], [-0.1, 0.139]];
const LAKE = { cx: 0, cz: 0.035, rx: 0.165, rz: 0.17 };
// 山峰：[x, z, 高出平时水面几个单位, 底半径]；A、B 在数学那个竖直面上，都在数轴右边
const PA = { x: 0.068, z: ZM, h: 6, r: 0.024 }, PB = { x: -0.01, z: ZM, h: 2, r: 0.018 };
const PEAKS = [
  [-0.17, -0.098, 9, 0.024], [-0.118, -0.122, 7, 0.02], [-0.03, -0.13, 10.5, 0.025], [0.012, -0.128, 8, 0.021], [0.09, -0.124, 12, 0.027], [0.15, -0.098, 8.5, 0.023],
  [0.184, -0.03, 5.5, 0.019], [0.186, 0.055, 3.5, 0.016], [-0.19, -0.012, 4, 0.017], [-0.188, 0.07, 3, 0.015], [0.136, -0.045, 4.5, 0.016],
];
const GOLD = 0xffc83d, BLUE = 0x58c4dd, TEAL = 0x5cd0b3, RED = 0xfc6255, WHITE = 0xffffff;
const CSS = { g: '#ffc83d', b: '#58c4dd', t: '#5cd0b3', r: '#fc6255', w: '#ffffff', d: 'rgba(255,255,255,0.82)' };
const FR = (n, d) => `<span class="mfr"><span>${n}</span><span>${d}</span></span>`;          // 竖着写的分数（板书、面板里）
const tenth = (v) => Math.round(v * 10) / 10;
const fmt = (v) => { const r = tenth(v); return (Math.abs(r - Math.round(r)) < 1e-9 ? String(Math.round(r)) : r.toFixed(1)).replace('-', '−'); };

const OPEN_ASK = '已知 <i>a</i> &gt; <i>b</i>，比较 −2<i>a</i> 与 −2<i>b</i> 的大小。<br>为什么不等式两边乘同一个负数，不等号的方向就要改变？';

export default {
  id: 'budengshi',
  fig: '问题',
  title: '不等式的性质',
  flow: 'explore',
  ask: OPEN_ASK,
  need: '拖水面、拖金色的点，看 a、b 跟着怎么变。',
  conclusion: {
    page: 131, rect: [64, 154, 484, 322],
    quote: '不等式的性质 2　不等式两边乘（或除以）同一个正数，不等号的方向不变．如果 a＞b，c＞0，那么 ac＞bc（或 a/c＞b/c）．不等式的性质 3　不等式两边乘（或除以）同一个负数，不等号的方向改变．如果 a＞b，c＜0，那么 ac＜bc（或 a/c＜b/c）．',
    why: '把数放在数轴上看：加（或减）同一个数，所有的点一起往上（或往下）挪一样多，谁在上面还在上面——像水涨水落，山没动，谁高谁低不变（性质1）。乘同一个正数，每个点离 0 的距离都变成同样的倍数，还留在 0 的同一边，谁在上面还在上面（性质2）。乘 −1，每个数变成它的相反数，在数轴上关于 0 对称——像山和它在湖里的倒影：越高的山，倒影越深，大小顺序整个倒过来。乘别的负数 c，就是先乘 |c|（顺序不变），再乘 −1（顺序倒过来），所以不等号的方向改变（性质3）。除以一个不为 0 的数等于乘它的倒数，倒数和它同号，所以除法也一样。乘 0，两边都是 0，相等了。<br><br>开头的问题：因为 a > b，所以 −2a < −2b（不等式的性质3）。',
    src: '课本 · 11.1.2 不等式的性质（两个基本事实在第 123 页，性质1 在第 124 页，性质2、性质3 和开头的问题在第 125 页）',
  },

  create({ aim, tag }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    const world = new THREE.Group(), mathG = new THREE.Group(); group.add(world, mathG);
    let ui = null, dead = false;
    const T0 = performance.now(), now = () => (performance.now() - T0) / 1000;
    const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    const basic = (o) => new THREE.MeshBasicMaterial(o);
    const lit = (o) => new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0, ...o });
    const quiet = (m) => { m.raycast = () => {}; m.userData.noFrame = true; return m; };
    const rnd = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();          // 每次打开都一样的山形
    const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

    // ================= 山地和湖：一块不规则的地立在书上，中间一湖静水；地面是起伏的（湖底、沙滩、山坡），前面切开露出湖底和湖水 =================
    const C0 = [0, -0.01];
    const outline = new THREE.CatmullRomCurve3(OUTLINE.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal').getPoints(240).slice(0, -1).map((p) => [p.x, p.z]);
    const NO = outline.length;
    const inPoly = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
    // 湖的形状：一个歪一点的椭圆，往前一直伸出切口
    const qAt = (x, z) => { const dx = x - LAKE.cx, dz = z - LAKE.cz, th = Math.atan2(dz, dx); return ((dx / LAKE.rx) ** 2 + (dz / LAKE.rz) ** 2) * (1 + 0.1 * Math.sin(3 * th + 0.7) + 0.06 * Math.sin(5 * th + 2.1) + 0.035 * Math.sin(8 * th + 0.3)); };
    const hAt = (x, z) => { const q = qAt(x, z);
      if (q < 1) return W0 - 0.002 - (BEDD - 0.002) * Math.pow(1 - q, 0.6);                              // 湖底
      if (q < 1.15) return W0 - 0.002 + 0.008 * smooth(1, 1.15, q);                                       // 沙滩
      return W0 + 0.006 + 0.03 * smooth(1.15, 1.62, q) + 0.003 * Math.sin(x * 41 + 1.3) * Math.cos(z * 37 + 0.4) * smooth(1.15, 1.5, q); };          // 山坡
    // 地面：从中心往外一圈圈的网格，最外一圈正好是轮廓
    const detailTex = tex(512, 512, (g, w, h) => { g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, w, h); for (let k = 0; k < 9000; k++) { const v = 150 + Math.random() * 105; g.fillStyle = `rgba(${v},${v},${v},${0.25 + Math.random() * 0.35})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 1.5, 2 + Math.random() * 3); } });
    detailTex.wrapS = detailTex.wrapT = THREE.RepeatWrapping;
    { const M = 46, pos = [], col = [], uv = [], idx = [], c = new THREE.Color();
      const mud = new THREE.Color(0x6d6a52), sand = new THREE.Color(0xc4b99c), wetS = new THREE.Color(0x9a9078), g1 = new THREE.Color(0x7c9c54), g2 = new THREE.Color(0x92ab5e), g3 = new THREE.Color(0x66843f);
      for (let i = 0; i < NO; i++) for (let j = 0; j <= M; j++) { const r = j / M, x = C0[0] + r * (outline[i][0] - C0[0]), z = C0[1] + r * (outline[i][1] - C0[1]), y = hAt(x, z);
        pos.push(x, y, z); uv.push(x * 11, z * 11);
        const n = 0.5 + 0.5 * Math.sin(x * 57 + z * 23) * Math.cos(z * 71 - x * 13);
        if (y < W0 - 0.004) c.copy(mud); else if (y < W0 + 0.0045) c.copy(wetS).lerp(sand, smooth(W0 - 0.004, W0 + 0.002, y)); else c.copy(g1).lerp(g2, n).lerp(g3, smooth(0.6, 1, Math.sin(x * 23 - z * 31) * 0.5 + 0.5) * 0.6).lerp(sand, smooth(W0 + 0.0075, W0 + 0.0045, y));
        col.push(c.r, c.g, c.b); }
      for (let i = 0; i < NO; i++) { const i2 = (i + 1) % NO; for (let j = 0; j < M; j++) { const a = i * (M + 1) + j, b = i2 * (M + 1) + j; idx.push(a, b, a + 1, a + 1, b, b + 1); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      const ground = new THREE.Mesh(g, lit({ map: detailTex, vertexColors: true, roughness: 0.95, side: THREE.DoubleSide })); ground.receiveShadow = true; ground.raycast = () => {}; ground.userData.qaSupport = true; world.add(ground); }
    // 外沿的切面：石灰岩一层层；湖底下的那一段也是岩层
    const strata = tex(512, 512, (g, w, h) => {
      const bands = [[0, '#b9ae97'], [0.07, '#c8c0ac'], [0.17, '#ada38d'], [0.29, '#c1b9a5'], [0.41, '#a89e88'], [0.52, '#bdb4a0'], [0.66, '#a1977f'], [0.8, '#b3a993'], [0.91, '#a59b84'], [1, '#a59b84']];
      for (let i = 0; i < bands.length - 1; i++) { g.fillStyle = bands[i][1]; g.fillRect(0, bands[i][0] * h, w, (bands[i + 1][0] - bands[i][0]) * h + 1); }
      for (let i = 1; i < bands.length - 1; i++) { g.strokeStyle = 'rgba(90,80,64,0.35)'; g.lineWidth = 1.5; g.beginPath(); let y = bands[i][0] * h; g.moveTo(0, y); for (let x = 0; x <= w; x += 16) { y += (Math.random() - 0.5) * 2.2; g.lineTo(x, y); } g.stroke(); }
      for (let k = 0; k < 1600; k++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '80,72,58' : '226,220,204'},${0.12 + Math.random() * 0.22})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 2); }
      const gr = g.createLinearGradient(0, 0, 0, h * 0.05); gr.addColorStop(0, 'rgba(70,64,40,0.55)'); gr.addColorStop(1, 'rgba(70,64,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h * 0.05); });
    strata.wrapS = strata.wrapT = THREE.RepeatWrapping; strata.flipY = false;
    const SIDE_H = 0.075;          // 一张岩层贴图对应的高度
    let perim = 0; const sAt = outline.map((p, i) => { if (i) perim += Math.hypot(p[0] - outline[i - 1][0], p[1] - outline[i - 1][1]); return perim; }); perim += Math.hypot(outline[0][0] - outline[NO - 1][0], outline[0][1] - outline[NO - 1][1]);
    const hO = outline.map(([x, z]) => hAt(x, z));
    { const pos = [], uv = [], idx = [];
      for (let i = 0; i <= NO; i++) { const k = i % NO, [x, z] = outline[k], s = i === NO ? perim : sAt[k], h = hO[k]; pos.push(x, 0, z, x, h, z); uv.push(s * 10, h / SIDE_H, s * 10, 0); if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      const wall = new THREE.Mesh(g, lit({ map: strata, roughness: 0.95, side: THREE.DoubleSide })); wall.receiveShadow = true; wall.raycast = () => {}; wall.userData.qaSupport = true; world.add(wall); }
    // 湖水的切面：前面切口上，湖底到水面那一段；水涨水落时重新做
    const waterSideTex = tex(256, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#86bcb2'); gr.addColorStop(0.1, '#5f9e96'); gr.addColorStop(1, '#244f4e'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 18; k++) { const x = Math.random() * w, ww = 4 + Math.random() * 14; const ray = g.createLinearGradient(0, 0, 0, h); ray.addColorStop(0, 'rgba(220,245,240,0.16)'); ray.addColorStop(1, 'rgba(220,245,240,0)'); g.fillStyle = ray; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + ww, 0); g.lineTo(x + ww - 30, h); g.lineTo(x - 30, h); g.closePath(); g.fill(); }
      g.fillStyle = 'rgba(240,252,250,0.6)'; g.fillRect(0, 0, w, 2); });
    waterSideTex.wrapS = THREE.RepeatWrapping; waterSideTex.flipY = false;
    const waterWall = new THREE.Mesh(new THREE.BufferGeometry(), lit({ map: waterSideTex, roughness: 0.25, side: THREE.DoubleSide })); waterWall.raycast = () => {}; world.add(waterWall);
    let wallW = -1;
    const buildWaterWall = (W) => { if (Math.abs(W - wallW) < 1e-6) return; wallW = W; const pos = [], uv = [];
      const quad = (p, q, hp, hq, sp, sq) => { pos.push(p[0], hp, p[1], q[0], hq, q[1], p[0], W, p[1], p[0], W, p[1], q[0], hq, q[1], q[0], W, q[1]); uv.push(sp * 12, (W - hp) / 0.02, sq * 12, (W - hq) / 0.02, sp * 12, 0, sp * 12, 0, sq * 12, (W - hq) / 0.02, sq * 12, 0); };
      for (let i = 0; i < NO; i++) { const k = (i + 1) % NO, p = outline[i], q = outline[k], hp = hO[i], hq = hO[k], sp = sAt[i], sq = k ? sAt[k] : perim;
        if (hp >= W && hq >= W) continue;
        if (hp < W && hq < W) { quad(p, q, hp, hq, sp, sq); continue; }
        const t = (W - hp) / (hq - hp), m = [lerp(p[0], q[0], t), lerp(p[1], q[1], t)], sm = lerp(sp, sq, t);
        if (hp < W) quad(p, m, hp, W, sp, sm); else quad(m, q, W, hq, sm, sq); }
      waterWall.geometry.dispose(); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); waterWall.geometry = g; };
    // 水面：一面真的镜子（Reflector），只照山水；细细的波纹，没倒影的地方是天光
    const WaterShader = {
      name: 'LakeMirror',
      uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uT: { value: 0 }, uLift: { value: 0 }, uDeep: { value: new THREE.Color(0x2e5d55) }, uSky: { value: new THREE.Color(0xd3e7e4) } },
      vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec2 vP; varying vec3 vW;
        #include <common>
        #include <logdepthbuf_pars_vertex>
        void main() { vUv = textureMatrix * vec4(position, 1.0); vP = position.xy; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
          #include <logdepthbuf_vertex>
        }`,
      fragmentShader: `uniform vec3 color; uniform sampler2D tDiffuse; uniform float uT, uLift; uniform vec3 uDeep, uSky; varying vec4 vUv; varying vec2 vP; varying vec3 vW;
        #include <logdepthbuf_pars_fragment>
        void main() {
          #include <logdepthbuf_fragment>
          float wy = vP.y * 560.0, wx = vP.x * 170.0;
          vec2 d = vec2(0.5 * sin(wy + uT * 1.2 + 2.0 * sin(wx * 1.3 + uT * 0.4)) + 0.3 * sin(wy * 2.7 - uT * 1.7 + wx * 0.8), 0.3 * sin(wy * 1.9 + uT * 0.9 + wx * 1.1));
          vec4 uv = vUv; uv.xy += d * 0.0007 * uv.w;
          vec4 r = texture2DProj(tDiffuse, uv);
          vec3 V = normalize(cameraPosition - vW);
          float fr = 0.6 + 0.4 * pow(1.0 - clamp(V.y, 0.0, 1.0), 2.0);
          vec3 sky = mix(uSky, uDeep, 0.12 + 0.06 * sin(vP.y * 90.0 + vP.x * 40.0));
          vec3 refl = mix(sky, r.rgb * (1.0 + uLift), clamp(r.a, 0.0, 1.0));
          gl_FragColor = vec4(mix(uDeep, refl, fr), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    };
    const inset = outline.map(([x, z]) => [C0[0] + (x - C0[0]) * 0.996, C0[1] + (z - C0[1]) * 0.996]);
    const mirror = new Reflector(new THREE.ShapeGeometry(new THREE.Shape(inset.map(([x, z]) => new THREE.Vector2(x, z))), 1), { textureWidth: 768, textureHeight: 768, color: 0xffffff, shader: WaterShader, multisample: 0 });
    mirror.rotation.x = -Math.PI / 2; mirror.scale.y = -1;          // 形状在 xy 面上画的是 (x, z)，转平以后 y → −z，再翻一下回到 +z
    mirror.material.side = THREE.DoubleSide; quiet(mirror); world.add(mirror);
    { const rt = mirror.getRenderTarget(); rt.texture.type = THREE.UnsignedByteType; rt.texture.colorSpace = THREE.SRGBColorSpace; }          // 8 位 sRGB：老设备也画得出来
    { const ob = mirror.onBeforeRender, cc = new THREE.Color();
      const lastCam = new THREE.Matrix4(), lastProj = new THREE.Matrix4(), lastMir = new THREE.Matrix4(); let drawn = false;
      mirror.onBeforeRender = function (renderer, scene, camera, ...rest) {          // 倒影里只有山水：数学的线和字、书桌后面的背景都不照进去
        if (drawn && camera.matrixWorld.equals(lastCam) && camera.projectionMatrix.equals(lastProj) && this.matrixWorld.equals(lastMir)) return;          // 镜头和水面都没动：倒影用上一帧的，省掉一整遍渲染
        drawn = true; lastCam.copy(camera.matrixWorld); lastProj.copy(camera.projectionMatrix); lastMir.copy(this.matrixWorld);
        const bg = scene.background, ca = renderer.getClearAlpha(), mv = mathG.visible; renderer.getClearColor(cc);
        scene.background = null; renderer.setClearColor(0x000000, 0); mathG.visible = false;
        try { ob.call(this, renderer, scene, camera, ...rest); } finally { scene.background = bg; renderer.setClearColor(cc, ca); mathG.visible = mv; } }; }
    // 山峰：石灰岩的塔峰，陡壁上挂着绿；每一座都和它的倒影一起，是一个数
    const peakMesh = (x, z, h, r, seed) => {
      const top = W0 + h * U, base = Math.min(hAt(x, z), W0 - 0.004) - 0.004, H = top - base;
      const prof = [[1.0, 0], [1.02, 0.08], [0.97, 0.26], [0.93, 0.45], [0.86, 0.62], [0.74, 0.76], [0.56, 0.87], [0.33, 0.95], [0.12, 0.99], [0, 1]];
      const g = new THREE.LatheGeometry(prof.map(([rr, y]) => new THREE.Vector2(rr * r, y * H)), 32, 0, Math.PI * 2); const p = g.attributes.position, col = [];
      const c0 = new THREE.Color(), rock = new THREE.Color(0xb1a998), rock2 = new THREE.Color(0x837b6d), veg = new THREE.Color(0x4f7038), veg2 = new THREE.Color(0x6a8a48), wet = new THREE.Color(0x5a564c);
      for (let i = 0; i < p.count; i++) { const px = p.getX(i), py = p.getY(i), pz = p.getZ(i), a = Math.atan2(pz, px), t = py / H;
        const n = 0.12 * Math.sin(a * 3 + seed) + 0.08 * Math.sin(a * 7 + t * 8 + seed * 2.1) + 0.05 * Math.sin(a * 13 - t * 17 + seed * 3.7);
        const k = 1 + n * (0.5 + 0.5 * t); p.setXYZ(i, px * k, py, pz * k);
        const yw = base + py;
        const nz = 0.5 * Math.sin(a * 3 + t * 7 + seed) + 0.3 * Math.sin(a * 7 - t * 13 + seed * 1.7) + 0.2 * Math.sin(a * 13 + t * 29 + seed * 2.3), ledge = Math.sin(t * 31 + 2 * Math.sin(a * 5 + seed));
        const cliff = smooth(-0.1, 0.45, nz + 0.22 * ledge) * smooth(0.08, 0.3, t) * (1 - smooth(0.8, 0.94, t));
        c0.copy(veg).lerp(veg2, (0.5 + 0.5 * Math.sin(a * 11 + t * 21 + seed)) * 0.7); c0.lerp(rock, cliff * 0.92); if (cliff > 0.5) c0.lerp(rock2, (0.5 + 0.5 * Math.sin(t * 52 + a * 3)) * 0.35);
        if (yw < W0 + 0.003) c0.lerp(wet, smooth(W0 + 0.003, W0 - 0.003, yw));
        col.push(c0.r, c0.g, c0.b); }
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
      const m = new THREE.Mesh(g, lit({ vertexColors: true, roughness: 0.93 })); m.position.set(x, base, z); m.castShadow = true; m.receiveShadow = true; m.raycast = () => {}; m.userData.qaSupport = true; world.add(m);
      return { x, z, h, r, top };
    };
    const peaks = PEAKS.map(([x, z, h, r], i) => peakMesh(x, z, h, r, 1.7 + i * 2.3));
    const pA = peakMesh(PA.x, PA.z, PA.h, PA.r, 4.2), pB = peakMesh(PB.x, PB.z, PB.h, PB.r, 9.1);
    const allPeaks = [...peaks, pA, pB].sort((p, q) => p.x - q.x);
    const wowPeaks = allPeaks.filter((p) => { const zc = p.z + (p.top - W0) / Math.tan(VIEW_EL); return qAt(p.x, zc) < 0.97 && zc < 0.13; });          // 倒影的山尖落在看得见的湖面上（山坡上的山前面没有水，没有倒影）
    // 岸上的草：一层被风吹着的细草（湖里、沙滩、山脚不长）
    const uT = { value: 0 };
    { const N = 2800, geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.0004, 0, 0, 0.0004, 0, 0, 0.0001, 0.0034, 0], 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
      const mat = lit({ color: 0xffffff, roughness: 1, side: THREE.DoubleSide }); mat.customProgramCacheKey = () => 'bds-sway';
      mat.onBeforeCompile = (sh) => { sh.uniforms.uT = uT; sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n  float bk = position.y / 0.0034;\n  vec4 ip = instanceMatrix[3];\n  transformed.x += sin(uT * 1.5 + ip.x * 80.0 + ip.z * 50.0) * 0.0005 * bk * bk;`); };
      const blades = new THREE.InstancedMesh(geo, mat, N), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color(); let k = 0;
      const all = [...PEAKS.map(([x, z, , r]) => [x, z, r]), [PA.x, PA.z, PA.r], [PB.x, PB.z, PB.r]];
      for (let tries = 0; k < N && tries < 50000; tries++) { const p = [(rnd() - 0.5) * 0.43, -0.17 + rnd() * 0.32];
        if (!inPoly(p, inset)) continue; const y = hAt(p[0], p[1]); if (y < W0 + 0.0055 || all.some(([x, z, r]) => Math.hypot(p[0] - x, p[1] - z) < r * 1.12)) continue;
        e.set((rnd() - 0.5) * 0.5, rnd() * 6.3, (rnd() - 0.5) * 0.5); q.setFromEuler(e); m4.compose(new THREE.Vector3(p[0], y, p[1]), q, new THREE.Vector3(1, 0.5 + rnd() * 0.6, 1)); blades.setMatrixAt(k, m4);
        col.setHSL(0.2 + rnd() * 0.07, 0.32 + rnd() * 0.16, 0.48 + rnd() * 0.12); blades.setColorAt(k, col); k++; }
      blades.count = k; blades.raycast = () => {}; blades.userData.noFrame = true; world.add(blades); }
    // 水面上偶尔荡开一圈细纹（水在等人去拖的时候多一点）
    const rings = [], ringGeo = new THREE.RingGeometry(0.94, 1, 48).rotateX(-Math.PI / 2);
    const ripple = (x, z) => { const m = quiet(new THREE.Mesh(ringGeo, basic({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }))); m.position.set(x, 0, z); m.userData.born = now(); m.renderOrder = 3; world.add(m); rings.push(m); };
    // 框住整件模型（含数轴上面写式子的地方）：看不见的盒子，取景用
    { const pr = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.165, 0.315), basic({ transparent: true, opacity: 0, depthWrite: false })); pr.position.set(0, 0.0825, -0.012); pr.raycast = () => {}; group.add(pr); }

    // ================= 数学：竖直面 z = ZM 上的发光笔画（亮的芯、加色的光晕、底下一层淡影），透过水面也看得见 =================
    const prof = (stops) => { const t = tex(64, 4, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); for (const [o, a] of stops) gr.addColorStop(o, `rgba(255,255,255,${a})`); g.fillStyle = gr; g.fillRect(0, 0, w, h); }); t.colorSpace = THREE.NoColorSpace; return t; };
    const crispTex = prof([[0, 0], [0.16, 0.55], [0.3, 1], [0.7, 1], [0.84, 0.55], [1, 0]]);
    const glowTex = prof([[0, 0], [0.15, 0.06], [0.3, 0.22], [0.42, 0.62], [0.5, 1], [0.58, 0.62], [0.7, 0.22], [0.85, 0.06], [1, 0]]);
    const strip = (pts, hw, dash = 0) => { const pos = [], uv = []; let acc = 0;
      const push = (a, b, n) => { pos.push(a[0] + n[0], a[1] + n[1], 0, a[0] - n[0], a[1] - n[1], 0, b[0] + n[0], b[1] + n[1], 0, b[0] + n[0], b[1] + n[1], 0, a[0] - n[0], a[1] - n[1], 0, b[0] - n[0], b[1] - n[1], 0); uv.push(0, 0.5, 1, 0.5, 0, 0.5, 0, 0.5, 1, 0.5, 1, 0.5); };
      for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); if (l < 1e-9) continue; const n = [(-dy / l) * hw, (dx / l) * hw];
        if (!dash) push(a, b, n); else { let t = 0; while (t < l - 1e-9) { const ph = (acc + t) % (dash * 2), on = ph < dash, st = Math.max(1e-7, Math.min(l - t, on ? dash - ph : dash * 2 - ph)); if (on) push([a[0] + (dx * t) / l, a[1] + (dy * t) / l], [a[0] + (dx * (t + st)) / l, a[1] + (dy * (t + st)) / l], n); t += st; } acc += l; } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return g; };
    const lineList = [];
    const gline = (parent, color, w, { glow = 0.5, shade = 0.22, dash = 0, op = 1, order = 40 } = {}) => {
      const mk = (map, col, o, blend, ord) => { const m = quiet(new THREE.Mesh(new THREE.BufferGeometry(), basic({ color: col, map, transparent: true, opacity: o, depthWrite: false, depthTest: false, blending: blend, side: THREE.DoubleSide }))); m.position.z = ZM + 0.002; m.renderOrder = ord; m.visible = false; m.userData.qaSupport = true; parent.add(m); return m; };          // 数轴负半边、倒影里的点画在倒影的位置（水面下的虚像），压在最上层，不是穿过桌面的实物
      const L = { core: mk(crispTex, color, op, THREE.NormalBlending, order + 2), glow: glow ? mk(glowTex, color, glow, THREE.AdditiveBlending, order + 1) : null, shade: shade ? mk(glowTex, 0x000000, shade, THREE.NormalBlending, order) : null, pts: null, anim: null };
      L._draw = (pts) => { for (const [m, k, d] of [[L.core, 1, dash], [L.glow, 4.5, 0], [L.shade, 2.6, 0]]) { if (!m) continue; if (!pts || pts.length < 2) { m.visible = false; continue; } m.geometry.dispose(); m.geometry = strip(pts, (w * k) / 2, d); m.visible = true; } };
      L.set = (pts) => { L.pts = pts; if (!L.anim) L._draw(pts); };
      L.hide = () => { L.pts = null; L.anim = null; L._draw(null); };
      L.draw = (pts, dur = 0.7, delay = 0) => { L.pts = pts; L.anim = { t0: now() + delay, dur }; L._draw(null); };
      L.fade = (k) => { L.core.material.opacity = op * k; if (L.glow) L.glow.material.opacity = glow * k; if (L.shade) L.shade.material.opacity = shade * k; };
      lineList.push(L); return L; };
    const partial = (pts, k) => { if (k >= 1) return pts; let tot = 0; for (let i = 1; i < pts.length; i++) tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); let want = tot * k; const out = [pts[0]]; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (want >= l) { out.push(pts[i]); want -= l; } else { const t = l ? want / l : 0; out.push([lerp(pts[i - 1][0], pts[i][0], t), lerp(pts[i - 1][1], pts[i][1], t)]); break; } } return out; };
    // 字：斜体衬线，白字或概念色，底下垫一圈暗光；{1/2} 画成上下两行的分数
    const measure = (font, txt) => { const g = document.createElement('canvas').getContext('2d'); g.font = font; return g.measureText(txt).width; };
    const FONT = (px, it = true) => `${it ? 'italic ' : ''}500 ${px}px "Times New Roman","Songti SC",serif`;
    const FRX = /^\{([^/]+)\/([^}]+)\}$/;
    const richTex = (segs, px = 64) => { const parts = segs.map(([x, c, it = true]) => { const m = FRX.exec(x); if (m) { const f = FONT(Math.round(px * 0.7), false); return { n: m[1], d: m[2], c, f, w: Math.max(measure(f, m[1]), measure(f, m[2])) + px * 0.24 }; } const f = FONT(px, it); return { s: x, c, f, w: measure(f, x) }; });
      const tall = parts.some((q) => q.n), W = parts.reduce((a, q) => a + q.w, 0);
      return tex(Math.ceil(W) + 48, Math.round(px * (tall ? 2.25 : 1.55)), (g, w, h) => { let x = 24; g.textBaseline = 'middle'; g.lineJoin = 'round';
        const ink = (txt, xx, yy, f, c) => { g.font = f; g.shadowColor = 'rgba(8,16,24,0.85)'; g.shadowBlur = px * 0.22; g.lineWidth = px * 0.16; g.strokeStyle = 'rgba(10,20,30,0.55)'; g.strokeText(txt, xx, yy); g.shadowBlur = 0; g.fillStyle = c; g.fillText(txt, xx, yy); };
        for (const q of parts) { if (q.n) { const cx = x + q.w / 2, y0 = h / 2 + 2; g.textAlign = 'center'; ink(q.n, cx, y0 - px * 0.42, q.f, q.c); ink(q.d, cx, y0 + px * 0.47, q.f, q.c); g.textAlign = 'left';
            g.shadowColor = 'rgba(8,16,24,0.85)'; g.shadowBlur = px * 0.16; g.fillStyle = 'rgba(10,20,30,0.55)'; g.fillRect(x + px * 0.05, y0 - px * 0.06, q.w - px * 0.1, px * 0.12); g.shadowBlur = 0; g.fillStyle = q.c; g.fillRect(x + px * 0.08, y0 - px * 0.03, q.w - px * 0.16, px * 0.06); }
          else ink(q.s, x, h / 2 + 2, q.f, q.c); x += q.w; } }); };
    const label = (hgt, order = 70) => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false }))); sp.renderOrder = order; sp.userData.h = hgt; sp.userData.k = ''; sp.visible = false; mathG.add(sp); return sp; };
    const setRich = (sp, segs, x, y, anchor = 0.5, z = ZM + 0.003) => { if (!segs) { sp.visible = false; return; } const key = JSON.stringify(segs); if (sp.userData.k !== key) { sp.userData.k = key; const t = richTex(segs); sp.material.map?.dispose?.(); sp.material.map = t; sp.material.needsUpdate = true; const hh = sp.userData.h * (t.image.height / Math.round(64 * 1.55)); sp.userData.w = (hh * t.image.width) / t.image.height; sp.scale.set(sp.userData.w, hh, 1); } sp.position.set(x + sp.userData.w * (0.5 - anchor), y, z); sp.visible = true; };
    // 点：发光的圆点；原来的数是空心的圈
    const dotTex = (col) => tex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.16, 'rgba(255,255,255,1)'); gr.addColorStop(0.24, col); gr.addColorStop(0.36, col.replace('1)', '0.55)')); gr.addColorStop(1, col.replace('1)', '0)')); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    const ringTex = (col) => tex(128, 128, (g) => { g.lineWidth = 16; g.strokeStyle = 'rgba(8,14,20,0.5)'; g.beginPath(); g.arc(64, 64, 34, 0, 6.3); g.stroke(); g.lineWidth = 9; g.strokeStyle = col; g.beginPath(); g.arc(64, 64, 34, 0, 6.3); g.stroke(); });
    const sprite = (map, size, order = 60) => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthTest: false, depthWrite: false }))); sp.scale.setScalar(size); sp.renderOrder = order; sp.visible = false; mathG.add(sp); return sp; };
    const DG = dotTex('rgba(255,200,61,1)'), DB = dotTex('rgba(88,196,221,1)');
    // 重拍：从那一点迸出一圈短光线（3Blue1Brown 的 Flash）
    const flashes = [];
    const flash = (x, y, color = GOLD, r0 = 0.0065, r1 = 0.021, n = 12, z = ZM) => { const rays = Array.from({ length: n }, () => { const L = gline(mathG, color, 0.0013, { glow: 0.6, shade: 0, order: 80 }); for (const m of [L.core, L.glow]) if (m) m.position.z = z + 0.004; return L; }); flashes.push({ x, y, rays, t0: now(), r0, r1 }); };

    // 数轴：一根竖着的数轴，0 在水面上，跟着水面一起升降
    const nlG = new THREE.Group(); mathG.add(nlG);
    const axis = gline(nlG, WHITE, 0.0026, { glow: 0.46, shade: 0.32, op: 1 });
    const axisPts = [[XL, -NL * U], [XL, (NL + 0.6) * U]]; axis.set(axisPts);
    const arrowHead = (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.0077, 0, -0.0044, 0, 0, 0.0044, 0, 0], 3)); const m = quiet(new THREE.Mesh(g, basic({ color: WHITE, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide }))); m.position.set(XL, (NL + 0.6) * U, ZM + 0.002); m.renderOrder = 45; nlG.add(m); return m; })();
    const ticks = [];
    for (let k = -12; k <= 12; k++) { const L = gline(nlG, WHITE, k % 2 ? 0.0011 : 0.0016, { glow: 0, shade: 0.28, op: k ? 0.96 : 1 }); const hw = k === 0 ? 0.0074 : k % 2 ? 0.0028 : 0.0044; L.set([[XL - hw, k * U], [XL + hw, k * U]]); ticks.push(L);
      if (k % 2 === 0) { const sp = label(0.014, 50); nlG.add(sp); setRich(sp, [[String(k).replace('-', '−'), '#ffffff', false]], XL - 0.0096, k * U, 1); } }
    // 两座山的高度：山尖上的点、水平的虚线、数轴上的空心圈
    const tipA = sprite(DG, 0.0125), tipB = sprite(DB, 0.0125), tipA2 = sprite(DG, 0.0105), tipB2 = sprite(DB, 0.0105);
    const levA2 = gline(mathG, WHITE, 0.0008, { glow: 0, shade: 0.2, dash: 0.003, op: 0.7, order: 30 }), levB2 = gline(mathG, WHITE, 0.0008, { glow: 0, shade: 0.2, dash: 0.003, op: 0.7, order: 30 });
    const levA = gline(mathG, WHITE, 0.0008, { glow: 0, shade: 0.2, dash: 0.003, op: 0.75, order: 30 }), levB = gline(mathG, WHITE, 0.0008, { glow: 0, shade: 0.2, dash: 0.003, op: 0.75, order: 30 });
    const ringA = sprite(ringTex('rgba(255,200,61,1)'), 0.0148, 58), ringB = sprite(ringTex('rgba(88,196,221,1)'), 0.0148, 58);
    const labA = label(0.017), labB = label(0.017);
    // 两边同时乘 c 以后的点：金点（a 乘 c）、蓝点（b 乘 c）——学生拖的就是它们
    const imgA = sprite(DG, 0.0185, 64), imgB = sprite(DB, 0.0165, 63);
    const labIA = label(0.0158), labIB = label(0.0158);
    const RO1 = label(0.0205, 72), RO2 = label(0.0148, 72);          // 数轴顶上的式子
    const oldW = gline(mathG, WHITE, 0.0008, { glow: 0, shade: 0.2, dash: 0.0024, op: 0.6, order: 30 });          // 原来的水面
    // 乘负数：|c|a、|c|b 翻过 0 落到 ca、cb——两道套在一起的半圆弧
    const ghostA = sprite(ringTex('rgba(255,200,61,1)'), 0.0135, 57), ghostB = sprite(ringTex('rgba(88,196,221,1)'), 0.0135, 57);
    const arcA = gline(mathG, GOLD, 0.0012, { glow: 0.45, shade: 0.22, dash: 0.003, order: 35 }), arcB = gline(mathG, BLUE, 0.0012, { glow: 0.45, shade: 0.22, dash: 0.003, order: 35 });
    const arcPts = (r, bulge) => Array.from({ length: 41 }, (_, i) => { const t = (i / 40) * Math.PI; return [XL + Math.sin(t) * bulge, Math.cos(t) * r]; });
    // 唯一的重拍：每一座山尖上的金点一起翻进湖里，落在自己的倒影上
    const wowDots = wowPeaks.map(() => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ map: DG, transparent: true, depthTest: false, depthWrite: false }))); sp.renderOrder = 61; sp.visible = false; mathG.add(sp); return sp; });
    const wowTicks = wowPeaks.map(() => gline(mathG, GOLD, 0.0014, { glow: 0.5, shade: 0.15, order: 36 }));
    const thread = (p, w, glow) => { const L = gline(mathG, GOLD, w, { glow, shade: 0.1, order: 34 }); for (const m of [L.core, L.glow, L.shade]) if (m) m.position.z = p.z + 0.003; return L; };
    const wowThreads = wowPeaks.map((p) => thread(p, 0.0011, 0.45)), wowUp = wowPeaks.map((p) => thread(p, 0.0008, 0.2));          // 每座山尖到它倒影山尖的一根金线：水面以上淡（叠在山上），水里亮

    // ================= 此刻那一句：印在前面切口的湖底岩层上，不挡画面 =================
    const COFF = 0.0012, capSrc = outline.map((p, i) => [p[0], p[1], hO[i]]).filter(([x, z]) => z > 0.05 && Math.abs(x) < 0.175).sort((p, q) => p[0] - q[0]);
    const CY0 = 0.0025, CY1 = Math.min(...capSrc.map((p) => p[2])) - 0.0022;
    const capPts = capSrc.map(([x, z]) => [x, z + COFF]);
    let CAPW = 0; for (let i = 1; i < capPts.length; i++) CAPW += Math.hypot(capPts[i][0] - capPts[i - 1][0], capPts[i][1] - capPts[i - 1][1]);
    const capGeo = new THREE.BufferGeometry(); { const pos = [], uv = [], idx = []; let acc = 0; capPts.forEach(([x, z], i) => { if (i) acc += Math.hypot(x - capPts[i - 1][0], z - capPts[i - 1][1]); pos.push(x, CY0, z, x, CY1, z); uv.push(acc / CAPW, 0, acc / CAPW, 1); if (i) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); } }); capGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); capGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); capGeo.setIndex(idx); }
    const capMesh = quiet(new THREE.Mesh(capGeo, basic({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }))); capMesh.renderOrder = 4; capMesh.visible = false; world.add(capMesh);
    const CW = 2048, CH = Math.max(48, Math.round((CW * (CY1 - CY0)) / CAPW));
    const capRuns = (txt) => { const out = []; const re = /\{([^/{}]+)\/([^/{}]+)\}/g; let i = 0, m; while ((m = re.exec(txt))) { if (m.index > i) out.push({ t: txt.slice(i, m.index) }); out.push({ n: m[1], d: m[2] }); i = m.index + m[0].length; } if (i < txt.length) out.push({ t: txt.slice(i) }); return out; };
    const capTex = (big, small) => tex(CW, CH, (g, w, h) => {          // 一行：大字在前，小字跟在后面；{1/2} 写成上下两行的分数
      const FF = (px, wt) => `${wt} ${px}px "Times New Roman","Songti SC","STSong",serif`;
      const widthOf = (runs, px, wt) => runs.reduce((a, r) => { if (r.t != null) { g.font = FF(px, wt); return a + g.measureText(r.t).width; } g.font = FF(Math.round(px * 0.56), wt); return a + Math.max(g.measureText(r.n).width, g.measureText(r.d).width) + px * 0.2; }, 0);
      const R1 = capRuns(big), R2 = small ? capRuns(small) : [];
      let f = 1, p1 = 0, p2 = 0, w1 = 0, w2 = 0, gap = 0;
      for (; f > 0.4; f -= 0.04) { p1 = Math.round(h * 0.6 * f); p2 = Math.round(h * 0.43 * f); w1 = widthOf(R1, p1, 600); w2 = R2.length ? widthOf(R2, p2, 500) : 0; gap = R2.length ? h * 0.9 * f : 0; if (w1 + gap + w2 < w - h * 5) break; }
      const tot = w1 + gap + w2, x0 = (w - tot) / 2;
      const band = g.createLinearGradient(x0 - h * 2, 0, x0 + tot + h * 2, 0); band.addColorStop(0, 'rgba(34,26,16,0)'); band.addColorStop(0.07, 'rgba(34,26,16,0.5)'); band.addColorStop(0.93, 'rgba(34,26,16,0.5)'); band.addColorStop(1, 'rgba(34,26,16,0)');
      g.fillStyle = band; g.fillRect(x0 - h * 2, h * 0.06, tot + h * 4, h * 0.88);
      const drawRuns = (runs, px, wt, x, y, col) => { g.textBaseline = 'middle'; g.fillStyle = col; for (const r of runs) { if (r.t != null) { g.font = FF(px, wt); g.textAlign = 'left'; g.fillText(r.t, x, y); x += g.measureText(r.t).width; } else { const fp = Math.round(px * 0.56); g.font = FF(fp, wt); const rw = Math.max(g.measureText(r.n).width, g.measureText(r.d).width) + px * 0.2, cx = x + rw / 2; g.textAlign = 'center'; g.fillText(r.n, cx, y - px * 0.33); g.fillText(r.d, cx, y + px * 0.37); g.fillRect(x + px * 0.07, y + px * 0.01, rw - px * 0.14, Math.max(1.5, px * 0.05)); x += rw; } } };
      drawRuns(R1, p1, 600, x0, h * 0.53, '#f8efdc'); if (R2.length) drawRuns(R2, p2, 500, x0 + w1 + gap, h * 0.55, '#e6dac2'); });
    const cap = { key: '', born: -9, out: 1e9, next: null };
    function caption(big, small = '', live = false) { const key = big + '|' + small; if (key === cap.key) return; cap.key = key; S.cap = [big, small];
      const show = () => { capMesh.material.map?.dispose?.(); capMesh.material.map = capTex(big, small); capMesh.material.needsUpdate = true; capMesh.visible = true; cap.born = now(); cap.out = 1e9; };
      if (live) { cap.next = null; show(); cap.born -= 0.5; capMesh.material.opacity = 1; }
      else if (capMesh.visible && now() - cap.born > 0.2) { cap.out = now(); cap.next = show; } else show(); }
    function prompt(question, instruction = '') {
      if (question !== S.ask) ui?.ask?.(question);
      if (instruction !== S.instruction) ui?.status?.(instruction);
      S.ask = question; S.instruction = instruction;
    }

    // ================= 板书：学生做出一样，就用课本的话写一行；只写已经发现的 =================
    const css = document.createElement('style');
    css.textContent = `
.mfr{display:inline-block;vertical-align:middle;text-align:center;font-style:normal;font-size:0.86em;line-height:1.12;margin:0 0.08em}.mfr>span{display:block;padding:0 0.12em}.mfr>span:first-child{border-bottom:1px solid currentColor}
.bd-board{margin:4px 0 6px;display:flex;flex-direction:column;gap:8px;font:15px/1.7 "Kaiti SC","STKaiti","Songti SC",serif;color:#2b2722}
.bd-board .bd-row{opacity:0;transform:translateY(5px);transition:opacity .5s,transform .5s,background-color 2.4s;padding:3px 8px 3px 6px;border-radius:5px;border-left:3px solid transparent}
.bd-board .bd-row.in{opacity:1;transform:none}
.bd-board .bd-row.fresh{background:rgba(255,206,110,.34);border-left-color:#d98a2b}
.bd-board .n{display:inline-block;min-width:1.25em;color:#b0532a;font-weight:700}
.bd-board b{color:#8a2f1d}
.bd-board i{font-family:"Times New Roman",serif;font-style:italic;letter-spacing:.02em}
.bd-board .g{color:#c98600;font-weight:600}.bd-board .b{color:#2589b0;font-weight:600}.bd-board .t{color:#1a9a82;font-weight:600}.bd-board .r{color:#d4402f;font-weight:600}
.bd-board .bd-h{font:600 12px/1.3 "PingFang SC","Hiragino Sans GB",sans-serif;color:#a07a45;letter-spacing:.3em;margin:6px 0 -4px;opacity:0;transition:opacity .4s}
.bd-board .bd-h.in{opacity:1}
.bd-board.review .bd-row[data-k]{cursor:pointer}.bd-board.review .bd-row[data-k]:hover{background:rgba(255,206,110,.16)}
.bd-board .bd-row.sel{background:rgba(255,206,110,.34);border-left-color:#d98a2b}`;
    document.head.append(css);
    let boardEl = null, lastH = ''; const rows = [];
    const reveal = (r) => { const body = boardEl?.closest('.p-body'); if (!body) return; setTimeout(() => { const rb = r.getBoundingClientRect(), bb = body.getBoundingClientRect(); if (rb.bottom > bb.bottom - 14) body.scrollBy({ top: rb.bottom - bb.bottom + 28, behavior: 'smooth' }); }, 80); };
    const board = (html, key = '') => { const r = document.createElement('div'); r.className = 'bd-row'; r.innerHTML = html; r.dataset.k = key; rows.push(r); for (const o of rows) o.classList?.remove('fresh'); if (boardEl) { boardEl.append(r); requestAnimationFrame(() => { r.classList.add('in', 'fresh'); reveal(r); }); } return r; };
    board.h = (title) => { if (title === lastH) return; lastH = title; const r = document.createElement('div'); r.className = 'bd-h'; r.textContent = title; rows.push(r); if (boardEl) { boardEl.append(r); requestAnimationFrame(() => { r.classList.add('in'); reveal(r); }); } };
    const I = (s) => `<i>${s}</i>`, Ag = `<span class="g">${I('a')}</span>`, Bb = `<span class="b">${I('b')}</span>`;

    // ================= 状态 =================
    const fresh = () => ({ step: 'add', held: '', d: 0, c: 1, snap: 1, minD: 0, maxD: 0, trans: false, asked: false, done: false, cap: ['', ''], ask: '', stepAt: 0, hint: 0, moved: -9, wowAt: -9, liftAt: -9, arcs: false, arcsAt: -9, showImg: false, dTo: null, cTo: null, pose: '' });
    let S = fresh(), runId = 0;
    const later = (ms, f) => { const id = runId; setTimeout(() => { if (!dead && id === runId) f(); }, ms); };
    const Wl = () => W0 + S.d * U;                                   // 现在的水面
    const relA = () => PA.h - S.d, relB = () => PB.h - S.d;          // 山尖相对当前水面的坐标
    const coefSegs = (q, letter, col) => {
      if (q === 1) return [[letter, col]]; if (q === -1) return [['−', CSS.t, false], [letter, col]];
      const half = Math.abs(Math.abs(q) - 0.5) < 1e-9, out = []; if (q < 0) out.push(['−', CSS.t, false]); out.push([half ? '{1/2}' : fmt(Math.abs(q)), CSS.t, false]); out.push([letter, col]); return out; };
    const signOf = (x, y) => (Math.abs(x - y) < 1e-9 ? '=' : x > y ? '>' : '<');

    const targets = { pos: 2, zero: 0, neg1: -1, neg2: -2, div: -0.5 };
    function currentReading() {
      if (!S.showImg) {
        const level = S.d === 0 ? '水面在原处' : `水面${S.d > 0 ? '上移' : '下移'} ${fmt(Math.abs(S.d))} 格`;
        const side = relB() < 0 ? 'A 在水面上，B 在水面下' : relB() === 0 ? 'B 正好在水面上' : '两个山尖都在水面上方';
        const relation = relB() < 0 ? `${fmt(relA())} > 0 > ${fmt(relB())}` : `${fmt(relA())} > ${fmt(relB())}`;
        caption(`${level}，${relation}`, side, true);
        const next = S.step !== 'add' ? '' : S.maxD >= 0.9 && S.minD <= -0.4 ? '松开水面，看看刚才发现了什么。' : S.maxD >= 0.9 ? '再把水面往下拖。' : S.minD <= -0.4 ? '再把水面往上拖。' : '上下拖动水面看看。';
        prompt(`${level}，两个山尖相对水面的坐标各是多少？`, next);
        return;
      }
      const c = S.c, a = fmt(c * relA()), b = fmt(c * relB());
      const divide = c === -0.5 && (S.step === 'div' || S.divDone || S.pose === 'div');
      const op = divide ? '除以 −2' : `乘 ${fmt(c)}`;
      const relation = `${a} ${signOf(c * relA(), c * relB())} ${b}`;
      let why = c > 0 ? '乘正数，不等号方向不变' : c < 0 ? '乘负数，不等号方向改变' : '两个点都在 0';
      if (c === -1) why = '两个点正好落在山尖的倒影上';
      if (divide) why = '除以一个不为 0 的数，等于乘它的倒数';
      caption(`${op}，${relation}`, why, true);
      const goal = targets[S.step];
      const next = goal === undefined ? '' : S.step === 'div' ? '再试试除以 −2。' : `再试试乘 ${fmt(goal)}。`;
      prompt(`两边都${op}，${a} 和 ${b} 哪个大，还是相等？`, next);
    }

    function layout() {
      const W = Wl(), c = S.c, ya = W0 + PA.h * U, yb = W0 + PB.h * U;
      mirror.position.y = W; waterPick.position.y = W; waterPick.visible = S.step === 'add'; nlG.position.y = W;
      // 山尖、水平虚线、数轴上的空心圈（山没动：它们的位置不变，读数跟着水面变）
      tipA.position.set(PA.x, ya + 0.0012, ZM + 0.004); tipA.visible = true; tipB.position.set(PB.x, yb + 0.0012, ZM + 0.004); tipB.visible = true;
      levA.set([[PA.x - 0.004, ya], [XL + 0.003, ya]]); levB.set([[PB.x - 0.004, yb], [XL + 0.003, yb]]);
      ringA.position.set(XL, ya, ZM + 0.003); ringB.position.set(XL, yb, ZM + 0.003); ringA.visible = ringB.visible = true;
      setRich(labA, [['a', CSS.g]], PA.x + 0.0085, ya + 0.0085, 0); setRich(labB, [['b', CSS.b]], PB.x + 0.008, yb + 0.008, 0);
      oldW.set(Math.abs(S.d) > 0.05 && S.step === 'add' ? [[XL - 0.016, W0], [XL + 0.034, W0]] : null); buildWaterWall(W);
      // 两边同时乘 c 以后的点
      const ia = W + c * relA() * U, ib = W + c * relB() * U, show = S.showImg;
      imgA.visible = imgB.visible = show; imgA.position.set(XL, ia, ZM + 0.004); imgB.position.set(XL, ib, ZM + 0.0035);
      const near = Math.abs(c) < 0.75, arcX = (y) => { const r = -c * relA() * U, k = (y - W) / r; return S.arcs && c < -0.04 && Math.abs(k) < 1 ? r * 0.35 * Math.sqrt(1 - k * k) : 0; };
      setRich(labIA, show && !near && Math.abs(c - 1) > 0.04 ? coefSegs(c, 'a', CSS.g) : null, XL + 0.011, ia, 0);
      setRich(labIB, show && !near && Math.abs(c - 1) > 0.04 ? coefSegs(c, 'b', CSS.b) : null, XL + Math.max(0.011, arcX(ib) + 0.0055), ib, 0);
      // 乘 −1 以后：倒影的山尖、和它一样深的虚线——金点、蓝点正好落在这两条线上
      const mir = show && Math.abs(c + 1) < 0.04 && (S.wowAt > 0 || S.pose === 'neg1'), ya2 = 2 * W - ya, yb2 = 2 * W - yb;
      levA2.set(mir ? [[PA.x - 0.004, ya2], [XL + 0.004, ya2]] : null); levB2.set(mir ? [[PB.x - 0.004, yb2], [XL + 0.004, yb2]] : null);
      tipA2.visible = tipB2.visible = mir; tipA2.position.set(PA.x, ya2 - 0.001, ZM + 0.004); tipB2.position.set(PB.x, yb2 - 0.001, ZM + 0.004);
      // 数轴顶上的式子
      const va = show ? c * relA() : relA(), vb = show ? c * relB() : relB(), sg = signOf(va, vb), top = W + (NL + 1.6) * U;
      let l1, l2;
      if (!show) { const dd = Math.round(S.d * 10) / 10;
        if (Math.abs(dd) < 0.05) l1 = [['a', CSS.g], [' > ', CSS.w, false], ['b', CSS.b]];
        else { const op = dd > 0 ? ' − ' : ' + ', n = fmt(Math.abs(dd)); l1 = [['a', CSS.g], [op, CSS.t, false], [n, CSS.t, false], [' ' + sg + ' ', CSS.w, false], ['b', CSS.b], [op, CSS.t, false], [n, CSS.t, false]]; }
        l2 = relB() < -0.04 ? [[fmt(relA()), CSS.g, false], [' > 0 > ', CSS.w, false], [fmt(relB()), CSS.b, false]] : [[fmt(relA()), CSS.g, false], [' ' + sg + ' ', CSS.w, false], [fmt(relB()), CSS.b, false]]; }
      else if (Math.abs(c) < 0.04) { l1 = [['0', CSS.w, false], [' = ', CSS.w, false], ['0', CSS.w, false]]; l2 = null; }
      else if (Math.abs(c + 0.5) < 0.01 && (S.step === 'div' || S.divDone || S.pose === 'div')) { l1 = [['a', CSS.g], [' ÷ (', CSS.w, false], ['−2', CSS.t, false], [') ' + sg + ' ', CSS.w, false], ['b', CSS.b], [' ÷ (', CSS.w, false], ['−2', CSS.t, false], [')', CSS.w, false]]; l2 = [[fmt(va), CSS.g, false], [' ' + sg + ' ', CSS.w, false], [fmt(vb), CSS.b, false]]; }
      else { l1 = [...coefSegs(c, 'a', CSS.g), [' ' + sg + ' ', CSS.w, false], ...coefSegs(c, 'b', CSS.b)]; l2 = [[fmt(va), CSS.g, false], [' ' + sg + ' ', CSS.w, false], [fmt(vb), CSS.b, false]]; }
      setRich(RO1, l1, XL + 0.0065, top + 0.0095, 0); setRich(RO2, l2, XL + 0.0065, top - 0.0072, 0);
      // 乘负数：|c|a、|c|b 翻过 0 落到 ca、cb（两道半圆弧，外面那道落得更低）
      const arcsOn = S.arcs && show && c < -0.04;
      if (arcsOn) { const ra = -c * relA() * U, rb = -c * relB() * U, ga = W + ra, gb = W + rb;
        ghostA.position.set(XL, ga, ZM + 0.003); ghostB.position.set(XL, gb, ZM + 0.003); ghostA.visible = ghostB.visible = true;
        const pa = arcPts(ra, ra * 0.35).map(([x, y]) => [x, y + W]), pb = arcPts(rb, rb * 0.35).map(([x, y]) => [x, y + W]);
        if (arcA.anim) arcA.pts = pa; else arcA.set(pa); if (arcB.anim) arcB.pts = pb; else arcB.set(pb);
      }
      else { ghostA.visible = ghostB.visible = false; arcA.hide(); arcB.hide(); }
      if (S.asked) currentReading();
    }

    // ================= 一课的主线：每一步都由学生的那一下触发 =================
    function ask() { if (S.asked) return; S.asked = true; board.h('问题'); board(`已知 ${Ag} &gt; ${Bb}（也就是 ${Bb} &lt; ${Ag}：交换不等式两边，不等号的方向改变），比较 <span class="t">−2</span>${Ag} 与 <span class="t">−2</span>${Bb} 的大小（${Ag}、${Bb}：两座山的山尖相对原水面的坐标）。水面向上移动的格数记作 <i>c</i>，向下移时 <i>c</i> 为负。两座山的山尖相对新水面的坐标是 <i>a − c</i>、<i>b − c</i>。`, 'q'); }
    function transSeen() {          // 水面在两个山尖之间时：A 还露着，B 没进水里
      if (S.trans) return; S.trans = true; flash(XL, W0 + PB.h * U, BLUE, 0.004, 0.012); sfx.clink({ freq: 1500, gain: 0.04 });
      board.h('基本事实'); board(`不等关系可以传递：如果 ${I('a')} &gt; ${I('b')}，${I('b')} &gt; ${I('c')}，那么 ${I('a')} &gt; ${I('c')}。水面在两个山尖之间时：${Ag} <span class="t">− ${I('c')}</span> &gt; 0，0 &gt; ${Bb} <span class="t">− ${I('c')}</span>，所以 ${Ag} <span class="t">− ${I('c')}</span> &gt; ${Bb} <span class="t">− ${I('c')}</span>`, 'trans');
    }
    function addFound() {          // 性质1
      S.step = 'add-done'; S.stepAt = now(); flash(XL, Wl(), TEAL); sfx.ding(1180, { gain: 0.06 });
      currentReading();
      board.h('探究'); board(`<span class="n">1</span>不等式的性质1：不等式两边加（或减）同一个数（或式子），不等号的方向不变。如果 ${Ag} &gt; ${Bb}，那么 ${Ag} <span class="t">± ${I('c')}</span> &gt; ${Bb} <span class="t">± ${I('c')}</span>`, 'add');
      later(1900, () => { S.dTo = { from: S.d, t0: now() }; sfx.whoosh({ dur: 0.8, freq: 700, gain: 0.03 }); });
      later(3100, () => { S.step = 'pos'; S.showImg = true; S.c = 1; S.snap = 1; S.stepAt = now(); S.hint = 0; flash(XL, W0 + PA.h * U, GOLD, 0.004, 0.013);
        S.d = 0; S.dTo = null; layout(); });
    }
    function posFound() {          // 性质2
      S.step = 'pos-done'; S.stepAt = now(); flash(XL, Wl() + S.c * relA() * U, GOLD); flash(XL, Wl() + S.c * relB() * U, BLUE); sfx.ding(1250, { gain: 0.06 });
      board(`<span class="n">2</span>不等式的性质2：不等式两边乘（或除以）同一个正数，不等号的方向不变。如果 ${Ag} &gt; ${Bb}，<span class="t">${I('c')}</span> &gt; 0，那么 <span class="g">${I('a')}</span><span class="t">${I('c')}</span> &gt; <span class="b">${I('b')}</span><span class="t">${I('c')}</span>（或 ${FR(Ag, `<span class="t">${I('c')}</span>`)} &gt; ${FR(Bb, `<span class="t">${I('c')}</span>`)}）`, 'pos');
      later(2300, () => { S.step = 'zero'; S.stepAt = now(); S.hint = 0; check(); currentReading(); });
    }
    function zeroFound() {          // 乘 0
      S.step = 'zero-done'; S.stepAt = now(); flash(XL, Wl(), WHITE, 0.004, 0.013); sfx.clink({ freq: 1200, gain: 0.05 });
      board(`两边乘 0：都得 0，0 = 0，相等了（所以性质里乘的数都不为 0）`, 'zero');
      later(2300, () => { S.step = 'neg1'; S.stepAt = now(); S.hint = 0; check(); currentReading(); });
    }
    function wow() {          // 唯一的重拍：乘 −1 就是照进湖里
      S.step = 'neg1-done'; S.stepAt = now(); S.wowAt = now(); S.liftAt = now() + 1.15; sfx.ding(1320, { gain: 0.07 }); later(1150, () => { sfx.ding(1568, { gain: 0.06 }); later(160, () => sfx.ding(1976, { gain: 0.04 })); });
      flash(XL, Wl() - relA() * U, GOLD); flash(XL, Wl() - relB() * U, BLUE);
      board(`<span class="n">3</span>乘 <span class="t">−1</span>：${Ag}、${Bb} 变成 <span class="t">−</span>${Ag}、<span class="t">−</span>${Bb}，正是山 A、山 B 倒影的山尖。倒影和山关于水面对称：高的山，倒影反而深，${Ag} &gt; ${Bb}，<span class="t">−</span>${Ag} &lt; <span class="t">−</span>${Bb}`, 'neg1');
      later(3600, () => { S.step = 'neg2'; S.arcs = true; S.stepAt = now(); S.hint = 0; check(); layout(); });
    }
    function negFound() {          // 性质3
      S.step = 'neg2-done'; S.stepAt = now(); S.arcsAt = now(); flash(XL, Wl() + S.c * relA() * U, GOLD); flash(XL, Wl() + S.c * relB() * U, BLUE); sfx.ding(1400, { gain: 0.06 });
      const W = Wl(), ra = -S.c * relA() * U, rb = -S.c * relB() * U; arcA.draw(arcPts(ra, ra * 0.35).map(([x, y]) => [x, y + W]), 0.8); arcB.draw(arcPts(rb, rb * 0.35).map(([x, y]) => [x, y + W]), 0.8, 0.12);
      board(`<span class="n">4</span>不等式的性质3：不等式两边乘（或除以）同一个负数，不等号的方向改变。如果 ${Ag} &gt; ${Bb}，<span class="t">${I('c')}</span> &lt; 0，那么 <span class="g">${I('a')}</span><span class="t">${I('c')}</span> &lt; <span class="b">${I('b')}</span><span class="t">${I('c')}</span>（或 ${FR(Ag, `<span class="t">${I('c')}</span>`)} &lt; ${FR(Bb, `<span class="t">${I('c')}</span>`)}）。乘 <span class="t">−2</span>，就是先乘 2（方向不变），再乘 −1，翻过 0（方向改变）`, 'neg2');
      later(2800, () => { S.step = 'div'; S.stepAt = now(); S.hint = 0; check(); layout(); });
    }
    function divFound() {          // 除法
      S.step = 'div-done'; S.divDone = true; S.stepAt = now(); flash(XL, Wl() + S.c * relA() * U, GOLD); flash(XL, Wl() + S.c * relB() * U, BLUE); sfx.ding(1320, { gain: 0.06 });
      board(`<span class="n">5</span>除以一个不为 0 的数等于乘这个数的倒数，并且这个数的倒数和它的符号相同：${Ag} ÷ (<span class="t">−2</span>) &lt; ${Bb} ÷ (<span class="t">−2</span>)，也就是 <span class="t">−${FR(1, 2)}</span>${Ag} &lt; <span class="t">−${FR(1, 2)}</span>${Bb}`, 'div');
      later(2600, finish);
    }
    function finish() {
      S.step = 'end'; S.done = true; boardEl?.classList.add('review'); S.cTo = S.held ? null : { from: S.c, to: -2, t0: now() }; S.arcsAt = now();
      board.h('答'); board(`<b>答</b>：因为 ${Ag} &gt; ${Bb}，所以 <span class="t">−2</span>${Ag} &lt; <span class="t">−2</span>${Bb}（不等式的性质3）。`, 'ans');
      sfx.ding(1568, { gain: 0.06 }); ui?.unlock?.(); layout();
      later(2600, () => { ui?.go?.(2); ui?.fold?.(false); });          // 一课结束：翻到“对照课本原文”
    }
    // 学生停在某个数上：看这一步在等的是不是它
    function check() {
      const c = S.snap;
      if (S.step === 'pos' && c === 2) posFound();
      else if (S.step === 'zero' && c === 0) zeroFound();
      else if (S.step === 'neg1' && c === -1) wow();
      else if (S.step === 'neg2' && c === -2) negFound();
      else if (S.step === 'div' && c === -0.5) divFound();
    }
    // 讲完以后点板书：场景摆回那一刻
    function pose(k) {
      S.pose = k; S.dTo = null; S.cTo = null; S.wowAt = -9; S.arcsAt = -9;
      const set = (d, c, img, arcs) => { S.d = d; S.c = c; S.snap = c; S.showImg = img; S.arcs = arcs; };
      if (k === 'q') set(0, 1, false, false); else if (k === 'add') set(1, 1, false, false); else if (k === 'trans') set(2.5, 1, false, false);
      else if (k === 'pos') set(0, 2, true, false); else if (k === 'zero') set(0, 0, true, false); else if (k === 'neg1') { set(0, -1, true, false); S.wowAt = now(); S.liftAt = now() + 1.15; }
      else if (k === 'neg2' || k === 'ans') { set(0, -2, true, true); S.arcsAt = now(); } else if (k === 'div') { set(0, -0.5, true, true); S.arcsAt = now(); }
      layout();
      if (k === 'neg2' || k === 'div' || k === 'ans') { const W = Wl(), ra = -S.c * relA() * U, rb = -S.c * relB() * U; arcA.draw(arcPts(ra, ra * 0.35).map(([x, y]) => [x, y + W]), 0.7); arcB.draw(arcPts(rb, rb * 0.35).map(([x, y]) => [x, y + W]), 0.7, 0.1); }
    }

    // ================= 动手 =================
    let grab = 0;
    // 水面：按住往上拖、往下拖（只在水涨水落那一步能拖）
    const lakeRim = Array.from({ length: 120 }, (_, i) => { const th = (i / 120) * Math.PI * 2, n = 1 + 0.1 * Math.sin(3 * th + 0.7) + 0.06 * Math.sin(5 * th + 2.1) + 0.035 * Math.sin(8 * th + 0.3), rho = Math.sqrt(1.1 / (((Math.cos(th) / LAKE.rx) ** 2 + (Math.sin(th) / LAKE.rz) ** 2) * n)); return [LAKE.cx + rho * Math.cos(th), Math.min(0.13, LAKE.cz + rho * Math.sin(th))]; });
    const waterPick = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(lakeRim.map(([x, z]) => new THREE.Vector2(x, z)))), basic({ visible: false, side: THREE.DoubleSide }));
    waterPick.rotation.x = Math.PI / 2; waterPick.userData.pick = true; waterPick.userData.noFrame = true; group.add(waterPick);
    function waterDown(p) { if (S.step !== 'add' && !S.done) return false; ask(); S.held = 'water'; S.dTo = null; grab = S.d - p.y / U; sfx.whoosh({ dur: 0.25, freq: 900, gain: 0.025 }); return true; }
    function waterMove(p) {
      if (S.held !== 'water') return; let d = clamp(p.y / U + grab, D_MIN, D_MAX); const r = Math.round(d * 2) / 2; if (Math.abs(d - r) < 0.12) d = r;
      d = tenth(d);
      if (d === S.d) return; S.d = d; S.moved = now(); S.minD = Math.min(S.minD, d); S.maxD = Math.max(S.maxD, d);
      if (d > PB.h + 0.05 && S.step === 'add') transSeen();
      layout();
    }
    function waterUp() {
      if (S.held !== 'water') return; S.held = '';
      if (S.step !== 'add') return;
      if (S.maxD >= 0.9 && S.minD <= -0.4) addFound();
    }
    // 金点、蓝点：上下拖，两边同时乘的数跟着变（拖哪一个都行）
    const imgPick = (r) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), basic({ visible: false })); m.userData.pick = true; m.userData.noFrame = true; group.add(m); return m; };
    const pickA = imgPick(0.0085), pickB = imgPick(0.0075);
    const MUL = ['pos', 'pos-done', 'zero', 'zero-done', 'neg1', 'neg1-done', 'neg2', 'neg2-done', 'div', 'div-done', 'end'];
    function imgDown(which, p) { if (!MUL.includes(S.step) || !S.showImg) return false; S.held = which; S.cTo = null; const h = which === 'A' ? relA() : relB(); grab = S.c - (p.y - Wl()) / (h * U); return true; }
    function imgMove(p) {
      if (S.held !== 'A' && S.held !== 'B') return; const h = S.held === 'A' ? relA() : relB();
      let c = clamp((p.y - Wl()) / (h * U) + grab, C_MIN, C_MAX), snap = null;
      for (const v of SNAPS) if (Math.abs(c - v) * h * U < 0.0026) { c = v; snap = v; break; }
      const goal = targets[S.step];
      if (goal !== undefined && snap === null && (S.c - goal) * (c - goal) < 0) { c = goal; snap = goal; }          // 这一步要找的那个数：一下子拖过去也停在它上面
      c = tenth(c); snap = SNAPS.includes(c) ? c : null;
      if (c === S.c) return;
      const was = S.c; S.c = c; S.moved = now(); S.pose = '';
      if (snap !== null && snap !== S.snap) sfx.clink({ freq: 900 + snap * 180, gain: 0.025 });
      if ((was > 0 && c <= 0) || (was < 0 && c >= 0)) { flash(XL, Wl(), WHITE, 0.003, 0.009, 8); }          // 穿过 0：两个点在水面上碰到一起
      S.snap = snap;
      check(); layout();
    }
    function imgUp() { if (S.held === 'A' || S.held === 'B') S.held = ''; }
    const drags = [
      { obj: pickA, plane: 'xy', offset: ZM, hint: () => '上下拖：两边同时乘一个数', enabled: () => MUL.includes(S.step) && S.showImg, onStart: (p) => imgDown('A', p), onDrag: (p) => imgMove(p), onEnd: () => imgUp() },
      { obj: pickB, plane: 'xy', offset: ZM, hint: () => '上下拖：两边同时乘一个数', enabled: () => MUL.includes(S.step) && S.showImg, onStart: (p) => imgDown('B', p), onDrag: (p) => imgMove(p), onEnd: () => imgUp() },
      { obj: waterPick, plane: 'xy', offset: ZM, hint: () => '按住水面，上下拖', enabled: () => S.step === 'add', onStart: (p) => waterDown(p), onDrag: (p) => waterMove(p), onEnd: () => waterUp() },
    ];
    const dragApi = draggable(group, drags, { onClick: () => false });
    let heard = false;
    const canvasEl = () => document.getElementById('c');
    const pointer = { down: (r, e) => { if (!heard) { heard = true; audio(); } return dragApi.down(r, e); },
      move: (r, e) => { const out = dragApi.move(r, e), it = dragApi.hovered?.(), c = canvasEl(); if (c) { const h = it && it.enabled?.() !== false ? (typeof it.hint === 'function' ? it.hint() : it.hint) : ''; if (h) c.dataset.tip = h; else delete c.dataset.tip; } return out; },
      up: (r, e) => dragApi.up(r, e), items: dragApi.items };
    function opening() { caption('已知 a > b，−2a 与 −2b 谁大？', 'a、b：两座山的山尖相对原水面的坐标'); prompt(OPEN_ASK, '先看加减：水涨水落，两个山尖的坐标怎样变？'); }
    function reset() { runId++; S = fresh(); for (const sp of wowDots) sp.visible = false; for (const L of wowTicks) L.hide(); for (const L of wowThreads) L.hide(); for (const L of wowUp) L.hide(); arcA.hide(); arcB.hide(); rows.length = 0; lastH = ''; if (boardEl) { boardEl.innerHTML = ''; boardEl.classList.remove('review'); } cap.key = ''; const cv = canvasEl(); if (cv) delete cv.dataset.tip; ui?.relock?.(); ui?.go?.(1); opening(); layout(); }
    const onKey = (e) => { if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !e.target?.closest?.('input,textarea')) reset(); };
    addEventListener('keydown', onKey);

    layout();
    const DIR = [0, Math.sin(VIEW_EL), Math.cos(VIEW_EL)];
    let last = now();
    return {
      group: root, card: false, place: 'spread', scale: 0.95,
      size: { w: 0.43, d: 0.31, h: 0.16 },
      view: { elev: 25, azim: 0, lookY: 0.4, frameMargin: 1.0 },
      pointer,
      mount(u) { ui = u; boardEl = document.createElement('div'); boardEl.className = 'bd-board' + (S.done ? ' review' : ''); u.controls?.append(boardEl);
        boardEl.addEventListener('click', (e) => { const r = e.target.closest?.('.bd-row'); if (!S.done || !r?.dataset.k) return; for (const o of rows) o.classList?.remove('sel', 'fresh'); r.classList.add('sel'); sfx.clink({ freq: 1200, gain: 0.03 }); pose(r.dataset.k); });
        for (const r of rows) { boardEl.append(r); r.classList.add('in'); }
        ui.go?.(1); if (!cap.key) { opening(); axis.draw(axisPts, 0.9, 0.4); } else { ui.ask?.(S.ask); ui.status?.(S.instruction); }
        requestAnimationFrame(() => aim?.(DIR)); setTimeout(() => { if (!dead) aim?.(DIR); }, 700); },
      dispose() { dead = true; runId++; removeEventListener('keydown', onKey); css.remove(); mirror.dispose?.(); const c = canvasEl(); if (c) delete c.dataset.tip; },
      update() {
        const t = now(), dt = Math.min(0.05, t - last); last = t; uT.value = t; mirror.material.uniforms.uT.value = t;
        // 水面回到原来的高度；答完以后金点回到 −2
        if (S.dTo) { const k = clamp((t - S.dTo.t0) / 1.0, 0, 1); S.d = tenth(lerp(S.dTo.from, 0, easeOut(k))); if (k >= 1) S.dTo = null; layout(); }
        if (S.cTo) { const k = clamp((t - S.cTo.t0) / 0.9, 0, 1); S.c = tenth(lerp(S.cTo.from, S.cTo.to, easeOut(k))); if (k >= 1) { S.c = S.cTo.to; S.snap = S.c; S.cTo = null; } layout(); }
        // 水纹：荡开、淡掉
        if (Math.random() < dt * (S.step === 'add' && !S.held ? 0.9 : 0.25)) { const x = XL + 0.012 + (Math.random() - 0.3) * 0.09, z = 0.0 + Math.random() * 0.09; if (qAt(x, z) < 0.8) ripple(x, z); }
        for (let i = rings.length - 1; i >= 0; i--) { const m = rings[i], age = t - m.userData.born; if (age > 2.4) { world.remove(m); m.material.dispose(); rings.splice(i, 1); continue; } m.position.y = Wl() + 0.0004; m.scale.setScalar(0.002 + age * 0.009); m.material.opacity = 0.32 * Math.sin(Math.min(1, age / 2.4) * Math.PI) * (1 - age / 2.4); }
        // 新线一笔画出来
        for (const L of lineList) if (L.anim) { if (t < L.anim.t0) continue; const k = clamp((t - L.anim.t0) / L.anim.dur, 0, 1), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; L._draw(L.pts ? partial(L.pts, e) : null); if (k >= 1) { L.anim = null; L._draw(L.pts); } }
        // 重拍：每座山尖上的金点一起翻进湖里（c 从 1 到 −1），落在自己的倒影上
        { const age = t - S.wowAt, W = Wl();
          if (age >= 0 && age < 4.6) { const k = clamp((age - 0.35) / 0.8, 0, 1), cw = 1 - 2 * (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2), fade = clamp(1 - (age - 3.2) / 1.4, 0, 1), pop = clamp(age / 0.25, 0, 1);
            wowPeaks.forEach((p, i) => { const sp = wowDots[i], y = W + cw * (p.top - W); sp.position.set(p.x, y, p.z); wowUp[i].set(k > 0 ? [[p.x, p.top], [p.x, Math.max(y, W)]] : null); wowUp[i].fade(fade * 0.45); wowThreads[i].set(k > 0 && y < W ? [[p.x, W], [p.x, y]] : null); wowThreads[i].fade(fade * 0.95); sp.scale.setScalar(0.0115 * pop * (k >= 1 ? 1 + 0.35 * Math.max(0, 1 - (age - 1.15) / 0.4) : 1)); sp.material.opacity = fade; sp.visible = true;
              const hh = (p.top - W); wowTicks[i].set([[XL - 0.004, W + cw * hh], [XL + 0.004, W + cw * hh]]); wowTicks[i].fade(fade); });
            if (k >= 1 && !S.wowLanded) { S.wowLanded = true; wowPeaks.forEach((p) => { if (p !== pA && p !== pB) flash(p.x, W - (p.top - W), GOLD, 0.0035, 0.011, 8, p.z); }); } }
          else if (wowDots[0].visible) { for (const sp of wowDots) sp.visible = false; for (const L of wowTicks) L.hide(); for (const L of wowThreads) L.hide(); for (const L of wowUp) L.hide(); S.wowLanded = false; } }
        { const a = t - S.liftAt; mirror.material.uniforms.uLift.value = a > 0 && a < 1.2 ? 0.35 * Math.sin((a / 1.2) * Math.PI) : 0; }
        // 半圆弧：重拍以后一直跟着金点（第一次一笔画出来）
        // 重拍光线
        for (let i = flashes.length - 1; i >= 0; i--) { const F = flashes[i], k = clamp((t - F.t0) / 0.55, 0, 1), e = easeOut(k); F.rays.forEach((L, j) => { const th = (j / F.rays.length) * Math.PI * 2 + 0.2, ra = lerp(F.r0, F.r1, e), rb = lerp(F.r0, F.r1, Math.min(1, e * 0.55 + 0.1)); L.set([[F.x + Math.cos(th) * rb, F.y + Math.sin(th) * rb], [F.x + Math.cos(th) * ra, F.y + Math.sin(th) * ra]]); L.fade(1 - k); });
          if (k >= 1) { for (const L of F.rays) { L.hide(); for (const m of [L.core, L.glow, L.shade]) if (m) { mathG.remove(m); m.geometry.dispose(); m.material.dispose(); } lineList.splice(lineList.indexOf(L), 1); } flashes.splice(i, 1); } }
        // 此刻那一句：淡进淡出
        if (cap.out < 1e9) { const k = clamp(1 - (t - cap.out) / 0.35, 0, 1); capMesh.material.opacity = k; if (k <= 0) { cap.out = 1e9; const nx = cap.next; cap.next = null; nx?.(); } } else capMesh.material.opacity = clamp((t - cap.born) / 0.5, 0, 1);
        // 该动手的东西轻轻一呼一吸：开头是水面，后面是金点
        { const b = 1 + 0.2 * Math.sin(t * 3.4) ** 2, wait = !S.held && !S.done && t - S.moved > 2.5;
          imgA.scale.setScalar(0.0185 * (wait && ['pos', 'zero', 'neg1', 'neg2', 'div'].includes(S.step) ? b : 1));
        }
        pickA.position.copy(imgA.position); pickB.position.copy(imgB.position); pickA.visible = S.showImg; pickB.visible = S.showImg && Math.abs(S.c) * (relA() - relB()) * U > 0.017;          // 两个点挨在一起时只留金点能抓（拖哪个都是同一个乘数）
        // 卡住很久，才给提示（不拦着人），提示是问题
        if (!S.held && !S.done && S.hint < 1 && t - S.stepAt > 15 && t - S.moved > 4) {
          const H1 = { add: ['水涨上来、落下去，山尖相对水面的坐标各变了多少？', '按住水面，上下拖'], pos: ['金点往上拉：2a 和 2b，谁在上面？', '金点是 a 乘那个数，蓝点是 b 乘那个数'], zero: ['金点拉到水面，是乘了几？', ''], neg1: ['金点拉到水下，停在 −a 那儿：它和 A 的倒影有什么关系？', ''], neg2: ['−2a 在 −12 那儿：它和 −2b 谁在上面？', ''], div: ['除以 −2，就是乘几？金点拉到那儿看看', ''] }[S.step];
          if (H1) { S.hint = 1; if (S.asked) prompt(S.ask, H1.filter(Boolean).join(' ')); else caption(...H1); } }
      },
      debug: {
        get S() { return S; }, rows, pose, cap: () => S.cap,
        labels: () => [labA, labB, labIA, labIB, RO1, RO2],
        qa: [
          { name: '水涨水落', run: () => { waterDown({ y: 0 }); for (let i = 1; i <= 12; i++) waterMove({ y: -i * 0.1 * U * 1.5 }); for (let i = 1; i <= 30; i++) waterMove({ y: (-1.5 + i * 0.1 * 1.4) * U }); waterUp(); }, wait: 3.6 },
          { name: '乘 2', run: () => { imgDown('A', { y: Wl() + relA() * U }); for (let i = 1; i <= 10; i++) imgMove({ y: Wl() + relA() * U * (1 + i * 0.1) }); imgUp(); }, wait: 2.6 },
          { name: '乘 0', run: () => { imgDown('A', { y: Wl() + 2 * relA() * U }); for (let i = 1; i <= 20; i++) imgMove({ y: Wl() + relA() * U * (2 - i * 0.1) }); imgUp(); }, wait: 2.6 },
          { name: '乘 −1（重拍）', run: () => { imgDown('A', { y: Wl() }); for (let i = 1; i <= 10; i++) imgMove({ y: Wl() - relA() * U * i * 0.1 }); imgUp(); }, wait: 4 },
          { name: '乘 −2', run: () => { imgDown('A', { y: Wl() - relA() * U }); for (let i = 1; i <= 10; i++) imgMove({ y: Wl() - relA() * U * (1 + i * 0.1) }); imgUp(); }, wait: 3 },
          { name: '除以 −2', run: () => { imgDown('A', { y: Wl() - 2 * relA() * U }); for (let i = 1; i <= 15; i++) imgMove({ y: Wl() - relA() * U * (2 - i * 0.1) }); imgUp(); }, wait: 3.4 },
        ],
      },
    };
  },
};
