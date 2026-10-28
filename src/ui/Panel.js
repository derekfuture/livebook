// 实验面板：① 预测 → ② 实验 → ③ 结论（掀开纸片看答案，盖章）。
// 面板只管流程和样式，具体的控件、数据表由各个实验自己往里填。

const STAMP_KEY = 'livebook.stamps';
export const stamps = {
  all() { try { return JSON.parse(localStorage.getItem(STAMP_KEY)) || {}; } catch { return {}; } },
  has(id) { return !!this.all()[id]; },
  give(id) { const s = this.all(); s[id] = Date.now(); localStorage.setItem(STAMP_KEY, JSON.stringify(s)); dispatchEvent(new CustomEvent('stamp')); },
};

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
}

/** 从课本高清页里截一块：rect 是 PDF 点 [x0, y0, x1, y1] */
function pageCrop(book, page, [x0, y0, x1, y1]) {
  // 按比例截取：宽度跟着纸卡走，背景图按同样的比例缩放，不会被裁掉
  const PH = book.PW * 737.008 / 521.575;
  const el = h('div', { class: 'page-crop', title: '课本原文' });
  Object.assign(el.style, {
    aspectRatio: `${x1 - x0} / ${y1 - y0}`,
    backgroundImage: `url(${book.base}hi/${String(page).padStart(3, '0')}.jpg)`,
    backgroundSize: `${(book.PW / (x1 - x0)) * 100}% auto`,
    backgroundPosition: `${(x0 / (book.PW - (x1 - x0))) * 100}% ${(y0 / (PH - (y1 - y0))) * 100}%`,
  });
  return el;
}

export class Panel {
  constructor(el) {
    this.home = el;
    this.el = el;
  }

  /** 面板放到哪里：默认是页面左侧；立板模式下放进 3D 场景里的那块板上 */
  setHost(el) { this.el = el || this.home; }

  /** def：实验定义（predict / conclusion / need…）；返回给实验用的接口。 */
  open(def, { pageLabel, onClose, foldable = false, onFold, book, onStep } = {}) {
    const el = this.el;
    const keep = [...el.querySelectorAll(':scope > .board-ear, :scope > .board-tab')];
    el.innerHTML = '';
    el.append(...keep);
    el.hidden = false;
    this.def = def;
    this._onFold = onFold;
    this._onStep = onStep;
    this.prediction = null;
    this.unlocked = false;

    const tabs = ['预测', '实验', '结论'].map((t, i) =>
      h('button', { class: 'p-tab', onclick: () => this.go(i) }, h('b', {}, String(i + 1)), t));
    this.tabs = tabs;

    // ① 预测
    const p = def.predict;
    const opts = h('div', { class: 'opts' }, p.options.map((o, i) =>
      h('button', { class: 'opt', onclick: () => this._pick(i) }, o)));
    this.opts = opts;
    this.goBtn = h('button', { class: 'go ghost', onclick: () => this.go(1) }, '不猜了，直接动手 →');     // 预测是选做的：不猜也能做实验、看结论
    const s1 = h('div', { class: 'p-step' },
      h('div', { class: 'bar-title' }, '想一想'),
      h('p', { class: 'q', html: p.q + (p.hint ? `<small>${p.hint}</small>` : '') }),
      opts, this.goBtn,
      h('p', { class: 'note' }, '先猜一猜再做，印象更深；不想猜也可以直接动手。'));

    // ② 实验
    this.statusEl = h('p', { class: 'status' });
    this.askEl = h('div', { class: 'now-ask' });          // 要学生回答的题目选项，放在题目正下方
    this.nowEl = h('div', { class: 'now' }, this.statusEl, this.askEl);
    this.controlsEl = h('div');
    this.notesEl = h('div');
    this.notesBox = h('details', { class: 'how-to', hidden: true }, h('summary', {}, '怎么操作（说明）'), this.notesEl);
    this.dataEl = h('div');
    this.needEl = h('p', { class: 'progress-need' });
    this.toProve = h('button', { class: 'go', disabled: true, onclick: () => this.go(2) }, '去看结论 →');
    const s2 = h('div', { class: 'p-step' },
      h('div', { class: 'bar-title' }, '动手试'),
      this.nowEl, this.controlsEl, this.notesBox,
      h('div', { class: 'bar-title' }, '数据'),
      this.dataEl, this.toProve, this.needEl);

    // ③ 结论
    const c = def.conclusion;
    this.verdictEl = h('p', { class: 'verdict' });
    this.sealEl = h('div', { class: 'seal-stamp' }, def.stampText || '观察');
    const answer = h('div', { class: 'answer' },
      this.verdictEl,
      // 课本原文：标了在书页上的位置，就直接截取那一块书页（最忠实）；否则用文字
      c.crops && book ? h('div', {}, c.crops.map((x) => pageCrop(book, x.page, x.rect))) : c.page != null && c.rect && book ? pageCrop(book, c.page, c.rect) : h('blockquote', {}, c.quote),
      c.formula ? h('div', { class: 'formula', html: c.formula }) : null,
      c.why ? h('p', { class: 'why', html: c.why }) : null,
      h('p', { class: 'src' }, c.src),
      this.sealEl);
    this.flapFront = h('div', { class: 'flap-front', onclick: () => this._openFlap() },
      h('span', {}, '🔒 做完实验再掀开'), h('small', {}, ''));
    this.flap = h('div', { class: 'flap locked' }, this.flapFront, h('div', { class: 'flap-back' }, answer));
    this.answerEl = answer;
    const s3 = h('div', { class: 'p-step' },
      h('div', { class: 'bar-title' }, '课本上的结论'),
      h('div', { class: 'flap-wrap' }, this.flap));

    this.steps = [s1, s2, s3];
    el.append(
      foldable ? h('div', { class: 'p-spine', onclick: () => this.fold(false) }, def.title) : null,
      h('div', { class: 'p-head' },
        foldable ? h('span', { class: 'p-tuck', title: '收起', onclick: () => this.fold(true) }, '‹') : null,
        h('div', { class: 'p-fig' }, `${def.fig} · ${pageLabel}`),
        h('h2', { class: 'p-title' }, def.title),
        h('div', { class: 'p-acts' },
          h('button', { class: 'p-close', onclick: () => onClose() }, '放回书里 ↩'))),
      h('div', { class: 'p-tabs' }, tabs),
      h('div', { class: 'p-body' }, s1, s2, s3));
    this.go(0);
    this.need(def.need || '');
    // 上次的记录：只读地放在数据区下面；盖过章的可以直接掀开结论
    const prev = JSON.parse(localStorage.getItem(`livebook.record.${def.id}`) || 'null');
    if (prev && (prev.html || prev.chart)) {
      const box = h('details', { class: 'prev-record' }, h('summary', {}, `上次的记录（${new Date(prev.t).toLocaleDateString('zh-CN')}）`), h('div', { html: prev.html }), prev.chart ? h('img', { src: prev.chart, style: 'width:100%' }) : null);
      this.dataEl.after(box);
    }
    if (stamps.has(def.id)) setTimeout(() => this.unlock(true), 0);     // 以前做完过：结论可以直接看，但这一次的进度照常显示

    return {
      controls: this.controlsEl,
      data: this.dataEl,
      status: (msg) => { this.statusEl.innerHTML = msg || ''; },
      need: (msg) => this.need(msg),
      unlock: () => this.unlock(),
      prediction: () => this.prediction,
    };
  }

  /** 收起：纸卡滑到屏幕左边，只露出一条写着标题的书脊 */
  fold(on) {
    this.el.classList.toggle('folded', on);
    this._onFold?.(on);
  }

  go(i) {
    this.step = i;
    this.steps.forEach((s, k) => (s.hidden = k !== i));
    this.tabs.forEach((t, k) => t.classList.toggle('on', k === i));
    if (i > 0 && this.prediction == null) this.tabs[0].classList.add('skip');     // 没猜就往下走了：预测标成“跳过”，不当成没完成
    this.el.querySelector('.p-body').scrollTop = 0;
    this._onStep?.(i);
  }

  _pick(i) {
    if (this.prediction != null) return;
    this.prediction = i;
    [...this.opts.children].forEach((b, k) => b.classList.toggle('picked', k === i));
    this.opts.classList.add('locked');
    this.goBtn.classList.remove('ghost');
    this.goBtn.textContent = '动手试一试 →';
    this.tabs[0].classList.remove('skip'); this.tabs[0].classList.add('done');
    localStorage.setItem(`livebook.pick.${this.def.id}`, String(i));
  }

  /**
   * 实验挂好控件以后整理一下面板（所有实验通用，不用逐个改）：
   * - 开始时藏着、后来才出现的选项行（≥2 个按钮，或按钮文字是空的——等出题时再填），就是“题目的选项”：挪到题目正下方，换成答案的样式；
   * - 控件区里直接放着的长说明，收进“怎么操作”里，需要时点开看。
   */
  arrange() {
    const rows = [...this.controlsEl.querySelectorAll('.btn-row')].filter((r) => r.hidden && (r.children.length !== 1 || !r.children[0].textContent.trim()) && !r.dataset.keep);     // 0 个按钮的是出题时才填的
    for (const r of rows) { r.classList.add('answers'); this.askEl.append(r); }
    const notes = [...this.controlsEl.children].filter((x) => x.matches('p.note') && x.textContent.length > 24);
    for (const n of notes) this.notesEl.append(n);
    this.notesBox.hidden = !notes.length;
  }

  need(msg) {
    // 已经完成过（盖了章、结论能掀开），但这一次又重做了：照样告诉学生这次还差什么
    if (this.unlocked) { this.needEl.textContent = msg ? `之前已经做完（可以看结论）。这一次${msg}` : ''; return; }
    this.needEl.textContent = msg;
    this.flapFront.querySelector('small').textContent = msg;
  }

  unlock(fromHistory = false) {
    if (this.unlocked) { this.needEl.textContent = '实验做完了，可以去看结论。'; return; }
    const pending = fromHistory ? this.needEl.textContent : '';
    this.unlocked = true;
    this.flap.classList.remove('locked');
    this.flapFront.querySelector('span').textContent = '掀开看结论';
    this.flapFront.querySelector('small').textContent = '点一下纸片';
    this.needEl.textContent = pending ? `之前已经做完（可以看结论）。这一次${pending}` : '实验做完了，可以去看结论。';
    this.toProve.disabled = false;
    if (!fromHistory) this.tabs[1].classList.add('done');
  }

  _openFlap() {
    if (!this.unlocked || this.flap.classList.contains('open')) return;
    const p = this.def.predict;
    // 这次没猜：回看上次的预测（以前做过的实验直接掀结论时）
    const last = localStorage.getItem(`livebook.pick.${this.def.id}`);
    const mine = this.prediction ?? (last != null && p.options[+last] != null ? +last : null);
    const who = this.prediction == null ? '上次你的预测' : '你的预测';
    const v = this.verdictEl;
    if (mine == null) { v.className = 'verdict'; v.textContent = '这次没有先预测。对照实验看看课本的结论。'; }
    else if (mine === p.answer) { v.className = 'verdict ok'; v.textContent = `✓ ${who}「${p.options[mine]}」是对的。`; }
    else { v.className = 'verdict no'; v.textContent = `${who}是「${p.options[mine]}」，对照实验再想一想。正确的是「${p.options[p.answer]}」。`; }
    this.flap.classList.add('open');
    this.flap.style.minHeight = `${this.answerEl.offsetHeight}px`;
    setTimeout(() => { this.sealEl.classList.add('on'); stamps.give(this.def.id); this.tabs[2].classList.add('done'); }, 950);
  }

  /** 退出时存下这次的预测和数据表，下次进来能回看 */
  _save() {
    if (!this.def) return;
    const rows = this.dataEl?.querySelectorAll('tbody tr').length || 0;
    const chart = this.dataEl?.querySelector('canvas');
    if (!rows) return;            // 没有新数据（比如只是重新猜了一次）：不覆盖上次有数据的记录
    const html = this.dataEl.cloneNode(true);
    html.querySelectorAll('canvas').forEach((c) => c.remove());
    localStorage.setItem(`livebook.record.${this.def.id}`, JSON.stringify({ t: Date.now(), pick: this.prediction, html: rows ? html.innerHTML : '', chart: chart && rows ? small(chart) : null }));
  }

  close() {
    this._save();
    if (this.el !== this.home) return;      // 立板：内容留着，跟着板子一起倒下，最后由 LiveLayer 移除
    this.el.hidden = true;
    this.el.innerHTML = '';
  }
}

// 存档用的缩小图（图表画布是 4 倍分辨率，存进 localStorage 太大）
function small(c) {
  const o = document.createElement('canvas');
  o.width = 680; o.height = Math.round((c.height * 680) / c.width);
  o.getContext('2d').drawImage(c, 0, 0, o.width, o.height);
  return o.toDataURL('image/png');
}
