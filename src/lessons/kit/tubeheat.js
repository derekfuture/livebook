// 给试管里的液体加热（初中化学“给物质加热”的基本操作）：试管夹夹在试管的中上部，试管和桌面约成 45°，
// 先让试管在火焰上来回移动几下、均匀受热（预热），再用酒精灯的外焰对着液体所在的部位加热；试管口不对着人。
//
// 这件公共件管三样东西：
//   1. 试管夹（木柄 + 金属夹）：平放在桌上；go(1) 时先把试管竖直提出试管架（手拿着，不画手），给管底留出空间；
//      试管夹从旁边绕到管底下面，从试管底部套上去，往上滑到中上部夹住（九上第 19 页：试管夹应从试管底部套上、取下）；
//      再一边平移一边倾斜到约 45°，放到火焰上（试管最低点落在 flameAt：外焰）。go(0) 原路倒回：回到试管架上方，
//      试管夹从管底取下、放回桌上，试管再放回试管架。
//   2. 倾斜试管里的液体：液面永远水平。液体 = 试管内腔（圆底 + 圆柱）用一个“世界坐标里的水平裁切面”切出来的下半截
//      （material.clippingPlanes，舞台已经开了 renderer.localClippingEnabled）；液面另画一片——水平面和内腔的交线围成的形状
//      （竖着是圆，斜着是椭圆，切到圆底时是圆和椭圆拼起来的样子）。液面高度按体积算：沿管轴积分“每一截圆被水平面切下的面积”，二分求出。
//   3. 沸腾的气泡（可选）：从液体最低处冒出、竖直往上走（不是沿着管轴），到液面消失。
// 化学和温度由课程自己算；这件只管姿势和画面。不改 tubebench / chemfx 的任何行为：试管在架子上时照旧用 tubeBench 自己的液体
// （浑浊、沉淀都在那里画），试管离开架子以后才换成这里的液体（只有颜色，没有浑浊）。
//
// 用法（和 tubeBench 一起；tube 是 testTube()，holder 是 tubeBench 里装着它的那个 group）：
//   const H = tubeHeat(group, { tube, holder, getS: () => S.heat, flameAt: V(XL, 0.074, 0), rest: { pos: V(0.09, 0, 0.04), yaw: 0.5 } });
//   fresh() 里放 heat: H.fresh()
//   draggable 的 taps 里放 { obj: H.pick, onTap: () => H.toggle() }（演示里 act.tap(H.pick, k)，走同一套处理函数）
//   每帧，在 tubeBench.update 之后：H.update(dt, t, { vol, color, boil })   vol：mL；color：液体颜色；boil：0~1 沸腾的气泡多少
//   读：H.k（0 在架子上 … 1 在火焰上）、H.atFlame()（试管在外焰上、可以算加热）、H.moving()、H.mouth()、H.liquidCenter()（group 坐标）
//   重来 / 演示换回状态以后：H.snap()（按 getS() 一下子摆好）
//
// 选项：tilt 和竖直方向的夹角（默认 45°）；dir = 1 管口朝右上、-1 朝左上；away 管口再往后偏一点（弧度，不对着前面的人）；
//   grip 夹在离管底多远（占管长的比例，默认 2/3，也就是离管口约 1/3）；spin 试管夹的柄绕试管转多少（弧度，正的朝前）；
//   liftTo 试管提出试管架后管底多高（要高出试管架，试管夹才能从管底下面套上去）；travelY 试管夹去夹试管时走多高；preheat 预热几秒（0 = 不预热）；dur 整个动作几秒；
//   lit() 酒精灯现在有没有火（默认一直有）：预热只在有火、试管到位时计，没火时试管在灯上静止不动，点着火以后才开始来回预热。
//   H.warmed()：预热做完了没有（预热完以后才是用外焰固定加热）。
import * as THREE from 'three';
import { water2, bubble2 } from './chemfx.js';
import { Particles } from './fx.js';
import { paint, inked } from '../../live/ink.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const UP = V(0, 1, 0);

/** 试管夹（手拿的那种）：木柄 + 金属夹，局部原点在试管轴上（夹住的地方），夹圈绕局部 y 轴，柄沿局部 +x。ringR：夹圈的半径。 */
export function testTubeHolder({ ringR = 0.0105, handle = 0.055 } = {}) {
  const g = new THREE.Group();
  const metal = paint(0x8a929c), wood = paint(0xc8955a);
  for (const y of [-0.0028, 0.0028]) {          // 上下两片弯爪
    const ring = inked(new THREE.Mesh(new THREE.TorusGeometry(ringR, 0.0008, 6, 32), metal), { width: 0.5 }); ring.rotation.x = Math.PI / 2; ring.position.y = y; g.add(ring);
    const wire = inked(new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.0013, 0.0016), metal), { width: 0.4 }); wire.position.set(ringR + 0.009, y * 0.7, 0); g.add(wire);
  }
  const slide = inked(new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.0075, 0.0085), metal), { width: 0.5 }); slide.position.set(ringR + 0.019, 0, 0); g.add(slide);     // 套在柄上的金属滑环
  const stick = inked(new THREE.Mesh(new THREE.BoxGeometry(handle, 0.0058, 0.0075), wood), { width: 0.7 }); stick.position.set(ringR + 0.0185 + handle / 2, 0, 0); g.add(stick);
  g.reach = ringR + 0.0185 + handle;          // 从夹圈中心到柄尾
  g.low = 0.0028 + 0.0008;                     // 平放时最低点在原点下面多少
  return g;
}

export function tubeHeat(group, {
  tube, holder = tube.parent, getS, flameAt, rest,
  tilt = Math.PI / 4, dir = 1, away = 0.22, grip = 2 / 3, spin = 0.75,
  liftTo = 0.085, travelY = null, preheat = 1.6, dur = 4.6, lit = () => true,
  R = tube.r - 0.0008, yc = tube.r + 0.0008, top = tube.len - 0.012,
}) {
  const yb = yc - R, rOut = yc;                   // 管底内壁最低处；玻璃外壁的半径（圆底的球心在 yc）
  const len = tube.len, gripY = len * grip;
  const home = holder.position.clone(), homeQ = holder.quaternion.clone();
  const st = () => getS();

  // ---------------- 试管夹 ----------------
  const clampM = testTubeHolder({ ringR: tube.r + 0.0008 + 0.0012 });
  group.add(clampM);
  const pick = new THREE.Mesh(new THREE.BoxGeometry(clampM.reach + 0.008, 0.016, 0.02), new THREE.MeshBasicMaterial({ visible: false }));
  pick.position.x = clampM.reach / 2; pick.userData.pick = true; clampM.add(pick);
  const restQ = new THREE.Quaternion().setFromAxisAngle(UP, rest.yaw ?? 0);
  const restP = rest.pos.clone().setY((rest.pos.y || 0) + clampM.low);
  const gripLocal = new THREE.Matrix4().compose(V(0, gripY, 0), new THREE.Quaternion().setFromAxisAngle(UP, -spin * dir), V(1, 1, 1));

  // ---------------- 试管的几个姿势（group 坐标：圆底球心 C + 朝向 Q） ----------------
  const tiltQ = new THREE.Quaternion().setFromAxisAngle(UP, away * dir).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), -tilt * dir));
  const C0 = home.clone().add(V(0, yc, 0).applyQuaternion(homeQ));
  const C1 = C0.clone().setY(liftTo + rOut);
  const C3 = flameAt.clone().add(V(0, rOut, 0));
  const C2 = C3.clone().setY(Math.max(C3.y, C1.y) + 0.004);
  const PL = 0.12, PA = 0.46, PC = 0.86;            // 进度：竖直提出试管架 | 试管夹从管底套上、滑到中上部 | 平移并倾斜 | 放到火焰上
  const tubeAt = (p, out) => {                     // 返回 { C, Q }
    if (p <= PL) { out.C.lerpVectors(C0, C1, ease(p / PL)); out.Q.copy(homeQ); return out; }
    if (p <= PA) { out.C.copy(C1); out.Q.copy(homeQ); return out; }
    if (p <= PC) { const u = ease((p - PA) / (PC - PA)); out.C.lerpVectors(C1, C2, u); out.Q.slerpQuaternions(homeQ, tiltQ, u); return out; }
    out.C.lerpVectors(C2, C3, ease((p - PC) / (1 - PC))); out.Q.copy(tiltQ); return out;
  };
  const pose = { C: V(0, 0, 0), Q: new THREE.Quaternion() };
  const m4 = new THREE.Matrix4(), one = V(1, 1, 1);
  const tubeMatrix = (C, Q) => m4.compose(C.clone().sub(V(0, yc, 0).applyQuaternion(Q)), Q, one).clone();
  // 试管夹夹住提出来的试管时的姿势，和从桌上过去的路线：抬起 → 平移到试管旁边（沿柄的方向错开）→ 降到管底下面 →
  // 挪到管底正下方 → 从管底往上套、滑到中上部（夹圈不碰玻璃：错开的距离大于夹圈半径加试管半径）
  const g0 = new THREE.Matrix4().multiplyMatrices(tubeMatrix(C1, homeQ), gripLocal);
  const G0p = V(0, 0, 0), G0q = new THREE.Quaternion(); g0.decompose(G0p, G0q, V(0, 0, 0));
  const side = V(1, 0, 0).applyQuaternion(G0q).setY(0).normalize().multiplyScalar(tube.r + 0.0008 + 0.0012 + 0.022);
  const yLow = C1.y - rOut - 0.009;                // 夹圈在管底下面
  const YT = travelY ?? Math.max(0.11, C1.y + 0.03);
  const route = [restP, V(restP.x, YT, restP.z), V(G0p.x + side.x, YT, G0p.z + side.z), V(G0p.x + side.x, yLow, G0p.z + side.z), V(G0p.x, yLow, G0p.z), G0p];
  const routeL = [0]; for (let i = 1; i < route.length; i++) routeL.push(routeL[i - 1] + route[i].distanceTo(route[i - 1]));
  const NR = route.length - 1;
  const clampAt = (u) => {                         // u：0 在桌上 … 1 夹住
    const d = ease(u) * routeL[NR]; let i = 1; while (i < NR && routeL[i] < d) i++;
    clampM.position.lerpVectors(route[i - 1], route[i], clamp((d - routeL[i - 1]) / Math.max(1e-6, routeL[i] - routeL[i - 1])));
    clampM.quaternion.slerpQuaternions(restQ, G0q, clamp((d - routeL[1]) / Math.max(1e-6, routeL[2] - routeL[1])));
  };

  // ---------------- 液体：内腔 + 水平裁切面；液面一片 ----------------
  const inner = [new THREE.Vector2(0.0002, yb)];
  for (let i = 1; i <= 12; i++) { const a = -Math.PI / 2 + (i / 12) * (Math.PI / 2); inner.push(new THREE.Vector2(Math.max(0.0002, Math.cos(a) * R), yc + Math.sin(a) * R)); }
  inner.push(new THREE.Vector2(R, top), new THREE.Vector2(0.0002, top));
  const cut = new THREE.Plane(V(0, -1, 0), 0);
  const bodyMat = water2({ color: 0xe6eef2, base: 0.55 }); bodyMat.clippingPlanes = [cut];
  const body = new THREE.Mesh(new THREE.LatheGeometry(inner, 24), bodyMat); body.renderOrder = 9.5; body.raycast = () => {}; body.visible = false;
  const NS = 40;
  const sGeo = new THREE.BufferGeometry();
  const sPos = new Float32Array((NS + 1) * 3), sNor = new Float32Array((NS + 1) * 3), idx = [];
  for (let i = 0; i < NS; i++) idx.push(0, 1 + i, 1 + ((i + 1) % NS));
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3)); sGeo.setAttribute('normal', new THREE.BufferAttribute(sNor, 3)); sGeo.setIndex(idx);
  const surfMat = water2({ color: 0xe6eef2, base: 0.62 });
  const surf = new THREE.Mesh(sGeo, surfMat); surf.renderOrder = 9.55; surf.raycast = () => {}; surf.visible = false; surf.frustumCulled = false;
  tube.add(body, surf);

  // 内腔（试管局部坐标）
  const inside = (x, y, z) => (y > top ? false : y >= yc ? x * x + z * z <= R * R : x * x + (y - yc) ** 2 + z * z <= R * R);
  const rAt = (s) => (s >= yc ? R : Math.sqrt(Math.max(0, R * R - (yc - s) ** 2)));
  const seg = (r, d) => (d <= -r ? 0 : d >= r ? Math.PI * r * r : r * r * Math.acos(-d / r) + d * Math.sqrt(r * r - d * d));     // 半径 r 的圆里 q ≤ d 的面积
  // u：“向上”在试管局部坐标里的方向；水平面：p·u = c。体积（mL）
  const volBelow = (c, u) => {
    const uy = u.y, w = Math.hypot(u.x, u.z), s1 = Math.min(top, (c + R * w) / Math.max(uy, 1e-6) + 1e-5);
    if (s1 <= yb) return 0;
    const N = 120, ds = (s1 - yb) / N; let v = 0;
    for (let i = 0; i < N; i++) { const s = yb + (i + 0.5) * ds, r = rAt(s); v += (w < 1e-6 ? (s * uy <= c ? Math.PI * r * r : 0) : seg(r, (c - s * uy) / w)) * ds; }
    return v * 1e6;
  };
  const levelC = (vol, u) => {
    const w = Math.hypot(u.x, u.z);
    let lo = yc * u.y - R, hi = top * u.y + R * w;
    for (let i = 0; i < 34; i++) { const m = (lo + hi) / 2; if (volBelow(m, u) < vol) lo = m; else hi = m; }
    return (lo + hi) / 2;
  };
  // 液面的形状：在水平面上找内腔截面的中心，再从中心往四周找边界
  const e1 = V(0, 0, 0), e2 = V(0, 0, 0), tmp = V(0, 0, 0), ctr = V(0, 0, 0);
  const buildSurface = (c, u) => {
    e1.crossVectors(u, Math.abs(u.z) < 0.9 ? V(0, 0, 1) : V(1, 0, 0)).normalize(); e2.crossVectors(u, e1).normalize();
    const s0 = clamp(c / Math.max(u.y, 1e-6), yb, top), a0 = V(0, s0, 0); a0.addScaledVector(u, c - a0.dot(u));
    ctr.set(0, 0, 0); let n = 0;
    for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) {
      tmp.copy(a0).addScaledVector(e1, (i / 6) * 2.4 * R).addScaledVector(e2, (j / 6) * 2.4 * R);
      if (inside(tmp.x, tmp.y, tmp.z)) { ctr.add(tmp); n++; }
    }
    if (!n) return false;
    ctr.multiplyScalar(1 / n);
    sPos.set([ctr.x, ctr.y, ctr.z], 0);
    for (let k = 0; k < NS; k++) {
      const ph = (k / NS) * Math.PI * 2, dx = Math.cos(ph), dy = Math.sin(ph);
      let lo = 0, hi = 4 * R;
      for (let it = 0; it < 18; it++) { const m = (lo + hi) / 2; tmp.copy(ctr).addScaledVector(e1, dx * m).addScaledVector(e2, dy * m); if (inside(tmp.x, tmp.y, tmp.z)) lo = m; else hi = m; }
      tmp.copy(ctr).addScaledVector(e1, dx * lo * 0.985).addScaledVector(e2, dy * lo * 0.985);
      sPos.set([tmp.x, tmp.y, tmp.z], (k + 1) * 3);
    }
    for (let k = 0; k <= NS; k++) sNor.set([u.x, u.y, u.z], k * 3);
    sGeo.attributes.position.needsUpdate = true; sGeo.attributes.normal.needsUpdate = true; sGeo.computeBoundingSphere();
    return true;
  };

  // ---------------- 沸腾的气泡（group 坐标，竖直往上） ----------------
  const bubs = new Particles({ max: 50, geometry: new THREE.SphereGeometry(1, 8, 6), material: bubble2({ color: 0x8aa1b0, white: 0.35 }) });
  bubs.mesh.renderOrder = 10; group.add(bubs.mesh);
  let bubAcc = 0;

  // ---------------- 每帧 ----------------
  const qT = new THREE.Quaternion(), qG = new THREE.Quaternion(), upW = V(0, 1, 0), uL = V(0, 1, 0), lowG = V(0, 0, 0), surfG = V(0, 0, 0);
  let moved = false, lastKey = '', surfY = 0;
  const place = () => {
    const S = st(), p = S.p;
    if (p <= 0) {
      if (moved) { holder.position.copy(home); holder.quaternion.copy(homeQ); moved = false; }
      clampAt(0);
    } else if (p <= PA) {          // 试管提出来（手拿着），试管夹从管底套上去
      tubeAt(p, pose); tubeMatrix(pose.C, pose.Q).decompose(holder.position, holder.quaternion, tmp); moved = true;
      clampAt(clamp((p - PL) / (PA - PL)));
    } else {
      tubeAt(p, pose);
      if (p >= 1 && S.pre > 0 && preheat > 0) {      // 预热：沿管子方向在火焰上来回移动几下
        const k = clamp(S.pre / preheat), sway = Math.sin(k * Math.PI * 4) * 0.007 * (1 - k);
        pose.C.add(V(1, 0, 0).applyQuaternion(tiltQ).setY(0).normalize().multiplyScalar(sway));
      }
      const M = tubeMatrix(pose.C, pose.Q); M.decompose(holder.position, holder.quaternion, tmp);
      moved = true;
      new THREE.Matrix4().multiplyMatrices(M, gripLocal).decompose(clampM.position, clampM.quaternion, tmp);
    }
  };
  const api = {
    clamp: clampM, pick, body, surf, bubs,
    fresh: () => ({ p: 0, goal: 0, pre: 0 }),
    go(g) { st().goal = g ? 1 : 0; },
    toggle() { const S = st(); S.goal = S.goal ? 0 : 1; return S.goal; },
    get k() { return st().p; },
    moving: () => st().p !== st().goal,
    atFlame: () => st().p >= 1,
    warmed: () => st().p >= 1 && st().pre >= preheat,
    /** 管口（group 坐标） */
    mouth: () => group.worldToLocal(tube.localToWorld(V(0, len, 0))),
    /** 液体的中间（group 坐标）：放大镜、“钻进去看”对准这里 */
    liquidCenter: () => group.worldToLocal(tube.localToWorld(V(0, Math.max(yc, yb + 0.004), 0))),
    snap() { lastKey = ''; place(); },
    update(dt, t, { vol = 0, color = 0xe6eef2, boil = 0 } = {}) {
      const S = st();
      S.p = clamp(S.p + clamp(S.goal - S.p, -dt / dur, dt / dur));
      if (S.goal === 1 && S.p >= 1) { if (lit()) S.pre = Math.min(preheat + 1, S.pre + dt); } else S.pre = 0;      // 预热只在有火、试管到位时计
      place();
      // 液体：试管离开架子以后才用这里的
      const off = S.p > 0 && vol > 0.02;
      if (tube.liq) tube.liq.visible = !off;
      body.visible = surf.visible = off;
      if (off) {
        bodyMat.color.set(color); surfMat.color.set(color);
        holder.updateWorldMatrix(true, true);
        group.getWorldQuaternion(qG); upW.copy(UP).applyQuaternion(qG);
        tube.getWorldQuaternion(qT); uL.copy(upW).applyQuaternion(qT.invert()).normalize();
        const key = `${vol.toFixed(3)}|${uL.x.toFixed(4)}|${uL.y.toFixed(4)}|${uL.z.toFixed(4)}`;
        const c = levelC(vol, uL);
        if (key !== lastKey) { lastKey = key; surf.visible = buildSurface(c, uL); }
        const pw = tube.localToWorld(uL.clone().multiplyScalar(c));
        cut.setFromNormalAndCoplanarPoint(upW.clone().negate(), pw);
        surfY = group.worldToLocal(pw.clone()).y;
        lowG.copy(group.worldToLocal(tube.localToWorld(V(0, yc, 0)))).y -= R * 0.8;
      }
      // 沸腾的气泡
      if (off && boil > 0) {
        bubAcc += dt * boil * 26;
        while (bubAcc > 1) { bubAcc -= 1; const a = Math.random() * 6.28, r = Math.random() * R * 0.45; bubs.spawn({ p: lowG.clone().add(V(Math.cos(a) * r, 0, Math.sin(a) * r)), v: V(0, 0.022 + Math.random() * 0.018, 0), size: 0.0005 + Math.random() * 0.0005, life: 1.5 }); }
      }
      bubs.update(dt, (q, d) => { q.p.addScaledVector(q.v, d); return off && q.p.y < surfY - 0.0004; });
    },
    dispose() { body.geometry.dispose(); bodyMat.dispose(); sGeo.dispose(); surfMat.dispose(); bubs.dispose?.(); },
  };
  clampAt(0);          // 一开始：试管夹平放在桌上（状态还没建好，不读 getS()）
  return api;
}
