// 图5.3-2 探究凸透镜成像规律的装置：光具座上依次是发光二极管（“F”形光源）、凸透镜、光屏。
// 透镜固定在 50 cm 刻度处，焦距 10 cm。光屏上的像按 1/u + 1/v = 1/f 计算；光屏偏离像的位置越多，像越模糊。
import * as THREE from 'three';
import { readout, buttons, table, goals, note, slider, seg } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { opticalBench, benchPost, lensMesh, screenBoard } from './kit/optics.js';
import { describeImage } from './kit/lensbench.js';
import { draggable, clamp } from './kit/interact.js';
import { paint, inked } from '../live/ink.js';

const LEN = 1.0, LENS_X = 0.5, F = 0.1, H = 0.12;

export default {
  id: 'convex',
  fig: '图5.3-2',
  title: '探究凸透镜成像的规律',
  predict: {
    q: '发光物体从很远的地方慢慢移近凸透镜（焦距 10 cm），<br>当物距小于焦距时，光屏上还能接到像吗？',
    hint: '课本第 122–124 页「实验」',
    options: ['能，像越来越大', '不能，但透过透镜能看到正立、放大的虚像', '能，像变成正立的了'],
    answer: 1,
  },
  world: true,
  // 课本第 123 页印着的空表格（PDF 点）：表格外框、第一行数据的位置、行高、每列宽度
  worldTable: {
    rect: [68, 461, 475, 655], firstRow: 36, rowH: 25.3, pageCols: [62.6, 89.1, 88.3, 90, 77],
    headers: ['物距/cm', '虚实', '大小', '正倒', '像距/cm'], cols: [0.16, 0.2, 0.22, 0.2, 0.22],
  },
  stampText: '探究',
  conclusion: {
    page: 130, rect: [160, 316, 462, 414],     // 课本第 124 页上那段“实验表明……”的原文
    quote: '当物距大于2 倍焦距时，凸透镜成倒立、缩小的实像；当物距等于2倍焦距时，凸透镜成倒立、等大的实像；当物距小于2倍焦距、大于焦距时，凸透镜成倒立、放大的实像；当物距小于焦距时，凸透镜成正立、放大的虚像。',
    why: '这就是<b>凸透镜成像的规律</b>。用焦距 <i>f</i> 作参照最清楚：<i>u</i> = 2<i>f</i> 是放大和缩小的分界点，<i>u</i> = <i>f</i> 是实像和虚像的分界点。成实像时，物距越小，像距越大，像也越大。',
    src: '课本第 122–124 页 · 第五章 第3节 凸透镜成像的规律',
  },

  create({ tag, world, mode, look, back }) {
    const ctxLook = look, ctxBack = back;
    const group = new THREE.Group();
    group.position.x = -LEN / 2;
    const root = new THREE.Group();
    root.add(group);
    const bench = opticalBench({ length: LEN });
    group.add(bench);
    const y0 = bench.railY;

    // 光源：“F”形发光二极管
    const src = benchPost(H - 0.02);
    const ledTex = canvasTex(128, 128, (g) => {
      g.fillStyle = '#1b1d24'; g.fillRect(0, 0, 128, 128);
      g.fillStyle = '#ff3b2f'; g.shadowColor = '#ff3b2f'; g.shadowBlur = 12;
      g.fillRect(40, 18, 14, 92); g.fillRect(40, 18, 52, 14); g.fillRect(40, 56, 40, 13);
    });
    const led = inked(new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.05, 0.05), [new THREE.MeshBasicMaterial({ map: ledTex }), paint(0x2c313c), paint(0x2c313c), paint(0x2c313c), paint(0x2c313c), paint(0x2c313c)]));
    led.position.y = 0.02;
    src.mount.add(led);
    group.add(src);
    // 凸透镜
    const lp = benchPost(H - 0.04);
    const lens = lensMesh({ r: 0.04, thick: 0.014 });
    lens.position.y = 0.04;
    lp.mount.add(lens);
    lp.position.x = LENS_X;
    group.add(lp);
    // 光屏
    const sp = benchPost(H - 0.05);
    const scr = screenBoard({ w: 0.13, h: 0.12 });
    scr.position.y = 0.05;
    sp.mount.add(scr);
    group.add(sp);
    for (const p of [src, lp, sp]) p.position.y = y0;

    const tU = tag('', 'pill'), tV = tag('', 'pill'), tS = tag('', 'pill');
    const S = { u: 0.3, s: 0.15, look: false, rows: [], zones: new Set() };
    let G = null, W = null, onBack = null;
    // 虚像（透过透镜看时才出现）
    // 透过透镜看到的样子：只在镜片范围内，看到放大、正立的“F”
    const ghostTex = ledTex.clone();
    ghostTex.wrapS = ghostTex.wrapT = THREE.ClampToEdgeWrapping;
    const ghost = new THREE.Mesh(new THREE.CircleGeometry(0.037, 48), new THREE.MeshBasicMaterial({ map: ghostTex, transparent: true, opacity: 0.92, depthWrite: false }));
    ghost.rotation.y = Math.PI / 2;
    ghost.renderOrder = 12;
    ghost.visible = false;
    group.add(ghost);
    // 世界内的操作：钉在器材旁边的纸签
    const recTag = world ? tag('✎ 记下这一组', 'pill', () => recordNow()) : null;
    const eyeTag = world ? tag('👁 取下光屏，透过透镜看', 'pill', () => lookThrough()) : null;
    const backTag = world ? tag('↩ 看完了', 'pill', () => lookBack()) : null;
    backTag?.show(false);
    const recordNow = () => {
      const d = describeImage(S.u, F);
      if (!S.sharp) return W.status('光屏上的像还不清楚。');
      if (S.rows.some((r) => Math.abs(r - S.u) < 0.01)) return W.status('这个物距已经记过了，换一个物距再找像。');
      S.rows.push(S.u);
      W.record([(S.u * 100).toFixed(1), '实', d.size, '倒立', (d.v * 100).toFixed(1)]);
      const zone = S.u > 2 * F + 0.004 ? 'far' : S.u > 2 * F - 0.004 ? 'eq' : 'mid';
      W.done(zone);
      W.status(`记下了：物距 ${(S.u * 100).toFixed(1)} cm 时，成${d.text}，像距 ${(d.v * 100).toFixed(1)} cm。`);
    };
    const lookThrough = () => {
      const d = describeImage(S.u, F);
      S.look = true;
      sp.visible = false;
      // 镜片里看到的 F 比光源本身大 m 倍：贴图只取中间 1/m 的部分
      const m = Math.max(1, Math.abs(d.m)), k = 2.8 / m;   // F 只占镜片的一部分，四周留出边
      ghostTex.repeat.set(k, k);
      ghostTex.offset.set(0.5 - k / 2, 0.5 - k / 2);
      ghostTex.needsUpdate = true;
      ghost.position.set(LENS_X + 0.006, y0 + H, 0);
      ghost.visible = true;
      look([LENS_X - LEN / 2, y0 + H, 0], [1, 0.1, 0.12], 0.3, () => { lookBack(); onBack?.(); });
      W.done('virtual');
      W.status(`透过透镜看：看到一个<b>${d.text}</b>，和物体在透镜的同一侧。光屏上接不到它。（点空白处回去）`);
      layout();
    };
    const lookBack = () => { S.look = false; sp.visible = true; ghost.visible = false; back(); layout(); };

    const layout = () => {
      src.position.x = LENS_X - S.u;
      sp.position.x = LENS_X + S.s;
      const d = describeImage(S.u, F);
      const real = d.real && Number.isFinite(d.v);
      const blurPx = real ? Math.min(60, (Math.abs(S.s - d.v) / Math.max(0.02, d.v)) * 260) : 999;
      S.sharp = real && blurPx < 3.5;
      scr.paint((g, W, Hh) => {
        g.fillStyle = 'rgba(25,24,22,.55)'; g.fillRect(0, 0, W, Hh);
        if (!real) {    // 虚像（或在焦点上）：光屏上只有一片很淡的光
          const gr = g.createRadialGradient(W / 2, Hh / 2, 0, W / 2, Hh / 2, W * 0.45);
          gr.addColorStop(0, 'rgba(255,70,50,.35)'); gr.addColorStop(1, 'rgba(255,70,50,0)');
          g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
          return;
        }
        const m = Math.abs(d.m) * (S.s / d.v);   // 光屏不在像处时，光斑大小大致按光屏位置缩放
        const px = W / 0.13;
        const size = 0.05 * m * px;
        if (blurPx > 50) {
          const gr = g.createRadialGradient(W / 2, Hh / 2, 0, W / 2, Hh / 2, W * 0.4);
          gr.addColorStop(0, 'rgba(255,70,50,.5)'); gr.addColorStop(1, 'rgba(255,70,50,0)');
          g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
        }
        g.save();
        g.translate(W / 2, Hh / 2);
        g.rotate(Math.PI);          // 实像：上下、左右都颠倒
        g.filter = `blur(${blurPx.toFixed(1)}px)`;
        g.globalAlpha = Math.min(1, 1.3 / Math.max(0.6, m));
        g.drawImage(ledTex.canvas, -size / 2, -size / 2, size, size);
        g.restore();
      });
      const L = (x, y) => [group, x, y0 + y, 0.04];
      tU.loc(...L(LENS_X - S.u / 2, 0.02)).text('物距 <i>u</i>');
      tV.loc(...L(LENS_X + S.s / 2, 0.02)).text('光屏到透镜');
      tS.loc(group, LENS_X + S.s, y0 + H + 0.03, 0).text(real || S.sharp ? '' : '光屏上接不到像').show(!S.look);     // 清不清楚要学生自己看
      if (world) {
        const recorded = S.rows.some((r) => Math.abs(r - S.u) < 0.01);
        recTag.loc(group, LENS_X + S.s + 0.075, y0 + H - 0.01, 0).show(S.sharp && !recorded && !S.look);
        eyeTag.loc(group, LENS_X + 0.03, y0 + H + 0.06, 0).show(!real && !S.look && d.real !== null);
        backTag.loc(group, LENS_X + 0.05, y0 + H + 0.05, 0).show(S.look);
        tU.show(!S.look); tV.show(!S.look);
      }
      if (G) {
        G.out.set('u', S.u * 100, 1); G.out.set('s', S.s * 100, 1);
        // 位置一变，状态栏就说现在看到的，不再停在上一条记录上
        const key = `${S.u.toFixed(3)}|${S.s.toFixed(3)}`;
        if (G.lastKey && G.lastKey !== key && !S.look) G.ui.status(real || S.sharp ? '前后移动光屏，找到光屏上的像<b>最清楚</b>的位置，然后记录。' : d.real === null ? '物体在焦点上：光屏上接不到像。' : '物体在焦点以内：光屏上接不到像。试试从光屏一侧透过透镜看。');
        G.lastKey = key;
      }
    };
    layout();
    const pointer = draggable(group, [
      { obj: src, plane: 'xy', onDrag: (p) => { if (S.look) lookBack(); S.u = Math.round(clamp(LENS_X - p.x, 0.04, 0.45) * 100) / 100; layout(); G?.sync(); } },
      { obj: sp, plane: 'xy', onDrag: (p) => { S.s = clamp(p.x - LENS_X, 0.06, 0.48); layout(); G?.sync(); } },
    ]);

    return {
      group: root,
      size: { w: LEN, d: 0.2, h: 0.22 },
      scale: 1.0,
      view: { elev: 13, azim: -34, lookY: 0.55, lookZ: 0.04, margin: 0.82 },
      pointer,
      // 自动化测试用：直接设置位置、记录、透过透镜看
      debug: { set: (u, sc) => { S.u = u; S.s = sc ?? describeImage(u, F).v; layout(); G?.sync(); }, record: () => recordNow(), look: () => lookThrough(), back: () => lookBack() },
      // 世界内界面下的机位
      worldView: { card: { elev: 16, azim: -26, lookY: 0.5, lookZ: 0.02, margin: 0.92 }, page: { elev: 40, azim: 0, margin: 0.94 }, desk: { elev: 42, azim: 0, margin: 1.0 } },
      mountWorld(ui) {
        W = ui;
        ui.setGoals([['far', '物距大于 2 倍焦距时，找到清晰的像并记下来'], ['eq', '物距等于 2 倍焦距时，再记一次'], ['mid', '物距在 1 倍和 2 倍焦距之间，再记一次'], ['virtual', '物距小于焦距时，透过透镜看一看']]);
        ui.status('先在记录上猜一猜。然后拖动光屏，找到最清晰的像。');
        layout();
      },
      mount(ui) {
        const out = readout([{ key: 'u', label: '物距', unit: 'cm', secret: '看光具座的刻度' }, { key: 's', label: '光屏到透镜', unit: 'cm', secret: '看光具座的刻度' }]);
        const us = slider('移动发光物体（物距）', { min: 4, max: 45, step: 1, value: 30, fmt: () => '',  onInput: (v) => { S.u = v / 100; layout(); } });
        const ss = slider('移动光屏', { min: 6, max: 48, step: 0.5, value: 15, fmt: () => '', onInput: (v) => { S.s = v / 100; layout(); } });
        const auto = buttons([{ text: '提示：帮我找到最清晰的位置', ghost: true, onClick: () => {
          const d = describeImage(S.u, F);
          if (!d.real || d.v > 0.48) { ui.status(d.real ? '像距太大，光具座不够长。把物体移远一点。' : '物体在焦点以内（或正在焦点上），光屏上接不到像。'); return; }
          S.s = d.v; layout(); G.sync();
        } }]);
        const look = buttons([{ text: '从光屏一侧透过透镜看', ghost: true, onClick: () => {
          if (S.look) { lookBack(); look.btns[0].textContent = '从光屏一侧透过透镜看'; return; }
          const d = describeImage(S.u, F);
          if (d.real) return ui.status('现在光屏上能接到实像。把物体移到焦点以内再透过透镜看。');
          if (d.real === null) return ui.status('物体正在焦点上：不成像。');
          lookThrough();
          onBack = () => { look.btns[0].textContent = '从光屏一侧透过透镜看'; };
          look.btns[0].textContent = '↩ 看完了，回到光具座';
        } }]);
        const tb = table(['物距/cm', '虚实', '大小', '正倒', '像距/cm'], { note: '表格和课本第 123 页的一样。焦距 <i>f</i> = 10 cm。' });
        const rec = buttons([{ text: '记录这一组', onClick: () => {
          const d = describeImage(S.u, F);
          if (!d.real) return ui.status('光屏上接不到像，没法记录。');
          if (!S.sharp) return ui.status('光屏上的像还不够清楚。前后都移一移光屏，找到最清楚的那个位置。');
          const zone = S.u > 2 * F + 0.004 ? 'far' : S.u > 2 * F - 0.004 ? 'eq' : 'mid';
          if (S.rows.some((r) => Math.abs(r - S.u) < 0.01)) return ui.status('这个物距已经记过了。');
          // 学生自己判断像的正倒、大小（凑近看光屏，和发光物体比一比）
          const ask = (q, opts, right, hint, ok) => { pick.btns.forEach((b, j) => { b.hidden = j >= opts.length; if (b.hidden) return; b.textContent = opts[j]; b.onclick = () => { if (opts[j] !== right) return ui.status(hint); pick.el.hidden = true; ok(); }; }); pick.el.hidden = false; ui.status(q); };
          ask('凑近看光屏上的像，和发光物体 F 比一比：像是<b>正立</b>还是<b>倒立</b>的？', ['正立', '倒立'], '倒立', '看字母 F 的横杠朝哪边、竖杠在哪边——上下左右都颠倒了吗？', () =>
            ask('像比物体（发光的 F）<b>大</b>还是<b>小</b>？', ['放大', '缩小', '等大'], d.size, '比一比光屏上的 F 和发光物体上的 F 哪个大。可以“凑近看光屏”。', () => {
              // 物距、像距也由学生从光具座的刻度上读：透镜在 50 cm 刻度处
              const u = Math.round(S.u * 100), v = Math.round(S.s * 100);
              const three = (x) => [...new Set([x, x + 2, x - 2])].sort(() => Math.random() - 0.5).map((y) => `${y} cm`);
              (S.readPh = 'u', ask)('读光具座上的刻度（透镜在 <b>50 cm</b> 处，可以点“凑近看刻度”）：物距 <i>u</i> = ?', three(u), `${u} cm`, `物距是物体到透镜的距离。看发光物体的底座指在哪个刻度（现在是 ${50 - u} cm），用 50 减去它。`, () =>
                (S.readPh = 'v', ask)('再读光屏的位置：像距 <i>v</i>（光屏到透镜）= ?', three(v), `${v} cm`, `像距是光屏到透镜的距离。看光屏的底座指在哪个刻度（大约 ${50 + v} cm），减去 50。`, () => {
                  S.rows.push(S.u);
                  tb.add([u, '实', d.size, '倒立', v]);
                  out.reveal('u'); out.reveal('s');
                  G.goal.done(zone);
                  ui.status(`记下了：物距 ${u} cm，倒立、${d.size}的实像，像距约 ${v} cm。`);
                }));
            }));
        } }]);
        let near = false;
        const peek = buttons([{ text: '凑近看光屏', ghost: true, onClick: () => {
          near = !near;
          if (near) {
            ctxLook([LENS_X - LEN / 2 + S.s, y0 + H, 0], [-1, 0.12, 0.4], 0.28, () => { near = false; peek.btns[0].textContent = '凑近看光屏'; ctxBack(); });
            peek.btns[0].textContent = '↩ 回到光具座';
          } else { ctxBack(); peek.btns[0].textContent = '凑近看光屏'; }
        } }]);
        let nearS = false;
        const scale = buttons([{ text: '凑近看刻度', ghost: true, onClick: () => {
          nearS = !nearS;
          if (!nearS) { ctxBack(); scale.btns[0].textContent = '凑近看刻度'; return; }
          const v = S.readPh === 'v';
          const x = v ? LENS_X + S.s / 2 : LENS_X - S.u / 2, span = v ? S.s : S.u;
          ctxLook([x - LEN / 2, y0, 0.03], [0, 0.9, 1], Math.max(0.3, span * 2.4), () => { nearS = false; scale.btns[0].textContent = '凑近看刻度'; ctxBack(); });
          scale.btns[0].textContent = '↩ 回到光具座';
        } }]);
        const pick = buttons([0, 1, 2].map(() => ({ text: '', ghost: true, onClick: () => {} })));
        pick.el.hidden = true;
        ui.controls.append(us.el, ss.el, peek.el, out.el, rec.el, pick.el, scale.el, look.el, auto.el, note('也可以直接拖动光源和光屏。'));
        ui.data.append(tb.el);
        G = {
          out, rec, ui,
          goal: goals(ui, [['far', '物距大于 2 倍焦距时记录一次'], ['eq', '物距等于 2 倍焦距时记录一次'], ['mid', '物距在 1 倍和 2 倍焦距之间记录一次'], ['virtual', '物距小于焦距时，透过透镜看']]),
          sync: () => { us.set(Math.round(S.u * 200) / 2); ss.set(Math.round(S.s * 200) / 2); },
        };
        // 透过透镜看、记录这些动作在两种界面下共用
        W = { status: (m) => ui.status(m), done: (id) => G.goal.done(id), record: (cells) => tb.add(cells) };
        ui.status('移动光屏，直到光屏上出现最清晰的像。');
        layout();
      },
    };
  },
};
