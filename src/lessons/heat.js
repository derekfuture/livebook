// 高中地理 必修第一册 第二章第二节 大气受热过程和大气运动 · 大气的受热过程、大气对地面的保温作用（课本第 34–35 页，图 2.9、图 2.10、活动“说明地球大气的保温作用”）。
//
// 一个问题（课本活动）：同样晒着太阳，为什么月球表面白天一百多摄氏度、夜里零下一百多摄氏度，地球表面的昼夜温差却小得多？
// 课本的图就是模型：图 2.10 那样并排的两块——左边月球表面（没有大气，天总是黑的），右边地球表面（上面一层大气，画着大气上界）；同一个太阳照着两边。
// 学生亲手做的：
//   1. 拖着太阳走（或让一天走）：一份份辐射看得见——太阳短波辐射往下，地面长波辐射往上；地球这边大气把地面辐射拦住、又以大气逆辐射还给地面。
//      两边地面上各立一支温度计，侧栏把一天的温度画出来比。
//   2. 给地球的天空加上浓密的低云：白天云把更多阳光反射回去，没那么热；夜里大气逆辐射更强，没那么冷。
// 数据：kit/heat.js（tools/geo/heat_check.mjs 核对课本说法）。教学示意：月球的一昼夜约等于地球上的一个月，这里画成一样长；数值是示意。
import * as THREE from 'three';
import { seg, slider, buttons, note } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { h } from '../ui/Panel.js';
import { faceLabel, airLabel, noteBadge } from './kit/labels.js';
import { SKY, K0, steady, step, fluxes, toa, advanceComparison, otherSky, surfaceShortwave } from './kit/heat.js';

const ZD = 0.05, GY = 0.012, TOP = 0.105, MX = -0.09, EX = 0.09, CW = 0.075;          // 地面高度、大气上界、月球和地球两块的中心、半宽
const TMIN = -160, TMAX = 140;          // 温度计的刻度（两支一样）
const ASK = ['先猜一下（可以不猜）：同样晒着太阳，月球表面的昼夜温差比地球表面——', ['大得多', '小得多', '差不多']];
const rnd = (() => { let s = 19; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const hm = (t) => `${Math.floor(((t % 24) + 24) % 24)} 时`;

export default {
  id: 'heat',
  fig: '图2.10',
  title: '大气的受热过程和保温作用',
  flow: 'explore',
  ask: '同样晒着太阳，月球表面白天一百多摄氏度、夜里零下一百多摄氏度，地球表面的昼夜温差却小得多。地球比月球多了什么？',
  need: '让一天走一遍，比一比两支温度计；看看地球比月球多了哪几种辐射；再给地球的天空加上浓密的低云，过一个白天或一个夜晚',
  conclusion: {
    page: 39,
    quote: '到达地球表面的太阳辐射，被地面吸收和反射。地面因吸收太阳辐射而增温，同时又以长波辐射的形式把热量传递给近地面大气。……地面长波辐射是近地面大气主要的、直接的热源。……地面辐射的长波辐射除极少部分穿过大气，到达宇宙空间外，绝大部分（75%—95%）被对流层中的水汽、二氧化碳等吸收。……大气辐射除一小部分向上射向宇宙空间外，大部分向下射向地面，其方向与地面辐射方向相反，故称大气逆辐射。大气逆辐射把热量传给地面，这就在一定程度上补偿了地面辐射损失的热量，对地面起到了保温作用。天空有云，特别是浓密的低云时，大气逆辐射更强。',
    why: '月球几乎没有大气：白天阳光毫无削减地晒在表面，表面很快热到一百多摄氏度；夜里表面的辐射直接散到宇宙空间，没有东西还回来，就冷到零下一百多摄氏度。地球多了一层大气：白天它反射、吸收掉一部分太阳辐射，地面不会那么热；地面辐射的长波辐射绝大部分被大气吸收，大气又以大气逆辐射把热量还给地面，夜里地面就不会那么冷。所以地球的昼夜温差小得多。大气是重要原因，真实差异还受昼夜长度及地表热性质影响；这里不量化各因素贡献。浓密的低云让这两样都更明显：白天反射更多阳光，夜里逆辐射更强。',
    src: '课本第 34–35 页 · 第二章 第二节 大气受热过程和大气运动',
  },

  create({ tag }) {
    const group = new THREE.Group(), block = new THREE.Group(); group.add(block);
    const S = { t: 10, sky: 'clear', play: false, drag: false, st: null, trace: [], day0: null, seg: null, rec: { nights: {}, days: {}, full: null }, moved: false, guess: null };
    let W = null;
    const reset = () => { const st = steady('clear'); for (let t = 0; t < 10; t += 0.25) step(st, t, 0.25, 'clear'); Object.assign(S, { t: 10, sky: 'clear', play: false, st, trace: [], seg: null, rec: { nights: {}, days: {}, full: null }, moved: false, guess: null, start: 10, dayTr: { mMax: -1e9, mMin: 1e9, gMax: -1e9, gMin: 1e9, from: 10 } }); };
    reset();

    // ---- 两块地面：月球表面（灰、有坑）、地球表面（草地、一座小房子、两棵树） ----
    const grain = canvasTex(256, 256, (g, w) => { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, w); for (let i = 0; i < 2600; i++) { const v = 140 + Math.random() * 110; g.fillStyle = `rgba(${v},${v},${v},${0.25 + Math.random() * 0.35})`; g.fillRect(Math.random() * w, Math.random() * w, 1.6, 1.6); } }, { repeat: [2, 2] });

    // 封闭高度地块：四周接到同一底面，纹理只作中性表面细节。
    const solidLand = (cx, width, depth, height, material, sideMaterial) => {
      const geo = new THREE.PlaneGeometry(width, depth, 96, 64); geo.rotateX(-Math.PI / 2);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) p.setY(i, height(p.getX(i), p.getZ(i)));
      geo.computeVertexNormals(); const mesh = new THREE.Mesh(geo, material); mesh.position.x = cx; block.add(mesh);
      const positions = [], uv = [], indices = [];
      for (let edge = 0; edge < 4; edge++) for (let i = 0; i <= 96; i++) {
        const t = i / 96, x = edge < 2 ? (t - 0.5) * width : (edge === 2 ? -1 : 1) * width / 2, z = edge < 2 ? (edge === 0 ? -1 : 1) * depth / 2 : (t - 0.5) * depth;
        const j = positions.length / 3, y = height(x, z); positions.push(x, y, z, x, 0, z); uv.push(t * 2, 1, t * 2, 0);
        if (i < 96) indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
      }
      const wall = new THREE.BufferGeometry(); wall.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); wall.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); wall.setIndex(indices); wall.computeVertexNormals();
      const sides = new THREE.Mesh(wall, sideMaterial); sides.position.x = cx; block.add(sides);
      const bottom = new THREE.Mesh(new THREE.PlaneGeometry(width, depth).rotateX(Math.PI / 2), sideMaterial); bottom.position.x = cx; block.add(bottom); return mesh;
    };
    // 独立的装饰随机数不改变云雨、辐射粒子的原有随机序列。
    let scenerySeed = 821; const sceneryRandom = () => ((scenerySeed = scenerySeed * 16807 % 2147483647) / 2147483647);
    const grove = (points, height, scale = 1) => {
      const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.00045, 0.00065, 0.004, 6).translate(0, 0.002, 0), new THREE.MeshStandardMaterial({ color: 0x735a40, roughness: 1 }), points.length);
      const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.0032, 1).scale(1, 1.25, 1).translate(0, 0.006, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), points.length);
      const dummy = new THREE.Object3D(), color = new THREE.Color();
      points.forEach(([x, z], i) => { dummy.position.set(x, height(x, z), z); dummy.rotation.y = sceneryRandom() * 6.28; dummy.scale.setScalar(scale * (0.7 + sceneryRandom() * 0.5)); dummy.updateMatrix(); trunks.setMatrixAt(i, dummy.matrix); crowns.setMatrixAt(i, dummy.matrix); color.setHSL(0.25 + sceneryRandom() * 0.06, 0.32, 0.28 + sceneryRandom() * 0.13); crowns.setColorAt(i, color); });
      trunks.raycast = crowns.raycast = () => {}; block.add(trunks, crowns);
    };
    const earthHeight = (x, z) => GY - 0.001 + 0.0025 * Math.sin(x * 55 + 1) * Math.cos(z * 70) + 0.0005 * Math.sin(z * 170 + x * 130);
    const rockGrain = canvasTex(512, 256, (c, w, h) => { c.fillStyle = '#aaa18e'; c.fillRect(0, 0, w, h); for (let i = 0; i < 24; i++) { c.strokeStyle = 'rgba(68,60,48,0.12)'; c.beginPath(); for (let x = 0; x <= w; x += 8) c.lineTo(x, i * 12 + Math.sin(x / 60 + i) * 3); c.stroke(); } });
    const slab = (cx, color, bump) => solidLand(cx, CW * 2, ZD * 2, (x, z) => GY + bump(x, z), new THREE.MeshStandardMaterial({ color, map: grain, roughness: 0.95, side: THREE.DoubleSide }), new THREE.MeshStandardMaterial({ color: cx === MX ? 0x8a8885 : 0xb4a186, map: cx === MX ? grain : rockGrain, roughness: 1, side: THREE.DoubleSide }));
    const craters = Array.from({ length: 9 }, () => [(rnd() - 0.5) * CW * 1.7, (rnd() - 0.5) * ZD * 1.7, 0.006 + rnd() * 0.01]);
    slab(MX, 0x9a9894, (x, z) => { let y = 0.001 * Math.sin(x * 130) * Math.sin(z * 160); for (const [cx, cz, r] of craters) { const d = Math.hypot(x - cx, z - cz) / r; if (d < 1.6) y += -0.0045 * Math.exp(-d * d * 3) + 0.0026 * Math.exp(-Math.pow((d - 1) / 0.22, 2)); } return y; });
    slab(EX, 0x7fae5a, (x, z) => earthHeight(x, z) - GY);
    { const house = new THREE.Group(); const wall = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.01, 0.012), new THREE.MeshLambertMaterial({ color: 0xf1ebdd })); wall.position.y = 0.005; house.add(wall); const roof = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.007, 4).rotateY(Math.PI / 4), new THREE.MeshLambertMaterial({ color: 0xbf513b })); roof.position.y = 0.0135; house.add(roof); house.position.set(EX + 0.035, earthHeight(0.035, -0.028), -0.028); block.add(house);
      for (const [x, z] of [[EX + 0.055, -0.01], [EX - 0.05, -0.032]]) { const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.0008, 0.001, 0.008, 6), new THREE.MeshLambertMaterial({ color: 0x7a5636 })); tr.position.set(x, earthHeight(x - EX, z) + 0.004, z); block.add(tr); const cr = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 10, 8), new THREE.MeshLambertMaterial({ color: 0x4f8a3e })); cr.position.set(x, earthHeight(x - EX, z) + 0.012, z); block.add(cr); } }

    const trees = []; for (let i = 0; i < 100; i++) { const x = EX - CW + 0.007 + sceneryRandom() * (2 * CW - 0.014), z = -ZD + 0.005 + sceneryRandom() * 0.032; if (Math.hypot(x - EX - 0.035, z + 0.028) > 0.016) trees.push([x, z]); }
    grove(trees, (x, z) => earthHeight(x - EX, z), 0.7);

    // ---- 天空：月球那边一直是黑的（没有大气散射阳光）；地球那边白天是蓝的，夜里变暗；地球上面一层大气，顶上是大气上界 ----
    const skyTex = (top, bot) => canvasTex(16, 128, (g, w, hh) => { const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, w, hh); });
    const back = (cx, mat) => { const hgt = TOP + 0.02, g2 = new THREE.CylinderGeometry(CW, CW, hgt, 48, 1, true, Math.PI / 2, Math.PI); g2.scale(1, 1, ZD / CW); mat.side = THREE.DoubleSide; const m = new THREE.Mesh(g2, mat); m.position.set(cx, GY + hgt / 2 - 0.0005, 0); m.raycast = () => {}; block.add(m); return m; };          // 天幕：弯成半圈围在地块后面（像一个小舞台的天幕），不是一张立着的纸片
    back(MX, new THREE.MeshBasicMaterial({ map: skyTex('#0b0f1c', '#1a1f2e') }));
    const dayM = new THREE.MeshBasicMaterial({ map: skyTex('#3f78b8', '#bcd8ee') }), nightM = new THREE.MeshBasicMaterial({ map: skyTex('#0d1530', '#2a3a62'), transparent: true, opacity: 0 });
    back(EX, dayM); const nightBack = back(EX, nightM); nightBack.position.z += 0.0005;
    const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 70 }).flatMap(() => { const th = Math.PI / 2 + rnd() * Math.PI; return [MX + Math.sin(th) * CW * 0.97, GY + 0.015 + rnd() * (TOP - 0.01), Math.cos(th) * ZD * 0.97]; }), 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 0.0016, transparent: true, opacity: 0.8 })); stars.raycast = () => {}; block.add(stars);          // 星星贴在弯的天幕里面
    const air = new THREE.Mesh(new THREE.BoxGeometry(CW * 2, TOP - GY, ZD * 2), new THREE.MeshLambertMaterial({ color: 0x9fc6ea, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide })); air.position.set(EX, GY + (TOP - GY) / 2, 0); air.renderOrder = 3; air.raycast = () => {}; block.add(air);
    const lineM = new THREE.LineDashedMaterial({ color: 0x2a4a72, dashSize: 0.003, gapSize: 0.002, transparent: true, opacity: 0.7 });
    { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(EX - CW, TOP, ZD), new THREE.Vector3(EX + CW, TOP, ZD), new THREE.Vector3(EX + CW, TOP, -ZD)]), lineM); l.computeLineDistances(); block.add(l); }
    faceLabel(block, '大气上界', { x: EX + 0.012, y: TOP + 0.004, z: ZD, h: 0.0055, color: '#1f3f68', stroke: 'rgba(255,255,255,0.7)' });
    faceLabel(block, '月球表面', { x: MX, y: GY / 2, z: ZD, h: 0.0068, color: '#ffffff', stroke: 'rgba(30,30,30,0.5)' });
    faceLabel(block, '地球表面', { x: EX, y: GY / 2, z: ZD, h: 0.0068, color: '#ffffff', stroke: 'rgba(30,40,20,0.5)' });
    // 浓密的低云
    const cloudTex = canvasTex(256, 256, (g, w) => {
      for (let i = 0; i < 12; i++) { const x = w * (0.23 + (i % 4) * 0.17), y = w * (0.39 + Math.sin(i * 2.3) * 0.12), r = w * (0.16 + (i % 3) * 0.025); const gr = g.createRadialGradient(x - r * 0.2, y - r * 0.3, r * 0.12, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.55, 'rgba(240,246,250,0.85)'); gr.addColorStop(0.85, 'rgba(194,209,221,0.38)'); gr.addColorStop(1, 'rgba(194,209,221,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); }
    });
    const cloud = new THREE.Group(); block.add(cloud);
    for (let i = 0; i < 18; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, color: 0xd9dde4, transparent: true, depthWrite: false })); s.position.set(EX + (rnd() - 0.5) * CW * 1.7, GY + 0.034 + rnd() * 0.01, (rnd() - 0.5) * ZD * 1.6); const r = 0.022 + rnd() * 0.012; s.scale.set(r * 1.5, r * 0.75, 1); s.raycast = () => {}; cloud.add(s); }
    cloud.visible = false;

    // ---- 太阳：在两块上空走一道弧，拖着它走就是换时刻 ----
    const SR = 0.17, SC = new THREE.Vector3(0, TOP + 0.03, -ZD * 0.2);
    const sun = new THREE.Mesh(new THREE.SphereGeometry(0.011, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffd36a })); block.add(sun);
    const glowTex = canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,225,140,0.9)'); gr.addColorStop(0.4, 'rgba(255,205,110,0.35)'); gr.addColorStop(1, 'rgba(255,200,100,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false })); glow.scale.set(0.06, 0.06, 1); glow.raycast = () => {}; sun.add(glow);
    const sunPick = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); sunPick.userData.pick = true; sun.add(sunPick);
    const sunAng = (t) => (Math.PI * (((t % 24) + 24) % 24 - 6)) / 12;          // 6 时在东边地平线（右），12 时在头顶，18 时落到西边（左）

    // ---- 一份份辐射：沿着几条“车道”走，颜色和课本图一样（太阳辐射黄、地面辐射橙、大气辐射红） ----
    const C = { sun: 0xffcf3a, ground: 0xf08a3a, atm: 0xd8452e };
    const LANE = { mSun: MX - 0.04, mUp: MX + 0.035, eSun: EX - 0.05, eUp: EX - 0.005, eBack: EX + 0.035, eSpace: EX + 0.06 };
    const arrowTex = canvasTex(32, 128, (g, w, hh) => { const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = gr; g.beginPath(); g.moveTo(w * 0.35, 0); g.lineTo(w * 0.65, 0); g.lineTo(w * 0.65, hh * 0.72); g.lineTo(w * 0.95, hh * 0.72); g.lineTo(w / 2, hh); g.lineTo(w * 0.05, hh * 0.72); g.lineTo(w * 0.35, hh * 0.72); g.closePath(); g.fill(); });          // 一支往下指的小箭头
    const NP = 150, packs = [], pmats = {};
    for (const k in C) pmats[k] = new THREE.MeshBasicMaterial({ color: C[k], map: arrowTex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const pgeo = new THREE.PlaneGeometry(0.0045, 0.014);
    for (let i = 0; i < NP; i++) { const m = new THREE.Mesh(pgeo, pmats.sun); m.visible = false; m.raycast = () => {}; m.renderOrder = 6; block.add(m); packs.push({ m, on: false }); }
    const spawn = (kind, x, y0, y1, fate = null) => { const p = packs.find((q) => !q.on); if (!p) return; Object.assign(p, { on: true, kind, x: x + (rnd() - 0.5) * 0.008, z: (rnd() - 0.5) * ZD * 1.2, y: y0, y0, y1, fate, t: 0 }); p.m.material = pmats[kind]; p.m.visible = true; };
    const acc = {};
    const emit = (key, rate, dt, fn) => { acc[key] = (acc[key] || 0) + rate * dt; while (acc[key] >= 1) { acc[key] -= 1; fn(); } };
    const AIRMID = GY + (TOP - GY) * 0.55;
    const stepPacks = (dt, f) => {
      const k = 1 / 120, sw = surfaceShortwave(f);          // 每秒放几份：辐射越强放得越多
      emit('mSun', sw.moonAbsorb * k, dt, () => spawn('sun', LANE.mSun, TOP + 0.01, GY + 0.002));
      emit('mRefl', sw.moonReflect * k, dt, () => spawn('sun', LANE.mSun, TOP + 0.01, GY + 0.002, 'bounce'));
      emit('mUp', f.moon.up * k, dt, () => spawn('ground', LANE.mUp, GY + 0.002, TOP + 0.015));
      emit('eSunR', f.earth.refl * k, dt, () => spawn('sun', LANE.eSun, TOP + 0.01, S.sky === 'cloud' ? GY + 0.044 : TOP - 0.004, 'bounce'));          // 一部分被大气、云反射回去
      emit('eSunA', f.earth.atmAbsS * k, dt, () => spawn('sun', LANE.eSun, TOP + 0.01, AIRMID, 'absorb'));
      emit('eSunG', sw.groundAbsorb * k, dt, () => spawn('sun', LANE.eSun, TOP + 0.01, GY + 0.002));
      emit('eGroundRefl', sw.groundReflect * k, dt, () => spawn('sun', LANE.eSun, TOP + 0.01, GY + 0.002, 'bounce'));
      emit('eUpA', f.earth.lwAbsorbed * k, dt, () => spawn('ground', LANE.eUp, GY + 0.002, AIRMID - 0.01 + rnd() * 0.02, 'absorb'));          // 地面辐射绝大部分被大气吸收
      emit('eUpS', f.earth.lwEscape * k, dt, () => spawn('ground', LANE.eUp, GY + 0.002, TOP + 0.015));
      emit('eBack', f.earth.back * k, dt, () => spawn('atm', LANE.eBack, AIRMID, GY + 0.002));          // 大气逆辐射
      emit('eSpace', f.earth.space * k, dt, () => spawn('atm', LANE.eSpace, AIRMID, TOP + 0.015));
      for (const p of packs) {
        if (!p.on) continue; p.t += dt;
        const v = 0.05 * dt * Math.sign(p.y1 - p.y0); p.y += v;
        const done = (p.y1 - p.y) * Math.sign(p.y1 - p.y0) <= 0;
        if (done && p.fate === 'bounce') { Object.assign(p, { y0: p.y, y1: TOP + 0.02, fate: 'fade', x: p.x + 0.012 }); }
        else if (done) { p.on = false; p.m.visible = false; continue; }
        const up = p.y1 > p.y0, fade = p.fate === 'absorb' ? Math.min(1, Math.abs(p.y1 - p.y) / 0.012) : 1;
        p.m.position.set(p.x, p.y, p.z); p.m.rotation.set(0, 0, up ? Math.PI : 0); p.m.material.opacity = 1; p.m.scale.setScalar(0.4 + 0.6 * fade);
      }
    };
    const pLabels = { mSun: airLabel(block, '太阳辐射', { h: 0.0072, color: '#9a6a08', dim: 0 }), mUp: airLabel(block, '月球表面辐射', { h: 0.0072, color: '#a8541a', dim: 0 }), eSun: airLabel(block, '太阳辐射', { h: 0.0072, color: '#9a6a08', dim: 0 }), eUp: airLabel(block, '地面辐射', { h: 0.0072, color: '#a8541a', dim: 0 }), eBack: airLabel(block, '大气逆辐射', { h: 0.0072, color: '#a8341f', dim: 0 }), eSpace: airLabel(block, '大气辐射', { h: 0.0072, color: '#a8341f', dim: 0 }) };
    pLabels.mSun.position.set(LANE.mSun + 0.022, GY + 0.05, ZD * 0.7); pLabels.mUp.position.set(LANE.mUp + 0.024, GY + 0.075, ZD * 0.7); pLabels.eSun.position.set(LANE.eSun + 0.014, GY + 0.075, ZD * 0.7); pLabels.eUp.position.set(LANE.eUp + 0.006, GY + 0.022, ZD * 0.7); pLabels.eBack.position.set(LANE.eBack + 0.012, GY + 0.045, ZD * 0.7); pLabels.eSpace.position.set(LANE.eSpace - 0.004, TOP - 0.018, ZD * 0.7);

    // ---- 两支温度计：一样的刻度，立在两块地面的前面 ----
    const thermo = (cx) => {
      const g = new THREE.Group(), L = 0.07, glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.1 });
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, L, 12), glass); tube.position.y = L / 2 + 0.004; g.add(tube);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.0036, 14, 10), new THREE.MeshLambertMaterial({ color: 0xd83a2a })); bulb.position.y = 0.003; g.add(bulb);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 1, 8).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: 0xd83a2a })); col.position.y = 0.004; g.add(col);
      const board = new THREE.Mesh(new THREE.PlaneGeometry(0.012, L + 0.006), new THREE.MeshLambertMaterial({ map: canvasTex(64, 384, (c, w, hh) => { c.fillStyle = '#f8f5ec'; c.fillRect(0, 0, w, hh); c.fillStyle = '#3a3226'; c.font = '600 15px "PingFang SC", sans-serif'; c.textAlign = 'right'; for (let T = -150; T <= 150; T += 50) { const y = hh - 16 - ((T - TMIN) / (TMAX - TMIN)) * (hh - 32); c.fillRect(w - 12, y - 1, 12, 2); c.fillText(String(T), w - 15, y + 5); } c.fillStyle = '#2a5a9a'; const y0 = hh - 16 - ((0 - TMIN) / (TMAX - TMIN)) * (hh - 32); c.fillRect(0, y0 - 1, w, 2); }) })); board.position.set(-0.0085, L / 2 + 0.004, -0.0005); g.add(board);
      g.position.set(cx, GY, ZD * 0.78); block.add(g); g.userData = { col, L }; return g;
    };
    const thM = thermo(MX - CW + 0.02), thE = thermo(EX - CW + 0.02);
    const setThermo = (th, T) => { const f = (Math.min(TMAX, Math.max(TMIN, T)) - TMIN) / (TMAX - TMIN); th.userData.col.scale.y = Math.max(0.001, f * th.userData.L); };
    const tM = airLabel(block, '', { h: 0.0078, color: '#2c3245', icon: 'thermo' }), tE = airLabel(block, '', { h: 0.0078, color: '#2c3245', icon: 'thermo' });
    tM.position.set(MX - CW + 0.02, GY + 0.088, ZD * 0.78); tE.position.set(EX - CW + 0.02, GY + 0.088, ZD * 0.78);
    const tHint = tag('<span>按住太阳，往左拖</span><small>太阳落下去，就是夜里</small>', 'hint');
    noteBadge(tag, '教学示意：月球的一昼夜约等于地球上的一个月，这里画成一样长；同一个太阳照着两边；黄色短波到达表面后，一部分吸收、一部分反射向外；箭头多少表示辐射强弱，数值是示意。两边地表的性质（吸热、反射）也不一样，这里只看大气让温差变小的方向，不用来算大气单独让温差小了多少').loc(block, MX - CW + 0.006, -0.002, ZD + 0.01);
    const labels = [...Object.values(pLabels), tM, tE];

    // ---- 摆好 ----
    const layout = () => {
      const a = sunAng(S.t), day = toa(S.t) > 0;
      sun.position.set(SC.x + Math.cos(a) * SR, SC.y + Math.sin(a) * 0.045, SC.z); sun.visible = Math.sin(a) > -0.05;          // 太阳在两块的上空走一道扁弧
      const n = Math.min(1, Math.max(0, (0.15 - Math.sin(a)) / 0.3)); nightM.opacity = n; stars.material.opacity = 0.8;
      cloud.visible = S.sky === 'cloud'; cloud.children.forEach((c) => c.material.color.setScalar(day ? 0.88 : 0.45));
      const Tm = S.st.m - K0, Tg = S.st.g - K0; setThermo(thM, Tm); setThermo(thE, Tg);
      tM.setText(`月球表面 ${Tm >= 0 ? '+' : '−'}${Math.abs(Tm).toFixed(0)} ℃`); tE.setText(`地球表面 ${Tg >= 0 ? '+' : '−'}${Math.abs(Tg).toFixed(0)} ℃`);
      tHint.loc(block, sun.position.x, sun.position.y + 0.032, sun.position.z).show(!S.moved && sun.visible);
      const f = fluxes(S.st, S.t, S.sky), lit = (l, on) => l.setOn(on);
      lit(pLabels.mSun, f.sun > 50); lit(pLabels.eSun, f.sun > 50); lit(pLabels.mUp, true); lit(pLabels.eUp, true); lit(pLabels.eBack, true); lit(pLabels.eSpace, true);
      drawChart();
    };
    // 时间往前走：积分温度，记下这一天、这一夜的最高最低
    // 时间往前走：一小步一小步地积分，每一小步都记下温度（拨得再快也不漏掉中间的最高、最低）
    // 对照：每个白天（6—18 时）、夜晚（18—次日 6 时）开始时，从同一个状态另起一个“孪生”地面，用另一种天空走完同一段；比的是同一时段、同一起点
    const other = otherSky;
    const advance = (dt) => advanceComparison(S, dt, () => {
        const Tm = S.st.m - K0, Tg = S.st.g - K0;
        S.trace.push({ t: S.t, m: Tm, g: Tg, sky: S.sky }); if (S.trace.length > 2000) S.trace.shift();
        const D = S.dayTr; D.mMax = Math.max(D.mMax, Tm); D.mMin = Math.min(D.mMin, Tm); D.gMax = Math.max(D.gMax, Tg); D.gMin = Math.min(D.gMin, Tg);
        if (S.t - D.from >= 24 - 1e-6) { if (!S.rec.full) { S.rec.full = { ...D }; W?.ui.status(`过了一整天：月球表面最高约 ${D.mMax.toFixed(0)} ℃、最低约 ${D.mMin.toFixed(0)} ℃；地球表面只在 ${D.gMin.toFixed(0)}–${D.gMax.toFixed(0)} ℃ 之间。再给地球的天空<b>加上浓密的低云</b>，过一个白天或一个夜晚试试。`); drawLog(); } S.dayTr = { mMax: -1e9, mMin: 1e9, gMax: -1e9, gMin: 1e9, from: S.t }; }
    }, (r) => {
      const rec = r.key === 'n' ? S.rec.nights : S.rec.days;
      rec[r.sky] = { v: r.key === 'n' ? r.min : r.max, twin: r.key === 'n' ? r.tmin : r.tmax, twinSky: other(r.sky) };
      drawLog(); sayCloud(r);
    });
    const sayCloud = (r) => {
      if (!W) return; const night = r.key === 'n', a = night ? r.min : r.max, b = night ? r.tmin : r.tmax, cloudV = r.sky === 'cloud' ? a : b, clearV = r.sky === 'cloud' ? b : a, d = cloudV - clearV;
      W.ui.status(night ? `同一个夜晚、同样的起点：有浓密的低云，地球表面最低约 <b>${cloudV.toFixed(0)} ℃</b>；晴夜约 <b>${clearV.toFixed(0)} ℃</b>。${d > 0.5 ? '有云的夜里大气逆辐射更强，地面没那么冷。' : '这一夜差别不大。'}` : `同一个白天、同样的起点：有浓密的低云，地球表面最高约 <b>${cloudV.toFixed(0)} ℃</b>；晴天约 <b>${clearV.toFixed(0)} ℃</b>。${d < -0.5 ? '云把更多阳光反射回去，地面没那么热。' : '这个白天差别不大。'}`);
    };

    // ---- 侧栏：两支温度计一天里的读数（上面月球、下面地球，刻度不同才看得清地球那条） ----
    const drawChart = () => {
      if (!W) return;
      const c = W.chart, g = c.getContext('2d'), w = c.width, hh = c.height, L = 40, R = w - 8, t1 = S.t, t0 = t1 - 24, PX = (t) => L + ((t - t0) / 24) * (R - L);
      g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, hh);
      const panel = (y0, y1, lo, hi, step, title, key, color) => {
        const PY = (v) => y1 - ((v - lo) / (hi - lo)) * (y1 - y0);
        g.font = '600 12px "PingFang SC", sans-serif'; g.fillStyle = '#3a3226'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(title, L, y0 - 9);
        g.font = '11px "PingFang SC", sans-serif'; g.textAlign = 'right';
        for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { g.fillStyle = '#7a705e'; g.fillText(String(v), L - 5, PY(v)); g.strokeStyle = v === 0 ? 'rgba(42,90,154,0.35)' : 'rgba(60,50,40,0.08)'; g.beginPath(); g.moveTo(L, PY(v)); g.lineTo(R, PY(v)); g.stroke(); }
        for (let d = Math.ceil(t0 / 24) * 24 - 24; d < t1; d += 24) { const n0 = Math.max(t0, d + 18), n1 = Math.min(t1, d + 30); if (n1 > n0) { g.fillStyle = 'rgba(30,40,80,0.06)'; g.fillRect(PX(n0), y0, PX(n1) - PX(n0), y1 - y0); } }          // 夜里涂一层淡灰
        g.lineWidth = 2; let prev = null;
        for (const p of S.trace) { if (p.t < t0) continue; const x = PX(p.t), y = PY(Math.max(lo, Math.min(hi, p[key]))); if (prev) { g.strokeStyle = key === 'g' && p.sky === 'cloud' ? '#6b7a8c' : color; g.beginPath(); g.moveTo(prev[0], prev[1]); g.lineTo(x, y); g.stroke(); } prev = [x, y]; }
        g.lineWidth = 1;
      };
      panel(22, 112, -150, 130, 50, '月球表面（℃）', 'm', '#8a8a8a');
      const gv = S.trace.filter((p) => p.t >= t0).map((p) => p.g), glo = Math.floor(Math.min(10, ...gv) / 10) * 10, ghi = Math.ceil(Math.max(40, ...gv) / 10) * 10;          // 地球那条：刻度按实际温度放，不截掉
      panel(146, 226, glo, ghi, ghi - glo > 40 ? 20 : 10, '地球表面（℃，刻度放大了）', 'g', '#3f8a3a');
      g.font = '11px "PingFang SC", sans-serif'; g.fillStyle = '#7a705e'; g.textAlign = 'left'; g.fillText('24 小时前', L, hh - 8); g.textAlign = 'right'; g.fillText('现在', R, hh - 8); g.fillStyle = '#6b7a8c'; g.fillText('灰线：天上有云', R, 137); g.fillStyle = '#7a705e'; g.fillText('灰底：夜里', R, 13);
    };
    const drawLog = () => {
      if (!W) return;
      const rows = [], r = (b, t) => rows.push(h('div', { class: 'tl-row' }, h('b', {}, b), h('span', {}, t))), F = S.rec.full;
      if (F) { r('一整天：', `月球表面 ${F.mMin.toFixed(0)}～${F.mMax.toFixed(0)} ℃，温差约 ${(F.mMax - F.mMin).toFixed(0)} ℃；地球表面 ${F.gMin.toFixed(0)}～${F.gMax.toFixed(0)} ℃，温差约 ${(F.gMax - F.gMin).toFixed(0)} ℃`); r('地球比月球多了：', '大气对太阳辐射的反射、吸收；大气吸收地面辐射；大气逆辐射（还有大气向上射向宇宙空间的辐射）'); }
      const N = S.rec.nights, D = S.rec.days;
      const pair = (rec) => { const x = rec.cloud ?? rec.clear; if (!x) return null; return rec.cloud ? { cloud: rec.cloud.v, clear: rec.cloud.twin } : { cloud: rec.clear.twin, clear: rec.clear.v }; };          // 记下的是同一段时间、同一起点的一对：真走的那种天空，和孪生地面走的另一种
      const np = pair(N), dp = pair(D);
      if (np) r('同一个夜晚：', `有浓密的低云，地球表面最低约 ${np.cloud.toFixed(0)} ℃；晴夜约 ${np.clear.toFixed(0)} ℃${np.cloud - np.clear > 0.5 ? '：有云时大气逆辐射更强，保温作用更强' : ''}`);
      if (dp) r('同一个白天：', `有浓密的低云，地球表面最高约 ${dp.cloud.toFixed(0)} ℃；晴天约 ${dp.clear.toFixed(0)} ℃${dp.clear - dp.cloud > 0.5 ? '：云反射了更多太阳辐射' : ''}`);
      if (S.guess != null && F) rows.push(h('div', { class: 'tl-row' }, h('small', {}, `你猜：${ASK[1][S.guess]}　实际：大得多`)));
      W.log.replaceChildren(...rows);
      W.read.innerHTML = `现在 <b>${hm(S.t)}</b>，${((S.t % 24) + 24) % 24 >= 6 && ((S.t % 24) + 24) % 24 < 18 ? '白天' : '夜里'}；地球的天空：<b>${SKY[S.sky].name}</b><br><small>箭头越密，辐射越强；数值是示意</small>`;
      if (F && (np || dp) && [N, D].some((x) => x.cloud)) W.ui.unlock();
    };

    // ---- 指针：拖太阳 ----
    const plane = new THREE.Plane(), hit = new THREE.Vector3(), wq = new THREE.Vector3();
    const onBack = (ray) => { block.updateMatrixWorld(); block.localToWorld(wq.copy(SC)); plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1).applyQuaternion(block.getWorldQuaternion(new THREE.Quaternion())), wq); if (!ray.intersectPlane(plane, hit)) return null; return block.worldToLocal(hit.clone()); };
    const pointer = {
      down(rc) { if (!rc.intersectObject(sunPick, false).length) return false; S.drag = true; S.play = false; if (W) W.play.textContent = '让一天走'; document.getElementById('c').style.cursor = 'grabbing'; return true; },
      move(rc) {
        const c = document.getElementById('c');
        if (!S.drag) { if (c) c.style.cursor = rc.intersectObject(sunPick, false).length ? 'grab' : ''; return false; }
        const p = onBack(rc.ray); if (!p) return true;
        let a = Math.atan2((p.y - SC.y) / 0.045 * SR, p.x - SC.x); if (a < -Math.PI / 2) a += 2 * Math.PI; a = Math.max(-0.35, Math.min(Math.PI + 0.35, a));          // 太阳只往前走：往左拖是往后（时间往后），往右拖回去不倒流
        const cur = ((S.t % 24) + 24) % 24, want = 6 + (a / Math.PI) * 12; let d = want - cur; if (d < -12) d += 24; if (d > 0 && d < 12) { advance(d); S.moved = true; W?.time.set(((S.t % 24) + 24) % 24); layout(); }
        return true;
      },
      up() { if (!S.drag) return false; S.drag = false; document.getElementById('c').style.cursor = ''; drawLog(); return true; },
    };
    layout();

    return {
      group,
      card: false,
      emerge: 'flat',          // 课本的图平放在书页上，模型从它上面长出来、它慢慢淡掉
      size: { w: 0.36, d: 0.12, h: 0.16 },
      view: { elev: 25, azim: 12, lookY: 0.5, frameMargin: 1.12 },
      pointer,
      debug: { state: () => structuredClone(S), run: (hours, sky) => { if (sky) S.sky = sky; for (let i = 0; i < hours * 4; i++) advance(0.25); layout(); drawLog(); } },
      mount(ui) {
        const time = slider('时刻（只能往后拨，就像时间只往前走）', { min: 0, max: 23.9, step: 0.1, value: S.t, fmt: (v) => hm(v), onInput: (v) => { let d = v - (((S.t % 24) + 24) % 24); if (d < 0) d += 24; advance(d); S.moved = true; S.play = false; play.textContent = '让一天走'; layout(); drawLog(); } });
        const skySeg = seg('地球的天空', ['晴天', '有云（浓密的低云）'], (_, i) => { S.sky = i ? 'cloud' : 'clear'; layout(); drawLog(); }, { value: 0 });
        const guess = seg(...ASK, (_, i) => { S.guess = i; drawLog(); }, { value: -1 });
        const acts = buttons([
          { text: '让一天走', onClick: () => { S.play = !S.play; acts.btns[0].textContent = S.play ? '停一下' : '让一天走'; } },
          { text: '重来', ghost: true, onClick: () => { ui.relock?.(); reset(); for (const p of packs) { p.on = false; p.m.visible = false; } time.set(10); skySeg.set(0); guess.set(-1); acts.btns[0].textContent = '让一天走'; layout(); drawLog(); ui.status(START); } },
        ]);
        const play = acts.btns[0];
        const chart = h('canvas', { class: 'wx-map', width: 320, height: 250 }), read = h('div', { class: 'read-out' }), log = h('div', { class: 'timeline' });
        ui.controls.append(h('div', { class: 'bar-title' }, '两支温度计的读数'), chart, read, acts.el, time.el, skySeg.el, guess.el, note('黄箭头是太阳辐射（短波），橙箭头是地面辐射（长波），红箭头是大气辐射（长波）。黄色箭头从表面折返向上表示短波反射；橙色箭头向上变小、停住表示被大气吸收。'));
        ui.data.append(h('div', { class: 'bar-title' }, '你看到了什么'), log);
        W = { ui, chart, read, log, time, play };
        ui.status(START);
        layout(); drawLog();
      },
      update(dt) {
        labels.forEach((l) => l.tick(dt));
        if (S.play) { advance(Math.min(0.1, dt) * 2); S.moved = true; W?.time.set(((S.t % 24) + 24) % 24); layout(); if (Math.floor(S.t * 2) !== S.lastLog) { S.lastLog = Math.floor(S.t * 2); drawLog(); } }          // 1 秒走 2 小时
        stepPacks(Math.min(dt, 0.05), fluxes(S.st, S.t, S.sky));
      },
    };
  },
};
const START = '左边是月球表面，右边是地球表面，同一个太阳照着两边。按<b>让一天走</b>（或按住太阳往左拖），看两支温度计一天里怎么变。';
