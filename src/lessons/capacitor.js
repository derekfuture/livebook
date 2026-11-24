// 必修三图 10.4-1。开关、两块仪表、笔记本始终观察同一只电容器。
import { capacitorRig } from './kit/capacitorRig.js';
import { observeCapacitor, SOURCE_VOLTS } from './kit/capacitor.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { buttons, chart, h, note, table } from './kit/ui.js';
import { qaFlow } from './kit/chemlesson.js';

const chargeTask = '把黑柄拨到 1 给电容器充电，看指针偏向哪边，等电压表示数稳定。';
const dischargeTask = '电压稳定了，电流表指针已回到零线附近。拨到 2，通过电阻放电。';
const complete = '放电时指针反向偏转，又回到零线附近；电压也降到了零。可以掀开课本原文了。';

export default {
  id: 'capacitor',
  fig: '图10.4-1',
  title: '观察电容器的充、放电现象',
  stampText: '观察',
  predict: {
    q: '电容器怎样“装进”和“倒出”电荷？先接 1 充电，再接 2 放电，同一只电流表的指针会怎样偏转？',
    options: ['先向一侧偏，放电时向另一侧偏', '两次都向同一侧偏', '放电时始终指零'],
    answer: 0,
    hint: '比较电流在同一只电流表中的方向。',
  },
  conclusion: {
    crops: [
      { page: 42, rect: [216.38, 695.23, 537.38, 759.22] },
      { page: 43, rect: [63.79, 54.2, 384.89, 161.5] },
    ],
    quote: '随着两极板之间电势差的增大，充电电流逐渐减小至0，此时电容器两极板带有一定的等量异种电荷。即使断开电源，两极板上的电荷由于相互吸引而仍然被保存在电容器中。……把开关S接2，电容器对电阻R放电。观察电流表可以知道，放电电流由电容器的正极板经过电阻R流向电容器的负极板，正负电荷中和。此时两极板所带的电荷量减小，电势差减小，放电电流也减小，最后两极板电势差以及放电电流都等于0。',
    why: '充电时两极板分别积累等量异种电荷，电压升高，电流逐渐减小。开关断开后电荷暂时保留。接通放电回路时电容器通过电阻放电，电压降低，电流逐渐趋近零。',
    src: '课本第 38–39 页 · 第十章 第4节 电容器的电容',
  },
  create(ctx) {
    const rig = capacitorRig(), { group, pivot, radius, throwAngle } = rig;
    // qaFlow 的鼠标终点与拖动平面都使用装置的局部坐标。
    const root = new ctx.THREE.Group();
    root.add(group);
    let ui, graph, records, plates, form, input, reading, near = false;
    let angle = 0, contact = 0, voltage = 0, current = 0, elapsed = 0, startV = 0;
    let held = false, origin = 0, releaseSlot = null, returning = null, trace = null;
    const charge = [], discharge = [];
    const atAngle = q => rig.neutral.clone().setX(pivot.x + radius * Math.sin(q)).setZ(pivot.z - radius * Math.cos(q));
    const slotAngle = slot => slot === 1 ? -throwAngle : slot === 2 ? throwAngle : 0;
    const stable = () => contact === 0 || Math.abs(voltage - (contact === 1 ? SOURCE_VOLTS : 0)) < 0.005;
    const target = () => near || held || (contact && !stable()) ? null : rig.handle;
    const bar = lessonBar({ ...ctx, group, back: leave, steps: [
      { id: 'charge', title: '接 1 充电', todo: chargeTask, target },
      { id: 'discharge', title: '接 2 放电', todo: dischargeTask, target },
    ] });

    function guide() {
      if (near) {
        bar.say('左边看电流表的零线和指针，右边读两极板间的电压。回到全景可再拨开关。');
        return;
      }
      if (contact === 0) {
        if (voltage >= 0.005) {
          bar.say('刀片断开，电流为零，电压仍保持原值。' + (bar.has('charge') ? '拨到 2 看放电。' : '拨回 1 继续充电。'));
        } else bar.say(bar.finished ? '电流和电压都已接近零，可以再充一次电。' : chargeTask);
      } else if (contact === 1) {
        bar.say(stable() ? dischargeTask : '电流从电源正极流向正极板，指针右偏后回落。保持接 1，看电压升高到稳定。');
      } else if (startV < 0.005) {
        bar.say('两只表都指零，没有可观察到的放电电流。拨到 1 先充电。');
      } else if (!bar.has('charge')) {
        bar.say('还没充满就接了 2，电压从刚才的值下降。拨回 1，等电压稳定。');
      } else {
        bar.say(stable() ? complete : '指针左偏，电流从正极板经电阻流向负极板。保持接 2，看电流和电压怎样降到零。');
      }
    }
    function readForm() {
      if (!form) return;
      form.hidden = !near || !stable();
    }
    function clearReading() {
      if (!reading) return;
      input.value = '';
      reading.textContent = '';
    }
    function connect(next) {
      if (next === contact) return;
      contact = next; elapsed = 0; startV = voltage;
      current = observeCapacitor(startV, contact, 0).current;
      trace = null;
      if (contact && !stable()) {
        trace = contact === 1 ? charge : discharge;
        trace.length = 0;
        trace.push([0, current * 1000]);
        graph.draw();
      }
      rig.draw(voltage, current);
      clearReading(); readForm(); guide();
    }
    function setAngle(q) {
      angle = q;
      rig.setAngle(q);
    }
    function inspect() {
      if (near) return;
      near = true;
      ctx.look([innerWidth <= 760 ? 0.147 : 0.133, 0.024, -0.085], [0, 1, 0.18], 0.405, leave);
      bar.near(true); readForm(); guide();
    }
    function leave() {
      if (near) ctx.back();
      near = false;
      bar.near(false); clearReading(); readForm(); guide();
    }
    function record(readVoltage = '—') {
      const slot = ['中位断开', '接 1 充电', '接 2 放电'][contact];
      const trend = ['保持原值', '升高后稳定', '降至零'][contact];
      const cells = [slot, Math.abs(startV - voltage) < 0.005 && contact ? '示数稳定' : trend, readVoltage];
      const index = records.rows.findIndex(row => row[0] === slot);
      if (index < 0) records.add(cells);
      else records.set(index, cells);
      records.el.hidden = false;
    }
    function checkReading(event) {
      event.preventDefault();
      if (!near || !stable()) return;
      const value = Number(input.value), shown = Number(voltage.toFixed(2));
      if (!input.value.trim() || !Number.isFinite(value)) reading.textContent = '填入数字电压表上的读数。';
      else if (Math.abs(value - shown) > 0.00001)
        reading.textContent = '读数偏' + (value > shown ? '大' : '小') + '了。看清右边电压表的小数点和两位小数。';
      else {
        reading.textContent = '读对了，电压表显示 ' + shown.toFixed(2) + ' V。';
        record(shown.toFixed(2));
      }
    }
    const desk = draggable(group, [{
      obj: rig.grip, anchor: rig.grip, keepOffset: true, plane: 'xz', offset: rig.neutral.y,
      hint: '左右拨：切换触点', enabled: () => !near && !returning,
      onStart() { held = true; origin = contact; releaseSlot = origin; },
      onDrag(p) {
        const raw = Math.atan2(p.x - pivot.x, pivot.z - p.z);
        setAngle(clamp(raw, -throwAngle, throwAngle));
        releaseSlot = [0, 1, 2].find(slot => atAngle(slotAngle(slot)).distanceTo(p) <= 0.014);
        const touching = Math.abs(angle) >= throwAngle - 0.045;
        connect(touching && releaseSlot != null ? releaseSlot : 0);
      },
      onEnd(moved) {
        held = false;
        if (!moved) return;
        const slot = releaseSlot == null ? origin : releaseSlot;
        if (releaseSlot == null) {
          returning = { from: angle, slot, t: 0 };
          bar.say('刀片没停在触点或中位，松手后回到原位。');
        } else {
          setAngle(slotAngle(slot)); connect(slot); guide();
        }
      },
    }], { taps: [rig.dial, rig.screen].map(obj => ({
      obj, enabled: () => !near, hint: '点一下：近看两只表', onTap: inspect,
    })) });
    const tip = ctx.tag('', 'pill');
    tip.show(false);
    const hideTip = () => tip.show(false);
    const canvas = document.getElementById('c');
    canvas.addEventListener('pointerleave', hideTip);
    // 两极板同时增减一对符号。符号数量表示相对电荷量，部分显现的符号使变化连续。
    function drawPlates() {
      const ratio = Math.round(voltage / SOURCE_VOLTS * 120) / 120;
      if (plates.dataset.level === String(ratio)) return;
      plates.dataset.level = String(ratio);
      const c = plates.getContext('2d');
      c.clearRect(0, 0, 300, 55);
      c.font = '14px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      for (const [y, positive] of [[14, true], [40, false]]) {
        c.fillStyle = '#454b49'; c.fillText(positive ? '正极板' : '负极板', 28, y);
        c.fillStyle = '#e9e6dc'; c.fillRect(58, y - 10, 236, 20);
        c.fillStyle = '#817e72'; c.fillRect(58, y + (positive ? 10 : -11), 236, 1);
        c.fillStyle = '#324442';
        for (let i = 0; i < 10; i++) {
          c.globalAlpha = clamp(ratio * 10 - i, 0, 1);
          const x = 70 + ((i * 7 + 4) % 10) * 23.5;
          c.fillRect(x - 4.5, y - 0.9, 9, 1.8);
          if (positive) c.fillRect(x - 0.9, y - 4.5, 1.8, 9);
        }
        c.globalAlpha = 1;
      }
    }
    function reset() {
      if (near) leave();
      returning = trace = null; held = false;
      elapsed = startV = current = contact = voltage = 0;
      charge.length = discharge.length = 0;
      records.clear(); records.el.hidden = true;
      setAngle(0); rig.draw(0, 0); drawPlates(); graph.draw(); hideTip(); clearReading(); readForm();
      bar.undo('charge', 'discharge'); ui.relock(); ctx.reframe(); guide();
    }
    const qa = qaFlow(desk, [
      { name: '先接 2，两表仍指零', drag: rig.grip, to: atAngle(throwAngle) },
      { name: '接 1 观察充电', drag: rig.grip, to: atAngle(-throwAngle), wait: 1 },
      { name: '中途断开，观察电压保持', drag: rig.grip, to: atAngle(0) },
      { name: '近看电表', tap: rig.screen },
      { name: '核对断开时的读数', run() {
        if (!near || contact !== 0 || voltage !== startV || voltage <= 0 || current !== 0) throw Error('断开观察失败');
        input.value = '9'; form.querySelector('button').click();
        if (!reading.textContent.includes('偏大')) throw Error('错读没有反馈');
        input.value = voltage.toFixed(2); form.querySelector('button').click();
        if (!reading.textContent.includes('读对了')) throw Error('正确读数未确认');
        leave();
      } },
      { name: '重新接 1，等电压稳定', drag: rig.grip, to: atAngle(-throwAngle), wait: 20 },
      { name: '直接从 1 拨到 2，观察反向电流', drag: rig.grip, to: atAngle(throwAngle), wait: 20 },
      { name: '核对两条曲线和结论', run() {
        if (!bar.finished || !charge.length || !discharge.length || charge[0][1] <= 0 || discharge[0][1] >= 0 || !stable())
          throw Error('记录与两表不符');
        ui.go(2); ui.el.querySelector('.flap-front').click();
      } },
    ]);
    return {
      group: root, size: { w: 0.48, d: 0.28, h: 0.06 },
      view: { elev: 54, azim: 0, get frameMargin() { return innerWidth <= 760 ? 1.20 : 1.00; } }, toggles: ['steps'], reset,
      debug: { bar, qa },
      predicting() { hideTip(); },
      pointer: {
        items: () => desk.items().filter(item => item.enabled()),
        down(ray, e) {
          hideTip();
          if (near) return false;
          const used = desk.down(ray, e);
          if (used && ui?.step === 0) ui.go(1);
          return used;
        },
        move(ray, e) {
          if (!held && (near || ui?.step !== 1)) { hideTip(); return false; }
          const used = desk.move(ray, e), item = desk.hovered();
          if (!held && item) {
            const p = group.worldToLocal(item.obj.getWorldPosition(new ctx.THREE.Vector3()));
            tip.loc(group, p.x, p.y + 0.023, p.z).text(item.hint).show(true);
          } else hideTip();
          return used;
        },
        up(ray, e) { return desk.up(ray, e); },
      },
      mount(panel) {
        ui = panel;
        bar.attach({ need: () => ui.need(''), unlock: () => ui.unlock() });
        ui.status('极板上的电荷和导线上的电流箭头均为示意。');
        plates = h('canvas', { width: 300, height: 55, role: 'img', 'aria-label': '两极板所带的等量异种电荷', style: 'width:100%;height:auto;display:block' });
        drawPlates();
        ui.controls.append(plates);
        input = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', style: 'width:5em;margin:0 .5em;padding:.2em .4em;font:inherit' });
        form = h('form', { class: 'ctl', hidden: true, onsubmit: checkReading },
          h('label', {}, '电压表读数（V） ', input), h('button', { type: 'submit', class: 'go ghost', style: 'width:auto;margin:0;padding:.2em .7em' }, '核对'));
        reading = h('p', { class: 'note', 'aria-live': 'polite' }); form.append(reading);
        ui.controls.append(form);
        graph = chart({
          x: { label: 't / s', min: 0, max: 16, ticks: [0, 4, 8, 12, 16] },
          y: { label: 'I / mA', min: -6.5, max: 6.5, ticks: [-6, -3, 0, 3, 6] },
          series: [{ points: charge, color: '#ad4d30', width: 5 }, { points: discharge, color: '#226e83', width: 5 }],
          legend: '<b style="color:#ad4d30">接 1 充电</b>　<b style="color:#226e83">接 2 放电</b>　各从接通时计时。',
        });
        records = table(['开关位置', '电压变化', '自读电压 / V']);
        records.el.hidden = true;
        ui.data.append(graph.el, records.el, buttons([{ text: '全部重来', ghost: true, onClick: reset }]).el);
        ui.notes.append(note('模型取电源 6 V、电阻 1 kΩ、电容 2200 μF，忽略漏电。电流流入电容器正极板时取正。'));
        const source = ui.el.querySelector('.answer .src');
        source.style.paddingRight = '84px'; source.style.minHeight = '48px';
        readForm(); guide(); rig.draw(0, 0);
      },
      update(dt) {
        const scale = bar.update(dt);
        if (returning) {
          returning.t = Math.min(1, returning.t + dt / 0.40);
          setAngle(slotAngle(returning.slot) + (returning.from - slotAngle(returning.slot)) * (1 - returning.t) ** 2);
          if (returning.t === 1) { connect(returning.slot); returning = null; guide(); }
        }
        if (!contact) return;
        const wasStable = stable();
        elapsed += dt * scale;
        const state = observeCapacitor(startV, contact, elapsed);
        voltage = state.voltage; current = state.current;
        rig.draw(voltage, current); drawPlates();
        if (trace) {
          const t = Math.min(elapsed, 16), last = trace[trace.length - 1][0];
          if (t - last >= 0.16 || (t === 16 && last < t)) {
            trace.push([t, observeCapacitor(startV, contact, t).current * 1000]); graph.draw();
          }
        }
        if (!wasStable && stable()) {
          record();
          if (contact === 1) bar.done('charge');
          else if (bar.has('charge')) bar.done('discharge');
          readForm(); guide();
        }
      },
      dispose() { canvas.removeEventListener('pointerleave', hideTip); desk.dispose(); bar.dispose(); rig.dispose(); },
    };
  },
};
