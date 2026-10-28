// 图4.3-2 探究平面镜成像的特点：竖立的玻璃板代替平面镜，前面点燃的蜡烛 A，后面拿一支一样的未点燃蜡烛 B 去找像。
// 坐标：桌面 y = 0；玻璃板在 z = 0 竖立、沿 x 方向；A 在 z > 0（学生这一侧），像在 z < 0。
import * as THREE from 'three';
import { seg, readout, buttons, table, goals, note } from './kit/ui.js';
import { candle, canvasTex } from './kit/props.js';
import { draggable, clamp } from './kit/interact.js';
import { paint, polyline } from '../live/ink.js';

export default {
  id: 'planemirror',
  fig: '图4.3-2',
  title: '探究平面镜成像的特点',
  predict: {
    q: '点燃的蜡烛 A 慢慢远离玻璃板，它在玻璃板后面的像会怎样？',
    hint: '课本第 98 页「实验」',
    options: ['像也远离玻璃板，而且大小不变', '像变小了', '像的位置不变'],
    answer: 0,
  },
  conclusion: {
    quote: '平面镜所成的像为虚像，其大小与物体的大小相等，像和物体到平面镜的距离相等，像和物体的连线与镜面垂直。',
    why: '用一支和 A 完全一样的蜡烛 B 去和像重合，就能找到像的位置、比较像的大小。在像的位置放光屏，光屏上接不到像，说明它是<b>虚像</b>。也可以说：平面镜所成的像与物体关于镜面对称。',
    src: '课本第 98–100 页 · 第四章 第3节 平面镜成像',
  },

  create({ tag, look, back }) {
    const group = new THREE.Group();

    // 白纸 + 画在纸上的镜面线
    const paperTex = canvasTex(1024, 1024, () => {});
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.36), new THREE.MeshLambertMaterial({ map: paperTex }));
    paper.rotation.x = -Math.PI / 2;
    paper.position.y = 0.0008;
    paper.receiveShadow = true;
    group.add(paper);
    const marks = [];
    const paintPaper = () => {
      const g = paperTex.canvas.getContext('2d'), W = 1024, px = W / 0.36;
      g.fillStyle = '#fdfcf7'; g.fillRect(0, 0, W, W);
      g.strokeStyle = '#2b3345'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(40, W / 2); g.lineTo(W - 40, W / 2); g.stroke();
      g.font = '28px PingFang SC, sans-serif'; g.fillStyle = '#2b3345';
      g.fillText('镜面位置', 50, W / 2 - 14);
      for (const m of marks) {
        const ax = W / 2 + m.x * px, az = W / 2 + m.z * px, bz = W / 2 - m.zb * px;
        g.strokeStyle = m.color; g.fillStyle = m.color; g.lineWidth = 3;
        g.setLineDash([10, 8]); g.beginPath(); g.moveTo(ax, az); g.lineTo(ax, bz); g.stroke(); g.setLineDash([]);
        for (const [y, t] of [[az, 'A'], [bz, 'B']]) { g.beginPath(); g.arc(ax, y, 7, 0, Math.PI * 2); g.fill(); g.fillText(t + m.n, ax + 12, y + 10); }
      }
      paperTex.needsUpdate = true;
    };
    paintPaper();

    // 玻璃板
    const glassMat = new THREE.MeshPhongMaterial({ color: 0xbfe0ee, transparent: true, opacity: 0.22, shininess: 100, side: THREE.DoubleSide, depthWrite: false });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.15, 0.003), glassMat);
    glass.position.set(0, 0.075, 0);
    glass.renderOrder = 10;
    glass.add(polyline([new THREE.Vector3(-0.13, -0.075, 0), new THREE.Vector3(-0.13, 0.075, 0), new THREE.Vector3(0.13, 0.075, 0), new THREE.Vector3(0.13, -0.075, 0)], { width: 1.6, color: 0x5d7f95 }));
    const clipL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.03), paint(0x4d5668));
    clipL.position.set(-0.1, -0.069, 0);
    const clipR = clipL.clone(); clipR.position.x = 0.1;
    glass.add(clipL, clipR);
    group.add(glass);

    // 蜡烛 A（点燃）、B（不点燃），以及“像”A′（半透明，在镜后对称处）
    const sizes = [0.07, 0.05];
    const A = candle({ height: sizes[0], r: 0.008, color: 0xf0e6d2 });
    const B = candle({ height: sizes[0], r: 0.008, color: 0xf0e6d2 });
    B.flame.setOn(false);
    const img = candle({ height: sizes[0], r: 0.008, color: 0xf0e6d2 });
    img.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.42; o.material.depthWrite = false; } });
    img.renderOrder = 4;
    group.add(A, B, img);

    // 光屏（可以放到像的位置上）
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.003), paint(0xfbfaf6));
    screen.position.set(0, 0.04, -0.3);
    screen.visible = false;
    group.add(screen);

    // 刻度尺：平放在白纸上，和镜面垂直，0 刻度对着镜面那条线。可以左右拖，靠到纸上的记号旁边去量
    const RL = 0.34, RW = 0.026;
    const rulerTex = canvasTex(256, 2048, (g, w, h) => {
      g.fillStyle = '#f3e3b5'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#2b2f3a'; g.fillStyle = '#2b2f3a'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center';
      const px = h / (RL * 1000);                       // 每毫米多少像素
      for (let mm = -170; mm <= 170; mm++) {
        const y = h / 2 - mm * px, cm = mm % 10 === 0, half = mm % 5 === 0;
        g.lineWidth = cm ? 4 : 2;
        g.beginPath(); g.moveTo(0, y); g.lineTo(cm ? 80 : half ? 56 : 36, y); g.stroke();
        if (cm && mm) { g.save(); g.translate(120, y); g.rotate(Math.PI / 2); g.fillText(String(Math.abs(mm / 10)), 0, 10); g.restore(); }
      }
      g.fillStyle = '#c0392b'; g.fillRect(0, h / 2 - 3, w, 6);
    });
    const ruler = new THREE.Mesh(new THREE.BoxGeometry(RW, 0.002, RL), [0, 0, new THREE.MeshLambertMaterial({ map: rulerTex }), 0, 0, 0].map((m) => m || paint(0xe2cf98)));
    ruler.position.set(0.15, 0.0018, 0);
    group.add(ruler);
    const tR = tag('刻度尺', 'pill').loc(group, 0.15, 0.01, 0.16);
    const tA = tag('蜡烛 A', 'pill'), tB = tag('蜡烛 B', 'pill'), tImg = tag('A 的像', 'pill');
    const S = { ax: 0.02, az: 0.09, bx: -0.05, bz: 0.13, size: 0, screen: false, rows: [], sizeTried: new Set([0]) };
    let G = null;

    const layout = () => {
      A.position.set(S.ax, 0, S.az);
      img.position.set(S.ax, 0, -S.az);
      // 放光屏时，蜡烛 B 拿开放到一边
      if (S.screen) B.position.set(-0.15, 0, -0.14); else B.position.set(S.bx, 0, -S.bz);
      const err = Math.hypot(S.bx - S.ax, S.bz - S.az);
      const ok = err < 0.006 && !S.screen;
      // B 和像重合时，看起来 B 也“点燃”了
      B.flame.setOn(ok);
      // 透过玻璃板看，像还在（虚像由反射光的反向延长线形成，光屏挡不住）；绕到后面直接看光屏，屏上什么都没有
      img.visible = !(S.screen && S.behind);
      screen.visible = S.screen;
      if (S.screen) screen.position.set(S.ax, 0.045, -S.az);
      tA.loc(group, S.ax, sizes[S.size] + 0.045, S.az);
      tB.loc(group, S.bx, 0.12, -S.bz).text(ok ? '蜡烛 B ✓ 与像重合' : '蜡烛 B').show(!S.screen);
      tImg.loc(group, S.ax, sizes[S.size] + 0.045, -S.az).text(S.screen ? (S.behind ? '光屏上什么也没有' : '透过玻璃看：像还在光屏这里') : 'A 的像');
      if (G) {
        G.out.set('a', S.az * 100, 1); G.out.set('b', S.bz * 100, 1);
        G.out.set('ok', ok ? '重合了 ✓' : err < 0.02 ? '快重合了' : '没有重合');
        G.canRecord(ok);
      }
      return ok;
    };
    const setSize = (k) => {
      S.size = k;
      for (const c of [A, B, img]) c.setHeight(sizes[k]);
      S.sizeTried.add(k);
      if (S.sizeTried.size > 1) G?.goal.done('size');
      layout();
    };
    layout();

    const pointer = draggable(group, [
      { obj: B, plane: 'xz', keepOffset: true, onDrag: (p) => {
        S.bx = clamp(p.x, -0.15, 0.15); S.bz = clamp(-p.z, 0.02, 0.16); G?.drop();
        // 靠得很近时吸附（手感）
        if (Math.hypot(S.bx - S.ax, S.bz - S.az) < 0.008) { S.bx = S.ax; S.bz = S.az; }
        layout();
      } },
      { obj: A, plane: 'xz', keepOffset: true, onDrag: (p) => { S.ax = clamp(p.x, -0.12, 0.12); S.az = Math.round(clamp(p.z, 0.03, 0.16) * 200) / 200; G?.drop(); layout(); } },     // A 放在半厘米的位置上，方便读
      { obj: ruler, plane: 'xz', offset: 0.0018, keepOffset: true, hint: '左右拖刻度尺，靠到纸上的记号旁边', onDrag: (p) => { ruler.position.x = clamp(p.x, -0.16, 0.16); tR.loc(group, ruler.position.x, 0.01, 0.16); } },
    ]);

    return {
      group,
      size: { w: 0.36, d: 0.36, h: 0.16 },
      view: { elev: 24, azim: -8, lookY: 0.3, lookZ: -0.02, margin: 1.3 },
      card: false,
      pointer,
      mount(ui) {
        const out = readout([{ key: 'a', label: '蜡烛 A 到镜面的距离', unit: 'cm', secret: true }, { key: 'b', label: '蜡烛 B 到镜面的距离', unit: 'cm', secret: true }, { key: 'ok', label: 'B 与像', span: true }]);
        const size = seg('蜡烛的长度', ['长蜡烛', '短蜡烛'], (_, k) => setSize(k));
        const behindBtn = buttons([{ text: '绕到玻璃板后面，直接看光屏', ghost: true, onClick: () => setBehind(!S.behind) }]);
        behindBtn.el.hidden = true;
        const setBehind = (on) => {
          S.behind = on;
          if (on) {
            look([S.ax, 0.045, -S.az], [0.35, 0.25, -1], 0.36, () => setBehind(false));
            ui.status('绕到玻璃板后面直接看光屏：屏上<b>什么也没有</b>。光屏接不到这个像——平面镜成的是<b>虚像</b>。');
            G.goal.done('screen');
          } else { back(); if (S.screen) ui.status('回到前面，透过玻璃板看：像还在光屏的位置。可是光屏上真的有它吗？'); }
          behindBtn.btns[0].textContent = on ? '↩ 回到前面，透过玻璃板看' : '绕到玻璃板后面，直接看光屏';
          layout();
        };
        const scr = seg('在像的位置', ['放蜡烛 B', '放光屏'], (_, k) => {
          S.screen = k === 1; behindBtn.el.hidden = !S.screen;
          if (!S.screen && S.behind) setBehind(false);
          layout();
          if (S.screen) ui.status('拿走蜡烛 B，在像的位置放一块光屏。透过玻璃板看，像好像还在那里——光屏上接到了吗？');
        });
        const tb = table(['序号', '蜡烛到平面镜的距离/cm', '蜡烛的像到平面镜的距离/cm'], { note: '表格和课本第 99 页的一样。纸上会留下每次 A、B 的位置记号。' });
        const rec = buttons([{ text: '在纸上记下位置', onClick: () => {
          if (G.busy()) return ui.status('先量完这一次的两段距离。');
          if (!layout()) return ui.status('先移动蜡烛 B，让它和 A 的像完全重合。');
          if (S.rows.some((r) => Math.abs(r - S.az) < 0.01)) return ui.status('换一个距离再试：把蜡烛 A 前后移一移。');
          S.rows.push(S.az);
          marks.push({ x: S.ax, z: S.az, zb: S.bz, color: ['#d33a2c', '#2f6fd0', '#2e9b4f', '#a24bd0'][marks.length % 4], n: marks.length + 1 });
          paintPaper();
          // 纸上有了记号，学生自己用刻度尺量两段距离
          G.measure({ n: S.rows.length, a: +(S.az * 100).toFixed(1), b: +(S.bz * 100).toFixed(1) });
        } }]);
        const mq = buttons([0, 1, 2].map((j) => ({ text: '', ghost: true, onClick: () => mAnswer(j) })));
        mq.el.hidden = true;
        let mcur = null;
        const mAsk = () => {
          const v = mcur.step === 'a' ? mcur.a : mcur.b;
          mcur.opts = [...new Set([v, v + 1, v - 1])].sort(() => Math.random() - 0.5);
          mq.btns.forEach((b, k) => { b.hidden = k >= mcur.opts.length; b.textContent = `${mcur.opts[k].toFixed(1)} cm`; });
          mq.el.hidden = false;
          ui.status(`纸上画好了第 ${mcur.n} 次的记号。<b>把刻度尺拖到记号旁边</b>（0 刻度对着镜面那条线）量一量：${mcur.step === 'a' ? '蜡烛 A' : '蜡烛 B（像）'} 到镜面的距离是多少？`);
        };
        const mAnswer = (j) => {
          if (!mcur) return;
          const v = mcur.step === 'a' ? mcur.a : mcur.b;
          if (mcur.opts[j] !== v) return ui.status('再量一量：从镜面那条线（尺上的红线、0 刻度）量到记号，每小格 1 mm。可以点“凑近看刻度尺”。');
          if (mcur.step === 'a') { mcur.step = 'b'; return mAsk(); }
          mq.el.hidden = true;
          tb.add([mcur.n, mcur.a.toFixed(1), mcur.b.toFixed(1)]);
          out.reveal('a'); out.reveal('b');
          if (tb.rows.length >= 3) G.goal.done('rows');
          ui.status(`记下了：A 到镜面 ${mcur.a.toFixed(1)} cm，像到镜面 ${mcur.b.toFixed(1)} cm。${tb.rows.length < 3 ? '挪动蜡烛 A，再找一次。' : '比一比表格里的三组数据。'}`);
          mcur = null;
        };
        const nearR = buttons([{ text: '凑近看刻度尺', ghost: true, onClick: () => look([ruler.position.x, 0, mcur ? (mcur.step === 'a' ? mcur.a : -mcur.b) / 200 : 0], [0.1, 1, 0.3], 0.3, () => back()) }]);
        ui.controls.append(note('拖动后面的蜡烛 B，让它与 A 的像完全重合；也可以拖动蜡烛 A。记下位置后，<b>拖刻度尺</b>到纸上的记号旁边量距离。'), out.el, rec.el, mq.el, nearR.el, size.el, scr.el, behindBtn.el);
        ui.data.append(tb.el);
        G = { busy: () => !!mcur, measure: (m) => { mcur = { ...m, step: 'a' }; mAsk(); }, drop: () => { if (mcur) { mcur = null; mq.el.hidden = true; S.rows.pop(); marks.pop(); paintPaper(); ui.status('蜡烛动了，刚才那次的记号作废。重新让 B 和像重合，再记一次。'); } }, out, canRecord: (ok) => { rec.btns[0].disabled = !ok; }, goal: goals(ui, [['rows', '在 3 个不同位置找到像并记录'], ['size', '换一支长度不同的蜡烛'], ['screen', '放光屏，再绕到玻璃板后面直接看光屏']]) };
        ui.status('玻璃板后面看到了 A 的像。拖动蜡烛 B 去找它。');
        layout();
      },
      update(dt, t) { A.flame.update(t); B.flame.update(t + 0.3); img.flame.update(t); },
    };
  },
};
