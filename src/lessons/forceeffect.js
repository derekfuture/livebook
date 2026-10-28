// 图7.1-4 小铁球受到磁体的作用。一个木框玻璃台面，角上一个小斜面；小铁球从斜面滚下，在台面上运动。
// 磁体可以拖到台面上任意位置：放在小铁球前方（沿运动方向）→ 越滚越快；放在侧旁 → 运动方向改变；小铁球静止时把磁体移近 → 由静止开始运动。
// 模型：台面上的二维运动。磁体对铁球的吸引 a = K/r²（r 是到磁体中心的距离，近处截断），滚动阻力很小。
import * as THREE from 'three';
import { buttons, goals, note, readout } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { paint, inked, hull, glassEdge, arrow, MAGENTA } from '../live/ink.js';

const TW = 0.34, TD = 0.2, TOP = 0.034;      // 台面尺寸、台面高度
const R = 0.0085;                              // 小铁球半径
const K = 1.6e-3;                              // 磁体的“吸引强度”（m³/s²）
const SLOW = 0.7;                              // 慢放，便于看清
const START = new THREE.Vector3(-TW / 2 + 0.085, 0, -TD / 2 + 0.06);    // 斜面底端（整个斜面放在台面的角上）
const DIR = new THREE.Vector3(1, 0, 0.48).normalize();                    // 斜面的朝向（课本图里斜着放）

export default {
  id: 'forceeffect',
  fig: '图7.1-4',
  title: '力的作用效果',
  stampText: '观察',
  predict: {
    q: '让小铁球从斜面上滚下，在它运动路径的<b>侧旁</b>放一个磁体（图7.1-4 乙）。<br>小铁球会——',
    hint: '课本第 3 页「演示」',
    options: ['仍然沿直线运动', '运动方向向磁体一侧偏', '立刻停下来'],
    answer: 1,
  },
  conclusion: {
    page: 7, rect: [62, 553, 360, 640],      // 课本第 3 页
    quote: '在物理学中，物体由静止开始运动或由运动变为静止、物体运动的快慢或方向发生改变，这几种情况都是物体的运动状态发生了变化。上面的实验现象表明，力可以改变物体的运动状态。',
    why: '磁体对小铁球有吸引力。磁体在小铁球的前方，吸引力沿着运动方向，小铁球越滚越快；磁体在侧旁，吸引力和运动方向不在一条直线上，小铁球的运动方向就偏向磁体；小铁球静止时，磁体靠近，它就由静止开始运动。磁体并没有接触小铁球——不接触的物体之间也可以有力的作用。',
    src: '课本第 2–3 页 · 第七章 第1节 力',
  },

  create({ tag }) {
    const group = new THREE.Group();
    // ---- 木框玻璃台 ----
    const wood = paint(0xe2c08d);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(TW, 0.004, TD), paint(0xdcebf5));
    glass.position.y = TOP - 0.002;
    group.add(glass);
    for (const [w, d, x, z] of [[TW + 0.024, 0.012, 0, -TD / 2 - 0.006], [TW + 0.024, 0.012, 0, TD / 2 + 0.006], [0.012, TD, -TW / 2 - 0.006, 0], [0.012, TD, TW / 2 + 0.006, 0]]) {
      const b = inked(new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, d), wood), { width: 1.2 });
      b.position.set(x, TOP + 0.002, z);
      group.add(b);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const leg = inked(new THREE.Mesh(new THREE.BoxGeometry(0.012, TOP - 0.004, 0.012), wood), { width: 1.1 });
      leg.position.set(sx * (TW / 2 - 0.004), (TOP - 0.004) / 2, sz * (TD / 2 - 0.004));
      group.add(leg);
    }
    // ---- 斜面（从角上斜着伸进台面） ----
    const RAMP_L = 0.08, RAMP_H = 0.03;
    const ramp = new THREE.Group();
    ramp.position.copy(START).setY(TOP);
    ramp.rotation.y = -Math.atan2(DIR.z, DIR.x);
    const slope = Math.atan2(RAMP_H, RAMP_L);
    const plank = inked(new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(RAMP_L, RAMP_H), 0.004, 0.026), paint(0xcfd5dd)), { width: 1.1 });
    plank.position.set(-RAMP_L / 2, RAMP_H / 2 + 0.002, 0);
    plank.rotation.z = -slope;
    const post = inked(new THREE.Mesh(new THREE.BoxGeometry(0.008, RAMP_H, 0.022), paint(0x9aa3b2)), { width: 1.1 });
    post.position.set(-RAMP_L + 0.004, RAMP_H / 2, 0);
    ramp.add(plank, post);
    group.add(ramp);
    // ---- 小铁球 ----
    const ball = hull(new THREE.Mesh(new THREE.SphereGeometry(R, 24, 16), new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 0.35, roughness: 0.35 })), 0.001);
    group.add(ball);
    // ---- 磁体（红 N、蓝 S） ----
    const magnet = new THREE.Group();
    const mN = inked(new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.011, 0.012), paint(0xd9483b)), { width: 1.1 });
    const mS = inked(new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.011, 0.012), paint(0x2f6fd0)), { width: 1.1 });
    mN.position.x = -0.011; mS.position.x = 0.011;
    magnet.add(mN, mS);
    magnet.position.set(TW / 2 - 0.05, TOP + 0.0055, TD / 2 - 0.04);
    group.add(magnet);
    const mTag = tag('磁体', 'pill');
    // ---- 运动轨迹（课本图里的虚线） ----
    const MAXP = 600;
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXP * 3), 3));
    trailGeo.setDrawRange(0, 0);
    const trail = new THREE.Line(trailGeo, new THREE.LineDashedMaterial({ color: 0x2a3040, dashSize: 0.006, gapSize: 0.005 }));
    group.add(trail);
    // 频闪：每隔相同的时间留一个淡淡的小球影子（像课本里的频闪照片）——间距越来越大是变快，连线拐弯是方向变了
    const GH = 60, ghostMat = new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 0.3, roughness: 0.4, transparent: true, opacity: 0.32, depthWrite: false });
    const ghosts = new THREE.InstancedMesh(new THREE.SphereGeometry(R, 16, 12), ghostMat, GH);
    ghosts.count = 0; ghosts.frustumCulled = false; ghosts.raycast = () => {};
    group.add(ghosts);
    // 磁体对小铁球的吸引力（品红箭头，指向磁体；越近越长）
    const fArrow = arrow(MAGENTA, 0.0018); fArrow.visible = false; group.add(fArrow);
    const tF = tag('', 'mag');

    const S = { mode: 'ramp', s: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), n: 0, stuck: false, launched: false, v0: 0, dir0: null, maxV: 0, maxTurn: 0, seen: new Set() };
    let W = null;
    const resetBall = (onRamp = true) => {
      S.mode = onRamp ? 'ramp' : 'rest'; S.s = 0; S.stuck = false; S.launched = false; S.maxV = 0; S.maxTurn = 0; S.saidTurn = S.saidSpeed = S.fromRest = false; S.v0 = 0;
      S.v.set(0, 0, 0); S.n = 0; trailGeo.setDrawRange(0, 0); ghosts.count = 0; S.gt = 0; S.hitWall = false;
      if (onRamp) S.p.copy(START).addScaledVector(DIR, -RAMP_L + 0.008);
      else S.p.set(0, 0, 0.02);
      place();
    };
    const place = () => {
      if (S.mode === 'ramp' || S.mode === 'rolling-ramp') {     // 在斜面上（静止或正在滚下）：沿着斜面放
        const along = -RAMP_L + 0.008 + S.s;                     // 沿斜面（负的是在斜面上）
        const hgt = along < 0 ? (-along / RAMP_L) * RAMP_H : 0;
        ball.position.copy(START).addScaledVector(DIR, along).setY(TOP + R + hgt + 0.002);
      } else ball.position.set(S.p.x, TOP + R, S.p.z);
      mTag.loc(group, magnet.position.x, TOP + 0.012, magnet.position.z + 0.028);
    };
    const pushTrail = () => {
      if (S.n >= MAXP) return;
      trailGeo.attributes.position.setXYZ(S.n++, ball.position.x, TOP + 0.0005, ball.position.z);
      trailGeo.attributes.position.needsUpdate = true;
      trailGeo.setDrawRange(0, S.n);
      trail.computeLineDistances();
    };
    resetBall(true);

    const release = () => { if (S.mode !== 'ramp' || S.s > 0) resetBall(true); S.mode = 'rolling-ramp'; S.launched = true; W?.status('小铁球从斜面上滚下来……'); };
    const pointer = draggable(group, [
      { obj: magnet, plane: 'xz', offset: TOP, keepOffset: true, hint: '拖动磁体，放到台面上的任意位置', onDrag: (p) => { magnet.position.set(clamp(p.x, -TW / 2 + 0.02, TW / 2 - 0.02), TOP + 0.0055, clamp(p.z, -TD / 2 + 0.012, TD / 2 - 0.012)); place(); } },
      { obj: ball, plane: 'xz', offset: TOP, hint: '点一下：让小铁球从斜面滚下', onTap: () => { if (S.mode === 'ramp') release(); } },
    ], { tip: tag('', 'pill') });

    const magnetAccel = (p, out) => {
      const d = new THREE.Vector3(magnet.position.x - p.x, 0, magnet.position.z - p.z);
      const r = Math.max(0.02, d.length());
      return out.copy(d.normalize()).multiplyScalar(K / (r * r));
    };

    return {
      group,
      size: { w: 0.38, d: 0.24, h: 0.07 },
      card: false,
      view: { elev: 46, azim: 0, lookY: 0.2, margin: 1.0 },
      pointer,
      mount(ui) {
        const out = readout([{ key: 'v', label: '小铁球的速度', unit: 'cm/s' }, { key: 'st', label: '运动状态' }]);
        const btn = buttons([{ text: '让小铁球从斜面滚下', onClick: release }, { text: '把小铁球放在台面中间（静止）', ghost: true, onClick: () => { resetBall(false); W.status('小铁球静止在台面上。把磁体慢慢移近它。'); } }]);
        ui.controls.append(note('<b>拖动磁体</b>放到台面上任意位置：放在小铁球运动的<b>前方</b>，或者放在它运动路径的<b>侧旁</b>。'), btn.el, out.el);
        W = { out, status: (m) => ui.status(m), goal: goals(ui, [['start', '小铁球静止时，把磁体移近它'], ['speed', '磁体放在小铁球运动的前方'], ['turn', '磁体放在小铁球运动路径的侧旁']]) };
        W.status('先把磁体放好，再点“让小铁球从斜面滚下”（也可以直接<b>点小铁球</b>）。');
      },
      update(dt) {
        const h = Math.min(dt, 1 / 30) * SLOW;
        if (S.mode === 'rolling-ramp') {
          // 斜面上：a = g·sinθ（滚动的球按 5/7 算），到底端时进入台面
          S.v0 = (S.v0 || 0) + 9.8 * Math.sin(Math.atan2(RAMP_H, RAMP_L)) * (5 / 7) * h * 0.4;    // 斜面上的加速（球滚动按 5/7 g sinθ，再打个折让速度适中）
          S.s += S.v0 * h;
          if (S.s >= RAMP_L - 0.008) { S.mode = 'table'; S.p.copy(START); S.v.copy(DIR).multiplyScalar(S.v0); S.dir0 = DIR.clone(); S.v0launch = S.v0; S.v0 = 0; }
          place();
        } else if (S.mode === 'table' || S.mode === 'rest') {
          const a = magnetAccel(S.p, new THREE.Vector3());
          if (S.mode === 'rest') {
            if (a.length() > 0.08) { S.mode = 'table'; S.fromRest = true; S.dir0 = null; S.v0launch = 0; }
          } else if (!S.stuck) {
            S.v.addScaledVector(a, h);
            const sp = S.v.length();
            if (sp > 1e-4) S.v.multiplyScalar(Math.max(0, sp - (S.hitWall ? 0.12 : 0.04) * h) / sp);       // 很小的滚动阻力
            S.p.addScaledVector(S.v, h);
            // 撞到木框：反弹
            const lx = TW / 2 - R, lz = TD / 2 - R;
            if (Math.abs(S.p.x) > lx) { S.p.x = Math.sign(S.p.x) * lx; S.v.x *= -0.35; S.hitWall = true; }
            if (Math.abs(S.p.z) > lz) { S.p.z = Math.sign(S.p.z) * lz; S.v.z *= -0.35; S.hitWall = true; }     // 撞到木框以后就不再留频闪影子（只看撞框之前的那一段）
            // 碰到磁体：被吸住
            const dm = Math.hypot(magnet.position.x - S.p.x, magnet.position.z - S.p.z);
            S.maxV = Math.max(S.maxV, S.v.length());
            if (dm < 0.024) { S.stuck = true; S.v.set(0, 0, 0); }
            if (!S.dir0 && S.v.length() > 0.01) S.dir0 = S.v.clone().normalize();
            const vv = S.v.length();
            S.maxV = Math.max(S.maxV, vv);
            if (S.dir0 && vv > 0.01 && !S.stuck) S.maxTurn = Math.max(S.maxTurn, S.dir0.angleTo(S.v.clone().normalize()));
            pushTrail();
            S.gt = (S.gt || 0) + h;
            if (S.gt > 0.07 && ghosts.count < GH && !S.hitWall) { S.gt = 0; const m = new THREE.Matrix4().makeTranslation(S.p.x, TOP + R, S.p.z); ghosts.setMatrixAt(ghosts.count++, m); ghosts.instanceMatrix.needsUpdate = true; }
          }
          place();
          // 现象判断（只判断一次）
          if (S.fromRest && S.v.length() > 0.03 && !S.seen.has('start')) { S.seen.add('start'); W?.goal.done('start'); W?.status('磁体靠近，静止的小铁球<b>由静止开始运动</b>了——磁体没有碰到它，却对它施加了力。'); }
          if (S.launched && S.v0launch && !S.fromRest) {
            if (S.maxTurn > 0.45 && !S.saidTurn && !S.saidSpeed) { S.saidTurn = true; S.seen.add('turn'); W?.goal.done('turn'); W?.status('小铁球的<b>运动方向</b>偏向了磁体——力改变了它的运动方向。'); }
            else if (S.maxTurn < 0.25 && S.maxV > S.v0launch * 1.25 && !S.saidSpeed && !S.saidTurn) { S.saidSpeed = true; S.seen.add('speed'); W?.goal.done('speed'); W?.status('磁体在前方，小铁球<b>越滚越快</b>——力改变了它运动的快慢。'); }
          }
        }
        {
          const a = magnetAccel(ball.position, new THREE.Vector3());
          const show = S.mode !== 'ramp' && S.mode !== 'rolling-ramp' && !S.stuck && a.length() > 0.05;
          fArrow.visible = show; tF.loc(group, 0, -9, 0);
          if (show) { const L = Math.min(0.05, 0.008 + a.length() * 0.012); fArrow.set(new THREE.Vector3(ball.position.x, TOP + R, ball.position.z), a.clone().setLength(L)); tF.loc(group, ball.position.x + a.x / a.length() * (L + 0.01), TOP + R + 0.012, ball.position.z + a.z / a.length() * (L + 0.01)).text('<i>F</i>'); }
        }
        W?.out.set('v', (S.mode === 'rolling-ramp' ? S.v0 : S.v.length()) * 100, 1);
        W?.out.set('st', S.stuck ? '被磁体吸住，静止' : S.mode === 'rest' ? '静止' : S.mode === 'ramp' ? '在斜面顶上' : S.v.length() < 0.003 ? '停下来了' : '运动中');
      },
      debug: { S, magnet, release, resetBall },
    };
  },
};
