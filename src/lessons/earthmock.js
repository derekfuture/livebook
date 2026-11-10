// 静态样子（给作者定方向用，不进主线）：高中 选择性必修 1 第一章第二节“地球运动的地理意义”。
// 书页 = 黄道面：书页正中一盏灯（太阳），纸上画公转轨道和二十四节气；地球停在夏至，地轴和纸面的垂线差 23°26′，
// 指向不变（春分、秋分、冬至三个位置留着淡淡的影子，地轴互相平行）。
// window.__mock = { style: 'A'（纸工线稿）| 'B'（写实光照）, view: 'space'（从太空看）| 'ground'（站在北京的书页上）}
import * as THREE from 'three';
import { textPlate, canvasTex, glowTexture } from './kit/props.js';
import { paint, inked, hull, polyline } from '../live/ink.js';

const D2R = Math.PI / 180, EPS = (23 + 26 / 60) * D2R;
const PAGE_W = 0.3, PAGE_H = PAGE_W * 1871 / 1323;
const RORB = 0.112, HC = 0.045, R = 0.026, RS = 0.013;
const AXIS = new THREE.Vector3(Math.sin(EPS), Math.cos(EPS), 0);            // 地轴：北端歪向右边（+x），和纸面垂线差 23°26′
const TERMS = ['春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒', '立春', '雨水', '惊蛰'];
// 太阳黄经 λ（春分 0°）时地球的位置：从上往下看逆时针；夏至在左、冬至在右、春分在后、秋分在前
const posOf = (lamDeg) => { const l = lamDeg * D2R; return new THREE.Vector3(-Math.sin(l) * RORB, HC, -Math.cos(l) * RORB); };
const BJ = { lat: 39.9, lon: 116.4 };
const LIGHTS = [];          // 每个地球的阳光方向（活页局部坐标）；着色器里法线是世界坐标，每帧换算过去

export default {
  id: 'earthmock',
  fig: '样子',
  title: '地球运动的地理意义（静态样子）',
  style: 'paper',
  predict: { q: '夏至这天，北京正午的太阳在头顶的哪一边、多高？', hint: '课本第 12 页', options: ['正南，很高', '正北，很高', '正头顶'], answer: 0 },
  conclusion: { quote: '（样子，暂无）', why: '', src: '课本 选择性必修1 第 7–15 页' },

  create() {
    const M = window.__mock || { style: 'A', view: 'space' }; LIGHTS.length = 0;
    const A = M.style !== 'B';
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    const pageTex = new THREE.TextureLoader().load('/mock/xb1-p7.jpg'); pageTex.colorSpace = THREE.SRGBColorSpace; pageTex.anisotropy = 8;
    if (M.style === 'F') buildYard2(group); else if (M.style === 'E') buildYard(group); else if (M.style === 'D') { if (M.view === 'ground') buildSky(group, pageTex); else buildDual(group, pageTex); } else if (M.style === 'C') buildPopup(group, pageTex); else if (M.view === 'ground') buildGround(group, pageTex, A); else buildSpace(group, pageTex, A);
    return {
      group: root,
      card: false,
      size: { w: 0.32, d: 0.3, h: 0.12 },
      view: { elev: 30, azim: -8, lookY: 0.4, frameMargin: 1.0 },
      mount(ui) { ui.status(''); },
      update() { root.updateMatrixWorld(); for (const L of LIGHTS) L.u.value.copy(L.d).transformDirection(root.matrixWorld); },
    };
  },
};


// 标签：画布按文字的实际宽度开，字不会被截掉。hw = 字高（米）
function lab(text, hw, { color = '#23293a', bg = 'rgba(255,252,244,0.94)', font = '"PingFang SC", "Hiragino Sans GB", "Songti SC", sans-serif', weight = 'bold' } = {}) {
  const c = document.createElement('canvas'), g = c.getContext('2d'), F = 84, pad = 22;
  g.font = `${weight} ${F}px ${font}`; const tw = Math.ceil(g.measureText(text).width);
  c.width = tw + pad * 2; c.height = F + pad * 1.4;
  const g2 = c.getContext('2d'); if (bg) { g2.fillStyle = bg; g2.fillRect(0, 0, c.width, c.height); }
  g2.font = `${weight} ${F}px ${font}`; g2.fillStyle = color; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText(text, c.width / 2, c.height / 2 + 3);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const H = hw * (c.height / F), W = H * (c.width / c.height);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  m.renderOrder = 20; m.raycast = () => {};
  return m;
}

// ---------------------------------------------------------------- 从太空看
function buildSpace(group, pageTex, A) {
  // 书页（平放）：这一页就是公转轨道面
  const page = new THREE.Mesh(new THREE.PlaneGeometry(PAGE_W, PAGE_H), new THREE.MeshBasicMaterial({ map: pageTex, color: A ? 0xf6f2e6 : 0xece7da, toneMapped: false }));
  page.rotation.x = -Math.PI / 2; page.position.y = 0.0006; group.add(page);
  const leftTex = new THREE.TextureLoader().load('/mock/xb1-p6.jpg'); leftTex.colorSpace = THREE.SRGBColorSpace; leftTex.anisotropy = 8;
  const left = new THREE.Mesh(new THREE.PlaneGeometry(PAGE_W, PAGE_H), new THREE.MeshBasicMaterial({ map: leftTex, color: A ? 0xf3efe3 : 0xe9e4d6, toneMapped: false }));
  left.rotation.x = -Math.PI / 2; left.position.set(-PAGE_W, 0.0006, 0); group.add(left);
  const gutTex = canvasTex(256, 8, (g, W, H) => { const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, 'rgba(60,50,35,0)'); gr.addColorStop(0.5, 'rgba(60,50,35,0.28)'); gr.addColorStop(1, 'rgba(60,50,35,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); });
  const gut = new THREE.Mesh(new THREE.PlaneGeometry(0.04, PAGE_H), new THREE.MeshBasicMaterial({ map: gutTex, transparent: true, depthWrite: false, toneMapped: false }));
  gut.rotation.x = -Math.PI / 2; gut.position.set(-PAGE_W / 2, 0.0011, 0); group.add(gut);
  const wash = new THREE.Mesh(new THREE.PlaneGeometry(PAGE_W, PAGE_H), new THREE.MeshBasicMaterial({ color: 0xfbf8f0, transparent: true, opacity: A ? 0.66 : 0.58, depthWrite: false, toneMapped: false }));
  wash.rotation.x = -Math.PI / 2; wash.position.y = 0.0009; group.add(wash);
  // 灯下的一圈暖光
  const poolTex = canvasTex(256, 256, (g, W) => { const gr = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); gr.addColorStop(0, 'rgba(255,214,140,0.55)'); gr.addColorStop(0.45, 'rgba(255,214,140,0.18)'); gr.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, W); });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, toneMapped: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.0012; group.add(pool);

  // 纸上的公转轨道、二十四节气的刻度和名字、方向箭头
  const ring = []; for (let i = 0; i <= 144; i++) { const a = (i / 144) * Math.PI * 2; ring.push(new THREE.Vector3(Math.cos(a) * RORB, 0.0016, Math.sin(a) * RORB)); }
  group.add(polyline(ring, { width: A ? 1.8 : 1.4, color: A ? 0x3a3f4e : 0x6b6f7a }));
  TERMS.forEach((name, k) => {
    const lam = k * 15, p = posOf(lam).setY(0.0016), out = p.clone().setY(0).normalize();
    const major = k % 6 === 0, named = k % 3 === 0;
    group.add(polyline([p.clone().addScaledVector(out, -0.004), p.clone().addScaledVector(out, major ? 0.009 : 0.005)], { width: major ? 2.2 : 1.3, color: 0x3a3f4e }));
    if (!named) return;
    const t = lab(name, major ? 0.0085 : 0.006, { color: major ? '#23293a' : '#5a6070', bg: null, font: '"Songti SC", serif' });
    t.rotation.x = -Math.PI / 2; t.position.copy(p.clone().addScaledVector(out, major ? 0.024 : 0.017)).setY(0.0018); group.add(t);
  });
  for (const lam of [45, 135, 225, 315]) {          // 逆时针的小箭头
    const p = posOf(lam).setY(0.0016), t = posOf(lam + 4).setY(0.0016).sub(p).normalize(), n = p.clone().setY(0).normalize();
    const tip = p.clone().addScaledVector(t, 0.006);
    group.add(polyline([tip.clone().addScaledVector(t, -0.006).addScaledVector(n, 0.0035), tip, tip.clone().addScaledVector(t, -0.006).addScaledVector(n, -0.0035)], { width: 1.6, color: 0x3a3f4e }));
  }

  // 太阳：一盏暖色的灯
  const sunTex = canvasTex(256, 256, (g, W) => { const gr = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); gr.addColorStop(0, 'rgba(255,255,244,1)'); gr.addColorStop(0.42, 'rgba(255,236,170,1)'); gr.addColorStop(0.7, 'rgba(255,190,90,0.95)'); gr.addColorStop(0.86, 'rgba(255,160,70,0.35)'); gr.addColorStop(1, 'rgba(255,160,70,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, W); });
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, depthWrite: false, toneMapped: false })); sun.scale.setScalar(RS * 2.6);
  sun.position.set(0, HC, 0); group.add(sun);
  const haloTex = canvasTex(256, 256, (g, W) => { const gr = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); gr.addColorStop(0, 'rgba(255,236,170,0.95)'); gr.addColorStop(0.18, 'rgba(255,200,95,0.55)'); gr.addColorStop(0.5, 'rgba(255,180,80,0.16)'); gr.addColorStop(1, 'rgba(255,180,80,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, W); });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent: true, depthWrite: false, toneMapped: false })); halo.scale.setScalar(0.11); halo.position.copy(sun.position); group.add(halo);

  // 地球（夏至）和三个位置的影子
  const globeTex = makeGlobeTex(A);
  const earth = makeEarth(globeTex, A, 1, true); earth.place(90); group.add(earth.g);
  for (const lam of [0, 270]) { const gh = makeEarth(globeTex, A, 0.22, false); gh.place(lam); group.add(gh.g); }

  // 地轴和纸面垂线的夹角 23°26′（画在夏至的地球旁边）
  const c = posOf(90), top = c.clone().addScaledVector(AXIS, R * 1.75), up = c.clone().add(new THREE.Vector3(0, R * 1.75, 0));
  group.add(polyline([c, up], { width: 1.2, color: 0x7a7f8c, dashed: true, dash: 0.003, gap: 0.0025 }));
  const arc = []; for (let i = 0; i <= 16; i++) { const t = (i / 16) * EPS; arc.push(c.clone().add(new THREE.Vector3(Math.sin(t), Math.cos(t), 0).multiplyScalar(R * 1.45))); }
  group.add(polyline(arc, { width: 1.6, color: 0xc8462e }));
  const angLab = lab('23°26′', 0.0055, { color: '#c8462e', font: '"Times New Roman", serif' });
  angLab.position.copy(c.clone().add(new THREE.Vector3(0.006, R * 1.95, 0))); group.add(angLab);
  void top;

  const tagLab = (text, p, hw = 0.0058) => { const t = lab(text, hw); t.position.copy(p); group.add(t); return t; };
  tagLab('太阳直射北回归线', c.clone().add(new THREE.Vector3(R * 1.55, R * 0.42, R * 0.7)));
  tagLab('太阳', new THREE.Vector3(0, HC + RS + 0.012, 0));
}

// 地球：纸本线稿（A）/ 写实光照（B）。full = 夏至那个（带直射点、晨昏线、北京的小旗）
function makeEarth(tex, A, alpha, full) {
  const g = new THREE.Group();
  const tilt = new THREE.Group(); tilt.rotation.z = -EPS; g.add(tilt);          // 本地 y 轴 = 地轴
  const spin = new THREE.Group(); tilt.add(spin);
  const uL = { value: new THREE.Vector3(1, 0, 0) };
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, uL, uA: { value: alpha } },
    transparent: alpha < 1, depthWrite: alpha >= 1,
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vW; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: A
      ? `uniform sampler2D map; uniform vec3 uL; uniform float uA; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
        void main(){
          vec3 base = texture2D(map, vUv).rgb; vec3 n = normalize(vN);
          float d = dot(n, uL), day = smoothstep(-0.02, 0.02, d);
          vec3 lit = base * (0.86 + 0.18 * max(d, 0.0));
          // 夜半球：铅笔排线
          float hatch = step(0.55, fract((gl_FragCoord.x + gl_FragCoord.y) / 7.0));
          vec3 night = base * mix(0.66, 0.38, hatch) * vec3(0.84, 0.88, 1.0);
          gl_FragColor = vec4(mix(night, lit, day), uA);
          #include <colorspace_fragment>
        }`
      : `uniform sampler2D map; uniform vec3 uL; uniform float uA; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
        void main(){
          vec3 base = texture2D(map, vUv).rgb; vec3 n = normalize(vN);
          float d = dot(n, uL), day = smoothstep(-0.07, 0.09, d);
          vec3 lit = base * (0.32 + 0.95 * max(d, 0.0)) * vec3(1.0, 0.97, 0.9);
          vec3 night = base * vec3(0.07, 0.085, 0.14);
          vec3 c = mix(night, lit, day);
          c += vec3(1.0, 0.55, 0.25) * 0.16 * exp(-pow(d / 0.06, 2.0));            // 晨昏线附近一圈暖色
          gl_FragColor = vec4(c, uA);
          #include <colorspace_fragment>
        }`,
  });
  const ball = A && full ? hull(new THREE.Mesh(new THREE.SphereGeometry(R, 72, 48), mat), 0.0006) : new THREE.Mesh(new THREE.SphereGeometry(R, 72, 48), mat); spin.add(ball);
  // 地轴：一根细杆穿过两极
  const axis = new THREE.Mesh(new THREE.CylinderGeometry(0.0007, 0.0007, R * 2.9, 8), paint(0x3a3f4e, { keep: true, transparent: alpha < 1, opacity: alpha < 1 ? 0.55 : 1 }));
  tilt.add(axis);
  if (!A && full) {          // 大气：一圈很薄的蓝色辉光
    const atm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 48, 32), new THREE.ShaderMaterial({
      uniforms: { uL }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'uniform vec3 uL; varying vec3 vN; varying vec3 vV; void main(){ float rim = pow(1.0 - abs(dot(vN, vV)), 3.0); float day = smoothstep(-0.25, 0.35, dot(-vN, uL) * -1.0); gl_FragColor = vec4(vec3(0.45, 0.68, 1.0) * rim * (0.25 + 0.9 * day), rim * 0.9); }',
    }));
    g.add(atm);
  }
  const api = {
    g,
    place(lam) {
      const p = posOf(lam); g.position.copy(p);
      const s = p.clone().negate().setY(0).normalize();          // 从地球指向太阳
      uL.value.copy(s); LIGHTS.push({ u: uL, d: s.clone() });
      if (!full) return;
      // 北京转到正对太阳（当地正午）
      const sLocal = s.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), EPS);          // 去掉地轴倾斜
      const lamS = Math.atan2(-sLocal.z, sLocal.x);
      spin.rotation.y = lamS - BJ.lon * D2R;
      const dec = Math.asin(s.dot(AXIS));
      // 直射点
      const ssp = new THREE.Mesh(new THREE.SphereGeometry(R * 0.075, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff1b8, toneMapped: false }));
      ssp.position.copy(s.clone().multiplyScalar(R * 1.004)); g.add(ssp);
      const sspGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffd27a, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      sspGlow.scale.setScalar(R * 0.55); sspGlow.position.copy(ssp.position); g.add(sspGlow);
      // 晨昏线：和阳光垂直的大圆
      const u = new THREE.Vector3().crossVectors(s, new THREE.Vector3(0, 1, 0)).normalize(), v = new THREE.Vector3().crossVectors(u, s).normalize();
      const pts = []; for (let i = 0; i <= 128; i++) { const a = (i / 128) * Math.PI * 2; pts.push(u.clone().multiplyScalar(Math.cos(a)).add(v.clone().multiplyScalar(Math.sin(a))).multiplyScalar(R * 1.006)); }
      const term = polyline(pts, { width: A ? 2.4 : 1.8, color: 0x2a4f8f }); g.add(term);
      // 北京的小旗
      const lat = BJ.lat * D2R, lon = BJ.lon * D2R;
      const local = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon));
      const flag = new THREE.Group(); spin.add(flag);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.00035, 0.00035, R * 0.42, 6), paint(0x3a3f4e, { keep: true })); pole.position.y = R * 0.21;
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(R * 0.22, R * 0.14), new THREE.MeshBasicMaterial({ color: 0xd8432e, side: THREE.DoubleSide, toneMapped: false })); cloth.position.set(R * 0.11, R * 0.35, 0);
      flag.add(pole, cloth); flag.position.copy(local.clone().multiplyScalar(R)); flag.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), local);
      void dec;
    },
  };
  return api;
}

// 地球仪的贴图：经纬网、赤道、回归线（红虚线）、极圈（蓝虚线）。不画大陆。
function makeGlobeTex(A) {
  return canvasTex(2048, 1024, (g, W, H) => {
    if (A) { g.fillStyle = '#f5f0e2'; g.fillRect(0, 0, W, H); }
    else { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#dfeaf2'); gr.addColorStop(0.5, '#7fb2dc'); gr.addColorStop(1, '#dfeaf2'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
    const y = (lat) => (0.5 - lat / 180) * H;
    g.strokeStyle = A ? 'rgba(58,63,78,0.28)' : 'rgba(255,255,255,0.35)'; g.lineWidth = 2;
    for (let lat = -75; lat <= 75; lat += 15) { g.beginPath(); g.moveTo(0, y(lat)); g.lineTo(W, y(lat)); g.stroke(); }
    for (let lon = 0; lon < 360; lon += 15) { const x = (lon / 360) * W; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    g.strokeStyle = A ? '#3a3f4e' : '#ffffff'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, y(0)); g.lineTo(W, y(0)); g.stroke();          // 赤道
    const trop = 23 + 26 / 60, pol = 90 - trop;
    g.lineWidth = 6;
    g.strokeStyle = '#c8462e'; g.setLineDash([28, 16]); for (const lat of [trop, -trop]) { g.beginPath(); g.moveTo(0, y(lat)); g.lineTo(W, y(lat)); g.stroke(); }
    g.strokeStyle = '#3f74b0'; for (const lat of [pol, -pol]) { const k = 1 / Math.cos(lat * D2R); g.setLineDash([28 * k, 16 * k]); g.beginPath(); g.moveTo(0, y(lat)); g.lineTo(W, y(lat)); g.stroke(); }
    g.setLineDash([]);
  });
}

// ---------------------------------------------------------------- 站在北京的书页上：夏至正午，立竿见影
const FACE = Math.atan2(0.55, 0.9);          // 地面视角的镜头方向（从东南看过来）
function buildGround(group, pageTex, A) {
  // 书页就是地面（页面上方是北：−z 是北，+x 是东）
  const gnd = new THREE.Mesh(new THREE.CircleGeometry(0.13, 96), new THREE.MeshBasicMaterial({ map: pageTex, color: A ? 0xf6f2e6 : 0xf0ead8, toneMapped: false }));
  gnd.rotation.x = -Math.PI / 2; group.add(gnd);
  const gw = new THREE.Mesh(new THREE.CircleGeometry(0.13, 96), new THREE.MeshBasicMaterial({ color: 0xfbf8f0, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false })); gw.rotation.x = -Math.PI / 2; gw.position.y = 0.0004; group.add(gw);
  const uvs = gnd.geometry.attributes.uv; for (let i = 0; i < uvs.count; i++) uvs.setXY(i, 0.04 + uvs.getX(i) * 0.92, 0.25 + uvs.getY(i) * 0.92 * (1323 / 1871)); uvs.needsUpdate = true;
  const lat = BJ.lat * D2R, dec = EPS;
  const sunDir = (H) => {          // 时角 H（弧度，正午 0）→ 太阳方向（东 +x，北 −z）
    const alt = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H));
    const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat));          // 从正南量起，向西为正
    return new THREE.Vector3(-Math.sin(az) * Math.cos(alt), Math.sin(alt), Math.cos(az) * Math.cos(alt));          // 南 = +z
  };
  const H0 = Math.acos(-Math.tan(lat) * Math.tan(dec));
  const RD = 0.11, path = [];
  for (let i = 0; i <= 96; i++) { const H = -H0 + (i / 96) * 2 * H0; path.push(sunDir(H).multiplyScalar(RD)); }
  group.add(polyline(path, { width: 2, color: 0xe08a2a, dashed: true, dash: 0.006, gap: 0.004 }));
  const noon = sunDir(0), alt = Math.asin(noon.y);
  const sunTex = canvasTex(256, 256, (g, W) => { const gr = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); gr.addColorStop(0, 'rgba(255,255,244,1)'); gr.addColorStop(0.42, 'rgba(255,236,170,1)'); gr.addColorStop(0.7, 'rgba(255,190,90,0.95)'); gr.addColorStop(0.86, 'rgba(255,160,70,0.35)'); gr.addColorStop(1, 'rgba(255,160,70,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, W); });
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, depthWrite: false, toneMapped: false })); sun.scale.setScalar(0.024);
  sun.position.copy(noon.clone().multiplyScalar(RD)); group.add(sun);
  for (const [s, o] of [[0.05, 0.7], [0.12, 0.25]]) { const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffc35a, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); gl.scale.setScalar(s); gl.position.copy(sun.position); group.add(gl); }
  // 竿和它的影子
  const HG = 0.05;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, HG, 12), paint(A ? 0x6b4a2e : 0x7a5638, { keep: true })); rod.position.y = HG / 2; group.add(rod);
  if (A) inked(rod, { width: 1.2 });
  const L = HG / Math.tan(alt);
  const shTex = canvasTex(64, 256, (g, W, Hh) => { const gr = g.createLinearGradient(0, Hh, 0, 0); gr.addColorStop(0, 'rgba(35,38,52,0.55)'); gr.addColorStop(1, 'rgba(35,38,52,0.3)'); g.fillStyle = gr; g.fillRect(0, 0, W, Hh); });
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.0042, L), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, toneMapped: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.set(0, 0.0008, -L / 2); group.add(sh);          // 正午影子朝正北（−z）
  // 阳光：从太阳经过竿顶落到影子头上；影子头上标太阳高度
  const tip = new THREE.Vector3(0, 0.001, -L), topP = new THREE.Vector3(0, HG, 0);
  group.add(polyline([sun.position.clone(), topP, tip], { width: 1.4, color: 0xe08a2a }));
  const arcR = 0.016, arc = [];
  for (let i = 0; i <= 20; i++) { const t = (i / 20) * alt; arc.push(tip.clone().add(new THREE.Vector3(0, Math.sin(t) * arcR, Math.cos(t) * arcR))); }
  group.add(polyline(arc, { width: 2, color: 0xc8462e }));
  const am = lab('正午太阳高度 73°26′', 0.0052, { color: '#c8462e' });
  am.rotation.y = FACE; am.position.copy(tip.clone().add(new THREE.Vector3(0.02, 0.006, -0.022))); group.add(am);
  // 东南西北
  for (const [t, x, z] of [['北', 0, -0.118], ['南', 0, 0.118], ['东', 0.118, 0], ['西', -0.118, 0]]) {
    const l = lab(t, 0.008, { font: '"Songti SC", serif' }); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.0012, z); group.add(l);
  }
  const title = lab('北京 · 夏至 · 正午：影子最短，指向正北', 0.0058);
  title.rotation.y = FACE; title.position.set(-0.02, 0.118, -0.045); if (!window.__noTitle) group.add(title);
}

// ---------------------------------------------------------------- 第三稿：立在书上（房间调暗，模型抬高、放大，和书页分开）
function buildPopup(group, pageTex) {
  const HO = 0.11, RO = 0.15, RE = 0.042, RSUN = 0.026;          // 轨道面离纸面的高度、轨道半径、地球半径、太阳半径
  const pos = (lamDeg) => { const l = lamDeg * D2R; return new THREE.Vector3(-Math.sin(l) * RO, HO, -Math.cos(l) * RO); };
  // 书页：受光的纸（灯下亮、四周暗）
  for (const [tex, x] of [[pageTex, 0], [null, -PAGE_W]]) {
    const m = new THREE.MeshLambertMaterial({ color: 0xf2ece0 }); if (tex) m.map = tex; else { const lt = new THREE.TextureLoader().load('/mock/xb1-p6.jpg'); lt.colorSpace = THREE.SRGBColorSpace; m.map = lt; }
    const pg = new THREE.Mesh(new THREE.PlaneGeometry(PAGE_W, PAGE_H), m); pg.rotation.x = -Math.PI / 2; pg.position.set(x, 0.0006, 0.06); group.add(pg);
  }
  const lamp = new THREE.PointLight(0xffd59a, 2.2, 0, 1.4); lamp.position.set(0, HO, 0); group.add(lamp);
  // 轨道：浮在书页上方的一圈细光环；纸上留它的淡影
  const ring = []; for (let i = 0; i <= 180; i++) { const a = (i / 180) * Math.PI * 2; ring.push(new THREE.Vector3(Math.cos(a) * RO, HO, Math.sin(a) * RO)); }
  group.add(polyline(ring, { width: 2.2, color: 0xffd9a0 }));
  const shadowRing = ring.map((p) => p.clone().setY(0.0014));
  group.add(polyline(shadowRing, { width: 1.4, color: 0x8a7a62, opacity: 0.35 }));
  TERMS.forEach((name, k) => {
    if (k % 6) return;
    const p = pos(k * 15), out = p.clone().setY(0).normalize();
    const t = lab(name, k === 12 ? 0.006 : 0.0085, { color: '#fff3dc', bg: 'rgba(30,32,44,0.55)' }); t.position.copy(p.clone().addScaledVector(out, 0.03).add(new THREE.Vector3(0, -0.012, 0))); group.add(t);
  });
  // 太阳：发光的球和大光晕
  const sunTex = canvasTex(256, 256, (g, W) => { const gr = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); gr.addColorStop(0, 'rgba(255,255,246,1)'); gr.addColorStop(0.38, 'rgba(255,238,180,1)'); gr.addColorStop(0.62, 'rgba(255,196,96,0.95)'); gr.addColorStop(0.8, 'rgba(255,150,60,0.4)'); gr.addColorStop(1, 'rgba(255,140,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, W); });
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, depthWrite: false, toneMapped: false })); sun.scale.setScalar(RSUN * 2.8); sun.position.set(0, HO, 0); group.add(sun);
  const haloTex = canvasTex(256, 256, (g, W) => { const gr = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); gr.addColorStop(0, 'rgba(255,210,120,0.55)'); gr.addColorStop(0.35, 'rgba(255,190,100,0.18)'); gr.addColorStop(1, 'rgba(255,190,100,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, W); });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); halo.scale.setScalar(0.3); halo.position.copy(sun.position); group.add(halo);
  // 地球（夏至，大）和冬至的影子
  const tex = makeGlobeTex(false);
  const big = makeEarthAt(tex, RE, 1, true); big.place(pos(90), new THREE.Vector3(1, 0, 0)); group.add(big.g);
  const gh = makeEarthAt(tex, RE * 0.9, 0.18, false); gh.place(pos(270), new THREE.Vector3(-1, 0, 0)); group.add(gh.g);
  // 纸上的投影：地球在书页上的淡影，告诉你它悬在书上方
  const blobTex = canvasTex(128, 128, (g, W) => { const gr = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); gr.addColorStop(0, 'rgba(40,34,28,0.38)'); gr.addColorStop(1, 'rgba(40,34,28,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, W); });
  for (const [p, r] of [[pos(90), RE * 2.6], [pos(270), RE * 2.2], [new THREE.Vector3(0, 0, 0), RSUN * 3]]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(r, r), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })); b.rotation.x = -Math.PI / 2; b.position.set(p.x, 0.0016, p.z); group.add(b); }
  // 标注：少而大
  const c = pos(90);
  const t1 = lab('夏至 · 太阳直射北回归线', 0.0075, { color: '#fff3dc', bg: 'rgba(30,32,44,0.6)' }); t1.position.copy(c.clone().add(new THREE.Vector3(0.012, RE * 1.55, 0.02))); group.add(t1);
  const t2 = lab('地轴偏 23°26′，一年里指向不变', 0.0062, { color: '#ffd2a8', bg: 'rgba(30,32,44,0.6)' }); t2.position.copy(pos(270).add(new THREE.Vector3(-0.03, -RE * 1.5, 0))); group.add(t2);
}

function makeEarthAt(tex, RR, alpha, full) {
  const g = new THREE.Group();
  const tilt = new THREE.Group(); tilt.rotation.z = -EPS; g.add(tilt);
  const spin = new THREE.Group(); tilt.add(spin);
  const uL = { value: new THREE.Vector3(1, 0, 0) };
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, uL, uA: { value: alpha } }, transparent: alpha < 1, depthWrite: alpha >= 1,
    vertexShader: 'varying vec2 vUv; varying vec3 vN; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D map; uniform vec3 uL; uniform float uA; varying vec2 vUv; varying vec3 vN;
      void main(){ vec3 base = texture2D(map, vUv).rgb; vec3 n = normalize(vN); float d = dot(n, uL), day = smoothstep(-0.08, 0.1, d);
        vec3 lit = base * (0.28 + 1.05 * max(d, 0.0)) * vec3(1.0, 0.96, 0.88); vec3 night = base * vec3(0.05, 0.065, 0.12);
        vec3 c = mix(night, lit, day) + vec3(1.0, 0.5, 0.2) * 0.22 * exp(-pow(d / 0.07, 2.0));
        gl_FragColor = vec4(c, uA);
        #include <colorspace_fragment>
      }`,
  });
  spin.add(new THREE.Mesh(new THREE.SphereGeometry(RR, 96, 64), mat));
  const axis = new THREE.Mesh(new THREE.CylinderGeometry(RR * 0.03, RR * 0.03, RR * 2.8, 10), new THREE.MeshBasicMaterial({ color: 0xe8e2d4, transparent: alpha < 1, opacity: alpha < 1 ? 0.5 : 1 }));
  tilt.add(axis);
  if (full) {
    const atm = new THREE.Mesh(new THREE.SphereGeometry(RR * 1.07, 64, 40), new THREE.ShaderMaterial({
      uniforms: { uL }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'uniform vec3 uL; varying vec3 vN; varying vec3 vV; void main(){ float rim = pow(1.0 - abs(dot(vN, vV)), 2.5); float day = smoothstep(-0.25, 0.45, dot(vN, uL)); gl_FragColor = vec4(vec3(0.42, 0.66, 1.0) * rim * (0.08 + 1.2 * day), rim); }',
    }));
    g.add(atm);
  }
  return {
    g,
    place(p, s, ax) {
      g.position.copy(p); uL.value.copy(s); LIGHTS.push({ u: uL, d: s.clone() });
      if (!full) return;
      if (!ax) { const sLocal = s.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), EPS); spin.rotation.y = Math.atan2(-sLocal.z, sLocal.x) - BJ.lon * D2R; }
      const u = new THREE.Vector3().crossVectors(s, new THREE.Vector3(0, 1, 0)).normalize(), v = new THREE.Vector3().crossVectors(u, s).normalize(), pts = [];
      for (let i = 0; i <= 160; i++) { const a = (i / 160) * Math.PI * 2; pts.push(u.clone().multiplyScalar(Math.cos(a)).add(v.clone().multiplyScalar(Math.sin(a))).multiplyScalar(RR * 1.004)); }
      g.add(polyline(pts, { width: 2.2, color: 0x6fa0ff, opacity: 0.9 }));
      const ssp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xfff0b0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); ssp.scale.setScalar(RR * 0.45); ssp.position.copy(s.clone().multiplyScalar(RR * 1.01)); g.add(ssp);
    },
  };
}

// ---------------------------------------------------------------- 第四稿：双主角（左：大地球 + 一束看得见的阳光 + 日历环；右：北京的天空；下：书页上的曲线）
function buildDual(group, pageTex) {
  const EC = new THREE.Vector3(-0.075, 0.12, 0), RE = 0.068, RR = 0.155;          // 地球中心、半径；日历环半径（环在黄道面上，绕着地球）
  // 地球不动，太阳沿着日历环走一年（以地球为参照的太阳周年运动）。夏至：太阳在环上左前方
  const lamSun = 90, sunAng = 135 * D2R;
  const sDir = new THREE.Vector3(Math.cos(sunAng), 0, Math.sin(sunAng)).multiplyScalar(-1).negate();          // 从地球指向太阳（左前方）
  sDir.set(-Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4));
  const axis = sDir.clone().multiplyScalar(Math.sin(EPS)).add(new THREE.Vector3(0, Math.cos(EPS), 0)).normalize();          // 夏至：北极一端歪向太阳
  // 书页（受光）
  for (const [file, x] of [['/mock/xb1-p6.jpg', -PAGE_W], ['/mock/xb1-p7.jpg', 0]]) {
    const t = new THREE.TextureLoader().load(file); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const pg = new THREE.Mesh(new THREE.PlaneGeometry(PAGE_W, PAGE_H), new THREE.MeshLambertMaterial({ color: 0xf0eadc, map: t })); pg.rotation.x = -Math.PI / 2; pg.position.set(x + 0.02, 0.0006, 0.1); group.add(pg);
  }
  const key = new THREE.PointLight(0xffe0b0, 1.6, 0, 1.2); key.position.copy(EC.clone().addScaledVector(sDir, 0.25).setY(0.2)); group.add(key);
  // 书页上的曲线：北京一年里的正午太阳高度（课本图 1.17 那样的曲线，由公式算出）
  const chart = canvasTex(1400, 520, (g, W, H) => {
    g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(253,250,242,0.92)'; g.fillRect(0, 0, W, H);
    const X = (d) => 110 + (d / 365) * (W - 160), Y = (a) => H - 70 - (a / 90) * (H - 140);
    g.strokeStyle = '#3a3f4e'; g.lineWidth = 3; g.beginPath(); g.moveTo(X(0), Y(90)); g.lineTo(X(0), Y(0)); g.lineTo(X(365), Y(0)); g.stroke();
    g.font = 'bold 34px "Songti SC", serif'; g.fillStyle = '#3a3f4e'; g.fillText('北京一年里的正午太阳高度', 120, 52);
    g.font = '26px "Songti SC", serif'; for (const a of [30, 60, 90]) { g.fillText(a + '°', 40, Y(a) + 9); g.strokeStyle = 'rgba(58,63,78,0.18)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X(0), Y(a)); g.lineTo(X(365), Y(a)); g.stroke(); }
    const months = ['1月', '3月', '5月', '7月', '9月', '11月']; months.forEach((m, i) => g.fillText(m, X(i * 61) - 10, H - 30));
    g.strokeStyle = '#c8462e'; g.lineWidth = 5; g.beginPath();
    for (let d = 0; d <= 365; d += 2) { const dec = 23.44 * Math.sin(((d - 80) / 365) * 2 * Math.PI); const a = 90 - Math.abs(39.9 - dec); d ? g.lineTo(X(d), Y(a)) : g.moveTo(X(d), Y(a)); }
    g.stroke();
    const dS = 172, aS = 90 - Math.abs(39.9 - 23.44); g.fillStyle = '#c8462e'; g.beginPath(); g.arc(X(dS), Y(aS), 12, 0, Math.PI * 2); g.fill();
    g.font = 'bold 30px "PingFang SC", sans-serif'; g.fillText('夏至 73°26′', X(dS) - 70, Y(aS) - 26);
    const dW = 355, aW = 90 - Math.abs(39.9 + 23.44); g.fillStyle = '#3f74b0'; g.beginPath(); g.arc(X(dW), Y(aW), 9, 0, Math.PI * 2); g.fill(); g.fillText('冬至 26°34′', X(dW) - 150, Y(aW) - 18);
  });
  const ch = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.0706), new THREE.MeshLambertMaterial({ map: chart, transparent: true })); ch.rotation.x = -Math.PI / 2; ch.position.set(0.04, 0.0012, 0.105); group.add(ch);
  // 日历环：绕着地球、在黄道面上的一圈，二十四节气刻度；太阳在环上走
  const ring = []; for (let i = 0; i <= 200; i++) { const a = (i / 200) * Math.PI * 2; ring.push(EC.clone().add(new THREE.Vector3(Math.cos(a) * RR, 0, Math.sin(a) * RR))); }
  group.add(polyline(ring, { width: 2, color: 0xf2d6a2, opacity: 0.85 }));
  TERMS.forEach((name, k) => {
    const a = sunAng + ((k * 15 - lamSun) * D2R) * -1;          // 太阳黄经每多 15°，在环上往前走一格
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), p = EC.clone().addScaledVector(dir, RR);
    group.add(polyline([p.clone().addScaledVector(dir, -0.004), p.clone().addScaledVector(dir, k % 6 ? 0.005 : 0.01)], { width: k % 6 ? 1.4 : 2.4, color: 0xf2d6a2 }));
    if (k % 6 === 0) { const t = lab(name, 0.0068, { color: '#fff3dc', bg: 'rgba(30,32,44,0.55)' }); t.position.copy(p.clone().addScaledVector(dir, 0.022).add(new THREE.Vector3(0, 0.004, 0))); group.add(t); }
  });
  // 太阳（在环上）和一束看得见的平行光
  const sunP = EC.clone().addScaledVector(sDir, RR);
  const sunTex = canvasTex(256, 256, (g, W) => { const gr = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); gr.addColorStop(0, 'rgba(255,255,246,1)'); gr.addColorStop(0.38, 'rgba(255,238,180,1)'); gr.addColorStop(0.62, 'rgba(255,196,96,0.95)'); gr.addColorStop(0.8, 'rgba(255,150,60,0.4)'); gr.addColorStop(1, 'rgba(255,140,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, W); });
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, depthWrite: false, toneMapped: false })); sun.scale.setScalar(0.05); sun.position.copy(sunP); group.add(sun);
  const beamLen = RR - RE * 0.2;
  const beamGeo = new THREE.CylinderGeometry(RE * 1.0, RE * 1.0, beamLen, 48, 1, true); beamGeo.translate(0, beamLen / 2, 0);
  const beam = new THREE.Mesh(beamGeo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float face = abs(dot(vN, vV)); float core = pow(face, 3.2); float along = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.72, vUv.y); gl_FragColor = vec4(vec3(1.0, 0.84, 0.52) * core * along * 0.3, 1.0); }',
  }));
  beam.position.copy(EC); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sDir); group.add(beam);
  {          // 平行的阳光：几条细光线，打到地球表面就停
    const side = new THREE.Vector3().crossVectors(sDir, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3(0, 1, 0);
    for (const [a, b] of [[0, 0.75], [0, 0.4], [0, 0], [0, -0.4], [0, -0.75], [0.5, 0.2], [-0.5, -0.2], [0.5, -0.55], [-0.5, 0.55]]) {
      const off = side.clone().multiplyScalar(a * RE).addScaledVector(up, b * RE), d2 = off.lengthSq(), r2 = RE * RE;
      const hit = d2 < r2 ? Math.sqrt(r2 - d2) : -RE * 1.2;          // 光线打到球面的位置（沿光线方向，离地球中心多远）
      const from = EC.clone().add(off).addScaledVector(sDir, RR * 0.92), to = EC.clone().add(off).addScaledVector(sDir, hit);
      group.add(polyline([from, to], { width: 1.3, color: 0xffd58a, opacity: 0.55 }));
    }
  }
  // 地球（大）
  const tex = makeGlobeTex(false);
  const e = makeEarthAt(tex, RE, 1, true);
  e.g.position.copy(EC);
  // 地轴朝向：夏至时北极歪向太阳
  const tilt = e.g.children[0]; tilt.rotation.set(0, 0, 0); tilt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
  e.place(EC, sDir, axis);
  group.add(e.g);
  // 北京的小旗（正午：在正对太阳的经线上）
  const north = axis, east = new THREE.Vector3().crossVectors(north, sDir).normalize(), toSunOnEq = new THREE.Vector3().crossVectors(east, north).normalize();
  const lat = BJ.lat * D2R, flagDir = toSunOnEq.clone().multiplyScalar(Math.cos(lat)).addScaledVector(north, Math.sin(lat)).normalize();
  const flag = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(RE * 0.012, RE * 0.012, RE * 0.32, 8), new THREE.MeshBasicMaterial({ color: 0x2b2f3a })); pole.position.y = RE * 0.16;
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(RE * 0.18, RE * 0.11), new THREE.MeshBasicMaterial({ color: 0xe0452e, side: THREE.DoubleSide, toneMapped: false })); cloth.position.set(RE * 0.09, RE * 0.27, 0);
  flag.add(pole, cloth); flag.position.copy(EC.clone().addScaledVector(flagDir, RE)); flag.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), flagDir); group.add(flag);
  flag.name = 'bjflag';
  const t1 = lab('北京', 0.0075, { color: '#fff3dc', bg: 'rgba(30,32,44,0.6)' }); t1.position.copy(flag.position.clone().addScaledVector(flagDir, RE * 0.5).add(new THREE.Vector3(-0.012, 0.006, 0.01))); group.add(t1);
  const t2 = lab('夏至：太阳直射北回归线，北极圈里一整天都不天黑', 0.0058, { color: '#fff3dc', bg: 'rgba(30,32,44,0.62)' }); t2.position.copy(EC.clone().add(new THREE.Vector3(0.03, RE * 1.12, 0.05))); group.add(t2);
}

// 北京的天空（圆窗里）：课本这一页就是地面；白天的天空
function buildSky(group, pageTex) {
  window.__noTitle = true;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(0.6, 32, 20), new THREE.MeshBasicMaterial({ side: THREE.BackSide, toneMapped: false, map: canvasTex(4, 256, (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#4f86c6'); gr.addColorStop(0.46, '#a9cbe9'); gr.addColorStop(0.5, '#f3e7cf'); gr.addColorStop(1, '#f3e7cf'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }) }));
  group.add(sky);
  buildGround(group, pageTex, true);
}

// ---------------------------------------------------------------- 第五稿：课本上立起来的学校操场（北京）。夏至、冬至两道太阳弧，旗杆两道影子
function buildYard(group) {
  const lat = BJ.lat * D2R;
  const tex = (f) => { const t = new THREE.TextureLoader().load(f); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  // 书页（跨页，平放）
  for (const [f, x] of [['/mock/xb1-p6.jpg', -PAGE_W / 2], ['/mock/xb1-p7.jpg', PAGE_W / 2]]) {
    const pg = new THREE.Mesh(new THREE.PlaneGeometry(PAGE_W, PAGE_H), new THREE.MeshLambertMaterial({ color: 0xf3eee2, map: tex(f) })); pg.rotation.x = -Math.PI / 2; pg.position.set(x, 0, 0.02); pg.receiveShadow = true; group.add(pg);
  }
  // 立体书：一块从书页上立起来的硬纸板，上面是操场（北 = −z）
  const W0 = 0.26, D0 = 0.2, T0 = 0.006;
  const board = new THREE.Mesh(new THREE.BoxGeometry(W0, T0, D0), new THREE.MeshLambertMaterial({ color: 0xe9dfc7 })); board.position.y = 0.018; board.castShadow = true; board.receiveShadow = true; group.add(board);
  for (const [x, z] of [[-W0 / 2 + 0.02, -D0 / 2 + 0.02], [W0 / 2 - 0.02, -D0 / 2 + 0.02], [-W0 / 2 + 0.02, D0 / 2 - 0.02], [W0 / 2 - 0.02, D0 / 2 - 0.02]]) {          // 纸折的支脚
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.015, 0.012), new THREE.MeshLambertMaterial({ color: 0xd9cdb0 })); leg.position.set(x, 0.0075, z); group.add(leg);
  }
  const Y = 0.018 + T0 / 2;
  const yard = canvasTex(1300, 1000, (g, W, H) => {
    g.fillStyle = '#d9cfb6'; g.fillRect(0, 0, W, H);
    const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    g.fillStyle = '#b8533c'; rr(110, 170, 1080, 660, 330); g.fill();          // 跑道
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 4; for (let k = 1; k < 6; k++) { rr(110 + k * 22, 170 + k * 22, 1080 - k * 44, 660 - k * 44, 330 - k * 22); g.stroke(); }
    g.fillStyle = '#6f9a4e'; rr(250, 310, 800, 380, 190); g.fill();          // 草坪
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 5; g.beginPath(); g.moveTo(650, 310); g.lineTo(650, 690); g.stroke(); g.beginPath(); g.arc(650, 500, 70, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#c9bea3'; g.fillRect(470, 40, 360, 90);          // 北边的教学楼地基
  });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(W0 - 0.008, D0 - 0.008), new THREE.MeshLambertMaterial({ map: yard })); top.rotation.x = -Math.PI / 2; top.position.y = Y + 0.0002; top.receiveShadow = true; group.add(top);
  // 教学楼（北边）、几棵树
  const bld = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.016), new THREE.MeshLambertMaterial({ color: 0xf1e8d6 })); bld.position.set(0, Y + 0.015, -D0 / 2 + 0.018); bld.castShadow = true; group.add(bld);
  for (let i = 0; i < 5; i++) { const win = new THREE.Mesh(new THREE.PlaneGeometry(0.008, 0.012), new THREE.MeshBasicMaterial({ color: 0x8fb3d6 })); win.position.set(-0.026 + i * 0.013, Y + 0.016, -D0 / 2 + 0.0262); group.add(win); }
  for (const [x, z, sc] of [[-0.11, -0.07, 1], [0.105, -0.075, 0.9], [-0.115, 0.07, 0.85], [0.11, 0.075, 1.05], [-0.06, -0.085, 0.8], [0.06, -0.088, 0.85]]) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0016, 0.012 * sc, 8), new THREE.MeshLambertMaterial({ color: 0x7a5a3a })); trunk.position.set(x, Y + 0.006 * sc, z); trunk.castShadow = true;
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.009 * sc, 1), new THREE.MeshLambertMaterial({ color: 0x5f8a45, flatShading: true })); crown.position.set(x, Y + 0.016 * sc, z); crown.castShadow = true;
    group.add(trunk, crown);
  }
  // 旗杆和红旗（操场中央）
  const HP = 0.05;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0011, HP, 10), new THREE.MeshLambertMaterial({ color: 0xd8dde2 })); pole.position.set(0, Y + HP / 2, 0); pole.castShadow = true; group.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.016, 0.0105, 8, 4), new THREE.MeshLambertMaterial({ color: 0xd8342a, side: THREE.DoubleSide })); flag.position.set(0.0082, Y + HP - 0.006, 0); group.add(flag);
  const fp = flag.geometry.attributes.position; for (let i = 0; i < fp.count; i++) fp.setZ(i, Math.sin((fp.getX(i) + 0.008) * 260) * 0.0012); fp.needsUpdate = true;
  // 太阳：时角 H 时的方向（东 +x，北 −z，南 +z）
  const sunDir = (dec, H) => {
    const alt = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H));
    const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat));
    return new THREE.Vector3(-Math.sin(az) * Math.cos(alt), Math.sin(alt), Math.cos(az) * Math.cos(alt));
  };
  const RD = 0.16, C0 = new THREE.Vector3(0, Y, 0);
  const sunTex = canvasTex(256, 256, (g, W) => { const gr = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); gr.addColorStop(0, 'rgba(255,255,246,1)'); gr.addColorStop(0.4, 'rgba(255,236,170,1)'); gr.addColorStop(0.66, 'rgba(255,190,90,0.9)'); gr.addColorStop(0.85, 'rgba(255,150,60,0.3)'); gr.addColorStop(1, 'rgba(255,140,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, W); });
  const shadowOf = (alt) => HP / Math.tan(alt);
  for (const [dec, col, name, colHex] of [[EPS, 0xffb347, '夏至', '#ffb347'], [-EPS, 0x7fb6ff, '冬至', '#9cc8ff']]) {
    const H0 = Math.acos(-Math.tan(lat) * Math.tan(dec)), pts = [];
    for (let i = 0; i <= 120; i++) { const H = -H0 + (i / 120) * 2 * H0; pts.push(C0.clone().add(sunDir(dec, H).multiplyScalar(RD))); }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.0016, 8), new THREE.MeshBasicMaterial({ color: col, toneMapped: false, transparent: true, opacity: 0.95 })); group.add(tube);
    const glow = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.0045, 8), new THREE.MeshBasicMaterial({ color: col, toneMapped: false, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending })); group.add(glow);
    const noon = sunDir(dec, 0), alt = Math.asin(noon.y);
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, depthWrite: false, toneMapped: false, color: dec > 0 ? 0xffffff : 0xdde9ff })); sun.scale.setScalar(0.028); sun.position.copy(C0.clone().add(noon.multiplyScalar(RD))); group.add(sun);
    // 正午的影子（朝正北）
    const L = shadowOf(alt);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.003, L), new THREE.MeshBasicMaterial({ color: dec > 0 ? 0x5a3a20 : 0x1f4c9a, transparent: true, opacity: dec > 0 ? 0.6 : 0.55, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.set(dec > 0 ? 0.0016 : -0.0016, Y + 0.0006, -L / 2); group.add(sh);
    const t = lab(`${name}正午 · 太阳高 ${dec > 0 ? '73°26′' : '26°34′'} · 白天约 ${dec > 0 ? '15' : '9'} 小时`, 0.0062, { color: '#fff8ea', bg: dec > 0 ? 'rgba(140,80,20,0.78)' : 'rgba(30,52,98,0.78)' });
    t.position.copy(sun.position.clone().add(new THREE.Vector3(0.0, 0.02, 0.0))); t.rotation.y = 0.5; group.add(t);
    const ts = lab(`${name}正午的影子`, 0.0055, { color: '#fff8ea', bg: dec > 0 ? 'rgba(140,80,20,0.78)' : 'rgba(30,52,98,0.78)' });
    ts.rotation.x = -Math.PI / 2; ts.rotation.z = 0.5; ts.position.set(dec > 0 ? 0.024 : 0.036, Y + 0.0012, dec > 0 ? -L - 0.004 : -0.058); group.add(ts);
  }
  // 东南西北
  for (const [t, x, z] of [['北', 0, -D0 / 2 - 0.012], ['南', 0, D0 / 2 + 0.012], ['东', W0 / 2 + 0.012, 0], ['西', -W0 / 2 - 0.012, 0]]) {
    const l = lab(t, 0.009, { font: '"Songti SC", serif', bg: 'rgba(255,252,244,0.9)' }); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.0012, z); group.add(l);
  }
  // 灯光：暖色的天光 + 一盏打出柔和影子的主光
  const key = new THREE.DirectionalLight(0xfff0d8, 1.1); key.position.set(0.25, 0.45, 0.3); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -0.3, right: 0.3, top: 0.3, bottom: -0.3, near: 0.01, far: 2 }); key.shadow.bias = -0.0004; group.add(key, key.target);
  group.add(new THREE.HemisphereLight(0xfff6e6, 0x8a7a62, 0.55));
}

// ---------------------------------------------------------------- 第六稿：操场精修（模型、材质、真实影子、太阳弧上的钟点）
function buildYard2(group) {
  const lat = BJ.lat * D2R;
  const L = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...o });
  const tex = (f) => { const t = new THREE.TextureLoader().load(f); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const add = (m, cast = true, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; group.add(m); return m; };
  // 书页（跨页）
  for (const [f, x] of [['/mock/xb1-p6.jpg', -PAGE_W / 2], ['/mock/xb1-p7.jpg', PAGE_W / 2]]) {
    const pg = new THREE.Mesh(new THREE.PlaneGeometry(PAGE_W, PAGE_H), new THREE.MeshStandardMaterial({ color: 0xf4efe3, map: tex(f), roughness: 1 })); pg.rotation.x = -Math.PI / 2; pg.position.set(x, 0, 0.02); add(pg, false, true);
  }
  // 立体书的底板：两层硬纸
  const W0 = 0.27, D0 = 0.21;
  add(new THREE.Mesh(new THREE.BoxGeometry(W0 + 0.008, 0.004, D0 + 0.008), L(0xd8ccae))).position.set(0, 0.012, 0);
  add(new THREE.Mesh(new THREE.BoxGeometry(W0, 0.005, D0), L(0xeee4cc))).position.set(0, 0.0165, 0);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.012, 0.014), L(0xcfc2a2))).position.set(x * (W0 / 2 - 0.025), 0.006, z * (D0 / 2 - 0.025));
  const Y = 0.019;
  // 地面：标准 400 米跑道（八道）、足球场、草坪条纹、塑胶颗粒
  const yard = canvasTex(2600, 2000, (g, W, H) => {
    g.fillStyle = '#e4dccb'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(120,110,90,${Math.random() * 0.05})`; g.fillRect(Math.random() * W, Math.random() * H, 3, 3); }
    const cx = W / 2, cy = H / 2 + 60, Ls = 1060, R0 = 380, lane = 34;
    const stadium = (r) => { g.beginPath(); g.moveTo(cx - Ls / 2, cy - r); g.lineTo(cx + Ls / 2, cy - r); g.arc(cx + Ls / 2, cy, r, -Math.PI / 2, Math.PI / 2); g.lineTo(cx - Ls / 2, cy + r); g.arc(cx - Ls / 2, cy, r, Math.PI / 2, Math.PI * 1.5); g.closePath(); };
    stadium(R0 + lane * 8 + 16); g.fillStyle = '#b44a35'; g.fill();
    for (let i = 0; i < 26000; i++) { g.fillStyle = `rgba(${60 + Math.random() * 60},20,10,${Math.random() * 0.12})`; g.fillRect(cx - Ls / 2 - R0 - 300 + Math.random() * (Ls + R0 * 2 + 600), cy - R0 - 300 + Math.random() * (R0 * 2 + 600), 2, 2); }
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 3.5; for (let k = 0; k <= 8; k++) { stadium(R0 + k * lane); g.stroke(); }
    g.lineWidth = 6; g.beginPath(); g.moveTo(cx + Ls / 2 - 40, cy + R0); g.lineTo(cx + Ls / 2 - 40, cy + R0 + lane * 8); g.stroke();          // 终点线
    stadium(R0 - 4); g.save(); g.clip();
    for (let k = -12; k < 12; k++) { g.fillStyle = k % 2 ? '#6f9b4c' : '#78a553'; g.fillRect(cx + k * 70, cy - R0, 70, R0 * 2); }          // 草坪修剪条纹
    for (let i = 0; i < 20000; i++) { g.fillStyle = `rgba(30,60,20,${Math.random() * 0.06})`; g.fillRect(cx - Ls / 2 - R0 + Math.random() * (Ls + 2 * R0), cy - R0 + Math.random() * 2 * R0, 2, 3); }
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.82)'; g.lineWidth = 5;
    const fw = 1000, fh = 600; g.strokeRect(cx - fw / 2, cy - fh / 2, fw, fh); g.beginPath(); g.moveTo(cx, cy - fh / 2); g.lineTo(cx, cy + fh / 2); g.stroke();
    g.beginPath(); g.arc(cx, cy, 92, 0, Math.PI * 2); g.stroke();
    for (const sx of [-1, 1]) { g.strokeRect(cx + sx * fw / 2 - (sx > 0 ? 160 : 0), cy - 200, 160, 400); g.strokeRect(cx + sx * fw / 2 - (sx > 0 ? 55 : 0), cy - 95, 55, 190); }
    // 升旗台前面的小广场（在操场北边、教学楼前）
    g.fillStyle = '#d6cfbf'; g.fillRect(cx - 230, 70, 460, 230);
    g.strokeStyle = 'rgba(120,110,90,0.25)'; g.lineWidth = 2; for (let x = cx - 230; x <= cx + 230; x += 46) { g.beginPath(); g.moveTo(x, 70); g.lineTo(x, 300); g.stroke(); } for (let y = 70; y <= 300; y += 46) { g.beginPath(); g.moveTo(cx - 230, y); g.lineTo(cx + 230, y); g.stroke(); }
  });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(W0, D0), new THREE.MeshStandardMaterial({ map: yard, roughness: 0.95 })); top.rotation.x = -Math.PI / 2; top.position.y = Y + 0.0002; add(top, false, true);
  // 教学楼：四层，凹进去的窗、屋顶女儿墙、门厅和台阶（在北边）
  const bz = -D0 / 2 + 0.017, bw = 0.12, bh = 0.036, bd = 0.02;
  add(new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), L(0xf3ede1))).position.set(0, Y + bh / 2, bz);
  add(new THREE.Mesh(new THREE.BoxGeometry(bw + 0.002, 0.003, bd + 0.002), L(0xd9d2c4))).position.set(0, Y + bh + 0.0015, bz);
  add(new THREE.Mesh(new THREE.BoxGeometry(bw + 0.002, 0.0018, bd + 0.002), L(0xb94c3a))).position.set(0, Y + 0.0009, bz);
  const glass = L(0x8fb4d4, { roughness: 0.25, metalness: 0.2 }), frame = L(0xc9c2b4);
  for (let fl = 0; fl < 4; fl++) for (let i = 0; i < 10; i++) {
    if (fl === 0 && (i === 4 || i === 5)) continue;
    const x = -bw / 2 + 0.008 + i * 0.0116, y = Y + 0.006 + fl * 0.0078;
    add(new THREE.Mesh(new THREE.BoxGeometry(0.0072, 0.0046, 0.0008), frame), false, false).position.set(x, y, bz + bd / 2 + 0.0002);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.0062, 0.0038, 0.0006), glass), false, false).position.set(x, y, bz + bd / 2 + 0.0006);
  }
  add(new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.002, 0.008), L(0xe6dfd2))).position.set(0, Y + 0.011, bz + bd / 2 + 0.004);          // 门厅雨棚
  for (const k of [0, 1, 2]) add(new THREE.Mesh(new THREE.BoxGeometry(0.024 - k * 0.002, 0.0012, 0.006 - k * 0.0015), L(0xd8d1c3))).position.set(0, Y + 0.0006 + k * 0.0012, bz + bd / 2 + 0.003);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.008, 0.0006), L(0x5b6472)), false, false).position.set(0, Y + 0.004, bz + bd / 2 + 0.0004);
  // 升旗台：三级台阶的方台；旗杆顶上一个圆球；红旗 3:2，有褶皱
  const fz = D0 / 2 - 0.03;          // 升旗台在操场南头：正午的影子朝北，越过跑道和草坪，长短看得清
  for (const k of [0, 1, 2]) add(new THREE.Mesh(new THREE.BoxGeometry(0.03 - k * 0.006, 0.0018, 0.03 - k * 0.006), L(0xe2dccf))).position.set(0, Y + 0.0009 + k * 0.0018, fz);
  const PB = Y + 0.0054, HP = 0.055;
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.0007, 0.0011, HP, 12), L(0xdfe3e7, { metalness: 0.5, roughness: 0.35 }))).position.set(0, PB + HP / 2, fz);
  add(new THREE.Mesh(new THREE.SphereGeometry(0.0016, 16, 12), L(0xd9b44a, { metalness: 0.6, roughness: 0.3 }))).position.set(0, PB + HP + 0.0012, fz);
  const fg = new THREE.PlaneGeometry(0.018, 0.012, 24, 8); fg.translate(0.009, 0, 0);
  const fpos = fg.attributes.position; for (let i = 0; i < fpos.count; i++) { const x = fpos.getX(i); fpos.setZ(i, Math.sin(x * 330) * 0.0014 * (x / 0.018) + Math.sin(x * 150 + fpos.getY(i) * 200) * 0.0005); } fg.computeVertexNormals();
  add(new THREE.Mesh(fg, L(0xd02b22, { side: THREE.DoubleSide, roughness: 0.7 }))).position.set(0.0008, PB + HP - 0.0075, fz);
  // 树：一簇簇的树冠，两种绿
  const tree = (x, z, sc, kind) => {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.0011 * sc, 0.0017 * sc, 0.012 * sc, 8), L(0x76553a))).position.set(x, Y + 0.006 * sc, z);
    if (kind === 'cone') { for (const [h, r] of [[0.012, 0.0075], [0.018, 0.0058], [0.024, 0.004]]) add(new THREE.Mesh(new THREE.ConeGeometry(r * sc, 0.011 * sc, 12), L(0x3f6e3c, { flatShading: true }))).position.set(x, Y + h * sc, z); return; }
    const col = [0x5d8c45, 0x6f9c50, 0x4f7c3c];
    for (let k = 0; k < 6; k++) { const a = k * 2.1, r = 0.0045 * sc; add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.0062 * sc * (0.8 + 0.3 * Math.sin(k * 1.7)), 2), L(col[k % 3], { flatShading: true }))).position.set(x + Math.cos(a) * r, Y + (0.016 + 0.004 * Math.sin(k)) * sc, z + Math.sin(a) * r); }
  };
  for (const [x, z, sc, k] of [[-0.118, -0.08, 1.05, 'ball'], [-0.118, -0.03, 0.9, 'cone'], [-0.118, 0.02, 1, 'ball'], [-0.118, 0.075, 0.95, 'cone'], [0.118, -0.08, 1, 'cone'], [0.118, -0.03, 1.05, 'ball'], [0.118, 0.025, 0.92, 'cone'], [0.118, 0.078, 1, 'ball'], [-0.075, -0.093, 0.85, 'ball'], [0.075, -0.093, 0.85, 'ball']]) tree(x, z, sc, k);
  // 太阳：夏至（金）、冬至（蓝）两道弧，弧上标钟点（地方时）
  const sunDir = (dec, H) => {
    const alt = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H));
    const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat));
    return new THREE.Vector3(-Math.sin(az) * Math.cos(alt), Math.sin(alt), Math.cos(az) * Math.cos(alt));
  };
  const RD = 0.15, C0 = new THREE.Vector3(0, PB, -0.01);          // 太阳在“天上”，弧画在操场中央的上空；影子方向只看太阳方向
  const sunTex = canvasTex(256, 256, (g, W) => { const gr = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); gr.addColorStop(0, 'rgba(255,255,246,1)'); gr.addColorStop(0.4, 'rgba(255,236,170,1)'); gr.addColorStop(0.66, 'rgba(255,190,90,0.9)'); gr.addColorStop(0.85, 'rgba(255,150,60,0.3)'); gr.addColorStop(1, 'rgba(255,140,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, W); });
  let summerNoon = null;
  for (const [dec, col, name] of [[EPS, 0xffb347, '夏至'], [-EPS, 0x86bbff, '冬至']]) {
    const H0 = Math.acos(-Math.tan(lat) * Math.tan(dec)), pts = [];
    for (let i = 0; i <= 140; i++) { const H = -H0 + (i / 140) * 2 * H0; pts.push(C0.clone().add(sunDir(dec, H).multiplyScalar(RD))); }
    const curve = new THREE.CatmullRomCurve3(pts);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 0.0013, 8), new THREE.MeshBasicMaterial({ color: col, toneMapped: false })));
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 0.004, 8), new THREE.MeshBasicMaterial({ color: col, toneMapped: false, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending })));
    for (const hr of [6, 9, 12, 15, 18]) {          // 钟点（地方时）
      const H = (hr - 12) * 15 * D2R; if (Math.abs(H) > H0) continue;
      const p = C0.clone().add(sunDir(dec, H).multiplyScalar(RD));
      { const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0022, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); dot.position.copy(p); group.add(dot); }
      if (hr !== 12) { const t = lab(`${hr}时`, 0.0045, { color: '#fff8ea', bg: dec > 0 ? 'rgba(150,90,30,0.75)' : 'rgba(34,60,110,0.75)' }); t.position.copy(p.clone().add(new THREE.Vector3(0, 0.008, 0))); t.rotation.y = 0.6; group.add(t); }
    }
    const noonV = sunDir(dec, 0), alt = Math.asin(noonV.y), sp = C0.clone().add(noonV.clone().multiplyScalar(RD));
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, depthWrite: false, toneMapped: false, color: dec > 0 ? 0xffffff : 0xe6efff })); sun.scale.setScalar(0.03); sun.position.copy(sp); group.add(sun);
    const t = lab(`${name} · 正午太阳高 ${dec > 0 ? '73°26′' : '26°34′'} · 白天约 ${dec > 0 ? '15' : '9'} 小时`, 0.0056, { color: '#fff8ea', bg: dec > 0 ? 'rgba(150,90,30,0.82)' : 'rgba(34,60,110,0.82)' });
    t.position.copy(sp.clone().add(new THREE.Vector3(0, 0.02, 0))); t.rotation.y = 0.6; group.add(t);
    if (dec > 0) summerNoon = noonV;
    else {          // 冬至正午的影子：半透明的蓝，叠在地上
      const Ls = HP / Math.tan(alt);
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.0028, Ls), new THREE.MeshBasicMaterial({ color: 0x2455b0, transparent: true, opacity: 0.42, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.set(-0.0012, PB + 0.0004, fz - Ls / 2); group.add(sh);
      const ts = lab('冬至正午的影子', 0.0045, { color: '#fff8ea', bg: 'rgba(34,60,110,0.8)' }); ts.rotation.x = -Math.PI / 2; ts.rotation.z = 0.5; ts.position.set(0.02, PB + 0.0008, fz - Ls * 0.62); group.add(ts);
    }
  }
  // 主光就是夏至正午的太阳：楼、树、旗杆的影子都朝北
  const key = new THREE.DirectionalLight(0xfff1dc, 2.4); key.position.copy(summerNoon.clone().multiplyScalar(0.6)); key.target.position.set(0, 0, 0); key.castShadow = true; key.shadow.mapSize.set(4096, 4096);
  Object.assign(key.shadow.camera, { left: -0.22, right: 0.22, top: 0.22, bottom: -0.22, near: 0.05, far: 1.2 }); key.shadow.bias = -0.0002; key.shadow.normalBias = 0.0004; key.shadow.radius = 3;
  group.add(key, key.target);
  group.add(new THREE.HemisphereLight(0xfff6e8, 0x9a8a6c, 0.9));
  const tsum = lab('夏至正午的影子', 0.0045, { color: '#fff8ea', bg: 'rgba(150,90,30,0.82)' }); tsum.rotation.x = -Math.PI / 2; tsum.rotation.z = 0.5; tsum.position.set(0.016, PB + 0.0008, fz - 0.012); group.add(tsum);
  for (const [t, x, z] of [['北', 0, -D0 / 2 - 0.014], ['南', 0, D0 / 2 + 0.014], ['东', W0 / 2 + 0.014, 0], ['西', -W0 / 2 - 0.014, 0]]) { const l = lab(t, 0.008, { font: '"Songti SC", serif', bg: 'rgba(255,252,244,0.9)' }); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.0012, z); group.add(l); }
}
