// 高中地理 必修第二册 第三章第二节 工业区位因素及其变化（课本第 63–66 页，图 3.18 工业主要区位因素、图 3.21 上海某石化厂选址方案示意）。
//
// 一个问题：一座工厂建在哪里最合适？
// 课本的图就是模型：图 3.18 是一个“地点”标志，四周的原料、交通运输、动力、市场、劳动力、水源、土地、环境、政策法规都拿箭头指着它。
// 这里那个“地点”标志就在学生手里：一片虚构的区域（山、河、海、大城市、港口、县城、大学城、甘蔗田、水电站、机场、渔场，不画任何边界）铺在书上，
// 学生选一种工厂，把“地点”拖到哪儿，哪些因素就从各自的地方拉一条线过来，线越粗，这一项的成本越高；侧栏把各项成本叠成一根柱子。
// 记下几个方案并排比；换一种工厂，最省的地方就换了（制糖近原料、啤酒近市场、电解铝近水电、服装近廉价劳动力、集成电路近高校）。
// 最省的地方不一定能建：石化厂放在港口最省，可烟会顺着盛行风吹进城里；放在河上游，污水会流到水源地——影响直接在出事的地方标出来。
// 不打分：没有“正确答案”，只把每个方案的代价摆出来。教学示意：区域是虚构的，成本数值只用来比较。
import * as THREE from 'three';
import { seg, buttons, note } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { airLabel, noteBadge } from './kit/labels.js';
import { h } from '../ui/Panel.js';
import { XL, XR, NL, NR, PLACES, RIVER, INDUSTRIES, WIND, coastX, evaluate, isSea, isMountain, nearRiver, swing, landPoint } from './kit/industry.js';

const G = 0.024;
const KINDS = ['sugar', 'beer', 'alu', 'cloth', 'chip', 'petro'];
const COLORS = { 原料运输: '#c9852e', 产品运输: '#d4523a', 动力: '#e0b52e', 劳动力: '#4f8f5a', 技术: '#4a6fb8' };
const ICON = { 原料运输: 'ore', 产品运输: 'truck', 动力: 'bolt', 劳动力: 'person', 技术: 'gear' };
const INKC = { 原料运输: '#8a5514', 产品运输: '#a8341f', 动力: '#8a6a08', 劳动力: '#2f6a3c', 技术: '#2f4f94' };          // 字用同一色相、深一些的颜色（黄色字在地图上看不清）
const FROM = { 原料运输: null, 产品运输: 'city', 动力: 'hydro', 劳动力: null, 技术: 'univ' };
const ASK = ['先猜一下（可以不猜）：在这个情境里，制糖厂建在哪儿总成本最低？', ['甘蔗田旁边', '大城市旁边', '港口旁边']];

export default {
  id: 'industry',
  fig: '图3.18',
  title: '工业区位因素',
  flow: 'explore',
  ask: '为什么糖厂多建在甘蔗地边上，啤酒厂却多建在城市旁边？一座工厂到底建在哪里最合适？',
  need: '选三种不同的工厂，各自找一个成本低、又不惹麻烦的地方；比一比它们最在乎的是哪一项',
  conclusion: {
    page: 68,
    quote: '从经济效益看，工厂应当选择在利润最高的地方。……在市场因素一定的情况下，为了获取最大的经济效益，决策者会综合考虑多种成本，把工厂建在总成本最低的地方。……一些原料容易腐烂或原料运输成本很高的工业，如制糖工业……多建在原料产地附近。一些产品容易变质或者产品运输成本较高的工业……如肉类加工业、啤酒制造业等，多建在靠近市场的地方。……电解铝厂一般建在电能供应充足的水电站附近……普通服装制造……一般多建在具有大量廉价劳动力的地方。一些技术要求高的工业，如集成电路……一般多建在高等教育和科技发达的地区。……对环境污染严重的工业，区位选择应非常慎重。……大多数情况下，工业区位选择往往是多种因素综合作用的结果。',
    why: '本情境假设水电站附近有低价、稳定供电条件，动力成本的距离函数是人为设定，不是现实电价随距离增加的规律。制糖、啤酒、电解铝等在本组参数下有不同的成本分布。比较范围内某项成本极差最大，只表示它的变化幅度最大；选址仍要综合总成本、可行用地、供水、污染及其他约束。',
    src: '课本第 64–66 页 · 第三章 第二节 工业区位因素及其变化',
  },

  create({ tag }) {
    const group = new THREE.Group();
    const S = { kind: 'sugar', p: { x: 0.03, n: -0.02 }, drag: false, saved: [], no: {}, tried: new Set(), guess: null, moved: false };
    let W = null;
    const block = new THREE.Group(); group.add(block);
    const P3 = (x, n, y = G) => new THREE.Vector3(x, y, -n);

    // ---- 地块：侧面是岩层，顶面是一张画出来的区域图 ----
    const BASE = import.meta.env.BASE_URL || '/';
    const strata = new THREE.TextureLoader().load(`${BASE}tex/geo/strata-side.jpg`); strata.colorSpace = THREE.SRGBColorSpace;
    const sm = (rx, c) => { const t = strata.clone(); t.wrapS = THREE.RepeatWrapping; t.repeat.set(rx, 0.4); return new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(c, c, c) }); };
    const soil = new THREE.Mesh(new THREE.BoxGeometry(XR - XL, G - 0.001, NR - NL), [sm(0.9, 0.9), sm(0.9, 0.8), new THREE.MeshBasicMaterial({ color: 0x8fb276 }), new THREE.MeshBasicMaterial({ color: 0x6b5236 }), sm(1.3, 0.97), sm(1.3, 0.84)]);
    soil.position.y = (G - 0.001) / 2; block.add(soil);
    const rim = new THREE.LineSegments(new THREE.EdgesGeometry(soil.geometry), new THREE.LineBasicMaterial({ color: 0x5a4028, transparent: true, opacity: 0.45 })); rim.raycast = () => {}; soil.add(rim);
    const shadowTex = canvasTex(256, 256, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(60,45,30,0.4)'); gr.addColorStop(0.7, 'rgba(60,45,30,0.12)'); gr.addColorStop(1, 'rgba(60,45,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry((XR - XL) * 1.08, (NR - NL) * 1.12), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.0006; shadow.raycast = () => {}; shadow.userData.noFrame = true; group.add(shadow);

    const TW = 1600, TH = Math.round(1600 * (NR - NL) / (XR - XL));
    const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH;
    const mapTex = new THREE.CanvasTexture(cv); mapTex.colorSpace = THREE.SRGBColorSpace; mapTex.anisotropy = 8;
    const px = (x) => ((x - XL) / (XR - XL)) * TW, py = (n) => ((NR - n) / (NR - NL)) * TH;
    const meadow = new Image(); meadow.src = `${BASE}tex/geo/meadow-tile.jpg`;
    const drawMap = () => {
      const g = cv.getContext('2d');
      if (meadow.complete && meadow.naturalWidth) { g.fillStyle = g.createPattern(meadow, 'repeat'); g.fillRect(0, 0, TW, TH); g.fillStyle = 'rgba(244,240,222,0.35)'; g.fillRect(0, 0, TW, TH); } else { g.fillStyle = '#b9cf8f'; g.fillRect(0, 0, TW, TH); }
      // 山地（西边）：一道道山脊
      const mg = g.createLinearGradient(0, 0, px(-0.08), 0); mg.addColorStop(0, 'rgba(120,100,70,0.55)'); mg.addColorStop(1, 'rgba(120,100,70,0)'); g.fillStyle = mg; g.fillRect(0, 0, px(-0.08), TH);
      g.strokeStyle = 'rgba(90,70,45,0.55)'; g.lineWidth = 3; for (let k = 0; k < 18; k++) { const x0 = 20 + (k % 3) * 70 + (k * 37) % 40, y0 = 40 + k * (TH / 18); g.beginPath(); g.moveTo(x0, y0 + 26); g.lineTo(x0 + 26, y0); g.lineTo(x0 + 52, y0 + 26); g.stroke(); }
      // 南边平原的甘蔗田：一条条的田垄
      g.save(); g.beginPath(); g.rect(px(-0.09), py(-0.035), px(0.04) - px(-0.09), py(NL) - py(-0.035)); g.clip();
      for (let k = 0; k < 40; k++) { g.fillStyle = k % 2 ? 'rgba(170,190,80,0.55)' : 'rgba(205,200,110,0.55)'; g.fillRect(px(-0.09) + k * 24, py(-0.035), 22, TH); } g.restore();
      // 海（东边）和海岸线
      g.fillStyle = '#7fb4d6'; g.beginPath(); g.moveTo(TW, 0); for (let n = NR; n >= NL; n -= 0.002) g.lineTo(px(coastX(n)), py(n)); g.lineTo(TW, TH); g.closePath(); g.fill();
      g.strokeStyle = '#f2ead2'; g.lineWidth = 7; g.beginPath(); for (let n = NR, f = true; n >= NL; n -= 0.002, f = false) { const X = px(coastX(n)), Y = py(n); if (f) g.moveTo(X, Y); else g.lineTo(X, Y); } g.stroke();
      // 河
      g.strokeStyle = '#6aa6cf'; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 14; g.beginPath(); RIVER.forEach(([x, n], i) => (i ? g.lineTo(px(x), py(n)) : g.moveTo(px(x), py(n)))); g.stroke();
      // 城市、县城、大学城、港口、机场、水电站
      const blocks = (cx, cn, r, col, nB) => { for (let k = 0; k < nB; k++) { const a = k * 2.4, rr = r * Math.sqrt((k + 0.5) / nB), X = px(cx) + Math.cos(a) * rr, Y = py(cn) + Math.sin(a) * rr; g.fillStyle = col; g.fillRect(X - 9, Y - 9, 18, 18); g.strokeStyle = 'rgba(60,60,70,0.35)'; g.lineWidth = 1.5; g.strokeRect(X - 9, Y - 9, 18, 18); } };
      blocks(PLACES.city.x, PLACES.city.n, 120, '#c9c4bb', 70); blocks(PLACES.county.x, PLACES.county.n, 45, '#d8cfbe', 14); blocks(PLACES.univ.x, PLACES.univ.n, 50, '#bcd0e6', 12);
      g.fillStyle = '#8c8f96'; for (let k = 0; k < 4; k++) g.fillRect(px(PLACES.port.x) - 6, py(PLACES.port.n) - 40 + k * 26, 70, 10);          // 码头
      g.save(); g.translate(px(PLACES.airport.x), py(PLACES.airport.n)); g.rotate(-0.35); g.fillStyle = '#7d8087'; g.fillRect(-110, -10, 220, 20); g.strokeStyle = '#fff'; g.setLineDash([14, 10]); g.lineWidth = 2; g.beginPath(); g.moveTo(-100, 0); g.lineTo(100, 0); g.stroke(); g.restore();
      g.fillStyle = '#6a6e76'; g.fillRect(px(PLACES.hydro.x) - 8, py(PLACES.hydro.n) - 30, 16, 60);          // 水电站的坝
      g.fillStyle = 'rgba(60,110,150,0.9)'; for (let k = 0; k < 6; k++) { const X = px(PLACES.fishery.x) - 60 + (k % 3) * 50, Y = py(PLACES.fishery.n) - 20 + Math.floor(k / 3) * 36; g.beginPath(); g.ellipse(X, Y, 14, 6, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(X + 12, Y); g.lineTo(X + 22, Y - 7); g.lineTo(X + 22, Y + 7); g.fill(); }          // 渔场
      g.strokeStyle = '#2f6fb0'; g.lineWidth = 4; g.beginPath(); g.arc(px(PLACES.intake.x), py(PLACES.intake.n), 14, 0, 7); g.stroke();          // 水源地（取水口）
      // 地名：地图上直接写字
      g.font = '600 34px "Songti SC", serif'; g.textAlign = 'center'; g.lineWidth = 7; g.strokeStyle = 'rgba(255,252,240,0.92)'; g.fillStyle = '#3a3226';
      const lab = (p, dx = 0, dy = -40) => { g.strokeText(p.name, px(p.x) + dx, py(p.n) + dy); g.fillText(p.name, px(p.x) + dx, py(p.n) + dy); };
      lab(PLACES.city, 0, -130); lab(PLACES.county); lab(PLACES.univ, 0, -60); lab(PLACES.port, 90, 70); lab(PLACES.airport, 0, 50); lab(PLACES.hydro, 40, -44); lab(PLACES.cane, 0, 10); lab(PLACES.intake, 0, 52); lab(PLACES.fishery, 0, 64);
      g.font = '600 28px "PingFang SC", sans-serif'; g.fillStyle = '#5f4f3c'; g.textAlign = 'left'; g.fillText('盛行风：东南风（从东南吹向西北）', 26, TH - 30);
      g.save(); g.translate(TW - 260, TH - 120); g.rotate(Math.atan2(-WIND[1], WIND[0])); g.strokeStyle = '#5f4f3c'; g.lineWidth = 5; g.beginPath(); g.moveTo(-50, 0); g.lineTo(40, 0); g.stroke(); g.beginPath(); g.moveTo(40, 0); g.lineTo(24, -12); g.lineTo(24, 12); g.closePath(); g.fillStyle = '#5f4f3c'; g.fill(); g.restore();
      g.textAlign = 'left'; g.fillText('北 ↑', 26, 44);
      mapTex.needsUpdate = true;
    };
    meadow.onload = drawMap; drawMap();
    const top = new THREE.Mesh(new THREE.PlaneGeometry(XR - XL, NR - NL), new THREE.MeshBasicMaterial({ map: mapTex })); top.rotation.x = -Math.PI / 2; top.position.y = G + 0.0002; block.add(top);

    // ---- “地点”标志（就是课本图 3.18 中间那个红色的标）和一座小工厂 ----
    const pin = new THREE.Group(); block.add(pin);
    const red = new THREE.MeshStandardMaterial({ color: 0xe05a3c, roughness: 0.45, emissive: 0x6a1f10, emissiveIntensity: 0.35 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.009, 24, 16), red); head.position.y = 0.03; pin.add(head);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0062, 0.02, 20), red); tip.rotation.x = Math.PI; tip.position.y = 0.019; pin.add(tip);
    const star = new THREE.Mesh(new THREE.CircleGeometry(0.0045, 5), new THREE.MeshBasicMaterial({ color: 0xffd36a })); star.position.set(0, 0.03, 0.0092); pin.add(star);
    const plant = new THREE.Group(); pin.add(plant);
    const wall = new THREE.MeshStandardMaterial({ color: 0xe9e4da, roughness: 0.8 }), roofM = new THREE.MeshStandardMaterial({ color: 0x7d8796, roughness: 0.7 });
    for (const [x, z, w, hh] of [[-0.009, 0.004, 0.012, 0.006], [0.005, -0.002, 0.01, 0.008]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, 0.009), wall); b.position.set(x, hh / 2, z); plant.add(b); const r = new THREE.Mesh(new THREE.BoxGeometry(w + 0.001, 0.0012, 0.0095), roofM); r.position.set(x, hh + 0.0006, z); plant.add(r); }
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0016, 0.016, 10), wall); stack.position.set(0.012, 0.008, 0.004); plant.add(stack);
    const pinPick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.045, 12), new THREE.MeshBasicMaterial({ visible: false })); pinPick.position.y = 0.022; pinPick.userData.pick = true; pin.add(pinPick);
    const tPin = tag('<span>拖这个“地点”</span><small>看看建在哪儿合适</small>', 'hint');          // 开场的提示：不用白底牌子

    // ---- 各项成本：从各自的地方拉一条线到“地点”，线越粗这一项越贵（课本图 3.18 的那些箭头） ----
    const ribbons = {};
    for (const k of Object.keys(COLORS)) { const m = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: COLORS[k], transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide })); m.renderOrder = 5; m.raycast = () => {}; block.add(m); ribbons[k] = { m, t: airLabel(block, k, { h: 0.0085, color: INKC[k], icon: ICON[k], dim: 0 }) }; }
    const strip = (from, to, w) => {          // 从 from 到“地点”的一条带子，靠近“地点”一头带箭头
      const ax = from.x, an = from.n, bx = to.x, bn = to.n, L = Math.hypot(bx - ax, bn - an); if (L < 0.004) return [];
      const ux = (bx - ax) / L, un = (bn - an) / L, vx = -un * w, vn = ux * w, cut = Math.min(0.016, L * 0.4), ex = bx - ux * 0.012, en = bn - un * 0.012, hx = ex - ux * cut, hn = en - un * cut, y = G + 0.0012;
      return [ax + vx, y, -(an + vn), ax - vx, y, -(an - vn), hx + vx, y, -(hn + vn), ax - vx, y, -(an - vn), hx - vx, y, -(hn - vn), hx + vx, y, -(hn + vn),
        hx + vx * 2.2, y, -(hn + vn * 2.2), hx - vx * 2.2, y, -(hn - vn * 2.2), ex, y, -en];
    };
    // ---- 影响：在出事的地方标出来（烟、污水）；同一时刻最多两条 ----
    const plumeTex = canvasTex(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(120,120,125,0.85)'); gr.addColorStop(1, 'rgba(120,120,125,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const plume = Array.from({ length: 14 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: plumeTex, transparent: true, depthWrite: false })); s.raycast = () => {}; s.renderOrder = 9; block.add(s); return s; });
    const dirty = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0x8a6a3a, transparent: true, opacity: 0.75, depthWrite: false })); dirty.renderOrder = 4; dirty.raycast = () => {}; block.add(dirty);
    const fxTags = [0, 1].map(() => airLabel(block, '', { h: 0.0095, color: '#b03a2a', icon: 'warn', dim: 0 })), savedTags = [0, 1, 2].map(() => airLabel(block, '', { h: 0.008, color: '#3a3226', icon: 'flag', dim: 0 }));
    const labels = [...Object.values(ribbons).map((r) => r.t), ...fxTags, ...savedTags];
    noteBadge(tag, '教学示意：区域是虚构的，成本数值只用来比较').loc(block, XL + 0.02, G + 0.002, -NR + 0.008);          // 放在地图北边（远处），不压着南边的盛行风说明

    let phase = 0;
    const layout = () => {
      const I = INDUSTRIES[S.kind], p = S.p, ev = evaluate(S.kind, p), max = Math.max(...Object.values(ev.cost), 0.01);
      pin.position.copy(P3(p.x, p.n)); plant.visible = true;
      tPin.loc(block, p.x, G + 0.09, -p.n).show(!S.moved);          // 提得高一点，不压地图上印的地名
      for (const k of Object.keys(COLORS)) {
        const r = ribbons[k], val = ev.cost[k], from = PLACES[k === '原料运输' ? I.mFrom : k === '劳动力' ? (Math.hypot(p.x - PLACES.county.x, p.n - PLACES.county.n) < 0.03 ? 'county' : 'city') : FROM[k]];
        const share = val / ev.total, show = share > 0.08;          // 只画占得多的几项，画面不乱
        const P = show ? strip(from, p, 0.0008 + 0.0042 * (val / max)) : [];
        r.m.geometry.dispose(); r.m.geometry = new THREE.BufferGeometry(); r.m.geometry.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); r.m.visible = P.length > 0;
        if (P.length) { const mx = (from.x + p.x) / 2, mn = (from.n + p.n) / 2; r.t.position.set(mx, G + 0.006, -mn); r.t.setText(`${k === '原料运输' ? `原料（${PLACES[I.mFrom].name}）` : k === '产品运输' ? '市场' : k}`).setOn(share > 0.18); } else r.t.setOn(false);
      }
      // 污水：从厂边最近的河段往下游一直到海
      const rv = nearRiver(p), Wfx = ev.fx.some((f) => f.k === 'water' || f.k === 'fish');
      if (I.water && rv.d < 0.02) {
        const pts = [], i0 = Math.floor(rv.i); for (let i = i0; i < RIVER.length; i++) { const [x, n] = i === i0 ? [RIVER[i][0] + (RIVER[i + 1]?.[0] - RIVER[i][0] || 0) * (rv.i - i0), RIVER[i][1] + (RIVER[i + 1]?.[1] - RIVER[i][1] || 0) * (rv.i - i0)] : RIVER[i]; pts.push([x, n]); }
        const P = [], w = 0.0024; for (let i = 0; i < pts.length - 1; i++) { const [ax, an] = pts[i], [bx, bn] = pts[i + 1], L = Math.hypot(bx - ax, bn - an) || 1, vx = -(bn - an) / L * w, vn = (bx - ax) / L * w, y = G + 0.001; P.push(ax + vx, y, -(an + vn), ax - vx, y, -(an - vn), bx + vx, y, -(bn + vn), ax - vx, y, -(an - vn), bx - vx, y, -(bn - vn), bx + vx, y, -(bn + vn)); }
        dirty.geometry.dispose(); dirty.geometry = new THREE.BufferGeometry(); dirty.geometry.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); dirty.visible = true;
      } else dirty.visible = false;
      savedTags.forEach((t, i) => { const sv = S.saved.filter((x) => x.kind === S.kind)[i]; if (sv) { t.position.set(sv.p.x, G + 0.012, -sv.p.n); t.setText(sv.label).setOn(true); } else t.setOn(false); });          // 记下的方案在地图上留个小牌子，好回看
      fxTags.forEach((t, i) => { const f = ev.fx[i]; if (!f || !f.text) { t.setOn(false); return; } const at = f.at === 'here' ? p : PLACES[f.at]; t.position.set(at.x, G + 0.03 + i * 0.012, -at.n); t.setText(f.text).setOn(true); });
      drawBars(ev);
    };

    // ---- 侧栏：成本叠成一根柱子；记下的方案并排 ----
    const drawBars = (ev) => {
      if (!W) return;
      const c = W.chart, g = c.getContext('2d'), w = c.width, hh = c.height, cols = [...S.saved.filter((s) => s.kind === S.kind), { label: '现在', ev }], B = hh - 34, top = 34;          // 上面留出图例和柱顶数字的位置
      g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, hh);
      const maxT = Math.max(...cols.map((c2) => c2.ev.total), 1), bw = Math.min(46, (w - 40) / cols.length - 14);
      cols.forEach((col, i) => {
        const x = 30 + i * (bw + 14); let y = B;
        for (const k of Object.keys(COLORS)) { const v = col.ev.cost[k], hgt = (v / maxT) * (B - top); g.fillStyle = COLORS[k]; g.fillRect(x, y - hgt, bw, hgt); y -= hgt; }
        g.fillStyle = '#3a3226'; g.font = '600 11px "PingFang SC", sans-serif'; g.textAlign = 'center'; g.fillText(col.label, x + bw / 2, B + 13); g.fillText(col.ev.total.toFixed(1), x + bw / 2, y - 4);
        if (col.ev.fx.length || col.ev.scope.length) { g.fillStyle = col.ev.fx.length ? '#c4462e' : '#3a3226'; g.fillText(col.ev.fx.length ? `要注意 ${col.ev.fx.length} 处` : '另需核实', x + bw / 2, B + 26); }
      });
      g.textAlign = 'left'; g.font = '11px "PingFang SC", sans-serif'; let lx = 6; for (const k of Object.keys(COLORS)) { g.fillStyle = COLORS[k]; g.fillRect(lx, 2, 9, 9); g.fillStyle = '#3a3226'; g.fillText(k, lx + 12, 10); lx += g.measureText(k).width + 26; }
      const lead = Object.entries(swing(S.kind)).sort((a, b) => b[1] - a[1])[0][0];          // 地点一变，哪一项变化最大：仅描述本模型比较范围的极差，不等同主导因素
      W.read.innerHTML = `${INDUSTRIES[S.kind].name}：建在这里总成本 <b>${ev.total.toFixed(1)}</b>。在本模型比较范围内，变化幅度最大的是<b style="color:${COLORS[lead]}">${lead}</b>；选址还需综合总成本和约束。${ev.fx.length ? `<br><b style="color:#c4462e">要注意：${ev.fx.map((f) => f.text).join('；')}</b>` : '<br>本模型列的环境问题这里都没碰上'}${ev.scope.length ? `<br>另需核实：${ev.scope.map((f) => f.text).join('；')}` : ''}<br><small>成本数值是教学示意；假设水电站附近低价、稳定供电，距离函数不代表现实电价规律</small>`;
    };
    const drawLog = () => {
      if (!W) return;
      const rows = [...S.tried].map((k) => { const mine = S.saved.filter((s) => s.kind === k); return h('div', { class: 'tl-row' }, h('b', {}, `${INDUSTRIES[k].name}：`), h('span', {}, mine.length ? mine.map((s) => `${s.label} 总成本 ${s.ev.total.toFixed(1)}${s.ev.fx.length ? '（有麻烦）' : ''}${s.ev.scope.length ? '（另需核实）' : ''}`).join('；') : '拖过，还没记方案'), mine.length ? h('small', {}, `它最在乎：${INDUSTRIES[k].lead}`) : null); });
      if (S.guess != null && S.saved.some((s) => s.kind === 'sugar')) rows.push(h('div', { class: 'tl-row' }, h('small', {}, `你猜：${ASK[1][S.guess]}　本情境中原料运输对距离更敏感，靠近甘蔗田能显著节省这部分成本`)));
      W.log.replaceChildren(...rows);
      if (new Set(S.saved.map((s) => s.kind)).size >= 3) W.ui.unlock();
    };

    // ---- 拖“地点” ----
    const plane = new THREE.Plane(), hit = new THREE.Vector3(), wq = new THREE.Vector3();
    const onMap = (ray) => { block.updateMatrixWorld(); block.localToWorld(wq.set(0, G, 0)); plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), wq); if (!ray.intersectPlane(plane, hit)) return null; const l = block.worldToLocal(hit.clone()); return { x: Math.max(XL + 0.006, Math.min(XR - 0.006, l.x)), n: Math.max(NL + 0.006, Math.min(NR - 0.006, -l.z)) }; };
    const pointer = {
      down(rc) { if (!rc.intersectObject(pinPick, false).length) return false; S.drag = true; document.getElementById('c').style.cursor = 'grabbing'; return true; },
      move(rc) {
        const c = document.getElementById('c');
        if (!S.drag) { if (c) c.style.cursor = rc.intersectObject(pinPick, false).length ? 'grab' : ''; return false; }
        const m = onMap(rc.ray); if (!m) return true;
        Object.assign(m, landPoint(m));          // 按曲线海岸约束整个厂区，不模拟围填海
        S.p = m; S.moved = true; S.tried.add(S.kind); layout(); drawLog(); return true;
      },
      up() { if (!S.drag) return false; S.drag = false; document.getElementById('c').style.cursor = ''; return true; },
    };

    layout();

    let placeFn = null;
    return {
      debug: { S, layout },
      group,
      // 地球主探索：点上海金山卫那面旗进来，直接选石油化工厂
      place: (name) => placeFn?.(name),
      card: false,
      emerge: 'flat',          // 课本的图平放在书页上，模型从它上面长出来、它慢慢淡掉：一张图立了起来，连贯不闪
      size: { w: 0.34, d: 0.24, h: 0.08 },
      view: { elev: 42, azim: 8, lookY: 0.3, frameMargin: 1.05 },
      pointer,
      mount(ui) {
        const kindSeg = seg('建哪一种工厂', KINDS.map((k) => INDUSTRIES[k].name), (_, i) => { S.kind = KINDS[i]; layout(); drawLog(); ui.status(`${INDUSTRIES[S.kind].name}：拖地图上的“地点”，看哪些因素把它往哪边拉。`); }, { value: 0 });
        placeFn = (name) => { const k = KINDS.indexOf(name); if (k >= 0 && kindSeg.index !== k) kindSeg.set(k, true); };
        const guess = seg(...ASK, (_, i) => { S.guess = i; drawLog(); }, { value: -1 });
        const acts = buttons([
          { text: '记下这个方案', onClick: () => { S.no[S.kind] = (S.no[S.kind] || 0) + 1; const n = S.saved.filter((s) => s.kind === S.kind).length; if (n >= 3) S.saved.splice(S.saved.findIndex((s) => s.kind === S.kind), 1); S.saved.push({ kind: S.kind, label: `方案${S.no[S.kind]}`, ev: evaluate(S.kind, S.p), p: { ...S.p } }); S.tried.add(S.kind); layout(); drawLog(); } },          // 编号一直往上加，不重名；最多留三个
          { text: '重来', ghost: true, onClick: () => { ui.relock?.(); S.saved = []; S.no = {}; S.tried.clear(); S.guess = null; S.p = { x: 0.03, n: -0.02 }; S.moved = false; S.kind = 'sugar'; kindSeg.set(0); guess.set(-1); layout(); drawLog(); ui.status('选一种工厂，拖地图上的“地点”。'); } },
        ]);
        const chart = h('canvas', { class: 'wx-map', width: 320, height: 176 }), read = h('div', { class: 'read-out' }), log = h('div', { class: 'timeline' });          // 读数用 div（长的 p.note 会被收进“怎么操作”里）
        ui.controls.append(h('div', { class: 'bar-title' }, '建在这里，要花多少（示意）'), chart, read, kindSeg.el, acts.el, guess.el, note('同一种工厂可以记下三个方案并排比。'));
        ui.data.append(h('div', { class: 'bar-title' }, '你比过的'), log);
        W = { ui, chart, read, log };
        ui.status('这是一片虚构的地区：有山、河、海、大城市、港口、县城……先选一种工厂，再拖地图上的红色<b>“地点”</b>，看哪些因素从哪里把它拉过去。');
        layout(); drawLog();
      },
      update(dt) {
        labels.forEach((l) => l.tick(dt));
        phase += dt;
        const I = INDUSTRIES[S.kind];
        plume.forEach((s, i) => { const on = I.air; s.visible = on; if (!on) return; const t = (phase * 0.25 + i / plume.length) % 1, sx = S.p.x + 0.012 + WIND[0] * t * 0.09, sn = S.p.n + 0.004 + WIND[1] * t * 0.09; s.position.set(sx, G + 0.018 + t * 0.012, -sn); const sc = 0.006 + t * 0.02; s.scale.set(sc, sc, 1); s.material.opacity = (1 - t) * 0.7; });          // 烟从烟囱出来，顺着盛行风往西北飘
      },
    };
  },
};
