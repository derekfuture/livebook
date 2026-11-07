// 高中地理 选择性必修1 第三章第二节 气压带和风带（课本第 48–50 页，图 3.10 地球上的气压带和风带、图 3.11 气压带和风带的季节移动）。
//
// 一个问题（课本开头）：麦哲伦的船队，哪段航程是逆风？为什么到了南纬 30° 附近反而平静无风、寸步难行？
// 课本的图就是模型：一个地球仪（不画大陆——课本也是先“假设地球表面是均匀的”），表面按气压带着色，近地面一支支小箭头是风；
// 左边沿着地球的轮廓，画着三圈环流（上升、高空、下沉、近地面）。学生亲手做的：
//   1. 开船或拖船：小帆船从南美南端往西北偏北一路开到赤道以北（像麦哲伦船队）。逆风走之字形、高压带里帆耷拉几乎不动、信风里顺风快跑；
//      地球上白色流线顺着风向一直在走，左边环流圈上的小珠子沿着圈转——空气是流动的。船速只是示意，本模型不算风速。
//   2. 换个条件：假如地球不自转——下垫面均匀、理想化纬向受热、太阳直射赤道且没有地转偏向力时，每半球一个环流圈，近地面的风直直吹向赤道，三圈环流和信风、西风都没了。
//   3. 换季节：7 月气压带、风带一起往北挪，1 月往南挪（图 3.11）。
// 教学示意：环流圈的高度大大夸大了；风带的界线、季节移动的度数都是示意。
import * as THREE from 'three';
import { seg, buttons, note } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { airLabel, noteBadge } from './kit/labels.js';
import { h } from '../ui/Panel.js';
import { BELTS, WINDS, windAt, relWind, beltNear, beltLat, sailing } from './kit/belts.js';

const R = 0.075, CY = R + 0.02, D2R = Math.PI / 180;
const SEASONS = [['1 月', -5], ['春分、秋分', 0], ['7 月', 5]];
const ASK = ['先猜一下（可以不猜）：船从南美洲南端往西北走，会是——', ['顺风', '逆风', '平静无风']];
const SPEED = { tail: '顺风，走得快', side: '侧风，还能走', head: '逆风，走之字形，很慢', calm: '风弱，几乎不动', doldrums: '风弱多变，很难走', storm: '风浪大，走得吃力' };
const END = 8;          // 开船开到北纬 8° 停下（已过赤道低压带）

export default {
  id: 'belts',
  fig: '图3.10',
  title: '气压带和风带',
  flow: 'explore',
  ask: '麦哲伦的船队绕过南美洲南端时风大浪高，到了南纬 30° 附近却平静无风、热得难受，后来一路吹着东南风。哪段是逆风？为什么 30° 附近那么难走？',
  need: '开船（或拖船）从南美洲南端（约南纬 50°）到赤道以北，看哪段逆风、哪段几乎不动、哪段顺风，气压带对船有什么影响；再假设地球不自转比一比；换个季节看气压带怎么挪',
  conclusion: {
    page: 53,
    quote: '赤道地区接受太阳辐射能量多，近地面的空气受热膨胀上升，空气密度减小，气压降低。这样赤道地区就形成了一个低压带——赤道低压带。……来自赤道高空的气流在这里不断堆积下沉，使地面气压升高，形成副热带高压带。……这样，全球共形成七个气压带……在气压带之间形成了六个风带……由此可以知道，麦哲伦船队航行至南美洲南端的海峡时受盛行西风影响，船队逆风航行；航行至30°S附近海域时，受副热带高压带控制，气流下沉，平静无风，加之天气炎热，航行十分艰难；船队航行至东南信风带时，顺风航行，这段航程最为轻松。……在北半球，与二分日相比，气压带和风带的位置大致是夏季偏北，冬季偏南。',
    why: '赤道受热多，空气上升，地面成了低压；上升的空气在高空流向两极，一路被地转偏向力往一边推，到 30° 附近已经偏成了西风、流不过去，堆积下沉，地面成了高压；从这里流回赤道的空气偏成信风，流向高纬的偏成西风；极地冷空气下沉成高压，流出的偏成极地东风，在 60° 附近和西风相遇抬升成低压。所以气压带和风带一高一低、一层层相间；高压带近地面辐散，低压带近地面辐合。帆船怕的不是“高压”“低压”本身：副热带高压带、赤道低压带的中间水平气压差小，近地面风弱而多变，帆船就走不动；副极地低压带气旋多，风浪大。本模型不计算风速，船速快慢只是示意。无地转偏转的单圈模型还假定下垫面均匀、理想化纬向受热、太阳直射赤道，并非现实地球停止自转后的预测。',
    src: '课本第 48–50 页 · 第三章 第二节 气压带和风带',
  },

  create({ tag }) {
    const root = new THREE.Group(), tilt = new THREE.Group(), group = new THREE.Group();          // 地球仪和真的一样，地轴斜 23.5°，南半球朝镜头多转过来一点，船在南半球的那一段看得清
    tilt.position.y = CY; tilt.rotation.x = -23.5 * D2R; group.position.y = -CY; root.add(tilt); tilt.add(group);
    const S = { shift: 0, rot: true, lat: -50, drag: false, visited: new Set(), guess: null, saw: {} };
    let W = null, seaSegRef = null;

    // ---- 地球仪：架子 + 一个不画大陆的地球，表面按气压带着色 ----
    const brass = new THREE.MeshStandardMaterial({ color: 0xb89656, metalness: 0.6, roughness: 0.35, emissive: 0x3a2a10, emissiveIntensity: 0.4 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.034, 0.008, 40), brass); base.position.y = 0.004; root.add(base);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, CY - R - 0.006, 16), brass); stem.position.y = 0.008 + (CY - R - 0.006) / 2 - 0.002; root.add(stem);
    const uni = { shift: { value: 0 }, rot: { value: 1 } };
    const globeMat = new THREE.ShaderMaterial({
      uniforms: uni,
      vertexShader: 'varying vec3 vP; varying vec3 vN; void main(){ vP = position; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float shift; uniform float rot; varying vec3 vP; varying vec3 vN;
        void main(){
          float lat = degrees(asin(clamp(normalize(vP).y, -1.0, 1.0)));
          vec3 sea = mix(vec3(0.42,0.64,0.80), vec3(0.62,0.78,0.88), 0.5 + 0.5 * cos(radians(lat) * 2.0));
          float l = lat - shift * step(abs(lat), 85.0);
          float p = cos(radians(l) * 6.0);          // 每 30° 一高一低：赤道低、30° 高、60° 低、极地高
          p = mix(cos(radians(lat) * 2.0), p, rot);          // 不自转：只有赤道低、两极高
          vec3 hi = vec3(0.90,0.48,0.38), lo = vec3(0.34,0.52,0.86);
          float band = smoothstep(0.55, 0.92, abs(p));
          vec3 c = mix(sea, p > 0.0 ? lo : hi, band * 0.75);          // 着色：红是高压带，蓝是低压带（靠近气压带才上色）
          float shade = 0.72 + 0.32 * max(dot(normalize(vN), normalize(vec3(-0.3, 0.6, 0.8))), 0.0);
          gl_FragColor = vec4(c * shade, 1.0);
        }`,
    });
    const globe = new THREE.Mesh(new THREE.SphereGeometry(R, 72, 48), globeMat); globe.position.y = CY; group.add(globe);
    const lineM = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 });
    const latLine = (lat, m = lineM) => { const pts = []; for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * Math.cos(lat * D2R) * R * 1.002, CY + Math.sin(lat * D2R) * R * 1.002, Math.sin(a) * Math.cos(lat * D2R) * R * 1.002)); } const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), m); l.raycast = () => {}; group.add(l); return l; };
    const eqLine = latLine(0, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
    const beltLines = BELTS.filter((b) => Math.abs(b.lat) !== 90 && b.lat !== 0).map((b) => ({ b, l: latLine(b.lat, new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.002, gapSize: 0.0015, transparent: true, opacity: 0.7 })) }));
    beltLines.forEach(({ l }) => l.computeLineDistances());
    const ringMat = brass; const meridian = new THREE.Mesh(new THREE.TorusGeometry(R * 1.06, 0.0012, 8, 96, Math.PI), ringMat); meridian.position.y = CY; meridian.rotation.z = -Math.PI / 2; meridian.rotation.y = Math.PI / 2; group.add(meridian);          // 地球仪的子午圈

    // ---- 近地面的风：沿纬线一支支小箭头（只摆朝着镜头的那半边） ----
    const NA = 5 * 17;
    const arrowGeo = new THREE.ConeGeometry(0.0022, 0.0075, 8); arrowGeo.rotateX(Math.PI / 2);          // 尖朝 +z
    const arrows = new THREE.InstancedMesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0x1f3f75 }), NA); arrows.raycast = () => {}; group.add(arrows);
    const AL = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), sc = new THREE.Vector3();
    for (let i = 0; i < 17; i++) for (let j = 0; j < 5; j++) AL.push([-80 + i * 10, -48 + j * 24]);          // [纬度, 经度]（经度 0 正对镜头）
    const enu = (lat, lon) => { const la = lat * D2R, lo = lon * D2R, up = new THREE.Vector3(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)), east = new THREE.Vector3(Math.cos(lo), 0, -Math.sin(lo)), north = new THREE.Vector3().crossVectors(up, east); return { up, east, north }; };
    let arrowPhase = 0;          // 箭头不是钉死的：每支顺着风向往前滑一小段、淡出，再从后面淡入，风一直在吹
    const placeArrows = () => {
      AL.forEach(([lat0, lon0], k) => {
        const w0 = windAt(lat0, S.shift, S.rot), off = (arrowPhase + (k * 0.618) % 1) % 1, cl = Math.max(0.2, Math.cos(lat0 * D2R)), lat = lat0 + w0.v * off * 7, lon = lon0 + (w0.u * off * 7) / cl;
        const w = windAt(lat, S.shift, S.rot), f = enu(lat, lon), dir = f.east.clone().multiplyScalar(w.u).add(f.north.clone().multiplyScalar(w.v)), sp = Math.hypot(w.u, w.v) * Math.min(1, Math.sin(Math.PI * off) * 2.2);
        const p = f.up.clone().multiplyScalar(R * 1.012).add(new THREE.Vector3(0, CY, 0));
        if (sp < 0.12 || !w0.known) { m4.compose(p, q, sc.setScalar(1e-4)); arrows.setMatrixAt(k, m4); return; }
        const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), dir.normalize(), f.up); q.setFromRotationMatrix(m); q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI));          // lookAt 让 -z 朝目标：转 180° 让尖朝风吹去的方向
        const e = Math.min(1, sp); m4.compose(p, q, sc.set(e, e, 1.4 * e)); arrows.setMatrixAt(k, m4);
      });
      arrows.instanceMatrix.needsUpdate = true;
    };

    // ---- 风在吹：前半个地球上几百条白色流线，顺着风向一直往前走；高压带里从带上往两边散，低压带里从两边汇进来、往上走掉 ----
    const NS = 420, sPos = new Float32Array(NS * 6), sCol = new Float32Array(NS * 8), sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3)); sGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 4));
    const streaks = new THREE.LineSegments(sGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false })); streaks.raycast = () => {}; streaks.frustumCulled = false; group.add(streaks);
    const SIN80 = Math.sin(80 * D2R), spawn = (o) => { o.lat = Math.asin((Math.random() * 2 - 1) * SIN80) / D2R; o.lon = -78 + Math.random() * 156; o.age = 0; o.life = 1.4 + Math.random() * 1.8; return o; };
    const SPs = Array.from({ length: NS }, () => { const o = spawn({}); o.age = Math.random() * o.life; return o; });
    const flow = (lat) => {          // 流线的方向 [u, v, 亮度]：风带里就是风向；气压带附近只画辐散、辐合（不给单一风向）
      const w = windAt(lat, S.shift, S.rot);
      if (w.known) return [w.u, w.v, 1];
      if (!S.rot) return Math.abs(lat) < 2 ? [0, -Math.sign(lat) * 0.35, 0.5] : [0, 0, 0];
      const nb = beltNear(lat, S.shift, 2); if (!nb || Math.abs(nb.lat) === 90) return [0, 0, 0];          // 跨赤道转向区、两极不画
      const d = lat - beltLat(nb, S.shift), sg = Math.sign(d) || (Math.random() < 0.5 ? 1 : -1);
      return nb.p === 'H' ? [0, sg * 0.4, 0.8] : [0, -sg * 0.4, 0.55];
    };
    const ll = (lat, lon, r, out, i) => { const la = lat * D2R, lo = lon * D2R; out[i] = Math.cos(la) * Math.sin(lo) * r; out[i + 1] = CY + Math.sin(la) * r; out[i + 2] = Math.cos(la) * Math.cos(lo) * r; };
    const tickStreaks = (dt) => {
      const K = 7, L = 0.6;          // K：流线每秒走几度（示意，不是风速）；L：拖尾长几秒的路
      SPs.forEach((o, k) => {
        o.age += dt; let [u, v, a] = flow(o.lat);
        if (o.age > o.life || Math.abs(o.lon) > 80 || Math.abs(o.lat) > 84 || a === 0) { spawn(o); [u, v, a] = flow(o.lat); }
        const nb = S.rot ? beltNear(o.lat, S.shift, 0.6) : null; if (nb && nb.p === 'L') a *= Math.abs(o.lat - beltLat(nb, S.shift)) / 0.6;          // 汇到低压带中线就上升走了
        const cl = Math.max(0.2, Math.cos(o.lat * D2R)); o.lat += v * K * dt; o.lon += (u * K * dt) / cl;
        const env = Math.min(1, o.age / 0.35, (o.life - o.age) / 0.5) * a;
        ll(o.lat, o.lon, R * 1.007, sPos, k * 6); ll(o.lat - v * K * L, o.lon - (u * K * L) / cl, R * 1.007, sPos, k * 6 + 3);
        sCol.set([1, 1, 1, env, 1, 1, 1, 0], k * 8);
      });
      sGeo.attributes.position.needsUpdate = true; sGeo.attributes.color.needsUpdate = true;
    };

    // ---- 三圈环流：画在地球右边的轮廓外面（对着镜头的那个子午面），一圈圈带箭头的环 ----
    const loopMat = new THREE.MeshBasicMaterial({ color: 0x2a5a9a, transparent: true, opacity: 0.85 });
    const loops = new THREE.Group(); group.add(loops);
    const cellCurves = [], NB = 7, beads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0017, 10, 8), new THREE.MeshBasicMaterial({ color: 0x163a6e }), 8 * NB); beads.raycast = () => {}; beads.frustumCulled = false;
    const beadG = new THREE.Group(); beadG.add(beads); group.add(beadG); let beadPhase = 0;          // 环流圈上一颗颗小珠子沿着圈转：这就是空气在环流
    const tickBeads = (dt) => {
      beadPhase = (beadPhase + dt * 0.07) % 1; let k = 0;
      for (const c of cellCurves) for (let j = 0; j < NB; j++) { m4.makeTranslation(c.getPointAt((beadPhase + j / NB) % 1)); beads.setMatrixAt(k++, m4); }
      beads.count = k; beads.instanceMatrix.needsUpdate = true;
    };
    const cellPath = (a, b, H) => {          // 纬度 a（上升的一侧）到 b（下沉的一侧）：近地面 b→a，a 处上升，高空 a→b，b 处下沉
      const pt = (lat, hgt) => { const la = lat * D2R, r = R * (1.03 + hgt); return new THREE.Vector3(-Math.cos(la) * r, CY + Math.sin(la) * r, 0); };          // 画在地球左边的轮廓外（和课本图 3.10 一样）
      const P = [], n = 14;
      for (let i = 0; i <= n; i++) P.push(pt(b + (a - b) * (i / n), 0));
      for (let i = 1; i <= 4; i++) P.push(pt(a, (i / 4) * H));
      for (let i = 1; i <= n; i++) P.push(pt(a + (b - a) * (i / n), H));
      for (let i = 1; i < 4; i++) P.push(pt(b, H - (i / 4) * H));
      return new THREE.CatmullRomCurve3(P, true, 'catmullrom', 0.2);
    };
    const buildLoops = () => {
      for (const o of [...loops.children]) { loops.remove(o); o.geometry.dispose(); }
      cellCurves.length = 0;
      const sh = S.shift, cells = S.rot ? [[sh, 30 + sh, 0.16], [60 + sh, 30 + sh, 0.12], [60 + sh, 90, 0.08], [sh, -30 + sh, 0.16], [-60 + sh, -30 + sh, 0.12], [-60 + sh, -90, 0.08]] : [[sh, 88, 0.16], [sh, -88, 0.16]];
      for (const [a, b, H] of cells) {
        const c = cellPath(a, b, H); cellCurves.push(c); const tube = new THREE.Mesh(new THREE.TubeGeometry(c, 90, 0.0008, 6, true), loopMat); tube.raycast = () => {}; loops.add(tube);
        for (const u of [0.12, 0.5, 0.72]) { const hd = new THREE.Mesh(new THREE.ConeGeometry(0.0026, 0.007, 10), loopMat); hd.position.copy(c.getPointAt(u)); hd.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.getTangentAt(u)); hd.raycast = () => {}; loops.add(hd); }
      }
      loops.rotation.y = Math.PI * 0.16;          // 左边的轮廓往镜头这边转一点，环流圈露在地球前面，不被挡住
      beadG.rotation.y = loops.rotation.y; tickBeads(0);
    };

    // ---- 小帆船：在正对镜头的经线上，拖着它南北走 ----
    const boat = new THREE.Group(), rig = new THREE.Group(); group.add(boat); boat.add(rig); rig.scale.setScalar(1.6);          // rig：船身、桅杆、帆，风浪里一起摇
    const hullShape = (L, B) => { const s = new THREE.Shape(); s.moveTo(-L / 2, -B * 0.42); s.quadraticCurveTo(L * 0.12, -B * 0.62, L / 2, 0); s.quadraticCurveTo(L * 0.12, B * 0.62, -L / 2, B * 0.42); s.lineTo(-L / 2, -B * 0.42); return s; };          // 俯视的船形：船尾方、船头尖
    const hullGeo = new THREE.ExtrudeGeometry(hullShape(0.013, 0.0055), { depth: 0.0026, bevelEnabled: true, bevelThickness: 0.0006, bevelSize: 0.0004, bevelSegments: 2, curveSegments: 10 }); hullGeo.rotateX(-Math.PI / 2);          // 挤出方向朝上
    const hull = new THREE.Mesh(hullGeo, new THREE.MeshStandardMaterial({ color: 0x7a4a2a, roughness: 0.65 })); hull.position.y = 0.0004; rig.add(hull);
    const deckGeo = new THREE.ShapeGeometry(hullShape(0.0118, 0.0046), 10); deckGeo.rotateX(-Math.PI / 2);
    const deck = new THREE.Mesh(deckGeo, new THREE.MeshStandardMaterial({ color: 0xc9a06a, roughness: 0.8 })); deck.position.y = 0.0037; rig.add(deck);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.00035, 0.00045, 0.0135, 8), new THREE.MeshStandardMaterial({ color: 0x4a3420 })); mast.position.y = 0.0102; rig.add(mast);
    const sailGeo = new THREE.PlaneGeometry(0.0085, 0.0095, 8, 8), sailBase = sailGeo.attributes.position.array.slice();
    const sail = new THREE.Mesh(sailGeo, new THREE.MeshStandardMaterial({ color: 0xf6efdc, roughness: 0.9, side: THREE.DoubleSide })); sail.position.set(0, 0.0105, 0); rig.add(sail);
    let bellyNow = 0;
    const setBelly = (b, droop) => {          // 帆鼓起多少：顺风兜满、逆风收紧、没风耷拉（droop：下摆往里收、整片往下塌）
      if (Math.abs(b - bellyNow) < 1e-5 && !droop) return; bellyNow = b; const P = sailGeo.attributes.position.array;
      for (let i = 0; i < P.length; i += 3) { const u = sailBase[i] / 0.0085 + 0.5, v = sailBase[i + 1] / 0.0095 + 0.5; P[i] = sailBase[i] * (droop ? 1 - 0.25 * (1 - v) : 1); P[i + 1] = sailBase[i + 1] - (droop ? 0.0018 * (1 - v) ** 2 : 0); P[i + 2] = b * Math.sin(Math.PI * u) * Math.sin(Math.PI * (0.15 + 0.85 * v)) + (droop ? droop * Math.sin(Math.PI * u) * (1 - v) : 0); }
      sailGeo.attributes.position.needsUpdate = true; sailGeo.computeVertexNormals();
    };
    const vaneM = new THREE.MeshBasicMaterial({ color: 0xc4462e }), vane = new THREE.Mesh(new THREE.ConeGeometry(0.0018, 0.009, 8), vaneM); vane.position.y = 0.031; boat.add(vane);          // 船上的气流方向箭头：指着风吹去的方向
    const boatPick = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), new THREE.MeshBasicMaterial({ visible: false })); boatPick.position.y = 0.006; boatPick.userData.pick = true; boat.add(boatPick);
    // 船后的航迹：顺风拉得长，逆风弯成之字形，无风区几乎不动
    const NW = 90, wPos = new Float32Array(NW * 3), wCol = new Float32Array(NW * 4), wGeo = new THREE.BufferGeometry(); let wN = 0, wT = 0;
    wGeo.setAttribute('position', new THREE.BufferAttribute(wPos, 3)); wGeo.setAttribute('color', new THREE.BufferAttribute(wCol, 4)); wGeo.setDrawRange(0, 0);
    const wake = new THREE.Line(wGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false })); wake.raycast = () => {}; wake.frustumCulled = false; group.add(wake);
    const pushWake = (p) => { if (wN === NW) wPos.copyWithin(0, 3); else wN++; const c = p.clone().sub(new THREE.Vector3(0, CY, 0)).multiplyScalar(1.003).add(new THREE.Vector3(0, CY, 0)); wPos.set([c.x, c.y, c.z], (wN - 1) * 3); for (let i = 0; i < wN; i++) wCol.set([1, 1, 1, 0.9 * ((i + 1) / wN) ** 1.5], i * 4); wGeo.setDrawRange(0, wN); wGeo.attributes.position.needsUpdate = true; wGeo.attributes.color.needsUpdate = true; };
    const clearWake = () => { wN = 0; wGeo.setDrawRange(0, 0); };
    // 船头顶上的天气：副热带高压带一轮烈日，赤道低压带对流云和阵雨，副极地低压带乌云和雨
    const wx = new THREE.Group(); group.add(wx);
    const sunTex = canvasTex(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,236,170,1)'); gr.addColorStop(0.32, 'rgba(255,200,90,0.95)'); gr.addColorStop(0.55, 'rgba(255,170,60,0.35)'); gr.addColorStop(1, 'rgba(255,160,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, depthWrite: false, transparent: true })); sun.scale.setScalar(0.022); wx.add(sun);
    const cloudM = new THREE.MeshStandardMaterial({ color: 0xf4f6fa, roughness: 0.9, transparent: true }), cloud = new THREE.Group(); wx.add(cloud);
    for (const [x, y, r] of [[0, 0, 0.0052], [0.0055, -0.001, 0.0042], [-0.0055, -0.0012, 0.004], [0.002, 0.003, 0.0038]]) { const b = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), cloudM); b.position.set(x, y, 0); cloud.add(b); }
    const ND = 26, dPos = new Float32Array(ND * 6), dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
    const rain = new THREE.LineSegments(dGeo, new THREE.LineBasicMaterial({ color: 0x5f7fa8, transparent: true, opacity: 0.8 })); rain.frustumCulled = false; cloud.add(rain);
    const drops = Array.from({ length: ND }, () => [(Math.random() - 0.5) * 0.013, Math.random(), (Math.random() - 0.5) * 0.006]);
    [sun, cloud, rain].forEach((o) => { o.raycast = () => {}; });    S.lonOff = 0; S.yaw = 0; S.tack = 1; S.tackT = 0.7; S.sail = false; S.mode = null;
    const heading = () => 330;          // 航向北偏西 30°：船一路往西北偏北走（示意麦哲伦船队出海峡后北上），沿下面这条航线
    const lonOf = (lat) => 14 - (lat + 52) * 0.3;          // 航线：纬度越往北，经度越往西一点
    const tBoat = airLabel(group, '', { h: 0.0078, color: '#2c3245', icon: 'wind' }), tHint = tag('<span>按住小帆船</span><small>往北（上）推</small>', 'hint'), tScale = noteBadge(tag, '教学示意：环流圈的高度大大夸大了，不画海陆，风带界线和季节移动的度数是示意');
    const callout = airLabel(group, '', { h: 0.008, color: '#a8341f', dim: 0 }); callout.setOn(false); let calloutT = 0;
    callout.show = (on) => callout.setOn(on);          // 一段话亮几秒就收
    const say1 = (text, p) => { callout.position.set(p.x + 0.065, p.y + 0.026, p.z); callout.setText(text).setOn(true); calloutT = 4; };
    const follow = (p) => { if (calloutT > 0) callout.position.set(p.x + 0.065, p.y + 0.026, p.z); };          // 开船时字跟着船走
    const tUD = [[0, '上升'], [30, '下沉'], [60, '上升'], [80, '下沉']].map(([lat, t]) => ({ lat, t: airLabel(group, t, { h: 0.0095, color: '#2c3245', icon: t === '上升' ? 'up' : 'down', dim: 0 }) }));
    const placeUD = () => { const cs = Math.cos(Math.PI * 0.16), sn = Math.sin(Math.PI * 0.16); tUD.forEach(({ lat, t }, i) => { const la = (lat + (Math.abs(lat) >= 80 ? 0 : S.shift)) * D2R, r = R * 1.22, x = -Math.cos(la) * r; t.position.set(x * cs, CY + Math.sin(la) * r, -x * sn); t.setOn(S.rot); }); };
    const tBelts = [];          // 右边轮廓上：每条气压带一个“高”“低”
    for (const b of BELTS) tBelts.push({ b, t: airLabel(group, b.p === 'H' ? '高' : '低', { h: 0.011, color: b.p === 'H' ? '#b03a2a' : '#1f4f86', dim: 0 }) });
    const labels = [tBoat, callout, ...tUD.map((o) => o.t), ...tBelts.map((o) => o.t)];

    const placeBoat = () => {
      const f = enu(S.lat, lonOf(S.lat) + S.lonOff), p = f.up.clone().multiplyScalar(R).add(new THREE.Vector3(0, CY, 0));
      const hd = heading(S.lat), yaw = hd + S.yaw, fwd = f.east.clone().multiplyScalar(Math.sin(yaw * D2R)).add(f.north.clone().multiplyScalar(Math.cos(yaw * D2R)));
      boat.position.copy(p); boat.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(fwd, f.up, new THREE.Vector3().crossVectors(fwd, f.up)));
      const w = relWind(S.lat, hd, S.shift, S.rot), wd = f.east.clone().multiplyScalar(w.u).add(f.north.clone().multiplyScalar(w.v));
      vane.visible = w.known; if (vane.visible) { const local = wd.clone().applyQuaternion(boat.quaternion.clone().invert()).normalize(); vane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), local); }
      const bn = beltNear(S.lat, S.shift, 2);          // 气压带附近只说明辐合或辐散
      tBoat.position.set(p.x + 0.05, p.y - 0.006, p.z); tBoat.setText(`${Math.abs(Math.round(S.lat))}°${S.lat >= 0 ? 'N' : 'S'} ${S.rot ? (bn ? bn.name.replace(/^(北半球|南半球)/, '') : w.belt.replace(/^(北半球|南半球)/, '')) : ''} · ${w.dir} · ${w.rel}`);          // 船名牌在船的右边，别压住船和帆，也别撞上左边环流圈的字
      tHint.loc(group, p.x + 0.05, p.y - 0.022, p.z).show(!S.visited.size);
      const sv = sailing(S.lat, hd, S.shift, S.rot);
      sail.rotation.y = sv.k === 'tail' ? Math.PI / 2 : sv.k === 'head' ? S.tack * 0.35 : 0.7;          // 顺风：帆横过来兜住风；逆风：帆收紧、贴着船身
      const slack = sv.k === 'calm' || sv.k === 'doldrums'; if (!slack) setBelly(sv.k === 'tail' ? 0.0028 : sv.k === 'side' ? 0.002 : 0.0013);          // 没风：帆耷拉下来（每帧在 tickBoatLook 里轻轻晃）
      S.slack = slack;
      wx.position.copy(p).addScaledVector(f.north, 0.026).addScaledVector(f.up, 0.012); wx.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), f.north);          // 镜头差不多正对着船的头顶，天气就挂在船的画面上方，雨朝船落下
      sun.visible = S.rot && sv.k === 'calm'; cloud.visible = S.rot && (sv.k === 'doldrums' || sv.k === 'storm'); cloudM.color.setHex(sv.k === 'storm' ? 0x8a93a3 : 0xf4f6fa);
      return { w, bn, p, sv };
    };
    const placeBeltTags = () => { const cs = Math.cos(Math.PI * 0.12), sn = Math.sin(Math.PI * 0.12); tBelts.forEach(({ b, t }) => { const lat = beltLat(b, S.shift) * D2R, r = R * 1.25, x = Math.cos(lat) * r; t.position.set(x * cs, CY + Math.sin(lat) * r, -x * sn); t.setOn(S.rot); }); tScale.loc(group, -R - 0.06, 0.004, R * 0.6); };

    // ---- 侧栏：一张从北极到南极的条：气压带（高 / 低）和每个风带的风向；船在哪 ----
    const drawChart = (cur) => {
      if (!W) return;
      const c = W.chart, g = c.getContext('2d'), w = c.width, hh = c.height, T = 10, B = hh - 10, Y = (lat) => T + ((90 - lat) / 180) * (B - T);
      g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, hh); g.font = '600 12px "PingFang SC", sans-serif'; g.textBaseline = 'middle';
      if (S.rot) {
        for (const b of BELTS) { const y = Y(beltLat(b, S.shift)); g.fillStyle = b.p === 'H' ? 'rgba(229,122,97,0.9)' : 'rgba(87,133,219,0.9)'; g.fillRect(8, y - 6, 118, 12); g.fillStyle = '#fff'; g.textAlign = 'left'; g.fillText(b.name.replace('北半球', '北').replace('南半球', '南'), 12, y); }
        WINDS.forEach((z, i) => { const y = (Y(z.a + (Math.abs(z.a) === 90 ? 0 : S.shift)) + Y(z.b + (Math.abs(z.b) === 90 ? 0 : S.shift))) / 2; g.fillStyle = '#2a3140'; g.textAlign = 'left'; g.fillText(`${z.name.replace(/^(北半球|南半球)/, '')}：${z.dir}`, 136, y); });
      } else { g.fillStyle = '#2a3140'; g.textAlign = 'left'; g.fillText('理想化无地转偏转：', 12, Y(60)); g.fillText('赤道受热上升，两极冷却下沉，', 12, Y(40)); g.fillText('每个半球只有一个大环流圈，', 12, Y(20)); g.fillText('近地面北半球吹北风、南半球吹南风。', 12, Y(0)); }
      const y = Y(S.lat); g.fillStyle = '#c4462e'; g.beginPath(); g.moveTo(w - 8, y); g.lineTo(w - 18, y - 6); g.lineTo(w - 18, y + 6); g.fill(); g.textAlign = 'right'; g.fillText('船', w - 20, y);
      const spd = S.rot ? `<br>帆船走得动吗（示意）：<span class="sail-bar"><i style="width:${Math.round(cur.sv.rate * 100)}%"></i></span> ${SPEED[cur.sv.k]}` : '';
      const html = `船在 <b>${Math.abs(Math.round(S.lat))}°${S.lat >= 0 ? 'N' : 'S'}</b>，往西北偏北航行：${cur.w.dir}，<b>${cur.w.rel}</b>${cur.bn && S.rot ? `（${cur.bn.name}${cur.bn.p === 'H' ? '：气流下沉' : '：气流上升'}）` : ''}${spd}`;
      if (W.read.dataset.h !== html) { W.read.innerHTML = html; W.read.dataset.h = html; }          // 开船时每帧都会进来：字没变就不动 DOM
    };
    const drawLog = () => {
      if (!W) return;
      const rows = [], r = (b, t) => rows.push(h('div', { class: 'tl-row' }, h('b', {}, b), h('span', {}, t)));
      if (S.saw.west) r('南美南端往西北：', '盛行西风迎面吹来，逆风，只能走之字形');
      if (S.saw.calm) r('南纬 30° 附近：', '副热带高压带，气流下沉、近地面辐散，风弱多变，晴朗干热，几乎走不动');
      if (S.saw.trade) r('再往北：', '东南信风从身后吹来，顺风，最轻松');
      if (S.saw.dold) r('到赤道附近：', '赤道低压带，信风汇合上升，风弱多变、多对流雨，又走不动了');
      if (S.saw.norot) r('理想化无地转偏转：', '下垫面均匀、直射赤道时，没有地转偏转，每半球一个环流圈，近地面的风直直吹向赤道');
      if (S.saw.season) r('换季节：', '7 月气压带、风带整体偏北，1 月偏南');
      if (S.guess != null && S.saw.west) rows.push(h('div', { class: 'tl-row' }, h('small', {}, `你猜：${ASK[1][S.guess]}　实际：逆风（盛行西风）`)));
      W.log.replaceChildren(...rows);
      if (S.saw.west && S.saw.calm && S.saw.trade && S.saw.norot) W.ui.unlock();
    };
    const events = (cur) => {
      if (!S.rot || S.shift !== 0 || !S.visited.size) return;          // 自己推过船才算看到
      const was = { ...S.saw };
      if (S.lat < -40 && S.lat > -60 && cur.w.rel === '逆风') S.saw.west = true;
      if (Math.abs(S.lat + 30) < 3 && cur.bn?.p === 'H') S.saw.calm = true;
      if (S.lat > -25 && S.lat < -5 && cur.w.rel === '顺风') S.saw.trade = true;
      if (S.saw.west && !was.west) say1('逆风：盛行西风迎面吹来', cur.p);
      if (S.saw.calm && !was.calm) say1('副热带高压带：风弱，帆耷拉了', cur.p);
      if (S.saw.trade && !was.trade) say1('顺风：东南信风推着船走', cur.p);
      if (Math.abs(S.lat) < 3 && cur.sv.k === 'doldrums') S.saw.dold = true;
      if (S.saw.dold && !was.dold) say1('赤道低压带：风弱多变，多对流雨', cur.p);
      if (JSON.stringify(was) !== JSON.stringify(S.saw)) drawLog();
    };
    // 季节移动时，虚线纬线要挪到新纬度：直接重建更简单
    const rebuildBeltLines = () => { for (const { b, l } of beltLines) { const la = beltLat(b, S.shift) * D2R, pts = []; for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * Math.cos(la) * R * 1.002, CY + Math.sin(la) * R * 1.002, Math.sin(a) * Math.cos(la) * R * 1.002)); } l.geometry.dispose(); l.geometry = new THREE.BufferGeometry().setFromPoints(pts); l.computeLineDistances(); l.scale.set(1, 1, 1); l.position.y = 0; l.visible = S.rot; } };
    const layout2 = () => { uni.shift.value = S.shift; uni.rot.value = S.rot ? 1 : 0; rebuildBeltLines(); placeArrows(); buildLoops(); placeBeltTags(); placeUD(); const cur = placeBoat(); drawChart(cur); events(cur); };

    let chartKey = '';
    const moveBoat = () => { const cur = placeBoat(); follow(cur.p); const key = `${Math.round(S.lat)}|${cur.sv.k}|${cur.w.rel}`; if (key !== chartKey) { chartKey = key; drawChart(cur); } events(cur); return cur; };          // 侧栏只在整度数或航况变了时重画
    const stopSail = () => { S.sail = false; S.yaw = 0; if (W) W.goBtn.textContent = '开船：从南美南端一路往北'; };
    const tickSail = (dt, t) => {
      const sv = sailing(S.lat, heading(), S.shift);
      if (sv.k !== S.mode) { S.mode = sv.k; W?.ui.status(sv.text); callout.show(false); calloutT = 0; }          // 换了一段航况，旧的那句话收掉
      if (sv.k === 'head') { S.tackT -= dt; if (S.tackT <= 0) { S.tack = -S.tack; S.tackT = 1.3; } S.yaw = S.tack * 45; S.lonOff += S.tack * 2.6 * dt; }          // 逆风：左一下右一下，迎风换舷
      else S.yaw = sv.k === 'calm' || sv.k === 'doldrums' ? Math.sin(t * 0.7) * 14 : 0;          // 没风：船头随便飘
      S.lat = Math.min(END, S.lat + 8 * sv.rate * dt); S.visited.add(Math.round(S.lat / 10));          // 每秒最多 8°：船速只是示意
      wT -= dt; if (wT <= 0) { wT = 0.07; pushWake(boat.position); }
      moveBoat();
      if (S.lat >= END) { stopSail(); W?.ui.status('到了北纬 8° 附近，过了赤道低压带。一路上：西风带逆风，走之字形很慢 → 副热带高压带风弱、晴热，几乎不动 → 东南信风顺风，最快 → 赤道低压带风弱多变、多对流雨。'); }
    };
    const tickBoatLook = (dt, t) => {          // 船身随天气晃：风浪大就摇，没风就几乎不动
      const k = sailing(S.lat, heading(), S.shift, S.rot).k, a = k === 'storm' ? 0.32 : k === 'head' ? 0.12 : k === 'calm' || k === 'doldrums' ? 0.02 : 0.06;
      rig.rotation.x = Math.sin(t * 4.2) * a; rig.rotation.z = Math.sin(t * 2.9) * a * 0.4;
      if (S.slack) setBelly(0.0004 * Math.sin(t * 1.3), 0.0006 + 0.0003 * Math.sin(t * 0.9));
      if (cloud.visible) { for (let i = 0; i < ND; i++) { const d = drops[i]; d[1] = (d[1] + dt * (k === 'storm' ? 1.6 : 1.1)) % 1; const y = -0.003 - d[1] * 0.024, sl = k === 'storm' ? 0.004 : 0; dPos.set([d[0], y, d[2], d[0] + sl, y - 0.004, d[2]], i * 6); } dGeo.attributes.position.needsUpdate = true; }
      if (sun.visible) sun.scale.setScalar(0.022 * (1 + 0.06 * Math.sin(t * 2)));
    };

    // ---- 拖船：沿着正对镜头的经线 ----
    const pointer = {
      down(rc) { if (!rc.intersectObject(boatPick, false).length) return false; stopSail(); S.drag = true; document.getElementById('c').style.cursor = 'grabbing'; return true; },
      move(rc) {
        const c = document.getElementById('c');
        if (!S.drag) { if (c) c.style.cursor = rc.intersectObject(boatPick, false).length ? 'grab' : ''; return false; }
        const hg = rc.intersectObject(globe, false)[0]; if (!hg) return true;          // 在地球表面上拖：碰到哪个纬度，船就到哪
        const l = globe.worldToLocal(hg.point.clone()).normalize();
        S.lat = Math.max(-62, Math.min(62, Math.asin(l.y) / D2R)); S.visited.add(Math.round(S.lat / 10)); layout2(); return true;
      },
      up() { if (!S.drag) return false; S.drag = false; document.getElementById('c').style.cursor = ''; return true; },
    };

    layout2();

    return {
      debug: { S, layout: layout2 },
      group: root,
      card: false,
      emerge: 'flat',          // 课本的图平放在书页上，模型从它上面长出来、它慢慢淡掉
      size: { w: 0.3, d: 0.2, h: 0.2 },
      view: { elev: 8, azim: 0, lookY: 0.5, frameMargin: 1.45 },
      pointer,
      mount(ui) {
        const rotSeg = seg('地球', ['在自转', '理想化无偏转'], (_, i) => { S.rot = !i; if (i) { S.saw.norot = true; S.shift = 0; seaSegRef.set(1); } seaSegRef.el.style.opacity = i ? 0.4 : 1; seaSegRef.el.style.pointerEvents = i ? 'none' : ''; callout.show(false); calloutT = 0; layout2(); drawLog(); ui.status(i ? '理想化无地转偏转：下垫面均匀、理想化纬向受热、太阳直射赤道且没有地转偏向力时，每半球一个环流圈，近地面的风直直吹向赤道。三圈环流、信风、西风都没了。' : '地球在自转：空气一边流一边被偏转，形成三圈环流、七个气压带、六个风带。'); }, { value: 0 });
        const seaSeg = seg('季节', SEASONS.map((x) => x[0]), (_, i) => { S.shift = SEASONS[i][1]; if (i !== 1) S.saw.season = true; callout.show(false); calloutT = 0; layout2(); drawLog(); }, { value: 1 });
        seaSegRef = seaSeg;          // 假如不自转：只看春分、秋分（季节移动先不考虑）
        const guess = seg(...ASK, (_, i) => { S.guess = i; drawLog(); }, { value: -1 });
        const acts = buttons([{ text: '开船：从南美南端一路往北', onClick: () => {
          if (S.sail) { stopSail(); ui.status('船停了。再按“开船”接着走，也可以直接拖船。'); return; }
          if (!S.rot || S.shift !== 0) { S.rot = true; S.shift = 0; rotSeg.set(0); seaSeg.set(1); seaSeg.el.style.opacity = 1; seaSeg.el.style.pointerEvents = ''; layout2(); }          // 开船按课本的情境：地球自转、春分秋分
          if (S.lat >= END - 0.5 || S.lat > -40) { S.lat = -52; S.lonOff = 0; clearWake(); }
          S.sail = true; S.mode = null; S.tack = 1; S.tackT = 0.65; acts.btns[0].textContent = '停船';
        } }, { text: '重来', ghost: true, onClick: () => { ui.relock?.(); stopSail(); clearWake(); S.lonOff = 0; S.mode = null; S.lat = -50; S.rot = true; S.shift = 0; S.saw = {}; S.guess = null; S.visited.clear(); rotSeg.set(0); seaSeg.set(1); guess.set(-1); callout.show(false); layout2(); drawLog(); ui.status('船在南美洲南端（约南纬 50°）。按<b>开船</b>，或按住<b>小帆船</b>往北推，看一路上的风。'); } }]);
        const chart = h('canvas', { class: 'wx-map', width: 320, height: 210 }), read = h('div', { class: 'read-out' }), log = h('div', { class: 'timeline' });
        ui.controls.append(h('div', { class: 'bar-title' }, '气压带和风带（北 → 南）'), chart, read, h('div', { class: 'note' }, '白色流线和环流圈上的小珠子示意空气怎么流，快慢不代表风速；船速也只是示意。跨赤道转向未模拟。船上箭头指气流吹去方向。无偏转模型：下垫面均匀、理想化纬向受热、太阳直射赤道。'), guess.el, rotSeg.el, seaSeg.el, acts.el, note('地球上红色是高压带，蓝色是低压带；小箭头、白色流线和船上气流方向箭头均指吹去方向，仅示意方向，不表示风速。季节迁移只示意带的位置；跨赤道区不显示固定信风方向，转向过程未模拟。无偏转模型假定下垫面均匀、太阳直射赤道、理想化纬向受热。'));
        ui.data.append(h('div', { class: 'bar-title' }, '你看到了什么'), log);
        W = { ui, chart, read, log, goBtn: acts.btns[0] };
        ui.status('船在南美洲南端（约南纬 50°）。按<b>开船</b>，或按住<b>小帆船</b>往北推，看一路上哪段逆风、哪段走不动、哪段顺风。');
        layout2(); drawLog();
      },
      update(dt, t) { arrowPhase = (arrowPhase + dt * 0.3) % 1; placeArrows(); tickStreaks(dt); tickBeads(dt); if (S.sail) tickSail(dt, t); tickBoatLook(dt, t); labels.forEach((l) => l.tick(dt)); if (calloutT > 0) { calloutT -= dt; if (calloutT <= 0) callout.show(false); } },
    };
  },
};
