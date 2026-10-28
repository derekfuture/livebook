// 图9.1-3 压力和受力面积对海绵形变的影响。小桌放在软海绵上：甲 桌腿朝下；乙 桌腿朝下、桌面上放一个钩码；丙 桌面朝下、上面放一个钩码。
// 海绵的凹陷深度和压强 p = F/S 成正比（近似）。海绵上表面是一张细分的网格，压在下面的部分按压强凹下去，周围平滑过渡。
import * as THREE from 'three';
import { seg, goals, note, table, readout, buttons } from './kit/ui.js';
import { canvasTex, hookWeight } from './kit/props.js';
import { draggable } from './kit/interact.js';
import { paint, inked } from '../live/ink.js';

const SW = 0.22, SD = 0.14, SH = 0.05;      // 海绵
const TW = 0.09, TD = 0.066, LEG = 0.045, LW = 0.009;     // 小桌：桌面、桌腿
const GT = 1, GW = 2;                        // 小桌重 1 N，钩码重 2 N
const KS = 4.2e5;                            // 海绵的“软硬”：凹陷深度 = p / KS（米）
const S_LEGS = 4 * LW * LW, S_TOP = TW * TD;

export default {
  id: 'pressure',
  fig: '图9.1-3',
  title: '压力和受力面积对海绵形变的影响',
  stampText: '观察',
  predict: {
    q: '桌面上放同样一个钩码。小桌<b>桌腿朝下</b>放在海绵上，和<b>桌面朝下</b>放在海绵上——<br>哪一次海绵凹陷得深？',
    hint: '课本第 41 页「演示」',
    options: ['桌腿朝下', '桌面朝下', '一样深'],
    answer: 0,
  },
  conclusion: {
    page: 45, rect: [62, 393, 360, 560],       // 课本第 41 页
    quote: '实验结果表明，海绵在压力作用下的形变情况不仅跟压力的大小有关，而且跟受力面积有关。在物理学中，物体所受压力的大小与受力面积之比叫作压强。',
    formula: '<i>p</i> = <i>F</i> / <i>S</i>',
    why: '甲和乙：受力面积相同（都是四条桌腿），乙的压力大，海绵凹陷得深。乙和丙：压力相同（小桌和一个钩码），丙的受力面积大得多，海绵几乎看不出凹陷。所以压力的作用效果（海绵形变的程度）与压力和受力面积都有关——压力越大、受力面积越小，作用效果越明显。这就是压强 p = F/S。',
    src: '课本第 41 页 · 第九章 第1节 压强',
  },

  create({ tag }) {
    const group = new THREE.Group();
    // ---- 海绵：侧面是盒子，上表面是一张会凹下去的网格 ----
    const spongeTex = canvasTex(512, 320, (g, w, h) => {
      g.fillStyle = '#efc94c'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 520; i++) { const r = 1.5 + Math.random() * 5; g.fillStyle = `rgba(${170 + Math.random() * 40},${120 + Math.random() * 30},20,${0.25 + Math.random() * 0.35})`; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, r, r * 0.8, 0, 0, 7); g.fill(); }
    });
    const side = new THREE.MeshLambertMaterial({ map: spongeTex });
    const box = inked(new THREE.Mesh(new THREE.BoxGeometry(SW, SH, SD), [side, side, new THREE.MeshBasicMaterial({ visible: false }), side, side, side]), { width: 1.2 });
    box.position.y = SH / 2;
    group.add(box);
    const NX = 110, NZ = 70;
    const topGeo = new THREE.PlaneGeometry(SW, SD, NX, NZ);
    topGeo.rotateX(-Math.PI / 2);
    const top = new THREE.Mesh(topGeo, new THREE.MeshLambertMaterial({ map: spongeTex }));
    top.position.y = SH;
    group.add(top);
    const base = topGeo.attributes.position.array.slice();

    // ---- 小桌 ----
    const tbl = new THREE.Group();
    const steel = paint(0x8fc2d6);
    const plate = inked(new THREE.Mesh(new THREE.BoxGeometry(TW, 0.004, TD), steel), { width: 1.2 });
    plate.position.y = LEG + 0.002;
    tbl.add(plate);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const l = inked(new THREE.Mesh(new THREE.BoxGeometry(LW, LEG, LW), steel), { width: 1 });
      l.position.set(sx * (TW / 2 - LW), LEG / 2, sz * (TD / 2 - LW));
      tbl.add(l);
    }
    group.add(tbl);
    const weights = [hookWeight({ r: 0.012, h: 0.022 }), hookWeight({ r: 0.012, h: 0.022 })];
    weights.forEach((w) => group.add(w));
    const dTag = tag('', 'pill');

    const S = { flip: false, n: 0, d: 0, seen: new Map(), asked: {}, settle: 0, on: [], drag: null, dragPos: new THREE.Vector3(), flipT: 1 };   // on：放在小桌上的钩码；flipT 0→1 是翻转动画
    let W = null;
    const F = () => GT + GW * S.n, area = () => (S.flip ? S_TOP : S_LEGS), target = () => F() / area() / KS;
    // 接触区域（局部 xz 上的矩形）
    const rects = () => S.flip ? [[-TW / 2, TW / 2, -TD / 2, TD / 2]] : [-1, 1].flatMap((sx) => [-1, 1].map((sz) => { const cx = sx * (TW / 2 - LW), cz = sz * (TD / 2 - LW); return [cx - LW / 2, cx + LW / 2, cz - LW / 2, cz + LW / 2]; }));
    const deform = () => {
      const pos = topGeo.attributes.position, R = rects(), fall = S.flip ? 0.018 : 0.014;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3], z = base[i * 3 + 2];
        let k = 0;
        for (const [x0, x1, z0, z1] of R) {
          const dx = Math.max(x0 - x, 0, x - x1), dz = Math.max(z0 - z, 0, z - z1), dd = Math.hypot(dx, dz);
          k = Math.max(k, dd === 0 ? 1 : Math.max(0, 1 - dd / fall) ** 2);
        }
        pos.setY(i, -S.d * k);
      }
      pos.needsUpdate = true;
      topGeo.computeVertexNormals();
    };
    const layout = () => {
      // 小桌：腿朝下时腿底陷进海绵 d；桌面朝下时桌面陷进 d
      // 翻转动画：绕桌子中心转半圈，同时抬起来一点
      const t = S.flip ? S.flipT : 1 - S.flipT, e = t * t * (3 - 2 * t);
      const yUp = SH - S.d, yDn = SH - S.d + LEG + 0.004;
      tbl.rotation.x = Math.PI * e;
      tbl.position.set(0, yUp + (yDn - yUp) * e + Math.sin(Math.PI * e) * 0.04, 0);
      const topY = S.flip ? SH - S.d + 0.004 : SH - S.d + LEG + 0.004;     // 钩码放的那个面
      S.n = S.on.length;
      S.on.forEach((w, i) => w.position.set((i - (S.n - 1) / 2) * 0.03, topY + w.height + (S.flipT < 1 ? 0.06 : 0), 0));
      let k = 0;
      weights.forEach((w) => { if (w === S.drag) w.position.copy(S.dragPos); else if (!S.on.includes(w)) { w.position.set(SW / 2 + 0.03 + k * 0.032, w.height, 0.02); k++; } });
      dTag.loc(group, SW / 2 - 0.02, SH + 0.02, SD / 2).text(`凹陷约 ${(S.d * 1000).toFixed(1)} mm`);
    };
    deform(); layout();
    // 直接动手：拖钩码放到小桌上 / 拿下来；点小桌把它翻过来
    const pointer = draggable(group, [
      ...weights.map((w) => ({ obj: w, plane: 'xy', offset: 0, keepOffset: true, hint: () => (S.on.includes(w) ? '拖开就拿下来' : '拖到小桌上'),
        onStart: () => { S.on = S.on.filter((x) => x !== w); S.drag = w; S.dragPos.copy(w.position); S.settle = 0; },
        onDrag: (p) => S.dragPos.copy(p),
        onEnd: () => { S.drag = null; if (Math.abs(S.dragPos.x) < TW / 2 + 0.01 && S.dragPos.y > SH && S.dragPos.y < SH + LEG + 0.09) { S.on.push(w); S.settle = 0; } } })),
    ], { tip: tag('', 'pill'), taps: [{ obj: tbl, hint: () => (S.flip ? '点一下：翻回来（桌腿朝下）' : '点一下：把小桌翻过来（桌面朝下）'), onTap: () => { if (S.flipT < 1) return; S.flip = !S.flip; S.flipT = 0; S.settle = 0; } }] });
    const name = () => (S.flip ? '丙' : S.n ? '乙' : '甲');

    return {
      group,
      pointer,
      size: { w: 0.3, d: 0.16, h: 0.1 },
      view: { elev: 24, azim: 0, lookY: 0.35, margin: 1.15 },
      mount(ui) {
        const out = readout([{ key: 'f', label: '压力 F', unit: 'N' }, { key: 's', label: '受力面积 S', unit: 'cm²' }, { key: 'd', label: '海绵凹陷（模拟值）', unit: 'mm' }]);
        const tb = table(['', '小桌', '压力 F/N', '受力面积', '海绵凹陷'], { note: '凹陷的毫米数是按海绵软硬估算的模拟值；课本上只比较“深、浅”。' });
        const flip = seg('小桌', ['桌腿朝下', '桌面朝下'], (_, k) => { if (!!k !== S.flip && S.flipT >= 1) { S.flip = !!k; S.flipT = 0; S.settle = 0; } });
        const nw = seg('桌上的钩码', ['不放', '1 个', '2 个'], (_, k) => { S.on = weights.slice(0, k); S.settle = 0; });
        S.sync = () => { flip.set(S.flip ? 1 : 0); nw.set(S.on.length); };
        ui.controls.append(flip.el, nw.el, note('也可以直接动手：<b>把旁边的钩码拖到小桌上</b>（拖开就拿下来）；<b>点小桌</b>把它翻过来。'), out.el, note('小桌重 1 N，每个钩码重 2 N。桌腿 4 条，每条底面 0.81 cm²；桌面 59 cm²。'));
        ui.data.append(tb.el);
        const cq = buttons([0, 1, 2].map(() => ({ text: '', ghost: true, onClick: () => {} })));
        cq.el.hidden = true;
        ui.controls.prepend(cq.el);
        const CMP = {
          ab: { q: '比较甲、乙：<b>受力面积相同</b>（都是桌腿朝下），乙的压力大。看海绵——', opts: ['压力越大，海绵凹陷越深', '压力越大，海绵凹陷越浅', '凹陷一样深，和压力无关'], ok: '对：受力面积相同时，<b>压力越大</b>，压力的作用效果越明显。现在把小桌翻过来（桌面朝下），保持一个钩码。' },
          bc: { q: '比较乙、丙：<b>压力相同</b>（都是一个钩码），丙是桌面朝下、受力面积大。看海绵——', opts: ['受力面积越小，海绵凹陷越深', '受力面积越大，海绵凹陷越深', '凹陷一样深，和受力面积无关'], ok: '对：压力相同时，<b>受力面积越小</b>，压力的作用效果越明显。' },
        };
        W = { askCmp: (id) => {
          const c = CMP[id], sh = [0, 1, 2].sort(() => Math.random() - 0.5);
          cq.btns.forEach((b, j) => { b.textContent = c.opts[sh[j]]; b.onclick = () => { if (sh[j]) return ui.status('再看看表格里这两行海绵的凹陷，和两次不同的地方。'); cq.el.hidden = true; W.goal.done(id); ui.status(c.ok); }; });
          cq.el.hidden = false; ui.status(c.q);
        }, out, tb, status: (m) => ui.status(m), goal: goals(ui, [['ab', '比较甲、乙：受力面积相同，压力不同'], ['bc', '比较乙、丙：压力相同，受力面积不同']]) };
        ui.status('图甲：小桌桌腿朝下放在海绵上。把一个钩码<b>拖到小桌上</b>（图乙），再<b>点小桌</b>把它翻过来（图丙），比较海绵的凹陷。');
      },
      update(dt) {
        S.flipT = Math.min(1, S.flipT + dt * 1.6);
        S.sync?.();
        S.d += ((S.flipT < 1 ? 0 : target()) - S.d) * Math.min(1, dt * 5);
        S.settle += dt;
        deform(); layout();
        if (!W) return;
        W.out.set('f', F(), 0); W.out.set('s', area() * 1e4, 1); W.out.set('d', S.d * 1000, 1);
        if (S.settle > 1 && S.flipT >= 1 && !S.drag && !S.seen.has(`${S.flip}|${S.n}`)) {
          S.seen.set(`${S.flip}|${S.n}`, true);
          const lab = !S.flip && S.n === 0 ? '甲' : !S.flip && S.n === 1 ? '乙' : S.flip && S.n === 1 ? '丙' : '—';
          W.tb.add([lab, S.flip ? '桌面朝下' : '桌腿朝下', F().toFixed(0), S.flip ? '大（桌面）' : '小（四条腿）', `${(S.d * 1000).toFixed(1)} mm`], { highlight: false });
          const has = (f, n) => S.seen.has(`${f}|${n}`);
          // 有了能比较的两组，就让学生自己比
          if (has(false, 0) && has(false, 1) && !S.asked.ab) { S.asked.ab = true; W.askCmp('ab'); return; }
          if (has(false, 1) && has(true, 1) && !S.asked.bc) { S.asked.bc = true; W.askCmp('bc'); return; }
          W.status(`图${name()}：压力 ${F()} N，${S.flip ? '桌面' : '四条桌腿'}压在海绵上，海绵凹陷约 ${(S.d * 1000).toFixed(1)} mm。${has(false, 0) && has(false, 1) && !has(true, 1) ? '现在把小桌翻过来（桌面朝下），保持一个钩码。' : ''}`);
        }
      },
      debug: { S, weights, tbl },
    };
  },
};
