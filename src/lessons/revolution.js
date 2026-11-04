// 第一章 第三节 地球的运动 · 活动：演示地球公转，了解季节变换（课本七年级上册第 26 页图 1.24；第 23–25 页图 1.21、1.23）。
//
// 照图 1.24 摆：中间一盏灯泡（光源），纸上画着公转轨道，A（后）、B（左）、C（前）、D（右）四个位置，逆时针箭头。
// 地球仪是课本第 14 页自己做的泡沫球（图 1.10）：毛线赤道，回归线、极圈画成虚线（同图 1.21）；铁丝穿过两极作地轴，
// 地轴与桌面约 66.5°，北极一端歪向右边（同图 1.24、1.21）；余下的铁丝沿球外侧弯成半圆，下面卷成底座，包着橡皮泥。
// 不画大陆：带大陆的地球仪就是一张世界地图，公开要送审（PLAN-geo.md 第七节）。城市只插一面小旗。
//
// 学生（课本的三步）：点一下光源（房间暗下来）→ 按逆时针方向端着地球仪绕光源走 A → B → C → D → 回到 A，
//   只平移、不转动，地轴的倾斜方向保持不变 → 每到一个位置，看同一纬度地带受光的变化：自己城市那条纬线亮着的那一段
//   （白天占一天的多少）、直射点、正午太阳高度；“站上去看”：站在这个城市的地面上看这一天的太阳。
// 每到一个位置，地球仪转到这个城市正对光源（当地正午），卡片和圆窗都按这一天算；走的时候不转。
// 模型（按太阳光算：平行光，昼半球正好一半；黄赤交角取课本的 23.5°）：
//   直射点纬度 δ = asin(光线方向 · 地轴方向)；昼长：cos H₀ = −tan φ · tan δ，昼长 = 2H₀ / 15°（小时，不计大气折射）；
//   正午太阳高度 H = 90° − |φ − δ|；影长 = 身高 / tan H；日出方位：cos A = sin δ / cos φ（从正北量起）。
import * as THREE from 'three';
import { seg, table, buttons } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { textPlate, canvasTex, glowTexture } from './kit/props.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked, hull } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const D2R = Math.PI / 180;
const EPS = 23.5 * D2R;                                   // 黄赤交角（课本：23.5°）
const R = 0.024, RW = 0.0275, HC = 0.048;                 // 泡沫球半径、铁丝半圆的半径、球心离桌面多高
const RORB = 0.118;                                       // 纸上公转轨道的半径（灯在圆心）
const AXIS = new THREE.Vector3(Math.sin(EPS), Math.cos(EPS), 0);          // 地轴：北极一端歪向右边（D 那边），和桌面成 66.5°
const LAMP_C = new THREE.Vector3(0, HC, 0);
const POS = { D: 0, A: 90, B: 180, C: 270 };              // 轨道上的位置（从右边 D 起，逆时针量的角度）
const ORDER = ['A', 'B', 'C', 'D'];
const CITIES = [
  { name: '哈尔滨', lat: 45.8, lon: 126.6 },
  { name: '乌鲁木齐', lat: 43.8, lon: 87.6 },
  { name: '北京', lat: 39.9, lon: 116.4 },
  { name: '上海', lat: 31.2, lon: 121.5 },
  { name: '拉萨', lat: 29.7, lon: 91.1 },
  { name: '广州', lat: 23.1, lon: 113.3 },
  { name: '海口', lat: 20.0, lon: 110.3 },
];
const TILT_Q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), AXIS);
const SNAP = 4;                                            // 松手时离标好的位置不到几度，就放到那个位置上

// ---------------- 天文 ----------------
const lightDir = (ang) => new THREE.Vector3(-Math.cos(ang * D2R), 0, Math.sin(ang * D2R));        // 从地球仪指向灯（水平）
const decOf = (ang) => Math.asin(clamp(lightDir(ang).dot(AXIS), -1, 1));                          // 直射点纬度（弧度）
const dayHours = (phi, dec) => { const x = -Math.tan(phi) * Math.tan(dec); return x <= -1 ? 24 : x >= 1 ? 0 : (2 * Math.acos(x)) / D2R / 15; };
const noonAlt = (phi, dec) => 90 - Math.abs(phi - dec) / D2R;                                       // 度
const latTxt = (deg) => {
  const a = Math.abs(deg);
  if (a < 0.05) return '0°（赤道）';
  const s = `${a.toFixed(1)}°${deg > 0 ? 'N' : 'S'}`;
  return Math.abs(a - 23.5) < 0.05 ? `${s}（${deg > 0 ? '北' : '南'}回归线）` : s;
};
const hm = (hours) => { let m = Math.round(hours * 60); const H = Math.floor(m / 60); m -= H * 60; return m ? `${H} 时 ${m} 分` : `${H} 小时`; };
const fix1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
/** 这一天的太阳：一串 { alt, az }（度，方位从正北顺时针量），从日出到日落；polar：'day' 极昼、'night' 极夜 */
function sunPath(phi, dec, n = 48) {
  const x = -Math.tan(phi) * Math.tan(dec), H0 = x <= -1 ? Math.PI : x >= 1 ? 0 : Math.acos(x);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const hA = -H0 + (2 * H0 * i) / n;
    const sa = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(hA);
    const alt = Math.asin(clamp(sa, -1, 1));
    const ca = (Math.sin(dec) - Math.sin(alt) * Math.sin(phi)) / Math.max(1e-6, Math.cos(alt) * Math.cos(phi));
    let az = Math.acos(clamp(ca, -1, 1)) / D2R; if (hA > 0) az = 360 - az;
    pts.push({ alt: Math.max(0, alt / D2R), az });
  }
  return { pts, polar: x <= -1 ? 'day' : x >= 1 ? 'night' : '' };
}
const riseWord = (az) => (az < 87 ? '东北方' : az > 93 ? '东南方' : '正东方');
const setWord = (az) => (az > 273 ? '西北方' : az < 267 ? '西南方' : '正西方');

export default {
  id: 'revolution',
  fig: '图1.24',
  title: '地球公转演示',
  stampText: '活动',
  style: 'paper',
  predict: {
    q: '端着地球仪绕灯走一圈，地轴的倾斜方向一直不变。走到地轴北端歪向灯的那一边时，北京的白天比黑夜——',
    hint: '课本第 26 页活动：演示地球公转，了解季节变换。',
    options: ['长', '短', '一样长'],
    answer: 0,
  },
  need: '调暗房间、打开光源，按逆时针方向移动地球仪绕光源一圈（A → B → C → D → A），保持地轴的倾斜方向不变；观察同一纬度地带受光的变化，说出四个位置北半球的季节',
  conclusion: {
    crops: [{ page: 27, rect: [60, 472, 345, 664] }],
    quote: '地球在自转的同时，还围绕太阳不停地公转。地球公转的方向与自转方向一致，也是自西向东，公转一周的时间是一年。地球总是斜着身子围绕太阳公转，而且地轴的倾斜方向保持不变。随着地球在公转轨道位置的变化，同一纬度地带受太阳照射的情况也在变化，便产生了季节变换。',
    why: '地轴的倾斜方向不变，所以地球走到轨道上不同的位置，太阳直射的纬度就不同：<br>B 处北极一端歪向太阳，直射北回归线（23.5°N），北半球白天长、正午太阳高，获得的太阳光热多——<b>夏季</b>（夏至 6 月 21 日前后）；<br>D 处正好相反，直射南回归线，北半球白天短、正午太阳低——<b>冬季</b>（冬至 12 月 22 日前后）；<br>A、C 处直射赤道，昼夜等长——地球从 A 逆时针走到 B，A 是<b>春季</b>（春分 3 月 21 日前后），C 是<b>秋季</b>（秋分 9 月 23 日前后）。<br>南半球季节与北半球相反。季节变换在中纬度地区表现最为明显。',
    src: '课本七年级上册第 23–26 页 · 第一章 第三节 地球的运动（活动：演示地球公转，了解季节变换）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); else bar.caption(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };
    const ease = (k) => k * k * (3 - 2 * k);

    paperSheet(group, { w: 0.36, d: 0.34, x: 0, z: 0 });

    // ================= 纸上的公转轨道：虚线圆、逆时针箭头、A B C D =================
    const INK = 0x4a5064;
    const orbitM = paint(INK);
    for (let i = 0; i < 72; i++) {
      if (i % 2) continue;
      const a0 = (i / 72) * Math.PI * 2, a1 = ((i + 0.9) / 72) * Math.PI * 2, am = (a0 + a1) / 2, L = RORB * (a1 - a0);
      const d = new THREE.Mesh(new THREE.BoxGeometry(L, 0.0004, 0.0011), orbitM);
      d.position.set(RORB * Math.cos(am), 0.0007, -RORB * Math.sin(am)); d.rotation.y = am + Math.PI / 2; d.raycast = () => {}; group.add(d);
    }
    for (const a of [45, 135, 225, 315]) {          // 逆时针的箭头（俯视）
      const ar = a * D2R, tri = new THREE.Shape(); tri.moveTo(0.006, 0); tri.lineTo(-0.004, 0.0042); tri.lineTo(-0.004, -0.0042); tri.closePath();
      const m = new THREE.Mesh(new THREE.ShapeGeometry(tri), new THREE.MeshBasicMaterial({ color: INK }));
      m.rotation.x = -Math.PI / 2; m.rotation.z = ar + Math.PI / 2;         // 沿切线、指向角度变大的方向
      m.position.set(RORB * Math.cos(ar), 0.0009, -RORB * Math.sin(ar)); m.raycast = () => {}; group.add(m);
    }
    const letters = {};
    for (const k of ORDER) {
      const ar = POS[k] * D2R, l = textPlate(k, { w: 0.014, h: 0.014, color: '#23293a', font: 'bold 120px "Times New Roman", serif' });
      l.rotation.x = -Math.PI / 2; l.position.set((RORB + 0.036) * Math.cos(ar) + 0.012, 0.0009, -(RORB + 0.036) * Math.sin(ar) + 0.012); group.add(l); letters[k] = l;
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.004, 0.0052, 24), new THREE.MeshBasicMaterial({ color: INK })); ring.rotation.x = -Math.PI / 2;
      ring.position.set(RORB * Math.cos(ar), 0.0008, -RORB * Math.sin(ar)); ring.raycast = () => {}; group.add(ring);
    }

    // ================= 光源：灯泡 =================
    const lamp = new THREE.Group(); group.add(lamp);
    const lampBase = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.019, 0.007, 28), paint(0xd9b07a)), { width: 0.7 }); lampBase.position.y = 0.0035; lamp.add(lampBase);
    const stem = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, HC - 0.022, 12), paint(0x8a8f99)), { width: 0.5 }); stem.position.y = 0.007 + (HC - 0.022) / 2; lamp.add(stem);
    const socket = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.011, 18), paint(0x6b6f78)), { width: 0.6 }); socket.position.y = HC - 0.0125; lamp.add(socket);
    const bulbOff = new THREE.Color(0xf4f1e6), bulbOn = new THREE.Color(0xfff1b8);
    const bulbM = new THREE.MeshBasicMaterial({ color: bulbOff.clone(), transparent: true, opacity: 0.92 });
    const bulb = hull(new THREE.Mesh(new THREE.SphereGeometry(0.0115, 24, 18), bulbM), 0.0009); bulb.position.y = HC; bulb.scale.y = 1.08; lamp.add(bulb);
    const fil = new THREE.Mesh(new THREE.TorusGeometry(0.0035, 0.0005, 6, 16, Math.PI), new THREE.MeshBasicMaterial({ color: 0x9a7a40 })); fil.position.y = HC - 0.002; lamp.add(fil);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffd46a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.y = HC; glow.scale.setScalar(0.09); glow.renderOrder = 12; lamp.add(glow);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(0.17, 48), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (g, Wc, Hc) => {
      const gr = g.createRadialGradient(Wc / 2, Hc / 2, 4, Wc / 2, Hc / 2, Wc / 2); gr.addColorStop(0, 'rgba(255,214,120,0.55)'); gr.addColorStop(0.45, 'rgba(255,214,120,0.18)'); gr.addColorStop(1, 'rgba(255,214,120,0)');
      g.fillStyle = gr; g.fillRect(0, 0, Wc, Hc);
    }), transparent: true, opacity: 0, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2; pool.position.y = 0.0006; pool.renderOrder = 2; pool.raycast = () => {}; group.add(pool);
    const lampPick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, HC + 0.014, 10), new THREE.MeshBasicMaterial({ visible: false })); lampPick.position.y = (HC + 0.014) / 2; lampPick.userData.pick = true; lamp.add(lampPick);

    // ================= 地球仪（课本第 14 页图 1.10：泡沫球 + 铁丝 + 橡皮泥） =================
    const globe = new THREE.Group(); group.add(globe);           // 只平移、不转：地轴的倾斜方向一直不变
    const C0 = new THREE.Vector3(0, HC, 0);
    const wireM = paint(0x4f5560, { keep: true });
    const tubeAlong = (pts, r = 0.0009) => inked(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(8, pts.length * 3), r, 8, false), wireM), { width: 0.4 });
    globe.add(tubeAlong([C0.clone().addScaledVector(AXIS, -(R + 0.003)), C0.clone().addScaledVector(AXIS, R + 0.003)]));        // 穿过两极的铁丝
    { const pts = []; for (let i = 0; i <= 24; i++) { const th = EPS + ((Math.PI - EPS) * i) / 24; pts.push(C0.clone().add(new THREE.Vector3(Math.sin(th) * RW, Math.cos(th) * RW, 0))); }
      pts.unshift(C0.clone().addScaledVector(AXIS, R + 0.003));
      pts.push(new THREE.Vector3(0, HC - RW - 0.004, 0), new THREE.Vector3(0, 0.012, 0));
      globe.add(tubeAlong(pts)); }                                 // 沿球外侧弯成半圆，再往下
    { const pts = []; for (let i = 0; i <= 40; i++) { const a = i * 0.42, r = 0.004 + i * 0.00028; pts.push(new THREE.Vector3(Math.cos(a) * r, 0.0018, Math.sin(a) * r)); }
      globe.add(tubeAlong(pts, 0.0008)); }                         // 卷成底座
    const clay = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0145, 0.013, 24), paint(0x9fd0c6, { keep: true })), { width: 0.6 }); clay.position.y = 0.0065; globe.add(clay);     // 橡皮泥（图 1.10③ c）
    for (const s of [-1, 1]) {                                     // 两极裹着胶布
      const tape = new THREE.Mesh(new THREE.CylinderGeometry(0.0021, 0.0021, 0.0035, 12), paint(0xf2efe6)); tape.position.copy(C0).addScaledVector(AXIS, s * (R + 0.0012)); tape.quaternion.copy(TILT_Q); globe.add(tape);
    }
    // 泡沫球：转轴先歪到地轴方向（tilt），再绕地轴转（spin）
    const tilt = new THREE.Group(); tilt.position.copy(C0); tilt.quaternion.copy(TILT_Q); globe.add(tilt);
    const spin = new THREE.Group(); tilt.add(spin);
    const ballTex = canvasTex(2048, 1024, (g, Wc, Hc) => {
      g.fillStyle = '#fbfaf5'; g.fillRect(0, 0, Wc, Hc);
      for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(150,140,120,${Math.random() * 0.07})`; g.beginPath(); g.arc(Math.random() * Wc, Math.random() * Hc, 1 + Math.random() * 2.5, 0, 7); g.fill(); }     // 泡沫的小颗粒
      const y = (lat) => ((90 - lat) / 180) * Hc;
      g.strokeStyle = '#3f74b0'; g.lineWidth = 5;
      for (const lat of [23.5, -23.5, 66.5, -66.5]) { const k = 1 / Math.cos(lat * D2R); g.setLineDash([26 * k, 18 * k]); g.beginPath(); g.moveTo(0, y(lat)); g.lineTo(Wc, y(lat)); g.stroke(); }
      g.setLineDash([]);
    }, {});
    const uL = { value: new THREE.Vector3(1, 0, 0) }, uOn = { value: 0 }, uC = { value: new THREE.Vector3() };
    const ballM = new THREE.ShaderMaterial({
      uniforms: { map: { value: ballTex }, uL, uOn },
      vertexShader: 'varying vec2 vUv; varying vec3 vN; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D map; uniform vec3 uL; uniform float uOn; varying vec2 vUv; varying vec3 vN;
        void main(){
          vec3 base = texture2D(map, vUv).rgb; vec3 n = normalize(vN);
          float room = 0.8 + 0.2 * max(dot(n, normalize(vec3(-0.35, 0.9, 0.45))), 0.0);        // 灯没开：屋里普通的光
          float d = dot(n, uL), day = smoothstep(-0.018, 0.018, d);
          vec3 lit = base * (0.7 + 0.38 * max(d, 0.0)) * vec3(1.0, 0.975, 0.92);              // 昼半球：暖白，正对灯的地方最亮
          vec3 dark = base * vec3(0.2, 0.23, 0.32);                                            // 夜半球
          gl_FragColor = vec4(mix(base * room, mix(dark, lit, day), uOn), 1.0);
          #include <colorspace_fragment>
        }`,
    });
    const ball = hull(new THREE.Mesh(new THREE.SphereGeometry(R, 64, 40), ballM), 0.0007); spin.add(ball);
    const yarn = new THREE.Mesh(new THREE.TorusGeometry(R + 0.0004, 0.00075, 8, 96), paint(0xc8462e, { keep: true })); yarn.rotation.x = Math.PI / 2; spin.add(yarn);       // 毛线赤道
    // 城市那条纬线：亮着的那段暖色，暗着的那段灰蓝
    const latM = new THREE.ShaderMaterial({
      uniforms: { uL, uOn, uC },
      transparent: true,
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform vec3 uL; uniform float uOn; uniform vec3 uC; varying vec3 vW;
        void main(){
          float d = dot(normalize(vW - uC), uL), day = smoothstep(-0.02, 0.02, d);
          vec3 c = mix(vec3(0.93, 0.47, 0.13), mix(vec3(0.42, 0.47, 0.6), vec3(0.98, 0.52, 0.12), day), uOn);
          gl_FragColor = vec4(c, mix(1.0, mix(0.7, 1.0, day), uOn));
          #include <colorspace_fragment>
        }`,
    });
    const latRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.045, 8, 160), latM); latRing.rotation.x = Math.PI / 2; latRing.renderOrder = 3; spin.add(latRing);
    // 城市的小旗
    const flag = new THREE.Group(); spin.add(flag);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.0004, 0.0004, 0.0085, 6), paint(0x3a3f4a, { keep: true })); pin.position.y = 0.00425; flag.add(pin);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.0052, 0.0034), new THREE.MeshBasicMaterial({ color: 0xd8342a, side: THREE.DoubleSide })); cloth.position.set(0.0027, 0.0068, 0); flag.add(cloth);
    const flagTop = new THREE.Object3D(); flagTop.position.y = 0.0085; flag.add(flagTop);
    // 直射点、从灯射来的光线（课本图 1.24 的红箭头）
    const subM = new THREE.MeshBasicMaterial({ color: 0xd8342a });
    const sub = new THREE.Mesh(new THREE.SphereGeometry(0.0015, 12, 8), subM); sub.renderOrder = 6; group.add(sub);
    const ray = new THREE.Group(); group.add(ray);
    const rayShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.00045, 0.00045, 1, 8), subM); rayShaft.geometry.translate(0, 0.5, 0); ray.add(rayShaft);
    const rayHead = new THREE.Mesh(new THREE.ConeGeometry(0.0018, 0.005, 12), subM); ray.add(rayHead);
    // 走过的位置留下一道浅浅的地轴影子（四道互相平行）
    const ghosts = {};
    for (const k of ORDER) {
      const gG = new THREE.Group(); gG.visible = false; group.add(gG);
      const dashes = 9, Lh = R + 0.012;
      for (let i = 0; i < dashes; i++) {
        const t0 = -Lh + (2 * Lh * i) / dashes, t1 = t0 + (2 * Lh) / dashes * 0.6;
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0005, 0.0005, t1 - t0, 6), new THREE.MeshBasicMaterial({ color: 0x6b7286, transparent: true, opacity: 0.55, depthWrite: false }));
        m.position.copy(AXIS).multiplyScalar((t0 + t1) / 2); m.quaternion.copy(TILT_Q); gG.add(m);
      }
      const ar = POS[k] * D2R; gG.position.set(RORB * Math.cos(ar), HC, -RORB * Math.sin(ar));
      ghosts[k] = gG;
    }
    const globePick = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, HC + R + 0.008, 10), new THREE.MeshBasicMaterial({ visible: false })); globePick.position.y = (HC + R + 0.008) / 2; globePick.userData.pick = true; globe.add(globePick);

    const card = tag('', 'cond'); card.px = [0, -88];

    // ================= 状态 =================
    let cityK = 2, keptCity = null;                                 // 北京；演示时先记下学生选的城市
    const city = () => CITIES[cityK];
    const posOf = (ang) => new THREE.Vector3(RORB * Math.cos(ang * D2R), 0, -RORB * Math.sin(ang * D2R));
    const atPos = (ang) => ORDER.find((k) => Math.abs((((ang - POS[k]) % 360) + 540) % 360 - 180) < 0.6) || null;
    const noonSpin = (ang) => {               // 这个城市正对光源（当地正午）时，泡沫球绕地轴转过的角度
      const Lt = lightDir(ang).applyQuaternion(TILT_Q.clone().invert());
      return Math.atan2(-Lt.z, Lt.x) - city().lon * D2R;
    };
    const fresh = () => ({ demo: false, on: false, ang: 90, angT: 90, held: false, psi: noonSpin(90), psiT: noonSpin(90), arrived: 'A', seen: {}, back: false, dim: 0, said: {} });
    S = fresh();

    const placeCity = () => {
      const c = city(), phi = c.lat * D2R, lam = c.lon * D2R;
      const rr = R * Math.cos(phi) + 0.0003;
      latRing.scale.setScalar(rr); latRing.position.y = R * Math.sin(phi);
      latRing.geometry.dispose(); latRing.geometry = new THREE.TorusGeometry(1, 0.00085 / rr, 8, 160);
      const n = new THREE.Vector3(Math.cos(phi) * Math.cos(lam), Math.sin(phi), -Math.cos(phi) * Math.sin(lam));
      flag.position.copy(n).multiplyScalar(R); flag.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    };
    placeCity();

    // 一个位置上的读数
    const reading = (ang) => {
      const c = city(), phi = c.lat * D2R, dec = decOf(ang), hrs = dayHours(phi, dec), alt = noonAlt(phi, dec);
      return { dec: dec / D2R, hrs, frac: hrs / 24, alt, shadow: 1 / Math.tan(Math.max(0.5, alt) * D2R) };
    };
    const record = (k, loop = false) => {
      const r = reading(POS[k]), c = city();
      log([loop ? 'A<br><small>转了一圈</small>' : k, `直射 <b>${latTxt(r.dec)}</b><br>${c.name}：白天约 <b>${hm(r.hrs)}</b>（${Math.round(r.frac * 100)}%），正午太阳高度 <b>${fix1(r.alt)}°</b>`]);
    };
    const arrive = (k) => {
      if (!S.on) return;
      const key = `${k}|${cityK}`, loop = k === 'A' && !!S.seen.D && !S.back;          // 转了一圈又回到 A
      if (S.seen[key] && !loop) return;
      S.seen[key] = true; S.seen[k] = true; if (loop) S.back = true;
      record(k, loop);
      const r = reading(POS[k]), c = city();
      const more = r.frac > 0.505 ? '亮着的部分<b>超过一半</b>——白天比黑夜长' : r.frac < 0.495 ? '亮着的部分<b>不到一半</b>——白天比黑夜短' : '亮着的部分<b>正好一半</b>——白天、黑夜一样长';
      status(`${k} 处：直射点在 <b>${latTxt(r.dec)}</b>；${c.name}那条纬线${more}，正午太阳高度 ${fix1(r.alt)}°。`);
      if (k === 'B') done('b');
      if (k === 'C') done('c');
      if (k === 'D') done('d');
      if (loop) { done('a'); if (!S.demo) { status('转了一圈，又回到 A：地球公转一周，就是一年。四个位置的记录都在左边了。'); W?.t1.open(); } }
    };

    const A = {
      lamp() {
        S.on = !S.on; sfx.clink?.({ freq: 900, gain: 0.03 });
        if (S.on) { done('light'); status('房间暗下来，光源照着地球仪：地球仪<b>一半亮、一半暗</b>——亮的是昼半球，暗的是夜半球。'); if (S.arrived) arrive(S.arrived); }
        else status('关掉了光源。');
      },
      grab() { S.held = true; S.arrived = null; },
      move(p) {                     // p：地球仪底座该在的位置（拖动时已经加上了抓取偏移）
        if (!p) return;
        let a = Math.atan2(-p.z, p.x) / D2R;
        while (a - S.angT > 180) a -= 360; while (a - S.angT < -180) a += 360;
        S.angT = a;
      },
      drop() {
        S.held = false;
        const k = ORDER.find((kk) => Math.abs((((S.angT - POS[kk]) % 360) + 540) % 360 - 180) < SNAP);
        if (k) { let a = POS[k]; while (a - S.angT > 180) a -= 360; while (a - S.angT < -180) a += 360; S.angT = a; }
      },
      setCity(i) {
        cityK = i; placeCity();
        S.psi = S.psiT = noonSpin(S.ang);
        if (W) W.tbl.clear();
        S.seen = {}; S.back = false;
        bar.undo('b', 'c', 'd', 'a', 'why'); W?.t1.close(); W?.t2.close(); if (W) W.next.hidden = true;
        if (S.on && S.arrived) arrive(S.arrived);
        status(`换成了 <b>${city().name}</b>（${city().lat}°N）：小旗插到了这里，高亮的是它那条纬线。记录清空了，重新走一圈。`);
      },
      reset() { S = fresh(); placeCity(); W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; } bar.undo('light', 'b', 'c', 'd', 'a', 'why'); sky.close(); status('全部重新摆好了，记录也清空了。'); },
    };

    const drag = draggable(group, [
      { obj: globePick, anchor: globe, keepOffset: true, plane: 'xz', offset: 0, hint: '按逆时针方向，端着地球仪绕光源走', onStart: () => A.grab(), onDrag: (p) => A.move(p), onEnd: () => A.drop() },
    ], { taps: [{ obj: lampPick, hint: () => (S.on ? '点一下：关掉光源' : '点一下：调暗房间，打开光源'), onTap: () => A.lamp() }], tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const arcTo = (a0, a1, n = 6) => Array.from({ length: n + 1 }, (_, i) => posOf(a0 + ((a1 - a0) * i) / n));

    // ================= 站上去看（圆窗） =================
    const sky = skyView();
    const flagScreen = () => {
      const cam = window.__lb?.stage?.camera; if (!cam) return [innerWidth / 2, innerHeight * 0.6];
      const v = flagTop.getWorldPosition(new THREE.Vector3()).project(cam);
      return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight];
    };
    const skyState = () => { const c = city(); return { name: c.name, lat: c.lat, dec: decOf(S.ang) / D2R, where: atPos(S.ang) }; };
    const skyBtn = tag('站上去看 ⊙', 'pill mw-go', () => sky.open(flagScreen, skyState()));

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'light', title: '打开光源', todo: '将房间光线调暗：点一下<b>光源</b>，让它照射地球仪。', target: () => (S.on ? null : lamp) },
        { id: 'b', title: '移到 B', todo: '按<b>逆时针</b>方向，端着<b>地球仪</b>绕光源慢慢移到 <b>B</b>，地轴的倾斜方向保持不变；看小旗那条纬线亮着的部分。', target: () => (S.held ? null : globe) },
        { id: 'c', title: '移到 C', todo: '继续逆时针移到 <b>C</b>，看同一条纬线受光的变化。', target: () => (S.held ? null : globe) },
        { id: 'd', title: '移到 D', todo: '继续逆时针移到 <b>D</b>。', target: () => (S.held ? null : globe) },
        { id: 'a', title: '回到 A', todo: '再逆时针回到 <b>A</b>，转完一圈。', target: () => (S.held ? null : globe) },
        { id: 'why', title: '想一想', todo: '四个位置，北半球分别处于哪个季节？在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => {
            // 演示用北京（字幕说的是北京）；演示完换回学生选的城市
            sky.close();
            if (S.demo) { if (keptCity == null) keptCity = cityK; cityK = 2; placeCity(); S.psi = S.psiT = noonSpin(S.ang); }
            else if (keptCity != null) { cityK = keptCity; keptCity = null; placeCity(); }
            W?.citySeg.set(cityK);
          } }),
          shots: [
            { cap: '将房间光线调暗，打开光源，照射地球仪：地球仪一半亮、一半暗。', dur: 4.5, cam: [[0, 0.03, 0.01], [0.05, 0.85, 1], 0.46], during: act.tap(lampPick, 0.2) },
            { cap: 'A 处：直射点在赤道上；北京那条纬线亮着的部分正好一半——白天、黑夜一样长。', dur: 5, cam: [[0, HC, -RORB], [1, 0.35, 0.3], 0.2] },
            { cap: '按逆时针方向，端着地球仪绕光源缓慢移动到 B。地轴的倾斜方向保持不变。', dur: 6, cam: [[0, 0.03, 0.01], [0.05, 0.85, 1], 0.46], during: act.path(globePick, arcTo(90, 180), { t0: 0.05, t1: 0.85, release: 0.88 }) },
            { cap: 'B 处：北极一端歪向光源，直射点移到北回归线；北京那条纬线亮着的部分超过一半——白天长。', dur: 5.5, cam: [[-RORB, HC, 0], [0.15, 0.35, 1], 0.2] },
            { cap: '站上去看：站在北京的地面上，正午的太阳高，人的影子短。', dur: 6, cam: [[-RORB, HC, 0], [0.15, 0.35, 1], 0.2], during: act.seq(act.at(0.05, () => sky.open(flagScreen, skyState())), act.at(0.95, () => sky.close())) },
            { cap: '继续逆时针移到 C：直射点回到赤道，白天、黑夜又一样长。', dur: 6, cam: [[0, 0.03, 0.01], [0.05, 0.85, 1], 0.46], during: act.path(globePick, arcTo(180, 270), { t0: 0.05, t1: 0.85, release: 0.88 }) },
            { cap: '移到 D：南极一端歪向光源，直射点在南回归线；北京白天短，正午太阳低，影子长。', dur: 8, cam: [[0, 0.03, 0.01], [0.05, 0.85, 1], 0.46], during: act.seq(act.path(globePick, arcTo(270, 360), { t0: 0.04, t1: 0.5, release: 0.52 }), act.at(0.58, () => sky.open(flagScreen, skyState())), act.at(0.97, () => sky.close())) },
            { cap: '回到 A：转完一圈，就是一年。四个位置，北半球分别处于哪个季节？演示完了，下面换你自己做。', dur: 6, cam: [[0, 0.03, 0.01], [0.05, 0.85, 1], 0.46], during: act.path(globePick, arcTo(0, 90), { t0: 0.05, t1: 0.8, release: 0.83 }) },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ================= 房间变暗：把舞台的灯调暗；关灯 / 离开时还原 =================
    const stage = window.__lb?.stage;
    const hemi = stage?.scene?.children.find((o) => o.isHemisphereLight), sun = stage?.sun;
    const I0 = { hemi: hemi?.intensity ?? 0, sun: sun?.intensity ?? 0 };
    const applyDim = (k) => { if (hemi) hemi.intensity = I0.hemi * (1 - 0.6 * k); if (sun) sun.intensity = I0.sun * (1 - 0.72 * k); };

    // ================= 每帧 =================
    const step = (h) => {
      // 地球仪：沿轨道走到目标角度；只平移
      const dA = S.angT - S.ang; S.ang += Math.sign(dA) * Math.min(Math.abs(dA), Math.max(Math.abs(dA) * Math.min(1, h * 9), h * 30));
      globe.position.copy(posOf(S.ang));
      const k = !S.held && Math.abs(S.angT - S.ang) < 0.05 ? atPos(S.ang) : null;
      if (k && S.arrived !== k) { S.arrived = k; S.psiT = noonSpin(S.ang); let d = S.psiT - S.psi; d = ((d % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI; S.psiT = S.psi + d; S.spinT = 0; }
      if (!k && !S.held && S.arrived && Math.abs(S.angT - S.ang) > 0.5) S.arrived = null;
      // 到了一个位置：泡沫球转到这个城市正对光源（正午），转好了再记录
      S.psi += (S.psiT - S.psi) * Math.min(1, h * 6);
      if (S.arrived && Math.abs(S.psiT - S.psi) < 0.01) arrive(S.arrived);
      spin.rotation.y = S.psi;
      // 光
      S.dim += ((S.on ? 1 : 0) - S.dim) * Math.min(1, h * 3);
      applyDim(S.dim);
      uOn.value = S.dim;
      const L = lightDir(S.ang); uL.value.copy(L).transformDirection(group.matrixWorld);
      group.updateMatrixWorld(true); uC.value.copy(tilt.getWorldPosition(new THREE.Vector3()));
      bulbM.color.copy(bulbOff).lerp(bulbOn, S.dim); glow.material.opacity = 0.9 * S.dim; pool.material.opacity = S.dim;
      // 直射点、光线
      const center = globe.position.clone().add(C0);
      sub.position.copy(center).addScaledVector(L, R + 0.0008); sub.visible = S.dim > 0.5;
      { const from = LAMP_C.clone().addScaledVector(L.clone().negate(), -0.016), to = center.clone().addScaledVector(L, R + 0.0075);          // 箭头停在铁丝半圆外面（B 处半圆正好挡在直射点前）
        const v = to.clone().sub(from), len = v.length();
        ray.position.copy(from); ray.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
        rayShaft.scale.y = Math.max(0.001, len - 0.005); rayHead.position.y = len - 0.003; ray.visible = S.dim > 0.5; }
      // 走过的位置：地轴的影子
      for (const kk of ORDER) ghosts[kk].visible = !!S.seen[kk] && S.arrived !== kk && S.dim > 0.3;
      // 卡片
      const r = reading(S.ang), c = city(), here = atPos(S.ang);
      card.text(`<div class="cc"><div class="cc-t"><span class="cc-name">${here ? here + ' 处' : '地球仪'}</span></div><div class="cc-more">`
        + `<div class="cc-obs"><b>直射 ${latTxt(r.dec)}</b></div>`
        + `<div class="cc-obs">${c.name}这条纬线：白天约占 <b>${Math.round(r.frac * 100)}%</b><small>（${hm(r.hrs)}）</small></div>`
        + `<div class="cc-obs">正午太阳高度 <b>${fix1(r.alt)}°</b></div></div></div>`).loc(group, center.x, HC + R + 0.006, center.z).show(S.dim > 0.5 && !sky.isOpen);
      skyBtn.loc(group, ...flagWorldLocal()).show(S.dim > 0.5 && !!S.arrived && !S.held && !sky.isOpen && !bar.playing);
      if (sky.isOpen) sky.set(skyState());
    };
    const flagWorldLocal = () => { const p = group.worldToLocal(flagTop.getWorldPosition(new THREE.Vector3())); return [p.x, p.y + 0.006, p.z]; };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.34, d: 0.32, h: 0.1 },
      view: { elev: 34, azim: -4, lookY: 0.3, frameMargin: 1.04 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = () => [...W.tbl.el.querySelectorAll('tbody tr')].map((tr) => `<div>${tr.children[0].innerHTML.replace(/<br><small>(.*)<\/small>/, '（$1）')}：${tr.children[1].innerHTML.replace('<br>', '；')}</div>`).join('');
        const t2 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '为什么会有季节变换？',
          options: ['地球斜着身子公转，地轴的倾斜方向不变，同一纬度地带受太阳照射的情况随着位置变化', '地球离太阳有时近、有时远', '地球自转造成的'],
          wrong: ['这个演示里，四个位置离光源一样远，季节照样变了。', '自转造成的是昼夜交替；季节变换和公转有关。'],
          ok: '对：地轴倾斜、方向不变，地球绕太阳公转，太阳直射点在南北回归线之间来回移动，便产生了季节变换。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); } });
        const t1 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '当地球公转到 A、B、C、D 四个位置时，北半球分别处于哪个季节？',
          options: ['A 春季，B 夏季，C 秋季，D 冬季', 'A 冬季，B 春季，C 夏季，D 秋季', 'A 夏季，B 秋季，C 冬季，D 春季'],
          wrong: ['看 B 处的记录：白天长、正午太阳高，获得的太阳光热多——是哪个季节？', '看 D 处的记录：白天短、正午太阳低——是哪个季节？'],
          ok: '对：B 处直射北回归线，北半球白天长、太阳高，是夏季；D 处直射南回归线，是冬季；A、C 直射赤道，地球从 A 逆时针走到 B，A 是春季、C 是秋季。',
          onOk: () => t2.open() });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const citySeg = seg('你在哪个城市？（小旗插在这里）', CITIES.map((c) => c.name), (_, i) => A.setCity(i), { value: cityK });
        const tbl = table(['位置', '这一天（太阳直射、这座城市）']);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：按太阳光（平行光）算，昼半球正好一半；黄赤交角取课本的 23.5°。昼长按 cos H₀ = −tan φ·tan δ 算，不计大气折射；正午太阳高度 = 90° − |φ − δ|。地球仪不画大陆。' });
        ui.controls.append(citySeg.el, t1.el, t2.el, next, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, t1, t2, next, citySeg, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('图 1.24：中间一盏灯泡（光源），纸上画着公转轨道；地球仪是课本第 14 页那种自己做的泡沫球，地轴和桌面约成 66.5°，小旗插在北京。可以先看<b>老师演示</b>，也可以直接动手。');
      },
      update(dt) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k); sky.update(Math.min(dt, 1 / 30)); },
      dispose() { applyDim(0); bar.dispose(); sky.dispose(); },
      debug: { get S() { return S; }, A, bar, picks: { lamp: lampPick, globe: globePick }, sky, reading,
        qa: qaFlow(drag, [
          { name: '打开光源', tap: lampPick, wait: 2 },
          { name: '移到 B', drag: globePick, to: () => posOf(180), wait: 2 },
          { name: '站上去看', run: () => sky.open(flagScreen, skyState()), wait: 2 },
          { name: '回到桌上', run: () => sky.close(), wait: 1 },
          { name: '移到 C', drag: globePick, to: () => posOf(270), wait: 2 },
          { name: '移到 D', drag: globePick, to: () => posOf(359.9), wait: 2 },
          { name: '回到 A', drag: globePick, to: () => posOf(89.9), wait: 2 },
          { name: '答第一题', run: () => W.t1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.t2.el.querySelector('button').click() },
        ]) },
    };
  },
};

// ================= 站上去看：圆窗里站在这个城市的地面上，看这一天的太阳 =================
// 地面：东 = +x，北 = −z，南 = +z。镜头在北边、朝南看（东在左手边）。人高 PH；太阳画在半径 RD 的天穹上。
function skyView() {
  const PH = 0.3, RD = 0.92;
  const dim = h('div', { class: 'mw-dim' });
  const beam = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); beam.setAttribute('class', 'mw-beam');
  beam.innerHTML = '<defs><linearGradient id="skyg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffe6b0" stop-opacity="0.85"/><stop offset="1" stop-color="#9fc4ff" stop-opacity="0.15"/></linearGradient></defs><path fill="url(#skyg)"/>';
  const eq = h('div', { class: 'mw-eq' }), cap = h('div', { class: 'mw-cap' });
  Object.assign(eq.style, { color: '#23293a', textShadow: '0 1px 0 rgba(255,255,255,0.8)', fontSize: '22px' });
  Object.assign(cap.style, { color: '#3b4254', textShadow: '0 1px 0 rgba(255,255,255,0.8)', fontSize: '14px' });
  const closeB = h('button', { class: 'mw-close', onclick: () => api.close() }, '回到桌上 ×');
  const top = h('div', { class: 'mw-scale' });
  const port = h('div', { class: 'mw-port' });
  const hud = h('div', { class: 'mw-hud' }, eq, cap);
  const root = h('div', { class: 'mw', hidden: true }, dim, beam, port, hud, closeB, top);
  document.body.append(root);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  port.append(renderer.domElement);

  const sc = new THREE.Scene();
  sc.background = canvasTex(4, 256, (g, Wc, Hc) => { const gr = g.createLinearGradient(0, 0, 0, Hc); gr.addColorStop(0, '#7fb0e0'); gr.addColorStop(0.62, '#cfe2f1'); gr.addColorStop(1, '#f2efe4'); g.fillStyle = gr; g.fillRect(0, 0, Wc, Hc); });
  const cam = new THREE.PerspectiveCamera(44, 1, 0.01, 30);
  sc.add(new THREE.HemisphereLight(0xffffff, 0x9a8f78, 1.3));
  const key = new THREE.DirectionalLight(0xfff4dc, 1.5); sc.add(key, key.target);
  // 地面、四个方向
  const ground = new THREE.Mesh(new THREE.CircleGeometry(1.05, 96), new THREE.MeshLambertMaterial({ color: 0xd8cfae })); ground.rotation.x = -Math.PI / 2; sc.add(ground);
  const rim = new THREE.Mesh(new THREE.RingGeometry(1.04, 1.055, 96), new THREE.MeshBasicMaterial({ color: 0x8a8068 })); rim.rotation.x = -Math.PI / 2; rim.position.y = 0.001; sc.add(rim);
  const word = (t, color = '#23293a', size = 0.13) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g, Wc, Hc) => { g.font = 'bold 92px "Songti SC", serif'; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, Wc / 2, Hc / 2 + 6); }), transparent: true, depthWrite: false })); s.scale.setScalar(size); return s; };
  for (const [t, x, z] of [['北', 0, -1], ['东', 1, 0], ['南', 0, 1], ['西', -1, 0]]) { const s = word(t); s.position.set(x * 1.15, 0.04, z * 1.15); sc.add(s); }
  // 人：面朝北（朝着镜头）
  const man = new THREE.Group(); sc.add(man);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.042, 0.19, 18), new THREE.MeshLambertMaterial({ color: 0x5b8fd6 })); body.position.y = 0.095; man.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.046, 20, 14), new THREE.MeshLambertMaterial({ color: 0xf3c9a5 })); head.position.y = PH - 0.046; man.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.048, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), new THREE.MeshLambertMaterial({ color: 0x2c2a33 })); hair.position.y = PH - 0.044; man.add(hair);
  // 影子
  const shadowM = new THREE.MeshBasicMaterial({ color: 0x2b2f3a, transparent: true, opacity: 0.38, depthWrite: false });
  const shadowG = new THREE.PlaneGeometry(0.075, 1); shadowG.translate(0, 0.5, 0);
  const shadow = new THREE.Mesh(shadowG, shadowM); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.003; sc.add(shadow);
  // 太阳、太阳一天走过的路、正午太阳高度的角、阳光
  const sunM = new THREE.MeshBasicMaterial({ color: 0xffcf5a });
  const sunB = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 14), sunM); sc.add(sunB);
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffd46a, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending })); sunGlow.scale.setScalar(0.42); sc.add(sunGlow);
  const pathM = new THREE.MeshBasicMaterial({ color: 0xe0902a });
  let path = null, rise = null, set = null, altArc = null;
  const riseM = new THREE.MeshBasicMaterial({ color: 0xd06a1e });
  const altM = new THREE.MeshBasicMaterial({ color: 0xc2452d });
  const altLab = word('', '#c2452d', 0.16); sc.add(altLab);
  const beamM = new THREE.MeshBasicMaterial({ color: 0xe9a43a, transparent: true, opacity: 0.85 });
  const rayL = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 8), beamM); rayL.geometry.translate(0, 0.5, 0); sc.add(rayL);
  const dirOf = (alt, az) => new THREE.Vector3(Math.sin(az * D2R) * Math.cos(alt * D2R), Math.sin(alt * D2R), -Math.cos(az * D2R) * Math.cos(alt * D2R));

  let st = { name: '', lat: 40, dec: 0, where: null }, built = '';
  const build = () => {
    const phi = st.lat * D2R, dec = st.dec * D2R, sp = sunPath(phi, dec);
    for (const m of [path, rise, set, altArc]) if (m) { sc.remove(m); m.geometry.dispose(); }
    const pts = sp.pts.map((p) => dirOf(p.alt, p.az).multiplyScalar(RD));
    path = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 96, 0.0075, 8, false), pathM); sc.add(path);
    rise = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 8), riseM); rise.position.copy(pts[0]); sc.add(rise);
    set = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 8), riseM); set.position.copy(pts[pts.length - 1]); sc.add(set);
    // 正午：太阳在正南（城市在直射点以北）或正北（以南）
    const alt = noonAlt(phi, dec), az = st.lat >= st.dec ? 180 : 0, sd = dirOf(alt, az);
    sunB.position.copy(sd).multiplyScalar(RD); sunGlow.position.copy(sunB.position);
    key.position.copy(sd).multiplyScalar(5); key.target.position.set(0, 0, 0);
    const len = PH / Math.tan(Math.max(0.5, alt) * D2R);
    shadow.scale.y = len; shadow.rotation.z = az === 180 ? 0 : Math.PI;          // 影子朝着太阳的反方向（平面的 +y 转到地面上是正北）
    // 阳光：从太阳那边过人的头顶，落到影子的头上
    const head = new THREE.Vector3(0, PH, 0), tip = sd.clone().multiplyScalar(-PH / sd.y).add(head);
    const from = head.clone().addScaledVector(sd, 0.45), v = tip.clone().sub(from);
    rayL.position.copy(from); rayL.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize()); rayL.scale.y = v.length();
    // 正午太阳高度：在影子的头上，地面和阳光之间的夹角
    const ar = Math.min(0.13, Math.max(0.05, len * 0.8)), ap = [];
    for (let i = 0; i <= 24; i++) ap.push(dirOf((alt * i) / 24, az).multiplyScalar(ar).add(tip).setY(dirOf((alt * i) / 24, az).y * ar + 0.004));
    altArc = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ap), 48, 0.0045, 6, false), altM); sc.add(altArc);
    altLab.material.map.dispose(); altLab.material.map = canvasTex(256, 128, (g, Wc, Hc) => { g.font = 'bold 70px "Times New Roman", serif'; g.fillStyle = '#c2452d'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(`${fix1(alt)}°`, Wc / 2, Hc / 2); });
    altLab.scale.set(0.3, 0.15, 1); altLab.position.copy(dirOf(alt / 2, az).multiplyScalar(ar + 0.06)).add(tip).add(new THREE.Vector3(-0.13, 0.03, 0));          // 往西（画面右边）挪开，不压着人
    // 文字
    const hrs = dayHours(phi, dec), ratio = 1 / Math.tan(Math.max(0.5, alt) * D2R);
    eq.innerHTML = `站在${st.name}（${st.lat}°N）看${st.where ? ` · ${st.where} 处` : ''}`;
    const B = (t) => `<b style="color:#c2452d">${t}</b>`;
    cap.innerHTML = `正午太阳高度 ${B(fix1(alt) + '°')}，影子约是身高的 ${B(ratio.toFixed(2))} 倍；白天约 ${B(hm(hrs))}<br>`
      + (sp.polar === 'day' ? '太阳整天不落（极昼）' : sp.polar === 'night' ? '太阳整天不出（极夜）' : `太阳从${B(riseWord(sp.pts[0].az))}升起，从${B(setWord(sp.pts[sp.pts.length - 1].az))}落下；中午在${B(az === 180 ? '正南' : '正北')}`);
    top.textContent = '站上去看 · 这一天太阳走过的路（橙线），正午的太阳和影子';
  };

  // 视窗位置、拖动转视角
  let openK = 0, opening = false, anchor = null, yaw = 0.3, pitch = 0.62, dist = 3.2, dragging = null;
  const layout = () => {
    const [fx, fy] = anchor ? anchor() : [innerWidth / 2, innerHeight * 0.7];
    const D = Math.round(Math.min(480, innerHeight * 0.54, innerWidth * 0.4));
    const cx = Math.max(D / 2 + 440, Math.min(innerWidth - D / 2 - 70, fx)), cy = Math.max(D / 2 + 92, Math.min(fy - D / 2 - 40, innerHeight * 0.4));
    const k = ease(openK), r = (D / 2) * (0.15 + 0.85 * k);
    port.style.cssText = `left:${cx - D / 2}px;top:${cy - D / 2}px;width:${D}px;height:${D}px;clip-path:circle(${r}px at 50% 50%);opacity:${Math.min(1, k * 1.5)}`;
    hud.style.cssText = `left:${cx - D * 0.6}px;top:${cy + D / 2 + 12}px;width:${D * 1.2}px;opacity:${k}`;
    closeB.style.cssText = `left:${cx + D * 0.3}px;top:${cy - D / 2 + 6}px;opacity:${k}`;
    top.style.cssText = `left:${cx - D / 2}px;top:${cy - D / 2 - 26}px;width:${D}px;opacity:${k}`;
    dim.style.opacity = k.toFixed(3); dim.style.setProperty('--fx', fx + 'px'); dim.style.setProperty('--fy', fy + 'px');
    const dx = cx - fx, dy = cy - fy, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, w0 = 12;
    beam.setAttribute('width', innerWidth); beam.setAttribute('height', innerHeight);
    beam.querySelector('path').setAttribute('d', `M${fx + nx * w0},${fy + ny * w0} L${cx + nx * r * 0.9},${cy + ny * r * 0.9} L${cx - nx * r * 0.9},${cy - ny * r * 0.9} L${fx - nx * w0},${fy - ny * w0} Z`);
    beam.style.opacity = (k * 0.8).toFixed(3);
    const px = D * Math.min(devicePixelRatio, 2);
    if (renderer.domElement.width !== px) { renderer.setSize(D, D, false); renderer.domElement.style.cssText = `width:${D}px;height:${D}px`; cam.aspect = 1; cam.updateProjectionMatrix(); }
  };
  const ease = (k) => k * k * (3 - 2 * k);
  port.addEventListener('pointerdown', (e) => { dragging = [e.clientX, e.clientY, yaw, pitch]; port.setPointerCapture(e.pointerId); e.stopPropagation(); });
  port.addEventListener('pointermove', (e) => { if (!dragging) return; yaw = dragging[2] - (e.clientX - dragging[0]) * 0.008; pitch = clamp(dragging[3] + (e.clientY - dragging[1]) * 0.006, 0.05, 1.2); });
  port.addEventListener('pointerup', () => { dragging = null; });
  port.addEventListener('wheel', (e) => { dist = clamp(dist + e.deltaY * 0.004, 1.8, 4); e.preventDefault(); }, { passive: false });
  dim.addEventListener('pointerdown', (e) => { e.stopPropagation(); api.close(); });
  const onKey = (e) => { if (api.isOpen && e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); api.close(); } };
  addEventListener('keydown', onKey, true);

  const api = {
    get isOpen() { return opening; },
    open(anchorFn, s) { anchor = anchorFn; if (s) api.set(s); opening = true; root.hidden = false; },
    close() { opening = false; },
    set(s) { st = { ...st, ...s }; const k = `${st.name}|${st.lat}|${st.dec.toFixed(2)}|${st.where}`; if (k !== built) { built = k; build(); } },
    update(dt) {
      openK = clamp(openK + (opening ? dt / 0.8 : -dt / 0.45), 0, 1);
      if (openK <= 0 && !opening) { root.hidden = true; return; }
      root.classList.toggle('live', opening);
      layout();
      const tg = new THREE.Vector3(0, 0.26, 0.08);
      cam.position.set(tg.x - Math.sin(yaw) * Math.cos(pitch) * dist, tg.y + Math.sin(pitch) * dist, tg.z - Math.cos(yaw) * Math.cos(pitch) * dist);
      cam.lookAt(tg);
      renderer.render(sc, cam);
    },
    dispose() { removeEventListener('keydown', onKey, true); renderer.dispose(); root.remove(); },
  };
  return api;
}
