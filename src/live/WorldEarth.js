// 地球主探索里的那一颗地球（不是活页，是一本地理书打开以后一直在的“世界”）。
// 真实地形的晕渲（和板块那张活页同一张图，落到板块时换过去看不出接缝），一圈淡蓝的大气，北极朝上。
// 课本举的例子发生在哪里，就在哪里插一面小旗（按章着色，名字平时不写，指着才浮出来）；
// 整个地球的事可以叠一层：现在这一刻的昼夜、板块边界、气压带。
// 地球自己的大小是 1（半径），摆在哪、多大由 World 每帧给（root 的位置和缩放）。
import * as THREE from 'three';
import reliefUrl from '../lessons/data/earth_relief.jpg';
import nightUrl from '../lessons/data/earth_night.jpg';
import { ll2v } from '../lessons/kit/plates.js';
import { airLabel } from '../lessons/kit/labels.js';
import { canvasTex } from '../lessons/kit/props.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

const D2R = Math.PI / 180;
const V = (lat, lon, r = 1) => new THREE.Vector3(...ll2v(lat, lon)).multiplyScalar(r);

/** 云：在显卡上算一次，烤成一张经纬网贴图（2048×1024）。噪声按球面上的三维位置取，所以经线 180° 和两极没有接缝；
 *  噪声自己扭一扭（domain warp）出涡旋，东西向拉长（大气多沿纬线流）；按纬度调疏密：赤道辐合带一团团对流云、中纬度一条条锋面云带多，副热带少 */
function bakeClouds(renderer) {
  const rt = new THREE.WebGLRenderTarget(2048, 1024, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const m = new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `varying vec2 vUv;
      float hash(vec3 p){ p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float noise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z); }
      float fbm(vec3 p, int oct){ float a = 0.5, s = 0.0; for (int i = 0; i < 8; i++){ if (i >= oct) break; s += a * noise(p); p = p * 2.02 + vec3(3.1, 1.7, 5.3); a *= 0.5; } return s; }
      void main(){
        float phi = vUv.x * 6.2831853, th = (1.0 - vUv.y) * 3.14159265;
        vec3 p = vec3(-cos(phi) * sin(th), cos(th), sin(phi) * sin(th));
        float lat = degrees(asin(clamp(p.y, -1.0, 1.0))), L = abs(lat);
        vec3 s = p * vec3(2.0, 3.6, 2.0);
        vec3 q = vec3(fbm(s, 5), fbm(s + vec3(5.2, 1.3, 2.8), 5), fbm(s + vec3(1.7, 9.2, 4.1), 5));
        vec3 r = vec3(fbm(s + 3.5 * q + vec3(8.3, 2.8, 1.1), 5), fbm(s + 3.5 * q + vec3(2.1, 7.4, 3.3), 5), 0.0);
        float n = fbm(s * 1.3 + 2.6 * r, 7);
        float itcz = exp(-pow((lat - 6.0) / 7.0, 2.0)), storm = exp(-pow((L - 52.0) / 14.0, 2.0)), dry = exp(-pow((L - 23.0) / 8.0, 2.0)), polar = smoothstep(70.0, 90.0, L);
        float cover = 0.53 - 0.07 * itcz - 0.08 * storm + 0.09 * dry + 0.05 * polar;
        float nn = mix(n, n * 0.55 + fbm(p * 22.0, 4) * 0.5, itcz * 0.7);
        float c = smoothstep(cover, cover + 0.17, nn);
        c *= 0.62 + 0.38 * fbm(p * 30.0 + r * 3.0, 4);
        gl_FragColor = vec4(c, c, c, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m));
  const prev = renderer.getRenderTarget(); renderer.setRenderTarget(rt); renderer.render(scene, cam); renderer.setRenderTarget(prev);
  m.dispose();
  return rt.texture;
}

/** 现在这一刻太阳直射在哪（纬度、经度，度）：天文年历的简化公式，误差在 1° 以内，够画晨昏线 */
export function subsolar(date = new Date()) {
  const d = date.getTime() / 86400000 - 10957.5;          // 距 J2000.0（2000-01-01 12:00 UTC）的天数
  const g = (357.529 + 0.98560028 * d) * D2R, q = 280.459 + 0.98564736 * d;
  const lam = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * D2R, eps = (23.439 - 0.00000036 * d) * D2R;
  const dec = Math.asin(Math.sin(eps) * Math.sin(lam));
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam));
  const eqt = ((q * D2R - ra + Math.PI * 3) % (Math.PI * 2)) - Math.PI;          // 均时差（弧度）
  const utc = (date.getTime() / 3600000) % 24;
  let lon = -15 * (utc - 12) - eqt / D2R;
  lon = ((lon + 540) % 360) - 180;
  return { lat: dec / D2R, lon };
}

/** 夜空里的大气光：贴着地球边缘最亮，往外慢慢散掉（叠加混合，像真的在发光）。R 是光晕球的半径（地球是 1） */
function glowShell(R, nowU) {
  const limb = Math.sqrt(1 - 1 / (R * R));          // 地球边缘那一圈，光晕球面朝镜头的程度
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending, uniforms: { k: { value: 1 }, o: { value: 1 }, ...nowU },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    // 真实的太阳（nowK）：受光那一侧的边缘亮，背光那一侧暗；太阳在地球背后时整圈逆光发亮
    fragmentShader: `uniform float k; uniform float o; uniform vec3 sunView; uniform float nowK; varying vec3 vN; varying vec3 vV; void main(){ float d = abs(dot(normalize(vN), normalize(vV))); float a = pow(clamp(d / ${limb.toFixed(4)}, 0.0, 1.0), 2.6);
      vec3 lb = vec3(normalize(vN.xy + 1e-5), 0.0); float lit = smoothstep(-0.3, 0.35, dot(lb, sunView)); float back = pow(max(0.0, -sunView.z), 3.0);
      a *= mix(1.0, 0.1 + 0.9 * max(lit, back), nowK); gl_FragColor = vec4(vec3(0.38, 0.62, 1.0) * a * 0.95 * k * o, 1.0); }`,
  });
}

export class WorldEarth {
  constructor(stage, { clouds = true, night = false, now = false } = {}) {
    this.night = night;          // 地理世界（夜空里）：大气光更亮一点
    // now：现在这一刻的地球——太阳照在它此刻真实的位置（或拨到的时刻），夜里那一半亮着城市灯光。nowK 0—1 和平常的灯光之间过渡（落到书桌上时换回平常的）
    this.sunLocal = new THREE.Vector3(1, 0, 0); this.nowK = now ? 1 : 0;
    this.nowU = { sunView: { value: new THREE.Vector3(0, 0, 1) }, nowK: { value: this.nowK } };
    this.stage = stage;
    this.root = new THREE.Group();          // 位置和大小（缩放 = 半径）
    this.spin = new THREE.Group();          // 地球自己的朝向
    this.root.add(this.spin);
    this.root.visible = false;
    stage.scene.add(this.root);

    const tex = new THREE.TextureLoader().load(reliefUrl, (t) => this._oceanGloss(t.image));
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    this.mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.78, metalness: 0, emissive: 0x0b1220, emissiveIntensity: 0.25, bumpMap: tex, bumpScale: 2.2 });          // 晕渲图本身当起伏：山脉一面受光一面背光，更立体
    if (now) {
      const lights = new THREE.TextureLoader().load(nightUrl); lights.colorSpace = THREE.SRGBColorSpace; lights.anisotropy = 8;
      this.nowU.nightMap = { value: lights };
      this.mat.onBeforeCompile = (sh) => {          // 白天：太阳方向的漫反射 + 海面上的一点反光；夜里：城市灯光（NASA 2016 年合成）；晨昏线上一道暖色
        Object.assign(sh.uniforms, this.nowU);
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 sunView; uniform sampler2D nightMap; uniform float nowK;').replace('#include <opaque_fragment>', `{
          vec3 Ls = normalize(sunView); float d0 = dot(nonPerturbedNormal, Ls), d = dot(normal, Ls), dayK = smoothstep(-0.08, 0.22, d0), lam = max(d, 0.0);          // 昼夜、夜灯、晨昏线按球面本身的法线（d0）；山的明暗、海面反光才用起伏扰动过的法线（d）
          vec3 Vv = normalize(vViewPosition), Hh = normalize(Ls + Vv);
          float sea = 1.0 - smoothstep(0.55, 0.75, roughnessFactor), spec = pow(max(dot(normal, Hh), 0.0), 90.0) * sea * 0.55 * smoothstep(0.0, 0.25, d0);
          vec3 dayC = diffuseColor.rgb * (0.05 + 1.15 * lam) + vec3(1.0, 0.92, 0.8) * spec;
          vec3 nightC = diffuseColor.rgb * vec3(0.03, 0.04, 0.07) + texture2D(nightMap, vMapUv).rgb * vec3(1.0, 0.78, 0.48) * 1.6;
          vec3 nowC = mix(nightC, dayC, dayK) + diffuseColor.rgb * vec3(0.9, 0.38, 0.15) * 0.18 * exp(-pow(d0 / 0.09, 2.0));
          outgoingLight = mix(outgoingLight, nowC, nowK);
        }
        #include <opaque_fragment>`);
      };
    }
    this.globe = new THREE.Mesh(new THREE.SphereGeometry(1, 160, 112), this.mat);
    this.globe.castShadow = false;
    this.spin.add(this.globe);
    // 一层均匀的“海”：落到不画海陆的地球上（气压带）之前，海陆慢慢淡掉
    this.plainM = new THREE.MeshStandardMaterial({ color: 0x86b4d4, roughness: 0.7, transparent: true, opacity: 0, depthWrite: false });
    this.plain = new THREE.Mesh(new THREE.SphereGeometry(1.0015, 96, 64), this.plainM); this.plain.raycast = () => {}; this.plain.visible = false; this.spin.add(this.plain);
    // 大气：边缘一圈淡蓝的光（背面一层往外晕开，正面一层贴着球边发蓝）
    const rim = (side, k, pw, col) => new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side, uniforms: { k: { value: k }, o: { value: 1 } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: `uniform float k; uniform float o; varying vec3 vN; varying vec3 vV; void main(){ float r = 1.0 - abs(dot(normalize(vN), normalize(vV))); gl_FragColor = vec4(${col}, pow(r, ${pw.toFixed(1)}) * k * o); }`,
    });
    this.haloM = night ? glowShell(1.1, this.nowU) : rim(THREE.BackSide, 0.38, 3.0, 'vec3(0.36, 0.58, 0.95)');
    this.hazeM = rim(THREE.FrontSide, 0.5, 2.6, 'vec3(0.62, 0.80, 1.0)');
    const halo = new THREE.Mesh(new THREE.SphereGeometry(night ? 1.1 : 1.028, 96, 64), this.haloM), haze = new THREE.Mesh(new THREE.SphereGeometry(1.003, 96, 64), this.hazeM);
    halo.raycast = haze.raycast = () => {};
    this.root.add(halo, haze);
    // 薄云：按纬度疏密（赤道附近、中纬度多，副热带少）的一层，慢慢飘；只是让地球“活”起来的装饰，不是实况。开“看法”时淡下去
    this.cloudK = clouds ? 1 : 0; this.cloudWant = this.cloudK;
    if (clouds) {
      this.cloudM = new THREE.MeshStandardMaterial({ color: 0xffffff, alphaMap: bakeClouds(stage.renderer), transparent: true, depthWrite: false, roughness: 1, opacity: 0.55 });
      if (now) this.cloudM.onBeforeCompile = (sh) => {          // 云也按真实的太阳受光：夜里的云淡下去，不挡住城市灯光
        Object.assign(sh.uniforms, this.nowU);
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 sunView; uniform float nowK;').replace('#include <opaque_fragment>', `{
          float d = dot(normal, normalize(sunView)), lit = smoothstep(-0.12, 0.3, d);
          vec3 nowC = diffuseColor.rgb * (0.03 + 0.9 * max(d, 0.0) + 0.1 * lit) + vec3(1.0, 0.5, 0.25) * 0.22 * exp(-pow(d / 0.1, 2.0));
          outgoingLight = mix(outgoingLight, nowC, nowK); diffuseColor.a *= mix(1.0, mix(0.3, 1.0, lit), nowK);
        }
        #include <opaque_fragment>`);
      };
      this.cloud = new THREE.Mesh(new THREE.SphereGeometry(1.012, 128, 96), this.cloudM); this.cloud.raycast = () => {}; this.spin.add(this.cloud);
    }

    // 书页上的影子：一块柔和的圆影，跟着地球离书页的高度变淡
    const shTex = canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(40,30,20,0.42)'); gr.addColorStop(0.55, 'rgba(40,30,20,0.16)'); gr.addColorStop(1, 'rgba(40,30,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, opacity: 0 }));
    this.shadow.rotation.x = -Math.PI / 2; this.shadow.renderOrder = 3; this.shadow.raycast = () => {};
    stage.scene.add(this.shadow);

    this.pins = []; this.layer = null; this.layerK = { sun: 0, plates: 0, belts: 0 }; this.hot = null; this.active = null; this.target = null; this.fade = 1;
    this._layers();
    this.setTime();
  }

  /** 海面比陆地光滑：按贴图的颜色（蓝的是海）做一张粗糙度图，太阳在海面上有一点反光 */
  _oceanGloss(img) {
    try {
      const w = 1024, h = 512, c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0, w, h);
      const d = g.getImageData(0, 0, w, h), p = d.data;
      for (let i = 0; i < p.length; i += 4) { const sea = p[i + 2] > p[i] * 1.25 && p[i + 2] > p[i + 1] * 1.02; const v = sea ? 120 : 230; p[i] = p[i + 1] = p[i + 2] = v; }
      g.putImageData(d, 0, 0);
      const t = new THREE.CanvasTexture(c); this.mat.roughnessMap = t; this.mat.roughness = 1; this.mat.needsUpdate = true;
    } catch { /* 读不到像素（离线版的跨域）：整颗球一样粗糙 */ }
  }

  _layers() {
    const sun = subsolar();
    this.sunDir = V(sun.lat, sun.lon);
    const shell = (r, frag, uniforms = {}) => { const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { k: { value: 0 }, ...uniforms }, vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: frag }); const s = new THREE.Mesh(new THREE.SphereGeometry(r, 128, 80), m); s.raycast = () => {}; this.spin.add(s); return m; };
    // 现在这一刻的昼夜：背着太阳的半个地球暗下去，中间一道晨昏线
    this.sunM = shell(1.003, 'uniform float k; uniform vec3 s; varying vec3 vP; void main(){ float d = dot(normalize(vP), s); float night = 1.0 - smoothstep(-0.05, 0.05, d); float line = 1.0 - smoothstep(0.0, 0.035, abs(d)); gl_FragColor = vec4(mix(vec3(0.02,0.04,0.12), vec3(1.0,0.82,0.5), line * (1.0 - night * 0.5)), k * max(night * 0.66, line * 0.8)); }', { s: { value: this.sunDir.clone() } });
    // 气压带：赤道低压、30° 副热带高压、60° 副极地低压、极地高压（和气压带那张活页一样：红高蓝低）
    this.beltM = shell(1.004, 'uniform float k; varying vec3 vP; void main(){ float lat = asin(clamp(normalize(vP).y, -1.0, 1.0)); float p = cos(lat * 6.0); float band = smoothstep(0.55, 0.92, abs(p)); vec3 c = p > 0.0 ? vec3(0.34,0.52,0.86) : vec3(0.90,0.48,0.38); gl_FragColor = vec4(c, k * band * 0.55); }');
    this.plateG = new THREE.Group(); this.spin.add(this.plateG); this._platesLoaded = false;
  }

  async _loadPlates() {
    if (this._platesLoaded) return; this._platesLoaded = true;
    const LINES = (await import('../lessons/data/plates.js')).default, COL = { grow: 0xd8342c, die: 0x23a04e, slide: 0x8a8e96 };          // 和板块那张活页一样：红是生长边界、绿是消亡边界、灰是转换边界
    for (const k of Object.keys(COL)) {
      const P = [];
      for (const l of LINES) { if (l.k !== k) continue; for (let i = 0; i < l.pts.length - 1; i++) { const a = l.pts[i], b = l.pts[i + 1]; P.push(...ll2v(a[1], a[0]).map((v) => v * 1.006), ...ll2v(b[1], b[0]).map((v) => v * 1.006)); } }
      const g = new LineSegmentsGeometry(); g.setPositions(P);
      const ln = new LineSegments2(g, new LineMaterial({ color: COL[k], linewidth: k === 'slide' ? 1.4 : 2.4, worldUnits: false, transparent: true, opacity: 0, depthWrite: false })); ln.raycast = () => {}; ln.visible = false; this.plateG.add(ln);
    }
  }

  /** 插旗：items 是这本书的活页（带 anchor、章的颜色） */
  setPins(items) {
    for (const p of this.pins) { this.spin.remove(p.g); p.label.parent?.remove(p.label); }
    this.pins = [];
    const glowTex = this._glowTex ||= canvasTex(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const stalkM = new THREE.MeshStandardMaterial({ color: 0x2f343c, roughness: 0.6 });
    for (const it of items) {
      for (const pn of it.anchor.pins || []) {
        const n = V(pn.lat, pn.lon), g = new THREE.Group(); this.spin.add(g);
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.07, 6), stalkM); stalk.position.copy(n).multiplyScalar(1.035); stalk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n); g.add(stalk);
        const bead = new THREE.Mesh(new THREE.SphereGeometry(0.024, 20, 14), new THREE.MeshStandardMaterial({ color: it.color, emissive: it.color, emissiveIntensity: 0.4, roughness: 0.35 })); bead.position.copy(n).multiplyScalar(1.075); g.add(bead);
        const ring = new THREE.Mesh(new THREE.SphereGeometry(0.031, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide })); ring.position.copy(bead.position); ring.raycast = () => {}; g.add(ring);          // 珠子外一圈白边：在海陆上都认得出
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: it.color, transparent: true, depthWrite: false, opacity: 0 })); glow.scale.setScalar(0.12); glow.position.copy(bead.position); glow.raycast = () => {}; g.add(glow);
        const pick = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); pick.position.copy(bead.position); pick.userData.pin = { it, pn }; g.add(pick);
        let line = null;
        if (pn.line) {          // 沿着一条线切开的（赤道太平洋剖面）：在地球上画出这条线
          const [a, b] = pn.line, pts = [];
          for (let i = 0; i <= 64; i++) { const f = i / 64; pts.push(V(a[0] + (b[0] - a[0]) * f, a[1] + (((b[1] - a[1] + 540) % 360) - 180) * f, 1.008)); }
          const lg = new LineSegmentsGeometry(); lg.setPositions(pts.flatMap((p, i) => (i ? [pts[i - 1].x, pts[i - 1].y, pts[i - 1].z, p.x, p.y, p.z] : [])));
          line = new LineSegments2(lg, new LineMaterial({ color: new THREE.Color(it.color), linewidth: 2.6, worldUnits: false, transparent: true, opacity: 0, depthWrite: false })); line.raycast = () => {}; line.visible = false; g.add(line);          // 透明的线不写深度：不然挡住后面那层大气，留下一道暗线
        }
        const label = airLabel(this.spin, pn.name, { h: 0.075, color: '#1c2a44', dim: 0 });
        const la = pn.lat * D2R, lo = pn.lon * D2R, east = new THREE.Vector3(-Math.sin(lo), 0, -Math.cos(lo)), north = new THREE.Vector3(-Math.sin(la) * Math.cos(lo), Math.cos(la), Math.sin(la) * Math.sin(lo));
        const place = () => label.position.copy(n).multiplyScalar(1.09).addScaledVector(east, (pn.side ?? 1) * (label.scale.x / 2 + 0.035)).addScaledVector(north, (pn.up ?? 0) * 12);
        place();
        this.pins.push({ it, pn, n, g, bead, ring, glow, pick, label, line, place, hot: 0 });
      }
    }
  }

  /** 太阳照在哪个时刻：现在（不给）或拨到的那一刻。直射点按天文年历的简化公式算（误差 1° 以内） */
  setTime(date = new Date()) { const s = subsolar(date); this.sub = s; this.sunLocal.copy(V(s.lat, s.lon)); this.sunM.uniforms.s.value.copy(this.sunLocal); return s; }

  /** 指着的（hot）、正在看的（active）：都是 { it, pn } 或只有 it */
  setHot(x) { this.hot = x; }
  setActive(x) { this.active = x; }
  setLayer(k) { this.layer = k; if (k === 'plates') this._loadPlates(); }

  /** 地球只绕地轴转，把这一点的经线转到正对镜头（纬度不变，北一直朝上） */
  turnTo(lat, lon, camera) {
    const c = new THREE.Vector3(); camera.getWorldPosition(c);
    const p = new THREE.Vector3(); this.root.getWorldPosition(p);
    const d = c.sub(p); d.y = 0; if (d.lengthSq() < 1e-8) return;
    const camLon = Math.atan2(-d.z, d.x) / D2R;          // 镜头在地球的哪个“经度”方向（地球不转时）
    this.target = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (camLon - lon) * D2R);
    void lat;
  }

  /** 旗在世界里的位置 */
  pinWorld(pn, out = new THREE.Vector3()) { this.root.updateMatrixWorld(true); return out.copy(V(pn.lat, pn.lon, 1.07)).applyMatrix4(this.spin.matrixWorld); }
  /** 一点在地球上，朝不朝着镜头（1 正对，0 在边上，负数在背面） */
  facing(n, camera) { const c = new THREE.Vector3(); camera.getWorldPosition(c); const p = new THREE.Vector3(); this.root.getWorldPosition(p); const w = n.clone().applyQuaternion(this.spin.getWorldQuaternion(new THREE.Quaternion())); return w.dot(c.sub(p).normalize()); }

  /** 点到哪面旗：只算看得见的旗（朝着镜头、没被地球挡住）。背面的旗视觉上收起了，也不能隔着地球点到 */
  hitPin(rc) {
    if (!this.root.visible) return null;
    const g = rc.intersectObject(this.globe, false)[0], cam = rc.ray.origin;
    const vis = this.pins.filter((p) => p.g.visible && p.bead.scale.x > 0.3);
    const h = rc.intersectObjects(vis.map((p) => p.pick), false).find((x) => !g || x.distance <= g.distance + this.root.scale.x * 0.12);
    void cam;
    return h ? h.object.userData.pin : null;
  }
  hitGlobe(rc) { return this.root.visible && rc.intersectObject(this.globe, false).length > 0; }

  /** 旗要不要、大气光多亮（0—1）：落到活页里的那颗地球上时都收掉 */
  setLook({ pins = true, fade = 1, instant = false } = {}) { this.pinsOn = pins; this.fadeTo = fade; if (instant) this.fade = fade; }

  /** 落到某张活页自己的地球上之前：海陆淡掉（气压带那张活页的地球是均匀的，不画大陆） */
  setPlain(k, color = this.plainColor ?? 0x86b4d4) { this.plainK = k; this.plainColor = color; }

  update(dt, { camera, bookTop = 0, shadowK = 1 }) {
    camera.updateMatrixWorld();
    this.nowU.sunView.value.copy(this.sunLocal).applyQuaternion(this.spin.getWorldQuaternion(new THREE.Quaternion())).transformDirection(camera.matrixWorldInverse); this.nowU.nowK.value = this.nowK;          // 太阳方向换到镜头的坐标里（着色器里的法线是镜头坐标）
    if (this.cloud) { this.cloud.rotation.y += dt * 0.006; this.cloudK += ((this.layer ? 0.15 : this.cloudWant) - this.cloudK) * Math.min(1, dt * 3); this.cloudM.opacity = 0.55 * this.cloudK * this.fade; this.cloud.visible = this.cloudM.opacity > 0.01; }
    const k = Math.min(1, dt * 5);
    this.fade += ((this.fadeTo ?? 1) - this.fade) * Math.min(1, dt * 3.5);
    if (this.target) { this.spin.quaternion.slerp(this.target, Math.min(1, dt * 3.2)); if (this.spin.quaternion.angleTo(this.target) < 0.002) this.target = null; }
    for (const name of ['sun', 'plates', 'belts']) this.layerK[name] += ((this.layer === name ? 1 : 0) - this.layerK[name]) * k;
    this.sunM.uniforms.k.value = this.layerK.sun * this.fade; this.beltM.uniforms.k.value = this.layerK.belts * this.fade;
    for (const ln of this.plateG.children) { ln.material.opacity = this.layerK.plates * 0.95 * this.fade; ln.visible = ln.material.opacity > 0.01; }
    // 落到均匀地球上：盖上一层均匀的海，海陆慢慢淡掉
    this.pk = (this.pk || 0) + ((this.plainK || 0) - (this.pk || 0)) * Math.min(1, dt * 3);
    const pk = this.pk;
    this.plainM.opacity = pk; this.plain.visible = pk > 0.01; if (this.plainColor != null) this.plainM.color.set(this.plainColor);
    const same = (a, b) => a && b && a.it === b.it && (!a.pn || !b.pn || a.pn === b.pn);
    for (const p of this.pins) {
      const hot = same(this.hot, p) || same(this.active, p) || (this.hot && !this.hot.pn && this.hot.it === p.it) || (this.active && !this.active.pn && this.active.it === p.it) || (this.hotBook && p.it.book?.id === this.hotBook);          // hotBook：地理世界里指着一本书，它的旗都亮
      p.hot += ((hot ? 1 : 0) - p.hot) * Math.min(1, dt * 7);
      const face = this.facing(p.n, camera);
      p.label.userData.want = hot && face > 0.15 && !(this.hotBook && !same(this.hot, p)) ? 1 : 0;          // 指着一本书时只亮旗，不把名字都写出来
      p.label.tick(dt);
      p.glow.material.opacity = (0.25 + 0.7 * p.hot) * this.fade * (1 - pk);
      const vis = Math.max(0, Math.min(1, (face - 0.2) / 0.18));          // 转到边上、背面的旗收起来（不在球边上支出一颗珠子）
      p.bead.scale.setScalar((1 + p.hot * 0.6) * vis); p.ring.scale.setScalar((1 + p.hot * 0.6) * vis); p.g.children[0].scale.set(vis, vis, vis);
      p.glow.material.opacity *= vis;
      p.g.visible = pk < 0.5 && this.pinsOn !== false;
      if (p.line) { p.line.material.opacity = p.hot * 0.95 * this.fade; p.line.visible = p.line.material.opacity > 0.01; }
    }
    // 影子：地球离书页越高、越小，影子越淡
    const wp = new THREE.Vector3(); this.root.getWorldPosition(wp);
    const r = this.root.scale.x, gap = wp.y - r - bookTop;
    this.shadow.position.set(wp.x, bookTop + 0.003, wp.z);
    this.shadow.scale.set(r * 2.4, r * 1.9, 1);
    this.shadow.material.opacity = this.root.visible ? shadowK * Math.max(0, Math.min(1, 1.2 - gap / Math.max(0.05, r * 1.4))) * Math.min(1, r / 0.3) : 0;
    this.haloM.uniforms.o.value = this.fade; this.hazeM.uniforms.o.value = this.fade;
  }
}
