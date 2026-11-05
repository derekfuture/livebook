import { PERIOD, centers } from './motion.js';
import './reader.css';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const button = (text) => Object.assign(document.createElement('button'), { type: 'button', textContent: text });

// 整条纸带选起点，放大镜下用两条游标量相隔十个打点间隔的距离。
export function tapeReader(onRecord, status) {
  const el = document.createElement('section');
  el.className = 'tape-reader';
  el.hidden = true;
  el.innerHTML =
    '<h4>纸带测量</h4><label>实验记录 <select></select></label><p class="tape-prompt"></p><canvas class="whole-tape" height="68" aria-label="点纸带选计时起点"></canvas><div class="tape-nav"></div><canvas class="detail-tape" height="108" aria-label="把两条游标分别拖到左右目标点"></canvas><div class="tape-values"></div>';
  const select = el.querySelector('select'),
    [whole, detail] = el.querySelectorAll('canvas'),
    prompt = el.querySelector('p');
  const prev = button('上一点'),
    next = button('下一点'),
    stamp = button('把测量点记入图表');
  const label = document.createElement('span');
  el.querySelector('.tape-nav').append(prev, label, next);
  const inputs = ['左游标', '右游标'].map((name) => {
    const node = document.createElement('label');
    node.textContent = name;
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.1';
    input.setAttribute('aria-label', name + '（mm）');
    node.append(input, ' mm');
    el.querySelector('.tape-values').append(node);
    return input;
  });
  el.append(stamp);
  const sheets = [];
  let sheet = null,
    origin = 0,
    slot = 0,
    indices = [],
    low = 0,
    high = 1,
    dragging = -1;
  const t = () => sheet.run.marks;
  const xMM = (i) => t()[i].x * 1000;
  function context(canvas) {
    const w = Math.max(250, canvas.getBoundingClientRect().width || 300),
      h = canvas === whole ? 68 : 108;
    const d = Math.min(devicePixelRatio, 2);
    if (canvas.width !== Math.round(w * d) || canvas.height !== Math.round(h * d)) {
      canvas.width = Math.round(w * d);
      canvas.height = Math.round(h * d);
    }
    const g = canvas.getContext('2d');
    g.setTransform(d, 0, 0, d, 0, 0);
    g.clearRect(0, 0, w, h);
    return { g, w, h };
  }
  function render() {
    if (!sheet || el.hidden) return;
    const { g, w } = context(whole);
    g.fillStyle = '#f4e8c9';
    g.fillRect(0, 12, w, 38);
    const span = Math.max(1, xMM(t().length - 1) - xMM(0));
    const map = (i) => 12 + ((xMM(i) - xMM(0)) * (w - 24)) / span;
    for (let i = 0; i < t().length; i++) {
      g.fillStyle = i === origin ? '#b34627' : '#364542';
      g.beginPath();
      g.arc(map(i), 31, i === origin ? 3 : 1.4, 0, 7);
      g.fill();
    }
    g.fillStyle = '#94502c';
    g.font = '11px sans-serif';
    g.fillText('0 s', clamp(map(origin) - 7, 1, w - 22), 62);
    const c = indices[slot];
    prev.disabled = slot === 0;
    next.disabled = slot === indices.length - 1;
    label.textContent = ((c - origin) * PERIOD).toFixed(2) + ' s';
    const box = context(detail),
      ctx = box.g,
      W = box.w;
    const px = (mm) => 12 + ((mm - low) / (high - low)) * (W - 24);
    ctx.fillStyle = '#f7efd9';
    ctx.fillRect(0, 0, W, 54);
    ctx.fillStyle = '#e8d3a3';
    ctx.fillRect(0, 55, W, 53);
    const base = xMM(origin);
    for (let i = c - 5; i <= c + 5; i++) {
      const x = px(xMM(i) - base);
      ctx.fillStyle = i === c ? '#366a70' : '#313f44';
      ctx.beginPath();
      ctx.arc(x, 33, 2.3, 0, 7);
      ctx.fill();
      if (i !== c && i % 5 === origin % 5) {
        ctx.font = '12px sans-serif';
        ctx.fillText(i < c ? 'A' : 'B', x - 4, 18);
      }
    }
    ctx.fillStyle = '#61563f';
    ctx.font = '10px sans-serif';
    const tick = 1;
    for (let mm = Math.ceil(low / tick) * tick; mm <= high; mm += tick) {
      const x = px(mm);
      ctx.fillRect(x, 55, 1, mm % 10 === 0 ? 15 : mm % 5 === 0 ? 10 : 5);
      if (mm % 10 === 0) ctx.fillText(String(mm), x - 6, 85);
    }
    ctx.fillText('mm', W - 24, 99);
    for (const [k, input] of inputs.entries()) {
      const x = px(Number(input.value));
      ctx.fillStyle = k ? '#b64c28' : '#176e74';
      ctx.fillRect(x - 1, 21, 2, 57);
      ctx.fillRect(x - 7, 92, 14, 5);
    }
    stamp.disabled = sheet.used.has(c) || !!sheet.complete;
    stamp.textContent = sheet.used.has(c) ? '这个点已记录' : sheet.complete ? '本条加速度已记录' : '把测量点记入图表';
  }
  function aim() {
    const c = indices[slot],
      base = xMM(origin),
      left = xMM(c - 5) - base,
      right = xMM(c + 5) - base;
    const margin = Math.max(4, (right - left) * 0.18);
    low = Math.floor(left - margin);
    high = Math.ceil(right + margin);
    inputs.forEach((inp, k) => {
      inp.min = low;
      inp.max = high;
      inp.disabled = sheet.used.has(c);
      inp.value = (sheet.used.get(c)?.[k] ?? (k ? high - 1 : low + 1)).toFixed(1);
    });
    prompt.textContent = sheet.used.size
      ? '对准 A、B 两点后记录，换计数点再量。'
      : '可点上方纸带选起点；在下方把游标拖到 A、B 两点。';
    render();
  }
  function choose(i) {
    sheet = sheets[i];
    select.value = String(i);
    origin = sheet.origin;
    indices = centers(t(), origin);
    slot = 0;
    aim();
  }
  select.onchange = () => choose(+select.value);
  whole.onpointerdown = (e) => {
    if (sheet.used.size) {
      status('这条纸带已经记过点，保留原来的计时起点。');
      return;
    }
    const rect = whole.getBoundingClientRect(),
      u = clamp((e.clientX - rect.left - 12) / (rect.width - 24), 0, 1);
    const target = xMM(0) + u * (xMM(t().length - 1) - xMM(0));
    let nearest = 0;
    for (let i = 1; i < t().length; i++) if (Math.abs(xMM(i) - target) < Math.abs(xMM(nearest) - target)) nearest = i;
    const valid = centers(t(), nearest);
    if (!valid.length) {
      status('这个起点之后没有连续的十个间隔；往纸带左边选。');
      return;
    }
    origin = sheet.origin = nearest;
    indices = valid;
    slot = 0;
    aim();
  };
  prev.onclick = () => {
    slot--;
    aim();
  };
  next.onclick = () => {
    slot++;
    aim();
  };
  inputs.forEach((inp) => (inp.oninput = render));
  function mmAt(e) {
    const r = detail.getBoundingClientRect();
    return clamp(low + ((e.clientX - r.left - 12) / (r.width - 24)) * (high - low), low, high);
  }
  detail.onpointerdown = (e) => {
    if (sheet.used.has(indices[slot])) return;
    const mm = mmAt(e);
    dragging = Math.abs(mm - Number(inputs[0].value)) <= Math.abs(mm - Number(inputs[1].value)) ? 0 : 1;
    detail.setPointerCapture(e.pointerId);
    inputs[dragging].value = mm.toFixed(1);
    render();
  };
  detail.onpointermove = (e) => {
    if (dragging >= 0) {
      inputs[dragging].value = mmAt(e).toFixed(1);
      render();
    }
  };
  detail.onpointerup = detail.onpointercancel = () => (dragging = -1);
  stamp.onclick = () => {
    const c = indices[slot],
      base = xMM(origin);
    const [a, b] = inputs.map((i) => i.valueAsNumber);
    if (
      !Number.isFinite(a + b) ||
      Math.abs(a - (xMM(c - 5) - base)) > 1 ||
      Math.abs(b - (xMM(c + 5) - base)) > 1 ||
      b <= a
    ) {
      status('把左、右游标分别对准 A、B 的点心。尺上每小格 1 mm。');
      return;
    }
    sheet.used.set(c, [a, b]);
    onRecord(sheet, (c - origin) * PERIOD, (b - a) / 1000 / (10 * PERIOD), a, b);
    render();
  };
  const observer = new ResizeObserver(render);
  observer.observe(el);
  return {
    el,
    add(run, trial) {
      const first = run.marks.findIndex((_, i) => centers(run.marks, i).length);
      if (first < 0) return false;
      const sheet = { run, trial, origin: first, used: new Map(), points: [] };
      sheets.push(sheet);
      select.add(new Option('第 ' + trial + ' 条 · ' + run.load * 1000 + ' g', String(sheets.length - 1)));
      el.hidden = false;
      choose(sheets.length - 1);
      return true;
    },
    clear() {
      sheet = null;
      sheets.length = 0;
      select.replaceChildren();
      el.hidden = true;
    },
    dispose() {
      observer.disconnect();
    },
  };
}
