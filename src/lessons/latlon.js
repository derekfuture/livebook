// 第一章 第二节 地球与地球仪 · 利用经纬网定位（课本七年级上册第 19 页图 1.17；第 15–20 页图 1.11、1.15，活动：学会利用经纬网定位，表 1.6）。
//
// 地球仪还是课本第 14 页自己做的那种泡沫球（和公转那张活页同一个）：毛线赤道，回归线、极圈画成虚线；这一张在球上画满经纬网——
// 每隔 10° 一条经线、一条纬线，每隔 20° 写上度数，0° 经线、180° 经线加粗。不画大陆：带大陆的地球仪就是一张要送审的世界地图（PLAN-geo.md 第七节）。
// 学生：拖着小红旗在球上走——旗插在哪，就亮出过这一点的那条经线（红）和那条纬线（蓝），旁边写出经纬度；拖着球转一转，看背面；
//   旗拖到球边上，球会跟着转过来，可以一直往前走。
//   ① 课本图 1.17：把旗插到“泰坦尼克号”失事地点 41.73°N，49.95°W；
//   ② 沿着赤道一直往东拖，拖过 180° 经线：东经变成西经（预测题的答案由自己的手揭开）；
//   ③ 沿着经线一直往北拖到北极：纬度最大是 90°；
//   ④ 表 1.6：按经纬度插旗，插对了旗上写出城市（北京是课本给的例子）。
// 经纬度：旗在球上的方向 n = (cos φ cos λ, sin φ, −cos φ sin λ)（球自己的坐标，y 是地轴，λ 东经为正），和公转那张一样。
import * as THREE from 'three';
import { table, buttons } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { canvasTex } from './kit/props.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, paperSheet, think } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked, hull } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const D2R = Math.PI / 180;
const EPS = 23.5 * D2R;                                   // 地轴和桌面成 66.5°（课本图 1.10）
const R = 0.05, RW = R + 0.0045, HC = 0.084;              // 泡沫球半径、铁丝半圆的半径、球心离桌面多高
const AXIS = new THREE.Vector3(Math.sin(EPS), Math.cos(EPS), 0);
const TILT_Q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), AXIS);
const C0 = new THREE.Vector3(0, HC, 0);
const TOL = 1.5;                                          // 松手时离要找的地方不到几度（球面上的角距），就算插对了
const TITANIC = { lat: 41.73, lon: -49.95, name: '“泰坦尼克号”失事地点', where: '北大西洋' };
const BEIJING = { lat: 40, lon: 116, name: '北京' };          // 表 1.6 第一行，课本给的例子
const CITIES = [          // 表 1.6 其余几行
  { lat: 51, lon: 0, name: '伦敦' },
  { lat: 60, lon: 25, name: '赫尔辛基' },
  { lat: 0, lon: -79, name: '基多' },
  { lat: 30, lon: 120, name: '杭州' },
  { lat: -23, lon: -43, name: '里约热内卢' },
];
const RED = '#e8890c', BLUE = '#1c6fc4';                  // 过小红旗的经线、纬线：两种颜色分开，读数卡里的经度、纬度也用这两种颜色

const wrap = (lon) => ((((lon + 180) % 360) + 360) % 360) - 180;
const nOf = (lat, lon) => new THREE.Vector3(Math.cos(lat * D2R) * Math.cos(lon * D2R), Math.sin(lat * D2R), -Math.cos(lat * D2R) * Math.sin(lon * D2R));
const llOf = (n) => ({ lat: Math.asin(clamp(n.y, -1, 1)) / D2R, lon: Math.atan2(-n.z, n.x) / D2R });
const angDist = (a, b) => Math.acos(clamp(nOf(a.lat, a.lon).dot(nOf(b.lat, b.lon)), -1, 1)) / D2R;
const num = (x, d) => { const s = (Math.round(x * 10 ** d) / 10 ** d).toFixed(d); return d ? s.replace(/\.?0+$/, '') : s; };
const latTxt = (v, d = 1) => (Math.abs(v) < 0.05 ? '0°' : `${num(Math.abs(v), d)}°${v > 0 ? 'N' : 'S'}`);
const lonTxt = (v, d = 1) => { const a = Math.abs(v); return a < 0.05 ? '0°' : a > 179.95 ? '180°' : `${num(a, d)}°${v > 0 ? 'E' : 'W'}`; };
const ease = (k) => k * k * (3 - 2 * k);

export default {
  id: 'latlon',
  fig: '图1.17',
  title: '利用经纬网定位',
  stampText: '活动',
  style: 'real',
  flow: 'explore',
  ask: '小红旗插在赤道和 0° 经线相交的地方，沿着赤道一直往东走。它的经度会怎样变？',
  guess: { options: ['越来越大，一直加到 360°', '加到 180° 以后变成西经，度数越来越小', '一直是东经，加到 180° 以后又从 0° 开始'], answer: 1 },          // 动手看里的“先猜一下（可以不猜）”
  need: '把小红旗插到“泰坦尼克号”失事地点（41.73°N，49.95°W）；沿着纬线往东拖过 180° 经线、沿着经线往北拖到北极，看经度、纬度怎么变；再按表 1.6 的经纬度插旗，认识这些位置是哪五座城市',
  conclusion: {
    crops: [{ page: 23, rect: [60, 316, 360, 420] }],
    quote: '在地球仪上，经线和纬线相互交织，形成经纬网（图1.17）。通常，我们会利用经纬网定位。地球表面任一地点的位置，可以用相交于该点的经线和纬线确定，用经纬度表示。例如，“泰坦尼克号”失事地点的经纬度位置为41.73°N，49.95°W（图1.17）。',
    why: '经度从 0° 经线（本初子午线）算起，向东、向西各分 180°，称为东经、西经，分别用 E、W 表示；东经的度数往东越来越大，西经的度数往西越来越大，东经和西经的 180° 是同一条经线。纬度从赤道（0°）算起，向北、向南各分 90°，称为北纬、南纬，分别用 N、S 表示，北极、南极分别是 90°N、90°S（课本第 15、17 页）。<br>表 1.6：51°N，0° 是<b>伦敦</b>；60°N，25°E 是<b>赫尔辛基</b>；0°，79°W 是<b>基多</b>；30°N，120°E 是<b>杭州</b>；23°S，43°W 是<b>里约热内卢</b>。',
    src: '课本七年级上册第 15–20 页 · 第一章 第二节 地球与地球仪（利用经纬网定位；活动：学会利用经纬网定位，表 1.6）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null, said = '';
    const status = (m) => { if (!S.demo) { said = m; W?.status(m); } else bar.caption(m); };          // said：学生这边最后一句（老师演示完放回去）
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };

    paperSheet(group, { w: 0.22, d: 0.17, x: 0, z: 0.01 });

    // ================= 地球仪：课本第 14 页那种（泡沫球 + 铁丝 + 橡皮泥），这里画满经纬网 =================
    const globe = new THREE.Group(); group.add(globe);
    const wireM = paint(0x4f5560, { keep: true });
    const tubeAlong = (pts, r = 0.0013) => inked(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(8, pts.length * 3), r, 8, false), wireM), { width: 0.4 });
    for (const sg of [-1, 1]) globe.add(tubeAlong([C0.clone().addScaledVector(AXIS, sg * (R + 0.0045)), C0.clone().addScaledVector(AXIS, sg * (R + 0.0068))]));        // 穿过两极的铁丝（地轴）：球里面、胶布里面那一段看不见，只做露在外面的两头
    { const pts = []; for (let i = 0; i <= 28; i++) { const th = EPS + ((Math.PI - EPS) * i) / 28; pts.push(C0.clone().add(new THREE.Vector3(Math.sin(th) * RW, Math.cos(th) * RW, 0))); }
      pts.unshift(C0.clone().addScaledVector(AXIS, R + 0.0068));
      pts.push(new THREE.Vector3(0, HC - RW - 0.006, 0), new THREE.Vector3(0, 0.02, 0));
      globe.add(tubeAlong(pts)); }                                 // 沿球外侧弯成半圆，再往下
    { const pts = []; for (let i = 0; i <= 44; i++) { const a = i * 0.42, r = 0.006 + i * 0.00042; pts.push(new THREE.Vector3(Math.cos(a) * r, 0.0024, Math.sin(a) * r)); }
      globe.add(tubeAlong(pts, 0.0011)); }                         // 卷成底座
    const clay = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.022, 0.02, 28), paint(0x9fd0c6, { keep: true })), { width: 0.6 }); clay.position.y = 0.01; globe.add(clay);
    for (const s of [-1, 1]) {
      const tape = new THREE.Mesh(new THREE.CylinderGeometry(0.0034, 0.0034, 0.005, 14), paint(0xf2efe6)); tape.position.copy(C0).addScaledVector(AXIS, s * (R + 0.0018)); tape.quaternion.copy(TILT_Q); globe.add(tape);
    }
    const tilt = new THREE.Group(); tilt.position.copy(C0); tilt.quaternion.copy(TILT_Q); globe.add(tilt);
    const spin = new THREE.Group(); tilt.add(spin);
    // 泡沫球上的经纬网：每 10° 一条细线，每 20° 写度数；0°、180° 经线加粗；回归线、极圈虚线（同公转那张）
    const ballTex = canvasTex(4096, 2048, (g, Wc, Hc) => {
      g.fillStyle = '#fbfaf5'; g.fillRect(0, 0, Wc, Hc);
      for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(150,140,120,${Math.random() * 0.06})`; g.beginPath(); g.arc(Math.random() * Wc, Math.random() * Hc, 1 + Math.random() * 3, 0, 7); g.fill(); }     // 泡沫的小颗粒
      const X = (lon) => ((lon + 180) / 360) * Wc, Y = (lat) => ((90 - lat) / 180) * Hc;
      g.strokeStyle = 'rgba(70,96,140,0.5)'; g.lineWidth = 2.2;
      for (let lon = -180; lon < 180; lon += 10) { g.beginPath(); g.moveTo(X(lon), 0); g.lineTo(X(lon), Hc); g.stroke(); }
      for (let lat = -80; lat <= 80; lat += 10) { g.beginPath(); g.moveTo(0, Y(lat)); g.lineTo(Wc, Y(lat)); g.stroke(); }
      g.strokeStyle = '#2f3d5c'; g.lineWidth = 5;
      for (const lon of [0, -180, 180]) { g.beginPath(); g.moveTo(X(lon), 0); g.lineTo(X(lon), Hc); g.stroke(); }
      g.strokeStyle = '#3f74b0'; g.lineWidth = 4.5;
      for (const lat of [23.5, -23.5, 66.5, -66.5]) { const k = 1 / Math.cos(lat * D2R); g.setLineDash([30 * k, 20 * k]); g.beginPath(); g.moveTo(0, Y(lat)); g.lineTo(Wc, Y(lat)); g.stroke(); }
      g.setLineDash([]);
      // 度数：经度写在赤道上方，纬度写在 0°、90°E、180°、90°W 四条经线旁边（转到哪一面都看得到）；离赤道远的字按 1/cos 拉宽，贴到球上才不显得窄
      g.fillStyle = '#2b3550'; g.textBaseline = 'middle';
      const word = (t, x, y, lat, align = 'center', size = 40) => { const k = 1 / Math.cos(lat * D2R); g.save(); g.translate(x, y); g.scale(k, 1); g.font = `600 ${size}px "Times New Roman", serif`; g.textAlign = align; g.fillText(t, 0, 0); g.restore(); };
      for (let lon = -160; lon < 180; lon += 20) word(lonTxt(lon, 0), X(lon), Y(0) - 34, 2);
      word('180°', X(-180), Y(0) - 34, 2); word('180°', X(180), Y(0) - 34, 2);          // 接缝两边各画一半，贴到球上是一个字
      for (const mlon of [0, 90, -180, -90]) for (let lat = -80; lat <= 80; lat += 20) { if (!lat) continue; word(latTxt(lat, 0), X(mlon) + 10, Y(lat) - 20, lat, 'left', 36); }
      g.font = '600 34px "Songti SC", serif'; g.textAlign = 'center';
      word('赤道', X(-10), Y(0) + 34, 2, 'center', 34);
    }, {});
    ballTex.anisotropy = 8;
    const ballM = new THREE.ShaderMaterial({
      uniforms: { map: { value: ballTex } },
      vertexShader: 'varying vec2 vUv; varying vec3 vN; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying vec3 vN;
        void main(){ vec3 base = texture2D(map, vUv).rgb; float room = 0.8 + 0.22 * max(dot(normalize(vN), normalize(vec3(-0.35, 0.9, 0.45))), 0.0); gl_FragColor = vec4(base * room, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    const ball = hull(new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), ballM), 0.0009); spin.add(ball);
    const ballPick = new THREE.Mesh(new THREE.SphereGeometry(R * 1.02, 24, 16), new THREE.MeshBasicMaterial({ visible: false })); ballPick.userData.pick = true; ballPick.userData.track = true; spin.add(ballPick);          // 转球用（球是圆的，跟着转也不影响拾取）
    const yarn = new THREE.Mesh(new THREE.TorusGeometry(R + 0.0005, 0.0011, 8, 128), paint(0xc8462e, { keep: true })); yarn.rotation.x = Math.PI / 2; spin.add(yarn);       // 毛线赤道

    // 过小红旗的那条经线（红，半个大圆，从北极到南极）、那条纬线（蓝，一个圈）
    const merM = new THREE.MeshBasicMaterial({ color: RED }), parM = new THREE.MeshBasicMaterial({ color: BLUE });
    const mer = new THREE.Mesh(new THREE.TorusGeometry(R + 0.0008, 0.00055, 8, 128, Math.PI), merM); mer.renderOrder = 3; spin.add(mer);
    mer.geometry.rotateZ(-Math.PI / 2);          // 半圆从南极经过 0° 经线和赤道的交点到北极；再绕地轴转到这条经线
    let par = null, parLat = null;
    const setPar = (lat) => {
      if (parLat != null && Math.abs(lat - parLat) < 0.2 && (Math.abs(lat) >= 89.95) === (Math.abs(parLat) >= 89.95)) return; parLat = lat;
      if (Math.abs(lat) >= 89.95) { if (par) { spin.remove(par); par.geometry.dispose(); par = null; } return; }          // 极点是一个点：没有纬线圈
      const rr = Math.max(0.0006, (R + 0.0008) * Math.cos(lat * D2R));
      if (par) { spin.remove(par); par.geometry.dispose(); }
      par = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.00055, 8, 128), parM); par.rotation.x = Math.PI / 2; par.position.y = (R + 0.0008) * Math.sin(lat * D2R); par.renderOrder = 3; spin.add(par);
    };

    // 小红旗
    const mkFlag = (color, big) => {
      const f = new THREE.Group(), L = big ? 0.017 : 0.011;
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(big ? 0.0006 : 0.00045, big ? 0.0006 : 0.00045, L, 6), paint(0x3a3f4a, { keep: true })); pin.position.y = L / 2; f.add(pin);
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(big ? 0.0105 : 0.0068, big ? 0.0068 : 0.0044), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })); cloth.position.set((big ? 0.0105 : 0.0068) / 2 + 0.0002, L - (big ? 0.0034 : 0.0022), 0); f.add(cloth);
      const top = new THREE.Object3D(); top.position.y = L + 0.002; f.add(top);
      return { f, top };
    };
    const { f: flag, top: flagTop } = mkFlag(0xd8342a, true); spin.add(flag);
    const flagPick = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 12, 8), new THREE.MeshBasicMaterial({ visible: false })); flagPick.position.y = 0.0115; flagPick.userData.pick = true; flagPick.userData.track = true; flag.add(flagPick);
    const place = (obj, lat, lon, lift = 0) => { const n = nOf(lat, lon); obj.position.copy(n).multiplyScalar(R + lift); obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n); };

    // 找到的地方：一面小蓝旗，旗上写名字（转到背面时不写）
    const marks = [];
    const addMark = (p, label) => {
      const { f, top } = mkFlag(0x2f64b8, false); place(f, p.lat, p.lon); spin.add(f);
      const t = tag(label, 'pill'); t.loc(top, 0, 0.004, 0);
      marks.push({ p, f, t });
    };
    const clearMarks = () => { for (const m of marks.splice(0)) { spin.remove(m.f); m.t.remove(); } };

    // 读数卡：小红旗的经纬度（纬度蓝、经度红，和亮着的两条线一个颜色）
    const card = tag('', 'cond'); card.px = [0, -64];

    // ================= 状态 =================
    const camDir = () => {          // 镜头在球心的哪个方向（球自己的坐标，不算转动）
      const cam = window.__lb?.stage?.camera; if (!cam) return new THREE.Vector3(0, 0, 1);
      const c = tilt.getWorldPosition(new THREE.Vector3()), d = cam.getWorldPosition(new THREE.Vector3()).sub(c).normalize();
      return d.applyQuaternion(tilt.getWorldQuaternion(new THREE.Quaternion()).invert());
    };
    const faceLon = (lon) => { const d = camDir(); return Math.atan2(-d.z, d.x) - lon * D2R; };          // 球转多少，这条经线正对镜头
    const fresh = () => ({ demo: false, lat: 0, lon: 0, psi: -65 * D2R, psiT: -65 * D2R, held: false, found: {}, titanic: false, east: false, eastFrom: null, north: false, said: {} });          // 镜头在正前方：转 −65°，正对镜头的是 25°W 一带（泰坦尼克号就在这一面）
    S = fresh();
    let started = false;

    const showFlag = () => {
      place(flag, S.lat, S.lon);
      mer.rotation.y = S.lon * D2R; mer.visible = Math.abs(S.lat) < 89.95;          // 在极点上，所有经线都经过这一点：不单亮哪一条
      setPar(S.lat);
    };
    showFlag();
    addMark(BEIJING, '北京（例）');

    const where = (p) => `${p.lat > 0.05 ? '北纬（赤道以北）' : p.lat < -0.05 ? '南纬（赤道以南）' : '赤道上'}、${Math.abs(p.lon) < 0.05 ? '0° 经线上' : Math.abs(p.lon) > 179.95 ? '180° 经线上' : p.lon > 0 ? '东经（0° 经线以东）' : '西经（0° 经线以西）'}`;

    const A = {
      grab() { S.held = true; started = true; },
      /** 小红旗插到 (lat, lon)：学生拖的、演示里走的，都走这一条 */
      moveTo(lat, lon) {
        lat = clamp(lat, -90, 90); lon = wrap(lon);
        const d = wrap(lon - S.lon);
        if (lon > 120 && lon < 179.9) S.eastFrom = lon; else if (lon > -120 && lon < 120) S.eastFrom = null;          // 记下在 180° 经线东边最后到过哪里
        if (S.held && !S.east && S.eastFrom != null && lon < -120 && lon > -179.9 && d > 0) {          // 往东越过 180° 经线：东经变成西经
          S.east = true; done('east');
          log([latTxt(lat), `${lonTxt(S.eastFrom)} → ${lonTxt(lon)}`, '往东走过 180° 经线：东经变成西经']);
          status(`越过了 <b>180° 经线</b>：刚才还是 <b>${lonTxt(S.eastFrom)}</b>，现在是 <b>${lonTxt(lon)}</b>——东经加到 180° 就到头了，再往东是<b>西经</b>，度数越来越小。经度最大是 180°，没有 360°。`);
          checkAll();
        }
        if (S.held && !S.north && lat >= 88.5 && !S.said.pole) { S.said.pole = true; status(`快到北极了：<b>${latTxt(lat)}</b>。松手，小红旗会落到北极点上。`); }
        S.lat = lat; S.lon = lon; showFlag();
      },
      drop() {
        S.held = false;
        if (S.lat >= 88.5) {          // 拖到北极附近松手：落到北极点上（纬度 90°N），再记下来
          S.lat = 90; showFlag(); S.said.pole = false;
          if (!S.north) {
            S.north = true; done('north'); sfx.clink?.({ freq: 760, gain: 0.03 });
            log(['90°N', '所有经线都经过', '一直往北走到北极：纬度加到 90° 就到头了']);
            status('到了<b>北极</b>：纬度是 <b>90°N</b>，再也加不上去了——纬度最大是 90°。所有经线都在这里汇成一点，所以北极不用经度来说明位置。');
            checkAll();
          } else status('小红旗在<b>北极</b>：90°N，所有经线都在这里汇成一点。');
          return;
        }
        if (nOf(S.lat, S.lon).applyQuaternion(spin.quaternion).dot(camDir()) < 0.35) { let t = faceLon(S.lon); while (t - S.psiT > Math.PI) t -= 2 * Math.PI; while (t - S.psiT < -Math.PI) t += 2 * Math.PI; S.psiT = t; }          // 旗插在了背面：球转过来给你看
        const here = { lat: S.lat, lon: S.lon };
        const near = (p) => angDist(here, p) < TOL;
        if (!S.titanic && near(TITANIC)) {
          S.titanic = true; S.lat = TITANIC.lat; S.lon = TITANIC.lon; showFlag(); done('titanic'); sfx.clink?.({ freq: 880, gain: 0.03 });
          log([latTxt(TITANIC.lat, 2), lonTxt(TITANIC.lon, 2), `${TITANIC.name}（${TITANIC.where}）`]);
          status(`插对了（离得很近，小红旗落到了这一点上）：<b>41.73°N，49.95°W</b>——${TITANIC.name}，在<b>北大西洋</b>。一条经线（49.95°W）和一条纬线（41.73°N）相交在这一点，用这一对经纬度就说清了它在哪里。`);
          checkAll();
          return;
        }
        const c = CITIES.find((x) => !S.found[x.name] && near(x));
        if (c) {
          S.found[c.name] = true; S.lat = c.lat; S.lon = c.lon; showFlag(); addMark(c, c.name); sfx.clink?.({ freq: 990, gain: 0.03 });
          log([latTxt(c.lat, 0), lonTxt(c.lon, 0), c.name]);
          const left = CITIES.filter((x) => !S.found[x.name]);
          status(`<b>${latTxt(c.lat, 0)}，${lonTxt(c.lon, 0)}</b> 是 <b>${c.name}</b>。${left.length ? `还有 ${left.length} 个：${left.map((x) => `${latTxt(x.lat, 0)}，${lonTxt(x.lon, 0)}`).join('；')}。` : '表 1.6 的五座城市都找到了。'}`);
          if (!left.length) done('cities');
          checkAll();
          return;
        }
        status(`小红旗：<b>${latTxt(S.lat)}，${lonTxt(S.lon)}</b>——${where(here)}。`);
      },
      spinBy(dPsi) { S.psiT += dPsi; started = true; },
      /** 四件事（泰坦尼克号、往东走、往北走、五座城市）都做完了，才出“想一想” */
      todo() { return [!S.titanic && '插到“泰坦尼克号”失事地点', !S.east && '沿着纬线往东拖过 180° 经线', !S.north && '往北拖到北极', CITIES.some((c) => !S.found[c.name]) && '按表 1.6 找城市'].filter(Boolean); },
      reset() {
        W?.ui?.relock?.(); S = fresh(); clearMarks(); addMark(BEIJING, '北京（例）'); showFlag();
        if (W) { W.tbl.clear(); W.tbl.add(['40°N', '116°E', '北京（课本的例子）']); W.t1.close(); W.next.hidden = true; }
        bar.undo('titanic', 'east', 'north', 'cities', 'why'); status('全部重新摆好了：小红旗回到 0°，0°，记录也清空了。');
      },
    };

    function checkAll() {
      if (S.demo) return;
      const left = A.todo();
      if (!left.length) { W?.t1.open(); return; }
      if (S.found && CITIES.every((c) => S.found[c.name])) status(`${said} 还差：${left.join('；')}。都做完了再回答“想一想”。`);
    }

    // 屏幕射线 → 球面上的经纬度（射线擦过球边时，取球边上最近的那一点）
    const rayLL = (ray) => {
      group.updateMatrixWorld(true);
      const c = tilt.getWorldPosition(new THREE.Vector3()), r = R * tilt.getWorldScale(new THREE.Vector3()).x;
      const hit = ray.ray.intersectSphere(new THREE.Sphere(c, r), new THREE.Vector3());
      const p = hit || ray.ray.closestPointToPoint(c, new THREE.Vector3()).sub(c).setLength(r).add(c);
      return llOf(spin.worldToLocal(p).normalize());
    };
    // 演示、质检拖旗时给的是实验里的一点：从球心指过去的方向就是旗该插的地方
    const pointLL = (p) => { group.updateMatrixWorld(true); return llOf(spin.worldToLocal(group.localToWorld(p.clone())).normalize()); };
    const surf = (lat, lon) => { group.updateMatrixWorld(true); return group.worldToLocal(spin.localToWorld(nOf(lat, lon).multiplyScalar(R))); };          // 这个经纬度在球面上的哪一点（实验的坐标）

    const tip = tag('', 'pill');
    const drag = draggable(group, [
      { obj: flagPick, plane: 'xy', hint: '拖着小红旗在球上走', onStart: () => A.grab(), onDrag: (p) => { const ll = pointLL(p); A.moveTo(ll.lat, ll.lon); }, onEnd: () => A.drop() },
      { obj: ballPick, plane: 'xy', hint: '拖着地球仪转一转', onStart: (p) => { drag0 = p ? p.x : 0; }, onDrag: (p) => { if (p) { A.spinBy((p.x - drag0) / R); drag0 = p.x; } } },
    ], { tip });
    let drag0 = 0, mode = null;

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'titanic', title: '泰坦尼克号', todo: '课本图 1.17：把<b>小红旗</b>拖到“泰坦尼克号”失事地点——<b>41.73°N，49.95°W</b>。先沿着赤道找到那条经线，再沿着经线往北找纬线。', target: () => (S.held ? null : flag) },
        { id: 'east', title: '往东走', todo: '沿着一条纬线（比如赤道）把小红旗<b>一直往东拖</b>（拖到球边上，球会跟着转过来），拖过 <b>180° 经线</b>，看经度怎么变。', target: () => (S.held ? null : flag) },
        { id: 'north', title: '往北走', todo: '沿着一条经线把小红旗<b>一直往北拖</b>，拖到<b>北极</b>，看纬度怎么变。', target: () => (S.held ? null : flag) },
        { id: 'cities', title: '找城市', todo: '表 1.6：按经纬度插旗——<b>51°N，0°</b>；<b>60°N，25°E</b>；<b>0°，79°W</b>；<b>30°N，120°E</b>；<b>23°S，43°W</b>。插对了，旗上会写出是哪座城市。', target: () => (S.held ? null : flag) },
        { id: 'why', title: '想一想', todo: '经度和纬度各分多少度、怎么表示？在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => {
            clearMarks(); addMark(BEIJING, '北京（例）'); for (const c of CITIES) if (S.found[c.name]) addMark(c, c.name); showFlag();
            if (S.demo) W?.status('老师演示中：看画面下面的字幕。你的小红旗和记录先存着，演示完放回来。'); else if (said) W?.status(said);
          } }),
          shots: [
            { cap: '课本第 14 页那种自己做的地球仪：经线、纬线织成经纬网。小红旗插在 0°，0°——赤道和 0° 经线（本初子午线）相交的地方。', dur: 5, during: spinTo(-25, 0.05, 0.5) },
            { cap: '先找经线：沿着赤道往西拖，一直拖到 49.95°W 那条经线（50°W 旁边）。', dur: 5.5, cam: () => [C0.toArray(), [0, 0.2, 1], 0.2], during: llPath([[0, 0], [0, -49.95]], { t0: 0.08, t1: 0.82 }) },
            { cap: '再沿着这条经线往北拖到 41.73°N：这就是“泰坦尼克号”失事的地方——北大西洋。一条经线、一条纬线相交在这一点。', dur: 6, cam: () => [C0.toArray(), [0, 0.2, 1], 0.2], during: llPath([[0, -49.95], [41.73, -49.95]], { t0: 0.08, t1: 0.7 }) },
            { cap: '沿着赤道一直往东走：拖到球边上，地球仪跟着转过来。过了 180° 经线，东经变成西经，度数越来越小——经度最大是 180°。', dur: 9, during: llPath([[41.73, -49.95], [0, -40], [0, 60], [0, 150], [0, 200]], { t0: 0.05, t1: 0.9, follow: true }) },
            { cap: '按经纬度找城市：30°N，120°E——是杭州。用经纬度，地球表面任何一个地方都能说清楚在哪里。', dur: 7, during: llPath([[0, 200], [30, 120]], { t0: 0.1, t1: 0.75, follow: true }) },
          ],
        },
      },
    });

    // 演示里的动作：都走学生拖旗、转球的同一套处理函数（A.grab / A.moveTo / A.drop / S.psiT），只是由时间推着走
    function llPath(pts, { t0 = 0.05, t1 = 0.8, follow = false } = {}) {
      let st = null;
      return (k) => {
        if (k < t0) { st = null; return; }
        if (st?.done) return;
        if (!st) { st = {}; A.grab(); }
        const u = ease(clamp((k - t0) / Math.max(1e-3, t1 - t0), 0, 1)) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(u)), f = u - i;
        const lat = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, lon = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;
        A.moveTo(lat, lon);
        if (follow) { let t = faceLon(lon); while (t - S.psiT > Math.PI) t -= 2 * Math.PI; while (t - S.psiT < -Math.PI) t += 2 * Math.PI; S.psiT += (t - S.psiT) * 0.08; }          // 拿着旗往前走，另一只手把球转过来
        if (k >= t1) { st.done = true; A.drop(); }
      };
    }
    function spinTo(lon, t0 = 0.05, t1 = 0.6) {
      let st = null;
      return (k) => { if (k < t0) { st = null; return; } if (st?.done) return; if (!st) { let t = faceLon(lon); while (t - S.psiT > Math.PI) t -= 2 * Math.PI; while (t - S.psiT < -Math.PI) t += 2 * Math.PI; st = { a: S.psiT, b: t }; } S.psiT = st.a + (st.b - st.a) * ease(clamp((k - t0) / (t1 - t0), 0, 1)); if (k >= t1) st.done = true; };
    }

    // 指针：小红旗按屏幕射线贴着球面走（不是平面），转球按鼠标左右移动；别的交给 draggable（提示、质检登记）
    const pointer = {
      items: drag.items,
      down(ray, e) {
        if (bar.playing) { bar.stop(); return true; }
        const fh = ray.intersectObject(flagPick, false)[0], bh = ray.intersectObject(ballPick, false)[0];
        if (fh && (!bh || fh.distance <= bh.distance)) { mode = 'flag'; A.grab(); tip.loc(group, 0, -9, 0); return true; }          // 旗在球的背面时，射线先碰到球：不算抓到旗
        if (ray.intersectObject(ballPick, false).length) { mode = { spin: true, x: e?.clientX ?? 0 }; started = true; tip.loc(group, 0, -9, 0); return true; }
        return false;
      },
      move(ray, e) {
        const c = document.getElementById('c');
        if (mode === 'flag') {
          const ll = rayLL(ray); A.moveTo(ll.lat, ll.lon);
          // 旗拖到球边上：球跟着转过来（一直拖着就能一直往前走）
          const n = nOf(S.lat, S.lon).applyQuaternion(spin.quaternion), face = n.dot(camDir());
          if (face < 0.42) { let t = faceLon(S.lon); while (t - S.psiT > Math.PI) t -= 2 * Math.PI; while (t - S.psiT < -Math.PI) t += 2 * Math.PI; S.psiT += clamp(t - S.psiT, -0.05, 0.05); }
          if (c) c.style.cursor = 'grabbing'; return true;
        }
        if (mode?.spin) { const x = e?.clientX ?? 0; A.spinBy((x - mode.x) * 0.009); mode.x = x; if (c) c.style.cursor = 'grabbing'; return true; }
        return drag.move(ray, e);
      },
      up(ray, e) {
        const m = mode; mode = null;
        const c = document.getElementById('c'); if (c) c.style.cursor = '';
        if (m === 'flag') { A.drop(); return true; }
        return !!m;
      },
    };

    // ================= 每帧 =================
    const step = (dt) => {
      S.psi += (S.psiT - S.psi) * Math.min(1, dt * 8);
      if (!started && !S.demo) S.psiT += dt * 0.05;          // 还没动手时，球自己慢慢转
      spin.rotation.y = S.psi;
      group.updateMatrixWorld(true);
      // 读数卡、找到的地方的名字：转到背面就不写
      const cd = camDir(), faces = (lat, lon) => nOf(lat, lon).applyQuaternion(spin.quaternion).dot(cd);
      const fp = group.worldToLocal(flagTop.getWorldPosition(new THREE.Vector3()));
      card.text(`<div class="cc"><div class="cc-t"><span class="cc-name">小红旗</span></div><div class="cc-more"><div class="cc-obs">纬度 <b style="color:${BLUE}">${latTxt(S.lat, S.titanic && S.lat === TITANIC.lat ? 2 : 1)}</b>　${Math.abs(S.lat) >= 89.95 ? '<span>所有经线都在这一点汇合</span>' : `经度 <b style="color:${RED}">${lonTxt(S.lon, S.titanic && S.lon === TITANIC.lon ? 2 : 1)}</b>`}</div></div></div>`)
        .loc(group, fp.x, fp.y, fp.z).show(faces(S.lat, S.lon) > 0.12 && !bar.playing);
      for (const m of marks) m.t.show(faces(m.p.lat, m.p.lon) > 0.2);
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.15, d: 0.12, h: 0.15 },
      view: { elev: 14, azim: 0, lookY: 0.56, frameMargin: 1.3 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = () => [...W.tbl.el.querySelectorAll('tbody tr')].map((tr) => `<div>${[...tr.children].map((td) => td.innerHTML).join('，')}</div>`).join('');
        const t1 = think({ title: '想一想', ctx, status,
          q: '经度和纬度，下面哪种说法对？',
          options: ['经度从 0° 经线向东、向西各分 180°（E、W）；纬度从赤道向北、向南各分 90°（N、S）', '经度、纬度都从 0° 一直加到 360°', '经度、纬度都是从 0° 加到 90°'],
          wrong: ['看记录里往东走的那一行：过了 180° 经线，读数变成了西经、越来越小——经度没有 360°。', '看记录里往北走的那一行：纬度到北极是 90°；经度却能加到 180°。'],
          ok: '对：经度向东、向西各 180°，东经用 E、西经用 W；纬度向北、向南各 90°，北纬用 N、南纬用 S。一条经线、一条纬线相交在一点，这一对经纬度就说清了它在哪里。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); } });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '对照课本原文 →');
        const tbl = table(['纬度', '经度', '地方']);
        tbl.add(['40°N', '116°E', '北京（课本的例子）']);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：地球仪是课本第 14 页那种自己做的泡沫球，只画经纬网（每 10° 一条，每 20° 写度数），不画大陆；小蓝旗是找到的地方。经纬度读数保留一位小数；插到离要找的地方不到 1.5° 就算插对。' });
        ui.controls.append(t1.el, next, more, note);
        ui.data.append(tbl.el);
        const dtl = ui.data.previousElementSibling; if (dtl?.classList.contains('bar-title')) dtl.textContent = '经纬度与对应地方（表 1.6）';
        W = { ui, tbl, t1, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        status('图 1.17：地球仪上经线、纬线相互交织，形成经纬网。拖着<b>小红旗</b>在球上走，亮着的红线是过它的经线、蓝线是过它的纬线；拖着球可以转到背面。可以先看<b>老师演示</b>，也可以直接动手。');
      },
      update(dt) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k); },
      dispose() { bar.dispose(); tip.remove(); clearMarks(); },
      debug: { get S() { return S; }, A, bar, picks: { flag: flagPick, ball: ballPick },
        qa: qaFlow(drag, [
          { name: '插到泰坦尼克号', drag: flagPick, to: () => surf(TITANIC.lat, TITANIC.lon + 0.4), wait: 1.5 },
          { name: '往东走过 180°', run: () => { A.grab(); for (let lon = 170; lon <= 190; lon += 3) A.moveTo(0, lon); A.drop(); }, wait: 1 },
          { name: '往北走到北极', run: () => { A.grab(); for (let lat = 0; lat <= 90; lat += 5) A.moveTo(lat, 20); A.drop(); }, wait: 1 },
          ...CITIES.map((c) => ({ name: `插到${c.name}`, run: () => { A.grab(); A.moveTo(c.lat + 0.5, c.lon - 0.5); A.drop(); }, wait: 0.6 })),
          { name: '转一转球', drag: ballPick, to: () => new THREE.Vector3(0.03, HC, 0.05), wait: 1 },
          { name: '答题', run: () => W.t1.el.querySelector('button').click() },
        ]) },
    };
  },
};
