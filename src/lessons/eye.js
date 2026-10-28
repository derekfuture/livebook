// 图5.4-2 / 5.4-3 / 5.4-4 眼睛的调节、近视眼和远视眼及其矫正。
// 把眼睛简化成“一个焦距可变的凸透镜（晶状体+角膜）+ 视网膜”。睫状体收缩 → 晶状体变厚 → 焦距变短。
import * as THREE from 'three';
import { seg, goals, note, h } from './kit/ui.js';
import { OpticsScene, RayView, lensMesh } from './kit/optics.js';
import { canvasTex } from './kit/props.js';
import { clamp, draggable } from './kit/interact.js';
import { paint, polyline } from '../live/ink.js';

const Y = 0.09;
const EYE_R = 0.06;                     // 眼球半径（放大了的模型）
const LENS_X = 0, RETINA = { normal: 0.1, myopia: 0.118, hyperopia: 0.086 };
const NEAR = 0.12, FAR = 1.2;           // 模型里的“近处”和“远处”（远处的光近似平行）

export default {
  id: 'eye',
  fig: '图5.4-3',
  title: '近视眼及其矫正',
  predict: {
    q: '近视眼看不清远处的物体。<br>要矫正近视，应该戴什么样的眼镜？',
    hint: '课本第 126–127 页',
    options: ['凸透镜（中间厚、边缘薄）', '凹透镜（中间薄、边缘厚）', '平板玻璃'],
    answer: 1,
  },
  conclusion: {
    quote: '形成近视眼的原因是晶状体太厚，折光能力太强，或者眼球在前后方向上太长，因此来自远处某点的光会聚在视网膜前，到达视网膜时已经不是一点而是一个模糊的光斑了。',
    why: '利用凹透镜能使光发散的特点，在眼睛前面放一个合适的<b>凹透镜</b>，就能使来自远处物体的光会聚在视网膜上。远视眼正好相反：来自近处某点的光还没有会聚成一点就到达视网膜了，要戴<b>凸透镜</b>矫正。正常的眼睛靠睫状体改变晶状体的形状：看远处时晶状体比较薄，看近处时晶状体变厚。',
    src: '课本第 126–128 页 · 第五章 第4节 眼睛和眼镜',
  },

  create({ tag }) {
    const group = new THREE.Group();

    // 眼球剖面：外轮廓 + 视网膜（红色弧）+ 晶状体
    const eyeG = new THREE.Group();
    eyeG.position.set(0, Y, 0);
    group.add(eyeG);
    const back = new THREE.Mesh(new THREE.CircleGeometry(EYE_R, 64), new THREE.MeshBasicMaterial({ color: 0xfdf3ec }));
    back.position.z = -0.006;
    eyeG.add(back);
    let outline = null, retinaLine = null;
    const lensHolder = new THREE.Group();
    eyeG.add(lensHolder);
    const cornea = polyline(Array.from({ length: 21 }, (_, i) => { const a = Math.PI * (0.78 + 0.44 * (i / 20)); return new THREE.Vector3(Math.cos(a) * 0.03 + 0.012, Math.sin(a) * 0.03, 0); }), { color: 0x5d7f95, width: 1.6 });
    eyeG.add(cornea);
    const iris = new THREE.Group();
    for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.018, 0.02), paint(0x6a4a3a)); m.position.set(0.004, s * 0.028, 0); iris.add(m); }
    eyeG.add(iris);
    const muscle = [];
    for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.01, 0.01), paint(0xd98b7a)); m.position.set(0.012, s * 0.042, 0); eyeG.add(m); muscle.push(m); }

    // 远处/近处的物体（一个小光点）
    const star = new THREE.Mesh(new THREE.SphereGeometry(0.004, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffb020 }));
    group.add(star);
    // 眼镜
    const glasses = new THREE.Group();
    glasses.position.set(0.055, Y, 0);
    group.add(glasses);
    // 视网膜上的“看到的样子”
    const viewTex = canvasTex(256, 256, () => {});

    const rays = new RayView({ width: 1.8, glow: 6 });
    group.add(rays.group);
    const tRet = tag('视网膜', 'pill'), tLens = tag('晶状体', 'pill'), tObj = tag('', 'pill'), tGl = tag('', 'pill');

    const S = { eye: 'normal', near: false, accommodate: 0, accT: 0, glasses: 0, seen: new Set(), drag: null, dragPos: new THREE.Vector3() };
    // 桌上的两副“眼镜片”：拖到眼睛前面就戴上，拖开就摘下
    const tray = [1, 2].map((k) => { const g = new THREE.Group(); g.add(lensMesh({ r: 0.022, convex: k === 2, thick: 0.01, color: 0xcfe8f5 })); g.userData.home = new THREE.Vector3(k === 1 ? -0.2 : -0.14, Y - 0.07, 0); g.position.copy(g.userData.home); group.add(g); return g; });
    tag('凹透镜', 'pill').loc(group, -0.2, Y - 0.1, 0); tag('凸透镜', 'pill').loc(group, -0.14, Y - 0.1, 0);
    let G = null;
    const sc = new OpticsScene();

    // 晶状体焦距：放松 = 看远处，收缩 = 看近处。用“折光本领”线性变化
    const lensF = () => {
      const fFar = RETINA.normal;                        // 放松时正好把平行光会聚在正常视网膜上
      const fNear = (NEAR * RETINA.normal) / (NEAR + RETINA.normal);
      const P = 1 / fFar + (1 / fNear - 1 / fFar) * S.accommodate;
      return 1 / P;
    };

    const buildEye = () => {
      const ret = RETINA[S.eye];
      if (outline) eyeG.remove(outline);
      if (retinaLine) eyeG.remove(retinaLine);
      const pts = [];
      // 眼球前后方向的长度随“近视/远视”变
      const a = (ret + 0.012) / 2, cx = ret - a + 0.006;
      for (let i = 0; i <= 64; i++) { const t = (i / 64) * Math.PI * 2; pts.push(new THREE.Vector3(cx + Math.cos(t) * a, Math.sin(t) * EYE_R, 0)); }
      outline = polyline(pts, { color: 0x8a5a4a, width: 2 });
      eyeG.add(outline);
      const rp = [];
      for (let i = 0; i <= 24; i++) { const t = -0.9 + (1.8 * i) / 24; rp.push(new THREE.Vector3(cx + Math.cos(t) * a, Math.sin(t) * EYE_R, 0.001)); }
      retinaLine = polyline(rp, { color: 0xd23b2b, width: 3.5 });
      eyeG.add(retinaLine);
      back.scale.set(a / EYE_R, 1, 1);
      back.position.x = cx;
      tRet.loc(eyeG, cx + a + 0.012, -0.03, 0);
    };

    const layout = () => {
      buildEye();
      const f = lensF();
      // 晶状体模型：越厚折光越强
      lensHolder.clear();
      const thick = 0.012 + (0.1 / f - 1) * 0.03;
      const lm = lensMesh({ r: 0.022, thick: clamp(thick, 0.01, 0.03), color: 0xd6ecf5 });
      lensHolder.add(lm);
      lensHolder.position.x = 0.002;
      muscle.forEach((m) => m.scale.setScalar(1 + S.accommodate * 0.6));
      // 物体
      const dist = S.near ? NEAR : FAR;
      const objX = LENS_X - dist;
      star.position.set(Math.max(objX, -0.3), Y + (S.near ? 0.012 : 0), 0);
      star.visible = true;
      if (S.drag === 'star') star.position.copy(S.dragPos);
      tObj.loc(group, S.near ? objX : -0.28, Y + 0.035, 0).text(S.near ? '近处的物体' : '← 来自远处物体的光（几乎平行）');
      // 光线
      sc.lenses.length = 0;
      const gl = [0, -0.6, 0.6][S.glasses];         // 眼镜的折光本领（模型里放大了）
      if (gl) sc.lenses.push({ x: -0.055, y: 0, h: 0.03, f: 1 / (gl * 10) });
      sc.lenses.push({ x: LENS_X, y: 0, h: 0.022, f });
      const ret = RETINA[S.eye];
      sc.screens.length = 0;
      sc.screens.push({ a: { x: ret + 0.0, y: -1 }, b: { x: ret, y: 1 }, id: 'R' });
      const paths = [], hitsY = [];
      for (const k of [-1, -0.5, 0, 0.5, 1]) {
        let o, d;
        if (S.near) { o = { x: objX, y: 0.012 }; d = { x: dist, y: k * 0.017 - 0.012 }; }
        else { o = { x: -0.28, y: k * 0.016 }; d = { x: 1, y: -0.0 }; }
        const t = sc.trace(o, d, { maxLen: 0.6 });
        paths.push({ pts: t.pts, color: 0xff8a2a });
        const hit = t.hits.find((x) => x.kind === 'screen');
        if (hit) hitsY.push(hit.p.y);
      }
      rays.set(paths, (x, y) => new THREE.Vector3(x, y + Y, 0.002));
      const spread = hitsY.length ? Math.max(...hitsY) - Math.min(...hitsY) : 1;
      const sharp = spread < 0.0018;
      // 眼镜模型
      glasses.clear();
      tray.forEach((t, i) => { if (S.drag === t) t.position.copy(S.dragPos); else if (S.glasses === i + 1) t.position.set(-0.055, Y, 0); else t.position.copy(t.userData.home); });
      tGl.loc(group, -0.055, Y + 0.05, 0).text(S.glasses === 1 ? '凹透镜' : S.glasses === 2 ? '凸透镜' : '').show(!!S.glasses);
      tLens.loc(eyeG, 0.0, 0.03, 0);
      // 看到的样子
      const g = viewTex.canvas.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256);
      g.filter = `blur(${Math.min(14, spread * 2500).toFixed(1)}px)`;
      g.fillStyle = '#1d2433'; g.font = 'bold 120px "Times New Roman", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('E', 128, 132);
      g.filter = 'none';
      viewTex.needsUpdate = true;
      if (G) {
        G.view.getContext('2d').drawImage(viewTex.canvas, 0, 0, 120, 120);
        const key = `${S.eye}-${S.near ? 'near' : 'far'}-${S.glasses}`;
        if (sharp) {
          if (S.eye === 'normal' && S.near) G.goal.done('near');
          if (S.eye === 'myopia' && !S.near && S.glasses === 1) G.goal.done('myopia');
          if (S.eye === 'hyperopia' && S.near && S.glasses === 2) G.goal.done('hyper');
        }
        if (!sharp && S.accT === 0 && ((S.eye === 'myopia' && S.glasses === 2) || (S.eye === 'hyperopia' && S.glasses === 1))) G.goal.done('wrong');
        // 为什么模糊
        if (!sharp) {
          const conv = convergePoint(paths);
          if (S.accT === 0) G.status(conv == null ? `看不清：光没有会聚在视网膜上。${S.glasses ? '' : '试试从桌上拖一片眼镜片到眼睛前面。'}` : `${S.eye === 'normal' ? '' : '晶状体已经尽力调节了，还是看不清：'}光会聚在<b>视网膜${conv < ret - 0.002 ? '前' : '后'}</b>，到达视网膜时是一个模糊的光斑。${S.glasses ? '' : '试试从桌上拖一片眼镜片到眼睛前面。'}`);
        } else if (S.accT === 0) G.status(`光会聚在视网膜上，看得清楚。${S.eye === 'normal' ? (S.near ? '看近处时，睫状体收缩，晶状体<b>变厚</b>了。' : '看远处时，睫状体放松，晶状体比较<b>薄</b>。') : ''}`);
        void key;
      }
    };

    function convergePoint(paths) {
      // 取经过晶状体后的两条边缘光线，求交点 x
      const seg = (p) => { const n = p.pts.length; return [p.pts[n - 3] || p.pts[0], p.pts[n - 2] || p.pts[1]]; };
      const [a1, a2] = seg(paths[0]), [b1, b2] = seg(paths[4]);
      const d1 = { x: a2.x - a1.x, y: a2.y - a1.y }, d2 = { x: b2.x - b1.x, y: b2.y - b1.y };
      const den = d1.x * d2.y - d1.y * d2.x;
      if (Math.abs(den) < 1e-12) return null;
      const t = ((b1.x - a1.x) * d2.y - (b1.y - a1.y) * d2.x) / den;
      return a1.x + d1.x * t;
    }

    // 眼睛会自己调节：在睫状体能调节的范围里找最清楚的晶状体厚度（像真实的眼睛一样，不用手去调）
    const blurAt = (a) => { const old = S.accommodate; S.accommodate = a; const f = lensF(); S.accommodate = old;
      const lenses = []; const gl = [0, -0.6, 0.6][S.glasses]; if (gl) lenses.push({ x: -0.055, y: 0, h: 0.03, f: 1 / (gl * 10) }); lenses.push({ x: LENS_X, y: 0, h: 0.022, f });
      const sc2 = new OpticsScene(); sc2.lenses.push(...lenses); const ret = RETINA[S.eye]; sc2.screens.push({ a: { x: ret, y: -1 }, b: { x: ret, y: 1 }, id: 'R' });
      const ys = [];
      for (const k of [-1, 1]) { const o = S.near ? { x: LENS_X - NEAR, y: 0.012 } : { x: -0.28, y: k * 0.016 }; const d = S.near ? { x: NEAR, y: k * 0.017 - 0.012 } : { x: 1, y: 0 }; const t = sc2.trace(o, d, { maxLen: 0.6 }); const h = t.hits.find((x) => x.kind === 'screen'); if (h) ys.push(h.p.y); }
      return ys.length === 2 ? Math.abs(ys[0] - ys[1]) : 1; };
    const retarget = () => { let best = 0, bv = 9; for (let i = 0; i <= 40; i++) { const a = i / 40, v = blurAt(a); if (v < bv - 1e-6) { bv = v; best = a; } } S.accTarget = best; S.accT = 1; };
    layout();
    retarget();

    const pointer = draggable(group, [
      { obj: star, plane: 'xy', offset: 0, hint: '左右拖：把物体放近、放远', onStart: () => { S.drag = 'star'; S.dragPos.copy(star.position); }, onDrag: (p) => S.dragPos.set(clamp(p.x, -0.3, -0.08), Y + 0.006, 0), onEnd: () => { S.drag = null; S.near = S.dragPos.x > -0.2; G?.syncObj?.(); retarget(); } },
      ...tray.map((t, i) => ({ obj: t, plane: 'xy', offset: 0, hint: () => (S.glasses === i + 1 ? '拖开：摘下眼镜' : '拖到眼睛前面：戴上'), onStart: () => { if (S.glasses === i + 1) S.glasses = 0; S.drag = t; S.dragPos.copy(t.position); }, onDrag: (p) => S.dragPos.set(p.x, p.y, 0), onEnd: () => { S.drag = null; if (Math.hypot(S.dragPos.x + 0.055, S.dragPos.y - Y) < 0.04) S.glasses = i + 1; G?.syncGl?.(); retarget(); } })),
    ], { tip: tag('', 'pill') });

    return {
      pointer,
      group,
      size: { w: 0.46, d: 0.14, h: 0.18 },
      view: { elev: 8, azim: -6, lookY: 0.5, margin: 0.72 },
      mount(ui) {
        const eyeSel = seg('眼睛', ['正常的眼睛', '近视眼', '远视眼'], (_, k) => { S.eye = ['normal', 'myopia', 'hyperopia'][k]; retarget(); });
        const objSel = seg('看什么', ['看远处', '看近处'], (_, k) => { S.near = k === 1; retarget(); });
        const gl = seg('戴眼镜', ['不戴', '凹透镜', '凸透镜'], (_, k) => { S.glasses = k; retarget(); });
        const view = h('canvas', { width: 120, height: 120, style: 'width:80px;height:80px;border-radius:50%;border:2px solid #e6dcc8;display:block;margin:4px auto 8px' });
        ui.controls.append(note('<b>拖远处的光点</b>放近、放远（眼睛会自己调节晶状体）；<b>把桌上的镜片拖到眼睛前面</b>就戴上，拖开就摘下。'), eyeSel.el, objSel.el, gl.el, h('div', { class: 'ctl-label' }, '眼睛看到的'), view, note('近视眼、远视眼的晶状体调节能力有限：调到头也看不清时，就要戴眼镜。'));
        G = {
          view, status: (m) => ui.status(m), syncObj: () => objSel.set(S.near ? 1 : 0), syncGl: () => gl.set(S.glasses),
          goal: goals(ui, [['near', '正常的眼睛：看近处，看晶状体怎样变化'], ['myopia', '近视眼：选一片眼镜，看清远处'], ['hyper', '远视眼：选一片眼镜，看清近处'], ['wrong', '试试戴错的镜片会怎样']]),
        };
        // 近视/远视眼的调节范围有限
        layout();
      },
      update(dt) {
        // 晶状体慢慢调到最清楚的厚度（拖着东西时也跟着画）
        if (S.accT > 0) { S.accommodate += (S.accTarget - S.accommodate) * Math.min(1, dt * 4); if (Math.abs(S.accTarget - S.accommodate) < 0.004) { S.accommodate = S.accTarget; S.accT = 0; } layout(); }
        else if (S.drag) layout();
      },
    };
  },
};
