// 地球主探索里的那一颗地球（不是活页，是一本地理书打开以后一直在的“世界”）。
// 真实地形的晕渲（和板块那张活页同一张图，落到板块时换过去看不出接缝），一圈淡蓝的大气，北极朝上。
// 课本举的例子发生在哪里，就在哪里插一面小旗（按章着色，名字平时不写，指着才浮出来）；
// 整个地球的事可以叠一层：现在这一刻的昼夜、板块边界、气压带。
// 地球自己的大小是 1（半径），摆在哪、多大由 World 每帧给（root 的位置和缩放）。
import * as THREE from 'three';
import reliefUrl from '../lessons/data/earth_relief.jpg';
import { ll2v } from '../lessons/kit/plates.js';
import { airLabel } from '../lessons/kit/labels.js';
import { canvasTex } from '../lessons/kit/props.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

const D2R = Math.PI / 180;
const V = (lat, lon, r = 1) => new THREE.Vector3(...ll2v(lat, lon)).multiplyScalar(r);

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

export class WorldEarth {
  constructor(stage) {
    this.stage = stage;
    this.root = new THREE.Group();          // 位置和大小（缩放 = 半径）
    this.spin = new THREE.Group();          // 地球自己的朝向
    this.root.add(this.spin);
    this.root.visible = false;
    stage.scene.add(this.root);

    const tex = new THREE.TextureLoader().load(reliefUrl, (t) => this._oceanGloss(t.image));
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    this.mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.78, metalness: 0, emissive: 0x0b1220, emissiveIntensity: 0.25 });
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
    this.haloM = rim(THREE.BackSide, 0.38, 3.0, 'vec3(0.36, 0.58, 0.95)');
    this.hazeM = rim(THREE.FrontSide, 0.5, 2.6, 'vec3(0.62, 0.80, 1.0)');
    const halo = new THREE.Mesh(new THREE.SphereGeometry(1.028, 96, 64), this.haloM), haze = new THREE.Mesh(new THREE.SphereGeometry(1.003, 96, 64), this.hazeM);
    halo.raycast = haze.raycast = () => {};
    this.root.add(halo, haze);

    // 书页上的影子：一块柔和的圆影，跟着地球离书页的高度变淡
    const shTex = canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(40,30,20,0.42)'); gr.addColorStop(0.55, 'rgba(40,30,20,0.16)'); gr.addColorStop(1, 'rgba(40,30,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, opacity: 0 }));
    this.shadow.rotation.x = -Math.PI / 2; this.shadow.renderOrder = 3; this.shadow.raycast = () => {};
    stage.scene.add(this.shadow);

    this.pins = []; this.layer = null; this.layerK = { sun: 0, plates: 0, belts: 0 }; this.hot = null; this.active = null; this.target = null; this.fade = 1;
    this._layers();
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

  hitPin(rc) { if (!this.root.visible) return null; const h = rc.intersectObjects(this.pins.map((p) => p.pick), false)[0]; return h ? h.object.userData.pin : null; }
  hitGlobe(rc) { return this.root.visible && rc.intersectObject(this.globe, false).length > 0; }

  /** 旗要不要、大气光多亮（0—1）：落到活页里的那颗地球上时都收掉 */
  setLook({ pins = true, fade = 1, instant = false } = {}) { this.pinsOn = pins; this.fadeTo = fade; if (instant) this.fade = fade; }

  /** 落到某张活页自己的地球上之前：海陆淡掉（气压带那张活页的地球是均匀的，不画大陆） */
  setPlain(k, color = this.plainColor ?? 0x86b4d4) { this.plainK = k; this.plainColor = color; }

  update(dt, { camera, bookTop = 0, shadowK = 1 }) {
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
      const hot = same(this.hot, p) || same(this.active, p) || (this.hot && !this.hot.pn && this.hot.it === p.it) || (this.active && !this.active.pn && this.active.it === p.it);
      p.hot += ((hot ? 1 : 0) - p.hot) * Math.min(1, dt * 7);
      const face = this.facing(p.n, camera);
      p.label.userData.want = hot && face > 0.15 ? 1 : 0;
      p.label.tick(dt);
      p.glow.material.opacity = (0.25 + 0.7 * p.hot) * this.fade * (1 - pk);
      p.bead.scale.setScalar(1 + p.hot * 0.6); p.ring.scale.setScalar(1 + p.hot * 0.6);
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
