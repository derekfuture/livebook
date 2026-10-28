// 实验面板里常用的控件。每个函数返回 { el, ... }，el 直接 append 到 ui.controls / ui.data 里。
import { h } from '../../ui/Panel.js';

export { h };

/** 一排选项按钮。options: [{ label, value? }] 或字符串；onChange(value, index)。 */
export function seg(label, options, onChange, { value = 0 } = {}) {
  const opts = options.map((o) => (typeof o === 'string' ? { label: o, value: o } : { value: o.label, ...o }));
  let cur = value;
  const btns = opts.map((o, i) => h('button', { onclick: () => api.set(i, true) }, o.label));
  const api = {
    el: h('div', { class: 'ctl' }, label ? h('div', { class: 'ctl-label' }, label) : null, h('div', { class: 'seg' }, btns)),
    get index() { return cur; },
    get value() { return opts[cur].value; },
    set(i, fire = false) {
      cur = i;
      if (i < 0) { btns.forEach((b) => b.classList.remove('on')); return; }
      btns.forEach((b, k) => b.classList.toggle('on', k === i));
      if (fire) onChange?.(opts[i].value, i);
    },
    tick(i, on = true) {
      btns[i].innerHTML = opts[i].label + (on ? '<span class="tick">✓</span>' : '');
    },
    disable(i, on = true) { btns[i].disabled = on; },
  };
  api.set(value);
  return api;
}

/** 滑块。fmt(v) 返回显示文字。 */
export function slider(label, { min, max, step = 1, value = min, fmt = (v) => String(v), onInput }) {
  const out = h('output');
  const input = h('input', { type: 'range', min, max, step, value });
  const api = {
    el: h('div', { class: 'ctl' }, h('div', { class: 'ctl-label' }, label, out), input),
    input,
    get value() { return Number(input.value); },
    set(v, fire = false) { input.value = v; out.textContent = fmt(Number(input.value)); if (fire) onInput?.(Number(input.value)); },
  };
  input.oninput = () => { out.textContent = fmt(Number(input.value)); onInput?.(Number(input.value)); };
  api.set(value);
  return api;
}

/** 一排按钮。items: [{ text, ghost?, onClick }] */
export function buttons(items) {
  const btns = items.map((it) => h('button', { class: `go ${it.ghost ? 'ghost' : ''}`, onclick: it.onClick }, it.text));
  return { el: h('div', { class: 'btn-row', style: 'margin-bottom:12px' }, btns), btns };
}

/** 读数卡片。items: [{ key, label, unit?, span? }]；set(key, 数值或文字)。 */
/**
 * 读数卡片。items: [{ key, label, unit?, span?, secret? }]
 * secret：这是学生要自己从器材上读出来的量——默认不显示数字，只写“看器材读”，旁边一个小“偷看”按钮作为求助；
 * 学生把这个量读对、记录之后，实验调用 reveal(key) 打开它。
 */
export function readout(items) {
  const cells = {};
  const peekBtn = (key) => h('button', { class: 'peek', title: '先自己读，实在读不出再看', onclick: () => { api.reveal(key); } }, '偷看');
  const el = h('div', { class: 'readout' }, items.map((it) => {
    const c = cells[it.key] = { b: h('b'), unit: it.unit || '', secret: !!it.secret, hint: typeof it.secret === 'string' ? it.secret : '看器材读', open: !it.secret, shownAt: null, last: null };
    c.peek = it.secret ? peekBtn(it.key) : null;
    c.label = h('span', { html: it.label }, c.peek);
    return h('div', { style: it.span ? 'grid-column: span 2' : '' }, c.label, c.b);
  }));
  const same = (a, b) => (typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 1e-6 + Math.abs(b) * 0.002 : a === b);
  const api = {
    el,
    set(key, v, digits = 2) {
      const c = cells[key];
      c.last = v; c.digits = digits;
      // 学生要自己读的量：只在读对 / 偷看的那一刻打开；器材一变（读数变了），就又藏起来
      if (c.secret && c.open && c.shownAt !== null && !same(v, c.shownAt)) { c.open = false; c.shownAt = null; if (!c.peek.parentNode) c.label.append(c.peek); }
      let html;
      if (!c.open) html = `<small class="readself">${c.hint}</small>`;
      else {
        const text = typeof v === 'number' ? (Number.isFinite(v) ? v.toFixed(digits) : '—') : (v ?? '—');
        html = c.unit && typeof v === 'number' && Number.isFinite(v) ? `${text}<i>${c.unit}</i>` : text;
      }
      if (c.b._h !== html) { c.b.innerHTML = html; c.b._h = html; }
    },
    reveal(key) { const c = cells[key]; if (!c || !c.secret) return; c.open = true; c.shownAt = c.last; c.peek.remove(); api.set(key, c.last ?? '—', c.digits); },
    isOpen: (key) => cells[key]?.open,
  };
  return api;
}

/** 数据表。headers 支持 html。add(cells) 返回行号。 */
export function table(headers, { note } = {}) {
  const tbody = h('tbody');
  const rows = [];
  const el = h('div', {},
    h('table', { class: 'data' }, h('thead', {}, h('tr', {}, headers.map((t) => h('th', { html: t })))), tbody),
    note ? h('p', { class: 'note', html: note }) : null);
  return {
    el, rows,
    add(cells, { highlight = true } = {}) {
      rows.push(cells);
      tbody.append(h('tr', { class: highlight ? 'new' : '' }, cells.map((c) => h('td', { html: typeof c === 'number' ? fmtNum(c) : String(c) }))));
      return rows.length;
    },
    clear() { rows.length = 0; tbody.innerHTML = ''; },
  };
}

function fmtNum(x) {
  if (!Number.isFinite(x)) return '—';
  const a = Math.abs(x);
  return a >= 100 ? x.toFixed(0) : a >= 10 ? x.toFixed(1) : x.toFixed(2);
}

/**
 * 坐标图。x/y: { label, min, max, ticks? }；series: [{ color, points: [[x,y]], line?, dots?, dash? }]
 * 调 draw() 重画；points 可以随时改。fit=true 时按数据自动放大坐标范围。
 */
export function chart({ x, y, series = [], height = 170, fit = false, legend } = {}) {
  // 画布按 2 倍再放大 2 倍画（共 4 倍），点一下图表可以放大看（投屏、手机上都看得清）
  const SC = 2;
  const canvas = h('canvas', { class: 'chart', width: 680 * SC, height: height * 2 * SC, title: '点一下放大' });
  canvas.style.height = `${height}px`;
  canvas.addEventListener('click', () => zoomChart(canvas, height));
  const api = {
    el: h('div', {}, canvas, legend ? h('p', { class: 'note', html: legend }) : null),
    canvas, x, y, series,
    extra: null,         // (g, X, Y) => {} 额外的标注
    draw() {
      const g = canvas.getContext('2d'), W = canvas.width / SC, H = canvas.height / SC;
      const L = 74, R = 22, T = 26, B = 56;
      g.setTransform(SC, 0, 0, SC, 0, 0);
      g.clearRect(0, 0, W, H);
      let { min: x0, max: x1 } = api.x, { min: y0, max: y1 } = api.y;
      if (fit) {
        for (const s of api.series) for (const [px, py] of s.points) { x1 = Math.max(x1, px); y1 = Math.max(y1, py); y0 = Math.min(y0, py); }
      }
      const X = (v) => L + ((v - x0) / (x1 - x0 || 1)) * (W - L - R);
      const Y = (v) => H - B - ((v - y0) / (y1 - y0 || 1)) * (H - T - B);
      // 网格（像课本的坐标纸）
      g.strokeStyle = '#e4ecf6'; g.lineWidth = 1;
      for (let i = 0; i <= 20; i++) { const xx = L + (i / 20) * (W - L - R); g.beginPath(); g.moveTo(xx, T); g.lineTo(xx, H - B); g.stroke(); }
      for (let i = 0; i <= 10; i++) { const yy = T + (i / 10) * (H - T - B); g.beginPath(); g.moveTo(L, yy); g.lineTo(W - R, yy); g.stroke(); }
      g.strokeStyle = '#5d6577'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(L, T - 10); g.lineTo(L, H - B); g.lineTo(W - R + 8, H - B); g.stroke();
      g.fillStyle = '#4b5263'; g.font = '22px PingFang SC, sans-serif';
      const ticks = (a, b, n) => { const out = []; const st = niceStep((b - a) / n); for (let v = Math.ceil(a / st) * st; v <= b + 1e-9; v += st) out.push(+v.toFixed(6)); return out; };
      g.textAlign = 'center';
      for (const v of api.x.ticks || ticks(x0, x1, 6)) g.fillText(fmtTick(v), X(v), H - B + 26);
      g.textAlign = 'right';
      for (const v of api.y.ticks || ticks(y0, y1, 4)) g.fillText(fmtTick(v), L - 8, Y(v) + 7);
      g.textAlign = 'left'; g.font = 'italic 22px "Times New Roman", serif';
      g.fillText(api.y.label || '', L + 8, T - 4);    // 纵轴名写在轴的右边，不和最上面的刻度数字挤在一起
      g.textAlign = 'right';
      g.fillText(api.x.label || '', W - 6, H - 8);
      g.textAlign = 'left';
      for (const s of api.series) {
        if (!s.points.length) continue;
        g.strokeStyle = g.fillStyle = s.color || '#1f6fb8';
        if (s.line !== false && s.points.length > 1) {
          g.lineWidth = s.width || 3.5;
          g.setLineDash(s.dash ? [10, 8] : []);
          g.beginPath();
          s.points.forEach(([px, py], i) => (i ? g.lineTo(X(px), Y(py)) : g.moveTo(X(px), Y(py))));
          g.stroke();
          g.setLineDash([]);
        }
        if (s.dots) for (const [px, py] of s.points) { g.beginPath(); g.arc(X(px), Y(py), 6, 0, Math.PI * 2); g.fill(); }
      }
      api.extra?.(g, X, Y);
    },
  };
  api.draw();
  return api;
}

// 放大看图表：把画布本身搬到屏幕中间的一张大纸上，再点一下放回原处（画布还是同一个，实验继续往上画）
function zoomChart(canvas, height) {
  const open = document.querySelector('.chart-zoom');
  if (open) { open.click(); return; }
  const home = canvas.parentNode, next = canvas.nextSibling;
  const wrap = h('div', { class: 'chart-zoom' }, h('div', { class: 'chart-zoom-paper' }, canvas, h('small', {}, '点一下放回去')));
  canvas.style.height = '';
  wrap.addEventListener('click', () => { canvas.style.height = `${height}px`; home.insertBefore(canvas, next); wrap.remove(); });
  document.body.append(wrap);
}

function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const n = raw / p;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p;
}
function fmtTick(v) { return Math.abs(v) >= 1000 ? v.toFixed(0) : String(+v.toFixed(3)); }

/**
 * 实验目标清单：全部完成才能掀开结论。
 * goals(ui, [['towel', '在毛巾上滑一次'], ...]) → done('towel')
 */
export function goals(ui, list, { prefix = '还需要：' } = {}) {
  const left = new Map(list);
  const show = () => {
    if (!left.size) ui.unlock();
    else ui.need(prefix + [...left.values()].join('；'));
  };
  show();
  return {
    done(id) { if (left.delete(id)) show(); return !left.size; },
    /** 这一步的证据作废了（比如重新开始、换了配重）：重新列回“还需要” */
    undo(...ids) { let ch = false; for (const [k, v] of list) if (ids.includes(k) && !left.has(k)) { left.set(k, v); ch = true; } if (ch) { const order = new Map(list.filter(([k]) => left.has(k))); left.clear(); for (const [k, v] of order) left.set(k, v); show(); } },
    has(id) { return !left.has(id); },
    get finished() { return !left.size; },
  };
}

/**
 * 待答题的“条件快照”：出题时 arm() 记下 snap() 的值；之后每帧 check()——器材条件变了（换了位置、量程、读数……），
 * 就把题目撤掉并调用 onDrop（一般是提示“条件变了，重新读”）。答完题 el 隐藏后自动解除。
 */
export function guard(el, snap, onDrop) {
  let key = null;
  return {
    arm() { key = snap(); },
    clear() { key = null; },
    check() {
      if (key == null) return false;
      if (el.hidden) { key = null; return false; }
      if (snap() !== key) { key = null; el.hidden = true; onDrop?.(); return true; }
      return false;
    },
  };
}

export function note(text, cls = '') { return h('p', { class: `note ${cls}`, html: text }); }
export function title(text) { return h('div', { class: 'bar-title' }, text); }
