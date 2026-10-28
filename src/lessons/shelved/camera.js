// 图5.2-7 凸透镜成实像的情景 / 图5.2-8 成虚像的情景：照相机、投影仪、放大镜都是凸透镜，只是物体放的位置不同。
import * as THREE from 'three';
import { seg, slider, readout, goals, note } from './kit/ui.js';
import { candle } from './kit/props.js';
import { RayView, lensMesh } from './kit/optics.js';
import { lensRays, describeImage } from './kit/lensbench.js';
import { draggable, clamp } from './kit/interact.js';
import { paint, polyline, hull } from '../live/ink.js';

const F = 0.06, Y = 0.09, OBJ_H = 0.03;
const DEVICES = [
  { label: '照相机', u: 0.17, text: '物体离镜头比较远（<i>u</i> &gt; 2<i>f</i>），成<b>倒立、缩小的实像</b>，底片在镜头另一侧。' },
  { label: '投影仪', u: 0.085, text: '投影片离镜头比较近（<i>f</i> &lt; <i>u</i> &lt; 2<i>f</i>），成<b>倒立、放大的实像</b>，投在屏幕上。' },
  { label: '放大镜', u: 0.035, text: '物体在焦点以内（<i>u</i> &lt; <i>f</i>），透过透镜看到<b>正立、放大的虚像</b>，光屏接不到。' },
];

export default {
  id: 'camera',
  fig: '图5.2-7',
  title: '照相机、投影仪和放大镜',
  predict: {
    q: '照相机、投影仪、放大镜的镜头都是凸透镜。<br>为什么照相机拍出的像缩小了，投影仪投出的像却放大了？',
    hint: '课本第 118–120 页',
    options: ['因为镜头的焦距一定不一样', '因为物体到镜头的距离不同', '因为照相机里有平面镜'],
    answer: 1,
  },
  conclusion: {
    quote: '照相机和投影仪都成倒立的实像，所不同的是：物体通常离照相机的镜头比较远，成缩小的实像；投影片离投影仪的镜头比较近，成放大的实像。',
    why: '可见，像的虚实、大小、正倒与物体到凸透镜的距离（物距）有关系。实像是实际光线会聚成的，能用光屏承接；放大镜所成的正立、放大的像，是出射光线反向延长线的交点，光屏接不到，叫作<b>虚像</b>。',
    src: '课本第 118–122 页 · 第五章 第2节 生活中的透镜',
  },

  create({ tag }) {
    const group = new THREE.Group();
    const axis = polyline([new THREE.Vector3(-0.24, Y, 0), new THREE.Vector3(0.3, Y, 0)], { dashed: true, color: 0x6b7385, width: 1.2, dash: 0.01, gap: 0.006 });
    group.add(axis);
    const lens = lensMesh({ r: 0.045, thick: 0.014 });
    lens.position.set(0, Y, 0);
    group.add(lens);
    const post = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, Y - 0.045, 8), paint(0x9aa3b2)), 0.001);
    post.position.set(0, (Y - 0.045) / 2, 0);
    group.add(post);
    // F、2F 标记
    for (const [x, t] of [[-F, '<i>F</i>'], [F, '<i>F</i>'], [-2 * F, '2<i>F</i>'], [2 * F, '2<i>F</i>']]) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.0025, 10, 8), new THREE.MeshBasicMaterial({ color: 0x1d2433 }));
      d.position.set(x, Y, 0);
      group.add(d);
      const tg = tag(t, 'mag'); tg.el.style.color = '#1d2433'; tg.loc(group, x, Y - 0.012, 0);
    }
    // 物体：蜡烛
    const obj = candle({ height: OBJ_H - 0.012, r: 0.005 });
    obj.position.y = Y;
    group.add(obj);
    // 像：一样的蜡烛（实像倒立，虚像半透明）
    const img = candle({ height: OBJ_H - 0.012, r: 0.005 });
    img.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; } });
    group.add(img);
    // 光屏
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.12, 0.07), paint(0xfbfaf6, { unique: true, transparent: true, opacity: 0.85 }));
    group.add(screen);
    // 眼睛（看虚像时）
    const eye = new THREE.Group();
    const ball = hull(new THREE.Mesh(new THREE.SphereGeometry(0.009, 16, 12), paint(0xffffff)), 0.0012);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 12, 8), paint(0x22252e));
    pupil.position.x = -0.007;
    eye.add(ball, pupil);
    eye.position.set(0.2, Y, 0);
    group.add(eye);

    const rays = new RayView({ width: 2, glow: 6 });
    group.add(rays.group);
    const tObj = tag('物体', 'pill'), tImg = tag('', 'pill');
    const S = { u: 0.17, seen: new Set() };
    let G = null;

    const layout = () => {
      obj.position.x = -S.u;
      const r = lensRays({ u: S.u, h: OBJ_H, f: F, lensH: 0.045, span: 0.3 });
      const d = describeImage(S.u, F);
      const toW = (x, y) => new THREE.Vector3(x, y + Y, 0.001);
      rays.set(r.real.map((p) => ({ ...p, color: 0xff7a2a })), toW, r.virtual.map((p) => ({ ...p, color: 0xff9a5a })));
      const { x: vx, m } = r.image;
      const ok = Number.isFinite(vx) && Math.abs(vx) < 0.6;
      img.visible = ok;
      if (ok) {
        img.position.set(vx, Y, 0);
        img.scale.set(Math.abs(m), m, Math.abs(m));
        img.traverse((o) => { if (o.material) o.material.opacity = r.image.real ? 0.95 : 0.4; });
      }
      screen.visible = !!(ok && r.image.real && vx < 0.3);
      screen.position.set(Math.min(vx, 0.3) + 0.004, Y, 0);
      eye.visible = !r.image.real;
      tObj.loc(group, -S.u, Y + OBJ_H + 0.02, 0);
      tImg.loc(group, ok ? clamp(vx, -0.24, 0.3) : 0.2, Y + (ok ? Math.max(m * OBJ_H, 0) : 0) + 0.025, 0).text(d.text);
      const zone = S.u > 2 * F + 0.002 ? 0 : S.u > F + 0.002 ? 1 : S.u < F - 0.002 ? 2 : -1;
      if (G) {
        G.out.set('u', S.u * 100, 1);
        G.out.set('v', ok ? (vx > 0 ? vx * 100 : vx * 100) : NaN, 1);
        G.out.set('d', d.text);
        if (zone >= 0) { G.goal.done('z' + zone); G.status(`像${DEVICES[zone].label}一样：${DEVICES[zone].text}`); }
        else G.status('物体在 2<i>f</i> 或 <i>f</i> 处：' + d.text);
      }
    };
    layout();
    const pointer = draggable(group, [{ obj, plane: 'xy', onDrag: (p) => { S.u = clamp(-p.x, 0.02, 0.22); layout(); G?.sync(); } }]);

    return {
      group,
      size: { w: 0.56, d: 0.14, h: 0.2 },
      view: { elev: 10, azim: -8, lookY: 0.5, margin: 0.74 },
      pointer,
      mount(ui) {
        const out = readout([{ key: 'u', label: '物距 <i>u</i>', unit: 'cm' }, { key: 'v', label: '像距 <i>v</i>（负数表示虚像在物体一侧）', unit: 'cm' }, { key: 'd', label: '像的性质', span: true }]);
        const dev = seg('像谁一样用', DEVICES.map((d) => d.label), (_, k) => { S.u = DEVICES[k].u; layout(); G.sync(); });
        const us = slider('物距（也可以拖动蜡烛）', { min: 2, max: 22, step: 0.5, value: 17, fmt: (v) => `${v} cm（焦距 ${F * 100} cm）`, onInput: (v) => { S.u = v / 100; layout(); } });
        ui.controls.append(dev.el, us.el, out.el, note('橙色实线是实际的光线；虚像时，浅色虚线是出射光线的反向延长线。'));
        G = {
          out, status: (m) => ui.status(m),
          goal: goals(ui, [['z0', '把物体放在 2 倍焦距以外（照相机）'], ['z1', '放在 1 倍和 2 倍焦距之间（投影仪）'], ['z2', '放在焦点以内（放大镜）']]),
          sync: () => us.set(Math.round(S.u * 200) / 2),
        };
        layout();
      },
      update(dt, t) { obj.flame.update(t); img.flame.update(t); },
    };
  },
};
