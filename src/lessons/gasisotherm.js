// 选择性必修第三册第 23–24 页，图 2.2-1。封闭同一柱空气，逐组测量，再换横轴检验。
import * as THREE from 'three';
import { openAir, movePiston, ROOM_T, MIN_LENGTH, MAX_LENGTH, AREA } from './kit/gasColumn.js';
import { gasColumnRig, ZERO_Y, STEM, DIAL_FRONT, CAP_HOME, SEAT } from './kit/gasColumnRig.js';
import { clamp, draggable } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { chart, table, buttons, h } from './kit/ui.js';
import { qaFlow } from './kit/chemlesson.js';

const initialLength = 0.032;
const areaCm2 = AREA * 10000;
const lengthError = 0.5, pressureError = 2.5;
const volumeError = lengthError * areaCm2 / 10;
const volumeAxis = { min: 0, max: 4.5, ticks: [0, 1, 2, 3, 4], label: 'V / cm³' };
const inverseAxis = { min: 0, max: 0.7, ticks: [0, 0.2, 0.4, 0.6], label: '(1/V) / cm⁻³' };
const goal = '同一团空气温度不变时，压强和体积有什么关系？';
const first = '把红褐色橡胶套拖到筒底开口，封住同一团空气。';

function referenceFor(data) {
  const ranges = data.map(({ v, p }) => [(v - volumeError) * (p - pressureError), (v + volumeError) * (p + pressureError)]);
  const lower = Math.max(...ranges.map(range => range[0])), upper = Math.min(...ranges.map(range => range[1]));
  const slope = (lower + upper) / 2;
  return { slope, count: ranges.filter(([low, high]) => low <= slope && slope <= high).length };
}

function predictionEvidence(data) {
  let pair, closest = Infinity;
  for (const small of data) for (const large of data) {
    const difference = Math.abs(large.v - 2 * small.v);
    if (large.v > small.v && difference <= 3 * volumeError && difference < closest) {
      pair = [large, small]; closest = difference;
    }
  }
  const reading = row => `${row.v.toFixed(2)} cm³、${row.p} kPa`;
  return pair ? `本轮实测：${reading(pair[0])} → ${reading(pair[1])}。` :
    '本轮没有体积约为二比一的一对读数。由等温反比关系推得：体积减半，压强变为原来的两倍。';
}

export default {
  id: 'gasisotherm',
  fig: '图2.2-1',
  title: '探究气体等温变化的规律',
  stampText: '探究',
  predict: {
    q: '同一团空气保持原来的温度，体积压到原来的一半，压强会怎样变？',
    options: ['变为原来的两倍', '保持不变', '变为原来的一半'],
    answer: 0,
  },
  conclusion: {
    page: 28, rect: [216.5, 486.49, 531.5, 583.92],
    quote: '英国科学家玻意耳和法国科学家马略特各自通过实验发现，一定质量的某种气体，在温度不变的情况下，压强p 与体积V 成反比……',
    why: '若 p–1/V 图上的测量点靠近同一条过原点的直线，就支持压强与体积成反比。',
    src: '课本第 24 页 · 第二章 第2节 气体的等温变化',
  },
  create(ctx) {
    const rig = gasColumnRig();
    const { group, holder, face, ruler, cap, grip, capPick } = rig;
    const data = [];
    let length = initialLength, air = openAir(length);
    let ui, target, view, returning, column = null, reference = null;
    let sealed = false, dragging = false, settled = true;
    let fraction = 0, inverse = false;
    const steps = [['seal', '封闭空气'], ['read', '测第一组'], ['vary', '改变体积'], ['graph', '换轴检验']];
    const bar = lessonBar({ ...ctx, group, back: leave,
      steps: steps.map(([id, title]) => ({ id, title, todo: title, target: () => ui?.step === 1 ? target : null })) });
    const rows = table(['柱长 / mm', 'V / cm³', 'p / kPa', '1/V / cm⁻³']);
    const calc = h('p', { class: 'note' });
    const field = h('input', { type: 'number', inputmode: 'decimal', step: 'any', required: true,
      style: 'width:5em;padding:.28em .4em;margin:0 .5em;font:inherit' });
    const label = h('span');
    const record = h('button', { type: 'submit', class: 'go', style: 'width:auto;margin:0;padding:.35em .8em' }, '记下');
    const form = h('form', { hidden: true, onsubmit: e => { e.preventDefault(); read(); } }, h('label', {}, label, field), record);
    const plot = chart({ x: volumeAxis, y: { min: 0, max: 300, ticks: [0, 100, 200, 300], label: 'p / kPa' }, height: 154 });
    const flip = buttons([{ text: '换成 p–1/V 图', onClick() {
      if (!bar.has('vary')) return;
      inverse = !inverse;
      choices.el.hidden = key.hidden = true;
      flip.btns[0].textContent = inverse ? '换回 p–V 图' : '换成 p–1/V 图';
      guide();
    } }]);
    const choices = buttons(['接近', '不接近'].map(text => ({ text, ghost: true, onClick() {
      if (!inverse || fraction !== 1 || reference) return;
      reference = referenceFor(data);
      choices.el.hidden = true;
      key.textContent = `你的判断：${text}。虚线：反比参考。`;
      key.hidden = false;
      bar.done('graph'); drawGraph(); guide();
    } })));
    const key = h('p', { class: 'note' });
    function evidence() {
      return `按尺、表各半小格估计，${data.length} 个点中有 ${reference.count} 个与参考线相符。` +
        (reference.count === data.length ? '这组读数支持反比关系。' : '有点偏离，先复核读数，再考虑其他关系。');
    }
    function drawGraph() {
      plot.x = fraction === 0 ? volumeAxis : fraction === 1 ? inverseAxis : { min: 0, max: 1, ticks: [], label: '' };
      plot.draw();
    }
    plot.extra = (g, X, Y) => {
      const k = fraction * fraction * (3 - 2 * fraction);
      const xAt = v => X(plot.x.max * ((1 - k) * v / volumeAxis.max + k / (v * inverseAxis.max)));
      if (bar.has('vary') && (fraction === 0 || (fraction === 1 && reference))) {
        g.save();
        g.beginPath();
        g.rect(X(0), Y(300), X(plot.x.max) - X(0), Y(0) - Y(300));
        g.clip();
        g.beginPath();
        g.strokeStyle = '#54808a';
        g.lineWidth = 2.5;
        if (fraction === 1) {
          g.setLineDash([8, 6]);
          g.moveTo(X(0), Y(0));
          g.lineTo(X(inverseAxis.max), Y(reference.slope * inverseAxis.max));
        } else {
          [...data].sort((left, right) => left.v - right.v).forEach((point, index) => {
            if (!index) g.moveTo(xAt(point.v), Y(point.p)); else g.lineTo(xAt(point.v), Y(point.p));
          });
        }
        g.stroke();
        g.restore();
      }
      g.fillStyle = '#224f72';
      for (const d of data) {
        g.beginPath(); g.arc(xAt(d.v), Y(d.p), 6.5, 0, 2 * Math.PI); g.fill();
      }
    };
    function say(text, obj = null) { target = obj; bar.say(text); }
    const stable = () => !dragging && Math.abs(air.temperature - ROOM_T) < 0.65;
    const repeat = () => data.some(d => Math.abs(d.length - length) < 0.001);
    function guide(prefix = '') {
      if (inverse && fraction === 1) return say(reference ? evidence() : '只看散点：它们接近同一条过原点的直线吗？');
      if (bar.has('vary')) return say(inverse ? '每个点保持原来的高度，横坐标换成体积的倒数。' :
        prefix + '点“换成 p–1/V 图”，检验压强与体积是否成反比。');
      if (!sealed) return say(prefix + first, cap);
      if (!stable()) return say('柱塞停住后表针还在动，空气正在恢复室温。等表针停稳再读。', face);
      if (view === 'dial') return say('沿针尖读绝对压强，每小格 5 kPa。');
      if (view === 'scale') return say('平视柱塞下沿的红边，读空气柱长，每小格 1 mm。');
      if (column !== null) return say(prefix + '点压力表，读同一体积下的压强。', face);
      if (repeat()) {
        if (data.length >= 4) return say('这些点挤在一起。把柱塞再推低或拉高，让体积范围更宽些。', grip);
        return say(prefix + '缓慢推拉棕色握柄，选不同体积，共测四组。', grip);
      }
      return say(prefix + '点筒旁刻度尺，量空气柱长。', ruler);
    }
    function leave() {
      if (view) ctx.back();
      view = null;
      bar.near(false);
      form.hidden = true;
      field.value = '';
      guide();
    }
    function inspect(which) {
      if (!sealed || !stable() || bar.has('vary')) return guide();
      if (repeat()) return guide('这个位置已记过。');
      if (which === 'dial' && column === null) return guide('先量柱长。');
      view = which;
      const scale = which === 'scale';
      const targetY = scale ? ZERO_Y + 0.026 : holder.position.y + STEM;
      const portrait = ctx.camera.aspect < 1;
      ui?.fold(false);
      ctx.look([scale ? 0.008 : 0, targetY, scale ? 0.00585 : DIAL_FRONT], [0, 0, 1],
        scale ? (portrait ? 0.14 : 0.18) : (portrait ? 0.115 : 0.15), leave);
      bar.near(true);
      label.textContent = scale ? '柱长 l / mm' : '压强 p / kPa';
      field.value = '';
      form.hidden = false;
      if (innerWidth <= 760) form.scrollIntoView({ block: 'nearest' });
      guide();
    }
    function read() {
      const v = field.valueAsNumber;
      if (!Number.isFinite(v) || !view || !stable()) return;
      if (view === 'scale') {
        const delta = v - length * 1000;
        if (Math.abs(delta) > lengthError) return say(`柱长读${delta > 0 ? '大' : '小'}了。看与红边平齐的刻度，每小格 1 mm。`);
        const cm = v / 10, volume = cm * areaCm2;
        const cmText = String(Number(cm.toPrecision(14)));
        column = { raw: field.value, volume, formula: `${field.value} mm = ${cmText} cm；V = Sl = ${areaCm2.toFixed(2)} cm² × ${cmText} cm ≈ ${volume.toFixed(2)} cm³` };
        calc.textContent = column.formula;
        leave(); guide('已由柱长算出体积。');
        return;
      }
      const delta = v - air.pressure / 1000;
      if (Math.abs(delta) > pressureError) return say(`压强读${delta > 0 ? '大' : '小'}了。从有数字的长刻线数到针尖，每小格 5 kPa。`);
      const p = Number(v.toFixed(1));
      const previous = data[data.length - 1];
      const volume = column.volume;
      data.push({ v: volume, p, length });
      rows.add([column.raw, volume.toFixed(2), String(p), (1 / volume).toFixed(3)]);
      calc.textContent = `${column.formula}　·　1/V ≈ ${(1 / volume).toFixed(3)} cm⁻³`;
      const compare = !previous ? '第一组读数落在图上了。' :
        `比上一组体积${volume > previous.v ? '大' : '小'}，压强${p === previous.p ? '读数相同' : p > previous.p ? '升高' : '降低'}。`;
      column = null;
      bar.done('read');
      const volumes = data.map(d => d.v);
      if (data.length >= 4 && Math.max(...volumes) - Math.min(...volumes) >= 1) {
        bar.done('vary');
        flip.el.hidden = false;
      }
      drawGraph(); leave(); guide(compare);
      if (innerWidth <= 760) plot.el.scrollIntoView({ block: 'start' });
    }
    function clearData() {
      data.length = 0;
      column = reference = null;
      choices.el.hidden = key.hidden = true;
      fraction = 0;
      inverse = false;
      rows.clear();
      calc.textContent = '';
      flip.el.hidden = true;
      flip.btns[0].textContent = '换成 p–1/V 图';
      bar.undo('seal', 'read', 'vary', 'graph');
      drawGraph();
    }
    function putCap(moved) {
      if (!moved) return;
      const destination = sealed ? CAP_HOME : SEAT;
      const aligned = Math.hypot(cap.position.x - SEAT.x, cap.position.z - SEAT.z) <= 0.0011;
      const seated = aligned && cap.position.y >= SEAT.y - 0.002 && cap.position.y <= SEAT.y + 0.0006;
      if (sealed ? cap.position.distanceTo(destination) > 0.008 : !seated) {
        returning = { from: cap.position.clone(), time: 0 };
        say(sealed ? '橡胶套仍封着筒口。' : '筒口还敞着。对准细管的下端再松手。', cap);
        return;
      }
      cap.position.copy(destination);
      sealed = !sealed;
      air = openAir(length);
      settled = true;
      if (sealed) {
        bar.done('seal'); guide('筒口已封住，空气的质量固定了。');
      } else {
        clearData(); guide('筒口已打开，本组记录已清空。');
      }
    }
    const desk = () => !view && !returning && !bar.has('vary') && ui?.step !== 2;
    const tip = ctx.tag('', 'pill');
    const pointer = draggable(group, [
      { obj: capPick, anchor: cap, keepOffset: true, enabled: desk,
        hint: () => sealed ? '拖：取下橡胶套' : '拖：套住筒底开口',
        onDrag(p) { cap.position.set(p.x, clamp(p.y, CAP_HOME.y, ZERO_Y + 0.008), 0); }, onEnd: putCap },
      { obj: grip, anchor: holder, keepOffset: true, enabled: desk, hint: '上下拖：推拉柱塞',
        onDrag(p) {
          const next = clamp(p.y - ZERO_Y, MIN_LENGTH, MAX_LENGTH);
          if (next === length) return;
          if (column) calc.textContent = '';
          length = next; dragging = true; column = null;
          rig.set(length, air.pressure);
        },
        onEnd(moved) {
          dragging = false;
          if (moved) guide(sealed ? '' : '空气通过开口进出，表针停在大气压附近。');
        } },
    ], { tip, taps: [
      { obj: ruler, enabled: desk, hint: '点一下：凑近读柱长', onTap: () => inspect('scale') },
      { obj: face, enabled: desk, hint: '点一下：凑近读压强', onTap: () => inspect('dial') },
    ] });
    const hideTip = () => tip.loc(group, 0, -9, 0);
    const stepBar = document.querySelector('.lbar');
    const mobileLayout = h('style', {}, `
      @media (max-width:760px) {
        body:not(.predicting):not(.hide-steps) #panel.gas-sheet {
          height:calc(52vh - var(--gas-steps, 76px)); bottom:calc(8px + var(--gas-steps, 76px));
        }
        body.lesson-on .lbar[data-gas-steps] { bottom:6px; }
      }
    `);
    const fitSteps = new ResizeObserver(() => ui.el.style.setProperty('--gas-steps', (stepBar.offsetHeight + 8) + 'px'));
    const canvas = document.getElementById('c');
    canvas.addEventListener('pointerleave', hideTip);
    function reset() {
      leave();
      length = initialLength; air = openAir(length);
      sealed = dragging = false; settled = true; returning = null;
      cap.position.copy(CAP_HOME); rig.set(length, air.pressure);
      clearData(); guide(); hideTip(); ui?.relock();
    }
    reset();
    function qaRead(name, which, value, wrong = false) {
      return { name, run() {
        if (view !== which || form.hidden) throw Error('读数框没有打开');
        field.value = String(typeof value === 'function' ? value() : value);
        record.click();
        if (Boolean(view) !== wrong) throw Error('交读数后的状态不符');
      } };
    }
    const measure = (i, l) => [
      ...(i ? [{ name: '推拉柱塞 ' + i, drag: grip, to: new THREE.Vector3(0, ZERO_Y + l, 0), wait: 14 }] : []),
      { name: '近看柱长 ' + i, tap: ruler },
      ...(!i ? [qaRead('把体积当作柱长', 'scale', 3.2, true)] : []),
      qaRead('记下柱长 ' + i, 'scale', () => (length * 1000).toFixed(1)),
      { name: '近看表盘 ' + i, tap: face },
      ...(!i ? [qaRead('错读压强', 'dial', 150, true)] : []),
      qaRead('记下压强 ' + i, 'dial', () => Math.round(air.pressure / 1000)),
    ];
    return {
      group: new THREE.Group().add(group), card: false, toggles: ['steps'], reset,
      size: { w: 0.125, d: 0.092, h: 0.165 }, view: { elev: 11, azim: 4, get frameMargin() { return innerWidth <= 760 ? 1.33 : 1.22; } },
      pointer: {
        items: () => pointer.items().filter(d => d.enabled()),
        down(ray, e) {
          const handled = pointer.down(ray, e);
          if (handled && ui?.step === 0) ui.go(1);
          return handled;
        },
        move: (ray, e) => ui?.step === 1 && pointer.move(ray, e),
        up: (ray, e) => pointer.up(ray, e),
      },
      mount(panel) {
        ui = panel;
        panel.el.classList.add('gas-sheet');
        stepBar.dataset.gasSteps = '';
        panel.el.append(mobileLayout);
        fitSteps.observe(stepBar);
        bar.attach({ need: () => panel.need(''), unlock: () => { panel.unlock(); panel.need(''); } });
        panel.status('<b>' + goal + '</b><br>筒底对准零刻度。S = 1.00 cm²，V = Sl。');
        panel.controls.append(form, calc);
        panel.data.append(plot.el, key, choices.el, flip.el, rows.el);
        panel.notes.append(h('p', { class: 'note' }, '模型取室温 20 ℃，忽略接管容积。'),
          buttons([{ text: '全部重做', onClick: reset }]).el);
        panel.el.querySelector('.flap-front').addEventListener('click', () => {
          const flap = panel.el.querySelector('.flap.open');
          if (!flap) return;
          const guess = ui.prediction();
          const prefix = guess == null ? '' : `你的预测：“${panel.el.querySelectorAll('.opt')[guess].textContent}”。`;
          flap.querySelector('.verdict').textContent = prefix + predictionEvidence(data);
          flap.style.minHeight = `${flap.querySelector('.answer').offsetHeight}px`;
        });
        const src = panel.el.querySelector('.answer .src');
        src.style.minHeight = '64px'; src.style.paddingRight = '76px';
        guide();
      },
      update(dt) {
        dt *= bar.update(dt);
        if (returning) {
          returning.time += dt;
          const u = Math.min(1, returning.time / 0.4);
          cap.position.lerpVectors(returning.from, sealed ? SEAT : CAP_HOME, u * (2 - u));
          if (u === 1) returning = null;
        }
        air = movePiston(air, length, dt, sealed);
        rig.set(length, air.pressure);
        const ready = stable();
        if (ready !== settled) {
          settled = ready;
          guide(ready && sealed ? '表针已稳，可以按同一温度比较。' : '');
        }
        const end = inverse ? 1 : 0;
        if (fraction !== end) {
          fraction += Math.sign(end - fraction) * Math.min(Math.abs(end - fraction), dt / 0.95);
          drawGraph();
          if (fraction === 1) {
            choices.el.hidden = !!reference; key.hidden = !reference; guide();
          }
        }
      },
      debug: { bar, qa: qaFlow(pointer, [
        { name: '橡胶套偏开七毫米', drag: capPick, to: SEAT.clone().add(new THREE.Vector3(0.007, 0, 0)) },
        { name: '橡胶套插得太浅', drag: capPick, to: SEAT.clone().add(new THREE.Vector3(0, -0.004, 0)) },
        { name: '错放后仍敞口', run() { if (sealed || cap.position.distanceTo(CAP_HOME) > 0.0001) throw Error('橡胶套未归位'); } },
        { name: '封住筒口', drag: capPick, to: SEAT },
        ...[initialLength, 0.024, 0.016, 0.04].flatMap((l, i) => measure(i, l)),
        { name: '换横轴', run: () => flip.btns[0].click(), wait: 2 },
        { name: '观察散点后作判断', run() {
          if (bar.finished || choices.el.hidden || !key.hidden) throw Error('判断前已显示结果');
          choices.btns[1].click();
          if (!reference || reference.count !== data.length || key.hidden) throw Error('未按读数检验');
        } },
        { name: '掀开课本结论', run() {
          if (!bar.finished || data.length !== 4 || fraction !== 1) throw Error('实测点或换轴未完成');
          ui.go(2);
          ui.el.querySelector('.flap-front').click();
          if (!ui.el.querySelector('.flap.open')) throw Error('结论未打开');
        } },
      ]) },
      dispose() {
        fitSteps.disconnect();
        ui?.el.classList.remove('gas-sheet');
        ui?.el.style.removeProperty('--gas-steps');
        mobileLayout.remove();
        canvas.removeEventListener('pointerleave', hideTip);
        pointer.dispose(); bar.dispose();
      },
    };
  },
};
