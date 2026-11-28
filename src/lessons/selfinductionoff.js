import { SelfInductionCircuit } from './kit/selfInduction.js';
import { selfInductionOffRig, SLOT, PARKS, COIL_COLOR, LAMP_COLOR } from './kit/selfInductionOffRig.js';
import { draggable } from './kit/interact.js';
import { qaFlow } from './kit/chemlesson.js';
import { buttons, chart, h, note } from './kit/ui.js';

const GOAL = '观察断开开关的一瞬间，灯有多亮，两条支路里的电流各往哪边流。';
const CHANGE = '点开关决定通电多久。看到「可以换线圈」后，把线圈拖回右侧空座，再换上另一只。';
const LIVE = '线圈还在通电，先断开开关。';
const REPLAY = '正在慢放断电过程，请稍候。';
const DISCHARGING = '线圈仍在放电，请稍候。';
const READY = '可以换线圈了。';
const MISSED = '线圈没有对准空座，已回到原位。';
const FLASH = '灯明显闪亮了一下，随后变暗。';
const SLIGHT = '灯略亮了一下，随后变暗。';
const FADE = '灯逐渐变暗。';
const NO_COIL = '线圈插座空着。断电后灯中电流立即消失，只剩灯丝的余光。';
const PRE = 0.12, POST = 0.24, SAMPLE = 0.004;

export default {
  id: 'selfinductionoff',
  fig: '图2.4-3',
  title: '观察断电自感',
  stampText: '观察',
  predict: {
    q: '灯泡与线圈并联。断开电源后，灯泡一定会先闪亮再熄灭吗？',
    options: ['不一定，要看断开前线圈中的电流', '一定会', '一定立即熄灭'],
    answer: 0,
  },
  conclusion: {
    page: 47, rect: [64.0, 578.0, 384.0, 745.0],
    quote: '开关断开以后，线圈中的电流并未立即消失……当线圈刚刚接通电源的时候，自感电动势阻碍线圈中电流的增加；当电源断开的时候，自感电动势又阻碍线圈中电流的减小。线圈的自感系数越大，这个现象越明显，线圈能够体现电的“惯性”。',
    why: '断开电源后，线圈与灯泡仍构成闭合回路，线圈储存的磁能逐渐转化为内能。若断开前线圈电流比灯泡电流大，断开时流过灯泡的反向电流就比原来的电流大，灯泡可能先亮一下再熄灭。',
    src: '课本第 43 页 · 第二章 第4节 互感和自感',
  },
  create(ctx) {
    const rig = selfInductionOffRig();
    const model = new SelfInductionCircuit({ kind: 'turnOff' });
    const plot = chart({
      x: { label: 't / s', min: -PRE, max: POST, ticks: [-0.12, 0, 0.12, 0.24] },
      y: { label: 'I / mA', min: -85, max: 85, ticks: [-80, -40, 0, 40, 80] },
      height: 148, fit: false,
    });
    const coilLine = { points: [], color: COIL_COLOR, width: 5 };
    const lampLine = { points: [], color: LAMP_COLOR, width: 5 };
    plot.series = [coilLine, lampLine];
    const feedback = h('p', { class: 'status', 'aria-live': 'polite' });
    const legend = h('p', { class: 'note' },
      h('b', { style: 'color:' + COIL_COLOR }, '线圈 L'), '　',
      h('b', { style: 'color:' + LAMP_COLOR }, '灯泡 A'), '　向右为正（示意）');
    let ui, toggleButton, mounted = 0, held = null, returning = null;
    let eventTime = null, opening = null, settled = false, sampleClock = 0;
    let result = '', graphLabel = '', history = [];
    const enter = () => { if (ui.step !== 1) ui.go(1); };
    const say = text => { feedback.textContent = text; };
    const safe = () => !model.closed && !opening && model.current < 1e-6 && model.lampResponse[0] < 0.001;
    function sample() {
      const s = model.observe();
      return [model.time, s.coilCurrent * 1000, s.otherCurrent * 1000];
    }
    function append([t, coil, lamp]) {
      coilLine.points.push([t - eventTime, coil]);
      lampLine.points.push([t - eventTime, lamp]);
    }
    plot.extra = (g, X, Y) => {
      g.strokeStyle = '#887d67'; g.lineWidth = 2; g.setLineDash([5, 5]);
      g.beginPath(); g.moveTo(X(0), Y(81)); g.lineTo(X(0), Y(-81)); g.stroke(); g.setLineDash([]);
      if (eventTime !== null) {
        g.font = '22px sans-serif'; g.fillStyle = '#534b3a';
        g.textAlign = 'right';
        g.fillText(graphLabel, X(plot.x.max) - 4, Y(-68));
      }
    };
    function toggle() {
      enter();
      if (held || returning) return say('先把线圈放稳，再操作开关。');
      const before = sample();
      const closing = !model.closed;
      if (!closing) {
        opening = { before, baseline: model.lampResponse[0], peak: model.lampResponse[0] };
      } else opening = null;
      graphLabel = (mounted === null ? '无线圈' : model.coilResistance + ' Ω') + (closing ? ' · 闭合' : ' · 断开');
      eventTime = model.time;
      plot.x.max = closing ? 0.72 : POST;
      plot.x.ticks = closing ? [0, 0.24, 0.48, 0.72] : [-PRE, 0, 0.12, POST];
      coilLine.points.length = lampLine.points.length = 0;
      for (const point of history) if (point[0] >= eventTime - PRE) append(point);
      append(before);
      model.switch(closing);
      const after = sample();
      append(after);
      history.push(before, after);
      settled = false;
      result = '';
      toggleButton.textContent = closing ? '断开开关' : '闭合开关';
      plot.draw(); rig.draw(model);
      if (closing) say(mounted === null ? '灯亮了，线圈插座空着，电流只通过灯泡。' : '灯亮了，两条支路的电流都向右，线圈中的电流逐渐增大。');
      else say(mounted === null ? NO_COIL : '断电慢放中。电源支路已断开，线圈电流仍向右，沿导线从右向左流过灯泡。');
    }
    function complete() {
      result = NO_COIL;
      if (mounted !== null) {
        const [, coil, lamp] = opening.before;
        const comparison = coil > lamp ? '比原来的灯泡电流大' : coil < lamp ? '比原来的灯泡电流小' : '与原来的灯泡电流相等';
        const rise = opening.peak - opening.baseline;
        const light = rise > Math.max(0.08, opening.baseline * 0.15) ? FLASH : rise > 0 ? SLIGHT : FADE;
        result = `断开瞬间，线圈电流方向不变。灯泡电流反向，大小等于断开前的线圈电流，${comparison}。${light}`;
      }
      ui.observePrediction(result);
      if (mounted !== null && opening.before[1] > 0.5) { ui.unlock(); ui.need(''); }
      opening = null;
      if (!safe()) say(result + DISCHARGING);
    }
    function advance(dt) {
      const wasSafe = safe();
      const end = model.time + dt;
      let dirty = false;
      while (model.time < end - 1e-9) {
        const step = Math.min(SAMPLE - sampleClock, end - model.time);
        model.advance(step);
        sampleClock += step;
        if (opening) opening.peak = Math.max(opening.peak, model.lampResponse[0]);
        if (sampleClock >= SAMPLE - 1e-9) {
          sampleClock = 0;
          const point = sample();
          history.push(point);
          while (history.length && history[0][0] < model.time - PRE) history.shift();
          if (model.time - eventTime <= plot.x.max + 1e-9) { append(point); dirty = true; }
        }
      }
      if (dirty) plot.draw();
      if (opening && model.time - eventTime >= POST - 1e-8) complete();
      if (!wasSafe && safe()) say(result + READY);
      if (model.closed && !settled && model.time - eventTime > 0.65) {
        settled = true;
        if (mounted !== null) say('灯已亮稳。现在断开开关，看灯光和两条电流箭头怎样变。');
      }
    }
    function connect(i) {
      model.coilResistance = i ? 150 : 50;
      model.setCoilConnected(true);
      mounted = i;
    }
    function restore(i, home) {
      rig.coils[i].body.position.copy(home);
      if (home.equals(SLOT)) connect(i);
    }
    const drags = rig.coils.map(({ body, pick }, i) => ({
      obj: pick, anchor: body, plane: 'xz', offset: 0.03, keepOffset: true,
      hint: () => ui?.step === 1 && safe() ? (mounted === i ? '拖动：移出线圈' : '拖动：装入线圈') : '',
      onStart() {
        enter();
        if (returning) return;
        if (!safe()) { say(model.closed ? LIVE : opening ? REPLAY : DISCHARGING); return; }
        held = { i, home: body.position.clone() };
      },
      onDrag(p) {
        if (held?.i !== i) return;
        if (mounted === i) { model.setCoilConnected(false); mounted = null; }
        body.position.set(Math.max(-0.26, Math.min(0.26, p.x)), 0, Math.max(-0.19, Math.min(0.19, p.z)));
      },
      dropzones: [
        { name: '线圈插座', position: SLOT, radius: 0.028, enabled: () => held?.i === i && (mounted === null || mounted === i) },
        { name: '备用座', position: PARKS[i], radius: 0.032, enabled: () => held?.i === i },
      ],
      onEnd(moved, zone) {
        if (held?.i !== i) return;
        const home = held.home;
        held = null;
        if (!moved) return;
        if (zone) {
          restore(i, zone.position);
          say(zone.position === SLOT ? (i ? '150 Ω' : '50 Ω') + ' 线圈已接入，与灯泡并联。' :
            mounted === null ? '线圈已放回备用座，插座空着。' : '线圈已放回备用座。');
        } else {
          returning = { i, from: body.position.clone(), home, t: 0 }; say(MISSED);
        }
      },
    }));
    const tip = ctx.tag('', 'pill');
    tip.el.style.marginLeft = '32px';
    const desk = draggable(rig.group, drags, { tip, taps: [{
      obj: rig.switchPick, hint: () => ui?.step === 1 ? (model.closed ? '点一下：断开开关' : '点一下：闭合开关') : '', onTap: toggle,
    }] });
    function reset() {
      desk.clearDropzones(); model.reset(); connect(0);
      rig.coils.forEach(({ body }, i) => body.position.copy(i ? PARKS[i] : SLOT));
      held = returning = opening = eventTime = null;
      settled = false; result = ''; history = []; sampleClock = 0;
      coilLine.points.length = lampLine.points.length = 0;
      plot.x.max = POST; plot.x.ticks = [-PRE, 0, 0.12, POST];
      rig.draw(model); plot.draw(); say(''); toggleButton.textContent = '闭合开关';
      ui.observePrediction(null); ui.relock(); ctx.reframe();
    }
    rig.draw(model);
    const assert = (test, message) => { if (!test) throw new Error(message); };
    return {
      group: rig.root, card: false, pointer: desk, reset, toggles: [],
      size: { w: 0.68, d: 0.46, h: 0.095 },
      view: { elev: 51, azim: -3, frameMargin: 1.04 },
      mount(panel) {
        ui = panel; ui.status(GOAL);
        const controls = buttons([{ text: '闭合开关', onClick: toggle }, { text: '全部重做', ghost: true, onClick: reset }]);
        toggleButton = controls.el.querySelector('button');
        ui.controls.append(h('div', {}, note(CHANGE), controls.el, feedback));
        ui.data.append(legend, plot.el,
          note('横轴是模型时间，0 s 表示开关切换。通电时放慢 5 倍，断电后的前 0.24 s 放慢 25 倍。'),
          note('曲线由模型计算。两只线圈的电感均为 8 H，换线圈只改变线圈电阻。'),
          note('电源电动势为 4 V，内阻为 2 Ω。灯泡电阻取 100 Ω，灯光用 20 ms 的响应时间近似表示灯丝亮度的变化。'));
      },
      update(dt) {
        desk.update(dt);
        if (returning) {
          const r = returning;
          r.t = Math.min(1, r.t + dt / 0.38);
          rig.coils[r.i].body.position.lerpVectors(r.from, r.home, 1 - (1 - r.t) ** 2);
          if (r.t === 1) { restore(r.i, r.home); returning = null; }
        }
        if (eventTime !== null) {
          const speed = model.closed ? 0.2 : opening ? 0.04 : 1;
          advance(dt * speed * (window.__lbTimeScale || 1));
        }
        rig.draw(model);
      },
      dispose() { desk.dispose(); rig.dispose(); },
      debug: {
        get state() { return { closed: model.closed, mounted, current: model.current, lamp: model.observe().otherCurrent,
          brightness: model.lampResponse[0], elapsed: model.time - eventTime, discharge: !!opening, result, settled }; },
        qa: qaFlow(desk, [
          { name: '在实物上合闸', tap: rig.switchPick, wait: 4.5 },
          { name: '带电尝试取线圈', drag: rig.coils[0].pick, to: PARKS[0] },
          { name: '核对通电方向与保护', run() { assert(model.closed && mounted === 0 && feedback.textContent === LIVE && model.current > model.observe().otherCurrent, '通电状态不符'); } },
          { name: '断开开关看反向', tap: rig.switchPick, wait: 0.1 },
          { name: '核对跃变与连续性', run() {
            const k = coilLine.points.findIndex(p => p[0] === 0);
            const l = coilLine.points[k][1], a = lampLine.points[k][1];
            assert(l > a && a > 0 && coilLine.points[k + 1][1] === l && lampLine.points[k + 1][1] === -l, '切换瞬间的电流不符');
          }, wait: 6.8 },
          { name: '核对闪亮与解锁', run() { assert(result.includes('比原来的灯泡电流大') && result.endsWith(FLASH) && !ui.el.querySelector('.flap.locked'), '未完成断电观察'); } },
          { name: '线圈放偏后松手', drag: rig.coils[0].pick, to: SLOT.clone().set(0.05, 0, -0.16) },
          { name: '核对退回原插座', run() { assert(mounted === 0 && feedback.textContent === MISSED && rig.coils[0].body.position.equals(SLOT), '放偏未归位'); } },
          { name: '取出小电阻线圈', drag: rig.coils[0].pick, to: PARKS[0] },
          { name: '装入大电阻线圈', drag: rig.coils[1].pick, to: SLOT },
          { name: '合闸使灯亮稳', tap: rig.switchPick, wait: 4 },
          { name: '断开看逐渐熄灭', tap: rig.switchPick, wait: 8 },
          { name: '核对换线圈后再重来', run() {
            assert(mounted === 1 && result.includes('比原来的灯泡电流小') && result.endsWith(FADE) && feedback.textContent.endsWith(READY) && lampLine.points.some(p => p[1] < 0), '大电阻线圈对照不符');
            reset(); assert(ui.step === 0 && model.current === 0 && !coilLine.points.length && mounted === 0, '重来未复原');
          } },
        ]),
      },
    };
  },
};
