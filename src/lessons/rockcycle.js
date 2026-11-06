// 高中地理 选择性必修1 第二章第一节 塑造地表形态的力量 · 岩石圈的物质循环（课本第 22–24 页，图 2.7、2.8、2.9、图 2.10 岩石圈物质循环示意、思考）。
//
// 一个问题（课本思考）：有人说岩浆岩“浴火而生”、沉积岩由沉积物压实固结、变质岩“由老变新”；也有人说一类岩石是由另一类岩石转化来的。怎么理解？
// 课本的图就是模型：图 2.10 那几块地块合成一块切开的地壳——左边地下有岩浆房、上面一座火山；右边一条河流进海，海底一层层沉积物；
// 深处靠近岩浆的地方高温高压。一块做了记号的岩石（一块小石头）就在这块地壳里。
// 学生亲手做的：
//   每一步自己挑“接下来它经历什么作用”——只能挑课本图 2.10 里有的箭头：冷却凝固、抬升风化侵蚀搬运沉积、压实固结、变质作用、熔化。
//   石头就真的在地壳里走过去：从岩浆房升上来凝固成花岗岩、被抬到山顶风化成沙、顺着河流进海、埋下去压成砂岩、被压到深处变成石英岩、再熔化回岩浆……
//   侧栏是图 2.10 的循环图：走过的箭头亮起来，并记下这块石头的“履历”。走一圈，就会发现每一类岩石都可以变成另外两类。
// 数据：kit/rock.js（tools/geo/rock_check.mjs 核对课本说法）。教学示意：竖直方向压缩了；各个过程的时间尺度差别很大，动画不按真实时间比例。
import * as THREE from 'three';
import { buttons, note } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { h } from '../ui/Panel.js';
import { airLabel, faceLabel, noteBadge } from './kit/labels.js';
import { KIND, ROCK, nexts } from './kit/rock.js';

const XL = -0.19, XR = 0.19, ZD = 0.06, TOP = 0.085, SEA_X = 0.07, SEA_Y = 0.072;          // 地块；地面高度；海岸线在哪、海面多高
const ASK = '先猜一下（可以不猜）：一块花岗岩，最后有没有可能变成砂岩？';
const rnd = (() => { let s = 61; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// 地块里的几个地方（模型坐标，都在靠前的剖面上，看得见）
const AT = { chamber: [-0.1, 0.012], intrusion: [-0.045, 0.045], lava: [-0.105, 0.112], peak: [-0.02, TOP + 0.022], shore: [SEA_X + 0.004, SEA_Y - 0.004], shallow: [SEA_X + 0.04, SEA_Y - 0.008], deep: [SEA_X + 0.085, SEA_Y - 0.012], buried: [SEA_X + 0.05, 0.048], meta: [0.03, 0.022] };
const LOOK = { magma: { c: 0xff6a1f, e: 0xd84010 }, granite: { c: 0xd8b8a8, spot: true }, basalt: { c: 0x3c3c40, pore: true }, gravel: { c: 0x9a8a76, grain: 'gravel' }, sand: { c: 0xd8c08a, grain: 'sand' }, mud: { c: 0x8a7a66, grain: 'mud' }, shell: { c: 0xeae4d6, grain: 'shell' }, conglomerate: { c: 0x9a8a76, spot: true }, sandstone: { c: 0xd6b07a }, shale: { c: 0x6f6a66, band: true }, limestone: { c: 0xd9d3c4 }, slate: { c: 0x4a5560, band: true }, marble: { c: 0xf4f2ee }, gneiss: { c: 0xbcae9e, band: true }, quartzite: { c: 0xe8dcc8 }, metacong: { c: 0xa89a88, band: true } };

export default {
  id: 'rockcycle',
  fig: '图2.10',
  title: '岩石圈的物质循环',
  flow: 'explore',
  ask: '有人说岩浆岩“浴火而生”，沉积岩是沉积物压实固结来的，变质岩“由老变新”；也有人说一类岩石是由另一类岩石转化来的。这两种说法怎么理解？',
  need: '跟着一块岩石走，每一步自己挑它接下来经历什么，直到它回到岩浆；三类岩石都当过一次',
  conclusion: {
    page: 28,
    quote: '岩石按照成因可以分为岩浆岩、沉积岩和变质岩三大类，它们之间可以相互转换，使得岩石圈的物质处于循环转化中。……在地球内部巨大压力作用下，岩浆沿着岩石圈的薄弱地带侵入岩石圈上部或喷出地表，随着温度、压力的变化，冷却凝固形成岩浆岩。……裸露在地表的岩石，经风化、侵蚀作用，逐渐成为砾石、沙子、泥土等碎屑物质。这些碎屑物质被风、流水等搬运后沉积下来，经压实、固结形成沉积岩。……地壳中已生成的岩石，在地球内部的高温、高压等条件下，成分、性质发生改变，形成变质岩。……这三类岩石在岩石圈深处或岩石圈以下高温高压的条件下熔化，又成为新的岩浆回到地球内部。',
    why: '两种说法说的是同一件事的两面：第一种说的是每一类岩石是“怎么形成的”（成因）——岩浆冷却凝固、沉积物压实固结、已有的岩石受高温高压变质；第二种说的是“原料从哪来”——碎屑沉积物主要来自已有岩石的风化、侵蚀，有的沉积岩来自化学沉淀物或生物遗体（它们的物质也多来自岩石风化时溶进水里的成分），变质岩来自已有的岩石，岩浆来自岩石的熔化。所以三类岩石可以相互转化，岩石圈的物质一直在循环；地表形态的塑造过程，也就是这个循环的一部分。',
    src: '课本第 22–24 页 · 第二章 第一节 塑造地表形态的力量',
  },

  create({ tag }) {
    const group = new THREE.Group(), block = new THREE.Group(); group.add(block);
    const S = { id: 'magma', path: [{ id: 'magma' }], anim: null, kinds: new Set(['magma']), arrows: new Set(), guess: null, moved: false };
    let W = null;

    // ---- 地面：左边一座火山，中间一道山，右边海；剖面上画着岩层、岩浆房、侵入岩体和深处的高温带 ----
    const ground = (x) => { const volc = 0.03 * Math.exp(-(((x + 0.105) / 0.03) ** 2)), ridge = 0.02 * Math.exp(-(((x + 0.02) / 0.035) ** 2)); return x < SEA_X ? TOP + volc + ridge - 0.012 * sm(SEA_X - 0.05, SEA_X, x) : SEA_Y - 0.02 - 0.008 * sm(SEA_X, XR, x); };          // 海底比海面低一截，往外更深
    const faceCv = document.createElement('canvas'); faceCv.width = 1024; faceCv.height = 384;
    const faceTex = new THREE.CanvasTexture(faceCv); faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 8;
    const PX = (x) => ((x - XL) / (XR - XL)) * faceCv.width, PY = (y) => faceCv.height - (y / 0.14) * faceCv.height;
    const paintFace = () => {
      const g = faceCv.getContext('2d'), w = faceCv.width, hh = faceCv.height;
      g.clearRect(0, 0, w, hh);
      const LAY = ['#c9a77a', '#b8946a', '#a98a6a', '#9a8070', '#8c7666'];
      for (let i = 0; i <= w; i += 2) { const x = XL + (i / w) * (XR - XL), top = PY(ground(x)); for (let k = 0; k < 5; k++) { const y0 = top + k * 26 + 6 * Math.sin(i / 70 + k); g.fillStyle = LAY[k]; g.fillRect(i, y0, 2, hh); } }          // 一层层岩层，顶上跟着地面
      const deep = g.createLinearGradient(0, hh, 0, hh * 0.55); deep.addColorStop(0, 'rgba(190,70,40,0.55)'); deep.addColorStop(1, 'rgba(190,70,40,0)'); g.fillStyle = deep; g.fillRect(0, 0, w, hh);          // 越往深处越热
      g.fillStyle = '#d8562a'; g.beginPath(); g.ellipse(PX(AT.chamber[0]), PY(AT.chamber[1]), 70, 34, 0, 0, 7); g.fill();          // 岩浆房
      g.strokeStyle = '#d8562a'; g.lineWidth = 8; g.beginPath(); g.moveTo(PX(-0.1), PY(0.02)); g.bezierCurveTo(PX(-0.104), PY(0.06), PX(-0.106), PY(0.09), PX(-0.105), PY(0.112)); g.stroke();          // 通到火山口的通道
      g.fillStyle = '#9c9a98'; g.beginPath(); g.ellipse(PX(AT.intrusion[0]), PY(AT.intrusion[1]), 44, 22, 0.2, 0, 7); g.fill(); g.strokeStyle = 'rgba(60,50,40,0.4)'; g.lineWidth = 2; g.stroke();          // 侵入岩体
      const mz = g.createRadialGradient(PX(AT.meta[0]), PY(AT.meta[1]), 6, PX(AT.meta[0]), PY(AT.meta[1]), 80); mz.addColorStop(0, 'rgba(120,70,120,0.45)'); mz.addColorStop(1, 'rgba(120,70,120,0)'); g.fillStyle = mz; g.fillRect(0, 0, w, hh);          // 变质带：深处、靠近岩浆
      for (let i = 0; i < 2200; i++) { g.fillStyle = `rgba(60,45,30,${Math.random() * 0.12})`; g.fillRect(Math.random() * w, Math.random() * hh, 2, 2); }
      for (let i = 0; i <= w; i += 1) { const x = XL + (i / w) * (XR - XL), top = PY(ground(x)); g.clearRect(i, 0, 1, top); }          // 地面以上透明
      faceTex.needsUpdate = true;
    };
    const faceGeo = () => { const P = [], U = [], I = [], N = 200; for (let i = 0; i <= N; i++) { const x = XL + ((XR - XL) * i) / N, y = ground(x); P.push(x, y, ZD, x, 0, ZD); U.push(i / N, y / 0.14, i / N, 0); if (i) { const a = 2 * i - 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals(); return g; };
    const front = new THREE.Mesh(faceGeo(), new THREE.MeshLambertMaterial({ map: faceTex, transparent: true, side: THREE.DoubleSide })); block.add(front);
    const sideM = new THREE.MeshLambertMaterial({ color: 0x9a8070 });
    const back = new THREE.Mesh(faceGeo(), sideM); back.position.z = -2 * ZD; block.add(back);
    for (const x of [XL, XR]) { const hgt = ground(x), e = new THREE.Mesh(new THREE.PlaneGeometry(2 * ZD, hgt), sideM); e.position.set(x, hgt / 2, 0); e.rotation.y = Math.PI / 2; block.add(e); }
    const topGeo = new THREE.PlaneGeometry(XR - XL, 2 * ZD, 160, 20); topGeo.rotateX(-Math.PI / 2);
    const tCol = new Float32Array(topGeo.attributes.position.count * 3); topGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
    { const p = topGeo.attributes.position, c = new THREE.Color(); for (let k = 0; k < p.count; k++) { const x = p.getX(k), z = p.getZ(k), y = ground(x) + 0.002 * Math.sin(x * 120 + z * 80); p.setY(k, y); c.set(x > SEA_X - 0.004 ? 0xd8c69a : Math.abs(x + 0.105) < 0.02 && y > TOP + 0.015 ? 0x6a5a50 : y > TOP + 0.012 ? 0x8f8a6a : 0x8fae64); tCol.set([c.r, c.g, c.b], k * 3); } topGeo.computeVertexNormals(); }
    const grain = canvasTex(256, 256, (g, w) => { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, w); for (let i = 0; i < 2400; i++) { const v = 150 + Math.random() * 100; g.fillStyle = `rgba(${v},${v},${v},${0.2 + Math.random() * 0.35})`; g.fillRect(Math.random() * w, Math.random() * w, 1.6, 1.6); } }, { repeat: [6, 2] });
    block.add(new THREE.Mesh(topGeo, new THREE.MeshLambertMaterial({ vertexColors: true, map: grain })));
    const sea = new THREE.Mesh(new THREE.BoxGeometry(XR - SEA_X, SEA_Y - ground(XR), 2 * ZD - 0.0008), new THREE.MeshLambertMaterial({ color: 0x5f9fcc, transparent: true, opacity: 0.55, depthWrite: false })); sea.position.set((SEA_X + XR) / 2, (SEA_Y + ground(XR)) / 2, 0); sea.renderOrder = 4; block.add(sea);
    // 河：从山上流进海
    const riverPts = []; for (let i = 0; i <= 30; i++) { const x = -0.01 + (SEA_X + 0.004) * (i / 30); riverPts.push(new THREE.Vector3(x, ground(x) + 0.001, -0.01 + 0.012 * Math.sin(i * 0.35))); }
    const river = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(riverPts), 40, 0.0018, 6, false), new THREE.MeshBasicMaterial({ color: 0x5a9fd0 })); river.material.userData.see = true; river.raycast = () => {}; block.add(river);
    // 火山口的烟
    const smokeTex = canvasTex(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const smoke = Array.from({ length: 8 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: 0x9a9690, transparent: true, depthWrite: false, opacity: 0.5 })); s.userData.t = i / 8; s.raycast = () => {}; block.add(s); return s; });
    for (const k of ['shore', 'shallow', 'deep']) AT[k][1] = ground(AT[k][0]) + 0.002;          // 沉积物落在海底上
    AT.buried[1] = ground(AT.buried[0]) - 0.022;
    paintFace();
    // 剖面上的字：地方的名字
    const F = (t, x, y, c = '#ffffff') => faceLabel(block, t, { x, y, z: ZD, h: 0.0075, color: c, stroke: 'rgba(40,30,20,0.6)' });
    F('岩浆', AT.chamber[0], AT.chamber[1] - 0.012); F('侵入岩体', AT.intrusion[0] + 0.03, AT.intrusion[1] + 0.006); F('深处：高温、高压', AT.meta[0] + 0.02, AT.meta[1] - 0.012); F('一层层沉积岩', AT.buried[0] + 0.03, AT.buried[1] - 0.004);
    noteBadge(tag, '教学示意：竖直方向压缩了；各个过程的时间尺度差别很大（熔岩冷却结壳可能只要几天，抬升、风化、搬运、变质往往要很长的地质年代），动画不按真实时间比例').loc(block, XL + 0.012, -0.002, ZD + 0.012);

    // ---- 那块做了记号的石头：样子跟着它是什么岩石变；岩浆时会发光 ----
    const rockCv = document.createElement('canvas'); rockCv.width = 128; rockCv.height = 128;
    const rockTex = new THREE.CanvasTexture(rockCv); rockTex.colorSpace = THREE.SRGBColorSpace;
    const rockMat = new THREE.MeshStandardMaterial({ map: rockTex, roughness: 0.85, metalness: 0, emissive: 0x000000 });
    const stone = new THREE.Mesh(new THREE.IcosahedronGeometry(0.0085, 2), rockMat); block.add(stone);
    { const p = stone.geometry.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); v.multiplyScalar(1 + 0.18 * Math.sin(v.x * 900) * Math.sin(v.y * 700 + 1) * Math.sin(v.z * 800 + 2)); p.setXYZ(i, v.x, v.y, v.z); } stone.geometry.computeVertexNormals(); }          // 不规则的一块
    const pile = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0013, 6, 4), new THREE.MeshLambertMaterial({ color: 0xffffff }), 60); pile.raycast = () => {}; pile.scale.setScalar(1.5); block.add(pile);          // 变成沉积物时：一堆颗粒
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.009, 0.0105, 40), new THREE.MeshBasicMaterial({ color: 0xc8402c, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthTest: false })); ring.renderOrder = 15; block.add(ring);          // 记号：一圈红线圈着它
    const look = (id) => {
      const L = LOOK[id], g = rockCv.getContext('2d'), c = '#' + L.c.toString(16).padStart(6, '0');
      g.fillStyle = c; g.fillRect(0, 0, 128, 128);
      if (L.spot) for (let i = 0; i < 260; i++) { g.fillStyle = ['#2a2a2a', '#f2ece4', '#c98a7a'][i % 3]; g.fillRect(Math.random() * 128, Math.random() * 128, 3 + Math.random() * 3, 3 + Math.random() * 3); }
      if (L.pore) for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.beginPath(); g.arc(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 3, 0, 7); g.fill(); }
      if (L.band) for (let y = 0; y < 128; y += 9) { g.fillStyle = `rgba(${id === 'gneiss' ? '40,30,30' : '20,20,30'},${0.25 + Math.random() * 0.2})`; g.fillRect(0, y + Math.sin(y) * 2, 128, 3 + Math.random() * 3); }
      if (!L.spot && !L.pore && !L.band) for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
      rockTex.needsUpdate = true;
      rockMat.emissive.setHex(L.e ?? 0); rockMat.emissiveIntensity = L.e ? 0.9 : 0; rockMat.roughness = id === 'marble' ? 0.35 : 0.85;
      const isSed = ROCK[id].kind === 'sediment'; stone.visible = !isSed; pile.visible = isSed;
      if (isSed) { const m4 = new THREE.Matrix4(), col = new THREE.Color(), size = { gravel: 2.2, sand: 1, mud: 0.6, shell: 1.1 }[L.grain]; for (let i = 0; i < 60; i++) { const a = rnd() * 6.28, r = rnd() * 0.008, s = size * (0.7 + rnd() * 0.6); m4.compose(new THREE.Vector3(Math.cos(a) * r, rnd() * 0.002 * (1 - r / 0.008) + 0.0005, Math.sin(a) * r * 0.6), new THREE.Quaternion(), new THREE.Vector3(s, s * (L.grain === 'shell' ? 0.5 : 0.8), s)); pile.setMatrixAt(i, m4); col.setHex(L.c).multiplyScalar(0.8 + rnd() * 0.4); pile.setColorAt(i, col); } pile.instanceMatrix.needsUpdate = true; pile.instanceColor.needsUpdate = true; }
    };
    const placeAt = (key) => { const [x, y] = AT[key]; return new THREE.Vector3(x, y, ZD - 0.005); };          // 都在剖面前面一点点，看得见
    const aName = airLabel(block, '', { h: 0.0085, color: '#2c3245' }), aProc = airLabel(block, '', { h: 0.0078, color: '#a8341f', dim: 0 });
    const shortName = (r) => r.name.replace(/^(侵入岩|喷出岩)（以(.+)为例）$/, '$2（$1）').replace(/（具体是哪种.*）$/, '');
    const labels = [aName, aProc];
    // 这一步石头怎么走：一串路点（凝固就地；上抬到山顶；顺着河进海；往下埋；往深处；往岩浆房）
    const route = (from, to, proc) => {
      const a = placeAt(ROCK[from].at), b = placeAt(ROCK[to].at), pts = [a];
      if (proc.startsWith('抬升')) { pts.push(new THREE.Vector3(a.x, Math.max(a.y, 0.06), a.z), placeAt('peak'), new THREE.Vector3(0.03, ground(0.03) + 0.004, ZD - 0.005), placeAt('shore')); }          // 先被抬升到地表的山上，风化以后顺着河流进海
      else if (proc === '熔化') pts.push(new THREE.Vector3(a.x, 0.02, a.z));
      else if (proc.startsWith('变质')) pts.push(new THREE.Vector3((a.x + b.x) / 2, Math.min(a.y, b.y) - 0.004, a.z));
      else if (proc.startsWith('压实')) pts.push(new THREE.Vector3(a.x, a.y - 0.008, a.z));
      else if (proc.includes('喷出')) pts.push(new THREE.Vector3(-0.1, 0.06, a.z), new THREE.Vector3(-0.105, 0.115, a.z));
      pts.push(b); return new THREE.CatmullRomCurve3(pts);
    };
    const stepTo = (n) => {
      if (S.anim) return; const from = S.id;
      const sw = n.proc.startsWith('抬升') ? 0.4 : n.proc.startsWith('变质') ? 0.5 : 0.92;          // 什么时候换样子：风化在被抬到地表以后，变质在深处半路上，冷却凝固、压实固结、熔化都在到了地方以后
      S.anim = { t: 0, curve: route(from, n.to, n.proc), from, to: n.to, proc: n.proc, why: n.why, mid: false, sw };
      aProc.setText(n.proc.replace(/（.*）/, '')).setOn(true); S.moved = true;
    };
    const arrowKey = (a, b) => `${ROCK[a].kind}>${ROCK[b].kind}`;
    const finish = () => {
      const a = S.anim; S.anim = null; S.id = a.to; S.kinds.add(ROCK[a.to].kind); S.arrows.add(arrowKey(a.from, a.to)); S.path.push({ id: a.to, proc: a.proc });
      aProc.setOn(false); look(S.id); layout();
      const r = ROCK[S.id]; W?.ui.status(`经过<b>${a.proc.replace(/（.*）/, '')}</b>：${a.why}。现在它是<b>${r.name}</b>（${KIND[r.kind]}）${r.sub ? `，${r.sub}` : ''}。${S.id === 'magma' && S.path.length > 2 ? '它又回到了岩浆——绕了一圈。' : '接下来呢？'}`);
      drawLog(); drawChart(); renderChoices();
    };
    const layout = () => {
      const p = placeAt(ROCK[S.id].at); stone.position.copy(p); pile.position.copy(p); ring.position.set(p.x, p.y, p.z + 0.004);
      const r = ROCK[S.id]; aName.position.set(p.x, p.y + 0.018, p.z); aName.setText(`${shortName(r)} · ${KIND[r.kind]}`);
    };

    // ---- 侧栏：图 2.10 的循环图（走过的箭头亮起来） ----
    const NODES = { magma: [160, 34, '岩浆'], igneous: [270, 110, '岩浆岩'], sediment: [215, 200, '沉积物'], sedimentary: [105, 200, '沉积岩'], metamorphic: [50, 110, '变质岩'] };
    const EDGES = [['magma', 'igneous', '冷却凝固'], ['igneous', 'sediment', '抬升风化侵蚀搬运沉积'], ['sedimentary', 'sediment', '抬升风化…'], ['metamorphic', 'sediment', '抬升风化…'], ['sediment', 'sedimentary', '压实固结'], ['igneous', 'metamorphic', '变质作用'], ['sedimentary', 'metamorphic', '变质作用'], ['metamorphic', 'metamorphic', '变质作用'], ['igneous', 'magma', '熔化'], ['sedimentary', 'magma', '熔化'], ['metamorphic', 'magma', '熔化']];
    const drawChart = () => {
      if (!W) return;
      const c = W.chart, g = c.getContext('2d'), w = c.width, hh = c.height, cur = ROCK[S.id].kind;
      g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, hh); g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const [a, b, t] of EDGES) {
        const lit = S.arrows.has(`${a}>${b}`), [x0, y0] = NODES[a], [x1, y1] = NODES[b];
        g.strokeStyle = lit ? '#c8402c' : 'rgba(120,110,90,0.35)'; g.fillStyle = g.strokeStyle; g.lineWidth = lit ? 2.6 : 1.4;
        if (a === b) { g.beginPath(); g.arc(x0, y0 - 24, 11, 0.9, Math.PI * 2 + 0.2); g.stroke(); const ax = x0 + Math.cos(0.9) * 11, ay = y0 - 24 + Math.sin(0.9) * 11; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + 6, ay - 4); g.lineTo(ax + 1, ay - 7); g.fill(); if (lit) { g.font = '10px "PingFang SC", sans-serif'; g.fillStyle = '#a8341f'; g.fillText(t, x0, y0 - 42); } continue; }          // 变质岩再次变质：自己指向自己
        const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, off = (EDGES.some(([p, q]) => p === b && q === a) ? 6 : 0), nx = -uy * off, ny = ux * off, sx = x0 + ux * 26 + nx, sy = y0 + uy * 14 + ny, ex = x1 - ux * 28 + nx, ey = y1 - uy * 16 + ny;
        g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke(); g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex - ux * 8 - uy * 4, ey - uy * 8 + ux * 4); g.lineTo(ex - ux * 8 + uy * 4, ey - uy * 8 - ux * 4); g.fill();
        if (t && lit) { g.font = '10px "PingFang SC", sans-serif'; g.fillStyle = '#a8341f'; g.fillText(t, (sx + ex) / 2 + nx * 2.2, (sy + ey) / 2 + ny * 2.2 - 6); }
      }
      for (const [k, [x, y, t]] of Object.entries(NODES)) { const been = S.kinds.has(k), now = cur === k; g.fillStyle = now ? '#c8402c' : been ? '#f3dfd4' : '#ffffff'; g.strokeStyle = now ? '#c8402c' : '#8a7a5e'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(x - 30, y - 14, 60, 28, 8); g.fill(); g.stroke(); g.font = '600 13px "PingFang SC", sans-serif'; g.fillStyle = now ? '#ffffff' : '#3a3226'; g.fillText(t, x, y); }
    };
    const drawLog = () => {
      if (!W) return;
      const rows = [], r = (b, t) => rows.push(h('div', { class: 'tl-row' }, h('b', {}, b), h('span', {}, t)));
      r('它的履历：', S.path.map((p, i) => (i ? `→（${p.proc.replace(/（.*）/, '')}）${ROCK[p.id].name}` : ROCK[p.id].name)).join(' '));
      const rockKinds = ['igneous', 'sedimentary', 'metamorphic'].filter((k) => S.kinds.has(k));
      if (rockKinds.length === 3) r('三类岩石都当过了：', '岩浆岩、沉积岩、变质岩都是由别的东西转化来的：沉积物来自已有岩石的风化侵蚀，变质岩来自已有的岩石，岩浆来自岩石的熔化');
      if (S.path.length > 2 && S.id === 'magma') r('回到岩浆：', '每一类岩石最后都能熔化，又成为新的岩浆：岩石圈的物质一直在循环');
      const ids = S.path.map((p) => p.id), gi = ids.indexOf('granite'), proven = gi >= 0 && ids.indexOf('sandstone', gi) > gi;          // 这块石头真的从花岗岩走到过砂岩，才给出“实际”
      if (S.guess != null) rows.push(h('div', { class: 'tl-row' }, h('small', {}, proven ? `你猜：${S.guess ? '有可能' : '不可能'}　你刚才亲手走过了：花岗岩被抬升到地表，风化、侵蚀成沙子，被搬运、沉积，再压实固结，就是砂岩` : `你猜：${S.guess ? '有可能' : '不可能'}　自己走一遍试试：让它先变成花岗岩，再看能不能变成砂岩`)));
      W.log.replaceChildren(...rows);
      if (rockKinds.length === 3 && S.path.length > 3 && S.id === 'magma') W.ui.unlock();
    };
    const renderChoices = () => {
      if (!W) return;
      const list = nexts(S.id), r = ROCK[S.id];
      W.now.innerHTML = `现在它是 <b>${r.name}</b>（${KIND[r.kind]}）${r.sub ? `<br><small>${r.sub}</small>` : ''}`;
      W.choices.replaceChildren(...list.map((n) => { return h('button', { class: 'go ghost choice', onclick: () => stepTo(n) }, n.proc); }));
    };

    look(S.id); layout();

    return {
      group,
      card: false,
      emerge: 'flat',          // 课本的图平放在书页上，模型从它上面长出来、它慢慢淡掉
      size: { w: 0.4, d: 0.12, h: 0.14 },
      view: { elev: 10, azim: 6, lookY: 0.45, frameMargin: 1.1 },
      pointer: { down: () => false, move: () => false, up: () => false },
      debug: { go: (i) => { const n = nexts(S.id)[i]; stepTo(n); if (S.anim) S.anim.t = 0.999; } },
      mount(ui) {
        const choices = h('div', { class: 'btn-col' }), now = h('div', { class: 'read-out' });
        const guess = buttons([{ text: '猜：有可能', ghost: true, onClick: () => { S.guess = 1; drawLog(); } }, { text: '猜：不可能', ghost: true, onClick: () => { S.guess = 0; drawLog(); } }]);
        const acts = buttons([{ text: '重来', ghost: true, onClick: () => { ui.relock?.(); Object.assign(S, { id: 'magma', path: [{ id: 'magma' }], anim: null, guess: null, moved: false }); S.kinds = new Set(['magma']); S.arrows = new Set(); look(S.id); layout(); drawChart(); drawLog(); renderChoices(); ui.status(START); } }]);
        const chart = h('canvas', { class: 'wx-map', width: 320, height: 230 }), log = h('div', { class: 'timeline' });
        ui.controls.append(h('div', { class: 'bar-title' }, '图 2.10：走过的箭头会亮起来'), chart, now, h('div', { class: 'bar-title' }, '接下来，它经历什么作用？'), choices, h('p', { class: 'note' }, ASK), guess.el, acts.el, note('只能挑课本图 2.10 里有的箭头。地块上那块被红圈圈着的就是这块岩石，它会真的在地壳里走过去。'));
        ui.data.append(h('div', { class: 'bar-title' }, '你看到了什么'), log);
        W = { ui, chart, log, choices, now };
        ui.status(START);
        drawChart(); drawLog(); renderChoices();
      },
      update(dt, t) {
        labels.forEach((l) => l.tick(dt));
        smoke.forEach((s) => { s.userData.t = (s.userData.t + dt * 0.12) % 1; const u = s.userData.t; s.position.set(-0.105 + u * 0.03, 0.118 + u * 0.05, -0.01); s.scale.setScalar(0.01 + u * 0.03); s.material.opacity = 0.5 * (1 - u); });
        if (S.id === 'magma' && !S.anim) rockMat.emissiveIntensity = 0.7 + 0.25 * Math.sin((t || 0) * 3);
        if (S.anim) {
          const a = S.anim; a.t = Math.min(1, a.t + dt / 3); const p = a.curve.getPointAt(a.t);
          stone.position.copy(p); pile.position.copy(p); ring.position.set(p.x, p.y, p.z + 0.004); aProc.position.set(p.x, p.y + 0.02, p.z); aName.setOn(false);
          if (!a.mid && a.t > a.sw) { a.mid = true; look(a.to); }          // 作用发生的地方才换样子
          if (a.t >= 1) { aName.setOn(true); finish(); }
        }
      },
    };
  },
};
const START = '一块被红圈圈着的岩石，现在还是地下的<b>岩浆</b>。在侧栏挑它接下来经历什么作用，看它在地壳里走到哪、变成什么。';
