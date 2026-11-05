// 高中地理 选择性必修1 第三章第一节 常见天气系统 · 气旋与反气旋（课本第 44–46 页，图 3.6 北半球气旋的形成及其天气、图 3.7 反气旋）。
//
// 课本的图就是模型：一块浮在书页上的地块，地面上画着闭合的等压线（虚构地区，不画边界）。开始只有等压线，天上干干净净。
// 学生在图上任意一处点一下，放一缕空气。它按真实的受力自己走：气压梯度力（指向低压）+ 地转偏向力（北半球向右偏）+ 地面摩擦，
// 身后留下轨迹；旁边两支箭头：虚线是气压梯度力，实线是它实际走的方向（就是课本图 3.6 a 的图例）。
// 低压：空气转着流进中心、往上升，学生放进去的空气越多，中心的云越高，够厚了就下雨（图 3.6 b）。
// 高压：空气转着往外流，中心上方的空气往下沉、增温，原来的云一点点散掉，天晴了（图 3.7）。
// 你家可以拖到东边、西边：风向标和“你家的天空”跟着变（气旋东部偏南风、西部偏北风；反气旋相反）。
// 换个条件：南半球（向左偏）、假如地球不自转（没有地转偏向力，空气直直冲向中心）。
// 教学示意：竖直方向夸大了；风和等压线的夹角取约 24°（地面摩擦使风斜穿等压线，实际常见 10°–45°，陆地上大、海面上小）；时间加快了。
import * as THREE from 'three';
import { seg, buttons, note } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { h } from '../ui/Panel.js';

const LIFT = 0.05, G = 0.022;
const XL = -0.15, XR = 0.15, ZN = 0.12;          // 地块：东西 0.3，南北 0.24（x 朝东，−z 朝北）
import { MODEL, accP, windAt, windName } from './kit/pressure.js';
const HEMI = [1, -1, 0];          // 北半球（向右偏）、南半球（向左偏）、假如地球不自转
const ASK = {
  low: ['先猜一下（可以不猜）：在这个情境里，放在低压边上的空气会——', ['直直流进中心', '绕着中心转着流进去', '绕着中心转着流出来']],
  high: ['先猜一下（可以不猜）：在这个情境里，放在高压边上的空气会——', ['直直流出去', '绕着中心转着流出去', '绕着中心转着流进来']],
};
const rnd = (() => { let s = 11; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const side = (x, n) => (Math.abs(x) > Math.abs(n) ? (x > 0 ? '东边' : '西边') : (n > 0 ? '北边' : '南边'));

export default {
  id: 'cyclone',
  fig: '图3.6',
  title: '气旋与反气旋',
  flow: 'explore',
  ask: '天气预报常说“受低压影响，阴雨”“高压控制，晴好”。为什么低压下雨、高压晴？',
  need: '在低压、高压里各放几缕空气：看它往哪儿走，中心的空气是升还是沉，天上的云怎么变（北半球）',
  conclusion: {
    page: 49,
    quote: '在等压线分布图上，凡等压线闭合，中心气压低于四周气压的区域，叫作低气压，简称低压。在水平气压梯度力的作用下，低压的气流由四周向中心流动。受地转偏向力影响，低压的气流在北半球向右偏转，按逆时针方向流动（图3.6 a），在南半球向左偏转，按顺时针方向流动。……低压中心形成上升气流。空气在上升过程中，温度降低，其中所含的水汽凝结成云和雨（图3.6 b）。因此，一个地方受低压控制时，常出现阴雨天气。……高压的气流是由中心向外流出的，在北半球按顺时针方向旋转流出（图3.7 a），在南半球按逆时针方向旋转流出。……高压中心形成下沉气流。空气在下沉过程中，温度升高，水汽不易凝结，天气晴朗（图3.7 b）。',
    why: '空气从气压高的地方流向气压低的地方（气压梯度力），一边走一边被地转偏向力往一侧推（北半球向右、南半球向左），地面摩擦又让它斜着穿过等压线。所以流进低压的空气转着圈进去，北半球是逆时针；流出高压的转着圈出去，北半球是顺时针。地转偏向力只让风偏，不会自己让风转起来：没有气压差就没有风。低压中心的空气挤在一起只能往上升，越升越冷，水汽凝结成云、下雨；高压中心的空气往外流，上面的空气下沉补进来，越沉越暖，云就散了。气旋东部吹偏南风、西部吹偏北风；反气旋东部吹偏北风、西部吹偏南风。',
    src: '课本第 45–46 页 · 第三章 第一节 常见天气系统',
  },

  create({ tag, reframe }) {
    const group = new THREE.Group();
    const S = { mode: 'low', hemi: 0, cloud: 0, home: [0.07, 0.0], drag: false, t: 0, released: 0, logs: {}, done: new Set(), guess: {}, last: null, out: 0 };
    let W = null;
    const LK = () => `${S.mode}-${S.hemi}`;
    const hemi = () => HEMI[S.hemi];
    const lit = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.18, roughness: 0.9, metalness: 0, ...o });
    const LINE = new THREE.LineBasicMaterial({ color: 0x2a3140, transparent: true, opacity: 0.35 });
    const edges = (m, ang = 25) => { const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, ang), LINE); e.raycast = () => {}; m.add(e); return m; };
    const block = new THREE.Group(); block.position.y = LIFT; group.add(block);
    const P = (x, n, y = G) => new THREE.Vector3(x, y, -n);          // 模型坐标（x 东、n 北）→ 地块坐标

    // ---- 书页上的影子、取景框 ----
    const shadowTex = canvasTex(256, 256, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(60,45,30,0.45)'); gr.addColorStop(0.6, 'rgba(60,45,30,0.18)'); gr.addColorStop(1, 'rgba(60,45,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry((XR - XL) * 1.3, ZN * 2 * 1.3), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.0006; shadow.raycast = () => {}; shadow.userData.noFrame = true; group.add(shadow);
    const frameBox = new THREE.Mesh(new THREE.BoxGeometry(XR - XL + 0.02, 0.15, ZN * 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    frameBox.position.y = LIFT + 0.075; frameBox.raycast = () => {}; group.add(frameBox);

    // ---- 地块：三层土，顶面是一张等压线图 ----
    let yy = G - 0.002;
    for (const [c, t] of [[0x8fb276, 0.004], [0xa07a52, 0.006], [0xb8915f, 0.005], [0xc9a877, G - 0.017]]) { const m = edges(new THREE.Mesh(new THREE.BoxGeometry(XR - XL, t, ZN * 2), lit(c))); m.position.y = yy - t / 2 + 0.002; yy -= t; block.add(m); }
    const TW = 1200, TH = 960;
    const mapCanvas = document.createElement('canvas'); mapCanvas.width = TW; mapCanvas.height = TH;
    const mapTex = new THREE.CanvasTexture(mapCanvas); mapTex.colorSpace = THREE.SRGBColorSpace; mapTex.anisotropy = 8;
    const drawMapTex = () => {
      const g = mapCanvas.getContext('2d'), px = (x) => ((x - XL) / (XR - XL)) * TW, py = (n) => ((ZN - n) / (2 * ZN)) * TH;
      g.fillStyle = '#e9efd9'; g.fillRect(0, 0, TW, TH);
      g.globalAlpha = 0.35; const cols = ['#dfe8cc', '#d6e2bf', '#e4ecd2'];          // 淡淡的田野
      for (let i = 0; i < 40; i++) { g.fillStyle = cols[i % 3]; g.fillRect((i * 173) % TW, (i * 97) % TH, 120 + ((i * 41) % 110), 80 + ((i * 29) % 70)); }
      g.globalAlpha = 1;
      const low = S.mode === 'low', levels = low ? [1000, 1002.5, 1005, 1007.5] : [1015, 1012.5, 1010, 1008.5];
      g.strokeStyle = '#c9743a'; g.lineWidth = 4; g.fillStyle = '#a85a26'; g.font = '600 30px "Songti SC", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const p of levels) {
        const e = low ? (MODEL.P0 - p) / MODEL.DP : (p - MODEL.P0) / MODEL.DP, r = MODEL.SIG * Math.sqrt(-Math.log(e));          // 这一条等压线的半径
        g.beginPath(); g.ellipse(px(0), py(0), (r / (XR - XL)) * TW, (r / (2 * ZN)) * TH, 0, 0, 7); g.stroke();
        const lx = px(r * 0.72), ly = py(-r * 0.72);          // 数字标在右下方，线断开一小段
        g.save(); g.fillStyle = '#e9efd9'; g.fillRect(lx - 62, ly - 18, 124, 36); g.restore(); g.fillText(p.toFixed(1), lx, ly);
      }
      g.font = '700 64px "Songti SC", serif'; g.fillStyle = low ? '#b0412a' : '#2a62b8'; g.fillText(low ? '低' : '高', px(0), py(0));
      g.font = '500 26px "PingFang SC", sans-serif'; g.fillStyle = '#7a6a55'; g.textAlign = 'right'; g.fillText('海平面等压线 / hPa', TW - 24, TH - 26);
      g.textAlign = 'left'; g.fillText('北 ↑', 24, 34);
      mapTex.needsUpdate = true;
    };
    const top = new THREE.Mesh(new THREE.PlaneGeometry(XR - XL, ZN * 2), new THREE.MeshStandardMaterial({ map: mapTex, roughness: 1, emissive: 0xffffff, emissiveMap: mapTex, emissiveIntensity: 0.25 }));
    top.rotation.x = -Math.PI / 2; top.position.y = G + 0.0002; block.add(top);

    // ---- 一缕缕空气：小团 + 身后的轨迹 ----
    const puffTex = canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const MAXP = 360, parcels = [];
    const release = (x, n) => {
      if (parcels.length > 30) { const old = parcels.shift(); block.remove(old.line, old.dot); old.line.geometry.dispose(); }
      const pos = new Float32Array(MAXP * 3), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setDrawRange(0, 0);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x4a78bd, transparent: true, opacity: 0.75 })); line.raycast = () => {}; line.renderOrder = 4;
      const dot = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: 0xdbe8ff, transparent: true, depthWrite: false })); dot.scale.set(0.011, 0.011, 1); dot.raycast = () => {}; dot.renderOrder = 9;
      block.add(line, dot);
      const p = { x, n, vx: 0, vn: 0, y: G + 0.004, st: 'flow', np: 0, pos, geo, line, dot, fade: 1, L: 0, rx: x, rn: n };
      parcels.push(p); S.last = p; S.released++;
      W?.ui.status(S.mode === 'low' ? '看它往哪儿走：<b>虚线</b>是气压梯度力（指向低压中心），<b>实线</b>是它实际走的方向。可以多放几缕，也可以把你家拖到别处。' : '看它往哪儿走：<b>虚线</b>是气压梯度力（从高压往外指），<b>实线</b>是它实际走的方向。多放几缕，看中心上空的云。');
      return p;
    };
    const push = (p) => { if (p.np >= MAXP) { p.pos.copyWithin(0, 3); p.np--; } p.pos.set([p.x, p.y, -p.n], p.np * 3); p.np++; p.geo.setDrawRange(0, p.np); p.geo.attributes.position.needsUpdate = true; };
    const stepParcel = (p, dt) => {
      if (p.st === 'flow') {
        const f = MODEL.F * hemi(), k = MODEL.K;
        for (let i = 0; i < 4; i++) {
          const h4 = dt / 4, [ax, an] = accP(S.mode, p.x, p.n);
          p.vx += (ax + f * p.vn - k * p.vx) * h4; p.vn += (an - f * p.vx - k * p.vn) * h4;
          p.x += p.vx * h4; p.n += p.vn * h4;
          p.L += (p.x * p.vn - p.n * p.vx) * h4 / Math.max(1e-4, p.x * p.x + p.n * p.n);          // 绕中心转过的角度（弧度）：正＝逆时针（从上往下看）
        }
        const r = Math.hypot(p.x, p.n);
        if (S.mode === 'low' && r < 0.016) { p.st = 'rise'; onArrive(p); }
        if (S.mode === 'high' && r > Math.max(0.05, Math.hypot(p.rx, p.rn) + 0.03) && !p.counted) { p.counted = true; onLeave(p); }
        if (p.x < XL + 0.003 || p.x > XR - 0.003 || Math.abs(p.n) > ZN - 0.003) { p.st = 'gone'; }
      } else if (p.st === 'rise') {          // 到了低压中心：往上升，一直升到云底
        p.y += dt * 0.045; p.x *= 1 - dt * 0.5; p.n *= 1 - dt * 0.5;
        if (p.y > G + 0.05) { p.st = 'gone'; S.cloud = Math.min(1, S.cloud + 0.09); record(); }
      }
      if (p.st !== 'gone') push(p);
      p.dot.position.set(p.x, p.y, -p.n); p.dot.visible = p.st !== 'gone';
    };

    // ---- 最新那一缕旁边的两支箭头：虚线＝气压梯度力，实线＝风向（课本图 3.6 a 的图例） ----
    const arrowOf = (color, dashed) => {
      const g = new THREE.Group();
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]);
      const ln = new THREE.Line(geo, dashed ? new THREE.LineDashedMaterial({ color, dashSize: 0.004, gapSize: 0.003 }) : new THREE.LineBasicMaterial({ color })); ln.raycast = () => {};
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.0028, 0.008, 10), new THREE.MeshBasicMaterial({ color })); head.raycast = () => {};
      g.add(ln, head); block.add(g); g.userData = { ln, head, geo };
      g.set = (from, dir, len) => {
        const d = dir.clone().normalize(), to = from.clone().addScaledVector(d, len);
        geo.setFromPoints([from, to.clone().addScaledVector(d, -0.006)]); if (dashed) ln.computeLineDistances();
        head.position.copy(to.clone().addScaledVector(d, -0.004)); head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
      };
      return g;
    };
    const aPGF = arrowOf(0x8a5a2b, true), aWind = arrowOf(0x1f3f75, false);
    const tPGF = tag('气压梯度力', 'pill'), tWind = tag('风向', 'pill');
    const placeArrows = () => {
      const p = S.last, on = p && p.st === 'flow';
      aPGF.visible = aWind.visible = !!on; tPGF.show(!!on); tWind.show(!!on);
      if (!on) return;
      const [ax, an] = accP(S.mode, p.x, p.n), o = P(p.x, p.n, G + 0.005);
      aPGF.set(o, new THREE.Vector3(ax, 0, -an), 0.03);
      if (Math.hypot(p.vx, p.vn) > 1e-4) aWind.set(o, new THREE.Vector3(p.vx, 0, -p.vn), 0.03);
      const e1 = o.clone().add(new THREE.Vector3(ax, 0, -an).normalize().multiplyScalar(0.034)), e2 = o.clone().add(new THREE.Vector3(p.vx, 0, -p.vn).normalize().multiplyScalar(0.034));
      tPGF.loc(block, e1.x, e1.y + 0.008, e1.z); tWind.loc(block, e2.x, e2.y + 0.008, e2.z);
    };

    // ---- 中心上空：低压是上升气流和云塔，高压是下沉气流 ----
    const vArrows = [0, 1, 2, 3].map((i) => {
      const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: 0x3466b0, transparent: true, opacity: 0 });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0009, 0.022, 8), m), head = new THREE.Mesh(new THREE.ConeGeometry(0.003, 0.007, 10), m);
      head.position.y = 0.014; g.add(shaft, head); g.userData = { m, head, a: (i / 4) * Math.PI * 2 + 0.4, r: i === 0 ? 0 : 0.013 }; block.add(g); return g;
    });
    const placeVArrows = () => {
      const low = S.mode === 'low', on = low ? smooth(0, 0.15, S.cloud) : smooth(0, 1, Math.min(1, S.out / 2));
      for (const g of vArrows) {
        const { m, head, a, r } = g.userData, ph = (S.t * 0.5 + a) % 1;
        g.rotation.z = low ? 0 : Math.PI; head.position.y = 0.014;
        const y = low ? G + 0.012 + ph * 0.03 : G + 0.07 - ph * 0.04;          // 低压：从地面往上；高压：从高处往下
        g.position.set(Math.cos(a) * r, y, Math.sin(a) * r); m.opacity = on * 0.85 * Math.sin(ph * Math.PI);
      }
    };
    const cloudTex = canvasTex(256, 256, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.85)'); gr.addColorStop(0.75, 'rgba(255,255,255,0.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.globalAlpha = 0.55; g.fillStyle = gr; g.fillRect(0, 0, w, w);
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, r = w * 0.27, cx = w / 2 + Math.cos(a) * r, cy = w / 2 + Math.sin(a) * r * 0.85, rr = w * (0.13 + 0.05 * ((i * 7) % 3) / 2);
        const gg = g.createRadialGradient(cx, cy, 0, cx, cy, rr); gg.addColorStop(0, 'rgba(255,255,255,0.9)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gg; g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.fill(); }
    });
    const puffs = Array.from({ length: 90 }, () => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false })); m.renderOrder = 8; m.raycast = () => {}; m.userData.seed = [rnd(), rnd(), rnd(), rnd()]; block.add(m); return m; });
    const placeClouds = () => {
      const low = S.mode === 'low', wet = smooth(0.55, 0.75, S.cloud) * (low ? 1 : 0);
      for (const m of puffs) {
        const [a, b, c, d] = m.userData.seed;
        let x, n, y, r, shade, vis;
        if (low) {          // 云塔：放进来的空气越多，长得越高
          const q = b, rad = 0.012 + 0.03 * Math.sqrt(c) * (1 - 0.5 * q);
          x = Math.cos(a * 7) * rad; n = Math.sin(a * 7) * rad; y = G + 0.04 + q * 0.075 * S.cloud; r = 0.01 + d * 0.008 + (q > 0.85 ? 0.006 : 0);
          vis = smooth(q * 0.9, q * 0.9 + 0.12, S.cloud); shade = 0.55 + 0.37 * q - 0.42 * wet * Math.max(0, 1 - q * 1.8);
        } else {          // 高压：几朵散开的淡积云，空气下沉时一点点散掉
          const cl = Math.floor(a * 5), ca = cl * 1.3 + 0.5, cr = 0.03 + (cl % 3) * 0.012;
          x = Math.cos(ca) * cr + (c - 0.5) * 0.02; n = Math.sin(ca) * cr + (d - 0.5) * 0.014; y = G + 0.045 + b * 0.012; r = 0.007 + d * 0.006;
          vis = smooth(b * 0.8, b * 0.8 + 0.2, S.cloud); shade = 0.7 + 0.25 * b;
        }
        m.position.set(x, y, -n); m.scale.set(r * 2 * (0.5 + 0.5 * vis), r * 1.8 * (0.5 + 0.5 * vis), 1);
        shade = Math.max(0.14, shade); m.material.color.setRGB(shade, shade, shade * 1.04); m.material.opacity = 0.85 * vis; m.visible = vis > 0.01;
      }
    };
    const NR = 260, rainPos = new Float32Array(NR * 6), rainSeed = Array.from({ length: NR }, () => [rnd(), rnd(), rnd()]);
    const rain = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x4f6f98, transparent: true, opacity: 0 }));
    rain.geometry.setAttribute('position', new THREE.BufferAttribute(rainPos, 3)); rain.raycast = () => {}; block.add(rain);
    const placeRain = () => {
      const on = S.mode === 'low' ? smooth(0.6, 0.8, S.cloud) : 0; rain.visible = on > 0.01; rain.material.opacity = 0.8 * on; if (!rain.visible) return;
      for (let i = 0; i < NR; i++) {
        const [a, b, c] = rainSeed[i], rad = 0.048 * Math.sqrt(b), x = Math.cos(a * 7) * rad, n = Math.sin(a * 7) * rad, topY = G + 0.04, y = topY - ((c + S.t * 1.1) % 1) * (topY - G), y2 = Math.max(G, y - 0.008);
        rainPos.set([x, y, -n, x, y2, -n], i * 6);
      }
      rain.geometry.attributes.position.needsUpdate = true;
    };

    // ---- 你家：几栋小房子，房顶上一支风向标（箭头指向风吹去的方向） ----
    const home = new THREE.Group(); block.add(home);
    for (const [x, z, w, hh] of [[-0.006, -0.004, 0.007, 0.006], [0.004, 0.003, 0.008, 0.008], [0.0, -0.012, 0.006, 0.005]]) {
      const body = edges(new THREE.Mesh(new THREE.BoxGeometry(w, hh, w), lit(0xf3ede1))); body.position.set(x, hh / 2, z); home.add(body);
      const rg = new THREE.ConeGeometry(w * 0.78, 0.004, 4); rg.rotateY(Math.PI / 4); const r = edges(new THREE.Mesh(rg, lit(0xc7503c))); r.position.set(x, hh + 0.002, z); home.add(r);
    }
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.0005, 0.0005, 0.024, 6), lit(0x555a62)); pole.position.set(0.0, 0.012, 0.0); home.add(pole);
    const vane = new THREE.Group(); vane.position.y = 0.024; home.add(vane);
    const vaneMat = lit(0x1f3f75); const vShaft = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.0012, 0.0012), vaneMat); vane.add(vShaft);
    const vHead = new THREE.Mesh(new THREE.ConeGeometry(0.0028, 0.007, 8), vaneMat); vHead.rotation.z = -Math.PI / 2; vHead.position.x = 0.011; vane.add(vHead);
    const vTail = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, 0.0006), vaneMat); vTail.position.x = -0.009; vane.add(vTail);
    const homePick = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.03, 0.024), new THREE.MeshBasicMaterial({ visible: false })); homePick.position.y = 0.014; homePick.userData.pick = true; home.add(homePick);
    const homeTag = tag('', 'pill'), tHint = tag('在图上任意一处点一下，放一缕空气', 'pill'), tScale = tag('教学示意 · 竖直方向夸大了 · 时间加快了', 'pill');
    const homeWx = () => {
      const [x, n] = S.home, r = Math.hypot(x, n);
      if (S.mode === 'low') return S.cloud >= 0.7 && r < 0.05 ? '阴雨' : S.cloud >= 0.3 && r < 0.09 ? '多云' : '晴';          // 教学示意：雨区在低压中心附近，外圈多云
      return S.cloud > 0.15 && r < 0.075 ? '多云' : '晴';
    };
    const homeWind = () => { const [vx, vn] = windAt(S.mode, hemi(), S.home[0], S.home[1]); return { vx, vn, ...windName(vx, vn) }; };
    const layoutHome = () => {
      const [x, n] = S.home; home.position.copy(P(x, n, G));
      const w = homeWind(), blowing = S.released > 0;
      vane.visible = blowing; vane.rotation.y = Math.atan2(w.vn, w.vx);          // 箭头指向风吹去的方向
      homeTag.loc(block, x, G + 0.04, -n).text(`<b>你家</b> ${blowing ? `${w.name}${w.lean && w.lean !== w.name ? `（${w.lean}）` : ''} · ` : ''}${homeWx()}`);
      homeTag.el.classList.toggle('hot', homeWx() === '阴雨');
    };

    // ---- 记录：你看到了什么 ----
    const log = () => (S.logs[LK()] ||= { spin: null, steps: [], home: null });
    const addStep = (s) => { const L = log(); if (!L.steps.includes(s)) L.steps.push(s); };
    const spinText = (p) => {
      const turned = Math.abs(p.L) > 0.3, ccw = p.L > 0;
      return S.mode === 'low' ? (turned ? `绕着中心${ccw ? '逆' : '顺'}时针转进去` : '直直流进中心') : (turned ? `绕着中心${ccw ? '逆' : '顺'}时针转着流出去` : '直直流出去');
    };
    const onArrive = (p) => { const L = log(); L.spin ||= spinText(p); addStep('中心的空气往上升'); record(); };
    const onLeave = (p) => { const L = log(); L.spin ||= spinText(p); S.out++; addStep('中心上方的空气往下沉'); record(); };
    const record = () => {
      if (S.mode === 'low') { if (S.cloud >= 0.3) addStep('升上去变冷，成云'); if (S.cloud >= 0.7) { addStep('云够厚，下雨了'); S.done.add(LK()); } }
      else if (S.out > 0 && S.cloud <= 0.001) { addStep('下沉变暖，云散了，天晴'); S.done.add(LK()); }
      drawLogs();
    };
    const HN = ['北半球', '南半球', '地球不自转'];
    const drawLogs = () => {
      if (!W) return;
      const rows = [];
      for (const m of ['low', 'high']) for (let hi = 0; hi < 3; hi++) {
        const k = `${m}-${hi}`, L = S.logs[k]; if (!L && k !== LK()) continue;
        const line = L && (L.spin || L.steps.length) ? [L.spin, ...L.steps].filter(Boolean).join(' → ') : '还没放空气';
        const g = S.guess[m + hi] != null ? ASK[m][1][S.guess[m + hi]] : null;
        rows.push(h('div', { class: 'tl-row' }, h('b', {}, `${m === 'low' ? '低压（气旋）' : '高压（反气旋）'} · ${HN[hi]}：`), h('span', {}, line),
          L?.home ? h('small', {}, `你家在${L.home}`) : null,
          L?.spin && g ? h('small', {}, `你猜：${g}　实际：${L.spin}`) : null));
      }
      W.logs.replaceChildren(...rows);
      if (S.done.has('low-0') && S.done.has('high-0')) W.ui.unlock();
    };
    const noteHome = () => { if (!S.released) return; const w = homeWind(); log().home = `${S.mode === 'low' ? '低压' : '高压'}${side(S.home[0], S.home[1])}：${w.name}${w.lean && w.lean !== w.name ? `（${w.lean}）` : ''}`; drawLogs(); };

    // ---- 你家的天空（抬头看） ----
    const drawSky = () => {
      if (!W) return;
      const c = W.sky, g = c.getContext('2d'), w = c.width, hh = c.height, wx = homeWx();
      const [t0, t1] = wx === '阴雨' ? ['#4f5966', '#8f98a2'] : wx === '多云' ? ['#86a3c2', '#d2dde7'] : ['#6fa8dc', '#d4e7f5'];
      const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, t0); gr.addColorStop(1, t1); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
      const blob = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
      if (wx === '晴') { const sg = g.createRadialGradient(262, 30, 0, 262, 30, 30); sg.addColorStop(0, 'rgba(255,240,180,1)'); sg.addColorStop(0.4, 'rgba(255,220,120,0.9)'); sg.addColorStop(1, 'rgba(255,220,120,0)'); g.fillStyle = sg; g.fillRect(222, 0, 80, 70); }
      const drift = S.released ? (S.t * 8) % 80 : 0;
      if (wx === '多云') for (const [x, y, r] of [[60, 32, 16], [80, 26, 20], [104, 34, 15], [200, 44, 13], [218, 38, 17], [238, 46, 12]]) blob((x + drift) % (w + 40) - 20, y, r, 'rgba(250,251,253,0.92)');
      if (wx === '阴雨') {
        for (let x = -20; x < w + 20; x += 34) blob(x, 14, 30, 'rgba(70,78,90,0.85)');
        g.strokeStyle = 'rgba(210,225,240,0.75)'; g.lineWidth = 1.4; for (let i = 0; i < 70; i++) { const x = (i * 47 + S.t * 90) % w, y = (i * 31 + S.t * 160) % (hh - 24); g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y + 9); g.stroke(); }
      }
      g.fillStyle = '#7d9c63'; g.fillRect(0, hh - 18, w, 18);
      g.fillStyle = '#f3ede1'; g.fillRect(30, hh - 32, 18, 14); g.fillStyle = '#c7503c'; g.beginPath(); g.moveTo(27, hh - 32); g.lineTo(39, hh - 40); g.lineTo(51, hh - 32); g.fill();
      const pill = (x, y, s, bg, fg) => { g.font = '600 13px "PingFang SC", sans-serif'; const tw = g.measureText(s).width; g.fillStyle = bg; g.beginPath(); g.roundRect(x, y, tw + 14, 20, 10); g.fill(); g.fillStyle = fg; g.fillText(s, x + 7, y + 15); };
      pill(8, 8, wx, 'rgba(255,255,255,0.88)', '#2a3140');
      if (S.released) { const wd = homeWind(); pill(8, hh - 46, `风从${wd.name.replace('风', '')}边吹来`, 'rgba(255,255,255,0.88)', '#1f3f75'); }
    };

    // ---- 换模式 ----
    const setGuess = () => {
      if (!W) return;
      const [q, opts] = ASK[S.mode], key = S.mode + S.hemi, g = seg(q, opts, (_, i) => { S.guess[key] = i; drawLogs(); }, { value: S.guess[key] ?? -1 });
      W.guess.el.replaceWith(g.el); W.guess = g;
    };
    const clearAir = () => { for (const p of parcels) { block.remove(p.line, p.dot); p.line.geometry.dispose(); } parcels.length = 0; S.last = null; S.released = 0; S.out = 0; };
    const setMode = (fresh = false) => {
      clearAir(); S.cloud = S.mode === 'high' ? 0.8 : 0;          // 高压一开始天上有几朵云：空气下沉时它们会散掉
      if (fresh) S.home = [0.07, 0.0];
      drawMapTex(); setGuess(); layoutHome(); drawLogs();
      W?.ui.status(S.mode === 'low'
        ? `这是一张等压线图：中间是<b>低压</b>，四周气压高。在图上任意一处点一下，放一缕空气，看它往哪儿走。（${HN[S.hemi]}）`
        : `这回中间是<b>高压</b>，天上有几朵云。在高压中心附近点一下，放一缕空气，看它往哪儿走，再看看云。（${HN[S.hemi]}）`);
    };

    // ---- 点图放空气；拖你家 ----
    const plane = new THREE.Plane(), hit = new THREE.Vector3(), wq = new THREE.Vector3();
    const onMap = (ray) => {
      block.updateMatrixWorld(); block.localToWorld(wq.set(0, G, 0)); plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), wq);
      if (!ray.intersectPlane(plane, hit)) return null; const l = block.worldToLocal(hit.clone()), x = l.x, n = -l.z;
      return x > XL + 0.005 && x < XR - 0.005 && Math.abs(n) < ZN - 0.005 ? [x, n] : null;
    };
    const pointer = {
      down(rc) {
        if (rc.intersectObject(homePick, false).length) { S.drag = true; document.getElementById('c').style.cursor = 'grabbing'; return true; }
        const m = onMap(rc.ray); if (!m) return false;
        release(m[0], m[1]); tHint.show(false); layoutHome(); return true;
      },
      move(rc) {
        const c = document.getElementById('c');
        if (!S.drag) { if (c) c.style.cursor = rc.intersectObject(homePick, false).length ? 'grab' : onMap(rc.ray) ? 'crosshair' : ''; return false; }
        const m = onMap(rc.ray); if (!m) return true;
        S.home = [Math.min(XR - 0.02, Math.max(XL + 0.02, m[0])), Math.min(ZN - 0.02, Math.max(-ZN + 0.02, m[1]))]; layoutHome(); return true;
      },
      up() { if (!S.drag) return false; S.drag = false; document.getElementById('c').style.cursor = ''; noteHome(); return true; },
    };

    const ring = () => { for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; release(Math.cos(a) * (S.mode === 'low' ? 0.1 : 0.022), Math.sin(a) * (S.mode === 'low' ? 0.09 : 0.02)); } tHint.show(false); layoutHome(); };

    drawMapTex(); layoutHome(); placeClouds();
    tHint.loc(block, -0.07, G + 0.02, -0.07); tScale.loc(block, XL + 0.06, -0.006, ZN + 0.01);
    S.cloud = 0;

    return {
      group,
      card: false,
      size: { w: 0.32, d: 0.26, h: 0.18 },
      view: { elev: 30, azim: 10, lookY: 0.4, frameMargin: 1.06 },          // 要看清空气在图上怎么转，镜头比锋那张高一些
      pointer,
      mount(ui) {
        const modeSeg = seg('看哪一种', ['低压（气旋）', '高压（反气旋）'], (_, i) => { S.mode = i ? 'high' : 'low'; setMode(); }, { value: 0 });
        const hemiSeg = seg('在哪儿', ['北半球', '南半球', '假如地球不自转'], (_, i) => { S.hemi = i; setMode(); }, { value: 0 });
        const guess = seg(...ASK.low, () => {}, { value: -1 });
        const logs = h('div', { class: 'timeline' });
        const acts = buttons([
          { text: '一圈都放上', onClick: ring },
          { text: '重来', ghost: true, onClick: () => { delete S.logs[LK()]; S.done.delete(LK()); delete S.guess[S.mode + S.hemi]; tHint.show(true); setMode(true); } },
        ]);
        const skyWin = h('canvas', { class: 'wx-map', width: 320, height: 110 });
        ui.controls.append(modeSeg.el, hemiSeg.el, guess.el, acts.el, note('你家可以拖到低压、高压的东边、西边、北边、南边。'));
        ui.data.append(h('div', { class: 'bar-title' }, '你家的天空（抬头看）'), skyWin, h('div', { class: 'bar-title' }, '你看到了什么'), logs);
        W = { ui, logs, guess, sky: skyWin };
        setMode();
      },
      update(dt) {
        S.t += dt; const d = Math.min(dt, 0.05);
        for (const p of parcels) stepParcel(p, d);
        for (let i = parcels.length - 1; i >= 0; i--) { const p = parcels[i]; if (p.st === 'gone') { p.fade -= d / 3.5; p.line.material.opacity = 0.75 * Math.max(0, p.fade); if (p.fade <= 0) { block.remove(p.line, p.dot); p.line.geometry.dispose(); parcels.splice(i, 1); if (S.last === p) S.last = null; } } }
        if (S.mode === 'high' && S.out > 0 && S.cloud > 0) { S.cloud = Math.max(0, S.cloud - d * 0.12 * Math.min(3, S.out)); if (S.cloud === 0) record(); }          // 下沉增温：云一点点散掉
        placeArrows(); placeVArrows(); placeClouds(); placeRain(); layoutHome(); drawSky();
      },
    };
  },
};
