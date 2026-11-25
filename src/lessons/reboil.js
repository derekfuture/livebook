// 绪言 图1 重新沸腾的水（课本第 2 页「演示」）：
//   水烧开后把烧瓶从热源拿开，水停止沸腾。迅速塞上瓶塞，把烧瓶倒置并向瓶底浇冷水——水又沸腾了！
// 直接动手：点酒精灯盖上灯帽 / 点燃；把桌上的瓶塞拖到瓶口；向右拖烧瓶把它倒过来；按住那杯冷水往瓶底浇。面板按钮也能做。
// 物理（八下第九章会学）：浇冷水使瓶内的水蒸气液化，瓶内气压减小，水的沸点降低到比水温还低，于是重新沸腾。
//   瓶内气压 → 饱和蒸气压（Antoine 公式）；瓶壁被冷水浇过后温度骤降，蒸气在冷壁上液化，气压跟着降。
import * as THREE from 'three';
import { buttons, readout, goals, seg } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { alcoholLamp, stand, beaker } from './kit/props.js';
import { Particles, steam } from './kit/fx.js';
import { Noise } from './kit/audio.js';
import { paint, inked, hull, glassEdge } from '../live/ink.js';

const psat = (T) => Math.exp(16.3872 - 3885.7 / (T + 230.17));                 // kPa
const tBoil = (P) => 3885.7 / (16.3872 - Math.log(Math.max(0.3, P))) - 230.17;   // ℃
const R = 0.05, RI = 0.0465, NR = 0.0135, NRI = 0.011, NECK0 = 0.046, NECK1 = 0.12;  // 烧瓶：球泡半径、瓶颈
const UP = new THREE.Vector3(0, 0.185, 0), DOWN = new THREE.Vector3(0.14, 0.215, 0);   // 正放（在酒精灯上方）/ 倒过来（拿到右边）时球心的位置
const FILL = 0.4;                                                                     // 瓶里的水占容积的比例

export default {
  id: 'reboil',
  fig: '绪言 图1',
  title: '重新沸腾的水',
  stampText: '演示',
  predict: {
    q: '水烧开后把烧瓶从酒精灯上拿开，水停止沸腾。迅速塞上瓶塞，把烧瓶倒过来，向瓶底浇<b>冷水</b>。<br>会发生什么？',
    hint: '课本第 2 页「演示」',
    options: ['水温降低，水更不会沸腾了', '水又重新沸腾起来', '什么变化也没有'],
    answer: 1,
  },
  conclusion: {
    crops: [{ page: 8, rect: [52, 444, 278, 536] }, { page: 9, rect: [52, 52, 420, 90] }],
    quote: '上面的实验现象和你想象的一样吗？你想知道其中的道理吗？',
    why: '浇冷水时，瓶里的水蒸气遇到冰冷的瓶壁液化成水，瓶内的气压一下子变小了。<b>水的沸点跟气压有关：气压越低，沸点越低</b>（八年级下册第九章会学到）。气压低到一定程度，沸点就降到比此时的水温还低——所以水温虽然在下降，却又沸腾起来。生活中，高原上气压低，水不到 100 ℃ 就沸腾了，饭煮不熟，要用高压锅。<br>物理学就是要找出这些有趣现象背后的道理。',
    src: '课本第 2–3 页 · 绪言 开启科学探索之旅',
  },

  create({ tag, look, back }) {
    // 器材摆在 x = −0.1 … 0.3 一带：外面再套一层，把整套器材挪到实验台中间
    const root = new THREE.Group(), group = new THREE.Group();
    group.position.x = -0.085; root.add(group);

    // ---------------- 铁架台、酒精灯、接水的玻璃槽 ----------------
    const st = stand({ height: 0.34, baseW: 0.16, baseD: 0.11 });
    st.position.set(-0.02, 0, -0.01);
    const arm = st.clamp(0.27, 0.075);
    const jaw = inked(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.022, 0.03), paint(0x5b6272)), { width: 1 });
    jaw.position.set(0.075, 0, 0); arm.add(jaw);
    group.add(st);
    const lamp = alcoholLamp();
    lamp.position.y = 0.016;          // 放在铁架台的底座上
    group.add(lamp);
    const cap = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.015, 0.03, 18, 1, false), paint(0xcfd6dc, { unique: true, transparent: true, opacity: 0.55 })), 0.001);
    group.add(cap);
    const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.032, 40, 1, true), paint(0xdff1f8, { unique: true, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }));
    glassEdge(tray, 0.0008);
    tray.position.set(DOWN.x, 0.016, 0);
    const trayWater = new THREE.Mesh(new THREE.CylinderGeometry(0.069, 0.069, 1, 40), paint(0xa8d8ee, { unique: true, transparent: true, opacity: 0.5, depthWrite: false }));
    trayWater.geometry.translate(0, 0.5, 0); trayWater.position.set(DOWN.x, 0.002, 0); trayWater.scale.y = 0.0005;
    group.add(tray, trayWater);

    // ---------------- 圆底烧瓶（局部坐标：球心在原点，瓶颈朝 +y） ----------------
    const flask = new THREE.Group();
    const outer = [new THREE.Vector2(0.0005, -R)];
    const top = Math.acos(NR / R);
    for (let i = 1; i <= 40; i++) { const a = -Math.PI / 2 + (i / 40) * (top + Math.PI / 2); outer.push(new THREE.Vector2(Math.cos(a) * R, Math.sin(a) * R)); }
    outer.push(new THREE.Vector2(NR, NECK1), new THREE.Vector2(NR + 0.0025, NECK1 + 0.001), new THREE.Vector2(NR + 0.0025, NECK1 + 0.005), new THREE.Vector2(NRI, NECK1 + 0.005));
    const glass = new THREE.Mesh(new THREE.LatheGeometry(outer, 48), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.14, roughness: 0.02, metalness: 0, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }));
    glass.renderOrder = 9;
    glassEdge(glass, 0.0009);
    // 瓶里的水：瓶的内腔，用一个水平的裁切面切出水面以下的部分；水面另画一个圆片
    const inner = [new THREE.Vector2(0.0005, -RI)];
    const itop = Math.acos(NRI / RI);
    for (let i = 1; i <= 40; i++) { const a = -Math.PI / 2 + (i / 40) * (itop + Math.PI / 2); inner.push(new THREE.Vector2(Math.cos(a) * RI, Math.sin(a) * RI)); }
    inner.push(new THREE.Vector2(NRI, NECK1 - 0.004), new THREE.Vector2(0.0005, NECK1 - 0.004));
    const cut = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    const waterMat = new THREE.MeshPhysicalMaterial({ color: 0x8ccbe8, transparent: true, opacity: 0.55, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false, clippingPlanes: [cut] });
    const water = new THREE.Mesh(new THREE.LatheGeometry(inner, 48), waterMat);
    water.renderOrder = 7;
    flask.add(glass, water);
    const pick = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.18, 0.11), new THREE.MeshBasicMaterial({ visible: false }));
    pick.position.y = 0.035; pick.userData.pick = true; flask.add(pick);
    // 手拿着的试管夹（离开铁架台以后才出现）
    const holder = new THREE.Group();
    const hArm = inked(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.008, 0.012), paint(0x8a5a32)), { width: 1 });
    hArm.position.set(-0.07, 0, 0);          // 倒过来以后手柄朝右
    const hRing = hull(new THREE.Mesh(new THREE.TorusGeometry(NR + 0.003, 0.0025, 8, 24), paint(0x5b6272)), 0.001);
    hRing.rotation.x = Math.PI / 2;
    holder.add(hArm, hRing); holder.position.y = 0.085; holder.visible = false;
    flask.add(holder);
    group.add(flask);
    const surf = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshPhysicalMaterial({ color: 0xbfe6f6, transparent: true, opacity: 0.55, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }));
    surf.rotation.x = -Math.PI / 2; surf.renderOrder = 8;
    group.add(surf);

    // 瓶塞
    const plug = inked(new THREE.Mesh(new THREE.CylinderGeometry(NRI + 0.002, NRI - 0.001, 0.022, 20), paint(0xb8432f)), { width: 1 });
    const PLUG_HOME = new THREE.Vector3(0.075, 0.011, 0.045);
    plug.position.copy(PLUG_HOME);
    group.add(plug);

    // 一杯冷水
    const cup = beaker({ r: 0.028, h: 0.07, level: 0.055, color: 0x7fc4ea });
    const CUP_HOME = new THREE.Vector3(0.27, 0, 0.02);
    cup.position.copy(CUP_HOME);
    group.add(cup);

    // ---------------- 粒子：气泡、白气、冷水流 ----------------
    const bubs = new Particles({ max: 260, geometry: new THREE.SphereGeometry(1, 10, 8), material: new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 0, depthWrite: false }) });
    bubs.mesh.renderOrder = 10;
    const fog = steam({ max: 90 });
    const stream = new Particles({ max: 500, geometry: new THREE.SphereGeometry(1, 6, 4), material: new THREE.MeshPhysicalMaterial({ color: 0x9fd6f0, transparent: true, opacity: 0.7, roughness: 0.05, depthWrite: false }) });
    // 瓶里的“水蒸气”（示意：点“看看瓶里”时才显示，越多气压越大）
    const VN = 90;
    const vap = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0014, 6, 4), new THREE.MeshBasicMaterial({ color: 0x7a8aa6 }), VN);
    vap.frustumCulled = false; vap.count = 0; vap.raycast = () => {};
    group.add(bubs.mesh, fog.mesh, stream.mesh, vap);

    // 瓶内腔里均匀撒 3000 个点：用来求“倒过来时水面在哪”、在水里哪里冒气泡、蒸气在哪里
    const cloud = [];
    while (cloud.length < 3000) {
      const p = new THREE.Vector3((Math.random() * 2 - 1) * RI, -RI + Math.random() * (NECK1 - 0.004 + RI), (Math.random() * 2 - 1) * RI);
      const inBulb = p.length() < RI - 0.001, inNeck = p.y > NECK0 - 0.01 && Math.hypot(p.x, p.z) < NRI - 0.0008;
      if (inBulb || inNeck) cloud.push(p);
    }
    const world = cloud.map((p) => p.clone());
    const below = [], above = [];

    const tags = { lamp: tag('', 'pill'), what: tag('', 'pill') };
    const S = {
      u: 0, uTo: 0, lamp: true, plug: 'table', T: 100, Tw: 100, P: 101.3, b: 1, pour: 0, pourHold: false, pourT: 0,
      phase: 'boil', seen: new Set(), show: false, quietT: 0, level: 0, minY: 0,
    };
    let W = null, sound = null, splash = null;
    const status = (m) => W?.status(m);
    const ensureSound = () => { if (!sound) { try { sound = new Noise({ gain: 0.05 }); splash = new Noise({ gain: 0.035 }); sound.on(true); splash.on(true); sound.volume(0); splash.volume(0); } catch { /* 没有声音也能做 */ } } };

    // ---------------- 动作（器材和面板共用） ----------------
    const A = {
      lamp() {
        ensureSound();
        if (S.lamp) { S.lamp = false; return status('盖上灯帽，酒精灯熄灭了。看看瓶里的水，还在沸腾吗？'); }
        if (S.u > 0.02) return status('烧瓶已经从酒精灯上拿开了。');
        if (S.plug === 'in') return status('塞着瓶塞的烧瓶<b>不能加热</b>——瓶里的气压会越来越大，很危险。');
        S.lamp = true; status('点燃了酒精灯，继续给水加热。');
      },
      plugIn() {
        ensureSound();
        if (S.plug === 'in') return;
        if (S.lamp) { S.plug = 'table'; return status('水还在加热、沸腾。先<b>熄灭酒精灯</b>，等水不沸腾了再塞瓶塞。'); }
        if (S.u > 0.02) { S.plug = 'table'; return; }
        S.plug = 'in'; W?.goal.done('cork0');
        status('<b>迅速塞上瓶塞</b>，塞紧了。现在把烧瓶倒过来：<b>按住烧瓶往右拖</b>。');
      },
      invert(v = 1) {
        ensureSound();
        if (v && S.plug !== 'in') return status('不塞上瓶塞就倒过来，水会全流出来。先把<b>瓶塞</b>拖到瓶口。');
        if (v && S.lamp) return status('先熄灭酒精灯。');
        S.uTo = v;
      },
      pour(on) {
        ensureSound();
        if (on && S.u < 0.95) { S.pourHold = false; return status('先塞上瓶塞、把烧瓶倒过来，再向瓶底（现在朝上）浇冷水。'); }
        S.pourHold = on;
      },
      reset() {
        Object.assign(S, { u: 0, uTo: 0, lamp: true, plug: 'table', T: 100, Tw: 100, P: 101.3, b: 1, pour: 0, pourHold: false, phase: 'boil', quietT: 0 });
        bubs.clear(); stream.clear(); trayWater.scale.y = 0.0005;
        status('重新烧开了一瓶水。先熄灭酒精灯，看看会怎样。');
      },
    };

    const pointer = draggable(group, [
      { obj: plug, plane: 'xy', offset: PLUG_HOME.z, keepOffset: true, hint: () => (S.plug === 'in' ? '' : '拖到瓶口，塞上瓶塞'),
        enabled: () => S.plug !== 'in',
        onStart: () => { S.plug = 'hand'; },
        onDrag: (p) => { plug.position.set(p.x, Math.max(0.011, p.y), PLUG_HOME.z); },
        onEnd: () => {
          const mouth = flask.localToWorld(new THREE.Vector3(0, NECK1, 0)); group.worldToLocal(mouth);
          if (Math.hypot(plug.position.x - mouth.x, plug.position.y - mouth.y) < 0.035 && S.u < 0.02) A.plugIn();     // 只看屏幕上下左右（瓶塞拖动的平面在瓶口前面一点）
          if (S.plug !== 'in') { S.plug = 'table'; plug.position.copy(PLUG_HOME); }
        } },
      { obj: pick, plane: 'xy', offset: 0, hint: () => (S.u < 0.5 ? '按住往右拖：把烧瓶倒过来' : '往左拖：正过来'),
        onStart: (p) => { S.drag0 = p ? { x: p.x, u: S.u } : null; S.dragging = false; },
        onDrag: (p) => {
          if (!S.drag0) return;
          const want = clamp(S.drag0.u + (p.x - S.drag0.x) / 0.12, 0, 1);
          if (want > S.u && (S.plug !== 'in' || S.lamp)) { S.drag0 = null; return A.invert(1); }
          S.dragging = true; S.u = want; S.uTo = want;
        },
        onEnd: () => { if (S.dragging) S.uTo = S.u > 0.5 ? 1 : 0; S.dragging = false; } },
      { obj: cup, plane: 'xy', offset: 0, hint: '按住：向瓶底浇冷水', onStart: () => A.pour(true), onDrag: () => {}, onEnd: () => A.pour(false) },
    ], { tip: tag('', 'pill'), taps: [{ obj: lamp, hint: () => (S.lamp ? '点一下：盖上灯帽，熄灭' : '点一下：点燃'), onTap: () => A.lamp() }] });

    // ---------------- 每帧：摆放器材、算水面 ----------------
    const tmp = new THREE.Vector3(), m4 = new THREE.Matrix4();
    let lastU = -1;
    const place = () => {
      const u = S.u, lift = Math.sin(Math.PI * u) * 0.05;
      flask.position.lerpVectors(UP, DOWN, u); flask.position.y += lift;
      flask.rotation.z = -Math.PI * u;
      holder.visible = u > 0.02; holder.rotation.y = u > 0.5 ? 0 : 0;
      jaw.scale.set(1, u > 0.02 ? 1.3 : 1, 1);
      flask.updateMatrix();
      if (S.plug === 'in') { plug.position.copy(flask.localToWorld(new THREE.Vector3(0, NECK1 - 0.004, 0))); group.worldToLocal(plug.position); plug.rotation.z = flask.rotation.z; }
      else plug.rotation.z = 0;
      if (Math.abs(u - lastU) > 1e-4) {
        lastU = u;
        // 水面：按体积，把 3000 个点按高低排，水占的比例 FILL 那一点就是水面
        for (let i = 0; i < cloud.length; i++) world[i].copy(cloud[i]).applyMatrix4(flask.matrix);
        const ys = world.map((p) => p.y).sort((a, b) => a - b);
        S.level = ys[Math.floor(FILL * ys.length)]; S.minY = ys[0];
        below.length = 0; above.length = 0;
        let cx = 0, cz = 0, n = 0;
        for (const p of world) { if (p.y < S.level - 0.003) below.push(p); else if (p.y > S.level + 0.004) above.push(p); if (Math.abs(p.y - S.level) < 0.0025) { cx += p.x; cz += p.z; n++; } }
        cx /= n || 1; cz /= n || 1;
        let r = 0; for (const p of world) if (Math.abs(p.y - S.level) < 0.0025) r = Math.max(r, Math.hypot(p.x - cx, p.z - cz));
        surf.position.set(cx, S.level, cz); surf.scale.setScalar(Math.max(0.002, r * 1.02));
      }
      // 裁切面在世界坐标里
      group.updateMatrixWorld();
      const wl = group.localToWorld(tmp.set(0, S.level, 0)).y;
      cut.constant = wl;
      // 杯子：倒水时举到瓶底上方，倾斜
      const k = S.pour;
      const rim = group.worldToLocal(flask.localToWorld(new THREE.Vector3(0, -R, 0)));
      const pose = new THREE.Vector3(rim.x + 0.068, rim.y + 0.055, 0);
      cup.position.lerpVectors(CUP_HOME, pose, Math.min(1, k * 1.4));
      cup.rotation.z = k * 1.85;
      // 酒精灯帽
      S.capT = (S.capT ?? 0) + ((S.lamp ? 0 : 1) - (S.capT ?? 0)) * 0.2;
      cap.position.set(0.05 * (1 - S.capT), 0.031 + S.capT * 0.06, 0.03 * (1 - S.capT));
      cap.visible = true;
      tags.lamp.loc(group, -0.04, 0.03, 0.06).text(S.u < 0.02 ? (S.lamp ? '酒精灯' : '已熄灭') : '');
    };
    place();

    // 沸腾：Psat(水温) 比瓶内气压大，水就会在内部汽化成气泡
    const step = (dt) => {
      const h = Math.min(dt, 1 / 30);
      const open = S.plug !== 'in';
      // 冷水流着的时候，瓶壁迅速变冷；没浇了，又慢慢被里面的热水捂热
      const wet = stream.list.filter((p) => p.film).length;
      S.Tw += ((wet > 4 ? 22 : S.T) - S.Tw) * Math.min(1, h * (wet > 4 ? 3.5 : 0.7));
      if (open) S.P = 101.3;
      else {
        const target = psat(Math.min(S.T, S.Tw)) + 2;        // 蒸气在最冷的地方液化；另有一点空气
        S.P += (target - S.P) * Math.min(1, h * 2.5) + S.b * h * 6;
        S.P = clamp(S.P, 2, 140);
      }
      const heating = S.lamp && S.u < 0.02;
      const tb = tBoil(S.P);
      if (heating) S.T = Math.min(tb, S.T + h * 1.5);
      const over = psat(S.T) - S.P;
      const want = heating && S.T >= tb - 0.05 ? 1 : over > 0.8 ? clamp(over / 12, 0.08, 1.6) : 0;
      S.b += (want - S.b) * Math.min(1, h * (want > S.b ? 5 : 2.2));
      if (S.b < 0.01) S.b = 0;
      // 散热；沸腾时汽化吸热，水温降得快
      S.T -= h * (S.T - 20) * (S.u > 0.5 ? 0.004 : 0.006) + (heating ? 0 : S.b * h * 0.9);
      // 气泡
      const src = heating ? below.filter((p) => p.y < S.minY + 0.012) : below;
      const rate = S.b * (heating ? 70 : 110);
      S.acc = (S.acc || 0) + rate * h;
      while (S.acc > 1 && src.length) {
        S.acc -= 1;
        const p = src[(Math.random() * src.length) | 0];
        bubs.spawn({ p: p.clone(), v: new THREE.Vector3(0, 0.03, 0), size: 0.0008 + Math.random() * 0.0012 * (0.6 + S.b), life: 3 });
      }
      bubs.update(h, (p, d) => {
        p.v.y += 0.25 * d; p.p.addScaledVector(p.v, d);
        p.p.x += Math.sin(p.age * 30 + p.size * 4000) * 0.0004;
        p.size *= 1 + d * 1.2;
        if (p.p.y > S.level - p.size * 0.5) { if (open && Math.random() < 0.3) S.puff = (S.puff || 0) + 1; return false; }
        return true;
      });
      // 瓶口冒白气（开着口、在沸腾）
      const mouth = flask.localToWorld(new THREE.Vector3(0, NECK1 + 0.006, 0)); group.worldToLocal(mouth);
      fog.update(h, { rate: open && S.u < 0.5 ? S.b * 18 : 0, origin: mouth, spread: 0.01, up: 0.05, size: 0.016 });
      // 冷水流：从杯口落到瓶底（朝上的那一面），沿着球面流下，最后滴进玻璃槽
      S.pour += ((S.pourHold ? 1 : 0) - S.pour) * Math.min(1, h * 5);
      const c = flask.position;
      if (S.pour > 0.85) {
        const lip = cup.localToWorld(new THREE.Vector3(-0.028, 0.07, 0)); group.worldToLocal(lip);
        for (let i = 0; i < 5; i++) stream.spawn({ p: lip.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.004, 0, (Math.random() - 0.5) * 0.008)), v: new THREE.Vector3(-0.05 - Math.random() * 0.03, -0.02, (Math.random() - 0.5) * 0.02), size: 0.0018 + Math.random() * 0.001, life: 4 });
        S.pourT += h;
      }
      stream.update(h, (p, d) => {
        p.v.y -= 0.9 * d;
        p.p.addScaledVector(p.v, d);
        const r = tmp.copy(p.p).sub(c);
        const dist = r.length();
        if ((dist < R + 0.0016 || (p.film && dist < R + 0.008)) && p.p.y > c.y - R * 0.55) {     // 碰到球面：水贴着瓶壁往下流（有一点附着）
          if (!p.film) { p.v.multiplyScalar(0.3); p.spread = (Math.random() - 0.5) * 0.25; }
          p.film = true; r.setLength(R + 0.0016); p.p.copy(c).add(r);
          const n = r.normalize(); p.v.projectOnPlane(n).multiplyScalar(1 - Math.min(0.5, d * 3));
          p.v.add(new THREE.Vector3(p.spread * d, -0.5 * d, (p.spread * 2) * d).projectOnPlane(n));   // 沿球面往下，并向四周摊开
        } else p.film = false;
        if (p.p.y < 0.03 && Math.hypot(p.p.x - DOWN.x, p.p.z) < 0.07) { trayWater.scale.y = Math.min(0.026, trayWater.scale.y + 0.000006); return false; }
        return p.p.y > 0.0;
      });
      // 声音：沸腾的咕嘟声、倒水的哗哗声
      sound?.volume(Math.min(1, S.b * 0.9)); splash?.volume(S.pour > 0.85 ? 0.8 : 0);
      // 瓶里的蒸气（示意）
      vap.visible = S.show && !open;
      if (vap.visible && above.length) {
        const n = Math.round(clamp(S.P / 101.3, 0, 1) * VN);
        for (let i = 0; i < n; i++) { const p = above[(i * 37) % above.length]; m4.makeTranslation(p.x + (Math.random() - 0.5) * 0.004, p.y + (Math.random() - 0.5) * 0.004, p.z + (Math.random() - 0.5) * 0.004); vap.setMatrixAt(i, m4); }
        vap.count = n; vap.instanceMatrix.needsUpdate = true;
      }
    };

    return {
      group: root,
      pointer,
      size: { w: 0.42, d: 0.14, h: 0.36 },
      view: { elev: 12, azim: -14, lookY: 0.5, margin: 1.06 },
      mount(ui) {
        const out = readout([{ key: 'T', label: '水温', unit: '℃' }, { key: 'b', label: '此时水的沸点', unit: '℃' }, { key: 'p', label: '瓶内气压', unit: 'kPa', span: true }]);
        out.el.hidden = true;
        const showSel = seg('瓶里的情况', ['不看', '看看瓶里（示意）'], (_, k) => { S.show = !!k; out.el.hidden = !k; });
        const q = buttons(['比刚才拿开酒精灯时<b>低</b>', '比刚才<b>高</b>', '和刚才一样'].map((t, j) => ({ text: '', ghost: true, onClick: () => {
          if (j) return status('想一想：没有再加热，还一直有冷水浇着，水温会升高吗？');
          q.el.hidden = true; W.goal.done('why');
          status('对：水温<b>更低了</b>，却又沸腾了——说明水的<b>沸点降低了</b>。浇冷水让瓶里的水蒸气液化，瓶内的气压变小，沸点就跟着降低。可以选“看看瓶里”，再浇一次，看看气压和沸点怎么变。');
        } })));
        q.btns.forEach((b, j) => (b.innerHTML = ['比刚才拿开酒精灯时<b>低</b>', '比刚才<b>高</b>', '和刚才一样'][j]));
        q.el.hidden = true;
        const btns = buttons([
          { text: '熄灭 / 点燃酒精灯', ghost: true, onClick: () => A.lamp() },
          { text: '塞上瓶塞', ghost: true, onClick: () => A.plugIn() },
          { text: '把烧瓶倒过来', ghost: true, onClick: () => A.invert(1) },
          { text: '浇冷水', ghost: true, onClick: () => { A.pour(true); setTimeout(() => A.pour(false), 1800); } },
          { text: '再做一次', ghost: true, onClick: () => A.reset() },
        ]);
        ui.controls.append(q.el, btns.el, showSel.el, out.el);
        W = {
          out, q, status: (m) => ui.status(m),
          goal: goals(ui, [['stop', '熄灭酒精灯，看水还沸腾吗'], ['cork', '塞上瓶塞，把烧瓶倒过来'], ['pour', '向瓶底浇冷水，看看会怎样'], ['why', '想一想：重新沸腾时，水温是高了还是低了']]),
        };
        ui.status('烧瓶里的水正在<b>沸腾</b>。先<b>点一下酒精灯</b>（盖上灯帽），看看会怎样。');
      },
      update(dt, t) {
        S.u += (S.uTo - S.u) * (S.dragging ? 0 : Math.min(1, dt * 3));
        if (Math.abs(S.uTo - S.u) < 0.002 && !S.dragging) S.u = S.uTo;
        place();
        step(dt);
        lamp.flame.setOn(S.lamp); lamp.flame.update(t);
        if (!W) return;
        const tb = tBoil(S.P);
        W.out.set('T', S.T, 1); W.out.set('b', tb, 1); W.out.set('p', S.P, 0);
        // 进度
        if (!S.lamp && S.b < 0.03 && S.u < 0.02 && !S.seen.has('stop')) { S.quietT += dt; if (S.quietT > 1) { S.seen.add('stop'); W.goal.done('stop'); S.T0 = S.T; status('拿开热源，水<b>停止沸腾</b>了（水温略低于 100 ℃）。现在<b>迅速塞上瓶塞</b>：把桌上的瓶塞拖到瓶口。'); } }
        if (S.u > 0.99 && S.plug === 'in' && !S.seen.has('cork')) { S.seen.add('cork'); W.goal.done('cork'); status('烧瓶倒过来了，瓶底朝上。现在<b>按住右边那杯冷水</b>，向瓶底浇冷水，盯着瓶里的水。'); }
        if (S.seen.has('cork') && S.u > 0.99 && S.b > 0.35 && S.pourT > 0.2 && !S.seen.has('pour')) {
          S.seen.add('pour'); W.goal.done('pour'); S.Tre = S.T;
          setTimeout(() => { W.q.el.hidden = false; status(`水<b>又沸腾了</b>！它刚才停止沸腾时大约 ${Math.round(S.T0 ?? 98)} ℃。现在重新沸腾，水温比那时——`); }, 1800);
        }
      },
      dispose() { bubs.dispose(); fog.dispose(); stream.dispose(); sound?.stop(); splash?.stop(); },
      debug: { S, A },
    };
  },
};
