// 高中地理 选择性必修1 第三章第一节 常见天气系统 · 锋与天气（课本第 42–44 页，图 3.2 锋的形成、图 3.3 冷锋、图 3.4 暖锋）。
//
// 课本的图就是模型（讲同一件事，不还原插图）：一块从地上切下来的地块，浮在书页上方；上面是冷、暖两种气团，交界面是锋面。
// 核心：“你家”。地块上有你家和一座邻城，都可以拖到别处。学生按住后面的气团往前推，锋面一路扫过来，
// 你家的天气跟着变，旁边的时间线记下你家依次经历了什么。冷锋、暖锋各推一次，两条时间线一比：
//   冷锋——锋线到了才大风、降温、下雨，过后转晴；暖锋——锋线还没到就开始连续下雨（地面还冷），锋线过后才变暖。
// 同一时刻，邻城和你家的天气不一样：看的是各自离锋线多远、在哪一侧。
// 准静止锋：冷空气被一道山挡住，锋线停在山脚几乎不动，冷空气一侧阴雨连绵（课本第 44 页昆明准静止锋：贵阳阴雨、昆明晴），时间一天天过去。
// 面板里两扇小窗和地块同步：“你家的天空”（站在你家抬头看）、“从上往下看”（天气图）。三处一起变：俯视的天气图、侧面的剖面、地面上的天。
// 开头的问题只是轻轻问一句，点不点都行，不挡路、不判对错（这是一件作品，不是一套题）。
// 教学示意：竖直方向夸大了（真实锋面很平缓，冷锋通常比暖锋陡）；雨区画的是课本图 3.3、3.4 的情形
// （冷锋降水主要在锋后、紧挨锋线；暖锋降水在锋前、范围宽）。实际的锋，降水也可能在别的位置，或者没有降水。
import * as THREE from 'three';
import { seg, buttons, note } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { makeCloud } from './kit/cloud.js';
import { h } from '../ui/Panel.js';

const LIFT = 0;                         // 地块直接放在书页上（已经放在两页正中间、放得很大，不用再浮起来）
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
  map: ['看锋线的符号推一推（可以不猜）：P 城接下来会——', ['锋线一到就大风、降温、下雨，过后转晴', '锋线没到就连续下雨，锋线过后变暖']],
};
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** 某地离锋线 d（正数＝在锋线前面，锋还没到）时的天气（教学示意，按课本图 3.3、3.4） */
/** 云雨还没形成时：只有冷、暖空气，都是晴天 */
const plainAt = (kind, d) => ((kind === 'warm' ? d < 0 : d > 0) ? { k: 'p', text: '晴，较暖', s: '晴暖' } : { k: 'p', text: '晴，较冷', s: '晴冷' });
const sig = (x) => 1 / (1 + Math.exp(-x));
/** 你家气象站的读数（教学示意的数值，按课本第 43–44 页的变化方向）：d＝你家离锋线多远，正数＝锋线还没到。
 *  冷锋：过境后气温下降、气压上升，过境时风大；暖锋：过境后气温升高、气压降低（锋前气压就在慢慢降）；准静止锋：冷空气一侧阴冷。 */
export function stationAt(kind, d) {
  if (kind === 'cold') return { T: 11 + 9 * sig(d / 0.008), P: 1008 + 8 * sig(-d / 0.012) - 1.5 * Math.exp(-((d / 0.02) ** 2)), wind: Math.round(2 + 4 * Math.exp(-(((d + 0.012) / 0.02) ** 2))) };
  if (kind === 'warm') return { T: 16 - 8 * sig(d / 0.008), P: 1007 + 7 * sig((d - 0.06) / 0.03), wind: Math.round(2 + Math.exp(-((d / 0.04) ** 2))) };
  return { T: d >= 0 ? 16 : 10, P: d >= 0 ? 1009 : 1013, wind: 2 };
}
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
  return { k: 'w3', text: '转晴，变暖，气压降低', s: '转晴变暖' };          // 课本 p43：暖锋过境后气温升高，气压降低，天气转晴
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

  create({ tag, reframe, look, back }) {
    const group = new THREE.Group();
    const S = { kind: 'cold', xf: KIND.cold.x0, rise: 0, real: 0, going: false, hintFor: null, drag: null, moved: false, t: 0, home: 0.05, town: 0.13, logs: { cold: [], warm: [], still: [], map: [] }, done: new Set(), guess: {}, days: 0, form: 0, map: false, lift: 0 };          // form：云雨形成到哪了（0：天上干干净净；1：成云、下雨了）；map：看图推天气（图上的空气、锋面、云雨先压着，推的时候 lift 才立起来）
    let W = null;
    const K = () => KIND[S.kind];
    const LK = () => (S.map ? 'map' : S.kind);          // 时间线记在哪一行
    const front = (s) => K().H * (1 - Math.exp(-Math.max(0, s) / K().L));
    const LINE = new THREE.LineBasicMaterial({ color: 0x2a3140, transparent: true, opacity: 0.9 });
    const lit = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1, roughness: 0.9, metalness: 0, ...o });
    const edges = (m, ang = 25) => { const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, ang), LINE); e.raycast = () => {}; m.add(e); return m; };
    const block = new THREE.Group(); block.position.y = LIFT; group.add(block);          // 浮起来的那一整块

    // ---- 书页上的影子（地块浮在上面） ----
    const shadowTex = canvasTex(256, 128, (g, w, hh) => { const gr = g.createRadialGradient(w / 2, hh / 2, 0, w / 2, hh / 2, w / 2); gr.addColorStop(0, 'rgba(60,45,30,0.5)'); gr.addColorStop(0.6, 'rgba(60,45,30,0.2)'); gr.addColorStop(1, 'rgba(60,45,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, hh); });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry((XR - XL) * 1.06, ZD * 2 * 1.25), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.0006; shadow.raycast = () => {}; group.add(shadow);
    // 镜头取景用：整块地加上云长到最高的范围（看不见）
    const frameBox = new THREE.Mesh(new THREE.BoxGeometry(XR - XL + 0.04, 0.17, ZD * 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    frameBox.position.y = LIFT + 0.085; frameBox.raycast = () => {}; group.add(frameBox);

    // ---- 地块：草地 + 三层土 ----
    const groundMat = lit(0x9cc98a);
    const ground = edges(new THREE.Mesh(new THREE.BoxGeometry(XR - XL, 0.004, ZD * 2), groundMat)); ground.position.y = G - 0.002; block.add(ground);
    let yy = G - 0.004;
    const BASE = import.meta.env.BASE_URL || '/';
    const strata = new THREE.TextureLoader().load(`${BASE}tex/geo/strata-side.jpg`); strata.colorSpace = THREE.SRGBColorSpace;
    const sm = (rx, c) => { const t = strata.clone(); t.wrapS = THREE.RepeatWrapping; t.repeat.set(rx, 0.35); return new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(c, c, c) }); };
    { const t = G - 0.004, m = edges(new THREE.Mesh(new THREE.BoxGeometry(XR - XL, t, ZD * 2), [sm(0.5, 0.9), sm(0.5, 0.8), lit(0x8fb276), lit(0x6b5236), sm(2.4, 0.97), sm(2.4, 0.84)])); m.position.y = yy - t / 2; block.add(m); }          // 地下是一层层的岩层（手绘贴图）
    const fields = new THREE.TextureLoader().load(`${BASE}tex/geo/landscape-top.jpg`); fields.colorSpace = THREE.SRGBColorSpace;          // 地面：一片手绘的乡村（田、树林、村子）
    fields.repeat.set(1, (ZD * 2) / (XR - XL) * 1.25); fields.offset.set(0, (1 - fields.repeat.y) / 2);          // 贴图是 5:4，地块又长又窄：取中间一条
    const fieldMat = new THREE.MeshBasicMaterial({ map: fields, color: 0xf2f2ec, transparent: true, opacity: 0 });
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
      L.push(xAt(R), hAt(R), -ZD, xAt(R), hAt(R), ZD, S.xf, G + 0.0014, -ZD, S.xf, G + 0.0014, ZD);
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
    const pushArrow = arrow(0x2f7f6f, 0.05); pushArrow.scale.setScalar(0.6); block.add(pushArrow);
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
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.92)'); gr.addColorStop(0.82, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');          // 边缘收得紧一点：云有轮廓，不是一团失焦的棉花
      g.globalAlpha = 0.55; g.fillStyle = gr; g.fillRect(0, 0, w, w);
      // 花菜状的边：一圈软的小团叠在边上（不挖洞，挖洞看着像肥皂泡）
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, r = w * 0.27, cx = w / 2 + Math.cos(a) * r, cy = w / 2 + Math.sin(a) * r * 0.85, rr = w * (0.13 + 0.05 * ((i * 7) % 3) / 2);
        const gg = g.createRadialGradient(cx, cy, 0, cx, cy, rr); gg.addColorStop(0, 'rgba(255,255,255,0.9)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gg; g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.fill(); }
    });
    const puffs = Array.from({ length: 64 }, () => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false })); m.renderOrder = 8; m.raycast = () => {}; m.userData.seed = [rnd(), rnd(), rnd(), rnd()]; block.add(m); return m; });
    // ---- 有体积的云（主体）：冷锋是一座积雨云，底平、往上长成云塔，顶上摊开成砧状；暖锋、准静止锋是贴着缓缓锋面的一大片层状云 ----
    const vcloud = makeCloud(48, 12), vcum = makeCloud(56, 60);          // 试过有体积的云（MarchingCubes），作者觉得成了一坨、不像云，先不用；这里不加进场景          // 层状云融成一片（SUB 小）；积雨云一团团的（SUB 大）
    const cr = (() => { let q = 31; return () => ((q = (q * 16807) % 2147483647) / 2147483647); })();
    const BALLS = { cold: [], warm: [], still: [] };
    for (let k = 0; k < 22; k++) { const h = k / 21, w = 0.013 + 0.007 * Math.sin(h * Math.PI * 0.9); BALLS.cold.push({ x: -0.012 + (cr() - 0.5) * 0.014 - h * 0.004, y: 0.018 + h * 0.088, z: (cr() - 0.5) * 0.05, r: w, born: 0.22 + h * 0.6 });          // 云塔：低处先凝结，越高越晚
      for (let j = 0; j < 3; j++) { const a = cr() * 6.28, rr = w * (0.9 + cr() * 0.3); BALLS.cold.push({ x: -0.012 - h * 0.004 + Math.cos(a) * rr, y: 0.02 + h * 0.086 + (cr() - 0.3) * 0.008, z: Math.sin(a) * rr * 1.2, r: w * (0.45 + cr() * 0.25), born: 0.26 + h * 0.6 }); } }          // 一圈圈鼓起来的小团：花菜一样的边
    for (let k = 0; k < 8; k++) BALLS.cold.push({ x: -0.035 + k * 0.006 + (cr() - 0.5) * 0.004, y: 0.02 + cr() * 0.006, z: (cr() - 0.5) * 0.07, r: 0.014 + cr() * 0.004, born: 0.12 + k * 0.03 });          // 平平的云底
    for (let k = 0; k < 16; k++) for (const z of [-0.02, 0.02]) BALLS.cold.push({ x: -0.018 + k * 0.0042, y: 0.103 + (cr() - 0.5) * 0.004 - k * 0.0003, z: z + (cr() - 0.5) * 0.02, r: 0.0125 - k * 0.00025 + cr() * 0.002, born: 0.8 + k * 0.01 });          // 砧状的顶：在最高处往前（锋前方向）摊开成扁扁的一片
    for (const kind of ['warm', 'still']) { const L = kind === 'still' ? 0.12 : 0.14; for (let s = 0.004; s < L * 0.75; s += 0.006) for (const z of [-0.04, 0, 0.04]) { const t = s / L; BALLS[kind].push({ s, z: z + (cr() - 0.5) * 0.02, th: 0.016 * (1 - t) + 0.005, born: 0.15 + t * 0.6 + cr() * 0.05 }); } }          // 层状云：锋线附近又低又厚，越往前越薄
    let cloudKey = '';
    const placeVCloud = (wet) => {
      const k = K(), kind = S.kind;
      vcum.mesh.visible = kind === 'cold'; vcloud.mesh.visible = kind !== 'cold';
      if (kind === 'cold') {
        const cx = S.xf + 0.002, cy = G + 0.07, hx = 0.06, hy = 0.058, hz = ZD * 0.95;
        vcum.frame(cx, cy, 0, hx, hy, hz);
        const key = `c${Math.round(S.form * 40)}${Math.round(S.rise * 10)}`;
        if (key !== cloudKey) { cloudKey = key; vcum.build(BALLS.cold.map((b) => { const g = smooth(b.born, b.born + 0.22, S.form) * S.rise; return [(S.xf + b.x - (cx - hx)) / (2 * hx), (G + b.y - (cy - hy)) / (2 * hy), (b.z + hz) / (2 * hz), (b.r / (2 * hx)) * g]; })); }
      } else {
        const L = kind === 'still' ? 0.12 : 0.14, x0 = Math.min(S.xf, xAt(L)), x1 = Math.max(S.xf, xAt(L)), cx = (x0 + x1) / 2, hx = (x1 - x0) / 2 + 0.01, cy = G + 0.04, hy = 0.045, hz = ZD * 0.95;
        vcloud.frame(cx, cy, 0, hx, hy, hz);
        const key = `${kind}${Math.round(S.form * 40)}${Math.round(S.rise * 10)}${Math.round(S.xf * 400)}`;
        if (key !== cloudKey) { cloudKey = key; vcloud.build(BALLS[kind].map((b) => { const g = smooth(b.born, b.born + 0.22, S.form) * S.rise, x = xAt(b.s), y = G + front(b.s) * S.rise + 0.006 + b.th * 0.5; return [(x - (cx - hx)) / (2 * hx), (y - (cy - hy)) / (2 * hy), (b.z + hz) / (2 * hz), (b.th / (2 * hy)) * 0.55 * g]; })); }          // 层状云贴着锋面：锋一动就要重算
      }
      for (const c of [vcloud, vcum]) { c.wet(wet); c.opacity(S.view === 'map' ? 0.22 : 1); }
      vcum.mesh.visible = kind === 'cold' && S.rise > 0.01; vcloud.mesh.visible = kind !== 'cold' && S.rise > 0.01;
    };
    const camLocal = new THREE.Vector3();
    const viewFade = (p) => { if (S.view === 'map') return 0.22; if (S.view !== 'home') return 1; const cam = globalThis.__lb?.stage?.camera; if (!cam) return 1; block.worldToLocal(camLocal.copy(cam.position)); return smooth(0.025, 0.06, camLocal.distanceTo(p)); };
    const placeClouds = () => {
      const wet = smooth(0.8, 1, S.form) * S.rise;          // 云够厚、下起雨来，云底就压暗
      for (const m of puffs) {
        const [a, b, c, d] = m.userData.seed;
        let s, y, r, sx = 1, sy = 1, shade, op = 1;
        if (S.kind === 'cold') {
          s = -0.014 + Math.pow(a, 1.3) * 0.055; const base = Math.max(0.026, front(s) * S.rise + 0.004), hgt = 0.075 * Math.exp(-Math.abs(s - 0.004) / 0.03), q = Math.pow(b, 0.8);
          y = base + q * hgt; r = 0.013 + c * 0.01; if (q > 0.82) { r *= 1.5; s -= 0.04 * d; } shade = 0.6 + 0.32 * Math.min(1, q * 1.25) - 0.48 * wet * Math.max(0, 1 - q * 1.8);          // 积雨云：顶上亮，底下发暗
        } else {          // 暖锋、准静止锋：锋面缓，云一层层铺开
          s = Math.pow(a, 0.9) * (S.kind === 'still' ? 0.13 : 0.15); const base = front(s) * S.rise + 0.006;
          const t = s / 0.15; y = base + b * (0.012 + 0.025 * (1 - t)); r = 0.012 + c * 0.008; sx = 2.2 + 1.6 * t; sy = 0.9 * (1 - 0.55 * t); op = 1 - 0.6 * t;
          shade = 0.62 + 0.3 * b - 0.45 * wet * Math.max(0, 1 - t * 1.6) * (1 - b * 0.7);          // 一层层铺开的层状云：锋线附近又低又厚、发暗，越往前越高越薄，成了丝缕一样的高云
        }
        const x = xAt(s); m.visible = x > XL + 0.004 && x < XR - 0.004;          // 云和雨都只在这块地上方
        m.position.set(x, G + y, -ZD * 0.85 + d * ZD * 1.7);
        const born = 0.15 + b * 0.55, g = smooth(born, born + 0.25, S.form);          // 一团团凝结出来：低处先有，越高越晚
        m.scale.set(r * 2 * sx * (0.4 + 0.6 * g), r * 2 * sy * (0.4 + 0.6 * g), 1); shade = Math.max(0.14, shade); m.material.color.setRGB(shade, shade, shade * 1.04); m.material.opacity = 0.8 * S.rise * g * op * viewFade(m.position); if (g < 0.01) m.visible = false;          // 颜色是线性空间的值：0.6 显示出来已经很浅          // 天气图里云淡下去，露出地面；站在地上时，贴到眼前的那几团也淡掉
      }
    };

    // ---- 雨：从云底落下，穿过锋面落进下面的冷空气，一直到地面 ----
    const NR = 520, rainPos = new Float32Array(NR * 6), rainSeed = Array.from({ length: NR }, () => [rnd(), rnd(), rnd()]);
    const rain = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x4f6f98, transparent: true, opacity: 0.85 }));
    rain.geometry.setAttribute('position', new THREE.BufferAttribute(rainPos, 3)); rain.raycast = () => {}; block.add(rain);
    const placeRain = () => {
      const [r0, r1] = K().rain, on = smooth(0.8, 1, S.form) * S.rise; rain.visible = on > 0.01; rain.material.opacity = (S.view === 'home' ? 0.35 : 0.85) * on;          // 站在地上看：雨就在眼前，淡一点才不乱          // 云够厚了才下雨
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
    const homeTag = tag('', 'pill'), townTag = tag('', 'pill');

    // ---- 标签 ----
    const tCold = tag('冷气团', 'pill'), tWarm = tag('暖气团', 'pill'), tFront = tag('锋面', 'pill'), tHint = tag('', 'pill'), tScale = tag('教学示意 · 竖直方向夸大了 · 本例水汽充足', 'pill');

    // ---- 线稿 → 真实：头一次推的时候，一秒内铺开 ----
    const setReal = () => {
      const r = S.real;
      for (const m of [groundMat, coldMat]) m.emissiveIntensity = 1 - 0.82 * r;
      frontMat.emissiveIntensity = 1 - 0.6 * r;          // 锋面保持暖橙、透亮，不变成灰褐的塑料壳
      LINE.opacity = 0.9 - 0.6 * r; frontMat.opacity = 0.8 - 0.56 * r; coldMat.opacity = 0.24 + 0.06 * r;
      fieldMat.opacity = Math.min(1, r * 1.4); field.scale.x = Math.max(0.001, smooth(0, 0.85, r)); field.position.x = XL + (XR - XL) * field.scale.x / 2;
    };

    // ---- 你家的天气、时间线 ----
    const record = () => {
      if (S.form < 1) { drawLogs(); return; }          // 云雨形成以后才开始记
      const w = weatherAt(S.kind, S.home - S.xf), log = S.logs[LK()];
      if (!log.length && w.k === 'w1') log.push(weatherAt(S.kind, 1));          // 云雨刚形成时你家已经在“云变厚”那一段：形成之前那段晴天也记上
      if (!log.length || w.k > log[log.length - 1].k) log.push(w);          // 锋面往前扫，你家依次经历的天气（往回拖不倒着记）
      if (log.length === 4) S.done.add(LK());
      drawLogs();
    };
    const truth = (k) => k === 'map' ? (S.mapKind === 'cold' ? '这是冷锋（三角朝前进方向）：锋线一到就大风、降温、下雨，过后转晴' : '这是暖锋（半圆朝前进方向）：锋线没到就连续下雨，锋线过后变暖') : k === 'cold' ? '锋线一到，降温和下雨差不多一起来' : k === 'warm' ? '先下雨：锋线没到就下起来，锋线过后才变暖'
      : S.stillSnap?.rain ? '连着下好几天：锋停着不走，雨也不走' : '你家不在雨区，一直没下雨';
    const drawLogs = () => {
      if (!W) return;
      W.logs.replaceChildren(...['cold', 'warm', 'still', 'map'].filter((k) => k !== 'map' || S.map || S.logs.map.length > 1).map((k) => {
        const log = S.logs[k], fin = k === 'still' ? (S.stillSnap?.days ?? 0) >= 3 : log.length === 4;
        const snap = S.stillSnap, line = k === 'still' ? (snap ? `锋停在山脚，你家${snap.text}，已经 ${snap.days} 天（示意，时间加快了）` : '还没推过')          // 用当时记下的，不拿现在的位置重算
          : log.length > 1 ? log.map((x) => x.s).join(' → ') : '还没推过';
        const g = S.guess[k] != null ? ASK[k][1][S.guess[k]] : null;
        return h('div', { class: 'tl-row' }, h('b', {}, k === 'still' ? '准静止锋：' : k === 'map' ? '看图推天气（P 城）：' : `${KIND[k].name}过你家：`), h('span', {}, line),
          fin ? h('small', {}, g ? `你猜：${g}　实际：${truth(k)}` : `实际：${truth(k)}`) : null);          // 不判对错：猜的和实际的并排放着
      }));
      if (S.done.has('cold') && S.done.has('warm')) W.ui.unlock();
      drawMap();
    };

    // ---- 你家的天空（抬头看）：晴天有太阳；冷锋来时一座云塔从左边压过来、起风，下雨时云底发黑、雨斜着落；暖锋是高云一层层铺满、绵绵细雨；过后放晴 ----
    const drawSky = () => {
      if (!W?.sky) return;
      const c = W.sky, g = c.getContext('2d'), w = c.width, hh = c.height, d = S.home - S.xf;
      const wx = S.form < 1 ? plainAt(S.kind, d) : weatherAt(S.kind, d), k = wx.k, kind = S.kind;
      const rainy = k === 'w2', overcast = rainy || (k === 'w1' && kind !== 'cold'), clear = !rainy && !overcast && !(k === 'w1' && kind === 'cold');
      const [top, bot] = rainy ? (kind === 'cold' ? ['#4c5664', '#8b949e'] : ['#6b7480', '#a7aeb6']) : overcast ? ['#8d9bab', '#d6dbe0'] : (k === 'w1' ? ['#7fa9cf', '#d3e0ea'] : ['#6fa8dc', '#d4e7f5']);
      const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
      const blob = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
      if (clear) { const sg = g.createRadialGradient(262, 30, 0, 262, 30, 30); sg.addColorStop(0, 'rgba(255,240,180,1)'); sg.addColorStop(0.4, 'rgba(255,220,120,0.9)'); sg.addColorStop(1, 'rgba(255,220,120,0)'); g.fillStyle = sg; g.fillRect(222, 0, 80, 70); }
      if (kind === 'cold' && k === 'w1') {          // 一座云塔从左边（锋面来的方向）压过来：越近越大
        const near = 1 - Math.min(1, d / 0.065), cx = 30 + near * 70, sc = 0.6 + near * 0.8;
        for (const [ox, oy, r] of [[0, 62, 26], [24, 54, 22], [-22, 58, 20], [8, 36, 22], [20, 18, 18], [-6, 22, 16], [40, 66, 18]]) blob(cx + ox * sc, hh - 18 - (hh - 18 - oy) * sc, r * sc, 'rgba(245,247,250,0.95)');
        g.fillStyle = 'rgba(90,100,115,0.35)'; g.fillRect(cx - 50 * sc, hh - 26, 110 * sc, 8);
      }
      if (overcast || rainy) { for (let i = 0; i < 9; i++) blob(i * 40 + 10, rainy ? 20 : 14, rainy ? 34 : 26, rainy ? (kind === 'cold' ? 'rgba(70,78,90,0.95)' : 'rgba(120,128,138,0.92)') : 'rgba(225,230,236,0.75)'); }          // 满天的云：下雨时云底发黑
      if (k === 'w1' && kind === 'warm') { g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 3; const near = 1 - Math.min(1, (d - 0.095) / 0.045); for (let i = 0; i < 3 + near * 5; i++) { g.beginPath(); g.moveTo(-20 + i * 18, 14 + i * 4); g.lineTo(180 + i * 22, 8 + i * 4); g.stroke(); } }          // 暖锋前面：高云一丝丝铺过来
      if (rainy) {          // 雨：冷锋大而斜（起风），暖锋、准静止锋细而密
        const slant = kind === 'cold' ? 10 : 2, n = kind === 'cold' ? 70 : 90, len = kind === 'cold' ? 16 : 10;
        g.strokeStyle = kind === 'cold' ? 'rgba(200,215,235,0.8)' : 'rgba(210,220,232,0.65)'; g.lineWidth = kind === 'cold' ? 1.4 : 1;
        for (let i = 0; i < n; i++) { const x = (i * 37.7 + S.t * 60 * slant / 10) % (w + 20) - 10, y = ((i * 53.3 + S.t * 160) % (hh - 10)); g.beginPath(); g.moveTo(x, y); g.lineTo(x - slant, y + len); g.stroke(); }
      }
      if (kind === 'cold' && (k === 'w1' || k === 'w2')) { g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.5; for (let i = 0; i < 4; i++) { const y = 46 + i * 12, x = (S.t * 90 + i * 70) % (w + 60) - 60; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 20, y - 5, x + 40, y); g.stroke(); } }          // 风
      if (k === 'w3') { for (const [x, y] of [[60, 34], [150, 22]]) { blob(x, y, 12, 'rgba(255,255,255,0.85)'); blob(x + 14, y + 2, 10, 'rgba(255,255,255,0.85)'); } }
      g.fillStyle = '#7fa65c'; g.fillRect(0, hh - 16, w, 16);          // 地面和你家
      g.fillStyle = '#f3ede1'; g.fillRect(140, hh - 28, 14, 12); g.fillRect(158, hh - 25, 12, 9); g.fillStyle = '#c7503c'; g.beginPath(); g.moveTo(137, hh - 28); g.lineTo(147, hh - 36); g.lineTo(157, hh - 28); g.fill(); g.beginPath(); g.moveTo(156, hh - 25); g.lineTo(164, hh - 31); g.lineTo(172, hh - 25); g.fill();
      const temp = k === 'p' ? (/较暖/.test(wx.text) ? '较暖' : '较冷')          // 按你家此刻在哪团空气里：不靠文字猜
        : kind === 'cold' ? ({ w0: '较暖', w1: '较暖', w2: '降温', w3: '较冷' })[k] : kind === 'warm' ? ({ w0: '较冷', w1: '较冷', w2: '较冷', w3: '变暖' })[k] : (k === 'w0' ? '较暖' : '较冷');
      g.font = 'bold 13px sans-serif'; g.textAlign = 'left'; g.fillStyle = 'rgba(255,255,255,0.88)'; g.fillRect(6, 6, g.measureText(wx.text).width + 12, 20); g.fillStyle = '#23293a'; g.fillText(wx.text, 12, 21);
      g.textAlign = 'right'; g.fillStyle = 'rgba(255,255,255,0.88)'; g.fillRect(w - 84, hh - 38, 78, 18); g.fillStyle = temp === '降温' || temp === '较冷' ? '#2a62b8' : '#c8402e'; g.fillText(`气温：${temp}`, w - 10, hh - 24);
    };

    // ---- 从上往下看（天气图）：和地块同步——锋线和符号、雨区、冷暖空气、山、你家和邻城 ----
    const drawMap = () => {
      if (!W?.map) return;
      const c = W.map, g = c.getContext('2d'), w = c.width, hh = c.height, px = (x) => ((x - XL) / (XR - XL)) * (w - 20) + 10, k = K(), fx = px(S.xf);
      g.clearRect(0, 0, w, hh);
      g.fillStyle = '#eef3e6'; g.fillRect(10, 10, w - 20, hh - 20);
      const hideAir = S.map && S.lift < 1, noRain = hideAir || S.form < 1;          // 看图推天气：天气图上本来就不画冷暖空气和雨区，要你自己推
      const coldL = k.side < 0 ? 10 : fx, coldR = k.side < 0 ? fx : w - 10;
      if (!hideAir) { g.fillStyle = 'rgba(111,159,214,0.28)'; g.fillRect(coldL, 10, coldR - coldL, hh - 20); }
      if (!hideAir) { g.fillStyle = 'rgba(242,163,94,0.25)'; g.fillRect(k.side < 0 ? fx : 10, 10, k.side < 0 ? w - 10 - fx : fx - 10, hh - 20); }
      const [r0, r1] = k.rain, ra = px(S.xf + k.side * r0), rb = px(S.xf + k.side * r1);
      const rl = Math.max(10, Math.min(ra, rb)), rr = Math.min(w - 10, Math.max(ra, rb));          // 雨区只画在地图的地块里
      g.save(); g.beginPath(); g.rect(rl, 10, noRain ? 0 : Math.max(0, rr - rl), hh - 20); g.clip();
      g.strokeStyle = 'rgba(60,90,140,0.55)'; g.lineWidth = 1.2; for (let x = -hh; x < w; x += 6) { g.beginPath(); g.moveTo(x, hh); g.lineTo(x + hh * 0.5, 0); g.stroke(); } g.restore();          // 雨区：斜线
      if (S.kind === 'still') { g.fillStyle = '#8a7a52'; for (let y = 14; y < hh - 12; y += 10) { g.beginPath(); g.moveTo(px(MX + 0.012), y + 8); g.lineTo(px(MX + 0.025), y); g.lineTo(px(MX + 0.038), y + 8); g.fill(); } }          // 山
      g.strokeStyle = S.kind === 'warm' ? '#c8402e' : '#2a62b8'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(fx, 10); g.lineTo(fx, hh - 10); g.stroke();
      for (let y = 18, n = 0; y < hh - 12; y += 16, n++) {
        const semi = S.kind === 'warm' || (S.kind === 'still' && n % 2), dir = S.kind === 'still' && semi ? -1 : 1;
        g.fillStyle = semi && S.kind !== 'cold' ? '#c8402e' : '#2a62b8'; g.beginPath();
        if (semi) g.arc(fx, y, 5, -Math.PI / 2, Math.PI / 2, dir < 0); else { g.moveTo(fx, y - 5); g.lineTo(fx + 8, y); g.lineTo(fx, y + 5); }
        g.fill();
      }
      const dot = (x, label, col) => { const X = px(x), Y = label === '邻城' ? hh * 0.36 : hh * 0.62; g.fillStyle = col; g.beginPath(); g.arc(X, Y, 4.5, 0, 7); g.fill(); g.fillStyle = '#23293a'; g.font = '12px sans-serif'; g.textAlign = 'center'; g.fillText(label, X, Y - 8); };
      dot(S.home, S.map ? 'P 城' : '你家', '#c7503c'); if (!S.map) dot(S.town, '邻城', '#6b7280');
      g.strokeStyle = 'rgba(35,41,58,0.5)'; g.lineWidth = 1; g.strokeRect(10, 10, w - 20, hh - 20);
    };

    const layout = () => {
      const k = K();
      shapeFront(); shapeFlows(); placeClouds(); placeRain();
      for (const f of flows) { f.material.opacity = (f.userData.z === 0 ? 1 : 0.45) * smooth(0, 0.12, S.form) * S.rise; f.visible = S.rise > 0.02; }
      frontMesh.visible = frontEdge.visible = cold.visible = S.rise > 0.02;          // 看图推天气：还没立起来时，图上只有锋线符号          // 推起来，暖空气才开始被抬升
      const ac = S.map && S.lift < 1 ? 0x8a8f98 : S.kind === 'warm' ? 0xd9662f : 0x2f7f6f; pushArrow.userData.mat.color.set(ac); pushArrow.userData.mat.emissive.set(ac);          // 冷锋、准静止锋推冷气团；暖锋推暖气团
      pushArrow.position.set(Math.max(XL + 0.012, S.xf - 0.08), G + 0.004, ZD - 0.012);          // 靠地块前沿走，不压着房子
      grab.position.set(S.xf - 0.07, G + 0.03, 0);
      sym.position.set(S.xf, G + 0.0012, 0); sym.visible = S.map || S.rise > 0.5; ridge.visible = S.kind === 'still';
      home.position.set(S.home, G, 0.03); town.position.set(S.town, G, -0.025);
      const wx = (d) => (S.form < 1 ? plainAt(S.kind, d) : weatherAt(S.kind, d));
      const wHome = wx(S.home - S.xf), stuck = S.kind === 'still' && S.days >= 1 && wHome.k === 'w2';
      homeTag.loc(block, S.home, G + 0.04, 0.035).text(`<b>${S.map ? 'P 城' : '你家'}</b> ${S.map && S.lift < 1 ? '？' : wHome.text}${stuck ? `，第 ${Math.floor(S.days) + 1} 天` : ''}`);
      townTag.loc(block, S.town, G + (Math.abs(S.home - S.town) < 0.09 ? 0.075 : 0.02), -0.03).text(`<b>邻城</b> ${wx(S.town - S.xf).text}`);          // 两城靠近：邻城的牌子抬高，免得叠字
      homeTag.el.classList.toggle('hot', wHome.k === 'w2');          // 你家正在下雨：牌子亮一下
      const coldX = k.side < 0 ? S.xf - 0.09 : Math.min(XR - 0.03, S.xf + 0.08), warmX = k.side < 0 ? Math.min(XR - 0.03, S.xf + 0.07) : Math.max(XL + 0.03, S.xf - 0.09);
      tCold.loc(block, coldX, G + 0.02, -ZD); tWarm.loc(block, warmX, G + 0.075, -0.05);          // 冷气团的名字在楔子里面靠后；锋面的名字在锋面上；“按住推”贴着推的箭头
      tFront.loc(block, xAt(0.07), hAt(0.07) + 0.016, ZD);
      const intro = S.hintFor !== S.kind && !S.map; tCold.show(intro); tWarm.show(intro); tFront.show(intro);
      town.visible = !S.map; townTag.show(!S.map);          // 气团、锋面的名字只在开头标一下；推起来以后画面留给你家和邻城
      tScale.loc(block, XL + 0.05, -0.006, ZD + 0.01);
      tHint.loc(block, Math.max(XL + 0.03, S.xf - 0.11), G + 0.03, ZD).text(S.map ? '按住左边的气团，往右推' : S.kind === 'warm' ? '按住暖气团，往右推' : '按住冷气团，往右推').show(S.map ? !S.lifting : S.hintFor !== S.kind);          // 看图推天气：不说是冷是暖，要你看符号
      setReal();
      drawSky(); placeExtras(); drawStation();
    };

    // ---- 形成过程：头一段推的时候，跟着说一句 ----
    const formSaid = new Set();
    const formSay = () => {
      if (!W) return;
      const one = (k, m) => { if (!formSaid.has(k)) { formSaid.add(k); W.ui.status(m); } };
      const T = {
        cold: ['冷空气（密度较大）贴着地面往前插，<b>楔入</b>暖空气下面；暖空气被迫沿锋面<b>往上爬</b>。看那条箭头。', '暖湿空气越抬越高、越来越冷，达到饱和，开始凝结成<b>云</b>。冷锋锋面陡，云在锋线附近往高处长。', '云够厚了，具备降水条件，开始<b>下雨</b>：雨从云底落下，落进下面的冷空气里。<br>接着推，锋面带着这片云雨往前走，看它扫过你家。'],
        warm: ['暖空气主动往前走，顺着前面的冷空气<b>慢慢爬上去</b>：暖锋锋面很缓。', '暖湿空气沿着缓缓的锋面爬升、变冷，凝结成一层层的<b>云</b>，铺得很宽，一直铺到锋线前面很远。', '云够厚了，开始<b>连续下雨</b>，雨下在锋线前面。<br>接着推，看它扫过你家。'],
        still: ['冷空气往前推……', '暖湿空气沿锋面爬升、变冷，凝结成一层层的<b>云</b>，铺在冷空气这一侧的上空。', '开始下雨了。接着推到山脚看看。'],
      }[S.kind];
      if (S.form > 0.05) one(0, T[0]); if (S.form > 0.45) one(1, T[1]);
      if (S.form >= 1 && !formSaid.has(2)) { const [r0, r1] = K().rain, xm = S.xf + K().side * (r0 + r1) / 2; say1('雨落在冷气团这一侧', Math.max(XL + 0.03, Math.min(XR - 0.03, xm)), G + 0.012, ZD - 0.005); }
      if (S.form >= 1) one(2, T[2]);
    };

    // ---- 面板上的话：跟着你家发生的事说一句 ----
    let last = '';
    const say = () => {
      if (!W) return;
      if (S.form < 1) return;
      const w = weatherAt(S.kind, S.home - S.xf), key = `${S.kind}${w.k}`; if (key === last) return; last = key;
      const msg = {
        coldw1: '锋线快到你家了：头顶的云变厚，风渐渐大起来。气温还没降，你家还在<b>暖空气</b>里。',
        coldw2: '锋线到了你家：冷空气从下面插进来，<b>大风、降温、下雨</b>几乎一起来。',
        coldw3: '锋线过去了：你家换成了<b>冷空气</b>，雨停了，天转晴，气温低了，气压升高。',
        warmw1: '锋线还远，你家头顶已经是暖空气爬上来的地方：云一层层变厚。',
        warmw2: '锋线还没到，你家就开始<b>连续下雨</b>了。雨是从头顶那层爬升的暖空气里落下来的，地面这里<b>还是冷空气</b>。',
        warmw3: '锋线过去了：你家换成了<b>暖空气</b>，雨停了，天转晴，变暖了，气压降低。',
        stillw2: '你家在冷空气这一侧，头顶是爬上来的暖湿空气：<b>阴雨</b>。',
        stillw0: '你家在山那边的暖空气里：<b>晴</b>。',
      }[key];
      if (msg) W.ui.status(msg);
      const short = { coldw2: '锋线到了：大风、降温、下雨一起来', coldw3: '锋线过去：气温降了，气压升了', warmw2: '锋线还没到，已经下起雨了', warmw3: '锋线过去：气温升了，气压降了' }[key];
      if (short && !S.map) say1(short, S.home + 0.03, G + 0.075, 0.035);          // 写在你家牌子的右上方，不压着它
    };

    // ---- 拖：推后面的气团（锋面跟着走）；也可以拖你家、邻城换个地方 ----
    const plane = new THREE.Plane(), hit = new THREE.Vector3(), wq = new THREE.Vector3();
    let x0 = 0, v0 = 0;
    const onGround = (ray) => { block.updateMatrixWorld(); block.localToWorld(wq.set(0, G, 0)); plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), wq); if (!ray.intersectPlane(plane, hit)) return null; return block.worldToLocal(hit.clone()).x; };
    const pickAt = (rc) => { const hits = rc.intersectObjects([home.userData.pick, town.userData.pick, grab, cold, pushArrow], true); if (!hits.length) return null; const o = hits[0].object; return o === home.userData.pick ? 'home' : o === town.userData.pick ? 'town' : 'front'; };
    const pointer = {
      down(rc) {
        if (S.rise < 0.95 && !S.map) return false;
        const what = pickAt(rc); if (!what) return false;
        const x = onGround(rc.ray); if (x == null) return false;
        S.drag = what; S.moved = false; x0 = x; v0 = what === 'front' ? S.xf : S[what]; document.getElementById('c').style.cursor = 'grabbing'; return true;
      },
      move(rc) {
        const c = document.getElementById('c');
        if (!S.drag) { if (c && (S.rise > 0.95 || S.map)) c.style.cursor = pickAt(rc) ? 'grab' : ''; return false; }
        const x = onGround(rc.ray); if (x == null) return true;
        if (Math.abs(x - x0) > 0.004) S.moved = true; else if (!S.moved) return true;          // 先别动：可能只是点一下（点你家＝到地上看）
        if (S.drag === 'front') {
          const k = K(); S.xf = Math.min(k.x1, Math.max(k.x0, v0 + (x - x0))); if (S.xf < MX - 0.01) S.stuck = false;
          S.form = Math.max(S.form, Math.min(1, (S.xf - k.x0) / 0.06)); formSay();          // 头一段：暖空气被抬升、成云、下雨
          if (S.map && !S.lifting) { S.lifting = true; W?.ui.status('图上的空气、锋面和云雨立起来了。接着推，看锋扫过 P 城。'); }
          S.going = true; S.hintFor = S.kind;
        } else {
          S[S.drag] = Math.min(0.115, Math.max(XL + 0.03, v0 + (x - x0)));          // 只能放在锋面推得到、雨带也能完全过去的地方
          if (S.drag === 'home') { S.logs[LK()] = []; S.trace[LK()] = []; S.done.delete(LK()); }          // 你家搬了：这一次的时间线从头记
        }
        traceIt(); record(); layout(); say(); return true;
      },
      up() { if (!S.drag) return false; S.drag = null; document.getElementById('c').style.cursor = ''; return true; },
    };

    // 看图推天气：换个情境——锋的种类、位置每次随机；一开始只有地面、城市和锋线符号（一张天气图），推的时候空气、锋面和云雨才立起来
    const setMap = () => {
      const kind = Math.random() < 0.5 ? 'cold' : 'warm';
      S.map = true; S.mapKind = kind; S.lift = 0; S.lifting = false; S.logs.map = []; S.done.delete('map'); delete S.guess.map;
      setKind(kind);
      S.xf = KIND[kind].x0 + 0.02 + Math.random() * 0.03; S.form = 1; formSaid.add(0); formSaid.add(1); formSaid.add(2);
      S.home = Math.min(0.115, S.xf + (kind === 'cold' ? 0.09 : 0.17) + Math.random() * 0.03); S.town = 0.2;          // P 城在锋前、还晴着；邻城先不用
      record(); setGuess();
      W?.ui.status('换个情境：这是一张<b>天气图</b>，图上只有锋线和城市。先看锋线上的符号：三角还是半圆？朝哪边？再想想 P 城接下来会怎样。<br>想好了（不想也行），按住左边的气团往右推，看看对不对。');
    };
    const setGuess = () => {          // 换锋：换一句问题和选项；之前点过的还记着
      if (!W) return;
      const [q, opts] = ASK[LK()], g = seg(q, opts, (_, i) => { S.guess[LK()] = i; drawLogs(); }, { value: S.guess[LK()] ?? -1 });
      W.guess.el.replaceWith(g.el); W.guess = g;
    };
    const setKind = (kind, fresh = false) => {
      S.kind = kind; S.xf = KIND[kind].x0; S.rise = 0; S.hintFor = null; last = ''; S.form = 0; formSaid.clear();
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
    // ---- 舞台：书退到后面，地块在中央当主角。四周罩一层天色（跟着你家的天气变），书和桌子淡到看不见 ----
    const skyTex = canvasTex(64, 512, (g, w, hh) => { const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#ffffff'); gr.addColorStop(0.62, '#f2efe6'); gr.addColorStop(1, '#e8e2d2'); g.fillStyle = gr; g.fillRect(0, 0, w, hh); });
    const backdropMat = new THREE.MeshBasicMaterial({ map: skyTex, color: 0xc9dcec, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false });
    const backdrop = new THREE.Mesh(new THREE.SphereGeometry(3, 48, 24), backdropMat); backdrop.position.y = LIFT + 0.05; backdrop.renderOrder = -10; backdrop.raycast = () => {}; backdrop.userData.noFrame = true; backdrop.userData.qaSupport = true; group.add(backdrop);
    const skyCol = { clear: new THREE.Color(0xbcd6ec), cloud: new THREE.Color(0xc8d0d8), rain: new THREE.Color(0x9aa5b1) }, skyNow = new THREE.Color(0xbcd6ec);
    // 地平线：只在“站在你家抬头看”时出现的一大片田野，让地块四周不是悬空
    const farTex = fields.clone(); farTex.wrapS = farTex.wrapT = THREE.RepeatWrapping; farTex.repeat.set(10, 10); farTex.offset.set(0, 0);
    const farField = new THREE.Mesh(new THREE.CircleGeometry(2.4, 64), new THREE.MeshBasicMaterial({ map: farTex, color: 0xdfe6d2, transparent: true, opacity: 0, depthWrite: false }));
    farField.rotation.x = -Math.PI / 2; farField.position.y = LIFT + G - 0.0006; farField.raycast = () => {}; farField.userData.noFrame = true; farField.renderOrder = -5; group.add(farField);

    // ---- 天气图视角：地面上铺冷暖空气的淡色、雨区的斜线（从上往下看才出现） ----
    const tint = (c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, ZD * 2), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = G + 0.0012; m.raycast = () => {}; m.renderOrder = 3; block.add(m); return m; };
    const coldTint = tint(0x5b8fd0), warmTint = tint(0xe8894a);
    const hatchTex = canvasTex(128, 128, (g, w) => { g.strokeStyle = 'rgba(40,70,120,0.85)'; g.lineWidth = 6; for (let x = -w; x < w * 2; x += 22) { g.beginPath(); g.moveTo(x, w); g.lineTo(x + w, 0); g.stroke(); } }); hatchTex.wrapS = hatchTex.wrapT = THREE.RepeatWrapping;
    const rainArea = new THREE.Mesh(new THREE.PlaneGeometry(1, ZD * 2), new THREE.MeshBasicMaterial({ map: hatchTex, transparent: true, opacity: 0, depthWrite: false })); rainArea.rotation.x = -Math.PI / 2; rainArea.position.y = G + 0.0016; rainArea.raycast = () => {}; rainArea.renderOrder = 4; block.add(rainArea);
    const tRainArea = tag('雨区', 'pill');

    // ---- 换视角：同一时刻、同一个你家，三种看法 ----
    S.view = '3d';
    const VIEWS = [['3d', '立体剖面'], ['map', '天气图（从上往下看）'], ['home', '站在你家抬头看']];
    const viewBar = document.createElement('div'); viewBar.className = 'geo-views';          // 换视角的按钮固定在画面上方（不跟着三维场景走，换到哪个视角都在原处）
    const viewTags = VIEWS.map(([k, name]) => { const b = document.createElement('button'); b.textContent = name; b.onclick = () => setView(k); viewBar.append(b); return b; });
    const setView = (k) => {
      if (k === S.view) return;
      if (k === '3d') { S.view = '3d'; back?.(); placeExtras(); return; }
      S.view = k;
      if (k === 'map') look?.([0, LIFT + G, 0], [0, 1, 0.22], 0.8, () => { S.view = '3d'; placeExtras(); });
      else look?.([S.home - 0.09, LIFT + G + 0.035, -0.01], [0.85, -0.2, 0.45], 0.12, () => { S.view = '3d'; placeExtras(); }, { minEl: -0.8 });          // 站在你家东南边一点的地上，朝锋来的西边抬头看          // 站在你家东边一点、人的眼睛那么高，朝锋来的方向（西边）往上看
      placeExtras();
    };

    // ---- 指引：开头在气团上出现一串往右走的箭头（推这里、往这边推）；现象出现的那一刻，在它旁边说一句 ----
    const chevTex = canvasTex(64, 64, (g, w) => { g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(18, 12); g.lineTo(42, 32); g.lineTo(18, 52); g.stroke(); g.strokeStyle = 'rgba(40,90,80,0.9)'; g.lineWidth = 5; g.beginPath(); g.moveTo(18, 12); g.lineTo(42, 32); g.lineTo(18, 52); g.stroke(); });
    const chevs = [0, 1, 2].map(() => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: chevTex, transparent: true, depthWrite: false, depthTest: false })); m.scale.set(0.012, 0.012, 1); m.renderOrder = 20; m.raycast = () => {}; block.add(m); return m; });
    const callout = tag('', 'pill callout'); callout.show(false); let calloutT = 0;
    const say1 = (text, x, y, z) => { callout.loc(block, x, y, z).text(text).show(true); calloutT = 4.5; };          // 同一时刻只说一句，4 秒多以后收起

    // ---- 你家的气象站：锋扫过你家时，气温、气压一点点画出来（侧栏）；另一种锋画过的留成虚线，好比一比 ----
    S.trace = { cold: [], warm: [], still: [], map: [] };
    const traceIt = () => { const d = S.home - S.xf, tr = S.trace[LK()]; if (!tr.some((p) => Math.abs(p.d - d) < 0.0015)) { tr.push({ d, ...stationAt(S.kind, d) }); tr.sort((a, b) => b.d - a.d); } };
    const D0 = 0.2, D1 = -0.12;
    const drawStation = () => {
      if (!W?.station) return;
      const c = W.station, g = c.getContext('2d'), w = c.width, hh = c.height, L = 34, R = w - 40, T0 = 16, B = hh - 30;
      const X = (d) => L + ((D0 - d) / (D0 - D1)) * (R - L), YT = (t) => B - ((t - 5) / 18) * (B - T0), YP = (p) => B - ((p - 1004) / 14) * (B - T0);
      g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, hh);
      g.strokeStyle = 'rgba(60,50,40,0.12)'; g.lineWidth = 1; for (let k = 0; k <= 3; k++) { const y = T0 + (k * (B - T0)) / 3; g.beginPath(); g.moveTo(L, y); g.lineTo(R, y); g.stroke(); }
      g.setLineDash([4, 3]); g.strokeStyle = 'rgba(60,50,40,0.45)'; g.beginPath(); g.moveTo(X(0), T0 - 4); g.lineTo(X(0), B); g.stroke(); g.setLineDash([]);
      g.font = '600 11px "PingFang SC", sans-serif'; g.fillStyle = '#5f4f3c'; g.textAlign = 'center'; g.fillText('锋线到你家', X(0), B + 13); g.textAlign = 'left'; g.fillText('← 锋来之前', L, B + 26); g.textAlign = 'right'; g.fillText('锋过去以后 →', R, B + 26);
      g.fillStyle = '#c4462e'; g.textAlign = 'left'; g.fillText('气温 ℃', 2, 11); g.fillStyle = '#2f62b0'; g.textAlign = 'right'; g.fillText('气压 hPa', w - 2, 11);
      g.fillStyle = '#c4462e'; g.textAlign = 'right'; for (const t of [5, 11, 17, 23]) g.fillText(t, L - 4, YT(t) + 4);
      g.fillStyle = '#2f62b0'; g.textAlign = 'left'; for (const p of [1004, 1009, 1013, 1018]) g.fillText(p, R + 4, YP(p) + 4);
      const line = (tr, key, Y, col, dash, wd) => { if (tr.length < 2) return; g.save(); g.setLineDash(dash); g.strokeStyle = col; g.lineWidth = wd; g.beginPath(); tr.forEach((p, i) => { const x = X(p.d), y = Y(p[key]); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke(); g.restore(); };
      const other = S.kind === 'cold' ? 'warm' : S.kind === 'warm' ? 'cold' : null;
      if (other && !S.map) { line(S.trace[other], 'T', YT, 'rgba(196,70,46,0.35)', [4, 3], 1.5); line(S.trace[other], 'P', YP, 'rgba(47,98,176,0.35)', [4, 3], 1.5); }
      const tr = S.trace[LK()]; line(tr, 'T', YT, '#c4462e', [], 2.2); line(tr, 'P', YP, '#2f62b0', [], 2.2);
      const d = S.home - S.xf, now = stationAt(S.kind, d);
      if (d <= D0 && d >= D1) { for (const [y, col] of [[YT(now.T), '#c4462e'], [YP(now.P), '#2f62b0']]) { g.fillStyle = col; g.beginPath(); g.arc(X(d), y, 3.6, 0, 7); g.fill(); } }
      if (other && !S.map && S.trace[other].length > 1) { g.fillStyle = 'rgba(60,50,40,0.6)'; g.textAlign = 'center'; g.fillText(`虚线：${KIND[other].name}过你家时`, (L + R) / 2, 11); }
      const wx = S.form < 1 ? plainAt(S.kind, d) : weatherAt(S.kind, d), rainy = S.form >= 1 && wx.k === 'w2';
      W.read.innerHTML = `<b style="color:#c4462e">${now.T.toFixed(0)} ℃</b>　<b style="color:#2f62b0">${now.P.toFixed(0)} hPa</b>　风力 ${now.wind} 级　${rainy ? '<b style="color:#2f62b0">下雨</b>' : '不下雨'}<br><small>数值是教学示意，变化的方向按课本</small>`;
    };

    // ---- 书和桌子淡出（只淡这一张活页打开的时候；关上时慢慢回来，dispose 时全部还原） ----
    const hero = { list: null, k: 0 };
    const heroFade = (dt) => {
      if (!hero.list) {
        let root = group; while (root.parent) root = root.parent;
        const mine = new Set(); for (let o = group; o; o = o.parent) mine.add(o);
        hero.list = [];
        const A = globalThis.__lb?.live?.active, skip = new Set([A?.card, A?.hole].filter(Boolean));          // 揭起来的原图卡片由 LiveLayer 自己淡出，不能碰（碰了它就一直立在那儿）
        for (const top of root.children) {
          if (mine.has(top) || top.isLight || top.isCamera || skip.has(top)) continue;
          top.traverse((o) => { if (!o.isMesh && !o.isLine && !o.isSprite) return; for (const m of [].concat(o.material || [])) hero.list.push({ o, m, op: m.opacity, tr: m.transparent, vis: o.visible }); });
        }
      }
      const closing = !!globalThis.__lb?.live?.active?.closing, tgt = !closing && S.view === 'home' ? 1 : 0;          // 书是这个系列的标志，一直留着；只有“站在你家抬头看”时，四周换成天空和田野
      hero.k = tgt > hero.k ? Math.min(1, hero.k + dt / 1.1) : Math.max(0, hero.k - dt / 0.6);
      const k = smooth(0, 1, hero.k);
      if (k === 0 && hero.last === 0) return; hero.last = k;          // 没在“抬头看”的时候什么都不动
      backdropMat.opacity = 0.97 * k; backdrop.visible = k > 0.001;          // 用不着的时候不画
      for (const e of hero.list) { const tr = e.tr || k > 0; if (e.m.transparent !== tr) { e.m.transparent = tr; e.m.needsUpdate = true; } e.m.opacity = e.op * (1 - k); e.o.visible = e.vis && k < 0.95; }          // 改 transparent 要重新编译材质
    };
    const heroRestore = () => { for (const e of hero.list || []) { e.m.opacity = e.op; if (e.m.transparent !== e.tr) { e.m.transparent = e.tr; e.m.needsUpdate = true; } e.o.visible = e.vis; } };
    // ---- 真实一点：地上一丛丛树，风大时往下风那边弯；雨下过的地面颜色变深 ----
    const NT = 70, trees = new THREE.InstancedMesh(new THREE.ConeGeometry(0.0022, 0.0068, 7).translate(0, 0.0034, 0), new THREE.MeshStandardMaterial({ color: 0x3f6f35, roughness: 0.9, emissive: 0x1d3318, emissiveIntensity: 0.45 }), NT);
    trees.raycast = () => {}; block.add(trees);
    const tr2 = (() => { let q = 23; return () => ((q = (q * 16807) % 2147483647) / 2147483647); })();
    const treeAt = []; for (let k = 0; treeAt.length < NT && k < 600; k++) { const x = XL + 0.01 + tr2() * (XR - XL - 0.02), z = (tr2() * 2 - 1) * (ZD - 0.006); if (Math.abs(x - 0.05) < 0.02 && Math.abs(z - 0.03) < 0.02) continue; if (Math.abs(x - 0.13) < 0.02 && Math.abs(z + 0.025) < 0.02) continue; treeAt.push([x, z, 0.75 + tr2() * 0.5, tr2() * 6.28]); }          // 避开你家、邻城一开始的位置
    const tm4 = new THREE.Matrix4(), tq = new THREE.Quaternion(), tv = new THREE.Vector3(), ts = new THREE.Vector3(), te = new THREE.Euler();
    const placeTrees = () => {
      const ridgeOn = S.kind === 'still';
      treeAt.forEach(([x, z, sc, ph], k) => {
        const nearCam = S.view === 'home' && x > S.home - 0.05 && x < S.home + 0.03 && z > -0.01;          // 站在地上看：挡在眼前的那几棵树不画
        const blocked = nearCam || (Math.abs(x - S.home) < 0.016 && Math.abs(z - 0.03) < 0.018) || (!S.map && Math.abs(x - S.town) < 0.016 && Math.abs(z + 0.025) < 0.018) || (ridgeOn && x > MX - 0.004 && x < MX + 0.054);
        const wind = S.form > 0.2 ? stationAt(S.kind, x - S.xf).wind : 2, tilt = Math.max(0, wind - 2) * 0.09 * (1 + 0.15 * Math.sin(S.t * 6 + ph));          // 风越大越弯，还一阵一阵地晃
        te.set(0, 0, -tilt); tq.setFromEuler(te); tm4.compose(tv.set(x, G, z), tq, ts.setScalar(blocked ? 1e-4 : sc)); trees.setMatrixAt(k, tm4);
      });
      trees.instanceMatrix.needsUpdate = true;
    };
    const wetMat = new THREE.MeshBasicMaterial({ color: 0x24323a, transparent: true, opacity: 0, depthWrite: false });
    const wet = new THREE.Mesh(new THREE.PlaneGeometry(1, ZD * 2), wetMat); wet.rotation.x = -Math.PI / 2; wet.position.y = G + 0.0008; wet.raycast = () => {}; wet.renderOrder = 2; block.add(wet);
    const placeWet = () => { const [r0, r1] = K().rain, a = Math.max(XL, Math.min(S.xf + K().side * r0, S.xf + K().side * r1)), b = Math.min(XR, Math.max(S.xf + K().side * r0, S.xf + K().side * r1)); wet.scale.x = Math.max(1e-4, b - a); wet.position.x = (a + b) / 2; wetMat.opacity = 0.22 * smooth(0.8, 1, S.form) * S.rise * (S.view === 'map' ? 0 : 1); };          // 雨下着的那一片地面湿了、暗下来
    // ---- 摆好这些新东西 ----
    const placeExtras = () => {
      const k = K(), mapV = S.view === 'map', homeV = S.view === 'home';
      const coldL = k.side < 0 ? XL : S.xf, coldR = k.side < 0 ? S.xf : XR, warmL = k.side < 0 ? S.xf : XL, warmR = k.side < 0 ? XR : S.xf;
      coldTint.scale.x = Math.max(1e-4, coldR - coldL); coldTint.position.x = (coldL + coldR) / 2; warmTint.scale.x = Math.max(1e-4, warmR - warmL); warmTint.position.x = (warmL + warmR) / 2;
      coldTint.material.opacity = warmTint.material.opacity = mapV ? 0.34 : 0;
      const [r0, r1] = k.rain, ra = Math.max(XL, Math.min(S.xf + k.side * r0, S.xf + k.side * r1)), rb = Math.min(XR, Math.max(S.xf + k.side * r0, S.xf + k.side * r1)), on = mapV && S.form >= 1 ? 0.55 : 0;
      rainArea.scale.x = Math.max(1e-4, rb - ra); rainArea.position.x = (ra + rb) / 2; hatchTex.repeat.set((rb - ra) / 0.03, (ZD * 2) / 0.03); rainArea.material.opacity = on;
      tRainArea.loc(block, (ra + rb) / 2, G + 0.004, -ZD + 0.01).show(on > 0);
      placeTrees(); placeWet();
      sym.scale.set(mapV ? 1.7 : 1, 1, 1);          // 天气图上锋线符号放大一些（只放大沿推进方向的那一边，不伸出地块）
      frontMesh.visible = frontEdge.visible = cold.visible = S.rise > 0.02 && !mapV && !homeV;          // 站在地上看：只看天、云、雨和地面，不看画在空中的锋面          // 天气图：从上往下看只看地面——冷暖空气的淡色、雨区、锋线符号
      for (const f of flows) f.visible = S.rise > 0.02 && !mapV && !homeV;
      sym.position.y = G + (mapV ? 0.0022 : 0.0012); sym.visible = (S.map || S.rise > 0.5) && !homeV;          // 锋线符号抬到田野、湿地面那几层上面一点，不和它们抢同一个深度（会闪）
      for (const t of [tCold, tWarm, tFront, tHint, tScale]) if (homeV) t.show(false);
      pushArrow.visible = !homeV;
      farField.material.opacity = homeV ? 0.95 : 0; farField.visible = homeV; home.visible = !homeV;          // 站在你家门口：自己家的房子不挡镜头
      viewBar.style.display = S.rise > 0.95 && !S.map ? '' : 'none'; viewTags.forEach((b, i) => b.classList.toggle('on', VIEWS[i][0] === S.view));
      if (homeV) { homeTag.show(false); townTag.show(false); }
    };
    // 回到上面看 / 到你家地上看：镜头落到你家旁边，按人的视线高度往锋面来的方向看
    drawSym(); record(); layout();

    return {
      group,
      card: false,          // 和化学一样：不垫台板；整块地浮在书页上方
      emerge: 'flat',          // 课本的图平放在书页上，模型从它上面长出来、它慢慢淡掉：一张图立了起来，连贯不闪
      size: { w: 0.38, d: 0.14, h: 0.2 },
      view: { elev: 14, azim: 18, lookY: 0.45, frameMargin: 0.96 },          // 从右前方略低处看：近处那一面就是冷空气楔子的剖面
      pointer,
      dispose() { heroRestore(); viewBar.remove(); },
      mount(ui) {
        const kindSeg = seg('推哪一种锋', ['冷锋', '暖锋', '准静止锋', '看图推天气'], (_, i) => { if (i === 3) setMap(); else { const was = S.map; S.map = false; setKind(['cold', 'warm', 'still'][i], was); } layout(); }, { value: 0 });          // 从看图推天气回来：你家、邻城回到这种锋开头的位置
        const guess = seg(...ASK.cold, () => {}, { value: -1 });
        const logs = h('div', { class: 'timeline' });
        const station = h('canvas', { class: 'wx-map', width: 320, height: 150 }), read = h('p', { class: 'note' });
        // 重来：这一种锋回到开头的样子——锋面、你家和邻城的位置、猜的选项、提示、这一种锋的时间线（别的锋的时间线留着，好对比）
        const acts = buttons([
          { text: '重来', ghost: true, onClick: () => { ui.relock?.(); if (S.view !== '3d') setView('3d'); for (const k of Object.keys(S.logs)) S.logs[k] = []; for (const k of Object.keys(S.trace)) S.trace[k] = []; S.done.clear(); S.guess = {}; S.stillSnap = null; S.real = 0; S.going = false; setReal(); callout.show(false); calloutT = 0; home.visible = true; S.map = false; kindSeg.set(0); setKind('cold', true); drawLogs(); layout(); } },          // 回到第一次打开的样子：冷锋、所有记录和猜的都清掉
        ]);
        ui.controls.append(h('div', { class: 'bar-title' }, '你家的气象站'), station, read, kindSeg.el, guess.el, acts.el, note('你家和邻城都可以拖到别处。画面上方可以换着看：立体剖面、天气图、站在你家抬头看。'));          // 侧栏只放一张图：锋扫过你家时的气温、气压；天空和天气图挪到主画面里换着看
        ui.data.append(h('div', { class: 'bar-title' }, '你家经历了什么'), logs);
        W = { ui, logs, guess, station, read };
        document.body.append(viewBar);
        setGuess();
        drawLogs();
        ui.status('地块上有你家和一座邻城。按住左边的<b>冷气团</b>往右推，看锋面扫过你家时，你家的天气怎么变。');
      },
      update(dt) {
        S.t += dt;
        if (S.map) { if (S.lifting && S.lift < 1) { S.lift = Math.min(1, S.lift + dt / 1.0); S.rise = S.lift; layout(); } else if (!S.lifting && S.rise !== 0) { S.rise = 0; layout(); } }
        else if (S.rise < 1) { S.rise = Math.min(1, S.rise + dt / 0.8); layout(); }          // 打开、换锋的时候：锋面立起来
        if (S.going && S.real < 1) { S.real = Math.min(1, S.real + dt / 0.9); setReal(); }
        flowTex.offset.x = -S.t * 0.8; placeRain(); drawSky();
        heroFade(dt);          // 打开以后：书和桌子淡出，四周换成天色；关上时反过来
        { const d = S.home - S.xf, wx = S.form < 1 ? plainAt(S.kind, d) : weatherAt(S.kind, d), tgt = wx.k === 'w2' ? skyCol.rain : wx.k === 'w1' && S.kind !== 'cold' ? skyCol.cloud : skyCol.clear; skyNow.lerp(tgt, Math.min(1, dt * 2)); backdropMat.color.copy(skyNow); }          // 四周的天色跟着你家的天气：下雨时暗下来
        { const show = S.hintFor !== S.kind && !S.map && S.rise > 0.95 && S.view === '3d'; chevs.forEach((m, i) => { const ph = (S.t * 0.7 + i / 3) % 1; m.visible = show; m.position.set(Math.max(XL + 0.012, S.xf - 0.08) + 0.03 + ph * 0.05, G + 0.022, ZD - 0.012); m.material.opacity = Math.sin(ph * Math.PI) * 0.95; }); }          // 一串箭头沿着推的方向往前走
        if (calloutT > 0) { calloutT -= dt; if (calloutT <= 0) callout.show(false); }
        if (S.view !== '3d') placeClouds();          // 镜头在动：云跟着按离镜头多远淡一淡
        if (S.form > 0.2) placeTrees();          // 树在风里一阵阵晃
        if (S.kind === 'still' && (S.stuck || S.xf >= MX - 0.004) && S.drag !== 'front') {          // 准静止锋：顶在山脚不走了，一天天过去（锋线只是来回微微摆动）
          S.stuck = true; const d0 = Math.floor(S.days); S.days += dt / 1.4;
          S.xf = MX - 0.002 - 0.003 * (0.5 + 0.5 * Math.sin(S.t * 0.9)); shapeFront(); shapeFlows(); placeClouds(); sym.position.x = S.xf;
          if (Math.floor(S.days) !== d0) { const w = weatherAt('still', S.home - S.xf); S.stillSnap = { text: w.text, rain: w.k === 'w2', days: Math.floor(S.days) }; if (S.days >= 3) S.done.add('still'); layout(); drawLogs(); if (Math.floor(S.days) === 1) W?.ui.status('冷空气被山挡住，锋停在山脚，几乎不动。暖湿空气一直沿锋面往上爬：山这边的你家<b>阴雨连绵</b>，一天又一天（示意，时间加快了）；山那边的邻城是晴天。'); }
        }
      },
    };
  },
};
