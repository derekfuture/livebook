// 试管反应台（高中化学的试管实验共用）：试管架 + 几支试管（圆底液体、浑浊、沉淀、气泡）+ 几个滴瓶和竖插在瓶里的胶头滴管。
// 做法照初中 basereact / acidprop：滴管拿起来一直竖着，先竖直提出滴瓶，到试管口上方悬空（不伸进试管），按住一滴一滴地滴；松手插回原滴瓶。
// 试管按住左右来回拖就是振荡。化学在课程里算：每滴一滴回调 onDrop(k, key)，课程每帧用 setTube(k, {...}) 告诉台子这支试管现在什么样。
//
//   const B = tubeBench(group, { tag, look, back, tubes: [{ x, label, vol, color }], reagents: [{ key, name, at, inside }], onDrop, getS: () => S.bench });
//   fresh() 里放 bench: B.fresh()；draggable 里放 ...B.items；每帧 B.update(dt, t)；
//   B.setTube(k, { vol, color, milk, milkColor, speckColor, sediment, sedColor, gas, mirror })
//   演示：B.dripSeq(act, i, [[k, () => 滴够了吗]], t0, tMax)、B.wiggle(act, k, t0, t1)；质检：B.qaDrip(i, k, () => 滴够了吗)
//
// exact: true（新写法，旧课不传就还是原来的样子）：
//   抓哪儿就是哪儿（保留抓取偏移），滴管在瓶里时手往上提多少才提起多少；滴管尖不吸到管口，跟着手走，
//   真的悬在管口里面（管内半径以内、管口上方 4 cm 以内）才滴；液滴落到液面才回调 onDrop（B.inflight(k) = 还在半空的滴数）；
//   滴的时候镜头不凑近（手按着时镜头一动，手下的位置就变了）；松手 0.3–0.6 秒插回滴瓶。
//   试管：按住往上提，提出试管架以后左右轻摇才是振荡；松手放回架上。
import * as THREE from 'three';
import { testTube, glassMat } from './chem.js';
import { water2, tubeLiquid, bubble2 } from './chemfx.js';
import { dropBottle, homeLift } from './labops.js';
import { textPlate } from './props.js';
import { Particles } from './fx.js';
import { clamp } from './interact.js';
import { sfx } from './audio.js';
import { paint, inked, glassEdge } from '../../live/ink.js';

export const T_R = 0.0085, T_LEN = 0.1, T_Y = 0.012, R_IN = T_R - 0.0008, DROP = 0.05;
const YC = T_R + 0.0008, YB = YC - R_IN, V_HEMI = (2 / 3) * Math.PI * R_IN ** 3 * 1e6;
const HIGH = T_Y + T_LEN + 0.012;          // 滴管尖在试管口上方 1.2 cm 悬空滴
/** 试管里 vol mL 液体的液面高度（试管局部坐标） */
export const levelY = (vol) => {
  if (vol <= 0) return YB;
  if (vol >= V_HEMI) return YC + ((vol - V_HEMI) * 1e-6) / (Math.PI * R_IN * R_IN);
  let lo = 0, hi = R_IN;
  for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if ((Math.PI * m * m * (3 * R_IN - m)) / 3 * 1e6 < vol) lo = m; else hi = m; }
  return YB + lo;
};

export function tubeBench(group, { tag, look, back, tubes: TUBES, reagents: REAGENTS, onDrop, getS, rate = 3, rackW = null, exact = false }) {
  const X = TUBES.map((t) => t.x);
  // ---- 试管架 ----
  const rackM = paint(0xd9c9a6);
  const x0 = Math.min(...X) - 0.02, x1 = Math.max(...X) + 0.02, cx = (x0 + x1) / 2, w = rackW ?? x1 - x0;
  { const base = inked(new THREE.Mesh(new THREE.BoxGeometry(w, 0.008, 0.03), rackM), { width: 0.6 }); base.position.set(cx, 0.004, 0); group.add(base);
    for (const sx of [-1, 1]) { const p = inked(new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.06, 0.026), rackM), { width: 0.5 }); p.position.set(cx + sx * (w / 2 - 0.002), 0.036, 0); group.add(p); }
    const top = inked(new THREE.Mesh(new THREE.BoxGeometry(w, 0.004, 0.02), rackM), { width: 0.5 }); top.position.set(cx, 0.064, -0.006); group.add(top); }
  // ---- 试管 ----
  const bubMat = bubble2({ color: 0x8aa1b0, white: 0.35 });
  const tubes = TUBES.map((T, k) => {
    const holder = new THREE.Group(); holder.position.set(T.x, T_Y, 0); group.add(holder);
    const t = testTube({ r: T_R, len: T_LEN }); holder.add(t);
    const liq = tubeLiquid({ R: R_IN, yc: YC, top: T_LEN - 0.012, color: T.color ?? 0xe6eef2, specks: 40, speck: 0.0009 }); t.add(liq);
    const sed = new THREE.Mesh(new THREE.SphereGeometry(R_IN * 0.98, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), paint(0xffffff, { keep: true })); sed.position.y = YC; sed.renderOrder = 9.8; sed.visible = false; t.add(sed);
    const mirror = new THREE.Mesh(new THREE.CylinderGeometry(R_IN + 0.0004, R_IN + 0.0004, 1, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0xd9dde3, metalness: 0.95, roughness: 0.18, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    mirror.geometry.translate(0, 0.5, 0); mirror.position.y = YC; mirror.renderOrder = 9.9; t.add(mirror);
    const pick = new THREE.Mesh(new THREE.CylinderGeometry(T_R + 0.004, T_R + 0.004, T_LEN, 10), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = T_LEN / 2; pick.userData.pick = true; t.add(pick);
    if (T.label) { const lab = textPlate(T.label, { w: Math.max(0.012, Math.min(0.034, T.label.length * 0.0052)), h: 0.0072, color: '#23293a', bg: '#fffaf0', font: `bold ${Math.min(78, Math.floor(420 / T.label.length))}px "Songti SC", serif` }); lab.position.set(T.x, 0.004, 0.0162); group.add(lab); }
    const bubs = new Particles({ max: 60, geometry: new THREE.SphereGeometry(1, 8, 6), material: bubMat }); bubs.mesh.renderOrder = 10; t.add(bubs.mesh);
    return Object.assign(t, { holder, liq, sed, mirror, pick, bubs, look: { vol: T.vol ?? 0, color: T.color ?? 0xe6eef2, milk: 0, milkColor: 0xffffff, speckColor: 0xffffff, sediment: 0, sedColor: 0xffffff, gas: 0, mirror: 0 }, bubAcc: 0 });
  });
  // ---- 滴瓶和胶头滴管（原点在滴管尖）----
  const bottleLabel = (Bt, text) => { const lab = textPlate(text, { w: 0.026, h: 0.008, bg: 'rgba(253,251,245,0.95)', font: `bold ${Math.min(120, Math.floor(480 / text.length))}px "Songti SC", serif` }); lab.position.set(0, 0.022, 0.0135); Bt.add(lab); };
  const droppers = REAGENTS.map((R) => {
    const Bt = dropBottle(group, R.at, { brown: !!R.brown, liq: R.inside ?? 0xe0ecef }); bottleLabel(Bt, R.name);
    const g = new THREE.Group(); group.add(g);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.0024, 0.0011, 0.046, 14), glassMat({ opacity: 0.3 })); glass.geometry.translate(0, 0.023, 0); glass.renderOrder = 9; glassEdge(glass, 0.0005);
    const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.0014, 0.0008, 0.018, 10), paint(R.inside ?? 0xeef2f4, { keep: true })); liq.position.y = 0.0095;
    const collar = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0068, 0.0068, 0.005, 18), paint(0xc23a3a, { keep: true })), { width: 0.6 }); collar.position.y = 0.0435;
    const bulb = inked(new THREE.Mesh(new THREE.SphereGeometry(0.0055, 16, 12), paint(0xc23a3a, { keep: true })), { width: 0.6 }); bulb.scale.set(1, 1.55, 1); bulb.position.y = 0.0545;
    const pick = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.075, 0.018), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 0.035; pick.userData.pick = true;
    g.add(glass, liq, collar, bulb, pick); g.position.copy(Bt.tipHome);
    return Object.assign(g, { pick, B: Bt, bulb, R });
  });
  // exact：取景时把“滴管悬在管口上方滴”的高度也算进去（滴管不凑近，整体画面里要看得到胶头、管尖和管底）
  if (exact) { const fr = new THREE.Mesh(new THREE.BoxGeometry(0.001, 0.001, 0.001), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); fr.position.set(cx, HIGH + 0.066, 0); fr.raycast = () => {}; group.add(fr); }
  const drops = new Particles({ max: 80, geometry: new THREE.SphereGeometry(1, 6, 5), material: water2({ color: 0xbfd8e6, base: 0.6 }) }); drops.mesh.renderOrder = 9.6; group.add(drops.mesh);
  const cards = tubes.map(() => tag('', 'cond'));

  const fresh = () => ({ carry: REAGENTS.map(() => null), over: REAGENTS.map(() => -1), dripT: REAGENTS.map(() => 0), shake: TUBES.map(() => ({ e: 0, off: 0, lastX: null, gx: 0, gy: 0, liftT: 0, lift: 0 })), nearK: null });
  const st = () => getS();
  // 和初中 basereact 一样：手在哪支试管的正上方（左右 1.1 cm 以内、高过管口）就对准哪支，不限高度
  const overTube = (p) => tubes.findIndex((t, k) => Math.abs(p.x - X[k]) < 0.011 && p.y > T_Y + T_LEN - 0.01);
  const follow = (d, to, a) => {
    const Bt = d.B, p = d.position, off = Math.hypot(p.x - Bt.position.x, p.z - Bt.position.z), up = Math.max(Bt.mouthY + 0.008, to.y);
    p.lerp(off < 0.02 && p.y < up - 0.002 ? new THREE.Vector3(off < 0.003 ? Bt.position.x : p.x, up, off < 0.003 ? Bt.position.z : p.z) : to, a);
  };
  const putBack = (d, a) => {
    const p = d.position, off = Math.hypot(p.x - d.B.position.x, p.z - d.B.position.z);
    if (off > 0.004 && p.y < HIGH - 0.002) p.lerp(new THREE.Vector3(p.x, HIGH, p.z), a);
    else homeLift(d, d.B.tipHome, a);
  };
  // ---- exact ----
  const LIFT = 0.058;          // 试管提出架子的高度（管底高过架子顶）
  const ka = (a, dt) => 1 - Math.pow(1 - a, Math.min(4, dt * 60));          // 按 60 帧/秒折算的每帧 lerp
  const mouthY = (k) => tubes[k].holder.position.y + T_LEN;
  const floorAt = (x) => {          // 滴管尖最低能到哪儿：不戳进试管、试管架、桌面
    let y = 0.004;
    if (Math.abs(x - cx) < w / 2 + 0.004) y = 0.07;          // 试管架顶高 6.6 cm
    tubes.forEach((t, k) => { if (Math.abs(x - t.holder.position.x) < T_R + 0.004) y = Math.max(y, mouthY(k) + 0.003); });
    return y;
  };
  const followX = (d, c, a) => {
    const Bt = d.B, p = d.position, off = Math.hypot(p.x - Bt.position.x, p.z - Bt.position.z), up = Bt.mouthY + 0.008;
    // 还在滴瓶里：手往上提多少，滴管就竖直提起多少；提出瓶口以后跟着手走（回到试管那一排 z = 0）
    if (off < 0.003 && p.y < up - 0.001) p.lerp(new THREE.Vector3(Bt.position.x, clamp(c.y, Bt.tipHome.y, up), Bt.position.z), a);
    else p.lerp(new THREE.Vector3(c.x, Math.max(c.y, floorAt(c.x)), 0), a);
  };
  const putBackX = (d, a) => {
    const p = d.position, Bt = d.B, off = Math.hypot(p.x - Bt.position.x, p.z - Bt.position.z);
    if (off > 0.003) p.lerp(new THREE.Vector3(Bt.position.x, Math.max(p.y, Bt.mouthY + 0.008), Bt.position.z), a);          // 平移到滴瓶口上方
    else p.lerp(Bt.tipHome, a);          // 再竖直插回去
  };
  // 滴管尖真的悬在哪支试管口里面
  const tipOver = (p) => tubes.findIndex((t, k) => Math.abs(p.x - t.holder.position.x) < R_IN - 0.001 && Math.abs(p.z - t.holder.position.z) < R_IN - 0.001 && p.y > mouthY(k) + 0.002 && p.y < mouthY(k) + 0.04);

  const near = (k) => { const S = st(); if (!look || S.demo || S.nearK === k) return; S.nearK = k; look([X[k], T_Y + 0.07, 0], [0.04, 0.22, 1], 0.27,          // 凑近也要看得见管口上方的滴管尖和管底的液体
       () => { if (st()) st().nearK = null; }); };
  const far = () => { const S = st(); if (!back || S.nearK == null) return; S.nearK = null; back(); };

  const items = exact ? [
    // 拖动平面竖着穿过滴管（跟着滴管的 z 走），抓的地方不变
    ...REAGENTS.map((R, i) => ({ obj: droppers[i].pick, plane: 'xy', get offset() { return droppers[i].position.z; }, keepOffset: true, anchor: droppers[i], hint: R.hint ?? `${R.name}：提出来，拖到试管口上方，按住——一滴一滴地滴`,
      onStart: (p) => { st().carry[i] = p ? p.clone() : droppers[i].position.clone(); }, onDrag: (p) => { if (p) st().carry[i] = p.clone(); }, onEnd: () => { st().carry[i] = null; st().over[i] = -1; } })),
    ...tubes.map((t, k) => ({ obj: t.pick, plane: 'xy', offset: 0, hint: TUBES[k].hint ?? '按住往上提出试管架，左右轻轻摇：振荡',
      onStart: (p) => { const s = st().shake[k]; s.lastX = p ? p.x : X[k]; s.gx = s.lastX; s.gy = p ? p.y : 0.06; s.liftT = 0; },
      onDrag: (p) => { if (!p) return; const s = st().shake[k], last = s.lastX; s.lastX = p.x; s.liftT = clamp(p.y - s.gy, 0, LIFT); const f = s.liftT / LIFT; if (last == null) return;
        if (f > 0.85) s.e = Math.min(1, s.e + Math.min(0.5, Math.abs(p.x - last) * 22)); s.off = clamp(p.x - s.gx, -0.008, 0.008); },
      onEnd: () => { const s = st().shake[k]; s.lastX = null; s.liftT = 0; } })),
  ] : [
    ...REAGENTS.map((R, i) => ({ obj: droppers[i].pick, plane: 'xy', offset: 0, hint: R.hint ?? `${R.name}：拖到试管口上方，按住——一滴一滴地滴`,
      onStart: (p) => { st().carry[i] = p ? p.clone() : droppers[i].position.clone(); }, onDrag: (p) => { if (p) st().carry[i] = p.clone(); }, onEnd: () => { st().carry[i] = null; st().over[i] = -1; } })),
    ...tubes.map((t, k) => ({ obj: t.pick, plane: 'xy', offset: 0, hint: TUBES[k].hint ?? '按住，左右来回拖：振荡',
      onStart: (p) => { st().shake[k].lastX = p ? p.x : null; },
      onDrag: (p) => { if (!p) return; const s = st().shake[k], last = s.lastX; s.lastX = p.x; if (last == null) return; s.e = Math.min(1, s.e + Math.min(0.5, Math.abs(p.x - last) * 22)); s.off = clamp(p.x - X[k], -0.008, 0.008); },
      onEnd: () => { st().shake[k].lastX = null; } })),
  ];

  const api = {
    tubes, droppers, items, X, fresh, drops, cards, near, far, overTube, exact,
    /** exact：第 k 支试管上方还在半空、没落到液面的滴数（演示 / 质检判断“滴够了”时算上它们） */
    inflight: (k) => drops.list.filter((p) => p.k === k && p.S === st()).length,
    setTube(k, o) { Object.assign(tubes[k].look, o); },
    shakeE: (k) => st().shake[k].e,
    update(dt, t) {
      const S = st();
      if (exact) {
        droppers.forEach((d, i) => {
          const c = S.carry[i];
          if (c) {
            followX(d, c, ka(0.4, dt));
            const k = tipOver(d.position);
            S.over[i] = k;
            if (k >= 0) {
              S.dripT[i] += dt * rate;
              d.bulb.scale.set(1 - 0.18 * Math.sin(S.dripT[i] % 1 * Math.PI), 1.55, 1 - 0.18 * Math.sin(S.dripT[i] % 1 * Math.PI));
              while (S.dripT[i] >= 1) {
                S.dripT[i] -= 1;
                drops.spawn({ p: d.position.clone().add(new THREE.Vector3(0, -0.0015, 0)), v: new THREE.Vector3(0, -0.08, 0), size: 0.0012, life: 1.6, k, key: d.R.key, S });
                sfx.clink({ freq: 2600, gain: 0.01 });
              }
            } else d.bulb.scale.set(1, 1.55, 1);
          } else { putBackX(d, ka(0.33, dt)); d.bulb.scale.set(1, 1.55, 1); }
        });
        // 液滴落到液面才算加进去
        const landed = [];
        drops.update(dt, (p, d) => { p.v.y -= 0.5 * d; p.p.addScaledVector(p.v, d); const tb = tubes[p.k], top = (tb ? tb.holder.position.y + levelY(tb.look.vol) : 0) + 0.001; if (p.p.y > top) return true; landed.push(p); return false; });
        for (const p of landed) if (p.S === st()) onDrop(p.k, p.key);
      } else droppers.forEach((d, i) => {
        const c = S.carry[i];
        if (c) {
          const k = overTube(c);
          // 滴管尖就在手上（不强行抬高）；到了试管正上方，停在管口上方 1.2 cm 悬空滴
          follow(d, k >= 0 ? new THREE.Vector3(X[k], HIGH, 0) : c.clone(), 0.4);
          const at = k >= 0 && d.position.distanceTo(new THREE.Vector3(X[k], HIGH, 0)) < 0.003;
          S.over[i] = at ? k : -1;
          if (at) {
            S.dripT[i] += dt * rate;
            d.bulb.scale.set(1 - 0.18 * Math.sin(S.dripT[i] % 1 * Math.PI), 1.55, 1 - 0.18 * Math.sin(S.dripT[i] % 1 * Math.PI));
            while (S.dripT[i] >= 1) {
              S.dripT[i] -= 1;
              drops.spawn({ p: d.position.clone().add(new THREE.Vector3(0, -0.0015, 0)), v: new THREE.Vector3(0, -0.08, 0), size: 0.0012, life: 1.6, k });
              sfx.clink({ freq: 2600, gain: 0.01 });
              onDrop(k, d.R.key);
            }
            if (!S.demo) near(k);
          } else d.bulb.scale.set(1, 1.55, 1);
        } else { putBack(d, 0.25); d.bulb.scale.set(1, 1.55, 1); }
      });
      if (!exact) {
        if (!S.carry.some(Boolean) && S.nearK != null && !S.shake.some((s) => s.lastX != null)) far();
        drops.update(dt, (p, d) => { p.v.y -= 0.5 * d; p.p.addScaledVector(p.v, d); const L = tubes[p.k]?.look; return p.p.y > T_Y + levelY(L ? L.vol : 0) + 0.001; });
      }
      tubes.forEach((tb, k) => {
        const L = tb.look, sh = S.shake[k];
        sh.e = Math.max(0, sh.e - dt * 0.6); if (sh.lastX == null) sh.off *= Math.max(0, 1 - dt * 8);
        if (exact) {          // 提出架子才摇得动；松手很快放回架上
          sh.lift += (sh.liftT - sh.lift) * ka(0.3, dt); if (Math.abs(sh.liftT - sh.lift) < 1e-4) sh.lift = sh.liftT;
          const f = clamp((sh.lift / LIFT - 0.85) / 0.15, 0, 1);
          tb.holder.position.set(X[k] + sh.off * f, T_Y + sh.lift, 0); tb.holder.rotation.z = -sh.off * 6 * f;
        } else { tb.holder.position.x = X[k] + sh.off; tb.holder.rotation.z = -sh.off * 6; }
        const y = levelY(L.vol); tb.liq.setLevel(y); tb.liq.setColor(L.color); tb.liq.setMilk(L.milk, L.milkColor, L.speckColor); tb.liq.update(t);
        tb.sed.visible = L.sediment > 0.01 && L.vol > 0.05; tb.sed.material.color.set(L.sedColor);
        tb.sed.scale.set(1, Math.min(0.9, 0.12 + L.sediment * 0.5), 1);
        tb.mirror.material.opacity = Math.min(0.92, L.mirror); tb.mirror.scale.y = Math.max(0.001, y - YC);
        if (L.gas > 0 && L.vol > 0.1) { tb.bubAcc += dt * L.gas * 18; while (tb.bubAcc > 1) { tb.bubAcc -= 1; const a = Math.random() * 6.28, r = Math.random() * R_IN * 0.6; tb.bubs.spawn({ p: new THREE.Vector3(Math.cos(a) * r, YB + 0.002, Math.sin(a) * r), v: new THREE.Vector3(0, 0.025 + Math.random() * 0.02, 0), size: 0.0005 + Math.random() * 0.0005, life: 2, top: y }); } }
        tb.bubs.update(dt, (p, d) => { p.p.addScaledVector(p.v, d); return p.p.y < p.top; });
      });
    },
    // 演示：拿起第 i 个滴管，依次移到 stops 里每支试管口上方，滴到 until() 为真再去下一支，最后松手插回滴瓶（走学生拖滴管的同一套处理函数）
    dripSeq(drag, i, stops, t0, tMax) {
      const d = drag.items().find((x) => x.obj === droppers[i].pick), SPD = 0.16;
      let s = null;
      return (k, dt) => {
        if (k < t0) { s = null; return; }
        if (s?.ended) return;
        if (!s) { const c = droppers[i].position.clone().add(new THREE.Vector3(0, exact ? 0 : 0.035, 0)); s = { p: c, pts: [droppers[i].B.position.clone().setY(HIGH), ...stops.map(([kk]) => new THREE.Vector3(X[kk], HIGH, 0))], j: 0 }; d.onStart?.(c.clone()); }
        const tgt = s.pts[s.j];
        s.p.add(tgt.clone().sub(s.p).clampLength(0, SPD * (dt || 1 / 30)));
        d.onDrag?.(s.p.clone(), s.p.clone());
        if (s.p.distanceTo(tgt) < 1e-5 && (s.j === 0 || stops[s.j - 1][1]())) { if (s.j + 1 < s.pts.length) s.j++; else { s.ended = true; d.onEnd?.(true); } }
        if (k >= tMax && !s.ended) { s.ended = true; d.onEnd?.(true); }
      };
    },
    wiggle: (act, k, t0, t1, dur) => {
      if (!exact) return act.wiggle(tubes[k].pick, { t0, t1, amp: 0.012, hz: 3, dur });
      // exact：先提出试管架，再左右轻摇，最后松手放回（走学生拖试管的同一套处理函数）
      const d = items.find((x) => x.obj === tubes[k].pick);
      let s = null;
      return (kk) => {
        if (kk < t0) { s = null; return; }
        if (s?.ended) return;
        if (!s) { s = { a: new THREE.Vector3(X[k], T_Y + 0.05, 0) }; d.onStart(s.a.clone()); }
        const u = (kk - t0) / Math.max(1e-3, t1 - t0), up = clamp(u / 0.18, 0, 1), w = u > 0.22 ? Math.sin((kk - t0) * (dur ?? 4) * 3 * Math.PI * 2) * 0.012 : 0;
        d.onDrag(s.a.clone().add(new THREE.Vector3(w, (LIFT + 0.004) * up * up * (3 - 2 * up), 0)));
        if (kk >= t1) { s.ended = true; d.onEnd(true); }
      };
    },
    // 质检：拿第 i 个滴管到第 k 支试管口上方按住，until() 成立就松手
    qaDrip(drag, i, k, until) {
      const S0 = st(), d = drag.items().find((x) => x.obj === droppers[i].pick), p = new THREE.Vector3(X[k], HIGH, 0);
      if (exact) {          // 先竖直提出滴瓶，再移到管口上方
        const D = droppers[i], up = D.B.position.clone().setY(HIGH);
        d.onStart?.(D.position.clone()); d.onDrag?.(up.clone(), up.clone());
        const go = () => { if (st() !== S0) return; if (D.position.y > D.B.mouthY + 0.006) d.onDrag?.(p.clone(), p.clone()); if (until()) { d.onEnd?.(true); return; } requestAnimationFrame(go); }; requestAnimationFrame(go);
        return;
      }
      d.onStart?.(p.clone()); d.onDrag?.(p.clone(), p.clone());
      const go = () => { if (st() !== S0) return; if (until()) { d.onEnd?.(true); return; } requestAnimationFrame(go); }; requestAnimationFrame(go);
    },
    qaShake(drag, k) { const d = drag.items().find((x) => x.obj === tubes[k].pick); const p = new THREE.Vector3(X[k], T_Y + 0.05, 0), up = exact ? LIFT + 0.004 : 0; d.onStart?.(p.clone()); for (let j = 0; j < 16; j++) d.onDrag?.(p.clone().add(new THREE.Vector3(j % 2 ? 0.008 : -0.008, up, 0))); d.onEnd?.(true); },
    dispose() { drops.dispose(); tubes.forEach((t) => { t.liq.dispose(); t.bubs.dispose(); }); },
  };
  return api;
}
