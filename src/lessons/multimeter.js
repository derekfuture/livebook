// 必修三图 11.5-1～3。两支实物表笔在灯泡电路、串入处和独立定值电阻间移动。
import * as THREE from 'three';
import { paint } from '../live/ink.js';
import { Circuit, battery, switchPart, lampPart, resistorPart } from './kit/circuit.js';
import { nets } from './kit/bench.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { note, buttons, table } from './kit/ui.js';
import { METER_STOPS, ohmScaleValue } from './kit/multimeter.js';
import { multimeterTool } from './kit/multimeterTool.js';
import { meterProbes } from './kit/meterProbes.js';

export default {
  id: 'multimeter',
  fig: '图11.5-1',
  title: '练习使用指针式多用电表',
  stampText: '测量',
  predict: {
    q: '测完小灯泡两端的电压，想用同一只表测通过灯泡的电流，该怎样接表？',
    options: ['断电后拆开一处，将表串入', '保持并联，只换电流挡', '让两表笔直接相碰'],
    answer: 0,
    hint: '被测电流要从红表笔流入，再从黑表笔流出。',
  },
  conclusion: {
    quote: '读数须同时看表笔接法、所选挡位和对应刻度。',
    why: '直流电压挡并联在灯泡两端，直流电流挡串入断开处。电阻挡靠表内电源供电，应测脱离电源的元件；每次换倍率要先短接表笔调零。欧姆刻度右端为零，读数还要乘倍率。',
    src: '人教版高中物理必修第三册第 72–73 页，欧姆表原理见第 87 页',
  },
  create(ctx) {
    const circuit = new Circuit(),
      group = circuit.group;
    const meter = circuit.add(multimeterTool(), [-0.14, 0]);
    circuit.add(battery('E', { cells: 1, emf: 1.5, r: 0.2 }), [0.04, -0.11]);
    const sw = circuit.add(switchPart('S'), [0.15, -0.1]);
    circuit.add(lampPart('L', { rated: 1.5, R0: 3, Rhot: 12 }), [0.16, 0]);
    circuit.add(resistorPart('R', { R: 1000 }), [0.08, 0.105]);
    const plug = new THREE.Group(),
      metal = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.011, 16), paint(0xb5b2a2));
    metal.position.y = 0.003;
    plug.add(metal);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.0045, 0.019, 20), paint(0x986849));
    grip.position.set(0, 0.011, -0.005);
    grip.rotation.x = -0.58;
    plug.add(grip);
    circuit.add({ name: 'J', group: plug, terminals: { pin: [0, 0.002, 0] }, branches: () => [] }, [0, 0]);
    const attached = circuit.terminalWorld('L.a'),
      loose = new THREE.Vector3(0.094, 0.001, -0.026);
    let plugged = true,
      pair;
    function parkPlug(on) {
      circuit.removeWire('J.pin', 'L.a');
      plugged = on;
      plug.position.copy(on ? attached : loose);
      pair?.follow('J.pin');
      if (on) circuit.wire('J.pin', 'L.a', { draw: false });
      circuit.solve();
    }
    circuit.wire('E.+', 'S.a');
    circuit.wire('S.b', 'J.pin');
    circuit.wire('L.b', 'E.-');
    parkPlug(true);
    let ui,
      rows,
      near = false,
      aim = null,
      instruction = '',
      zeroed = false,
      calibrated = false,
      adjustment = 0,
      grab = 0,
      dragged = false;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'zero', title: '机械调零', todo: 'OFF 挡先看指针是否指在左端零线。', target: () => aim },
        { id: 'volt', title: '测电压', todo: '点亮灯泡，电压挡并联读数。', target: () => aim },
        { id: 'amp', title: '测电流', todo: '断电，拆开灯泡一侧导线，电流挡串入断开处。', target: () => aim },
        { id: 'ohm', title: '测电阻', todo: '短接调零后测台前独立电阻，读数乘倍率。', target: () => aim },
        { id: 'off', title: '收表', todo: '提起两支表笔，转回 OFF。', target: () => aim },
      ],
    });
    const say = (msg, obj = null) => {
      aim = near ? null : obj;
      instruction = msg;
      bar.say(msg);
    };
    const stop = () => METER_STOPS[meter.stop];
    pair = meterProbes(circuit, ['L.a', 'L.b', 'S.b', 'J.pin', 'R.a', 'R.b'], {
      changed(reason) {
        enter();
        if (reason) say(reason);
        else guide();
      },
      allow,
      mayLift(name) {
        return sw.closed && stop().mode === 'amp' && pair.probes[name].target
          ? '先断开开关，再移动串在电路里的表笔。'
          : '';
      },
    });
    const { red, black } = pair.probes;
    function enter() {
      if (ui && document.body.classList.contains('predicting')) ui.go(1);
    }
    function across(targets, a, b) {
      return targets.includes(a) && targets.includes(b);
    }
    function allow(name, target, touch) {
      if (!target || touch) return '';
      const mode = stop().mode;
      if (mode === 'ohm' && !target.startsWith('R.')) return '欧姆挡自带电源。把表笔移到台前已经脱离电路的定值电阻。';
      const opposite = (name === 'red' ? black : red).target;
      if (mode === 'amp' && sw.closed) return '接入或移动电流挡表笔前，先断开灯泡电路的开关。';
      if (mode === 'amp' && across([opposite, target], 'L.a', 'L.b'))
        return '电流挡不能跨接灯泡两端。拆开导线，将两笔分别接在断开处。';
      return '';
    }
    function onNode(p, id) {
      const net = nets(circuit);
      return p.target && net(p.target) === net(id);
    }
    function valid(mode) {
      if (!zeroed || stop().mode !== mode) return false;
      if (mode === 'volt') return sw.closed && plugged && onNode(red, 'L.a') && onNode(black, 'L.b');
      if (mode === 'amp')
        return sw.closed && !plugged && ['J.pin', 'S.b'].includes(red.target) && black.target === 'L.a';
      return calibrated && across([red.target, black.target], 'R.a', 'R.b');
    }
    function guide() {
      if (!zeroed) return say('点表盘近看，拖动指针下方的定位螺丝，让针尖指到左端 0。', meter.zero);
      if (bar.has('ohm') && bar.has('volt') && bar.has('amp')) {
        if (red.target || black.target || pair.shorted)
          return say('把两支表笔提离接点，放回台面。', (red.target || pair.shorted ? red : black).handle);
        if (stop().mode !== 'off') return say('转动选择开关回到 OFF。', meter.selector);
        bar.done('off');
        return say('表笔已收起，选择开关已回到 OFF。');
      }
      const mode = !bar.has('volt') ? 'volt' : !bar.has('amp') ? 'amp' : 'ohm';
      if (mode === 'amp' && plugged) {
        if (sw.closed) return say('先断开灯泡开关，再提起连接灯泡左柱的棕色插头。', sw.group);
        if (red.target || black.target)
          return say('开关已断开。先把两支表笔从灯泡上移到空桌面，再拔棕色插头。', (red.target ? red : black).handle);
        return say('把灯泡左柱上的棕色插头拖开，留下串入电流表的位置。', plug);
      }
      if (mode === 'ohm' && sw.closed) return say('先断开灯泡开关，再提起两支表笔。', sw.group);
      if (stop().mode !== mode)
        return say(
          '转动选择开关到' +
            {
              volt: '直流电压挡。电源是一节 1.5 V 电池。',
              amp: '直流电流挡。先选较大量程试测。',
              ohm: '电阻挡。先选一个倍率试测。',
            }[mode],
          meter.selector,
        );
      if (mode === 'ohm' && !calibrated) {
        if (!pair.shorted) return say('把两笔移离接线柱，让红、黑笔的金属尖端互相接触。', red.handle);
        return say(
          '保持两笔短接，' + (meter.trimOffset > 0 ? '向左' : '向右') + '慢拖 Ω 调零旋钮，让针尖对准外圈右端 0。',
          meter.trim,
        );
      }
      if (!valid(mode)) {
        if (mode === 'volt' && !plugged)
          return say(
            sw.closed ? '先断电，重新插回灯泡左柱的导线。' : '把棕色插头拖回灯泡左柱，恢复供电回路。',
            sw.closed ? sw.group : plug,
          );
        if (mode === 'volt' && !sw.closed) return say('点开关合闸，让灯泡正常发光。', sw.group);
        if (mode === 'amp' && !sw.closed && !plugged && ['J.pin', 'S.b'].includes(red.target) && black.target === 'L.a')
          return say('两笔已经串入断开处。合上开关。', sw.group);
        if (mode === 'volt')
          return say(
            !onNode(red, 'L.a') ? '把红笔尖拖到灯泡的左接线柱。' : '把黑笔尖拖到灯泡的右接线柱。',
            !onNode(red, 'L.a') ? red.handle : black.handle,
          );
        if (mode === 'amp')
          return say(
            !['J.pin', 'S.b'].includes(red.target) ? '把红笔尖接在刚拔下的棕色插头上。' : '把黑笔尖接回灯泡左柱。',
            !['J.pin', 'S.b'].includes(red.target) ? red.handle : black.handle,
          );
        return say('两支笔分开，各自接触台前定值电阻的一端。', !red.target ? red.handle : black.handle);
      }
      if (meter.fraction > 1.015) return say('指针超过满刻度。先断电，换较大量程再读。', sw.group);
      if (mode === 'ohm' && (meter.fraction < 0.2 || meter.fraction > 0.8))
        return say('指针太靠近刻度一端。换倍率，再短接两笔重新调零。', meter.selector);
      say(
        near
          ? mode === 'ohm'
            ? '沿针尖点外圈 Ω 刻度，读数须乘所选倍率。'
            : '沿针尖点内圈直流刻度。'
          : '点表盘近看，沿针尖找到所选挡位的刻度。',
        meter.face,
      );
    }
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
      const reading = valid(stop().mode) && stop().mode !== 'off';
      ctx.look(
        [meter.group.position.x, 0.019, reading ? -0.052 : -0.036],
        [0, 1, 0.04],
        reading ? 0.145 : 0.183,
        leave,
      );
      guide();
    }
    function choose(index) {
      enter();
      if (index === meter.stop) {
        guide();
        return;
      }
      if (!zeroed && index !== 0) return say('先在 OFF 挡完成机械调零。', meter.zero);
      if (METER_STOPS[index].mode === 'amp' && sw.closed && (red.target || black.target))
        return say('先断开开关，再切换到电流挡。', sw.group);
      if (METER_STOPS[index].mode === 'ohm' && [red.target, black.target].some((s) => s && !s.startsWith('R.')))
        return say(
          '先把两笔移离灯泡电路，再换电阻挡。',
          red.target && !red.target.startsWith('R.') ? red.handle : black.handle,
        );
      calibrated = false;
      meter.trimOffset = adjustment + ({ 1: 0.13, 10: -0.11, 100: 0.08 }[METER_STOPS[index].multiplier] || 0);
      meter.setStop(index);
      guide();
    }
    function read(point) {
      const mark = meter.pickScale(point),
        mode = stop().mode;
      if (!valid(mode) || !['volt', 'amp', 'ohm'].includes(mode) || meter.fraction > 1.015) {
        guide();
        return;
      }
      if (mode === 'ohm' && (meter.fraction < 0.2 || meter.fraction > 0.8)) {
        guide();
        return;
      }
      if (!mark || mark.scale !== (mode === 'ohm' ? 'ohm' : 'dc'))
        return say(mode === 'ohm' ? '认外圈红色的 Ω 刻度。' : '认内圈黑色直流刻度。');
      if (Math.abs(mark.fraction - meter.fraction) > 0.018) return say('看针尖所指的位置，沿相应弧线再读一次。');
      const raw = mode === 'ohm' ? Math.round(ohmScaleValue(mark.fraction)) : Math.round(mark.fraction * 50) / 5;
      const value = mode === 'ohm' ? raw * stop().multiplier : (raw * stop().range) / 10;
      const unit = mode === 'ohm' ? 'Ω' : mode === 'volt' ? 'V' : 'mA';
      const display = mode === 'amp' ? Math.round(value * 1000) : mode === 'volt' ? value.toFixed(2) : value;
      rows.el.hidden = false;
      rows.add([stop().label, String(raw), display + ' ' + unit]);
      bar.done(mode);
      leave();
      const next = instruction;
      const calculation =
        mode === 'ohm' ? '外圈 ' + raw + ' × ' + stop().multiplier : '内圈 ' + raw + ' ÷ 10 × ' + stop().label;
      say(calculation + ' = ' + display + ' ' + unit + '。' + next, aim);
    }
    function adjust(obj, isZero) {
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
            if (stop().mode !== 'off' || red.target || black.target || pair.shorted)
              return say('先提起两笔并转至 OFF，再调指针定位螺丝。');
            let v = clamp(grab + (p.x - from.x) * 2.5, -0.12, 0.12);
            if (Math.abs(v) < 0.005) v = 0;
            meter.mechanical = v;
            meter.zero.rotation.y = v * 8;
          } else {
            if (stop().mode !== 'ohm' || !pair.shorted) return say('先选欧姆挡，把两支表笔短接。');
            const bias = { 1: 0.13, 10: -0.11, 100: 0.08 }[stop().multiplier];
            adjustment = clamp(grab + (p.x - from.x) * 10, -0.3, 0.3);
            if (Math.abs(adjustment + bias) < 0.015) adjustment = -bias;
            meter.trimOffset = adjustment + bias;
            meter.trim.rotation.y = adjustment * 8;
            circuit.solve();
          }
        },
        onEnd(moved) {
          if (!moved) {
            inspect();
            return;
          }
          if (isZero) {
            zeroed = meter.mechanical === 0;
            if (zeroed) bar.done('zero');
            else bar.undo('zero');
          } else calibrated = stop().mode === 'ohm' && pair.shorted && Math.abs(meter.trimOffset) < 0.001;
          guide();
        },
      };
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
          hint: '沿圆周转动选择开关',
          onDrag(p) {
            choose(meter.pickStop(meter.group.worldToLocal(group.localToWorld(p.clone()))));
          },
          onTap: inspect,
        },
        {
          obj: plug,
          plane: 'xz',
          offset: 0.02,
          keepOffset: true,
          hint: '拔下或插回灯泡导线',
          onStart() {
            enter();
            dragged = false;
          },
          onDrag(p) {
            if (sw.closed) return;
            dragged = true;
            plug.position.set(p.x, 0.028, p.z);
            pair.follow('J.pin');
            circuit._dirty = true;
          },
          onEnd(moved) {
            if (!moved) return;
            if (!dragged) return say('先断电，再拔插导线。', sw.group);
            parkPlug(Math.hypot(plug.position.x - attached.x, plug.position.z - attached.z) < 0.018);
            guide();
          },
        },
      ],
      {
        highlight: true,
        taps: [
          {
            obj: sw.group,
            hint: '合上或断开开关',
            onTap() {
              enter();
              if (!sw.closed && stop().mode === 'amp' && plugged && (red.target || black.target))
                return say('电流挡先串入断开处，再合闸。', plug);
              sw.toggle();
              guide();
            },
          },
          {
            obj: meter.face,
            hint: '近看表盘或点选挡位',
            onTap(ray) {
              const hit = ray.intersectObject(meter.face)[0];
              if (!hit) return;
              const p = meter.group.worldToLocal(hit.point.clone());
              const r = Math.hypot(p.x - meter.selector.position.x, p.z - meter.selector.position.z);
              if (r > 0.014 && r < 0.028) {
                choose(meter.pickStop(p));
                return;
              }
              if (near) read(p);
              else inspect();
            },
          },
        ],
      },
    );
    function reset() {
      near = false;
      ctx.back();
      bar.near(false);
      sw.closed = false;
      parkPlug(true);
      pair.reset();
      meter.setStop(0);
      adjustment = 0;
      meter.trimOffset = 0;
      meter.mechanical = 0.032;
      meter.zero.rotation.y = meter.mechanical * 8;
      meter.trim.rotation.y = 0;
      zeroed = calibrated = false;
      bar.undo('zero', 'volt', 'amp', 'ohm', 'off');
      rows?.clear();
      if (rows) rows.el.hidden = true;
      guide();
    }
    return {
      group,
      pointer: desk,
      toggles: ['steps'],
      size: { w: 0.45, d: 0.32, h: 0.085 },
      view: { azim: 0, elev: 46, lookY: 0.3, margin: 1.04 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        rows = table(['所选挡位', '表盘读数', '实测值']);
        rows.el.hidden = true;
        ui.data.append(rows.el);
        ui.notes.append(
          note('内圈直流刻度为 0–10，满刻度对应所选量程；外圈电阻刻度直接乘倍率。'),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        reset();
      },
      update(dt) {
        circuit.update(dt);
        bar.update(dt);
      },
      dispose() {
        desk.dispose();
        pair.dispose();
        meter.dispose();
        bar.dispose();
        circuit.dispose();
      },
    };
  },
};
