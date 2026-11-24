// 图 3.3-2 的实验草图。原线圈接交流电源，电压表每次只跨接一个绕组。
import { h, buttons, table, chart } from './ui.js';
import { TAP_TURNS } from './transformer.js';

export function transformerNotebook(panel, { plan, confirm, submit, reset }) {
  const diagram = h('canvas', {
    width: 320,
    height: 124,
    style: 'width:100%;height:auto',
    'aria-label': '实验电路图',
  });
  const note = { class: 'note', style: 'color:#514a3f;font-size:14px' };
  const caption = h('div', note);
  const goal = h('div', note);
  function sketch(leads, source, probes) {
    const g = diagram.getContext('2d');
    const left = leads[0].side ?? leads[1].side ?? 0;
    const coilX = (side) => side === left ? 130 : 190;
    const tapY = (turns) => 99 - 18 * turns / 100;
    g.clearRect(0, 0, 320, 124);
    g.lineWidth = 1.7;
    g.strokeStyle = '#3b464a';
    g.fillStyle = '#30474c';
    g.textAlign = 'center';
    function line(points) {
      g.beginPath();
      points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
    }
    for (const side of [left, 1 - left]) {
      const x = coilX(side), dir = side === left ? 1 : -1;
      const turns = side === left ? source?.n : probes?.side === side ? probes.n : null;
      const role = source ? (side === left ? '原线圈' : '副线圈') : '线圈';
      g.font = '14px sans-serif';
      g.fillText(role + (turns ? ' ' + turns + ' 匝' : ''), side === left ? 85 : 235, 12);
      g.beginPath();
      g.moveTo(x, 27);
      for (let y = 27; y < 99; y += 9) g.bezierCurveTo(x + 12 * dir, y, x + 12 * dir, y + 9, x, y + 9);
      g.stroke();
      g.font = '11px sans-serif';
      for (const n of TAP_TURNS) {
        const y = tapY(n);
        line([[x, y], [x - 10 * dir, y]]);
        g.fillText(String(n), x - 16 * dir, y - 3);
      }
    }
    for (const x of [156, 164]) line([[x, 25], [x, 101]]);
    function device(pair, symbol, outer) {
      const pins = pair.filter((l) => l.side != null).sort((a, b) => b.turns - a.turns);
      const side = outer ? left : pins[0]?.side ?? 1 - left;
      const x = side === left ? (outer ? 26 : 70) : 267;
      const split = pins.length === 2 && pins[0].side !== pins[1].side;
      const y = pins.length === 2 && !split ? (tapY(pins[0].turns) + tapY(pins[1].turns)) / 2 : 64;
      pins.forEach((l, i) => {
        const end = coilX(l.side);
        const pin = tapY(l.turns);
        if (l.side === side) {
          const sign = pin < y ? -1 : 1;
          line([[x, y + sign * 8], [x, pin], [end, pin]]);
        } else {
          const route = outer ? 119 : 110, bend = end + (l.side === left ? -34 : 34);
          const sign = tapY(pins[1 - i].turns) < y ? 1 : -1;
          const bypass = x + (side === left ? -12 : 12);
          line([[x, y + sign * 8], [bypass, y + sign * 8], [bypass, route], [bend, route], [bend, pin], [end, pin]]);
        }
      });
      g.beginPath();
      g.arc(x, y, 8, 0, Math.PI * 2);
      g.stroke();
      g.font = 'bold 13px sans-serif';
      g.fillText(symbol, x, y + 4);
      if (outer) {
        g.font = '13px sans-serif';
        g.fillText('3 V ~', x, 114);
      }
    }
    device(leads.slice(0, 2), '∿', true);
    device(leads.slice(2), 'V', false);
  }
  function preview(n) {
    const leads = [0, 200, 0, n].map((turns, i) => ({ side: i < 2 ? 0 : 1, turns }));
    sketch(leads, { n: 200 }, { side: 1, n });
    caption.textContent = '方案电路图';
  }
  const first = h(
    'select',
    { 'aria-label': '首组副线圈匝数' },
    [100, 200, 400].map((n) => h('option', { value: n }, n + ' 匝')),
  );
  const estimate = h('input', {
    type: 'number',
    step: 'any',
    min: 0,
    placeholder: '选填',
    style: 'width:5em',
    'aria-label': '预计副电压',
  });
  const method = h('input', { placeholder: '选填', 'aria-label': '我的测量步骤', style: 'width:10em' });
  const relation = h(
    'label',
    {},
    '我的关系式 ',
    h('input', { placeholder: '选填', 'aria-label': '我的关系式', style: 'width:10em' }),
  );
  const planner = h(
    'div',
    {},
    h('p', note, '两轮都保持原电压约 3 V。第一轮固定原线圈 200 匝，改变副线圈匝数。第二轮固定副线圈 200 匝，改变原线圈匝数。'),
    h('p', {}, h('label', {}, '我的测量步骤 ', method)),
    h('p', {}, h('label', {}, '首组副线圈 ', first), '　', h('label', {}, '预计 ', estimate, ' V')),
    buttons([{ text: '记下方案', onClick: () => plan(+first.value) }]).el,
  );
  first.onchange = () => preview(+first.value);
  const review = buttons([{ text: '接线已核对', onClick: confirm }]);
  const value = h('input', {
    type: 'number',
    step: 'any',
    inputmode: 'decimal',
    style: 'width:5em',
    'aria-label': '电压读数',
  });
  const label = h('span');
  const meterNote = h('p', note);
  const form = h(
    'form',
    {
      onsubmit: (e) => {
        e.preventDefault();
        submit(value.valueAsNumber);
      },
    },
    h('label', {}, label, ' ', value, ' V　'),
    h('button', { class: 'go', type: 'submit' }, '记下读数'),
  );
  const safety = h(
    'p',
    { class: 'note', style: 'color:#514a3f;font-size:14px' },
    '只用不超过 12 V 的低压交流电源。通电时，手不能碰裸线和接线柱。',
  );
  const result = h('p', { class: 'note', 'aria-live': 'polite' });
  const record = table(['原匝数', '原电压/V', '副匝数', '副电压/V']);
  const dots = [];
  const graph = chart({
    x: { label: 'n₂/n₁', min: 0, max: 2.25, ticks: [0, 0.5, 1, 1.5, 2] },
    y: { label: 'U₂/U₁', min: 0, max: 2.25, ticks: [0, 0.5, 1, 1.5, 2] },
    height: 148,
    series: [{ points: dots, dots: true, line: false, color: '#28656f' }],
  });
  const forecast = h('p', { class: 'note' });
  panel.controls.append(caption, diagram, goal, planner, forecast, review.el, meterNote, form, h('div', {}, safety));
  panel.data.append(record.el, result, graph.el, relation);
  panel.notes.append(buttons([{ text: '全部重做', onClick: reset }]).el);
  function clear() {
    first.value = '100';
    value.value = estimate.value = '';
    forecast.textContent = result.textContent = '';
    method.value = relation.querySelector('input').value = '';
    dots.length = 0;
    record.clear();
    graph.el.hidden = true;
    goal.hidden = true;
    preview(100);
  }
  clear();
  return {
    first,
    value,
    form,
    review,
    planner,
    result,
    record,
    diagram(leads, source, probes, target) {
      caption.textContent = '当前接线';
      goal.hidden = !target;
      if (target) goal.textContent = '本组目标：原 ' + target[0] + ' 匝，副 ' + target[1] + ' 匝。';
      sketch(leads, source, probes);
    },
    clear,
    planned(n) {
      forecast.textContent = [
        method.value,
        estimate.value === '' ? '' : '首组预测：副线圈 ' + n + ' 匝，约 ' + estimate.value + ' V。',
      ]
        .filter(Boolean)
        .join('　');
    },
    fields({ planning, check, reading, primary, finished, range, digits }) {
      relation.hidden = !finished;
      planner.hidden = !planning;
      review.el.hidden = !check;
      form.hidden = !reading;
      meterNote.hidden = !range;
      if (range) meterNote.textContent = '模拟交流有效值 · ' + range + ' V 挡。黑色内圈示数 × ' +
        range / 10 + ' 即为电压（V），每小格 ' + range / 50 + ' V，估读到 ' + 10 ** -digits + ' V。';
      label.textContent = primary ? '原线圈读数' : '副线圈读数';
      if (!reading) value.value = '';
    },
    add(n1, u1, n2, u2) {
      record.add([String(n1), String(u1), String(n2), String(u2)]);
      dots.push([n2 / n1, u2 / u1]);
      graph.el.hidden = false;
      graph.draw();
      result.textContent =
        '匝数比 ' +
        n2 +
        ' / ' +
        n1 +
        ' = ' +
        n2 / n1 +
        '，电压比 ' +
        u2 +
        ' / ' +
        u1 +
        ' ≈ ' +
        (u2 / u1).toFixed(2) +
        '。';
    },
  };
}
