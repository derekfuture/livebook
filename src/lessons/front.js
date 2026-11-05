// 高中地理 选择性必修1 第三章第一节 常见天气系统 · 锋（课本第 42–44 页，图 3.2 锋的形成、图 3.3 冷锋及其天气）。
//
// 课本的图就是模型：打开时和图 3.2 一样——绿色的地面、橙色倾斜的锋面、冷暖气团的箭头，线稿、平涂的颜色。
// 学生按住冷气团往右推：冷空气贴着地面插到暖空气下面，暖空气被迫沿锋面抬升、冷却，水汽凝结成云；云在锋线附近长高，
// 雨落在锋线后面的冷气团里（图 3.3）。一推起来，线稿换成真实的光、云和雨。
// 教学模型：锋面的高度放大了几十倍（真实的冷锋坡度约 1:50–1:100，暖锋约 1:100–1:200），只表示关系，不是天气预报。
import * as THREE from 'three';
import { goals, note } from './kit/ui.js';
import { canvasTex } from './kit/props.js';

const G = 0.022;                       // 地面顶面（地块有厚度，侧面露出土层）
const XL = -0.17, XR = 0.17, ZD = 0.062; // 地面范围（窄一些：像从地上切下来的一块）
const HC = 0.13, LAM = 0.12;            // 冷锋锋面的形状：h(s) = HC·(1 − e^(−s/λ))，s 是离锋线往后（冷气团一侧）的距离；近地面陡、高处缓
const X0 = -0.02, X1 = 0.115;          // 锋线从哪推到哪
const front = (s) => HC * (1 - Math.exp(-Math.max(0, s) / LAM));
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export default {
  id: 'front',
  fig: '图3.2',
  title: '锋与天气',
  flow: 'explore',
  ask: '天气预报说“冷空气明天到”。冷空气来的时候，天上的云和雨是从哪儿来的？',
  need: '按住冷气团往右推，看暖空气怎样被抬起来、云和雨出现在哪里',
  conclusion: {
    page: 47,
    quote: '冷锋是冷气团主动向暖气团移动的锋。冷气团的前缘插入暖气团下面，使暖气团被迫抬升（图3.3）。暖气团在抬升过程中冷却，其中水汽容易凝结成云和雨。当冷锋过境时，常出现较大的风，云层增厚，并出现雨、雪天气。冷锋过境后，冷气团占据原来暖气团的位置，气温下降，气压上升，天气转晴。',
    why: '冷空气重，贴着地面往前插，把暖空气从下面顶起来。暖空气被抬升、冷却，水汽凝结成云；冷锋的锋面近地面很陡，云在锋线附近长得又高又厚，雨落在锋线后面、冷气团一侧。',
    src: '课本第 43 页 · 第三章 第一节 常见天气系统',
  },

  create({ tag }) {
    const group = new THREE.Group();
    const S = { xf: X0, rise: 0, real: 0, pushed: 0, drag: false, t: 0, v: 0, going: false };
    let W = null;
    const LINE = new THREE.LineBasicMaterial({ color: 0x2a3140, transparent: true, opacity: 0.9 });
    const lit = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1, roughness: 0.9, metalness: 0, ...o });
    const edges = (m, ang = 25) => { const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, ang), LINE); e.raycast = () => {}; m.add(e); return m; };

    // 光用舞台自己的（加灯会把整本书照白）：线稿时颜色自己发光（平涂），推起来以后才受光

    // 镜头取景用：整块地加上云塔长到最高的范围（看不见；打开时云还没长出来，镜头也要把它算进去）
    const frameBox = new THREE.Mesh(new THREE.BoxGeometry(XR - XL, 0.2, ZD * 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    frameBox.position.y = 0.1; frameBox.raycast = () => {}; group.add(frameBox);
    // ---- 地面（图 3.2 那块绿色的板） ----
    const groundMat = lit(0x9cc98a);
    const ground = edges(new THREE.Mesh(new THREE.BoxGeometry(XR - XL, 0.004, ZD * 2), groundMat));
    ground.position.y = G - 0.002; ground.receiveShadow = true; group.add(ground);
    // 地块的土层（侧面看得见）：表土、心土、底土
    const soil = [[0xa07a52, 0.006], [0xb8915f, 0.006], [0xc9a877, G - 0.016]];
    let yy = G - 0.004;
    for (const [c, t] of soil) { const m = edges(new THREE.Mesh(new THREE.BoxGeometry(XR - XL, t, ZD * 2), lit(c))); m.position.y = yy - t / 2; yy -= t; group.add(m); }
    // 真实的地面：田野、小路（推起来以后盖上来）
    const fields = canvasTex(1024, 540, (g, w, h) => {
      g.fillStyle = '#86b06a'; g.fillRect(0, 0, w, h);
      const cols = ['#8fbb6e', '#7aa65c', '#a3c47a', '#6f9a52', '#b5c98a'];
      g.globalAlpha = 0.55; for (let i = 0; i < 46; i++) { g.fillStyle = cols[i % cols.length]; const x = (i * 97) % w, y = ((i * 53) % h), ww = 90 + ((i * 37) % 120), hh = 60 + ((i * 29) % 90); g.save(); g.translate(x, y); g.rotate(((i % 5) - 2) * 0.05); g.fillRect(0, 0, ww, hh); g.restore(); }
      for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(40,70,30,${Math.random() * 0.12})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      g.strokeStyle = 'rgba(235,225,200,0.8)'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, h * 0.62); g.bezierCurveTo(w * 0.3, h * 0.5, w * 0.6, h * 0.75, w, h * 0.58); g.stroke();
    });
    const fieldMat = new THREE.MeshStandardMaterial({ map: fields, roughness: 1, transparent: true, opacity: 0 });
    const field = new THREE.Mesh(new THREE.PlaneGeometry(XR - XL, ZD * 2), fieldMat); fields.wrapS = THREE.ClampToEdgeWrapping; field.rotation.x = -Math.PI / 2; field.position.y = G + 0.0002; field.receiveShadow = true; group.add(field);

    // ---- 锋面（橙色的曲面）和冷气团（锋面下面那一块） ----
    const NS = 48, NZ = 2;
    const frontGeo = new THREE.PlaneGeometry(1, 1, NS, NZ);
    const frontMat = lit(0xf2a35e, { transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
    const frontMesh = new THREE.Mesh(frontGeo, frontMat); frontMesh.renderOrder = 6; group.add(frontMesh);
    const frontEdge = new THREE.LineSegments(new THREE.BufferGeometry(), LINE); group.add(frontEdge);
    const coldGeo = new THREE.BufferGeometry();
    const coldMat = lit(0x6f9fd6, { transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
    const cold = new THREE.Mesh(coldGeo, coldMat); cold.renderOrder = 5; group.add(cold);
    const shapeFront = () => {
      const h = (s) => G + front(s) * S.rise;
      const run = S.xf - XL, pos = frontGeo.attributes.position;
      for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NS; i++) {
        const s = (i / NS) * run, k = j * (NS + 1) + i;
        pos.setXYZ(k, S.xf - s, h(s), -ZD + (j / NZ) * ZD * 2);
      }
      pos.needsUpdate = true; frontGeo.computeVertexNormals(); frontGeo.computeBoundingSphere();
      // 锋面的轮廓线（课本那样的墨线）：两侧的曲线 + 顶上的边
      const L = [];
      for (const z of [-ZD, ZD]) for (let i = 0; i < NS; i++) { const a = (i / NS) * run, b = ((i + 1) / NS) * run; L.push(S.xf - a, h(a), z, S.xf - b, h(b), z); }
      L.push(XL, h(run), -ZD, XL, h(run), ZD, S.xf, G, -ZD, S.xf, G, ZD);
      frontEdge.geometry.dispose(); frontEdge.geometry = new THREE.BufferGeometry(); frontEdge.geometry.setAttribute('position', new THREE.Float32BufferAttribute(L, 3));
      // 冷气团：锋面和地面之间（两个侧面 + 后面一面 + 锋面下侧）
      const P = [];
      const quad = (a, b, c, d) => P.push(...a, ...b, ...c, ...a, ...c, ...d);
      for (let i = 0; i < NS; i++) {
        const a = (i / NS) * run, b = ((i + 1) / NS) * run, xa = S.xf - a, xb = S.xf - b, ha = h(a), hb = h(b);
        for (const z of [-ZD, ZD]) quad([xa, G, z], [xb, G, z], [xb, hb, z], [xa, ha, z]);
      }
      quad([XL, G, -ZD], [XL, G, ZD], [XL, h(run), ZD], [XL, h(run), -ZD]);
      coldGeo.dispose(); coldGeo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); coldGeo.computeVertexNormals();
    };

    // ---- 箭头：冷气团（蓝，贴地往右，按住它推）、暖气团（橙，沿锋面往上） ----
    const arrow = (color, len) => {
      const g = new THREE.Group(), m = lit(color);
      const shaft = edges(new THREE.Mesh(new THREE.BoxGeometry(len, 0.006, 0.012), m)); shaft.position.x = len / 2; g.add(shaft);
      const headGeo = new THREE.ConeGeometry(0.012, 0.022, 3); headGeo.rotateZ(-Math.PI / 2); headGeo.rotateX(Math.PI / 6);
      const head = edges(new THREE.Mesh(headGeo, m)); head.position.x = len + 0.01; g.add(head);
      return g;
    };
    const coldArrow = arrow(0x2f7f6f, 0.05); group.add(coldArrow);
    const warmArrow = arrow(0xd9662f, 0.045); group.add(warmArrow);
    const grab = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, ZD * 2), new THREE.MeshBasicMaterial({ visible: false })); grab.userData.pick = true; group.add(grab);

    // ---- 被抬升的暖空气：课本那样的橙色箭头，但会流动——先贴地流向锋面，再贴着锋面往上爬（越高越冷，颜色从橙变白） ----
    const flowTex = canvasTex(256, 64, (g, w, h) => { for (let x = 0; x < w; x += 64) { g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.moveTo(x + 8, 10); g.lineTo(x + 34, 10); g.lineTo(x + 54, h / 2); g.lineTo(x + 34, h - 10); g.lineTo(x + 8, h - 10); g.lineTo(x + 28, h / 2); g.closePath(); g.fill(); } });          // 一节节的箭头（>）
    flowTex.wrapS = THREE.RepeatWrapping;
    const flows = [];
    for (const [z, lift] of [[-0.05, 0.006], [0.0, 0.011], [0.05, 0.007]]) {
      const m = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ map: flowTex, transparent: true, depthWrite: false, vertexColors: true, side: THREE.DoubleSide }));
      m.renderOrder = 7; m.userData = { z, lift }; flows.push(m); group.add(m);
    }
    const warmC = new THREE.Color(0xf07a2c), coolC = new THREE.Color(0xffffff);
    const shapeFlows = () => {          // 一条带子：从锋前贴地流来，到锋线拐上去，贴着锋面往上爬
      for (const m of flows) {
        const { z, lift } = m.userData, pts = [];
        const run = Math.min(0.12, XR - 0.004 - S.xf); for (let i = 0; i <= 40; i++) { const x = S.xf + run - (i / 40) * run; pts.push([x, G + lift]); }          // 从地面边上流过来
        for (let i = 1; i <= 50; i++) { const sv = (i / 50) * 0.15; pts.push([S.xf - sv, G + front(sv) * S.rise + lift + 0.003]); }
        const P = [], C = [], U = [], I = [], wdt = 0.0105;
        let acc = 0;
        pts.forEach(([x, y], k) => {
          if (k) acc += Math.hypot(x - pts[k - 1][0], y - pts[k - 1][1]);
          P.push(x, y, z - wdt, x, y, z + wdt); U.push(acc * 8, 0, acc * 8, 1);          // 一节箭头约 3 厘米长
          const c = warmC.clone().lerp(coolC, smooth(0.015, 0.06, y - G)); C.push(c.r, c.g, c.b, c.r, c.g, c.b);
          if (k) { const a = (k - 1) * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        });
        m.geometry.dispose(); m.geometry = new THREE.BufferGeometry();
        m.geometry.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); m.geometry.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); m.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); m.geometry.setIndex(I);
      }
    };
    const placeParts = () => { flowTex.offset.x = -S.t * 0.8; const on = smooth(0.0, 0.08, S.pushed); for (const m of flows) { m.visible = on > 0.01; m.material.opacity = on; } };

    // ---- 云：在锋线附近长高（冷锋：积雨云），按推的程度一团团长出来 ----
    const puffs = [];
    // 云用软边的贴片（面向镜头），一层层叠起来，比实心的球像云；底下偏灰、顶上亮
    const cloudTex = canvasTex(256, 256, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.85)'); gr.addColorStop(0.75, 'rgba(255,255,255,0.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
      g.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 260; i++) { const a = Math.random() * Math.PI * 2, r = (0.3 + Math.random() * 0.7) * w / 2; g.fillStyle = `rgba(0,0,0,${Math.random() * 0.25})`; g.beginPath(); g.arc(w / 2 + Math.cos(a) * r, w / 2 + Math.sin(a) * r, 4 + Math.random() * 14, 0, 7); g.fill(); }
    });
    for (let i = 0; i < 130; i++) {          // 一座云塔：骑在锋线上、长在锋面上方的暖空气里，越往上越窄，顶上摊开一点（积雨云）
      const s = -0.014 + Math.pow(rnd(), 1.3) * 0.055, base = Math.max(0.026, front(s) + 0.004), hgt = 0.12 * Math.exp(-Math.abs(s - 0.004) / 0.03);
      const y = base + Math.pow(rnd(), 0.8) * hgt, k = (y - base) / Math.max(hgt, 1e-3), top = k > 0.82, r = (0.013 + rnd() * 0.01) * (top ? 1.6 : 1);          // 云底平（凝结的高度），顶上摊开、往暖空气那边伸（砧状云顶）
      const shade = 0.72 + 0.28 * Math.min(1, k * 1.3);          // 云底灰、云顶白
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, color: new THREE.Color(shade, shade, shade * 1.02), transparent: true, depthWrite: false, opacity: 0.9 }));
      m.renderOrder = 8; m.raycast = () => {};
      m.userData = { s: s - (top ? 0.045 * rnd() : 0), y, r, z: -ZD * 0.85 + rnd() * ZD * 1.7, born: 0.12 + k * 0.55 + rnd() * 0.12 };
      puffs.push(m); group.add(m);
    }
    const placeClouds = () => {
      for (const m of puffs) {
        const u = m.userData, g = smooth(u.born, u.born + 0.25, S.pushed) * S.rise;
        m.visible = g > 0.01;
        m.position.set(S.xf - u.s, G + u.y, u.z); m.scale.setScalar(u.r * 2 * (0.35 + 0.65 * g)); m.material.opacity = 0.9 * g;
      }
    };

    // ---- 雨：落在锋线后面（冷气团一侧），云长够了才下 ----
    const NR = 420, rainPos = new Float32Array(NR * 6), rainSeed = Array.from({ length: NR }, () => [rnd(), rnd(), rnd()]);
    const rain = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x4f6f98, transparent: true, opacity: 0.85 }));
    rain.geometry.setAttribute('position', new THREE.BufferAttribute(rainPos, 3)); rain.raycast = () => {}; group.add(rain);
    // 雨幕：云底下一道灰蓝色、往下变淡的帘子
    const curtainTex = canvasTex(64, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(80,100,130,0.9)'); gr.addColorStop(1, 'rgba(80,100,130,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const curtain = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.024, ZD * 1.7), new THREE.MeshBasicMaterial({ map: curtainTex, transparent: true, depthWrite: false, opacity: 0 })); curtain.visible = false; curtain.renderOrder = 4; curtain.raycast = () => {}; group.add(curtain);
    const placeRain = () => {
      const on = smooth(0.55, 0.8, S.pushed) * S.rise; rain.visible = on > 0.02; if (!rain.visible) { curtain.visible = false; return; }
      for (let i = 0; i < NR; i++) {
        const [a, b, c] = rainSeed[i], x = S.xf - 0.002 - a * 0.045, base = 0.024, y = G + base - (((c + S.t * 1.1) % 1) * base);
        rainPos.set([x, y, -ZD * 0.85 + b * ZD * 1.7, x - 0.0015, y - 0.008, -ZD * 0.85 + b * ZD * 1.7], i * 6);
      }
      rain.geometry.attributes.position.needsUpdate = true; rain.material.opacity = 0.85 * on;
      curtain.visible = true; curtain.position.set(S.xf - 0.024, G + 0.012, 0); curtain.material.opacity = 0.32 * on;
    };

    // ---- 冷锋符号：地上锋线一排蓝三角，尖朝前进方向（天气图上的画法） ----
    const sym = new THREE.Group(); group.add(sym);
    const triGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -0.005), new THREE.Vector3(0, 0, 0.005), new THREE.Vector3(0.008, 0, 0)]); triGeo.setIndex([0, 1, 2]);
    const triMat = new THREE.MeshBasicMaterial({ color: 0x2a62b8, side: THREE.DoubleSide });
    for (let z = -ZD + 0.012; z < ZD - 0.005; z += 0.024) { const t = new THREE.Mesh(triGeo, triMat); t.position.set(0, 0.0003, z); sym.add(t); }
    const symLine = new THREE.Mesh(new THREE.BoxGeometry(0.0015, 0.0004, ZD * 2), triMat); sym.add(symLine);

    // ---- 标签（课本图 3.2 的字） ----
    const tCold = tag('冷气团', 'pill'), tWarm = tag('暖气团', 'pill'), tFront = tag('锋面', 'pill'), tLine = tag('锋线', 'pill'), tHint = tag('按住冷气团，往右推', 'pill');

    // ---- 线稿 → 真实：颜色从平涂（自己发光）变成受光；墨线变淡；光亮起来 ----
    const setReal = () => {
      const r = S.real;
      for (const m of [groundMat, frontMat, coldMat, coldArrow.children[0].material, warmArrow.children[0].material]) m.emissiveIntensity = 1 - 0.82 * r;
      LINE.opacity = 0.9 - 0.6 * r;
      frontMat.opacity = 0.85 - 0.3 * r;
      coldMat.opacity = 0.22 + 0.1 * r;
      fieldMat.opacity = Math.min(1, r * 1.4); field.scale.x = Math.max(0.001, smooth(0, 0.85, r)); field.position.x = XL + (XR - XL) * field.scale.x / 2;          // 从冷气团那边一路铺过去
    };

    const layout = () => {
      shapeFront();
      coldArrow.position.set(Math.max(XL + 0.01, S.xf - 0.14), G + 0.004, 0.035);
      const sW = 0.03, up = new THREE.Vector3(-0.02, (front(sW + 0.02) - front(sW)) * S.rise, 0).normalize();          // 暖气团的箭头：贴着锋面往上爬
      warmArrow.position.set(S.xf - sW + 0.01, G + front(sW) * S.rise + 0.012, -0.035); warmArrow.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), up);
      grab.position.set(S.xf - 0.1, G + 0.025, 0);
      sym.position.set(S.xf, G, 0); sym.visible = S.real > 0.3;
      setReal(); shapeFlows(); placeParts(); placeClouds(); placeRain();
      tCold.loc(group, S.xf - 0.1, G + 0.03, 0.06); tWarm.loc(group, S.xf + 0.07, G + 0.05, -0.02);
      tFront.loc(group, S.xf - 0.05, G + front(0.05) * S.rise + 0.012, 0.075); tLine.loc(group, S.xf + 0.006, G + 0.004, ZD - 0.005);
      tHint.loc(group, S.xf - 0.12, G + 0.06, 0.04).show(S.pushed < 0.05 && S.rise > 0.9);
    };

    // ---- 推冷气团：按住锋面后面的冷空气，在地面上往右拖 ----
    const plane = new THREE.Plane(), hit = new THREE.Vector3(), wq = new THREE.Vector3();
    let x0 = 0, xf0 = 0;
    const onGround = (ray) => { group.updateMatrixWorld(); group.getWorldPosition(wq); plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), wq); if (!ray.intersectPlane(plane, hit)) return null; return group.worldToLocal(hit.clone()).x; };
    const pointer = {
      down(rc) {
        if (S.rise < 0.95) return false;
        const hits = rc.intersectObjects([grab, cold, coldArrow], true); if (!hits.length) return false;
        const x = onGround(rc.ray); if (x == null) return false;
        S.drag = true; x0 = x; xf0 = S.xf; document.getElementById('c').style.cursor = 'grabbing'; return true;
      },
      move(rc) {
        if (!S.drag) { const c = document.getElementById('c'); if (c && S.rise > 0.95) c.style.cursor = rc.intersectObjects([grab, cold, coldArrow], true).length ? 'grab' : ''; return false; }
        const x = onGround(rc.ray); if (x == null) return true;
        const nx = Math.min(X1, Math.max(X0, xf0 + (x - x0)));
        S.v = nx - S.xf; S.xf = nx; S.pushed = Math.max(S.pushed, (S.xf - X0) / (X1 - X0)); if (S.pushed > 0.04) S.going = true;          // 一推就开始变真实（update 里一秒铺开）
        layout(); progress(); return true;
      },
      up() { if (!S.drag) return false; S.drag = false; document.getElementById('c').style.cursor = ''; return true; },
    };
    const said = new Set();
    const progress = () => {
      if (!W) return;
      const say = (k, m) => { if (!said.has(k)) { said.add(k); W.ui.status(m); } };
      if (S.pushed > 0.04) say('in', '冷空气重，贴着地面往前插，钻到暖空气<b>下面</b>；暖空气被迫沿着锋面<b>往上爬</b>。');
      if (S.pushed > 0.3) say('cloud', '暖空气越抬越高、越来越冷，里面的水汽凝结成<b>云</b>。冷锋的锋面贴地的地方很陡，云就在锋线附近长得又高又厚。');
      if (S.pushed > 0.7) { say('rain', '云长够了，开始下<b>雨</b>：雨落在锋线<b>后面</b>，落在冷气团这一侧。'); W.goal.done('push'); }
    };

    layout();
    return {
      group,
      card: false,          // 和化学一样：直接立在书页上，不垫台板
      size: { w: 0.36, d: 0.13, h: 0.22 },
      view: { elev: 10, azim: 20, lookY: 0.42, frameMargin: 1.02 },          // 镜头放低：锋面、云塔往上长，看得出高          // 从右前方略低处看：近处那一面就是冷空气楔子的剖面
      pointer,
      mount(ui) {
        W = { ui, goal: goals(ui, [['push', '按住冷气团往右推，看云和雨出现在哪里']]) };
        ui.controls.append(note('这是教学模型：锋面的高度放大了几十倍。真实的冷锋坡度约 1:50 到 1:100（课本没写数值，取自气象教材），只表示冷暖空气的关系。'));
        ui.status('这是课本图 3.2：冷、暖两种气团相遇，交界面叫<b>锋面</b>，锋面和地面交成的线叫<b>锋线</b>。按住左边的<b>冷气团</b>，往右推。');
      },
      update(dt) {
        S.t += dt;
        if (S.rise < 1) { S.rise = Math.min(1, S.rise + dt / 1.1); layout(); return; }          // 打开时：锋面从书页上立起来
        if (S.going && S.real < 1) { S.real = Math.min(1, S.real + dt / 0.9); setReal(); sym.visible = S.real > 0.3; }
        placeParts(); placeRain();
      },
    };
  },
};
