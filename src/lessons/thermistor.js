// 选必二p.99无独立装置图：同一封装NTC在手指、冷水和空气之间连续移动。
import { thermistorRig } from './kit/thermistorRig.js';
import { thermistorState, THERMISTOR_WATER } from './kit/thermistor.js';
import { thermistorMove, THERMISTOR_HOME, THERMISTOR_CLEARANCE } from './kit/thermistorMotion.js';
import { meterProbes } from './kit/meterProbes.js';
import { METER_STOPS, ohmScaleValue } from './kit/multimeter.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { h, note, table, buttons } from './kit/ui.js';
const LABELS = {
  room: '室内空气（初始）',
  hand: '手指接触（趋稳）',
  water: '冷水浸入（趋稳）',
  recover: '离水后空气中（当时读数）',
};
export default {
  id: 'thermistor',
  fig: '实验',
  title: '观察热敏电阻特性',
  stampText: '测量',
  predict: {
    q: '把同一个NTC热敏电阻从冷水中取出，阻值会立即回到原来的室温值吗？',
    options: ['会立即恢复', '会逐渐恢复', '不会再改变'],
    answer: 1,
    hint: '感温头自身也需要与周围交换热量。',
  },
  conclusion: {
    quote: '这只NTC热敏电阻升温减阻、降温增阻，变化需要时间。',
    why: '保持接法和电阻挡不变，用手指和冷水改变同一感温头的温度。移回空气后，阻值逐渐接近室内初始记录，离水后的那一次读数并不一定已经恢复到室温。本课使用NTC；金属热电阻与PTC不能直接套用这个结论。',
    src: '人教版高中物理选择性必修第二册第98–99页；接法参照图5.2-2。',
  },
  create(ctx) {
    const look = ctx.look;
    ctx = { ...ctx, look: (at, ...args) => look([at[0], at[1] + 0.006, at[2]], ...args) };
    const rig = thermistorRig(),
      { group, circuit, meter, thermistor, probe, grip } = rig;
    let model,
      ui,
      rows,
      choice,
      pair,
      near = false,
      aim = null,
      instruction = '',
      zeroed = false,
      calibrated = false,
      adjustment = 0,
      stable = 0,
      waiting = false;
    let recoveryEligible = false;
    let records = {},
      lastR = 0,
      rate = 0;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'room', title: '接表与初始读数', todo: '调零后接原感温头，记录室内空气中的阻值。', target: () => aim },
        { id: 'hand', title: '手指升温', todo: '把原感温头放在两指之间，看表针变化并读数。', target: () => aim },
        { id: 'water', title: '冷水降温', todo: '先提过杯沿，再将感温头浸入冷水。', target: () => aim },
        { id: 'recover', title: '离水恢复', todo: '提离水面，在空气中观察并再读一次。', target: () => aim },
        { id: 'compare', title: '比较记录', todo: '用原笔记本比较升温、降温和恢复过程。', target: () => aim },
        { id: 'off', title: '收表', todo: '移开两支表笔，转回OFF。', target: () => aim },
      ],
    });
    function say(msg, obj = null) {
      instruction = msg;
      aim = near ? null : obj;
      bar.say(msg);
    }
    function enter() {
      if (ui && document.body.classList.contains('predicting')) ui.go(1);
    }
    const stop = () => METER_STOPS[meter.stop];
    function connected() {
      const t = [pair.probes.red.target, pair.probes.black.target];
      return t.includes('N.a') && t.includes('N.b');
    }
    function condition() {
      const { contact, immersion } = rig.exposure();
      if (contact >= 0.75) return 'hand';
      if (immersion >= 0.99) return 'water';
      if (contact < 0.001 && immersion < 0.001)
        return records.room && records.water && recoveryEligible ? 'recover' : 'room';
      return null;
    }
    function recoveryReady() {
      return recoveryEligible && records.water && thermistor.R < records.water.value * 0.92;
    }
    function ready(c) {
      return c === 'recover'
        ? recoveryReady()
        : stable > 0.6 && (c !== 'room' || Math.abs(model.temperature - 22) < 0.45);
    }
    function guide() {
      waiting = false;
      if (bar.has('compare')) {
        if (near) return say('比较已完成，先回到全景收表。');
        const p = pair.probes.red.target || pair.shorted ? pair.probes.red : pair.probes.black;
        if (pair.probes.red.target || pair.probes.black.target || pair.shorted)
          return say('把两支表笔提离接点，分开放到空桌面。', p.handle);
        if (meter.stop !== 0) return say('转动原选择开关回到OFF。', meter.selector);
        bar.done('off');
        return say('记录已保留，多用电表已收好。');
      }
      if (!zeroed)
        return say(near ? 'OFF挡拖定位螺丝，让针尖对准左端0。' : '点表盘近看，先在OFF挡做机械调零。', meter.zero);
      if (stop().mode !== 'ohm') return say('转选择开关到电阻挡，先试合适的倍率。', meter.selector);
      if (!calibrated) {
        if (near && !pair.shorted) return say('先回到全景，让红黑表笔的金属尖端相碰。');
        if (!pair.shorted) return say('两笔移离接点，把金属尖端碰在一起，准备欧姆调零。', pair.probes.red.handle);
        return say(near ? '慢拖Ω调零旋钮，让针尖对准外圈右端0。' : '两笔保持短接，点原表盘近看并调Ω零位。', meter.trim);
      }
      if (!connected())
        return say(
          near ? '回到全景，将两笔分别接感温头的两个干燥接点。' : '将红黑两笔分别接在“感温头接点”的两个金属柱上。',
          pair.probes.red.target ? pair.probes.black.handle : pair.probes.red.handle,
        );
      if (meter.fraction < 0.2 || meter.fraction > 0.8)
        return say('针尖太靠近刻度一端。改用×100挡，再短接调零。', meter.selector);
      if (['room', 'hand', 'water', 'recover'].every((id) => records[id]))
        return say('打开左边笔记本，比较四次记录；最后一次是恢复途中的读数。');
      const c = condition(),
        need = ['room', 'hand', 'water', 'recover'].find((id) => !records[id]);
      if (c && !records[c]) {
        if (!ready(c)) {
          waiting = true;
          if (c === 'room') return say('先让感温头留在空气中，等表针恢复、趋稳后记录初始值。', grip);
          if (c === 'recover') return say('感温头已离水。继续观察原表针，稍等阻值明显恢复后再读。', meter.face);
          return say(
            '保持感温头' + (c === 'hand' ? '贴在两指间' : '浸在冷水里') + '，观察原表针；等趋稳再读。',
            meter.face,
          );
        }
        return say(
          near
            ? '沿针尖点外圈红色Ω刻度，读数乘所选倍率。'
            : c === 'recover'
              ? '表针已在恢复。点表盘读此刻的值，不把它当作最终室温值。'
              : '表针已趋稳。点原表盘近看并读外圈Ω刻度。',
          meter.face,
        );
      }
      if (near) return say('先回到全景，再移动原来的黑色握柄改变感温头位置。');
      if (need === 'room') return say('把黑色握柄移到手与水杯之间，使下端感温头留在空气中。', grip);
      if (need === 'hand') return say('拖黑色握柄，把下端圆形感温头放到拇指与食指之间。', grip);
      if (need === 'water') {
        const aboveCup = Math.abs(probe.position.x - THERMISTOR_WATER.x) <= THERMISTOR_WATER.radius - 0.006;
        if (aboveCup) return say('向下移动黑色握柄，把下端感温头完全浸入冷水。', grip);
        if (probe.position.y < THERMISTOR_CLEARANCE) return say('先向上提黑色握柄，让下端感温头高过杯沿。', grip);
        return say('保持提起，把感温头横移到冷水杯正上方。', grip);
      }
      if (!recoveryEligible) {
        if (rig.exposure().immersion >= 0.99) {
          waiting = true;
          return say('先保持浸入冷水，等原表针趋稳，再提离水面观察恢复。', grip);
        }
        return say('先把感温头放回冷水，等表针趋稳后，再提离水面观察恢复。', grip);
      }
      return say('向上提黑色握柄，让感温头完全离开水面，留在空气中。', grip);
    }
    pair = meterProbes(circuit, ['N.a', 'N.b'], {
      changed(reason) {
        enter();
        stable = 0;
        if (reason) say(reason);
        else guide();
      },
      allow() {
        return '';
      },
      mayLift() {
        return '';
      },
    });
    function leave() {
      if (near) ctx.back();
      near = false;
      bar.near(false);
      guide();
    }
    function inspect() {
      enter();
      if (near) return;
      near = true;
      bar.near(true);
      const reading = connected() && zeroed && calibrated;
      ctx.look(
        [meter.group.position.x, 0.019, meter.group.position.z + (reading ? -0.048 : 0)],
        [0, 1, 0.04],
        (reading ? 0.2 : 0.36) / Math.max(0.5, 1 - 140 / innerHeight),
        leave,
      );
      guide();
    }
    function choose(index) {
      enter();
      if (index === meter.stop) return guide();
      if (!zeroed && index !== 0) return say('先在OFF挡完成机械调零。', meter.zero);
      calibrated = false;
      stable = 0;
      meter.trimOffset = adjustment + ({ 1: 0.13, 10: -0.11, 100: 0.08 }[METER_STOPS[index].multiplier] || 0);
      meter.setStop(index);
      guide();
    }
    function adjust(obj, isZero) {
      let grab;
      return {
        obj,
        plane: 'xz',
        offset: meter.selector.position.y,
        hint: isZero ? '拖动机械调零螺丝' : '拖动欧姆调零旋钮',
        onStart() {
          enter();
          grab = isZero ? meter.mechanical : adjustment;
        },
        onDrag(p, from) {
          if (!from) return;
          if (isZero) {
            if (meter.stop !== 0 || pair.shorted || pair.probes.red.target || pair.probes.black.target)
              return say('先分开两笔、移离元件，并转至OFF。');
            let v = clamp(grab + (p.x - from.x) * 2.5, -0.12, 0.12);
            if (Math.abs(v) < 0.005) v = 0;
            meter.mechanical = v;
            meter.zero.rotation.y = v * 8;
          } else {
            if (stop().mode !== 'ohm' || !pair.shorted) return say('先选欧姆挡，并让两笔金属尖端相碰。');
            const bias = { 1: 0.13, 10: -0.11, 100: 0.08 }[stop().multiplier];
            adjustment = clamp(grab + (p.x - from.x) * 10, -0.3, 0.3);
            if (Math.abs(adjustment + bias) < 0.015) adjustment = -bias;
            meter.trimOffset = adjustment + bias;
            meter.trim.rotation.y = adjustment * 8;
            circuit.solve();
          }
          stable = 0;
        },
        onEnd(moved) {
          if (!moved) return inspect();
          zeroed = meter.mechanical === 0;
          calibrated = zeroed && stop().mode === 'ohm' && pair.shorted && Math.abs(meter.trimOffset) < 0.001;
          guide();
        },
      };
    }
    function renderRows() {
      if (!rows) return;
      rows.clear();
      for (const id of ['room', 'hand', 'water', 'recover']) {
        const r = records[id];
        if (r) rows.add([LABELS[id], r.range, String(r.raw), r.value + ' Ω']);
      }
      rows.el.hidden = !rows.rows.length;
    }
    function read(p) {
      if (!zeroed || !calibrated || stop().mode !== 'ohm') return guide();
      if (!connected()) return say('两支表笔要接在感温头的不同接点，不能短接或悬空读阻值。');
      if (meter.fraction < 0.2 || meter.fraction > 0.8) return guide();
      const c = condition();
      if (!c) return say('感温头还未贴稳指腹，或只部分入水。回全景调整位置再测。');
      if (!ready(c)) {
        guide();
        return;
      }
      const mark = meter.pickScale(p);
      if (!mark || mark.scale !== 'ohm') return say('读外圈红色Ω刻度，不读内圈电压刻度。');
      if (Math.abs(mark.fraction - meter.display) > 0.017) return say('沿原针尖找到外圈刻度，再读一次。');
      const estimate = ohmScaleValue(mark.fraction),
        scale = estimate < 10 ? 10 : 1,
        raw = Math.round(estimate * scale) / scale;
      if (c === 'water') {
        delete records.recover;
        bar.undo('recover');
        recoveryEligible = true;
      }
      records[c] = { raw, range: stop().label, value: raw * stop().multiplier };
      renderRows();
      bar.done(c);
      bar.undo('compare', 'off');
      choice.value = '';
      leave();
      const next = instruction;
      say(`${LABELS[c]}：${raw}×${stop().multiplier}＝${records[c].value} Ω。` + next, aim);
    }
    const desk = draggable(
      group,
      [
        ...pair.drags,
        adjust(meter.zero, true),
        adjust(meter.trim, false),
        {
          obj: meter.selector,
          plane: 'xz',
          offset: meter.selector.position.y,
          hint: '转动选择开关',
          onDrag(p) {
            choose(meter.pickStop(meter.group.worldToLocal(group.localToWorld(p.clone()))));
          },
          onTap: inspect,
        },
        {
          obj: grip,
          anchor: probe,
          plane: 'xy',
          offset: THERMISTOR_WATER.z,
          keepOffset: true,
          hint: '拖动黑色握柄，移动下端感温头',
          onStart: enter,
          onDrag(p) {
            const next = thermistorMove(probe.position, { x: p.x, y: p.y, z: THERMISTOR_WATER.z });
            rig.setProbe(next);
            stable = 0;
            if (next.blocked)
              say(
                next.y < 0.012 ? '感温头已到杯底附近。向上提起一些。' : '杯壁挡住了感温头。先提过杯沿，再横移。',
                grip,
              );
            else guide();
          },
          onEnd: guide,
        },
      ],
      {
        highlight: true,
        taps: [
          {
            obj: meter.face,
            hint: '近看原表盘并读数',
            onTap(ray) {
              const hit = ray.intersectObject(meter.face)[0];
              if (!hit) return;
              const p = meter.group.worldToLocal(hit.point.clone()),
                r = Math.hypot(p.x - meter.selector.position.x, p.z - meter.selector.position.z);
              if (r > 0.014 && r < 0.028) choose(meter.pickStop(p));
              else if (near) read(p);
              else inspect();
            },
          },
        ],
      },
    );
    function compare() {
      if (!['room', 'hand', 'water', 'recover'].every((id) => records[id]))
        return say('先记录室内初始、手指接触、冷水和离水恢复四种状态。');
      if (choice.value !== 'ntc') return say('对照手指与冷水两行，再看离水后是否立即回到室内初始值。');
      bar.done('compare');
      leave();
    }
    function reset() {
      ctx.back();
      near = false;
      bar.near(false);
      pair.reset();
      rig.setProbe(THERMISTOR_HOME);
      model = thermistorState();
      thermistor.R = model.resistance;
      lastR = model.resistance;
      rate = 0;
      adjustment = 0;
      meter.trimOffset = 0;
      meter.mechanical = 0.032;
      meter.zero.rotation.y = 0.032 * 8;
      meter.trim.rotation.y = 0;
      meter.setStop(0);
      zeroed = calibrated = false;
      stable = 0;
      waiting = false;
      records = {};
      recoveryEligible = false;
      choice.value = '';
      renderRows();
      bar.undo('room', 'hand', 'water', 'recover', 'compare', 'off');
      guide();
    }
    const mounted = new group.constructor();
    mounted.add(group);
    group.position.y = 0.006;
    return {
      group: mounted,
      card: false,
      pointer: desk,
      toggles: ['steps'],
      size: { w: 0.58, d: 0.34, h: 0.3 },
      view: { azim: 0, elev: 38, lookY: 0.38, margin: 1.07 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        rows = table(['感温头状态', '倍率', '外圈Ω刻度', '阻值']);
        choice = h(
          'select',
          {
            'aria-label': 'NTC温度与阻值',
            onchange() {
              bar.undo('compare', 'off');
            },
          },
          h('option', { value: '' }, '按记录选择'),
          h('option', { value: 'ntc' }, '升温减阻、降温增阻、逐渐恢复'),
          h('option', { value: 'metal' }, '升温增阻、降温减阻'),
          h('option', { value: 'instant' }, '离水后立即回到初始阻值'),
        );
        ui.data.append(
          rows.el,
          h('div', { class: 'read-row' }, h('label', {}, '比较变化 ', choice)),
          buttons([{ text: '核对比较', onClick: compare }]).el,
        );
        ui.notes.append(
          note(
            '这是一只绝缘封装NTC感温头，接点保持干燥。抓黑色握柄移动，下端圆头接触手指或浸水；杯壁不能穿过。前面三次等趋稳再读，离水后记录恢复途中的值。此处不测绝对温度，也不把NTC规律泛化到金属或PTC。',
          ),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        reset();
      },
      update(dt) {
        if (!model) return;
        const exp = rig.exposure();
        model.step(dt, { ...exp, power: thermistor.power });
        thermistor.R = model.resistance;
        rate = dt > 0 ? Math.abs((thermistor.R - lastR) / dt) : rate;
        lastR = thermistor.R;
        circuit.solve();
        circuit.update(dt);
        stable = rate < 8 && Math.abs(meter.display - meter.fraction) < 0.003 ? stable + dt : 0;
        if (exp.contact > 0.001) recoveryEligible = false;
        if (
          exp.immersion >= 0.99 &&
          stable > 0.6 &&
          records.water &&
          Math.abs(thermistor.R - records.water.value) < thermistor.R * 0.06
        )
          recoveryEligible = true;
        if (waiting && ready(condition())) guide();
        bar.update(dt);
      },
      dispose() {
        desk.dispose();
        pair.dispose();
        bar.dispose();
        rig.dispose();
      },
    };
  },
};
