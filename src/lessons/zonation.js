// 高中地理 选择性必修1 第五章第二节 自然环境的地域差异性 · 垂直地域分异（课本第 88–89 页，图 5.12 喜马拉雅山脉的垂直地域分异、活动“比较喜马拉雅山脉南北坡的垂直地域分异”）。
//
// 一个问题：同一座喜马拉雅山，为什么南坡从常绿阔叶林一直排到积雪冰川，北坡却只有草甸草原、荒漠和冰雪？
// 课本的图就是模型：一座立在书页上的山，前面切开，剖面就是课本图 5.12 那条轮廓；山坡上按海拔长着各种植被，南坡迎着西南季风的云。
// 学生亲手做的：
//   1. 拖着登山的人从南坡山麓爬到山顶、再下到北坡：每走到一个带，脚下的景观、海拔和气温跟着变；侧栏把两坡的带谱一格一格填出来，并排比。
//   2. 假如北坡山麓也低到 1 000 米：北坡多出来的只是干旱的草原、荒漠——背风、阴坡，水汽到不了，长不出南坡那些森林（课本问题 3）。
//   3. 把山削低：山越低，带越少；换到长白山（纬度高、山又低）：只有 4 个带，山麓是针阔叶混交林。
// 数据：kit/zonation.js（tools/geo/zonation_check.mjs 核对课本图 5.12）。教学示意：竖直方向夸大了，两座山的竖直比例不同；植被画成符号。
import * as THREE from 'three';
import { seg, slider, buttons, note } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { h } from '../ui/Panel.js';
import { faceLabel, airLabel, groundLabel, noteBadge } from './kit/labels.js';
import { KIND, MOUNTAINS, elev, sideOf, bandAt, bandsBelow, colderBy } from './kit/zonation.js';

const XL = -0.19, XR = 0.19, ZD = 0.07, NX = 220, NZ = 44;
const SCALE = { hima: 0.15 / 8848.86, cb: 0.1 / 2691 };          // 1 米在画面上多高（两座山不一样，侧栏的带谱按真实海拔画）
const ASK = ['先猜一下（可以不猜）：喜马拉雅山南坡和北坡，哪边的植被类型多？', ['南坡多', '北坡多', '差不多']];
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const xm = (x) => ((x - XL) / (XR - XL)) * 2 - 1, xOf = (u) => XL + ((u + 1) / 2) * (XR - XL);
const fmt = (m) => Math.round(m).toLocaleString('en-US').replace(/,/g, ' ');

export default {
  id: 'zonation',
  fig: '图5.12',
  title: '山地的垂直地带性',
  flow: 'explore',
  ask: '同一座喜马拉雅山，南坡从山脚的常绿阔叶林一直排到山顶的积雪冰川，北坡却只有草甸草原、荒漠和冰雪。为什么两坡差这么多？',
  need: '拖着登山的人把南坡、北坡各走一遍，比一比两坡的带谱；再试试“假如北坡山麓也低到 1 000 米”、把山削低，或者换到长白山',
  conclusion: {
    page: 93,
    quote: '高大的山体随着海拔的变化，水热状况不同，自然环境要素间物质迁移和能量交换的差异很大，自然景观也相应地呈现垂直变化。从山麓到山顶，分布着不同的景观带，构成垂直带谱。山麓与陆地自然地带一致，垂直带变化与其所在纬度向较高纬度方向上的陆地自然地带变化相似。……垂直地域分异与山地所在纬度、高度密切相关，即山地所在纬度越低，海拔越高，垂直带数目越多，垂直带谱越完整。',
    why: '往上爬，气温每 100 米约降低 0.6 ℃，水分条件也跟着变，所以景观一带一带地换，和从山脚所在的地方一路往高纬度走看到的变化相似。喜马拉雅南坡山麓低（约 1 000 米）、纬度低，从温暖的常绿阔叶林开始；又迎着西南季风，水汽多，一层层森林、灌木林都长得出来。北坡山麓就是约 4 300 米的高原，起点已经很冷；又是背风坡，降水少（北坡也是阴坡，得到的太阳辐射少些），所以只有草甸草原、荒漠和冰雪。山越高、纬度越低，从山麓到山顶跨过的水热条件越多，带谱就越完整。',
    src: '课本第 88–89 页 · 第五章 第二节 自然环境的地域差异性',
  },

  create({ tag, camera }) {
    const group = new THREE.Group(), block = new THREE.Group(); group.add(block);
    const S = { m: 'hima', cut: 8848.86, northLow: false, u: 0.93, drag: false, seen: { south: new Set(), north: new Set(), cb: new Set() }, tried: new Set(), guess: null, moved: false, cuts: {} };
    let W = null;
    const opt = () => ({ cut: S.m === 'hima' ? S.cut : Infinity, northLow: S.m === 'hima' && S.northLow });
    const K = () => SCALE[S.m];
    // 地面的海拔（米）：剖面（z = ZD）就是课本那条轮廓；往后山脊有一点起伏，长白山是一座切开一半的火山
    const heightM = (x, z) => {
      const u = xm(x), zn = (ZD - z) / (2 * ZD);          // zn：从前面的剖面（0）到后面（1）
      if (S.m === 'cb') return elev('cb', u, { r: Math.hypot(u, (ZD - z) / XR * 1.15) });
      const wob = 0.06 * Math.sin(zn * 4.2 + 0.8) * zn * (1 - Math.abs(u) * 0.6);
      let e = elev('hima', u + wob, opt());
      e += zn * (160 * Math.sin(u * 17 + zn * 9) + 90 * Math.sin(u * 41 - zn * 13)) * Math.min(1, (e - 900) / 1500);          // 后面的山坡有沟有梁
      return e;
    };
    const kindAt = (x, e, jitter = 0) => { const u = xm(x), side = S.m === 'cb' ? 'north' : sideOf('hima', u); return bandAt(S.m, side, e + jitter, S.northLow && S.m === 'hima'); };

    // ---- 山顶面：一张高度网格，按带上色 ----
    const grain = canvasTex(256, 256, (g, w) => { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, w); for (let i = 0; i < 2600; i++) { const v = 150 + Math.random() * 100; g.fillStyle = `rgba(${v},${v},${v},${0.2 + Math.random() * 0.35})`; g.fillRect(Math.random() * w, Math.random() * w, 1.6, 1.6); } }, { repeat: [7, 3] });
    const topGeo = new THREE.PlaneGeometry(XR - XL, 2 * ZD, NX, NZ); topGeo.rotateX(-Math.PI / 2);
    const tCol = new Float32Array(topGeo.attributes.position.count * 3); topGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
    const topMesh = new THREE.Mesh(topGeo, new THREE.MeshLambertMaterial({ vertexColors: true, map: grain })); block.add(topMesh);
    // ---- 前面的剖面（像课本那张图）、后面和两头 ----
    const rockTex = canvasTex(512, 256, (g, w, hh) => {
      const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#cdb999'); gr.addColorStop(1, '#ab9a84'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
      for (let k = 0; k < 14; k++) { g.strokeStyle = `rgba(70,55,40,${0.08 + Math.random() * 0.1})`; g.lineWidth = 1 + Math.random() * 3; g.beginPath(); const y0 = (k / 14) * hh; for (let x = 0; x <= w; x += 16) g.lineTo(x, y0 + Math.sin(x / 60 + k) * 4); g.stroke(); }
      for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(60,45,30,${Math.random() * 0.18})`; g.fillRect(Math.random() * w, Math.random() * hh, 2, 2); }
    });
    const faceMat = new THREE.MeshLambertMaterial({ map: rockTex, side: THREE.DoubleSide });
    const front = new THREE.Mesh(new THREE.BufferGeometry(), faceMat), back = new THREE.Mesh(new THREE.BufferGeometry(), faceMat), ends = new THREE.Mesh(new THREE.BufferGeometry(), faceMat); block.add(front, back, ends);
    const soilM = new THREE.MeshLambertMaterial({ color: 0x6f5238, side: THREE.DoubleSide }), soil = new THREE.Mesh(new THREE.BufferGeometry(), soilM); block.add(soil);          // 剖面顶上一道深色的土层
    const lakeM = new THREE.MeshLambertMaterial({ color: 0x3f7fb8, transparent: true, opacity: 0.9 }), lake = new THREE.Mesh(new THREE.BufferGeometry(), lakeM), lakeFace = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshLambertMaterial({ color: 0x4d8cc4, side: THREE.DoubleSide })); block.add(lake, lakeFace);          // 长白山：天池
    const faceStrip = (zf, flip) => {
      const P = [], U = [], I = [], Y = (x) => heightM(x, zf) * K();
      for (let i = 0; i <= NX; i++) { const x = XL + ((XR - XL) * i) / NX, y = Y(x); P.push(x, y, zf, x, 0, zf); U.push(i / NX, y / 0.16, i / NX, 0); if (i) { const a = 2 * i - 2; flip ? I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) : I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals(); return g;
    };
    const buildFaces = () => {
      front.geometry.dispose(); front.geometry = faceStrip(ZD, false); back.geometry.dispose(); back.geometry = faceStrip(-ZD, true);
      const P = [], Y = (x, z) => heightM(x, z) * K();
      for (const x of [XL, XR]) for (let k = 0; k < NZ; k++) { const z0 = -ZD + (2 * ZD * k) / NZ, z1 = z0 + (2 * ZD) / NZ; P.push(x, 0, z0, x, Y(x, z0), z0, x, Y(x, z1), z1, x, 0, z0, x, Y(x, z1), z1, x, 0, z1); }
      ends.geometry.dispose(); ends.geometry = new THREE.BufferGeometry(); ends.geometry.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); ends.geometry.computeVertexNormals();
      const SP = []; for (let i = 0; i < NX; i++) { const x0 = XL + ((XR - XL) * i) / NX, x1 = XL + ((XR - XL) * (i + 1)) / NX, a = Y(x0, ZD), b = Y(x1, ZD), d = 0.0028, zf = ZD + 0.0002; SP.push(x0, a, zf, x0, a - d, zf, x1, b, zf, x0, a - d, zf, x1, b - d, zf, x1, b, zf); }
      soil.geometry.dispose(); soil.geometry = new THREE.BufferGeometry(); soil.geometry.setAttribute('position', new THREE.Float32BufferAttribute(SP, 3));
      lake.visible = lakeFace.visible = S.m === 'cb';
      if (S.m === 'cb') {
        const C = MOUNTAINS.cb, ly = C.lake * K(), rx = 0.12 * 0.47 * (XR - XL) / 2, LP = [], FP = [];          // 天池：切开一半的湖，水面和剖面上的一块蓝
        for (let k = 0; k < 32; k++) { const a0 = Math.PI * (k / 32), a1 = Math.PI * ((k + 1) / 32); LP.push(0, ly, ZD, Math.cos(a0) * rx, ly, ZD - Math.sin(a0) * rx * 0.9, Math.cos(a1) * rx, ly, ZD - Math.sin(a1) * rx * 0.9); }
        lake.geometry.dispose(); lake.geometry = new THREE.BufferGeometry(); lake.geometry.setAttribute('position', new THREE.Float32BufferAttribute(LP, 3)); lake.geometry.computeVertexNormals();
        for (let i = 0; i < 40; i++) { const x0 = -rx + (2 * rx * i) / 40, x1 = x0 + (2 * rx) / 40, zf = ZD + 0.0004; FP.push(x0, ly, zf, x0, Y(x0, ZD), zf, x1, Y(x1, ZD), zf, x0, ly, zf, x1, Y(x1, ZD), zf, x1, ly, zf); }
        lakeFace.geometry.dispose(); lakeFace.geometry = new THREE.BufferGeometry(); lakeFace.geometry.setAttribute('position', new THREE.Float32BufferAttribute(FP, 3));
      }
    };
    const tc = new THREE.Color(), shade = new THREE.Color();
    const shapeTop = () => {
      const p = topGeo.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const x = p.getX(k), z = p.getZ(k), e = heightM(x, z); p.setY(k, e * K());
        const kd = kindAt(x, e, 70 * Math.sin(x * 260 + z * 170) + 40 * Math.sin(x * 900 - z * 610));          // 带和带之间的界线犬牙交错，不是一刀切
        tc.setHex(KIND[kd].color); shade.setHex(0xffffff).multiplyScalar(0.92 + 0.08 * Math.sin(x * 700 + z * 400)); tc.multiply(shade);
        tCol.set([tc.r, tc.g, tc.b], k * 3);
      }
      p.needsUpdate = true; topGeo.attributes.color.needsUpdate = true; topGeo.computeVertexNormals(); topGeo.computeBoundingSphere();
    };

    // ---- 植被：每个带一种样子（符号化，和课本图上的小树、小草一样认得出来） ----
    const geoOf = {
      broad: (() => { const c = new THREE.SphereGeometry(0.0024, 7, 5).translate(0, 0.0042, 0), t = new THREE.CylinderGeometry(0.0004, 0.0005, 0.0024, 5).translate(0, 0.0012, 0); return merge(c, t); })(),
      conifer: merge(new THREE.ConeGeometry(0.0018, 0.0062, 6).translate(0, 0.0044, 0), new THREE.CylinderGeometry(0.0003, 0.0004, 0.0016, 5).translate(0, 0.0008, 0)),
      shrub: new THREE.SphereGeometry(0.0016, 6, 4).scale(1.2, 0.8, 1.2).translate(0, 0.001, 0),
      grass: new THREE.ConeGeometry(0.0007, 0.0024, 4).translate(0, 0.001, 0),
      rock: new THREE.DodecahedronGeometry(0.0011).scale(1.3, 0.6, 1).translate(0, 0.0003, 0),
      birch: merge(new THREE.SphereGeometry(0.0019, 6, 4).scale(0.8, 1.2, 0.8).translate(0, 0.0045, 0), new THREE.CylinderGeometry(0.0003, 0.0004, 0.003, 5).translate(0, 0.0015, 0)),
    };
    function merge(a, b) { const g = new THREE.BufferGeometry(), A = a.toNonIndexed(), B = b.toNonIndexed(), pa = A.attributes.position.array, pb = B.attributes.position.array, P = new Float32Array(pa.length + pb.length); P.set(pa); P.set(pb, pa.length); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); const C = new Float32Array(P.length); for (let i = 0; i < pa.length; i += 3) C.set([1, 1, 1], i); for (let i = pa.length; i < P.length; i += 3) C.set([0.55, 0.4, 0.3], i); g.setAttribute('color', new THREE.BufferAttribute(C, 3)); g.computeVertexNormals(); return g; }          // 树冠白色（按实例上色）、树干棕色
    const LOOK = { broad: ['broad', 0x3f8a3a], mixed: ['broad', 0x4f8a3e, 'conifer', 0x2f6a3c], conifer: ['conifer', 0x2a5e38], shrub: ['shrub', 0x9a6650], meadow: ['grass', 0x8fbf52], meadowS: ['grass', 0xa8b85e], desert: ['rock', 0x8d8070], cbMixed: ['broad', 0x4e8a3c, 'conifer', 0x2f6a3c], cbDark: ['conifer', 0x24503a], birch: ['birch', 0x9ab56a], tundra: ['grass', 0x9a9a62] };
    const MAXN = 1400, inst = {};
    for (const k of Object.keys(geoOf)) { const m = new THREE.InstancedMesh(geoOf[k], new THREE.MeshLambertMaterial({ vertexColors: !!geoOf[k].attributes.color }), MAXN); m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXN * 3), 3); m.raycast = () => {}; m.count = 0; block.add(m); inst[k] = m; }
    const plant = () => {
      for (const k in inst) inst[k].count = 0;
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3(), col = new THREE.Color(), R = (() => { let s = 11; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
      const vs = S.m === 'cb' ? 1.25 : 1;          // 长白山画得矮，树就画大一点点
      for (let i = 0; i < 5200; i++) {
        const x = XL + 0.004 + R() * (XR - XL - 0.008), z = -ZD + 0.004 + R() * (2 * ZD - 0.008), e = heightM(x, z), kd = kindAt(x, e, 70 * Math.sin(x * 260 + z * 170) + 40 * Math.sin(x * 900 - z * 610)), L = LOOK[kd];
        if (!L || (S.m === 'cb' && Math.hypot(xm(x), (ZD - z) / XR * 1.15) < 0.12)) continue;          // 冰雪上不长东西；火山口里不画
        const pick = L.length > 2 && R() < 0.5 ? 2 : 0, g = L[pick], dens = { grass: 0.55, rock: 0.22, shrub: 0.6 }[g] ?? 0.85;
        if (R() > dens) continue;
        const mesh = inst[g]; if (mesh.count >= MAXN) continue;
        const s = (0.8 + R() * 0.45) * vs; pos.set(x, e * K() - 0.0003, z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), R() * 6.28); sc.set(s, s, s); m4.compose(pos, q, sc);
        mesh.setMatrixAt(mesh.count, m4); col.setHex(L[pick + 1]).multiplyScalar(0.85 + R() * 0.3); mesh.setColorAt(mesh.count, col); mesh.count++;
      }
      for (const k in inst) { inst[k].instanceMatrix.needsUpdate = true; if (inst[k].instanceColor) inst[k].instanceColor.needsUpdate = true; }
    };

    // ---- 南坡的云和雨：西南季风从印度洋带来暖湿气流，沿南坡爬升、成云致雨 ----
    const cloudTex = canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const clouds = Array.from({ length: 16 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, color: 0xe4e8ee, transparent: true, depthWrite: false, opacity: 0.62 })); s.userData = { u: 0.3 + (i / 16) * 0.55, z: -ZD * (0.15 + rnd() * 0.75), ph: rnd() * 6, r: 0.02 + rnd() * 0.014 }; s.raycast = () => {}; block.add(s); return s; });          // 云在南坡中下部、靠后：不挡前面那条看带谱的路
    const rainGeo = new THREE.BufferGeometry(), rainN = 90, rainP = new Float32Array(rainN * 6); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainP, 3));
    const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0x6f95c4, transparent: true, opacity: 0.55 })); rain.raycast = () => {}; block.add(rain);
    const drops = Array.from({ length: rainN }, () => ({ c: Math.floor(rnd() * 16), t: rnd() }));
    const aMonsoon = airLabel(block, '西南季风：暖湿气流', { h: 0.0075, color: '#1f4f86', icon: 'wind' });

    // ---- 登山的人：拖着走 ----
    const climber = new THREE.Group(); block.add(climber);
    { const jacket = new THREE.MeshLambertMaterial({ color: 0xd2452e }), dark = new THREE.MeshLambertMaterial({ color: 0x2e3440 }), skin = new THREE.MeshLambertMaterial({ color: 0xf0c8a0 });
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.0016, 0.003, 4, 8), jacket); body.position.y = 0.0045; climber.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.0014, 10, 8), skin); head.position.y = 0.0082; climber.add(head);
      const hat = new THREE.Mesh(new THREE.SphereGeometry(0.0015, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), dark); hat.position.y = 0.0085; climber.add(hat);
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.0022, 0.0032, 0.0016), new THREE.MeshLambertMaterial({ color: 0xe2a33a })); pack.position.set(0, 0.0052, -0.0019); climber.add(pack);
      for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.0005, 0.0005, 0.0026, 5), dark); leg.position.set(s * 0.0008, 0.0013, 0); climber.add(leg); }
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.00022, 0.00022, 0.0075, 4), dark); pole.position.set(0.0022, 0.0036, 0.001); pole.rotation.z = -0.25; climber.add(pole);
      climber.scale.setScalar(2.6); }
    const climbPick = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); climbPick.position.y = 0.006; climbPick.userData.pick = true; climber.add(climbPick);
    const CZ = ZD * 0.84;          // 登山的人走在靠前的一条线上，剖面上的界线数字就在他眼前
    const aZone = airLabel(block, '', { h: 0.0085, color: '#22402a', icon: 'peak' }), aTemp = airLabel(block, '', { h: 0.0072, color: '#2c3245', icon: 'thermo' }), aHover = airLabel(block, '', { h: 0.0075, color: '#3a3226', dim: 0 });
    const tHint = tag('<span>按住登山的人</span><small>往山上拖，翻过山顶再下到另一坡</small>', 'hint');
    noteBadge(tag, '教学示意：竖直方向大大夸大了，两座山的竖直比例不同（侧栏的带谱按真实海拔画）；植被画成符号；长白山按北坡的常见资料画，界线是约数').loc(block, XL + 0.012, -0.002, ZD + 0.012);
    // 剖面上的字：南坡、北坡；课本图上标了数字的界线写在轮廓边上；山顶的名字
    const faceText = [];
    const placeFaceText = () => {
      for (const t of faceText) { block.remove(t); t.material.dispose(); } faceText.length = 0;
      const add = (t) => { faceText.push(t); return t; };
      const M = MOUNTAINS[S.m];
      if (S.m === 'hima') { add(faceLabel(block, '北坡', { x: xOf(-0.62), y: 0.03, z: ZD, h: 0.011, color: '#ffffff', stroke: 'rgba(40,30,20,0.55)' })); add(faceLabel(block, '南坡', { x: xOf(0.45), y: 0.022, z: ZD, h: 0.011, color: '#ffffff', stroke: 'rgba(40,30,20,0.55)' })); }
      else add(faceLabel(block, '长白山（北坡资料）', { x: xOf(0.55), y: 0.012, z: ZD, h: 0.008, color: '#ffffff', stroke: 'rgba(40,30,20,0.55)' }));
      const sides = S.m === 'hima' ? [['south', 1]] : [['north', 1], ['north', -1]];
      for (const [sd, dir] of sides) for (const hm of M[sd].shown) { let u = S.m === 'hima' ? 0.99 : dir * 0.99; const step = (S.m === 'hima' ? -0.002 : -0.002 * dir); while (Math.abs(u) > 0.12 && elev(S.m, u, opt()) < hm) u += step; if (elev(S.m, u, opt()) < hm - 50) continue; add(faceLabel(block, fmt(hm), { x: xOf(u) + 0.011 * (dir > 0 ? 1 : -1), y: hm * K() - 0.002, z: ZD, h: 0.0066, color: '#fffaf0', stroke: 'rgba(40,30,20,0.6)' })); }
      if (S.m === 'hima' && S.cut >= 8848) add(faceLabel(block, `${M.peakName} 8 848.86`, { x: xOf(-0.25), y: 8848.86 * K() - 0.01, z: ZD, h: 0.007, color: '#fffaf0', stroke: 'rgba(40,30,20,0.6)' }));
      if (S.m === 'cb') { const t = add(airLabel(block, '天池（火山口湖）', { x: 0, y: MOUNTAINS.cb.lake * K() + 0.012, z: ZD - 0.004, h: 0.0065, color: '#1f4f86' })); t.material.opacity = 1; }          // 天池写在湖的上方
    };
    const labels = [aZone, aTemp, aHover, aMonsoon];

    // ---- 摆好 ----
    const sideNow = () => (S.m === 'cb' ? 'cb' : sideOf('hima', S.u));
    const placeClimber = () => {
      const x = xOf(S.u), e = heightM(x, CZ), side = sideNow(), kd = kindAt(x, e);
      climber.position.set(x, e * K(), CZ); climber.rotation.y = S.u > (S.m === 'hima' ? -0.25 : 0) ? Math.PI / 2 + 0.35 : -Math.PI / 2 - 0.35;          // 脸朝山顶
      aZone.position.set(x, e * K() + 0.034, CZ); aZone.setText(`${fmt(e)} 米 · ${KIND[kd].name}`);
      aTemp.position.set(x, e * K() + 0.025, CZ); const dT = colderBy(S.m, e); aTemp.setText(dT < 0.5 ? '这里是山脚' : `比 ${fmt(S.m === 'hima' ? 1000 : 500)} 米的山脚冷约 ${dT.toFixed(0)} ℃`);
      tHint.loc(block, x - 0.05, e * K() + 0.045, CZ).show(!S.moved);
      if (S.moved && !S.seen[side].has(kd)) { S.seen[side].add(kd); W && drawLog(); }
      drawChart();
    };
    const placeWeather = (t = 0) => {
      const on = S.m === 'hima'; rain.visible = on; aMonsoon.setOn(on); if (!on) aMonsoon.userData.want = 0;
      clouds.forEach((c, i) => { c.visible = on; if (!on) return; const d = c.userData, u = d.u + 0.03 * Math.sin(t * 0.25 + d.ph), x = xOf(u), e = Math.min(heightM(x, d.z), S.cut); c.position.set(x, e * K() + 0.014 + 0.004 * Math.sin(t * 0.4 + d.ph), d.z); c.scale.set(d.r * 1.6, d.r, 1); });
      aMonsoon.position.set(xOf(0.5), 0.098, -ZD * 0.3);          // 写在南坡的云上面
    };
    const rebuild = () => { shapeTop(); buildFaces(); plant(); placeFaceText(); placeWeather(); placeClimber(); };

    // ---- 侧栏：两坡的带谱并排（按真实海拔）；走过的带才上色 ----
    const COLS = () => (S.m === 'hima' ? [['south', '南坡', 'south'], ['north', S.northLow ? '北坡（假如山麓低）' : '北坡', S.northLow ? 'northLow' : 'north']] : [['cb', '长白山', 'north'], ['south', '喜马拉雅南坡', 'south']]);
    const chartGeom = { top: 26, bot: 0, L: 44, colW: 0, gap: 0, H: 9000 };
    const drawChart = () => {
      if (!W) return;
      const c = W.chart, g = c.getContext('2d'), w = c.width, hh = c.height, G = chartGeom, cols = COLS();
      G.bot = hh - 22; G.colW = (w - G.L - 14 - 18) / 2; G.gap = 18;
      const Y = (m) => G.bot - (m / G.H) * (G.bot - G.top);
      g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, hh);
      g.font = '11px "PingFang SC", sans-serif'; g.fillStyle = '#7a705e'; g.textAlign = 'right'; g.textBaseline = 'middle';
      for (let m = 0; m <= 8000; m += 2000) { g.fillText(m ? `${m / 1000} 000` : '0', G.L - 6, Y(m)); g.strokeStyle = 'rgba(60,50,40,0.08)'; g.beginPath(); g.moveTo(G.L, Y(m)); g.lineTo(w - 8, Y(m)); g.stroke(); }
      g.save(); g.translate(10, (G.top + G.bot) / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText('海拔 / 米', 0, 0); g.restore();
      cols.forEach(([seenKey, name, band], i) => {
        const x0 = G.L + 6 + i * (G.colW + G.gap), mt = band === 'north' && S.m === 'cb' ? 'cb' : 'hima', M = MOUNTAINS[mt][band], top = mt === 'hima' ? Math.min(S.cut, 8848.86) : 2691;
        g.font = '600 12px "PingFang SC", sans-serif'; g.fillStyle = '#3a3226'; g.textAlign = 'center'; g.fillText(name, x0 + G.colW / 2, 12);
        for (const [k, lo, hi] of M.bands) {
          if (lo >= top) continue; const y0 = Y(lo), y1 = Y(Math.min(hi, top)), seen = S.seen[seenKey === 'cb' ? 'cb' : seenKey].has(k) || (seenKey === 'south' && S.m === 'cb' && S.seen.south.has(k));
          if (seen) { g.fillStyle = '#' + KIND[k].color.toString(16).padStart(6, '0'); g.fillRect(x0, y1, G.colW, y0 - y1); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.strokeRect(x0 + 0.5, y1 + 0.5, G.colW - 1, y0 - y1 - 1); }
          else { g.fillStyle = 'rgba(120,110,90,0.08)'; g.fillRect(x0, y1, G.colW, y0 - y1); g.strokeStyle = 'rgba(120,110,90,0.35)'; g.setLineDash([3, 3]); g.strokeRect(x0 + 0.5, y1 + 0.5, G.colW - 1, y0 - y1 - 1); g.setLineDash([]); }
          if (y0 - y1 >= 11) { g.font = '11px "PingFang SC", sans-serif'; g.fillStyle = seen ? (k === 'snow' || k === 'desert' || k === 'meadowS' || k === 'meadow' || k === 'dry' || k === 'birch' || k === 'tundra' ? '#2a2a22' : '#ffffff') : '#9a8f78'; g.fillText(seen ? KIND[k].name.replace('（假设）', '').replace('（云杉、冷杉）', '') : '？', x0 + G.colW / 2, (y0 + y1) / 2); }
        }
        g.fillStyle = '#6b5a44'; g.fillRect(x0 - 2, Y(M.foot), G.colW + 4, 2);          // 山麓
      });
      const side = sideNow(), ci = cols.findIndex(([k]) => k === side); if (ci >= 0) { const x0 = G.L + 6 + ci * (G.colW + G.gap), e = heightM(xOf(S.u), CZ), y = Y(e); g.fillStyle = '#d2452e'; g.beginPath(); g.moveTo(x0 - 3, y); g.lineTo(x0 - 11, y - 5); g.lineTo(x0 - 11, y + 5); g.fill(); }          // 登山的人在哪
      const n = (key, band) => bandsBelow(key === 'cb' ? 'cb' : 'hima', band, key === 'cb' ? 2691 : Math.min(S.cut, 8848.86), false).length;
      g.font = '11px "PingFang SC", sans-serif'; g.fillStyle = '#5a5040'; cols.forEach(([k, , band], i) => { const x0 = G.L + 6 + i * (G.colW + G.gap), unk = band === 'northLow'; g.textAlign = 'center'; g.fillText(unk ? '3 个带 + 待推断的一段' : `${n(k, band)} 个带`, x0 + G.colW / 2, hh - 8); });
    };
    const drawLog = () => {
      if (!W) return;
      const rows = [], r = (b, t) => rows.push(h('div', { class: 'tl-row' }, h('b', {}, b), h('span', {}, t))), H = MOUNTAINS.hima;
      const all = (side, band) => H[band].bands.filter((b) => b[1] < S.cut).every((b) => S.seen[side].has(b[0]));
      const sDone = all('south', 'south'), nDone = H.north.bands.every((b) => S.seen.north.has(b[0]));
      if (S.seen.south.size) r('南坡：', H.south.bands.filter((b) => S.seen.south.has(b[0])).map((b) => KIND[b[0]].name).join(' → ') + (sDone ? `，共 ${H.south.bands.filter((b) => b[1] < S.cut).length} 个带` : ''));
      if (S.seen.north.size) r('北坡：', H.north.bands.filter((b) => S.seen.north.has(b[0])).map((b) => KIND[b[0]].name).join(' → ') + (nDone ? '，共 3 个带' : ''));
      if (sDone && nDone && S.cut >= 8848) r('比一比：', '南坡多出常绿阔叶林、高山针叶阔叶混交林、高山针叶林、高山灌木林和高山草甸（北坡是高山草甸草原）。南坡的高山草甸只在 4 500–4 800 米；北坡的草甸草原从山麓（约 4 300 米）一直到约 4 900 米——北坡的下限是被山麓高度限住的。南坡迎着暖湿气流，热量、水分条件好；北坡是背风坡，降水少、更干冷，所以长的是草甸草原，不是同一种草甸');
      if (S.tried.has('low')) r('假如北坡山麓也低到 1 000 米：', '如果北坡仍是背风坡、降水较少，带谱不一定和南坡一样多；多出来的这一段长什么，要看那里的热量和水分条件去推断（课本问题 3）');
      for (const c of Object.keys(S.cuts).map(Number).sort((a, b) => b - a)) r(`把山削到 ${fmt(c)} 米：`, `南坡只剩 ${S.cuts[c]} 个带`);
      if (S.seen.cb.size) r('长白山（约 42°N）：', `${MOUNTAINS.cb.north.bands.filter((b) => S.seen.cb.has(b[0])).map((b) => KIND[b[0]].name).join(' → ')}${MOUNTAINS.cb.north.bands.every((b) => S.seen.cb.has(b[0])) ? '：一共 4 个带，山麓是针阔叶混交林' : ''}`);
      if (S.guess != null && sDone && nDone && S.cut >= 8848) rows.push(h('div', { class: 'tl-row' }, h('small', {}, `你猜：${ASK[1][S.guess]}　实际：南坡 7 种，北坡 3 种`)));
      W.log.replaceChildren(...rows);
      W.read.innerHTML = `登山的人在 <b>${fmt(heightM(xOf(S.u), CZ))} 米</b>，${S.m === 'hima' ? (sideNow() === 'south' ? '南坡' : '北坡') : '长白山'}<br><small>每升高 100 米，气温约降低 0.6 ℃；界线是课本图 5.12 上的数，没标的是约数</small>`;
      if (sDone && nDone && (S.tried.has('low') || S.tried.has('cut') || S.seen.cb.size >= 3)) W.ui.unlock();
    };

    // ---- 指针：拖登山的人；鼠标停在山坡上浮出那一带的名字 ----
    const plane = new THREE.Plane(), hit = new THREE.Vector3(), wq = new THREE.Vector3();
    const onFace = (ray) => { block.updateMatrixWorld(); block.localToWorld(wq.set(0, 0, CZ)); plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1).applyQuaternion(block.getWorldQuaternion(new THREE.Quaternion())), wq); if (!ray.intersectPlane(plane, hit)) return null; return block.worldToLocal(hit.clone()); };
    const pointer = {
      down(rc) { if (!rc.intersectObject(climbPick, false).length) return false; S.drag = true; document.getElementById('c').style.cursor = 'grabbing'; return true; },
      move(rc) {
        const c = document.getElementById('c');
        if (!S.drag) {
          if (c) c.style.cursor = rc.intersectObject(climbPick, false).length ? 'grab' : '';
          const ht = rc.intersectObject(topMesh, false)[0];
          if (ht) { const l = block.worldToLocal(ht.point.clone()), kd = kindAt(l.x, heightM(l.x, l.z)); aHover.setText(KIND[kd].name); aHover.position.set(l.x, l.y + 0.01, l.z); aHover.userData.want = 1; } else aHover.userData.want = 0;
          return false;
        }
        const p = onFace(rc.ray); if (!p) return true; S.u = Math.max(-0.985, Math.min(0.985, xm(p.x))); S.moved = true; placeClimber(); return true;
      },
      up() { if (!S.drag) return false; S.drag = false; document.getElementById('c').style.cursor = ''; drawLog(); sayZone(); return true; },
    };
    const sayZone = () => { const side = sideNow(); if (!W) return; if (side === 'north' && S.m === 'hima' && !S.saidN) { S.saidN = true; W.ui.status('翻到<b>北坡</b>了。北坡的山麓就是约 4 300 米的高原，比南坡山脚冷了 20 ℃ 左右（按每 100 米 0.6 ℃ 算）；又是背风坡，降水少。往下走到山麓，看北坡一共有几个带。'); } else if (side === 'south' && S.m === 'hima' && S.seen.south.size >= 7 && !S.saidS) { S.saidS = true; W.ui.status('南坡从常绿阔叶林一路排到积雪冰川。再<b>翻过山顶</b>，把北坡也走一遍，比一比。'); } };

    const switchMountain = (m) => { S.m = m; S.u = 0.93; if (m === 'cb') S.tried.add('cb'); rebuild(); drawLog(); };
    rebuild();

    return {
      group,
      card: false,
      emerge: 'flat',          // 课本的图平放在书页上，模型从它上面长出来、它慢慢淡掉
      size: { w: 0.4, d: 0.15, h: 0.17 },
      view: { elev: 14, azim: 8, lookY: 0.45, frameMargin: 1.14 },
      pointer,
      debug: { go: (u) => { S.u = u; S.moved = true; placeClimber(); drawLog(); sayZone(); }, set: (k, v) => { S[k] = v; rebuild(); drawLog(); } },
      mount(ui) {
        const mSeg = seg('看哪座山', ['喜马拉雅山脉（约 28°N）', '长白山（约 42°N）'], (_, i) => { switchMountain(i ? 'cb' : 'hima'); cutSl.el.style.display = lowBtn.el.style.display = i ? 'none' : ''; ui.status(i ? '<b>长白山</b>在东北，纬度比喜马拉雅高得多；中国境内的最高峰白云峰只有 2 691 米，山顶是火山口和天池。拖着登山的人从山脚爬上去，数数有几个带。' : '回到喜马拉雅山。'); }, { value: 0 });
        const cutSl = slider('假如山只有这么高（只对喜马拉雅）', { min: 4500, max: 8900, step: 100, value: 8900, fmt: (v) => (v >= 8900 ? '原样 8 848.86 米' : `${fmt(v)} 米`), onInput: (v) => { S.cut = v >= 8900 ? 8848.86 : v; if (v < 8900) { S.tried.add('cut'); S.cuts[v] = bandsBelow('hima', 'south', v).length; } rebuild(); drawLog(); } });
        const lowBtn = buttons([{ text: '假如北坡山麓也低到 1 000 米', onClick: () => { S.northLow = !S.northLow; lowBtn.btns[0].textContent = S.northLow ? '回到真实的北坡' : '假如北坡山麓也低到 1 000 米'; if (S.northLow) { S.tried.add('low'); ui.status('假如北坡山麓也低到 1 000 米：多出来的这一段画成了“？”。北坡仍是背风坡、降水少——它会长出南坡那么多种植被吗？想一想，再看侧栏。'); } rebuild(); drawLog(); } }]);
        const guess = seg(...ASK, (_, i) => { S.guess = i; drawLog(); }, { value: -1 });
        const acts = buttons([{ text: '重来', ghost: true, onClick: () => { ui.relock?.(); Object.assign(S, { m: 'hima', cut: 8848.86, northLow: false, u: 0.93, guess: null, moved: false, cuts: {}, saidN: false, saidS: false }); S.seen = { south: new Set(), north: new Set(), cb: new Set() }; S.tried = new Set(); mSeg.set(0); cutSl.set(8900); guess.set(-1); lowBtn.btns[0].textContent = '假如北坡山麓也低到 1 000 米'; cutSl.el.style.display = lowBtn.el.style.display = ''; rebuild(); drawLog(); ui.status(START); } }]);
        const chart = h('canvas', { class: 'wx-map', width: 320, height: 250, style: 'cursor: pointer' }), read = h('div', { class: 'read-out' }), log = h('div', { class: 'timeline' });
        chart.onclick = (e) => {          // 点侧栏带谱的某一格：登山的人走到那一坡的那个海拔
          const r = chart.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * chart.width, py = ((e.clientY - r.top) / r.height) * chart.height, G = chartGeom, i = px < G.L + 6 + G.colW + G.gap / 2 ? 0 : 1, m = ((G.bot - py) / (G.bot - G.top)) * G.H, key = COLS()[i][0];
          if (key === 'south' && S.m === 'cb') return;
          let best = S.u, bd = 1e9;
          for (let u = -0.98; u <= 0.98; u += 0.004) { const sd = S.m === 'cb' ? 'cb' : sideOf('hima', u); if ((S.m === 'hima' && sd !== key) || (S.m === 'cb' && Math.sign(u) !== 1)) continue; const d = Math.abs(heightM(xOf(u), CZ) - m); if (d < bd) { bd = d; best = u; } }
          S.u = best; S.moved = true; placeClimber(); drawLog(); sayZone();
        };
        ui.controls.append(h('div', { class: 'bar-title' }, '两坡的带谱（按真实海拔；走过才上色，点一格就走过去）'), chart, read, mSeg.el, cutSl.el, lowBtn.el, guess.el, acts.el, note('山上的植被是符号：圆的是阔叶树，尖的是针叶树，矮的是灌木，小草是草甸、草原，石块是荒漠。'));
        ui.data.append(h('div', { class: 'bar-title' }, '你看到了什么'), log);
        W = { ui, chart, read, log };
        ui.status(START);
        drawChart(); drawLog();
      },
      update(dt, t) { labels.forEach((l) => l.tick(dt)); placeWeather(t || 0);
        if (rain.visible) { for (let i = 0; i < rainN; i++) { const d = drops[i], c = clouds[d.c]; d.t += dt * 0.9; if (d.t > 1) { d.t = 0; d.c = Math.floor(rnd() * 16); d.dx = (rnd() - 0.5) * 0.02; } const cp = c.position, gy = heightM(cp.x + (d.dx || 0), cp.z) * K(), y0 = cp.y - 0.004, y = y0 - (y0 - gy) * d.t; rainP.set([cp.x + (d.dx || 0), y, cp.z, cp.x + (d.dx || 0) - 0.0006, y - 0.0035, cp.z], i * 6); } rainGeo.attributes.position.needsUpdate = true; }
      },
    };
  },
};
const START = '这是喜马拉雅山，前面切开的剖面就是课本图 5.12。<b>按住登山的人</b>，从南坡山脚（约 1 000 米）往上拖，看一路上的景观怎么变。';
