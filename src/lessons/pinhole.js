// 图4.1-6 / 4.1-7 小孔成像：空罐底部中央打一个小孔，罐口蒙一层半透明薄膜。小孔对着烛焰，薄膜上出现倒立的烛焰像。
// 罐子按图4.1-7 画成“剖开”的：靠近我们的半边罐壁只留轮廓，能看见光从烛焰经过小孔落到薄膜上。
// 像高 / 物高 = 罐长 / 烛焰到小孔的距离；孔大时每个点变成一个光斑，像就糊了。
import * as THREE from 'three';
import { seg, slider, readout, goals, note, buttons, table } from './kit/ui.js';
import { candle, canvasTex } from './kit/props.js';
import { RayView, drawFlame } from './kit/optics.js';
import { draggable, clamp } from './kit/interact.js';
import { paint, inked, polyline } from '../live/ink.js';

const R = 0.045, L = 0.15;          // 罐子半径、长度（小孔在 x = 0，薄膜在 x = L）
const AXIS = 0.085;                  // 罐子轴线的高度 = 烛焰中部的高度
const FLAME_TOP = 0.022, FLAME_BOT = -0.008;   // 烛焰上下沿（相对轴线）
const HOLES = [{ label: '针尖那么小', r: 0.0008 }, { label: '黄豆那么大', r: 0.0035 }, { label: '手指那么粗', r: 0.008 }];

export default {
  id: 'pinhole',
  fig: '图4.1-6',
  title: '小孔成像',
  stampText: '观察',
  predict: {
    q: '空罐底部打一个小孔，罐口蒙上半透明的薄膜，把小孔对着烛焰。<br>薄膜上会看到什么？',
    hint: '课本第 90 页「想想做做」',
    options: ['正立的烛焰', '倒立的烛焰', '一个和小孔一样形状的光斑'],
    answer: 1,
  },
  conclusion: {
    page: 95, rect: [60, 596, 470, 662],      // 课本第 89 页：“……光在同种均匀介质中沿直线传播。”
    quote: '光在同种均匀介质中沿直线传播。',
    why: '烛焰上部发出的光沿直线穿过小孔，落到薄膜的下部；下部发出的光落到上部——所以薄膜上的像是<b>倒立</b>的。烛焰离小孔越近，像越大；越远，像越小。小孔要足够小，像才清楚；孔开大了，像就模糊成一团光。',
    src: '课本第 89–90 页 · 第四章 第1节 光的直线传播',
  },

  create({ tag, look, back: goBack }) {
    const group = new THREE.Group();

    // ---- 罐子：后半边是实的罐壁，前半边剖开（只留轮廓） ----
    const can = new THREE.Group();
    can.position.set(0, AXIS, 0);
    group.add(can);
    const wallGeo = (start) => { const g = new THREE.CylinderGeometry(R, R, L, 48, 1, true, start, Math.PI); g.rotateZ(Math.PI / 2); g.translate(L / 2, 0, 0); return g; };
    const back = inked(new THREE.Mesh(wallGeo(Math.PI), paint(0xd9dde2, { side: THREE.DoubleSide })), { width: 1.2 });
    const front = new THREE.Mesh(wallGeo(0), paint(0xdfe7ee, { transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }));
    front.renderOrder = 6;
    can.add(back, front);
    // 罐底（带小孔）
    const bottomTex = canvasTex(256, 256, () => {});
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(R, 48), new THREE.MeshLambertMaterial({ map: bottomTex, side: THREE.DoubleSide }));
    bottom.rotation.y = -Math.PI / 2;
    can.add(bottom);
    // 罐口的薄膜（像画在上面，两面都看得见）
    const filmTex = canvasTex(512, 512, () => {});
    const film = new THREE.Mesh(new THREE.CircleGeometry(R * 0.98, 48), new THREE.MeshBasicMaterial({ map: filmTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    film.userData.noInk = true;
    film.rotation.y = Math.PI / 2;
    film.position.x = L;
    film.renderOrder = 8;
    can.add(film);
    // 轮廓：两端的圆口（小孔那端画虚线，像课本图4.1-7）、上下两条边
    const ring = (x, dashed) => polyline(Array.from({ length: 49 }, (_, i) => { const a = (i / 48) * Math.PI * 2; return new THREE.Vector3(x, Math.sin(a) * R, Math.cos(a) * R); }), { width: 1.6, dashed, dash: 0.004, gap: 0.003 });
    can.add(ring(0, true), ring(L, false));
    for (const y of [R, -R]) can.add(polyline([new THREE.Vector3(0, y, 0), new THREE.Vector3(L, y, 0)], { width: 1.6 }));
    // 橡皮筋
    const band = new THREE.Mesh(new THREE.TorusGeometry(R + 0.0015, 0.0016, 8, 48), paint(0xc0533a, { keep: true }));
    band.rotation.y = Math.PI / 2;
    band.position.x = L - 0.008;
    can.add(band);
    // 两个小木托
    for (const x of [0.03, L - 0.03]) {
      const v = inked(new THREE.Mesh(new THREE.BoxGeometry(0.018, AXIS - R + 0.006, 0.05), paint(0xc9a878)), { width: 1.1 });
      v.position.set(x, (AXIS - R + 0.006) / 2, 0);
      group.add(v);
    }

    // ---- 蜡烛 ----
    const cdl = candle({ height: AXIS - 0.014, r: 0.008 });
    const holder = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.021, 0.006, 24), paint(0x9c7a4a)), { width: 1.1 });
    holder.position.y = 0.003;
    cdl.add(holder);
    group.add(cdl);

    // ---- 光线：从烛焰上端、下端出发，穿过小孔，落到薄膜上 ----
    const rays = new RayView({ width: 1.8, glow: 7 });
    rays.group.traverse((o) => { o.renderOrder = 4; });     // 先画光线，薄膜盖在上面
    group.add(rays.group);

    const tU = tag('', 'pill'), tImg = tag('', 'pill'), tHole = tag('小孔', 'pill');
    const S = { u: 0.12, hole: 0, mMax: 0, mMin: 9, lean: 0, blowT: 0, pred: true };
    let G = null;

    const drawBottom = () => {
      const g = bottomTex.canvas.getContext('2d'), W = 256;
      g.fillStyle = '#c9cfd6'; g.fillRect(0, 0, W, W);
      g.strokeStyle = 'rgba(80,90,100,.35)'; g.lineWidth = 2;
      for (let r = 30; r < 128; r += 22) { g.beginPath(); g.arc(W / 2, W / 2, r, 0, Math.PI * 2); g.stroke(); }
      g.fillStyle = '#15161b';
      g.beginPath(); g.arc(W / 2, W / 2, Math.max(2, (HOLES[S.hole].r / R) * 128), 0, Math.PI * 2); g.fill();
      bottomTex.needsUpdate = true;
    };

    const layout = () => {
      cdl.position.set(-S.u, 0, 0);
      const m = L / S.u;                         // 像是烛焰的几倍
      const hr = HOLES[S.hole].r;
      const paths = [];
      for (const [fy, col] of [[FLAME_TOP, 0xffb020], [FLAME_BOT, 0xff7a2a]]) {
        const src = { x: -S.u, y: AXIS + fy };
        for (const o of hr > 0.002 ? [-hr, hr] : [0]) paths.push({ pts: S.pred ? [src, { x: 0, y: AXIS + o }] : [src, { x: 0, y: AXIS + o }, { x: L, y: AXIS + o - (fy - o) * m }], color: col });
      }
      rays.set(paths, (x, y) => new THREE.Vector3(x, y, 0.0005));
      layoutFilm();
      labels(m, hr);
    };
    // 薄膜上的像：倒立，大小 ∝ m，亮度 ∝ 1/m²，孔越大越糊
    const layoutFilm = () => {
      const m = L / S.u, hr = HOLES[S.hole].r;
      const g = filmTex.canvas.getContext('2d'), W = 512, px = W / (2 * R);
      g.clearRect(0, 0, W, W);
      g.save(); g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 2, 0, Math.PI * 2); g.clip();
      // 罐子里光线暗，薄膜是灰暗的，像才显得亮
      if (S.pred) { g.fillStyle = 'rgba(220,214,200,.75)'; g.fillRect(0, 0, W, W); g.restore(); filmTex.needsUpdate = true; return; }   // 预测时：薄膜上先什么都不显示
      const fg = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); fg.addColorStop(0, 'rgba(92,86,78,.9)'); fg.addColorStop(1, 'rgba(60,56,52,.92)'); g.fillStyle = fg; g.fillRect(0, 0, W, W);
      const size = (FLAME_TOP - FLAME_BOT) * m * px;
      const blurPx = hr * (1 + m) * px * 0.6;
      const bright = Math.min(1, 1.6 / Math.max(0.6, m * 0.8));
      // 倒立：像是烛焰绕小孔转了 180°。烛焰底部（在轴线下方）成像在轴线上方，烛焰尖成像在下方；
      // 烛焰往一边歪，像就往另一边歪。（薄膜上从外面看，水平方向和真实的左右正好对应好了，见注释）
      const baseY = W / 2 + FLAME_BOT * m * px;
      const lean = S.lean;                      // 真实烛焰向 +z 歪的角度
      drawFlame(g, W / 2, baseY, size, { invert: true, rot: -lean, blur: Math.max(0.6, blurPx), alpha: bright, wick: true });
      if (hr > 0.004) { const gr = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W * 0.45); gr.addColorStop(0, `rgba(255,190,90,${0.35 * bright})`); gr.addColorStop(1, 'rgba(255,190,90,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, W); }
      g.restore();
      filmTex.needsUpdate = true;
    };
    const labels = (m, hr) => {
      tU.loc(group, -S.u / 2, 0.01, 0.06).text(`烛焰到小孔 ${(S.u * 100).toFixed(0)} cm`);
      tHole.loc(group, 0, AXIS + R + 0.015, 0);
      // 正倒要学生自己看出来：自己记下“倒立”之前，标签和提示只说大小
      const inv = S.saw ? '倒立、' : '';
      const word = m > 1.15 ? `${inv}放大` : m < 0.87 ? `${inv}缩小` : `${inv}和烛焰差不多大`;
      tImg.loc(group, L + 0.01, AXIS + R + 0.02, 0).text(hr > 0.004 ? '一团模糊的光' : `薄膜上：${word}的像`);
      S.mMax = Math.max(S.mMax, m); S.mMin = Math.min(S.mMin, m);
      if (!G) return;
      G.out.set('u', S.u * 100, 0); G.out.set('m', `${m.toFixed(1)} 倍`);
      if (S.mMax > 1.6) G.goal.done('big');
      if (S.mMin < 0.75) G.goal.done('small');
      if (S.hole === 2) G.goal.done('blur');
      G.status(hr > 0.004 ? '孔开大了：烛焰上每一点都在薄膜上变成一个光斑，许多光斑叠在一起，像就模糊了。' : m > 1.15 ? `烛焰离小孔近，薄膜上的像比烛焰还大${S.saw ? '，而且是倒立的' : ''}。` : m < 0.87 ? `烛焰离小孔远，像变小了${S.saw ? '，还是倒立的' : ''}。` : '');
    };

    drawBottom();
    layout();
    const pointer = draggable(group, [{ obj: cdl, plane: 'xy', onDrag: (p) => { S.u = clamp(-p.x, 0.05, 0.32); layout(); G?.sync(); } }]);

    return {
      group,
      size: { w: 0.5, d: 0.14, h: 0.16 },
      view: { elev: 15, azim: 50, lookY: 0.55, lookZ: 0, margin: 1.0 },
      pointer,
      mount(ui) {
        const out = readout([{ key: 'u', label: '烛焰到小孔的距离', unit: 'cm' }, { key: 'm', label: '像是烛焰的' }]);
        const su = slider('移动蜡烛（也可以直接拖蜡烛）', { min: 5, max: 32, value: 12, fmt: (v) => `${v} cm`, onInput: (v) => { S.u = v / 100; layout(); } });
        const hole = seg('小孔有多大', HOLES.map((x) => x.label), (_, k) => { S.hole = k; drawBottom(); layout(); });
        let close = false;
        const setClose = (on) => { close = on; rays.group.visible = !on; for (const t of [tU, tImg, tHole]) t.show(!on); peek.btns[0].textContent = on ? '↩ 回到整个实验' : '凑近看薄膜'; };
        const peek = buttons([{ text: '凑近看薄膜', ghost: true, onClick: () => {
          if (!close) {
            setClose(true);
            look([L * 0.45, AXIS + 0.01, 0], [0.62, 0.12, 0.78], 0.42, () => { setClose(false); goBack(); });
            G.goal.done('look');
            ui.status(S.saw ? '凑近看：真实的烛焰尖朝<b>上</b>、蓝色的焰心和灯芯在下面；薄膜上的烛焰尖朝<b>下</b>，灯芯反而在上面——像是<b>倒立</b>的。再“吹一口气”看看。' : '凑近看：真实的烛焰尖朝<b>上</b>，蓝色的焰心和灯芯在下面。薄膜上的烛焰呢？尖朝哪边，灯芯在哪边？看清了就记下来。');
          } else { setClose(false); goBack(); }
        } }]);
        const blow = buttons([{ text: '吹一口气', ghost: true, onClick: () => {
          S.blowT = 2.2; G.goal.done('blow');
          ui.status('烛焰被吹得歪向一边，薄膜上的像却歪向<b>另一边</b>，而且上下颠倒——像相当于烛焰绕小孔转了半圈。');
        } }]);
        // 观察记录：学生自己判断“正倒”，程序只填测得的距离和倍数
        const tb = table(['烛焰到小孔/cm', '像是烛焰的', '正立还是倒立', '清楚吗'], { note: '每记一次，先自己判断像是正立还是倒立。' });
        const rows = [];
        const rec = (upright) => {
          const m = L / S.u, hr = HOLES[S.hole].r;
          const key = `${Math.round(S.u * 100)}|${S.hole}`;
          if (rows.includes(key)) return ui.status('这一组已经记过了。挪一挪蜡烛，或换一个小孔。');
          const right = upright === false;
          if (!right) return ui.status('再凑近看看薄膜：烛焰尖朝哪边？灯芯在哪边？');
          rows.push(key);
          S.saw = true; layout();
          tb.add([Math.round(S.u * 100), `${m.toFixed(1)} 倍`, '倒立', hr > 0.004 ? '模糊' : '清楚']);
          if (rows.length >= 3) G.goal.done('rec');
          ui.status(`记下了第 ${rows.length} 组。${rows.length < 3 ? '换个距离（或换个孔）再记一组。' : ''}`);
        };
        const recBtns = buttons([{ text: '记下：像是正立的', ghost: true, onClick: () => rec(true) }, { text: '记下：像是倒立的', ghost: true, onClick: () => rec(false) }]);
        ui.controls.append(su.el, hole.el, peek.el, blow.el, out.el, recBtns.el, note(`罐子长 ${L * 100} cm：像高 ÷ 烛焰高 = 罐长 ÷ 烛焰到小孔的距离。`));
        ui.data.append(tb.el);
        G = { out, status: (m) => m && ui.status(m), goal: goals(ui, [['look', '凑近看看薄膜上的像是正还是倒'], ['rec', '换不同的距离或小孔，记 3 组观察'], ['blow', '吹一口气，看烛焰和像各往哪边歪'], ['big', '把蜡烛移近，让像比烛焰大'], ['small', '把蜡烛移远，让像比烛焰小'], ['blur', '把小孔开到“手指那么粗”']]), sync: () => su.set(Math.round(S.u * 100)) };
        ui.status('薄膜上的烛焰是正立还是倒立的？');
        layout();
      },
      predicting(on) { S.pred = on; layout(); },
      update(dt, t) {
        cdl.flame.update(t);
        // 烛焰自己轻轻摇；“吹一口气”时明显歪向一边，再晃回来
        S.blowT = Math.max(0, S.blowT - dt);
        const blow = S.blowT > 0 ? Math.sin((1 - S.blowT / 2.2) * Math.PI) * 0.55 * Math.exp(-(2.2 - S.blowT) * 0.4) : 0;
        S.lean = blow + Math.sin(t * 3.1) * 0.05 + Math.sin(t * 7.3) * 0.025;
        cdl.flame.rotation.x = S.lean;
        layoutFilm();
      },
    };
  },
};
