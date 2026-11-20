// 人教版选必 2 印刷第 49 页研究与实践，PDF 从零起算第 51 页。
import * as THREE from 'three';
import { h } from '../ui/Panel.js';
import { lessonBar } from './kit/lessonbar.js';
import { demoActs, moreBox, mountXuean, paperSheet, qaFlow, sandbox, wrapPointer } from './kit/chemlesson.js';
import { draggable, clamp } from './kit/interact.js';
import { seg, table } from './kit/ui.js';
import { micro } from './kit/microworld.js';
import { along, centerOf, clearTetraView, home, lengthOf, makeRig, microScene, models, radius, restDir, sheet, V } from './kit/vsepr-parts.js';

const turn = '拖动搭好的模型，换个方向看。';
const turnMethane = '拖动甲烷模型，看清四个白球。绿色底面出现时松手。';
const seeFace = '绿色三角形标出三个氢构成的底面。找一找底面外的第四个氢。';
const miss = '牙签还没插进中心球。把黏土球对准虚线末端，再松手。';
const notes = '键长和键角取自第 49 页。球心间距按键长同比例放大。虚线辅助定位，一根牙签表示一个成键方向。球径、孤电子对的形状和大小均为示意。';
const task = '用橡皮泥或黏土和牙签等材料制作下列分子的空间结构模型。';
const question = '水、氨和甲烷的中心原子周围各有四对价层电子对，为什么三个键角不同？';
const fresh = () => ({
  k: 0, demo: false, grip: null, returns: [], message: '', faceTime: 0,
  pages: models.map(m => ({ slots: m.dirs.slice(1).map(() => -1), q: new THREE.Quaternion(), observed: false })),
});
const ready = p => !p.slots.includes(-1);
const orientRest = along(restDir);

export default {
  id: 'vsepr', title: '制作分子的空间结构模型', fig: '研究与实践', style: 'paper', stampText: '观察',
  predict: { q: '甲烷的结构式像个十字。把模型转过来，四个氢原子会在同一个平面内吗？',
    options: ['会，四个氢围成一个正方形', '不会，有的氢伸向前后'], answer: 1 },
  need: '搭建并转动四种分子的模型。',
  conclusion: {
    crops: [{ page: 48, rect: [219, 56, 532, 303] }],
    quote: '略去VSEPR模型中的中心原子上的孤电子对，便得到了H2O的空间结构为Ｖ形，NH3的空间结构为三角锥形（如图2-14）。',
    formula: '', src: '课本第 46 页 · 价层电子对互斥模型',
  },
  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    paperSheet(group, { w: 0.36, d: 0.21, z: 0 });
    const rigs = models.map(m => { const r = makeRig(m); r.frame.add(sheet(m)); group.add(r.frame); return r; });
    const card = tag('', 'cond'), scene = microScene();
    let S = fresh(), W, cancelled = false, generation = 0;
    const model = () => models[S.k], page = () => S.pages[S.k], rig = () => rigs[S.k];
    const center = () => centerOf(model(), page().q);
    const aim = j => model().dirs[j].clone().multiplyScalar(lengthOf(model())).applyQuaternion(page().q).add(center());
    const missing = () => S.pages.findIndex(p => !p.observed);
    const count = () => page().slots.filter(n => n > 0).length + 1;
    function instruction() {
      if (!ready(page())) return S.k === 1
        ? '把红色黏土球拖到虚线末端。每根牙签表示一个成键方向，CO₂ 两侧都是双键。'
        : '拖住白色黏土球，对准虚线末端，把牙签插进中心球。';
      if (S.faceTime > 0) return seeFace;
      if (!page().observed) return rig().face ? turnMethane : turn;
      const i = missing();
      return i < 0 ? '四种模型都已观察，可以掀开课本结论。' : '在学案中选' + models[i].formula + '，继续搭建。';
    }
    function guide(msg = instruction()) {
      if (S.demo || !W) return;
      S.message = msg; W.ui.status(msg); bar.say(msg);
    }
    function render(k = S.k) {
      const r = rigs[k], m = models[k], p = S.pages[k];
      r.hub.position.copy(centerOf(m, p.q)); r.hub.quaternion.copy(p.q);
      r.pieces.forEach((b, i) => {
        const j = p.slots[i];
        if (j > 0) {
          if (b.parent !== r.hub) r.hub.add(b);
          b.position.copy(m.dirs[j]).multiplyScalar(lengthOf(m)); b.quaternion.copy(along(m.dirs[j]));
        } else {
          if (b.parent !== r.frame) r.frame.add(b);
          const held = k !== S.k ? null : S.grip?.i === i ? S.grip : S.returns.find(v => v.i === i);
          b.position.copy(held ? held.pos : home(m, i)); b.quaternion.copy(held ? held.q : orientRest);
          b.userData.ringY = b.position.y - radius(m.outer) + 0.002;
        }
        r.guides[i].visible = !p.slots.includes(i + 1);
      });
      if (r.face) r.face.visible = k === S.k && (S.faceTime > 0 ||
        (S.grip?.i === -1 && S.grip.q.angleTo(p.q) > 0.01 && clearTetraView(m, r.hub, window.__lb.stage.camera)));
      r.angle.visible = p.slots.includes(1) && !r.face?.visible;
      group.updateMatrixWorld(true);
    }
    function present() {
      rigs.forEach((r, k) => { r.frame.visible = k === S.k; });
      render();
      if (!W) return;
      W.pick.set(S.k);
      models.forEach((m, k) => { W.pick.tick(k, S.pages[k].observed); W.pick.disable(k, S.demo); });
      W.reference.textContent = model().formula + '　键长 ' + model().pm + ' pm　键角 ' + model().angle;
      W.ui.el.classList.toggle('vsepr-demo', S.demo);
      W.demoSheet.hidden = !S.demo;
      W.demoRows.forEach((row, k) => row.classList.toggle('vsepr-current', k === S.k));
    }
    function select(k) {
      mic.close(); S.k = k; S.grip = null; S.returns = []; S.faceTime = 0;
      present(); guide();
    }
    function record() {
      if (page().observed) return;
      page().observed = true;
      if (S.demo) return;
      const m = model(); W.tbl.add([m.formula, m.shape, m.angle]); W.pick.tick(S.k);
      if (S.k === 3) W.ui.observePrediction('转动甲烷模型，四个氢位于正四面体的四个顶点。');
      bar.done(m.formula);
      W.next.hidden = !bar.finished; W.optional.hidden = !bar.finished;
    }
    // 维持鼠标投影，靠近空位时才沿视线连续改变深度。两端都到位才完成连接。
    function inPlane(p, eye, z) { return eye.clone().lerp(p, (z - eye.z) / (p.z - eye.z)); }
    function grab(i, p) {
      const b = i < 0 ? rig().hub : rig().pieces[i];
      S.faceTime = 0;
      S.returns = S.returns.filter(x => x.i !== i);
      S.grip = { i, start: p.clone(), pos: b.position.clone(), q: b.quaternion.clone(), slot: -1 };
    }
    function move(i, p) {
      const g = S.grip;
      if (!g || g.i !== i) return;
      if (i < 0) {
        const dx = (p.x - g.start.x) * 20, dy = (p.y - g.start.y) * 20;
        page().q.setFromEuler(new THREE.Euler(-dy, dx, 0, 'YXZ')).multiply(g.q);
      } else {
        const m = model(), z = home(m, i).z, eye = group.worldToLocal(window.__lb.stage.camera.getWorldPosition(V()));
        const flat = inPlane(p, eye, z); let min = Infinity, j = -1;
        for (let s = 1; s < m.dirs.length; s++) {
          if (page().slots.includes(s)) continue;
          const d = flat.distanceTo(inPlane(aim(s), eye, z));
          if (d < min) { min = d; j = s; }
        }
        if (j < 0) return;
        const end = aim(j), u = 1 - THREE.MathUtils.smoothstep(min, 0.002, 0.055);
        g.pos.copy(inPlane(flat, eye, z + (end.z - z) * u));
        g.q.copy(orientRest).slerp(along(m.dirs[j].clone().applyQuaternion(page().q)), u);
        const dy = V(0, lengthOf(m), 0).applyQuaternion(g.q).y;
        g.pos.y = Math.max(g.pos.y, dy + 0.002, radius(m.outer) + 0.0015); g.slot = j;
      }
      render();
    }
    function release(i, moved) {
      const g = S.grip; S.grip = null;
      if (!g || !moved) { render(); if (i < 0) guide(); return; }
      if (i < 0) {
        if (!cancelled) {
          if (rig().face?.visible) S.faceTime = 1.6;
          else if (!rig().face && g.q.angleTo(page().q) >= 0.18) record();
        }
        guide();
      } else {
        const m = model(), tip = V(0, -lengthOf(m), 0).applyQuaternion(g.q).add(g.pos);
        if (!cancelled && g.slot > 0 && g.pos.distanceTo(aim(g.slot)) < 0.006 && tip.distanceTo(center()) < radius(m.center) * 0.5) {
          page().slots[i] = g.slot; guide();
        } else {
          S.returns.push({ i, pos: g.pos, q: g.q, from: g.pos.clone(), fromQ: g.q.clone(), t: 0 }); guide(miss);
        }
      }
      render();
    }
    const drags = rigs.flatMap((r, k) => [r.hub, ...r.pieces].map((obj, n) => {
      const i = n - 1, m = models[k];
      return { obj, plane: 'xy', offset: i < 0 ? centerOf(m).z : home(m, i).z, keepOffset: i >= 0,
        enabled: () => S.k === k && !mic.isOpen && (i < 0 ? ready(page()) : page().slots[i] < 0),
        hint: i < 0 ? (r.face ? turnMethane : turn) : '拖动黏土球，把牙签插进中心球',
        onStart: p => grab(i, p), onDrag: p => move(i, p), onEnd: moved => release(i, moved),
      };
    }));
    const drag = draggable(group, drags, { tip: tag('', 'pill') });
    const pointer = { ...drag, items: () => drags.filter(d => d.enabled()), up(ray, e) {
      cancelled = e?.type === 'pointercancel'; const hit = drag.up(ray, e); cancelled = false; return hit;
    } };

    const at = () => V(-0.045, 0.078, 0);
    const mic = micro({ tag, look, back, group, scene, at, label: '钻进去看', btnAt: () => V(0.079, 0.088, 0),
      state: () => ({ k: S.k }), key: () => S.k, show: () => ready(page()), bar: () => bar,
      scale: 0.014, dist: 0.34, lookD: [0.03, 0.24, 1] });
    const hud = Array.from(document.querySelectorAll('.mw')).pop(); hud.classList.add('vsepr-micro');
    const columns = [0, 2, 3].map(k => {
      const m = models[k];
      return h('div', {}, h('b', {}, m.formula + '　' + m.angle), h('small', {}, '孤电子对 ' + m.lone.length + ' 对'));
    });
    const comparison = h('div', { class: 'vsepr-compare', 'aria-label': '已观察的模型' }, columns);
    const pause = h('button', { onclick: () => { scene.paused = !scene.paused; } }, '暂停');
    const replay = h('button', { onclick: () => { scene.elapsed = 0; scene.paused = false; } }, '重看');
    const playback = h('div', { class: 'vsepr-play' }, pause, replay);
    hud.querySelector('.mw-hud').append(comparison, playback);
    const layout = h('style', {}, `
      .vsepr-demo .p-body {display:none}
      .vsepr-demo-sheet {padding:4px 15px;color:#35463f}
      .vsepr-demo-sheet .vsepr-current {background:#e1e9df;font-weight:700}
      .vsepr-micro .vsepr-play {margin:8px 0;pointer-events:auto}
      .vsepr-play button {background:#fffaf0;border:1px solid #aaa99a;color:#384b49;font:inherit;font-size:13px;padding:4px 13px;border-radius:14px;margin:0 3px;cursor:pointer}
      .vsepr-compare {display:flex;justify-content:center;gap:16px;color:#314d4b;margin-top:8px}
      .vsepr-compare[hidden],.vsepr-play[hidden] {display:none}
      .vsepr-compare b,.vsepr-compare small {display:block;font:14px/1.5 Arial,sans-serif}
      .vsepr-compare small {font-size:12px}
      .vsepr-micro .mw-eq,.vsepr-ref,.vsepr-models .seg button {font-family:Arial,sans-serif}
      .vsepr-ref {color:#425e58;border-left:2px solid #779587;padding-left:9px;margin:6px 0 10px;font-size:14px}
      @media(max-width:760px) {
        .vsepr-micro .mw-hud,.vsepr-micro .mw-scale {left:3vw!important;width:94vw!important}
        .vsepr-micro .mw-hud {top:48vh!important;background:#fbf8ef;padding:14px 8px;box-sizing:border-box;border-top:2px solid #83978b}
        .vsepr-micro .mw-dim {background-color:rgba(245,242,233,.84);mask-image:none;-webkit-mask-image:none}
        .vsepr-micro .mw-close {left:auto!important;right:6px;top:7vh!important}
        .vsepr-micro .mw-scale {top:8vh!important;text-align:left}
      }
    `); document.head.append(layout);

    const act = demoActs(drag, group);
    const turnEnd = k => centerOf(models[k]).add(k === 3 ? V(-0.022, 0, 0) : V(0.051, 0.016, 0));
    const shots = [];
    models.forEach((m, k) => {
      const r = rigs[k], last = r.pieces.length, n = last + (r.face ? 2 : 1);
      const actions = r.pieces.map((b, i) => act.drag(b, () => aim(i + 1), {
        from: () => home(m, i), t0: (i + 0.04) / n, t1: (i + 0.79) / n, release: (i + 0.86) / n }));
      actions.push(act.drag(r.hub, () => turnEnd(k), { from: center, t0: (last + 0.06) / n, t1: (last + 0.86) / n, release: (last + 0.92) / n }));
      const during = act.seq(...actions);
      shots.push({ cap: r.face ? '转动甲烷模型，看看哪三个氢构成标出的底面。' : '接好' + m.formula + '的牙签，转动模型看键角。', dur: n * 1.9, during, enter: () => { select(k); during(0); } });
      if (!k) shots.push({ cap: '看氧原子的两个成键方向和两对孤电子对。', dur: 8,
        enter: () => mic.open(true), cam: [[-0.045, 0.128, 0], [0.03, 0.24, 1], 0.34] });
    });
    const box = sandbox({ get: () => S, set: s => { S = s; }, fresh, apply() {
      mic.close(); rigs.forEach((r, k) => render(k)); present();
      if (!S.demo) guide(S.message || instruction());
    }, view: { save: () => mic.isOpen ? { t: scene.elapsed, paused: scene.paused, generation } : null,
      restore: v => { if (v.generation === generation && !bar.playing) { mic.open(); scene.elapsed = v.t; scene.paused = v.paused; } } } });
    const bar = lessonBar({ group, look, back, ringOptions: { minOpacity: 0.63 },
      steps: models.map(m => ({ id: m.formula, title: '转动' + m.formula, todo: '搭建并转动' + m.formula + '模型。',
        target: () => mic.isOpen || page().observed || rig().face?.visible ? null : rig().pieces[page().slots.indexOf(-1)] || rig().hub })),
      reels: { demo: { ...box, label: '老师演示', shots } } });
    function reset() {
      if (bar.playing) bar.stop(); generation++;
      S = fresh(); mic.close(); W.tbl.clear(); W.ui.relock(); W.ui.observePrediction('');
      bar.undo(...models.map(m => m.formula)); W.optional.hidden = W.next.hidden = true;
      select(0);
    }
    const qa = [];
    models.forEach((m, k) => {
      const r = rigs[k];
      if (k) qa.push({ name: '选择' + m.formula, run: () => W.pick.set(k, true), wait: 0.2 });
      qa.push(...qaFlow(drag, r.pieces.map((b, i) => ({ name: m.formula + '接第' + (i + 2) + '根牙签', drag: b, to: () => aim(i + 1), wait: 0.3 }))));
      qa.push({ name: '转动' + m.formula, mouse: { kind: 'drag', obj: r.hub, to: () => turnEnd(k), over: drag.hovered },
        run() { grab(-1, center()); move(-1, turnEnd(k)); release(-1, true); }, wait: r.face ? 2 : 0.3 },
      { name: '钻进' + m.formula, run() {
        if (!page().observed) throw Error(m.formula + '未观察'); mic.open();
      }, wait: 4 }, { name: '回到' + m.formula + '模型', run: () => mic.close(), wait: 2.5 });
    });
    present();
    return { group: root, style: 'paper', card: false, toggles: ['cards', 'steps'],
      size: { w: 0.34, h: 0.145, d: 0.19 }, view: { elev: 25, azim: 1, lookY: 0.4, frameMargin: 1.07 },
      pointer: wrapPointer(pointer, bar), reset,
      update(dt) {
        const speed = bar.update(dt);
        if (S.faceTime > 0) {
          const visible = !mic.isOpen && clearTetraView(model(), rig().hub, window.__lb.stage.camera);
          S.faceTime = visible ? Math.max(0, S.faceTime - dt * speed) : 0;
          if (!S.faceTime) {
            if (visible) record();
            render(); guide();
          }
        }
        if (S.returns.length) {
          for (const v of S.returns) {
            v.t += dt * speed; const u = clamp(v.t / 0.4, 0, 1);
            v.pos.lerpVectors(v.from, home(model(), v.i), u); v.q.slerpQuaternions(v.fromQ, orientRest, u);
          }
          S.returns = S.returns.filter(v => v.t < 0.4); render();
        }
        rig().frame.visible = !mic.isOpen;
        const m = model(), complete = ready(page());
        const label = !complete ? '搭建中' : rig().face && !page().observed ? '已搭好' : m.shape;
        card.text('<div class="cc"><div class="cc-t"><span class="cc-name">' + m.formula + ' 模型</span><span class="cc-res">' + label +
          '</span></div><div class="cc-note">' + (complete ? '键角 ' + m.angle : '已接 ' + count() + ' 根牙签') + '</div></div>')
          .loc(group, -0.087, center().y + (S.k === 3 ? 0.081 : 0.045), -0.012).show(!mic.isOpen && !S.demo && !S.grip);
        mic.update(dt, speed);
        if (mic.isOpen) {
          playback.hidden = S.demo;
          pause.textContent = scene.paused ? '继续' : '暂停';
          const hydrides = [0, 2, 3];
          comparison.hidden = S.k === 1 || hydrides.filter(k => S.pages[k].observed).length < 2;
          columns.forEach((col, i) => { col.hidden = !S.pages[hydrides[i]].observed; });
        }
      },
      mount(ui) {
        const pick = seg('选择分子', models.map(m => m.formula), (_, k) => { if (!bar.playing) select(k); });
        pick.el.classList.add('vsepr-models');
        const reference = h('p', { class: 'vsepr-ref' });
        const source = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'), h('p', { class: 'fineprint' }, task), h('p', { class: 'fineprint' }, notes));
        const optional = h('details', { class: 'more', hidden: true }, h('summary', {}, '想一想（选做）'), h('p', {}, question),
          h('p', { class: 'fineprint' }, '水、氨和甲烷的中心原子上分别有两对、一对和零对孤电子对。孤电子对有较大斥力，这三个分子中，孤电子对越多，键角越小。'));
        const base = mountXuean(ui, { controls: [pick, reference, source, moreBox([], reset)], headers: ['分子', '空间结构', '键角（课本值）'] });
        const next = ui.el.querySelector('button.go[disabled]') || ui.data.nextElementSibling;
        base.next.remove(); next.classList.add('big-next'); next.textContent = '掀开课本上的结论 →'; next.hidden = true;
        ui.data.after(next, optional);
        const values = table(['分子', '键长 / pm', '键角']);
        models.forEach(m => values.add([m.formula, String(m.pm), m.angle], { highlight: false }));
        const demoSheet = h('div', { class: 'vsepr-demo-sheet', hidden: true }, h('p', {}, task), values.el);
        ui.el.append(demoSheet);
        W = { ...base, ui, next, pick, reference, optional, demoSheet, demoRows: values.el.querySelectorAll('tbody tr') }; bar.attach(ui); select(0); ui.observePrediction('');
      },
      dispose() { generation++; layout.remove(); W?.ui.el.classList.remove('vsepr-demo'); mic.dispose(); drag.dispose(); bar.dispose(); },
      debug: { get S() { return S; }, bar, qa },
    };
  },
};
