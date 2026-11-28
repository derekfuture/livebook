// 必修三图 11.5-1～3。两支实物表笔在灯泡电路、串入处和独立定值电阻间移动。
import * as THREE from 'three';
import { paint } from '../live/ink.js';
import { Circuit, battery, switchPart, lampPart, resistorPart } from './kit/circuit.js';
import { qaFlow } from './kit/chemlesson.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { h, table } from './kit/ui.js';
import { METER_STOPS, ohmScaleValue } from './kit/multimeter.js';
import { multimeterTool } from './kit/multimeterTool.js';
import { meterProbes } from './kit/meterProbes.js';

export default {
  id: 'multimeter',
  fig: '图11.5-1',
  title: '练习使用指针式多用电表',
  stampText: '测量',
  predict: {
    q: '怎样用同一只表测灯泡的电压、电流和定值电阻的阻值？从测电压换到测电流，表笔该怎样接？',
    options: ['断电后拆开一处，将表串入', '保持并联，只换电流挡', '让两表笔直接相碰'],
    answer: 0,
  },
  conclusion: {
    page: 76, rect: [216.5, 655.02, 531.56, 718.13],
    quote: '使用前应该调整指针定位螺丝，使指针指到零刻度。使用时，应先将选择开关旋转到与被测物理量对应的位置上并选择合适的量程。',
    why: '直流电压挡并联在灯泡两端，直流电流挡串入断开处。电阻挡由表内电池供电。若元件接在电路中，先断开外电源，再拆开元件一端，使它与其他支路隔离。每次换倍率要先短接表笔调零。欧姆刻度右端为零，读数还要乘倍率。',
    src: '课本第 72 页 · 第十一章 第5节 实验：练习使用多用电表',
  },
  create(ctx) {
    const circuit = new Circuit(),
      group = circuit.group;
    const meter = circuit.add(multimeterTool({ largeSelector: true }), [-0.14, 0]);
    // 让螺丝槽略高于表壳，调零时步骤光圈落在槽口这一层。
    meter.zero.scale.y = 1.4;
    meter.zero.position.y += 0.0002;
    circuit.add(battery('E', { cells: 1, emf: 1.5, r: 0.2 }), [0.04, -0.11]);
    const sw = circuit.add(switchPart('S'), [0.15, -0.1]);
    const lamp = circuit.add(lampPart('L', { rated: 1.5, R0: 3, Rhot: 12 }), [0.16, 0]);
    const resistor = circuit.add(resistorPart('R', { R: 1000 }), [0.105, 0.106]);
    for (const sign of [-1, 1]) {
      const lead = new THREE.CatmullRomCurve3([
        new THREE.Vector3(sign * 0.012, 0.016, -0.004),
        new THREE.Vector3(sign * 0.021, 0.016, -0.004),
        new THREE.Vector3(sign * 0.024, 0.016, 0.006),
      ]);
      resistor.group.add(new THREE.Mesh(new THREE.TubeGeometry(lead, 12, 0.00072, 8, false), paint(0x8f9692)));
    }
    const plug = new THREE.Group(),
      metal = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.011, 16), paint(0xb5b2a2));
    metal.position.y = 0.006;
    plug.add(metal);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.0045, 0.019, 20), paint(0x986849));
    grip.position.set(0, 0.011, -0.005);
    grip.rotation.x = -0.58;
    plug.add(grip);
    circuit.add({ name: 'J', group: plug, terminals: { pin: [0, 0.002, 0] }, branches: () => [] }, [0, 0]);
    const attached = circuit.terminalWorld('L.a'),
      loose = new THREE.Vector3(0.073, 0.001, -0.016);
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
    circuit.wire('E.+', 'S.a', { color: 0xac5140 });
    circuit.wire('S.b', 'J.pin');
    circuit.wire('L.b', 'E.-', { color: 0x535b60, points: [
      [0.195, 0.018, 0.001], [0.202, 0.009, -0.132], [0.006, 0.008, -0.139], [0.005, 0.02, -0.105],
    ] });
    parkPlug(true);
    // 台面上的套圈标出笔尖和拔下的插头可以停放的位置。
    const point = (x, y, z) => new THREE.Vector3(x, y, z);
    function seat(at, color) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.008, 0.0094, 40),
        new THREE.MeshBasicMaterial({ color }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(at.x, 0.0006, at.z);
      group.add(ring);
    }
    seat(loose, 0xaa8667);
    const lampLeft = 'L.a', lampRight = 'L.b', pin = 'J.pin';
    const bothOn = (a, b) => (red.target === a && black.target === b) || (black.target === a && red.target === b);
    const stop = () => METER_STOPS[meter.stop];
    const bias = () => ({ 1: 0.13, 10: -0.11, 100: 0.08 }[stop().multiplier] || 0);
    const steps = [['zero', '机械调零'], ['volt', '测电压'], ['amp', '测电流'], ['cal', '欧姆调零'], ['ohm', '测电阻'], ['off', '收表']];
    let ui, aim, overload = false, near = '', calibrated = false, adjustment = 0, plugReturn, movingPlug;
    const bar = lessonBar({ ...ctx, group, back: leave,
      steps: steps.map(([id, title]) => ({ id, title, todo: title, target: () => ui?.step === 1 ? aim : null })) });
    pair = meterProbes(circuit, [lampLeft, lampRight, pin, 'R.a', 'R.b'], {
      dock: { radius: 0.02, miss: '笔尖没有碰到接点，表笔回到原位。' },
      homes: { red: [-0.015, 0.001, 0.067], black: [-0.061, 0.001, 0.067] },
      allow(name, target) {
        if (!target) return '';
        if (stop().mode === 'ohm' && !target.startsWith('R.')) return '欧姆挡由表内电池供电，请测量已脱离电路的电阻。';
        if (stop().mode === 'amp' && sw.closed) return '开关仍闭合，先断电再接电流表。';
        const other = name === 'red' ? black : red;
        if (target === other.target) return '两笔碰在同一接线柱上，请分接两端。';
        if (stop().mode === 'amp' && plugged && [other.target, target].every(t => t === lampLeft || t === lampRight))
          return '电流挡并在灯泡两端会使灯泡短路。先断电，拆开一处导线。';
        return '';
      },
      mayLift: name => sw.closed && stop().mode === 'amp' && pair.probes[name].target ? '先断开开关，再移动串在电路里的表笔。' : '',
      changed(reason) { guide(reason); },
    });
    const { red, black } = pair.probes;
    seat(red.home, 0xaa5140);
    seat(black.home, 0x4d595b);
    const parked = p => p.handle.position.distanceTo(p.home) < 0.0001 && !p.target && !pair.shorted;
    const unparked = () => !parked(red) ? red : !parked(black) ? black : null;
    const onCircuit = p => [lampLeft, lampRight, pin].includes(p.target);
    const connected = () => {
      if (bar.current === 'volt') return stop().mode === 'volt' && sw.closed && plugged && red.target === lampLeft && black.target === lampRight;
      if (bar.current === 'amp') return stop().mode === 'amp' && sw.closed && !plugged && red.target === pin && black.target === lampLeft;
      return bar.current === 'ohm' && stop().mode === 'ohm' && calibrated && bothOn('R.a', 'R.b');
    };
    const readable = () => connected() && meter.fraction > 0 && meter.fraction <= 1 &&
      (stop().mode !== 'ohm' || (meter.fraction >= 0.2 && meter.fraction <= 0.8));
    const rows = table(['挡位', '刻度', '测量值']);
    const field = () => h('input', { type: 'number', step: 'any', inputmode: 'decimal', required: true,
      style: 'width:5.4em;font:inherit;padding:3px 6px;margin-left:6px' });
    const raw = field(), value = field(), rawLabel = h('span'), resultLabel = h('span');
    const form = h('form', { hidden: true, 'data-keep': '1', onsubmit(e) { e.preventDefault(); record(); },
      style: 'line-height:1.8;font-variant-numeric:tabular-nums' },
      h('label', { style: 'display:block' }, rawLabel, raw),
      h('label', { style: 'display:block' }, resultLabel, value),
      h('button', { type: 'submit', class: 'go', style: 'margin-top:6px' }, '记下读数'));
    const status = h('p', { class: 'status', style: 'font-variant-numeric:tabular-nums' });
    const bypass = h('figure', { hidden: true, style: 'margin:0 0 8px' },
      h('figcaption', {}, '若合闸，电流怎样分配？（示意）'),
      h('div', { html: `<svg viewBox="0 0 264 90" style="display:block;width:100%;max-width:290px" role="img" aria-label="少部分电流通过灯泡，大部分通过低内阻的电流表，超过量程。">
        <g fill="none" stroke="#536068" stroke-width="2">
          <path d="M6 43h24m0 0V22h202v21h24 M30 43v28h202V43"/>
          <circle cx="30" cy="43" r="2" fill="#536068"/><circle cx="232" cy="43" r="2" fill="#536068"/>
          <circle cx="130" cy="22" r="11" fill="#fffaf0"/><path d="m122 14 16 16m-16 0 16-16"/>
          <circle cx="130" cy="71" r="14" fill="#fffaf0"/>
        </g>
        <path d="m83 18 9 4-9 4z" fill="#536068"/>
        <path d="M43 67h38v-5l15 9-15 9v-5H43z" fill="#a44e37"/>
        <g text-anchor="middle" font-family="sans-serif" font-size="15">
          <text x="130" y="76" fill="#38494e">A</text>
          <text x="183" y="17" fill="#38494e">灯泡</text><text x="183" y="65" fill="#93432f">超量程</text>
        </g></svg>` }));
    const unit = () => ({ volt: 'V', amp: 'mA', ohm: 'Ω' }[stop().mode]);
    const dcPlaces = () => ({ '2.5 V': 2, '10 V': 1, '50 mA': 1, '500 mA': 0 }[stop().label]);
    const dcGuide = () => '内圈每小格 0.2，估读到 0.1。按量程换算，四舍五入到 ' + 10 ** -dcPlaces() + ' ' + unit() + '。';
    const active = () => !pair.returning && !plugReturn;
    const atDesk = () => !near && active() && !bar.finished;
    // 只在玻璃窗上近看；调零、选挡时保留整表，读数时正对两条完整刻度弧。
    const windowPick = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.0003, 0.065),
      new THREE.MeshBasicMaterial({ visible: false }));
    windowPick.userData.pick = true;
    windowPick.position.set(0, 0.0202, -0.049);
    meter.group.add(windowPick);
    function inspect() {
      if (near) return;
      near = readable() ? 'scale' : 'meter';
      bar.near(true);
      const small = ctx.camera.aspect < 1;
      const checkingZero = bar.current === 'zero';
      const z = near === 'scale' ? -0.054 : checkingZero ? -0.042 : -0.003;
      const distance = near === 'scale' ? (small ? 0.17 : 0.155) : checkingZero ? 0.218 : 0.315;
      ctx.look([meter.group.position.x, 0.02, z], [0, 1, 0.015], distance, leave);
      guide();
    }
    function leave() {
      if (near) ctx.back();
      near = '';
      bar.near(false);
      guide();
    }
    function guide(feedback = '', showBypass = false) {
      const mode = bar.current;
      bypass.hidden = !showBypass;
      const set = (text, obj) => {
        const offscreen = near && obj && ![meter.selector, meter.zero, meter.trim, meter.group].includes(obj);
        const knob = [meter.zero, meter.trim, meter.selector].includes(obj);
        aim = offscreen ? null : knob ? obj.children[0] : obj || null;
        if (offscreen) text = '回到全景。' + text;
        bar.say([feedback, text].filter(Boolean).join(' '));
      };
      status.textContent = '挡位 ' + stop().label + '　·　' + (sw.closed ? '开关闭合' : '开关断开') + '　·　' + (lamp.brightness > 0.1 ? '灯亮' : '灯灭');
      const show = readable() && near === 'scale';
      if (form.hidden === show) { raw.value = value.value = ''; form.hidden = !show; }
      if (show) {
        rawLabel.textContent = mode === 'ohm' ? '外圈刻度' : '内圈刻度';
        resultLabel.textContent = '测量值（' + unit() + '）';
      }
      if (showBypass && mode === 'volt') return set('先转回直流电压挡，再给灯泡通电。', meter.selector);
      if (!mode) return set('表笔已归位，选择开关已回到 OFF。可以掀开结论了。');
      if (mode === 'zero') return near
        ? set('左右微调定位螺丝，使指针对准内圈左端的 0。', meter.zero)
        : set('两笔分开，选择开关在 OFF。点表盘近看，检查直流零点。', meter.group);
      if (mode === 'off') {
        const p = unparked();
        if (p) return set('测量完毕，把两支笔尖放回台面同色圆圈。', p.handle);
        if (stop().mode !== 'off') return set('两支表笔已分开，把选择开关转回 OFF。', meter.selector);
        bar.done('off');
        return guide();
      }
      if (mode === 'volt') {
        if (!plugged) return set('将棕色插头插回灯泡左柱，恢复供电回路。', grip);
        if (!sw.closed) return set('合上开关，让电池给小灯泡正常供电。', sw.group);
        if (stop().mode !== 'volt') return set('灯亮了。电源为 1.5 V，转到比估计电压大的直流电压量程。', meter.selector);
        if (bothOn(lampLeft, lampRight) && meter.fraction < 0) return set('指针向左反偏。交换两笔，让红笔接高电势端。', red.handle);
        if (red.target !== lampLeft) return set('把红笔尖接到灯泡左柱，这一端连着电源正极。', red.handle);
        if (black.target !== lampRight) return set('把黑笔尖接到灯泡右柱，使电压表并在灯泡两端。', black.handle);
      } else if (mode === 'amp') {
        if (plugged) {
          if (sw.closed) return set('断开开关，准备把电流表串入灯泡回路。', sw.group);
          if (unparked()) return set('灯灭了，把两支表笔放回同色圆圈。', unparked().handle);
          return set('把灯泡左柱的棕色插头拖到棕圈，留出串联的断口。', grip);
        }
        if (sw.closed && !bothOn(pin, lampLeft)) return set('断口还没接好，先断开开关。', sw.group);
        if (stop().mode !== 'amp') return set('导线已拆开。电流大小未知，先选较大的直流电流量程。', meter.selector);
        if (sw.closed && meter.fraction < 0) return set('指针向左反偏。先断电，再交换两支表笔。', sw.group);
        if (!sw.closed && black.target === pin) {
          if (red.target === lampLeft) return set('两笔接反了。先把黑笔放回黑圈，腾出棕色插头。', black.handle);
          return set('把黑笔从棕色插头移到灯泡左柱。', black.handle);
        }
        if (red.target !== pin) return set('红笔尖接棕色插头，让电流从红笔流入表内。', red.handle);
        if (black.target !== lampLeft) return set('黑笔尖接灯泡空出的左柱，接通电流的去路。', black.handle);
        if (!sw.closed) {
          if (overload) return set('已断电，换较大的电流量程再合闸。', meter.selector);
          return set('电流表已串在断口，合上开关观察指针。', sw.group);
        }
        if (meter.fraction > 1) return set('指针已超过满刻度。断开开关，换较大量程。', sw.group);
      } else {
        if (sw.closed) return set('断开开关，把表笔从灯泡电路移开。', sw.group);
        const p = [red, black].find(onCircuit);
        if (p) return set('把笔尖放回同色圆圈，使电表与外电源分开。', p.handle);
        if (stop().mode !== 'ohm') return set('待测电阻没有接电源。阻值未知，可先用中等倍率 ×10 试测。', meter.selector);
        if (!calibrated) {
          if (!pair.shorted) {
            if (red.target || black.target) return set('换倍率后要重新调零。把两支笔放回同色圆圈，再将笔尖相碰。', (red.target ? red : black).handle);
            return set('将一支笔尖拖到另一支笔尖上，短接相当于接入零电阻。', red.handle);
          }
          return set('两笔已短接。' + (meter.trimOffset > 0 ? '向左' : '向右') + '微调 Ω 旋钮，使针尖对准外圈右端的 0。', meter.trim);
        }
        if (!bothOn('R.a', 'R.b')) return set('两笔分开，各接台前定值电阻的一端。', !red.target ? red.handle : black.handle);
        if (!readable()) return set('针尖靠近' + (meter.fraction < 0.2 ? '∞ 端，增大' : '零端，减小') + '倍率，让指针落在中间区域。', meter.selector);
      }
      if (show && feedback) return set('');
      if (readable()) return show
        ? set(mode === 'ohm' ? '读外圈红色刻度，乘所选倍率，填入阻值。' : dcGuide())
        : set('指针已偏转。点表盘近看，读出' + ({ volt: '灯泡两端的电压', amp: '通过灯泡的电流', ohm: '定值电阻的阻值' }[mode]) + '。', meter.group);
    }
    function choose(index) {
      const next = METER_STOPS[index];
      if (index === meter.stop) return guide();
      if (bar.current === 'zero') return guide('先在 OFF 挡校准指针。');
      if (bar.current === 'off' && next.mode === 'off' && unparked()) return guide();
      if (sw.closed && (onCircuit(red) || onCircuit(black)) && (stop().mode === 'amp' || next.mode === 'amp'))
        return guide('带电换电流挡有短路危险，先断开开关。');
      if (next.mode === 'ohm' && (onCircuit(red) || onCircuit(black))) return guide('先让两支笔离开外电路，再换电阻挡。');
      calibrated = overload = false;
      meter.setStop(index);
      meter.trimOffset = adjustment + bias();
      circuit.solve();
      if (near) leave();
      guide();
    }
    function record() {
      if (form.hidden || !readable()) return;
      const mode = bar.current, a = raw.valueAsNumber, b = value.valueAsNumber;
      if (!Number.isFinite(a) || !Number.isFinite(b)) return;
      const ohm = mode === 'ohm';
      const expected = ohm ? ohmScaleValue(meter.fraction) : meter.fraction * 10;
      // 黑圈每小格 0.2；本电阻在 ×100 挡的指针位于红圈 10 这条刻线上。
      if (a < 0 || Math.abs(a - expected) > (ohm ? 0.5 : 0.101)) {
        return guide('刻度读' + (a > expected ? '大' : '小') + '了。' + (ohm ? '外圈从右向左增大，刻线疏密不均。' : '内圈从左向右增大，每小格是 0.2。'));
      }
      const factor = ohm ? stop().multiplier : stop().range * (mode === 'amp' ? 1000 : 1) / 10;
      if (!ohm && !Number.isInteger(a * 10)) return guide(dcGuide());
      // 用十分之一格的整数换算，避免 1.475 一类的中点因浮点误差向下舍入。
      const digits = ohm ? 0 : dcPlaces();
      const rounded = ohm ? a * factor : Math.round((a * 10) * factor * 10 ** digits / 10) / 10 ** digits;
      if (!ohm && b !== Number(b.toFixed(digits))) return guide(dcGuide());
      if (ohm ? Math.abs(b - rounded) > 0.00001 : b !== rounded)
        return guide(ohm ? '刻度读对了，阻值还要乘选择开关所指的倍率。' : '刻度读对了。内圈的 10 对应满量程，用刻度数除以 10 再乘量程。');
      const scaleReading = ohm ? String(a) : a.toFixed(1);
      const measurement = ohm ? String(b) : rounded.toFixed(digits);
      rows.add([stop().label, scaleReading, '≈ ' + measurement + ' ' + unit()]);
      const calc = ohm ? a + ' × ' + stop().multiplier : scaleReading + ' ÷ 10 × ' + stop().label;
      const result = ({ volt: '灯泡两端的电压', amp: '通过灯泡的电流', ohm: '电阻的阻值' }[mode]) + '约为 ' + measurement + ' ' + unit() + '。';
      rows.el.hidden = false;
      bar.done(mode);
      leave();
      guide(result);
      work.textContent = calc + (Math.abs(a * factor - b) < 0.000001 ? ' = ' : ' ≈ ') + measurement + ' ' + unit();
    }
    const work = h('p', { class: 'note' });
    const canAdjust = isZero => active() && (near !== 'scale') && (isZero ? bar.current === 'zero' : ['cal', 'ohm'].includes(bar.current));
    function adjust(isZero) {
      const obj = isZero ? meter.zero : meter.trim;
      let initial;
      return {
        obj, plane: 'xz', offset: obj.position.y,
        enabled: () => canAdjust(isZero),
        hint: isZero ? '左右拖：调机械零点' : '左右拖：调欧姆零点',
        onStart() { initial = isZero ? meter.mechanical : adjustment; },
        onDrag(p, from) {
          if (isZero) {
            let v = clamp(initial + (p.x - from.x) * 2.5, -0.12, 0.12);
            if (Math.abs(v) < 0.005) v = 0;
            meter.mechanical = v;
            meter.zero.rotation.y = v * 8;
          } else if (stop().mode === 'ohm' && pair.shorted) {
            adjustment = clamp(initial + (p.x - from.x) * 10, -0.3, 0.3);
            if (Math.abs(adjustment + bias()) < 0.016) adjustment = -bias();
            meter.trimOffset = adjustment + bias();
            meter.trim.rotation.y = adjustment * 8;
            circuit.solve();
          }
        },
        onEnd(moved) {
          if (!moved) return;
          if (isZero && meter.mechanical === 0) {
            bar.done('zero');
            leave();
            return guide('指针对准直流零点了。');
          }
          if (!isZero) {
            if (stop().mode !== 'ohm' || !pair.shorted) return guide('只有在电阻挡短接两笔，才能校准欧姆零点。');
            calibrated = meter.trimOffset === 0;
            if (calibrated) {
              bar.done('cal');
              leave();
              return guide('短接时指针指向 0 Ω，这一倍率已调零。');
            }
          }
          guide('指针还没对准零线。');
        },
        onTap: inspect,
      };
    }
    const probeDrags = pair.drags.map((d, i) => {
      const p = i === 0 ? red : black;
      return { ...d, obj: p.grip.children.find(c => c.userData.pick), anchor: p.handle,
        enabled: () => atDesk() && bar.current !== 'zero',
        hint: i === 0 ? '拖笔尖：移动红表笔' : '拖笔尖：移动黑表笔' };
    });
    const switchPick = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.032, 0.025),
      new THREE.MeshBasicMaterial({ visible: false }));
    switchPick.position.y = 0.017;
    switchPick.userData.pick = true;
    sw.group.add(switchPick);
    function toggle() {
      if (!sw.closed && stop().mode === 'amp' && plugged && bothOn(lampLeft, lampRight)) {
        return guide('电流表内阻小，若合闸，大部分电流会流过电流表。', true);
      }
      if (!sw.closed && stop().mode === 'amp' && (onCircuit(red) || onCircuit(black)) && (plugged || !bothOn(pin, lampLeft)))
        return guide('电流挡还没有串在断口，保持断电。');
      sw.toggle();
      if (sw.closed && stop().mode === 'amp') overload = meter.fraction > 1;
      guide();
    }
    const canMovePlug = () => atDesk() && bar.current === 'amp' && !onCircuit(red) && !onCircuit(black);
    const canSelect = () => active() && near !== 'scale' && !bar.finished;
    let previewStop;
    const selectDrag = {
      obj: meter.selector, plane: 'xz', offset: meter.selector.position.y, enabled: canSelect,
      hint: '点或转：近看或选挡',
      onStart() { previewStop = meter.stop; },
      onDrag(p) {
        const local = meter.group.worldToLocal(group.localToWorld(p.clone()));
        previewStop = meter.pickStop(local);
        meter.selector.rotation.y = Math.PI * 0.66 - previewStop * 2 * Math.PI / METER_STOPS.length;
      },
      onEnd(moved) {
        if (!moved) return;
        meter.setStop(meter.stop);
        choose(previewStop);
      },
      onTap: inspect,
    };
    const plugDrag = {
      obj: grip, anchor: plug, plane: 'xz', offset: 0.025, keepOffset: true,
      enabled: canMovePlug, hint: '拖动：拔插灯泡导线',
      onStart() { movingPlug = false; },
      onDrag(p) {
        if (sw.closed) return;
        if (!movingPlug) {
          if (Math.hypot(p.x - plug.position.x, p.z - plug.position.z) < 0.0005) return;
          circuit.removeWire(pin, lampLeft);
          circuit.solve();
          movingPlug = true;
        }
        plug.position.set(p.x, 0.025, p.z);
        circuit._dirty = true;
      },
      onEnd(moved) {
        if (!moved) return;
        if (sw.closed) return guide('开关仍闭合，先断电再拔插导线。');
        if (!movingPlug) return;
        movingPlug = false;
        const dest = plugged ? loose : attached;
        if (Math.hypot(plug.position.x - dest.x, plug.position.z - dest.z) <= 0.018) parkPlug(!plugged);
        else plugReturn = { start: plug.position.clone(), t: 0 };
        guide(plugReturn ? '插头没有对准，回到原位。' : '');
      },
    };
    const tapItems = [
      { obj: switchPick, enabled: () => atDesk() && bar.current !== 'zero', hint: () => sw.closed ? '点一下：断开开关' : '点一下：闭合开关', onTap: toggle },
      { obj: windowPick, enabled: () => !near && active() && !bar.finished, hint: '点一下：近看表盘', onTap: inspect },
      { obj: meter.face, enabled: canSelect, hint: '点挡位：转选择开关', onTap(ray) {
        const hit = ray.intersectObject(meter.face)[0];
        if (!hit) return;
        const p = meter.group.worldToLocal(hit.point.clone());
        const r = Math.hypot(p.x - meter.selector.position.x, p.z - meter.selector.position.z);
        if (r > 0.014 && r < 0.039) choose(meter.pickStop(p));
        else if (!near) inspect();
      } },
    ];
    const desk = draggable(group, [...probeDrags, adjust(true), adjust(false), selectDrag, plugDrag],
      { tip: ctx.tag('', 'pill'), taps: tapItems });
    function reset() {
      near = '';
      ctx.back(); bar.near(false);
      plugReturn = null;
      movingPlug = false;
      sw.closed = false;
      pair.reset();
      parkPlug(true);
      meter.mechanical = 0.032;
      meter.zero.rotation.y = meter.mechanical * 8;
      meter.trimOffset = adjustment = meter.trim.rotation.y = 0;
      meter.setStop(0);
      meter.update(1);
      calibrated = overload = false;
      rows.clear(); rows.el.hidden = false; work.textContent = '';
      form.hidden = true; raw.value = value.value = '';
      bar.undo(...steps.map(s => s[0]));
      ui.relock(); guide();
    }
    const stepBar = document.querySelector('.lbar');
    const mobileLayout = h('style', {}, `
      @media(max-width:760px) {
        body.lesson-on .lbar[data-meter] {bottom:6px;flex-wrap:wrap;gap:3px 8px}
        .lbar[data-meter] .lb-main {flex:1 1 85%}
        .lbar[data-meter] .lb-steps {margin-left:30px;max-width:none}
        .lbar[data-meter] .lb-snd {margin-left:auto}
        body:not(.predicting):not(.hide-steps) #panel.meter-panel {
          bottom:calc(8px + var(--meter-bar));height:calc(52vh - var(--meter-bar))
        }
      }`);
    const observeBar = new ResizeObserver(() => ui.el.style.setProperty('--meter-bar', (stepBar.offsetHeight + 6) + 'px'));
    const center = obj => group.worldToLocal(obj.getWorldPosition(point()));
    const target = id => circuit.terminalWorld(id);
    const select = index => {
      const a = -Math.PI * 0.66 + index * Math.PI / 4;
      return { name: '选 ' + METER_STOPS[index].label, drag: meter.selector,
        to: () => center(meter.selector).add(point(0.023 * Math.sin(a), 0, -0.023 * Math.cos(a))) };
    };
    const turn = (isZero, delta) => {
      const obj = isZero ? meter.zero : meter.trim;
      const step = qaFlow(desk, [{ name: isZero ? '调直流零点' : '调欧姆零点', drag: obj,
        to: () => center(obj).add(point(delta, 0, 0)) }])[0];
      step.run = () => {
        const d = desk.items().find(it => it.obj === obj), start = center(obj);
        d.onStart(); d.onDrag(step.mouse.to(), start); d.onEnd(true);
      };
      return step;
    };
    function carry(i, to, name) {
      return { name, drag: probeDrags[i].obj,
        to: () => (typeof to === 'string' ? target(to) : to()).clone().setY(0.025) };
    }
    const home = i => carry(i, () => (i ? black : red).home, i ? '收黑笔' : '收红笔');
    const short = () => carry(0, () => black.handle.position, '短接笔尖');
    const pressSwitch = { name: '拨开关', tap: switchPick };
    const zoom = { name: '近看表盘', tap: windowPick };
    function write(name, a, b, next) {
      return { name, run() {
        if (form.hidden) throw Error('未进入读数');
        raw.value = String(a); value.value = String(b); form.querySelector('button').click();
        if (bar.current !== next) throw Error(name + '之后步骤错误');
      } };
    }
    return {
      group: new THREE.Group().add(group), toggles: ['steps'], reset,
      size: { w: 0.44, d: 0.31, h: 0.055 }, view: { azim: 0, elev: 55, lookY: 0.26, get frameMargin() { return innerWidth <= 760 ? 1.12 : 0.99; } },
      pointer: {
        items: () => desk.items().filter(d => d.enabled()),
        down(ray, event) {
          if (ui.step === 2) return false;
          const held = desk.down(ray, event);
          if (held && ui.step === 0) ui.go(1);
          return held;
        },
        move(ray, event) { return ui?.step === 1 && desk.move(ray, event); },
        up: desk.up,
      },
      mount(panel) {
        ui = panel;
        stepBar.dataset.meter = '';
        ui.el.classList.add('meter-panel');
        ui.el.append(mobileLayout);
        observeBar.observe(stepBar);
        bar.attach({ need: () => ui.need(''), unlock: () => ui.unlock() });
        const src = ui.el.querySelector('.answer .src');
        src.style.paddingRight = '78px'; src.style.minHeight = '54px';
        ui.controls.append(status, bypass, form);
        ui.data.append(rows.el, work, h('button', { class: 'go ghost', onclick: reset }, '全部重来'));
        reset();
      },
      update(dt) {
        pair.update(dt);
        if (plugReturn) {
          const r = plugReturn;
          r.t = Math.min(1, r.t + dt / 0.4);
          plug.position.lerpVectors(r.start, plugged ? attached : loose, r.t * (2 - r.t));
          circuit._dirty = true;
          if (r.t === 1) { parkPlug(plugged); plugReturn = null; }
        }
        circuit.update(dt);
        if (circuit.dots) circuit.dots.visible = false;
        bar.update(dt);
      },
      debug: { bar, qa: [
        zoom, turn(true, -0.0128), pressSwitch, select(4),
        carry(0, () => point(0, 0, 0), '放偏后归位'), carry(0, lampLeft, '红笔接高电势端'), carry(1, lampRight, '黑笔接低电势端'),
        zoom, write('错读直流刻度', 4, 1, 'volt'), write('量程换算错误', 5.9, 5.9, 'volt'),
        write('内圈估读位数过多', 5.92, 1.48, 'volt'), write('电压位数过多', 5.9, 1.47001, 'volt'),
        write('换算中点应进位', 5.9, 1.47, 'volt'), write('记下电压', 5.9, 1.48, 'amp'),
        pressSwitch, select(7), pressSwitch,
        { name: '并联电流挡拒绝合闸并显示分流示意', run() {
          if (sw.closed || bypass.hidden) throw Error('缺少断电保护或分流反馈');
        } },
        home(0), home(1), { name: '拆开灯泡一端', drag: grip, to: () => loose.clone().setY(0.025) },
        carry(0, lampLeft, '红笔误接灯泡'), carry(1, pin, '黑笔误接插头'), pressSwitch, pressSwitch,
        { name: '反接断电后指向黑笔', run() {
          if (sw.closed || aim !== black.handle || !bypass.hidden) throw Error('未引导腾出插头');
        } },
        home(1), carry(0, pin, '红笔接插头'), carry(1, lampLeft, '黑笔移到断口'), pressSwitch, zoom, write('记下电流', 2.4, 120, 'cal'),
        pressSwitch, home(0), home(1), select(2), short(), turn(false, 0.011),
        carry(0, 'R.a', '红笔接电阻'), carry(1, 'R.b', '试测偏转太小'), select(3),
        home(0), home(1), short(), turn(false, -0.019), carry(0, 'R.a', '红笔重接电阻'), carry(1, 'R.b', '针尖落在中间区域'),
        zoom, write('漏乘倍率', 10, 10, 'ohm'), write('记下电阻', 10, 1000, 'off'), home(0), home(1), select(0),
        { name: '掀开结论', run() {
          if (!bar.finished || rows.rows.length !== 3 || !parked(red) || !parked(black)) throw Error('测量或收表未完成');
          ui.go(2); ui.el.querySelector('.flap-front').click();
          if (!ui.el.querySelector('.flap.open')) throw Error('结论没有打开');
        } },
      ].map(s => s.mouse ? s : qaFlow(desk, [s])[0]) },
      dispose() {
        observeBar.disconnect(); mobileLayout.remove();
        ui?.el.classList.remove('meter-panel'); ui?.el.style.removeProperty('--meter-bar');
        desk.dispose(); pair.dispose(); meter.dispose(); bar.dispose(); circuit.dispose(); },
    };
  },
};
