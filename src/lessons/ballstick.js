// 人教版化学必修第二册，印刷第 95 页实验活动 8，第 70 页探究。
import * as THREE from 'three';
import { h } from '../ui/Panel.js';
import { lessonBar } from './kit/lessonbar.js';
import { demoActs, moreBox, mountXuean, paperSheet, qaFlow, sandbox, wrapPointer } from './kit/chemlesson.js';
import { clamp, draggable } from './kit/interact.js';
import { inviteRing } from './kit/invite.js';
import { show } from '../ui/prefs.js';
import { micro } from './kit/microworld.js';
import { seg } from './kit/ui.js';
import { groundLabel } from './kit/labels.js';
import { models, ball, comparison, home, origin, COLOR, R, sticks, modelSheet, drawFormula, structureScene, V } from './kit/ballstick-parts.js';

const intro = '把白色氢球拖到碳球伸出的棍端，松手接好。';
const rotate = '拖动搭好的模型，从另一个方向看。';
const joinEthane = '把另一颗碳球接到深灰色棍端，再接氢球。';
const snapRadius = 0.021;
const compare = '左右拖动实物模型，对准第二种画法的半透明模型。';
const shapes = ['每个碳周围呈四面体', '原子共面，未排成直线', '所有原子排成直线'];
const writeNote = '在观察记录中选择你看到的结构特点。';
const legend = { H: '氢球', C: '碳球', Cl: '氯球' };
const evidence = '实验步骤见课本第 95 页，烃的分子结构探究见第 70 页。球的颜色区分元素。球径、棍长和键角采用理想化模型，均为示意。平行棍表示键的重数，细线和淡色面辅助观察空间位置。';
function startingAngle(k) {
  if (k === 1) return new THREE.Euler(-1, -0.55, -0.15);
  if (k === 0 || k === 4) return new THREE.Euler(0.21, 0, 0.09);
  return new THREE.Euler(0.03, -0.2, 0.09);
}
const makeState = () => ({
  demo: false, k: 0, held: null, returns: [],
  pages: models.map(({ atoms }, k) => ({
    slots: atoms.map((_, i) => i ? -1 : 0), q: new THREE.Quaternion().setFromEuler(startingAngle(k)), observed: false, note: '',
    base: new THREE.Quaternion(), turn: 0,
  })),
});
const assembled = m => m.slots.indexOf(-1) === -1;

export default {
  id: 'ballstick', title: '搭建球棍模型', fig: '实验活动8', stampText: '实验', style: 'paper',
  predict: {
    q: '甲烷的结构式把四个 H 画在纸面上。搭成模型后，五个原子的球心还在同一平面内吗？',
    options: ['在，四根键排成十字', '不在，有的键伸出纸面'], answer: 1,
  },
  need: '搭建并转动甲烷、乙烷、乙烯和乙炔的球棍模型。',
  conclusion: {
    crops: [{ page: 64, rect: [220, 502, 536, 564] }, { page: 66, rect: [342, 161, 533, 306] }],
    quote: '有机化合物中的每个碳原子不仅能与其他原子形成4个共价键，而且碳原子与碳原子之间也能形成共价键，可以形成单键、双键或三键。……实验数据表明，甲烷分子中的5个原子不在同一平面上，而是形成了正四面体的空间结构。碳原子位于正四面体的中心，4个氢原子分别位于4个顶点。分子中的４个C—H 的长度和强度相同，相互之间的夹角相等。',
    formula: '', src: '课本第 60、62 页 · 认识有机化合物',
  },
  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    paperSheet(group, { w: 0.36, d: 0.2, z: 0.015 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.0018, 0.163), new THREE.MeshStandardMaterial({ color: 0xf1e8d4, roughness: 1 }));
    board.position.set(0.007, 0.0009, 0); board.receiveShadow = true; group.add(board);
    const title = groundLabel(group, '', { x: -0.051, y: 0.002, z: 0.064, h: 0.015, opacity: 1 });
    const card = tag('', 'cond');
    const optionalRing = inviteRing(group, { minOpacity: 0.58 });
    const rigs = models.map(({ atoms }, k) => {
      const frame = new THREE.Group(); group.add(frame); frame.add(modelSheet(k));
      const balls = atoms.map(a => ball(a.el)), core = balls[0];
      const centerBall = new THREE.Mesh(core.geometry, core.material);
      core.material = new THREE.MeshBasicMaterial({ visible: false }); core.userData.pick = true;
      core.add(centerBall); core.position.copy(origin(k)); frame.add(core);
      balls.forEach(b => { b.userData.track = true; });
      atoms.forEach((a, i) => {
        if (!i) return null;
        const rod = sticks(V(), a.p.clone().sub(atoms[a.parent].p), a.order);
        balls[a.parent].add(rod);
      });
      const ends = atoms.map((a, i) => {
        if (!i) return null;
        const carbonEnd = k === 1 && a.el === 'C';
        const tip = new THREE.Mesh(new THREE.SphereGeometry(carbonEnd ? 0.005 : 0.0036, 14, 10),
          new THREE.MeshStandardMaterial({ color: carbonEnd || a.el === 'Cl' ? COLOR[a.el] : 0xb7a27a }));
        tip.position.copy(a.p).sub(atoms[a.parent].p); balls[a.parent].add(tip);
        return tip;
      });
      const reference = new THREE.Group();
      if (k === 4) {
        comparison().forEach((a, i) => {
          const site = new THREE.Group(); site.userData.site = a; reference.add(site);
          const b = ball(a.el, true);
          b.position.copy(a.p); site.add(b);
          if (i) site.add(sticks(V(), a.p, 1, true));
        });
        frame.add(reference); reference.position.copy(core.position);
      }
      return { frame, balls, core, centerBall, ends, reference };
    });
    let S = makeState(), W, generation = 0;
    const page = () => S.pages[S.k];
    const rig = () => rigs[S.k];
    const def = () => models[S.k];
    function render() {
      rigs.forEach((r, k) => { r.frame.visible = k === S.k; });
      const m = page(), r = rig();
      r.core.quaternion.copy(m.q);
      r.core.position.copy(origin(S.k));
      if (S.k > 0 && S.k < 4) {
        const mid = def().atoms[1].p.clone().multiplyScalar(0.5);
        r.core.position.add(mid).sub(mid.applyQuaternion(m.q));
      }
      for (let i = 1; i < r.balls.length; i++) {
        const b = r.balls[i], slot = m.slots[i];
        if (slot !== -1) {
          const site = def().atoms[slot], host = r.balls[site.parent];
          if (b.parent !== host) host.add(b);
          b.position.copy(site.p).sub(def().atoms[site.parent].p); b.quaternion.identity();
        } else {
          if (b.parent !== r.frame) r.frame.add(b);
          const animated = S.held?.i === i ? S.held : S.returns.find(x => x.i === i);
          b.position.copy(animated ? animated.pos : home(S.k, i));
          if (def().atoms[i].el === 'C') {
            const u = clamp(b.position.distanceTo(home(S.k, i)) / 0.06, 0, 1);
            b.quaternion.identity().slerp(m.q, u);
          }
          b.userData.ringY = Math.max(0.003, b.position.y - R[def().atoms[i].el] + 0.001);
        }
        r.ends[i].visible = !m.slots.includes(i);
      }
      r.reference.visible = S.k === 4 && assembled(m);
      r.reference.quaternion.copy(m.base);
      if (r.reference.visible) {
        for (const site of r.reference.children) {
          const b = site.userData.site, p = b.p.clone().applyQuaternion(m.base);
          site.visible = !def().atoms.some(a => a.el === b.el && p.distanceTo(a.p.clone().applyQuaternion(m.q)) < 0.0002);
        }
      }
      group.updateMatrixWorld(true);
    }
    function target(i) {
      const site = def().atoms[i], host = rig().balls[site.parent];
      const local = site.p.clone().sub(def().atoms[site.parent].p);
      return group.worldToLocal(host.localToWorld(local));
    }
    function available(i) {
      const m = page(), atoms = def().atoms;
      return atoms.map((a, slot) => slot > 0 && a.el === atoms[i].el && !m.slots.includes(slot) ? slot : -1).filter(slot => slot > 0);
    }
    function hint(i) {
      if (i === 0) return S.k === 4 && assembled(page()) ? compare : '拖动碳球，转动整个模型';
      if (S.k === 1 && i === 1) return joinEthane;
      return '把' + legend[def().atoms[i].el] + '接到空棍端';
    }
    const nextPiece = () => page().slots.findIndex((slot, i) => slot < 0 && available(i).length);
    const firstMissing = () => S.pages.slice(0, 4).findIndex(m => !m.note);
    function instruction() {
      const m = page();
      if (assembled(m)) {
        if (S.k === 4) return m.observed && coincides() ? def().obs : compare;
        if (!m.observed) return rotate;
        if (!m.note) return writeNote;
        const next = firstMissing();
        return next >= 0 ? '在学案中选' + models[next].name + '，继续搭建。' : '四种烃都已观察，可以掀开课本结论。';
      }
      if (S.k === 4) return '照第一种画法搭建：绿球接绿色棍端，白球接其余棍端。';
      if (S.k === 1 && m.slots[1] < 0) return joinEthane;
      if (S.k > 0 && m.slots[1] < 0) return '把另一颗碳球接到' + ['','单','双','三'][S.k] + '棍的末端，再接氢球。';
      return intro;
    }
    function guide() {
      if (S.demo || !W) return;
      const msg = instruction(); W.ui.status(msg); bar.say(msg);
    }
    function select(k) {
      drag.clearDropzones();
      S.k = k; S.held = null; S.returns = [];
      present(); guide();
    }
    function present() {
      const k = S.k;
      microEntry.text('钻进' + def().name + '模型看 ⊙');
      render(); title.setText(def().name + '  ' + def().formula);
      if (W) {
        W.entry.hidden = S.demo || k >= 4 || !page().observed;
        W.choice.value = page().note;
        W.pick.set(k < 4 ? k : -1); drawFormula(W.drawing, k);
        W.drawing.style.height = k === 4 ? '110px' : '86px';
        for (let i = 0; i < 4; i++) W.pick.disable(i, S.demo);
      }
    }
    function updateRecords() {
      W.tbl.clear();
      let currentRow;
      S.pages.forEach((m, k) => {
        if (!m.note && !(k === 4 && m.observed)) return;
        const model = models[k], sketch = document.createElement('canvas');
        drawFormula(sketch, k, true);
        const image = '<img width="102" style="vertical-align:middle;max-width:100%" alt="' + sketch.getAttribute('aria-label') + '" src="' + sketch.toDataURL() + '">';
        const row = W.tbl.add([model.name + '<br>' + model.formula, image, k === 4 ? model.tag : m.note, model.obs], { highlight: false });
        if (k === S.k) currentRow = W.tbl.el.querySelector('tbody').rows[row - 1];
      });
      return currentRow;
    }
    function chooseShape() {
      const note = W.choice.value;
      if (S.demo || S.k >= 4 || !page().observed || !shapes.includes(note)) return;
      page().note = note;
      const row = updateRecords();
      W.pick.tick(S.k); bar.done(def().name); W.next.hidden = !bar.finished;
      guide();
      row.scrollIntoView({ block: 'nearest' });
    }
    function record() {
      const m = page();
      if (m.observed) return;
      m.observed = true;
      if (S.demo) return;
      if (S.k === 4) updateRecords();
      else {
        W.entry.hidden = false;
        if (!S.k) W.ui.observePrediction('转动甲烷模型，四个氢分居正四面体的四个顶点。');
      }
    }
    // 把远近不同的棍端沿视线投到球的拖动平面，屏幕上的球心就是吸附的工作端。
    function inPlane(p, eye, z) {
      const t = (z - eye.z) / (p.z - eye.z);
      return eye.clone().lerp(p, t);
    }
    const eyePosition = () => group.worldToLocal(window.__lb.stage.camera.getWorldPosition(V()));
    const dropPoint = (i, slot) => inPlane(target(slot), eyePosition(), home(S.k, i).z);
    function grab(i, p) {
      S.returns = S.returns.filter(x => x.i !== i);
      S.held = { i, start: p.clone(), pos: rig().balls[i].position.clone(), q: page().q.clone(), turn: page().turn, angle: 0 };
      guide();
    }
    function move(i, p) {
      const g = S.held;
      if (!g || g.i !== i) return;
      const m = page();
      if (!i) {
        const dx = (p.x - g.start.x) * 23, dy = (p.y - g.start.y) * 23;
        if (S.k === 4 && assembled(m)) {
          // 两种画法相差三分之一圈。在接近重合时连续收拢，手仍按着就能看到结果。
          const angle = g.turn + dx, period = 2 * Math.PI;
          const aligned = period / 3 + Math.round((angle - period / 3) / period) * period;
          const gap = angle - aligned;
          m.turn = aligned + gap * THREE.MathUtils.smoothstep(Math.abs(gap), 0.14, 0.28);
          m.q.copy(m.base).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1), m.turn));
        } else {
          const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-dy, dx, 0, 'YXZ'));
          m.q.copy(q).multiply(g.q);
        }
        g.angle = g.q.angleTo(m.q);
      } else {
        const eye = eyePosition(), z = home(S.k, i).z;
        const flat = inPlane(p, eye, z); let nearest = null, dist = Infinity;
        if (S.k === 1 && i === 1) g.flat = flat;
        for (const slot of available(i)) {
          const end = target(slot), d = inPlane(end, eye, z).distanceTo(flat);
          if (d < dist) { dist = d; nearest = end; }
        }
        const u = clamp(1 - dist / 0.04, 0, 1);
        g.pos.copy(nearest ? inPlane(flat, eye, z + (nearest.z - z) * u * u * (3 - 2 * u)) : flat);
        const floor = def().atoms[i].el === 'C' ? 0.055 : R[def().atoms[i].el] + 0.002;
        g.pos.y = Math.max(nearest ? Math.min(floor, nearest.y) : floor, g.pos.y);
      }
      render();
    }
    function coincides() {
      const m = page(), ref = comparison();
      return def().atoms.every(a => {
        const p = a.p.clone().applyQuaternion(m.q);
        return ref.some(b => a.el === b.el && p.distanceTo(b.p.clone().applyQuaternion(m.base)) < 0.0002);
      });
    }
    function release(i, moved, cancelled) {
      const g = S.held;
      if (!g || g.i !== i) return;
      S.held = null;
      if (!moved && (!i || g.pos.distanceToSquared(home(S.k, i)) < 1e-12)) return;
      const m = page();
      if (i) {
        if (m.slots[i] < 0) {
          S.returns.push({ i, from: g.pos.clone(), pos: g.pos, t: 0 });
          if (!S.demo && moved && !cancelled) {
            const onHydrogenEnd = g.flat && def().atoms.some((a, slot) =>
              a.parent === 0 && a.el === 'H' && !m.slots.includes(slot) && dropPoint(i, slot).distanceTo(g.flat) <= snapRadius);
            const msg = onHydrogenEnd ? '这是接氢球的棍端。把碳球接到深灰色棍端。' : '球没接上。拖近对应的空棍端再松手。';
            W.ui.status(msg); bar.say(msg);
          }
        } else guide();
      } else if (!cancelled && assembled(m)) {
        if (S.k === 4 && coincides()) record();
        else if (S.k < 4 && g.angle >= 0.23) record();
        guide();
      }
      render();
    }
    let cancelled = false;
    const drags = rigs.flatMap((r, k) => r.balls.map((obj, i) => ({
      obj, plane: 'xy', get offset() { return i ? home(k, i).z : origin(k).z; }, keepOffset: !!i,
      enabled: () => S.k === k && (!i || page().slots[i] < 0),
      hint: () => S.k === k && (!i || page().slots[i] < 0) ? hint(i) : '',
      dropzones: i ? models[k].atoms.flatMap((a, slot) => !slot || a.el !== models[k].atoms[i].el ? [] : [{
        name: legend[a.el] + '的棍端', position: () => dropPoint(i, slot), radius: snapRadius,
        enabled: () => S.k === k && !page().slots.includes(slot),
        onDrop() {
          page().slots[i] = slot;
          if (S.k === 4 && assembled(page())) page().base.copy(page().q);
        },
      }]) : [],
      onStart: p => grab(i, p), onDrag: p => move(i, p), onEnd: moved => release(i, moved, cancelled),
    })));
    const drag = draggable(group, drags, { tip: tag('', 'pill') });
    const pointer = { ...drag, items: () => drags.filter(d => d.enabled()), up(ray, e) {
      cancelled = e?.type === 'pointercancel'; const used = drag.up(ray, e); cancelled = false; return used;
    } };
    const scene = structureScene();
    // 入口贴在当前模型最上方的球边，中心留给学生抓住转动。
    function entryPosition() {
      const camera = window.__lb.stage.camera;
      let top = -Infinity, position = rig().core.position;
      rig().balls.forEach((b, i) => {
        const edge = group.worldToLocal(b.getWorldPosition(V()));
        edge.y += R[def().atoms[i].el] + 0.003;
        const height = group.localToWorld(edge.clone()).project(camera).y;
        if (height > top) { top = height; position = edge; }
      });
      return position;
    }
    let microEntry;
    const mic = micro({ tag: (...args) => (microEntry = tag(...args)), look, back, group, scene, label: '钻进甲烷模型看', at: () => V(-0.026, 0.09, 0),
      btnAt: () => assembled(page()) ? entryPosition() : rig().core.position, scale: 0.012, dist: 0.36, lookD: [0.035, 0.38, 1],
      state: () => ({ k: S.k }), key: () => S.k, show: () => S.k < 4 && assembled(page()) && !S.held, bar: () => bar });
    const hud = Array.from(document.querySelectorAll('.mw')).pop();
    hud.classList.add('ballstick-micro');
    const pause = h('button', { class: 'mw-rotate', onclick: () => { scene.paused = !scene.paused; } }, '暂停转动');
    hud.querySelector('.mw-hud').append(pause);
    const layout = h('style', {}, `
      .ballstick-micro .mw-rotate { margin-top:8px;padding:5px 14px;border:1px solid #918e81;border-radius:14px;background:#fffdf6;color:#394542;font:inherit;cursor:pointer;pointer-events:auto }
      .ballstick-entry { display:flex;align-items:center;gap:8px;margin:4px 0 8px;font-size:13px }
      .ballstick-entry[hidden] { display:none }
      .ballstick-entry select { min-width:0;max-width:100%;font:inherit;color:inherit;background:#fffdf7;border:1px solid #b4b7a8;border-radius:4px;padding:4px }
      .ballstick-table table { table-layout:fixed }
      .ballstick-table th:first-child { width:18% }
      .ballstick-table th:nth-child(2) { width:24% }
      .ballstick-table th:nth-child(3) { width:26% }
      @media(max-width:760px) {
        .ballstick-micro .mw-hud,.ballstick-micro .mw-scale { left:4vw!important;width:92vw!important }
        .ballstick-micro .mw-hud { top:13vh!important }
        .ballstick-micro .mw-rotate { position:absolute;left:0;top:0;margin:0 }
        .ballstick-micro .mw-close { left:auto!important;right:54px;top:13vh!important }
        .ballstick-micro .mw-scale { top:8vh!important }
        .ballstick-micro .mw-cap { font-size:14px }
      }
    `);
    document.head.append(layout);
    const act = demoActs(drag, group);
    function rotationAction(k) {
      const start = origin(k), end = start.clone().add(V(k === 4 ? 2 * Math.PI / (3 * 23) : 0.043, k === 4 ? 0 : 0.014));
      return { start, end };
    }
    const shots = models.map((model, k) => {
      const { balls } = rigs[k], n = balls.length;
      const actions = balls.slice(1).map((b, j) => act.drag(b, () => dropPoint(j + 1, j + 1), {
        from: () => home(k, j + 1), t0: (j + 0.04) / n, t1: (j + 0.75) / n, release: (j + 0.83) / n,
      }));
      const { start, end } = rotationAction(k);
      actions.push(act.drag(balls[0], end, { from: start, t0: (n - 0.96) / n, t1: (n - 0.2) / n, release: (n - 0.13) / n }));
      const during = act.seq(...actions);
      return { cap: k === 4 ? compare : '搭建' + model.name + '，转动模型观察。', dur: n * 0.94 + 0.7,
        enter: () => { mic.close(); select(k); during(0); }, during };
    });
    const microShot = { cap: '先数乙烯的六个原子，再从侧面看它们的位置。', dur: 7.5, cam: [[-0.026, 0.14, 0], [0.035, 0.38, 1], 0.36], enter: () => mic.open(true) };
    shots.splice(3, 0, microShot);
    function apply() { drag.clearDropzones(); mic.close(); present(); }
    const box = sandbox({ get: () => S, set: s => { S = s; }, fresh: makeState, apply,
      view: { save: () => mic.isOpen ? { t: scene.phase, paused: scene.paused, generation } : null, restore: v => {
        if (v.generation === generation) { mic.open(); scene.phase = v.t; scene.paused = v.paused; }
      } } });
    const bar = lessonBar({ group, look, back, ringOptions: { minOpacity: 0.58 },
      steps: models.slice(0, 4).map(model => ({ id: model.name, title: model.name,
        todo: '搭建并转动' + model.name + '的球棍模型。', target: () => mic.isOpen || S.held || page().observed ? null : (rig().balls[nextPiece()] || rig().centerBall) })),
      reels: { demo: { label: '老师演示', seal: '演示', ...box, shots } },
    });
    function reset() {
      generation++; if (bar.playing) bar.stop();
      S = makeState(); mic.close(); W.tbl.clear(); W.ui.relock(); W.ui.observePrediction('');
      W.pick.el.querySelectorAll('.tick').forEach(x => x.remove()); W.optional.open = false;
      W.ui.el.querySelectorAll('details[open]').forEach(x => { x.open = false; });
      W.next.hidden = true; bar.undo(...models.slice(0, 4).map(m => m.name)); select(0);
    }
    select(0);
    const qa = [];
    models.forEach((model, k) => {
      const r = rigs[k];
      if (k) qa.push({ name: '选择' + model.name, run: () => select(k), wait: 0.1 });
      qa.push(...qaFlow(drag, r.balls.slice(1).map((b, j) => ({ name: model.name + '接' + legend[model.atoms[j + 1].el] + (j + 1),
        drag: b, to: () => dropPoint(j + 1, j + 1), wait: 0.12 }))));
      const { start, end } = rotationAction(k);
      qa.push({ name: '转动' + model.name, wait: 0.15, mouse: { kind: 'drag', obj: r.core, to: () => end.clone(), over: drag.hovered },
        run() { grab(0, start); move(0, end); release(0, true, false); } });
      if (k < 4) qa.push({ name: '填写' + model.name + '的观察记录', run() {
        W.choice.value = shapes[Math.max(0, k - 1)]; W.choice.dispatchEvent(new Event('change'));
      }, wait: 0.1 });
      if (k < 4) qa.push({ name: '钻进' + model.name, run: () => mic.open(), wait: 4 }, { name: '返回' + model.name, run: () => mic.close(), wait: 2 });
      qa.push({ name: '核对' + model.name, wait: 0, run() {
        if (!page().observed || (k >= 3 && W.next.hidden)) throw Error(model.name + '观察未完成');
      } });
    });
    return {
      group: root, card: false, toggles: ['cards', 'steps'], size: { w: 0.34, d: 0.19, h: 0.16 },
      view: { elev: 24, azim: 1, lookY: 0.42, frameMargin: 1.09 },
      pointer: wrapPointer(pointer, bar), reset,
      update(dt) {
        const k = bar.update(dt);
        drag.update(k ? dt : 0);
        for (const x of S.returns) { x.t += dt * k; x.pos.lerpVectors(x.from, home(S.k, x.i), clamp(x.t / 0.36, 0, 1)); }
        if (S.returns.length) { S.returns = S.returns.filter(x => x.t < 0.36); render(); }
        const m = page(), n = m.slots.filter(slot => slot >= 0).length, all = assembled(m);
        const label = S.k === 4 && all ? (coincides() ? '重合' : '未重合') : all ? def().tag : '搭建中';
        card.text('<div class="cc"><div class="cc-t"><span class="cc-name">' + def().name + '</span><span class="cc-res">' + label + '</span></div>' +
          (all ? '' : '<div class="cc-note">已接 ' + (n - 1) + ' 个球</div>') + '</div>')
          .loc(group, -0.11, S.k === 2 ? 0.15 : 0.135, 0).show(n > 1 && !mic.isOpen && !bar.playing);
        optionalRing.update(S.k === 4 && bar.finished && !bar.playing && !S.held && !m.observed && show.steps ? (rig().balls[nextPiece()] || rig().centerBall) : null, dt);
        rig().core.visible = !mic.isOpen;
        mic.update(dt, k);
        if (mic.isOpen) {
          pause.hidden = S.demo;
          const caption = scene.paused ? '继续转动' : '暂停转动';
          if (pause.textContent !== caption) pause.textContent = caption;
        }
      },
      mount(ui) {
        const pick = seg('分子模型（✓ 表示已记录）', models.slice(0, 4).map(m => m.name), (_, k) => { if (!bar.playing) { mic.close(); select(k); } });
        const drawing = h('canvas', { role: 'img', style: 'display:block;width:100%;height:86px;object-fit:contain;margin:3px 0' });
        const optional = h('details', { class: 'more' }, h('summary', {}, '想一想（选做）'), h('p', { class: 'fineprint' }, '把二氯甲烷的两个氯画在相邻或相对的位置，表示两种不同的分子吗？'),
          h('button', { class: 'go ghost', onclick: () => {
            if (bar.playing) return;
            mic.close(); select(4); drawing.scrollIntoView({ block: 'center' });
          } }, '用二氯甲烷模型验证'));
        const notes = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'),
          h('p', { class: 'fineprint' }, '实验用品：分子结构模型（或橡皮泥、黏土、泡沫塑料、牙签等代用品）。'),
          h('p', { class: 'fineprint' }, '1. 填写下表，并搭建甲烷分子的球棍模型。'),
          h('p', { class: 'fineprint' }, '2. 填写下表，并搭建乙烷、乙烯和乙炔分子的球棍模型，比较三者的空间结构。'),
          h('p', { class: 'fineprint' }, evidence));
        const base = mountXuean(ui, { controls: [pick, drawing, moreBox([], reset), notes], headers: ['分子式', '结构式', '我的观察', '模型显示'], intro });
        const choice = h('select', { onchange: chooseShape },
          h('option', { value: '', disabled: true }, '选择结构特点'), shapes.map(s => h('option', {}, s)));
        const entry = h('label', { class: 'ballstick-entry', hidden: true }, h('span', {}, '我的观察'), choice);
        ui.data.before(entry); base.tbl.el.classList.add('ballstick-table');
        ui.data.nextElementSibling.style.display = 'none';
        ui.data.append(base.next, optional);
        W = { ...base, ui, drawing, optional, pick, entry, choice };
        bar.attach(ui); select(0); ui.observePrediction('');
      },
      dispose() { generation++; layout.remove(); optionalRing.dispose(); bar.dispose(); drag.dispose(); mic.dispose(); },
      debug: { get S() { return S; }, bar, qa },
    };
  },
};
