// 图4.5-2 光的色散 + 图4.5-3 色光的三原色。
// 白光（七种色光代表）经三棱镜两次折射，玻璃对紫光的折射率最大、偏折最多，于是在白屏上排成彩带。
import * as THREE from 'three';
import { seg, slider, readout, goals, note, h, buttons } from './kit/ui.js';
import { canvasTex, thermometer } from './kit/props.js';
import { OpticsScene, RayView, SPECTRUM, wavelengthColor, glassN } from './kit/optics.js';
import { draggable, clamp, deg } from './kit/interact.js';
import { paint, inked, hull } from '../live/ink.js';

const PY = 0.13;          // 三棱镜中心高度
const SCREEN_X = 0.2;
// 光以约 50° 的入射角射到左侧面：方向向上 20°，从左下方射来
const SRC = { x: -0.2, y: PY - 0.056 }, DIR = { x: Math.cos(0.349), y: Math.sin(0.349) };

export default {
  id: 'prism',
  fig: '图4.5-2',
  title: '光的色散',
  predict: {
    q: '让一束太阳光（白光）穿过三棱镜，射到后面的白屏上。<br>白屏上会看到什么？',
    hint: '课本第 107 页「演示」',
    options: ['一个白色的光斑', '一条彩色的光带，从红到紫', '只有一种颜色的光斑'],
    answer: 1,
  },
  conclusion: {
    quote: '太阳光是白光，它射入、射出棱镜会发生折射，被分解成各种颜色的光，这种现象叫作光的色散。',
    why: '白屏上从上到下依次是<b>红、橙、黄、绿、蓝、靛、紫</b>。三棱镜对紫光的偏折最大，对红光的偏折最小。反过来，把红、绿、蓝三种色光按不同比例混合，就可以得到各种颜色——红、绿、蓝叫作<b>色光的三原色</b>。在红光之外，温度计的示数也会升高：那里有看不见的<b>红外线</b>。',
    src: '课本第 107–109 页 · 第四章 第5节 光的色散',
  },

  create({ tag }) {
    const group = new THREE.Group();
    const dispersion = new THREE.Group(), mixing = new THREE.Group();
    group.add(dispersion, mixing);

    // ---- 色散 ----
    // 遮光板 + 狭缝（白光从左边射来）
    const slit = inked(new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.12, 0.08), paint(0x2c313c)));
    slit.position.set(SRC.x, SRC.y, 0);
    const lampBox = inked(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), paint(0x4d5668)));
    lampBox.position.set(SRC.x - 0.05, SRC.y, 0);
    dispersion.add(slit, lampBox);

    // 三棱镜（正三角形截面，沿 z 拉长）
    const side = 0.07;
    const tri = [{ x: 0, y: side / Math.sqrt(3) }, { x: side / 2, y: -side / (2 * Math.sqrt(3)) }, { x: -side / 2, y: -side / (2 * Math.sqrt(3)) }];
    const shape = new THREE.Shape(tri.map((p) => new THREE.Vector2(p.x, p.y)));
    const pg = new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: false });
    pg.translate(0, 0, -0.035);
    const prismMesh = new THREE.Mesh(pg, paint(0xd5eef7, { transparent: true, opacity: 0.38, depthWrite: false }));
    prismMesh.renderOrder = 8;
    inked(prismMesh, { width: 1.5, color: 0x5d7f95 });
    const prismG = new THREE.Group();
    prismG.add(prismMesh);
    prismG.position.set(0, PY, 0);
    dispersion.add(prismG);
    const stand = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, PY - 0.035, 10), paint(0x9aa3b2)), 0.0015);
    stand.position.set(0, (PY - 0.035) / 2, 0);
    dispersion.add(stand);

    // 白屏（竖直，在右边）
    const sTex = canvasTex(256, 512, () => {});
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.2, 0.1), [new THREE.MeshBasicMaterial({ map: sTex }), new THREE.MeshBasicMaterial({ map: sTex }), paint(0xe9e6dc), paint(0xe9e6dc), paint(0xe9e6dc), paint(0xe9e6dc)]);
    screen.position.set(SCREEN_X, 0.1, 0);
    inked(screen, { width: 1.2 });
    dispersion.add(screen);

    // 温度计（可以放到彩带的不同位置）
    const th = thermometer({ min: 10, max: 40, length: 0.13 });
    th.rotation.z = Math.PI / 2;   // 横着贴在屏前
    const thG = new THREE.Group();
    thG.add(th);
    th.position.set(0, 0, 0);   // 玻璃泡贴在屏上，管子朝左
    dispersion.add(thG);

    const rays = new RayView({ width: 1.8, glow: 7 });
    dispersion.add(rays.group);
    const scene = new OpticsScene();

    // ---- 三原色 ----
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.22), new THREE.MeshBasicMaterial({ color: 0x15161b }));
    wall.position.set(0, 0.11, -0.04);
    mixing.add(wall);
    const mixTex = canvasTex(680, 440, () => {});
    const mixPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.22), new THREE.MeshBasicMaterial({ map: mixTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    mixPlane.position.set(0, 0.11, -0.039);
    mixing.add(mixPlane);
    const torches = ['#ff2a2a', '#22e05a', '#2a5bff'].map((c, i) => {
      const t = new THREE.Group();
      const b = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.014, 0.05, 16), paint(0x30343f)), 0.0015);
      b.rotation.x = Math.PI / 2;
      const lensC = new THREE.Mesh(new THREE.CircleGeometry(0.012, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(c) }));
      lensC.position.z = -0.026;
      lensC.rotation.y = Math.PI;
      t.add(b, lensC);
      t.position.set((i - 1) * 0.08, 0.05 + (i === 1 ? 0.03 : 0), 0.12);
      t.lookAt(new THREE.Vector3((i - 1) * 0.03, 0.12, -0.04));
      t.rotateY(Math.PI);
      mixing.add(t);
      return t;
    });

    const tTh = tag('', 'pill');
    const S = { mode: 0, angle: 0, thY: 0.13, rgb: [1, 1, 0], stripe: null, mixTried: new Set() };
    let G = null;

    const layoutDispersion = () => {
      prismG.rotation.z = S.angle * deg;
      // 三角形顶点随转动
      const c = Math.cos(S.angle * deg), s = Math.sin(S.angle * deg);
      scene.media.length = 0;
      scene.media.push({ poly: tri.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c + PY })), n: glassN });
      scene.screens.length = 0;
      scene.screens.push({ a: { x: SCREEN_X - 0.002, y: -1 }, b: { x: SCREEN_X - 0.002, y: 2 }, id: 'S' });
      const src = { x: SRC.x + 0.003, y: SRC.y + 0.001 };
      const dir = DIR;
      const paths = [], hits = [];
      // 白光段（到三棱镜之前）画成白色
      const first = scene.trace(src, dir, { nm: 580 });
      paths.push({ pts: first.pts.slice(0, 2), color: 0xffffff });
      for (const sp of SPECTRUM) {
        const t = scene.trace(src, dir, { nm: sp.nm });
        paths.push({ pts: t.pts.slice(1), color: wavelengthColor(sp.nm) });
        const hit = t.hits.find((x) => x.kind === 'screen');
        hits.push(hit ? hit.p.y : null);
      }
      rays.set(paths, (x, y) => new THREE.Vector3(x, y, 0.0));
      // 屏上的彩带
      const g = sTex.canvas.getContext('2d'), W = 256, H = 512;
      g.fillStyle = '#f7f6f1'; g.fillRect(0, 0, W, H);
      const y2p = (y) => H - ((y - 0.0) / 0.2) * H;
      const ys = hits.filter((y) => y != null);
      S.stripe = ys.length ? { top: Math.max(...ys), bot: Math.min(...ys) } : null;
      if (ys.length > 1) {
        const top = y2p(Math.max(...ys)), bot = y2p(Math.min(...ys));
        const grd = g.createLinearGradient(0, top, 0, bot);
        SPECTRUM.forEach((sp, i) => grd.addColorStop(i / (SPECTRUM.length - 1), '#' + wavelengthColor(sp.nm).getHexString()));
        g.fillStyle = grd;
        g.filter = 'blur(3px)';
        g.fillRect(W * 0.2, top - 6, W * 0.6, bot - top + 12);
        g.filter = 'none';
      }
      sTex.needsUpdate = true;
      // 温度计读数：在色带上升温，红端外升得最多（红外线），紫端外几乎不变
      const y = S.thY;
      thG.position.set(SCREEN_X - 0.006, y, 0.025);
      let rise = 0.3, zone = '色带外';
      if (S.stripe) {
        const { top, bot } = S.stripe, span = top - bot;
        if (y > top && y < top + span * 0.7) { rise = 6.5; zone = '红光外侧（看不见）'; }
        else if (y <= top && y >= bot) { const k = (y - bot) / span; rise = 1.5 + 3.5 * k; zone = SPECTRUM[Math.round((1 - k) * 6)].name + '光处'; }
        else if (y < bot && y > bot - span * 0.6) { rise = 0.6; zone = '紫光外侧'; }
      }
      S.rise = rise; S.zone = zone;
      tTh.loc(dispersion, SCREEN_X - 0.03, y + 0.02, 0.03).text('');      // 在哪个区域要学生自己看
    };

    const layoutMix = () => {
      const g = mixTex.canvas.getContext('2d'), W = 680, H = 440;
      g.clearRect(0, 0, W, H);
      g.globalCompositeOperation = 'lighter';
      const centers = [[W * 0.39, H * 0.4], [W * 0.61, H * 0.4], [W * 0.5, H * 0.66]];
      ['255,40,40', '40,255,90', '50,90,255'].forEach((c, i) => {
        const a = S.rgb[i];
        if (a <= 0) return;
        const gr = g.createRadialGradient(...centers[i], 10, ...centers[i], 120);
        gr.addColorStop(0, `rgba(${c},${a})`); gr.addColorStop(0.8, `rgba(${c},${a * 0.9})`); gr.addColorStop(1, `rgba(${c},0)`);
        g.fillStyle = gr;
        g.beginPath(); g.arc(...centers[i], 120, 0, Math.PI * 2); g.fill();
      });
      g.globalCompositeOperation = 'source-over';
      mixTex.needsUpdate = true;
      torches.forEach((t, i) => (t.children[1].material.opacity = 1, t.children[1].visible = S.rgb[i] > 0));
      const key = S.rgb.map((v) => (v > 0.5 ? 1 : 0)).join('');
      const names = { '110': '黄色', '011': '青色', '101': '品红', '111': '白色' };
      // 光变了：正在问的那道题如果不是现在这个组合，就作废（再按现在看到的重新问）
      if (G?.mixKey && G.mixKey() !== key) G.dropMix();
      if (names[key] && !S.mixTried.has(key) && G?.askMix && G.mixKey() !== key) G.askMix(key, names[key]);
    };

    const layout = () => {
      dispersion.visible = S.mode === 0;
      mixing.visible = S.mode === 1;
      tTh.show(S.mode === 0);
      if (S.mode === 0) layoutDispersion(); else layoutMix();
    };
    layout();

    const pointer = draggable(group, [
      { obj: thG, plane: 'xy', onDrag: (p) => { S.thY = clamp(p.y, 0.02, 0.19); layout(); G?.syncTh(); } },
      { obj: prismG, plane: 'xy', onDrag: (p, st) => { S.angle = clamp(Math.round((p.x - st.x) * 400), -20, 20); layout(); G?.syncA(); if (Math.abs(S.angle) >= 6) G?.goal.done('see'); } },
    ]);
    let temp = 20;

    return {
      group,
      size: { w: 0.5, d: 0.2, h: 0.22 },
      view: { elev: 10, azim: -20, lookY: 0.48, margin: 1.05 },
      pointer,
      mount(ui) {
        const out = readout([{ key: 't', label: '温度计示数', unit: '℃' }]);
        const mode = seg('做哪个', ['光的色散', '色光的混合'], (_, k) => { S.mode = k; layout(); });
        const ang = slider('转动三棱镜', { min: -20, max: 20, value: 0, fmt: (v) => `${v}°`, onInput: (v) => { S.angle = v; layout(); if (Math.abs(v) >= 6) G.goal.done('see'); } });
        const thy = slider('温度计的高度（也可以直接拖）', { min: 2, max: 19, value: 13, fmt: (v) => `${v} cm`, onInput: (v) => { S.thY = v / 100; layout(); } });
        const mixes = ['红', '绿', '蓝'].map((c, i) => slider(`${c}光的强度`, { min: 0, max: 100, value: S.rgb[i] * 100, fmt: (v) => `${v}%`, onInput: (v) => { S.rgb[i] = v / 100; layoutMix(); } }));
        const d1 = h('div', {}, ang.el, thy.el, out.el, note('把温度计放到彩带的不同位置，等一会儿看示数（升温多少是示意值）。'));
        const mixQ = buttons([0, 1, 2].map(() => ({ text: '', ghost: true, onClick: () => {} })));
        mixQ.el.hidden = true;
        const d2 = h('div', {}, ...mixes.map((m) => m.el), mixQ.el, note('三束色光照在黑色的墙上，看看重叠部分是什么颜色。'));
        mode.onChange = null;
        const switchMode = (k) => { d1.hidden = k !== 0; d2.hidden = k !== 1; };
        ui.controls.append(mode.el, d1, d2);
        mode.el.querySelectorAll('button').forEach((b, k) => b.addEventListener('click', () => switchMode(k)));
        switchMode(0);
        G = {
          out, status: (m) => ui.status(m),
          goal: goals(ui, [['see', '转动三棱镜，看彩带怎么移动'], ['ir', '用温度计找到“看不见的光”'], ['mix', '把红、绿、蓝三种光混合成白光（再试一种别的组合）']]),
          syncA: () => ang.set(S.angle),
          syncTh: () => thy.set(Math.round(S.thY * 100)),
          // 色光混合：学生看重叠部分，说出是什么颜色
          mixKey: () => S.asking || null,
          dropMix: () => { if (S.asking) { S.asking = null; mixQ.el.hidden = true; ui.status('光变了，刚才那道题作废。看看现在墙上重叠的那一块。'); } },
          askMix: (key, right) => {
            S.asking = key;
            const all = ['白色', '黄色', '青色', '品红', '黑色'], opts = [...new Set([right, ...all.filter((x) => x !== right).sort(() => Math.random() - 0.5)])].slice(0, 3).sort(() => Math.random() - 0.5);
            mixQ.btns.forEach((b, j) => { b.textContent = opts[j]; b.onclick = () => { const now = S.rgb.map((v) => (v > 0.5 ? 1 : 0)).join(''); if (now !== key || S.asking !== key) { mixQ.el.hidden = true; S.asking = null; return ui.status('光已经变了，这道题不算。'); } if (opts[j] !== right) return ui.status('再看看三束光（或两束光）<b>重叠</b>的那一块是什么颜色。'); mixQ.el.hidden = true; S.asking = null; S.mixTried.add(key); ui.status(`对，重叠部分是<b>${right}</b>。${S.mixTried.has('111') ? '' : '再把三种光都打开看看。'}`); if (S.mixTried.has('111') && S.mixTried.size >= 2) G.goal.done('mix'); }; });
            mixQ.el.hidden = false; ui.status('看墙上光重叠的那一块：它是什么颜色？');
          },
        };
        ui.status('白光从左边的狭缝射来，经过三棱镜，在白屏上分成了彩色光带。');
        this._out = out;
      },
      update(dt) {
        if (S.mode !== 0 || !this._out) return;
        const target = 20 + (S.rise || 0);
        temp += (target - temp) * Math.min(1, dt * 0.6);
        th.setTemp(temp);
        this._out.set('t', temp, 1);
        if (S.irSaid && S.zone !== S.lastZone) { S.lastZone = S.zone; if (!S.zone.startsWith('红光外')) G.status(`温度计现在在${S.zone}。刚才在<b>红光外侧</b>时示数升得最高（红外线）。`); }
        if (S.zone?.startsWith('红光外') && temp > 25 && !S.irSaid) { S.lastZone = S.zone; S.irSaid = true; G.goal.done('ir'); G.status('这里在红光的外侧，屏上什么颜色也看不到，温度计的示数却升得最高——这里有<b>看不见的光</b>：红外线。'); }
      },
    };
  },
};
