// 高中地理 选择性必修1 第一章第二节 地球运动的地理意义 · 昼夜长短和正午太阳高度的变化（课本第 10–12 页，图 1.15）。
//
// 学校操场：北边是教学楼，南头是升旗台和旗杆。太阳沿当天的路径走过天空，旗杆的影子跟着转、伸缩。
// 学生：拖太阳（拨时刻）→ 看影子正午最短、朝正北；换日期（夏至、冬至、二分）→ 太阳的路径变高变低，日出日落的方位、时刻跟着变；
//   换地点 → 北回归线上夏至正午立竿无影；海口夏至正午太阳在北边。
// 全部按公式当场算（不计大气折射，和课本一致；时刻都是地方时）：
//   太阳直射点纬度 δ = asin(sin ε · sin λ)，ε = 23°26′，λ 是太阳黄经（春分 0°、夏至 90°……），二分二至直接取整；
//   太阳高度 sin h = sin φ sin δ + cos φ cos δ cos t（t 是时角：正午 0，每小时 15°）；正午太阳高度 a = 90° − |φ − δ|（课本第 12 页的公式）；
//   昼长：cos t₀ = −tan φ · tan δ，昼长 = 2t₀ / 15°；影长 = 杆高 / tan h，影子背着太阳。
// 坐标：东 +x，北 −z，上 +y（教学楼在北边）。
import * as THREE from 'three';
import { seg, slider, readout, goals, note } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { D2R, R2D, decOf, dm, hm, dirName, sunAt, halfDay, noonAlt } from './kit/sun.js';

export const PLACES = [
  { name: '北京', lat: 40 },                                   // 课本按 40°N 算（第 12 页）
  { name: '北回归线上', lat: 23 + 26 / 60 },
  { name: '海口', lat: 20 },
  { name: '哈尔滨', lat: 45.75 },
];
const DAYS = [{ name: '春分', lam: 0 }, { name: '夏至', lam: 90 }, { name: '秋分', lam: 180 }, { name: '冬至', lam: 270 }];
const DIM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const SPRING = 79;                                              // 春分约在 3 月 21 日（一年里的第 80 天，从 0 数）
const dayName = (n) => { let m = 0; while (n >= DIM[m]) { n -= DIM[m]; m++; } return `${m + 1} 月 ${n + 1} 日`; };
const lamOf = (n) => ((((n - SPRING) / 365.2422) * 360) % 360 + 360) % 360;          // 太阳黄经（按一年均匀走，近似）
const dayOf = (lam) => Math.round(SPRING + (lam / 360) * 365.2422) % 365;

export default {
  id: 'sunpath',
  fig: '图1.15',
  title: '昼夜长短和正午太阳高度的变化',
  stampText: '观察',
  predict: {
    q: '夏至这天，北京的太阳从哪个方向升起？',
    hint: '课本第 10 页 · 图 1.15',
    options: ['正东', '东北', '东南'],
    answer: 1,
  },
  need: '拖着太阳从日出走到日落，找出旗杆影子最短的时刻；比较北京夏至、冬至的正午太阳高度；把地点换到北回归线上，看夏至正午的影子',
  conclusion: {
    page: 16,
    quote: '正午太阳高度可以按公式a=90°–|ϕ–δ|计算，其中a为正午太阳高度，ϕ为当地的纬度，δ为太阳直射的纬度（当地夏半年取正值，冬半年取负值）。例如，北京（40°N）夏至日正午太阳高度为a=90°–|ϕ–δ|=90°–|40°–23°26′|=73°26′，冬至日正午太阳高度为a=90°–|ϕ–δ|=90°–|40°–（–23°26′）|=26°34′。……在北回归线以北的地区，全年正午太阳都在南方。',
    why: '一天里正午太阳最高，旗杆的影子最短；北京在北回归线以北，正午太阳在正南，影子指向正北。夏至太阳直射北回归线，北京正午太阳高 73°26′，白天约 15 小时，太阳从东北升起、西北落下；冬至直射南回归线，正午只有 26°34′，白天约 9 小时，从东南升起、西南落下。在北回归线上，夏至正午太阳正好在头顶，旗杆没有影子。',
    src: '课本第 12 页 · 第一章 第二节 地球运动的地理意义',
  },

  create({ tag }) {
    const group = new THREE.Group();
    const { fz, PB, HP, Y } = buildYard(group);
    const POLE = PB + HP - Y;                                    // 旗杆顶离地面多高（影子落在地面上）
    const BASE = new THREE.Vector3(0, Y, fz);                    // 旗杆脚（地面上）
    const C0 = new THREE.Vector3(0, PB, fz), RD = 0.17;           // 天空：以旗杆为圆心的半球，太阳的路径画在上面（低的太阳落在操场外面，像在远处）
    const S = { place: 0, lam: 90, n: dayOf(90), hour: 12, seen: new Set(), drag: false, pred: false, dragged: false };
    let W = null;
    const lat = () => PLACES[S.place].lat * D2R, dec = () => decOf(S.lam);
    const tOf = (hour) => (hour - 12) * 15 * D2R;

    // ---- 光：主光就是太阳（楼、树、旗杆都有影子），夜里只剩天光 ----
    const key = new THREE.DirectionalLight(0xfff1dc, 2.4); key.castShadow = true; key.shadow.mapSize.set(4096, 4096);
    Object.assign(key.shadow.camera, { left: -0.22, right: 0.22, top: 0.22, bottom: -0.22, near: 0.05, far: 1.2 }); key.shadow.bias = -0.0002; key.shadow.normalBias = 0.0004; key.shadow.radius = 3;
    const hemi = new THREE.HemisphereLight(0xfff6e8, 0x9a8a6c, 0.9);
    group.add(key, key.target, hemi);

    // ---- 太阳 ----
    const sunTex = canvasTex(256, 256, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,246,1)'); gr.addColorStop(0.18, 'rgba(255,240,180,1)'); gr.addColorStop(0.34, 'rgba(255,196,96,0.85)'); gr.addColorStop(0.62, 'rgba(255,170,60,0.22)'); gr.addColorStop(1, 'rgba(255,160,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, depthWrite: false, toneMapped: false })); sun.scale.setScalar(0.034); sun.renderOrder = 10; group.add(sun);
    const sunTag = tag('', 'pill');
    const hintTag = tag('拖着太阳走', 'pill');

    // ---- 天上的路径：今天（金色，粗）；夏至、二分、冬至（细、淡，和课本图 1.15 一样三条） ----
    const sky = new THREE.Group(); group.add(sky);
    // 镜头取景用：整个天空半球的范围（看不见；预测时路径藏着，镜头也要按整个天空取景）
    const dome = new THREE.Mesh(new THREE.BoxGeometry(RD * 2, RD, RD * 1.95), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    dome.position.set(C0.x, PB + RD / 2, C0.z + RD * 0.025); dome.raycast = () => {}; group.add(dome);
    const ref = new THREE.Group(); sky.add(ref);
    const today = new THREE.Group(); sky.add(today);
    const along = (d, t) => C0.clone().add(sunAt(lat(), d, t).dir.multiplyScalar(RD));
    const arcCurve = (d) => { const t0 = halfDay(lat(), d); if (t0 <= 0) return null; const pts = []; for (let i = 0; i <= 160; i++) pts.push(along(d, -t0 + (i / 160) * 2 * t0)); return new THREE.CatmullRomCurve3(pts, t0 >= Math.PI); };
    const clear = (g) => { for (const c of [...g.children]) { g.remove(c); c.traverse((o) => { o.geometry?.dispose(); if (o.material) { o.material.map?.dispose(); o.material.dispose(); } }); } };
    const drawRef = () => {
      clear(ref);
      for (const [lam, name, col] of [[90, '夏至', 0xe0a050], [0, '二分', 0xb9a070], [270, '冬至', 0x7aa6e0]]) {
        const d = decOf(lam), c = arcCurve(d); if (!c) continue;
        ref.add(new THREE.Mesh(new THREE.TubeGeometry(c, 160, 0.0006, 6), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, toneMapped: false })));
        const l = lab(name, 0.0058, { color: '#fff8ea', bg: 'rgba(90,70,40,0.55)' }); l.position.copy(along(d, 0)).add(new THREE.Vector3(0, -0.009, 0)); l.rotation.y = 0.35; ref.add(l);
      }
    };
    const drawToday = () => {
      clear(today);
      const d = dec(), c = arcCurve(d); if (!c) return;
      today.add(new THREE.Mesh(new THREE.TubeGeometry(c, 220, 0.0014, 8), new THREE.MeshBasicMaterial({ color: 0xffb347, toneMapped: false })));
      today.add(new THREE.Mesh(new THREE.TubeGeometry(c, 220, 0.0042, 8), new THREE.MeshBasicMaterial({ color: 0xffb347, toneMapped: false, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending })));
      const t0 = halfDay(lat(), d);
      for (let hr = 0; hr <= 24; hr++) {          // 整点（地方时）：小白点；每 3 小时写钟点
        const t = tOf(hr); if (Math.abs(t) > t0 + 1e-6 || hr === 24) continue;
        const p = along(d, t);
        const dot = new THREE.Mesh(new THREE.SphereGeometry(hr % 3 ? 0.0011 : 0.0018, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); dot.material.userData.see = true; dot.position.copy(p); today.add(dot);          // 钟点就串在路径上（质检不算穿模）
        if (hr % 3 === 0 && hr !== 12) { const l = lab(`${hr}时`, 0.0062, { color: '#fff8ea', bg: 'rgba(150,90,30,0.75)' }); l.position.copy(p).add(new THREE.Vector3(0, 0.0095, 0)); l.rotation.y = 0.35; today.add(l); }
      }
    };

    // ---- 地上：旗杆的影子、影子尖一天走过的路、南北线 ----
    const ground = Y + 0.00035;
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x1f2a3a, transparent: true, opacity: 0.62, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = 3; group.add(shadow);
    const tipDot = new THREE.Mesh(new THREE.CircleGeometry(0.0018, 16), new THREE.MeshBasicMaterial({ color: 0x1f2a3a, transparent: true, opacity: 0.75, depthWrite: false })); tipDot.rotation.x = -Math.PI / 2; tipDot.renderOrder = 4; group.add(tipDot);
    const trail = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0x2b3448, dashSize: 0.003, gapSize: 0.002, transparent: true, opacity: 0.6 }));
    trail.renderOrder = 3; group.add(trail);
    const meridian = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, ground, fz + 0.02), new THREE.Vector3(0, ground, -0.1)]), new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.004, gapSize: 0.003, transparent: true, opacity: 0.7 }));
    meridian.computeLineDistances(); group.add(meridian);
    const tipOf = (dir) => { const k = POLE / Math.max(dir.y, 1e-4); return new THREE.Vector3(BASE.x - dir.x * k, ground, BASE.z - dir.z * k); };
    const MAXL = 0.18;          // 太阳很低时影子很长：画到操场边上为止
    const drawTrail = () => {
      const d = dec(), t0 = halfDay(lat(), d), pts = [];
      for (let i = 0; i <= 200; i++) { const t = -t0 + (i / 200) * 2 * t0, s = sunAt(lat(), d, t); if (s.alt < 3 * D2R) continue; const p = tipOf(s.dir); if (p.distanceTo(BASE) < MAXL) pts.push(p); }
      trail.geometry.dispose(); trail.geometry = new THREE.BufferGeometry().setFromPoints(pts.length > 1 ? pts : [BASE, BASE]); trail.computeLineDistances();
    };

    // ---- 摆好：日期、地点变了重画路径；时刻变了挪太阳、影子 ----
    let drawn = '';
    const layout = () => {
      const key0 = `${S.place}|${S.lam}`;
      if (key0 !== drawn) { drawn = key0; drawRef(); drawToday(); drawTrail(); }
      const d = dec(), t = tOf(S.hour), s = sunAt(lat(), d, t), up = s.alt > 0;
      sun.position.copy(C0).addScaledVector(s.dir, RD); sun.visible = up;
      key.position.copy(s.dir).multiplyScalar(0.6); key.target.position.set(0, 0, 0); key.intensity = up ? 2.4 * Math.min(1, s.alt / (8 * D2R)) : 0;
      hemi.intensity = up ? 0.9 : 0.28;
      const L = up ? Math.min(POLE / Math.tan(Math.max(s.alt, 1e-3)), MAXL) : 0;
      shadow.visible = tipDot.visible = up && L > 0.0006;
      if (shadow.visible) {
        const h = new THREE.Vector3(-s.dir.x, 0, -s.dir.z).normalize();
        shadow.scale.set(0.0024, L, 1); shadow.position.set(BASE.x + h.x * L / 2, ground, BASE.z + h.z * L / 2); shadow.rotation.set(-Math.PI / 2, 0, Math.atan2(-h.x, -h.z));
        tipDot.position.set(BASE.x + h.x * L, ground + 0.0001, BASE.z + h.z * L);
      }
      sky.visible = trail.visible = !S.pred;
      sunTag.loc(group, sun.position.x, sun.position.y + 0.022, sun.position.z).text(up ? `${hm(S.hour)} · 太阳高 ${dm(s.alt)}` : '').show(up && !S.pred);
      hintTag.loc(group, sun.position.x, sun.position.y - 0.02, sun.position.z).show(up && !S.pred && !S.dragged);
      readNow(s);
    };

    // ---- 读数、目标 ----
    const readNow = (s) => {
      if (!W) return;
      const d = dec(), t0 = halfDay(lat(), d), a = noonAlt(lat(), d), nd = sunAt(lat(), d, 0);
      W.out.set('date', DAYS.find((x) => x.lam === S.lam)?.name ?? dayName(S.n));
      W.out.set('time', hm(S.hour));
      W.out.set('alt', s.alt > 0 ? `${dm(s.alt)} · ${dirName(s.az)}` : '太阳在地平线以下');
      W.out.set('noon', a > 0 ? `${dm(a)} · ${Math.abs(lat() - d) < 1e-6 ? '头顶' : dirName(nd.az).replace('正', '在正')}` : '极夜');
      W.out.set('len', t0 >= Math.PI ? '24 小时（极昼）' : t0 <= 0 ? '0（极夜）' : `约 ${hm((2 * t0 * R2D) / 15).replace(':', ' 小时 ')} 分`);
      if (t0 > 0 && t0 < Math.PI) { const r = sunAt(lat(), d, -t0); W.out.set('rise', `${hm(12 - (t0 * R2D) / 15)} · ${dirName(r.az)}`); W.out.set('set', `${hm(12 + (t0 * R2D) / 15)} · ${dirName(-r.az)}`); }
      else { W.out.set('rise', '—'); W.out.set('set', '—'); }
    };
    const status = (m) => W?.ui.status(m);
    const check = () => {
      if (!W) return;
      const t = tOf(S.hour), s = sunAt(lat(), dec(), t);
      if (s.alt > 0 && (S.dragged || S.moved)) { if (t < -30 * D2R) S.seen.add('am'); if (t > 30 * D2R) S.seen.add('pm'); if (Math.abs(t) < 1.5 * D2R) S.seen.add('noon'); }
      const atNoon = Math.abs(t) < 1.5 * D2R, solstice = (l) => Math.abs(S.lam - l) < 0.5;
      if (atNoon && S.place === 0 && solstice(90)) S.seen.add('bj-summer');
      if (atNoon && S.place === 0 && solstice(270)) S.seen.add('bj-winter');
      if (!W.goal.has('noon') && S.seen.has('am') && S.seen.has('pm') && S.seen.has('noon')) { W.goal.done('noon'); status(`正午（地方时 12 时）太阳最高，旗杆的影子<b>最短</b>，正好落在南北线上、<b>指向正北</b>。正午太阳高度 a = 90° − |φ − δ| = ${dm(noonAlt(lat(), dec()))}。`); }
      if (!W.goal.has('season') && S.seen.has('bj-summer') && S.seen.has('bj-winter')) { W.goal.done('season'); status('北京：夏至正午太阳高 <b>73°26′</b>，白天约 15 小时，太阳从东北升起；冬至正午只有 <b>26°34′</b>，白天约 9 小时，从东南升起。冬至的影子长得多。'); }
      if (!W.goal.has('tropic') && S.place === 1 && solstice(90) && atNoon) { W.goal.done('tropic'); status('北回归线上的夏至正午：太阳正在<b>头顶</b>，太阳高度 90°，旗杆<b>没有影子</b>——立竿无影。'); }
    };
    const setHour = (h, fromSlider) => { if (fromSlider) S.moved = true; S.hour = Math.max(0, Math.min(24, h)); if (!fromSlider) W?.time.set(Math.round(S.hour * 20) / 20); layout(); check(); };
    const setLam = (lam, n) => { S.lam = lam; S.n = n ?? dayOf(lam); layout(); check(); };

    // ---- 拖太阳：沿今天的路径走（只在白天的那一段上） ----
    const v = new THREE.Vector3(), ws = new THREE.Vector3();
    const pick = (ray) => {
      const d = dec(), t0 = halfDay(lat(), d); if (t0 <= 0) return null;
      group.updateMatrixWorld(); group.getWorldScale(ws);
      let best = null, bd = Infinity;
      for (let i = 0; i <= 240; i++) { const t = -t0 + (i / 240) * 2 * t0; v.copy(along(d, t)); group.localToWorld(v); const dd = ray.distanceSqToPoint(v); if (dd < bd) { bd = dd; best = t; } }
      return { t: best, near: Math.sqrt(bd) < 0.02 * ws.x };
    };
    const canvasEl = () => document.getElementById('c');
    const pointer = {
      down(rc) { if (S.pred) return false; const p = pick(rc.ray); if (!p || !p.near) return false; S.drag = true; S.dragged = true; setHour(12 + (p.t * R2D) / 15); return true; },
      move(rc) {
        if (!S.drag) { const p = !S.pred && pick(rc.ray); const c = canvasEl(); if (c) c.style.cursor = p?.near ? 'grab' : ''; return false; }
        const p = pick(rc.ray); if (p) setHour(12 + (p.t * R2D) / 15); return true;
      },
      up() { if (!S.drag) return false; S.drag = false; return true; },
    };

    layout();
    return {
      group,
      card: false,
      size: { w: 0.42, d: 0.42, h: 0.26 },
      view: { elev: 24, azim: -10, lookY: 0.45, frameMargin: 1.0 },
      pointer,
      predicting(on) { S.pred = on; if (on) S.hour = 12; layout(); },
      mount(ui) {
        const out = readout([{ key: 'date', label: '日期' }, { key: 'time', label: '时刻（地方时）' }, { key: 'alt', label: '太阳高度 · 方向' }, { key: 'noon', label: '正午太阳高度' }, { key: 'len', label: '白天有多长' }, { key: 'rise', label: '日出' }, { key: 'set', label: '日落' }]);
        const placeSeg = seg('地点', PLACES.map((p) => `${p.name}（${dm(p.lat * D2R)}N）`), (_, i) => { S.place = i; layout(); check(); });
        const daySeg = seg('日期', DAYS.map((d) => d.name), (_, i) => { daySl.set(dayOf(DAYS[i].lam)); setLam(DAYS[i].lam); }, { value: 1 });
        const daySl = slider('拖着换日期', { min: 0, max: 364, value: S.n, fmt: dayName, onInput: (n) => { const lam = lamOf(n), hit = DAYS.findIndex((d) => Math.abs(((lam - d.lam + 540) % 360) - 180) < 0.6); daySeg.set(hit); setLam(hit >= 0 ? DAYS[hit].lam : lam, n); } });
        const time = slider('时刻（地方时）', { min: 0, max: 24, step: 0.05, value: S.hour, fmt: hm, onInput: (h) => setHour(h, true) });
        ui.controls.append(placeSeg.el, daySeg.el, daySl.el, time.el, note('直接拖天上的太阳也能拨时刻。时刻都是<b>地方时</b>：当地太阳最高的时候是 12 时（北京时间是东八区的区时，和这里不一样）。'));
        ui.data.append(out.el);
        W = { ui, out, time, goal: goals(ui, [['noon', '拖着太阳从日出走到日落，找出影子最短的时刻'], ['season', '把日期换到夏至、冬至，比较北京正午的太阳高度'], ['tropic', '把地点换到北回归线上，看夏至正午的影子']]) };
        layout(); check();
        ui.status('学校操场：北边是教学楼，南头是旗杆。今天是<b>夏至</b>，地点北京。拖着天上的太阳从日出走到日落，看旗杆的影子怎么变。');
      },
      update() {},
    };
  },
};

// 标签：画布按文字的实际宽度开，字不会被截掉。hw = 字高（米）
function lab(text, hw, { color = '#23293a', bg = 'rgba(255,252,244,0.94)', font = '"PingFang SC", "Hiragino Sans GB", "Songti SC", sans-serif', weight = 'bold' } = {}) {
  const c = document.createElement('canvas'), F = 84, pad = 22, g = c.getContext('2d');
  g.font = `${weight} ${F}px ${font}`; const tw = Math.ceil(g.measureText(text).width);
  c.width = tw + pad * 2; c.height = F + pad * 1.4;
  const g2 = c.getContext('2d'); if (bg) { g2.fillStyle = bg; g2.fillRect(0, 0, c.width, c.height); }
  g2.font = `${weight} ${F}px ${font}`; g2.fillStyle = color; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText(text, c.width / 2, c.height / 2 + 3);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const H = hw * (c.height / F), Wd = H * (c.width / c.height);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(Wd, H), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  m.renderOrder = 20; m.raycast = () => {};
  return m;
}

// 学校操场（立体书的一页）：底板、跑道和足球场、教学楼、升旗台和旗杆、树、东南西北
function buildYard(group) {
  const L = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...o });
  const add = (m, cast = true, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; group.add(m); return m; };
  // 立体书的底板：两层硬纸
  const W0 = 0.27, D0 = 0.21;
  add(new THREE.Mesh(new THREE.BoxGeometry(W0 + 0.008, 0.004, D0 + 0.008), L(0xd8ccae))).position.set(0, 0.012, 0);
  add(new THREE.Mesh(new THREE.BoxGeometry(W0, 0.005, D0), L(0xeee4cc))).position.set(0, 0.0165, 0);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.012, 0.014), L(0xcfc2a2))).position.set(x * (W0 / 2 - 0.025), 0.006, z * (D0 / 2 - 0.025));
  const Y = 0.019;
  // 地面：标准 400 米跑道（八道）、足球场、草坪条纹、塑胶颗粒
  const yard = canvasTex(2600, 2000, (g, W, H) => {
    g.fillStyle = '#e4dccb'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(120,110,90,${Math.random() * 0.05})`; g.fillRect(Math.random() * W, Math.random() * H, 3, 3); }
    const cx = W / 2, cy = H / 2 + 60, Ls = 1060, R0 = 380, lane = 34;
    const stadium = (r) => { g.beginPath(); g.moveTo(cx - Ls / 2, cy - r); g.lineTo(cx + Ls / 2, cy - r); g.arc(cx + Ls / 2, cy, r, -Math.PI / 2, Math.PI / 2); g.lineTo(cx - Ls / 2, cy + r); g.arc(cx - Ls / 2, cy, r, Math.PI / 2, Math.PI * 1.5); g.closePath(); };
    stadium(R0 + lane * 8 + 16); g.fillStyle = '#b44a35'; g.fill();
    for (let i = 0; i < 26000; i++) { g.fillStyle = `rgba(${60 + Math.random() * 60},20,10,${Math.random() * 0.12})`; g.fillRect(cx - Ls / 2 - R0 - 300 + Math.random() * (Ls + R0 * 2 + 600), cy - R0 - 300 + Math.random() * (R0 * 2 + 600), 2, 2); }
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 3.5; for (let k = 0; k <= 8; k++) { stadium(R0 + k * lane); g.stroke(); }
    g.lineWidth = 6; g.beginPath(); g.moveTo(cx + Ls / 2 - 40, cy + R0); g.lineTo(cx + Ls / 2 - 40, cy + R0 + lane * 8); g.stroke();          // 终点线
    stadium(R0 - 4); g.save(); g.clip();
    for (let k = -12; k < 12; k++) { g.fillStyle = k % 2 ? '#6f9b4c' : '#78a553'; g.fillRect(cx + k * 70, cy - R0, 70, R0 * 2); }          // 草坪修剪条纹
    for (let i = 0; i < 20000; i++) { g.fillStyle = `rgba(30,60,20,${Math.random() * 0.06})`; g.fillRect(cx - Ls / 2 - R0 + Math.random() * (Ls + 2 * R0), cy - R0 + Math.random() * 2 * R0, 2, 3); }
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.82)'; g.lineWidth = 5;
    const fw = 1000, fh = 600; g.strokeRect(cx - fw / 2, cy - fh / 2, fw, fh); g.beginPath(); g.moveTo(cx, cy - fh / 2); g.lineTo(cx, cy + fh / 2); g.stroke();
    g.beginPath(); g.arc(cx, cy, 92, 0, Math.PI * 2); g.stroke();
    for (const sx of [-1, 1]) { g.strokeRect(cx + sx * fw / 2 - (sx > 0 ? 160 : 0), cy - 200, 160, 400); g.strokeRect(cx + sx * fw / 2 - (sx > 0 ? 55 : 0), cy - 95, 55, 190); }
    // 升旗台前面的小广场（在操场北边、教学楼前）
    g.fillStyle = '#d6cfbf'; g.fillRect(cx - 230, 70, 460, 230);
    g.strokeStyle = 'rgba(120,110,90,0.25)'; g.lineWidth = 2; for (let x = cx - 230; x <= cx + 230; x += 46) { g.beginPath(); g.moveTo(x, 70); g.lineTo(x, 300); g.stroke(); } for (let y = 70; y <= 300; y += 46) { g.beginPath(); g.moveTo(cx - 230, y); g.lineTo(cx + 230, y); g.stroke(); }
  });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(W0, D0), new THREE.MeshStandardMaterial({ map: yard, roughness: 0.95 })); top.rotation.x = -Math.PI / 2; top.position.y = Y + 0.0002; add(top, false, true);
  // 教学楼：四层，凹进去的窗、屋顶女儿墙、门厅和台阶（在北边）
  const bz = -D0 / 2 + 0.017, bw = 0.12, bh = 0.036, bd = 0.02;
  add(new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), L(0xf3ede1))).position.set(0, Y + bh / 2, bz);
  add(new THREE.Mesh(new THREE.BoxGeometry(bw + 0.002, 0.003, bd + 0.002), L(0xd9d2c4))).position.set(0, Y + bh + 0.0015, bz);
  add(new THREE.Mesh(new THREE.BoxGeometry(bw + 0.002, 0.0018, bd + 0.002), L(0xb94c3a))).position.set(0, Y + 0.0009, bz);
  const glass = L(0x8fb4d4, { roughness: 0.25, metalness: 0.2 }), frame = L(0xc9c2b4);
  for (let fl = 0; fl < 4; fl++) for (let i = 0; i < 10; i++) {
    if (fl === 0 && (i === 4 || i === 5)) continue;
    const x = -bw / 2 + 0.008 + i * 0.0116, y = Y + 0.006 + fl * 0.0078;
    add(new THREE.Mesh(new THREE.BoxGeometry(0.0072, 0.0046, 0.0008), frame), false, false).position.set(x, y, bz + bd / 2 + 0.0002);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.0062, 0.0038, 0.0006), glass), false, false).position.set(x, y, bz + bd / 2 + 0.0006);
  }
  add(new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.002, 0.008), L(0xe6dfd2))).position.set(0, Y + 0.011, bz + bd / 2 + 0.004);          // 门厅雨棚
  for (const k of [0, 1, 2]) add(new THREE.Mesh(new THREE.BoxGeometry(0.024 - k * 0.002, 0.0012, 0.006 - k * 0.0015), L(0xd8d1c3))).position.set(0, Y + 0.0006 + k * 0.0012, bz + bd / 2 + 0.003);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.008, 0.0006), L(0x5b6472)), false, false).position.set(0, Y + 0.004, bz + bd / 2 + 0.0004);
  // 升旗台：三级台阶的方台；旗杆顶上一个圆球；红旗 3:2，有褶皱
  const fz = D0 / 2 - 0.03;          // 升旗台在操场南头：正午的影子朝北，越过跑道和草坪，长短看得清
  for (const k of [0, 1, 2]) add(new THREE.Mesh(new THREE.BoxGeometry(0.03 - k * 0.006, 0.0018, 0.03 - k * 0.006), L(0xe2dccf))).position.set(0, Y + 0.0009 + k * 0.0018, fz);
  const PB = Y + 0.0054, HP = 0.055;
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.0007, 0.0011, HP, 12), L(0xdfe3e7, { metalness: 0.5, roughness: 0.35 }))).position.set(0, PB + HP / 2, fz);
  add(new THREE.Mesh(new THREE.SphereGeometry(0.0016, 16, 12), L(0xd9b44a, { metalness: 0.6, roughness: 0.3 }))).position.set(0, PB + HP + 0.0012, fz);
  const fg = new THREE.PlaneGeometry(0.018, 0.012, 24, 8); fg.translate(0.009, 0, 0);
  const fpos = fg.attributes.position; for (let i = 0; i < fpos.count; i++) { const x = fpos.getX(i); fpos.setZ(i, Math.sin(x * 330) * 0.0014 * (x / 0.018) + Math.sin(x * 150 + fpos.getY(i) * 200) * 0.0005); } fg.computeVertexNormals();
  add(new THREE.Mesh(fg, L(0xd02b22, { side: THREE.DoubleSide, roughness: 0.7 }))).position.set(0.0008, PB + HP - 0.0075, fz);
  // 树：一簇簇的树冠，两种绿
  const tree = (x, z, sc, kind) => {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.0011 * sc, 0.0017 * sc, 0.012 * sc, 8), L(0x76553a))).position.set(x, Y + 0.006 * sc, z);
    if (kind === 'cone') { for (const [h, r] of [[0.012, 0.0075], [0.018, 0.0058], [0.024, 0.004]]) add(new THREE.Mesh(new THREE.ConeGeometry(r * sc, 0.011 * sc, 12), L(0x3f6e3c, { flatShading: true }))).position.set(x, Y + h * sc, z); return; }
    const col = [0x5d8c45, 0x6f9c50, 0x4f7c3c];
    for (let k = 0; k < 6; k++) { const a = k * 2.1, r = 0.0045 * sc; add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.0062 * sc * (0.8 + 0.3 * Math.sin(k * 1.7)), 2), L(col[k % 3], { flatShading: true }))).position.set(x + Math.cos(a) * r, Y + (0.016 + 0.004 * Math.sin(k)) * sc, z + Math.sin(a) * r); }
  };
  for (const [x, z, sc, k] of [[-0.118, -0.08, 1.05, 'ball'], [-0.118, -0.03, 0.9, 'cone'], [-0.118, 0.02, 1, 'ball'], [-0.118, 0.075, 0.95, 'cone'], [0.118, -0.08, 1, 'cone'], [0.118, -0.03, 1.05, 'ball'], [0.118, 0.025, 0.92, 'cone'], [0.118, 0.078, 1, 'ball'], [-0.075, -0.093, 0.85, 'ball'], [0.075, -0.093, 0.85, 'ball']]) tree(x, z, sc, k);
  for (const [t, x, z] of [['北', 0, -D0 / 2 - 0.014], ['南', 0, D0 / 2 + 0.014], ['东', W0 / 2 + 0.014, 0], ['西', -W0 / 2 - 0.014, 0]]) { const l = lab(t, 0.008, { font: '"Songti SC", serif', bg: 'rgba(255,252,244,0.9)' }); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.0012, z); group.add(l); }
  return { fz, PB, HP, Y, W0, D0 };
}
