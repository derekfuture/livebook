// 必修第三册图 11.3-7。尺寸、图线和计算均来自本轮在同一根丝上的读数。
import * as THREE from 'three';
import { Bench, nets } from './kit/bench.js';
import { resistivityBench } from './kit/resistivityBench.js';
import { wireLengthStation } from './kit/wireLength.js';
import { wireDiameterStation } from './kit/wireDiameter.js';
import { readMeterTick } from './kit/meterReading.js';
import { lessonBar } from './kit/lessonbar.js';
import { table, chart, note, h, buttons } from './kit/ui.js';

const mean = (values) => values.reduce((sum, n) => sum + n, 0) / values.length;
export default {
  id: 'resistivity',
  fig: '图11.3-7',
  title: '金属丝电阻率的测量',
  stampText: '测量',
  predict: {
    q: '金属丝两端各伸出接线柱一小截。计算电阻率时，应取哪段长度？',
    options: ['两个接线点之间', '从一个丝头到另一个丝头', '接线柱外的两截'],
    answer: 0,
    hint: '看电流由哪里流入，又由哪里流出。',
  },
  conclusion: {
    quote: '金属丝的电阻率可由实测的电阻、有效长度和平均直径求出。',
    why: '在温度基本不变、金属丝粗细均匀时，U–I 图线的斜率给出电阻 R。用接线点间的平均长度 l 和三个位置的平均直径 d，按 ρ = πd²R/(4l) 计算。电压表跨接金属丝，电流表包含很小的电压表电流。',
    src: '人教版高中物理必修第三册第 65–66 页',
  },
  create(ctx) {
    const { circuit, sw, divider, sample, ammeter, voltmeter, fixed, leads } = resistivityBench();
    const group = circuit.group,
      lengths = [],
      diameters = [],
      points = [],
      line = [];
    let aim = null,
      meter = null,
      current = null,
      ui,
      lengthLog,
      diameterLog,
      viLog,
      plot,
      report,
      inputs;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'length', title: '量有效长度', todo: '沿同一把尺读出两柱的位置，移尺复测。', target: () => aim },
        { id: 'diameter', title: '三处测径', todo: '用测微器在三个位置测量电阻丝直径。', target: () => aim },
        { id: 'circuit', title: '接表调压', todo: '按图接入电流表和电压表，从零输出开始。', target: () => aim },
        { id: 'points', title: '读 U、I', todo: '调节分压滑片，读取多组 U、I。', target: () => aim },
        { id: 'rho', title: '计算电阻率', todo: '断电，读图求电阻，再用实测尺寸计算电阻率。', target: () => aim },
      ],
    });
    const say = (s, obj = null) => {
      aim = obj;
      bar.say(s);
    };
    const enter = () => {
      if (ui && document.body.classList.contains('predicting')) ui.go(1);
    };
    const nearCtx = {
      look: (...args) => {
        bar.near(true);
        ctx.look(...args);
      },
      back: () => {
        bar.near(false);
        ctx.back();
      },
      enter,
    };
    const bench = new Bench(circuit, group, { onChange: changed, locked: fixed, unscrew: false }),
      wiring = bench.pointer();
    const length = wireLengthStation(group, circuit, {
      ...nearCtx,
      say(s) {
        if (lengths.length >= 2) guide();
        else say(s, length.grip);
      },
      record(a, b) {
        lengths.push(b - a);
        lengthLog.el.hidden = false;
        lengthLog.add([String(a), String(b), String(b - a)]);
        if (lengths.length >= 2) bar.done('length');
        say(
          '本次有效长度 ' +
            (b - a) +
            ' mm。' +
            (lengths.length === 1 ? '把尺沿丝挪动半厘米以上，再读两端。' : '把直尺往台前拖开，给测微器留出位置。'),
          length.grip,
        );
      },
    });
    const diameter = wireDiameterStation(group, sample, {
      ...nearCtx,
      say(s, obj) {
        if (diameters.length >= 3 && diameter.parked && !diameter.near) guideElectrical();
        else say(s, obj);
      },
      record(x, d) {
        diameters.push(d);
        diameterLog.el.hidden = false;
        diameterLog.add([String(Math.round((x - sample.terminals.a[0]) * 1000)), d.toFixed(3)]);
        if (diameters.length >= 3) bar.done('diameter');
        say(
          '距左接线点 ' +
            Math.round((x - sample.terminals.a[0]) * 1000) +
            ' mm 处读到 ' +
            d.toFixed(3) +
            ' mm。' +
            (diameters.length < 3 ? '张开测面，提起尺架换一处再测。' : '张开测面，将尺架提离金属丝放回台前。'),
        );
      },
    });
    function phase() {
      if (lengths.length < 2 || !length.stowed) return 'length';
      if (diameters.length < 3 || !diameter.parked || diameter.near) return 'diameter';
      return 'electrical';
    }
    function guide() {
      if (phase() === 'length') {
        if (lengths.length >= 2) say('已完成两次测长。把直尺往台前拖开，给测微器留出位置。', length.grip);
        else length.guide();
      } else if (phase() === 'diameter') diameter.guide();
      else guideElectrical();
    }
    function topology() {
      const net = nets(circuit, { closedSwitch: false });
      const missing = leads.find(([a, b]) => net(a) !== net(b));
      const main = ['E.+', 'E.-', 'P.B', 'A.-', 'X.b'].map(net);
      return { missing, extra: new Set(main).size !== 5 || ['A.3', 'V.15'].some((k) => main.includes(net(k))) };
    }
    function guideElectrical() {
      const { missing, extra } = topology();
      if (extra || missing) {
        if (sw.closed) return say('接线还需调整。先断开开关，再改接。', sw.group);
        if (extra) return say('有导线旁路了器材或接到了另一量程。点多余的导线拆下。');
        const i = leads.indexOf(missing),
          post = bench.posts.find((p) => p.id === missing[0]);
        return say(
          [
            '从金属丝右柱拖线到电流表 0.6 A 柱，使电流表串入支路。',
            '把金属丝左柱接电压表 3 V 柱。',
            '把金属丝右柱接电压表黑柱，使它跨在被测段两端。',
          ][i],
          post?.ring,
        );
      }
      if (!sw.closed) {
        if (bar.has('points')) return say('已断电。展开笔记本，用 U–I 图和实测尺寸计算电阻率。');
        if (divider.pos > 0.025) return say('先将滑片拖到最左端，使被测丝两端的起始电压接近零。', divider.slider);
        return say('两表已接好。点开关合闸，从零输出开始。', sw.group);
      }
      if (!bar.has('circuit')) {
        if (divider.pos > 0.025) return say('先断电，将滑片移回最左端再合闸。', sw.group);
        bar.done('circuit');
      }
      if (ammeter.over || voltmeter.over || ammeter.reverse || voltmeter.reverse)
        return say('表针超量程或反偏。先断电检查。', sw.group);
      if (bar.has('points')) return say('已记下四组不同读数。断开开关，到笔记本读图。', sw.group);
      if (ammeter.value < 0.015) return say('沿滑杆向右移动滑片，增大金属丝两端电压。', divider.slider);
      say(
        current === null ? '点电流表近看，读指针所指的刻线。' : '保持滑片不动，点电压表读同一组电压。',
        current === null ? ammeter.group : voltmeter.group,
      );
    }
    function changed(c, ev = {}) {
      if (!ui) return;
      current = null;
      if (ev.msg) return say(ev.msg);
      guideElectrical();
    }
    function leave() {
      if (meter) {
        meter = null;
        bar.near(false);
        ctx.back();
        guideElectrical();
        return;
      }
      if (length.near) length.leave();
      if (diameter.near) diameter.exit();
      guide();
    }
    function meterTap(ray) {
      const targets = meter ? [meter] : [ammeter, voltmeter];
      for (const part of targets) {
        const hit = ray.intersectObject(part.dial, false)[0];
        if (!hit) continue;
        if (!sw.closed || !bar.has('circuit') || topology().missing || topology().extra || ammeter.value < 0.015) {
          guideElectrical();
          return true;
        }
        if (part === voltmeter && current === null) {
          say('先读电流表，让两个读数来自同一滑片位置。', ammeter.group);
          return true;
        }
        if (!meter) {
          meter = part;
          const p = group.worldToLocal(part.group.face.getWorldPosition(new THREE.Vector3()));
          nearCtx.look(p.toArray(), [0, 0.01, 1], 0.13, leave);
          say(part === ammeter ? '电流表每小格 0.02 A。点指针所指刻线。' : '电压表每小格 0.1 V。点指针所指刻线。');
          return true;
        }
        const { value, error } = readMeterTick(part, hit);
        if (error) {
          say(error);
          return true;
        }
        leave();
        if (part === ammeter) {
          current = value;
          guideElectrical();
          return true;
        }
        const i = current;
        current = null;
        if (points.some((p) => p[0] === i)) {
          say('这个电流已经记过。移动滑片再测。', divider.slider);
          return true;
        }
        points.push([i, value]);
        viLog.add([i.toFixed(2), value.toFixed(1)]);
        viLog.el.hidden = plot.el.hidden = false;
        const currents = points.map((p) => p[0]);
        if (points.length >= 4 && Math.max(...currents) - Math.min(...currents) >= 0.18) {
          bar.done('points');
          bar.undo('rho');
          report.hidden = false;
          const R = slope();
          line.splice(0, line.length, [0, 0], [0.6, R * 0.6]);
        }
        plot.draw();
        say(
          '已读 ' +
            i.toFixed(2) +
            ' A、' +
            value.toFixed(1) +
            ' V。' +
            (bar.has('points') ? '断开开关，展开笔记本读图。' : '移动滑片，换一组相隔较远的读数。'),
          bar.has('points') ? sw.group : divider.slider,
        );
        return true;
      }
      return !!meter;
    }
    const slope = () => points.reduce((s, [i, u]) => s + i * u, 0) / points.reduce((s, [i]) => s + i * i, 0);
    function accept() {
      if (sw.closed || !bar.has('points')) return say('先断电，保留自己的测量数据再计算。', sw.group);
      const [R, rho] = inputs.map((el) => el.valueAsNumber);
      if (!Number.isFinite(R) || Math.abs(R / slope() - 1) > 0.06)
        return say('在 U–I 直线上取相距较远的两点，用电压差除以电流差。');
      const value = (R * Math.PI * (mean(diameters) * 1e-3) ** 2) / (4 * mean(lengths) * 1e-3);
      if (!Number.isFinite(rho) || Math.abs(rho / (value * 1e6) - 1) > 0.045)
        return say('用平均直径算圆截面积，除以平均有效长度。注意单位换算。');
      bar.done('rho');
      say('根据本组读数，R ≈ ' + R.toFixed(2) + ' Ω，ρ ≈ ' + rho.toFixed(2) + ' × 10⁻⁶ Ω·m。');
    }
    function reset() {
      length.reset();
      diameter.reset();
      if (meter) leave();
      for (const arr of [lengths, diameters, points, line]) arr.length = 0;
      sw.closed = false;
      circuit.clearWires();
      for (const [a, b] of fixed) circuit.wire(a, b);
      divider.setPos(0);
      bench.drag = null;
      bench.temp.visible = false;
      current = null;
      for (const t of [lengthLog, diameterLog, viLog]) {
        t.clear();
        t.el.hidden = true;
      }
      report.hidden = plot.el.hidden = true;
      plot.draw();
      inputs.forEach((i) => (i.value = ''));
      bar.undo('length', 'diameter', 'circuit', 'points', 'rho');
      guide();
    }
    let active = null;
    const electric = {
      down(ray, e) {
        if (!meter && wiring.down(ray, e)) {
          enter();
          if (sw.closed && (bench.drag?.from || bench.drag?.wire)) {
            bench.drag = null;
            say('先断电，再改接导线。', sw.group);
          }
          return true;
        }
        return meterTap(ray);
      },
      move(ray) {
        return !!meter || wiring.move(ray);
      },
      up() {
        return wiring.up();
      },
    };
    const pointerFor = () => ({ length: length.pointer, diameter: diameter.pointer, electrical: electric })[phase()];
    return {
      group,
      size: { w: 0.83, d: 0.58, h: 0.1 },
      view: { azim: 0, elev: 48, lookY: 0.28, margin: 1.04 },
      toggles: ['steps'],
      pointer: {
        items: () => [...length.pointer.items(), ...diameter.pointer.items()],
        down(ray, e) {
          active = pointerFor();
          return active.down(ray, e);
        },
        move(ray) {
          return (active || pointerFor()).move(ray);
        },
        up() {
          const last = active;
          active = null;
          return last?.up();
        },
      },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        lengthLog = table(['左端 / mm', '右端 / mm', '有效长度 / mm']);
        diameterLog = table(['距左柱 / mm', '实测直径 / mm']);
        viLog = table(['I / A', 'U / V']);
        plot = chart({
          x: { label: 'I / A', min: 0, max: 0.6 },
          y: { label: 'U / V', min: 0, max: 1.5 },
          series: [
            { points, dots: true, line: false },
            { points: line, color: '#a95332' },
          ],
          legend: '圆点来自两表实读。直线按通过原点拟合，斜率为被测段电阻的估计值。',
        });
        inputs = ['电阻 R / Ω', '电阻率 / (10⁻⁶ Ω·m)'].map((s) =>
          h('input', { type: 'number', step: 'any', 'aria-label': s, style: 'width:6em' }),
        );
        report = h(
          'div',
          {},
          note('从拟合直线求 R。取表中长度和直径的平均值，代入 ρ = πd²R/(4l)。'),
          ...inputs.map((el, i) => h('label', {}, el.getAttribute('aria-label') + ' ', el)),
          buttons([{ text: '核对测量结果', onClick: accept }]).el,
        );
        for (const el of [lengthLog.el, diameterLog.el, viLog.el, plot.el, report]) el.hidden = true;
        ui.data.append(lengthLog.el, diameterLog.el, viLog.el, plot.el, report);
        ui.notes.append(
          note('先在断电状态测尺寸。图中分压器的两个固定端已跨接电源，从滑片取出可变电压。'),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        guide();
      },
      update(dt) {
        circuit.update(dt);
        bench.update(dt);
        bar.update(dt);
      },
      dispose() {
        length.dispose();
        diameter.dispose();
        bar.dispose();
      },
    };
  },
};
