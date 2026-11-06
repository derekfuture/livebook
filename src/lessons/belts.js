// 高中地理 选择性必修1 第三章第二节 气压带和风带（课本第 48–50 页，图 3.10 地球上的气压带和风带、图 3.11 气压带和风带的季节移动）。
//
// 一个问题（课本开头）：麦哲伦的船队，哪段航程是逆风？为什么到了南纬 30° 附近反而平静无风、寸步难行？
// 课本的图就是模型：一个地球仪（不画大陆——课本也是先“假设地球表面是均匀的”），表面按气压带着色，近地面一支支小箭头是风；
// 左边沿着地球的轮廓，画着三圈环流（上升、高空、下沉、近地面）。学生亲手做的：
//   1. 拖一条小帆船沿着经线南北走（往西、往西北航行，像麦哲伦船队）：船上的气流方向箭头和“顺风 / 逆风 / 未判定”跟着变。
//   2. 换个条件：假如地球不自转——下垫面均匀、理想化纬向受热、太阳直射赤道且没有地转偏向力时，每半球一个环流圈，近地面的风直直吹向赤道，三圈环流和信风、西风都没了。
//   3. 换季节：7 月气压带、风带一起往北挪，1 月往南挪（图 3.11）。
// 教学示意：环流圈的高度大大夸大了；风带的界线、季节移动的度数都是示意。
import * as THREE from 'three';
import { seg, buttons, note } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { airLabel, noteBadge } from './kit/labels.js';
import { h } from '../ui/Panel.js';
import { BELTS, WINDS, windAt, relWind, beltNear, beltLat } from './kit/belts.js';

const R = 0.075, CY = R + 0.02, D2R = Math.PI / 180;
const SEASONS = [['1 月', -5], ['春分、秋分', 0], ['7 月', 5]];
const ASK = ['先猜一下（可以不猜）：在这个情境里，船从南美洲南端往西走，会是——', ['顺风', '逆风', '平静无风']];

export default {
  id: 'belts',
  fig: '图3.10',
  title: '气压带和风带',
  flow: 'explore',
  ask: '麦哲伦的船队绕过南美洲南端时风大浪高，到了南纬 30° 附近却平静无风、热得难受，后来一路吹着东南风。哪段是逆风？为什么 30° 附近那么难走？',
  need: '把船从南美洲南端（约南纬 50°）推到赤道，看哪段逆风、哪段经过副热带高压带、哪段顺风；再假设地球不自转比一比；换个季节看气压带怎么挪',
  conclusion: {
    page: 53,
    quote: '赤道地区接受太阳辐射能量多，近地面的空气受热膨胀上升，空气密度减小，气压降低。这样赤道地区就形成了一个低压带——赤道低压带。……来自赤道高空的气流在这里不断堆积下沉，使地面气压升高，形成副热带高压带。……这样，全球共形成七个气压带……在气压带之间形成了六个风带……由此可以知道，麦哲伦船队航行至南美洲南端的海峡时受盛行西风影响，船队逆风航行；航行至30°S附近海域时，受副热带高压带控制，气流下沉，平静无风，加之天气炎热，航行十分艰难；船队航行至东南信风带时，顺风航行，这段航程最为轻松。……在北半球，与二分日相比，气压带和风带的位置大致是夏季偏北，冬季偏南。',
    why: '赤道受热多，空气上升，地面成了低压；上升的空气在高空流向两极，一路被地转偏向力往一边推，到 30° 附近已经偏成了西风、流不过去，堆积下沉，地面成了高压；从这里流回赤道的空气偏成信风，流向高纬的偏成西风；极地冷空气下沉成高压，流出的偏成极地东风，在 60° 附近和西风相遇抬升成低压。所以气压带和风带一高一低、一层层相间；高压带近地面辐散，低压带近地面辐合；不能由升降气流推出水平无风。本模型不计算风速。无地转偏转的单圈模型还假定下垫面均匀、理想化纬向受热、太阳直射赤道，并非现实地球停止自转后的预测。',
    src: '课本第 48–50 页 · 第三章 第二节 气压带和风带',
  },

  create({ tag }) {
    const group = new THREE.Group();
    const S = { shift: 0, rot: true, lat: -50, drag: false, visited: new Set(), guess: null, saw: {} };
    let W = null, seaSegRef = null;

    // ---- 地球仪：架子 + 一个不画大陆的地球，表面按气压带着色 ----
    const brass = new THREE.MeshStandardMaterial({ color: 0xb89656, metalness: 0.6, roughness: 0.35, emissive: 0x3a2a10, emissiveIntensity: 0.4 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.034, 0.008, 40), brass); base.position.y = 0.004; group.add(base);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, CY - R - 0.006, 16), brass); stem.position.y = 0.008 + (CY - R - 0.006) / 2 - 0.002; group.add(stem);
    const uni = { shift: { value: 0 }, rot: { value: 1 } };
    const globeMat = new THREE.ShaderMaterial({
      uniforms: uni,
      vertexShader: 'varying vec3 vP; varying vec3 vN; void main(){ vP = position; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float shift; uniform float rot; varying vec3 vP; varying vec3 vN;
        void main(){
          float lat = degrees(asin(clamp(normalize(vP).y, -1.0, 1.0)));
          vec3 sea = mix(vec3(0.42,0.64,0.80), vec3(0.62,0.78,0.88), 0.5 + 0.5 * cos(radians(lat) * 2.0));
          float l = lat - shift * step(abs(lat), 85.0);
          float p = cos(radians(l) * 6.0);          // 每 30° 一高一低：赤道低、30° 高、60° 低、极地高
          p = mix(cos(radians(lat) * 2.0), p, rot);          // 不自转：只有赤道低、两极高
          vec3 hi = vec3(0.90,0.48,0.38), lo = vec3(0.34,0.52,0.86);
          float band = smoothstep(0.55, 0.92, abs(p));
          vec3 c = mix(sea, p > 0.0 ? lo : hi, band * 0.75);          // 着色：红是高压带，蓝是低压带（靠近气压带才上色）
          float shade = 0.72 + 0.32 * max(dot(normalize(vN), normalize(vec3(-0.3, 0.6, 0.8))), 0.0);
          gl_FragColor = vec4(c * shade, 1.0);
        }`,
    });
    const globe = new THREE.Mesh(new THREE.SphereGeometry(R, 72, 48), globeMat); globe.position.y = CY; group.add(globe);
    const lineM = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 });
    const latLine = (lat, m = lineM) => { const pts = []; for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * Math.cos(lat * D2R) * R * 1.002, CY + Math.sin(lat * D2R) * R * 1.002, Math.sin(a) * Math.cos(lat * D2R) * R * 1.002)); } const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), m); l.raycast = () => {}; group.add(l); return l; };
    const eqLine = latLine(0, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
    const beltLines = BELTS.filter((b) => Math.abs(b.lat) !== 90 && b.lat !== 0).map((b) => ({ b, l: latLine(b.lat, new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.002, gapSize: 0.0015, transparent: true, opacity: 0.7 })) }));
    beltLines.forEach(({ l }) => l.computeLineDistances());
    const ringMat = brass; const meridian = new THREE.Mesh(new THREE.TorusGeometry(R * 1.06, 0.0012, 8, 96, Math.PI), ringMat); meridian.position.y = CY; meridian.rotation.z = -Math.PI / 2; meridian.rotation.y = Math.PI / 2; group.add(meridian);          // 地球仪的子午圈

    // ---- 近地面的风：沿纬线一支支小箭头（只摆朝着镜头的那半边） ----
    const NA = 5 * 17;
    const arrowGeo = new THREE.ConeGeometry(0.0022, 0.0075, 8); arrowGeo.rotateX(Math.PI / 2);          // 尖朝 +z
    const arrows = new THREE.InstancedMesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0x1f3f75 }), NA); arrows.raycast = () => {}; group.add(arrows);
    const AL = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), sc = new THREE.Vector3();
    for (let i = 0; i < 17; i++) for (let j = 0; j < 5; j++) AL.push([-80 + i * 10, -48 + j * 24]);          // [纬度, 经度]（经度 0 正对镜头）
    const enu = (lat, lon) => { const la = lat * D2R, lo = lon * D2R, up = new THREE.Vector3(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)), east = new THREE.Vector3(Math.cos(lo), 0, -Math.sin(lo)), north = new THREE.Vector3().crossVectors(up, east); return { up, east, north }; };
    const placeArrows = () => {
      AL.forEach(([lat, lon], k) => {
        const w = windAt(lat, S.shift, S.rot), f = enu(lat, lon), dir = f.east.clone().multiplyScalar(w.u).add(f.north.clone().multiplyScalar(w.v)), sp = Math.hypot(w.u, w.v);
        const p = f.up.clone().multiplyScalar(R * 1.012).add(new THREE.Vector3(0, CY, 0));
        if (sp < 0.12) { m4.compose(p, q, sc.setScalar(1e-4)); arrows.setMatrixAt(k, m4); return; }
        const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), dir.normalize(), f.up); q.setFromRotationMatrix(m); q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI));          // lookAt 让 -z 朝目标：转 180° 让尖朝风吹去的方向
        m4.compose(p, q, sc.set(1, 1, 0.6 + 0.8 * Math.min(1, sp))); arrows.setMatrixAt(k, m4);
      });
      arrows.instanceMatrix.needsUpdate = true;
    };

    // ---- 三圈环流：画在地球右边的轮廓外面（对着镜头的那个子午面），一圈圈带箭头的环 ----
    const loopMat = new THREE.MeshBasicMaterial({ color: 0x2a5a9a, transparent: true, opacity: 0.85 });
    const loops = new THREE.Group(); group.add(loops);
    const cellPath = (a, b, H) => {          // 纬度 a（上升的一侧）到 b（下沉的一侧）：近地面 b→a，a 处上升，高空 a→b，b 处下沉
      const pt = (lat, hgt) => { const la = lat * D2R, r = R * (1.03 + hgt); return new THREE.Vector3(-Math.cos(la) * r, CY + Math.sin(la) * r, 0); };          // 画在地球左边的轮廓外（和课本图 3.10 一样）
      const P = [], n = 14;
      for (let i = 0; i <= n; i++) P.push(pt(b + (a - b) * (i / n), 0));
      for (let i = 1; i <= 4; i++) P.push(pt(a, (i / 4) * H));
      for (let i = 1; i <= n; i++) P.push(pt(a + (b - a) * (i / n), H));
      for (let i = 1; i < 4; i++) P.push(pt(b, H - (i / 4) * H));
      return new THREE.CatmullRomCurve3(P, true, 'catmullrom', 0.2);
    };
    const buildLoops = () => {
      for (const o of [...loops.children]) { loops.remove(o); o.geometry.dispose(); }
      const sh = S.shift, cells = S.rot ? [[sh, 30 + sh, 0.16], [60 + sh, 30 + sh, 0.12], [60 + sh, 90, 0.08], [sh, -30 + sh, 0.16], [-60 + sh, -30 + sh, 0.12], [-60 + sh, -90, 0.08]] : [[sh, 88, 0.16], [sh, -88, 0.16]];
      for (const [a, b, H] of cells) {
        const c = cellPath(a, b, H), tube = new THREE.Mesh(new THREE.TubeGeometry(c, 90, 0.0008, 6, true), loopMat); tube.raycast = () => {}; loops.add(tube);
        for (const u of [0.12, 0.5, 0.72]) { const hd = new THREE.Mesh(new THREE.ConeGeometry(0.0026, 0.007, 10), loopMat); hd.position.copy(c.getPointAt(u)); hd.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.getTangentAt(u)); hd.raycast = () => {}; loops.add(hd); }
      }
      loops.rotation.y = Math.PI * 0.16;          // 左边的轮廓往镜头这边转一点，环流圈露在地球前面，不被挡住
    };

    // ---- 小帆船：在正对镜头的经线上，拖着它南北走 ----
    const boat = new THREE.Group(); group.add(boat);
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.003, 0.005), new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.7 })); hull.position.y = 0.0015; boat.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.0004, 0.0004, 0.014, 6), new THREE.MeshStandardMaterial({ color: 0x5a4028 })); mast.position.y = 0.009; boat.add(mast);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.008, 0.01), new THREE.MeshStandardMaterial({ color: 0xf4f0e4, side: THREE.DoubleSide })); sail.position.set(0, 0.009, 0); boat.add(sail);
    const vaneM = new THREE.MeshBasicMaterial({ color: 0xc4462e }), vane = new THREE.Mesh(new THREE.ConeGeometry(0.0018, 0.009, 8), vaneM); vane.position.y = 0.018; boat.add(vane);          // 船上的气流方向箭头：指着风吹去的方向
    const boatPick = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), new THREE.MeshBasicMaterial({ visible: false })); boatPick.position.y = 0.006; boatPick.userData.pick = true; boat.add(boatPick);
    const heading = (lat) => (lat < -40 ? 270 : 315);          // 麦哲伦船队：绕过南美南端往西；进了太平洋以后往西北
    const tBoat = airLabel(group, '', { h: 0.0078, color: '#2c3245', icon: 'wind' }), tHint = tag('<span>按住小帆船</span><small>往北（上）推</small>', 'hint'), tScale = noteBadge(tag, '教学示意：环流圈的高度大大夸大了，不画海陆，风带界线和季节移动的度数是示意');
    const callout = airLabel(group, '', { h: 0.008, color: '#a8341f', dim: 0 }); callout.setOn(false); let calloutT = 0;
    callout.show = (on) => callout.setOn(on);          // 一段话亮几秒就收
    const say1 = (text, p) => { callout.position.set(p.x + 0.03, p.y + 0.02, p.z); callout.setText(text).setOn(true); calloutT = 4; };
    const tUD = [[0, '上升'], [30, '下沉'], [60, '上升'], [80, '下沉']].map(([lat, t]) => ({ lat, t: airLabel(group, t, { h: 0.0095, color: '#2c3245', icon: t === '上升' ? 'up' : 'down', dim: 0 }) }));
    const placeUD = () => { const cs = Math.cos(Math.PI * 0.16), sn = Math.sin(Math.PI * 0.16); tUD.forEach(({ lat, t }, i) => { const la = (lat + (Math.abs(lat) >= 80 ? 0 : S.shift)) * D2R, r = R * 1.22, x = -Math.cos(la) * r; t.position.set(x * cs, CY + Math.sin(la) * r, -x * sn); t.setOn(S.rot); }); };
    const tBelts = [];          // 右边轮廓上：每条气压带一个“高”“低”
    for (const b of BELTS) tBelts.push({ b, t: airLabel(group, b.p === 'H' ? '高' : '低', { h: 0.011, color: b.p === 'H' ? '#b03a2a' : '#1f4f86', dim: 0 }) });
    const labels = [tBoat, callout, ...tUD.map((o) => o.t), ...tBelts.map((o) => o.t)];

    const placeBoat = () => {
      const f = enu(S.lat, 0), p = f.up.clone().multiplyScalar(R).add(new THREE.Vector3(0, CY, 0));
      const hd = heading(S.lat), fwd = f.east.clone().multiplyScalar(Math.sin(hd * D2R)).add(f.north.clone().multiplyScalar(Math.cos(hd * D2R)));
      boat.position.copy(p); boat.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(fwd, f.up, new THREE.Vector3().crossVectors(fwd, f.up)));
      const w = relWind(S.lat, hd, S.shift, S.rot), wd = f.east.clone().multiplyScalar(w.u).add(f.north.clone().multiplyScalar(w.v));
      vane.visible = w.known; if (vane.visible) { const local = wd.clone().applyQuaternion(boat.quaternion.clone().invert()).normalize(); vane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), local); }
      const bn = beltNear(S.lat, S.shift, 2);          // 气压带附近只说明辐合或辐散
      tBoat.position.set(p.x - 0.03, p.y + 0.006, p.z); tBoat.setText(`${Math.abs(Math.round(S.lat))}°${S.lat >= 0 ? 'N' : 'S'} ${S.rot ? (bn ? bn.name.replace(/^(北半球|南半球)/, '') : w.belt.replace(/^(北半球|南半球)/, '')) : ''} · ${w.dir} · ${w.rel}`);
      tHint.loc(group, p.x + 0.05, p.y - 0.022, p.z).show(!S.visited.size);
      return { w, bn, p };
    };
    const placeBeltTags = () => { const cs = Math.cos(Math.PI * 0.12), sn = Math.sin(Math.PI * 0.12); tBelts.forEach(({ b, t }) => { const lat = beltLat(b, S.shift) * D2R, r = R * 1.25, x = Math.cos(lat) * r; t.position.set(x * cs, CY + Math.sin(lat) * r, -x * sn); t.setOn(S.rot); }); tScale.loc(group, -R - 0.06, 0.004, R * 0.6); };

    // ---- 侧栏：一张从北极到南极的条：气压带（高 / 低）和每个风带的风向；船在哪 ----
    const drawChart = (cur) => {
      if (!W) return;
      const c = W.chart, g = c.getContext('2d'), w = c.width, hh = c.height, T = 10, B = hh - 10, Y = (lat) => T + ((90 - lat) / 180) * (B - T);
      g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, hh); g.font = '600 12px "PingFang SC", sans-serif'; g.textBaseline = 'middle';
      if (S.rot) {
        for (const b of BELTS) { const y = Y(beltLat(b, S.shift)); g.fillStyle = b.p === 'H' ? 'rgba(229,122,97,0.9)' : 'rgba(87,133,219,0.9)'; g.fillRect(8, y - 6, 118, 12); g.fillStyle = '#fff'; g.textAlign = 'left'; g.fillText(b.name.replace('北半球', '北').replace('南半球', '南'), 12, y); }
        WINDS.forEach((z, i) => { const y = (Y(z.a + (Math.abs(z.a) === 90 ? 0 : S.shift)) + Y(z.b + (Math.abs(z.b) === 90 ? 0 : S.shift))) / 2; g.fillStyle = '#2a3140'; g.textAlign = 'left'; g.fillText(`${z.name.replace(/^(北半球|南半球)/, '')}：${z.dir}`, 136, y); });
      } else { g.fillStyle = '#2a3140'; g.textAlign = 'left'; g.fillText('理想化无地转偏转：', 12, Y(60)); g.fillText('赤道受热上升，两极冷却下沉，', 12, Y(40)); g.fillText('每个半球只有一个大环流圈，', 12, Y(20)); g.fillText('近地面北半球吹北风、南半球吹南风。', 12, Y(0)); }
      const y = Y(S.lat); g.fillStyle = '#c4462e'; g.beginPath(); g.moveTo(w - 8, y); g.lineTo(w - 18, y - 6); g.lineTo(w - 18, y + 6); g.fill(); g.textAlign = 'right'; g.fillText('船', w - 20, y);
      W.read.innerHTML = `船在 <b>${Math.abs(Math.round(S.lat))}°${S.lat >= 0 ? 'N' : 'S'}</b>，往${heading(S.lat) === 270 ? '西' : '西北'}航行：${cur.w.dir}，<b>${cur.w.rel}</b>${cur.bn && S.rot ? `（${cur.bn.name}${cur.bn.p === 'H' ? '：气流下沉' : '：气流上升'}；不据此判定风速）` : ''}`;
    };
    const drawLog = () => {
      if (!W) return;
      const rows = [], r = (b, t) => rows.push(h('div', { class: 'tl-row' }, h('b', {}, b), h('span', {}, t)));
      if (S.saw.west) r('南美南端往西：', '盛行西风，逆风；风浪大小未模拟');
      if (S.saw.calm) r('南纬 30° 附近：', '副热带高压带，近地面辐散；课本所述航程遇到静风，本模型未计算风速');
      if (S.saw.trade) r('再往西北：', '东南信风，顺风，最轻松');
      if (S.saw.norot) r('理想化无地转偏转：', '下垫面均匀、直射赤道时，没有地转偏转，每半球一个环流圈，近地面的风直直吹向赤道');
      if (S.saw.season) r('换季节：', '7 月气压带、风带整体偏北，1 月偏南');
      if (S.guess != null && S.saw.west) rows.push(h('div', { class: 'tl-row' }, h('small', {}, `你猜：${ASK[1][S.guess]}　实际：逆风（盛行西风）`)));
      W.log.replaceChildren(...rows);
      if (S.saw.west && S.saw.calm && S.saw.trade && S.saw.norot) W.ui.unlock();
    };
    const events = (cur) => {
      if (!S.rot || S.shift !== 0 || !S.visited.size) return;          // 自己推过船才算看到
      const was = { ...S.saw };
      if (S.lat < -40 && S.lat > -60 && cur.w.rel === '逆风') S.saw.west = true;
      if (Math.abs(S.lat + 30) < 3 && cur.bn?.p === 'H') S.saw.calm = true;
      if (S.lat > -25 && S.lat < -5 && cur.w.rel === '顺风') S.saw.trade = true;
      if (S.saw.west && !was.west) say1('逆风：盛行西风迎面吹来', cur.p);
      if (S.saw.calm && !was.calm) say1('副热带高压带：下沉、近地面辐散', cur.p);
      if (S.saw.trade && !was.trade) say1('顺风：东南信风推着船走', cur.p);
      if (JSON.stringify(was) !== JSON.stringify(S.saw)) drawLog();
    };
    // 季节移动时，虚线纬线要挪到新纬度：直接重建更简单
    const rebuildBeltLines = () => { for (const { b, l } of beltLines) { const la = beltLat(b, S.shift) * D2R, pts = []; for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * Math.cos(la) * R * 1.002, CY + Math.sin(la) * R * 1.002, Math.sin(a) * Math.cos(la) * R * 1.002)); } l.geometry.dispose(); l.geometry = new THREE.BufferGeometry().setFromPoints(pts); l.computeLineDistances(); l.scale.set(1, 1, 1); l.position.y = 0; l.visible = S.rot; } };
    const layout2 = () => { uni.shift.value = S.shift; uni.rot.value = S.rot ? 1 : 0; rebuildBeltLines(); placeArrows(); buildLoops(); placeBeltTags(); placeUD(); const cur = placeBoat(); drawChart(cur); events(cur); };

    // ---- 拖船：沿着正对镜头的经线 ----
    const pointer = {
      down(rc) { if (!rc.intersectObject(boatPick, false).length) return false; S.drag = true; document.getElementById('c').style.cursor = 'grabbing'; return true; },
      move(rc) {
        const c = document.getElementById('c');
        if (!S.drag) { if (c) c.style.cursor = rc.intersectObject(boatPick, false).length ? 'grab' : ''; return false; }
        const hg = rc.intersectObject(globe, false)[0]; if (!hg) return true;          // 在地球表面上拖：碰到哪个纬度，船就到哪
        const l = globe.worldToLocal(hg.point.clone()).normalize();
        S.lat = Math.max(-62, Math.min(62, Math.asin(l.y) / D2R)); S.visited.add(Math.round(S.lat / 10)); layout2(); return true;
      },
      up() { if (!S.drag) return false; S.drag = false; document.getElementById('c').style.cursor = ''; return true; },
    };

    layout2();

    return {
      debug: { S, layout: layout2 },
      group,
      card: false,
      emerge: 'flat',          // 课本的图平放在书页上，模型从它上面长出来、它慢慢淡掉
      size: { w: 0.3, d: 0.2, h: 0.2 },
      view: { elev: 8, azim: 0, lookY: 0.5, frameMargin: 1.45 },
      pointer,
      mount(ui) {
        const rotSeg = seg('地球', ['在自转', '理想化无偏转'], (_, i) => { S.rot = !i; if (i) { S.saw.norot = true; S.shift = 0; seaSegRef.set(1); } seaSegRef.el.style.opacity = i ? 0.4 : 1; seaSegRef.el.style.pointerEvents = i ? 'none' : ''; callout.show(false); calloutT = 0; layout2(); drawLog(); ui.status(i ? '理想化无地转偏转：下垫面均匀、理想化纬向受热、太阳直射赤道且没有地转偏向力时，每半球一个环流圈，近地面的风直直吹向赤道。三圈环流、信风、西风都没了。' : '地球在自转：空气一边流一边被偏转，形成三圈环流、七个气压带、六个风带。'); }, { value: 0 });
        const seaSeg = seg('季节', SEASONS.map((x) => x[0]), (_, i) => { S.shift = SEASONS[i][1]; if (i !== 1) S.saw.season = true; callout.show(false); calloutT = 0; layout2(); drawLog(); }, { value: 1 });
        seaSegRef = seaSeg;          // 假如不自转：只看春分、秋分（季节移动先不考虑）
        const guess = seg(...ASK, (_, i) => { S.guess = i; drawLog(); }, { value: -1 });
        const acts = buttons([{ text: '重来', ghost: true, onClick: () => { ui.relock?.(); S.lat = -50; S.rot = true; S.shift = 0; S.saw = {}; S.guess = null; S.visited.clear(); rotSeg.set(0); seaSeg.set(1); guess.set(-1); callout.show(false); layout2(); drawLog(); ui.status('船在南美洲南端（约南纬 50°）。按住<b>小帆船</b>往北推，看一路上的风。'); } }]);
        const chart = h('canvas', { class: 'wx-map', width: 320, height: 210 }), read = h('div', { class: 'read-out' }), log = h('div', { class: 'timeline' });
        ui.controls.append(h('div', { class: 'bar-title' }, '气压带和风带（北 → 南）'), chart, read, h('div', { class: 'note' }, '只示意风向和辐合、辐散，不计算风速。跨赤道转向未模拟。船上箭头指气流吹去方向。无偏转模型：下垫面均匀、理想化纬向受热、太阳直射赤道。'), guess.el, rotSeg.el, seaSeg.el, acts.el, note('地球上红色是高压带，蓝色是低压带；小箭头和船上气流方向箭头均指吹去方向，仅示意方向，不表示风速。季节迁移只示意带的位置；跨赤道区不显示固定信风方向，转向过程未模拟。无偏转模型假定下垫面均匀、太阳直射赤道、理想化纬向受热。'));
        ui.data.append(h('div', { class: 'bar-title' }, '你看到了什么'), log);
        W = { ui, chart, read, log };
        ui.status('船在南美洲南端（约南纬 50°）。按住<b>小帆船</b>往北推，看一路上哪段逆风、哪段经过副热带高压带、哪段顺风。');
        layout2(); drawLog();
      },
      update(dt) { labels.forEach((l) => l.tick(dt)); if (calloutT > 0) { calloutT -= dt; if (calloutT <= 0) callout.show(false); } },
    };
  },
};
