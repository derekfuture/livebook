// 人教版高中化学选择性必修 1，第 58 页实验 3-1、图 3-1 和图 3-2。
import * as THREE from 'three';
import { h } from '../ui/Panel.js';
import { lessonBar } from './kit/lessonbar.js';
import { draggable, clamp } from './kit/interact.js';
import { demoActs, mountXuean, moreBox, paperSheet, qaFlow, sandbox, wrapPointer } from './kit/chemlesson.js';
import { micro } from './kit/microworld.js';
import { X, R, RIM, WATER, HOME, ACIDS, GAS_TIME, DISSOCIATION, V, bench, kindOf, bubbleCount, WINDOW, ionizationScene } from './kit/weakacid-parts.js';

const INTRO = '两杯酸体积相同，浓度都是 0.1 mol/L。';
const KEYS = ['ph', 'ec', 'mg'];
const TITLES = ['测 pH', '试验导电能力', '加入等量镁条'];
const TODO = ['把 pH 笔浸入对应的酸，松手后点笔身读数，在表中填写并确认。', '把两个导电测试器分别浸入标明的酸，比较灯光。', '先提起探头，再把等量镁条分别放进两杯，比较刚入液时的气泡。'];
const HINT = ['拖动 pH 笔，浸入液面', '拖动导电测试器，两极浸入液面', '拿起镁条，放进杯口'];
const MISSING = ['笔尖还没有浸入液面。', '两根电极都要浸入液面，灯才会亮。', '镁条还在杯外。提过杯沿，再从杯口放入。'];
const LIFT = '先把探头提到杯沿上方，再从杯口放入。';
const VALUES = [null, ['灯亮', '灯微亮'], ACIDS.map((_, side) => bubbleCount(side, WINDOW) + ' 个气泡')];
const ROWS = ['pH（理论）', '导电测试', '前 3 秒（示意）'];
const snapRadius = (id) => id < 4 ? 0.044 : 0.038;
const aim = (id, side) => V(X[side] + (id < 2 ? -0.016 : id < 4 ? 0.016 : 0), id < 4 ? WATER - 0.008 : RIM + 0.006);
const microCam = (side) => [[X[side], 0.114, 0], [0, 0.43, 1], 0.32];
// 入液为 0 秒。同一条下落轨迹用于桌面实验和起始片段回放。
function stripHeight(from, age) {
  const elapsed = Math.max(0, age + Math.sqrt((from - WATER) / 0.65));
  return Math.max(0.005, from - 0.65 * elapsed * elapsed);
}
export default {
  id: 'weakacid', title: '盐酸与醋酸的比较', fig: '实验3-1', stampText: '实验', style: 'paper',
  predict: {
    q: '盐酸和醋酸都是 0.1 mol/L。刚放入等量镁条，哪一杯冒泡更快？',
    options: ['一样快，酸的浓度相同', '盐酸更快', '醋酸更快'], answer: 1,
  },
  need: '比较两杯酸的 pH、导电能力和加镁之初的气泡。',
  conclusion: {
    crops: [{ page: 62, rect: [214, 622, 538, 747] }],
    quote: '实验表明，相同物质的量浓度的盐酸和醋酸的pH、导电能力及与活泼金属反应的剧烈程度都有差别，这说明两种酸中H+浓度是不同的，即HCl和CH3COOH的电离程度不同。在稀溶液中，HCl全部电离生成H+和Cl-（如图3-1），CH3COOH只有部分电离生成CH3COO-和H+（如图3-2）。',
    formula: '', src: '课本第 58 页 · 第三章 第一节 电离平衡',
  },
  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    paperSheet(group, { w: 0.45, d: 0.27 });
    const { tools, replayStrips, drawBubbles } = bench(group);
    const bubbling = [false, false];
    const cards = X.map(() => tag('', 'cond wa-card'));
    const timer = tag('', 'pill');
    const toolNames = tools.map((_, id) => {
      const name = ['pH 笔', '导电测试器', '镁条'][kindOf(id)];
      return tag(name + (id < 4 ? '<br>' + ACIDS[id % 2] + '专用' : ''), 'wa-name');
    });
    const cupNames = X.map((x, side) => tag('烧杯 · ' + ACIDS[side], 'wa-name').loc(group, x, 0.061, R));
    const scene = ionizationScene();
    let W;
    const fresh = () => ({
      demo: false, microSide: 0, reading: -1, held: -1, lifting: -1,
      docked: [false, false, false, false], pos: HOME.map((p) => p.clone()), returns: HOME.map(() => null),
      seen: KEYS.map(() => [false, false]), last: [-1, -1], wet: -1,
      strips: [-1, -1], age: [-1, -1], drop: [0, 0], replay: -1,
      mouth: false, wall: false, blockedCup: -1,
    });
    let S = fresh();
    const ready = (j) => S.seen[j].every(Boolean);
    const available = (id) => id < 4 ? !S.strips.includes(id % 2) : S.strips[id - 4] < 0;
    const say = (msg) => { if (!S.demo) W?.ui.status(msg); };
    const observed = (j, side) => {
      S.last[side] = j;
      if (S.seen[j][side]) return;
      S.seen[j][side] = true;
      if (S.demo || !W) return;
      if (j !== 0) {
        W.tbl.set(j, [ROWS[j], ...S.seen[j].map((seen, i) => seen ? VALUES[j][i] : '—')]);
        say(ACIDS[side] + ' · ' + ROWS[j] + ' · ' + VALUES[j][side]);
      }
      if (ready(j)) bar.done(KEYS[j]);
    };
    const sideOf = (x, margin) => X.findIndex((cx) => Math.abs(x - cx) < R - margin);
    const sizeAt = (side, age) => Math.max(0, 1 - Math.max(0, age) / GAS_TIME[side]) ** 0.55;
    const draw = () => {
      const small = innerWidth <= 760 && S.reading < 0 && !mic.isOpen;
      tools.forEach(({ g, plate }, id) => {
        const labelY = id >= 4 ? 0.019 : S.strips.includes(id % 2) ? 0.047 : -0.017;
        toolNames[id].loc(g, id < 2 ? -0.007 : id < 4 ? 0.007 : 0, labelY, 0)
          .show(small && S.held !== id && (id < 4 ? !S.docked[id] && !S.returns[id] : S.strips[id - 4] < 0));
        if (plate) plate.visible = !small && S.strips[id - 4] < 0;
        g.position.copy(S.pos[id]);
        if (id < 4) g.userData.ringY = g.position.y + 0.038;
        if (id < 4) g.read(S.held === id ? S.wet : S.docked[id] ? id % 2 : -1);
        else {
          const side = S.strips[id - 4];
          g.scale.setScalar(side < 0 ? 1 : sizeAt(side, S.age[side]));
          g.visible = S.replay < 0 && g.scale.x > 0;
        }
      });
      X.forEach((_, side) => {
        cupNames[side].show(small);
        const mg = S.strips.indexOf(side), frame = replayStrips[side];
        const origin = mg < 0 ? HOME[4] : S.pos[mg + 4];
        frame.visible = S.replay >= 0;
        if (frame.visible) {
          frame.position.copy(origin).y = stripHeight(S.drop[mg], S.replay);
          frame.scale.setScalar(sizeAt(side, S.replay));
        }
        bubbling[side] = drawBubbles(side, frame.visible ? S.replay : S.age[side], frame.visible ? frame.position : origin);
      });
    };
    const start = (id) => {
      if (!available(id)) return;
      S.held = id;
      S.lifting = S.docked[id] ? id : -1;
      S.wet = S.docked[id] ? id % 2 : -1;
      S.mouth = !!S.docked[id]; S.wall = false;
    };
    function move(id, p) {
      if (S.held !== id) return;
      S.returns[id] = null;
      // 从杯中取出时跟手离开；离开热区以后再靠近，才重新吸附。
      if (S.lifting === id && p.distanceTo(aim(id, id % 2)) > snapRadius(id)) S.lifting = -1;
      if (id < 4) S.docked[id] = false;
      const v = S.pos[id], old = v.clone(), margin = kindOf(id) === 0 ? 0.005 : 0.012;
      v.set(clamp(p.x, -0.18, 0.18), clamp(p.y, 0.002, 0.201), 0);
      if (id < 4) {
        const cx = X[id % 2], dx = v.x - cx, near = Math.abs(dx) <= R + margin;
        const crossedMouth = old.y >= RIM && v.y < RIM &&
          Math.abs(THREE.MathUtils.lerp(old.x, v.x, (old.y - RIM) / (old.y - v.y)) - cx) <= R;
        if (!near || v.y > RIM + 0.023) S.mouth = false;
        else if (v.y >= RIM || crossedMouth) S.mouth = true;
        if (near && !S.mouth && v.y < RIM) {
          if (!S.wall) say(LIFT);
          S.wall = true;
          v.x = cx + Math.sign(old.x - cx || dx || 1) * (R + margin + 0.0001);
        } else {
          S.wall = false;
          if (S.mouth && S.lifting !== id) v.x = aim(id, id % 2).x;
        }
      }
      // 杯壁挡住横移。已在杯内时先提起；从杯外靠近时可以沿杯沿滑入。
      for (const cx of X) {
        const dx = v.x - cx, prev = old.x - cx;
        if (v.y >= RIM + 0.002) continue;
        if (Math.abs(prev) < R - margin && old.y < RIM && Math.abs(dx) >= R - margin) {
          v.x = cx + Math.sign(dx) * (R - margin - 0.0001);
        } else if (Math.abs(prev) > R + margin && old.y < RIM - 0.001 && Math.abs(dx) <= R + margin) {
          v.x = cx + Math.sign(prev) * (R + margin + 0.0001);
        } else if (Math.abs(Math.abs(dx) - R) <= margin) v.y = RIM + 0.002;
      }
      const side = sideOf(v.x, margin);
      if (side >= 0) v.y = Math.max(v.y, id < 4 ? 0.006 : RIM - 0.003);
      if (id < 4 && side >= 0 && side !== id % 2) v.y = Math.max(v.y, RIM + 0.002);
      S.wet = id < 4 && side >= 0 && v.y < WATER - 0.003 ? side : -1;
      if (S.wet >= 0 && id >= 2) observed(1, S.wet);
      draw();
    }
    function release(id, moved, zone) {
      if (S.held !== id) return;
      const p = S.pos[id], side = sideOf(p.x, kindOf(id) === 0 ? 0.005 : 0.012);
      const immersed = S.wet === id % 2;
      S.held = -1; S.wet = -1;
      if (!moved) return;
      if (zone && id < 4 && immersed) {
        S.docked[id] = true;
        if (id < 2 && !S.seen[0][side]) {
          if (S.demo) observed(0, side);
          else say('点笔身看读数，在表中填写并确认。');
        }
      } else if (zone && id >= 4 && side >= 0 && ready(0) && ready(1) && !S.strips.includes(side) &&
                 !S.docked[side] && !S.docked[side + 2]) {
        S.strips[id - 4] = side;
        S.drop[id - 4] = p.y;
        S.age[side] = -Math.sqrt((p.y - WATER) / 0.65);
        S.last[side] = 2;
        S.blockedCup = -1;
        say('观察' + ACIDS[side] + '中镁条刚入液时的气泡。');
      } else {
        if (zone && id >= 4) {
          if (!ready(0)) say('先填写并确认两杯酸的 pH 读数，再放镁条。');
          else if (!ready(1)) say('先测完两杯原溶液。加入镁条后，溶液的组成会改变。');
          else if (S.strips.includes(side)) say('这杯已放入一段镁条。另一段放进另一杯，才能比较。');
          else { S.blockedCup = side; say('先把这杯里的探头提出来，再放镁条。'); }
        } else if (id < 4 && side >= 0 && side !== id % 2) say('这支探头专用于' + ACIDS[id % 2] + '。请按器材上的名称选杯。');
        else if (id < 4 && S.wall) say(LIFT);
        else if (id >= 4 || !S.seen[kindOf(id)][id % 2]) say(MISSING[kindOf(id)]);
        if (id < 4) S.docked[id] = false;
        if (S.blockedCup === id % 2 && id < 4 && !S.docked[id % 2] && !S.docked[id % 2 + 2]) {
          say('可以从杯口放入镁条了。'); S.blockedCup = -1;
        }
        S.returns[id] = { from: p.clone(), t: 0, inside: side >= 0 && p.y < RIM };
      }
      draw();
    }
    function readPen(id) {
      if (!S.docked[id]) return;
      S.reading = id;
      if (!S.demo && !S.seen[0][id]) {
        W.readings[id].input.disabled = false;
        W.readings[id].confirm.hidden = false;
      }
      const p = S.pos[id];
      look([p.x, p.y + 0.055, p.z], [0, 0.12, 1], 0.145, () => {
        S.reading = -1; bar.near(false);
      });
      bar.near(true);
    }
    const drag = draggable(group, tools.map(({ g, pick }, id) => ({
      obj: pick, anchor: g, keepOffset: true,
      hint: () => id < 2 && S.docked[id] ? '点笔身看读数，向上拖可取出' : (id < 4 ? ACIDS[id % 2] + '专用 · ' : '') + HINT[kindOf(id)],
      enabled: () => available(id) && !mic.isOpen && S.reading < 0,
      dropzones: (id < 4 ? [id % 2] : [0, 1]).map((side) => ({
        name: '烧杯 · ' + ACIDS[side], position: aim(id, side), radius: snapRadius(id), enabled: () => S.lifting !== id && (id >= 4 || S.mouth),
      })),
      onStart: () => start(id), onDrag: (p) => move(id, p), onEnd: (moved, zone) => release(id, moved, zone),
      onTap: id < 2 ? () => readPen(id) : undefined,
    })), { tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const entryAt = (side) => V(X[side], 0.027, R);
    const canEnter = () => ready(0) && S.held < 0 && S.reading < 0 && S.replay < 0 && (!S.strips.every((side) => side >= 0) || ready(2));
    const entries = [];
    const mic = micro({
      tag: (text, cls, click) => (entries[0] = tag(text, cls + ' wa-entry', () => { S.microSide = 0; click(); })),
      look, back, group, scene, bar: () => bar, label: '钻进盐酸杯看',
      at: () => V(X[S.microSide], 0.064), btnAt: () => entryAt(0),
      lookD: microCam(0)[1], dist: microCam(0)[2], scale: 0.012,
      show: canEnter, state: () => ({ side: S.microSide }),
    });
    function openCup(side, demo = false) { S.microSide = side; mic.open(demo); }
    entries[1] = tag('钻进醋酸杯看 ⊙', 'pill mw-go wa-entry', () => openCup(1));
    const sb = sandbox({ get: () => S, set: (s) => { S = s; }, fresh, apply: draw,
      view: { save: () => mic.isOpen ? { time: scene.snapshot() } : S.reading >= 0 ? { pen: S.reading } : null,
        restore: (v) => { if (v.pen != null) readPen(v.pen); else { scene.resume(v.time); mic.open(); } } } });
    const target = (j) => {
      if (mic.isOpen || S.held >= 0 || S.reading >= 0) return null;
      if (j < 2) return tools[2 * j + Math.max(0, S.seen[j].indexOf(false))].g;
      const parked = S.docked.indexOf(true);
      if (parked >= 0) return tools[parked].g;
      const mg = S.strips.findIndex((side) => side < 0);
      return mg >= 0 ? tools[mg + 4].g : null;
    };
    const seq = [[0, 0], [1, 1], [2, 0], [3, 1], [4, 0], [5, 1]];
    const demoCaps = ['将 pH 笔浸入盐酸，读数。', '用醋酸专用的 pH 笔测量，比较读数。', '把导电测试器的两极浸入盐酸，看指示灯。', '换用醋酸专用的测试器，比较灯光。', '把一段镁条放入盐酸，观察气泡。', '把等量镁条放入醋酸，比较刚放入时的气泡。'];
    const shots = seq.map(([id, side], k) => {
      const to = aim(id, side), high = RIM + 0.034;
      const path = [HOME[id], V(HOME[id].x, high), V(to.x, high), to];
      const insert = act.path(tools[id].pick, path, { t0: 0.06, t1: 0.35, release: 0.41 });
      const lift = id < 4 && act.path(tools[id].pick, path.slice().reverse(), { t0: 0.72, t1: 0.96, release: 0.98 });
      return { cap: demoCaps[k], dur: id < 4 ? 4.4 : 3.35, during(k) { insert(k); if (lift) lift(k); } };
    });
    const bar = lessonBar({
      look, back: () => { S.reading = -1; bar.near(false); back(); }, group, ringOptions: { minOpacity: 0.63 },
      steps: KEYS.map((id, i) => ({ id, title: TITLES[i], todo: TODO[i], target: () => target(i) })),
      reels: { demo: { label: '老师演示', onStart() { drag.clearDropzones(); sb.onStart(); back(); bar.near(false); mic.close(); },
        onEnd() { mic.close(); sb.onEnd(); },
        shots: [...shots, { cap: '从各自入液的一刻起，并排重看前 3 秒的气泡。', dur: 6.6 }, ...ACIDS.map((acid, side) => ({
          cap: '重看' + acid + '中溶质的电离。', cam: microCam(side), dur: 6, enter: () => openCup(side, true),
        }))] } },
    });
    const wrapped = wrapPointer(drag, bar);
    const pointer = { ...wrapped, up(ray, event) {
      // 拔探头时不吸住手；若仍在杯口处松手，用实际的松手位置判断是否放回杯中。
      S.lifting = -1;
      return wrapped.up(ray, event);
    } };
    function advance(dt) {
      S.returns.forEach((r, id) => {
        if (!r || S.held === id) return;
        const u = clamp((r.t += dt) / 0.43, 0, 1), p = S.pos[id];
        if (r.inside && u < 0.35) p.copy(r.from).y += (RIM + 0.004 - r.from.y) * u / 0.35;
        else {
          const f = r.inside ? (u - 0.35) / 0.65 : u;
          p.copy(r.from); if (r.inside) p.y = RIM + 0.004;
          p.lerp(HOME[id], f * f * (3 - 2 * f));
        }
        if (u === 1) S.returns[id] = null;
      });
      S.strips.forEach((side, mg) => {
        if (side < 0) return;
        S.age[side] = Math.min(GAS_TIME[side] + 2, S.age[side] + dt);
        S.pos[mg + 4].y = stripHeight(S.drop[mg], S.age[side]);
      });
      if (S.replay < 0) {
        if (!ready(2) && S.age.every((t) => t >= WINDOW)) {
          S.replay = 0;
          say('同步回放：从两段镁条各自入液的一刻开始。');
        }
      } else if (S.replay < WINDOW) {
        S.replay = Math.min(S.replay + dt, WINDOW);
      } else {
        S.replay = -1;
        if (ready(2)) return;
        X.forEach((_, side) => observed(2, side));
        if (S.demo) return;
        W.ui.observePrediction(`入液后前 3 秒，盐酸产生 ${VALUES[2][0]}，醋酸产生 ${VALUES[2][1]}（示意）。`);
        W.replay.hidden = W.review.hidden = false;
        say('已记录两杯各自入液后前 3 秒产生的气泡。');
      }
    }
    function showCards() {
      const narrow = innerWidth <= 760;
      timer.text(`同步回放 · ${Math.max(0, S.replay).toFixed(1)} / 3 秒`).loc(group, 0, narrow ? 0.137 : RIM + 0.025, 0).show(S.replay >= 0 && !mic.isOpen);
      X.forEach((x, side) => {
        const j = S.last[side];
        const lamp = S.docked[side + 2] || (S.held === side + 2 && S.wet === side);
        let obs = lamp ? VALUES[1][side] : bubbling[side] ? '冒气泡' : '无气泡';
        if (S.replay >= 0) obs = `累计 ${bubbleCount(side, S.replay)} 个（示意）`;
        const card = cards[side].text(`<div class="cc"><div class="cc-t${S.replay >= 0 ? ' wa-count-row' : ''}"><span class="cc-name">烧杯 · ${ACIDS[side]}</span><span class="cc-res">${obs}</span></div></div>`);
        if (narrow) card.loc(group, x, lamp ? 0.155 : 0.092, 0);
        else card.loc(group, x, 0.008, 0.080);
        card.show(!mic.isOpen && !S.demo && S.reading < 0 && (lamp || j === 2));
      });
    }
    function initRows() {
      ROWS.forEach((row) => W.tbl.add([row, '—', '—'], { highlight: false }));
      const cells = W.tbl.el.querySelector('tbody tr').cells;
      W.readings = ACIDS.map((acid, side) => {
        const input = h('input', { type: 'text', inputmode: 'decimal', placeholder: '填读数', 'aria-label': acid + ' pH 读数' });
        input.disabled = true;
        const confirm = h('button', { type: 'button', hidden: true, disabled: true, onclick: () => {
          if (S.demo || input.disabled || !input.value.trim()) return;
          input.readOnly = true; confirm.hidden = true;
          observed(0, side); say(ACIDS[side] + '的 pH 读数已记录。');
        } }, '确认读数');
        input.oninput = () => { confirm.disabled = !input.value.trim(); };
        input.onkeydown = (event) => { if (event.key === 'Enter' && !event.isComposing) confirm.click(); };
        cells[side + 1].replaceChildren(input, confirm);
        return { input, confirm };
      });
    }
    function reset() {
      bar.stop(); mic.close(); back(); bar.near(false); drag.clearDropzones(); S = fresh(); draw(); showCards();
      W.tbl.clear(); initRows(); W.review.hidden = W.replay.hidden = true;
      W.ui.el.querySelectorAll('details[open]').forEach((el) => { el.open = false; });
      W.ui.observePrediction(null); W.ui.relock(); bar.undo(...KEYS); bar.say(null); say(INTRO);
      window.__lb.stage.resetView();
    }
    const qa = qaFlow(drag, [...seq.flatMap(([id, side]) => {
      const take = { name: ACIDS[side] + ' · ' + TITLES[kindOf(id)], drag: tools[id].pick, to: aim(id, side), wait: id === 5 ? 8 : 1.3 };
      if (id >= 4) return [take];
      const read = id < 2 ? [{ name: ACIDS[side] + ' · 看笔屏', tap: tools[id].pick }, { name: ACIDS[side] + ' · 填写并确认', run() {
        const { input, confirm } = W.readings[side];
        if (S.reading !== side || input.disabled || S.seen[0][side] || !confirm.disabled) throw new Error('读数确认状态不对');
        input.value = side ? '2.9' : '1.0'; input.dispatchEvent(new Event('input')); confirm.click();
        document.querySelector('.lbar .lb-back').click();
      } }] : [];
      return [take, ...read, { name: ACIDS[side] + ' · 提出探头', drag: tools[id].pick, to: HOME[id], wait: 0.6 }];
    }), { name: '核对观察记录', run() {
      if (!KEYS.every((_, j) => ready(j)) || !bar.finished || W.review.hidden) throw new Error('三组对照未完成');
    } }, { name: '钻进去看', run: () => mic.open(), wait: 1 }, { name: '回到桌上', run: () => mic.close() }]);
    const skin = h('style', {}, `
      .weakacid-page table.data {table-layout:fixed;width:100%}
      .weakacid-page table.data th:first-child {width:38%}
      .weakacid-page table input {width:90%;max-width:6em;box-sizing:border-box;border:0;border-bottom:1px dotted #887e6d;background:transparent;text-align:center;color:inherit;font:inherit}
      .weakacid-page table input:disabled {visibility:hidden}
      .wa-card .cc-res {animation:none;transform:none}
      .weakacid-page table.data th,.weakacid-page table.data td {text-align:center}
      .weakacid-micro.holo .mw-dim {background:rgba(247,245,236,.84);mask-image:none;-webkit-mask-image:none}
      .weakacid-micro.holo .mw-hud {top:125px!important}
      .wa-ratio {display:grid;grid-template-columns:2.3em 1fr 4.5em;align-items:center;gap:8px;max-width:300px;margin:4px auto;font:14px/1.15 system-ui;letter-spacing:0;text-align:left}
      .wa-track {height:7px;background:#d2d7d0;border-radius:3px;overflow:hidden}
      .wa-track i {display:block;height:100%;background:#376764}
      .weakacid-micro .mw-eq sup {font-size:0.60em}
      .weakacid-page .big-next:disabled {display:none}
      .weakacid-page .answer .src {padding-right:53px; min-height:42px}
      .weakacid-page .seal-stamp {font-size:16px;right:14px;bottom:13px}
      .weakacid-micro .mw-eq {font-size:clamp(17px,1.65vw,24px);line-height:1.45}
      .weakacid-micro .mw-cap {font-size:15px}
      .weakacid-demo .p-body {visibility:hidden}
      @media(max-width:760px){
        .tag3d.wa-entry {font-size:11px;padding:2px 4px}
        .tag3d.wa-name {font:600 11px/1.12 system-ui;text-align:center;white-space:nowrap;color:#253b40;background:#fffaf0ed;border:0;border-radius:2px;padding:1px 2px;pointer-events:none}
        .tag3d.cond.wa-card .cc {padding:2px 4px}
        .wa-card .cc-t {gap:3px}
        .wa-card .wa-count-row {flex-direction:column}
        .wa-card .wa-count-row .cc-res {margin:0}
        .wa-card .cc-name,.wa-card .cc-res {font-size:11px}
        body.lesson-on #viewctl {top:45px;bottom:auto;right:8px;flex-direction:row;gap:4px;align-items:center;pointer-events:none}
        body.lesson-on #viewctl button {pointer-events:auto}
        #viewctl .show-tg:last-of-type,#viewctl .lesson-community {margin:0}
        #viewctl .lesson-community {border:0;padding:0}
        body.lesson-on:not(.predicting):not(.hide-steps) .lbar.do,body.lesson-on .lbar.film {display:grid;grid-template-columns:auto 1fr auto auto;gap:3px 6px;padding:5px 8px;font-size:13px;line-height:1.25}
        .lbar .lb-main {grid-column:2 / -1}
        .lbar .lb-steps {grid-column:2;max-width:none;flex-wrap:nowrap;gap:3px}
        .lbar .lb-seal {writing-mode:horizontal-tb;white-space:nowrap}
        .weakacid-micro .mw-hud,.weakacid-micro .mw-scale {left:10px!important;width:calc(100vw - 20px)!important}
        .weakacid-micro.holo .mw-hud {top:37vh!important;background:#fffdf2ed;padding:5px;box-sizing:border-box}
        .weakacid-micro .mw-scale {top:77px!important;text-align:center;font-size:12px}
        .weakacid-micro .mw-close {left:auto!important;right:10px;top:38px!important}
      }
    `);
    document.head.append(skin);
    const layers = document.querySelectorAll('.mw'), layer = layers[layers.length - 1];
    layer.classList.add('weakacid-micro');
    const scaleNote = layer.querySelector('.mw-scale');
    scaleNote.textContent = '加镁前的电离示意 · 电离比例（25 ℃，0.1 mol/L，理论）';
    for (const [i, percent] of [100, Number(DISSOCIATION)].entries()) {
      scaleNote.append(h('div', { class: 'wa-ratio' }, ACIDS[i],
        h('span', { class: 'wa-track' }, h('i', { style: 'width:' + percent + '%' })),
        h('span', {}, (i ? '约 ' : '') + percent + '%')));
    }
    draw();
    return {
      group: root, card: false, pointer, toggles: ['cards', 'steps'],
      size: { w: 0.35, d: 0.16, h: 0.20 }, view: { azim: 0, elev: 23, lookY: 0.45, frameMargin: 1.10 },
      mount(ui) {
        const replay = h('button', { class: 'go ghost', hidden: true, onclick: () => { S.replay = 0; } }, '重看入液后前 3 秒');
        const review = h('details', { class: 'more', hidden: true }, h('summary', {}, '想一想（选做）'),
          h('p', { class: 'fineprint' }, '两杯酸的浓度相同。哪杯里能自由移动的离子更多？这怎样解释灯的亮暗？'));
        const model = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'),
          h('p', { class: 'fineprint' }, '按 25 ℃ 理想稀溶液估算 pH。盐酸全部电离；醋酸按 Kₐ = 1.75 × 10⁻⁵ 计算（课本第 62 页第 6 题）。'),
          h('p', { class: 'fineprint' }, '按课本第 58 页实验 3-1，取等体积的两种酸和等量镁条。两杯各用专用的洁净探头，导电测试条件相同。两段镁都能反应完。灯光亮暗、气泡个数和反应时间为示意。'),
          h('p', { class: 'fineprint' }, '图 3-1、图 3-2 将水中的 H⁺ 画作 H₃O⁺。特写每次只展示一个酸分子向水转移质子的过程。比例条表示平衡时已电离的比例。'));
        W = { ...mountXuean(ui, { controls: [replay, review, model, moreBox([], reset)], headers: ['比较项目', ...ACIDS], intro: INTRO }), ui, review, replay };
        initRows(); ui.el.classList.add('weakacid-page');
        const next = ui.data.nextElementSibling;
        next.classList.add('big-next'); ui.controls.prepend(next); W.next.remove();
        ui.observePrediction(null); bar.attach(ui);
      },
      update(dt) {
        const k = bar.update(dt);
        drag.update(dt * k);
        advance(dt * k); draw(); showCards();
        W?.ui.el.classList.toggle('weakacid-demo', S.demo);
        mic.update(dt, k);
        const p = entryAt(1);
        entries[1].loc(group, p.x, p.y, p.z).show(canEnter() && !mic.isOpen && !bar.playing);
        entries.forEach((entry, side) => entry.text((S.strips.includes(side) ? '重看' + ACIDS[side] + '加镁前的电离' : '钻进' + ACIDS[side] + '杯看') + ' ⊙'));
      },
      reset,
      dispose() { skin.remove(); W?.ui.el.classList.remove('weakacid-page', 'weakacid-demo'); bar.dispose(); mic.dispose(); drag.dispose(); },
      debug: { get S() { return S; }, qa, bar, mic },
    };
  },
};
