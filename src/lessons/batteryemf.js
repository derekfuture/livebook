// 必修三图 12.3-1。电流表在负载支路，电压表跨接在负载与电流表两端。
import * as THREE from 'three';
import { Circuit, battery, switchPart, rheostatPart, meterPart } from './kit/circuit.js';
import { Bench, nets } from './kit/bench.js';
import { readMeterTick } from './kit/meterReading.js';
import { lessonBar } from './kit/lessonbar.js';
import { chart, table, note, buttons, h } from './kit/ui.js';

const fixed = [
  ['A.-', 'R.C'],
  ['R.A', 'S.b'],
  ['S.a', 'E.-'],
];
const links = [
  ['E.+', 'A.0.6', '从电池红柱拖线到电流表的 0.6 A 红柱，让电流表串入主回路。'],
  ['V.3', 'E.+', '把电压表的 3 V 红柱接到电池正极。'],
  ['V.-', 'S.b', '把电压表黑柱接到开关靠变阻器的一端。'],
];
function bestLine(points) {
  const n = points.length;
  const meanI = points.reduce((s, p) => s + p[0], 0) / n,
    meanU = points.reduce((s, p) => s + p[1], 0) / n;
  const slope =
    points.reduce((s, [i, u]) => s + (i - meanI) * (u - meanU), 0) / points.reduce((s, [i]) => s + (i - meanI) ** 2, 0);
  return { e: meanU - slope * meanI, r: -slope };
}
export default {
  id: 'batteryemf',
  fig: '图12.3-1',
  title: '电池电动势和内阻的测量',
  stampText: '测量',
  predict: {
    q: '同一节旧干电池，减小外电路电阻时，电流增大。电池两端的电压会怎样变？',
    options: ['升高', '降低', '保持不变'],
    answer: 1,
    hint: '电池本身也有电阻。',
  },
  conclusion: {
    page: 94, rect: [217.39, 533.68, 531.74, 739.31],
    quote: '直线与U坐标轴的交点值表示断路时的路端电压，这时的电压U 等于电源的电动势E。……另外，如果从直线方程U＝－ I r ＋E的角度理解，通过求解U-I图像斜率的绝对值也可以求出电源的内阻r……',
    why: '电源有内阻，路端电压 U = E − Ir。电压表的内阻远大于负载电阻，本实验近似用电流表读数表示电源电流。测量范围内取多组点，再把拟合直线延长到 I = 0；求斜率时取直线上相距较远的两点。',
    src: '课本第 90 页 · 第十二章 第3节 实验：电池电动势和内阻的测量',
  },
  create(ctx) {
    const group = new THREE.Group(),
      c = new Circuit();
    group.add(c.group);
    const source = c.add(battery('E', { cells: 1, emf: 1.48, r: 1.8 }), [-0.14, -0.075]);
    const sw = c.add(switchPart('S'), [-0.14, 0.065]);
    const load = c.add(rheostatPart('R', { Rmax: 20, pos: 1 }), [0.026, 0.104]);
    const A = c.add(meterPart('A', { type: 'A' }), [0.127, -0.065]);
    const V = c.add(meterPart('V', { type: 'V' }), [-0.008, -0.035]);
    for (const [a, b] of fixed) c.wire(a, b);
    const bench = new Bench(c, group, { onChange: changed, locked: fixed, unscrew: false });
    const wiring = bench.pointer(),
      points = [],
      fitted = [];
    let ui,
      records,
      plot,
      report,
      inputs,
      near = null,
      first = null,
      line = null,
      aim = null;
    const bar = lessonBar({
      ...ctx,
      back: leave,
      group,
      steps: [
        { id: 'circuit', title: '接线试测', todo: '开关断开，接好两块表。', target: () => aim },
        { id: 'measure', title: '调阻读表', todo: '逐次减小电阻，测四组不同的电流和路端电压。', target: () => aim },
        { id: 'graph', title: '从图求电源参数', todo: '断开开关，展开笔记本读图。', target: () => aim },
      ],
    });
    const post = (id) => bench.posts.find((p) => p.id === id)?.ring;
    function say(text, obj = null) {
      aim = obj;
      bar.say(text);
    }
    function topology() {
      const net = nets(c, { closedSwitch: false });
      const missing = links.find(([a, b]) => net(a) !== net(b) && !(a === 'V.-' && net(a) === net('E.-')));
      // 四段应当由器材相连；直接跨接的导线会旁路开关、变阻器或电流表。
      const nodes = ['E.+', 'A.-', 'S.b', 'E.-'].map(net);
      const spare = ['A.3', 'V.15', 'R.B'].some((id) => nodes.includes(net(id)));
      return { missing, extra: new Set(nodes).size !== 4 || spare };
    }
    function valid() {
      const { missing, extra } = topology();
      return !missing && !extra && sw.closed && !A.over && !V.over && !A.reverse && !V.reverse && A.value > 0.005;
    }
    function changed(circuit, ev = {}) {
      if (!ui) return;
      if (ev.msg) {
        say(ev.msg);
        return;
      }
      first = null;
      const { missing, extra } = topology();
      if (
        sw.closed &&
        (missing || extra || A.over || V.over || A.reverse || V.reverse || (!bar.has('circuit') && load.pos < 0.88))
      ) {
        const fault =
          A.over || V.over
            ? '指针已超量程'
            : A.reverse || V.reverse
              ? '指针反偏'
              : extra
                ? '有接线柱被多余导线旁路'
                : missing
                  ? '测量回路还没接好'
                  : '试测前应让变阻器接入较大阻值';
        say(fault + '。先点开关断电，再调整。', sw.group);
        return;
      }
      if (missing || extra) {
        say(extra ? '有接线柱被多余导线短接，点错线拆下。' : missing[2], extra ? null : post(missing[0]));
        return;
      }
      if (!sw.closed) {
        if (line) say('电源已断开。展开笔记本，在 U–I 图上求截距和斜率。');
        else if (!bar.has('circuit') && load.pos < 0.88)
          say('向右拖滑片，把接入电阻调到最大，再合上开关。', load.slider);
        else say('点开关的刀片合闸，观察两块表的指针。', sw.group);
        return;
      }
      if (valid()) bar.done('circuit');
      say('点电流表近看，从指针读这组电流。', A.group);
    }
    function leave() {
      near = null;
      ctx.back();
      bar.near(false);
      if (valid())
        say(first === null ? '点电流表读电流。' : '电流已读，点电压表读路端电压。', first === null ? A.group : V.group);
    }
    function inspect(meter) {
      near = meter;
      bar.near(true);
      const p = c.group.worldToLocal(meter.group.face.getWorldPosition(new THREE.Vector3()));
      ctx.look(p.toArray(), [0, 0.01, 1], 0.13, () => {
        leave();
      });
      say(meter === A ? '量程 0.6 A，每小格 0.02 A。点指针所指的刻线。' : '量程 3 V，每小格 0.1 V。点指针所指的刻线。');
    }
    function read(meter, hit) {
      const { value, error } = readMeterTick(meter, hit);
      if (error) {
        say(error);
        return;
      }
      leave();
      if (meter === A) {
        first = value;
        say('电流 ' + first.toFixed(2) + ' A。保持滑片不动，点电压表读路端电压。', V.group);
        return;
      }
      const i = first;
      first = null;
      if (points.some((p) => p[0] === i)) {
        say('刚才已经记录过这个电流，移动滑片再测。', load.slider);
        return;
      }
      points.push([i, value]);
      records.el.hidden = plot.el.hidden = false;
      records.add([String(points.length), i.toFixed(2), value.toFixed(1)]);
      const currents = points.map((p) => p[0]);
      const span = Math.max(...currents) - Math.min(...currents);
      const measured = '第 ' + points.length + ' 组：' + i.toFixed(2) + ' A、' + value.toFixed(1) + ' V。';
      if (points.length >= 4 && span >= 0.15) {
        line = bestLine(points);
        bar.done('measure');
        bar.undo('graph');
        plot.y.min = Math.max(0, Math.floor((Math.min(...points.map((p) => p[1])) - 0.1) * 10) / 10);
        plot.y.max = Math.max(1.6, Math.ceil(line.e * 10) / 10 + 0.1);
        const right = Math.min(plot.x.max, (line.e - plot.y.min) / line.r);
        fitted.splice(0, fitted.length, [0, line.e], [right, line.e - line.r * right]);
        report.hidden = false;
        say(measured + '断开开关，再展开笔记本看 U–I 图。', sw.group);
      } else
        say(
          measured + '向左移滑片增大电流' + (points.length >= 3 ? '，让各组读数拉开距离。' : '，再点电流表。'),
          load.slider,
        );
      plot.draw();
    }
    function accept() {
      if (!line || sw.closed) {
        say('先断开开关，再根据自己的图线求参数。', sw.group);
        return;
      }
      const [e, r] = inputs.map((input) => input.valueAsNumber);
      if (!Number.isFinite(e) || Math.abs(e - line.e) > 0.08) {
        say('读 I = 0 处的纵截距，单位 V。');
        return;
      }
      if (!Number.isFinite(r) || Math.abs(r - line.r) > 0.25) {
        say('在直线上取相距较远的两点，用电压降除以电流增量，单位 Ω。');
        return;
      }
      bar.done('graph');
      say('根据这组测量，E ≈ ' + e.toFixed(2) + ' V，r ≈ ' + r.toFixed(2) + ' Ω。');
    }
    function reset() {
      leave();
      points.length = fitted.length = 0;
      line = first = null;
      sw.closed = false;
      c.clearWires();
      for (const [a, b] of fixed) c.wire(a, b);
      load.setPos(1);
      bench.drag = null;
      bench.temp.visible = false;
      records.clear();
      records.el.hidden = plot.el.hidden = report.hidden = true;
      plot.y.min = 0;
      plot.y.max = 1.6;
      plot.draw();
      for (const input of inputs) input.value = '';
      bar.undo('circuit', 'measure', 'graph');
      changed(c);
    }
    const meters = [A, V];
    const pointer = {
      down(ray, e) {
        if (!near && wiring.down(ray, e)) {
          if (document.body.classList.contains('predicting')) ui.go(1);
          if (sw.closed && (bench.drag?.from || bench.drag?.wire)) {
            bench.drag = null;
            say('先断开开关，再改接导线。', sw.group);
          } else if (bench.drag?.from) {
            const next = topology().missing;
            if (next && next.slice(0, 2).includes(bench.drag.from))
              aim = post(next[bench.drag.from === next[0] ? 1 : 0]);
          }
          return true;
        }
        const selected = near ? [near] : meters;
        for (const meter of selected) {
          const hit = ray.intersectObject(meter.dial, false)[0];
          if (!hit) continue;
          if (!bar.has('circuit') || !valid()) {
            changed(c);
            return true;
          }
          if (meter === V && first === null) {
            say('先点电流表，记下与这一电压对应的电流。', A.group);
            return true;
          }
          if (near) read(meter, hit);
          else inspect(meter);
          return true;
        }
        return !!near;
      },
      move(ray) {
        if (near) return true;
        return wiring.move(ray);
      },
      up() {
        return wiring.up();
      },
    };
    return {
      group,
      pointer,
      toggles: ['steps'],
      size: { w: 0.45, d: 0.32, h: 0.1 },
      view: { elev: 43, azim: 0, lookY: 0.28, margin: 1.08 },
      mount(panel) {
        ui = panel;
        bar.attach(ui);
        records = table(['组', 'I / A', 'U / V']);
        plot = chart({
          x: { label: 'I / A', min: 0, max: 0.6 },
          y: { label: 'U / V', min: 0, max: 1.6 },
          series: [
            { points, dots: true, line: false, color: '#28656f' },
            { points: fitted, color: '#a95332' },
          ],
          legend: '蓝点是你的两表读数。棕线按全部点拟合，延长到 I = 0。',
        });
        inputs = ['E / V', 'r / Ω'].map((text) =>
          h('input', { type: 'number', step: '0.01', 'aria-label': text, style: 'width:5em' }),
        );
        report = h(
          'div',
          { hidden: true },
          note('由图估计电动势和内阻。纵轴的起点可高于零，请按标出的刻度读。'),
          ...inputs.map((input, i) => h('label', {}, ['E / V ', ' r / Ω '][i], input)),
          buttons([{ text: '核对图上估计', onClick: accept }]).el,
        );
        records.el.hidden = plot.el.hidden = true;
        ui.data.append(records.el, plot.el, report);
        ui.notes.append(
          note('三段主回路导线已装好。拖接线柱连两表，点错接的导线可拆。调电阻后先读 A 表，再读 V 表。'),
          buttons([{ text: '全部重做', onClick: reset }]).el,
        );
        changed(c);
      },
      update(dt) {
        c.update(dt);
        bench.update(dt);
        bar.update(dt);
      },
      dispose() {
        bar.dispose();
      },
    };
  },
};
