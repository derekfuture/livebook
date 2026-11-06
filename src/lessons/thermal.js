// 高中地理 必修第一册 第二章第二节 大气受热过程和大气运动 · 大气热力环流（课本第 36 页，图 2.11 热力环流的形成示意）。
//
// 课本的图就是模型：图 2.11 是一个竖直剖面（地面 B、A、C，上面几条等压面）。这里是一个立在书页上的“空气槽”：
// 底下是地面，里面是一粒粒空气，横穿着几张等压面（课本注：等压面是空间中气压相等的各点所组成的“面”，所以画成一张张面）。
// 开始地面受热均匀，空气不动，等压面是平的（图 2.11 a）。学生按住地面某处给它加热：那里的空气膨胀上升，上空的等压面先向上拱
// （上空高压，图 2.11 b），上空空气向两边流；接着近地面的等压面向下凹（近地面低压），近地面的空气从两边流回来，热力环流成了（图 2.11 c）。
// 换个情境：课本开头的问题——台湾海峡两岸，“内地之风，早西晚东，惟台地早东风，午西风”。福建 | 海峡 | 台湾，拖一天的时刻，
// 陆地白天增温快、夜晚降温快，两岸的风一天里反过来。
// 教学示意：竖直方向、温差、风速都是示意；时间加快了。
import * as THREE from 'three';
import { seg, buttons, note, slider } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { h } from '../ui/Panel.js';
import { XL, XR, H, N, xOf, iOf, makeState, step, field, steady, isobar, pressure, seaLandTemp, windName, isLand, COAST_W, COAST_E } from './kit/thermal.js';

const LIFT = 0, GT = 0.026, D = 0.035;          // 直接放在书页上；地面多厚、空气槽前后多深
const ZK = [0.2, 0.42, 0.64, 0.86].map((r) => r * H);          // 四张等压面原来的高度
const ABC = { B: -0.12, A: 0, C: 0.12 };
const ASK = {
  free: ['先猜一下（可以不猜）：在这个情境里，A 地受热以后，近地面的风会——', ['从 A 吹向 B、C', '从 B、C 吹向 A', '不起风']],
  sea: ['先猜一下（可以不猜）：在这个情境里，下午，福建沿海吹——', ['东风（从海上吹来）', '西风（从陆上吹来）']],
};
const rnd = (() => { let s = 5; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

export default {
  id: 'thermal',
  fig: '图2.11',
  title: '大气热力环流',
  flow: 'explore',
  ask: '《台海使槎录》里说，台湾海峡两岸：“内地之风，早西晚东，惟台地早东风，午西风。”为什么两岸风向的日变化正好相反？',
  need: '给 A 地加热，看热力环流一步步形成；再到台湾海峡，看两岸早上、下午的风',
  conclusion: {
    page: 40,
    quote: '由于地面冷热不均而形成的空气环流，称为大气热力环流。……当A地接受热量多，B、C两地接受热量少时，A地近地面空气膨胀上升，到上空聚积，使上空空气密度增大，形成高气压；B、C两地空气收缩下沉，上空空气密度减小，形成低气压（图2.11b）。于是空气从气压高的A地上空向气压低的B、C两地上空扩散。在近地面，A地空气上升向外流出后，空气密度减小，形成低气压；B、C两地因有下沉气流，空气密度增大，形成高气压。这样近地面的空气从B、C两地流回A地，以补充A地上升的空气，从而形成了热力环流（图2.11c）。……台湾海峡两岸风向的日变化，反映了海陆间大气热力环流的日变化。',
    why: '受热的地方空气膨胀上升，冷的地方空气收缩下沉。同一高度上，受热处上空空气多、气压高，近地面空气少、气压低；冷处正好相反。空气在同一高度上总是从气压高处流向气压低处，于是上空从热处流向冷处，近地面从冷处流回热处，转成一个圈。海陆之间：白天陆地增温快，陆地上升、海上下沉，近地面风从海上吹向陆地；夜晚陆地降温快，反过来，风从陆地吹向海上。福建在海峡西边，下午海风是东风、早上陆风是西风；台湾在海峡东边，正好相反。',
    src: '课本第 34、36、38 页 · 第二章 第二节 大气受热过程和大气运动',
  },

  create({ tag }) {
    const group = new THREE.Group();
    const S = { mode: 'free', hour: 6, play: false, heat: null, t: 0, st: makeState(), logs: { free: [], sea: {} }, guess: {}, done: new Set() };
    let W = null;
    const block = new THREE.Group(); block.position.y = LIFT; group.add(block);
    const LINE = new THREE.LineBasicMaterial({ color: 0x2a3140, transparent: true, opacity: 0.4 });
    const lit = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.15, roughness: 0.95, metalness: 0, ...o });

    // ---- 影子、取景框 ----
    const shadowTex = canvasTex(256, 128, (g, w, hh) => { const gr = g.createRadialGradient(w / 2, hh / 2, 0, w / 2, hh / 2, w / 2); gr.addColorStop(0, 'rgba(60,45,30,0.45)'); gr.addColorStop(0.6, 'rgba(60,45,30,0.16)'); gr.addColorStop(1, 'rgba(60,45,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, hh); });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry((XR - XL) * 1.25, D * 2 * 2.2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.0006; shadow.raycast = () => {}; shadow.userData.noFrame = true; group.add(shadow);
    const frameBox = new THREE.Mesh(new THREE.BoxGeometry(XR - XL, GT + H, D * 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    frameBox.position.y = LIFT + (GT + H) / 2; frameBox.raycast = () => {}; group.add(frameBox);

    // ---- 地面：一格格的颜色跟着地面温度变（冷蓝、暖橙）；台湾海峡那个情境里中间是海 ----
    const strata = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL || '/'}tex/geo/strata-side.jpg`); strata.colorSpace = THREE.SRGBColorSpace; strata.wrapS = THREE.RepeatWrapping;
    const sm = (rep, c) => { const t = strata.clone(); t.wrapS = THREE.RepeatWrapping; t.repeat.set(rep, 0.5); return new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(c, c, c) }); };
    const soil = new THREE.Mesh(new THREE.BoxGeometry(XR - XL, GT - 0.003, D * 2), [sm(0.4, 0.9), sm(0.4, 0.78), new THREE.MeshBasicMaterial({ color: 0x8fb276 }), new THREE.MeshBasicMaterial({ color: 0x6b5236 }), sm(2.2, 0.97), sm(2.2, 0.82)]); soil.position.y = (GT - 0.003) / 2; block.add(soil);          // 地面下是一层层的岩层（手绘贴图）
    const soilE = new THREE.LineSegments(new THREE.EdgesGeometry(soil.geometry), new THREE.LineBasicMaterial({ color: 0x5a4028, transparent: true, opacity: 0.45 })); soil.add(soilE);
    const gGeo = new THREE.BoxGeometry(XR - XL, 0.003, D * 2, N, 1, 1), gCol = new Float32Array(gGeo.attributes.position.count * 3); gGeo.setAttribute('color', new THREE.BufferAttribute(gCol, 3));
    const grain = canvasTex(512, 128, (g, w, hh) => { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, hh); for (let i = 0; i < 2600; i++) { const v = 150 + Math.random() * 90; g.fillStyle = `rgba(${v},${v},${v},${0.12 + Math.random() * 0.2})`; g.fillRect(Math.random() * w, Math.random() * hh, 1.6, i % 3 ? 1.6 : 3.5); } });
    const groundTop = new THREE.Mesh(gGeo, new THREE.MeshBasicMaterial({ vertexColors: true, map: grain })); groundTop.position.y = GT - 0.0015; block.add(groundTop);          // 地面有一点点笔触质感；颜色里带着冷暖
    const cSoil = new THREE.Color(0xb9c98a), cGrass = new THREE.Color(0x8fbf66), cSea = new THREE.Color(0x5a9fcc), cHot = new THREE.Color(0xe8743a), cCold = new THREE.Color(0x6c8fd0), tmpC = new THREE.Color();
    const paintGround = () => {
      const p = gGeo.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const x = p.getX(k), i = iOf(x), th = S.st.th[i];
        tmpC.copy(S.mode === 'sea' ? (isLand(x) ? cGrass : cSea) : cSoil);
        if (th > 0) tmpC.lerp(cHot, Math.min(S.mode === 'sea' ? 0.45 : 0.8, th / 7)); else tmpC.lerp(cCold, Math.min(0.45, -th / 7));          // 海陆那个情境：陆地、海面本来的颜色要认得出，冷暖只淡淡带一点
        gCol.set([tmpC.r, tmpC.g, tmpC.b], k * 3);
      }
      gGeo.attributes.color.needsUpdate = true;
    };

    // ---- 空气槽：背板（天色，跟着时刻变；受热的那一柱空气淡淡发暖）、边框 ----
    const NB = N, backGeo = new THREE.PlaneGeometry(XR - XL, H, NB, 6), bCol = new Float32Array(backGeo.attributes.position.count * 3); backGeo.setAttribute('color', new THREE.BufferAttribute(bCol, 3));
    const back = new THREE.Mesh(backGeo, new THREE.MeshBasicMaterial({ vertexColors: true })); back.position.set(0, GT + H / 2, -D); back.raycast = () => {}; block.add(back);
    const cDay = new THREE.Color(0xdcecf7), cDayTop = new THREE.Color(0xb8d7ef), cNight = new THREE.Color(0x46557a), cNightTop = new THREE.Color(0x2a3456), cWarmAir = new THREE.Color(0xf6c7a6), cCoolAir = new THREE.Color(0xc4d4f2);
    const paintBack = () => {
      const p = backGeo.attributes.position, day = S.mode === 'sea' ? Math.max(0, Math.min(1, (Math.sin((2 * Math.PI / 24) * (S.hour - 6)) + 0.25) * 2)) : 1;
      for (let k = 0; k < p.count; k++) {
        const x = p.getX(k), r = (p.getY(k) + H / 2) / H, i = iOf(x), pr = S.st.P[i];
        tmpC.copy(cDay).lerp(cDayTop, r); const nt = new THREE.Color().copy(cNight).lerp(cNightTop, r); tmpC.lerp(nt, 1 - day);
        if (pr > 0) tmpC.lerp(cWarmAir, Math.min(0.55, pr / 6) * (1 - r * 0.6)); else tmpC.lerp(cCoolAir, Math.min(0.4, -pr / 6) * (1 - r * 0.6));
        bCol.set([tmpC.r, tmpC.g, tmpC.b], k * 3);
      }
      backGeo.attributes.color.needsUpdate = true;
    };
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(XR - XL, H, D * 2)), new THREE.LineBasicMaterial({ color: 0x7d8a99, transparent: true, opacity: 0.5 })); frame.position.y = GT + H / 2; frame.raycast = () => {}; block.add(frame);

    // ---- 等压面：一张张横穿空气槽的面；前沿一条实线，旁边一条虚线是它原来的位置 ----
    const NI = 80, sheets = ZK.map((zk) => {
      const geo = new THREE.PlaneGeometry(1, 1, NI, 1), m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x3f7fc0, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false })); m.raycast = () => {}; m.renderOrder = 4; block.add(m);
      const line = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x2f6fb0 })); line.raycast = () => {}; block.add(line);
      const dash = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(XL, GT + zk, D), new THREE.Vector3(XR, GT + zk, D)]), new THREE.LineDashedMaterial({ color: 0x8a8f98, dashSize: 0.004, gapSize: 0.003, transparent: true, opacity: 0.35 })); dash.computeLineDistances(); dash.raycast = () => {}; block.add(dash);
      return { zk, geo, m, line, dash };
    });
    const placeSheets = () => {
      for (const s of sheets) {
        const p = s.geo.attributes.position, L = [];
        for (let j = 0; j <= 1; j++) for (let i = 0; i <= NI; i++) { const x = XL + (XR - XL) * (i / NI), y = GT + isobar(S.st, s.zk, x); p.setXYZ(j * (NI + 1) + i, x, y, j ? D : -D); if (j) L.push(new THREE.Vector3(x, y, D)); }
        p.needsUpdate = true; s.geo.computeBoundingSphere(); s.line.geometry.dispose(); s.line.geometry = new THREE.BufferGeometry().setFromPoints(L);
        const bent = sheets.some((q) => Math.abs(isobar(S.st, q.zk, 0) - q.zk) > 0.0008) || S.mode === 'sea'; s.dash.visible = bent;
      }
    };

    // ---- 一粒粒空气：跟着风走（看得出上升、下沉、水平流动） ----
    const NP = 200, pPos = new Float32Array(NP * 3), pCol = new Float32Array(NP * 3), pts = Array.from({ length: NP }, () => ({ x: XL + rnd() * (XR - XL), z: rnd() * H, d: (rnd() * 2 - 1) * D * 0.9 }));
    const dotTex = canvasTex(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
    const dots = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.013, map: dotTex, vertexColors: true, transparent: true, depthWrite: false })); dots.raycast = () => {}; dots.renderOrder = 6; block.add(dots);
    const cAir = new THREE.Color(0x2f5f9e), cAirWarm = new THREE.Color(0xd0522a);          // 空气粒深一点，在浅色背板上看得清
    const moveDots = (dt) => {
      const F = field(S.st);
      for (let k = 0; k < NP; k++) {
        const q = pts[k], [u, w] = F.at(q.x, q.z);
        q.x += u * dt * 1.0 + (rnd() - 0.5) * 0.0006; q.z += w * dt * 1.0 + (rnd() - 0.5) * 0.0006;
        if (q.x < XL + 0.002) q.x = XL + 0.002; if (q.x > XR - 0.002) q.x = XR - 0.002; if (q.z < 0.002) q.z = 0.002; if (q.z > H - 0.002) q.z = H - 0.002;
        pPos.set([q.x, GT + q.z, q.d], k * 3);
        const warm = Math.max(0, Math.min(1, S.st.th[iOf(q.x)] / 6)) * Math.max(0, 1 - q.z / (H * 0.7));
        tmpC.copy(cAir).lerp(cAirWarm, warm); pCol.set([tmpC.r, tmpC.g, tmpC.b], k * 3);
      }
      pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
    };

    // ---- 风的箭头：一格格摆着，长短表示快慢 ----
    // ---- 环流：画成几个闭合的圈（流函数 ψ = Φ(x)·sin(πz/H) 的等值线），圈上几个箭头指着空气走的方向 ----
    const loopMat = new THREE.MeshBasicMaterial({ color: 0x2a5a9a, transparent: true, opacity: 0, depthWrite: false });
    const headMat = new THREE.MeshBasicMaterial({ color: 0x2a5a9a, transparent: true, opacity: 0, depthWrite: false });
    const loops = new THREE.Group(); block.add(loops); let loopT = 0;
    const GX = 68, GZ = 26;
    const contour = (psi, lev) => {          // 方格上找 ψ = lev 的线段（marching squares），再连成折线
      const segs = [], P = (i, j) => [XL + (XR - XL) * (i / GX), H * (j / GZ)];
      const lerp = (a, b, va, vb) => { const t = (lev - va) / (vb - va); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
      for (let i = 0; i < GX; i++) for (let j = 0; j < GZ; j++) {
        const v = [psi[i][j], psi[i + 1][j], psi[i + 1][j + 1], psi[i][j + 1]], c = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)], e = [];
        for (let k = 0; k < 4; k++) { const a = v[k], b = v[(k + 1) % 4]; if ((a - lev) * (b - lev) < 0) e.push(lerp(c[k], c[(k + 1) % 4], a, b)); }
        if (e.length === 2) segs.push(e); else if (e.length === 4) { segs.push([e[0], e[1]]); segs.push([e[2], e[3]]); }
      }
      const lines = [], key = (p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`;
      while (segs.length) {
        const line = segs.pop();
        for (let grow = true; grow;) { grow = false; for (let k = 0; k < segs.length; k++) { const [a, b] = segs[k], end = line[line.length - 1];
          if (key(a) === key(end)) { line.push(b); segs.splice(k, 1); grow = true; break; } if (key(b) === key(end)) { line.push(a); segs.splice(k, 1); grow = true; break; } } }
        if (line.length > 6) lines.push(line);
      }
      return lines;
    };
    const buildLoops = () => {
      for (const o of [...loops.children]) { loops.remove(o); o.geometry.dispose(); }
      const mix = { S: S.st.S.map((v, i) => (v + S.st.P[i]) / 2) }, Phi = new Float64Array(N + 1); for (let i = 0; i < N; i++) Phi[i + 1] = Phi[i] + mix.S[i] * ((XR - XL) / N);
      const psi = Array.from({ length: GX + 1 }, (_, i) => { const f = Phi[Math.round((i / GX) * N)]; return Array.from({ length: GZ + 1 }, (_, j) => f * Math.sin(Math.PI * j / GZ)); });
      let mx = 0, mn = 0; for (const r of psi) for (const v of r) { mx = Math.max(mx, v); mn = Math.min(mn, v); }
      const F = field(S.st), strength = Math.max(mx, -mn);
      loopMat.opacity = headMat.opacity = Math.min(0.85, strength * 3);
      if (strength < 0.02) return;
      for (const lev of [mx * 0.5, mn * 0.5]) {
        if (Math.abs(lev) < 0.01) continue;
        for (const line of contour(psi, lev)) {
          const pts = line.map(([x, z]) => new THREE.Vector3(x, GT + z, D * 0.55)), closed = pts[0].distanceTo(pts[pts.length - 1]) < 0.01;
          const curve = new THREE.CatmullRomCurve3(pts, closed), tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(200, pts.length * 2), 0.0011, 6, closed), loopMat); tube.raycast = () => {}; tube.renderOrder = 7; loops.add(tube);
          for (let k = 0; k < 4; k++) {          // 圈上四个箭头，方向跟着那里的风
            const p = curve.getPointAt((k + 0.5) / 4), [u, w] = F.at(p.x, p.y - GT), d = new THREE.Vector3(u, w, 0).normalize();
            const head = new THREE.Mesh(new THREE.ConeGeometry(0.0036, 0.009, 10), headMat); head.position.copy(p); head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); head.raycast = () => {}; head.renderOrder = 7; loops.add(head);
          }
        }
      }
    };
    const placeArrows = () => { if (S.t - loopT > 0.25) { loopT = S.t; buildLoops(); } };

    // ---- 标签：A、B、C；气压高低（近地面、上空）；海峡两岸 ----
    const tABC = Object.entries(ABC).map(([k, x]) => ({ x, t: tag(k, 'pill') }));
    const tP = Object.values(ABC).flatMap((x) => [{ x, aloft: false, t: tag('', 'pill') }, { x, aloft: true, t: tag('', 'pill') }]);
    const SEAX = { fj: -0.125, sea: 0.01, tw: 0.135 };
    const tSea = [['福建', SEAX.fj], ['台湾海峡', SEAX.sea], ['台湾', SEAX.tw]].map(([s, x]) => ({ x, t: tag(s, 'pill') }));
    const tPS = Object.values(SEAX).flatMap((x) => [{ x, aloft: false, t: tag('', 'pill') }, { x, aloft: true, t: tag('', 'pill') }]);
    const tHint = tag('按住地面 A 处，给它加热', 'pill'), tHeat = tag('受热', 'pill'), tScale = tag('教学示意 · 竖直方向夸大了，海峡剖面不按实际比例 · 温差、风速是示意 · 时间加快了', 'pill'), tIso = tag('等压面', 'pill');
    // 两岸的小城：房顶风向标
    const makeTown = () => {
      const t = new THREE.Group();
      for (const [x, z, w, hh] of [[-0.005, -0.004, 0.007, 0.006], [0.004, 0.004, 0.007, 0.008]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, w), lit(0xf3ede1)); b.position.set(x, hh / 2, z); t.add(b); const rg = new THREE.ConeGeometry(w * 0.78, 0.004, 4); rg.rotateY(Math.PI / 4); const r = new THREE.Mesh(rg, lit(0xc7503c)); r.position.set(x, hh + 0.002, z); t.add(r); }
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.0005, 0.0005, 0.02, 6), lit(0x555a62)); pole.position.y = 0.01; t.add(pole);
      const vane = new THREE.Group(); vane.position.y = 0.02; t.add(vane); const vm = lit(0x1f3f75);
      const sh = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.0012, 0.0012), vm); vane.add(sh); const hd = new THREE.Mesh(new THREE.ConeGeometry(0.0026, 0.006, 8), vm); hd.rotation.z = -Math.PI / 2; hd.position.x = 0.01; vane.add(hd);
      t.userData.vane = vane; t.position.y = GT; block.add(t); return t;
    };
    const towns = { fj: makeTown(), tw: makeTown() }; towns.fj.position.x = COAST_W - 0.014; towns.tw.position.x = COAST_E + 0.014;
    const tTown = { fj: tag('', 'pill'), tw: tag('', 'pill') };
    const surfU = (x) => field(S.st).at(x, H * 0.08)[0];
    const placeTags = () => {
      const free = S.mode === 'free', th = 0.8;
      for (const { x, t } of tABC) t.loc(block, x, 0.002, D + 0.006).show(free);
      for (const { x, aloft, t } of tP) { const p = pressure(S.st, x, aloft); t.loc(block, x + 0.012, GT + (aloft ? H * 0.93 : H * 0.07), D).text(p > 0 ? '高' : '低').show(free && Math.abs(p) > th); t.el.classList.toggle('hot', p > 0); }
      for (const { x, t } of tSea) t.loc(block, x, 0.002, D + 0.006).show(!free);
      for (const { x, aloft, t } of tPS) { const p = pressure(S.st, x, aloft); t.loc(block, x + 0.014, GT + (aloft ? H * 0.93 : H * 0.07), D).text(p > 0 ? '高' : '低').show(!free && Math.abs(p) > 0.5); t.el.classList.toggle('hot', p > 0); }
      for (const k of ['fj', 'tw']) {
        const tw = towns[k], u = surfU(tw.position.x), name = windName(u), fromSea = (k === 'fj') === (u < 0);
        tw.visible = !free; tw.userData.vane.rotation.y = u > 0 ? Math.PI : 0;          // 风向标的箭头指着风吹来的方向：西风指向西（−x）
        tTown[k].loc(block, tw.position.x, GT + 0.03, 0).text(`<b>${k === 'fj' ? '福建沿海' : '台湾西岸'}</b> ${name}${name === '静风' ? '' : fromSea ? '（从海上吹来）' : '（从陆上吹来）'}`).show(!free);
      }
      tHint.loc(block, 0, GT + 0.02, D).show(free && !S.heated);
      tHeat.loc(block, S.heatX ?? 0, GT - 0.012, D + 0.004).show(free && !!S.heat);          // 写在地面前沿下方，不压着“低”
      tIso.loc(block, XL + 0.03, GT + (ZK[2] + ZK[3]) / 2, D).show(true);          // 放在左边两张等压面之间，不和右上角的气压标签挤在一起
      tScale.loc(block, 0, GT + H + 0.008, -D);          // 写在空气槽顶上靠后，不压着地面的字母
    };

    // ---- 记录 ----
    const FREE_STEPS = ['受热处近地面空气膨胀上升', '上空聚积，形成高压（两边上空低压）', '上空的空气流向两边', '近地面：受热处低压，两边高压', '近地面的空气从两边流回受热处：热力环流形成了'];
    const recordFree = () => {
      if (S.mode !== 'free' || S.heatX == null) return;
      const L = S.logs.free, x = S.heatX, F = field(S.st), add = (k) => { if (!L.includes(FREE_STEPS[k])) { L.push(FREE_STEPS[k]); drawLogs(); } };
      const n = L.length;          // 一帧最多记一步：哪一步真的发生了才记
      if (n === 0 && F.at(x, H / 2)[1] > 0.012) add(0);
      else if (n === 1 && pressure(S.st, x, true) > 0.9) add(1);
      else if (n === 2 && Math.abs(F.at(x + 0.06, H * 0.92)[0]) > 0.004) add(2);
      else if (n === 3 && pressure(S.st, x, false) < -0.9) add(3);
      else if (n === 4 && Math.abs(F.at(x + 0.06, H * 0.08)[0]) > 0.004) { add(4); S.done.add('free'); drawLogs(); W?.ui.status('热力环流形成了：受热处上升、上空流向两边、两边下沉、近地面流回来（图 2.11 c）。松开以后，地面慢慢变凉，环流也会慢慢停下来。'); }
      if (n === 0 && S.heat && W && !S.saidHeat) { S.saidHeat = true; W.ui.status('正在加热：看受热处的空气、上空的等压面，再看近地面。'); }
    };
    const recordSea = () => {
      if (S.mode !== 'sea') return;
      const slot = S.hour >= 5 && S.hour <= 7 ? '早上' : S.hour >= 13 && S.hour <= 15 ? '下午' : null; if (!slot) return;
      const th = Float64Array.from({ length: N }, (_, i) => seaLandTemp(xOf(i), S.hour)), F = field(steady(th)), su = (x) => F.at(x, H * 0.08)[0];          // 按这个时刻稳定下来的风记，不记拖动途中还没转过来的风
      const u1 = windName(su(towns.fj.position.x)), u2 = windName(su(towns.tw.position.x)), prev = S.logs.sea[slot];
      if (!prev || prev.fj !== u1 || prev.tw !== u2) { S.logs.sea[slot] = { fj: u1, tw: u2 }; if (S.logs.sea['早上'] && S.logs.sea['下午']) S.done.add('sea'); drawLogs(); }
    };
    const drawLogs = () => {
      if (!W) return;
      const L = S.logs.free, sea = S.logs.sea, rows = [];
      rows.push(h('div', { class: 'tl-row' }, h('b', {}, '地面受热不均：'), h('span', {}, L.length ? L.join(' → ') : '还没加热'),
        L.length >= 5 && S.guess.free != null ? h('small', {}, `你猜：${ASK.free[1][S.guess.free]}　实际：近地面的风从两边吹向受热处`) : null));
      const s = (k) => (sea[k] ? `福建沿海 ${sea[k].fj}，台湾西岸 ${sea[k].tw}` : '还没看');
      rows.push(h('div', { class: 'tl-row' }, h('b', {}, '台湾海峡两岸：'), h('span', {}, `早上（6 时前后）：${s('早上')}；下午（14 时前后）：${s('下午')}`),
        sea['早上'] && sea['下午'] ? h('small', {}, '对照《台海使槎录》：内地之风，早西晚东，惟台地早东风，午西风。') : null,
        sea['下午'] && S.guess.sea != null ? h('small', {}, `你猜：${ASK.sea[1][S.guess.sea]}　实际：${sea['下午'].fj === '东风' ? '东风（从海上吹来）' : '西风（从陆上吹来）'}`) : null));
      W.logs.replaceChildren(...rows);
      if (S.done.has('free') && S.done.has('sea')) W.ui.unlock();
    };

    // ---- 换情境 ----
    const setGuess = () => { if (!W) return; const [q, o] = ASK[S.mode], g = seg(q, o, (_, i) => { S.guess[S.mode] = i; drawLogs(); }, { value: S.guess[S.mode] ?? -1 }); W.guess.el.replaceWith(g.el); W.guess = g; };
    const setMode = () => {
      S.st = makeState(); S.heat = null; S.heatX = null; S.heated = false; S.saidHeat = false; S.play = false;
      if (S.mode === 'free') S.logs.free = []; else S.logs.sea = {};          // 重新进这个情境：从头看、从头记（完成过的照样算完成）
      if (S.mode === 'sea') for (let i = 0; i < N; i++) S.st.th[i] = seaLandTemp(xOf(i), S.hour);
      for (let k = 0; k < NP; k++) { pts[k].x = XL + rnd() * (XR - XL); pts[k].z = rnd() * H; }
      if (W) { W.timeCtl.el.style.display = S.mode === 'sea' ? '' : 'none'; W.play.style.display = S.mode === 'sea' ? '' : 'none'; W.play.textContent = '让时间走'; setGuess(); W.ui.status(S.mode === 'free' ? '地面受热均匀：空气不动，等压面是平的（图 2.11 a）。<b>按住地面 A 处</b>给它加热，看空气和等压面怎么变。' : '台湾海峡：西边是福建，东边是台湾。拖<b>时刻</b>（或按“让时间走”），看一天里两岸的风怎么变。'); }
      paintGround(); paintBack(); placeSheets(); placeTags(); drawLogs();
    };

    // ---- 按住地面加热 ----
    const plane = new THREE.Plane(), hit = new THREE.Vector3(), wq = new THREE.Vector3();
    const onGround = (ray) => { block.updateMatrixWorld(); block.localToWorld(wq.set(0, GT, 0)); plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1).applyQuaternion(block.getWorldQuaternion(new THREE.Quaternion())), block.localToWorld(new THREE.Vector3(0, GT, D))); if (!ray.intersectPlane(plane, hit)) return null; const l = block.worldToLocal(hit.clone()); return l.x > XL && l.x < XR && l.y > -0.01 && l.y < GT + 0.03 ? l.x : null; };
    const onTop = (rc) => rc.intersectObject(groundTop, false).length ? block.worldToLocal(rc.intersectObject(groundTop, false)[0].point.clone()).x : null;
    const pointer = {
      down(rc) { if (S.mode !== 'free') return false; const x = onTop(rc) ?? onGround(rc.ray); if (x == null) return false; S.heat = true; S.heatX = x; S.heated = true; return true; },
      move(rc) { const c = document.getElementById('c'); if (!S.heat) { if (c) c.style.cursor = S.mode === 'free' && (onTop(rc) != null || onGround(rc.ray) != null) ? 'pointer' : ''; return false; } const x = onTop(rc) ?? onGround(rc.ray); if (x != null) S.heatX = x; return true; },
      up() { if (!S.heat) return false; S.heat = null; return true; },
    };

    setMode();

    return {
      group,
      card: false,
      place: 'spread',          // 从课本的图里升起来，放到两页正中间、按整个对开页放大
      size: { w: 0.36, d: 0.1, h: 0.18 },
      view: { elev: 12, azim: 16, lookY: 0.5, frameMargin: 1.22 },          // 正对剖面略偏一点：看得出等压面是一张张“面”
      pointer,
      mount(ui) {
        const modeSeg = seg('看哪一个', ['地面受热不均（图 2.11）', '台湾海峡两岸'], (_, i) => { S.mode = i ? 'sea' : 'free'; setMode(); }, { value: 0 });
        const timeCtl = slider('时刻', { min: 0, max: 24, step: 0.25, value: S.hour, fmt: (v) => `${Math.floor(v)} 时${v % 1 ? ` ${Math.round((v % 1) * 60)} 分` : ''}`, onInput: (v) => { S.hour = v; S.play = false; W.play.textContent = '让时间走'; } });
        const guess = seg(...ASK.free, () => {}, { value: -1 });
        const logs = h('div', { class: 'timeline' });
        const acts = buttons([
          { text: '让时间走', onClick: () => { S.play = !S.play; W.play.textContent = S.play ? '停一下' : '让时间走'; } },
          { text: '重来', ghost: true, onClick: () => { S.logs = { free: [], sea: {} }; S.guess = {}; S.done.clear(); S.mode = 'free'; S.hour = 6; modeSeg.set(0); timeCtl.set(6); setMode(); } },
        ]);
        ui.controls.append(modeSeg.el, timeCtl.el, guess.el, acts.el, note('地面哪里都可以按住加热，也可以换个地方再按。'));
        ui.data.append(h('div', { class: 'bar-title' }, '你看到了什么'), logs);
        W = { ui, logs, guess, timeCtl, play: acts.btns[0] };
        setMode();
      },
      update(dt) {
        S.t += dt; const d = Math.min(0.05, dt);
        if (S.mode === 'free') {
          if (S.heat && S.heatX != null) for (let i = 0; i < N; i++) S.st.th[i] = Math.min(7, S.st.th[i] + 5 * d * Math.exp(-((xOf(i) - S.heatX) ** 2) / 0.022 ** 2));
          step(S.st, d, { relax: 40 });
        } else {
          if (S.play) { S.hour = (S.hour + d * 1.2) % 24; W?.timeCtl.set(S.hour); }
          for (let i = 0; i < N; i++) S.st.th[i] = seaLandTemp(xOf(i), S.hour);
          step(S.st, d, { tauP: 0.6, tauS: 1.2 });
        }
        moveDots(d); paintGround(); paintBack(); placeSheets(); placeArrows(); placeTags(); recordFree(); recordSea();
      },
    };
  },
};
