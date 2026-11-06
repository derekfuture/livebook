// 高中地理 必修第一册 第三章第一节 水循环（课本第 46–48 页，图 3.2 水循环示意、活动“认识砂田影响的水循环环节”）。
//
// 一个问题（课本开头）：江河奔流不息，最终注入大海，为什么大海的水没有增多？
// 课本的图就是模型：一块切开的地块——东边是海，往西是沿海平原（中间一块田）、一道山（分水岭），山那边是一块内陆盆地和一个湖。
// 学生亲手做的：
//   1. 拖着云走：海上的水汽被风送到哪里，雨就下在哪里。下在海上是海上内循环；下在沿海平原，雨水经地表径流、地下径流流回海里，是海陆间循环；
//      拖到内陆盆地会重置为陆地蒸发、陆地降水的独立情境，不追踪之前海洋水汽。一粒粒水看得见它往哪走：上天、落地、在地面流、往地下渗。
//   2. 换平原上那块田的地面：裸田、砂田（铺砂石）、硬化地面。同样的雨，下渗、地表径流、蒸发各占多少就变了（课本活动）。
//   3. 侧栏记着海洋“流进”和“蒸发走”的水：分别统计源水体取出、回海、入湖、土壤暂存和在途水，核对收支。
// 教学示意：竖直方向夸大了，时间加快了；各环节的比例是示意，只用来比较。
import * as THREE from 'three';
import { seg, buttons, note } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { h } from '../ui/Panel.js';
import { groundLabel, faceLabel, airLabel, noteBadge } from './kit/labels.js';
import { XL, XR, DIVIDE, COAST, FIELD, SURF, ground, SEA_Y, LAKE_X, LAKE_Y, scenarioOf as cycleOf, rainSplit, createWater } from './kit/water.js';

const ZD = 0.065, NX = 160, YB = 0, CLOUD_Y = 0.112;
const KEYS = ['bare', 'sand', 'paved'];
const ASK = ['先猜一下（可以不猜）：在这个情境里，田里铺上砂石以后，雨水会——', ['下渗得更多', '下渗得更少', '没有变化']];
const rnd = (() => { let s = 13; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export default {
  id: 'water',
  fig: '图3.2',
  title: '水循环',
  flow: 'explore',
  ask: '江河奔流不息，最终注入大海，为什么大海的水没有增多？蒸发的海水又去哪儿了？',
  need: '拖云选择海上、沿海、内陆三个独立情境（切换即重置水粒）；再换田的地面，比一比雨水去哪了',
  conclusion: {
    page: 51,
    quote: '水循环是指自然界的水在水圈、大气圈、岩石圈、生物圈中，通过蒸发（蒸腾）、水汽输送、降水、下渗、径流等环节连续运动的过程。……根据发生的空间范围，水循环可分为海陆间循环、陆地内循环和海上内循环。……海洋表面的水经过蒸发变成水汽。水汽上升到空中，被气流输送到大陆上空，部分在适当条件下凝结，形成降水。降落到地面的水，一部分在地面流动，形成地表径流；一部分渗入地下，形成地下径流。两者经过江河汇集，最后又回到海洋。……水循环把大气圈、水圈、岩石圈和生物圈有机联系起来，使地球上各种水体处于不断更新状态，从而维持全球水量的动态平衡。',
    why: '海水一直在蒸发，水汽被风送到陆地上空、变成雨落下来，再经地表径流、地下径流回到海里：流进海里的水，本来就是从海里蒸发出去的。全球水的总量在一定时间尺度上近似稳定；各水体储量随收入与支出的差额变化。长期平均条件下，海洋蒸发与降水、径流补给大致平衡，循环持续并不保证每个水体储量不变。地面不同，雨水的去向不同：铺上砂石，水容易渗下去、不容易蒸发；地面硬化，水渗不下去，大多在地面上流走。',
    src: '课本第 46–48 页 · 第三章 第一节 水循环',
  },

  create({ tag }) {
    const group = new THREE.Group();
    const S = { cx: 0.03, surf: 'bare', drag: false, seen: new Set(), surfSeen: new Set(), guess: null, moved: false };
    let W = null;
    const block = new THREE.Group(); group.add(block);
    const X = (u) => XL + (XR - XL) * u;

    // ---- 侧面剖面：土层、岩层，地下水面 ----
    const SW = 1024, SH = 256, YMAX = 0.1;
    const sideCv = document.createElement('canvas'); sideCv.width = SW; sideCv.height = SH; const sideTex = new THREE.CanvasTexture(sideCv); sideTex.colorSpace = THREE.SRGBColorSpace;
    const paintSide = () => {
      const g = sideCv.getContext('2d'); g.clearRect(0, 0, SW, SH);
      for (let i = 0; i < SW; i++) {
        const x = X(i / (SW - 1)), top = ground(x), ty = (1 - top / YMAX) * SH;
        const sea = x > COAST; if (sea) { const sy = (1 - SEA_Y / YMAX) * SH; g.fillStyle = '#5e9ccc'; g.fillRect(i, sy, 1, ty - sy); }
        if (x < -0.105 && x > -0.165 && top < LAKE_Y) { const ly = (1 - LAKE_Y / YMAX) * SH; g.fillStyle = '#6aa8d2'; g.fillRect(i, ly, 1, ty - ly); }
        g.fillStyle = '#8e6a44'; g.fillRect(i, ty, 1, 10); g.fillStyle = '#b48b5a'; g.fillRect(i, ty + 10, 1, SH * 0.25); g.fillStyle = '#c9a877'; g.fillRect(i, ty + 10 + SH * 0.25, 1, SH);
        const wt = Math.min(top - 0.008, Math.max(0.018, top - 0.012)), wy = (1 - wt / YMAX) * SH;          // 地下水面：在地面下面一点，跟着地形起伏
        if (!sea) { g.fillStyle = 'rgba(70,130,190,0.35)'; g.fillRect(i, wy, 1, SH - wy); }
      }
      g.strokeStyle = 'rgba(40,90,150,0.8)'; g.setLineDash([8, 6]); g.lineWidth = 2; g.beginPath(); for (let i = 0; i < SW; i += 2) { const x = X(i / (SW - 1)); if (x > COAST) break; const top = ground(x), wy = (1 - Math.max(0.018, top - 0.012) / YMAX) * SH; if (i) g.lineTo(i, wy); else g.moveTo(i, wy); } g.stroke(); g.setLineDash([]);
      sideTex.needsUpdate = true;
    };
    const front = new THREE.Mesh(new THREE.PlaneGeometry(XR - XL, YMAX), new THREE.MeshBasicMaterial({ map: sideTex, transparent: true, alphaTest: 0.1 })); front.position.set(0, YMAX / 2, ZD); block.add(front);
    const backF = front.clone(); backF.position.z = -ZD; backF.rotation.y = Math.PI; backF.scale.x = -1; block.add(backF);

    // ---- 顶面：一张高度网格，按地方上色（山上林地、平原、那块田、盆地） ----
    const topGeo = new THREE.PlaneGeometry(XR - XL, ZD * 2, NX, 1); topGeo.rotateX(-Math.PI / 2);
    const tCol = new Float32Array(topGeo.attributes.position.count * 3); topGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
    const grain = canvasTex(256, 256, (g, w) => { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, w); for (let i = 0; i < 2200; i++) { const v = 150 + Math.random() * 90; g.fillStyle = `rgba(${v},${v},${v},${0.2 + Math.random() * 0.3})`; g.fillRect(Math.random() * w, Math.random() * w, 1.6, 1.6); } }); grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(6, 2);
    const topMesh = new THREE.Mesh(topGeo, new THREE.MeshLambertMaterial({ vertexColors: true, map: grain })); block.add(topMesh);
    const C = { forest: new THREE.Color(0x5f8f45), plain: new THREE.Color(0x9cc06e), bare: new THREE.Color(0xa07a50), sand: new THREE.Color(0xb8b2a4), paved: new THREE.Color(0x9a9ca2), beach: new THREE.Color(0xe2d2a0), basin: new THREE.Color(0xc4b47c) }, tc = new THREE.Color();
    const shapeTop = () => {
      const p = topGeo.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const x = p.getX(k); p.setY(k, ground(x));
        if (x > COAST - 0.006) tc.copy(C.beach); else if (x >= FIELD[0] && x <= FIELD[1]) tc.copy(C[S.surf]); else if (Math.abs(x - DIVIDE) < 0.045) tc.copy(C.forest); else if (x < DIVIDE) tc.copy(C.basin); else tc.copy(C.plain);
        tCol.set([tc.r, tc.g, tc.b], k * 3);
      }
      p.needsUpdate = true; topGeo.attributes.color.needsUpdate = true; topGeo.computeVertexNormals();
    };
    const sea = new THREE.Mesh(new THREE.BoxGeometry(XR - COAST, 0.001, ZD * 2), new THREE.MeshLambertMaterial({ color: 0x4f8fc4, transparent: true, opacity: 0.85 })); sea.position.set((COAST + XR) / 2, SEA_Y, 0); block.add(sea);
    const lake = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.001, ZD * 2), new THREE.MeshLambertMaterial({ color: 0x5f9fcc, transparent: true, opacity: 0.85 })); lake.position.set(LAKE_X, LAKE_Y, 0); block.add(lake);
    // 山上的树、平原上的河（从山脚流到海）
    const trees = new THREE.InstancedMesh(new THREE.ConeGeometry(0.0024, 0.007, 7).translate(0, 0.0035, 0), new THREE.MeshLambertMaterial({ color: 0x3f6f35 }), 60); trees.raycast = () => {}; block.add(trees);
    { const m4 = new THREE.Matrix4(); for (let k = 0; k < 60; k++) { const x = DIVIDE + (rnd() - 0.5) * 0.08, z = (rnd() - 0.5) * ZD * 1.8; m4.makeTranslation(x, ground(x) - 0.0004, z); trees.setMatrixAt(k, m4); } }
    const riverPts = []; for (let i = 0; i <= 40; i++) { const x = DIVIDE + 0.03 + (COAST - DIVIDE - 0.03) * (i / 40); riverPts.push(new THREE.Vector3(x, ground(x) + 0.0008, 0.018 * Math.sin(i * 0.4))); }
    const riverMat = new THREE.MeshBasicMaterial({ color: 0x5a9fd0 }); riverMat.userData.see = true; const river = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(riverPts), 60, 0.0016, 6, false), riverMat); river.raycast = () => {}; block.add(river);          // 河道本来就半埋在地面里
    // 砂田：田面上铺一层砂石（一颗颗小石子）
    const pebbles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0012, 6, 4), new THREE.MeshLambertMaterial({ color: 0x8e8a80 }), 160); pebbles.raycast = () => {}; block.add(pebbles);
    { const m4 = new THREE.Matrix4(); for (let k = 0; k < 160; k++) { const x = FIELD[0] + rnd() * (FIELD[1] - FIELD[0]), z = (rnd() - 0.5) * ZD * 1.9; m4.makeTranslation(x, ground(x) + 0.0004, z); pebbles.setMatrixAt(k, m4); } }
    // 城市：地面硬化时，田上长出一片城区——一栋栋有窗户、有屋顶的楼，沿着河两岸排开，不压在河上
    const facade = canvasTex(64, 64, (g, w) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, w); g.fillStyle = '#e6e2da'; g.fillRect(0, 54, w, 10); g.fillStyle = '#7f93a6'; for (let i = 0; i < 4; i++) g.fillRect(5 + i * 15, 14, 9, 30); g.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 4; i++) g.fillRect(5 + i * 15, 14, 9, 7); }, { repeat: [1, 1] });          // 一层楼：四扇窗（窗上沿一道反光）、一道楼板线
    const riverZ = (x) => 0.018 * Math.sin(((x - DIVIDE - 0.03) / (COAST - DIVIDE - 0.03)) * 40 * 0.4);
    const roofM = new THREE.MeshLambertMaterial({ color: 0x8c8a86 }), BODY = [0xe9e4da, 0xd9d4ca, 0xe3d6c4, 0xcfd4d8];
    const city = new THREE.Group(); block.add(city);
    { const put = []; let tries = 0;
      while (put.length < 10 && tries++ < 400) {
        const w = 0.0055 + rnd() * 0.004, d = w * (0.8 + rnd() * 0.5), floors = 3 + Math.floor(rnd() * 6), hh = floors * 0.0026, x = FIELD[0] + 0.004 + w / 2 + rnd() * (FIELD[1] - FIELD[0] - 0.008 - w), z = -ZD * 0.85 + rnd() * ZD * 1.2;
        if (Math.abs(z - riverZ(x)) < 0.0045 + Math.max(w, d) / 2) continue;          // 离河道远一点
        if (put.some((q) => Math.abs(q.x - x) < (q.w + w) / 2 + 0.002 && Math.abs(q.z - z) < (q.d + d) / 2 + 0.002)) continue;
        put.push({ x, z, w, d });
        const tex = facade.clone(); tex.needsUpdate = true; tex.repeat.set(Math.max(1, Math.round(w / 0.004)), floors); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        const wall = new THREE.MeshLambertMaterial({ color: BODY[put.length % BODY.length], map: tex });
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), [wall, wall, roofM, roofM, wall, wall]); b.position.set(x, ground(x) + hh / 2, z); city.add(b);
        const rim = new THREE.Mesh(new THREE.BoxGeometry(w * 1.04, 0.0006, d * 1.04), new THREE.MeshLambertMaterial({ color: 0xbdb8ae })); rim.position.set(x, ground(x) + hh + 0.0003, z); city.add(rim);          // 屋顶女儿墙
        if (rnd() < 0.6) { const box = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 0.0016, d * 0.3), roofM); box.position.set(x + (rnd() - 0.5) * w * 0.3, ground(x) + hh + 0.0008, z); city.add(box); }          // 屋顶上的水箱、楼梯间
      } }

    // ---- 云：拖着它走（就是风把水汽送到哪儿） ----
    const cloudTex = canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const cloud = new THREE.Group(); block.add(cloud);
    for (let k = 0; k < 14; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, color: new THREE.Color(0.86, 0.88, 0.92), transparent: true, depthWrite: false })); const a = k / 14 * 6.28; s.position.set(Math.cos(a) * 0.018 * rnd(), (rnd() - 0.3) * 0.008, Math.sin(a) * 0.03 * rnd()); const r = 0.018 + rnd() * 0.012; s.scale.set(r, r * 0.75, 1); s.raycast = () => {}; cloud.add(s); }
    cloud.scale.setScalar(1.5);          // 云大一点：一眼看得到雨从哪片云下来
    const cloudPick = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, ZD * 1.6), new THREE.MeshBasicMaterial({ visible: false })); cloudPick.userData.pick = true; cloud.add(cloudPick);
    // 水汽输送：一道细长、微微拱起的箭头，从海面上空指向云（云在陆地上时才画）；身子从尾到头渐渐变粗，上面有一段段亮光往云那边走
    const flowTex = canvasTex(256, 8, (g, w, hh) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,0.4)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.4)'); gr.addColorStop(0.78, 'rgba(255,255,255,1)'); gr.addColorStop(0.86, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0.4)'); g.fillStyle = gr; g.fillRect(0, 0, w, hh); }, { repeat: [1, 1] });
    const windArrow = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0x2a5a9a, map: flowTex, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })); windArrow.raycast = () => {}; block.add(windArrow);
    const windHead = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0x2a5a9a, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })); windHead.raycast = () => {}; block.add(windHead);
    const placeWind = () => {
      const tail = (COAST + XR) / 2, tip = S.cx + 0.03, y = CLOUD_Y - 0.008, HL = 0.009, L = tail - tip, on = cycleOf(S.cx).kind === 'big' && L > HL * 2;
      windArrow.visible = windHead.visible = on; if (!on) return;
      const N = 32, P = [], U = [], I = [];
      for (let k = 0; k <= N; k++) { const t = k / N, x = tail - (L - HL) * t, yy = y + 0.005 * Math.sin(Math.PI * t), hw = 0.0003 + 0.0007 * t; P.push(x, yy + hw, 0, x, yy - hw, 0); U.push((t * (L - HL)) / 0.04, 1, (t * (L - HL)) / 0.04, 0); if (k) I.push(2 * k - 2, 2 * k - 1, 2 * k, 2 * k - 1, 2 * k + 1, 2 * k); }
      windArrow.geometry.dispose(); windArrow.geometry = new THREE.BufferGeometry(); windArrow.geometry.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); windArrow.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); windArrow.geometry.setIndex(I);
      const bx = tip + HL, H = [tip, y, 0, bx + 0.0015, y + 0.0038, 0, bx, y, 0, tip, y, 0, bx, y, 0, bx + 0.0015, y - 0.0038, 0];          // 箭头两翼往后掠
      windHead.geometry.dispose(); windHead.geometry = new THREE.BufferGeometry(); windHead.geometry.setAttribute('position', new THREE.Float32BufferAttribute(H, 3));
    };

    // ---- 一粒粒的水 ----
    const sim = createWater(420, rnd), NP = 420, pos = new Float32Array(NP * 3), col = new Float32Array(NP * 3), P = sim.P;
    const dotTex = canvasTex(32, 32, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const dots = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.04, map: dotTex, vertexColors: true, transparent: true, depthWrite: false })); dots.raycast = () => {}; dots.renderOrder = 9; block.add(dots);
    const CO = { vap: [0.92, 0.95, 1], rain: [0.2, 0.42, 0.78], run: [0.15, 0.45, 0.85], inf: [0.12, 0.3, 0.7], ev: [0.85, 0.9, 1] };
    const stepDots = (dt) => {
      sim.step(dt, S.cx, S.surf);
      for (let k = 0; k < NP; k++) { const p = P[k]; pos.set(p.st === 'off' ? [0, -1, 0] : [p.x, p.y, p.st === 'inf' && p.d > 0.004 ? ZD + 0.0012 : p.z], k * 3); col.set(CO[p.st] || CO.vap, k * 3); }
      pg.attributes.position.needsUpdate = true; pg.attributes.color.needsUpdate = true;
    };

    // ---- 标签 ----
    // ---- 画面里的字：地名写在地面、水面上；过程的名字贴着它发生的地方，发生时亮；剖面上的字写在剖面上 ----
    const gSea = groundLabel(block, '海洋', { x: (COAST + XR) / 2 + 0.01, y: SEA_Y, z: 0.02, h: 0.02, color: '#173a63', opacity: 0.9 });
    const gLake = groundLabel(block, '内陆湖', { x: LAKE_X - 0.008, y: LAKE_Y, z: ZD * 0.45, h: 0.013, color: '#0f2c52', opacity: 0.9 });
    const gField = groundLabel(block, SURF.bare.name.replace(/（.*）/, ''), { x: (FIELD[0] + FIELD[1]) / 2, y: ground((FIELD[0] + FIELD[1]) / 2) + 0.001, z: ZD * 0.86, h: 0.013, color: '#2e2010', opacity: 0.9 });
    faceLabel(block, '地下水面（虚线）', { x: -0.045, y: 0.016, z: ZD, h: 0.008 });
    const fInf = faceLabel(block, '下渗（部分补给地下水）', { x: 0.045, y: 0.024, z: ZD, h: 0.008, opacity: 0, icon: 'seep' });
    const aVap = airLabel(block, '蒸发', { x: COAST + 0.055, y: SEA_Y + 0.035, z: 0.02, h: 0.011, icon: 'vapor' }), aTrans = airLabel(block, '水汽输送', { x: (COAST + XR) / 2, y: CLOUD_Y + 0.006, z: 0, h: 0.011, icon: 'wind' }), aRain = airLabel(block, '降水', { x: 0, y: CLOUD_Y - 0.04, z: 0, h: 0.011, icon: 'rain' });
    const aCyc = airLabel(block, '', { x: 0, y: CLOUD_Y + 0.03, z: 0, h: 0.014, color: '#a8352a', icon: 'cycle' }), aHover = airLabel(block, '', { x: 0, y: 0, z: 0, h: 0.0095, color: '#3a3226', dim: 0 }), aRun = airLabel(block, '地表径流', { x: -0.012, y: ground(-0.012) + 0.012, z: -0.006, h: 0.0105, color: '#1d4f86', dim: 0, icon: 'flow' });
    const tHint = tag('<span>按住云，拖到别处</span><small>三个独立情境，切换时重新开始</small>', 'hint');          // 开场的提示：不用白底牌子，字带一圈纸色柔光
    noteBadge(tag, '教学示意：竖直方向夸大了，各环节的比例是示意').loc(block, XL + 0.012, -0.002, ZD + 0.01);
    const labels = [aVap, aTrans, aRain, aCyc, aHover, aRun];
    const placeTags = () => {
      const cy = cycleOf(S.cx), land = cy.kind === 'land';
      gField.setText(SURF[S.surf].name.replace(/（.*）/, ''));
      const fresh = S.litKind !== cy.kind, d = (k) => (fresh ? k * 0.3 : 0); S.litKind = cy.kind;          // 换了一种循环：新出现的过程按水走的顺序依次亮（蒸发 → 水汽输送 → 降水 → 地表径流）
      aVap.setText(land ? '湖面、地面蒸发' : '蒸发'); aVap.position.set(land ? LAKE_X + 0.02 : XR - 0.008, (land ? LAKE_Y : SEA_Y) + (land ? 0.035 : 0.05), 0.02); aVap.setOn(true, d(0));          // 海上：写在海面右上角，不压在一缕缕上升的水汽里
      aTrans.position.set(((COAST + XR) / 2 + S.cx + 0.03) / 2, CLOUD_Y + 0.008, 0); aTrans.setOn(cy.kind === 'big', d(1)); if (cy.kind !== 'big') aTrans.userData.want = 0;
      aRain.position.set(S.cx + 0.046, CLOUD_Y - 0.035, 0); aRain.setOn(true, d(cy.kind === 'big' ? 2 : 1));          // 写在雨丝的旁边
      aRun.setOn(cy.kind === 'big', d(3));          // 雨下在平原上，才有地表径流流进河里
      fInf.material.opacity = cy.kind !== 'sea' ? 0.9 : 0; fInf.position.x = Math.min(COAST - 0.03, Math.max(XL + 0.04, S.cx + 0.01)); fInf.position.y = ground(fInf.position.x) - 0.013;
      aCyc.setText(cy.name); aCyc.position.set(S.cx, CLOUD_Y + 0.034, 0);
      tHint.loc(block, S.cx, CLOUD_Y + 0.05, 0).show(!S.moved);
    };
    // 鼠标移到地面上：在那儿浮出这块地方的名字（平时不写，免得满屏都是字）
    const hoverName = (x) => (Math.abs(x - DIVIDE) < 0.03 ? '山（分水岭）' : x < DIVIDE ? '内陆盆地' : x < COAST ? '沿海平原' : null);

    // ---- 侧栏：雨水去哪了（这块地方，这次的地面）；海洋进、出 ----
    const drawChart = () => {
      if (!W) return;
      const c = W.chart, g = c.getContext('2d'), w = c.width, hh = c.height, cy = cycleOf(S.cx), sp = rainSplit(S.cx, S.surf);
      g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, hh); g.font = '600 13px "PingFang SC", sans-serif'; g.textBaseline = 'middle'; g.fillStyle = '#3a3226'; g.textAlign = 'left';
      g.fillText(`雨下在这里，水去哪了（${cy.kind === 'sea' ? '海上' : S.cx >= FIELD[0] && S.cx <= FIELD[1] ? SURF[S.surf].name.replace(/（.*）/, '') : S.cx < DIVIDE ? '内陆盆地' : '林地'}）`, 8, 14);
      const parts = [['下渗', sp.inf, '#2f5fa8'], ['地表径流', sp.run, '#5aa6d8'], ['蒸发（蒸腾）', sp.ev, '#a4b9d0'], ['直接入海', sp.sea, '#4f8fc4'], ['直接入湖', sp.lake, '#538d9e']].filter((p) => p[1] > 0.0001);
      let x = 10; for (const [, v, color] of parts) { g.fillStyle = color; g.fillRect(x, 28, (w - 20) * v, 16); x += (w - 20) * v; }
      g.font = '12px "PingFang SC", sans-serif'; parts.forEach(([name, v, color], i) => { const xx = 8 + (i % 2) * 155, yy = 60 + Math.floor(i / 2) * 24; g.fillStyle = color; g.fillRect(xx, yy - 5, 8, 10); g.fillStyle = '#3a3226'; g.fillText(`${name} ${(v * 100).toFixed(1)}%`, xx + 12, yy); });
      const q = sim.S, { transit, error } = sim.balance();
      W.read.innerHTML = `${cy.name}（独立情境）：${cy.text}<br>期初在途水为0；源水体蒸发 ${q.emitted} 粒 = 回海 ${q.cnt.in} + 入湖 ${q.lake} + 土壤暂存 ${q.soil} + 在途 ${transit}（差额 ${error}）<br>海洋收支：收入 ${q.cnt.in}，蒸发支出 ${q.cnt.out}；湖泊累计入水 ${q.lake} 粒。<br><small>上图按实际降雨覆盖范围计算假设比例；每粒水是示意。下渗仅一部分补给地下水，本页假设一半暂存土壤，省略其后续利用、蒸发及真实储水时长。</small>`;
    };
    const drawLog = () => {
      if (!W) return;
      const rows = [], r = (b, t) => rows.push(h('div', { class: 'tl-row' }, h('b', {}, b), h('span', {}, t)));
      for (const k of ['big', 'sea', 'land']) if (S.seen.has(k)) { const c = cycleOf(k === 'big' ? 0.03 : k === 'sea' ? 0.12 : -0.12); r(`${c.name}：`, c.text); }
      for (const k of KEYS) if (S.surfSeen.has(k)) { const s2 = SURF[k]; r(`${s2.name.replace(/（.*）/, '')}：`, `下渗 ${Math.round(s2.inf * 100)}%，地表径流 ${Math.round(s2.run * 100)}%，蒸发 ${Math.round(s2.ev * 100)}%`); }
      if (S.guess != null && S.surfSeen.has('sand')) rows.push(h('div', { class: 'tl-row' }, h('small', {}, `你猜：${ASK[1][S.guess]}　实际：下渗得更多，蒸发更少（砂石盖着，水不容易跑掉）`)));
      W.log.replaceChildren(...rows);
      if (S.seen.size === 3 && S.surfSeen.size >= 2) W.ui.unlock();
    };
    const note1 = () => { const cy = cycleOf(S.cx);

      if (S.moved && !S.seen.has(cy.kind)) { S.seen.add(cy.kind); W?.ui.status(`<b>${cy.name}</b>：${cy.text}。`); drawLog(); } if (S.cx >= FIELD[0] && S.cx <= FIELD[1] && S.moved && !S.surfSeen.has(S.surf)) { S.surfSeen.add(S.surf); drawLog(); } };
    const layout = () => { cloud.position.set(S.cx, CLOUD_Y, 0); placeWind(); placeTags(); drawChart(); city.visible = S.surf === 'paved'; pebbles.visible = S.surf === 'sand'; };

    // ---- 拖云 ----
    const plane = new THREE.Plane(), hit = new THREE.Vector3(), wq = new THREE.Vector3(); let dx0 = 0;
    const onY = (ray) => { block.updateMatrixWorld(); block.localToWorld(wq.set(0, CLOUD_Y, 0)); plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1).applyQuaternion(block.getWorldQuaternion(new THREE.Quaternion())), wq); if (!ray.intersectPlane(plane, hit)) return null; return block.worldToLocal(hit.clone()); };
    const pointer = {
      down(rc) { if (!rc.intersectObject(cloudPick, false).length) return false; const p = onY(rc.ray); dx0 = p ? p.x - S.cx : 0; S.drag = true; document.getElementById('c').style.cursor = 'grabbing'; return true; },
      move(rc) {
        const c = document.getElementById('c');
        if (!S.drag) { if (c) c.style.cursor = rc.intersectObject(cloudPick, false).length ? 'grab' : ''; const ht = rc.intersectObject(topMesh, false)[0], nm = ht && hoverName(block.worldToLocal(ht.point.clone()).x); if (nm) { const l = block.worldToLocal(ht.point.clone()); aHover.setText(nm); aHover.position.set(l.x, l.y + 0.012, l.z); aHover.userData.want = 1; } else aHover.userData.want = 0; return false; }
        const p = onY(rc.ray); if (!p) return true; S.cx = Math.max(XL + 0.03, Math.min(XR - 0.03, p.x - dx0)); S.moved = true; sim.reset(); stepDots(0); note1(); layout(); return true;
      },
      up() { if (!S.drag) return false; S.drag = false; document.getElementById('c').style.cursor = ''; note1(); return true; },
    };

    paintSide(); shapeTop(); layout();

    return {
      group,
      card: false,
      emerge: 'flat',          // 课本的图平放在书页上，模型从它上面长出来、它慢慢淡掉
      size: { w: 0.38, d: 0.14, h: 0.13 },
      view: { elev: 18, azim: 14, lookY: 0.45, frameMargin: 1.08 },
      pointer,
      mount(ui) {
        const surfSeg = seg('平原上那块田的地面', KEYS.map((k) => SURF[k].name.replace(/（.*）/, '')), (_, i) => { S.surf = KEYS[i]; sim.reset(); stepDots(0); shapeTop(); layout(); note1(); }, { value: 0 });
        const guess = seg(...ASK, (_, i) => { S.guess = i; drawLog(); }, { value: -1 });
        const acts = buttons([{ text: '重来', ghost: true, onClick: () => { ui.relock?.(); S.cx = 0.03; S.surf = 'bare'; S.seen.clear(); S.surfSeen.clear(); S.guess = null; S.moved = false; surfSeg.set(0); guess.set(-1); sim.reset(); stepDots(0); shapeTop(); layout(); drawLog(); ui.status('海面一直在蒸发。按住<b>云</b>拖到别处，看雨下在海上、平原、山那边，水各往哪走。'); } }]);
        const chart = h('canvas', { class: 'wx-map', width: 320, height: 130 }), read = h('div', { class: 'read-out' }), log = h('div', { class: 'timeline' });
        ui.controls.append(h('div', { class: 'bar-title' }, '水去哪了'), chart, read, surfSeg.el, guess.el, acts.el, note('拖云选择三个独立情境，移动或换地面会重置水粒和账本。陆地内循环也可发生在外流区域。白色是水汽，蓝色是雨水和径流。'));
        ui.data.append(h('div', { class: 'bar-title' }, '你看到了什么'), log);
        W = { ui, chart, read, log };
        ui.status('海面一直在蒸发。按住<b>云</b>拖到别处，看雨下在海上、平原、山那边，水各往哪走。');
        layout(); drawLog();
      },
      update(dt) { labels.forEach((l) => l.tick(dt)); flowTex.offset.x -= dt * 0.5; stepDots(Math.min(dt, 0.05)); if (W) drawChart(); },
    };
  },
};
