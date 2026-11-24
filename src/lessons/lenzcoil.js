// 选择性必修二，第 24–26 页，图 2.1-1。
import * as THREE from 'three';
import { lenzRig, COIL_X, COIL_BOTTOM } from './kit/lenzRig.js';
import { fluxLinkage, inductionStep, MAGNET_LENGTH, COIL_HEIGHT } from './kit/inductionCoil.js';
import { clamp, draggable } from './kit/interact.js';
import { qaFlow } from './kit/chemlesson.js';
import { buttons, h } from './kit/ui.js';

const UP = 0.101, TOP_STOP = 0.125, DOWN = 0.009;
const outside = COIL_HEIGHT + 0.012, inside = COIL_HEIGHT - 0.01;
const conditions = ['N 极插入', 'S 极插入', 'N 极抽出', 'S 极抽出'];
const currents = ['顺时针', '逆时针'], fields = ['向下', '向上'];
const shortStroke = '这次没有完成插入或抽出。让磁极越过线圈口再松手。';
const blocked = '磁体还在线圈里，不能翻转。先把它抽出线圈口。';
const calibration = '按图中接线，表针右偏对应俯视逆时针电流，左偏对应顺时针电流。';

// 留下运动时的偏向；这里和课本插图一样，只示意方向，不表示电流大小。
function dialSketch(sign) {
  const canvas = h('canvas', { width: 48, height: 29, role: 'img',
    'aria-label': sign > 0 ? '运动时表针右偏' : '运动时表针左偏', style: 'display:block;margin:auto;width:43px' });
  const c = canvas.getContext('2d');
  c.strokeStyle = '#756e60';
  c.beginPath(); c.arc(24, 27, 23, -2.38, -0.76); c.stroke();
  c.beginPath(); c.moveTo(24, 3); c.lineTo(24, 8); c.stroke();
  c.strokeStyle = '#ad392b'; c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(24, 26); c.lineTo(24 + sign * 13, 9); c.stroke();
  return h('img', { src: canvas.toDataURL(), alt: canvas.getAttribute('aria-label'),
    style: 'display:block;margin:auto;width:43px' });
}

export default {
  id: 'lenzcoil',
  fig: '图2.1-1',
  title: '探究影响感应电流方向的因素',
  stampText: '探究',
  predict: {
    q: '感应电流的方向与哪些因素有关？把 N 极和 S 极分别插入同一个闭合线圈，表针会怎样偏转？',
    options: ['两次偏向相反', '两次偏向相同', '只有一次会偏转'],
    answer: 0,
  },
  conclusion: {
    page: 30, rect: [216.66, 298.9, 537.63, 385.06],
    quote: '感应电流具有这样的方向，即感应电流的磁场总要阻碍引起感应电流的磁通量的变化。',
    why: '磁通量增加时，感应电流产生的磁场与原磁场方向相反；磁通量减小时，两者方向相同。同一磁极插入和抽出时，俯视线圈的电流方向相反。',
    src: '课本第 26 页 · 第二章 第1节 楞次定律',
  },
  create(ctx) {
    const rig = lenzRig(), root = new THREE.Group();
    root.add(rig.group);
    let ui, bottom, rotation, north, inCoil, flux, current, needle, lastTime, hand, settling;
    let records, sheet;
    const body = h('tbody');
    const feedback = h('p', { class: 'status', 'aria-live': 'polite' });
    function say(text) { feedback.textContent = text; }
    function fillDirection(row, kind, sign, select) {
      const record = records[row];
      if (!record || !select.value) return;
      const positive = sign > 0, field = kind === 'field';
      const expected = (field ? fields : currents)[Number(positive)];
      if (select.value !== expected) {
        select.value = '';
        say(field ? '右手四指沿' + record.current + '方向弯曲，拇指' + expected + '，这就是线圈内的磁场方向。'
          : '针尖在零线' + (positive ? '右' : '左') + '侧。按图中接线，俯视电流应为' + expected + '。');
        return;
      }
      record[kind] = expected;
      renderRow(row);
      if (field) {
        say(row < 2 ? '插入时磁通量增大，感应电流的磁场与原磁场反向。'
          : '抽出时磁通量减小，感应电流的磁场与原磁场同向。');
      } else {
        say('从线圈上方看，电流沿' + expected + '方向。用右手判断它产生的磁场。');
      }
    }
    function directionCell(i, kind, options, label) {
      const r = records[i];
      if (!r || (kind === 'field' && !r.current)) return '—';
      if (r[kind]) return r[kind];
      const select = h('select', { 'aria-label': conditions[i] + '的' + label,
        style: 'font:inherit;color:#244d71;background:#fffaf0;border:1px solid #b6b4a7;border-radius:4px;max-width:100%',
        onchange: () => fillDirection(i, kind, r.sign, select) },
        h('option', { value: '' }, '填写'), options.map(s => h('option', { value: s }, s)));
      return select;
    }
    function renderRow(i) {
      const r = records[i], tr = body.children[i];
      tr.textContent = '';
      const values = [conditions[i], r ? dialSketch(r.sign) : '—',
        r ? fields[i % 2] : '—', directionCell(i, 'current', currents, '俯视电流方向'),
        directionCell(i, 'field', fields, '感应磁场方向')];
      tr.append(...values.map(value => h('td', { style: 'height:34px;padding:2px 1px' }, value)));
    }
    function remember(entering, sign) {
      const i = (north ? 0 : 1) + (entering ? 0 : 2);
      if (!records[i]) {
        if (!records.some(Boolean)) ui.data.prepend(sheet);
        records[i] = { sign };
        renderRow(i);
        if (records.every(Boolean)) { ui.unlock(); ui.need(''); }
      }
      say(conditions[i] + '时表针' + (sign > 0 ? '右偏' : '左偏') + '，穿过线圈的磁通量' + (entering ? '增大。' : '减小。'));
    }
    function draw() {
      rig.pose(bottom, rotation);
      rig.pivot.rotation.z = -needle * 0.7;
    }
    // 拖动事件也推进仪表，快速越过线圈口时不丢失两帧之间的磁通变化。
    function sample(now) {
      const dt = Math.max(0.001, (now - lastTime) / 1000);
      const linked = fluxLinkage(bottom, true) * Math.cos(rotation);
      current = inductionStep(flux, linked, dt, true, current).current;
      const target = clamp(current / 0.00009, -1, 1);
      // 表针受惯性和阻尼影响，磁体停住后逐渐回零。
      const response = Math.abs(target) > Math.abs(needle) ? 0.055 : 0.17;
      needle += (target - needle) * -Math.expm1(-dt / response);
      lastTime = now; flux = linked;
      draw();
    }
    function settle(kind, to) {
      settling = { kind, from: kind === 'slide' ? bottom : rotation, to, time: performance.now() };
    }
    function reset() {
      hand = settling = null;
      bottom = UP; rotation = 0; north = true; inCoil = false;
      flux = fluxLinkage(UP, true); current = needle = 0; lastTime = performance.now();
      draw();
      records = conditions.map(() => null);
      body.textContent = '';
      conditions.forEach((_, i) => { body.append(h('tr')); renderRow(i); });
      if (sheet) ui.data.before(sheet);
      say('');
      ui?.relock();
      if (ui) { ui.fold(false); ctx.reframe(); }
    }
    const drag = {
      obj: rig.pick, plane: 'xy', keepOffset: true, anchor: rig.carrier,
      enabled: () => !settling,
      hint: () => ui?.step === 1 ? '拖磁体：上下移或横拖翻转' : '',
      onStart() {
        if (ui.step !== 1) ui.go(1);
        hand = { bottom, rotation, kind: '', crossed: false };
      },
      onDrag(p, start) {
        if (!hand || !start) return;
        const dx = p.x - COIL_X, dy = p.y - (COIL_BOTTOM + hand.bottom + MAGNET_LENGTH / 2);
        if (!hand.kind) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 0.0015) return;
          hand.kind = Math.abs(dx) > 1.35 * Math.abs(dy) ? 'flip' : 'slide';
          say('');
        }
        if (hand.kind === 'flip') {
          if (bottom < outside) { say(blocked); return; }
          rotation = hand.rotation + Math.PI * clamp(dx / 0.064, -1, 1);
          sample(performance.now());
          return;
        }
        bottom = clamp(hand.bottom + dy, DOWN, TOP_STOP);
        const previousFlux = flux;
        sample(performance.now());
        // 线圈口两侧各留一点余量；手在口沿抖动不会反复记行。
        if ((!inCoil && bottom <= inside) || (inCoil && bottom >= outside)) {
          inCoil = !inCoil;
          hand.crossed = true;
          remember(inCoil, Math.sign(previousFlux - flux));
        }
      },
      onEnd() {
        if (!hand) return;
        if (hand.kind === 'flip' && bottom >= outside) {
          const turn = Math.round((rotation - hand.rotation) / Math.PI);
          settle('flip', hand.rotation + turn * Math.PI);
          if (turn) north = !north;
          say(turn ? (north ? 'N' : 'S') + ' 极现在朝下，可以再次插入线圈。' : '磁体已转回原位。横拖到另一极朝下再松手，就能换极。');
        }
        if (hand.kind === 'slide' && !hand.crossed && Math.abs(bottom - hand.bottom) > 0.0001) {
          settle('slide', hand.bottom);
          say(shortStroke);
        }
        hand = null;
      },
    };
    const pointer = draggable(rig.group, [drag], { tip: ctx.tag('', 'pill') });
    reset();

    const target = (height, x = COIL_X) => new THREE.Vector3(x, COIL_BOTTOM + height + MAGNET_LENGTH / 2, 0);
    const move = (name, height, dx = 0) => ({ name, drag: rig.pick, to: target(height, COIL_X + dx), wait: 0.5 });
    const check = (ok, message) => { if (!ok) throw new Error(message); };
    function qaSelect(row, value) {
      const select = body.children[row].querySelector('select');
      check(select, '记录格没有可填选项');
      select.value = value;
      select.dispatchEvent(new Event('change'));
    }
    return {
      group: root, pointer, reset,
      size: { w: 0.33, d: 0.15, h: 0.22 }, view: { elev: 20, azim: 3, frameMargin: 1.10 },
      mount(panel) {
        ui = panel;
        ui.status('比较四种情况下的感应电流方向。上下拖磁体，让磁极越过线圈口；抽出后横拖，可以换极。');
        const headings = ['磁极运动', '表针示意', '原磁场', '俯视电流', '感应磁场'];
        sheet = h('table', { class: 'data', 'aria-label': '四种情况的实验记录', style: 'width:100%;table-layout:fixed;text-align:center' },
          h('thead', {}, h('tr', {}, headings.map(s => h('th', { style: 'padding:4px 1px' }, s)))), body);
        ui.controls.append(feedback);
        // 空白表只供预览；有观察后再放进会随关页保存的数据区。
        ui.data.before(sheet);
        ui.data.after(h('p', { class: 'note' }, calibration),
          buttons([{ text: '全部重做', ghost: true, onClick: reset }]).el);
        for (const select of ui.el.querySelectorAll('.prev-record select')) select.replaceWith('—');
        ui.el.querySelector('.answer').style.paddingBottom = '72px';
      },
      update() {
        const now = performance.now();
        if (settling) {
          const t = Math.min(1, (now - settling.time) / 380);
          const value = settling.from + (settling.to - settling.from) * t * t * (3 - 2 * t);
          if (settling.kind === 'flip') rotation = value;
          else bottom = value;
          if (t === 1) settling = null;
        }
        sample(now);
      },
      dispose() { pointer.dispose(); },
      debug: {
        get state() { return { bottom, north, inCoil, needle, records }; },
        qa: qaFlow(pointer, [
          move('在线圈口上方松手', UP - 0.02),
          { name: '短拖归位且没有记录', run() {
            check(bottom === UP && !records.some(Boolean) && feedback.textContent === shortStroke, '短拖未归位或被误记');
          } },
          move('N 极插入', DOWN),
          move('在线圈中尝试翻转', DOWN, 0.065),
          { name: '线圈挡住翻转', run() { check(north && feedback.textContent === blocked, '磁体在线圈中翻转'); } },
          move('N 极抽出', UP),
          move('翻转磁体', UP, 0.065),
          move('S 极插入', DOWN),
          move('S 极抽出', UP),
          { name: '核对四种方向和静止回零', run() {
            check(!north && !inCoil && Math.abs(needle) < 0.02, '磁体位置或回零异常');
            check(records.every((r, i) => r?.sign === [1, -1, -1, 1][i]), '记录与四次偏转不符');
            check(!ui.el.querySelector('.flap.locked'), '四次观察后结论未解锁');
          } },
          { name: '把 N 极插入的电流方向填反', run() {
            qaSelect(0, '顺时针');
            check(!records[0].current && feedback.textContent.includes('针尖在零线右侧'), '未指出误读的偏向');
          } },
          { name: '按四次观察填写电流与磁场', run() {
            for (const [i, positive] of [1, 0, 0, 1].entries()) {
              qaSelect(i, currents[positive]);
              qaSelect(i, fields[positive]);
              check(records[i].field === fields[positive], '未记下磁场方向');
            }
          } },
          { name: '对照课本结论', run() {
            ui.go(2);
            ui.el.querySelector('.flap-front').click();
            check(ui.el.querySelector('.flap.open .page-crop'), '未掀开课本原文');
          } },
          { name: '全部重做', run() {
            reset();
            check(north && bottom === UP && !records.some(Boolean) && ui.step === 0, '初始条件没有恢复');
            check(ui.el.querySelector('.flap.locked') && !ui.data.querySelector('tr'), '重做后仍有本轮记录');
          } },
        ]),
      },
    };
  },
};
