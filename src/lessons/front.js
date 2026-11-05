// 高中地理 选择性必修1 第三章第一节 常见天气系统 · 锋与天气（课本第 42–44 页，图 3.2 锋的形成、图 3.3 冷锋、图 3.4 暖锋）。
//
// 课本的图就是模型（讲同一件事，不还原插图）：一块从地上切下来的地块，浮在书页上方；上面是冷、暖两种气团，交界面是锋面。
// 核心：“你家”。地块上有你家和一座邻城，都可以拖到别处。学生按住后面的气团往前推，锋面一路扫过来，
// 你家的天气跟着变，旁边的时间线记下你家依次经历了什么。冷锋、暖锋各推一次，两条时间线一比：
//   冷锋——锋线到了才大风、降温、下雨，过后转晴；暖锋——锋线还没到就开始连续下雨（地面还冷），锋线过后才变暖。
// 同一时刻，邻城和你家的天气不一样：看的是各自离锋线多远、在哪一侧。
// 准静止锋：冷空气被一道山挡住，锋线停在山脚几乎不动，冷空气一侧阴雨连绵（课本第 44 页昆明准静止锋：贵阳阴雨、昆明晴），时间一天天过去。
// 点一下你家：镜头落到你家地面上，抬头看锋面压过来。右边小图是从上往下看的天气图，和地块同步。
// 开头的问题只是轻轻问一句，点不点都行，不挡路、不判对错（这是一件作品，不是一套题）。
// 教学示意：竖直方向夸大了（真实锋面很平缓，冷锋通常比暖锋陡）；雨区画的是课本图 3.3、3.4 的情形
// （冷锋降水主要在锋后、紧挨锋线；暖锋降水在锋前、范围宽）。实际的锋，降水也可能在别的位置，或者没有降水。
import * as THREE from 'three';
import { seg, buttons, note } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { h } from '../ui/Panel.js';

const LIFT = 0.05;                      // 整块地浮在书页上方多高
const G = 0.022;                        // 地面顶面（地块有厚度，侧面露出土层）
const XL = -0.17, XR = 0.17, ZD = 0.062;
// 两种锋：锋面的形状 h(s) = H·(1 − e^(−s/λ))，s 是从锋线往冷空气那边量的距离。冷锋陡，冷空气在后面（锋线左边）；暖锋缓，冷空气在前面（右边）
const KIND = {
  cold: { H: 0.11, L: 0.1, side: -1, x0: -0.07, x1: 0.165, rain: [0, 0.045], name: '冷锋' },
  warm: { H: 0.07, L: 0.2, side: 1, x0: -0.15, x1: 0.165, rain: [0, 0.095], name: '暖锋' },
  still: { H: 0.06, L: 0.2, side: -1, x0: -0.1, x1: 0.03, rain: [0, 0.11], name: '准静止锋' },          // 冷空气在左边，被山（x = 0.03 往右）挡住；暖空气从右边沿锋面慢慢爬到冷空气上面
};
const MX = 0.03;                        // 山脚（准静止锋停在这里）
const HOME0 = { cold: [0.05, 0.13], warm: [0.05, 0.13], still: [-0.035, 0.1] };          // 你家、邻城一开始在哪（准静止锋：你家在冷空气一侧，像贵阳；邻城在山那边，像昆明）
const ASK = {
  cold: ['先猜一下（可以不猜）：在这个情境里，冷锋来了，你家会——', ['先降温', '先下雨', '差不多一起']],
  warm: ['先猜一下（可以不猜）：在这个情境里，暖锋来了，你家会——', ['先变暖', '先下雨', '差不多一起']],
  still: ['先猜一下（可以不猜）：在这个情境里，冷空气被山挡住了，你家会——', ['很快放晴', '连着下好几天', '一直不下雨']],
};
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** 某地离锋线 d（正数＝在锋线前面，锋还没到）时的天气（教学示意，按课本图 3.3、3.4） */
export function weatherAt(kind, d) {
  if (kind === 'cold') {
    if (d > 0.065) return { k: 'w0', text: '晴，较暖', s: '晴暖' };
    if (d > 0) return { k: 'w1', text: '云变厚，风渐大', s: '云厚风起' };
    if (d >= -0.045) return { k: 'w2', text: '大风、降温、下雨', s: '大风降温下雨' };
    return { k: 'w3', text: '转晴，较冷，气压升高', s: '转晴变冷' };
  }
  if (kind === 'still') {
    if (d >= 0) return { k: 'w0', text: '晴，较暖', s: '晴' };
    if (d >= -0.11) return { k: 'w2', text: '阴雨连绵', s: '阴雨连绵' };
    return { k: 'w1', text: '阴，较冷', s: '阴冷' };
  }
  if (d > 0.14) return { k: 'w0', text: '晴，较冷', s: '晴冷' };
  if (d > 0.095) return { k: 'w1', text: '云一层层变厚', s: '云渐厚' };
  if (d >= 0) return { k: 'w2', text: '锋线还没到，已经连续下雨，地面还冷', s: '连续下雨（地面还冷）' };
  return { k: 'w3', text: '雨停，变暖，气压降低', s: '雨停变暖' };
}

export default {
  id: 'front',
  fig: '图3.2',
  title: '锋与天气',
  flow: 'explore',
  ask: '天气预报说“冷空气明天到”。冷空气来的时候，你家的天气会怎么变？',
  need: '冷锋、暖锋各推过你家一次，比一比你家的天气是按什么顺序变的（准静止锋可以再看看）',
  conclusion: {
    page: 47,
    quote: '冷锋是冷气团主动向暖气团移动的锋。冷气团的前缘插入暖气团下面，使暖气团被迫抬升（图3.3）。……当冷锋过境时，常出现较大的风，云层增厚，并出现雨、雪天气。冷锋过境后，冷气团占据原来暖气团的位置，气温下降，气压上升，天气转晴。暖锋是暖气团主动向冷气团移动的锋。暖气团沿冷气团徐徐爬升，冷却凝结产生云、雨（图3.4）。当暖锋过境时，云层加厚，多形成连续性降水。暖锋过境后，暖气团占据原来冷气团的位置，气温升高，气压降低，天气转晴。……准静止锋是冷、暖气团势均力敌，或遇地形阻挡，移动缓慢或很少移动的锋。准静止锋会带来阴雨连绵的天气。',
    why: '两种锋都是暖湿空气沿锋面被抬升、冷却，达到饱和后成云；具备降水条件时形成降水。冷锋的锋面陡，云雨集中在锋线附近，本图降水主要在锋后：锋线一到，大风、降温、下雨几乎一起来，过后转晴。暖锋的锋面缓，暖空气爬升的范围很宽，雨下在锋前：锋线还没到就开始连续下雨，地面还是冷的，锋线过后才变暖。准静止锋几乎不动，暖空气一直沿锋面爬升，冷空气那一侧就阴雨连绵好些天（本图是地形阻挡的情形；冷暖气团势均力敌也能形成）。实际的锋，降水也可能在别的位置，或者没有降水。',
    src: '课本第 43–44 页 · 第三章 第一节 常见天气系统',
  },

  create({ tag, look, back, reframe }) {
    const group = new THREE.Group();
    const S = { kind: 'cold', xf: KIND.cold.x0, rise: 0, real: 0, going: false, hintFor: null, drag: null, moved: false, t: 0, home: 0.05, town: 0.13, logs: { cold: [], warm: [], still: [] }, done: new Set(), guess: {}, days: 0, dived: false };
    let W = null;
    const K = () => KIND[S.kind];
    const front = (s) => K().H * (1 - Math.exp(-Math.max(0, s) / K().L));
    const LINE = new THREE.LineBasicMaterial({ color: 0x2a3140, transparent: true, opacity: 0.9 });
    const lit = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1, roughness: 0.9, metalness: 0, ...o });
    const edges = (m, ang = 25) => { const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, ang), LINE); e.raycast = () => {}; m.add(e); return m; };
    const block = new THREE.Group(); block.position.y = LIFT; group.add(block);          // 浮起来的那一整块

    // ---- 书页上的影子（地块浮在上面） ----
    const shadowTex = canvasTex(256, 128, (g, w, hh) => { const gr = g.createRadialGradient(w / 2, hh / 2, 0, w / 2, hh / 2, w / 2); gr.addColorStop(0, 'rgba(60,45,30,0.5)'); gr.addColorStop(0.6, 'rgba(60,45,30,0.2)'); gr.addColorStop(1, 'rgba(60,45,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, hh); });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry((XR - XL) * 1.25, ZD * 2 * 1.9), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.0006; shadow.raycast = () => {}; group.add(shadow);
    // 镜头取景用：整块地加上云长到最高的范围（看不见）
    const frameBox = new THREE.Mesh(new THREE.BoxGeometry(XR - XL + 0.04, 0.17, ZD * 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    frameBox.position.y = LIFT + 0.085; frameBox.raycast = () => {}; group.add(frameBox);

    // ---- 地块：草地 + 三层土 ----
    const groundMat = lit(0x9cc98a);
    const ground = edges(new THREE.Mesh(new THREE.BoxGeometry(XR - XL, 0.004, ZD * 2), groundMat)); ground.position.y = G - 0.002; block.add(ground);
    let yy = G - 0.004;
    for (const [c, t] of [[0xa07a52, 0.006], [0xb8915f, 0.006], [0xc9a877, G - 0.016]]) { const m = edges(new THREE.Mesh(new THREE.BoxGeometry(XR - XL, t, ZD * 2), lit(c))); m.position.y = yy - t / 2; yy -= t; block.add(m); }
    const fields = canvasTex(1024, 380, (g, w, hh) => {
      g.fillStyle = '#86b06a'; g.fillRect(0, 0, w, hh);
      const cols = ['#8fbb6e', '#7aa65c', '#9fc277', '#78a35a'];
      g.globalAlpha = 0.4; for (let i = 0; i < 30; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect((i * 131) % w, (i * 67) % hh, 120 + ((i * 37) % 90), 70 + ((i * 29) % 60)); }
      g.globalAlpha = 1; for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(40,70,30,${Math.random() * 0.1})`; g.fillRect(Math.random() * w, Math.random() * hh, 2, 2); }
    });
    const fieldMat = new THREE.MeshStandardMaterial({ map: fields, roughness: 1, transparent: true, opacity: 0 });
    const field = new THREE.Mesh(new THREE.PlaneGeometry(XR - XL, ZD * 2), fieldMat); field.rotation.x = -Math.PI / 2; field.position.y = G + 0.0002; block.add(field);
    // 山（准静止锋用）：一道横在地块上的山脊，挡住从左边来的冷空气
    const ridgeShape = new THREE.Shape(); ridgeShape.moveTo(0, 0); ridgeShape.lineTo(0.012, 0.026); ridgeShape.lineTo(0.02, 0.03); ridgeShape.lineTo(0.034, 0.018); ridgeShape.lineTo(0.05, 0); ridgeShape.closePath();
    const ridgeGeo = new THREE.ExtrudeGeometry(ridgeShape, { depth: ZD * 2, bevelEnabled: false }); ridgeGeo.translate(0, 0, -ZD);
    const ridge = edges(new THREE.Mesh(ridgeGeo, lit(0x7f9a5c)), 30); ridge.position.set(MX, G, 0); block.add(ridge);

    // ---- 锋面和冷空气（锋面下面那一块） ----
    const NS = 48;
    const frontGeo = new THREE.PlaneGeometry(1, 1, NS, 2);
    const frontMat = lit(0xf2a35e, { transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
    const frontMesh = new THREE.Mesh(frontGeo, frontMat); frontMesh.renderOrder = 6; block.add(frontMesh);
    const frontEdge = new THREE.LineSegments(new THREE.BufferGeometry(), LINE); block.add(frontEdge);
    const coldGeo = new THREE.BufferGeometry(), coldMat = lit(0x6f9fd6, { transparent: true, opacity: 0.24, depthWrite: false, side: THREE.DoubleSide });
    const cold = new THREE.Mesh(coldGeo, coldMat); cold.renderOrder = 5; block.add(cold);
    const run = () => (K().side < 0 ? S.xf - XL : XR - S.xf);          // 锋面往冷空气那边伸多远（到地块边上）
    const xAt = (s) => S.xf + K().side * s;
    const hAt = (s) => G + front(s) * S.rise;
    const shapeFront = () => {
      const R = run(), pos = frontGeo.attributes.position;
      for (let j = 0; j <= 2; j++) for (let i = 0; i <= NS; i++) { const s = (i / NS) * R; pos.setXYZ(j * (NS + 1) + i, xAt(s), hAt(s), -ZD + j * ZD); }
      pos.needsUpdate = true; frontGeo.computeVertexNormals(); frontGeo.computeBoundingSphere();
      const L = [];
      for (const z of [-ZD, ZD]) for (let i = 0; i < NS; i++) { const a = (i / NS) * R, b = ((i + 1) / NS) * R; L.push(xAt(a), hAt(a), z, xAt(b), hAt(b), z); }
      L.push(xAt(R), hAt(R), -ZD, xAt(R), hAt(R), ZD, S.xf, G, -ZD, S.xf, G, ZD);
      frontEdge.geometry.dispose(); frontEdge.geometry = new THREE.BufferGeometry(); frontEdge.geometry.setAttribute('position', new THREE.Float32BufferAttribute(L, 3));
      const P = [], quad = (a, b, c, d) => P.push(...a, ...b, ...c, ...a, ...c, ...d);
      for (let i = 0; i < NS; i++) { const a = (i / NS) * R, b = ((i + 1) / NS) * R; for (const z of [-ZD, ZD]) quad([xAt(a), G, z], [xAt(b), G, z], [xAt(b), hAt(b), z], [xAt(a), hAt(a), z]); }
      const xe = xAt(R); quad([xe, G, -ZD], [xe, G, ZD], [xe, hAt(R), ZD], [xe, hAt(R), -ZD]);
      coldGeo.dispose(); coldGeo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); coldGeo.computeVertexNormals();
    };

    // ---- 推的那团空气：锋线后面（左边）。冷锋推冷气团，暖锋推暖气团 ----
    const arrow = (color, len) => {
      const g = new THREE.Group(), m = lit(color);
      const shaft = edges(new THREE.Mesh(new THREE.BoxGeometry(len, 0.006, 0.012), m)); shaft.position.x = len / 2; g.add(shaft);
      const headGeo = new THREE.ConeGeometry(0.012, 0.022, 3); headGeo.rotateZ(-Math.PI / 2); headGeo.rotateX(Math.PI / 6);
      const head = edges(new THREE.Mesh(headGeo, m)); head.position.x = len + 0.01; g.add(head);
      g.userData.mat = m; return g;
    };
    const pushArrow = arrow(0x2f7f6f, 0.05); block.add(pushArrow);
    const grab = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, ZD * 2), new THREE.MeshBasicMaterial({ visible: false })); grab.userData.pick = true; block.add(grab);

    // ---- 被抬升的暖空气：一节节流动的箭头，贴着锋面往上爬（越高越冷，颜色从橙变白） ----
    const flowTex = canvasTex(256, 64, (g, w, hh) => { for (let x = 0; x < w; x += 64) { g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.moveTo(x + 8, 10); g.lineTo(x + 34, 10); g.lineTo(x + 54, hh / 2); g.lineTo(x + 34, hh - 10); g.lineTo(x + 8, hh - 10); g.lineTo(x + 28, hh / 2); g.closePath(); g.fill(); } });
    flowTex.wrapS = THREE.RepeatWrapping;
    const flows = [-0.04, 0.0, 0.04].map((z, i) => { const m = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ map: flowTex, transparent: true, depthWrite: false, vertexColors: true, side: THREE.DoubleSide, opacity: i === 1 ? 1 : 0.45 })); m.renderOrder = 7; m.userData = { z }; block.add(m); return m; });
    const warmC = new THREE.Color(0xf07a2c), coolC = new THREE.Color(0xffffff);
    const shapeFlows = () => {
      const k = K();
      for (const m of flows) {
        const { z } = m.userData, pts = [];
        // 冷锋：暖空气在前面（右边），往左流到锋线，再贴着锋面往左上爬；暖锋：暖空气在后面（左边），往右流到锋线，再贴着锋面往右上爬
        const start = k.side < 0 ? Math.min(0.12, XR - 0.004 - S.xf) : Math.min(0.12, S.xf - XL - 0.004);          // 暖空气那一侧离地块边多远
        for (let i = 0; i <= 30; i++) pts.push([S.xf - k.side * start * (1 - i / 30), G + 0.008]);          // 从暖空气一侧贴地流到锋线（冷锋从右往左，暖锋从左往右）
        const climb = Math.min(k.side < 0 ? 0.1 : 0.16, run() - 0.004);
        for (let i = 1; i <= 50; i++) { const sv = (i / 50) * climb; pts.push([xAt(sv), hAt(sv) + 0.011]); }
        const P = [], C = [], U = [], I = [], wd = 0.0105; let acc = 0;
        pts.forEach(([x, y], q) => {
          if (q) acc += Math.hypot(x - pts[q - 1][0], y - pts[q - 1][1]);
          P.push(x, y, z - wd, x, y, z + wd); U.push(acc * 8, 0, acc * 8, 1);
          const c = warmC.clone().lerp(coolC, smooth(0.015, 0.06, y - G)); C.push(c.r, c.g, c.b, c.r, c.g, c.b);
          if (q) { const a = (q - 1) * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        });
        m.geometry.dispose(); m.geometry = new THREE.BufferGeometry();
        m.geometry.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); m.geometry.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); m.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); m.geometry.setIndex(I);
      }
    };

    // ---- 云：冷锋是锋线附近的一座云塔（本例暖空气湿润）；暖锋是锋前一大片一层层的云 ----
    const cloudTex = canvasTex(256, 256, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.85)'); gr.addColorStop(0.75, 'rgba(255,255,255,0.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.globalAlpha = 0.55; g.fillStyle = gr; g.fillRect(0, 0, w, w);
      // 花菜状的边：一圈软的小团叠在边上（不挖洞，挖洞看着像肥皂泡）
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, r = w * 0.27, cx = w / 2 + Math.cos(a) * r, cy = w / 2 + Math.sin(a) * r * 0.85, rr = w * (0.13 + 0.05 * ((i * 7) % 3) / 2);
        const gg = g.createRadialGradient(cx, cy, 0, cx, cy, rr); gg.addColorStop(0, 'rgba(255,255,255,0.9)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gg; g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.fill(); }
    });
    const puffs = Array.from({ length: 110 }, () => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false })); m.renderOrder = 8; m.raycast = () => {}; m.userData.seed = [rnd(), rnd(), rnd(), rnd()]; block.add(m); return m; });
    const placeClouds = () => {
      for (const m of puffs) {
        const [a, b, c, d] = m.userData.seed;
        let s, y, r, sx = 1, sy = 1, shade;
        if (S.kind === 'cold') {
          s = -0.014 + Math.pow(a, 1.3) * 0.055; const base = Math.max(0.026, front(s) * S.rise + 0.004), hgt = 0.075 * Math.exp(-Math.abs(s - 0.004) / 0.03), q = Math.pow(b, 0.8);
          y = base + q * hgt; r = 0.013 + c * 0.01; if (q > 0.82) { r *= 1.5; s -= 0.04 * d; } shade = 0.6 + 0.32 * Math.min(1, q * 1.25);
        } else {          // 暖锋、准静止锋：锋面缓，云一层层铺开
          s = Math.pow(a, 0.9) * (S.kind === 'still' ? 0.13 : 0.15); const base = front(s) * S.rise + 0.006;
          y = base + b * (0.012 + 0.025 * (1 - s / 0.15)); r = 0.012 + c * 0.008; sx = 2.2; sy = 0.9; shade = 0.62 + 0.3 * b;          // 一层层铺开的层状云
        }
        const x = xAt(s); m.visible = x > XL + 0.004 && x < XR - 0.004;          // 云和雨都只在这块地上方
        m.position.set(x, G + y, -ZD * 0.85 + d * ZD * 1.7);
        m.scale.set(r * 2 * sx, r * 2 * sy, 1); m.material.color.setRGB(shade, shade, shade * 1.02); m.material.opacity = 0.8 * S.rise;
      }
    };

    // ---- 雨：从云底落下，穿过锋面落进下面的冷空气，一直到地面 ----
    const NR = 520, rainPos = new Float32Array(NR * 6), rainSeed = Array.from({ length: NR }, () => [rnd(), rnd(), rnd()]);
    const rain = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x4f6f98, transparent: true, opacity: 0.85 }));
    rain.geometry.setAttribute('position', new THREE.BufferAttribute(rainPos, 3)); rain.raycast = () => {}; block.add(rain);
    const placeRain = () => {
      const [r0, r1] = K().rain; rain.material.opacity = 0.85 * S.rise;
      for (let i = 0; i < NR; i++) {
        const [a, b, c] = rainSeed[i], sv = r0 + 0.002 + a * (r1 - r0), x = xAt(sv), top = Math.max(0.024, front(sv) * S.rise + 0.004), y = G + top - (((c + S.t * 1.1) % 1) * top), y2 = x > XL + 0.002 && x < XR - 0.002 ? Math.max(G, y - 0.008) : y;          // 出了地块的雨不画
        rainPos.set([x, y, -ZD * 0.85 + b * ZD * 1.7, x - 0.0015 * (y - y2) / 0.008, y2, -ZD * 0.85 + b * ZD * 1.7], i * 6);
      }
      rain.geometry.attributes.position.needsUpdate = true;
    };

    // ---- 锋的符号（天气图上的画法）：冷锋蓝三角、暖锋红半圆，都朝前进方向 ----
    const sym = new THREE.Group(); block.add(sym);
    const triGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -0.005), new THREE.Vector3(0, 0, 0.005), new THREE.Vector3(0.008, 0, 0)]); triGeo.setIndex([0, 1, 2]);
    const semiGeo = new THREE.CircleGeometry(0.0055, 16, -Math.PI / 2, Math.PI); semiGeo.rotateX(-Math.PI / 2);
    const symMat = new THREE.MeshBasicMaterial({ color: 0x2a62b8, side: THREE.DoubleSide });
    const redMat = new THREE.MeshBasicMaterial({ color: 0xc8402e, side: THREE.DoubleSide });
    const drawSym = () => {          // 准静止锋：蓝三角朝暖空气、红半圆朝冷空气，交替画在锋线两边
      sym.clear(); symMat.color.set(S.kind === 'warm' ? 0xc8402e : 0x2a62b8);
      let n = 0;
      for (let z = -ZD + 0.012; z < ZD - 0.005; z += 0.024, n++) {
        const semi = S.kind === 'warm' || (S.kind === 'still' && n % 2);
        const t = new THREE.Mesh(semi ? semiGeo : triGeo, S.kind === 'still' && semi ? redMat : symMat); t.position.set(0, 0.0003, z);
        if (S.kind === 'still' && semi) t.rotation.y = Math.PI;
        sym.add(t);
      }
      sym.add(new THREE.Mesh(new THREE.BoxGeometry(0.0015, 0.0004, ZD * 2), symMat));
    };

    // ---- 你家、邻城：几栋小房子（你家红顶、插一面小旗），都可以拖 ----
    const makeTown = (roof, flag) => {
      const t = new THREE.Group();
      for (const [x, z, w, hh] of [[-0.006, -0.004, 0.007, 0.006], [0.004, 0.003, 0.008, 0.008], [0.0, -0.012, 0.006, 0.005], [0.009, -0.008, 0.005, 0.004]]) {
        const body = edges(new THREE.Mesh(new THREE.BoxGeometry(w, hh, w), lit(0xf3ede1))); body.position.set(x, hh / 2, z); t.add(body);
        const rg = new THREE.ConeGeometry(w * 0.78, 0.004, 4); rg.rotateY(Math.PI / 4); const r = edges(new THREE.Mesh(rg, lit(roof))); r.position.set(x, hh + 0.002, z); t.add(r);
      }
      if (flag) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.0004, 0.0004, 0.016, 6), lit(0x666a72)); pole.position.set(-0.012, 0.008, 0.006); t.add(pole); const f = new THREE.Mesh(new THREE.PlaneGeometry(0.006, 0.004), lit(0xd8392b, { side: THREE.DoubleSide })); f.position.set(-0.009, 0.014, 0.006); t.add(f); }
      const pick = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.024, 0.026), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 0.01; pick.userData.pick = true; t.add(pick);
      t.userData.pick = pick; block.add(t); return t;
    };
    const home = makeTown(0xc7503c, true), town = makeTown(0x8a93a3, false);
    const homeTag = tag('', 'pill', () => dive()), townTag = tag('', 'pill');          // 点你家头顶的牌子也能落到地上看

    // ---- 标签 ----
    const tCold = tag('冷气团', 'pill'), tWarm = tag('暖气团', 'pill'), tFront = tag('锋面', 'pill'), tHint = tag('', 'pill'), tScale = tag('教学示意 · 竖直方向夸大了 · 本例水汽充足', 'pill');

    // ---- 线稿 → 真实：头一次推的时候，一秒内铺开 ----
    const setReal = () => {
      const r = S.real;
      for (const m of [groundMat, frontMat, coldMat]) m.emissiveIntensity = 1 - 0.82 * r;
      LINE.opacity = 0.9 - 0.6 * r; frontMat.opacity = 0.8 - 0.5 * r; coldMat.opacity = 0.24 + 0.08 * r;
      fieldMat.opacity = Math.min(1, r * 1.4); field.scale.x = Math.max(0.001, smooth(0, 0.85, r)); field.position.x = XL + (XR - XL) * field.scale.x / 2;
    };

    // ---- 你家的天气、时间线 ----
    const record = () => {
      const w = weatherAt(S.kind, S.home - S.xf), log = S.logs[S.kind];
      if (!log.length || w.k > log[log.length - 1].k) log.push(w);          // 锋面往前扫，你家依次经历的天气（往回拖不倒着记）
      if (log.length === 4) S.done.add(S.kind);
      drawLogs();
    };
    const truth = (k) => k === 'cold' ? '锋线一到，降温和下雨差不多一起来' : k === 'warm' ? '先下雨：锋线没到就下起来，锋线过后才变暖'
      : S.stillSnap?.rain ? '连着下好几天：锋停着不走，雨也不走' : '你家不在雨区，一直没下雨';
    const drawLogs = () => {
      if (!W) return;
      W.logs.replaceChildren(...['cold', 'warm', 'still'].map((k) => {
        const log = S.logs[k], fin = k === 'still' ? (S.stillSnap?.days ?? 0) >= 3 : log.length === 4;
        const snap = S.stillSnap, line = k === 'still' ? (snap ? `锋停在山脚，你家${snap.text}，已经 ${snap.days} 天（示意，时间加快了）` : '还没推过')          // 用当时记下的，不拿现在的位置重算
          : log.length > 1 ? log.map((x) => x.s).join(' → ') : '还没推过';
        const g = S.guess[k] != null ? ASK[k][1][S.guess[k]] : null;
        return h('div', { class: 'tl-row' }, h('b', {}, k === 'still' ? '准静止锋：' : `${KIND[k].name}过你家：`), h('span', {}, line),
          fin ? h('small', {}, g ? `你猜：${g}　实际：${truth(k)}` : `实际：${truth(k)}`) : null);          // 不判对错：猜的和实际的并排放着
      }));
      if (S.done.has('cold') && S.done.has('warm')) W.ui.unlock();
      drawMap();
    };

    // ---- 从上往下看（天气图）：和地块同步——锋线和符号、雨区、冷暖空气、山、你家和邻城 ----
    const drawMap = () => {
      if (!W) return;
      const c = W.map, g = c.getContext('2d'), w = c.width, hh = c.height, px = (x) => ((x - XL) / (XR - XL)) * (w - 20) + 10, k = K(), fx = px(S.xf);
      g.clearRect(0, 0, w, hh);
      g.fillStyle = '#eef3e6'; g.fillRect(10, 10, w - 20, hh - 20);
      const coldL = k.side < 0 ? 10 : fx, coldR = k.side < 0 ? fx : w - 10;
      g.fillStyle = 'rgba(111,159,214,0.28)'; g.fillRect(coldL, 10, coldR - coldL, hh - 20);
      g.fillStyle = 'rgba(242,163,94,0.25)'; g.fillRect(k.side < 0 ? fx : 10, 10, k.side < 0 ? w - 10 - fx : fx - 10, hh - 20);
      const [r0, r1] = k.rain, ra = px(S.xf + k.side * r0), rb = px(S.xf + k.side * r1);
      const rl = Math.max(10, Math.min(ra, rb)), rr = Math.min(w - 10, Math.max(ra, rb));          // 雨区只画在地图的地块里
      g.save(); g.beginPath(); g.rect(rl, 10, Math.max(0, rr - rl), hh - 20); g.clip();
      g.strokeStyle = 'rgba(60,90,140,0.55)'; g.lineWidth = 1.2; for (let x = -hh; x < w; x += 6) { g.beginPath(); g.moveTo(x, hh); g.lineTo(x + hh * 0.5, 0); g.stroke(); } g.restore();          // 雨区：斜线
      if (S.kind === 'still') { g.fillStyle = '#8a7a52'; for (let y = 14; y < hh - 12; y += 10) { g.beginPath(); g.moveTo(px(MX + 0.012), y + 8); g.lineTo(px(MX + 0.025), y); g.lineTo(px(MX + 0.038), y + 8); g.fill(); } }          // 山
      g.strokeStyle = S.kind === 'warm' ? '#c8402e' : '#2a62b8'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(fx, 10); g.lineTo(fx, hh - 10); g.stroke();
      for (let y = 18, n = 0; y < hh - 12; y += 16, n++) {
        const semi = S.kind === 'warm' || (S.kind === 'still' && n % 2), dir = S.kind === 'still' && semi ? -1 : 1;
        g.fillStyle = semi && S.kind !== 'cold' ? '#c8402e' : '#2a62b8'; g.beginPath();
        if (semi) g.arc(fx, y, 5, -Math.PI / 2, Math.PI / 2, dir < 0); else { g.moveTo(fx, y - 5); g.lineTo(fx + 8, y); g.lineTo(fx, y + 5); }
        g.fill();
      }
      const dot = (x, label, col) => { const X = px(x), Y = label === '你家' ? hh * 0.62 : hh * 0.36; g.fillStyle = col; g.beginPath(); g.arc(X, Y, 4.5, 0, 7); g.fill(); g.fillStyle = '#23293a'; g.font = '12px sans-serif'; g.textAlign = 'center'; g.fillText(label, X, Y - 8); };
      dot(S.home, '你家', '#c7503c'); dot(S.town, '邻城', '#6b7280');
      g.strokeStyle = 'rgba(35,41,58,0.5)'; g.lineWidth = 1; g.strokeRect(10, 10, w - 20, hh - 20);
    };

    const layout = () => {
      const k = K();
      shapeFront(); shapeFlows(); placeClouds(); placeRain();
      const ac = S.kind === 'warm' ? 0xd9662f : 0x2f7f6f; pushArrow.userData.mat.color.set(ac); pushArrow.userData.mat.emissive.set(ac);          // 冷锋、准静止锋推冷气团；暖锋推暖气团
      pushArrow.position.set(Math.max(XL + 0.012, S.xf - 0.12), G + 0.004, 0.035);
      grab.position.set(S.xf - 0.07, G + 0.03, 0);
      sym.position.set(S.xf, G, 0); sym.visible = S.rise > 0.5; ridge.visible = S.kind === 'still';
      home.position.set(S.home, G, 0.03); town.position.set(S.town, G, -0.025);
      const wHome = weatherAt(S.kind, S.home - S.xf), stuck = S.kind === 'still' && S.days >= 1 && wHome.k === 'w2';
      homeTag.loc(block, S.home, G + 0.04, 0.035).text(`<b>你家</b> ${wHome.text}${stuck ? `，第 ${Math.floor(S.days) + 1} 天` : ''}`);
      townTag.loc(block, S.town, G + (Math.abs(S.home - S.town) < 0.05 ? 0.075 : 0.02), -0.03).text(`<b>邻城</b> ${weatherAt(S.kind, S.town - S.xf).text}`);          // 两城靠近：邻城的牌子抬高，免得叠字
      homeTag.el.classList.toggle('hot', wHome.k === 'w2');          // 你家正在下雨：牌子亮一下
      const coldX = k.side < 0 ? S.xf - 0.09 : Math.min(XR - 0.03, S.xf + 0.08), warmX = k.side < 0 ? Math.min(XR - 0.03, S.xf + 0.07) : Math.max(XL + 0.03, S.xf - 0.09);
      tCold.loc(block, coldX, G + 0.02, -ZD); tWarm.loc(block, warmX, G + 0.075, -0.05);          // 冷气团的名字在楔子里面靠后；锋面的名字在锋面上；“按住推”贴着推的箭头
      tFront.loc(block, xAt(0.07), hAt(0.07) + 0.016, ZD);
      const intro = S.hintFor !== S.kind; tCold.show(intro); tWarm.show(intro); tFront.show(intro);          // 气团、锋面的名字只在开头标一下；推起来以后画面留给你家和邻城
      tScale.loc(block, XL + 0.05, -0.006, ZD + 0.01);
      tHint.loc(block, Math.max(XL + 0.03, S.xf - 0.11), G + 0.03, ZD).text(S.kind === 'warm' ? '按住暖气团，往右推' : '按住冷气团，往右推').show(S.hintFor !== S.kind);
      setReal();
      if (S.dived) for (const o of diagram()) o.visible = false;
    };

    // ---- 面板上的话：跟着你家发生的事说一句 ----
    let last = '';
    const say = () => {
      if (!W) return;
      const w = weatherAt(S.kind, S.home - S.xf), key = `${S.kind}${w.k}`; if (key === last) return; last = key;
      const msg = {
        coldw1: '锋线快到你家了：头顶的云变厚，风渐渐大起来。气温还没降，你家还在<b>暖空气</b>里。',
        coldw2: '锋线到了你家：冷空气从下面插进来，<b>大风、降温、下雨</b>几乎一起来。',
        coldw3: '锋线过去了：你家换成了<b>冷空气</b>，雨停了，天转晴，气温低了，气压升高。',
        warmw1: '锋线还远，你家头顶已经是暖空气爬上来的地方：云一层层变厚。',
        warmw2: '锋线还没到，你家就开始<b>连续下雨</b>了。雨是从头顶那层爬升的暖空气里落下来的，地面这里<b>还是冷空气</b>。',
        warmw3: '锋线过去了：你家换成了<b>暖空气</b>，雨停了，变暖了，气压降低。',
        stillw2: '你家在冷空气这一侧，头顶是爬上来的暖湿空气：<b>阴雨</b>。',
        stillw0: '你家在山那边的暖空气里：<b>晴</b>。',
      }[key];
      if (msg) W.ui.status(msg);
    };

    // ---- 拖：推后面的气团（锋面跟着走）；也可以拖你家、邻城换个地方 ----
    const plane = new THREE.Plane(), hit = new THREE.Vector3(), wq = new THREE.Vector3();
    let x0 = 0, v0 = 0;
    const onGround = (ray) => { block.updateMatrixWorld(); block.localToWorld(wq.set(0, G, 0)); plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), wq); if (!ray.intersectPlane(plane, hit)) return null; return block.worldToLocal(hit.clone()).x; };
    const pickAt = (rc) => { const hits = rc.intersectObjects([home.userData.pick, town.userData.pick, grab, cold, pushArrow], true); if (!hits.length) return null; const o = hits[0].object; return o === home.userData.pick ? 'home' : o === town.userData.pick ? 'town' : 'front'; };
    const pointer = {
      down(rc) {
        if (S.rise < 0.95) return false;
        const what = pickAt(rc); if (!what) return false;
        const x = onGround(rc.ray); if (x == null) return false;
        S.drag = what; S.moved = false; x0 = x; v0 = what === 'front' ? S.xf : S[what]; document.getElementById('c').style.cursor = 'grabbing'; return true;
      },
      move(rc) {
        const c = document.getElementById('c');
        if (!S.drag) { if (c && S.rise > 0.95) c.style.cursor = pickAt(rc) ? 'grab' : ''; return false; }
        const x = onGround(rc.ray); if (x == null) return true;
        if (Math.abs(x - x0) > 0.004) S.moved = true; else if (!S.moved) return true;          // 先别动：可能只是点一下（点你家＝到地上看）
        if (S.drag === 'front') {
          const k = K(); S.xf = Math.min(k.x1, Math.max(k.x0, v0 + (x - x0))); if (S.xf < MX - 0.01) S.stuck = false;
          S.going = true; S.hintFor = S.kind;
        } else {
          S[S.drag] = Math.min(0.115, Math.max(XL + 0.03, v0 + (x - x0)));          // 只能放在锋面推得到、雨带也能完全过去的地方
          if (S.drag === 'home') { S.logs[S.kind] = []; S.done.delete(S.kind); }          // 你家搬了：这一次的时间线从头记
        }
        record(); layout(); say(); return true;
      },
      up() { if (!S.drag) return false; const tap = S.drag === 'home' && !S.moved; S.drag = null; document.getElementById('c').style.cursor = ''; if (tap) dive(); return true; },
    };

    const setGuess = () => {          // 换锋：换一句问题和选项；之前点过的还记着
      if (!W) return;
      const [q, opts] = ASK[S.kind], g = seg(q, opts, (_, i) => { S.guess[S.kind] = i; drawLogs(); }, { value: S.guess[S.kind] ?? -1 });
      W.guess.el.replaceWith(g.el); W.guess = g;
    };
    const setKind = (kind, fresh = false) => {
      S.kind = kind; S.xf = KIND[kind].x0; S.rise = 0; S.hintFor = null; last = '';
      if (fresh || kind === 'still') [S.home, S.town] = HOME0[kind];
      S.stuck = false; if (kind === 'still') S.days = 0;
      const fh = kind === 'cold' ? 0.17 : 0.11; frameBox.scale.y = fh / 0.17; frameBox.position.y = LIFT + fh / 2; reframe?.();          // 暖锋、准静止锋的云低：镜头按各自的高度取景，不留大片空
      drawSym(); record();
      if (W) {
        setGuess();
        W.ui.status({
          cold: '冷锋：冷气团主动往前推，插到暖空气下面。按住左边的<b>冷气团</b>往右推，看它扫过你家。',
          warm: '暖锋：暖气团主动往前走，顺着前面的冷空气慢慢爬上去。按住左边的<b>暖气团</b>往右推，看它扫过你家。',
          still: '准静止锋：这回右边有一道山。按住左边的<b>冷气团</b>往右推，推到山脚试试。你家在山这边，邻城在山那边。',
        }[kind]);
      }
    };
    // 回到上面看 / 到你家地上看：镜头落到你家旁边，按人的视线高度往锋面来的方向看
    // 落到地上时，图解的东西（锋面、冷空气的颜色、流动的箭头、锋线符号、标签）先藏起来，只留真实的地面、房子、云和雨
    const diagram = () => [frontMesh, frontEdge, cold, sym, pushArrow, ...flows];
    const setDived = (on) => {
      S.dived = on; for (const o of diagram()) o.visible = !on && (o !== sym || S.rise > 0.5);
      for (const t of [tCold, tWarm, tFront, tHint, tScale, townTag]) t.el.style.visibility = on ? 'hidden' : '';
      if (W?.diveBtn) W.diveBtn.textContent = on ? '回到上面看' : '到你家地上看';
      if (W?.stepBtn) W.stepBtn.hidden = !on;
    };
    const dive = () => {
      if (S.dived) { setDived(false); back(); return; }
      setDived(true);
      // 站在你家房子后面、屋顶那么高，朝锋面来的方向（左边）看：看云一层层压过来
      // 视线几乎水平（look 会按屏幕把距离放大一点，所以这里给近一些）：人站在地上，云在头顶上方压过来
      // 站在你家旁边的空地上（不被房子、旗杆挡住），望向锋线那一边：锋线、云底和雨幕在眼前
      const side = S.xf < S.home ? -1 : 1, eye = new THREE.Vector3(S.home - side * 0.035, LIFT + G + 0.012, -0.03);
      const tgt = new THREE.Vector3(Math.min(XR - 0.01, Math.max(XL + 0.01, S.xf + side * 0.01)), LIFT + G + 0.022, 0.0);
      const dir = eye.clone().sub(tgt), dist = dir.length() * 0.7; dir.normalize();
      look(tgt.toArray(), dir.toArray(), dist, () => { setDived(false); back(); });
    };
    drawSym(); record(); layout();

    return {
      group,
      card: false,          // 和化学一样：不垫台板；整块地浮在书页上方
      size: { w: 0.38, d: 0.14, h: 0.2 },
      view: { elev: 14, azim: 18, lookY: 0.45, frameMargin: 0.96 },          // 从右前方略低处看：近处那一面就是冷空气楔子的剖面
      pointer,
      mount(ui) {
        const kindSeg = seg('推哪一种锋', ['冷锋', '暖锋', '准静止锋'], (_, i) => { setKind(['cold', 'warm', 'still'][i]); layout(); }, { value: 0 });
        const guess = seg(...ASK.cold, () => {}, { value: -1 });
        const logs = h('div', { class: 'timeline' });
        const map = h('canvas', { class: 'wx-map', width: 320, height: 120 });
        // 重来：这一种锋回到开头的样子——锋面、你家和邻城的位置、猜的选项、提示、这一种锋的时间线（别的锋的时间线留着，好对比）
        const acts = buttons([
          { text: '到你家地上看', ghost: true, onClick: () => dive() },
          { text: '锋面往前走一点', ghost: true, onClick: () => { const k = K(); S.xf = Math.min(k.x1, S.xf + 0.015); S.going = true; S.hintFor = S.kind; record(); layout(); say(); } },
          { text: '重来', ghost: true, onClick: () => { if (S.dived) { setDived(false); back(); } S.logs[S.kind] = []; S.done.delete(S.kind); delete S.guess[S.kind]; if (S.kind === 'still') S.stillSnap = null; setKind(S.kind, true); layout(); } },
        ]);
        ui.controls.append(kindSeg.el, guess.el, acts.el, note('你家和邻城都可以拖到别处；点一下你家，也能落到地上看。'));
        ui.data.append(h('div', { class: 'bar-title' }, '从上往下看（天气图）'), map, h('div', { class: 'bar-title' }, '你家经历了什么'), logs);
        W = { ui, logs, guess, map, diveBtn: acts.btns[0], stepBtn: acts.btns[1] };
        acts.btns[1].hidden = true;          // 站在地上时才有：一步步看锋面过来
        setGuess();
        drawLogs();
        ui.status('地块上有你家和一座邻城。按住左边的<b>冷气团</b>往右推，看锋面扫过你家时，你家的天气怎么变。');
      },
      update(dt) {
        S.t += dt;
        if (S.rise < 1) { S.rise = Math.min(1, S.rise + dt / 0.8); layout(); }          // 打开、换锋的时候：锋面立起来
        if (S.going && S.real < 1) { S.real = Math.min(1, S.real + dt / 0.9); setReal(); }
        flowTex.offset.x = -S.t * 0.8; placeRain();
        if (S.kind === 'still' && (S.stuck || S.xf >= MX - 0.004) && S.drag !== 'front') {          // 准静止锋：顶在山脚不走了，一天天过去（锋线只是来回微微摆动）
          S.stuck = true; const d0 = Math.floor(S.days); S.days += dt / 1.4;
          S.xf = MX - 0.002 - 0.003 * (0.5 + 0.5 * Math.sin(S.t * 0.9)); shapeFront(); shapeFlows(); placeClouds(); sym.position.x = S.xf;
          if (Math.floor(S.days) !== d0) { const w = weatherAt('still', S.home - S.xf); S.stillSnap = { text: w.text, rain: w.k === 'w2', days: Math.floor(S.days) }; if (S.days >= 3) S.done.add('still'); layout(); drawLogs(); if (Math.floor(S.days) === 1) W?.ui.status('冷空气被山挡住，锋停在山脚，几乎不动。暖湿空气一直沿锋面往上爬：山这边的你家<b>阴雨连绵</b>，一天又一天（示意，时间加快了）；山那边的邻城是晴天。'); }
        }
      },
    };
  },
};
