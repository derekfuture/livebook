// 必修三图 12.3-1。电流表在负载支路，电压表跨接在负载与电流表两端。
import * as THREE from 'three';
import { Circuit, battery, switchPart, rheostatPart, meterPart, drawSchematic } from './kit/circuit.js';
import { Bench, nets } from './kit/bench.js';
import { rayToLocal } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { chart, table, note, h } from './kit/ui.js';

const fixed = [
  ['A.-', 'R.C'],
  ['R.A', 'S.b'],
  ['S.a', 'E.-'],
];
const links = [
  ['E.+', 'A.0.6', '断开开关，从电池红柱拖线到电流表的 0.6 A 柱，把电流表串入负载支路。'],
  ['V.3', 'E.+', '电流表已串入。把电压表的 3 V 柱接到电池正极。'],
  ['V.-', 'S.b', '从电压表黑柱拖到开关右柱，使电压表跨在负载两端。'],
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
    q: '怎样用两块电表测出一节旧干电池的电动势和内阻？先猜一猜：减小外电阻，电流增大，路端电压会怎样变？',
    options: ['升高', '降低', '保持不变'],
    answer: 1,
  },
  conclusion: {
    page: 94, rect: [217.39, 533.68, 531.74, 739.31],
    quote: '直线与U坐标轴的交点值表示断路时的路端电压，这时的电压U 等于电源的电动势E。……另外，如果从直线方程U＝－ I r ＋E的角度理解，通过求解U-I图像斜率的绝对值也可以求出电源的内阻r……',
    why: '电源有内阻，路端电压 U = E − Ir。电压表的内阻远大于负载电阻，本实验近似用电流表读数表示电源电流。测量范围内取多组点，再把拟合直线延长到 I = 0；求斜率时取直线上相距较远的两点。',
    src: '课本第 90 页 · 第十二章 第3节 实验：电池电动势和内阻的测量',
  },
  create(ctx) {
    const group = new THREE.Group();
    const c = new Circuit({ showCurrent: false });
    group.add(c.group);
    c.add(battery('E', { cells: 1, emf: 1.48, r: 1.8 }), [-0.14, -0.075]);
    const sw = c.add(switchPart('S'), [-0.14, 0.065]);
    const load = c.add(rheostatPart('R', { Rmax: 20, pos: 0.38 }), [0.026, 0.103]);
    const A = c.add(meterPart('A', { type: 'A' }), [0.125, -0.065]);
    const V = c.add(meterPart('V', { type: 'V' }), [-0.008, -0.035]);
    function connectFixed() {
      // 电流表与滑动触点间的线先落到台面，再从侧面接入，正对电压表时也不挡指针。
      c.wire('A.-', 'R.C', { points: [[0.102, 0.028, -0.039], [0.091, 0.009, -0.016],
        [0.071, 0.005, 0.026], [0.004, 0.005, 0.054], [-0.042, 0.013, 0.076], [-0.041, 0.05, 0.092]] });
      for (const [a, b] of fixed.slice(1)) c.wire(a, b);
    }
    connectFixed();
    const bench = new Bench(c, group, { onChange: changed, locked: fixed, unscrew: false });
    const wiring = bench.pointer();
    const post = id => bench.posts.find(p => p.id === id);
    const hinge = sw.group.children.find(o => o.children.some(m => m.position.x === 0.025));
    const knob = hinge.children[1];
    const grip = load.slider.children[0];
    // 接线柱的悬停只用文字。步骤栏的光圈始终指向当下要操作的位置。
    for (const p of bench.posts) p.ring.material.visible = false;
    const cap = id => {
      const p = post(id);
      return p.part.group.children.find(o => o.isGroup && o.position.x === p.pick.position.x &&
        Math.abs(o.position.z - p.pick.position.z) < 0.001 && o.children.some(m => m.geometry?.type === 'CylinderGeometry'));
    };
    const points = [], fitted = [];
    let ui, near = null, first = null, aim = null, gripped = null, returning = null;
    let tested = false, mustOpen = false, line = null, zoomAxis = false;
    const bar = lessonBar({ ...ctx, group, back: leave, steps: [
      { id: 'wire', title: '接两块表', todo: links[0][2], target: () => aim },
      { id: 'power', title: '大阻值试测', todo: '先增大电阻，限制合闸时的电流。', target: () => aim },
      { id: 'measure', title: '调阻读表', todo: '逐次减小电阻，记录至少四组电流和路端电压。', target: () => aim },
      { id: 'graph', title: '从图求 E、r', todo: '断开开关，用各组读数作直线，求电动势和内阻。', target: () => aim },
    ] });
    const say = (msg, obj = null) => { aim = obj; bar.say(msg); };
    const meterName = m => m === A ? '电流表' : '电压表';
    const field = name => h('input', { type: 'number', inputmode: 'decimal', step: 'any', 'aria-label': name,
      style: 'width:5em;padding:4px;font:inherit' });
    const button = (text, fn) => h('button', { type: 'button', class: 'go', onclick: fn }, text);
    const readField = field('表盘读数'), readLabel = h('span');
    const readForm = h('form', { hidden: true, onsubmit(e) { e.preventDefault(); submitReading(); } },
      h('label', {}, readLabel, readField), h('button', { class: 'go', type: 'submit' }, '记下读数'));
    const records = table(['组', 'I / A', 'U / V']);
    const plot = chart({ x: { label: 'I / A', min: 0, max: 0.6 }, y: { label: 'U / V', min: 0, max: 1.6 },
      preserveAspect: true, height: 180, series: [
        { points: fitted, color: '#975336' }, { points, dots: true, line: false, color: '#28656f' },
      ] });
    const axes = button('展开电压刻度', () => { zoomAxis = !zoomAxis; drawPlot(); });
    const fit = button('画趋势直线', fitLine);
    const eField = field('电动势 E'), rField = field('内阻 r');
    const estimates = h('form', { hidden: true, onsubmit(e) { e.preventDefault(); accept(); } },
      h('label', {}, 'E / V ', eField), h('label', {}, '　r / Ω ', rField),
      h('button', { type: 'submit', class: 'go' }, '核对读图'));
    const result = h('div', { style: 'margin:10px 0;font-size:15px;line-height:1.6;color:#393e43;white-space:pre-line' });
    const extrapolation = note('');
    extrapolation.hidden = true;
    const graphActions = h('div', { hidden: true }, extrapolation, h('div', { class: 'btn-row', style: 'margin-bottom:9px' }, axes, fit), estimates, result);
    const diagram = h('canvas', { width: 360, height: 150, 'aria-label': '图12.3-1 的测量电路',
      style: 'display:block;width:100%;height:auto' });
    const diagramBox = h('div', {}, diagram, note('图 12.3-1　电流表串联，电压表并联'));
    function drawCircuit() {
      const g = diagram.getContext('2d');
      g.fillStyle = '#fbf8f1'; g.fillRect(0, 0, 360, 150);
      drawSchematic(g, {
        wires: [[[44, 124], [44, 26], [155, 26], [155, 45]], [[181, 58], [291, 58], [291, 124], [44, 124]],
          [[44, 86], [291, 86]]],
        parts: [{ type: 'ammeter', x: 44, y: 55, rot: 90 }, { type: 'voltmeter', x: 180, y: 86 },
          { type: 'battery', x: 145, y: 124 }, { type: 'switch', x: 237, y: 124, state: sw.closed },
          { type: 'node', x: 44, y: 86 }, { type: 'node', x: 291, y: 86 }] });
      g.strokeStyle = g.fillStyle = '#1d2433'; g.lineWidth = 2.5;
      g.strokeRect(129, 51, 52, 14);
      g.beginPath(); g.moveTo(150, 43); g.lineTo(155, 50); g.lineTo(160, 43); g.fill();
    }
    function topology() {
      const net = nets(c, { closedSwitch: false }), nodes = ['E.+', 'A.-', 'S.b', 'E.-'].map(net);
      const missing = links.find(([a, b]) => net(a) !== net(b));
      const extra = new Set(nodes).size !== 4 || ['A.3', 'V.15', 'R.B'].some(id => nodes.includes(net(id)));
      return { missing, extra };
    }
    function ready() {
      const { missing, extra } = topology();
      return tested && !mustOpen && sw.closed && !missing && !extra && !A.over && !V.over && !A.reverse && !V.reverse && A.value > 0;
    }
    function changed(_, event = {}) {
      if (!ui) return;
      if (event.msg) return say(event.msg);
      first = null;
      const { missing, extra } = topology();
      drawCircuit();
      if (!sw.closed) mustOpen = false;
      if (bar.finished) return;
      if (bar.has('measure') && !sw.closed) {
        graphActions.hidden = false;
        ui.fold(false);
        return say(line ? slopePrompt() : '开关已断开。展开电压刻度，观察各点的分布，再画趋势直线。');
      }
      graphActions.hidden = true;
      const stillUnsafe = missing || extra || A.over || V.over || A.reverse || V.reverse || (!tested && load.pos < 0.85);
      if (sw.closed && (mustOpen || stillUnsafe)) {
        if (mustOpen && !stillUnsafe) return say('先断开开关，确认接线和阻值后再合闸。', knob);
        mustOpen = true;
        const fault = A.over || V.over ? '指针越过满刻度了' : A.reverse || V.reverse ? '指针反偏了' :
          missing || extra ? '接线还不能测量' : '接入电阻偏小，起始电流偏大';
        return say(fault + '。断开开关，检查接线或增大电阻。', knob);
      }
      if (missing || extra) {
        tested = false;
        bar.undo('wire', 'power');
        diagramBox.hidden = false;
        return extra ? say('有接线柱接错了。点错线拆下，再按电路图连接。') : say(missing[2], cap(missing[0]));
      }
      bar.done('wire');
      if (!sw.closed) return load.pos < 0.85 && !tested
        ? say('两表已接好。向右拖滑片，先用较大电阻限制合闸电流。', grip)
        : say('点刀柄合闸，两表的指针偏转就能读数。', knob);
      tested = true;
      bar.done('power');
      diagramBox.hidden = true;
      if (bar.has('measure')) return say('各组读数已拉开，断开开关后用图线求电动势和内阻。', knob);
      say(points.length ? '点表盘，读同一滑片位置的电流和路端电压。' :
        '两根指针都偏转了。点一块表盘，读出同一滑片位置的电流和路端电压。', A.dial);
    }
    function closeView() { near = null; ctx.back(); bar.near(false); readForm.hidden = true; }
    function leave() {
      closeView();
      if (first) say('保持滑片不动，点另一块表补全这一组。', first.meter === A ? V.dial : A.dial);
      else changed(c);
    }
    function inspect(m) {
      if (!ready() || bar.finished) return changed(c);
      near = m;
      const p = group.worldToLocal(m.group.face.getWorldPosition(new THREE.Vector3()));
      const portrait = ctx.camera.aspect < 1;
      p.y -= portrait ? 0.023 : 0.012;
      ctx.look(p.toArray(), [0, 0.24, 1], portrait ? 0.205 : 0.193, leave);
      bar.near(true);
      ui.fold(false);
      readForm.hidden = false;
      readField.value = '';
      readLabel.textContent = m === A ? '电流 I / A　' : '路端电压 U / V　';
      say(m === A ? '接的是 0.6 A 量程，读内圈刻度，估读到相邻刻线之间。' : '接的是 3 V 量程，读内圈刻度，估读到相邻刻线之间。');
    }
    function submitReading() {
      if (!near || !ready()) return;
      const m = near, unit = m === A ? ' A' : ' V', step = m.range / 30;
      const value = readField.valueAsNumber;
      if (!Number.isFinite(value)) return say('先把指针所指的数填进读数框。');
      if (value < 0 || value > m.range || Math.abs(value - m.value) > step * 0.55) {
        const wrongRange = Math.abs(value / 5 - m.value) < step * 0.55;
        return say(wrongRange ? '读到外圈了。接线柱选的是小量程，沿同一指针读内圈。' :
          meterName(m) + '读数偏' + (value < m.value ? '小' : '大') + '。内圈每小格 ' + (m === A ? '0.02 A' : '0.1 V') + '，看指针落在哪两格之间。');
      }
      const reading = +value.toFixed(m === A ? 3 : 2);
      if (!first || first.meter === m) {
        first = { meter: m, value: reading };
        inspect(m === A ? V : A);
        return say(meterName(m) + '读对了，约 ' + reading + unit + '。保持滑片不动，读另一块表的内圈刻度。');
      }
      const i = m === A ? reading : first.value, u = m === V ? reading : first.value;
      first = null;
      closeView();
      if (points.some(p => Math.abs(p[0] - i) < 0.0199))
        return say('这组电流和已有读数太接近。把滑片再移一段，让图上的点分开。', grip);
      const last = points[points.length - 1];
      points.push([i, u]);
      records.add([String(points.length), i.toFixed(3), u.toFixed(2)]);
      records.el.hidden = plot.el.hidden = false;
      const span = Math.max(...points.map(p => p[0])) - Math.min(...points.map(p => p[0]));
      const trend = !last ? '第一组读数已落在图上。共取至少四组，让各点分开。' : u === last[1] ? '两次路端电压读数相同。' :
        '与上一组相比，电流' + (i > last[0] ? '增大' : '减小') + '，路端电压' + (u > last[1] ? '升高' : '降低') + '。';
      if (points.length >= 4 && span >= 0.15) {
        bar.done('measure');
        line = null; fitted.length = 0;
        estimates.hidden = true; fit.hidden = false; eField.value = rField.value = '';
        say(trend + '各点已拉开，断开开关后作图。', knob);
      } else say(trend + '向左拖滑片减小电阻，再测一组。' + (points.length >= 4 ? '让最大和最小电流至少相差 0.15 A。' : ''), grip);
      drawPlot();
    }
    const farI = () => Math.floor(Math.max(...points.map(p => p[0])) * 20) / 20;
    const slopePrompt = () => '读 I = 0 处的电压得 E，再读虚线处的电压。用这段电压降除以 ' + farI().toFixed(2) + ' A 得 r。';
    function drawPlot() {
      plot.x.max = line && !zoomAxis ? Math.max(0.6, Math.ceil(10 * line.e / line.r) / 10) : 0.6;
      plot.y.min = zoomAxis && points.length ? Math.max(0, Math.floor((Math.min(...points.map(p => p[1])) - 0.06) * 10) / 10) : 0;
      plot.y.max = Math.max(1.6, line ? Math.ceil(line.e * 10) / 10 : 0);
      axes.textContent = zoomAxis ? '查看完整坐标轴' : '展开电压刻度';
      fitted.length = 0;
      extrapolation.hidden = !line || zoomAxis;
      if (line) {
        extrapolation.textContent = '延长到 U = 0，横截距约为 ' + (line.e / line.r).toFixed(2) + ' A，这是从图线推算的短路电流。';
        const right = Math.min(plot.x.max, (line.e - plot.y.min) / line.r);
        fitted.push([0, line.e], [right, line.e - right * line.r]);
      }
      plot.draw();
    }
    plot.extra = (g, X, Y) => {
      if (!line) return;
      const i = farI(), u = line.e - i * line.r;
      g.save(); g.strokeStyle = '#636b77'; g.lineWidth = 2; g.setLineDash([5, 4]);
      g.beginPath(); g.moveTo(X(0), Y(u)); g.lineTo(X(i), Y(u)); g.lineTo(X(i), Y(plot.y.min)); g.stroke();
      g.restore();

    };
    function fitLine() {
      if (!bar.has('measure') || sw.closed || bar.finished) return;
      line = bestLine(points);
      estimates.hidden = false;
      fit.hidden = true;
      drawPlot();
      say(slopePrompt());
    }
    function accept() {
      if (!line || sw.closed || bar.finished) return;
      const e = eField.valueAsNumber, r = rField.valueAsNumber;
      if (!Number.isFinite(e) || Math.abs(e - line.e) > 0.04)
        return say('再看纵轴。直线在 I = 0 处的高度才是电动势。');
      if (!Number.isFinite(r) || Math.abs(r - line.r) > 0.16)
        return say('电动势读对了。取下降的电压差，除以正的电流增量，内阻应为正值。');
      const i = farI(), u = line.e - i * line.r;
      result.textContent = '纵截距　E ≈ ' + line.e.toFixed(2) + ' V\n内阻　r = |ΔU/ΔI|\n≈ (' +
        line.e.toFixed(2) + ' − ' + u.toFixed(2) + ') V / ' + i.toFixed(2) + ' A ≈ ' + line.r.toFixed(1) + ' Ω';
      result.hidden = false;
      estimates.hidden = true;
      bar.done('graph');
      say('截距给出断路时的电压，斜率的绝对值给出内阻。可以掀开课本结论了。');
    }
    const tip = h('div', { class: 'hover-tip' });
    const canvas = document.getElementById('c');
    const hideTip = () => { tip.classList.remove('on'); canvas.style.cursor = ''; };
    canvas.addEventListener('pointerleave', hideTip);
    const items = [];
    const register = (obj, kind, label, data) => {
      const item = { obj, kind, data, hint: () => ui?.step === 1 && !near && !bar.finished ? label() : '' };
      items.push(item);
      return item;
    };
    for (const p of bench.posts) register(p.pick, 'post', () => sw.closed ? '点开关：先断电' : '拖动：连接接线柱', p.id);
    register(knob, 'switch', () => sw.closed ? '点一下：断开开关' : '点一下：合上开关');
    register(hinge.children[0], 'switch', () => sw.closed ? '点一下：断开开关' : '点一下：合上开关');
    register(sw.group.children[0], 'switch', () => sw.closed ? '点一下：断开开关' : '点一下：合上开关');
    register(grip, 'slider', () => '左右拖：改变电阻');
    for (const m of [A, V]) register(m.dial, 'meter', () => '点一下：近看' + meterName(m), m);
    const objects = items.map(it => it.obj);
    function pick(ray) {
      const hit = ray.intersectObjects(objects, false)[0];
      if (hit) return items.find(it => it.obj === hit.object);
      const wire = ray.intersectObjects(c.wireGroup.children, false)[0]?.object.userData.wire;
      if (!wire) return null;
      const locked = bench.locked.has([wire.a, wire.b].sort().join('~'));
      return { kind: 'wire', hint: () => sw.closed ? '点开关：先断电' : locked ? '点一下：查看固定线' : '点一下：拆下导线' };
    }
    let pressed = null;
    function stopReturn() { returning = null; bench.temp.visible = false; }
    function slideAt(ray) { return rayToLocal(ray, load.group, 'xz', grip.position.y); }
    const pointer = {
      items: () => items,
      down(ray, e) {
        if (near || bar.finished) return !!near;
        const hit = pick(ray);
        if (!hit) return false;
        hideTip(); stopReturn();
        if (hit.kind === 'switch' || hit.kind === 'meter')
          pressed = { hit, x: e.clientX, y: e.clientY };
        else if (hit.kind === 'slider') {
          const p = slideAt(ray);
          if (p) gripped = { offset: load.slider.position.x - p.x };
        } else if (sw.closed) say('先断开开关，再改接导线。', knob);
        else {
          wiring.down(ray, e);
          const next = topology().missing;
          if (bench.drag?.from && next && next.slice(0, 2).includes(bench.drag.from))
            aim = cap(next[bench.drag.from === next[0] ? 1 : 0]);
        }
        return true;
      },
      move(ray, e) {
        if (pressed) return true;
        if (gripped) {
          const p = slideAt(ray);
          if (p) {
            const pos = Math.max(0, Math.min(1, load.posFromLocalX(p.x + gripped.offset)));
            if (Math.abs(pos - load.pos) > 0.00001) { load.setPos(pos); changed(c); }
          }
          return true;
        }
        if (bench.drag) return wiring.move(ray, e);
        if (!e || near || bar.finished || ui?.step !== 1) { hideTip(); return false; }
        const hit = pick(ray);
        if (!hit) { hideTip(); return false; }
        canvas.style.cursor = hit.kind === 'slider' || hit.kind === 'post' ? 'grab' : 'pointer';
        tip.textContent = hit.hint();
        tip.style.transform = 'translate(' + Math.min(e.clientX + 12, innerWidth - 150) + 'px,' + (e.clientY + 16) + 'px)';
        tip.classList.add('on');
        return false;
      },
      up(ray, e) {
        if (pressed) {
          const { hit, x, y } = pressed;
          pressed = null;
          if (e?.type !== 'pointercancel' && Math.hypot(e.clientX - x, e.clientY - y) <= 6) {
            if (hit.kind === 'switch') { sw.toggle(); changed(c); } else inspect(hit.data);
          }
          return true;
        }
        if (gripped) { gripped = null; return true; }
        const d = bench.drag;
        if (!d) return false;
        if (d.from && d.moved && (!d.to || e?.type === 'pointercancel')) {
          const start = c.terminalWorld(d.from);
          const end = rayToLocal(ray, c.group, 'xz', start.y);
          if (end) returning = { start, end, t: 0 };
        }
        const handled = wiring.up(ray, e);
        if (returning) { changed(c); bench.temp.visible = true; }
        return handled;
      },
    };
    function reset() {
      stopReturn(); hideTip(); closeView();
      bench.drag = gripped = pressed = first = line = null;
      tested = mustOpen = zoomAxis = sw.closed = false;
      c.clearWires();
      connectFixed();
      load.setPos(0.38);
      points.length = 0; records.clear();
      for (const input of [readField, eField, rField]) input.value = '';
      result.textContent = '';
      graphActions.hidden = result.hidden = estimates.hidden = records.el.hidden = plot.el.hidden = true;
      diagramBox.hidden = fit.hidden = false;
      bar.undo('wire', 'power', 'measure', 'graph');
      drawPlot(); changed(c); ui.relock(); ui.fold(false);
    }
    const tap = (name, obj) => ({ name, mouse: { kind: 'tap', obj }, run() { if (obj === knob) { sw.toggle(); changed(c); } else inspect(A); } });
    const drag = (name, obj, to, run) => ({ name, mouse: { kind: 'drag', obj, to }, run });
    const setSlide = pos => drag('移动滑片', grip, () => load.group.position.clone().add(new THREE.Vector3((pos - 0.5) * load.L, grip.position.y, 0)),
      () => { load.setPos(pos); changed(c); });
    const qaRead = (m, wrong = false) => ({ name: wrong ? '错读大量程' : '登记' + meterName(m), run() {
      if (near !== m) throw new Error('未进入相应表盘');
      readField.value = (m.value * (wrong ? 5 : 1)).toFixed(m === A ? 3 : 2);
      readForm.querySelector('button').click();
      if ((near === m) !== wrong) throw new Error('读数反馈状态错误');
    } });
    return {
      group, pointer, reset, toggles: ['steps'],
      size: { w: 0.45, d: 0.32, h: 0.1 },
      view: { elev: 39, azim: 0, lookY: 0.30, margin: 1.04 },
      mount(panel) {
        ui = panel;
        Object.assign(panel.el.querySelector('.answer .src').style, { minHeight: '60px', paddingRight: '80px' });
        bar.attach({ ...panel, need: () => {} });
        document.body.append(tip);
        result.hidden = records.el.hidden = plot.el.hidden = true;
        ui.controls.append(readForm, diagramBox);
        ui.data.append(plot.el, graphActions, records.el);
        ui.notes.append(button('全部重做', reset));
        changed(c);
      },
      update(dt) {
        c.update(dt); bench.update(dt); bar.update(dt);
        if (returning) {
          returning.t += dt / 0.4;
          const { start, end, t } = returning;
          if (t >= 1) stopReturn();
          else bench._tempWire(start, end.clone().lerp(start, t * (2 - t)));
        }
        if (ui?.step !== 1 && tip.classList.contains('on')) hideTip();
      },
      debug: { bar, picks: { slider: grip }, qa: [
        ...links.map(([a, b]) => drag('连线 ' + a + ' → ' + b, post(a).pick, () => c.terminalWorld(b),
          () => { c.wire(a, b); c.solve(); changed(c); })),
        tap('小阻值试合', knob), tap('断开后调整', knob), setSlide(0.98), tap('大阻值合闸', knob),
        ...[0.98, 0.50, 0.23, 0.095].flatMap((pos, k) => [
          ...(k ? [setSlide(pos)] : []), tap('近看电流表', A.dial), ...(k ? [] : [qaRead(A, true)]), qaRead(A), qaRead(V),
        ]),
        tap('测完断电', knob),
        { name: '展开电压轴并作图', run() { axes.click(); fit.click(); if (!line || points.length !== 4) throw new Error('缺少读数或图线'); } },
        { name: '由纵截距和斜率求参数', run() {
          eField.value = line.e.toFixed(2); rField.value = line.r.toFixed(2);
          estimates.querySelector('button').click();
          if (!bar.finished || result.hidden) throw new Error('图线参数未核对');
        } },
      ] },
      dispose() { canvas.removeEventListener('pointerleave', hideTip); hideTip(); tip.remove(); bar.dispose(); },
    };
  },
};
