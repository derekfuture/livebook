import * as THREE from 'three';
import { fruitRig, Y } from './kit/fruitRig.js';
import { polarize, fitFruit } from './kit/fruitCell.js';
import { Bench, nets } from './kit/bench.js';
import { draggable } from './kit/interact.js';
import { readMeterTick } from './kit/meterReading.js';
import { lessonBar } from './kit/lessonbar.js';
import { h, buttons, table, note, chart } from './kit/ui.js';

const fixed = [
  ['E.-', 'S.b'],
  ['S.a', 'R.b'],
];
const links = [
  ['E.+', 'R.a', '把铜片的红柱连到电阻箱左柱。'],
  ['R.a', 'V.1.5', '将电压表 1.5 V 红柱连到电阻箱左柱。'],
  ['R.b', 'V.-', '将电压表黑柱连到电阻箱右柱，与电阻箱并联。'],
];
export default {
  id: 'fruitbattery',
  fig: '图12.3-3',
  title: '测量水果电池的电动势和内阻',
  stampText: '测量',
  predict: {
    q: '保持两片金属的位置，减小外电阻。水果电池的路端电压会怎样变化？',
    options: ['减小', '不变', '增大'],
    answer: 0,
    hint: '外电阻改变时，电池内部的电压降也可能改变。',
  },
  conclusion: {
    quote: '改变外电阻并测量路端电压，可以估算水果电池的电动势和内阻。',
    why: '铜片为正极，锌片为负极。电压表跨接在电阻箱两端，近似用 U/R 作电源电流；U–I 图的纵截距为 E，斜率绝对值为 r。电极间距、插入深度和持续放电均可能影响内阻，应在同一条件下较快取得一组读数。',
    src: '人教版高中物理必修第三册第 91 页，参考案例 2',
  },
  create(ctx) {
    const rig = fruitRig(),
      { group, circuit, fruit, box, sw, meter } = rig;
    function fixLeads() {
      circuit.wire(...fixed[0], {
        color: 0x463f39,
        points: [
          [-0.159, 0.02, 0.109],
          [-0.147, 0.005, 0.124],
          [0.131, 0.006, 0.124],
          [0.159, 0.01, 0.088],
          [0.152, 0.02, 0.054],
        ],
      });
      circuit.wire(...fixed[1], {
        points: [
          [0.109, 0.018, 0.02],
          [0.099, 0.009, 0.008],
          [0.089, 0.02, -0.004],
        ],
      });
    }
    fixLeads();
    const bench = new Bench(circuit, group, { locked: fixed, unscrew: false, onChange: changed }),
      wiring = bench.pointer();
    let ui,
      rows,
      plot,
      form,
      fields,
      summary,
      aim,
      near = false,
      active = null,
      series,
      number,
      baseline,
      reference,
      alternate,
      comparison,
      elapsed,
      pending;
    const bar = lessonBar({
      ...ctx,
      group,
      back: leave,
      steps: [
        { id: 'cell', title: '制成水果电池', todo: '将铜片、锌片相隔约 1 cm 插进梨中。', target: () => aim },
        { id: 'wire', title: '连接电路', todo: '用电阻箱作负载，电压表与它并联。', target: () => aim },
        { id: 'measure', title: '改阻读压', todo: '保持电极位置，用不同外电阻测几组路端电压。', target: () => aim },
        { id: 'fit', title: '估算 E 和 r', todo: '断开开关，在笔记本用 U 与 U/R 作图。', target: () => aim },
        {
          id: 'compare',
          title: '改变电极位置',
          todo: '保持同一外电阻，比较改变片距或插入深度后的端电压。',
          target: () => aim,
        },
      ],
    });
    const say = (s, o) => {
      aim = near ? null : o;
      bar.say(s);
    };
    const snap = () => {
      const g = fruit.source.geometry();
      return { spacing: Math.round(g.spacing), depths: g.depths.map(Math.round) };
    };
    const formed = () => fruit.source.geometry().depths.every((d) => d > 0);
    function topology() {
      const net = nets(circuit, { closedSwitch: false }),
        missing = links.find(([a, b]) => net(a) !== net(b));
      const nodes = ['E.+', 'E.-', 'R.b'].map(net);
      return { missing, extra: new Set(nodes).size !== 3 || nodes.includes(net('V.3')) };
    }
    const enough = (rows) => {
      const rs = rows.map((p) => p.ohms);
      return new Set(rs).size >= 4 && Math.max(...rs) >= 3 * Math.min(...rs);
    };
    function guide() {
      if (near === 'meter') return say('沿指针读 0–1.5 V 刻度，每小格 0.05 V。点对应刻线即可记下这一组。');
      if (!formed()) {
        const i = fruit.source.geometry().depths.findIndex((d) => d <= 0);
        return say('抓住' + (i ? '锌片' : '铜片') + '的夹头，朝梨推入果肉。两片约相隔 1 cm。', fruit.blades[i]);
      }
      if (near === 'plates') {
        const g = snap();
        const target = alternate
          ? '原片距 ' + baseline.geo.spacing + ' mm，原插深 ' + baseline.geo.depths.join(' / ') + ' mm。'
          : '';
        return say(
          '当前片距 ' + g.spacing + ' mm，铜、锌插深 ' + g.depths.join(' / ') + ' mm。' + target + '定位后回全景继续。',
        );
      }
      const { missing, extra } = topology();
      if (extra || missing) {
        if (sw.closed && meter.reverse)
          return say('表针向零线左侧偏转。断开开关，把电压表红柱接到电阻箱电势较高的一侧。', sw.group);
        if (sw.closed) return say('先断开开关，再改接电压表或电阻箱的接线。', sw.group);
        return say(
          extra ? '有导线旁路了器件或接到了另一量程，检查并拆下。' : missing[2],
          extra ? null : bench.posts.find((p) => p.id === missing[0]).ring,
        );
      }
      if (comparison) return say(comparison);
      if (baseline) {
        if (box.part.R !== reference.ohms)
          return say('把电阻箱调回 ' + reference.ohms + ' Ω，保持外电阻相同，再比较电极位置。', box.knobs[0]);
        const g = snap(),
          sp = Math.abs(g.spacing - baseline.geo.spacing) > 1,
          dep = g.depths.some((d, i) => Math.abs(d - baseline.geo.depths[i]) > 1);
        if (alternate && (sp || dep))
          return say(
            sw.closed
              ? '已测改变后的位置。断开开关，再将电极放回原来的插孔。'
              : '恢复原片距 ' +
                  baseline.geo.spacing +
                  ' mm，铜、锌插深 ' +
                  baseline.geo.depths.join(' / ') +
                  ' mm。再测同一阻值，检查电池有没有漂移。',
            sw.closed ? sw.group : fruit.blades[alternate.index],
          );
        if (alternate)
          return say(
            sw.closed ? '按原位置再读一次端电压，和先前读数比较。' : '位置已恢复，合上开关再读端电压。',
            sw.closed ? meter.group : sw.group,
          );
        if (!sp && !dep)
          return say(
            sw.closed ? '先断开开关，再只改片距或插深。' : '保持电阻箱不动，把一片插深一些，或横移一片改变片距。',
            sw.closed ? sw.group : fruit.blades[0],
          );
        if (sp && dep) return say('片距和深度都改变了。请恢复其中一个条件，再比较。', fruit.blades[0]);
      } else if (series && enough(series.samples)) {
        return say(
          sw.closed
            ? '四种外电阻已有读数。断开开关，到笔记本比较 U 与 U/R。'
            : '展开笔记本，用本组 U–I 图估算 E 和 r。',
          sw.closed ? sw.group : null,
        );
      }
      if (!box.part.R) return say('电阻箱在 0 Ω 档，U/R 无法求电流。转动旋钮接入电阻。', box.knobs[0]);
      if (!sw.closed) return say('合上开关，在表盘上读电阻箱两端的电压。', sw.group);
      if (series?.samples.at(-1)?.ohms === box.part.R && !baseline)
        return say('已记录 ' + box.part.R + ' Ω。可断开开关再换阻值，缩短每次放电时间。', box.knobs[0]);
      say('电阻箱 ' + box.part.R + ' Ω。点电压表近看，读路端电压。', meter.group);
    }
    function changed(_, ev = {}) {
      if (ev.msg) return say(ev.msg);
      const { missing, extra } = topology();
      if (formed() && sw.closed && !missing && !extra && box.part.R > 0) bar.done('wire');
      updateGraph();
      guide();
    }
    function leave() {
      if (near) ctx.back();
      near = false;
      bar.near(false);
      guide();
    }
    function viewMeter() {
      near = 'meter';
      bar.near(true);
      const p = group.worldToLocal(meter.group.face.getWorldPosition(new THREE.Vector3()));
      ctx.look(p.toArray(), [0, 0.012, 1], 0.14, leave);
      guide();
    }
    function updateGraph() {
      if (!plot) return;
      const samples = baseline?.samples || series?.samples || [],
        fit = fitFruit(samples);
      plot.el.hidden = !samples.length;
      plot.series[0].points = samples.map((p) => [(1000 * p.volts) / p.ohms, p.volts]);
      plot.x.max = Math.max(0.45, ...plot.series[0].points.map((p) => p[0] * 1.1));
      plot.series[1].points =
        fit && enough(samples)
          ? [
              [0, fit.emf],
              [plot.x.max, fit.emf - fit.kOhm * plot.x.max],
            ]
          : [];
      plot.draw();
      form.hidden = !!baseline || sw.closed || !enough(samples);
      const shown = baseline || series;
      summary.textContent = shown
        ? '图中第 ' +
          shown.id +
          ' 组：片距 ' +
          shown.geo.spacing +
          ' mm，铜、锌插深 ' +
          shown.geo.depths.join(' / ') +
          ' mm。' +
          (baseline ? '本组估得 E = ' + baseline.emf.toFixed(2) + ' V，r = ' + baseline.kOhm.toFixed(2) + ' kΩ。' : '')
        : '';
    }
    function read(hit) {
      const fault = topology();
      if (!formed() || !sw.closed || fault.missing || fault.extra || !box.part.R) {
        leave();
        return;
      }
      const reading = readMeterTick(meter, hit);
      if (reading.error) return say(reading.error);
      const geo = snap(),
        ohms = box.part.R,
        volts = reading.value;
      const old = !baseline && series?.samples.find((p) => p.ohms === ohms);
      const drift = old && Math.abs(old.volts - volts) > 0.049;
      if (!series || drift) series = { id: ++number, geo, samples: [] };

      rows.add([
        String(series.id),
        String(geo.spacing) + ' / ' + geo.depths.join(' / '),
        String(ohms),
        volts.toFixed(2),
        ((1000 * volts) / ohms).toFixed(3),
        Math.round(elapsed) + ' s',
      ]);
      if (baseline) {
        const sp = Math.abs(geo.spacing - baseline.geo.spacing) > 1,
          dep = geo.depths.some((d, i) => Math.abs(d - baseline.geo.depths[i]) > 1);
        if (ohms === reference.ohms) {
          if (alternate && !sp && !dep) {
            const bracket = [reference.volts, volts];
            const above = bracket.every((v) => alternate.volts - v >= 0.049),
              below = bracket.every((v) => v - alternate.volts >= 0.049);
            if (Math.abs(reference.volts - volts) <= 0.051 && (above || below)) {
              comparison =
                ohms +
                ' Ω 时，原位置读 ' +
                reference.volts.toFixed(2) +
                ' V，改变' +
                alternate.what +
                '后读 ' +
                alternate.volts.toFixed(2) +
                ' V，放回原位置读 ' +
                volts.toFixed(2) +
                ' V。';
              bar.done('compare');
            } else {
              reference = { ohms, volts };
              alternate = null;
              updateGraph();
              leave();
              return say('恢复位置后，三次读数不足以分清位置影响和放电漂移。断开稍候，以当前读数为参照重新比较。');
            }
          } else if (!alternate && sp !== dep) {
            if (Math.abs(volts - reference.volts) < 0.049) {
              updateGraph();
              leave();
              return say('读数差不到一格。保持外电阻相同，再多改变一点片距或插深。');
            }
            const displacement = fruit.blades.map((blade, i) => blade.position.distanceTo(baseline.positions[i]));
            alternate = { volts, what: sp ? '片距' : '插深', index: displacement[0] >= displacement[1] ? 0 : 1 };
          }
        }
      } else {
        if (!old || drift) series.samples.push({ ohms, volts });
        if (drift) {
          bar.undo('measure');
          updateGraph();
          leave();
          return say('同一负载的读数已变化至少一格。旧组留在表中，当前读数开始新组。');
        }
        if (enough(series.samples)) bar.done('measure');
      }
      updateGraph();
      leave();
    }
    function estimate() {
      if (sw.closed || !series || !enough(series.samples)) return;
      const fit = fitFruit(series.samples);
      if (!fit || fit.kOhm <= 0) return say('本组点没有给出下降趋势，复查电极位置、外电阻和表的读数。');
      const maxResidual = Math.max(
        ...series.samples.map((p) => Math.abs(p.volts - fit.emf + (fit.kOhm * 1000 * p.volts) / p.ohms)),
      );
      if (maxResidual > 0.055) return say('有测点偏离直线超过一小格。保留本表，断电后另测一组，缩短每次通电时间。');
      const [e, r] = fields.map((f) => f.valueAsNumber);
      if (!Number.isFinite(e) || Math.abs(e - fit.emf) > 0.035) return say('读直线外推到 I = 0 时的纵截距，单位 V。');
      if (!Number.isFinite(r) || Math.abs(r - fit.kOhm) > Math.max(0.12, fit.kOhm * 0.1))
        return say('用直线的电压降除以电流增量；横轴是 mA，所得内阻单位为 kΩ。');
      baseline = { ...series, emf: e, kOhm: r, positions: fruit.blades.map((b) => b.position.clone()) };
      reference = series.samples.at(-1);
      bar.done('fit');
      updateGraph();
      guide();
    }
    let from, axis, angle, initialDigit, knobBase;
    const drags = [
      ...fruit.blades.map((b, i) => ({
        obj: b,
        plane: 'xz',
        offset: Y,
        hint: '抓夹头推入或拉出，横移改变两片间距',
        enabled: () => near !== 'meter',
        onTap() {
          if (near) return;
          near = 'plates';
          bar.near(true);
          ctx.look([-0.115, Y, 0.06], [0, 1, 0.32], ctx.camera.aspect < 1 ? 0.2 : 0.29, leave);
          guide();
        },
        onStart() {
          from = b.position.clone();
          axis = null;
        },
        onDrag(p, start) {
          if (!start) return;
          if (sw.closed) return say('先断开开关，再移动铜、锌片，避免把两种几何条件记成同一组。', sw.group);
          const old = b.position.clone();
          const dx = p.x - start.x,
            dz = p.z - start.z;
          if (!axis && Math.max(Math.abs(dx), Math.abs(dz)) > 0.0015)
            axis = Math.abs(dx) > Math.abs(dz) ? 'spacing' : 'depth';
          if (!axis) return;
          fruit.shift(i, from, dx, dz, axis === 'spacing');
          if (old.distanceToSquared(b.position) < 1e-12) return;
          if (series) {
            series = null;
            if (!baseline) bar.undo('measure');
          }
          circuit.solve();
          const g = snap();
          say('片距 ' + g.spacing + ' mm；铜、锌插深 ' + g.depths.join(' / ') + ' mm。');
        },
        onEnd() {
          if (alternate && !sw.closed && b.position.distanceTo(baseline.positions[i]) < 0.003) {
            const dest = baseline.positions[i];
            fruit.set(i, dest.x, dest.z);
            circuit.solve();
          }
          if (formed()) bar.done('cell');
          updateGraph();
          guide();
        },
      })),
      ...box.knobs.map((knob, i) => ({
        obj: knob,
        plane: 'xz',
        offset: 0.043,
        enabled: () => !near,
        hint: i ? '转动百欧档旋钮' : '转动千欧档旋钮',
        onStart(p) {
          knobBase = group.worldToLocal(knob.getWorldPosition(new THREE.Vector3()));
          angle = p ? Math.atan2(p.x - knobBase.x, knobBase.z - p.z) : 0;
          initialDigit = box.digits[i];
        },
        onDrag(p, start) {
          if (!start) return;
          let delta = Math.atan2(p.x - knobBase.x, knobBase.z - p.z) - angle;
          delta = Math.atan2(Math.sin(delta), Math.cos(delta));
          const fromCenter = Math.hypot(start.x - knobBase.x, start.z - knobBase.z) < 0.004;
          box.set(i, initialDigit + Math.round(fromCenter ? (p.x - start.x) / 0.005 : delta / (Math.PI / 5)));
          circuit.solve();
          changed();
        },
        onEnd: guide,
      })),
    ];
    const manip = draggable(group, drags, { highlight: true });
    function freshGroup() {
      if (sw.closed) return say('先断开开关，再开始新组。', sw.group);
      series = baseline = reference = alternate = comparison = null;
      fields.forEach((f) => (f.value = ''));
      bar.undo('measure', 'fit', 'compare');
      updateGraph();
      guide();
    }
    function reset() {
      if (near) leave();
      baseline = series = reference = alternate = comparison = null;
      pending = elapsed = number = 0;
      fruit.reset();
      box.set(0, 5);
      box.set(1, 0);
      sw.closed = false;
      circuit.clearWires();
      fixLeads();
      circuit.solve();
      bench.drag = null;
      bench.temp.visible = false;
      active = null;
      rows?.clear();
      if (summary) summary.textContent = '';
      fields?.forEach((f) => (f.value = ''));
      bar.undo('cell', 'wire', 'measure', 'fit', 'compare');
      updateGraph();
      guide();
    }
    reset();
    return {
      group,
      size: { w: 0.43, d: 0.26, h: 0.14 },
      view: { azim: 1, elev: 46, lookY: 0.37, margin: 1.05 },
      toggles: ['steps'],
      pointer: {
        items: () => drags,
        down(ray, e) {
          if (document.body.classList.contains('predicting')) ui?.go(1);
          if (near === 'plates') {
            if (manip.down(ray, e)) active = manip;
            return true;
          }
          if (near === 'meter') {
            const hit = ray.intersectObject(meter.dial, false)[0];
            if (hit) read(hit);
            return true;
          }
          if (wiring.down(ray, e)) {
            active = wiring;
            if (sw.closed && (bench.drag?.from || bench.drag?.wire)) {
              bench.drag = null;
              say('先断开开关，再改接导线。', sw.group);
            }
            return true;
          }
          if (manip.down(ray, e)) {
            active = manip;
            return true;
          }
          if (ray.intersectObject(meter.dial, false).length) {
            viewMeter();
            return true;
          }
          return false;
        },
        move(ray) {
          if (near === 'meter') return true;
          if (active) return active.move(ray);
          if (near === 'plates') return manip.move(ray);
          if (wiring.move(ray)) return true;
          return manip.move(ray);
        },
        up() {
          const last = active;
          active = null;
          return last?.up();
        },
      },
      mount(panel) {
        ui = panel;
        bar.attach(panel);
        rows = table(['组', '距/铜深/锌深 mm', 'R / Ω', 'U / V', 'U/R / mA', '通电累计']);
        plot = chart({
          x: { label: 'I / mA', min: 0, max: 0.45 },
          y: { label: 'U / V', min: 0, max: 1 },
          series: [
            { color: '#24696d', points: [], dots: true, line: false },
            { color: '#a86443', points: [] },
          ],
          height: 190,
        });
        summary = note('');
        fields = ['电动势 / V', '内阻 / kΩ'].map((label) =>
          h('input', { type: 'number', step: '.01', 'aria-label': label }),
        );
        form = h(
          'div',
          { class: 'ctl' },
          note('I ≈ U/R。根据同一电极配置的 U–I 图，读纵截距，求斜率绝对值。'),
          h('label', {}, 'E / V ', fields[0]),
          h('label', {}, 'r / kΩ ', fields[1]),
          buttons([{ text: '核对估计', onClick: estimate }]).el,
        );
        panel.data.append(summary, plot.el, form, rows.el);
        panel.notes.append(
          note(
            '铜片接正，锌片接负。梨中的电阻按片距和接触面积近似；持续放电的有效内阻逐渐增大，断开后逐渐恢复。读数是这枚模拟电池的结果。电压表 1.5 V 档内阻 3 MΩ，远大于本实验电阻箱阻值。',
          ),
          buttons([
            { text: '保留记录，另测一组', onClick: freshGroup },
            { text: '全部重做', onClick: reset },
          ]).el,
        );
        updateGraph();
        guide();
      },
      update(dt) {
        bar.update(dt);
        bench.update(dt);
        pending += dt;
        if (sw.closed) elapsed += dt;
        if (pending >= 0.15) {
          fruit.source.polarization = polarize(fruit.source.polarization, fruit.source.I, pending);
          circuit.solve();
          pending = 0;
        }
        circuit.update(dt);
      },
      dispose() {
        manip.dispose();
        bar.dispose();
        circuit.dispose();
      },
    };
  },
};
