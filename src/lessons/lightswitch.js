// 图5.3-5甲。可调电阻、光敏面、遮光片与红灯一直留在同一块实验板上。
import { lightSwitchRig, SENSOR_X, SHADE_HOME } from './kit/lightSwitchRig.js';
import { VISIBLE_CURRENT, sensorLux, lightSwitchReadings, DAYLIGHT_LUX } from './kit/lightSwitch.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow } from './kit/chemlesson.js';
import { table, buttons, h } from './kit/ui.js';

const initialR = 8000;
const dialGain = 400000;
const stepTitles = { connect: '接线通电', trim: '亮处调灯', cover: '遮光见亮', uncover: '移开见灭' };
const connectHints = ['把 R₁ 的插头拖到红色正极柱。', '把 RG 的插头拖到黑色负极柱。', '把红灯的插头拖到集电极 c。'];
const leadNames = ['R₁', 'RG', '红灯'];

// 照图 5.3-5 甲画成接线参照，两条支路共用电源正、负极。
function circuitFigure() {
  const canvas = h('canvas', { width: 300, height: 160, role: 'img',
    'aria-label': 'R₁ 与 RG 的中点接基极 b，红灯经集电极 c、发射极 e 接负极。',
    style: 'display:block;width:100%;max-width:320px;height:auto;margin:4px auto' });
  const g = canvas.getContext('2d');
  g.strokeStyle = g.fillStyle = '#374640';
  g.lineWidth = 1.7;
  g.lineJoin = 'round';
  function line(...points) {
    g.beginPath(); g.moveTo(...points[0]);
    points.slice(1).forEach(p => g.lineTo(...p));
    g.stroke();
  }
  function arrow(x, y, dx, dy) {
    const a = Math.atan2(dy, dx);
    line([x, y], [x + dx, y + dy]);
    g.beginPath(); g.moveTo(x + dx, y + dy);
    for (const d of [-0.45, 0.45]) g.lineTo(x + dx - 6 * Math.cos(a + d), y + dy - 6 * Math.sin(a + d));
    g.closePath(); g.fill();
  }
  g.font = '15px sans-serif';
  line([260, 14], [70, 14], [70, 36]);
  g.strokeRect(65, 36, 10, 25);
  line([87, 14], [87, 48]); arrow(87, 48, -11, 0);
  line([70, 61], [70, 102]); g.strokeRect(65, 102, 10, 22);
  arrow(45, 96, 14, 12); arrow(42, 104, 14, 12);
  line([70, 124], [70, 145], [260, 145]);
  line([191, 14], [191, 29]); g.strokeRect(186, 29, 10, 19);
  line([191, 48], [191, 57]); line([184, 57], [198, 57], [191, 69], [184, 57]);
  line([184, 69], [198, 69]); arrow(201, 61, 9, -7); arrow(205, 68, 9, -7);
  line([191, 69], [191, 78], [170, 92]); line([170, 83], [170, 112]);
  line([70, 97], [170, 97]); arrow(170, 103, 21, 14); line([191, 117], [191, 145]);
  for (const [x, y] of [[70, 14], [87, 14], [191, 14], [70, 97], [191, 145]]) {
    g.beginPath(); g.arc(x, y, 2.7, 0, 2 * Math.PI); g.fill();
  }
  for (const [label, x, y] of [['＋', 264, 20], ['−', 266, 151], ['R₁', 39, 53], ['RG', 79, 121],
    ['R₂', 200, 45], ['LED', 218, 71], ['b', 153, 92], ['c', 197, 86], ['e', 198, 122]]) g.fillText(label, x, y);
  return canvas;
}
export default {
  id: 'lightswitch',
  fig: '图5.3-5',
  title: '用光敏电阻制作光控开关',
  stampText: '调试',
  predict: {
    q: '怎样让路灯天暗时自动亮、天明时自动灭？先在亮处调到红灯刚灭，再遮住光敏电阻，你猜红灯会怎样？',
    options: ['点亮', '仍然熄灭'],
    answer: 0,
  },
  conclusion: {
    page: 110, rect: [216.5, 369.38, 537.56, 497.68],
    quote: '当环境光比较强时，光敏电阻RG的阻值很小，三极管不导通，发光二极管或继电器所在的回路相当于断路，即发光二极管不工作；继电器处于常开状态，小灯泡L不亮。当环境光比较弱时，光敏电阻RG的阻值变大，三极管导通，且获得足够的基极电流，产生较大的集电极电流，点亮发光二极管或驱动继电器吸合而点亮小灯泡L。',
    why: '可调电阻接正极，光敏电阻接负极，两者的中点接基极。上下两臂的位置、光照和可调电阻共同决定三极管是否导通。',
    src: '课本第 106 页 · 第五章 第3节 利用传感器制作简单的自动控制装置',
  },
  create(ctx) {
    const rig = lightSwitchRig();
    const { group, S, shade, knob, leads, ports } = rig;
    const rows = table(['光敏电阻受光情况', '红灯']);
    const tip = h('div', { class: 'hover-tip' });
    const layout = h('style', {}, `
      @media (max-width:760px) {
        body.lesson-on #viewctl { flex-direction:row; align-items:center; top:54px; bottom:auto; right:8px; gap:4px }
        #viewctl .lesson-community { margin:0; border:0; padding:0 }
        #viewctl .show-tg:last-of-type { margin:0 }
      }
    `);
    const canvas = document.getElementById('c');
    const returns = new Map();
    let ui, aim, resistance, atGrab, firstR, firstX, compared, dragging, cancelled;
    const bar = lessonBar({ ...ctx, group, steps: Object.entries(stepTitles).map(([id, title]) => ({
      id, title, todo: title, target: () => aim,
    })) });
    const rail = i => ({ p: '+', n: '−' }[leads[i].to?.[0]] || null);
    const missing = () => [rail(0) === '+', rail(1) === '−', leads[2].to === 'c'].indexOf(false);
    const uncovered = () => sensorLux(shade.position.x - SENSOR_X, 0) >= DAYLIGHT_LUX - 0.001;
    const current = (x = shade.position.x, dial = resistance) => lightSwitchReadings({
      power: S.closed, resistance: dial, lux: sensorLux(x - SENSOR_X, 0), r1Rail: rail(0), photoRail: rail(1),
      collectorWire: leads[2].to === 'c',
    }).collector;
    const lit = x => current(x) >= VISIBLE_CURRENT;
    const draw = () => rig.draw(resistance, current());
    function say(text, target) {
      aim = target;
      bar.say(text);
    }
    function guide(prefix = '') {
      const give = (text, target) => say(prefix + text, target);
      const i = missing();
      if (i !== -1) {
        if (S.closed) return give('接线未就绪。先断开开关，再按图检查插头。', rig.switchPick);
        return give(connectHints[i], leads[i].plug);
      }
      if (!S.closed) return give('三根线已接好，合上开关给电路供电。', rig.switchPick);
      if (bar.finished) {
        if (compared) return give('增大 R₁ 后，滑片越过原来的红线，灯才亮起来。');
        return give('还可以在亮处调大 R₁，再试灯何时亮。');
      }
      if (!bar.has('trim')) {
        if (!uncovered()) return give('先把滑片从 RG 上方移开，让它充分受光。', shade);
        if (lit()) return give('亮处红灯还亮。拖动旋钮，让指针转向较大刻度，停在灯刚灭处。', knob);
        return give('旋钮调过了。先调小 R₁ 让灯亮起，再慢慢调大到灯刚灭。', knob);
      }
      if (!bar.has('cover')) return give('把滑片推向 RG，观察红灯何时亮起。', shade);
      if (!lit()) return give('灯已灭。先把滑片推向 RG，直到红灯重新亮起。', shade);
      return give('把滑片从 RG 上方移开，观察光照增强时红灯何时熄灭。', shade);
    }
    function turnPower() {
      S.toggle();
      draw();
      if (S.closed && missing() === -1) bar.done('connect');
      guide(S.closed ? '开关已合上。' : '开关已断开。');
    }
    function wireItem(lead, i) {
      let origin, moved;
      return {
        obj: lead.plug, plane: 'xz', offset: 0.014, keepOffset: true,
        hint: '拖动：接' + leadNames[i] + '插头',
        enabled: () => !returns.has(lead),
        onStart() { moved = false; origin = lead.plug.position.clone(); },
        onDrag(p) {
          if (S.closed) return say('插头仍在原位。先断开开关再改线。', rig.switchPick);
          moved = true;
          lead.plug.position.set(clamp(p.x, -0.19, 0.20), origin.y, clamp(p.z, -0.11, 0.12));
          rig.route(i);
        },
        onEnd() {
          if (!moved) return;
          if (cancelled) {
            returns.set(lead, { from: lead.plug.position.clone(), origin, i, t: 0 });
            return guide();
          }
          const pos = lead.plug.position;
          const nearest = Object.keys(ports).reduce((best, key) => {
            const d = Math.hypot(ports[key].x - pos.x, ports[key].z - pos.z);
            return d < best.d ? { key, d } : best;
          }, { key: null, d: 0.014 });
          const key = nearest.key;
          const occupied = key && leads.some(l => l !== lead && l.to === key);
          if (!key || occupied || (i === 2) !== (key === 'c')) {
            returns.set(lead, { from: pos.clone(), origin, i, t: 0 });
            return guide(occupied ? '这个接线柱已有插头。' : '插头没有接上，已退回原位。');
          }
          lead.to = key;
          pos.copy(ports[key]); pos.y += 0.005;
          rig.route(i); draw();
          if (!bar.finished && missing() !== -1 && bar.has('connect')) {
            bar.undo('connect', 'trim', 'cover');
            rows.clear(); firstX = firstR = null; rig.mark.visible = false;
          }
          const wrong = i === 0 && rail(0) !== '+' || i === 1 && rail(1) !== '−';
          const feedback = ['R₁ 已接正极。', 'RG 已接负极。', '红灯已接集电极。'];
          guide(wrong ? '这个插头接错了极性。' : missing() === -1 ? '' : feedback[i]);
        },
      };
    }
    let crossed;
    function slide(p) {
      const from = shade.position.x;
      shade.position.x = clamp(p.x, SENSOR_X, SHADE_HOME);
      draw();
      if (!S.closed || missing() !== -1 || !bar.has('trim')) return;
      const x = shade.position.x;
      if (x < from && !lit(from) && lit(x)) {
        if (!bar.has('cover')) {
          crossed = true;
          // 保存刚达到可见亮度的位置，快拖时也不会把松手处误作阈值。
          let lo = x, hi = from;
          for (let n = 0; n < 16; n++) {
            const mid = (lo + hi) / 2;
            if (lit(mid)) lo = mid; else hi = mid;
          }
          firstX = lo; firstR = resistance;
          rig.mark.position.x = firstX; rig.mark.visible = true;
          rows.add(['逐渐遮光', '亮起']);
          bar.done('cover');
          guide('受光变弱，RG 的阻值变大，红灯亮了。');
        } else if (!bar.finished) {
          crossed = true; guide('红灯亮了。');
        } else if (resistance > firstR && !lit(firstX)) {
          compared = true; guide();
        }
      }
      if (x > from && bar.has('cover') && !bar.finished && lit(from) && !lit(x)) {
        crossed = true;
        rows.add(['恢复光照', '熄灭']);
        bar.done('uncover'); guide('光照增强，红灯自动熄灭。');
      }
    }
    const desk = draggable(group, [
      ...leads.map(wireItem),
      { obj: shade, anchor: shade, keepOffset: true, plane: 'xz', offset: shade.position.y,
        hint: '左右拖：遮光或透光', onStart() { crossed = false; }, onDrag: slide,
        onEnd(moved) {
          if (!moved || crossed) return;
          if (!bar.has('trim') || !S.closed || missing() !== -1) guide();
          else if (!bar.has('cover')) guide('遮光还不够，灯仍灭着。');
          else if (!bar.finished && lit()) guide('红灯亮着。');
        } },
      { obj: knob, plane: 'xz', offset: knob.position.y, hint: '左右拖：转动 R₁',
        onStart() { atGrab = resistance; },
        onDrag(p, start) {
          if (bar.has('trim') && (!uncovered() || !S.closed || missing() !== -1 || (bar.has('cover') && !bar.finished))) return;
          resistance = clamp(atGrab + (p.x - start.x) * dialGain, 1000, 51000);
          if (atGrab !== resistance) compared = false;
          draw();
        },
        onEnd(moved) {
          if (cancelled) { resistance = atGrab; draw(); return guide(); }
          if (!moved || atGrab === resistance || bar.finished || !S.closed || missing() !== -1 || !uncovered()) return guide();
          // 容许学生在灯熄灭的边缘有少量手势误差。
          if (!lit() && current(shade.position.x, resistance / 1.12) >= VISIBLE_CURRENT) {
            if (!bar.has('trim')) rows.add(['亮处调好 R₁', '刚好熄灭']);
            bar.done('trim'); guide('亮处红灯刚灭。');
          } else {
            if (bar.has('trim')) { bar.undo('trim'); rows.clear(); }
            guide();
          }
        } },
    ], { taps: [{ obj: rig.switchPick, hint: () => S.closed ? '点一下：断开开关' : '点一下：合上开关', onTap: turnPower }] });
    const hideTip = () => tip.classList.remove('on');
    canvas.addEventListener('pointerleave', hideTip);
    const pointer = {
      items: () => desk.items().filter(it => it.enabled?.() !== false),
      down(ray, e) {
        if (ui?.step === 2) return false;
        hideTip();
        dragging = desk.down(ray, e);
        if (dragging && ui?.step === 0) ui.go(1);
        return dragging;
      },
      move(ray, e) {
        if (!dragging && ui?.step !== 1) { hideTip(); return false; }
        const held = desk.move(ray, e), item = desk.hovered();
        if (held || !item || !e || e.pointerType === 'touch') { hideTip(); return held; }
        tip.textContent = typeof item.hint === 'function' ? item.hint() : item.hint;
        tip.style.transform = 'translate(' + clamp(e.clientX + 12, 4, innerWidth - tip.offsetWidth - 4) + 'px,' +
          Math.min(e.clientY + 18, innerHeight - 36) + 'px)';
        tip.classList.add('on');
        return false;
      },
      up(ray, e) {
        cancelled = e?.type === 'pointercancel'; dragging = false;
        const handled = desk.up(ray, e);
        cancelled = false; return handled;
      },
    };
    function reset() {
      returns.clear(); rows.clear(); hideTip();
      S.closed = false; S.update(1);
      resistance = initialR; firstR = firstX = null; compared = dragging = false;
      shade.position.x = SHADE_HOME; rig.mark.visible = false;
      leads.forEach((l, i) => { l.to = null; l.plug.position.copy(l.home); rig.route(i); });
      bar.undo(...Object.keys(stepTitles)); ui?.relock(); draw(); guide();
      if (ui) ctx.reframe();
    }
    reset();
    const mounted = new group.constructor();
    mounted.add(group); group.position.y = 0.0066;
    const wire = (i, key) => ({ name: leadNames[i] + ' 接 ' + key, drag: leads[i].plug, to: ports[key] });
    function adjust(value) {
      const step = qaFlow(desk, [{ name: '调节旋钮至 ' + value, drag: knob,
        to: () => knob.position.clone().setX(knob.position.x + (value - resistance) / dialGain) }])[0];
      step.run = () => {
        const d = desk.items().find(it => it.obj === knob);
        d.onStart(); d.onDrag(step.mouse.to(), knob.position); d.onEnd(true);
      };
      return step;
    }
    const toggle = { name: '拨动刀开关', tap: rig.switchPick };
    const cover = { name: '遮挡光敏面', drag: shade, to: () => shade.position.clone().setX(SENSOR_X) };
    const uncover = { name: '恢复光照', drag: shade, to: () => shade.position.clone().setX(SHADE_HOME) };
    const check = (pass, msg) => { if (!pass) throw Error(msg); };
    const qa = [
      { name: '插头未放到接线柱', drag: leads[0].plug, to: leads[0].home.clone().setX(-0.026) },
      { name: '核对插头已归位', run: () => check(leads[0].plug.position.equals(leads[0].home), '未归位') },
      toggle, { name: '断路不能点亮红灯', run: () => check(!lit() && bar.current === 'connect', '未接线却已通电完成') }, toggle,
      wire(0, 'n1'), wire(0, 'p1'), wire(1, 'n1'), wire(2, 'c'), toggle,
      adjust(32000), { name: '旋钮调过量', run: () => check(!lit() && bar.current === 'trim', '过调却完成') },
      adjust(10500), adjust(15200), cover, uncover,
      { name: '核对亮灭记录', run: () => check(bar.finished && !lit() && rows.rows.length === 3, '未完成亮灭观察') },
      adjust(34000), cover, { name: '增大电阻要遮得更暗', run: () => check(compared && lit(), '对照现象未出现') }, uncover,
      { name: '掀开课本原文', run() { ui.go(2); ui.el.querySelector('.flap-front').click(); } },
    ].map(s => s.mouse ? s : qaFlow(desk, [s])[0]);
    return {
      group: mounted, card: false, size: { w: 0.43, h: 0.20, d: 0.27 },
      view: { elev: 35, azim: 3, frameMargin: 1.06 }, toggles: ['steps'], pointer, reset,
      mount(panel) {
        ui = panel;
        bar.attach({ need: () => ui.need(''), unlock() { ui.unlock(); ui.need(''); } });
        ui.status('图 5.3-5 甲　红色发光二极管模拟路灯。');
        ui.controls.append(circuitFigure(), h('p', {}, '滑片完全遮住 RG 时，仍有少量散射光照到它。RG 的阻值和红灯刚亮时的光照条件均为模型示意。'));
        ui.data.append(rows.el, buttons([{ text: '全部重来', ghost: true, onClick: reset }]).el);
        ui.el.querySelector('.answer .src').style.cssText = 'padding-right:82px;min-height:52px';
        document.head.append(layout); document.body.append(tip); guide();
      },
      update(dt) {
        bar.update(dt); S.update(dt);
        for (const [lead, r] of returns) {
          r.t = Math.min(1, r.t + dt / 0.36);
          if (r.t === 1) { lead.plug.position.copy(r.origin); returns.delete(lead); }
          else lead.plug.position.lerpVectors(r.from, r.origin, r.t * (2 - r.t));
          rig.route(r.i);
        }
        if (ui?.step !== 1) hideTip();
      },
      dispose() { canvas.removeEventListener('pointerleave', hideTip); tip.remove(); layout.remove(); desk.dispose(); bar.dispose(); },
      debug: { bar, qa },
    };
  },
};
