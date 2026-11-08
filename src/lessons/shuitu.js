// 八下图 7.29：控制其他条件，比较植被、土质、坡度和降水强度。
// 雨量、径流和泥沙均为教学示意；时间、冲沟及沉积厚度放大以便观察。
import * as THREE from 'three';
import { seg, table, buttons } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { canvasTex, textPlate } from './kit/props.js';
import { chemBeaker } from './kit/chem.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { h } from '../ui/Panel.js';
import { rockMat, worldUV } from './kit/strata.js';

const MODES = ['植被', '土质', '坡度', '降水强度'];
const GRASS = new THREE.Color(0x6f9046);
const SOILS = { 黄土: { color: 0xc9a25e, k: 1.2, inf: 0.30, look: 'loess' }, 沙土: { color: 0xe1ca91, k: 1.3, inf: 0.38, look: 'sandstone' }, 黏土: { color: 0xa26e53, k: 0.6, inf: 0.22, look: 'mudstone' } };          // look：透明槽侧面看到的土是什么样子（kit/strata.js）
const cond = (name, c = 0, soil = '黄土', slope = 20, P = 45) => ({ name, c, soil, slope, P });
const SETS = [
  [cond('林草茂密', 0.9), cond('植被稀疏', 0.4), cond('地表裸露')],
  [cond('沙土', 0, '沙土'), cond('黏土', 0, '黏土')],
  [cond('缓坡 10°', 0, '黄土', 10), cond('陡坡 25°', 0, '黄土', 25)],
  [cond('小雨', 0, '黄土', 20, 15), cond('暴雨')],
];
function amount(c) {
  const soil = SOILS[c.soil];
  // 截留随覆盖增加；小雨有更多时间下渗。毫米按统一槽面积换算为示意毫升。
  const R = c.P * (1 - 0.25 * c.c) * (1 - soil.inf * (c.P === 15 ? 1.7 : 1) - 0.35 * c.c) * 6;
  const S = 0.025 * soil.k * R ** 1.2 * (c.slope / 20) ** 1.3 * (1 - c.c) ** 2 + 0.25;
  return { R, S };
}
export default {
  id: 'shuitu', fig: '图7.29', title: '水土流失模拟实验', stampText: '实验', style: 'real', flow: 'explore',
  ask: '三个一样的土槽，一个长满林草、一个植被稀疏、一个光秃秃，淋同样的雨。哪个土槽流失的泥沙最多？为什么？',
  guess: { options: ['林草茂密的', '植被稀疏的', '地表裸露的'], answer: 2 },
  need: '打开喷淋管下雨，看三个量杯里接到的水和泥沙；再换一个条件（土质、坡度、降水强度）比一比；说说黄土高原水土流失严重的原因',
  conclusion: {
    crops: [{ page: 36, rect: [186, 52, 462, 136] }, { page: 37, rect: [64, 52, 482, 232] }],
    quote: '黄土高原是世界上水土流失极为严重的地区之一。这里疏松的黄土在缺少植被保护的情况下，很容易发生水土流失。特别是每遇暴雨，泥沙俱下，水土流失尤为严重。造成黄土高原水土流失的原因，既有自然原因，也有人为原因（图7.28）。黄土土质疏松，多孔隙，易被流水侵蚀。地表裸露，缺乏植被保护。夏季降水集中，且多暴雨。人多地少，开发历史悠久，长期的过垦过牧导致生态环境恶化。修路、采矿等活动破坏地表。还有……',
    why: '其他条件相同时，植被越茂密，量杯里的水和泥沙越少。枝叶挡雨、根系固土，地表径流也慢一些。<br>分别只改变一个条件：疏松的沙土比黏结紧密的黏土更容易流失；陡坡比缓坡流失多；同样时间里，暴雨比小雨流失多。数据是示意的比较，不是实测，不能用来预测真实地点。<br>黄土高原土质疏松、多孔隙，地表缺少植被保护，夏季降水集中且多暴雨；过垦过牧以及修路、采矿等活动又破坏地表，自然原因和人为原因共同加重了水土流失。',
    src: '课本八年级下册第 32—33 页 · 第七章 第三节 世界最大的黄土堆积区——黄土高原（活动：分析水土流失的自然原因）',
  },
  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    const rig = new THREE.Group(); group.add(rig);          // 器材都放在一块实验底板上（底板盖住下面书页上的字和图）
    const BOARD = 0.01; rig.position.y = BOARD;
    const fresh = () => ({ mode: 0, time: 0, running: false, progress: 0, settle: 0, transition: 0, seen: [], answers: [false, false, false], demo: false });
    let S = fresh(), W;
    const status = (s) => { if (!S.demo) W?.ui.status(s); else bar.caption(s); };
    const done = (s) => { if (!S.demo) bar.done(s); };
    const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
    const woodTex = canvasTex(256, 256, (g) => {
      g.fillStyle = '#ad855b'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 100; i++) { g.strokeStyle = `rgba(70,41,18,${0.04 + (i % 4) * 0.02})`; g.beginPath(); g.moveTo(0, i * 3); g.bezierCurveTo(80, i * 3 + 6, 180, i * 3 - 4, 256, i * 3); g.stroke(); }
    });
    const wood = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.8 }), metal = mat(0x6d8992);
    { const b = new THREE.Mesh(new THREE.BoxGeometry(0.62, BOARD, 0.66), new THREE.MeshStandardMaterial({ map: woodTex, color: 0xd9c7a8, roughness: 0.75 })); b.position.set(0, BOARD / 2, 0.025); b.castShadow = b.receiveShadow = true; group.add(b); }
    const box = (parent, w, hh, d, material, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), material); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
    const rod = (parent, a, b, r, material) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, A.distanceTo(B), 16), material); m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize()); parent.add(m); return m; };
    paperSheet(group, { w: 0.68, d: 0.66, z: 0.02 });
    for (const x of [-0.245, 0.245]) {
      box(rig, 0.018, 0.012, 0.32, wood, x, 0.006, -0.025);
      box(rig, 0.014, 0.315, 0.014, wood, x, 0.163, -0.16);
    }
    box(rig, 0.51, 0.014, 0.018, wood, 0, 0.115, 0.072);
    rod(rig, [-0.255, 0.335, -0.08], [0.255, 0.335, -0.08], 0.006, metal);
    const handle = new THREE.Group(); handle.position.set(0.25, 0.335, -0.08); rig.add(handle);
    rod(handle, [0, 0, 0], [0, 0.048, 0], 0.004, mat(0xad4b36));
    const grip = box(handle, 0.035, 0.013, 0.018, mat(0xb94b35), 0, 0.048, 0);
    grip.userData.track = true;
    const tip = tag('', 'pill'), valveLabel = tag('向右拖阀门 · 下雨', 'pill'); valveLabel.loc(rig, 0.22, 0.405, -0.08);
    const glass = new THREE.MeshStandardMaterial({ color: 0xc9e0e8, transparent: true, opacity: 0.18, roughness: 0.15, depthWrite: false });
    const SOILM = Object.fromEntries(Object.entries(SOILS).map(([k, v]) => [k, rockMat(v.look)]));
    const soilTex = canvasTex(512, 256, (g) => {
      g.fillStyle = '#f0dfb7'; g.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#d1bb90' : '#e5d2a9'; g.beginPath(); g.moveTo(0, i * 24); for (let x = 0; x <= 512; x += 16) g.lineTo(x, i * 24 + Math.sin(x / 45 + i) * 5); g.lineTo(512, 256); g.lineTo(0, 256); g.fill(); }
      for (let i = 0; i < 3500; i++) { g.fillStyle = i % 2 ? '#bda77f' : '#f8e9c8'; g.fillRect((i * 137.3) % 512, (i * 57.7) % 256, 1.5, 1); }
    });
    const slots = [0, 1, 2].map((i) => {
      const g = new THREE.Group(); g.position.x = (i - 1) * 0.155; rig.add(g);
      const slope = new THREE.Group(); slope.position.set(0, 0.123, 0.07); slope.rotation.x = 20 * Math.PI / 180; g.add(slope);
      box(slope, 0.119, 0.004, 0.24, wood, 0, -0.003, -0.12);
      for (const x of [-0.058, 0.058]) box(slope, 0.002, 0.045, 0.24, glass, x, 0.02, -0.12);
      box(slope, 0.118, 0.045, 0.002, glass, 0, 0.02, -0.24);
      const soilM = new THREE.MeshStandardMaterial({ color: SOILS.黄土.color, map: soilTex, roughness: 1 });
      const soilBox = box(slope, 0.112, 0.020, 0.236, SOILM.黄土, 0, 0.010, -0.12); worldUV(soilBox.geometry, 0.05);          // 隔着玻璃看得见土的侧面：黄土的竖直节理、沙土的颗粒、黏土的细层
      const geo = new THREE.PlaneGeometry(0.112, 0.236, 32, 64); geo.rotateX(-Math.PI / 2); geo.translate(0, 0.029, -0.12);
      const topM = new THREE.MeshStandardMaterial({ color: SOILS.黄土.color, map: canvasTex(256, 512, (g) => { g.fillStyle = '#e7dabd'; g.fillRect(0, 0, 256, 512); for (let k = 0; k < 9000; k++) { g.fillStyle = k % 3 ? '#d3c09a' : '#f1e6cd'; g.fillRect((k * 137.37) % 256, (k * 71.73) % 512, 1.4, 1.5); } }), roughness: 1 });
      const surface = new THREE.Mesh(geo, topM); slope.add(surface); const original = geo.attributes.position.array.slice();
      const plants = new THREE.Group(); slope.add(plants);
      for (let n = 0; n < 40; n++) {
        const plant = new THREE.Group(); plant.position.set(((Math.sin(n * 127.1 + 3) * 43758.5453 % 1 + 1) % 1 - 0.5) * 0.092, 0.028, -0.025 - ((Math.sin(n * 311.7 + 8) * 13758.5453 % 1 + 1) % 1) * 0.195); plants.add(plant);
        const tree = n % 6 === 0;
        rod(plant, [0, 0, 0], [0, tree ? 0.045 : 0.012, 0], tree ? 0.0018 : 0.0007, mat(0x765639));
        const crown = new THREE.Mesh(new THREE.ConeGeometry(tree ? 0.014 : 0.0055, tree ? 0.04 : 0.022, tree ? 9 : 5), mat(n % 3 ? 0x668746 : 0x8b9c4e)); crown.position.y = tree ? 0.045 : 0.013; plant.add(crown);
        // 透明槽侧面可见根须，把植被和固土联系起来。
        for (const dx of [-0.004, 0.004]) rod(plant, [0, 0, 0], [dx, -0.019, 0.008], 0.00045, mat(0x6e5b36));
      }
      const cup = chemBeaker({ r: 0.043, h: 0.103, level: 0 });
      cup.liq.material = new THREE.MeshPhysicalMaterial({ color: 0xaed9e4, transparent: true, opacity: 0.25, roughness: 0.15, depthWrite: false }); cup.position.set(0, 0.002, 0.15); g.add(cup);
      const sediment = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.041, 1, 40), mat(0xa47d42)); sediment.geometry.translate(0, 0.5, 0); sediment.position.y = 0.0015; sediment.renderOrder = 8; cup.add(sediment);
      for (let n = 1; n <= 4; n++) { const label = textPlate(String(n * 60), { w: 0.022, h: 0.010, color: '#344c59', font: 'bold 180px sans-serif' }); label.position.set(0.008, n * 0.0205, 0.0435); label.renderOrder = 12; label.material.depthWrite = false; cup.add(label); }
      const outlet = rod(g, [0, 0.125, 0.075], [0, 0.113, 0.144], 0.005, metal);
      const stream = rod(g, [0, 0.113, 0.144], [0, 0.018, 0.15], 0.0028, new THREE.MeshStandardMaterial({ color: 0x9dc4d0, transparent: true, opacity: 0.62, roughness: 0.2 }));
      const nozzles = new THREE.Group(); g.add(nozzles);
      rod(nozzles, [0, 0.335, -0.18], [0, 0.335, 0.025], 0.003, metal);
      for (let n = 0; n < 8; n++) rod(nozzles, [0, 0.335, -0.18 + n * 0.028], [0, 0.325, -0.18 + n * 0.028], 0.0025, metal);
      const rp = new Float32Array(160 * 6), rain = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(rp, 3)), new THREE.LineBasicMaterial({ color: 0x629dbb, transparent: true, opacity: 0.65 })); rain.frustumCulled = false; g.add(rain);
      const sp = new Float32Array(160 * 3), grains = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(sp, 3)), new THREE.PointsMaterial({ color: 0x876032, size: 0.0026 })); grains.frustumCulled = false; g.add(grains);
      const name = tag('', 'pill'), reading = tag('', 'pill');
      return { g, slope, soilM, soilBox, surface, original, plants, cup, sediment, outlet, stream, nozzles, rain, rp, grains, sp, name, reading, fill: 0 };
    });
    const sync = () => { W?.choice.set(S.mode); if (W) for (let i = 0; i < 4; i++) W.choice.disable(i, S.running); };
    const select = (mode) => {
      if (S.running) { sync(); return status('这一场雨还没下完，等量杯接完水再换条件。'); }
      S.mode = mode; S.progress = 0; S.settle = 0; S.transition = 1; sync();
      status(`比${MODES[mode]}：只改变${MODES[mode]}，其他条件相同。量杯倒空后，再向右拖阀门。`);
    };
    const start = () => {
      if (S.running || S.transition > 0) return;
      S.running = true; S.time = 0; S.progress = 0; S.settle = 0; sync();
      status('雨正在下：沿坡面找泥沙，再看出水口和量杯。每次喷淋持续相同时间。');
    };
    // 桌前的四个条件键与左侧面板共用同一个切换动作。
    const controls = new THREE.Group(); controls.position.set(0, 0.012, 0.285); rig.add(controls);
    box(controls, 0.46, 0.012, 0.038, wood, 0, 0, 0);
    const keys = MODES.map((name, i) => {
      const key = box(controls, 0.102, 0.008, 0.028, mat(0xe8dfcb), (i - 1.5) * 0.112, 0.01, 0);
      const label = textPlate(name, { w: 0.085, h: 0.018, color: '#343e40' }); label.rotation.x = -Math.PI / 2; label.position.y = 0.0045; key.add(label); key.userData.track = true; return key;
    });
    const drag = draggable(rig, [{ obj: grip, plane: 'xy', offset: -0.08, hint: '向右拖开阀门，喷淋一场雨', onDrag: (p) => { handle.rotation.z = -clamp((p.x - 0.25) / 0.05, 0, 1) * 1.3; if (p.x > 0.275) start(); }, onEnd: () => { if (!S.running) handle.rotation.z = 0; } }], { tip, taps: keys.map((obj, i) => ({ obj, hint: `点一下：比${MODES[i]}`, onTap: () => select(i) })) });
    const act = demoActs(drag, rig), destination = new THREE.Vector3(0.305, 0.35, -0.08);
    const answer = (i) => { S.answers[i] = true; if (S.answers[0] && S.seen.filter((x) => x !== 0).length >= 2 && !S.answers[1]) W.t2.open(); if (S.answers[0] && S.answers[1]) W.t3.open(); if (S.answers.every(Boolean)) { W.t3.close(); done('why'); W.next.hidden = false; } };
    const bar = lessonBar({ look, back, group, steps: [
      { id: 'rain', title: '下雨看看', todo: '向右拖<b>红色阀门</b>，淋同样的雨，看三个量杯里的水和泥沙。', target: () => grip },
      { id: 'vars', title: '换条件', todo: '左边“比一比”再选<b>至少两个条件</b>，各下一场雨。', target: () => keys[[1, 2, 3].find((i) => !S.seen.includes(i)) || 1] },
      { id: 'why', title: '想一想', todo: '在左边回答三道问题，再对照课本原文。', target: () => keys[0] },
    ], reels: { demo: { label: '老师演示', seal: '演示', ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { sync(); } }), shots: [
      { cap: '同样的雨，三种植被。拖开阀门，看泥沙顺坡流下。', dur: 9, during: act.drag(grip, destination, { t0: 0.02, t1: 0.12, release: 0.15 }) },
      { cap: '裸露槽水多、浑，杯底泥沙厚；林草茂密的槽流失少。', dur: 3 },
      ...[1, 2, 3].map((m) => ({ cap: ['','换成沙土和黏土：其他条件相同，比较泥沙。','只改坡度：陡坡冲出的泥沙更多。','同样时间：暴雨比小雨流失更多。'][m], dur: 10, during: act.seq(act.tap(keys[m], 0.01), act.drag(grip, destination, { t0: 0.18, t1: 0.27, release: 0.3 })) })),
    ] } } });
    let clock = 0;
    const update = (dt) => {
      keys.forEach((key, i) => { key.position.y += ((S.mode === i ? 0.01 : 0.016) - key.position.y) * Math.min(1, dt * 10); key.material.color.setHex(S.mode === i ? 0xc4d3b7 : 0xe8dfcb); });
      clock += dt; S.transition = Math.max(0, S.transition - dt);
      if (S.running) {
        S.time += dt; S.progress = Math.min(1, S.time / 6);
        if (S.time >= 6) {
          S.running = false; S.settle = 0; if (!S.seen.includes(S.mode)) S.seen.push(S.mode);
          if (!S.demo) {
            const cs = SETS[S.mode], nums = cs.map(amount);
            W?.tbl.add([MODES[S.mode], cs.map((c) => `${c.name}：${c.soil} / ${c.slope}° / ${c.P}毫米`).join('<br>'), nums.map((a) => `${Math.round(a.R)}毫升`).join('<br>'), nums.map((a) => `${Math.round(a.S)}克`).join('<br>')]);
            if (S.mode === 0) { done('rain'); if (!S.answers[0]) W?.t1.open(); }
            if (S.seen.filter((x) => x !== 0).length >= 2) { done('vars'); if (!S.answers[1]) W?.t2.open(); }
          }
          sync(); status('雨停了。比较水位、浑浊程度和杯底泥沙层；记录已经留下，可以换条件再试。');
        }
      } else S.settle = Math.min(1, S.settle + dt / 2);
      handle.rotation.z += ((S.running ? -1.3 : 0) - handle.rotation.z) * Math.min(1, dt * 5);
      slots.forEach((o, i) => {
        const c = SETS[S.mode][i], active = !!c, cfg = c || SETS[S.mode][1], a = amount(cfg), ease = Math.min(1, dt * 5);
        const scale = active ? 1 : 0.001; o.g.scale.lerp(new THREE.Vector3(scale, scale, scale), ease);
        o.g.position.x += ((SETS[S.mode].length === 3 ? (i - 1) * 0.155 : (i - 0.5) * 0.19) - o.g.position.x) * ease;
        o.slope.rotation.x += (cfg.slope * Math.PI / 180 - o.slope.rotation.x) * ease;
        o.soilM.color.lerp(new THREE.Color(SOILS[cfg.soil].color), ease); o.soilBox.material = SOILM[cfg.soil];
        o.surface.material.color.copy(o.soilM.color).lerp(GRASS, Math.min(0.85, cfg.c * 0.95));          // 有植被的槽，地面盖着一层草
        o.plants.children.forEach((p, n) => { const s = n < cfg.c * 44 ? 1 : 0.001; p.scale.lerp(new THREE.Vector3(s, s, s), ease); });
        o.fill += (S.progress - o.fill) * ease;
        o.cup.rotation.x = S.transition > 0 ? -0.22 * Math.sin(S.transition * Math.PI) : 0;
        const sedimentH = a.S * o.fill * 0.0012 * (S.running ? 0.55 : 0.55 + 0.45 * S.settle);
        o.sediment.scale.y = Math.max(0.00001, sedimentH); o.sediment.visible = o.fill > 0.001;
        o.cup.setLevel(0.002 + a.R * o.fill / 260 * 0.086 + sedimentH);
        const muddy = clamp(a.S / a.R * 8, 0, 1); o.cup.liq.material.color.copy(new THREE.Color(0xaed9e4).lerp(new THREE.Color(0xb28a49), muddy));
        o.cup.liq.material.opacity = 0.2 + muddy * 0.62; o.cup.surf.children[0].material.color.copy(o.cup.liq.material.color);
        o.cup.surf.children[1].material.opacity = 0.22;
        o.stream.material.color.copy(o.cup.liq.material.color); o.stream.visible = active && S.running && S.time > 0.35;
        const pos = o.surface.geometry.attributes.position;
        for (let j = 0; j < pos.count; j++) {
          const x = o.original[j * 3], z = o.original[j * 3 + 2], furrow = Math.exp(-(((x - 0.018 * Math.sin(z * 47)) / 0.0035) ** 2)) + 0.5 * Math.exp(-(((x + 0.031 + 0.004 * Math.cos(z * 67)) / 0.003) ** 2));
          pos.array[j * 3 + 1] = 0.029 - Math.min(0.006, a.S * 0.00022) * o.fill * (0.3 + furrow * 0.7 + (-z / 0.24) * 0.2);
        }
        pos.needsUpdate = true; o.surface.geometry.computeVertexNormals();
        o.rain.visible = active && S.running; o.grains.visible = active && S.running;
        const count = cfg.P === 15 ? 48 : 160; o.rain.geometry.setDrawRange(0, count * 2);
        o.nozzles.children.forEach((n, j) => { n.visible = j === 0 || cfg.P === 45 || j % 3 === 1; });
        for (let n = 0; n < 160; n++) {
          const x = ((Math.sin(n * 127.1 + 3) * 43758.5453 % 1 + 1) % 1 - 0.5) * 0.102, z = -0.18 + ((n * 0.381) % 1) * 0.2;
          const ground = 0.15 + (0.07 - z) * Math.tan(o.slope.rotation.x), bottom = ground + (cfg.c > 0.5 && n % 3 ? 0.03 : 0);
          const y = 0.325 - ((clock * 1.8 + n * 0.173) % 1) * (0.325 - bottom);
          o.rp.set([x, y, z, x, y + 0.009, z], n * 6);
          const u = (clock * 0.6 + n * 0.137) % 1;
          if (u < 0.72) {
            const zz = -0.23 + u / 0.72 * 0.23, v = new THREE.Vector3(x * 0.7, 0.031, zz).applyMatrix4(o.slope.matrix);
            o.sp.set([v.x, v.y, v.z], n * 3);
          } else { const v = (u - 0.72) / 0.28; o.sp.set([x * 0.04, 0.123 - v * 0.11, 0.075 + Math.min(1, v * 3) * 0.075], n * 3); }
        }
        o.rain.geometry.attributes.position.needsUpdate = true; o.grains.geometry.attributes.position.needsUpdate = true;
        o.grains.geometry.setDrawRange(0, Math.min(160, Math.max(2, Math.round(a.S * 6))));
        o.name.loc(rig, o.g.position.x, active ? 0.009 : -9, -0.25).text(cfg.name);
        o.reading.loc(rig, o.g.position.x, active ? 0.008 : -9, 0.22).text(`${Math.round(a.R * o.fill)}毫升 · ${Math.round(a.S * o.fill)}克`);
      });
    };
    return {
      group: root, pointer: wrapPointer(drag, bar), card: false, toggles: ['cards', 'steps'],
      size: { w: 0.58, d: 0.61, h: 0.42 }, view: { elev: 25, azim: 8, lookY: 0.4, frameMargin: 1.08 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const choice = seg('比一比', MODES, (_, i) => select(i));
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '对照课本原文 →');
        const t1 = think({ status, q: '在其他条件相同的情况下，植被状况对水土流失有什么影响？', options: ['植被越茂密，水土流失越少：枝叶挡住雨点，根系固住土壤，地表径流也慢一些', '植被越多，水土流失越多', '植被和水土流失没有关系'], wrong: ['看林草茂密槽下的量杯：水少、清，杯底泥沙薄。', '三个量杯里的水和泥沙不一样。回到植被组再比较。'], ok: '对，植被有保护土壤的作用。', onOk: () => answer(0) });
        const t2 = think({ status, q: '土质、坡度、降水强度对水土流失有什么影响？', options: ['土质越疏松、坡越陡、降水强度越大（暴雨），水土流失越严重', '小雨持续得细密，所以同样时间比暴雨流失多', '黏土下渗少，所以一定比沙土更容易流失'], wrong: ['切到降水强度组：同样时间里，暴雨槽的泥沙更多。', '比杯底泥沙，不只比水量：沙土颗粒之间几乎不黏结，流失的泥沙更多。'], ok: '对，每次只改一个条件，再比较泥沙量。', onOk: () => answer(1) });
        const t3 = think({ status, q: '为什么黄土高原的水土流失特别严重？', options: ['黄土土质疏松、多孔隙，地表裸露缺少植被，夏季降水集中且多暴雨；再加上过垦过牧、修路采矿破坏地表', '只因为暴雨，植被和人类活动都没有影响', '主要因为黄土黏结紧密，雨水冲不动'], wrong: ['植被组已经说明地表保护很重要；人类活动也会破坏地表。', '黄土疏松、多孔隙，容易被流水侵蚀。'], ok: '对，自然原因和人为原因共同作用。可以对照课本了。', onOk: () => answer(2) });
        const tbl = table(['比什么', '各槽条件（依次）', '水量（示意）', '泥沙（示意）']);
        const reset = () => { if (S.demo) return; S = fresh(); sync(); tbl.clear(); [t1, t2, t3].forEach((t) => t.close()); next.hidden = true; ui.relock?.(); bar.undo('rain', 'vars', 'why'); status('从植被组重新开始，向右拖红色阀门。'); };
        ui.controls.append(choice.el, t1.el, t2.el, t3.el, next, buttons([{ text: '全部重来', ghost: true, onClick: reset }]).el, h('p', { class: 'fineprint' }, '数据是示意的比较，不是实测。每场喷淋时长相同：小雨15毫米、暴雨45毫米。每次只改变所选条件；其余保持裸露黄土、20°坡、暴雨（植被组除外）。水量以毫升、泥沙以克记录；冲沟与沉积厚度放大，不能据此预测真实流失量。'));
        ui.data.append(tbl.el); W = { ui, choice, next, t1, t2, t3, tbl }; bar.attach(ui); status('先比较植被：三个槽的土质、坡度和雨都一样。向右拖红色阀门，让雨下起来。');
      },
      update(dt) { update(Math.min(dt, 0.1) * bar.update(dt)); },
      dispose() { bar.dispose(); tip.remove(); valveLabel.remove(); slots.forEach((o) => { o.name.remove(); o.reading.remove(); }); },
      debug: { get S() { return S; }, bar, amount, qa: qaFlow(drag, [
        { name: '开始动手', run: () => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('开始动手'))?.click() },
        { name: '拖阀门比较植被', drag: grip, to: destination, wait: 8 },
        { name: '回答植被', run: () => W.t1.el.querySelector('button').click() },
        ...[1, 2, 3].flatMap((m) => [{ name: `切换${MODES[m]}`, run: () => W.choice.el.querySelectorAll('button')[m].click(), wait: 1.5 }, { name: `${MODES[m]}组拖阀门`, drag: grip, to: destination, wait: 8 }]),
        { name: '回答变量', run: () => W.t2.el.querySelector('button').click() },
        { name: '回答黄土高原原因', run: () => W.t3.el.querySelector('button').click() },
      ]) },
    };
  },
};
