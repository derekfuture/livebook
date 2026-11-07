// 高中地理 必修第一册 第三章第三节 海水的运动 · 潮汐（课本第 59–60 页，图 3.22 紫菜养殖、活动“讨论海水运动对人类活动的影响”）。
//
// 一个问题：赶海、游泳、观潮、船进出港，各该挑什么时候？为什么初一、十五前后潮水涨得最高、落得最低？
// 课本的图就是模型：一段海岸——岸上的小港口、停着一条船，潮间带上一排排养紫菜的竹竿网帘；旁边一个小小的“太阳—地球—月亮”盘。
// 学生亲手做的：
//   1. 拨时间（一天）：海水一天里涨两次、落两次；落潮时潮间带露出来，紫菜网帘露出水面晒太阳；涨潮时又被淹没。
//   2. 拖月亮绕地球走（换农历的日子）：新月、满月时月亮和太阳的引潮作用叠在一起，潮差最大；上弦、下弦时互相抵消，潮差小。
//   3. 选一件事（赶海、船进港、观潮），在侧栏的潮位曲线上点一个时刻，看这时候做这件事行不行。
// 教学示意：潮位的数值、引潮力的样子都是示意；时间是地方时。
import * as THREE from 'three';
import { seg, slider, buttons, note } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { airLabel, noteBadge } from './kit/labels.js';
import { h } from '../ui/Panel.js';
import reliefUrl from './data/earth_relief.jpg';
import { SYN, level, range, lunarName, phaseName, bulgeRadius, tideTrend, angles, MSL, KY, SHIP_DRAFT, SHIP_BED, HULL_BOTTOM, shore, shipState, intertidal, playHour, setDate, timeText, NET_WIDTH, NET_TILT, netRow, netState, nearLow } from './kit/tide.js';

const XL = -0.16, XR = 0.16, ZD = 0.06;

const ACTS = { gan: { name: '赶海', need: '低潮附近', ok: (v, D, rising, h) => nearLow(D, h), why: '本页以低潮前后半小时为练习窗口，潮间带部分出露；实际赶海须查看当地潮汐及安全条件' }, ship: { name: '大船进港', need: '水够深的时候', ok: (v) => shipState(v).afloat, why: '水深不足时可能搁浅；本页只比较水深与吃水判断浮起，实际通航还须预留富余水深' }, see: { name: '观潮', need: '大潮的涨潮', ok: (v, D, rising) => rising && v > 0 && range(D).r > 3.6, why: '要挑初一、十五前后、正在涨潮的时候（像钱塘江大潮那样壮观，还要靠喇叭口一样外宽内窄的河口）' } };
const ASK = ['先猜一下（可以不猜）：在这个情境里，一个月里潮水涨得最高的是——', ['初一、十五前后', '初八、廿三前后', '每天都一样']];

export default {
  id: 'tide',
  fig: '图3.22',
  title: '潮汐',
  flow: 'explore',
  ask: '赶海、游泳、观潮、船舶进出港，各该挑什么时候？为什么农历初一、十五前后，潮水涨得最高、落得最低？',
  need: '拨时间看一天里的两次涨落；拖月亮到新月、上弦、满月比一比潮差；选一件事，在潮位曲线上挑个合适的时刻',
  conclusion: {
    page: 63,
    quote: '潮汐是海水的一种周期性涨落现象，它的成因与月球和太阳对地球的引力有关。一天中，通常可以观察到两次海水涨落。古人将白天的海水涨落称为潮，夜晚的海水涨落称为汐，合称潮汐。农历每月的初一和十五前后，潮汐现象最为明显，潮水涨得最高，落得最低。沿海各地，每日潮涨潮落的时间准确、可查。人们在海边的许多活动，如潮间带采集和养殖、沿海港口建设和航运、潮汐发电等，都需要充分认识并利用潮汐规律。',
    why: '月球分潮使朝月和背月两侧的海水隆起，太阳分潮叠加后会改变合成隆起的大小与方向；月球也在公转，一个地方追上月球约需24小时50分，理想半日潮的月球分潮周期约12小时25分，所以一天通常两次涨落。本页是理想化半日潮模型；真实港口还受海盆、海岸和水深影响。初一（新月）、十五（满月）时，太阳、地球、月亮差不多在一条直线上，两份引潮作用叠在一起，潮水涨得最高、落得最低；上弦、下弦时两者错开，互相抵消一部分，潮差就小。',
    src: '课本第 59–60 页 · 第三章 第三节 海水的运动（教材摘录，省略图号及脚注标记）',
  },

  create({ tag, reframe }) {
    const group = new THREE.Group();
    const S = { vk: 0, vTo: 0, framed: true, D: 0, h: 6, play: false, drag: null, act: null, pick: null, seen: new Set(), did: {}, guess: null };
    let W = null;
    const block = new THREE.Group(); group.add(block);          // 海岸：平时是主角，放在中间
    const grain = canvasTex(256, 256, (g, w) => { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, w); for (let i = 0; i < 2200; i++) { const v = 150 + Math.random() * 90; g.fillStyle = `rgba(${v},${v},${v},${0.2 + Math.random() * 0.3})`; g.fillRect(Math.random() * w, Math.random() * w, 1.6, 1.6); } }); grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(4, 2);

    // ---- 海岸：左边是陆地，往右是一段缓缓的潮间带滩涂，再往右是海底 ----

    const NX = 120, NZ = 24, bump = (x, z) => (x < intertidal.hi - 0.016 ? 0.0018 * Math.sin(x * 180 + z * 70) * Math.sin(z * 150 - x * 40) * Math.min(1, (ZD - z) / 0.012) * Math.min(1, (intertidal.hi - 0.016 - x) / 0.01) : 0);          // 小起伏只在岸上的草地；潮间带和海底严格按 shore(x)，潮位、网帘、搁浅的判断都按它算
    const ground = (x, z) => shore(x) + bump(x, z);
    const geo = new THREE.PlaneGeometry(XR - XL, ZD * 2, NX, NZ); geo.rotateX(-Math.PI / 2);
    const col = new Float32Array(geo.attributes.position.count * 3); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    { const p = geo.attributes.position; for (let k = 0; k < p.count; k++) p.setY(k, ground(p.getX(k), p.getZ(k))); geo.computeVertexNormals(); }
    const tR = (() => { let q = 23; return () => ((q = (q * 16807) % 2147483647) / 2147483647); })();
    const SEAWALL = intertidal.hi - 0.004, ROAD = SEAWALL - 0.012;          // 海堤、堤后的路（示意）
    const topTex = canvasTex(2048, 768, (g, w, hh) => {          // 顶面一张画：草地、路、海堤、沙滩、潮间带泥滩（有潮沟）、海底的沙
      const X = (x) => ((x - XL) / (XR - XL)) * w;
      const zone = (x0, x1, c) => { g.fillStyle = c; g.fillRect(X(x0), 0, X(x1) - X(x0) + 1, hh); };
      zone(XL, SEAWALL, '#76a04c'); zone(SEAWALL, intertidal.hi + 0.004, '#cbb88c'); zone(intertidal.hi + 0.004, intertidal.lo + 0.01, '#857a64'); zone(intertidal.lo + 0.01, XR, '#a89670');
      for (let i = 0; i < 9000; i++) { const x = tR() * X(ROAD - 0.004), y = tR() * hh, l = 3 + tR() * 6, c = [[86, 132, 56], [118, 160, 70], [64, 104, 44], [140, 172, 84]][Math.floor(tR() * 4)]; g.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.4 + tR() * 0.4})`; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (tR() - 0.5) * 3, y - l); g.stroke(); }          // 草
      for (let i = 0; i < 26; i++) { const x = tR() * X(ROAD - 0.006), y = tR() * hh, r = 30 + tR() * 80, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${tR() < 0.5 ? '70,110,44' : '150,170,90'},0.35)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
      g.fillStyle = '#b9b4aa'; g.fillRect(X(ROAD - 0.003), 0, X(ROAD + 0.003) - X(ROAD - 0.003), hh); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.setLineDash([18, 14]); g.lineWidth = 2; g.beginPath(); g.moveTo(X(ROAD), 0); g.lineTo(X(ROAD), hh); g.stroke(); g.setLineDash([]);          // 沿海的路
      for (let y = 0; y < hh; y += 10) for (let x = X(SEAWALL - 0.003); x < X(SEAWALL + 0.003); x += 14) { const v = 150 + tR() * 50; g.fillStyle = `rgb(${v},${v - 4},${v - 12})`; g.fillRect(x + ((y / 10) % 2) * 7, y, 12, 8); }          // 海堤：一块块条石
      for (let i = 0; i < 16000; i++) { const x = X(intertidal.hi + 0.004) + tR() * (X(intertidal.lo + 0.01) - X(intertidal.hi + 0.004)), y = tR() * hh, v = tR(); g.fillStyle = v < 0.5 ? `rgba(60,54,44,${0.2 + tR() * 0.25})` : `rgba(170,160,140,${0.12 + tR() * 0.2})`; g.fillRect(x, y, 2, 2); }          // 泥滩的颗粒
      for (let k = 0; k < 7; k++) { let x = X(intertidal.hi + 0.01 + tR() * 0.02), y = tR() * hh; g.strokeStyle = 'rgba(62,58,50,0.55)'; g.lineWidth = 3 + tR() * 3; g.beginPath(); g.moveTo(x, y); for (let s2 = 0; s2 < 40; s2++) { x += 10 + tR() * 8; y += (tR() - 0.5) * 22; g.lineTo(x, y); } g.stroke(); }          // 潮沟：退潮时水顺着它流回海里
      const wet = g.createLinearGradient(X(intertidal.hi + 0.02), 0, X(intertidal.lo + 0.01), 0); wet.addColorStop(0, 'rgba(70,72,74,0)'); wet.addColorStop(1, 'rgba(70,72,74,0.35)'); g.fillStyle = wet; g.fillRect(X(intertidal.hi + 0.02), 0, X(intertidal.lo + 0.01) - X(intertidal.hi + 0.02), hh);          // 越往海里泥越湿、越暗
      for (let y = 0; y < hh; y += 6) { g.strokeStyle = `rgba(140,124,96,${0.25 + tR() * 0.2})`; g.lineWidth = 1.5; g.beginPath(); for (let x = X(intertidal.lo + 0.01); x < w; x += 10) g.lineTo(x, y + Math.sin(x / 9 + y) * 2); g.stroke(); }          // 海底的沙纹
    });
    const land = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.9 })); block.add(land);
    { const stone = canvasTex(256, 64, (g, w, hh) => { g.fillStyle = '#9a958c'; g.fillRect(0, 0, w, hh); for (let y = 0; y < hh; y += 12) for (let x = (y / 12) % 2 ? -10 : 0; x < w; x += 22) { const v = 140 + Math.random() * 55; g.fillStyle = `rgb(${v},${v - 3},${v - 10})`; g.fillRect(x + 1, y + 1, 20, 10); } });
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.0045, 2 * ZD), new THREE.MeshStandardMaterial({ map: stone, roughness: 0.95 })); wall.position.set(SEAWALL, ground(SEAWALL, 0) + 0.0012, 0); block.add(wall); }          // 海堤
    const sideCv = document.createElement('canvas'); sideCv.width = 512; sideCv.height = 128;
    sideCv.width = 1024; sideCv.height = 256;
    { const g = sideCv.getContext('2d'), SH = 256, R3 = (() => { let q = 5; return () => ((q = (q * 16807) % 2147483647) / 2147483647); })(); for (let i = 0; i < 1024; i++) { const x = XL + (XR - XL) * (i / 1023), ty = (1 - shore(x) / 0.07) * SH, landSide = x < intertidal.hi; g.fillStyle = landSide ? '#4e3b28' : '#5e574c'; g.fillRect(i, ty, 1, landSide ? 10 : 6); const gr = g.createLinearGradient(0, ty, 0, SH); gr.addColorStop(0, landSide ? '#9a7a52' : '#8f8470'); gr.addColorStop(1, '#bfa47a'); g.fillStyle = gr; g.fillRect(i, ty + (landSide ? 10 : 6), 1, SH); }          // 剖面：岸上是黑色表土和黄褐色的土，滩涂下面是淤泥和沙
      for (let k = 0; k < 9; k++) { const y0 = 80 + k * 20; g.strokeStyle = `rgba(90,70,45,${0.14 + R3() * 0.12})`; g.lineWidth = 1.5 + R3() * 2; g.beginPath(); for (let i = 0; i <= 1024; i += 16) g.lineTo(i, y0 + Math.sin(i / 70 + k) * 3 + (i / 1024) * 14); g.stroke(); }
      for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${R3() < 0.5 ? '70,55,38' : '220,200,160'},${0.1 + R3() * 0.2})`; g.fillRect(R3() * 1024, 60 + R3() * (SH - 60), 2, 2); }
      for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(150,135,110,0.6)'; g.beginPath(); g.ellipse(R3() * 1024, 120 + R3() * (SH - 120), 3 + R3() * 6, 2 + R3() * 3, 0, 0, 7); g.fill(); } g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 1024; i++) { const x = XL + (XR - XL) * (i / 1023), ty = (1 - shore(x) / 0.07) * SH; g.fillRect(i, 0, 1, ty); } }          // 剖面：土层、泥沙层，地面以上透明
    const sideTex = new THREE.CanvasTexture(sideCv); sideTex.colorSpace = THREE.SRGBColorSpace;
    const sideM = new THREE.Mesh(new THREE.PlaneGeometry(XR - XL, 0.07), new THREE.MeshBasicMaterial({ map: sideTex, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide })); sideM.position.set(0, 0.035, ZD); block.add(sideM);
    const backM = sideM.clone(); backM.position.z = -ZD; block.add(backM);          // 背面也是同样的剖面：从哪个角度看都是实心的一块
    { const P = []; for (const x of [XL, XR]) for (let k = 0; k < NZ; k++) { const z0 = -ZD + (2 * ZD * k) / NZ, z1 = z0 + (2 * ZD) / NZ, y0 = ground(x, z0), y1 = ground(x, z1); P.push(x, 0, z0, x, y0, z0, x, y1, z1, x, 0, z0, x, y1, z1, x, 0, z1); } P.push(XL, 0.0002, -ZD, XR, 0.0002, -ZD, XR, 0.0002, ZD, XL, 0.0002, -ZD, XR, 0.0002, ZD, XL, 0.0002, ZD); const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g2.computeVertexNormals(); block.add(new THREE.Mesh(g2, new THREE.MeshLambertMaterial({ color: 0xb08f62, side: THREE.DoubleSide }))); }          // 两头和底面
    { const wallTex = canvasTex(128, 64, (g, w, hh) => { g.fillStyle = '#efeae0'; g.fillRect(0, 0, w, hh); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(140,120,90,${Math.random() * 0.08})`; g.fillRect(Math.random() * w, Math.random() * hh, 2, 2); } g.fillStyle = '#4a5866'; for (let x = 10; x < w - 10; x += 26) { g.fillRect(x, hh * 0.25, 12, hh * 0.32); } g.fillStyle = '#6a4a32'; g.fillRect(w * 0.44, hh * 0.55, 14, hh * 0.45); });          // 渔村的房子：白墙、深灰的窗、木门
      const roofTex = canvasTex(64, 64, (g, w) => { g.fillStyle = '#5c6168'; g.fillRect(0, 0, w, w); for (let y = 0; y < w; y += 6) { g.fillStyle = 'rgba(30,32,36,0.5)'; g.fillRect(0, y, w, 1.5); } });          // 青灰色的瓦
      const roofShape = new THREE.Shape(); roofShape.moveTo(-0.0036, 0); roofShape.lineTo(0, 0.0026); roofShape.lineTo(0.0036, 0); roofShape.lineTo(-0.0036, 0);
      const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 0.0086, bevelEnabled: false }).translate(0, 0, -0.0043);
      const N = 26, walls = new THREE.InstancedMesh(new THREE.BoxGeometry(0.0064, 0.0042, 0.008).translate(0, 0.0021, 0), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 }), N), roofs = new THREE.InstancedMesh(roofGeo, new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.8 }), N);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pv = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0); let n = 0;
      for (const [rx, gap] of [[ROAD - 0.009, 0.012], [ROAD - 0.022, 0.013], [ROAD - 0.036, 0.016]]) for (let z = -ZD + 0.008; z < ZD - 0.006 && n < N; z += gap + tR() * 0.004) { if (tR() < 0.18) continue; const x = rx + (tR() - 0.5) * 0.003, y = ground(x, z) - 0.0002, tall = tR() < 0.35 ? 1.7 : 1; q.setFromAxisAngle(Y, Math.PI / 2); m4.compose(pv.set(x, y, z), q, sc.set(1, tall, 1)); walls.setMatrixAt(n, m4); m4.compose(pv.set(x, y + 0.0042 * tall, z), q, sc.setScalar(1)); roofs.setMatrixAt(n, m4); n++; }          // 顺着海堤后面的路排成几排，有平房也有两层的楼
      walls.count = roofs.count = n; walls.raycast = roofs.raycast = () => {}; block.add(walls, roofs);
      const broad = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.0034, 1).scale(1, 1.15, 1).translate(0, 0.005, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), 60), conif = new THREE.InstancedMesh(new THREE.ConeGeometry(0.0026, 0.009, 7).translate(0, 0.0055, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), 40), trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.00035, 0.0005, 0.003, 5).translate(0, 0.0015, 0), new THREE.MeshStandardMaterial({ color: 0x6b5038 }), 100), c = new THREE.Color();
      let nb = 0, nc = 0, nt = 0; for (let k = 0; k < 400 && (nb < 60 || nc < 40); k++) { const cx = XL + 0.012 + tR() * (ROAD - 0.045 - XL), cz = -ZD + 0.006 + tR() * (2 * ZD - 0.012), x = cx + (tR() - 0.5) * 0.012, z = cz + (tR() - 0.5) * 0.01; if (x > ROAD - 0.042 && tR() < 0.85) continue; const y = ground(x, z) - 0.0003, s2 = 0.7 + tR() * 0.6, conifer = tR() < 0.4; m4.compose(pv.set(x, y, z), q.setFromAxisAngle(Y, tR() * 6.28), sc.setScalar(s2)); if (conifer && nc < 40) { conif.setMatrixAt(nc, m4); conif.setColorAt(nc++, c.setHSL(0.33, 0.35, 0.22 + tR() * 0.08)); } else if (!conifer && nb < 60) { broad.setMatrixAt(nb, m4); broad.setColorAt(nb++, c.setHSL(0.26 + tR() * 0.05, 0.38, 0.3 + tR() * 0.1)); } else continue; if (nt < 100) trunk.setMatrixAt(nt++, m4); }          // 村子后面的树林：阔叶树和松树
      broad.count = nb; conif.count = nc; trunk.count = nt; broad.raycast = conif.raycast = trunk.raycast = () => {}; block.add(broad, conif, trunk); }
    const deepTex = canvasTex(8, 128, (g, w, hh) => { const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#5ba7cf'); gr.addColorStop(1, '#16406a'); g.fillStyle = gr; g.fillRect(0, 0, w, hh); });          // 海水侧面：越深越暗
    const water = new THREE.Mesh(new THREE.BoxGeometry(XR - XL, 1, ZD * 2 - 0.0006), new THREE.MeshStandardMaterial({ map: deepTex, transparent: true, opacity: 0.8, depthWrite: false, roughness: 0.3 })); water.renderOrder = 4; block.add(water);
    const WN = 96, waterTop = new THREE.Mesh(new THREE.PlaneGeometry(1, ZD * 2 - 0.0006, WN, 24), new THREE.MeshStandardMaterial({ color: 0x3e8dbd, transparent: true, opacity: 0.78, roughness: 0.12, metalness: 0.15, depthWrite: false })); waterTop.geometry.rotateX(-Math.PI / 2); waterTop.renderOrder = 5; waterTop.raycast = () => {}; block.add(waterTop);          // 海面：一层会动的细浪
    const wBase = waterTop.geometry.attributes.position.array.slice();
    const foamTex = canvasTex(64, 512, (g, w, hh) => { g.clearRect(0, 0, w, hh); for (let i = 0; i < 900; i++) { const y = Math.random() * hh, x = Math.pow(Math.random(), 1.6) * w; g.fillStyle = `rgba(255,255,255,${0.35 + Math.random() * 0.5})`; g.beginPath(); g.arc(x, y, 1 + Math.random() * 2.4, 0, 7); g.fill(); } });          // 水边的浪花
    foamTex.wrapT = THREE.RepeatWrapping;
    const foam = new THREE.Mesh(new THREE.PlaneGeometry(0.006, ZD * 2 - 0.001), new THREE.MeshBasicMaterial({ map: foamTex, transparent: true, depthWrite: false })); foam.rotation.x = -Math.PI / 2; foam.renderOrder = 6; foam.raycast = () => {}; block.add(foam);
    const lineM = new THREE.LineDashedMaterial({ color: 0x2a3140, dashSize: 0.003, gapSize: 0.002, transparent: true, opacity: 0.55 });

    // ---- 潮间带上的紫菜网帘：一排排竹竿挂着网 ----
    const bamboo = new THREE.MeshLambertMaterial({ color: 0xc8a96a }), WET = new THREE.Color(0x26351f), DRY = new THREE.Color(0x7d8a52);          // 浸在水里的网帘颜色深，露出水面晒着的变浅
    const netTex = canvasTex(64, 64, (g, w) => { g.strokeStyle = '#ffffff'; g.lineWidth = 3; for (let k = 0; k <= w; k += 8) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, w); g.moveTo(0, k); g.lineTo(w, k); g.stroke(); } }, { repeat: [2, 3] });          // 网眼；网帘平着张在竹竿之间，顺着滩涂的坡
    const netMs = [0, 1, 2, 3].map(() => new THREE.MeshLambertMaterial({ color: WET.clone(), map: netTex, alphaMap: netTex, transparent: true, side: THREE.DoubleSide, depthWrite: false })), nets = [];
    for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) { const { x, y } = netRow(r), z = -ZD + 0.012 + k * 0.02, y0 = shore(x); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.0005, 0.0005, 0.016, 5), bamboo); pole.position.set(x, y0 + 0.008, z); block.add(pole); if (k < 5) { const net = new THREE.Mesh(new THREE.PlaneGeometry(NET_WIDTH, 0.019), netMs[r]); net.position.set(x, y, z + 0.01); net.rotation.set(-Math.PI / 2, 0, -NET_TILT, 'ZYX'); net.userData.row = r; block.add(net); nets.push(net); } }
    // ---- 港口：码头和一条船 ----
    const deckTex = canvasTex(256, 64, (g, w, hh) => { g.fillStyle = '#a7a39b'; g.fillRect(0, 0, w, hh); for (let x = 0; x < w; x += 16) { g.fillStyle = `rgba(80,76,70,${0.25 + Math.random() * 0.15})`; g.fillRect(x, 0, 1.5, hh); } for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(60,58,54,${Math.random() * 0.15})`; g.fillRect(Math.random() * w, Math.random() * hh, 2, 2); } });
    const legTex = canvasTex(16, 128, (g, w, hh) => { g.fillStyle = '#9a968e'; g.fillRect(0, 0, w, hh); g.fillStyle = '#4a4a3c'; g.fillRect(0, hh * 0.5, w, hh * 0.5); g.fillStyle = 'rgba(30,60,40,0.5)'; g.fillRect(0, hh * 0.5, w, 6); });          // 码头桩：常被海水淹的下半截颜色深
    const pier = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.004, 0.014), new THREE.MeshStandardMaterial({ map: deckTex, roughness: 0.9 })); pier.position.set(0.11, 0.05, -0.03); block.add(pier);
    const pierLegs = []; for (const x of [0.083, 0.097, 0.111, 0.125, 0.137]) for (const dz of [-0.005, 0.005]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.0011, 0.0011, 0.05, 10), new THREE.MeshStandardMaterial({ map: legTex, roughness: 0.9 })); l.position.set(x, 0.025, -0.03 + dz); block.add(l); pierLegs.push(l); }
    for (const x of [0.088, 0.112, 0.134]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0011, 0.0022, 10), new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.5 })); b.position.set(x, 0.0531, -0.0242); block.add(b); }          // 系缆桩
    // 码头边立着一根潮位尺（水尺）：一米一格红白相间，海水淹到哪就是现在的潮位；旁边写着读数和涨、落
    const STAFF_X = 0.14, STAFF_Z = 0.035, STAFF_LO = MSL - 3 * KY, STAFF_HI = MSL + 3 * KY;
    const staffTex = canvasTex(32, 384, (g, w) => { for (let m = 0; m < 6; m++) { g.fillStyle = m % 2 ? '#f4f1ea' : '#c8382a'; g.fillRect(0, m * 64, w, 64); } g.fillStyle = '#20242c'; for (let k = 0; k <= 60; k++) g.fillRect(k % 5 ? w * 0.6 : w * 0.25, k * 6.4 - 0.5, w, k % 5 ? 1 : 2); });
    const staff = new THREE.Mesh(new THREE.BoxGeometry(0.005, STAFF_HI - STAFF_LO, 0.0012), [0, 0, 0, 0, 1, 0].map((i) => new THREE.MeshLambertMaterial(i ? { map: staffTex } : { color: 0xe8e4da }))); staff.position.set(STAFF_X, (STAFF_LO + STAFF_HI) / 2, STAFF_Z); block.add(staff);
    const staffPost = new THREE.Mesh(new THREE.BoxGeometry(0.0016, STAFF_LO - shore(STAFF_X), 0.0016), new THREE.MeshLambertMaterial({ color: 0x6b6f76 })); staffPost.position.set(STAFF_X, (STAFF_LO + shore(STAFF_X)) / 2, STAFF_Z - 0.001); block.add(staffPost);
    const aLevel = airLabel(block, '', { h: 0.011, color: '#1d3f70', icon: 'flow' }), aGround = airLabel(block, '搁浅', { h: 0.013, color: '#b03a2a', dim: 0 }), aHover = airLabel(block, '', { h: 0.011, color: '#3a3226', dim: 0 });
    const ship = new THREE.Group(); block.add(ship);
    { const H = SHIP_DRAFT + 0.005, prof = (y0, y1) => { const sh = new THREE.Shape(), bowAt = (y) => 0.010 + 0.007 * Math.min(1, y / 0.012); sh.moveTo(-0.017, y0); sh.lineTo(bowAt(y0), y0); for (let k = 1; k <= 6; k++) { const y = y0 + ((y1 - y0) * k) / 6; sh.lineTo(bowAt(y), y); } sh.lineTo(-0.017, y1); sh.lineTo(-0.017, y0); return new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false }).translate(0, HULL_BOTTOM, -0.006); };          // 不倒角：船底正好在 HULL_BOTTOM、船长正好 −0.017～0.017，和 kit/tide.js 的搁浅判断用同一个外形          // 船身：平底（船底贴着 HULL_BOTTOM，搁浅判断不变），船头往上翘
      const lower = new THREE.Mesh(prof(0, H * 0.68), new THREE.MeshStandardMaterial({ color: 0x9a3a28, roughness: 0.6 })); ship.add(lower);
      const upper = new THREE.Mesh(prof(H * 0.68, H), new THREE.MeshStandardMaterial({ color: 0xf1ede4, roughness: 0.6 })); ship.add(upper);
      const winTex = canvasTex(128, 64, (g, w, hh) => { g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, hh); g.fillStyle = '#2f4a66'; for (let x = 10; x < w - 10; x += 28) g.fillRect(x, 14, 18, 18); });
      const cab = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.0072, 0.0086), new THREE.MeshStandardMaterial({ map: winTex, roughness: 0.7 })); cab.position.set(-0.008, HULL_BOTTOM + H + 0.0036, 0); ship.add(cab);
      const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(0.0124, 0.0012, 0.0098), new THREE.MeshStandardMaterial({ color: 0x2f6aa0, roughness: 0.5 })); cabRoof.position.set(-0.008, HULL_BOTTOM + H + 0.0078, 0); ship.add(cabRoof);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.0003, 0.0004, 0.016, 6), new THREE.MeshStandardMaterial({ color: 0x5a4a3a })); mast.position.set(0.003, HULL_BOTTOM + H + 0.008, 0); ship.add(mast);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.004, 0.0026), new THREE.MeshBasicMaterial({ color: 0xd83a2a, side: THREE.DoubleSide })); flag.position.set(0.005, HULL_BOTTOM + H + 0.0145, 0); ship.add(flag); }          // 驾驶室、桅杆和小旗
    const tHint = tag('<span>拨时间、拖月亮</span><small>看潮水一天里怎么涨落</small>', 'hint');          // 开场的提示：不用白底牌子
    noteBadge(tag, '教学示意：潮位竖直方向夸大了，数值是示意').loc(block, XL + 0.012, -0.004, ZD + 0.01);
    const people = new THREE.Group(); block.add(people);
    for (let k = 0; k < 5; k++) { const p = new THREE.Group(), body = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0013, 0.0046, 8), new THREE.MeshStandardMaterial({ color: [0xd8553a, 0x3a6fb0, 0xe0b040][k % 3], roughness: 0.8 })), head = new THREE.Mesh(new THREE.SphereGeometry(0.0009, 10, 8), new THREE.MeshStandardMaterial({ color: 0xe8c39e })), hat = new THREE.Mesh(new THREE.ConeGeometry(0.0021, 0.0012, 14), new THREE.MeshStandardMaterial({ color: 0xd9c08a, roughness: 0.9 })); body.position.y = 0.0023; head.position.y = 0.0055; hat.position.y = 0.0067; p.add(body, head, hat); if (k % 2 === 0) { const pail = new THREE.Mesh(new THREE.CylinderGeometry(0.0007, 0.0006, 0.0012, 8), new THREE.MeshStandardMaterial({ color: 0x4a7aa0 })); pail.position.set(0.0014, 0.0008, 0); p.add(pail); } const x = 0.02 + k * 0.012, z = 0.02 - (k % 2) * 0.02; p.position.set(x, shore(x), z); p.rotation.y = k * 1.3; people.add(p); }          // 赶海的人：斗笠、提着小桶

    // ---- 太阳—地球—月亮小盘（在海岸左边的书页上）：拖月亮绕地球走 ----
    const orr = new THREE.Group(); group.add(orr);          // 太阳—地球—月亮盘：平时缩小放在海岸左后方；点一下（或拖月亮）它就放大到中间当主角
    const spaceTex = canvasTex(512, 512, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, '#16203a'); gr.addColorStop(1, '#070b16'); g.fillStyle = gr; g.fillRect(0, 0, w, w); for (let i = 0; i < 700; i++) { const a = Math.pow(Math.random(), 2.4); g.fillStyle = `rgba(255,255,255,${0.2 + a * 0.8})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * w, a > 0.85 ? 1.4 : 0.8, 0, 7); g.fill(); } });          // 盘面：深色的星空
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.05, 96), new THREE.MeshBasicMaterial({ map: spaceTex })); disc.rotation.x = -Math.PI / 2; orr.add(disc);
    const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(0.0525, 0.054, 0.004, 96, 1, true), new THREE.MeshStandardMaterial({ color: 0x7a5434, roughness: 0.6 })); baseRing.position.y = -0.0018; orr.add(baseRing);          // 木质的边
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.0016, 8, 96), new THREE.MeshStandardMaterial({ color: 0xb89656, metalness: 0.6, roughness: 0.35 })); rim.rotation.x = Math.PI / 2; orr.add(rim);          // 黄铜边：像一件仪器
    const earthTex = new THREE.TextureLoader().load(reliefUrl); earthTex.colorSpace = THREE.SRGBColorSpace;
    const moonTex = canvasTex(256, 128, (g, w, hh) => { g.fillStyle = '#b9b7b0'; g.fillRect(0, 0, w, hh); for (let i = 0; i < 14; i++) { const x = Math.random() * w, y = Math.random() * hh, r = 10 + Math.random() * 26, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(90,90,96,0.55)'); gr.addColorStop(1, 'rgba(90,90,96,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } for (let i = 0; i < 90; i++) { const x = Math.random() * w, y = Math.random() * hh, r = 1 + Math.random() * 3; g.strokeStyle = 'rgba(220,218,210,0.6)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); } });          // 月面：暗的月海、亮的小坑
    const sunW = { value: new THREE.Vector3(-1, 0, 0) }, litMat = (map) => new THREE.ShaderMaterial({ uniforms: { map: { value: map }, sunW }, vertexShader: 'varying vec3 vN; varying vec2 vUv; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: 'uniform sampler2D map; uniform vec3 sunW; varying vec3 vN; varying vec2 vUv; void main(){ vec3 t = texture2D(map, vUv).rgb; float d = dot(normalize(vN), normalize(sunW)); float k = smoothstep(-0.05, 0.12, d); gl_FragColor = vec4(mix(t * 0.16 + vec3(0.02,0.03,0.07), t * (0.75 + 0.35 * max(d, 0.0)), k), 1.0); }' });          // 太阳光从左边照过来：朝着太阳的一半亮，背着的一半暗（月亮的圆缺就是这么来的）
    const earth = new THREE.Mesh(new THREE.SphereGeometry(0.009, 48, 32), litMat(earthTex)); earth.position.y = 0.01; orr.add(earth);
    const bulge = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 24), new THREE.MeshBasicMaterial({ color: 0x8fc6ea, transparent: true, opacity: 0.55, depthWrite: false })); bulge.position.y = 0.01; orr.add(bulge);          // 鼓起来的海水（夸大）
    const bulgeBase = bulge.geometry.attributes.position.array.slice();
    const moon = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 32, 20), litMat(moonTex)); orr.add(moon);
    const moonPick = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); moonPick.userData.pick = true; moon.add(moonPick);
    const sunGlowTex = canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,244,200,1)'); gr.addColorStop(0.25, 'rgba(255,214,120,0.85)'); gr.addColorStop(1, 'rgba(255,190,80,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const sunDir = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunGlowTex, transparent: true, depthWrite: false })); sunDir.scale.set(0.03, 0.03, 1); sunDir.position.set(-0.066, 0.012, 0); sunDir.raycast = () => {}; orr.add(sunDir);          // 太阳在盘子左边外面
    { const rayTex = canvasTex(256, 8, (g, w, hh) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,214,120,0.9)'); gr.addColorStop(1, 'rgba(255,214,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, hh); });
      for (const z of [-0.03, -0.018, -0.006, 0.006, 0.018, 0.03]) { const r = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.0009), new THREE.MeshBasicMaterial({ map: rayTex, transparent: true, depthWrite: false, opacity: 0.55 })); r.rotation.x = -Math.PI / 2; r.position.set(-0.012, 0.0012, z); r.raycast = () => {}; orr.add(r); } }          // 一道道平行的太阳光，从左边照过来          // 尖朝地球：太阳光从左边照过来
    const port = new THREE.Mesh(new THREE.SphereGeometry(0.0018, 8, 6), new THREE.MeshBasicMaterial({ color: 0xd8392b })); orr.add(port);
    const moonOrbit = new THREE.Mesh(new THREE.RingGeometry(0.034, 0.0352, 72), new THREE.MeshBasicMaterial({ color: 0x9aa4b4, side: THREE.DoubleSide })); moonOrbit.rotation.x = -Math.PI / 2; moonOrbit.position.y = 0.0005; orr.add(moonOrbit);
    const aSun = airLabel(orr, '太阳光 →', { x: -0.06, y: 0.012, z: 0.028, h: 0.0065, color: '#9a6410', icon: 'sun' }), aMoon = airLabel(orr, '', { h: 0.0065, color: '#2b3346', icon: 'moon' });
    const labels = [aLevel, aGround, aHover, aSun, aMoon];
    const placeOrr = () => {
      const { moon: a, port: rot } = angles(S.D, S.h);          // 新月：月亮在地球和太阳中间（太阳在左边）
      moon.position.set(Math.cos(a) * 0.035, 0.01, -Math.sin(a) * 0.035);
      const p = bulge.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = bulgeBase[i * 3], y = bulgeBase[i * 3 + 1], z = bulgeBase[i * 3 + 2], r = bulgeRadius(S.D, S.h, Math.atan2(-z, x)); p.setXYZ(i, x * r, y * 0.0095, z * r); }
      p.needsUpdate = true; bulge.geometry.computeBoundingSphere();          // 各方位按日月合成式变形，不把长轴固定朝月
      // 地球自转：0 点时港口在背着太阳的那一边（夜里，太阳在左边）
      port.position.set(Math.cos(rot) * 0.0105, 0.01, -Math.sin(rot) * 0.0105); earth.rotation.y = rot - (120 * Math.PI) / 180;          // 地球跟着自转：港口那一点（约东经 120°）正好在红点下面
      aMoon.setText(`${phaseName(S.D + S.h / 24)} · ${lunarName(S.D)}`); aMoon.position.set(moon.position.x, 0.026, moon.position.z);          // 港口就是地球上的红点，不挂牌子
    };

    const layout = () => {
      const v = level(S.D, S.h), y = MSL + v * KY;
      let x0 = XL; for (let x = XL; x < XR; x += 0.001) if (shore(x) < y) { x0 = x; break; }          // 海水只从水边往海里画，不罩在岸上
      water.scale.set((XR - x0) / (XR - XL), Math.max(0.001, y), 1); water.position.set((x0 + XR) / 2, y / 2, 0);
      waterTop.scale.x = XR - x0; waterTop.position.set((x0 + XR) / 2, y + 0.0002, 0); foam.position.set(x0 + 0.0022, y + 0.0004, 0); S.wy = y;          // 海面和浪花跟着水边走
      const bed = SHIP_BED, { afloat, y: shipY } = shipState(v);          // 港口航道（码头边）的水深：太浅船就搁浅
      ship.position.set(0.11, shipY, 0.0); ship.rotation.z = 0;          // 搁浅时船底就落在海底上
      aGround.position.set(0.1, bed + 0.024, 0); aGround.setOn(!afloat);          // 船浮着就不写字；搁浅了才写
      const trend = tideTrend(S.D, S.h); aLevel.setText(`${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)} 米 ${trend.label}`); aLevel.position.set(STAFF_X - 0.005 - aLevel.scale.x / 2, y + 0.003, STAFF_Z + 0.004);          // 读数跟着水面，挂在潮位尺旁边
      people.children.forEach((pp) => (pp.visible = shore(pp.position.x) > y + 0.001)); people.visible = true;          // 赶海的人只站在露出水面的滩涂上
      S.netStates = [0, 1, 2, 3].map((r) => netState(r, y));          // 按网面最低与最高边缘区分全干、部分浸水、全湿
      tHint.loc(block, -0.03, 0.11, 0).show(!S.seen.size);
      placeOrr(); drawChart();
    };

    // ---- 侧栏：这一天的潮位曲线（点曲线就是挑时刻）；看过的另一天画成虚线比 ----
    const drawChart = () => {
      if (!W) return;
      const c = W.chart, g = c.getContext('2d'), w = c.width, hh = c.height, L = 30, R = w - 8, T = 20, B = hh - 22, PX = (t) => L + (t / 24) * (R - L), PY = (v) => (T + B) / 2 - (v / 2.6) * ((B - T) / 2);
      g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, hh); g.font = '600 12px "PingFang SC", sans-serif'; g.fillStyle = '#3a3226'; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText(`农历${lunarName(S.D)}的潮位（米，示意）`, 6, 9);
      g.strokeStyle = 'rgba(60,50,40,0.15)'; for (const v of [-2, 0, 2]) { g.beginPath(); g.moveTo(L, PY(v)); g.lineTo(R, PY(v)); g.stroke(); g.fillText(v > 0 ? `+${v}` : v, 4, PY(v)); }
      g.textAlign = 'center'; for (const t of [0, 6, 12, 18, 24]) g.fillText(`${t}时`, PX(t), hh - 9);
      const curve = (D, dash, cl, wd) => { g.save(); g.setLineDash(dash); g.strokeStyle = cl; g.lineWidth = wd; g.beginPath(); for (let t = 0; t <= 24; t += 0.1) { const x = PX(t), y = PY(level(D, t)); if (t) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); g.restore(); };
      if (S.cmp != null && Math.abs(S.cmp - S.D) > 3) curve(S.cmp, [4, 3], 'rgba(60,90,140,0.45)', 1.5);
      curve(S.D, [], '#2f62b0', 2.2);
      if (S.act) { const A = ACTS[S.act]; g.fillStyle = 'rgba(80,160,90,0.15)'; for (let t = 0; t < 24; t += 0.1) if (A.ok(level(S.D, t), S.D, tideTrend(S.D, t).rising, t)) g.fillRect(PX(t), T, PX(0.1) - PX(0) + 0.5, B - T); }          // 挑过一件事以后，合适的时段淡淡涂绿
      const v = level(S.D, S.h); g.fillStyle = '#c4462e'; g.beginPath(); g.arc(PX(S.h), PY(v), 4, 0, 7); g.fill();
      const rg = range(S.D);
      W.read.innerHTML = `现在 <b>${timeText(S.h)}</b>　这一天的潮差 <b>${rg.r.toFixed(1)} 米</b>${S.pick ? `<br>${ACTS[S.pick.k].name}挑在 ${timeText(S.pick.h)}：<b>${S.pick.ok ? '合适' : '不合适'}</b>（${ACTS[S.pick.k].why}）` : ''}<br><small>潮位是示意；实际各地每天的潮时、潮高可以查潮汐表</small>`;
    };
    const drawLog = () => {
      if (!W) return;
      const rows = [], r = (b, t) => rows.push(h('div', { class: 'tl-row' }, h('b', {}, b), h('span', {}, t)));
      if (S.seen.has('day')) r('一天里：', '海水通常涨两次、落两次');
      for (const [k, n] of [['spring', '新月、满月（初一、十五前后）'], ['neap', '上弦、下弦']]) if (S.did[k]) r(`${n}：`, `潮差约 ${S.did[k].toFixed(1)} 米`);
      for (const k in ACTS) if (S.did[k] != null) r(`曾尝试${ACTS[k].name}：`, `${lunarName(S.did[k].D)} ${timeText(S.did[k].h)}：${S.did[k].ok ? '挑在' : '没挑在'}${ACTS[k].need}，${S.did[k].ok ? '合适' : '不合适'}`);
      if (S.guess != null && S.did.spring && S.did.neap) rows.push(h('div', { class: 'tl-row' }, h('small', {}, `你猜：${ASK[1][S.guess]}　实际：初一、十五前后`)));
      W.log.replaceChildren(...rows);
      if (S.seen.has('day') && S.did.spring && S.did.neap && Object.keys(ACTS).some((k) => S.did[k]?.ok)) W.ui.unlock();
    };
    const noteState = () => {
      const f = ((S.D % SYN) + SYN) % SYN / SYN;
      if (f < 0.04 || f > 0.96 || Math.abs(f - 0.5) < 0.04) { if (!S.did.spring) { S.did.spring = range(S.D).r; S.cmp = S.cmp ?? S.D; drawLog(); } }
      if (Math.abs(f - 0.25) < 0.04 || Math.abs(f - 0.75) < 0.04) { if (!S.did.neap) { S.did.neap = range(S.D).r; S.cmp = S.cmp ?? S.D; drawLog(); } }
    };

    // ---- 鼠标移上去才浮出名字（平时不写，免得满屏都是字） ----
    const hover = (rc) => {
      const ht = rc.intersectObjects([...nets, staff, pier, ...ship.children, land], false)[0], o = ht?.object;
      if (!o) { aHover.userData.want = 0; return; }
      const l = block.worldToLocal(ht.point.clone()), nm = o.userData.row != null ? `紫菜网帘：${S.netStates[o.userData.row]}` : o === staff ? '潮位尺' : o === pier ? '码头' : o.parent === ship ? '船' : l.x < intertidal.hi ? '岸上' : l.x < intertidal.lo ? '潮间带（滩涂）' : '海底';
      aHover.setText(nm); aHover.position.set(l.x, Math.max(l.y, MSL) + 0.014, l.z); aHover.userData.want = 1;
    };
    // ---- 轮流当主角：海岸 ↔ 太阳—地球—月亮盘 ----
    const V = { harbor: { b: new THREE.Vector3(0.02, 0, 0), bs: 1, o: new THREE.Vector3(-0.215, 0.004, -0.055), os: 1 }, orr: { b: new THREE.Vector3(0.225, 0, -0.085), bs: 0.42, o: new THREE.Vector3(-0.02, 0.004, 0.012), os: 2.6 } };
    const showOrr = () => { if (S.vTo) return; S.vTo = 1; S.framed = false; W?.ui.status('太阳—地球—月亮盘：拖着月亮绕地球走，看引潮作用叠在一起还是互相抵消；右后方的小海岸跟着变。按“回到海边”换回来。'); };
    const showHarbor = (quiet) => { if (!S.vTo) return; S.vTo = 0; S.framed = false; if (!quiet) W?.ui.status('回到海边。拨时间（或让一天走），看海水一天里怎么涨落；点左后方的小盘可以再拖月亮。'); };          // 回到海边：状态栏也换回海边的话
    const tOrr = tag('<span>日地月 →</span>', 'view', showOrr), tBack = tag('<span>回到海边</span>', 'view', showHarbor);
    const ease = (x) => x * x * (3 - 2 * x), v1 = new THREE.Vector3();
    const fadeL = () => { const k = ease(S.vk); for (const l of [aLevel, aGround, aHover]) { l.material.opacity *= 1 - k; l.visible = l.visible && k < 0.95; } };          // 海岸缩小时它的字先收起来（在标签自己更新之后再压暗）
    const stepView = (dt) => {
      const sp = dt * 1.5; S.vk = S.vTo > S.vk ? Math.min(S.vTo, S.vk + sp) : Math.max(S.vTo, S.vk - sp); const k = ease(S.vk);
      block.position.copy(v1.copy(V.harbor.b).lerp(V.orr.b, k)); block.scale.setScalar(V.harbor.bs + (V.orr.bs - V.harbor.bs) * k);
      orr.position.copy(v1.copy(V.harbor.o).lerp(V.orr.o, k)); orr.scale.setScalar(V.harbor.os + (V.orr.os - V.harbor.os) * k);
      tOrr.loc(orr, 0, 0.03, -0.035).show(!S.vTo && S.vk === 0); if (S.vk > 0) tHint.show(false); tBack.loc(block, 0, 0.12, -ZD).show(S.vTo === 1 && S.vk === 1);          // 盘子当主角时，海岸上的开场提示收起来
      if (!S.framed && S.vk === S.vTo) { S.framed = true; reframe?.(); }          // 换好了：镜头按现在的东西重新取景
    };

    // ---- 指针：拖月亮；在曲线上挑时刻（在侧栏里，见 mount） ----
    const plane = new THREE.Plane(), hit = new THREE.Vector3();
    const pointer = {
      down(rc) {
        if (rc.intersectObject(moonPick, false).length) { showOrr(); S.drag = true; document.getElementById('c').style.cursor = 'grabbing'; return true; }          // 抓住月亮：盘子同时放大到中间
        if (!S.vTo && rc.intersectObjects([disc, rim], false).length) { showOrr(); return true; }
        if (S.vTo && rc.intersectObject(land, false).length) { showHarbor(); return true; }
        return false;
      },
      move(rc) {
        const c = document.getElementById('c');
        if (!S.drag) { if (c) c.style.cursor = rc.intersectObject(moonPick, false).length ? 'grab' : (!S.vTo && rc.intersectObjects([disc, rim], false).length) || (S.vTo && rc.intersectObject(land, false).length) ? 'pointer' : ''; if (!S.vTo) hover(rc); return false; }
        orr.updateMatrixWorld(); plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), orr.localToWorld(new THREE.Vector3(0, 0.01, 0))); if (!rc.ray.intersectPlane(plane, hit)) return true;
        const l = orr.worldToLocal(hit.clone()), a = Math.atan2(-l.z, l.x), nextD = (((a - Math.PI) / (2 * Math.PI) * SYN - S.h / 24) % SYN + SYN) % SYN; setDate(S, nextD);
        S.seen.add('moon'); noteState(); W?.day.set(Math.round(S.D)); layout(); return true;
      },
      up() { if (!S.drag) return false; S.drag = false; document.getElementById('c').style.cursor = ''; return true; },
    };

    layout();

    return {
      group,
      card: false,
      emerge: 'flat',          // 课本的图平放在书页上，模型从它上面长出来、它慢慢淡掉
      size: { w: 0.42, d: 0.18, h: 0.1 },
      view: { elev: 24, azim: 12, lookY: 0.4, frameMargin: 1.04 },
      pointer,
      mount(ui) {
        const time = slider('一天里的时刻（地方时）', { min: 0, max: 24, step: 1 / 60, value: S.h, fmt: timeText, onInput: (v) => { showHarbor(); S.h = v; S.play = false; acts.btns[0].textContent = '让一天走'; S.seen.add('day'); layout(); drawLog(); } });
        const day = slider('农历的日子（拖月亮吸附整日）', { min: 0, max: 29, step: 1, value: 0, fmt: (v) => lunarName(v), onInput: (v) => { setDate(S, v); noteState(); layout(); } });          // 换了日子：之前挑的时刻作废
        const actSeg = seg('选一件事，再在曲线上点一个时刻', Object.keys(ACTS).map((k) => ACTS[k].name), (_, i) => { S.act = Object.keys(ACTS)[i]; S.pick = null; layout(); ui.status(`${ACTS[S.act].name}：在上面的潮位曲线上<b>点一个时刻</b>，看看这时候行不行。`); }, { value: -1 });
        const guess = seg(...ASK, (_, i) => { S.guess = i; drawLog(); }, { value: -1 });
        const acts = buttons([
          { text: '让一天走', onClick: () => { showHarbor(); if (S.h >= 24) S.h = 0; S.play = !S.play; acts.btns[0].textContent = S.play ? '停一下' : '让一天走'; } },
          { text: '重来', ghost: true, onClick: () => { ui.relock?.(); showHarbor(true); Object.assign(S, { D: 0, h: 6, play: false, act: null, pick: null, seen: new Set(), did: {}, guess: null, cmp: null }); time.set(6); day.set(0); actSeg.set(-1); guess.set(-1); acts.btns[0].textContent = '让一天走'; layout(); drawLog(); } },
        ]);
        const chart = h('canvas', { class: 'wx-map', width: 320, height: 140, style: 'cursor: pointer' }), read = h('div', { class: 'read-out' }), log = h('div', { class: 'timeline' });
        chart.onclick = (e) => { showHarbor(true); const r = chart.getBoundingClientRect(), t = (((e.clientX - r.left) / r.width) * 320 - 30) / (320 - 38) * 24; if (t < 0 || t > 24) return; S.h = t; time.set(t); S.seen.add('day'); S.play = false; acts.btns[0].textContent = '让一天走';          // 挑时刻时先停下
          if (S.act) { const ok = ACTS[S.act].ok(level(S.D, t), S.D, tideTrend(S.D, t).rising, t); S.pick = { k: S.act, h: t, ok }; S.did[S.act] = { D: S.D, h: t, ok }; } layout(); drawLog(); };          // 点曲线：挑一个时刻
        ui.controls.append(h('div', { class: 'bar-title' }, '港口的潮位（点曲线可以挑时刻）'), chart, read, time.el, acts.el, day.el, actSeg.el, guess.el, note('左后方的小盘是太阳—地球—月亮：点它（或直接拖月亮）就放大到中间。太阳光从左边来，中间是地球（红点是港口）。浅蓝水面按日月分潮合成，径向变形夸大。盘上看的是三者的位置；月相的名字说的是从地球上看到的月亮形状。'));
        ui.data.append(h('div', { class: 'bar-title' }, '你看到了什么'), log);
        W = { ui, chart, read, log, day, time, acts };
        ui.status('这是一段海岸：岸上有港口，滩涂上养着紫菜。先<b>拨时间</b>（或让一天走），看海水一天里怎么涨落。');
        layout(); drawLog();
      },
      update(dt, t) {
        stepView(dt); orr.updateMatrixWorld(); sunW.value.set(-1, 0, 0).transformDirection(orr.matrixWorld);          // 太阳光的方向：盘子的左边（不管书和镜头怎么转）
        { const P = waterTop.geometry.attributes.position.array, tt = t || 0; for (let i = 0; i < P.length; i += 3) { const u = wBase[i], z = wBase[i + 2]; P[i + 1] = 0.00032 * Math.sin(u * 40 + z * 260 + tt * 1.8) + 0.00022 * Math.sin(z * 410 - u * 30 - tt * 2.6); } waterTop.geometry.attributes.position.needsUpdate = true; waterTop.geometry.computeVertexNormals(); foamTex.offset.y = (tt * 0.03) % 1; foam.material.opacity = 0.75 + 0.2 * Math.sin(tt * 1.3); }          // 细浪一直在动
        netMs.forEach((m, r) => m.color.lerp(S.netStates[r] === '全部出露' ? DRY : S.netStates[r] === '全部浸水' ? WET : WET.clone().lerp(DRY, 0.5), Math.min(1, dt * 1.5))); labels.forEach((l) => l.tick(dt)); fadeL();          // 网帘露出来慢慢晒干、变浅
        if (S.play) { S.h = playHour(S.h, dt); if (S.h >= 24) { S.play = false; if (W) W.acts.btns[0].textContent = '重新播放当天'; } if (!S.seen.has('day')) { S.seen.add('day'); drawLog(); } W?.time.set(S.h); layout(); }
      },
    };
  },
};
