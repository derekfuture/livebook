// 地理 · 地球目录：这本书的活页都在这一颗地球上（不是课本上的某一张图）。
// 课本自己举的例子发生在哪里，就在哪里插一面旗（断层：华山—渭河平原；锋：江淮的梅雨；气旋：台风在厦门登陆……）；
// 整个地球的事（地球运动、气压带和风带、洋流、板块）在地球上叠一层，鼠标移到名字上就显出来；不分地方的原理模型列在一边。
// 点一面旗（或侧栏里的名字）：地球转过去、镜头飞近，书翻到那一页，活页照旧从课本的图里升起来。书一直在，按章节上课的方式不变。
// 旗的颜色按章：同一章一个颜色。位置只到“那一带”，地球的起伏没有画。
import * as THREE from 'three';
import { canvasTex } from './kit/props.js';
import { airLabel, noteBadge } from './kit/labels.js';
import { h } from '../ui/Panel.js';
import { ll2v } from './kit/plates.js';
import { ANCHORS, CHAPTER_COLORS, chapterOf } from './kit/atlas.js';
import reliefUrl from './data/earth_relief.jpg';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

const R = 0.09, CY = R + 0.036, TILT = (23.44 * Math.PI) / 180;
const KIND_TEXT = { place: '地点', layer: '整个地球', idea: '原理' };

export default {
  id: 'atlas',
  index: true,
  fig: '地球目录',
  title: '这本书的活页，都在这颗地球上',
  flow: 'explore',
  ask: '课本里举的例子发生在哪里，旗就插在哪里；整个地球的事叠在地球上；不分地方的原理列在下面。<b>点一面旗或一个名字</b>，飞过去，翻到那一页。',
  conclusion: { src: '' },
  place: 'spread',

  create({ tag, camera, look, spot }) {
    const items = (spot?.items || []).map((it) => ({ ...it, a: ANCHORS[it.id] || { kind: 'idea', note: '' }, ch: chapterOf(it.sec) }));
    const group = new THREE.Group();
    const S = { drag: null, target: null, hover: null, go: null, layer: null, moved: false };
    let W = null;

    // ---- 地球仪：黄铜底座、子午圈，地轴斜 23.5°；地球用真实地形的晕渲图 ----
    const brass = new THREE.MeshStandardMaterial({ color: 0xb89656, metalness: 0.65, roughness: 0.32, emissive: 0x3a2a10, emissiveIntensity: 0.35 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.042, 0.009, 64), brass); base.position.y = 0.0045; group.add(base);
    const foot = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.0016, 10, 64), brass); foot.rotation.x = Math.PI / 2; foot.position.y = 0.009; group.add(foot);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.005, CY - R - 0.004, 20), brass); post.position.y = 0.009 + (CY - R - 0.004) / 2; group.add(post);
    const tiltG = new THREE.Group(); tiltG.position.y = CY; tiltG.rotation.z = -TILT; group.add(tiltG);          // 地轴往右斜，正对镜头的经线不歪
    const meridian = new THREE.Mesh(new THREE.TorusGeometry(R * 1.1, 0.0013, 8, 120, Math.PI), brass); meridian.rotation.z = -Math.PI / 2; tiltG.add(meridian);          // 子午圈：半圈，在地球右边，从南极绕到北极托着地轴
    for (const sg of [1, -1]) { const cap = new THREE.Mesh(new THREE.SphereGeometry(0.0026, 14, 10), brass); cap.position.y = sg * R * 1.1; tiltG.add(cap); }
    const earthRot = new THREE.Group(); tiltG.add(earthRot);
    const tex = new THREE.TextureLoader().load(reliefUrl); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const globe = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 96), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.88, metalness: 0 })); earthRot.add(globe);
    const atm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.045, 64, 48), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.BackSide,
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float r = 1.0 - abs(dot(normalize(vN), normalize(vV))); gl_FragColor = vec4(0.55, 0.75, 1.0, pow(r, 3.0) * 0.55); }' }));          // 一圈淡淡的大气光
    atm.raycast = () => {}; tiltG.add(atm);
    earthRot.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 2.79);          // 一开始东亚朝着镜头（这本书的旗多在这里）

    // ---- 旗：一根细杆，顶上一颗按章着色的小珠子，旁边是名字（只在朝着镜头的那一面写） ----
    const glowTex = canvasTex(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const pins = [], pickers = [];
    for (const it of items) {
      if (it.a.kind !== 'place') continue;
      const color = CHAPTER_COLORS[(it.ch || 1) - 1] || '#c8402c';
      for (const pn of it.a.pins) {
        const n = new THREE.Vector3(...ll2v(pn.lat, pn.lon)), g = new THREE.Group(); earthRot.add(g);
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.00045, 0.00045, R * 0.075, 6), new THREE.MeshStandardMaterial({ color: 0x3b3f47, roughness: 0.6 })); stalk.position.copy(n).multiplyScalar(R * 1.0375); stalk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n); g.add(stalk);
        const bead = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 18, 12), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.4 })); bead.position.copy(n).multiplyScalar(R * 1.078); g.add(bead);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, depthWrite: false, opacity: 0 })); glow.scale.setScalar(0.016); glow.position.copy(bead.position); glow.raycast = () => {}; g.add(glow);
        const pick = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); pick.position.copy(bead.position); pick.userData.pick = true; pick.userData.it = it; pick.userData.pn = pn; g.add(pick); pickers.push(pick);
        const label = airLabel(earthRot, pn.name, { h: 0.0062, color: '#1c2a44', dim: 0 }), la = (pn.lat * Math.PI) / 180, lo = (pn.lon * Math.PI) / 180, east = new THREE.Vector3(-Math.sin(lo), 0, -Math.cos(lo)), north = new THREE.Vector3(-Math.sin(la) * Math.cos(lo), Math.cos(la), Math.sin(la) * Math.sin(lo));
        const placeLabel = () => label.position.copy(n).multiplyScalar(R * 1.085).addScaledVector(east, (pn.side ?? 1) * (label.scale.x / 2 + 0.0045)).addScaledVector(north, pn.up ?? 0); placeLabel();          // 名字写在旗的一侧，挨着的旗名字分到两边
        pins.push({ it, pn, n, bead, glow, label, hot: false, placeLabel });
      }
    }

    // ---- 整个地球的事：鼠标移到名字上时叠在地球上 ----
    const sunM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { k: { value: 0 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float k; varying vec3 vP; void main(){ float d = dot(normalize(vP), vec3(1.0, 0.0, 0.0)); float night = 1.0 - smoothstep(-0.04, 0.04, d); float line = 1.0 - smoothstep(0.0, 0.03, abs(d)); float soft = 1.0 - smoothstep(-0.3, 0.05, d); gl_FragColor = vec4(mix(vec3(0.02,0.04,0.12), vec3(1.0,0.82,0.5), line * (1.0 - night * 0.5)), k * max(max(night * 0.72, soft * 0.25), line * 0.85)); }' });          // 太阳在右边，地轴的北端斜向太阳（6 月 22 日前后，北半球夏至）：背着太阳的半个地球是黑夜，中间一道晨昏线
    const sunLayer = new THREE.Mesh(new THREE.SphereGeometry(R * 1.004, 96, 64), sunM); sunLayer.raycast = () => {}; tiltG.add(sunLayer); sunLayer.rotation.z = TILT;          // 太阳光是水平照来的：抵消地轴的倾斜
    const beltM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { k: { value: 0 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float k; varying vec3 vP; void main(){ float lat = asin(clamp(normalize(vP).y, -1.0, 1.0)); float p = cos(lat * 6.0); float band = smoothstep(0.55, 0.92, abs(p)); vec3 c = p > 0.0 ? vec3(0.34,0.52,0.86) : vec3(0.90,0.48,0.38); gl_FragColor = vec4(c, k * band * 0.55); }' });          // 赤道低、30° 高、60° 低、极地高（和气压带那张活页一样的配色：红高蓝低）
    const beltLayer = new THREE.Mesh(new THREE.SphereGeometry(R * 1.005, 96, 64), beltM); beltLayer.raycast = () => {}; tiltG.add(beltLayer);
    const plateG = new THREE.Group(); earthRot.add(plateG); let plateLoaded = false;
    const loadPlates = async () => {          // 板块边界：用板块那张活页同一份 PB2002 数据（第一次要看时才加载）
      if (plateLoaded) return; plateLoaded = true;
      const LINES = (await import('./data/plates.js')).default, COL = { grow: 0xd8342c, die: 0x23a04e, slide: 0x8a8e96 };
      for (const k of Object.keys(COL)) { const P = []; for (const l of LINES) { if (l.k !== k) continue; for (let i = 0; i < l.pts.length - 1; i++) { const a = l.pts[i], b = l.pts[i + 1]; P.push(...ll2v(a[1], a[0]).map((v) => v * R * 1.006), ...ll2v(b[1], b[0]).map((v) => v * R * 1.006)); } } const g2 = new LineSegmentsGeometry(); g2.setPositions(P); const ln = new LineSegments2(g2, new LineMaterial({ color: COL[k], linewidth: k === 'slide' ? 1.4 : 2.4, worldUnits: false, transparent: true, opacity: 0 })); ln.raycast = () => {}; plateG.add(ln); }          // 和板块那张活页一样：红是生长边界、绿是消亡边界、灰是转换边界
    };
    const curL = [['拉布拉多寒流', 55, -57], ['北大西洋暖流', 56, -22]].map(([t, la, lo]) => { const l = airLabel(earthRot, t, { h: 0.0062, color: t.includes('寒') ? '#1f4f86' : '#a8341f', dim: 0 }); l.position.set(...ll2v(la, lo).map((v) => v * R * 1.06)); l.setOn(false); return l; });          // 课本里洋流影响沿岸的例子
    const LAYER_VIEW = { sun: null, belts: null, plates: null, current: [52, -40] };          // 看洋流时把北大西洋转过来
    const setLayer = (k) => { S.layer = k; if (k === 'plates') loadPlates(); if (k && LAYER_VIEW[k]) turnTo(...LAYER_VIEW[k]); };

    // ---- 转动：拖着转；选中一面旗时，地球转过去让它朝着镜头 ----
    const camDirLocal = () => { const c = new THREE.Vector3(); camera.getWorldPosition(c); const p = new THREE.Vector3(); tiltG.getWorldPosition(p); const d = c.sub(p).normalize(); const q = new THREE.Quaternion(); tiltG.getWorldQuaternion(q); return d.applyQuaternion(q.invert()); };
    function turnTo(lat, lon) { const cd = camDirLocal(), camLon = (Math.atan2(-cd.z, cd.x) * 180) / Math.PI; S.target = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ((camLon - lon) * Math.PI) / 180); void lat; }          // 地球仪只绕地轴转：把这一点的经线转到正对镜头（纬度不变，北方一直朝上）

    // ---- 选中：转过去 → 镜头飞近 → 翻到那一页、打开活页 ----
    const choose = (it, pn) => {
      if (S.go) return; S.moved = true;
      const p = pn || it.a.pins?.[0];
      if (p) turnTo(p.lat, p.lon); else if (it.a.layer) setLayer(it.a.layer);
      S.go = { it, pn: p, t: 0, dived: false };
      W?.ui.status(`飞向<b>${it.title}</b>${p ? `（${p.name}）` : ''}……`);
    };
    const dive = () => {
      const g = S.go, pn = g.pn; g.dived = true;
      group.updateMatrixWorld(true);
      if (pn) { const w = new THREE.Vector3(...ll2v(pn.lat, pn.lon)).multiplyScalar(R); earthRot.localToWorld(w); group.worldToLocal(w); const c = new THREE.Vector3(0, CY, 0), d = w.clone().sub(c).normalize(); look([w.x, w.y, w.z], [d.x, d.y + 0.2, d.z], 0.11); }          // 镜头沿着这一点的“头顶”方向飞近
      else look([0, CY, 0], [0, 0.3, 1], 0.32);
    };

    // ---- 侧栏：按章列出这本书的活页（颜色和旗一样），鼠标移上去在地球上标出来 ----
    const rows = new Map();
    const highlight = (it) => { S.hover = it; for (const [id, r] of rows) r.classList.toggle('on', !!it && id === it.id); if (it?.a.kind === 'layer') setLayer(it.a.layer); else if (!S.go) S.layer = null; };
    const labels = [...pins.map((p) => p.label), ...curL];
    const tHint = tag('<span>拖着地球转一转</span><small>点一面旗，飞过去</small>', 'hint');
    noteBadge(tag, '示意：旗插在课本所举例子的那一带，位置是大致的；地球没有画出地形起伏；气压带、风带是未考虑海陆分布的理想模型；昼夜画的是 6 月 22 日前后（北半球夏至）').loc(group, -0.05, 0.004, 0.05);

    // ---- 指针：拖地球转；点旗 ----
    let down = null; const q0 = new THREE.Quaternion();
    const hitPin = (rc) => rc.intersectObjects(pickers, false)[0]?.object;
    const pointer = {
      down(rc, e) { if (S.go) return true; const pk = hitPin(rc); if (!pk && !rc.intersectObject(globe, false).length) return false; down = { x: e?.clientX ?? 0, y: e?.clientY ?? 0, moved: false, pk }; q0.copy(earthRot.quaternion); S.target = null; document.getElementById('c').style.cursor = 'grabbing'; return true; },
      move(rc, e) {
        const c = document.getElementById('c');
        if (!down) { const pk = hitPin(rc); if (c) c.style.cursor = pk ? 'pointer' : rc.intersectObject(globe, false).length ? 'grab' : ''; highlight(pk ? pk.userData.it : null); return false; }
        const dx = (e?.clientX ?? 0) - down.x, dy = (e?.clientY ?? 0) - down.y; if (Math.hypot(dx, dy) > 4) down.moved = true;
        void dy; earthRot.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * 0.008).multiply(q0)); S.moved = true; return true;          // 像地球仪一样只绕地轴转
      },
      up() { if (!down) return false; const d = down; down = null; document.getElementById('c').style.cursor = ''; if (!d.moved && d.pk) choose(d.pk.userData.it, d.pk.userData.pn); return true; },
    };

    return {
      group,
      card: false,
      emerge: 'flat',
      place: 'spread',
      size: { w: 0.26, d: 0.24, h: 0.24 },
      view: { elev: 12, azim: 0, lookY: 0.5, frameMargin: 1.12 },
      pointer,
      debug: { S, choose: (id) => { const it = items.find((x) => x.id === id); if (it) choose(it); }, items },
      mount(ui) {
        const byCh = new Map(); for (const it of items) { if (!byCh.has(it.ch)) byCh.set(it.ch, []); byCh.get(it.ch).push(it); }
        const list = h('div', { class: 'atlas-list' });
        for (const [ch, arr] of [...byCh.entries()].sort((a, b) => a[0] - b[0])) {
          const color = CHAPTER_COLORS[(ch || 1) - 1] || '#c8402c';
          list.append(h('div', { class: 'atlas-ch' }, h('i', { style: `background:${color}` }), arr[0].chapterTitle || `第 ${ch} 章`));
          for (const it of arr) {
            const sub = it.a.kind === 'place' ? it.a.pins.map((p) => p.name).join('、') : it.a.note.replace(/^(整个地球|原理)：/, '');
            const row = h('button', { class: 'atlas-row', onclick: () => choose(it), onmouseenter: () => highlight(it), onmouseleave: () => highlight(null) },
              h('span', { class: `atlas-kind k-${it.a.kind}` }, KIND_TEXT[it.a.kind]), h('b', {}, it.title), h('small', {}, `${it.fig} · 第 ${it.page} 页${sub ? ` · ${sub}` : ''}`));
            rows.set(it.id, row); list.append(row);
          }
        }
        ui.controls.append(list);
        W = { ui };
        ui.status(`${spot?.bookName ? `《${spot.bookName}》` : '这本书'}一共 ${items.length} 张活页：插旗的 ${items.filter((x) => x.a.kind === 'place').length} 张，整个地球的 ${items.filter((x) => x.a.kind === 'layer').length} 张，原理 ${items.filter((x) => x.a.kind === 'idea').length} 张。`);
      },
      update(dt) {
        labels.forEach((l) => l.tick(dt));
        if (S.target) { earthRot.quaternion.slerp(S.target, Math.min(1, dt * 3.2)); if (earthRot.quaternion.angleTo(S.target) < 0.002) S.target = null; }
        const cd = camDirLocal();
        for (const p of pins) {
          const facing = p.n.clone().applyQuaternion(earthRot.quaternion).dot(cd), hot = S.hover === p.it || S.go?.it === p.it;
          p.label.userData.want = facing > 0.3 ? 1 : 0; if (hot !== p.hot) { p.hot = hot; p.label.setText(hot ? `${p.it.title} · ${p.pn.name}` : p.pn.name); p.placeLabel(); }          // 指着它的时候写上活页的名字
          p.glow.material.opacity += ((hot ? 0.9 : 0.25) - p.glow.material.opacity) * Math.min(1, dt * 6); p.bead.scale.setScalar(hot ? 1.5 : 1);
        }
        const fade = (m, on) => { m.value += ((on ? 1 : 0) - m.value) * Math.min(1, dt * 5); };
        fade(sunM.uniforms.k, S.layer === 'sun'); fade(beltM.uniforms.k, S.layer === 'belts');
        for (const ln of plateG.children) ln.material.opacity += ((S.layer === 'plates' ? 0.95 : 0) - ln.material.opacity) * Math.min(1, dt * 5);
        for (const l of curL) l.setOn(S.layer === 'current');
        tHint.loc(group, -R * 1.3, CY + R * 0.4, 0).show(!S.moved);
        if (S.go) {
          S.go.t += dt;
          if (!S.go.dived && (S.go.t > 0.9 || (!S.target && S.go.t > 0.35))) { dive(); S.go.t2 = 0; }
          if (S.go.dived) { S.go.t2 += dt; if (S.go.t2 > 1.0 && !S.go.sent) { S.go.sent = true; dispatchEvent(new CustomEvent('livebook:open-lesson', { detail: { id: S.go.it.id } })); } }
        }
      },
    };
  },
};
