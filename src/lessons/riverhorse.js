// 数学 八年级上册 综合与实践 最短路径问题 · 牧民饮马（课本 PDF 第 101–102 页，图 1–4）。小样：只做学生的那一下。
// 一块草原立在书上，一条笔直的河横穿过去。蒙古包 A、羊圈 B 在河的同一边。
// 学生拖着马沿河边走，A→C→B 的路程实时在变，河里一根根标杆记下走过的每一处（杆越高路越远）；
// 把羊圈那一块（C、羊圈 B、B 到河边的垂足 H 围成的三角形）沿河折过去，B 落到 B′，CB′ 和 CB 一样长；
// 再拖着马走，A、C、B′ 连成一条直线的那一处就是最短——两点之间，线段最短。正好是最低的那根标杆。
import * as THREE from 'three';
import { add, sub, mul, unit, dist, clamp, lerp, easeOut } from './kit/sheet.js';
import { draggable } from './kit/interact.js';
import { sfx, audio } from './kit/audio.js';

const G = 0.02;                                   // 河岸顶面高
const RV0 = -0.024;                               // 河：v 从 −0.024 到 0；河边 l 就是 v = 0 那条岸线（A、B 这一边）
const WATER = G - 0.0045;                         // 水面高
const A = [-0.07, 0.045], B = [0.08, 0.09], H = [B[0], 0], B2 = [B[0], -B[1]];   // 蒙古包、羊圈、垂足、羊圈关于 l 的对称点
const KM = 10;                                    // 1 个单位 = 10 千米
const C_MIN = -0.15, C_MAX = 0.15;
const P3 = (p, y = 0) => new THREE.Vector3(p[0], y, -p[1]);
const len = (c) => dist(A, [c, 0]) + dist([c, 0], B);
const CSTAR = A[0] + ((B2[0] - A[0]) * A[1]) / (A[1] - B2[1]);   // A→B′ 和 l 的交点
// 草原的轮廓：不规则的一块地（u 向右，v 向里）
const OUTLINE = [[-0.188, -0.09], [-0.16, -0.116], [-0.1, -0.108], [-0.05, -0.124], [0.02, -0.112], [0.09, -0.126], [0.15, -0.11], [0.19, -0.082], [0.183, -0.04], [0.196, 0.01], [0.187, 0.06], [0.172, 0.104], [0.12, 0.126], [0.05, 0.116], [-0.02, 0.134], [-0.09, 0.12], [-0.15, 0.13], [-0.19, 0.098], [-0.18, 0.05], [-0.196, -0.02], [-0.184, -0.058]];

export default {
  id: 'riverhorse',
  fig: '图2',
  title: '最短路径问题',
  flow: 'explore',
  ask: '牧民从蒙古包 A 出发，到河边饮马，再去羊圈 B。<br>到河边哪里饮马，走的路最短？',
  need: '拖着马沿河边走，看路程怎么变。',
  conclusion: {
    page: 101, rect: [60, 40, 490, 262],
    quote: '在任务 1 中，点 A，B 在直线 l 的同侧，你能利用轴对称，把这个问题转化为（1）中的问题吗？',
    why: '把羊圈那一块沿河边 l 折过去：B 落到 B′。C 在折痕 l 上，所以 CB′ 和 CB 一样长，AC + CB = AC + CB′。A 和 B′ 在河的两边：两点之间，线段最短，C 落在 AB′ 和 l 的交点上时路程最短。',
    src: '课本 · 综合与实践 最短路径问题（牧民饮马问题，图 1–4）',
  },

  create({ aim }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    let ui = null, dead = false;
    const T0 = performance.now(), now = () => (performance.now() - T0) / 1000;
    const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    const basic = (o) => new THREE.MeshBasicMaterial(o);
    const lit = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o });
    const quiet = (m) => { m.raycast = () => {}; m.userData.noFrame = true; return m; };
    const solid = (m) => { m.castShadow = true; m.receiveShadow = true; m.raycast = () => {}; m.userData.noFrame = true; return m; };
    const GOLD = 0xe8890c, IMG = 0x3f7fd0, INK = 0x2b3542;

    // ================= 草原：一块不规则的地，河从中间笔直地穿过去，切面露出泥土和河水 =================
    const curve = new THREE.CatmullRomCurve3(OUTLINE.map(([u, v]) => new THREE.Vector3(u, v, 0)), true, 'centripetal');
    const outline = curve.getPoints(180).slice(0, -1).map((p) => [p.x, p.y]);
    const clipV = (poly, c, above) => { const out = [], inside = (p) => (above ? p[1] >= c : p[1] <= c);
      for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], ia = inside(a), ib = inside(b); if (ia) out.push(a); if (ia !== ib) { const t = (c - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, c]); } }
      return out; };
    const slab = (poly, top, mats, bt = 0.0012) => { const g = new THREE.ExtrudeGeometry(new THREE.Shape(poly.map(([u, v]) => new THREE.Vector2(u, v))), { depth: top - 2 * bt, bevelEnabled: true, bevelThickness: bt, bevelSize: bt, bevelSegments: 2, steps: 1 }); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, mats); m.position.y = bt; m.receiveShadow = true; m.raycast = () => {}; m.userData.qaSupport = true; group.add(m); return m; };
    const grassTex = tex(1024, 1024, (g, w, h) => { g.fillStyle = '#d3dea6'; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 70; k++) { const x = Math.random() * w, y = Math.random() * h, r = 60 + Math.random() * 140, gr = g.createRadialGradient(x, y, 0, x, y, r), dry = Math.random() < 0.45; gr.addColorStop(0, dry ? 'rgba(226,220,168,0.3)' : 'rgba(170,192,118,0.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
      for (let k = 0; k < 9000; k++) { g.fillStyle = `rgba(${100 + Math.random() * 50},${128 + Math.random() * 40},${60 + Math.random() * 20},${Math.random() * 0.09})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 2 + Math.random() * 4); } });
    grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping; grassTex.repeat.set(2.4, 2.4);
    const grass = lit({ map: grassTex, roughness: 0.95 }), soil = lit({ color: 0x9a7552, roughness: 0.95 });
    slab(clipV(outline, 0, true), G, [grass, soil]);           // 河这一边（A、B 所在的岸）
    slab(clipV(outline, RV0, false), G, [grass, soil]);        // 河那一边
    const waterTop = new THREE.MeshPhysicalMaterial({ color: 0x77a9bd, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.08 }), waterSide = lit({ color: 0x5b8ea4, roughness: 0.3 });
    slab(clipV(clipV(outline, RV0, true), 0, false), WATER, [waterTop, waterSide], 0.0006);
    { // 草丛：撒一些低低的小草，躲开河和几处地标
      const inPoly = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
      const N = 200, tuft = new THREE.InstancedMesh(new THREE.ConeGeometry(0.0014, 0.0042, 5), lit({ color: 0x93ad62, roughness: 1 }), N), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      let k = 0;
      for (let tries = 0; k < N && tries < 6000; tries++) { const p = [(Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.3];
        if (!inPoly(p, outline) || (p[1] > RV0 - 0.006 && p[1] < 0.008) || dist(p, A) < 0.024 || dist(p, B) < 0.026 || dist(p, B2) < 0.03) continue;
        e.set((Math.random() - 0.5) * 0.4, Math.random() * 6, (Math.random() - 0.5) * 0.4); q.setFromEuler(e); const s = 0.7 + Math.random() * 0.8;
        m4.compose(new THREE.Vector3(p[0], G + 0.0014 * s, -p[1]), q, new THREE.Vector3(s, s, s)); tuft.setMatrixAt(k++, m4); }
      tuft.count = k; tuft.castShadow = true; tuft.raycast = () => {}; tuft.userData.noFrame = true; group.add(tuft);
    }
    // 蒙古包 A
    const felt = lit({ color: 0xf3efe6, roughness: 0.8 });
    { const s = 1.5, g2 = new THREE.Group(); const wall = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0085 * s, 0.0085 * s, 0.0062 * s, 28), felt)); wall.position.y = 0.0031 * s; const roof = solid(new THREE.Mesh(new THREE.ConeGeometry(0.0094 * s, 0.0052 * s, 28), felt)); roof.position.y = 0.0062 * s + 0.0026 * s; const band = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.00862 * s, 0.00862 * s, 0.0008 * s, 28), lit({ color: 0xb8553e }))); band.position.y = 0.0046 * s; const door = solid(new THREE.Mesh(new THREE.BoxGeometry(0.0036 * s, 0.0044 * s, 0.0008), lit({ color: 0xa8432f }))); door.position.set(0, 0.0022 * s, 0.0085 * s); g2.add(wall, roof, band, door); g2.position.copy(P3(A, G)); group.add(g2); }
    // 羊圈 B：一圈木桩、几只羊
    const pen = (p, mat, sheepMat) => { const g2 = new THREE.Group(), R = 0.012; for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2, post = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0006, 0.0006, 0.006, 6), mat)); post.position.set(Math.cos(a) * R, 0.003, Math.sin(a) * R); g2.add(post); }
      for (const y of [0.0028, 0.0048]) { const rail = solid(new THREE.Mesh(new THREE.TorusGeometry(R, 0.00035, 6, 48).rotateX(Math.PI / 2), mat)); rail.position.y = y; g2.add(rail); }
      for (const [x, z, r] of [[-0.004, 0.003, 0.4], [0.004, -0.002, 2.2], [0.0005, 0.0055, 1.1], [-0.0015, -0.0055, 3.4], [0.006, 0.004, 5]]) { const sh = new THREE.Group(), body = solid(new THREE.Mesh(new THREE.SphereGeometry(0.0022, 12, 10), sheepMat)); body.scale.set(1.35, 0.9, 1); body.position.y = 0.0024; const head = solid(new THREE.Mesh(new THREE.SphereGeometry(0.0011, 10, 8), mat === sheepMat ? mat : lit({ color: 0x3b3430 }))); head.position.set(0.0031, 0.0029, 0); sh.add(body, head); sh.position.set(x, 0, z); sh.rotation.y = r; g2.add(sh); }
      g2.position.copy(P3(p, G)); group.add(g2); return g2; };
    pen(B, lit({ color: 0x8a6a4a }), lit({ color: 0xf6f2ea }));
    const ghostMat = lit({ color: 0x8fb0dc, transparent: true, opacity: 0.5, depthWrite: false }), ghostPen = pen(B2, ghostMat, ghostMat); ghostPen.visible = false;          // 折过去以后：羊圈的“影子”B′
    const penPick = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.014, 18), basic({ visible: false })); penPick.position.copy(P3(B, G + 0.006)); penPick.userData.pick = true; penPick.userData.noFrame = true; group.add(penPick);
    // 马：沿河边走的就是它（拖的就是这匹马），头朝着河
    const horse = new THREE.Group();
    { const s = 1.6, coat = lit({ color: 0x8e5f3e, roughness: 0.6 }), dark = lit({ color: 0x3e2a1f, roughness: 0.7 }), hz = new THREE.Group(); hz.scale.setScalar(s);
      const body = solid(new THREE.Mesh(new THREE.CapsuleGeometry(0.0021, 0.0058, 6, 12).rotateZ(Math.PI / 2), coat)); body.position.y = 0.0062;
      const neck = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0011, 0.0015, 0.0052, 10), coat)); neck.position.set(0.0042, 0.0082, 0); neck.rotation.z = -0.75;
      const head = solid(new THREE.Mesh(new THREE.BoxGeometry(0.0042, 0.0018, 0.0018), coat)); head.position.set(0.0068, 0.0094, 0); head.rotation.z = -0.55;
      const mane = solid(new THREE.Mesh(new THREE.BoxGeometry(0.0006, 0.0042, 0.0007), dark)); mane.position.set(0.0036, 0.0088, 0); mane.rotation.z = -0.75;
      const tail = solid(new THREE.Mesh(new THREE.ConeGeometry(0.0008, 0.0048, 8), dark)); tail.position.set(-0.0058, 0.0052, 0); tail.rotation.z = -0.4;
      hz.add(body, neck, head, mane, tail);
      for (const [x, z] of [[0.0026, 0.0012], [0.0026, -0.0012], [-0.0026, 0.0012], [-0.0026, -0.0012]]) { const leg = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.00048, 0.00042, 0.0044, 6), dark)); leg.position.set(x, 0.0022, z); hz.add(leg); }
      horse.add(hz); }          // 侧着身子沿河走：往哪边拖，头就朝哪边
    group.add(horse);
    let face = 0;
    const horsePick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 16), basic({ visible: false })); horsePick.userData.pick = true; horsePick.userData.noFrame = true; group.add(horsePick);

    // ================= 数学：路、河边 l、折过去的那一块、记录的标杆 =================
    const beamTex = tex(64, 4, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); for (const [o, a] of [[0, 0], [0.2, 0.25], [0.38, 0.85], [0.5, 1], [0.62, 0.85], [0.8, 0.25], [1, 0]]) gr.addColorStop(o, `rgba(255,255,255,${a})`); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    beamTex.colorSpace = THREE.NoColorSpace;
    const ribbon = (pts, hw, dash) => { const out = [], uvs = []; let acc = 0; const push = (p, q, n) => { out.push(p[0] + n[0], 0, -(p[1] + n[1]), p[0] - n[0], 0, -(p[1] - n[1]), q[0] + n[0], 0, -(q[1] + n[1]), q[0] + n[0], 0, -(q[1] + n[1]), p[0] - n[0], 0, -(p[1] - n[1]), q[0] - n[0], 0, -(q[1] - n[1])); uvs.push(0, 0.5, 1, 0.5, 0, 0.5, 0, 0.5, 1, 0.5, 1, 0.5); };
      for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], d = sub(b, a), l = Math.hypot(...d); if (l < 1e-7) continue; const n = [(-d[1] / l) * hw, (d[0] / l) * hw];
        if (!dash) push(a, b, n); else { let t = 0; while (t < l - 1e-9) { const ph = (acc + t) % (dash * 2), on = ph < dash, step = Math.max(1e-6, Math.min(l - t, on ? dash - ph : dash * 2 - ph)); if (on) push(add(a, mul(d, t / l)), add(a, mul(d, (t + step) / l)), n); t += step; } acc += l; } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); return g; };
    const line = (parent, color, w, y, o = 1, dash = 0, order = 5) => { const m = quiet(new THREE.Mesh(new THREE.BufferGeometry(), basic({ color, map: beamTex, transparent: true, opacity: o, depthWrite: false, side: THREE.DoubleSide }))); m.position.y = y; m.renderOrder = order; m.userData.w = w * 2.4; m.userData.dash = dash; m.visible = false; parent.add(m); return m; };
    const setLine = (m, pts) => { if (!pts) { m.visible = false; return; } m.geometry.dispose(); m.geometry = ribbon(pts, m.userData.w / 2, m.userData.dash); m.visible = true; };
    const L = { l: line(group, 0x2f86e8, 0.0008, G + 0.0011, 0.9, 0.004), ac: line(group, GOLD, 0.0016, G + 0.0013), cb: line(group, GOLD, 0.0016, G + 0.0013), hb: line(group, INK, 0.0006, G + 0.0012, 0.55, 0.0025), ab2: line(group, 0xffb340, 0.0075, G + 0.0012, 0, 0, 4), t1: line(group, GOLD, 0.0012, G + 0.0015), t2: line(group, IMG, 0.0012, G + 0.0024, 1, 0, 8) };
    setLine(L.l, [[-0.2, 0.0012], [0.2, 0.0012]]);
    // 羊圈那一块：C、H、B 围成的三角形，放在一个绕河边 l（x 轴）转的组里——折过去，B 落到 B′
    const fold = new THREE.Group(); fold.position.y = G + 0.0018; group.add(fold);
    const paper = new THREE.Mesh(new THREE.BufferGeometry(), lit({ color: 0xfbf6ea, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, roughness: 0.9, emissive: 0xfbf6ea, emissiveIntensity: 0.25 })); paper.renderOrder = 6; paper.userData.pick = true; paper.userData.noFrame = true; fold.add(paper);
    const F = { cb: line(fold, IMG, 0.0016, 0.0003, 1, 0, 8), hb: line(fold, INK, 0.0006, 0.0002, 0.7, 0, 7), sq: line(fold, INK, 0.0005, 0.0002, 0.7, 0, 7) };
    const dot = quiet(new THREE.Mesh(new THREE.RingGeometry(0.0022, 0.0034, 28).rotateX(-Math.PI / 2), basic({ color: IMG, transparent: true, depthWrite: false, side: THREE.DoubleSide }))); dot.position.set(B[0], 0.0004, -B[1]); dot.renderOrder = 8; fold.add(dot);
    fold.visible = false;
    // 字：和课本插图一样的字母、读数
    const measure = (font, txt) => { const g = document.createElement('canvas').getContext('2d'); g.font = font; return g.measureText(txt).width; };
    const labTex = (txt, col, px = 64) => { const f = /^[A-Z]′?$|^l$/.test(txt) ? `italic 500 ${px * 1.08}px "Times New Roman",serif` : `600 ${px}px "Times New Roman","Songti SC","STSong",serif`; return tex(Math.ceil(measure(f, txt)) + 40, Math.round(px * 1.5), (g, w, h) => { g.font = f; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = px * 0.14; g.strokeStyle = 'rgba(255,253,248,0.92)'; g.strokeText(txt, w / 2, h / 2 + 2); g.fillStyle = col; g.fillText(txt, w / 2, h / 2 + 2); }); };
    const label = (hgt) => { const sp = quiet(new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }))); sp.renderOrder = 20; sp.userData.h = hgt; sp.userData.k = ''; group.add(sp); sp.visible = false; return sp; };
    const setLabel = (sp, txt, col, p, y) => { if (!txt) { sp.visible = false; return; } if (sp.userData.k !== txt + col) { sp.userData.k = txt + col; const t = labTex(txt, col); sp.material.map?.dispose?.(); sp.material.map = t; sp.material.needsUpdate = true; sp.scale.set((sp.userData.h * t.image.width) / t.image.height, sp.userData.h, 1); } sp.position.copy(P3(p, y)); sp.visible = true; };
    const LB = { A: label(0.012), B: label(0.012), B2: label(0.012), C: label(0.012), l: label(0.011), km: label(0.0105) };
    // 记录：马走到哪儿，就在旁边的河里插一根标杆，杆越高路越远（只记学生自己走过的地方）
    const POSTS = 38, PV = RV0 + 0.007, HGT = (l) => 0.003 + (l - 0.2) * 0.26;
    const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.00055, 0.00055, 1, 6), lit({ color: 0xa88560 }), POSTS), caps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0013, 10, 8), lit({ color: 0xf0a33a, emissive: 0x6a3a00, emissiveIntensity: 0.3 }), POSTS);
    for (const m of [posts, caps]) { m.count = 0; m.castShadow = true; m.raycast = () => {}; m.userData.noFrame = true; m.frustumCulled = false; group.add(m); }
    const seen = new Map();          // 第几格 → 路程
    const slot = (c) => Math.round((c - C_MIN) / ((C_MAX - C_MIN) / (POSTS - 1)));
    const slotC = (i) => C_MIN + (i * (C_MAX - C_MIN)) / (POSTS - 1);
    function drawPosts(big = 1) { const m4 = new THREE.Matrix4(); let k = 0, minL = 9, minI = -1; for (const [i, l] of seen) if (l < minL) { minL = l; minI = i; }
      for (const [i, l] of seen) { const c = slotC(i), top = G + HGT(l); m4.compose(new THREE.Vector3(c, (WATER + top) / 2, -PV), new THREE.Quaternion(), new THREE.Vector3(1, top - WATER, 1)); posts.setMatrixAt(k, m4); m4.compose(new THREE.Vector3(c, top, -PV), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1).multiplyScalar(i === minI && seen.size > 6 ? 1.5 * big : 1)); caps.setMatrixAt(k, m4); k++; }
      posts.count = caps.count = k; posts.instanceMatrix.needsUpdate = caps.instanceMatrix.needsUpdate = true; }

    // ================= 状态 =================
    const fresh = () => ({ c: -0.11, flip: 0, flipped: false, straight: false, beat: 'walk', held: '' });
    let S = fresh(), grabR = 0.05, punchAt = -9;
    function layout() {
      const C = [S.c, 0];
      horse.position.copy(P3([S.c, 0.004], G)); horsePick.position.copy(P3(C, G + 0.008));
      setLine(L.ac, [A, C]); setLine(L.cb, [C, B]);
      // 羊圈那一块：三角形 C-H-B，组绕 l 转 flip·180°
      fold.visible = S.beat !== 'walk'; fold.rotation.x = S.flip * Math.PI;
      if (fold.visible) {
        paper.geometry.dispose(); const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([C[0], 0, -C[1], H[0], 0, -H[1], B[0], 0, -B[1]], 3)); tri.computeVertexNormals(); paper.geometry = tri;
        setLine(F.cb, S.flip > 0.02 ? [C, B] : null); setLine(F.hb, [H, B]);
        const s = 0.006, dx = Math.sign(C[0] - H[0]) || 1; setLine(F.sq, Math.abs(C[0] - H[0]) > s * 1.5 ? [[H[0] + dx * s, 0], [H[0] + dx * s, s], [H[0], s]] : null);
      }
      setLine(L.hb, S.flipped ? [H, B] : null);
      ghostPen.visible = S.flipped;
      const l = len(S.c);
      setLabel(LB.A, 'A', '#1f2a3a', add(A, [-0.017, 0.008]), G + 0.016); setLabel(LB.B, 'B', '#1f2a3a', add(B, [0.019, 0.008]), G + 0.012);
      setLabel(LB.B2, S.flipped ? 'B′' : '', '#2f62a8', add(B2, [0.02, 0.004]), G + 0.012);
      setLabel(LB.C, 'C', '#1f2a3a', add(C, [0.009, 0.016]), G + 0.016); setLabel(LB.l, 'l', '#2f6fbf', [0.172, 0.009], G + 0.004);
      setLabel(LB.km, `${(l * KM).toFixed(2)} 千米`, S.straight ? '#b4460a' : '#5a3d16', [S.c, PV - 0.006], G + HGT(l) + 0.012);
      if (S.flipped) { const tick = (p, q) => { const m = mul(add(p, q), 0.5), n = mul(unit([-(q[1] - p[1]), q[0] - p[0]]), 0.0032); return [sub(m, n), add(m, n)]; }; setLine(L.t1, tick(C, B)); setLine(L.t2, tick(C, B2)); }
      else { setLine(L.t1, null); setLine(L.t2, null); }
      setLine(L.ab2, S.straight ? [A, B2] : null);
    }
    function say(txt) { if (ui?.status) ui.status(txt); }

    // ================= 动手 =================
    function horseDown() { if (S.held === 'fold') return false; S.held = 'horse'; return true; }
    function horseMove(q) {
      if (S.held !== 'horse') return; let c = clamp(q[0], C_MIN, C_MAX);
      if (S.flipped && Math.abs(c - CSTAR) < 0.004) c = CSTAR;          // 拉成一条直线时吸住
      if (Math.abs(c - S.c) > 1e-5) face = c > S.c ? 0 : Math.PI;
      S.c = c;
      const i = slot(c); if (!seen.has(i)) { seen.set(i, len(slotC(i))); drawPosts(); sfx.clink({ freq: 900 + (0.35 - len(c)) * 2200, gain: 0.015 }); }
      const was = S.straight; S.straight = S.flipped && c === CSTAR; if (S.straight && !was) straightened();
      if (S.beat === 'walk' && seen.size >= 14) { S.beat = 'fold'; say('标杆最低的地方，路最短。要是羊圈在河对岸，拉一条直线就行——按住羊圈这一块，沿河折过去'); }
      layout();
    }
    function horseUp() { if (S.held === 'horse') S.held = ''; }
    function foldDown(p) { if (S.beat !== 'fold' || S.flipped) return false; S.held = 'fold'; grabR = Math.max(0.025, p[1]); sfx.whoosh({ dur: 0.2, freq: 1600, gain: 0.03 }); return true; }
    function foldMove(p) { if (S.held !== 'fold') return; S.flip = Math.acos(clamp(p[1] / grabR, -1, 1)) / Math.PI; layout(); }          // 手在地上的位置 = 抓住那一点落在地上的影子
    function foldUp() {
      if (S.held !== 'fold') return; S.held = ''; const to = S.flip > 0.5 ? 1 : 0, from = S.flip, t0 = now();
      const step = () => { if (dead) return; const k = clamp((now() - t0) / 0.35, 0, 1); S.flip = lerp(from, to, easeOut(k)); layout(); if (k < 1) requestAnimationFrame(step); else if (to === 1) { S.flipped = true; S.beat = 'straight'; sfx.clink({ freq: 1400, gain: 0.05 }); layout(); say('B 落到了 B′。C 在折痕上，CB′ 和 CB 一样长：AC + CB = AC + CB′。再拖着马走，把这条折线拉直'); } };
      step();
    }
    function straightened() { punchAt = now(); sfx.ding(1320, { gain: 0.07 }); say('A、C、B′ 连成一条直线：两点之间，线段最短。这里饮马路最短——正是最低的那根标杆'); }

    const uv = (p) => [p.x, -p.z];
    const foldDrag = (obj) => ({ obj, plane: 'xz', offset: G + 0.002, enabled: () => S.beat === 'fold' && !S.flipped, onStart: (p) => foldDown(uv(p)), onDrag: (p) => foldMove(uv(p)), onEnd: () => foldUp() });
    const drags = [
      { obj: horsePick, plane: 'xz', offset: G + 0.004, onStart: () => horseDown(), onDrag: (p) => horseMove(uv(p)), onEnd: () => horseUp() },
      foldDrag(penPick), foldDrag(paper),
    ];
    const dragApi = draggable(group, drags, { onClick: () => false });
    let heard = false;
    const pointer = { down: (r, e) => { if (!heard) { heard = true; audio(); } return dragApi.down(r, e); }, move: (r, e) => dragApi.move(r, e), up: (r, e) => dragApi.up(r, e), items: dragApi.items };
    function reset() { S = fresh(); seen.clear(); drawPosts(); layout(); say('拖着马沿河边走：在哪儿饮马，走的路最短？'); }
    const onKey = (e) => { if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !e.target?.closest?.('input,textarea')) reset(); };
    addEventListener('keydown', onKey);

    layout();
    const DIR = [0, Math.sin(0.9), Math.cos(0.9)];
    return {
      group: root, card: false, place: 'spread', scale: 0.95,
      size: { w: 0.39, d: 0.3, h: 0.05 },
      view: { elev: 52, azim: 0, lookY: 0.2, frameMargin: 1.05 },
      pointer,
      mount(u) { ui = u; ui.go?.(1); say('拖着马沿河边走：在哪儿饮马，走的路最短？'); requestAnimationFrame(() => aim?.(DIR)); setTimeout(() => { if (!dead) aim?.(DIR); }, 700); },
      dispose() { dead = true; removeEventListener('keydown', onKey); },
      update() {
        const t = now();
        paper.material.opacity = S.beat === 'fold' && !S.held ? 0.45 + 0.3 * Math.sin(t * 3.2) ** 2 : 0.6;
        const k = clamp((t - punchAt) / 0.9, 0, 1);          // 拉直的那一下：亮一下再收住
        L.ab2.material.opacity = S.straight ? 0.45 + 0.5 * (1 - k) : 0;
        horse.rotation.y += (face - horse.rotation.y) * 0.2;
        if (S.straight && k < 1) drawPosts(1 + 0.8 * Math.sin(k * Math.PI));
      },
      debug: {
        get S() { return S; }, seen, CSTAR, len,
        qa: [
          { name: '拖着马沿河走一遍', run: () => { horseDown(); for (let k = 0; k <= 40; k++) horseMove([C_MIN + ((C_MAX - C_MIN) * k) / 40, 0]); horseUp(); }, wait: 1 },
          { name: '把羊圈那一块折过去', run: () => { if (!foldDown(B)) return; foldMove([B[0], -B[1]]); foldUp(); }, wait: 1 },
          { name: '拉成一条直线', run: () => { horseDown(); horseMove([CSTAR + 0.002, 0]); horseUp(); }, wait: 1.2 },
        ],
      },
    };
  },
};
