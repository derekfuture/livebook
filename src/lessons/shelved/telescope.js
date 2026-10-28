// 图5.5-4 自制望远镜的结构：物镜（焦距约 20 cm）+ 目镜（焦距约 10 cm）。
// 观察很远的物体时，两块凸透镜间的距离约等于两个焦距之和；放大倍率 = 物镜焦距 ÷ 目镜焦距。
import * as THREE from 'three';
import { seg, slider, readout, goals, note, h } from './kit/ui.js';
import { OpticsScene, RayView, lensMesh } from './kit/optics.js';
import { clamp } from './kit/interact.js';
import { paint, inked, polyline } from '../live/ink.js';

const F1 = 0.2, Y = 0.08;
const EYEPIECES = [{ label: '目镜焦距 10 cm', f: 0.1 }, { label: '目镜焦距 5 cm', f: 0.05 }];
const ANGLE = 0.035;   // 远处物体（月亮边缘）射来的光与主光轴的夹角（放大了）

export default {
  id: 'telescope',
  fig: '图5.5-4',
  title: '制作望远镜',
  predict: {
    q: '用两块凸透镜做望远镜：物镜焦距 20 cm，目镜焦距 10 cm。<br>看很远的物体时，两块透镜之间应该相距多远？',
    hint: '课本第 131–132 页',
    options: ['10 cm', '20 cm', '约 30 cm（两个焦距之和）'],
    answer: 2,
  },
  conclusion: {
    quote: '观察最远处的物体时，两块凸透镜间的距离约等于两块凸透镜的焦距之和。',
    why: '物镜使远处的物体在焦点附近成实像，目镜相当于一个放大镜，用来把这个像放大。物镜成的像虽然比物体小，但它离眼睛很近，再加上目镜的放大作用，视角就变大了。这样的望远镜的放大倍率为<b>物镜的焦距与目镜的焦距之比</b>。',
    src: '课本第 130–133 页 · 第五章 第5节 跨学科实践：制作望远镜',
  },

  create({ tag }) {
    const group = new THREE.Group();
    group.position.x = -0.14;
    const root = new THREE.Group();
    root.add(group);
    // 镜筒（两段，可以伸缩）：画成半透明，里面的光路看得见
    const tubeMat = paint(0xc89b62, { unique: true, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 32, 1, true), tubeMat);
    outer.rotation.z = Math.PI / 2;
    outer.position.set(0.11, Y, 0);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.16, 32, 1, true), tubeMat.clone());
    inner.rotation.z = Math.PI / 2;
    group.add(outer, inner);
    for (const z of [-0.03, 0.03]) group.add(polyline([new THREE.Vector3(0, Y, z), new THREE.Vector3(0.22, Y, z)], { color: 0x8a6a40, width: 1.2 }));
    const obj = lensMesh({ r: 0.028, thick: 0.01 });
    obj.position.set(0, Y, 0);
    group.add(obj);
    let eyeLens = lensMesh({ r: 0.022, thick: 0.012 });
    group.add(eyeLens);
    const stand = inked(new THREE.Mesh(new THREE.BoxGeometry(0.04, Y - 0.03, 0.03), paint(0x4d5668)));
    stand.position.set(0.11, (Y - 0.03) / 2, 0);
    group.add(stand);
    const axis = polyline([new THREE.Vector3(-0.12, Y, 0), new THREE.Vector3(0.48, Y, 0)], { dashed: true, color: 0x6b7385, width: 1.1, dash: 0.01, gap: 0.006 });
    group.add(axis);
    const rays = new RayView({ width: 1.6, glow: 6 });
    group.add(rays.group);
    const tObj = tag('物镜', 'pill'), tEye = tag('目镜', 'pill'), tImg = tag('物镜所成的实像', 'pill');
    tObj.loc(group, 0, Y + 0.045, 0);
    const imgMark = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.016, 0.002), new THREE.MeshBasicMaterial({ color: 0xff6a3d }));
    group.add(imgMark);

    const S = { d: 0.22, ep: 0, tried: new Set() };
    let G = null;
    const sc = new OpticsScene();

    const layout = () => {
      const f2 = EYEPIECES[S.ep].f;
      eyeLens.position.set(S.d, Y, 0);
      inner.position.set(S.d - 0.07, Y, 0);
      sc.lenses.length = 0;
      sc.lenses.push({ x: 0, y: 0, h: 0.028, f: F1 }, { x: S.d, y: 0, h: 0.022, f: f2 });
      // 两组平行光：沿主光轴的、与主光轴成小角度的（来自远处物体的边缘）
      const paths = [];
      const exits = [];
      for (const [ang, col] of [[0, 0xffd34d], [ANGLE, 0xff7a2a]]) {
        const ex = [];
        for (const k of [-0.018, 0, 0.018]) {
          const o = { x: -0.12, y: k - Math.tan(ang) * 0.12 };
          const t = sc.trace(o, { x: 1, y: Math.tan(ang) }, { maxLen: 0.7 });
          paths.push({ pts: t.pts.map((p) => ({ x: Math.min(p.x, S.d + 0.2), y: clamp(p.y, -0.07, 0.07) })), color: col });
          ex.push(t.dir);
        }
        exits.push(ex);
      }
      rays.set(paths, (x, y) => new THREE.Vector3(x, y + Y, 0.001));
      // 出射光是否平行（同一组光的出射方向是否一致）→ 清晰程度
      const spread = Math.max(...exits.map((ex) => Math.max(...ex.map((d) => Math.atan2(d.y, d.x))) - Math.min(...ex.map((d) => Math.atan2(d.y, d.x)))));
      const blur = Math.min(22, spread * 260);
      const mag = F1 / f2;
      imgMark.position.set(F1, Y - Math.tan(ANGLE) * F1 / 2, 0);
      imgMark.scale.y = (Math.tan(ANGLE) * F1) / 0.016;
      tImg.loc(group, F1, Y - 0.03, 0.02);
      tEye.loc(group, S.d, Y + 0.04, 0);
      if (G) {
        G.out.set('d', S.d * 100, 1); G.out.set('sum', (F1 + f2) * 100, 0); G.out.set('m', `${mag.toFixed(0)} 倍`);
        // 望远镜里看到的月亮
        const c = G.view, g = c.getContext('2d'), W = c.width;
        g.fillStyle = '#0b1020'; g.fillRect(0, 0, W, W);
        g.save();
        g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 4, 0, Math.PI * 2); g.clip();
        g.filter = `blur(${blur.toFixed(1)}px)`;
        const r = 14 * mag;
        const gr = g.createRadialGradient(W / 2 - r * 0.3, W / 2 - r * 0.3, r * 0.1, W / 2, W / 2, r);
        gr.addColorStop(0, '#fffbe8'); gr.addColorStop(1, '#d8cfa8');
        g.fillStyle = gr; g.beginPath(); g.arc(W / 2, W / 2, r, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(150,140,110,.45)';
        for (const [x, y, s] of [[-0.3, -0.2, 0.18], [0.25, 0.1, 0.22], [-0.05, 0.35, 0.12], [0.35, -0.35, 0.1]]) { g.beginPath(); g.arc(W / 2 + x * r, W / 2 + y * r, s * r, 0, Math.PI * 2); g.fill(); }
        g.restore();
        g.fillStyle = '#9fb3d9'; g.font = '20px sans-serif'; g.fillText('望远镜里', 10, 26);
        G.c2.getContext('2d').drawImage(c, 0, 0);
        const sharp = blur < 1.5;
        G.status(sharp ? `看清楚了！两块透镜相距 ${(S.d * 100).toFixed(1)} cm，约等于两个焦距之和 ${((F1 + f2) * 100).toFixed(0)} cm。` : '像还是模糊的：伸缩镜筒，调节两块透镜之间的距离。');
        if (sharp) { S.tried.add(S.ep); G.goal.done('focus' + S.ep); }
      }
    };
    layout();

    return {
      group: root,
      size: { w: 0.62, d: 0.14, h: 0.16 },
      view: { elev: 12, azim: -16, lookY: 0.5, margin: 0.74 },
      mount(ui) {
        const out = readout([{ key: 'd', label: '两块透镜的距离', unit: 'cm' }, { key: 'sum', label: '两个焦距之和', unit: 'cm' }, { key: 'm', label: '放大倍率（物镜焦距 ÷ 目镜焦距）', span: true }]);
        const ds = slider('伸缩镜筒', { min: 18, max: 38, step: 0.2, value: 22, fmt: (v) => `${v.toFixed(1)} cm`, onInput: (v) => { S.d = v / 100; layout(); } });
        const ep = seg('换目镜', EYEPIECES.map((e) => e.label), (_, k) => { S.ep = k; layout(); });
        const view = h('canvas', { width: 220, height: 220 });
        const c2 = h('canvas', { width: 220, height: 220, style: 'width:130px;height:130px;display:block;margin:6px auto;border-radius:50%' });
        ui.controls.append(ds.el, ep.el, out.el, h('div', { class: 'ctl-label' }, '眼睛从目镜看到的月亮'), c2, note('黄色：沿主光轴射来的光；橙色：从月亮边缘斜着射来的光。出射光平行时，看到的像最清晰。'));
        G = { out, view, c2, status: (m) => ui.status(m), goal: goals(ui, [['focus0', '用焦距 10 cm 的目镜调清楚'], ['focus1', '换焦距 5 cm 的目镜再调清楚，比一比放大倍率']]) };
        layout();
      },
    };
  },
};
