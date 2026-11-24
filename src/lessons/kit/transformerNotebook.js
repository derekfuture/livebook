// 图 3.3-2 的实验草图。原线圈接交流电源，电压表每次只跨接一个绕组。
import { h, buttons, table, chart } from './ui.js';

export function transformerNotebook(panel, { plan, confirm, submit, reset }) {
  const diagram = h('canvas', {
    width: 320,
    height: 98,
    style: 'width:100%;height:auto',
    'aria-label': '实验电路图',
  });
  function sketch(n1, n2, primary) {
    const g = diagram.getContext('2d');
    g.clearRect(0, 0, 320, 98);
    g.lineWidth = 1.7;
    g.strokeStyle = '#3b464a';
    g.fillStyle = '#30474c';
    function line(points) {
      g.beginPath();
      points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
    }
    function symbol(x, text) {
      g.beginPath();
      g.arc(x, 51, 10, 0, Math.PI * 2);
      g.stroke();
      g.font = 'bold 15px sans-serif';
      g.fillText(text, x, 56);
    }
    g.textAlign = 'center';
    g.font = '14px sans-serif';
    g.fillText('原线圈 ' + n1 + ' 匝', 92, 16);
    g.fillText('副线圈 ' + n2 + ' 匝', 222, 16);
    line([
      [35, 41],
      [35, 28],
      [143, 28],
      [143, 31],
    ]);
    line([
      [143, 71],
      [143, 76],
      [35, 76],
      [35, 61],
    ]);
    for (const [x, dir] of [
      [143, 1],
      [169, -1],
    ]) {
      g.beginPath();
      g.moveTo(x, 31);
      for (let y = 31; y < 71; y += 10) g.bezierCurveTo(x + 10 * dir, y, x + 10 * dir, y + 10, x, y + 10);
      g.stroke();
    }
    line([
      [154, 26],
      [154, 77],
    ]);
    line([
      [158, 26],
      [158, 77],
    ]);
    line([
      [169, 31],
      [169, 28],
      [246, 28],
    ]);
    line([
      [169, 71],
      [169, 76],
      [246, 76],
    ]);
    const x = primary ? 98 : 246;
    line([
      [x, 28],
      [x, 41],
    ]);
    line([
      [x, 61],
      [x, 76],
    ]);
    symbol(35, '∿');
    symbol(x, 'V');
    g.font = '13px sans-serif';
    g.fillText('3 V ~', 35, 94);
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
    h('p', { class: 'note' }, '先固定原线圈匝数，再固定副线圈匝数。每轮只改一个量。'),
    h('p', {}, h('label', {}, '我的测量步骤 ', method)),
    h('p', {}, h('label', {}, '首组副线圈 ', first), '　', h('label', {}, '预计 ', estimate, ' V')),
    buttons([{ text: '记下方案', onClick: () => plan(+first.value) }]).el,
  );
  first.onchange = () => sketch(200, +first.value, false);
  const review = buttons([{ text: '接线已核对', onClick: confirm }]);
  const value = h('input', {
    type: 'number',
    step: 'any',
    inputmode: 'decimal',
    style: 'width:5em',
    'aria-label': '电压读数',
  });
  const label = h('span');
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
  panel.controls.append(diagram, planner, forecast, review.el, form, h('div', {}, safety));
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
    sketch(200, 100, false);
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
    sketch,
    clear,
    planned(n) {
      forecast.textContent = [
        method.value,
        estimate.value === '' ? '' : '首组预测：副线圈 ' + n + ' 匝，约 ' + estimate.value + ' V。',
      ]
        .filter(Boolean)
        .join('　');
    },
    fields({ planning, check, reading, primary, finished, range }) {
      relation.hidden = !finished;
      planner.hidden = !planning;
      review.el.hidden = !check;
      form.hidden = !reading;
      label.textContent = (primary ? '原线圈读数' : '副线圈读数') + (range ? '（' + range + ' V 挡）' : '');
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
