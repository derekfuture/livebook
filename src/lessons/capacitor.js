// 必修三图 10.4-1。开关、两块仪表、笔记本始终观察同一只电容器。
import { capacitorRig } from './kit/capacitorRig.js';
import { observeCapacitor, SOURCE_VOLTS } from './kit/capacitor.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { buttons, chart, h, note, table } from './kit/ui.js';
import { drawSchematic } from './kit/circuit.js';
import { qaFlow } from './kit/chemlesson.js';

const chargeTask = '把黑柄拨到 1 给电容器充电，看指针偏向哪边，等电压表示数稳定。';
const dischargeTask = '电压稳定了，电流表指针已回到零线附近。拨到 2，通过电阻放电。';
const complete = '放电时指针反向偏转，又回到零线附近；电压也降到了零。可以掀开课本原文了。';

const wireTasks = [
  '开关保持中位。把开关引出的线头拖到电流表的红柱。',
  '把电容器正极引出的线头拖到电流表的黑柱，使电流表串入回路。',
  '把数字电压表的红线头拖到电容器的正极。',
  '把数字电压表的黑线头拖到电容器的负极，使电压表并联在两极之间。',
];
const colors = ['#69665e', '#ad4d30', '#226e83'];

function wiringDiagram() {
  const canvas = h('canvas', { width: 340, height: 135, role: 'img', 'aria-label': '图 10.4-1　电容器的充、放电电路',
    style: 'width:100%;height:auto' });
  const g = canvas.getContext('2d');
  g.fillStyle = '#fbf8f1'; g.fillRect(0, 0, 340, 135);
  drawSchematic(g, {
    wires: [[[38, 110], [38, 20], [114, 20]], [[87, 110], [87, 43], [114, 43]],
      [[113, 31], [292, 31], [292, 110], [38, 110]], [[233, 31], [233, 63]], [[233, 72], [233, 110]],
      [[221, 63], [245, 63]], [[221, 72], [245, 72]]],
    parts: [{ type: 'battery', x: 38, y: 67, rot: 90 }, { type: 'ammeter', x: 180, y: 31 },
      { type: 'voltmeter', x: 292, y: 70, rot: 90 }, { type: 'resistor', x: 155, y: 110, label: 'R', ly: -12 },
      ...[[140, 31], [87, 110], [233, 31], [233, 110]].map(([x, y]) => ({ type: 'node', x, y }))],
  });
  g.fillStyle = '#1d2433'; g.font = '14px sans-serif';
  g.fillText('1', 106, 16); g.fillText('2', 106, 59); g.fillText('S', 134, 23);
  return canvas;
}

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
    const segments = [];
    let clock = 0, resumeNotes, diagram, movingLead = null, retract = null;
    const nextLead = () => rig.leads.findIndex(lead => !lead.connected);
    const atAngle = q => rig.neutral.clone().setX(pivot.x + radius * Math.sin(q)).setZ(pivot.z - radius * Math.cos(q));
    const slotAngle = slot => slot === 1 ? -throwAngle : slot === 2 ? throwAngle : 0;
    const stable = () => contact === 0 || Math.abs(voltage - (contact === 1 ? SOURCE_VOLTS : 0)) < 0.005;
    const target = () => near || held || (contact && !stable()) ? null : rig.handle;
    const bar = lessonBar({ ...ctx, group, back: leave, steps: [
      { id: 'wire', title: '按图接线', todo: wireTasks[0],
        target: () => movingLead || retract ? null : rig.leads[nextLead()]?.tip },
      { id: 'charge', title: '接 1 充电', todo: chargeTask, target },
      { id: 'discharge', title: '接 2 放电', todo: dischargeTask, target },
    ] });

    function guide() {
      if (!bar.has('wire')) { bar.say(wireTasks[nextLead()]); return; }
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
      if (trace) trace.points.push([clock, current * 1000]);
      contact = next; elapsed = 0; startV = voltage;
      current = observeCapacitor(startV, contact, 0).current;
      if (trace || current !== 0) {
        if (next === 1 && startV >= 0.005) {
          resumeNotes.append(h('div', {}, `${clock.toFixed(1)} s 续充，起始电压 ${startV.toFixed(2)} V。`));
        }
        trace = { slot: next, points: [[clock, current * 1000]], color: colors[next], dash: next === 0, width: 5 };
        segments.push(trace);
        graph.draw();
      }
      rig.draw(voltage, current);
      clearReading(); readForm(); guide();
    }
    function setAngle(q) {
      angle = q;
      rig.setAngle(q);
      connect(q <= -throwAngle + 0.045 ? 1 : q >= throwAngle - 0.045 ? 2 : 0);
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
    // 拖动平面贴着台面。越靠近接线柱，线头沿同一视线抬到柱顶。
    function onPlane(point, y) {
      const eye = group.worldToLocal(ctx.camera.getWorldPosition(new ctx.THREE.Vector3()));
      return eye.lerp(point, (y - eye.y) / (point.y - eye.y));
    }
    const wireDrags = rig.leads.map(lead => ({
      obj: lead.tip, plane: 'xz', offset: lead.home.y, keepOffset: true,
      enabled: () => !lead.connected && !retract && !near,
      hint: '拖线头到接线柱',
      onStart() { movingLead = lead; },
      onDrag(p) {
        const distance = p.distanceTo(onPlane(lead.socket, lead.home.y));
        const lift = clamp(1 - distance / 0.025, 0, 1);
        lead.place(onPlane(p, lead.home.y + lift * (lead.socket.y - lead.home.y)));
      },
      onEnd(moved) {
        movingLead = null;
        if (!moved) return;
        if (lead.tip.position.distanceTo(lead.socket) > 0.011) {
          retract = { lead, from: lead.tip.position.clone(), t: 0 };
          bar.say('线头没接好，对照图再试一次。');
          return;
        }
        lead.connected = true;
        lead.place(lead.socket); lead.tip.visible = false;
        if (nextLead() < 0) { bar.done('wire'); diagram.hidden = true; }
        guide();
      },
    }));
    const desk = draggable(group, [...wireDrags, {
      obj: rig.grip, anchor: rig.grip, keepOffset: true, plane: 'xz', offset: rig.neutral.y,
      hint: '左右拨：切换触点', enabled: () => bar.has('wire') && !near && !returning,
      onStart() { held = true; origin = contact; releaseSlot = origin; },
      onDrag(p) {
        const raw = Math.atan2(p.x - pivot.x, pivot.z - p.z);
        setAngle(clamp(raw, -throwAngle, throwAngle));
        releaseSlot = contact || (Math.abs(angle) < 0.16 ? 0 : null);
      },
      onEnd(moved) {
        held = false;
        if (!moved) return;
        const slot = releaseSlot == null ? origin : releaseSlot;
        if (releaseSlot == null) {
          returning = { from: angle, slot, t: 0 };
          bar.say('刀片没停在触点或中位，松手后回到原位。');
        } else {
          setAngle(slotAngle(slot)); guide();
        }
      },
    }], { taps: [rig.dial, rig.screen].map(obj => ({
      obj, enabled: () => bar.has('wire') && !near, hint: '点一下：近看两只表', onTap: inspect,
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
      clock = 0; segments.length = 0; graph.x.max = 16;
      resumeNotes.replaceChildren();
      retract = movingLead = null;
      for (const lead of rig.leads) {
        lead.connected = false; lead.tip.visible = true; lead.place(lead.home);
      }
      diagram.hidden = false;
      records.clear(); records.el.hidden = true;
      setAngle(0); rig.draw(0, 0); drawPlates(); graph.draw(); hideTip(); clearReading(); readForm();
      bar.undo('wire', 'charge', 'discharge'); ui.relock(); ctx.reframe(); guide();
    }
    const qa = qaFlow(desk, [
      { name: '接错柱后线头归位', drag: rig.leads[0].tip, to: () => onPlane(rig.leads[1].socket, rig.leads[0].home.y) },
      { name: '核对断开的接线', run() {
        if (nextLead() !== 0 || !rig.leads[0].tip.position.equals(rig.leads[0].home) || desk.items().find(d => d.obj === rig.grip).enabled())
          throw Error('未接好两表就允许合闸，或线头未归位');
      } },
      ...rig.leads.map((lead, i) => ({ name: wireTasks[i], drag: lead.tip, to: () => onPlane(lead.socket, lead.home.y) })),
      { name: '先接 2，两表仍指零', drag: rig.grip, to: atAngle(throwAngle), scale: 1 },
      { name: '接 1 观察充电', drag: rig.grip, to: atAngle(-throwAngle).add(new ctx.THREE.Vector3(-0.018, 0, 0)), wait: 1, scale: 1 },
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
        const charges = segments.filter(s => s.slot === 1), open = segments.find(s => !s.slot);
        if (!bar.finished || charges.length < 2 || charges[0].points[0][1] !== 6 ||
            !open || open.points.at(-1)[0] <= open.points[0][0] || open.points.some(p => p[1] !== 0) ||
            !resumeNotes.childElementCount || trace.points[0][1] >= -5.99 || !stable())
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
          if (!movingLead && !held && (near || ui?.step !== 1)) { hideTip(); return false; }
          const used = desk.move(ray, e), item = desk.hovered();
          if (!movingLead && !held && item) {
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
        diagram = wiringDiagram();
        ui.controls.append(diagram, plates);
        input = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', style: 'width:5em;margin:0 .5em;padding:.2em .4em;font:inherit' });
        form = h('form', { class: 'ctl', hidden: true, onsubmit: checkReading },
          h('label', {}, '电压表读数（V） ', input), h('button', { type: 'submit', class: 'go ghost', style: 'width:auto;margin:0;padding:.2em .7em' }, '核对'));
        reading = h('p', { class: 'note', 'aria-live': 'polite' }); form.append(reading);
        ui.controls.append(form);
        graph = chart({
          x: { label: 't / s', min: 0, max: 16 },
          y: { label: 'I / mA', min: -6.5, max: 6.5, ticks: [-6, -3, 0, 3, 6] },
          series: segments,
          legend: '<b style="color:#ad4d30">接 1 充电</b>　<b style="color:#226e83">接 2 放电</b>　断开（虚线）',
        });
        resumeNotes = h('div', { class: 'note' });
        records = table(['开关位置', '电压变化', '自读电压 / V']);
        records.el.hidden = true;
        ui.data.append(graph.el, resumeNotes, records.el, buttons([{ text: '全部重来', ghost: true, onClick: reset }]).el);
        ui.notes.append(note('模型取电源 6 V、电阻 1 kΩ、电容 2200 μF，忽略漏电。电流流入电容器正极板时取正。'));
        const source = ui.el.querySelector('.answer .src');
        source.style.paddingRight = '84px'; source.style.minHeight = '48px';
        readForm(); guide(); rig.draw(0, 0);
      },
      update(dt) {
        const scale = bar.update(dt);
        if (retract) {
          const { lead, from } = retract;
          retract.t = Math.min(1, retract.t + dt / 0.4);
          lead.place(from.clone().lerp(lead.home, retract.t));
          if (retract.t === 1) { lead.place(lead.home); retract = null; guide(); }
        }
        if (returning) {
          returning.t = Math.min(1, returning.t + dt / 0.40);
          setAngle(slotAngle(returning.slot) + (returning.from - slotAngle(returning.slot)) * (1 - returning.t) ** 2);
          if (returning.t === 1) { returning = null; guide(); }
        }
        if (!trace) return;
        clock += dt * scale;
        const wasStable = stable();
        elapsed += dt * scale;
        const state = observeCapacitor(startV, contact, elapsed);
        voltage = state.voltage; current = state.current;
        rig.draw(voltage, current); drawPlates();
        const points = trace.points;
        if ((!bar.finished || !stable()) && clock - points.at(-1)[0] >= 0.16) {
          if (contact === 0 && points.length > 1) points.pop();
          points.push([clock, current * 1000]);
          graph.x.max = Math.max(graph.x.max, Math.ceil(clock / 8) * 8);
          graph.draw();
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
