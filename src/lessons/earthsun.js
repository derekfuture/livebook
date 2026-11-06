// 高中地理 选择性必修1 第一章第二节 地球运动的地理意义 · 昼夜长短和正午太阳高度的变化（课本第 7–12 页，图 1.10、1.15、1.16）。
//
// 一个问题：为什么同一天，不同地方白天长短、正午太阳高度不一样？一年里又怎么变？
// 书页上是一台“灯 + 地球仪”的公转仪：中间一盏灯是太阳，地球仪架在一圈轨道上，地轴斜着、始终指向北极星。
// 学生亲手做的三件事：
//   1. 推着地球仪沿轨道走（换日期）：地轴方向不变，太阳直射点在南北回归线之间移动，晨昏线跟着变；
//   2. 拨地球仪自转（换时刻）：你家转进白天、转进黑夜；
//   3. 把“你家”的小旗拖到别的纬度（或选一座城市），再选一座城市来比。
// “你家的天空”小窗一直开着：今天太阳从哪边升、正午多高、白天多长，另一座城市的太阳路径画成虚线一起比。
// 推到春分、夏至、秋分、冬至时，记下你家那天的昼长和正午太阳高度，攒成一张表（就是课本图 1.15 那种）。
// 全部按公式当场算（src/lessons/kit/sun.js，tools/geo/sun_check.mjs 核对课本第 12 页和图 1.15 的数）。
// 教学示意：大小、距离不按比例；一年按均匀走算（不计近日点、远日点快慢）；时刻是地方时，不计大气折射。
import * as THREE from 'three';
import { seg, slider, buttons, note } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { groundLabel, airLabel, noteBadge } from './kit/labels.js';
import { h } from '../ui/Panel.js';
import { D2R, R2D, EPS, decOf, dm, hm, dur, altText, sunAt, halfDay, noonAlt, snapSeason, noonText, skyJoin, skyX } from './kit/sun.js';

const R = 0.12, SY = 0.08, ER = 0.046;          // 轨道半径、灯和地球仪中心的高度、地球仪半径
const CITIES = [{ name: '摩尔曼斯克', lat: 68.97 }, { name: '哈尔滨', lat: 45.75 }, { name: '北京', lat: 40 }, { name: '广州', lat: 23.13 }, { name: '新加坡', lat: 1.3 }, { name: '悉尼', lat: -33.87 }];
const KEY = [{ name: '春分', lam: 0, date: '3 月 21 日前后' }, { name: '夏至', lam: 90, date: '6 月 21 日前后' }, { name: '秋分', lam: 180, date: '9 月 23 日前后' }, { name: '冬至', lam: 270, date: '12 月 22 日前后' }];
const ASK = ['先猜一下（可以不猜）：在这个情境里，夏至这一天，哈尔滨的白天比广州——', ['长', '短', '一样长']];
// 地球在轨道上的角度 θ（从上往下看逆时针）和太阳黄经 λ：夏至时北极斜向太阳。地轴斜向 +x，所以夏至时地球在 −x 那边（θ = 180°）
const thetaOf = (lam) => ((lam + 90) % 360 + 360) % 360, lamOf = (th) => ((th - 90) % 360 + 360) % 360;
const latName = (l) => (Math.abs(l) < 0.05 ? '赤道' : `${l > 0 ? '北' : '南'}纬 ${dm(Math.abs(l) * D2R)}`);
const dayLen = (lat, dec) => (2 * halfDay(lat, dec) * R2D) / 15;

export default {
  id: 'earthsun',
  fig: '图1.15',
  title: '昼夜长短和正午太阳高度',
  flow: 'explore',
  ask: '北京的夏天，晚上七点多天还亮着；到了冬天，下午五点就黑了。同一天，哈尔滨和广州的白天也不一样长。这是为什么？',
  need: '推着地球仪走到夏至、冬至（和一个分日），记下你家的昼长和正午太阳高度；再换一座城市比一比',
  conclusion: {
    page: 15,
    quote: '自春分日至秋分日，是北半球的夏半年，太阳直射北半球，北半球各纬度昼弧大于夜弧，昼长大于夜长。纬度越高，昼越长，夜越短，至北极四周为极昼。其中，夏至日太阳直射北回归线，北半球昼最长、夜最短，北极圈及其以北地区皆为极昼。……春分日和秋分日，太阳直射赤道，全球各地昼夜等长，均为12时。……正午太阳高度随纬度不同和季节变化而有规律地变化。……在北回归线及其以北的纬度带，正午太阳高度夏至日达最大值，冬至日达最小值；……',
    why: '地轴是斜的，而且在公转时方向不变（始终指向北极星附近），所以一年里太阳直射点在南北回归线之间来回移动。直射点在北半球时，晨昏线把北半球的纬线圈分得昼弧长、夜弧短，越往北白天越长；到了南半球就反过来。正午太阳高度只看你家和直射点隔着多少纬度：正午太阳高度 = 90° − 两者的纬度差。所以北回归线以北，夏至正午太阳最高、冬至最低；回归线之间的地方，一年里太阳会两次直射头顶。',
    src: '课本第 10–12 页 · 第一章 第二节 地球运动的地理意义',
  },

  create({ tag }) {
    const group = new THREE.Group();
    const S = { th: thetaOf(0), t: 12, lat: 40, city: 2, other: 3, drag: null, play: false, rec: {}, guess: null, saw: new Set() };
    let W = null;
    const lit = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.2, ...o });
    const brass = lit(0xb89656, { metalness: 0.6, roughness: 0.35, emissive: 0x3a2a10, emissiveIntensity: 0.4 });
    const dark = lit(0x3b3f47, { roughness: 0.6 });

    // ---- 底座：一圈轨道，上面刻着二分二至 ----
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.0022, 10, 160), brass); ring.rotation.x = Math.PI / 2; ring.position.y = 0.004; group.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(R + 0.03, 96), new THREE.MeshBasicMaterial({ color: 0xf6f1e4, transparent: true, opacity: 0.82 })); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.0015; disc.raycast = () => {}; group.add(disc);          // 公转仪底下垫一层浅纸色，压住书页上密密的字
    const keyTags = KEY.map((k) => { const a = thetaOf(k.lam) * D2R, p = new THREE.Vector3(Math.cos(a) * (R + 0.012), 0.006, -Math.sin(a) * (R + 0.012) - 0.004); const t = groundLabel(group, k.name, { x: p.x, y: 0.0025, z: p.z, h: 0.017, color: '#3a3020', opacity: 0.9 }); groundLabel(group, k.date, { x: p.x, y: 0.0025, z: p.z + 0.014, h: 0.0095, color: '#5a4d36', opacity: 0.85 }); const tick = new THREE.Mesh(new THREE.BoxGeometry(0.0015, 0.004, 0.012), brass); tick.position.set(Math.cos(a) * R, 0.004, -Math.sin(a) * R); tick.rotation.y = a; group.add(tick); return t; });          // 二分二至印在底座的纸面上：名字大，日期小一号、写在名字下面
    // 公转方向：轨道边上几个小箭头（从上往下看逆时针）
    for (let i = 0; i < 4; i++) { const a = (i * 90 + 45) * D2R, c = new THREE.Mesh(new THREE.ConeGeometry(0.003, 0.009, 8), brass); c.position.set(Math.cos(a) * R, 0.005, -Math.sin(a) * R); c.rotation.x = Math.PI / 2; c.rotation.z = 0; c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-Math.sin(a), 0, -Math.cos(a))); group.add(c); }

    // ---- 太阳：一盏灯 ----
    const sunPost = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.005, SY - 0.02, 16), dark); sunPost.position.y = (SY - 0.02) / 2; group.add(sunPost);
    const sun = new THREE.Mesh(new THREE.SphereGeometry(0.02, 32, 20), new THREE.MeshBasicMaterial({ color: 0xffd27a })); sun.position.y = SY; group.add(sun);
    const glowTex = canvasTex(256, 256, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,230,160,0.95)'); gr.addColorStop(0.35, 'rgba(255,200,110,0.45)'); gr.addColorStop(1, 'rgba(255,190,90,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false })); glow.scale.set(0.11, 0.11, 1); glow.position.y = SY; glow.raycast = () => {}; group.add(glow);

    // ---- 地球仪：小车沿轨道走，上面立着地球；地轴斜 23°26′，始终指向同一个方向 ----
    const cart = new THREE.Group(); group.add(cart);
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.004, SY - ER - 0.004, 12), dark); stand.position.y = (SY - ER - 0.004) / 2 + 0.004; cart.add(stand);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.011, 0.005, 24), brass); foot.position.y = 0.004; cart.add(foot);
    const AX = new THREE.Vector3(Math.sin(EPS), Math.cos(EPS), 0);          // 地轴（北端），斜向 +x
    const tilt = new THREE.Group(); tilt.position.y = SY; tilt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), AX); cart.add(tilt);
    const spin = new THREE.Group(); tilt.add(spin);
    const sunUni = { sunDir: { value: new THREE.Vector3(1, 0, 0) } };
    const globeMat = new THREE.ShaderMaterial({
      uniforms: sunUni,
      vertexShader: 'varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position,1.0); vP = position; gl_Position = projectionMatrix * viewMatrix * wp; }',
      fragmentShader: `uniform vec3 sunDir; varying vec3 vN; varying vec3 vP;
        void main(){
          float d = dot(normalize(vN), normalize(sunDir));
          float lat = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 day = mix(vec3(0.36,0.62,0.86), vec3(0.62,0.80,0.93), 0.5 + 0.5 * cos(lat * 2.0));
          vec3 night = vec3(0.09,0.13,0.25);
          float k = smoothstep(-0.035, 0.035, d);
          vec3 c = mix(night, day * (0.72 + 0.28 * max(d, 0.0)), k);
          c += vec3(1.0,0.85,0.55) * 0.18 * (1.0 - abs(d) / 0.06) * step(abs(d), 0.06);          // 晨昏线上淡淡一道暖光
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    const globe = new THREE.Mesh(new THREE.SphereGeometry(ER, 64, 40), globeMat); spin.add(globe);
    const latLine = (lat, color, dashed) => {          // 纬线：赤道、回归线、极圈
      const pts = []; for (let i = 0; i <= 128; i++) { const a = (i / 128) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * Math.cos(lat) * ER * 1.004, Math.sin(lat) * ER * 1.004, Math.sin(a) * Math.cos(lat) * ER * 1.004)); }
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), dashed ? new THREE.LineDashedMaterial({ color, dashSize: 0.002, gapSize: 0.0015 }) : new THREE.LineBasicMaterial({ color })); if (dashed) l.computeLineDistances(); l.raycast = () => {}; return l;
    };
    tilt.add(latLine(0, 0xc0462e, false), latLine(EPS, 0xd99a3a, true), latLine(-EPS, 0xd99a3a, true), latLine(Math.PI / 2 - EPS, 0x6b8fc7, true), latLine(-(Math.PI / 2 - EPS), 0x6b8fc7, true));          // 纬线不跟着自转（是一圈圈对称的）
    for (let m = 0; m < 12; m++) { const a = (m / 12) * Math.PI * 2, pts = []; for (let i = 0; i <= 64; i++) { const la = -Math.PI / 2 + (i / 64) * Math.PI; pts.push(new THREE.Vector3(Math.cos(a) * Math.cos(la) * ER * 1.003, Math.sin(la) * ER * 1.003, Math.sin(a) * Math.cos(la) * ER * 1.003)); } const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 })); l.raycast = () => {}; spin.add(l); }
    const axisRod = new THREE.Mesh(new THREE.CylinderGeometry(0.0008, 0.0008, ER * 2.9, 8), brass); tilt.add(axisRod);
    const nTag = airLabel(group, '地轴始终指向北极星', { h: 0.0135, color: '#2c3245', icon: 'star' });
    // 太阳直射点：地球仪上正对着灯的那一点
    const subDot = new THREE.Mesh(new THREE.SphereGeometry(0.0018, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff3b1f })); group.add(subDot);
    const ray = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineDashedMaterial({ color: 0xffb347, dashSize: 0.004, gapSize: 0.003 })); ray.raycast = () => {}; group.add(ray);
    const tSub = airLabel(group, '', { h: 0.0135, color: '#a8541a', icon: 'sun' });
    // 你家、另一座城：地球仪上的小旗
    const flag = (color) => { const g = new THREE.Group(), pole = new THREE.Mesh(new THREE.CylinderGeometry(0.0006, 0.0006, 0.013, 6), dark); pole.position.y = 0.0065; g.add(pole); const f = new THREE.Mesh(new THREE.PlaneGeometry(0.0085, 0.0055), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })); f.position.set(0.0043, 0.0105, 0); g.add(f); const pick = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 0.007; pick.userData.pick = true; g.add(pick); g.userData.pick = pick; spin.add(g); return g; };          // 小旗看着不大，能按住的范围放大一圈
    const home = flag(0xd8392b), other = flag(0x8a93a3);
    const putFlag = (f, lat) => { const la = lat * D2R; f.position.set(Math.cos(la) * ER, Math.sin(la) * ER, 0); f.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), f.position.clone().normalize()); };
    const homeTag = airLabel(group, '', { h: 0.015, color: '#a8341f', icon: 'home' });
    const labels = [nTag, tSub, homeTag];
    const cartPick = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.03, 12), new THREE.MeshBasicMaterial({ visible: false })); cartPick.position.y = 0.016; cartPick.userData.pick = true; cart.add(cartPick);
    const tHint = tag('<span>推着地球仪沿轨道走</span><small>按住地球仪左右拖，它就自转</small>', 'hint');          // 开场的提示：不用白底牌子
    noteBadge(tag, '教学示意：大小、距离不按比例').loc(group, -R - 0.02, 0.004, R + 0.012);

    // ---- 摆好：按日期、时刻 ----
    const dec = () => decOf(lamOf(S.th));
    const layout = () => {
      S.th = thetaOf(snapSeason(lamOf(S.th)));
      const a = S.th * D2R, ep = new THREE.Vector3(Math.cos(a) * R, 0, -Math.sin(a) * R);
      cart.position.copy(ep);
      const ec = ep.clone().setY(SY), sdir = new THREE.Vector3(0, SY, 0).sub(ec).normalize(); sunUni.sunDir.value.copy(sdir);
      // 自转：让“你家”的经线在 S.t 时刻对着正确的方向。先算地球仪坐标里太阳的方向，再转
      const q = tilt.getWorldQuaternion(new THREE.Quaternion()), sLocal = sdir.clone().applyQuaternion(q.clone().invert());          // 地轴坐标系里（y 是地轴）
      const sunLon = Math.atan2(sLocal.z, sLocal.x), hourAngle = (S.t - 12) * 15 * D2R;          // 正午：你家所在的经线（+x 方向）正对太阳那条经线
      spin.rotation.y = -sunLon + hourAngle;          // 时间往后走，地球自西向东转（从北极上空看逆时针，绕地轴转的角度变大）
      putFlag(home, S.lat); putFlag(other, CITIES[S.other].lat); other.visible = S.other !== S.city || S.city < 0;
      const d = dec(), sub = ec.clone().addScaledVector(sdir, ER * 1.01); subDot.position.copy(sub);
      ray.geometry.setFromPoints([new THREE.Vector3(0, SY, 0), sub]); ray.computeLineDistances();
      tSub.position.set(sub.x, sub.y - 0.016, sub.z); tSub.setText(`直射 ${latName(d * R2D)}`);
      const np = new THREE.Vector3(0, ER * 1.45, 0).applyQuaternion(tilt.quaternion).add(new THREE.Vector3(ep.x, SY, ep.z)); nTag.position.set(np.x, np.y + 0.01, np.z);
      home.updateMatrixWorld(true); const hp = home.getWorldPosition(new THREE.Vector3()), op = other.getWorldPosition(new THREE.Vector3()), gp = group.getWorldPosition(new THREE.Vector3());
      const hl = group.worldToLocal(hp.clone()), ol = group.worldToLocal(op.clone());
      homeTag.position.set(hl.x, hl.y + 0.018, hl.z); homeTag.setText(`你家 ${hm(S.t)}`);
      tHint.loc(group, ep.x, 0.01, ep.z + 0.03).show(!S.saw.size);
      recordKey(); drawSky(); drawTable();
    };

    // ---- 二分二至：推到那儿，就把你家那天的昼长、正午太阳高度记进表里 ----
    const keyNear = () => KEY.find((k) => Math.abs(((lamOf(S.th) - k.lam + 540) % 360) - 180) < 4);
    const recordKey = () => {
      const k = keyNear(); if (!k) return;
      const name = S.city >= 0 ? CITIES[S.city].name : latName(S.lat), d = decOf(k.lam), lat = S.lat * D2R;
      (S.rec[name] ||= {})[k.name] = { len: dayLen(lat, d), noon: noonAlt(lat, d) }; S.saw.add(k.name);
      if (W && !S.said?.[k.name + name]) { (S.said ||= {})[k.name + name] = 1; W.ui.status(`${k.name}（${k.date}）：太阳直射 ${latName(d * R2D)}。你家（${name}）白天 ${dur(dayLen(lat, d))}，正午太阳高度 ${altText(noonAlt(lat, d))}，已记进表里。`); }
      if (['夏至', '冬至'].every((x) => S.rec[name]?.[x]) && (S.rec[name]['春分'] || S.rec[name]['秋分']) && Object.keys(S.rec).length >= 2) W?.ui.unlock();
    };
    const drawTable = () => {
      if (!W) return;
      const names = Object.keys(S.rec), cell = (r, k) => (r[k] ? `${dur(r[k].len)}<br><small>${altText(r[k].noon)}</small>` : '');
      W.table.innerHTML = names.length ? `<table class="rec"><tr><th></th>${KEY.map((k) => `<th>${k.name}</th>`).join('')}</tr>${names.map((n) => `<tr><th>${n}</th>${KEY.map((k) => `<td>${cell(S.rec[n], k.name)}</td>`).join('')}</tr>`).join('')}</table><p class="note">每格上面是昼长，下面是正午太阳高度。</p>` : '<p class="note">还没记：推着地球仪走到春分、夏至、秋分、冬至。</p>';
      const g = S.guess;
      if (g != null && S.rec['哈尔滨']?.['夏至'] && S.rec['广州']?.['夏至']) W.table.insertAdjacentHTML('beforeend', `<p class="note">你猜：${ASK[1][g]}　实际：哈尔滨 ${dur(S.rec['哈尔滨']['夏至'].len)}，广州 ${dur(S.rec['广州']['夏至'].len)}</p>`);
    };

    // ---- 你家的天空：今天太阳走过的路（实线），另一座城（虚线）；现在太阳在哪 ----
    const drawSky = () => {
      if (!W) return;
      const c = W.sky, g = c.getContext('2d'), w = c.width, hh = c.height, d = dec(), lat = S.lat * D2R, now = sunAt(lat, d, (S.t - 12) * 15 * D2R);
      const noonSouth = lat >= d;          // 正午太阳在南边还是北边：画面中间朝那边
      const X = (az, alt = 0) => skyX(az, alt, noonSouth, w), Y = (alt) => hh - 26 - (alt * R2D / 90) * (hh - 26 - 96);          // 高处横向收束到天顶，上方留出读数和天顶标签
      const day = now.alt > 0, gr = g.createLinearGradient(0, 0, 0, hh);
      if (day) { gr.addColorStop(0, '#5f9fd8'); gr.addColorStop(1, '#d4e7f5'); } else { gr.addColorStop(0, '#0f1a33'); gr.addColorStop(1, '#2c3c63'); }
      g.fillStyle = gr; g.fillRect(0, 0, w, hh);
      const path = (la, dash, col) => { g.save(); g.setLineDash(dash); g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); let up = false, prev = 0; for (let k = 0; k <= 288; k++) { const s = sunAt(la, d, (k / 288 * 24 - 12) * 15 * D2R); if (s.alt < 0) { up = false; continue; } const x = X(s.az, s.alt), y = Y(s.alt), u = s.az === null ? null : X(s.az); if (up && (u === null || prev === null || skyJoin(u, prev, w))) g.lineTo(x, y); else g.moveTo(x, y); up = true; prev = u; } g.stroke(); g.restore(); };
      if (S.other !== S.city) path(CITIES[S.other].lat * D2R, [5, 4], day ? 'rgba(80,80,90,0.75)' : 'rgba(200,210,230,0.6)');
      path(lat, [], day ? '#c9572c' : '#f0a070');
      g.fillStyle = '#7d9c63'; g.fillRect(0, hh - 26, w, 26);
      g.fillStyle = '#2a3140'; g.font = '600 12px "PingFang SC", sans-serif'; g.textAlign = 'center';
      for (const [az, n] of [[90, '东'], [180, '南'], [270, '西'], [0, '北']]) { const x = X(az * D2R); if (x > 8 && x < w - 8) g.fillText(n, x, hh - 9); }
      g.fillStyle = day ? '#2a3140' : '#ffffff'; g.fillText('天顶 90°（方位收束示意）', w / 2, 89);
      if (day) { const x = X(now.az, now.alt), y = Y(now.alt), sg = g.createRadialGradient(x, y, 0, x, y, 16); sg.addColorStop(0, 'rgba(255,240,170,1)'); sg.addColorStop(0.4, 'rgba(255,215,110,0.9)'); sg.addColorStop(1, 'rgba(255,215,110,0)'); g.fillStyle = sg; g.fillRect(x - 16, y - 16, 32, 32); }
      const hd = halfDay(lat, d), len = (2 * hd * R2D) / 15, txt = hd >= Math.PI - 1e-6 ? '极昼：太阳整天不落，白天 24 小时' : hd <= 1e-6 ? '极夜：太阳整天不出来' : `日出 ${hm(12 - len / 2)}　日落 ${hm(12 + len / 2)}　白天 ${dur(len)}`;
      g.fillStyle = 'rgba(250,247,238,0.96)'; g.fillRect(0, 0, w, 76);
      const otherName = () => CITIES[S.other].name;
      const pill = (x, y, s, al = 'left') => { g.font = '600 12px "PingFang SC", sans-serif'; const tw = g.measureText(s).width, x0 = al === 'left' ? x : x - tw - 12; g.fillStyle = 'rgba(255,255,255,0.88)'; g.beginPath(); g.roundRect(x0, y, tw + 12, 19, 9); g.fill(); g.fillStyle = '#2a3140'; g.textAlign = 'left'; g.fillText(s, x0 + 6, y + 14); };
      pill(6, 6, txt); pill(6, 29, noonText(lat, d));
      pill(6, 52, `现在 ${hm(S.t)}：${day ? `太阳高度 ${dm(now.alt)}` : '夜里'}`); if (S.other !== S.city) pill(w - 6, 52, `虚线：${otherName()}`, 'right');
    };

    // ---- 指针：推小车（沿轨道）、拖地球仪（自转）、拖小旗（换纬度） ----
    const plane = new THREE.Plane(), hit = new THREE.Vector3();
    const onFloor = (ray, y) => { group.updateMatrixWorld(); const p = group.localToWorld(new THREE.Vector3(0, y, 0)); plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), p); if (!ray.intersectPlane(plane, hit)) return null; return group.worldToLocal(hit.clone()); };
    let t0 = 0;
    const pointer = {
      down(rc) {
        const hits = rc.intersectObjects([home.userData.pick, cartPick, globe], false); if (!hits.length) return false;
        const o = hits[0].object; S.drag = o === home.userData.pick ? 'flag' : o === globe ? 'spin' : 'cart'; t0 = S.t; S.sx = null;
        document.getElementById('c').style.cursor = 'grabbing'; return true;
      },
      move(rc, e) {
        const c = document.getElementById('c');
        if (!S.drag) { if (c) c.style.cursor = rc.intersectObjects([home.userData.pick, cartPick, globe], false).length ? 'grab' : ''; return false; }
        if (S.drag === 'cart') { const p = onFloor(rc.ray, 0.004); if (!p) return true; S.th = ((Math.atan2(-p.z, p.x) * R2D) % 360 + 360) % 360; const k = keyNear(); W?.dateSeg.set(k ? KEY.indexOf(k) : -1); }          // 日期按钮跟着地球仪的位置
        else if (S.drag === 'spin') { const px = e?.clientX ?? 0; if (S.sx == null) S.sx = px; S.t = ((t0 + (px - S.sx) / 18) % 24 + 24) % 24; W?.time.set(S.t); }          // 往右拖：自西向东转，时间往后走
        else { const hitG = rc.intersectObject(globe, false)[0]; if (hitG) { const l = spin.worldToLocal(hitG.point.clone()).normalize(); S.lat = Math.max(-89.5, Math.min(89.5, Math.asin(l.y) * R2D)); S.city = -1; W?.citySeg.set(-1); } }          // 可以一直拖到极圈以内，看极昼、极夜
        S.saw.add('moved'); layout(); return true;
      },
      up() { if (!S.drag) return false; S.drag = null; document.getElementById('c').style.cursor = ''; return true; },
    };

    layout();

    return {
      debug: { S, layout },
      group,
      card: false,
      emerge: 'flat',          // 课本的图平放在书页上，模型从它上面长出来、它慢慢淡掉：一张图立了起来，连贯不闪
      size: { w: 0.32, d: 0.32, h: 0.14 },
      view: { elev: 30, azim: -20, lookY: 0.42, frameMargin: 1.18 },
      pointer,
      mount(ui) {
        const dateSeg = seg('推到哪一天（也可以直接推地球仪）', KEY.map((k) => k.name), (_, i) => { S.th = thetaOf(KEY[i].lam); layout(); }, { value: 0 });
        const time = slider('时刻（地方真太阳时；也可以按住地球仪左右拖）', { min: 0, max: 24, step: 1 / 60, value: S.t, fmt: (v) => hm(v), onInput: (v) => { S.t = v; S.play = false; if (W) W.play.textContent = '转一天'; layout(); } });
        const citySeg = seg('你家在', CITIES.map((c) => c.name), (_, i) => { S.city = i; S.lat = CITIES[i].lat; layout(); }, { value: S.city });
        const otherSeg = seg('和哪座城比', CITIES.map((c) => c.name), (_, i) => { S.other = i; layout(); }, { value: S.other });
        const guess = seg(...ASK, (_, i) => { S.guess = i; drawTable(); }, { value: -1 });
        const acts = buttons([
          { text: '转一天', onClick: () => { S.play = !S.play; S.played = 0; acts.btns[0].textContent = S.play ? '停一下' : '转一天'; } },
          { text: '重来', ghost: true, onClick: () => { ui.relock?.(); Object.assign(S, { th: thetaOf(0), t: 12, lat: 40, city: 2, other: 3, play: false, played: 0, rec: {}, guess: null, saw: new Set(), said: {} }); dateSeg.set(0); time.set(12); citySeg.set(2); otherSeg.set(3); guess.set(-1); acts.btns[0].textContent = '转一天'; layout(); } },
        ]);
        const sky = h('canvas', { class: 'wx-map', width: 320, height: 230 });
        const table = h('div', {});
        ui.controls.append(h('div', { class: 'bar-title' }, '你家的天空（实线是你家，虚线是比的那座城）'), sky, h('div', { class: 'note' }, '计算条件：地方真太阳时；太阳中心过几何地平线；忽略大气折射、太阳视半径和地形遮挡。不是城市实测预报。'), dateSeg.el, time.el, acts.el, citySeg.el, otherSeg.el, guess.el, note('地球仪上的红旗是你家，也可以直接把它拖到别的纬度。比的只是纬度：两面旗画在同一条经线上，时刻都按各自的地方真太阳时。'));          // 天空小窗放在最上面：推地球仪的时候一眼就看得到
        ui.data.append(h('div', { class: 'bar-title' }, '你记下的'), table);
        W = { ui, sky, table, time, citySeg, dateSeg, play: acts.btns[0] };
        ui.status('这是一台“灯 + 地球仪”：中间的灯是太阳。<b>推着地球仪</b>沿轨道走到夏至、冬至，看地轴的方向、太阳直射点和你家的天空怎么变。');
        layout();
      },
      update(dt) {
        labels.forEach((l) => l.tick(dt));
        if (S.play) { S.t = (S.t + dt * 3) % 24; S.played = (S.played || 0) + dt * 3; if (S.played >= 24) { S.play = false; S.played = 0; if (W) W.play.textContent = '转一天'; } W?.time.set(S.t); layout(); }          // 转满一天自动停
      },
    };
  },
};
