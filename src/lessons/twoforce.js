// 图8.2-3 探究二力平衡的条件。光滑的水平桌面上放一辆小车，两端的细绳跨过桌边的定滑轮挂着托盘，往托盘里加钩码。
//   1 两边钩码质量不相等 → 小车向重的一边加速运动；2 相等 → 小车保持静止（推一下，就保持匀速直线运动）；
//   3 相等，但把小车扭转一个角度后释放 → 两个拉力不在同一直线上，小车转回来。
// 物理：整体 a = (m右 − m左)g / (M + m左 + m右)；扭转后两根绳的拉力对小车中心有力矩，使它转回来（有阻尼）。
import * as THREE from 'three';
import { buttons, goals, note, readout, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { paint, inked, hull, arrow, MAGENTA } from '../live/ink.js';

const G = 9.8, MC = 0.2, MP = 0.01, MW = 0.05;   // 小车、托盘、每个钩码的质量（kg）
const TY = 0.22, HALF = 0.2, PX = HALF + 0.016;   // 桌面高度、桌面半长、滑轮位置
const D = 0.045, HOOKY = TY + 0.022, PR = 0.012;  // 小车挂钩离中心、挂钩高度、滑轮半径

export default {
  id: 'twoforce',
  fig: '图8.2-3',
  title: '探究二力平衡的条件',
  stampText: '探究',
  predict: {
    q: '两个托盘里的钩码质量相等，小车静止。<br>把小车在桌面上<b>扭转一个角度</b>后释放，小车会——',
    hint: '课本第 24 页「实验」',
    options: ['停在扭转后的位置', '转回来', '一直转下去'],
    answer: 1,
  },
  conclusion: {
    page: 29, rect: [62, 302, 360, 368],        // 课本第 25 页
    quote: '作用在同一物体上的两个力，如果大小相等、方向相反，并且在同一直线上，这两个力就彼此平衡。这就是二力平衡的条件。',
    why: '两边钩码不相等时，两个拉力大小不等，小车向拉力大的一边加速运动；相等时，小车受到的两个拉力大小相等、方向相反，小车保持静止——推它一下，它就保持匀速直线运动，这也是平衡状态。把小车扭转一个角度，两个拉力虽然大小相等、方向相反，却不在同一直线上，它们使小车转动，直到两个力重新回到同一直线上。',
    src: '课本第 24–25 页 · 第八章 第2节 二力平衡',
  },

  create({ tag }) {
    const group = new THREE.Group();
    const wood = paint(0xe9d7b0), woodD = paint(0xcdb68a);
    // 桌子
    const top = inked(new THREE.Mesh(new THREE.BoxGeometry(HALF * 2, 0.012, 0.1), wood), { width: 1.3 });
    top.position.y = TY - 0.006;
    const apron = inked(new THREE.Mesh(new THREE.BoxGeometry(HALF * 1.7, 0.02, 0.08), woodD), { width: 1.1 });
    apron.position.y = TY - 0.022;
    group.add(top, apron);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const leg = inked(new THREE.Mesh(new THREE.BoxGeometry(0.014, TY - 0.012, 0.014), woodD), { width: 1.1 });
      leg.position.set(sx * HALF * 0.8, (TY - 0.012) / 2, sz * 0.03);
      group.add(leg);
    }
    // 滑轮
    const pulleys = [-1, 1].map((s) => {
      const g = new THREE.Group();
      const wheel = hull(new THREE.Mesh(new THREE.CylinderGeometry(PR, PR, 0.006, 24), paint(0xc8cdd4)), 0.0012);
      wheel.rotation.x = Math.PI / 2;
      const brk = inked(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.006, 0.014), paint(0x8f99a8)), { width: 1 });
      brk.position.set(-s * 0.01, -PR - 0.003, 0);
      g.add(wheel, brk);
      g.position.set(s * PX, HOOKY - PR, 0);
      group.add(g);
      return { g, wheel };
    });
    // 小车
    const cart = new THREE.Group();
    const body = inked(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.018, 0.04), paint(0xe3a86a)), { width: 1.3 });
    body.position.y = 0.017;
    cart.add(body);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const w = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.005, 18), paint(0xdfe3e8)), 0.0012);
      w.rotation.x = Math.PI / 2; w.position.set(sx * 0.024, 0.008, sz * 0.022);
      cart.add(w);
    }
    for (const sx of [-1, 1]) { const hk = new THREE.Mesh(new THREE.TorusGeometry(0.004, 0.001, 6, 12, Math.PI * 1.5), paint(0x8f99a8)); hk.position.set(sx * (D - 0.002), HOOKY - TY, 0); cart.add(hk); }
    group.add(cart);
    // 绳子
    const strings = [0, 1].map(() => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x3a3f4e })); group.add(l); return l; });
    // 托盘 + 钩码
    const pans = [-1, 1].map((s) => {
      const g = new THREE.Group();
      const disc = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.003, 24), paint(0xc8cdd4)), 0.001);
      const cone = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([0, 1, 2].flatMap((k) => { const a = (k / 3) * Math.PI * 2; return [new THREE.Vector3(0, 0.035, 0), new THREE.Vector3(Math.cos(a) * 0.02, 0.002, Math.sin(a) * 0.02)]; })), new THREE.LineBasicMaterial({ color: 0x3a3f4e }));
      g.add(disc, cone);
      const ws = Array.from({ length: 6 }, (_, k) => { const m = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.012, 18), paint(0x8a93a3)), 0.001); m.position.y = 0.0075 + k * 0.0125; g.add(m); return m; });
      group.add(g);
      return { g, ws, s };
    });
    const arrows = [arrow(MAGENTA, 0.0022), arrow(MAGENTA, 0.0022)];
    arrows.forEach((a) => group.add(a));
    const fTags = [tag('', 'pill'), tag('', 'pill')];

    const S = { n: [2, 1], x: 0, v: 0, th: 0, w: 0, held: true, seen: new Set(), still: 0, pushed: false, twisted: false, lastX: 0, lastT: 0, vx: 0 };
    // 桌子前沿一盒钩码：拖一个到托盘上就加一个；从托盘上拖走最上面那个就减一个
    const boxW = inked(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.008, 0.026), new THREE.MeshLambertMaterial({ color: 0x6b4a2b })), { width: 1 });
    boxW.position.set(-0.13, TY + 0.004, 0.036);
    const spare = Array.from({ length: 4 }, (_, k) => { const m = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.012, 18), paint(0x8a93a3)), 0.001); m.position.set(-0.154 + k * 0.016, TY + 0.014, 0.036); return m; });
    group.add(boxW, ...spare);
    const fw = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.012, 18), paint(0x8a93a3)), 0.001);   // 正被拖着的那个钩码
    fw.visible = false; group.add(fw);
    // 按着小车的手（一开始按着，松手小车才开始动）
    const hand = hull(new THREE.Mesh(new THREE.SphereGeometry(0.011, 14, 10), paint(0xf1c7a2)), 0.0012);
    hand.scale.set(1.4, 0.7, 1); group.add(hand);
    tag('钩码（50 g）', 'pill').loc(group, -0.13, TY + 0.005, 0.06);
    let W = null;
    // 绳的拉力：静止或匀速时等于托盘和钩码的重力；加速时不等（下落的一边拉力小于 mg，被拉起的一边大于 mg）
    const tension = (k) => {
      const mL = S.n[0] * MW + MP, mR = S.n[1] * MW + MP, m = k ? mR : mL;
      const free = !S.held && Math.abs(S.x) < 0.079;
      const a = free ? ((mR - mL) * G) / (MC + mL + mR) : 0;     // 向右为正
      return k ? m * (G - a) : m * (G + a);
    };
    let grab = null, fwFrom = null;
    const dropWeight = () => {
      fw.visible = false;
      const k = [0, 1].find((i) => fw.position.distanceTo(pans[i].g.position.clone().add(new THREE.Vector3(0, 0.03, 0))) < 0.065);
      if (k != null && S.n[k] < 6) { S.n[k]++; S.still = 0; S.pushed = false; W?.status(`${k ? '右' : '左'}盘加了一个钩码：左盘 ${S.n[0]} 个，右盘 ${S.n[1]} 个。${S.held ? '点一下小车，松开它。' : ''}`); }
      else if (fwFrom == null) W?.status('把钩码拖到左边或右边的<b>托盘</b>上松手。');
    };
    const pointer = draggable(group, [
      // 小车：按住拖——左右拖是移动它，往前后拖是扭转它；松手时有速度就是“推了一下”
      { obj: body, plane: 'xz', offset: TY + 0.02, hint: () => (S.held ? '点一下松手；按住拖可以移动、扭转小车' : '按住拖：移动、扭转小车；甩一下就是推'),
        onStart: (p) => { grab = p ? p.clone() : null; S.held = true; S.v = 0; S.w = 0; S.lastX = S.x; S.lastT = performance.now(); S.vx = 0; },
        onDrag: (p) => {
          if (!grab) return;
          const now = performance.now(), nx = clamp(p.x - grab.x + S.lastX * 0 + (S.dragX0 ?? (S.dragX0 = S.x)), -0.08, 0.08);
          S.vx = S.vx * 0.6 + ((nx - S.x) / Math.max(0.008, (now - S.lastT) / 1000)) * 0.4; S.lastT = now;
          S.x = nx;
          S.th = clamp(Math.atan2(-(p.z - grab.z) * 1.5, 0.05), -0.9, 0.9);
        },
        onEnd: (moved) => {
          S.dragX0 = undefined; grab = null; S.held = false; S.still = 0;
          if (moved && Math.abs(S.vx) > 0.02) { S.v = clamp(S.vx * 0.6, -0.08, 0.08); S.pushed = true; S.pushT = 0; W?.status('你推了它一下——看它松手后怎样运动。'); }
          if (Math.abs(S.th) > 0.15) { S.twisted = true; W?.status('扭转后松手了——看小车怎样动。'); }
          else if (!moved) W?.status('松开了小车——看它怎样运动。');
        } },
      // 钩码：从盒子里拖一个到托盘上
      { obj: boxW, plane: 'xy', offset: 0, hint: '拖一个钩码到托盘上',
        onStart: (p) => { fwFrom = null; fw.visible = true; if (p) fw.position.copy(p); },
        onDrag: (p) => fw.position.copy(p), onEnd: () => dropWeight() },
      ...spare.map((m) => ({ obj: m, plane: 'xy', offset: 0, hint: '拖到托盘上', onStart: (p) => { fwFrom = null; fw.visible = true; if (p) fw.position.copy(p); }, onDrag: (p) => fw.position.copy(p), onEnd: () => dropWeight() })),
      // 托盘：拖走最上面的一个钩码
      ...[0, 1].map((k) => ({ obj: pans[k].g, plane: 'xy', offset: 0, hint: () => (S.n[k] ? '拖走最上面的钩码' : '托盘（10 g）'),
        onStart: (p) => { if (!S.n[k]) { fwFrom = -1; return; } S.n[k]--; S.still = 0; S.pushed = false; fwFrom = k; fw.visible = true; if (p) fw.position.copy(p); },
        onDrag: (p) => { if (fw.visible) fw.position.copy(p); },
        onEnd: () => { if (fwFrom === -1) return; const was = fwFrom; dropWeight(); fwFrom = null; if (was != null && !fw.visible) W?.status(`拿走了一个钩码：左盘 ${S.n[0]} 个，右盘 ${S.n[1]} 个。`); } })),
    ], { tip: tag('', 'pill') });

    const layout = () => {
      cart.position.set(S.x, TY, 0);
      cart.rotation.y = S.th;
      hand.visible = S.held; hand.position.set(S.x, TY + 0.03, 0.01);
      const c = Math.cos(S.th), sn = Math.sin(S.th);
      for (let k = 0; k < 2; k++) {
        const s = k ? 1 : -1;
        const hook = new THREE.Vector3(S.x + s * D * c, HOOKY, -s * D * sn);
        const ptop = new THREE.Vector3(s * PX, HOOKY, 0), side = new THREE.Vector3(s * (PX + PR), HOOKY - PR, 0);
        const horiz = hook.distanceTo(ptop);
        const panY = 0.105 + (horiz - (PX - D));    // 绳长不变：水平段变短，多出来的绳子垂下去，托盘就下降
        const panTop = new THREE.Vector3(s * (PX + PR), panY + 0.035, 0);
        const pos = strings[k].geometry.attributes.position;
        pos.setXYZ(0, hook.x, hook.y, hook.z); pos.setXYZ(1, ptop.x, ptop.y, ptop.z); pos.setXYZ(2, panTop.x, panTop.y, panTop.z);
        pos.needsUpdate = true;
        void side;
        pans[k].g.position.set(s * (PX + PR), panY, 0);
        pans[k].ws.forEach((m, i) => (m.visible = i < S.n[k]));
        // 力的示意：画在小车的挂钩上，沿绳子方向
        const dir = ptop.clone().sub(hook).normalize();
        const F = tension(k);
        arrows[k].set(hook.clone().setY(HOOKY + 0.012), dir.multiplyScalar(0.02 + F * 0.03));
        fTags[k].loc(group, hook.x + s * 0.05, HOOKY + 0.035, hook.z).text(`F${k ? '₂' : '₁'} = ${F.toFixed(2)} N`);
      }
    };
    layout();

    return {
      group,
      size: { w: 0.5, d: 0.12, h: 0.26 },
      view: { elev: 22, azim: 0, lookY: 0.45, margin: 1.05 },
      pointer,
      mount(ui) {
        const out = readout([{ key: 'm', label: '左盘 / 右盘钩码', span: true }, { key: 's', label: '小车', span: true }]);
        const add = (k, d) => () => { S.n[k] = clamp(S.n[k] + d, 0, 6); S.still = 0; S.pushed = false; S.seen.delete('_'); ui.status(`左盘 ${S.n[0]} 个，右盘 ${S.n[1]} 个钩码。观察小车……`); };
        const b1 = buttons([{ text: '左盘 +1 个', ghost: true, onClick: add(0, 1) }, { text: '左盘 −1 个', ghost: true, onClick: add(0, -1) }, { text: '右盘 +1 个', ghost: true, onClick: add(1, 1) }, { text: '右盘 −1 个', ghost: true, onClick: add(1, -1) }]);
        const b3 = buttons([
          { text: '松开 / 按住小车', ghost: true, onClick: () => { S.held = !S.held; S.v = 0; S.still = 0; } },
          { text: '把小车放回中间', ghost: true, onClick: () => { S.x = 0; S.v = 0; S.th = 0; S.w = 0; S.still = 0; S.pushed = false; S.held = true; } },
          { text: '推一下小车', ghost: true, onClick: () => { S.held = false; S.v = 0.04; S.pushed = true; S.pushT = 0; } },
          { text: '扭转小车再释放', ghost: true, onClick: () => { S.held = false; S.th = 0.6; S.w = 0; S.twisted = true; } },
        ]);
        ui.controls.append(b1.el, b3.el);
        ui.controls.append(note('每个钩码 50 g，托盘 10 g。也可以直接动手：<b>把桌上盒子里的钩码拖到托盘上</b>（从托盘上拖走就减少）。<b>按住小车</b>可以挪动它、往前后拖把它扭转，松手看它怎样动；按住往旁边一甩，就是推了它一下。'), out.el);
        // 每种情况的观察记进表里；四种都做过以后，学生自己说出二力平衡的条件
        const tb = table(['两个拉力的大小', '是否在同一直线上', '小车怎样'], { note: '桌面光滑，小车受到的摩擦力可以不计。' });
        ui.data.append(tb.el);
        const law = buttons([0, 1, 2].map(() => ({ text: '', ghost: true, onClick: () => {} })));
        law.el.hidden = true;
        ui.controls.prepend(law.el);
        const LAW = ['大小相等、方向相反、作用在同一直线上', '大小相等就行，方向、是否在同一直线上都没关系', '方向相反、在同一直线上，大小不一定相等'];
        W = { row: (cells) => tb.add(cells), askLaw: () => {
          const sh = [0, 1, 2].sort(() => Math.random() - 0.5);
          law.btns.forEach((b, j) => { b.textContent = LAW[sh[j]]; b.onclick = () => { if (sh[j]) return ui.status('对照表格：哪几行小车保持静止或匀速？那几行的两个拉力有什么共同点？'); law.el.hidden = true; W.goal.done('law'); ui.status('对：作用在同一物体上的两个力，如果<b>大小相等、方向相反，并且作用在同一条直线上</b>，这两个力就彼此平衡。'); }; });
          law.el.hidden = false; ui.status('四种情况都看过了。对照表格：小车受到的两个拉力满足什么条件时，小车处于平衡状态？');
        }, out, status: (m) => ui.status(m), goal: goals(ui, [['unequal', '两个托盘里的钩码质量不相等'], ['equal', '两个托盘里的钩码质量相等'], ['twist', '质量相等时，把小车扭转一个角度后释放'], ['push', '（平衡时）推一下小车，看它怎样运动'], ['law', '对照记录，说出二力平衡的条件']]) };
        ui.status('桌面是光滑的。你正按着小车：左盘 2 个钩码、右盘 1 个。<b>点一下小车</b>松开它，看它怎样运动。');
      },
      update(dt) {
        if (W && !S.askedLaw && ['unequal', 'equal', 'twist', 'push'].every((k) => S.seen.has(k))) { S.lawT = (S.lawT || 0) + dt; if (S.lawT > 2.5) { S.askedLaw = true; W.askLaw(); } }     // 最后一个现象看完 2.5 s 再问
        const h = Math.min(dt, 1 / 30) * 0.6;     // 慢放
        const T1 = tension(0), T2 = tension(1);
        const mL = S.n[0] * MW + MP, mR = S.n[1] * MW + MP;
        if (!S.held) {
          // 直线运动
          const a = ((mR - mL) * G) / (MC + mL + mR);
          S.v += a * h;
          S.x += S.v * h;
          const lim = 0.08;          // 桌面两端有挡板
          if (Math.abs(S.x) > lim) { S.x = Math.sign(S.x) * lim; S.v = 0; }
          // 转动：τ = −(T₁ + T₂)·D·sinθ，阻尼让它停下来
          const I = (MC * 0.08 * 0.08) / 12;
          const tau = -(T1 + T2) * D * Math.sin(S.th);
          S.w += (tau / I) * h * 0.04 - S.w * 3 * h;
          S.th += S.w * h;
        }
        layout();
        const eq = S.n[0] === S.n[1];
        const moving = Math.abs(S.v) > 0.003;
        W?.out.set('m', `${S.n[0]} 个（${(mL * 1000).toFixed(0)} g） / ${S.n[1]} 个（${(mR * 1000).toFixed(0)} g）`);
        W?.out.set('s', S.held ? '被你扭着' : Math.abs(S.w) > 0.05 ? '在转动' : moving ? (eq ? '匀速直线运动' : `向${S.v > 0 ? '右' : '左'}加速运动`) : Math.abs(S.x) > 0.079 ? '撞到了桌边的挡板' : '静止');
        if (!W) return;
        if (!eq && moving && Math.abs(S.v) > 0.03 && !S.seen.has('unequal')) { S.seen.add('unequal'); W.goal.done('unequal'); W.row([`不相等（${T1 > T2 ? "左" : "右"}边的钩码多）`, '是', '向拉力大的一边加速，运动状态改变']); W.status(`两边钩码质量不相等：F₁ = ${T1.toFixed(2)} N，F₂ = ${T2.toFixed(2)} N。小车向拉力<b>大</b>的一边加速运动，运动状态改变了——不平衡。`); }
        if (eq && !moving && !S.held && Math.abs(S.th) < 0.02 && Math.abs(S.x) < 0.075) { S.still += dt; if (S.still > 1.2 && !S.seen.has('equal')) { S.seen.add('equal'); W.goal.done('equal'); W.row([`相等（都是 ${T1.toFixed(2)} N）`, '是', '保持静止']); W.status(`两边相等：F₁ = F₂ = ${T1.toFixed(2)} N，方向相反，在同一直线上，小车保持<b>静止</b>。再试试推一下，或者扭转一下。`); } }
        if (S.twisted && eq && Math.abs(S.th) < 0.05 && Math.abs(S.w) < 0.1 && !S.held) { S.twisted = false; if (!S.seen.has('twist')) { S.seen.add('twist'); W.goal.done('twist'); W.row(['相等', '扭转后<b>不在</b>同一直线上', '转回来，直到两个力在同一直线上']); W.status('扭转后，两个拉力大小相等、方向相反，但<b>不在同一直线上</b>——小车转了回来，直到两个力回到同一直线上才停住。'); } }
        if (S.pushed && eq) { S.pushT += dt; if (S.pushT > 1.5 && moving && !S.seen.has('push')) { S.seen.add('push'); W.goal.done('push'); W.row(['相等', '是', '推一下后保持匀速直线运动']); W.status('两边平衡时推一下：小车（在碰到挡板之前）保持<b>匀速直线运动</b>——这也是平衡状态，运动状态没有改变。'); } }
      },
      debug: { S, body, spare, pans, fw },
    };
  },
};
